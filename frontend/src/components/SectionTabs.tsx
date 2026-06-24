import type { Section } from '../data';
import styles from './SectionTabs.module.css';

interface Props {
  sections: Section[];
  activeId: string;
  onSelect: (id: string) => void;
}

export default function SectionTabs({ sections, activeId, onSelect }: Props) {
  return (
    <nav className={styles.sections}>
      {sections.map(sec => (
        <button
          key={sec.id}
          className={`${styles.tab} ${sec.id === activeId ? styles.active : ''}`}
          onClick={() => onSelect(sec.id)}
        >
          <span className={styles.dot} />
          {sec.label}
          {!sec.hasData && <span className={styles.tag}>à venir</span>}
        </button>
      ))}
    </nav>
  );
}
