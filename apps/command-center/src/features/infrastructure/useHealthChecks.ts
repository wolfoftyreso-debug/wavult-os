// ─── Wavult OS — Live Infrastructure Health Hook ─────────────────────────────
// Hämtar live status från /v1/infrastructure/health var 30s
// Returnerar: results, loading, lastRun, refresh, error

import { useState, useEffect, useCallback, useRef } from 'react'
import type { HealthCheckResult, ServiceStatus } from './infraTypes'

const API_BASE =
  (import.meta as Record<string, unknown> & { env?: Record<string, string> }).env
    ?.VITE_API_URL ?? 'https://api.wavult.com'

const ENDPOINT = `${API_BASE}/v1/infrastructure/health`
const POLL_INTERVAL_MS = 30_000

// ─── Raw API shape ────────────────────────────────────────────────────────────

interface RawService {
  id: string
  status: ServiceStatus
  latency: number | null
  runningCount?: number
  desiredCount?: number
  pendingCount?: number
  lastEvent?: string
  region?: string
}

interface RawResponse {
  timestamp: string
  services: RawService[]
  summary: {
    total: number
    operational: number
    degraded: number
    down: number
    unknown: number
  }
  errors?: {
    ecs: string | null
    cloudfront: string | null
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseHealthChecksResult {
  results: Record<string, HealthCheckResult>
  loading: boolean
  lastRun: string | null
  refresh: () => void
  error: string | null
}

export function useHealthChecks(): UseHealthChecksResult {
  const [results, setResults]   = useState<Record<string, HealthCheckResult>>({})
  const [loading, setLoading]   = useState(true)
  const [lastRun, setLastRun]   = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchHealth = useCallback(async () => {
    try {
      const startMs = Date.now()
      const res = await fetch(ENDPOINT, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data: RawResponse = await res.json()
      const now = new Date().toISOString()

      const mapped: Record<string, HealthCheckResult> = {}
      for (const svc of data.services) {
        mapped[svc.id] = {
          serviceId:   svc.id,
          status:      svc.status,
          latency:     svc.latency ?? (Date.now() - startMs),
          lastChecked: now,
          httpStatus:  res.status,
          error:       undefined,
        }
      }

      setResults(mapped)
      setLastRun(data.timestamp)
      setError(
        data.errors?.ecs || data.errors?.cloudfront
          ? [data.errors.ecs, data.errors.cloudfront].filter(Boolean).join(' | ')
          : null
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      // Don't clear results — keep last known state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
    intervalRef.current = setInterval(fetchHealth, POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchHealth])

  return { results, loading, lastRun, refresh: fetchHealth, error }
}

// ─── Helpers (re-exported for InfrastructureDashboard) ───────────────────────

export function statusLabel(status: ServiceStatus): string {
  const labels: Record<ServiceStatus, string> = {
    operational: 'Operational',
    degraded:    'Degraded',
    down:        'Down',
    unknown:     'Unknown',
    maintenance: 'Underhåll',
  }
  return labels[status] ?? status
}

export function mergeStatus(a: ServiceStatus | string, b: HealthCheckResult): ServiceStatus {
  const checkStatus = b.status
  const combined = [a as ServiceStatus, checkStatus]
  if (combined.includes('down'))        return 'down'
  if (combined.includes('degraded'))    return 'degraded'
  if (combined.includes('maintenance')) return 'maintenance'
  if (combined.includes('unknown'))     return 'unknown'
  return 'operational'
}
