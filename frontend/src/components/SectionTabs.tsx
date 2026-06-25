import type { Section, NodeMeta } from '../data';
import { useLocale } from '../i18n';
import styles from './SectionTabs.module.css';

const BUNGIE_CDN = 'https://www.bungie.net';

interface Props {
  sections: Section[];
  activeId: string;
  onSelect: (id: string) => void;
  nodes?: NodeMeta[];
}

export default function SectionTabs({ sections, activeId, onSelect, nodes = [] }: Props) {
  const { t } = useLocale();

  const iconFor = (sectionId: string): string | undefined => {
    const node = nodes.find(n => n.level === 0 && n.sectionId === sectionId);
    return node?.icon ? `${BUNGIE_CDN}${node.icon}` : undefined;
  };

  return (
    <nav className={styles.sections}>
      {sections.map(sec => {
        const icon = iconFor(sec.id);
        return (
          <button
            key={sec.id}
            className={`${styles.tab} ${sec.id === activeId ? styles.active : ''}`}
            onClick={() => onSelect(sec.id)}
          >
            {icon
              ? <span
                  className={styles.icon}
                  style={{ maskImage: `url(${icon})`, WebkitMaskImage: `url(${icon})` }}
                  aria-hidden="true"
                />
              : <span className={styles.dot} />
            }
            {t.sections[sec.id] ?? sec.label}
            {!sec.hasData && <span className={styles.tag}>{t.comingSoon}</span>}
          </button>
        );
      })}
    </nav>
  );
}
