// ─── Wavult App — Main Application ──────────────────────────────────────────────
// Mobile-first, event-driven personal app. Telegram speed, Wavult OS v2 atmosphere.

import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { AvatarProvider } from './lib/AvatarContext'
import { IdentityProvider } from './core/identity/IdentityContext'
import { StateProvider } from './core/state/StateContext'
import { LoginView } from './views/LoginView'
import { DashboardView } from './views/DashboardView'
import { EventsView } from './views/EventsView'
import { NotificationsView } from './views/NotificationsView'
import { ProfileView } from './views/ProfileView'
import { TabBar } from './components/TabBar'
import { AvatarCreator } from './components/AvatarCreator'

function AuthenticatedApp() {
  return (
    <AvatarProvider>
      <IdentityProvider>
      <StateProvider>
      <div className="min-h-screen bg-w-bg">
        <div className="max-w-lg mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/events" element={<EventsView />} />
            <Route path="/notifications" element={<NotificationsView />} />
            <Route path="/profile" element={<ProfileView />} />
          </Routes>
        </div>
        <TabBar eventCount={6} />
        <AvatarCreator />
      </div>
      </StateProvider>
      </IdentityProvider>
    </AvatarProvider>
  )
}

function AppRouter() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-w-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-label text-tx-tertiary font-mono animate-pulse">WAVULT</p>
        </div>
      </div>
    )
  }

  if (!user) return <LoginView />

  return <AuthenticatedApp />
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
