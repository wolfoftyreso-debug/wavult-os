// ─── Wavult OS v2 — Operator Profile (Personalization Engine) ────────────────
// The invisible architecture. Adapts UI density, guidance, feedback, and pacing
// to the specific operator. No settings page — the system adapts continuously.

import React, { createContext, useContext, useMemo } from 'react'
import { useRole } from '../../shared/auth/RoleContext'
import type { RoleId } from '../../shared/auth/RoleContext'

// ─── Profile types ───────────────────────────────────────────────────────────

export type InformationDensity = 'compact' | 'standard' | 'spacious'
export type GuidanceIntensity = 'directive' | 'balanced' | 'autonomous'
export type FeedbackStyle = 'momentum' | 'deviation' | 'balanced'
export type PacingMode = 'fast' | 'normal' | 'deliberate'

export interface OperatorProfile {
  // Identity
  roleId: RoleId
  name: string
  accentColor: string        // Personal color — ownership in shared views
  initials: string

  // Cognitive calibration
  density: InformationDensity
  guidance: GuidanceIntensity
  feedback: FeedbackStyle
  pacing: PacingMode

  // Thresholds
  escalationThreshold: number  // Minutes before system interrupts
  contextDepthDefault: 'collapsed' | 'expanded'
}

// ─── Profile presets per role ─────────────────────────────────────────────────
// In production these would be learned from behavioral observation.
// For now: hand-calibrated per role archetype.

const OPERATOR_PROFILES: Record<string, Partial<OperatorProfile>> = {
  'admin': {
    density: 'compact',
    guidance: 'autonomous',
    feedback: 'deviation',
    pacing: 'fast',
    escalationThreshold: 2,
    contextDepthDefault: 'expanded',
  },
  'group-ceo': {
    density: 'compact',
    guidance: 'autonomous',
    feedback: 'deviation',
    pacing: 'fast',
    escalationThreshold: 2,
    contextDepthDefault: 'expanded',
  },
  'ceo-ops': {
    density: 'standard',
    guidance: 'balanced',
    feedback: 'momentum',
    pacing: 'fast',
    escalationThreshold: 5,
    contextDepthDefault: 'collapsed',
  },
  'cfo': {
    density: 'compact',
    guidance: 'balanced',
    feedback: 'deviation',
    pacing: 'normal',
    escalationThreshold: 10,
    contextDepthDefault: 'expanded',
  },
  'cto': {
    density: 'compact',
    guidance: 'autonomous',
    feedback: 'balanced',
    pacing: 'fast',
    escalationThreshold: 5,
    contextDepthDefault: 'expanded',
  },
  'clo': {
    density: 'standard',
    guidance: 'directive',
    feedback: 'balanced',
    pacing: 'deliberate',
    escalationThreshold: 15,
    contextDepthDefault: 'collapsed',
  },
  'cpo': {
    density: 'standard',
    guidance: 'balanced',
    feedback: 'momentum',
    pacing: 'normal',
    escalationThreshold: 10,
    contextDepthDefault: 'collapsed',
  },
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface OperatorContextValue {
  profile: OperatorProfile
  // UI helpers derived from profile
  transitionSpeed: number           // ms — faster for 'fast' pacing
  maxItemsPerView: number           // density-calibrated
  showExpandedContext: boolean       // based on contextDepthDefault
  guidanceLabel: (directive: string, options: string) => string
}

const OperatorContext = createContext<OperatorContextValue | null>(null)

export function OperatorProvider({ children }: { children: React.ReactNode }) {
  const { effectiveRole } = useRole()

  const profile = useMemo<OperatorProfile>(() => {
    const roleId = effectiveRole?.id || 'group-ceo'
    const preset = OPERATOR_PROFILES[roleId] || {}

    return {
      roleId: roleId as RoleId,
      name: effectiveRole?.name || 'Operator',
      accentColor: effectiveRole?.color || '#C4961A',
      initials: effectiveRole?.initials || '??',
      density: preset.density || 'standard',
      guidance: preset.guidance || 'balanced',
      feedback: preset.feedback || 'balanced',
      pacing: preset.pacing || 'normal',
      escalationThreshold: preset.escalationThreshold || 10,
      contextDepthDefault: preset.contextDepthDefault || 'collapsed',
    }
  }, [effectiveRole])

  const transitionSpeed = profile.pacing === 'fast' ? 150
    : profile.pacing === 'deliberate' ? 400 : 250

  const maxItemsPerView = profile.density === 'compact' ? 12
    : profile.density === 'spacious' ? 5 : 8

  const showExpandedContext = profile.contextDepthDefault === 'expanded'

  const guidanceLabel = (directive: string, options: string) => {
    if (profile.guidance === 'directive') return directive
    if (profile.guidance === 'autonomous') return options
    return directive // balanced defaults to directive
  }

  return (
    <OperatorContext.Provider value={{
      profile, transitionSpeed, maxItemsPerView, showExpandedContext, guidanceLabel,
    }}>
      {children}
    </OperatorContext.Provider>
  )
}

export function useOperator() {
  const ctx = useContext(OperatorContext)
  if (!ctx) throw new Error('useOperator must be used inside OperatorProvider')
  return ctx
}
