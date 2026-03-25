// ─── Wavult OS v2 — State Stream ────────────────────────────────────────────────
// Real-time operator state. Not a profile — a live signal.
// Updates from: time-of-day energy curve, explicit input, behavioral observation.

import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { useIdentity } from '../identity/IdentityContext'
import type { OperatorState, FocusMode, ExplicitStateInput, StateSnapshot } from './types'

// ─── State computation ───────────────────────────────────────────────────────

function computeInitialState(): OperatorState {
  return {
    energy: 0.6,
    focus: 'shallow',
    stress: 0.2,
    inFlow: false,
    minutesSinceBreak: 0,
    capacity: 'moderate',
    updatedAt: new Date().toISOString(),
  }
}

function energyToCapacity(energy: number, stress: number): OperatorState['capacity'] {
  const effective = energy * (1 - stress * 0.5)
  if (effective > 0.7) return 'full'
  if (effective > 0.45) return 'moderate'
  if (effective > 0.2) return 'low'
  return 'depleted'
}

function inferFocus(energy: number, stress: number, minutesSinceBreak: number): FocusMode {
  if (energy < 0.25) return 'recovery'
  if (stress > 0.7) return 'recovery'
  if (minutesSinceBreak > 90) return 'shallow'
  if (energy > 0.6 && stress < 0.4) return 'deep'
  if (stress > 0.5) return 'social'
  return 'shallow'
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface StateContextValue {
  state: OperatorState
  snapshot: StateSnapshot
  /** Update state from explicit operator input (energy slider, break signal) */
  updateFromInput: (input: ExplicitStateInput) => void
  /** Record activity signal (implicit: task completed, event resolved) */
  recordActivity: (type: 'task_complete' | 'task_abandon' | 'decision' | 'break') => void
}

const StateContext = createContext<StateContextValue | null>(null)

export function StateProvider({ children }: { children: React.ReactNode }) {
  const { identity } = useIdentity()
  const [state, setState] = useState<OperatorState>(computeInitialState)

  const updateFromInput = useCallback((input: ExplicitStateInput) => {
    setState(prev => {
      const updated = { ...prev, updatedAt: new Date().toISOString() }

      if (input.energyRating !== undefined) {
        // Map 1-5 slider to 0-1
        updated.energy = Math.max(0, Math.min(1, (input.energyRating - 1) / 4))
      }

      if (input.focusOverride) {
        updated.focus = input.focusOverride
      } else {
        updated.focus = inferFocus(updated.energy, updated.stress, updated.minutesSinceBreak)
      }

      if (input.needsBreak) {
        updated.minutesSinceBreak = 0
        updated.focus = 'recovery'
      }

      updated.capacity = energyToCapacity(updated.energy, updated.stress)

      return updated
    })
  }, [])

  const recordActivity = useCallback((type: 'task_complete' | 'task_abandon' | 'decision' | 'break') => {
    setState(prev => {
      const updated = { ...prev, updatedAt: new Date().toISOString() }

      switch (type) {
        case 'task_complete':
          // Completing tasks in sequence → possible flow
          updated.inFlow = prev.minutesSinceBreak > 10 && prev.minutesSinceBreak < 60
          updated.stress = Math.max(0, updated.stress - 0.05)
          break
        case 'task_abandon':
          updated.inFlow = false
          updated.stress = Math.min(1, updated.stress + 0.1)
          updated.energy = Math.max(0, updated.energy - 0.05)
          break
        case 'decision':
          updated.minutesSinceBreak += 5
          break
        case 'break':
          updated.minutesSinceBreak = 0
          updated.inFlow = false
          updated.energy = Math.min(1, updated.energy + 0.15)
          updated.stress = Math.max(0, updated.stress - 0.15)
          updated.focus = 'recovery'
          break
      }

      updated.capacity = energyToCapacity(updated.energy, updated.stress)
      if (!prev.focus) {
        updated.focus = inferFocus(updated.energy, updated.stress, updated.minutesSinceBreak)
      }

      return updated
    })
  }, [])

  // Build snapshot for orchestration layer
  const snapshot = useMemo<StateSnapshot>(() => {
    const topPrefs = [...identity.taskPreferences]
      .sort((a, b) => b.affinity - a.affinity)
      .slice(0, 3)
      .map(p => p.category)

    const avoidPrefs = [...identity.taskPreferences]
      .filter(p => p.affinity < 0.3)
      .map(p => p.category)

    return {
      state,
      identity: {
        primaryCognitiveMode: identity.cognitive.primaryMode,
        optimalTaskDuration: identity.cognitive.optimalTaskDuration,
        ambiguityTolerance: identity.cognitive.ambiguityTolerance,
        topTaskCategories: topPrefs,
        avoidCategories: avoidPrefs,
      },
      preferences: {
        taskTypes: topPrefs,
        avoid: avoidPrefs,
        pacingPreference: identity.cognitive.decisionSpeed === 'fast' ? 'fast'
          : identity.cognitive.decisionSpeed === 'deliberate' ? 'deliberate' : 'normal',
      },
      timestamp: new Date().toISOString(),
    }
  }, [state, identity])

  return (
    <StateContext.Provider value={{ state, snapshot, updateFromInput, recordActivity }}>
      {children}
    </StateContext.Provider>
  )
}

export function useOperatorState() {
  const ctx = useContext(StateContext)
  if (!ctx) throw new Error('useOperatorState must be used inside StateProvider')
  return ctx
}
