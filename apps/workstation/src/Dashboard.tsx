import { useState } from "react";
import { useApi } from "./useApi";
import LearningModule from "./LearningModule";
import { useTranslation, LanguageSwitcher, formatCurrency, formatDate } from "@pixdrift/i18n";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#F5F5F7",
  surface: "#FFFFFF",
  elevated: "#FAFAFA",
  border: "#E5E5EA",
  separator: "#F2F2F7",
  text: "#1D1D1F",
  secondary: "#86868B",
  tertiary: "#AEAEB2",
  blue: "#007AFF",
  blueLight: "#E8F3FF",
  green: "#34C759",
  greenLight: "#E8F8ED",
  yellow: "#FF9500",
  yellowLight: "#FFF3E0",
  red: "#FF3B30",
  redLight: "#FFF0EF",
  purple: "#AF52DE",
  purpleLight: "#F5EEFF",
  fill: "#F2F2F7",
  orange: "#FF6B35",
};

const shadow = {
  sm: "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.04)",
  md: "0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
  lg: "0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
};

// ─── Global styles ─────────────────────────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes shimmer {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fillBar {
    from { width: 0%; }
    to   { width: var(--pct); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .card-animate { animation: slideUp 0.2s ease forwards; }
  .fade-in { animation: fadeIn 0.15s ease forwards; }

  .nav-btn:hover { background: ${C.fill} !important; }
  .nav-btn.active { background: ${C.blue}12 !important; color: ${C.blue} !important; }
  .nav-btn.active svg { stroke: ${C.blue}; }

  .row-hover:hover { background: ${C.fill}; transition: background 0.1s ease; }
  .clickable { transition: all 0.15s ease; cursor: pointer; }
  .clickable:hover { opacity: 0.85; }
  .btn-primary:hover { background: #0066D6 !important; transform: translateY(-1px); box-shadow: ${shadow.md}; }
  .btn-primary:active { transform: scale(0.98); }
  .btn-secondary:hover { background: #E5E5EA !important; }
  .btn-ghost:hover { background: ${C.blue}08 !important; }
  .card-hover:hover { box-shadow: ${shadow.lg} !important; transform: translateY(-1px); transition: all 0.2s ease; }

  input:focus { outline: 2px solid ${C.blue} !important; outline-offset: 0px !important; }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: ${C.tertiary}; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusColor = (s: string) =>
  s === "GREEN" ? C.green : s === "YELLOW" ? C.yellow : s === "RED" ? C.red : C.tertiary;
const levelColor = (l: string) =>
  l === "L5" ? C.blue : l === "L4" ? C.green : l === "L3" ? C.yellow : l === "L2" ? C.orange : C.red;
// formatEur is kept for backward compat; prefer formatCurrency(n, 'EUR', locale) where locale is available
const formatEur = (n: number) =>
  `€${(n || 0).toLocaleString("sv-SE")}`;
const ncBorderColor: Record<string, string> = {
  CRITICAL: C.red, MAJOR: C.orange, MINOR: C.yellow, OBSERVATION: C.tertiary,
};
const ncStatusLabel: Record<string, string> = {
  OPEN: "Öppen", ANALYZING: "Analys", ACTION_PLANNED: "Planerad",
  IMPLEMENTING: "Genomförs", VERIFYING: "Verifieras", CLOSED: "Stängd",
};
const riskColor: Record<string, string> = {
  CRITICAL: C.red, HIGH: C.orange, MEDIUM: C.yellow, LOW: C.green,
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "God morgon";
  if (h < 17) return "God eftermiddag";
  return "God kväll";
}

function getSwedishDate(): string {
  const d = new Date();
  const days = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
  const months = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = ({ width = "100%", height = "14px", radius = 6 }: { width?: string; height?: string; radius?: number }) => (
  <div style={{
    width, height,
    background: "linear-gradient(90deg, #E5E5EA 0%, #F5F5F7 50%, #E5E5EA 100%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
    borderRadius: radius,
    flexShrink: 0,
  }} />
);

const SkeletonCard = () => (
  <div style={{ background: C.surface, borderRadius: 12, padding: "20px 24px", boxShadow: shadow.sm }}>
    <Skeleton height="12px" width="60%" />
    <div style={{ marginTop: 12 }}><Skeleton height="28px" width="70%" /></div>
    <div style={{ marginTop: 8 }}><Skeleton height="10px" width="40%" /></div>
  </div>
);

// ─── UI Primitives ─────────────────────────────────────────────────────────────
const Card = ({
  title, children, style: st, animate = true
}: {
  title?: string; children: React.ReactNode;
  style?: React.CSSProperties; animate?: boolean;
}) => (
  <div
    className={animate ? "card-animate" : ""}
    style={{ background: C.surface, borderRadius: 12, padding: "20px 24px", boxShadow: shadow.sm, ...st }}
  >
    {title && (
      <div style={{
        fontSize: 11, fontWeight: 600, color: C.tertiary,
        marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em",
      }}>
        {title}
      </div>
    )}
    {children}
  </div>
);

const Badge = ({ color, children, size = "sm" }: { color: string; children: React.ReactNode; size?: "sm" | "md" }) => (
  <span style={{
    background: color + "18", color,
    fontSize: size === "sm" ? 11 : 12,
    fontWeight: 600,
    padding: size === "sm" ? "2px 8px" : "4px 10px",
    borderRadius: 6,
    whiteSpace: "nowrap",
    letterSpacing: "0.02em",
  }}>
    {children}
  </span>
);

const Row = ({ children, border = true, clickable = false }: {
  children: React.ReactNode; border?: boolean; clickable?: boolean;
}) => (
  <div
    className={clickable ? "row-hover" : ""}
    style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "11px 0",
      borderBottom: border ? `0.5px solid ${C.separator}` : "none",
      borderRadius: clickable ? 6 : 0,
      cursor: clickable ? "pointer" : "default",
    }}
  >
    {children}
  </div>
);

const Bar = ({ pct, color = C.blue, height = 6, animate = true }: {
  pct: number; color?: string; height?: number; animate?: boolean;
}) => (
  <div style={{ flex: 1, height, background: C.fill, borderRadius: height / 2, overflow: "hidden", minWidth: 40 }}>
    <div style={{
      height: "100%",
      width: `${Math.min(100, Math.max(0, pct))}%`,
      background: color,
      borderRadius: height / 2,
      animation: animate ? "fillBar 0.6s ease forwards" : undefined,
    }} />
  </div>
);

const Btn = ({ children, onClick, variant = "primary", size = "md", style: st }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md";
  style?: React.CSSProperties;
}) => {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: C.blue, color: "#fff", border: "none" },
    secondary: { background: C.fill, color: C.text, border: "none" },
    ghost: { background: "transparent", color: C.blue, border: "none" },
    destructive: { background: C.red + "10", color: C.red, border: `1px solid ${C.red}20` },
  };
  return (
    <button
      className={`btn-${variant}`}
      onClick={onClick}
      style={{
        height: size === "sm" ? 30 : 36,
        padding: size === "sm" ? "0 12px" : "0 16px",
        borderRadius: 8,
        fontSize: size === "sm" ? 12 : 13,
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s ease",
        fontFamily: "inherit",
        ...styles[variant],
        ...st,
      }}
    >
      {children}
    </button>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({
  icon, title, subtitle, cta
}: {
  icon?: string; title: string; subtitle?: string; cta?: string;
}) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "48px 24px", gap: 12,
    animation: "fadeIn 0.2s ease",
  }}>
    {icon && <div style={{ fontSize: 40, opacity: 0.3 }}>{icon}</div>}
    <div style={{ fontSize: 15, fontWeight: 600, color: C.secondary }}>{title}</div>
    {subtitle && <div style={{ fontSize: 13, color: C.tertiary, textAlign: "center", maxWidth: 280 }}>{subtitle}</div>}
    {cta && <Btn variant="primary" size="sm" style={{ marginTop: 4 }}>{cta}</Btn>}
  </div>
);

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KPIData { name: string; val: number; target: number; unit: string; status: string; trend: string }

const KPI = ({ k, loading = false }: { k: KPIData; loading?: boolean }) => {
  if (loading) return <SkeletonCard />;
  const trendUp = k.trend === "UP";
  const trendColor = trendUp ? C.green : k.trend === "DOWN" ? C.red : C.tertiary;
  const pct = k.target > 0 ? Math.min(100, (k.val / k.target) * 100) : 0;
  const statusCol = statusColor(k.status);

  return (
    <div
      className="card-animate card-hover"
      style={{
        background: C.surface, borderRadius: 12, padding: "18px 20px",
        boxShadow: shadow.sm, cursor: "default",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: C.secondary }}>{k.name}</span>
        {k.trend !== "STABLE" && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: trendColor,
            background: trendColor + "12", padding: "2px 6px", borderRadius: 4,
          }}>
            {trendUp ? "↑" : "↓"}
          </span>
        )}
      </div>
      <div style={{
        fontSize: 28, fontWeight: 700, color: statusCol,
        letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", lineHeight: 1.1,
        marginBottom: 4,
      }}>
        {k.unit === "EUR" ? formatEur(k.val) : k.val}
        {k.unit === "mån" ? <span style={{ fontSize: 14, fontWeight: 500 }}> mån</span> : null}
      </div>
      <div style={{ fontSize: 11, color: C.tertiary, marginBottom: 10 }}>
        Mål: {k.unit === "EUR" ? formatEur(k.target) : k.target}
      </div>
      <Bar pct={pct} color={statusCol} height={3} />
    </div>
  );
};

// ─── Level dot ────────────────────────────────────────────────────────────────
const Dot = ({ level, size = 28 }: { level: string; size?: number }) => (
  <div style={{
    width: size, height: size, borderRadius: 6,
    background: levelColor(level) + "18",
    color: levelColor(level),
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 10, fontWeight: 700, flexShrink: 0,
  }}>
    {level}
  </div>
);

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({
  name, status, size = 36
}: {
  name: string; status?: string; size?: number;
}) => {
  const borderColor = status ? statusColor(status) : "transparent";
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: C.blue + "15", color: C.blue,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 600,
        border: `2px solid ${borderColor}`,
      }}>
        {name[0]}
      </div>
      {status && (
        <div style={{
          position: "absolute", bottom: -1, right: -1,
          width: 10, height: 10, borderRadius: "50%",
          background: statusColor(status),
          border: `2px solid ${C.surface}`,
        }} />
      )}
    </div>
  );
};

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = ["OPEN", "ANALYZING", "ACTION_PLANNED", "IMPLEMENTING", "VERIFYING", "CLOSED"];

const StepIndicator = ({ status }: { status: string }) => {
  const idx = STEPS.indexOf(status);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {STEPS.map((s, i) => (
        <div
          key={s}
          title={ncStatusLabel[s]}
          style={{
            width: i <= idx ? 14 : 8,
            height: 4,
            borderRadius: 2,
            background: i <= idx ? C.blue : C.fill,
            transition: "all 0.2s ease",
          }}
        />
      ))}
    </div>
  );
};

// ─── Static fallback data ─────────────────────────────────────────────────────
const FALLBACK = {
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
    { title: "Gruppchatt istället för Slack", rat: "5 pers. pixdrift visar status.", by: "Erik", date: "2026-03-16" },
    { title: "Claude Code som kodverktyg", rat: "Samma Claude.", by: "Erik", date: "2026-03-15" },
  ],
  tb: {
    ok: true, d: 15400, c: 15400,
    rows: [
      { code: "1000", name: "Kassa", d: 15400, c: 0 },
      { code: "3000", name: "Eget kapital", d: 0, c: 10000 },
      { code: "4100", name: "Serviceintäkt", d: 0, c: 5400 },
    ],
  },
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
    {
      who: "Leon", actions: [
        { cap: "Prioritization", type: "PRACTICE", title: "8-lagersanalys på varje deal", st: "ACTIVE", dl: "2026-04-15" },
        { cap: "Data-driven Dec.", type: "COACHING", title: "3 sessioner med Erik", st: "PENDING", dl: "2026-04-30" },
      ],
    },
  ],
  goals: [
    { title: "3 betalande kunder", cur: 1, tgt: 3, unit: "kunder", end: "2026-06-15", ready: 70, st: "ACTIVE" },
    { title: "pixdrift i full drift", cur: 3, tgt: 5, unit: "pers", end: "2026-04-30", ready: 60, st: "ON_TRACK" },
    { title: "UAB Litauen", cur: 0, tgt: 1, unit: "bolag", end: "2026-06-30", ready: 40, st: "ACTIVE" },
  ],
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

// ─── Nav config ───────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: "OVERVIEW",
    items: [{ id: "admin", label: "Översikt", icon: "⊞" }],
  },
  {
    label: "WORK",
    items: [
      { id: "tasks", label: "Uppgifter", icon: "✓" },
      { id: "goals", label: "Mål", icon: "◎" },
      { id: "processes", label: "Processer", icon: "⟳" },
    ],
  },
  {
    label: "SALES",
    items: [
      { id: "sales", label: "Sälj & Pipeline", icon: "◈" },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { id: "finance", label: "Ekonomi", icon: "€" },
    ],
  },
  {
    label: "PEOPLE",
    items: [
      { id: "capability", label: "Förmåga", icon: "◆" },
      { id: "development", label: "Utveckling", icon: "↑" },
    ],
  },
  {
    label: "QUALITY",
    items: [
      { id: "nc", label: "Avvikelser", icon: "⚠" },
      { id: "improvements", label: "PDCA", icon: "◐" },
      { id: "compliance", label: "Compliance", icon: "✓✓" },
      { id: "risks", label: "Risker", icon: "⊘" },
    ],
  },
  {
    label: "COMMS",
    items: [
      { id: "chat", label: "Chatt", icon: "◻" },
      { id: "learning", label: "Lärande", icon: "◑" },
    ],
  },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  view, setView, collapsed, setCollapsed, userName
}: {
  view: string;
  setView: (v: string) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  userName: string;
}) {
  const { t } = useTranslation();
  const NAV_SECTIONS_I18N = [
    {
      label: "OVERVIEW",
      items: [{ id: "admin", label: t('nav.overview'), icon: "⊞" }],
    },
    {
      label: "WORK",
      items: [
        { id: "tasks", label: t('nav.tasks'), icon: "✓" },
        { id: "goals", label: t('nav.goals'), icon: "◎" },
        { id: "processes", label: t('nav.processes'), icon: "⟳" },
      ],
    },
    {
      label: "SALES",
      items: [
        { id: "sales", label: t('nav.deals'), icon: "◈" },
      ],
    },
    {
      label: "FINANCE",
      items: [
        { id: "finance", label: t('nav.reports'), icon: "€" },
      ],
    },
    {
      label: "PEOPLE",
      items: [
        { id: "capability", label: t('nav.capabilities'), icon: "◆" },
        { id: "development", label: t('nav.development'), icon: "↑" },
      ],
    },
    {
      label: "QUALITY",
      items: [
        { id: "nc", label: t('nav.nonConformances'), icon: "⚠" },
        { id: "improvements", label: "PDCA", icon: "◐" },
        { id: "compliance", label: t('nav.compliance'), icon: "✓✓" },
        { id: "risks", label: t('nav.risks'), icon: "⊘" },
      ],
    },
    {
      label: "COMMS",
      items: [
        { id: "chat", label: "Chatt", icon: "◻" },
        { id: "learning", label: t('nav.learning'), icon: "◑" },
      ],
    },
  ];
  const w = collapsed ? 60 : 220;
  return (
    <div style={{
      width: w,
      background: C.surface,
      borderRight: `1px solid ${C.border}`,
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      top: 0, left: 0, bottom: 0,
      zIndex: 200,
      transition: "width 0.2s ease",
      overflow: "hidden",
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? "18px 0" : "18px 16px",
        borderBottom: `1px solid ${C.separator}`,
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        cursor: "pointer",
      }} onClick={() => setCollapsed(!collapsed)}>
        {!collapsed ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: "linear-gradient(135deg, #007AFF, #5856D6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>p</span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.03em", color: C.text }}>
                pixdrift
              </span>
            </div>
            <span style={{ fontSize: 14, color: C.tertiary, cursor: "pointer" }}>‹</span>
          </>
        ) : (
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "linear-gradient(135deg, #007AFF, #5856D6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>p</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 8px", display: "flex", flexDirection: "column", gap: 0, overflowY: "auto" }}>
        {NAV_SECTIONS_I18N.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <div style={{
                fontSize: 10, fontWeight: 600, color: C.tertiary,
                letterSpacing: "0.08em", textTransform: "uppercase",
                padding: "12px 8px 4px",
              }}>
                {section.label}
              </div>
            )}
            {section.items.map(item => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-btn clickable ${active ? "active" : ""}`}
                  onClick={() => setView(item.id)}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    height: 36,
                    padding: collapsed ? "0" : "0 10px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    borderRadius: 8,
                    border: "none",
                    background: active ? C.blue + "12" : "transparent",
                    color: active ? C.blue : C.secondary,
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.12s ease",
                    marginBottom: 2,
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ fontSize: 14, width: 16, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{
        padding: collapsed ? "12px 0" : "12px 14px",
        borderTop: `1px solid ${C.separator}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        justifyContent: collapsed ? "center" : "flex-start",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, #007AFF, #5856D6)",
          color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}>
          {userName[0]}
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{userName}</div>
            <div style={{ fontSize: 11, color: C.tertiary }}>Admin</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
function TopBar({ title, onNew }: { title: string; onNew?: () => void }) {
  const { t, locale } = useTranslation();
  const h = new Date().getHours();
  const greeting = h < 12 ? t('dashboard.goodMorning') : h < 17 ? t('dashboard.goodAfternoon') : t('dashboard.goodEvening');
  const dateStr = formatDate(new Date(), locale);
  return (
    <div style={{
      background: "rgba(255,255,255,0.85)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: `0.5px solid ${C.border}`,
      padding: "0 28px",
      height: 56,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: C.text }}>
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13, color: C.secondary }}>
          {greeting}, Erik · {dateStr}
        </span>
        <LanguageSwitcher />
        <button style={{
          width: 34, height: 34, borderRadius: 8,
          background: C.fill, border: "none",
          cursor: "pointer", fontSize: 16,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}>
          🔔
        </button>
        {onNew && (
          <Btn variant="primary" onClick={onNew} size="sm">+ Ny</Btn>
        )}
      </div>
    </div>
  );
}

// ─── Views ─────────────────────────────────────────────────────────────────────

function AdminView({ D }: { D: typeof FALLBACK }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Quick actions */}
      <div style={{ display: "flex", gap: 8 }}>
        {["+ Deal", "+ Uppgift", "+ Avvikelse"].map((label, i) => (
          <button
            key={i}
            className="clickable"
            style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 20, padding: "6px 14px",
              fontSize: 13, fontWeight: 500, color: C.secondary,
              cursor: "pointer", transition: "all 0.15s ease",
              fontFamily: "inherit",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {D.kpis.map((k, i) => <KPI key={i} k={k} />)}
      </div>

      {/* Team + Decisions */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <Card title="Team">
          {D.team.map((t, i) => (
            <Row key={i} border={i < D.team.length - 1} clickable>
              <Avatar name={t.name} status={t.status} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{t.name}</div>
                <div style={{ fontSize: 12, color: C.secondary, marginTop: 1 }}>{t.role}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: C.secondary, fontVariantNumeric: "tabular-nums" }}>
                  {t.tasks} uppgifter
                </span>
                {t.overdue > 0 && <Badge color={C.yellow}>{t.overdue} sen</Badge>}
              </div>
            </Row>
          ))}
        </Card>

        <Card title="Beslutlogg">
          {D.decisions.map((d, i) => (
            <div
              key={i}
              className="clickable"
              style={{
                padding: "12px 0",
                borderBottom: i < D.decisions.length - 1 ? `0.5px solid ${C.separator}` : "none",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{d.title}</div>
              <div style={{ fontSize: 12, color: C.secondary, marginTop: 3 }}>{d.rat}</div>
              <div style={{ fontSize: 11, color: C.tertiary, marginTop: 4 }}>
                {d.by} · {d.date}
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Activity feed */}
      <Card title="Aktivitetsflöde">
        <div style={{ position: "relative", paddingLeft: 20 }}>
          <div style={{
            position: "absolute", left: 6, top: 0, bottom: 0,
            width: 1, background: C.separator,
          }} />
          {D.msgs.map((m, i) => (
            <div key={i} style={{
              display: "flex", gap: 12, marginBottom: 16,
              animation: `slideUp 0.2s ease ${i * 0.05}s backwards`,
            }}>
              <div style={{
                width: 28, height: 28,
                borderRadius: "50%",
                background: m.s ? C.blue + "15" : C.fill,
                color: m.s ? C.blue : C.secondary,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 600, flexShrink: 0,
                marginLeft: -8,
                border: `2px solid ${C.surface}`,
                zIndex: 1, position: "relative",
              }}>
                {m.s ? "⚙" : m.u[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.4 }}>{m.t}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                  <Badge color={C.tertiary}>{m.ch}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SalesView({ D }: { D: typeof FALLBACK }) {
  const stageColors: Record<string, string> = {
    NEW: C.tertiary, QUALIFIED: C.blue, DEMO: C.purple, OFFER: C.yellow, WON: C.green,
  };
  const maxEur = Math.max(...D.pipeline.map(p => p.eur));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Card title="Pipeline-översikt">
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          {D.pipeline.map((p, i) => {
            const col = stageColors[p.st] ?? C.tertiary;
            return (
              <div
                key={i}
                className="card-hover"
                style={{
                  flex: 1, background: col + "08",
                  borderRadius: 10, padding: "16px 14px",
                  border: `1px solid ${col}20`,
                  cursor: "pointer",
                  animation: `slideUp 0.2s ease ${i * 0.06}s backwards`,
                }}
              >
                <div style={{
                  fontSize: 10, fontWeight: 600, color: col,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  {p.st}
                </div>
                <div style={{
                  fontSize: 22, fontWeight: 700, color: C.text,
                  marginTop: 8, fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.02em",
                }}>
                  {formatEur(p.eur)}
                </div>
                <div style={{ fontSize: 12, color: C.secondary, marginTop: 4 }}>
                  {p.deals} deals
                </div>
                <div style={{ marginTop: 10 }}>
                  <Bar pct={(p.eur / maxEur) * 100} color={col} height={3} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between",
          padding: "14px 0 0", borderTop: `0.5px solid ${C.separator}`,
        }}>
          <span style={{ fontSize: 13, color: C.secondary }}>Total pipeline</span>
          <span style={{
            fontSize: 17, fontWeight: 700, color: C.blue,
            fontVariantNumeric: "tabular-nums",
          }}>
            {formatEur(D.pipeline.reduce((s, p) => s + p.eur, 0))}
          </span>
        </div>
      </Card>
    </div>
  );
}

function FinanceView({ D }: { D: typeof FALLBACK }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title={`Råbalans ${D.tb.ok ? "— Balanserad ✓" : "— Obalanserad ⚠"}`}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "80px 1fr 120px 120px",
        }}>
          {["Konto", "Namn", "Debet", "Kredit"].map((h, i) => (
            <div key={h} style={{
              padding: "8px 0",
              fontSize: 11, fontWeight: 600, color: C.tertiary,
              textTransform: "uppercase", letterSpacing: "0.06em",
              borderBottom: `1px solid ${C.border}`,
              textAlign: i >= 2 ? "right" : "left",
            }}>
              {h}
            </div>
          ))}

          {D.tb.rows.map((r, i) => [
            <div key={`c${i}`} style={{
              padding: "11px 0",
              fontSize: 12, color: C.secondary, fontFamily: "monospace",
              borderBottom: `0.5px solid ${C.separator}`,
              fontVariantNumeric: "tabular-nums",
            }}>
              {r.code}
            </div>,
            <div key={`n${i}`} style={{
              padding: "11px 0",
              fontSize: 14, fontWeight: 500, color: C.text,
              borderBottom: `0.5px solid ${C.separator}`,
            }}>
              {r.name}
            </div>,
            <div key={`d${i}`} style={{
              padding: "11px 0",
              textAlign: "right",
              fontSize: 14, fontFamily: "monospace",
              fontVariantNumeric: "tabular-nums",
              color: r.d > 0 ? C.text : C.tertiary,
              borderBottom: `0.5px solid ${C.separator}`,
            }}>
              {r.d > 0 ? formatEur(r.d) : "—"}
            </div>,
            <div key={`k${i}`} style={{
              padding: "11px 0",
              textAlign: "right",
              fontSize: 14, fontFamily: "monospace",
              fontVariantNumeric: "tabular-nums",
              color: r.c > 0 ? C.text : C.tertiary,
              borderBottom: `0.5px solid ${C.separator}`,
            }}>
              {r.c > 0 ? formatEur(r.c) : "—"}
            </div>,
          ])}

          {/* Total row */}
          <div />
          <div style={{
            padding: "13px 0",
            fontSize: 14, fontWeight: 700, color: C.text,
            borderTop: `1px solid ${C.border}`,
          }}>
            Totalt
          </div>
          <div style={{
            padding: "13px 0",
            textAlign: "right",
            fontSize: 15, fontWeight: 700, color: C.blue,
            fontFamily: "monospace", fontVariantNumeric: "tabular-nums",
            borderTop: `1px solid ${C.border}`,
          }}>
            {formatEur(D.tb.d)}
          </div>
          <div style={{
            padding: "13px 0",
            textAlign: "right",
            fontSize: 15, fontWeight: 700, color: C.blue,
            fontFamily: "monospace", fontVariantNumeric: "tabular-nums",
            borderTop: `1px solid ${C.border}`,
          }}>
            {formatEur(D.tb.c)}
          </div>
        </div>

        {D.tb.ok && (
          <div style={{
            marginTop: 16, padding: "10px 14px",
            background: C.greenLight, borderRadius: 8,
            fontSize: 13, color: C.green, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            ✓ Balansen stämmer — debet = kredit = {formatEur(D.tb.d)}
          </div>
        )}
      </Card>
    </div>
  );
}

function TasksView({ D }: { D: typeof FALLBACK }) {
  const priorityConfig: Record<number, { label: string; color: string }> = {
    1: { label: "Hög", color: C.red },
    2: { label: "Medium", color: C.blue },
    3: { label: "Låg", color: C.tertiary },
  };
  const sorted = [...D.tasks].sort((a, b) => a.p - b.p);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { l: "Totalt", v: sorted.length, c: C.text },
          { l: "Pågående", v: sorted.filter(t => t.st === "IN_PROGRESS").length, c: C.blue },
          { l: "Att göra", v: sorted.filter(t => t.st === "TODO").length, c: C.secondary },
        ].map((s, i) => (
          <div key={i} className="card-animate" style={{
            background: C.surface, borderRadius: 12,
            padding: "16px 20px", boxShadow: shadow.sm,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.secondary }}>{s.l}</div>
            <div style={{
              fontSize: 28, fontWeight: 700, color: s.c,
              fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em",
              marginTop: 4,
            }}>
              {s.v}
            </div>
          </div>
        ))}
      </div>

      <Card>
        {sorted.length === 0 ? (
          <EmptyState
            icon="✓"
            title="Inga uppgifter"
            subtitle="Uppgifter du och teamet skapar visas här."
            cta="+ Ny uppgift"
          />
        ) : (
          sorted.map((t, i) => {
            const pc = priorityConfig[t.p] ?? priorityConfig[3];
            const overdue = new Date(t.dl) < new Date();
            return (
              <div
                key={i}
                className="row-hover"
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 8px",
                  borderBottom: i < sorted.length - 1 ? `0.5px solid ${C.separator}` : "none",
                  borderRadius: 6, cursor: "pointer",
                  borderLeft: `3px solid ${pc.color}`,
                  paddingLeft: 14,
                  animation: `slideUp 0.15s ease ${i * 0.04}s backwards`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>{t.who}</div>
                </div>
                <Badge color={t.st === "IN_PROGRESS" ? C.blue : C.tertiary}>
                  {t.st === "IN_PROGRESS" ? "Pågående" : "Att göra"}
                </Badge>
                <span style={{
                  fontSize: 12, color: overdue ? C.red : C.tertiary,
                  fontFamily: "monospace", fontVariantNumeric: "tabular-nums",
                  fontWeight: overdue ? 600 : 400,
                }}>
                  {overdue ? "⚠ " : ""}{t.dl}
                </span>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}

function CapabilityView({ D }: { D: typeof FALLBACK }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title="Kompetensheatmap">
        <div style={{ overflowX: "auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "180px repeat(5, 1fr)",
            minWidth: 500,
          }}>
            <div style={{ padding: "8px 0", fontSize: 11, color: C.tertiary, fontWeight: 600, letterSpacing: "0.04em", borderBottom: `1px solid ${C.border}` }}>
              FÖRMÅGA
            </div>
            {["Erik", "Leon", "Johan", "Dennis", "Winston"].map(n => (
              <div key={n} style={{
                padding: "8px 0", fontSize: 11, color: C.secondary,
                textAlign: "center", fontWeight: 600,
                borderBottom: `1px solid ${C.border}`,
              }}>
                {n}
              </div>
            ))}

            {D.heatmap.map((r, i) => [
              <div key={`n${i}`} style={{
                padding: "10px 0",
                borderBottom: `0.5px solid ${C.separator}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{r.cap}</div>
                <div style={{ fontSize: 11, color: C.tertiary, marginTop: 1 }}>{r.dom}</div>
              </div>,
              ...["E", "L", "J", "Dn", "W"].map(p => (
                <div key={`${i}${p}`} style={{
                  padding: "10px 0",
                  borderBottom: `0.5px solid ${C.separator}`,
                  display: "flex", justifyContent: "center",
                }}>
                  <Dot level={(r as Record<string, string>)[p]} />
                </div>
              )),
            ])}
          </div>
        </div>
      </Card>

      <Card title="Kompetensgap">
        {D.gaps.length === 0 ? (
          <EmptyState icon="◆" title="Inga gap identifierade" subtitle="Teamet möter alla kompetensmål." />
        ) : (
          D.gaps.map((g, i) => (
            <Row key={i} border={i < D.gaps.length - 1} clickable>
              <Avatar name={g.who} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{g.who}</div>
                <div style={{ fontSize: 12, color: C.secondary }}>{g.cap}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Dot level={g.cur} />
                <span style={{ fontSize: 12, color: C.tertiary }}>→</span>
                <Dot level={g.tgt} />
              </div>
              <Badge color={C.yellow}>+{g.gap}</Badge>
            </Row>
          ))
        )}
      </Card>
    </div>
  );
}

function DevelopmentView({ D }: { D: typeof FALLBACK }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {D.devPlans.length === 0 ? (
        <EmptyState
          icon="↑"
          title="Inga utvecklingsplaner"
          subtitle="Skapa planer för att stödja teamets tillväxt."
          cta="+ Skapa plan"
        />
      ) : (
        D.devPlans.map((p, pi) => (
          <Card key={pi} title={`${p.who} — Utvecklingsplan`}>
            {p.actions.map((a, i) => (
              <Row key={i} border={i < p.actions.length - 1} clickable>
                <div style={{
                  width: 3, height: 36, borderRadius: 2,
                  background: a.st === "ACTIVE" ? C.blue : C.tertiary,
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{a.title}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <Badge color={C.purple}>{a.cap}</Badge>
                    <Badge color={C.secondary}>{a.type}</Badge>
                  </div>
                </div>
                <Badge color={a.st === "ACTIVE" ? C.blue : C.tertiary}>
                  {a.st === "ACTIVE" ? "Aktiv" : "Väntande"}
                </Badge>
                <span style={{ fontSize: 12, color: C.tertiary, fontFamily: "monospace" }}>{a.dl}</span>
              </Row>
            ))}
          </Card>
        ))
      )}
    </div>
  );
}

function GoalsView({ D }: { D: typeof FALLBACK }) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    ON_TRACK: { color: C.green, label: "I tid" },
    ACTIVE: { color: C.blue, label: "Aktiv" },
    AT_RISK: { color: C.yellow, label: "Risk" },
    DELAYED: { color: C.red, label: "Försenad" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {D.goals.length === 0 ? (
        <EmptyState icon="◎" title="Inga mål satta" subtitle="Sätt mål för att hålla teamet fokuserat." cta="+ Nytt mål" />
      ) : (
        D.goals.map((g, i) => {
          const pct = (g.cur / g.tgt) * 100;
          const sc = statusConfig[g.st] ?? statusConfig.ACTIVE;
          return (
            <Card key={i} animate>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>
                  {g.title}
                </div>
                <Badge color={sc.color} size="md">{sc.label}</Badge>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                <Bar pct={pct} color={pct >= 100 ? C.green : C.blue} height={6} />
                <span style={{
                  fontSize: 16, fontWeight: 700, minWidth: 60,
                  fontVariantNumeric: "tabular-nums", color: C.text,
                }}>
                  {g.cur}/{g.tgt}
                </span>
                <span style={{ fontSize: 13, color: C.secondary }}>{g.unit}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: C.secondary }}>
                  Deadline: <span style={{ color: C.text, fontWeight: 500 }}>{g.end}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: C.secondary }}>Beredskap</span>
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: g.ready >= 70 ? C.green : g.ready >= 40 ? C.yellow : C.red,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {g.ready}%
                  </span>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

function ProcessesView({ D }: { D: typeof FALLBACK }) {
  const totalRuns = D.processes.reduce((s, p) => s + p.runs30d, 0);
  const avgDur = D.processes.length > 0
    ? Math.round(D.processes.reduce((s, p) => s + p.avgMin, 0) / D.processes.length)
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { l: "Aktiva processer", v: D.processes.length, c: C.blue },
          { l: "Körningar / 30d", v: totalRuns, c: C.green },
          { l: "Snitt duration", v: `${avgDur} min`, c: C.secondary },
        ].map((s, i) => (
          <div key={i} className="card-animate" style={{
            background: C.surface, borderRadius: 12,
            padding: "18px 20px", boxShadow: shadow.sm,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.secondary }}>{s.l}</div>
            <div style={{
              fontSize: 28, fontWeight: 700, color: s.c,
              fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em", marginTop: 4,
            }}>
              {s.v}
            </div>
          </div>
        ))}
      </div>

      <Card title="Processregister">
        {D.processes.length === 0 ? (
          <EmptyState icon="⟳" title="Inga processer" subtitle="Processer du dokumenterar visas här." />
        ) : (
          D.processes.map((p, i) => (
            <Row key={i} border={i < D.processes.length - 1} clickable>
              <div style={{
                minWidth: 80, fontSize: 11,
                fontFamily: "monospace", color: C.tertiary,
              }}>
                {p.code}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{p.name}</div>
                <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
                  Ägare: {p.owner}
                </div>
              </div>
              <span style={{ fontSize: 12, color: C.secondary, fontVariantNumeric: "tabular-nums" }}>
                {p.runs30d} körn.
              </span>
              <span style={{ fontSize: 12, color: C.secondary, fontVariantNumeric: "tabular-nums" }}>
                {p.avgMin} min
              </span>
              <Badge color={p.ncs > 0 ? C.yellow : C.green}>
                {p.ncs > 0 ? `${p.ncs} NC` : "OK"}
              </Badge>
            </Row>
          ))
        )}
      </Card>
    </div>
  );
}

function NCView({ D }: { D: typeof FALLBACK }) {
  const openCount = D.ncs.filter(n => n.status !== "CLOSED").length;
  const closedCount = D.ncs.filter(n => n.status === "CLOSED").length;
  const avgDays = D.ncs.length > 0
    ? Math.round(D.ncs.reduce((s, n) => s + n.days, 0) / D.ncs.length)
    : 0;
  const majorPlus = D.ncs.filter(n => n.severity === "MAJOR" || n.severity === "CRITICAL").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { l: "Öppna", v: openCount, c: openCount > 0 ? C.red : C.green },
          { l: "Stängda", v: closedCount, c: C.green },
          { l: "Snitt dagar", v: avgDays, c: C.secondary },
          { l: "MAJOR+", v: majorPlus, c: majorPlus > 0 ? C.orange : C.green },
        ].map((s, i) => (
          <div key={i} className="card-animate" style={{
            background: C.surface, borderRadius: 12,
            padding: "18px 20px", boxShadow: shadow.sm,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.secondary }}>{s.l}</div>
            <div style={{
              fontSize: 28, fontWeight: 700, color: s.c,
              fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em", marginTop: 4,
            }}>
              {s.v}
            </div>
          </div>
        ))}
      </div>

      <Card title="Avvikelser">
        {D.ncs.length === 0 ? (
          <EmptyState
            icon="✓"
            title="Inga avvikelser registrerade"
            subtitle="Avvikelser du registrerar visas här med status och åtgärdsplan."
            cta="+ Registrera avvikelse"
          />
        ) : (
          D.ncs.map((n, i) => (
            <div
              key={i}
              className="row-hover"
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "14px 12px",
                borderBottom: i < D.ncs.length - 1 ? `0.5px solid ${C.separator}` : "none",
                borderLeft: `4px solid ${ncBorderColor[n.severity] ?? C.tertiary}`,
                paddingLeft: 16,
                borderRadius: "0 6px 6px 0",
                cursor: "pointer",
                animation: `slideUp 0.15s ease ${i * 0.05}s backwards`,
              }}
            >
              <div style={{ minWidth: 100, fontSize: 11, fontFamily: "monospace", color: C.tertiary }}>
                {n.code}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{n.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: C.secondary }}>{n.who} · {n.days}d</span>
                  <StepIndicator status={n.status} />
                </div>
              </div>
              <Badge color={ncBorderColor[n.severity] ?? C.tertiary}>{n.severity}</Badge>
              <Badge color={n.status === "CLOSED" ? C.green : C.blue}>
                {ncStatusLabel[n.status] ?? n.status}
              </Badge>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

function ImprovementsView({ D }: { D: typeof FALLBACK }) {
  const pdcaColor: Record<string, string> = {
    "PLAN": C.blue, "DO": C.green, "CHECK": C.yellow, "ACT": C.purple, "-": C.tertiary,
  };

  return (
    <Card title="Förbättringar (PDCA)">
      {D.improvements.length === 0 ? (
        <EmptyState
          icon="◐"
          title="Inga förbättringsidéer"
          subtitle="Registrera förbättringsidéer för att driva kontinuerlig förbättring."
          cta="+ Ny idé"
        />
      ) : (
        D.improvements.map((imp, i) => (
          <Row key={i} border={i < D.improvements.length - 1} clickable>
            <div style={{ minWidth: 110, fontSize: 11, fontFamily: "monospace", color: C.tertiary }}>
              {imp.code}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{imp.title}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <Badge color={pdcaColor[imp.pdca] ?? C.tertiary}>{imp.pdca}</Badge>
                <span style={{ fontSize: 11, color: C.secondary }}>
                  Impact: {imp.impact} · Effort: {imp.effort}
                </span>
              </div>
            </div>
            <Badge color={
              imp.status === "IMPLEMENTING" ? C.blue
              : imp.status === "APPROVED" ? C.green
              : C.tertiary
            }>
              {imp.status}
            </Badge>
          </Row>
        ))
      )}
    </Card>
  );
}

function ComplianceView({ D }: { D: typeof FALLBACK }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {D.compliance.map((c, i) => {
        const col = c.pct >= 80 ? C.green : c.pct >= 60 ? C.yellow : C.red;
        return (
          <Card key={i} animate>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{c.standard}</div>
              <Badge color={col} size="md">{c.pct}%</Badge>
            </div>
            <Bar pct={c.pct} color={col} height={6} />
            <div style={{ display: "flex", gap: 20, marginTop: 14, fontSize: 12 }}>
              {[
                { label: "Uppfyllda", v: c.ok, c: C.green },
                { label: "Partiella", v: c.partial, c: C.yellow },
                { label: "Ej uppfyllda", v: c.fail, c: C.red },
                { label: "Ej bedömda", v: c.na, c: C.tertiary },
              ].map((s, j) => (
                <div key={j}>
                  <span style={{ color: C.secondary }}>{s.label} </span>
                  <span style={{ color: s.c, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {s.v}
                  </span>
                </div>
              ))}
              {c.audit && (
                <div style={{ marginLeft: "auto", color: C.secondary }}>
                  Revision: <span style={{ color: C.text, fontWeight: 500 }}>{c.audit}</span>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function RisksView({ D }: { D: typeof FALLBACK }) {
  const sorted = [...D.risks].sort((a, b) => b.score - a.score);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(l => {
          const count = D.risks.filter(r => r.level === l).length;
          return (
            <div key={l} className="card-animate" style={{
              background: C.surface, borderRadius: 12,
              padding: "18px 20px", boxShadow: shadow.sm,
              borderTop: `3px solid ${riskColor[l]}`,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: riskColor[l],
                textTransform: "uppercase", letterSpacing: "0.08em",
              }}>
                {l}
              </div>
              <div style={{
                fontSize: 28, fontWeight: 700, color: riskColor[l],
                fontVariantNumeric: "tabular-nums", marginTop: 6,
              }}>
                {count}
              </div>
            </div>
          );
        })}
      </div>

      <Card title="Riskregister">
        {sorted.map((r, i) => (
          <Row key={i} border={i < sorted.length - 1} clickable>
            <div style={{ minWidth: 90, fontSize: 11, fontFamily: "monospace", color: C.tertiary }}>
              {r.code}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{r.title}</div>
              <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>{r.mit}</div>
            </div>
            <Badge color={C.tertiary}>{r.cat}</Badge>
            <div style={{ textAlign: "center", minWidth: 44 }}>
              <div style={{
                fontSize: 16, fontWeight: 700, color: riskColor[r.level],
                fontVariantNumeric: "tabular-nums",
              }}>
                {r.score}
              </div>
              <div style={{ fontSize: 9, color: C.tertiary, fontVariantNumeric: "tabular-nums" }}>
                {r.prob}×{r.imp}
              </div>
            </div>
            <Badge color={riskColor[r.level]}>{r.level}</Badge>
          </Row>
        ))}
      </Card>
    </div>
  );
}

function ChatView({ D }: { D: typeof FALLBACK }) {
  const [chatCh, setChatCh] = useState("SALES");
  const channels = ["SALES", "PRODUCT", "OPS", "FINANCE", "DECISIONS"];
  const msgs = D.msgs.filter(m => m.ch === chatCh);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "calc(100vh - 130px)" }}>
      {/* Channel tabs */}
      <div style={{ display: "flex", gap: 6 }}>
        {channels.map(ch => (
          <button
            key={ch}
            onClick={() => setChatCh(ch)}
            className="clickable"
            style={{
              background: chatCh === ch ? C.blue : C.surface,
              color: chatCh === ch ? "#FFF" : C.secondary,
              border: `0.5px solid ${chatCh === ch ? C.blue : C.border}`,
              borderRadius: 20, padding: "6px 14px",
              fontSize: 12, fontWeight: 500, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            #{ch.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Message list */}
      <div style={{
        flex: 1, background: C.surface, borderRadius: 12,
        boxShadow: shadow.sm, padding: "16px 20px",
        overflowY: "auto",
        display: "flex", flexDirection: "column-reverse", gap: 14,
      }}>
        {msgs.length === 0 ? (
          <EmptyState icon="💬" title={`Inga meddelanden i #${chatCh.toLowerCase()}`} />
        ) : (
          msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: m.s ? C.blue + "15" : C.fill,
                color: m.s ? C.blue : C.text,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 600, flexShrink: 0,
              }}>
                {m.s ? "⚙" : m.u[0]}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: m.s ? C.blue : C.text }}>{m.u}</div>
                <div style={{ fontSize: 13, color: C.text, marginTop: 2, lineHeight: 1.4 }}>{m.t}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder={`Skriv i #${chatCh.toLowerCase()}…`}
          style={{
            flex: 1, background: C.surface,
            border: `1px solid ${C.border}`, borderRadius: 10,
            padding: "10px 14px", fontSize: 13, color: C.text,
            outline: "none", boxShadow: shadow.sm, fontFamily: "inherit",
          }}
        />
        <Btn variant="primary">Skicka</Btn>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("admin");
  const [collapsed, setCollapsed] = useState(false);

  const { data: apiDashboard } = useApi<typeof FALLBACK>("/api/dashboards/management");
  const { data: apiNCs } = useApi<{ id: string; title: string; severity: string; status: string; code?: string; who?: string; days?: number }[]>("/api/nc");
  const { data: apiRisks } = useApi<{ id: string; title: string; category: string; probability: number; impact: number; score: number; level: string; mitigation_plan: string; code?: string }[]>("/api/risks");
  const { data: apiProcesses } = useApi<{ id: string; name: string; category: string; code?: string }[]>("/api/processes");
  const { data: apiPerf } = useApi<{ process_id: string; process_name: string; execution_count: number; avg_duration_ms: number; nc_count: number }[]>("/api/processes/performance");
  const { data: apiImprovements } = useApi<{ id: string; title: string; status: string; pdca_phase: string; code?: string }[]>("/api/improvements");
  const { data: apiCompliance } = useApi<{ id: string; name: string; completion_pct: number; total_requirements: number; met_requirements: number }[]>("/api/compliance");

  const ncs = (apiNCs && apiNCs.length > 0)
    ? apiNCs.map((n, i) => ({ code: n.code ?? `NC-${i + 1}`, title: n.title, severity: n.severity, status: n.status, days: n.days ?? 0, who: n.who ?? "—" }))
    : FALLBACK.ncs;

  const risks = (apiRisks && apiRisks.length > 0)
    ? apiRisks.map((r, i) => ({ code: r.code ?? `RISK-${i + 1}`, title: r.title, cat: r.category, prob: r.probability, imp: r.impact, score: r.score, level: r.level, mit: r.mitigation_plan }))
    : FALLBACK.risks;

  const improvements = (apiImprovements && apiImprovements.length > 0)
    ? apiImprovements.map((imp, i) => ({ code: imp.code ?? `IMP-${i + 1}`, title: imp.title, status: imp.status, pdca: imp.pdca_phase, impact: 0, effort: 0 }))
    : FALLBACK.improvements;

  const compliance = (apiCompliance && apiCompliance.length > 0)
    ? apiCompliance.map((c) => ({ standard: c.name, pct: c.completion_pct, total: c.total_requirements, ok: c.met_requirements, partial: 0, fail: 0, na: 0, audit: "" }))
    : FALLBACK.compliance;

  const processes = (apiPerf && apiPerf.length > 0)
    ? apiPerf.map((p, i) => ({ code: `PROC-${String(i + 1).padStart(3, "0")}`, name: p.process_name, runs30d: p.execution_count, avgMin: Math.round(p.avg_duration_ms / 60000), ncs: p.nc_count, owner: "—" }))
    : FALLBACK.processes;

  const D = { ...FALLBACK, ncs, risks, improvements, compliance, processes };

  const { t } = useTranslation();
  const viewTitles: Record<string, string> = {
    admin: t('nav.overview'),
    sales: t('nav.deals'),
    finance: t('nav.reports'),
    tasks: t('nav.tasks'),
    capability: t('nav.capabilities'),
    development: t('nav.development'),
    goals: t('nav.goals'),
    processes: t('nav.processes'),
    nc: t('nav.nonConformances'),
    improvements: "PDCA",
    compliance: t('nav.compliance'),
    risks: t('nav.risks'),
    chat: "Chatt",
    learning: t('nav.learning'),
  };

  const sidebarWidth = collapsed ? 60 : 220;

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{
        width: "100%", minHeight: "100vh",
        background: C.bg,
        fontFamily: "Inter, -apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif",
        color: C.text,
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}>
        <Sidebar
          view={view}
          setView={setView}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          userName={D.user.full_name}
        />

        <div style={{ marginLeft: sidebarWidth, flex: 1, display: "flex", flexDirection: "column", transition: "margin-left 0.2s ease" }}>
          <TopBar title={viewTitles[view] ?? view} />

          <div style={{ flex: 1, padding: "24px 28px 60px" }}>
            {view === "admin" && <AdminView D={D} />}
            {view === "sales" && <SalesView D={D} />}
            {view === "finance" && <FinanceView D={D} />}
            {view === "tasks" && <TasksView D={D} />}
            {view === "capability" && <CapabilityView D={D} />}
            {view === "development" && <DevelopmentView D={D} />}
            {view === "goals" && <GoalsView D={D} />}
            {view === "processes" && <ProcessesView D={D} />}
            {view === "nc" && <NCView D={D} />}
            {view === "improvements" && <ImprovementsView D={D} />}
            {view === "compliance" && <ComplianceView D={D} />}
            {view === "risks" && <RisksView D={D} />}
            {view === "chat" && <ChatView D={D} />}
            {view === "learning" && <LearningModule user={D.user as any} />}
          </div>
        </div>
      </div>
    </>
  );
}
