import { useState, useEffect } from 'react'
import { fetchTriumphs, fetchProgress, fetchPlayers } from '../api'
import { CAT_FR, SUB_FR, SECTIONS } from '../data'
import type { Triumph, Group, Player } from '../data'

export type AppData = {
  groups: Group[]
  triumphs: Triumph[]
  players: Player[]
  progress: Record<string, Set<string>>
  sections: typeof SECTIONS
  loading: boolean
  error: string | null
}

export function useAppData(): AppData {
  const [triumphs, setTriumphs] = useState<Triumph[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [progress, setProgress] = useState<Record<string, Set<string>>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [rawTriumphs, rawProgress, rawPlayers] = await Promise.all([
          fetchTriumphs(),
          fetchProgress(),
          fetchPlayers(),
        ])
        if (cancelled) return

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

        const playerNames = rawPlayers.map(p => p.name)
        const prog = Object.fromEntries(
          playerNames.map(name => [name, new Set<string>(rawProgress[name] ?? [])])
        )

        setTriumphs(rawTriumphs)
        setGroups([...groupMap.values()])
        setPlayers(playerNames)
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

  return { groups, triumphs, players, progress, sections: SECTIONS, loading, error }
}
