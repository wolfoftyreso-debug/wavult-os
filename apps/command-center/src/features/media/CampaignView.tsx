import { useState } from 'react'
import type { Campaign } from './types'
import { MOCK_CAMPAIGNS, MOCK_BUDGET_ALLOCATIONS, MOCK_CHANNELS } from './mockData'

const OBJECTIVE_LABELS: Record<Campaign['objective'], string> = {
  awareness: 'Awareness',
  conversion: 'Conversion',
  retention: 'Retention',
  leads: 'Leads',
}

const STATUS_COLORS: Record<Campaign['status'], string> = {
  draft: 'bg-white/[0.06] text-gray-400 border border-white/10',
  active: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  paused: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  completed: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  archived: 'bg-white/[0.04] text-gray-600 border border-white/[0.06]',
}

const STATUS_DOT: Record<Campaign['status'], string> = {
  draft: 'bg-gray-500',
  active: 'bg-emerald-400',
  paused: 'bg-amber-400',
  completed: 'bg-blue-400',
  archived: 'bg-gray-700',
}

const GEO_SCOPE_LABELS: Record<Campaign['geo_scope'], string> = {
  local: 'Lokalt',
  national: 'Nationellt',
  global: 'Globalt',
}

function NewCampaignModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: '',
    objective: 'awareness' as Campaign['objective'],
    geo_scope: 'national' as Campaign['geo_scope'],
    budget_total: '',
    currency: 'SEK',
    start_date: '',
    end_date: '',
  })

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D0F1A] border border-white/10 rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold">Ny kampanj</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Kampanjnamn</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="t.ex. Landvex Höst 2026"
              className="w-full bg-[#070912] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-accent/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Mål</label>
              <select
                value={form.objective}
                onChange={e => setForm({ ...form, objective: e.target.value as Campaign['objective'] })}
                className="w-full bg-[#070912] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="awareness">Awareness</option>
                <option value="conversion">Conversion</option>
                <option value="retention">Retention</option>
                <option value="leads">Leads</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Geografisk räckvidd</label>
              <select
                value={form.geo_scope}
                onChange={e => setForm({ ...form, geo_scope: e.target.value as Campaign['geo_scope'] })}
                className="w-full bg-[#070912] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="local">Lokalt</option>
                <option value="national">Nationellt</option>
                <option value="global">Globalt</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Budget (totalt)</label>
              <input
                type="number"
                value={form.budget_total}
                onChange={e => setForm({ ...form, budget_total: e.target.value })}
                placeholder="50000"
                className="w-full bg-[#070912] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Valuta</label>
              <select
                value={form.currency}
                onChange={e => setForm({ ...form, currency: e.target.value })}
                className="w-full bg-[#070912] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="SEK">SEK</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="THB">THB</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Startdatum</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
                className="w-full bg-[#070912] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Slutdatum</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
                className="w-full bg-[#070912] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-lg bg-blue-950/40 border border-blue-500/20 px-4 py-3 text-xs text-blue-300">
            ℹ️ Fas 1 — Manuell drift. Integrationer aktiveras i Fas 2.
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Avbryt</button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-brand-accent/20 text-brand-accent border border-brand-accent/30 rounded-lg hover:bg-brand-accent/30 transition-colors"
          >
            Spara kampanj
          </button>
        </div>
      </div>
    </div>
  )
}

function CampaignDetail({ campaign, onBack }: { campaign: Campaign; onBack: () => void }) {
  const allocations = MOCK_BUDGET_ALLOCATIONS.filter(a => a.campaign_id === campaign.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-500 hover:text-white text-sm transition-colors">← Tillbaka</button>
        <span className="text-gray-700">/</span>
        <span className="text-white font-medium">{campaign.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${STATUS_COLORS[campaign.status]}`}>
          {campaign.status}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Budget', value: `${campaign.budget_total.toLocaleString()} ${campaign.currency}` },
          { label: 'Spend', value: '0 ' + campaign.currency },
          { label: 'ROI', value: '—' },
          { label: 'Mål', value: OBJECTIVE_LABELS[campaign.objective] },
        ].map(stat => (
          <div key={stat.label} className="bg-[#0D0F1A] border border-white/10 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
            <div className="text-xl font-mono text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#0D0F1A] border border-white/10 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Kanal-allokering</h3>
        {allocations.length === 0 ? (
          <p className="text-sm text-gray-600">Inga kanalallokationer konfigurerade.</p>
        ) : (
          <div className="space-y-2">
            {allocations.map(alloc => {
              const ch = MOCK_CHANNELS.find(c => c.id === alloc.channel_id)
              return (
                <div key={alloc.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-gray-300">{ch?.provider ?? alloc.channel_id}</span>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span>Budget: 0 {campaign.currency}/dag</span>
                    <span>Spend: 0</span>
                    <span>Score: —</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-lg bg-blue-950/40 border border-blue-500/20 px-4 py-3 text-xs text-blue-300">
        ℹ️ Fas 1 — Manuell drift. Integrationer aktiveras i Fas 2. Spend och ROI uppdateras manuellt.
      </div>
    </div>
  )
}

export function CampaignView() {
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<Campaign | null>(null)

  if (selected) {
    return <CampaignDetail campaign={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">Kampanjer</h2>
          <p className="text-xs text-gray-500 mt-0.5">{MOCK_CAMPAIGNS.length} kampanjer totalt</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 text-sm bg-brand-accent/20 text-brand-accent border border-brand-accent/30 rounded-lg hover:bg-brand-accent/30 transition-colors"
        >
          + Ny kampanj
        </button>
      </div>

      <div className="space-y-3">
        {MOCK_CAMPAIGNS.map(campaign => (
          <div
            key={campaign.id}
            onClick={() => setSelected(campaign)}
            className="rounded-xl border border-white/[0.08] bg-[#161B22] p-5 cursor-pointer hover:border-white/[0.16] hover:bg-[#1C2129] transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Status + Namn */}
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${STATUS_DOT[campaign.status]}`} />
                  <span className="text-white font-semibold text-sm truncate">{campaign.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[campaign.status]}`}>
                    {campaign.status}
                  </span>
                </div>
                {/* Metadata */}
                <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-400">{OBJECTIVE_LABELS[campaign.objective]}</span>
                  <span>·</span>
                  <span>{GEO_SCOPE_LABELS[campaign.geo_scope]}</span>
                  <span>·</span>
                  <span className="font-mono">{campaign.start_date} → {campaign.end_date}</span>
                </div>
              </div>
              {/* Budget */}
              <div className="text-right flex-shrink-0">
                <div className="text-white font-semibold text-sm font-mono">
                  {campaign.budget_total.toLocaleString()} <span className="text-gray-500 text-xs font-sans">{campaign.currency}</span>
                </div>
                <div className="text-xs text-gray-600 mt-0.5">0 spenderat</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && <NewCampaignModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
