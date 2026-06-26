import { useState, useEffect, useRef } from 'react'
import { fetchVersion } from '../api'

const INTERVAL = 5 * 60 * 1000

export function useVersionCheck(): boolean {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const baseVersion = useRef<string | null>(null)

  useEffect(() => {
    fetchVersion()
      .then(v => { baseVersion.current = v })
      .catch(() => {})

    const id = setInterval(async () => {
      try {
        const v = await fetchVersion()
        if (baseVersion.current && v !== baseVersion.current) {
          setUpdateAvailable(true)
        }
      } catch {
        // silently ignore
      }
    }, INTERVAL)

    return () => clearInterval(id)
  }, [])

  return updateAvailable
}
