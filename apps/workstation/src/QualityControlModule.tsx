// ---------------------------------------------------------------------------
// Quality Control Module — Pixdrift Q-Check
// Continuous quality intelligence: rotating peer reviews, trend detection,
// RCA-driven action plans, external body integration (DEKRA/TÜV/SGS/Swedac/BV/DNV)
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "./useApi";

// ─── Design tokens (match Dashboard) ─────────────────────────────────────────
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

// ─── External body config ─────────────────────────────────────────────────────
const EXTERNAL_BODIES: Record<string, { label: string; color: string; logo: string }> = {
  DEKRA:         { label: "DEKRA",          color: "#009A44", logo: "🛡" },
  TUV:           { label: "TÜV",            color: "#003DA5", logo: "🔵" },
  SGS:           { label: "SGS",            color: "#E30613", logo: "🔴" },
  SWEDAC:        { label: "Swedac",         color: "#006AA7", logo: "🇸🇪" },
  BUREAU_VERITAS:{ label: "Bureau Veritas", color: "#003087", logo: "⚓" },
  DNV:           { label: "DNV",            color: "#003087", logo: "🌐" },
  INTERNAL:      { label: "Intern",         color: C.secondary, logo: "🏢" },
};

const FREQ_LABELS: Record<string, string> = {
  DAILY: "Dagligen", WEEKLY: "Veckovis", BIWEEKLY: "Varannan vecka",
  MONTHLY: "Månadsvis", QUARTERLY: "Kvartalsvis", ON_TRIGGER: "Vid behov",
};
const ROT_LABELS: Record<string, string> = {
  RANDOM: "Slumpmässig", ROUND_ROBIN: "Roterande", CROSS_TEAM: "Korsgrupp", FIXED_INSPECTOR: "Fast inspektör",
};
const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: C.orange, IN_PROGRESS: C.blue, COMPLETED: C.green, OVERDUE: C.red, CANCELLED: C.secondary,
};
const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "Tilldelad", IN_PROGRESS: "Pågående", COMPLETED: "Klar", OVERDUE: "Försenad", CANCELLED: "Avbruten",
};
const PLAN_STATUS_COLORS: Record<string, string> = {
  OPEN: C.orange, IN_PROGRESS: C.blue, COMPLETED: C.green, VERIFIED: C.purple, CLOSED: C.secondary,
};
const PLAN_STATUS_LABELS: Record<string, string> = {
  OPEN: "Öppen", IN_PROGRESS: "Pågår", COMPLETED: "Klar", VERIFIED: "Verifierad", CLOSED: "Stängd",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface QProgram {
  id: string; name: string; description: string; program_type: string;
  frequency: string; rotation_mode: string; target_count_per_cycle: number;
  checklist: CheckItem[]; fail_threshold_pct: number; is_active: boolean;
  external_body?: string; external_contact_email?: string;
  external_reference?: string; auto_submit_to_external?: boolean;
}
interface CheckItem {
  id: string; question: string; category: string; weight: number; critical: boolean;
}
interface QCheck {
  id: string; program_id: string; inspector_name: string; subject_name?: string;
  vehicle_reg?: string; status: string; score_pct?: number; check_date: string;
  due_date?: string; findings?: string; critical_fails: number;
  quality_programs?: { name: string; external_body?: string; auto_submit_to_external?: boolean };
  external_submissions?: ExternalSubmission[];
  responses: CheckResponse[];
}
interface CheckResponse {
  item_id: string; answer: "PASS" | "FAIL" | "NA"; note?: string; critical_fail?: boolean; category?: string;
}
interface ExternalSubmission {
  id: string; external_body: string; submission_method: string;
  submitted_at: string; status: string; external_ref?: string;
}
interface ActionPlan {
  id: string; title: string; description?: string; root_cause?: string;
  trigger_type: string; owner_name: string; status: string;
  affected_mechanic_name?: string; actions: PlanAction[];
  created_at: string; effectiveness_rating?: number;
}
interface PlanAction {
  id: string; description: string; owner_name: string;
  due_date: string; status: string; completed_at?: string;
}
interface QTrend {
  id: string; trend_type: string; affected_entity: string;
  fail_rate_pct: number; sample_count: number; trend_direction: string;
  detected_at: string;
}
interface Stats {
  overall_score_pct: number; checks_this_month: number; fail_rate: number;
  fail_count: number; open_action_plans: number; active_trends: number;
  mechanic_scores: { id: string; name: string; avg_score: number; check_count: number; trend: string }[];
  top_issues: { category: string; count: number }[];
}

// ─── Mini-components ──────────────────────────────────────────────────────────
const Badge = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span style={{
    background: color + "18", color,
    fontSize: 11, fontWeight: 600, padding: "2px 8px",
    borderRadius: 6, whiteSpace: "nowrap", letterSpacing: "0.02em",
  }}>{children}</span>
);

const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: C.surface, borderRadius: 12, padding: "16px 20px",
    border: `0.5px solid ${C.border}`, boxShadow: shadow, ...style,
  }}>{children}</div>
);

const Row = ({ children, onClick, style }: {
  children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties;
}) => (
  <div onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
    borderBottom: `0.5px solid ${C.fill}`, cursor: onClick ? "pointer" : "default", ...style,
  }}>{children}</div>
);

const Btn = ({
  children, onClick, primary, danger, small, disabled,
}: {
  children: React.ReactNode; onClick?: () => void; primary?: boolean;
  danger?: boolean; small?: boolean; disabled?: boolean;
}) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: primary ? C.blue : danger ? C.red : C.inset,
    color: primary || danger ? "#fff" : C.text,
    border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    fontSize: small ? 12 : 13, fontWeight: 600,
    padding: small ? "5px 12px" : "8px 16px", opacity: disabled ? 0.5 : 1,
  }}>{children}</button>
);

const ExternalBodyBadge = ({ body, submitted }: { body?: string; submitted?: boolean }) => {
  if (!body || body === "INTERNAL") return null;
  const cfg = EXTERNAL_BODIES[body];
  if (!cfg) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: cfg.color + "15", color: cfg.color,
      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
    }}>
      {cfg.logo} {submitted ? `Skickat till ${cfg.label}` : cfg.label}
      {submitted && " ✓"}
    </span>
  );
};

const ScoreBar = ({ score, size = "md" }: { score: number; size?: "sm" | "md" }) => {
  const color = score >= 80 ? C.green : score >= 60 ? C.orange : C.red;
  const h = size === "sm" ? 4 : 6;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      <div style={{
        flex: 1, height: h, background: C.inset, borderRadius: h,
        overflow: "hidden", maxWidth: size === "sm" ? 80 : 140,
      }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: h, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: size === "sm" ? 11 : 12, fontWeight: 700, color, minWidth: 32 }}>{score}%</span>
    </div>
  );
};

// ─── Inspector Checklist View ─────────────────────────────────────────────────
function InspectorCheckView({
  check, program, onComplete, onClose,
}: {
  check: QCheck; program: QProgram; onComplete: () => void; onClose: () => void;
}) {
  
  const items: CheckItem[] = program.checklist || [];
  const [responses, setResponses] = useState<Record<string, "PASS" | "FAIL" | "NA">>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [findings, setFindings] = useState("");
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showExternalConfirm, setShowExternalConfirm] = useState(false);
  const [extSubmitting, setExtSubmitting] = useState(false);

  const current = items[step];
  const answered = Object.keys(responses).length;
  const allAnswered = answered === items.length;

  const answer = (ans: "PASS" | "FAIL" | "NA") => {
    setResponses(prev => ({ ...prev, [current.id]: ans }));
    if (step < items.length - 1) setTimeout(() => setStep(s => s + 1), 200);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = items.map(item => ({
      item_id: item.id,
      answer: responses[item.id] || "NA",
      note: notes[item.id] || "",
      category: item.category,
      critical_fail: item.critical && responses[item.id] === "FAIL",
    }));

    try {
      await apiClient.post(`/api/quality/checks/${check.id}/submit`, { responses: payload, findings });
      setSubmitted(true);
      if (program.external_body && program.external_body !== "INTERNAL" && !program.auto_submit_to_external) {
        setShowExternalConfirm(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleExternalSubmit = async () => {
    setExtSubmitting(true);
    try {
      await apiClient.post(`/api/quality/checks/${check.id}/submit-external`, {
        external_body: program.external_body,
        submission_method: "EMAIL",
      });
    } finally {
      setExtSubmitting(false);
      onComplete();
    }
  };

  if (showExternalConfirm && submitted) {
    const body = EXTERNAL_BODIES[program.external_body!];
    return (
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}>
        <div style={{
          background: C.surface, borderRadius: 20, padding: 32, maxWidth: 420, width: "90%",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{body?.logo || "📤"}</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Skicka till {body?.label}?
          </div>
          <div style={{ fontSize: 14, color: C.secondary, marginBottom: 24, lineHeight: 1.5 }}>
            Kontrollresultatet skickas som e-post till {program.external_contact_email || body?.label}.
            {program.external_reference && ` Referens: ${program.external_reference}`}
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Btn onClick={() => onComplete()}>Hoppa över</Btn>
            <Btn primary onClick={handleExternalSubmit} disabled={extSubmitting}>
              {extSubmitting ? "Skickar…" : `📤 Skicka till ${body?.label}`}
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    const passed = Object.values(responses).filter(r => r === "PASS").length;
    const failed = Object.values(responses).filter(r => r === "FAIL").length;
    const score = Math.round((passed / Math.max(passed + failed, 1)) * 100);
    const color = score >= 80 ? C.green : score >= 60 ? C.orange : C.red;
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{score >= 70 ? "✅" : "⚠️"}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color, marginBottom: 4 }}>{score}%</div>
          <div style={{ fontSize: 13, color: C.secondary, marginBottom: 20 }}>
            {passed} godkänd · {failed} underkänd
          </div>
          {program.auto_submit_to_external && program.external_body && program.external_body !== "INTERNAL" && (
            <div style={{ marginBottom: 16 }}>
              <ExternalBodyBadge body={program.external_body} submitted />
            </div>
          )}
          <Btn primary onClick={onComplete}>Klar</Btn>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.secondary }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{program.name}</div>
          <div style={{ fontSize: 12, color: C.secondary }}>
            Granskar: {check.subject_name || "Process"} {check.vehicle_reg ? `· ${check.vehicle_reg}` : ""}
          </div>
        </div>
        {program.external_body && program.external_body !== "INTERNAL" && (
          <ExternalBodyBadge body={program.external_body} />
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.secondary, marginBottom: 6 }}>
          <span>Fråga {Math.min(step + 1, items.length)} av {items.length}</span>
          <span>{answered} besvarade</span>
        </div>
        <div style={{ height: 4, background: C.inset, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${(answered / items.length) * 100}%`, height: "100%", background: C.blue, transition: "width 0.3s" }} />
        </div>
      </div>

      {/* Step navigation */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {items.map((item, i) => (
          <button key={item.id} onClick={() => setStep(i)} style={{
            width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer",
            fontSize: 11, fontWeight: 700,
            background: responses[item.id] === "PASS" ? C.green + "25"
              : responses[item.id] === "FAIL" ? C.red + "25"
              : responses[item.id] === "NA" ? C.inset
              : i === step ? C.blue + "25" : C.inset,
            color: responses[item.id] === "PASS" ? C.green
              : responses[item.id] === "FAIL" ? C.red
              : i === step ? C.blue : C.secondary,
            outline: i === step ? `2px solid ${C.blue}` : "none",
          }}>{i + 1}</button>
        ))}
      </div>

      {/* Current question */}
      {current && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: C.secondary, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                {current.category}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.text, lineHeight: 1.4 }}>{current.question}</div>
            </div>
            {current.critical && (
              <Badge color={C.orange}>⚠️ Kritisk</Badge>
            )}
          </div>

          {/* Answer buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {(["PASS", "FAIL", "NA"] as const).map(ans => (
              <button key={ans} onClick={() => answer(ans)} style={{
                padding: "14px 8px", borderRadius: 10, border: `2px solid`,
                borderColor: responses[current.id] === ans
                  ? ans === "PASS" ? C.green : ans === "FAIL" ? C.red : C.secondary
                  : C.border,
                background: responses[current.id] === ans
                  ? ans === "PASS" ? C.green + "15" : ans === "FAIL" ? C.red + "15" : C.inset
                  : C.surface,
                cursor: "pointer", fontWeight: 700, fontSize: 12,
                color: responses[current.id] === ans
                  ? ans === "PASS" ? C.green : ans === "FAIL" ? C.red : C.secondary
                  : C.secondary,
                transition: "all 0.15s",
              }}>
                {ans === "PASS" ? "✓ GODKÄND" : ans === "FAIL" ? "✗ UNDERKÄND" : "— EJ TILLÄMP."}
              </button>
            ))}
          </div>

          {/* Note on fail */}
          {responses[current.id] === "FAIL" && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.secondary, marginBottom: 6 }}>Notera avvikelse</div>
              <textarea
                value={notes[current.id] || ""}
                onChange={e => setNotes(prev => ({ ...prev, [current.id]: e.target.value }))}
                placeholder="Beskriv avvikelsen…"
                style={{
                  width: "100%", minHeight: 70, padding: "10px 12px",
                  border: `1px solid ${C.border}`, borderRadius: 8,
                  fontSize: 13, resize: "vertical", fontFamily: "inherit",
                }}
              />
            </div>
          )}
        </Card>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <Btn onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>← Föregående</Btn>
        {step < items.length - 1
          ? <Btn primary onClick={() => setStep(s => s + 1)}>Nästa →</Btn>
          : null
        }
      </div>

      {/* Summary & submit */}
      {allAnswered && (
        <Card style={{ background: C.fill }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Sammanfattning & slutsats</div>
          <textarea
            value={findings}
            onChange={e => setFindings(e.target.value)}
            placeholder="Övergripande iakttagelser (valfritt)…"
            style={{
              width: "100%", minHeight: 70, padding: "10px 12px",
              border: `1px solid ${C.border}`, borderRadius: 8,
              fontSize: 13, resize: "vertical", fontFamily: "inherit",
              marginBottom: 12,
            }}
          />
          <Btn primary onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Sparar…" : "✓ Slutför kontroll"}
          </Btn>
        </Card>
      )}
    </div>
  );
}

// ─── Main Module ──────────────────────────────────────────────────────────────
export default function QualityControlModule() {
  
  const [tab, setTab] = useState<"overview" | "checks" | "plans" | "programs">("overview");
  const [programs, setPrograms] = useState<QProgram[]>([]);
  const [checks, setChecks] = useState<QCheck[]>([]);
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [trends, setTrends] = useState<QTrend[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [inspecting, setInspecting] = useState<{ check: QCheck; program: QProgram } | null>(null);
  const [editingProgram, setEditingProgram] = useState<QProgram | null>(null);
  const [showNewProgram, setShowNewProgram] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [progs, chks, plns, tnds, sts] = await Promise.all([
        apiClient.get<QProgram[]>("/api/quality/programs").catch(() => null),
        apiClient.get<QCheck[]>("/api/quality/checks").catch(() => null),
        apiClient.get<ActionPlan[]>("/api/quality/action-plans").catch(() => null),
        apiClient.get<QTrend[]>("/api/quality/trends").catch(() => null),
        apiClient.get<Stats>("/api/quality/stats").catch(() => null),
      ]);
      setPrograms(progs || DEMO_PROGRAMS);
      setChecks(chks || DEMO_CHECKS);
      setPlans(plns || DEMO_PLANS);
      setTrends(tnds || DEMO_TRENDS);
      setStats(sts || DEMO_STATS);
    } catch {
      setPrograms(DEMO_PROGRAMS);
      setChecks(DEMO_CHECKS);
      setPlans(DEMO_PLANS);
      setTrends(DEMO_TRENDS);
      setStats(DEMO_STATS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (inspecting) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, padding: 20 }}>
        <InspectorCheckView
          check={inspecting.check}
          program={inspecting.program}
          onComplete={() => { setInspecting(null); load(); }}
          onClose={() => setInspecting(null)}
        />
      </div>
    );
  }

  const TABS = [
    { id: "overview" as const, label: "Översikt" },
    { id: "checks" as const, label: "Kontroller" },
    { id: "plans" as const, label: "Handlingsplaner" },
    { id: "programs" as const, label: "Program" },
  ];

  const assignedChecks = checks.filter(c => c.status === "ASSIGNED" || c.status === "IN_PROGRESS");
  const doneChecks = checks.filter(c => c.status === "COMPLETED" || c.status === "OVERDUE" || c.status === "CANCELLED");
  const openPlans = plans.filter(p => p.status === "OPEN" || p.status === "IN_PROGRESS");
  const donePlans = plans.filter(p => p.status === "COMPLETED" || p.status === "VERIFIED" || p.status === "CLOSED");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg }}>
      {/* Header */}
      <div style={{
        background: C.surface, borderBottom: `0.5px solid ${C.border}`,
        padding: "16px 24px", display: "flex", alignItems: "center", gap: 16,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Kvalitetskontroll</div>
          <div style={{ fontSize: 12, color: C.secondary }}>Q-Check · Kontinuerlig kvalitetsintelligens</div>
        </div>
        {stats && (
          <div style={{ display: "flex", gap: 20 }}>
            {[
              { label: "Score", value: `${stats.overall_score_pct}%`, color: stats.overall_score_pct >= 80 ? C.green : stats.overall_score_pct >= 60 ? C.orange : C.red },
              { label: "Denna månad", value: stats.checks_this_month, color: C.text },
              { label: "Handlingsplaner", value: stats.open_action_plans, color: stats.open_action_plans > 0 ? C.orange : C.green },
              { label: "Trender", value: stats.active_trends, color: stats.active_trends > 0 ? C.red : C.green },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: C.secondary, fontWeight: 600 }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `0.5px solid ${C.border}`, background: C.surface }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "12px 20px", border: "none", background: "none", cursor: "pointer",
            fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
            color: tab === t.id ? C.blue : C.secondary,
            borderBottom: tab === t.id ? `2px solid ${C.blue}` : "2px solid transparent",
            transition: "all 0.15s",
          }}>
            {t.label}
            {t.id === "checks" && assignedChecks.length > 0 && (
              <span style={{
                marginLeft: 6, background: C.orange, color: "#fff",
                fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10,
              }}>{assignedChecks.length}</span>
            )}
            {t.id === "plans" && openPlans.length > 0 && (
              <span style={{
                marginLeft: 6, background: C.red, color: "#fff",
                fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10,
              }}>{openPlans.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {loading ? (
          <div style={{ color: C.secondary, fontSize: 14, textAlign: "center", paddingTop: 60 }}>Laddar…</div>
        ) : (
          <>
            {/* ── TAB: OVERVIEW ── */}
            {tab === "overview" && (
              <div style={{ display: "grid", gap: 20, maxWidth: 900, margin: "0 auto" }}>
                {/* Trends alert */}
                {trends.length > 0 && (
                  <Card style={{ borderColor: C.red + "50", background: C.red + "06" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 12 }}>
                      ⚠️ AKTIVA TRENDER ({trends.length})
                    </div>
                    {trends.map(t => (
                      <div key={t.id} style={{
                        padding: "10px 14px", background: C.surface, borderRadius: 8, marginBottom: 8,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{t.affected_entity}</div>
                          <div style={{ fontSize: 12, color: C.secondary }}>
                            {t.fail_rate_pct}% underkänd · {t.sample_count} kontroller · {t.trend_type === "MECHANIC_DECLINE" ? "Mekaniker" : "Process"}
                          </div>
                        </div>
                        <Badge color={t.trend_direction === "CRITICAL" ? C.red : C.orange}>
                          {t.trend_direction === "CRITICAL" ? "Kritisk" : "Sjunkande"}
                        </Badge>
                      </div>
                    ))}
                  </Card>
                )}

                {/* Score grid */}
                {stats && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                    {[
                      { label: "Genomsnittsscore", value: `${stats.overall_score_pct}%`, sub: "denna månad", color: stats.overall_score_pct >= 80 ? C.green : C.orange },
                      { label: "Genomförda", value: stats.checks_this_month, sub: "kontroller", color: C.blue },
                      { label: "Underkänd-rate", value: `${stats.fail_rate}%`, sub: `${stats.fail_count} kontroller`, color: stats.fail_rate > 20 ? C.red : C.green },
                      { label: "Handlingsplaner", value: stats.open_action_plans, sub: "öppna", color: stats.open_action_plans > 0 ? C.orange : C.green },
                    ].map(s => (
                      <Card key={s.label}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.secondary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{s.label}</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: C.secondary, marginTop: 2 }}>{s.sub}</div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Mechanic scores */}
                {stats?.mechanic_scores && stats.mechanic_scores.length > 0 && (
                  <Card>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Mekaniker-scores</div>
                    {stats.mechanic_scores.map(m => (
                      <Row key={m.id}>
                        <div style={{ width: 140, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{m.name}</div>
                        <ScoreBar score={m.avg_score} />
                        <div style={{ fontSize: 11, color: C.secondary, whiteSpace: "nowrap" }}>
                          {m.trend === "IMPROVING" ? "↑" : m.trend === "DECLINING" ? "↓" : "→"}
                          &nbsp;{m.check_count} ktr
                        </div>
                        {m.trend === "DECLINING" && m.avg_score < 75 && (
                          <Badge color={C.orange}>⚠️ Trend</Badge>
                        )}
                      </Row>
                    ))}
                  </Card>
                )}

                {/* Top issues */}
                {stats?.top_issues && stats.top_issues.length > 0 && (
                  <Card>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Vanligaste avvikelser</div>
                    {stats.top_issues.map((issue, i) => (
                      <Row key={issue.category}>
                        <div style={{ width: 24, fontSize: 13, fontWeight: 700, color: C.secondary }}>{i + 1}.</div>
                        <div style={{ flex: 1, fontSize: 13 }}>{issue.category}</div>
                        <Badge color={C.orange}>{issue.count} ggr</Badge>
                      </Row>
                    ))}
                  </Card>
                )}
              </div>
            )}

            {/* ── TAB: CHECKS ── */}
            {tab === "checks" && (
              <div style={{ maxWidth: 800, margin: "0 auto" }}>
                {assignedChecks.length > 0 && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                      Tilldelade kontroller
                    </div>
                    {assignedChecks.map(check => {
                      const prog = programs.find(p => p.id === check.program_id);
                      const isOverdue = check.due_date && new Date(check.due_date) < new Date();
                      return (
                        <Card key={check.id} style={{ marginBottom: 10, borderColor: isOverdue ? C.red + "40" : C.border }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                <Badge color={STATUS_COLORS[check.status]}>{STATUS_LABELS[check.status]}</Badge>
                                {prog?.external_body && prog.external_body !== "INTERNAL" && (
                                  <ExternalBodyBadge body={prog.external_body} />
                                )}
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                                {check.quality_programs?.name || prog?.name || "Kontroll"}
                              </div>
                              <div style={{ fontSize: 12, color: C.secondary }}>
                                Inspektör: {check.inspector_name}
                                {check.subject_name && ` · Granskar: ${check.subject_name}`}
                                {check.vehicle_reg && ` · ${check.vehicle_reg}`}
                              </div>
                              {check.due_date && (
                                <div style={{ fontSize: 11, color: isOverdue ? C.red : C.secondary, marginTop: 4 }}>
                                  {isOverdue ? "⚠️ Försenad:" : "Deadline:"} {new Date(check.due_date).toLocaleDateString("sv-SE")}
                                </div>
                              )}
                            </div>
                            {prog && (
                              <Btn primary small onClick={() => setInspecting({ check, program: prog })}>
                                Starta kontroll →
                              </Btn>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                    <div style={{ height: 20 }} />
                  </>
                )}

                {doneChecks.length > 0 && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                      Avslutade kontroller
                    </div>
                    {doneChecks.map(check => {
                      const prog = programs.find(p => p.id === check.program_id);
                      const hasSubmission = (check.external_submissions || []).length > 0;
                      const submission = (check.external_submissions || [])[0];
                      const passed = check.score_pct !== undefined && check.score_pct >= 70;
                      return (
                        <Card key={check.id} style={{
                          marginBottom: 10,
                          borderLeft: `3px solid ${passed ? C.green : C.red}`,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: 14 }}>{passed ? "✅" : "❌"}</span>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>
                                  {check.quality_programs?.name || prog?.name || "Kontroll"}
                                </div>
                              </div>
                              <div style={{ fontSize: 12, color: C.secondary }}>
                                Inspektör: {check.inspector_name}
                                {check.subject_name && ` · Granskar: ${check.subject_name}`}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                                {check.score_pct !== undefined && (
                                  <ScoreBar score={check.score_pct} size="sm" />
                                )}
                                {check.critical_fails > 0 && (
                                  <Badge color={C.red}>{check.critical_fails} kritiska</Badge>
                                )}
                                <div style={{ fontSize: 11, color: C.secondary }}>
                                  {new Date(check.check_date).toLocaleDateString("sv-SE")}
                                </div>
                              </div>
                              {hasSubmission && submission && (
                                <div style={{ marginTop: 8 }}>
                                  <ExternalBodyBadge body={submission.external_body} submitted />
                                  {submission.external_ref && (
                                    <span style={{ fontSize: 11, color: C.secondary, marginLeft: 8 }}>
                                      ref: {submission.external_ref}
                                    </span>
                                  )}
                                </div>
                              )}
                              {!hasSubmission && prog?.external_body && prog.external_body !== "INTERNAL" && check.status === "COMPLETED" && (
                                <button
                                  onClick={async () => {
                                    await apiClient.post(`/api/quality/checks/${check.id}/submit-external`, {
                                      external_body: prog.external_body,
                                      submission_method: "EMAIL",
                                    });
                                    load();
                                  }}
                                  style={{
                                    marginTop: 8, background: "none", border: `1px solid ${C.border}`,
                                    borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer",
                                    color: C.blue, fontWeight: 600,
                                  }}
                                >
                                  📤 Skicka till {EXTERNAL_BODIES[prog.external_body]?.label}
                                </button>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </>
                )}

                {checks.length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: C.secondary }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                    <div style={{ fontSize: 14 }}>Inga kontroller ännu</div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: ACTION PLANS ── */}
            {tab === "plans" && (
              <div style={{ maxWidth: 800, margin: "0 auto" }}>
                {openPlans.length > 0 && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                      Öppna handlingsplaner ({openPlans.length})
                    </div>
                    {openPlans.map(plan => {
                      const doneActions = (plan.actions || []).filter(a => a.status === "COMPLETED").length;
                      const totalActions = (plan.actions || []).length;
                      return (
                        <Card key={plan.id} style={{ marginBottom: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <Badge color={PLAN_STATUS_COLORS[plan.status]}>{PLAN_STATUS_LABELS[plan.status]}</Badge>
                                <Badge color={C.orange}>{plan.trigger_type.replace("_", " ")}</Badge>
                              </div>
                              <div style={{ fontSize: 15, fontWeight: 700 }}>{plan.title}</div>
                              {plan.affected_mechanic_name && (
                                <div style={{ fontSize: 12, color: C.secondary }}>Berör: {plan.affected_mechanic_name}</div>
                              )}
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 12, color: C.secondary }}>Ansvarig</div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{plan.owner_name}</div>
                            </div>
                          </div>

                          {plan.root_cause && (
                            <div style={{
                              background: C.fill, borderRadius: 8, padding: "8px 12px",
                              fontSize: 12, color: C.secondary, marginBottom: 12,
                            }}>
                              <strong>Rotorsak:</strong> {plan.root_cause}
                            </div>
                          )}

                          <div style={{ marginBottom: 8 }}>
                            {(plan.actions || []).map(action => (
                              <div key={action.id} style={{
                                display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                                borderBottom: `0.5px solid ${C.fill}`,
                              }}>
                                <button
                                  onClick={async () => {
                                    if (action.status === "COMPLETED") return;
                                    await apiClient.post(`/api/quality/action-plans/${plan.id}/complete-action`, { action_id: action.id });
                                    load();
                                  }}
                                  style={{
                                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                                    border: `2px solid ${action.status === "COMPLETED" ? C.green : C.border}`,
                                    background: action.status === "COMPLETED" ? C.green : "transparent",
                                    cursor: action.status === "COMPLETED" ? "default" : "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                  }}
                                >
                                  {action.status === "COMPLETED" && <span style={{ color: "#fff", fontSize: 10 }}>✓</span>}
                                </button>
                                <div style={{ flex: 1, fontSize: 13, color: action.status === "COMPLETED" ? C.secondary : C.text }}>
                                  {action.description}
                                </div>
                                <div style={{ fontSize: 11, color: C.secondary, whiteSpace: "nowrap" }}>
                                  {action.owner_name} · {new Date(action.due_date).toLocaleDateString("sv-SE")}
                                </div>
                                <Badge color={action.status === "COMPLETED" ? C.green : C.orange}>
                                  {action.status === "COMPLETED" ? "Klar" : "Öppen"}
                                </Badge>
                              </div>
                            ))}
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontSize: 12, color: C.secondary }}>{doneActions}/{totalActions} klara</div>
                            {plan.status === "COMPLETED" && (
                              <Btn primary small onClick={async () => {
                                await apiClient.post(`/api/quality/action-plans/${plan.id}/verify`, {
                                  effectiveness_rating: 4,
                                });
                                load();
                              }}>
                                ✓ Verifiera effekt
                              </Btn>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </>
                )}

                {donePlans.length > 0 && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, marginTop: openPlans.length > 0 ? 24 : 0 }}>
                      Avslutade handlingsplaner ({donePlans.length})
                    </div>
                    {donePlans.map(plan => (
                      <Card key={plan.id} style={{ marginBottom: 8, opacity: 0.8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <Badge color={PLAN_STATUS_COLORS[plan.status]}>{PLAN_STATUS_LABELS[plan.status]}</Badge>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{plan.title}</div>
                            <div style={{ fontSize: 11, color: C.secondary }}>{new Date(plan.created_at).toLocaleDateString("sv-SE")}</div>
                          </div>
                          {plan.effectiveness_rating && (
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 11, color: C.secondary }}>Effektivitet</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>{plan.effectiveness_rating}/5</div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </>
                )}

                {plans.length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: C.secondary }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                    <div style={{ fontSize: 14 }}>Inga öppna handlingsplaner</div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: PROGRAMS ── */}
            {tab === "programs" && (
              <div style={{ maxWidth: 900, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Aktiva kontrollprogram ({programs.filter(p => p.is_active).length})</div>
                  <Btn primary onClick={() => setShowNewProgram(true)}>+ Nytt program</Btn>
                </div>

                {programs.map(prog => {
                  const criticalItems = (prog.checklist || []).filter(i => i.critical).length;
                  const body = prog.external_body ? EXTERNAL_BODIES[prog.external_body] : null;
                  return (
                    <Card key={prog.id} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <Badge color={prog.is_active ? C.green : C.secondary}>
                              {prog.is_active ? "✅ Aktiv" : "⏸ Inaktiv"}
                            </Badge>
                            <Badge color={C.purple}>{prog.program_type.replace("_", " ")}</Badge>
                            {body && <ExternalBodyBadge body={prog.external_body} />}
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{prog.name}</div>
                          <div style={{ fontSize: 12, color: C.secondary, marginBottom: 8 }}>{prog.description}</div>

                          <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.secondary, flexWrap: "wrap" }}>
                            <span>📅 {FREQ_LABELS[prog.frequency]} · {prog.target_count_per_cycle} ktr/period</span>
                            <span>🔄 {ROT_LABELS[prog.rotation_mode]}</span>
                            <span>📋 {(prog.checklist || []).length} punkter · {criticalItems} kritiska</span>
                          </div>

                          {/* External body details */}
                          {prog.external_body && prog.external_body !== "INTERNAL" && (
                            <div style={{
                              marginTop: 10, padding: "8px 12px", background: (body?.color || C.blue) + "0D",
                              borderRadius: 8, border: `1px solid ${(body?.color || C.blue)}25`,
                            }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: body?.color, marginBottom: 4 }}>
                                {body?.logo} Extern granskare: {body?.label}
                              </div>
                              <div style={{ display: "flex", gap: 16, fontSize: 11, color: C.secondary }}>
                                {prog.external_contact_email && (
                                  <span>✉ {prog.external_contact_email}</span>
                                )}
                                {prog.external_reference && (
                                  <span>🔖 Ref: {prog.external_reference}</span>
                                )}
                                <span>
                                  {prog.auto_submit_to_external
                                    ? `✅ Automatisk rapportering aktiverad`
                                    : `⬜ Manuell rapportering`}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: 8, marginLeft: 16 }}>
                          <Btn small onClick={() => setEditingProgram(prog)}>Redigera</Btn>
                          <Btn small danger={prog.is_active} onClick={async () => {
                            await apiClient.patch(`/api/quality/programs/${prog.id}`, { is_active: !prog.is_active });
                            load();
                          }}>
                            {prog.is_active ? "Inaktivera" : "Aktivera"}
                          </Btn>
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {programs.length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: C.secondary }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🛡</div>
                    <div style={{ fontSize: 14 }}>Inga kontrollprogram ännu. Skapa ett för att komma igång.</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Program editor modal */}
      {(editingProgram || showNewProgram) && (
        <ProgramEditorModal
          program={editingProgram}
          onSave={async (data) => {
            if (editingProgram) {
              await apiClient.patch(`/api/quality/programs/${editingProgram.id}`, data);
            } else {
              await apiClient.post("/api/quality/programs", data);
            }
            setEditingProgram(null);
            setShowNewProgram(false);
            load();
          }}
          onClose={() => { setEditingProgram(null); setShowNewProgram(false); }}
        />
      )}
    </div>
  );
}

// ─── Program Editor Modal ─────────────────────────────────────────────────────
function ProgramEditorModal({
  program, onSave, onClose,
}: {
  program: QProgram | null; onSave: (data: Partial<QProgram>) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: program?.name || "",
    description: program?.description || "",
    program_type: program?.program_type || "SPOT_CHECK",
    frequency: program?.frequency || "WEEKLY",
    rotation_mode: program?.rotation_mode || "RANDOM",
    target_count_per_cycle: program?.target_count_per_cycle || 1,
    fail_threshold_pct: program?.fail_threshold_pct || 20,
    external_body: program?.external_body || "INTERNAL",
    external_contact_email: program?.external_contact_email || "",
    external_reference: program?.external_reference || "",
    auto_submit_to_external: program?.auto_submit_to_external || false,
    is_active: program?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);

  const isExternal = form.external_body !== "INTERNAL";

  const inp = (field: keyof typeof form, label: string, type: "text" | "email" | "number" = "text") => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.secondary, marginBottom: 4 }}>{label}</div>
      <input
        type={type}
        value={form[field] as string | number}
        onChange={e => setForm(f => ({ ...f, [field]: type === "number" ? Number(e.target.value) : e.target.value }))}
        style={{
          width: "100%", padding: "8px 12px", border: `1px solid ${C.border}`,
          borderRadius: 8, fontSize: 13, fontFamily: "inherit",
        }}
      />
    </div>
  );

  const sel = (field: keyof typeof form, label: string, options: { value: string; label: string }[]) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.secondary, marginBottom: 4 }}>{label}</div>
      <select
        value={form[field] as string}
        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        style={{
          width: "100%", padding: "8px 12px", border: `1px solid ${C.border}`,
          borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: C.surface,
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: C.surface, borderRadius: 16, padding: 28,
        width: "min(580px, 92vw)", maxHeight: "85vh", overflow: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
          {program ? "Redigera program" : "Nytt kontrollprogram"}
        </div>

        {inp("name", "Namn")}
        {inp("description", "Beskrivning")}

        {sel("program_type", "Typ", [
          { value: "SPOT_CHECK", label: "Stickprov" },
          { value: "PEER_REVIEW", label: "Kollegagranskning" },
          { value: "PROCESS_AUDIT", label: "Processaudit" },
          { value: "TOOL_CHECK", label: "Verktygskontroll" },
          { value: "DOCUMENTATION_REVIEW", label: "Dokumentationsgranskning" },
          { value: "SAFETY_WALK", label: "Säkerhetsrond" },
          { value: "CUSTOMER_FOLLOWUP", label: "Kunduppföljning" },
        ])}

        {sel("frequency", "Frekvens", [
          { value: "DAILY", label: "Dagligen" },
          { value: "WEEKLY", label: "Veckovis" },
          { value: "BIWEEKLY", label: "Varannan vecka" },
          { value: "MONTHLY", label: "Månadsvis" },
          { value: "QUARTERLY", label: "Kvartalsvis" },
          { value: "ON_TRIGGER", label: "Vid behov" },
        ])}

        {sel("rotation_mode", "Rotationsläge", [
          { value: "RANDOM", label: "Slumpmässig" },
          { value: "ROUND_ROBIN", label: "Roterande" },
          { value: "CROSS_TEAM", label: "Korsgrupp" },
          { value: "FIXED_INSPECTOR", label: "Fast inspektör" },
        ])}

        {inp("target_count_per_cycle", "Antal kontroller per period", "number")}

        {/* External body section */}
        <div style={{
          marginTop: 8, marginBottom: 14, padding: "14px 16px",
          background: C.fill, borderRadius: 10, border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🌐 Extern granskare</div>

          {sel("external_body", "Granskande organ", [
            { value: "INTERNAL", label: "Intern (ingen extern rapportering)" },
            { value: "DEKRA", label: "DEKRA" },
            { value: "TUV", label: "TÜV" },
            { value: "SGS", label: "SGS" },
            { value: "SWEDAC", label: "Swedac" },
            { value: "BUREAU_VERITAS", label: "Bureau Veritas" },
            { value: "DNV", label: "DNV" },
          ])}

          {isExternal && (
            <>
              {inp("external_contact_email", `E-post till ${EXTERNAL_BODIES[form.external_body]?.label || "granskare"}`, "email")}
              {inp("external_reference", "Program-/kontrakts-ID (hos granskaren)")}

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="auto_submit"
                  checked={form.auto_submit_to_external}
                  onChange={e => setForm(f => ({ ...f, auto_submit_to_external: e.target.checked }))}
                  style={{ width: 16, height: 16 }}
                />
                <label htmlFor="auto_submit" style={{ fontSize: 13, cursor: "pointer" }}>
                  Skicka resultat automatiskt till {EXTERNAL_BODIES[form.external_body]?.label}
                </label>
              </div>

              <div style={{ marginTop: 8, fontSize: 11, color: C.secondary, lineHeight: 1.5 }}>
                {form.auto_submit_to_external
                  ? `Kontrollrapporter skickas automatiskt via e-post till ${form.external_contact_email || "angiven adress"} direkt vid slutförande.`
                  : "Inspektören tillfrågas efter varje kontroll om resultatet ska skickas till den externa granskaren."
                }
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <Btn onClick={onClose}>Avbryt</Btn>
          <Btn primary onClick={async () => {
            setSaving(true);
            await onSave(form);
            setSaving(false);
          }} disabled={saving || !form.name}>
            {saving ? "Sparar…" : "Spara program"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_PROGRAMS: QProgram[] = [
  {
    id: "prog-1", name: "Veckostickprov — Bromsar & Säkerhet",
    description: "Slumpmässig kontroll av bromsarbeten. Mekaniker granskar varandras arbete.",
    program_type: "PEER_REVIEW", frequency: "WEEKLY", rotation_mode: "RANDOM",
    target_count_per_cycle: 2, fail_threshold_pct: 20, is_active: true,
    external_body: "DEKRA", external_contact_email: "inspector@dekra.se",
    auto_submit_to_external: true,
    checklist: [
      { id: "b1", question: "Bromsbelägg korrekt monterade och luftade?", category: "Safety", weight: 3, critical: true },
      { id: "b2", question: "Bromsvätska på rätt nivå?", category: "Fluids", weight: 2, critical: false },
      { id: "b3", question: "Bromsskiva inom specifikation?", category: "Safety", weight: 3, critical: true },
      { id: "b4", question: "Dokumentation komplett i systemet?", category: "Documentation", weight: 1, critical: false },
      { id: "b5", question: "Kundquittens signerad?", category: "Process", weight: 1, critical: false },
    ],
  },
  {
    id: "prog-2", name: "Månadsaudit — Serviceprotokoll",
    description: "Kontroll av servicedokumentation och att alla steg följts korrekt.",
    program_type: "DOCUMENTATION_REVIEW", frequency: "MONTHLY", rotation_mode: "FIXED_INSPECTOR",
    target_count_per_cycle: 5, fail_threshold_pct: 20, is_active: true,
    external_body: "INTERNAL",
    checklist: [
      { id: "d1", question: "Intagsfoton tagna (alla 8 vinklar)?", category: "Intake", weight: 2, critical: false },
      { id: "d2", question: "Diagnosprotokoll sparat mot ärendet?", category: "Technical", weight: 2, critical: true },
      { id: "d3", question: "Arbetsorderns alla steg avbockade?", category: "Process", weight: 1, critical: false },
      { id: "d4", question: "Delförbrukning bokförd korrekt?", category: "Finance", weight: 2, critical: false },
      { id: "d5", question: "Exit capture genomförd?", category: "Customer", weight: 1, critical: false },
    ],
  },
  {
    id: "prog-3", name: "Kvartalskontroll — Verktyg & Utrustning",
    description: "Inventering och kontroll av lyftdon, mätinstrument och säkerhetsutrustning.",
    program_type: "TOOL_CHECK", frequency: "QUARTERLY", rotation_mode: "FIXED_INSPECTOR",
    target_count_per_cycle: 1, fail_threshold_pct: 20, is_active: true,
    external_body: "SWEDAC", external_contact_email: "kalibrering@swedac.se",
    external_reference: "SWEDAC-2026-441",
    auto_submit_to_external: true,
    checklist: [
      { id: "t1", question: "Lyftdon besiktigat och godkänt?", category: "Safety", weight: 3, critical: true },
      { id: "t2", question: "Momentnycklar kalibrerade?", category: "Technical", weight: 3, critical: true },
      { id: "t3", question: "Diagnosutrustning uppdaterad?", category: "Technical", weight: 2, critical: false },
      { id: "t4", question: "Brandsläckare kontrollerad?", category: "Safety", weight: 3, critical: true },
    ],
  },
];

const DEMO_CHECKS: QCheck[] = [
  {
    id: "chk-1", program_id: "prog-1",
    inspector_name: "Eric Karlsson", subject_name: "Robin Björk", vehicle_reg: "ABC 123",
    status: "ASSIGNED", check_date: new Date().toISOString().split("T")[0],
    due_date: new Date().toISOString().split("T")[0],
    responses: [], critical_fails: 0,
    quality_programs: { name: "Veckostickprov — Bromsar & Säkerhet", external_body: "DEKRA", auto_submit_to_external: true },
    external_submissions: [],
  },
  {
    id: "chk-2", program_id: "prog-1",
    inspector_name: "Jonas Lindström", subject_name: "Eric Karlsson", vehicle_reg: "XYZ 456",
    status: "ASSIGNED", check_date: new Date().toISOString().split("T")[0],
    due_date: new Date().toISOString().split("T")[0],
    responses: [], critical_fails: 0,
    quality_programs: { name: "Veckostickprov — Bromsar & Säkerhet", external_body: "DEKRA", auto_submit_to_external: true },
    external_submissions: [],
  },
  {
    id: "chk-3", program_id: "prog-2",
    inspector_name: "Maria Lindqvist", subject_name: undefined,
    status: "COMPLETED", score_pct: 92, check_date: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
    responses: [], critical_fails: 0,
    quality_programs: { name: "Månadsaudit — Serviceprotokoll", external_body: "INTERNAL" },
    external_submissions: [],
  },
  {
    id: "chk-4", program_id: "prog-1",
    inspector_name: "Eric Karlsson", subject_name: "Robin Björk", vehicle_reg: "ABC 123",
    status: "COMPLETED", score_pct: 60, check_date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    responses: [], critical_fails: 2,
    quality_programs: { name: "Veckostickprov — Bromsar & Säkerhet", external_body: "DEKRA", auto_submit_to_external: true },
    external_submissions: [
      { id: "sub-1", external_body: "DEKRA", submission_method: "EMAIL", submitted_at: new Date().toISOString(), status: "SENT", external_ref: "DEKRA-2026-03-8842" },
    ],
  },
];

const DEMO_PLANS: ActionPlan[] = [
  {
    id: "plan-1",
    title: "Robin Björk — Bromsarbeten under standard",
    description: "3 underkända kontroller på 30 dagar. Kritiska avvikelser på bromsskivor.",
    root_cause: "Bromsskivor kontrolleras ej mot specifikation vid montering",
    trigger_type: "CRITICAL_FAIL",
    owner_name: "Maria Lindqvist",
    status: "IN_PROGRESS",
    affected_mechanic_name: "Robin Björk",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    actions: [
      { id: "a1", description: "Genomgång av bromsspecifikationer med Robin", owner_name: "Maria Lindqvist", due_date: "2026-03-25", status: "COMPLETED" },
      { id: "a2", description: "Handledd bromskontroll (Robin + Eric)", owner_name: "Eric Karlsson", due_date: "2026-03-26", status: "COMPLETED" },
      { id: "a3", description: "Kontrollstickprov om 2 veckor", owner_name: "Maria Lindqvist", due_date: "2026-04-05", status: "OPEN" },
    ],
  },
  {
    id: "plan-2",
    title: "Dokumentationsbrister — mars 2026",
    description: "Systematiska brister i exit capture dokumentation.",
    root_cause: "Exit capture ej inbyggt i arbetsflödet",
    trigger_type: "TREND_DETECTED",
    owner_name: "Maria Lindqvist",
    status: "VERIFIED",
    effectiveness_rating: 4,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    actions: [],
  },
];

const DEMO_TRENDS: QTrend[] = [
  {
    id: "trend-1",
    trend_type: "MECHANIC_DECLINE",
    affected_entity: "Robin Björk",
    fail_rate_pct: 60,
    sample_count: 5,
    trend_direction: "CRITICAL",
    detected_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

const DEMO_STATS: Stats = {
  overall_score_pct: 87,
  checks_this_month: 14,
  fail_rate: 14,
  fail_count: 2,
  open_action_plans: 1,
  active_trends: 1,
  mechanic_scores: [
    { id: "m1", name: "Eric Karlsson", avg_score: 94, check_count: 12, trend: "IMPROVING" },
    { id: "m2", name: "Jonas Lindström", avg_score: 88, check_count: 8, trend: "STABLE" },
    { id: "m3", name: "Robin Björk", avg_score: 79, check_count: 11, trend: "DECLINING" },
  ],
  top_issues: [
    { category: "Documentation", count: 8 },
    { category: "Technical", count: 3 },
    { category: "Customer", count: 2 },
  ],
};
