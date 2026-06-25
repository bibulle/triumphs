import { useMemo } from 'react';
import type { Group, Triumph, Player, FilterState, NodeMeta } from '../data';
import type { Locale } from '../i18n';
import { useLocale } from '../i18n';
import styles from './TriumphTable.module.css';

const BUNGIE_CDN = 'https://www.bungie.net';

interface Props {
  groups: Group[];
  triumphs: Triumph[];
  players: readonly Player[];
  collapsed: Set<string>;
  onToggleGroup: (key: string) => void;
  search: string;
  filter: FilterState;
  progressFor: (p: Player) => Set<string>;
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

export default function TriumphTable({ groups, triumphs, players, collapsed, onToggleGroup, search, filter, progressFor, nodes = [] }: Props) {
  const { t, locale } = useLocale();
  const q = search.trim().toLowerCase();
  const useFr = locale === 'fr';

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

  return (
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

            const groupAllDone = players.length > 0 &&
              group.items.every(item => players.every(p => progressFor(p).has(item.id)));

            const sameNameEn = group.cat === group.sub;
            const sameNameFr = group.catFr === group.subFr;
            const primaryLabel = useFr
              ? (sameNameFr ? group.subFr : `${group.catFr} · ${group.subFr}`)
              : (sameNameEn ? group.sub : `${group.cat} · ${group.sub}`);
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
              ...(!isCollapsed ? visibleItems.map(item => {
                const checks = players.map(p => progressFor(p).has(item.id));
                const allDone = checks.every(Boolean);
                const localeName = locale === 'fr' ? item.fr : locale === 'pt' ? item.pt : undefined;
                const primaryName = localeName || item.en;
                const secondaryName = useFr ? item.en : item.fr;
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
                      </div>
                    </td>
                    {players.map((p, i) => (
                      <td key={p} className={`${styles.td} ${styles.friendCell}`}>
                        <span
                          className={`${styles.status} ${checks[i] ? styles.isDone : styles.isTodo}`}
                          role="img"
                          aria-label={`${p} — ${primaryName} : ${checks[i] ? t.done : t.todo}`}
                        />
                      </td>
                    ))}
                  </tr>
                );
              }) : [])
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
