import styles from './EmptySection.module.css';

export default function EmptySection({ label }: { label: string }) {
  return (
    <div className={styles.empty}>
      <div className={styles.icon} />
      <h3 className={styles.title}>{label}</h3>
      <p className={styles.text}>Le suivi de cette section sera disponible prochainement.</p>
    </div>
  );
}
