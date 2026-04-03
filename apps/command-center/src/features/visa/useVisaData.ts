/**
 * useVisaData — reaktiv hook för Visa-modulen
 * Hämtar all data live från API Core. Ingen hårdkodad data.
 */

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '../../shared/auth/useApi'
import type { VisaApplication } from './visaTypes'

export interface VisaMember {
  id:          string
  name:        string
  email?:      string
  visa_status?: string
  initials?:   string
  color?:      string
}

export interface VisaDeadline {
  id:              string
  application_id:  string
  person_id:       string
  person_name:     string
  description:     string
  due_date:        string
  type:            'document' | 'submission' | 'appointment' | 'other'
  severity?:       'critical' | 'warning' | 'info'
}

export interface UseVisaDataResult {
  applications: VisaApplication[]
  members:      VisaMember[]
  deadlines:    VisaDeadline[]
  loading:      boolean
  error:        string | null
  refetch:      () => void
}

export function useVisaData(): UseVisaDataResult {
  const { apiFetch } = useApi()

  const [applications, setApplications] = useState<VisaApplication[]>([])
  const [members,      setMembers]      = useState<VisaMember[]>([])
  const [deadlines,    setDeadlines]    = useState<VisaDeadline[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [tick,         setTick]         = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false

    async function fetchAll() {
      setLoading(true)
      setError(null)

      try {
        const [appsRes, membersRes, deadlinesRes] = await Promise.all([
          apiFetch('/v1/visa/applications'),
          apiFetch('/v1/visa/members'),
          apiFetch('/v1/visa/deadlines'),
        ])

        if (cancelled) return

        if (!appsRes.ok) {
          if (appsRes.status === 404) {
            // Inga ansökningar registrerade ännu
            setApplications([])
          } else {
            throw new Error(`API svarade ${appsRes.status} för /v1/visa/applications`)
          }
        } else {
          const appsData = await appsRes.json()
          setApplications(Array.isArray(appsData) ? appsData : appsData.data ?? [])
        }

        if (membersRes.ok) {
          const membersData = await membersRes.json()
          setMembers(Array.isArray(membersData) ? membersData : membersData.data ?? [])
        } else {
          setMembers([])
        }

        if (deadlinesRes.ok) {
          const deadlinesData = await deadlinesRes.json()
          setDeadlines(Array.isArray(deadlinesData) ? deadlinesData : deadlinesData.data ?? [])
        } else {
          setDeadlines([])
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Okänt fel vid datahämtning'
          setError(msg)
          // Fallback: tom state
          setApplications([])
          setMembers([])
          setDeadlines([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAll()

    return () => { cancelled = true }
  }, [tick]) // eslint-disable-line react-hooks/exhaustive-deps

  return { applications, members, deadlines, loading, error, refetch }
}
