import React from 'react'
import { NavLink } from 'react-router-dom'
import { EntitySwitcher } from '../../features/entity-switcher/EntitySwitcher'
import { useRole } from '../auth/RoleContext'

interface ShellProps {
  children: React.ReactNode
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '⬛' },
  { to: '/projects', label: 'Projekt & KPI', icon: '🚀' },
  { to: '/tasks', label: 'Task Board', icon: '📋' },
  { to: '/people', label: 'Team', icon: '👤' },
  { to: '/transactions', label: 'Transactions', icon: '↕' },
  { to: '/entities', label: 'Entities', icon: '🏢' },
]

export function Shell({ children }: ShellProps) {
  const { role, setRole } = useRole()

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
              {item.label}
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
        {/* Top bar */}
        <header className="h-14 flex-shrink-0 border-b border-surface-border flex items-center justify-between px-6 bg-surface-raised">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-brand-success animate-pulse" />
            <span className="text-xs text-gray-400">All systems operational</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            {role && (
              <>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: role.color + '18', color: role.color, border: `1px solid ${role.color}30` }}>
                  {role.emoji} {role.title}
                </span>
                <span className="text-gray-500">{role.name}</span>
                <button
                  onClick={() => setRole(null)}
                  className="text-xs text-gray-600 hover:text-gray-300 transition-colors px-2 py-1 rounded border border-surface-border hover:border-gray-500"
                >
                  Byt roll
                </button>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
