import mongoose, { Schema, Document, Model } from 'mongoose'
import type { Triumph, PlayerProgress } from '../data/mock.js'

export interface ProgressSnapshot {
  player: string
  date: string       // YYYY-MM-DD
  level: 0 | 1 | 2
  nodeKey: string    // sectionId (level 0), cat (level 1), groupKey (level 2)
  count: number      // cumulative completions at this date
}

interface SnapshotDoc extends Document {
  player: string
  date: string
  level: number
  nodeKey: string
  count: number
}

let snapshotModel: Model<SnapshotDoc> | null = null

function getSnapshotModel(): Model<SnapshotDoc> {
  if (snapshotModel) return snapshotModel
  const schema = new Schema<SnapshotDoc>(
    {
      player:  { type: String, required: true },
      date:    { type: String, required: true },
      level:   { type: Number, required: true },
      nodeKey: { type: String, required: true },
      count:   { type: Number, required: true },
    },
    { collection: 'triumph_progress_snapshots' }
  )
  schema.index({ player: 1, level: 1, nodeKey: 1, date: -1 })
  const modelName = 'TriumphProgressSnapshot'
  snapshotModel = mongoose.models[modelName]
    ? (mongoose.model(modelName) as Model<SnapshotDoc>)
    : mongoose.model<SnapshotDoc>(modelName, schema)
  return snapshotModel
}

// Compute counts per (level, nodeKey) for each player from current progress
function computeCounts(
  progress: Record<string, PlayerProgress>,
  triumphs: Triumph[]
): Record<string, Array<{ level: 0 | 1 | 2; nodeKey: string; count: number }>> {
  const result: Record<string, Array<{ level: 0 | 1 | 2; nodeKey: string; count: number }>> = {}

  for (const [player, recs] of Object.entries(progress)) {
    const c = new Map<string, number>()
    for (const t of triumphs) {
      if (!recs[t.id]?.completed) continue
      const keys: [0 | 1 | 2, string][] = [
        [0, t.section ?? 'triumphs'],
        [1, t.cat],
        [2, t.groupKey],
      ]
      for (const [lvl, key] of keys) {
        const k = `${lvl}:${key}`
        c.set(k, (c.get(k) ?? 0) + 1)
      }
    }
    result[player] = [...c.entries()].map(([k, count]) => {
      const colon = k.indexOf(':')
      return { level: parseInt(k.slice(0, colon)) as 0 | 1 | 2, nodeKey: k.slice(colon + 1), count }
    })
  }

  return result
}

// Called after each progress fetch — stores a new snapshot only when count changed
export async function recordSnapshots(
  progress: Record<string, PlayerProgress>,
  triumphs: Triumph[]
): Promise<void> {
  const model = getSnapshotModel()
  const today = new Date().toISOString().slice(0, 10)
  const counts = computeCounts(progress, triumphs)
  let written = 0

  for (const [player, entries] of Object.entries(counts)) {
    for (const { level, nodeKey, count } of entries) {
      const last = await model.findOne(
        { player, level, nodeKey },
        { count: 1 },
        { sort: { date: -1 } }
      )
      if (last && last.count === count) continue
      await model.findOneAndUpdate(
        { player, date: today, level, nodeKey },
        { player, date: today, level, nodeKey, count },
        { upsert: true }
      )
      written++
    }
  }
  console.log(`[snapshots] recordSnapshots: ${written} upserted (${Object.keys(counts).join(', ')}, triumphs=${triumphs.length})`)
}

export async function getSnapshots(): Promise<ProgressSnapshot[]> {
  const docs = await getSnapshotModel()
    .find({}, { _id: 0, player: 1, date: 1, level: 1, nodeKey: 1, count: 1 })
    .sort({ date: 1 })
  console.log(`[snapshots] getSnapshots: ${docs.length} docs found`)
  return docs.map(d => ({
    player: d.player,
    date: d.date,
    level: d.level as 0 | 1 | 2,
    nodeKey: d.nodeKey,
    count: d.count,
  }))
}
