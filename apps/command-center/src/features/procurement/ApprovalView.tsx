import { useState } from 'react'
import { APPROVAL_REQUESTS } from './mockData'
import { ApprovalRequest, ApprovalStatus, Currency } from './types'

function formatAmount(amount: number, currency: Currency) {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency }).format(amount)
}

const STATUS_META: Record<ApprovalStatus, { label: string; color: string; bg: string }> = {
  väntande: { label: 'Väntande',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  godkänd:  { label: 'Godkänd',  color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  avslagen: { label: 'Avslagen', color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
}

export function ApprovalView() {
  const [requests, setRequests] = useState<ApprovalRequest[]>(APPROVAL_REQUESTS)
  const [comment, setComment] = useState<Record<string, string>>({})

  const pending = requests.filter(r => r.status === 'väntande')
  const resolved = requests.filter(r => r.status !== 'väntande')

  function resolve(id: string, decision: 'godkänd' | 'avslagen') {
    setRequests(prev =>
      prev.map(r => r.id === id ? { ...r, status: decision } : r)
    )
  }

  function RequestCard({ req }: { req: ApprovalRequest }) {
    const meta = STATUS_META[req.status]
    const isPending = req.status === 'väntande'
    return (
      <div className={`rounded-xl border p-4 transition-colors ${
        isPending
          ? 'border-amber-500/20 bg-amber-500/[0.03]'
          : 'border-white/[0.06] bg-white/[0.02]'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px] font-bold text-white">{req.supplierName}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ color: meta.color, background: meta.bg }}
              >
                {meta.label}
              </span>
              <span className="text-xs text-gray-600 font-mono ml-auto">{req.approver}-godkännande</span>
            </div>
            <p className="text-xs text-gray-400 mb-2">{req.description}</p>
            <div className="flex items-center gap-4 text-xs text-gray-600 font-mono">
              <span>PO: {req.purchaseOrderId.toUpperCase()}</span>
              <span>Begärd av: {req.requestedBy}</span>
              <span>{new Date(req.requestedAt).toLocaleDateString('sv-SE')}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[18px] font-bold text-white font-mono">
              {formatAmount(req.amount, req.currency)}
            </div>
            {req.amount > 10000 && (
              <div className="text-[9px] text-amber-500 font-mono mt-0.5">
                &gt; 10 000 kr → CFO krävs
              </div>
            )}
          </div>
        </div>

        {isPending && (
          <div className="mt-3 pt-3 border-t border-white/[0.05]">
            <input
              type="text"
              placeholder="Kommentar (valfritt)…"
              value={comment[req.id] ?? ''}
              onChange={e => setComment(prev => ({ ...prev, [req.id]: e.target.value }))}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white/20 mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => resolve(req.id, 'godkänd')}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
              >
                ✓ Godkänn
              </button>
              <button
                onClick={() => resolve(req.id, 'avslagen')}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
              >
                ✗ Avvisa
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-auto px-4 md:px-6 py-4 space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 flex-shrink-0">
        {[
          { label: 'Väntande', value: pending.length,  color: '#f59e0b' },
          { label: 'Godkända', value: resolved.filter(r => r.status === 'godkänd').length,  color: '#10b981' },
          { label: 'Avslagna', value: resolved.filter(r => r.status === 'avslagen').length, color: '#ef4444' },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
          >
            <div className="text-[24px] font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">
            Väntande godkännanden ({pending.length})
          </p>
          <div className="space-y-3">
            {pending.map(r => <RequestCard key={r.id} req={r} />)}
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div className="text-center py-10 text-gray-600 text-sm">
          ✓ Inga väntande godkännanden
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
            Hanterade ({resolved.length})
          </p>
          <div className="space-y-3">
            {resolved.map(r => <RequestCard key={r.id} req={r} />)}
          </div>
        </div>
      )}
    </div>
  )
}
