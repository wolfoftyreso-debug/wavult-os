// ─── Payroll Mock Data ────────────────────────────────────────────────────────

export const EMPLOYER_TAX_RATE = 0.3142 // Arbetsgivaravgift 31.42%
export const TAX_TABLE = 33             // Skattetabell Stockholm

// Swedish income tax approximation for table 33 (Stockholm, ~2026)
// Monthly gross → estimated tax deduction
export function calcTaxDeduction(grossMonthly: number): number {
  // Simplified progressive table 33
  if (grossMonthly <= 20_000) return grossMonthly * 0.25
  if (grossMonthly <= 40_000) return grossMonthly * 0.30
  if (grossMonthly <= 60_000) return grossMonthly * 0.32
  if (grossMonthly <= 80_000) return grossMonthly * 0.34
  return grossMonthly * 0.36
}

export interface Employee {
  id: string
  name: string
  initials: string
  role: string
  email: string
  phone: string
  startDate: string
  grossSalary: number       // SEK/month
  employmentRate: number    // 1.0 = 100%
  status: 'active' | 'leave'
  taxTable: number
  color: string
  location: string
}

export const EMPLOYEES: Employee[] = [
  {
    id: 'erik',
    name: 'Erik Svensson',
    initials: 'ES',
    role: 'Chairman & Group CEO',
    email: 'erik@hypbit.com',
    phone: '+46709123223',
    startDate: '2024-01-01',
    grossSalary: 85_000,
    employmentRate: 1.0,
    status: 'active',
    taxTable: 33,
    color: '#8B5CF6',
    location: 'Stockholm',
  },
  {
    id: 'leon',
    name: 'Leon Russo De Cerame',
    initials: 'LR',
    role: 'CEO Wavult Operations',
    email: 'leon@hypbit.com',
    phone: '+46738968949',
    startDate: '2024-03-01',
    grossSalary: 65_000,
    employmentRate: 1.0,
    status: 'active',
    taxTable: 33,
    color: '#10B981',
    location: 'Stockholm',
  },
  {
    id: 'winston',
    name: 'Winston Bjarnemark',
    initials: 'WB',
    role: 'CFO',
    email: 'winston@hypbit.com',
    phone: '0768123548',
    startDate: '2024-03-01',
    grossSalary: 60_000,
    employmentRate: 1.0,
    status: 'active',
    taxTable: 33,
    color: '#3B82F6',
    location: 'Stockholm',
  },
  {
    id: 'dennis',
    name: 'Dennis Bjarnemark',
    initials: 'DB',
    role: 'Board / Chief Legal & Operations',
    email: 'dennis@hypbit.com',
    phone: '0761474243',
    startDate: '2024-03-01',
    grossSalary: 60_000,
    employmentRate: 1.0,
    status: 'active',
    taxTable: 33,
    color: '#F59E0B',
    location: 'Stockholm',
  },
  {
    id: 'johan',
    name: 'Johan Berglund',
    initials: 'JB',
    role: 'Group CTO',
    email: 'johan@hypbit.com',
    phone: '+46736977576',
    startDate: '2024-02-01',
    grossSalary: 72_000,
    employmentRate: 1.0,
    status: 'active',
    taxTable: 33,
    color: '#06B6D4',
    location: 'Stockholm',
  },
]

// ─── Salary calculations ──────────────────────────────────────────────────────
export interface SalaryCalc {
  gross: number
  taxDeduction: number
  net: number
  employerTax: number
  totalCost: number
}

export function calcSalary(gross: number): SalaryCalc {
  const taxDeduction = calcTaxDeduction(gross)
  const net = gross - taxDeduction
  const employerTax = gross * EMPLOYER_TAX_RATE
  const totalCost = gross + employerTax
  return { gross, taxDeduction, net, employerTax, totalCost }
}

// ─── Payroll run history ──────────────────────────────────────────────────────
export interface PayrollRun {
  id: string
  period: string       // "2026-02"
  runDate: string      // ISO date
  totalGross: number
  totalEmployerTax: number
  totalNet: number
  totalCost: number
  status: 'completed' | 'pending' | 'draft'
  approvedBy: string
}

export const PAYROLL_HISTORY: PayrollRun[] = [
  {
    id: 'pr-2026-02',
    period: '2026-02',
    runDate: '2026-02-25',
    totalGross: 342_000,
    totalEmployerTax: 107_459,
    totalNet: 231_240,
    totalCost: 449_459,
    status: 'completed',
    approvedBy: 'Winston Bjarnemark',
  },
  {
    id: 'pr-2026-01',
    period: '2026-01',
    runDate: '2026-01-25',
    totalGross: 342_000,
    totalEmployerTax: 107_459,
    totalNet: 231_240,
    totalCost: 449_459,
    status: 'completed',
    approvedBy: 'Winston Bjarnemark',
  },
  {
    id: 'pr-2025-12',
    period: '2025-12',
    runDate: '2025-12-23',
    totalGross: 342_000,
    totalEmployerTax: 107_459,
    totalNet: 231_240,
    totalCost: 449_459,
    status: 'completed',
    approvedBy: 'Winston Bjarnemark',
  },
]

// ─── Swedish public holidays 2026 ────────────────────────────────────────────
export const SWEDISH_HOLIDAYS_2026: { date: string; name: string }[] = [
  { date: '2026-01-01', name: 'Nyårsdagen' },
  { date: '2026-01-06', name: 'Trettondedag jul' },
  { date: '2026-04-03', name: 'Långfredagen' },
  { date: '2026-04-05', name: 'Påskdagen' },
  { date: '2026-04-06', name: 'Annandag påsk' },
  { date: '2026-05-01', name: 'Första maj' },
  { date: '2026-05-14', name: 'Kristi himmelsfärdsdag' },
  { date: '2026-05-24', name: 'Pingstdagen' },
  { date: '2026-06-06', name: 'Nationaldagen' },
  { date: '2026-06-19', name: 'Midsommarafton' },
  { date: '2026-06-20', name: 'Midsommardagen' },
  { date: '2026-10-31', name: 'Allhelgonadagen' },
  { date: '2026-12-24', name: 'Julafton' },
  { date: '2026-12-25', name: 'Juldagen' },
  { date: '2026-12-26', name: 'Annandag jul' },
  { date: '2026-12-31', name: 'Nyårsafton' },
]

// ─── Leave records ────────────────────────────────────────────────────────────
export interface LeaveRecord {
  employeeId: string
  year: number
  daysEntitled: number
  daysUsed: number
  plannedLeave: { start: string; end: string; days: number; approved: boolean }[]
}

export const LEAVE_RECORDS: LeaveRecord[] = [
  {
    employeeId: 'erik',
    year: 2026,
    daysEntitled: 25,
    daysUsed: 5,
    plannedLeave: [
      { start: '2026-06-22', end: '2026-06-26', days: 5, approved: true },
    ],
  },
  {
    employeeId: 'leon',
    year: 2026,
    daysEntitled: 25,
    daysUsed: 0,
    plannedLeave: [
      { start: '2026-07-07', end: '2026-07-17', days: 9, approved: true },
    ],
  },
  {
    employeeId: 'winston',
    year: 2026,
    daysEntitled: 25,
    daysUsed: 3,
    plannedLeave: [
      { start: '2026-07-14', end: '2026-07-24', days: 9, approved: false },
    ],
  },
  {
    employeeId: 'dennis',
    year: 2026,
    daysEntitled: 25,
    daysUsed: 0,
    plannedLeave: [],
  },
  {
    employeeId: 'johan',
    year: 2026,
    daysEntitled: 25,
    daysUsed: 2,
    plannedLeave: [
      { start: '2026-07-28', end: '2026-08-07', days: 9, approved: true },
    ],
  },
]

// ─── Tax compliance ───────────────────────────────────────────────────────────
export interface TaxDeclaration {
  period: string
  deadline: string
  status: 'not_filed' | 'filed' | 'paid'
  amount: number
}

export const TAX_DECLARATIONS: TaxDeclaration[] = [
  { period: '2026-03', deadline: '2026-04-12', status: 'not_filed', amount: 107_459 },
  { period: '2026-02', deadline: '2026-03-12', status: 'paid',      amount: 107_459 },
  { period: '2026-01', deadline: '2026-02-12', status: 'paid',      amount: 107_459 },
  { period: '2025-12', deadline: '2026-01-12', status: 'paid',      amount: 107_459 },
  { period: '2025-11', deadline: '2025-12-12', status: 'paid',      amount: 107_459 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function fmt(n: number): string {
  return n.toLocaleString('sv-SE') + ' kr'
}

export function fmtPeriod(period: string): string {
  const [y, m] = period.split('-')
  const months = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec']
  return `${months[parseInt(m, 10) - 1]} ${y}`
}

export function totalGrossPerMonth(): number {
  return EMPLOYEES.filter(e => e.status === 'active').reduce((sum, e) => sum + e.grossSalary, 0)
}
