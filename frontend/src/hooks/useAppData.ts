import { useState, useEffect } from 'react'
import { fetchTriumphs, fetchProgress, fetchPlayers, fetchNodes } from '../api'
import { CAT_FR, SUB_FR, SECTIONS } from '../data'
import type { Triumph, Group, Player, NodeMeta, RecordProgress } from '../data'

export type AppData = {
  groups: Group[]
  triumphs: Triumph[]
  players: Player[]
  progress: Record<string, Set<string>>
  progressDetail: Record<string, Record<string, RecordProgress>>
  nodes: NodeMeta[]
  sections: typeof SECTIONS
  loading: boolean
  error: string | null
}

export function useAppData(): AppData {
  const [triumphs, setTriumphs] = useState<Triumph[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [progress, setProgress] = useState<Record<string, Set<string>>>({})
  const [progressDetail, setProgressDetail] = useState<Record<string, Record<string, RecordProgress>>>({})
  const [nodes, setNodes] = useState<NodeMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [rawTriumphs, rawProgress, rawPlayers, rawNodes] = await Promise.all([
          fetchTriumphs(),
          fetchProgress(),
          fetchPlayers(),
          fetchNodes(),
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

        // Derive Set<string> of completed IDs for quick lookup
        const prog = Object.fromEntries(
          playerNames.map(name => {
            const playerRecs = rawProgress[name] ?? {}
            const completed = new Set<string>(
              Object.entries(playerRecs).filter(([, r]) => r.completed).map(([id]) => id)
            )
            return [name, completed]
          })
        )

        setTriumphs(rawTriumphs)
        setGroups([...groupMap.values()])
        setPlayers(playerNames)
        setProgress(prog)
        setProgressDetail(rawProgress)
        setNodes(rawNodes)
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

  return { groups, triumphs, players, progress, progressDetail, nodes, sections: SECTIONS, loading, error }
}
