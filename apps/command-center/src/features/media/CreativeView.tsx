import { useState } from 'react'
import type { Creative } from './types'
import { MOCK_CREATIVES, MOCK_CAMPAIGNS } from './mockData'
import { useTranslation } from '../../shared/i18n/useTranslation'

const STATUS_COLORS: Record<Creative['status'], string> = {
  draft: 'bg-gray-100 text-gray-600',
  review: 'bg-yellow-900 text-yellow-300',
  approved: 'bg-blue-900 text-blue-300',
  live: 'bg-green-900 text-green-300',
  paused: 'bg-orange-900 text-orange-300',
}

const TYPE_ICONS: Record<Creative['type'], string> = {
  audio: '🎵',
  video: '🎬',
  image: '🖼️',
  text: '📝',
}

function NewCreativeModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    campaign_id: MOCK_CAMPAIGNS[0].id,
    type: 'image' as Creative['type'],
    hook: '',
    message: '',
    cta: '',
  })
  const [variants, setVariants] = useState<{ label: string }[]>([{ label: 'Version A' }])

  const addVariant = () => {
    setVariants([...variants, { label: `Version ${String.fromCharCode(65 + variants.length)}` }])
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-gray-900 font-semibold">Ny creative</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-lg leading-none">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Kampanj</label>
              <select
                value={form.campaign_id}
                onChange={e => setForm({ ...form, campaign_id: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none"
              >
                {MOCK_CAMPAIGNS.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Typ</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as Creative['type'] })}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none"
              >
                <option value="audio">Audio</option>
                <option value="video">Video</option>
                <option value="image">Bild</option>
                <option value="text">Text</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Hook (öppningsmening)</label>
            <input
              value={form.hook}
              onChange={e => setForm({ ...form, hook: e.target.value })}
              placeholder="t.ex. Sveriges infrastruktur behöver ögon."
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Budskap</label>
            <textarea
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              rows={3}
              placeholder="Beskriv erbjudandet eller varumärkesbudskapet..."
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">CTA (Call to action)</label>
            <input
              value={form.cta}
              onChange={e => setForm({ ...form, cta: e.target.value })}
              placeholder="t.ex. Läs mer, Ansök nu, Se demo"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">Varianter (A/B-test)</label>
              <button
                onClick={addVariant}
                className="text-xs text-brand-accent hover:underline"
              >
                + Lägg till variant
              </button>
            </div>
            <div className="space-y-2">
              {variants.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={v.label}
                    onChange={e => {
                      const updated = [...variants]
                      updated[i].label = e.target.value
                      setVariants(updated)
                    }}
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none"
                  />
                  {variants.length > 1 && (
                    <button
                      onClick={() => setVariants(variants.filter((_, idx) => idx !== i))}
                      className="text-gray-500 hover:text-red-400 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">Avbryt</button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-brand-accent/20 text-brand-accent border border-brand-accent/30 rounded-lg hover:bg-brand-accent/30 transition-colors"
          >
            Spara creative
          </button>
        </div>
      </div>
    </div>
  )
}

export function CreativeView() {
  const { t: _t } = useTranslation() // ready for i18n
  const [showModal, setShowModal] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 font-semibold">Creatives</h2>
          <p className="text-xs text-gray-500 mt-0.5">{MOCK_CREATIVES.length} creatives · alla i draft</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 text-sm bg-brand-accent/20 text-brand-accent border border-brand-accent/30 rounded-lg hover:bg-brand-accent/30 transition-colors"
        >
          + Ny creative
        </button>
      </div>

      <div className="space-y-2">
        {MOCK_CREATIVES.map(creative => {
          const campaign = MOCK_CAMPAIGNS.find(c => c.id === creative.campaign_id)
          const isExpanded = expanded === creative.id
          return (
            <div
              key={creative.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpanded(isExpanded ? null : creative.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{TYPE_ICONS[creative.type]}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{creative.hook}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${STATUS_COLORS[creative.status]}`}>
                        {creative.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {campaign?.name} · {creative.type} · {creative.variants.length} variant(er)
                    </div>
                  </div>
                </div>
                <span className="text-gray-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Budskap</div>
                    <p className="text-sm text-gray-600">{creative.message}</p>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">CTA</div>
                    <p className="text-sm text-brand-accent">{creative.cta}</p>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Varianter (A/B)</div>
                    <div className="space-y-1">
                      {creative.variants.map(v => (
                        <div key={v.id} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                          <span className="text-xs text-gray-600">{v.label}</span>
                          <span className="text-xs text-gray-500">
                            {v.performance_score !== undefined ? `Score: ${v.performance_score}` : 'Inget data'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showModal && <NewCreativeModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
