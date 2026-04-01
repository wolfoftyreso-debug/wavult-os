import { useState, useEffect, useMemo } from 'react'
import { CURRICULUM, CATEGORY_COLORS, CATEGORY_LABELS, type Lesson, type LessonCategory } from './curriculumData'

// ── Dag-beräkning ──────────────────────────────────────────
const THAILAND_START = new Date('2026-04-11')
const MAX_DAYS = 60

function getDaysBetween(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((to.getTime() - from.getTime()) / msPerDay)
}

function getCurrentDay(): number {
  const today = new Date()
  if (today < THAILAND_START) return 1
  const diff = getDaysBetween(THAILAND_START, today)
  return Math.max(1, Math.min(MAX_DAYS, diff + 1))
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

// ── Kategori-filter ────────────────────────────────────────
const ALL_CATEGORIES = 'all' as const
type FilterCategory = typeof ALL_CATEGORIES | LessonCategory

// ── Huvud-komponent ────────────────────────────────────────
export function AcademyView() {
  const today = new Date()
  const beforeThailand = today < THAILAND_START
  const currentDay = getCurrentDay()

  const [selectedDay, setSelectedDay] = useState<number>(currentDay)
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Uppdatera selectedDay om currentDay ändras (vid midnatt)
  useEffect(() => {
    setSelectedDay(currentDay)
  }, [currentDay])

  const lesson: Lesson = CURRICULUM[selectedDay - 1]

  // Filtrera lektioner för grid
  const filteredLessons = useMemo(() => {
    return CURRICULUM.filter((l) => {
      const categoryMatch = filterCategory === 'all' || l.category === filterCategory
      const searchMatch =
        searchQuery === '' ||
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.system.toLowerCase().includes(searchQuery.toLowerCase())
      return categoryMatch && searchMatch
    })
  }, [filterCategory, searchQuery])

  // Om valt dag inte syns i filter, visa den ändå men utan filter
  const showingAll = filterCategory === 'all' && searchQuery === ''

  // Hämta unika kategorier
  const categories = useMemo(() => {
    const cats = [...new Set(CURRICULUM.map((l) => l.category))] as LessonCategory[]
    return cats
  }, [])

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pb-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            🎓 Systemskolan v2
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {beforeThailand
              ? 'Startar 11 april 2026 · Bangkok, Thailand'
              : `Dag ${currentDay} av ${MAX_DAYS} · Thailand Workcamp`}
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
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs text-gray-500 uppercase tracking-widest">
                  DAG {selectedDay} AV {MAX_DAYS} · VECKA {lesson.week}
                </p>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: `${CATEGORY_COLORS[lesson.category]}20`,
                    color: CATEGORY_COLORS[lesson.category],
                  }}
                >
                  {CATEGORY_LABELS[lesson.category]}
                </span>
              </div>
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
                Kopplingen till Wavult
              </span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{lesson.connection}</p>
          </div>

          {/* Relaterade entities */}
          {lesson.source_entities.length > 0 && (
            <div className="px-5 py-3 bg-surface-primary/30">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">🔧 Services:</span>
                {lesson.source_entities.map((entity) => (
                  <span
                    key={entity}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-border text-gray-400 border border-gray-700"
                  >
                    {entity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Imorgon */}
          {selectedDay < MAX_DAYS && (
            <div className="px-5 py-3 bg-surface-primary/50">
              <p className="text-xs text-gray-500">
                <span className="text-gray-400">➡️ Imorgon:</span>{' '}
                <span className="text-gray-300">{lesson.tomorrow}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sök + Kategori-filter */}
      <div className="flex flex-col gap-2">
        {/* Sökfält */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Sök lektion..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-secondary border border-surface-border text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-500"
          />
        </div>

        {/* Kategori-tabs */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              filterCategory === 'all'
                ? 'bg-gray-700 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Alla ({CURRICULUM.length})
          </button>
          {categories.map((cat) => {
            const count = CURRICULUM.filter((l) => l.category === cat).length
            const isActive = filterCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors border ${
                  isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300 border-transparent'
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: `${CATEGORY_COLORS[cat]}25`,
                        borderColor: `${CATEGORY_COLORS[cat]}50`,
                        color: CATEGORY_COLORS[cat],
                      }
                    : {}
                }
              >
                {CATEGORY_LABELS[cat]} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Dag-grid */}
      <div className="rounded-xl border border-surface-border bg-surface-secondary p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {showingAll ? `Alla ${MAX_DAYS} dagar` : `${filteredLessons.length} lektioner`}
          </p>
          {!showingAll && (
            <button
              onClick={() => {
                setFilterCategory('all')
                setSearchQuery('')
              }}
              className="text-[10px] text-gray-500 hover:text-gray-300"
            >
              Rensa filter ✕
            </button>
          )}
        </div>

        {/* 10 kolumner × 6 rader = 60 dagar */}
        <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
          {CURRICULUM.map((l) => {
            const status = getDayStatus(l.day, currentDay)
            const isSelected = l.day === selectedDay
            const isFiltered = !showingAll && !filteredLessons.find((fl) => fl.day === l.day)
            return (
              <button
                key={l.day}
                onClick={() => setSelectedDay(l.day)}
                title={`Dag ${l.day}: ${l.title}`}
                className={`
                  relative flex flex-col items-center justify-center rounded-lg
                  px-1 py-2 gap-0.5 transition-all cursor-pointer
                  ${isFiltered ? 'opacity-20' : ''}
                  ${
                    isSelected
                      ? 'ring-2 ring-offset-1 ring-offset-surface-secondary bg-surface-primary'
                      : 'hover:bg-surface-primary/60'
                  }
                `}
                style={
                  isSelected
                    ? { outlineColor: l.color, ringColor: l.color }
                    : {}
                }
              >
                {/* Kategori-indikator dot */}
                <span
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[l.category] }}
                />
                <span className="text-[10px] text-gray-500 leading-none">{l.day}</span>
                <StatusIcon status={status} />
                <span className="text-[9px] text-gray-600 truncate w-full text-center leading-tight">
                  {l.emoji}
                </span>
              </button>
            )
          })}
        </div>

        {/* Kategori-legend */}
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <div key={cat} className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
              />
              <span className="text-[9px] text-gray-600">{CATEGORY_LABELS[cat].split(' ')[1]}</span>
            </div>
          ))}
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
          onClick={() => setSelectedDay((d) => Math.min(MAX_DAYS, d + 1))}
          disabled={selectedDay >= MAX_DAYS}
          className="flex-1 py-2 px-3 rounded-lg border border-surface-border text-xs text-gray-400 hover:text-gray-200 hover:bg-surface-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Nästa →
        </button>
      </div>
    </div>
  )
}
