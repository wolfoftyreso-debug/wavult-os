import { useState, useEffect, useCallback } from "react";
import { useApi } from "./useApi";

// ---------------------------------------------------------------------------
// Spatial Flow Intelligence Module
// Workshop Map, Spaghetti Diagram, Friction Analysis, Movement Summary
// ---------------------------------------------------------------------------

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Zone {
  id: string;
  name: string;
  type?: string;
  zone_type?: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  width?: number;
  height?: number;
  color: string;
  capacity?: number;
  current_users?: Array<{ id: string }>;
}

interface SpatialEdge {
  from_id: string;
  to_id: string;
  count: number;
  user_color: string;
  from_x: number;
  from_y: number;
  to_x: number;
  to_y: number;
}

interface SpaghettiData {
  nodes: Array<{ id: string; name: string; x: number; y: number; color: string }>;
  edges: SpatialEdge[];
  crossings: Array<{ x: number; y: number }>;
  demo?: boolean;
}

interface FrictionItem {
  id: string;
  detection_type: string;
  severity: string;
  title: string;
  description: string;
  affected_user_id?: string;
  affected_zone_id?: string;
  occurrences: number;
  estimated_minutes_lost_per_day?: number;
  suggestion?: string;
  status: string;
}

interface UserMovement {
  user_id: string;
  zone_changes: number;
  estimated_meters: number;
  friction_score: number;
  top_zone: string;
}

// ---------------------------------------------------------------------------
// App theme (matches Dashboard.tsx C object — light iOS theme)
// ---------------------------------------------------------------------------
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
  fill:      "#F2F2F7",
  inset:     "#E5E5EA",
};

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------
const SEVERITY_COLOR: Record<string, string> = {
  HIGH:   "#FF3B30",
  MEDIUM: "#FF9500",
  LOW:    "#34C759",
};

const TYPE_LABEL: Record<string, string> = {
  REPEATED_TRIPS:   "Upprepade resor",
  TOOL_FAR_FROM_ZONE: "Verktyg långt bort",
  BOTTLENECK:       "Flaskhals",
  IDLE_WAIT:        "Väntan",
  WRONG_STORAGE:    "Fel förvaring",
  LONG_DISTANCE:    "Lång förflyttning",
};

// ---------------------------------------------------------------------------
// Workshop Map (SVG real-time floor plan)
// ---------------------------------------------------------------------------
function WorkshopMap({ zones }: { zones: Zone[] }) {
  return (
    <svg
      width="100%"
      viewBox="0 0 100 60"
      style={{
        background: C.surface,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
      }}
    >
      {/* Grid */}
      <defs>
        <pattern id="spatial-grid" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M 5 0 L 0 0 0 5" fill="none" stroke={C.border} strokeWidth="0.3" />
        </pattern>
      </defs>
      <rect width="100" height="60" fill="url(#spatial-grid)" />

      {/* Zones */}
      {zones.map((zone) => {
        const w = zone.w ?? zone.width ?? 5;
        const h = zone.h ?? zone.height ?? 5;
        const users = zone.current_users ?? [];
        return (
          <g key={zone.id}>
            <rect
              x={zone.x}
              y={zone.y}
              width={w}
              height={h}
              rx="1"
              fill={zone.color + "22"}
              stroke={zone.color}
              strokeWidth="0.5"
            />
            <text
              x={zone.x + w / 2}
              y={zone.y + h / 2 - (users.length > 0 ? 1.5 : 0)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="1.8"
              fill={zone.color ?? C.blue}
              fontWeight="bold"
            >
              {zone.name}
            </text>
            {/* User presence dots */}
            {users.map((user, i) => (
              <circle
                key={user.id}
                cx={zone.x + 2 + i * 2.5}
                cy={zone.y + h - 2}
                r="1.2"
                fill="#007AFF"
                stroke="#fff"
                strokeWidth="0.3"
              />
            ))}
            {/* Occupancy indicator */}
            {users.length > 0 && (
              <text
                x={zone.x + w - 1}
                y={zone.y + 2}
                textAnchor="end"
                fontSize="1.6"
                fill={C.text}
                opacity={0.7}
              >
                {users.length}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Spaghetti Diagram (SVG movement lines)
// ---------------------------------------------------------------------------
function SpaghettiDiagram({ data }: { data: SpaghettiData }) {
  const { nodes, edges, crossings } = data;
  return (
    <svg
      width="100%"
      viewBox="0 0 100 60"
      style={{
        background: C.surface,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
      }}
    >
      <defs>
        <pattern id="spatial-grid2" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M 5 0 L 0 0 0 5" fill="none" stroke={C.border} strokeWidth="0.3" />
        </pattern>
      </defs>
      <rect width="100" height="60" fill="url(#spatial-grid2)" />

      {/* Movement lines */}
      {edges.map((edge, i) => (
        <line
          key={i}
          x1={edge.from_x}
          y1={edge.from_y}
          x2={edge.to_x}
          y2={edge.to_y}
          stroke={edge.user_color}
          strokeWidth={Math.min(Math.max(edge.count * 0.4, 0.3), 3)}
          opacity={0.65}
          strokeLinecap="round"
        />
      ))}

      {/* Crossing dots (waste indicators) */}
      {crossings.map((c, i) => (
        <circle
          key={i}
          cx={c.x}
          cy={c.y}
          r="1.5"
          fill="none"
          stroke="#FF3B30"
          strokeWidth="0.8"
        />
      ))}

      {/* Zone nodes */}
      {nodes.map((node) => (
        <g key={node.id}>
          <circle cx={node.x} cy={node.y} r="2.5" fill={node.color + "44"} stroke={node.color} strokeWidth="0.5" />
          <text
            x={node.x}
            y={node.y + 4.5}
            textAnchor="middle"
            fontSize="1.6"
            fill={node.color ?? C.blue}
            fontWeight="bold"
          >
            {node.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Friction Card
// ---------------------------------------------------------------------------
function FrictionCard({
  friction,
  onResolve,
}: {
  friction: FrictionItem;
  onResolve: (id: string, status: string) => void;
}) {
  const color = SEVERITY_COLOR[friction.severity] ?? "#FF9500";
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${color}55`,
        borderRadius: 10,
        padding: "12px 14px",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span
          style={{
            background: color + "22",
            color,
            border: `1px solid ${color}55`,
            borderRadius: 6,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {TYPE_LABEL[friction.detection_type] ?? friction.detection_type}
        </span>
        <span
          style={{
            background: color + "22",
            color,
            border: `1px solid ${color}55`,
            borderRadius: 6,
            padding: "2px 6px",
            fontSize: 11,
          }}
        >
          {friction.severity}
        </span>
        {friction.estimated_minutes_lost_per_day && (
          <span style={{ marginLeft: "auto", color: "#FF9500", fontSize: 12, fontWeight: 600 }}>
            ~{Math.round(friction.estimated_minutes_lost_per_day)} min/dag
          </span>
        )}
      </div>
      <div style={{ color: C.text, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
        {friction.title}
      </div>
      <div style={{ color: C.secondary, fontSize: 12, marginBottom: 6 }}>
        {friction.description}
      </div>
      {friction.suggestion && (
        <div
          style={{
            background: "rgba(52,199,89,0.1)",
            border: `1px solid ${C.green}44`,
            borderRadius: 6,
            padding: "6px 10px",
            color: C.green,
            fontSize: 12,
            marginBottom: 8,
          }}
        >
          💡 {friction.suggestion}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => onResolve(friction.id, "RESOLVED")}
          style={{
            background: "rgba(52,199,89,0.12)",
            color: C.green,
            border: `1px solid ${C.green}44`,
            borderRadius: 6,
            padding: "4px 12px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ✓ Åtgärdad
        </button>
        <button
          onClick={() => onResolve(friction.id, "DISMISSED")}
          style={{
            background: C.fill,
            color: C.secondary,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "4px 12px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Avfärda
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Movement Summary Table
// ---------------------------------------------------------------------------
function MovementTable({ users }: { users: UserMovement[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {["Person", "Zonskiften", "Meter gångna", "Friktionspoäng", "Topzon"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: C.secondary, fontWeight: 600, fontSize: 11 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const fsColor = u.friction_score >= 7 ? "#FF3B30" : u.friction_score >= 4 ? "#FF9500" : "#34C759";
            return (
              <tr key={u.user_id} style={{ borderBottom: `1px solid ${C.fill}` }}>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: C.blue + "22",
                        border: `1px solid ${C.blue}55`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        color: C.blue,
                        fontWeight: 700,
                      }}
                    >
                      {u.user_id.slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ color: C.text, fontWeight: 500 }}>{u.user_id}</span>
                  </div>
                </td>
                <td style={{ padding: "10px 12px", color: C.text }}>{u.zone_changes}</td>
                <td style={{ padding: "10px 12px", color: C.text }}>{u.estimated_meters}m</td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      background: fsColor + "22",
                      color: fsColor,
                      border: `1px solid ${fsColor}44`,
                      borderRadius: 6,
                      padding: "2px 8px",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {u.friction_score.toFixed(1)}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", color: C.secondary }}>{u.top_zone}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state — workshop map not yet configured
// ---------------------------------------------------------------------------
function EmptyWorkshopMap({ onAddZone }: { onAddZone?: () => void }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: 400, gap: 20, textAlign: "center",
      padding: 48,
      background: C.surface,
      borderRadius: 12,
      border: `1px solid ${C.border}`,
    }}>
      {/* Illustration — enkel SVG verkstadsplan */}
      <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
        <rect x="10" y="10" width="40" height="25" rx="3" stroke="#6366f1" strokeWidth="1.5" fill="rgba(99,102,241,0.12)"/>
        <text x="30" y="26" textAnchor="middle" fontSize="8" fill="#6366f1">Lift 1</text>
        <rect x="60" y="10" width="40" height="25" rx="3" stroke="#6366f1" strokeWidth="1.5" fill="rgba(99,102,241,0.06)" strokeDasharray="4 2"/>
        <text x="80" y="26" textAnchor="middle" fontSize="8" fill="rgba(99,102,241,0.5)">Lift 2?</text>
        <rect x="10" y="45" width="25" height="20" rx="3" stroke="#ff9500" strokeWidth="1.5" fill="rgba(255,149,0,0.1)"/>
        <text x="22" y="58" textAnchor="middle" fontSize="7" fill="#ff9500">Verktyg</text>
      </svg>

      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>
          Konfigurera er verkstadskarta
        </div>
        <div style={{ fontSize: 15, color: C.secondary, maxWidth: 340, lineHeight: 1.6 }}>
          Lägg till zoner för era arbetsplatser — liftar, verktygsrum, reservdelslager — och pixdrift börjar spåra rörelsemönster automatiskt.
        </div>
      </div>

      <button
        onClick={onAddZone}
        style={{
          background: C.blue, color: "#fff", border: "none",
          padding: "12px 24px", borderRadius: 10, fontSize: 15, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit",
        }}
      >
        + Lägg till första zonen
      </button>

      <div style={{ fontSize: 13, color: C.tertiary }}>
        Verkstadskartan aktiveras automatiskt med DMS-modulen
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main SpatialModule component
// ---------------------------------------------------------------------------
type SpatialView = "map" | "spaghetti" | "friction" | "movement";

export default function SpatialModule() {
  const [activeView, setActiveView] = useState<SpatialView>("map");
  const [mapData, setMapData] = useState<{ zones: Zone[] } | null>(null);
  const [spaghettiData, setSpaghettiData] = useState<SpaghettiData | null>(null);
  const [frictionData, setFrictionData] = useState<{ frictions: FrictionItem[]; efficiency_pct: number; demo?: boolean } | null>(null);
  const [movementData, setMovementData] = useState<{ per_user: UserMovement[]; demo?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchView = useCallback(async (view: SpatialView) => {
    setLoading(true);
    try {
      if (view === "map") {
        const r = await fetch(`${API_BASE}/api/spatial/map/demo`);
        if (r.ok) setMapData(await r.json());
      } else if (view === "spaghetti") {
        const r = await fetch(`${API_BASE}/api/spatial/spaghetti`);
        if (r.ok) setSpaghettiData(await r.json());
      } else if (view === "friction") {
        const r = await fetch(`${API_BASE}/api/spatial/friction`);
        if (r.ok) setFrictionData(await r.json());
      } else if (view === "movement") {
        const r = await fetch(`${API_BASE}/api/spatial/movement/summary`);
        if (r.ok) setMovementData(await r.json());
      }
    } catch (e) {
      console.error("[SpatialModule] fetch error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchView(activeView);
  }, [activeView, fetchView]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await fetch(`${API_BASE}/api/spatial/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      await fetchView("friction");
      setActiveView("friction");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleResolve = async (id: string, status: string) => {
    await fetch(`${API_BASE}/api/spatial/friction/${id}/resolve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setFrictionData((prev) =>
      prev
        ? { ...prev, frictions: prev.frictions.filter((f) => f.id !== id) }
        : prev
    );
  };

  const TABS: Array<{ id: SpatialView; label: string; icon: string }> = [
    { id: "map",       label: "Verkstadskarta",   icon: "🗺" },
    { id: "spaghetti", label: "Spagettidiagram",  icon: "〰️" },
    { id: "friction",  label: "Friktionsanalys",  icon: "⚡" },
    { id: "movement",  label: "Rörelseöversikt",  icon: "👣" },
  ];

  return (
    <div style={{ padding: "0 0 40px", color: C.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>🏭 Spatial Flow Intelligence</h2>
          <p style={{ margin: "4px 0 0", color: C.secondary, fontSize: 13 }}>
            Rörelsemönster · Spagettikartor · Friktionsanalys
          </p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          style={{
            background: analyzing ? C.fill : (mapData?.zones && mapData.zones.length > 0 ? C.blue : C.fill),
            color: analyzing ? C.secondary : (mapData?.zones && mapData.zones.length > 0 ? "#fff" : C.secondary),
            border: mapData?.zones && mapData.zones.length > 0 ? "none" : "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: analyzing || !(mapData?.zones && mapData.zones.length > 0) ? "default" : "pointer",
          }}
          title={!(mapData?.zones && mapData.zones.length > 0) ? "Lägg till zoner på kartan först" : undefined}
        >
          {analyzing ? "Analyserar…" : "⚡ Kör friktionsanalys"}
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.fill, borderRadius: 10, padding: 4 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            style={{
              flex: 1,
              background: activeView === tab.id ? C.blue : "transparent",
              color: activeView === tab.id ? "#fff" : C.secondary,
              border: "none",
              borderRadius: 7,
              padding: "8px 4px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <span style={{ display: "block", fontSize: 16, marginBottom: 2 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: C.secondary }}>
          Laddar…
        </div>
      )}

      {/* View: Workshop Map */}
      {!loading && activeView === "map" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ color: C.secondary, fontSize: 12 }}>
              Realtidskarta — positioner baserade på senaste zonhändelser
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "rgba(52,199,89,0.15)",
                color: "#34C759",
                border: "1px solid rgba(52,199,89,0.3)",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: 11,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34C759", display: "inline-block" }} />
              Live
            </span>
          </div>
          {mapData?.zones && mapData.zones.length > 0 ? (
            <WorkshopMap zones={mapData.zones} />
          ) : (
            <EmptyWorkshopMap />
          )}
          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            {[
              { color: C.blue, label: "Lyft" },
              { color: C.orange, label: "Verktygsrum" },
              { color: C.green, label: "Reservdelslager" },
              { color: C.purple, label: "Reception" },
              { color: C.red, label: "Besiktning" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.secondary }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color + "44", border: `1px solid ${l.color}`, display: "inline-block" }} />
                {l.label}
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.secondary }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.blue, display: "inline-block" }} />
              Mekaniker i zon
            </div>
          </div>
        </div>
      )}

      {/* View: Spaghetti Diagram */}
      {!loading && activeView === "spaghetti" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span style={{ color: C.secondary, fontSize: 12 }}>
              Varje linje = en rörelse mellan zoner. Tjockare linje = fler resor. Röda cirklar = korsningar (slöseri).
            </span>
          </div>
          {spaghettiData ? (
            <>
              <SpaghettiDiagram data={spaghettiData} />
              <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
                <div style={{ fontSize: 12, color: C.secondary }}>
                  Rörelser: <strong style={{ color: C.text }}>{spaghettiData.edges.length}</strong>
                </div>
                <div style={{ fontSize: 12, color: C.secondary }}>
                  Korsningar: <strong style={{ color: C.red }}>{spaghettiData.crossings.length}</strong>
                </div>
                {spaghettiData.demo && (
                  <div style={{ fontSize: 11, color: C.orange, background: C.orange + "18", border: `1px solid ${C.orange}33`, borderRadius: 6, padding: "2px 8px" }}>
                    Demo-data
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: C.tertiary }}>Ingen data</div>
          )}
        </div>
      )}

      {/* View: Friction Analysis */}
      {!loading && activeView === "friction" && (
        <div>
          {frictionData ? (
            <>
              {/* Efficiency score */}
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "20px 24px",
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                }}
              >
                <div>
                  <div style={{ fontSize: 48, fontWeight: 800, color: frictionData.efficiency_pct >= 80 ? C.green : frictionData.efficiency_pct >= 60 ? C.orange : C.red }}>
                    {frictionData.efficiency_pct}%
                  </div>
                  <div style={{ color: C.secondary, fontSize: 13 }}>Verkstadseffektivitet</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.text, fontSize: 14, marginBottom: 4 }}>
                    {frictionData.efficiency_pct >= 80
                      ? "Bra flöde! Minimala friktionspunkter."
                      : frictionData.efficiency_pct >= 60
                      ? "Medeleffektivt — se förbättringsförslag nedan."
                      : "Hög friktionsnivå — omedelbar åtgärd rekommenderas."}
                  </div>
                  <div style={{ color: C.secondary, fontSize: 12 }}>
                    {frictionData.frictions.length} aktiva friktionspunkter identifierade
                  </div>
                </div>
              </div>

              {frictionData.frictions.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: C.secondary }}>
                  Inga aktiva friktionspunkter 🎉
                </div>
              ) : (
                frictionData.frictions.map((f) => (
                  <FrictionCard key={f.id} friction={f} onResolve={handleResolve} />
                ))
              )}

              {frictionData.demo && (
                <div style={{ fontSize: 11, color: C.orange, background: C.orange + "18", border: `1px solid ${C.orange}33`, borderRadius: 6, padding: "4px 10px", marginTop: 12, display: "inline-block" }}>
                  Demo-data — kör friktionsanalys för att generera riktiga insikter
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: C.secondary }}>
              Ingen friktionsdata. Klicka "Kör friktionsanalys" för att analysera.
            </div>
          )}
        </div>
      )}

      {/* View: Movement Summary */}
      {!loading && activeView === "movement" && (
        <div>
          {movementData?.per_user && movementData.per_user.length > 0 ? (
            <>
              <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: C.secondary, fontSize: 12 }}>Dagens rörelseöversikt per person</span>
                {movementData.demo && (
                  <span style={{ fontSize: 11, color: "#FF9500", background: "rgba(255,149,0,0.1)", border: "1px solid rgba(255,149,0,0.2)", borderRadius: 6, padding: "2px 8px" }}>
                    Demo-data
                  </span>
                )}
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                <MovementTable users={movementData.per_user} />
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: C.secondary }}>
              Ingen rörelsedata tillgänglig
            </div>
          )}
        </div>
      )}
    </div>
  );
}
