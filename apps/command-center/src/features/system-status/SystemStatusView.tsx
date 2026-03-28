import { useNavigate } from 'react-router-dom'
import {
  MODULE_REGISTRY,
  MATURITY_COLORS,
  MATURITY_LABELS,
  MATURITY_DESCRIPTION,
  MATURITY_BG,
  MaturityLevel,
} from '../../shared/maturity/maturityModel'
import { MaturityBadge } from '../../shared/maturity/MaturityBadge'

const LEVEL_ORDER: MaturityLevel[] = ['enterprise', 'production', 'beta', 'alpha', 'skeleton']

function countByLevel(level: MaturityLevel) {
  return MODULE_REGISTRY.filter(m => m.level === level).length
}

function ModuleCard({ mod }: { mod: (typeof MODULE_REGISTRY)[0] }) {
  const navigate = useNavigate()
  const color = MATURITY_COLORS[mod.level]
  const bg = MATURITY_BG[mod.level]

  return (
    <button
      onClick={() => navigate(mod.path)}
      className="flex flex-col gap-2 p-4 rounded-xl border transition-all text-left hover:scale-[1.02] active:scale-[0.99] cursor-pointer"
      style={{
        background: `${bg}BB`,
        borderColor: `${color}33`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{mod.icon}</span>
          <span className="text-sm font-semibold text-white">{mod.name}</span>
        </div>
        <MaturityBadge level={mod.level} size="sm" />
      </div>

      {/* Live / mock counts */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span
            className="rounded-full"
            style={{ width: 5, height: 5, background: '#22C55E', flexShrink: 0 }}
          />
          <span className="text-xs text-gray-400 font-mono">
            {mod.liveFeatures.length} live
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="rounded-full"
            style={{ width: 5, height: 5, background: '#F59E0B', flexShrink: 0 }}
          />
          <span className="text-xs text-gray-500 font-mono">
            {mod.mockFeatures.length} mock
          </span>
        </div>
        <span className="text-[9px] font-mono text-gray-700 ml-auto">Fas {mod.phase}</span>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-600 font-mono leading-relaxed">
        {MATURITY_DESCRIPTION[mod.level]}
      </p>

      {/* Data source indicator */}
      <div className="flex items-center gap-1 mt-auto">
        <span
          className="text-[9px] font-mono px-1.5 py-0.5 rounded"
          style={{
            background:
              mod.dataSource === 'live' ? '#052e1666' :
              mod.dataSource === 'partial' ? '#0D1B3E66' :
              '#1C110766',
            color:
              mod.dataSource === 'live' ? '#34D399' :
              mod.dataSource === 'partial' ? '#60A5FA' :
              '#F59E0B',
          }}
        >
          {mod.dataSource === 'live' ? '● LIVE DATA' :
           mod.dataSource === 'partial' ? '◐ PARTIAL' :
           '○ MOCK DATA'}
        </span>
        <span className="text-[8px] text-gray-700 font-mono ml-auto">
          {mod.lastUpdated}
        </span>
      </div>
    </button>
  )
}

// ─── quiXzoom API Endpoints (scraped from wolfoftyreso-debug/quixzoom-api) ────

const QUIXZOOM_ENDPOINTS = [
  { method: 'GET',    route: '/health',                        desc: 'Health check — service alive',               auth: false },
  { method: 'GET',    route: '/missions',                      desc: 'Lista tillgängliga uppdrag (med filter)',     auth: true  },
  { method: 'POST',   route: '/missions',                      desc: 'Skapa nytt uppdrag (admin)',                 auth: true  },
  { method: 'POST',   route: '/missions/:id/assign',           desc: 'Fotograf accepterar uppdrag',                auth: true  },
  { method: 'POST',   route: '/missions/:id/complete',         desc: 'Markera uppdrag som slutfört',              auth: true  },
  { method: 'POST',   route: '/missions/:id/publish',          desc: 'Publicera uppdrag på kartan',               auth: true  },
  { method: 'DELETE', route: '/missions/:id',                  desc: 'Ta bort uppdrag',                           auth: true  },
  { method: 'POST',   route: '/billing/checkout',              desc: 'Starta Stripe checkout-session',             auth: true  },
  { method: 'POST',   route: '/billing/portal',                desc: 'Öppna Stripe customer portal',              auth: true  },
  { method: 'GET',    route: '/admin/stats',                   desc: 'Plattformsstatistik (admin)',                auth: true  },
  { method: 'GET',    route: '/admin/payouts',                 desc: 'Lista pågående utbetalningar',               auth: true  },
  { method: 'POST',   route: '/admin/payouts/approve/:id',     desc: 'Godkänn fotograferens utbetalning',         auth: true  },
  { method: 'POST',   route: '/admin/payouts/reject/:id',      desc: 'Avvisa utbetalning',                        auth: true  },
  { method: 'GET',    route: '/admin/photographers',           desc: 'Lista alla registrerade fotografer',         auth: true  },
  { method: 'PATCH',  route: '/admin/photographers/:id',       desc: 'Uppdatera fotografstatus/nivå',             auth: true  },
  { method: 'POST',   route: '/notifications/mission-available', desc: 'Push-notis: nytt uppdrag tillgängligt',   auth: true  },
  { method: 'POST',   route: '/notifications/submission-reviewed', desc: 'Push-notis: inlämning granskad',        auth: true  },
  { method: 'POST',   route: '/webhooks/stripe',               desc: 'Stripe webhook-handler (raw body)',          auth: false },
] as const

function LegendDot({ level }: { level: MaturityLevel }) {
  const color = MATURITY_COLORS[level]
  const label = MATURITY_LABELS[level]
  const count = countByLevel(level)
  if (count === 0) return null
  return (
    <div className="flex items-center gap-1.5">
      <span className="rounded-full" style={{ width: 7, height: 7, background: color, flexShrink: 0 }} />
      <span className="text-xs font-mono" style={{ color }}>
        {label}
      </span>
      <span className="text-[9px] font-mono text-gray-700">×{count}</span>
    </div>
  )
}

export function SystemStatusView() {
  const total = MODULE_REGISTRY.length
  const betaCount = countByLevel('beta')
  const alphaCount = countByLevel('alpha')
  const skeletonCount = countByLevel('skeleton')
  const productionCount = countByLevel('production')
  const enterpriseCount = countByLevel('enterprise')

  // Sort modules by maturity level (best first)
  const sortedModules = [...MODULE_REGISTRY].sort(
    (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)
  )

  return (
    <div className="flex flex-col h-full bg-[#07080F] text-white overflow-auto">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">WAVULT OS — SYSTEMSTATUS</h1>
            <p className="text-xs text-gray-500 font-mono mt-1">
              {total} moduler
              {enterpriseCount > 0 && <> · <span style={{ color: MATURITY_COLORS.enterprise }}>{enterpriseCount} ENTERPRISE</span></>}
              {productionCount > 0 && <> · <span style={{ color: MATURITY_COLORS.production }}>{productionCount} PRODUCTION</span></>}
              {betaCount > 0 && <> · <span style={{ color: MATURITY_COLORS.beta }}>{betaCount} BETA</span></>}
              {alphaCount > 0 && <> · <span style={{ color: MATURITY_COLORS.alpha }}>{alphaCount} ALPHA</span></>}
              {skeletonCount > 0 && <> · <span style={{ color: MATURITY_COLORS.skeleton }}>{skeletonCount} SKELETON</span></>}
            </p>
          </div>

          {/* Overall health bar */}
          <div className="hidden sm:flex flex-col items-end gap-1">
            <span className="text-[9px] font-mono text-gray-600 uppercase tracking-wider">Systemhälsa</span>
            <div className="flex gap-0.5 items-center">
              {sortedModules.map(m => (
                <div
                  key={m.id}
                  className="rounded-sm"
                  style={{
                    width: 8,
                    height: 20,
                    background: MATURITY_COLORS[m.level],
                    opacity: 0.8,
                  }}
                  title={`${m.name}: ${MATURITY_LABELS[m.level]}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 px-6 py-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {sortedModules.map(mod => (
            <ModuleCard key={mod.id} mod={mod} />
          ))}
        </div>
      </div>

      {/* quiXzoom API Intelligence */}
      <div className="flex-shrink-0 px-6 py-5 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[9px] font-mono text-amber-500/70 uppercase tracking-wider">quiXzoom API — Endpoint Intelligence</span>
          <div className="flex-1 border-t border-white/[0.04]" />
          <span className="text-[9px] font-mono text-gray-600">api.quixzoom.com · ECS eu-north-1</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {QUIXZOOM_ENDPOINTS.map(ep => (
            <div
              key={ep.route}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 flex items-start gap-2"
            >
              <span
                className="text-[9px] font-mono font-bold mt-0.5 flex-shrink-0"
                style={{ color: ep.method === 'GET' ? '#34D399' : ep.method === 'POST' ? '#60A5FA' : ep.method === 'PATCH' ? '#F59E0B' : '#EF4444' }}
              >
                {ep.method}
              </span>
              <div className="flex-1 min-w-0">
                <code className="text-xs text-white/80 font-mono block truncate">{ep.route}</code>
                <span className="text-[9px] text-gray-600">{ep.desc}</span>
              </div>
              <span
                className="text-[8px] px-1 py-0.5 rounded font-mono flex-shrink-0"
                style={{
                  backgroundColor: ep.auth ? '#1e3a5f' : '#1a1a1a',
                  color: ep.auth ? '#60A5FA' : '#6B7280',
                }}
              >
                {ep.auth ? '🔒' : '🌐'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend footer */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[9px] font-mono text-gray-600 uppercase tracking-wider">LEGEND</span>
          <div className="flex-1 border-t border-white/[0.04]" />
        </div>
        <div className="flex flex-wrap gap-4">
          {LEVEL_ORDER.map(level => (
            <LegendDot key={level} level={level} />
          ))}
        </div>
      </div>
    </div>
  )
}
