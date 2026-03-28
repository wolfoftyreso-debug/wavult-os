import { useState } from 'react'
import { useRole } from '../../shared/auth/RoleContext'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'

// ─── Types ──────────────────────────────────────────────────────────────────────

type PaymentStatus = 'CREATED' | 'PROCESSING' | 'AUTHORIZED' | 'CAPTURED' | 'SETTLED' | 'FAILED' | 'CANCELLED' | 'REFUNDED'
type PSP = 'revolut' | 'stripe'
type PayoutStatus = 'pending' | 'approved' | 'sent' | 'confirmed'

interface PaymentIntent {
  id: string
  amount: number
  currency: string
  status: PaymentStatus
  psp: PSP
  entity: string
  description: string
  customer?: string
  createdAt: string
  updatedAt: string
  metadata?: Record<string, string>
}

interface PSPRule {
  condition: string
  psp: PSP
  reason: string
  examples: string[]
}

interface Payout {
  id: string
  recipient: string
  amount: number
  currency: string
  status: PayoutStatus
  scheduledAt: string
  description: string
  approvedBy?: string
}

// ─── Mock data ──────────────────────────────────────────────────────────────────

const PAYMENT_INTENTS: PaymentIntent[] = [
  {
    id: 'pi_wavult_001',
    amount: 49900,
    currency: 'SEK',
    status: 'SETTLED',
    psp: 'stripe',
    entity: 'Wavult Operations',
    description: 'QuixZoom Pro — månadsabonnemang',
    customer: 'Byggfirma AB',
    createdAt: '2026-03-26T07:00:00Z',
    updatedAt: '2026-03-26T07:03:00Z',
    metadata: { product: 'quixzoom-pro', plan: 'monthly' },
  },
  {
    id: 'pi_wavult_002',
    amount: 125000,
    currency: 'EUR',
    status: 'CAPTURED',
    psp: 'revolut',
    entity: 'Wavult Holding',
    description: 'Intercompany transfer — Ops → Holding Q1',
    createdAt: '2026-03-26T08:00:00Z',
    updatedAt: '2026-03-26T08:15:00Z',
    metadata: { type: 'intercompany', quarter: 'Q1-2026' },
  },
  {
    id: 'pi_wavult_003',
    amount: 299900,
    currency: 'SEK',
    status: 'AUTHORIZED',
    psp: 'stripe',
    entity: 'Wavult Operations',
    description: 'Optical Insight — Enterprise license',
    customer: 'FastighetsCo Sthlm',
    createdAt: '2026-03-26T09:00:00Z',
    updatedAt: '2026-03-26T09:01:00Z',
    metadata: { product: 'optical-insight', plan: 'enterprise' },
  },
  {
    id: 'pi_wavult_004',
    amount: 15000,
    currency: 'AED',
    status: 'PROCESSING',
    psp: 'revolut',
    entity: 'Wavult Dubai',
    description: 'Konsultarvode — Dubai Office setup',
    createdAt: '2026-03-26T09:10:00Z',
    updatedAt: '2026-03-26T09:10:30Z',
    metadata: { type: 'consulting', region: 'AE' },
  },
  {
    id: 'pi_wavult_005',
    amount: 9900,
    currency: 'SEK',
    status: 'FAILED',
    psp: 'stripe',
    entity: 'Wavult Operations',
    description: 'QuixZoom Starter — kortbetalning nekad',
    customer: 'Privatperson test@example.com',
    createdAt: '2026-03-25T18:00:00Z',
    updatedAt: '2026-03-25T18:00:05Z',
    metadata: { error: 'card_declined', attempt: '1' },
  },
  {
    id: 'pi_wavult_006',
    amount: 75000,
    currency: 'EUR',
    status: 'CREATED',
    psp: 'revolut',
    entity: 'Wavult Holding',
    description: 'Leverantörsbetalning — AWS Mars',
    createdAt: '2026-03-26T09:14:00Z',
    updatedAt: '2026-03-26T09:14:00Z',
    metadata: { vendor: 'Amazon Web Services', invoice: 'AWS-2026-03' },
  },
  {
    id: 'pi_wavult_007',
    amount: 4990,
    currency: 'SEK',
    status: 'REFUNDED',
    psp: 'stripe',
    entity: 'Wavult Operations',
    description: 'QuixZoom Basic — återbetalning',
    customer: 'Kund AB',
    createdAt: '2026-03-24T10:00:00Z',
    updatedAt: '2026-03-25T11:00:00Z',
    metadata: { reason: 'customer_request' },
  },
]

const PSP_RULES: PSPRule[] = [
  {
    condition: 'Intercompany-överföringar',
    psp: 'revolut',
    reason: 'Lägre avgifter för interna flöden, snabbare settlement',
    examples: ['Ops → Holding', 'Holding → Dubai', 'Holding → UAB Litauen'],
  },
  {
    condition: 'EUR och AED betalningar',
    psp: 'revolut',
    reason: 'Revolut Business optimerad för EUR/AED utan valutaväxlingsavgift',
    examples: ['Leverantörer EU', 'Dubai-betalningar', 'Internationella partnerbetalningar'],
  },
  {
    condition: 'Kundbetalningar (SEK, kortbetalning)',
    psp: 'stripe',
    reason: 'Stripe bäst-i-klassen för kortbetalningar, SCA-kompatibel',
    examples: ['QuixZoom abonnemang', 'Hypbit licenser', 'Optical Insight enterprise'],
  },
  {
    condition: 'Fakturering och återkommande prenumerationer',
    psp: 'stripe',
    reason: 'Stripe Billing hanterar abonnemang, dunning och retries automatiskt',
    examples: ['Månadsprenumerationer', 'Årsavtal', 'Seat-baserad fakturering'],
  },
  {
    condition: 'Belopp >500 000 SEK / månad per entitet',
    psp: 'revolut',
    reason: 'Revolut Business-plan ger bättre rates vid höga volymer',
    examples: ['Storkunder enterprise', 'Government contracts'],
  },
]

const PAYOUTS: Payout[] = [
  {
    id: 'payout-001',
    recipient: 'Leon Russo De Cerame — Zoomer payout v12',
    amount: 18500,
    currency: 'SEK',
    status: 'pending',
    scheduledAt: '2026-03-28T10:00:00Z',
    description: 'Provisionsutbetalning mars — QuixZoom leads',
  },
  {
    id: 'payout-002',
    recipient: 'Amazon Web Services EMEA LLC',
    amount: 25000,
    currency: 'EUR',
    status: 'approved',
    scheduledAt: '2026-03-27T09:00:00Z',
    description: 'AWS invoice INV-2026-03 — ECS + S3 + CloudFront',
    approvedBy: 'Erik Svensson',
  },
  {
    id: 'payout-003',
    recipient: 'Winston Bjarnemark — Lön mars 2026',
    amount: 42000,
    currency: 'SEK',
    status: 'sent',
    scheduledAt: '2026-03-25T10:00:00Z',
    description: 'Löneutbetalning CFO mars',
    approvedBy: 'Erik Svensson',
  },
  {
    id: 'payout-004',
    recipient: 'Johan Berglund — Lön mars 2026',
    amount: 38000,
    currency: 'SEK',
    status: 'confirmed',
    scheduledAt: '2026-03-25T10:00:00Z',
    description: 'Löneutbetalning CTO mars',
    approvedBy: 'Erik Svensson',
  },
  {
    id: 'payout-005',
    recipient: 'Dennis Bjarnemark — Juridisk konsultation mars',
    amount: 25000,
    currency: 'SEK',
    status: 'pending',
    scheduledAt: '2026-03-31T10:00:00Z',
    description: 'Legal retainer Q1 — bolagsjuridik & avtal',
  },
  {
    id: 'payout-006',
    recipient: 'Cloudflare Inc.',
    amount: 250,
    currency: 'USD',
    status: 'confirmed',
    scheduledAt: '2026-03-20T00:00:00Z',
    description: 'Cloudflare Pro plan + Workers — mars',
    approvedBy: 'Johan Berglund',
  },
]

// ─── Status configs ──────────────────────────────────────────────────────────────

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { color: string; bg: string; label: string }> = {
  CREATED:    { color: 'text-gray-400',   bg: 'bg-gray-500/10 border-gray-500/20',   label: 'Skapad' },
  PROCESSING: { color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   label: 'Behandlar' },
  AUTHORIZED: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', label: 'Auktoriserad' },
  CAPTURED:   { color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20',   label: 'Captured' },
  SETTLED:    { color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20', label: 'Avvecklad' },
  FAILED:     { color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',     label: 'Misslyckad' },
  CANCELLED:  { color: 'text-gray-500',   bg: 'bg-gray-500/10 border-gray-500/20',   label: 'Avbruten' },
  REFUNDED:   { color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', label: 'Återbetald' },
}

const PAYOUT_STATUS_CONFIG: Record<PayoutStatus, { color: string; bg: string; label: string }> = {
  pending:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', label: 'Väntande' },
  approved:  { color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   label: 'Godkänd' },
  sent:      { color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20',   label: 'Skickad' },
  confirmed: { color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20', label: 'Bekräftad' },
}

const STATUS_ORDER: PaymentStatus[] = ['CREATED', 'PROCESSING', 'AUTHORIZED', 'CAPTURED', 'SETTLED']

// ─── Sub-components ──────────────────────────────────────────────────────────────

function PaymentIntentDetail({ intent, onClose, onRefund }: {
  intent: PaymentIntent
  onClose: () => void
  onRefund: (id: string) => void
}) {
  const sc = PAYMENT_STATUS_CONFIG[intent.status]
  const canRefund = intent.status === 'SETTLED' || intent.status === 'CAPTURED'

  return (
    <div className="bg-[#0D0F1A] rounded-xl border border-brand-accent/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-white">Payment Intent</h4>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">×</button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-gray-600 block mb-0.5">ID</span>
          <span className="text-gray-300 font-mono">{intent.id}</span>
        </div>
        <div>
          <span className="text-gray-600 block mb-0.5">Status</span>
          <span className={`font-medium ${sc.color}`}>{sc.label}</span>
        </div>
        <div>
          <span className="text-gray-600 block mb-0.5">Belopp</span>
          <span className="text-white font-semibold">
            {new Intl.NumberFormat('sv-SE').format(intent.amount / 100)} {intent.currency}
          </span>
        </div>
        <div>
          <span className="text-gray-600 block mb-0.5">PSP</span>
          <span className="text-gray-300">{intent.psp === 'revolut' ? '💳 Revolut' : '⚡ Stripe'}</span>
        </div>
        <div>
          <span className="text-gray-600 block mb-0.5">Entitet</span>
          <span className="text-gray-300">{intent.entity}</span>
        </div>
        {intent.customer && (
          <div>
            <span className="text-gray-600 block mb-0.5">Kund</span>
            <span className="text-gray-300">{intent.customer}</span>
          </div>
        )}
        <div className="col-span-2">
          <span className="text-gray-600 block mb-0.5">Beskrivning</span>
          <span className="text-gray-300">{intent.description}</span>
        </div>
        <div>
          <span className="text-gray-600 block mb-0.5">Skapad</span>
          <span className="text-gray-400 font-mono">{new Date(intent.createdAt).toLocaleString('sv-SE')}</span>
        </div>
        <div>
          <span className="text-gray-600 block mb-0.5">Uppdaterad</span>
          <span className="text-gray-400 font-mono">{new Date(intent.updatedAt).toLocaleString('sv-SE')}</span>
        </div>
      </div>
      {intent.metadata && (
        <div>
          <span className="text-xs text-gray-600 font-mono uppercase tracking-wider block mb-1">Metadata</span>
          <div className="bg-[#07080F] rounded-lg p-2 space-y-1">
            {Object.entries(intent.metadata).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="text-gray-600 font-mono">{k}:</span>
                <span className="text-gray-400">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {canRefund && (
        <button
          onClick={() => onRefund(intent.id)}
          className="w-full px-3 py-2 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
        >
          ↩ Initiera återbetalning
        </button>
      )}
    </div>
  )
}

function PaymentIntentsSection() {
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const [pspFilter, setPspFilter] = useState<PSP | 'all'>('all')
  const [selected, setSelected] = useState<PaymentIntent | null>(null)
  const [intents, setIntents] = useState(PAYMENT_INTENTS)

  function handleRefund(id: string) {
    setIntents(prev => prev.map(i => i.id === id ? { ...i, status: 'REFUNDED' as PaymentStatus } : i))
    setSelected(null)
  }

  const filtered = intents.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    if (pspFilter !== 'all' && i.psp !== pspFilter) return false
    return true
  })

  const totalSettled = intents.filter(i => i.status === 'SETTLED').reduce((s, i) => s + i.amount, 0)
  const totalProcessing = intents.filter(i => ['PROCESSING', 'AUTHORIZED', 'CAPTURED'].includes(i.status)).reduce((s, i) => s + i.amount, 0)

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#0D0F1A] rounded-xl border border-green-500/20 p-3">
          <div className="text-xs text-gray-500 mb-1">Avvecklat (SEK)</div>
          <div className="text-[16px] font-bold text-green-400">
            {new Intl.NumberFormat('sv-SE', { notation: 'compact' }).format(totalSettled / 100)}
          </div>
        </div>
        <div className="bg-[#0D0F1A] rounded-xl border border-blue-500/20 p-3">
          <div className="text-xs text-gray-500 mb-1">Under behandling</div>
          <div className="text-[16px] font-bold text-blue-400">
            {new Intl.NumberFormat('sv-SE', { notation: 'compact' }).format(totalProcessing / 100)}
          </div>
        </div>
        <div className="bg-[#0D0F1A] rounded-xl border border-red-500/20 p-3">
          <div className="text-xs text-gray-500 mb-1">Misslyckade</div>
          <div className="text-[16px] font-bold text-red-400">
            {intents.filter(i => i.status === 'FAILED').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-1 p-0.5 bg-[#0D0F1A] rounded-lg border border-white/[0.06]">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${statusFilter === 'all' ? 'bg-brand-accent/20 text-brand-accent' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Alla
          </button>
          {(['CREATED', 'PROCESSING', 'AUTHORIZED', 'CAPTURED', 'SETTLED', 'FAILED', 'REFUNDED'] as PaymentStatus[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${statusFilter === s ? `${PAYMENT_STATUS_CONFIG[s].bg} ${PAYMENT_STATUS_CONFIG[s].color}` : 'text-gray-500 hover:text-gray-300'}`}
            >
              {PAYMENT_STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-0.5 bg-[#0D0F1A] rounded-lg border border-white/[0.06]">
          {(['all', 'revolut', 'stripe'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPspFilter(p)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${pspFilter === p ? 'bg-brand-accent/20 text-brand-accent' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {p === 'all' ? 'Alla PSP' : p === 'revolut' ? '💳 Revolut' : '⚡ Stripe'}
            </button>
          ))}
        </div>
      </div>

      {/* Status pipeline visual */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {STATUS_ORDER.map((s, i) => {
          const sc = PAYMENT_STATUS_CONFIG[s]
          const count = intents.filter(i => i.status === s).length
          return (
            <div key={s} className="flex items-center gap-1 flex-shrink-0">
              <div className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${sc.bg} ${sc.color}`}>
                {sc.label} ({count})
              </div>
              {i < STATUS_ORDER.length - 1 && <span className="text-gray-700">→</span>}
            </div>
          )
        })}
      </div>

      {/* Detail panel */}
      {selected && (
        <PaymentIntentDetail
          intent={selected}
          onClose={() => setSelected(null)}
          onRefund={handleRefund}
        />
      )}

      {/* Table */}
      <div className="bg-[#0D0F1A] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_120px_90px_80px] gap-3 px-4 py-2.5 border-b border-white/[0.06] text-xs text-gray-600 font-mono uppercase tracking-wider">
          <span>Beskrivning</span>
          <span>Belopp</span>
          <span>Status</span>
          <span>PSP</span>
          <span>Datum</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {filtered.map(intent => {
            const sc = PAYMENT_STATUS_CONFIG[intent.status]
            return (
              <button
                key={intent.id}
                onClick={() => setSelected(selected?.id === intent.id ? null : intent)}
                className={`w-full text-left grid grid-cols-[1fr_100px_120px_90px_80px] gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors ${selected?.id === intent.id ? 'bg-brand-accent/5' : ''}`}
              >
                <div>
                  <div className="text-xs text-gray-200 truncate">{intent.description}</div>
                  <div className="text-xs text-gray-600">{intent.entity}</div>
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-xs font-semibold text-white">
                    {new Intl.NumberFormat('sv-SE').format(intent.amount / 100)}
                  </span>
                  <span className="text-xs text-gray-600">{intent.currency}</span>
                </div>
                <div className="flex items-center">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color}`}>
                    {sc.label}
                  </span>
                </div>
                <div className="flex items-center text-xs text-gray-400">
                  {intent.psp === 'revolut' ? '💳' : '⚡'} {intent.psp}
                </div>
                <div className="flex items-center text-xs text-gray-600 font-mono">
                  {new Date(intent.createdAt).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function PSPRouterSection() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Revolut card */}
        <div className="bg-[#0D0F1A] rounded-xl border border-blue-500/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">💳</span>
            <div>
              <h4 className="text-sm font-bold text-white">Revolut Business</h4>
              <p className="text-xs text-gray-500">Intercompany + EUR/AED</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              Aktiv
            </div>
          </div>
          <div className="space-y-2">
            {PSP_RULES.filter(r => r.psp === 'revolut').map((rule, i) => (
              <div key={i} className="bg-[#07080F] rounded-lg p-2.5">
                <div className="text-xs font-medium text-blue-300 mb-1">{rule.condition}</div>
                <div className="text-xs text-gray-500 mb-1.5">{rule.reason}</div>
                <div className="flex flex-wrap gap-1">
                  {rule.examples.map(ex => (
                    <span key={ex} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stripe card */}
        <div className="bg-[#0D0F1A] rounded-xl border border-purple-500/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⚡</span>
            <div>
              <h4 className="text-sm font-bold text-white">Stripe</h4>
              <p className="text-xs text-gray-500">Kundbetalningar + fakturering</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              Aktiv
            </div>
          </div>
          <div className="space-y-2">
            {PSP_RULES.filter(r => r.psp === 'stripe').map((rule, i) => (
              <div key={i} className="bg-[#07080F] rounded-lg p-2.5">
                <div className="text-xs font-medium text-purple-300 mb-1">{rule.condition}</div>
                <div className="text-xs text-gray-500 mb-1.5">{rule.reason}</div>
                <div className="flex flex-wrap gap-1">
                  {rule.examples.map(ex => (
                    <span key={ex} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rule matrix */}
      <div className="bg-[#0D0F1A] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h4 className="text-xs font-semibold text-white">Regelmatris — Belopp / Valuta / Typ → PSP</h4>
        </div>
        <div className="grid grid-cols-[1fr_80px_1fr_80px] gap-0">
          <div className="px-4 py-2 bg-white/[0.03] text-xs text-gray-600 font-mono uppercase tracking-wider border-b border-white/[0.06]">Typ</div>
          <div className="px-4 py-2 bg-white/[0.03] text-xs text-gray-600 font-mono uppercase tracking-wider border-b border-white/[0.06]">Valuta</div>
          <div className="px-4 py-2 bg-white/[0.03] text-xs text-gray-600 font-mono uppercase tracking-wider border-b border-white/[0.06]">Belopp</div>
          <div className="px-4 py-2 bg-white/[0.03] text-xs text-gray-600 font-mono uppercase tracking-wider border-b border-white/[0.06]">PSP</div>
          {[
            { typ: 'Intercompany', valuta: 'EUR / SEK', belopp: 'Alla', psp: 'revolut' as PSP },
            { typ: 'Leverantör', valuta: 'EUR / AED', belopp: 'Alla', psp: 'revolut' as PSP },
            { typ: 'Kundbetalning', valuta: 'SEK', belopp: '<500k/mån', psp: 'stripe' as PSP },
            { typ: 'Prenumeration', valuta: 'SEK / EUR', belopp: 'Alla', psp: 'stripe' as PSP },
            { typ: 'Enterprise', valuta: 'Alla', belopp: '>500k/mån', psp: 'revolut' as PSP },
            { typ: 'Faktura', valuta: 'SEK', belopp: 'Alla', psp: 'stripe' as PSP },
          ].map((row, i) => (
            <>
              <div key={`${i}-typ`} className={`px-4 py-2.5 text-xs text-gray-300 border-b border-white/[0.04] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>{row.typ}</div>
              <div key={`${i}-val`} className={`px-4 py-2.5 text-xs text-gray-400 font-mono border-b border-white/[0.04] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>{row.valuta}</div>
              <div key={`${i}-bel`} className={`px-4 py-2.5 text-xs text-gray-400 border-b border-white/[0.04] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>{row.belopp}</div>
              <div key={`${i}-psp`} className={`px-4 py-2.5 border-b border-white/[0.04] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  row.psp === 'revolut'
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                    : 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                }`}>
                  {row.psp === 'revolut' ? '💳 Revolut' : '⚡ Stripe'}
                </span>
              </div>
            </>
          ))}
        </div>
      </div>
    </div>
  )
}

function PayoutsSection() {
  const { isAdmin } = useRole()
  const [payouts, setPayouts] = useState(PAYOUTS)

  function approvePayout(id: string) {
    setPayouts(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'approved' as PayoutStatus, approvedBy: 'Erik Svensson' } : p
    ))
  }

  const totalPending = payouts.filter(p => p.status === 'pending' || p.status === 'approved')
    .reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
          Att betala ut: {new Intl.NumberFormat('sv-SE').format(totalPending)} SEK/EUR
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0D0F1A] border border-white/[0.06] text-xs text-gray-400">
          {payouts.filter(p => p.status === 'pending').length} väntar godkännande
        </div>
        {!isAdmin && (
          <div className="ml-auto text-xs text-gray-600 font-mono">
            Godkännande kräver admin-roll
          </div>
        )}
      </div>

      <div className="space-y-2">
        {payouts.map(payout => {
          const sc = PAYOUT_STATUS_CONFIG[payout.status]
          return (
            <div
              key={payout.id}
              className={`bg-[#0D0F1A] rounded-xl border p-4 ${
                payout.status === 'pending' ? 'border-yellow-500/20' : 'border-white/[0.06]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <span className="text-xs font-medium text-gray-200 leading-tight">{payout.recipient}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${sc.bg} ${sc.color}`}>
                      {sc.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{payout.description}</p>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-white">
                      {new Intl.NumberFormat('sv-SE').format(payout.amount)} {payout.currency}
                    </span>
                    <span className="text-xs text-gray-600 font-mono">
                      Schemalagt: {new Date(payout.scheduledAt).toLocaleDateString('sv-SE')}
                    </span>
                    {payout.approvedBy && (
                      <span className="text-xs text-gray-600">
                        Godkänd av: {payout.approvedBy}
                      </span>
                    )}
                  </div>
                </div>
                {payout.status === 'pending' && isAdmin && (
                  <button
                    onClick={() => approvePayout(payout.id)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors"
                  >
                    ✓ Godkänn
                  </button>
                )}
                {payout.status === 'pending' && !isAdmin && (
                  <div className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs text-gray-600 bg-white/[0.03] border border-white/[0.06]">
                    🔒 Admin krävs
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────────

type Section = 'intents' | 'router' | 'payouts'

const SECTIONS: Array<{ id: Section; label: string; icon: string }> = [
  { id: 'intents', label: 'Payment Intents', icon: '💫' },
  { id: 'router',  label: 'PSP-router',      icon: '🔀' },
  { id: 'payouts', label: 'Utbetalningar',   icon: '📤' },
]

export function PaymentProcessor() {
  const [activeSection, setActiveSection] = useState<Section>('intents')
  const { activeEntity } = useEntityScope()

  return (
    <div className="space-y-4">
      {/* Entity context */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium w-fit"
        style={{
          background: activeEntity.color + '15',
          border: `1px solid ${activeEntity.color}30`,
          color: activeEntity.color,
        }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: activeEntity.color }} />
        {activeEntity.name}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeSection === s.id
                ? 'bg-brand-accent/15 text-brand-accent border border-brand-accent/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <span>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      {activeSection === 'intents' && <PaymentIntentsSection />}
      {activeSection === 'router'  && <PSPRouterSection />}
      {activeSection === 'payouts' && <PayoutsSection />}
    </div>
  )
}
