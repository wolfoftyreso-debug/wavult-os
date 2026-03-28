import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://znmxtnxxjpmgtycmsqjv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubXh0bnh4anBtZ3R5Y21zcWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4ODA2NjUsImV4cCI6MjA4OTQ1NjY2NX0.3LzBF2cE95X0vtW-5LwfJu8iGebnE9AUXglHchMPH60'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── Legacy LedgerEntry type (kept for backward compat) ──────────────────────

export type LedgerEntry = {
  id: string
  date: string
  description: string | null
  amount: number
  currency: string
  type: string
  entity_id: string | null
  created_at: string
}

// ─── Finance Types ────────────────────────────────────────────────────────────

export type FinanceEntity = {
  id: string
  name: string
  short_name: string
  currency: string
  org_nr: string | null
  jurisdiction: string
  color: string
  created_at: string
  updated_at: string
}

export type FinanceAccount = {
  id: string
  account_nr: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  group_name: string
  entity_id: string
  balance: number
  currency: string
  created_at: string
  updated_at: string
}

export type FinanceLedgerEntry = {
  id: string
  date: string
  description: string | null
  account_id: string | null
  account_nr: string | null
  account_name: string | null
  debit: number
  credit: number
  balance: number
  entity_id: string
  currency: string
  ref_nr: string | null
  created_at: string
  updated_at: string
}

export type FinanceInvoice = {
  id: string
  number: string
  recipient: string
  recipient_email: string | null
  entity_id: string
  currency: string
  amount: number
  tax: number
  total: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  issue_date: string | null
  due_date: string | null
  description: string | null
  lines: InvoiceLine[]
  created_at: string
  updated_at: string
}

export type InvoiceLine = {
  description: string
  qty: number
  unitPrice: number
  total: number
}

export type FinanceCashFlow = {
  id: string
  month: string
  inflow: number
  outflow: number
  net: number
  entity_id: string
  currency: string
  period_year: number
  created_at: string
}

export type FinanceKpi = {
  id: string
  entity_id: string
  period: string
  revenue: number
  expenses: number
  result: number
  cash: number
  currency: string
  budget_revenue: number
  budget_expenses: number
  created_at: string
  updated_at: string
}

export type FinanceIntercompany = {
  id: string
  from_entity_id: string
  to_entity_id: string
  type: 'management_fee' | 'ip_license' | 'loan' | 'service'
  description: string
  amount: number
  currency: string
  date: string
  status: 'pending' | 'invoiced' | 'settled'
  created_at: string
  updated_at: string
}

export type FinanceTaxPeriod = {
  id: string
  entity_id: string
  jurisdiction: string
  period: string
  vat_rate: number
  taxable_revenue: number
  vat_owed: number
  currency: string
  status: 'unreported' | 'submitted' | 'paid'
  due_date: string | null
  created_at: string
  updated_at: string
}

// ─── CRM Types ────────────────────────────────────────────────────────────────

export type CrmContact = {
  id: string
  name: string
  company: string
  role: string | null
  email: string | null
  phone: string | null
  prospect_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type CrmProspect = {
  id: string
  company: string
  contact_name: string
  contact_id: string | null
  product: 'quiXzoom' | 'Landvex' | 'Hypbit'
  stage: 'Lead' | 'Kvalificerad' | 'Demo/Möte' | 'Offert' | 'Förhandling' | 'Vunnen' | 'Förlorad'
  value_sek: number
  last_activity: string | null
  assignee: 'Leon' | 'Dennis' | 'Erik'
  days_in_stage: number
  next_step: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type CrmDeal = {
  id: string
  prospect_id: string | null
  company: string
  product: 'quiXzoom' | 'Landvex' | 'Hypbit'
  status: 'Utkast' | 'Skickad' | 'Under förhandling' | 'Signerad' | 'Avbruten'
  value_sek: number
  start_date: string | null
  duration_months: number
  legal_doc_id: string | null
  assignee: 'Leon' | 'Dennis' | 'Erik'
  notes: string | null
  created_at: string
  updated_at: string
}

export type CrmActivity = {
  id: string
  type: 'Samtal' | 'Email' | 'Möte' | 'Demo' | 'Offert skickad' | 'Follow-up'
  prospect_id: string | null
  company: string
  by: 'Leon' | 'Dennis' | 'Erik'
  date: string
  note: string | null
  created_at: string
}

// ─── Corporate Types ──────────────────────────────────────────────────────────

export type CorpEntity = {
  id: string
  name: string
  short_name: string
  jurisdiction: string
  jurisdiction_code: string
  org_nr: string
  founded: string | null
  status: 'aktiv' | 'under bildning'
  color: string
  created_at: string
  updated_at: string
}

export type CorpBoardMeeting = {
  id: string
  company_id: string
  date: string
  type: 'styrelsemöte' | 'extra styrelsemöte' | 'skriftligt beslut'
  status: 'planerat' | 'genomfört' | 'protokoll klart'
  agenda: string[]
  decisions: string[]
  attendees: string[]
  chairperson: string
  minutes_taker: string | null
  created_at: string
  updated_at: string
}

export type CorpComplianceItem = {
  id: string
  company_id: string
  category: 'Årsredovisning' | 'Skattedeklaration' | 'Bolagsregistrering' | 'Licens' | 'Social försäkring'
  requirement: string
  deadline: string | null
  status: 'ej påbörjad' | 'pågår' | 'klar' | 'förfallen'
  owner: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type CorpJurisdictionRequirement = {
  id: string
  company_id: string
  authority: string
  requirement: string
  deadline: string | null
  status: 'ej inlämnad' | 'inlämnad' | 'betald'
  amount: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type CorpDocument = {
  id: string
  company_id: string
  name: string
  category: 'Bolagsordning' | 'Aktiebok' | 'Styrelsebeslut' | 'Avtal' | 'Registreringsbevis'
  date: string | null
  status: 'utkast' | 'signerat' | 'arkiverat'
  file_type: 'pdf' | 'docx' | 'xlsx'
  file_size: string | null
  storage_path: string | null
  created_at: string
  updated_at: string
}

// ─── CRM Types ────────────────────────────────────────────────────────────────

export type Company = {
  id: string
  name: string
  industry?: string | null
  size?: string | null
  status?: string | null
  website?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export type Contact = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  company_id?: string | null
  type?: string | null
  status?: string | null
  role?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export type Deal = {
  id: string
  name?: string | null
  contact_id?: string | null
  company_id?: string | null
  amount?: number | null
  currency: string
  stage?: string | null
  status?: string | null
  close_date?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}
