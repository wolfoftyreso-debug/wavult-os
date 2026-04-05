import { useState } from 'react'
import { useTranslation } from '../../shared/i18n/useTranslation'
import { useCorpBoardMeetings, useCorpEntities } from './hooks/useCorporate'
import type { CorpBoardMeeting, CorpEntity } from '../../lib/supabase'

type MeetingType = CorpBoardMeeting['type']
type MeetingStatus = CorpBoardMeeting['status']

const STATUS_STYLES: Record<MeetingStatus, string> = {
  'planerat':        'bg-[#E8B84B]/15 text-[#B8760A] border-[#E8B84B]/30',
  'genomfört':       'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  'protokoll klart': 'bg-green-500/15 text-green-700 border-green-500/30',
}

const TYPE_ICONS: Record<MeetingType, string> = {
  'styrelsemöte':       '🏛️',
  'extra styrelsemöte': '⚡',
  'skriftligt beslut':  '📝',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' })
}

function MeetingDetail({ meeting, company, onClose }: {
  meeting: CorpBoardMeeting
  company?: CorpEntity
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm p-4">
      <div className="bg-white border border-surface-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-surface-border flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{TYPE_ICONS[meeting.type]}</span>
              <h2 className="text-[15px] font-bold text-text-primary capitalize">{meeting.type}</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded border capitalize ${STATUS_STYLES[meeting.status]}`}>
                {meeting.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-9000">
              {company && (
                <>
                  <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: company.color }} />
                  <span style={{ color: company.color }}>{company.name}</span>
                  <span>·</span>
                </>
              )}
              <span>{formatDate(meeting.date)}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-9000 hover:text-text-primary text-xl leading-none mt-0.5">×</button>
        </div>
        <div className="p-6 space-y-5">
          {meeting.agenda.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-9000 uppercase tracking-wider mb-2">Dagordning</h3>
              <ul className="space-y-1.5">
                {meeting.agenda.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-gray-9000 font-mono mt-0.5 flex-shrink-0">{i + 1}.</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {meeting.decisions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-9000 uppercase tracking-wider mb-2">Beslut</h3>
              <ul className="space-y-2">
                {meeting.decisions.map((dec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                    <span className="text-green-700 mt-0.5 flex-shrink-0">✓</span>
                    {dec}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-9000 uppercase tracking-wider mb-1.5">Deltagare</h3>
              <ul className="space-y-1">
                {meeting.attendees.map(a => (
                  <li key={a} className="text-xs text-gray-600 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
                    {a}
                    {a === meeting.chairperson && <span className="text-[9px] text-yellow-700/80 font-mono ml-1">ordf.</span>}
                    {a === meeting.minutes_taker && <span className="text-[9px] text-[#0A3D62]/80 font-mono ml-1">sekreterare</span>}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-9000 uppercase tracking-wider mb-1.5">Info</h3>
              <div className="space-y-1 text-xs text-gray-9000">
                <div><span className="text-gray-9000">Ordförande:</span> {meeting.chairperson}</div>
                {meeting.minutes_taker && <div><span className="text-gray-9000">Sekreterare:</span> {meeting.minutes_taker}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const EMPTY_FORM = {
  companyId: '',
  type: 'styrelsemöte' as MeetingType,
  date: '',
  agenda: '',
  decisions: '',
}

export function BoardView() {
  const { t: _t } = useTranslation()
  const [selected, setSelected] = useState<CorpBoardMeeting | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filterCompany, setFilterCompany] = useState<string>('all')
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: meetings = [], isLoading: meetingsLoading, isError: meetingsError } = useCorpBoardMeetings()
  const { data: entities = [], isLoading: entitiesLoading } = useCorpEntities()

  const isLoading = meetingsLoading || entitiesLoading

  const filtered = meetings
    .filter(m => filterCompany === 'all' || m.company_id === filterCompany)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const counts = {
    total: meetings.length,
    planerat: meetings.filter(m => m.status === 'planerat').length,
    klar: meetings.filter(m => m.status === 'protokoll klart').length,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-9000 text-xs">
        Laddar styrelsemöten...
      </div>
    )
  }

  if (meetingsError) {
    return (
      <div className="flex items-center justify-center h-40 text-red-500 text-xs">
        Fel vid hämtning av styrelsemöten
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Totalt', value: counts.total, dotColor: '#6B7280' },
          { label: 'Planerade', value: counts.planerat, dotColor: '#E8B84B' },
          { label: 'Protokoll klart', value: counts.klar, dotColor: '#22C55E' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EDE8DC] border border-surface-border text-xs">
            <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: s.dotColor }} />
            <span className="text-gray-9000">{s.label}:</span>
            <span className="text-text-primary font-semibold">{s.value}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <select
            value={filterCompany}
            onChange={e => setFilterCompany(e.target.value)}
            className="text-xs bg-white border border-surface-border rounded-lg px-2.5 py-1.5 text-gray-9000 focus:outline-none"
          >
            <option value="all">Alla bolag</option>
            {entities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A3D62] text-white text-xs font-bold hover:bg-[#072E4A] transition-colors"
          >
            + Nytt beslut
          </button>
        </div>
      </div>

      {/* Table */}
      {meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#F5F0E8] flex items-center justify-center mb-4">
            <span className="text-3xl">🏛️</span>
          </div>
          <h3 className="text-sm font-bold text-[#0A3D62] mb-2">Inga styrelsemöten än</h3>
          <p className="text-xs text-gray-500 max-w-xs mb-4">
            Planera ert första styrelsemöte för att börja dokumentera beslut och protokoll.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[#0A3D62] text-white text-xs font-bold rounded-lg hover:bg-[#072E4A]"
          >
            + Planera styrelsemöte
          </button>
        </div>
      ) : (
      <div className="rounded-xl border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[560px]">
            <thead>
              <tr className="border-b border-surface-border bg-[#EDE8DC]">
                <th className="text-left px-4 py-2.5 text-gray-9000 font-medium">Datum</th>
                <th className="text-left px-4 py-2.5 text-gray-9000 font-medium">Bolag</th>
                <th className="text-left px-4 py-2.5 text-gray-9000 font-medium">Typ</th>
                <th className="text-left px-4 py-2.5 text-gray-9000 font-medium">Ärenden</th>
                <th className="text-left px-4 py-2.5 text-gray-9000 font-medium">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => {
                const company = entities.find(c => c.id === m.company_id)
                return (
                  <tr
                    key={m.id}
                    className={`border-b border-surface-border/50 cursor-pointer hover:bg-[#EDE8DC] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                    onClick={() => setSelected(m)}
                  >
                    <td className="px-4 py-3 text-gray-9000 whitespace-nowrap">{formatDate(m.date)}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: company?.color ?? '#6B7280' }} />
                        <span style={{ color: company?.color ?? '#6B7280' }}>{company?.short_name ?? m.company_id}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <span>{TYPE_ICONS[m.type]}</span>
                        <span className="capitalize">{m.type}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-9000 max-w-[240px] truncate">
                      {m.agenda.join(', ')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded border capitalize ${STATUS_STYLES[m.status]}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-9000 text-right">→</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Detail modal */}
      {selected && (
        <MeetingDetail
          meeting={selected}
          company={entities.find(c => c.id === selected.company_id)}
          onClose={() => setSelected(null)}
        />
      )}

      {/* New decision form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-surface-border rounded-xl w-full max-w-lg">
            <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-text-primary">Skapa nytt beslut</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-9000 hover:text-text-primary text-xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-9000 block mb-1">Bolag</label>
                  <select
                    value={form.companyId}
                    onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))}
                    className="w-full text-xs bg-[#EDE8DC] border border-surface-border rounded-lg px-3 py-2 text-text-primary focus:outline-none"
                  >
                    <option value="">Välj bolag...</option>
                    {entities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-9000 block mb-1">Typ</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as MeetingType }))}
                    className="w-full text-xs bg-[#EDE8DC] border border-surface-border rounded-lg px-3 py-2 text-text-primary focus:outline-none"
                  >
                    <option value="styrelsemöte">Styrelsemöte</option>
                    <option value="extra styrelsemöte">Extra styrelsemöte</option>
                    <option value="skriftligt beslut">Skriftligt beslut</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-9000 block mb-1">Datum</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full text-xs bg-[#EDE8DC] border border-surface-border rounded-lg px-3 py-2 text-text-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-9000 block mb-1">Ärenden (en per rad)</label>
                <textarea
                  rows={3}
                  value={form.agenda}
                  onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))}
                  placeholder="Godkännande av budget&#10;Rekrytering av CTO"
                  className="w-full text-xs bg-[#EDE8DC] border border-surface-border rounded-lg px-3 py-2 text-text-primary focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-9000 block mb-1">Beslut (en per rad)</label>
                <textarea
                  rows={3}
                  value={form.decisions}
                  onChange={e => setForm(f => ({ ...f, decisions: e.target.value }))}
                  placeholder="Budget om X kr godkänd.&#10;CTO-rekrytering inleds."
                  className="w-full text-xs bg-[#EDE8DC] border border-surface-border rounded-lg px-3 py-2 text-text-primary focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-surface-border flex justify-end gap-2">
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }} className="px-4 py-2 text-xs text-gray-9000 hover:text-text-primary transition-colors">Avbryt</button>
              <button
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                className="px-4 py-2 text-xs bg-[#0A3D62] text-white font-bold rounded-lg hover:bg-[#072E4A] transition-colors"
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
