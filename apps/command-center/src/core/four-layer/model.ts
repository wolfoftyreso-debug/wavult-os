// ─── Four-Layer Total Structure Engine ───────────────────────────────────────
// Every entity in the system must have 4 layers. No exceptions.
// Layer 1: DEFINITION (WHAT)  — what is this, what problem, what category
// Layer 2: PURPOSE (WHY)      — why important, what if ignored, which KPI
// Layer 3: METHOD (HOW)       — steps, dependencies, rules, tools
// Layer 4: EXECUTION (DO)     — status, owner, next action, deadline, outcome
//
// If any layer is missing → the entity is INVALID.

// ─── Types ──────────────────────────────────────────────────────────────────

export type EntityCategory = 'finance' | 'sales' | 'operations' | 'people'

export interface LayerDefinition {
  description: string
  problem: string
  category: EntityCategory
}

export interface LayerPurpose {
  importance: string
  ifIgnored: string
  affectedKPI: string
}

export interface LayerMethod {
  steps: string[]
  dependencies: string[]
  rules: string[]
  tools: string[]
}

export type ExecutionStatus = 'active' | 'blocked' | 'pending' | 'done' | 'overdue'

export interface LayerExecution {
  status: ExecutionStatus
  owner: string
  nextAction: string
  deadline: string
  outcomeSEK: number | null
  outcomeDescription: string
}

export interface FourLayerEntity {
  id: string
  title: string
  definition: LayerDefinition
  purpose: LayerPurpose
  method: LayerMethod
  execution: LayerExecution
  createdAt: string
  updatedAt: string
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface ValidationError {
  layer: 'definition' | 'purpose' | 'method' | 'execution'
  field: string
  message: string
}

export function validate(entity: Partial<FourLayerEntity>): ValidationError[] {
  const errors: ValidationError[] = []

  // Definition
  if (!entity.definition?.description) errors.push({ layer: 'definition', field: 'description', message: 'Description required' })
  if (!entity.definition?.problem) errors.push({ layer: 'definition', field: 'problem', message: 'Problem statement required' })
  if (!entity.definition?.category) errors.push({ layer: 'definition', field: 'category', message: 'Category required' })

  // Purpose
  if (!entity.purpose?.importance) errors.push({ layer: 'purpose', field: 'importance', message: 'Why this matters is required' })
  if (!entity.purpose?.ifIgnored) errors.push({ layer: 'purpose', field: 'ifIgnored', message: 'Consequence of ignoring is required' })
  if (!entity.purpose?.affectedKPI) errors.push({ layer: 'purpose', field: 'affectedKPI', message: 'Affected KPI must be specified' })

  // Method
  if (!entity.method?.steps?.length) errors.push({ layer: 'method', field: 'steps', message: 'At least one step required' })

  // Execution
  if (!entity.execution?.owner) errors.push({ layer: 'execution', field: 'owner', message: 'Owner required' })
  if (!entity.execution?.nextAction) errors.push({ layer: 'execution', field: 'nextAction', message: 'Next action required' })
  if (!entity.execution?.deadline) errors.push({ layer: 'execution', field: 'deadline', message: 'Deadline required' })

  return errors
}

export function isValid(entity: Partial<FourLayerEntity>): boolean {
  return validate(entity).length === 0
}

export function completeness(entity: Partial<FourLayerEntity>): { total: number; filled: number; pct: number; missing: string[] } {
  const fields = [
    { key: 'definition.description', val: entity.definition?.description },
    { key: 'definition.problem', val: entity.definition?.problem },
    { key: 'definition.category', val: entity.definition?.category },
    { key: 'purpose.importance', val: entity.purpose?.importance },
    { key: 'purpose.ifIgnored', val: entity.purpose?.ifIgnored },
    { key: 'purpose.affectedKPI', val: entity.purpose?.affectedKPI },
    { key: 'method.steps', val: entity.method?.steps?.length ? 'ok' : '' },
    { key: 'execution.owner', val: entity.execution?.owner },
    { key: 'execution.nextAction', val: entity.execution?.nextAction },
    { key: 'execution.deadline', val: entity.execution?.deadline },
  ]

  const filled = fields.filter(f => !!f.val).length
  const missing = fields.filter(f => !f.val).map(f => f.key)

  return { total: fields.length, filled, pct: Math.round((filled / fields.length) * 100), missing }
}

// ─── Format for chat/AI consumption ─────────────────────────────────────────

export function toStructuredOutput(entity: FourLayerEntity): string {
  return [
    `SITUATION: ${entity.definition.description}`,
    `IMPACT: ${entity.purpose.importance}. If ignored: ${entity.purpose.ifIgnored}`,
    `PLAN: ${entity.method.steps.join(' → ')}`,
    `ACTION: ${entity.execution.nextAction} (Owner: ${entity.execution.owner}, Deadline: ${entity.execution.deadline})${entity.execution.outcomeSEK !== null ? ` → ${entity.execution.outcomeSEK.toLocaleString('sv-SE')} SEK` : ''}`,
  ].join('\n')
}
