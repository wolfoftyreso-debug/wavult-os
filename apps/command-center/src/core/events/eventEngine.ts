// ─── Wavult OS v2 — Event Engine ────────────────────────────────────────────────
// Generates operational events from system state: incidents, KPIs, gates, decisions.
// This is the heartbeat of the OS — it transforms raw data into actionable prompts.

import { generateIncidents, getRoleKPIs, getKPIStatus } from '../../features/incidents/incidentEngine'
import { COMMAND_CHAIN, getApexRole, getDirectReports } from '../../features/org-graph/commandChain'
import { ENTITIES } from '../../features/org-graph/data'
import type {
  OperationalEvent, EventPriority, EventCategory,
  ResponseType, EventAction, GateDependency, AtmosphereState,
  SystemState, MomentumMetrics,
} from './types'

// ─── Event generation from incidents ─────────────────────────────────────────

function incidentToEvent(incident: ReturnType<typeof generateIncidents>[number]): OperationalEvent {
  const role = COMMAND_CHAIN.find(r => r.id === incident.role_id)
  const action = incident.proposed_actions[incident.active_action_index]

  const priority: EventPriority = incident.severity === 'critical' ? 'critical'
    : incident.severity === 'high' ? 'high'
    : incident.severity === 'medium' ? 'normal' : 'low'

  const category: EventCategory = incident.escalated ? 'escalation'
    : incident.state === 'action_pending' ? 'approval' : 'alert'

  const actions: EventAction[] = action ? [
    { id: `${incident.id}-accept`, label: 'Accept Action', variant: 'primary' },
    { id: `${incident.id}-reject`, label: 'Reject', variant: 'danger' },
    { id: `${incident.id}-defer`, label: 'Defer', variant: 'ghost' },
  ] : [
    { id: `${incident.id}-ack`, label: 'Acknowledged', variant: 'ghost' },
  ]

  const responseType: ResponseType = action ? 'binary' : 'acknowledge'

  // Build gate dependencies from RCA dependency chain
  const gates: GateDependency[] = incident.rca.dependency_chain.map((dep, i) => ({
    label: dep,
    status: i === 0 ? 'blocked' : 'pending',
    ownerRoleId: incident.rca.affected_roles[Math.min(i, incident.rca.affected_roles.length - 1)] || incident.role_id,
  }))

  return {
    id: incident.id,
    category,
    priority,
    state: 'pending',
    title: action?.text || incident.rca.problem,
    subtitle: `${role?.person || 'Unknown'} — ${role?.title || ''} · ${incident.severity.toUpperCase()}`,
    body: `Root cause: ${incident.rca.root_cause}\n\nImpact: ${incident.rca.impact}`,
    responseType,
    actions,
    sourceRoleId: incident.role_id,
    targetRoleId: role?.reports_to || undefined,
    relatedEntityIds: incident.rca.affected_entities,
    relatedIncidentId: incident.id,
    gateDependencies: gates.length > 0 ? gates : undefined,
    createdAt: incident.triggered_at,
    contextDepth: incident.severity === 'critical' ? 'detailed' : 'standard',
  }
}

// ─── Gate events from entity formation status ────────────────────────────────

function entityGateEvents(): OperationalEvent[] {
  const events: OperationalEvent[] = []
  const formingEntities = ENTITIES.filter(e => e.active_status === 'forming' || e.active_status === 'planned')

  if (formingEntities.length > 0) {
    events.push({
      id: 'gate-entity-formation',
      category: 'gate',
      priority: 'high',
      state: 'blocked',
      title: `${formingEntities.length} entities awaiting formation`,
      subtitle: 'Corporate structure incomplete — blocks banking, contracts, revenue',
      body: formingEntities.map(e => `${e.flag} ${e.shortName} (${e.jurisdiction}) — ${e.active_status}`).join('\n'),
      responseType: 'none',
      actions: [
        { id: 'gate-entity-view', label: 'View Entities', variant: 'ghost', navigateTo: '/entities' },
      ],
      sourceRoleId: 'clo',
      relatedEntityIds: formingEntities.map(e => e.id),
      gateDependencies: [
        { label: 'Legal formation filings submitted', status: 'pending', ownerRoleId: 'clo' },
        { label: 'Bank accounts opened', status: 'blocked', ownerRoleId: 'cfo' },
        { label: 'Intercompany agreements signed', status: 'blocked', ownerRoleId: 'cfo' },
      ],
      createdAt: new Date().toISOString(),
      contextDepth: 'detailed',
    })
  }

  return events
}

// ─── KPI warning events ──────────────────────────────────────────────────────

function kpiWarningEvents(): OperationalEvent[] {
  const events: OperationalEvent[] = []

  for (const role of COMMAND_CHAIN) {
    const kpis = getRoleKPIs(role.id)
    const redKpis = kpis.filter(k => getKPIStatus(k) === 'red')

    if (redKpis.length >= 2) {
      events.push({
        id: `kpi-multi-fail-${role.id}`,
        category: 'escalation',
        priority: 'critical',
        state: 'pending',
        title: `${role.person}: ${redKpis.length} KPIs failing`,
        subtitle: `${role.title} — multiple critical metrics below threshold`,
        body: redKpis.map(k => `${k.name}: ${k.current} (target: ${k.target})`).join('\n'),
        responseType: 'binary',
        actions: [
          { id: `kpi-escalate-${role.id}`, label: 'Schedule Review', variant: 'primary' },
          { id: `kpi-defer-${role.id}`, label: 'Defer 24h', variant: 'ghost' },
        ],
        sourceRoleId: role.id,
        targetRoleId: role.reports_to || undefined,
        relatedEntityIds: role.entity_ids,
        createdAt: new Date().toISOString(),
        contextDepth: 'detailed',
      })
    }
  }

  return events
}

// ─── Command chain decision events ───────────────────────────────────────────

function commandChainEvents(): OperationalEvent[] {
  const events: OperationalEvent[] = []
  const apex = getApexRole()
  const reports = getDirectReports(apex.id)
  const redRoles = reports.filter(r => r.status === 'red')

  if (redRoles.length > 0) {
    events.push({
      id: 'command-chain-alert',
      category: 'decision',
      priority: 'high',
      state: 'pending',
      title: `${redRoles.length} direct reports need intervention`,
      subtitle: `${redRoles.map(r => r.person).join(', ')} — action required`,
      responseType: 'multi',
      actions: [
        { id: 'cc-review', label: 'Review Org Hierarchy', variant: 'primary', navigateTo: '/org/command' },
        { id: 'cc-incidents', label: 'View Incidents', variant: 'ghost', navigateTo: '/incidents' },
      ],
      sourceRoleId: 'group-ceo',
      relatedEntityIds: redRoles.flatMap(r => r.entity_ids),
      createdAt: new Date().toISOString(),
      contextDepth: 'standard',
    })
  }

  return events
}

// ─── Master event generator ──────────────────────────────────────────────────

export function generateEvents(): OperationalEvent[] {
  const incidents = generateIncidents()

  const allEvents: OperationalEvent[] = [
    ...incidents.map(incidentToEvent),
    ...entityGateEvents(),
    ...kpiWarningEvents(),
    ...commandChainEvents(),
  ]

  // Deduplicate by role+category, keeping highest priority
  const seen = new Map<string, OperationalEvent>()
  for (const event of allEvents) {
    const key = `${event.sourceRoleId}-${event.category}-${event.title.slice(0, 30)}`
    const existing = seen.get(key)
    if (!existing || priorityRank(event.priority) > priorityRank(existing.priority)) {
      seen.set(key, event)
    }
  }

  // Sort: critical first, then by priority, then by creation time
  return [...seen.values()].sort((a, b) => {
    const pDiff = priorityRank(b.priority) - priorityRank(a.priority)
    if (pDiff !== 0) return pDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

function priorityRank(p: EventPriority): number {
  return { critical: 4, high: 3, normal: 2, low: 1 }[p]
}

// ─── System state computation ────────────────────────────────────────────────

export function computeSystemState(events: OperationalEvent[]): SystemState {
  const pending = events.filter(e => e.state === 'pending' || e.state === 'active')
  const criticalCount = pending.filter(e => e.priority === 'critical').length
  const escalatedCount = pending.filter(e => e.category === 'escalation').length
  const resolved = events.filter(e => e.state === 'resolved')

  const atmosphere: AtmosphereState =
    criticalCount > 0 ? 'action'
    : escalatedCount > 0 || pending.length > 5 ? 'attention'
    : 'neutral'

  return {
    atmosphere,
    pendingEvents: pending.length,
    criticalCount,
    resolvedToday: resolved.length,
    averageResponseTime: 4, // Mock — would compute from real timestamps
    escalatedCount,
    operatorInFlow: false,
  }
}

// ─── Momentum computation ────────────────────────────────────────────────────

export function computeMomentum(events: OperationalEvent[]): MomentumMetrics {
  const resolved = events.filter(e => e.state === 'resolved')
  const avgResponseMinutes = 4 // Mock
  const streakLength = Math.min(resolved.length, 5) // Mock streak

  const velocity = resolved.length >= 10 ? 'high'
    : resolved.length >= 5 ? 'normal' : 'low'

  return {
    resolvedToday: resolved.length,
    averageResponseMinutes: avgResponseMinutes,
    escalatedCount: events.filter(e => e.category === 'escalation').length,
    streakLength,
    velocity,
  }
}
