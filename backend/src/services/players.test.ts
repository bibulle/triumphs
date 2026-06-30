import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./fetchRetry.js', () => ({
  fetchWithRetry: vi.fn(),
}))

import { fetchWithRetry } from './fetchRetry.js'
import {
  parsePlayersEnv,
  resolvePlayer,
  fetchPlayerProgress,
  fetchPlayerCompletedRecords,
  type ResolvedPlayer,
} from './players.js'

const mockFetch = vi.mocked(fetchWithRetry)

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response
}

describe('parsePlayersEnv', () => {
  const original = process.env.PLAYERS

  afterEach(() => {
    if (original === undefined) delete process.env.PLAYERS
    else process.env.PLAYERS = original
  })

  it('returns empty array when PLAYERS is unset', () => {
    delete process.env.PLAYERS
    expect(parsePlayersEnv()).toEqual([])
  })

  it('returns empty array when PLAYERS is blank', () => {
    process.env.PLAYERS = '   '
    expect(parsePlayersEnv()).toEqual([])
  })

  it('parses a single name:tag entry', () => {
    process.env.PLAYERS = 'Alice:Alice#1234'
    expect(parsePlayersEnv()).toEqual([{ name: 'Alice', tag: 'Alice#1234' }])
  })

  it('parses multiple entries separated by commas', () => {
    process.env.PLAYERS = 'Alice:Alice#1234,Bob:Bob#5678'
    expect(parsePlayersEnv()).toEqual([
      { name: 'Alice', tag: 'Alice#1234' },
      { name: 'Bob', tag: 'Bob#5678' },
    ])
  })

  it('trims whitespace around name and tag', () => {
    process.env.PLAYERS = ' Alice : Alice#1234 '
    expect(parsePlayersEnv()).toEqual([{ name: 'Alice', tag: 'Alice#1234' }])
  })

  it('skips entries without a colon', () => {
    process.env.PLAYERS = 'NoColonHere,Bob:Bob#5678'
    expect(parsePlayersEnv()).toEqual([{ name: 'Bob', tag: 'Bob#5678' }])
  })

  it('skips entries with an empty name or tag', () => {
    process.env.PLAYERS = ':Bob#5678, Alice :,Carol:Carol#999'
    expect(parsePlayersEnv()).toEqual([{ name: 'Carol', tag: 'Carol#999' }])
  })
})

describe('resolvePlayer', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    process.env.BUNGIE_API_KEY = 'test-key'
  })

  it('throws when the tag has no # separator', async () => {
    await expect(resolvePlayer({ name: 'Alice', tag: 'InvalidTag' })).rejects.toThrow('Invalid tag format')
  })

  it('throws when the Bungie API responds with an error status', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, false, 500))
    await expect(resolvePlayer({ name: 'Alice', tag: 'Alice#1234' })).rejects.toThrow('500')
  })

  it('throws when no players are found', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ Response: [] }))
    await expect(resolvePlayer({ name: 'Alice', tag: 'Alice#1234' })).rejects.toThrow('Player not found')
  })

  it('resolves to the single result when there is no cross-save override', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      Response: [{ membershipType: 3, membershipId: '111' }],
    }))
    const result = await resolvePlayer({ name: 'Alice', tag: 'Alice#1234' })
    expect(result).toEqual({ name: 'Alice', tag: 'Alice#1234', membershipType: 3, membershipId: '111' })
  })

  it('prefers the cross-save primary membership when present', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      Response: [
        { membershipType: 1, membershipId: '111', crossSaveOverride: 3 },
        { membershipType: 3, membershipId: '222', crossSaveOverride: 3 },
      ],
    }))
    const result = await resolvePlayer({ name: 'Alice', tag: 'Alice#1234' })
    expect(result).toEqual({ name: 'Alice', tag: 'Alice#1234', membershipType: 3, membershipId: '222' })
  })

  it('parses the display name and code from the tag', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      Response: [{ membershipType: 3, membershipId: '111' }],
    }))
    await resolvePlayer({ name: 'Alice', tag: 'Some#Name#4321' })
    const [, options] = mockFetch.mock.calls[0]
    const body = JSON.parse((options as RequestInit).body as string)
    expect(body).toEqual({ displayName: 'Some#Name', displayNameCode: 4321 })
  })
})

describe('fetchPlayerProgress', () => {
  const player: ResolvedPlayer = { name: 'Alice', tag: 'Alice#1234', membershipType: 3, membershipId: '111' }

  beforeEach(() => {
    mockFetch.mockReset()
    process.env.BUNGIE_API_KEY = 'test-key'
    delete process.env.DEBUG_RECORD_HASHES
  })

  it('throws when the profile fetch fails', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, false, 503))
    await expect(fetchPlayerProgress(player)).rejects.toThrow('503')
  })

  it('marks a record completed when ObjectiveNotCompleted bit is unset', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      Response: { profileRecords: { data: { records: { '1': { state: 0 } } } } },
    }))
    const progress = await fetchPlayerProgress(player)
    expect(progress['1']).toEqual({ completed: true, redeemed: false, objectives: [] })
  })

  it('marks a record incomplete when ObjectiveNotCompleted bit is set and objectives are not met', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      Response: {
        profileRecords: {
          data: { records: { '1': { state: 4, objectives: [{ progress: 1, completionValue: 5 }] } } },
        },
      },
    }))
    const progress = await fetchPlayerProgress(player)
    expect(progress['1'].completed).toBe(false)
    expect(progress['1'].objectives).toEqual([{ current: 1, completionValue: 5 }])
  })

  it('marks a record completed via fully-met objectives even with bit 4 set', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      Response: {
        profileRecords: {
          data: { records: { '1': { state: 4, objectives: [{ progress: 5, completionValue: 5 }] } } },
        },
      },
    }))
    const progress = await fetchPlayerProgress(player)
    expect(progress['1'].completed).toBe(true)
  })

  it('marks a record completed via fully-met interval objectives', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      Response: {
        profileRecords: {
          data: { records: { '1': { state: 4, intervalObjectives: [{ progress: 3, completionValue: 3 }] } } },
        },
      },
    }))
    const progress = await fetchPlayerProgress(player)
    expect(progress['1'].completed).toBe(true)
  })

  it('marks redeemed true when bit 0 is set', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      Response: { profileRecords: { data: { records: { '1': { state: 1 } } } } },
    }))
    const progress = await fetchPlayerProgress(player)
    expect(progress['1'].redeemed).toBe(true)
    expect(progress['1'].completed).toBe(true)
  })

  it('uses completionValue as current progress for complete objectives', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      Response: {
        profileRecords: {
          data: { records: { '1': { state: 4, objectives: [{ progress: 0, completionValue: 5, complete: true }] } } },
        },
      },
    }))
    const progress = await fetchPlayerProgress(player)
    expect(progress['1'].objectives).toEqual([{ current: 5, completionValue: 5 }])
  })

  it('merges character records on top of profile records', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      Response: {
        profileRecords: { data: { records: { '1': { state: 4, objectives: [{ progress: 1, completionValue: 5 }] } } } },
        characterRecords: {
          data: {
            char1: { records: { '1': { state: 0 } } },
          },
        },
      },
    }))
    const progress = await fetchPlayerProgress(player)
    expect(progress['1'].completed).toBe(true)
  })

  it('does not downgrade an already-completed record from a later character entry', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      Response: {
        profileRecords: { data: { records: { '1': { state: 0 } } } },
        characterRecords: {
          data: {
            char1: { records: { '1': { state: 4, objectives: [{ progress: 0, completionValue: 5 }] } } },
          },
        },
      },
    }))
    const progress = await fetchPlayerProgress(player)
    expect(progress['1'].completed).toBe(true)
  })

  it('handles missing profileRecords and characterRecords gracefully', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ Response: {} }))
    const progress = await fetchPlayerProgress(player)
    expect(progress).toEqual({})
  })
})

describe('fetchPlayerCompletedRecords', () => {
  const player: ResolvedPlayer = { name: 'Alice', tag: 'Alice#1234', membershipType: 3, membershipId: '111' }

  beforeEach(() => {
    mockFetch.mockReset()
    process.env.BUNGIE_API_KEY = 'test-key'
  })

  it('returns only the IDs of completed records', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      Response: {
        profileRecords: {
          data: {
            records: {
              '1': { state: 0 },
              '2': { state: 4, objectives: [{ progress: 1, completionValue: 5 }] },
            },
          },
        },
      },
    }))
    const ids = await fetchPlayerCompletedRecords(player)
    expect(ids).toEqual(['1'])
  })
})
