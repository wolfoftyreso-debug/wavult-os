// ─── Causal OS — Cash Flow Engine ─────────────────────────────────────────────

import type { CashFlowEntry, DayCashFlow, ScenarioAdjustment } from './causalTypes'

// Map variableId to category keywords for scenario adjustments
const VARIABLE_CATEGORY_MAP: Record<string, string[]> = {
  monthly_marketing_spend: ['marknadsföring', 'marketing'],
  monthly_fixed_cost: ['aws', 'supabase', 'mapbox', 'openclaw', 'infrastruktur', 'verktyg'],
  monthly_salary_cost: ['lön', 'salary'],
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function expandEntry(entry: CashFlowEntry, start: Date, end: Date): CashFlowEntry[] {
  const results: CashFlowEntry[] = []
  const entryStart = new Date(entry.date)

  if (!entry.isRecurring || !entry.recurrenceInterval) {
    // One-time: include only if within range
    if (entryStart >= start && entryStart <= end) {
      results.push(entry)
    }
    return results
  }

  let current = new Date(entryStart)
  // Fast-forward to start if entry begins before window
  if (current < start) {
    if (entry.recurrenceInterval === 'monthly') {
      while (current < start) {
        current = addMonths(current, 1)
      }
    } else if (entry.recurrenceInterval === 'weekly') {
      while (current < start) {
        current = addDays(current, 7)
      }
    } else if (entry.recurrenceInterval === 'daily') {
      while (current < start) {
        current = addDays(current, 1)
      }
    }
  }

  while (current <= end) {
    results.push({ ...entry, date: toDateStr(current) })
    if (entry.recurrenceInterval === 'monthly') {
      current = addMonths(current, 1)
    } else if (entry.recurrenceInterval === 'weekly') {
      current = addDays(current, 7)
    } else if (entry.recurrenceInterval === 'daily') {
      current = addDays(current, 1)
    } else {
      break
    }
  }

  return results
}

function applyScenarioToEntry(entry: CashFlowEntry, adjustments: ScenarioAdjustment[]): CashFlowEntry {
  let amount = entry.amount
  for (const adj of adjustments) {
    const keywords = VARIABLE_CATEGORY_MAP[adj.variableId]
    if (!keywords) continue
    const labelLower = entry.label.toLowerCase()
    const matches = keywords.some(k => labelLower.includes(k))
    if (matches) {
      amount = amount * (1 + adj.deltaPercent / 100)
    }
  }
  return { ...entry, amount }
}

export function buildCashFlowProjection(
  startBalance: number,
  entries: CashFlowEntry[],
  scenarioAdjustments: ScenarioAdjustment[],
  startDate?: string
): DayCashFlow[] {
  const start = startDate ? new Date(startDate) : new Date()
  start.setHours(0, 0, 0, 0)
  const end = addDays(start, 364)

  // Apply scenario adjustments to entries
  const adjustedEntries = entries.map(e => applyScenarioToEntry(e, scenarioAdjustments))

  // Expand all entries into flat list
  const allEntries: CashFlowEntry[] = []
  for (const entry of adjustedEntries) {
    allEntries.push(...expandEntry(entry, start, end))
  }

  // Group by date
  const byDate: Record<string, CashFlowEntry[]> = {}
  for (const entry of allEntries) {
    if (!byDate[entry.date]) byDate[entry.date] = []
    byDate[entry.date].push(entry)
  }

  // Build day-by-day projection
  const projection: DayCashFlow[] = []
  let balance = startBalance

  for (let i = 0; i < 365; i++) {
    const date = toDateStr(addDays(start, i))
    const dayEntries = byDate[date] ?? []

    let inflows = 0
    let outflows = 0
    for (const e of dayEntries) {
      if (e.amount > 0) inflows += e.amount
      else outflows += Math.abs(e.amount)
    }

    balance = balance + inflows - outflows

    let warning: DayCashFlow['warning']
    if (balance < 0) warning = 'negative'
    else if (balance < 10000) warning = 'critical'
    else if (balance < 50000) warning = 'low'

    projection.push({ date, balance, inflows, outflows, entries: dayEntries, warning })
  }

  return projection
}

export function findCriticalDay(
  projection: DayCashFlow[]
): { day: DayCashFlow; daysFromNow: number } | null {
  const idx = projection.findIndex(d => d.warning === 'negative')
  if (idx === -1) return null
  return { day: projection[idx], daysFromNow: idx }
}

export function findLowWarningDay(
  projection: DayCashFlow[]
): { day: DayCashFlow; daysFromNow: number } | null {
  const idx = projection.findIndex(d => d.warning === 'low' || d.warning === 'critical' || d.warning === 'negative')
  if (idx === -1) return null
  return { day: projection[idx], daysFromNow: idx }
}

export function calculateSafeInvestmentCapacity(
  projection: DayCashFlow[],
  safeFloor = 50000
): number {
  const minBalance = Math.min(...projection.map(d => d.balance))
  const currentBalance = projection[0]?.balance ?? 0
  const capacity = currentBalance - safeFloor - (safeFloor - minBalance)
  return Math.max(0, capacity)
}

export function summarizeProjection(projection: DayCashFlow[]): {
  balanceIn30d: number
  balanceIn90d: number
  balanceIn180d: number
  balanceIn365d: number
  totalInflows: number
  totalOutflows: number
} {
  const balanceIn30d = projection[29]?.balance ?? projection[projection.length - 1]?.balance ?? 0
  const balanceIn90d = projection[89]?.balance ?? projection[projection.length - 1]?.balance ?? 0
  const balanceIn180d = projection[179]?.balance ?? projection[projection.length - 1]?.balance ?? 0
  const balanceIn365d = projection[364]?.balance ?? projection[projection.length - 1]?.balance ?? 0

  let totalInflows = 0
  let totalOutflows = 0
  for (const day of projection) {
    totalInflows += day.inflows
    totalOutflows += day.outflows
  }

  return { balanceIn30d, balanceIn90d, balanceIn180d, balanceIn365d, totalInflows, totalOutflows }
}
