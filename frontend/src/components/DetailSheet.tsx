import { useEffect, useRef } from 'react';
import type { Triumph, Player, Annotations, PrioLevel, FlagKey, RecordProgress } from '../data';
import type { Locale } from '../i18n';
import { useLocale } from '../i18n';
import { PrioMeter, FlagIcon } from './CellEditor';
import styles from './DetailSheet.module.css';

interface Props {
  item: Triumph;
  players: readonly Player[];
  progressFor: (p: Player) => Set<string>;
  progressDetailFor?: (p: Player) => Record<string, RecordProgress>;
  annotations: Annotations;
  locale?: Locale;
  onClose: () => void;
}

export default function DetailSheet({ item, players, progressFor, progressDetailFor, annotations, onClose }: Props) {
  const { t, locale } = useLocale();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouse);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouse);
    };
  }, [onClose]);

  const localeName = locale === 'fr' ? item.fr : locale === 'pt' ? item.pt : undefined;
  const primaryName = localeName || item.en;
  const sgLabel = locale === 'pt' ? (item.subGroupPt || item.subGroup) : locale === 'fr' ? item.subGroupFr : item.subGroup;
  const desc = locale === 'fr' ? (item.descFr || item.descEn) : (item.descEn || item.descFr);

  return (
    <div className={styles.overlay} data-testid="detail-sheet">
      <div className={styles.sheet} ref={ref} role="dialog" aria-modal="true">
        <button className={styles.close} onClick={onClose} aria-label="Close" type="button">&times;</button>

        {sgLabel && <div className={styles.sg}>{sgLabel}</div>}
        <h2 className={styles.title}>{primaryName}</h2>
        {item.en !== primaryName && <div className={styles.nameEn}>{item.en}</div>}
        {desc && <p className={styles.desc}>{desc}</p>}

        <div className={styles.playersGrid}>
          {players.map(p => {
            const detail = progressDetailFor?.(p)?.[item.id];
            const objectives = detail?.objectives ?? [];
            const current = objectives.reduce((s, o) => s + o.current, 0);
            const total = objectives.reduce((s, o) => s + o.completionValue, 0);
            const allObjMet = total > 0 && current >= total;
            const done = progressFor(p).has(item.id) || !!detail?.completed || allObjMet;
            const notRedeemed = done && detail?.redeemed === false;
            const hasProgress = !done && total > 0;
            const lvl = (annotations[p]?.prio[item.id] as PrioLevel) ?? 0;
            const fl = (annotations[p]?.flags[item.id] as FlagKey) ?? null;

            return (
              <div key={p} className={styles.playerCard}>
                <div className={styles.playerName}>{p}</div>
                <div className={styles.playerStatus}>
                  {done ? (
                    <span className={`${styles.status} ${notRedeemed ? styles.statusNotRedeemed : styles.statusDone}`}>
                      {notRedeemed ? (t.notRedeemed ?? 'non réclamé') : t.done}
                    </span>
                  ) : hasProgress ? (
                    <span className={styles.statusProgress}>{current}/{total}</span>
                  ) : (
                    <span className={`${styles.status} ${styles.statusTodo}`}>{t.todo}</span>
                  )}
                </div>
                <div className={styles.playerMeta}>
                  <PrioMeter level={lvl} />
                  <FlagIcon flagKey={fl} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
