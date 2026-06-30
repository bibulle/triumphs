import { Router, Request, Response } from 'express'
import mongoose from 'mongoose'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { version } = require('../../package.json') as { version: string }

const startedAt = new Date()

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const mongoState = mongoose.connection.readyState
  const mongoStatus = mongoState === 1 ? 'connected'
    : mongoState === 2 ? 'connecting'
    : 'disconnected'

  const mongoExpected = !!process.env.MONGODB_URL
  const healthy = !mongoExpected || mongoState === 1

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    version,
    uptime: Math.floor((Date.now() - startedAt.getTime()) / 1000),
    mongo: mongoStatus,
  })
})

export default router
