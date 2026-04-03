// ─── KnowledgeBase.tsx ────────────────────────────────────────────────────────
// Reaktiv kunskapsbas — AI-genererade artiklar som uppdateras automatiskt
// när systemet förändras (nya bolag, API-integrationer, ECS-tjänster, domäner).

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Typer ────────────────────────────────────────────────────────────────────

interface KnowledgeArticle {
  id: string
  slug: string
  title: string
  category: ArticleCategory
  content_markdown: string
  source_type: string | null
  auto_generated: boolean
  last_updated: string
  created_at: string
  metadata?: Record<string, unknown>
}

type ArticleCategory = 'company' | 'infrastructure' | 'api' | 'product' | 'legal' | 'finance' | 'process'

interface Toast {
  id: string
  message: string
}

// ─── Kategori-konfiguration ───────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<ArticleCategory, { label: string; emoji: string; color: string }> = {
  company:        { label: 'Bolag',        emoji: '🏢', color: '#3B82F6' },
  infrastructure: { label: 'Infrastruktur', emoji: '🖥️', color: '#8B5CF6' },
  api:            { label: 'APIs',          emoji: '🔌', color: '#10B981' },
  product:        { label: 'Produkter',     emoji: '📦', color: '#F59E0B' },
  legal:          { label: 'Juridik',       emoji: '⚖️', color: '#EF4444' },
  finance:        { label: 'Finans',        emoji: '💰', color: '#06B6D4' },
  process:        { label: 'Process',       emoji: '⚙️', color: '#6B7280' },
}

const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG) as ArticleCategory[]

// ─── Markdown-renderer ────────────────────────────────────────────────────────

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-text-primary">{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={i} className="px-1 py-0.5 rounded bg-gray-100 text-xs font-mono text-rose-600">{part.slice(1, -1)}</code>
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={i} className="italic">{part.slice(1, -1)}</em>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <div className="space-y-1 text-sm">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return (
            <h1 key={i} className="text-lg font-bold text-text-primary mt-2 mb-2">
              {line.replace(/^# /, '')}
            </h1>
          )
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={i} className="text-base font-bold text-text-primary mt-4 mb-1 pb-1 border-b border-surface-border">
              {line.replace(/^## /, '')}
            </h2>
          )
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={i} className="text-sm font-semibold text-gray-800 mt-3 mb-1">
              {line.replace(/^### /, '')}
            </h3>
          )
        }
        if (line.trim() === '---') {
          return <hr key={i} className="border-surface-border my-3" />
        }
        // Bullet list
        if (line.trimStart().startsWith('- ') || line.trimStart().startsWith('* ')) {
          const indent = (line.length - line.trimStart().length) / 2
          return (
            <div key={i} className="flex gap-2 text-gray-700" style={{ paddingLeft: `${indent * 12}px` }}>
              <span className="text-[#8A8A9A] mt-0.5 shrink-0">•</span>
              <span><InlineMarkdown text={line.replace(/^\s*[-*] /, '')} /></span>
            </div>
          )
        }
        // Numbered list
        const numMatch = line.match(/^(\s*)\d+\.\s(.+)/)
        if (numMatch) {
          const num = line.match(/(\d+)\./)?.[1]
          return (
            <div key={i} className="flex gap-2 text-gray-700">
              <span className="text-[#8A8A9A] shrink-0 font-mono text-xs mt-0.5">{num}.</span>
              <span><InlineMarkdown text={numMatch[2]} /></span>
            </div>
          )
        }
        // Code block
        if (line.startsWith('```')) {
          return null
        }
        // Empty line
        if (line.trim() === '') {
          return <div key={i} className="h-2" />
        }
        // Normal paragraph
        return (
          <p key={i} className="text-gray-700 leading-relaxed">
            <InlineMarkdown text={line} />
          </p>
        )
      })}
    </div>
  )
}

// ─── Hjälp-funktioner ─────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just nu'
  if (minutes < 60) return `${minutes} min sedan`
  if (hours < 24) return `${hours}h sedan`
  return `${days}d sedan`
}

function countByCategory(articles: KnowledgeArticle[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const a of articles) {
    counts[a.category] = (counts[a.category] ?? 0) + 1
  }
  return counts
}

// ─── Huvud-komponent ──────────────────────────────────────────────────────────

export function KnowledgeBase() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<ArticleCategory | 'all'>('all')
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [generating, setGenerating] = useState<string | null>(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateForm, setGenerateForm] = useState({ event_type: 'company.added', name: '', type: '', jurisdiction: '' })

  const prevArticleIds = useRef<Set<string>>(new Set())

  // ── Toast-hantering ──────────────────────────────────────────────────────────
  const addToast = useCallback((message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }, [])

  // ── Polling ──────────────────────────────────────────────────────────────────
  const fetchArticles = useCallback(async (isBackground = false) => {
    try {
      const res = await fetch('/api/knowledge/articles')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: KnowledgeArticle[] = await res.json()

      setArticles(data)
      setLastUpdated(new Date())

      // Kolla nya artiklar och visa toast
      if (isBackground && prevArticleIds.current.size > 0) {
        for (const article of data) {
          if (!prevArticleIds.current.has(article.id)) {
            addToast(`🔴 Ny artikel: ${article.title}`)
          }
        }
      }

      prevArticleIds.current = new Set(data.map(a => a.id))
    } catch (err) {
      console.error('[KnowledgeBase] Fetch error:', err)
    } finally {
      if (!isBackground) setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchArticles(false)
    const interval = setInterval(() => fetchArticles(true), 30000)
    return () => clearInterval(interval)
  }, [fetchArticles])

  // ── Filtrera artiklar ────────────────────────────────────────────────────────
  const filtered = selectedCategory === 'all'
    ? articles
    : articles.filter(a => a.category === selectedCategory)

  const counts = countByCategory(articles)

  // ── Manuell generering ───────────────────────────────────────────────────────
  async function handleGenerate() {
    const { event_type, name, type, jurisdiction } = generateForm
    if (!name) return

    const entity: Record<string, string> = { name }
    if (type) entity.type = type
    if (jurisdiction) entity.jurisdiction = jurisdiction

    setGenerating(name)
    try {
      const res = await fetch('/api/knowledge/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type, entity }),
      })

      if (res.ok) {
        addToast(`✅ Artikel genererad: ${name}`)
        setShowGenerateModal(false)
        setGenerateForm({ event_type: 'company.added', name: '', type: '', jurisdiction: '' })
        await fetchArticles(false)
      } else {
        addToast(`❌ Generering misslyckades`)
      }
    } finally {
      setGenerating(null)
    }
  }

  async function handleRefreshArticle(article: KnowledgeArticle) {
    setGenerating(article.slug)
    try {
      const entity = (article.metadata?.entity as Record<string, unknown>) ?? { name: article.title }
      const res = await fetch('/api/knowledge/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: article.source_type ?? 'company.added', entity }),
      })

      if (res.ok) {
        addToast(`✅ Artikel uppdaterad: ${article.title}`)
        await fetchArticles(false)
      }
    } finally {
      setGenerating(null)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="bg-white text-[#0A3D62] text-sm px-4 py-2.5 rounded-lg shadow-lg border border-[#DDD5C5] animate-fade-in">
            {t.message}
          </div>
        ))}
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl border border-surface-border p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-semibold text-text-primary mb-4">Generera ny artikel</h3>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-[#8A8A9A] mb-1 block">Event-typ</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-surface-border bg-white text-sm text-text-primary"
                  value={generateForm.event_type}
                  onChange={e => setGenerateForm(f => ({ ...f, event_type: e.target.value }))}
                >
                  <option value="company.added">🏢 Bolag tillagt</option>
                  <option value="api.integrated">🔌 API integrerat</option>
                  <option value="ecs.deployed">🖥️ ECS-tjänst driftsatt</option>
                  <option value="domain.added">🌐 Domän tillagd</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-[#8A8A9A] mb-1 block">Namn *</label>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-surface-border bg-white text-sm text-text-primary"
                  placeholder="t.ex. QuiXzoom Inc"
                  value={generateForm.name}
                  onChange={e => setGenerateForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              {generateForm.event_type === 'company.added' && (
                <>
                  <div>
                    <label className="text-xs text-[#8A8A9A] mb-1 block">Bolagsform</label>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-surface-border bg-white text-sm text-text-primary"
                      placeholder="t.ex. Delaware C Corporation"
                      value={generateForm.type}
                      onChange={e => setGenerateForm(f => ({ ...f, type: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#8A8A9A] mb-1 block">Jurisdiktion</label>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-surface-border bg-white text-sm text-text-primary"
                      placeholder="t.ex. US-DE"
                      value={generateForm.jurisdiction}
                      onChange={e => setGenerateForm(f => ({ ...f, jurisdiction: e.target.value }))}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
                onClick={handleGenerate}
                disabled={!!generating || !generateForm.name}
              >
                {generating ? 'Genererar…' : '✨ Generera'}
              </button>
              <button
                className="px-4 py-2 rounded-lg border border-surface-border text-sm text-[#6B7280] hover:bg-gray-50"
                onClick={() => setShowGenerateModal(false)}
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">📚</span>
          <h2 className="text-base font-semibold text-text-primary">Kunskapsbas</h2>
          {articles.length > 0 && (
            <span className="text-xs text-[#8A8A9A] bg-gray-100 px-2 py-0.5 rounded-full">
              {articles.length} artiklar
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-xs text-[#8A8A9A]">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>LIVE</span>
            {lastUpdated && (
              <span className="text-[#8A8A9A]">· {lastUpdated.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>

          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
          >
            <span>+</span>
            <span>Generera</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — kategorier */}
        <div className="w-44 shrink-0 border-r border-surface-border flex flex-col overflow-y-auto py-2">
          <div className="px-3 py-1 mb-1">
            <p className="text-xs font-semibold text-[#8A8A9A] uppercase tracking-widest">Kategorier</p>
          </div>

          {/* Alla */}
          <button
            onClick={() => { setSelectedCategory('all'); setSelectedArticle(null) }}
            className={`flex items-center justify-between px-3 py-2 text-sm mx-1 rounded-lg ${selectedCategory === 'all' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-[#6B7280] hover:bg-gray-50'}`}
          >
            <span>🗂️ Alla</span>
            <span className="text-xs text-[#8A8A9A] bg-gray-100 px-1.5 py-0.5 rounded-full">{articles.length}</span>
          </button>

          {/* Per kategori */}
          {ALL_CATEGORIES.map(cat => {
            const cfg = CATEGORY_CONFIG[cat]
            const count = counts[cat] ?? 0
            if (count === 0) return null
            return (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setSelectedArticle(null) }}
                className={`flex items-center justify-between px-3 py-2 text-sm mx-1 rounded-lg ${selectedCategory === cat ? 'bg-blue-50 font-medium' : 'text-[#6B7280] hover:bg-gray-50'}`}
                style={{ color: selectedCategory === cat ? cfg.color : undefined }}
              >
                <span>{cfg.emoji} {cfg.label}</span>
                <span className="text-xs text-[#8A8A9A] bg-gray-100 px-1.5 py-0.5 rounded-full">{count}</span>
              </button>
            )
          })}

          <div className="mt-auto px-3 pb-3 pt-4 border-t border-surface-border">
            <div className="flex items-center gap-1.5 text-xs text-[#8A8A9A]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span>Auto-refresh 30s</span>
            </div>
            <button
              onClick={() => fetchArticles(false)}
              className="mt-1.5 w-full text-xs text-blue-500 hover:text-blue-600 text-left"
            >
              Uppdatera nu →
            </button>
          </div>
        </div>

        {/* Artikellista */}
        <div className={`flex-1 overflow-y-auto ${selectedArticle ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
          {loading ? (
            <div className="flex items-center justify-center h-32 text-[#8A8A9A]">
              <span className="animate-pulse">Laddar artiklar…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-[#8A8A9A] gap-2">
              <span className="text-2xl">📭</span>
              <p className="text-sm">Inga artiklar ännu</p>
              <p className="text-xs text-[#8A8A9A]">Kör seed-scriptet eller lägg till ett systemevent</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {filtered.map(article => {
                const cfg = CATEGORY_CONFIG[article.category]
                const isSelected = selectedArticle?.id === article.id
                return (
                  <button
                    key={article.id}
                    onClick={() => setSelectedArticle(isSelected ? null : article)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                          >
                            {cfg.emoji} {cfg.label}
                          </span>
                          {article.auto_generated && (
                            <span className="text-xs text-[#8A8A9A]">✨ AI</span>
                          )}
                        </div>
                        <h3 className="text-sm font-medium text-text-primary leading-snug">{article.title}</h3>
                        <p className="text-xs text-[#8A8A9A] mt-1">Uppdaterad {timeAgo(article.last_updated)}</p>
                      </div>
                      <span className="text-[#6B7280] shrink-0 mt-1">›</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Artikelvy */}
        {selectedArticle && (
          <div className="flex-1 lg:flex-none lg:w-[55%] border-l border-surface-border overflow-y-auto">
            <div className="p-4">
              {/* Artikel-header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const cfg = CATEGORY_CONFIG[selectedArticle.category]
                      return (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                        >
                          {cfg.emoji} {cfg.label}
                        </span>
                      )
                    })()}
                    {selectedArticle.auto_generated && (
                      <span className="text-xs text-[#8A8A9A] bg-gray-100 px-2 py-0.5 rounded-full">
                        ✨ AI-genererad · {timeAgo(selectedArticle.last_updated)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRefreshArticle(selectedArticle)}
                    disabled={generating === selectedArticle.slug}
                    className="text-xs px-3 py-1.5 rounded-lg border border-surface-border text-[#6B7280] hover:bg-gray-50 disabled:opacity-50"
                  >
                    {generating === selectedArticle.slug ? '⏳ Uppdaterar…' : '🔄 Uppdatera'}
                  </button>
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="text-xs px-2 py-1.5 rounded-lg border border-surface-border text-[#8A8A9A] hover:bg-gray-50 lg:hidden"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Artikel-innehåll */}
              <div className="prose prose-sm max-w-none">
                <MarkdownContent content={selectedArticle.content_markdown} />
              </div>

              {/* Metadata */}
              <div className="mt-6 pt-4 border-t border-surface-border">
                <p className="text-xs text-[#8A8A9A]">
                  Slug: <code className="font-mono text-xs bg-gray-100 px-1 rounded">{selectedArticle.slug}</code>
                  {selectedArticle.source_type && (
                    <> · Källa: <code className="font-mono text-xs bg-gray-100 px-1 rounded">{selectedArticle.source_type}</code></>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default KnowledgeBase
