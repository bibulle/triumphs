import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import type { Express } from 'express'

vi.mock('../services/cache.js', () => ({
  getAllAnnotations: vi.fn().mockResolvedValue({}),
  setPlayerAnnotations: vi.fn().mockResolvedValue(undefined),
}))

import annotationsRouter from './annotations.js'
import * as cache from '../services/cache.js'

function buildApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api/annotations', annotationsRouter)
  return app
}

async function startServer(app: Express) {
  const { default: http } = await import('http')
  const server = http.createServer(app)
  await new Promise<void>(r => server.listen(0, r))
  const port = (server.address() as { port: number }).port
  return { port, close: () => new Promise<void>(r => server.close(() => r())) }
}

describe('GET /api/annotations', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns annotations from MongoDB when available', async () => {
    process.env.MONGODB_URL = 'mongodb://fake'
    const mockData = { Alice: { prio: { '1': 2 }, flags: { '2': 'need' } } }
    vi.mocked(cache.getAllAnnotations).mockResolvedValue(mockData)

    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/annotations`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(mockData)
    await close()
    delete process.env.MONGODB_URL
  })

  it('returns empty object when no MongoDB', async () => {
    delete process.env.MONGODB_URL
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/annotations`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({})
    await close()
  })
})

describe('PUT /api/annotations/:player', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.MONGODB_URL
  })

  it('accepts valid annotations', async () => {
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/annotations/Alice`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prio: { '1001': 2 }, flags: { '1002': 'need' } }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    await close()
  })

  it('accepts empty body (defaults to empty prio/flags)', async () => {
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/annotations/Alice`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(200)
    await close()
  })

  it('rejects prio value out of range', async () => {
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/annotations/Alice`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prio: { '1001': 5 } }),
    })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid annotations')
    await close()
  })

  it('rejects negative prio value', async () => {
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/annotations/Alice`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prio: { '1001': -1 } }),
    })
    expect(res.status).toBe(400)
    await close()
  })

  it('rejects non-integer prio value', async () => {
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/annotations/Alice`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prio: { '1001': 1.5 } }),
    })
    expect(res.status).toBe(400)
    await close()
  })

  it('rejects invalid flag value', async () => {
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/annotations/Alice`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flags: { '1001': 'invalid' } }),
    })
    expect(res.status).toBe(400)
    await close()
  })

  it('rejects prio with non-number value', async () => {
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/annotations/Alice`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prio: { '1001': 'high' } }),
    })
    expect(res.status).toBe(400)
    await close()
  })

  it('saves to MongoDB when available', async () => {
    process.env.MONGODB_URL = 'mongodb://fake'
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/annotations/Alice`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prio: { '1001': 1 }, flags: { '1002': 'solo' } }),
    })
    expect(res.status).toBe(200)
    expect(cache.setPlayerAnnotations).toHaveBeenCalledWith('Alice', { '1001': 1 }, { '1002': 'solo' })
    await close()
    delete process.env.MONGODB_URL
  })

  it('returns error details on validation failure', async () => {
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/annotations/Alice`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prio: { '1001': 99 }, flags: { '1002': 'bad' } }),
    })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.details).toBeDefined()
    expect(json.details.length).toBeGreaterThan(0)
    await close()
  })
})
