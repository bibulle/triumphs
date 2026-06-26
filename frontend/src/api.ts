import type { Triumph, NodeMeta, RecordProgress, Annotations, PlayerAnnotation } from './data'

export interface PlayerInfo {
  name: string
  tag: string
}

export async function fetchPlayers(): Promise<PlayerInfo[]> {
  const res = await fetch('/api/players')
  if (!res.ok) throw new Error(`fetchPlayers: ${res.status}`)
  return res.json()
}

export async function fetchTriumphs(): Promise<Triumph[]> {
  const res = await fetch('/api/triumphs')
  if (!res.ok) throw new Error(`fetchTriumphs: ${res.status}`)
  return res.json()
}

export async function fetchNodes(): Promise<NodeMeta[]> {
  const res = await fetch('/api/nodes')
  if (!res.ok) throw new Error(`fetchNodes: ${res.status}`)
  return res.json()
}

export async function fetchProgress(): Promise<Record<string, Record<string, RecordProgress>>> {
  const res = await fetch('/api/progress')
  if (!res.ok) throw new Error(`fetchProgress: ${res.status}`)
  return res.json()
}

export async function fetchAnnotations(): Promise<Annotations> {
  const res = await fetch('/api/annotations')
  if (!res.ok) throw new Error(`fetchAnnotations: ${res.status}`)
  return res.json()
}

export async function saveAnnotations(player: string, data: PlayerAnnotation): Promise<void> {
  const res = await fetch(`/api/annotations/${encodeURIComponent(player)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`saveAnnotations: ${res.status}`)
}
