import { useEffect, useRef } from 'react';
import type { Player, FilterState, FilterStatus, SortState } from '../data';
import { DEFAULT_FILTER, isFilterActive } from '../data';
import { useLocale } from '../i18n';
import styles from './FilterPopover.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  filter: FilterState;
  onChange: (f: FilterState) => void;
  players: readonly Player[];
  sortState: SortState;
  onSortChange: (s: SortState) => void;
}

const STATUS_KEYS: FilterStatus[] = ['all', 'none', 'partial', 'done'];

export default function FilterPopover({ open, onClose, filter, onChange, players, sortState, onSortChange }: Props) {
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

  const isActive = isFilterActive(filter) || sortState !== 'default';
  const sortOptions: { key: SortState; label: string }[] = [
    { key: 'default', label: t.sortDefault },
    { key: 'global', label: t.sortGlobalPrio },
    { key: 'flag', label: t.sortFlag },
    ...players.map(p => ({ key: `p:${p}` as SortState, label: p })),
  ];

  return (
    <div className={styles.popover} ref={ref} role="dialog" aria-modal="false">
      <div className={styles.section}>
        <div className={styles.sectionLabel}>{t.progressLabel}</div>
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

      <div className={styles.section}>
        <div className={styles.sectionLabel}>{t.sortLabel} <span className={styles.hint}>{t.sortHint}</span></div>
        <div className={styles.seg}>
          {sortOptions.map(({ key, label }) => (
            <button
              key={key}
              className={`${styles.segBtn} ${sortState === key ? styles.segActive : ''}`}
              onClick={() => onSortChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isActive && (
        <button
          className={styles.reset}
          onClick={() => { onChange(DEFAULT_FILTER); onSortChange('default'); }}
        >
          {t.filterReset}
        </button>
      )}
    </div>
  );
}
