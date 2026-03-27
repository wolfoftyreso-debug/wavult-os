// ─── Wavult App — Personal Dashboard ────────────────────────────────────────────
// Alive. Always something happening. People working. Systems breathing.

import { useAuth } from '../lib/AuthContext'
import { OperatorAvatar } from '../components/OperatorAvatar'
import { useAvatar } from '../lib/AvatarContext'
import { useState, useEffect, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveEvent {
  id: string
  actor: string
  initials: string
  color: string
  action: string
  target: string
  time: number // ms ago (will increment)
  category: 'deploy' | 'sale' | 'task' | 'system' | 'alert' | 'comms'
}

interface TeamMember {
  name: string
  initials: string
  color: string
  status: 'active' | 'idle' | 'offline'
  activity: string
  lastSeen: number
}

// ─── Live Event Feed ──────────────────────────────────────────────────────────

const CATEGORY_ICON: Record<LiveEvent['category'], string> = {
  deploy: '🚀',
  sale: '💰',
  task: '✅',
  system: '⚙️',
  alert: '⚡',
  comms: '💬',
}

const CATEGORY_COLOR: Record<LiveEvent['category'], string> = {
  deploy: '#4A7A5B',
  sale: '#C4961A',
  task: '#4A7A9B',
  system: '#8B919A',
  alert: '#D94040',
  comms: '#8B5CF6',
}

const EVENT_POOL: Omit<LiveEvent, 'id' | 'time'>[] = [
  { actor: 'Leon', initials: 'LR', color: '#C4961A', action: 'stängde ett leadsamtal med', target: 'Stockholms Hamnar AB', category: 'sale' },
  { actor: 'Johan', initials: 'JB', color: '#4A7A5B', action: 'deployade ny version av', target: 'quiXzoom API → ECS', category: 'deploy' },
  { actor: 'Dennis', initials: 'DB', color: '#4A7A9B', action: 'signerade avtal med', target: 'Trafikverket (NDA)', category: 'task' },
  { actor: 'Winston', initials: 'WB', color: '#8B5CF6', action: 'godkände faktura från', target: 'AWS €1,240', category: 'sale' },
  { actor: 'Leon', initials: 'LR', color: '#C4961A', action: 'la till ny kontakt:', target: 'Malmö Stad — infrastruktur', category: 'comms' },
  { actor: 'Johan', initials: 'JB', color: '#4A7A5B', action: 'fixade buggen i', target: 'zoomer-wallet (payments)', category: 'task' },
  { actor: 'System', initials: 'SY', color: '#D94040', action: 'API-latens spike på', target: 'quiXzoom → 320ms', category: 'alert' },
  { actor: 'Dennis', initials: 'DB', color: '#4A7A9B', action: 'skapade bolagshandlingar för', target: 'LandveX AB', category: 'task' },
  { actor: 'Winston', initials: 'WB', color: '#8B5CF6', action: 'uppdaterade cashflow-prognos', target: 'Q2 2026', category: 'task' },
  { actor: 'System', initials: 'SY', color: '#4A7A5B', action: 'Cloudflare Tunnel', target: 'auto-restarted ✓', category: 'system' },
  { actor: 'Leon', initials: 'LR', color: '#C4961A', action: 'skickade pitch-deck till', target: 'Göteborg stad (LandveX)', category: 'comms' },
  { actor: 'Johan', initials: 'JB', color: '#4A7A5B', action: 'satte upp CI/CD för', target: 'quiXzoom-landing (CF Pages)', category: 'deploy' },
  { actor: 'System', initials: 'SY', color: '#4A7A5B', action: '47 nya uppdrag skapade i', target: 'quiXzoom → Stockholm', category: 'system' },
  { actor: 'Dennis', initials: 'DB', color: '#4A7A9B', action: 'uppdaterade aktieägaravtal', target: 'Wavult Group FZCO', category: 'task' },
  { actor: 'Winston', initials: 'WB', color: '#8B5CF6', action: 'bokade möte med', target: 'Revolut Business (betalflöde)', category: 'comms' },
]

const TEAM: TeamMember[] = [
  { name: 'Leon', initials: 'LR', color: '#C4961A', status: 'active', activity: 'Ringer leads', lastSeen: 0 },
  { name: 'Johan', initials: 'JB', color: '#4A7A5B', status: 'active', activity: 'Bygger quiXzoom', lastSeen: 0 },
  { name: 'Dennis', initials: 'DB', color: '#4A7A9B', status: 'active', activity: 'Bolagsdocs', lastSeen: 0 },
  { name: 'Winston', initials: 'WB', color: '#8B5CF6', status: 'idle', activity: 'Cashflow Q2', lastSeen: 4 * 60 * 1000 },
]

function formatAge(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h`
}

function LiveFeed() {
  const [events, setEvents] = useState<LiveEvent[]>(() => {
    // Seed with 5 events at different ages
    return [0, 1, 2, 3, 4].map((i) => ({
      ...EVENT_POOL[i],
      id: `seed-${i}`,
      time: (i + 1) * 45 * 1000,
    }))
  })

  // Age all events every second
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(prev => prev.map(e => ({ ...e, time: e.time + 1000 })))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Inject a new random event every 8-15 seconds
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const schedule = () => {
      const delay = 8000 + Math.random() * 7000
      timeout = setTimeout(() => {
        const pool = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)]
        const newEvent: LiveEvent = {
          ...pool,
          id: `evt-${Date.now()}`,
          time: 0,
        }
        setEvents(prev => [newEvent, ...prev].slice(0, 8))
        schedule()
      }, delay)
    }
    schedule()
    return () => clearTimeout(timeout)
  }, [])

  return (
    <div className="px-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-label text-tx-tertiary font-mono uppercase">Live — Teamet jobbar</h2>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-signal-green animate-pulse" />
          <span className="text-[9px] text-signal-green font-mono">LIVE</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {events.map((evt, i) => (
          <div
            key={evt.id}
            className="app-card flex items-start gap-3 transition-all duration-500"
            style={{ opacity: i === 0 ? 1 : Math.max(0.4, 1 - i * 0.1) }}
          >
            {/* Avatar */}
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: evt.color + '25', border: `1px solid ${evt.color}40` }}
            >
              <span className="text-[9px] font-bold" style={{ color: evt.color }}>{evt.initials}</span>
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-tx-primary leading-snug">
                <span className="font-semibold" style={{ color: evt.color }}>{evt.actor}</span>
                {' '}{evt.action}{' '}
                <span className="text-tx-secondary">{evt.target}</span>
              </p>
            </div>
            {/* Time + category */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-[8px] text-tx-muted font-mono">{formatAge(evt.time)}</span>
              <span className="text-[10px]">{CATEGORY_ICON[evt.category]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Team Pulse ───────────────────────────────────────────────────────────────

function TeamPulse() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="px-5 mt-6">
      <h2 className="text-label text-tx-tertiary font-mono uppercase mb-3">Team Online</h2>
      <div className="grid grid-cols-2 gap-2">
        {TEAM.map((m, i) => (
          <div key={m.name} className="app-card flex items-center gap-2.5">
            {/* Avatar + status dot */}
            <div className="relative flex-shrink-0">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center"
                style={{ background: m.color + '20', border: `1.5px solid ${m.color}40` }}
              >
                <span className="text-[10px] font-bold" style={{ color: m.color }}>{m.initials}</span>
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-w-card"
                style={{
                  background: m.status === 'active'
                    ? '#4A7A5B'
                    : m.status === 'idle' ? '#C4961A' : '#3D4452',
                  // Pulse active members on alternating ticks
                  boxShadow: m.status === 'active' && tick % 2 === i % 2
                    ? '0 0 0 3px #4A7A5B30'
                    : 'none',
                  transition: 'box-shadow 0.5s ease',
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-tx-primary">{m.name}</p>
              <p className="text-[9px] text-tx-muted font-mono truncate">{m.activity}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── KPI Counters (count up on mount) ────────────────────────────────────────

interface KpiProps {
  label: string
  target: number
  suffix?: string
  color: string
  prefix?: string
}

function KpiCounter({ label, target, suffix = '', color, prefix = '' }: KpiProps) {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const duration = 1200
    const start = performance.now()
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setValue(Math.round(eased * target))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target])

  return (
    <div className="stat-card text-center">
      <div className="text-stat font-bold" style={{ color }}>
        {prefix}{value}{suffix}
      </div>
      <div className="text-label text-tx-muted font-mono mt-1">{label}</div>
    </div>
  )
}

function KpiRow() {
  return (
    <div className="px-5 mt-4 grid grid-cols-4 gap-2">
      <KpiCounter label="Uppdrag" target={247} color="#C4961A" />
      <KpiCounter label="Zoomers" target={31} color="#4A7A5B" />
      <KpiCounter label="Entiteter" target={7} color="#4A7A9B" />
      <KpiCounter label="Dagar kvar" target={15} color="#8B5CF6" />
    </div>
  )
}

// ─── System Heartbeat ─────────────────────────────────────────────────────────

const SYSTEMS = [
  { label: 'quiXzoom API', status: 'ok' as const, latency: '48ms' },
  { label: 'Hypbit OS', status: 'ok' as const, latency: '12ms' },
  { label: 'Supabase EU', status: 'ok' as const, latency: '61ms' },
  { label: 'CF Tunnel', status: 'warn' as const, latency: '—' },
]

const STATUS_COLOR = { ok: '#4A7A5B', warn: '#C4961A', error: '#D94040' }
const STATUS_LABEL = { ok: 'OK', warn: 'WARN', error: 'DOWN' }

function SystemHeartbeat() {
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 2000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="px-5 mt-6 mb-2">
      <h2 className="text-label text-tx-tertiary font-mono uppercase mb-3">System Heartbeat</h2>
      <div className="grid grid-cols-2 gap-2">
        {SYSTEMS.map((sys, i) => (
          <div key={sys.label} className="stat-card flex items-center gap-2.5">
            {/* Animated dot */}
            <span
              className="h-2 w-2 rounded-full flex-shrink-0 transition-all duration-500"
              style={{
                background: STATUS_COLOR[sys.status],
                boxShadow: pulse && i % 2 === 0 && sys.status === 'ok'
                  ? `0 0 0 4px ${STATUS_COLOR[sys.status]}30`
                  : sys.status === 'warn' && pulse
                  ? `0 0 0 4px ${STATUS_COLOR.warn}40`
                  : 'none',
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-tx-primary truncate">{sys.label}</p>
              <p className="text-[9px] font-mono" style={{ color: STATUS_COLOR[sys.status] }}>
                {STATUS_LABEL[sys.status]} {sys.latency !== '—' ? `· ${sys.latency}` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Greeting ─────────────────────────────────────────────────────────────────

function GreetingHeader() {
  const { user } = useAuth()
  const { openUploader } = useAvatar()
  const name = user?.user_metadata?.full_name || 'Operator'
  const firstName = name.split(' ')[0]
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'God morgon' : hour < 18 ? 'God eftermiddag' : 'God kväll'

  // Days to Thailand
  const thailand = new Date('2026-04-11')
  const today = new Date()
  const daysLeft = Math.ceil((thailand.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

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
        {daysLeft > 0 && (
          <p className="text-[9px] text-signal-amber font-mono mt-0.5">🇹🇭 {daysLeft} dagar till Thailand</p>
        )}
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-full bg-signal-green animate-pulse" />
        <span className="text-[8px] text-tx-muted font-mono">LIVE</span>
      </div>
    </div>
  )
}

// ─── Nörd-rekrytering ────────────────────────────────────────────────────────

const TALENT_CHANNELS = [
  { label: 'GitHub', sub: 'openclaw/openclaw contributors', url: 'https://github.com/openclaw/openclaw', status: 'Aktivt', color: '#4A7A5B' },
  { label: 'ClawHub', sub: 'Skill-publicister med djup förståelse', url: 'https://clawhub.ai', status: 'Scouting', color: '#C4961A' },
  { label: 'Discord clawd', sub: 'Hjälpsamma nördar i community', url: 'https://discord.com/invite/clawd', status: 'Läser', color: '#8B5CF6' },
  { label: 'Reddit r/openclaw', sub: 'Frustrerande engagerade = bäst', url: 'https://reddit.com/r/openclaw', status: 'Bevakar', color: '#4A7A9B' },
]

const TALENT_CRITERIA = [
  { label: 'Aktiv GitHub', ok: true },
  { label: 'TypeScript/Node.js', ok: true },
  { label: 'Förstår AI-agenter', ok: true },
  { label: 'Europe/Asia-baserad', ok: true },
  { label: 'Thailand-ready', ok: null },
]

function TalentRadar() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="px-5 mt-6">
      <button
        className="w-full flex items-center justify-between mb-3"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-label text-tx-tertiary font-mono uppercase">🎯 Nörd-rekrytering</h2>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-signal-amber/15 text-signal-amber border border-signal-amber/30">
            IGÅNG
          </span>
        </div>
        <span className="text-tx-muted text-xs font-mono">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Summary card always visible */}
      <div className="app-card mb-2">
        <p className="text-xs text-tx-secondary leading-relaxed">
          Varsam rekrytering av <span className="text-tx-primary font-semibold">OpenClaw/AI-agent-nördar</span> — folk som bygger, inte pratar. Kanaler: GitHub, ClawHub, Discord, Reddit.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {TALENT_CRITERIA.map(c => (
            <span
              key={c.label}
              className="text-[9px] font-mono px-2 py-0.5 rounded-full"
              style={{
                background: c.ok === true ? '#4A7A5B20' : c.ok === false ? '#D9404020' : '#3D445220',
                color: c.ok === true ? '#4A7A5B' : c.ok === false ? '#D94040' : '#8B919A',
                border: `1px solid ${c.ok === true ? '#4A7A5B30' : c.ok === false ? '#D9404030' : '#3D445230'}`,
              }}
            >
              {c.ok === true ? '✓' : c.ok === false ? '✗' : '?'} {c.label}
            </span>
          ))}
        </div>
      </div>

      {/* Expanded: channel breakdown */}
      {expanded && (
        <div className="space-y-1.5 animate-fade-in">
          {TALENT_CHANNELS.map(ch => (
            <div key={ch.label} className="app-card flex items-center gap-3">
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                style={{ background: ch.color + '20', color: ch.color, border: `1px solid ${ch.color}30` }}
              >
                {ch.label.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-tx-primary">{ch.label}</p>
                <p className="text-[9px] text-tx-muted font-mono truncate">{ch.sub}</p>
              </div>
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: ch.color + '15', color: ch.color, border: `1px solid ${ch.color}30` }}
              >
                {ch.status}
              </span>
            </div>
          ))}
          <p className="text-[9px] text-tx-muted font-mono mt-2 px-1">
            Strategi: skapa relation INNAN rekrytering. Ingen kall kontakt.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DashboardView() {
  return (
    <div className="pb-24 animate-fade-in overflow-y-auto">
      <GreetingHeader />
      <KpiRow />
      <TalentRadar />
      <LiveFeed />
      <TeamPulse />
      <SystemHeartbeat />
    </div>
  )
}
