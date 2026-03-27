import { useState, useMemo } from 'react'
import { KNOWLEDGE_DOCS, type DocCategory, type KnowledgeDoc } from './knowledgeData'

const CATEGORIES: DocCategory[] = ['Wavult Group', 'QuiXzoom', 'Landvex', 'Internt', 'Juridik']

const CATEGORY_COLORS: Record<DocCategory, string> = {
  'Wavult Group': '#8B5CF6',
  'QuiXzoom': '#F59E0B',
  'Landvex': '#10B981',
  'Internt': '#3B82F6',
  'Juridik': '#EF4444',
}

const CATEGORY_BG: Record<DocCategory, string> = {
  'Wavult Group': '#8B5CF615',
  'QuiXzoom': '#F59E0B15',
  'Landvex': '#10B98115',
  'Internt': '#3B82F615',
  'Juridik': '#EF444415',
}

function DocModal({ doc, onClose }: { doc: KnowledgeDoc; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#0D0F1A] border border-surface-border rounded-xl w-full max-w-2xl mx-4 p-6 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-300 transition-colors text-lg leading-none"
        >
          ×
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div
            className="px-2 py-0.5 rounded text-xs font-mono flex-shrink-0 mt-0.5"
            style={{ background: CATEGORY_BG[doc.category], color: CATEGORY_COLORS[doc.category] }}
          >
            {doc.category}
          </div>
          <h2 className="text-white font-semibold text-lg leading-snug">{doc.title}</h2>
        </div>

        <p className="text-gray-400 text-sm mb-4">{doc.summary}</p>

        <div className="bg-[#07080F] rounded-lg p-4 text-sm text-gray-300 leading-relaxed whitespace-pre-line font-mono text-xs overflow-auto max-h-80">
          {doc.content}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-4">
          {doc.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-white/[0.05] text-gray-500 text-xs">
              #{tag}
            </span>
          ))}
        </div>

        <p className="text-[10px] text-gray-700 mt-3 font-mono">Uppdaterad: {doc.updatedAt}</p>
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
        doc.tags.some(t => t.toLowerCase().includes(q))
      return matchCat && matchSearch
    })
  }, [search, activeCategory])

  return (
    <div className="h-full flex flex-col">
      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
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
            placeholder="Sök dokument, taggar, innehåll..."
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
      </div>

      {/* Document Grid */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-600">
            <span className="text-2xl mb-2">🔍</span>
            <p className="text-sm">Inga dokument matchar sökningen</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(doc => (
              <button
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className="text-left p-4 bg-[#0D0F1A] border border-surface-border rounded-xl hover:border-white/20 transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-mono"
                    style={{ background: CATEGORY_BG[doc.category], color: CATEGORY_COLORS[doc.category] }}
                  >
                    {doc.category}
                  </span>
                  <svg
                    className="text-gray-700 group-hover:text-gray-400 transition-colors mt-0.5"
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </div>

                <h3 className="text-sm font-medium text-white mb-1.5 leading-snug group-hover:text-brand-accent transition-colors">
                  {doc.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{doc.summary}</p>

                <div className="flex flex-wrap gap-1 mt-3">
                  {doc.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-600 text-[10px]">
                      #{tag}
                    </span>
                  ))}
                  {doc.tags.length > 3 && (
                    <span className="text-[10px] text-gray-700">+{doc.tags.length - 3}</span>
                  )}
                </div>

                <p className="text-[10px] text-gray-700 mt-2 font-mono">{doc.updatedAt}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedDoc && (
        <DocModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}
    </div>
  )
}
