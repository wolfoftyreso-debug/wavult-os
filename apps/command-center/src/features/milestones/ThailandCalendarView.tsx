// ─── Thailand Workcamp — Fullständigt program ────────────────────────────────
// Hela april-programmet dag för dag. Uppdateras löpande.

import { useState } from 'react'

interface DayProgram {
  date: string
  dayNum: number
  label: string
  theme: string
  color: string
  icon: string
  events: { time: string; activity: string; type: 'work' | 'health' | 'social' | 'travel' | 'retreat' | 'free' }[]
  notes?: string
}

const TYPE_COLORS = {
  work:    '#3B82F6',
  health:  '#10B981',
  social:  '#F59E0B',
  travel:  '#8B5CF6',
  retreat: '#EC4899',
  free:    '#6B7280',
}

const TYPE_ICONS = {
  work:    '💻',
  health:  '🏥',
  social:  '🎉',
  travel:  '✈️',
  retreat: '🧘',
  free:    '🌴',
}

const PROGRAM: DayProgram[] = [
  {
    date: '2026-04-11',
    dayNum: 1,
    label: 'Ankomst & Kickoff',
    theme: 'BANGKOK',
    color: '#3B82F6',
    icon: '✈️',
    events: [
      { time: 'Dag',     activity: 'Ankomst Bangkok — incheckning hotell', type: 'travel' },
      { time: '18:00',   activity: 'Teamdinner — hela gänget samlas', type: 'social' },
      { time: '20:00',   activity: 'Kickoff-möte: mål, roller, spelregler för workcamp', type: 'work' },
    ],
    notes: 'Officiell projektstart. Thailand Workcamp börjar.',
  },
  {
    date: '2026-04-12',
    dayNum: 2,
    label: 'Systemarkitektur & Setup',
    theme: 'BANGKOK',
    color: '#3B82F6',
    icon: '🏗️',
    events: [
      { time: '08:00', activity: 'Frukost + energicheck (fasta från kl 22)', type: 'health' },
      { time: '09:00', activity: 'System-sprint: Wavult OS-arkitektur genomgång', type: 'work' },
      { time: '12:00', activity: 'Lunch + kortpaus', type: 'free' },
      { time: '13:00', activity: 'QuiXzoom-plattformen: roadmap & MVP-scope', type: 'work' },
      { time: '17:00', activity: 'Promenad Bangkok + team-mingel', type: 'social' },
      { time: '20:00', activity: 'Fasta inleds (inför hälsokontroll)', type: 'health' },
    ],
  },
  {
    date: '2026-04-13',
    dayNum: 3,
    label: 'Hälsokontroll Bumrungrad',
    theme: 'BANGKOK',
    color: '#10B981',
    icon: '🏥',
    events: [
      { time: '08:00', activity: 'Bumrungrad International Hospital — gruppankomst', type: 'health' },
      { time: '08:30', activity: 'Full hälsokontroll: blod, hjärta, organ, DNA-analys (5 pers)', type: 'health' },
      { time: '12:00', activity: 'Resultatgenomgång med läkare', type: 'health' },
      { time: '14:00', activity: 'Landvex-strategi workshop: B2G pitchdeck', type: 'work' },
      { time: '18:00', activity: 'Dinner + jubel för hälsodata', type: 'social' },
    ],
    notes: 'Bokningsförfrågan skickad till checkup@bumrungrad.com den 27 mars.',
  },
  {
    date: '2026-04-14',
    dayNum: 4,
    label: 'Bolagsstruktur & Juridik',
    theme: 'BANGKOK',
    color: '#F59E0B',
    icon: '⚖️',
    events: [
      { time: '09:00', activity: 'Dennis: juridik-session — IP-avtal, Texas LLC, DMCC', type: 'work' },
      { time: '11:00', activity: 'Winston: finansiell infrastruktur & Revolut setup', type: 'work' },
      { time: '14:00', activity: 'Erik + Leon: sälj-strategi quiXzoom Sverige launch', type: 'work' },
      { time: '17:00', activity: 'Fri tid Bangkok', type: 'free' },
    ],
  },
  {
    date: '2026-04-15',
    dayNum: 5,
    label: 'Tech Sprint — quiXzoom',
    theme: 'BANGKOK',
    color: '#3B82F6',
    icon: '🚀',
    events: [
      { time: '09:00', activity: 'Johan: quiXzoom API — final sprint', type: 'work' },
      { time: '12:00', activity: 'Deploy & testning i produktion', type: 'work' },
      { time: '15:00', activity: 'Zoomer-onboarding flöde genomgång', type: 'work' },
      { time: '18:00', activity: 'Team-middag: halvtidsfirande', type: 'social' },
    ],
  },
  {
    date: '2026-04-16',
    dayNum: 6,
    label: 'Resa Phuket / Kamala Beach',
    theme: 'PHUKET',
    color: '#8B5CF6',
    icon: '🏖️',
    events: [
      { time: '10:00', activity: 'Flyg Bangkok → Phuket (ca 1h 20min)', type: 'travel' },
      { time: '13:00', activity: 'Incheckning Kamala Beach-huset', type: 'travel' },
      { time: '15:00', activity: 'Beach-paus — swim, relax', type: 'free' },
      { time: '19:00', activity: 'Sunset dinner vid stranden', type: 'social' },
    ],
  },
  {
    date: '2026-04-17',
    dayNum: 7,
    label: 'Kamala Beach — Strategi',
    theme: 'PHUKET',
    color: '#8B5CF6',
    icon: '📊',
    events: [
      { time: '08:00', activity: 'Morgonlöpning längs stranden', type: 'health' },
      { time: '09:30', activity: 'Erik: vision-session — Wavult Group 3-årsplan', type: 'work' },
      { time: '12:00', activity: 'Lunch + pool', type: 'free' },
      { time: '14:00', activity: 'Landvex enterprise-demo walkthrough', type: 'work' },
      { time: '17:00', activity: 'Fri tid', type: 'free' },
    ],
  },
  {
    date: '2026-04-18',
    dayNum: 8,
    label: 'RETREAT DAG 1 — Suan Mokkh',
    theme: 'RETREAT',
    color: '#EC4899',
    icon: '🧘',
    events: [
      { time: '07:00', activity: 'Resa till Suan Mokkh International Dharma Hermitage (2h)', type: 'travel' },
      { time: '10:00', activity: 'Incheckning. Inlämning av mobiltelefoner.', type: 'retreat' },
      { time: '11:00', activity: 'Introduktion: regler, program, buddhistisk filosofi', type: 'retreat' },
      { time: '15:00', activity: 'Sittande meditation + yoga', type: 'retreat' },
      { time: '18:00', activity: 'Aftonbön + tystnad', type: 'retreat' },
    ],
    notes: '📵 MOBILFRITT. Ingen kontakt med omvärlden.',
  },
  {
    date: '2026-04-19',
    dayNum: 9,
    label: 'RETREAT DAG 2 — Djupmeditiation',
    theme: 'RETREAT',
    color: '#EC4899',
    icon: '🕉️',
    events: [
      { time: '03:30', activity: 'Uppstigning — morgonklocka', type: 'retreat' },
      { time: '04:00', activity: 'Sittande meditation + chanting', type: 'retreat' },
      { time: '07:00', activity: 'Alms-round, frukost i tystnad', type: 'retreat' },
      { time: '09:00', activity: 'Dharma-undervisning + gångmeditation', type: 'retreat' },
      { time: '14:00', activity: 'Fri kontemplation i djungeln', type: 'retreat' },
      { time: '18:00', activity: 'Aftonmeditation', type: 'retreat' },
    ],
    notes: '📵 MOBILFRITT. Full tystnad.',
  },
  {
    date: '2026-04-20',
    dayNum: 10,
    label: 'RETREAT DAG 3 — Integration',
    theme: 'RETREAT',
    color: '#EC4899',
    icon: '✨',
    events: [
      { time: '03:30', activity: 'Sista morgonmeditation', type: 'retreat' },
      { time: '09:00', activity: 'Avslutningsceremoni + utcheckning', type: 'retreat' },
      { time: '11:00', activity: 'Mobiler tillbaka. Resa tillbaka till Kamala.', type: 'travel' },
      { time: '15:00', activity: 'Pool + debrief i gruppen: vad tog ni med er?', type: 'social' },
    ],
    notes: 'Återanslutning till världen. Integration av retreat-upplevelsen.',
  },
  {
    date: '2026-04-21',
    dayNum: 11,
    label: 'Sprint-avslutning & Nästa steg',
    theme: 'PHUKET',
    color: '#8B5CF6',
    icon: '🎯',
    events: [
      { time: '09:00', activity: 'Wavult OS final review — vad är klart, vad återstår', type: 'work' },
      { time: '12:00', activity: 'Lunch-celebration', type: 'social' },
      { time: '14:00', activity: 'QuiXzoom Sverige-launch: datum låst, campaign satt', type: 'work' },
      { time: '17:00', activity: 'Sista solnedgång vid Kamala Beach', type: 'free' },
      { time: '20:00', activity: 'Avslutningsdinner — Thailand Workcamp v1 avklarat', type: 'social' },
    ],
  },
]

const THEME_COLORS: Record<string, string> = {
  BANGKOK: '#3B82F6',
  PHUKET: '#8B5CF6',
  RETREAT: '#EC4899',
}

export function ThailandCalendarView() {
  const [selectedDay, setSelectedDay] = useState<DayProgram | null>(PROGRAM[0])
  const [activeTheme, setActiveTheme] = useState<string>('all')

  const filtered = activeTheme === 'all' ? PROGRAM : PROGRAM.filter(d => d.theme === activeTheme)
  const today = new Date()
  const daysToStart = Math.ceil((new Date('2026-04-11').getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">🇹🇭 Thailand Workcamp — April 2026</h1>
          <p className="text-gray-400 text-sm mt-1">Fullständigt program: Bangkok → Phuket → Retreat → Launch</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-signal-amber tabular-nums">{daysToStart}</div>
          <div className="text-xs text-gray-500">dagar kvar</div>
        </div>
      </div>

      {/* Theme filter */}
      <div className="flex gap-2">
        {['all', 'BANGKOK', 'PHUKET', 'RETREAT'].map(t => (
          <button
            key={t}
            onClick={() => setActiveTheme(t)}
            className="text-xs px-3 py-1.5 rounded-lg border transition-colors font-mono"
            style={activeTheme === t
              ? { background: (THEME_COLORS[t] ?? '#ffffff') + '20', color: THEME_COLORS[t] ?? '#fff', borderColor: (THEME_COLORS[t] ?? '#ffffff') + '40' }
              : { background: 'transparent', color: '#4B5563', borderColor: '#ffffff0a' }
            }
          >
            {t === 'all' ? '📅 Alla' : t === 'BANGKOK' ? '🏙️ Bangkok' : t === 'PHUKET' ? '🏖️ Phuket' : '🧘 Retreat'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Day list */}
        <div className="space-y-2">
          {filtered.map(day => (
            <button
              key={day.date}
              onClick={() => setSelectedDay(day)}
              className="w-full text-left rounded-xl p-3 border transition-all"
              style={{
                background: selectedDay?.date === day.date ? day.color + '15' : 'rgba(255,255,255,0.03)',
                borderColor: selectedDay?.date === day.date ? day.color + '40' : 'rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{day.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">Dag {day.dayNum}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                      style={{ background: THEME_COLORS[day.theme] + '20', color: THEME_COLORS[day.theme] }}>
                      {day.theme}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{day.label}</p>
                  <p className="text-[9px] text-gray-600 font-mono mt-0.5">
                    {new Date(day.date).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Day detail */}
        {selectedDay && (
          <div className="lg:col-span-2 bg-surface-raised border border-surface-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-surface-border"
              style={{ background: selectedDay.color + '10' }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedDay.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">Dag {selectedDay.dayNum} — {selectedDay.label}</h2>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                      style={{ background: THEME_COLORS[selectedDay.theme] + '20', color: THEME_COLORS[selectedDay.theme] }}>
                      {selectedDay.theme}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    {new Date(selectedDay.date).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              {selectedDay.notes && (
                <div className="mt-3 text-xs text-gray-400 px-3 py-2 rounded-lg"
                  style={{ background: selectedDay.color + '08', border: `1px solid ${selectedDay.color}20` }}>
                  {selectedDay.notes}
                </div>
              )}
            </div>

            {/* Events */}
            <div className="divide-y divide-white/[0.04]">
              {selectedDay.events.map((evt, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3">
                  <div className="flex-shrink-0 w-14 text-right">
                    <span className="text-xs font-mono text-gray-600">{evt.time}</span>
                  </div>
                  <div
                    className="h-4 w-0.5 rounded-full flex-shrink-0 mt-0.5"
                    style={{ background: TYPE_COLORS[evt.type] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{evt.activity}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span>{TYPE_ICONS[evt.type]}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                      style={{ background: TYPE_COLORS[evt.type] + '20', color: TYPE_COLORS[evt.type] }}>
                      {evt.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Work-dagar', value: PROGRAM.filter(d => d.events.some(e => e.type === 'work')).length, color: '#3B82F6', icon: '💻' },
          { label: 'Retreat-dagar', value: PROGRAM.filter(d => d.theme === 'RETREAT').length, color: '#EC4899', icon: '🧘' },
          { label: 'Hälsoaktiviteter', value: PROGRAM.flatMap(d => d.events).filter(e => e.type === 'health').length, color: '#10B981', icon: '🏥' },
          { label: 'Sociala event', value: PROGRAM.flatMap(d => d.events).filter(e => e.type === 'social').length, color: '#F59E0B', icon: '🎉' },
        ].map(s => (
          <div key={s.label} className="bg-surface-raised border border-surface-border rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
