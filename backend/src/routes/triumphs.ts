import { Router, Request, Response } from 'express'
import { TRIUMPHS } from '../data/mock.js'
import { getCachedCatalog, setCachedCatalog, getManifestCheck, setManifestCheck } from '../services/cache.js'
import { fetchManifestVersion, fetchTriumphCatalog } from '../services/bungie.js'
import type { Triumph, NodeMeta } from '../data/mock.js'

const router = Router()

// Bump this when the cached data structure changes (forces a clean fetch on next startup)
const CACHE_SCHEMA_VERSION = 1
const CATALOG_KEY = `triumphs_v${CACHE_SCHEMA_VERSION}`
const MANIFEST_CHECK_KEY = `last_check_v${CACHE_SCHEMA_VERSION}`

export type CatalogCache = { version: string; triumphs: Triumph[]; nodes: NodeMeta[] }

export function validCache(cached: unknown): cached is CatalogCache {
  return !!cached && typeof cached === 'object' && Array.isArray((cached as CatalogCache).triumphs)
}

function log(msg: string) {
  console.log(`[triumphs] ${msg}`)
}

async function refreshCatalogInBackground(): Promise<void> {
  try {
    const latestVersion = await fetchManifestVersion()
    const cached = await getCachedCatalog<unknown>(CATALOG_KEY)
    if (validCache(cached) && cached.version === latestVersion) {
      log(`background: version unchanged (${latestVersion}), renewing window`)
      await setManifestCheck(MANIFEST_CHECK_KEY)
      return
    }
    log('background: new manifest version detected, fetching catalog…')
    const catalog = await fetchTriumphCatalog()
    await setCachedCatalog(CATALOG_KEY, { ...catalog })
    await setManifestCheck(MANIFEST_CHECK_KEY)
    log(`background: catalog updated — ${catalog.triumphs.length} triumphs (version ${catalog.version})`)
  } catch (err) {
    console.error('[triumphs] background refresh error:', (err as Error).message)
  }
}

async function getOrFetchCatalog(): Promise<CatalogCache | null> {
  const apiKey = process.env.BUNGIE_API_KEY
  const hasDb = !!process.env.MONGODB_URL

  if (apiKey && hasDb) {
    const windowValid = await getManifestCheck(MANIFEST_CHECK_KEY)
    if (!windowValid) {
      // stale-while-revalidate: serve cache immediately, refresh in background
      refreshCatalogInBackground()
    }
    const cached = await getCachedCatalog<unknown>(CATALOG_KEY)
    if (validCache(cached)) return cached

    // No cache at all (first boot without warmup) — must wait
    const catalog = await fetchTriumphCatalog()
    const toStore: CatalogCache = { ...catalog }
    await setCachedCatalog(CATALOG_KEY, toStore)
    await setManifestCheck(MANIFEST_CHECK_KEY)
    return toStore
  }

  if (hasDb) {
    const cached = await getCachedCatalog<unknown>(CATALOG_KEY)
    if (validCache(cached)) return cached
  }

  return null
}

router.get('/', async (_req: Request, res: Response) => {
  const apiKey = process.env.BUNGIE_API_KEY
  const hasDb = !!process.env.MONGODB_URL

  log(`request received — apiKey=${apiKey ? 'set' : 'NOT SET'}, hasDb=${hasDb}`)

  try {
    const catalog = await getOrFetchCatalog()
    if (catalog) {
      log(`serving ${catalog.triumphs.length} triumphs`)
      res.json(catalog.triumphs)
      return
    }
  } catch (err) {
    console.error('[triumphs] error:', (err as Error).message)
    const cached = await getCachedCatalog<unknown>(CATALOG_KEY).catch(() => null)
    if (validCache(cached)) {
      log(`falling back to stale cache — ${cached.triumphs.length} triumphs`)
      res.json(cached.triumphs)
      return
    }
  }

  log(`serving ${TRIUMPHS.length} triumphs from static mock`)
  const mockCatalog: CatalogCache = { version: 'mock', triumphs: TRIUMPHS, nodes: [] }
  await setCachedCatalog(CATALOG_KEY, mockCatalog).catch((e) =>
    console.warn('[triumphs] Failed to store mock in cache:', (e as Error).message)
  )
  res.json(TRIUMPHS)
})

export { CATALOG_KEY, MANIFEST_CHECK_KEY }
export default router
