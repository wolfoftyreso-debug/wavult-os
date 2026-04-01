import { X, FileText, Download } from 'lucide-react'
import { PaymentFlowTrace } from './PaymentFlowTrace'

interface TransactionLogEntry {
  id: string
  timestamp: string
  action: string
  actor: string
  actorRole: string
  note?: string
  type: 'created' | 'approved' | 'paid' | 'rejected' | 'edited' | 'system'
}

interface InvoiceLine {
  description: string
  quantity: number
  unitPrice: number
  total: number
  vatRate: number
}

interface TransactionDetailData {
  id: string
  type: 'invoice' | 'payment' | 'salary' | 'expense' | 'transfer'
  title: string
  number?: string
  entity: string
  counterparty?: string
  amount: number
  currency: string
  date: string
  dueDate?: string
  status: 'pending' | 'approved' | 'paid' | 'overdue' | 'cancelled'
  category: string
  description?: string

  // Invoice specific
  invoiceLines?: InvoiceLine[]
  vatTotal?: number
  subtotal?: number

  // Responsible
  createdBy: string
  approvedBy?: string
  paidBy?: string

  // Log
  log: TransactionLogEntry[]

  // References
  relatedDocuments?: Array<{ name: string; type: string; url?: string }>
}

const DEMO_TRANSACTIONS: Record<string, TransactionDetailData> = {
  'kund-faktura-1042': {
    id: 'kund-faktura-1042',
    type: 'invoice',
    title: 'Kund-faktura #1042 — konsulttjänster',
    number: 'INV-2026-1042',
    entity: 'Landvex AB',
    counterparty: 'Nacka Kommun',
    amount: 125000,
    currency: 'SEK',
    date: '2026-03-24',
    dueDate: '2026-04-23',
    status: 'approved',
    category: 'Intäkt',
    description: 'Infrastrukturinspektion och Optical Insight-abonnemang mars 2026',
    subtotal: 100000,
    vatTotal: 25000,
    invoiceLines: [
      { description: 'Landvex Standard abonnemang — mars 2026', quantity: 1, unitPrice: 84900, total: 84900, vatRate: 25 },
      { description: 'Onboarding och konfiguration', quantity: 1, unitPrice: 15100, total: 15100, vatRate: 25 },
    ],
    createdBy: 'Erik Svensson',
    approvedBy: 'Dennis Bjarnemark',
    log: [
      { id: 'l1', timestamp: '2026-03-24T09:15:00Z', action: 'Faktura skapad', actor: 'Erik Svensson', actorRole: 'CEO', type: 'created' },
      { id: 'l2', timestamp: '2026-03-24T11:30:00Z', action: 'Skickad till kund', actor: 'System', actorRole: 'Automation', note: 'Email till Nacka Kommun, ref: kund@nacka.se', type: 'system' },
      { id: 'l3', timestamp: '2026-03-24T14:00:00Z', action: 'Godkänd för bokföring', actor: 'Dennis Bjarnemark', actorRole: 'CLO', type: 'approved' },
      { id: 'l4', timestamp: '2026-03-24T14:01:00Z', action: 'Bokförd i redovisning', actor: 'System', actorRole: 'Automation', note: 'Konto 3001 Konsultintäkter + 2610 Moms', type: 'system' },
    ],
    relatedDocuments: [
      { name: 'Offert #2026-047', type: 'PDF' },
      { name: 'Serviceavtal Nacka Kommun', type: 'PDF' },
    ],
  },
  'loneutbetalning': {
    id: 'loneutbetalning',
    type: 'salary',
    title: 'Löneutbetalning mars',
    entity: 'Landvex AB',
    counterparty: 'Anställda',
    amount: -160000,
    currency: 'SEK',
    date: '2026-03-26',
    status: 'paid',
    category: 'Lön',
    description: 'Månadslöner mars 2026 — 4 anställda',
    createdBy: 'Winston Bjarnemark',
    approvedBy: 'Erik Svensson',
    paidBy: 'Winston Bjarnemark',
    log: [
      { id: 'l1', timestamp: '2026-03-25T08:00:00Z', action: 'Lönekörning initierad', actor: 'Winston Bjarnemark', actorRole: 'CFO', type: 'created' },
      { id: 'l2', timestamp: '2026-03-25T09:00:00Z', action: 'Godkänd', actor: 'Erik Svensson', actorRole: 'CEO', type: 'approved' },
      { id: 'l3', timestamp: '2026-03-26T06:00:00Z', action: 'Utbetald via Revolut Business', actor: 'Winston Bjarnemark', actorRole: 'CFO', note: 'SEPA-betalning genomförd', type: 'paid' },
      { id: 'l4', timestamp: '2026-03-26T06:01:00Z', action: 'Bokförd', actor: 'System', actorRole: 'Automation', type: 'system' },
    ],
  },
}

type LogType = TransactionLogEntry['type']

const LOG_COLORS: Record<LogType, { color: string; bg: string }> = {
  created:  { color: '#2563EB', bg: '#2563EB10' },
  approved: { color: '#34C759', bg: '#34C75910' },
  paid:     { color: '#007AFF', bg: '#007AFF10' },
  rejected: { color: '#FF3B30', bg: '#FF3B3010' },
  edited:   { color: '#FF9500', bg: '#FF950010' },
  system:   { color: '#8E8E93', bg: '#8E8E9310' },
}

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  pending:   { color: '#FF9500', bg: '#FF950015', label: 'Väntar' },
  approved:  { color: '#34C759', bg: '#34C75915', label: 'Godkänd' },
  paid:      { color: '#007AFF', bg: '#007AFF15', label: 'Betald' },
  overdue:   { color: '#FF3B30', bg: '#FF3B3015', label: 'Förfallen' },
  cancelled: { color: '#8E8E93', bg: '#8E8E9315', label: 'Annullerad' },
}

function formatAmount(amount: number, currency: string): string {
  return `${amount < 0 ? '' : '+'}${(amount / 1000).toFixed(0)}k ${currency}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' })
}

export function TransactionDetail({ transactionId, onClose }: { transactionId: string; onClose: () => void }) {
  // Find transaction or use first demo
  const tx = DEMO_TRANSACTIONS[transactionId] || Object.values(DEMO_TRANSACTIONS)[0]

  if (!tx) return null

  const status = STATUS_STYLES[tx.status]
  const isIncome = tx.amount > 0

  return (
    // Backdrop
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 200 }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 560,
          background: '#FFFFFF', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                {tx.number || tx.type.toUpperCase()} · {tx.entity}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1C1C1E', lineHeight: 1.3 }}>{tx.title}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: status.bg, color: status.color }}>{status.label}</span>
                <span style={{ fontSize: 13, color: '#6B7280' }}>{tx.date}</span>
                {tx.dueDate && <span style={{ fontSize: 12, color: tx.status === 'overdue' ? '#FF3B30' : '#8E8E93' }}>Förfaller {tx.dueDate}</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: isIncome ? '#34C759' : '#FF3B30', fontFamily: 'monospace' }}>
                {formatAmount(tx.amount, tx.currency)}
              </div>
              <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>{tx.category}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Summary */}
          <section>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([
                ['Motpart', tx.counterparty || '—'],
                ['Kategori', tx.category],
                ['Skapad av', tx.createdBy],
                ['Godkänd av', tx.approvedBy || '—'],
                ...(tx.paidBy ? [['Betalad av', tx.paidBy]] : []),
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#8E8E93', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1C1C1E' }}>{value}</div>
                </div>
              ))}
            </div>
            {tx.description && (
              <div style={{ marginTop: 10, padding: '12px 14px', background: '#F9FAFB', borderRadius: 10, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                {tx.description}
              </div>
            )}
          </section>

          {/* Invoice lines */}
          {tx.invoiceLines && tx.invoiceLines.length > 0 && (
            <section>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1C1C1E', marginBottom: 10 }}>Fakturaspecifikation</div>
              <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 90px', gap: 0, background: '#F9FAFB', padding: '8px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  {['Beskrivning', 'Antal', 'À-pris', 'Totalt'].map(h => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                  ))}
                </div>
                {tx.invoiceLines.map((line, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 90px', padding: '12px 16px', borderBottom: i < tx.invoiceLines!.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                    <div style={{ fontSize: 13, color: '#1C1C1E' }}>{line.description}<span style={{ fontSize: 10, color: '#8E8E93', marginLeft: 6 }}>Moms {line.vatRate}%</span></div>
                    <div style={{ fontSize: 13, color: '#6B7280', fontFamily: 'monospace' }}>{line.quantity}</div>
                    <div style={{ fontSize: 13, color: '#6B7280', fontFamily: 'monospace' }}>{line.unitPrice.toLocaleString('sv-SE')}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', fontFamily: 'monospace' }}>{line.total.toLocaleString('sv-SE')}</div>
                  </div>
                ))}
                <div style={{ padding: '12px 16px', background: '#F9FAFB', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>Netto: {tx.subtotal?.toLocaleString('sv-SE')} SEK</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>Moms: {tx.vatTotal?.toLocaleString('sv-SE')} SEK</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E', fontFamily: 'monospace' }}>Totalt: {Math.abs(tx.amount).toLocaleString('sv-SE')} SEK</div>
                </div>
              </div>
            </section>
          )}

          {/* Payment flow trace */}
          {tx.amount > 0 && (
            <PaymentFlowTrace
              amount={tx.amount}
              currency={tx.currency}
              counterparty={tx.counterparty || ''}
              entity={tx.entity}
              title={tx.title}
            />
          )}

          {/* Audit log */}
          <section>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1C1C1E', marginBottom: 12 }}>Historik & Logg</div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, background: 'rgba(0,0,0,0.06)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {tx.log.map(entry => {
                  const logStyle = LOG_COLORS[entry.type]
                  return (
                    <div key={entry.id} style={{ display: 'flex', gap: 12, paddingLeft: 4 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', background: logStyle.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1,
                        border: `2px solid ${logStyle.color}30`,
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: logStyle.color }} />
                      </div>
                      <div style={{ flex: 1, paddingBottom: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>{entry.action}</div>
                          <div style={{ fontSize: 11, color: '#8E8E93', fontFamily: 'monospace', flexShrink: 0, marginLeft: 8 }}>{formatDate(entry.timestamp)}</div>
                        </div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>{entry.actor} · {entry.actorRole}</div>
                        {entry.note && <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2, fontStyle: 'italic' }}>{entry.note}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Related documents */}
          {tx.relatedDocuments && tx.relatedDocuments.length > 0 && (
            <section>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1C1C1E', marginBottom: 10 }}>Relaterade dokument</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {tx.relatedDocuments.map(doc => (
                  <div key={doc.name} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', background: '#F9FAFB', borderRadius: 10,
                    border: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer',
                  }}>
                    <FileText style={{ width: 16, height: 16, color: '#2563EB', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#1C1C1E', flex: 1 }}>{doc.name}</span>
                    <span style={{ fontSize: 11, color: '#8E8E93' }}>{doc.type}</span>
                    <Download style={{ width: 14, height: 14, color: '#8E8E93' }} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
