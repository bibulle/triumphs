import { useLocale, LOCALES } from '../i18n'
import styles from './LangPicker.module.css'

export default function LangPicker() {
  const { locale, setLocale } = useLocale()
  return (
    <div className={styles.picker}>
      {LOCALES.map(l => (
        <button
          key={l.id}
          className={`${styles.btn} ${l.id === locale ? styles.active : ''}`}
          onClick={() => setLocale(l.id)}
          title={l.label}
          aria-label={l.label}
          aria-pressed={l.id === locale}
        >
          {l.flag}
        </button>
      ))}
    </div>
  )
}
