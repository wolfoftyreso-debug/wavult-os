/**
 * DeploymentPipeline — Visual deployment status
 * 
 * DEV → STAGING → PRODUCTION
 * 
 * Production has a BIG LOCK.
 * Staging needs review before promotion.
 * Dev is where we build.
 */
import { useState, useEffect } from 'react'
import { useApi } from '../../shared/auth/useApi'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ServiceStatus {
  id: string
  name: string
  domain: string
  repo: string
  dev: EnvStatus
  staging: EnvStatus
  production: EnvStatus
}

interface EnvStatus {
  version: string
  commit: string
  deployed_at: string | null
  status: 'live' | 'pending' | 'building' | 'failed' | 'empty'
  url: string
  is_locked: boolean
  pending_approval?: boolean
}

// ── Lock Icon ──────────────────────────────────────────────────────────────────

function Lock({ size = 24, locked = true }: { size?: number; locked?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {locked ? (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" fill="#0A3D62" stroke="#E8B84B" strokeWidth="1.5"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#0A3D62" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="12" cy="16" r="1.5" fill="#E8B84B"/>
        </>
      ) : (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" fill="rgba(10,61,98,.15)" stroke="rgba(10,61,98,.3)" strokeWidth="1.5"/>
          <path d="M7 11V7a5 5 0 0 1 10 0" stroke="rgba(10,61,98,.3)" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="12" cy="16" r="1.5" fill="rgba(10,61,98,.4)"/>
        </>
      )}
    </svg>
  )
}

// ── BigLock ───────────────────────────────────────────────────────────────────

function BigLock() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '12px 16px',
      background: 'rgba(10,61,98,.06)',
      borderRadius: 10,
      border: '1.5px solid rgba(232,184,75,.3)',
    }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="11" width="18" height="11" rx="2" fill="#0A3D62" stroke="#E8B84B" strokeWidth="1.5"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#0A3D62" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="12" cy="16" r="1.5" fill="#E8B84B"/>
      </svg>
      <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color: '#E8B84B', letterSpacing: '.1em' }}>PRODUCTION</span>
      <span style={{ fontSize: 9, color: 'rgba(10,61,98,.5)', fontFamily: 'monospace' }}>DEPLOY GATE</span>
    </div>
  )
}

// ── Env Column ─────────────────────────────────────────────────────────────────

function EnvColumn({ env, label, icon, onPromote, onApprove, canPromote }: {
  env: EnvStatus
  label: string
  icon: React.ReactNode
  onPromote?: () => void
  onApprove?: () => void
  canPromote?: boolean
}) {
  const statusColor = {
    live: '#2D7A4F',
    pending: '#B8760A',
    building: '#2C3E6B',
    failed: '#C0392B',
    empty: 'rgba(10,61,98,.3)',
  }[env.status]

  const statusLabel = {
    live: '● LIVE',
    pending: '◉ AWAITING APPROVAL',
    building: '⟳ BUILDING',
    failed: '✕ FAILED',
    empty: '○ EMPTY',
  }[env.status]

  return (
    <div style={{
      flex: 1, minWidth: 200,
      background: env.status === 'live' ? 'rgba(10,61,98,.04)' : 'rgba(10,61,98,.02)',
      border: `1.5px solid ${env.status === 'live' ? 'rgba(232,184,75,.3)' : 'rgba(10,61,98,.1)'}`,
      borderRadius: 10,
      padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon}
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0A3D62', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</span>
        </div>
        {env.is_locked && <Lock size={16} locked />}
      </div>

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: statusColor }}>
          {statusLabel}
        </span>
      </div>

      {/* Version */}
      {env.version && (
        <div style={{ background: 'rgba(10,61,98,.06)', borderRadius: 6, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: 'rgba(10,61,98,.5)', marginBottom: 2, fontFamily: 'monospace' }}>VERSION</div>
          <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#0A3D62', fontWeight: 700 }}>{env.version}</div>
          {env.commit && (
            <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(10,61,98,.5)', marginTop: 2 }}>
              {env.commit.slice(0, 8)}
            </div>
          )}
          {env.deployed_at && (
            <div style={{ fontSize: 10, color: 'rgba(10,61,98,.4)', marginTop: 4 }}>
              {new Date(env.deployed_at).toLocaleString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      )}

      {/* URL */}
      {env.url && (
        <a href={env.url} target="_blank" rel="noopener noreferrer" style={{
          fontSize: 11, fontFamily: 'monospace', color: '#2C3E6B',
          textDecoration: 'none', wordBreak: 'break-all',
          borderBottom: '1px solid rgba(44,62,107,.2)',
          paddingBottom: 2,
        }}>
          {env.url.replace('https://', '')}
        </a>
      )}

      {/* Actions */}
      {env.status === 'pending' && onApprove && (
        <button onClick={onApprove} style={{
          background: '#E8B84B', color: '#0A3D62', border: 'none',
          padding: '8px 14px', borderRadius: 6, cursor: 'pointer',
          fontSize: 12, fontWeight: 700, fontFamily: 'monospace',
        }}>
          ✓ APPROVE DEPLOY
        </button>
      )}

      {canPromote && onPromote && env.status === 'live' && (
        <button onClick={onPromote} style={{
          background: 'rgba(10,61,98,.08)', color: '#0A3D62',
          border: '1px solid rgba(10,61,98,.2)',
          padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
          fontSize: 11, fontWeight: 600,
        }}>
          → Promote to next
        </button>
      )}
    </div>
  )
}

// ── Arrow ─────────────────────────────────────────────────────────────────────

function Arrow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', color: 'rgba(10,61,98,.3)', fontSize: 20 }}>
      →
    </div>
  )
}

// ── Service Row ────────────────────────────────────────────────────────────────

function ServiceRow({ service }: { service: ServiceStatus }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Service header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#FDFAF5',
          border: '1px solid rgba(10,61,98,.12)',
          borderRadius: expanded ? '8px 8px 0 0' : 8,
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0A3D62' }}>{service.name}</span>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(10,61,98,.5)' }}>{service.domain}</span>
          <a
            href={`https://git.wavult.com/wavult/${service.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ fontSize: 10, color: '#E8B84B', fontFamily: 'monospace', textDecoration: 'none' }}
          >
            git/{service.repo}
          </a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Quick status dots */}
          {(['dev','staging','production'] as const).map(env => (
            <div key={env} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: service[env].status === 'live' ? '#2D7A4F' :
                          service[env].status === 'pending' ? '#E8B84B' :
                          service[env].status === 'failed' ? '#C0392B' : 'rgba(10,61,98,.2)',
            }} title={`${env}: ${service[env].status}`} />
          ))}
          <span style={{ fontSize: 16, color: 'rgba(10,61,98,.3)', marginLeft: 4 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded pipeline */}
      {expanded && (
        <div style={{
          border: '1px solid rgba(10,61,98,.12)', borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          padding: 16,
          background: '#F5F0E8',
          display: 'flex', alignItems: 'stretch', gap: 0,
        }}>
          <EnvColumn
            env={service.dev}
            label="Dev"
            icon={<span style={{ fontSize: 16 }}>🔧</span>}
            canPromote
          />
          <Arrow />
          <EnvColumn
            env={service.staging}
            label="Staging"
            icon={<span style={{ fontSize: 16 }}>🔬</span>}
            canPromote
          />
          <Arrow />
          <div style={{ flex: 1, display: 'flex', gap: 12 }}>
            <BigLock />
            <EnvColumn
              env={service.production}
              label="Production"
              icon={<Lock size={16} />}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function DeploymentPipeline() {
  const { apiFetch } = useApi()
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [loading, setLoading] = useState(true)

  // Default services config
  const DEFAULT_SERVICES: ServiceStatus[] = [
    {
      id: 'wavult-os',
      name: 'Wavult OS',
      domain: 'os.wavult.com',
      repo: 'wavult-os',
      dev:        { version: 'dev', commit: '', deployed_at: null, status: 'live', url: 'https://wavult-os-dev.pages.dev', is_locked: false },
      staging:    { version: '', commit: '', deployed_at: null, status: 'empty', url: 'https://staging.os.wavult.com', is_locked: false },
      production: { version: 'main', commit: '', deployed_at: null, status: 'live', url: 'https://os.wavult.com', is_locked: true },
    },
    {
      id: 'wavult-core',
      name: 'Wavult Core API',
      domain: 'api.wavult.com',
      repo: 'wavult-core',
      dev:        { version: 'dev', commit: '', deployed_at: null, status: 'live', url: 'https://api-dev.wavult.com', is_locked: false },
      staging:    { version: '', commit: '', deployed_at: null, status: 'empty', url: '', is_locked: false },
      production: { version: 'v7', commit: '', deployed_at: null, status: 'live', url: 'https://api.wavult.com', is_locked: true },
    },
    {
      id: 'quixzoom',
      name: 'quiXzoom',
      domain: 'quixzoom.com',
      repo: 'quixzoom.com',
      dev:        { version: '', commit: '', deployed_at: null, status: 'empty', url: '', is_locked: false },
      staging:    { version: '', commit: '', deployed_at: null, status: 'empty', url: '', is_locked: false },
      production: { version: 'live', commit: '', deployed_at: null, status: 'live', url: 'https://quixzoom.com', is_locked: true },
    },
    {
      id: 'landvex',
      name: 'LandveX',
      domain: 'landvex.com',
      repo: 'landvex.com',
      dev:        { version: '', commit: '', deployed_at: null, status: 'empty', url: '', is_locked: false },
      staging:    { version: '', commit: '', deployed_at: null, status: 'empty', url: '', is_locked: false },
      production: { version: 'live', commit: '', deployed_at: null, status: 'live', url: 'https://landvex.com', is_locked: true },
    },
    {
      id: 'mlcs',
      name: 'MLCS Protocol',
      domain: 'mlcs.com',
      repo: 'mlcs.com',
      dev:        { version: 'enterprise-rebuild', commit: '', deployed_at: null, status: 'live', url: '', is_locked: false },
      staging:    { version: '', commit: '', deployed_at: null, status: 'empty', url: '', is_locked: false, pending_approval: false },
      production: { version: '', commit: '', deployed_at: null, status: 'empty', url: 'https://mlcs.com', is_locked: true },
    },
    {
      id: 'cert-integrity',
      name: 'Cert Integrity Engine',
      domain: 'certintegrity.com',
      repo: 'cert-integrity-engine',
      dev:        { version: 'enterprise-rebuild', commit: '', deployed_at: null, status: 'live', url: '', is_locked: false },
      staging:    { version: '', commit: '', deployed_at: null, status: 'empty', url: '', is_locked: false },
      production: { version: '', commit: '', deployed_at: null, status: 'empty', url: '', is_locked: true },
    },
    {
      id: 'lunina',
      name: 'Lunina Foundation',
      domain: 'luninafoundation.pages.dev',
      repo: 'luninafoundation.org',
      dev:        { version: '', commit: '', deployed_at: null, status: 'empty', url: '', is_locked: false },
      staging:    { version: '', commit: '', deployed_at: null, status: 'empty', url: '', is_locked: false },
      production: { version: 'live', commit: '', deployed_at: null, status: 'live', url: 'https://lunina-foundation.pages.dev', is_locked: true },
    },
  ]

  useEffect(() => {
    // Try to get real data, fall back to defaults
    apiFetch('/api/deployments/status')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.services) { setServices(data.services) } else { setServices(DEFAULT_SERVICES) } })
      .catch(() => setServices(DEFAULT_SERVICES))
      .finally(() => setLoading(false))
  }, [apiFetch])

  const pending = services.filter(s => s.staging.status === 'pending' || s.staging.pending_approval).length

  return (
    <div style={{ padding: '0 0 40px 0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0A3D62, #0d4d78)',
        borderRadius: 12, padding: '24px 28px', marginBottom: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(232,184,75,.7)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>
            Deployment Pipeline
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#F5F0E8', margin: 0 }}>
            Live · Staging · Production
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(245,240,232,.6)', margin: '6px 0 0' }}>
            Production requires approval. Big lock = protected.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {pending > 0 && (
            <div style={{
              background: 'rgba(232,184,75,.2)', border: '1px solid #E8B84B',
              borderRadius: 8, padding: '8px 14px',
              fontSize: 12, fontWeight: 700, color: '#E8B84B', fontFamily: 'monospace',
            }}>
              {pending} AWAITING APPROVAL
            </div>
          )}
          <BigLock />
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 20, marginBottom: 20, padding: '10px 16px',
        background: '#FDFAF5', borderRadius: 8, border: '1px solid rgba(10,61,98,.1)',
        flexWrap: 'wrap',
      }}>
        {[
          { color: '#2D7A4F', label: 'Live' },
          { color: '#E8B84B', label: 'Awaiting approval' },
          { color: '#2C3E6B', label: 'Building' },
          { color: '#C0392B', label: 'Failed' },
          { color: 'rgba(10,61,98,.2)', label: 'Empty / not deployed' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 11, color: 'rgba(10,61,98,.6)' }}>{label}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Lock size={14} />
          <span style={{ fontSize: 11, color: 'rgba(10,61,98,.6)' }}>= Deploy gate active</span>
        </div>
      </div>

      {/* Services */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(10,61,98,.4)' }}>Loading pipeline...</div>
      ) : (
        services.map(service => <ServiceRow key={service.id} service={service} />)
      )}
    </div>
  )
}
