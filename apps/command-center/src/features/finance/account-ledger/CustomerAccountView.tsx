import { useState, useEffect } from 'react'
import { useApi } from '../../../shared/auth/useApi'
import type { CustomerAccount } from './types'

const TYPE_LABELS: Record<string, { label: string; color: string; sign: string }> = {
  invoice:          { label: 'Invoice',          color: '#EF4444', sign: '+' },
  subscription:     { label: 'Subscription',     color: '#EF4444', sign: '+' },
  credit_note:      { label: 'Credit Note',      color: '#10B981', sign: '−' },
  payment_received: { label: 'Payment Received', color: '#10B981', sign: '−' },
  payment_sent:     { label: 'Payment Sent',     color: '#3B82F6', sign: '−' },
  refund:           { label: 'Refund',           color: '#3B82F6', sign: '−' },
}

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Math.abs(amount))
}

function BalanceBadge({ balance, currency }: { balance: number; currency: string }) {
  if (Math.abs(balance) < 0.01) return (
    <span style={{ background: '#D1FAE5', color: '#065F46', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
      ✓ Settled
    </span>
  )
  if (balance > 0) return (
    <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
      Owes {fmt(balance, currency)}
    </span>
  )
  return (
    <span style={{ background: '#DBEAFE', color: '#1E40AF', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
      We owe {fmt(balance, currency)}
    </span>
  )
}

export function CustomerAccountView({ accountId }: { accountId: string }) {
  const { apiFetch } = useApi()
  const [account, setAccount] = useState<CustomerAccount | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`/api/accounts/${accountId}`)
      .then(r => r.json())
      .then(data => { setAccount(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [accountId, apiFetch])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading account...</div>
  if (!account) return <div style={{ padding: 40, textAlign: 'center', color: '#EF4444' }}>Account not found</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Account Header */}
      <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '28px 32px', marginBottom: 24, color: '#F5F0E8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#C9A84C', textTransform: 'uppercase', marginBottom: 8 }}>
              Customer Account
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{account.name}</h2>
            <div style={{ color: 'rgba(245,240,232,.6)', fontSize: 13, marginTop: 4 }}>{account.email} · {account.country}</div>
          </div>
          <BalanceBadge balance={account.net_balance} currency={account.currency} />
        </div>

        {/* Summary row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 24 }}>
          {[
            { label: 'Total Invoiced', value: fmt(account.total_debit, account.currency), color: '#EF4444' },
            { label: 'Total Credited', value: fmt(account.total_credit, account.currency), color: '#10B981' },
            { label: 'Net Balance', value: fmt(account.net_balance, account.currency),
              color: account.net_balance > 0.01 ? '#EF4444' : account.net_balance < -0.01 ? '#3B82F6' : '#10B981' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,.05)', borderRadius: 8, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, color: 'rgba(245,240,232,.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Auto-pay alert */}
        {account.net_balance < -account.credit_threshold && (
          <div style={{ marginTop: 16, background: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.3)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#93C5FD' }}>
            ⚡ Auto-payment via Revolut triggered — {fmt(Math.abs(account.net_balance), account.currency)} will be sent to {account.email}
          </div>
        )}
      </div>

      {/* Transaction Ledger */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E4DC', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E8E4DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>Transaction Ledger</h3>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>{account.transactions.length} transactions</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9F7F4' }}>
              {['Date', 'Description', 'Type', 'Amount', 'Status', 'Receipt'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {account.transactions.map((tx, i) => {
              const meta = TYPE_LABELS[tx.type] ?? { label: tx.type, color: '#6B7280', sign: '' }
              const isDebit = tx.amount > 0
              return (
                <tr key={tx.id} style={{ borderTop: '1px solid #F0EDE6', background: i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6B7280', whiteSpace: 'nowrap' }}>{tx.date}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#1a1a2e', fontWeight: 500 }}>
                    {tx.description}
                    <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>{tx.reference}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: meta.color + '18', color: meta.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                      {meta.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: isDebit ? '#EF4444' : '#10B981', whiteSpace: 'nowrap' }}>
                    {isDebit ? '+' : '−'}{fmt(tx.amount, tx.currency)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: tx.status === 'confirmed' ? '#D1FAE5' : tx.status === 'pending' ? '#FEF3C7' : '#FEE2E2',
                      color: tx.status === 'confirmed' ? '#065F46' : tx.status === 'pending' ? '#92400E' : '#991B1B'
                    }}>
                      {tx.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {tx.receipt_url ? (
                      <a href={tx.receipt_url} target="_blank" rel="noopener noreferrer"
                         style={{ fontSize: 12, color: '#C9A84C', fontWeight: 600, textDecoration: 'none' }}>
                        PDF ↗
                      </a>
                    ) : <span style={{ color: '#D1D5DB', fontSize: 12 }}>—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {account.transactions.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
            No transactions yet on this account.
          </div>
        )}
      </div>
    </div>
  )
}
