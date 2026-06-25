import type { Triumph } from './data'

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

export async function fetchProgress(): Promise<Record<string, string[]>> {
  const res = await fetch('/api/progress')
  if (!res.ok) throw new Error(`fetchProgress: ${res.status}`)
  return res.json()
}
