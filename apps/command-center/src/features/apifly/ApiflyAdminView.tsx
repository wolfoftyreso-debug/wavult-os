// ─── Apifly Admin Panel — Wavult OS ───────────────────────────────────────────
// Cream #F5F0E8 / Navy #0A3D62 / Gold #E8B84B

import { useState } from 'react'
import { useApiflyAdmin, ApiflyAdminCustomer } from './useApiflyAdmin'

const CREAM = '#F5F0E8'
const NAVY  = '#0A3D62'
const GOLD  = '#E8B84B'

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: CREAM,
      border: `1px solid ${GOLD}22`,
      borderRadius: 12,
      padding: '16px 20px',
    }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: NAVY, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontSize: 26, fontWeight: 700, color: NAVY, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: NAVY, opacity: 0.5, marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

const PLAN_BADGE: Record<string, { bg: string; text: string }> = {
  starter:    { bg: '#dbeafe', text: '#1d4ed8' },
  pro:        { bg: '#fef3c7', text: '#92400e' },
  enterprise: { bg: '#ede9fe', text: '#5b21b6' },
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  active:    { bg: '#dcfce7', text: '#166534' },
  pending:   { bg: '#fef3c7', text: '#92400e' },
  suspended: { bg: '#fee2e2', text: '#991b1b' },
}

function CustomerRow({ c }: { c: ApiflyAdminCustomer }) {
  const plan = PLAN_BADGE[c.plan] || PLAN_BADGE.starter
  const status = STATUS_BADGE[c.status] || STATUS_BADGE.pending
  const pct = c.api_calls_limit > 0 ? Math.min(100, (c.api_calls_this_month / c.api_calls_limit) * 100) : 0

  return (
    <tr style={{ borderBottom: `1px solid ${GOLD}22` }}>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: NAVY }}>{c.email}</div>
        {c.name && <div style={{ fontSize: 11, color: NAVY, opacity: 0.5 }}>{c.name}</div>}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <span style={{
          background: plan.bg, color: plan.text,
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase',
        }}>{c.plan}</span>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <span style={{
          background: status.bg, color: status.text,
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase',
        }}>{c.status}</span>
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <div style={{ fontSize: 12, color: NAVY, fontWeight: 600 }}>
          {parseInt(c.calls_30d, 10).toLocaleString()}
        </div>
        <div style={{ marginTop: 4, height: 4, background: `${NAVY}22`, borderRadius: 2, width: 60, marginLeft: 'auto' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct > 90 ? '#ef4444' : GOLD, borderRadius: 2 }}/>
        </div>
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: NAVY, opacity: 0.7 }}>
        {c.key_count}
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, color: NAVY, opacity: 0.5 }}>
        {new Date(c.created_at).toLocaleDateString('sv-SE')}
      </td>
    </tr>
  )
}

export function ApiflyAdminView() {
  const { stats, customers, loading, error, refresh } = useApiflyAdmin()
  const [planFilter, setPlanFilter] = useState<string>('all')

  const filtered = planFilter === 'all' ? customers : customers.filter(c => c.plan === planFilter)

  if (loading) return (
    <div style={{ padding: 32, color: NAVY, opacity: 0.5, textAlign: 'center' }}>Laddar Apifly-data...</div>
  )

  if (error) return (
    <div style={{ padding: 32, color: '#ef4444', textAlign: 'center' }}>
      Fel: {error}
      <br/>
      <button onClick={refresh} style={{ marginTop: 12, padding: '8px 16px', background: NAVY, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
        Försök igen
      </button>
    </div>
  )

  return (
    <div style={{ padding: '24px 32px', background: '#F9F6F1', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>Apifly Admin</h1>
          <p style={{ fontSize: 13, color: NAVY, opacity: 0.5, marginTop: 4 }}>Kunder, nycklar och API-trafik</p>
        </div>
        <button
          onClick={refresh}
          style={{ padding: '8px 16px', background: NAVY, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          Uppdatera
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
          <StatCard label="Totala kunder" value={stats.total_customers} />
          <StatCard label="Pro-kunder" value={stats.pro_customers} />
          <StatCard label="Enterprise-kunder" value={stats.enterprise_customers} />
          <StatCard label="Aktiva nycklar" value={stats.active_keys} />
          <StatCard label="Anrop 24h" value={parseInt(stats.calls_24h, 10).toLocaleString()} />
          <StatCard label="Anrop 30d" value={parseInt(stats.calls_30d, 10).toLocaleString()} />
          <StatCard label="Intäkt 30d" value={`$${parseFloat(stats.revenue_30d).toFixed(2)}`} />
        </div>
      )}

      {/* Customer table */}
      <div style={{ background: CREAM, borderRadius: 12, border: `1px solid ${GOLD}33`, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${GOLD}22`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: 0 }}>
            Kunder ({filtered.length})
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: NAVY, opacity: 0.5 }}>Filter:</span>
            {['all', 'starter', 'pro', 'enterprise'].map(p => (
              <button
                key={p}
                onClick={() => setPlanFilter(p)}
                style={{
                  padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: planFilter === p ? NAVY : `${NAVY}15`,
                  color: planFilter === p ? '#fff' : NAVY,
                  textTransform: 'capitalize',
                }}
              >
                {p === 'all' ? 'Alla' : p}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '48px 32px', textAlign: 'center', color: NAVY, opacity: 0.4, fontSize: 13 }}>
            Inga kunder att visa
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: `${NAVY}08` }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: NAVY, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>Kund</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: NAVY, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>Plan</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: NAVY, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>Status</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: NAVY, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>Anrop 30d</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: NAVY, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>Nycklar</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: NAVY, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>Kund sedan</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => <CustomerRow key={c.id} c={c} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default ApiflyAdminView
