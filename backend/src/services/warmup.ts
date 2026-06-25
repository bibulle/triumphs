import {
  getCachedCatalog, setCachedCatalog,
  getManifestCheck, setManifestCheck,
  getCachedProgress, setCachedProgress,
  getProgressCacheAge,
} from './cache.js'
import { fetchManifestVersion, fetchTriumphCatalog } from './bungie.js'
import { parsePlayersEnv, resolvePlayer, fetchPlayerCompletedRecords } from './players.js'
import { getMockProgress } from '../data/mock.js'
import type { Triumph } from '../data/mock.js'

const CATALOG_KEY = 'triumphs'
const MANIFEST_CHECK_KEY = 'last_check'
const PROGRESS_KEY = 'progress'
const DEV_SKIP_SECONDS = 20

type CatalogCache = { version: string; triumphs: Triumph[] }
function validCache(c: unknown): c is CatalogCache {
  return !!c && typeof c === 'object' && Array.isArray((c as CatalogCache).triumphs)
}

async function warmupCatalog(): Promise<void> {
  if (!process.env.BUNGIE_API_KEY || !process.env.MONGODB_URL) {
    console.log('[warmup] catalog: skipped (no API key or MongoDB)')
    return
  }
  try {
    const windowValid = await getManifestCheck(MANIFEST_CHECK_KEY)
    if (windowValid) {
      const cached = await getCachedCatalog<unknown>(CATALOG_KEY)
      if (validCache(cached)) {
        console.log(`[warmup] catalog: cache valid — ${cached.triumphs.length} triumphs, skipping fetch`)
        return
      }
    }

    const latestVersion = await fetchManifestVersion()
    const cached = await getCachedCatalog<unknown>(CATALOG_KEY)
    if (validCache(cached) && cached.version === latestVersion) {
      console.log(`[warmup] catalog: version unchanged (${latestVersion}), renewing window`)
      await setManifestCheck(MANIFEST_CHECK_KEY)
      return
    }

    console.log('[warmup] catalog: fetching full catalog from Bungie…')
    const { version, triumphs } = await fetchTriumphCatalog()
    await setCachedCatalog(CATALOG_KEY, { version, triumphs } satisfies CatalogCache)
    await setManifestCheck(MANIFEST_CHECK_KEY)
    console.log(`[warmup] catalog: stored ${triumphs.length} triumphs (version ${version})`)
  } catch (err) {
    console.error('[warmup] catalog error:', (err as Error).message)
  }
}

async function warmupProgress(): Promise<void> {
  if (!process.env.MONGODB_URL) {
    console.log('[warmup] progress: skipped (no MongoDB)')
    return
  }

  const ageSeconds = await getProgressCacheAge(PROGRESS_KEY)
  if (ageSeconds !== null && ageSeconds < DEV_SKIP_SECONDS) {
    console.log(`[warmup] progress: cache is ${Math.round(ageSeconds)}s old — skipping (dev restart)`)
    return
  }

  try {
    const players = parsePlayersEnv()
    let progress: Record<string, string[]>

    if (players.length > 0 && process.env.BUNGIE_API_KEY) {
      console.log(`[warmup] progress: fetching real progress for ${players.length} players…`)
      const results = await Promise.allSettled(
        players.map(async p => {
          const resolved = await resolvePlayer(p)
          const ids = await fetchPlayerCompletedRecords(resolved)
          return { name: p.name, ids }
        })
      )
      progress = Object.fromEntries(
        results.map((r, i) => {
          if (r.status === 'fulfilled') return [r.value.name, r.value.ids]
          console.warn(`[warmup] progress: failed for ${players[i].name}:`, (r.reason as Error).message)
          return [players[i].name, []]
        })
      )
    } else {
      console.log('[warmup] progress: using mock data')
      progress = getMockProgress()
    }

    await setCachedProgress(PROGRESS_KEY, progress)
    const counts = Object.entries(progress).map(([n, ids]) => `${n}:${ids.length}`).join(', ')
    console.log(`[warmup] progress: stored (${counts})`)
  } catch (err) {
    console.error('[warmup] progress error:', (err as Error).message)
  }
}

export async function warmup(): Promise<void> {
  console.log('[warmup] starting…')
  await warmupCatalog()
  await warmupProgress()
  console.log('[warmup] done')
}
