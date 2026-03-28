// ─── Decision-Driven Meeting System — Core Types ─────────────────────────────
// Wavult OS: Möten existerar ENBART för att fatta strukturerade beslut

export type MeetingLevel = 'annual' | 'qbr' | 'monthly' | 'weekly' | 'daily'
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
}

// Regler per nivå — vad som får beslutas
export const MEETING_AUTHORITY: Record<MeetingLevel, string[]> = {
  annual: ['set_vision', 'set_okrs', 'set_budget', 'restructure_company'],
  qbr: ['adjust_quarterly_goals', 'reallocate_resources', 'approve_major_projects'],
  monthly: ['operational_changes', 'approve_minor_projects', 'adjust_team'],
  weekly: ['task_priorities', 'unblock_issues'],
  daily: ['daily_execution', 'immediate_blockers'],
}

// Mänskliga etiketter per nivå
export const MEETING_LEVEL_LABELS: Record<MeetingLevel, string> = {
  annual: 'Annual Planning',
  qbr: 'QBR',
  monthly: 'Månadsgenomgång',
  weekly: 'Veckomöte',
  daily: 'Dagligt standup',
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
