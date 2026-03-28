// ─── People Intelligence Hub ─────────────────────────────────────────────────
// Drill-down org-träd: Enterprise → Bolag → Team → Individ
// 4 lager med animerade transitions och WHOOP-integration

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { useApi } from '../../shared/auth/useApi'
import {
  TEAM_MEMBERS,
  ENTITIES,
  MOCK_TASKS,
  type TeamMember,
  type Entity,
} from './peopleData'

// ─── Layer type ───────────────────────────────────────────────────────────────
type Layer = 'enterprise' | 'entity' | 'team' | 'person'

// ─── WHOOP types ─────────────────────────────────────────────────────────────
interface WhoopMyData {
  connected: boolean
  recovery: { score: number | null; hrv: number | null; restingHr: number | null } | null
  sleep: { performancePercent: number | null; durationHours: number | null } | null
  strain: { score: number | null; kilojoules: number | null } | null
  cached: boolean
}

interface WhoopTeamMember {
  user_id: string
  full_name: string | null
  email: string | null
  recovery_score: number | null
  sleep_performance: number | null
  strain_score: number | null
  snapshot_at: string | null
}

interface WhoopTeamData {
  team: WhoopTeamMember[]
  total_connected: number
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}
function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}
function TelegramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}
function ActivityIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}
function WatchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="6" /><polyline points="12 10 12 12 13 13" />
      <path d="m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.78 4.05" />
      <path d="m7.88 16.36.8 4a2 2 0 0 0 2 1.61h2.72a2 2 0 0 0 2-1.61l.81-4.05" />
    </svg>
  )
}

// ─── Recovery badge ───────────────────────────────────────────────────────────
function RecoveryBadge({ score }: { score: number | null }) {
  if (score === null) return <div className="w-3 h-3 rounded-full bg-zinc-700 flex-shrink-0" title="Ej kopplat" />
  const color = score >= 67 ? '#22C55E' : score >= 34 ? '#EAB308' : '#EF4444'
  return (
    <div
      className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-black/40"
      style={{ backgroundColor: color }}
      title={`Recovery ${score}%`}
    />
  )
}

// ─── Avatar placeholder ───────────────────────────────────────────────────────
function Avatar({ member, size = 'md' }: { member: TeamMember; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-8 h-8 text-sm', md: 'w-12 h-12 text-lg', lg: 'w-16 h-16 text-2xl' }
  return (
    <div
      className={`${sizeMap[size]} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ backgroundColor: member.color + '22', border: `2px solid ${member.color}55` }}
    >
      <span>{member.emoji}</span>
    </div>
  )
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
interface BreadcrumbItem {
  label: string
  layer: Layer
}

function Breadcrumb({
  items,
  onNavigate,
}: {
  items: BreadcrumbItem[]
  onNavigate: (layer: Layer) => void
}) {
  return (
    <div className="flex items-center gap-1 text-xs text-zinc-500 flex-wrap">
      {items.map((item, idx) => (
        <span key={item.layer} className="flex items-center gap-1">
          {idx > 0 && <ChevronRight />}
          {idx === items.length - 1 ? (
            <span className="text-zinc-300 font-medium">{item.label}</span>
          ) : (
            <button
              onClick={() => onNavigate(item.layer)}
              className="hover:text-zinc-200 transition-colors"
            >
              {item.label}
            </button>
          )}
        </span>
      ))}
    </div>
  )
}

// ─── LAYER 1: Enterprise ──────────────────────────────────────────────────────
function EnterpriseLayer({
  onSelectEntity,
  whoopTeam,
}: {
  onSelectEntity: (entity: Entity) => void
  whoopTeam: WhoopTeamData | null
}) {
  const totalEmployees = TEAM_MEMBERS.length
  const connectedCount = whoopTeam?.total_connected ?? 0

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 animate-in">
      {/* Group header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-2xl">🌐</div>
          <div>
            <h2 className="text-2xl font-bold text-white">Wavult Group</h2>
            <p className="text-sm text-zinc-400">Next-generation infrastructure ventures</p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <div className="text-2xl font-bold text-white">{totalEmployees}</div>
            <div className="text-xs text-zinc-400 mt-0.5">Teammedlemmar</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <div className="text-2xl font-bold text-white">{ENTITIES.length}</div>
            <div className="text-xs text-zinc-400 mt-0.5">Bolag/Enheter</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <div className="text-2xl font-bold" style={{ color: connectedCount > 0 ? '#22C55E' : '#71717A' }}>
              {connectedCount}
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">WHOOP aktiva</div>
          </div>
        </div>
      </div>

      {/* Bolagsstruktur */}
      <div>
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Bolagsstruktur</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ENTITIES.map(entity => (
            <button
              key={entity.id}
              onClick={() => onSelectEntity(entity)}
              className="text-left rounded-xl border border-white/10 p-4 hover:border-white/25 hover:bg-white/5 transition-all duration-200 group"
              style={{ borderColor: entity.color + '33' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: entity.color + '20' }}
                  >
                    {entity.emoji}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-white">{entity.name}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{entity.jurisdiction}</div>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${
                    entity.status === 'active'
                      ? 'bg-green-500/20 text-green-400'
                      : entity.status === 'forming'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-zinc-500/20 text-zinc-400'
                  }`}
                >
                  {entity.status === 'active' ? 'Aktiv' : entity.status === 'forming' ? 'Bildas' : 'Planerad'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-2.5 leading-relaxed line-clamp-2">{entity.purpose}</p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex -space-x-1.5">
                  {entity.memberIds.slice(0, 4).map(id => {
                    const m = TEAM_MEMBERS.find(t => t.id === id)
                    if (!m) return null
                    return (
                      <div
                        key={id}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] ring-2 ring-zinc-900"
                        style={{ backgroundColor: m.color + '33', color: m.color }}
                        title={m.name}
                      >
                        {m.emoji}
                      </div>
                    )
                  })}
                </div>
                <ChevronRight />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── LAYER 2: Entity ──────────────────────────────────────────────────────────
function EntityLayer({
  entity,
  onSelectPerson,
  onViewTeam,
  whoopTeam,
}: {
  entity: Entity
  onSelectPerson: (member: TeamMember) => void
  onViewTeam: () => void
  whoopTeam: WhoopTeamData | null
}) {
  const members = TEAM_MEMBERS.filter(m => entity.memberIds.includes(m.id))

  function getRecovery(email: string): number | null {
    const wm = whoopTeam?.team.find(t => t.email === email)
    return wm?.recovery_score ?? null
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 animate-in">
      {/* Entity header */}
      <div className="rounded-xl border p-5" style={{ borderColor: entity.color + '33', backgroundColor: entity.color + '08' }}>
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ backgroundColor: entity.color + '20' }}
          >
            {entity.emoji}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white">{entity.name}</h2>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  entity.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : entity.status === 'forming'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-zinc-500/20 text-zinc-400'
                }`}
              >
                {entity.status === 'active' ? 'Aktiv' : entity.status === 'forming' ? 'Bildas' : 'Planerad'}
              </span>
            </div>
            <div className="text-sm text-zinc-400 mt-1">{entity.jurisdiction}</div>
            <p className="text-sm text-zinc-300 mt-2 leading-relaxed">{entity.purpose}</p>
          </div>
        </div>
      </div>

      {/* Team list for this entity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Team ({members.length} personer)
          </div>
          <button
            onClick={onViewTeam}
            className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <UsersIcon /> Visa org-träd
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {members.map(member => (
            <button
              key={member.id}
              onClick={() => onSelectPerson(member)}
              className="flex items-center gap-3 text-left rounded-xl border border-white/10 p-3 hover:border-white/25 hover:bg-white/5 transition-all duration-200"
            >
              <Avatar member={member} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-white truncate">{member.name}</div>
                <div className="text-xs text-zinc-400 truncate">{member.title}</div>
              </div>
              <RecoveryBadge score={getRecovery(member.email)} />
              <ChevronRight />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── LAYER 3: Team / Org tree ─────────────────────────────────────────────────
function TeamLayer({
  onSelectPerson,
  whoopTeam,
}: {
  onSelectPerson: (member: TeamMember) => void
  whoopTeam: WhoopTeamData | null
}) {
  const root = TEAM_MEMBERS.find(m => m.reportsTo === null)!
  const reports = TEAM_MEMBERS.filter(m => m.reportsTo === root.id)

  function getRecovery(email: string): number | null {
    const wm = whoopTeam?.team.find(t => t.email === email)
    return wm?.recovery_score ?? null
  }

  function PersonCard({ member, isRoot = false }: { member: TeamMember; isRoot?: boolean }) {
    return (
      <button
        onClick={() => onSelectPerson(member)}
        className={`flex flex-col items-center text-center gap-1.5 p-3 rounded-xl border transition-all duration-200 hover:bg-white/5 ${
          isRoot ? 'border-white/20 min-w-[120px]' : 'border-white/10 min-w-[100px]'
        }`}
        style={{ borderColor: member.color + (isRoot ? '55' : '33') }}
      >
        <div className="relative">
          <Avatar member={member} size={isRoot ? 'lg' : 'md'} />
          <div className="absolute -bottom-0.5 -right-0.5">
            <RecoveryBadge score={getRecovery(member.email)} />
          </div>
        </div>
        <div>
          <div className={`font-semibold text-white ${isRoot ? 'text-sm' : 'text-xs'} leading-tight`}>
            {member.name.split(' ')[0]}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight max-w-[90px]">
            {member.title.split(' ').slice(0, 3).join(' ')}
          </div>
        </div>
        {member.disc && (
          <div
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: member.color + '22', color: member.color }}
          >
            {member.disc}
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 animate-in">
      <div>
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Wavult Group — Teamstruktur</div>
        <p className="text-xs text-zinc-500">Klicka på en person för att öppna fullständig profil</p>
      </div>

      {/* Org tree visual */}
      <div className="flex flex-col items-center gap-0">
        {/* Root */}
        <PersonCard member={root} isRoot />

        {/* Connector lines */}
        <div className="flex flex-col items-center">
          {/* Vertical line down from root */}
          <div className="w-px h-6 bg-zinc-700" />
          {/* Horizontal bar */}
          <div
            className="h-px bg-zinc-700"
            style={{ width: `${Math.min(reports.length * 110, 600)}px` }}
          />
          {/* Vertical lines down to reports */}
          <div
            className="flex items-start"
            style={{ gap: '12px', width: `${Math.min(reports.length * 110, 600)}px` }}
          >
            {reports.map(() => (
              <div key={Math.random()} className="flex-1 flex justify-center">
                <div className="w-px h-5 bg-zinc-700" />
              </div>
            ))}
          </div>
        </div>

        {/* Direct reports */}
        <div className="flex flex-wrap justify-center gap-3">
          {reports.map(member => (
            <PersonCard key={member.id} member={member} />
          ))}
        </div>
      </div>

      {/* List view as alternative */}
      <div>
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Alla teammedlemmar</div>
        <div className="flex flex-col gap-2">
          {TEAM_MEMBERS.map(member => {
            const reportsToMember = member.reportsTo
              ? TEAM_MEMBERS.find(m => m.id === member.reportsTo)
              : null
            return (
              <button
                key={member.id}
                onClick={() => onSelectPerson(member)}
                className="flex items-center gap-3 text-left rounded-xl border border-white/10 p-3 hover:border-white/25 hover:bg-white/5 transition-all duration-200"
              >
                <Avatar member={member} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-white truncate">{member.name}</span>
                    {member.disc && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: member.color + '22', color: member.color }}
                      >
                        {member.disc}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 truncate">{member.title}</div>
                  {reportsToMember && (
                    <div className="text-[10px] text-zinc-600 mt-0.5">
                      Rapporterar till {reportsToMember.name.split(' ')[0]}
                    </div>
                  )}
                </div>
                <RecoveryBadge score={getRecovery(member.email)} />
                <ChevronRight />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── LAYER 4: Person profile ──────────────────────────────────────────────────
type ProfileTab = 'roll' | 'arbete' | 'halsa' | 'uppgifter' | 'kontakt' | 'psyk'

function PersonLayer({
  member,
  currentUserEmail,
  whoopMy,
  whoopTeam,
}: {
  member: TeamMember
  currentUserEmail: string | null
  whoopMy: WhoopMyData | null
  whoopTeam: WhoopTeamData | null
}) {
  const [tab, setTab] = useState<ProfileTab>('roll')

  const tabs: { id: ProfileTab; label: string; emoji: string }[] = [
    { id: 'roll', label: 'Roll & Ansvar', emoji: '🎯' },
    { id: 'arbete', label: 'Arbete', emoji: '📋' },
    { id: 'halsa', label: 'Hälsa', emoji: '❤️' },
    { id: 'uppgifter', label: 'Uppgifter', emoji: '✅' },
    { id: 'kontakt', label: 'Kontakt', emoji: '📞' },
    { id: 'psyk', label: 'Psykologi', emoji: '🧠' },
  ]

  const reportsToMember = member.reportsTo
    ? TEAM_MEMBERS.find(m => m.id === member.reportsTo)
    : null
  const directReportMembers = TEAM_MEMBERS.filter(m => member.directReports.includes(m.id))
  const tasks = MOCK_TASKS[member.id] ?? []
  const isCurrentUser = currentUserEmail === member.email

  // WHOOP data: live if current user, cached from team otherwise
  let whoopData: {
    connected: boolean
    recovery: number | null
    hrv: number | null
    restingHr: number | null
    sleepPerf: number | null
    sleepHours: number | null
    strain: number | null
    cached: boolean
  } | null = null

  if (isCurrentUser && whoopMy) {
    whoopData = {
      connected: whoopMy.connected,
      recovery: whoopMy.recovery?.score ?? null,
      hrv: whoopMy.recovery?.hrv ?? null,
      restingHr: whoopMy.recovery?.restingHr ?? null,
      sleepPerf: whoopMy.sleep?.performancePercent ?? null,
      sleepHours: whoopMy.sleep?.durationHours ?? null,
      strain: whoopMy.strain?.score ?? null,
      cached: whoopMy.cached,
    }
  } else if (whoopTeam) {
    const wm = whoopTeam.team.find(t => t.email === member.email)
    if (wm && wm.recovery_score !== null) {
      whoopData = {
        connected: true,
        recovery: wm.recovery_score,
        hrv: null,
        restingHr: null,
        sleepPerf: wm.sleep_performance,
        sleepHours: null,
        strain: wm.strain_score,
        cached: true,
      }
    }
  }

  function RecoveryRing({ value, label, color }: { value: number; label: string; color: string }) {
    const r = 24
    const circ = 2 * Math.PI * r
    const offset = circ - (value / 100) * circ
    return (
      <div className="flex flex-col items-center gap-1">
        <svg width="60" height="60" className="-rotate-90">
          <circle cx="30" cy="30" r={r} stroke="#ffffff10" strokeWidth="4" fill="none" />
          <circle
            cx="30" cy="30" r={r} stroke={color} strokeWidth="4" fill="none"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          />
          <text x="30" y="30" textAnchor="middle" dominantBaseline="middle" fill="white"
            fontSize="11" fontWeight="bold" transform="rotate(90 30 30)">
            {value}%
          </text>
        </svg>
        <span className="text-[10px] text-zinc-400 uppercase tracking-wide">{label}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0 animate-in">
      {/* Profile header */}
      <div className="px-4 md:px-6 py-5 border-b border-white/10">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar member={member} size="lg" />
            {whoopData?.connected && (
              <div className="absolute -bottom-1 -right-1">
                <RecoveryBadge score={whoopData.recovery} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white">{member.name}</h2>
            <div className="text-sm text-zinc-400 mt-0.5">{member.title}</div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {member.disc && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: member.color + '22', color: member.color }}
                >
                  DISC: {member.disc}
                </span>
              )}
              {member.mbti && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                  {member.mbti}
                </span>
              )}
              {whoopData?.connected && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                  <WatchIcon /> WHOOP
                </span>
              )}
            </div>
          </div>
          {/* Quick contact */}
          <a
            href={
              member.contactPreference === 'email'
                ? `mailto:${member.email}`
                : member.contactPreference === 'phone'
                ? `tel:${member.phone}`
                : `https://t.me/${member.name.split(' ')[0].toLowerCase()}`
            }
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-all text-zinc-300"
            target={member.contactPreference === 'telegram' ? '_blank' : undefined}
            rel="noreferrer"
          >
            Kontakta
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto px-4 md:px-6 py-2 border-b border-white/10 scrollbar-hide">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              tab === t.id
                ? 'bg-white/15 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>{t.emoji}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {tab === 'roll' && (
          <div className="flex flex-col gap-5">
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Befattning</div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="text-white font-medium">{member.title}</div>
                <div className="text-sm text-zinc-400 mt-1">{member.entity === 'wavult-group' ? 'Wavult Group' : member.entity}</div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Ansvarsområden</div>
              <div className="flex flex-col gap-1.5">
                {member.responsibilities.map(r => (
                  <div key={r} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span style={{ color: member.color }} className="mt-0.5 flex-shrink-0">▸</span>
                    {r}
                  </div>
                ))}
              </div>
            </div>

            {reportsToMember && (
              <div>
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Rapporterar till</div>
                <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
                  <Avatar member={reportsToMember} size="sm" />
                  <div>
                    <div className="text-sm font-medium text-white">{reportsToMember.name}</div>
                    <div className="text-xs text-zinc-400">{reportsToMember.title}</div>
                  </div>
                </div>
              </div>
            )}

            {directReportMembers.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Direkt underställda ({directReportMembers.length})
                </div>
                <div className="flex flex-col gap-2">
                  {directReportMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
                      <Avatar member={m} size="sm" />
                      <div>
                        <div className="text-sm font-medium text-white">{m.name}</div>
                        <div className="text-xs text-zinc-400">{m.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'arbete' && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Daglig arbetsbeskrivning</div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-sm text-zinc-300 leading-relaxed">{member.workDescription}</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'halsa' && (
          <div className="flex flex-col gap-5">
            {!whoopData || !whoopData.connected ? (
              <div className="rounded-xl border border-white/10 p-6 text-center">
                <div className="text-3xl mb-2">⌚</div>
                <div className="text-sm font-medium text-zinc-300">WHOOP ej kopplat</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {member.name.split(' ')[0]} har inte kopplat sitt WHOOP-armband till Wavult OS
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Hälsa & Kapacitet
                  </div>
                  {whoopData.cached && (
                    <span className="text-[10px] text-zinc-500 px-2 py-0.5 rounded-full bg-white/5">
                      Cachad data
                    </span>
                  )}
                  {!whoopData.cached && isCurrentUser && (
                    <span className="text-[10px] text-green-400 px-2 py-0.5 rounded-full bg-green-500/10">
                      Live data
                    </span>
                  )}
                </div>

                {/* Rings */}
                <div className="flex justify-around py-2">
                  {whoopData.recovery !== null && (
                    <RecoveryRing
                      value={whoopData.recovery}
                      label="Recovery"
                      color={whoopData.recovery >= 67 ? '#22C55E' : whoopData.recovery >= 34 ? '#EAB308' : '#EF4444'}
                    />
                  )}
                  {whoopData.sleepPerf !== null && (
                    <RecoveryRing value={whoopData.sleepPerf} label="Sömn" color="#6366F1" />
                  )}
                  {whoopData.strain !== null && (
                    <RecoveryRing value={Math.round((whoopData.strain / 21) * 100)} label="Strain" color="#F59E0B" />
                  )}
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3">
                  {whoopData.hrv !== null && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <div className="text-xs text-zinc-400">HRV</div>
                      <div className="text-xl font-bold text-white mt-1">{whoopData.hrv} <span className="text-xs text-zinc-500">ms</span></div>
                    </div>
                  )}
                  {whoopData.restingHr !== null && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <div className="text-xs text-zinc-400">Vilopuls</div>
                      <div className="text-xl font-bold text-white mt-1">{whoopData.restingHr} <span className="text-xs text-zinc-500">bpm</span></div>
                    </div>
                  )}
                  {whoopData.sleepHours !== null && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <div className="text-xs text-zinc-400">Sömntid</div>
                      <div className="text-xl font-bold text-white mt-1">{whoopData.sleepHours.toFixed(1)} <span className="text-xs text-zinc-500">h</span></div>
                    </div>
                  )}
                  {whoopData.strain !== null && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <div className="text-xs text-zinc-400">Strain</div>
                      <div className="text-xl font-bold text-white mt-1">{whoopData.strain.toFixed(1)} <span className="text-xs text-zinc-500">/ 21</span></div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'uppgifter' && (
          <div className="flex flex-col gap-4">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Pågående uppgifter
            </div>
            {tasks.length === 0 ? (
              <div className="text-sm text-zinc-500 p-4 text-center">Inga uppgifter registrerade</div>
            ) : (
              <div className="flex flex-col gap-2">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      task.status === 'done' ? 'opacity-50 border-white/5' : 'border-white/10'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        task.status === 'done'
                          ? 'bg-green-500'
                          : task.status === 'active'
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-zinc-600'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${task.status === 'done' ? 'line-through text-zinc-500' : 'text-white'}`}>
                        {task.title}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 uppercase">
                        {task.status === 'done' ? 'Klar' : task.status === 'active' ? 'Pågår' : 'Väntar'}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        task.priority === 'high'
                          ? 'bg-red-500/20 text-red-400'
                          : task.priority === 'medium'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-zinc-500/20 text-zinc-400'
                      }`}
                    >
                      {task.priority === 'high' ? 'Hög' : task.priority === 'medium' ? 'Medium' : 'Låg'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'kontakt' && (
          <div className="flex flex-col gap-4">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Kontaktvägar</div>
            <div className="flex flex-col gap-2">
              <a
                href={`mailto:${member.email}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 p-3 hover:bg-white/5 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <MailIcon />
                </div>
                <div>
                  <div className="text-xs text-zinc-400">E-post</div>
                  <div className="text-sm text-white">{member.email}</div>
                </div>
                {member.contactPreference === 'email' && (
                  <span className="ml-auto text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Föredrar</span>
                )}
              </a>

              <a
                href={`tel:${member.phone}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 p-3 hover:bg-white/5 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400">
                  <PhoneIcon />
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Telefon</div>
                  <div className="text-sm text-white">{member.phone}</div>
                </div>
                {member.contactPreference === 'phone' && (
                  <span className="ml-auto text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Föredrar</span>
                )}
              </a>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 p-3">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400">
                  <TelegramIcon />
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Telegram</div>
                  <div className="text-sm text-white">@{member.name.split(' ')[0].toLowerCase()}</div>
                </div>
                {member.contactPreference === 'telegram' && (
                  <span className="ml-auto text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Föredrar</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Feedback-stil</div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-sm text-zinc-300 leading-relaxed">{member.feedbackStyle}</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'psyk' && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                <div className="text-xs text-zinc-400 mb-1">Myers-Briggs</div>
                <div className="text-2xl font-bold" style={{ color: member.color }}>{member.mbti ?? '–'}</div>
                {!member.mbti && <div className="text-[10px] text-zinc-600 mt-1">Ej kartlagd</div>}
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                <div className="text-xs text-zinc-400 mb-1">DISC</div>
                <div className="text-2xl font-bold" style={{ color: member.color }}>{member.disc ?? '–'}</div>
                {!member.disc && <div className="text-[10px] text-zinc-600 mt-1">Ej kartlagd</div>}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Styrkor</div>
              <div className="flex flex-wrap gap-2">
                {member.strengths.map(s => (
                  <span
                    key={s}
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: member.color + '20', color: member.color }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Feedback-stil</div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-sm text-zinc-300 leading-relaxed">{member.feedbackStyle}</p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 p-4 text-center text-xs text-zinc-600">
              <ActivityIcon />
              <div className="mt-1">Mer psykologisk data läggs till i kommande version</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Hub ─────────────────────────────────────────────────────────────────
export function PeopleIntelligenceHub() {
  const { user } = useAuth()
  const { apiFetch } = useApi()

  const [layer, setLayer] = useState<Layer>('enterprise')
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)

  const [whoopMy, setWhoopMy] = useState<WhoopMyData | null>(null)
  const [whoopTeam, setWhoopTeam] = useState<WhoopTeamData | null>(null)

  // Fetch WHOOP data on mount
  const fetchWhoop = useCallback(async () => {
    try {
      const [myRes, teamRes] = await Promise.all([
        apiFetch('/whoop/me'),
        apiFetch('/whoop/team'),
      ])
      if (myRes.ok) setWhoopMy(await myRes.json() as WhoopMyData)
      if (teamRes.ok) setWhoopTeam(await teamRes.json() as WhoopTeamData)
    } catch {
      // API unavailable — WHOOP data stays null
    }
  }, [apiFetch])

  useEffect(() => { void fetchWhoop() }, [fetchWhoop])

  // Navigation helpers
  function navigateToEntity(entity: Entity) {
    setSelectedEntity(entity)
    setLayer('entity')
  }

  function navigateToTeam() {
    setLayer('team')
  }

  function navigateToPerson(member: TeamMember) {
    setSelectedMember(member)
    setLayer('person')
  }

  function navigateToLayer(target: Layer) {
    setLayer(target)
    if (target === 'enterprise') {
      setSelectedEntity(null)
      setSelectedMember(null)
    } else if (target === 'entity') {
      setSelectedMember(null)
    } else if (target === 'team') {
      setSelectedMember(null)
    }
  }

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [{ label: 'Wavult Group', layer: 'enterprise' }]
  if (layer === 'entity' && selectedEntity) {
    breadcrumbItems.push({ label: selectedEntity.shortName, layer: 'entity' })
  }
  if (layer === 'team') {
    breadcrumbItems.push({ label: 'Team', layer: 'team' })
  }
  if (layer === 'person' && selectedMember) {
    if (selectedEntity) {
      breadcrumbItems.push({ label: selectedEntity.shortName, layer: 'entity' })
    }
    breadcrumbItems.push({ label: selectedMember.name.split(' ')[0], layer: 'person' })
  }

  // Back destination
  function goBack() {
    if (layer === 'person') {
      if (selectedEntity) {
        setLayer('entity')
      } else {
        setLayer('team')
      }
      setSelectedMember(null)
    } else if (layer === 'team') {
      setLayer('enterprise')
    } else if (layer === 'entity') {
      setLayer('enterprise')
      setSelectedEntity(null)
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#07080F] text-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 md:px-6 py-4 border-b border-white/[0.08]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <UsersIcon />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">People Intelligence</h1>
              <Breadcrumb items={breadcrumbItems} onNavigate={navigateToLayer} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* WHOOP indicator */}
            {whoopTeam && whoopTeam.total_connected > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
                <WatchIcon />
                <span>{whoopTeam.total_connected} WHOOP</span>
              </div>
            )}
            {/* Back button */}
            {layer !== 'enterprise' && (
              <button
                onClick={goBack}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/25"
              >
                <ChevronLeft /> Tillbaka
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {layer === 'enterprise' && (
          <EnterpriseLayer
            onSelectEntity={navigateToEntity}
            whoopTeam={whoopTeam}
          />
        )}
        {layer === 'entity' && selectedEntity && (
          <EntityLayer
            entity={selectedEntity}
            onSelectPerson={navigateToPerson}
            onViewTeam={navigateToTeam}
            whoopTeam={whoopTeam}
          />
        )}
        {layer === 'team' && (
          <TeamLayer
            onSelectPerson={navigateToPerson}
            whoopTeam={whoopTeam}
          />
        )}
        {layer === 'person' && selectedMember && (
          <PersonLayer
            member={selectedMember}
            currentUserEmail={user?.email ?? null}
            whoopMy={whoopMy}
            whoopTeam={whoopTeam}
          />
        )}
      </div>
    </div>
  )
}
