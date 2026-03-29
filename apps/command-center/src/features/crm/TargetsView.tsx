import { PROSPECTS, ACTIVITIES, DEALS, TEAM_COLORS, formatSEK, type TeamMember } from './data'

interface Target {
  label: string
  current: number
  goal: number
  unit: string
  color: string
}

interface PersonTarget {
  member: TeamMember
  targets: Target[]
}

// ─── Thailand deadline: 11 april 2026 ─────────────────────────────────────────

const THAILAND_DATE = new Date('2026-04-11T00:00:00+02:00')

function getDaysLeft(): number {
  const now = new Date()
  return Math.max(0, Math.ceil((THAILAND_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

function ProgressBar({ current, goal, color }: { current: number; goal: number; color: string }) {
  const pct = Math.min(100, Math.round((current / goal) * 100))
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-surface-overlay rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs tabular-nums font-semibold" style={{ color, minWidth: 36, textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  )
}

function TargetCard({ member }: { member: PersonTarget }) {
  const color = TEAM_COLORS[member.member]
  const overallPct = Math.round(
    member.targets.reduce((sum, t) => sum + Math.min(1, t.current / t.goal), 0) / member.targets.length * 100
  )

  return (
    <div className="bg-surface-raised border border-surface-border rounded-xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-base font-bold"
            style={{ background: color + '20', color, border: `2px solid ${color}40` }}
          >
            {member.member[0]}
          </div>
          <div>
            <p className="font-bold text-gray-900">{member.member}</p>
            <p className="text-xs text-gray-500">Säljmål Thailand</p>
          </div>
        </div>
        <div
          className="text-lg font-bold tabular-nums px-3 py-1.5 rounded-xl"
          style={{ background: color + '15', color }}
        >
          {overallPct}%
        </div>
      </div>

      {/* Targets */}
      <div className="space-y-3">
        {member.targets.map((t, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{t.label}</span>
              <span className="text-gray-900 font-semibold tabular-nums">
                {t.unit === 'SEK' ? formatSEK(t.current) : t.current}
                <span className="text-gray-500 font-normal"> / {t.unit === 'SEK' ? formatSEK(t.goal) : `${t.goal} ${t.unit}`}</span>
              </span>
            </div>
            <ProgressBar current={t.current} goal={t.goal} color={t.color} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function TargetsView() {
  const daysLeft = getDaysLeft()

  // ─── Compute real stats from mock data ──────────────────────────────────────
  const wonProspects = PROSPECTS.filter(p => p.stage === 'Vunnen')
  const signedDeals = DEALS.filter(d => d.status === 'Signerad')

  function demoCount(member: TeamMember) {
    return ACTIVITIES.filter(a => a.type === 'Demo' && a.by === member).length
  }
  function wonCount(member: TeamMember) {
    return wonProspects.filter(p => p.assignee === member).length
  }
  function signedARR(member: TeamMember) {
    return signedDeals.filter(d => d.assignee === member).reduce((s, d) => s + d.valueSEK, 0)
  }

  const teamTargets: PersonTarget[] = [
    {
      member: 'Leon',
      targets: [
        { label: 'Signerade kunder', current: wonCount('Leon'), goal: 5, unit: 'kunder', color: TEAM_COLORS.Leon },
        { label: 'Total ARR', current: signedARR('Leon'), goal: 1200000, unit: 'SEK', color: '#3B82F6' },
        { label: 'Demos utförda', current: demoCount('Leon'), goal: 8, unit: 'demos', color: '#8B5CF6' },
        { label: 'Prospects kvalificerade', current: PROSPECTS.filter(p => p.assignee === 'Leon' && p.stage !== 'Lead').length, goal: 6, unit: 'st', color: '#F59E0B' },
      ],
    },
    {
      member: 'Dennis',
      targets: [
        { label: 'Avtal under hantering', current: DEALS.filter(d => d.assignee === 'Dennis').length, goal: 3, unit: 'avtal', color: TEAM_COLORS.Dennis },
        { label: 'Signerade avtal', current: signedDeals.filter(d => d.assignee === 'Dennis').length, goal: 2, unit: 'st', color: '#10B981' },
        { label: 'Total ARR', current: signedARR('Dennis'), goal: 500000, unit: 'SEK', color: '#3B82F6' },
        { label: 'Demos utförda', current: demoCount('Dennis'), goal: 3, unit: 'demos', color: '#8B5CF6' },
      ],
    },
    {
      member: 'Erik',
      targets: [
        { label: 'Strategiska prospects', current: PROSPECTS.filter(p => p.assignee === 'Erik').length, goal: 4, unit: 'st', color: TEAM_COLORS.Erik },
        { label: 'Deals i förhandling', current: PROSPECTS.filter(p => p.assignee === 'Erik' && (p.stage === 'Förhandling' || p.stage === 'Offert')).length, goal: 3, unit: 'st', color: '#F59E0B' },
        { label: 'Total ARR (pipeline)', current: PROSPECTS.filter(p => p.assignee === 'Erik').reduce((s, p) => s + p.valueSEK, 0), goal: 1500000, unit: 'SEK', color: '#3B82F6' },
        { label: 'Demos utförda', current: demoCount('Erik'), goal: 4, unit: 'demos', color: '#10B981' },
      ],
    },
  ]

  // Team totals
  const totalSignedARR = signedDeals.reduce((s, d) => s + d.valueSEK, 0)
  const totalGoalARR = 3200000
  const totalSignedCustomers = wonProspects.length
  const totalDemos = ACTIVITIES.filter(a => a.type === 'Demo').length

  return (
    <div className="space-y-6">
      {/* Thailand countdown banner */}
      <div
        className="rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4"
        style={{ background: 'linear-gradient(135deg, #8B5CF620 0%, #3B82F615 100%)', border: '1px solid #8B5CF630' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏖️</span>
            <h2 className="text-sm font-semibold text-gray-900">Thailand Workcamp</h2>
          </div>
          <p className="text-sm text-gray-500">
            11 april 2026 — Teambuilding + projektlansering. Säljmålen ska vara uppfyllda.
          </p>
        </div>
        <div className="text-center flex-shrink-0">
          <p className="text-4xl font-bold text-gray-900 tabular-nums">{daysLeft}</p>
          <p className="text-sm text-gray-500">dagar kvar</p>
        </div>
      </div>

      {/* Team overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-surface-raised border border-surface-border rounded-xl px-5 py-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{totalSignedCustomers}</p>
          <p className="text-sm text-gray-500 mt-1">Signerade kunder</p>
          <ProgressBar current={totalSignedCustomers} goal={8} color="#10B981" />
          <p className="text-xs text-gray-500 mt-1">Mål: 8</p>
        </div>
        <div className="bg-surface-raised border border-surface-border rounded-xl px-5 py-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{formatSEK(totalSignedARR)}</p>
          <p className="text-sm text-gray-500 mt-1">Total signerad ARR</p>
          <ProgressBar current={totalSignedARR} goal={totalGoalARR} color="#3B82F6" />
          <p className="text-xs text-gray-500 mt-1">Mål: {formatSEK(totalGoalARR)}</p>
        </div>
        <div className="bg-surface-raised border border-surface-border rounded-xl px-5 py-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{totalDemos}</p>
          <p className="text-sm text-gray-500 mt-1">Demos utförda</p>
          <ProgressBar current={totalDemos} goal={15} color="#8B5CF6" />
          <p className="text-xs text-gray-500 mt-1">Mål: 15</p>
        </div>
      </div>

      {/* Per person */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {teamTargets.map(t => (
          <TargetCard key={t.member} member={t} />
        ))}
      </div>
    </div>
  )
}
