import { createContext, useContext } from 'react'

export type Locale = 'fr' | 'en' | 'pt'

const translations = {
  fr: {
    loading: 'Chargement…',
    error: 'Erreur',
    triumphColumn: 'Triomphe',
    complete: 'COMPLET',
    done: 'fait',
    todo: 'à faire',
    collapseAll: 'Tout replier',
    expandAll: 'Tout déplier',
    hideDone: 'Masquer terminés',
    showDone: 'Afficher terminés',
    searchPlaceholder: 'Rechercher un triomphe (FR ou EN)…',
    eyebrow: 'Destiny 2 · Tracker de triomphes',
    totalLabel: 'Triomphes au total',
    itemsLabel: 'triomphes',
    comingSoon: 'à venir',
    sections: { triumphs: 'Triomphes', titles: 'Titres', ranks: 'Rangs de Gardien' } as Record<string, string>,
  },
  en: {
    loading: 'Loading…',
    error: 'Error',
    triumphColumn: 'Triumph',
    complete: 'COMPLETE',
    done: 'done',
    todo: 'to do',
    collapseAll: 'Collapse all',
    expandAll: 'Expand all',
    hideDone: 'Hide completed',
    showDone: 'Show completed',
    searchPlaceholder: 'Search a triumph (FR or EN)…',
    eyebrow: 'Destiny 2 · Triumph tracker',
    totalLabel: 'Total triumphs',
    itemsLabel: 'triumphs',
    comingSoon: 'coming soon',
    sections: { triumphs: 'Triumphs', titles: 'Titles', ranks: 'Guardian Ranks' } as Record<string, string>,
  },
  pt: {
    loading: 'A carregar…',
    error: 'Erro',
    triumphColumn: 'Triunfo',
    complete: 'COMPLETO',
    done: 'feito',
    todo: 'por fazer',
    collapseAll: 'Recolher tudo',
    expandAll: 'Expandir tudo',
    hideDone: 'Ocultar concluídos',
    showDone: 'Mostrar concluídos',
    searchPlaceholder: 'Pesquisar um triunfo (FR ou EN)…',
    eyebrow: 'Destiny 2 · Rastreador de triunfos',
    totalLabel: 'Triunfos no total',
    itemsLabel: 'triunfos',
    comingSoon: 'em breve',
    sections: { triumphs: 'Triunfos', titles: 'Títulos', ranks: 'Classificações do Guardião' } as Record<string, string>,
  },
} as const

export type Translations = typeof translations['fr']

export { translations }

export interface LocaleCtx { locale: Locale; setLocale: (l: Locale) => void; t: Translations }

export const LocaleContext = createContext<LocaleCtx>({
  locale: 'fr',
  setLocale: () => {},
  t: translations.fr,
})

export const useLocale = () => useContext(LocaleContext)

export const LOCALES: { id: Locale; flag: string; label: string }[] = [
  { id: 'fr', flag: '🇫🇷', label: 'Français' },
  { id: 'en', flag: '🇬🇧', label: 'English' },
  { id: 'pt', flag: '🇧🇷', label: 'Português' },
]
