// ─── Wavult OS — Live Health Check Hook ──────────────────────────────────────
// Hämtar live infrastruktur-status från API var 60s

import { useState, useEffect, useCallback } from 'react'

export interface ServiceHealth {
  id: string
  name: string
  status: 'operational' | 'degraded' | 'down' | 'unknown'
  running: number
  desired: number
  lastChecked: string
}

export function useHealthChecks() {
  const [services, setServices] = useState<ServiceHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('https://api.wavult.com/v1/infrastructure/health')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setServices(data.services)
      setLastChecked(new Date())
      setError(null)
    } catch (err) {
      setError(String(err))
      // Fallback to last known state, don't clear services
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 60_000) // Check every 60s
    return () => clearInterval(interval)
  }, [fetchHealth])

  return { services, loading, lastChecked, error, refetch: fetchHealth }
}

// ─── Status-etikett ───────────────────────────────────────────────────────────

export function statusLabel(status: ServiceHealth['status']): string {
  const labels: Record<ServiceHealth['status'], string> = {
    operational: 'Operational',
    degraded: 'Degraded',
    down: 'Down',
    unknown: 'Unknown',
  }
  return labels[status]
}

export function mergeStatus(a: string, b: string): string {
  if (a === 'down' || b === 'down') return 'down'
  if (a === 'degraded' || b === 'degraded') return 'degraded'
  if (a === 'unknown' || b === 'unknown') return 'unknown'
  return 'operational'
}
