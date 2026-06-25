import { useEffect, useRef } from 'react';
import type { Player, FilterState, FilterStatus } from '../data';
import { DEFAULT_FILTER, isFilterActive } from '../data';
import { useLocale } from '../i18n';
import styles from './FilterPopover.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  filter: FilterState;
  onChange: (f: FilterState) => void;
  players: readonly Player[];
}

const STATUS_KEYS: FilterStatus[] = ['all', 'none', 'partial', 'done'];

export default function FilterPopover({ open, onClose, filter, onChange, players }: Props) {
  const { t } = useLocale();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  if (!open) return null;

  const statusLabels: Record<FilterStatus, string> = {
    all: t.filterAll,
    none: t.filterNone,
    partial: t.filterPartial,
    done: t.filterDone,
  };

  const toggleMissing = (p: Player) => {
    const next = new Set(filter.missing);
    if (next.has(p)) next.delete(p); else next.add(p);
    onChange({ ...filter, missing: next });
  };

  return (
    <div className={styles.popover} ref={ref} role="dialog" aria-modal="false">
      <div className={styles.section}>
        <div className={styles.sectionLabel}>{t.filterAll === 'Tous' ? 'Avancement' : 'Progress'}</div>
        <div className={styles.seg}>
          {STATUS_KEYS.map(s => (
            <button
              key={s}
              className={`${styles.segBtn} ${filter.status === s ? styles.segActive : ''}`}
              onClick={() => onChange({ ...filter, status: s })}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {players.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>{t.filterMissing}</div>
          <div className={styles.chips}>
            {players.map(p => (
              <button
                key={p}
                className={`${styles.chip} ${filter.missing.has(p) ? styles.chipActive : ''}`}
                onClick={() => toggleMissing(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {isFilterActive(filter) && (
        <button className={styles.reset} onClick={() => onChange(DEFAULT_FILTER)}>
          {t.filterReset}
        </button>
      )}
    </div>
  );
}
