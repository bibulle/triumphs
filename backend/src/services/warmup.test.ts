import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./cache.js', () => ({
  getCachedCatalog: vi.fn(),
  setCachedCatalog: vi.fn().mockResolvedValue(undefined),
  setManifestCheck: vi.fn().mockResolvedValue(undefined),
  getCachedProgress: vi.fn(),
  setCachedProgress: vi.fn().mockResolvedValue(undefined),
  getProgressCacheAge: vi.fn().mockResolvedValue(null),
}))

vi.mock('./bungie.js', () => ({
  fetchManifestVersion: vi.fn(),
  fetchTriumphCatalog: vi.fn(),
}))

vi.mock('./players.js', () => ({
  parsePlayersEnv: vi.fn().mockReturnValue([]),
  resolvePlayer: vi.fn(),
  fetchPlayerProgress: vi.fn(),
}))

vi.mock('./snapshots.js', () => ({
  recordSnapshots: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../data/mock.js', () => ({
  getMockProgress: vi.fn().mockReturnValue({ Alice: {} }),
  TRIUMPHS: [{ id: 'mock-triumph' }],
}))

vi.mock('../routes/triumphs.js', () => ({
  validCache: vi.fn((c: unknown) => !!c && typeof c === 'object' && 'triumphs' in (c as object)),
  CATALOG_KEY: 'catalog-key',
  MANIFEST_CHECK_KEY: 'manifest-key',
}))

import { warmup } from './warmup.js'
import * as cache from './cache.js'
import * as bungie from './bungie.js'
import * as players from './players.js'
import * as snapshots from './snapshots.js'
import * as mockData from '../data/mock.js'

describe('warmup', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.BUNGIE_API_KEY
    delete process.env.MONGODB_URL
    delete process.env.PLAYERS
    vi.mocked(cache.getProgressCacheAge).mockResolvedValue(null)
    vi.mocked(players.parsePlayersEnv).mockReturnValue([])
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe('catalog warmup', () => {
    it('skips when BUNGIE_API_KEY is missing', async () => {
      process.env.MONGODB_URL = 'mongodb://fake'
      await warmup()
      expect(bungie.fetchManifestVersion).not.toHaveBeenCalled()
    })

    it('skips when MONGODB_URL is missing', async () => {
      process.env.BUNGIE_API_KEY = 'key'
      await warmup()
      expect(bungie.fetchManifestVersion).not.toHaveBeenCalled()
    })

    it('renews the manifest window without refetching when the cached version matches', async () => {
      process.env.BUNGIE_API_KEY = 'key'
      process.env.MONGODB_URL = 'mongodb://fake'
      vi.mocked(bungie.fetchManifestVersion).mockResolvedValue('1.0.0')
      vi.mocked(cache.getCachedCatalog).mockResolvedValue({ version: '1.0.0', triumphs: [], nodes: [] })

      await warmup()

      expect(bungie.fetchTriumphCatalog).not.toHaveBeenCalled()
      expect(cache.setManifestCheck).toHaveBeenCalledWith('manifest-key')
    })

    it('fetches and stores a fresh catalog when the version changed', async () => {
      process.env.BUNGIE_API_KEY = 'key'
      process.env.MONGODB_URL = 'mongodb://fake'
      vi.mocked(bungie.fetchManifestVersion).mockResolvedValue('2.0.0')
      vi.mocked(cache.getCachedCatalog).mockResolvedValueOnce({ version: '1.0.0', triumphs: [], nodes: [] })
      vi.mocked(bungie.fetchTriumphCatalog).mockResolvedValue({ version: '2.0.0', triumphs: [{ id: 't1' }], nodes: [] } as never)

      await warmup()

      expect(bungie.fetchTriumphCatalog).toHaveBeenCalled()
      expect(cache.setCachedCatalog).toHaveBeenCalledWith('catalog-key', expect.objectContaining({ version: '2.0.0' }))
      expect(cache.setManifestCheck).toHaveBeenCalledWith('manifest-key')
    })

    it('fetches a fresh catalog when nothing is cached yet', async () => {
      process.env.BUNGIE_API_KEY = 'key'
      process.env.MONGODB_URL = 'mongodb://fake'
      vi.mocked(bungie.fetchManifestVersion).mockResolvedValue('1.0.0')
      vi.mocked(cache.getCachedCatalog).mockResolvedValueOnce(null)
      vi.mocked(bungie.fetchTriumphCatalog).mockResolvedValue({ version: '1.0.0', triumphs: [], nodes: [] } as never)

      await warmup()

      expect(bungie.fetchTriumphCatalog).toHaveBeenCalled()
    })

    it('does not throw when the manifest fetch fails', async () => {
      process.env.BUNGIE_API_KEY = 'key'
      process.env.MONGODB_URL = 'mongodb://fake'
      vi.mocked(bungie.fetchManifestVersion).mockRejectedValue(new Error('network down'))

      await expect(warmup()).resolves.toBeUndefined()
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('progress warmup', () => {
    it('skips when MONGODB_URL is missing', async () => {
      await warmup()
      expect(cache.setCachedProgress).not.toHaveBeenCalled()
    })

    it('skips when the cached progress is fresh (dev restart)', async () => {
      process.env.MONGODB_URL = 'mongodb://fake'
      vi.mocked(cache.getProgressCacheAge).mockResolvedValue(5)

      await warmup()

      expect(cache.setCachedProgress).not.toHaveBeenCalled()
    })

    it('proceeds when the cached progress is older than the dev-skip window', async () => {
      process.env.MONGODB_URL = 'mongodb://fake'
      vi.mocked(cache.getProgressCacheAge).mockResolvedValue(60)
      vi.mocked(cache.getCachedCatalog).mockResolvedValue(null)

      await warmup()

      expect(cache.setCachedProgress).toHaveBeenCalled()
    })

    it('uses mock progress when no players are configured', async () => {
      process.env.MONGODB_URL = 'mongodb://fake'
      vi.mocked(cache.getCachedCatalog).mockResolvedValue(null)

      await warmup()

      expect(mockData.getMockProgress).toHaveBeenCalled()
      expect(cache.setCachedProgress).toHaveBeenCalledWith('progress', { Alice: {} })
    })

    it('fetches real progress when players and an API key are configured', async () => {
      process.env.MONGODB_URL = 'mongodb://fake'
      process.env.BUNGIE_API_KEY = 'key'
      vi.mocked(cache.getCachedCatalog).mockResolvedValue(null)
      vi.mocked(players.parsePlayersEnv).mockReturnValue([{ name: 'Alice', tag: 'Alice#1234' }])
      vi.mocked(players.resolvePlayer).mockResolvedValue({ name: 'Alice', tag: 'Alice#1234', membershipType: 3, membershipId: '1' })
      vi.mocked(players.fetchPlayerProgress).mockResolvedValue({ t1: { completed: true, objectives: [] } })

      await warmup()

      expect(players.resolvePlayer).toHaveBeenCalledWith({ name: 'Alice', tag: 'Alice#1234' })
      expect(cache.setCachedProgress).toHaveBeenCalledWith('progress', { Alice: { t1: { completed: true, objectives: [] } } })
    })

    it('falls back to an empty record for a player whose fetch failed', async () => {
      process.env.MONGODB_URL = 'mongodb://fake'
      process.env.BUNGIE_API_KEY = 'key'
      vi.mocked(cache.getCachedCatalog).mockResolvedValue(null)
      vi.mocked(players.parsePlayersEnv).mockReturnValue([{ name: 'Alice', tag: 'Alice#1234' }])
      vi.mocked(players.resolvePlayer).mockRejectedValue(new Error('not found'))

      await warmup()

      expect(cache.setCachedProgress).toHaveBeenCalledWith('progress', { Alice: {} })
      expect(console.warn).toHaveBeenCalled()
    })

    it('records snapshots using the cached catalog triumphs when valid', async () => {
      process.env.MONGODB_URL = 'mongodb://fake'
      vi.mocked(cache.getCachedCatalog).mockResolvedValue({ version: '1.0.0', triumphs: [{ id: 'real-triumph' }], nodes: [] })

      await warmup()

      expect(snapshots.recordSnapshots).toHaveBeenCalledWith({ Alice: {} }, [{ id: 'real-triumph' }])
    })

    it('records snapshots using the mock triumphs when no valid catalog is cached', async () => {
      process.env.MONGODB_URL = 'mongodb://fake'
      vi.mocked(cache.getCachedCatalog).mockResolvedValue(null)

      await warmup()

      expect(snapshots.recordSnapshots).toHaveBeenCalledWith({ Alice: {} }, [{ id: 'mock-triumph' }])
    })

    it('does not throw when storing progress fails', async () => {
      process.env.MONGODB_URL = 'mongodb://fake'
      vi.mocked(cache.getCachedCatalog).mockResolvedValue(null)
      vi.mocked(cache.setCachedProgress).mockRejectedValueOnce(new Error('mongo down'))

      await expect(warmup()).resolves.toBeUndefined()
      expect(console.error).toHaveBeenCalled()
    })
  })
})
