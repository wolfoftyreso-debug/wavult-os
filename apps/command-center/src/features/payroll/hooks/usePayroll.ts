import { useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Employee {
  id: string
  name: string
  initials: string
  role: string
  email: string
  phone: string
  start_date: string
  gross_salary: number
  employment_rate: number
  status: 'active' | 'leave'
  tax_table: number
  color: string
  location: string
  created_at?: string
  updated_at?: string
}

export interface PayrollRun {
  id: string
  period: string
  run_date: string
  total_gross: number
  total_employer_tax: number
  total_net: number
  total_cost: number
  status: 'completed' | 'pending' | 'draft'
  approved_by: string | null
  created_at?: string
  updated_at?: string
}

export interface PayrollEntry {
  id: string
  payroll_run_id: string
  employee_id: string
  gross_salary: number
  tax_deduction: number
  net_salary: number
  employer_tax: number
  total_cost: number
  created_at?: string
}

// ─── Salary calculations ──────────────────────────────────────────────────────

export const EMPLOYER_TAX_RATE = 0.3142 // 31.42%
export const TAX_TABLE = 33

export function calcTaxDeduction(grossMonthly: number): number {
  if (grossMonthly <= 20_000) return grossMonthly * 0.25
  if (grossMonthly <= 40_000) return grossMonthly * 0.30
  if (grossMonthly <= 60_000) return grossMonthly * 0.32
  if (grossMonthly <= 80_000) return grossMonthly * 0.34
  return grossMonthly * 0.36
}

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

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function fmt(n: number): string {
  return n.toLocaleString('sv-SE') + ' kr'
}

export function fmtPeriod(period: string): string {
  const [y, m] = period.split('-')
  const months = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec']
  return `${months[parseInt(m, 10) - 1]} ${y}`
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_API_URL ?? 'https://api.wavult.com'

function getToken(): string {
  if (import.meta.env.VITE_BYPASS_AUTH === 'true') return 'bypass'
  return localStorage.getItem('wavult_access_token') ?? 'bypass'
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`${API}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options?.headers ?? {}),
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePayroll() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ─── Fetch employees ────────────────────────────────────────────────────────
  const fetchEmployees = async () => {
    try {
      const data = await apiFetch<Employee[]>('/api/payroll/employees?order=name.asc')
      setEmployees(data || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      console.error('Payroll employees fetch failed:', err)
    }
  }

  // ─── Fetch payroll runs ─────────────────────────────────────────────────────
  const fetchPayrollRuns = async () => {
    try {
      const data = await apiFetch<PayrollRun[]>('/api/payroll/runs?order=period.desc')
      setPayrollRuns(data || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      console.error('Payroll runs fetch failed:', err)
    }
  }

  // ─── Create employee ────────────────────────────────────────────────────────
  const createEmployee = async (employee: Omit<Employee, 'created_at' | 'updated_at'>) => {
    try {
      const data = await apiFetch<Employee>('/api/payroll/employees', {
        method: 'POST',
        body: JSON.stringify(employee),
      })
      setEmployees(prev => [...prev, data])
      return { success: true, data }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  // ─── Update employee ────────────────────────────────────────────────────────
  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
      const data = await apiFetch<Employee>(`/api/payroll/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      setEmployees(prev => prev.map(emp => emp.id === id ? data : emp))
      return { success: true, data }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  // ─── Delete employee ────────────────────────────────────────────────────────
  const deleteEmployee = async (id: string) => {
    try {
      const token = getToken()
      const res = await fetch(`${API}/api/payroll/employees/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setEmployees(prev => prev.filter(emp => emp.id !== id))
      return { success: true }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  // ─── Create payroll run ─────────────────────────────────────────────────────
  const createPayrollRun = async (run: Omit<PayrollRun, 'created_at' | 'updated_at'>) => {
    try {
      const data = await apiFetch<PayrollRun>('/api/payroll/runs', {
        method: 'POST',
        body: JSON.stringify(run),
      })
      setPayrollRuns(prev => [data, ...prev])
      return { success: true, data }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  // ─── Update payroll run ─────────────────────────────────────────────────────
  const updatePayrollRun = async (id: string, updates: Partial<PayrollRun>) => {
    try {
      const data = await apiFetch<PayrollRun>(`/api/payroll/runs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      setPayrollRuns(prev => prev.map(run => run.id === id ? data : run))
      return { success: true, data }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  // ─── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)
      await Promise.all([fetchEmployees(), fetchPayrollRuns()])
      setLoading(false)
    }
    loadData()
  }, [])

  // ─── Computed values ────────────────────────────────────────────────────────
  const activeEmployees = employees.filter(e => e.status === 'active')
  const totalGrossPerMonth = activeEmployees.reduce((sum, e) => sum + e.gross_salary, 0)

  return {
    // State
    employees,
    activeEmployees,
    payrollRuns,
    loading,
    error,

    // Computed
    totalGrossPerMonth,

    // Actions
    fetchEmployees,
    fetchPayrollRuns,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    createPayrollRun,
    updatePayrollRun,

    // Utilities
    calcSalary,
    fmt,
    fmtPeriod,
    EMPLOYER_TAX_RATE,
  }
}
