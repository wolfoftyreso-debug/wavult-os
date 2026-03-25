// ─── Wavult App — Tab Bar ───────────────────────────────────────────────────────
// Bottom navigation. Mobile-native feel. Four tabs: Home, Events, Notifications, Profile.

import { NavLink } from 'react-router-dom'

const TABS = [
  {
    to: '/briefing',
    label: 'Briefing',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#C4961A' : '#3D4452'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    to: '/events',
    label: 'Events',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#C4961A' : '#3D4452'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    badge: true,
  },
  {
    to: '/notifications',
    label: 'Alerts',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#C4961A' : '#3D4452'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#C4961A' : '#3D4452'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

interface TabBarProps {
  eventCount?: number
}

export function TabBar({ eventCount = 0 }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-w-bg/95 backdrop-blur-lg border-t border-w-border z-50"
      style={{ paddingBottom: 'var(--safe-area-bottom)' }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {TABS.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `tab-item ${isActive ? 'tab-item--active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  {tab.icon(isActive)}
                  {tab.badge && eventCount > 0 && (
                    <span className="notif-dot" />
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
