import { Router } from 'express'
import type { Request, Response } from 'express'
import { getAllAnnotations, setPlayerAnnotations } from '../services/cache.js'

const router = Router()

// In-memory fallback when MongoDB is unavailable
const memStore: Record<string, { prio: Record<string, number>; flags: Record<string, string> }> = {}
const hasMongo = () => !!process.env.MONGODB_URL

router.get('/', async (_req: Request, res: Response) => {
  try {
    const data = hasMongo() ? await getAllAnnotations() : memStore
    res.json(data)
  } catch (err) {
    console.error('[annotations] GET error:', (err as Error).message)
    res.status(500).json({ error: 'Failed to load annotations' })
  }
})

router.put('/:player', async (req: Request<{ player: string }>, res: Response) => {
  const { player } = req.params
  const { prio = {}, flags = {} } = req.body as {
    prio?: Record<string, number>
    flags?: Record<string, string>
  }

  try {
    if (hasMongo()) {
      await setPlayerAnnotations(player, prio, flags)
    } else {
      memStore[player] = { prio, flags }
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('[annotations] PUT error:', (err as Error).message)
    res.status(500).json({ error: 'Failed to save annotations' })
  }
})

export default router
