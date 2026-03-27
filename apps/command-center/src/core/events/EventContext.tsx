// ─── Wavult OS v2 — Event Context ──────────────────────────────────────────────
// Central state for the event-driven OS. Manages event queue, resolutions, and atmosphere.

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react'
import { generateEvents, computeSystemState, computeMomentum } from './eventEngine'
import type { OperationalEvent, SystemState, MomentumMetrics, AtmosphereState } from './types'

interface EventContextValue {
  // Event queue
  events: OperationalEvent[]
  activeEvent: OperationalEvent | null
  pendingEvents: OperationalEvent[]
  resolvedEvents: OperationalEvent[]

  // Actions
  setActiveEvent: (event: OperationalEvent | null) => void
  resolveEvent: (eventId: string, actionId: string) => void
  deferEvent: (eventId: string) => void

  // System state
  systemState: SystemState
  momentum: MomentumMetrics
  atmosphere: AtmosphereState

  // Navigation mode
  isInSaveRoom: boolean
}

const EventContext = createContext<EventContextValue | null>(null)

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [events] = useState<OperationalEvent[]>(() => generateEvents())
  const [activeEventId, setActiveEventId] = useState<string | null>(null)
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())
  const [deferredIds, setDeferredIds] = useState<Set<string>>(new Set())

  // Derive event lists
  const pendingEvents = useMemo(
    () => events.filter(e => !resolvedIds.has(e.id) && !deferredIds.has(e.id)),
    [events, resolvedIds, deferredIds]
  )

  const resolvedEvents = useMemo(
    () => events.filter(e => resolvedIds.has(e.id)),
    [events, resolvedIds]
  )

  const activeEvent = useMemo(
    () => {
      if (activeEventId) {
        return pendingEvents.find(e => e.id === activeEventId) || null
      }
      // Auto-select first pending if none active
      return pendingEvents[0] || null
    },
    [activeEventId, pendingEvents]
  )

  const systemState = useMemo(() => computeSystemState(events.map(e => ({
    ...e,
    state: resolvedIds.has(e.id) ? 'resolved' as const : e.state,
  }))), [events, resolvedIds])

  const momentum = useMemo(() => computeMomentum(events.map(e => ({
    ...e,
    state: resolvedIds.has(e.id) ? 'resolved' as const : e.state,
  }))), [events, resolvedIds])

  const isInSaveRoom = pendingEvents.length === 0

  const setActiveEvent = useCallback((event: OperationalEvent | null) => {
    setActiveEventId(event?.id || null)
  }, [])

  const resolveEvent = useCallback((eventId: string, _actionId: string) => {
    setResolvedIds(prev => new Set([...prev, eventId]))
    // Auto-advance to next event
    setActiveEventId(null)
  }, [])

  const deferEvent = useCallback((eventId: string) => {
    setDeferredIds(prev => new Set([...prev, eventId]))
    setActiveEventId(null)
  }, [])

  const value: EventContextValue = {
    events,
    activeEvent,
    pendingEvents,
    resolvedEvents,
    setActiveEvent,
    resolveEvent,
    deferEvent,
    systemState,
    momentum,
    atmosphere: systemState.atmosphere,
    isInSaveRoom,
  }

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  )
}

export function useEvents() {
  const ctx = useContext(EventContext)
  if (!ctx) throw new Error('useEvents must be used inside EventProvider')
  return ctx
}
