import { useState } from 'react'
import { MOCK_CAMPAIGNS, MOCK_BUDGET_ALLOCATIONS, MOCK_CHANNELS } from './mockData'
import type { Campaign } from './types'
import { useTranslation } from '../../shared/i18n/useTranslation'

function BudgetBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-accent/50 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 font-mono w-8 text-right">{pct.toFixed(0)}%</span>
    </div>
  )
}

function CampaignBudgetPanel({ campaign }: { campaign: Campaign }) {
  const allocations = MOCK_BUDGET_ALLOCATIONS.filter(a => a.campaign_id === campaign.id)
  const [dailyBudgets, setDailyBudgets] = useState<Record<string, string>>(
    Object.fromEntries(allocations.map(a => [a.id, String(a.daily_budget)]))
  )

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{campaign.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Totalt: {campaign.budget_total.toLocaleString()} {campaign.currency}
            &nbsp;·&nbsp;Spenderat: 0
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">ROI</div>
          <div className="text-sm font-mono text-gray-500">—</div>
        </div>
      </div>

      <BudgetBar value={0} max={campaign.budget_total} />

      <div className="space-y-2">
        <div className="text-xs text-gray-500 font-medium">Kanalallokering</div>
        {allocations.map(alloc => {
          const ch = MOCK_CHANNELS.find(c => c.id === alloc.channel_id)
          return (
            <div key={alloc.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <span className="text-xs text-gray-600 w-32 flex-shrink-0">{ch?.provider ?? alloc.channel_id}</span>
              <div className="flex-1">
                <BudgetBar value={alloc.total_spent} max={alloc.daily_budget || 1} />
              </div>
              <input
                type="number"
                value={dailyBudgets[alloc.id] ?? '0'}
                onChange={e => setDailyBudgets({ ...dailyBudgets, [alloc.id]: e.target.value })}
                className="w-20 bg-[#070912] border border-gray-200 rounded px-2 py-1 text-xs text-gray-900 font-mono text-right focus:outline-none focus:border-brand-accent/30"
              />
              <span className="text-xs text-gray-500 w-10">{campaign.currency}/d</span>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-4 rounded-full bg-gray-100 flex items-center px-0.5 cursor-not-allowed" title="Aktiveras i Fas 3">
            <div className="w-3 h-3 rounded-full bg-gray-500" />
          </div>
          <span className="text-xs text-gray-500">Auto-optimize — Fas 3</span>
        </div>
        <button className="text-xs text-brand-accent/60 hover:text-brand-accent transition-colors cursor-default" disabled>
          Spara allokering
        </button>
      </div>
    </div>
  )
}

export function BudgetView() {
  const { t: _t } = useTranslation() // ready for i18n
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-gray-900 font-semibold">Budgethantering</h2>
        <p className="text-xs text-gray-500 mt-0.5">Manuell allokering per kampanj och kanal</p>
      </div>

      <div className="space-y-4">
        {MOCK_CAMPAIGNS.map(campaign => (
          <CampaignBudgetPanel key={campaign.id} campaign={campaign} />
        ))}
      </div>

      <div className="rounded-lg bg-white/50 border border-gray-200 px-4 py-3 text-xs text-gray-500">
        ⚙️ Auto-optimering och AI-budgetjustering aktiveras i Fas 3 (Q3 2026).
      </div>
    </div>
  )
}
