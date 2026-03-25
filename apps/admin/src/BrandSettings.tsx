import { useState, useRef, useEffect } from "react";

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
  inset:     "#E5E5EA",
};
const shadow = "0 1px 3px rgba(0,0,0,0.06)";
const API = "https://api.bc.pixdrift.com";

const FONTS = [
  "Inter", "Roboto", "Poppins", "Montserrat", "Open Sans",
  "Lato", "Nunito", "Raleway", "DM Sans", "Geist",
];

const PRESET_THEMES = [
  { name: "Forest",          primary: "#1C3A1A", secondary: "#4A7A2A", accent: "#C4973A" },
  { name: "Ocean",           primary: "#0C2D48", secondary: "#145DA0", accent: "#2E8BC0" },
  { name: "Slate",           primary: "#1E293B", secondary: "#334155", accent: "#6366F1" },
  { name: "Rose",            primary: "#881337", secondary: "#BE123C", accent: "#F43F5E" },
  { name: "Amber",           primary: "#78350F", secondary: "#B45309", accent: "#F59E0B" },
  { name: "Default pixdrift",primary: "#6366f1", secondary: "#8b5cf6", accent: "#10b981" },
];

interface BrandState {
  company_name: string;
  logo_url: string;
  tagline: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_heading: string;
  font_body: string;
  dark_mode: boolean;
  favicon_url: string;
}

const DEFAULT_BRAND: BrandState = {
  company_name:    "",
  logo_url:        "",
  tagline:         "",
  primary_color:   "#1C3A1A",
  secondary_color: "#4A7A2A",
  accent_color:    "#C4973A",
  font_heading:    "Inter",
  font_body:       "Inter",
  dark_mode:       false,
  favicon_url:     "",
};

// Load Google Font dynamically
function loadGoogleFont(fontName: string) {
  if (!fontName || fontName === "system-ui") return;
  const id = `gf-${fontName.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, "+")}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

// ─── Color Picker Input ────────────────────────────────────────────────────────
const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ fontSize: 12, fontWeight: 500, color: C.secondary }}>{label}</div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: value,
        border: `1px solid ${C.border}`,
        flexShrink: 0,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
      }}>
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            position: "absolute", inset: -4,
            width: "calc(100% + 8px)", height: "calc(100% + 8px)",
            opacity: 0, cursor: "pointer",
          }}
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1, background: C.fill,
          border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "8px 12px", fontSize: 13, color: C.text,
          outline: "none", fontFamily: "monospace",
        }}
      />
    </div>
  </div>
);

// ─── Section header ─────────────────────────────────────────────────────────────
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    fontSize: 11, fontWeight: 600, color: C.tertiary,
    textTransform: "uppercase", letterSpacing: "0.08em",
    marginBottom: 16,
  }}>
    {children}
  </div>
);

// ─── Card ───────────────────────────────────────────────────────────────────────
const Card = ({ children, style: st }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: C.surface, borderRadius: 12, padding: "20px 24px",
    boxShadow: shadow, ...st,
  }}>
    {children}
  </div>
);

// ─── BrandSettings ─────────────────────────────────────────────────────────────
export const BrandSettings = () => {
  const [brand, setBrand] = useState<BrandState>(() => {
    try {
      const stored = localStorage.getItem("pixdrift_brand_settings");
      if (stored) return { ...DEFAULT_BRAND, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_BRAND;
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load fonts on change
  useEffect(() => { loadGoogleFont(brand.font_heading); }, [brand.font_heading]);
  useEffect(() => { loadGoogleFont(brand.font_body); }, [brand.font_body]);

  const set = (key: keyof BrandState, value: string | boolean) => {
    setBrand(b => ({ ...b, [key]: value }));
  };

  const applyTheme = (t: typeof PRESET_THEMES[0]) => {
    setBrand(b => ({
      ...b,
      primary_color:   t.primary,
      secondary_color: t.secondary,
      accent_color:    t.accent,
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      set("logo_url", dataUrl);
      setLogoUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      // Persist to localStorage immediately for live preview
      localStorage.setItem("pixdrift_brand_settings", JSON.stringify(brand));
      localStorage.setItem("pixdrift_brand_logo", brand.logo_url);
      localStorage.setItem("pixdrift_brand_name", brand.company_name || "pixdrift");

      // Try to persist to API
      const token = localStorage.getItem("pixdrift_token");
      const user = JSON.parse(localStorage.getItem("pixdrift_user") || "{}");
      const orgId = user?.org_id || user?.user_metadata?.org_id || "default";

      if (token) {
        const res = await fetch(`${API}/api/brand/${orgId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(brand),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      // Non-fatal: saved to localStorage at minimum
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      console.warn("Brand API save failed (saved locally):", e.message);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setBrand(DEFAULT_BRAND);
    localStorage.removeItem("pixdrift_brand_settings");
    localStorage.removeItem("pixdrift_brand_logo");
    localStorage.removeItem("pixdrift_brand_name");
  };

  // ── Preview styles ──────────────────────────────────────────────────────────
  const previewSidebar: React.CSSProperties = {
    width: 180,
    background: brand.primary_color,
    borderRadius: "10px 0 0 10px",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  };
  const previewMain: React.CSSProperties = {
    flex: 1,
    background: brand.dark_mode ? "#1C1C1E" : "#F2F2F7",
    borderRadius: "0 10px 10px 0",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 20,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
    }}>

      {/* ── Top: Live Preview ──────────────────────────────────────────── */}
      <Card>
        <SectionTitle>Förhandsgranskning i realtid</SectionTitle>
        <div style={{
          border: `1px solid ${C.border}`, borderRadius: 12,
          overflow: "hidden",
          height: 200,
          display: "flex",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}>
          {/* Preview Sidebar */}
          <div style={previewSidebar}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {brand.logo_url ? (
                <img src={brand.logo_url} alt="logo" style={{ height: 24, objectFit: "contain", maxWidth: 100 }} />
              ) : (
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: brand.accent_color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>
                    {(brand.company_name || "P")[0].toUpperCase()}
                  </span>
                </div>
              )}
              <span style={{
                fontSize: 13, fontWeight: 700, color: "#fff",
                fontFamily: brand.font_heading ? `'${brand.font_heading}', system-ui` : "system-ui",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {brand.company_name || "pixdrift"}
              </span>
            </div>
            {/* Nav items */}
            {["Dashboard", "Rapport", "Team", "Inställningar"].map((item, i) => (
              <div key={i} style={{
                padding: "6px 10px", borderRadius: 6, fontSize: 11,
                color: i === 0 ? "#fff" : "rgba(255,255,255,0.6)",
                background: i === 0 ? "rgba(255,255,255,0.15)" : "transparent",
                fontFamily: brand.font_body ? `'${brand.font_body}', system-ui` : "system-ui",
              }}>
                {item}
              </div>
            ))}
          </div>

          {/* Preview Main */}
          <div style={previewMain}>
            <div style={{
              fontSize: 16, fontWeight: 700,
              color: brand.dark_mode ? "#fff" : "#000",
              fontFamily: brand.font_heading ? `'${brand.font_heading}', system-ui` : "system-ui",
            }}>
              {brand.company_name || "Företagsnamn"} Dashboard
            </div>
            {brand.tagline && (
              <div style={{
                fontSize: 11, color: brand.dark_mode ? "rgba(255,255,255,0.5)" : C.secondary,
                fontFamily: brand.font_body ? `'${brand.font_body}', system-ui` : "system-ui",
              }}>
                {brand.tagline}
              </div>
            )}
            {/* Preview cards */}
            <div style={{ display: "flex", gap: 8 }}>
              {[brand.primary_color, brand.secondary_color, brand.accent_color].map((color, i) => (
                <div key={i} style={{
                  flex: 1, borderRadius: 8, padding: "10px 12px",
                  background: brand.dark_mode ? "#2C2C2E" : "#fff",
                  borderLeft: `3px solid ${color}`,
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
                    {i === 0 ? "1 234" : i === 1 ? "98%" : "42"}
                  </div>
                  <div style={{
                    fontSize: 10, color: brand.dark_mode ? "rgba(255,255,255,0.4)" : C.tertiary,
                    fontFamily: brand.font_body ? `'${brand.font_body}', system-ui` : "system-ui",
                  }}>
                    {i === 0 ? "Totalt" : i === 1 ? "Uppfyllt" : "Händelser"}
                  </div>
                </div>
              ))}
            </div>
            {/* CTA preview */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <div style={{
                background: brand.accent_color,
                color: "#fff", borderRadius: 6, padding: "5px 12px",
                fontSize: 11, fontWeight: 600,
                fontFamily: brand.font_body ? `'${brand.font_body}', system-ui` : "system-ui",
              }}>
                Ny rapport
              </div>
              <div style={{
                background: "transparent",
                color: brand.primary_color,
                border: `1px solid ${brand.primary_color}`,
                borderRadius: 6, padding: "5px 12px",
                fontSize: 11, fontWeight: 500,
              }}>
                Exportera
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Row: Identity + Logo ────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Company Identity */}
        <Card>
          <SectionTitle>Företagsidentitet</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: C.secondary, display: "block", marginBottom: 6 }}>
                Företagsnamn
              </label>
              <input
                value={brand.company_name}
                onChange={e => set("company_name", e.target.value)}
                placeholder="Ditt företag AB"
                style={{
                  width: "100%", background: C.fill,
                  border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: "9px 12px", fontSize: 14, color: C.text,
                  outline: "none", fontFamily: "inherit",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: C.secondary, display: "block", marginBottom: 6 }}>
                Slogan / Tagline
              </label>
              <input
                value={brand.tagline}
                onChange={e => set("tagline", e.target.value)}
                placeholder="Din vision, vår plattform"
                style={{
                  width: "100%", background: C.fill,
                  border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: "9px 12px", fontSize: 14, color: C.text,
                  outline: "none", fontFamily: "inherit",
                }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: C.secondary }}>
                Mörkt läge
              </label>
              <button
                onClick={() => set("dark_mode", !brand.dark_mode)}
                style={{
                  width: 44, height: 26, borderRadius: 13,
                  background: brand.dark_mode ? C.blue : C.inset,
                  border: "none", cursor: "pointer",
                  position: "relative", transition: "background 0.2s",
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", background: "#fff",
                  position: "absolute", top: 3,
                  left: brand.dark_mode ? 21 : 3,
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </button>
            </div>
          </div>
        </Card>

        {/* Logo Upload */}
        <Card>
          <SectionTitle>Logotyp</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Preview box */}
            <div style={{
              height: 80, borderRadius: 10,
              background: brand.primary_color + "15",
              border: `2px dashed ${brand.primary_color}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
              onClick={() => fileRef.current?.click()}
            >
              {brand.logo_url ? (
                <img src={brand.logo_url} alt="logo" style={{ maxHeight: 60, maxWidth: "80%", objectFit: "contain" }} />
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>🖼️</div>
                  <div style={{ fontSize: 12, color: C.secondary }}>Klicka för att ladda upp</div>
                  <div style={{ fontSize: 11, color: C.tertiary }}>PNG, SVG, JPG · max 2MB</div>
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              style={{ display: "none" }}
            />

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={logoUploading}
                style={{
                  flex: 1, height: 34, borderRadius: 8, border: `1px solid ${C.border}`,
                  background: C.fill, color: C.text, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {logoUploading ? "Laddar..." : "Välj fil"}
              </button>
              {brand.logo_url && (
                <button
                  onClick={() => set("logo_url", "")}
                  style={{
                    height: 34, padding: "0 12px", borderRadius: 8,
                    border: `1px solid ${C.red}30`, background: C.red + "10",
                    color: C.red, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Ta bort
                </button>
              )}
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: C.secondary, display: "block", marginBottom: 6 }}>
                Eller klistra in URL
              </label>
              <input
                value={brand.logo_url.startsWith("data:") ? "" : brand.logo_url}
                onChange={e => set("logo_url", e.target.value)}
                placeholder="https://dittföretag.se/logo.png"
                style={{
                  width: "100%", background: C.fill,
                  border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: "8px 12px", fontSize: 13, color: C.text,
                  outline: "none", fontFamily: "inherit",
                }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Colors ─────────────────────────────────────────────────────────── */}
      <Card>
        <SectionTitle>Färgschema</SectionTitle>

        {/* Preset Themes */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.secondary, marginBottom: 10 }}>
            Förinstallerade teman
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {PRESET_THEMES.map(theme => {
              const active =
                brand.primary_color === theme.primary &&
                brand.secondary_color === theme.secondary &&
                brand.accent_color === theme.accent;
              return (
                <button
                  key={theme.name}
                  onClick={() => applyTheme(theme)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 12px", borderRadius: 8, cursor: "pointer",
                    border: active ? `2px solid ${theme.primary}` : `1px solid ${C.border}`,
                    background: active ? theme.primary + "10" : C.fill,
                    fontFamily: "inherit", fontSize: 12, fontWeight: 500,
                    color: active ? theme.primary : C.secondary,
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", gap: 2 }}>
                    {[theme.primary, theme.secondary, theme.accent].map((c, i) => (
                      <div key={i} style={{
                        width: 10, height: 10, borderRadius: "50%", background: c,
                      }} />
                    ))}
                  </div>
                  {theme.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom colors */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <ColorInput label="Primärfärg" value={brand.primary_color} onChange={v => set("primary_color", v)} />
          <ColorInput label="Sekundärfärg" value={brand.secondary_color} onChange={v => set("secondary_color", v)} />
          <ColorInput label="Accentfärg" value={brand.accent_color} onChange={v => set("accent_color", v)} />
        </div>
      </Card>

      {/* ── Fonts ──────────────────────────────────────────────────────────── */}
      <Card>
        <SectionTitle>Typografi</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Heading font */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: C.secondary, display: "block", marginBottom: 10 }}>
              Rubrik-font
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {FONTS.map(font => {
                loadGoogleFont(font);
                const active = brand.font_heading === font;
                return (
                  <button
                    key={font}
                    onClick={() => set("font_heading", font)}
                    style={{
                      padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                      border: active ? `2px solid ${C.blue}` : `1px solid ${C.border}`,
                      background: active ? C.blue + "10" : C.fill,
                      color: active ? C.blue : C.secondary,
                      fontSize: 13, fontFamily: `'${font}', system-ui`,
                      fontWeight: active ? 600 : 400,
                      transition: "all 0.12s",
                    }}
                  >
                    {font}
                  </button>
                );
              })}
            </div>
            <div style={{
              marginTop: 12, padding: "12px 16px", background: C.fill,
              borderRadius: 8, fontFamily: `'${brand.font_heading}', system-ui`,
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Rubriktext — {brand.font_heading}</div>
              <div style={{ fontSize: 13, color: C.secondary, marginTop: 4 }}>
                ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
              </div>
            </div>
          </div>

          {/* Body font */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: C.secondary, display: "block", marginBottom: 10 }}>
              Brödtext-font
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {FONTS.map(font => {
                const active = brand.font_body === font;
                return (
                  <button
                    key={font}
                    onClick={() => set("font_body", font)}
                    style={{
                      padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                      border: active ? `2px solid #AF52DE` : `1px solid ${C.border}`,
                      background: active ? "#AF52DE10" : C.fill,
                      color: active ? "#AF52DE" : C.secondary,
                      fontSize: 13, fontFamily: `'${font}', system-ui`,
                      fontWeight: active ? 600 : 400,
                      transition: "all 0.12s",
                    }}
                  >
                    {font}
                  </button>
                );
              })}
            </div>
            <div style={{
              marginTop: 12, padding: "12px 16px", background: C.fill,
              borderRadius: 8, fontFamily: `'${brand.font_body}', system-ui`,
            }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>Brödtext — {brand.font_body}</div>
              <div style={{ fontSize: 13, color: C.secondary, marginTop: 4, lineHeight: 1.6 }}>
                Det här är ett exempel på brödtext i er applikation. Lätt att läsa och estetiskt tilltalande.
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Save Bar ───────────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", bottom: 0,
        background: "rgba(242,242,247,0.95)",
        backdropFilter: "blur(10px)",
        padding: "14px 0",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button
          onClick={save}
          disabled={saving}
          style={{
            height: 40, padding: "0 24px", borderRadius: 10,
            fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            border: "none", fontFamily: "inherit",
            background: saved ? C.green : C.blue,
            color: "#fff",
            transition: "background 0.2s",
          }}
        >
          {saving ? "Sparar..." : saved ? "✓ Sparat!" : "Spara varumärke"}
        </button>
        <button
          onClick={reset}
          style={{
            height: 40, padding: "0 16px", borderRadius: 10,
            fontSize: 14, fontWeight: 500, cursor: "pointer",
            border: `1px solid ${C.border}`, background: C.surface,
            color: C.secondary, fontFamily: "inherit",
          }}
        >
          Återställ standard
        </button>
        {error && (
          <div style={{ fontSize: 12, color: C.red }}>{error}</div>
        )}
        <div style={{ marginLeft: "auto", fontSize: 12, color: C.tertiary }}>
          Ändringar sparas i localStorage för omedelbar preview
        </div>
      </div>
    </div>
  );
};

export default BrandSettings;
