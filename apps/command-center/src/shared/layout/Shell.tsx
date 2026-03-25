import React, { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { EntitySwitcher } from '../../features/entity-switcher/EntitySwitcher'
import { useRole, ROLES } from '../auth/RoleContext'
import { generateIncidents } from '../../features/incidents/incidentEngine'

function ContentArea({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const fullBleed = pathname.startsWith('/org') || pathname.startsWith('/entities') || pathname.startsWith('/org/command') || pathname.startsWith('/incidents')
  return (
    <div className={`h-full ${fullBleed ? '' : 'overflow-auto p-6'}`}>
      {children}
    </div>
  )
}

interface ShellProps {
  children: React.ReactNode
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '⬛' },
  { to: '/entities', label: 'Entities', icon: '🏢' },
  { to: '/incidents', label: 'Incident Center', icon: '🚨' },
  { to: '/org/command', label: 'Command Chain', icon: '⬆' },
  { to: '/org/context', label: 'My Position', icon: '🎯' },
  { to: '/org', label: 'Corporate Graph', icon: '🏗' },
  { to: '/projects', label: 'Projekt & KPI', icon: '🚀' },
  { to: '/tasks', label: 'Task Board', icon: '📋' },
  { to: '/people', label: 'Team', icon: '👤' },
  { to: '/transactions', label: 'Transactions', icon: '↕' },
]

export function Shell({ children }: ShellProps) {
  const { role, setRole, isAdmin, viewAs, setViewAs, effectiveRole } = useRole()
  const nonAdminRoles = ROLES.filter(r => r.id !== 'admin')
  const criticalIncidentCount = useMemo(() => {
    try {
      const incs = generateIncidents()
      return incs.filter(i => i.severity === 'critical' || i.escalated).length
    } catch { return 0 }
  }, [])

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

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
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
              <span className="text-base leading-none">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.to === '/incidents' && criticalIncidentCount > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white flex-shrink-0">
                  {criticalIncidentCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-border">
          <p className="text-xs text-gray-600">Wavult Group © 2026</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar — single, clean, no duplication */}
        <header className="h-11 flex-shrink-0 border-b border-surface-border flex items-center justify-between px-6 bg-[#07080F]">
          {/* System status */}
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-brand-success" />
            <span className="text-[10px] text-gray-700 font-mono">OPERATIONAL</span>
          </div>

          {/* Right: context selector + logout */}
          <div className="flex items-center gap-2">
            {role && effectiveRole && (
              <>
                {/* Viewing context — admin gets dropdown, others see static badge */}
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

        {/* Content — org-graph gets full bleed, other routes get padding */}
        <div className="flex-1 overflow-hidden">
          <ContentArea>{children}</ContentArea>
        </div>
      </main>
    </div>
  )
}
