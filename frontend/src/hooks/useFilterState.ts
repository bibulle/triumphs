import { useState, useEffect } from 'react'
import type { FilterState, SortState, Player } from '../data'
import { DEFAULT_FILTER } from '../data'

const STORAGE_KEY = 'triumph-filter'

interface Stored {
  status: FilterState['status']
  missing: Player[]
  notAbandonedBy: Player[]
  sort: SortState
}

function readStored(): { filter: FilterState; sort: SortState } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<Stored>
      if (parsed && typeof parsed.status === 'string') {
        return {
          filter: {
            status: parsed.status,
            missing: new Set(Array.isArray(parsed.missing) ? parsed.missing : []),
            notAbandonedBy: new Set(Array.isArray(parsed.notAbandonedBy) ? parsed.notAbandonedBy : []),
          },
          sort: typeof parsed.sort === 'string' ? parsed.sort as SortState : 'default',
        }
      }
    }
  } catch { /* SSR / private mode */ }
  return { filter: DEFAULT_FILTER, sort: 'default' }
}

export function useFilterState() {
  const [initial] = useState(readStored)
  const [filter, setFilter] = useState<FilterState>(initial.filter)
  const [sortState, setSortState] = useState<SortState>(initial.sort)

  useEffect(() => {
    try {
      const stored: Stored = {
        status: filter.status,
        missing: [...filter.missing],
        notAbandonedBy: [...filter.notAbandonedBy],
        sort: sortState,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    } catch { /* ignore */ }
  }, [filter, sortState])

  return { filter, setFilter, sortState, setSortState }
}
