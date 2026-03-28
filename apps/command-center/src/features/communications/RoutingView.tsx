// ─── RoutingView.tsx — Wavult OS Communications Routing ───────────────────────
// Visuell vy för alla routing-regler, ansvariga och fallbacks.
// Skapad: 2026-03-27 (audit by Bernt)

import { ROUTING_RULES, TEAM, type RoutingRule, type Channel, testRouting } from './routingConfig'

const DEPARTMENT_ICONS: Record<string, string> = {
  juridik: '⚖️',
  ekonomi: '💰',
  teknik: '🔧',
  zoomer: '📷',
  sälj: '📈',
  support: '🛠️',
  ledning: '🏛️',
  övrigt: '📂',
}

const PRIORITY_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'P1 — Hög', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  2: { label: 'P2 — Medel', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  3: { label: 'P3 — Låg', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
}

const PERSON_COLORS: Record<string, string> = {
  'Erik Svensson': '#8B5CF6',
  'Leon Maurizio Russo De Cerame': '#10B981',
  'Dennis Bjarnemark': '#F59E0B',
  'Winston Bjarnemark': '#3B82F6',
  'Johan Berglund': '#06B6D4',
}

function PersonBadge({ name, role }: { name: string; role: string }) {
  const color = PERSON_COLORS[name] ?? '#64748B'
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: color + '25', color, border: `1.5px solid ${color}40` }}
      >
        {initials}
      </div>
      <div>
        <p className="text-xs font-semibold text-white leading-tight">{name.split(' ')[0]} {name.split(' ').slice(-1)[0]}</p>
        <p className="text-xs text-gray-500">{role}</p>
      </div>
    </div>
  )
}

function ChannelBadge({ channel }: { channel: Channel }) {
  const icons: Record<Channel, string> = { sms: '📱', email: '📧', telegram: '✈️', webhook: '🔗' }
  return (
    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-white/[0.06] text-gray-400 border border-white/[0.08]">
      {icons[channel]} {channel}
    </span>
  )
}

function RuleCard({ rule }: { rule: RoutingRule }) {
  const prio = PRIORITY_LABELS[rule.priority]
  const deptIcon = DEPARTMENT_ICONS[rule.department] ?? '📂'

  return (
    <div className="bg-[#0D0F1A] rounded-xl border border-white/[0.06] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{deptIcon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-semibold text-white capitalize">{rule.department}</h3>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${prio.bg} ${prio.color}`}>
              {prio.label}
            </span>
            <span className="text-[9px] font-mono text-gray-600 bg-white/[0.04] px-1.5 py-0.5 rounded">
              #{rule.id}
            </span>
          </div>
          <p className="text-xs text-gray-500">{rule.description}</p>
        </div>
      </div>

      {/* Responsible */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1.5">Ansvarig</p>
          <PersonBadge name={rule.responsible.name} role={rule.responsible.role} />
        </div>
        {rule.fallback && (
          <div>
            <p className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1.5">Fallback</p>
            <PersonBadge name={rule.fallback.name} role={rule.fallback.role} />
          </div>
        )}
      </div>

      {/* Keywords */}
      <div>
        <p className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1.5">
          Nyckelord ({rule.keywords.length} st)
        </p>
        <div className="flex flex-wrap gap-1">
          {rule.keywords.map(kw => (
            <span
              key={kw}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-brand-accent/8 text-gray-400 border border-white/[0.06]"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* Channels */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-gray-600 font-mono mr-1">Kanaler:</span>
        {rule.channel.map(ch => (
          <ChannelBadge key={ch} channel={ch} />
        ))}
      </div>
    </div>
  )
}

function RoutingTestPanel() {
  const results = testRouting()
  const passCount = results.filter(r => r.passed).length

  return (
    <div className="bg-[#0D0F1A] rounded-xl border border-white/[0.06] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
        <span className="text-sm">🧪</span>
        <h3 className="text-xs font-semibold text-white">Routing-test — verifierade scenarier</h3>
        <span className={`ml-auto text-xs font-mono ${passCount === results.length ? 'text-green-400' : 'text-red-400'}`}>
          {passCount}/{results.length} OK
        </span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {results.map((r, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="text-[14px] flex-shrink-0">{r.passed ? '✅' : '❌'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5 font-medium">{r.scenario}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-500">
                    → <span className="text-white font-medium">{r.got ?? 'Ingen match'}</span>
                  </span>
                  {r.ruleId && (
                    <span className="text-[9px] font-mono text-gray-600">
                      via {r.ruleId} · kw: {r.matchedKeywords.slice(0, 3).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Team Summary ─────────────────────────────────────────────────────────────

function TeamSummary() {
  const teamEntries = Object.entries(TEAM)
  return (
    <div className="bg-[#0D0F1A] rounded-xl border border-white/[0.06] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
        <span className="text-sm">👥</span>
        <h3 className="text-xs font-semibold text-white">Team-register</h3>
        <span className="ml-auto text-xs text-gray-600 font-mono">{teamEntries.length} personer</span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {teamEntries.map(([key, member]) => {
          const color = PERSON_COLORS[member.name] ?? '#64748B'
          const initials = member.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
          const rules = ROUTING_RULES.filter(r => r.responsible.name === member.name || r.fallback?.name === member.name)
          return (
            <div key={key} className="px-4 py-3 flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: color + '25', color, border: `1.5px solid ${color}40` }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white">{member.name}</p>
                <p className="text-xs text-gray-500">{member.role}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-600 font-mono">{member.email}</span>
                  <span className="text-xs text-gray-700">·</span>
                  <span className="text-xs text-gray-600 font-mono">{member.phone}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs text-gray-600">
                  {rules.filter(r => r.responsible.name === member.name).length} regler
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function RoutingView() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-bold text-white">Routing-regler</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {ROUTING_RULES.length} aktiva regler · keyword-baserad routing → rätt person
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          Routing aktiv
        </div>
      </div>

      {/* Routing Rules */}
      <div className="grid gap-3">
        {[...ROUTING_RULES]
          .sort((a, b) => a.priority - b.priority)
          .map(rule => (
            <RuleCard key={rule.id} rule={rule} />
          ))
        }
      </div>

      {/* Routing Test */}
      <RoutingTestPanel />

      {/* Team Summary */}
      <TeamSummary />
    </div>
  )
}
