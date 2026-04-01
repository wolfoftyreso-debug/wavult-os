import { useState } from 'react'
import {
  FileText, Upload, ChevronDown, ChevronUp, CheckCircle2,
  Clock, XCircle, Copy, Mail, Globe, Users,
  AlertTriangle,
} from 'lucide-react'
import { VISA_APPLICATIONS } from './visaData'
import type { VisaApplication, VisaStep, VisaDocument, VisaStatus } from './visaTypes'

// ─── Constants ────────────────────────────────────────────────────────────────
type FilterKey = 'all' | 'UAE' | 'TH' | 'active' | 'approved'

const COUNTRY_FLAG: Record<string, string> = {
  UAE: '🇦🇪',
  TH:  '🇹🇭',
  SE:  '🇸🇪',
  US:  '🇺🇸',
}

const VISA_TYPE_LABEL: Record<string, string> = {
  investor_visa:       'Investor Visa',
  golden_visa:         'Golden Visa',
  tourist:             'Tourist',
  entry_permit:        'Entry Permit',
  residency_renewal:   'Residency Renewal',
}

const PERSON_INITIALS: Record<string, string> = {
  erik:    'ES',
  leon:    'LR',
  dennis:  'DB',
  winston: 'WB',
  johan:   'JB',
}

const PERSON_COLOR: Record<string, string> = {
  erik:    'bg-blue-700',
  leon:    'bg-purple-700',
  dennis:  'bg-amber-700',
  winston: 'bg-emerald-700',
  johan:   'bg-rose-700',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function stepsDone(app: VisaApplication): number {
  return app.steps.filter(s => s.status === 'done').length
}

function missingDocsCount(app: VisaApplication): number {
  return app.steps.flatMap(s => s.documents).filter(d => d.required && d.status === 'needed').length
}

function nextTodo(app: VisaApplication): VisaStep | undefined {
  return app.steps.find(s => s.status === 'todo' || s.status === 'in_progress')
}

function statusConfig(status: VisaStatus) {
  const map: Record<VisaStatus, { label: string; bg: string; text: string }> = {
    not_started: { label: 'Ej påbörjad',  bg: 'bg-gray-800',        text: 'text-gray-300' },
    in_progress: { label: 'Pågår',        bg: 'bg-yellow-900/40',   text: 'text-yellow-300' },
    submitted:   { label: 'Inlämnad',     bg: 'bg-blue-900/40',     text: 'text-blue-300' },
    approved:    { label: 'Godkänd',      bg: 'bg-emerald-900/40',  text: 'text-emerald-300' },
    rejected:    { label: 'Nekad',        bg: 'bg-red-900/40',      text: 'text-red-300' },
    expired:     { label: 'Utgången',     bg: 'bg-orange-900/40',   text: 'text-orange-300' },
  }
  return map[status]
}

function stepStatusIcon(s: VisaStep['status']) {
  if (s === 'done')       return <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
  if (s === 'in_progress') return <Clock        size={16} className="text-yellow-400 shrink-0" />
  if (s === 'blocked')    return <XCircle       size={16} className="text-red-400    shrink-0" />
  return <div className="w-4 h-4 rounded border border-gray-600 shrink-0" />
}

// ─── Stats Row ────────────────────────────────────────────────────────────────
function StatsRow({ apps }: { apps: VisaApplication[] }) {
  const active   = apps.filter(a => a.status !== 'approved' && a.status !== 'rejected').length
  const missing  = apps.reduce((sum, a) => sum + missingDocsCount(a), 0)
  const complete = [...new Set(apps.filter(a => a.status === 'approved').map(a => a.person_id))].length
  const totalMembers = [...new Set(apps.map(a => a.person_id))].length

  const nearest = apps
    .filter(a => a.target_date && a.status !== 'approved')
    .map(a => ({ days: daysUntil(a.target_date), label: a.target_date }))
    .sort((a, b) => a.days - b.days)[0]

  const stats = [
    {
      label: 'Aktiva ansökningar',
      value: String(active),
      sub:   `${apps.length} totalt`,
      accent: 'text-blue-400',
    },
    {
      label: 'Närmaste deadline',
      value: nearest ? `${nearest.days}d` : '—',
      sub:   nearest ? nearest.label : 'Inga deadlines',
      accent: nearest && nearest.days < 14 ? 'text-red-400' : 'text-yellow-400',
    },
    {
      label: 'Dokument saknas',
      value: String(missing),
      sub:   missing === 0 ? 'Allt klart' : 'krävs åtgärd',
      accent: missing > 0 ? 'text-orange-400' : 'text-emerald-400',
    },
    {
      label: 'Komplett status',
      value: `${complete}/${totalMembers}`,
      sub:   'teammedlemmar klara',
      accent: 'text-emerald-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(s => (
        <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">{s.label}</div>
          <div className={`text-3xl font-bold ${s.accent}`}>{s.value}</div>
          <div className="text-xs text-gray-400 mt-1">{s.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Document row ─────────────────────────────────────────────────────────────
function DocRow({ doc }: { doc: VisaDocument }) {
  const statusColor: Record<string, string> = {
    needed:    'text-red-400',
    gathering: 'text-yellow-400',
    ready:     'text-blue-400',
    submitted: 'text-purple-400',
    approved:  'text-emerald-400',
  }
  const statusLabel: Record<string, string> = {
    needed:    'Saknas',
    gathering: 'Samlas',
    ready:     'Klar',
    submitted: 'Inlämnad',
    approved:  'Godkänd',
  }

  return (
    <div className="flex items-center justify-between py-1.5 pl-6 border-b border-gray-800/50 last:border-0">
      <div className="flex items-center gap-2">
        <FileText size={12} className="text-gray-600 shrink-0" />
        <span className="text-xs text-gray-300">{doc.name}</span>
        {doc.required && <span className="text-[10px] text-gray-600">*</span>}
        {doc.notes && <span className="text-[10px] text-gray-600 italic">— {doc.notes}</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-medium ${statusColor[doc.status]}`}>
          {statusLabel[doc.status]}
        </span>
        {doc.status === 'needed' && (
          <button
            className="text-[10px] px-2 py-0.5 rounded bg-blue-700/40 text-blue-300 hover:bg-blue-700/60 transition-colors flex items-center gap-1"
            onClick={() => {/* file picker */}}
          >
            <Upload size={10} />
            Ladda upp
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Step row ─────────────────────────────────────────────────────────────────
function StepRow({ step }: { step: VisaStep }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-gray-800/50 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 py-3 text-left hover:bg-gray-800/30 transition-colors px-1 rounded"
      >
        {stepStatusIcon(step.status)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${step.status === 'done' ? 'text-gray-500 line-through' : 'text-white'}`}>
              {step.title}
            </span>
            <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{step.phase}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-gray-500">@{step.owner}</span>
            <span className="text-xs text-gray-600">~{step.est_days}d</span>
            {step.cost_usd ? <span className="text-xs text-gray-600">${step.cost_usd}</span> : null}
            {step.blocker && <span className="text-xs text-red-400">Blockad: {step.blocker}</span>}
          </div>
        </div>
        {step.documents.length > 0 && (
          open
            ? <ChevronUp size={14} className="text-gray-500 shrink-0" />
            : <ChevronDown size={14} className="text-gray-500 shrink-0" />
        )}
      </button>

      {open && step.documents.length > 0 && (
        <div className="mb-2">
          {step.documents.map(d => <DocRow key={d.id} doc={d} />)}
          {step.notes && (
            <p className="pl-6 text-xs text-gray-600 italic py-1">{step.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── PRO Agent Brief Modal ────────────────────────────────────────────────────
function ProBriefModal({ app, onClose }: { app: VisaApplication; onClose: () => void }) {
  const readyDocs = app.steps.flatMap(s => s.documents).filter(d => d.status === 'ready' || d.status === 'approved')
  const missingDocs = app.steps.flatMap(s => s.documents).filter(d => d.required && d.status === 'needed')

  const brief = `# PRO-agent Brief — ${app.person_name}
Genererad: ${new Date().toISOString().slice(0, 10)}

## Personuppgifter
- **Namn:** ${app.person_name}
- **Nationalitet:** Svensk
- **Visum-typ:** ${VISA_TYPE_LABEL[app.visa_type]}
- **Land:** ${app.country}
- **Måldag:** ${app.target_date}

## Ansökan status
- **Status:** ${app.status}
- **Steg klara:** ${stepsDone(app)}/${app.steps.length}
${app.pro_agent ? `- **PRO-agent:** ${app.pro_agent}` : ''}

## Klara dokument (${readyDocs.length})
${readyDocs.map(d => `- ✅ ${d.name}`).join('\n') || '- Inga dokument klara ännu'}

## Dokument som saknas (${missingDocs.length})
${missingDocs.map(d => `- ❌ ${d.name}${d.notes ? ` (${d.notes})` : ''}`).join('\n') || '- Alla dokument klara'}

## Process-steg
${app.steps.map((s, i) => `${i + 1}. [${s.status === 'done' ? 'x' : ' '}] **${s.title}** — ${s.est_days}d${s.cost_usd ? ` · $${s.cost_usd}` : ''}`).join('\n')}

## Noteringar
${app.notes}

---
*Genererad av Wavult OS · ${new Date().toLocaleDateString('sv-SE')}*
`

  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(brief)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-white font-semibold text-sm">PRO-agent Brief — {app.person_name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>
        <pre className="flex-1 overflow-y-auto p-5 text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
          {brief}
        </pre>
        <div className="flex items-center gap-3 p-5 border-t border-gray-800">
          <button
            onClick={copy}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              copied ? 'bg-emerald-700 text-emerald-100' : 'bg-blue-700 hover:bg-blue-600 text-white'
            }`}
          >
            <Copy size={14} />
            {copied ? 'Kopierad!' : 'Kopiera'}
          </button>
          <a
            href={`mailto:${app.pro_agent?.match(/[\w.]+@[\w.]+/)?.[0] ?? ''}?subject=Visa Brief — ${app.person_name}&body=${encodeURIComponent(brief)}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium transition-colors"
          >
            <Mail size={14} />
            Skicka via mail
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Application Card ─────────────────────────────────────────────────────────
function AppCard({ app }: { app: VisaApplication }) {
  const [expanded, setExpanded] = useState(false)
  const [briefApp, setBriefApp] = useState<VisaApplication | null>(null)

  const done  = stepsDone(app)
  const total = app.steps.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0
  const next  = nextTodo(app)
  const days  = app.target_date ? daysUntil(app.target_date) : null
  const sc    = statusConfig(app.status)
  const missing = missingDocsCount(app)

  return (
    <>
      {briefApp && <ProBriefModal app={briefApp} onClose={() => setBriefApp(null)} />}

      <div className={`bg-gray-900 border rounded-xl transition-all ${expanded ? 'border-blue-700/50' : 'border-gray-800'}`}>
        {/* Card header */}
        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full ${PERSON_COLOR[app.person_id] ?? 'bg-gray-700'} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
              {PERSON_INITIALS[app.person_id] ?? app.person_name.slice(0, 2).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-semibold text-sm">{app.person_name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 font-medium">
                  {VISA_TYPE_LABEL[app.visa_type]}
                </span>
                <span className="text-base" title={app.country}>{COUNTRY_FLAG[app.country] ?? '🌐'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                  {sc.label}
                </span>
              </div>

              {/* Progress */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>{done}/{total} steg klara</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Next step + deadline */}
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {next && (
                  <span className="text-xs text-gray-400">
                    Nästa: <span className="text-blue-400">{next.title}</span>
                  </span>
                )}
                {days !== null && (
                  <span className={`text-xs flex items-center gap-1 ${days < 14 ? 'text-red-400' : 'text-gray-500'}`}>
                    <Clock size={11} />
                    {days < 0 ? `${Math.abs(days)}d sedan` : `om ${days}d`}
                  </span>
                )}
                {missing > 0 && (
                  <span className="text-xs text-orange-400 flex items-center gap-1">
                    <AlertTriangle size={11} />
                    {missing} dok saknas
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <button
                onClick={() => setBriefApp(app)}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors flex items-center gap-1.5"
              >
                <FileText size={12} />
                PRO-brief
              </button>
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-700/30 hover:bg-blue-700/50 text-blue-300 transition-colors flex items-center gap-1.5"
              >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {expanded ? 'Dölj' : 'Visa detaljer'}
              </button>
            </div>
          </div>
        </div>

        {/* Expanded step tracker */}
        {expanded && (
          <div className="border-t border-gray-800 px-5 py-4">
            {app.pro_agent && (
              <div className="mb-4 flex items-center gap-2 text-xs text-gray-500 bg-gray-800/50 rounded-lg px-3 py-2">
                <Users size={12} className="text-blue-400" />
                PRO-agent: <span className="text-blue-400">{app.pro_agent}</span>
              </div>
            )}
            {app.notes && (
              <p className="text-xs text-gray-500 italic mb-4">{app.notes}</p>
            )}
            <div className="space-y-0.5">
              {app.steps.map(step => (
                <StepRow key={step.id} step={step} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function VisaHub() {
  const [filter, setFilter] = useState<FilterKey>('all')

  const filtered = VISA_APPLICATIONS.filter(app => {
    if (filter === 'UAE')      return app.country === 'UAE'
    if (filter === 'TH')       return app.country === 'TH'
    if (filter === 'active')   return app.status !== 'approved' && app.status !== 'rejected'
    if (filter === 'approved') return app.status === 'approved'
    return true
  })

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all',      label: `Alla (${VISA_APPLICATIONS.length})` },
    { key: 'UAE',      label: '🇦🇪 UAE' },
    { key: 'TH',       label: '🇹🇭 Thailand' },
    { key: 'active',   label: 'Aktiva' },
    { key: 'approved', label: 'Godkända' },
  ]

  // Thailand deadline alert
  const thDays = daysUntil('2026-04-11')

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* [A] Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Globe size={22} className="text-blue-400" />
              Visa & Resedokument
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Spåra ansökningar, dokument och deadlines för hela teamet
            </p>
          </div>
          <div className="text-xs text-gray-600 flex items-center gap-1.5">
            <Users size={13} />
            {[...new Set(VISA_APPLICATIONS.map(a => a.person_id))].length} teammedlemmar
          </div>
        </div>

        {/* Thailand urgent alert */}
        {thDays >= 0 && thDays < 30 && (
          <div className="rounded-xl border border-yellow-500/40 bg-yellow-950/30 px-5 py-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-yellow-400 shrink-0" />
            <div>
              <p className="text-yellow-300 font-semibold text-sm">
                🇹🇭 Thailand workcamp — {thDays} dagar kvar (11 april)
              </p>
              <p className="text-yellow-400/70 text-xs mt-0.5">
                Svenska medborgare: visumfritt 30 dagar. Kontrollera pass + boka returresa.
              </p>
            </div>
          </div>
        )}

        {/* TDAC — Thailand Digital Arrival Card alert */}
        {thDays >= 0 && thDays <= 10 && (
          <div className="rounded-xl border border-red-500/50 bg-red-950/30 px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-red-300 font-semibold text-sm">
                  ⚠️ TDAC krävs — Thailand Digital Arrival Card
                </p>
                <p className="text-red-400/80 text-xs mt-1 leading-relaxed">
                  Obligatorisk sedan 1 maj 2025. Ersätter TM6-pappersblanketten. <strong>Måste fyllas i max 72h före ankomst</strong> — alltså senast <strong>8 april kl 23:59</strong> för inresa 11 april.
                </p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-900/60 rounded-lg p-2.5 space-y-1">
                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Officiell sajt (gratis)</p>
                    <a
                      href="https://tdac.immigration.go.th"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors font-mono"
                    >
                      tdac.immigration.go.th →
                    </a>
                  </div>
                  <div className="bg-gray-900/60 rounded-lg p-2.5 space-y-1">
                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Krävs i formuläret</p>
                    <p className="text-gray-300 text-[11px]">Pass · Personuppgifter · Ekonomisk info · Resplan · Boende · Hälsostatus</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 bg-amber-900/30 rounded-lg px-3 py-1.5">
                  <AlertTriangle size={11} className="text-amber-400 shrink-0" />
                  <p className="text-amber-400/90 text-[11px]">
                    Bluffesidor tar betalt och stjäl passdata. Använd <span className="font-semibold">BARA</span> den officiella URL:en ovan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TDAC info banner — om mer än 10 dagar kvar men reser till Thailand */}
        {thDays > 10 && thDays < 30 && (
          <div className="rounded-xl border border-blue-800/40 bg-blue-950/20 px-5 py-3 flex items-start gap-3">
            <Globe size={15} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-300 text-xs font-medium">
                TDAC — Thailand Digital Arrival Card krävs (sedan maj 2025)
              </p>
              <p className="text-blue-400/60 text-[11px] mt-0.5">
                Fyll i max 72h före ankomst på <span className="font-mono">tdac.immigration.go.th</span> (gratis, officiell sajt). Ersätter TM6-blanketten.
              </p>
            </div>
          </div>
        )}

        {/* [B] Stats */}
        <StatsRow apps={VISA_APPLICATIONS} />

        {/* [C] Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                filter === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* [D+E] Application Cards */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-sm">Inga ansökningar matchar filtret</div>
          ) : (
            filtered.map(app => <AppCard key={app.id} app={app} />)
          )}
        </div>

        {/* Footer note */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <p className="text-xs text-gray-600 flex items-center gap-2">
            <CheckCircle2 size={12} className="text-blue-600" />
            UAE: DIFC/GDRFA har inga publika API:er — all inlämning via PRO-agent (Virtuzone). Thailand: TDAC fylls i manuellt på tdac.immigration.go.th (gratis, obligatorisk sedan maj 2025).
          </p>
        </div>

      </div>
    </div>
  )
}
