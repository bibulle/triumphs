import { describe, it, expect } from 'vitest'
import { TRIUMPHS, PLAYERS, PLAYER_TAG, CAT_FR, SUB_FR, getMockProgress } from './mock.js'

describe('TRIUMPHS', () => {
  it('has 204 triumphs', () => {
    expect(TRIUMPHS).toHaveLength(204)
  })

  it('assigns unique ids', () => {
    const ids = TRIUMPHS.map(t => t.id)
    expect(new Set(ids).size).toBe(TRIUMPHS.length)
  })

  it('every triumph has non-empty en and fr titles', () => {
    TRIUMPHS.forEach(t => {
      expect(t.en.length).toBeGreaterThan(0)
      expect(t.fr.length).toBeGreaterThan(0)
    })
  })

  it('groupKey matches cat|sub', () => {
    TRIUMPHS.forEach(t => {
      expect(t.groupKey).toBe(`${t.cat}|${t.sub}`)
    })
  })
})

describe('PLAYERS', () => {
  it('has 3 players', () => {
    expect(PLAYERS).toHaveLength(3)
  })

  it('every player has a tag', () => {
    PLAYERS.forEach(p => {
      expect(PLAYER_TAG[p]).toBeTruthy()
    })
  })
})

describe('CAT_FR / SUB_FR', () => {
  it('has 5 categories', () => {
    expect(Object.keys(CAT_FR)).toHaveLength(5)
  })

  it('every triumph cat has a French label', () => {
    const cats = new Set(TRIUMPHS.map(t => t.cat))
    cats.forEach(cat => {
      expect(CAT_FR[cat]).toBeTruthy()
    })
  })

  it('every triumph groupKey has a French sub-label', () => {
    const keys = new Set(TRIUMPHS.map(t => t.groupKey))
    keys.forEach(key => {
      expect(SUB_FR[key]).toBeTruthy()
    })
  })
})

describe('getMockProgress', () => {
  it('returns an entry for each player', () => {
    const progress = getMockProgress()
    PLAYERS.forEach(p => {
      expect(progress[p]).toBeDefined()
      expect(Array.isArray(progress[p])).toBe(true)
    })
  })

  it('all ids in progress are valid triumph ids', () => {
    const validIds = new Set(TRIUMPHS.map(t => t.id))
    const progress = getMockProgress()
    PLAYERS.forEach(p => {
      progress[p].forEach(id => {
        expect(validIds.has(id)).toBe(true)
      })
    })
  })
})
