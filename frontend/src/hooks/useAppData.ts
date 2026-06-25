import { useState, useEffect } from 'react'
import { fetchTriumphs, fetchProgress } from '../api'
import { CAT_FR, SUB_FR, PLAYERS, SECTIONS } from '../data'
import type { Triumph, Group, Player } from '../data'

export type AppData = {
  groups: Group[]
  triumphs: Triumph[]
  progress: Record<Player, Set<string>>
  sections: typeof SECTIONS
  loading: boolean
  error: string | null
}

export function useAppData(): AppData {
  const [triumphs, setTriumphs] = useState<Triumph[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [progress, setProgress] = useState<Record<Player, Set<string>>>(() =>
    Object.fromEntries(PLAYERS.map(p => [p, new Set<string>()])) as Record<Player, Set<string>>
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [rawTriumphs, rawProgress] = await Promise.all([
          fetchTriumphs(),
          fetchProgress(),
        ])
        if (cancelled) return

        // Build groups from triumphs array — insertion order preserved (API order)
        const groupMap = new Map<string, Group>()
        rawTriumphs.forEach(t => {
          if (!groupMap.has(t.groupKey)) {
            groupMap.set(t.groupKey, {
              section: t.section ?? 'triumphs',
              cat: t.cat,
              catFr: t.catFr ?? CAT_FR[t.cat] ?? t.cat,
              sub: t.sub,
              subFr: t.subFr ?? SUB_FR[t.groupKey] ?? t.sub,
              groupKey: t.groupKey,
              items: [],
            })
          }
          groupMap.get(t.groupKey)!.items.push(t)
        })

        const sortedGroups = [...groupMap.values()]

        const prog = Object.fromEntries(
          PLAYERS.map(p => [p, new Set<string>(rawProgress[p] ?? [])])
        ) as Record<Player, Set<string>>

        setTriumphs(rawTriumphs)
        setGroups(sortedGroups)
        setProgress(prog)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { groups, triumphs, progress, sections: SECTIONS, loading, error }
}
