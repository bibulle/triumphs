import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAppData } from '../hooks/useAppData'
import * as api from '../api'
import type { Triumph } from '../data'

const mockTriumphs: Triumph[] = [
  { id: 't0', section: 'triumphs', cat: 'Worlds', catFr: 'Mondes', sub: 'Vistas', subFr: 'Panoramas', groupKey: 'triumphs|Worlds|Vistas', en: 'A', fr: 'B', descEn: '', descFr: '' },
  { id: 't1', section: 'triumphs', cat: 'Worlds', catFr: 'Mondes', sub: 'Vistas', subFr: 'Panoramas', groupKey: 'triumphs|Worlds|Vistas', en: 'C', fr: 'D', descEn: '', descFr: '' },
  { id: 't2', section: 'triumphs', cat: 'Stories', catFr: 'Histoires', sub: 'Campaigns', subFr: 'Campagnes', groupKey: 'triumphs|Stories|Campaigns', en: 'E', fr: 'F', descEn: '', descFr: '' },
]
const mockPlayers = [
  { name: 'Bibullus', tag: 'Bibullus#2986' },
  { name: 'Vincent', tag: 'tarrade#1427' },
  { name: 'Guiz', tag: 'Guizmo-1999#7396' },
]
const mockProgress = {
  Bibullus: { t0: { completed: true, objectives: [] } },
  Vincent: {},
  Guiz: {},
}

beforeEach(() => {
  vi.spyOn(api, 'fetchTriumphs').mockResolvedValue(mockTriumphs)
  vi.spyOn(api, 'fetchProgress').mockResolvedValue(mockProgress)
  vi.spyOn(api, 'fetchPlayers').mockResolvedValue(mockPlayers)
  vi.spyOn(api, 'fetchNodes').mockResolvedValue([])
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAppData', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useAppData())
    expect(result.current.loading).toBe(true)
  })

  it('loads triumphs and builds groups', async () => {
    const { result } = renderHook(() => useAppData())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.triumphs).toHaveLength(mockTriumphs.length)
    expect(result.current.groups.length).toBeGreaterThan(0)
    expect(result.current.error).toBeNull()
  })

  it('loads players from api', async () => {
    const { result } = renderHook(() => useAppData())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.players).toEqual(['Bibullus', 'Vincent', 'Guiz'])
  })

  it('converts progress to Sets of completed IDs', async () => {
    const { result } = renderHook(() => useAppData())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.progress.Bibullus).toBeInstanceOf(Set)
    expect(result.current.progress.Bibullus.has('t0')).toBe(true)
    expect(result.current.progress.Vincent.size).toBe(0)
  })

  it('exposes progressDetail with objective data', async () => {
    const { result } = renderHook(() => useAppData())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.progressDetail.Bibullus?.t0?.completed).toBe(true)
    expect(result.current.progressDetail.Bibullus?.t0?.objectives).toEqual([])
  })

  it('groups are sorted by cat then sub order', async () => {
    const { result } = renderHook(() => useAppData())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const firstGroup = result.current.groups[0]
    expect(firstGroup.cat).toBe('Worlds')
  })

  it('sets error and stops loading on fetch failure', async () => {
    vi.spyOn(api, 'fetchTriumphs').mockRejectedValue(new Error('network error'))
    const { result } = renderHook(() => useAppData())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('network error')
    expect(result.current.triumphs).toHaveLength(0)
  })
})
