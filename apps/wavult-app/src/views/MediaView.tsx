// ─── Wavult OS — Media Department ─────────────────────────────────────────────
// YouTube-kanal + kameraman-rekrytering + produktion.
// Winston & Leon = huvud. 6 månaders delay-policy. Real business, not content.

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentStatus = 'filming' | 'editing' | 'queue' | 'published' | 'concept'
type RecruitStatus = 'open' | 'contacted' | 'interview' | 'hired' | 'declined'

interface ContentEpisode {
  id: string
  title: string
  description: string
  filmed: string | null      // ISO date
  publishDate: string | null // ISO date (filmed + 6 months)
  status: ContentStatus
  stars: string[]            // team members featured
  tags: string[]
  duration?: string
}

interface CameramanCandidate {
  id: string
  name: string
  age: number
  location: string
  english: 'basic' | 'good' | 'fluent'
  cameraExp: string
  status: RecruitStatus
  note: string
  platform?: string
}

// ─── Data Seeds ───────────────────────────────────────────────────────────────

const EPISODES: ContentEpisode[] = [
  {
    id: 'ep-001',
    title: 'Dag 1 — Thailand Workcamp',
    description: 'Vi landar i Bangkok. Leon och Winston checkar in. Teamet samlas för första gången på riktigt.',
    filmed: '2026-04-11',
    publishDate: '2026-10-11',
    status: 'concept',
    stars: ['Leon', 'Winston'],
    tags: ['thailand', 'dag-1', 'team'],
    duration: '~12 min',
  },
  {
    id: 'ep-002',
    title: 'Hur vi satte upp ett bolag i Delaware på 3 dagar',
    description: 'quiXzoom Inc. — Stripe Atlas, EIN, bankkonto. Steg för steg.',
    filmed: null,
    publishDate: null,
    status: 'concept',
    stars: ['Winston', 'Dennis'],
    tags: ['bolag', 'usa', 'juridik'],
    duration: '~18 min',
  },
  {
    id: 'ep-003',
    title: 'Leon ringer kalla samtal live — och stänger',
    description: 'Inget manus. Bara Leon, ett headset och ett CRM. Tre samtal. Vi visar vad som händer.',
    filmed: null,
    publishDate: null,
    status: 'concept',
    stars: ['Leon'],
    tags: ['sälj', 'crm', 'realitet'],
    duration: '~25 min',
  },
  {
    id: 'ep-004',
    title: 'Infrastruktur för ett startup — vad vi kör och varför',
    description: 'AWS ECS, Cloudflare, Supabase, GitHub Actions. Johan och Winston bryter ned stacken.',
    filmed: null,
    publishDate: null,
    status: 'concept',
    stars: ['Winston', 'Johan'],
    tags: ['tech', 'infrastruktur', 'stack'],
    duration: '~30 min',
  },
  {
    id: 'ep-005',
    title: 'Vad är quiXzoom? Vi förklarar för en 12-åring',
    description: 'Leon testar pitchen mot olika målgrupper — live, på gatan i Bangkok.',
    filmed: null,
    publishDate: null,
    status: 'concept',
    stars: ['Leon'],
    tags: ['produkt', 'pitch', 'quixzoom'],
    duration: '~15 min',
  },
  {
    id: 'ep-006',
    title: 'Pengar flödar — så sätter vi upp betalningar',
    description: 'Revolut Business, Stripe, zoomer-wallets. Winston och Leon diskuterar payment-arkitektur.',
    filmed: null,
    publishDate: null,
    status: 'concept',
    stars: ['Winston', 'Leon'],
    tags: ['fintech', 'betalningar', 'stripe'],
    duration: '~22 min',
  },
]

const CANDIDATES: CameramanCandidate[] = [
  {
    id: 'cand-001',
    name: 'Open position',
    age: 0,
    location: 'Bangkok / Chiang Mai / Pattaya',
    english: 'good',
    cameraExp: 'Sony / Canon mirrorless',
    status: 'open',
    note: 'Söker aktivt via Instagram, Facebook-grupper, uni-anslagstavlor i Bangkok',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ContentStatus, { label: string; color: string; bg: string }> = {
  concept:   { label: 'KONCEPT',    color: '#8B919A', bg: '#3D445215' },
  filming:   { label: 'FILMAS',     color: '#C4961A', bg: '#C4961A15' },
  editing:   { label: 'KLIPPAS',    color: '#4A7A9B', bg: '#4A7A9B15' },
  queue:     { label: 'KÖ (6 MÅN)', color: '#8B5CF6', bg: '#8B5CF615' },
  published: { label: 'LIVE',       color: '#4A7A5B', bg: '#4A7A5B15' },
}

const RECRUIT_CONFIG: Record<RecruitStatus, { label: string; color: string }> = {
  open:      { label: 'SÖKER',     color: '#C4961A' },
  contacted: { label: 'KONTAKTAD', color: '#4A7A9B' },
  interview: { label: 'INTERVJU',  color: '#8B5CF6' },
  hired:     { label: 'ANSTÄLLD',  color: '#4A7A5B' },
  declined:  { label: 'AVBÖJDE',   color: '#D94040' },
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ─── Channel Overview ─────────────────────────────────────────────────────────

function ChannelOverview() {
  return (
    <div className="px-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-label text-tx-tertiary font-mono uppercase">📺 YouTube-kanalen</h2>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-signal-amber/15 text-signal-amber border border-signal-amber/30">
          PLANERING
        </span>
      </div>

      <div className="app-card mb-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
            style={{ background: '#C4961A15', border: '1px solid #C4961A30' }}>
            🎬
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-tx-primary">Wavult — Building in the Open</p>
            <p className="text-[10px] text-tx-muted font-mono mt-0.5">
              Hands-on business. Inget bull. Inga gurus.
            </p>
            <p className="text-[9px] text-tx-tertiary mt-2 leading-relaxed">
              Vi bygger ett globalt techbolag live på kamera. Winston håller koll på pengarna, Leon stänger dealar. Ingen annan kanal visar det här på riktigt — och ingen i den här skalan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-w-border">
          <div className="text-center">
            <p className="text-stat font-bold text-signal-amber">6 mån</p>
            <p className="text-[8px] text-tx-muted font-mono">DELAY-POLICY</p>
          </div>
          <div className="text-center">
            <p className="text-stat font-bold" style={{ color: '#C4961A' }}>2</p>
            <p className="text-[8px] text-tx-muted font-mono">HUVUDROLLER</p>
          </div>
          <div className="text-center">
            <p className="text-stat font-bold" style={{ color: '#4A7A5B' }}>Apr '26</p>
            <p className="text-[8px] text-tx-muted font-mono">PILOT-FILM</p>
          </div>
        </div>
      </div>

      {/* Stjärnorna */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { name: 'Leon Russo', role: 'Säljmotorn', initials: 'LR', color: '#C4961A', bio: 'Deals, prospecting, verklighetens sälj.' },
          { name: 'Winston Bjarnemark', role: 'Ekonomichefen', initials: 'WB', color: '#8B5CF6', bio: 'Cashflow, struktur, affärsbeslut.' },
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

      {/* Delay-policy förklaring */}
      <div className="app-card mt-3 flex items-start gap-2">
        <span className="text-base flex-shrink-0">🔒</span>
        <div>
          <p className="text-xs font-semibold text-tx-primary">6-månaders delay — varför?</p>
          <p className="text-[9px] text-tx-secondary leading-relaxed mt-1">
            Vi filmar allt nu, men publiserar 6 månader senare. Inga avslöjanden av pågående deals. Inga konkurrenter som ser vad vi gör. Tittarna ser autentisk business — men i backspegeln.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Content Pipeline ─────────────────────────────────────────────────────────

function ContentPipeline() {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? EPISODES : EPISODES.slice(0, 3)

  return (
    <div className="px-5 mt-6">
      <button
        className="w-full flex items-center justify-between mb-3"
        onClick={() => setExpanded(e => !e)}
      >
        <h2 className="text-label text-tx-tertiary font-mono uppercase">🎞 Content Pipeline</h2>
        <span className="text-[9px] font-mono text-tx-muted">{expanded ? '▲ visa färre' : `▼ visa alla (${EPISODES.length})`}</span>
      </button>

      <div className="space-y-2">
        {visible.map((ep, i) => {
          const cfg = STATUS_CONFIG[ep.status]
          const daysLeft = daysUntil(ep.publishDate)
          return (
            <div key={ep.id} className="app-card">
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-tx-muted font-mono"
                  style={{ background: '#1C2030', border: '1px solid #2A3044' }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-tx-primary leading-snug">{ep.title}</p>
                  <p className="text-[9px] text-tx-muted mt-0.5 leading-relaxed">{ep.description}</p>

                  {/* Stars */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {ep.stars.map(s => (
                      <span key={s} className="text-[8px] font-mono px-1.5 py-0.5 rounded-full"
                        style={{ background: '#C4961A15', color: '#C4961A', border: '1px solid #C4961A30' }}>
                        {s}
                      </span>
                    ))}
                    {ep.duration && (
                      <span className="text-[8px] font-mono text-tx-muted ml-auto">{ep.duration}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-w-border">
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full"
                  style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                  {cfg.label}
                </span>
                <div className="flex items-center gap-3">
                  {ep.filmed && (
                    <span className="text-[8px] text-tx-muted font-mono">🎥 {formatDate(ep.filmed)}</span>
                  )}
                  {ep.publishDate && (
                    <span className="text-[8px] font-mono" style={{ color: daysLeft && daysLeft > 0 ? '#8B5CF6' : '#4A7A5B' }}>
                      📅 {formatDate(ep.publishDate)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Cameraman Recruitment ────────────────────────────────────────────────────

function CameramanRecruitment() {
  const [showBrief, setShowBrief] = useState(false)

  return (
    <div className="px-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-label text-tx-tertiary font-mono uppercase">📷 Kameraman — Thailand</h2>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
          style={{ background: '#D9404015', color: '#D94040', border: '1px solid #D9404030' }}>
          REKRYTERAR
        </span>
      </div>

      {/* Role brief */}
      <div className="app-card mb-3">
        <div className="flex items-start gap-3">
          <span className="text-xl flex-shrink-0">🇹🇭</span>
          <div>
            <p className="text-xs font-bold text-tx-primary">Videographer — Wavult Workcamp</p>
            <p className="text-[9px] font-mono text-signal-amber mt-0.5">Bangkok · April 2026 · 1+ månad</p>
            <p className="text-[9px] text-tx-secondary mt-2 leading-relaxed">
              Vi söker en ung thailändsk man (18–23 år) som filmar vårt team under workcamp. Jobbet är enkelt: ha kamera, vara med, fånga verkligheten. Engelska är ett krav.
            </p>
          </div>
        </div>

        {/* Requirements */}
        <div className="mt-3 pt-3 border-t border-w-border">
          <p className="text-[9px] font-mono text-tx-tertiary uppercase mb-2">Krav</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: 'Engelska', req: 'Krav', ok: true },
              { label: 'Kamera-grunderna', req: 'Krav', ok: true },
              { label: 'Ålder 18–23', req: 'Preferens', ok: null },
              { label: 'Thailand-baserad', req: 'Krav', ok: true },
              { label: 'Tillgänglig april', req: 'Krav', ok: true },
              { label: 'Sony/Canon erfarenhet', req: 'Plus', ok: null },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-1.5">
                <span className="text-[9px]" style={{ color: r.ok ? '#4A7A5B' : '#C4961A' }}>
                  {r.ok ? '✓' : '◎'}
                </span>
                <span className="text-[9px] text-tx-secondary">{r.label}</span>
                <span className="text-[8px] font-mono text-tx-muted ml-auto">{r.req}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recruitment channels */}
      <div className="app-card mb-3">
        <p className="text-[9px] font-mono text-tx-tertiary uppercase mb-2">Kanaler</p>
        <div className="space-y-1.5">
          {[
            { channel: 'Instagram Bangkok', sub: '#bangkokjobs #thaifreelancer', status: 'Aktiv' },
            { channel: 'Facebook-grupper', sub: 'Bangkok Expats / Jobs in Thailand', status: 'Aktiv' },
            { channel: 'Universitets-anslagstavlor', sub: 'Chula, KMITL, BU', status: 'Planerat' },
            { channel: 'Kasama kontakter', sub: 'Leon / Nysa Hotel-nätverk', status: 'Planerat' },
          ].map(c => (
            <div key={c.channel} className="flex items-center gap-3">
              <div className="h-5 w-5 rounded flex items-center justify-center flex-shrink-0 text-[8px] font-bold text-tx-muted"
                style={{ background: '#1C2030', border: '1px solid #2A3044' }}>
                {c.channel.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-tx-primary">{c.channel}</p>
                <p className="text-[8px] text-tx-muted font-mono">{c.sub}</p>
              </div>
              <span className="text-[8px] font-mono"
                style={{ color: c.status === 'Aktiv' ? '#4A7A5B' : '#C4961A' }}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Job ad draft */}
      <button
        className="w-full flex items-center justify-between app-card mb-3"
        onClick={() => setShowBrief(b => !b)}
      >
        <span className="text-xs font-semibold text-tx-primary">📄 Jobbannons (utkast)</span>
        <span className="text-[9px] font-mono text-tx-muted">{showBrief ? '▲' : '▼'}</span>
      </button>

      {showBrief && (
        <div className="app-card bg-[#0F1220] border border-[#2A3044] mb-3 animate-fade-in">
          <p className="text-[9px] font-mono text-signal-amber mb-2">— DRAFT —</p>
          <div className="text-[10px] text-tx-secondary leading-relaxed space-y-2">
            <p className="font-bold text-tx-primary text-xs">🎥 Videographer Wanted — Bangkok, April 2026</p>
            <p>We're a Swedish tech company building our operations from Bangkok for one month. We're looking for a young Thai guy (18–23) to film our team during this period.</p>
            <p><strong className="text-tx-primary">What you'll do:</strong> Follow us around. Film meetings, work sessions, the city, the team. No directing, no editing — just capture what's real.</p>
            <p><strong className="text-tx-primary">What we need:</strong><br />
              ✓ You know how to use a video camera (or mirrorless)<br />
              ✓ You speak English comfortably<br />
              ✓ You're available full-time April 11th onwards<br />
              ✓ You're based in Bangkok or willing to be
            </p>
            <p><strong className="text-tx-primary">What you get:</strong> Paid position. Unique experience inside a real startup. Content you can use in your portfolio.</p>
            <p className="text-tx-muted font-mono text-[8px]">Contact: [email/instagram TBD]</p>
          </div>
        </div>
      )}

      {/* Candidates */}
      <p className="text-[9px] font-mono text-tx-tertiary uppercase mb-2">Pipeline</p>
      <div className="space-y-1.5">
        {CANDIDATES.map(c => {
          const cfg = RECRUIT_CONFIG[c.status]
          return (
            <div key={c.id} className="app-card flex items-center gap-3">
              <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                style={{ background: '#1C2030', border: '1px solid #2A3044' }}>
                {c.status === 'open' ? '👤' : c.name.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-tx-primary">{c.name}</p>
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
    </div>
  )
}

// ─── Production Rules ─────────────────────────────────────────────────────────

function ProductionRules() {
  const rules = [
    { icon: '🎥', title: 'Fånga allt — filtrera senare', body: 'Kör kameran alltid. Bättre att ha för mycket råmaterial än för lite. Klippning beslutar vad som publiceras.' },
    { icon: '🔒', title: '6 månaders delay — ingen kompromiss', body: 'Inget publiceras tidigare. Pågående deals, affärshemligheter och förhandlingar ska vara avslutade innan världen ser dem.' },
    { icon: '👥', title: 'Winston + Leon = ankaret', body: 'De är de två ständiga ansiktena. Resten av teamet förekommer naturligt men Winston och Leon bär berättelsen.' },
    { icon: '📵', title: 'Inga scripted moments', body: 'Ingen koreografi, inga omtagningar av "äkta" scener. Om något går fel — filma det. Det är innehållet.' },
    { icon: '🌍', title: 'Undertext på engelska', body: 'Allt filmstoff undertexter på engelska. Kanalen siktar internationellt — globalt sug för content som visar riktig business.' },
  ]

  return (
    <div className="px-5 mt-6 mb-4">
      <h2 className="text-label text-tx-tertiary font-mono uppercase mb-3">📋 Produktionsregler</h2>
      <div className="space-y-2">
        {rules.map(r => (
          <div key={r.title} className="app-card flex items-start gap-3">
            <span className="text-base flex-shrink-0">{r.icon}</span>
            <div>
              <p className="text-xs font-semibold text-tx-primary">{r.title}</p>
              <p className="text-[9px] text-tx-secondary leading-relaxed mt-0.5">{r.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MediaView() {
  return (
    <div className="pb-24 animate-fade-in overflow-y-auto">
      {/* Header */}
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
          YouTube · Rekrytering · Produktion · 6-månaders delay
        </p>
      </div>

      <ChannelOverview />
      <ContentPipeline />
      <CameramanRecruitment />
      <ProductionRules />
    </div>
  )
}
