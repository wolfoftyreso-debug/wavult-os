// ─── Causal OS — Scenario Engine ──────────────────────────────────────────────

import type {
  CausalVariable,
  ScenarioAdjustment,
  SystemWarning,
  DayCashFlow,
  PropagationEffect,
} from './causalTypes'

export function applyScenario(
  variables: CausalVariable[],
  adjustments: ScenarioAdjustment[]
): {
  updatedVariables: CausalVariable[]
  propagatedEffects: PropagationEffect[]
} {
  // Deep clone
  const updated: CausalVariable[] = variables.map(v => ({ ...v, affects: [...v.affects] }))
  const varMap = new Map<string, CausalVariable>(updated.map(v => [v.id, v]))
  const propagatedEffects: PropagationEffect[] = []

  // Apply direct adjustments
  for (const adj of adjustments) {
    const variable = varMap.get(adj.variableId)
    if (!variable) continue
    variable.currentValue = variable.baseValue * (1 + adj.deltaPercent / 100)
  }

  // Propagate causally (one pass — handles direct links)
  for (const variable of updated) {
    for (const link of variable.affects) {
      const target = varMap.get(link.targetId)
      if (!target) continue

      // Compute delta contribution from this variable
      const contribution = variable.currentValue * link.multiplier * link.direction
      const basePropagated = variable.baseValue * link.multiplier * link.direction
      const delta = contribution - basePropagated

      if (Math.abs(delta) > 0.01) {
        target.currentValue = target.currentValue + delta
        propagatedEffects.push({
          from: variable.label,
          to: target.label,
          impact: delta,
          description: link.description,
        })
      }
    }
  }

  return { updatedVariables: updated, propagatedEffects }
}

export function generateWarnings(
  variables: CausalVariable[],
  projection: DayCashFlow[]
): SystemWarning[] {
  const warnings: SystemWarning[] = []
  const varMap = new Map<string, CausalVariable>(variables.map(v => [v.id, v]))

  const runway = varMap.get('runway_days')?.currentValue ?? 333
  const monthlyRevenue = varMap.get('monthly_revenue')?.currentValue ?? 0
  const landvexCustomers = varMap.get('landvex_customers')?.currentValue ?? 0

  if (runway < 90) {
    warnings.push({
      id: 'runway-critical',
      severity: 'critical',
      message: 'Runway under 90 dagar — omedelbar åtgärd krävs',
      trigger: `runway_days = ${Math.round(runway)}`,
      suggestedAction: 'Identifiera och genomför kostnadsbesparingar omedelbart. Säkra kapital.',
    })
  } else if (runway < 180) {
    warnings.push({
      id: 'runway-warning',
      severity: 'warning',
      message: 'Runway under 6 månader',
      trigger: `runway_days = ${Math.round(runway)}`,
      suggestedAction: 'Planera kapitalförstärkning och/eller intäktsökning.',
    })
  }

  if (monthlyRevenue === 0) {
    warnings.push({
      id: 'zero-revenue',
      severity: 'warning',
      message: 'Noll intäkter — ingen inkomst genereras',
      trigger: 'monthly_revenue = 0',
      suggestedAction: 'Prioritera Go-To-Market för QuiXzoom och Landvex.',
    })
  }

  if (landvexCustomers === 0) {
    warnings.push({
      id: 'no-landvex-customers',
      severity: 'info',
      message: 'Inga Landvex-kunder — B2G-intäkter saknas',
      trigger: 'landvex_customers = 0',
      suggestedAction: 'Initiera Landvex pilot-program med kommunala kunder.',
    })
  }

  // Check projection for negative balance
  const negativeDay = projection.findIndex(d => d.warning === 'negative')
  if (negativeDay !== -1) {
    warnings.push({
      id: 'negative-balance',
      severity: 'critical',
      message: `Kassan går negativ om ${negativeDay} dagar`,
      trigger: `Saldo < 0 på dag ${negativeDay}`,
      daysUntil: negativeDay,
      suggestedAction: 'Stoppa icke-kritiska utgifter och säkra intäktsflöden.',
    })
  }

  return warnings
}

export function calculateRisk(
  variables: CausalVariable[],
  projection: DayCashFlow[]
): 'low' | 'medium' | 'high' | 'critical' {
  const varMap = new Map<string, CausalVariable>(variables.map(v => [v.id, v]))
  const runway = varMap.get('runway_days')?.currentValue ?? 333
  const hasNegative = projection.some(d => d.warning === 'negative')
  const hasCritical = projection.some(d => d.warning === 'critical')

  if (hasNegative || runway < 60) return 'critical'
  if (hasCritical || runway < 90) return 'high'
  if (runway < 180) return 'medium'
  return 'low'
}
