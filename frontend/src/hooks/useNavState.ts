import { useState, useCallback } from 'react'

const STORAGE_KEY = 'triumph-nav'

interface NavState {
  tab: string
  openGroups: Record<string, string | null>
}

function readNavState(): NavState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && typeof parsed.tab === 'string') return parsed
    }
  } catch { /* ignore */ }
  return { tab: 'triumphs', openGroups: {} }
}

function writeNavState(state: NavState): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* ignore */ }
}

export function useNavState() {
  const [navState, setNavState] = useState<NavState>(readNavState)

  const setTab = useCallback((tab: string) => {
    setNavState(prev => {
      const next = { ...prev, tab }
      writeNavState(next)
      return next
    })
  }, [])

  const toggleGroup = useCallback((tab: string, groupKey: string) => {
    setNavState(prev => {
      const current = prev.openGroups[tab] ?? null
      const next = {
        ...prev,
        openGroups: { ...prev.openGroups, [tab]: current === groupKey ? null : groupKey },
      }
      writeNavState(next)
      return next
    })
  }, [])

  const closeAll = useCallback((tab: string) => {
    setNavState(prev => {
      const next = { ...prev, openGroups: { ...prev.openGroups, [tab]: null } }
      writeNavState(next)
      return next
    })
  }, [])

  const openFirst = useCallback((tab: string, firstGroupKey: string) => {
    setNavState(prev => {
      const next = { ...prev, openGroups: { ...prev.openGroups, [tab]: firstGroupKey } }
      writeNavState(next)
      return next
    })
  }, [])

  return { navState, setTab, toggleGroup, closeAll, openFirst }
}
