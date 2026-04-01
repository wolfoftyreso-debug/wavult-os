import { useState, useEffect } from 'react'
import { CURRICULUM, type Lesson } from './curriculumData'

// ── Dag-beräkning ──────────────────────────────────────────
const THAILAND_START = new Date('2026-04-11')

function getDaysBetween(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((to.getTime() - from.getTime()) / msPerDay)
}

function getCurrentDay(): number {
  const today = new Date()
  if (today < THAILAND_START) return 1
  const diff = getDaysBetween(THAILAND_START, today)
  return Math.max(1, Math.min(30, diff + 1))
}

type DayStatus = 'completed' | 'current' | 'future'

function getDayStatus(day: number, currentDay: number): DayStatus {
  if (day < currentDay) return 'completed'
  if (day === currentDay) return 'current'
  return 'future'
}

// ── Status-ikon ────────────────────────────────────────────
function StatusIcon({ status }: { status: DayStatus }) {
  if (status === 'completed') return <span className="text-green-400">✅</span>
  if (status === 'current')
    return (
      <span className="relative inline-flex">
        <span className="text-base">📍</span>
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
      </span>
    )
  return <span className="text-gray-600">⬜</span>
}

// ── Huvud-komponent ────────────────────────────────────────
export function AcademyView() {
  const today = new Date()
  const beforeThailand = today < THAILAND_START
  const currentDay = getCurrentDay()

  const [selectedDay, setSelectedDay] = useState<number>(currentDay)

  // Uppdatera selectedDay om currentDay ändras (vid midnatt)
  useEffect(() => {
    setSelectedDay(currentDay)
  }, [currentDay])

  const lesson: Lesson = CURRICULUM[selectedDay - 1]

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pb-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            🎓 Systemskolan
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {beforeThailand
              ? 'Startar 11 april 2026 · Bangkok, Thailand'
              : `Dag ${currentDay} av 30 · Thailand Workcamp`}
          </p>
        </div>
        <div
          className="px-3 py-1 rounded-full text-xs font-medium border"
          style={{
            backgroundColor: `${lesson.color}18`,
            borderColor: `${lesson.color}40`,
            color: lesson.color,
          }}
        >
          {lesson.emoji} {lesson.system}
        </div>
      </div>

      {/* Lektionskort */}
      <div className="rounded-xl border border-surface-border bg-surface-secondary overflow-hidden">
        {/* Lektion-header */}
        <div
          className="px-5 py-4 border-b border-surface-border"
          style={{ borderLeftWidth: 4, borderLeftColor: lesson.color, borderLeftStyle: 'solid' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                DAG {selectedDay} AV 30
              </p>
              <h3 className="text-base font-semibold text-text-primary">{lesson.title}</h3>
            </div>
            <span className="text-3xl">{lesson.emoji}</span>
          </div>
        </div>

        {/* Lektion-innehåll */}
        <div className="divide-y divide-surface-border">
          {/* Analogin */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">📖</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Analogin
              </span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{lesson.analogy}</p>
          </div>

          {/* Tekniskt */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">⚙️</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Tekniskt
              </span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {lesson.technical}
            </p>
          </div>

          {/* Kopplingen till Wavult */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🔗</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Kopplingen till Wavult OS
              </span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{lesson.connection}</p>
          </div>

          {/* Imorgon */}
          {selectedDay < 30 && (
            <div className="px-5 py-3 bg-surface-primary/50">
              <p className="text-xs text-gray-500">
                <span className="text-gray-400">➡️ Imorgon:</span>{' '}
                <span className="text-gray-300">{lesson.tomorrow}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dag-grid */}
      <div className="rounded-xl border border-surface-border bg-surface-secondary p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Alla 30 dagar
        </p>
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-1.5">
          {CURRICULUM.map((l) => {
            const status = getDayStatus(l.day, currentDay)
            const isSelected = l.day === selectedDay
            return (
              <button
                key={l.day}
                onClick={() => setSelectedDay(l.day)}
                title={`Dag ${l.day}: ${l.system}`}
                className={`
                  relative flex flex-col items-center justify-center rounded-lg
                  px-1 py-2 gap-0.5 transition-all cursor-pointer
                  ${
                    isSelected
                      ? 'ring-2 ring-offset-1 ring-offset-surface-secondary bg-surface-primary'
                      : 'hover:bg-surface-primary/60'
                  }
                `}
                style={isSelected ? { outlineColor: l.color } : {}}
              >
                <span className="text-[10px] text-gray-500 leading-none">{l.day}</span>
                <StatusIcon status={status} />
                <span className="text-[9px] text-gray-600 truncate w-full text-center leading-tight">
                  {l.emoji}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Snabbnavigering */}
      <div className="flex justify-between gap-2">
        <button
          onClick={() => setSelectedDay((d) => Math.max(1, d - 1))}
          disabled={selectedDay <= 1}
          className="flex-1 py-2 px-3 rounded-lg border border-surface-border text-xs text-gray-400 hover:text-gray-200 hover:bg-surface-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← Föregående
        </button>
        <button
          onClick={() => setSelectedDay(currentDay)}
          className="px-3 py-2 rounded-lg text-xs font-medium bg-[#2563EB]/15 text-[#2563EB] border border-[#2563EB]/30 hover:bg-[#2563EB]/25 transition-colors"
        >
          Idag (Dag {currentDay})
        </button>
        <button
          onClick={() => setSelectedDay((d) => Math.min(30, d + 1))}
          disabled={selectedDay >= 30}
          className="flex-1 py-2 px-3 rounded-lg border border-surface-border text-xs text-gray-400 hover:text-gray-200 hover:bg-surface-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Nästa →
        </button>
      </div>
    </div>
  )
}
