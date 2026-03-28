// ─── Causal OS — Type Definitions ─────────────────────────────────────────────

export type CausalCategory = 'revenue' | 'cost' | 'liquidity' | 'capacity' | 'growth'
export type CausalUnit = 'SEK' | 'percent' | 'count' | 'days'
export type CashCategory = 'revenue' | 'salary' | 'tax' | 'subscription' | 'invoice' | 'other'
export type Confidence = 'certain' | 'probable' | 'speculative'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type WarningSeverity = 'info' | 'warning' | 'critical'

export interface CausalLink {
  targetId: string
  multiplier: number
  direction: 1 | -1
  description: string
}

export interface CausalVariable {
  id: string
  label: string
  category: CausalCategory
  unit: CausalUnit
  baseValue: number
  currentValue: number
  affects: CausalLink[]
}

export interface CashFlowEntry {
  date: string
  category: CashCategory
  label: string
  amount: number
  isRecurring: boolean
  recurrenceInterval?: 'daily' | 'weekly' | 'monthly'
  confidence: Confidence
}

export interface DayCashFlow {
  date: string
  balance: number
  inflows: number
  outflows: number
  entries: CashFlowEntry[]
  warning?: 'low' | 'critical' | 'negative'
}

export interface ScenarioAdjustment {
  variableId: string
  deltaPercent: number
}

export interface ScenarioComputed {
  revenueChange: number
  cashIn90d: number
  cashIn365d: number
  runwayDays: number
  risk: RiskLevel
}

export interface Scenario {
  id: string
  name: string
  adjustments: ScenarioAdjustment[]
  computed?: ScenarioComputed
}

export interface SystemWarning {
  id: string
  severity: WarningSeverity
  message: string
  trigger: string
  daysUntil?: number
  suggestedAction?: string
}

export interface DecisionImpact {
  variableId: string
  deltaPercent: number
  timeframe: string
}

export interface DecisionComputed {
  liquidityImpact: number
  growthImpact: number
  risk: RiskLevel
  runway: number
}

export interface DecisionOption {
  id: string
  label: string
  description: string
  impacts: DecisionImpact[]
  computed?: DecisionComputed
}

export interface PropagationEffect {
  from: string
  to: string
  impact: number
  description: string
}
