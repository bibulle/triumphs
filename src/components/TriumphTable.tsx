import { useMemo } from 'react';
import { GROUPS, PLAYERS, DATA, CAT_FR, SUB_FR } from '../data';
import type { Player } from '../data';
import styles from './TriumphTable.module.css';

interface Props {
  collapsed: Set<string>;
  onToggleGroup: (key: string) => void;
  search: string;
  hideDone: boolean;
  progressFor: (p: Player) => Set<string>;
}

const CAT_CLASS: Record<string, string> = {
  Worlds: styles.catWorlds,
  Stories: styles.catStories,
  Combat: styles.catCombat,
  Teamwork: styles.catTeamwork,
  Competitions: styles.catCompetitions,
};

export default function TriumphTable({ collapsed, onToggleGroup, search, hideDone, progressFor }: Props) {
  const q = search.trim().toLowerCase();

  const totalDone = useMemo(
    () => Object.fromEntries(PLAYERS.map(p => [p, DATA.filter(d => progressFor(p).has(d.id)).length])),
    [progressFor]
  );

  return (
    <div className={styles.tablewrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={`${styles.th} ${styles.colTitle}`}>Triomphe</th>
            {PLAYERS.map(p => (
              <th key={p} className={`${styles.th} ${styles.friendTh}`}>
                <div className={styles.friendHead}>
                  <span className={styles.fname}>{p}</span>
                  <span className={styles.fcount}>{totalDone[p]}/{DATA.length}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GROUPS.map(group => {
            const isCollapsed = collapsed.has(group.groupKey);
            const catClass = CAT_CLASS[group.cat] ?? '';

            const visibleItems = group.items.filter(item => {
              const matchSearch = !q || (item.en + ' ' + item.fr).toLowerCase().includes(q);
              const allDone = PLAYERS.every(p => progressFor(p).has(item.id));
              if (!matchSearch) return false;
              if (hideDone && allDone) return false;
              return true;
            });

            const groupVisible = visibleItems.length > 0 || !q;

            if (!groupVisible) return null;

            return [
              <tr
                key={`g-${group.groupKey}`}
                className={`${styles.groupRow} ${catClass} ${isCollapsed ? styles.collapsed : ''}`}
                onClick={() => onToggleGroup(group.groupKey)}
              >
                <td className={`${styles.td} ${styles.colTitle} ${styles.groupTitleCell}`}>
                  <div className={styles.groupHead}>
                    <span className={styles.chev}>▾</span>
                    <span className={styles.groupLabel}>
                      {CAT_FR[group.cat]} · {SUB_FR[group.groupKey]}
                      <span className={styles.groupLabelEn}>{group.cat} · {group.sub}</span>
                    </span>
                  </div>
                </td>
                {PLAYERS.map(p => {
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
                const checks = PLAYERS.map(p => progressFor(p).has(item.id));
                const allDone = checks.every(Boolean);
                return (
                  <tr
                    key={item.id}
                    className={`${styles.itemRow} ${allDone ? styles.allDone : ''}`}
                  >
                    <td className={`${styles.td} ${styles.colTitle} ${styles.itemColTitle}`}>
                      <div className={styles.titleCell}>
                        <span className={`${styles.bullet} ${allDone ? styles.bulletDone : ''}`} />
                        <div className={styles.titleText}>
                          <span className={`${styles.titleFr} ${allDone ? styles.titleFrDone : ''}`}>
                            {item.fr}
                            {allDone && <span className={styles.completeBadge}>COMPLET</span>}
                          </span>
                          <span className={styles.titleEn}>{item.en}</span>
                          {!item.descFr && !item.descEn && (
                            <span className={styles.descPlaceholder}>Description à venir / coming soon</span>
                          )}
                        </div>
                      </div>
                    </td>
                    {PLAYERS.map((p, i) => (
                      <td key={p} className={`${styles.td} ${styles.friendCell}`}>
                        <span
                          className={`${styles.status} ${checks[i] ? styles.isDone : styles.isTodo}`}
                          role="img"
                          aria-label={`${p} — ${item.fr} : ${checks[i] ? 'fait' : 'à faire'}`}
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
