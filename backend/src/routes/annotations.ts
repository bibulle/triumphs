import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { getAllAnnotations, setPlayerAnnotations } from '../services/cache.js'

const annotationBody = z.object({
  prio: z.record(z.string(), z.number().int().min(0).max(3)).default({}),
  flags: z.record(z.string(), z.enum(['need', 'solo', 'abandon'])).default({}),
})

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
  const parsed = annotationBody.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid annotations', details: parsed.error.issues })
    return
  }
  const { prio, flags } = parsed.data

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
