import { useState, useEffect } from 'react'
import { ModuleHeader, SectionIllustration } from '../../shared/illustrations/ModuleIllustration'

interface ApiRoute { method: string; path: string; description: string; status: 'live' | 'draft' }

const FALLBACK_ROUTES: ApiRoute[] = [
  { method: 'POST', path: '/v1/missions', description: 'Skapa nytt uppdrag', status: 'live' },
  { method: 'GET',  path: '/v1/missions', description: 'Lista alla uppdrag', status: 'live' },
  { method: 'GET',  path: '/v1/zoomers', description: 'Hämta alla zoomers', status: 'live' },
  { method: 'POST', path: '/v1/auth/login', description: 'Inloggning', status: 'live' },
  { method: 'GET',  path: '/v1/objects', description: 'LandveX-objekt', status: 'live' },
  { method: 'POST', path: '/api/voice/inbound', description: 'Röstsamtal webhook', status: 'live' },
  { method: 'GET',  path: '/identity/verify', description: 'KYC-verifiering', status: 'draft' },
  { method: 'POST', path: '/revolut/webhook', description: 'Betalningshändelser', status: 'draft' },
]

function useApiflyRoutes() {
  const [routes, setRoutes] = useState<ApiRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 8000)
    fetch('/api/apifly/routes', { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => { setRoutes(d.routes ?? []); setLoading(false) })
      .catch(() => { setRoutes(FALLBACK_ROUTES); setUsingFallback(true); setLoading(false) })
      .finally(() => clearTimeout(t))
    return () => { controller.abort(); clearTimeout(t) }
  }, [])

  return { routes, loading, usingFallback }
}

const methodColor: Record<string, string> = {
  GET: '#16a34a', POST: '#2563eb', PUT: '#d97706', DELETE: '#dc2626', PATCH: '#7c3aed',
}

export default function ApiflyView() {
  const { routes, loading, usingFallback } = useApiflyRoutes()

  return (
    <div>
      <ModuleHeader
        route="/apifly"
        label="Apifly"
        title="API Gateway"
        description="Hantera och övervaka alla API-rutter"
        illustrationSize="md"
      />

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
          Laddar rutter…
        </div>
      )}

      {!loading && routes.length === 0 && (
        <SectionIllustration route="/apifly" title="Inga rutter konfigurerade" description="Lägg till din första API-rutt för att komma igång" />
      )}

      {!loading && routes.length > 0 && (
        <>
          {usingFallback && (
            <div style={{ marginBottom: 16, padding: '8px 14px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
              Visar konfigurerade API-rutter · Live-sync ej ansluten
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {routes.map((r, i) => (
              <div key={i} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ background: methodColor[r.method] ?? '#666', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, fontFamily: 'monospace', minWidth: 52, textAlign: 'center' }}>{r.method}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--color-text-primary)', flex: 1 }}>{r.path}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.description}</span>
                <span style={{ fontSize: 11, color: r.status === 'live' ? '#16a34a' : 'var(--color-text-muted)', fontWeight: 600 }}>{r.status === 'live' ? '● Live' : '○ Draft'}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
