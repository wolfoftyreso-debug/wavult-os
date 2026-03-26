// ─── Business Shell — Apple Native Clarity ──────────────────────────────────
// Light theme. SF Pro / Inter. List-based navigation.
// If you can't understand a screen in 2 seconds, it's wrong.

import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useRole, ROLES } from '../../shared/auth/RoleContext'

// ─── Navigation ─────────────────────────────────────────────────────────────

interface NavItem { path: string; label: string; section: 'core' | 'modules' }

const NAV: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', section: 'core' },
  { path: '/operations', label: 'Operations', section: 'core' },
  { path: '/sales', label: 'Sales', section: 'core' },
  { path: '/finance', label: 'Finance', section: 'core' },
  { path: '/people', label: 'People', section: 'core' },
  { path: '/entities', label: 'Companies', section: 'modules' },
  { path: '/corporate', label: 'Structure', section: 'modules' },
  { path: '/payment-os', label: 'Payments', section: 'modules' },
  { path: '/wallet-os', label: 'Wallet', section: 'modules' },
  { path: '/org', label: 'Organization', section: 'modules' },
]

function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const core = NAV.filter(n => n.section === 'core')
  const modules = NAV.filter(n => n.section === 'modules')

  function active(path: string) {
    if (path === '/dashboard') return pathname === '/' || pathname === '/dashboard'
    return pathname.startsWith(path)
  }

  return (
    <aside className="w-52 flex-shrink-0 bg-[#F2F2F7] border-r border-[#D1D1D6] flex flex-col h-full overflow-hidden">
      <div className="h-12 flex items-center px-4 flex-shrink-0">
        <span className="text-[15px] font-semibold text-[#1C1C1E]">Wavult</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {core.map(item => (
          <button key={item.path} onClick={() => navigate(item.path)}
            className="w-full text-left px-3 py-[7px] rounded-lg text-[14px] transition-colors mb-px"
            style={{
              background: active(item.path) ? '#007AFF' : 'transparent',
              color: active(item.path) ? '#FFFFFF' : '#1C1C1E',
              fontWeight: active(item.path) ? 600 : 400,
            }}>
            {item.label}
          </button>
        ))}

        <div className="mt-4 pt-3 border-t border-[#D1D1D6]">
          <div className="px-3 mb-1">
            <span className="text-[11px] text-[#8E8E93] font-medium uppercase">Modules</span>
          </div>
          {modules.map(item => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="w-full text-left px-3 py-[6px] rounded-lg text-[13px] transition-colors mb-px"
              style={{
                background: active(item.path) ? '#007AFF' : 'transparent',
                color: active(item.path) ? '#FFFFFF' : '#3C3C43',
              }}>
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </aside>
  )
}

function TopBar() {
  const { setRole, effectiveRole, isAdmin, viewAs, setViewAs } = useRole()
  const nonAdminRoles = ROLES.filter(r => r.id !== 'admin')

  return (
    <header className="h-10 flex-shrink-0 border-b border-[#D1D1D6] flex items-center justify-end px-4 bg-[#FFFFFF]">
      {effectiveRole && (
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <select value={viewAs?.id ?? ''} onChange={e => setViewAs(nonAdminRoles.find(r => r.id === e.target.value) ?? null)}
              className="text-[12px] bg-white border border-[#D1D1D6] rounded-md px-2 py-1 text-[#3C3C43] focus:outline-none appearance-none">
              <option value="">Admin</option>
              {nonAdminRoles.map(r => <option key={r.id} value={r.id}>{r.initials} {r.title}</option>)}
            </select>
          ) : (
            <span className="text-[12px] text-[#8E8E93]">{effectiveRole.title}</span>
          )}
          <button onClick={() => { setRole(null); setViewAs(null) }} className="text-[11px] text-[#007AFF]">
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}

export function BusinessShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F2F2F7] overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        <div className="flex-1 overflow-auto bg-[#F2F2F7]">
          {children}
        </div>
      </main>
    </div>
  )
}
