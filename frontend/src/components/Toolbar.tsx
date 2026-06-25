import { useState } from 'react';
import type { Player, FilterState } from '../data';
import { isFilterActive } from '../data';
import { useLocale } from '../i18n';
import FilterPopover from './FilterPopover';
import styles from './Toolbar.module.css';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  filter: FilterState;
  onFilterChange: (f: FilterState) => void;
  players: readonly Player[];
  onExpandAll: () => void;
  onCollapseAll: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Toolbar({
  search, onSearch, filter, onFilterChange, players,
  onExpandAll, onCollapseAll, theme, onToggleTheme
}: Props) {
  const { t } = useLocale();
  const [filterOpen, setFilterOpen] = useState(false);
  const active = isFilterActive(filter);

  return (
    <div className={styles.toolbar}>
      <input
        className={styles.search}
        type="text"
        placeholder={t.searchPlaceholder}
        value={search}
        onChange={e => onSearch(e.target.value)}
      />
      <button className={styles.btn} onClick={onExpandAll}>{t.expandAll}</button>
      <button className={styles.btn} onClick={onCollapseAll}>{t.collapseAll}</button>
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
        />
      </div>
      <button className={styles.btn} onClick={onToggleTheme} aria-label="Changer de thème">
        {theme === 'dark' ? '☾' : '☀'}
      </button>
    </div>
  );
}
