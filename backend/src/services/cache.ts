import mongoose, { Schema, Document, Model } from 'mongoose'

let connected = false

export async function connectMongo(url: string): Promise<void> {
  if (connected) return
  await mongoose.connect(url)
  connected = true
}

interface CacheDoc extends Document {
  key: string
  data: unknown
  createdAt: Date
}

function makeModel(collection: string, ttlSeconds: number): Model<CacheDoc> {
  const schema = new Schema<CacheDoc>(
    {
      key: { type: String, required: true, unique: true },
      data: { type: Schema.Types.Mixed, required: true },
      createdAt: { type: Date, default: Date.now },
    },
    { collection }
  )
  schema.index({ createdAt: 1 }, { expireAfterSeconds: ttlSeconds })
  // mongoose caches models by name — use a unique name per collection
  const modelName = `Cache_${collection}`
  return mongoose.models[modelName]
    ? (mongoose.model(modelName) as Model<CacheDoc>)
    : mongoose.model<CacheDoc>(modelName, schema)
}

const CATALOG_TTL = 24 * 60 * 60  // 24 h
const PROGRESS_TTL = 5 * 60       // 5 min

let catalogModel: Model<CacheDoc> | null = null
let progressModel: Model<CacheDoc> | null = null

function getCatalogModel(): Model<CacheDoc> {
  if (!catalogModel) catalogModel = makeModel('triumph_catalog', CATALOG_TTL)
  return catalogModel
}

function getProgressModel(): Model<CacheDoc> {
  if (!progressModel) progressModel = makeModel('triumph_progress', PROGRESS_TTL)
  return progressModel
}

export async function getCachedCatalog<T>(key: string): Promise<T | null> {
  const doc = await getCatalogModel().findOne({ key })
  return doc ? (doc.data as T) : null
}

export async function setCachedCatalog<T>(key: string, data: T): Promise<void> {
  await getCatalogModel().findOneAndUpdate(
    { key },
    { key, data, createdAt: new Date() },
    { upsert: true }
  )
}

export async function getCachedProgress<T>(key: string): Promise<T | null> {
  const doc = await getProgressModel().findOne({ key })
  return doc ? (doc.data as T) : null
}

export async function setCachedProgress<T>(key: string, data: T): Promise<void> {
  await getProgressModel().findOneAndUpdate(
    { key },
    { key, data, createdAt: new Date() },
    { upsert: true }
  )
}
