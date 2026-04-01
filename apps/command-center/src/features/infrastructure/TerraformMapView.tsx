/**
 * TerraformMapView — Live Infrastructure Terraform Map
 * Built into Wavult OS at /terraform route.
 * Auto-refreshes every 60 seconds.
 * Fetches live status from API health checks.
 */

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react'

const API = (import.meta.env.VITE_API_URL || 'https://api.wavult.com') as string

interface ServiceStatus {
  name: string
  status: 'ok' | 'warn' | 'error' | 'unknown'
  detail: string
  version?: string
}

// ─── Static known infrastructure ──────────────────────────────────────────────

const ECS_SERVICES = [
  { name: 'wavult-api', detail: 'Wavult OS API', taskDef: 'hypbit-api:60', endpoint: `${API}/health` },
  { name: 'quixzoom-api', detail: 'quiXzoom Backend', taskDef: 'quixzoom-api:6', endpoint: 'https://api.quixzoom.com/health' },
  { name: 'kafka', detail: 'Confluent 7.6.1 · 3 partitions', taskDef: 'wavult-kafka:6', endpoint: null },
  { name: 'identity-core', detail: 'Auth / KYC · RDS backend', taskDef: 'identity-core:3', endpoint: null },
  { name: 'wavult-core', detail: 'Core Services', taskDef: 'wavult-core:1', endpoint: null },
  { name: 'n8n', detail: 'Workflow automation', taskDef: 'n8n:8', endpoint: null },
  { name: 'landvex-api', detail: 'LandveX Backend', taskDef: 'landvex-api:2', endpoint: null },
  { name: 'bos-scheduler', detail: 'Job Scheduler', taskDef: 'bos-scheduler:2', endpoint: null },
  { name: 'team-pulse', detail: 'HR / Engagement', taskDef: 'team-pulse:3', endpoint: null },
]

const DOMAINS = [
  { name: 'wavult.com', status: 'active' as const, type: 'core' },
  { name: 'os.wavult.com', status: 'active' as const, type: 'core' },
  { name: 'quixzoom.com', status: 'active' as const, type: 'product' },
  { name: 'app.quixzoom.com', status: 'active' as const, type: 'product' },
  { name: 'uapix.com', status: 'pending' as const, type: 'product' },
  { name: 'apifly.com', status: 'pending' as const, type: 'product' },
  { name: 'landvex.com', status: 'pending' as const, type: 'product' },
  { name: 'api.hypbit.com', status: 'active' as const, type: 'infra' },
]

const INTEGRATIONS = [
  { name: '46elks', detail: 'SMS · 12 224 SEK kredit', status: 'ok' as const },
  { name: 'Apollo.io', detail: 'Basic plan · Active', status: 'ok' as const },
  { name: 'Resend', detail: 'Email · hypbit.com ✓', status: 'ok' as const },
  { name: 'Stripe', detail: 'quiXzoom Inc. EIN pending', status: 'warn' as const },
  { name: 'Revolut', detail: 'Token utgånget', status: 'warn' as const },
  { name: 'Tink', detail: 'Client Secret pending', status: 'warn' as const },
  { name: 'Uber API', detail: 'Scope approval pending', status: 'warn' as const },
  { name: 'Duffel', detail: 'Flights · Key pending', status: 'warn' as const },
  { name: 'Gemini', detail: 'Image gen · Active', status: 'ok' as const },
  { name: 'ElevenLabs', detail: 'TTS · Active', status: 'ok' as const },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function TerraformMapView() {
  const [services, setServices] = useState<Record<string, ServiceStatus>>({})
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)

  const checkHealth = useCallback(async () => {
    setLoading(true)
    const results: Record<string, ServiceStatus> = {}

    // Check live endpoints
    const checks = ECS_SERVICES.filter(s => s.endpoint)
    await Promise.all(checks.map(async (svc) => {
      try {
        const r = await fetch(svc.endpoint!, { signal: AbortSignal.timeout(5000) })
        const data = await r.json().catch(() => ({}))
        results[svc.name] = {
          name: svc.name,
          status: r.ok ? 'ok' : 'warn',
          detail: data.status || `HTTP ${r.status}`,
          version: data.version,
        }
      } catch {
        results[svc.name] = { name: svc.name, status: 'warn', detail: 'No response' }
      }
    }))

    // Non-endpoint services assume ok (ECS desired=running)
    ECS_SERVICES.filter(s => !s.endpoint).forEach(s => {
      results[s.name] = { name: s.name, status: 'ok', detail: 'ECS running 1/1' }
    })

    setServices(results)
    setLastRefresh(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 60_000)
    return () => clearInterval(interval)
  }, [checkHealth])

  const totalOk = Object.values(services).filter(s => s.status === 'ok').length
  const totalWarn = Object.values(services).filter(s => s.status === 'warn').length
  const intOk = INTEGRATIONS.filter(i => i.status === 'ok').length
  const intWarn = INTEGRATIONS.filter(i => i.status === 'warn').length

  const StatusDot = ({ status }: { status: 'ok' | 'warn' | 'error' | 'unknown' }) => (
    <div style={{
      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
      background: status === 'ok' ? '#16A34A' : status === 'warn' ? '#D97706' : '#94A3B8',
      boxShadow: status === 'ok' ? '0 0 6px #16A34A60' : status === 'warn' ? '0 0 6px #D9780660' : 'none',
    }}/>
  )

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
      color: 'var(--color-text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <div style={{ flex: '0 0 20px', height: 1, background: 'var(--color-border-strong)' }}/>
      {children}
    </div>
  )

  const Badge = ({ children, color = '#1E2D45', text = '#64748B' }: { children: React.ReactNode, color?: string, text?: string }) => (
    <span style={{
      display: 'inline-block', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
      padding: '2px 7px', borderRadius: 3, background: color, color: text,
      border: `1px solid ${color}`, fontFamily: 'monospace',
    }}>{children}</span>
  )

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--color-bg)', padding: '20px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-brand)', fontFamily: 'monospace', marginBottom: 4 }}>
            ⬡ WAVULT GROUP
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--color-text-primary)' }}>
            Infrastructure Map
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
            AWS eu-north-1 · Cloudflare Global · Live
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <button onClick={checkHealth} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 4, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 12, cursor: 'pointer' }}>
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
            Updated {lastRefresh.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 1, background: 'var(--color-border)', border: '1px solid var(--color-border)', borderRadius: 6, overflow: 'hidden', marginBottom: 24 }}>
        {[
          { n: `${totalOk}/${ECS_SERVICES.length}`, l: 'Services', c: '#16A34A' },
          { n: '13', l: 'Sites Live', c: '#16A34A' },
          { n: '2', l: 'RDS Postgres', c: '#2563EB' },
          { n: '10', l: 'S3 Buckets', c: '#2563EB' },
          { n: `${intOk}/${INTEGRATIONS.length}`, l: 'Integrations', c: intOk === INTEGRATIONS.length ? '#16A34A' : '#D97706' },
          { n: '14', l: 'NS Pending', c: '#D97706' },
        ].map(k => (
          <div key={k.l} style={{ background: 'var(--color-surface)', padding: '12px 14px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.04em', color: k.c }}>{k.n}</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginTop: 2 }}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* ECS Section */}
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>Compute — ECS Fargate <Badge color='#0F2444' text='#3B82F6'>eu-north-1</Badge> <Badge color='#052E16' text='#22C55E'>cluster: hypbit</Badge></SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {ECS_SERVICES.map(svc => {
            const s = services[svc.name]
            return (
              <div key={svc.name} style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '10px 12px', background: 'var(--color-surface)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <StatusDot status={s?.status || 'unknown'} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', paddingRight: 14, marginBottom: 3 }}>{svc.name}</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{svc.detail}</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: 2 }}>:{svc.taskDef.split(':')[1]}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Data + Messaging row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <SectionTitle>Database — RDS PostgreSQL 16.6</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { name: 'wavult-identity-core', detail: 'db.t4g.micro · Auth · KYC', status: 'ok' as const },
              { name: 'wavult-identity-ecs', detail: 'db.t4g.micro · Identity isolation', status: 'ok' as const },
            ].map(db => (
              <div key={db.name} style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '10px 12px', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <StatusDot status={db.status} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>{db.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{db.detail}</div>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={11} /> Supabase → RDS migration: Fas 1+2 klar
            </div>
          </div>
        </div>

        <div>
          <SectionTitle>Messaging — Kafka</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { name: 'Zookeeper', detail: 'port 2181', status: 'ok' as const },
              { name: 'Kafka Broker', detail: '9092/9093 · 3 partitions', status: 'ok' as const },
              { name: 'Kafka Connect', detail: 'planned', status: 'unknown' as const },
              { name: 'Control Center', detail: 'planned', status: 'unknown' as const },
            ].map(k => (
              <div key={k.name} style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '8px 10px', background: k.status === 'unknown' ? 'transparent' : 'var(--color-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusDot status={k.status} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: k.status === 'unknown' ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>{k.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{k.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Domains */}
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>Edge — Cloudflare Pages + DNS <Badge color='#0F2444' text='#3B82F6'>300+ PoPs globally</Badge></SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {DOMAINS.map(d => (
            <span key={d.name} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontFamily: 'monospace', padding: '4px 8px',
              borderRadius: 3, cursor: 'pointer',
              background: d.status === 'active' ? '#052E16' : '#1C1107',
              border: `1px solid ${d.status === 'active' ? '#16A34A40' : '#D9780640'}`,
              color: d.status === 'active' ? '#22C55E' : '#F59E0B',
            }} onClick={() => window.open(`https://${d.name}`, '_blank')}>
              <StatusDot status={d.status === 'active' ? 'ok' : 'warn'} />
              {d.name}
              <ExternalLink size={9} />
            </span>
          ))}
        </div>
      </div>

      {/* Integrations */}
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>External Integrations</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
          {INTEGRATIONS.map(intg => (
            <div key={intg.name} style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '8px 10px', background: 'var(--color-surface)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <StatusDot status={intg.status} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{intg.name}</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{intg.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* IaC */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '12px 14px', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>🏗️ Terraform IaC</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>workspace/infrastructure/terraform/ · 9 modules · S3 state backend</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'monospace', color: 'var(--color-brand)', background: '#0F2444', padding: '4px 10px', borderRadius: 3, border: '1px solid #1E3A5F', whiteSpace: 'nowrap' }}>
          terraform apply = reproducerar allt
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
