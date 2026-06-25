import { useMemo } from 'react';
import type { Triumph, Player } from '../data';
import styles from './Hero.module.css';

interface Props {
  sectionLabel: string;
  hasData: boolean;
  triumphs: Triumph[];
  players: readonly Player[];
  progressFor: (p: Player) => Set<string>;
}

export default function Hero({ sectionLabel, hasData, triumphs, players, progressFor }: Props) {
  const total = triumphs.length;

  const sorted = useMemo(() => {
    return [...players]
      .map(p => ({ name: p, done: triumphs.filter(d => progressFor(p).has(d.id)).length }))
      .sort((a, b) => b.done - a.done);
  }, [triumphs, progressFor]);

  return (
    <div className={styles.hero}>
      <div className={styles.eyebrow}>
        Destiny 2 · Tracker de triomphes
        <span className={styles.version}>v{__APP_VERSION__}</span>
      </div>
      <h1 className={styles.h1}>{sectionLabel}</h1>
      <div className={styles.grid}>
        <div className={styles.stat}>
          <div className={styles.num}>{hasData ? `${total} triomphes` : '— triomphes'}</div>
          <div className={styles.lbl}>Triomphes au total</div>
        </div>
        {hasData && (
          <div className={styles.leaderboard}>
            {sorted.map((row, i) => (
              <div key={row.name} className={`${styles.lbRow} ${i === 0 ? styles.first : ''}`}>
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.lbName}>{row.name}</span>
                <div className={styles.lbBar}>
                  <div
                    className={styles.lbFill}
                    style={{ width: `${Math.round(row.done / total * 100)}%` }}
                  />
                </div>
                <span className={styles.lbFrac}>{row.done}/{total}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
