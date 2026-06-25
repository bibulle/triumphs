import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import type { Express } from 'express'

vi.mock('../services/cache.js', () => ({
  getCachedProgress: vi.fn().mockResolvedValue(null),
  setCachedProgress: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../services/players.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/players.js')>()
  return {
    ...actual,
    resolvePlayer: vi.fn(),
    fetchPlayerProgress: vi.fn(),
  }
})

import progressRouter from './progress.js'
import { PLAYERS, getMockProgress } from '../data/mock.js'
import * as cache from '../services/cache.js'
import * as players from '../services/players.js'

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
    delete process.env.BUNGIE_API_KEY
    delete process.env.PLAYERS
  })

  it('returns progress for all players as objects (new format)', async () => {
    const app = buildApp()
    const { port, close } = await startServer(app)

    const response = await fetch(`http://localhost:${port}/api/progress`)
    const body = await response.json()

    expect(response.status).toBe(200)
    PLAYERS.forEach(p => {
      expect(body[p]).toBeDefined()
      expect(typeof body[p]).toBe('object')
      expect(Array.isArray(body[p])).toBe(false)
    })

    await close()
  })

  it('returns cached progress when MONGODB_URL is set and cache hits', async () => {
    process.env.MONGODB_URL = 'mongodb://fake'
    const fakeProgress = {
      Bibullus: { 't-1': { completed: true, objectives: [] } },
      Vincent: {},
      Guiz: {},
    }
    vi.mocked(cache.getCachedProgress).mockResolvedValueOnce(fakeProgress)

    const app = buildApp()
    const { port, close } = await startServer(app)

    const response = await fetch(`http://localhost:${port}/api/progress`)
    const body = await response.json()

    expect(body).toEqual(fakeProgress)
    expect(cache.getCachedProgress).toHaveBeenCalledWith('progress')

    await close()
  })

  it('falls back to mock data on cache miss (converted to new format)', async () => {
    process.env.MONGODB_URL = 'mongodb://fake'
    vi.mocked(cache.getCachedProgress).mockResolvedValueOnce(null)

    const app = buildApp()
    const { port, close } = await startServer(app)

    const response = await fetch(`http://localhost:${port}/api/progress`)
    const body = await response.json()

    const rawMock = getMockProgress()
    PLAYERS.forEach(p => {
      const expectedIds = Object.keys(rawMock[p] ?? {})
      expectedIds.forEach(id => {
        expect(body[p][id]?.completed).toBe(true)
      })
    })

    await close()
  })

  it('fetches real progress from Bungie when PLAYERS and BUNGIE_API_KEY are set', async () => {
    process.env.PLAYERS = 'Alpha:Alpha#1234,Beta:Beta#5678'
    process.env.BUNGIE_API_KEY = 'test-key'

    const alphaProgress = {
      '1001': { completed: true, objectives: [] },
      '1002': { completed: true, objectives: [] },
    }
    const betaProgress = {
      '1001': { completed: true, objectives: [] },
    }

    vi.mocked(players.resolvePlayer)
      .mockResolvedValueOnce({ name: 'Alpha', tag: 'Alpha#1234', membershipType: 3, membershipId: 'mid-alpha' })
      .mockResolvedValueOnce({ name: 'Beta', tag: 'Beta#5678', membershipType: 3, membershipId: 'mid-beta' })
    vi.mocked(players.fetchPlayerProgress)
      .mockResolvedValueOnce(alphaProgress)
      .mockResolvedValueOnce(betaProgress)

    const { port, close } = await startServer(buildApp())
    const response = await fetch(`http://localhost:${port}/api/progress`)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.Alpha).toEqual(alphaProgress)
    expect(body.Beta).toEqual(betaProgress)

    await close()
  })
})
