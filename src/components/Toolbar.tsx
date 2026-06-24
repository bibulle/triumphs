import { GROUPS } from '../data';
import styles from './Toolbar.module.css';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  hideDone: boolean;
  onToggleDone: () => void;
  onExpandAll: () => void;
  onCollapseAll: (keys: string[]) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Toolbar({
  search, onSearch, hideDone, onToggleDone,
  onExpandAll, onCollapseAll, theme, onToggleTheme
}: Props) {
  return (
    <div className={styles.toolbar}>
      <input
        className={styles.search}
        type="text"
        placeholder="Rechercher un triomphe (FR ou EN)…"
        value={search}
        onChange={e => onSearch(e.target.value)}
      />
      <button className={styles.btn} onClick={onExpandAll}>Tout déplier</button>
      <button className={styles.btn} onClick={() => onCollapseAll(GROUPS.map(g => g.groupKey))}>
        Tout replier
      </button>
      <button className={styles.btn} onClick={onToggleDone}>
        {hideDone ? 'Afficher terminés' : 'Masquer terminés'}
      </button>
      <button className={styles.btn} onClick={onToggleTheme} aria-label="Changer de thème">
        {theme === 'dark' ? '☾ Sombre' : '☀ Clair'}
      </button>
    </div>
  );
}
