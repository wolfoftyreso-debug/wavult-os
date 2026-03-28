import { useState } from 'react'
import { CONTACTS, PROSPECTS, PRODUCT_COLORS, STAGE_COLORS } from './data'

export function ContactsView() {
  const [search, setSearch] = useState('')

  const filtered = CONTACTS.filter(c => {
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    )
  })

  function getProspect(prospectId?: string) {
    if (!prospectId) return null
    return PROSPECTS.find(p => p.id === prospectId) ?? null
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Kontakter</h2>
          <p className="text-sm text-gray-400 mt-0.5">{CONTACTS.length} kontakter i registret</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Sök namn, företag, roll..."
          className="bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20 w-72"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map(c => {
          const prospect = getProspect(c.prospectId)
          return (
            <div
              key={c.id}
              className="bg-surface-raised border border-surface-border rounded-xl p-4 flex flex-col gap-3 hover:border-white/20 transition-colors"
            >
              {/* Name + company */}
              <div className="flex items-start gap-3">
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: '#3B82F620', color: '#3B82F6', border: '1px solid #3B82F640' }}
                >
                  {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white text-sm">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.role}</p>
                  <p className="text-xs text-gray-500">{c.company}</p>
                </div>
              </div>

              {/* Contact details */}
              <div className="space-y-1.5">
                <a
                  href={`mailto:${c.email}`}
                  className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors group"
                >
                  <span className="text-gray-600 group-hover:text-gray-400">📧</span>
                  <span className="truncate">{c.email}</span>
                </a>
                <a
                  href={`tel:${c.phone}`}
                  className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors group"
                >
                  <span className="text-gray-600 group-hover:text-gray-400">📞</span>
                  <span>{c.phone}</span>
                </a>
              </div>

              {/* Linked prospect */}
              {prospect && (
                <div
                  className="flex items-center justify-between pt-2 border-t border-surface-border"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: PRODUCT_COLORS[prospect.product] + '20', color: PRODUCT_COLORS[prospect.product] }}
                    >
                      {prospect.product}
                    </span>
                    <span className="text-xs text-gray-500">{prospect.company}</span>
                  </div>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: STAGE_COLORS[prospect.stage] + '20', color: STAGE_COLORS[prospect.stage] }}
                  >
                    {prospect.stage}
                  </span>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-3 py-12 text-center text-gray-600 text-sm">
            Inga kontakter matchar sökningen
          </div>
        )}
      </div>
    </div>
  )
}
