import React, { useMemo, useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, AlertTriangle, GitBranch, Network,
  Users, Briefcase, Megaphone,
  DollarSign, Receipt, ShoppingCart, CreditCard,
  Scale, Flag, Layers,
  BookOpen, Server, Settings,
  Bell, Inbox, User, LayoutGrid,
} from 'lucide-react'
import { useRole, ROLES } from '../auth/RoleContext'
import { generateIncidents } from '../../features/incidents/incidentEngine'
import { useEntityScope } from '../scope/EntityScopeContext'
import { BerntWidget } from '../../features/bernt/BerntWidget'
import { AgentCommandPanel } from '../../features/agent/AgentCommandPanel'
import { OnboardingOverlay } from '../../features/onboarding'
import { NotificationCenter } from '../../features/communications/NotificationCenter'
import { GuidanceProvider } from '../guidance/GuidanceSystem'
import { GuidanceToast } from '../guidance/GuidanceToast'
import { useTranslation } from '../i18n/useTranslation'
import { LanguageToggle } from '../i18n/LanguageToggle'

// ─── Nav item/group types ──────────────────────────────────────────────────────

interface NavItem {
  to: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavGroup {
  labelKey: string | null
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: null,
    items: [
      { to: '/',        labelKey: 'nav.command', icon: LayoutDashboard },
      { to: '/ops',     labelKey: 'nav.ops',     icon: LayoutGrid },
      { to: '/person',  labelKey: 'nav.person',  icon: User },
      { to: '/alerts',  labelKey: 'nav.alerts',  icon: AlertTriangle },
    ],
  },
  {
    labelKey: 'nav.money',
    items: [
      { to: '/finance',       labelKey: 'nav.finance',      icon: DollarSign },
      { to: '/transactions',  labelKey: 'nav.transactions', icon: Receipt },
      { to: '/causal-os',     labelKey: 'nav.simulation',   icon: GitBranch },
      { to: '/procurement',   labelKey: 'nav.procurement',  icon: ShoppingCart },
      { to: '/payroll',       labelKey: 'nav.payroll',      icon: CreditCard },
    ],
  },
  {
    labelKey: 'nav.people',
    items: [
      { to: '/people-governance', labelKey: 'nav.people',       icon: Users },
      { to: '/org',               labelKey: 'nav.organization', icon: Network },
      { to: '/crm',               labelKey: 'nav.crm',          icon: Briefcase },
    ],
  },
  {
    labelKey: 'nav.operations',
    items: [
      { to: '/milestones',  labelKey: 'nav.milestones',  icon: Flag },
      { to: '/campaigns',   labelKey: 'nav.campaigns',   icon: Megaphone },
      { to: '/submissions', labelKey: 'nav.submissions', icon: Inbox },
      { to: '/decisions',   labelKey: 'nav.decisions',   icon: Scale },
      { to: '/projects',    labelKey: 'nav.projects',    icon: Layers },
    ],
  },
  {
    labelKey: 'nav.knowledge',
    items: [
      { to: '/knowledge',       labelKey: 'nav.knowledge',      icon: BookOpen },
      { to: '/infrastructure',  labelKey: 'nav.infrastructure', icon: Server },
      { to: '/system-graph',    labelKey: 'nav.systemGraph',    icon: Network },
      { to: '/settings',        labelKey: 'nav.settings',       icon: Settings },
    ],
  },
]

// ─── Shell ────────────────────────────────────────────────────────────────────

interface ShellProps {
  children: React.ReactNode
}

function SidebarNav({ criticalAlertCount, onNavigate }: {
  criticalAlertCount: number
  onNavigate?: () => void
}) {
  const { pathname } = useLocation()
  const { t } = useTranslation()

  return (
    <nav className="flex-1 px-2 py-2 overflow-y-auto">
      {NAV_GROUPS.map((group, gi) => (
        <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
          {group.labelKey && (
            <div
              className="px-3 py-1 mb-1"
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--color-text-tertiary)',
              }}
            >
              {t(group.labelKey)}
            </div>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = item.to === '/'
                ? pathname === '/'
                : pathname === item.to || pathname.startsWith(item.to + '/')

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className="flex items-center gap-3 min-w-0"
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    background: isActive ? 'var(--color-accent-light)' : 'transparent',
                    transition: 'all var(--transition-fast)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => !isActive && ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-bg-grouped)')}
                  onMouseLeave={e => !isActive && ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')}
                  end={item.to === '/'}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 min-w-0 truncate">{t(item.labelKey)}</span>
                  {item.to === '/alerts' && criticalAlertCount > 0 && (
                    <span
                      className="flex-shrink-0"
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '2px 5px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--color-danger)',
                        color: '#FFFFFF',
                      }}
                    >
                      {criticalAlertCount}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function Shell({ children }: ShellProps) {
  const { role, setRole, isAdmin, viewAs, setViewAs, effectiveRole } = useRole()
  const { activeEntity: scopeEntity } = useEntityScope()
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const criticalAlertCount = useMemo(() => {
    try {
      const incs = generateIncidents()
      return incs.filter(i => i.severity === 'critical' || i.escalated).length
    } catch { return 0 }
  }, [])

  const notificationCount = 3

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg-secondary)' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-60 flex-shrink-0 flex flex-col
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{
          background: 'var(--color-bg-primary)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center px-4" style={{ height: 52, borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-accent)' }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>W</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>Wavult OS</span>
          </div>
          {/* Close btn (mobile) */}
          <button
            className="ml-auto md:hidden p-1"
            style={{ color: 'var(--color-text-tertiary)' }}
            onClick={() => setSidebarOpen(false)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Nav */}
        <SidebarNav
          criticalAlertCount={criticalAlertCount}
          onNavigate={() => setSidebarOpen(false)}
        />

        {/* Agent Claw — priority queue */}
        <div className="pt-3 mt-2 px-2" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="px-3 py-1 mb-2" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>Agent Claw</p>
          <AgentCommandPanel />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 mt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>Wavult Group 2026</p>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-6"
          style={{
            height: 52,
            background: 'rgba(242,242,247,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >

          {/* Left: hamburger + entity pill */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger — mobile only */}
            <button
              className="md:hidden flex-shrink-0 p-1 -ml-1 text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(v => !v)}
              aria-label="Toggle menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>

            {/* Entity pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: scopeEntity.color }} />
              <span className="text-xs font-medium text-gray-600 truncate max-w-[100px]">
                {scopeEntity.shortName ?? scopeEntity.name}
              </span>
            </div>
          </div>

          {/* Right: language toggle + role badge + bell + bernt */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {/* Language toggle */}
            <LanguageToggle />

            {/* Role badge */}
            {role && effectiveRole && (
              <>
                {isAdmin ? (
                  <select
                    value={viewAs?.id ?? ''}
                    onChange={e => {
                      const found = ROLES.find(r => r.id === e.target.value) ?? null
                      setViewAs(found)
                    }}
                    className="hidden sm:block text-xs bg-purple-50 border border-purple-200 rounded-full px-3 py-1 font-medium text-purple-700 cursor-pointer focus:outline-none appearance-none"
                  >
                    <option value="">{t('auth.admin')}</option>
                    {ROLES.filter(r => r.id !== 'admin').map(r => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                  </select>
                ) : (
                  <span
                    className="hidden sm:block text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: effectiveRole.color + '15', color: effectiveRole.color, border: `1px solid ${effectiveRole.color}30` }}
                  >
                    {effectiveRole.title}
                  </span>
                )}
                <button
                  onClick={() => { setRole(null); setViewAs(null) }}
                  className="text-xs text-gray-500 hover:text-gray-600 transition-colors font-medium"
                >
                  {t('auth.exit')}
                </button>
              </>
            )}

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(v => !v)}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors rounded-lg"
              >
                <Bell className="w-4 h-4" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 text-gray-900 text-[8px] font-bold flex items-center justify-center leading-none">
                    {notificationCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotifOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 z-50 w-[min(420px,calc(100vw-1rem))] max-h-[80vh] overflow-y-auto rounded-2xl border border-gray-200 shadow-lg bg-white">
                    <div className="p-4">
                      <NotificationCenter />
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto" style={{ background: 'var(--color-bg-secondary)' }}>
          <div className="p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] md:pb-6">
            {children}
          </div>
        </div>
      </main>

      {/* Bernt */}
      <BerntWidget />

      {/* Onboarding */}
      <OnboardingOverlay />

      {/* Guidance toast */}
      <GuidanceToast />
    </div>
  )
}

export function ShellWithGuidance({ children }: { children: React.ReactNode }) {
  return (
    <GuidanceProvider>
      <Shell>{children}</Shell>
    </GuidanceProvider>
  )
}
