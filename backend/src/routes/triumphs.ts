import { Router, Request, Response } from 'express'
import { TRIUMPHS } from '../data/mock.js'
import { getCachedCatalog, setCachedCatalog } from '../services/cache.js'

const router = Router()
const CATALOG_KEY = 'triumphs'

router.get('/', async (_req: Request, res: Response) => {
  if (process.env.MONGODB_URL) {
    const cached = await getCachedCatalog(CATALOG_KEY)
    if (cached) {
      res.json(cached)
      return
    }
  }

  await setCachedCatalog(CATALOG_KEY, TRIUMPHS).catch(() => {/* mongo unavailable */})
  res.json(TRIUMPHS)
})

export default router
