import { useMemo, useState } from 'react';
import type { Group, Triumph, Player, FilterState, NodeMeta, RecordProgress, SortState, Annotations, PrioLevel, GlobalPrio, FlagKey } from '../data';
import type { Locale } from '../i18n';
import { useLocale } from '../i18n';
import CellEditor, { PrioMeter, FlagIcon } from './CellEditor';
import styles from './TriumphTable.module.css';

const BUNGIE_CDN = 'https://www.bungie.net';
const GLOBAL_PRIO_LABELS = ['Aucune', 'Basse', 'Moyenne', 'Haute'];

interface CellEditState {
  player: string;
  item: Triumph;
  anchor: DOMRect;
}

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
  onAnnotation: (player: string, id: string, prio: PrioLevel, flag: FlagKey | null) => void;
  progressFor: (p: Player) => Set<string>;
  progressDetailFor?: (p: Player) => Record<string, RecordProgress>;
  locale?: Locale;
  nodes?: NodeMeta[];
}

const CAT_CLASS: Record<string, string> = {
  Worlds: styles.catWorlds,
  Stories: styles.catStories,
  Combat: styles.catCombat,
  Teamwork: styles.catTeamwork,
  Competitions: styles.catCompetitions,
};

export default function TriumphTable({
  groups, triumphs, players, collapsed, onToggleGroup, search, filter,
  sortState, annotations, onAnnotation,
  progressFor, progressDetailFor, nodes = [],
}: Props) {
  const { t, locale } = useLocale();
  const q = search.trim().toLowerCase();
  const useFr = locale === 'fr';

  const [editing, setEditing] = useState<CellEditState | null>(null);

  const rankIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    nodes.filter(n => n.level === 1 && n.rankIndex !== undefined).forEach(n => map.set(n.catKey!, n.rankIndex!));
    return map;
  }, [nodes]);

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

  const totalDone = useMemo(
    () => Object.fromEntries(players.map(p => [p, triumphs.filter(d => progressFor(p).has(d.id)).length])),
    [players, triumphs, progressFor]
  );

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

  const sortItems = (items: Triumph[]): Triumph[] => {
    if (sortState === 'default') return items;
    return [...items].sort((a, b) => {
      const ka = sortState === 'global' ? globalPrio(a.id) : prioLevel(sortState.slice(2), a.id);
      const kb = sortState === 'global' ? globalPrio(b.id) : prioLevel(sortState.slice(2), b.id);
      return kb - ka;
    });
  };

  return (
    <>
      <div className={styles.tablewrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={`${styles.th} ${styles.colTitle}`}>{t.triumphColumn}</th>
              {players.map(p => (
                <th key={p} className={`${styles.th} ${styles.friendTh}`}>
                  <div className={styles.friendHead}>
                    <span className={styles.fname}>{p}</span>
                    <span className={styles.fcount}>{totalDone[p]}/{triumphs.length}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(group => {
              const isCollapsed = collapsed.has(group.groupKey);
              const catClass = CAT_CLASS[group.cat] ?? '';

              const visibleItems = group.items.filter(item => {
                const matchSearch = !q || (item.en + ' ' + item.fr).toLowerCase().includes(q);
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
              });

              if (visibleItems.length === 0) return null;

              const sortedItems = sortItems(visibleItems);

              const groupAllDone = players.length > 0 &&
                group.items.every(item => players.every(p => progressFor(p).has(item.id)));

              const sameNameEn = group.cat === group.sub;
              const sameNameFr = group.catFr === group.subFr;
              const rankIndex = rankIndexMap.get(`${group.section}|${group.cat}`);
              const rankPrefix = rankIndex !== undefined ? `${rankIndex + 1} · ` : '';
              const primaryLabel = rankPrefix + (useFr
                ? (sameNameFr ? group.subFr : `${group.catFr} · ${group.subFr}`)
                : (sameNameEn ? group.sub : `${group.cat} · ${group.sub}`));
              const secondaryLabel = useFr
                ? (sameNameEn ? group.sub : `${group.cat} · ${group.sub}`)
                : (sameNameFr ? group.subFr : `${group.catFr} · ${group.subFr}`);

              return [
                <tr
                  key={`g-${group.groupKey}`}
                  className={`${styles.groupRow} ${catClass} ${isCollapsed ? styles.collapsed : ''} ${groupAllDone ? styles.allDone : ''}`}
                  onClick={() => onToggleGroup(group.groupKey)}
                >
                  <td className={`${styles.td} ${styles.colTitle} ${styles.groupTitleCell}`}>
                    <div className={styles.groupHead}>
                      <span className={styles.chev}>▾</span>
                      {(() => { const icon = groupIconMap.get(group.groupKey) ?? catIconMap.get(`${group.section}|${group.cat}`); return icon ? <img src={icon} className={styles.catIcon} aria-hidden="true" alt="" /> : null; })()}
                      <span className={styles.groupLabel}>{primaryLabel}</span>
                      {secondaryLabel !== primaryLabel && <span className={styles.groupLabelEn}>{secondaryLabel}</span>}
                    </div>
                  </td>
                  {players.map(p => {
                    const done = group.items.filter(i => progressFor(p).has(i.id)).length;
                    const total = group.items.length;
                    const pct = Math.round(done / total * 100);
                    return (
                      <td key={p} className={`${styles.td} ${styles.friendCell} ${styles.groupCount}`}>
                        <div className={styles.groupCountInner}>
                          <span className={styles.groupFrac}>{done}/{total}</span>
                          <div className={styles.groupBar}>
                            <div className={styles.groupBarFill} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>,
                ...(!isCollapsed ? sortedItems.map(item => {
                  const checks = players.map(p => progressFor(p).has(item.id));
                  const allDone = checks.every(Boolean);
                  const localeName = locale === 'fr' ? item.fr : locale === 'pt' ? item.pt : undefined;
                  const primaryName = localeName || item.en;
                  const secondaryName = useFr ? item.en : item.fr;
                  const gp = globalPrio(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`${styles.itemRow} ${allDone ? styles.allDone : ''}`}
                    >
                      <td className={`${styles.td} ${styles.colTitle} ${styles.itemColTitle}`}>
                        <div className={styles.titleCell}>
                          <span className={`${styles.bullet} ${allDone ? styles.bulletDone : ''}`} />
                          <div className={styles.titleText}>
                            <div className={styles.titleRow}>
                              <span className={`${styles.titleFr} ${allDone ? styles.titleFrDone : ''}`}>
                                {primaryName}
                                {allDone && <span className={styles.completeBadge}>{t.complete}</span>}
                              </span>
                              {secondaryName && secondaryName !== primaryName && (
                                <span className={styles.titleEn}>{secondaryName}</span>
                              )}
                            </div>
                            {(item.descFr || item.descEn)
                              ? <span className={styles.desc}>{useFr ? (item.descFr || item.descEn) : (item.descEn || item.descFr)}</span>
                              : <span className={styles.descPlaceholder}>Description à venir / coming soon</span>
                            }
                          </div>
                          {gp > 0 && (
                            <PrioMeter
                              level={gp}
                              extraClass={styles.prioGlobal}
                              title={`Priorité globale : ${GLOBAL_PRIO_LABELS[gp]}`}
                            />
                          )}
                        </div>
                      </td>
                      {players.map((p, i) => {
                        const detail = progressDetailFor?.(p)?.[item.id];
                        const objectives = detail?.objectives ?? [];
                        const current = objectives.reduce((s, o) => s + o.current, 0);
                        const total = objectives.reduce((s, o) => s + o.completionValue, 0);
                        const allObjMet = total > 0 && current >= total;
                        const done = checks[i] || !!detail?.completed || allObjMet;
                        const hasProgress = !done && total > 0;
                        const lvl = prioLevel(p, item.id);
                        const fl = flagOf(p, item.id);
                        const isEditingThis = editing?.player === p && editing?.item.id === item.id;

                        return (
                          <td key={p} className={`${styles.td} ${styles.friendCell}`}>
                            <button
                              className={`${styles.cellEdit} ${isEditingThis ? styles.cellEditOpen : ''}`}
                              onClick={e => { e.stopPropagation(); setEditing({ player: p, item, anchor: e.currentTarget.getBoundingClientRect() }); }}
                              aria-label={`${p} — ${primaryName} : modifier priorité et statut`}
                            >
                              {done ? (
                                <span
                                  className={`${styles.status} ${styles.isDone}`}
                                  role="img"
                                  aria-label={`${p} — ${primaryName} : ${t.done}`}
                                />
                              ) : hasProgress ? (
                                <span className={styles.progress} aria-label={`${p} — ${primaryName} : ${current}/${total}`}>
                                  <span className={styles.progressText}>{current}/{total}</span>
                                  <span className={styles.progressBar}>
                                    <span className={styles.progressFill} style={{ width: `${Math.round(current / total * 100)}%` }} />
                                  </span>
                                </span>
                              ) : (
                                <span
                                  className={`${styles.status} ${styles.isTodo}`}
                                  role="img"
                                  aria-label={`${p} — ${primaryName} : ${t.todo}`}
                                />
                              )}
                              <span className={styles.cellMeta}>
                                <PrioMeter level={lvl} />
                                <FlagIcon flagKey={fl} />
                              </span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                }) : [])
              ];
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <CellEditor
          player={editing.player}
          triumphName={locale === 'fr' ? editing.item.fr : editing.item.en}
          prio={prioLevel(editing.player, editing.item.id)}
          flag={flagOf(editing.player, editing.item.id)}
          anchor={editing.anchor}
          onPrioChange={v => onAnnotation(editing.player, editing.item.id, v, flagOf(editing.player, editing.item.id))}
          onFlagChange={v => onAnnotation(editing.player, editing.item.id, prioLevel(editing.player, editing.item.id), v)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
