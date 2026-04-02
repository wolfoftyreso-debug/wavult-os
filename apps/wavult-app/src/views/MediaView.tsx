// ─── Wavult OS — Media Department ─────────────────────────────────────────────
// MASTER PROMPT v1: Field Documentarian — Authority: Absolute
// MASTER PROMPT v2: Public Media & Brand Control — Authority: Absolute
//
// PUBLIC:  quiXzoom · LandveX
// HIDDEN:  Wavult Group · Wolvold · Holdings · FinanceCo · DevOps · GovCo
//
// Rule: Hide the structure. Show the movement.
//       Hide the control. Show the execution.

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentStatus = 'filming' | 'editing' | 'queue' | 'published' | 'concept'
type RecruitStatus = 'open' | 'contacted' | 'interview' | 'hired' | 'declined'
type BrandLayer = 'quixzoom' | 'landvex'

interface ContentEpisode {
  id: string
  title: string
  description: string
  filmed: string | null
  publishDate: string | null
  status: ContentStatus
  stars: string[]
  brand: BrandLayer
  // 4-part structure
  act1?: string // Real-world action (quiXzoom)
  act2?: string // System insight (LandveX)
  act3?: string // Decision or challenge
  act4?: string // Outcome or tension
  duration?: string
}

interface DocumentarianCandidate {
  id: string
  name?: string
  location: string
  english: 'basic' | 'good' | 'fluent'
  status: RecruitStatus
  note: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const EPISODES: ContentEpisode[] = [
  {
    id: 'ep-001',
    title: 'Day 1 — Bangkok. The System Starts.',
    description: 'The team assembles in Bangkok. First real session. The system begins to take shape.',
    filmed: '2026-04-11',
    publishDate: '2026-10-11',
    status: 'concept',
    stars: ['Leon', 'Winston'],
    brand: 'quixzoom',
    act1: 'Team arrives Bangkok — streets, heat, motion',
    act2: 'First system planning session on camera',
    act3: 'What do we build first? quiXzoom or infra?',
    act4: 'Decision made. Clock starts.',
    duration: '~12 min',
  },
  {
    id: 'ep-002',
    title: 'A Zoomer Makes Their First Capture',
    description: 'We follow a real zoomer on their first quiXzoom mission. No staging. What happens, happens.',
    filmed: null,
    publishDate: null,
    status: 'concept',
    stars: ['Leon'],
    brand: 'quixzoom',
    act1: 'Zoomer picks up mission on the map, heads out',
    act2: 'Capture uploaded — LandveX receives the data',
    act3: 'Is the data good enough? Review in real time',
    act4: 'Payment hits. System works.',
    duration: '~18 min',
  },
  {
    id: 'ep-003',
    title: 'LandveX Sees Something — Before Anyone Else',
    description: 'A real intelligence signal surfaces in LandveX. We trace it back to the zoomer who captured it.',
    filmed: null,
    publishDate: null,
    status: 'concept',
    stars: ['Winston'],
    brand: 'landvex',
    act1: 'Zoomers operating in field (quiXzoom footage)',
    act2: 'LandveX dashboard — signal detected, alert fires',
    act3: 'Client is notified — Winston in the room',
    act4: 'The system proved its value. First real use case.',
    duration: '~22 min',
  },
  {
    id: 'ep-004',
    title: 'Leon Makes Cold Calls Live — and Closes',
    description: 'No script. Just Leon, a headset and a CRM. Three calls. We film what happens.',
    filmed: null,
    publishDate: null,
    status: 'concept',
    stars: ['Leon'],
    brand: 'quixzoom',
    act1: 'Leon dials — live footage, no cuts',
    act2: 'The pitch: quiXzoom data in action',
    act3: 'Pushback. Objection. Tension.',
    act4: 'Closed or not — either way, we show it.',
    duration: '~25 min',
  },
  {
    id: 'ep-005',
    title: 'The Intelligence Behind the Map',
    description: 'What does LandveX actually do? We show the system interpreting real data, in real time.',
    filmed: null,
    publishDate: null,
    status: 'concept',
    stars: ['Winston'],
    brand: 'landvex',
    act1: 'quiXzoom missions generating live field data',
    act2: 'LandveX processes — overlays, anomalies, signals',
    act3: 'Decision: which insight goes to the client?',
    act4: 'Client receives intelligence. System justified.',
    duration: '~20 min',
  },
  {
    id: 'ep-006',
    title: 'How We Incorporated in Delaware in 3 Days',
    description: 'quiXzoom Inc. — Stripe Atlas, EIN, bank account. Step by step, no filters.',
    filmed: null,
    publishDate: null,
    status: 'concept',
    stars: ['Winston'],
    brand: 'quixzoom',
    act1: 'Stripe Atlas flow — incorporation in real time',
    act2: 'What the structure means for the platform',
    act3: 'EIN delayed — what do we do?',
    act4: 'Entity confirmed. quiXzoom Inc. is real.',
    duration: '~18 min',
  },
]

const CANDIDATES: DocumentarianCandidate[] = [
  {
    id: 'cand-open',
    location: 'Bangkok / Thailand',
    english: 'good',
    status: 'open',
    note: 'Position open. Recruiting via Instagram, Facebook groups, Bangkok university boards.',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ContentStatus, { label: string; color: string; bg: string }> = {
  concept:   { label: 'CONCEPT',    color: '#8B919A', bg: '#3D445215' },
  filming:   { label: 'FILMING',    color: '#C4961A', bg: '#C4961A15' },
  editing:   { label: 'EDITING',    color: '#4A7A9B', bg: '#4A7A9B15' },
  queue:     { label: '6-MO QUEUE', color: '#8B5CF6', bg: '#8B5CF615' },
  published: { label: 'LIVE',       color: '#4A7A5B', bg: '#4A7A5B15' },
}

const BRAND_CONFIG: Record<BrandLayer, { label: string; color: string; tagline: string }> = {
  quixzoom: { label: 'quiXzoom', color: '#C4961A', tagline: 'Global movement' },
  landvex:  { label: 'LandveX',  color: '#4A7A9B', tagline: 'System intelligence' },
}

const RECRUIT_CONFIG: Record<RecruitStatus, { label: string; color: string }> = {
  open:      { label: 'OPEN',      color: '#C4961A' },
  contacted: { label: 'CONTACTED', color: '#4A7A9B' },
  interview: { label: 'INTERVIEW', color: '#8B5CF6' },
  hired:     { label: 'HIRED',     color: '#4A7A5B' },
  declined:  { label: 'DECLINED',  color: '#D94040' },
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Brand Hierarchy ──────────────────────────────────────────────────────────

function BrandHierarchy() {
  return (
    <div className="px-5 mt-6">
      <h2 className="text-label text-tx-tertiary font-mono uppercase mb-3">🏛 Brand Architecture</h2>

      {/* Public layer */}
      <div className="app-card mb-2">
        <p className="text-[8px] font-mono uppercase mb-3" style={{ color: '#4A7A5B' }}>
          ✓ PUBLIC — Audience sees this
        </p>
        <div className="grid grid-cols-2 gap-3">
          {/* quiXzoom */}
          <div className="rounded-lg p-3" style={{ background: '#C4961A08', border: '1px solid #C4961A30' }}>
            <p className="text-sm font-bold" style={{ color: '#C4961A' }}>quiXzoom</p>
            <p className="text-[9px] text-tx-muted font-mono mt-0.5 mb-2">Global movement</p>
            <div className="space-y-0.5">
              {['Fast', 'Raw', 'Street-level', 'Real'].map(t => (
                <p key={t} className="text-[8px] font-mono" style={{ color: '#C4961A' }}>· {t}</p>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-[#C4961A20]">
              <p className="text-[8px] text-tx-muted leading-relaxed italic">
                "Anyone can capture real-world intelligence and get paid."
              </p>
            </div>
          </div>

          {/* LandveX */}
          <div className="rounded-lg p-3" style={{ background: '#4A7A9B08', border: '1px solid #4A7A9B30' }}>
            <p className="text-sm font-bold" style={{ color: '#4A7A9B' }}>LandveX</p>
            <p className="text-[9px] text-tx-muted font-mono mt-0.5 mb-2">System intelligence</p>
            <div className="space-y-0.5">
              {['Sharp', 'Analytical', 'Precise', 'High-trust'].map(t => (
                <p key={t} className="text-[8px] font-mono" style={{ color: '#4A7A9B' }}>· {t}</p>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-[#4A7A9B20]">
              <p className="text-[8px] text-tx-muted leading-relaxed italic">
                "The system that understands the world through data."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden layer */}
      <div className="app-card" style={{ background: '#0F1220', border: '1px solid #2A3044' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">🔒</span>
          <p className="text-[8px] font-mono uppercase text-[#D94040]">HIDDEN — Never in public content</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['Wavult Group', 'Wolvold', 'Holdings', 'FinanceCo', 'DevOps Co', 'GovCo', 'Ownership structure', 'Internal entities'].map(s => (
            <span key={s} className="text-[8px] font-mono px-1.5 py-0.5 rounded-full"
              style={{ background: '#D9404010', color: '#D94040', border: '1px solid #D9404025' }}>
              ✗ {s}
            </span>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-[#2A3044]">
          <p className="text-[9px] text-tx-muted italic leading-relaxed">
            "The audience must never experience the corporate structure. They only experience the brands."
          </p>
        </div>
      </div>

      {/* Channel name warning */}
      <div className="app-card mt-2 flex items-start gap-2"
        style={{ background: '#C4961A08', border: '1px solid #C4961A40' }}>
        <span className="text-base flex-shrink-0">⚠️</span>
        <div>
          <p className="text-xs font-semibold text-signal-amber">Channel Name — Decision Needed</p>
          <p className="text-[9px] text-tx-secondary leading-relaxed mt-1">
            "Wavult — Building in the Open" exposes the hidden layer. The public channel must be named under <strong className="text-tx-primary">quiXzoom</strong> or <strong className="text-tx-primary">LandveX</strong> — or a neutral brand TBD.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Dual Narrative ───────────────────────────────────────────────────────────

function DualNarrative() {
  return (
    <div className="px-5 mt-6">
      <h2 className="text-label text-tx-tertiary font-mono uppercase mb-3">📖 Story Architecture</h2>

      <div className="app-card mb-3"
        style={{ background: '#0F1220', border: '1px solid #2A3044' }}>
        <p className="text-[9px] text-tx-tertiary font-mono uppercase mb-2">Core Narrative</p>
        <p className="text-sm font-semibold text-tx-primary leading-snug">
          We are building something from nothing.<br />
          In real time.<br />
          In the real world.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 mb-3">
        {/* Layer 1 */}
        <div className="app-card" style={{ borderColor: '#C4961A30' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
              style={{ background: '#C4961A15', color: '#C4961A', border: '1px solid #C4961A30' }}>
              LAYER 1
            </span>
            <span className="text-xs font-bold" style={{ color: '#C4961A' }}>quiXzoom</span>
          </div>
          <div className="space-y-1">
            {['People doing missions', 'Earning money', 'Real-world action', 'Cities, streets, motion'].map(s => (
              <p key={s} className="text-[9px] text-tx-secondary flex items-start gap-2">
                <span style={{ color: '#C4961A' }} className="flex-shrink-0">→</span>{s}
              </p>
            ))}
          </div>
        </div>

        {/* Layer 2 */}
        <div className="app-card" style={{ borderColor: '#4A7A9B30' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
              style={{ background: '#4A7A9B15', color: '#4A7A9B', border: '1px solid #4A7A9B30' }}>
              LAYER 2
            </span>
            <span className="text-xs font-bold" style={{ color: '#4A7A9B' }}>LandveX</span>
          </div>
          <div className="space-y-1">
            {['Data becomes intelligence', 'Systems interpreting reality', 'Signals, alerts, decisions', 'Clean dashboards, high-end'].map(s => (
              <p key={s} className="text-[9px] text-tx-secondary flex items-start gap-2">
                <span style={{ color: '#4A7A9B' }} className="flex-shrink-0">→</span>{s}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Episode structure template */}
      <div className="app-card" style={{ background: '#0F1220', border: '1px solid #2A3044' }}>
        <p className="text-[9px] font-mono text-tx-tertiary uppercase mb-2">Episode Structure — Required</p>
        <div className="space-y-2">
          {[
            { n: '01', label: 'Real-world action', brand: 'quiXzoom', color: '#C4961A' },
            { n: '02', label: 'System insight',    brand: 'LandveX',  color: '#4A7A9B' },
            { n: '03', label: 'Decision or challenge', brand: 'Both', color: '#8B5CF6' },
            { n: '04', label: 'Outcome or tension', brand: 'Both',    color: '#4A7A5B' },
          ].map(s => (
            <div key={s.n} className="flex items-center gap-3">
              <span className="text-[10px] font-bold font-mono w-5 flex-shrink-0"
                style={{ color: s.color }}>{s.n}</span>
              <span className="text-[10px] text-tx-primary flex-1">{s.label}</span>
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: s.color + '15', color: s.color, border: `1px solid ${s.color}30` }}>
                {s.brand}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Content Pipeline ─────────────────────────────────────────────────────────

function ContentPipeline() {
  const [expanded, setExpanded] = useState(false)
  const [expandedEp, setExpandedEp] = useState<string | null>(null)
  const visible = expanded ? EPISODES : EPISODES.slice(0, 3)

  return (
    <div className="px-5 mt-6">
      <button
        className="w-full flex items-center justify-between mb-3"
        onClick={() => setExpanded(e => !e)}
      >
        <h2 className="text-label text-tx-tertiary font-mono uppercase">🎞 Content Pipeline</h2>
        <span className="text-[9px] font-mono text-tx-muted">
          {expanded ? '▲ collapse' : `▼ all (${EPISODES.length})`}
        </span>
      </button>

      <div className="space-y-2">
        {visible.map((ep, i) => {
          const cfg = STATUS_CONFIG[ep.status]
          const bc = BRAND_CONFIG[ep.brand]
          const open = expandedEp === ep.id
          return (
            <div key={ep.id} className="app-card">
              <button
                className="w-full flex items-start gap-3 text-left"
                onClick={() => setExpandedEp(open ? null : ep.id)}
              >
                <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-tx-muted font-mono"
                  style={{ background: '#1C2030', border: '1px solid #2A3044' }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-tx-primary leading-snug">{ep.title}</p>
                  <p className="text-[9px] text-tx-muted mt-0.5 leading-relaxed">{ep.description}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full"
                      style={{ background: bc.color + '15', color: bc.color, border: `1px solid ${bc.color}30` }}>
                      {bc.label}
                    </span>
                    {ep.stars.map(s => (
                      <span key={s} className="text-[8px] font-mono px-1.5 py-0.5 rounded-full text-tx-muted"
                        style={{ background: '#2A3044', border: '1px solid #3A4054' }}>
                        {s}
                      </span>
                    ))}
                    {ep.duration && (
                      <span className="text-[8px] font-mono text-tx-muted ml-auto">{ep.duration}</span>
                    )}
                  </div>
                </div>
                <span className="text-[9px] font-mono text-tx-muted flex-shrink-0 mt-1">{open ? '▲' : '▼'}</span>
              </button>

              {/* 4-part structure breakdown */}
              {open && ep.act1 && (
                <div className="mt-3 pt-3 border-t border-w-border space-y-1.5 animate-fade-in">
                  <p className="text-[8px] font-mono text-tx-tertiary uppercase mb-1.5">Episode Structure</p>
                  {[
                    { n: '01', text: ep.act1, color: '#C4961A' },
                    { n: '02', text: ep.act2, color: '#4A7A9B' },
                    { n: '03', text: ep.act3, color: '#8B5CF6' },
                    { n: '04', text: ep.act4, color: '#4A7A5B' },
                  ].map(a => a.text ? (
                    <div key={a.n} className="flex items-start gap-2">
                      <span className="text-[9px] font-bold font-mono flex-shrink-0 w-4" style={{ color: a.color }}>{a.n}</span>
                      <span className="text-[9px] text-tx-secondary">{a.text}</span>
                    </div>
                  ) : null)}
                </div>
              )}

              {/* Status footer */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-w-border">
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full"
                  style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                  {cfg.label}
                </span>
                <div className="flex items-center gap-3">
                  {ep.filmed && <span className="text-[8px] text-tx-muted font-mono">🎥 {formatDate(ep.filmed)}</span>}
                  {ep.publishDate && <span className="text-[8px] font-mono text-signal-amber">📅 {formatDate(ep.publishDate)}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Channel Overview ─────────────────────────────────────────────────────────

function ChannelOverview() {
  return (
    <div className="px-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-label text-tx-tertiary font-mono uppercase">📺 The Series</h2>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-signal-amber/15 text-signal-amber border border-signal-amber/30">
          PLANNING
        </span>
      </div>

      <div className="app-card mb-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
            style={{ background: '#C4961A15', border: '1px solid #C4961A30' }}>
            🎬
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-tx-primary">[Channel name — TBD]</p>
            <p className="text-[10px] text-tx-muted font-mono mt-0.5">
              quiXzoom · LandveX · Real business, no gurus.
            </p>
            <p className="text-[9px] text-tx-tertiary mt-2 leading-relaxed">
              Documenting the construction of a new system that interacts with the real world. Nobody shows this at this scale. We film now, publish in 6 months.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-w-border">
          {[
            { v: '6 mo',   label: 'DELAY POLICY' },
            { v: '3 yrs',  label: 'SERIES LENGTH' },
            { v: 'EN',     label: 'LANGUAGE' },
            { v: 'Apr \'26', label: 'PILOT' },
          ].map(k => (
            <div key={k.label} className="text-center">
              <p className="text-stat font-bold text-signal-amber">{k.v}</p>
              <p className="text-[8px] text-tx-muted font-mono">{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* The on-screen talent */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { name: 'Leon Russo', role: 'The Sales Engine', initials: 'LR', color: '#C4961A', bio: 'Deals, prospecting, real sales. quiXzoom face.' },
          { name: 'Winston Bjarnemark', role: 'The CFO', initials: 'WB', color: '#8B5CF6', bio: 'Cashflow, structure, financial decisions.' },
        ].map(star => (
          <div key={star.name} className="app-card">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                style={{ background: star.color + '20', color: star.color, border: `1px solid ${star.color}30` }}>
                {star.initials}
              </div>
              <div>
                <p className="text-xs font-bold text-tx-primary">{star.name.split(' ')[0]}</p>
                <p className="text-[9px] font-mono" style={{ color: star.color }}>{star.role}</p>
              </div>
            </div>
            <p className="text-[9px] text-tx-muted leading-relaxed">{star.bio}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Content Rules ────────────────────────────────────────────────────────────

function ContentRules() {
  const [open, setOpen] = useState(false)

  return (
    <div className="px-5 mt-6">
      <button
        className="w-full flex items-center justify-between mb-3"
        onClick={() => setOpen(o => !o)}
      >
        <h2 className="text-label text-tx-tertiary font-mono uppercase">📋 Content Rules</h2>
        <span className="text-[9px] font-mono text-tx-muted">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="space-y-2 animate-fade-in">
          {/* Never mention / never show */}
          <div className="app-card" style={{ background: '#0F1220', border: '1px solid #D9404030' }}>
            <p className="text-[8px] font-mono text-[#D94040] uppercase mb-2">Never mention / Never show</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {[
                'Holdings', 'Ownership structure', 'Trusts', 'Internal entities',
                'Financial flows', 'Legal setup', 'Internal dashboards', 'Corporate layers',
              ].map(s => (
                <p key={s} className="text-[9px] text-tx-muted flex items-start gap-1">
                  <span className="text-[#D94040] flex-shrink-0">✗</span>{s}
                </p>
              ))}
            </div>
          </div>

          {/* Editing rules */}
          <div className="app-card">
            <p className="text-[8px] font-mono text-tx-tertiary uppercase mb-2">Editing Rules</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[8px] font-mono text-[#D94040] mb-1">✗ Forbidden</p>
                {['Fake drama', 'Overproduction', 'Scripted behavior', 'Staged moments'].map(s => (
                  <p key={s} className="text-[9px] text-tx-muted">· {s}</p>
                ))}
              </div>
              <div>
                <p className="text-[8px] font-mono text-[#4A7A5B] mb-1">✓ Required</p>
                {['Authentic moments', 'Real decisions', 'Real consequences', 'English subtitles'].map(s => (
                  <p key={s} className="text-[9px] text-tx-muted">· {s}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Language */}
          <div className="app-card flex items-center gap-3">
            <span className="text-base flex-shrink-0">🌍</span>
            <div>
              <p className="text-xs font-semibold text-tx-primary">Language: English Only</p>
              <p className="text-[9px] text-tx-muted mt-0.5">All final content in English. No Swedish in output. English subtitles on all footage.</p>
            </div>
          </div>

          {/* Final directive */}
          <div className="app-card" style={{ background: '#0F1220', border: '1px solid #2A3044' }}>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-tx-primary">Hide the structure. Show the movement.</p>
              <p className="text-xs font-semibold text-tx-primary">Hide the control. Show the execution.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Field Documentarian Role ─────────────────────────────────────────────────

function FieldDocumentarianRole() {
  const [section, setSection] = useState<string | null>(null)
  const toggle = (s: string) => setSection(prev => prev === s ? null : s)
  const [showAd, setShowAd] = useState(false)

  return (
    <div className="px-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-label text-tx-tertiary font-mono uppercase">🎥 Field Documentarian</h2>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
          style={{ background: '#D9404015', color: '#D94040', border: '1px solid #D9404030' }}>
          HIRING
        </span>
      </div>

      {/* Role card */}
      <div className="app-card mb-3">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-xl flex-shrink-0">📡</span>
          <div>
            <p className="text-xs font-bold text-tx-primary">Field Documentarian</p>
            <p className="text-[9px] font-mono text-signal-amber mt-0.5">Bangkok · April 2026 · Full-Time</p>
            <p className="text-[9px] text-tx-secondary mt-2 leading-relaxed">
              Not a videographer. Not a content creator. A real-time operator capturing the construction of a global system.
            </p>
          </div>
        </div>

        {/* Style ref */}
        <div className="rounded-lg p-3 mb-3"
          style={{ background: '#0F1220', border: '1px solid #2A3044' }}>
          <p className="text-[8px] font-mono text-tx-tertiary uppercase mb-1.5">Style Reference</p>
          <p className="text-[10px] text-tx-primary font-semibold">NELK energy × elite business execution.</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            {[['Raw', 'Intelligent'], ['Unfiltered', 'Strategic'], ['Fast', 'High-stakes'], ['Real', 'No nonsense']].map(([a, b]) => (
              <div key={a} className="contents">
                <span className="text-[9px] font-mono" style={{ color: '#C4961A' }}>✓ {a}</span>
                <span className="text-[9px] font-mono" style={{ color: '#4A7A9B' }}>✓ {b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* NOT / ARE */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg p-2.5" style={{ background: '#D9404008', border: '1px solid #D9404025' }}>
            <p className="text-[8px] font-mono text-[#D94040] uppercase mb-1.5">NOT</p>
            {['Film school grads', 'Corporate videographers', 'Over-edited creators'].map(s => (
              <p key={s} className="text-[9px] text-tx-muted flex items-start gap-1"><span className="text-[#D94040] flex-shrink-0">✗</span>{s}</p>
            ))}
          </div>
          <div className="rounded-lg p-2.5" style={{ background: '#4A7A5B08', border: '1px solid #4A7A5B25' }}>
            <p className="text-[8px] font-mono text-[#4A7A5B] uppercase mb-1.5">YES</p>
            {['Young & hungry', 'Obsessed w/ reality', 'Chaos-comfortable', 'Loyal & discreet'].map(s => (
              <p key={s} className="text-[9px] text-tx-muted flex items-start gap-1"><span className="text-[#4A7A5B] flex-shrink-0">✓</span>{s}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Expandable detail sections */}
      {[
        {
          id: 'capture', icon: '🎯', title: 'What Must Be Captured',
          items: ['Founder decision-making', 'Team interactions', 'Product development', 'Problem-solving', 'Financial reviews', 'Travel and movement', 'Tension, stress, breakthroughs'],
        },
        {
          id: 'schedule', icon: '📅', title: 'Recording Structure',
          items: ['Weekly — min. 1 full filming day', 'Monthly — full team meetups + strategy', 'Monthly — key decision moments', 'Continuous — opportunistic', 'Same-day upload — no exceptions'],
        },
        {
          id: 'rules', icon: '⚡', title: 'Non-Negotiable Rules',
          items: ['Always ready to film', 'Never miss key moments', 'Never interrupt reality', 'Never stage a scene', 'If it feels staged → it is wrong', 'Trust > skill'],
        },
        {
          id: 'pipeline', icon: '💾', title: 'Storage & Pipeline',
          items: ['Upload same day', 'Proper audio capture mandatory', 'Stable but raw footage', 'Follow naming conventions', 'Include metadata on every file'],
        },
        {
          id: 'brand', icon: '🏢', title: 'What the Documentarian Can Show',
          items: ['✓ quiXzoom — missions, people, map, streets', '✓ LandveX — dashboards, signals, client moments', '✗ Internal company structure', '✗ Holdings, ownership, financial flows', '✗ Wavult Group name — never on camera'],
        },
      ].map(sec => (
        <div key={sec.id} className="mb-2">
          <button className="w-full app-card flex items-center gap-3" onClick={() => toggle(sec.id)}>
            <span className="text-base flex-shrink-0">{sec.icon}</span>
            <span className="text-xs font-semibold text-tx-primary flex-1 text-left">{sec.title}</span>
            <span className="text-[9px] font-mono text-tx-muted flex-shrink-0">{section === sec.id ? '▲' : '▼'}</span>
          </button>
          {section === sec.id && (
            <div className="app-card mt-1 animate-fade-in" style={{ background: '#0F1220', border: '1px solid #2A3044' }}>
              <div className="space-y-1">
                {sec.items.map(item => (
                  <p key={item} className="text-[9px] text-tx-secondary flex items-start gap-2">
                    <span className="text-signal-amber flex-shrink-0 font-mono">→</span>{item}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Job ad */}
      <button className="w-full flex items-center justify-between app-card mt-1 mb-2" onClick={() => setShowAd(b => !b)}>
        <span className="text-xs font-semibold text-tx-primary">📄 Job Posting (Draft — English)</span>
        <span className="text-[9px] font-mono text-tx-muted">{showAd ? '▲' : '▼'}</span>
      </button>

      {showAd && (
        <div className="app-card mb-3 animate-fade-in" style={{ background: '#0F1220', border: '1px solid #2A3044' }}>
          <p className="text-[9px] font-mono text-signal-amber mb-3">— DRAFT — English only —</p>
          <div className="text-[10px] text-tx-secondary leading-relaxed space-y-3">
            <p className="font-bold text-tx-primary text-xs">🎥 Field Documentarian — Bangkok, April 2026</p>
            <p>We're building something that has never been built before. We need someone to film it.</p>
            <p><strong className="text-tx-primary">This is not a content creator role.</strong> This is a real-time operator capturing the creation of a global system — from the streets of Bangkok.</p>
            <div>
              <p className="text-tx-primary font-semibold mb-1">What you'll do:</p>
              <p>Follow the team. Film decisions, conversations, breakthroughs, setbacks. Never stage anything. Upload same day. Be ready always.</p>
            </div>
            <div>
              <p className="text-tx-primary font-semibold mb-1">What we need:</p>
              <p>✓ Fluent English — non-negotiable<br />
                ✓ Know how to operate a camera<br />
                ✓ Available full-time from April 11th<br />
                ✓ Fast, discreet, misses nothing<br />
                ✓ Bangkok-based or willing to be<br />
                ◎ Age 18–25 preferred<br />
                ◎ Sony / Canon experience is a plus</p>
            </div>
            <div>
              <p className="text-tx-primary font-semibold mb-1">What you get:</p>
              <p>Paid position. Rare access. Your footage becomes part of a 3-year documentary series reaching a global audience.</p>
            </div>
            <div className="pt-2 border-t border-w-border">
              <p><strong className="text-signal-amber">One rule:</strong> If it feels staged, it is wrong.</p>
            </div>
            <p className="text-tx-muted font-mono text-[8px]">Apply: [contact TBD] — Subject: FIELD DOC BANGKOK</p>
          </div>
        </div>
      )}

      {/* Pipeline */}
      <p className="text-[9px] font-mono text-tx-tertiary uppercase mb-2">Candidate Pipeline</p>
      <div className="space-y-1.5 mb-4">
        {CANDIDATES.map(c => {
          const cfg = RECRUIT_CONFIG[c.status]
          return (
            <div key={c.id} className="app-card flex items-center gap-3">
              <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                style={{ background: '#1C2030', border: '1px solid #2A3044' }}>👤</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-tx-primary">Position Open</p>
                <p className="text-[9px] text-tx-muted font-mono truncate">{c.note}</p>
              </div>
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: cfg.color + '15', color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                {cfg.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Final directive */}
      <div className="app-card" style={{ background: '#0F1220', border: '1px solid #2A3044' }}>
        <p className="text-[8px] font-mono text-tx-tertiary uppercase mb-2">Final Directive</p>
        <div className="space-y-1">
          {['Move fast.', 'Capture everything.', 'Miss nothing.'].map(l => (
            <p key={l} className="text-xs font-semibold text-tx-primary">{l}</p>
          ))}
          <div className="h-2" />
          {['This is not content.', 'This is history being recorded.'].map(l => (
            <p key={l} className="text-xs font-semibold" style={{ color: '#C4961A' }}>{l}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MediaView() {
  return (
    <div className="pb-24 animate-fade-in overflow-y-auto">
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-label text-tx-tertiary font-mono uppercase">Wavult OS</p>
            <h1 className="text-action text-tx-primary mt-0.5">Media</h1>
          </div>
          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: '#C4961A15', border: '1px solid #C4961A30' }}>
            📺
          </div>
        </div>
        <p className="text-[10px] text-tx-muted font-mono mt-1">
          quiXzoom · LandveX · Field Doc · 3-Year Series · 6-Month Delay
        </p>
      </div>

      <BrandHierarchy />
      <DualNarrative />
      <ChannelOverview />
      <ContentPipeline />
      <ContentRules />
      <FieldDocumentarianRole />
    </div>
  )
}
