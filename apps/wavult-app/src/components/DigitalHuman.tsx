// ─── Wavult App — Digital Human Component ───────────────────────────────────────
// The system's face. Not a chatbot — a presence that speaks orchestration results.
// Expandable from a small floating orb to a full conversation view.

import { useState, useRef } from 'react'
import { useDuix } from '../core/duix/DuixContext'
import { useOperatorState } from '../core/state/StateContext'
import { orchestrate } from '../core/orchestration/engine'

type Mode = 'orb' | 'expanded'

const STATUS_COLOR = {
  idle: '#3D4452',
  loading: '#C4961A',
  connected: '#4A7A5B',
  speaking: '#C4961A',
  listening: '#4A7A9B',
  error: '#D94040',
}

const STATUS_LABEL = {
  idle: 'Offline',
  loading: 'Connecting...',
  connected: 'Ready',
  speaking: 'Speaking',
  listening: 'Listening',
  error: 'Error',
}

export function DigitalHuman() {
  const { state, connect, disconnect, speak, interrupt, toggleMic, isConfigured } = useDuix()
  const { snapshot } = useOperatorState()
  const [mode, setMode] = useState<Mode>('orb')
  const containerRef = useRef<HTMLDivElement>(null)

  // Don't render if Duix is not configured
  if (!isConfigured) return null

  const statusColor = STATUS_COLOR[state.status]

  const handleOrbClick = async () => {
    if (state.status === 'idle') {
      setMode('expanded')
      // Small delay to let the container render
      setTimeout(() => connect('.duix-container'), 100)
    } else {
      setMode(prev => prev === 'orb' ? 'expanded' : 'orb')
    }
  }

  const handleClose = () => {
    disconnect()
    setMode('orb')
  }

  const handleSpeak = () => {
    if (state.isSpeaking) {
      interrupt()
      return
    }

    // Get orchestration result and speak it
    const result = orchestrate(snapshot)
    const text = result.coaching
      ? `${result.coaching}. ${result.recommendation}`
      : result.recommendation

    speak(text)
  }

  // ─── Orb mode ──────────────────────────────────────────────────────────

  if (mode === 'orb') {
    return (
      <button
        onClick={handleOrbClick}
        className="fixed bottom-24 right-5 z-40 h-12 w-12 rounded-full flex items-center justify-center transition-all active:scale-90"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${statusColor}30, ${statusColor}10)`,
          border: `2px solid ${statusColor}50`,
          boxShadow: state.status !== 'idle'
            ? `0 0 20px ${statusColor}20, 0 0 40px ${statusColor}10`
            : 'none',
        }}
      >
        {/* Pulse ring when active */}
        {state.status !== 'idle' && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: statusColor, opacity: 0.1 }}
          />
        )}

        {/* Icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={statusColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      </button>
    )
  }

  // ─── Expanded mode ─────────────────────────────────────────────────────

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-slide-up" style={{ paddingBottom: 'calc(64px + var(--safe-area-bottom))' }}>
      <div className="mx-4 bg-w-surface border border-w-border rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-w-border">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: statusColor }} />
            <span className="text-[10px] font-mono text-tx-tertiary">{STATUS_LABEL[state.status]}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('orb')}
              className="text-tx-muted hover:text-tx-tertiary text-xs px-1"
            >
              ▾
            </button>
            <button
              onClick={handleClose}
              className="text-tx-muted hover:text-tx-tertiary text-xs px-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Video container */}
        <div
          ref={containerRef}
          className="duix-container relative bg-w-bg"
          style={{ height: 200, width: '100%' }}
        >
          {state.status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="h-8 w-8 border-2 border-w-border border-t-signal-amber rounded-full animate-spin mx-auto mb-2" />
                <p className="text-[10px] text-tx-muted font-mono">CONNECTING</p>
              </div>
            </div>
          )}

          {state.error && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <p className="text-xs text-signal-red text-center">{state.error}</p>
            </div>
          )}
        </div>

        {/* Transcript */}
        {(state.lastSpokenText || state.lastUserText) && (
          <div className="px-4 py-2 border-t border-w-border max-h-20 overflow-y-auto">
            {state.lastSpokenText && (
              <p className="text-xs text-tx-secondary">
                <span className="text-signal-amber font-mono text-[9px] mr-1">SYS</span>
                {state.lastSpokenText}
              </p>
            )}
            {state.lastUserText && (
              <p className="text-xs text-tx-tertiary mt-1">
                <span className="text-signal-blue font-mono text-[9px] mr-1">YOU</span>
                {state.lastUserText}
              </p>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-w-border">
          {/* Mic toggle */}
          <button
            onClick={toggleMic}
            disabled={state.status !== 'connected'}
            className="h-10 w-10 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
            style={{
              background: state.isListening ? '#4A7A9B20' : '#1C2029',
              border: `1px solid ${state.isListening ? '#4A7A9B50' : '#2A2F3A'}`,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={state.isListening ? '#4A7A9B' : '#5A6170'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
            </svg>
          </button>

          {/* Speak / interrupt button */}
          <button
            onClick={handleSpeak}
            disabled={state.status !== 'connected'}
            className="flex-1 h-10 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] disabled:opacity-30"
            style={{
              background: state.isSpeaking ? '#D9404020' : '#C4961A15',
              color: state.isSpeaking ? '#D94040' : '#C4961A',
              border: `1px solid ${state.isSpeaking ? '#D9404030' : '#C4961A30'}`,
            }}
          >
            {state.isSpeaking ? 'Stop' : 'What should I do now?'}
          </button>
        </div>
      </div>
    </div>
  )
}
