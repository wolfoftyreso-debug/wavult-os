// ─── Wavult OS v2 — Shell ──────────────────────────────────────────────────────
// The outer shell of the operating system. Not a layout — an environment.
// Structure: MissionStack (left) | Focal Zone or Content (center) | Peripheral HUD (top/bottom)
//
// When on the root/dashboard route: event-driven focal zone or save room.
// When on feature routes (org, incidents, etc.): full-bleed content with HUD overlay.

import React from 'react'
import { useLocation } from 'react-router-dom'
import { MissionStack } from '../../core/components/MissionStack'
import { EventFocalZone } from '../../core/components/EventFocalZone'
import { SaveRoom } from '../../core/components/SaveRoom'
import { TopHUD, BottomTelemetry } from '../../core/components/PeripheralHUD'
import { useEvents } from '../../core/events/EventContext'

// Routes that get the full event-driven experience
const EVENT_DRIVEN_ROUTES = ['/', '/dashboard']

// Routes that need full bleed (no padding)
const FULL_BLEED_ROUTES = ['/org', '/entities', '/incidents', '/markets', '/campaigns']

function isFullBleed(pathname: string) {
  return FULL_BLEED_ROUTES.some(r => pathname.startsWith(r))
}

function isEventDrivenRoute(pathname: string) {
  return EVENT_DRIVEN_ROUTES.includes(pathname)
}

interface ShellProps {
  children: React.ReactNode
}

export function Shell({ children }: ShellProps) {
  const { pathname } = useLocation()
  const { isInSaveRoom, atmosphere } = useEvents()

  const showEventZone = isEventDrivenRoute(pathname)
  const fullBleed = isFullBleed(pathname)

  // Atmospheric background based on system state
  const bgClass = atmosphere === 'action' ? 'bg-[#12141A]'
    : atmosphere === 'attention' ? 'bg-[#13161C]'
    : 'bg-wavult-carbon'

  return (
    <div className={`flex h-screen ${bgClass} overflow-hidden transition-colors duration-1000`}>
      {/* Mission Stack — left rail, always visible */}
      <MissionStack />

      {/* Main area */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top HUD — always on */}
        <TopHUD />

        {/* Content zone */}
        <div className="flex-1 overflow-hidden">
          {showEventZone ? (
            // Event-driven mode: focal zone or save room
            isInSaveRoom ? <SaveRoom /> : <EventFocalZone />
          ) : (
            // Feature route: render the route content
            <div className={`h-full ${fullBleed ? '' : 'overflow-auto p-6'}`}>
              {children}
            </div>
          )}
        </div>

        {/* Bottom telemetry — always on */}
        <BottomTelemetry />
      </main>
    </div>
  )
}
