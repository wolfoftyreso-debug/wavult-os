// ─── Wavult OS — Contacts & Communication Directory ──────────────────────────
// Alla kontaktvägar för hela Wavult Group — team, bolag, externa.
// Single source of truth för mail, telefon, och kommunikationskanaler.

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contact {
  id: string
  name: string
  role: string
  entity: string
  entityColor: string
  email: string
  phone?: string
  telegram?: string
  whatsapp?: string
  category: 'team' | 'entity' | 'external' | 'bank' | 'legal'
  tags?: string[]
  notes?: string
}

// ─── Contact Data ─────────────────────────────────────────────────────────────

const CONTACTS: Contact[] = [
  // ── CORE TEAM ──────────────────────────────────────────────────────────────
  {
    id: 'erik',
    name: 'Erik Svensson',
    role: 'Chairman & Group CEO',
    entity: 'Wavult Group',
    entityColor: '#8B5CF6',
    email: 'erik@hypbit.com',
    phone: '+46709123223',
    telegram: '@eriksvensson',
    category: 'team',
    tags: ['C-suite', 'Board', 'Founder'],
    notes: 'Primary decision maker. Wavult Group FZCO.',
  },
  {
    id: 'leon',
    name: 'Leon Maurizio Russo De Cerame',
    role: 'CEO Wavult Operations',
    entity: 'Wavult Operations',
    entityColor: '#10B981',
    email: 'leon@hypbit.com',
    phone: '+46738968949',
    category: 'team',
    tags: ['C-suite', 'Sales', 'Execution'],
    notes: 'Ansvarig för hela säljavdelningen och daglig execution.',
  },
  {
    id: 'dennis',
    name: 'Dennis Bjarnemark',
    role: 'Board Member / Chief Legal & Operations (Interim)',
    entity: 'Wavult Group',
    entityColor: '#F59E0B',
    email: 'dennis@hypbit.com',
    phone: '+46761474243',
    category: 'team',
    tags: ['Board', 'Legal', 'Operations'],
    notes: 'Bolagsjuridik, avtal, compliance. Kör Texas LLC och Dubai-struktur.',
  },
  {
    id: 'winston',
    name: 'Winston Gustav Bjarnemark',
    role: 'CFO',
    entity: 'Wavult Group',
    entityColor: '#3B82F6',
    email: 'winston@hypbit.com',
    phone: '+46768123548',
    category: 'team',
    tags: ['C-suite', 'Finance', 'CFO'],
    notes: 'Ekonomisk infrastruktur, betafärdiga system, cashflow.',
  },
  {
    id: 'johan',
    name: 'Johan Putte Berglund',
    role: 'Group CTO',
    entity: 'Wavult Group',
    entityColor: '#06B6D4',
    email: 'johan@hypbit.com',
    phone: '+46736977576',
    category: 'team',
    tags: ['C-suite', 'Tech', 'CTO'],
    notes: 'Drift, konton/APIer, support, rapporter. AWS ECS, GitHub.',
  },

  // ── BOLAG / ENTITIES ────────────────────────────────────────────────────────
  {
    id: 'wavult-group',
    name: 'Wavult Group FZCO',
    role: 'Holding Company / IP Owner',
    entity: 'Dubai',
    entityColor: '#8B5CF6',
    email: 'group@wavult.com',
    category: 'entity',
    tags: ['Dubai', 'FZCO', 'Holding', 'IP'],
    notes: 'Äger 100% av alla dotterbolag + all IP. Dubai Free Zone.',
  },
  {
    id: 'wavult-devops',
    name: 'Wavult DevOps FZCO',
    role: 'Operating Company — Builds & Licenses Systems',
    entity: 'Dubai',
    entityColor: '#7C3AED',
    email: 'devops@wavult.com',
    category: 'entity',
    tags: ['Dubai', 'FZCO', 'Operating'],
    notes: 'Bygger Wavult OS, QuiXzoom, Landvex. Licensierar till dotterbolag. 0% bolagsskatt.',
  },
  {
    id: 'quixzoom-inc',
    name: 'QuiXzoom Inc',
    role: 'Delaware C Corporation — Global/US Platform',
    entity: 'Delaware, USA',
    entityColor: '#EF4444',
    email: 'us@quixzoom.com',
    category: 'entity',
    tags: ['Delaware', 'USA', 'QuiXzoom', 'C-Corp'],
    notes: 'Stripe Atlas pågår. Cap table: Erik 70% / Wavult Group 20% / Option Pool 10%. 83(b) viktig.',
  },
  {
    id: 'quixzoom-uab',
    name: 'QuiXzoom UAB',
    role: 'EU Platform — Vilnius, Lithuania',
    entity: 'Litauen',
    entityColor: '#F97316',
    email: 'eu@quixzoom.com',
    category: 'entity',
    tags: ['Lithuania', 'UAB', 'EU', 'GDPR', 'QuiXzoom'],
    notes: 'Weedle UAB compliance-förfrågan skickad. Väntar svar.',
  },
  {
    id: 'landvex-ab',
    name: 'Landvex AB',
    role: 'B2G EU — Stockholm, Sverige',
    entity: 'Sverige',
    entityColor: '#10B981',
    email: 'info@landvex.se',
    category: 'entity',
    tags: ['Sweden', 'AB', 'B2G', 'Landvex'],
    notes: 'Org.nr: 559141-7042. Namnbyte från Sommarliden pågår hos Bolagsverket. Revisor söks.',
  },
  {
    id: 'landvex-inc',
    name: 'Landvex Inc',
    role: 'B2G USA — Houston, Texas',
    entity: 'Texas, USA',
    entityColor: '#0EA5E9',
    email: 'us@landvex.com',
    category: 'entity',
    tags: ['Texas', 'USA', 'B2G', 'Landvex'],
    notes: 'SOSDirect Form 201 halvklar. Kvar: adress, aktier, betala $300 på sos.state.tx.us.',
  },

  // ── BANK & FINTECH ──────────────────────────────────────────────────────────
  {
    id: 'revolut',
    name: 'Revolut Business',
    role: 'Primary Business Banking',
    entity: 'Fintech',
    entityColor: '#7C3AED',
    email: 'business@revolut.com',
    category: 'bank',
    tags: ['Bank', 'EUR', 'SEK', 'USD'],
    notes: 'KYC godkänt. EUR-betalningar aktivt. Sweeping till holding planerat.',
  },
  {
    id: 'mercury',
    name: 'Mercury Bank',
    role: 'US Banking — QuiXzoom Inc',
    entity: 'USA',
    entityColor: '#06B6D4',
    email: 'support@mercury.com',
    category: 'bank',
    tags: ['Bank', 'USD', 'Delaware', 'USA'],
    notes: 'Kopplas efter Stripe Atlas godkänt QuiXzoom Inc.',
  },
  {
    id: 'stripe',
    name: 'Stripe / Stripe Atlas',
    role: 'Payments + Company Formation',
    entity: 'Fintech',
    entityColor: '#635BFF',
    email: 'support@stripe.com',
    category: 'bank',
    tags: ['Payments', 'Atlas', 'Delaware'],
    notes: 'Atlas granskar QuiXzoom Inc. Väntar pass-verifiering.',
  },

  // ── EXTERNA / PARTNERS ──────────────────────────────────────────────────────
  {
    id: 'bolagsverket',
    name: 'Bolagsverket',
    role: 'Myndighet — Bolagsregistrering Sverige',
    entity: 'Sverige',
    entityColor: '#64748B',
    email: 'bolagsverket@bolagsverket.se',
    phone: '0771-670 670',
    category: 'external',
    tags: ['Myndighet', 'Bolag', 'Sverige'],
    notes: 'LandveX AB namnbyte inlämnat. Väntar registrering ~1-2 veckor.',
  },
  {
    id: 'loopia',
    name: 'Loopia (E-post/DNS)',
    role: 'E-postleverantör & DNS',
    entity: 'Infrastruktur',
    entityColor: '#3B82F6',
    email: 'support@loopia.se',
    category: 'external',
    tags: ['SMTP', 'DNS', 'Mail', 'hypbit.com'],
    notes: 'SMTP: outgoing.loopia.se:587. Användare: erik@hypbit.com. Alla team-mail via hypbit.com.',
  },
  {
    id: 'jesper',
    name: 'Jesper Melin',
    role: 'Privat kontakt — Kompis',
    entity: 'Privat',
    entityColor: '#64748B',
    email: 'Jesper.melin89@gmail.com',
    category: 'external',
    tags: ['Privat', 'Kompis'],
    notes: 'Eriks polare. Intresserad av AI/bot-setup. Inga känsliga Wavult-uppgifter.',
  },
]

// ─── Category Labels ──────────────────────────────────────────────────────────

const CATEGORY_META = {
  team:     { label: 'Kärnteamet',  icon: '👥', color: '#8B5CF6' },
  entity:   { label: 'Bolag',       icon: '🏢', color: '#3B82F6' },
  bank:     { label: 'Bank & Fintech', icon: '💳', color: '#10B981' },
  external: { label: 'Externa',     icon: '🌐', color: '#F59E0B' },
  legal:    { label: 'Legal',       icon: '⚖️', color: '#EF4444' },
}

// ─── Contact Card ─────────────────────────────────────────────────────────────

function ContactCard({ contact, expanded, onToggle }: {
  contact: Contact
  expanded: boolean
  onToggle: () => void
}) {
  const initials = contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden cursor-pointer transition-all"
      onClick={onToggle}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
          style={{ background: contact.entityColor + '25', color: contact.entityColor, border: `1.5px solid ${contact.entityColor}40` }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{contact.name}</p>
          <p className="text-xs text-gray-500 truncate">{contact.role}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
            style={{ background: contact.entityColor + '15', color: contact.entityColor, border: `1px solid ${contact.entityColor}30` }}
          >
            {contact.entity}
          </span>
          <span className="text-gray-600 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded: alle kontaktvägar */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-surface-border pt-3 space-y-2">
          {contact.email && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20 flex-shrink-0 font-mono">EMAIL</span>
              <a
                href={`mailto:${contact.email}`}
                className="text-xs text-signal-amber hover:underline"
                onClick={e => e.stopPropagation()}
              >
                {contact.email}
              </a>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20 flex-shrink-0 font-mono">TELEFON</span>
              <a
                href={`tel:${contact.phone}`}
                className="text-xs text-white hover:text-gray-300"
                onClick={e => e.stopPropagation()}
              >
                {contact.phone}
              </a>
            </div>
          )}
          {contact.telegram && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20 flex-shrink-0 font-mono">TELEGRAM</span>
              <span className="text-xs text-[#229ED9]">{contact.telegram}</span>
            </div>
          )}
          {contact.notes && (
            <div className="flex items-start gap-2 mt-2">
              <span className="text-xs text-gray-500 w-20 flex-shrink-0 font-mono pt-0.5">NOTERING</span>
              <p className="text-xs text-gray-400 leading-relaxed">{contact.notes}</p>
            </div>
          )}
          {contact.tags && contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {contact.tags.map(tag => (
                <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-surface-overlay text-gray-500 border border-surface-border">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function ContactsView() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = CONTACTS.filter(c => {
    const matchCat = activeCategory === 'all' || c.category === activeCategory
    const matchSearch = !search || [c.name, c.role, c.entity, c.email, c.phone || '']
      .join(' ').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  // Group by category
  const grouped = filtered.reduce<Record<string, Contact[]>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = []
    acc[c.category].push(c)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Sök namn, roll, mail..."
        className="w-full px-4 py-2.5 rounded-xl bg-surface-raised border border-surface-border text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-accent/50"
      />

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveCategory('all')}
          className={`text-xs font-mono px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors ${
            activeCategory === 'all'
              ? 'bg-brand-accent/15 text-brand-accent border border-brand-accent/30'
              : 'text-gray-500 border border-surface-border hover:text-gray-300'
          }`}
        >
          Alla ({CONTACTS.length})
        </button>
        {(Object.entries(CATEGORY_META) as [string, typeof CATEGORY_META[keyof typeof CATEGORY_META]][]).map(([key, meta]) => {
          const count = CONTACTS.filter(c => c.category === key).length
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`text-xs font-mono px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors whitespace-nowrap ${
                activeCategory === key
                  ? 'bg-brand-accent/15 text-brand-accent border border-brand-accent/30'
                  : 'text-gray-500 border border-surface-border hover:text-gray-300'
              }`}
            >
              {meta.icon} {meta.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Grouped contact list */}
      {(Object.entries(grouped) as [string, Contact[]][]).map(([category, contacts]) => {
        const meta = CATEGORY_META[category as keyof typeof CATEGORY_META]
        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">{meta?.icon}</span>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{meta?.label}</h3>
              <span className="text-xs text-gray-600">({contacts.length})</span>
            </div>
            <div className="space-y-2">
              {contacts.map(contact => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  expanded={expandedId === contact.id}
                  onToggle={() => setExpandedId(expandedId === contact.id ? null : contact.id)}
                />
              ))}
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-600 text-sm">
          Inga kontakter matchar sökningen
        </div>
      )}
    </div>
  )
}
