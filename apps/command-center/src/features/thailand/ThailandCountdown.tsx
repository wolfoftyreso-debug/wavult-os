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
      <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-2">🇹🇭</div>
        <p className="text-white font-bold text-xl">Vi är i Thailand!</p>
        <p className="text-white/60 text-sm">Workcamp pågår</p>
      </div>
    )
  }

  const units = [
    { label: 'Dagar', value: time.days },
    { label: 'Timmar', value: time.hours },
    { label: 'Minuter', value: time.minutes },
    { label: 'Sekunder', value: time.seconds },
  ]

  return (
    <div className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🇹🇭</span>
        <div>
          <p className="text-white font-semibold">Thailand Workcamp</p>
          <p className="text-white/50 text-xs">11 april 2026 — hela teamet</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {units.map(({ label, value }) => (
          <div key={label} className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-orange-400 tabular-nums">
              {String(value).padStart(2, '0')}
            </p>
            <p className="text-white/40 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-white/30 text-xs text-center mt-3">
        Projekten sätts upp och rullar ut 🚀
      </p>
    </div>
  )
}
