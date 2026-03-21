import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "./useApi";

// ─── Colors (matching Dashboard.tsx palette) ─────────────────────────────────
const C = {
  blue:    "#007AFF",
  green:   "#34C759",
  orange:  "#FF9500",
  red:     "#FF3B30",
  purple:  "#AF52DE",
  indigo:  "#5856D6",
  bg:      "#F2F2F7",
  surface: "#FFFFFF",
  border:  "rgba(60,60,67,0.18)",
  text:    "#000000",
  subtext: "#8E8E93",
};

const shadow = "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)";

// ─── Types ────────────────────────────────────────────────────────────────────
interface User {
  id: string;
  full_name?: string;
  email?: string;
  role?: string;
  app_metadata?: { role?: string };
}

interface DashboardData {
  user: User;
  org?: any;
  [key: string]: any;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isManager(user: User): boolean {
  return user.role === "MANAGER" || user.role === "ADMIN"
    || user.app_metadata?.role === "MANAGER" || user.app_metadata?.role === "ADMIN";
}

function scoreColor(score: number): string {
  if (score >= 70) return C.green;
  if (score >= 50) return C.orange;
  return C.red;
}

function trendArrow(trend: string): string {
  if (trend === "IMPROVING")  return "↑";
  if (trend === "DECLINING")  return "↓";
  if (trend === "CRITICAL")   return "↓↓";
  return "→";
}

function trendColor(trend: string): string {
  if (trend === "IMPROVING")  return C.green;
  if (trend === "DECLINING")  return C.orange;
  if (trend === "CRITICAL")   return C.red;
  return C.subtext;
}

function burnoutBadge(risk: string): { color: string; label: string } {
  switch (risk) {
    case "CRITICAL": return { color: C.red,    label: "Kritisk risk" };
    case "HIGH":     return { color: C.red,    label: "Hög risk" };
    case "MEDIUM":   return { color: C.orange, label: "Mellannivå" };
    default:         return { color: C.green,  label: "Låg risk" };
  }
}

// ─── Card component ───────────────────────────────────────────────────────────
const Card = ({ children, style, onClick }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) => (
  <div onClick={onClick} style={{
    background: C.surface,
    borderRadius: 12,
    padding: 20,
    border: `0.5px solid ${C.border}`,
    boxShadow: shadow,
    ...style,
  }}>
    {children}
  </div>
);

const Badge = ({ label, color }: { label: string; color: string }) => (
  <span style={{
    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
    background: color + "20", color,
  }}>{label}</span>
);

// ─── Sparkline (tiny score trend chart) ──────────────────────────────────────
const Sparkline = ({ scores, color = C.blue }: { scores: number[]; color?: string }) => {
  if (!scores.length) return null;
  const w = 80, h = 28, pad = 2;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = Math.max(max - min, 10);
  const pts = scores.map((s, i) => {
    const x = pad + (i / Math.max(scores.length - 1, 1)) * (w - pad * 2);
    const y = pad + (1 - (s - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {scores.map((s, i) => {
        const x = pad + (i / Math.max(scores.length - 1, 1)) * (w - pad * 2);
        const y = pad + (1 - (s - min) / range) * (h - pad * 2);
        return <circle key={i} cx={x} cy={y} r={i === scores.length - 1 ? 3 : 1.5} fill={color} />;
      })}
    </svg>
  );
};

// ─── Pulse Card ───────────────────────────────────────────────────────────────
const PulseCard = ({ user, onResponded }: { user: User; onResponded: () => void }) => {
  const [pulse, setPulse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    apiClient.get<any>("/api/people/pulse/this-week")
      .then((d: any) => { setPulse(d); setDone(!!d.already_responded); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const submitMood = async (mood: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await apiClient.post("/api/people/pulse/respond", { mood, comment, is_anonymous: true });
      setDone(true);
      onResponded();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const submitScale = async (score: number) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await apiClient.post("/api/people/pulse/respond", { score, comment, is_anonymous: true });
      setDone(true);
      onResponded();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Card><div style={{ color: C.subtext }}>Laddar...</div></Card>;
  if (!pulse) return null;

  if (done) {
    return (
      <Card style={{ background: "linear-gradient(135deg, #34C75910, #007AFF08)", border: `1px solid ${C.green}30` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 32 }}>✅</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Vecka {pulse.week} — check-in klar!</div>
            <div style={{ fontSize: 13, color: C.subtext, marginTop: 2 }}>Tack för ditt svar. Det hjälper oss att ta hand om teamet.</div>
          </div>
        </div>
      </Card>
    );
  }

  const MOODS = [
    { mood: "GREAT",    emoji: "😊", label: "Toppen" },
    { mood: "GOOD",     emoji: "🙂", label: "Bra" },
    { mood: "OK",       emoji: "😐", label: "Okej" },
    { mood: "BAD",      emoji: "😕", label: "Inte bra" },
    { mood: "TERRIBLE", emoji: "😢", label: "Dåligt" },
  ];

  const SCALE = [1, 2, 3, 4, 5];
  const SCALE_LABELS = ["Inte alls", "", "Delvis", "", "Absolut"];

  return (
    <Card style={{ border: `1.5px solid ${C.blue}40`, background: "linear-gradient(135deg, #007AFF08, #FFFFFF)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.blue, textTransform: "uppercase", letterSpacing: 0.5 }}>
            🌟 Veckans check-in — vecka {pulse.week}
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, marginTop: 6, color: C.text }}>
            {pulse.question}
          </div>
        </div>
        <Badge label="Anonymt" color={C.green} />
      </div>

      {pulse.question_type === "MOOD" ? (
        <div style={{ display: "flex", gap: 12, justifyContent: "center", padding: "8px 0" }}>
          {MOODS.map(m => (
            <button key={m.mood} onClick={() => submitMood(m.mood)} disabled={submitting}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                background: "none", border: "none", cursor: "pointer", padding: "8px 12px",
                borderRadius: 12, transition: "all 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#007AFF15")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <span style={{ fontSize: 32 }}>{m.emoji}</span>
              <span style={{ fontSize: 11, color: C.subtext }}>{m.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 4 }}>
            {SCALE.map(s => (
              <button key={s} onClick={() => submitScale(s)} disabled={submitting}
                style={{
                  width: 48, height: 48, borderRadius: 12,
                  border: `1.5px solid ${C.blue}40`,
                  background: "none", cursor: "pointer", fontSize: 18, fontWeight: 600,
                  color: C.blue, transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = C.blue; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.blue; }}
              >{s}</button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.subtext, padding: "0 4px" }}>
            <span>{SCALE_LABELS[0]}</span>
            <span>{SCALE_LABELS[4]}</span>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <input
          type="text"
          placeholder="Vill du berätta mer? (valfritt)"
          value={comment}
          onChange={e => setComment(e.target.value)}
          style={{
            width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13,
            border: `0.5px solid ${C.border}`, background: C.bg, color: C.text,
            outline: "none", boxSizing: "border-box",
          }}
        />
      </div>
    </Card>
  );
};

// ─── Feedback Form ────────────────────────────────────────────────────────────
const FeedbackForm = ({ user }: { user: User }) => {
  const [category, setCategory] = useState("OTHER");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(false);

  const submit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.post("/api/people/feedback", {
        feedback_type: "ANONYMOUS_TO_ORG",
        category,
        message,
        is_anonymous: true,
      });
      setSent(true);
      setMessage("");
      setTimeout(() => { setSent(false); setOpen(false); }, 3000);
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const CATS = [
    { id: "WORKLOAD",    label: "Arbetsbelastning" },
    { id: "CULTURE",     label: "Kultur" },
    { id: "TOOLS",       label: "Verktyg" },
    { id: "MANAGEMENT",  label: "Ledning" },
    { id: "OTHER",       label: "Förslag" },
  ];

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>💬 Ge feedback</div>
        <button
          onClick={() => setOpen(!open)}
          style={{
            padding: "6px 14px", borderRadius: 8, background: open ? C.bg : C.blue,
            color: open ? C.text : "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}
        >
          {open ? "Avbryt" : "Skicka anonym feedback"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {CATS.map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: category === c.id ? C.blue : C.bg,
                  color: category === c.id ? "#fff" : C.text,
                  border: `1px solid ${category === c.id ? C.blue : C.border}`,
                  cursor: "pointer",
                }}
              >{c.label}</button>
            ))}
          </div>
          <textarea
            placeholder="Vad vill du dela? Skickas anonymt till ledningen."
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
              border: `0.5px solid ${C.border}`, background: C.bg, color: C.text,
              outline: "none", resize: "vertical", boxSizing: "border-box",
            }}
          />
          {sent ? (
            <div style={{ textAlign: "center", color: C.green, fontWeight: 600, fontSize: 14, padding: "8px 0" }}>
              ✅ Feedback skickad — tack!
            </div>
          ) : (
            <button onClick={submit} disabled={submitting || !message.trim()}
              style={{
                marginTop: 10, width: "100%", padding: "10px", borderRadius: 8,
                background: C.blue, color: "#fff", border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 600, opacity: message.trim() ? 1 : 0.5,
              }}
            >
              {submitting ? "Skickar..." : "Skicka anonymt"}
            </button>
          )}
        </div>
      )}
    </Card>
  );
};

// ─── My Score Trend ───────────────────────────────────────────────────────────
const MyScoreTrend = ({ user }: { user: User }) => {
  const [scores, setScores] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get(`/api/people/scores/${user.id}`)
      .then((d: any) => setScores(Array.isArray(d) ? d : []))
      .catch(() => setScores([]));
  }, [user.id]);

  if (!scores.length) return null;

  const latest = scores[0];
  const sparkData = [...scores].reverse().map(s => Number(s.engagement_score));

  return (
    <Card>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>📊 Min trivsel</div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div>
          <div style={{ fontSize: 36, fontWeight: 700, color: scoreColor(Number(latest.engagement_score)) }}>
            {Math.round(Number(latest.engagement_score))}
          </div>
          <div style={{ fontSize: 12, color: C.subtext }}>av 100</div>
        </div>
        <div style={{ flex: 1 }}>
          <Sparkline scores={sparkData} color={scoreColor(Number(latest.engagement_score))} />
          <div style={{ fontSize: 11, color: C.subtext, marginTop: 4 }}>Senaste {sparkData.length} veckorna</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, color: trendColor(latest.trend) }}>{trendArrow(latest.trend)}</div>
          <div style={{ fontSize: 11, color: C.subtext }}>
            {latest.trend === "IMPROVING" ? "Bättre" : latest.trend === "DECLINING" ? "Sämre" : "Stabilt"}
          </div>
        </div>
      </div>
    </Card>
  );
};

// ─── Team Health Dashboard (Manager) ─────────────────────────────────────────
const TeamHealthDashboard = ({ user }: { user: User }) => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [teamScores, setTeamScores] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"team" | "feedback" | "warnings">("team");

  const load = useCallback(async () => {
    try {
      const [dash, scores, warns, fb] = await Promise.all([
        apiClient.get<any>("/api/people/dashboard"),
        apiClient.get<any>("/api/people/scores/team"),
        apiClient.get<any[]>("/api/people/warnings"),
        apiClient.get<any[]>("/api/people/feedback/inbox"),
      ]);
      setDashboard(dash);
      setTeamScores((scores as any).team ?? []);
      setWarnings(warns as any[]);
      setFeedback(fb as any[]);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { load(); }, []);

  if (!dashboard) return <div style={{ color: C.subtext, padding: 20 }}>Laddar teamdata...</div>;

  const tabs = [
    { id: "team",     label: "🏆 Team" },
    { id: "feedback", label: `💬 Feedback ${feedback.filter(f => f.status === "OPEN").length > 0 ? `(${feedback.filter(f => f.status === "OPEN").length})` : ""}` },
    { id: "warnings", label: `⚠️ Varningar ${dashboard.warnings_count > 0 ? `(${dashboard.warnings_count})` : ""}` },
  ];

  return (
    <div>
      {/* Big number */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <Card style={{ flex: "1 1 200px", textAlign: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: scoreColor(dashboard.team_avg_score) }}>
            {dashboard.team_avg_score}
          </div>
          <div style={{ fontSize: 13, color: C.subtext }}>Teampoäng</div>
          <div style={{ fontSize: 20, color: trendColor(dashboard.trend === "improving" ? "IMPROVING" : dashboard.trend === "declining" ? "DECLINING" : "STABLE"), marginTop: 4 }}>
            {dashboard.trend === "improving" ? "↑↑ Förbättras" : dashboard.trend === "declining" ? "↓ Sjunker" : "→ Stabilt"}
          </div>
        </Card>
        <Card style={{ flex: "1 1 160px", textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: C.blue }}>{dashboard.response_rate}%</div>
          <div style={{ fontSize: 13, color: C.subtext }}>Svarsfrekvens</div>
          <div style={{ fontSize: 12, color: C.subtext, marginTop: 4 }}>{dashboard.responded}/{dashboard.total_members} svarade</div>
        </Card>
        <Card style={{ flex: "1 1 160px", textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: dashboard.warnings_count > 0 ? C.red : C.green }}>
            {dashboard.warnings_count}
          </div>
          <div style={{ fontSize: 13, color: C.subtext }}>Aktiva varningar</div>
        </Card>
        <Card style={{ flex: "1 1 160px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 600, marginTop: 4 }}>
            <span style={{ color: C.green }}>●</span>
            <span style={{ color: C.green }}>{dashboard.score_distribution?.high ?? 0}</span>
            <span style={{ color: C.orange }}>●</span>
            <span style={{ color: C.orange }}>{dashboard.score_distribution?.medium ?? 0}</span>
            <span style={{ color: C.red }}>●</span>
            <span style={{ color: C.red }}>{dashboard.score_distribution?.low ?? 0}</span>
          </div>
          <div style={{ fontSize: 13, color: C.subtext, marginTop: 4 }}>Hög / Medium / Låg</div>
        </Card>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: C.surface, borderRadius: 10, padding: 4, border: `0.5px solid ${C.border}` }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              background: activeTab === t.id ? C.blue : "none",
              color: activeTab === t.id ? "#fff" : C.text,
              fontWeight: 600, fontSize: 13,
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Team tab */}
      {activeTab === "team" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {teamScores.length === 0 && (
            <Card>
              <div style={{ color: C.subtext, textAlign: "center", padding: "20px 0" }}>
                Inga engagementspoäng beräknade ännu.
                <br /><small>Kör "Beräkna poäng" för att generera data.</small>
              </div>
            </Card>
          )}
          {teamScores.map(s => {
            const score = Math.round(Number(s.engagement_score));
            const warning = warnings.find(w => w.user_id === s.user_id && w.status === "OPEN");
            return (
              <Card key={s.user_id} style={{ cursor: "pointer" }}
                onClick={() => setSelectedMember(selectedMember === s.user_id ? null : s.user_id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 20,
                    background: `linear-gradient(135deg, ${C.blue}, ${C.indigo})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontWeight: 700, fontSize: 16, flexShrink: 0,
                  }}>
                    {(s.user?.full_name ?? s.user?.email ?? "?")[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {s.user?.full_name ?? s.user?.email ?? "Okänd"}
                    </div>
                    <div style={{ fontSize: 12, color: C.subtext }}>
                      {warning && <span style={{ color: C.red }}>⚠ {warning.description?.substring(0, 40)} · </span>}
                      <Badge label={burnoutBadge(s.burnout_risk).label} color={burnoutBadge(s.burnout_risk).color} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: scoreColor(score) }}>{score}</div>
                    <div style={{ fontSize: 16, color: trendColor(s.trend) }}>{trendArrow(s.trend)}</div>
                  </div>
                </div>
                {selectedMember === s.user_id && (
                  <MemberDetail userId={s.user_id} orgScore={s} warnings={warnings.filter(w => w.user_id === s.user_id)} />
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Feedback tab */}
      {activeTab === "feedback" && (
        <FeedbackInbox feedback={feedback} onRefresh={load} />
      )}

      {/* Warnings tab */}
      {activeTab === "warnings" && (
        <WarningsList warnings={warnings} onRefresh={load} />
      )}
    </div>
  );
};

// ─── Member Detail ────────────────────────────────────────────────────────────
const MemberDetail = ({ userId, orgScore, warnings }: { userId: string; orgScore: any; warnings: any[] }) => {
  const [scores, setScores] = useState<any[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  useEffect(() => {
    apiClient.get(`/api/people/scores/${userId}`)
      .then((d: any) => setScores(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [userId]);

  const schedule1on1 = async () => {
    try {
      await apiClient.post("/api/people/1on1s", { employee_id: userId, scheduled_at: scheduledAt || null });
      setShowSchedule(false);
      alert("1-on-1 schemalagd!");
    } catch (e) { console.error(e); }
  };

  const sparkData = [...scores].reverse().map(s => Number(s.engagement_score));
  const latest = scores[0];

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: `0.5px solid ${C.border}` }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px" }}>
          <div style={{ fontSize: 12, color: C.subtext, marginBottom: 6 }}>Engagemangstrend (senaste 8 v)</div>
          <Sparkline scores={sparkData.slice(-8)} color={latest ? scoreColor(Number(latest.engagement_score)) : C.blue} />
        </div>
        <div style={{ flex: "1 1 120px" }}>
          <div style={{ fontSize: 12, color: C.subtext }}>Pulspoäng</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.blue }}>{Math.round(Number(orgScore.pulse_score ?? 50))}/100</div>
        </div>
        <div style={{ flex: "1 1 120px" }}>
          <div style={{ fontSize: 12, color: C.subtext }}>Aktivitet</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.indigo }}>{Math.round(Number(orgScore.activity_score ?? 50))}/100</div>
        </div>
        {warnings.length > 0 && (
          <div style={{ flex: "1 1 200px" }}>
            <div style={{ fontSize: 12, color: C.red, fontWeight: 600, marginBottom: 4 }}>⚠ Varningar</div>
            {warnings.map(w => (
              <div key={w.id} style={{ fontSize: 12, color: C.text, marginBottom: 2 }}>
                <Badge label={w.severity} color={w.severity === "HIGH" || w.severity === "CRITICAL" ? C.red : C.orange} />
                {" "}{w.description}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        {!showSchedule ? (
          <button onClick={() => setShowSchedule(true)}
            style={{
              padding: "8px 16px", borderRadius: 8, background: C.blue, color: "#fff",
              border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >📅 Schemalägg 1-on-1</button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: `0.5px solid ${C.border}`, fontSize: 13 }} />
            <button onClick={schedule1on1}
              style={{ padding: "6px 14px", borderRadius: 8, background: C.green, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              Boka
            </button>
            <button onClick={() => setShowSchedule(false)}
              style={{ padding: "6px 14px", borderRadius: 8, background: C.bg, border: `0.5px solid ${C.border}`, cursor: "pointer", fontSize: 13 }}>
              Avbryt
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Feedback Inbox ───────────────────────────────────────────────────────────
const FeedbackInbox = ({ feedback, onRefresh }: { feedback: any[]; onRefresh: () => void }) => {
  const [filter, setFilter] = useState("ALL");

  const CATS = ["ALL", "WORKLOAD", "CULTURE", "MANAGEMENT", "TOOLS", "OTHER"];
  const catLabel: Record<string, string> = {
    ALL: "Alla", WORKLOAD: "Arbetsbelastning", CULTURE: "Kultur",
    MANAGEMENT: "Ledning", TOOLS: "Verktyg", OTHER: "Övrigt",
  };
  const sentimentIcon: Record<string, string> = { POSITIVE: "😊", NEUTRAL: "😐", NEGATIVE: "😟" };
  const severityColor: Record<string, string> = { LOW: C.green, MEDIUM: C.orange, HIGH: C.red, CRITICAL: C.red };

  const filtered = filter === "ALL" ? feedback : feedback.filter(f => f.category === filter);

  const act = async (id: string, action: "acknowledge" | "resolve") => {
    await apiClient.patch(`/api/people/feedback/${id}/${action}`, {});
    onRefresh();
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {CATS.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: filter === c ? C.blue : C.bg,
              color: filter === c ? "#fff" : C.text,
              border: `1px solid ${filter === c ? C.blue : C.border}`,
              cursor: "pointer",
            }}
          >{catLabel[c]}</button>
        ))}
      </div>
      {filtered.length === 0 && <div style={{ color: C.subtext, textAlign: "center", padding: 20 }}>Ingen feedback att visa.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(f => (
          <Card key={f.id}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 20 }}>{sentimentIcon[f.sentiment] ?? "💬"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                  <Badge label={catLabel[f.category] ?? f.category} color={C.blue} />
                  <Badge label={f.severity} color={severityColor[f.severity] ?? C.green} />
                  {f.status !== "OPEN" && <Badge label={f.status} color={C.subtext} />}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>{f.message}</div>
                <div style={{ fontSize: 11, color: C.subtext, marginTop: 4 }}>
                  {f.is_anonymous ? "🔒 Anonym" : "Direkt"} · {new Date(f.created_at).toLocaleDateString("sv-SE")}
                </div>
              </div>
              {f.status === "OPEN" && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => act(f.id, "acknowledge")}
                    style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, background: C.orange + "20", color: C.orange, border: "none", cursor: "pointer", fontWeight: 600 }}>
                    Noterat
                  </button>
                  <button onClick={() => act(f.id, "resolve")}
                    style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, background: C.green + "20", color: C.green, border: "none", cursor: "pointer", fontWeight: 600 }}>
                    Löst
                  </button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ─── Warnings List ────────────────────────────────────────────────────────────
const WarningsList = ({ warnings, onRefresh }: { warnings: any[]; onRefresh: () => void }) => {

  const ack = async (id: string) => {
    await apiClient.patch(`/api/people/warnings/${id}/acknowledge`, {});
    onRefresh();
  };

  const severityColor: Record<string, string> = { LOW: C.green, MEDIUM: C.orange, HIGH: C.red, CRITICAL: C.red };
  const flagIcon: Record<string, string> = {
    BURNOUT_RISK: "🔥",
    DECLINING_ENGAGEMENT: "📉",
    MISSED_SURVEYS: "📋",
    NEGATIVE_TREND: "⚠",
    OVERLOAD: "😓",
    ISOLATION: "🔇",
  };

  if (warnings.length === 0) return (
    <Card>
      <div style={{ textAlign: "center", padding: "20px 0", color: C.green, fontSize: 16, fontWeight: 600 }}>
        ✅ Inga aktiva varningar — teamet mår bra!
      </div>
    </Card>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {warnings.map(w => (
        <Card key={w.id} style={{ border: `1px solid ${severityColor[w.severity]}40` }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 24 }}>{flagIcon[w.flag_type] ?? "⚠"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                <Badge label={w.severity} color={severityColor[w.severity]} />
                <Badge label={w.flag_type.replace(/_/g, " ")} color={C.subtext} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{w.user?.full_name ?? "Okänd"}</div>
              <div style={{ fontSize: 13, color: C.text, marginTop: 2 }}>{w.description}</div>
              {w.suggested_action && (
                <div style={{ fontSize: 12, color: C.blue, marginTop: 4 }}>💡 {w.suggested_action}</div>
              )}
            </div>
            <button onClick={() => ack(w.id)}
              style={{ padding: "6px 12px", borderRadius: 8, background: C.bg, border: `0.5px solid ${C.border}`, cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.text }}>
              Noterat
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
};

// ─── Main Module ──────────────────────────────────────────────────────────────
export const PeopleOSModule = ({ D }: { D: DashboardData }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const mgr = isManager(D.user);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>❤️ Team & Trivsel</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.subtext }}>
            Vi optimerar inte bara verksamheten — vi optimerar teamet.
          </p>
        </div>
        {mgr && (
          <div style={{ fontSize: 12, color: C.subtext, textAlign: "right" }}>
            <Badge label="Manager View" color={C.indigo} />
          </div>
        )}
      </div>

      {/* Pulse card — always shown first */}
      <PulseCard user={D.user} onResponded={() => setRefreshKey(k => k + 1)} />

      {/* Employee section */}
      {!mgr && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MyScoreTrend user={D.user} />
          <FeedbackForm user={D.user} />
        </div>
      )}

      {/* Manager section */}
      {mgr && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <TeamHealthDashboard user={D.user} />
          <MyScoreTrend user={D.user} />
          <FeedbackForm user={D.user} />
        </div>
      )}
    </div>
  );
};

export default PeopleOSModule;
