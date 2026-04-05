import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

interface RevenueMetrics {
  mrr: number
  arr: number
  activeMissions: number
  completedThisMonth: number
  totalZoomers: number
  activeZoomers: number
  pendingPayouts: number
}

const FALLBACK_METRICS: RevenueMetrics = {
  mrr: 18750,
  arr: 225000,
  activeMissions: 12,
  completedThisMonth: 8,
  totalZoomers: 47,
  activeZoomers: 23,
  pendingPayouts: 42188,
}

export function RevenueDashboard() {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)

  useEffect(() => {
    async function fetchMetrics() {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 8000)
      try {
        const [missRes, zoomerRes] = await Promise.all([
          window.fetch('https://api.wavult.com/v1/missions', { signal: controller.signal }),
          window.fetch('https://api.wavult.com/v1/zoomers', { signal: controller.signal }),
        ])

        const missions = missRes.ok ? await missRes.json() : []
        const zoomers = zoomerRes.ok ? await zoomerRes.json() : []

        const mArr = Array.isArray(missions) ? missions : []
        const zArr = Array.isArray(zoomers) ? zoomers : []

        const completedThisMonth = mArr.filter((m: Record<string, unknown>) => m.status === 'approved').length
        const avgReward = mArr.length > 0
          ? mArr.reduce((s: number, m: Record<string, unknown>) => s + ((m.reward as number) || 85), 0) / mArr.length
          : 85
        const mrr = completedThisMonth * avgReward * 0.25 // Wavults 25% cut

        setMetrics({
          mrr,
          arr: mrr * 12,
          activeMissions: mArr.filter((m: Record<string, unknown>) => ['open', 'accepted', 'in_progress'].includes(m.status as string)).length,
          completedThisMonth,
          totalZoomers: zArr.length,
          activeZoomers: zArr.filter((z: Record<string, unknown>) => z.status === 'active').length,
          pendingPayouts: mArr.filter((m: Record<string, unknown>) => m.status === 'approved').length * avgReward * 0.75,
        })
      } catch {
        setMetrics(FALLBACK_METRICS)
        setUsingFallback(true)
      } finally {
        clearTimeout(t)
        setLoading(false)
      }
    }

    fetchMetrics()
    const i = setInterval(fetchMetrics, 120000) // refresh every 2 min
    return () => clearInterval(i)
  }, [])

  if (loading) return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: '20px 24px', marginBottom: 20, textAlign: 'center', color: '#8E8E93', fontSize: 13 }}>
      Laddar intäktsdata…
    </div>
  )

  if (!metrics) return null

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n))

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: '20px 24px', marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Live Revenue</div>
      {usingFallback && (
        <div style={{ marginBottom: 12, padding: '6px 12px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
          Visar exempelintäkter · Live-data ej tillgänglig
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'MRR', value: `${fmt(metrics.mrr)} SEK`, sub: 'denna månad', icon: <DollarSign size={14} /> },
          { label: 'Aktiva uppdrag', value: String(metrics.activeMissions), sub: `${metrics.completedThisMonth} klara`, icon: <TrendingUp size={14} /> },
          { label: 'Zoomers', value: `${metrics.activeZoomers}/${metrics.totalZoomers}`, sub: 'aktiva/totalt', icon: <TrendingUp size={14} /> },
          { label: 'Utbetalningar', value: `${fmt(metrics.pendingPayouts)} SEK`, sub: 'väntande', icon: <TrendingDown size={14} /> },
        ].map(card => (
          <div key={card.label}>
            <div style={{ fontSize: 11, color: '#8E8E93', marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', fontVariantNumeric: 'tabular-nums' }}>{card.value}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{card.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
