import type { PlayerProgress } from '../data/mock.js'

const BASE_URL = 'https://www.bungie.net'

export interface PlayerConfig {
  name: string
  tag: string
}

export interface ResolvedPlayer extends PlayerConfig {
  membershipType: number
  membershipId: string
}

export function parsePlayersEnv(): PlayerConfig[] {
  const raw = process.env.PLAYERS
  if (!raw?.trim()) return []
  return raw.split(',').flatMap(entry => {
    const colon = entry.indexOf(':')
    if (colon < 0) return []
    const name = entry.slice(0, colon).trim()
    const tag = entry.slice(colon + 1).trim()
    if (!name || !tag) return []
    return [{ name, tag }]
  })
}

export async function resolvePlayer(config: PlayerConfig): Promise<ResolvedPlayer> {
  const hash = config.tag.lastIndexOf('#')
  if (hash < 0) throw new Error(`Invalid tag format (expected Name#Code): ${config.tag}`)
  const displayName = config.tag.slice(0, hash)
  const displayNameCode = parseInt(config.tag.slice(hash + 1), 10)

  const res = await fetch(`${BASE_URL}/Platform/Destiny2/SearchDestinyPlayerByBungieName/-1/`, {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.BUNGIE_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ displayName, displayNameCode }),
  })
  if (!res.ok) throw new Error(`SearchDestinyPlayerByBungieName: ${res.status} for ${config.tag}`)
  const json = await res.json() as {
    Response: Array<{
      membershipType: number
      membershipId: string
      crossSaveOverride?: number
    }>
  }
  const results = json.Response
  if (!results?.length) throw new Error(`Player not found: ${config.tag}`)

  const primary =
    results.find(r => r.crossSaveOverride && r.membershipType === r.crossSaveOverride)
    ?? results[0]

  console.log(`[players] resolved ${config.tag} → membershipType=${primary.membershipType} id=${primary.membershipId}`)
  return { ...config, membershipType: primary.membershipType, membershipId: primary.membershipId }
}

export async function fetchPlayerProgress(player: ResolvedPlayer): Promise<PlayerProgress> {
  const res = await fetch(
    `${BASE_URL}/Platform/Destiny2/${player.membershipType}/Profile/${player.membershipId}/?components=900`,
    { headers: { 'X-API-Key': process.env.BUNGIE_API_KEY! } }
  )
  if (!res.ok) throw new Error(`Profile fetch for ${player.name}: ${res.status}`)

  const json = await res.json() as {
    Response: {
      profileRecords?: {
        data?: {
          records?: Record<string, {
            state: number
            objectives?: Array<{ progress: number; completionValue: number }>
          }>
        }
      }
      characterRecords?: {
        data?: Record<string, {
          records?: Record<string, {
            state: number
            objectives?: Array<{ progress: number; completionValue: number }>
          }>
        }>
      }
    }
  }

  const progress: PlayerProgress = {}

  const mergeRecord = (hash: string, rec: {
    state: number
    objectives?: Array<{ progress: number; completionValue: number; complete?: boolean }>
  }) => {
    const objectives = (rec.objectives ?? []).map(o => ({
      current: o.complete ? o.completionValue : (o.progress ?? 0),
      completionValue: o.completionValue,
    }))
    const allObjComplete = objectives.length > 0 && objectives.every(o => o.current >= o.completionValue)
    const completed = (rec.state & 4) === 0 || allObjComplete
    if (!progress[hash] || completed) {
      progress[hash] = { completed, objectives }
    }
  }

  for (const [hash, rec] of Object.entries(json.Response.profileRecords?.data?.records ?? {})) {
    mergeRecord(hash, rec)
  }
  for (const charData of Object.values(json.Response.characterRecords?.data ?? {})) {
    for (const [hash, rec] of Object.entries(charData.records ?? {})) {
      mergeRecord(hash, rec)
    }
  }

  const completedCount = Object.values(progress).filter(r => r.completed).length
  console.log(`[players] ${player.name}: ${completedCount} completed records, ${Object.keys(progress).length} total tracked`)
  return progress
}

// Backward-compat: list of completed record IDs only
export async function fetchPlayerCompletedRecords(player: ResolvedPlayer): Promise<string[]> {
  const progress = await fetchPlayerProgress(player)
  return Object.entries(progress).filter(([, r]) => r.completed).map(([id]) => id)
}
