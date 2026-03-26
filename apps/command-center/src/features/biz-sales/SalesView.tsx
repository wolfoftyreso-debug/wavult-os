// ─── Sales — Pipeline, Deals, Customers ─────────────────────────────────────
// Apple Settings style. List of deals with status and value.

import { useState } from 'react'

type Tab = 'pipeline' | 'customers'

interface Deal {
  company: string; contact: string; value: number; stage: string;
  product: string; next: string; closeDate: string
}

const DEALS: Deal[] = [
  { company: 'Stockholms kommun', contact: 'Anna Lindberg', value: 180_000, stage: 'Proposal', product: 'LandveX', next: 'Demo Apr 2', closeDate: 'May' },
  { company: 'Goteborgs Hamn AB', contact: 'Karl Pettersson', value: 250_000, stage: 'Qualified', product: 'LandveX', next: 'Send proposal', closeDate: 'Jun' },
  { company: 'Fasadgruppen Nordic', contact: 'Maria Ek', value: 45_000, stage: 'Negotiation', product: 'QuiXzoom IR', next: 'Pricing discussion', closeDate: 'Apr' },
  { company: 'CleanWindow AB', contact: 'Jonas Holm', value: 12_000, stage: 'Lead', product: 'QuiXzoom IR', next: 'Initial meeting', closeDate: 'May' },
  { company: 'SBB Norden AB', contact: 'Sofia Strand', value: 320_000, stage: 'Lead', product: 'LandveX', next: 'Intro call', closeDate: 'Q3' },
  { company: 'Riksbyggen', contact: 'Per Nilsson', value: 95_000, stage: 'Won', product: 'LandveX', next: '-', closeDate: 'Mar' },
]

const STAGE_COLOR: Record<string, string> = {
  Lead: '#8E8E93', Qualified: '#007AFF', Proposal: '#FF9500',
  Negotiation: '#AF52DE', Won: '#34C759', Lost: '#FF3B30',
}

export function SalesView() {
  const [tab, setTab] = useState<Tab>('pipeline')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const pipeline = DEALS.filter(d => d.stage !== 'Won' && d.stage !== 'Lost')
  const customers = DEALS.filter(d => d.stage === 'Won')
  const pipelineValue = pipeline.reduce((s, d) => s + d.value, 0)
  const wonValue = customers.reduce((s, d) => s + d.value, 0)

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-[28px] font-bold text-[#1C1C1E] mb-2">Sales</h1>

      <div className="flex bg-[#E5E5EA] rounded-lg p-0.5 mb-6">
        {[
          { id: 'pipeline' as const, label: 'Pipeline' },
          { id: 'customers' as const, label: 'Customers' },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setExpandedIdx(null) }}
            className="flex-1 text-[13px] py-1.5 rounded-md transition-all"
            style={{
              background: tab === t.id ? '#FFFFFF' : 'transparent',
              color: tab === t.id ? '#1C1C1E' : '#8E8E93',
              fontWeight: tab === t.id ? 600 : 400,
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pipeline' && (
        <>
          {/* Summary */}
          <Section title="Summary">
            <Row label="Pipeline value" value={`${pipelineValue.toLocaleString('sv-SE')} SEK`} bold />
            <Row label="Active deals" value={String(pipeline.length)} />
            <Row label="Closed this month" value={`${wonValue.toLocaleString('sv-SE')} SEK`} valueColor="#34C759" />
          </Section>

          {/* Deals */}
          <Section title="Deals">
            {pipeline.map((deal, i) => (
              <button key={i} onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                className="w-full text-left px-4 py-[11px] border-b border-[#E5E5EA] last:border-b-0 hover:bg-[#F2F2F7] transition-colors">
                <div className="flex items-center">
                  <div className="flex-1">
                    <div className="text-[15px] text-[#1C1C1E]">{deal.company}</div>
                    <div className="text-[13px] text-[#8E8E93] mt-0.5">{deal.product} — {deal.next}</div>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <div className="text-[14px] text-[#1C1C1E]">{deal.value.toLocaleString('sv-SE')} SEK</div>
                    <div className="text-[12px]" style={{ color: STAGE_COLOR[deal.stage] ?? '#8E8E93' }}>{deal.stage}</div>
                  </div>
                </div>
                {expandedIdx === i && (
                  <div className="mt-3 pt-3 border-t border-[#E5E5EA] space-y-1 text-[14px]">
                    <div className="flex justify-between"><span className="text-[#8E8E93]">Contact</span><span className="text-[#1C1C1E]">{deal.contact}</span></div>
                    <div className="flex justify-between"><span className="text-[#8E8E93]">Expected close</span><span className="text-[#1C1C1E]">{deal.closeDate}</span></div>
                    <div className="flex justify-between"><span className="text-[#8E8E93]">Next action</span><span className="text-[#1C1C1E]">{deal.next}</span></div>
                  </div>
                )}
              </button>
            ))}
          </Section>
        </>
      )}

      {tab === 'customers' && (
        <Section title="Paying customers">
          {customers.length === 0 ? (
            <div className="px-4 py-8 text-center text-[15px] text-[#8E8E93]">No customers yet. Close your first deal.</div>
          ) : (
            customers.map((deal, i) => (
              <div key={i} className="flex items-center px-4 py-[11px] border-b border-[#E5E5EA] last:border-b-0">
                <div className="flex-1">
                  <div className="text-[15px] text-[#1C1C1E]">{deal.company}</div>
                  <div className="text-[13px] text-[#8E8E93]">{deal.contact} — {deal.product}</div>
                </div>
                <span className="text-[15px] text-[#34C759]">{deal.value.toLocaleString('sv-SE')} SEK</span>
              </div>
            ))
          )}
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="px-4 mb-1"><span className="text-[13px] text-[#8E8E93] uppercase">{title}</span></div>
      <div className="bg-white rounded-xl overflow-hidden">{children}</div>
    </div>
  )
}

function Row({ label, value, detail, valueColor, bold }: {
  label: string; value: string; detail?: string; valueColor?: string; bold?: boolean
}) {
  return (
    <div className="flex items-center px-4 py-[11px] border-b border-[#E5E5EA] last:border-b-0">
      <div className="flex-1">
        <div className="text-[15px] text-[#1C1C1E]" style={{ fontWeight: bold ? 600 : 400 }}>{label}</div>
        {detail && <div className="text-[13px] text-[#8E8E93] mt-0.5">{detail}</div>}
      </div>
      <span className="text-[15px]" style={{ color: valueColor ?? '#8E8E93', fontWeight: bold ? 600 : 400 }}>{value}</span>
    </div>
  )
}
