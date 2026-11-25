import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./cache.js', () => ({
  getCachedCatalog: vi.fn().mockResolvedValue(null),
  setCachedCatalog: vi.fn().mockResolvedValue(undefined),
}))

import { getRecordDetail, clearRecordDetailMemo } from './recordDetail.js'
import * as cache from './cache.js'

const DEFS: Record<string, Record<string, unknown>> = {
  'DestinyRecordDefinition/100/en': {
    objectiveHashes: [1, 2],
    rewardItems: [{ itemHash: 50, quantity: 1 }],
  },
  'DestinyObjectiveDefinition/1/en': { progressDescription: 'Traversal', completionValue: 1, inProgressValueStyle: 2 },
  'DestinyObjectiveDefinition/1/fr': { progressDescription: 'Traversée', completionValue: 1 },
  'DestinyObjectiveDefinition/1/pt-br': { progressDescription: 'Travessia', completionValue: 1 },
  'DestinyObjectiveDefinition/2/en': { progressDescription: 'Exotic Mission', completionValue: 3 },
  'DestinyObjectiveDefinition/2/fr': { progressDescription: 'Mission exotique', completionValue: 3 },
  'DestinyInventoryItemDefinition/50/en': { displayProperties: { name: 'Legendary Shield', icon: '/icon.png' } },
  'DestinyInventoryItemDefinition/50/fr': { displayProperties: { name: 'Écu légendaire' } },
}

function mockFetch() {
  return vi.fn(async (url: string) => {
    const m = /Manifest\/(\w+)\/(\d+)\/\?lc=([\w-]+)/.exec(url)!
    const def = DEFS[`${m[1]}/${m[2]}/${m[3]}`]
    return new Response(JSON.stringify({ Response: def ?? null }), { status: def ? 200 : 404 })
  })
}

describe('getRecordDetail', () => {
  beforeEach(() => {
    clearRecordDetailMemo()
    vi.clearAllMocks()
    process.env.BUNGIE_API_KEY = 'key'
    delete process.env.MONGODB_URL
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.BUNGIE_API_KEY
  })

  it('returns null without API key', async () => {
    delete process.env.BUNGIE_API_KEY
    expect(await getRecordDetail('100')).toBeNull()
  })

  it('builds localized objectives and rewards', async () => {
    vi.stubGlobal('fetch', mockFetch())
    const d = await getRecordDetail('100')
    expect(d?.objectives).toEqual([
      { hash: 1, descEn: 'Traversal', descFr: 'Traversée', descPt: 'Travessia', completionValue: 1, valueStyle: 2 },
      { hash: 2, descEn: 'Exotic Mission', descFr: 'Mission exotique', descPt: undefined, completionValue: 3 },
    ])
    expect(d?.rewards).toEqual([
      { hash: 50, nameEn: 'Legendary Shield', nameFr: 'Écu légendaire', namePt: undefined, icon: '/icon.png', quantity: 1 },
    ])
    expect(d?.intervals).toEqual([])
  })

  it('memoizes results in memory', async () => {
    const f = mockFetch()
    vi.stubGlobal('fetch', f)
    await getRecordDetail('100')
    const calls = f.mock.calls.length
    await getRecordDetail('100')
    expect(f.mock.calls.length).toBe(calls)
  })

  it('serves from MongoDB cache when available', async () => {
    process.env.MONGODB_URL = 'mongodb://fake'
    const cached = { id: '100', objectives: [], intervals: [], rewards: [] }
    vi.mocked(cache.getCachedCatalog).mockResolvedValueOnce(cached)
    const f = mockFetch()
    vi.stubGlobal('fetch', f)
    expect(await getRecordDetail('100')).toEqual(cached)
    expect(f).not.toHaveBeenCalled()
  })

  it('returns empty detail for unknown record', async () => {
    vi.stubGlobal('fetch', mockFetch())
    expect(await getRecordDetail('999')).toEqual({ id: '999', objectives: [], intervals: [], rewards: [] })
  })
})
