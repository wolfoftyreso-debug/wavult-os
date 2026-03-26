// ─── Operations — Work, Problems, Capacity ──────────────────────────────────
// Apple Settings style. Tap row to see detail.

import { useState } from 'react'

type Tab = 'work' | 'problems' | 'capacity'

interface WorkItem { title: string; owner: string; status: string; deadline: string; detail: string }
interface Problem { problem: string; impact: string; impactSEK: string; owner: string; next: string; deadline: string }
interface Person { name: string; role: string; utilization: number; items: number }

const WORK: WorkItem[] = [
  { title: 'LandveX beta launch', owner: 'Erik', status: 'Active', deadline: 'Apr 15', detail: 'First paying customers' },
  { title: 'QuiXzoom MVP', owner: 'Johan', status: 'Active', deadline: 'May 1', detail: 'Image capture pipeline' },
  { title: 'Dubai FZCO registration', owner: 'Dennis', status: 'Active', deadline: 'Jun 1', detail: 'Holding structure' },
  { title: 'Stripe US entity setup', owner: 'Winston', status: 'Blocked', deadline: 'Apr 30', detail: 'Needs EIN first' },
  { title: 'Fortnox integration', owner: 'Johan', status: 'Queued', deadline: 'May 15', detail: 'Live finance data' },
  { title: 'Customer onboarding flow', owner: 'Leon', status: 'Queued', deadline: 'Apr 30', detail: 'Conversion rate' },
]

const PROBLEMS: Problem[] = [
  { problem: 'No revenue from US market', impact: '0 SEK inflow from US', impactSEK: '570 000 SEK at risk', owner: 'Erik', next: 'Complete EIN + bank setup', deadline: 'Apr 30' },
  { problem: 'No paying customers', impact: 'All revenue is projected', impactSEK: '180 000 SEK first deal', owner: 'Erik', next: 'Launch beta to 3 municipalities', deadline: 'Apr 15' },
  { problem: 'Transfer pricing docs missing', impact: 'Royalty structure at legal risk', impactSEK: 'Holding structure at risk', owner: 'Dennis', next: 'Engage TP advisory firm', deadline: 'Q3' },
]

const CAPACITY: Person[] = [
  { name: 'Erik Svensson', role: 'CEO', utilization: 95, items: 4 },
  { name: 'Johan Berglund', role: 'CTO', utilization: 85, items: 3 },
  { name: 'Leon Russo De Cerame', role: 'COO', utilization: 70, items: 2 },
  { name: 'Winston Bjarnemark', role: 'CFO', utilization: 60, items: 2 },
  { name: 'Dennis Bjarnemark', role: 'Legal', utilization: 50, items: 2 },
]

export function OperationsView() {
  const [tab, setTab] = useState<Tab>('work')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'work', label: 'Active Work', count: WORK.filter(w => w.status !== 'Done').length },
    { id: 'problems', label: 'Problems', count: PROBLEMS.length },
    { id: 'capacity', label: 'Capacity', count: CAPACITY.length },
  ]

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-[28px] font-bold text-[#1C1C1E] mb-2">Operations</h1>

      <div className="flex bg-[#E5E5EA] rounded-lg p-0.5 mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setExpandedIdx(null) }}
            className="flex-1 text-[13px] py-1.5 rounded-md transition-all"
            style={{
              background: tab === t.id ? '#FFFFFF' : 'transparent',
              color: tab === t.id ? '#1C1C1E' : '#8E8E93',
              fontWeight: tab === t.id ? 600 : 400,
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {tab === 'work' && (
        <div className="bg-white rounded-xl overflow-hidden">
          {WORK.map((w, i) => {
            const isBlocked = w.status === 'Blocked'
            return (
              <button key={i} onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                className="w-full text-left px-4 py-[11px] border-b border-[#E5E5EA] last:border-b-0 hover:bg-[#F2F2F7] transition-colors">
                <div className="flex items-center">
                  <div className="flex-1">
                    <div className="text-[15px] text-[#1C1C1E]">{w.title}</div>
                    <div className="text-[13px] text-[#8E8E93] mt-0.5">{w.detail}</div>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <div className="text-[14px]" style={{ color: isBlocked ? '#FF3B30' : '#8E8E93' }}>{w.status}</div>
                    <div className="text-[12px] text-[#C7C7CC]">{w.owner} — {w.deadline}</div>
                  </div>
                </div>
                {expandedIdx === i && (
                  <div className="mt-3 pt-3 border-t border-[#E5E5EA] text-[13px] text-[#3C3C43]">
                    <div><span className="text-[#8E8E93]">Owner:</span> {w.owner}</div>
                    <div><span className="text-[#8E8E93]">Deadline:</span> {w.deadline}</div>
                    <div><span className="text-[#8E8E93]">Impact:</span> {w.detail}</div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {tab === 'problems' && (
        <div className="space-y-3">
          {PROBLEMS.map((p, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden">
              <button onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                className="w-full text-left px-4 py-[11px] hover:bg-[#F2F2F7] transition-colors">
                <div className="flex items-center">
                  <div className="flex-1">
                    <div className="text-[15px] text-[#1C1C1E]">{p.problem}</div>
                    <div className="text-[13px] text-[#8E8E93] mt-0.5">{p.impact}</div>
                  </div>
                  <span className="text-[14px] text-[#C7C7CC] ml-3">&#8250;</span>
                </div>
              </button>
              {expandedIdx === i && (
                <div className="px-4 pb-3 pt-1 border-t border-[#E5E5EA]">
                  <div className="space-y-2 text-[14px]">
                    <div className="flex justify-between"><span className="text-[#8E8E93]">Impact</span><span className="text-[#FF3B30]">{p.impactSEK}</span></div>
                    <div className="flex justify-between"><span className="text-[#8E8E93]">Owner</span><span className="text-[#1C1C1E]">{p.owner}</span></div>
                    <div className="flex justify-between"><span className="text-[#8E8E93]">Next action</span><span className="text-[#1C1C1E]">{p.next}</span></div>
                    <div className="flex justify-between"><span className="text-[#8E8E93]">Deadline</span><span className="text-[#1C1C1E]">{p.deadline}</span></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'capacity' && (
        <div className="bg-white rounded-xl overflow-hidden">
          {CAPACITY.map((p, i) => (
            <div key={i} className="flex items-center px-4 py-[11px] border-b border-[#E5E5EA] last:border-b-0">
              <div className="flex-1">
                <div className="text-[15px] text-[#1C1C1E]">{p.name}</div>
                <div className="text-[13px] text-[#8E8E93]">{p.role} — {p.items} active items</div>
              </div>
              <span className="text-[15px]" style={{ color: p.utilization > 85 ? '#FF3B30' : p.utilization > 60 ? '#FF9500' : '#34C759' }}>
                {p.utilization}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
