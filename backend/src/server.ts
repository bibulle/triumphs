import express from 'express'
import { connectMongo } from './services/cache.js'
import triumphsRouter from './routes/triumphs.js'
import progressRouter from './routes/progress.js'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(express.json())

app.use('/api/triumphs', triumphsRouter)
app.use('/api/progress', progressRouter)

if (process.env.MONGODB_URL) {
  connectMongo(process.env.MONGODB_URL)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.warn('MongoDB unavailable, using mock only:', err.message))
}

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
})

export default app
