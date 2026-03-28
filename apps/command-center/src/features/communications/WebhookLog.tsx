import { useState } from 'react'

interface WebhookEntry {
  id: string
  source: string
  type: string
  timestamp: string
  status: 200 | 400 | 500
  payload: Record<string, unknown>
  duration_ms: number
}

const MOCK_WEBHOOKS: WebhookEntry[] = [
  {
    id: 'wh-001',
    source: 'GitHub Actions',
    type: 'workflow_run.completed',
    timestamp: '2026-03-26T09:02:14Z',
    status: 200,
    duration_ms: 123,
    payload: {
      action: 'completed',
      workflow_run: {
        id: 8842910014,
        name: 'Deploy to ECS',
        status: 'completed',
        conclusion: 'success',
        branch: 'main',
        run_number: 247,
        created_at: '2026-03-26T09:01:00Z',
        updated_at: '2026-03-26T09:02:14Z',
      },
    },
  },
  {
    id: 'wh-002',
    source: 'Stripe',
    type: 'payment_intent.succeeded',
    timestamp: '2026-03-26T08:55:30Z',
    status: 200,
    duration_ms: 89,
    payload: {
      id: 'evt_3PXnJ2CZ162b',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_3PXnJ2CZ162b',
          amount: 49900,
          currency: 'sek',
          status: 'succeeded',
          customer: 'cus_QRZx7Yg1kBm',
          metadata: { entity: 'wavult-ops', product: 'quixzoom-pro' },
        },
      },
    },
  },
  {
    id: 'wh-003',
    source: 'Stripe',
    type: 'payment_intent.payment_failed',
    timestamp: '2026-03-26T08:44:01Z',
    status: 500,
    duration_ms: 3102,
    payload: {
      id: 'evt_3PXnJ2CZ163a',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_3PXnJ2CZ163a',
          amount: 129900,
          currency: 'sek',
          status: 'requires_payment_method',
          last_payment_error: { code: 'card_declined', message: 'Your card was declined.' },
        },
      },
    },
  },
  {
    id: 'wh-004',
    source: 'Revolut',
    type: 'TransactionCreated',
    timestamp: '2026-03-26T08:30:00Z',
    status: 200,
    duration_ms: 67,
    payload: {
      event: 'TransactionCreated',
      timestamp: '2026-03-26T08:30:00Z',
      data: {
        id: 'rev-txn-8822991',
        amount: -25000,
        currency: 'EUR',
        counterparty: { name: 'AWS EMEA LLC' },
        state: 'COMPLETED',
        merchant: { name: 'Amazon Web Services' },
      },
    },
  },
  {
    id: 'wh-005',
    source: 'GitHub Actions',
    type: 'push',
    timestamp: '2026-03-25T22:00:45Z',
    status: 200,
    duration_ms: 45,
    payload: {
      ref: 'refs/heads/main',
      repository: { name: 'hypbit', full_name: 'wolfoftyreso-debug/hypbit' },
      pusher: { name: 'erik-wavult' },
      commits: [{ id: 'a4f7c2b', message: 'fix: payment webhook timeout handler' }],
    },
  },
  {
    id: 'wh-006',
    source: 'Stripe',
    type: 'invoice.payment_succeeded',
    timestamp: '2026-03-25T18:00:00Z',
    status: 200,
    duration_ms: 112,
    payload: {
      id: 'evt_invoice_001',
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_3PXnJ2CZ1',
          amount_paid: 299900,
          currency: 'sek',
          customer_email: 'client@example.com',
          status: 'paid',
        },
      },
    },
  },
  {
    id: 'wh-007',
    source: 'GitHub Actions',
    type: 'workflow_run.requested',
    timestamp: '2026-03-25T14:15:00Z',
    status: 400,
    duration_ms: 8,
    payload: {
      error: 'Invalid signature — X-Hub-Signature-256 mismatch',
      received_at: '2026-03-25T14:15:00Z',
    },
  },
]

const STATUS_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  200: { label: '200 OK', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
  400: { label: '400 Bad Req', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  500: { label: '500 Error', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
}

export function WebhookLog() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  const sources = ['all', ...Array.from(new Set(MOCK_WEBHOOKS.map(w => w.source)))]
  const filtered = sourceFilter === 'all' ? MOCK_WEBHOOKS : MOCK_WEBHOOKS.filter(w => w.source === sourceFilter)

  const successRate = Math.round((MOCK_WEBHOOKS.filter(w => w.status === 200).length / MOCK_WEBHOOKS.length) * 100)

  return (
    <div className="space-y-4">
      {/* MOCKDATA BANNER */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-xs font-medium">
        <span>⚠️</span>
        <span>Visar mockdata — live webhook-loggning kopplas in när backend är konfigurerat</span>
        <span className="ml-auto text-yellow-600 font-mono text-xs">MOCKDATA</span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0D0F1A] border border-white/[0.06] text-xs">
          <span className="text-gray-400">Total:</span>
          <span className="text-white font-medium">{MOCK_WEBHOOKS.length}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs">
          <span className="text-gray-400">Lyckade:</span>
          <span className="text-green-400 font-medium">{MOCK_WEBHOOKS.filter(w => w.status === 200).length}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs">
          <span className="text-gray-400">Fel:</span>
          <span className="text-red-400 font-medium">{MOCK_WEBHOOKS.filter(w => w.status >= 400).length}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0D0F1A] border border-white/[0.06] text-xs">
          <span className="text-gray-400">Success rate:</span>
          <span className="text-white font-medium">{successRate}%</span>
        </div>
        <div className="ml-auto flex items-center gap-1 p-0.5 bg-[#0D0F1A] rounded-lg border border-white/[0.06]">
          {sources.map(s => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                sourceFilter === s
                  ? 'bg-brand-accent/20 text-brand-accent'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {s === 'all' ? 'Alla' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0D0F1A] rounded-xl border border-white/[0.06] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1.5fr_140px_90px_60px] gap-3 px-4 py-2.5 border-b border-white/[0.06] text-xs text-gray-600 font-mono uppercase tracking-wider">
          <span>Källa</span>
          <span>Typ</span>
          <span>Tidsstämpel</span>
          <span>Status</span>
          <span>ms</span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {filtered.map(wh => {
            const sc = STATUS_CONFIG[wh.status]
            const isExpanded = expanded === wh.id
            return (
              <div key={wh.id}>
                <button
                  onClick={() => setExpanded(isExpanded ? null : wh.id)}
                  className="w-full grid grid-cols-[1fr_1.5fr_140px_90px_60px] gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-xs text-gray-300 font-medium">{wh.source}</span>
                  <span className="text-xs text-gray-500 font-mono truncate">{wh.type}</span>
                  <span className="text-xs text-gray-600 font-mono">
                    {new Date(wh.timestamp).toLocaleString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border text-center ${sc.bg} ${sc.color}`}>
                    {sc.label}
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 font-mono">{wh.duration_ms}</span>
                    <span className={`text-gray-600 text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <div className="bg-[#07080F] rounded-lg p-3 border border-white/[0.06]">
                      <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-2">Payload</div>
                      <pre className="text-xs text-gray-400 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">
                        {JSON.stringify(wh.payload, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
