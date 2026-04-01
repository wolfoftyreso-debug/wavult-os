import { useState } from 'react'
import { MOCK_AUDIENCES, MOCK_CAMPAIGNS } from './mockData'
import { useTranslation } from '../../shared/i18n/useTranslation'

function NewAudienceModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    campaign_id: MOCK_CAMPAIGNS[0].id,
    geo: '',
    age_min: '',
    age_max: '',
    interests: '',
    custom_data: '',
  })

  return (
    <div className="fixed inset-0 bg-white/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-surface-border rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h2 className="text-text-primary font-semibold">Ny audience</h2>
          <button onClick={onClose} className="text-gray-9000 hover:text-text-primary text-lg leading-none">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-9000 mb-1">Kampanj</label>
            <select
              value={form.campaign_id}
              onChange={e => setForm({ ...form, campaign_id: e.target.value })}
              className="w-full bg-white border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none"
            >
              {MOCK_CAMPAIGNS.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-9000 mb-1">Geografi (kommaseparerat)</label>
            <input
              value={form.geo}
              onChange={e => setForm({ ...form, geo: e.target.value })}
              placeholder="t.ex. Sverige, Stockholm, Göteborg"
              className="w-full bg-white border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-gray-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-9000 mb-1">Ålder — från</label>
              <input
                type="number"
                value={form.age_min}
                onChange={e => setForm({ ...form, age_min: e.target.value })}
                placeholder="18"
                className="w-full bg-white border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-gray-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-9000 mb-1">Ålder — till</label>
              <input
                type="number"
                value={form.age_max}
                onChange={e => setForm({ ...form, age_max: e.target.value })}
                placeholder="65"
                className="w-full bg-white border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-gray-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-9000 mb-1">Intressen (kommaseparerat)</label>
            <input
              value={form.interests}
              onChange={e => setForm({ ...form, interests: e.target.value })}
              placeholder="t.ex. infrastruktur, fastigheter, tech"
              className="w-full bg-white border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-gray-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-9000 mb-1">CRM-segment (valfritt)</label>
            <input
              value={form.custom_data}
              onChange={e => setForm({ ...form, custom_data: e.target.value })}
              placeholder="t.ex. CRM-segment: SE-kommuner"
              className="w-full bg-white border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-gray-600 focus:outline-none"
            />
          </div>

          <button
            disabled
            className="w-full py-2 text-sm text-gray-9000 border border-white/5 rounded-lg cursor-not-allowed"
            title="Aktiveras i Fas 2"
          >
            📥 Importera från CRM — Fas 2
          </button>
        </div>
        <div className="px-6 py-4 border-t border-surface-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-9000 hover:text-text-primary transition-colors">Avbryt</button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-brand-accent/20 text-blue-700 border border-blue-200 rounded-lg hover:bg-brand-accent/30 transition-colors"
          >
            Spara audience
          </button>
        </div>
      </div>
    </div>
  )
}

export function AudienceView() {
  const { t: _t } = useTranslation() // ready for i18n
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text-primary font-semibold">Audiences</h2>
          <p className="text-xs text-gray-9000 mt-0.5">{MOCK_AUDIENCES.length} audiences definierade</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="px-3 py-1.5 text-sm text-gray-9000 border border-white/5 rounded-lg cursor-not-allowed"
            title="Aktiveras i Fas 2"
          >
            📥 Importera från CRM
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 text-sm bg-brand-accent/20 text-blue-700 border border-blue-200 rounded-lg hover:bg-brand-accent/30 transition-colors"
          >
            + Ny audience
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {MOCK_AUDIENCES.map(audience => {
          const campaign = MOCK_CAMPAIGNS.find(c => c.id === audience.campaign_id)
          return (
            <div
              key={audience.id}
              className="bg-white border border-surface-border rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm font-medium text-text-primary mb-0.5">
                    {audience.custom_data ?? `Audience ${audience.id}`}
                  </div>
                  <div className="text-xs text-gray-9000">{campaign?.name}</div>
                </div>
                {audience.age_range && (
                  <span className="text-xs text-gray-9000 font-mono">
                    {audience.age_range[0]}–{audience.age_range[1]} år
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {audience.geo.map(g => (
                  <span key={g} className="text-xs px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded-full">
                    📍 {g}
                  </span>
                ))}
              </div>

              {audience.interests && audience.interests.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {audience.interests.map(i => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded-full">
                      {i}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="rounded-lg bg-gray-500 border border-surface-border px-4 py-3 text-xs text-gray-9000">
        💡 CRM-import och lookalike audiences aktiveras i Fas 2 (Q2 2026).
      </div>

      {showModal && <NewAudienceModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
