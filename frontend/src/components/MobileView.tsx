import { useState, useMemo, useCallback } from 'react';
import type { Group, Triumph, Player, FilterState, SortState, Annotations, PrioLevel, FlagKey, RecordProgress, NodeMeta, GlobalPrio } from '../data';
import type { Locale } from '../i18n';
import { useLocale } from '../i18n';
import { PrioMeter, FlagIcon } from './CellEditor';
import DetailSheet from './DetailSheet';
import styles from './MobileView.module.css';

const BUNGIE_CDN = 'https://www.bungie.net';

interface Props {
  groups: Group[];
  triumphs: Triumph[];
  players: readonly Player[];
  collapsed: Set<string>;
  onToggleGroup: (key: string) => void;
  search: string;
  filter: FilterState;
  sortState: SortState;
  annotations: Annotations;
  onAnnotation?: (player: string, id: string, prio: PrioLevel, flag: FlagKey | null) => void;
  progressFor: (p: Player) => Set<string>;
  progressDetailFor?: (p: Player) => Record<string, RecordProgress>;
  locale?: Locale;
  nodes?: NodeMeta[];
}

export default function MobileView({
  groups, triumphs, players, collapsed, onToggleGroup, search, filter,
  sortState, annotations,
  progressFor, progressDetailFor, nodes = [],
}: Props) {
  const { t, locale } = useLocale();
  const q = search.trim().toLowerCase();
  const useFr = locale === 'fr';

  const [mobilePlayer, setMobilePlayer] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [detailItem, setDetailItem] = useState<Triumph | null>(null);

  const activePlayer = players[mobilePlayer] ?? players[0];

  const catIconMap = useMemo(() => {
    const map = new Map<string, string>();
    nodes.filter(n => n.level === 1 && n.icon).forEach(n => map.set(n.catKey!, `${BUNGIE_CDN}${n.icon}`));
    return map;
  }, [nodes]);

  const groupIconMap = useMemo(() => {
    const map = new Map<string, string>();
    nodes.filter(n => n.level === 2 && n.icon).forEach(n => map.set(n.groupKey!, `${BUNGIE_CDN}${n.icon}`));
    return map;
  }, [nodes]);

  const rankIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    nodes.filter(n => n.level === 1 && n.rankIndex !== undefined).forEach(n => map.set(n.catKey!, n.rankIndex!));
    return map;
  }, [nodes]);

  const prioLevel = (player: string, id: string): PrioLevel =>
    (annotations[player]?.prio[id] as PrioLevel) ?? 0;

  const flagOf = (player: string, id: string): FlagKey | null =>
    (annotations[player]?.flags[id] as FlagKey) ?? null;

  const globalPrio = (id: string): GlobalPrio => {
    if (!players.length) return 0;
    const avg = players.reduce((s, p) => s + prioLevel(p, id), 0) / players.length;
    if (avg === 0) return 0;
    if (avg < 1.5) return 1;
    if (avg < 2.5) return 2;
    return 3;
  };

  const globalPrioRaw = (id: string): number =>
    players.length ? players.reduce((s, p) => s + prioLevel(p, id), 0) / players.length : 0;

  const FLAG_WEIGHT: Record<string, number> = { need: 3, solo: 2, abandon: 0 };
  const worstFlagWeight = (id: string): number => {
    if (!players.length) return 1;
    return Math.max(...players.map(p => {
      const f = flagOf(p, id);
      return f !== null ? FLAG_WEIGHT[f] : 1;
    }));
  };
  const worstFlagKey = (id: string): FlagKey | null => {
    const flags = players.map(p => flagOf(p, id)).filter((f): f is FlagKey => f !== null);
    if (!flags.length) return null;
    return flags.reduce((best, f) => FLAG_WEIGHT[f] > FLAG_WEIGHT[best] ? f : best);
  };

  const filterItem = useCallback((item: Triumph) => {
    const matchSearch = !q || [item.en, item.fr, item.pt, item.descEn, item.descFr, item.subGroup, item.subGroupFr].filter(Boolean).join(' ').toLowerCase().includes(q);
    if (!matchSearch) return false;
    const doneCount = players.filter(p => progressFor(p).has(item.id)).length;
    const n = players.length;
    if (filter.status === 'none' && doneCount !== 0) return false;
    if (filter.status === 'partial' && (doneCount === 0 || doneCount === n)) return false;
    if (filter.status === 'done' && doneCount !== n) return false;
    if (filter.missing.size > 0) {
      for (const mp of filter.missing) {
        if (progressFor(mp).has(item.id)) return false;
      }
    }
    return true;
  }, [q, players, progressFor, filter]);

  const getStatusForPlayer = (p: Player, item: Triumph) => {
    const detail = progressDetailFor?.(p)?.[item.id];
    const objectives = detail?.objectives ?? [];
    const current = objectives.reduce((s, o) => s + o.current, 0);
    const total = objectives.reduce((s, o) => s + o.completionValue, 0);
    const allObjMet = total > 0 && current >= total;
    const done = progressFor(p).has(item.id) || !!detail?.completed || allObjMet;
    const notRedeemed = done && detail?.redeemed === false;
    const hasProgress = !done && total > 0;
    return { done, notRedeemed, hasProgress, current, total };
  };

  const sortedItems = useMemo(() => {
    if (sortState === 'default') return null;
    const flat = groups.flatMap(group =>
      group.items.filter(filterItem).map(item => ({ group, item }))
    );
    flat.sort((a, b) => {
      const ka = sortState === 'global' ? globalPrioRaw(a.item.id) * 10 + worstFlagWeight(a.item.id) / 10
               : sortState === 'flag' ? worstFlagWeight(a.item.id)
               : prioLevel(sortState.slice(2), a.item.id);
      const kb = sortState === 'global' ? globalPrioRaw(b.item.id) * 10 + worstFlagWeight(b.item.id) / 10
               : sortState === 'flag' ? worstFlagWeight(b.item.id)
               : prioLevel(sortState.slice(2), b.item.id);
      return kb - ka;
    });
    return flat;
  }, [groups, filterItem, sortState]);

  const totalDone = useMemo(() => {
    if (!activePlayer) return 0;
    return triumphs.filter(d => progressFor(activePlayer).has(d.id)).length;
  }, [activePlayer, triumphs, progressFor]);

  const renderCard = (item: Triumph) => {
    const allDone = players.length > 0 && players.every(p => progressFor(p).has(item.id));
    const localeName = locale === 'fr' ? item.fr : locale === 'pt' ? item.pt : undefined;
    const primaryName = localeName || item.en;
    const sgLabel = locale === 'pt' ? (item.subGroupPt || item.subGroup) : locale === 'fr' ? item.subGroupFr : item.subGroup;
    const gp = globalPrio(item.id);
    const wf = worstFlagKey(item.id);

    if (compareMode) {
      return (
        <button
          key={item.id}
          className={`${styles.mcard} ${allDone ? styles.mcardDone : ''}`}
          onClick={() => setDetailItem(item)}
          type="button"
        >
          <div className={styles.mcardLeft}>
            <span className={styles.mcardTitle}>{primaryName}</span>
            {sgLabel && <span className={styles.mcardSg}>{sgLabel}</span>}
          </div>
          <div className={styles.mcardRight}>
            {(gp > 0 || wf !== null) && (
              <span className={styles.mcardMeta}>
                {gp > 0 && <PrioMeter level={gp} />}
                {wf !== null && <FlagIcon flagKey={wf} />}
              </span>
            )}
            <div className={styles.mchips}>
              {players.map(p => {
                const s = getStatusForPlayer(p, item);
                return (
                  <span
                    key={p}
                    className={`${styles.mchip} ${s.done ? (s.notRedeemed ? styles.mchipNotRedeemed : styles.mchipDone) : styles.mchipTodo}`}
                    title={p}
                  />
                );
              })}
            </div>
          </div>
        </button>
      );
    }

    const status = getStatusForPlayer(activePlayer, item);
    return (
      <button
        key={item.id}
        className={`${styles.mcard} ${allDone ? styles.mcardDone : ''}`}
        onClick={() => setDetailItem(item)}
        type="button"
      >
        <div className={styles.mcardLeft}>
          <span className={styles.mcardTitle}>{primaryName}</span>
          {sgLabel && <span className={styles.mcardSg}>{sgLabel}</span>}
        </div>
        <div className={styles.mcardRight}>
          {(gp > 0 || wf !== null) && (
            <span className={styles.mcardMeta}>
              {gp > 0 && <PrioMeter level={gp} />}
              {wf !== null && <FlagIcon flagKey={wf} />}
            </span>
          )}
          {status.done ? (
            <span className={`${styles.mstatus} ${status.notRedeemed ? styles.mstatusNotRedeemed : styles.mstatusDone}`} />
          ) : status.hasProgress ? (
            <span className={styles.mstatusProgress}>{status.current}/{status.total}</span>
          ) : (
            <span className={`${styles.mstatus} ${styles.mstatusTodo}`} />
          )}
        </div>
      </button>
    );
  };

  const renderGroupHeader = (group: Group, isCollapsed: boolean) => {
    const groupAllDone = players.length > 0 &&
      group.items.every(item => players.every(p => progressFor(p).has(item.id)));
    const sameNameEn = group.cat === group.sub;
    const sameNameFr = group.catFr === group.subFr;
    const rankIndex = rankIndexMap.get(`${group.section}|${group.cat}`);
    const rankPrefix = rankIndex !== undefined ? `${rankIndex + 1} · ` : '';
    const primaryLabel = rankPrefix + (useFr
      ? (sameNameFr ? group.subFr : `${group.catFr} · ${group.subFr}`)
      : (sameNameEn ? group.sub : `${group.cat} · ${group.sub}`));
    const icon = groupIconMap.get(group.groupKey) ?? catIconMap.get(`${group.section}|${group.cat}`);

    const done = activePlayer ? group.items.filter(i => progressFor(activePlayer).has(i.id)).length : 0;
    const total = group.items.length;

    return (
      <button
        key={`mg-${group.groupKey}`}
        className={`${styles.mgroupRow} ${isCollapsed ? styles.mgroupCollapsed : ''} ${groupAllDone ? styles.mgroupDone : ''}`}
        onClick={() => onToggleGroup(group.groupKey)}
        type="button"
      >
        <span className={styles.mgroupChev}>▾</span>
        {icon && <img src={icon} className={styles.mgroupIcon} aria-hidden="true" alt="" />}
        <span className={styles.mgroupLabel}>{primaryLabel}</span>
        <span className={styles.mgroupFrac}>{done}/{total}</span>
      </button>
    );
  };

  const renderContent = () => {
    if (sortState !== 'default' && sortedItems) {
      let lastGroupKey = '';
      return sortedItems.map(({ group, item }) => {
        const nodes: React.ReactNode[] = [];
        if (group.groupKey !== lastGroupKey) {
          nodes.push(renderGroupHeader(group, false));
          lastGroupKey = group.groupKey;
        }
        nodes.push(renderCard(item));
        return nodes;
      });
    }

    return groups.flatMap(group => {
      const visibleItems = group.items.filter(filterItem);
      if (!visibleItems.length) return [];
      const isCollapsed = collapsed.has(group.groupKey);
      return [
        renderGroupHeader(group, isCollapsed),
        ...(isCollapsed ? [] : visibleItems.map(renderCard)),
      ];
    });
  };

  return (
    <div className={styles.mobileView} data-testid="mobile-view">
      {/* Player selector */}
      <div className={styles.mplayers} data-testid="mobile-players">
        {players.map((p, i) => (
          <button
            key={p}
            className={`${styles.mplayer} ${!compareMode && i === mobilePlayer ? styles.mplayerActive : ''}`}
            onClick={() => { setMobilePlayer(i); setCompareMode(false); }}
            type="button"
          >
            {p}
          </button>
        ))}
        {players.length > 1 && (
          <button
            className={`${styles.mcompare} ${compareMode ? styles.mcompareActive : ''}`}
            onClick={() => setCompareMode(c => !c)}
            aria-pressed={compareMode}
            type="button"
          >
            {t.filterAll === 'Tous' ? 'Comparer' : t.filterAll === 'Todos' ? 'Comparar' : 'Compare'}
          </button>
        )}
      </div>

      {/* Summary header */}
      <div className={styles.msummary} data-testid="mobile-summary">
        <div className={styles.msummaryText}>
          {compareMode
            ? `${triumphs.length} ${t.itemsLabel}`
            : `${activePlayer} · ${totalDone}/${triumphs.length}`
          }
        </div>
        {!compareMode && (
          <div className={styles.msummaryBar}>
            <div
              className={styles.msummaryFill}
              style={{ width: `${triumphs.length > 0 ? Math.round(totalDone / triumphs.length * 100) : 0}%` }}
            />
          </div>
        )}
      </div>

      {/* Cards */}
      <div className={styles.mcards}>
        {renderContent()}
      </div>

      {/* Detail sheet */}
      {detailItem && (
        <DetailSheet
          item={detailItem}
          players={players}
          progressFor={progressFor}
          progressDetailFor={progressDetailFor}
          annotations={annotations}
          locale={locale}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
  );
}
