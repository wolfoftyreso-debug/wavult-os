// ---------------------------------------------------------------------------
// ControlLayerModule — The Live Operational Map
// "If you can see the flow, you can control the outcome."
// ---------------------------------------------------------------------------
// View 1: Live Flow Map     — every resource, every step, in real time
// View 2: Bottleneck Radar  — active issues, severity, patterns
// View 3: RCA               — automated root cause investigations
// View 4: Improvements      — actionable intelligence from RCAs
// View 5: Flow Analytics    — historical trends, utilization, throughput
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "https://api.bc.pixdrift.com";

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = localStorage.getItem("pixdrift_token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const api = {
  get:    (path: string)                => apiFetch(path),
  post:   (path: string, body: unknown) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
  patch:  (path: string, body: unknown) => apiFetch(path, { method: "PATCH", body: JSON.stringify(body) }),
};

// ---------------------------------------------------------------------------
// Design tokens — Apple HIG
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
const shadow = "0 1px 3px rgba(0,0,0,0.06)";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function minutesSince(ts: string | null | undefined): number {
  if (!ts) return 0;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatSince(ts: string): string {
  const mins = minutesSince(ts);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: C.red,
  HIGH:     C.orange,
  MEDIUM:   C.orange,
  LOW:      C.secondary,
};

const SEVERITY_DOT_COLOR: Record<string, string> = {
  CRITICAL: C.red,
  HIGH:     C.orange,
  MEDIUM:   "#FFD60A",
  LOW:      C.green,
};

const STEP_LABELS: Record<string, string> = {
  BOOKED:     "Bokad",
  CHECKED_IN: "Inlämnad",
  ASSESSMENT: "Diagnos",
  PARTS:      "Delar",
  REPAIR:     "Reparation",
  QC:         "Kvalitet",
  DELIVERY:   "Utlämning",
};

// ---------------------------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------------------------
type Tab = "map" | "radar" | "rca" | "improvements" | "analytics";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "map",          label: "Flödeskarta",  icon: "⬛" },
  { id: "radar",        label: "Radar",         icon: "🎯" },
  { id: "rca",          label: "Rotorsaksanalys", icon: "🔍" },
  { id: "improvements", label: "Åtgärder",      icon: "✅" },
  { id: "analytics",    label: "Analys",         icon: "📊" },
];

// ---------------------------------------------------------------------------
// View 1: Live Flow Map
// ---------------------------------------------------------------------------
const FLOW_STEPS = ["BOOKED", "CHECKED_IN", "ASSESSMENT", "PARTS", "REPAIR", "QC", "DELIVERY"];

function FlowCard({ item }: { item: any }) {
  const isDelayed = item.isDelayed;
  return (
    <div style={{
      background: C.surface,
      border: `0.5px solid ${isDelayed ? C.orange : C.border}`,
      borderLeft: `3px solid ${isDelayed ? C.orange : C.blue}`,
      borderRadius: "0 8px 8px 0",
      padding: "10px 12px",
      marginBottom: 6,
      boxShadow: shadow,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontVariantNumeric: "tabular-nums" }}>
          {item.vehicle_reg ?? "—"}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: isDelayed ? C.orange : C.secondary,
          fontVariantNumeric: "tabular-nums",
        }}>
          {formatDuration(item.timeInStep)}
        </span>
      </div>
      <div style={{ fontSize: 11, color: C.secondary }}>
        {item.work_type ?? "Arbetsorder"}{item.technician_name ? ` · ${item.technician_name}` : ""}
      </div>
      {isDelayed && (
        <div style={{ fontSize: 10, color: C.orange, marginTop: 4, fontWeight: 600 }}>
          ⏱ {item.overPct}% över förväntat
        </div>
      )}
      {item.priority === "URGENT" && (
        <div style={{ fontSize: 10, color: C.red, marginTop: 2, fontWeight: 600 }}>🔴 URGENT</div>
      )}
    </div>
  );
}

function FlowColumn({ step, column }: { step: string; column: any }) {
  const label = STEP_LABELS[step] ?? step;
  const hasIssue = column.isSlower;

  return (
    <div style={{
      minWidth: 180,
      maxWidth: 220,
      flex: "0 0 auto",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Column header */}
      <div style={{
        background: hasIssue ? "#FFF3E0" : C.surface,
        border: `0.5px solid ${hasIssue ? C.orange : C.border}`,
        borderRadius: 8,
        padding: "10px 12px",
        marginBottom: 8,
        boxShadow: shadow,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {label}
          </span>
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: column.items.length > 0 ? C.blue : C.tertiary,
            background: column.items.length > 0 ? "#E5F1FF" : C.fill,
            borderRadius: 10,
            padding: "1px 7px",
          }}>
            {column.items.length}
          </span>
        </div>
        {column.items.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <span style={{ fontSize: 10, color: C.secondary }}>
              Snitt: {formatDuration(column.avgTime)}
            </span>
            {hasIssue && (
              <div style={{ fontSize: 10, color: C.orange, fontWeight: 600, marginTop: 2 }}>
                🔴 {column.overPct}% långsammare än normalt
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cards */}
      <div style={{ flex: 1 }}>
        {column.items.length === 0 ? (
          <div style={{
            border: `1px dashed ${C.border}`,
            borderRadius: 8,
            padding: "16px 12px",
            textAlign: "center",
            color: C.tertiary,
            fontSize: 11,
          }}>
            Tom
          </div>
        ) : (
          column.items.map((item: any) => <FlowCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

function LiveFlowMap() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = useCallback(async () => {
    try {
      const d = await api.get("/api/control/live-map");
      setData(d);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: C.secondary, fontSize: 13 }}>
        Laddar flödesdata…
      </div>
    );
  }

  const flowColumns = data?.flowColumns ?? {};
  const activeBottlenecks = data?.activeBottlenecks ?? [];
  const totalActive = Object.values(flowColumns).reduce((s: number, col: any) => s + (col.items?.length ?? 0), 0);
  const delayed = Object.values(flowColumns).reduce((s: number, col: any) =>
    s + (col.items ?? []).filter((i: any) => i.isDelayed).length, 0);

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Aktiva arbetsorder", value: totalActive, color: C.blue },
          { label: "Försenade", value: delayed, color: delayed > 0 ? C.orange : C.green },
          { label: "Aktiva flaskhalsar", value: activeBottlenecks.length, color: activeBottlenecks.length > 0 ? C.red : C.green },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: C.surface,
            border: `0.5px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px 18px",
            boxShadow: shadow,
            flex: "1 1 120px",
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 11, color: C.secondary, marginTop: 2 }}>{label}</div>
          </div>
        ))}
        <div style={{
          background: C.surface,
          border: `0.5px solid ${C.border}`,
          borderRadius: 10,
          padding: "12px 18px",
          boxShadow: shadow,
          flex: "1 1 120px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}>
          <div style={{ fontSize: 11, color: C.secondary }}>Senast uppdaterat</div>
          <div style={{ fontSize: 12, color: C.text, fontWeight: 500, marginTop: 2 }}>
            {lastRefresh.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div style={{ fontSize: 10, color: C.secondary, marginTop: 1 }}>Auto-uppdatering var 60s</div>
        </div>
      </div>

      {/* Active bottleneck alert */}
      {activeBottlenecks.length > 0 && (
        <div style={{
          background: "#FFF3E0",
          border: `1px solid ${C.orange}`,
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
              {activeBottlenecks.length} aktiv{activeBottlenecks.length > 1 ? "a" : ""} flaskhals{activeBottlenecks.length > 1 ? "ar" : ""} detekterad{activeBottlenecks.length > 1 ? "e" : ""}
            </div>
            <div style={{ fontSize: 11, color: C.secondary, marginTop: 2 }}>
              {activeBottlenecks.map((b: any) => `${b.bottleneck_type} @ ${b.location ?? "–"}`).join(" · ")}
            </div>
          </div>
        </div>
      )}

      {/* Flow map — horizontal scroll */}
      <div style={{
        overflowX: "auto",
        paddingBottom: 8,
      }}>
        <div style={{
          display: "flex",
          gap: 12,
          minWidth: FLOW_STEPS.length * 195,
          alignItems: "flex-start",
        }}>
          {FLOW_STEPS.map((step, i) => (
            <div key={step} style={{ display: "flex", gap: 12, flex: "0 0 auto" }}>
              <FlowColumn step={step} column={flowColumns[step] ?? { items: [], avgTime: 0, expectedTime: 60, isSlower: false, overPct: 0 }} />
              {i < FLOW_STEPS.length - 1 && (
                <div style={{
                  display: "flex", alignItems: "flex-start", paddingTop: 18,
                  color: C.tertiary, fontSize: 16, flex: "0 0 auto",
                }}>
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Technicians */}
      {data?.technicians?.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.secondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            Tekniker
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {data.technicians.map((t: any) => (
              <div key={t.id} style={{
                background: C.surface,
                border: `0.5px solid ${C.border}`,
                borderRadius: 8,
                padding: "10px 14px",
                boxShadow: shadow,
                minWidth: 160,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.name}</div>
                <div style={{ fontSize: 11, color: C.secondary, marginTop: 2 }}>{t.role}</div>
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.secondary, marginBottom: 3 }}>
                    <span>Beläggning</span>
                    <span style={{ fontWeight: 700, color: (t.utilization_pct ?? 0) > 90 ? C.red : (t.utilization_pct ?? 0) > 70 ? C.orange : C.green }}>
                      {t.utilization_pct ?? 0}%
                    </span>
                  </div>
                  <div style={{ height: 4, background: C.fill, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(t.utilization_pct ?? 0, 100)}%`,
                      background: (t.utilization_pct ?? 0) > 90 ? C.red : (t.utilization_pct ?? 0) > 70 ? C.orange : C.green,
                      borderRadius: 2,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// View 2: Bottleneck Radar
// ---------------------------------------------------------------------------
function BottleneckRadar({ onInvestigate }: { onInvestigate: (id: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.get("/api/control/bottlenecks");
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function dismiss(id: string) {
    setDismissing(id);
    try {
      await api.patch(`/api/control/bottlenecks/${id}`, { status: "DISMISSED" });
      setData((prev: any) => ({
        ...prev,
        active: prev.active.filter((b: any) => b.id !== id),
      }));
    } catch (e) {
      console.error(e);
    }
    setDismissing(null);
  }

  async function runDetection() {
    setLoading(true);
    try {
      await api.post("/api/control/detect", {});
      await load();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  if (loading) return <div style={{ color: C.secondary, fontSize: 13, padding: 20 }}>Söker flaskhalsar…</div>;

  const active = data?.active ?? [];
  const recentResolved = data?.recentResolved ?? [];
  const patterns = data?.patterns ?? [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Flaskhalsar</div>
          <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
            {active.length} aktiva · {recentResolved.length} nyligen lösta
          </div>
        </div>
        <button
          onClick={runDetection}
          style={{
            background: C.blue, color: "#FFF", border: "none", borderRadius: 8,
            padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          Analysera nu
        </button>
      </div>

      {/* Active bottlenecks */}
      {active.length === 0 ? (
        <div style={{
          background: "#F0FFF4", border: `1px solid ${C.green}`, borderRadius: 10,
          padding: "20px", textAlign: "center", marginBottom: 20,
        }}>
          <div style={{ fontSize: 22 }}>✅</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 8 }}>Inga aktiva flaskhalsar</div>
          <div style={{ fontSize: 11, color: C.secondary, marginTop: 4 }}>Verksamheten flödar som den ska</div>
        </div>
      ) : (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.secondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            Aktiva ({active.length})
          </div>
          {active.map((b: any) => (
            <div key={b.id} style={{
              background: C.surface,
              border: `0.5px solid ${SEVERITY_COLOR[b.severity] ?? C.border}`,
              borderLeft: `4px solid ${SEVERITY_COLOR[b.severity] ?? C.border}`,
              borderRadius: "0 10px 10px 0",
              padding: "14px 16px",
              marginBottom: 10,
              boxShadow: shadow,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: SEVERITY_DOT_COLOR[b.severity] ?? C.secondary,
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                      {b.bottleneck_type?.replace("_", " ")}
                    </span>
                    {b.location && (
                      <span style={{
                        fontSize: 10, color: C.blue, background: "#E5F1FF",
                        padding: "1px 6px", borderRadius: 10, fontWeight: 600,
                      }}>
                        {STEP_LABELS[b.location] ?? b.location}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: C.secondary, marginLeft: "auto" }}>
                      {b.affected_count} påverkad{b.affected_count !== 1 ? "e" : ""} · {formatSince(b.detected_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: C.text, marginBottom: 6 }}>{b.description}</div>
                  {b.avg_delay_minutes && (
                    <div style={{ fontSize: 11, color: C.orange }}>
                      ⏱ Genomsnittlig fördröjning: {formatDuration(b.avg_delay_minutes)}
                    </div>
                  )}
                  {/* Historical pattern hint */}
                  {patterns.filter((p: any) => p.entity_type === b.location && p.occurrence_count > 2).length > 0 && (
                    <div style={{ fontSize: 11, color: C.purple, marginTop: 4 }}>
                      📈 Återkommande mönster — {patterns.find((p: any) => p.entity_type === b.location)?.occurrence_count} gånger detekterat
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => onInvestigate(b.id)}
                    disabled={b.status === "INVESTIGATING"}
                    style={{
                      background: b.status === "INVESTIGATING" ? C.fill : C.blue,
                      color: b.status === "INVESTIGATING" ? C.secondary : "#FFF",
                      border: "none", borderRadius: 7,
                      padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: b.status === "INVESTIGATING" ? "default" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {b.status === "INVESTIGATING" ? "Utreds…" : "Undersök →"}
                  </button>
                  <button
                    onClick={() => dismiss(b.id)}
                    disabled={dismissing === b.id}
                    style={{
                      background: C.fill, color: C.secondary,
                      border: `0.5px solid ${C.border}`, borderRadius: 7,
                      padding: "5px 12px", fontSize: 11, cursor: "pointer",
                    }}
                  >
                    Avfärda
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recently resolved */}
      {recentResolved.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.secondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            Nyligen lösta
          </div>
          {recentResolved.slice(0, 5).map((b: any) => (
            <div key={b.id} style={{
              background: C.surface,
              border: `0.5px solid ${C.border}`,
              borderLeft: `3px solid ${C.green}`,
              borderRadius: "0 8px 8px 0",
              padding: "10px 14px",
              marginBottom: 8,
              opacity: 0.7,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                    {b.bottleneck_type?.replace("_", " ")}
                  </span>
                  {b.location && (
                    <span style={{ fontSize: 11, color: C.secondary }}> @ {STEP_LABELS[b.location] ?? b.location}</span>
                  )}
                </div>
                <span style={{ fontSize: 10, color: C.secondary }}>{formatSince(b.resolved_at)}</span>
              </div>
              {b.root_cause && (
                <div style={{ fontSize: 11, color: C.secondary, marginTop: 3 }}>
                  Rotorsak: {b.root_cause}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// View 3: Root Cause Analysis
// ---------------------------------------------------------------------------
function RCAView({ selectedBottleneckId, onClear }: { selectedBottleneckId: string | null; onClear: () => void }) {
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [investigating, setInvestigating] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState<{ inv_id: string; role: string; text: string; cause: string; suggestion: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadInvestigations = useCallback(async () => {
    try {
      const d = await api.get("/api/control/bottlenecks");
      // Gather all investigations from active bottlenecks
      const allInvs: any[] = [];
      for (const b of (d.active ?? [])) {
        if (b.rca_investigations?.length > 0) {
          allInvs.push(...b.rca_investigations.map((inv: any) => ({ ...inv, bottleneck: b })));
        }
      }
      setInvestigations(allInvs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInvestigations(); }, [loadInvestigations]);

  // If a bottleneck was passed in, auto-start investigation
  useEffect(() => {
    if (selectedBottleneckId) {
      startInvestigation(selectedBottleneckId);
    }
  }, [selectedBottleneckId]);

  async function startInvestigation(bottleneckId: string) {
    setInvestigating(bottleneckId);
    try {
      const result = await api.post(`/api/control/investigate/${bottleneckId}`, {});
      setSelected(result);
      await loadInvestigations();
      onClear();
    } catch (e) {
      console.error(e);
    } finally {
      setInvestigating(null);
    }
  }

  async function submitFeedback() {
    if (!feedbackForm) return;
    setSubmitting(true);
    try {
      const result = await api.post(`/api/control/feedback/${feedbackForm.inv_id}`, {
        role: feedbackForm.role,
        response_text: feedbackForm.text,
        confirmed_cause: feedbackForm.cause || undefined,
        improvement_suggestion: feedbackForm.suggestion || undefined,
      });
      setSelected((prev: any) => ({ ...prev, investigation: result.investigation }));
      setFeedbackForm(null);
      await loadInvestigations();
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  }

  if (loading) return <div style={{ color: C.secondary, fontSize: 13, padding: 20 }}>Laddar utredningar…</div>;

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Rotorsaksanalys</div>
      <div style={{ fontSize: 12, color: C.secondary, marginBottom: 20 }}>
        Automatiserad analys av PIX-händelsemönster — identifierar orsaker, skickar frågor, skapar åtgärder
      </div>

      {/* Active investigation result */}
      {investigating && (
        <div style={{ background: "#E5F1FF", border: `1px solid ${C.blue}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.blue }}>🔍 Analyserar PIX-händelser…</div>
          <div style={{ fontSize: 11, color: C.secondary, marginTop: 4 }}>Söker mönster i 30-dagarshistorik</div>
        </div>
      )}

      {selected && (
        <div style={{
          background: C.surface,
          border: `0.5px solid ${C.border}`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          boxShadow: shadow,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{selected.investigation?.title}</div>
              <div style={{ fontSize: 11, color: C.secondary, marginTop: 2 }}>
                Status: {selected.investigation?.status} · Konfidensgrad: {Math.round((selected.investigation?.confidence_score ?? 0) * 100)}%
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{
              background: C.fill, color: C.secondary, border: "none", borderRadius: 6,
              padding: "4px 10px", fontSize: 11, cursor: "pointer",
            }}>✕</button>
          </div>

          {/* Auto analysis summary */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.secondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              Automatisk analys
            </div>
            <div style={{ background: C.fill, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, color: C.text, marginBottom: 8 }}>
                Baserat på {selected.summary?.eventsAnalyzed ?? 0} PIX-händelser ({selected.summary?.similarDelays ?? 0} liknande förseningar de senaste 30 dagarna):
              </div>
              {(selected.summary?.contributingFactors ?? []).map((f: string, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: C.blue, fontWeight: 700, minWidth: 20 }}>{i + 1}.</span>
                  <span style={{ fontSize: 12, color: C.text }}>{f}</span>
                  <span style={{ fontSize: 10, color: C.secondary, marginLeft: "auto", whiteSpace: "nowrap" }}>
                    {Math.round((selected.summary?.confidence ?? 50) * (1 - i * 0.15))}% konfidens
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `0.5px solid ${C.border}` }}>
                <span style={{ fontSize: 11, color: C.secondary }}>Sannolik rotorsak: </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{selected.investigation?.likely_root_cause}</span>
              </div>
            </div>
          </div>

          {/* Questions sent */}
          {selected.summary?.questionsSentTo?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.secondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                Frågor skickade till
              </div>
              {(selected.investigation?.questions_sent ?? []).map((q: any, i: number) => (
                <div key={i} style={{
                  background: "#F8F0FF", border: `0.5px solid ${C.purple}`,
                  borderRadius: 8, padding: "10px 12px", marginBottom: 6,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.purple, textTransform: "capitalize", marginBottom: 4 }}>
                    → {q.role?.replace("_", " ")}
                  </div>
                  <div style={{ fontSize: 12, color: C.text }}>{q.question}</div>
                  {q.context && <div style={{ fontSize: 10, color: C.secondary, marginTop: 3 }}>{q.context}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Feedback button */}
          {!feedbackForm && (
            <button
              onClick={() => setFeedbackForm({ inv_id: selected.investigation?.id, role: "workshop_manager", text: "", cause: "", suggestion: "" })}
              style={{
                background: C.blue, color: "#FFF", border: "none", borderRadius: 8,
                padding: "10px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              Lägg till svar / bekräfta rotorsak
            </button>
          )}

          {/* Feedback form */}
          {feedbackForm && (
            <div style={{ background: C.fill, borderRadius: 10, padding: 16, marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>Svar på utredning</div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: C.secondary, display: "block", marginBottom: 4 }}>Roll</label>
                <select
                  value={feedbackForm.role}
                  onChange={e => setFeedbackForm(f => f ? { ...f, role: e.target.value } : f)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `0.5px solid ${C.border}`, fontSize: 12 }}
                >
                  <option value="workshop_manager">Verkstadschef</option>
                  <option value="technician">Tekniker</option>
                  <option value="parts">Delar</option>
                  <option value="other">Annat</option>
                </select>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: C.secondary, display: "block", marginBottom: 4 }}>Vad orsakade problemet?</label>
                <textarea
                  value={feedbackForm.cause}
                  onChange={e => setFeedbackForm(f => f ? { ...f, cause: e.target.value } : f)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `0.5px solid ${C.border}`, fontSize: 12, minHeight: 60, resize: "vertical" }}
                  placeholder="Bekräftad rotorsak…"
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: C.secondary, display: "block", marginBottom: 4 }}>Förbättringsförslag</label>
                <textarea
                  value={feedbackForm.suggestion}
                  onChange={e => setFeedbackForm(f => f ? { ...f, suggestion: e.target.value } : f)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `0.5px solid ${C.border}`, fontSize: 12, minHeight: 60, resize: "vertical" }}
                  placeholder="Vad kan vi göra annorlunda nästa gång?"
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={submitFeedback}
                  disabled={submitting}
                  style={{
                    background: C.blue, color: "#FFF", border: "none", borderRadius: 8,
                    padding: "9px 18px", fontSize: 12, fontWeight: 600, cursor: submitting ? "default" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? "Sparar…" : "Skicka svar"}
                </button>
                <button
                  onClick={() => setFeedbackForm(null)}
                  style={{
                    background: C.fill, color: C.secondary, border: `0.5px solid ${C.border}`,
                    borderRadius: 8, padding: "9px 14px", fontSize: 12, cursor: "pointer",
                  }}
                >
                  Avbryt
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Existing investigations */}
      {investigations.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.secondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            Pågående utredningar
          </div>
          {investigations.map((inv: any) => (
            <div key={inv.id} style={{
              background: C.surface,
              border: `0.5px solid ${C.border}`,
              borderRadius: 10, padding: "12px 16px", marginBottom: 8, boxShadow: shadow,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{inv.title}</div>
                  <div style={{ fontSize: 11, color: C.secondary, marginTop: 2 }}>
                    Status: {inv.status} · Konfidens: {Math.round((inv.confidence_score ?? 0) * 100)}%
                  </div>
                  {inv.likely_root_cause && (
                    <div style={{ fontSize: 11, color: C.text, marginTop: 4 }}>
                      Sannolik orsak: {inv.likely_root_cause}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: 10, padding: "3px 8px", borderRadius: 8, fontWeight: 600,
                  background: inv.status === "CONCLUDED" ? "#F0FFF4" : "#E5F1FF",
                  color: inv.status === "CONCLUDED" ? C.green : C.blue,
                }}>
                  {inv.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!selected && investigations.length === 0 && !investigating && (
        <div style={{
          background: C.fill, border: `1px dashed ${C.border}`, borderRadius: 10,
          padding: 32, textAlign: "center",
        }}>
          <div style={{ fontSize: 14, color: C.secondary }}>🔍</div>
          <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginTop: 8 }}>Inga aktiva utredningar</div>
          <div style={{ fontSize: 11, color: C.secondary, marginTop: 4 }}>
            Klicka på "Undersök →" på en flaskhals för att starta en automatiserad rotorsaksanalys
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// View 4: Improvement Actions
// ---------------------------------------------------------------------------
function ImprovementActionsView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/control/improvements")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: C.secondary, fontSize: 13, padding: 20 }}>Laddar åtgärder…</div>;

  const improvements = data?.improvements ?? [];

  const IMPACT_COLOR: Record<string, string> = {
    CRITICAL: C.red, HIGH: C.orange, MEDIUM: C.blue, LOW: C.secondary,
  };

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Åtgärder</div>
      <div style={{ fontSize: 12, color: C.secondary, marginBottom: 20 }}>
        Härledda från rotorsaksanalyser — sorterade efter påverkan × konfidensgrad × angelägenhet
      </div>

      {improvements.length === 0 ? (
        <div style={{
          background: C.fill, border: `1px dashed ${C.border}`, borderRadius: 10,
          padding: 32, textAlign: "center",
        }}>
          <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>Inga åtgärder ännu</div>
          <div style={{ fontSize: 11, color: C.secondary, marginTop: 4 }}>
            Genomför rotorsaksanalyser för att generera förbättringsåtgärder
          </div>
        </div>
      ) : (
        improvements.map((imp: any, i: number) => (
          <div key={imp.id ?? i} style={{
            background: C.surface,
            border: `0.5px solid ${C.border}`,
            borderLeft: `4px solid ${IMPACT_COLOR[imp.impact] ?? C.blue}`,
            borderRadius: "0 10px 10px 0",
            padding: "16px 18px",
            marginBottom: 10,
            boxShadow: shadow,
          }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8,
                background: `${IMPACT_COLOR[imp.impact] ?? C.blue}20`,
                color: IMPACT_COLOR[imp.impact] ?? C.blue,
              }}>
                Påverkan: {imp.impact ?? "MEDIUM"}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8,
                background: "#E5F1FF", color: C.blue,
              }}>
                Konfidens: {Math.round((imp.confidence ?? 0.5) * 100)}%
              </span>
              {imp.urgency_days && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8,
                  background: imp.urgency_days <= 3 ? "#FFF0F0" : "#FFF3E0",
                  color: imp.urgency_days <= 3 ? C.red : C.orange,
                }}>
                  ⏰ {imp.urgency_days} dagar
                </span>
              )}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8,
                background: "#F5F0FF", color: C.purple,
              }}>
                Poäng: {imp.totalScore}
              </span>
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>
              {imp.action}
            </div>

            {imp.investigation_title && (
              <div style={{ fontSize: 11, color: C.secondary }}>
                Källa: {imp.investigation_title}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button style={{
                background: C.blue, color: "#FFF", border: "none", borderRadius: 7,
                padding: "7px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>
                Skapa uppgift →
              </button>
              <button style={{
                background: C.fill, color: C.secondary, border: `0.5px solid ${C.border}`,
                borderRadius: 7, padding: "7px 12px", fontSize: 11, cursor: "pointer",
              }}>
                Tilldela ansvarig
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// View 5: Flow Analytics
// ---------------------------------------------------------------------------
function FlowAnalyticsView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get(`/api/control/flow-analysis?days=${days}`);
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ color: C.secondary, fontSize: 13, padding: 20 }}>Laddar analysdata…</div>;

  const stepAnalysis = data?.stepAnalysis ?? [];
  const queueDepth = data?.queueDepth ?? {};
  const techUtils = data?.technicianUtilization ?? [];
  const bottleneckFreq = data?.bottleneckFrequency ?? {};

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Flödesanalys</div>
          <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>Historiska trender och effektivitetsmönster</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                background: days === d ? C.blue : C.fill,
                color: days === d ? "#FFF" : C.secondary,
                border: `0.5px solid ${days === d ? C.blue : C.border}`,
                borderRadius: 7, padding: "5px 10px", fontSize: 11,
                cursor: "pointer", fontWeight: days === d ? 600 : 400,
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Genomströmning", value: `${data?.throughputPerDay ?? 0}/dag`, color: C.blue },
          { label: "Snitt ledtid", value: data?.avgLeadTimeMinutes ? formatDuration(data.avgLeadTimeMinutes) : "–", color: C.text },
          { label: "Slutförda order", value: data?.completedCount ?? 0, color: C.green },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: C.surface, border: `0.5px solid ${C.border}`,
            borderRadius: 10, padding: "14px 16px", boxShadow: shadow,
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 11, color: C.secondary, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Step efficiency */}
      {stepAnalysis.length > 0 && (
        <div style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: shadow }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 14 }}>Steg-effektivitet vs. baseline</div>
          {stepAnalysis.map((s: any) => {
            const isOver = s.deviationPct > 15;
            const isUnder = s.deviationPct < -10;
            const barColor = isOver ? C.orange : isUnder ? C.green : C.blue;
            const pct = Math.min(Math.abs(s.deviationPct), 100);
            return (
              <div key={s.step} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ fontWeight: 500, color: C.text }}>{STEP_LABELS[s.step] ?? s.step}</span>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ color: C.secondary }}>{formatDuration(s.avgMinutes)} snitt</span>
                    <span style={{ fontWeight: 700, color: barColor }}>
                      {s.deviationPct > 0 ? "+" : ""}{s.deviationPct}%
                    </span>
                  </div>
                </div>
                <div style={{ height: 6, background: C.fill, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Technician utilization */}
      {techUtils.length > 0 && (
        <div style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: shadow }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 14 }}>Teknikerbeläggning</div>
          {techUtils.map((t: any) => {
            const pct = Math.min(t.utilizationPct, 100);
            const color = pct > 90 ? C.red : pct > 70 ? C.orange : C.green;
            return (
              <div key={t.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ fontWeight: 500, color: C.text }}>{t.name}</span>
                  <span style={{ fontWeight: 700, color }}>{pct}%</span>
                </div>
                <div style={{ height: 6, background: C.fill, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottleneck frequency by step */}
      {Object.keys(bottleneckFreq).length > 0 && (
        <div style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 20, boxShadow: shadow }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 14 }}>Flaskhalsfrekvens per steg</div>
          {Object.entries(bottleneckFreq)
            .sort(([, a], [, b]) => Number(b) - Number(a))
            .map(([step, count]) => {
              const maxCount = Math.max(...Object.values(bottleneckFreq).map(Number));
              const pct = maxCount > 0 ? (Number(count) / maxCount) * 100 : 0;
              return (
                <div key={step} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500, color: C.text }}>{STEP_LABELS[step] ?? step}</span>
                    <span style={{ fontWeight: 700, color: C.orange }}>{String(count)} gånger</span>
                  </div>
                  <div style={{ height: 6, background: C.fill, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: C.orange, borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {stepAnalysis.length === 0 && Object.keys(queueDepth).length === 0 && (
        <div style={{
          background: C.fill, border: `1px dashed ${C.border}`, borderRadius: 10,
          padding: 32, textAlign: "center",
        }}>
          <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>Inte tillräckligt med data ännu</div>
          <div style={{ fontSize: 11, color: C.secondary, marginTop: 4 }}>
            Data samlas in automatiskt allteftersom verksamheten löper
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main module
// ---------------------------------------------------------------------------
export default function ControlLayerModule() {
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const [selectedBottleneckId, setSelectedBottleneckId] = useState<string | null>(null);

  function handleInvestigate(id: string) {
    setSelectedBottleneckId(id);
    setActiveTab("rca");
  }

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif" }}>
      {/* Module header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#000", letterSpacing: -0.5 }}>
          Kontrollager
        </div>
        <div style={{ fontSize: 13, color: C.secondary, marginTop: 3 }}>
          Om du kan se flödet kan du styra utfallet
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex",
        gap: 4,
        background: C.inset,
        borderRadius: 10,
        padding: 4,
        marginBottom: 24,
        overflowX: "auto",
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: "1 1 auto",
              padding: "8px 12px",
              borderRadius: 7,
              border: "none",
              background: activeTab === tab.id ? C.surface : "transparent",
              color: activeTab === tab.id ? C.text : C.secondary,
              fontSize: 12,
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: "pointer",
              boxShadow: activeTab === tab.id ? shadow : "none",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Views */}
      {activeTab === "map" && <LiveFlowMap />}
      {activeTab === "radar" && <BottleneckRadar onInvestigate={handleInvestigate} />}
      {activeTab === "rca" && (
        <RCAView
          selectedBottleneckId={selectedBottleneckId}
          onClear={() => setSelectedBottleneckId(null)}
        />
      )}
      {activeTab === "improvements" && <ImprovementActionsView />}
      {activeTab === "analytics" && <FlowAnalyticsView />}
    </div>
  );
}
