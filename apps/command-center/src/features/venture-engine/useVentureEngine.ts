// ─── Venture Engine — data hooks ─────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '../../shared/auth/useApi'
import type {
  Opportunity,
  Venture,
  Investment,
  SystemImpact,
  VentureStats,
} from './types'

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------

export function useOpportunities(industry?: string, status?: string) {
  const { apiFetch } = useApi()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (industry) params.set('industry', industry)
      if (status) params.set('status', status)
      const qs = params.toString()
      const res = await apiFetch(`/api/venture-engine/opportunities${qs ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as Opportunity[]
      setOpportunities(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load opportunities')
    } finally {
      setLoading(false)
    }
  }, [apiFetch, industry, status])

  useEffect(() => { void load() }, [load])

  return { opportunities, loading, error, reload: load }
}

export function useValidateOpportunity() {
  const { apiFetch } = useApi()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function validate(id: string): Promise<Opportunity | null> {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/venture-engine/opportunities/${id}/validate`, { method: 'PUT' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json() as Opportunity
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { validate, loading, error }
}

export function useCreateOpportunity() {
  const { apiFetch } = useApi()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create(body: Partial<Opportunity>): Promise<Opportunity | null> {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/api/venture-engine/opportunities', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json() as Opportunity
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { create, loading, error }
}

// ---------------------------------------------------------------------------
// Ventures
// ---------------------------------------------------------------------------

export function useVentures() {
  const { apiFetch } = useApi()
  const [ventures, setVentures] = useState<Venture[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/api/venture-engine/ventures')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as Venture[]
      setVentures(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ventures')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => { void load() }, [load])

  return { ventures, loading, error, reload: load }
}

export function useCreateVenture() {
  const { apiFetch } = useApi()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create(body: Partial<Venture>): Promise<Venture | null> {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/api/venture-engine/ventures', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json() as Venture
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create venture failed')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { create, loading, error }
}

// ---------------------------------------------------------------------------
// Capital / Investments
// ---------------------------------------------------------------------------

export function useCapital() {
  const { apiFetch } = useApi()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/api/venture-engine/capital')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as Investment[]
      setInvestments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load capital')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => { void load() }, [load])

  return { investments, loading, error, reload: load }
}

export function useAllocateCapital() {
  const { apiFetch } = useApi()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function allocate(body: { venture_id: string; amount: number; burn_rate?: number }): Promise<Investment | null> {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/api/venture-engine/capital/allocate', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json() as Investment
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Allocation failed')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { allocate, loading, error }
}

// ---------------------------------------------------------------------------
// System Impact
// ---------------------------------------------------------------------------

export function useSystemImpact() {
  const { apiFetch } = useApi()
  const [impact, setImpact] = useState<SystemImpact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/api/venture-engine/impact')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as SystemImpact[]
      setImpact(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load impact data')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => { void load() }, [load])

  return { impact, loading, error, reload: load }
}

// ---------------------------------------------------------------------------
// Stats (summary)
// ---------------------------------------------------------------------------

export function useVentureStats() {
  const { apiFetch } = useApi()
  const [stats, setStats] = useState<VentureStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/api/venture-engine/stats')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as VentureStats
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => { void load() }, [load])

  return { stats, loading, error, reload: load }
}
