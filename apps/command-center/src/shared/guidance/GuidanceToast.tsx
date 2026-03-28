/**
 * GuidanceToast — Discrete, non-blocking guidance toast
 *
 * Behaviour:
 *   - Appears bottom-left, z-50
 *   - Auto-dismisses after 8 s
 *   - "Visa mer →" expands inline extended text
 *   - Close button for manual dismiss
 *   - Amber accent for immature (SKELETON/ALPHA) modules
 */

import { useEffect, useRef, useState } from 'react'
import { useGuidance } from './GuidanceSystem'

/** Duration in ms before the toast auto-dismisses */
const AUTO_DISMISS_MS = 8_000

export function GuidanceToast() {
  const { activeToast, dismissToast } = useGuidance()
  const [expanded, setExpanded] = useState(false)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset expanded state when toast changes
  useEffect(() => {
    setExpanded(false)
    if (activeToast) {
      // Slight delay so the enter animation plays
      const id = setTimeout(() => setVisible(true), 30)
      return () => clearTimeout(id)
    } else {
      setVisible(false)
    }
  }, [activeToast])

  // Auto-dismiss timer
  useEffect(() => {
    if (!activeToast) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setVisible(false)
      // Let fade-out finish, then remove
      setTimeout(dismissToast, 350)
    }, AUTO_DISMISS_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [activeToast, dismissToast])

  if (!activeToast) return null

  const isImmature = activeToast.isImmature ?? false
  const accentColor = isImmature ? '#F59E0B' : '#6366F1'
  const bgClass = isImmature
    ? 'bg-[#1C1107] border-amber-500/30'
    : 'bg-[#0D0F1A] border-white/[0.10]'
  const dotColor = isImmature ? 'bg-amber-400' : 'bg-indigo-400'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        fixed bottom-20 md:bottom-6 left-4 z-50
        max-w-[320px] w-[calc(100vw-2rem)] md:w-72
        rounded-2xl border shadow-xl
        transition-all duration-350
        ${bgClass}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
      `}
      style={{ boxShadow: `0 8px 32px ${accentColor}22` }}
    >
      {/* Top bar accent line */}
      <div
        className="h-[2px] rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${accentColor}BB, transparent)` }}
      />

      <div className="px-4 py-3">
        {/* Header row */}
        <div className="flex items-start gap-2">
          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`} />
          <p className="text-xs text-gray-200 leading-snug flex-1">
            {activeToast.short}
          </p>
          {/* Close */}
          <button
            onClick={() => { setVisible(false); setTimeout(dismissToast, 350) }}
            className="flex-shrink-0 text-gray-600 hover:text-gray-300 transition-colors ml-1 mt-0.5"
            aria-label="Stäng"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Expanded content */}
        {expanded && activeToast.extended && (
          <p className="text-xs text-gray-400 mt-2 leading-relaxed pl-3.5">
            {activeToast.extended}
          </p>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between mt-2 pl-3.5">
          {activeToast.extended && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs font-medium transition-colors"
              style={{ color: accentColor }}
            >
              Visa mer →
            </button>
          )}
          {(expanded || !activeToast.extended) && <span />}
          {/* Progress bar */}
          <div className="h-px flex-1 max-w-[80px] ml-auto rounded-full overflow-hidden bg-white/[0.05]">
            <div
              className="h-px rounded-full"
              style={{
                background: accentColor,
                width: '100%',
                animation: `guidance-drain ${AUTO_DISMISS_MS}ms linear forwards`,
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes guidance-drain {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  )
}
