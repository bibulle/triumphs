import { describe, it, expect } from 'vitest'
import express from 'express'
import versionRouter from './version.js'

describe('GET /api/version', () => {
  it('handler returns a semver version string', async () => {
    const app = express()
    app.use('/api/version', versionRouter)

    const req = { method: 'GET', url: '/' } as express.Request
    let capturedJson: unknown
    const res = {
      json: (data: unknown) => { capturedJson = data },
    } as unknown as express.Response

    // Call the route handler directly via the express app internals
    // by making a lightweight in-process request
    await new Promise<void>((resolve, reject) => {
      const server = app.listen(0, () => {
        const port = (server.address() as { port: number }).port
        fetch(`http://localhost:${port}/api/version`)
          .then(r => r.json())
          .then(data => { capturedJson = data; resolve() })
          .catch(reject)
          .finally(() => server.close())
      })
    })

    expect(capturedJson).toHaveProperty('version')
    expect(typeof (capturedJson as { version: string }).version).toBe('string')
    expect((capturedJson as { version: string }).version).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
