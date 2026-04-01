// ─── Payroll Data Types ───────────────────────────────────────────────────────
// Lönedata hämtas från Supabase (employees-tabellen).
// Lönekörningar hanteras i usePayroll-hooken. Inga fejkade siffror.

export const EMPLOYER_TAX_RATE = 0.3142 // Arbetsgivaravgift 31.42%
export const TAX_TABLE = 33             // Skattetabell Stockholm

// Swedish income tax approximation for table 33 (Stockholm, ~2026)
export function calcTaxDeduction(grossMonthly: number): number {
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
  grossSalary: number       // SEK/month — hämtas från Supabase
  employmentRate: number    // 1.0 = 100%
  status: 'active' | 'leave'
  taxTable: number
  color: string
  location: string
}

// Anställda — struktur bevaras, löner hämtas från databasen
// grossSalary = 0 tills registrerat i Supabase (employees.gross_salary)
export const EMPLOYEES: Employee[] = [
  {
    id: 'erik',
    name: 'Erik Svensson',
    initials: 'ES',
    role: 'Chairman & Group CEO',
    email: 'erik@wavult.com',
    phone: '+46709123223',
    startDate: '',
    grossSalary: 0,
    employmentRate: 1.0,
    status: 'active',
    taxTable: 33,
    color: '#2563EB',
    location: 'Stockholm',
  },
  {
    id: 'leon',
    name: 'Leon Russo De Cemare',
    initials: 'LR',
    role: 'CEO Wavult Operations',
    email: 'leon@wavult.com',
    phone: '+46738968949',
    startDate: '',
    grossSalary: 0,
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
    email: 'winston@wavult.com',
    phone: '0768123548',
    startDate: '',
    grossSalary: 0,
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
    email: 'dennis@wavult.com',
    phone: '0761474243',
    startDate: '',
    grossSalary: 0,
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
    email: 'johan@wavult.com',
    phone: '+46736977576',
    startDate: '',
    grossSalary: 0,
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

// ─── Payroll run history — tom tills konfigurerat ────────────────────────────
// Lönekörningar hämtas från Supabase (payroll_runs-tabellen)
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

export const PAYROLL_HISTORY: PayrollRun[] = []

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

// ─── Leave records — tomma tills konfigurerat ────────────────────────────────
export interface LeaveRecord {
  employeeId: string
  year: number
  daysEntitled: number
  daysUsed: number
  plannedLeave: { start: string; end: string; days: number; approved: boolean }[]
}

export const LEAVE_RECORDS: LeaveRecord[] = []

// ─── Tax compliance — tomma tills konfigurerat ───────────────────────────────
export interface TaxDeclaration {
  period: string
  deadline: string
  status: 'not_filed' | 'filed' | 'paid'
  amount: number
}

export const TAX_DECLARATIONS: TaxDeclaration[] = []

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
