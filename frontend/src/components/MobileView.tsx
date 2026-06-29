import { useMemo, useState, useEffect, useCallback } from 'react';
import type { Group, Triumph, Player, FilterState, NodeMeta, RecordProgress, SortState, Annotations, PrioLevel, GlobalPrio, FlagKey } from '../data';
import { useLocale } from '../i18n';
import { PrioMeter, FlagIcon } from './CellEditor';
import styles from './MobileView.module.css';

const BUNGIE_CDN = 'https://www.bungie.net';

interface Props {
  groups: Group[];
  triumphs: Triumph[];
  players: readonly Player[];
  search: string;
  filter: FilterState;
  sortState: SortState;
  annotations: Annotations;
  progressFor: (p: Player) => Set<string>;
  progressDetailFor?: (p: Player) => Record<string, RecordProgress>;
  nodes?: NodeMeta[];
}

function EmblemIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 L22 8 L22 16 L12 22 L2 16 L2 8 Z" />
      <path d="M12 6 L17 9 L17 15 L12 18 L7 15 L7 9 Z" />
    </svg>
  );
}

export default function MobileView({
  groups, triumphs, players, search, filter, sortState, annotations,
  progressFor, progressDetailFor, nodes = [],
}: Props) {
  const { t, locale } = useLocale();
  const useFr = locale === 'fr';
  const q = search.trim().toLowerCase();

  const [activePlayer, setActivePlayer] = useState<string>(players[0] ?? '');
  const [compareMode, setCompareMode] = useState(false);
  const [detailItem, setDetailItem] = useState<Triumph | null>(null);

  useEffect(() => {
    if (players.length > 0 && !players.includes(activePlayer)) {
      setActivePlayer(players[0]);
    }
  }, [players, activePlayer]);

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

  const prioLevel = useCallback((player: string, id: string): PrioLevel =>
    (annotations[player]?.prio[id] as PrioLevel) ?? 0, [annotations]);

  const flagOf = useCallback((player: string, id: string): FlagKey | null =>
    (annotations[player]?.flags[id] as FlagKey) ?? null, [annotations]);

  const FLAG_WEIGHT: Record<string, number> = useMemo(() => ({ need: 3, solo: 2, abandon: 0 }), []);

  const globalPrio = useCallback((id: string): GlobalPrio => {
    if (!players.length) return 0;
    const avg = players.reduce((s, p) => s + prioLevel(p, id), 0) / players.length;
    if (avg === 0) return 0;
    if (avg < 1.5) return 1;
    if (avg < 2.5) return 2;
    return 3;
  }, [players, prioLevel]);

  const globalPrioRaw = useCallback((id: string): number =>
    players.length ? players.reduce((s, p) => s + prioLevel(p, id), 0) / players.length : 0, [players, prioLevel]);

  const worstFlagWeight = useCallback((id: string): number => {
    if (!players.length) return 1;
    return Math.max(...players.map(p => {
      const f = flagOf(p, id);
      return f !== null ? FLAG_WEIGHT[f] : 1;
    }));
  }, [players, flagOf, FLAG_WEIGHT]);

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

  const sortedGroups = useMemo(() => {
    if (sortState === 'default') {
      return groups.map(g => ({
        ...g,
        items: g.items.filter(filterItem),
      })).filter(g => g.items.length > 0);
    }

    const flat = groups.flatMap(g =>
      g.items.filter(filterItem).map(item => ({ group: g, item }))
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

    const result: Group[] = [];
    let lastGroupKey = '';
    let currentGroup: Group | null = null;
    for (const { group, item } of flat) {
      if (group.groupKey !== lastGroupKey) {
        currentGroup = { ...group, items: [] };
        result.push(currentGroup);
        lastGroupKey = group.groupKey;
      }
      currentGroup!.items.push(item);
    }
    return result;
  }, [groups, filterItem, sortState, globalPrioRaw, worstFlagWeight, prioLevel]);

  const totalDone = useMemo(
    () => Object.fromEntries(players.map(p => [p, triumphs.filter(d => progressFor(p).has(d.id)).length])),
    [players, triumphs, progressFor]
  );

  const groupLabel = useCallback((group: Group) => {
    const sameNameEn = group.cat === group.sub;
    const sameNameFr = group.catFr === group.subFr;
    const rankIndex = rankIndexMap.get(`${group.section}|${group.cat}`);
    const rankPrefix = rankIndex !== undefined ? `${rankIndex + 1} · ` : '';
    return rankPrefix + (useFr
      ? (sameNameFr ? group.subFr : `${group.catFr} · ${group.subFr}`)
      : (sameNameEn ? group.sub : `${group.cat} · ${group.sub}`));
  }, [useFr, rankIndexMap]);

  const playerDone = activePlayer ? totalDone[activePlayer] ?? 0 : 0;
  const total = triumphs.length;
  const pct = total > 0 ? Math.round(playerDone / total * 100) : 0;

  const handleCloseDetail = useCallback(() => setDetailItem(null), []);

  useEffect(() => {
    if (!detailItem) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCloseDetail(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [detailItem, handleCloseDetail]);

  const nameFor = (item: Triumph) => {
    if (locale === 'pt' && item.pt) return item.pt;
    if (locale === 'en') return item.en;
    return item.fr || item.en;
  };

  const descFor = (item: Triumph) => {
    if (locale === 'pt' && item.descPt) return item.descPt;
    if (locale === 'en') return item.descEn || '';
    return item.descFr || item.descEn || '';
  };

  const sgFor = (item: Triumph) => {
    if (locale === 'pt') return item.subGroupPt || item.subGroup || '';
    if (locale === 'en') return item.subGroup || '';
    return item.subGroupFr || item.subGroup || '';
  };

  const isDone = (item: Triumph, player: string) => {
    if (progressFor(player).has(item.id)) return true;
    const detail = progressDetailFor?.(player)?.[item.id];
    if (detail?.completed) return true;
    const objectives = detail?.objectives ?? [];
    const current = objectives.reduce((s, o) => s + o.current, 0);
    const totalObj = objectives.reduce((s, o) => s + o.completionValue, 0);
    return totalObj > 0 && current >= totalObj;
  };

  const allDone = (item: Triumph) => players.length > 0 && players.every(p => isDone(item, p));

  if (!players.length) return null;

  return (
    <div className={styles.mobileView}>
      {/* Player selector */}
      <div className={styles.mbar}>
        <div className={styles.mplayers}>
          {players.map(p => (
            <button
              key={p}
              className={`${styles.mplayer} ${!compareMode && activePlayer === p ? styles.mplayerActive : ''}`}
              onClick={() => { setActivePlayer(p); setCompareMode(false); }}
            >
              {p}
              <span className={styles.mpCount}>{totalDone[p]}/{total}</span>
            </button>
          ))}
        </div>
        <button
          className={styles.mcompareBtn}
          aria-pressed={compareMode}
          onClick={() => setCompareMode(m => !m)}
        >
          {t.filterAll === 'Tous' ? 'Comparer' : 'Compare'}
        </button>
      </div>

      {/* Summary */}
      {!compareMode && (
        <div className={styles.msummary}>
          <div className={styles.msTop}>
            <span className={styles.msEmblem}><EmblemIcon /></span>
            <span className={styles.msTitle}>{t.sections.triumphs ?? 'Triomphes'}</span>
          </div>
          <div className={styles.msProg}>
            <span className={styles.msFrac}>{playerDone}/{total}</span>
            <div className={styles.msBar}>
              <div className={styles.msFill} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Card list */}
      <div className={styles.mlist}>
        {sortedGroups.map(group => {
          const icon = groupIconMap.get(group.groupKey) ?? catIconMap.get(`${group.section}|${group.cat}`);
          const grpDone = !compareMode ? group.items.filter(it => isDone(it, activePlayer)).length : 0;
          const grpTotal = group.items.length;

          return (
            <div key={group.groupKey}>
              <div className={styles.mgrouphead}>
                <span className={styles.mgEmblem}>
                  {icon ? <img src={icon} alt="" className={styles.mgIcon} /> : <EmblemIcon />}
                </span>
                <span className={styles.mgTitle}>{groupLabel(group)}</span>
                {!compareMode && (
                  <span className={styles.mgFrac}>{grpDone}/{grpTotal}</span>
                )}
              </div>

              {group.items.map(item => {
                  const itemAllDone = allDone(item);
                  const primaryName = nameFor(item);
                  const sg = sgFor(item);
                  const gp = globalPrio(item.id);
                  const pl = !compareMode ? prioLevel(activePlayer, item.id) : 0 as PrioLevel;
                  const fl = !compareMode ? flagOf(activePlayer, item.id) : null;
                  const done = !compareMode ? isDone(item, activePlayer) : false;

                  return (
                    <button
                      key={item.id}
                      className={`${styles.mcard} ${itemAllDone ? styles.mcardAllDone : ''}`}
                      onClick={() => setDetailItem(item)}
                    >
                      <div className={styles.mcardMain}>
                        <span className={styles.mcardTitle}>{primaryName}</span>
                        {sg && <span className={styles.mcardSg}>{sg}</span>}
                      </div>
                      <div className={styles.mcardInd}>
                        {!compareMode ? (
                          <>
                            {(pl > 0 || gp > 0) && <PrioMeter level={pl > 0 ? pl : gp} />}
                            {fl && <FlagIcon flagKey={fl} />}
                            <span className={`${styles.mstatus} ${done ? styles.mstatusDone : styles.mstatusTodo}`}>
                              {done && <span className={styles.mstatusCheck}>✓</span>}
                            </span>
                          </>
                        ) : (
                          <div className={styles.mcompare}>
                            {players.map(p => {
                              const pDone = isDone(item, p);
                              return (
                                <div key={p} className={styles.mchip}>
                                  <span className={styles.mcIni}>{p[0]}</span>
                                  <span className={`${styles.mcDot} ${pDone ? styles.mcDotDone : styles.mcDotTodo}`}>
                                    {pDone && <span className={styles.mcCheck}>✓</span>}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          );
        })}
      </div>

      {/* Detail sheet */}
      {detailItem && (
        <div
          className={styles.sheetOverlay}
          onClick={handleCloseDetail}
        >
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetGrip} />
            {sgFor(detailItem) && <div className={styles.sheetSg}>{sgFor(detailItem)}</div>}
            <div className={styles.sheetTitle}>{nameFor(detailItem)}</div>
            <div className={styles.sheetEn}>{useFr ? detailItem.en : detailItem.fr}</div>
            <div className={styles.sheetDesc}>
              {descFor(detailItem) || (useFr ? 'Description à venir' : 'Description coming soon')}
            </div>
            <div className={styles.sheetPlayers}>
              {players.map(p => {
                const done = isDone(detailItem, p);
                const pl = prioLevel(p, detailItem.id);
                const fl = flagOf(p, detailItem.id);
                return (
                  <div key={p} className={styles.sheetProw}>
                    <span className={`${styles.mstatus} ${done ? styles.mstatusDone : styles.mstatusTodo}`}>
                      {done && <span className={styles.mstatusCheck}>✓</span>}
                    </span>
                    <span className={styles.spName}>{p}</span>
                    {pl > 0 && <PrioMeter level={pl} />}
                    {fl && <FlagIcon flagKey={fl} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
