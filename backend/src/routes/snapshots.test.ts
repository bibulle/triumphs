import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import type { Express } from 'express'

vi.mock('../services/snapshots.js', () => ({
  getSnapshots: vi.fn().mockResolvedValue([]),
}))

vi.mock('../data/mock.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/mock.js')>()
  return {
    ...actual,
    getMockSnapshots: vi.fn().mockReturnValue([
      { player: 'Bibullus', date: '2026-01-01', level: 0, nodeKey: 'triumphs', count: 10 },
    ]),
  }
})

import snapshotsRouter from './snapshots.js'
import * as snapshotsService from '../services/snapshots.js'
import * as mock from '../data/mock.js'

function buildApp(): Express {
  const app = express()
  app.use('/api/snapshots', snapshotsRouter)
  return app
}

async function startServer(app: Express) {
  const { default: http } = await import('http')
  const server = http.createServer(app)
  await new Promise<void>(r => server.listen(0, r))
  const port = (server.address() as { port: number }).port
  return { port, close: () => new Promise<void>(r => server.close(() => r())) }
}

describe('GET /api/snapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.MONGODB_URL
  })

  it('returns mock snapshots when MONGODB_URL is not set', async () => {
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/snapshots`)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mock.getMockSnapshots).toHaveBeenCalled()
    expect(snapshotsService.getSnapshots).not.toHaveBeenCalled()
    expect(body).toHaveLength(1)
    expect(body[0].player).toBe('Bibullus')

    await close()
  })

  it('returns MongoDB snapshots when MONGODB_URL is set and data exists', async () => {
    process.env.MONGODB_URL = 'mongodb://fake'
    const mongoData = [
      { player: 'Bibulle', date: '2026-06-01', level: 0, nodeKey: 'triumphs', count: 42 },
    ]
    vi.mocked(snapshotsService.getSnapshots).mockResolvedValueOnce(mongoData)

    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/snapshots`)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(mongoData)
    expect(mock.getMockSnapshots).not.toHaveBeenCalled()

    await close()
  })

  it('falls back to mock when MongoDB is set but returns empty', async () => {
    process.env.MONGODB_URL = 'mongodb://fake'
    vi.mocked(snapshotsService.getSnapshots).mockResolvedValueOnce([])

    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/snapshots`)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mock.getMockSnapshots).toHaveBeenCalled()
    expect(body).toHaveLength(1)

    await close()
  })
})
