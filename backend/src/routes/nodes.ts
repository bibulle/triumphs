import { Router, Request, Response } from 'express'
import { getCachedCatalog } from '../services/cache.js'
import { validCache, CATALOG_KEY } from './triumphs.js'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const cached = await getCachedCatalog<unknown>(CATALOG_KEY)
    if (validCache(cached)) {
      res.json(cached.nodes ?? [])
      return
    }
  } catch (err) {
    console.error('[nodes] cache read failed:', (err as Error).message)
  }
  res.json([])
})

export default router
