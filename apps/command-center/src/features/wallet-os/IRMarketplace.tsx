// ─── Intelligence Repos Marketplace — Creator Economy for Data ──────────────

import { useState } from 'react'
import { SAMPLE_IRS, type IntelligenceRepo, type IRStatus, type IRCategory } from './walletOsData'

const STATUS_COLOR: Record<IRStatus, string> = {
  draft: '#6B7280', collecting: '#22D3EE', analyzing: '#F59E0B',
  published: '#10B981', sold: '#8B5CF6', archived: '#3D4452',
}

const CATEGORY_COLOR: Record<IRCategory, string> = {
  retail: '#F59E0B', 'real-estate': '#10B981', infrastructure: '#0EA5E9',
  advertising: '#EC4899', municipal: '#8B5CF6', custom: '#6B7280',
}

function IRCard({ ir, isExpanded, onToggle }: { ir: IntelligenceRepo; isExpanded: boolean; onToggle: () => void }) {
  const catColor = CATEGORY_COLOR[ir.category]
  const statusColor = STATUS_COLOR[ir.status]

  return (
    <div className="rounded-xl border transition-all"
      style={{
        borderColor: isExpanded ? catColor + '40' : 'rgba(255,255,255,0.06)',
        background: isExpanded ? catColor + '04' : 'rgba(255,255,255,0.02)',
      }}>
      <button onClick={onToggle} className="w-full text-left px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white">{ir.title}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                style={{ background: catColor + '18', color: catColor }}>{ir.category}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                style={{ background: statusColor + '18', color: statusColor }}>{ir.status}</span>
            </div>
            <div className="text-[10px] text-gray-600 mt-0.5">
              {ir.location.area}, {ir.location.city} · {ir.dataPoints} data points · {ir.images} images
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            {ir.pricing.oneTimePurchase && (
              <div className="text-sm font-bold text-[#10B981] font-mono">{ir.pricing.oneTimePurchase} {ir.pricing.currency}</div>
            )}
            {ir.buyers > 0 && (
              <div className="text-[10px] text-gray-600">{ir.buyers} buyers · {ir.totalRevenue} {ir.pricing.currency} revenue</div>
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 border-t border-white/[0.04] pt-3 space-y-4">
          <p className="text-xs text-gray-400">{ir.description}</p>

          {/* AI Analysis */}
          <div>
            <h4 className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">AI Analysis</h4>
            <div className="space-y-2">
              {ir.aiAnalysis.map((analysis, i) => (
                <div key={i} className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{analysis.type}</span>
                        <span className="text-[10px] text-gray-600 font-mono">confidence: {analysis.confidence}%</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{analysis.insight}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold font-mono"
                        style={{ color: analysis.score > 70 ? '#10B981' : analysis.score > 40 ? '#F59E0B' : '#EF4444' }}>
                        {analysis.score}
                      </div>
                      <div className="text-[9px] text-gray-600">score</div>
                    </div>
                  </div>
                  {/* Score bar */}
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-2">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${analysis.score}%`,
                        background: analysis.score > 70 ? '#10B981' : analysis.score > 40 ? '#F59E0B' : '#EF4444',
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h4 className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Pricing</h4>
            <div className="grid grid-cols-3 gap-2">
              {ir.pricing.oneTimePurchase && (
                <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                  <div className="text-[10px] text-gray-600">One-time</div>
                  <div className="text-sm font-bold text-white font-mono">{ir.pricing.oneTimePurchase} {ir.pricing.currency}</div>
                </div>
              )}
              {ir.pricing.subscriptionMonthly && (
                <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                  <div className="text-[10px] text-gray-600">Monthly</div>
                  <div className="text-sm font-bold text-white font-mono">{ir.pricing.subscriptionMonthly} {ir.pricing.currency}/mo</div>
                </div>
              )}
              {ir.pricing.perDataPoint && (
                <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                  <div className="text-[10px] text-gray-600">Per Data Point</div>
                  <div className="text-sm font-bold text-white font-mono">{ir.pricing.perDataPoint} {ir.pricing.currency}</div>
                </div>
              )}
            </div>
          </div>

          {/* Potential buyers */}
          <div className="text-[10px] text-gray-600 bg-white/[0.02] rounded-lg px-3 py-2 border border-white/[0.04]">
            <span className="text-gray-500">Potential buyers: </span>
            {ir.category === 'retail' && 'Fönsterputsare, reklambyråer, fastighetsägare'}
            {ir.category === 'real-estate' && 'Entreprenörer, fasadföretag, mäklare'}
            {ir.category === 'municipal' && 'Kommuner, vägverket, underhållsentreprenörer'}
            {ir.category === 'infrastructure' && 'Kommuner, byggföretag'}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── IR Creation Flow ───────────────────────────────────────────────────────

function IRCreationFlow() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 mb-6">
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">IR Creation → Sale Flow</h3>
      <div className="font-mono text-[10px] leading-relaxed text-gray-500 space-y-1">
        <div><span className="text-white font-bold">Creator</span> builds IR (Level 4+ required)</div>
        <div>{'  '}↓</div>
        <div><span className="text-[#0EA5E9]">Data collected</span> (tasks generate images + metadata)</div>
        <div>{'  '}↓</div>
        <div><span className="text-[#F59E0B]">AI Analysis</span> (facade condition, lead scoring, footfall)</div>
        <div>{'  '}↓</div>
        <div><span className="text-[#10B981]">IR Published</span> to marketplace</div>
        <div>{'  '}↓</div>
        <div><span className="text-[#8B5CF6]">Business buys access</span> (one-time / subscription / per-point)</div>
        <div>{'  '}↓</div>
        <div><span className="text-[#EC4899]">Creator gets payout</span> (revenue split based on level)</div>
      </div>
      <div className="mt-3 pt-2 border-t border-white/[0.04] text-[10px] text-gray-600">
        Revenue split: <span className="text-[#10B981]">L1: 50%</span> → <span className="text-[#F59E0B]">L4: 65%</span> → <span className="text-[#EC4899]">L6: 80%</span> to creator
      </div>
    </div>
  )
}

// ─── Self-Sustaining Economy Loop ───────────────────────────────────────────

function EconomyLoop() {
  return (
    <div className="rounded-xl border border-[#10B98125] bg-[#10B98108] px-5 py-4 mb-6">
      <h3 className="text-xs font-bold text-[#10B981] mb-2">Self-Sustaining Economy Loop</h3>
      <div className="font-mono text-[10px] text-gray-400 space-y-0.5">
        <div><span className="text-white">Demand</span> (search / client / AI)</div>
        <div>{'  '}→ <span className="text-[#22D3EE]">Task</span> (pushed to creators in area)</div>
        <div>{'  '}→ <span className="text-[#0EA5E9]">Image</span> (capture at location)</div>
        <div>{'  '}→ <span className="text-[#F59E0B]">Data</span> (AI analysis + metadata)</div>
        <div>{'  '}→ <span className="text-[#8B5CF6]">IR</span> (packaged intelligence repo)</div>
        <div>{'  '}→ <span className="text-[#10B981]">Sale</span> (business buys access)</div>
        <div>{'  '}→ <span className="text-white">Demand</span> (more searches → more tasks)</div>
      </div>
      <div className="text-[10px] text-[#10B981] mt-2 font-bold">This loop is self-reinforcing. More data → more buyers → more demand → more tasks.</div>
    </div>
  )
}

export function IRMarketplace() {
  const [expandedId, setExpandedId] = useState<string | null>('ir-1')

  const totalValue = SAMPLE_IRS.reduce((s, ir) => s + ir.totalRevenue, 0)
  const totalDataPoints = SAMPLE_IRS.reduce((s, ir) => s + ir.dataPoints, 0)

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-sm font-bold text-white">Intelligence Repos</h2>
          <p className="text-[10px] text-gray-600 mt-0.5">Creator economy for real-world data — build, analyze, sell</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="text-xs text-gray-600 mb-1">Active IRs</div>
            <div className="text-2xl font-bold text-white">{SAMPLE_IRS.length}</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="text-xs text-gray-600 mb-1">Total Data Points</div>
            <div className="text-2xl font-bold text-[#0EA5E9] font-mono">{totalDataPoints}</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="text-xs text-gray-600 mb-1">Total Revenue</div>
            <div className="text-2xl font-bold text-[#10B981] font-mono">{totalValue} SEK</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="text-xs text-gray-600 mb-1">Total Buyers</div>
            <div className="text-2xl font-bold text-[#8B5CF6]">{SAMPLE_IRS.reduce((s, ir) => s + ir.buyers, 0)}</div>
          </div>
        </div>

        <EconomyLoop />
        <IRCreationFlow />

        {/* IR list */}
        <div className="space-y-2">
          {SAMPLE_IRS.map(ir => (
            <IRCard key={ir.id} ir={ir} isExpanded={expandedId === ir.id}
              onToggle={() => setExpandedId(expandedId === ir.id ? null : ir.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}
