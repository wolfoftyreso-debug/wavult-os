// ─── Wavult OS v2 — Orchestration Layer Types ──────────────────────────────────
// The layer between Personal Runtime and Institutional Runtime.
// Matching + Adaptation + Governance. Everything goes via contract.

// ─── Task Graph (institutional side) ─────────────────────────────────────────

export interface SystemTask {
  id: string
  title: string
  type: TaskType
  /** What the task requires from the operator */
  requires: TaskRequirement[]
  /** Priority (0-1) — set by the institutional side */
  priority: number
  /** Estimated duration in minutes */
  estimatedMinutes: number
  /** Energy profile: how much energy does this task consume? */
  energyProfile: 'high' | 'medium' | 'low'
  /** Does this task require deep focus? */
  requiresDeepFocus: boolean
  /** Domain context */
  domain: string
  /** Deadline (if any) */
  deadline?: string
  /** Dependencies — task IDs that must complete first */
  dependencies: string[]
  /** Source — which system generated this task */
  source: 'manual' | 'incident' | 'kpi' | 'approval' | 'system'
  /** Metadata for the UI */
  metadata: Record<string, string>
}

export type TaskType = 'decision' | 'review' | 'create' | 'coordinate' |
  'analyze' | 'communicate' | 'execute' | 'learn'

export type TaskRequirement = 'focus_high' | 'focus_any' | 'energy_high' |
  'energy_any' | 'low_stress' | 'collaborative' | 'solo'

// ─── Orchestration Output ────────────────────────────────────────────────────

export interface OrchestrationResult {
  /** Top tasks, ranked by match score, adapted to operator state */
  tasks: RankedTask[]
  /** System recommendation text */
  recommendation: string
  /** State-aware coaching hint */
  coaching: string | null
  /** Whether the system suggests a break */
  suggestBreak: boolean
  /** Timestamp */
  generatedAt: string
}

export interface RankedTask {
  task: SystemTask
  /** Match score (0-1) — how well this task fits you right now */
  matchScore: number
  /** Why this task was selected */
  reason: string
  /** Adapted presentation — how to show this to the operator */
  presentation: TaskPresentation
}

export interface TaskPresentation {
  /** How to phrase the task (directive vs options) */
  guidance: 'directive' | 'options' | 'autonomous'
  /** How much context to show */
  contextLevel: 'minimal' | 'standard' | 'detailed'
  /** Urgency signal */
  urgency: 'none' | 'attention' | 'action'
}

// ─── Policy (governance layer) ───────────────────────────────────────────────

export interface OrchestrrationPolicy {
  /** What data the system can share with the institutional side */
  dataSharing: {
    energy: 'allowed' | 'abstracted' | 'blocked'
    focus: 'allowed' | 'abstracted' | 'blocked'
    stress: 'allowed' | 'abstracted' | 'blocked'
    preferences: 'allowed' | 'abstracted' | 'blocked'
    performance: 'allowed' | 'abstracted' | 'blocked'
  }
  /** What the system can do automatically */
  automation: {
    taskReordering: boolean
    taskDeferral: boolean
    breakSuggestions: boolean
    externalCommunication: boolean
    escalation: boolean
  }
  /** Approval requirements */
  approvals: {
    /** Tasks above this priority require manual approval before assignment */
    priorityThreshold: number
    /** Always require approval for these task types */
    alwaysApprove: TaskType[]
  }
}

// ─── Command (Nemo Claw interface) ───────────────────────────────────────────

export type CommandIntent =
  | 'get_tasks'              // "What should I do now?"
  | 'defer_low_energy'       // "Push low-energy tasks"
  | 'optimize_momentum'      // "Optimize my day for momentum"
  | 'take_break'             // "I need a break"
  | 'change_focus'           // "Switch to deep work"
  | 'show_status'            // "How am I doing?"
  | 'escalate'               // "This needs someone else"

export interface Command {
  intent: CommandIntent
  parameters?: Record<string, string | number | boolean>
  timestamp: string
}

export interface CommandResult {
  intent: CommandIntent
  success: boolean
  /** What changed in the system */
  effect: string
  /** Tasks affected */
  affectedTasks: string[]
  /** New orchestration result (if tasks changed) */
  newResult?: OrchestrationResult
}
