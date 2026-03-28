import { useState } from 'react'
import { BOARD_MEETINGS, COMPANIES, BoardMeeting, MeetingType, MeetingStatus, CompanyId } from './data'

const STATUS_STYLES: Record<MeetingStatus, string> = {
  'planerat':        'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'genomfört':       'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'protokoll klart': 'bg-green-500/15 text-green-400 border-green-500/30',
}

const TYPE_ICONS: Record<MeetingType, string> = {
  'styrelsemöte':       '🏛️',
  'extra styrelsemöte': '⚡',
  'skriftligt beslut':  '📝',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' })
}

function MeetingDetail({ meeting, onClose }: { meeting: BoardMeeting; onClose: () => void }) {
  const company = COMPANIES.find(c => c.id === meeting.companyId)!
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0D0F1A] border border-white/[0.08] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{TYPE_ICONS[meeting.type]}</span>
              <h2 className="text-[15px] font-bold text-white capitalize">{meeting.type}</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded border capitalize ${STATUS_STYLES[meeting.status]}`}>
                {meeting.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: company.color }} />
              <span style={{ color: company.color }}>{company.name}</span>
              <span>·</span>
              <span>{formatDate(meeting.date)}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white text-xl leading-none mt-0.5">×</button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Dagordning</h3>
            <ul className="space-y-1.5">
              {meeting.agenda.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-gray-600 font-mono mt-0.5 flex-shrink-0">{i + 1}.</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {meeting.decisions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Beslut</h3>
              <ul className="space-y-2">
                {meeting.decisions.map((dec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-200">
                    <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
                    {dec}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Deltagare</h3>
              <ul className="space-y-1">
                {meeting.attendees.map(a => (
                  <li key={a} className="text-xs text-gray-300 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
                    {a}
                    {a === meeting.chairperson && <span className="text-[9px] text-yellow-400/80 font-mono ml-1">ordf.</span>}
                    {a === meeting.minutesTaker && <span className="text-[9px] text-blue-400/80 font-mono ml-1">sekreterare</span>}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Info</h3>
              <div className="space-y-1 text-xs text-gray-400">
                <div><span className="text-gray-600">Ordförande:</span> {meeting.chairperson}</div>
                {meeting.minutesTaker && <div><span className="text-gray-600">Sekreterare:</span> {meeting.minutesTaker}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface NewMeetingForm {
  companyId: CompanyId
  type: MeetingType
  date: string
  agenda: string
  decisions: string
}

const EMPTY_FORM: NewMeetingForm = {
  companyId: 'wavult-group',
  type: 'styrelsemöte',
  date: '',
  agenda: '',
  decisions: '',
}

export function BoardView() {
  const [selected, setSelected] = useState<BoardMeeting | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filterCompany, setFilterCompany] = useState<CompanyId | 'all'>('all')
  const [form, setForm] = useState<NewMeetingForm>(EMPTY_FORM)

  const filtered = BOARD_MEETINGS
    .filter(m => filterCompany === 'all' || m.companyId === filterCompany)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const counts = {
    total: BOARD_MEETINGS.length,
    planerat: BOARD_MEETINGS.filter(m => m.status === 'planerat').length,
    klar: BOARD_MEETINGS.filter(m => m.status === 'protokoll klart').length,
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Totalt', value: counts.total, color: 'bg-gray-400' },
          { label: 'Planerade', value: counts.planerat, color: 'bg-blue-400' },
          { label: 'Protokoll klart', value: counts.klar, color: 'bg-green-400' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs">
            <span className={`h-1.5 w-1.5 rounded-full ${s.color}`} />
            <span className="text-gray-500">{s.label}:</span>
            <span className="text-white font-semibold">{s.value}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <select
            value={filterCompany}
            onChange={e => setFilterCompany(e.target.value as CompanyId | 'all')}
            className="text-xs bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-gray-400 focus:outline-none"
          >
            <option value="all">Alla bolag</option>
            {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-accent/15 border border-brand-accent/30 text-brand-accent text-xs font-medium hover:bg-brand-accent/25 transition-colors"
          >
            + Nytt beslut
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[560px]">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Datum</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Bolag</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Typ</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Ärenden</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, i) => {
              const company = COMPANIES.find(c => c.id === m.companyId)!
              return (
                <tr
                  key={m.id}
                  className={`border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.03] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                  onClick={() => setSelected(m)}
                >
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(m.date)}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: company.color }} />
                      <span style={{ color: company.color }}>{company.shortName}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <span>{TYPE_ICONS[m.type]}</span>
                      <span className="capitalize">{m.type}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[240px] truncate">
                    {m.agenda.join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded border capitalize ${STATUS_STYLES[m.status]}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-right">→</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>{/* /overflow-x-auto */}
      </div>

      {/* Detail modal */}
      {selected && <MeetingDetail meeting={selected} onClose={() => setSelected(null)} />}

      {/* New decision form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0D0F1A] border border-white/[0.08] rounded-xl w-full max-w-lg">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-white">Skapa nytt beslut</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-600 hover:text-white text-xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Bolag</label>
                  <select
                    value={form.companyId}
                    onChange={e => setForm(f => ({ ...f, companyId: e.target.value as CompanyId }))}
                    className="w-full text-xs bg-[#07080F] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-accent/50"
                  >
                    {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Typ</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as MeetingType }))}
                    className="w-full text-xs bg-[#07080F] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-accent/50"
                  >
                    <option value="styrelsemöte">Styrelsemöte</option>
                    <option value="extra styrelsemöte">Extra styrelsemöte</option>
                    <option value="skriftligt beslut">Skriftligt beslut</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Datum</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full text-xs bg-[#07080F] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-accent/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Ärenden (en per rad)</label>
                <textarea
                  rows={3}
                  value={form.agenda}
                  onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))}
                  placeholder="Godkännande av budget&#10;Rekrytering av CTO"
                  className="w-full text-xs bg-[#07080F] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-accent/50 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Beslut (en per rad)</label>
                <textarea
                  rows={3}
                  value={form.decisions}
                  onChange={e => setForm(f => ({ ...f, decisions: e.target.value }))}
                  placeholder="Budget om X kr godkänd.&#10;CTO-rekrytering inleds."
                  className="w-full text-xs bg-[#07080F] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-accent/50 resize-none"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-white/[0.06] flex justify-end gap-2">
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }} className="px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors">Avbryt</button>
              <button
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                className="px-4 py-2 text-xs bg-brand-accent/15 border border-brand-accent/30 text-brand-accent rounded-lg hover:bg-brand-accent/25 transition-colors"
              >
                Spara beslut
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
