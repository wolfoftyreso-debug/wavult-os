import { useState, useEffect } from "react";

// ─── PIX types ────────────────────────────────────────────────────────────────
export interface PIX {
  id: string;
  type:
    | "DEAL_STATE"
    | "TASK_COMPLETE"
    | "PAYMENT"
    | "NC_OPEN"
    | "PROCESS_STEP"
    | "APPROVAL"
    | "INVENTORY"
    | "SIGNAL"
    | "DECISION"
    | "HIRE"
    | "CHECKIN";
  title: string;
  description: string;
  value?: number;
  currency?: string;
  module: "execution" | "process" | "capability" | "finance" | "automotive" | "people";
  user?: string;
  timestamp: Date;
  state_before?: string;
  state_after?: string;
  is_reversible: boolean;
  trace_id: string;
}

export const PIX_COLORS: Record<PIX["module"], string> = {
  execution:  "#007AFF",
  process:    "#FF9500",
  capability: "#34C759",
  finance:    "#AF52DE",
  automotive: "#FF3B30",
  people:     "#FF2D55",
};

// ─── Demo data ────────────────────────────────────────────────────────────────
const now = Date.now();

export const DEMO_PIX: PIX[] = [
  {
    id: "1",
    type: "DEAL_STATE",
    title: "Deal state changed",
    description: "Novacode AB → WON",
    value: 12000,
    currency: "EUR",
    module: "execution",
    user: "Erik S.",
    timestamp: new Date(now - 2 * 60000),
    state_before: "PROPOSAL",
    state_after: "WON",
    is_reversible: true,
    trace_id: "PIX-2026-001",
  },
  {
    id: "2",
    type: "PAYMENT",
    title: "Payment received",
    description: "Fastighetsbolaget AB — Invoice #INV-2026-004",
    value: 5500,
    currency: "EUR",
    module: "finance",
    user: "System",
    timestamp: new Date(now - 14 * 60000),
    is_reversible: false,
    trace_id: "PIX-2026-002",
  },
  {
    id: "3",
    type: "NC_OPEN",
    title: "NC signal raised",
    description: "Invoice created without deal reference",
    module: "process",
    user: "Winston K.",
    timestamp: new Date(now - 32 * 60000),
    state_before: undefined,
    state_after: "OPEN",
    is_reversible: true,
    trace_id: "PIX-2026-003",
  },
  {
    id: "4",
    type: "TASK_COMPLETE",
    title: "Task completed",
    description: "Follow up: Novacode AB demo",
    module: "execution",
    user: "Leon B.",
    timestamp: new Date(now - 48 * 60000),
    state_before: "IN_PROGRESS",
    state_after: "DONE",
    is_reversible: true,
    trace_id: "PIX-2026-004",
  },
  {
    id: "5",
    type: "PROCESS_STEP",
    title: "Process step completed",
    description: "Inspection end-to-end — Step 3/5: QC review",
    module: "process",
    user: "Dennis A.",
    timestamp: new Date(now - 65 * 60000),
    state_before: "STEP_2",
    state_after: "STEP_3",
    is_reversible: false,
    trace_id: "PIX-2026-005",
  },
  {
    id: "6",
    type: "HIRE",
    title: "Team member onboarded",
    description: "New photographer — Vilnius office",
    module: "people",
    user: "Erik S.",
    timestamp: new Date(now - 3 * 3600000),
    state_before: "CANDIDATE",
    state_after: "ACTIVE",
    is_reversible: false,
    trace_id: "PIX-2026-006",
  },
  {
    id: "7",
    type: "DECISION",
    title: "Decision logged",
    description: "Supabase as primary database",
    module: "capability",
    user: "Erik S.",
    timestamp: new Date(now - 5 * 3600000),
    is_reversible: false,
    trace_id: "PIX-2026-007",
  },
  {
    id: "8",
    type: "APPROVAL",
    title: "Improvement approved",
    description: "GPS verification at inspection start",
    module: "process",
    user: "Erik S.",
    timestamp: new Date(now - 6 * 3600000),
    state_before: "PENDING",
    state_after: "APPROVED",
    is_reversible: true,
    trace_id: "PIX-2026-008",
  },
  {
    id: "9",
    type: "CHECKIN",
    title: "Team check-in",
    description: "Weekly sync — 5/5 present",
    module: "people",
    user: "System",
    timestamp: new Date(now - 24 * 3600000),
    is_reversible: false,
    trace_id: "PIX-2026-009",
  },
  {
    id: "10",
    type: "DEAL_STATE",
    title: "Deal state changed",
    description: "Fastighetsbolaget → DEMO",
    value: 8000,
    currency: "EUR",
    module: "execution",
    user: "Leon B.",
    timestamp: new Date(now - 26 * 3600000),
    state_before: "QUALIFIED",
    state_after: "DEMO",
    is_reversible: true,
    trace_id: "PIX-2026-010",
  },
  {
    id: "11",
    type: "SIGNAL",
    title: "System signal",
    description: "Runway dropped below 9 months — review budget",
    module: "finance",
    user: "System",
    timestamp: new Date(now - 28 * 3600000),
    is_reversible: false,
    trace_id: "PIX-2026-011",
  },
  {
    id: "12",
    type: "INVENTORY",
    title: "Consumable reorder triggered",
    description: "Inspection kits — stock below threshold (3 remaining)",
    module: "automotive",
    user: "System",
    timestamp: new Date(now - 2 * 24 * 3600000),
    is_reversible: false,
    trace_id: "PIX-2026-012",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTimestamp(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatAbsTime(d: Date): string {
  return d.toLocaleString("sv-SE", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).replace("T", " ");
}

function pixTypeIcon(type: PIX["type"]): string {
  const map: Record<PIX["type"], string> = {
    DEAL_STATE:   "◈",
    TASK_COMPLETE:"✓",
    PAYMENT:      "€",
    NC_OPEN:      "!",
    PROCESS_STEP: "→",
    APPROVAL:     "✦",
    INVENTORY:    "□",
    SIGNAL:       "◉",
    DECISION:     "◆",
    HIRE:         "＋",
    CHECKIN:      "●",
  };
  return map[type] ?? "·";
}

// ─── Types for TraceView integration ─────────────────────────────────────────
interface PixFeedProps {
  onSelectPix?: (pix: PIX) => void;
  pixList?: PIX[];
  compact?: boolean;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  fill:      "#F2F2F7",
  code:      "#1a1a2e",
};

const shadow = "0 1px 3px rgba(0,0,0,0.06)";

const MODULE_LABELS: Record<PIX["module"], string> = {
  execution:  "Execution",
  process:    "Process",
  capability: "Capability",
  finance:    "Finance",
  automotive: "Automotive",
  people:     "People",
};

type FilterTab = "all" | PIX["module"];
const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all",        label: "All" },
  { id: "execution",  label: "Execution" },
  { id: "finance",    label: "Finance" },
  { id: "process",    label: "Process" },
  { id: "people",     label: "People" },
  { id: "automotive", label: "Automotive" },
  { id: "capability", label: "Capability" },
];

// ─── PIX Entry component ──────────────────────────────────────────────────────
function PixEntry({
  pix,
  onTrace,
  compact = false,
}: {
  pix: PIX;
  onTrace: (pix: PIX) => void;
  compact?: boolean;
}) {
  const color = PIX_COLORS[pix.module];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: compact ? "8px 12px" : "12px 16px",
        borderBottom: `0.5px solid ${C.fill}`,
        background: hovered ? "rgba(60,60,67,0.03)" : "transparent",
        transition: "background 0.08s ease",
        cursor: "default",
      }}
    >
      {/* Module dot + type icon */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingTop: 2 }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: color, flexShrink: 0,
        }} />
        {!compact && (
          <div style={{
            fontSize: 10, color: color, fontWeight: 700,
            fontFamily: "monospace", lineHeight: 1, marginTop: 2,
          }}>
            {pixTypeIcon(pix.type)}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{
            fontFamily: "monospace", fontSize: 11,
            color: C.tertiary, flexShrink: 0,
            whiteSpace: "nowrap",
          }}>
            {formatTimestamp(pix.timestamp)}
          </span>
          <span style={{
            fontSize: 13, fontWeight: 600, color: C.text,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {pix.title}
          </span>
          {pix.value != null && (
            <span style={{
              fontSize: 12, fontWeight: 700, color: color,
              fontFamily: "monospace", flexShrink: 0,
            }}>
              {pix.currency === "EUR" ? "€" : ""}{pix.value.toLocaleString("sv-SE")}
              {pix.currency && pix.currency !== "EUR" ? ` ${pix.currency}` : ""}
            </span>
          )}
        </div>

        {/* Description */}
        <div style={{
          fontSize: 12, color: C.secondary, marginTop: 2,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {pix.description}
        </div>

        {/* State transition */}
        {pix.state_before != null && pix.state_after != null && !compact && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            marginTop: 6, padding: "3px 8px",
            background: C.fill, borderRadius: 6,
          }}>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: C.secondary }}>{pix.state_before}</span>
            <span style={{ fontSize: 11, color: C.tertiary }}>→</span>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: color, fontWeight: 600 }}>{pix.state_after}</span>
          </div>
        )}

        {/* Footer row */}
        {!compact && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
            {pix.user && (
              <span style={{ fontSize: 11, color: C.tertiary }}>
                {pix.user}
              </span>
            )}
            <span style={{
              fontSize: 10, color: color,
              background: color + "12",
              padding: "1px 6px", borderRadius: 4,
              fontWeight: 600, letterSpacing: "0.04em",
            }}>
              {MODULE_LABELS[pix.module].toUpperCase()}
            </span>
            {pix.is_reversible && (
              <span style={{ fontSize: 10, color: C.green, fontFamily: "monospace" }}>reversible</span>
            )}
          </div>
        )}
      </div>

      {/* Trace button */}
      <button
        type="button"
        onClick={() => onTrace(pix)}
        style={{
          background: "none", border: `0.5px solid ${C.border}`,
          borderRadius: 6, padding: "3px 8px",
          fontSize: 11, fontWeight: 600, color: C.secondary,
          cursor: "pointer", fontFamily: "monospace",
          flexShrink: 0, marginTop: 2,
          transition: "all 0.1s ease",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={e => {
          (e.target as HTMLElement).style.color = color;
          (e.target as HTMLElement).style.borderColor = color;
        }}
        onMouseLeave={e => {
          (e.target as HTMLElement).style.color = C.secondary;
          (e.target as HTMLElement).style.borderColor = C.border;
        }}
      >
        {compact ? "↗" : "Trace →"}
      </button>
    </div>
  );
}

// ─── PixFeed main component ───────────────────────────────────────────────────
export default function PixFeed({ onSelectPix, pixList, compact = false }: PixFeedProps) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [tick, setTick] = useState(0);

  // Tick every 30s to refresh relative timestamps
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const allPix = pixList ?? DEMO_PIX;
  const filtered = filter === "all" ? allPix : allPix.filter(p => p.module === filter);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = allPix.filter(p => p.timestamp >= todayStart).length;
  const lastPix = allPix[0];
  const lastAgo = lastPix ? formatTimestamp(lastPix.timestamp) : "—";

  const handleTrace = (pix: PIX) => {
    if (onSelectPix) onSelectPix(pix);
  };

  return (
    <div style={{
      background: C.surface,
      borderRadius: 10,
      border: `0.5px solid ${C.border}`,
      boxShadow: shadow,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px 10px",
        borderBottom: `0.5px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        {/* Status line */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green }} />
          <span style={{
            fontFamily: "monospace", fontSize: 12,
            color: C.secondary, flex: 1,
          }}>
            <span style={{ color: C.text, fontWeight: 700 }}>{allPix.length}</span>
            {" PIX active · "}
            <span style={{ color: C.text, fontWeight: 700 }}>{todayCount}</span>
            {" today · Last: "}
            <span style={{ color: C.text, fontWeight: 700 }}>{lastAgo}</span>
          </span>
          <button
            type="button"
            style={{
              background: "none", border: "none",
              fontSize: 11, color: C.blue, cursor: "pointer",
              fontFamily: "monospace", padding: 0,
            }}
          >
            View full log →
          </button>
        </div>

        {/* Filter pills */}
        {!compact && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTER_TABS.map(tab => {
              const active = filter === tab.id;
              const tabColor = tab.id === "all" ? C.blue : PIX_COLORS[tab.id as PIX["module"]];
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 20,
                    border: `0.5px solid ${active ? tabColor : C.border}`,
                    background: active ? tabColor + "15" : "transparent",
                    color: active ? tabColor : C.secondary,
                    fontSize: 11,
                    fontWeight: active ? 700 : 400,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.1s ease",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Feed */}
      <div style={{
        overflowY: "auto",
        maxHeight: compact ? 320 : 600,
      }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: "32px 16px",
            textAlign: "center",
            fontFamily: "monospace",
            fontSize: 12,
            color: C.tertiary,
          }}>
            No PIX of this type yet
          </div>
        ) : (
          filtered.map(pix => (
            <PixEntry
              key={pix.id + tick}
              pix={pix}
              onTrace={handleTrace}
              compact={compact}
            />
          ))
        )}
      </div>
    </div>
  );
}
