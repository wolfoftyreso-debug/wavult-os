import React, { useMemo, useState, useEffect } from 'react'
import { WavultLogo } from '../components/WavultLogo'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, AlertTriangle, GitBranch, Network,
  Users, Briefcase, Megaphone,
  DollarSign, Receipt, ShoppingCart, CreditCard,
  Scale, Flag,
  BookOpen, Server, Settings, ShieldCheck,
  Bell,
  Smartphone, MapPin, Package,
  Building2, MessageSquare, FileText, Activity,
  Plane,
  Terminal,
  Globe,
  Rocket,
  Database,
  Zap,
  Film,
  Shield,
  Target,
} from 'lucide-react'
import { useRole, ROLES } from '../auth/RoleContext'
import { useTheme } from '../theme/ThemeContext'
import { EntitySwitcher } from '../../features/entity-switcher/EntitySwitcher'
import { generateIncidents } from '../../features/incidents/incidentEngine'
import { useEntityScope } from '../scope/EntityScopeContext'
import { BerntWidget } from '../../features/bernt/BerntWidget'
import { AgentCommandPanel } from '../../features/agent/AgentCommandPanel'
import { OnboardingOverlay } from '../../features/onboarding'
import { NotificationCenter } from '../../features/communications/NotificationCenter'
import { GuidanceProvider } from '../guidance/GuidanceSystem'
import { GuidanceToast } from '../guidance/GuidanceToast'
import { useTranslation } from '../i18n/useTranslation'
import { useAuth } from '../auth/AuthContext'
import { LanguageToggle } from '../i18n/LanguageToggle'
import { IllustrationModule } from '../ui/IllustrationModule'
import { useAuditLog } from '../audit/useAuditLog'
import { useNavigate } from 'react-router-dom'

// ─── Nav item/group types ──────────────────────────────────────────────────────

interface NavItem {
  to: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
  illustration?: string  // module key for IllustrationModule
}

interface NavGroup {
  labelKey: string | null
  items: NavItem[]
  roles?: string[]  // if set, group is visible only for these role IDs
}

const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'Verksamhet',
    items: [
      { to: '/',                labelKey: 'Dashboard',      icon: LayoutDashboard },
      { to: '/org',             labelKey: 'Org & Hierarki', icon: Network },
      { to: '/strategic-brief', labelKey: 'Strategi',       icon: Flag },
      { to: '/decisions',       labelKey: 'Beslut',         icon: Zap },
      { to: '/okr',             labelKey: 'OKR & Mål',      icon: Target },
      { to: '/milestones',      labelKey: 'Milstolpar',     icon: Rocket },
    ],
  },
  {
    labelKey: 'Bolag & Juridik',
    items: [
      { to: '/entities',             labelKey: 'Bolagsöversikt',     icon: Building2 },
      { to: '/company-launch',       labelKey: 'Bolagsstart',        icon: Rocket },
      { to: '/trust',                labelKey: 'Trust & Foundation',  icon: Shield },
      { to: '/legal',                labelKey: 'Legal Hub',          icon: Scale },
      { to: '/jurisdiction',         labelKey: 'Jurisdiktion',       icon: Globe },
      { to: '/corporate/compendium', labelKey: 'Kompendium',         icon: BookOpen },
      { to: '/qms',                  labelKey: 'QMS & Compliance',   icon: ShieldCheck },
    ],
  },
  {
    labelKey: 'Ekonomi',
    items: [
      { to: '/finance',      labelKey: 'Finance',        icon: DollarSign },
      { to: '/payroll',      labelKey: 'Lön & Personal', icon: Receipt },
      { to: '/transactions', labelKey: 'Transaktioner',  icon: CreditCard },
      { to: '/reports',      labelKey: 'Rapporter',      icon: FileText },
      { to: '/procurement',  labelKey: 'Inköp',          icon: ShoppingCart },
    ],
  },
  {
    labelKey: 'Team & People',
    items: [
      { to: '/people',              labelKey: 'Team',               icon: Users },
      { to: '/people-intelligence', labelKey: 'People Intelligence', icon: Activity },
      { to: '/talent-radar',        labelKey: 'Talent Radar',       icon: Zap },
      { to: '/wavult-id',           labelKey: 'Wavult ID',          icon: Shield },
      { to: '/travel',              labelKey: 'Resor',              icon: Plane },
    ],
  },
  {
    labelKey: 'Produkter',
    items: [
      { to: '/zoomer-app',     labelKey: 'quiXzoom',     icon: Smartphone },
      { to: '/quixzoom-ads',   labelKey: 'quiXzoom Ads', icon: Megaphone },
      { to: '/landvex-portal', labelKey: 'LandveX',      icon: MapPin },
      { to: '/uapix',          labelKey: 'UAPIX',        icon: Package },
      { to: '/apifly',         labelKey: 'Apifly',       icon: Zap },
    ],
  },
  {
    labelKey: 'Marknad & CRM',
    items: [
      { to: '/crm',       labelKey: 'CRM',       icon: Briefcase },
      { to: '/campaigns', labelKey: 'Kampanjer', icon: Megaphone },
      { to: '/media',     labelKey: 'Media',     icon: Film },
    ],
  },
  {
    labelKey: 'Drift & Infra',
    items: [
      { to: '/git',            labelKey: 'Git',            icon: GitBranch },
      { to: '/system',         labelKey: 'Systemöversikt', icon: Server },
      { to: '/infrastructure', labelKey: 'Infrastruktur',  icon: Server },
      { to: '/terraform',      labelKey: 'Terraform',      icon: Database },
      { to: '/communications', labelKey: 'Kommunikation',  icon: MessageSquare },
      { to: '/automation',     labelKey: 'Automation',     icon: Zap },
    ],
  },
  {
    labelKey: 'Dev',
    roles: ['group-ceo', 'cto', 'admin'],
    items: [
      { to: '/code',  labelKey: 'Code',  icon: Terminal },
      { to: '/devos', labelKey: 'DevOS', icon: Zap },
    ],
  },
]

// ─── Shell ────────────────────────────────────────────────────────────────────

interface ShellProps {
  children: React.ReactNode
}

function SidebarNav({ criticalAlertCount, onNavigate, onAuditLog, entityAccentColor }: {
  criticalAlertCount: number
  onNavigate?: () => void
  onAuditLog?: (module: string, label: string) => void
  entityAccentColor?: string
}) {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const { effectiveRole } = useRole()

  const visibleGroups = NAV_GROUPS.filter(group => {
    if (!group.roles) return true
    return group.roles.includes(effectiveRole?.id ?? '')
  })

  return (
    <nav className="flex-1 px-2 py-2 overflow-y-auto">
      {visibleGroups.map((group, gi) => (
        <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
          {group.labelKey && (
            <div className="text-[9px] font-bold text-[#8A8278] uppercase tracking-wider px-3 py-1.5 mt-4 first:mt-0">
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
                  onClick={() => {
                    onAuditLog?.(item.to.replace(/^\//, '') || 'dashboard', t(item.labelKey))
                    onNavigate?.()
                  }}
                  className="flex items-center gap-3 min-w-0"
                  style={{
                    padding: '6px 12px',
                    paddingLeft: isActive ? '9px' : '12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#0A3D62' : 'var(--sidebar-text, #E5E5E1)',
                    background: isActive ? '#F5F0E8' : 'transparent',
                    borderLeft: isActive ? '2px solid #E8B84B' : '2px solid transparent',
                    transition: 'all var(--transition-fast)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => !isActive && ((e.currentTarget as HTMLAnchorElement).style.background = '#F5F0E8') && ((e.currentTarget as HTMLAnchorElement).style.color = '#0A3D62')}
                  onMouseLeave={e => !isActive && ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent') && ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--sidebar-text, #E5E5E1)')}
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
  const { role, setRole: _setRole, isAdmin, viewAs, setViewAs, effectiveRole } = useRole()
  const { signOut } = useAuth()
  const { activeEntity: scopeEntity } = useEntityScope()
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { log } = useAuditLog()
  const navigate = useNavigate()

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
    <div className="flex overflow-hidden" style={{ height: '100dvh', minHeight: '100vh', width: '100vw', background: 'var(--color-bg, #F2EDE4)' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-white/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-60 flex-shrink-0 flex flex-col
          sidebar-depth
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{
          background: 'var(--sidebar-bg, #1A1A2E)',
          borderRight: '1px solid var(--sidebar-border, rgba(201,168,76,0.15))',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col px-4 pt-3 pb-2" style={{ borderBottom: '1px solid var(--sidebar-border, rgba(201,168,76,0.15))' }}>
          <div className="flex items-center">
            <div className="flex items-center gap-2.5 min-w-0">
              <WavultLogo
                size={32}
                variant="white"
                showWordmark={true}
              />
            </div>
            {/* Close btn (mobile) */}
            <button
              className="ml-auto md:hidden p-1"
              style={{ color: 'var(--sidebar-text, rgba(245,240,232,0.75))' }}
              onClick={() => setSidebarOpen(false)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          {/* Active entity badge */}
          {scopeEntity && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: scopeEntity.color ?? '#8B7355',
                  flexShrink: 0,
                }}
              />
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'rgba(245,240,232,0.65)',
                fontFamily: 'var(--font-mono, monospace)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {scopeEntity.name}
              </span>
            </div>
          )}
        </div>

        {/* Entity Switcher — prominent at top of nav */}
        <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--sidebar-border, rgba(201,168,76,0.15))' }}>
          <p className="px-1 mb-2" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sidebar-text, rgba(245,240,232,0.75))' }}>{t('shell.activeEntity')}</p>
          <EntitySwitcher />
        </div>

        {/* Nav */}
        <SidebarNav
          criticalAlertCount={criticalAlertCount}
          onNavigate={() => setSidebarOpen(false)}
          onAuditLog={(module, label) => log({ type: 'navigate', module, label: `Navigerade till ${label}` })}
          entityAccentColor={scopeEntity?.color}
        />

        {/* Agent Claw — priority queue */}
        <div className="pt-3 mt-2 px-2" style={{ borderTop: '1px solid var(--sidebar-border, rgba(201,168,76,0.15))' }}>
          <p className="px-3 py-1 mb-2" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--sidebar-text, rgba(245,240,232,0.75))', fontFamily: 'var(--font-mono)' }}>{t('nav.group.agentClaw')}</p>
          <AgentCommandPanel />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 mt-2" style={{ borderTop: '1px solid var(--sidebar-border, rgba(139,115,85,0.20))' }}>
          <p style={{ fontSize: 12, color: 'var(--sidebar-text, #E5E5E1)', fontFamily: 'var(--font-mono)', opacity: 0.5 }}>Wavult DS {new Date().getFullYear()}</p>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-6 topbar-glass"
          style={{
            height: 52,
          }}
        >

          {/* Left: hamburger + URL-bar */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger — mobile only */}
            <button
              className="md:hidden flex-shrink-0 p-1 -ml-1"
              style={{ color: '#6B6560' }}
              onClick={() => setSidebarOpen(v => !v)}
              aria-label="Toggle menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>

            {/* URL-bar pill */}
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: '#DED9CC', border: '1px solid #C4BFB2' }}
            >
              <span style={{ fontSize: 10, color: '#8A8278' }}>🔒</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1A1A', fontFamily: 'var(--font-mono)' }}>os.wavult.com</span>
            </div>
          </div>

          {/* Right: language toggle + role badge + logout + avatar */}
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
                    className="hidden sm:block text-xs rounded-full px-3 py-1 font-medium cursor-pointer focus:outline-none appearance-none"
                    style={{ background: '#DED9CC', border: '1px solid #C4BFB2', color: '#1A1A1A' }}
                  >
                    <option value="">{t('auth.admin')}</option>
                    {ROLES.filter(r => r.id !== 'admin').map(r => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                  </select>
                ) : (
                  <span
                    className="hidden sm:block text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: '#DED9CC', color: '#1A1A1A', border: '1px solid #C4BFB2' }}
                  >
                    {effectiveRole.title}
                  </span>
                )}
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1 text-xs font-medium transition-colors"
                  style={{ color: '#6B6560' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#C0392B')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#6B6560')}
                >
                  {t('auth.logout')}
                </button>
                {/* Avatar — klick navigerar till profil */}
                <button
                  onClick={() => {
                    log({ type: 'navigate', module: 'auth', label: 'Navigerade till Profil' })
                    navigate('/profile')
                  }}
                  className="hidden sm:flex h-7 w-7 rounded-full items-center justify-center text-xs font-bold flex-shrink-0 cursor-pointer"
                  style={{ background: '#8B7355', color: '#F5F0E8', border: 'none' }}
                  title="Min profil & sessionshistorik"
                >
                  {effectiveRole?.initials?.charAt(0) ?? 'E'}
                </button>
              </>
            )}

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(v => !v)}
                className="relative p-2 transition-colors rounded-lg"
                style={{ color: '#6B6560' }}
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
                  <div
                    style={{
                      position: 'fixed',
                      top: 60,
                      right: 8,
                      left: 8,
                      maxWidth: 440,
                      marginLeft: 'auto',
                      maxHeight: 'calc(100vh - 80px)',
                      overflowY: 'auto',
                      zIndex: 9999,
                      borderRadius: 16,
                      border: '1px solid var(--color-border)',
                      boxShadow: '0 8px 40px rgba(26,26,46,0.18)',
                      background: '#fff',
                    }}
                  >
                    <div style={{ padding: 16 }}>
                      <NotificationCenter />
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </header>

        {/* Content */}
        <div className="content-scroll-area flex-1 overflow-auto" style={{ background: 'var(--color-bg, #F2EDE4)' }}>
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