import type { Triumph, Player } from './data'

export async function fetchTriumphs(): Promise<Triumph[]> {
  const res = await fetch('/api/triumphs')
  if (!res.ok) throw new Error(`fetchTriumphs: ${res.status}`)
  return res.json()
}

export async function fetchProgress(): Promise<Record<Player, string[]>> {
  const res = await fetch('/api/progress')
  if (!res.ok) throw new Error(`fetchProgress: ${res.status}`)
  return res.json()
}
