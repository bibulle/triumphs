import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import type { Express } from 'express'
import { PLAYERS as MOCK_PLAYERS, PLAYER_TAG } from '../data/mock.js'

import playersRouter from './players.js'

function buildApp(): Express {
  const app = express()
  app.use('/api/players', playersRouter)
  return app
}

async function startServer(app: Express): Promise<{ port: number; close: () => Promise<void> }> {
  const { default: http } = await import('http')
  const server = http.createServer(app)
  await new Promise<void>(r => server.listen(0, r))
  const port = (server.address() as { port: number }).port
  return { port, close: () => new Promise<void>(r => server.close(() => r())) }
}

describe('GET /api/players', () => {
  beforeEach(() => {
    delete process.env.PLAYERS
  })

  it('returns mock players when PLAYERS env is not set', async () => {
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/players`)
    const body = await res.json() as Array<{ name: string; tag: string }>

    expect(res.status).toBe(200)
    expect(body).toHaveLength(MOCK_PLAYERS.length)
    MOCK_PLAYERS.forEach(name => {
      const entry = body.find(p => p.name === name)
      expect(entry).toBeDefined()
      expect(entry?.tag).toBe(PLAYER_TAG[name as keyof typeof PLAYER_TAG])
    })
    await close()
  })

  it('returns players from PLAYERS env when set', async () => {
    process.env.PLAYERS = 'Alpha:Alpha#1234,Beta:Beta#5678'
    const { port, close } = await startServer(buildApp())
    const res = await fetch(`http://localhost:${port}/api/players`)
    const body = await res.json() as Array<{ name: string; tag: string }>

    expect(res.status).toBe(200)
    expect(body).toHaveLength(2)
    expect(body[0]).toEqual({ name: 'Alpha', tag: 'Alpha#1234' })
    expect(body[1]).toEqual({ name: 'Beta', tag: 'Beta#5678' })
    await close()
  })
})
