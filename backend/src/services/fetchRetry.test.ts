import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchWithRetry } from './fetchRetry.js'

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('fetchWithRetry', () => {
  it('returns the response on success', async () => {
    const mockRes = { ok: true, status: 200 } as Response
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockRes))

    const res = await fetchWithRetry('https://example.com')
    expect(res).toBe(mockRes)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('retries on network error with backoff', async () => {
    const mockRes = { ok: true, status: 200 } as Response
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue(mockRes)
    vi.stubGlobal('fetch', mockFetch)

    const res = await fetchWithRetry('https://example.com', { retries: 3 })
    expect(res).toBe(mockRes)
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('throws after exhausting retries', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))

    await expect(
      fetchWithRetry('https://example.com', { retries: 2 })
    ).rejects.toThrow('down')
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('retries on 429 and respects Retry-After header', async () => {
    const headers = new Map([['Retry-After', '1']])
    const rateLimited = { ok: false, status: 429, headers: { get: (k: string) => headers.get(k) } } as unknown as Response
    const success = { ok: true, status: 200 } as Response
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(rateLimited)
      .mockResolvedValue(success))

    const res = await fetchWithRetry('https://example.com', { retries: 2 })
    expect(res).toBe(success)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('returns 429 response when retries are exhausted', async () => {
    const headers = new Map([['Retry-After', '1']])
    const rateLimited = { ok: false, status: 429, headers: { get: (k: string) => headers.get(k) } } as unknown as Response
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rateLimited))

    const res = await fetchWithRetry('https://example.com', { retries: 1 })
    expect(res.status).toBe(429)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('aborts on timeout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      return new Promise((_, reject) => {
        opts.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted')
          err.name = 'AbortError'
          reject(err)
        })
      })
    }))

    await expect(
      fetchWithRetry('https://example.com', { timeoutMs: 100, retries: 0 })
    ).rejects.toThrow('aborted')
  })

  it('passes through fetch options', async () => {
    const mockRes = { ok: true, status: 200 } as Response
    const mockFetch = vi.fn().mockResolvedValue(mockRes)
    vi.stubGlobal('fetch', mockFetch)

    await fetchWithRetry('https://example.com', {
      method: 'POST',
      headers: { 'X-API-Key': 'test' },
      body: '{}',
    })

    const call = mockFetch.mock.calls[0]
    expect(call[0]).toBe('https://example.com')
    expect(call[1].method).toBe('POST')
    expect(call[1].headers).toEqual({ 'X-API-Key': 'test' })
    expect(call[1].body).toBe('{}')
  })

  it('does not retry non-429 HTTP errors', async () => {
    const mockRes = { ok: false, status: 503 } as Response
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockRes))

    const res = await fetchWithRetry('https://example.com', { retries: 3 })
    expect(res.status).toBe(503)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
