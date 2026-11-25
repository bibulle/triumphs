import { fetchWithRetry } from './fetchRetry.js'
import { getCachedCatalog, setCachedCatalog } from './cache.js'

const BASE_URL = 'https://www.bungie.net'
const LANGS = ['en', 'fr', 'pt-br'] as const
type Lang = typeof LANGS[number]

// Bump when the RecordDetail shape changes
const DETAIL_CACHE_PREFIX = 'record_detail_v1:'

export interface ObjectiveDetail {
  hash: number
  descEn: string
  descFr: string
  descPt?: string
  completionValue: number
  /** DestinyUnlockValueUIStyle of the in-progress value (2 = checkbox, 3 = percentage…) */
  valueStyle?: number
  /** For interval objectives: score granted when the step is reached */
  scoreValue?: number
}

export interface RewardDetail {
  hash: number
  nameEn: string
  nameFr: string
  namePt?: string
  icon?: string
  quantity: number
}

export interface RecordDetail {
  id: string
  objectives: ObjectiveDetail[]
  intervals: ObjectiveDetail[]
  rewards: RewardDetail[]
}

interface DisplayProperties { name?: string; description?: string; icon?: string }

interface RecordDef {
  objectiveHashes?: number[]
  intervalInfo?: { intervalObjectives?: Array<{ intervalObjectiveHash: number; intervalScoreValue?: number }> }
  rewardItems?: Array<{ itemHash: number; quantity?: number }>
}

interface ObjectiveDef {
  progressDescription?: string
  displayProperties?: DisplayProperties
  completionValue?: number
  inProgressValueStyle?: number
}

interface ItemDef { displayProperties?: DisplayProperties }

// In-process memo (avoids hitting Mongo/Bungie twice for the same record)
const MEMO_TTL_MS = 24 * 60 * 60 * 1000
const memo = new Map<string, { detail: RecordDetail; at: number }>()
const inflight = new Map<string, Promise<RecordDetail>>()

async function getEntity<T>(type: string, hash: number, lang: Lang): Promise<T | null> {
  const url = `${BASE_URL}/Platform/Destiny2/Manifest/${type}/${hash >>> 0}/?lc=${lang}`
  const res = await fetchWithRetry(url, { headers: { 'X-API-Key': process.env.BUNGIE_API_KEY! } })
  if (!res.ok) {
    console.warn(`[recordDetail] ${type} ${hash} (${lang}) → ${res.status}`)
    return null
  }
  const json = await res.json() as { Response?: T }
  return json.Response ?? null
}

async function getEntityAllLangs<T>(type: string, hash: number): Promise<Record<Lang, T | null>> {
  const [en, fr, pt] = await Promise.all(LANGS.map(l => getEntity<T>(type, hash, l)))
  return { en, fr, 'pt-br': pt }
}

function objectiveText(o: ObjectiveDef | null): string | undefined {
  if (!o) return undefined
  return o.progressDescription || o.displayProperties?.name || o.displayProperties?.description || undefined
}

async function buildObjective(hash: number, scoreValue?: number): Promise<ObjectiveDetail> {
  const defs = await getEntityAllLangs<ObjectiveDef>('DestinyObjectiveDefinition', hash)
  const base = defs.en ?? defs.fr ?? defs['pt-br']
  const descEn = objectiveText(defs.en) ?? ''
  return {
    hash,
    descEn,
    descFr: objectiveText(defs.fr) ?? descEn,
    descPt: objectiveText(defs['pt-br']),
    completionValue: base?.completionValue ?? 1,
    ...(base?.inProgressValueStyle !== undefined ? { valueStyle: base.inProgressValueStyle } : {}),
    ...(scoreValue !== undefined ? { scoreValue } : {}),
  }
}

async function buildReward(hash: number, quantity: number): Promise<RewardDetail | null> {
  const defs = await getEntityAllLangs<ItemDef>('DestinyInventoryItemDefinition', hash)
  const nameEn = defs.en?.displayProperties?.name
  if (!nameEn) return null
  return {
    hash,
    nameEn,
    nameFr: defs.fr?.displayProperties?.name || nameEn,
    namePt: defs['pt-br']?.displayProperties?.name || undefined,
    icon: defs.en?.displayProperties?.icon || undefined,
    quantity,
  }
}

async function fetchFromBungie(id: string): Promise<RecordDetail> {
  const record = await getEntity<RecordDef>('DestinyRecordDefinition', Number(id), 'en')
  if (!record) return { id, objectives: [], intervals: [], rewards: [] }

  const [objectives, intervals, rewards] = await Promise.all([
    Promise.all((record.objectiveHashes ?? []).map(h => buildObjective(h))),
    Promise.all((record.intervalInfo?.intervalObjectives ?? []).map(i => buildObjective(i.intervalObjectiveHash, i.intervalScoreValue))),
    Promise.all((record.rewardItems ?? []).map(r => buildReward(r.itemHash, r.quantity ?? 1))),
  ])

  return { id, objectives, intervals, rewards: rewards.filter((r): r is RewardDetail => r !== null) }
}

/**
 * Returns objective labels and rewards for a record, fetched lazily from the
 * Bungie manifest entity endpoint and cached (memory + MongoDB, 24 h TTL).
 * Returns null when the Bungie API is not configured.
 */
export async function getRecordDetail(id: string): Promise<RecordDetail | null> {
  if (!process.env.BUNGIE_API_KEY) return null

  const hit = memo.get(id)
  if (hit && Date.now() - hit.at < MEMO_TTL_MS) return hit.detail

  const pending = inflight.get(id)
  if (pending) return pending

  const promise = (async () => {
    const key = DETAIL_CACHE_PREFIX + id
    if (process.env.MONGODB_URL) {
      const cached = await getCachedCatalog<RecordDetail>(key).catch(() => null)
      if (cached) {
        memo.set(id, { detail: cached, at: Date.now() })
        return cached
      }
    }
    const detail = await fetchFromBungie(id)
    memo.set(id, { detail, at: Date.now() })
    if (process.env.MONGODB_URL) {
      await setCachedCatalog(key, detail).catch(e =>
        console.warn('[recordDetail] cache write failed:', (e as Error).message))
    }
    return detail
  })()

  inflight.set(id, promise)
  try {
    return await promise
  } finally {
    inflight.delete(id)
  }
}

/** Test helper */
export function clearRecordDetailMemo(): void {
  memo.clear()
  inflight.clear()
}
