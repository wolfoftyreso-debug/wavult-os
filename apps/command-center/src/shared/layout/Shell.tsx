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
import { OnboardingOverlay } from '../../features/onboarding'
import { NotificationCenter } from '../../features/communications/NotificationCenter'
import { GuidanceProvider } from '../guidance/GuidanceSystem'
import { GuidanceToast } from '../guidance/GuidanceToast'

function ContentArea({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const fullBleed = pathname.startsWith('/org') || pathname.startsWith('/entities') || pathname.startsWith('/org/command') || pathname.startsWith('/incidents') || pathname.startsWith('/markets') || pathname.startsWith('/campaigns') || pathname.startsWith('/company-launch') || pathname.startsWith('/finance') || pathname.startsWith('/procurement') || pathname.startsWith('/communications') || pathname.startsWith('/reports') || pathname.startsWith('/media')
  return (
    <div className={`h-full ${fullBleed ? '' : 'overflow-auto p-4 md:p-6'}`}>
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
  label: string | null
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { to: '/incidents', label: 'Alerts', icon: null },
      { to: '/org/command', label: 'Org Hierarchy', icon: null },
      { to: '/org', label: 'Group Structure', icon: null },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: null },
      { to: '/crm', label: 'CRM', icon: null },
      { to: '/milestones', label: 'Milestones', icon: null },
      { to: '/campaigns', label: 'Kampanjer', icon: null },
      { to: '/media', label: 'Media & Ads', icon: null },
      { to: '/submissions', label: 'Submissions', icon: null },
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { to: '/finance', label: 'Finance', icon: null },
      { to: '/transactions', label: 'Transaktioner', icon: null },
      { to: '/payroll', label: 'Lön & Personal', icon: null },
      { to: '/procurement', label: 'Inköp', icon: null },
    ],
  },
  {
    label: 'ORGANISATION',
    items: [
      { to: '/entities', label: 'Entities', icon: null },
      { to: '/corporate', label: 'Bolagsadmin', icon: null },
      { to: '/company-launch', label: 'Company Launch', icon: null },
      { to: '/legal', label: 'Legal Hub', icon: null },
      { to: '/insurance', label: 'Insurance', icon: null },
      { to: '/people', label: 'Team', icon: null },
      { to: '/team-map', label: 'Team Map', icon: null },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { to: '/people-intelligence', label: 'People Insights', icon: null },
      { to: '/system-intelligence', label: 'System Health', icon: null },
      { to: '/talent-radar', label: 'Recruitment', icon: null },
      { to: '/strategic-brief', label: 'Strategy', icon: null },
    ],
  },
  {
    label: 'ANALYTICS',
    items: [
      { to: '/reports', label: 'Rapporter', icon: null },
    ],
  },
  {
    label: 'KUNSKAP',
    items: [
      { to: '/knowledge', label: 'Kunskapshub', icon: null },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { to: '/whoop', label: 'WHOOP', icon: null },
      { to: '/api-hub', label: 'API Hub', icon: null },
      { to: '/llm-hub', label: 'LLM Hub', icon: null },
      { to: '/communications', label: 'Kommunikation', icon: null },
      { to: '/settings', label: 'Inställningar', icon: null },
      { to: '/system-status', label: 'System Status', icon: null },
    ],
  },
]

// Bottom nav pinned items for mobile (most used)
const BOTTOM_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: '⬛' },
  { to: '/incidents', label: 'Incidents', icon: '🚨' },
  { to: '/milestones', label: 'Milestones', icon: '🚀' },
  { to: '/finance', label: 'Finance', icon: '💰' },
  { to: '/settings', label: 'Menu', icon: '☰' },
]

// ─── Breadcrumb map ───────────────────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/crm': 'CRM',
  '/entities': 'Entities',
  '/incidents': 'Alerts',
  '/org/command': 'Org Hierarchy',
  '/org/context': 'My Position',
  '/org': 'Group Structure',
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
  '/people-intelligence': 'People Insights',
  '/system-intelligence': 'System Health',
  '/talent-radar': 'Recruitment',
  '/strategic-brief': 'Strategy',
  '/api-hub': 'API Hub',
  '/llm-hub': 'LLM Hub',
  '/whoop': 'WHOOP Team Pulse',
  '/insurance': 'Insurance Hub',
  '/team-map': 'Team Map',
}

function getBreadcrumb(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
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

  const timeStr = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })

  return (
    <span className="text-xs font-mono text-gray-500">{timeStr}</span>
  )
}

// ─── Hamburger icon ───────────────────────────────────────────────────────────

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <div className="flex flex-col justify-center items-center w-5 h-5 gap-[5px]">
      <span className={`block h-px w-5 bg-gray-400 transition-all duration-200 ${open ? 'rotate-45 translate-y-[6px]' : ''}`} />
      <span className={`block h-px w-5 bg-gray-400 transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
      <span className={`block h-px w-5 bg-gray-400 transition-all duration-200 ${open ? '-rotate-45 -translate-y-[6px]' : ''}`} />
    </div>
  )
}

// ─── Sidebar Nav Content ──────────────────────────────────────────────────────

function SidebarNav({
  criticalIncidentCount,
  pendingLegalCount,
  onNavigate,
}: {
  criticalIncidentCount: number
  pendingLegalCount: number
  onNavigate?: () => void
}) {
  return (
    <nav className="flex-1 px-2 py-2 overflow-y-auto">
      {NAV_GROUPS.map((group, gi) => (
        <div key={gi}>
          {gi > 0 && (
            <div className="mx-3 my-1 border-t border-white/[0.04]" />
          )}
          {group.label && (
            <div className="text-xs text-gray-500 uppercase tracking-widest px-3 pt-3 pb-1 font-sans font-semibold">
              {group.label}
            </div>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center justify-between gap-2 px-3 py-2.5 md:py-2 rounded-lg text-sm transition-colors min-w-0 ${
                    isActive
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                  }`
                }
              >
                <span className="flex-1 min-w-0 truncate">{item.label}</span>

                {(() => {
                  const pathId = item.to.replace(/^\//, '')
                  const mod = MODULE_REGISTRY.find(m => m.id === pathId || m.path === item.to)
                  return mod ? <span className="flex-shrink-0"><MaturityBadge level={mod.level} size="xs" /></span> : null
                })()}

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
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function Shell({ children }: ShellProps) {
  const { role, setRole, isAdmin, viewAs, setViewAs, effectiveRole } = useRole()
  const { activeEntity: scopeEntity, scopedEntities } = useEntityScope()
  const { pathname } = useLocation()
  const nonAdminRoles = ROLES.filter(r => r.id !== 'admin')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

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
  const notificationCount = 3

  return (
    <div className="flex h-screen bg-surface-base overflow-hidden">

      {/* ── Mobile overlay backdrop ───────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        w-72 md:w-60 flex-shrink-0
        bg-surface-raised border-r border-surface-border
        flex flex-col
        transition-transform duration-250 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-surface-border">
          <span className="text-sm font-bold text-white tracking-wider">WAVULT OS</span>
          <span className="ml-2 text-xs text-brand-highlight font-mono">v2</span>
          {/* Close btn (mobile) */}
          <button
            className="ml-auto md:hidden p-1 text-gray-500 hover:text-gray-300"
            onClick={() => setSidebarOpen(false)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Entity Switcher */}
        <div className="px-3 py-3 border-b border-surface-border">
          <EntitySwitcher />
        </div>

        {/* Scope indicator */}
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

        {/* Nav */}
        <SidebarNav
          criticalIncidentCount={criticalIncidentCount}
          pendingLegalCount={pendingLegalCount}
          onNavigate={() => setSidebarOpen(false)}
        />

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-border">
          <p className="text-xs text-gray-600">Wavult Group © 2026</p>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="h-12 flex-shrink-0 border-b border-surface-border flex items-center justify-between px-3 md:px-6 bg-[#07080F]">

          {/* Left: hamburger (mobile) + status + breadcrumb */}
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {/* Hamburger — mobile only */}
            <button
              className="md:hidden flex-shrink-0 p-1 -ml-1"
              onClick={() => setSidebarOpen(v => !v)}
              aria-label="Toggle menu"
            >
              <HamburgerIcon open={sidebarOpen} />
            </button>

            {/* Status dot — hidden on very small screens */}
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-brand-success" />
              <span className="text-xs text-gray-700 font-mono">OPERATIONAL</span>
            </div>
            <span className="hidden sm:block text-gray-800 text-xs">/</span>

            <span className="text-sm text-gray-400 font-medium truncate">{breadcrumb}</span>
          </div>

          {/* Right: clock + bell + role + exit */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <HeaderClock />

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(v => !v)}
                className="relative p-1.5 text-gray-600 hover:text-gray-300 transition-colors rounded-lg hover:bg-white/[0.06]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                    {notificationCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {notifOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotifOpen(false)}
                  />
                  {/* Panel */}
                  <div className="absolute right-0 top-full mt-2 z-50 w-[min(420px,calc(100vw-1rem))] max-h-[80vh] overflow-y-auto rounded-2xl border border-white/[0.1] shadow-2xl"
                    style={{ background: '#0D0F1A' }}>
                    <div className="p-4">
                      <NotificationCenter />
                    </div>
                  </div>
                </>
              )}
            </div>

            {role && effectiveRole && (
              <>
                {isAdmin ? (
                  <select
                    value={viewAs?.id ?? ''}
                    onChange={e => {
                      const found = nonAdminRoles.find(r => r.id === e.target.value) ?? null
                      setViewAs(found)
                    }}
                    className="hidden sm:block text-xs bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-2.5 py-1 font-mono cursor-pointer focus:outline-none appearance-none"
                    style={{ color: viewAs ? viewAs.color : '#6B7280' }}
                  >
                    <option value="">🔐 Admin</option>
                    {nonAdminRoles.map(r => (
                      <option key={r.id} value={r.id}>{r.emoji} {r.title}</option>
                    ))}
                  </select>
                ) : (
                  <span className="hidden sm:block text-xs font-mono px-2 py-1 rounded"
                    style={{ background: effectiveRole.color + '15', color: effectiveRole.color }}>
                    {effectiveRole.emoji} {effectiveRole.title}
                  </span>
                )}
                <button
                  onClick={() => { setRole(null); setViewAs(null) }}
                  className="text-xs text-gray-700 hover:text-gray-400 transition-colors font-mono"
                >
                  exit
                </button>
              </>
            )}
          </div>
        </header>

        {/* Content — add bottom padding on mobile for bottom nav */}
        <div className="flex-1 overflow-hidden pb-[env(safe-area-inset-bottom)]">
          <div className="h-full md:pb-0 pb-16">
            <ContentArea>{children}</ContentArea>
          </div>
        </div>
      </main>

      {/* ── Mobile Bottom Nav ──────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-surface-raised border-t border-surface-border flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {BOTTOM_NAV.map((item) => (
          item.to === '/settings'
            ? (
              // "Menu" button opens sidebar
              <button
                key="menu"
                onClick={() => setSidebarOpen(v => !v)}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-[9px] font-mono">{item.label}</span>
              </button>
            )
            : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors ${
                    isActive ? 'text-brand-accent' : 'text-gray-500 hover:text-gray-300'
                  }`
                }
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-[9px] font-mono">{item.label}</span>
                {item.to === '/incidents' && criticalIncidentCount > 0 && (
                  <span className="absolute top-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </NavLink>
            )
        ))}
      </nav>

      {/* Bernt — persistent AI widget */}
      <BerntWidget />

      {/* Onboarding — first-run guided tour */}
      <OnboardingOverlay />

      {/* Guidance toast — smart contextual hints (bottom-left) */}
      <GuidanceToast />
    </div>
  )
}

/**
 * ShellWithGuidance wraps Shell in the GuidanceProvider so that
 * GuidanceSystem has access to the React Router context (useLocation).
 */
export function ShellWithGuidance({ children }: { children: React.ReactNode }) {
  return (
    <GuidanceProvider>
      <Shell>{children}</Shell>
    </GuidanceProvider>
  )
}
