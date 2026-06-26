import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVersionCheck } from '../hooks/useVersionCheck'
import * as api from '../api'

beforeEach(() => {
  vi.spyOn(api, 'fetchVersion').mockResolvedValue('1.0.0')
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('useVersionCheck', () => {
  it('returns false initially', async () => {
    const { result } = renderHook(() => useVersionCheck())
    expect(result.current).toBe(false)
  })

  it('returns false when version unchanged', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useVersionCheck())
    await act(async () => { await Promise.resolve() })
    await act(async () => { vi.advanceTimersByTime(5 * 60 * 1000) })
    await act(async () => { await Promise.resolve() })
    expect(result.current).toBe(false)
    vi.useRealTimers()
  })

  it('returns true when version changes', async () => {
    vi.useFakeTimers()
    vi.spyOn(api, 'fetchVersion')
      .mockResolvedValueOnce('1.0.0')
      .mockResolvedValueOnce('1.1.0')

    const { result } = renderHook(() => useVersionCheck())
    await act(async () => { await Promise.resolve() })
    await act(async () => { vi.advanceTimersByTime(5 * 60 * 1000) })
    await act(async () => { await Promise.resolve() })
    expect(result.current).toBe(true)
    vi.useRealTimers()
  })

  it('registers a polling interval', () => {
    const spy = vi.spyOn(globalThis, 'setInterval')
    const { unmount } = renderHook(() => useVersionCheck())
    const calls = spy.mock.calls.filter(([, delay]) => delay === 5 * 60 * 1000)
    expect(calls.length).toBeGreaterThan(0)
    unmount()
    spy.mockRestore()
  })
})
