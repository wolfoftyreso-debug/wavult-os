import { CheckCircle } from 'lucide-react'

interface SplitLine {
  recipient: string
  type: string
  percentage: number
  amount: number
  status: 'completed' | 'pending'
}

const DEMO_TRANSACTION = {
  id: 'tx_001',
  type: 'Landvex Subscription',
  grossAmount: 14900,
  currency: 'SEK',
  from: 'Nacka Kommun',
  status: 'split_executed',
  splits: [
    { recipient: 'FinanceCo', type: 'Finance fee', percentage: 2.5, amount: 372.50, status: 'completed' },
    { recipient: 'DevOps Company', type: 'Devops fee', percentage: 10, amount: 1490, status: 'completed' },
    { recipient: 'Wavult Group', type: 'IP Royalty', percentage: 8, amount: 1192, status: 'completed' },
    { recipient: 'Quixzoom UAB', type: 'Data cost', percentage: 7, amount: 1043, status: 'completed' },
    { recipient: 'Landvex AB', type: 'Net revenue', percentage: 72.5, amount: 10802.50, status: 'completed' },
  ] as SplitLine[],
}

export function FinanceFlow() {
  const tx = DEMO_TRANSACTION

  return (
    <div className="flex flex-col h-full" style={{ background: '#F2F2F7' }}>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>Flow Trace</div>
        <div style={{ fontSize: 13, color: '#8E8E93' }}>Spåra en transaktion genom hela systemet</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>

          {/* Incoming */}
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Inkommande betalning</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>{tx.from}</div>
                <div style={{ fontSize: 13, color: '#8E8E93' }}>{tx.type}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E' }}>{tx.grossAmount.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#8E8E93' }}>{tx.currency}</div>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
            <div style={{ width: 2, height: 20, background: 'rgba(0,0,0,0.1)' }} />
          </div>

          {/* FinanceCo hub */}
          <div style={{ background: '#2563EB', borderRadius: 16, padding: '16px 20px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>FinanceCo — Central hub</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>Beräknar splits →</div>
            </div>
            <CheckCircle style={{ width: 24, height: 24, color: 'rgba(255,255,255,0.8)' }} />
          </div>

          {/* Arrow */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
            <div style={{ width: 2, height: 20, background: 'rgba(0,0,0,0.1)' }} />
          </div>

          {/* Splits */}
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            {tx.splits.map((split, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', padding: '14px 16px',
                borderBottom: i < tx.splits.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: split.status === 'completed' ? '#34C759' : '#FF9500', marginRight: 12, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1C1C1E' }}>{split.recipient}</div>
                  <div style={{ fontSize: 12, color: '#8E8E93' }}>{split.type}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: i === tx.splits.length - 1 ? '#2563EB' : '#1C1C1E' }}>
                    {split.amount.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: 11, color: '#8E8E93' }}>{split.percentage}%</div>
                </div>
              </div>
            ))}

            {/* Total check */}
            <div style={{ padding: '12px 16px', background: '#34C75908', borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#34C759' }}>✓ Split = 100.0%</span>
              <span style={{ fontSize: 12, color: '#8E8E93' }}>{tx.splits.reduce((sum, s) => sum + s.amount, 0).toLocaleString('sv-SE', { maximumFractionDigits: 2 })} {tx.currency}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
