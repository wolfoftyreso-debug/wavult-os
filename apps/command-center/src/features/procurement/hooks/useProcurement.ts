import { useState, useEffect, useCallback } from 'react'
import { useApi } from '../../../shared/auth/useApi'
import type { Supplier, PurchaseOrder, Contract, ApprovalRequest } from '../types'

export function useSuppliers() {
  const { apiFetch } = useApi()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/procurement/suppliers')
      if (res.ok) {
        const data = await res.json()
        if (data.length > 0) setSuppliers(data)
      }
    } catch {} finally { setLoading(false) }
  }, [apiFetch])

  useEffect(() => { void load() }, [load])
  return { suppliers, loading, reload: load }
}

export function usePurchaseOrders() {
  const { apiFetch } = useApi()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/procurement/purchase-orders')
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch {} finally { setLoading(false) }
  }, [apiFetch])

  useEffect(() => { void load() }, [load])
  return { orders, loading, reload: load }
}

export function useContracts() {
  const { apiFetch } = useApi()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/procurement/contracts')
      if (res.ok) {
        const data = await res.json()
        setContracts(data)
      }
    } catch {} finally { setLoading(false) }
  }, [apiFetch])

  useEffect(() => { void load() }, [load])
  return { contracts, loading, reload: load }
}

export function useApprovals() {
  const { apiFetch } = useApi()
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/procurement/approvals')
      if (res.ok) {
        const data = await res.json()
        setApprovals(data)
      }
    } catch {} finally { setLoading(false) }
  }, [apiFetch])

  useEffect(() => { void load() }, [load])
  return { approvals, loading, reload: load }
}
