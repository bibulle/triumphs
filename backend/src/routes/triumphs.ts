import { Router, Request, Response } from 'express'
import { TRIUMPHS } from '../data/mock.js'
import { getCachedCatalog, setCachedCatalog, getManifestCheck, setManifestCheck } from '../services/cache.js'
import { fetchManifestVersion, fetchTriumphCatalog } from '../services/bungie.js'
import type { Triumph } from '../data/mock.js'

const router = Router()
const CATALOG_KEY = 'triumphs'
const MANIFEST_CHECK_KEY = 'last_check'

type CatalogCache = { version: string; triumphs: Triumph[] }

function validCache(cached: unknown): cached is CatalogCache {
  return !!cached && typeof cached === 'object' && Array.isArray((cached as CatalogCache).triumphs)
}

function log(msg: string) {
  console.log(`[triumphs] ${msg}`)
}

router.get('/', async (_req: Request, res: Response) => {
  const apiKey = process.env.BUNGIE_API_KEY
  const hasDb = !!process.env.MONGODB_URL

  log(`request received — apiKey=${apiKey ? 'set' : 'NOT SET'}, hasDb=${hasDb}`)

  if (apiKey && hasDb) {
    try {
      // Fast path: 30-min window still valid → serve cache as-is
      const windowValid = await getManifestCheck(MANIFEST_CHECK_KEY)
      log(`manifest window valid: ${windowValid}`)

      if (windowValid) {
        const cached = await getCachedCatalog<unknown>(CATALOG_KEY)
        if (validCache(cached)) {
          log(`cache hit (window valid) — serving ${cached.triumphs.length} triumphs`)
          res.json(cached.triumphs)
          return
        }
        log('cache miss despite valid window — falling through to version check')
      }

      // Window expired → lightweight version check
      log('checking manifest version from Bungie…')
      const latestVersion = await fetchManifestVersion()
      log(`latest manifest version: ${latestVersion}`)

      const cached = await getCachedCatalog<unknown>(CATALOG_KEY)

      if (validCache(cached) && cached.version === latestVersion) {
        log(`version unchanged (${latestVersion}) — renewing window, serving ${cached.triumphs.length} triumphs from cache`)
        await setManifestCheck(MANIFEST_CHECK_KEY)
        res.json(cached.triumphs)
        return
      }

      if (validCache(cached)) {
        log(`manifest updated: ${cached.version} → ${latestVersion}, fetching full catalog…`)
      } else {
        log(`no valid cache (got: ${JSON.stringify(cached)?.slice(0, 80)}…), fetching full catalog…`)
      }

      const { version, triumphs } = await fetchTriumphCatalog()
      log(`catalog fetched: ${triumphs.length} triumphs (version ${version})`)
      await setCachedCatalog(CATALOG_KEY, { version, triumphs } satisfies CatalogCache)
      await setManifestCheck(MANIFEST_CHECK_KEY)
      res.json(triumphs)
      return
    } catch (err) {
      console.error('[triumphs] Bungie API error:', (err as Error).message, (err as Error).stack)
      const cached = await getCachedCatalog<unknown>(CATALOG_KEY).catch((e) => {
        console.error('[triumphs] Cache read failed:', (e as Error).message)
        return null
      })
      if (validCache(cached)) {
        log(`falling back to stale cache — serving ${cached.triumphs.length} triumphs`)
        res.json(cached.triumphs)
        return
      }
      log('no valid cache available, falling back to mock data')
    }
  } else if (hasDb) {
    log('no API key — trying MongoDB cache')
    const cached = await getCachedCatalog<unknown>(CATALOG_KEY).catch((e) => {
      console.error('[triumphs] Cache read failed:', (e as Error).message)
      return null
    })
    if (validCache(cached)) {
      log(`serving ${cached.triumphs.length} triumphs from cache`)
      res.json(cached.triumphs)
      return
    }
    log('cache miss — falling back to mock data')
  }

  // Final fallback: static mock data
  log(`serving ${TRIUMPHS.length} triumphs from static mock`)
  await setCachedCatalog(CATALOG_KEY, { version: 'mock', triumphs: TRIUMPHS }).catch((e) =>
    console.warn('[triumphs] Failed to store mock in cache:', (e as Error).message)
  )
  res.json(TRIUMPHS)
})

export default router
