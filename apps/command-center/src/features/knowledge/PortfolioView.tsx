// ─── Portfolio View — Eriks Idéportfolio ─────────────────────────────────────
// 13 Lovable-projekt analyserade och kategoriserade.

import { useState } from 'react'
import { IDEA_PORTFOLIO } from './knowledgeData'

const STATUS_META = {
  aktiv:    { label: 'Aktiv',    color: '#10B981', bg: '#10B98115' },
  pausad:   { label: 'Pausad',   color: '#F59E0B', bg: '#F59E0B15' },
  tidig:    { label: 'Tidig fas', color: '#3B82F6', bg: '#3B82F615' },
  referens: { label: 'Referens', color: '#8B919A', bg: '#8B919A15' },
}

const DOMAIN_GROUPS = [
  { label: 'Certifiering & Utbildning', ids: ['mlcs', 'certified-academy', 'certified-spark-engine', 'cert-integrity-engine'] },
  { label: 'Data & Samhälle', ids: ['dissg', 'strimdev'] },
  { label: 'Fintech & Affär', ids: ['vision-kredit-byggare', 'lucid-bridge-build', 'smart-founder-engine'] },
  { label: 'E-handel & Hälsa', ids: ['honest-shelves-builder'] },
  { label: 'Verktyg & Content', ids: ['it-insight-weaver', 'story-weaver-ai', 'projekt-q'] },
]

export function PortfolioView() {
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('alla')

  const filtered = filter === 'alla'
    ? IDEA_PORTFOLIO
    : IDEA_PORTFOLIO.filter(p => p.status === filter)

  const selectedProject = IDEA_PORTFOLIO.find(p => p.id === selected)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Idéportfolio</h2>
          <p className="text-xs text-gray-500 mt-0.5">{IDEA_PORTFOLIO.length} projekt — klonare och analyserade 2026-03-27</p>
        </div>
        <div className="flex gap-2">
          {['alla', 'aktiv', 'pausad', 'tidig', 'referens'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs font-mono px-2.5 py-1 rounded-lg capitalize transition-colors ${
                filter === s
                  ? 'bg-brand-accent/15 text-brand-accent border border-brand-accent/30'
                  : 'text-gray-500 border border-surface-border hover:text-gray-300'
              }`}
            >
              {s === 'alla' ? `Alla (${IDEA_PORTFOLIO.length})` : s}
            </button>
          ))}
        </div>
      </div>

      {/* Group view */}
      {filter === 'alla' ? (
        <div className="space-y-6">
          {DOMAIN_GROUPS.map(group => {
            const projects = IDEA_PORTFOLIO.filter(p => group.ids.includes(p.id))
            return (
              <div key={group.label}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{group.label}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {projects.map(p => (
                    <ProjectCard key={p.id} project={p} onClick={() => setSelected(p.id === selected ? null : p.id)} selected={selected === p.id} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} onClick={() => setSelected(p.id === selected ? null : p.id)} selected={selected === p.id} />
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selectedProject && (
        <div className="bg-surface-raised border border-surface-border rounded-xl p-5 animate-fade-in">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">{selectedProject.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{selectedProject.domain} · {selectedProject.pages} sidor · {selectedProject.updated}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-gray-300 text-xs">✕</button>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed mb-4">{selectedProject.description}</p>
          <div className="p-3 rounded-lg mb-4" style={{ background: '#10B98110', border: '1px solid #10B98130' }}>
            <p className="text-xs text-gray-500 font-mono uppercase mb-1">Potential i Wavult-stacken</p>
            <p className="text-xs text-gray-300">{selectedProject.potential}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedProject.tags.map(tag => (
              <span key={tag} className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-surface-overlay text-gray-500 border border-surface-border">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project, onClick, selected }: {
  project: typeof IDEA_PORTFOLIO[0]
  onClick: () => void
  selected: boolean
}) {
  const status = STATUS_META[project.status]
  return (
    <div
      onClick={onClick}
      className="bg-surface-raised border rounded-xl p-4 cursor-pointer transition-all"
      style={{ borderColor: selected ? '#8B5CF640' : 'rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-white leading-tight">{project.title}</p>
        <span
          className="text-[9px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ background: status.bg, color: status.color, border: `1px solid ${status.color}30` }}
        >
          {status.label}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-2">{project.domain} · {project.pages} sidor</p>
      <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{project.description}</p>
    </div>
  )
}
