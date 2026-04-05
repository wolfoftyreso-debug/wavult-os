// ─── JurisdictionView — Legal Boundary Intelligence ──────────────────────────
// Filosofi: Vi opererar på EXAKT 100% av juridiska gränsen.
// Varje marknad, varje regulation — optimalpunkten är definierad och känd.

import { useState, useEffect } from 'react'

const API = '/api'

// ─── Typer ────────────────────────────────────────────────────────────────────
interface Jurisdiction {
  id: string
  country_code: string
  country_name: string
  region: string
  status: 'active' | 'planned' | 'restricted' | 'exited'
  primary_products: string[]
  legal_entity: string
  regulation_count: number
  rule_count: number
  gap_count: number
  compliant_count: number
  in_progress_count: number
  open_events: number
  entry_date?: string
  planned_entry?: string
  notes?: string
}

interface Regulation {
  id: string
  regulation_code: string
  regulation_name: string
  category: string
  compliance_level: string
  boundary_description: string
  optimal_point: string
  red_lines: string
  our_status: string
  compliance_notes?: string
  responsible_person: string
  source_url?: string
  next_review_date?: string
}

interface ProductRule {
  id: string
  product: string
  rule_category: string
  rule_title: string
  rule_description: string
  optimal_operation: string
  hard_limit: string
  current_practice?: string
  gap_to_optimal?: string
  status: string
  responsible_person: string
}

interface JurisdictionDetail extends Omit<Jurisdiction, "open_events"> {
  regulations: Regulation[]
  product_rules: ProductRule[]
  open_events: any[]
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  cream: '#F5F0E8',
  navy: '#0A3D62',
  gold: '#E8B84B',
  red: '#C0392B',
  green: '#1A7A4A',
  amber: '#D97706',
  blue: '#1D4ED8',
  muted: '#6B7280',
  surface: '#FFFFFF',
  border: '#E2D9CC',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const COUNTRY_FLAGS: Record<string, string> = {
  SE: '🇸🇪', AE: '🇦🇪', LT: '🇱🇹', US: '🇺🇸', NL: '🇳🇱', TH: '🇹🇭',
}

const STATUS_CONFIG = {
  active:     { label: 'Aktiv',    color: C.green,  bg: '#1A7A4A18' },
  planned:    { label: 'Planerad', color: C.amber,  bg: '#D9770618' },
  restricted: { label: 'Begränsad', color: C.red,   bg: '#C0392B18' },
  exited:     { label: 'Avvecklad', color: C.muted, bg: '#6B728018' },
}

const COMPLIANCE_STATUS = {
  compliant:    { label: 'Compliant', color: C.green  },
  in_progress:  { label: 'Pågår',     color: C.amber  },
  gap:          { label: 'GAP',       color: C.red    },
  analyzing:    { label: 'Analyseras', color: C.blue  },
  not_applicable: { label: 'N/A',     color: C.muted  },
}

const CATEGORY_LABELS: Record<string, string> = {
  data_privacy:    '🔐 Dataskydd',
  tax:             '💰 Skatt',
  labor:           '👷 Arbetsrätt',
  financial:       '🏦 Finansiell',
  sector_specific: '⚙️ Sektorsspecifik',
  competition:     '⚖️ Konkurrensrätt',
}

const PRODUCT_COLORS: Record<string, string> = {
  quixzoom:    '#7C3AED',
  landvex:     '#0369A1',
  quixom_ads:  '#D97706',
  wavult_os:   '#0A3D62',
}

function Badge({ label, color, bg }: { label: string; color: string; bg?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      color, background: bg || `${color}18`, letterSpacing: '0.02em',
    }}>
      {label}
    </span>
  )
}

function ProductTag({ product }: { product: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 3,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
      background: `${PRODUCT_COLORS[product] || C.muted}20`,
      color: PRODUCT_COLORS[product] || C.muted,
      textTransform: 'uppercase',
    }}>
      {product}
    </span>
  )
}

// ─── Jurisdiction Card ────────────────────────────────────────────────────────
function JurisdictionCard({
  j, selected, onClick,
}: {
  j: Jurisdiction; selected: boolean; onClick: () => void
}) {
  const statusCfg = STATUS_CONFIG[j.status] || STATUS_CONFIG.planned
  const hasGaps = j.gap_count > 0
  const hasEvents = j.open_events > 0

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? C.navy : C.surface,
        border: `2px solid ${selected ? C.gold : hasGaps ? C.red : C.border}`,
        borderRadius: 10, padding: '16px 18px', cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: selected ? `0 4px 20px ${C.navy}40` : '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 28 }}>{COUNTRY_FLAGS[j.country_code] || '🌍'}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 14, fontWeight: 700,
            color: selected ? C.cream : C.navy,
            lineHeight: 1.2,
          }}>
            {j.country_name}
          </div>
          <div style={{ fontSize: 11, color: selected ? `${C.cream}99` : C.muted, marginTop: 1 }}>
            {j.region} · {j.country_code}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <Badge label={statusCfg.label} color={selected ? C.gold : statusCfg.color} />
          {hasGaps && <Badge label={`${j.gap_count} GAP`} color={C.red} />}
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 6, marginBottom: 10,
      }}>
        {[
          { label: 'Regelverk', val: j.regulation_count },
          { label: 'Regler', val: j.rule_count },
          { label: 'Events', val: j.open_events },
        ].map(({ label, val }) => (
          <div key={label} style={{
            background: selected ? 'rgba(255,255,255,0.08)' : C.cream,
            borderRadius: 6, padding: '6px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: selected ? C.gold : C.navy }}>{val}</div>
            <div style={{ fontSize: 9, color: selected ? `${C.cream}88` : C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Products */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {(j.primary_products || []).map(p => (
          <ProductTag key={p} product={p} />
        ))}
      </div>

      {/* Legal entity */}
      <div style={{
        marginTop: 8, fontSize: 10, color: selected ? `${C.cream}77` : C.muted,
        fontStyle: 'italic',
      }}>
        {j.legal_entity}
      </div>
    </div>
  )
}

// ─── Regulation Row ───────────────────────────────────────────────────────────
function RegulationRow({ reg }: { reg: Regulation }) {
  const [expanded, setExpanded] = useState(false)
  const statusCfg = COMPLIANCE_STATUS[reg.our_status as keyof typeof COMPLIANCE_STATUS]
    || COMPLIANCE_STATUS.analyzing

  return (
    <div style={{
      border: `1px solid ${reg.our_status === 'gap' ? C.red : C.border}`,
      borderRadius: 8, marginBottom: 8,
      background: reg.our_status === 'gap' ? '#C0392B06' : C.surface,
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', cursor: 'pointer',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{reg.regulation_name}</span>
            <Badge label={statusCfg.label} color={statusCfg.color} />
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>
            {CATEGORY_LABELS[reg.category] || reg.category} · {reg.compliance_level}
            {reg.responsible_person && ` · @${reg.responsible_person}`}
          </div>
        </div>
        <span style={{ fontSize: 12, color: C.muted, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
      </div>

      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.border}` }}>
          {/* Gräns */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              📋 Juridisk gräns
            </div>
            <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{reg.boundary_description}</div>
          </div>

          {/* Optimalpunkt — 100% av gränsen */}
          {reg.optimal_point && (
            <div style={{ marginTop: 12, background: `${C.gold}12`, borderLeft: `3px solid ${C.gold}`, padding: '10px 12px', borderRadius: '0 6px 6px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                ⚡ Vår position — 100% av gränsen
              </div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>{reg.optimal_point}</div>
            </div>
          )}

          {/* Red lines */}
          {reg.red_lines && (
            <div style={{ marginTop: 10, background: `${C.red}08`, borderLeft: `3px solid ${C.red}`, padding: '10px 12px', borderRadius: '0 6px 6px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.red, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                🚫 Red Lines — passeras aldrig
              </div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{reg.red_lines}</div>
            </div>
          )}

          {/* Notes + source */}
          {reg.compliance_notes && (
            <div style={{ marginTop: 10, fontSize: 12, color: C.muted, fontStyle: 'italic' }}>{reg.compliance_notes}</div>
          )}
          {reg.source_url && (
            <div style={{ marginTop: 8 }}>
              <a href={reg.source_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.blue }}>
                → Lagtext / källa
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Product Rule Row ─────────────────────────────────────────────────────────
function ProductRuleRow({ rule }: { rule: ProductRule }) {
  const [expanded, setExpanded] = useState(false)
  const statusCfg = COMPLIANCE_STATUS[rule.status as keyof typeof COMPLIANCE_STATUS] || COMPLIANCE_STATUS.analyzing

  return (
    <div style={{
      border: `1px solid ${rule.status === 'gap' ? C.red : C.border}`,
      borderRadius: 8, marginBottom: 8,
      background: rule.status === 'gap' ? '#C0392B06' : C.surface,
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <ProductTag product={rule.product} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{rule.rule_title}</span>
            <Badge label={statusCfg.label} color={statusCfg.color} />
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>{rule.rule_category}</div>
        </div>
        <span style={{ fontSize: 12, color: C.muted, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
      </div>

      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ marginTop: 12, fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{rule.rule_description}</div>

          {rule.optimal_operation && (
            <div style={{ marginTop: 10, background: `${C.gold}12`, borderLeft: `3px solid ${C.gold}`, padding: '10px 12px', borderRadius: '0 6px 6px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                ⚡ Operation vid 100% av gränsen
              </div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>{rule.optimal_operation}</div>
            </div>
          )}

          {rule.hard_limit && (
            <div style={{ marginTop: 10, background: `${C.red}08`, borderLeft: `3px solid ${C.red}`, padding: '10px 12px', borderRadius: '0 6px 6px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.red, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                🚫 Hard limit
              </div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{rule.hard_limit}</div>
            </div>
          )}

          {rule.gap_to_optimal && (
            <div style={{ marginTop: 10, background: `${C.amber}10`, borderLeft: `3px solid ${C.amber}`, padding: '10px 12px', borderRadius: '0 6px 6px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                🔧 Gap till optimum
              </div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{rule.gap_to_optimal}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function JurisdictionDetail({
  code, activeProduct,
}: {
  code: string; activeProduct: string | null
}) {
  const [detail, setDetail] = useState<JurisdictionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'regulations' | 'product_rules' | 'events'>('regulations')

  useEffect(() => {
    setLoading(true)
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 8000)
    fetch(`${API}/v1/jurisdiction/${code}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => { setDetail(data); setLoading(false) })
      .catch(() => setLoading(false))
      .finally(() => clearTimeout(t))
    return () => { controller.abort(); clearTimeout(t) }
  }, [code])

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Laddar jurisdiktionsdata…</div>
  )
  if (!detail) return (
    <div style={{ padding: 40, textAlign: 'center', color: C.red }}>Kunde inte ladda data.</div>
  )

  const regs = activeProduct
    ? detail.regulations.filter(r => {
        const applies = (r as any).applies_to as any
        if (!applies || !Array.isArray(applies)) return true
        return applies.includes(activeProduct) || applies.includes('all')
      })
    : detail.regulations

  const rules = activeProduct
    ? detail.product_rules.filter(r => r.product === activeProduct)
    : detail.product_rules

  const statusCfg = STATUS_CONFIG[detail.status] || STATUS_CONFIG.planned

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 40 }}>{COUNTRY_FLAGS[detail.country_code] || '🌍'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{detail.country_name}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {detail.region} · {detail.legal_entity}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Badge label={statusCfg.label} color={statusCfg.color} bg={statusCfg.bg} />
            {detail.gap_count > 0 && (
              <Badge label={`${detail.gap_count} GAP`} color={C.red} bg={`${C.red}18`} />
            )}
            {detail.open_events?.length > 0 && (
              <Badge label={`${detail.open_events?.length ?? 0} events`} color={C.amber} bg={`${C.amber}18`} />
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
          {[
            { label: 'Regelverk', val: detail.regulation_count },
            { label: 'Compliant', val: detail.compliant_count, color: C.green },
            { label: 'Pågår', val: detail.in_progress_count, color: C.amber },
            { label: 'GAP', val: detail.gap_count, color: C.red },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ background: C.cream, borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: color || C.navy }}>{val ?? 0}</div>
              <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        {([
          ['regulations', `Regelverk (${regs.length})`],
          ['product_rules', `Produktregler (${rules.length})`],
          ['events', `Events (${detail.open_events.length})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === key ? 700 : 400,
              color: tab === key ? C.navy : C.muted,
              borderBottom: `2px solid ${tab === key ? C.gold : 'transparent'}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: C.cream }}>
        {tab === 'regulations' && (
          regs.length === 0
            ? <div style={{ color: C.muted, textAlign: 'center', padding: 30 }}>Inga regelverk funna.</div>
            : regs.map(r => <RegulationRow key={r.id} reg={r} />)
        )}
        {tab === 'product_rules' && (
          rules.length === 0
            ? <div style={{ color: C.muted, textAlign: 'center', padding: 30 }}>Inga produktregler funna.</div>
            : rules.map(r => <ProductRuleRow key={r.id} rule={r} />)
        )}
        {tab === 'events' && (
          detail.open_events.length === 0
            ? <div style={{ color: C.muted, textAlign: 'center', padding: 30 }}>Inga öppna händelser.</div>
            : detail.open_events.map((e: any) => (
                <div key={e.id} style={{
                  background: C.surface, border: `1px solid ${e.impact_level === 'critical' ? C.red : C.border}`,
                  borderRadius: 8, padding: '12px 14px', marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Badge
                      label={e.impact_level}
                      color={e.impact_level === 'critical' ? C.red : e.impact_level === 'high' ? C.amber : C.blue}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{e.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{e.description}</div>
                  {e.effective_date && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                      Deadline: {new Date(e.effective_date).toLocaleDateString('sv-SE')} · @{e.action_owner}
                    </div>
                  )}
                  {e.action_required && (
                    <div style={{ marginTop: 8, fontSize: 12, color: C.navy, fontWeight: 600 }}>
                      → {e.action_required}
                    </div>
                  )}
                </div>
              ))
        )}
      </div>
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────
export function JurisdictionView() {
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([])
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeProduct, setActiveProduct] = useState<string | null>(null)

  const PRODUCTS = ['quixzoom', 'landvex', 'quixom_ads', 'wavult_os']

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    fetch(`${API}/v1/jurisdiction`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        setJurisdictions(data)
        if (data.length > 0) setSelectedCode(data[0].country_code)
      })
      .catch(() => {}) // empty state
      .finally(() => { clearTimeout(timeout); setLoading(false) })
    return () => { controller.abort(); clearTimeout(timeout) }
  }, [])

  const totalGaps = jurisdictions.reduce((s, j) => s + (j.gap_count || 0), 0)
  const totalRegs = jurisdictions.reduce((s, j) => s + (j.regulation_count || 0), 0)
  const activeMarkets = jurisdictions.filter(j => j.status === 'active').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.cream, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Page Header */}
      <div style={{ padding: '20px 28px', background: C.navy, borderBottom: `3px solid ${C.gold}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.cream, letterSpacing: '-0.02em' }}>
              ⚖️ Legal Boundary Intelligence
            </div>
            <div style={{ fontSize: 12, color: `${C.cream}88`, marginTop: 2 }}>
              Vi opererar på <span style={{ color: C.gold, fontWeight: 700 }}>exakt 100%</span> av den juridiska gränsen — inte 99%, inte "nära". Kirurgisk precision.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Aktiva marknader', val: activeMarkets, color: C.green },
              { label: 'Regelverk totalt', val: totalRegs },
              { label: 'Gaps', val: totalGaps, color: totalGaps > 0 ? C.red : C.green },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: color || C.gold }}>{val}</div>
                <div style={{ fontSize: 9, color: `${C.cream}77`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Product filter */}
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          <button
            onClick={() => setActiveProduct(null)}
            style={{
              padding: '4px 12px', borderRadius: 20, border: `1px solid ${activeProduct === null ? C.gold : `${C.cream}40`}`,
              background: activeProduct === null ? C.gold : 'transparent',
              color: activeProduct === null ? C.navy : C.cream,
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Alla produkter
          </button>
          {PRODUCTS.map(p => (
            <button
              key={p}
              onClick={() => setActiveProduct(p === activeProduct ? null : p)}
              style={{
                padding: '4px 12px', borderRadius: 20,
                border: `1px solid ${activeProduct === p ? PRODUCT_COLORS[p] : `${C.cream}40`}`,
                background: activeProduct === p ? `${PRODUCT_COLORS[p]}30` : 'transparent',
                color: activeProduct === p ? PRODUCT_COLORS[p] : `${C.cream}99`,
                fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
          Laddar jurisdiktioner…
        </div>
      ) : (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', overflow: 'hidden' }}>
          {/* Sidebar — jurisdiction list */}
          <div style={{ overflowY: 'auto', padding: 16, borderRight: `1px solid ${C.border}`, background: C.cream }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              {jurisdictions.length} jurisdiktioner
            </div>
            {jurisdictions
              .filter(j => !activeProduct || (j.primary_products || []).includes(activeProduct) || j.status === 'active')
              .map(j => (
                <JurisdictionCard
                  key={j.country_code}
                  j={j}
                  selected={selectedCode === j.country_code}
                  onClick={() => setSelectedCode(j.country_code)}
                />
              ))
            }
          </div>

          {/* Detail panel */}
          <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {selectedCode ? (
              <JurisdictionDetail code={selectedCode} activeProduct={activeProduct} />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
                Välj en jurisdiktion för att se fullständig regulatorisk karta.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
