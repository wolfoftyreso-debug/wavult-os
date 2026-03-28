import { useState, useMemo } from 'react'
import { KNOWLEDGE_DOCS, type DocCategory, type KnowledgeDoc } from './knowledgeData'

const CATEGORIES: DocCategory[] = ['Wavult Group', 'QuiXzoom', 'Landvex', 'Internt', 'Juridik']

const CATEGORY_COLORS: Record<DocCategory, string> = {
  'Wavult Group': '#8B5CF6',
  'QuiXzoom': '#F59E0B',
  'Landvex': '#10B981',
  'Internt': '#3B82F6',
  'Juridik': '#EF4444',
  'Idéportfolio': '#EC4899',
}

const CATEGORY_BG: Record<DocCategory, string> = {
  'Wavult Group': '#8B5CF615',
  'QuiXzoom': '#F59E0B15',
  'Landvex': '#10B98115',
  'Internt': '#3B82F615',
  'Juridik': '#EF444415',
  'Idéportfolio': '#EC4899015',
}

function estimateReadTime(content: string): number {
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

// Simple markdown renderer — no external deps needed
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        // H2
        if (line.startsWith('## ')) {
          return (
            <h2 key={i} className="text-base font-bold text-white mt-4 mb-1 pb-1 border-b border-white/10">
              {line.replace(/^## /, '')}
            </h2>
          )
        }
        // H3
        if (line.startsWith('### ')) {
          return (
            <h3 key={i} className="text-sm font-semibold text-gray-200 mt-3 mb-1">
              {line.replace(/^### /, '')}
            </h3>
          )
        }
        // H4
        if (line.startsWith('#### ')) {
          return (
            <h4 key={i} className="text-xs font-semibold text-gray-300 mt-2 mb-0.5 uppercase tracking-wide">
              {line.replace(/^#### /, '')}
            </h4>
          )
        }
        // Horizontal rule
        if (line.trim() === '---') {
          return <hr key={i} className="border-white/10 my-3" />
        }
        // Table row (starts with |)
        if (line.trim().startsWith('|')) {
          const cells = line.split('|').filter((_, ci) => ci > 0 && ci < line.split('|').length - 1)
          const isSeparator = cells.every(c => /^[-: ]+$/.test(c))
          if (isSeparator) return null
          const isHeader = lines[i + 1]?.trim().startsWith('|') && lines[i + 1]?.split('|').every(c => /^[-: ]+$/.test(c))
          return (
            <div key={i} className={`flex text-xs font-mono ${isHeader ? 'text-gray-400 font-semibold border-b border-white/10 pb-1 mb-0.5' : 'text-gray-300 border-b border-white/[0.05] py-0.5'}`}>
              {cells.map((cell, ci) => (
                <div key={ci} className="flex-1 px-1 min-w-0 overflow-hidden text-ellipsis">
                  <InlineMarkdown text={cell.trim()} />
                </div>
              ))}
            </div>
          )
        }
        // Code block markers
        if (line.trim().startsWith('```')) {
          return null // handled below via grouping approach
        }
        // Bullet point
        if (line.match(/^[-*] /)) {
          return (
            <div key={i} className="flex gap-2 text-xs text-gray-300 leading-relaxed pl-2">
              <span className="text-gray-600 flex-shrink-0 mt-0.5">•</span>
              <span><InlineMarkdown text={line.replace(/^[-*] /, '')} /></span>
            </div>
          )
        }
        // Numbered list
        if (line.match(/^\d+\. /)) {
          const num = line.match(/^(\d+)\. /)?.[1]
          return (
            <div key={i} className="flex gap-2 text-xs text-gray-300 leading-relaxed pl-2">
              <span className="text-gray-500 flex-shrink-0 font-mono w-4">{num}.</span>
              <span><InlineMarkdown text={line.replace(/^\d+\. /, '')} /></span>
            </div>
          )
        }
        // Blockquote
        if (line.startsWith('> ')) {
          return (
            <blockquote key={i} className="border-l-2 border-brand-accent pl-3 text-xs text-gray-400 italic my-1">
              {line.replace(/^> /, '')}
            </blockquote>
          )
        }
        // Empty line
        if (line.trim() === '') {
          return <div key={i} className="h-1" />
        }
        // Normal paragraph
        return (
          <p key={i} className="text-xs text-gray-300 leading-relaxed">
            <InlineMarkdown text={line} />
          </p>
        )
      })}
    </div>
  )
}

// Inline markdown: **bold**, `code`, *italic*
function InlineMarkdown({ text }: { text: string }) {
  // Parse bold, code, italic inline
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/)
    if (boldMatch) {
      if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>)
      parts.push(<strong key={key++} className="text-white font-semibold">{boldMatch[2]}</strong>)
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }
    // Code `text`
    const codeMatch = remaining.match(/^(.*?)`(.+?)`/)
    if (codeMatch) {
      if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>)
      parts.push(<code key={key++} className="bg-white/10 text-brand-accent px-1 rounded text-xs font-mono">{codeMatch[2]}</code>)
      remaining = remaining.slice(codeMatch[0].length)
      continue
    }
    // Italic *text*
    const italicMatch = remaining.match(/^(.*?)\*(.+?)\*/)
    if (italicMatch) {
      if (italicMatch[1]) parts.push(<span key={key++}>{italicMatch[1]}</span>)
      parts.push(<em key={key++} className="text-gray-400 italic">{italicMatch[2]}</em>)
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }
    // No match — take rest
    parts.push(<span key={key++}>{remaining}</span>)
    break
  }

  return <>{parts}</>
}

function DocModal({
  doc,
  allDocs,
  onClose,
  onNavigate,
}: {
  doc: KnowledgeDoc
  allDocs: KnowledgeDoc[]
  onClose: () => void
  onNavigate: (doc: KnowledgeDoc) => void
}) {
  const readTime = estimateReadTime(doc.content)
  const currentIndex = allDocs.findIndex(d => d.id === doc.id)
  const nextDoc = currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null
  const prevDoc = currentIndex > 0 ? allDocs[currentIndex - 1] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0D0F1A] border border-surface-border rounded-xl w-full max-w-2xl mx-4 flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-5 pb-0">
          <div className="flex items-start gap-3 mb-3">
            <div
              className="px-2 py-0.5 rounded text-xs font-mono flex-shrink-0 mt-0.5"
              style={{ background: CATEGORY_BG[doc.category], color: CATEGORY_COLORS[doc.category] }}
            >
              {doc.category}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-semibold text-base leading-snug">{doc.title}</h2>
              <p className="text-gray-500 text-xs mt-0.5">{doc.summary}</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-600 hover:text-gray-300 transition-colors text-xl leading-none ml-2"
            >
              ×
            </button>
          </div>

          {/* Meta bar */}
          <div className="flex items-center gap-4 py-2 border-b border-white/[0.05] mb-0">
            <div className="flex items-center gap-1.5 text-xs text-gray-600 font-mono">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              ~{readTime} min läsning
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 font-mono">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              {doc.content.trim().split(/\s+/).length} ord
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 font-mono">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {doc.updatedAt}
            </div>
            <div className="text-xs text-gray-700 font-mono ml-auto">
              {currentIndex + 1} / {allDocs.length}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          <MarkdownContent content={doc.content} />
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 pt-3 border-t border-white/[0.05]">
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {doc.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-white/[0.05] text-gray-500 text-xs">
                #{tag}
              </span>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => prevDoc && onNavigate(prevDoc)}
              disabled={!prevDoc}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 border border-surface-border hover:text-gray-300 hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Föregående
            </button>

            <div className="flex-1" />

            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-gray-500 border border-surface-border hover:text-gray-300 transition-colors"
            >
              Stäng
            </button>

            {nextDoc && (
              <button
                onClick={() => onNavigate(nextDoc)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium text-white border transition-colors"
                style={{
                  background: CATEGORY_BG[nextDoc.category],
                  borderColor: CATEGORY_COLORS[nextDoc.category] + '40',
                  color: CATEGORY_COLORS[nextDoc.category],
                }}
              >
                Nästa: {nextDoc.title.length > 30 ? nextDoc.title.slice(0, 30) + '…' : nextDoc.title} →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function KnowledgeBase() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<DocCategory | 'Alla'>('Alla')
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null)

  const filtered = useMemo(() => {
    return KNOWLEDGE_DOCS.filter(doc => {
      const matchCat = activeCategory === 'Alla' || doc.category === activeCategory
      const q = search.toLowerCase()
      const matchSearch = !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.summary.toLowerCase().includes(q) ||
        doc.content.toLowerCase().includes(q) ||
        doc.tags.some(t => t.toLowerCase().includes(q))
      return matchCat && matchSearch
    })
  }, [search, activeCategory])

  return (
    <div className="h-full flex flex-col">
      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Sök i titlar, innehåll, taggar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#0D0F1A] border border-surface-border rounded-lg pl-8 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-accent"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {(['Alla', ...CATEGORIES] as (DocCategory | 'Alla')[]).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                activeCategory === cat
                  ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30'
                  : 'bg-[#0D0F1A] text-gray-500 border border-surface-border hover:text-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-4">
        <span className="text-xs text-gray-600 font-mono">
          {filtered.length} / {KNOWLEDGE_DOCS.length} dokument
        </span>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-gray-600 hover:text-gray-400 font-mono"
          >
            × rensa sökning
          </button>
        )}
        <span className="text-xs text-gray-700 font-mono ml-auto">
          Klicka ett dokument för djupläsning
        </span>
      </div>

      {/* Startpunkt-guide — visas bara när inget filter är aktivt och ingen sökning */}
      {activeCategory === 'Alla' && !search && (
        <div className="mb-4 bg-[#0D0F1A] border border-white/[0.05] rounded-xl p-3">
          <p className="text-xs text-gray-600 font-mono mb-2">🧭 REKOMMENDERAD LÄSORDNING — NY TEAMMEDLEM</p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'doc-int-004', label: '1. Start här →' },
              { id: 'doc-wg-005', label: '2. Investerarbriefing' },
              { id: 'doc-wg-001', label: '3. Bolagsstruktur' },
              { id: 'doc-qx-001', label: '4. QuiXzoom Arkitektur' },
              { id: 'doc-lx-001', label: '5. Landvex Produktspec' },
            ].map(item => {
              const doc = KNOWLEDGE_DOCS.find(d => d.id === item.id)
              if (!doc) return null
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white/[0.03] text-gray-500 border border-surface-border hover:text-gray-300 hover:border-white/20 transition-colors font-mono"
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Document Grid */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-600">
            <span className="text-2xl mb-2">🔍</span>
            <p className="text-sm mb-1">Inga dokument matchar sökningen</p>
            <p className="text-xs text-gray-700">Prova att söka på: quixzoom, landvex, dubai, bolagsstruktur, zoomer</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(doc => {
              const readTime = estimateReadTime(doc.content)
              const wordCount = doc.content.trim().split(/\s+/).length
              return (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="text-left p-4 bg-[#0D0F1A] border border-surface-border rounded-xl hover:border-white/20 transition-all group relative overflow-hidden"
                >
                  {/* Rich content indicator */}
                  <div
                    className="absolute inset-x-0 top-0 h-0.5 opacity-60"
                    style={{ background: CATEGORY_COLORS[doc.category] }}
                  />

                  <div className="flex items-start justify-between mb-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-mono"
                      style={{ background: CATEGORY_BG[doc.category], color: CATEGORY_COLORS[doc.category] }}
                    >
                      {doc.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-700 font-mono">~{readTime} min</span>
                      <svg
                        className="text-gray-700 group-hover:text-gray-400 transition-colors"
                        width="11" height="11" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </div>
                  </div>

                  <h3 className="text-sm font-medium text-white mb-1.5 leading-snug group-hover:text-brand-accent transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{doc.summary}</p>

                  {/* Word count indicator */}
                  <div className="flex items-center gap-2 mt-3 mb-2">
                    <div className="flex-1 bg-white/[0.04] rounded-full h-1 overflow-hidden">
                      <div
                        className="h-full rounded-full opacity-50"
                        style={{
                          width: `${Math.min(100, (wordCount / 1000) * 100)}%`,
                          background: CATEGORY_COLORS[doc.category]
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-700 font-mono">{wordCount} ord</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {doc.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-600 text-xs">
                        #{tag}
                      </span>
                    ))}
                    {doc.tags.length > 3 && (
                      <span className="text-xs text-gray-700">+{doc.tags.length - 3}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedDoc && (
        <DocModal
          doc={selectedDoc}
          allDocs={filtered}
          onClose={() => setSelectedDoc(null)}
          onNavigate={(doc) => setSelectedDoc(doc)}
        />
      )}
    </div>
  )
}
