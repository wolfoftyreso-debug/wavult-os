import { useState, useEffect, useRef } from "react";
import { useApi } from "./useApi";

// ─── Colour palette (samma som Dashboard) ────────────────────────────────────
const C = {
  bg: "#F5F5F7", card: "#FFFFFF", border: "#E5E5EA", text: "#1D1D1F",
  sec: "#86868B", tert: "#AEAEB2", blue: "#007AFF", green: "#34C759",
  yellow: "#FF9500", red: "#FF3B30", fill: "#F2F2F7", purple: "#AF52DE",
  orange: "#FF9500", indigo: "#5856D6", teal: "#5AC8FA",
};
const shadow = "0 1px 3px rgba(0,0,0,0.06)";
const API = "https://api.bc.pixdrift.com";

// ─── UI Primitives ────────────────────────────────────────────────────────────
const Card = ({ title, children, style: st }: { title?: string; children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.card, borderRadius: 12, padding: "20px 24px", boxShadow: shadow, ...st }}>
    {title && <div style={{ fontSize: 13, fontWeight: 600, color: C.sec, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</div>}
    {children}
  </div>
);

const Badge = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span style={{ background: color + "18", color, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{children}</span>
);

const Bar = ({ pct, color = C.blue, height = 6 }: { pct: number; color?: string; height?: number }) => (
  <div style={{ flex: 1, height, background: C.fill, borderRadius: 4, overflow: "hidden" }}>
    <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, background: color, borderRadius: 4, transition: "width 0.4s ease" }} />
  </div>
);

const Row = ({ children, border = true, onClick }: { children: React.ReactNode; border?: boolean; onClick?: () => void }) => (
  <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: border ? `0.5px solid ${C.border}` : "none", cursor: onClick ? "pointer" : "default" }}>{children}</div>
);

const Btn = ({ label, onClick, color = C.blue, outline = false }: { label: string; onClick?: () => void; color?: string; outline?: boolean }) => (
  <button onClick={onClick} style={{ background: outline ? "transparent" : color, color: outline ? color : "#FFF", border: `1.5px solid ${color}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{label}</button>
);

const diffColor = (d: string) => d === "beginner" ? C.green : d === "intermediate" ? C.yellow : C.red;
const diffLabel = (d: string) => d === "beginner" ? "Nybörjare" : d === "intermediate" ? "Medel" : "Avancerad";
const catColor: Record<string, string> = { onboarding: C.blue, process: C.purple, compliance: C.orange, technical: C.teal, sales: C.green, hr: C.indigo };
const catLabel: Record<string, string> = { onboarding: "Onboarding", process: "Process", compliance: "Compliance", technical: "Teknisk", sales: "Sälj", hr: "HR" };

// ─── Simple markdown renderer ─────────────────────────────────────────────────
const Markdown = ({ content }: { content: string }) => {
  if (!content) return null;
  const lines = content.split("\n");
  return (
    <div style={{ lineHeight: 1.7, fontSize: 14, color: C.text }}>
      {lines.map((line, i) => {
        if (line.startsWith("# ")) return <h1 key={i} style={{ fontSize: 20, fontWeight: 700, margin: "16px 0 8px" }}>{line.slice(2)}</h1>;
        if (line.startsWith("## ")) return <h2 key={i} style={{ fontSize: 16, fontWeight: 600, margin: "14px 0 6px", color: C.text }}>{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={i} style={{ fontSize: 14, fontWeight: 600, margin: "10px 0 4px" }}>{line.slice(4)}</h3>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <div key={i} style={{ paddingLeft: 16, marginBottom: 4 }}>• {line.slice(2)}</div>;
        if (line.startsWith("[ ] ") || line.startsWith("[x] ")) return <div key={i} style={{ paddingLeft: 16, marginBottom: 4 }}>{line.startsWith("[x]") ? "☑" : "☐"} {line.slice(4)}</div>;
        if (/^\d+\. /.test(line)) return <div key={i} style={{ paddingLeft: 16, marginBottom: 4 }}>{line}</div>;
        if (line === "") return <br key={i} />;
        // Bold
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return <p key={i} style={{ margin: "4px 0" }}>{parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}</p>;
      })}
    </div>
  );
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color = C.blue }: { icon: string; label: string; value: string | number; color?: string }) => (
  <div style={{ background: C.card, borderRadius: 12, padding: "18px 20px", boxShadow: shadow }}>
    <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: 12, color: C.sec, marginTop: 4 }}>{label}</div>
  </div>
);

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Playbook { id: string; title: string; description: string; category: string; status: string; version: number; playbook_steps?: Step[] }
interface Step { id: string; step_number: number; title: string; content: string; media_url?: string; estimated_minutes: number; required: boolean }
interface Article { id: string; title: string; category: string; tags: string[]; views: number; helpful_votes: number; updated_at: string; content?: string }
interface Course { id: string; title: string; description: string; difficulty: string; duration_minutes: number; passing_score: number; course_modules?: Module[] }
interface Module { id: string; module_number: number; title: string; content_type: string; content_id?: string; duration_minutes: number; content_text?: string }
interface Progress { content_id: string; content_type: string; status: string; score?: number; completed_at?: string }
interface Certificate { id: string; course_id: string; issued_at: string; expires_at?: string; certificate_url?: string; courses?: { title: string } }
interface ExtCert { id: string; name: string; issuer: string; expiry_date: string; issued_date: string; certificate_number?: string }
interface QuizResult { score: number; passed: boolean; correct: number; total: number; results: QuizAnswer[] }
interface QuizAnswer { question: string; user_answer: number; correct_index: number; correct: boolean; explanation: string }
interface QuizData { quiz_id: string; title: string; questions: { question: string; options: string[] }[]; passing_score: number; time_limit_minutes?: number }

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN LEARNING MODULE
// ═══════════════════════════════════════════════════════════════════════════════
export default function LearningModule({ user }: { user?: { id?: string; role?: string; full_name?: string } }) {
  const [tab, setTab] = useState<"home" | "playbooks" | "wiki" | "courses" | "certs" | "admin">("home");

  const tabs = [
    { id: "home", label: "Översikt" },
    { id: "playbooks", label: "Playbooks" },
    { id: "wiki", label: "Kunskapsbas" },
    { id: "courses", label: "Kurser" },
    { id: "certs", label: "Certifieringar" },
    ...(user?.role === "ADMIN" ? [{ id: "admin", label: "Admin" }] : []),
  ] as const;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "-apple-system, 'SF Pro Display', sans-serif", color: C.text }}>
      {/* Sub-navigation */}
      <div style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)", borderBottom: `0.5px solid ${C.border}`, position: "sticky", top: 52, zIndex: 90 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px", display: "flex", gap: 2 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} style={{ background: "none", border: "none", color: tab === t.id ? C.blue : C.sec, fontSize: 13, fontWeight: tab === t.id ? 600 : 400, cursor: "pointer", padding: "12px 16px", borderBottom: tab === t.id ? `2px solid ${C.blue}` : "2px solid transparent" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 20px 60px" }}>
        {tab === "home" && <HomeView user={user} />}
        {tab === "playbooks" && <PlaybooksView user={user} />}
        {tab === "wiki" && <WikiView user={user} />}
        {tab === "courses" && <CoursesView user={user} />}
        {tab === "certs" && <CertsView user={user} />}
        {tab === "admin" && <AdminView user={user} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOME VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function HomeView({ user }: { user?: any }) {
  const { data: progress } = useApi<Progress[]>(`/api/learning/progress/${user?.id || "me"}`);
  const { data: courses } = useApi<Course[]>("/api/learning/courses");
  const { data: team } = useApi<{ team: any[] }>("/api/learning/team-progress");
  const { data: certs } = useApi<Certificate[]>("/api/learning/certificates");

  const completed = (progress || []).filter(p => p.status === "completed").length;
  const inProgress = (progress || []).filter(p => p.status === "in_progress").length;
  const totalTime = 0; // could sum from progress records

  const inProgressCourses = (courses || []).filter(c =>
    (progress || []).some(p => p.content_id === c.id && p.status === "in_progress")
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatCard icon="🎓" label="Slutförda kurser" value={completed} color={C.green} />
        <StatCard icon="📚" label="Pågående" value={inProgress} color={C.blue} />
        <StatCard icon="🏆" label="Certifikat" value={(certs || []).length} color={C.purple} />
        <StatCard icon="⏱" label="Tim investerad" value={`${totalTime}h`} color={C.orange} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        {/* Min inlärning */}
        <Card title="Min inlärning">
          {inProgressCourses.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: C.tert }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
              <div>Inga pågående kurser</div>
            </div>
          )}
          {inProgressCourses.map((c, i) => {
            const p = (progress || []).find(p => p.content_id === c.id);
            const pct = p?.status === "completed" ? 100 : 35; // placeholder
            return (
              <Row key={c.id} border={i < inProgressCourses.length - 1}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: C.fill, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📘</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <Bar pct={pct} color={C.blue} />
                    <span style={{ fontSize: 12, color: C.sec, minWidth: 32 }}>{pct}%</span>
                  </div>
                </div>
                <Badge color={diffColor(c.difficulty)}>{diffLabel(c.difficulty)}</Badge>
              </Row>
            );
          })}
        </Card>

        {/* Teamets status */}
        <Card title="Teamets status">
          {(team?.team || []).slice(0, 6).map((m: any, i: number) => (
            <Row key={i} border={i < Math.min(5, (team?.team || []).length - 1)}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.fill, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600 }}>{(m.full_name || "?")[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{m.full_name || "Okänd"}</div>
                <div style={{ fontSize: 11, color: C.sec }}>{m.role}</div>
              </div>
              <Badge color={m.completed >= 3 ? C.green : m.completed >= 1 ? C.yellow : C.red}>{m.completed} klara</Badge>
            </Row>
          ))}
          {(team?.team || []).length === 0 && <div style={{ color: C.tert, textAlign: "center", padding: "20px 0" }}>Ingen data</div>}
        </Card>
      </div>

      {/* Rekommenderat */}
      <Card title="Rekommenderat för dig">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {(courses || []).slice(0, 3).map(c => (
            <div key={c.id} style={{ background: C.fill, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📗</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: C.sec, marginBottom: 12 }}>{c.duration_minutes} min · <Badge color={diffColor(c.difficulty)}>{diffLabel(c.difficulty)}</Badge></div>
              <Btn label="Starta kurs" color={C.blue} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYBOOKS VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function PlaybooksView({ user }: { user?: any }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [selected, setSelected] = useState<Playbook | null>(null);
  const [stepsDone, setStepsDone] = useState<Set<string>>(new Set());
  const { data: playbooks } = useApi<Playbook[]>(`/api/learning/playbooks${catFilter !== "all" ? `?category=${catFilter}` : ""}`);

  const filtered = (playbooks || []).filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
  const categories = ["all", "onboarding", "process", "compliance", "technical", "sales", "hr"];

  if (selected) {
    const steps = selected.playbook_steps || [];
    const donePct = steps.length > 0 ? Math.round((stepsDone.size / steps.length) * 100) : 0;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: C.blue, fontSize: 14, cursor: "pointer" }}>← Tillbaka</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{selected.title}</div>
            <div style={{ fontSize: 13, color: C.sec, marginTop: 2 }}>{selected.description}</div>
          </div>
          <Badge color={catColor[selected.category] || C.blue}>{catLabel[selected.category] || selected.category}</Badge>
          <Badge color={selected.status === "published" ? C.green : C.yellow}>v{selected.version}</Badge>
        </div>

        {/* Progress bar */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Framsteg</span>
                <span style={{ fontSize: 13, color: C.sec }}>{stepsDone.size}/{steps.length} steg</span>
              </div>
              <Bar pct={donePct} color={donePct === 100 ? C.green : C.blue} height={10} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: donePct === 100 ? C.green : C.blue }}>{donePct}%</div>
          </div>
        </Card>

        {/* Steps */}
        {steps.map((step, i) => {
          const done = stepsDone.has(step.id);
          return (
            <Card key={step.id} style={{ borderLeft: `4px solid ${done ? C.green : C.blue}` }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: done ? C.green : C.fill, color: done ? "#FFF" : C.sec, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                  {done ? "✓" : step.step_number}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{step.title}</div>
                  {step.content && <Markdown content={step.content} />}
                  {step.media_url && (
                    <div style={{ marginTop: 16, background: C.fill, borderRadius: 8, padding: 16, textAlign: "center", color: C.sec }}>
                      🎬 Media: <a href={step.media_url} target="_blank" rel="noreferrer" style={{ color: C.blue }}>{step.media_url}</a>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
                    <span style={{ fontSize: 12, color: C.tert }}>⏱ {step.estimated_minutes} min{step.required ? " · Obligatorisk" : ""}</span>
                    <Btn label={done ? "✓ Klar" : "Markera klart"} color={done ? C.green : C.blue} onClick={() => {
                      const next = new Set(stepsDone);
                      if (done) next.delete(step.id); else next.add(step.id);
                      setStepsDone(next);
                    }} />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Search & filters */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Sök playbook..." style={{ flex: 1, background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: C.text, outline: "none", boxShadow: shadow }} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)} style={{ background: catFilter === cat ? (catColor[cat] || C.blue) : C.card, color: catFilter === cat ? "#FFF" : C.sec, border: `0.5px solid ${catFilter === cat ? "transparent" : C.border}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
            {cat === "all" ? "Alla" : catLabel[cat] || cat}
          </button>
        ))}
      </div>

      {/* Playbook grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {filtered.map(pb => (
          <div key={pb.id} onClick={() => setSelected(pb)} style={{ background: C.card, borderRadius: 12, padding: 20, boxShadow: shadow, cursor: "pointer", transition: "box-shadow 0.2s", borderLeft: `4px solid ${catColor[pb.category] || C.blue}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Badge color={catColor[pb.category] || C.blue}>{catLabel[pb.category] || pb.category}</Badge>
              <Badge color={pb.status === "published" ? C.green : C.yellow}>{pb.status === "published" ? "Publicerad" : "Utkast"}</Badge>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{pb.title}</div>
            <div style={{ fontSize: 13, color: C.sec, marginBottom: 12 }}>{pb.description}</div>
            <div style={{ fontSize: 12, color: C.tert }}>Version {pb.version}</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 0", color: C.tert }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div>Inga playbooks hittades</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WIKI VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function WikiView({ user }: { user?: any }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [selected, setSelected] = useState<Article | null>(null);
  const [voted, setVoted] = useState(false);
  const { data: articles } = useApi<Article[]>(`/api/learning/articles${search ? `?q=${encodeURIComponent(search)}` : ""}`);

  const categories = [...new Set((articles || []).map(a => a.category).filter(Boolean))];
  const filtered = (articles || []).filter(a => catFilter === "all" || a.category === catFilter);

  if (selected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => { setSelected(null); setVoted(false); }} style={{ background: "none", border: "none", color: C.blue, fontSize: 14, cursor: "pointer" }}>← Tillbaka</button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{selected.title}</h1>
          </div>
        </div>
        <Card>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {selected.category && <Badge color={C.blue}>{selected.category}</Badge>}
            {(selected.tags || []).map(t => <Badge key={t} color={C.tert}>{t}</Badge>)}
            <span style={{ fontSize: 12, color: C.tert, marginLeft: "auto" }}>Uppdaterad: {new Date(selected.updated_at).toLocaleDateString("sv-SE")} · {selected.views} visningar</span>
          </div>
          <Markdown content={selected.content || ""} />

          {/* Helpful votes */}
          {!voted ? (
            <div style={{ marginTop: 32, padding: "16px 0", borderTop: `0.5px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 14, color: C.sec }}>Var detta till hjälp?</span>
              <button onClick={() => { setVoted(true); fetch(`${API}/api/learning/articles/${selected.id}/vote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ helpful: true }) }); }} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer" }}>👍</button>
              <button onClick={() => setVoted(true)} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer" }}>👎</button>
            </div>
          ) : (
            <div style={{ marginTop: 32, padding: "16px 0", borderTop: `0.5px solid ${C.border}`, color: C.green, fontSize: 14 }}>✓ Tack för din feedback!</div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Big search box */}
      <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Kunskapsbas</div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Sök i hela kunskapsbasen..." style={{ width: "100%", maxWidth: 600, background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "14px 20px", fontSize: 16, color: C.text, outline: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }} />
      </div>

      {/* Category chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {["all", ...categories].map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)} style={{ background: catFilter === cat ? C.blue : C.card, color: catFilter === cat ? "#FFF" : C.sec, border: `0.5px solid ${catFilter === cat ? "transparent" : C.border}`, borderRadius: 20, padding: "6px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
            {cat === "all" ? "Alla kategorier" : cat}
          </button>
        ))}
        {user?.role === "ADMIN" && <Btn label="+ Skapa artikel" color={C.blue} />}
      </div>

      {/* Article list */}
      <Card>
        {filtered.map((a, i) => (
          <Row key={a.id} border={i < filtered.length - 1} onClick={() => setSelected(a)}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: C.fill, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📄</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                {a.category && <Badge color={C.blue}>{a.category}</Badge>}
                {(a.tags || []).slice(0, 3).map(t => <Badge key={t} color={C.tert}>{t}</Badge>)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: C.tert }}>{new Date(a.updated_at).toLocaleDateString("sv-SE")}</div>
              <div style={{ fontSize: 12, color: C.tert, marginTop: 2 }}>{a.views} visningar</div>
            </div>
          </Row>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.tert }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div>Inga artiklar hittades</div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COURSES VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function CoursesView({ user }: { user?: any }) {
  const [selected, setSelected] = useState<Course | null>(null);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showCert, setShowCert] = useState(false);
  const { data: courses } = useApi<Course[]>("/api/learning/courses");
  const { data: progress } = useApi<Progress[]>(`/api/learning/progress/${user?.id || "me"}`);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer for quiz
  useEffect(() => {
    if (quiz && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [quiz, timeLeft]);

  const startQuiz = async (quizId: string) => {
    const res = await fetch(`${API}/api/learning/quizzes/${quizId}/attempt`, { method: "POST" });
    const data = await res.json();
    setQuiz(data);
    setQuizAnswers(new Array(data.questions.length).fill(-1));
    setQuizResult(null);
    setTimeLeft(data.time_limit_minutes ? data.time_limit_minutes * 60 : 0);
  };

  const submitQuiz = async () => {
    if (!quiz) return;
    const res = await fetch(`${API}/api/learning/quizzes/${quiz.quiz_id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: quizAnswers }),
    });
    const result: QuizResult = await res.json();
    setQuizResult(result);
    if (result.passed && selected) setShowCert(true);
  };

  // Quiz view
  if (quiz && !quizResult) {
    const answered = quizAnswers.filter(a => a >= 0).length;
    return (
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Card title={quiz.title}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <span style={{ fontSize: 13, color: C.sec }}>{answered}/{quiz.questions.length} besvarade</span>
            {timeLeft > 0 && <Badge color={timeLeft < 60 ? C.red : C.orange}>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}</Badge>}
          </div>
          <Bar pct={(answered / quiz.questions.length) * 100} height={4} />
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 32 }}>
            {quiz.questions.map((q, qi) => (
              <div key={qi}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{qi + 1}. {q.question}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {q.options.map((opt, oi) => (
                    <button key={oi} onClick={() => {
                      const next = [...quizAnswers];
                      next[qi] = oi;
                      setQuizAnswers(next);
                    }} style={{ background: quizAnswers[qi] === oi ? C.blue + "18" : C.fill, border: `1.5px solid ${quizAnswers[qi] === oi ? C.blue : "transparent"}`, borderRadius: 10, padding: "12px 16px", fontSize: 14, textAlign: "left", cursor: "pointer", color: C.text, transition: "all 0.15s" }}>
                      {String.fromCharCode(65 + oi)}. {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
            <Btn label="← Avbryt" color={C.sec} outline onClick={() => { setQuiz(null); setQuizAnswers([]); }} />
            <div style={{ flex: 1 }} />
            <Btn label={`Skicka svar (${answered}/${quiz.questions.length})`} onClick={submitQuiz} color={answered === quiz.questions.length ? C.blue : C.tert} />
          </div>
        </Card>
      </div>
    );
  }

  // Quiz result
  if (quizResult) {
    if (showCert) {
      return (
        <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
          <Card>
            <div style={{ fontSize: 64, marginBottom: 16, animation: "bounce 0.6s" }}>🏆</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.green, marginBottom: 8 }}>Grattis!</div>
            <div style={{ fontSize: 16, color: C.sec, marginBottom: 20 }}>Du har klarat kursen!</div>
            <div style={{ background: C.fill, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
              <div style={{ fontSize: 40, fontWeight: 700, color: C.green }}>{quizResult.score}%</div>
              <div style={{ fontSize: 14, color: C.sec }}>{quizResult.correct}/{quizResult.total} rätta svar</div>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Btn label="Ladda ner certifikat" color={C.blue} />
              <Btn label="← Tillbaka" color={C.sec} outline onClick={() => { setQuizResult(null); setQuiz(null); setShowCert(false); }} />
            </div>
          </Card>
        </div>
      );
    }
    return (
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Card title="Resultat">
          <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
            <div style={{ flex: 1, background: (quizResult.passed ? C.green : C.red) + "12", borderRadius: 10, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: quizResult.passed ? C.green : C.red }}>{quizResult.score}%</div>
              <div style={{ fontSize: 14, color: C.sec, marginTop: 4 }}>{quizResult.passed ? "✓ Godkänd" : "✕ Inte godkänd"}</div>
            </div>
            <div style={{ flex: 1, background: C.fill, borderRadius: 10, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 700 }}>{quizResult.correct}/{quizResult.total}</div>
              <div style={{ fontSize: 14, color: C.sec, marginTop: 4 }}>Rätta svar</div>
            </div>
          </div>
          {quizResult.results.map((r, i) => (
            <div key={i} style={{ background: r.correct ? C.green + "10" : C.red + "10", borderRadius: 10, padding: 16, marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{i + 1}. {r.question}</div>
              <div style={{ fontSize: 13, color: r.correct ? C.green : C.red }}>{r.correct ? "✓ Korrekt" : `✕ Ditt svar: alt. ${String.fromCharCode(65 + (r.user_answer ?? 0))}, rätt: alt. ${String.fromCharCode(65 + r.correct_index)}`}</div>
              {r.explanation && <div style={{ fontSize: 12, color: C.sec, marginTop: 6 }}>{r.explanation}</div>}
            </div>
          ))}
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <Btn label="Försök igen" onClick={() => { setQuizResult(null); if (quiz) startQuiz(quiz.quiz_id); }} color={C.blue} outline />
            <Btn label="← Tillbaka till kursen" onClick={() => { setQuizResult(null); setQuiz(null); }} color={C.sec} outline />
          </div>
        </Card>
      </div>
    );
  }

  // Module view
  if (activeModule) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setActiveModule(null)} style={{ background: "none", border: "none", color: C.blue, fontSize: 14, cursor: "pointer" }}>← Tillbaka</button>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{activeModule.title}</div>
          <Badge color={C.blue}>{activeModule.content_type}</Badge>
        </div>

        {activeModule.content_type === "video" && (
          <Card>
            <div style={{ background: "#000", borderRadius: 10, height: 360, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontSize: 48, marginBottom: 16 }}>▶</div>
            <div style={{ fontSize: 13, color: C.tert, textAlign: "center" }}>Videoplaceholder — redo för iframe/embed-integration</div>
          </Card>
        )}

        {activeModule.content_text && (
          <Card><Markdown content={activeModule.content_text} /></Card>
        )}

        {activeModule.content_type === "quiz" && activeModule.content_id && (
          <Card style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Dags att testa dina kunskaper!</div>
            <div style={{ fontSize: 13, color: C.sec, marginBottom: 20 }}>Genomför quizet för att slutföra modulen</div>
            <Btn label="Starta quiz" onClick={() => startQuiz(activeModule.content_id!)} color={C.blue} />
          </Card>
        )}

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Btn label="← Föregående" color={C.sec} outline />
          <Btn label="Markera klart & Nästa →" color={C.blue} onClick={() => setActiveModule(null)} />
        </div>
      </div>
    );
  }

  // Course detail
  if (selected) {
    const modules = selected.course_modules || [];
    const prog = (progress || []).find(p => p.content_id === selected.id);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: C.blue, fontSize: 14, cursor: "pointer" }}>← Tillbaka</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{selected.title}</div>
            <div style={{ fontSize: 14, color: C.sec, marginTop: 4 }}>{selected.description}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Badge color={diffColor(selected.difficulty)}>{diffLabel(selected.difficulty)}</Badge>
              <Badge color={C.tert}>{selected.duration_minutes} min</Badge>
              <Badge color={C.purple}>Godkänt: {selected.passing_score}%</Badge>
            </div>
          </div>
          <Btn label="Starta kurs" color={C.blue} />
        </div>

        <Card title="Moduler">
          {modules.map((mod, i) => (
            <Row key={mod.id} border={i < modules.length - 1} onClick={() => setActiveModule(mod)}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.fill, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                {mod.content_type === "video" ? "🎬" : mod.content_type === "quiz" ? "📝" : mod.content_type === "playbook" ? "📋" : "📄"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{mod.module_number}. {mod.title}</div>
                <div style={{ fontSize: 12, color: C.sec, marginTop: 2 }}>{mod.duration_minutes} min</div>
              </div>
              <Badge color={C.tert}>{mod.content_type}</Badge>
            </Row>
          ))}
        </Card>
      </div>
    );
  }

  // Course list
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {(courses || []).map(c => {
          const prog = (progress || []).find(p => p.content_id === c.id);
          const pct = prog?.status === "completed" ? 100 : prog?.status === "in_progress" ? 45 : 0;
          return (
            <div key={c.id} onClick={() => setSelected(c)} style={{ background: C.card, borderRadius: 12, overflow: "hidden", boxShadow: shadow, cursor: "pointer" }}>
              {/* Thumbnail placeholder */}
              <div style={{ height: 140, background: `linear-gradient(135deg, ${diffColor(c.difficulty)}22, ${C.blue}22)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>📚</div>
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: C.sec, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.description}</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  <Badge color={diffColor(c.difficulty)}>{diffLabel(c.difficulty)}</Badge>
                  <Badge color={C.tert}>{c.duration_minutes} min</Badge>
                </div>
                {pct > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Bar pct={pct} />
                    <span style={{ fontSize: 12, color: C.sec }}>{pct}%</span>
                  </div>
                )}
                {pct === 0 && <Btn label="Börja kurs" color={C.blue} />}
              </div>
            </div>
          );
        })}
        {(courses || []).length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 0", color: C.tert }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
            <div>Inga kurser tillgängliga</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CERTS VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function CertsView({ user }: { user?: any }) {
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({ name: "", issuer: "", issued_date: "", expiry_date: "", certificate_number: "" });
  const { data: certs } = useApi<Certificate[]>("/api/learning/certificates");
  const { data: extCerts } = useApi<ExtCert[]>("/api/learning/certifications");
  const { data: expiring } = useApi<ExtCert[]>("/api/learning/certifications/expiring");

  const today = new Date();
  const daysUntil = (d: string) => Math.round((new Date(d).getTime() - today.getTime()) / 86400000);

  const submitExt = async () => {
    await fetch(`${API}/api/learning/certifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowUpload(false);
    setForm({ name: "", issuer: "", issued_date: "", expiry_date: "", certificate_number: "" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Expiring alert */}
      {(expiring || []).length > 0 && (
        <div style={{ background: C.red + "12", border: `1px solid ${C.red}30`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 600, color: C.red }}>{expiring!.length} certifikat utgår snart</div>
            <div style={{ fontSize: 13, color: C.sec }}>{(expiring || []).map(e => e.name).join(", ")}</div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Interna certifikat */}
        <Card title="Mina kurscertifikat">
          {(certs || []).map((c, i) => {
            const expired = c.expires_at && new Date(c.expires_at) < today;
            const days = c.expires_at ? daysUntil(c.expires_at) : null;
            return (
              <Row key={c.id} border={i < (certs || []).length - 1}>
                <div style={{ fontSize: 28 }}>🏅</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.courses?.title || "Kurs"}</div>
                  <div style={{ fontSize: 12, color: C.sec }}>Utfärdat: {new Date(c.issued_at).toLocaleDateString("sv-SE")}</div>
                  {days !== null && <div style={{ fontSize: 12, color: days < 30 ? C.red : C.tert }}>Utgår om {days} dagar</div>}
                </div>
                {expired ? <Badge color={C.red}>Utgånget</Badge> : <Badge color={C.green}>Giltigt</Badge>}
                {c.certificate_url && <button onClick={() => window.open(c.certificate_url, "_blank")} style={{ background: "none", border: `1px solid ${C.blue}`, borderRadius: 6, padding: "4px 10px", color: C.blue, fontSize: 12, cursor: "pointer" }}>↓ Ladda ner</button>}
              </Row>
            );
          })}
          {(certs || []).length === 0 && <div style={{ textAlign: "center", padding: "30px 0", color: C.tert }}>Inga certifikat än</div>}
        </Card>

        {/* Externa certifieringar */}
        <Card title="Externa certifieringar">
          <div style={{ marginBottom: 16 }}>
            <Btn label="+ Ladda upp certifikat" color={C.blue} onClick={() => setShowUpload(!showUpload)} />
          </div>
          {showUpload && (
            <div style={{ background: C.fill, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              {[
                { k: "name", ph: "Certifieringsnamn", label: "Namn *" },
                { k: "issuer", ph: "t.ex. ISO, AWS, Google", label: "Utfärdare" },
                { k: "issued_date", ph: "ÅÅÅÅ-MM-DD", label: "Utfärdandedatum" },
                { k: "expiry_date", ph: "ÅÅÅÅ-MM-DD", label: "Utgångsdatum" },
                { k: "certificate_number", ph: "Certifikatnummer", label: "Certifikatnummer" },
              ].map(f => (
                <div key={f.k} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: C.sec, marginBottom: 4 }}>{f.label}</div>
                  <input value={(form as any)[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} placeholder={f.ph} style={{ width: "100%", background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.text, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ display: "flex", gap: 8 }}>
                <Btn label="Spara" onClick={submitExt} color={C.green} />
                <Btn label="Avbryt" onClick={() => setShowUpload(false)} color={C.sec} outline />
              </div>
            </div>
          )}
          {(extCerts || []).map((c, i) => {
            const days = c.expiry_date ? daysUntil(c.expiry_date) : null;
            const expiringSoon = days !== null && days < 30;
            return (
              <Row key={c.id} border={i < (extCerts || []).length - 1}>
                <div style={{ fontSize: 28 }}>📜</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: C.sec }}>{c.issuer} · {c.issued_date}</div>
                  {days !== null && <div style={{ fontSize: 12, color: expiringSoon ? C.red : C.tert }}>Utgår: {c.expiry_date} {expiringSoon && `(${days} dagar)`}</div>}
                </div>
                {expiringSoon ? <Badge color={C.red}>Snart</Badge> : <Badge color={C.green}>Giltigt</Badge>}
              </Row>
            );
          })}
          {(extCerts || []).length === 0 && !showUpload && <div style={{ textAlign: "center", padding: "20px 0", color: C.tert }}>Inga externa certifieringar</div>}
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function AdminView({ user }: { user?: any }) {
  const { data: courses } = useApi<Course[]>("/api/learning/courses");
  const { data: playbooks } = useApi<Playbook[]>("/api/learning/playbooks");
  const { data: team } = useApi<{ team: any[] }>("/api/learning/team-progress");
  const [filter, setFilter] = useState("");
  const [newPlaybook, setNewPlaybook] = useState({ title: "", description: "", category: "onboarding" });
  const [newCourse, setNewCourse] = useState({ title: "", description: "", difficulty: "beginner" });
  const [showPbForm, setShowPbForm] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);

  const createPlaybook = async () => {
    await fetch(`${API}/api/learning/playbooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPlaybook),
    });
    setShowPbForm(false);
  };

  const createCourse = async () => {
    await fetch(`${API}/api/learning/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCourse),
    });
    setShowCourseForm(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatCard icon="📋" label="Playbooks" value={(playbooks || []).length} color={C.purple} />
        <StatCard icon="🎓" label="Kurser" value={(courses || []).length} color={C.blue} />
        <StatCard icon="👥" label="Teammedlemmar" value={(team?.team || []).length} color={C.green} />
        <StatCard icon="✅" label="Totalt klara" value={(team?.team || []).reduce((s: number, m: any) => s + m.completed, 0)} color={C.orange} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Skapa playbook */}
        <Card title="Playbooks">
          <Btn label="+ Skapa playbook" color={C.blue} onClick={() => setShowPbForm(!showPbForm)} />
          {showPbForm && (
            <div style={{ background: C.fill, borderRadius: 10, padding: 16, marginTop: 12 }}>
              {[{ k: "title", ph: "Titel *" }, { k: "description", ph: "Beskrivning" }].map(f => (
                <input key={f.k} value={(newPlaybook as any)[f.k]} onChange={e => setNewPlaybook({ ...newPlaybook, [f.k]: e.target.value })} placeholder={f.ph} style={{ width: "100%", background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 10, color: C.text, outline: "none", boxSizing: "border-box" }} />
              ))}
              <select value={newPlaybook.category} onChange={e => setNewPlaybook({ ...newPlaybook, category: e.target.value })} style={{ width: "100%", background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 10, color: C.text, outline: "none" }}>
                {["onboarding", "process", "compliance", "technical", "sales", "hr"].map(c => <option key={c} value={c}>{catLabel[c]}</option>)}
              </select>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn label="Skapa" onClick={createPlaybook} color={C.green} />
                <Btn label="Avbryt" onClick={() => setShowPbForm(false)} color={C.sec} outline />
              </div>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            {(playbooks || []).slice(0, 5).map((p, i) => (
              <Row key={p.id} border={i < 4}>
                <div style={{ flex: 1, fontSize: 14 }}>{p.title}</div>
                <Badge color={catColor[p.category] || C.blue}>{catLabel[p.category] || p.category}</Badge>
                <Badge color={p.status === "published" ? C.green : C.yellow}>{p.status}</Badge>
              </Row>
            ))}
          </div>
        </Card>

        {/* Teamöversikt med filtrering */}
        <Card title="Teamöversikt">
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrera på namn eller roll..." style={{ width: "100%", background: C.fill, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12, color: C.text, outline: "none", boxSizing: "border-box" }} />
          {(team?.team || []).filter((m: any) => !filter || (m.full_name || "").toLowerCase().includes(filter.toLowerCase()) || (m.role || "").toLowerCase().includes(filter.toLowerCase())).map((m: any, i: number, arr: any[]) => (
            <Row key={i} border={i < arr.length - 1}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.fill, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600 }}>{(m.full_name || "?")[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{m.full_name || "Okänd"}</div>
                <div style={{ fontSize: 12, color: C.sec }}>{m.role}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.green }}>{m.completed} klara</div>
                <div style={{ fontSize: 12, color: C.tert }}>{m.total_time || 0} min</div>
              </div>
            </Row>
          ))}
          {(team?.team || []).length === 0 && <div style={{ textAlign: "center", padding: "20px 0", color: C.tert }}>Ingen data</div>}
        </Card>
      </div>

      {/* Skapa kurs */}
      <Card title="Kurser">
        <Btn label="+ Skapa kurs" color={C.blue} onClick={() => setShowCourseForm(!showCourseForm)} />
        {showCourseForm && (
          <div style={{ background: C.fill, borderRadius: 10, padding: 16, marginTop: 12, maxWidth: 400 }}>
            {[{ k: "title", ph: "Kursnamn *" }, { k: "description", ph: "Beskrivning" }].map(f => (
              <input key={f.k} value={(newCourse as any)[f.k]} onChange={e => setNewCourse({ ...newCourse, [f.k]: e.target.value })} placeholder={f.ph} style={{ width: "100%", background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 10, color: C.text, outline: "none", boxSizing: "border-box" }} />
            ))}
            <select value={newCourse.difficulty} onChange={e => setNewCourse({ ...newCourse, difficulty: e.target.value })} style={{ width: "100%", background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 10, color: C.text, outline: "none" }}>
              <option value="beginner">Nybörjare</option>
              <option value="intermediate">Medel</option>
              <option value="advanced">Avancerad</option>
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn label="Skapa" onClick={createCourse} color={C.green} />
              <Btn label="Avbryt" onClick={() => setShowCourseForm(false)} color={C.sec} outline />
            </div>
          </div>
        )}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {(courses || []).map(c => (
            <div key={c.id} style={{ background: C.fill, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
              <Badge color={diffColor(c.difficulty)}>{diffLabel(c.difficulty)}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
