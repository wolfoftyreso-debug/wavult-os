// ─── Finance — Cash, Revenue, Costs, Forecast ──────────────────────────────
// Apple Settings style. Sections and rows. No charts unless opened.

import { useState } from 'react'

type Tab = 'cashflow' | 'revenue' | 'costs' | 'forecast' | 'transactions'

export function FinanceView() {
  const [tab, setTab] = useState<Tab>('cashflow')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'cashflow', label: 'Cash Flow' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'costs', label: 'Costs' },
    { id: 'forecast', label: 'Forecast' },
    { id: 'transactions', label: 'Transactions' },
  ]

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-[28px] font-bold text-[#1C1C1E] mb-2">Finance</h1>

      {/* Tab selector */}
      <div className="flex bg-[#E5E5EA] rounded-lg p-0.5 mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
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

      {tab === 'cashflow' && (
        <>
          <Section title="Cash position">
            <Row label="Total" value="252 770 SEK" bold />
            <Row label="SEB Foretagskonto" value="184 320 SEK" detail="LandveX AB" />
            <Row label="Stripe balance" value="23 450 SEK" detail="Pending payout" />
            <Row label="Tax reserve" value="45 000 SEK" detail="Set aside" />
          </Section>
          <Section title="This month">
            <Row label="Revenue" value="+67 400 SEK" valueColor="#34C759" />
            <Row label="Costs" value="-52 100 SEK" valueColor="#FF3B30" />
            <Row label="Net" value="+15 300 SEK" valueColor="#34C759" bold />
          </Section>
        </>
      )}

      {tab === 'revenue' && (
        <>
          <Section title="Month to date">
            <Row label="Total revenue" value="67 400 SEK" bold />
            <Row label="Last month" value="58 200 SEK" />
            <Row label="Growth" value="+15.8%" valueColor="#34C759" />
            <Row label="Annual run rate" value="808 800 SEK" />
          </Section>
          <Section title="Revenue sources">
            <Row label="SaaS subscriptions" value="42 000 SEK" detail="62%" />
            <Row label="API usage" value="15 400 SEK" detail="23%" />
            <Row label="Professional services" value="10 000 SEK" detail="15%" />
          </Section>
        </>
      )}

      {tab === 'costs' && (
        <>
          <Section title="Total">
            <Row label="Monthly costs" value="52 100 SEK" bold />
          </Section>
          <Section title="Fixed costs">
            <Row label="Salaries + social" value="28 000 SEK" />
            <Row label="AWS infrastructure" value="8 200 SEK" />
            <Row label="Office / coworking" value="4 500 SEK" />
            <Row label="Software licenses" value="3 400 SEK" />
          </Section>
          <Section title="Variable costs">
            <Row label="Consulting" value="4 000 SEK" />
            <Row label="Marketing" value="2 050 SEK" />
            <Row label="Stripe fees" value="1 950 SEK" detail="2.9% of volume" />
          </Section>
        </>
      )}

      {tab === 'forecast' && (
        <>
          <Section title="Cash forecast">
            <Row label="Monthly burn" value="52 100 SEK" />
            <Row label="Net cashflow" value="+15 300 SEK/mo" valueColor="#34C759" />
            <Row label="Breakeven estimate" value="Jun 2026" />
          </Section>
          <Section title="Runway">
            <Row label="At current burn" value="4.9 months" />
            <Row label="If burn drops 10%" value="5.5 months" />
            <Row label="If revenue grows 20%" value="7.2 months" />
          </Section>
        </>
      )}

      {tab === 'transactions' && (
        <Section title="Recent">
          <Row label="Stripe payout" value="+12 400 SEK" valueColor="#34C759" detail="Mar 25" />
          <Row label="AWS invoice" value="-8 200 SEK" detail="Mar 24" />
          <Row label="Client: Municipality X" value="+25 000 SEK" valueColor="#34C759" detail="Mar 23" />
          <Row label="Salary payments" value="-28 000 SEK" detail="Mar 22" />
          <Row label="API revenue" value="+5 200 SEK" valueColor="#34C759" detail="Mar 21" />
          <Row label="Fortnox license" value="-1 200 SEK" detail="Mar 20" />
          <Row label="Client: FastighetsAB" value="+15 000 SEK" valueColor="#34C759" detail="Mar 19" />
          <Row label="Coworking rent" value="-4 500 SEK" detail="Mar 18" />
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

function Row({ label, value, detail, valueColor, bold, onClick }: {
  label: string; value: string; detail?: string; valueColor?: string; bold?: boolean; onClick?: () => void
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center px-4 py-[11px] border-b border-[#E5E5EA] last:border-b-0 text-left hover:bg-[#F2F2F7] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-[15px] text-[#1C1C1E]" style={{ fontWeight: bold ? 600 : 400 }}>{label}</div>
        {detail && <div className="text-[13px] text-[#8E8E93] mt-0.5">{detail}</div>}
      </div>
      <span className="text-[15px] flex-shrink-0 ml-3" style={{ color: valueColor ?? '#8E8E93', fontWeight: bold ? 600 : 400 }}>{value}</span>
    </button>
  )
}
