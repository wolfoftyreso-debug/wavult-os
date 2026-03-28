import { useState } from 'react'

interface Integration {
  id: string
  name: string
  env: string
  status: 'ok' | 'error' | 'warning'
  statusLabel: string
  lastTested: string
  keyHint: string
  scope: string
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'revolut',
    name: 'Revolut Business',
    env: 'Production',
    status: 'ok',
    statusLabel: 'Connected',
    lastTested: '2026-03-26 09:14',
    keyHint: '••••4f2a',
    scope: 'accounts:read, payments:write',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    env: 'Production',
    status: 'ok',
    statusLabel: 'Connected',
    lastTested: '2026-03-26 08:00',
    keyHint: '••••1c9e',
    scope: 'charges, customers, invoices',
  },
  {
    id: '46elks',
    name: '46elks SMS',
    env: 'Production',
    status: 'error',
    statusLabel: 'Connection failed',
    lastTested: '2026-03-25 22:45',
    keyHint: '••••7d3b',
    scope: 'sms:send',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    env: 'Production',
    status: 'ok',
    statusLabel: 'Connected',
    lastTested: '2026-03-26 09:00',
    keyHint: '••••9a1f',
    scope: 'db:read, db:write, auth:admin',
  },
  {
    id: 'aws',
    name: 'AWS ECS',
    env: 'eu-north-1',
    status: 'ok',
    statusLabel: 'Connected',
    lastTested: '2026-03-26 07:30',
    keyHint: '••••XK4Q',
    scope: 'ecs:*, ecr:*, logs:*',
  },
  {
    id: 'github',
    name: 'GitHub Actions',
    env: 'wolfoftyreso-debug',
    status: 'ok',
    statusLabel: 'Connected',
    lastTested: '2026-03-26 06:15',
    keyHint: '••••3e8c',
    scope: 'repo, workflow, read:org',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    env: 'Production',
    status: 'warning',
    statusLabel: 'Token expired',
    lastTested: '2026-03-20 14:22',
    keyHint: '••••0b5d',
    scope: 'zone:read, dns:edit, cache:purge',
  },
  {
    id: 'gandi',
    name: 'Gandi DNS',
    env: 'Production',
    status: 'error',
    statusLabel: '403 Forbidden',
    lastTested: '2026-03-24 11:08',
    keyHint: '••••2f7a',
    scope: 'domain:read, dns:write',
  },
]

const STATUS_CONFIG = {
  ok: { color: '#10B981', bg: '#10B98115', border: '#10B98130', icon: '✅', label: 'OK' },
  warning: { color: '#F59E0B', bg: '#F59E0B15', border: '#F59E0B30', icon: '⚠️', label: 'WARNING' },
  error: { color: '#EF4444', bg: '#EF444415', border: '#EF444430', icon: '❌', label: 'ERROR' },
}

function IntegrationRow({ integration }: { integration: Integration }) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const cfg = STATUS_CONFIG[integration.status]

  function handleTest() {
    setTesting(true)
    setTestResult(null)
    setTimeout(() => {
      setTesting(false)
      setTestResult(integration.status === 'ok' ? 'success' : 'fail')
      setTimeout(() => setTestResult(null), 3000)
    }, 1400)
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0A0C14] px-5 py-4 flex items-center gap-4">
      {/* Status dot */}
      <div
        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
        style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}80` }}
      />

      {/* Name + env */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white">{integration.name}</span>
          <span className="text-xs text-gray-600 font-mono bg-white/[0.04] px-1.5 py-0.5 rounded">
            {integration.env}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 flex-wrap">
          <span>Nyckel: <span className="text-gray-400 font-mono">{integration.keyHint}</span></span>
          <span>Scope: <span className="text-gray-500">{integration.scope}</span></span>
        </div>
      </div>

      {/* Status badge */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex-shrink-0"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
      >
        {cfg.icon} {integration.statusLabel}
      </div>

      {/* Last tested */}
      <div className="text-xs text-gray-600 font-mono flex-shrink-0 hidden lg:block">
        {integration.lastTested}
      </div>

      {/* Test button */}
      <button
        onClick={handleTest}
        disabled={testing}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{
          background: testing ? '#ffffff08' : '#ffffff0a',
          border: '1px solid #ffffff10',
          color: testing ? '#6B7280' : testResult === 'success' ? '#10B981' : testResult === 'fail' ? '#EF4444' : '#9CA3AF',
        }}
      >
        {testing ? '⏳ Testar…' : testResult === 'success' ? '✅ OK' : testResult === 'fail' ? '❌ Fel' : 'Testa anslutning'}
      </button>
    </div>
  )
}

export function APIKeysView() {
  const okCount = INTEGRATIONS.filter(i => i.status === 'ok').length
  const warnCount = INTEGRATIONS.filter(i => i.status === 'warning').length
  const errCount = INTEGRATIONS.filter(i => i.status === 'error').length

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
          style={{ background: '#10B98115', border: '1px solid #10B98130', color: '#10B981' }}>
          ✅ {okCount} aktiva
        </div>
        {warnCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
            style={{ background: '#F59E0B15', border: '1px solid #F59E0B30', color: '#F59E0B' }}>
            ⚠️ {warnCount} varning
          </div>
        )}
        {errCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
            style={{ background: '#EF444415', border: '1px solid #EF444430', color: '#EF4444' }}>
            ❌ {errCount} fel
          </div>
        )}
        <span className="text-xs text-gray-700 font-mono ml-auto">
          {INTEGRATIONS.length} integrationer totalt
        </span>
      </div>

      {/* Integration list */}
      <div className="space-y-2">
        {INTEGRATIONS.map(integration => (
          <IntegrationRow key={integration.id} integration={integration} />
        ))}
      </div>

      {/* Footer note */}
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 text-xs text-gray-700 font-mono">
        🔒 Nycklar lagras krypterat i miljövariabler. Sista 4 tecken visas för identifiering. Kontakta CTO för rotation.
      </div>
    </div>
  )
}
