import { useState, useEffect } from "react";
import { useApi } from "./useApi";

// ─── Design tokens (matchar Dashboard.tsx) ────────────────────────────────────
const C = {
  bg:        "#F2F2F7",
  surface:   "#FFFFFF",
  border:    "#D1D1D6",
  text:      "#000000",
  secondary: "#8E8E93",
  tertiary:  "#C7C7CC",
  blue:      "#007AFF",
  green:     "#34C759",
  orange:    "#FF9500",
  red:       "#FF3B30",
  purple:    "#AF52DE",
  yellow:    "#FFCC00",
  fill:      "#F2F2F7",
  inset:     "#E5E5EA",
};

const shadow = "0 1px 3px rgba(0,0,0,0.06)";

// ─── Lean-modul-färger ────────────────────────────────────────────────────────
const MODULE_COLORS: Record<string, string> = {
  execution:  "#007AFF",
  capability: "#34C759",
  process:    "#FF9500",
  currency:   "#FFCC00",
  reports:    "#AF52DE",
  idle:       "#E5E5EA",
};

const MODULE_Y: Record<string, number> = {
  execution:  60,
  capability: 110,
  process:    160,
  currency:   210,
  reports:    260,
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Person {
  user_id: string;
  name: string;
  role: string;
  module: string;
  current_activity: string;
  started_at: string;
  items_in_progress: number;
  active: boolean;
}

interface FlowSummary {
  total_module_switches: number;
  avg_focus_time_minutes: number;
  flow_efficiency_pct: number;
  waste_count: number;
}

interface PerPersonFlow {
  user_id: string;
  name?: string;
  module_switches: number;
  avg_focus_minutes: number;
  most_visited_module: string;
  movement_index: number;
  waste_events: number;
}

interface Suggestion {
  id: string;
  type: "waste" | "bottleneck" | "handoff";
  description: string;
  affected_users: number;
  suggestion: string;
  estimated_impact: string;
}

// ─── Demo-data (fallback om API saknas) ──────────────────────────────────────
const DEMO_PERSONS: Person[] = [
  { user_id: "u1", name: "Erik S.",   role: "CEO",   module: "execution",  current_activity: "deal_update",    started_at: new Date(Date.now() - 25 * 60000).toISOString(), items_in_progress: 5, active: true  },
  { user_id: "u2", name: "Maria L.",  role: "COO",   module: "process",    current_activity: "process_review", started_at: new Date(Date.now() - 47 * 60000).toISOString(), items_in_progress: 3, active: true  },
  { user_id: "u3", name: "Johan K.",  role: "CFO",   module: "reports",    current_activity: "report_view",    started_at: new Date(Date.now() - 120 * 60000).toISOString(), items_in_progress: 2, active: false },
  { user_id: "u4", name: "Anna P.",   role: "Sales", module: "execution",  current_activity: "task_start",     started_at: new Date(Date.now() - 8 * 60000).toISOString(),  items_in_progress: 8, active: true  },
  { user_id: "u5", name: "Dennis B.", role: "Ops",   module: "process",    current_activity: "nc_open",        started_at: new Date(Date.now() - 33 * 60000).toISOString(), items_in_progress: 4, active: true  },
  { user_id: "u6", name: "Sara E.",   role: "HR",    module: "capability", current_activity: "meeting",        started_at: new Date(Date.now() - 15 * 60000).toISOString(), items_in_progress: 6, active: true  },
];

const DEMO_SUGGESTIONS: Suggestion[] = [
  {
    id: "s1", type: "waste",
    description: "Hög frekvens av korta aktiviteter (<5 min) — tecken på context-switching",
    affected_users: 3,
    suggestion: "Inför 'djupt arbete'-block om 90 min varje förmiddag. Stäng notifikationer.",
    estimated_impact: "~2h/dag i återvunnen fokustid per person",
  },
  {
    id: "s2", type: "bottleneck",
    description: "Rapporter väntar på godkännande — skapar kö i Reports-modulen",
    affected_users: 2,
    suggestion: "Delegera godkännande till teamleads för standardrapporter. CFO godkänner bara >50 kEUR.",
    estimated_impact: "Minskar ledtid med ~40% för rapportflödet",
  },
  {
    id: "s3", type: "handoff",
    description: "NC-ärenden passerar 3+ personer innan åtgärd — onödig handoff-waste",
    affected_users: 4,
    suggestion: "Inför 'single-point-of-ownership' för NC-ärenden. En person driver till stängning.",
    estimated_impact: "Halverar handoff-tid för NC-ärenden",
  },
  {
    id: "s4", type: "waste",
    description: "Genomsnittlig fokustid 23 min — under Lean-optimal 45 min",
    affected_users: 5,
    suggestion: "Implementera Pomodoro-protokoll och blockera möten 09:00–11:30.",
    estimated_impact: "Potentiell förbättring från 64% → 80%+ flödeseffektivitet",
  },
];

// ─── Miniräknare: minuter sedan ──────────────────────────────────────────────
function minutesSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function initialer(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Badge ────────────────────────────────────────────────────────────────────
const Badge = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span style={{
    background: color + "20", color,
    fontSize: 11, fontWeight: 600,
    padding: "2px 8px", borderRadius: 6,
    whiteSpace: "nowrap",
  }}>
    {children}
  </span>
);

// ─── Btn ──────────────────────────────────────────────────────────────────────
const Btn = ({
  children, onClick, variant = "primary", size = "md",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
}) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      height: size === "sm" ? 32 : 36,
      padding: size === "sm" ? "0 12px" : "0 16px",
      borderRadius: 8, fontSize: 13, fontWeight: 500,
      cursor: "pointer", fontFamily: "inherit",
      border: "none",
      background: variant === "primary" ? C.blue : C.fill,
      color: variant === "primary" ? "#fff" : C.text,
      transition: "all 0.15s ease",
    }}
  >
    {children}
  </button>
);

// ─── Metric Card ─────────────────────────────────────────────────────────────
const MetricCard = ({ label, value, sub, subColor }: {
  label: string; value: React.ReactNode; sub: string; subColor?: string;
}) => (
  <div style={{
    background: C.surface, border: `0.5px solid ${C.border}`,
    borderRadius: 10, padding: "12px 16px",
  }}>
    <div style={{ fontSize: 11, color: C.secondary }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700, color: C.text, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{value}</div>
    <div style={{ fontSize: 11, color: subColor ?? C.secondary, marginTop: 2 }}>{sub}</div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════
// VY 1: HELIKOPTERPERSPEKTIV
// ═══════════════════════════════════════════════════════════════════════
function HelicopterView({ persons }: { persons: Person[] }) {
  const [tick, setTick] = useState(0);

  // Uppdatera klock-display varje minut
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // Placera bubblor i rätt modul-zon
  // Zon X-start per modul (matchar SVG-rektanglar)
  const MODULE_ZONES: Record<string, { x: number; w: number }> = {
    execution:  { x: 10,  w: 150 },
    capability: { x: 170, w: 150 },
    process:    { x: 330, w: 150 },
    currency:   { x: 490, w: 150 },
    reports:    { x: 650, w: 140 },
  };

  // Deterministisk offset per person inom zonen
  function personPos(p: Person, i: number): { cx: number; cy: number } {
    const zone = MODULE_ZONES[p.module] ?? MODULE_ZONES.execution;
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = zone.x + 30 + col * 65 + (p.items_in_progress % 3) * 10;
    const cy = 60 + row * 90 + (p.items_in_progress % 2) * 20;
    return { cx: Math.min(cx, zone.x + zone.w - 20), cy: Math.min(cy, 360) };
  }

  // Räkna per modul
  const personsByModule = DEMO_PERSONS.reduce<Record<string, Person[]>>((acc, _p) => acc, {});
  const moduleIndexes: Record<string, number> = {};

  return (
    <div style={{ background: C.surface, borderRadius: 12, padding: 24, border: `0.5px solid ${C.border}`, boxShadow: shadow }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, color: C.text }}>Helikopterperspektiv</div>
          <div style={{ fontSize: 13, color: C.secondary }}>Vad teamet gör just nu · {persons.length} aktiva</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: C.secondary }}>Uppdateras live</span>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: C.green, marginTop: 1,
            animation: "pulse 2s infinite",
          }} />
        </div>
      </div>

      {/* SVG-plan */}
      <svg
        width="100%" height="400" viewBox="0 0 800 400"
        style={{ background: C.fill, borderRadius: 10, display: "block" }}
      >
        {/* Modul-zoner */}
        {[
          { label: "EXECUTION",  x: 10,  w: 150, color: "0,122,255"   },
          { label: "CAPABILITY", x: 170, w: 150, color: "52,199,89"   },
          { label: "PROCESS",    x: 330, w: 150, color: "255,149,0"   },
          { label: "CURRENCY",   x: 490, w: 150, color: "255,204,0"   },
          { label: "REPORTS",    x: 650, w: 140, color: "175,82,222"  },
        ].map(z => (
          <g key={z.label}>
            <rect x={z.x} y="10" width={z.w} height="380" rx="8"
              fill={`rgba(${z.color},0.05)`} stroke={`rgba(${z.color},0.18)`} strokeWidth="1"/>
            <text x={z.x + z.w / 2} y="30" textAnchor="middle" fontSize="10"
              fill={`rgba(${z.color},0.75)`} fontWeight="600" fontFamily="-apple-system,sans-serif">
              {z.label}
            </text>
          </g>
        ))}

        {/* Personbubblor */}
        {persons.map((person, i) => {
          const color = MODULE_COLORS[person.module] ?? MODULE_COLORS.idle;
          const r = 22 + Math.min(person.items_in_progress, 6) * 2; // storlek ≈ aktivitetsnivå
          const zone = MODULE_ZONES[person.module] ?? MODULE_ZONES.execution;
          const col = i % 2;
          const row = Math.floor(i / 2) % 3;
          const cx = zone.x + 35 + col * 60;
          const cy = 60 + row * 110;
          const mins = minutesSince(person.started_at);

          return (
            <g key={person.user_id}>
              {/* Puls-ring för aktiva */}
              {person.active && (
                <circle cx={cx} cy={cy} r={r + 6} fill="none"
                  stroke={color} strokeWidth="1" opacity="0.3">
                  <animate attributeName="r" values={`${r+4};${r+12};${r+4}`} dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite"/>
                </circle>
              )}
              {/* Bubblans cirkel */}
              <circle cx={cx} cy={cy} r={r}
                fill={color + "22"} stroke={color} strokeWidth="1.5"/>
              {/* Initialer */}
              <text x={cx} y={cy + 4} textAnchor="middle" fontSize="12" fontWeight="700"
                fill={color} fontFamily="-apple-system,sans-serif">
                {initialer(person.name)}
              </text>
              {/* Namn under */}
              <text x={cx} y={cy + r + 14} textAnchor="middle" fontSize="9" fill={C.secondary}
                fontFamily="-apple-system,sans-serif">
                {person.name.split(" ")[0]}
              </text>
              {/* Tid i nuläge */}
              <text x={cx} y={cy + r + 25} textAnchor="middle" fontSize="9" fill={C.tertiary}
                fontFamily="-apple-system,sans-serif">
                {mins}m
              </text>
            </g>
          );
        })}
      </svg>

      {/* Personlista under SVG */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 16 }}>
        {persons.map(p => {
          const color = MODULE_COLORS[p.module] ?? MODULE_COLORS.idle;
          const mins = minutesSince(p.started_at);
          const actLabel: Record<string, string> = {
            task_start: "Startar uppgift", task_complete: "Slutför uppgift",
            deal_update: "Uppdaterar affär", meeting: "Möte",
            nc_open: "Öppnar avvikelse", report_view: "Läser rapport",
            process_review: "Granskar process", capability_update: "Uppdaterar kompetens",
          };
          return (
            <div key={p.user_id} style={{
              display: "flex", alignItems: "center", gap: 10,
              background: C.fill, borderRadius: 10, padding: "10px 12px",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: color + "20", color, border: `2px solid ${color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {initialer(p.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.secondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {actLabel[p.current_activity] ?? p.current_activity}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 11, color, fontWeight: 600 }}>
                  {p.module.charAt(0).toUpperCase() + p.module.slice(1)}
                </div>
                <div style={{ fontSize: 10, color: C.tertiary }}>{mins}m</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modul-legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
        {Object.entries(MODULE_COLORS).filter(([k]) => k !== "idle").map(([mod, color]) => (
          <div key={mod} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: 12, color: C.secondary, textTransform: "capitalize" }}>{mod}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// VY 2: SPAGETTIDIAGRAM
// ═══════════════════════════════════════════════════════════════════════
function SpaghettiChart({
  summary,
  perPerson,
}: {
  summary?: FlowSummary;
  perPerson?: PerPersonFlow[];
}) {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(weekAgo);
  const [toDate,   setToDate  ] = useState(today);

  // Aktivitetsflöde för diagram — bygg URL dynamiskt för manuell refresh
  const [queryKey, setQueryKey] = useState(0);
  const flowUrl = `/api/spaghetti/activity-flow?from_date=${fromDate}&to_date=${toDate}&_k=${queryKey}`;
  const { data: flowData } = useApi<{ demo: boolean; persons: Record<string, {
    user_id: string; module: string; timestamp: string; duration_minutes: number;
  }[]> }>(flowUrl);

  // Demo spagetti-linjer (om ingen riktig data)
  const DEMO_LINES = [
    { name: "Erik S.",   color: "#007AFF", points: [0,60, 80,110, 160,60, 260,160, 340,60, 440,60, 540,110] },
    { name: "Maria L.",  color: "#34C759", points: [0,160, 100,60, 200,160, 260,210, 360,160, 440,110, 540,160] },
    { name: "Anna P.",   color: "#FF9500", points: [0,110, 120,260, 220,110, 280,60, 360,210, 460,110, 540,60] },
    { name: "Dennis B.", color: "#AF52DE", points: [0,260, 140,60, 240,210, 300,110, 380,260, 480,60, 540,210] },
  ];

  // Waste-korsningar i demo
  const DEMO_WASTE_POINTS = [
    { cx: 190, cy: 60 }, { cx: 260, cy: 60 }, { cx: 290, cy: 160 },
  ];

  const s = summary ?? {
    total_module_switches: 47,
    avg_focus_time_minutes: 23,
    flow_efficiency_pct: 64,
    waste_count: 8,
  };

  return (
    <div>
      {/* Kontroller */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          style={{ height: 32, padding: "0 10px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", background: C.surface, color: C.text }}
        />
        <span style={{ color: C.secondary }}>→</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          style={{ height: 32, padding: "0 10px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", background: C.surface, color: C.text }}
        />
        <Btn variant="primary" size="sm" onClick={() => setQueryKey(k => k + 1)}>Analysera</Btn>
        <span style={{ fontSize: 12, color: C.secondary, marginLeft: "auto" }}>
          {flowData?.demo ? "Demo-data" : "Live-data"}
        </span>
      </div>

      {/* Spagettidiagram SVG */}
      <div style={{ background: C.fill, borderRadius: 10, padding: "20px 20px 12px", marginBottom: 16 }}>
        <svg width="100%" height="320" viewBox="0 0 600 300" style={{ display: "block", overflow: "visible" }}>
          {/* Y-axel: moduler */}
          {[
            { label: "Execution",  y: 60,  color: "#007AFF" },
            { label: "Capability", y: 110, color: "#34C759" },
            { label: "Process",    y: 160, color: "#FF9500" },
            { label: "Currency",   y: 210, color: "#FFCC00" },
            { label: "Reports",    y: 260, color: "#AF52DE" },
          ].map(m => (
            <g key={m.label}>
              <line x1="90" y1={m.y} x2="580" y2={m.y}
                stroke="rgba(0,0,0,0.08)" strokeWidth="1" strokeDasharray="4,4"/>
              <text x="82" y={m.y + 4} textAnchor="end" fontSize="11"
                fill={m.color} fontWeight="600" fontFamily="-apple-system,sans-serif">
                {m.label}
              </text>
              <circle cx="88" cy={m.y} r="3" fill={m.color} opacity="0.5"/>
            </g>
          ))}

          {/* X-axel: tid */}
          {["08:00", "09:30", "11:00", "12:30", "14:00", "15:30", "17:00"].map((t, i) => (
            <g key={t}>
              <line x1={90 + i * 82} y1="50" x2={90 + i * 82} y2="270"
                stroke="rgba(0,0,0,0.04)" strokeWidth="1"/>
              <text x={90 + i * 82} y="284" textAnchor="middle" fontSize="9"
                fill={C.tertiary} fontFamily="-apple-system,sans-serif">
                {t}
              </text>
            </g>
          ))}

          {/* Spagetti-linjer per person */}
          {DEMO_LINES.map((line, li) => {
            const pts = [];
            for (let i = 0; i < line.points.length; i += 2) {
              const rawX = line.points[i];
              const rawY = line.points[i + 1];
              pts.push(`${90 + rawX},${rawY}`);
            }
            return (
              <polyline
                key={li}
                points={pts.join(" ")}
                fill="none"
                stroke={line.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
              />
            );
          })}

          {/* Waste-korsningspunkter (röda ringar) */}
          {DEMO_WASTE_POINTS.map((wp, i) => (
            <circle key={i} cx={90 + wp.cx} cy={wp.cy} r="5"
              fill="none" stroke="#FF3B30" strokeWidth="1.5" opacity="0.9">
              <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite"/>
            </circle>
          ))}

          {/* Legend */}
          {DEMO_LINES.map((line, i) => (
            <g key={i}>
              <line x1={90 + i * 120} y1="295" x2={110 + i * 120} y2="295"
                stroke={line.color} strokeWidth="2" strokeLinecap="round"/>
              <text x={115 + i * 120} y="299" fontSize="9" fill={C.secondary}
                fontFamily="-apple-system,sans-serif">
                {line.name}
              </text>
            </g>
          ))}

          {/* Waste-förklaring */}
          <circle cx="560" cy="292" r="4" fill="none" stroke="#FF3B30" strokeWidth="1.5" opacity="0.8"/>
          <text x="568" y="296" fontSize="9" fill="#FF3B30" fontFamily="-apple-system,sans-serif">Waste</text>
        </svg>
      </div>

      {/* Metrics-rad */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <MetricCard
          label="Totalt modulbyten"
          value={s.total_module_switches}
          sub="↑ 12% vs förra veckan"
          subColor={C.red}
        />
        <MetricCard
          label="Genomsnittlig fokustid"
          value={`${s.avg_focus_time_minutes} min`}
          sub="Under optimal (45 min)"
          subColor={C.orange}
        />
        <MetricCard
          label="Identifierade waste"
          value={<span style={{ color: C.red }}>{s.waste_count}</span>}
          sub="Handoffs & väntetider"
        />
        <MetricCard
          label="Flödeseffektivitet"
          value={<span style={{ color: s.flow_efficiency_pct >= 80 ? C.green : C.orange }}>{s.flow_efficiency_pct}%</span>}
          sub="Lean-mål: 80%+"
        />
      </div>

      {/* Per-person breakdown */}
      {perPerson && perPerson.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}>Rörelseindex per person</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {perPerson.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: C.fill, borderRadius: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: (MODULE_COLORS[p.most_visited_module] ?? C.blue) + "20", color: MODULE_COLORS[p.most_visited_module] ?? C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {(p.name ?? p.user_id).slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{p.name ?? p.user_id}</div>
                  <div style={{ fontSize: 11, color: C.secondary }}>{p.module_switches} modulbyten · {p.avg_focus_minutes}min snittfokus</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: p.movement_index > 0.7 ? C.red : p.movement_index > 0.4 ? C.orange : C.green }}>
                    {Math.round(p.movement_index * 100)}%
                  </div>
                  <div style={{ fontSize: 10, color: C.tertiary }}>rörelseindex</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// VY 3: LEAN-ANALYSEPANEL
// ═══════════════════════════════════════════════════════════════════════
function LeanAnalysisPanel({ suggestions }: { suggestions: Suggestion[] }) {
  const typeLabel: Record<string, string> = {
    waste: "Waste",
    bottleneck: "Flaskhals",
    handoff: "Handoff",
  };
  const typeColor: Record<string, string> = {
    waste: C.red,
    bottleneck: C.orange,
    handoff: C.yellow,
  };
  const typeEmoji: Record<string, string> = {
    waste: "🗑",
    bottleneck: "⚡",
    handoff: "🔀",
  };

  return (
    <div>
      {/* Förklaring */}
      <div style={{
        background: C.blue + "0D", border: `0.5px solid ${C.blue}30`,
        borderRadius: 10, padding: "12px 16px", marginBottom: 20,
        fontSize: 13, color: C.text, lineHeight: 1.5,
      }}>
        <strong>Lean-analys</strong> baserad på aktivitetsflödesdata. Förslag identifierar waste (muda),
        flaskhalsar och onödiga handoffs i era arbetsflöden.
      </div>

      <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 16 }}>
        🎯 Lean-optimeringsförslag
      </div>

      {suggestions.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 24px", color: C.secondary, fontSize: 14,
        }}>
          ✓ Inga problem identifierade — flödet är optimalt!
        </div>
      ) : (
        suggestions.map(s => {
          const color = typeColor[s.type] ?? C.orange;
          return (
            <div key={s.id} style={{
              background: C.surface,
              border: `0.5px solid ${C.border}`,
              borderLeft: `3px solid ${color}`,
              borderRadius: "0 10px 10px 0",
              padding: "14px 16px",
              marginBottom: 10,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{typeEmoji[s.type]}</span>
                  <Badge color={color}>
                    {typeLabel[s.type]}
                  </Badge>
                </div>
                <span style={{ fontSize: 12, color: C.secondary }}>
                  Påverkar: {s.affected_users} pers.
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 6 }}>
                {s.description}
              </div>
              <div style={{ fontSize: 13, color: C.secondary, marginBottom: 6 }}>
                💡 {s.suggestion}
              </div>
              <div style={{ fontSize: 12, color: C.green, fontWeight: 500 }}>
                📈 Estimerad besparing: {s.estimated_impact}
              </div>
            </div>
          );
        })
      )}

      {/* Lean-principer-sektion */}
      <div style={{ marginTop: 24, borderTop: `0.5px solid ${C.border}`, paddingTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>
          📚 Lean-principerna (Toyota Production System)
        </div>
        {[
          { title: "Eliminera waste (Muda)", desc: "Allt som inte skapar värde för kunden är waste. De 7 slöserierna: överproduktion, väntan, transport, lager, rörelse, defekter, överarbete.", color: C.red },
          { title: "Skapa flöde (Flow)", desc: "Minimera modulbyten och context-switching. Batch-arbete minskar overhead. Djupt fokusarbete ökar kvalitet.", color: C.blue },
          { title: "Pull, inte push", desc: "Arbeta mot faktiska behov, inte förväntade. Undvik att stapla uppgifter i kö.", color: C.green },
          { title: "Kontinuerlig förbättring (Kaizen)", desc: "Små, konstanta förbättringar. Mät, justera, mät igen. Flödeseffektivitet mot 80%+ som mål.", color: C.purple },
        ].map((p, i) => (
          <div key={i} style={{
            padding: "10px 12px", marginBottom: 8,
            background: p.color + "08", border: `0.5px solid ${p.color}20`,
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: p.color, marginBottom: 2 }}>{p.title}</div>
            <div style={{ fontSize: 12, color: C.secondary, lineHeight: 1.5 }}>{p.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// HUVUD-KOMPONENT: SpaghettiModule
// ═══════════════════════════════════════════════════════════════════════
export default function SpaghettiModule() {
  const [activeTab, setActiveTab] = useState<"helicopter" | "spaghetti" | "lean">("helicopter");

  // API-anrop
  const { data: liveData }    = useApi<{ demo: boolean; persons: Person[] }>("/api/spaghetti/live-overview");
  const { data: flowAnalysis } = useApi<{ demo: boolean; summary: FlowSummary; per_person: PerPersonFlow[] }>("/api/spaghetti/flow-analysis");
  const { data: suggestionsData } = useApi<{ suggestions: Suggestion[] }>("/api/spaghetti/optimization-suggestions");

  const persons     = liveData?.persons ?? DEMO_PERSONS;
  const summary     = flowAnalysis?.summary;
  const perPerson   = flowAnalysis?.per_person;
  const suggestions = suggestionsData?.suggestions ?? DEMO_SUGGESTIONS;

  const tabs = [
    { id: "helicopter" as const, label: "🚁 Helikopter", desc: "Live-vy" },
    { id: "spaghetti"  as const, label: "🍝 Spagetti",   desc: "Flödesanalys" },
    { id: "lean"       as const, label: "🎯 Lean",        desc: "Optimering" },
  ];

  return (
    <div>
      {/* Tab-navigation */}
      <div style={{
        display: "flex", gap: 0, marginBottom: 24,
        background: C.fill, borderRadius: 10, padding: 4,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: "10px 16px",
              border: "none", cursor: "pointer",
              borderRadius: 8, fontFamily: "inherit",
              background: activeTab === tab.id ? C.surface : "transparent",
              boxShadow: activeTab === tab.id ? shadow : "none",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? C.blue : C.secondary,
            }}>
              {tab.label}
            </div>
            <div style={{ fontSize: 11, color: C.tertiary, marginTop: 1 }}>{tab.desc}</div>
          </button>
        ))}
      </div>

      {/* Innehåll per tab */}
      {activeTab === "helicopter" && <HelicopterView persons={persons} />}
      {activeTab === "spaghetti"  && <SpaghettiChart summary={summary} perPerson={perPerson} />}
      {activeTab === "lean"       && <LeanAnalysisPanel suggestions={suggestions} />}
    </div>
  );
}
