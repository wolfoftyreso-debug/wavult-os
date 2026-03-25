// ─── Wavult OS v2 — Event System Types ─────────────────────────────────────────
// The OS thinks in events, not pages. Every interaction is: arrive → respond → confirm → advance.

export type EventPriority = 'critical' | 'high' | 'normal' | 'low'
export type EventState = 'pending' | 'active' | 'resolved' | 'deferred' | 'blocked'
export type EventCategory =
  | 'decision'       // Binary or multi-choice decision required
  | 'approval'       // Approve/reject flow
  | 'acknowledgment' // Just confirm you've seen it
  | 'input'          // Data entry required
  | 'delegation'     // Assign to someone in the command chain
  | 'escalation'     // Escalated from below — requires attention
  | 'alert'          // System-generated alert (KPI breach, incident)
  | 'gate'           // Blocked by prerequisite — informational

export type ResponseType =
  | 'binary'         // Two large buttons (approve/reject, yes/no)
  | 'multi'          // Multiple options
  | 'input'          // Free-form or structured input
  | 'delegate'       // Show command chain with availability
  | 'acknowledge'    // Single "Got it" / "Noted"
  | 'none'           // No action possible (gate lock, info only)

export interface EventAction {
  id: string
  label: string
  variant: 'primary' | 'danger' | 'approve' | 'ghost'
  /** If set, resolving with this action navigates to a route */
  navigateTo?: string
}

export interface GateDependency {
  label: string
  status: 'pending' | 'blocked' | 'complete'
  ownerRoleId: string
  submittedAt?: string
}

export interface OperationalEvent {
  id: string
  category: EventCategory
  priority: EventPriority
  state: EventState

  // Display
  title: string                    // Large, disproportionately large action text
  subtitle?: string                // Context line
  body?: string                    // Expandable detail (collapsed by default)

  // Response
  responseType: ResponseType
  actions: EventAction[]

  // Metadata
  sourceRoleId: string             // Who/what generated this event
  targetRoleId?: string            // Who should handle it
  relatedEntityIds: string[]
  relatedIncidentId?: string

  // Gate lock
  gateDependencies?: GateDependency[]

  // Timestamps
  createdAt: string
  resolvedAt?: string
  deferredUntil?: string

  // Personalization hints
  contextDepth: 'minimal' | 'standard' | 'detailed'
}

// ─── System Atmosphere ──────────────────────────────────────────────────────────

export type AtmosphereState = 'neutral' | 'attention' | 'action' | 'success'

export interface SystemState {
  atmosphere: AtmosphereState
  pendingEvents: number
  criticalCount: number
  resolvedToday: number
  averageResponseTime: number      // minutes
  escalatedCount: number
  operatorInFlow: boolean          // Is the operator responding quickly?
}

// ─── Momentum ───────────────────────────────────────────────────────────────────

export interface MomentumMetrics {
  resolvedToday: number
  averageResponseMinutes: number
  escalatedCount: number
  streakLength: number             // Consecutive quick resolutions
  velocity: 'high' | 'normal' | 'low'
}
