/**
 * InvoiceDetail — VW Spolfil-principen
 *
 * Fakturahuvudet visar ALDRIG raddetaljer.
 * Kunden ser: Period · Totalt belopp · Referensnummer · [Betala] [Visa spolfil →]
 * Spolfilen (line items) öppnas i en modal/drawer och kan innehålla atomisk audit-logg per rad.
 */
import { useState, useEffect, useCallback } from 'react'
import { useApi } from '../../../shared/auth/useApi'

interface InvoiceSummary {
  id: string
  account_id: string
  date: string
  period_start?: string
  period_end?: string
  description: string
  amount: number
  currency: string
  reference: string
  status: 'pending' | 'confirmed' | 'failed' | 'reversed'
  receipt_url?: string
}

interface InvoiceLine {
  id: string
  invoice_id: string
  line_number: number
  description: string
  quantity: number
  unit: string
  unit_price: number
  amount: number
  metadata?: Record<string, unknown>
}

interface AuditEvent {
  id: string
  invoice_id: string
  event_time: string
  event_type: string
  device_id?: string
  description: string
  metadata?: Record<string, unknown>
}

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Math.abs(amount))
}

// ── Spool file modal ─────────────────────────────────────────────────────────

function SpoolModal({
  invoiceId,
  currency,
  onClose,
}: {
  invoiceId: string
  currency: string
  onClose: () => void
}) {
  const { apiFetch } = useApi()
  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [audit, setAudit] = useState<AuditEvent[] | null>(null)
  const [selectedLine, setSelectedLine] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch(`/api/invoices/${invoiceId}/lines`).then(r => r.json()),
    ]).then(([linesData]) => {
      setLines(linesData ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [invoiceId, apiFetch])

  const loadAudit = useCallback(async (lineId: string) => {
    if (selectedLine === lineId) { setSelectedLine(null); setAudit(null); return }
    setSelectedLine(lineId)
    const data = await apiFetch(`/api/invoices/${invoiceId}/audit?line_id=${lineId}`).then(r => r.json())
    setAudit(data ?? [])
  }, [invoiceId, apiFetch, selectedLine])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 860,
        maxHeight: '82vh', overflow: 'auto', padding: '0 0 40px',
      }}>
        {/* Drawer handle */}
        <div style={{ padding: '16px 28px 12px', borderBottom: '1px solid #E8E4DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#C9A84C', textTransform: 'uppercase', marginBottom: 4 }}>Spool File</div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1a1a2e' }}>Invoice Line Items</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6B7280' }}
          >
            Close ✕
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF' }}>Loading spool file…</div>
        ) : (
          <div style={{ padding: '0 28px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
              <thead>
                <tr style={{ background: '#F9F7F4' }}>
                  {['#', 'Description', 'Qty', 'Unit', 'Unit Price', 'Amount', 'Audit'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <>
                    <tr
                      key={line.id}
                      style={{ borderTop: '1px solid #F0EDE6', background: selectedLine === line.id ? '#EFF6FF' : i % 2 === 0 ? '#fff' : '#FAFAF8' }}
                    >
                      <td style={{ padding: '11px 12px', fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>{line.line_number}</td>
                      <td style={{ padding: '11px 12px', fontSize: 13, color: '#1a1a2e', fontWeight: 500 }}>
                        {line.description}
                        {line.metadata && (
                          <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace', marginTop: 2 }}>
                            {Object.entries(line.metadata).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '11px 12px', fontSize: 13, color: '#374151' }}>{line.quantity}</td>
                      <td style={{ padding: '11px 12px', fontSize: 12, color: '#6B7280' }}>{line.unit}</td>
                      <td style={{ padding: '11px 12px', fontSize: 13, color: '#374151' }}>{fmt(line.unit_price, currency)}</td>
                      <td style={{ padding: '11px 12px', fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{fmt(line.amount, currency)}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <button
                          onClick={() => loadAudit(line.id)}
                          style={{
                            background: selectedLine === line.id ? '#DBEAFE' : '#F3F4F6',
                            color: selectedLine === line.id ? '#1D4ED8' : '#6B7280',
                            border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          {selectedLine === line.id ? 'Hide ↑' : 'Log ↓'}
                        </button>
                      </td>
                    </tr>
                    {selectedLine === line.id && audit && (
                      <tr key={`${line.id}-audit`}>
                        <td colSpan={7} style={{ padding: '0 12px 12px', background: '#F0F7FF' }}>
                          <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #BFDBFE' }}>
                            <div style={{ padding: '8px 16px', background: '#DBEAFE', fontSize: 11, fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: 1 }}>
                              Audit Log
                            </div>
                            {audit.length === 0 ? (
                              <div style={{ padding: '12px 16px', fontSize: 12, color: '#9CA3AF' }}>No audit events for this line.</div>
                            ) : audit.map(ev => (
                              <div key={ev.id} style={{ padding: '10px 16px', borderTop: '1px solid #EFF6FF', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                <div style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap', fontFamily: 'monospace', minWidth: 150 }}>
                                  {new Date(ev.event_time).toLocaleString('sv-SE')}
                                </div>
                                <div>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6', marginRight: 8 }}>{ev.event_type}</span>
                                  <span style={{ fontSize: 12, color: '#374151' }}>{ev.description}</span>
                                  {ev.device_id && <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 8, fontFamily: 'monospace' }}>device: {ev.device_id}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>

            {lines.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
                No line items in spool file.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Invoice Summary (NO line items shown here) ────────────────────────────────

export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const { apiFetch } = useApi()
  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSpool, setShowSpool] = useState(false)

  useEffect(() => {
    apiFetch(`/api/invoices/${invoiceId}`)
      .then(r => r.json())
      .then(data => { setInvoice(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [invoiceId, apiFetch])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading invoice…</div>
  if (!invoice) return <div style={{ padding: 40, textAlign: 'center', color: '#EF4444' }}>Invoice not found</div>

  const period = invoice.period_start && invoice.period_end
    ? `${invoice.period_start} – ${invoice.period_end}`
    : invoice.date

  return (
    <>
      <div style={{
        maxWidth: 600, margin: '0 auto', padding: '32px 24px',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '32px 36px', color: '#F5F0E8' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#C9A84C', textTransform: 'uppercase', marginBottom: 12 }}>
            Invoice
          </div>

          {/* Summary — no details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(245,240,232,.45)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Period</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{period}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(245,240,232,.45)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Reference</div>
              <div style={{ fontSize: 14, fontFamily: 'monospace', color: '#C9A84C' }}>{invoice.reference}</div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: 10, padding: '20px 24px', marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: 'rgba(245,240,232,.45)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Total Amount</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: invoice.status === 'confirmed' ? '#10B981' : '#F5F0E8' }}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(invoice.amount)}
            </div>
            <div style={{ marginTop: 8 }}>
              <span style={{
                padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: invoice.status === 'confirmed' ? '#D1FAE5' : invoice.status === 'pending' ? '#FEF3C7' : '#FEE2E2',
                color: invoice.status === 'confirmed' ? '#065F46' : invoice.status === 'pending' ? '#92400E' : '#991B1B',
              }}>
                {invoice.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            {invoice.status === 'pending' && (
              <button style={{
                flex: 1, padding: '14px 0', background: '#C9A84C', color: '#1a1a2e',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer',
              }}>
                Pay Now
              </button>
            )}
            <button
              onClick={() => setShowSpool(true)}
              style={{
                flex: invoice.status === 'pending' ? 1 : undefined,
                padding: '14px 24px', background: 'rgba(255,255,255,.08)',
                color: '#F5F0E8', border: '1px solid rgba(255,255,255,.15)',
                borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              View spool file →
            </button>
            {invoice.receipt_url && (
              <a
                href={invoice.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '14px 20px', background: 'rgba(255,255,255,.08)',
                  color: '#F5F0E8', border: '1px solid rgba(255,255,255,.15)',
                  borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-block',
                }}
              >
                Receipt PDF ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {showSpool && (
        <SpoolModal
          invoiceId={invoice.id}
          currency={invoice.currency}
          onClose={() => setShowSpool(false)}
        />
      )}
    </>
  )
}
