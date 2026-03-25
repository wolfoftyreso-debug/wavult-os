// ─── Entity Health Score engine ───────────────────────────────────────────────
// Derives scores from existing entityData — zero new data sources.
// Each dimension: 0–100. Overall: weighted average.

import {
  getEntityFinance, getEntityLegal, getEntitySystems, getEntityOps, getEntityPeople,
} from './entityData'
import { ENTITIES } from '../org-graph/data'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScoreLevel = 'good' | 'watch' | 'critical'

export interface DimensionScore {
  key: 'finance' | 'legal' | 'activity' | 'systems'
  icon: string
  label: string
  score: number        // 0–100
  level: ScoreLevel
  signals: ScoreSignal[]
}

export interface ScoreSignal {
  text: string
  weight: 'positive' | 'neutral' | 'negative' | 'critical'
}

export interface EntityHealthScore {
  entity_id: string
  overall: number
  level: ScoreLevel
  dimensions: DimensionScore[]
  summary: string   // one-line text: what's most important right now
}

// ─── Score math ───────────────────────────────────────────────────────────────

function levelFromScore(score: number): ScoreLevel {
  if (score >= 70) return 'good'
  if (score >= 40) return 'watch'
  return 'critical'
}

function weightedScore(signals: ScoreSignal[]): number {
  if (!signals.length) return 75  // neutral baseline
  let total = 0
  let count = 0
  signals.forEach(s => {
    if (s.weight === 'positive')  { total += 100; count++ }
    if (s.weight === 'neutral')   { total += 70;  count++ }
    if (s.weight === 'negative')  { total += 35;  count++ }
    if (s.weight === 'critical')  { total += 0;   count += 2 }  // double penalty
  })
  return count ? Math.round(total / count) : 75
}

// ─── Finance dimension ────────────────────────────────────────────────────────

function scoreFinance(entityId: string): DimensionScore {
  const finance = getEntityFinance(entityId)
  const signals: ScoreSignal[] = []

  if (!finance) {
    return { key: 'finance', icon: '💰', label: 'Finance', score: 50, level: 'watch', signals: [] }
  }

  // Cashflow status
  if (finance.cashflow_status === 'ok')    signals.push({ text: 'Cashflow OK', weight: 'positive' })
  if (finance.cashflow_status === 'watch') signals.push({ text: 'Cashflow needs attention', weight: 'negative' })
  if (finance.cashflow_status === 'risk')  signals.push({ text: 'Cashflow at risk', weight: 'critical' })

  // Open items severity
  finance.open_items.forEach(item => {
    if (item.status === 'ok')    signals.push({ text: item.label, weight: 'positive' })
    if (item.status === 'watch') signals.push({ text: item.label, weight: 'negative' })
    if (item.status === 'risk')  signals.push({ text: item.label, weight: 'critical' })
  })

  // Has revenue model defined
  if (finance.revenue_model && finance.revenue_model !== '—') {
    signals.push({ text: 'Revenue model defined', weight: 'positive' })
  }

  // No intercompany structure yet
  if (finance.intercompany_in.length === 0 && finance.intercompany_out.length === 0) {
    signals.push({ text: 'No intercompany flows active', weight: 'neutral' })
  }

  const score = weightedScore(signals)
  return { key: 'finance', icon: '💰', label: 'Finance', score, level: levelFromScore(score), signals }
}

// ─── Legal dimension ──────────────────────────────────────────────────────────

function scoreLegal(entityId: string): DimensionScore {
  const legal = getEntityLegal(entityId)
  const signals: ScoreSignal[] = []

  if (!legal) {
    return { key: 'legal', icon: '⚖️', label: 'Legal', score: 50, level: 'watch', signals: [] }
  }

  // Incorporation
  if (legal.incorporation_status === 'complete')     signals.push({ text: 'Incorporation complete', weight: 'positive' })
  if (legal.incorporation_status === 'in-progress')  signals.push({ text: 'Incorporation in progress', weight: 'negative' })
  if (legal.incorporation_status === 'not-started')  signals.push({ text: 'Not incorporated yet', weight: 'critical' })

  // Compliance
  if (legal.compliance_status === 'ok')    signals.push({ text: 'Compliance OK', weight: 'positive' })
  if (legal.compliance_status === 'watch') signals.push({ text: 'Compliance needs review', weight: 'negative' })
  if (legal.compliance_status === 'risk')  signals.push({ text: 'Compliance risk', weight: 'critical' })

  // Contracts
  legal.contracts.forEach(c => {
    if (c.status === 'ok')    signals.push({ text: `${c.name}: OK`, weight: 'positive' })
    if (c.status === 'watch') signals.push({ text: `${c.name}: pending`, weight: 'negative' })
    if (c.status === 'risk')  signals.push({ text: `${c.name}: at risk`, weight: 'critical' })
  })

  // Open items
  legal.open_items.forEach(item => {
    if (item.status === 'ok')    signals.push({ text: item.label, weight: 'positive' })
    if (item.status === 'watch') signals.push({ text: item.label, weight: 'negative' })
    if (item.status === 'risk')  signals.push({ text: item.label, weight: 'critical' })
  })

  const score = weightedScore(signals)
  return { key: 'legal', icon: '⚖️', label: 'Legal', score, level: levelFromScore(score), signals }
}

// ─── Activity dimension ───────────────────────────────────────────────────────

function scoreActivity(entityId: string): DimensionScore {
  const ops = getEntityOps(entityId)
  const people = getEntityPeople(entityId)
  const signals: ScoreSignal[] = []

  if (!ops) {
    return { key: 'activity', icon: '🧠', label: 'Activity', score: 40, level: 'watch', signals: [] }
  }

  // Active work items
  const activeWork = ops.active_work.filter(w => w.status === 'active')
  const blockedWork = ops.active_work.filter(w => w.status === 'blocked')

  if (activeWork.length > 0)  signals.push({ text: `${activeWork.length} active work item(s)`, weight: 'positive' })
  if (blockedWork.length > 0) signals.push({ text: `${blockedWork.length} blocked item(s)`, weight: 'critical' })
  if (activeWork.length === 0 && blockedWork.length === 0) {
    signals.push({ text: 'No active work', weight: 'negative' })
  }

  // Deliverables
  ops.deliverables.forEach(d => {
    if (d.status === 'on-track') signals.push({ text: `${d.label}: on track`, weight: 'positive' })
    if (d.status === 'at-risk')  signals.push({ text: `${d.label}: at risk`, weight: 'critical' })
    if (d.status === 'done')     signals.push({ text: `${d.label}: done`, weight: 'positive' })
  })

  // KPI health
  ops.kpis.forEach(kpi => {
    signals.push({ text: `${kpi.label}: ${kpi.value}`, weight: kpi.good ? 'positive' : 'neutral' })
  })

  // People assigned
  if (people.length > 0) signals.push({ text: `${people.length} role(s) assigned`, weight: 'positive' })
  else signals.push({ text: 'No roles assigned', weight: 'negative' })

  const score = weightedScore(signals)
  return { key: 'activity', icon: '🧠', label: 'Activity', score, level: levelFromScore(score), signals }
}

// ─── Systems dimension ────────────────────────────────────────────────────────

function scoreSystems(entityId: string): DimensionScore {
  const sys = getEntitySystems(entityId)
  const signals: ScoreSignal[] = []

  if (!sys) {
    return { key: 'systems', icon: '🛠', label: 'Systems', score: 50, level: 'watch', signals: [] }
  }

  // System statuses
  sys.systems.forEach(s => {
    if (s.status === 'live')     signals.push({ text: `${s.name}: live`, weight: 'positive' })
    if (s.status === 'building') signals.push({ text: `${s.name}: building`, weight: 'neutral' })
    if (s.status === 'planned')  signals.push({ text: `${s.name}: planned`, weight: 'neutral' })
  })

  // Pipeline health
  sys.pipelines.forEach(p => {
    if (p.status === 'passing') signals.push({ text: `${p.name}: passing`, weight: 'positive' })
    if (p.status === 'failing') signals.push({ text: `${p.name}: FAILING`, weight: 'critical' })
    if (p.status === 'pending') signals.push({ text: `${p.name}: pending`, weight: 'negative' })
  })

  // Open items
  sys.open_items.forEach(item => {
    if (item.status === 'ok')    signals.push({ text: item.label, weight: 'positive' })
    if (item.status === 'watch') signals.push({ text: item.label, weight: 'negative' })
    if (item.status === 'risk')  signals.push({ text: item.label, weight: 'critical' })
  })

  // No systems at all
  if (!sys.systems.length && !sys.pipelines.length) {
    signals.push({ text: 'No systems registered', weight: 'negative' })
  }

  const score = weightedScore(signals)
  return { key: 'systems', icon: '🛠', label: 'Systems', score, level: levelFromScore(score), signals }
}

// ─── Overall score ────────────────────────────────────────────────────────────

const WEIGHTS = { finance: 0.30, legal: 0.30, activity: 0.20, systems: 0.20 }

function buildSummary(dims: DimensionScore[]): string {
  const critical = dims.filter(d => d.level === 'critical')
  const watch    = dims.filter(d => d.level === 'watch')

  if (critical.length > 0) {
    const labels = critical.map(d => d.label).join(' + ')
    return `🔴 Critical: ${labels} need immediate attention`
  }
  if (watch.length > 0) {
    const labels = watch.map(d => d.label).join(' + ')
    return `⚠ Watch: ${labels} require follow-up`
  }
  return '✓ All dimensions healthy — entity is on track'
}

export function computeHealthScore(entityId: string): EntityHealthScore {
  const dims: DimensionScore[] = [
    scoreFinance(entityId),
    scoreLegal(entityId),
    scoreActivity(entityId),
    scoreSystems(entityId),
  ]

  const overall = Math.round(
    dims.reduce((sum, d) => sum + d.score * WEIGHTS[d.key], 0)
  )

  return {
    entity_id: entityId,
    overall,
    level: levelFromScore(overall),
    dimensions: dims,
    summary: buildSummary(dims),
  }
}

// ─── Precompute all entity scores ─────────────────────────────────────────────

export function computeAllHealthScores(): EntityHealthScore[] {
  return ENTITIES.map(e => computeHealthScore(e.id))
}
