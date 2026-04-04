import { useState, useEffect, useMemo } from 'react'
import { CURRICULUM, CATEGORY_COLORS, CATEGORY_LABELS, type Lesson, type LessonCategory } from './curriculumData'
import {
  useAcademyCourses,
  usePersonProgress,
  useAcademyDashboard,
  useAcademyGaps,
  completeCourse,
  type AcademyCourse,
} from './useAcademyData'

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
  return <span className="text-[#6B7280]">⬜</span>
}

// ── Kategori-filter ────────────────────────────────────────
const ALL_CATEGORIES = 'all' as const
type FilterCategory = typeof ALL_CATEGORIES | LessonCategory

// ── ISO/Compliance kategori-metadata ──────────────────────
const ISO_CATEGORY_META: Record<string, { label: string; color: string; emoji: string }> = {
  iso_9001:  { label: 'ISO 9001',  color: '#0A3D62', emoji: '📋' },
  iso_27001: { label: 'ISO 27001', color: '#1A5276', emoji: '🔒' },
  gdpr:      { label: 'GDPR',      color: '#6C3483', emoji: '🛡️' },
  nis2:      { label: 'NIS2',      color: '#117A65', emoji: '🌐' },
  system:    { label: 'System',    color: '#784212', emoji: '⚙️' },
  product:   { label: 'Produkt',   color: '#B7950B', emoji: '📦' },
}

const LEVEL_META: Record<string, { label: string; color: string }> = {
  awareness:    { label: 'Awareness',    color: '#27AE60' },
  practitioner: { label: 'Practitioner', color: '#E8B84B' },
  expert:       { label: 'Expert',       color: '#E74C3C' },
}

// ── Kurskortskomponent ─────────────────────────────────────
function CourseCard({
  course,
  status,
  score,
  onComplete,
}: {
  course: AcademyCourse
  status: 'completed' | 'in_progress' | 'not_started'
  score?: number | null
  onComplete?: (courseCode: string) => void
}) {
  const catMeta = ISO_CATEGORY_META[course.category] ?? { label: course.category, color: '#888', emoji: '📚' }
  const levelMeta = LEVEL_META[course.level] ?? { label: course.level, color: '#888' }
  const isMandatoryAll = course.mandatory_for.includes('all')

  return (
    <div
      className="rounded-xl border border-[#DDD5C5] bg-[#FAF7F2] p-4 flex flex-col gap-3"
      style={{ borderLeftWidth: 3, borderLeftColor: catMeta.color, borderLeftStyle: 'solid' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {/* Kategori-badge */}
            <span
              className="px-2 py-0.5 rounded text-[10px] font-semibold"
              style={{ backgroundColor: `${catMeta.color}18`, color: catMeta.color }}
            >
              {catMeta.emoji} {catMeta.label}
            </span>
            {/* Level-badge */}
            <span
              className="px-2 py-0.5 rounded text-[10px] font-medium border"
              style={{ borderColor: `${levelMeta.color}60`, color: levelMeta.color }}
            >
              {levelMeta.label}
            </span>
            {/* Obligatorisk-badge */}
            {isMandatoryAll && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E8B84B]/20 text-[#9A7209] border border-[#E8B84B]/40">
                ⚡ Obligatorisk
              </span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-[#0A3D62] leading-tight">{course.title}</h4>
        </div>
        {/* Status-ikon */}
        <div className="shrink-0 text-xl">
          {status === 'completed' ? '✅' : status === 'in_progress' ? '🔄' : '⬜'}
        </div>
      </div>

      {/* Beskrivning */}
      {course.description && (
        <p className="text-xs text-[#6B7280] leading-relaxed">{course.description}</p>
      )}

      {/* Footer: längd + poäng + knapp */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 text-xs text-[#8A8A9A]">
          <span>⏱️ {course.duration_hours}h</span>
          {score != null && (
            <span className={score >= 70 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
              Poäng: {score}/100
            </span>
          )}
        </div>
        {status === 'not_started' && onComplete && (
          <button
            onClick={() => onComplete(course.course_code)}
            className="px-3 py-1 rounded text-[11px] font-medium text-white transition-colors"
            style={{ backgroundColor: catMeta.color }}
          >
            Starta kurs →
          </button>
        )}
        {status === 'in_progress' && onComplete && (
          <button
            onClick={() => onComplete(course.course_code)}
            className="px-3 py-1 rounded text-[11px] font-medium text-[#0A3D62] bg-[#E8B84B]/20 border border-[#E8B84B]/60 transition-colors"
          >
            Fortsätt →
          </button>
        )}
        {status === 'completed' && (
          <span className="text-[10px] text-green-600 font-medium">Avklarad ✓</span>
        )}
      </div>
    </div>
  )
}

// ── ISO & Compliance sektion ───────────────────────────────
function ISOComplianceSection({ currentUser }: { currentUser: string }) {
  const [selectedPerson, setSelectedPerson] = useState(currentUser)
  const [showTeam, setShowTeam] = useState(false)
  const [completingCourse, setCompletingCourse] = useState<string | null>(null)

  const { courses, loading: coursesLoading } = useAcademyCourses()
  const { data: progress, loading: progressLoading, reload } = usePersonProgress(selectedPerson)
  const { data: dashboard, loading: dashboardLoading } = useAcademyDashboard()
  const { gaps } = useAcademyGaps()

  const teamMembers = ['erik', 'dennis', 'johan', 'winston', 'leon']

  const myGaps = gaps.filter((g) => g.person_id === selectedPerson)
  const hasGaps = myGaps.length > 0

  async function handleComplete(courseCode: string) {
    setCompletingCourse(courseCode)
    try {
      // Simulera kurs-avklarande med testpoäng 85 (i produktion: öppna quiz-modal)
      await completeCourse(courseCode, selectedPerson, 85)
      reload()
    } catch (e) {
      console.error('Failed to complete course:', e)
    } finally {
      setCompletingCourse(null)
    }
  }

  const stats = progress?.stats
  const complianceColor =
    !stats
      ? '#888'
      : stats.compliance_percent >= 80
      ? '#27AE60'
      : stats.compliance_percent >= 50
      ? '#E8B84B'
      : '#E74C3C'

  return (
    <div className="flex flex-col gap-5">
      {/* Person-väljare */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-[#8A8A9A] font-medium">Visa för:</span>
        {teamMembers.map((member) => (
          <button
            key={member}
            onClick={() => setSelectedPerson(member)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition-colors ${
              selectedPerson === member
                ? 'text-white'
                : 'bg-[#F0EBE0] text-[#6B7280] hover:text-[#0A3D62]'
            }`}
            style={selectedPerson === member ? { backgroundColor: '#0A3D62' } : {}}
          >
            {member}
          </button>
        ))}
      </div>

      {/* Stats-kort */}
      {progressLoading ? (
        <div className="rounded-xl border border-[#DDD5C5] bg-[#FAF7F2] p-4 text-center text-xs text-[#8A8A9A]">
          Laddar...
        </div>
      ) : stats ? (
        <div className="rounded-xl border border-[#DDD5C5] bg-[#FAF7F2] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#0A3D62]">
              📊 Min utbildningsplan —{' '}
              <span className="capitalize">{selectedPerson}</span>
            </h3>
            <div className="flex items-center gap-2">
              {/* Gap-indikator */}
              {hasGaps && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-300">
                  ⚠️ {myGaps.length} kompetensgap
                </span>
              )}
              <span
                className="text-lg font-bold"
                style={{ color: complianceColor }}
              >
                {stats.compliance_percent}%
              </span>
            </div>
          </div>

          {/* Progress-bar */}
          <div className="w-full bg-[#EDE8DC] rounded-full h-2 mb-3">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.compliance_percent}%`, backgroundColor: complianceColor }}
            />
          </div>

          {/* Siffror */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-green-600">{stats.completed}</div>
              <div className="text-[10px] text-[#8A8A9A]">Avklarade</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#E8B84B]">{stats.in_progress}</div>
              <div className="text-[10px] text-[#8A8A9A]">Pågående</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#6B7280]">{stats.not_started}</div>
              <div className="text-[10px] text-[#8A8A9A]">Ej påbörjad</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Kurskort per status */}
      {progress && progress.progress.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* Obligatoriska ej klara */}
          {progress.progress.filter((p) => p.status !== 'completed').length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#8A8A9A] uppercase tracking-wider mb-2">
                Obligatoriska kurser att avklara
              </p>
              <div className="grid grid-cols-1 gap-2">
                {progress.progress
                  .filter((p) => p.status !== 'completed')
                  .map(({ course, status, completion }) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      status={status}
                      score={completion?.score}
                      onComplete={completingCourse ? undefined : handleComplete}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Avklarade */}
          {progress.progress.filter((p) => p.status === 'completed').length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#8A8A9A] uppercase tracking-wider mb-2">
                Avklarade kurser ✅
              </p>
              <div className="grid grid-cols-1 gap-2">
                {progress.progress
                  .filter((p) => p.status === 'completed')
                  .map(({ course, status, completion }) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      status={status}
                      score={completion?.score}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kompetensgap-sektion */}
      {myGaps.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-red-700 mb-3">
            ⚠️ Kompetensgap — rekommenderade kurser
          </h3>
          <div className="flex flex-col gap-2">
            {myGaps.map((gap, idx) => (
              <div key={idx} className="text-xs text-[#6B7280] bg-white rounded-lg p-3 border border-red-100">
                <p className="font-medium text-red-700 mb-1">
                  {gap.competency_code} — {gap.competency_title}
                  <span className="ml-2 font-normal text-[#8A8A9A]">
                    (nivå {gap.current_level}/{gap.target_level})
                  </span>
                </p>
                {gap.recommended_courses.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {gap.recommended_courses.map((c) => (
                      <span key={c.code} className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px]">
                        {c.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team-översikt */}
      <div>
        <button
          onClick={() => setShowTeam((v) => !v)}
          className="flex items-center gap-2 text-xs font-medium text-[#0A3D62] hover:text-[#E8B84B] transition-colors mb-3"
        >
          <span>👥 Team-översikt</span>
          <span>{showTeam ? '▲' : '▼'}</span>
        </button>

        {showTeam && (
          dashboardLoading ? (
            <div className="text-xs text-[#8A8A9A]">Laddar team-data...</div>
          ) : dashboard ? (
            <div className="rounded-xl border border-[#DDD5C5] bg-[#FAF7F2] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#DDD5C5] bg-[#EDE8DC]">
                    <th className="px-3 py-2 text-left text-[#0A3D62] font-semibold">Person</th>
                    <th className="px-3 py-2 text-center text-[#0A3D62] font-semibold">Avklarade</th>
                    <th className="px-3 py-2 text-center text-[#0A3D62] font-semibold">Kvar</th>
                    <th className="px-3 py-2 text-center text-[#0A3D62] font-semibold">Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.team.map((member) => {
                    const pct = member.compliance_percent
                    const color = pct >= 80 ? '#27AE60' : pct >= 50 ? '#E8B84B' : '#E74C3C'
                    return (
                      <tr key={member.person_id} className="border-b border-[#EDE8DC] last:border-0">
                        <td className="px-3 py-2 capitalize font-medium text-[#0A3D62]">
                          {member.person_id}
                        </td>
                        <td className="px-3 py-2 text-center text-green-600 font-medium">
                          {member.completed}
                        </td>
                        <td className="px-3 py-2 text-center text-[#6B7280]">
                          {member.pending}
                        </td>
                        <td className="px-3 py-2 text-center font-bold" style={{ color }}>
                          {pct}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-[#8A8A9A]">Ingen data tillgänglig</div>
          )
        )}
      </div>

      {/* Alla kurser (katalog) */}
      <div>
        <p className="text-[11px] font-semibold text-[#8A8A9A] uppercase tracking-wider mb-2">
          Kurskatalog — {courses.length} kurser
        </p>
        {coursesLoading ? (
          <div className="text-xs text-[#8A8A9A]">Laddar kurser...</div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {courses.map((course) => {
              const myEntry = progress?.progress.find((p) => p.course.id === course.id)
              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  status={myEntry?.status ?? 'not_started'}
                  score={myEntry?.completion?.score}
                  onComplete={completingCourse ? undefined : handleComplete}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Huvud-komponent ────────────────────────────────────────
export function AcademyView() {
  const today = new Date()
  const beforeThailand = today < THAILAND_START
  const currentDay = getCurrentDay()

  const [activeTab, setActiveTab] = useState<'systemskolan' | 'iso_compliance'>('systemskolan')
  const [selectedDay, setSelectedDay] = useState<number>(currentDay)
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Aktuell inloggad användare (i produktion: hämta från auth context)
  const currentUser = 'erik'

  useEffect(() => {
    setSelectedDay(currentDay)
  }, [currentDay])

  const lesson: Lesson = CURRICULUM[selectedDay - 1]

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

  const showingAll = filterCategory === 'all' && searchQuery === ''

  const categories = useMemo(() => {
    const cats = [...new Set(CURRICULUM.map((l) => l.category))] as LessonCategory[]
    return cats
  }, [])

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pb-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[#0A3D62] flex items-center gap-2">
            🎓 Academy
          </h2>
          <p className="text-xs text-[#8A8A9A] mt-0.5">
            {activeTab === 'systemskolan'
              ? beforeThailand
                ? 'Startar 11 april 2026 · Bangkok, Thailand'
                : `Dag ${currentDay} av ${MAX_DAYS} · Thailand Workcamp`
              : 'ISO 9001 · ISO 27001 · GDPR · NIS2 — compliance-utbildning'}
          </p>
        </div>
        {activeTab === 'systemskolan' && (
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
        )}
      </div>

      {/* Tab-navigering */}
      <div className="flex gap-1 rounded-lg p-1 bg-[#EDE8DC]">
        <button
          onClick={() => setActiveTab('systemskolan')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
            activeTab === 'systemskolan'
              ? 'bg-[#FAF7F2] text-[#0A3D62] shadow-sm'
              : 'text-[#8A8A9A] hover:text-[#6B7280]'
          }`}
        >
          📅 Systemskolan
        </button>
        <button
          onClick={() => setActiveTab('iso_compliance')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
            activeTab === 'iso_compliance'
              ? 'bg-[#FAF7F2] text-[#0A3D62] shadow-sm'
              : 'text-[#8A8A9A] hover:text-[#6B7280]'
          }`}
        >
          🎓 ISO & Compliance
        </button>
      </div>

      {/* ── Systemskolan tab ──────────────────────────── */}
      {activeTab === 'systemskolan' && (
        <>
          {/* Lektionskort */}
          <div className="rounded-xl border border-surface-border bg-surface-secondary overflow-hidden">
            <div
              className="px-5 py-4 border-b border-surface-border"
              style={{ borderLeftWidth: 4, borderLeftColor: lesson.color, borderLeftStyle: 'solid' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs text-[#8A8A9A] uppercase tracking-widest">
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

            <div className="divide-y divide-surface-border">
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">📖</span>
                  <span className="text-xs font-semibold text-[#8A8A9A] uppercase tracking-wider">Analogin</span>
                </div>
                <p className="text-sm text-[#6B7280] leading-relaxed">{lesson.analogy}</p>
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">⚙️</span>
                  <span className="text-xs font-semibold text-[#8A8A9A] uppercase tracking-wider">Tekniskt</span>
                </div>
                <p className="text-sm text-[#6B7280] leading-relaxed whitespace-pre-line">{lesson.technical}</p>
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🔗</span>
                  <span className="text-xs font-semibold text-[#8A8A9A] uppercase tracking-wider">Kopplingen till Wavult</span>
                </div>
                <p className="text-sm text-[#6B7280] leading-relaxed">{lesson.connection}</p>
              </div>

              {lesson.source_entities.length > 0 && (
                <div className="px-5 py-3 bg-surface-primary/30">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[#8A8A9A]">🔧 Services:</span>
                    {lesson.source_entities.map((entity) => (
                      <span
                        key={entity}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-border text-[#8A8A9A] border border-[#DDD5C5]"
                      >
                        {entity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedDay < MAX_DAYS && (
                <div className="px-5 py-3 bg-surface-primary/50">
                  <p className="text-xs text-[#8A8A9A]">
                    <span className="text-[#8A8A9A]">➡️ Imorgon:</span>{' '}
                    <span className="text-[#6B7280]">{lesson.tomorrow}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sök + Kategori-filter */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A9A] text-sm">🔍</span>
              <input
                type="text"
                placeholder="Sök lektion..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-secondary border border-surface-border text-xs text-[#6B7280] placeholder-gray-600 focus:outline-none focus:border-gray-500"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  filterCategory === 'all'
                    ? 'bg-[#EDE8DC] text-[#0A3D62]'
                    : 'text-[#8A8A9A] hover:text-[#6B7280]'
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
                      isActive ? 'text-[#0A3D62]' : 'text-[#8A8A9A] hover:text-[#6B7280] border-transparent'
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
              <p className="text-xs font-semibold text-[#8A8A9A] uppercase tracking-wider">
                {showingAll ? `Alla ${MAX_DAYS} dagar` : `${filteredLessons.length} lektioner`}
              </p>
              {!showingAll && (
                <button
                  onClick={() => { setFilterCategory('all'); setSearchQuery('') }}
                  className="text-[10px] text-[#8A8A9A] hover:text-[#6B7280]"
                >
                  Rensa filter ✕
                </button>
              )}
            </div>

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
                    className={`relative flex flex-col items-center justify-center rounded-lg px-1 py-2 gap-0.5 transition-all cursor-pointer ${isFiltered ? 'opacity-20' : ''} ${
                      isSelected
                        ? 'ring-2 ring-offset-1 ring-offset-surface-secondary bg-surface-primary'
                        : 'hover:bg-surface-primary/60'
                    }`}
                    style={isSelected ? { outlineColor: l.color, ringColor: l.color } : {}}
                  >
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[l.category] }} />
                    <span className="text-[10px] text-[#8A8A9A] leading-none">{l.day}</span>
                    <StatusIcon status={status} />
                    <span className="text-[9px] text-[#6B7280] truncate w-full text-center leading-tight">{l.emoji}</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <div key={cat} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                  <span className="text-[9px] text-[#6B7280]">{CATEGORY_LABELS[cat].split(' ')[1]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Snabbnavigering */}
          <div className="flex justify-between gap-2">
            <button
              onClick={() => setSelectedDay((d) => Math.max(1, d - 1))}
              disabled={selectedDay <= 1}
              className="flex-1 py-2 px-3 rounded-lg border border-surface-border text-xs text-[#8A8A9A] hover:text-[#2C5F8A] hover:bg-surface-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
              className="flex-1 py-2 px-3 rounded-lg border border-surface-border text-xs text-[#8A8A9A] hover:text-[#2C5F8A] hover:bg-surface-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Nästa →
            </button>
          </div>
        </>
      )}

      {/* ── ISO & Compliance tab ──────────────────────── */}
      {activeTab === 'iso_compliance' && (
        <ISOComplianceSection currentUser={currentUser} />
      )}
    </div>
  )
}
