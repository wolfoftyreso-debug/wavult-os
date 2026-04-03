/**
 * useVisaAlerts — returnerar aktiva alerts baserat på live-data från API.
 * Fallback: tom array om API inte svarar. Ingen hårdkodad data.
 */

import { useState, useEffect } from 'react'
import { useApi } from '../../shared/auth/useApi'
import type { VisaDeadline } from './useVisaData'

export interface VisaAlert {
  id:       string
  person:   string
  message:  string
  severity: 'critical' | 'warning' | 'info'
}

export function useVisaAlerts(): VisaAlert[] {
  const { apiFetch } = useApi()
  const [alerts, setAlerts] = useState<VisaAlert[]>([])

  useEffect(() => {
    let cancelled = false

    async function fetchDeadlines() {
      try {
        const res = await apiFetch('/v1/visa/deadlines')
        if (!res.ok || cancelled) return

        const data: VisaDeadline[] | { data: VisaDeadline[] } = await res.json()
        const deadlines: VisaDeadline[] = Array.isArray(data) ? data : data.data ?? []

        if (cancelled) return

        const mapped: VisaAlert[] = deadlines.map(d => {
          const daysLeft = Math.ceil(
            (new Date(d.due_date).getTime() - Date.now()) / 86_400_000
          )
          const severity: VisaAlert['severity'] =
            d.severity ?? (daysLeft < 7 ? 'critical' : daysLeft < 30 ? 'warning' : 'info')

          return {
            id:       d.id,
            person:   d.person_name,
            message:  daysLeft > 0
              ? `${d.description} — om ${daysLeft} dagar`
              : `${d.description} — passerat`,
            severity,
          }
        })

        setAlerts(mapped)
      } catch {
        // Tyst fallback — visa inga alerts vid API-fel
        if (!cancelled) setAlerts([])
      }
    }

    fetchDeadlines()

    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return alerts
}
