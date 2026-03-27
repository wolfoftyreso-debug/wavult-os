// ─── Wavult OS v2 — Identity Context ────────────────────────────────────────────
// The invisible hand. Manages the operator's identity graph, processes feedback,
// persists to Supabase, and provides recommendations to the UI layer.
//
// The UI never asks "what do you want?" — the system already knows.

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  createDefaultIdentity,
  processFeedback,
  recommendTasks,
  getIdentityHealth,
} from './engine'
import type {
  OperatorIdentity,
  FeedbackEvent,
  FeedbackSignal,
  TaskCategory,
} from './types'
import type { TaskRecommendation, IdentityHealth } from './engine'

// ─── Context ─────────────────────────────────────────────────────────────────

interface IdentityContextValue {
  identity: OperatorIdentity
  health: IdentityHealth
  recommendations: TaskRecommendation[]

  /** Record a feedback event (the core loop) */
  recordFeedback: (
    taskId: string,
    taskCategory: TaskCategory,
    signal: FeedbackSignal,
    duration?: number | null,
  ) => void

  /** Force refresh recommendations */
  refreshRecommendations: () => void

  /** Model confidence (0-1) */
  confidence: number

  /** Whether the identity is still loading from storage */
  loading: boolean
}

const IdentityContext = createContext<IdentityContextValue | null>(null)

// ─── Storage key ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'wavult_identity'

function loadFromStorage(userId: string): OperatorIdentity | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return null
}

function saveToStorage(identity: OperatorIdentity) {
  try {
    localStorage.setItem(
      `${STORAGE_KEY}_${identity.userId}`,
      JSON.stringify(identity)
    )
  } catch { /* ignore */ }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [identity, setIdentity] = useState<OperatorIdentity | null>(null)
  const [loading, setLoading] = useState(true)

  // Load identity on auth
  useEffect(() => {
    if (!user) {
      setIdentity(null)
      setLoading(false)
      return
    }

    // Try local first, then Supabase, then create default
    const local = loadFromStorage(user.id)
    if (local) {
      setIdentity(local)
      setLoading(false)
      return
    }

    // Try Supabase user_metadata
    const remote = user.user_metadata?.operator_identity as OperatorIdentity | undefined
    if (remote) {
      setIdentity(remote)
      saveToStorage(remote)
      setLoading(false)
      return
    }

    // Cold start
    const fresh = createDefaultIdentity(user.id)
    setIdentity(fresh)
    saveToStorage(fresh)
    setLoading(false)
  }, [user])

  // Persist to Supabase periodically (every 10 updates)
  useEffect(() => {
    if (!identity || !user) return
    if (identity.version % 10 === 0 && identity.version > 0) {
      supabase.auth.updateUser({
        data: { operator_identity: identity },
      }).catch(() => { /* silent */ })
    }
  }, [identity?.version, user])

  // Record feedback — the core loop
  const recordFeedback = useCallback((
    taskId: string,
    taskCategory: TaskCategory,
    signal: FeedbackSignal,
    duration: number | null = null,
  ) => {
    setIdentity(prev => {
      if (!prev) return prev

      const event: FeedbackEvent = {
        id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        taskId,
        taskCategory,
        signal,
        duration,
        energyAtTime: prev.energy.currentEnergy,
        hourOfDay: new Date().getHours(),
        selfRating: null,
        timestamp: new Date().toISOString(),
      }

      const updated = processFeedback(prev, event)
      saveToStorage(updated)
      return updated
    })
  }, [])

  // Computed values
  const effectiveIdentity = identity ?? createDefaultIdentity(user?.id ?? 'anonymous')

  const recommendations = useMemo(
    () => recommendTasks(effectiveIdentity),
    [effectiveIdentity]
  )

  const health = useMemo(
    () => getIdentityHealth(effectiveIdentity),
    [effectiveIdentity]
  )

  const refreshRecommendations = useCallback(() => {
    // Triggers re-render which recalculates recommendations via useMemo
    setIdentity(prev => prev ? { ...prev } : prev)
  }, [])

  return (
    <IdentityContext.Provider value={{
      identity: effectiveIdentity,
      health,
      recommendations,
      recordFeedback,
      refreshRecommendations,
      confidence: effectiveIdentity.modelConfidence,
      loading,
    }}>
      {children}
    </IdentityContext.Provider>
  )
}

export function useIdentity() {
  const ctx = useContext(IdentityContext)
  if (!ctx) throw new Error('useIdentity must be used inside IdentityProvider')
  return ctx
}
