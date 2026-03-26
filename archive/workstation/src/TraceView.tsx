import { useState } from "react";
import type { PIX } from "./PixFeed";
import { PIX_COLORS, DEMO_PIX } from "./PixFeed";

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
  // Terminal palette
  term:      "#1C1C1E",
  termText:  "#E5E5EA",
  termDim:   "#636366",
  termGreen: "#30D158",
  termBlue:  "#0A84FF",
  termOrange:"#FF9F0A",
  termRed:   "#FF453A",
  termPurple:"#BF5AF2",
};

// ─── Causality engine (demo data) ────────────────────────────────────────────
interface CausalChain {
  cause: string;
  by: string;
  at: string;
  change: {
    description: string;
    state_before?: string;
    state_after?: string;
    value?: string;
  };
  triggered: string[];
  reversible: boolean;
  undoAvailableUntil?: string;
  related_pix: string[];
}

function buildCausalChain(pix: PIX): CausalChain {
  const fmtTime = (d: Date) =>
    d.toLocaleString("sv-SE", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).replace("T", " ");

  const undoUntil = pix.is_reversible
    ? fmtTime(new Date(pix.timestamp.getTime() + 48 * 3600000))
    : undefined;

  // Build cause string from type
  const causeMap: Record<PIX["type"], string> = {
    DEAL_STATE:    `Task "${pix.description.split("→")[0].trim()} follow-up" completed`,
    TASK_COMPLETE: `Task marked complete by ${pix.user ?? "user"}`,
    PAYMENT:       `Payment gateway confirmed — stripe webhook received`,
    NC_OPEN:       `Non-conformance detected during process review`,
    PROCESS_STEP:  `Process step threshold reached — auto-advance triggered`,
    APPROVAL:      `Improvement proposal reviewed and approved`,
    INVENTORY:     `Stock count below reorder threshold (automatic scan)`,
    SIGNAL:        `Metric calculation run — threshold breach detected`,
    DECISION:      `Decision recorded during leadership review`,
    HIRE:          `Onboarding checklist completed — all steps verified`,
    CHECKIN:       `Scheduled team sync completed`,
  };

  // Build triggered list from type
  const triggeredMap: Record<PIX["type"], string[]> = {
    DEAL_STATE: [
      "Invoice draft created (Finance)",
      "Commission task created (Execution)",
      "CRM contact status updated",
      `KPI "Win rate" recalculated`,
    ],
    TASK_COMPLETE: [
      "Task removed from active queue",
      "Team KPI updated",
      "Assignee workload recalculated",
    ],
    PAYMENT: [
      "Revenue ledger updated (Finance)",
      "Invoice marked PAID",
      "Cash flow projection updated",
      "Runway recalculated",
    ],
    NC_OPEN: [
      "NC assigned to process owner",
      "NC counter incremented on process record",
      `Notification sent to ${pix.user ?? "owner"}`,
    ],
    PROCESS_STEP: [
      "Next step unlocked",
      "Process audit log updated",
      "Owner notified of progress",
    ],
    APPROVAL: [
      "Improvement moved to DO phase",
      "Owner assigned implementation task",
      "PDCA board updated",
    ],
    INVENTORY: [
      "Reorder task created (Purchasing)",
      "Stock alert notification sent",
      "Inventory forecast updated",
    ],
    SIGNAL: [
      "Alert logged in operation feed",
      "Dashboard KPI highlighted",
    ],
    DECISION: [
      "Decision logged to audit trail",
      "Affected systems notified",
      "Decision index updated",
    ],
    HIRE: [
      "Team capacity updated",
      "Equipment allocation created",
      "Access provisioned",
      "Onboarding calendar events created",
    ],
    CHECKIN: [
      "Attendance recorded",
      "Meeting notes stored",
      "Next check-in scheduled",
    ],
  };

  const valueStr = pix.value != null
    ? `${pix.currency === "EUR" ? "€" : ""}${pix.value.toLocaleString("sv-SE")} ${pix.currency ?? ""}`
    : undefined;

  // Find related PIX (same module, nearby timestamp)
  const related = DEMO_PIX
    .filter(p => p.id !== pix.id && p.module === pix.module)
    .slice(0, 3)
    .map(p => p.trace_id);

  return {
    cause: causeMap[pix.type] ?? `${pix.type} event triggered`,
    by: pix.user ?? "System",
    at: fmtTime(pix.timestamp),
    change: {
      description: pix.description,
      state_before: pix.state_before,
      state_after: pix.state_after,
      value: valueStr,
    },
    triggered: triggeredMap[pix.type] ?? ["Event recorded in audit trail"],
    reversible: pix.is_reversible,
    undoAvailableUntil: undoUntil,
    related_pix: related,
  };
}

// ─── Terminal line component ──────────────────────────────────────────────────
function TermLine({
  label,
  value,
  labelColor = C.termDim,
  valueColor = C.termText,
  indent = 0,
}: {
  label?: string;
  value: string;
  labelColor?: string;
  valueColor?: string;
  indent?: number;
}) {
  return (
    <div style={{
      display: "flex",
      gap: 16,
      paddingLeft: indent * 16,
      lineHeight: 1.7,
    }}>
      {label && (
        <span style={{
          color: labelColor,
          fontFamily: "monospace",
          fontSize: 12,
          minWidth: 80,
          flexShrink: 0,
          userSelect: "none",
        }}>
          {label}
        </span>
      )}
      <span style={{
        color: valueColor,
        fontFamily: "monospace",
        fontSize: 12,
        flex: 1,
        wordBreak: "break-word",
      }}>
        {value}
      </span>
    </div>
  );
}

function Divider({ color = C.termDim }: { color?: string }) {
  return (
    <div style={{
      fontFamily: "monospace",
      fontSize: 12,
      color: color,
      padding: "2px 0",
      userSelect: "none",
    }}>
      {"─".repeat(48)}
    </div>
  );
}

// ─── TraceView component ──────────────────────────────────────────────────────
interface TraceViewProps {
  pix: PIX | null;
  onClose?: () => void;
  onUndo?: (pix: PIX) => void;
}

export default function TraceView({ pix, onClose, onUndo }: TraceViewProps) {
  const [undoConfirm, setUndoConfirm] = useState(false);

  if (!pix) {
    return (
      <div style={{
        background: C.term,
        borderRadius: 10,
        border: `0.5px solid #3A3A3C`,
        padding: "32px 24px",
        textAlign: "center",
        fontFamily: "monospace",
        color: C.termDim,
        fontSize: 12,
      }}>
        Select a PIX to view its causal chain
      </div>
    );
  }

  const chain = buildCausalChain(pix);
  const color = PIX_COLORS[pix.module];

  return (
    <div style={{
      background: C.term,
      borderRadius: 10,
      border: `0.5px solid #3A3A3C`,
      overflow: "hidden",
      boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
    }}>
      {/* Window chrome */}
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 16px",
        borderBottom: "0.5px solid #2C2C2E",
        gap: 8,
        background: "#111113",
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF453A" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF9F0A" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#30D158" }} />
        </div>
        <span style={{
          fontFamily: "monospace", fontSize: 12,
          color: C.termDim, flex: 1, textAlign: "center",
        }}>
          pixdrift — trace
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none", border: "none",
              color: C.termDim, cursor: "pointer",
              fontSize: 14, lineHeight: 1,
              fontFamily: "monospace",
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Trace content */}
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4 }}>

        {/* Trace ID + module */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <span style={{
            fontFamily: "monospace", fontSize: 14,
            fontWeight: 700, color: color,
            letterSpacing: "0.02em",
          }}>
            {pix.trace_id}
          </span>
          <span style={{
            fontFamily: "monospace", fontSize: 10,
            color: color, background: color + "20",
            padding: "2px 8px", borderRadius: 4,
            fontWeight: 600, letterSpacing: "0.06em",
          }}>
            {pix.module.toUpperCase()}
          </span>
          <span style={{
            fontFamily: "monospace", fontSize: 10,
            color: C.termDim,
          }}>
            {pix.type}
          </span>
        </div>

        <Divider />

        {/* CAUSE */}
        <div style={{ marginTop: 8 }}>
          <TermLine label="CAUSE" value={chain.cause} labelColor={C.termBlue} valueColor={C.termText} />
          <TermLine label="  by" value={chain.by} labelColor={C.termDim} valueColor={C.termText} />
          <TermLine label="  at" value={chain.at} labelColor={C.termDim} valueColor={C.termDim} />
        </div>

        <div style={{ marginTop: 4 }} />
        <Divider color="#2C2C2E" />

        {/* CHANGE */}
        <div style={{ marginTop: 4 }}>
          <TermLine label="CHANGE" value={chain.change.description} labelColor={C.termOrange} valueColor={C.termText} />
          {chain.change.state_before != null && chain.change.state_after != null && (
            <TermLine
              label="  state"
              value={`${chain.change.state_before}  →  ${chain.change.state_after}`}
              labelColor={C.termDim}
              valueColor={color}
            />
          )}
          {chain.change.value && (
            <TermLine
              label="  value"
              value={chain.change.value}
              labelColor={C.termDim}
              valueColor={C.termGreen}
            />
          )}
        </div>

        <div style={{ marginTop: 4 }} />
        <Divider color="#2C2C2E" />

        {/* TRIGGERED */}
        <div style={{ marginTop: 4 }}>
          <TermLine label="TRIGGERED" value="" labelColor={C.termPurple} valueColor={C.termText} />
          {chain.triggered.map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                paddingLeft: 16,
                lineHeight: 1.7,
              }}
            >
              <span style={{ color: C.termPurple, fontFamily: "monospace", fontSize: 12, flexShrink: 0 }}>▸</span>
              <span style={{ color: C.termText, fontFamily: "monospace", fontSize: 12 }}>{t}</span>
            </div>
          ))}
        </div>

        {/* RELATED */}
        {chain.related_pix.length > 0 && (
          <>
            <div style={{ marginTop: 4 }} />
            <Divider color="#2C2C2E" />
            <div style={{ marginTop: 4 }}>
              <TermLine label="RELATED" value={chain.related_pix.join("  ·  ")} labelColor={C.termDim} valueColor={C.termDim} />
            </div>
          </>
        )}

        <div style={{ marginTop: 4 }} />
        <Divider />

        {/* REVERSIBLE */}
        <div style={{ marginTop: 4 }}>
          {pix.is_reversible ? (
            <>
              <TermLine
                label="REVERSIBLE"
                value={`Yes — undo available until ${chain.undoAvailableUntil}`}
                labelColor={C.termGreen}
                valueColor={C.termGreen}
              />
              {!undoConfirm ? (
                <div style={{ marginTop: 10, paddingLeft: 0 }}>
                  <button
                    type="button"
                    onClick={() => setUndoConfirm(true)}
                    style={{
                      background: "transparent",
                      border: `0.5px solid ${C.termRed}60`,
                      borderRadius: 6,
                      color: C.termRed,
                      padding: "5px 14px",
                      fontFamily: "monospace",
                      fontSize: 11,
                      cursor: "pointer",
                      transition: "all 0.1s",
                    }}
                  >
                    Undo this PIX
                  </button>
                </div>
              ) : (
                <div style={{
                  marginTop: 10, display: "flex", alignItems: "center",
                  gap: 10, padding: "8px 12px",
                  background: C.termRed + "15",
                  border: `0.5px solid ${C.termRed}40`,
                  borderRadius: 8,
                }}>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: C.termRed }}>
                    Confirm undo? This will revert: {pix.description}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onUndo?.(pix);
                      setUndoConfirm(false);
                    }}
                    style={{
                      background: C.termRed,
                      border: "none", borderRadius: 5,
                      color: "#fff", padding: "4px 10px",
                      fontFamily: "monospace", fontSize: 11,
                      cursor: "pointer", flexShrink: 0,
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setUndoConfirm(false)}
                    style={{
                      background: "none", border: "none",
                      color: C.termDim, cursor: "pointer",
                      fontFamily: "monospace", fontSize: 11,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          ) : (
            <TermLine
              label="REVERSIBLE"
              value="No — this change is permanent"
              labelColor={C.termDim}
              valueColor={C.termDim}
            />
          )}
        </div>

        <div style={{ marginTop: 8 }} />
        <Divider />

        {/* Metadata footer */}
        <div style={{ marginTop: 4, display: "flex", gap: 24 }}>
          <TermLine label="pix.id" value={pix.id} labelColor={C.termDim} valueColor={C.termDim} />
          <TermLine label="module" value={pix.module} labelColor={C.termDim} valueColor={color} />
        </div>
      </div>
    </div>
  );
}
