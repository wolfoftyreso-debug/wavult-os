// ─── Apifly Admin — Data hooks ────────────────────────────────────────────────

import { useState, useEffect } from 'react'

const API_BASE = 'https://api.wavult.com'

export interface ApiflyStats {
  total_customers: string
  pro_customers: string
  enterprise_customers: string
  active_keys: string
  calls_24h: string
  calls_30d: string
  revenue_30d: string
}

export interface ApiflyAdminCustomer {
  id: string
  email: string
  name: string | null
  plan: 'starter' | 'pro' | 'enterprise'
  status: 'active' | 'pending' | 'suspended'
  api_calls_this_month: number
  api_calls_limit: number
  key_count: string
  calls_30d: string
  created_at: string
  updated_at: string
}

export function useApiflyAdmin() {
  const [stats, setStats] = useState<ApiflyStats | null>(null)
  const [customers, setCustomers] = useState<ApiflyAdminCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [sRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/v1/apifly/admin/stats`),
        fetch(`${API_BASE}/v1/apifly/admin/customers`),
      ])
      if (!sRes.ok || !cRes.ok) throw new Error('Hämtning misslyckades')
      const [s, c] = await Promise.all([sRes.json(), cRes.json()])
      setStats(s)
      setCustomers(c)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  return { stats, customers, loading, error, refresh: fetchAll }
}
