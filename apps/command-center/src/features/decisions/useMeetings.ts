import { useState, useEffect, useCallback } from 'react'
import { useApi } from '../../shared/auth/useApi'
import type { Meeting } from './decisionTypes'

export function useMeetings() {
  const { apiFetch } = useApi()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/decisions/meetings')
      if (res.ok) {
        const data = await res.json() as Meeting[]
        setMeetings(data)
      }
    } catch {} finally { setLoading(false) }
  }, [apiFetch])

  useEffect(() => { void load() }, [load])

  const createMeeting = async (meeting: Partial<Meeting>) => {
    try {
      const res = await apiFetch('/api/decisions/meetings', {
        method: 'POST',
        body: JSON.stringify(meeting)
      })
      if (res.ok) await load()
    } catch {}
  }

  return { meetings, loading, reload: load, createMeeting }
}
