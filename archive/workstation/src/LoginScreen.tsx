import { useState } from "react";

const API = "https://api.bc.pixdrift.com";

// ── Design tokens ────────────────────────────────────────────────────────
const T = {
  bg:        "#0A0A0F",
  surface:   "#111118",
  surface2:  "#18181F",
  border:    "rgba(255,255,255,0.08)",
  text:      "#FFFFFF",
  text2:     "#A1A1AA",
  text3:     "#52525B",
  accent:    "#6366F1",
  accentHi:  "#818CF8",
  green:     "#34C759",
  red:       "#FF3B30",
  font:      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
};

function PixdriftMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="96" fill="#0A0A0F"/>
      <rect x="140" y="120" width="80" height="80" rx="8" fill="#6366F1"/>
      <rect x="140" y="216" width="80" height="160" rx="8" fill="#6366F1"/>
      <rect x="236" y="120" width="136" height="80" rx="8" fill="#6366F1"/>
      <rect x="236" y="216" width="136" height="80" rx="8" fill="#818CF8"/>
      <rect x="340" y="316" width="32" height="32" rx="4" fill="#34C759"/>
    </svg>
  );
}

export default function LoginScreen({ onLogin }: { onLogin: (token: string, user: any) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [magicSent, setMagicSent] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const inputStyle = (field: string): React.CSSProperties => ({
    width: "100%",
    height: 48,
    padding: "0 14px",
    border: `1px solid ${focusedField === field ? T.accent : T.border}`,
    borderRadius: 10,
    fontSize: 16,
    color: T.text,
    background: T.surface2,
    fontFamily: T.font,
    outline: "none",
    transition: "border-color 0.15s",
    boxSizing: "border-box",
    caretColor: T.accentHi,
  });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "magic") {
        const res = await fetch(`${API}/api/auth/magic-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Kunde inte skicka länk");
        setMagicSent(true);
        return;
      }

      const SB_URL = import.meta.env.VITE_SUPABASE_URL || "";
      const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
      const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "apikey": SB_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || data.error || "Inloggningen misslyckades");

      const user = {
        id: data.user?.id,
        email: data.user?.email,
        role: data.user?.user_metadata?.role || "USER",
        full_name: data.user?.user_metadata?.full_name || data.user?.email?.split("@")[0],
      };
      localStorage.setItem("pixdrift_token", data.access_token);
      localStorage.setItem("pixdrift_user", JSON.stringify(user));
      onLogin(data.access_token, user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Magic link sent ─────────────────────────────────────────────────
  if (magicSent) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: T.font }}>
        <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 24 }}>📩</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 10, letterSpacing: "-0.03em" }}>Kolla din e-post</h2>
          <p style={{ fontSize: 15, color: T.text2, lineHeight: 1.6, marginBottom: 28 }}>
            Vi har skickat en inloggningslänk till<br />
            <span style={{ color: T.accentHi, fontWeight: 500 }}>{email}</span>
          </p>
          <button type="button" onClick={() => { setMagicSent(false); setMode("password"); }}
            style={{ background: "none", border: "none", color: T.accentHi, fontSize: 14, cursor: "pointer", fontFamily: T.font }}>
            ← Tillbaka
          </button>
        </div>
      </div>
    );
  }

  // ── Login form ──────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: T.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px 20px 40px",
      fontFamily: T.font,
      // Subtle radial glow behind the form
      backgroundImage: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99,102,241,0.10) 0%, transparent 70%)",
    }}>

      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* ── Brand ─────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <PixdriftMark />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: "-0.04em" }}>
            pixdrift
          </div>
          <div style={{ fontSize: 13, color: T.text3, marginTop: 4 }}>
            Operational Execution Platform
          </div>
        </div>

        {/* ── Card ──────────────────────────────────────────────── */}
        <div style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: "32px 28px",
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 24, letterSpacing: "-0.03em" }}>
            {mode === "password" ? "Sign in to your account" : "Sign in without password"}
          </h1>

          {/* Error */}
          {error && (
            <div style={{
              background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.3)",
              borderRadius: 10, padding: "12px 14px", marginBottom: 20,
              fontSize: 13, color: "#FF6B60", lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Email */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: T.text2, display: "block", marginBottom: 6, letterSpacing: "0.01em" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                style={inputStyle("email")}
              />
            </div>

            {/* Password */}
            {mode === "password" && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: T.text2, display: "block", marginBottom: 6, letterSpacing: "0.01em" }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  style={inputStyle("password")}
                />
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", height: 48, marginTop: 4,
                background: loading ? T.text3 : T.accent,
                color: "#fff", border: "none", borderRadius: 10,
                fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: T.font, letterSpacing: "-0.01em",
                transition: "background 0.15s, transform 0.1s",
                boxShadow: loading ? "none" : "0 0 0 0 rgba(99,102,241,0)",
              }}
              onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.background = T.accentHi; }}
              onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.background = T.accent; }}
            >
              {loading
                ? (mode === "magic" ? "Sending..." : "Signing in...")
                : (mode === "password" ? "Sign in →" : "Send magic link →")}
            </button>

          </form>

          {/* Toggle mode */}
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button type="button"
              onClick={() => { setMode(m => m === "password" ? "magic" : "password"); setError(""); }}
              style={{ background: "none", border: "none", color: T.text3, fontSize: 13, cursor: "pointer", fontFamily: T.font, transition: "color 0.15s" }}
              onMouseEnter={e => (e.target as HTMLElement).style.color = T.accentHi}
              onMouseLeave={e => (e.target as HTMLElement).style.color = T.text3}
            >
              {mode === "password" ? "Sign in without password →" : "← Use password instead"}
            </button>
          </div>

        </div>

        {/* ── Demo accounts ─────────────────────────────────────── */}
        <div style={{
          marginTop: 16,
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: "16px 20px",
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.text3, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            Demo environment
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Admin",           email: "admin@novacode.se",              role: "Admin" },
              { label: "Operations Lead", email: "opslead@lindqvistsverkstad.se",  role: "Ops Lead" },
              { label: "Mechanic",        email: "mekaniker@lindqvistsverkstad.se", role: "Technician" },
            ].map(demo => (
              <button key={demo.email} type="button"
                onClick={() => { setEmail(demo.email); setPassword("Demo2026!"); setMode("password"); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "7px 0", background: "none", border: "none",
                  textAlign: "left", cursor: "pointer", fontFamily: T.font,
                  borderRadius: 6, transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.surface2}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
              >
                <span style={{ fontSize: 13, color: T.text2 }}>{demo.label}</span>
                <span style={{ fontSize: 11, color: T.text3, fontFamily: "monospace" }}>{demo.email}</span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: T.text3, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
            Password: <span style={{ color: T.text2, fontFamily: "monospace" }}>Demo2026!</span>
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: T.text3 }}>
          <span>No account? </span>
          <a href="mailto:demo@pixdrift.com?subject=Access Request" style={{ color: T.accentHi, textDecoration: "none" }}>
            Request access →
          </a>
        </div>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: T.text3 }}>
          <a href="https://pixdrift.com/legal/privacy.html" style={{ color: T.text3 }}>Privacy</a>
          <span style={{ margin: "0 8px" }}>·</span>
          <a href="https://pixdrift.com/legal/terms.html" style={{ color: T.text3 }}>Terms</a>
          <span style={{ margin: "0 8px" }}>·</span>
          <a href="https://status.pixdrift.com" style={{ color: T.text3 }}>Status</a>
        </div>

      </div>
    </div>
  );
}
