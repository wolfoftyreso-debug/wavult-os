// ─── Wavult OS v2 — State Stream Types ──────────────────────────────────────────
// This is REAL-TIME, not profile. Continuous signal of how you are right now.
// Fed by implicit observation (usage patterns) and explicit input (energy slider).

export interface OperatorState {
  /** Energy level (0-1) — composite of time-of-day, recent activity, explicit input */
  energy: number
  /** Focus mode — what kind of cognitive work fits right now */
  focus: FocusMode
  /** Stress level (0-1) — inferred from decision speed, task abandonment, escalation rate */
  stress: number
  /** Flow state — is the operator in a productive streak? */
  inFlow: boolean
  /** Minutes since last break / context switch */
  minutesSinceBreak: number
  /** Current capacity — how many concurrent threads can this person handle right now */
  capacity: CapacityLevel
  /** Timestamp of last state update */
  updatedAt: string
}

export type FocusMode = 'deep' | 'shallow' | 'social' | 'recovery'
export type CapacityLevel = 'full' | 'moderate' | 'low' | 'depleted'

// ─── State Input (from the operator) ─────────────────────────────────────────

export interface ExplicitStateInput {
  /** Energy slider value (1-5, mapped to 0-1 internally) */
  energyRating?: number
  /** Optional focus override */
  focusOverride?: FocusMode
  /** "I need a break" signal */
  needsBreak?: boolean
}

// ─── State Snapshot (for the orchestration layer) ────────────────────────────

export interface StateSnapshot {
  state: OperatorState
  identity: {
    primaryCognitiveMode: string
    optimalTaskDuration: number
    ambiguityTolerance: number
    topTaskCategories: string[]
    avoidCategories: string[]
  }
  preferences: {
    taskTypes: string[]
    avoid: string[]
    pacingPreference: 'fast' | 'normal' | 'deliberate'
  }
  timestamp: string
}
