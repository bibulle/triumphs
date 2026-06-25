import { Router, Request, Response } from 'express'
import { getMockProgress } from '../data/mock.js'
import { getCachedProgress, setCachedProgress } from '../services/cache.js'

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

    const progress = getMockProgress()
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
