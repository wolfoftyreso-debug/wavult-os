// ─── Payroll Data Types ───────────────────────────────────────────────────────
// Lönedata hämtas från Supabase (employees-tabellen).
// Lönekörningar hanteras i usePayroll-hooken. Inga fejkade siffror.

export const EMPLOYER_TAX_RATE = 0.3142 // Arbetsgivaravgift 31.42%
export const TAX_TABLE = 33             // Skattetabell Stockholm

// ─── Grundarteamets löneavtal ─────────────────────────────────────────────────
// Villkor: Löner betalas aldrig ut om de sätter verksamheten i obestånd.
// Prioritet: Verksamhetskostnader > Löner. Alltid.
//
//  Fas 1: Mån 1–6    → 20 000 kr/mån (brutto)
//  Fas 2: Mån 7–12   → 50 000 kr/mån (brutto)
//  Fas 3: Mån 13+    → 100 000 kr/mån (brutto)
//
export const FOUNDER_SALARY_SCHEDULE = [
  { fromMonth: 1,  toMonth: 6,  grossMonthly: 20_000 },
  { fromMonth: 7,  toMonth: 12, grossMonthly: 50_000 },
  { fromMonth: 13, toMonth: Infinity, grossMonthly: 100_000 },
] as const

// Beräkna aktuell grundarlön baserat på startmånad
export function founderCurrentSalary(startDate: string): number {
  if (!startDate) return FOUNDER_SALARY_SCHEDULE[0].grossMonthly
  const start = new Date(startDate)
  const now = new Date()
  const monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12
    + (now.getMonth() - start.getMonth()) + 1
  const phase = FOUNDER_SALARY_SCHEDULE.find(
    s => monthsElapsed >= s.fromMonth && monthsElapsed <= s.toMonth
  )
  return phase?.grossMonthly ?? FOUNDER_SALARY_SCHEDULE[2].grossMonthly
}

// Startdatum för alla grundare — satt till 2026-04-11 (Thailand workcamp)
export const FOUNDER_START_DATE = '2026-04-11'

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

// Anställda — grundarteamet
// grossSalary beräknas dynamiskt via founderCurrentSalary(startDate)
// Löner utbetalas ENDAST om likviditeten tillåter det (aldrig obestånd)
export const EMPLOYEES: Employee[] = [
  {
    id: 'erik',
    name: 'Erik Svensson',
    initials: 'ES',
    role: 'Chairman & Group CEO',
    email: 'erik@wavult.com',
    phone: '+46709123223',
    startDate: FOUNDER_START_DATE,
    grossSalary: founderCurrentSalary(FOUNDER_START_DATE),
    employmentRate: 1.0,
    status: 'active',
    taxTable: 33,
    color: '#2563EB',
    location: 'Stockholm',
  },
  {
    id: 'johan',
    name: 'Johan Berglund',
    initials: 'JB',
    role: 'Group CTO',
    email: 'johan@wavult.com',
    phone: '+46736977576',
    startDate: FOUNDER_START_DATE,
    grossSalary: founderCurrentSalary(FOUNDER_START_DATE),
    employmentRate: 1.0,
    status: 'active',
    taxTable: 33,
    color: '#06B6D4',
    location: 'Stockholm',
  },
  {
    id: 'leon',
    name: 'Leon Russo De Cemare',
    initials: 'LR',
    role: 'CEO Wavult Operations',
    email: 'leon@wavult.com',
    phone: '+46738968949',
    startDate: FOUNDER_START_DATE,
    grossSalary: founderCurrentSalary(FOUNDER_START_DATE),
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
    startDate: FOUNDER_START_DATE,
    grossSalary: founderCurrentSalary(FOUNDER_START_DATE),
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
    startDate: FOUNDER_START_DATE,
    grossSalary: founderCurrentSalary(FOUNDER_START_DATE),
    employmentRate: 1.0,
    status: 'active',
    taxTable: 33,
    color: '#F59E0B',
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
