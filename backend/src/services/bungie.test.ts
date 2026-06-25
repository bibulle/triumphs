import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchManifestVersion, fetchTriumphCatalog } from './bungie.js'

const MANIFEST_VERSION = '999.1.0'
const MANIFEST_RESPONSE = {
  Response: {
    version: MANIFEST_VERSION,
    jsonWorldComponentContentPaths: {
      en: {
        DestinyPresentationNodeDefinition: '/en/nodes.json',
        DestinyRecordDefinition: '/en/records.json',
      },
      fr: {
        DestinyPresentationNodeDefinition: '/fr/nodes.json',
        DestinyRecordDefinition: '/fr/records.json',
      },
    },
  },
}

// Minimal presentation node tree:
// Monument of Triumph → Worlds → Vistas → record 1001
const EN_NODES: Record<string, unknown> = {
  '1': {
    hash: 1,
    displayProperties: { name: 'Monument of Triumph', description: '' },
    children: { presentationNodes: [{ presentationNodeHash: 10 }] },
  },
  '10': {
    hash: 10,
    displayProperties: { name: 'Worlds', description: '' },
    children: { presentationNodes: [{ presentationNodeHash: 100 }] },
  },
  '100': {
    hash: 100,
    displayProperties: { name: 'Vistas', description: '' },
    children: { records: [{ recordHash: 1001 }] },
  },
}

const FR_NODES: Record<string, unknown> = {
  '1': { hash: 1, displayProperties: { name: 'Monument de Triomphe', description: '' } },
  '10': { hash: 10, displayProperties: { name: 'Mondes', description: '' } },
  '100': { hash: 100, displayProperties: { name: 'Panoramas', description: '' } },
}

const EN_RECORDS: Record<string, unknown> = {
  '1001': { hash: 1001, displayProperties: { name: 'The Monument', description: 'Collect all seals.' } },
}

const FR_RECORDS: Record<string, unknown> = {
  '1001': { hash: 1001, displayProperties: { name: 'Le Monument', description: 'Collecte tous les cachets.' } },
}

function mockFetch(url: string): Promise<Response> {
  let body: unknown
  if (url.includes('/Platform/Destiny2/Manifest/')) body = MANIFEST_RESPONSE
  else if (url.includes('/en/nodes.json')) body = EN_NODES
  else if (url.includes('/fr/nodes.json')) body = FR_NODES
  else if (url.includes('/en/records.json')) body = EN_RECORDS
  else if (url.includes('/fr/records.json')) body = FR_RECORDS
  else return Promise.reject(new Error(`Unexpected URL: ${url}`))

  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body),
  } as Response)
}

beforeEach(() => {
  process.env.BUNGIE_API_KEY = 'test-key'
  vi.stubGlobal('fetch', vi.fn(mockFetch))
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.BUNGIE_API_KEY
})

describe('fetchManifestVersion', () => {
  it('returns the version string from the manifest', async () => {
    const version = await fetchManifestVersion()
    expect(version).toBe(MANIFEST_VERSION)
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    await expect(fetchManifestVersion()).rejects.toThrow('503')
  })
})

describe('fetchTriumphCatalog', () => {
  it('returns the manifest version', async () => {
    const { version } = await fetchTriumphCatalog()
    expect(version).toBe(MANIFEST_VERSION)
  })

  it('builds triumph objects from the tree', async () => {
    const { triumphs } = await fetchTriumphCatalog()
    expect(triumphs).toHaveLength(1)
    const t = triumphs[0]
    expect(t.cat).toBe('Worlds')
    expect(t.catFr).toBe('Mondes')
    expect(t.sub).toBe('Vistas')
    expect(t.subFr).toBe('Panoramas')
    expect(t.groupKey).toBe('Worlds|Vistas')
    expect(t.en).toBe('The Monument')
    expect(t.fr).toBe('Le Monument')
    expect(t.descEn).toBe('Collect all seals.')
    expect(t.descFr).toBe('Collecte tous les cachets.')
  })

  it('falls back to EN name when FR record is missing', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('/fr/records.json'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      return mockFetch(url)
    }))
    const { triumphs } = await fetchTriumphCatalog()
    expect(triumphs[0].fr).toBe('The Monument')
  })

  it('throws when Monument of Triumph node is not found', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('/en/nodes.json'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      return mockFetch(url)
    }))
    await expect(fetchTriumphCatalog()).rejects.toThrow('Monument of Triumph')
  })
})
