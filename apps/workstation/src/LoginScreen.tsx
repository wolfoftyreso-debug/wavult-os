import { useState } from "react";

const API = "https://api.bc.pixdrift.com";

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  padding: "0 16px",
  border: "1px solid #D1D1D6",
  borderRadius: 10,
  fontSize: 16, // 16px förhindrar iOS-zoom
  color: "#000",
  background: "#fff",
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color 0.15s ease",
  boxSizing: "border-box",
};

// Pixdrift hexagon logo (SVG inline)
function PixdriftLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M24 4L42 14.5V33.5L24 44L6 33.5V14.5L24 4Z"
        fill="url(#logoGrad)"
      />
      <text x="24" y="29" textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff" fontFamily="-apple-system, sans-serif">p</text>
      <defs>
        <linearGradient id="logoGrad" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#007AFF" />
          <stop offset="1" stopColor="#5856D6" />
        </linearGradient>
      </defs>
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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "magic") {
        // Magic link — skicka OTP
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

      // Password login
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Inloggningen misslyckades");

      localStorage.setItem("pixdrift_token", data.access_token);
      localStorage.setItem("pixdrift_user", JSON.stringify(data.user));
      onLogin(data.access_token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Magic link skickat
  if (magicSent) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#F2F2F7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
      }}>
        <div style={{
          background: "#fff",
          borderRadius: 20,
          padding: "48px 40px",
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 2px 20px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, letterSpacing: "-0.02em" }}>
            Kolla din e-post
          </h2>
          <p style={{ fontSize: 14, color: "#8E8E93", marginBottom: 24, lineHeight: 1.5 }}>
            Vi har skickat en inloggningslänk till<br />
            <strong style={{ color: "#000" }}>{email}</strong>
          </p>
          <button
            type="button"
            onClick={() => { setMagicSent(false); setMode("password"); }}
            style={{
              background: "none",
              border: "none",
              color: "#007AFF",
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ← Tillbaka till inloggning
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F2F2F7",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: "48px 40px",
        width: "100%",
        maxWidth: 400,
        boxShadow: "0 2px 20px rgba(0,0,0,0.08)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <PixdriftLogo />
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#007AFF",
            marginTop: 8,
            letterSpacing: "-0.02em",
          }}>pixdrift</div>
        </div>

        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#000",
          textAlign: "center",
          marginBottom: 32,
          letterSpacing: "-0.03em",
        }}>
          Logga in på ditt konto
        </h1>

        {/* Felmeddelande */}
        {error && (
          <div style={{
            background: "#FF3B3010",
            border: "0.5px solid #FF3B30",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 20,
            fontSize: 13,
            color: "#FF3B30",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Email */}
          <div>
            <label style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#000",
              display: "block",
              marginBottom: 6,
            }}>
              E-postadress
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="namn@foretag.se"
              required
              autoComplete="email"
              style={inputStyle}
            />
          </div>

          {/* Lösenord */}
          {mode === "password" && (
            <div>
              <label style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#000",
                display: "block",
                marginBottom: 6,
              }}>
                Lösenord
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={inputStyle}
              />
            </div>
          )}

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: 50,
              background: loading ? "#8E8E93" : "#007AFF",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              marginTop: 8,
              transition: "background 0.15s ease",
            }}
          >
            {loading
              ? mode === "magic" ? "Skickar..." : "Loggar in..."
              : mode === "password"
                ? "Logga in"
                : "Skicka inloggningslänk"}
          </button>
        </form>

        {/* Byt mode — glömt lösenord / lösenordsfri */}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            type="button"
            onClick={() => { setMode(mode === "password" ? "magic" : "password"); setError(""); }}
            style={{
              background: "none",
              border: "none",
              color: "#007AFF",
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {mode === "password"
              ? "Logga in utan lösenord →"
              : "← Logga in med lösenord"}
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
          <div style={{ flex: 1, height: 0.5, background: "#D1D1D6" }} />
          <span style={{ fontSize: 12, color: "#8E8E93" }}>eller</span>
          <div style={{ flex: 1, height: 0.5, background: "#D1D1D6" }} />
        </div>

        {/* Demo-konton */}
        <div style={{
          background: "#F2F2F7",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 20,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#8E8E93",
            marginBottom: 8,
            letterSpacing: "0.06em",
          }}>TESTMILJÖ</div>
          {[
            { label: "Admin", email: "admin@novacode.se", password: "Demo2026!" },
            { label: "Säljare", email: "sales@novacode.se", password: "Demo2026!" },
          ].map(demo => (
            <button
              key={demo.label}
              type="button"
              onClick={() => {
                setEmail(demo.email);
                setPassword(demo.password);
                setMode("password");
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 0",
                background: "none",
                border: "none",
                textAlign: "left",
                fontSize: 13,
                color: "#007AFF",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              → {demo.label}: {demo.email}
            </button>
          ))}
        </div>

        {/* Registrering */}
        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: 14, color: "#8E8E93" }}>Har du inget konto? </span>
          <a
            href="/register"
            style={{
              fontSize: 14,
              color: "#007AFF",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Skapa ett →
          </a>
        </div>
      </div>
    </div>
  );
}
