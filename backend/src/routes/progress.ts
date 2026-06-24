import { Router, Request, Response } from 'express'
import { getMockProgress } from '../data/mock.js'
import { getCachedProgress, setCachedProgress } from '../services/cache.js'

const router = Router()
const PROGRESS_KEY = 'progress'

router.get('/', async (_req: Request, res: Response) => {
  if (process.env.MONGODB_URL) {
    const cached = await getCachedProgress(PROGRESS_KEY)
    if (cached) {
      res.json(cached)
      return
    }
  }

  const progress = getMockProgress()
  await setCachedProgress(PROGRESS_KEY, progress).catch(() => {/* mongo unavailable */})
  res.json(progress)
})

export default router
