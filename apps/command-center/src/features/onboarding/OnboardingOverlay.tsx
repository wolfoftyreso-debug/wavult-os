/**
 * OnboardingOverlay — Premium fullscreen enterprise OS onboarding
 *
 * Desktop: fullscreen with Gemini-generated atmospheric background,
 *          large centered modal, 2-column layout on wide screens
 * Mobile:  fullscreen card, stacked layout, touch-optimized
 */

import { useState, useEffect } from 'react'
import { CheckCircle, ChevronRight, ChevronLeft, X, Clock, Lightbulb, AlertTriangle, Info } from 'lucide-react'
import { TOURS } from './onboardingData'

const STORAGE_KEY = 'wavult_onboarding_v4'

function getCalloutStyle(type: 'info' | 'warning' | 'tip') {
  return {
    info:    { bg: 'rgba(37,99,235,0.08)', border: '#2563EB', icon: Info, color: '#2563EB' },
    warning: { bg: 'rgba(245,158,11,0.08)', border: '#F59E0B', icon: AlertTriangle, color: '#F59E0B' },
    tip:     { bg: 'rgba(22,163,74,0.08)',  border: '#16A34A', icon: Lightbulb, color: '#16A34A' },
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
      // Background with Gemini image + dark overlay
      backgroundImage: 'url(/images/os-onboarding-bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(10,15,30,0.88)',
        backdropFilter: 'blur(2px)',
      }}/>

      {/* Modal */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: isMobile ? '100%' : 'min(680px, 92vw)',
        maxHeight: isMobile ? '100dvh' : '90vh',
        margin: isMobile ? 0 : undefined,
        display: 'flex', flexDirection: 'column',
        background: 'rgba(13,21,38,0.95)',
        border: '1px solid #1E2D45',
        borderRadius: isMobile ? 0 : '8px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(37,99,235,0.1)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: isMobile ? '20px 20px 16px' : '28px 32px 20px',
          borderBottom: '1px solid #1E2D45',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: isMobile ? 40 : 48, height: isMobile ? 40 : 48,
              background: 'rgba(37,99,235,0.1)',
              border: '1px solid rgba(37,99,235,0.2)',
              borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isMobile ? 20 : 24, flexShrink: 0,
            }}>
              {current.icon}
            </div>
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: '#2563EB',
                fontFamily: 'monospace', marginBottom: 4,
              }}>
                WAVULT OS — {tour.name.toUpperCase()}
              </div>
              <h2 style={{
                fontSize: isMobile ? 18 : 22, fontWeight: 800,
                letterSpacing: '-0.02em', color: '#E2E8F0',
                lineHeight: 1.2,
              }}>
                {current.title}
              </h2>
            </div>
          </div>
          <button onClick={dismiss} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#475569', padding: '4px', borderRadius: '4px',
            flexShrink: 0, marginLeft: 8,
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Progress */}
        <div style={{ padding: '12px 32px', borderBottom: '1px solid #1E2D45', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 2, background: '#1E2D45', borderRadius: 1, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'linear-gradient(90deg, #1E40AF, #2563EB)',
              transition: 'width 0.3s ease',
            }}/>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#475569', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
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
        }}>
          <p style={{
            fontSize: isMobile ? 14 : 15, color: '#94A3B8',
            lineHeight: 1.8, marginBottom: 24,
          }}>
            {current.description}
          </p>

          {current.keyPoints && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {current.keyPoints.map((point: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '4px',
                    background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                  }}>
                    <CheckCircle size={12} style={{ color: '#2563EB' }} />
                  </div>
                  <span style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>{point}</span>
                </div>
              ))}
            </div>
          )}

          {calloutStyle && current.callout && CalloutIcon && (
            <div style={{
              display: 'flex', gap: 12, padding: '12px 14px',
              background: calloutStyle.bg,
              borderLeft: `2px solid ${calloutStyle.border}`,
              borderRadius: '0 4px 4px 0',
            }}>
              <CalloutIcon size={14} style={{ color: calloutStyle.color, flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                {current.callout.text}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: isMobile ? '16px 20px' : '20px 32px',
          borderTop: '1px solid #1E2D45',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <button onClick={dismiss} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: '#475569', padding: '8px 0',
          }}>
            Hoppa över
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button onClick={prev} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: '4px',
                background: 'transparent', border: '1px solid #1E2D45',
                color: '#94A3B8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                <ChevronLeft size={14} /> Tillbaka
              </button>
            )}
            <button onClick={next} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', borderRadius: '4px',
              background: '#2563EB', border: 'none',
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
