import { ROLES, RoleProfile, useRole } from './RoleContext'
import { useTranslation } from '../i18n/useTranslation'

// ─── Wavult hexagon logo mark ─────────────────────────────────────────────────
function WavultMark({ size = 44 }: { size?: number }) {
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.44
  const pts = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <polygon points={pts} fill="var(--color-accent)" />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#FFFFFF"
        fontSize={size * 0.38}
        fontWeight="700"
        fontFamily="var(--font-sans)"
      >
        W
      </text>
    </svg>
  )
}

// ─── Access scope display ─────────────────────────────────────────────────────
const SCOPE_LABELS: Record<string, string> = {
  full: 'Full Access',
  finance: 'Finance',
  tech: 'Technology',
  legal: 'Legal',
  product: 'Product',
  execution: 'Execution',
  strategy: 'Strategy',
  sales: 'Sales',
  systems: 'Systems',
  infra: 'Infrastructure',
  support: 'Support',
  contracts: 'Contracts',
}

export function RoleLogin() {
  const { setRole } = useRole()
  const { t } = useTranslation()

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center mb-4">
          <WavultMark size={44} />
        </div>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: 4,
          }}
        >
          Wavult OS
        </h1>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-text-tertiary)',
            marginBottom: 8,
          }}
        >
          Operational Intelligence Platform
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          {t('auth.select_role')}
        </p>
      </div>

      {/* Role grid */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 24,
          width: '100%',
          maxWidth: 480,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map((r) => (
            <RoleCard key={r.id} role={r} onSelect={() => setRole(r)} />
          ))}
        </div>
      </div>

      <p
        className="mt-6"
        style={{
          fontSize: 10,
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-mono)',
          opacity: 0.5,
        }}
      >
        Wavult OS · Internal access only
      </p>
    </div>
  )
}

function RoleCard({ role, onSelect }: { role: RoleProfile; onSelect: () => void }) {
  const vacant = role.name.startsWith('—')

  // Show at most 3 scope tags (skip 'full' — it's implied by admin)
  const displayScopes = role.access
    .filter(s => s !== 'full')
    .slice(0, 2)

  return (
    <button
      onClick={onSelect}
      disabled={vacant}
      className="text-left transition-all group"
      style={{
        background: 'var(--color-bg-muted)',
        border: '1px solid var(--color-border)',
        borderLeft: `3px solid ${vacant ? 'var(--color-border)' : role.color}`,
        borderRadius: 'var(--radius-lg)',
        padding: '14px 14px 12px',
        cursor: vacant ? 'not-allowed' : 'pointer',
        opacity: vacant ? 0.4 : 1,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Avatar initials */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: role.color + '18',
          border: `1px solid ${role.color}35`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: role.color,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.02em',
          }}
        >
          {role.initials}
        </span>
      </div>

      {/* Role info — clear hierarchy */}
      <div className="min-w-0">
        {/* Role/title — largest */}
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            lineHeight: 1.3,
            marginBottom: 2,
          }}
        >
          {role.person}
        </div>

        {/* Person name — medium */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.3,
            marginBottom: 6,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {role.name}
        </div>

        {/* Access scope — smallest */}
        <div className="flex flex-wrap gap-1">
          {displayScopes.map((scope) => (
            <span
              key={scope}
              style={{
                fontSize: 9,
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                padding: '2px 5px',
                borderRadius: 3,
                background: role.color + '12',
                color: role.color,
                border: `1px solid ${role.color}25`,
              }}
            >
              {SCOPE_LABELS[scope] ?? scope}
            </span>
          ))}
          {role.access.filter(s => s !== 'full').length > 2 && (
            <span
              style={{
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                padding: '2px 5px',
                borderRadius: 3,
                background: 'var(--color-bg)',
                color: 'var(--color-text-tertiary)',
                border: '1px solid var(--color-border)',
              }}
            >
              +{role.access.filter(s => s !== 'full').length - 2}
            </span>
          )}
          {role.access.includes('full') && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                padding: '2px 5px',
                borderRadius: 3,
                background: role.color + '12',
                color: role.color,
                border: `1px solid ${role.color}25`,
              }}
            >
              Full Access
            </span>
          )}
        </div>
      </div>

      {/* Hover state: title line at bottom */}
      {!vacant && (
        <div
          className="mt-3 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: role.color, fontSize: 10 }}
        >
          Continue as {role.person} →
        </div>
      )}
    </button>
  )
}
