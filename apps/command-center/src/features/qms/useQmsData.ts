/**
 * useQmsData — reaktiv hook för QMS-modulen
 * Hämtar all data live från API Core. Ingen hårdkodad data.
 */

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '../../shared/auth/useApi'
import type {
  QmsEntity,
  IsoStandard,
  IsoControl,
  QmsDashboardData,
  QmsImplementation,
  SystemMapping,
  AuditSession,
  QmsStatus,
} from './qmsTypes'

// ─── Entities hook ────────────────────────────────────────────────────────────

export interface UseQmsEntitiesResult {
  entities: QmsEntity[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useQmsEntities(): UseQmsEntitiesResult {
  const { apiFetch } = useApi()
  const [entities, setEntities] = useState<QmsEntity[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [tick, setTick]         = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch('/v1/qms/entities')
      .then(r => r.json())
      .then(data => { if (!cancelled) setEntities(data) })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tick])

  return { entities, loading, error, refetch }
}

// ─── Dashboard hook ───────────────────────────────────────────────────────────

export interface UseQmsDashboardResult {
  dashboard: QmsDashboardData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useQmsDashboard(entitySlug: string | null): UseQmsDashboardResult {
  const { apiFetch } = useApi()
  const [dashboard, setDashboard] = useState<QmsDashboardData | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [tick, setTick]           = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!entitySlug) return
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch(`/v1/qms/${entitySlug}/dashboard`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setDashboard(data) })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [entitySlug, tick])

  return { dashboard, loading, error, refetch }
}

// ─── Controls hook ────────────────────────────────────────────────────────────

export interface UseQmsControlsResult {
  controls: IsoControl[]
  standards: IsoStandard[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useQmsControls(
  entitySlug: string | null,
  standardCode?: string,
  category?: string
): UseQmsControlsResult {
  const { apiFetch } = useApi()
  const [controls, setControls]   = useState<IsoControl[]>([])
  const [standards, setStandards] = useState<IsoStandard[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [tick, setTick]           = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!entitySlug) return
    let cancelled = false
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (standardCode) params.set('standard', standardCode)
    if (category)     params.set('category', category)
    const qs = params.toString() ? `?${params.toString()}` : ''

    Promise.all([
      apiFetch(`/v1/qms/${entitySlug}/controls${qs}`).then(r => r.json()),
      apiFetch(`/v1/qms/${entitySlug}/standards`).then(r => r.json()),
    ])
      .then(([ctrlData, stdData]) => {
        if (!cancelled) {
          setControls(ctrlData)
          setStandards(stdData)
        }
      })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [entitySlug, standardCode, category, tick])

  return { controls, standards, loading, error, refetch }
}

// ─── Single control detail hook ───────────────────────────────────────────────

export interface UseQmsControlDetailResult {
  control: IsoControl | null
  loading: boolean
  error: string | null
  refetch: () => void
  updateImplementation: (updates: Partial<QmsImplementation>) => Promise<void>
}

export function useQmsControlDetail(
  entitySlug: string | null,
  controlId: string | null
): UseQmsControlDetailResult {
  const { apiFetch } = useApi()
  const [control, setControl] = useState<IsoControl | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [tick, setTick]       = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!entitySlug || !controlId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch(`/v1/qms/${entitySlug}/controls/${controlId}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setControl(data) })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [entitySlug, controlId, tick])

  const updateImplementation = useCallback(async (updates: Partial<QmsImplementation>) => {
    if (!entitySlug || !controlId) return
    await apiFetch(`/v1/qms/${entitySlug}/controls/${controlId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    refetch()
  }, [entitySlug, controlId, refetch])

  return { control, loading, error, refetch, updateImplementation }
}

// ─── Audit sessions hook ──────────────────────────────────────────────────────

export interface UseQmsAuditResult {
  sessions: AuditSession[]
  loading: boolean
  error: string | null
  refetch: () => void
  startSession: (data: { audit_type?: string; auditor_name?: string; auditor_org?: string; notes?: string }) => Promise<void>
}

export function useQmsAudit(entitySlug: string | null): UseQmsAuditResult {
  const { apiFetch } = useApi()
  const [sessions, setSessions] = useState<AuditSession[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [tick, setTick]         = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!entitySlug) return
    let cancelled = false
    setLoading(true)
    apiFetch(`/v1/qms/${entitySlug}/audit`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setSessions(data) })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [entitySlug, tick])

  const startSession = useCallback(async (data: any) => {
    if (!entitySlug) return
    await apiFetch(`/v1/qms/${entitySlug}/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    refetch()
  }, [entitySlug, refetch])

  return { sessions, loading, error, refetch, startSession }
}

// ─── useReadinessDashboard ────────────────────────────────────────────────────
export interface ReadinessCriterion {
  criterion_code: string
  category: string
  description: string
  is_met: boolean
  met_at: string | null
  check_type: string
}

export interface ReadinessDashboard {
  readiness_pct: number
  criteria_met: number
  criteria_total: number
  booking_triggered: boolean
  last_checked: string | null
  criteria: ReadinessCriterion[]
  history: { checked_at: string; readiness_pct: number }[]
  target_dates: { thailand: string; pre_assessment: string; full_certification: string }
}

export function useReadinessDashboard() {
  const { apiFetch } = useApi()
  const [data, setData] = useState<ReadinessDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiFetch('/v1/qms/readiness')
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tick])

  return { data, loading, error, refetch }
}
