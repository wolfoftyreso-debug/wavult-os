import { useState, useEffect } from 'react'
import { ModuleHeader, SectionIllustration } from '../../shared/illustrations/ModuleIllustration'

interface FlowItem { id: string; description: string; amount: number; currency: string; type: 'in' | 'out'; date: string; status: 'completed' | 'pending' | 'failed' }

function useFinanceFlow() {
  const [items, setItems] = useState<FlowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 8000)
    fetch('/api/finance/flow', { signal: controller.signal })
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { setItems(d.items ?? []); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
      .finally(() => clearTimeout(t))
    return () => { controller.abort(); clearTimeout(t) }
  }, [])
  return { items, loading, error }
}

export default function FinanceFlow() {
  const { items, loading, error } = useFinanceFlow()

  const totalIn  = items.filter(i => i.type === 'in'  && i.status === 'completed').reduce((s, i) => s + i.amount, 0)
  const totalOut = items.filter(i => i.type === 'out' && i.status === 'completed').reduce((s, i) => s + i.amount, 0)

  return (
    <div className="wv-module-enter">
      <ModuleHeader
        route="/finance-flow"
        label="Finance"
        title="Kapitalflöde"
        description="In- och utbetalningar i realtid"
        illustrationSize="md"
      />

      {loading && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {[1, 2].map(i => <div key={i} className="wv-skeleton" style={{ flex: 1, height: 72, borderRadius: 10 }} />)}
          </div>
          {[1,2,3,4].map(i => <div key={i} className="wv-skeleton" style={{ height: 52, marginBottom: 8, borderRadius: 8 }} />)}
        </div>
      )}

      {error && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>Kunde inte hämta kapitalflöde</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{error}</div>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <SectionIllustration route="/finance-flow" title="Inga transaktioner ännu" description="Koppla en betalningsintegration för att se kapitalflödet" />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Totalt in', value: totalIn,  color: '#16a34a', sign: '+' },
              { label: 'Totalt ut', value: totalOut, color: 'var(--color-brand)', sign: '-' },
            ].map(({ label, value, color, sign }, i) => (
              <div
                key={label}
                className={`wv-card-enter wv-stagger-${i + 1}`}
                style={{ flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '16px 20px' }}
              >
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>{label}</div>
                <div className="wv-count-up" style={{ fontSize: 24, fontWeight: 800, color }}>
                  {sign}{value.toLocaleString('sv-SE')} kr
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item, i) => (
              <div
                key={item.id}
                className={`wv-list-item-enter ${item.type === 'in' ? 'wv-money-in' : 'wv-money-out'} wv-stagger-${Math.min(i + 1, 6)}`}
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <div className="wv-live-dot" style={{ background: item.type === 'in' ? '#16a34a' : 'var(--color-brand)' }} />
                <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)' }}>{item.description}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: item.type === 'in' ? '#16a34a' : 'var(--color-brand)' }}>
                  {item.type === 'in' ? '+' : '-'}{item.amount.toLocaleString('sv-SE')} {item.currency}
                </span>
                <span style={{ fontSize: 11, color: item.status === 'pending' ? 'var(--color-warning)' : item.status === 'failed' ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
