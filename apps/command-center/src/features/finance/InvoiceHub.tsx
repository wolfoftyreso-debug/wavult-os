import { useState } from 'react'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { INVOICES, FINANCE_ENTITIES, type Invoice, type EntityId, type Currency } from './mockData'

type InvoiceStatus = Invoice['status']

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  draft:   { label: 'Utkast',   color: '#6B7280', bg: '#6B728015' },
  sent:    { label: 'Skickad',  color: '#3B82F6', bg: '#3B82F615' },
  paid:    { label: 'Betald',   color: '#10B981', bg: '#10B98115' },
  overdue: { label: 'Förfallen', color: '#EF4444', bg: '#EF444415' },
}

function fmt(n: number, currency: string) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M ${currency}`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k ${currency}`
  return `${n.toLocaleString()} ${currency}`
}

type NewInvoiceForm = {
  recipient: string
  recipientEmail: string
  entityId: EntityId
  currency: Currency
  dueDate: string
  lines: Array<{ description: string; qty: number; unitPrice: number }>
}

const EMPTY_FORM: NewInvoiceForm = {
  recipient: '',
  recipientEmail: '',
  entityId: 'landvex-ab',
  currency: 'SEK',
  dueDate: '',
  lines: [{ description: '', qty: 1, unitPrice: 0 }],
}

function InvoicePreview({ invoice }: { invoice: Invoice }) {
  const fe = FINANCE_ENTITIES.find(e => e.id === invoice.entityId)
  return (
    <div className="bg-white rounded-xl p-6 text-gray-900 min-w-[400px] shadow-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">FAKTURA</h2>
          <p className="text-sm text-gray-500">#{invoice.number}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold" style={{ color: fe?.color }}>{fe?.name}</p>
          {fe?.id === 'landvex-ab' && <p className="text-xs text-gray-400">Org.nr: 559141-7042</p>}
          <p className="text-xs text-gray-400">{fe?.jurisdiction}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Mottagare</p>
          <p className="font-semibold text-gray-900">{invoice.recipient}</p>
          <p className="text-gray-500">{invoice.recipientEmail}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Datum</p>
          <p className="text-gray-700">Utfärdat: {invoice.issueDate}</p>
          <p className="text-gray-700">Förfaller: {invoice.dueDate}</p>
        </div>
      </div>
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="border-b border-gray-200 text-xs text-gray-400 uppercase">
            <th className="text-left pb-2">Beskrivning</th>
            <th className="text-right pb-2">Antal</th>
            <th className="text-right pb-2">À-pris</th>
            <th className="text-right pb-2">Summa</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-2 text-gray-700">{line.description}</td>
              <td className="py-2 text-right text-gray-600">{line.qty}</td>
              <td className="py-2 text-right text-gray-600">{line.unitPrice.toLocaleString()}</td>
              <td className="py-2 text-right font-semibold">{line.total.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-right text-sm space-y-1">
        <div className="flex justify-between text-gray-600">
          <span>Netto</span><span>{invoice.amount.toLocaleString()} {invoice.currency}</span>
        </div>
        {invoice.tax > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>Moms</span><span>{invoice.tax.toLocaleString()} {invoice.currency}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2">
          <span>Totalt</span><span>{invoice.total.toLocaleString()} {invoice.currency}</span>
        </div>
      </div>
    </div>
  )
}

export function InvoiceHub() {
  const { activeEntity, scopedEntities } = useEntityScope()
  const isRoot = activeEntity.layer === 0
  const scopedIds = new Set(scopedEntities.map(e => e.id))

  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const [showNewForm, setShowNewForm] = useState(false)
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null)
  const [form, setForm] = useState<NewInvoiceForm>(EMPTY_FORM)

  const baseInvoices = INVOICES.filter(inv => isRoot || scopedIds.has(inv.entityId))
  const filtered = statusFilter === 'all' ? baseInvoices : baseInvoices.filter(i => i.status === statusFilter)

  const statusCounts = {
    all: baseInvoices.length,
    draft: baseInvoices.filter(i => i.status === 'draft').length,
    sent: baseInvoices.filter(i => i.status === 'sent').length,
    paid: baseInvoices.filter(i => i.status === 'paid').length,
    overdue: baseInvoices.filter(i => i.status === 'overdue').length,
  }

  const updateLine = (idx: number, field: keyof NewInvoiceForm['lines'][0], value: string | number) => {
    setForm(f => {
      const lines = [...f.lines]
      lines[idx] = { ...lines[idx], [field]: value }
      return { ...f, lines }
    })
  }

  const lineTotal = form.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Fakturor</h2>
          <p className="text-xs text-gray-500 mt-0.5">Hantera utgående fakturor</p>
        </div>
        <button
          onClick={() => setShowNewForm(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-accent/20 hover:bg-brand-accent/30 text-brand-accent text-xs font-semibold transition-colors border border-brand-accent/30"
        >
          + Ny faktura
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map(s => {
          const cfg = s === 'all' ? { label: 'Alla', color: '#ffffff', bg: '#ffffff15' } : STATUS_CONFIG[s]
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${statusFilter === s ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'}`}
            >
              {s !== 'all' && <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.color }} />}
              {s === 'all' ? 'Alla' : STATUS_CONFIG[s as InvoiceStatus].label}
              <span className="text-[9px] font-mono">({statusCounts[s]})</span>
            </button>
          )
        })}
      </div>

      {/* New invoice form */}
      {showNewForm && (
        <div className="rounded-xl border border-white/[0.08] bg-[#0D0F1A] p-4 space-y-3">
          <h3 className="text-sm font-bold text-white">Ny faktura</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] text-gray-500 font-mono uppercase tracking-wider block mb-1">Mottagare</label>
              <input value={form.recipient} onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))}
                className="w-full bg-[#070709] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-white/20"
                placeholder="Bolagsnamn..." />
            </div>
            <div>
              <label className="text-[9px] text-gray-500 font-mono uppercase tracking-wider block mb-1">E-post</label>
              <input value={form.recipientEmail} onChange={e => setForm(f => ({ ...f, recipientEmail: e.target.value }))}
                className="w-full bg-[#070709] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-white/20"
                placeholder="ekonomi@kund.se" />
            </div>
            <div>
              <label className="text-[9px] text-gray-500 font-mono uppercase tracking-wider block mb-1">Utfärdande bolag</label>
              <select value={form.entityId} onChange={e => setForm(f => ({ ...f, entityId: e.target.value as EntityId }))}
                className="w-full bg-[#070709] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                {FINANCE_ENTITIES.map(fe => <option key={fe.id} value={fe.id}>{fe.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-gray-500 font-mono uppercase tracking-wider block mb-1">Valuta</label>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value as Currency }))}
                  className="w-full bg-[#070709] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                  {(['SEK', 'EUR', 'USD', 'AED'] as Currency[]).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-gray-500 font-mono uppercase tracking-wider block mb-1">Förfallodatum</label>
                <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full bg-[#070709] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
              </div>
            </div>
          </div>
          {/* Lines */}
          <div>
            <label className="text-[9px] text-gray-500 font-mono uppercase tracking-wider block mb-2">Rader</label>
            {form.lines.map((line, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-2 mb-2">
                <input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)}
                  className="flex-1 bg-[#070709] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-700 focus:outline-none"
                  placeholder="Beskrivning..." />
                <div className="flex gap-2">
                  <input type="number" value={line.qty} onChange={e => updateLine(i, 'qty', Number(e.target.value))}
                    className="w-16 bg-[#070709] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none text-center"
                    placeholder="Antal" min={1} />
                  <input type="number" value={line.unitPrice} onChange={e => updateLine(i, 'unitPrice', Number(e.target.value))}
                    className="w-24 bg-[#070709] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    placeholder="À-pris" />
                  <div className="w-20 flex items-center justify-center text-xs font-mono text-green-400">
                    {(line.qty * line.unitPrice).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => setForm(f => ({ ...f, lines: [...f.lines, { description: '', qty: 1, unitPrice: 0 }] }))}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              + Lägg till rad
            </button>
          </div>
          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <span className="text-xs text-gray-500">Totalt netto</span>
            <span className="text-[14px] font-bold text-white">{lineTotal.toLocaleString()} {form.currency}</span>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNewForm(false)}
              className="px-4 py-2 rounded-lg border border-white/[0.08] text-gray-500 text-xs hover:text-white transition-colors">
              Avbryt
            </button>
            <button className="px-4 py-2 rounded-lg bg-brand-accent/20 border border-brand-accent/30 text-brand-accent text-xs font-semibold hover:bg-brand-accent/30 transition-colors">
              Spara utkast
            </button>
          </div>
        </div>
      )}

      {/* Invoice list */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden">
        <div className="overflow-x-auto">
        <div className="grid grid-cols-12 px-4 py-2 text-[9px] font-mono text-gray-600 uppercase tracking-wider border-b border-white/[0.06] min-w-[560px]">
          <span className="col-span-2">Nr</span>
          <span className="col-span-3">Mottagare</span>
          <span className="col-span-2">Bolag</span>
          <span className="col-span-2 text-right">Belopp</span>
          <span className="col-span-1">Förfaller</span>
          <span className="col-span-1">Status</span>
          <span className="col-span-1"></span>
        </div>
        {filtered.map(inv => {
          const fe = FINANCE_ENTITIES.find(e => e.id === inv.entityId)
          const st = STATUS_CONFIG[inv.status]
          return (
            <div key={inv.id}
              className="grid grid-cols-12 px-4 py-3 items-center border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors min-w-[560px]">
              <span className="col-span-2 text-xs font-mono text-gray-400">{inv.number}</span>
              <div className="col-span-3">
                <p className="text-xs text-white truncate">{inv.recipient}</p>
                <p className="text-[9px] text-gray-600 truncate">{inv.recipientEmail}</p>
              </div>
              <div className="col-span-2 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: fe?.color }} />
                <span className="text-xs text-gray-500 font-mono truncate">{fe?.shortName}</span>
              </div>
              <span className="col-span-2 text-right text-xs font-mono font-semibold text-white">
                {fmt(inv.total, inv.currency)}
              </span>
              <span className="col-span-1 text-xs font-mono text-gray-500">{inv.dueDate.slice(5)}</span>
              <span className="col-span-1">
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: st.color, background: st.bg }}>
                  {st.label}
                </span>
              </span>
              <div className="col-span-1 flex justify-end">
                <button
                  onClick={() => setPreviewInvoice(inv)}
                  className="text-xs text-gray-600 hover:text-white transition-colors px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08]"
                >
                  Preview
                </button>
              </div>
            </div>
          )
        })}
        </div>{/* /overflow-x-auto */}
      </div>

      {/* Invoice preview modal */}
      {previewInvoice && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setPreviewInvoice(null)}>
          <div className="w-full max-w-[500px]" onClick={e => e.stopPropagation()}>
            <div className="overflow-x-auto">
              <InvoicePreview invoice={previewInvoice} />
            </div>
            <button
              onClick={() => setPreviewInvoice(null)}
              className="mt-3 w-full py-2 rounded-lg bg-white/[0.08] text-white/60 text-xs hover:bg-white/[0.12] transition-colors"
            >
              Stäng
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
