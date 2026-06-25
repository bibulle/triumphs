import { useState, useCallback } from 'react'
import type { Locale } from '../i18n'
import { translations } from '../i18n'

const STORAGE_KEY = 'triumph-locale'

function readLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'fr' || saved === 'en' || saved === 'pt') return saved
  } catch { /* SSR / private mode */ }
  return 'pt'
}

export function useLocaleState() {
  const [locale, setLocaleRaw] = useState<Locale>(readLocale)

  const setLocale = useCallback((l: Locale) => {
    try { localStorage.setItem(STORAGE_KEY, l) } catch { /* ignore */ }
    setLocaleRaw(l)
  }, [])

  return { locale, setLocale, t: translations[locale] }
}
