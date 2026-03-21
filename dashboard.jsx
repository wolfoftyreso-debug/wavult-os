import { useState } from "react";

const C = { bg: "#F5F5F7", card: "#FFFFFF", border: "#E5E5EA", text: "#1D1D1F", sec: "#86868B", tert: "#AEAEB2", blue: "#007AFF", green: "#34C759", yellow: "#FF9500", red: "#FF3B30", fill: "#F2F2F7", purple: "#AF52DE", orange: "#FF9500" };
const shadow = "0 1px 3px rgba(0,0,0,0.06)";
const statusColor = (s) => s === "GREEN" ? C.green : s === "YELLOW" ? C.yellow : s === "RED" ? C.red : C.tert;
const levelColor = (l) => l === "L5" ? C.blue : l === "L4" ? C.green : l === "L3" ? C.yellow : l === "L2" ? C.orange : C.red;
const formatEur = (n) => `€${(n||0).toLocaleString('sv-SE')}`;

const D = {
  user: { full_name: "Erik", role: "ADMIN" },
  team: [
    { name: "Erik", role: "Arkitekt", tasks: 3, overdue: 0, status: "GREEN" },
    { name: "Leon", role: "CEO", tasks: 8, overdue: 1, status: "YELLOW" },
    { name: "Johan", role: "IT", tasks: 5, overdue: 0, status: "GREEN" },
    { name: "Dennis", role: "OPS", tasks: 4, overdue: 0, status: "GREEN" },
    { name: "Winston", role: "CFO", tasks: 6, overdue: 0, status: "GREEN" },
  ],
  kpis: [
    { name: "Pipeline", val: 64000, target: 50000, unit: "EUR", status: "GREEN", trend: "UP" },
    { name: "Leads/v", val: 7, target: 10, unit: "st", status: "YELLOW", trend: "UP" },
    { name: "Försenade", val: 1, target: 0, unit: "st", status: "YELLOW", trend: "STABLE" },
    { name: "Trial Bal.", val: 0, target: 0, unit: "EUR", status: "GREEN", trend: "STABLE" },
    { name: "Runway", val: 8.2, target: 6, unit: "mån", status: "GREEN", trend: "STABLE" },
  ],
  pipeline: [
    { st: "NEW", deals: 4, eur: 12000 }, { st: "QUALIFIED", deals: 3, eur: 18000 },
    { st: "DEMO", deals: 2, eur: 15000 }, { st: "OFFER", deals: 1, eur: 8000 }, { st: "WON", deals: 2, eur: 11000 },
  ],
  tasks: [
    { title: "Boka demo: Kommun X", st: "IN_PROGRESS", who: "Leon", dl: "2026-03-19", p: 1 },
    { title: "Supabase schema deploy", st: "TODO", who: "Johan", dl: "2026-03-21", p: 1 },
    { title: "UAB namnbyte", st: "IN_PROGRESS", who: "Dennis", dl: "2026-03-22", p: 2 },
    { title: "Budget Q1–Q4", st: "TODO", who: "Winston", dl: "2026-03-23", p: 2 },
    { title: "Onboarding: Fastighetsbolaget", st: "TODO", who: "Dennis", dl: "2026-03-24", p: 3 },
  ],
  decisions: [
    { title: "Supabase som primär DB", rat: "Noll drift.", by: "Erik", date: "2026-03-18" },
    { title: "Gruppchatt istället för Slack", rat: "5 pers. Hypbit visar status.", by: "Erik", date: "2026-03-16" },
    { title: "Claude Code som kodverktyg", rat: "Samma Claude.", by: "Erik", date: "2026-03-15" },
  ],
  tb: { ok: true, d: 15400, c: 15400, rows: [{ code: "1000", name: "Kassa", d: 15400, c: 0 }, { code: "3000", name: "Eget kapital", d: 0, c: 10000 }, { code: "4100", name: "Serviceintäkt", d: 0, c: 5400 }] },
  msgs: [
    { u: "System", t: "🎉 Fastighetsbolaget signerat! €5 500", s: true, ch: "SALES" },
    { u: "Leon", t: "5 nya kontakter i pipeline", s: false, ch: "SALES" },
    { u: "Dennis", t: "Juristkontakt Vilnius svarade", s: false, ch: "OPS" },
    { u: "System", t: "💰 Betalning: €5 500", s: true, ch: "FINANCE" },
    { u: "Johan", t: "Schema redo för deploy", s: false, ch: "PRODUCT" },
  ],
  heatmap: [
    { cap: "Task Completion", dom: "Exec", E: "L5", L: "L3", J: "L4", Dn: "L4", W: "L4" },
    { cap: "Quality Focus", dom: "Exec", E: "L5", L: "L2", J: "L4", Dn: "L3", W: "L4" },
    { cap: "Prioritization", dom: "Plan", E: "L5", L: "L2", J: "L3", Dn: "L3", W: "L3" },
    { cap: "Data-driven Dec.", dom: "Dec", E: "L5", L: "L2", J: "L3", Dn: "L2", W: "L4" },
    { cap: "Problem Solving", dom: "Dec", E: "L5", L: "L3", J: "L4", Dn: "L3", W: "L3" },
    { cap: "System Usage", dom: "Tech", E: "L5", L: "L3", J: "L5", Dn: "L3", W: "L3" },
    { cap: "Process Ownership", dom: "Lead", E: "L5", L: "L3", J: "L4", Dn: "L3", W: "L3" },
  ],
  gaps: [
    { who: "Leon", cap: "Prioritization", cur: "L2", tgt: "L3", gap: 1 },
    { who: "Leon", cap: "Data-driven Dec.", cur: "L2", tgt: "L3", gap: 1 },
    { who: "Dennis", cap: "Data-driven Dec.", cur: "L2", tgt: "L3", gap: 1 },
    { who: "Johan", cap: "Clarity", cur: "L2", tgt: "L3", gap: 1 },
  ],
  devPlans: [
    { who: "Leon", actions: [
      { cap: "Prioritization", type: "PRACTICE", title: "8-lagersanalys på varje deal", st: "ACTIVE", dl: "2026-04-15" },
      { cap: "Data-driven Dec.", type: "COACHING", title: "3 sessioner med Erik", st: "PENDING", dl: "2026-04-30" },
    ]},
  ],
  goals: [
    { title: "3 betalande kunder", cur: 1, tgt: 3, unit: "kunder", end: "2026-06-15", ready: 70, st: "ACTIVE" },
    { title: "Hypbit i full drift", cur: 3, tgt: 5, unit: "pers", end: "2026-04-30", ready: 60, st: "ON_TRACK" },
    { title: "UAB Litauen", cur: 0, tgt: 1, unit: "bolag", end: "2026-06-30", ready: 40, st: "ACTIVE" },
  ],
  // PROCESS ENGINE DATA
  ncs: [
    { code: "NC-2026-001", title: "Faktura utan deal-koppling", severity: "MINOR", status: "ANALYZING", days: 3, who: "Winston" },
    { code: "NC-2026-002", title: "Fotograf levererade utan QC", severity: "MAJOR", status: "ACTION_PLANNED", days: 7, who: "Johan" },
    { code: "NC-2026-003", title: "Kund fick rapport med fel adress", severity: "MINOR", status: "CLOSED", days: 2, who: "Dennis" },
  ],
  improvements: [
    { code: "IMP-2026-001", title: "Auto-QC på alla foton vid upload", status: "IMPLEMENTING", impact: 5, effort: 3, pdca: "DO" },
    { code: "IMP-2026-002", title: "GPS-verifiering vid inspektionsstart", status: "APPROVED", impact: 4, effort: 2, pdca: "PLAN" },
    { code: "IMP-2026-003", title: "NPS-enkät automatiskt efter leverans", status: "IDEA", impact: 3, effort: 1, pdca: "-" },
  ],
  compliance: [
    { standard: "ISO 9001:2015", pct: 72, total: 52, ok: 37, partial: 8, fail: 2, na: 5, audit: "2026-09-15" },
    { standard: "ISO 27001", pct: 45, total: 40, ok: 18, partial: 10, fail: 4, na: 8, audit: "2027-01-20" },
  ],
  risks: [
    { code: "RISK-001", title: "Nyckelperson lämnar", cat: "OPERATIONAL", prob: 3, imp: 5, score: 15, level: "HIGH", mit: "Cross-training + dokumentation" },
    { code: "RISK-002", title: "Supabase driftstopp", cat: "TECHNICAL", prob: 2, imp: 4, score: 8, level: "MEDIUM", mit: "Daglig backup + migration plan" },
    { code: "RISK-003", title: "Valutarisk EUR/SEK", cat: "FINANCIAL", prob: 4, imp: 3, score: 12, level: "HIGH", mit: "Hedging + SEK-prissättning" },
    { code: "RISK-004", title: "GDPR-överträdelse", cat: "LEGAL", prob: 2, imp: 5, score: 10, level: "MEDIUM", mit: "DPA + Privacy by Design" },
  ],
  processes: [
    { code: "PROC-001", name: "Deal → Kund onboarding", runs30d: 3, avgMin: 45, ncs: 1, owner: "Leon" },
    { code: "PROC-002", name: "Inspektion end-to-end", runs30d: 8, avgMin: 120, ncs: 1, owner: "Dennis" },
    { code: "PROC-003", name: "Månadsavstämning", runs30d: 1, avgMin: 60, ncs: 0, owner: "Winston" },
    { code: "PROC-004", name: "Ny fotograf onboarding", runs30d: 2, avgMin: 30, ncs: 0, owner: "Dennis" },
  ],
};

const Card = ({ title, children, style: st }) => (<div style={{ background: C.card, borderRadius: 12, padding: "20px 24px", boxShadow: shadow, ...st }}>{title && <div style={{ fontSize: 13, fontWeight: 600, color: C.sec, marginBottom: 16 }}>{title}</div>}{children}</div>);
const Badge = ({ color, children }) => <span style={{ background: color + "18", color, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{children}</span>;
const KPI = ({ k }) => (<div style={{ background: C.card, borderRadius: 12, padding: "14px 18px", boxShadow: shadow }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, color: C.sec }}>{k.name}</span><span style={{ fontSize: 11, color: k.trend === "UP" ? C.green : C.tert }}>{k.trend === "UP" ? "↑" : "·"}</span></div><div style={{ fontSize: 26, fontWeight: 700, color: statusColor(k.status), marginTop: 4 }}>{k.unit === "EUR" ? formatEur(k.val) : k.val}{k.unit === "mån" ? " mån" : ""}</div><div style={{ fontSize: 11, color: C.tert }}>Mål: {k.unit === "EUR" ? formatEur(k.target) : k.target}</div></div>);
const Dot = ({ level, size = 28 }) => (<div style={{ width: size, height: size, borderRadius: 6, background: levelColor(level) + "22", color: levelColor(level), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{level}</div>);
const Row = ({ children, border = true }) => <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: border ? `0.5px solid ${C.border}` : "none" }}>{children}</div>;
const Bar = ({ pct, color = C.blue }) => <div style={{ flex: 1, height: 8, background: C.fill, borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: color, borderRadius: 4 }} /></div>;
const ncColor = { CRITICAL: C.red, MAJOR: C.orange, MINOR: C.yellow, OBSERVATION: C.tert };
const ncStatusLabel = { OPEN: "Öppen", ANALYZING: "Analys", ACTION_PLANNED: "Planerad", IMPLEMENTING: "Genomförs", VERIFYING: "Verifieras", CLOSED: "Stängd" };
const riskColor = { CRITICAL: C.red, HIGH: C.orange, MEDIUM: C.yellow, LOW: C.green };

export default function Hypbit() {
  const [view, setView] = useState("admin");
  const [chatCh, setChatCh] = useState("SALES");

  const views = [
    { id: "admin", l: "Översikt" }, { id: "sales", l: "Sälj" }, { id: "finance", l: "Ekonomi" },
    { id: "tasks", l: "Uppgifter" }, { id: "capability", l: "Förmåga" }, { id: "development", l: "Utveckling" },
    { id: "goals", l: "Mål" }, { id: "processes", l: "Processer" }, { id: "nc", l: "Avvikelser" },
    { id: "improvements", l: "PDCA" }, { id: "compliance", l: "Compliance" }, { id: "risks", l: "Risker" },
    { id: "chat", l: "Chatt" },
  ];

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: C.bg, fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif", color: C.text, WebkitFontSmoothing: "antialiased" }}>
      <div style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px)", borderBottom: `0.5px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}>Hypbit</span>
            <div style={{ display: "flex", gap: 1, flexWrap: "wrap" }}>{views.map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{ background: "none", border: "none", color: view === v.id ? C.blue : C.sec, fontSize: 11, fontWeight: view === v.id ? 600 : 400, cursor: "pointer", padding: "6px 8px", borderBottom: view === v.id ? `2px solid ${C.blue}` : "2px solid transparent" }}>{v.l}</button>
            ))}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 24, height: 24, borderRadius: "50%", background: C.fill, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: C.sec }}>E</div><span style={{ fontSize: 12, color: C.sec }}>Erik</span></div>
        </div>
      </div>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 20px 60px" }}>

        {/* ADMIN */}
        {view === "admin" && <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>{D.kpis.map((k, i) => <KPI key={i} k={k} />)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
            <Card title="Team">{D.team.map((t, i) => <Row key={i} border={i < 4}><div style={{ width: 32, height: 32, borderRadius: "50%", background: C.fill, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600 }}>{t.name[0]}</div><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div><div style={{ fontSize: 11, color: C.sec }}>{t.role}</div></div><span style={{ fontSize: 12, color: C.sec }}>{t.tasks}</span>{t.overdue > 0 && <Badge color={C.yellow}>{t.overdue}</Badge>}<div style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor(t.status) }} /></Row>)}</Card>
            <Card title="Beslut">{D.decisions.map((d, i) => <div key={i} style={{ padding: "10px 0", borderBottom: i < 2 ? `0.5px solid ${C.border}` : "none" }}><div style={{ fontSize: 14, fontWeight: 600 }}>{d.title}</div><div style={{ fontSize: 12, color: C.sec, marginTop: 2 }}>{d.rat}</div><div style={{ fontSize: 11, color: C.tert, marginTop: 2 }}>{d.by} · {d.date}</div></div>)}</Card>
          </div>
        </div>}

        {/* SALES */}
        {view === "sales" && <Card title="Pipeline"><div style={{ display: "flex", gap: 10 }}>{D.pipeline.map((p, i) => <div key={i} style={{ flex: 1, background: C.fill, borderRadius: 10, padding: 14, textAlign: "center" }}><div style={{ fontSize: 10, color: C.sec, fontWeight: 600 }}>{p.st}</div><div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{formatEur(p.eur)}</div><div style={{ fontSize: 12, color: C.sec }}>{p.deals}</div></div>)}</div></Card>}

        {/* FINANCE */}
        {view === "finance" && <Card title={`Trial Balance ${D.tb.ok ? "✓" : "⚠"}`}><div style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px 100px", fontSize: 13 }}>{["Konto", "Namn", "Debet", "Kredit"].map(h => <div key={h} style={{ padding: "8px 0", fontWeight: 600, color: C.sec, borderBottom: `0.5px solid ${C.border}`, textAlign: h === "Debet" || h === "Kredit" ? "right" : "left" }}>{h}</div>)}{D.tb.rows.map((r, i) => [<div key={`c${i}`} style={{ padding: "10px 0", fontFamily: "monospace", borderBottom: `0.5px solid ${C.fill}` }}>{r.code}</div>, <div key={`n${i}`} style={{ padding: "10px 0", borderBottom: `0.5px solid ${C.fill}` }}>{r.name}</div>, <div key={`d${i}`} style={{ padding: "10px 0", textAlign: "right", fontFamily: "monospace", color: r.d ? C.text : C.tert, borderBottom: `0.5px solid ${C.fill}` }}>{r.d ? formatEur(r.d) : "—"}</div>, <div key={`k${i}`} style={{ padding: "10px 0", textAlign: "right", fontFamily: "monospace", color: r.c ? C.text : C.tert, borderBottom: `0.5px solid ${C.fill}` }}>{r.c ? formatEur(r.c) : "—"}</div>])}<div /><div style={{ padding: "12px 0", fontWeight: 700 }}>Totalt</div><div style={{ padding: "12px 0", fontWeight: 700, textAlign: "right", fontFamily: "monospace" }}>{formatEur(D.tb.d)}</div><div style={{ padding: "12px 0", fontWeight: 700, textAlign: "right", fontFamily: "monospace" }}>{formatEur(D.tb.c)}</div></div>{D.tb.ok && <div style={{ marginTop: 12, fontSize: 13, color: C.green, fontWeight: 600 }}>✓ Balanserad</div>}</Card>}

        {/* TASKS */}
        {view === "tasks" && <Card>{D.tasks.sort((a, b) => a.p - b.p).map((t, i) => <Row key={i} border={i < D.tasks.length - 1}><div style={{ width: 4, height: 32, borderRadius: 2, background: t.p === 1 ? C.red : t.p === 2 ? C.blue : C.tert }} /><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{t.title}</div><div style={{ fontSize: 12, color: C.sec }}>{t.who}</div></div><Badge color={t.st === "IN_PROGRESS" ? C.blue : C.tert}>{t.st === "IN_PROGRESS" ? "Pågående" : "Att göra"}</Badge><span style={{ fontSize: 12, color: C.sec, fontFamily: "monospace" }}>{t.dl}</span></Row>)}</Card>}

        {/* CAPABILITY */}
        {view === "capability" && <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card title="Teamöversikt"><div style={{ overflowX: "auto" }}><div style={{ display: "grid", gridTemplateColumns: "160px repeat(5, 1fr)", gap: 0, fontSize: 12 }}>
            <div style={{ padding: 8, fontWeight: 600, color: C.sec }}>Capability</div>
            {["Erik", "Leon", "Johan", "Dennis", "Winston"].map(n => <div key={n} style={{ padding: 8, fontWeight: 600, color: C.sec, textAlign: "center" }}>{n}</div>)}
            {D.heatmap.map((r, i) => [<div key={`n${i}`} style={{ padding: 8, borderTop: `0.5px solid ${C.fill}` }}><span style={{ fontWeight: 500 }}>{r.cap}</span><br /><span style={{ fontSize: 10, color: C.tert }}>{r.dom}</span></div>,
              ...["E", "L", "J", "Dn", "W"].map(p => <div key={`${i}${p}`} style={{ padding: 8, borderTop: `0.5px solid ${C.fill}`, display: "flex", justifyContent: "center" }}><Dot level={r[p]} /></div>)])}
          </div></div></Card>
          <Card title="Gaps">{D.gaps.map((g, i) => <Row key={i} border={i < D.gaps.length - 1}><div style={{ width: 32, height: 32, borderRadius: "50%", background: C.fill, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600 }}>{g.who[0]}</div><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{g.who}</div><div style={{ fontSize: 12, color: C.sec }}>{g.cap}</div></div><Dot level={g.cur} /><span style={{ color: C.tert }}>→</span><Dot level={g.tgt} /><Badge color={C.yellow}>+{g.gap}</Badge></Row>)}</Card>
        </div>}

        {/* DEVELOPMENT */}
        {view === "development" && <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{D.devPlans.map((p, pi) => <Card key={pi} title={`${p.who} — Utvecklingsplan`}>{p.actions.map((a, i) => <Row key={i} border={i < p.actions.length - 1}><div style={{ width: 4, height: 32, borderRadius: 2, background: a.st === "ACTIVE" ? C.blue : C.tert }} /><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</div><div style={{ display: "flex", gap: 6, marginTop: 4 }}><Badge color={C.purple}>{a.cap}</Badge><Badge color={C.tert}>{a.type}</Badge></div></div><Badge color={a.st === "ACTIVE" ? C.blue : C.tert}>{a.st === "ACTIVE" ? "Pågående" : "Väntande"}</Badge><span style={{ fontSize: 12, color: C.sec, fontFamily: "monospace" }}>{a.dl}</span></Row>)}</Card>)}</div>}

        {/* GOALS */}
        {view === "goals" && <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{D.goals.map((g, i) => <Card key={i}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><div style={{ fontSize: 17, fontWeight: 700 }}>{g.title}</div><Badge color={g.st === "ON_TRACK" ? C.green : C.blue}>{g.st.replace("_", " ")}</Badge></div><div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}><Bar pct={(g.cur / g.tgt) * 100} color={g.cur >= g.tgt ? C.green : C.blue} /><span style={{ fontSize: 15, fontWeight: 700, minWidth: 60 }}>{g.cur}/{g.tgt}</span><span style={{ fontSize: 12, color: C.sec }}>{g.unit}</span></div><div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}><span style={{ fontSize: 12, color: C.sec }}>Deadline: {g.end}</span><span style={{ fontSize: 12, color: C.sec }}>Readiness: <span style={{ fontWeight: 600, color: g.ready >= 70 ? C.green : g.ready >= 40 ? C.yellow : C.red }}>{g.ready}%</span></span></div></Card>)}</div>}

        {/* PROCESSES */}
        {view === "processes" && <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[{ l: "Aktiva processer", v: D.processes.length, c: C.blue }, { l: "Körningar / 30d", v: D.processes.reduce((s, p) => s + p.runs30d, 0), c: C.green }, { l: "Snitt duration", v: Math.round(D.processes.reduce((s, p) => s + p.avgMin, 0) / D.processes.length) + " min", c: C.sec }].map((s, i) => <div key={i} style={{ background: C.card, borderRadius: 12, padding: "16px 20px", boxShadow: shadow }}><div style={{ fontSize: 12, color: C.sec }}>{s.l}</div><div style={{ fontSize: 26, fontWeight: 700, color: s.c, marginTop: 4 }}>{s.v}</div></div>)}
          </div>
          <Card title="Processregister">{D.processes.map((p, i) => <Row key={i} border={i < D.processes.length - 1}><div style={{ minWidth: 80, fontSize: 12, fontFamily: "monospace", color: C.sec }}>{p.code}</div><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 12, color: C.sec }}>Ägare: {p.owner}</div></div><span style={{ fontSize: 12, color: C.sec }}>{p.runs30d} körn.</span><span style={{ fontSize: 12, color: C.sec }}>{p.avgMin} min</span>{p.ncs > 0 ? <Badge color={C.yellow}>{p.ncs} NC</Badge> : <Badge color={C.green}>0 NC</Badge>}</Row>)}</Card>
        </div>}

        {/* NON-CONFORMANCES */}
        {view === "nc" && <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[{ l: "Öppna", v: D.ncs.filter(n => n.status !== "CLOSED").length, c: C.red }, { l: "Stängda", v: D.ncs.filter(n => n.status === "CLOSED").length, c: C.green }, { l: "Snitt dagar", v: Math.round(D.ncs.reduce((s, n) => s + n.days, 0) / D.ncs.length), c: C.sec }, { l: "MAJOR+", v: D.ncs.filter(n => n.severity === "MAJOR" || n.severity === "CRITICAL").length, c: C.orange }].map((s, i) => <div key={i} style={{ background: C.card, borderRadius: 12, padding: "16px 20px", boxShadow: shadow }}><div style={{ fontSize: 12, color: C.sec }}>{s.l}</div><div style={{ fontSize: 26, fontWeight: 700, color: s.c, marginTop: 4 }}>{s.v}</div></div>)}
          </div>
          <Card title="Avvikelser">{D.ncs.map((n, i) => <Row key={i} border={i < D.ncs.length - 1}><div style={{ minWidth: 90, fontSize: 12, fontFamily: "monospace", color: C.sec }}>{n.code}</div><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{n.title}</div><div style={{ fontSize: 12, color: C.sec }}>{n.who} · {n.days}d</div></div><Badge color={ncColor[n.severity]}>{n.severity}</Badge><Badge color={n.status === "CLOSED" ? C.green : C.blue}>{ncStatusLabel[n.status]}</Badge></Row>)}</Card>
        </div>}

        {/* IMPROVEMENTS / PDCA */}
        {view === "improvements" && <Card title="Förbättringar (PDCA)">{D.improvements.map((imp, i) => <Row key={i} border={i < D.improvements.length - 1}><div style={{ minWidth: 100, fontSize: 12, fontFamily: "monospace", color: C.sec }}>{imp.code}</div><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{imp.title}</div><div style={{ display: "flex", gap: 6, marginTop: 4 }}><Badge color={C.purple}>{imp.pdca}</Badge><span style={{ fontSize: 11, color: C.sec }}>Impact: {imp.impact} · Effort: {imp.effort}</span></div></div><Badge color={imp.status === "IMPLEMENTING" ? C.blue : imp.status === "APPROVED" ? C.green : C.tert}>{imp.status}</Badge></Row>)}</Card>}

        {/* COMPLIANCE */}
        {view === "compliance" && <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{D.compliance.map((c, i) => <Card key={i}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><div style={{ fontSize: 17, fontWeight: 700 }}>{c.standard}</div><Badge color={c.pct >= 90 ? C.green : c.pct >= 70 ? C.yellow : C.red}>{c.pct}%</Badge></div><div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}><Bar pct={c.pct} color={c.pct >= 90 ? C.green : c.pct >= 70 ? C.yellow : C.red} /><span style={{ fontSize: 15, fontWeight: 700 }}>{c.ok}/{c.total}</span></div><div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: C.sec }}><span>✓ {c.ok} uppfyllda</span><span>◐ {c.partial} partiella</span><span>✕ {c.fail} ej uppfyllda</span><span>? {c.na} ej bedömda</span>{c.audit && <span>Revision: {c.audit}</span>}</div></Card>)}</div>}

        {/* RISKS */}
        {view === "risks" && <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Risk matrix mini */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(l => {
              const count = D.risks.filter(r => r.level === l).length;
              return <div key={l} style={{ background: C.card, borderRadius: 12, padding: "16px 20px", boxShadow: shadow, borderTop: `3px solid ${riskColor[l]}` }}><div style={{ fontSize: 12, color: C.sec }}>{l}</div><div style={{ fontSize: 26, fontWeight: 700, color: riskColor[l], marginTop: 4 }}>{count}</div></div>;
            })}
          </div>
          <Card title="Riskregister">{D.risks.sort((a, b) => b.score - a.score).map((r, i) => <Row key={i} border={i < D.risks.length - 1}><div style={{ minWidth: 80, fontSize: 12, fontFamily: "monospace", color: C.sec }}>{r.code}</div><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{r.title}</div><div style={{ fontSize: 12, color: C.sec }}>{r.mit}</div></div><Badge color={C.tert}>{r.cat}</Badge><div style={{ textAlign: "center", minWidth: 40 }}><div style={{ fontSize: 16, fontWeight: 700, color: riskColor[r.level] }}>{r.score}</div><div style={{ fontSize: 9, color: C.tert }}>{r.prob}×{r.imp}</div></div><Badge color={riskColor[r.level]}>{r.level}</Badge></Row>)}</Card>
        </div>}

        {/* CHAT */}
        {view === "chat" && <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "calc(100vh - 120px)" }}>
          <div style={{ display: "flex", gap: 6 }}>{["SALES", "PRODUCT", "OPS", "FINANCE", "DECISIONS"].map(ch => <button key={ch} onClick={() => setChatCh(ch)} style={{ background: chatCh === ch ? C.blue : C.card, color: chatCh === ch ? "#FFF" : C.sec, border: `0.5px solid ${chatCh === ch ? C.blue : C.border}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>#{ch.toLowerCase()}</button>)}</div>
          <div style={{ flex: 1, background: C.card, borderRadius: 12, boxShadow: shadow, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column-reverse", gap: 14 }}>{D.msgs.filter(m => m.ch === chatCh).map((m, i) => <div key={i} style={{ display: "flex", gap: 10 }}><div style={{ width: 30, height: 30, borderRadius: "50%", background: m.s ? C.blue + "15" : C.fill, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: m.s ? C.blue : C.text, flexShrink: 0 }}>{m.s ? "⚙" : m.u[0]}</div><div><div style={{ fontSize: 13, fontWeight: 600, color: m.s ? C.blue : C.text }}>{m.u}</div><div style={{ fontSize: 13, color: C.text, marginTop: 2 }}>{m.t}</div></div></div>)}{D.msgs.filter(m => m.ch === chatCh).length === 0 && <div style={{ textAlign: "center", color: C.tert, padding: 40 }}>Tomt</div>}</div>
          <div style={{ display: "flex", gap: 8 }}><input type="text" placeholder={`#${chatCh.toLowerCase()}`} style={{ flex: 1, background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.text, outline: "none", boxShadow: shadow }} /><button style={{ background: C.blue, color: "#FFF", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Skicka</button></div>
        </div>}
      </div>
    </div>
  );
}
