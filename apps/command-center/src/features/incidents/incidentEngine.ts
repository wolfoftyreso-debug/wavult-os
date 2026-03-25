// ─── Incident Engine — Closed-Loop Control System ────────────────────────────
// Layer 2–7: KPI monitoring → anomaly detection → root cause → action system → escalation
// This is NOT a dashboard. This is a self-correcting operational system.

import { COMMAND_CHAIN } from '../org-graph/commandChain'

// ─── KPI Definition (full structure) ─────────────────────────────────────────

export type KPIStatus = 'green' | 'yellow' | 'red'
export type KPITrend  = 'up' | 'down' | 'flat'

export interface KPIDefinition {
  id: string
  role_id: string
  name: string
  target: string
  target_value: number       // numeric for threshold comparison
  current: string
  current_value: number
  unit: string
  trend: KPITrend
  deadline: string           // ISO date string
  weight: 'critical' | 'primary' | 'secondary'
}

// ─── Incident types ───────────────────────────────────────────────────────────

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IncidentState    = 'open' | 'action_pending' | 'action_accepted' | 'escalated' | 'locked' | 'resolved'
export type ActionState      = 'proposed' | 'accepted' | 'rejected' | 'requires_dual_approval'

export interface RootCauseAnalysis {
  problem: string
  root_cause: string
  impact: string
  affected_roles: string[]       // role ids
  affected_entities: string[]    // entity ids
  dependency_chain: string[]     // ordered list of failing dependencies
}

export interface ProposedAction {
  id: string
  text: string                   // "Increase headcount by 1 FTE within 3 days"
  owner_role_id: string          // who must act
  approver_role_id: string       // superior who must approve (if rejected once)
  deadline_days: number
  smart_criteria: {
    specific: string
    measurable: string
    achievable: string
    relevant: string
    time_bound: string
  }
  state: ActionState
  rejected_at?: string
  accepted_at?: string
}

export interface PerformanceIncident {
  id: string
  kpi_id: string
  role_id: string
  severity: IncidentSeverity
  state: IncidentState
  triggered_at: string           // ISO timestamp
  rca: RootCauseAnalysis
  proposed_actions: ProposedAction[]
  active_action_index: number
  escalated: boolean
  escalation_trigger?: string
  leadership_meeting_required: boolean
  locked: boolean                // no action active — system locked
  resolved_at?: string
}

// ─── KPI Data (extended from commandChain.ts) ────────────────────────────────
// Each role gets full KPI definitions with targets + thresholds

export const KPI_DEFINITIONS: KPIDefinition[] = [
  // ─── Group CEO ────────────────────────────────────────────────────────────
  {
    id: 'ceo-entities-live',
    role_id: 'group-ceo',
    name: 'Entities incorporated',
    target: '7 by Aug 2026', target_value: 7,
    current: '1', current_value: 1,
    unit: 'entities', trend: 'up',
    deadline: '2026-08-01', weight: 'primary',
  },
  {
    id: 'ceo-go-live',
    role_id: 'group-ceo',
    name: 'Sweden go-live',
    target: 'Jun 2026', target_value: 1,
    current: 'On track', current_value: 1,
    unit: 'milestone', trend: 'flat',
    deadline: '2026-06-15', weight: 'critical',
  },
  {
    id: 'ceo-systems-built',
    role_id: 'group-ceo',
    name: 'Core systems deployed',
    target: '5', target_value: 5,
    current: '3', current_value: 3,
    unit: 'systems', trend: 'up',
    deadline: '2026-05-01', weight: 'primary',
  },

  // ─── CEO Operations ───────────────────────────────────────────────────────
  {
    id: 'ceo-ops-projects',
    role_id: 'ceo-ops',
    name: 'Active projects',
    target: '4', target_value: 4,
    current: '4', current_value: 4,
    unit: 'projects', trend: 'flat',
    deadline: '2026-06-01', weight: 'primary',
  },
  {
    id: 'ceo-ops-mrr',
    role_id: 'ceo-ops',
    name: 'First MRR',
    target: '>0 by Jul 2026', target_value: 1,
    current: 'Pre-revenue', current_value: 0,
    unit: 'milestone', trend: 'flat',
    deadline: '2026-07-01', weight: 'critical',
  },
  {
    id: 'ceo-ops-workcamp',
    role_id: 'ceo-ops',
    name: 'Thailand workcamp',
    target: 'Apr 11 2026', target_value: 1,
    current: 'Scheduled', current_value: 1,
    unit: 'milestone', trend: 'flat',
    deadline: '2026-04-11', weight: 'secondary',
  },

  // ─── CFO ──────────────────────────────────────────────────────────────────
  {
    id: 'cfo-bank-accounts',
    role_id: 'cfo',
    name: 'Bank accounts opened',
    target: '4 (all entities)', target_value: 4,
    current: '0', current_value: 0,
    unit: 'accounts', trend: 'flat',
    deadline: '2026-04-30', weight: 'critical',
  },
  {
    id: 'cfo-intercompany',
    role_id: 'cfo',
    name: 'Intercompany agreements',
    target: 'All signed', target_value: 5,
    current: '0 signed', current_value: 0,
    unit: 'agreements', trend: 'flat',
    deadline: '2026-05-15', weight: 'critical',
  },
  {
    id: 'cfo-cashflow',
    role_id: 'cfo',
    name: 'Cashflow status',
    target: 'Positive', target_value: 1,
    current: 'Watch', current_value: 0.5,
    unit: 'status', trend: 'flat',
    deadline: '2026-06-01', weight: 'primary',
  },

  // ─── CTO ──────────────────────────────────────────────────────────────────
  {
    id: 'cto-services-live',
    role_id: 'cto',
    name: 'ECS services live',
    target: '4', target_value: 4,
    current: '2', current_value: 2,
    unit: 'services', trend: 'up',
    deadline: '2026-05-01', weight: 'primary',
  },
  {
    id: 'cto-uptime',
    role_id: 'cto',
    name: 'System uptime',
    target: '99.5%', target_value: 99.5,
    current: '99%', current_value: 99,
    unit: '%', trend: 'flat',
    deadline: '2026-12-31', weight: 'primary',
  },
  {
    id: 'cto-tech-debt',
    role_id: 'cto',
    name: 'Open tech debt items',
    target: '0', target_value: 0,
    current: '3', current_value: 3,
    unit: 'items', trend: 'flat',
    deadline: '2026-04-15', weight: 'secondary',
  },

  // ─── CLO ──────────────────────────────────────────────────────────────────
  {
    id: 'clo-incorporated',
    role_id: 'clo',
    name: 'Entities incorporated',
    target: '7', target_value: 7,
    current: '1', current_value: 1,
    unit: 'entities', trend: 'up',
    deadline: '2026-07-01', weight: 'critical',
  },
  {
    id: 'clo-contracts',
    role_id: 'clo',
    name: 'Key contracts signed',
    target: '5+', target_value: 5,
    current: '0', current_value: 0,
    unit: 'contracts', trend: 'flat',
    deadline: '2026-05-01', weight: 'critical',
  },
  {
    id: 'clo-compliance',
    role_id: 'clo',
    name: 'Compliance status',
    target: 'OK all entities', target_value: 1,
    current: 'Watch', current_value: 0.5,
    unit: 'status', trend: 'flat',
    deadline: '2026-06-01', weight: 'primary',
  },
]

// ─── KPI Status engine ────────────────────────────────────────────────────────

export function getKPIStatus(kpi: KPIDefinition): KPIStatus {
  const ratio = kpi.current_value / kpi.target_value
  if (ratio >= 0.8) return 'green'
  if (ratio >= 0.4) return 'yellow'
  return 'red'
}

export function getRoleKPIs(roleId: string): KPIDefinition[] {
  return KPI_DEFINITIONS.filter(k => k.role_id === roleId)
}

export function getRoleStatus(roleId: string): 'green' | 'yellow' | 'red' {
  const kpis = getRoleKPIs(roleId)
  if (kpis.some(k => getKPIStatus(k) === 'red')) return 'red'
  if (kpis.some(k => getKPIStatus(k) === 'yellow')) return 'yellow'
  return 'green'
}

// ─── Root cause analysis engine ───────────────────────────────────────────────

const RCA_TEMPLATES: Record<string, (kpi: KPIDefinition) => RootCauseAnalysis> = {
  'cfo-bank-accounts': (kpi) => ({
    problem: `Bank accounts not opened (${kpi.current_value}/${kpi.target_value})`,
    root_cause: 'Incorporation prerequisites not complete — entities not legally formed yet, blocking account applications',
    impact: 'Blocks all financial flows, intercompany billing, and revenue collection. Entire financial infrastructure is non-functional.',
    affected_roles: ['cfo', 'clo', 'group-ceo'],
    affected_entities: ['wavult-group', 'wavult-operations', 'landvex-ab', 'landvex-inc'],
    dependency_chain: ['CLO: entities not incorporated', 'CFO: cannot open accounts', 'Intercompany: blocked', 'Revenue collection: impossible'],
  }),
  'cfo-intercompany': (kpi) => ({
    problem: `Intercompany agreements unsigned (${kpi.current_value}/${kpi.target_value})`,
    root_cause: 'Legal entities not incorporated, making it impossible to create valid intercompany agreements between them',
    impact: 'No legal basis for internal billing. Royalty flows, service fees, and management fees cannot be executed legally.',
    affected_roles: ['cfo', 'clo', 'group-ceo'],
    affected_entities: ['wavult-group', 'wavult-operations'],
    dependency_chain: ['CLO: incorporation pending', 'CFO: no legal entity to bill', 'Revenue flow: undefined'],
  }),
  'clo-incorporated': (kpi) => ({
    problem: `Only ${kpi.current_value} of ${kpi.target_value} entities incorporated`,
    root_cause: 'Formation process not started for 6 entities. Requires legal filings, registered agents, and local compliance per jurisdiction.',
    impact: 'All downstream operations blocked: banking, intercompany agreements, contracts, compliance.',
    affected_roles: ['clo', 'cfo', 'group-ceo'],
    affected_entities: ['wavult-group', 'wavult-operations', 'quixzoom-uab', 'quixzoom-inc', 'landvex-inc', 'landvex-ab'],
    dependency_chain: ['6 entities not legally formed', 'Banking blocked (CFO)', 'Contracts impossible (CLO)', 'Revenue flows blocked (all)'],
  }),
  'clo-contracts': (kpi) => ({
    problem: `No contracts signed (${kpi.current_value}/${kpi.target_value} target)`,
    root_cause: 'Entity formation is prerequisite. Cannot sign contracts on behalf of unincorporated entities.',
    impact: 'No legal protection for IP, no service agreements, no customer contracts possible.',
    affected_roles: ['clo', 'ceo-ops'],
    affected_entities: ['wavult-group', 'landvex-ab'],
    dependency_chain: ['Entities not formed', 'No legal standing to contract', 'Sales pipeline blocked'],
  }),
  'ceo-ops-mrr': (_kpi) => ({
    problem: 'Zero revenue — pre-revenue phase',
    root_cause: 'Go-to-market execution not started. quiXzoom not publicly launched. No paying customers.',
    impact: 'No revenue runway. Operating on funding only. Urgency increases weekly.',
    affected_roles: ['ceo-ops', 'group-ceo'],
    affected_entities: ['quixzoom-uab', 'landvex-ab'],
    dependency_chain: ['quiXzoom not launched', 'No zoomer acquisition', 'No mission supply', 'No data product to sell'],
  }),
  'cfo-cashflow': (_kpi) => ({
    problem: 'Cashflow status: Watch',
    root_cause: 'Costs accumulating (infra, tools, operations) without any revenue offset.',
    impact: 'Runway shortening. If not corrected by Q3 2026, operational continuity at risk.',
    affected_roles: ['cfo', 'group-ceo', 'ceo-ops'],
    affected_entities: ['wavult-operations'],
    dependency_chain: ['No revenue (CEO-Ops)', 'Costs running (CTO infra)', 'Cash position deteriorating'],
  }),
}

function buildRCA(kpi: KPIDefinition): RootCauseAnalysis {
  const template = RCA_TEMPLATES[kpi.id]
  if (template) return template(kpi)

  // Generic fallback
  return {
    problem: `${kpi.name} below threshold (current: ${kpi.current}, target: ${kpi.target})`,
    root_cause: `${kpi.name} has not progressed. Dependencies or execution gaps need investigation.`,
    impact: `Performance deficit in ${kpi.name} may cascade to connected KPIs and entities.`,
    affected_roles: [kpi.role_id],
    affected_entities: [],
    dependency_chain: [`${kpi.name}: below threshold`],
  }
}

// ─── Action proposal engine ───────────────────────────────────────────────────

const ACTION_TEMPLATES: Record<string, ProposedAction[]> = {
  'cfo-bank-accounts': [
    {
      id: 'act-cfo-bank-1',
      text: 'Coordinate with CLO to complete entity formation for top-priority entities (LandveX AB + Wavult Operations) within 14 days',
      owner_role_id: 'cfo', approver_role_id: 'group-ceo',
      deadline_days: 14,
      smart_criteria: {
        specific: 'Complete formation paperwork for LandveX AB and Wavult Operations',
        measurable: '2 entities fully incorporated, registered, tax ID obtained',
        achievable: 'Swedish AB + Dubai Free Zone — both have clear formation paths',
        relevant: 'Unblocks bank account applications immediately',
        time_bound: '14 days from acceptance',
      },
      state: 'proposed',
    },
    {
      id: 'act-cfo-bank-2',
      text: 'Apply for business bank accounts for LandveX AB at SEB and Wavult Operations at Emirates NBD — within 3 days of entity formation',
      owner_role_id: 'cfo', approver_role_id: 'group-ceo',
      deadline_days: 3,
      smart_criteria: {
        specific: 'Submit bank applications for both priority entities',
        measurable: 'Applications submitted and acknowledged by bank',
        achievable: 'Standard process, documentation ready',
        relevant: 'First accounts unlock all financial infrastructure',
        time_bound: '3 days after formation complete',
      },
      state: 'proposed',
    },
  ],
  'clo-incorporated': [
    {
      id: 'act-clo-inc-1',
      text: 'Engage Swedish formation agent for LandveX AB — target completion 21 days',
      owner_role_id: 'clo', approver_role_id: 'group-ceo',
      deadline_days: 21,
      smart_criteria: {
        specific: 'File LandveX AB formation with Bolagsverket via registered formation agent',
        measurable: 'Registration number received, F-skatt applied for',
        achievable: 'Swedish AB standard 1–3 weeks with agent',
        relevant: 'LandveX AB is first EU entity required for LandveX go-to-market',
        time_bound: '21 days from acceptance',
      },
      state: 'proposed',
    },
    {
      id: 'act-clo-inc-2',
      text: 'Initiate Dubai Free Zone registration for Wavult Group and Wavult Operations simultaneously',
      owner_role_id: 'clo', approver_role_id: 'group-ceo',
      deadline_days: 30,
      smart_criteria: {
        specific: 'Submit Free Zone applications for both Dubai entities to IFZA or DIFC',
        measurable: 'Applications submitted, trade licenses in process',
        achievable: 'Parallel formation reduces total time',
        relevant: 'Holding + Operations must exist before intercompany structure can function',
        time_bound: '30 days',
      },
      state: 'proposed',
    },
  ],
  'ceo-ops-mrr': [
    {
      id: 'act-ceo-mrr-1',
      text: 'Launch quiXzoom beta in Stockholm — 10 zoomer onboarding targets within 30 days of Thailand workcamp',
      owner_role_id: 'ceo-ops', approver_role_id: 'group-ceo',
      deadline_days: 30,
      smart_criteria: {
        specific: 'Activate quiXzoom in Stockholm with 10+ registered zoomers taking first missions',
        measurable: '10 completed missions, first payout processed',
        achievable: 'Platform is built, missions are ready to create',
        relevant: 'First real data = first product = first Quixom Ads revenue path',
        time_bound: '30 days post Thailand (by May 11)',
      },
      state: 'proposed',
    },
  ],
  'cfo-cashflow': [
    {
      id: 'act-cfo-cf-1',
      text: 'Prepare cashflow projection for next 6 months and present to Group CEO — deadline 7 days',
      owner_role_id: 'cfo', approver_role_id: 'group-ceo',
      deadline_days: 7,
      smart_criteria: {
        specific: 'Monthly cashflow projection May–Oct 2026 with assumptions documented',
        measurable: 'Document delivered, reviewed, approved',
        achievable: 'Data exists in current infrastructure spending',
        relevant: 'Required for runway management and capital decisions',
        time_bound: '7 days',
      },
      state: 'proposed',
    },
  ],
}

function buildActions(kpi: KPIDefinition): ProposedAction[] {
  const templates = ACTION_TEMPLATES[kpi.id]
  if (templates) return templates

  // Generic fallback action
  const role = COMMAND_CHAIN.find(r => r.id === kpi.role_id)
  const superior = COMMAND_CHAIN.find(r => r.id === role?.reports_to)

  return [{
    id: `act-${kpi.id}-generic`,
    text: `Develop and present corrective plan for "${kpi.name}" — current: ${kpi.current}, target: ${kpi.target}`,
    owner_role_id: kpi.role_id,
    approver_role_id: superior?.id ?? 'group-ceo',
    deadline_days: 7,
    smart_criteria: {
      specific: `Define specific steps to reach ${kpi.target} for ${kpi.name}`,
      measurable: `${kpi.name} reaches ${kpi.target}`,
      achievable: 'To be confirmed in plan',
      relevant: 'Directly addresses failing KPI',
      time_bound: '7 days to present plan',
    },
    state: 'proposed',
  }]
}

// ─── Incident generator ───────────────────────────────────────────────────────

function makeSeverity(kpi: KPIDefinition): IncidentSeverity {
  if (kpi.weight === 'critical') return 'critical'
  const ratio = kpi.current_value / kpi.target_value
  if (ratio < 0.2) return 'high'
  if (ratio < 0.5) return 'medium'
  return 'low'
}

export function generateIncidents(): PerformanceIncident[] {
  const incidents: PerformanceIncident[] = []

  KPI_DEFINITIONS.forEach(kpi => {
    const status = getKPIStatus(kpi)
    if (status !== 'red' && status !== 'yellow') return
    if (status === 'yellow' && kpi.weight === 'secondary') return // only surface secondary when red

    const rca = buildRCA(kpi)
    const actions = buildActions(kpi)
    const severity = makeSeverity(kpi)

    // Determine if escalation required
    const roleKPIs = getRoleKPIs(kpi.role_id)
    const failingCritical = roleKPIs.filter(k => getKPIStatus(k) === 'red' && k.weight === 'critical')
    const escalated = failingCritical.length >= 2 || severity === 'critical'

    incidents.push({
      id: `inc-${kpi.id}`,
      kpi_id: kpi.id,
      role_id: kpi.role_id,
      severity,
      state: 'action_pending',
      triggered_at: new Date().toISOString(),
      rca,
      proposed_actions: actions,
      active_action_index: 0,
      escalated,
      escalation_trigger: escalated
        ? severity === 'critical'
          ? `Critical KPI "${kpi.name}" is failing`
          : `Multiple critical KPIs failing for ${kpi.role_id}`
        : undefined,
      leadership_meeting_required: escalated,
      locked: false,
    })
  })

  return incidents
}

// ─── Graph propagation: which roles are "infected" by cascading failures ──────

export interface PropagationMap {
  primary_failures: string[]   // role ids with red KPIs
  cascade_failures: string[]   // role ids affected by upstream failures
  escalation_roles: string[]   // roles that must be in leadership meeting
}

export function computePropagation(incidents: PerformanceIncident[]): PropagationMap {
  const primaryFailures = [...new Set(
    incidents.filter(i => i.severity === 'critical' || i.severity === 'high')
      .map(i => i.role_id)
  )]

  // Cascade: roles that have a superior with failing KPIs
  const cascadeFailures = [...new Set(
    incidents.flatMap(i => i.rca.affected_roles).filter(r => !primaryFailures.includes(r))
  )]

  const escalationRoles = [...new Set([
    ...primaryFailures,
    ...incidents.filter(i => i.escalated).flatMap(i => i.rca.affected_roles),
  ])]

  return { primary_failures: primaryFailures, cascade_failures: cascadeFailures, escalation_roles: escalationRoles }
}

// ─── KPI status color (for graph use) ─────────────────────────────────────────

export const KPI_STATUS_COLOR: Record<KPIStatus, string> = {
  green:  '#10B981',
  yellow: '#F59E0B',
  red:    '#EF4444',
}

export const SEVERITY_COLOR: Record<IncidentSeverity, string> = {
  low:      '#6B7280',
  medium:   '#F59E0B',
  high:     '#EF4444',
  critical: '#EF4444',
}
