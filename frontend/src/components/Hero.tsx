import { useMemo } from 'react';
import { DATA, PLAYERS } from '../data';
import type { Player } from '../data';
import styles from './Hero.module.css';

interface Props {
  sectionLabel: string;
  hasData: boolean;
  progressFor: (p: Player) => Set<string>;
}

export default function Hero({ sectionLabel, hasData, progressFor }: Props) {
  const total = DATA.length;

  const sorted = useMemo(() => {
    return [...PLAYERS]
      .map(p => ({ name: p, done: DATA.filter(d => progressFor(p).has(d.id)).length }))
      .sort((a, b) => b.done - a.done);
  }, [progressFor]);

  return (
    <div className={styles.hero}>
      <div className={styles.eyebrow}>Destiny 2 · Tracker de triomphes</div>
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
