// ─── Finance Module Data Types ──────────────────────────────────────────────
// Wavult Group — typstruktur utan mockdata
// All KPI-data hämtas från Supabase. Dessa arrays är tomma tills databasen är konfigurerad.

export type Currency = 'SEK' | 'EUR' | 'USD' | 'AED'
export type EntityId = 'wavult-group' | 'landvex-ab' | 'quixzoom-inc' | 'landvex-inc' | 'quixzoom-uab'

export interface FinanceEntity {
  id: EntityId
  name: string
  shortName: string
  currency: Currency
  orgNr?: string
  jurisdiction: string
  color: string
}

export interface Account {
  id: string
  number: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  group: string
  entityId: EntityId
  balance: number
  currency: Currency
}

export interface LedgerEntry {
  id: string
  date: string
  description: string
  accountId: string
  accountNumber: string
  accountName: string
  debit: number
  credit: number
  balance: number
  entityId: EntityId
  currency: Currency
  refNr: string
}

export interface Invoice {
  id: string
  number: string
  recipient: string
  recipientEmail: string
  entityId: EntityId
  currency: Currency
  amount: number
  tax: number
  total: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  issueDate: string
  dueDate: string
  lines: InvoiceLine[]
  description: string
}

export interface InvoiceLine {
  description: string
  qty: number
  unitPrice: number
  total: number
}

export interface CashFlowMonth {
  month: string
  inflow: number
  outflow: number
  net: number
  entityId: EntityId
  currency: Currency
}

export interface TaxPeriod {
  id: string
  entityId: EntityId
  jurisdiction: string
  period: string
  vatRate: number
  taxableRevenue: number
  vatOwed: number
  currency: Currency
  status: 'unreported' | 'submitted' | 'paid'
  dueDate: string
}

export interface IntercompanyEntry {
  id: string
  fromEntityId: EntityId
  toEntityId: EntityId
  type: 'management_fee' | 'ip_license' | 'loan' | 'service'
  description: string
  amount: number
  currency: Currency
  date: string
  status: 'pending' | 'invoiced' | 'settled'
}

// ─── Entities ───────────────────────────────────────────────────────────────

export const FINANCE_ENTITIES: FinanceEntity[] = [
  {
    id: 'wavult-group',
    name: 'Wavult Group Holding',
    shortName: 'Wavult Holding',
    currency: 'AED',
    jurisdiction: 'UAE (DIFC)',
    color: '#8B5CF6',
  },
  {
    id: 'landvex-ab',
    name: 'Landvex AB',
    shortName: 'Landvex AB',
    currency: 'SEK',
    jurisdiction: 'Sverige',
    color: '#3B82F6',
  },
  {
    id: 'quixzoom-inc',
    name: 'QuiXzoom Inc',
    shortName: 'QuiXzoom US',
    currency: 'USD',
    jurisdiction: 'Texas, USA',
    color: '#F59E0B',
  },
  {
    id: 'landvex-inc',
    name: 'Landvex Inc',
    shortName: 'Landvex US',
    currency: 'USD',
    jurisdiction: 'Delaware, USA',
    color: '#10B981',
  },
  {
    id: 'quixzoom-uab',
    name: 'QuiXzoom UAB',
    shortName: 'QuiXzoom LT',
    currency: 'EUR',
    jurisdiction: 'Litauen',
    color: '#EF4444',
  },
]

// ─── KPI Data — ej konfigurerat ─────────────────────────────────────────────
// Ersätt med riktiga värden via Supabase (finance_kpis-tabellen)

export const KPI_DATA: Record<EntityId, {
  revenue: number; expenses: number; result: number; cash: number;
  currency: Currency; budgetRevenue: number; budgetExpenses: number
}> = {
  'wavult-group':  { revenue: 0, expenses: 0, result: 0, cash: 0, currency: 'AED', budgetRevenue: 0, budgetExpenses: 0 },
  'landvex-ab':    { revenue: 0, expenses: 0, result: 0, cash: 0, currency: 'SEK', budgetRevenue: 0, budgetExpenses: 0 },
  'quixzoom-inc':  { revenue: 0, expenses: 0, result: 0, cash: 0, currency: 'USD', budgetRevenue: 0, budgetExpenses: 0 },
  'landvex-inc':   { revenue: 0, expenses: 0, result: 0, cash: 0, currency: 'USD', budgetRevenue: 0, budgetExpenses: 0 },
  'quixzoom-uab':  { revenue: 0, expenses: 0, result: 0, cash: 0, currency: 'EUR', budgetRevenue: 0, budgetExpenses: 0 },
}

// ─── Chart of Accounts — tom tills konfigurerat ───────────────────────────────
export const ACCOUNTS: Account[] = []

// ─── Ledger Entries — tom tills konfigurerat ─────────────────────────────────
export const LEDGER_ENTRIES: LedgerEntry[] = []

// ─── Invoices — tom tills konfigurerat ───────────────────────────────────────
export const INVOICES: Invoice[] = []

// ─── Cash Flow — tom tills konfigurerat ─────────────────────────────────────
export const CASHFLOW_DATA: Record<EntityId, CashFlowMonth[]> = {
  'wavult-group':  [],
  'landvex-ab':    [],
  'quixzoom-inc':  [],
  'landvex-inc':   [],
  'quixzoom-uab':  [],
}

// ─── Tax Periods — tom tills konfigurerat ─────────────────────────────────────
export const TAX_PERIODS: TaxPeriod[] = []

// ─── Intercompany — tom tills konfigurerat ───────────────────────────────────
export const INTERCOMPANY_ENTRIES: IntercompanyEntry[] = []

// ─── Recent Transactions — tom tills konfigurerat ────────────────────────────
export const RECENT_TRANSACTIONS: {
  id: string; date: string; description: string;
  amount: number; currency: Currency; entityId: EntityId; type: string
}[] = []
