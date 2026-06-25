import { useLocale } from '../i18n';
import styles from './Toolbar.module.css';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  hideDone: boolean;
  onToggleDone: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Toolbar({
  search, onSearch, hideDone, onToggleDone,
  onExpandAll, onCollapseAll, theme, onToggleTheme
}: Props) {
  const { t } = useLocale();
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
      <button className={styles.btn} onClick={onToggleDone}>
        {hideDone ? t.showDone : t.hideDone}
      </button>
      <button className={styles.btn} onClick={onToggleTheme} aria-label="Changer de thème">
        {theme === 'dark' ? '☾' : '☀'}
      </button>
    </div>
  );
}
