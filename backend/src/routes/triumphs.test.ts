import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import type { Express } from 'express'

// Mock cache service before importing router
vi.mock('../services/cache.js', () => ({
  getCachedCatalog: vi.fn().mockResolvedValue(null),
  setCachedCatalog: vi.fn().mockResolvedValue(undefined),
}))

import triumphsRouter from './triumphs.js'
import { TRIUMPHS } from '../data/mock.js'
import * as cache from '../services/cache.js'

function buildApp(): Express {
  const app = express()
  app.use('/api/triumphs', triumphsRouter)
  return app
}

describe('GET /api/triumphs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.MONGODB_URL
  })

  it('returns the full triumphs array', async () => {
    const app = buildApp()
    const res = await fetch(`http://localhost:0/api/triumphs`, { method: 'GET' })
      .catch(() => null)

    // Use supertest-style manual request via node http
    const { default: http } = await import('http')
    const server = http.createServer(app)
    await new Promise<void>(r => server.listen(0, r))
    const port = (server.address() as { port: number }).port

    const response = await fetch(`http://localhost:${port}/api/triumphs`)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(TRIUMPHS.length)
    expect(body[0]).toHaveProperty('id')
    expect(body[0]).toHaveProperty('en')
    expect(body[0]).toHaveProperty('fr')

    await new Promise<void>(r => server.close(() => r()))
  })

  it('returns cached data when MONGODB_URL is set and cache hits', async () => {
    process.env.MONGODB_URL = 'mongodb://fake'
    const fakeData = [{ id: 'cached-1', en: 'Cached', fr: 'Caché' }]
    vi.mocked(cache.getCachedCatalog).mockResolvedValueOnce(fakeData)

    const app = buildApp()
    const { default: http } = await import('http')
    const server = http.createServer(app)
    await new Promise<void>(r => server.listen(0, r))
    const port = (server.address() as { port: number }).port

    const response = await fetch(`http://localhost:${port}/api/triumphs`)
    const body = await response.json()

    expect(body).toEqual(fakeData)
    expect(cache.getCachedCatalog).toHaveBeenCalledWith('triumphs')

    await new Promise<void>(r => server.close(() => r()))
  })

  it('falls back to mock data on cache miss', async () => {
    process.env.MONGODB_URL = 'mongodb://fake'
    vi.mocked(cache.getCachedCatalog).mockResolvedValueOnce(null)

    const app = buildApp()
    const { default: http } = await import('http')
    const server = http.createServer(app)
    await new Promise<void>(r => server.listen(0, r))
    const port = (server.address() as { port: number }).port

    const response = await fetch(`http://localhost:${port}/api/triumphs`)
    const body = await response.json()

    expect(body).toHaveLength(TRIUMPHS.length)
    expect(cache.setCachedCatalog).toHaveBeenCalledWith('triumphs', TRIUMPHS)

    await new Promise<void>(r => server.close(() => r()))
  })
})
