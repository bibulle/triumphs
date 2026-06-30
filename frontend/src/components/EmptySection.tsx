import { useLocale } from '../i18n';
import styles from './EmptySection.module.css';

export default function EmptySection({ label }: { label: string }) {
  const { t } = useLocale();
  return (
    <div className={styles.empty}>
      <div className={styles.icon} />
      <h3 className={styles.title}>{label}</h3>
      <p className={styles.text}>{t.emptySection}</p>
    </div>
  );
}
