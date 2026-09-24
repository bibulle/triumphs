import { useState, useCallback } from 'react'
import type { Locale } from '../i18n'
import { translations } from '../i18n'

const STORAGE_KEY = 'triumph-locale'

function readLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'fr' || saved === 'en' || saved === 'pt') return saved
    if (saved !== null) console.warn(`[triumph-locale] valeur inattendue en storage: ${JSON.stringify(saved)}`)
  } catch (err) {
    console.warn('[triumph-locale] localStorage inaccessible en lecture (mode privé, storage bloqué…)', err)
  }
  return 'pt'
}

export function useLocaleState() {
  const [locale, setLocaleRaw] = useState<Locale>(readLocale)

  const setLocale = useCallback((l: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, l)
      if (localStorage.getItem(STORAGE_KEY) !== l) {
        console.warn('[triumph-locale] la valeur écrite ne correspond pas à la relecture — storage non fiable ici')
      }
    } catch (err) {
      console.warn('[triumph-locale] localStorage inaccessible en écriture (mode privé, storage bloqué…)', err)
    }
    setLocaleRaw(l)
  }, [])

  return { locale, setLocale, t: translations[locale] }
}
