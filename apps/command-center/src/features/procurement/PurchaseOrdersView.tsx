import { useState } from 'react'
import { PURCHASE_ORDERS, SUPPLIERS } from './mockData'
import { PurchaseOrder, POStatus, Currency } from './types'

const STATUS_META: Record<POStatus, { label: string; color: string; bg: string }> = {
  utkast:   { label: 'Utkast',   color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  skickad:  { label: 'Skickad',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  godkänd:  { label: 'Godkänd',  color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  betald:   { label: 'Betald',   color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
}

function formatAmount(amount: number, currency: Currency) {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency }).format(amount)
}

const EMPTY_PO = { supplierId: '', description: '', amount: '', currency: 'SEK' as Currency }

export function PurchaseOrdersView() {
  const [orders, setOrders] = useState<PurchaseOrder[]>(PURCHASE_ORDERS)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_PO)
  const [filterStatus, setFilterStatus] = useState<POStatus | 'Alla'>('Alla')

  const filtered = orders.filter(o => filterStatus === 'Alla' || o.status === filterStatus)

  function handleCreate() {
    if (!form.supplierId || !form.description || !form.amount) return
    const supplier = SUPPLIERS.find(s => s.id === form.supplierId)!
    const newPO: PurchaseOrder = {
      id: `po${Date.now()}`,
      supplierId: form.supplierId,
      supplierName: supplier.name,
      description: form.description,
      amount: Number(form.amount),
      currency: form.currency,
      status: 'utkast',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Erik Svensson',
    }
    setOrders([newPO, ...orders])
    setForm(EMPTY_PO)
    setShowForm(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-white/[0.06] flex-shrink-0 flex-wrap">
        <div className="flex gap-1">
          {(['Alla', 'utkast', 'skickad', 'godkänd', 'betald'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
        >
          + Ny inköpsorder
        </button>
      </div>

      {/* New PO form */}
      {showForm && (
        <div className="mx-6 mt-4 p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] flex-shrink-0">
          <p className="text-xs font-semibold text-white mb-3">Ny inköpsorder</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Leverantör</label>
              <select
                value={form.supplierId}
                onChange={e => setForm({ ...form, supplierId: e.target.value })}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/20"
              >
                <option value="">Välj leverantör…</option>
                {SUPPLIERS.filter(s => s.status === 'aktiv').map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Beskrivning</label>
              <input
                type="text"
                placeholder="Vad beställs?"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Belopp</label>
              <input
                type="number"
                placeholder="0"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Valuta</label>
              <select
                value={form.currency}
                onChange={e => setForm({ ...form, currency: e.target.value as Currency })}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/20"
              >
                <option>SEK</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCreate}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
            >
              Skapa utkast
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_PO) }}
              className="px-4 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto px-4 md:px-6 py-4">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="text-left border-b border-white/[0.06]">
              {['Leverantör', 'Beskrivning', 'Belopp', 'Status', 'Datum', 'Skapad av'].map(h => (
                <th key={h} className="pb-2 text-xs font-semibold text-gray-600 uppercase tracking-wider pr-6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const meta = STATUS_META[o.status]
              return (
                <tr key={o.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pr-6">
                    <span className="text-sm font-semibold text-white">{o.supplierName}</span>
                  </td>
                  <td className="py-3 pr-6">
                    <span className="text-xs text-gray-400">{o.description}</span>
                  </td>
                  <td className="py-3 pr-6">
                    <span className="text-sm font-mono text-white">{formatAmount(o.amount, o.currency)}</span>
                  </td>
                  <td className="py-3 pr-6">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ color: meta.color, background: meta.bg }}
                    >
                      {meta.label}
                    </span>
                  </td>
                  <td className="py-3 pr-6">
                    <span className="text-xs text-gray-600 font-mono">{o.date}</span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-gray-500">{o.createdBy}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>{/* /overflow-x-auto */}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-600 text-sm">Inga inköpsordrar matchar filtret</div>
        )}

        <div className="mt-4 text-xs text-gray-700 font-mono">{filtered.length} av {orders.length} ordrar</div>
      </div>
    </div>
  )
}
