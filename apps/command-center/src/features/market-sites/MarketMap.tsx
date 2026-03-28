import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MARKET_SITES, SITE_STATUS_COLOR, PRODUCT_COLOR, getSiteAlerts,
  MarketSite, SiteStatus, ProductType,
} from './data'
import { COMMAND_CHAIN } from '../org-graph/commandChain'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'

// ─── Flag emoji helper ────────────────────────────────────────────────────────

function flagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('')
}

// ─── Product abbreviation ────────────────────────────────────────────────────

const PRODUCT_ABBR: Record<MarketSite['product_type'], string> = {
  'quixzoom':   'QZ',
  'quixom-ads': 'QA',
  'landvex':    'LV',
  'hypbit':     'HB',
}

// ─── KPI bar ─────────────────────────────────────────────────────────────────

function KpiBar({ label, current, target, unit = '' }: {
  label: string
  current: number
  target: number
  unit?: string
}) {
  const pct = target === 0 ? 0 : Math.min(100, Math.round((current / target) * 100))
  const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'
  const displayTarget = unit === '$' ? `$${target.toLocaleString()}` : `${target}${unit}`
  const displayCurrent = unit === '$' ? `$${current.toLocaleString()}` : `${current}${unit}`

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-mono" style={{ color }}>
          {displayCurrent} / {displayTarget}
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ─── Stage pill ───────────────────────────────────────────────────────────────

const STAGE_ORDER: MarketSite['stage'][] = ['planned', 'setup', 'launch', 'scale', 'mature']
const STAGE_LABEL: Record<MarketSite['stage'], string> = {
  planned: 'Planned',
  setup:   'Setup',
  launch:  'Launch',
  scale:   'Scale',
  mature:  'Mature',
}

function StageBadge({ stage }: { stage: MarketSite['stage'] }) {
  const colors: Record<MarketSite['stage'], string> = {
    planned: '#6B7280',
    setup:   '#F59E0B',
    launch:  '#8B5CF6',
    scale:   '#3B82F6',
    mature:  '#10B981',
  }
  const c = colors[stage]
  return (
    <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
      style={{ background: c + '20', color: c }}>
      {STAGE_LABEL[stage]}
    </span>
  )
}

function StatusBadge({ status }: { status: SiteStatus }) {
  const c = SITE_STATUS_COLOR[status]
  return (
    <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
      style={{ background: c + '20', color: c }}>
      {status}
    </span>
  )
}

function ProductBadge({ product }: { product: ProductType }) {
  const c = PRODUCT_COLOR[product]
  return (
    <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
      style={{ background: c + '20', color: c }}>
      {product}
    </span>
  )
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/[0.05] pt-3 pb-3 px-4 space-y-2">
      <p className="text-[9px] font-bold text-gray-700 uppercase tracking-[0.15em]">{label}</p>
      {children}
    </div>
  )
}

// ─── Site Panel ───────────────────────────────────────────────────────────────

function SitePanel({ site, onClose }: { site: MarketSite; onClose: () => void }) {
  const navigate = useNavigate()
  const alerts = getSiteAlerts(site)

  // Responsible person from command chain
  const responsible = COMMAND_CHAIN.find(r => r.id === site.responsible_role_id)

  // Current rollout stage checklist
  const currentStageData = site.rollout.stages.find(s => s.stage === site.stage)
  const nextIncomplete = currentStageData?.checklist.find(c => !c.done)

  // Next action: first alert, or first incomplete checklist item
  const nextActionAlert = alerts[0]
  const nextActionItem = !nextActionAlert ? nextIncomplete : null

  return (
    <div className="w-[340px] flex-shrink-0 flex flex-col h-full overflow-hidden"
      style={{ background: '#09090F', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{flagEmoji(site.countryCode)}</span>
          <span className="text-sm font-semibold text-white">{site.name}</span>
        </div>
        <button onClick={onClose}
          className="text-gray-600 hover:text-gray-300 transition-colors text-sm leading-none">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* 1. SNAPSHOT */}
        <PanelSection label="Snapshot">
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status={site.status} />
            <ProductBadge product={site.product_type} />
            <StageBadge stage={site.stage} />
          </div>
          <button
            onClick={() => navigate('/entities/' + site.entity_id)}
            className="mt-2 text-xs font-mono text-gray-600 hover:text-gray-300 transition-colors flex items-center gap-1">
            Open entity →
          </button>
          <p className="text-xs text-gray-500 leading-relaxed mt-1">{site.strategy.purpose}</p>
        </PanelSection>

        {/* 2. NEXT ACTION */}
        <PanelSection label="Next Action">
          {nextActionAlert ? (
            <div className="rounded-lg px-3 py-2 space-y-1"
              style={{ background: (nextActionAlert.severity === 'critical' ? '#EF4444' : '#F59E0B') + '12',
                       border: `1px solid ${nextActionAlert.severity === 'critical' ? '#EF4444' : '#F59E0B'}30` }}>
              <p className="text-xs font-semibold"
                style={{ color: nextActionAlert.severity === 'critical' ? '#EF4444' : '#F59E0B' }}>
                ⚠ {nextActionAlert.message}
              </p>
              <p className="text-[9px] text-gray-500">{nextActionAlert.action_required}</p>
            </div>
          ) : nextActionItem ? (
            <div className="rounded-lg px-3 py-2 bg-white/[0.03] border border-white/[0.05]">
              <p className="text-xs text-gray-300">☐ {nextActionItem.item}</p>
              <p className="text-[9px] text-gray-600 mt-0.5">Current stage: {STAGE_LABEL[site.stage]}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-600">No actions required</p>
          )}
        </PanelSection>

        {/* 3. KPI PERFORMANCE */}
        <PanelSection label="KPI Performance">
          <div className="space-y-3">
            <KpiBar label="Revenue / mo" current={site.kpis.revenue_current} target={site.kpis.revenue_target} unit="$" />
            <KpiBar label="Leads" current={site.kpis.leads_current} target={site.kpis.leads_target} />
            <KpiBar label="Conversion %" current={site.kpis.conversion_current} target={site.kpis.conversion_target} unit="%" />
            <KpiBar label="Growth MoM %" current={site.kpis.growth_current} target={site.kpis.growth_target} unit="%" />
          </div>
        </PanelSection>

        {/* 4. ROLLOUT STAGE */}
        <PanelSection label="Rollout Stage">
          {/* Stage progression bar */}
          <div className="flex gap-1 items-center">
            {STAGE_ORDER.map((s, i) => {
              const isCurrent = s === site.stage
              const isDone = STAGE_ORDER.indexOf(site.stage) > i
              const stageColor = isDone ? '#10B981' : isCurrent ? '#8B5CF6' : '#374151'
              return (
                <div key={s} className="flex items-center gap-1 flex-1">
                  <div className="flex flex-col items-center gap-0.5 flex-1">
                    <div className="h-1.5 w-full rounded-full transition-all"
                      style={{ background: stageColor }} />
                    <span className="text-[7px] font-mono"
                      style={{ color: isCurrent ? '#8B5CF6' : isDone ? '#10B981' : '#374151' }}>
                      {s.substring(0, 3).toUpperCase()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Current stage checklist */}
          {currentStageData && (
            <div className="mt-2 space-y-1">
              {currentStageData.checklist.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-[9px] mt-0.5" style={{ color: item.done ? '#10B981' : '#6B7280' }}>
                    {item.done ? '✓' : '○'}
                  </span>
                  <span className="text-[9px] leading-relaxed" style={{ color: item.done ? '#6B7280' : '#D1D5DB' }}>
                    {item.item}
                  </span>
                </div>
              ))}
              <p className="text-[8px] text-gray-700 mt-1 font-mono">{currentStageData.kpi_targets}</p>
            </div>
          )}
        </PanelSection>

        {/* 5. MARKETING */}
        <PanelSection label="Marketing">
          {site.marketing.campaigns.length === 0 ? (
            <p className="text-xs text-gray-600">No campaigns yet</p>
          ) : (
            <div className="space-y-2">
              {site.marketing.campaigns.map(campaign => {
                const spendPct = campaign.budget_monthly === 0 ? 0
                  : Math.min(100, Math.round((campaign.spend_to_date / campaign.budget_monthly) * 100))
                const statusColor: Record<string, string> = {
                  active: '#10B981', planned: '#6B7280', paused: '#F59E0B',
                }
                return (
                  <div key={campaign.id} className="rounded-lg px-3 py-2 bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white flex-1 truncate">{campaign.name}</span>
                      <span className="text-[8px] font-bold uppercase px-1 rounded"
                        style={{ background: statusColor[campaign.status] + '20', color: statusColor[campaign.status] }}>
                        {campaign.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-gray-600">
                      <span className="font-mono uppercase">{campaign.channel}</span>
                      <span>{campaign.leads_generated} leads</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[8px] text-gray-700">
                        <span>Spend</span>
                        <span>${campaign.spend_to_date.toLocaleString()} / ${campaign.budget_monthly.toLocaleString()}/mo</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${spendPct}%`, background: spendPct > 90 ? '#EF4444' : '#3B82F6' }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div
            className="flex items-center gap-2 mt-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/campaigns')}
          >
            <span className="text-xs font-mono text-gray-600">⚡</span>
            <span className="text-xs text-gray-500">View in Campaign OS →</span>
          </div>
        </PanelSection>

        {/* 6. OPERATIONS */}
        <PanelSection label="Operations">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Team size</span>
              <span className="text-white font-mono">{site.operations.team_size} people</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Capacity</span>
                <span className="font-mono"
                  style={{ color: site.operations.capacity_pct >= 80 ? '#EF4444' : '#10B981' }}>
                  {site.operations.capacity_pct}%
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                <div className="h-full rounded-full"
                  style={{
                    width: `${site.operations.capacity_pct}%`,
                    background: site.operations.capacity_pct >= 80 ? '#EF4444' : '#10B981',
                  }} />
              </div>
            </div>
            {site.operations.notes && (
              <p className="text-[9px] text-gray-600 leading-relaxed">{site.operations.notes}</p>
            )}
          </div>
        </PanelSection>

        {/* 7. LEGAL */}
        <PanelSection label="Legal">
          <div className="space-y-2">
            <div>
              <p className="text-[9px] text-gray-600">Entity linkage</p>
              <p className="text-xs text-white mt-0.5">{site.legal.entity_linkage}</p>
            </div>
            {site.legal.contracts.length > 0 && (
              <div className="space-y-1">
                {site.legal.contracts.map((contract, idx) => {
                  const contractColors: Record<string, string> = {
                    signed: '#10B981', draft: '#F59E0B', expired: '#EF4444',
                  }
                  return (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <span className="text-[9px] text-gray-400 flex-1 truncate">{contract.name}</span>
                      <span className="text-[8px] font-bold uppercase px-1 rounded flex-shrink-0"
                        style={{ background: contractColors[contract.status] + '20', color: contractColors[contract.status] }}>
                        {contract.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </PanelSection>

        {/* 8. CONNECTIONS */}
        <PanelSection label="Connections">
          <div className="space-y-2">
            {responsible && (
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={{ background: responsible.color + '20', color: responsible.color }}>
                  {responsible.initials}
                </div>
                <div>
                  <p className="text-xs text-white">{responsible.person}</p>
                  <p className="text-[9px] text-gray-600">{responsible.title}</p>
                </div>
              </div>
            )}
            <button
              onClick={() => navigate('/org')}
              className="text-xs font-mono text-gray-600 hover:text-gray-300 transition-colors flex items-center gap-1 mt-1">
              View in Corporate Graph →
            </button>
          </div>
        </PanelSection>

      </div>
    </div>
  )
}

// ─── Schematic World SVG ─────────────────────────────────────────────────────

function WorldSVG({
  sites,
  selectedSite,
  onSelect,
}: {
  sites: MarketSite[]
  selectedSite: MarketSite | null
  onSelect: (site: MarketSite) => void
}) {
  const svgW = 900
  const svgH = 600

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ width: '100%', height: '100%', background: '#07080F', display: 'block' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Pulse animation */}
      <style>{`
        @keyframes pulse-ring {
          0%   { r: 20px; opacity: 0.6; }
          100% { r: 32px; opacity: 0; }
        }
        .pulse-ring {
          animation: pulse-ring 2s ease-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
      `}</style>

      {/* ── Continent silhouettes ───────────────────────────────────────────── */}
      {/* North America — top left */}
      <polygon
        points="60,60 200,55 230,140 210,220 150,250 80,220 50,160"
        fill="#1F2937"
        opacity={0.35}
      />
      {/* South America — bottom left */}
      <polygon
        points="150,310 210,300 240,380 230,470 180,490 130,450 120,380"
        fill="#1F2937"
        opacity={0.3}
      />
      {/* Europe — top center */}
      <polygon
        points="370,60 450,55 480,100 460,155 410,165 365,130 355,90"
        fill="#1F2937"
        opacity={0.35}
      />
      {/* Middle East / Africa — center */}
      <polygon
        points="440,170 530,160 570,220 560,340 510,420 460,400 420,310 410,240"
        fill="#1F2937"
        opacity={0.28}
      />
      {/* Asia — right */}
      <polygon
        points="530,50 760,45 820,120 800,240 730,290 640,270 580,200 540,130"
        fill="#1F2937"
        opacity={0.32}
      />
      {/* Australia — bottom right */}
      <polygon
        points="680,380 780,370 810,430 780,470 700,475 665,435"
        fill="#1F2937"
        opacity={0.25}
      />

      {/* ── Region labels ────────────────────────────────────────────────────── */}
      <text x="110" y="52" fontSize="9" fill="#374151" fontFamily="monospace" fontWeight="bold" letterSpacing="2">NA</text>
      <text x="390" y="50" fontSize="9" fill="#374151" fontFamily="monospace" fontWeight="bold" letterSpacing="2">EU</text>
      <text x="490" y="185" fontSize="9" fill="#374151" fontFamily="monospace" fontWeight="bold" letterSpacing="2">ME</text>
      <text x="680" y="52" fontSize="9" fill="#374151" fontFamily="monospace" fontWeight="bold" letterSpacing="2">APAC</text>
      <text x="140" y="470" fontSize="9" fill="#374151" fontFamily="monospace" fontWeight="bold" letterSpacing="2">LATAM</text>

      {/* ── Site nodes ────────────────────────────────────────────────────────── */}
      {sites.map(site => {
        const cx = (site.x_pct / 100) * svgW
        const cy = (site.y_pct / 100) * svgH
        const sc = SITE_STATUS_COLOR[site.status]
        const isSelected = selectedSite?.id === site.id
        const isActive = site.status === 'active' || site.status === 'scaling'
        const siteAlerts = getSiteAlerts(site)
        const hasAlert = siteAlerts.length > 0
        const abbr = PRODUCT_ABBR[site.product_type]

        return (
          <g
            key={site.id}
            transform={`translate(${cx},${cy})`}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelect(site)}
          >
            {/* Pulse ring for active/scaling sites */}
            {isActive && (
              <circle
                className="pulse-ring"
                r={20}
                fill="none"
                stroke={sc}
                strokeWidth={1.5}
                opacity={0.6}
              />
            )}

            {/* Selected ring */}
            {isSelected && (
              <circle r={25} fill="none" stroke={sc} strokeWidth={1} opacity={0.4} />
            )}

            {/* Node circle */}
            <circle
              r={20}
              fill={sc + '15'}
              stroke={sc}
              strokeWidth={isSelected ? 2.5 : 1.5}
            />

            {/* Product abbreviation */}
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={8}
              fontFamily="monospace"
              fontWeight="bold"
              fill={sc}
            >
              {abbr}
            </text>

            {/* Alert dot */}
            {hasAlert && (
              <circle cx={14} cy={-14} r={4} fill="#EF4444" />
            )}

            {/* Country label */}
            <text
              textAnchor="middle"
              y={32}
              fontSize={9}
              fontFamily="monospace"
              fill="#4B5563"
            >
              {site.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Main MarketMap ───────────────────────────────────────────────────────────

export function MarketMap() {
  const [selectedSite, setSelectedSite] = useState<MarketSite | null>(null)
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [productFilter, setProductFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const { isInScope, activeEntity: scopeEntity } = useEntityScope()

  const filteredSites = useMemo(() => {
    return MARKET_SITES.filter(site => {
      if (!isInScope(site.entity_id)) return false
      if (regionFilter !== 'all' && site.region !== regionFilter) return false
      if (statusFilter !== 'all' && site.status !== statusFilter) return false
      if (productFilter !== 'all' && site.product_type !== productFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!site.name.toLowerCase().includes(q) && !site.country.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [isInScope, regionFilter, statusFilter, productFilter, search])

  const activeSiteCount = MARKET_SITES.filter(s => s.status === 'active' || s.status === 'scaling').length

  const selectEl = 'text-xs bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-2.5 py-1 font-mono cursor-pointer focus:outline-none appearance-none text-gray-400'

  return (
    <div className="flex flex-col h-full" style={{ background: '#07080F' }}>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 h-11 flex items-center justify-between px-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#07080F' }}>
        {/* Title */}
        <span className="text-xs font-bold text-white tracking-wide">
          Market Deployment Control
        </span>

        {/* Filters + summary */}
        <div className="flex items-center gap-2">
          <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className={selectEl}>
            <option value="all">All regions</option>
            <option value="EU">EU</option>
            <option value="NA">NA</option>
            <option value="ME">ME</option>
            <option value="APAC">APAC</option>
            <option value="LATAM">LATAM</option>
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectEl}>
            <option value="all">All statuses</option>
            <option value="planned">Planned</option>
            <option value="setup">Setup</option>
            <option value="active">Active</option>
            <option value="scaling">Scaling</option>
            <option value="failing">Failing</option>
          </select>

          <select value={productFilter} onChange={e => setProductFilter(e.target.value)} className={selectEl}>
            <option value="all">All products</option>
            <option value="quixzoom">QuixZoom</option>
            <option value="quixom-ads">Quixom Ads</option>
            <option value="landvex">Landvex</option>
            <option value="hypbit">Hypbit</option>
          </select>

          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-xs bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-2.5 py-1 font-mono focus:outline-none text-gray-400 placeholder-gray-700 w-24"
          />

          {/* Summary pills */}
          <span className="text-[9px] font-mono px-2 py-0.5 rounded"
            style={{ background: '#374151', color: '#9CA3AF' }}>
            {filteredSites.length} sites
          </span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded"
            style={{ background: '#10B98120', color: '#10B981' }}>
            {activeSiteCount} active
          </span>
          {scopeEntity.id !== 'wavult-group' && (
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: scopeEntity.color + '15', color: scopeEntity.color }}
            >
              scope: {scopeEntity.shortName}
            </span>
          )}
        </div>
      </div>

      {/* ── Body: map + panel ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* World map */}
        <div className="flex-1 overflow-hidden" style={{ background: '#07080F' }}>
          <WorldSVG
            sites={filteredSites}
            selectedSite={selectedSite}
            onSelect={site => setSelectedSite(prev => prev?.id === site.id ? null : site)}
          />
        </div>

        {/* Site panel */}
        {selectedSite && (
          <SitePanel
            site={selectedSite}
            onClose={() => setSelectedSite(null)}
          />
        )}
      </div>
    </div>
  )
}
