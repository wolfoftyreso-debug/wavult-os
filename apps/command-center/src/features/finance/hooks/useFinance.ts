import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  supabase,
  type FinanceEntity,
  type FinanceAccount,
  type FinanceLedgerEntry,
  type FinanceInvoice,
  type FinanceCashFlow,
  type FinanceKpi,
  type FinanceIntercompany,
  type FinanceTaxPeriod,
} from '../../../lib/supabase'

// ─── Finance Entities ─────────────────────────────────────────────────────────

export function useFinanceEntities() {
  return useQuery({
    queryKey: ['finance-entities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_entities')
        .select('*')
        .order('name')
      // Don't throw — return empty array so UI falls back to mockData gracefully
      if (error) {
        console.warn('[Finance] finance_entities query error:', error.message)
        return [] as FinanceEntity[]
      }
      return (data || []) as FinanceEntity[]
    },
    staleTime: 1000 * 60 * 5, // 5 min — entities rarely change
  })
}

// ─── Finance KPIs ─────────────────────────────────────────────────────────────

export function useFinanceKpis(period?: string) {
  return useQuery({
    queryKey: ['finance-kpis', period],
    queryFn: async () => {
      let query = supabase.from('finance_kpis').select('*').order('entity_id')
      if (period) query = query.eq('period', period)
      const { data, error } = await query
      if (error) {
        console.warn('[Finance] finance_kpis query error:', error.message)
        return [] as FinanceKpi[]
      }
      return (data || []) as FinanceKpi[]
    },
  })
}

export function useUpsertFinanceKpi() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (kpi: Omit<FinanceKpi, 'id' | 'result' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('finance_kpis')
        .upsert(kpi, { onConflict: 'entity_id,period' })
        .select()
        .single()
      if (error) throw error
      return data as FinanceKpi
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-kpis'] }),
  })
}

// ─── Finance Ledger ───────────────────────────────────────────────────────────

type LedgerFilters = {
  entityId?: string
  dateFrom?: string
  dateTo?: string
  currency?: string
  accountNr?: string
  refNr?: string
}

export function useFinanceLedger(filters?: LedgerFilters) {
  return useQuery({
    queryKey: ['finance-ledger', filters],
    queryFn: async () => {
      let query = supabase
        .from('finance_ledger')
        .select('*')
        .order('date', { ascending: false })

      if (filters?.entityId) query = query.eq('entity_id', filters.entityId)
      if (filters?.dateFrom)  query = query.gte('date', filters.dateFrom)
      if (filters?.dateTo)    query = query.lte('date', filters.dateTo)
      if (filters?.currency)  query = query.eq('currency', filters.currency)
      if (filters?.accountNr) query = query.ilike('account_nr', `%${filters.accountNr}%`)
      if (filters?.refNr)     query = query.ilike('ref_nr', `%${filters.refNr}%`)

      const { data, error } = await query
      if (error) {
        console.warn('[Finance] finance_ledger query error:', error.message)
        return [] as FinanceLedgerEntry[]
      }
      return (data || []) as FinanceLedgerEntry[]
    },
  })
}

export function useCreateLedgerEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (entry: Omit<FinanceLedgerEntry, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('finance_ledger')
        .insert(entry)
        .select()
        .single()
      if (error) throw error
      return data as FinanceLedgerEntry
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-ledger'] }),
  })
}

// ─── Finance Accounts ─────────────────────────────────────────────────────────

export function useFinanceAccounts(entityId?: string) {
  return useQuery({
    queryKey: ['finance-accounts', entityId],
    queryFn: async () => {
      let query = supabase
        .from('finance_accounts')
        .select('*')
        .order('account_nr')
      if (entityId) query = query.eq('entity_id', entityId)
      const { data, error } = await query
      if (error) {
        console.warn('[Finance] finance_accounts query error:', error.message)
        return [] as FinanceAccount[]
      }
      return (data || []) as FinanceAccount[]
    },
    staleTime: 1000 * 60 * 2,
  })
}

// ─── Finance Invoices ─────────────────────────────────────────────────────────

type InvoiceFilters = {
  entityId?: string
  status?: FinanceInvoice['status']
}

export function useFinanceInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: ['finance-invoices', filters],
    queryFn: async () => {
      let query = supabase
        .from('finance_invoices')
        .select('*')
        .order('issue_date', { ascending: false })
      if (filters?.entityId) query = query.eq('entity_id', filters.entityId)
      if (filters?.status)   query = query.eq('status', filters.status)
      const { data, error } = await query
      if (error) {
        console.warn('[Finance] finance_invoices query error:', error.message)
        return [] as FinanceInvoice[]
      }
      return (data || []) as FinanceInvoice[]
    },
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (invoice: Omit<FinanceInvoice, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('finance_invoices')
        .insert(invoice)
        .select()
        .single()
      if (error) throw error
      return data as FinanceInvoice
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-invoices'] }),
  })
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FinanceInvoice['status'] }) => {
      const { data, error } = await supabase
        .from('finance_invoices')
        .update({ status })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as FinanceInvoice
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-invoices'] }),
  })
}

// ─── Finance Cash Flow ────────────────────────────────────────────────────────

export function useFinanceCashFlow(entityId?: string, year?: number) {
  return useQuery({
    queryKey: ['finance-cashflow', entityId, year],
    queryFn: async () => {
      let query = supabase
        .from('finance_cashflow')    // correct table name: finance_cashflow (no underscore between cash and flow)
        .select('*')
        .order('period_year', { ascending: true })
      if (entityId) query = query.eq('entity_id', entityId)
      if (year)     query = query.eq('period_year', year)
      const { data, error } = await query
      if (error) {
        console.warn('[Finance] finance_cashflow query error:', error.message)
        return [] as FinanceCashFlow[]
      }
      return (data || []) as FinanceCashFlow[]
    },
  })
}

// ─── Finance Intercompany ─────────────────────────────────────────────────────

export function useFinanceIntercompany() {
  return useQuery({
    queryKey: ['finance-intercompany'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_intercompany')
        .select('*')
        .order('date', { ascending: false })
      if (error) {
        console.warn('[Finance] finance_intercompany query error:', error.message)
        return [] as FinanceIntercompany[]
      }
      return (data || []) as FinanceIntercompany[]
    },
  })
}

export function useUpdateIntercompanyStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FinanceIntercompany['status'] }) => {
      const { data, error } = await supabase
        .from('finance_intercompany')
        .update({ status })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as FinanceIntercompany
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-intercompany'] }),
  })
}

// ─── Finance Tax Periods ──────────────────────────────────────────────────────

export function useFinanceTaxPeriods(entityId?: string) {
  return useQuery({
    queryKey: ['finance-tax-periods', entityId],
    queryFn: async () => {
      let query = supabase
        .from('finance_tax_periods')
        .select('*')
        .order('due_date', { ascending: true })
      if (entityId) query = query.eq('entity_id', entityId)
      const { data, error } = await query
      if (error) {
        console.warn('[Finance] finance_tax_periods query error:', error.message)
        return [] as FinanceTaxPeriod[]
      }
      return (data || []) as FinanceTaxPeriod[]
    },
  })
}

export function useUpdateTaxPeriodStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FinanceTaxPeriod['status'] }) => {
      const { data, error } = await supabase
        .from('finance_tax_periods')
        .update({ status })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as FinanceTaxPeriod
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-tax-periods'] }),
  })
}

// ─── Legacy hook (kept for backward compat) ───────────────────────────────────

export { useFinanceLedger as useLedgerEntries }
