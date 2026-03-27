// ─── Wavult OS v2 — Identity Graph Types ────────────────────────────────────────
// This is NOT a profile. This is a continuously optimized digital representation.
// It drives everything: what you see, what you're offered, how the system talks to you.
//
// The system constructs tasks that fit your development curve.
// Jobs stop existing as a concept — only continuous task streams optimized for you.

// ─── Energy ──────────────────────────────────────────────────────────────────

export interface EnergyPattern {
  /** Hour of day (0-23) → energy level (0-1) */
  hourlyEnergy: number[]
  /** Day of week (0=Mon) → baseline multiplier */
  weekdayMultiplier: number[]
  /** Current energy estimate (computed, not self-reported) */
  currentEnergy: number
  /** Minutes since last high-energy period */
  minutesSincePeak: number
}

// ─── Cognitive Style ─────────────────────────────────────────────────────────

export type CognitiveMode = 'analytical' | 'creative' | 'executive' | 'social'
export type DecisionSpeed = 'fast' | 'deliberate' | 'variable'
export type InformationPreference = 'dense' | 'focused' | 'narrative'

export interface CognitiveProfile {
  /** Primary cognitive mode — what comes naturally */
  primaryMode: CognitiveMode
  /** Secondary mode — activated under specific conditions */
  secondaryMode: CognitiveMode
  /** How quickly decisions are made (observed, not declared) */
  decisionSpeed: DecisionSpeed
  /** How information should be presented */
  informationPreference: InformationPreference
  /** Tolerance for ambiguity (0-1) — low = needs clarity, high = comfortable with uncertainty */
  ambiguityTolerance: number
  /** Context switching cost (0-1) — how much switching tasks degrades performance */
  contextSwitchCost: number
  /** Optimal task duration in minutes before fatigue */
  optimalTaskDuration: number
}

// ─── Skill Vectors ───────────────────────────────────────────────────────────

export interface SkillVector {
  id: string
  domain: string           // e.g. 'legal', 'finance', 'engineering', 'strategy'
  skill: string            // e.g. 'contract-review', 'cashflow-modeling'
  level: number            // 0-1, continuously updated
  velocity: number         // Learning rate — how fast this skill is improving
  lastExercised: string    // ISO timestamp
  /** Confidence interval — how certain the system is about this level */
  confidence: number       // 0-1
}

// ─── Task Preferences ────────────────────────────────────────────────────────

export type TaskCategory =
  | 'decision'       // Make a choice
  | 'review'         // Evaluate something
  | 'create'         // Build from scratch
  | 'coordinate'     // Align people
  | 'analyze'        // Deep dive into data
  | 'communicate'    // Draft, present, explain
  | 'execute'        // Just do the thing
  | 'learn'          // Absorb new information

export interface TaskPreference {
  category: TaskCategory
  /** Affinity score (0-1) — how much you gravitate toward this */
  affinity: number
  /** Performance score (0-1) — how well you actually do this */
  performance: number
  /** Engagement score (0-1) — how engaged you stay during this */
  engagement: number
  /** Observation count — how many data points this is based on */
  observations: number
}

// ─── Avoidance Patterns ──────────────────────────────────────────────────────

export interface AvoidancePattern {
  id: string
  trigger: string          // What triggers avoidance — e.g. 'large meetings', 'ambiguous deadlines'
  severity: number         // 0-1
  /** Is this a healthy boundary or a growth blocker? */
  classification: 'boundary' | 'blocker' | 'unknown'
  /** If blocker: the system gently pushes. If boundary: the system respects. */
  lastObserved: string
}

// ─── Motivational Drivers ────────────────────────────────────────────────────

export interface MotivationalProfile {
  /** Autonomy vs structure (0 = needs structure, 1 = needs freedom) */
  autonomy: number
  /** Competition vs collaboration (0 = collaborative, 1 = competitive) */
  competition: number
  /** Novelty vs stability (0 = prefers routine, 1 = seeks novelty) */
  novelty: number
  /** Mastery drive (0-1) — how important skill growth is */
  mastery: number
  /** Purpose alignment (0-1) — how important meaning is vs outcome */
  purpose: number
  /** Recognition need (0-1) — how much external validation matters */
  recognition: number
}

// ─── Intent (where you want to go) ──────────────────────────────────────────

export interface DirectionVector {
  id: string
  label: string            // e.g. 'Become CFO-ready', 'Master system architecture'
  domain: string
  progress: number         // 0-1
  priority: number         // 0-1, how important this direction is
  /** Skills that this direction develops */
  relatedSkills: string[]
  /** Tasks that move this forward */
  relatedTaskCategories: TaskCategory[]
  createdAt: string
}

// ─── The Complete Identity ───────────────────────────────────────────────────

export interface OperatorIdentity {
  userId: string
  version: number          // Incremented on every update

  // The five pillars
  energy: EnergyPattern
  cognitive: CognitiveProfile
  skills: SkillVector[]
  taskPreferences: TaskPreference[]
  avoidancePatterns: AvoidancePattern[]

  // Higher-order
  motivation: MotivationalProfile
  directions: DirectionVector[]

  // Meta
  totalObservations: number
  modelConfidence: number  // 0-1, how well the system thinks it knows you
  lastUpdated: string
  createdAt: string
}

// ─── Feedback Event (the loop) ───────────────────────────────────────────────

export type FeedbackSignal =
  | 'accepted'             // Took the task
  | 'rejected'             // Declined
  | 'completed_fast'       // Finished faster than predicted
  | 'completed_slow'       // Finished slower than predicted
  | 'completed_well'       // High quality output
  | 'completed_poor'       // Low quality output
  | 'abandoned'            // Started but gave up
  | 'deferred'             // Pushed to later
  | 'escalated'            // Couldn't handle, sent up

export interface FeedbackEvent {
  id: string
  taskId: string
  taskCategory: TaskCategory
  signal: FeedbackSignal
  /** How long the task took (ms) */
  duration: number | null
  /** Energy level at time of task (estimated) */
  energyAtTime: number
  /** Hour of day when performed */
  hourOfDay: number
  /** Operator's own rating (optional, not prompted unless pattern-breaking) */
  selfRating: number | null
  timestamp: string
}
