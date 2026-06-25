import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchTriumphs, fetchProgress, fetchPlayers } from '../api'

const mockTriumphs = [
  { id: 't0', cat: 'Worlds', sub: 'Vistas', groupKey: 'Worlds|Vistas', en: 'A', fr: 'B', descEn: '', descFr: '' },
]
const mockProgress = { Bibullus: ['t0'], Vincent: [], Guiz: [] }

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchTriumphs', () => {
  it('returns parsed JSON on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockTriumphs), { status: 200 }))
    const result = await fetchTriumphs()
    expect(result).toEqual(mockTriumphs)
  })

  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 500 }))
    await expect(fetchTriumphs()).rejects.toThrow('fetchTriumphs: 500')
  })
})

describe('fetchPlayers', () => {
  it('returns parsed JSON on success', async () => {
    const mockPlayers = [{ name: 'Bibullus', tag: 'Bibullus#2986' }]
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockPlayers), { status: 200 }))
    const result = await fetchPlayers()
    expect(result).toEqual(mockPlayers)
  })

  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 503 }))
    await expect(fetchPlayers()).rejects.toThrow('fetchPlayers: 503')
  })
})

describe('fetchProgress', () => {
  it('returns parsed JSON on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockProgress), { status: 200 }))
    const result = await fetchProgress()
    expect(result).toEqual(mockProgress)
  })

  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 404 }))
    await expect(fetchProgress()).rejects.toThrow('fetchProgress: 404')
  })
})
