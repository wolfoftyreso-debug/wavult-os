import { useState, useEffect } from 'react'

const TARGET = new Date('2026-04-11T00:00:00+07:00') // Bangkok time

function getTimeLeft() {
  const now = new Date()
  const diff = TARGET.getTime() - now.getTime()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    done: false,
  }
}

export function ThailandCountdown() {
  const [time, setTime] = useState(getTimeLeft())
  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000)
    return () => clearInterval(id)
  }, [])

  if (time.done) {
    return (
      <div
        className="rounded-xl border border-yellow-500/30 p-6 text-center"
        style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0D0F1A 100%)' }}
      >
        <div className="text-5xl mb-3">🇹🇭</div>
        <p className="text-white font-bold text-2xl">Vi är i Thailand!</p>
        <p className="text-white/50 text-sm mt-1">Workcamp pågår</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border border-purple-500/20 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0D0F1A 100%)' }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] flex items-center gap-3">
        <span className="text-3xl">🇹🇭</span>
        <div>
          <h3 className="text-sm font-semibold text-white">Thailand Workcamp</h3>
          <p className="text-xs text-gray-500 mt-0.5">11 April 2026 — Projektstart</p>
        </div>
      </div>

      {/* Countdown grid */}
      <div className="grid grid-cols-4 gap-2 md:gap-3 px-3 md:px-5 py-4 md:py-5">
        {[
          { label: 'DAGAR', value: time.days },
          { label: 'TIMMAR', value: time.hours },
          { label: 'MINUTER', value: time.minutes },
          { label: 'SEKUNDER', value: time.seconds },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl p-3 text-center"
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}
          >
            <p className="text-3xl md:text-5xl font-bold tabular-nums leading-none" style={{ color: '#a78bfa' }}>
              {String(value).padStart(2, '0')}
            </p>
            <p className="text-[9px] text-gray-600 uppercase tracking-wider mt-2">{label}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 text-center">
        <p className="text-xs text-gray-600">Hela teamet samlas — projekten rullas ut 🚀</p>
      </div>
    </div>
  )
}
