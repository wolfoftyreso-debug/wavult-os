// ---------------------------------------------------------------------------
// WorkshopStateModule — Hard Enforcement Engine UI
// ---------------------------------------------------------------------------
// "Ingen verkstad kan göra fel — systemet tillåter det inte"
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// API helper (same pattern as DMSModule)
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
  get:  (path: string)                => apiFetch(path),
  post: (path: string, body: unknown) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
};

// ---------------------------------------------------------------------------
// Design tokens (matches rest of workstation app)
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
// Types
// ---------------------------------------------------------------------------

type WorkshopState =
  | "BOOKED"
  | "PREPLANNED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "ADDITIONAL_WORK"
  | "QC_PENDING"
  | "QC_APPROVED"
  | "READY_FOR_DELIVERY"
  | "DELIVERED"
  | "CLOSED";

type WorkshopRole =
  | "TECHNICIAN"
  | "OPERATIONS_LEAD"
  | "QC_INSPECTOR"
  | "RECEPTIONIST"
  | "WORKSHOP_MANAGER"
  | "PARTS_MANAGER";

interface Blocker {
  check: string;
  message: string;
}

interface AvailableTransition {
  to_state: WorkshopState;
  blockers: Blocker[];
  can_transition: boolean;
  requires_role: WorkshopRole[];
}

interface WorkOrder {
  id: string;
  order_number: string;
  status: WorkshopState;
  customer_id?: string;
  vehicle_vin?: string;
  vehicle_reg?: string;
  technician_id?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
  started_at?: string;
  delivered_at?: string;
}

interface ChecklistItem {
  id: string;
  item_id: string;
  category?: string;
  item: string;
  required: boolean | "if_applicable" | "if_warranty";
  completed: boolean;
  completed_by?: string;
  completed_at?: string;
}

interface ChecklistStatus {
  total: number;
  required_total: number;
  completed: number;
  required_completed: number;
  percent_required: number;
  is_complete: boolean;
}

interface AuditEntry {
  id: string;
  action: string;
  from_state?: string;
  to_state?: string;
  user_id: string;
  blockers_at_time?: Blocker[];
  created_at: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATE_ORDER: WorkshopState[] = [
  "BOOKED",
  "PREPLANNED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "QC_PENDING",
  "QC_APPROVED",
  "READY_FOR_DELIVERY",
  "DELIVERED",
  "CLOSED",
];

const STATE_LABELS: Record<WorkshopState, string> = {
  BOOKED:            "Bokad",
  PREPLANNED:        "Förplanerad",
  CHECKED_IN:        "Incheckad",
  IN_PROGRESS:       "Pågår",
  ADDITIONAL_WORK:   "Tilläggsarbete",
  QC_PENDING:        "QC-kontroll",
  QC_APPROVED:       "QC-godkänd",
  READY_FOR_DELIVERY:"Leveransklar",
  DELIVERED:         "Levererad",
  CLOSED:            "Stängd",
};

const STATE_COLORS: Record<WorkshopState, string> = {
  BOOKED:            "#007AFF",
  PREPLANNED:        "#AF52DE",
  CHECKED_IN:        "#FF9500",
  IN_PROGRESS:       "#34C759",
  ADDITIONAL_WORK:   "#FF3B30",
  QC_PENDING:        "#FF9500",
  QC_APPROVED:       "#34C759",
  READY_FOR_DELIVERY:"#007AFF",
  DELIVERED:         "#34C759",
  CLOSED:            "#8E8E93",
};

const ROLE_LABELS: Record<WorkshopRole, string> = {
  TECHNICIAN:       "Tekniker",
  OPERATIONS_LEAD:  "Serviceadvisör",
  QC_INSPECTOR:     "QC-inspektör",
  RECEPTIONIST:     "Receptionist",
  WORKSHOP_MANAGER: "Verkstadschef",
  PARTS_MANAGER:    "Reservdelschef",
};

// ---------------------------------------------------------------------------
// Pipeline columns (Kanban)
// ---------------------------------------------------------------------------

const PIPELINE_STATES: WorkshopState[] = [
  "BOOKED",
  "PREPLANNED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "QC_PENDING",
  "QC_APPROVED",
  "READY_FOR_DELIVERY",
  "DELIVERED",
];

// ---------------------------------------------------------------------------
// Styles injected once
// ---------------------------------------------------------------------------

const STYLES = `
  @keyframes checkSlide {
    0%   { transform: scale(0.5); opacity: 0; }
    70%  { transform: scale(1.2); }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes progressGrow {
    from { width: 0%; }
    to   { width: var(--target-width); }
  }
  .ws-check-animate { animation: checkSlide 0.2s ease forwards; }
  .ws-progress-bar  { transition: width 0.4s ease; }
  .ws-card { transition: box-shadow 0.15s ease, transform 0.15s ease; }
  .ws-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.10); transform: translateY(-1px); }
  .ws-btn-trans { transition: background 0.15s ease, opacity 0.15s ease; }
  .ws-btn-trans:hover:not(:disabled) { filter: brightness(0.92); }
  .ws-btn-trans:active:not(:disabled) { transform: scale(0.97); }
`;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// ── StateButton ─────────────────────────────────────────────────────────────

interface StateButtonProps {
  order: WorkOrder;
  transition: AvailableTransition;
  onSuccess: () => void;
  userRole: WorkshopRole;
}

function StateButton({ order, transition, onSuccess, userRole }: StateButtonProps) {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canTransition = transition.can_transition;
  const hasRole = transition.requires_role.includes(userRole);

  const handleTransition = async () => {
    if (!canTransition || loading) return;
    setLoading(true);
    setError(null);
    try {
      await api.post(`/api/workshop/work-orders/${order.id}/transition`, {
        to_state: transition.to_state,
        data: {},
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Fel vid transition");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleTransition}
        disabled={!canTransition || !hasRole || loading}
        className="ws-btn-trans"
        style={{
          width: "100%",
          padding: "10px 14px",
          background: canTransition && hasRole ? C.green : C.red,
          color: "#fff",
          opacity: canTransition && hasRole ? 1 : 0.75,
          border: "none",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          cursor: canTransition && hasRole ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {loading ? (
          "…"
        ) : canTransition && hasRole ? (
          <>Flytta till {STATE_LABELS[transition.to_state]} →</>
        ) : !hasRole ? (
          <>🔒 Kräver {transition.requires_role.map(r => ROLE_LABELS[r]).join(" / ")}</>
        ) : (
          <>{transition.blockers.length} krav saknas</>
        )}
      </button>

      {error && (
        <div style={{ marginTop: 6, color: C.red, fontSize: 12 }}>{error}</div>
      )}

      {!canTransition && transition.blockers.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {transition.blockers.map((b) => (
            <div
              key={b.check}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                padding: "6px 0",
                borderBottom: `0.5px solid ${C.border}`,
              }}
            >
              <span style={{ color: C.red, flexShrink: 0, fontSize: 13 }}>✕</span>
              <span style={{ fontSize: 13, color: C.secondary, lineHeight: 1.4 }}>
                {b.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── WorkOrderCard ────────────────────────────────────────────────────────────

interface WorkOrderCardProps {
  order: WorkOrder;
  transitions: AvailableTransition[];
  userRole: WorkshopRole;
  onSelect: () => void;
  onRefresh: () => void;
}

function WorkOrderCard({ order, transitions, userRole, onSelect, onRefresh }: WorkOrderCardProps) {
  const stateColor = STATE_COLORS[order.status] ?? C.tertiary;
  const nextTransition = transitions[0];

  return (
    <div
      className="ws-card"
      style={{
        background: C.surface,
        borderRadius: 12,
        padding: 14,
        boxShadow: shadow,
        marginBottom: 10,
        borderLeft: `3px solid ${stateColor}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>
            {order.order_number}
          </div>
          <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
            {order.vehicle_reg || order.vehicle_vin || "—"}
          </div>
        </div>
        <button
          onClick={onSelect}
          style={{
            background: "none",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "3px 8px",
            fontSize: 11,
            color: C.blue,
            cursor: "pointer",
          }}
        >
          Detaljer
        </button>
      </div>

      {order.description && (
        <div
          style={{
            fontSize: 12,
            color: C.secondary,
            marginBottom: 8,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {order.description}
        </div>
      )}

      {nextTransition && (
        <StateButton
          order={order}
          transition={nextTransition}
          onSuccess={onRefresh}
          userRole={userRole}
        />
      )}

      {!nextTransition && order.status !== "CLOSED" && (
        <div
          style={{
            fontSize: 12,
            color: C.tertiary,
            textAlign: "center",
            padding: "8px 0",
          }}
        >
          Inga tillgängliga transitions
        </div>
      )}

      {order.status === "CLOSED" && (
        <div
          style={{
            fontSize: 12,
            color: C.green,
            textAlign: "center",
            padding: "8px 0",
            fontWeight: 600,
          }}
        >
          ✓ Stängd
        </div>
      )}
    </div>
  );
}

// ── ProgressBar ──────────────────────────────────────────────────────────────

function WorkOrderProgressBar({ currentState }: { currentState: WorkshopState }) {
  const idx = STATE_ORDER.indexOf(currentState);
  const effectiveIdx = idx === -1 ? 0 : idx;
  const pct = STATE_ORDER.length > 1
    ? Math.round((effectiveIdx / (STATE_ORDER.length - 1)) * 100)
    : 0;

  return (
    <div>
      {/* Steps */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
          overflowX: "auto",
        }}
      >
        {STATE_ORDER.map((state, i) => {
          const isDone = i < effectiveIdx;
          const isActive = i === effectiveIdx;
          return (
            <div
              key={state}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 52,
                flex: "0 0 auto",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: isDone
                    ? C.green
                    : isActive
                    ? STATE_COLORS[currentState]
                    : C.inset,
                  border: isActive ? `2px solid ${STATE_COLORS[currentState]}` : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: isDone || isActive ? "#fff" : C.secondary,
                  fontWeight: 700,
                  transition: "all 0.3s ease",
                }}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: isActive ? STATE_COLORS[currentState] : C.tertiary,
                  marginTop: 3,
                  textAlign: "center",
                  fontWeight: isActive ? 700 : 400,
                  lineHeight: 1.2,
                }}
              >
                {STATE_LABELS[state].replace(" ", "\n")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bar */}
      <div
        style={{
          height: 4,
          background: C.inset,
          borderRadius: 2,
          overflow: "hidden",
          marginTop: 4,
        }}
      >
        <div
          className="ws-progress-bar"
          style={{
            height: "100%",
            width: `${pct}%`,
            background: STATE_COLORS[currentState] ?? C.blue,
            borderRadius: 2,
          }}
        />
      </div>

      <div
        style={{
          textAlign: "right",
          fontSize: 11,
          color: C.secondary,
          marginTop: 4,
        }}
      >
        Steg {effectiveIdx + 1} / {STATE_ORDER.length} — {pct}%
      </div>
    </div>
  );
}

// ── ChecklistView ────────────────────────────────────────────────────────────

interface ChecklistViewProps {
  workOrderId: string;
  type: "QC" | "DELIVERY";
  userRole: WorkshopRole;
}

function ChecklistView({ workOrderId, type, userRole }: ChecklistViewProps) {

  const [grouped, setGrouped] = useState<Record<string, ChecklistItem[]>>({});
  const [status, setStatus] = useState<ChecklistStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  const load = useCallback(async () => {
    try {
      // Init first (idempotent)
      await api.post(`/api/checklists/${workOrderId}/${type}/init`, {});
      const data = await api.get(`/api/checklists/${workOrderId}/${type}`);
      setGrouped(data.grouped ?? {});
      setStatus(data.status ?? null);
    } catch (err) {
      console.error("Failed to load checklist", err);
    } finally {
      setLoading(false);
    }
  }, [workOrderId, type]);

  useEffect(() => { load(); }, [load]);

  const handleCheck = async (itemId: string, completed: boolean) => {
    setChecking(itemId);
    try {
      await api.post(
        `/api/checklists/${workOrderId}/${type}/item/${itemId}`,
        { completed }
      );
      await load();
      setBlocked(false);
    } catch (err) {
      console.error("Failed to check item", err);
    } finally {
      setChecking(null);
    }
  };

  const handleTryApprove = () => {
    if (status && !status.is_complete) {
      setBlocked(true);
    }
  };

  if (loading) {
    return (
      <div style={{ color: C.secondary, fontSize: 13, padding: 16 }}>
        Laddar checklista…
      </div>
    );
  }

  const typeLabel = type === "QC" ? "QC-checklista" : "Leveranschecklista";

  return (
    <div>
      {/* Header with progress */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>
          {typeLabel}
        </div>
        {status && (
          <div
            style={{
              fontSize: 13,
              color: status.is_complete ? C.green : C.orange,
              fontWeight: 600,
            }}
          >
            {status.required_completed}/{status.required_total} klara
          </div>
        )}
      </div>

      {/* Progress bar */}
      {status && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              height: 8,
              background: C.inset,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              className="ws-progress-bar"
              style={{
                height: "100%",
                width: `${status.percent_required}%`,
                background: status.is_complete ? C.green : C.orange,
                borderRadius: 4,
              }}
            />
          </div>
          <div
            style={{
              fontSize: 11,
              color: C.secondary,
              marginTop: 4,
              textAlign: "right",
            }}
          >
            {status.percent_required}% obligatoriska klara
          </div>
        </div>
      )}

      {/* Blocker warning */}
      {blocked && status && !status.is_complete && (
        <div
          style={{
            background: "#FFF3CD",
            border: `1px solid ${C.orange}`,
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 12,
            fontSize: 13,
            color: "#856404",
          }}
        >
          ⚠️ Checklistan är inte komplett. Alla obligatoriska punkter måste
          avklaras innan godkännande.
        </div>
      )}

      {/* Grouped items */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.secondary,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            {category}
          </div>

          {items.map((item) => {
            const isChecking = checking === item.item_id;
            const isRequired = item.required === true;

            return (
              <div
                key={item.item_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: `0.5px solid ${C.border}`,
                }}
              >
                <button
                  onClick={() => handleCheck(item.item_id, !item.completed)}
                  disabled={isChecking}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    border: item.completed
                      ? "none"
                      : `2px solid ${isRequired ? C.red : C.border}`,
                    background: item.completed ? C.green : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}
                >
                  {item.completed && (
                    <span
                      className="ws-check-animate"
                      style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}
                    >
                      ✓
                    </span>
                  )}
                </button>

                <div style={{ flex: 1 }}>
                  <span
                    style={{
                      fontSize: 14,
                      color: item.completed ? C.secondary : C.text,
                      textDecoration: item.completed
                        ? "line-through"
                        : "none",
                    }}
                  >
                    {item.item}
                  </span>
                  {item.required !== true && (
                    <span
                      style={{
                        fontSize: 11,
                        color: C.tertiary,
                        marginLeft: 6,
                      }}
                    >
                      (vid behov)
                    </span>
                  )}
                </div>

                {isRequired && !item.completed && (
                  <span style={{ color: C.red, fontSize: 12 }}>●</span>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Approve button */}
      <button
        onClick={handleTryApprove}
        disabled={status?.is_complete}
        style={{
          width: "100%",
          marginTop: 12,
          padding: "12px 16px",
          background: status?.is_complete ? C.green : C.red,
          color: "#fff",
          border: "none",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          cursor: status?.is_complete ? "default" : "pointer",
          opacity: status?.is_complete ? 1 : 0.8,
        }}
      >
        {status?.is_complete
          ? `✓ ${typeLabel} klar — redo att gå vidare`
          : `${(status?.required_total ?? 0) - (status?.required_completed ?? 0)} obligatoriska kvar`}
      </button>
    </div>
  );
}

// ── AuditTimeline ────────────────────────────────────────────────────────────

function AuditTimeline({ workOrderId }: { workOrderId: string }) {

  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/api/workshop/work-orders/${workOrderId}/state-audit`)
      .then((d: any) => setAudit(d.audit ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workOrderId]);

  const actionLabel = (action: string) => {
    switch (action) {
      case "TRANSITION_SUCCESS":   return { label: "Transition", color: C.green };
      case "TRANSITION_BLOCKED":   return { label: "Blockad",    color: C.orange };
      case "TRANSITION_DENIED_ROLE": return { label: "Nekad (roll)", color: C.red };
      default:                     return { label: action,       color: C.secondary };
    }
  };

  if (loading) {
    return (
      <div style={{ color: C.secondary, fontSize: 13, padding: 8 }}>
        Laddar historik…
      </div>
    );
  }

  if (audit.length === 0) {
    return (
      <div style={{ color: C.tertiary, fontSize: 13, padding: 8 }}>
        Ingen historik ännu
      </div>
    );
  }

  return (
    <div>
      {audit.map((entry, i) => {
        const { label, color } = actionLabel(entry.action);
        return (
          <div
            key={entry.id}
            style={{
              display: "flex",
              gap: 12,
              paddingBottom: 12,
              position: "relative",
            }}
          >
            {/* Timeline line */}
            {i < audit.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  left: 11,
                  top: 24,
                  bottom: 0,
                  width: 1,
                  background: C.border,
                }}
              />
            )}

            {/* Dot */}
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                color: "#fff",
                fontWeight: 700,
                zIndex: 1,
              }}
            >
              {entry.action === "TRANSITION_SUCCESS"
                ? "✓"
                : entry.action === "TRANSITION_BLOCKED"
                ? "!"
                : "✕"}
            </div>

            {/* Content */}
            <div style={{ flex: 1, paddingTop: 2 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color }}>
                  {label}
                </span>
                <span style={{ fontSize: 11, color: C.secondary }}>
                  {new Date(entry.created_at).toLocaleString("sv-SE", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {entry.from_state && entry.to_state && (
                <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
                  {STATE_LABELS[entry.from_state as WorkshopState] ?? entry.from_state}
                  {" → "}
                  {STATE_LABELS[entry.to_state as WorkshopState] ?? entry.to_state}
                </div>
              )}

              {entry.blockers_at_time && entry.blockers_at_time.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {entry.blockers_at_time.slice(0, 2).map((b) => (
                    <div key={b.check} style={{ fontSize: 11, color: C.red }}>
                      ✕ {b.message}
                    </div>
                  ))}
                  {entry.blockers_at_time.length > 2 && (
                    <div style={{ fontSize: 11, color: C.tertiary }}>
                      + {entry.blockers_at_time.length - 2} till…
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── WorkOrderDetail ──────────────────────────────────────────────────────────

interface WorkOrderDetailProps {
  workOrderId: string;
  userRole: WorkshopRole;
  onBack: () => void;
}

function WorkOrderDetail({ workOrderId, userRole, onBack }: WorkOrderDetailProps) {

  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [transitions, setTransitions] = useState<AvailableTransition[]>([]);
  const [activeTab, setActiveTab] = useState<"info" | "qc" | "delivery" | "audit">("info");

  const load = useCallback(async () => {
    try {
      const [wo, tr] = await Promise.all([
        api.get(`/api/workshop/work-orders/${workOrderId}`),
        api.get(`/api/workshop/work-orders/${workOrderId}/available-transitions?role=${userRole}`),
      ]);
      setOrder(wo);
      setTransitions(tr.transitions ?? []);
    } catch (err) {
      console.error("Failed to load work order", err);
    }
  }, [workOrderId, userRole]);

  useEffect(() => { load(); }, [load]);

  if (!order) {
    return (
      <div style={{ padding: 20, color: C.secondary }}>Laddar…</div>
    );
  }

  const stateColor = STATE_COLORS[order.status] ?? C.tertiary;
  const tabs = [
    { id: "info",     label: "Info" },
    { id: "qc",       label: "QC" },
    { id: "delivery", label: "Leverans" },
    { id: "audit",    label: "Historik" },
  ] as const;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: C.inset,
            border: "none",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 13,
            cursor: "pointer",
            color: C.blue,
          }}
        >
          ← Tillbaka
        </button>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>
            {order.order_number}
          </div>
          <div style={{ fontSize: 13, color: C.secondary }}>
            {order.vehicle_reg || order.vehicle_vin}
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            background: stateColor,
            color: "#fff",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {STATE_LABELS[order.status]}
        </div>
      </div>

      {/* Progress */}
      <div
        style={{
          background: C.surface,
          borderRadius: 12,
          padding: 16,
          boxShadow: shadow,
          marginBottom: 16,
        }}
      >
        <WorkOrderProgressBar currentState={order.status} />
      </div>

      {/* Next steps */}
      {transitions.length > 0 && (
        <div
          style={{
            background: C.surface,
            borderRadius: 12,
            padding: 16,
            boxShadow: shadow,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: C.secondary,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            Nästa steg
          </div>

          {transitions.map((t) => (
            <div key={t.to_state} style={{ marginBottom: 12 }}>
              <StateButton
                order={order}
                transition={t}
                onSuccess={load}
                userRole={userRole}
              />
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 2,
          background: C.inset,
          borderRadius: 10,
          padding: 3,
          marginBottom: 16,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: "7px 8px",
              border: "none",
              borderRadius: 8,
              background: activeTab === tab.id ? C.surface : "transparent",
              color: activeTab === tab.id ? C.text : C.secondary,
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontSize: 13,
              cursor: "pointer",
              boxShadow: activeTab === tab.id ? shadow : "none",
              transition: "all 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div
        style={{
          background: C.surface,
          borderRadius: 12,
          padding: 16,
          boxShadow: shadow,
        }}
      >
        {activeTab === "info" && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              {[
                ["Status", STATE_LABELS[order.status]],
                ["Order", order.order_number],
                ["Reg.nr", order.vehicle_reg || "—"],
                ["VIN", order.vehicle_vin || "—"],
                ["Tekniker", order.technician_id || "Ej tilldelad"],
                ["Skapad", new Date(order.created_at).toLocaleDateString("sv-SE")],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: C.secondary, marginBottom: 2 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>
                    {val}
                  </div>
                </div>
              ))}
            </div>

            {order.description && (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: C.secondary,
                    marginBottom: 4,
                  }}
                >
                  Beskrivning
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: C.text,
                    lineHeight: 1.5,
                    background: C.fill,
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  {order.description}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "qc" && (
          <ChecklistView
            workOrderId={workOrderId}
            type="QC"
            userRole={userRole}
          />
        )}

        {activeTab === "delivery" && (
          <ChecklistView
            workOrderId={workOrderId}
            type="DELIVERY"
            userRole={userRole}
          />
        )}

        {activeTab === "audit" && (
          <AuditTimeline workOrderId={workOrderId} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main: WorkshopStateModule
// ---------------------------------------------------------------------------

interface WorkshopStateModuleProps {
  userRole?: WorkshopRole;
}

export default function WorkshopStateModule({
  userRole = "OPERATIONS_LEAD",
}: WorkshopStateModuleProps) {

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [transitionsMap, setTransitionsMap] = useState<
    Record<string, AvailableTransition[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"pipeline" | "detail">("pipeline");

  // Inject styles once
  useEffect(() => {
    const id = "ws-styles";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = STYLES;
      document.head.appendChild(style);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const orders: WorkOrder[] = await api.get("/api/workshop/work-orders");
      setWorkOrders(orders);

      // Load transitions for each order
      const transMap: Record<string, AvailableTransition[]> = {};
      await Promise.allSettled(
        orders.map(async (order) => {
          try {
            const data = await api.get(
              `/api/workshop/work-orders/${order.id}/available-transitions?role=${userRole}`
            );
            transMap[order.id] = data.transitions ?? [];
          } catch {
            transMap[order.id] = [];
          }
        })
      );
      setTransitionsMap(transMap);
    } catch (err) {
      console.error("Failed to load workshop orders", err);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleSelectOrder = (id: string) => {
    setSelectedOrderId(id);
    setActiveView("detail");
  };

  const handleBack = () => {
    setActiveView("pipeline");
    setSelectedOrderId(null);
    loadOrders();
  };

  // ── Detail view ────────────────────────────────────────────────────────────
  if (activeView === "detail" && selectedOrderId) {
    return (
      <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
        <WorkOrderDetail
          workOrderId={selectedOrderId}
          userRole={userRole}
          onBack={handleBack}
        />
      </div>
    );
  }

  // ── Pipeline view (Kanban) ─────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: 16 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: C.text,
              margin: 0,
            }}
          >
            Arbetsorder Pipeline
          </h1>
          <div style={{ fontSize: 13, color: C.secondary, marginTop: 2 }}>
            {ROLE_LABELS[userRole]} — {workOrders.length} ordrar
          </div>
        </div>

        <button
          onClick={loadOrders}
          style={{
            background: C.blue,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {loading ? "…" : "↻ Uppdatera"}
        </button>
      </div>

      {loading ? (
        <div
          style={{
            textAlign: "center",
            color: C.secondary,
            padding: 40,
            fontSize: 14,
          }}
        >
          Laddar arbetsordrar…
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${PIPELINE_STATES.length}, minmax(220px, 1fr))`,
            gap: 12,
            overflowX: "auto",
          }}
        >
          {PIPELINE_STATES.map((state) => {
            const stateOrders = workOrders.filter(
              (o) => o.status === state || 
              (state === "IN_PROGRESS" && o.status === "ADDITIONAL_WORK")
            );
            const stateColor = STATE_COLORS[state];

            return (
              <div
                key={state}
                style={{
                  background: C.surface,
                  borderRadius: 14,
                  padding: 14,
                  boxShadow: shadow,
                  minWidth: 220,
                }}
              >
                {/* Column header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                    paddingBottom: 10,
                    borderBottom: `2px solid ${stateColor}`,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: stateColor,
                    }}
                  >
                    {STATE_LABELS[state]}
                  </span>
                  <span
                    style={{
                      background: stateColor,
                      color: "#fff",
                      borderRadius: 20,
                      padding: "2px 8px",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {stateOrders.length}
                  </span>
                </div>

                {/* Cards */}
                {stateOrders.length === 0 ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: C.tertiary,
                      textAlign: "center",
                      padding: "20px 0",
                    }}
                  >
                    Inga ordrar
                  </div>
                ) : (
                  stateOrders.map((order) => (
                    <WorkOrderCard
                      key={order.id}
                      order={order}
                      transitions={transitionsMap[order.id] ?? []}
                      userRole={userRole}
                      onSelect={() => handleSelectOrder(order.id)}
                      onRefresh={loadOrders}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Role switcher (dev helper) */}
      <div
        style={{
          marginTop: 24,
          padding: 16,
          background: C.surface,
          borderRadius: 12,
          boxShadow: shadow,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.secondary,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 8,
          }}
        >
          Aktiv roll (dev)
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(Object.keys(ROLE_LABELS) as WorkshopRole[]).map((role) => (
            <span
              key={role}
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: role === userRole ? 700 : 400,
                background: role === userRole ? C.blue : C.inset,
                color: role === userRole ? "#fff" : C.secondary,
              }}
            >
              {ROLE_LABELS[role]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
