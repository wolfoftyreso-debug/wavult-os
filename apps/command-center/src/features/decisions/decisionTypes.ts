// ─── Decision-Driven Meeting System — Core Types ─────────────────────────────
// Wavult OS: Möten existerar ENBART för att fatta strukturerade beslut

export type MeetingLevel = 'annual' | 'qbr' | 'monthly' | 'weekly' | 'daily' | 'management-review' | 'capa-review' | 'risk-assessment' | 'customer-satisfaction' | 'internal-audit' | 'supplier-review' | 'kpi-review' | 'compliance-review'

export type EntityId = 'wavult-group' | 'landvex-ab' | 'landvex-inc' | 'quixzoom-uab' | 'quixzoom-inc' | 'wavult'
export type DecisionStatus = 'draft' | 'pending_approval' | 'active' | 'decided' | 'archived'
export type VoteChoice = 'A' | 'B' | 'C' | 'abstain'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface DecisionAlternative {
  id: 'A' | 'B' | 'C'
  title: string
  description: string
  revenueImpact: number        // SEK, positiv = intäkt, negativ = kostnad
  costImpact: number           // SEK
  riskLevel: RiskLevel
  timeframe: string            // "3 månader", "Q3 2026" etc
  operationalImpact: string    // fri text
}

export interface DecisionBlock {
  id: string
  meetingId: string
  title: string
  context: string              // auto-genererad kontext
  problemStatement: string
  objective: string            // obligatorisk målsättning
  alternatives: [DecisionAlternative, DecisionAlternative, DecisionAlternative]  // exakt 3
  votes: Record<string, VoteChoice>   // userId → val
  result: 'A' | 'B' | 'C' | null
  overriddenBy: string | null         // userId om CEO override
  overrideReason: string | null
  systemActions: SystemAction[]        // vad som triggas automatiskt
  status: DecisionStatus
  createdAt: string
  decidedAt: string | null
}

export interface SystemAction {
  type: 'update_okr' | 'update_budget' | 'create_milestone' | 'create_task' | 'update_strategy'
  payload: Record<string, unknown>
  executed: boolean
  executedAt: string | null
}

export interface Meeting {
  id: string
  level: MeetingLevel
  title: string
  scheduledAt: string
  participants: string[]       // userIds
  agenda: DecisionBlock[]
  status: 'blocked' | 'scheduled' | 'in_progress' | 'completed'
  blockedReason?: string       // varför det är blockerat
  minutesGenerated: boolean
  createdBy: string
  entity?: EntityId            // vilken entitet mötet tillhör
  required_docs?: string[]     // obligatoriska dokument per mötestyp
}

// Regler per nivå — vad som får beslutas
export const MEETING_AUTHORITY: Record<MeetingLevel, string[]> = {
  annual: ['set_vision', 'set_okrs', 'set_budget', 'restructure_company'],
  qbr: ['adjust_quarterly_goals', 'reallocate_resources', 'approve_major_projects'],
  monthly: ['operational_changes', 'approve_minor_projects', 'adjust_team'],
  weekly: ['task_priorities', 'unblock_issues'],
  daily: ['daily_execution', 'immediate_blockers'],
  'management-review': ['quality_system_review', 'process_improvement', 'resource_allocation'],
  'capa-review': ['corrective_actions', 'preventive_actions', 'nonconformity_handling'],
  'risk-assessment': ['risk_identification', 'risk_mitigation', 'risk_acceptance'],
  'customer-satisfaction': ['customer_feedback', 'nps_review', 'complaint_handling'],
  'internal-audit': ['audit_findings', 'compliance_verification', 'process_audit'],
  'supplier-review': ['supplier_performance', 'supplier_qualification', 'procurement_decisions'],
  'kpi-review': ['kpi_performance', 'target_adjustment', 'metric_review'],
  'compliance-review': ['gdpr_compliance', 'aml_compliance', 'legal_review'],
}

// Obligatoriska dokument per mötestyp
export const MEETING_REQUIRED_DOCS: Partial<Record<MeetingLevel, string[]>> = {
  'management-review': ['Protokoll', 'KPI-rapport', 'Kundnöjdhetsdata'],
  qbr: ['OKR-rapport', 'Financial Summary', 'Action Items'],
  'capa-review': ['CAPA-rapport', 'Rotorsaksanalys', 'Åtgärdsplan'],
  'risk-assessment': ['Riskmatris', 'Mitigationsplan', 'Riskregister'],
  'internal-audit': ['Revisionsplan', 'Avvikelserapport', 'Åtgärdsplan'],
  'compliance-review': ['Compliance-rapport', 'GDPR-logg', 'Legal memo'],
  annual: ['Årsplan', 'Budget', 'OKR-dokument', 'Styrelsebeslut'],
}

// Mänskliga etiketter per nivå
export const MEETING_LEVEL_LABELS: Record<MeetingLevel, string> = {
  annual: 'Annual Planning',
  qbr: 'QBR',
  monthly: 'Månadsgenomgång',
  weekly: 'Veckomöte',
  daily: 'Dagligt standup',
  'management-review': 'Management Review',
  'capa-review': 'CAPA Review',
  'risk-assessment': 'Risk Assessment',
  'customer-satisfaction': 'Customer Satisfaction',
  'internal-audit': 'Internal Audit',
  'supplier-review': 'Supplier Review',
  'kpi-review': 'KPI Review',
  'compliance-review': 'Compliance Review',
}

// ISO 9001-referens per mötestyp
export const MEETING_ISO_REF: Partial<Record<MeetingLevel, string>> = {
  'management-review': 'ISO 9001 §9.3',
  'capa-review': 'ISO 9001 §10.2',
  'risk-assessment': 'ISO 9001 §6.1 / ISO 31000',
  'customer-satisfaction': 'ISO 9001 §9.1.2',
  'internal-audit': 'ISO 9001 §9.2',
  'supplier-review': 'ISO 9001 §8.4',
  'kpi-review': 'ISO 9001 §9.1',
  'compliance-review': 'GDPR / AML / Legal',
}

// Entiteter — färgkodade
export const ENTITY_LABELS: Record<EntityId, string> = {
  'wavult-group': 'Wavult Group (alla)',
  'landvex-ab': 'Landvex AB (SE)',
  'landvex-inc': 'Landvex Inc (US)',
  'quixzoom-uab': 'QuiXzoom UAB (EU)',
  'quixzoom-inc': 'QuiXzoom Inc (US)',
  'wavult': 'Wavult',
}

export const ENTITY_COLORS: Record<EntityId, string> = {
  'wavult-group': '#2563EB',
  'landvex-ab': '#F59E0B',
  'landvex-inc': '#D97706',
  'quixzoom-uab': '#10B981',
  'quixzoom-inc': '#059669',
  'wavult': '#60A5FA',
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'Låg risk',
  medium: 'Medel risk',
  high: 'Hög risk',
  critical: 'Kritisk risk',
}

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  low: 'var(--color-success)',
  medium: 'var(--color-warning)',
  high: 'var(--color-danger)',
  critical: '#7B0000',
}

export const STATUS_LABELS: Record<Meeting['status'], string> = {
  blocked: 'Blockerat',
  scheduled: 'Planerat',
  in_progress: 'Pågående',
  completed: 'Avslutat',
}

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  draft: 'Utkast',
  pending_approval: 'Väntar godkännande',
  active: 'Aktivt',
  decided: 'Beslutat',
  archived: 'Arkiverat',
}
