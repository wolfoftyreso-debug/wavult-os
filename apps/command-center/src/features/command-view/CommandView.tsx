// ─── Wavult OS — Command Center (default route /) ──────────────────────────────
// Zero Think UX: status, max 3 actions, tydlig konsekvens.

import React from 'react'
import { AlertTriangle, Clock, CheckCircle, TrendingDown, ArrowRight } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CriticalIssue {
  id: string
  title: string
  description: string
  action: string
}

interface ActionItem {
  id: string
  title: string
  detail: string
  dueLabel: string
}

interface MetricCard {
  label: string
  value: string
  sub?: string
  warning?: boolean
}

interface SystemService {
  id: string
  name: string
  status: 'green' | 'yellow' | 'red'
  note?: string
}

interface NextAction {
  rank: number
  text: string
  owner: string
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const CRITICAL_ISSUES: CriticalIssue[] = [
  {
    id: 'fzco-missing',
    title: 'IP saknar legal ägare',
    description: 'Wavult Group FZCO ej bildat — ingen juridisk person äger IP eller kontrakt',
    action: 'Bilda FZCO',
  },
  {
    id: 'bookkeeping-missing',
    title: 'Bokföring saknas — Landvex AB',
    description: 'Risk: personligt straffansvar för styrelseledamöter',
    action: 'Välj bokföringsbyrå',
  },
  {
    id: 'texas-llc-incomplete',
    title: 'Texas LLC halvklar',
    description: 'SOSDirect Form 201 ej inlämnad — bolaget är ej formellt registrerat',
    action: 'Slutför nu',
  },
]

const ACTION_ITEMS: ActionItem[] = [
  {
    id: 'workcamp',
    title: 'Thailand Workcamp',
    detail: '11 april 2026',
    dueLabel: 'om 14 dagar',
  },
  {
    id: 'quixzoom-launch',
    title: 'QuiXzoom launch',
    detail: 'Mitten juni 2026',
    dueLabel: 'om 75 dagar',
  },
  {
    id: 'landvex-rename',
    title: 'Landvex AB namnbyte',
    detail: 'Väntar på Bolagsverket',
    dueLabel: 'pågående',
  },
]

const METRICS: MetricCard[] = [
  {
    label: 'Kassa',
    value: '~500 000 SEK',
    sub: 'Burn: 45 000/mån · Runway: 333 dagar',
  },
  {
    label: 'Aktiva bolag',
    value: '1 / 6',
    sub: 'bildade',
    warning: true,
  },
  {
    label: 'Team',
    value: '5',
    sub: 'personer',
  },
  {
    label: 'Academy',
    value: '21',
    sub: 'kurser live',
  },
]

const SYSTEMS: SystemService[] = [
  { id: 'wavult-os-api',     name: 'wavult-os-api',     status: 'green' },
  { id: 'quixzoom-api',      name: 'quixzoom-api',      status: 'green' },
  { id: 'supabase-wavult',   name: 'supabase-wavult',   status: 'green', note: 'BOS tasks + events (EU West)' },
  { id: 'supabase-quixzoom', name: 'supabase-quixzoom', status: 'green', note: 'quiXzoom-data (EU West)' },
  { id: 'github-actions',    name: 'github-actions',    status: 'green' },
]

const NEXT_ACTIONS: NextAction[] = [
  { rank: 1, text: 'Välj bokföringsbyrå',                         owner: 'Dennis' },
  { rank: 2, text: 'Betala SOSDirect $325',                       owner: 'Dennis' },
  { rank: 3, text: 'Revolut Business API — aktivera live-synk',       owner: 'Johan' },
  { rank: 4, text: 'Boka DMCC-konsultation (Dubai FZCO)',          owner: 'Erik' },
  { rank: 5, text: 'Flytta Loopia NS till Cloudflare (wavult.com)', owner: 'Johan' },
]

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: 'green' | 'yellow' | 'red' }) {
  const color =
    status === 'green'  ? 'bg-emerald-500' :
    status === 'yellow' ? 'bg-amber-500'   :
    'bg-red-500'
  return <span className={`inline-block h-2 w-2 rounded-full ${color} flex-shrink-0`} />
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
      {children}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function CommandView() {
  const now = new Date()
  const dateStr = now.toLocaleDateString('sv-SE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const greenCount = SYSTEMS.filter(s => s.status === 'green').length
  const systemScore = Math.round((greenCount / SYSTEMS.length) * 100)

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Command Center</h1>
          <p className="text-xs font-mono text-gray-500 mt-0.5">{dateStr}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white shadow-sm self-start">
          <span className="text-xs font-mono text-gray-500">System Score</span>
          <span className={`text-sm font-mono font-bold ${
            systemScore >= 80 ? 'text-emerald-600' :
            systemScore >= 60 ? 'text-amber-600'   :
            'text-red-600'
          }`}>
            {systemScore}%
          </span>
        </div>
      </div>

      {/* ── CRITICAL ────────────────────────────────────────────────────────── */}
      <section>
        <SectionLabel>
          <span className="text-red-600">Critical — kräver omedelbar åtgärd</span>
        </SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CRITICAL_ISSUES.map(issue => (
            <div
              key={issue.id}
              className="rounded-xl border border-red-200 bg-red-50 p-4 flex flex-col gap-3"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-red-800 leading-snug">{issue.title}</p>
                  <p className="text-xs text-red-600 mt-1 leading-relaxed">{issue.description}</p>
                </div>
              </div>
              <button className="mt-auto flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-900 transition-colors self-start group">
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                {issue.action}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── ACTIONS ─────────────────────────────────────────────────────────── */}
      <section>
        <SectionLabel>
          <span className="text-amber-600">Actions — tidskritiska deadlines</span>
        </SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ACTION_ITEMS.map(item => (
            <div
              key={item.id}
              className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-2"
            >
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-900">{item.title}</p>
                  <p className="text-xs font-mono text-amber-700 mt-0.5">{item.detail}</p>
                </div>
              </div>
              <span className="self-start text-[10px] font-mono px-2 py-0.5 rounded-full border border-amber-300 text-amber-700 bg-white">
                {item.dueLabel}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── METRICS ─────────────────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Metrics</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {METRICS.map(metric => (
            <div
              key={metric.label}
              className={`rounded-xl border p-4 bg-white shadow-sm ${
                metric.warning ? 'border-amber-200' : 'border-gray-200'
              }`}
            >
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                {metric.label}
              </p>
              <p className={`text-xl font-mono font-bold ${metric.warning ? 'text-amber-600' : 'text-gray-900'}`}>
                {metric.value}
              </p>
              {metric.sub && (
                <p className="text-[10px] font-mono text-gray-500 mt-1">{metric.sub}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── SYSTEMS ─────────────────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Systems — service status</SectionLabel>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
          {SYSTEMS.map(svc => (
            <div key={svc.id} className="flex items-center gap-3 px-4 py-3">
              <StatusDot status={svc.status} />
              <span className="text-xs font-mono text-gray-600 flex-1">{svc.name}</span>
              {svc.note && (
                <span className="text-[10px] font-mono text-amber-600">{svc.note}</span>
              )}
              {!svc.note && svc.status === 'green' && (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── NEXT ACTIONS ────────────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Next actions — denna vecka</SectionLabel>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
          {NEXT_ACTIONS.map(action => (
            <div key={action.rank} className="flex items-center gap-4 px-4 py-3">
              <span className="text-xs font-mono text-gray-500 w-4 flex-shrink-0">
                {action.rank}.
              </span>
              <span className="text-sm text-gray-600 flex-1">{action.text}</span>
              <span className="text-xs font-mono text-gray-500 flex-shrink-0">
                {action.owner}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className="flex items-center gap-2 text-xs font-mono text-gray-500 pt-2 pb-1">
        <TrendingDown className="w-3 h-3" />
        <span>Data uppdateras manuellt — live integration planerad Q2 2026</span>
      </div>

    </div>
  )
}
