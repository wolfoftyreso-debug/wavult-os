import React, { useMemo, useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { EntitySwitcher } from '../../features/entity-switcher/EntitySwitcher'
import { useRole, ROLES } from '../auth/RoleContext'
import { generateIncidents } from '../../features/incidents/incidentEngine'
import { useEntityScope } from '../scope/EntityScopeContext'
import { LEGAL_DOCUMENTS } from '../../features/legal/data'
import { MODULE_REGISTRY } from '../maturity/maturityModel'
import { MaturityBadge } from '../maturity/MaturityBadge'
import { BerntWidget } from '../../features/bernt/BerntWidget'

function ContentArea({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const fullBleed = pathname.startsWith('/org') || pathname.startsWith('/entities') || pathname.startsWith('/org/command') || pathname.startsWith('/incidents') || pathname.startsWith('/markets') || pathname.startsWith('/campaigns') || pathname.startsWith('/company-launch') || pathname.startsWith('/finance') || pathname.startsWith('/procurement') || pathname.startsWith('/communications') || pathname.startsWith('/reports') || pathname.startsWith('/media')
  return (
    <div className={`h-full ${fullBleed ? '' : 'overflow-auto p-6'}`}>
      {children}
    </div>
  )
}

interface ShellProps {
  children: React.ReactNode
}

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItem {
  to: string
  label: string
  icon: string | null
}

interface NavGroup {
  label: string | null   // null = no heading (top-level pinned items)
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { to: '/incidents', label: 'Incident Center', icon: '🚨' },
      { to: '/org/command', label: 'Command Chain', icon: '⬆' },
      { to: '/org', label: 'Corporate Graph', icon: '🏗' },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: '⬛' },
      { to: '/crm', label: 'CRM', icon: '🎯' },
      { to: '/milestones', label: 'Milestones', icon: '🚀' },
      { to: '/campaigns', label: 'Kampanjer', icon: '⚡' },
      { to: '/media', label: 'Media & Ads', icon: '📡' },
      { to: '/submissions', label: 'Submissions', icon: '📥' },
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { to: '/finance', label: 'Finance', icon: '💰' },
      { to: '/transactions', label: 'Transaktioner', icon: '↕' },
      { to: '/payroll', label: 'Lön & Personal', icon: '👥' },
      { to: '/procurement', label: 'Inköp', icon: '🛒' },
    ],
  },
  {
    label: 'ORGANISATION',
    items: [
      { to: '/entities', label: 'Entities', icon: '🏢' },
      { to: '/corporate', label: 'Bolagsadmin', icon: '⚖️' },
      { to: '/company-launch', label: 'Company Launch', icon: '🚀' },
      { to: '/legal', label: 'Legal Hub', icon: null },
      { to: '/people', label: 'Team', icon: '👤' },
    ],
  },
  {
    label: 'ANALYTICS',
    items: [
      { to: '/reports', label: 'Rapporter', icon: '📊' },
    ],
  },
  {
    label: 'KUNSKAP',
    items: [
      { to: '/knowledge', label: 'Kunskapshub', icon: '📚' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { to: '/communications', label: 'Kommunikation', icon: '📡' },
      { to: '/settings', label: 'Inställningar', icon: '⚙️' },
      { to: '/system-status', label: 'System Status', icon: '🔬' },
    ],
  },
]

// ─── Breadcrumb map ───────────────────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/crm': 'CRM',
  '/entities': 'Entities',
  '/incidents': 'Incident Center',
  '/org/command': 'Command Chain',
  '/org/context': 'My Position',
  '/org': 'Corporate Graph',
  '/markets': 'Market Deployment',
  '/campaigns': 'Kampanjer',
  '/projects': 'Projekt & KPI',
  '/tasks': 'Task Board',
  '/people': 'Team',
  '/payroll': 'Lön & Personal',
  '/transactions': 'Transaktioner',
  '/submissions': 'Submissions',
  '/legal': 'Legal Hub',
  '/company-launch': 'Company Launch',
  '/finance': 'Finance',
  '/procurement': 'Inköp',
  '/milestones': 'Milestones',
  '/settings': 'Inställningar',
  '/corporate': 'Bolagsadmin',
  '/communications': 'Kommunikation',
  '/media': 'Media & Ads',
  '/reports': 'Rapporter',
  '/system-status': 'System Status',
  '/knowledge': 'Knowledge Hub',
}

function getBreadcrumb(pathname: string): string {
  // Try exact match first
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  // Try prefix match (longest wins)
  const match = Object.keys(ROUTE_LABELS)
    .filter(k => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return match ? ROUTE_LABELS[match] : 'Wavult OS'
}

// ─── Clock ────────────────────────────────────────────────────────────────────

function HeaderClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const dateStr = now.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeStr = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
      <span>{dateStr}</span>
      <span className="text-gray-700">·</span>
      <span className="text-gray-400">{timeStr}</span>
    </div>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function Shell({ children }: ShellProps) {
  const { role, setRole, isAdmin, viewAs, setViewAs, effectiveRole } = useRole()
  const { activeEntity: scopeEntity, scopedEntities } = useEntityScope()
  const { pathname } = useLocation()
  const nonAdminRoles = ROLES.filter(r => r.id !== 'admin')

  const criticalIncidentCount = useMemo(() => {
    try {
      const incs = generateIncidents()
      return incs.filter(i => i.severity === 'critical' || i.escalated).length
    } catch { return 0 }
  }, [])

  const pendingLegalCount = useMemo(
    () => LEGAL_DOCUMENTS.filter(d => d.status === 'proposed').length,
    []
  )

  const breadcrumb = getBreadcrumb(pathname)

  // Notification count (hardcoded for now)
  const notificationCount = 3

  return (
    <div className="flex h-screen bg-surface-base overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-surface-raised border-r border-surface-border flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-surface-border">
          <span className="text-sm font-bold text-white tracking-wider">WAVULT OS</span>
          <span className="ml-2 text-xs text-brand-highlight font-mono">v2</span>
        </div>

        {/* Entity Switcher */}
        <div className="px-3 py-3 border-b border-surface-border">
          <EntitySwitcher />
        </div>

        {/* Scope context indicator */}
        <div className="px-3 py-1.5 border-b border-surface-border">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: scopeEntity.color }} />
            <span className="text-[9px] text-gray-600 font-mono">
              {scopeEntity.layer === 0 ? 'Group view' : `${scopeEntity.shortName} view`}
            </span>
            <span className="text-[9px] text-gray-700 ml-auto font-mono">{scopedEntities.length}e</span>
            {pendingLegalCount > 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" title={`${pendingLegalCount} juridiska dokument kräver åtgärd`} />
            )}
          </div>
        </div>

        {/* Nav — grouped */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {/* Divider between groups (not before first) */}
              {gi > 0 && (
                <div className="mx-3 my-1 border-t border-white/[0.04]" />
              )}

              {/* Group heading */}
              {group.label && (
                <div className="text-[9px] text-gray-600 uppercase tracking-wider px-3 pt-3 pb-1 font-mono">
                  {group.label}
                </div>
              )}

              {/* Items */}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-brand-accent/10 text-brand-accent font-medium'
                          : 'text-gray-400 hover:text-white hover:bg-surface-overlay'
                      }`
                    }
                  >
                    {item.icon === null
                      ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                          <path d="M12 3v18M3 9h18M5 9l3-6 3 6M13 9l3-6 3 6M5 9c0 2.21 1.34 4 3 4s3-1.79 3-4M13 9c0 2.21 1.34 4 3 4s3-1.79 3-4M5 21h14" />
                        </svg>
                      )
                      : <span className="text-base leading-none flex-shrink-0">{item.icon}</span>
                    }
                    <span className="flex-1 truncate">{item.label}</span>

                    {/* Maturity badge */}
                    {(() => {
                      const pathId = item.to.replace(/^\//, '')
                      const mod = MODULE_REGISTRY.find(m => m.id === pathId || m.path === item.to)
                      return mod ? <MaturityBadge level={mod.level} size="xs" /> : null
                    })()}

                    {/* Alert Badges */}
                    {item.to === '/incidents' && criticalIncidentCount > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white flex-shrink-0">
                        {criticalIncidentCount}
                      </span>
                    )}
                    {item.to === '/legal' && pendingLegalCount > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-black flex-shrink-0">
                        {pendingLegalCount}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-border">
          <p className="text-xs text-gray-600">Wavult Group © 2026</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 flex-shrink-0 border-b border-surface-border flex items-center justify-between px-6 bg-[#07080F]">
          {/* Left: status dot + breadcrumb */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-brand-success" />
              <span className="text-[10px] text-gray-700 font-mono">OPERATIONAL</span>
            </div>
            <span className="text-gray-800 text-[10px]">/</span>
            <span className="text-[11px] text-gray-400 font-medium">{breadcrumb}</span>
          </div>

          {/* Right: clock + notification bell + role selector + exit */}
          <div className="flex items-center gap-3">
            <HeaderClock />

            {/* Notification bell */}
            <button className="relative p-1 text-gray-600 hover:text-gray-300 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                  {notificationCount}
                </span>
              )}
            </button>

            {role && effectiveRole && (
              <>
                {isAdmin ? (
                  <select
                    value={viewAs?.id ?? ''}
                    onChange={e => {
                      const found = nonAdminRoles.find(r => r.id === e.target.value) ?? null
                      setViewAs(found)
                    }}
                    className="text-[10px] bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-2.5 py-1 font-mono cursor-pointer focus:outline-none appearance-none"
                    style={{ color: viewAs ? viewAs.color : '#6B7280' }}
                  >
                    <option value="">🔐 System Admin</option>
                    {nonAdminRoles.map(r => (
                      <option key={r.id} value={r.id}>{r.emoji} {r.title}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-1 rounded"
                    style={{ background: effectiveRole.color + '15', color: effectiveRole.color }}>
                    {effectiveRole.emoji} {effectiveRole.title}
                  </span>
                )}
                <button
                  onClick={() => { setRole(null); setViewAs(null) }}
                  className="text-[10px] text-gray-700 hover:text-gray-400 transition-colors font-mono"
                >
                  exit
                </button>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <ContentArea>{children}</ContentArea>
        </div>
      </main>

      {/* Bernt — persistent AI widget */}
      <BerntWidget />
    </div>
  )
}
