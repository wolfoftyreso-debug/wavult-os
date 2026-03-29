import { useState } from 'react'
import { Download, Search, ChevronRight } from 'lucide-react'
import { TransactionDetail } from './TransactionDetail'

type TxStatus = 'paid' | 'pending' | 'overdue' | 'cancelled' | 'approved'
type TxType = 'invoice' | 'payment' | 'salary' | 'expense' | 'transfer' | 'intercompany'

interface Transaction {
  id: string
  date: string
  title: string
  counterparty: string
  entity: string
  type: TxType
  amount: number
  currency: string
  status: TxStatus
  category: string
  reference?: string
}

const TRANSACTIONS: Transaction[] = [
  // Intäkter
  { id: 'inv-1042', date: '2026-03-24', title: 'Faktura #1042 — Konsulttjänster', counterparty: 'Nacka Kommun', entity: 'Landvex AB', type: 'invoice', amount: 125000, currency: 'SEK', status: 'approved', category: 'Intäkt', reference: 'INV-2026-1042' },
  { id: 'inv-1041', date: '2026-03-15', title: 'Faktura #1041 — Abonnemang mars', counterparty: 'Värmdö Kommun', entity: 'Landvex AB', type: 'invoice', amount: 14900, currency: 'SEK', status: 'paid', category: 'Intäkt', reference: 'INV-2026-1041' },
  { id: 'inv-1040', date: '2026-03-10', title: 'Faktura #1040 — Optical Insight Q1', counterparty: 'Nacka Fastigheter AB', entity: 'Landvex AB', type: 'invoice', amount: 89500, currency: 'SEK', status: 'overdue', category: 'Intäkt', reference: 'INV-2026-1040' },

  // Kostnader
  { id: 'exp-0312', date: '2026-03-26', title: 'Löneutbetalning mars 2026', counterparty: 'Anställda', entity: 'Landvex AB', type: 'salary', amount: -160000, currency: 'SEK', status: 'paid', category: 'Lön' },
  { id: 'exp-0311', date: '2026-03-15', title: 'Thailand Workcamp — Förskott', counterparty: 'Nysa Hotel Bangkok', entity: 'Landvex AB', type: 'expense', amount: -45000, currency: 'SEK', status: 'paid', category: 'Resa & Event' },
  { id: 'exp-0310', date: '2026-03-01', title: 'AWS Infrastructure — mars', counterparty: 'Amazon Web Services', entity: 'Wavult Group', type: 'payment', amount: -18500, currency: 'SEK', status: 'paid', category: 'Infrastruktur' },
  { id: 'exp-0309', date: '2026-03-01', title: 'Cloudflare Pro — mars', counterparty: 'Cloudflare Inc', entity: 'Wavult Group', type: 'payment', amount: -2200, currency: 'SEK', status: 'paid', category: 'Infrastruktur' },
  { id: 'exp-0308', date: '2026-03-01', title: 'OpenClaw — mars', counterparty: 'OpenClaw Ltd', entity: 'Wavult Group', type: 'payment', amount: -10800, currency: 'SEK', status: 'paid', category: 'Mjukvara' },

  // Intercompany
  { id: 'ic-0302', date: '2026-03-31', title: 'IP Royalty Q1 2026', counterparty: 'Wavult Group FZCO', entity: 'Landvex AB', type: 'intercompany', amount: -12500, currency: 'SEK', status: 'pending', category: 'Intercompany', reference: 'IC-2026-0302' },
  { id: 'ic-0301', date: '2026-03-31', title: 'Management Fee Q1 2026', counterparty: 'DevOps FZCO', entity: 'Landvex AB', type: 'intercompany', amount: -15000, currency: 'SEK', status: 'pending', category: 'Intercompany', reference: 'IC-2026-0301' },

  // USD
  { id: 'usd-001', date: '2026-03-20', title: 'Northwest Agent Fee', counterparty: 'Northwest Registered Agent', entity: 'Landvex Inc', type: 'payment', amount: -3060, currency: 'USD', status: 'paid', category: 'Juridik' },
  { id: 'usd-002', date: '2026-03-28', title: 'Texas LLC Filing Fee', counterparty: 'Texas SOS / Northwest', entity: 'Landvex Inc', type: 'payment', amount: -3250, currency: 'USD', status: 'paid', category: 'Juridik', reference: 'TX-LLC-2026' },
  // ── Privatkortsutlägg (Erik) — ska redovisas och återbetalas av bolaget ──────
  { id: 'priv-001', date: '2026-03-14', title: 'Lovable Labs — kvitto #2784-4176', counterparty: 'Lovable Labs Inc', entity: 'Wavult Group', type: 'expense', amount: -1050, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'PRIV-KORT-001' },
  { id: 'priv-002', date: '2026-03-15', title: 'Lovable Labs — kvitto #2483-1641', counterparty: 'Lovable Labs Inc', entity: 'Wavult Group', type: 'expense', amount: -525, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'PRIV-KORT-002' },
  { id: 'priv-003', date: '2026-03-17', title: 'Lovable Labs — kvitto #2227-1266', counterparty: 'Lovable Labs Inc', entity: 'Wavult Group', type: 'expense', amount: -525, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'PRIV-KORT-003' },
  { id: 'priv-004', date: '2026-03-25', title: 'Stripe Atlas — QuiXzoom Inc bildningsavgift', counterparty: 'Stripe Atlas', entity: 'QuiXzoom Inc', type: 'payment', amount: -500, currency: 'USD', status: 'paid', category: 'Juridik', reference: 'STRIPE-ATLAS-1296-9493' },
  { id: 'priv-005', date: '2026-03-25', title: 'refurbed — Hårdvara/utrustning', counterparty: 'refurbed GmbH', entity: 'Wavult Group', type: 'expense', amount: -6500, currency: 'SEK', status: 'paid', category: 'Hårdvara', reference: 'REFURBED-17332832' },
  { id: 'priv-006', date: '2026-03-25', title: 'Duix — AI-tjänst kvitto #2077-2547', counterparty: 'Duix', entity: 'Wavult Group', type: 'payment', amount: -59, currency: 'USD', status: 'paid', category: 'Mjukvara', reference: 'DUIX-2077-2547' },
  { id: 'priv-007', date: '2026-03-25', title: 'Northwest — Landvex Inc agent fee', counterparty: 'Northwest Registered Agent LLC', entity: 'Landvex Inc', type: 'payment', amount: -3060, currency: 'USD', status: 'paid', category: 'Juridik', reference: 'NW-LANDVEX-TX' },

]

const STATUS_LABELS: Record<TxStatus, { label: string; color: string; bg: string }> = {
  paid:      { label: 'Betald',     color: '#374151', bg: '#F3F4F6' },
  approved:  { label: 'Godkänd',   color: '#374151', bg: '#F3F4F6' },
  pending:   { label: 'Väntande',  color: '#92400E', bg: '#FEF3C7' },
  overdue:   { label: 'Förfallen', color: '#991B1B', bg: '#FEE2E2' },
  cancelled: { label: 'Annullerad', color: '#6B7280', bg: '#F9FAFB' },
}

const TYPE_LABELS: Record<TxType, string> = {
  invoice:      'Faktura',
  payment:      'Betalning',
  salary:       'Lön',
  expense:      'Utlägg',
  transfer:     'Överföring',
  intercompany: 'Intercompany',
}

const ENTITIES = ['Alla', 'Landvex AB', 'Landvex Inc', 'Wavult Group', 'QuiXzoom UAB', 'QuiXzoom Inc']
const CATEGORIES = ['Alla', 'Intäkt', 'Lön', 'Infrastruktur', 'Mjukvara', 'Intercompany', 'Juridik', 'Resa & Event', 'Hårdvara']

export function TransactionFeed() {
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('Alla')
  const [categoryFilter, setCategoryFilter] = useState('Alla')
  const [selectedTx, setSelectedTx] = useState<string | null>(null)

  const filtered = TRANSACTIONS.filter(tx => {
    const matchSearch = !search ||
      tx.title.toLowerCase().includes(search.toLowerCase()) ||
      tx.counterparty.toLowerCase().includes(search.toLowerCase()) ||
      tx.reference?.toLowerCase().includes(search.toLowerCase())
    const matchEntity = entityFilter === 'Alla' || tx.entity === entityFilter
    const matchCat = categoryFilter === 'Alla' || tx.category === categoryFilter
    return matchSearch && matchEntity && matchCat
  })

  const totalIn = filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const totalOut = filtered.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)

  function formatAmount(amount: number, currency: string): string {
    const abs = Math.abs(amount)
    const formatted = abs >= 1000 ? `${(abs / 1000).toFixed(0)} k` : abs.toString()
    return `${amount > 0 ? '+' : '-'}${formatted} ${currency}`
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F2F2F7' }}>
      {/* Header */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>Transaktioner</h2>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Koncernredovisning — alla bolag</div>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)',
            background: '#F9FAFB', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            <Download style={{ width: 14, height: 14 }} />
            Exportera
          </button>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Inkomster (filtrerat)', value: `+${(totalIn / 1000).toFixed(0)}k SEK`, sub: `${filtered.filter(t => t.amount > 0).length} transaktioner` },
            { label: 'Utgifter (filtrerat)', value: `-${Math.abs(totalOut / 1000).toFixed(0)}k SEK`, sub: `${filtered.filter(t => t.amount < 0).length} transaktioner` },
            { label: 'Netto', value: `${((totalIn + totalOut) / 1000).toFixed(0)}k SEK`, sub: 'Balans' },
          ].map(card => (
            <div key={card.label} style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 16px', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{card.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', fontFamily: 'monospace' }}>{card.value}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9CA3AF' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Sök på namn, motpart eller referens..."
              style={{ width: '100%', paddingLeft: 32, paddingRight: 14, paddingTop: 8, paddingBottom: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, fontFamily: 'system-ui', boxSizing: 'border-box' }}
            />
          </div>
          <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, color: '#374151', background: '#FFFFFF' }}>
            {ENTITIES.map(e => <option key={e}>{e}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, color: '#374151', background: '#FFFFFF' }}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.08)', position: 'sticky', top: 0 }}>
              {['Datum', 'Referens', 'Beskrivning', 'Motpart', 'Bolag', 'Typ', 'Belopp', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((tx, i) => {
              const s = STATUS_LABELS[tx.status]
              return (
                <tr
                  key={tx.id}
                  onClick={() => setSelectedTx(tx.id)}
                  style={{ background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F0F0F5')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#FFFFFF' : '#FAFAFA')}
                >
                  <td style={{ padding: '12px 16px', color: '#6B7280', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{tx.date}</td>
                  <td style={{ padding: '12px 16px', color: '#9CA3AF', fontFamily: 'monospace', fontSize: 11 }}>{tx.reference || '—'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1C1C1E', maxWidth: 240 }}>{tx.title}</td>
                  <td style={{ padding: '12px 16px', color: '#6B7280' }}>{tx.counterparty}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', background: '#F3F4F6', color: '#374151', borderRadius: 6, fontWeight: 500 }}>{tx.entity}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6B7280' }}>{TYPE_LABELS[tx.type]}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: tx.amount > 0 ? '#374151' : '#1C1C1E', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {formatAmount(tx.amount, tx.currency)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <ChevronRight style={{ width: 14, height: 14, color: '#D1D5DB' }} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#9CA3AF' }}>
            Inga transaktioner matchar filtret
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedTx && (
        <TransactionDetail
          transactionId={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </div>
  )
}
