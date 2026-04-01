import { ArrowRight } from 'lucide-react'

interface PaymentFlowTraceProps {
  amount: number
  currency: string
  counterparty: string
  entity: string  // receiving entity
  title: string
}

const SPLIT_RULES: Record<string, Array<{ entity: string; short: string; percent: number; color: string }>> = {
  'Landvex AB': [
    { entity: 'FinanceCo FZCO', short: 'FCO', percent: 2.5, color: '#10B981' },
    { entity: 'DevOps FZCO', short: 'DVO', percent: 10, color: '#1E40AF' },
    { entity: 'Wavult Group FZCO', short: 'WGH', percent: 8, color: '#6366F1' },
    { entity: 'Landvex AB (netto)', short: 'LVX-SE', percent: 79.5, color: '#3B82F6' },
  ],
  'Landvex Inc': [
    { entity: 'FinanceCo FZCO', short: 'FCO', percent: 2.5, color: '#10B981' },
    { entity: 'DevOps FZCO', short: 'DVO', percent: 10, color: '#1E40AF' },
    { entity: 'Wavult Group FZCO', short: 'WGH', percent: 8, color: '#6366F1' },
    { entity: 'Landvex Inc (netto)', short: 'LVX-US', percent: 79.5, color: '#F59E0B' },
  ],
  'QuiXzoom UAB': [
    { entity: 'FinanceCo FZCO', short: 'FCO', percent: 2.5, color: '#10B981' },
    { entity: 'DevOps FZCO', short: 'DVO', percent: 10, color: '#1E40AF' },
    { entity: 'Wavult Group FZCO', short: 'WGH', percent: 8, color: '#6366F1' },
    { entity: 'QuiXzoom UAB (netto)', short: 'QZ-EU', percent: 79.5, color: '#EC4899' },
  ],
  'QuiXzoom Inc': [
    { entity: 'FinanceCo FZCO', short: 'FCO', percent: 2.5, color: '#10B981' },
    { entity: 'DevOps FZCO', short: 'DVO', percent: 10, color: '#1E40AF' },
    { entity: 'Wavult Group FZCO', short: 'WGH', percent: 8, color: '#6366F1' },
    { entity: 'QuiXzoom Inc (netto)', short: 'QZ-US', percent: 79.5, color: '#EC4899' },
  ],
}

function formatAmount(amount: number, currency: string): string {
  if (currency === 'SEK') return `${amount.toLocaleString('sv-SE')} kr`
  return `${amount.toFixed(0)} ${currency}`
}

export function PaymentFlowTrace({ amount, currency, counterparty, entity }: PaymentFlowTraceProps) {
  const splits = SPLIT_RULES[entity]

  if (!splits || amount <= 0) return null

  // Only show for incoming payments (positive amount)
  const absAmount = Math.abs(amount)

  return (
    <div style={{ marginTop: 16, padding: '12px 16px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
        Betalningsflöde — automatisk fördelning
      </div>

      {/* Source → Hub */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ padding: '4px 10px', background: '#EEF2FF', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#4338CA' }}>
          {counterparty}
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', fontFamily: 'monospace', fontWeight: 600 }}>
          {formatAmount(absAmount, currency)}
        </div>
        <ArrowRight size={14} style={{ color: '#9CA3AF' }} />
        <div style={{ padding: '4px 10px', background: '#DCFCE7', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#166534' }}>
          FinanceCo FZCO
        </div>
      </div>

      {/* Splits */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${splits.length}, 1fr)`, gap: 6 }}>
        {splits.map((split) => {
          const splitAmount = (absAmount * split.percent) / 100
          return (
            <div
              key={split.entity}
              style={{
                background: '#FFFFFF',
                border: `1px solid ${split.color}33`,
                borderTop: `3px solid ${split.color}`,
                borderRadius: 6,
                padding: '8px 10px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: split.color, marginBottom: 2 }}>{split.short}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#1C1C1E', fontFamily: 'monospace' }}>
                {formatAmount(splitAmount, currency)}
              </div>
              <div style={{ fontSize: 10, color: '#9CA3AF' }}>{split.percent}%</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
