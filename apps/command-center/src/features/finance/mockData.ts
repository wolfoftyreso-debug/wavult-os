// ─── Finance Module Mock Data ───────────────────────────────────────────────
// Wavult Group — realistic hardcoded data

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
    orgNr: '559141-7042',
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

// ─── KPI Data ────────────────────────────────────────────────────────────────

export const KPI_DATA: Record<EntityId, {
  revenue: number; expenses: number; result: number; cash: number;
  currency: Currency; budgetRevenue: number; budgetExpenses: number
}> = {
  'wavult-group': {
    revenue: 485000, expenses: 312000, result: 173000, cash: 820000,
    currency: 'AED', budgetRevenue: 600000, budgetExpenses: 350000,
  },
  'landvex-ab': {
    revenue: 1240000, expenses: 890000, result: 350000, cash: 640000,
    currency: 'SEK', budgetRevenue: 1500000, budgetExpenses: 950000,
  },
  'quixzoom-inc': {
    revenue: 68500, expenses: 52300, result: 16200, cash: 38400,
    currency: 'USD', budgetRevenue: 100000, budgetExpenses: 70000,
  },
  'landvex-inc': {
    revenue: 43200, expenses: 38900, result: 4300, cash: 12100,
    currency: 'USD', budgetRevenue: 60000, budgetExpenses: 45000,
  },
  'quixzoom-uab': {
    revenue: 18900, expenses: 12400, result: 6500, cash: 22300,
    currency: 'EUR', budgetRevenue: 25000, budgetExpenses: 18000,
  },
}

// ─── Chart of Accounts ───────────────────────────────────────────────────────

export const ACCOUNTS: Account[] = [
  // Landvex AB — SEK
  { id: 'la-1930', number: '1930', name: 'Företagskonto', type: 'asset', group: '1xxx Tillgångar', entityId: 'landvex-ab', balance: 640000, currency: 'SEK' },
  { id: 'la-1510', number: '1510', name: 'Kundfordringar', type: 'asset', group: '1xxx Tillgångar', entityId: 'landvex-ab', balance: 285000, currency: 'SEK' },
  { id: 'la-1710', number: '1710', name: 'Förutbetalda kostnader', type: 'asset', group: '1xxx Tillgångar', entityId: 'landvex-ab', balance: 48000, currency: 'SEK' },
  { id: 'la-2440', number: '2440', name: 'Leverantörsskulder', type: 'liability', group: '2xxx Skulder & Eget kapital', entityId: 'landvex-ab', balance: -124000, currency: 'SEK' },
  { id: 'la-2510', number: '2510', name: 'Skatteskulder', type: 'liability', group: '2xxx Skulder & Eget kapital', entityId: 'landvex-ab', balance: -68000, currency: 'SEK' },
  { id: 'la-2081', number: '2081', name: 'Aktiekapital', type: 'equity', group: '2xxx Skulder & Eget kapital', entityId: 'landvex-ab', balance: -500000, currency: 'SEK' },
  { id: 'la-3001', number: '3001', name: 'Försäljning tjänster', type: 'revenue', group: '3xxx Intäkter', entityId: 'landvex-ab', balance: -1240000, currency: 'SEK' },
  { id: 'la-4010', number: '4010', name: 'Inköp varor', type: 'expense', group: '4-7xxx Kostnader', entityId: 'landvex-ab', balance: 245000, currency: 'SEK' },
  { id: 'la-5010', number: '5010', name: 'Lokalhyra', type: 'expense', group: '4-7xxx Kostnader', entityId: 'landvex-ab', balance: 144000, currency: 'SEK' },
  { id: 'la-7010', number: '7010', name: 'Löner', type: 'expense', group: '4-7xxx Kostnader', entityId: 'landvex-ab', balance: 501000, currency: 'SEK' },

  // QuiXzoom Inc — USD
  { id: 'qi-1000', number: '1000', name: 'Checking Account', type: 'asset', group: '1xxx Tillgångar', entityId: 'quixzoom-inc', balance: 38400, currency: 'USD' },
  { id: 'qi-1200', number: '1200', name: 'Accounts Receivable', type: 'asset', group: '1xxx Tillgångar', entityId: 'quixzoom-inc', balance: 24500, currency: 'USD' },
  { id: 'qi-2000', number: '2000', name: 'Accounts Payable', type: 'liability', group: '2xxx Skulder & Eget kapital', entityId: 'quixzoom-inc', balance: -12800, currency: 'USD' },
  { id: 'qi-3000', number: '3000', name: 'Revenue', type: 'revenue', group: '3xxx Intäkter', entityId: 'quixzoom-inc', balance: -68500, currency: 'USD' },
  { id: 'qi-5000', number: '5000', name: 'Payroll Expense', type: 'expense', group: '4-7xxx Kostnader', entityId: 'quixzoom-inc', balance: 35200, currency: 'USD' },
  { id: 'qi-5100', number: '5100', name: 'Software & SaaS', type: 'expense', group: '4-7xxx Kostnader', entityId: 'quixzoom-inc', balance: 17100, currency: 'USD' },

  // Wavult Group Holding — AED
  { id: 'wg-1010', number: '1010', name: 'Bank Account DIFC', type: 'asset', group: '1xxx Tillgångar', entityId: 'wavult-group', balance: 820000, currency: 'AED' },
  { id: 'wg-1500', number: '1500', name: 'Intercompany Receivables', type: 'asset', group: '1xxx Tillgångar', entityId: 'wavult-group', balance: 340000, currency: 'AED' },
  { id: 'wg-3000', number: '3000', name: 'Management Fee Income', type: 'revenue', group: '3xxx Intäkter', entityId: 'wavult-group', balance: -485000, currency: 'AED' },
  { id: 'wg-5000', number: '5000', name: 'Operating Expenses', type: 'expense', group: '4-7xxx Kostnader', entityId: 'wavult-group', balance: 312000, currency: 'AED' },

  // QuiXzoom UAB — EUR
  { id: 'qu-1000', number: '1000', name: 'Bankkonto', type: 'asset', group: '1xxx Tillgångar', entityId: 'quixzoom-uab', balance: 22300, currency: 'EUR' },
  { id: 'qu-3000', number: '3000', name: 'Intäkter', type: 'revenue', group: '3xxx Intäkter', entityId: 'quixzoom-uab', balance: -18900, currency: 'EUR' },
  { id: 'qu-5000', number: '5000', name: 'Lönekostnader', type: 'expense', group: '4-7xxx Kostnader', entityId: 'quixzoom-uab', balance: 12400, currency: 'EUR' },

  // Landvex Inc — USD
  { id: 'li-1000', number: '1000', name: 'Checking Account', type: 'asset', group: '1xxx Tillgångar', entityId: 'landvex-inc', balance: 12100, currency: 'USD' },
  { id: 'li-3000', number: '3000', name: 'Revenue', type: 'revenue', group: '3xxx Intäkter', entityId: 'landvex-inc', balance: -43200, currency: 'USD' },
  { id: 'li-5000', number: '5000', name: 'Operating Costs', type: 'expense', group: '4-7xxx Kostnader', entityId: 'landvex-inc', balance: 38900, currency: 'USD' },
]

// ─── Ledger Entries ───────────────────────────────────────────────────────────

export const LEDGER_ENTRIES: LedgerEntry[] = [
  { id: 'le-001', date: '2026-03-24', description: 'Kund-faktura #1042 — konsulttjänster', accountId: 'la-3001', accountNumber: '3001', accountName: 'Försäljning tjänster', debit: 0, credit: 125000, balance: -1240000, entityId: 'landvex-ab', currency: 'SEK', refNr: 'INV-1042' },
  { id: 'le-002', date: '2026-03-24', description: 'Kund-faktura #1042 — kundfordran', accountId: 'la-1510', accountNumber: '1510', accountName: 'Kundfordringar', debit: 125000, credit: 0, balance: 285000, entityId: 'landvex-ab', currency: 'SEK', refNr: 'INV-1042' },
  { id: 'le-003', date: '2026-03-20', description: 'Löneutbetalning mars', accountId: 'la-7010', accountNumber: '7010', accountName: 'Löner', debit: 168000, credit: 0, balance: 501000, entityId: 'landvex-ab', currency: 'SEK', refNr: 'PAY-2026-03' },
  { id: 'le-004', date: '2026-03-20', description: 'Löneutbetalning mars — bank', accountId: 'la-1930', accountNumber: '1930', accountName: 'Företagskonto', debit: 0, credit: 168000, balance: 640000, entityId: 'landvex-ab', currency: 'SEK', refNr: 'PAY-2026-03' },
  { id: 'le-005', date: '2026-03-15', description: 'AWS cloud-tjänster feb', accountId: 'la-4010', accountNumber: '4010', accountName: 'Inköp varor', debit: 28400, credit: 0, balance: 245000, entityId: 'landvex-ab', currency: 'SEK', refNr: 'AWS-FEB26' },
  { id: 'le-006', date: '2026-03-15', description: 'AWS cloud-tjänster feb — bank', accountId: 'la-1930', accountNumber: '1930', accountName: 'Företagskonto', debit: 0, credit: 28400, balance: 668400, entityId: 'landvex-ab', currency: 'SEK', refNr: 'AWS-FEB26' },
  { id: 'le-007', date: '2026-03-10', description: 'Management fee Q1 — Wavult Holding', accountId: 'wg-3000', accountNumber: '3000', accountName: 'Management Fee Income', debit: 0, credit: 95000, balance: -485000, entityId: 'wavult-group', currency: 'AED', refNr: 'IC-Q1-2026' },
  { id: 'le-008', date: '2026-03-10', description: 'Management fee Q1 — bank', accountId: 'wg-1010', accountNumber: '1010', accountName: 'Bank Account DIFC', debit: 95000, credit: 0, balance: 820000, entityId: 'wavult-group', currency: 'AED', refNr: 'IC-Q1-2026' },
  { id: 'le-009', date: '2026-03-08', description: 'Software subscription renewal', accountId: 'qi-5100', accountNumber: '5100', accountName: 'Software & SaaS', debit: 4200, credit: 0, balance: 17100, entityId: 'quixzoom-inc', currency: 'USD', refNr: 'SUB-MAR26' },
  { id: 'le-010', date: '2026-03-08', description: 'Software subscription — bank', accountId: 'qi-1000', accountNumber: '1000', accountName: 'Checking Account', debit: 0, credit: 4200, balance: 38400, entityId: 'quixzoom-inc', currency: 'USD', refNr: 'SUB-MAR26' },
  { id: 'le-011', date: '2026-03-05', description: 'Q1 IP License fee received', accountId: 'qu-3000', accountNumber: '3000', accountName: 'Intäkter', debit: 0, credit: 8400, balance: -18900, entityId: 'quixzoom-uab', currency: 'EUR', refNr: 'IP-Q1-LT' },
  { id: 'le-012', date: '2026-03-05', description: 'Q1 IP License — bank', accountId: 'qu-1000', accountNumber: '1000', accountName: 'Bankkonto', debit: 8400, credit: 0, balance: 22300, entityId: 'quixzoom-uab', currency: 'EUR', refNr: 'IP-Q1-LT' },
  { id: 'le-013', date: '2026-02-28', description: 'Lokalhyra mars', accountId: 'la-5010', accountNumber: '5010', accountName: 'Lokalhyra', debit: 24000, credit: 0, balance: 144000, entityId: 'landvex-ab', currency: 'SEK', refNr: 'RENT-MAR26' },
  { id: 'le-014', date: '2026-02-20', description: 'Customer invoice #2034 paid', accountId: 'qi-1000', accountNumber: '1000', accountName: 'Checking Account', debit: 18500, credit: 0, balance: 42600, entityId: 'quixzoom-inc', currency: 'USD', refNr: 'INV-2034' },
  { id: 'le-015', date: '2026-02-20', description: 'Customer invoice #2034 — revenue', accountId: 'qi-3000', accountNumber: '3000', accountName: 'Revenue', debit: 0, credit: 18500, balance: -68500, entityId: 'quixzoom-inc', currency: 'USD', refNr: 'INV-2034' },
]

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const INVOICES: Invoice[] = [
  {
    id: 'inv-001',
    number: 'LVX-1042',
    recipient: 'Acme Fastigheter AB',
    recipientEmail: 'ekonomi@acmefastigheter.se',
    entityId: 'landvex-ab',
    currency: 'SEK',
    amount: 100000,
    tax: 25000,
    total: 125000,
    status: 'sent',
    issueDate: '2026-03-24',
    dueDate: '2026-04-23',
    description: 'Konsulttjänster mars 2026',
    lines: [
      { description: 'Strategisk rådgivning — 40h × 2 000 SEK', qty: 40, unitPrice: 2000, total: 80000 },
      { description: 'Teknisk analys', qty: 1, unitPrice: 20000, total: 20000 },
    ],
  },
  {
    id: 'inv-002',
    number: 'LVX-1041',
    recipient: 'Nordic Build Group',
    recipientEmail: 'ap@nordicbuild.se',
    entityId: 'landvex-ab',
    currency: 'SEK',
    amount: 60000,
    tax: 15000,
    total: 75000,
    status: 'paid',
    issueDate: '2026-02-28',
    dueDate: '2026-03-29',
    description: 'Plattformsintegration feb 2026',
    lines: [
      { description: 'API-integration', qty: 1, unitPrice: 60000, total: 60000 },
    ],
  },
  {
    id: 'inv-003',
    number: 'QZ-2035',
    recipient: 'Metro City Council',
    recipientEmail: 'procurement@metrocity.gov',
    entityId: 'quixzoom-inc',
    currency: 'USD',
    amount: 24500,
    tax: 0,
    total: 24500,
    status: 'overdue',
    issueDate: '2026-02-01',
    dueDate: '2026-03-02',
    description: 'Camera coverage Q1 2026',
    lines: [
      { description: 'Camera network coverage — monthly fee', qty: 3, unitPrice: 8166.67, total: 24500 },
    ],
  },
  {
    id: 'inv-004',
    number: 'WH-0041',
    recipient: 'Landvex AB',
    recipientEmail: 'ekonomi@landvex.se',
    entityId: 'wavult-group',
    currency: 'AED',
    amount: 95000,
    tax: 0,
    total: 95000,
    status: 'paid',
    issueDate: '2026-03-10',
    dueDate: '2026-03-31',
    description: 'Management Fee Q1 2026',
    lines: [
      { description: 'Group management services Q1', qty: 1, unitPrice: 95000, total: 95000 },
    ],
  },
  {
    id: 'inv-005',
    number: 'QZ-2036',
    recipient: 'Stockholm Infrastructure',
    recipientEmail: 'finance@sthlminfra.se',
    entityId: 'quixzoom-inc',
    currency: 'USD',
    amount: 32000,
    tax: 0,
    total: 32000,
    status: 'draft',
    issueDate: '2026-03-26',
    dueDate: '2026-04-25',
    description: 'AI Analytics Package — Q2 2026',
    lines: [
      { description: 'Optical Insight AI analysis — monthly', qty: 2, unitPrice: 16000, total: 32000 },
    ],
  },
  {
    id: 'inv-006',
    number: 'QU-0012',
    recipient: 'QuiXzoom Inc',
    recipientEmail: 'finance@quixzoom.com',
    entityId: 'quixzoom-uab',
    currency: 'EUR',
    amount: 8400,
    tax: 1764,
    total: 10164,
    status: 'paid',
    issueDate: '2026-03-05',
    dueDate: '2026-03-20',
    description: 'IP License Q1 2026',
    lines: [
      { description: 'Software IP license — quarterly', qty: 1, unitPrice: 8400, total: 8400 },
    ],
  },
]

// ─── Cash Flow ────────────────────────────────────────────────────────────────

export const CASHFLOW_DATA: Record<EntityId, CashFlowMonth[]> = {
  'wavult-group': [
    { month: 'Okt', inflow: 85000, outflow: 52000, net: 33000, entityId: 'wavult-group', currency: 'AED' },
    { month: 'Nov', inflow: 92000, outflow: 58000, net: 34000, entityId: 'wavult-group', currency: 'AED' },
    { month: 'Dec', inflow: 110000, outflow: 64000, net: 46000, entityId: 'wavult-group', currency: 'AED' },
    { month: 'Jan', inflow: 78000, outflow: 49000, net: 29000, entityId: 'wavult-group', currency: 'AED' },
    { month: 'Feb', inflow: 95000, outflow: 53000, net: 42000, entityId: 'wavult-group', currency: 'AED' },
    { month: 'Mar', inflow: 120000, outflow: 61000, net: 59000, entityId: 'wavult-group', currency: 'AED' },
  ],
  'landvex-ab': [
    { month: 'Okt', inflow: 180000, outflow: 145000, net: 35000, entityId: 'landvex-ab', currency: 'SEK' },
    { month: 'Nov', inflow: 210000, outflow: 162000, net: 48000, entityId: 'landvex-ab', currency: 'SEK' },
    { month: 'Dec', inflow: 195000, outflow: 178000, net: 17000, entityId: 'landvex-ab', currency: 'SEK' },
    { month: 'Jan', inflow: 225000, outflow: 155000, net: 70000, entityId: 'landvex-ab', currency: 'SEK' },
    { month: 'Feb', inflow: 198000, outflow: 148000, net: 50000, entityId: 'landvex-ab', currency: 'SEK' },
    { month: 'Mar', inflow: 232000, outflow: 162000, net: 70000, entityId: 'landvex-ab', currency: 'SEK' },
  ],
  'quixzoom-inc': [
    { month: 'Okt', inflow: 9200, outflow: 7800, net: 1400, entityId: 'quixzoom-inc', currency: 'USD' },
    { month: 'Nov', inflow: 11400, outflow: 8900, net: 2500, entityId: 'quixzoom-inc', currency: 'USD' },
    { month: 'Dec', inflow: 13800, outflow: 10200, net: 3600, entityId: 'quixzoom-inc', currency: 'USD' },
    { month: 'Jan', inflow: 8900, outflow: 8100, net: 800, entityId: 'quixzoom-inc', currency: 'USD' },
    { month: 'Feb', inflow: 12400, outflow: 9200, net: 3200, entityId: 'quixzoom-inc', currency: 'USD' },
    { month: 'Mar', inflow: 14200, outflow: 9800, net: 4400, entityId: 'quixzoom-inc', currency: 'USD' },
  ],
  'landvex-inc': [
    { month: 'Okt', inflow: 6800, outflow: 6200, net: 600, entityId: 'landvex-inc', currency: 'USD' },
    { month: 'Nov', inflow: 7400, outflow: 6900, net: 500, entityId: 'landvex-inc', currency: 'USD' },
    { month: 'Dec', inflow: 7200, outflow: 7100, net: 100, entityId: 'landvex-inc', currency: 'USD' },
    { month: 'Jan', inflow: 8100, outflow: 7400, net: 700, entityId: 'landvex-inc', currency: 'USD' },
    { month: 'Feb', inflow: 7600, outflow: 6800, net: 800, entityId: 'landvex-inc', currency: 'USD' },
    { month: 'Mar', inflow: 8900, outflow: 8200, net: 700, entityId: 'landvex-inc', currency: 'USD' },
  ],
  'quixzoom-uab': [
    { month: 'Okt', inflow: 2800, outflow: 1900, net: 900, entityId: 'quixzoom-uab', currency: 'EUR' },
    { month: 'Nov', inflow: 3200, outflow: 2100, net: 1100, entityId: 'quixzoom-uab', currency: 'EUR' },
    { month: 'Dec', inflow: 4100, outflow: 2800, net: 1300, entityId: 'quixzoom-uab', currency: 'EUR' },
    { month: 'Jan', inflow: 2600, outflow: 1800, net: 800, entityId: 'quixzoom-uab', currency: 'EUR' },
    { month: 'Feb', inflow: 3400, outflow: 2200, net: 1200, entityId: 'quixzoom-uab', currency: 'EUR' },
    { month: 'Mar', inflow: 3800, outflow: 2400, net: 1400, entityId: 'quixzoom-uab', currency: 'EUR' },
  ],
}

// ─── Tax Periods ──────────────────────────────────────────────────────────────

export const TAX_PERIODS: TaxPeriod[] = [
  { id: 'tp-001', entityId: 'landvex-ab', jurisdiction: 'Sverige', period: 'Jan–Feb 2026', vatRate: 25, taxableRevenue: 820000, vatOwed: 62500, currency: 'SEK', status: 'submitted', dueDate: '2026-03-12' },
  { id: 'tp-002', entityId: 'landvex-ab', jurisdiction: 'Sverige', period: 'Mar–Apr 2026', vatRate: 25, taxableRevenue: 420000, vatOwed: 31250, currency: 'SEK', status: 'unreported', dueDate: '2026-05-12' },
  { id: 'tp-003', entityId: 'quixzoom-uab', jurisdiction: 'Litauen', period: 'Q1 2026', vatRate: 21, taxableRevenue: 18900, vatOwed: 1764, currency: 'EUR', status: 'submitted', dueDate: '2026-04-25' },
  { id: 'tp-004', entityId: 'quixzoom-uab', jurisdiction: 'Litauen', period: 'Q4 2025', vatRate: 21, taxableRevenue: 14200, vatOwed: 1328, currency: 'EUR', status: 'paid', dueDate: '2026-01-25' },
  { id: 'tp-005', entityId: 'quixzoom-inc', jurisdiction: 'Texas, USA', period: 'Q1 2026', vatRate: 8.25, taxableRevenue: 68500, vatOwed: 5651, currency: 'USD', status: 'unreported', dueDate: '2026-04-30' },
  { id: 'tp-006', entityId: 'landvex-inc', jurisdiction: 'Delaware, USA', period: 'Q1 2026', vatRate: 0, taxableRevenue: 43200, vatOwed: 0, currency: 'USD', status: 'submitted', dueDate: '2026-04-15' },
  { id: 'tp-007', entityId: 'landvex-ab', jurisdiction: 'Sverige', period: 'Nov–Dec 2025', vatRate: 25, taxableRevenue: 748000, vatOwed: 54200, currency: 'SEK', status: 'paid', dueDate: '2026-01-12' },
]

// ─── Intercompany ─────────────────────────────────────────────────────────────

export const INTERCOMPANY_ENTRIES: IntercompanyEntry[] = [
  {
    id: 'ic-001',
    fromEntityId: 'landvex-ab',
    toEntityId: 'wavult-group',
    type: 'management_fee',
    description: 'Management Fee Q1 2026 — Group Services',
    amount: 95000,
    currency: 'AED',
    date: '2026-03-10',
    status: 'settled',
  },
  {
    id: 'ic-002',
    fromEntityId: 'quixzoom-inc',
    toEntityId: 'wavult-group',
    type: 'management_fee',
    description: 'Management Fee Q1 2026 — Group Services',
    amount: 28000,
    currency: 'AED',
    date: '2026-03-10',
    status: 'invoiced',
  },
  {
    id: 'ic-003',
    fromEntityId: 'wavult-group',
    toEntityId: 'quixzoom-uab',
    type: 'ip_license',
    description: 'IP License — QuiXzoom Software Q1 2026',
    amount: 8400,
    currency: 'EUR',
    date: '2026-03-05',
    status: 'settled',
  },
  {
    id: 'ic-004',
    fromEntityId: 'wavult-group',
    toEntityId: 'landvex-inc',
    type: 'ip_license',
    description: 'IP License — Landvex Platform Q1 2026',
    amount: 4200,
    currency: 'USD',
    date: '2026-03-05',
    status: 'invoiced',
  },
  {
    id: 'ic-005',
    fromEntityId: 'landvex-ab',
    toEntityId: 'landvex-inc',
    type: 'service',
    description: 'Tech Development Services — Feb 2026',
    amount: 85000,
    currency: 'SEK',
    date: '2026-02-28',
    status: 'pending',
  },
  {
    id: 'ic-006',
    fromEntityId: 'quixzoom-inc',
    toEntityId: 'quixzoom-uab',
    type: 'service',
    description: 'Sales & Marketing Support Q1',
    amount: 12000,
    currency: 'USD',
    date: '2026-03-15',
    status: 'pending',
  },
  {
    id: 'ic-007',
    fromEntityId: 'wavult-group',
    toEntityId: 'landvex-ab',
    type: 'loan',
    description: 'Intercompany Loan — Working Capital',
    amount: 250000,
    currency: 'SEK',
    date: '2026-01-15',
    status: 'settled',
  },
]

// ─── Recent Transactions (overview) ──────────────────────────────────────────

export const RECENT_TRANSACTIONS = [
  { id: 'rt-001', date: '2026-03-24', description: 'Kundfaktura LVX-1042', amount: 125000, currency: 'SEK' as Currency, entityId: 'landvex-ab' as EntityId, type: 'income' },
  { id: 'rt-002', date: '2026-03-20', description: 'Löneutbetalning mars', amount: -168000, currency: 'SEK' as Currency, entityId: 'landvex-ab' as EntityId, type: 'expense' },
  { id: 'rt-003', date: '2026-03-15', description: 'AWS cloud-tjänster', amount: -28400, currency: 'SEK' as Currency, entityId: 'landvex-ab' as EntityId, type: 'expense' },
  { id: 'rt-004', date: '2026-03-10', description: 'Management Fee Q1', amount: 95000, currency: 'AED' as Currency, entityId: 'wavult-group' as EntityId, type: 'income' },
  { id: 'rt-005', date: '2026-03-08', description: 'Software subscriptions', amount: -4200, currency: 'USD' as Currency, entityId: 'quixzoom-inc' as EntityId, type: 'expense' },
]
