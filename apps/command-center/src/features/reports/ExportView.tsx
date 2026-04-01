import { useState } from 'react'
import { ENTITY_FINANCIALS } from './data'

type ReportType = 'executive-summary' | 'financial' | 'sales' | 'operational' | 'full-pack'
type PeriodType = 'month' | 'quarter' | 'ytd' | 'year'
type FormatType = 'pdf' | 'xlsx' | 'csv'

interface ReportOption {
  id: ReportType
  label: string
  icon: string
  description: string
  pages: string
}

const REPORT_OPTIONS: ReportOption[] = [
  { id: 'executive-summary', label: 'Executive Summary', icon: '📊', description: 'CEO/Chairman-vy med alla nyckeltal, kritiska items & milstolpar.', pages: '1 sida' },
  { id: 'financial',         label: 'Finansrapport',      icon: '💰', description: 'Resultaträkning, balansräkning per entitet + konsoliderat.',  pages: '4–8 sidor' },
  { id: 'sales',             label: 'Säljrapport',         icon: '🎯', description: 'Pipeline, win rate, ARR per produkt, aktiviteter per säljare.', pages: '3–5 sidor' },
  { id: 'operational',       label: 'Operativ rapport',    icon: '⚙️', description: 'System-uptime, deploys, zoomers, API-felfrekvens.',             pages: '2–3 sidor' },
  { id: 'full-pack',         label: 'Komplett rapport',    icon: '📦', description: 'Alla ovanstående kombinerade till ett dokument.',              pages: '10–20 sidor' },
]

const PERIOD_OPTIONS: Array<{ id: PeriodType; label: string }> = [
  { id: 'month',   label: 'Denna månad (mars 2026)' },
  { id: 'quarter', label: 'Q1 2026 (jan–mar)' },
  { id: 'ytd',     label: 'YTD 2026 (jan–mars)' },
  { id: 'year',    label: 'Helår 2025' },
]

const FORMAT_OPTIONS: Array<{ id: FormatType; label: string; icon: string; desc: string }> = [
  { id: 'pdf',  label: 'PDF',   icon: '📄', desc: 'Presentationsfärdig' },
  { id: 'xlsx', label: 'Excel', icon: '📊', desc: 'Redigerbar data' },
  { id: 'csv',  label: 'CSV',   icon: '🗂️', desc: 'Rådata export' },
]

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function ExportView() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('executive-summary')
  const [selectedPeriod, setSelectedPeriod]   = useState<PeriodType>('quarter')
  const [selectedEntity, setSelectedEntity]   = useState<string>('wavult-group')
  const [selectedFormat, setSelectedFormat]   = useState<FormatType>('pdf')
  const [generating, setGenerating]           = useState(false)
  const [generated, setGenerated]             = useState(false)

  function handleGenerate() {
    setGenerating(true)
    setGenerated(false)
    setTimeout(() => {
      setGenerating(false)
      setGenerated(true)
    }, 1200)
  }

  function handleDownload() {
    // Generate report content as HTML then download
    const report = REPORT_OPTIONS.find(r => r.id === selectedReport)!
    const period = PERIOD_OPTIONS.find(p => p.id === selectedPeriod)!
    const entity = ENTITY_FINANCIALS.find(e => e.id === selectedEntity) ?? ENTITY_FINANCIALS[0]
    const ts = new Date().toLocaleDateString('sv-SE')
    
    const content = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>${report.label} — ${period.label}</title>
<style>
  body { font-family: Inter, Arial, sans-serif; max-width: 900px; margin: 40px auto; color: #0F172A; font-size: 13px; line-height: 1.6; }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .meta { color: #64748B; font-size: 12px; margin-bottom: 32px; }
  .section { margin-bottom: 32px; }
  .section-title { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #94A3B8; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 8px 12px; background: #F8FAFC; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748B; border-bottom: 2px solid #E2E8F0; }
  td { padding: 10px 12px; border-bottom: 1px solid #F1F5F9; }
  .num { text-align: right; font-family: monospace; }
  .pos { color: #16A34A; }
  .neg { color: #DC2626; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .kpi { border: 1px solid #E2E8F0; border-radius: 4px; padding: 16px; }
  .kpi-n { font-size: 24px; font-weight: 800; }
  .kpi-l { font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.1em; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #E2E8F0; color: #94A3B8; font-size: 11px; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>${report.label}</h1>
<div class="meta">Wavult Group · ${entity.name} · ${period.label} · Genererad ${ts}</div>

<div class="section">
  <div class="section-title">Nyckeltal</div>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-n pos">2.39 MSEK</div><div class="kpi-l">MRR</div></div>
    <div class="kpi"><div class="kpi-n">9/9</div><div class="kpi-l">Services live</div></div>
    <div class="kpi"><div class="kpi-n pos">13</div><div class="kpi-l">Sajter live</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Ventures</div>
  <table>
    <thead><tr><th>Produkt</th><th>Status</th><th class="num">MRR (SEK)</th><th class="num">YTD</th></tr></thead>
    <tbody>
      <tr><td>quiXzoom</td><td>Pre-launch</td><td class="num">—</td><td class="num">—</td></tr>
      <tr><td>LandveX</td><td>Pre-launch</td><td class="num">—</td><td class="num">—</td></tr>
      <tr><td>UAPIX</td><td>Live</td><td class="num">—</td><td class="num">—</td></tr>
      <tr><td>Apifly</td><td>Live</td><td class="num">—</td><td class="num">—</td></tr>
    </tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">Infrastruktur</div>
  <table>
    <thead><tr><th>Service</th><th>Status</th><th>Uptime</th><th>Version</th></tr></thead>
    <tbody>
      <tr><td>Wavult OS API</td><td class="pos">✅ Live</td><td>99.9%</td><td>hypbit-api:60</td></tr>
      <tr><td>quiXzoom API</td><td class="pos">✅ Live</td><td>99.9%</td><td>quixzoom-api:6</td></tr>
      <tr><td>Kafka</td><td class="pos">✅ Live</td><td>99.9%</td><td>confluent-7.6.1</td></tr>
      <tr><td>Identity Core</td><td class="pos">✅ Live</td><td>99.9%</td><td>identity-core:3</td></tr>
      <tr><td>n8n</td><td class="pos">✅ Live</td><td>99.9%</td><td>n8n:8</td></tr>
    </tbody>
  </table>
</div>

<div class="footer">Wavult Group · Konfidentiellt · Genererad av Wavult OS · ${ts}</div>
</body>
</html>`

    if (selectedFormat === 'pdf') {
      // Open print dialog for PDF save
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(content)
        win.document.close()
        setTimeout(() => { win.print() }, 500)
      }
    } else {
      // Download as HTML or CSV
      const blob = new Blob([content], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const report  = REPORT_OPTIONS.find(r => r.id === selectedReport)!
  const period  = PERIOD_OPTIONS.find(p => p.id === selectedPeriod)!
  const entity  = ENTITY_FINANCIALS.find(e => e.id === selectedEntity) ?? ENTITY_FINANCIALS[0]
  const filename = `Wavult_${report.label.replace(/\s+/g, '_')}_${period.label.split(' ')[0].replace(/[^A-Za-z0-9]/g, '')}.${selectedFormat}`

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Left: Configuration */}
        <div className="space-y-5">

          {/* Report type */}
          <div>
            <p className="text-xs text-gray-9000 font-mono uppercase tracking-widest mb-2">1. Välj rapport</p>
            <div className="space-y-2">
              {REPORT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedReport(opt.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    selectedReport === opt.id
                      ? 'border-[#6C63FF]/50 bg-[#6C63FF]/10'
                      : 'border-surface-border bg-muted/30 hover:border-surface-border hover:bg-muted/30'
                  }`}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${selectedReport === opt.id ? 'text-gray-900' : 'text-gray-600'}`}>
                        {opt.label}
                      </span>
                      <span className="text-[9px] text-gray-9000 font-mono">{opt.pages}</span>
                    </div>
                    <p className="text-xs text-gray-9000 mt-0.5 leading-snug">{opt.description}</p>
                  </div>
                  {selectedReport === opt.id && (
                    <span className="text-[#6C63FF] flex-shrink-0 mt-1"><CheckIcon /></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div>
            <p className="text-xs text-gray-9000 font-mono uppercase tracking-widest mb-2">2. Period</p>
            <div className="grid grid-cols-2 gap-2">
              {PERIOD_OPTIONS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriod(p.id)}
                  className={`px-3 py-2.5 rounded-lg border text-xs text-left transition-all ${
                    selectedPeriod === p.id
                      ? 'border-[#6C63FF]/50 bg-[#6C63FF]/10 text-gray-900'
                      : 'border-surface-border bg-muted/30 text-gray-9000 hover:text-gray-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Entity */}
          <div>
            <p className="text-xs text-gray-9000 font-mono uppercase tracking-widest mb-2">3. Entitet</p>
            <div className="space-y-1.5">
              {ENTITY_FINANCIALS.map(e => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEntity(e.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-xs transition-all ${
                    selectedEntity === e.id
                      ? 'border-white/[0.15] bg-muted/30 text-gray-900'
                      : 'border-surface-border/50 bg-white/[0.01] text-gray-9000 hover:text-gray-800'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: e.color }} />
                  <span className="flex-1 text-left">{e.name}</span>
                  {selectedEntity === e.id && (
                    <span style={{ color: e.color }}><CheckIcon /></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <p className="text-xs text-gray-9000 font-mono uppercase tracking-widest mb-2">4. Format</p>
            <div className="flex gap-2">
              {FORMAT_OPTIONS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFormat(f.id)}
                  className={`flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-xl border transition-all ${
                    selectedFormat === f.id
                      ? 'border-[#6C63FF]/50 bg-[#6C63FF]/10'
                      : 'border-surface-border bg-muted/30 hover:border-gray-200'
                  }`}
                >
                  <span className="text-xl">{f.icon}</span>
                  <span className={`text-xs font-bold ${selectedFormat === f.id ? 'text-gray-900' : 'text-gray-9000'}`}>{f.label}</span>
                  <span className="text-[9px] text-gray-9000">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Preview & Generate */}
        <div className="space-y-4">

          {/* Preview card */}
          <div>
            <p className="text-xs text-gray-9000 font-mono uppercase tracking-widest mb-2">Förhandsgranskning</p>
            <div className="bg-muted/30 border border-white/[0.07] rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{report.icon}</span>
                <div>
                  <p className="text-[14px] font-bold text-text-primary">{report.label}</p>
                  <p className="text-xs text-gray-9000">{report.pages}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-9000">Entitet</span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: entity.color }} />
                    <span className="text-gray-600">{entity.shortName}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-9000">Period</span>
                  <span className="text-gray-600">{period.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-9000">Format</span>
                  <span className="text-gray-600 uppercase font-mono">{selectedFormat}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-9000">Filnamn</span>
                  <span className="text-gray-9000 font-mono text-[9px] truncate max-w-[180px]">{filename}</span>
                </div>
              </div>

              <div className="pt-1 border-t border-surface-border">
                <p className="text-xs text-gray-9000 leading-relaxed">{report.description}</p>
              </div>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={generated ? handleDownload : handleGenerate}
            disabled={generating}
            className={`w-full py-4 rounded-xl font-bold text-[14px] transition-all flex items-center justify-center gap-2 ${
              generating
                ? 'bg-[#6C63FF]/30 text-[#6C63FF]/60 cursor-not-allowed'
                : generated
                ? 'bg-green-500/20 border border-green-500/30 text-green-700'
                : 'bg-[#6C63FF] hover:bg-[#7C73FF] text-text-primary shadow-lg shadow-[#6C63FF]/30 active:scale-95'
            }`}
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Genererar rapport...
              </>
            ) : generated ? (
              <>
                <span>✅</span>
                Rapport klar — Ladda ned
              </>
            ) : (
              <>
                <span>📥</span>
                Generera rapport
              </>
            )}
          </button>

          {generated && (
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-green-700 text-sm">✅</span>
                <p className="text-xs font-semibold text-green-700">Rapport genererad</p>
              </div>
              <p className="text-xs text-gray-9000">{filename}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setGenerated(false)}
                  className="flex-1 py-2 rounded-lg bg-muted/30 border border-surface-border text-xs text-gray-600 hover:text-text-primary transition-colors"
                >
                  Ny rapport
                </button>
                <button className="flex-1 py-2 rounded-lg bg-muted/30 border border-surface-border text-xs text-gray-600 hover:text-text-primary transition-colors">
                  Schemalägg
                </button>
              </div>
            </div>
          )}

          {/* Scheduled reports hint */}
          <div className="bg-muted/30 border border-surface-border rounded-xl p-4">
            <p className="text-xs text-gray-9000 font-mono uppercase tracking-wider mb-2">Schemalagda rapporter</p>
            <div className="space-y-2">
              {[
                { label: 'Executive Summary', freq: 'Varje måndag 08:00', next: '30 mar' },
                { label: 'Finansrapport Q2',  freq: 'Kvartalsvis',         next: '1 apr' },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#6C63FF] flex-shrink-0" />
                  <span className="flex-1 text-gray-9000">{r.label}</span>
                  <span className="text-gray-9000 font-mono">{r.freq}</span>
                  <span className="text-gray-9000">→ {r.next}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
