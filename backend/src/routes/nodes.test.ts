import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import type { Express } from 'express'

vi.mock('../services/cache.js', () => ({
  getCachedCatalog: vi.fn(),
}))

vi.mock('./triumphs.js', () => ({
  validCache: vi.fn((c: unknown) => !!c && typeof c === 'object' && 'nodes' in (c as object)),
  CATALOG_KEY: 'catalog-key',
}))

import nodesRouter from './nodes.js'
import { getCachedCatalog } from '../services/cache.js'

function buildApp(): Express {
  const app = express()
  app.use('/api/nodes', nodesRouter)
  return app
}

async function startServer(app: Express) {
  const { default: http } = await import('http')
  const server = http.createServer(app)
  await new Promise<void>(r => server.listen(0, r))
  const port = (server.address() as { port: number }).port
  return { port, close: () => new Promise<void>(r => server.close(() => r())) }
}

describe('GET /api/nodes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the cached nodes when the catalog cache is valid', async () => {
    vi.mocked(getCachedCatalog).mockResolvedValue({ nodes: [{ hash: 1 }] })
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/nodes`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ hash: 1 }])
    await close()
  })

  it('returns an empty array when the catalog cache has no nodes field', async () => {
    vi.mocked(getCachedCatalog).mockResolvedValue({})
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/nodes`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
    await close()
  })

  it('returns an empty array when nothing is cached', async () => {
    vi.mocked(getCachedCatalog).mockResolvedValue(null)
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/nodes`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
    await close()
  })

  it('returns an empty array when the cache read throws', async () => {
    vi.mocked(getCachedCatalog).mockRejectedValue(new Error('mongo down'))
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/nodes`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
    await close()
  })
})
