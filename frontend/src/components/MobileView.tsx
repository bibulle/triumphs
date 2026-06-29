import { useState, useMemo, useCallback } from 'react';
import type { Group, Triumph, Player, FilterState, SortState, Annotations, PrioLevel, FlagKey, RecordProgress, NodeMeta } from '../data';
import type { Locale } from '../i18n';
import { useLocale } from '../i18n';
import { PrioMeter, FlagIcon } from './CellEditor';
import DetailSheet from './DetailSheet';
import styles from './MobileView.module.css';

interface Props {
  groups: Group[];
  triumphs: Triumph[];
  players: readonly Player[];
  collapsed?: Set<string>;
  onToggleGroup?: (key: string) => void;
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

function EmblemIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" className={styles.emblemSvg}>
      <path d="M12 2.5 20 5.5v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z"/>
      <path d="M12 7.5 13.4 10.6 16.8 11 14.4 13.4 15 16.8 12 15.2 9 16.8 9.6 13.4 7.2 11 10.6 10.6z" fill="currentColor" stroke="none"/>
    </svg>
  );
}

export default function MobileView({
  groups, triumphs, players, search, filter,
  sortState, annotations,
  progressFor, progressDetailFor,
}: Props) {
  const { t, locale } = useLocale();
  const q = search.trim().toLowerCase();
  const useFr = locale === 'fr';

  const [mobilePlayer, setMobilePlayer] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [detailItem, setDetailItem] = useState<Triumph | null>(null);

  const activePlayer = players[mobilePlayer] ?? players[0];

  const prioLevel = (player: string, id: string): PrioLevel =>
    (annotations[player]?.prio[id] as PrioLevel) ?? 0;

  const flagOf = (player: string, id: string): FlagKey | null =>
    (annotations[player]?.flags[id] as FlagKey) ?? null;

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
    return { done, notRedeemed };
  };

  const visibleItems = useMemo(() => {
    const flat = groups.flatMap(group => group.items.filter(filterItem));
    if (sortState !== 'default') {
      flat.sort((a, b) => {
        const ka = sortState === 'global' ? globalPrioRaw(a.id) * 10 + worstFlagWeight(a.id) / 10
                 : sortState === 'flag' ? worstFlagWeight(a.id)
                 : prioLevel(sortState.slice(2), a.id);
        const kb = sortState === 'global' ? globalPrioRaw(b.id) * 10 + worstFlagWeight(b.id) / 10
                 : sortState === 'flag' ? worstFlagWeight(b.id)
                 : prioLevel(sortState.slice(2), b.id);
        return kb - ka;
      });
    }
    return flat;
  }, [groups, filterItem, sortState]);

  const totalDoneFor = useCallback((p: Player) =>
    triumphs.filter(d => progressFor(p).has(d.id)).length,
  [triumphs, progressFor]);

  const totalDone = useMemo(() => activePlayer ? totalDoneFor(activePlayer) : 0, [activePlayer, totalDoneFor]);

  const groupLabel = useMemo(() => {
    if (!groups.length) return '';
    const g = groups[0];
    const catLabel = useFr ? g.catFr : g.cat;
    const subLabel = useFr ? g.subFr : g.sub;
    return catLabel === subLabel ? catLabel : `${catLabel} · ${subLabel}`;
  }, [groups, useFr]);

  const subGroupFor = (item: Triumph) => {
    if (locale === 'pt') return item.subGroupPt || item.subGroup || '';
    if (locale === 'fr') return item.subGroupFr || item.subGroup || '';
    return item.subGroup || '';
  };

  const nameFor = (item: Triumph) => {
    if (locale === 'fr') return item.fr || item.en;
    if (locale === 'pt') return item.pt || item.en;
    return item.en;
  };

  const renderCard = (item: Triumph) => {
    const allDone = players.length > 0 && players.every(p => progressFor(p).has(item.id));
    const primaryName = nameFor(item);
    const sgLabel = subGroupFor(item);

    if (compareMode) {
      return (
        <button
          key={item.id}
          className={`${styles.mcard} ${allDone ? styles.mcardDone : ''}`}
          onClick={() => setDetailItem(item)}
          type="button"
        >
          <div className={styles.mcardMain}>
            <span className={styles.mcardTitle}>{primaryName}</span>
            {sgLabel && <span className={styles.mcardSg}>{sgLabel}</span>}
          </div>
          <div className={styles.mcompare}>
            {players.map(p => {
              const s = getStatusForPlayer(p, item);
              return (
                <span key={p} className={styles.mchip}>
                  <span className={styles.mcIni}>{p[0]}</span>
                  <span className={`${styles.mcDot} ${s.done ? styles.mcDotDone : styles.mcDotTodo}`}>
                    {s.done && <span className={styles.mcCheck}>✓</span>}
                  </span>
                </span>
              );
            })}
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
        <div className={styles.mcardMain}>
          <span className={styles.mcardTitle}>{primaryName}</span>
          {sgLabel && <span className={styles.mcardSg}>{sgLabel}</span>}
        </div>
        <div className={styles.mcardInd}>
          <PrioMeter level={prioLevel(activePlayer, item.id)} />
          <FlagIcon flagKey={flagOf(activePlayer, item.id)} />
        </div>
        <span className={`${styles.mstatus} ${status.done ? (status.notRedeemed ? styles.mstatusNotRedeemed : styles.mstatusDone) : styles.mstatusTodo}`}>
          {status.done && <span className={styles.mstatusCheck}>✓</span>}
        </span>
      </button>
    );
  };

  return (
    <div className={styles.mobileView} data-testid="mobile-view">
      {/* Sticky player bar */}
      <div className={styles.mbar}>
        <div className={styles.mplayers} data-testid="mobile-players">
          {players.map((p, i) => (
            <button
              key={p}
              className={`${styles.mplayer} ${!compareMode && i === mobilePlayer ? styles.mplayerActive : ''}`}
              onClick={() => { setMobilePlayer(i); setCompareMode(false); }}
              type="button"
            >
              {p}
              <span className={styles.mpCount}>{totalDoneFor(p)}/{triumphs.length}</span>
            </button>
          ))}
        </div>
        {players.length > 1 && (
          <button
            className={`${styles.mcompareBtn} ${compareMode ? styles.mcompareBtnActive : ''}`}
            onClick={() => setCompareMode(c => !c)}
            aria-pressed={compareMode}
            type="button"
          >
            {locale === 'fr' ? 'Comparer' : locale === 'pt' ? 'Comparar' : 'Compare'}
          </button>
        )}
      </div>

      {/* Summary header */}
      <div className={styles.msummary} data-testid="mobile-summary">
        <div className={styles.msTop}>
          <span className={styles.emblem}><EmblemIcon /></span>
          <span className={styles.msTitle}>{groupLabel || t.sections.triumphs}</span>
        </div>
        {compareMode ? (
          <div className={styles.msProg}>
            <span className={styles.msLbl}>
              {locale === 'fr' ? 'Comparaison' : locale === 'pt' ? 'Comparação' : 'Comparison'} · {visibleItems.length} {t.itemsLabel}
            </span>
          </div>
        ) : (
          <div className={styles.msProg}>
            <span className={styles.msFrac}>{totalDone}/{triumphs.length}</span>
            <span className={styles.msLbl}>{activePlayer}</span>
            <div className={styles.msBar}>
              <div
                className={styles.msFill}
                style={{ width: `${triumphs.length > 0 ? Math.round(totalDone / triumphs.length * 100) : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Flat list of cards */}
      <div className={styles.mlist}>
        {visibleItems.map(renderCard)}
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
