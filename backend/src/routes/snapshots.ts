import { Router, Request, Response } from 'express'
import { getSnapshots } from '../services/snapshots.js'
import { getMockSnapshots } from '../data/mock.js'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    if (process.env.MONGODB_URL) {
      const snapshots = await getSnapshots()
      res.json(snapshots.length > 0 ? snapshots : getMockSnapshots())
    } else {
      res.json(getMockSnapshots())
    }
  } catch (err) {
    console.error('[snapshots]', (err as Error).message)
    res.status(500).json({ error: 'Failed to fetch snapshots' })
  }
})

export default router
