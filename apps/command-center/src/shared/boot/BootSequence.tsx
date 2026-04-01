/**
 * BootSequence — Wavult OS startup experience
 *
 * Tre faser:
 *   1. BOOT   — systemladdning med progress bar + statusrader (1.8s)
 *   2. UPDATE — uppdateringsmodal om det finns nya changelogs
 *   3. DONE   — överlämnar kontrollen till appen
 */

import React, { useState, useEffect, useCallback } from 'react'

// ─── Changelog / release notes ────────────────────────────────────────────────
// Öka VERSION_KEY när du deployer med ny funktionalitet.
// Användaren ser modalen en gång per version per browser.

const CURRENT_VERSION = '2.4.0'
const VERSION_STORAGE_KEY = 'wavult_os_acknowledged_version'

interface ChangeEntry {
  tag: 'NEW' | 'IMPROVED' | 'FIXED' | 'SECURITY'
  text: string
}

interface Release {
  version: string
  date: string
  title: string
  changes: ChangeEntry[]
}

const LATEST_RELEASE: Release = {
  version: CURRENT_VERSION,
  date: '2026-03-30',
  title: 'Infrastructure & Portal Update',
  changes: [
    { tag: 'NEW',      text: 'UAPIX customer portal — API key management, subscription dashboard' },
    { tag: 'NEW',      text: 'Apifly customer portal — magic link auth, plan management' },
    { tag: 'NEW',      text: 'Wavult Group website rebuilt — enterprise presentation layer' },
    { tag: 'IMPROVED', text: 'API endpoints now route via api.wavult.com (stable)' },
    { tag: 'IMPROVED', text: 'Boot sequence — OS loads cleanly before showing UI' },
    { tag: 'IMPROVED', text: 'Order flow — server-side price validation, crypto-secure API keys' },
    { tag: 'SECURITY', text: 'CORS updated to include uapix.com and apifly.com' },
    { tag: 'SECURITY', text: 'API key generation upgraded to cryptographically secure random' },
    { tag: 'FIXED',    text: 'Dark mode renders immediately (no white flash on load)' },
    { tag: 'FIXED',    text: 'Portal auth callback handles expired magic links with clear error' },
  ],
}

// ─── Boot sequence steps ──────────────────────────────────────────────────────

interface BootStep {
  label: string
  duration: number // ms
}

const BOOT_STEPS: BootStep[] = [
  { label: 'Initializing runtime environment',  duration: 220 },
  { label: 'Loading identity layer',             duration: 180 },
  { label: 'Connecting to Wavult infrastructure', duration: 260 },
  { label: 'Verifying session integrity',        duration: 200 },
  { label: 'Loading command modules',            duration: 240 },
  { label: 'Applying security policies',         duration: 160 },
  { label: 'Syncing entity registry',            duration: 200 },
  { label: 'System ready',                       duration: 140 },
]

const TAG_STYLE: Record<ChangeEntry['tag'], { bg: string; text: string; label: string }> = {
  NEW:      { bg: 'rgba(16,185,129,0.12)', text: '#10B981', label: 'NEW' },
  IMPROVED: { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6', label: 'UPD' },
  FIXED:    { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', label: 'FIX' },
  SECURITY: { bg: 'rgba(239,68,68,0.12)',  text: '#EF4444', label: 'SEC' },
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onComplete: () => void
}

type Phase = 'boot' | 'update' | 'done'

export function BootSequence({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('boot')
  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [visibleSteps, setVisibleSteps] = useState<string[]>([])
  const [hasUpdate, setHasUpdate] = useState(false)

  // Check if user has seen this version
  useEffect(() => {
    const seen = localStorage.getItem(VERSION_STORAGE_KEY)
    setHasUpdate(seen !== CURRENT_VERSION)
  }, [])

  // Run boot animation
  useEffect(() => {
    if (phase !== 'boot') return

    let currentStep = 0
    let totalElapsed = 0
    const totalDuration = BOOT_STEPS.reduce((s, b) => s + b.duration, 0)

    const runStep = () => {
      if (currentStep >= BOOT_STEPS.length) {
        setProgress(100)
        setTimeout(() => {
          const seen = localStorage.getItem(VERSION_STORAGE_KEY)
          if (seen !== CURRENT_VERSION) {
            setPhase('update')
          } else {
            setPhase('done')
          }
        }, 300)
        return
      }

      const step = BOOT_STEPS[currentStep]
      setStepIndex(currentStep)
      setVisibleSteps(prev => [...prev, step.label])

      // Smooth progress within each step
      const startProgress = (totalElapsed / totalDuration) * 100
      totalElapsed += step.duration
      const endProgress = (totalElapsed / totalDuration) * 100
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const frac = Math.min(elapsed / step.duration, 1)
        const p = startProgress + (endProgress - startProgress) * frac
        setProgress(Math.round(p))
        if (frac < 1) {
          requestAnimationFrame(animate)
        } else {
          currentStep++
          setTimeout(runStep, 30)
        }
      }
      requestAnimationFrame(animate)
    }

    runStep()
  }, [phase])

  // Phase: done
  useEffect(() => {
    if (phase === 'done') {
      onComplete()
    }
  }, [phase, onComplete])

  const handleAcknowledge = useCallback(() => {
    localStorage.setItem(VERSION_STORAGE_KEY, CURRENT_VERSION)
    setPhase('done')
  }, [])

  // ── BOOT PHASE ─────────────────────────────────────────────────────────────
  if (phase === 'boot') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0A0A0A',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '1rem' }}>
            <path d="M24 4L44 16V32L24 44L4 32V16L24 4Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
            <circle cx="24" cy="24" r="7" fill="white" opacity="0.9"/>
          </svg>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.25em', color: '#fff', textTransform: 'uppercase' }}>
            Wavult OS
          </div>
          <div style={{ fontSize: '10px', color: '#52525B', letterSpacing: '0.12em', marginTop: '4px' }}>
            v{CURRENT_VERSION}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ width: '320px', marginBottom: '1.5rem' }}>
          <div style={{
            height: '2px', background: '#1A1A1A', borderRadius: '1px',
            overflow: 'hidden', marginBottom: '0.75rem',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #3B82F6, #2563EB)',
              transition: 'width 0.05s linear',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#3F3F46' }}>
            <span>Loading system components</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Step log */}
        <div style={{ width: '320px', height: '120px', overflow: 'hidden', position: 'relative' }}>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
          }}>
            {visibleSteps.slice(-5).map((step, i, arr) => (
              <div key={step} style={{
                fontSize: '11px',
                color: i === arr.length - 1 ? '#A1A1AA' : '#3F3F46',
                padding: '2px 0',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'color 0.3s',
              }}>
                <span style={{ color: i === arr.length - 1 ? '#3B82F6' : '#27272A' }}>
                  {i === arr.length - 1 ? '▶' : '✓'}
                </span>
                {step}
                {i === arr.length - 1 && (
                  <span style={{ display: 'inline-block', animation: 'blink 1s step-end infinite' }}>_</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        `}</style>
      </div>
    )
  }

  // ── UPDATE PHASE ───────────────────────────────────────────────────────────
  if (phase === 'update') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace',
        padding: '1rem',
      }}>
        <div style={{
          background: '#111111',
          border: '1px solid #222222',
          borderRadius: '12px',
          width: '100%', maxWidth: '560px',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
        }}>
          {/* Header */}
          <div style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid #1A1A1A',
            display: 'flex', alignItems: 'center', gap: '1rem',
          }}>
            <div style={{
              width: '40px', height: '40px',
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px',
            }}>
              ↓
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                System Update Available
              </div>
              <div style={{ fontSize: '11px', color: '#52525B', marginTop: '2px', letterSpacing: '0.04em' }}>
                Wavult OS v{LATEST_RELEASE.version} · {LATEST_RELEASE.date}
              </div>
            </div>
            <div style={{
              marginLeft: 'auto',
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
              color: '#3B82F6', background: 'rgba(59,130,246,0.1)',
              padding: '0.3rem 0.6rem', borderRadius: '4px',
              border: '1px solid rgba(59,130,246,0.2)',
            }}>
              v{LATEST_RELEASE.version}
            </div>
          </div>

          {/* Release title */}
          <div style={{ padding: '1.25rem 2rem 0.75rem', borderBottom: '1px solid #1A1A1A' }}>
            <div style={{ fontSize: '12px', color: '#71717A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              {LATEST_RELEASE.title}
            </div>
          </div>

          {/* Changelog */}
          <div style={{ padding: '1rem 2rem', maxHeight: '280px', overflowY: 'auto' }}>
            {LATEST_RELEASE.changes.map((change, i) => {
              const style = TAG_STYLE[change.tag]
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  padding: '0.6rem 0',
                  borderBottom: i < LATEST_RELEASE.changes.length - 1 ? '1px solid #1A1A1A' : 'none',
                }}>
                  <div style={{
                    flexShrink: 0,
                    fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
                    padding: '2px 6px',
                    background: style.bg, color: style.text,
                    borderRadius: '3px', marginTop: '1px',
                    minWidth: '32px', textAlign: 'center',
                  }}>
                    {style.label}
                  </div>
                  <div style={{ fontSize: '12px', color: '#A1A1AA', lineHeight: 1.5 }}>
                    {change.text}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{
            padding: '1.25rem 2rem',
            borderTop: '1px solid #1A1A1A',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: '11px', color: '#3F3F46' }}>
              Review changes before proceeding
            </div>
            <button
              onClick={handleAcknowledge}
              style={{
                background: '#fff',
                color: '#0A0A0A',
                border: 'none',
                padding: '0.6rem 1.5rem',
                borderRadius: '6px',
                fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em',
                cursor: 'pointer',
                fontFamily: 'monospace',
                transition: 'opacity 0.15s',
              }}
              onMouseOver={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseOut={e => (e.currentTarget.style.opacity = '1')}
            >
              Accept & Continue →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
