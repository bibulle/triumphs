import { describe, it, expect, vi, beforeEach } from 'vitest'

interface FakeDoc {
  [key: string]: unknown
}

const { stores, getStore, connectMock } = vi.hoisted(() => {
  const stores = new Map<string, Map<string, Record<string, unknown>>>()
  function getStore(name: string): Map<string, Record<string, unknown>> {
    if (!stores.has(name)) stores.set(name, new Map())
    return stores.get(name)!
  }
  const connectMock = vi.fn(async () => {})
  return { stores, getStore, connectMock }
})

vi.mock('mongoose', () => {
  class Schema<T = unknown> {
    constructor(_def?: unknown, _opts?: unknown) {}
    index(_spec: unknown, _opts?: unknown) {
      return this
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(Schema as any).Types = { Mixed: 'Mixed' }

  const models: Record<string, unknown> = {}

  function makeFakeModel(name: string) {
    const store = getStore(name)
    return {
      findOne: async (filter: { key?: string; player?: string }) => {
        const id = (filter.key ?? filter.player) as string
        const doc = store.get(id)
        return doc ? { ...doc } : null
      },
      findOneAndUpdate: async (
        filter: { key?: string; player?: string },
        update: FakeDoc
      ) => {
        const id = (filter.key ?? filter.player) as string
        store.set(id, { ...update })
        return null
      },
      deleteOne: async (filter: { key?: string; player?: string }) => {
        const id = (filter.key ?? filter.player) as string
        store.delete(id)
      },
      find: async () => Array.from(store.values()).map(d => ({ ...d })),
    }
  }

  const model = vi.fn((name: string, _schema?: unknown) => {
    if (!models[name]) models[name] = makeFakeModel(name)
    return models[name]
  })

  const mongoose = {
    connect: connectMock,
    models,
    model,
    Schema,
  }

  return { default: mongoose, Schema, models, model, connect: connectMock }
})

import {
  connectMongo,
  getCachedCatalog,
  setCachedCatalog,
  getCachedProgress,
  setCachedProgress,
  deleteCachedProgress,
  getProgressCacheAge,
  getManifestCheck,
  setManifestCheck,
  getAllAnnotations,
  setPlayerAnnotations,
} from './cache.js'

describe('cache service', () => {
  beforeEach(() => {
    for (const store of stores.values()) store.clear()
    connectMock.mockClear()
  })

  describe('connectMongo', () => {
    it('connects once even when called multiple times', async () => {
      await connectMongo('mongodb://fake')
      await connectMongo('mongodb://fake')
      await connectMongo('mongodb://fake')
      expect(connectMock).toHaveBeenCalledTimes(1)
      expect(connectMock).toHaveBeenCalledWith('mongodb://fake')
    })
  })

  describe('catalog cache', () => {
    it('returns null when nothing cached', async () => {
      expect(await getCachedCatalog('missing')).toBeNull()
    })

    it('stores and retrieves catalog data', async () => {
      const data = { triumphs: [1, 2, 3] }
      await setCachedCatalog('catalog-key', data)
      expect(await getCachedCatalog('catalog-key')).toEqual(data)
    })

    it('overwrites existing catalog data for the same key', async () => {
      await setCachedCatalog('k', { v: 1 })
      await setCachedCatalog('k', { v: 2 })
      expect(await getCachedCatalog('k')).toEqual({ v: 2 })
    })
  })

  describe('progress cache', () => {
    it('returns null when nothing cached', async () => {
      expect(await getCachedProgress('missing')).toBeNull()
    })

    it('stores and retrieves progress data', async () => {
      const data = { done: 5 }
      await setCachedProgress('p1', data)
      expect(await getCachedProgress('p1')).toEqual(data)
    })

    it('deletes cached progress', async () => {
      await setCachedProgress('p1', { done: 5 })
      await deleteCachedProgress('p1')
      expect(await getCachedProgress('p1')).toBeNull()
    })

    it('deleting a missing key is a no-op', async () => {
      await expect(deleteCachedProgress('nope')).resolves.toBeUndefined()
    })
  })

  describe('getProgressCacheAge', () => {
    it('returns null when nothing cached', async () => {
      expect(await getProgressCacheAge('missing')).toBeNull()
    })

    it('returns a small non-negative age right after caching', async () => {
      await setCachedProgress('p1', { done: 1 })
      const age = await getProgressCacheAge('p1')
      expect(age).not.toBeNull()
      expect(age as number).toBeGreaterThanOrEqual(0)
      expect(age as number).toBeLessThan(1)
    })
  })

  describe('manifest check cache', () => {
    it('returns false when not checked yet', async () => {
      expect(await getManifestCheck('m1')).toBe(false)
    })

    it('returns true after being set', async () => {
      await setManifestCheck('m1')
      expect(await getManifestCheck('m1')).toBe(true)
    })
  })

  describe('annotations', () => {
    it('returns empty object when no annotations exist', async () => {
      expect(await getAllAnnotations()).toEqual({})
    })

    it('stores and retrieves annotations for multiple players', async () => {
      await setPlayerAnnotations('Alice', { '1': 2 }, { '2': 'need' })
      await setPlayerAnnotations('Bob', { '3': 1 }, {})

      const all = await getAllAnnotations()
      expect(all).toEqual({
        Alice: { prio: { '1': 2 }, flags: { '2': 'need' } },
        Bob: { prio: { '3': 1 }, flags: {} },
      })
    })

    it('upserts annotations for an existing player', async () => {
      await setPlayerAnnotations('Alice', { '1': 1 }, {})
      await setPlayerAnnotations('Alice', { '1': 3 }, { '2': 'solo' })

      const all = await getAllAnnotations()
      expect(all.Alice).toEqual({ prio: { '1': 3 }, flags: { '2': 'solo' } })
    })

    it('defaults missing prio/flags to empty objects', async () => {
      const store = getStore('TriumphAnnotation')
      store.set('Carol', { player: 'Carol' })

      const all = await getAllAnnotations()
      expect(all.Carol).toEqual({ prio: {}, flags: {} })
    })
  })
})
