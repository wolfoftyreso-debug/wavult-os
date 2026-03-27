import { useState, useEffect } from 'react'

interface Course {
  id: string
  title: string
  description: string
  icon: string
  color: string
  chapters: string[]
  durationMin: number
}

const COURSES: Course[] = [
  {
    id: 'wavult-os',
    title: 'Wavult OS — Grundkurs',
    description: 'Lär dig navigera Wavult OS: moduler, entiteter, roller och workflow för hela koncernen.',
    icon: '🖥️',
    color: '#3B82F6',
    chapters: [
      'Intro: Vad är Wavult OS?',
      'Shell, Sidebar & Navigation',
      'Entity Scope — filtrera per bolag',
      'Roller: Admin, CEO, CFO, CTO, Ops',
      'Modulöversikt: Finance, CRM, Legal',
      'Dashboard & Incident Center',
      'Inställningar & Systemstatus',
    ],
    durationMin: 45,
  },
  {
    id: 'quixzoom',
    title: 'QuiXzoom — Plattformsguide',
    description: 'Crowdsourcad kamerainfrastruktur: affärsmodell, tech stack, uppdragsflöde och Zoomer-nätverket.',
    icon: '📸',
    color: '#F59E0B',
    chapters: [
      'Vision: Last Mile Intelligence Capture',
      'Affärsmodell & Intäktsflöden',
      'Zoomer-roller: Standard, Pro, Elite',
      'Uppdragsflöde: Skapande → Leverans',
      'Tech Stack: React Native + AWS',
      'Optical Insight: B2B-armen',
      'Marknadsstrategi & Expansion',
    ],
    durationMin: 60,
  },
  {
    id: 'landvex',
    title: 'Landvex — Produktkurs',
    description: 'AI-driven infrastrukturinspektion: målgrupper, EU-marknad, tech och sälj.',
    icon: '🏗️',
    color: '#10B981',
    chapters: [
      'Produktbeskrivning: Vad löser Landvex?',
      'Målkunder: Kommuner, Trafikverket',
      'EU-strategi: Litauen UAB som bas',
      'Lansering Sverige juni 2026',
      'Tech: AI-analys & Alertssystem',
      'Prismodell & Upphandling (LOU/LUF)',
      'Nästa marknad: Nederländerna Q1 2027',
    ],
    durationMin: 50,
  },
  {
    id: 'dubai',
    title: 'Dubai-strukturen',
    description: 'Wavult Groups juridiska och skattemässiga struktur: Dubai Free Zone, IP-ägande, pengaflöden.',
    icon: '🏙️',
    color: '#8B5CF6',
    chapters: [
      'Varför Dubai? Skatt, IP, kontroll',
      'Free Zone LLC: IFZA vs DIFC vs ADGM',
      'Wavult Group: IP & Control Layer',
      'Wavult Operations: Driftlager',
      'Lokala bolag: UAB & Inc',
      'Pengaflöde: Royalties & Service Fees',
      'Juridisk separation: Praktiken',
    ],
    durationMin: 40,
  },
  {
    id: 'arkitektur',
    title: 'Systemarkitektur',
    description: 'Teknisk djupdykning: AWS ECS, microservices, frontend-stack och deployment-pipeline.',
    icon: '⚙️',
    color: '#6366F1',
    chapters: [
      'Arkitekturprinciper & Four-Layer Framework',
      'AWS Setup: ECS Fargate, eu-north-1',
      'Microservices: Mission, Auth, Media, Billing',
      'Frontend: React + TypeScript + Vite',
      'Cloudflare: Pages, DNS, Workers',
      'CI/CD: GitHub Actions → ECR → ECS',
      'Bernt: AI-agent-arkitektur',
    ],
    durationMin: 75,
  },
]

type ProgressMap = Record<string, number> // courseId → chapters completed

function getProgress(): ProgressMap {
  try {
    return JSON.parse(localStorage.getItem('wavult_academy_progress') ?? '{}')
  } catch {
    return {}
  }
}

function saveProgress(p: ProgressMap) {
  localStorage.setItem('wavult_academy_progress', JSON.stringify(p))
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

function CourseModal({ course, progress, onUpdate, onClose }: {
  course: Course
  progress: number
  onUpdate: (chapters: number) => void
  onClose: () => void
}) {
  const [current, setCurrent] = useState(progress)

  const complete = current >= course.chapters.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#0D0F1A] border border-surface-border rounded-xl w-full max-w-lg mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{course.icon}</span>
            <h2 className="text-white font-semibold">{course.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-lg leading-none">×</button>
        </div>

        <ProgressBar value={current} max={course.chapters.length} color={course.color} />
        <p className="text-[10px] text-gray-600 font-mono mt-1 mb-4">
          {current}/{course.chapters.length} kapitel · ~{course.durationMin} min
        </p>

        <div className="space-y-2 mb-6">
          {course.chapters.map((chapter, i) => (
            <button
              key={i}
              onClick={() => {
                const next = Math.max(current, i + 1)
                setCurrent(next)
                onUpdate(next)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                i < current
                  ? 'bg-green-500/10 border border-green-500/20'
                  : i === current
                  ? 'border border-dashed hover:bg-white/[0.03]'
                  : 'opacity-40 cursor-not-allowed'
              }`}
              style={{ borderColor: i < current ? undefined : i === current ? course.color + '60' : undefined }}
              disabled={i > current}
            >
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                  i < current ? 'bg-green-500' : ''
                }`}
                style={{ background: i < current ? undefined : i === current ? course.color + '30' : '#1a1a2e', border: i >= current ? `1px solid ${course.color}40` : undefined }}
              >
                {i < current ? '✓' : <span className="text-gray-600">{i + 1}</span>}
              </div>
              <span className={`text-sm ${i < current ? 'text-green-400' : i === current ? 'text-white' : 'text-gray-600'}`}>
                {chapter}
              </span>
              {i === current && (
                <span className="ml-auto text-[10px] font-mono" style={{ color: course.color }}>▶ Starta</span>
              )}
            </button>
          ))}
        </div>

        {complete && (
          <div
            className="flex items-center gap-3 p-3 rounded-lg mb-4"
            style={{ background: course.color + '15', border: `1px solid ${course.color}30` }}
          >
            <span className="text-xl">🎓</span>
            <div>
              <p className="text-sm font-semibold text-white">Kurs slutförd!</p>
              <p className="text-xs text-gray-400">Du har genomfört {course.title}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!complete && current > 0 && (
            <button
              onClick={() => { setCurrent(0); onUpdate(0) }}
              className="px-3 py-1.5 rounded-lg text-xs text-gray-600 border border-surface-border hover:text-gray-400 transition-colors"
            >
              Återställ
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] transition-colors"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  )
}

export function AcademyView() {
  const [progress, setProgress] = useState<ProgressMap>(getProgress)
  const [openCourse, setOpenCourse] = useState<Course | null>(null)

  const totalChapters = COURSES.reduce((sum, c) => sum + c.chapters.length, 0)
  const completedChapters = COURSES.reduce((sum, c) => sum + Math.min(progress[c.id] ?? 0, c.chapters.length), 0)
  const overallPct = Math.round((completedChapters / totalChapters) * 100)

  function handleUpdate(courseId: string, chapters: number) {
    const next = { ...progress, [courseId]: chapters }
    setProgress(next)
    saveProgress(next)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#0D0F1A] border border-surface-border rounded-xl p-4">
          <p className="text-[10px] text-gray-600 font-mono mb-1">TOTAL PROGRESS</p>
          <p className="text-2xl font-bold text-white">{overallPct}%</p>
          <div className="mt-2">
            <ProgressBar value={completedChapters} max={totalChapters} color="#8B5CF6" />
          </div>
        </div>
        <div className="bg-[#0D0F1A] border border-surface-border rounded-xl p-4">
          <p className="text-[10px] text-gray-600 font-mono mb-1">KURSER KLARA</p>
          <p className="text-2xl font-bold text-white">
            {COURSES.filter(c => (progress[c.id] ?? 0) >= c.chapters.length).length}
            <span className="text-base text-gray-600">/{COURSES.length}</span>
          </p>
        </div>
        <div className="bg-[#0D0F1A] border border-surface-border rounded-xl p-4">
          <p className="text-[10px] text-gray-600 font-mono mb-1">KAPITEL KLARA</p>
          <p className="text-2xl font-bold text-white">
            {completedChapters}
            <span className="text-base text-gray-600">/{totalChapters}</span>
          </p>
        </div>
      </div>

      {/* Course grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 flex-1 overflow-y-auto">
        {COURSES.map(course => {
          const done = progress[course.id] ?? 0
          const total = course.chapters.length
          const pct = Math.round((done / total) * 100)
          const isComplete = done >= total

          return (
            <button
              key={course.id}
              onClick={() => setOpenCourse(course)}
              className="text-left p-5 bg-[#0D0F1A] border border-surface-border rounded-xl hover:border-white/20 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{course.icon}</span>
                {isComplete && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-mono border border-green-500/20">
                    ✓ Klar
                  </span>
                )}
                {!isComplete && done > 0 && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                    style={{ background: course.color + '15', color: course.color, border: `1px solid ${course.color}30` }}
                  >
                    {pct}%
                  </span>
                )}
              </div>

              <h3 className="text-sm font-semibold text-white mb-1.5 group-hover:text-brand-accent transition-colors">
                {course.title}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">{course.description}</p>

              <div className="space-y-2">
                <ProgressBar value={done} max={total} color={course.color} />
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-gray-600">{done}/{total} kapitel</span>
                  <span className="text-gray-600">~{course.durationMin} min</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {openCourse && (
        <CourseModal
          course={openCourse}
          progress={progress[openCourse.id] ?? 0}
          onUpdate={n => handleUpdate(openCourse.id, n)}
          onClose={() => setOpenCourse(null)}
        />
      )}
    </div>
  )
}
