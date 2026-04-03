/**
 * OnboardingOverlay — Wavult OS onboarding, cream/light theme (LOCKED 2026-04-03)
 */

import { useState, useEffect } from 'react'
import { CheckCircle, ChevronRight, ChevronLeft, X, Clock, Lightbulb, AlertTriangle, Info } from 'lucide-react'
import { TOURS } from './onboardingData'

const STORAGE_KEY = 'wavult_onboarding_v4'

// Cream palette
const C = {
  bg:           '#F5F0E8',
  surface:      '#FAF7F2',
  border:       '#D8D0C4',
  borderStrong: '#C0B8AC',
  navy:         '#0A3D62',
  navyLight:    'rgba(10,61,98,0.08)',
  navyBorder:   'rgba(10,61,98,0.2)',
  gold:         '#C4651A',
  textPrimary:  '#1A1612',
  textSecondary:'#4A4540',
  textMuted:    '#7A7570',
  overlay:      'rgba(245,240,232,0.96)',
}

function getCalloutStyle(type: 'info' | 'warning' | 'tip') {
  return {
    info:    { bg: 'rgba(44,95,122,0.07)', border: '#2C5F7A', icon: Info,          color: '#2C5F7A' },
    warning: { bg: 'rgba(196,101,26,0.07)', border: '#C4651A', icon: AlertTriangle, color: '#C4651A' },
    tip:     { bg: 'rgba(74,122,91,0.07)',  border: '#4A7A5B', icon: Lightbulb,     color: '#4A7A5B' },
  }[type]
}

export function OnboardingOverlay() {
  const tour = TOURS[0]
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) setVisible(true)
    setIsMobile(window.innerWidth < 768)
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, 'done')
    setVisible(false)
  }

  function next() {
    if (step < tour.steps.length - 1) setStep(s => s + 1)
    else dismiss()
  }

  function prev() {
    if (step > 0) setStep(s => s - 1)
  }

  if (!visible) return null

  const current = tour.steps[step]
  const progress = ((step + 1) / tour.steps.length) * 100
  const minutesLeft = Math.ceil(((tour.steps.length - step) / tour.steps.length) * tour.estimatedMinutes)
  const calloutStyle = current.callout ? getCalloutStyle(current.callout.type) : null
  const CalloutIcon = calloutStyle?.icon

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(200,190,175,0.55)',
      backdropFilter: 'blur(4px)',
    }}>
      {/* Modal */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: isMobile ? '100%' : 'min(680px, 92vw)',
        maxHeight: isMobile ? '100dvh' : '90vh',
        margin: isMobile ? 0 : undefined,
        display: 'flex', flexDirection: 'column',
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: isMobile ? 0 : '10px',
        boxShadow: '0 24px 60px rgba(26,22,18,0.14), 0 4px 12px rgba(26,22,18,0.06)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: isMobile ? '20px 20px 16px' : '28px 32px 20px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          background: C.bg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: isMobile ? 40 : 48, height: isMobile ? 40 : 48,
              background: C.navyLight,
              border: `1px solid ${C.navyBorder}`,
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isMobile ? 20 : 24, flexShrink: 0,
            }}>
              {current.icon}
            </div>
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: C.navy,
                fontFamily: 'monospace', marginBottom: 4,
              }}>
                WAVULT OS — {tour.name.toUpperCase()}
              </div>
              <h2 style={{
                fontSize: isMobile ? 18 : 22, fontWeight: 800,
                letterSpacing: '-0.02em', color: C.textPrimary,
                lineHeight: 1.2, margin: 0,
              }}>
                {current.title}
              </h2>
            </div>
          </div>
          <button onClick={dismiss} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.textMuted, padding: '4px', borderRadius: '4px',
            flexShrink: 0, marginLeft: 8,
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Progress */}
        <div style={{
          padding: '12px 32px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 12,
          background: C.bg,
        }}>
          <div style={{ flex: 1, height: 2, background: C.border, borderRadius: 1, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: C.navy,
              transition: 'width 0.3s ease',
            }}/>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: C.textMuted, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            <span>Steg {step + 1} / {tour.steps.length}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} /> ~{minutesLeft} min
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{
          padding: isMobile ? '20px' : '28px 32px',
          flex: 1, overflowY: 'auto',
          background: C.surface,
        }}>
          <p style={{
            fontSize: isMobile ? 14 : 15, color: C.textSecondary,
            lineHeight: 1.8, marginBottom: 24, marginTop: 0,
          }}>
            {current.description}
          </p>

          {current.keyPoints && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {current.keyPoints.map((point: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '4px',
                    background: C.navyLight, border: `1px solid ${C.navyBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                  }}>
                    <CheckCircle size={12} style={{ color: C.navy }} />
                  </div>
                  <span style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>{point}</span>
                </div>
              ))}
            </div>
          )}

          {calloutStyle && current.callout && CalloutIcon && (
            <div style={{
              display: 'flex', gap: 12, padding: '12px 14px',
              background: calloutStyle.bg,
              borderLeft: `2px solid ${calloutStyle.border}`,
              borderRadius: '0 6px 6px 0',
            }}>
              <CalloutIcon size={14} style={{ color: calloutStyle.color, flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, margin: 0 }}>
                {current.callout.text}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: isMobile ? '16px 20px' : '20px 32px',
          borderTop: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: C.bg,
        }}>
          <button onClick={dismiss} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: C.textMuted, padding: '8px 0',
          }}>
            Hoppa över
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button onClick={prev} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: '6px',
                background: 'transparent', border: `1px solid ${C.border}`,
                color: C.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                <ChevronLeft size={14} /> Tillbaka
              </button>
            )}
            <button onClick={next} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', borderRadius: '6px',
              background: C.navy, border: 'none',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              letterSpacing: '0.02em',
            }}>
              {step === tour.steps.length - 1 ? 'Klar' : 'Nästa'}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
