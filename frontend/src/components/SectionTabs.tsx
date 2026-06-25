import type { Section } from '../data';
import { useLocale } from '../i18n';
import styles from './SectionTabs.module.css';

interface Props {
  sections: Section[];
  activeId: string;
  onSelect: (id: string) => void;
}

export default function SectionTabs({ sections, activeId, onSelect }: Props) {
  const { t } = useLocale();

  return (
    <nav className={styles.sections}>
      {sections.map(sec => (
        <button
          key={sec.id}
          className={`${styles.tab} ${sec.id === activeId ? styles.active : ''}`}
          onClick={() => onSelect(sec.id)}
        >
          <span className={styles.dot} />
          {t.sections[sec.id] ?? sec.label}
          {!sec.hasData && <span className={styles.tag}>{t.comingSoon}</span>}
        </button>
      ))}
    </nav>
  );
}
