/**
 * useWavultAPI — reactive data-fetching hook for Wavult OS
 *
 * Wraps apiFetch with useState/useEffect so components get
 * { data, loading, error, refetch } without boilerplate.
 *
 * Usage:
 *   const { data, loading, error } = useWavultAPI<ResponseType>('/v1/endpoint')
 */

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '../auth/useApi'

interface UseWavultAPIOptions extends RequestInit {
  skip?: boolean
}

interface UseWavultAPIResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useWavultAPI<T>(
  path: string,
  options?: UseWavultAPIOptions
): UseWavultAPIResult<T> {
  const { apiFetch } = useApi()
  const [data, setData]       = useState<T | null>(null)
  const [loading, setLoading] = useState(!options?.skip)
  const [error, setError]     = useState<string | null>(null)

  const { skip, ...fetchOptions } = options ?? {}

  const load = useCallback(async () => {
    if (skip) return
    setLoading(true)
    setError(null)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000) // 8s timeout — aldrig hänger
    try {
      const res = await apiFetch(path, { ...fetchOptions, signal: controller.signal })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const json = await res.json() as T
      setData(json)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Timeout — API svarade inte')
      } else {
        setError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFetch, path, skip])

  useEffect(() => { void load() }, [load])

  return { data, loading, error, refetch: load }
}
