// ─── Wavult App — Personal Dashboard ────────────────────────────────────────────
// The first thing you see. Not a dashboard you browse — a personal status surface.
// Shows: your avatar + greeting, your stats, your tasks, system pulse.

import { useAuth } from '../lib/AuthContext'
import { OperatorAvatar } from '../components/OperatorAvatar'
import { useAvatar } from '../lib/AvatarContext'
import { useIdentity } from '../core/identity/IdentityContext'

// ─── Mock data (will connect to Supabase) ────────────────────────────────────

const OPERATOR_STATS = {
  tasksToday: 3,
  tasksDone: 1,
  eventsResolved: 7,
  streak: 4,
  avgResponse: '3m',
}

const MY_TASKS = [
  { id: '1', title: 'Review LandveX AB formation docs', priority: 'high' as const, dueLabel: 'Today', done: false },
  { id: '2', title: 'Approve quiXzoom Stockholm deployment', priority: 'normal' as const, dueLabel: 'Today', done: true },
  { id: '3', title: 'Submit Q2 cashflow projection', priority: 'high' as const, dueLabel: 'Tomorrow', done: false },
  { id: '4', title: 'Sign intercompany service agreement', priority: 'normal' as const, dueLabel: 'This week', done: false },
]

const SYSTEM_PULSE = [
  { label: 'Entities', value: '2/7', status: 'warn' as const },
  { label: 'Systems', value: '3 live', status: 'ok' as const },
  { label: 'Revenue', value: 'Pre-rev', status: 'alert' as const },
  { label: 'Team', value: '5/5', status: 'ok' as const },
]

const PRIORITY_COLOR = {
  critical: '#D94040',
  high: '#C4961A',
  normal: '#4A7A9B',
  low: '#3D4452',
}

const PULSE_COLOR = {
  ok: '#4A7A5B',
  warn: '#C4961A',
  alert: '#D94040',
}

// ─── Components ──────────────────────────────────────────────────────────────

function GreetingHeader() {
  const { user } = useAuth()
  const { openUploader } = useAvatar()
  const name = user?.user_metadata?.full_name || 'Operator'
  const firstName = name.split(' ')[0]
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="px-5 pt-6 pb-4 flex items-center gap-4">
      <OperatorAvatar
        initials={initials}
        color="#8B5CF6"
        size="lg"
        ring
        onClick={openUploader}
      />
      <div className="flex-1 min-w-0">
        <p className="text-label text-tx-tertiary font-mono uppercase">{greeting}</p>
        <h1 className="text-action text-tx-primary">{firstName}</h1>
      </div>
      {/* Ambient status dot */}
      <div className="flex flex-col items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-full bg-signal-amber animate-pulse-slow" />
        <span className="text-[8px] text-tx-muted font-mono">ACTIVE</span>
      </div>
    </div>
  )
}

function StatsRow() {
  const stats = [
    { label: 'Tasks', value: `${OPERATOR_STATS.tasksDone}/${OPERATOR_STATS.tasksToday}`, color: '#C4961A' },
    { label: 'Resolved', value: String(OPERATOR_STATS.eventsResolved), color: '#4A7A5B' },
    { label: 'Streak', value: String(OPERATOR_STATS.streak), color: '#4A7A9B' },
    { label: 'Avg', value: OPERATOR_STATS.avgResponse, color: '#8B919A' },
  ]

  return (
    <div className="px-5 grid grid-cols-4 gap-2">
      {stats.map(s => (
        <div key={s.label} className="stat-card text-center">
          <div className="text-stat" style={{ color: s.color }}>{s.value}</div>
          <div className="text-label text-tx-muted font-mono mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

function TaskList() {
  return (
    <div className="px-5 mt-6">
      <h2 className="text-label text-tx-tertiary font-mono uppercase mb-3">Today's Tasks</h2>
      <div className="space-y-1.5">
        {MY_TASKS.map(task => (
          <div
            key={task.id}
            className={`app-card flex items-center gap-3 ${task.done ? 'opacity-40' : ''}`}
          >
            <div
              className="h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              style={{
                borderColor: task.done ? '#4A7A5B' : PRIORITY_COLOR[task.priority],
                background: task.done ? '#4A7A5B' : 'transparent',
              }}
            >
              {task.done && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M3 6l2 2 4-4" stroke="#0F1218" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${task.done ? 'line-through text-tx-muted' : 'text-tx-primary'}`}>
                {task.title}
              </p>
              <p className="text-label text-tx-muted font-mono mt-0.5">{task.dueLabel}</p>
            </div>
            {!task.done && (
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ background: PRIORITY_COLOR[task.priority] }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SystemPulse() {
  return (
    <div className="px-5 mt-6">
      <h2 className="text-label text-tx-tertiary font-mono uppercase mb-3">System Pulse</h2>
      <div className="grid grid-cols-2 gap-2">
        {SYSTEM_PULSE.map(p => (
          <div key={p.label} className="stat-card flex items-center gap-3">
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ background: PULSE_COLOR[p.status] }}
            />
            <div>
              <div className="text-xs font-semibold text-tx-primary">{p.value}</div>
              <div className="text-label text-tx-muted font-mono">{p.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Identity Surface ────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<string, string> = {
  decision: 'Decisions', review: 'Review', create: 'Create',
  coordinate: 'Coordinate', analyze: 'Analyze', communicate: 'Communicate',
  execute: 'Execute', learn: 'Learn',
}

function IdentitySurface() {
  const { health, recommendations, confidence, identity } = useIdentity()

  const energyColor = health.energyStatus === 'high' ? '#4A7A5B'
    : health.energyStatus === 'moderate' ? '#C4961A' : '#D94040'

  return (
    <div className="px-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-label text-tx-tertiary font-mono uppercase">Your Model</h2>
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-1 bg-w-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${confidence * 100}%`,
                background: confidence > 0.5 ? '#4A7A5B' : '#C4961A',
              }}
            />
          </div>
          <span className="text-[9px] text-tx-muted font-mono">{Math.round(confidence * 100)}%</span>
        </div>
      </div>

      {/* Energy + recommended next */}
      <div className="app-card mb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: energyColor }} />
            <span className="text-xs text-tx-secondary">Energy: {health.energyStatus}</span>
          </div>
          <span className="text-[9px] text-tx-muted font-mono">{identity.totalObservations} data points</span>
        </div>
        <p className="text-xs text-tx-tertiary">{health.nextRecommendation}</p>
      </div>

      {/* Recommended task types */}
      <div className="space-y-1.5">
        {recommendations.map((rec, i) => (
          <div key={rec.taskCategory} className="app-card flex items-center gap-3">
            <span className="text-lg font-bold text-tx-muted w-5 text-center">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-tx-primary">
                {CATEGORY_LABEL[rec.taskCategory] || rec.taskCategory}
              </span>
              <p className="text-[10px] text-tx-tertiary mt-0.5">{rec.reason}</p>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-8 h-1 bg-w-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${rec.score * 100}%`,
                    background: rec.score > 0.6 ? '#4A7A5B' : '#C4961A',
                  }}
                />
              </div>
              <span className="text-[9px] text-tx-muted font-mono">{Math.round(rec.score * 100)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function DashboardView() {
  return (
    <div className="pb-24 animate-fade-in">
      <GreetingHeader />
      <StatsRow />
      <TaskList />
      <IdentitySurface />
      <SystemPulse />
    </div>
  )
}
