const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_RETRIES = 3
const INITIAL_BACKOFF_MS = 1_000

interface FetchRetryOptions extends RequestInit {
  timeoutMs?: number
  retries?: number
}

export async function fetchWithRetry(url: string, options: FetchRetryOptions = {}): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES, ...fetchOptions } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, { ...fetchOptions, signal: controller.signal })

      if (res.status === 429 && attempt < retries) {
        const retryAfter = res.headers.get('Retry-After')
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : INITIAL_BACKOFF_MS * 2 ** attempt
        console.warn(`[fetch] 429 on ${url}, retry in ${waitMs}ms (${attempt + 1}/${retries})`)
        await new Promise(r => setTimeout(r, waitMs))
        continue
      }

      return res
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < retries) {
        const waitMs = INITIAL_BACKOFF_MS * 2 ** attempt
        const reason = lastError.name === 'AbortError' ? 'timeout' : lastError.message
        console.warn(`[fetch] ${reason}, retry in ${waitMs}ms (${attempt + 1}/${retries})`)
        await new Promise(r => setTimeout(r, waitMs))
      }
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError ?? new Error('fetch failed after retries')
}
