import { useState, useCallback } from 'react';

function IconExpand() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <line x1="2" y1="2" x2="14" y2="2" />
      <polyline points="5,6 8,10 11,6" />
      <line x1="2" y1="14" x2="14" y2="14" />
    </svg>
  );
}

function IconCollapse() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <line x1="2" y1="2" x2="14" y2="2" />
      <polyline points="5,10 8,6 11,10" />
      <line x1="2" y1="14" x2="14" y2="14" />
    </svg>
  );
}
import type { Player, FilterState, SortState } from '../data';
import { isFilterActive } from '../data';
import { useLocale } from '../i18n';
import FilterPopover from './FilterPopover';
import styles from './Toolbar.module.css';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  filter: FilterState;
  onFilterChange: (f: FilterState) => void;
  sortState: SortState;
  onSortChange: (s: SortState) => void;
  players: readonly Player[];
  onExpandAll: () => void;
  onCollapseAll: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onRefreshProgress: (force?: boolean) => Promise<void>;
  nextRefreshIn: number;
  onShowProgression: () => void;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function Toolbar({
  search, onSearch, filter, onFilterChange, sortState, onSortChange, players,
  onExpandAll, onCollapseAll, theme, onToggleTheme, onRefreshProgress, nextRefreshIn, onShowProgression
}: Props) {
  const { t } = useLocale();
  const [filterOpen, setFilterOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const active = isFilterActive(filter) || sortState !== 'default';

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await onRefreshProgress(true); } finally { setRefreshing(false); }
  }, [onRefreshProgress]);

  return (
    <div className={styles.toolbar}>
      <input
        className={styles.search}
        type="text"
        placeholder={t.searchPlaceholder}
        value={search}
        onChange={e => onSearch(e.target.value)}
      />
      <div className={styles.filterWrap}>
        <button
          className={`${styles.btn} ${active ? styles.btnActive : ''}`}
          onClick={() => setFilterOpen(o => !o)}
          aria-expanded={filterOpen}
        >
          {t.filter}{active && <span className={styles.filterDot} />}
        </button>
        <FilterPopover
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          filter={filter}
          onChange={onFilterChange}
          players={players}
          sortState={sortState}
          onSortChange={onSortChange}
        />
      </div>
      <button className={styles.btn} onClick={onShowProgression}>
        Progression
      </button>
      <div className={styles.iconGroup}>
        <button
          className={`${styles.iconBtn} ${styles.expandBtn}`}
          onClick={onExpandAll}
          title={t.expandAll}
          aria-label={t.expandAll}
        >
          <IconExpand />
        </button>
        <button
          className={`${styles.iconBtn} ${styles.collapseBtn}`}
          onClick={onCollapseAll}
          title={t.collapseAll}
          aria-label={t.collapseAll}
        >
          <IconCollapse />
        </button>
        <button
          className={`${styles.iconBtn} ${styles.refreshBtn} ${refreshing ? styles.refreshing : ''}`}
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Actualiser la progression"
          data-label={refreshing ? '…' : formatCountdown(nextRefreshIn)}
        >
          ↻
          <span
            className={styles.refreshBar}
            style={{ width: `${(nextRefreshIn / 300) * 100}%` }}
          />
        </button>
        <button
          className={styles.iconBtn}
          onClick={onToggleTheme}
          title="Changer de thème"
          aria-label="Changer de thème"
        >
          {theme === 'dark' ? '☾' : '☀'}
        </button>
      </div>
    </div>
  );
}
