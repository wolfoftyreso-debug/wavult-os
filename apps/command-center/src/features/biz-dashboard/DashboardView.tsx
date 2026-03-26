// ─── Dashboard — CEO Overview ────────────────────────────────────────────────
// Apple Settings style. Sections, list rows, right-aligned values.
// Understand everything in 2 seconds.

import { useNavigate } from 'react-router-dom'

export function DashboardView() {
  const nav = useNavigate()

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-[28px] font-bold text-[#1C1C1E] mb-6">Dashboard</h1>

      {/* Key numbers */}
      <Section title="This month">
        <Row label="Revenue" value="67 400 SEK" detail="+15.8% vs last month" onClick={() => nav('/finance')} />
        <Row label="Cash position" value="252 770 SEK" onClick={() => nav('/finance')} />
        <Row label="Pipeline" value="807 000 SEK" detail="5 active deals" onClick={() => nav('/sales')} />
        <Row label="Monthly burn" value="52 100 SEK" onClick={() => nav('/finance')} />
        <Row label="Runway" value="4.9 months" onClick={() => nav('/finance')} />
      </Section>

      {/* Problems */}
      <Section title="Needs attention">
        <Row label="No revenue from US" value="Blocked" valueColor="#FF3B30" detail="EIN pending, bank not open" onClick={() => nav('/operations')} />
        <Row label="No paying customers yet" value="0 customers" valueColor="#FF3B30" detail="Beta launch: Apr 15" onClick={() => nav('/sales')} />
        <Row label="Transfer pricing docs" value="Missing" valueColor="#FF9500" detail="Royalty structure at risk" onClick={() => nav('/operations')} />
      </Section>

      {/* Active work */}
      <Section title="Active work">
        <Row label="LandveX beta launch" value="Erik" detail="Deadline: Apr 15" onClick={() => nav('/operations')} />
        <Row label="QuiXzoom MVP" value="Johan" detail="Deadline: May 1" onClick={() => nav('/operations')} />
        <Row label="Dubai FZCO registration" value="Dennis" detail="Deadline: Jun 1" onClick={() => nav('/operations')} />
        <Row label="Stripe US setup" value="Blocked" valueColor="#FF3B30" detail="Needs EIN first" onClick={() => nav('/operations')} />
      </Section>

      {/* Team */}
      <Section title="Team capacity">
        <Row label="Erik" value="95%" valueColor="#FF3B30" detail="4 active items" />
        <Row label="Johan" value="85%" valueColor="#FF9500" detail="3 active items" />
        <Row label="Leon" value="70%" detail="2 active items" />
        <Row label="Winston" value="60%" detail="2 active items" />
        <Row label="Dennis" value="50%" detail="2 active items" />
      </Section>
    </div>
  )
}

// ─── Shared components ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="px-4 mb-1">
        <span className="text-[13px] text-[#8E8E93] uppercase">{title}</span>
      </div>
      <div className="bg-white rounded-xl overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, detail, valueColor, onClick }: {
  label: string; value: string; detail?: string; valueColor?: string; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center px-4 py-[11px] border-b border-[#E5E5EA] last:border-b-0 text-left hover:bg-[#F2F2F7] transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="text-[15px] text-[#1C1C1E]">{label}</div>
        {detail && <div className="text-[13px] text-[#8E8E93] mt-0.5">{detail}</div>}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
        <span className="text-[15px]" style={{ color: valueColor ?? '#8E8E93' }}>{value}</span>
        {onClick && <span className="text-[#C7C7CC] text-[14px]">&#8250;</span>}
      </div>
    </button>
  )
}
