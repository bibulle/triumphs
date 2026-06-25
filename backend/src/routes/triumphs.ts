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

router.get('/', async (_req: Request, res: Response) => {
  const apiKey = process.env.BUNGIE_API_KEY
  const hasDb = !!process.env.MONGODB_URL

  if (apiKey && hasDb) {
    try {
      // Fast path: 30-min window still valid → serve cache as-is
      const windowValid = await getManifestCheck(MANIFEST_CHECK_KEY)
      if (windowValid) {
        const cached = await getCachedCatalog<unknown>(CATALOG_KEY)
        if (validCache(cached)) {
          res.json(cached.triumphs)
          return
        }
      }

      // Window expired → lightweight version check
      const latestVersion = await fetchManifestVersion()
      const cached = await getCachedCatalog<unknown>(CATALOG_KEY)

      if (validCache(cached) && cached.version === latestVersion) {
        // Catalog still current — just renew the 30-min window
        await setManifestCheck(MANIFEST_CHECK_KEY)
        res.json(cached.triumphs)
        return
      }

      // New manifest version (or cold start) → full re-fetch
      console.log(`Bungie manifest updated (${latestVersion}), fetching catalog…`)
      const { version, triumphs } = await fetchTriumphCatalog()
      await setCachedCatalog(CATALOG_KEY, { version, triumphs } satisfies CatalogCache)
      await setManifestCheck(MANIFEST_CHECK_KEY)
      res.json(triumphs)
      return
    } catch (err) {
      console.warn('Bungie API error, falling back to cache/mock:', (err as Error).message)
      const cached = await getCachedCatalog<unknown>(CATALOG_KEY)
      if (validCache(cached)) {
        res.json(cached.triumphs)
        return
      }
    }
  } else if (hasDb) {
    // MongoDB but no API key → try cache, else mock
    const cached = await getCachedCatalog<unknown>(CATALOG_KEY)
    if (validCache(cached)) {
      res.json(cached.triumphs)
      return
    }
  }

  // Final fallback: static mock data
  await setCachedCatalog(CATALOG_KEY, { version: 'mock', triumphs: TRIUMPHS }).catch(() => {})
  res.json(TRIUMPHS)
})

export default router
