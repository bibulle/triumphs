import { Router, Request, Response } from 'express'
import { getMockProgress } from '../data/mock.js'
import type { PlayerProgress } from '../data/mock.js'
import { getCachedProgress, setCachedProgress } from '../services/cache.js'
import { parsePlayersEnv, resolvePlayer, fetchPlayerProgress } from '../services/players.js'

const router = Router()
const PROGRESS_KEY = 'progress'

router.get('/', async (_req: Request, res: Response) => {
  try {
    if (process.env.MONGODB_URL) {
      const cached = await getCachedProgress(PROGRESS_KEY)
      if (cached) {
        res.json(cached)
        return
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
      // Convert mock string[] format to PlayerProgress format
      progress = Object.fromEntries(
        Object.entries(getMockProgress()).map(([name, ids]) => [
          name,
          Object.fromEntries(ids.map(id => [id, { completed: true, objectives: [] }])),
        ])
      )
    }

    await setCachedProgress(PROGRESS_KEY, progress).catch((e) =>
      console.warn('[progress] Failed to store in cache:', (e as Error).message)
    )
    res.json(progress)
  } catch (err) {
    console.error('[progress] Unexpected error:', (err as Error).message, (err as Error).stack)
    res.status(500).json({ error: 'Failed to fetch progress' })
  }
})

export default router
