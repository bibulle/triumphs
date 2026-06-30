import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Triumph } from '../data/mock.js'

interface FakeDoc {
  player: string
  date: string
  level: number
  nodeKey: string
  count: number
}

const { docs, findOneMock, findOneAndUpdateMock } = vi.hoisted(() => {
  const docs: FakeDoc[] = []
  const findOneMock = vi.fn(
    async (filter: { player: string; level: number; nodeKey: string }) => {
      const matches = docs
        .filter(d => d.player === filter.player && d.level === filter.level && d.nodeKey === filter.nodeKey)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
      return matches[0] ?? null
    }
  )
  const findOneAndUpdateMock = vi.fn(
    async (filter: { player: string; date: string; level: number; nodeKey: string }, update: FakeDoc) => {
      const existing = docs.find(
        d => d.player === filter.player && d.date === filter.date && d.level === filter.level && d.nodeKey === filter.nodeKey
      )
      if (existing) Object.assign(existing, update)
      else docs.push({ ...update })
    }
  )
  return { docs, findOneMock, findOneAndUpdateMock }
})

vi.mock('mongoose', () => {
  class Schema<T = unknown> {
    constructor(_def?: unknown, _opts?: unknown) {}
    index(_spec: unknown, _opts?: unknown) {
      return this
    }
  }

  function find() {
    let sorted = [...docs]
    const chain = {
      sort: (spec: Record<string, number>) => {
        const [field, dir] = Object.entries(spec)[0]
        sorted = [...sorted].sort((a, b) => {
          const av = (a as unknown as Record<string, string>)[field]
          const bv = (b as unknown as Record<string, string>)[field]
          return av < bv ? -dir : av > bv ? dir : 0
        })
        return chain
      },
      then: (resolve: (v: FakeDoc[]) => void) => resolve(sorted),
    }
    return chain
  }

  const fakeModel = {
    findOne: findOneMock,
    findOneAndUpdate: findOneAndUpdateMock,
    find,
  }

  const models: Record<string, unknown> = {}
  const model = vi.fn((name: string) => {
    if (!models[name]) models[name] = fakeModel
    return models[name]
  })

  return { default: { models, model, Schema }, Schema, models, model }
})

import { recordSnapshots, getSnapshots } from './snapshots.js'

function triumph(id: string, overrides: Partial<Triumph> = {}): Triumph {
  return {
    id,
    section: 'triumphs',
    cat: 'Worlds',
    catFr: 'Mondes',
    sub: 'Vistas',
    subFr: 'Panoramas',
    groupKey: 'Worlds:Vistas',
    en: id,
    fr: id,
    descEn: '',
    descFr: '',
    ...overrides,
  }
}

describe('snapshots service', () => {
  beforeEach(() => {
    docs.length = 0
    findOneMock.mockClear()
    findOneAndUpdateMock.mockClear()
  })

  describe('recordSnapshots', () => {
    it('writes nothing when no progress is completed', async () => {
      const progress = { Alice: { t1: { completed: false, objectives: [] } } }
      await recordSnapshots(progress, [triumph('t1')])
      expect(docs).toHaveLength(0)
    })

    it('writes a snapshot per level for each completed triumph', async () => {
      const progress = { Alice: { t1: { completed: true, objectives: [] } } }
      await recordSnapshots(progress, [triumph('t1')])
      // level 0 (section), level 1 (cat), level 2 (groupKey)
      expect(docs).toHaveLength(3)
      expect(docs.map(d => d.level).sort()).toEqual([0, 1, 2])
      expect(docs.every(d => d.player === 'Alice' && d.count === 1)).toBe(true)
    })

    it('skips upserting when the count is unchanged from the last snapshot', async () => {
      const progress = { Alice: { t1: { completed: true, objectives: [] } } }
      await recordSnapshots(progress, [triumph('t1')])
      expect(docs).toHaveLength(3)

      findOneAndUpdateMock.mockClear()
      await recordSnapshots(progress, [triumph('t1')])
      expect(findOneAndUpdateMock).not.toHaveBeenCalled()
    })

    it('writes a new snapshot when the count changes', async () => {
      const progress1 = { Alice: { t1: { completed: true, objectives: [] } } }
      await recordSnapshots(progress1, [triumph('t1')])

      const progress2 = {
        Alice: {
          t1: { completed: true, objectives: [] },
          t2: { completed: true, objectives: [] },
        },
      }
      await recordSnapshots(progress2, [triumph('t1'), triumph('t2', { groupKey: 'Worlds:Vistas' })])
      const section = docs.filter(d => d.level === 0 && d.player === 'Alice')
      expect(section[section.length - 1].count).toBe(2)
    })

    it('aggregates counts across multiple players independently', async () => {
      const progress = {
        Alice: { t1: { completed: true, objectives: [] } },
        Bob: { t1: { completed: false, objectives: [] } },
      }
      await recordSnapshots(progress, [triumph('t1')])
      expect(docs.filter(d => d.player === 'Alice')).toHaveLength(3)
      expect(docs.filter(d => d.player === 'Bob')).toHaveLength(0)
    })

    it('falls back to "triumphs" section when section is missing', async () => {
      const progress = { Alice: { t1: { completed: true, objectives: [] } } }
      // @ts-expect-error testing missing optional-like field at runtime
      await recordSnapshots(progress, [triumph('t1', { section: undefined })])
      const sectionDoc = docs.find(d => d.level === 0)
      expect(sectionDoc?.nodeKey).toBe('triumphs')
    })
  })

  describe('getSnapshots', () => {
    it('returns an empty array when nothing is recorded', async () => {
      expect(await getSnapshots()).toEqual([])
    })

    it('returns snapshots sorted by date ascending', async () => {
      docs.push(
        { player: 'Alice', date: '2026-02-01', level: 0, nodeKey: 'triumphs', count: 5 },
        { player: 'Alice', date: '2026-01-01', level: 0, nodeKey: 'triumphs', count: 3 }
      )
      const result = await getSnapshots()
      expect(result.map(r => r.date)).toEqual(['2026-01-01', '2026-02-01'])
      expect(result[0]).toEqual({ player: 'Alice', date: '2026-01-01', level: 0, nodeKey: 'triumphs', count: 3 })
    })
  })
})
