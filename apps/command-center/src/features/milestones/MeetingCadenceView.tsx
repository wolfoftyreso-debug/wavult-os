// ─── Wavult Group — Möteshierarki View ─────────────────────────────────────────
// Pyramid-stil hierarki: Nivå 1 (Vision) längst upp → Nivå 6 (Incident) längst ned
// Mörkt tema, expandera möte för att se agenda och output

import { useState } from 'react'
import { MEETING_CADENCE, LEVEL_META, type MeetingCadence } from './meetingCadence'

// ─── MeetingCard ──────────────────────────────────────────────────────────────

function MeetingCard({ meeting }: { meeting: MeetingCadence }) {
  const [expanded, setExpanded] = useState(false)
  const meta = LEVEL_META.find(m => m.level === meeting.level)!

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${meta.bgColor} cursor-pointer`}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-3">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-base leading-none mt-0.5 flex-shrink-0">{meta.icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-semibold ${meta.color}`}>{meeting.name}</span>
              {meeting.automate && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                  BERNT
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[11px] text-gray-500">{meeting.frequency}</span>
              <span className="text-[11px] text-gray-600">·</span>
              <span className="text-[11px] text-gray-500">{meeting.duration}</span>
              {meeting.time && (
                <>
                  <span className="text-[11px] text-gray-600">·</span>
                  <span className="text-[11px] text-gray-400 font-mono">{meeting.time}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <span className={`text-gray-500 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div
          className="border-t border-white/[0.06] p-3 space-y-3"
          onClick={e => e.stopPropagation()}
        >
          {/* Deltagare */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">👥 Deltagare</p>
            <div className="flex flex-wrap gap-1">
              {meeting.participants.map(p => (
                <span key={p} className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-gray-300 border border-white/[0.08]">
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Agenda */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">📋 Agenda</p>
            <ul className="space-y-0.5">
              {meeting.agenda.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[12px] text-gray-300">
                  <span className={`mt-0.5 flex-shrink-0 text-[8px] ${meta.color}`}>●</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Output */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">✅ Output</p>
            <ul className="space-y-0.5">
              {meeting.output.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[12px] text-gray-300">
                  <span className="mt-0.5 flex-shrink-0 text-emerald-500 text-[8px]">●</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Verktyg */}
          {meeting.tools && meeting.tools.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">🛠 Verktyg</p>
              <div className="flex flex-wrap gap-1">
                {meeting.tools.map(t => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.04] text-gray-400 border border-white/[0.06] font-mono">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── LevelSection ─────────────────────────────────────────────────────────────

function LevelSection({ level }: { level: (typeof LEVEL_META)[0] }) {
  const meetings = MEETING_CADENCE.filter(m => m.level === level.level)

  // Pyramid: nivå 1 bred, nivå 6 smalare — simulera med max-width
  const maxWidths: Record<number, string> = {
    1: 'max-w-4xl',
    2: 'max-w-3xl',
    3: 'max-w-2xl',
    4: 'max-w-3xl',  // Nivå 4 har 3 möten, behöver lite mer plats
    5: 'max-w-2xl',
    6: 'max-w-3xl',
  }

  return (
    <div className={`w-full mx-auto ${maxWidths[level.level] ?? 'max-w-3xl'}`}>
      {/* Nivå-header */}
      <div className="flex items-center gap-3 mb-2">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${level.bgColor} ${level.color}`}>
          <span>{level.icon}</span>
          <span>Nivå {level.level} — {level.label}</span>
        </div>
        <div className="flex-1 h-px bg-white/[0.05]" />
        <span className="text-[11px] text-gray-600">{level.description}</span>
      </div>

      {/* Möten */}
      <div className={`grid gap-2 ${meetings.length > 1 ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {meetings.map(m => (
          <MeetingCard key={m.id} meeting={m} />
        ))}
      </div>
    </div>
  )
}

// ─── Pyramid visual connector ─────────────────────────────────────────────────

function LevelConnector() {
  return (
    <div className="flex justify-center py-1">
      <div className="w-px h-6 bg-gradient-to-b from-white/10 to-white/[0.03]" />
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex items-center gap-4 flex-wrap text-[11px] text-gray-500">
      <span className="flex items-center gap-1.5">
        <span className="text-[8px] text-emerald-400">●</span>
        <span className="text-emerald-400 font-bold">BERNT</span>
        = automatiserad av Bernt
      </span>
      <span className="flex items-center gap-1.5">
        <span>▾</span>
        Klicka på ett möte för att expandera agenda och output
      </span>
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function MeetingCadenceView() {
  const totalMeetings = MEETING_CADENCE.length
  const automatedCount = MEETING_CADENCE.filter(m => m.automate).length

  return (
    <div className="min-h-full bg-[#07080F] text-white">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-xl">🗓️</span>
            <div>
              <h1 className="text-[16px] font-bold text-white">Möteshierarki</h1>
              <p className="text-xs text-gray-600 font-mono">
                Wavult Group — OKR · EOS · Agile · {totalMeetings} möten definierade
              </p>
            </div>
          </div>
          {/* Stats */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-center">
              <div className="text-lg font-bold text-white">{totalMeetings}</div>
              <div className="text-[10px] text-gray-500">Mötestyper</div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
              <div className="text-lg font-bold text-emerald-400">{automatedCount}</div>
              <div className="text-[10px] text-gray-500">Bernt hanterar</div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
              <div className="text-lg font-bold text-purple-400">6</div>
              <div className="text-[10px] text-gray-500">Nivåer</div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 md:px-6 py-2 border-b border-white/[0.04] bg-white/[0.01]">
        <Legend />
      </div>

      {/* Pyramid hierarki */}
      <div className="px-4 md:px-6 py-6 space-y-1">
        {/* Pyramid-topp label */}
        <div className="text-center mb-4">
          <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
            ▲ Vision &amp; Strategi — Nivå 1
          </span>
        </div>

        {LEVEL_META.map((level, idx) => (
          <div key={level.level}>
            <LevelSection level={level} />
            {idx < LEVEL_META.length - 1 && <LevelConnector />}
          </div>
        ))}

        {/* Pyramid-botten label */}
        <div className="text-center mt-4">
          <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
            ▼ Incident &amp; Eskalering — Nivå 6
          </span>
        </div>
      </div>

      {/* Footer info */}
      <div className="px-4 md:px-6 py-4 border-t border-white/[0.06] mt-4">
        <p className="text-[11px] text-gray-600 text-center">
          Möteshierarkin följer EOS (Entrepreneurial Operating System) + OKR-metodologi.
          Bernt hanterar Morning Brief (08:00), WHOOP-check och automatiserade rapporter.
        </p>
      </div>
    </div>
  )
}
