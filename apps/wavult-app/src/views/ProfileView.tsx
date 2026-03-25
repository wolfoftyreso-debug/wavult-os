// ─── Wavult App — Profile & Settings ────────────────────────────────────────────
// Operator profile with Ready Player Me avatar, stats, role info, sign out.

import { useAuth } from '../lib/AuthContext'
import { useAvatar } from '../lib/AvatarContext'
import { OperatorAvatar } from '../components/OperatorAvatar'

// Mock operator data
const OPERATOR = {
  role: 'Chairman & Group CEO',
  entities: ['WGH', 'WOP', 'QZ-EU', 'QZ-US', 'LVX-US', 'SOMH'],
  accentColor: '#8B5CF6',
  stats: {
    totalResolved: 142,
    avgResponseMin: 3.2,
    longestStreak: 12,
    activeSince: 'Mar 2026',
  },
}

export function ProfileView() {
  const { user, signOut } = useAuth()
  const { avatarUrl, openUploader, removeAvatar, saving } = useAvatar()
  const name = user?.user_metadata?.full_name || user?.email || 'Operator'
  const email = user?.email || ''
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="pb-24 animate-fade-in">
      {/* Header with avatar */}
      <div className="px-5 pt-8 pb-6 text-center">
        {/* Avatar — tap to create/change */}
        <div className="relative inline-block mb-3">
          <OperatorAvatar
            initials={initials}
            color={OPERATOR.accentColor}
            size="xl"
            ring
            onClick={openUploader}
          />
          {/* Edit badge */}
          <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-w-surface border-2 border-w-bg flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#C4961A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11.5 1.5a2.121 2.121 0 013 3L5 14l-4 1 1-4z" />
            </svg>
          </div>
        </div>

        <h1 className="text-lg font-bold text-tx-primary">{name}</h1>
        <p className="text-xs text-tx-tertiary mt-0.5">{OPERATOR.role}</p>
        <p className="text-label text-tx-muted font-mono mt-1">{email}</p>

        {/* Avatar actions */}
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            onClick={openUploader}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded-pill font-medium transition-all bg-signal-amber/15 text-signal-amber border border-signal-amber/30 active:scale-95 disabled:opacity-50"
          >
            {avatarUrl ? 'Change Avatar' : 'Create Avatar'}
          </button>
          {avatarUrl && (
            <button
              onClick={removeAvatar}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-pill text-tx-muted border border-w-border active:scale-95 disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 grid grid-cols-2 gap-2 mb-6">
        {[
          { label: 'Total Resolved', value: String(OPERATOR.stats.totalResolved), color: '#4A7A5B' },
          { label: 'Avg Response', value: `${OPERATOR.stats.avgResponseMin}m`, color: '#4A7A9B' },
          { label: 'Best Streak', value: String(OPERATOR.stats.longestStreak), color: '#C4961A' },
          { label: 'Active Since', value: OPERATOR.stats.activeSince, color: '#8B919A' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-label text-tx-muted font-mono mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Entities */}
      <div className="px-5 mb-6">
        <h2 className="text-label text-tx-tertiary font-mono uppercase mb-3">Active Entities</h2>
        <div className="flex flex-wrap gap-2">
          {OPERATOR.entities.map(e => (
            <span
              key={e}
              className="text-xs px-3 py-1.5 rounded-pill bg-w-card border border-w-border text-tx-secondary font-mono"
            >
              {e}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 space-y-2">
        <button
          onClick={signOut}
          className="app-btn app-btn--danger"
        >
          Sign Out
        </button>
      </div>

      <p className="text-center text-[10px] text-tx-muted font-mono mt-8">WAVULT OS v2</p>
    </div>
  )
}
