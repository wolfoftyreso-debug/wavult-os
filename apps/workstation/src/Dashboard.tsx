import { useState } from "react";
import { useApi } from "./useApi";
import LearningModule from "./LearningModule";
import DMSModule from "./DMSModule";
import SpaghettiModule from "./SpaghettiModule";
import { useTranslation, LanguageSwitcher, formatCurrency, formatDate } from "@pixdrift/i18n";

// ─── Design tokens — Apple HIG precision ──────────────────────────────────────
const C = {
  bg:        "#F2F2F7",   // iOS systemGray6
  surface:   "#FFFFFF",
  border:    "#D1D1D6",   // iOS systemGray4
  text:      "#000000",   // pure black
  secondary: "#8E8E93",   // iOS systemGray
  tertiary:  "#C7C7CC",   // iOS systemGray3
  blue:      "#007AFF",
  green:     "#34C759",
  orange:    "#FF9500",
  red:       "#FF3B30",
  purple:    "#AF52DE",
  fill:      "#F2F2F7",
  inset:     "#E5E5EA",
};

// Single shadow — only this, nothing more
const shadow = "0 1px 3px rgba(0,0,0,0.06)";

// ─── Global styles ─────────────────────────────────────────────────────────────
const globalStyles = `
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

  .card-animate { animation: slideUp 0.2s ease forwards; }
  .fade-in { animation: fadeIn 0.15s ease forwards; }

  .nav-item {
    transition: background 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                color 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  .nav-item:hover:not(.active) { background: rgba(60,60,67,0.08) !important; }
  .nav-item.active { background: ${C.blue} !important; color: #FFFFFF !important; font-weight: 600 !important; }
  .nav-item.active svg { stroke: #FFFFFF; }

  .row-hover:hover { background: rgba(60,60,67,0.04); transition: background 0.08s ease; }
  .btn-primary:hover { background: #0066D6 !important; }
  .btn-primary:active { transform: scale(0.98); }
  .btn-secondary:hover { background: ${C.inset} !important; }

  input:focus { outline: 2px solid ${C.blue} !important; outline-offset: 0px !important; }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: ${C.tertiary}; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusColor = (s: string) =>
  s === "GREEN" ? C.green : s === "YELLOW" ? C.orange : s === "RED" ? C.red : C.tertiary;
const levelColor = (l: string) =>
  l === "L5" ? C.blue : l === "L4" ? C.green : l === "L3" ? C.orange : l === "L2" ? C.purple : C.red;
const formatEur = (n: number) => `€${(n || 0).toLocaleString("sv-SE")}`;
const ncBorderColor: Record<string, string> = {
  CRITICAL: C.red, MAJOR: C.orange, MINOR: C.orange, OBSERVATION: C.tertiary,
};
const ncStatusLabel: Record<string, string> = {
  OPEN: "Öppen", ANALYZING: "Analys", ACTION_PLANNED: "Planerad",
  IMPLEMENTING: "Genomförs", VERIFYING: "Verifieras", CLOSED: "Stängd",
};
const riskColor: Record<string, string> = {
  CRITICAL: C.red, HIGH: C.orange, MEDIUM: C.orange, LOW: C.green,
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

// ─── Inline SVG Icons — Heroicons outline, 16×16, strokeWidth 1.5 ─────────────
const Icons = {
  Grid: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Briefcase: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="12.01"/>
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Person: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Flow: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  ),
  Alert: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Shield: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Ledger: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Chart: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  Globe: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  Star: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Target: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Book: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  Bank: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="22" x2="21" y2="22"/>
      <line x1="6" y1="18" x2="6" y2="11"/>
      <line x1="10" y1="18" x2="10" y2="11"/>
      <line x1="14" y1="18" x2="14" y2="11"/>
      <line x1="18" y1="18" x2="18" y2="11"/>
      <polygon points="12 2 20 7 4 7"/>
    </svg>
  ),
  Car: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l3-4h10l3 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
      <circle cx="7.5" cy="17" r="2.5"/>
      <circle cx="16.5" cy="17" r="2.5"/>
    </svg>
  ),
  Spaghetti: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6 C6 6, 8 14, 12 10 S18 4, 21 8"/>
      <path d="M3 12 C7 10, 9 18, 13 14 S17 8, 21 14"/>
      <path d="M3 18 C5 16, 9 20, 13 18 S19 12, 21 18"/>
    </svg>
  ),
  Receipt: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l3-3 2 2 3-3 2 2 3-3 2 2V2z"/>
      <line x1="9" y1="9" x2="15" y2="9"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  Bell: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  Development: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  PDCA: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  ),
  Compliance: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  Chat: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
};

// ─── Nav sections ──────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { id: "overview", icon: <Icons.Grid />, label: "Översikt" },
    ],
  },
  {
    label: "ARBETE",
    items: [
      { id: "deals", icon: <Icons.Briefcase />, label: "Affärer" },
      { id: "tasks", icon: <Icons.Check />, label: "Uppgifter" },
      { id: "goals", icon: <Icons.Target />, label: "Mål" },
      { id: "chat", icon: <Icons.Chat />, label: "Chatt" },
    ],
  },
  {
    label: "KVALITET",
    items: [
      { id: "processes", icon: <Icons.Flow />, label: "Processer" },
      { id: "nc", icon: <Icons.Alert />, label: "Avvikelser" },
      { id: "improvements", icon: <Icons.PDCA />, label: "PDCA" },
      { id: "compliance", icon: <Icons.Compliance />, label: "Compliance" },
      { id: "risks", icon: <Icons.Shield />, label: "Risker" },
    ],
  },
  {
    label: "EKONOMI",
    items: [
      { id: "finance", icon: <Icons.Ledger />, label: "Huvudbok" },
      { id: "reports", icon: <Icons.Chart />, label: "Rapporter" },
    ],
  },
  {
    label: "KOMPETENS",
    items: [
      { id: "capability", icon: <Icons.Star />, label: "Kompetenser" },
      { id: "development", icon: <Icons.Development />, label: "Utveckling" },
      { id: "learning", icon: <Icons.Book />, label: "Utbildning" },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { id: "dms",       icon: <Icons.Car />,       label: "DMS Bil"     },
      { id: "spaghetti", icon: <Icons.Spaghetti />, label: "Flödesanalys" },
    ],
  },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = ({ width = "100%", height = "14px", radius = 4 }: { width?: string; height?: string; radius?: number }) => (
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
  <div style={{
    background: C.surface, borderRadius: 10, padding: "16px 20px",
    border: `0.5px solid ${C.border}`, boxShadow: shadow,
  }}>
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
    style={{
      background: C.surface,
      borderRadius: 10,
      padding: "20px",
      border: `0.5px solid ${C.border}`,
      boxShadow: shadow,
      ...st,
    }}
  >
    {title && (
      <div style={{
        fontSize: 13, fontWeight: 600, color: C.text,
        marginBottom: 16,
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
      padding: "8px 0",
      borderBottom: border ? `0.5px solid ${C.fill}` : "none",
      cursor: clickable ? "pointer" : "default",
    }}
  >
    {children}
  </div>
);

const Bar = ({ pct, color = C.blue, height = 3, animate = true }: {
  pct: number; color?: string; height?: number; animate?: boolean;
}) => (
  <div style={{ flex: 1, height, background: C.fill, borderRadius: 2, overflow: "hidden", minWidth: 40 }}>
    <div style={{
      height: "100%",
      width: `${Math.min(100, Math.max(0, pct))}%`,
      background: color,
      borderRadius: 2,
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
    destructive: { background: C.red + "10", color: C.red, border: `0.5px solid ${C.red}30` },
  };
  return (
    <button
      type="button"
      className={`btn-${variant}`}
      onClick={onClick}
      style={{
        height: size === "sm" ? 32 : 36,
        padding: size === "sm" ? "0 12px" : "0 16px",
        borderRadius: 8,
        fontSize: 13,
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
    justifyContent: "center", padding: "48px 24px", gap: 8,
    animation: "fadeIn 0.2s ease",
  }}>
    {icon && <div style={{ fontSize: 32, opacity: 0.25 }}>{icon}</div>}
    <div style={{ fontSize: 13, fontWeight: 600, color: C.secondary }}>{title}</div>
    {subtitle && <div style={{ fontSize: 12, color: C.tertiary, textAlign: "center", maxWidth: 280 }}>{subtitle}</div>}
    {cta && <Btn variant="primary" size="sm" style={{ marginTop: 8 }}>{cta}</Btn>}
  </div>
);

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KPIData { name: string; val: number; target: number; unit: string; status: string; trend: string }

const KPI = ({ k, loading = false }: { k: KPIData; loading?: boolean }) => {
  if (loading) return <SkeletonCard />;
  const trendUp = k.trend === "UP";
  const trendColor = trendUp ? C.green : k.trend === "DOWN" ? C.red : C.tertiary;
  const pct = k.target > 0 ? Math.min(100, (k.val / k.target) * 100) : 0;

  return (
    <div
      className="card-animate"
      style={{
        background: C.surface,
        borderRadius: 10,
        border: `0.5px solid ${C.border}`,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        boxShadow: shadow,
      }}
    >
      {/* Label */}
      <div style={{ fontSize: 12, color: C.secondary, fontWeight: 500 }}>{k.name}</div>

      {/* Value */}
      <div style={{
        fontSize: 28, fontWeight: 700, color: C.text,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.03em",
        lineHeight: 1.15,
      }}>
        {k.unit === "EUR" ? formatEur(k.val) : k.val}
        {k.unit === "mån" && <span style={{ fontSize: 14, fontWeight: 500 }}> mån</span>}
      </div>

      {/* Trend */}
      {k.trend !== "STABLE" && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: trendColor, fontWeight: 600 }}>
            {trendUp ? "↑" : "↓"}
          </span>
          <span style={{ fontSize: 11, color: C.tertiary }}>
            Mål: {k.unit === "EUR" ? formatEur(k.target) : k.target}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ marginTop: 8 }}>
        <div style={{ height: 3, background: C.fill, borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            width: `${pct}%`, height: "100%",
            background: C.blue, borderRadius: 2,
          }} />
        </div>
      </div>
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
  name, status, size = 32
}: {
  name: string; status?: string; size?: number;
}) => {
  const borderColor = status ? statusColor(status) : C.border;
  const bgColor = status ? statusColor(status) + "22" : C.blue + "15";
  const textColor = status ? statusColor(status) : C.blue;
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: bgColor, color: textColor,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 600,
        border: `2px solid ${borderColor}`,
      }}>
        {name[0]}
      </div>
      {status && (
        <div style={{
          position: "absolute", bottom: -1, right: -1,
          width: 8, height: 8, borderRadius: "50%",
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
            width: 20, height: 3, borderRadius: 2,
            background: i <= idx ? C.blue : C.fill,
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

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  view, setView, userName, onLogout
}: {
  view: string;
  setView: (v: string) => void;
  userName: string;
  onLogout?: () => void;
}) {
  return (
    <div style={{
      width: 260,
      background: "#FFFFFF",
      borderRight: "0.5px solid rgba(60,60,67,0.29)",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      position: "fixed",
      top: 0, left: 0, bottom: 0,
      zIndex: 200,
      overflowY: "auto",
    }}>
      {/* Logo area */}
      <div style={{
        height: 52,
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        borderBottom: "0.5px solid rgba(60,60,67,0.29)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "linear-gradient(135deg, #007AFF, #5856D6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>p</span>
          </div>
          <span style={{
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: "-0.41px",
            color: "#000000",
          }}>
            pixdrift
          </span>
        </div>
      </div>

      {/* Nav content */}
      <nav style={{
        flex: 1,
        overflowY: "auto",
        padding: "8px 0",
      }}>
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} style={{ marginTop: section.label ? 8 : 4, marginBottom: 4 }}>
            {section.label && (
              <div style={{
                fontSize: 13,
                fontWeight: 400,
                color: "#8E8E93",
                padding: "20px 16px 6px 16px",
                letterSpacing: 0,
              }}>
                {section.label}
              </div>
            )}
            {section.items.map(item => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item ${active ? "active" : ""}`}
                  onClick={() => setView(item.id)}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "calc(100% - 16px)",
                    height: 44,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: "none",
                    background: active ? "#007AFF" : "transparent",
                    color: active ? "#FFFFFF" : "#000000",
                    fontSize: 17,
                    fontWeight: active ? 600 : 400,
                    letterSpacing: "-0.41px",
                    cursor: "pointer",
                    textAlign: "left",
                    marginBottom: 2,
                    marginLeft: 8,
                    fontFamily: "inherit",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ width: 16, height: 16, flexShrink: 0, display: "flex", alignItems: "center" }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User area */}
      <div style={{
        padding: "12px 16px",
        borderTop: "0.5px solid rgba(60,60,67,0.29)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #007AFF, #5856D6)",
          color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, fontWeight: 600, flexShrink: 0,
        }}>
          {userName[0]}
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 400, letterSpacing: "-0.41px", color: "#000000" }}>{userName}</div>
          <div style={{ fontSize: 13, color: "#8E8E93" }}>Admin</div>
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title="Logga ut"
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
              color: "#8E8E93",
              fontSize: 16,
              lineHeight: 1,
              fontFamily: "inherit",
            }}
          >
            ⏏
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
function TopBar({ title, onNew, userName = "Erik" }: { title: string; onNew?: () => void; userName?: string }) {
  const { t, locale } = useTranslation();
  return (
    <div style={{
      height: 52,
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: "0.5px solid rgba(60,60,67,0.29)",
      display: "flex",
      alignItems: "center",
      padding: "0 20px",
      gap: 16,
      flexShrink: 0,
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Page title */}
      <div style={{
        fontSize: 17,
        fontWeight: 600,
        color: "#000000",
        letterSpacing: "-0.41px",
      }}>
        {title}
      </div>

      {/* Actions — right */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
        <LanguageSwitcher />
        <button
          type="button"
          aria-label="Notifikationer"
          style={{
            width: 44, height: 44, borderRadius: 22,
            background: "transparent", border: "none",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#007AFF",
            transition: "background 0.1s",
          }}>
          <Icons.Bell />
        </button>
        {onNew && (
          <Btn variant="primary" onClick={onNew} size="sm">+ Ny</Btn>
        )}
      </div>
    </div>
  );
}

// ─── Views ─────────────────────────────────────────────────────────────────────

function OverviewView({ D }: { D: typeof FALLBACK }) {
  const stageColors: Record<string, string> = {
    NEW: C.tertiary, QUALIFIED: C.blue, DEMO: C.purple, OFFER: C.orange, WON: C.green,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Large title */}
      <div style={{
        fontSize: 34,
        fontWeight: 700,
        letterSpacing: "-0.41px",
        color: "#000000",
        padding: "8px 4px 2px",
      }}>
        {getGreeting()}, {D.user.full_name}
      </div>
      <div style={{
        fontSize: 15,
        color: "#8E8E93",
        padding: "0 4px 20px",
        letterSpacing: "-0.24px",
      }}>
        {getSwedishDate()} · {D.tasks.filter(t => t.st !== "DONE").length} öppna uppgifter · {D.ncs.filter(n => n.status !== "CLOSED").length} aktiva avvikelser
      </div>

      {/* KPI — Inset Grouped List (Aktier-stil) */}
      <div style={{ fontSize: 13, fontWeight: 400, color: "#8E8E93", padding: "0 4px 8px", letterSpacing: "-0.08px" }}>
        Nyckeltal
      </div>
      <div style={{
        margin: "0 0 32px 0",
        background: "#FFFFFF",
        borderRadius: 10,
        overflow: "hidden",
      }}>
        {D.kpis.map((k, i) => {
          const trendUp = k.trend === "UP";
          const trendColor = trendUp ? C.green : k.trend === "DOWN" ? C.red : C.tertiary;
          const trendArrow = trendUp ? "↑" : k.trend === "DOWN" ? "↓" : "→";
          const pct = k.target > 0 ? Math.min(100, Math.round((k.val / k.target) * 100)) : 0;
          const statusCol = k.status === "GREEN" ? C.green : k.status === "YELLOW" ? C.orange : C.red;
          return (
            <div
              key={i}
              className="row-hover"
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: i < D.kpis.length - 1 ? "0.5px solid rgba(60,60,67,0.29)" : "none",
                minHeight: 52,
                cursor: "pointer",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 400, color: "#000000", letterSpacing: "-0.41px" }}>{k.name}</div>
                <div style={{ fontSize: 13, color: "#8E8E93" }}>Mål: {k.unit === "EUR" ? formatEur(k.target) : k.target}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{
                  fontSize: 17, fontWeight: 600, color: statusCol,
                  letterSpacing: "-0.41px", fontVariantNumeric: "tabular-nums",
                }}>
                  {k.unit === "EUR" ? formatEur(k.val) : k.val}
                  {k.unit === "mån" && <span style={{ fontSize: 13, fontWeight: 400 }}> mån</span>}
                </div>
                <div style={{ fontSize: 13, color: trendColor }}>{trendArrow} {pct}%</div>
              </div>
              <div style={{ marginLeft: 8, color: "#C7C7CC", fontSize: 18 }}>›</div>
            </div>
          );
        })}
      </div>

      {/* Main + Side layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 0.54fr", gap: 24, alignItems: "start" }}>
        {/* Main column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {/* Aktiva affärer */}
          <div style={{ fontSize: 13, fontWeight: 400, color: "#8E8E93", padding: "0 4px 8px", letterSpacing: "-0.08px" }}>
            Aktiva affärer
          </div>
          <div style={{
            margin: "0 0 32px 0",
            background: "#FFFFFF",
            borderRadius: 10,
            overflow: "hidden",
          }}>
            {D.pipeline.map((p, i) => {
              const col = stageColors[p.st] ?? C.tertiary;
              return (
                <div
                  key={i}
                  className="row-hover"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 16px",
                    borderBottom: i < D.pipeline.length - 1 ? "0.5px solid rgba(60,60,67,0.29)" : "none",
                    minHeight: 44,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, flexShrink: 0 }} />
                    <span style={{ fontSize: 17, fontWeight: 400, color: "#000000", letterSpacing: "-0.41px" }}>{p.st}</span>
                  </div>
                  <span style={{ fontSize: 17, fontWeight: 400, color: "#000000", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.41px", marginRight: 16 }}>
                    {formatEur(p.eur)}
                  </span>
                  <span style={{ fontSize: 13, color: "#8E8E93", fontVariantNumeric: "tabular-nums", marginRight: 8 }}>
                    {p.deals}
                  </span>
                  <div style={{ color: "#C7C7CC", fontSize: 18 }}>›</div>
                </div>
              );
            })}
            {/* Total row */}
            <div style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 16px",
              borderTop: "0.5px solid rgba(60,60,67,0.29)",
              background: "#FAFAFA",
            }}>
              <span style={{ fontSize: 17, fontWeight: 600, color: "#000000", letterSpacing: "-0.41px", flex: 1 }}>Totalt</span>
              <span style={{
                fontSize: 17, fontWeight: 700, color: "#007AFF",
                fontVariantNumeric: "tabular-nums", letterSpacing: "-0.41px",
              }}>
                {formatEur(D.pipeline.reduce((s, p) => s + p.eur, 0))}
              </span>
            </div>
          </div>

          {/* Senaste avvikelser */}
          <div style={{ fontSize: 13, fontWeight: 400, color: "#8E8E93", padding: "0 4px 8px", letterSpacing: "-0.08px" }}>
            Senaste avvikelser
          </div>
          <div style={{
            margin: "0 0 32px 0",
            background: "#FFFFFF",
            borderRadius: 10,
            overflow: "hidden",
          }}>
            {D.ncs.filter(n => n.status !== "CLOSED").slice(0, 3).length === 0 ? (
              <EmptyState icon="✓" title="Inga aktiva avvikelser" />
            ) : (
              D.ncs.filter(n => n.status !== "CLOSED").slice(0, 3).map((n, i, arr) => {
                const severityColor = ncBorderColor[n.severity] ?? C.tertiary;
                return (
                  <div
                    key={i}
                    className="row-hover"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px 16px",
                      gap: 12,
                      borderBottom: i < arr.length - 1 ? "0.5px solid rgba(60,60,67,0.29)" : "none",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{
                      width: 22, height: 22,
                      borderRadius: "50%",
                      background: severityColor,
                      flexShrink: 0,
                      marginTop: 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>!</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 400, color: "#000000", letterSpacing: "-0.41px" }}>{n.title}</div>
                      <div style={{ fontSize: 13, color: "#8E8E93", marginTop: 2 }}>
                        {n.code} · {n.who} · {n.days}d · {ncStatusLabel[n.status] ?? n.status}
                      </div>
                    </div>
                    <div style={{ color: "#C7C7CC", fontSize: 18, marginTop: 2 }}>›</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Side column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {/* Teamstatus */}
          <div style={{ fontSize: 13, fontWeight: 400, color: "#8E8E93", padding: "0 4px 8px", letterSpacing: "-0.08px" }}>
            Teamstatus
          </div>
          <div style={{
            margin: "0 0 32px 0",
            background: "#FFFFFF",
            borderRadius: 10,
            overflow: "hidden",
          }}>
            {D.team.map((member, i) => {
              const sc = statusColor(member.status);
              return (
                <div
                  key={i}
                  className="row-hover"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 16px",
                    gap: 12,
                    minHeight: 52,
                    borderBottom: i < D.team.length - 1 ? "0.5px solid rgba(60,60,67,0.29)" : "none",
                    cursor: "pointer",
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: sc + "22",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 600, color: sc, flexShrink: 0,
                  }}>
                    {member.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 400, color: "#000000", letterSpacing: "-0.41px" }}>{member.name}</div>
                    <div style={{ fontSize: 13, color: "#8E8E93" }}>{member.role} · {member.tasks} uppgifter</div>
                  </div>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: sc, flexShrink: 0,
                  }} />
                </div>
              );
            })}
          </div>

          {/* Beslutlogg */}
          <div style={{ fontSize: 13, fontWeight: 400, color: "#8E8E93", padding: "0 4px 8px", letterSpacing: "-0.08px" }}>
            Beslutlogg
          </div>
          <div style={{
            margin: "0 0 32px 0",
            background: "#FFFFFF",
            borderRadius: 10,
            overflow: "hidden",
          }}>
            {D.decisions.map((d, i) => (
              <div
                key={i}
                className="row-hover"
                style={{
                  padding: "12px 16px",
                  borderBottom: i < D.decisions.length - 1 ? "0.5px solid rgba(60,60,67,0.29)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 400, color: "#000000", letterSpacing: "-0.41px" }}>{d.title}</div>
                  <div style={{ fontSize: 13, color: "#8E8E93", marginTop: 2 }}>{d.rat}</div>
                  <div style={{ fontSize: 13, color: "#C7C7CC", marginTop: 4 }}>
                    {d.by} · {d.date}
                  </div>
                </div>
                <div style={{ color: "#C7C7CC", fontSize: 18, marginTop: 2 }}>›</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SalesView({ D }: { D: typeof FALLBACK }) {
  const stageColors: Record<string, string> = {
    NEW: C.tertiary, QUALIFIED: C.blue, DEMO: C.purple, OFFER: C.orange, WON: C.green,
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
                style={{
                  flex: 1, background: col + "08",
                  borderRadius: 10, padding: "16px",
                  border: `0.5px solid ${col}20`,
                  cursor: "pointer",
                  animation: `slideUp 0.2s ease ${i * 0.06}s backwards`,
                }}
              >
                <div style={{
                  fontSize: 11, fontWeight: 600, color: col,
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
                <div style={{ marginTop: 8 }}>
                  <Bar pct={(p.eur / maxEur) * 100} color={col} height={3} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between",
          padding: "12px 0 0", borderTop: `0.5px solid ${C.border}`,
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
              fontSize: 11, fontWeight: 600, color: C.secondary,
              textTransform: "uppercase", letterSpacing: "0.06em",
              borderBottom: `0.5px solid ${C.border}`,
              textAlign: i >= 2 ? "right" : "left",
            }}>
              {h}
            </div>
          ))}

          {D.tb.rows.map((r, i) => [
            <div key={`c${i}`} style={{
              padding: "8px 0",
              fontSize: 12, color: C.secondary, fontFamily: "monospace",
              borderBottom: `0.5px solid ${C.fill}`,
              fontVariantNumeric: "tabular-nums",
            }}>
              {r.code}
            </div>,
            <div key={`n${i}`} style={{
              padding: "8px 0",
              fontSize: 13, fontWeight: 500, color: C.text,
              borderBottom: `0.5px solid ${C.fill}`,
            }}>
              {r.name}
            </div>,
            <div key={`d${i}`} style={{
              padding: "8px 0",
              textAlign: "right",
              fontSize: 13, fontFamily: "monospace",
              fontVariantNumeric: "tabular-nums",
              color: r.d > 0 ? C.text : C.tertiary,
              borderBottom: `0.5px solid ${C.fill}`,
            }}>
              {r.d > 0 ? formatEur(r.d) : "—"}
            </div>,
            <div key={`k${i}`} style={{
              padding: "8px 0",
              textAlign: "right",
              fontSize: 13, fontFamily: "monospace",
              fontVariantNumeric: "tabular-nums",
              color: r.c > 0 ? C.text : C.tertiary,
              borderBottom: `0.5px solid ${C.fill}`,
            }}>
              {r.c > 0 ? formatEur(r.c) : "—"}
            </div>,
          ])}

          <div />
          <div style={{
            padding: "12px 0",
            fontSize: 13, fontWeight: 700, color: C.text,
            borderTop: `0.5px solid ${C.border}`,
          }}>
            Totalt
          </div>
          <div style={{
            padding: "12px 0",
            textAlign: "right",
            fontSize: 13, fontWeight: 700, color: C.blue,
            fontFamily: "monospace", fontVariantNumeric: "tabular-nums",
            borderTop: `0.5px solid ${C.border}`,
          }}>
            {formatEur(D.tb.d)}
          </div>
          <div style={{
            padding: "12px 0",
            textAlign: "right",
            fontSize: 13, fontWeight: 700, color: C.blue,
            fontFamily: "monospace", fontVariantNumeric: "tabular-nums",
            borderTop: `0.5px solid ${C.border}`,
          }}>
            {formatEur(D.tb.c)}
          </div>
        </div>

        {D.tb.ok && (
          <div style={{
            marginTop: 16, padding: "10px 14px",
            background: C.green + "12", borderRadius: 8,
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

function ReportsView({ D }: { D: typeof FALLBACK }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title="Rapporter">
        <EmptyState icon="📊" title="Rapporter kommer snart" subtitle="Pipeline-rapporter, intäktsrapporter och mer." />
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { l: "Totalt", v: sorted.length, c: C.text },
          { l: "Pågående", v: sorted.filter(t => t.st === "IN_PROGRESS").length, c: C.blue },
          { l: "Att göra", v: sorted.filter(t => t.st === "TODO").length, c: C.secondary },
        ].map((s, i) => (
          <div key={i} className="card-animate" style={{
            background: C.surface, borderRadius: 10,
            padding: "16px 20px",
            border: `0.5px solid ${C.border}`,
            boxShadow: shadow,
          }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.secondary }}>{s.l}</div>
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
        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 96px 80px 96px",
          padding: "0 0 8px 0",
          borderBottom: `0.5px solid ${C.border}`,
          marginBottom: 4,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.secondary }}>UPPGIFT</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.secondary }}>VEM</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.secondary, textAlign: "right" }}>DEADLINE</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.secondary, textAlign: "right" }}>STATUS</span>
        </div>
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
                  display: "grid",
                  gridTemplateColumns: "1fr 96px 80px 96px",
                  padding: "8px 0",
                  borderBottom: i < sorted.length - 1 ? `0.5px solid ${C.fill}` : "none",
                  alignItems: "center",
                  borderLeft: `3px solid ${pc.color}`,
                  paddingLeft: 8,
                  cursor: "pointer",
                  animation: `slideUp 0.15s ease ${i * 0.04}s backwards`,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{t.title}</div>
                <div style={{ fontSize: 13, color: C.secondary }}>{t.who}</div>
                <span style={{
                  fontSize: 12, color: overdue ? C.red : C.tertiary,
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: overdue ? 600 : 400,
                  textAlign: "right",
                }}>
                  {overdue ? "⚠ " : ""}{t.dl}
                </span>
                <div style={{ textAlign: "right" }}>
                  <Badge color={t.st === "IN_PROGRESS" ? C.blue : C.tertiary}>
                    {t.st === "IN_PROGRESS" ? "Pågående" : "Att göra"}
                  </Badge>
                </div>
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
            <div style={{ padding: "8px 0", fontSize: 11, color: C.secondary, fontWeight: 600, letterSpacing: "0.04em", borderBottom: `0.5px solid ${C.border}` }}>
              FÖRMÅGA
            </div>
            {["Erik", "Leon", "Johan", "Dennis", "Winston"].map(n => (
              <div key={n} style={{
                padding: "8px 0", fontSize: 11, color: C.secondary,
                textAlign: "center", fontWeight: 600,
                borderBottom: `0.5px solid ${C.border}`,
              }}>
                {n}
              </div>
            ))}

            {D.heatmap.map((r, i) => [
              <div key={`n${i}`} style={{
                padding: "8px 0",
                borderBottom: `0.5px solid ${C.fill}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{r.cap}</div>
                <div style={{ fontSize: 11, color: C.tertiary, marginTop: 1 }}>{r.dom}</div>
              </div>,
              ...["E", "L", "J", "Dn", "W"].map(p => (
                <div key={`${i}${p}`} style={{
                  padding: "8px 0",
                  borderBottom: `0.5px solid ${C.fill}`,
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
              <Avatar name={g.who} size={32} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{g.who}</div>
                <div style={{ fontSize: 12, color: C.secondary }}>{g.cap}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Dot level={g.cur} />
                <span style={{ fontSize: 12, color: C.tertiary }}>→</span>
                <Dot level={g.tgt} />
              </div>
              <Badge color={C.orange}>+{g.gap}</Badge>
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
                  width: 3, height: 32, borderRadius: 2,
                  background: a.st === "ACTIVE" ? C.blue : C.tertiary,
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{a.title}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
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
    AT_RISK: { color: C.orange, label: "Risk" },
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

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                <Bar pct={pct} color={pct >= 100 ? C.green : C.blue} height={6} />
                <span style={{
                  fontSize: 16, fontWeight: 700, minWidth: 56,
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
                    color: g.ready >= 70 ? C.green : g.ready >= 40 ? C.orange : C.red,
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { l: "Aktiva processer", v: D.processes.length, c: C.blue },
          { l: "Körningar / 30d", v: totalRuns, c: C.green },
          { l: "Snitt duration", v: `${avgDur} min`, c: C.secondary },
        ].map((s, i) => (
          <div key={i} className="card-animate" style={{
            background: C.surface, borderRadius: 10,
            padding: "16px 20px",
            border: `0.5px solid ${C.border}`,
            boxShadow: shadow,
          }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.secondary }}>{s.l}</div>
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
        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "80px 1fr 80px 80px 80px",
          padding: "0 0 8px 0",
          borderBottom: `0.5px solid ${C.border}`,
          marginBottom: 4,
        }}>
          {["KOD", "PROCESS", "KÖRN.", "MIN", "STATUS"].map((h, i) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: C.secondary, textAlign: i > 1 ? "right" : "left" }}>{h}</span>
          ))}
        </div>
        {D.processes.length === 0 ? (
          <EmptyState icon="⟳" title="Inga processer" subtitle="Processer du dokumenterar visas här." />
        ) : (
          D.processes.map((p, i) => (
            <div
              key={i}
              className="row-hover"
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr 80px 80px 80px",
                padding: "8px 0",
                borderBottom: i < D.processes.length - 1 ? `0.5px solid ${C.fill}` : "none",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 11, fontFamily: "monospace", color: C.tertiary }}>{p.code}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.secondary }}>Ägare: {p.owner}</div>
              </div>
              <span style={{ fontSize: 13, color: C.secondary, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{p.runs30d}</span>
              <span style={{ fontSize: 13, color: C.secondary, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{p.avgMin}</span>
              <div style={{ textAlign: "right" }}>
                <Badge color={p.ncs > 0 ? C.orange : C.green}>
                  {p.ncs > 0 ? `${p.ncs} NC` : "OK"}
                </Badge>
              </div>
            </div>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          { l: "Öppna", v: openCount, c: openCount > 0 ? C.red : C.green },
          { l: "Stängda", v: closedCount, c: C.green },
          { l: "Snitt dagar", v: avgDays, c: C.secondary },
          { l: "MAJOR+", v: majorPlus, c: majorPlus > 0 ? C.orange : C.green },
        ].map((s, i) => (
          <div key={i} className="card-animate" style={{
            background: C.surface, borderRadius: 10,
            padding: "16px 20px",
            border: `0.5px solid ${C.border}`,
            boxShadow: shadow,
          }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.secondary }}>{s.l}</div>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {D.ncs.map((n, i) => {
              const severityColor = ncBorderColor[n.severity] ?? C.tertiary;
              const currentStep = STEPS.indexOf(n.status);
              return (
                <div
                  key={i}
                  className="row-hover"
                  style={{
                    background: C.surface,
                    border: `0.5px solid ${C.border}`,
                    borderLeft: `3px solid ${severityColor}`,
                    borderRadius: "0 10px 10px 0",
                    padding: "12px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    cursor: "pointer",
                    animation: `slideUp 0.15s ease ${i * 0.05}s backwards`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{n.title}</span>
                    <Badge color={severityColor}>{n.severity}</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: C.secondary }}>
                    {n.code} · {n.who} · {n.days}d
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                    {STEPS.map((step, si) => (
                      <div key={step} style={{
                        width: 20, height: 3, borderRadius: 2,
                        background: si <= currentStep ? severityColor : C.fill,
                      }} />
                    ))}
                    <span style={{ fontSize: 11, color: C.secondary, marginLeft: 4 }}>
                      {ncStatusLabel[n.status] ?? n.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function ImprovementsView({ D }: { D: typeof FALLBACK }) {
  const pdcaColor: Record<string, string> = {
    "PLAN": C.blue, "DO": C.green, "CHECK": C.orange, "ACT": C.purple, "-": C.tertiary,
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
        <>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "112px 1fr 80px 96px",
            padding: "0 0 8px 0",
            borderBottom: `0.5px solid ${C.border}`,
            marginBottom: 4,
          }}>
            {["KOD", "TITEL", "PDCA", "STATUS"].map((h, i) => (
              <span key={h} style={{ fontSize: 11, fontWeight: 600, color: C.secondary, textAlign: i > 1 ? "right" : "left" }}>{h}</span>
            ))}
          </div>
          {D.improvements.map((imp, i) => (
            <div
              key={i}
              className="row-hover"
              style={{
                display: "grid",
                gridTemplateColumns: "112px 1fr 80px 96px",
                padding: "8px 0",
                borderBottom: i < D.improvements.length - 1 ? `0.5px solid ${C.fill}` : "none",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 11, fontFamily: "monospace", color: C.tertiary }}>{imp.code}</span>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{imp.title}</div>
              <div style={{ textAlign: "right" }}>
                <Badge color={pdcaColor[imp.pdca] ?? C.tertiary}>{imp.pdca}</Badge>
              </div>
              <div style={{ textAlign: "right" }}>
                <Badge color={
                  imp.status === "IMPLEMENTING" ? C.blue
                    : imp.status === "APPROVED" ? C.green
                      : C.tertiary
                }>
                  {imp.status}
                </Badge>
              </div>
            </div>
          ))}
        </>
      )}
    </Card>
  );
}

function ComplianceView({ D }: { D: typeof FALLBACK }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {D.compliance.map((c, i) => {
        const col = c.pct >= 80 ? C.green : c.pct >= 60 ? C.orange : C.red;
        return (
          <Card key={i} animate>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{c.standard}</div>
              <Badge color={col} size="md">{c.pct}%</Badge>
            </div>
            <Bar pct={c.pct} color={col} height={6} />
            <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: 12 }}>
              {[
                { label: "Uppfyllda", v: c.ok, c: C.green },
                { label: "Partiella", v: c.partial, c: C.orange },
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(l => {
          const count = D.risks.filter(r => r.level === l).length;
          return (
            <div key={l} className="card-animate" style={{
              background: C.surface, borderRadius: 10,
              padding: "16px 20px",
              border: `0.5px solid ${C.border}`,
              borderTop: `3px solid ${riskColor[l]}`,
              boxShadow: shadow,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: riskColor[l],
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                {l}
              </div>
              <div style={{
                fontSize: 28, fontWeight: 700, color: riskColor[l],
                fontVariantNumeric: "tabular-nums", marginTop: 8,
              }}>
                {count}
              </div>
            </div>
          );
        })}
      </div>

      <Card title="Riskregister">
        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "80px 1fr 96px 40px 80px",
          padding: "0 0 8px 0",
          borderBottom: `0.5px solid ${C.border}`,
          marginBottom: 4,
        }}>
          {["KOD", "RISK", "KATEGORI", "SCORE", "NIVÅ"].map((h, i) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: C.secondary, textAlign: i > 2 ? "right" : "left" }}>{h}</span>
          ))}
        </div>
        {sorted.map((r, i) => (
          <div
            key={i}
            className="row-hover"
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr 96px 40px 80px",
              padding: "8px 0",
              borderBottom: i < sorted.length - 1 ? `0.5px solid ${C.fill}` : "none",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 11, fontFamily: "monospace", color: C.tertiary }}>{r.code}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{r.title}</div>
              <div style={{ fontSize: 12, color: C.secondary }}>{r.mit}</div>
            </div>
            <Badge color={C.tertiary}>{r.cat}</Badge>
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontSize: 16, fontWeight: 700, color: riskColor[r.level],
                fontVariantNumeric: "tabular-nums",
              }}>
                {r.score}
              </div>
              <div style={{ fontSize: 11, color: C.tertiary, fontVariantNumeric: "tabular-nums" }}>
                {r.prob}×{r.imp}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <Badge color={riskColor[r.level]}>{r.level}</Badge>
            </div>
          </div>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "calc(100vh - 132px)" }}>
      {/* Channel tabs */}
      <div style={{ display: "flex", gap: 8 }}>
        {channels.map(ch => (
          <button
            key={ch}
            onClick={() => setChatCh(ch)}
            style={{
              background: chatCh === ch ? C.blue : C.surface,
              color: chatCh === ch ? "#FFF" : C.secondary,
              border: `0.5px solid ${chatCh === ch ? C.blue : C.border}`,
              borderRadius: 20, padding: "6px 14px",
              fontSize: 12, fontWeight: 500, cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.1s ease",
            }}
          >
            #{ch.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Message list */}
      <div style={{
        flex: 1, background: C.surface, borderRadius: 10,
        border: `0.5px solid ${C.border}`,
        boxShadow: shadow, padding: "16px 20px",
        overflowY: "auto",
        display: "flex", flexDirection: "column-reverse", gap: 12,
      }}>
        {msgs.length === 0 ? (
          <EmptyState icon="💬" title={`Inga meddelanden i #${chatCh.toLowerCase()}`} />
        ) : (
          msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
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
            border: `0.5px solid ${C.border}`, borderRadius: 10,
            padding: "10px 14px", fontSize: 13, color: C.text,
            outline: "none", boxShadow: shadow, fontFamily: "inherit",
          }}
        />
        <Btn variant="primary">Skicka</Btn>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App({ user: propUser, onLogout }: { user?: any; onLogout?: () => void }) {
  const [view, setView] = useState("overview");

  const { data: apiNCs } = useApi<{ id: string; title: string; severity: string; status: string; code?: string; who?: string; days?: number }[]>("/api/nc");
  const { data: apiRisks } = useApi<{ id: string; title: string; category: string; probability: number; impact: number; score: number; level: string; mitigation_plan: string; code?: string }[]>("/api/risks");
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

  const D = {
    ...FALLBACK,
    ncs, risks, improvements, compliance, processes,
    user: propUser
      ? { full_name: propUser.full_name ?? propUser.email ?? "Användare", role: propUser.role ?? "ADMIN" }
      : FALLBACK.user,
  };

  const { t } = useTranslation();
  const viewTitles: Record<string, string> = {
    overview: "Översikt",
    deals: "Affärer",
    tasks: "Uppgifter",
    goals: "Mål",
    chat: "Chatt",
    processes: "Processer",
    nc: "Avvikelser",
    improvements: "PDCA",
    compliance: "Compliance",
    risks: "Risker",
    finance: "Huvudbok",
    reports: "Rapporter",
    capability: "Kompetenser",
    development: "Utveckling",
    learning: "Utbildning",
    dms:       "DMS Bil",
    spaghetti: "Flödesanalys",
  };

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{
        width: "100%", minHeight: "100vh",
        background: "#F2F2F7",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
        color: "#000000",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        display: "flex",
      }}>
        <Sidebar
          view={view}
          setView={setView}
          userName={D.user.full_name}
          onLogout={onLogout}
        />

        <div style={{ marginLeft: 260, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <TopBar title={viewTitles[view] ?? view} userName={D.user.full_name} />

          <main role="main" style={{ flex: 1, padding: "24px 24px 64px", maxWidth: 1280, width: "100%" }}>
            {view === "overview" && <OverviewView D={D} />}
            {view === "deals" && <SalesView D={D} />}
            {view === "finance" && <FinanceView D={D} />}
            {view === "reports" && <ReportsView D={D} />}
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
            {view === "learning"   && <LearningModule user={D.user as any} />}
            {view === "dms"        && <DMSModule />}
            {view === "spaghetti" && <SpaghettiModule />}
          </main>
        </div>
      </div>
    </>
  );
}
