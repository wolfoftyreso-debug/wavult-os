// ─── Onboarding Overlay — Windows first-run style guided tour ────────────────

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  TOURS, getOnboardingState, saveOnboardingState,
  type OnboardingStep,
} from './onboardingData'

// ─── Spotlight / tooltip card ─────────────────────────────────────────────────

function TourCard({
  step,
  stepIndex,
  totalSteps,
  tourName,
  onNext,
  onPrev,
  onSkip,
  isLast,
}: {
  step: OnboardingStep
  stepIndex: number
  totalSteps: number
  tourName: string
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  isLast: boolean
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/70 pointer-events-none" />

      {/* Card */}
      <div className="fixed z-[60] inset-0 flex items-center justify-center pointer-events-none px-4">
        <div
          className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/[0.12] shadow-2xl"
          style={{ background: '#0D0F1A' }}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 font-mono uppercase tracking-wider">{tourName}</span>
              <button
                onClick={onSkip}
                className="text-xs text-gray-700 hover:text-gray-400 transition-colors font-mono"
              >
                Hoppa över
              </button>
            </div>
            {/* Progress dots */}
            <div className="flex gap-1 mt-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all"
                  style={{
                    width: i === stepIndex ? '20px' : '6px',
                    background: i <= stepIndex ? '#6366F1' : '#374151',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-5">
            <div className="text-3xl mb-3">{step.icon}</div>
            <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{step.description}</p>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 flex items-center justify-between">
            <button
              onClick={onPrev}
              disabled={stepIndex === 0}
              className="text-xs px-3 py-2 rounded-lg text-gray-600 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Tillbaka
            </button>
            <span className="text-xs text-gray-700 font-mono">{stepIndex + 1} / {totalSteps}</span>
            <button
              onClick={onNext}
              className="text-xs px-4 py-2 rounded-lg font-semibold transition-colors"
              style={{ background: '#6366F1', color: 'white' }}
            >
              {isLast ? 'Klar ✓' : 'Nästa →'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Tour launcher button ─────────────────────────────────────────────────────

function TourLauncherButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 md:bottom-[72px] right-4 md:right-6 z-40 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
      style={{ background: '#6366F1', color: 'white' }}
      title="Starta guiden"
    >
      <span className="text-base">👋</span>
      <span className="text-xs font-semibold hidden sm:block">Ny här?</span>
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OnboardingOverlay() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [active, setActive] = useState(false)
  const [tourId, setTourId] = useState('first-run')
  const [stepIndex, setStepIndex] = useState(0)
  const [showLauncher, setShowLauncher] = useState(false)

  useEffect(() => {
    // Show launcher if not completed first-run
    const state = getOnboardingState()
    if (!state.completedTours.includes('first-run') && !state.dismissed) {
      // Auto-start on very first visit
      const hasVisited = localStorage.getItem('wavult-has-visited')
      if (!hasVisited) {
        localStorage.setItem('wavult-has-visited', '1')
        setTimeout(() => { setActive(true); setTourId('first-run'); setStepIndex(0) }, 800)
      } else {
        setShowLauncher(true)
      }
    } else {
      setShowLauncher(true)
    }
  }, [])

  const tour = TOURS.find(t => t.id === tourId)
  const step = tour?.steps[stepIndex]

  // Navigate when step route changes
  useEffect(() => {
    if (active && step && step.route !== pathname) {
      navigate(step.route)
    }
  }, [active, step, stepIndex])

  const handleNext = useCallback(() => {
    if (!tour) return
    if (stepIndex < tour.steps.length - 1) {
      setStepIndex(s => s + 1)
    } else {
      // Tour complete
      const state = getOnboardingState()
      state.completedTours = [...new Set([...state.completedTours, tourId])]
      saveOnboardingState(state)
      setActive(false)
      setShowLauncher(true)
    }
  }, [tour, stepIndex, tourId])

  const handlePrev = useCallback(() => {
    if (stepIndex > 0) setStepIndex(s => s - 1)
  }, [stepIndex])

  const handleSkip = useCallback(() => {
    const state = getOnboardingState()
    state.dismissed = true
    saveOnboardingState(state)
    setActive(false)
    setShowLauncher(true)
  }, [])

  const handleLaunch = useCallback(() => {
    setTourId('first-run')
    setStepIndex(0)
    setActive(true)
    setShowLauncher(false)
  }, [])

  if (!active && !showLauncher) return null

  return (
    <>
      {active && step && tour && (
        <TourCard
          step={step}
          stepIndex={stepIndex}
          totalSteps={tour.steps.length}
          tourName={tour.name}
          onNext={handleNext}
          onPrev={handlePrev}
          onSkip={handleSkip}
          isLast={stepIndex === tour.steps.length - 1}
        />
      )}
      {!active && showLauncher && (
        <TourLauncherButton onClick={handleLaunch} />
      )}
    </>
  )
}
