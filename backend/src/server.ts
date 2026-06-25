import express, { Request, Response, NextFunction } from 'express'
import { connectMongo } from './services/cache.js'
import triumphsRouter from './routes/triumphs.js'
import progressRouter from './routes/progress.js'

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
app.use('/api/progress', progressRouter)

// Unhandled error middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[ERROR] Unhandled exception: ${err.message}`, err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

console.log(`[STARTUP] BUNGIE_API_KEY: ${process.env.BUNGIE_API_KEY ? 'set' : 'NOT SET'}`)
console.log(`[STARTUP] MONGODB_URL:    ${process.env.MONGODB_URL ? 'set' : 'NOT SET'}`)

if (process.env.MONGODB_URL) {
  connectMongo(process.env.MONGODB_URL)
    .then(() => console.log('[STARTUP] MongoDB connected'))
    .catch((err) => console.error('[STARTUP] MongoDB unavailable, using mock only:', err.message))
}

app.listen(PORT, () => {
  console.log(`[STARTUP] Backend listening on http://localhost:${PORT}`)
})

export default app
