// ─── API Hub — Dev Integrations Hub ──────────────────────────────────────────
// Centralized view of all API integrations in the Wavult stack + uapix catalog

import { useState, useMemo } from 'react'
import {
  API_INTEGRATIONS,
  API_CATEGORIES,
  LIVE_INTEGRATIONS,
  STATIC_PROVIDER_NEWS,
  type APIIntegration,
  type ProviderNews,
} from './data'

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: APIIntegration['status'] }) {
  const config = {
    live:       { label: 'LIVE',       bg: 'bg-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    configured: { label: 'KONFIGURERAD', bg: 'bg-blue-500/20',   text: 'text-blue-400',    dot: 'bg-blue-400' },
    available:  { label: 'TILLGÄNGLIG', bg: 'bg-slate-500/20',   text: 'text-slate-400',   dot: 'bg-slate-400' },
    planned:    { label: 'PLANERAD',   bg: 'bg-amber-500/20',   text: 'text-amber-400',   dot: 'bg-amber-400' },
  }[status]

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === 'live' ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  )
}

// ─── Price badge ─────────────────────────────────────────────────────────────
function PriceBadge({ price }: { price: APIIntegration['price'] }) {
  if (price === 'free') return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-emerald-900/40 text-emerald-400 font-medium">GRATIS</span>
  )
  if (price === 'usage-based') return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-900/40 text-blue-400 font-medium">USAGE</span>
  )
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-900/40 text-orange-400 font-medium">BETALD</span>
  )
}

// ─── Integration Card ─────────────────────────────────────────────────────────
function IntegrationCard({
  integration,
  onClick,
}: {
  integration: APIIntegration
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-2 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left w-full group"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl leading-none">{integration.icon}</span>
        <StatusBadge status={integration.status} />
      </div>
      <div>
        <div className="font-semibold text-white text-sm group-hover:text-blue-300 transition-colors">{integration.name}</div>
        <div className="text-xs text-white/50 mt-0.5">{integration.provider}</div>
      </div>
      <p className="text-xs text-white/60 leading-relaxed line-clamp-2">{integration.description}</p>
      <div className="flex items-center justify-between mt-auto pt-1">
        <PriceBadge price={integration.price} />
        {integration.wavultUsage && (
          <span className="text-xs text-emerald-400/70 truncate max-w-[120px]" title={integration.wavultUsage}>
            ✓ {integration.wavultUsage}
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function IntegrationModal({
  integration,
  onClose,
}: {
  integration: APIIntegration
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#0D1117] border border-white/20 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{integration.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-white">{integration.name}</h2>
              <p className="text-sm text-white/50">{integration.provider} · {integration.category}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl leading-none">✕</button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <StatusBadge status={integration.status} />
          <PriceBadge price={integration.price} />
        </div>

        <p className="text-white/70 text-sm mb-4 leading-relaxed">{integration.description}</p>

        {integration.wavultUsage && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4">
            <div className="text-xs font-semibold text-emerald-400 mb-1">🟢 WAVULT USAGE</div>
            <div className="text-sm text-white/80">{integration.wavultUsage}</div>
          </div>
        )}

        {integration.docsUrl && (
          <a
            href={integration.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
          >
            📖 Öppna dokumentation
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Live Integration Row ─────────────────────────────────────────────────────
function LiveIntegrationRow({ integration }: { integration: APIIntegration }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
      <span className="text-2xl">{integration.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white">{integration.name}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-emerald-400">LIVE</span>
        </div>
        <div className="text-xs text-white/50 mt-0.5">{integration.provider}</div>
        {integration.wavultUsage && (
          <div className="text-xs text-white/60 mt-1">{integration.wavultUsage}</div>
        )}
      </div>
      <div className="text-right shrink-0">
        <PriceBadge price={integration.price} />
        {integration.docsUrl && (
          <a
            href={integration.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="block text-xs text-blue-400 hover:text-blue-300 mt-1"
          >
            Docs →
          </a>
        )}
      </div>
    </div>
  )
}

// ─── News Card ─────────────────────────────────────────────────────────────────
function NewsCard({ news }: { news: ProviderNews }) {
  const typeConfig = {
    new:         { label: 'NY', color: 'text-emerald-400 bg-emerald-500/20' },
    update:      { label: 'UPDATE', color: 'text-blue-400 bg-blue-500/20' },
    deprecation: { label: 'DEPRECATED', color: 'text-red-400 bg-red-500/20' },
    security:    { label: 'SÄKERHET', color: 'text-orange-400 bg-orange-500/20' },
  }[news.type]

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors">
      <div className="flex items-start gap-3 mb-2">
        <span className="text-xl mt-0.5">{news.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-white text-sm">{news.provider}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${typeConfig.color}`}>{typeConfig.label}</span>
            <span className="text-xs text-white/40 ml-auto">{news.date}</span>
          </div>
          <h3 className="text-sm font-medium text-white/90 mb-1">{news.title}</h3>
          <p className="text-xs text-white/60 leading-relaxed">{news.summary}</p>
        </div>
      </div>
      <div className="mt-2">
        <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded">{news.category}</span>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function APIHub() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'active' | 'news'>('catalog')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIntegration, setSelectedIntegration] = useState<APIIntegration | null>(null)

  // Filter integrations
  const filteredIntegrations = useMemo(() => {
    let items = API_INTEGRATIONS

    if (selectedCategory === 'live') {
      items = items.filter(i => i.status === 'live')
    } else if (selectedCategory !== 'all') {
      items = items.filter(i => i.categoryId === selectedCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.provider.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      )
    }

    return items
  }, [selectedCategory, searchQuery])

  const liveCount = API_INTEGRATIONS.filter(i => i.status === 'live').length
  const totalCount = API_INTEGRATIONS.length

  const tabs = [
    { id: 'catalog', label: 'Integrationer', icon: '🔌', count: totalCount },
    { id: 'active', label: 'Aktiva', icon: '🟢', count: LIVE_INTEGRATIONS.length },
    { id: 'news', label: 'Nyheter', icon: '📰', count: STATIC_PROVIDER_NEWS.length },
  ] as const

  return (
    <div className="min-h-screen bg-[#080C10] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0D1117]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                🔌 API Hub
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                Dev Integrations Hub · {liveCount} live · {totalCount} i katalogen
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>via uapix gateway</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-white/10'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* ── TAB 1: CATALOG ───────────────────────────────────────────────── */}
        {activeTab === 'catalog' && (
          <div className="flex flex-col gap-4">
            {/* Search + filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Sök API, provider, kategori..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus:bg-white/8"
              />
              <div className="text-sm text-white/40 flex items-center px-2">
                {filteredIntegrations.length} integrationer
              </div>
            </div>

            {/* Category filter pills */}
            <div className="flex flex-wrap gap-2">
              {API_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-white/20 text-white/60 hover:border-white/40 hover:text-white bg-white/5'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span className="opacity-60">({cat.count})</span>
                </button>
              ))}
            </div>

            {/* Grid */}
            {filteredIntegrations.length === 0 ? (
              <div className="text-center py-16 text-white/30">
                <div className="text-4xl mb-3">🔍</div>
                <div>Inga integrationer matchar sökningen</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredIntegrations.map(integration => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    onClick={() => setSelectedIntegration(integration)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: ACTIVE ────────────────────────────────────────────────── */}
        {activeTab === 'active' && (
          <div className="flex flex-col gap-4">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Live', value: LIVE_INTEGRATIONS.filter(i => i.status === 'live').length, color: 'text-emerald-400', icon: '🟢' },
                { label: 'Kategorier', value: [...new Set(LIVE_INTEGRATIONS.map(i => i.categoryId))].length, color: 'text-blue-400', icon: '📦' },
                { label: 'Paid', value: LIVE_INTEGRATIONS.filter(i => i.price === 'paid' || i.price === 'usage-based').length, color: 'text-orange-400', icon: '💳' },
                { label: 'Free', value: LIVE_INTEGRATIONS.filter(i => i.price === 'free').length, color: 'text-emerald-400', icon: '✅' },
              ].map(stat => (
                <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-white/40 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mt-2">
              Konfigurerade integrationer i Wavult-stacken
            </h2>

            <div className="flex flex-col gap-2">
              {LIVE_INTEGRATIONS.map(integration => (
                <LiveIntegrationRow key={integration.id} integration={integration} />
              ))}
            </div>

            {/* Coming soon */}
            <div className="mt-4 p-4 rounded-xl border border-dashed border-white/20 bg-white/2">
              <h3 className="text-sm font-semibold text-white/60 mb-3">🗓️ Planerade integrationer (Fas 2)</h3>
              <div className="flex flex-wrap gap-2">
                {API_INTEGRATIONS.filter(i => i.status === 'planned').map(i => (
                  <span key={i.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {i.icon} {i.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: NEWS ──────────────────────────────────────────────────── */}
        {activeTab === 'news' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
                Provider Updates
              </h2>
              <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded">
                Statisk demo — uapix live-data planeras
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STATIC_PROVIDER_NEWS.map(news => (
                <NewsCard key={news.id} news={news} />
              ))}
            </div>

            <div className="mt-4 p-4 rounded-xl border border-dashed border-white/20 bg-white/2 text-center">
              <div className="text-2xl mb-2">📡</div>
              <div className="text-sm text-white/50">
                Live nyheter via uapix Supabase <code className="text-blue-400">provider_updates</code>-tabellen
              </div>
              <div className="text-xs text-white/30 mt-1">
                Kräver uapix Supabase-koppling — planeras i fas 2
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedIntegration && (
        <IntegrationModal
          integration={selectedIntegration}
          onClose={() => setSelectedIntegration(null)}
        />
      )}
    </div>
  )
}
