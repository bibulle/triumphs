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

  type RecordObj = { progress: number; completionValue: number; complete?: boolean }
  type RecordEntry = {
    state: number
    objectives?: RecordObj[]
    intervalObjectives?: RecordObj[]
  }
  const json = await res.json() as {
    Response: {
      profileRecords?: { data?: { records?: Record<string, RecordEntry> } }
      characterRecords?: { data?: Record<string, { records?: Record<string, RecordEntry> }> }
    }
  }

  const progress: PlayerProgress = {}
  const profileStates: Record<string, number> = {}

  const debugHashes = new Set([
    '3241995275', // Voie de la Puissance
    ...(process.env.DEBUG_RECORD_HASHES ?? '').split(',').filter(Boolean),
  ])

  const mergeRecord = (hash: string, rec: RecordEntry, source: 'profile' | 'character') => {
    const mapObjs = (arr?: RecordObj[]) =>
      (arr ?? []).map(o => ({
        current: o.complete ? o.completionValue : (o.progress ?? 0),
        completionValue: o.completionValue,
      }))
    const objectives = mapObjs(rec.objectives)
    const intervalObjectives = mapObjs(rec.intervalObjectives)
    const allObjComplete = objectives.length > 0 && objectives.every(o => o.current >= o.completionValue)
    const allIntervalComplete = intervalObjectives.length > 0 && intervalObjectives.every(o => o.current >= o.completionValue)
    // bit 2 (4) = ObjectiveNotCompleted, bit 0 (1) = RecordRedeemed (reward claimed = triumph done)
    const completed = (rec.state & 4) === 0 || (rec.state & 1) !== 0 || allObjComplete || allIntervalComplete

    if (debugHashes.has(hash)) {
      console.log(`[players:debug] hash=${hash} source=${source} state=${rec.state} (binary:${rec.state.toString(2)}) completed=${completed} objectives=${JSON.stringify(rec.objectives ?? [])}`)
    }

    if (source === 'profile') {
      profileStates[hash] = rec.state
      if (completed && rec.state === 0 && objectives.length === 0) {
        console.log(`[players:debug] ${player.name} profile state=0, no objectives → completed=true: hash=${hash}`)
      }
    } else {
      const prev = progress[hash]
      if (completed && prev && !prev.completed && hash in profileStates) {
        console.log(`[players:debug] ${player.name} character PROMOTES hash=${hash} profile_state=${profileStates[hash]} char_state=${rec.state} char_completed=${completed}`)
      }
    }

    if (!progress[hash] || completed) {
      progress[hash] = { completed, objectives }
    }
  }

  for (const [hash, rec] of Object.entries(json.Response.profileRecords?.data?.records ?? {})) {
    mergeRecord(hash, rec, 'profile')
  }
  for (const charData of Object.values(json.Response.characterRecords?.data ?? {})) {
    for (const [hash, rec] of Object.entries(charData.records ?? {})) {
      mergeRecord(hash, rec, 'character')
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
