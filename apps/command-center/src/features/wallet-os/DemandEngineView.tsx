// ─── Demand Engine — Search → Task Generation → Fulfillment ─────────────────

import { DEMAND_SIGNALS, type DemandSignal } from './walletOsData'

const SOURCE_COLOR: Record<string, string> = {
  search: '#22D3EE', client: '#8B5CF6', 'ai-prediction': '#F59E0B', seasonal: '#10B981',
}
const URGENCY_COLOR: Record<string, string> = {
  low: '#6B7280', medium: '#F59E0B', high: '#EF4444',
}
const STATUS_COLOR: Record<string, string> = {
  active: '#10B981', fulfilled: '#8B5CF6', expired: '#6B7280',
}

function DemandCard({ signal }: { signal: DemandSignal }) {
  const srcColor = SOURCE_COLOR[signal.source]
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{ background: srcColor + '20', color: srcColor }}>
          {signal.source === 'search' ? '🔍' : signal.source === 'client' ? '🏢' : signal.source === 'ai-prediction' ? '🤖' : '📅'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{signal.query}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
              style={{ background: srcColor + '18', color: srcColor }}>{signal.source}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
              style={{ background: URGENCY_COLOR[signal.urgency] + '18', color: URGENCY_COLOR[signal.urgency] }}>
              {signal.urgency}
            </span>
          </div>
          <div className="text-[10px] text-gray-600 mt-0.5">{signal.area}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-bold text-[#10B981] font-mono">{signal.estimatedValue} {signal.currency}</div>
          <div className="text-[10px] text-gray-600">{signal.tasksGenerated} tasks created</div>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono flex-shrink-0"
          style={{ background: STATUS_COLOR[signal.status] + '18', color: STATUS_COLOR[signal.status] }}>
          {signal.status}
        </span>
      </div>
    </div>
  )
}

export function DemandEngineView() {
  const totalValue = DEMAND_SIGNALS.reduce((s, d) => s + d.estimatedValue, 0)
  const totalTasks = DEMAND_SIGNALS.reduce((s, d) => s + d.tasksGenerated, 0)

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-sm font-bold text-white">Demand Engine</h2>
          <p className="text-[10px] text-gray-600 mt-0.5">Demand drives production — searches, clients, and AI predictions generate tasks automatically</p>
        </div>

        {/* Demand → Task loop */}
        <div className="rounded-xl border border-[#22D3EE25] bg-[#22D3EE08] px-5 py-4">
          <h3 className="text-xs font-bold text-[#22D3EE] mb-2">Demand-Driven Production Loop</h3>
          <div className="font-mono text-[10px] text-gray-400 space-y-0.5">
            <div>1. <span className="text-white">Signal detected</span> (search query / client request / AI prediction)</div>
            <div>2. <span className="text-[#22D3EE]">Area mapped</span> (geo-fence + density analysis)</div>
            <div>3. <span className="text-[#F59E0B]">Tasks generated</span> (pushed to qualifying creators nearby)</div>
            <div>4. <span className="text-[#0EA5E9]">Priority routing</span> (higher-level users get first access)</div>
            <div>5. <span className="text-[#10B981]">Data collected</span> → IR assembled → buyers notified</div>
          </div>
          <div className="text-[10px] text-[#22D3EE] mt-2 font-bold">Zero waste: tasks only created when demand exists.</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="text-xs text-gray-600 mb-1">Active Signals</div>
            <div className="text-2xl font-bold text-white">{DEMAND_SIGNALS.filter(d => d.status === 'active').length}</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="text-xs text-gray-600 mb-1">Tasks Generated</div>
            <div className="text-2xl font-bold text-[#22D3EE] font-mono">{totalTasks}</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="text-xs text-gray-600 mb-1">Est. Pipeline Value</div>
            <div className="text-2xl font-bold text-[#10B981] font-mono">{totalValue} SEK</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="text-xs text-gray-600 mb-1">Sources</div>
            <div className="flex gap-1.5 mt-1">
              {Object.entries(SOURCE_COLOR).map(([src, color]) => (
                <span key={src} className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                  style={{ background: color + '18', color }}>{src}</span>
              ))}
            </div>
          </div>
        </div>

        {/* AI recommendations */}
        <div className="rounded-xl border border-[#F59E0B25] bg-[#F59E0B08] px-5 py-4">
          <h3 className="text-xs font-bold text-[#F59E0B] mb-2">AI Recommendations (Auto-Generated)</h3>
          <div className="space-y-1.5 text-xs text-gray-400">
            <div className="flex items-center gap-2"><span className="text-[#F59E0B]">→</span> "Besök dessa 12 adresser för optimal rutt" <span className="text-[10px] text-gray-600">(rutt-optimering)</span></div>
            <div className="flex items-center gap-2"><span className="text-[#F59E0B]">→</span> "Bäst dag/tid: tisdag 10-14" <span className="text-[10px] text-gray-600">(footfall-analys)</span></div>
            <div className="flex items-center gap-2"><span className="text-[#F59E0B]">→</span> "87% sannolikhet att denna butik köper fönsterputs" <span className="text-[10px] text-gray-600">(lead scoring)</span></div>
            <div className="flex items-center gap-2"><span className="text-[#F59E0B]">→</span> "Seasonal peak: fönsterputsning vår 2026 — öka tasks 3x" <span className="text-[10px] text-gray-600">(prediktiv)</span></div>
          </div>
        </div>

        {/* Demand signals */}
        <div>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Active Demand Signals ({DEMAND_SIGNALS.length})</h3>
          <div className="space-y-2">
            {DEMAND_SIGNALS.map(signal => <DemandCard key={signal.id} signal={signal} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
