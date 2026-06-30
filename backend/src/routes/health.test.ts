import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import express from 'express'
import type { Express } from 'express'
import mongoose from 'mongoose'

import healthRouter from './health.js'

function buildApp(): Express {
  const app = express()
  app.use('/api/health', healthRouter)
  return app
}

async function startServer(app: Express) {
  const { default: http } = await import('http')
  const server = http.createServer(app)
  await new Promise<void>(r => server.listen(0, r))
  const port = (server.address() as { port: number }).port
  return { port, close: () => new Promise<void>(r => server.close(() => r())) }
}

describe('GET /api/health', () => {
  const originalEnv = process.env.MONGODB_URL

  beforeEach(() => {
    delete process.env.MONGODB_URL
  })

  afterEach(() => {
    if (originalEnv) process.env.MONGODB_URL = originalEnv
    else delete process.env.MONGODB_URL
  })

  it('returns 200 with status ok when no MongoDB expected', async () => {
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/health`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('ok')
    expect(json.version).toBeDefined()
    expect(json.uptime).toBeGreaterThanOrEqual(0)
    expect(json.mongo).toBe('disconnected')
    await close()
  })

  it('returns 503 when MongoDB is expected but disconnected', async () => {
    process.env.MONGODB_URL = 'mongodb://fake'
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0)
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/health`)
    expect(res.status).toBe(503)
    const json = await res.json()
    expect(json.status).toBe('degraded')
    expect(json.mongo).toBe('disconnected')
    await close()
    vi.restoreAllMocks()
  })

  it('returns 200 when MongoDB is expected and connected', async () => {
    process.env.MONGODB_URL = 'mongodb://fake'
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1)
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/health`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('ok')
    expect(json.mongo).toBe('connected')
    await close()
    vi.restoreAllMocks()
  })

  it('reports connecting state', async () => {
    process.env.MONGODB_URL = 'mongodb://fake'
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(2)
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/health`)
    expect(res.status).toBe(503)
    const json = await res.json()
    expect(json.status).toBe('degraded')
    expect(json.mongo).toBe('connecting')
    await close()
    vi.restoreAllMocks()
  })
})
