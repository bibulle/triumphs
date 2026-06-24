import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import type { Express } from 'express'

vi.mock('../services/cache.js', () => ({
  getCachedProgress: vi.fn().mockResolvedValue(null),
  setCachedProgress: vi.fn().mockResolvedValue(undefined),
}))

import progressRouter from './progress.js'
import { PLAYERS, getMockProgress } from '../data/mock.js'
import * as cache from '../services/cache.js'

function buildApp(): Express {
  const app = express()
  app.use('/api/progress', progressRouter)
  return app
}

async function startServer(app: Express): Promise<{ port: number; close: () => Promise<void> }> {
  const { default: http } = await import('http')
  const server = http.createServer(app)
  await new Promise<void>(r => server.listen(0, r))
  const port = (server.address() as { port: number }).port
  return { port, close: () => new Promise<void>(r => server.close(() => r())) }
}

describe('GET /api/progress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.MONGODB_URL
  })

  it('returns progress for all players', async () => {
    const app = buildApp()
    const { port, close } = await startServer(app)

    const response = await fetch(`http://localhost:${port}/api/progress`)
    const body = await response.json()

    expect(response.status).toBe(200)
    PLAYERS.forEach(p => {
      expect(body[p]).toBeDefined()
      expect(Array.isArray(body[p])).toBe(true)
    })

    await close()
  })

  it('returns cached progress when MONGODB_URL is set and cache hits', async () => {
    process.env.MONGODB_URL = 'mongodb://fake'
    const fakeProgress = { Bibullus: ['t-1'], Vincent: [], Guiz: [] }
    vi.mocked(cache.getCachedProgress).mockResolvedValueOnce(fakeProgress)

    const app = buildApp()
    const { port, close } = await startServer(app)

    const response = await fetch(`http://localhost:${port}/api/progress`)
    const body = await response.json()

    expect(body).toEqual(fakeProgress)
    expect(cache.getCachedProgress).toHaveBeenCalledWith('progress')

    await close()
  })

  it('falls back to mock data on cache miss', async () => {
    process.env.MONGODB_URL = 'mongodb://fake'
    vi.mocked(cache.getCachedProgress).mockResolvedValueOnce(null)

    const app = buildApp()
    const { port, close } = await startServer(app)

    const response = await fetch(`http://localhost:${port}/api/progress`)
    const body = await response.json()

    const expected = getMockProgress()
    PLAYERS.forEach(p => {
      expect(body[p]).toEqual(expected[p])
    })
    expect(cache.setCachedProgress).toHaveBeenCalledWith('progress', expected)

    await close()
  })
})
