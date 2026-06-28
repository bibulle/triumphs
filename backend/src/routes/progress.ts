import { Router, Request, Response } from 'express'
import { getMockProgress } from '../data/mock.js'
import type { PlayerProgress } from '../data/mock.js'
import { getCachedProgress, setCachedProgress, deleteCachedProgress } from '../services/cache.js'
import { parsePlayersEnv, resolvePlayer, fetchPlayerProgress } from '../services/players.js'
import { recordSnapshots } from '../services/snapshots.js'
import { TRIUMPHS } from '../data/mock.js'
import { getCachedCatalog } from '../services/cache.js'
import { validCache, CATALOG_KEY } from './triumphs.js'

const router = Router()
const PROGRESS_KEY = 'progress'

router.get('/', async (req: Request, res: Response) => {
  try {
    const force = req.query.force === 'true'
    if (process.env.MONGODB_URL) {
      if (force) {
        await deleteCachedProgress(PROGRESS_KEY).catch(() => {})
      } else {
        const cached = await getCachedProgress(PROGRESS_KEY)
        if (cached) {
          const sample = Object.values(cached).flatMap(p => Object.values(p as Record<string, unknown>)).find(Boolean) as Record<string, unknown> | undefined
          if (sample && !('redeemed' in sample)) {
            console.log('[redeemed-debug] cached progress lacks "redeemed" field — serving stale cache, do ?force=true to refresh')
          }
          res.json(cached)
          return
        }
      }
    }

    let progress: Record<string, PlayerProgress>

    const players = parsePlayersEnv()
    if (players.length > 0 && process.env.BUNGIE_API_KEY) {
      console.log(`[progress] fetching real progress for ${players.length} players from Bungie`)
      const results = await Promise.allSettled(
        players.map(async p => {
          const resolved = await resolvePlayer(p)
          const playerProgress = await fetchPlayerProgress(resolved)
          return { name: p.name, playerProgress }
        })
      )
      progress = Object.fromEntries(
        results.map((r, i) => {
          if (r.status === 'fulfilled') return [r.value.name, r.value.playerProgress]
          console.warn(`[progress] failed for ${players[i].name}:`, (r.reason as Error).message)
          return [players[i].name, {}]
        })
      )
    } else {
      progress = getMockProgress()
    }

    await setCachedProgress(PROGRESS_KEY, progress).catch((e) =>
      console.warn('[progress] Failed to store in cache:', (e as Error).message)
    )
    if (process.env.MONGODB_URL) {
      getCachedCatalog<unknown>(CATALOG_KEY).then(catalogCache => {
        const triumphs = validCache(catalogCache) ? catalogCache.triumphs : TRIUMPHS
        return recordSnapshots(progress, triumphs)
      }).catch((e: Error) =>
        console.warn('[progress] Failed to record snapshots:', e.message)
      )
    }
    res.json(progress)
  } catch (err) {
    console.error('[progress] Unexpected error:', (err as Error).message, (err as Error).stack)
    res.status(500).json({ error: 'Failed to fetch progress' })
  }
})

export default router
