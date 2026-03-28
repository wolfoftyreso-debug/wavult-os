import { useState } from 'react'
import { SUPPLIERS } from './mockData'
import { SupplierCategory, SupplierStatus } from './types'

const CATEGORY_COLORS: Record<SupplierCategory, string> = {
  'Tech/SaaS':      '#6366f1',
  'Juridik':        '#f59e0b',
  'Redovisning':    '#10b981',
  'Infrastruktur':  '#3b82f6',
  'Marknadsföring': '#ec4899',
}

const STATUS_BADGE: Record<SupplierStatus, { label: string; color: string; bg: string }> = {
  aktiv:   { label: 'Aktiv',   color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  inaktiv: { label: 'Inaktiv', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

const ALL_CATEGORIES: Array<SupplierCategory | 'Alla'> = [
  'Alla', 'Tech/SaaS', 'Juridik', 'Redovisning', 'Infrastruktur', 'Marknadsföring',
]

export function SuppliersView() {
  const [filterCategory, setFilterCategory] = useState<SupplierCategory | 'Alla'>('Alla')
  const [filterStatus, setFilterStatus] = useState<SupplierStatus | 'Alla'>('Alla')
  const [search, setSearch] = useState('')

  const filtered = SUPPLIERS.filter(s => {
    if (filterCategory !== 'Alla' && s.category !== filterCategory) return false
    if (filterStatus !== 'Alla' && s.status !== filterStatus) return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-white/[0.06] flex-shrink-0 flex-wrap">
        <input
          type="text"
          placeholder="Sök leverantör…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white/20 w-44"
        />

        <div className="flex gap-1">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat as SupplierCategory | 'Alla')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterCategory === cat
                  ? 'bg-white/10 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {cat !== 'Alla' && (
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                  style={{ background: CATEGORY_COLORS[cat as SupplierCategory] }}
                />
              )}
              {cat}
            </button>
          ))}
        </div>

        <div className="flex gap-1 ml-auto">
          {(['Alla', 'aktiv', 'inaktiv'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s as SupplierStatus | 'Alla')}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                filterStatus === s ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-4 md:px-6 py-4">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="text-left border-b border-white/[0.06]">
              {['Leverantör', 'Kategori', 'Land', 'Kontakt', 'Status'].map(h => (
                <th key={h} className="pb-2 text-xs font-semibold text-gray-600 uppercase tracking-wider pr-6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const badge = STATUS_BADGE[s.status]
              return (
                <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pr-6">
                    <span className="text-sm font-semibold text-white">{s.name}</span>
                  </td>
                  <td className="py-3 pr-6">
                    <span
                      className="text-xs px-2 py-0.5 rounded-md font-medium"
                      style={{ color: CATEGORY_COLORS[s.category], background: CATEGORY_COLORS[s.category] + '18' }}
                    >
                      {s.category}
                    </span>
                  </td>
                  <td className="py-3 pr-6">
                    <span className="text-xs text-gray-400">{s.country}</span>
                  </td>
                  <td className="py-3 pr-6">
                    <span className="text-xs text-gray-500 font-mono">{s.email}</span>
                  </td>
                  <td className="py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ color: badge.color, background: badge.bg }}
                    >
                      {badge.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>{/* /overflow-x-auto */}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-600 text-sm">Inga leverantörer matchar filtret</div>
        )}

        <div className="mt-4 text-xs text-gray-700 font-mono">
          {filtered.length} av {SUPPLIERS.length} leverantörer
        </div>
      </div>
    </div>
  )
}
