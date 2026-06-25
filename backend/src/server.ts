import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') })
import express, { Request, Response, NextFunction } from 'express'
import { connectMongo } from './services/cache.js'
import { warmup } from './services/warmup.js'
import triumphsRouter from './routes/triumphs.js'
import nodesRouter from './routes/nodes.js'
import progressRouter from './routes/progress.js'
import playersRouter from './routes/players.js'

// Catch-all for unhandled async rejections / uncaught exceptions so the process
// logs something useful before crashing (or staying alive with a bad state).
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled promise rejection:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err.message, err.stack)
  process.exit(1)
})

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(express.json())

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode} (${Date.now() - start}ms)`)
  })
  next()
})

app.use('/api/triumphs', triumphsRouter)
app.use('/api/nodes', nodesRouter)
app.use('/api/progress', progressRouter)
app.use('/api/players', playersRouter)

// Unhandled error middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[ERROR] Unhandled exception: ${err.message}`, err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

console.log(`[STARTUP] BUNGIE_API_KEY: ${process.env.BUNGIE_API_KEY ? 'set' : 'NOT SET'}`)
console.log(`[STARTUP] MONGODB_URL:    ${process.env.MONGODB_URL ? 'set' : 'NOT SET'}`)
console.log(`[STARTUP] PLAYERS:        ${process.env.PLAYERS ?? 'NOT SET (using mock players)'}`)

if (process.env.MONGODB_URL) {
  connectMongo(process.env.MONGODB_URL)
    .then(() => {
      console.log('[STARTUP] MongoDB connected')
      return warmup()
    })
    .catch((err) => console.error('[STARTUP] MongoDB unavailable, using mock only:', err.message))
}

app.listen(PORT, () => {
  console.log(`[STARTUP] Backend listening on http://localhost:${PORT}`)
})

export default app
