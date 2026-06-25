import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import type { Express } from 'express'

vi.mock('../services/cache.js', () => ({
  getCachedCatalog: vi.fn().mockResolvedValue(null),
  setCachedCatalog: vi.fn().mockResolvedValue(undefined),
  getManifestCheck: vi.fn().mockResolvedValue(false),
  setManifestCheck: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../services/bungie.js', () => ({
  fetchManifestVersion: vi.fn().mockResolvedValue('1.0.0'),
  fetchTriumphCatalog: vi.fn().mockResolvedValue({ version: '1.0.0', triumphs: [] }),
}))

import triumphsRouter from './triumphs.js'
import { TRIUMPHS } from '../data/mock.js'
import * as cache from '../services/cache.js'
import * as bungie from '../services/bungie.js'

function buildApp(): Express {
  const app = express()
  app.use('/api/triumphs', triumphsRouter)
  return app
}

async function startServer(app: Express) {
  const { default: http } = await import('http')
  const server = http.createServer(app)
  await new Promise<void>(r => server.listen(0, r))
  const port = (server.address() as { port: number }).port
  return { port, close: () => new Promise<void>(r => server.close(() => r())) }
}

describe('GET /api/triumphs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.MONGODB_URL
    delete process.env.BUNGIE_API_KEY
  })

  it('returns mock triumphs when no API key or MongoDB', async () => {
    const app = buildApp()
    const { port, close } = await startServer(app)
    const response = await fetch(`http://localhost:${port}/api/triumphs`)
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(TRIUMPHS.length)
    expect(body[0]).toHaveProperty('catFr')
    expect(body[0]).toHaveProperty('subFr')
    await close()
  })

  it('serves from 30-min window cache when window is valid', async () => {
    process.env.BUNGIE_API_KEY = 'key'
    process.env.MONGODB_URL = 'mongodb://fake'
    const cachedTriumphs = [{ id: 'cached-1', en: 'Cached', fr: 'Caché' }]
    vi.mocked(cache.getManifestCheck).mockResolvedValueOnce(true)
    vi.mocked(cache.getCachedCatalog).mockResolvedValueOnce({ version: '1.0.0', triumphs: cachedTriumphs })

    const app = buildApp()
    const { port, close } = await startServer(app)
    const response = await fetch(`http://localhost:${port}/api/triumphs`)
    const body = await response.json()

    expect(body).toEqual(cachedTriumphs)
    expect(bungie.fetchManifestVersion).not.toHaveBeenCalled()
    await close()
  })

  it('renews window without re-fetching when manifest version unchanged', async () => {
    process.env.BUNGIE_API_KEY = 'key'
    process.env.MONGODB_URL = 'mongodb://fake'
    const cachedTriumphs = [{ id: 't1', en: 'A', fr: 'B' }]
    vi.mocked(cache.getManifestCheck).mockResolvedValueOnce(false)
    vi.mocked(bungie.fetchManifestVersion).mockResolvedValueOnce('1.0.0')
    vi.mocked(cache.getCachedCatalog).mockResolvedValueOnce({ version: '1.0.0', triumphs: cachedTriumphs })

    const app = buildApp()
    const { port, close } = await startServer(app)
    await fetch(`http://localhost:${port}/api/triumphs`)

    expect(bungie.fetchManifestVersion).toHaveBeenCalledOnce()
    expect(bungie.fetchTriumphCatalog).not.toHaveBeenCalled()
    expect(cache.setManifestCheck).toHaveBeenCalledOnce()
    await close()
  })

  it('re-fetches full catalog when manifest version changed', async () => {
    process.env.BUNGIE_API_KEY = 'key'
    process.env.MONGODB_URL = 'mongodb://fake'
    const newTriumphs = [{ id: 't-new', en: 'New', fr: 'Nouveau', catFr: 'M', subFr: 'P' }]
    vi.mocked(cache.getManifestCheck).mockResolvedValueOnce(false)
    vi.mocked(bungie.fetchManifestVersion).mockResolvedValueOnce('2.0.0')
    vi.mocked(cache.getCachedCatalog).mockResolvedValueOnce({ version: '1.0.0', triumphs: [] })
    vi.mocked(bungie.fetchTriumphCatalog).mockResolvedValueOnce({ version: '2.0.0', triumphs: newTriumphs })

    const app = buildApp()
    const { port, close } = await startServer(app)
    const response = await fetch(`http://localhost:${port}/api/triumphs`)
    const body = await response.json()

    expect(bungie.fetchTriumphCatalog).toHaveBeenCalledOnce()
    expect(body).toEqual(newTriumphs)
    await close()
  })

  it('falls back to cached data when Bungie API throws', async () => {
    process.env.BUNGIE_API_KEY = 'key'
    process.env.MONGODB_URL = 'mongodb://fake'
    const staleTriumphs = [{ id: 'stale', en: 'S', fr: 'S' }]
    vi.mocked(cache.getManifestCheck).mockResolvedValueOnce(false)
    vi.mocked(bungie.fetchManifestVersion).mockRejectedValueOnce(new Error('network'))
    vi.mocked(cache.getCachedCatalog).mockResolvedValueOnce({ version: '1.0.0', triumphs: staleTriumphs })

    const app = buildApp()
    const { port, close } = await startServer(app)
    const response = await fetch(`http://localhost:${port}/api/triumphs`)
    const body = await response.json()

    expect(body).toEqual(staleTriumphs)
    await close()
  })
})
