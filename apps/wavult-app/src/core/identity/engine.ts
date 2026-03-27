// ─── Wavult OS v2 — Identity Graph Engine ───────────────────────────────────────
// The feedback loop. Every accept, reject, complete, abandon updates the model.
// The system moves you toward an asymptotic version of "ideal you".
//
// This is NOT machine learning — it's weighted observation with decay.
// Simple, predictable, debuggable. ML comes later when there's enough data.

import type {
  OperatorIdentity, FeedbackEvent, SkillVector,
  TaskCategory, TaskPreference, EnergyPattern, CognitiveProfile,
} from './types'

// ─── Constants ───────────────────────────────────────────────────────────────

const LEARNING_RATE = 0.1          // How fast new observations shift the model
const DECAY_RATE = 0.02            // How fast old observations lose weight
const MIN_CONFIDENCE = 0.1         // Floor for confidence
const MAX_CONFIDENCE = 0.95        // Ceiling for confidence
// const ENERGY_DECAY_PER_HOUR = 0.04 // Energy drops ~4% per hour without rest (future use)

// ─── Default Identity (cold start) ──────────────────────────────────────────

export function createDefaultIdentity(userId: string): OperatorIdentity {
  const now = new Date().toISOString()

  // Flat energy curve — system doesn't know your patterns yet
  const hourlyEnergy = Array.from({ length: 24 }, () => 0.5)
  // Slight weekday preference
  const weekdayMultiplier = [1.0, 1.0, 1.0, 1.0, 1.0, 0.7, 0.5]

  // Neutral task preferences — all categories equal
  const taskCategories: TaskCategory[] = [
    'decision', 'review', 'create', 'coordinate',
    'analyze', 'communicate', 'execute', 'learn',
  ]

  const taskPreferences: TaskPreference[] = taskCategories.map(cat => ({
    category: cat,
    affinity: 0.5,
    performance: 0.5,
    engagement: 0.5,
    observations: 0,
  }))

  return {
    userId,
    version: 1,
    energy: {
      hourlyEnergy,
      weekdayMultiplier,
      currentEnergy: 0.7,
      minutesSincePeak: 0,
    },
    cognitive: {
      primaryMode: 'executive',
      secondaryMode: 'analytical',
      decisionSpeed: 'variable',
      informationPreference: 'focused',
      ambiguityTolerance: 0.5,
      contextSwitchCost: 0.5,
      optimalTaskDuration: 45,
    },
    skills: [],
    taskPreferences,
    avoidancePatterns: [],
    motivation: {
      autonomy: 0.5,
      competition: 0.5,
      novelty: 0.5,
      mastery: 0.5,
      purpose: 0.5,
      recognition: 0.5,
    },
    directions: [],
    totalObservations: 0,
    modelConfidence: MIN_CONFIDENCE,
    lastUpdated: now,
    createdAt: now,
  }
}

// ─── Core Update: Process Feedback ───────────────────────────────────────────

export function processFeedback(
  identity: OperatorIdentity,
  event: FeedbackEvent
): OperatorIdentity {
  const updated = { ...identity, version: identity.version + 1 }

  // 1. Update task preferences
  updated.taskPreferences = updateTaskPreferences(
    updated.taskPreferences, event
  )

  // 2. Update energy patterns
  updated.energy = updateEnergyPatterns(updated.energy, event)

  // 3. Update cognitive profile (from decision speed patterns)
  updated.cognitive = updateCognitiveProfile(updated.cognitive, event)

  // 4. Update skill vectors (if task maps to a skill)
  updated.skills = updateSkillVectors(updated.skills, event)

  // 5. Update model confidence
  updated.totalObservations += 1
  updated.modelConfidence = Math.min(
    MAX_CONFIDENCE,
    MIN_CONFIDENCE + (updated.totalObservations / 200) * (MAX_CONFIDENCE - MIN_CONFIDENCE)
  )

  updated.lastUpdated = new Date().toISOString()

  return updated
}

// ─── Task Preference Update ──────────────────────────────────────────────────

function updateTaskPreferences(
  prefs: TaskPreference[],
  event: FeedbackEvent
): TaskPreference[] {
  return prefs.map(pref => {
    if (pref.category !== event.taskCategory) return pref

    const updated = { ...pref, observations: pref.observations + 1 }
    const lr = LEARNING_RATE / Math.max(1, Math.sqrt(updated.observations / 10))

    // Update affinity based on accept/reject
    if (event.signal === 'accepted' || event.signal === 'completed_fast' || event.signal === 'completed_well') {
      updated.affinity = clamp(updated.affinity + lr * 0.5)
    } else if (event.signal === 'rejected' || event.signal === 'abandoned') {
      updated.affinity = clamp(updated.affinity - lr * 0.5)
    }

    // Update performance based on completion quality
    if (event.signal === 'completed_well' || event.signal === 'completed_fast') {
      updated.performance = clamp(updated.performance + lr)
    } else if (event.signal === 'completed_poor' || event.signal === 'completed_slow') {
      updated.performance = clamp(updated.performance - lr * 0.5)
    }

    // Update engagement based on speed and completion
    if (event.signal === 'completed_fast') {
      updated.engagement = clamp(updated.engagement + lr)
    } else if (event.signal === 'abandoned' || event.signal === 'deferred') {
      updated.engagement = clamp(updated.engagement - lr)
    }

    return updated
  })
}

// ─── Energy Pattern Update ───────────────────────────────────────────────────

function updateEnergyPatterns(
  energy: EnergyPattern,
  event: FeedbackEvent
): EnergyPattern {
  const updated = { ...energy, hourlyEnergy: [...energy.hourlyEnergy] }
  const hour = event.hourOfDay
  const lr = LEARNING_RATE * 0.5

  // Good performance at this hour → energy is probably high
  if (event.signal === 'completed_fast' || event.signal === 'completed_well') {
    updated.hourlyEnergy[hour] = clamp(updated.hourlyEnergy[hour] + lr)
    // Adjacent hours also get a small boost
    if (hour > 0) updated.hourlyEnergy[hour - 1] = clamp(updated.hourlyEnergy[hour - 1] + lr * 0.3)
    if (hour < 23) updated.hourlyEnergy[hour + 1] = clamp(updated.hourlyEnergy[hour + 1] + lr * 0.3)
  }

  // Poor performance or abandonment → energy might be low
  if (event.signal === 'abandoned' || event.signal === 'completed_poor') {
    updated.hourlyEnergy[hour] = clamp(updated.hourlyEnergy[hour] - lr)
  }

  // Update current energy estimate
  const now = new Date()
  const currentHour = now.getHours()
  const dayOfWeek = (now.getDay() + 6) % 7 // 0 = Monday
  updated.currentEnergy = updated.hourlyEnergy[currentHour] * updated.weekdayMultiplier[dayOfWeek]

  return updated
}

// ─── Cognitive Profile Update ────────────────────────────────────────────────

function updateCognitiveProfile(
  cognitive: CognitiveProfile,
  event: FeedbackEvent
): CognitiveProfile {
  const updated = { ...cognitive }

  // Update decision speed based on task duration
  if (event.duration !== null) {
    const minutes = event.duration / 60000
    if (minutes < 2 && (event.signal === 'completed_fast' || event.signal === 'accepted')) {
      // Fast decisions consistently → fast decision speed
      if (updated.decisionSpeed === 'variable') updated.decisionSpeed = 'fast'
    } else if (minutes > 15) {
      if (updated.decisionSpeed === 'variable') updated.decisionSpeed = 'deliberate'
    }
  }

  // Update optimal task duration
  if (event.duration !== null && event.signal === 'completed_well') {
    const minutes = event.duration / 60000
    updated.optimalTaskDuration = updated.optimalTaskDuration * 0.9 + minutes * 0.1
  }

  return updated
}

// ─── Skill Vector Update ─────────────────────────────────────────────────────

function updateSkillVectors(
  skills: SkillVector[],
  _event: FeedbackEvent
): SkillVector[] {
  // For now, we don't have skill mapping from tasks
  // This will be connected when tasks carry skill metadata
  return skills.map(skill => {
    // Apply time decay to confidence
    const hoursSinceExercised =
      (Date.now() - new Date(skill.lastExercised).getTime()) / 3600000
    const decay = Math.max(0, 1 - DECAY_RATE * (hoursSinceExercised / 24))

    return {
      ...skill,
      confidence: Math.max(MIN_CONFIDENCE, skill.confidence * decay),
    }
  })
}

// ─── Task Recommendation (the matching engine) ──────────────────────────────

export interface TaskRecommendation {
  taskCategory: TaskCategory
  score: number            // 0-1, how good this task is for you right now
  reason: string           // Why the system recommends this
}

export function recommendTasks(
  identity: OperatorIdentity,
  availableCategories: TaskCategory[] = [
    'decision', 'review', 'create', 'coordinate',
    'analyze', 'communicate', 'execute', 'learn',
  ],
  count: number = 3
): TaskRecommendation[] {
  const hour = new Date().getHours()
  const dayOfWeek = (new Date().getDay() + 6) % 7
  const currentEnergy = identity.energy.hourlyEnergy[hour]
    * identity.energy.weekdayMultiplier[dayOfWeek]

  const scored = availableCategories.map(cat => {
    const pref = identity.taskPreferences.find(p => p.category === cat)
    if (!pref) return { taskCategory: cat, score: 0.5, reason: 'No data yet' }

    // Score = weighted combination of affinity, performance, engagement, energy fit
    let score = 0

    // High affinity → you like this
    score += pref.affinity * 0.25

    // High performance → you're good at this
    score += pref.performance * 0.25

    // High engagement → you stay focused
    score += pref.engagement * 0.2

    // Energy fit: high-energy tasks when energy is high, low-energy when low
    const isHighEnergyTask = ['create', 'analyze', 'decision'].includes(cat)
    if (isHighEnergyTask) {
      score += currentEnergy * 0.15 // Boost when energy is high
    } else {
      score += (1 - currentEnergy) * 0.1 // Slight boost for routine when energy is low
    }

    // Growth bonus: tasks where performance < affinity (you like it but aren't great yet)
    const growthGap = pref.affinity - pref.performance
    if (growthGap > 0.1) {
      score += growthGap * 0.15 * identity.motivation.mastery
    }

    // Novelty bonus: tasks with few observations
    if (pref.observations < 5 && identity.motivation.novelty > 0.5) {
      score += 0.05
    }

    // Build reason string
    let reason = ''
    if (pref.performance > 0.7) reason = 'Strong performance history'
    else if (pref.affinity > 0.7) reason = 'High affinity'
    else if (growthGap > 0.2) reason = 'Growth opportunity'
    else if (currentEnergy > 0.7 && isHighEnergyTask) reason = 'Energy level is high'
    else if (currentEnergy < 0.4 && !isHighEnergyTask) reason = 'Good for current energy'
    else reason = 'Balanced fit'

    return { taskCategory: cat, score: clamp(score), reason }
  })

  // Sort by score descending, take top N
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
}

// ─── Identity Health Check ───────────────────────────────────────────────────

export interface IdentityHealth {
  confidence: number
  dataPoints: number
  strongestSkill: string | null
  growthArea: string | null
  energyStatus: 'high' | 'moderate' | 'low'
  nextRecommendation: string
}

export function getIdentityHealth(identity: OperatorIdentity): IdentityHealth {
  const topPref = [...identity.taskPreferences]
    .sort((a, b) => b.performance - a.performance)[0]
  const growthPref = [...identity.taskPreferences]
    .sort((a, b) => (b.affinity - b.performance) - (a.affinity - a.performance))[0]

  const energyStatus = identity.energy.currentEnergy > 0.65 ? 'high'
    : identity.energy.currentEnergy > 0.35 ? 'moderate' : 'low'

  let nextRecommendation = ''
  if (identity.totalObservations < 10) {
    nextRecommendation = 'Complete more tasks to calibrate your profile'
  } else if (identity.modelConfidence < 0.3) {
    nextRecommendation = 'Try different task types to improve model accuracy'
  } else {
    nextRecommendation = `Focus on ${growthPref?.category || 'varied tasks'} for growth`
  }

  return {
    confidence: identity.modelConfidence,
    dataPoints: identity.totalObservations,
    strongestSkill: topPref?.category || null,
    growthArea: growthPref?.category || null,
    energyStatus,
    nextRecommendation,
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function clamp(n: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, n))
}
