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

// ─── Slide-in animation & card hover ──────────────────────────────────────────
const SLIDE_IN_STYLE = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  .card-hover:hover {
    box-shadow: 0 4px 16px rgba(0,122,255,0.14);
    transform: translateY(-1px);
  }
`;

// ─── Extra helpers ─────────────────────────────────────────────────────────────
function memberColor(score: number): string {
  if (score >= 70) return C.green;
  if (score >= 50) return C.orange;
  return C.red;
}

function riskBorderColor(risk: string): string {
  switch (risk) {
    case "CRITICAL": return C.red;
    case "HIGH":     return C.red;
    case "MEDIUM":   return C.orange;
    default:         return C.green;
  }
}

function initials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Bar component ─────────────────────────────────────────────────────────────
const Bar = ({ pct, color, height = 6 }: { pct: number; color: string; height?: number }) => (
  <div style={{ background: C.bg, borderRadius: height, overflow: "hidden", height }}>
    <div style={{
      width: `${Math.min(100, Math.max(0, pct))}%`,
      height: "100%",
      background: color,
      borderRadius: height,
      transition: "width 0.4s ease",
    }} />
  </div>
);

// ─── Btn component ─────────────────────────────────────────────────────────────
const Btn = ({ children, variant = "primary", size = "md", onClick }: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  onClick?: () => void;
}) => {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: C.blue,    color: "#fff",    border: "none" },
    secondary: { background: C.bg,      color: C.text,    border: `0.5px solid ${C.border}` },
    ghost:     { background: "none",    color: C.subtext, border: "none" },
  };
  const padding = size === "sm" ? "8px 14px" : "10px 18px";
  return (
    <button onClick={onClick} style={{
      padding, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
      fontFamily: "inherit", textAlign: "center", ...styles[variant],
    }}>{children}</button>
  );
};

// ─── Demo team data ────────────────────────────────────────────────────────────
interface TeamMember {
  id: string;
  name: string;
  role: string;
  engagement_score: number;
  burnout_risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  trend: "IMPROVING" | "STABLE" | "DECLINING";
  open_tasks: number;
  overdue_tasks: number;
  goals_completed: number;
  has_unread_feedback: boolean;
  score_history: number[];
  recent_pulses: { question: string; score: number; mood?: string }[];
}

const DEMO_TEAM: TeamMember[] = [
  {
    id: "gunnar",
    name: "Gunnar Lindqvist",
    role: "Säljchef",
    engagement_score: 78,
    burnout_risk: "LOW",
    trend: "IMPROVING",
    open_tasks: 5,
    overdue_tasks: 0,
    goals_completed: 82,
    has_unread_feedback: false,
    score_history: [65, 70, 72, 68, 74, 76, 79, 78],
    recent_pulses: [
      { question: "Hur mår du?",        score: 4, mood: "😊 Bra" },
      { question: "Arbetsbelastning?",  score: 3, mood: "😐 Okej" },
      { question: "Teamkänsla?",        score: 5, mood: "😊 Toppen" },
    ],
  },
  {
    id: "eva",
    name: "Eva Karlsson",
    role: "Produktchef",
    engagement_score: 85,
    burnout_risk: "LOW",
    trend: "STABLE",
    open_tasks: 8,
    overdue_tasks: 1,
    goals_completed: 91,
    has_unread_feedback: false,
    score_history: [80, 82, 84, 83, 86, 85, 84, 85],
    recent_pulses: [
      { question: "Hur mår du?",        score: 5, mood: "😊 Toppen" },
      { question: "Arbetsbelastning?",  score: 4, mood: "😊 Bra" },
      { question: "Teamkänsla?",        score: 5, mood: "😊 Toppen" },
    ],
  },
  {
    id: "thomas",
    name: "Thomas Berg",
    role: "Utvecklare",
    engagement_score: 61,
    burnout_risk: "MEDIUM",
    trend: "DECLINING",
    open_tasks: 12,
    overdue_tasks: 3,
    goals_completed: 55,
    has_unread_feedback: true,
    score_history: [72, 70, 68, 65, 64, 62, 61, 61],
    recent_pulses: [
      { question: "Hur mår du?",        score: 2, mood: "😕 Inte bra" },
      { question: "Arbetsbelastning?",  score: 2, mood: "😕 Inte bra" },
      { question: "Teamkänsla?",        score: 3, mood: "😐 Okej" },
    ],
  },
  {
    id: "rickard",
    name: "Rickard Söderström",
    role: "Kundansvarig",
    engagement_score: 32,
    burnout_risk: "CRITICAL",
    trend: "DECLINING",
    open_tasks: 18,
    overdue_tasks: 7,
    goals_completed: 28,
    has_unread_feedback: true,
    score_history: [60, 55, 50, 45, 42, 38, 34, 32],
    recent_pulses: [
      { question: "Hur mår du?",        score: 1, mood: "😢 Dåligt" },
      { question: "Arbetsbelastning?",  score: 1, mood: "😢 Dåligt" },
      { question: "Teamkänsla?",        score: 2, mood: "😕 Inte bra" },
    ],
  },
];

// ─── Team Member Card ──────────────────────────────────────────────────────────
const TeamMemberCard = ({ member, onClick }: { member: TeamMember; onClick: (m: TeamMember) => void }) => (
  <div
    onClick={() => onClick(member)}
    className="card-hover"
    style={{
      background: C.surface,
      border: `0.5px solid ${C.border}`,
      borderRadius: 12,
      padding: 16,
      cursor: "pointer",
      transition: "all 0.15s ease",
    }}
  >
    {/* Avatar row */}
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: memberColor(member.engagement_score),
        border: `2px solid ${riskBorderColor(member.burnout_risk)}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0,
      }}>
        {initials(member.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {member.name}
        </div>
        <div style={{ fontSize: 12, color: C.subtext }}>{member.role}</div>
      </div>
      {(member.burnout_risk === "HIGH" || member.burnout_risk === "CRITICAL") && (
        <div style={{
          flexShrink: 0, fontSize: 10, fontWeight: 700, padding: "3px 8px",
          borderRadius: 4, background: "#FF3B3010", color: C.red,
        }}>
          {member.burnout_risk === "CRITICAL" ? "🔴 KRITISK" : "🟠 HÖG RISK"}
        </div>
      )}
    </div>

    {/* Engagement bar */}
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: C.subtext }}>Engagemang</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor(member.engagement_score) }}>
          {member.engagement_score}/100
        </span>
      </div>
      <Bar pct={member.engagement_score} color={scoreColor(member.engagement_score)} height={4} />
    </div>

    {/* Trend */}
    <div style={{ fontSize: 12, color: C.subtext, marginBottom: 2 }}>
      {member.trend === "DECLINING" ? "↓ Sjunkande trend"
        : member.trend === "IMPROVING" ? "↑ Förbättras"
        : "→ Stabil"}
    </div>

    {/* KPIs */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
      <div style={{ textAlign: "center", background: C.bg, borderRadius: 8, padding: "6px 4px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{member.open_tasks}</div>
        <div style={{ fontSize: 10, color: C.subtext }}>Tasks</div>
      </div>
      <div style={{ textAlign: "center", background: C.bg, borderRadius: 8, padding: "6px 4px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: member.overdue_tasks > 0 ? C.red : C.text }}>
          {member.overdue_tasks}
        </div>
        <div style={{ fontSize: 10, color: C.subtext }}>Försenade</div>
      </div>
      <div style={{ textAlign: "center", background: C.bg, borderRadius: 8, padding: "6px 4px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{member.goals_completed}%</div>
        <div style={{ fontSize: 10, color: C.subtext }}>Mål</div>
      </div>
    </div>
  </div>
);

// ─── Member Detail Panel ───────────────────────────────────────────────────────
const MemberDetailPanel = ({ member, onClose }: { member: TeamMember; onClose: () => void }) => (
  <div style={{
    position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
    background: C.surface,
    boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
    zIndex: 200, overflowY: "auto",
    animation: "slideInRight 0.25s ease",
  }}>
    {/* Header */}
    <div style={{ padding: "20px 24px 16px", borderBottom: `0.5px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: memberColor(member.engagement_score),
        border: `3px solid ${riskBorderColor(member.burnout_risk)}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, fontWeight: 700, color: "#fff", flexShrink: 0,
      }}>
        {initials(member.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{member.name}</div>
        <div style={{ fontSize: 14, color: C.subtext }}>{member.role}</div>
        {(member.burnout_risk === "CRITICAL" || member.burnout_risk === "HIGH") && (
          <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, color: C.red }}>
            {member.burnout_risk === "CRITICAL" ? "🔴 KRITISK RISKPROFIL" : "🟠 HÖG RISK"}
          </div>
        )}
      </div>
      <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: C.subtext, fontSize: 24, lineHeight: 1, flexShrink: 0 }}>✕</button>
    </div>

    {/* Sparkline — 8 weeks */}
    <div style={{ padding: "16px 24px", borderBottom: `0.5px solid ${C.border}` }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.subtext, marginBottom: 12 }}>ENGAGEMANG — 8 VECKOR</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 56, marginBottom: 22 }}>
        {member.score_history.map((score, i) => {
          const isLast = i === member.score_history.length - 1;
          return (
            <div key={i} style={{
              flex: 1,
              background: isLast ? C.blue : C.bg,
              height: `${score}%`,
              borderRadius: 3,
              minHeight: 4,
              position: "relative",
              transition: "height 0.3s ease",
            }}>
              {isLast && (
                <div style={{
                  position: "absolute", bottom: -20, left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 10, fontWeight: 700, color: C.blue, whiteSpace: "nowrap",
                }}>{score}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>

    {/* System health */}
    <div style={{ padding: "16px 24px" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.subtext, marginBottom: 12 }}>SYSTEMHÄLSA</div>

      {/* Tasks */}
      <div style={{ background: C.bg, borderRadius: 10, padding: 14, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.text }}>Uppgifter</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{member.open_tasks}</div>
            <div style={{ fontSize: 11, color: C.subtext }}>Öppna</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: member.overdue_tasks > 0 ? C.red : C.green }}>
              {member.overdue_tasks}
            </div>
            <div style={{ fontSize: 11, color: C.subtext }}>Försenade</div>
          </div>
        </div>
      </div>

      {/* Goal progress */}
      <div style={{ background: C.bg, borderRadius: 10, padding: 14, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Mål & Utveckling</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>{member.goals_completed}%</div>
        </div>
        <Bar pct={member.goals_completed} color={C.blue} />
      </div>

      {/* Pulse history */}
      <div style={{ background: C.bg, borderRadius: 10, padding: 14, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.text }}>Senaste pulssvar</div>
        {member.recent_pulses.map((p, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", padding: "6px 0",
            borderBottom: i < member.recent_pulses.length - 1 ? `0.5px solid ${C.border}` : "none",
            gap: 8,
          }}>
            <div style={{ fontSize: 12, color: C.subtext, flex: 1 }}>{p.question}</div>
            <div style={{ fontSize: 12, fontWeight: 600, flexShrink: 0,
              color: p.score >= 4 ? C.green : p.score >= 3 ? C.orange : C.red }}>
              {p.mood || `${p.score}/5`}
            </div>
          </div>
        ))}
      </div>

      {/* Anonymous feedback alert */}
      {member.has_unread_feedback && (
        <div style={{
          background: "#FFF3E0",
          border: `1px solid ${C.orange}40`,
          borderRadius: 10, padding: 14, marginBottom: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.orange, marginBottom: 4 }}>⚠️ Anonym feedback</div>
          <div style={{ fontSize: 12, color: C.subtext }}>Denna person har skickat feedback som kräver uppmärksamhet</div>
          <button style={{ marginTop: 8, fontSize: 12, color: C.blue, border: "none", background: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            Visa feedback →
          </button>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        <Btn variant="primary"   size="sm">📅 Boka 1-on-1</Btn>
        <Btn variant="secondary" size="sm">📋 Tilldela uppgift</Btn>
        <Btn variant="ghost"     size="sm">✉️ Skicka meddelande</Btn>
      </div>
    </div>
  </div>
);

// ─── Calendar View ─────────────────────────────────────────────────────────────
interface CalEvent {
  date: number;
  type: "one-on-one" | "culture" | "team";
  title: string;
}

const DEMO_EVENTS: CalEvent[] = [
  { date: 24, type: "one-on-one", title: "1-on-1 med Rickard Söderström" },
  { date: 25, type: "one-on-one", title: "1-on-1 med Thomas Berg" },
  { date: 26, type: "culture",    title: "After work — Teamkväll" },
  { date: 27, type: "team",       title: "Sprint review" },
  { date: 28, type: "one-on-one", title: "1-on-1 med Gunnar Lindqvist" },
  { date: 1,  type: "culture",    title: "Teamlunch" },
  { date: 5,  type: "team",       title: "Kvartalsplanering" },
];

const EVENT_COLOR: Record<string, string> = {
  "one-on-one": C.blue,
  "culture":    C.green,
  "team":       C.orange,
};

const EVENT_ICON: Record<string, string> = {
  "one-on-one": "👤",
  "culture":    "🎉",
  "team":       "👥",
};

const EVENT_LABEL: Record<string, string> = {
  "one-on-one": "1-on-1",
  "culture":    "Kultur",
  "team":       "Team",
};

const CalendarView = () => {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth    = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthName = now.toLocaleString("sv-SE", { month: "long", year: "numeric" });

  const upcoming = DEMO_EVENTS
    .filter(e => e.date >= today)
    .sort((a, b) => a.date - b.date)
    .slice(0, 5);

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, textTransform: "capitalize" }}>
          📅 {monthName}
        </div>

        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
          {["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 11, color: C.subtext, fontWeight: 600, padding: "4px 0" }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {cells.map((day, i) => {
            const dayEvents = day ? DEMO_EVENTS.filter(e => e.date === day) : [];
            const isToday   = day === today;
            return (
              <div key={i} style={{
                minHeight: 44, borderRadius: 8, padding: "4px 2px",
                background: isToday ? `${C.blue}18` : "transparent",
                textAlign: "center",
              }}>
                {day && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? C.blue : C.text, marginBottom: 2 }}>
                      {day}
                    </div>
                    {dayEvents.length > 0 && (
                      <div style={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
                        {dayEvents.map((e, ei) => (
                          <div key={ei} style={{ width: 6, height: 6, borderRadius: "50%", background: EVENT_COLOR[e.type] }} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
          {Object.entries(EVENT_LABEL).map(([type, label]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subtext }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: EVENT_COLOR[type] }} />
              {EVENT_ICON[type]} {label}
            </div>
          ))}
        </div>
      </Card>

      {/* Upcoming list */}
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: C.text }}>Kommande aktiviteter</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {upcoming.length === 0 && (
          <Card><div style={{ color: C.subtext, textAlign: "center", padding: "12px 0" }}>Inga fler händelser denna månad.</div></Card>
        )}
        {upcoming.map((e, i) => (
          <Card key={i} style={{ padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${EVENT_COLOR[e.type]}20`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, flexShrink: 0,
              }}>{EVENT_ICON[e.type]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {e.title}
                </div>
                <div style={{ fontSize: 12, color: C.subtext }}>
                  {new Date(year, month, e.date).toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" })}
                </div>
              </div>
              <Badge label={EVENT_LABEL[e.type]} color={EVENT_COLOR[e.type]} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ─── Team Overview Dashboard (new, demo-data driven) ──────────────────────────
const TeamOverviewDashboard = () => {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [filter,  setFilter]  = useState<"all" | "attention" | "healthy">("all");
  const [sortBy,  setSortBy]  = useState<"engagement" | "name">("engagement");
  const [activeTab, setActiveTab] = useState<"team" | "calendar">("team");

  const members       = DEMO_TEAM;
  const avgScore      = Math.round(members.reduce((s, m) => s + m.engagement_score, 0) / members.length);
  const needsAttention= members.filter(m => m.burnout_risk === "HIGH" || m.burnout_risk === "CRITICAL");
  const respondedCount= 3; // demo: 3 of 4 answered this week

  const filtered = members
    .filter(m => {
      if (filter === "attention") return m.burnout_risk === "HIGH" || m.burnout_risk === "CRITICAL";
      if (filter === "healthy")   return m.burnout_risk === "LOW";
      return true;
    })
    .sort((a, b) => sortBy === "name"
      ? a.name.localeCompare(b.name, "sv")
      : b.engagement_score - a.engagement_score
    );

  const innerTabs = [
    { id: "team",     label: "👥 Teamöversikt" },
    { id: "calendar", label: "📅 Kalender" },
  ];

  return (
    <div>
      <style>{SLIDE_IN_STYLE}</style>

      {/* Inner tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: C.surface, borderRadius: 10, padding: 4, border: `0.5px solid ${C.border}` }}>
        {innerTabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} style={{
            flex: 1, padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer",
            background: activeTab === t.id ? C.blue : "none",
            color: activeTab === t.id ? "#fff" : C.text,
            fontWeight: 600, fontSize: 13,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Team view ── */}
      {activeTab === "team" && (
        <>
          {/* Header stats */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <Card style={{ flex: "1 1 130px", textAlign: "center", padding: 16 }}>
              <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1, color: scoreColor(avgScore) }}>{avgScore}</div>
              <div style={{ fontSize: 12, color: C.subtext, marginTop: 4 }}>Teampoäng ↑</div>
            </Card>
            <Card style={{ flex: "1 1 130px", textAlign: "center", padding: 16 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.blue }}>{respondedCount}/{members.length}</div>
              <div style={{ fontSize: 12, color: C.subtext, marginTop: 4 }}>svarade på veckans puls</div>
            </Card>
            <Card style={{
              flex: "1 1 130px", textAlign: "center", padding: 16,
              border: needsAttention.length > 0 ? `1px solid ${C.red}40` : `0.5px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: needsAttention.length > 0 ? C.red : C.green }}>
                {needsAttention.length > 0 ? `⚠️ ${needsAttention.length}` : "✅ 0"}
              </div>
              <div style={{ fontSize: 12, color: C.subtext, marginTop: 4 }}>behöver uppmärksamhet</div>
            </Card>
          </div>

          {/* Filters + sort */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            {([ { id: "all", label: "Alla" }, { id: "attention", label: "🔴 Behöver uppmärksamhet" }, { id: "healthy", label: "🟢 Mår bra" } ] as const).map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: filter === f.id ? C.blue : C.bg,
                color: filter === f.id ? "#fff" : C.text,
                border: `1px solid ${filter === f.id ? C.blue : C.border}`,
                cursor: "pointer",
              }}>{f.label}</button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: C.subtext }}>Sortera:</span>
              {([ { id: "engagement", label: "Engagemang" }, { id: "name", label: "Namn" } ] as const).map(s => (
                <button key={s.id} onClick={() => setSortBy(s.id)} style={{
                  padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: sortBy === s.id ? C.indigo : C.bg,
                  color: sortBy === s.id ? "#fff" : C.subtext,
                  border: `1px solid ${sortBy === s.id ? C.indigo : C.border}`,
                  cursor: "pointer",
                }}>{s.label}</button>
              ))}
            </div>
          </div>

          {/* Member grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {filtered.map(member => (
              <TeamMemberCard key={member.id} member={member} onClick={setSelectedMember} />
            ))}
          </div>
        </>
      )}

      {/* ── Calendar view ── */}
      {activeTab === "calendar" && <CalendarView />}

      {/* ── Slide-in detail panel + backdrop ── */}
      {selectedMember && (
        <>
          <div
            onClick={() => setSelectedMember(null)}
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.28)", zIndex: 199 }}
          />
          <MemberDetailPanel member={selectedMember} onClose={() => setSelectedMember(null)} />
        </>
      )}
    </div>
  );
};

// ─── Main Module ──────────────────────────────────────────────────────────────
export const PeopleOSModule = ({ D }: { D: DashboardData }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeMainTab, setActiveMainTab] = useState<"overview" | "checkin" | "manager">("overview");
  const mgr = isManager(D.user);

  const mainTabs = [
    { id: "overview", label: "👥 Teamöversikt" },
    { id: "checkin",  label: "💓 Check-in" },
    ...(mgr ? [{ id: "manager", label: "📊 Manager" }] : []),
  ];

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

      {/* Top-level tab bar */}
      <div style={{ display: "flex", gap: 4, background: C.surface, borderRadius: 10, padding: 4, border: `0.5px solid ${C.border}` }}>
        {mainTabs.map(t => (
          <button key={t.id} onClick={() => setActiveMainTab(t.id as any)} style={{
            flex: 1, padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer",
            background: activeMainTab === t.id ? C.blue : "none",
            color: activeMainTab === t.id ? "#fff" : C.text,
            fontWeight: 600, fontSize: 13,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Team Overview (default) */}
      {activeMainTab === "overview" && <TeamOverviewDashboard />}

      {/* Check-in */}
      {activeMainTab === "checkin" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <PulseCard user={D.user} onResponded={() => setRefreshKey(k => k + 1)} />
          <MyScoreTrend user={D.user} />
          <FeedbackForm user={D.user} />
        </div>
      )}

      {/* Manager */}
      {activeMainTab === "manager" && mgr && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <TeamHealthDashboard user={D.user} />
          <MyScoreTrend user={D.user} />
        </div>
      )}
    </div>
  );
};

export default PeopleOSModule;
