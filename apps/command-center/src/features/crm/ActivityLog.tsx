import { useState } from 'react'
import {
  ACTIVITIES,
  ACTIVITY_ICONS,
  TEAM_COLORS,
  PROSPECTS,
  type Activity,
  type ActivityType,
  type TeamMember,
} from './data'

const ACTIVITY_TYPES: ActivityType[] = ['Samtal', 'Email', 'Möte', 'Demo', 'Offert skickad', 'Follow-up']
const TEAM_MEMBERS: TeamMember[] = ['Leon', 'Dennis', 'Erik']

export function ActivityLog() {
  const [activities, setActivities] = useState<Activity[]>(
    [...ACTIVITIES].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  )
  const [filter, setFilter] = useState<ActivityType | 'Alla'>('Alla')
  const [byFilter, setByFilter] = useState<TeamMember | 'Alla'>('Alla')
  const [showForm, setShowForm] = useState(false)

  // New activity form state
  const [formType, setFormType] = useState<ActivityType>('Samtal')
  const [formProspect, setFormProspect] = useState(PROSPECTS[0].id)
  const [formBy, setFormBy] = useState<TeamMember>('Leon')
  const [formNote, setFormNote] = useState('')

  const filtered = activities.filter(a => {
    const matchType = filter === 'Alla' || a.type === filter
    const matchBy = byFilter === 'Alla' || a.by === byFilter
    return matchType && matchBy
  })

  function logActivity() {
    if (!formNote.trim()) return
    const prospect = PROSPECTS.find(p => p.id === formProspect)!
    const newActivity: Activity = {
      id: `a${Date.now()}`,
      type: formType,
      prospectId: formProspect,
      company: prospect.company,
      by: formBy,
      date: new Date().toISOString(),
      note: formNote,
    }
    setActivities(prev => [newActivity, ...prev])
    setFormNote('')
    setShowForm(false)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Aktivitetslogg</h2>
          <p className="text-sm text-gray-400 mt-0.5">{activities.length} aktiviteter loggade</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="text-sm px-4 py-2 rounded-lg bg-brand-accent/10 border border-brand-accent/30 text-brand-accent hover:bg-brand-accent/20 transition-colors font-medium"
        >
          + Logga aktivitet
        </button>
      </div>

      {/* New activity form */}
      {showForm && (
        <div className="bg-surface-raised border border-surface-border rounded-xl p-4 space-y-4">
          <p className="text-sm font-semibold text-white">Ny aktivitet</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Typ</label>
              <select
                value={formType}
                onChange={e => setFormType(e.target.value as ActivityType)}
                className="w-full bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none appearance-none"
              >
                {ACTIVITY_TYPES.map(t => (
                  <option key={t} value={t}>{ACTIVITY_ICONS[t]} {t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Prospect</label>
              <select
                value={formProspect}
                onChange={e => setFormProspect(e.target.value)}
                className="w-full bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none appearance-none"
              >
                {PROSPECTS.map(p => (
                  <option key={p.id} value={p.id}>{p.company}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Utförd av</label>
              <select
                value={formBy}
                onChange={e => setFormBy(e.target.value as TeamMember)}
                className="w-full bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none appearance-none"
              >
                {TEAM_MEMBERS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Anteckning</label>
            <textarea
              value={formNote}
              onChange={e => setFormNote(e.target.value)}
              placeholder="Vad hände? Vad bestämdes?"
              rows={3}
              className="w-full bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={logActivity}
              disabled={!formNote.trim()}
              className="text-sm px-4 py-2 rounded-lg bg-brand-accent text-white hover:opacity-90 transition-opacity font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Logga
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm px-4 py-2 rounded-lg bg-surface-overlay border border-surface-border text-gray-400 hover:text-white transition-colors"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('Alla')}
          className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
            filter === 'Alla'
              ? 'bg-brand-accent/10 text-brand-accent font-medium'
              : 'bg-surface-raised border border-surface-border text-gray-400 hover:text-white'
          }`}
        >
          Alla typer
        </button>
        {ACTIVITY_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setFilter(prev => prev === t ? 'Alla' : t)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              filter === t
                ? 'bg-brand-accent/10 text-brand-accent font-medium'
                : 'bg-surface-raised border border-surface-border text-gray-400 hover:text-white'
            }`}
          >
            {ACTIVITY_ICONS[t]} {t}
          </button>
        ))}
        <div className="w-px bg-surface-border mx-1" />
        {(['Alla', ...TEAM_MEMBERS] as const).map(m => (
          <button
            key={m}
            onClick={() => setByFilter(m as TeamMember | 'Alla')}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors`}
            style={
              byFilter === m && m !== 'Alla'
                ? { background: TEAM_COLORS[m as TeamMember] + '20', color: TEAM_COLORS[m as TeamMember], border: `1px solid ${TEAM_COLORS[m as TeamMember]}40` }
                : byFilter === m
                ? { background: '#374151', border: '1px solid #4B5563', color: 'white' }
                : { background: 'transparent', border: '1px solid rgba(55,65,81,0.6)', color: '#6B7280' }
            }
          >
            {m}
          </button>
        ))}
      </div>

      {/* Log */}
      <div className="space-y-2">
        {filtered.map(a => (
          <div
            key={a.id}
            className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3 flex gap-3 hover:border-white/10 transition-colors"
          >
            <div className="text-xl leading-none mt-0.5 flex-shrink-0">{ACTIVITY_ICONS[a.type]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-white">{a.type}</span>
                <span className="text-xs text-gray-600">·</span>
                <span className="text-xs text-gray-400">{a.company}</span>
                <span className="text-xs text-gray-600">·</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: TEAM_COLORS[a.by] + '20', color: TEAM_COLORS[a.by] }}
                >
                  {a.by}
                </span>
                <span className="text-xs text-gray-600 ml-auto flex-shrink-0">
                  {new Date(a.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}
                  {new Date(a.date).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1 leading-relaxed">{a.note}</p>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-600 text-sm">
            Inga aktiviteter matchar filter
          </div>
        )}
      </div>
    </div>
  )
}
