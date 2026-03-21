import { useState } from "react";
import { useApi } from "./useApi";
import { useTranslation, LanguageSwitcher } from "@pixdrift/i18n";
import { IntegrationsHub } from "./IntegrationsHub";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: "#F5F5F7", surface: "#FFFFFF", elevated: "#FAFAFA",
  border: "#E5E5EA", separator: "#F2F2F7",
  text: "#1D1D1F", secondary: "#86868B", tertiary: "#AEAEB2",
  blue: "#007AFF", blueLight: "#E8F3FF",
  green: "#34C759", greenLight: "#E8F8ED",
  yellow: "#FF9500", yellowLight: "#FFF3E0",
  red: "#FF3B30", redLight: "#FFF0EF",
  purple: "#AF52DE", fill: "#F2F2F7",
};
const shadow = {
  sm: "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.04)",
  md: "0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
};
const API = "https://api.bc.pixdrift.com";

// ─── Global styles ─────────────────────────────────────────────────────────────
const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes shimmer {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .card-animate { animation: slideUp 0.2s ease forwards; }
  .row-hover:hover { background: ${C.fill}; border-radius: 6px; transition: background 0.1s ease; }
  .nav-btn { transition: all 0.12s ease; }
  .nav-btn:hover { background: ${C.fill} !important; }
  .btn-primary { transition: all 0.15s ease; }
  .btn-primary:hover { background: #0066D6 !important; transform: translateY(-1px); }
  .btn-primary:active { transform: scale(0.98); }
  .btn-secondary:hover { background: #E5E5EA !important; }
  input:focus { outline: 2px solid ${C.blue} !important; outline-offset: 0; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d: string) =>
  new Date(d).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" });
const statusColor = (s: string) =>
  s === "GREEN" || s === "ACTIVE" || s === "SUCCESS" ? C.green
  : s === "YELLOW" ? C.yellow
  : s === "RED" || s === "FAILED" ? C.red : C.tertiary;

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = ({ width = "100%", height = "14px" }: { width?: string; height?: string }) => (
  <div style={{
    width, height,
    background: "linear-gradient(90deg, #E5E5EA 0%, #F5F5F7 50%, #E5E5EA 100%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
    borderRadius: 6,
  }} />
);

// ─── UI Primitives ─────────────────────────────────────────────────────────────
const Card = ({ title, children, style: st }: {
  title?: string; children: React.ReactNode; style?: React.CSSProperties;
}) => (
  <div className="card-animate" style={{
    background: C.surface, borderRadius: 12, padding: "20px 24px", boxShadow: shadow.sm, ...st,
  }}>
    {title && (
      <div style={{
        fontSize: 11, fontWeight: 600, color: C.tertiary,
        marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em",
      }}>
        {title}
      </div>
    )}
    {children}
  </div>
);

const Badge = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span style={{
    background: color + "18", color, fontSize: 11, fontWeight: 600,
    padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap",
  }}>
    {children}
  </span>
);

const Row = ({ children, border = true }: { children: React.ReactNode; border?: boolean }) => (
  <div className="row-hover" style={{
    display: "flex", alignItems: "center", gap: 12,
    padding: "11px 6px",
    borderBottom: border ? `0.5px solid ${C.separator}` : "none",
    cursor: "pointer",
  }}>
    {children}
  </div>
);

const Btn = ({ children, onClick, variant = "primary", style: st }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "primary" | "secondary"; style?: React.CSSProperties;
}) => (
  <button
    className={`btn-${variant}`}
    onClick={onClick}
    style={{
      height: 36, padding: "0 16px", borderRadius: 8,
      fontSize: 13, fontWeight: 500, cursor: "pointer",
      border: "none", fontFamily: "inherit",
      background: variant === "primary" ? C.blue : C.fill,
      color: variant === "primary" ? "#fff" : C.text,
      ...st,
    }}
  >
    {children}
  </button>
);

const EmptyState = ({ icon, title, subtitle }: { icon?: string; title: string; subtitle?: string }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "48px 24px", gap: 10,
  }}>
    {icon && <div style={{ fontSize: 36, opacity: 0.25 }}>{icon}</div>}
    <div style={{ fontSize: 15, fontWeight: 600, color: C.secondary }}>{title}</div>
    {subtitle && <div style={{ fontSize: 13, color: C.tertiary, textAlign: "center" }}>{subtitle}</div>}
  </div>
);

// ─── Nav ─────────────────────────────────────────────────────────────────────
type NavItem = { id: string; label: string; icon: React.ReactNode };

const navItems: NavItem[] = [
  { id: "overview", label: "Översikt", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )},
  { id: "users", label: "Användare", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )},
  { id: "roles", label: "Roller & Behörigheter", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )},
  { id: "compliance", label: "Compliance", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  )},
  { id: "audit", label: "Audit Log", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )},
  { id: "integrations", label: "Integrationer", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="6" height="10" rx="1"/><rect x="16" y="7" width="6" height="10" rx="1"/>
      <path d="M8 12h8"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  )},
  { id: "settings", label: "Inställningar", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M17.66 17.66l-1.41-1.41M6.34 17.66l1.41-1.41"/>
    </svg>
  )},
];

// ─── Fallback data ─────────────────────────────────────────────────────────────
const FALLBACK_AUDIT = [
  { id: "1", event: "USER_LOGIN", user: "erik@pixdrift.com", timestamp: "2026-03-21T07:12:00Z", ip: "192.168.1.1", status: "SUCCESS" },
  { id: "2", event: "SETTINGS_CHANGED", user: "admin@pixdrift.com", timestamp: "2026-03-21T06:45:00Z", ip: "10.0.0.5", status: "SUCCESS" },
  { id: "3", event: "USER_INVITE", user: "erik@pixdrift.com", timestamp: "2026-03-20T16:30:00Z", ip: "192.168.1.1", status: "SUCCESS" },
  { id: "4", event: "LOGIN_FAILED", user: "unknown@test.com", timestamp: "2026-03-20T14:11:00Z", ip: "8.8.8.8", status: "FAILED" },
  { id: "5", event: "EXPORT_DATA", user: "winston@pixdrift.com", timestamp: "2026-03-20T11:22:00Z", ip: "10.0.0.8", status: "SUCCESS" },
  { id: "6", event: "ROLE_ASSIGNED", user: "admin@pixdrift.com", timestamp: "2026-03-19T09:00:00Z", ip: "10.0.0.5", status: "SUCCESS" },
];

const FALLBACK_COMPLIANCE = [
  { id: "1", name: "ISO 9001:2015", completion_pct: 72, total_requirements: 52, met_requirements: 37 },
  { id: "2", name: "ISO 27001", completion_pct: 45, total_requirements: 40, met_requirements: 18 },
  { id: "3", name: "GDPR", completion_pct: 88, total_requirements: 25, met_requirements: 22 },
];

const FALLBACK_RISKS = [
  { id: "1", title: "Nyckelperson lämnar", category: "OPERATIONAL", level: "HIGH", score: 15, probability: 3, impact: 5, mitigation_plan: "Cross-training + dokumentation" },
  { id: "2", title: "Supabase driftstopp", category: "TECHNICAL", level: "MEDIUM", score: 8, probability: 2, impact: 4, mitigation_plan: "Daglig backup + migration plan" },
  { id: "3", title: "GDPR-överträdelse", category: "LEGAL", level: "MEDIUM", score: 10, probability: 2, impact: 5, mitigation_plan: "DPA + Privacy by Design" },
];

const FALLBACK_USERS = [
  { id: "1", name: "Erik Svensson", email: "erik@pixdrift.com", role: "ADMIN", status: "ACTIVE", lastLogin: "2026-03-21T07:12:00Z" },
  { id: "2", name: "Leon Ritzén", email: "leon@pixdrift.com", role: "CEO", status: "ACTIVE", lastLogin: "2026-03-21T08:00:00Z" },
  { id: "3", name: "Johan Eriksson", email: "johan@pixdrift.com", role: "DEVELOPER", status: "ACTIVE", lastLogin: "2026-03-20T17:45:00Z" },
  { id: "4", name: "Dennis Lindqvist", email: "dennis@pixdrift.com", role: "OPERATIONS", status: "ACTIVE", lastLogin: "2026-03-20T15:20:00Z" },
  { id: "5", name: "Winston Adeyemi", email: "winston@pixdrift.com", role: "CFO", status: "ACTIVE", lastLogin: "2026-03-19T12:00:00Z" },
];

const ROLES = [
  { name: "ADMIN", color: C.red, perms: ["users.manage", "roles.manage", "settings.write", "audit.read", "compliance.manage", "data.export"] },
  { name: "CEO", color: C.purple, perms: ["users.read", "settings.read", "audit.read", "compliance.read", "data.export"] },
  { name: "DEVELOPER", color: C.blue, perms: ["settings.read", "audit.read"] },
  { name: "OPERATIONS", color: C.green, perms: ["users.read", "compliance.read"] },
  { name: "CFO", color: C.yellow, perms: ["users.read", "audit.read", "data.export"] },
];

const ALL_PERMS = ["users.manage", "users.read", "roles.manage", "settings.write", "settings.read", "audit.read", "compliance.manage", "compliance.read", "data.export"];

const SYSTEM_HEALTH = [
  { name: "API Gateway", status: "GREEN", uptime: "99.9%", latency: "42ms" },
  { name: "Database", status: "GREEN", uptime: "100%", latency: "8ms" },
  { name: "Auth Service", status: "GREEN", uptime: "99.8%", latency: "22ms" },
  { name: "Storage", status: "YELLOW", uptime: "97.2%", latency: "180ms" },
  { name: "Email Service", status: "GREEN", uptime: "99.5%", latency: "340ms" },
];

// ─── Views ─────────────────────────────────────────────────────────────────────
function OverviewView() {
  const { data: auditData, loading: auditLoading } = useApi<typeof FALLBACK_AUDIT>(`${API}/api/audit`);
  const audit = (auditData && auditData.length > 0) ? auditData : FALLBACK_AUDIT;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* System Health */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {SYSTEM_HEALTH.map((s, i) => {
          const col = statusColor(s.status);
          return (
            <div key={i} className="card-animate" style={{
              background: C.surface, borderRadius: 12,
              padding: "16px 18px", boxShadow: shadow.sm,
              borderTop: `3px solid ${col}`,
              animation: `slideUp 0.2s ease ${i * 0.05}s backwards`,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: C.secondary, fontWeight: 500 }}>{s.name}</div>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: col }} />
              </div>
              <div style={{
                fontSize: 22, fontWeight: 700, color: C.text,
                fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
              }}>
                {s.uptime}
              </div>
              <div style={{ fontSize: 11, color: C.tertiary, marginTop: 3 }}>
                Latens: <span style={{ fontVariantNumeric: "tabular-nums" }}>{s.latency}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: "Aktiva användare", value: FALLBACK_USERS.length, color: C.blue },
          { label: "Aktiva sessioner", value: 3, color: C.green },
          { label: "Audit-events idag", value: audit.filter(a => a.timestamp.startsWith("2026-03-21")).length, color: C.purple },
          { label: "Misslyckade inlogg.", value: audit.filter(a => a.status === "FAILED").length, color: C.red },
        ].map((s, i) => (
          <div key={i} className="card-animate" style={{
            background: C.surface, borderRadius: 12, padding: "18px 20px", boxShadow: shadow.sm,
            animation: `slideUp 0.2s ease ${i * 0.04}s backwards`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.secondary }}>{s.label}</div>
            <div style={{
              fontSize: 28, fontWeight: 700, color: s.color, marginTop: 6,
              fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em",
            }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Audit Events */}
      <Card title="Senaste audit-händelser">
        {auditLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0" }}>
                <Skeleton width="36px" height="36px" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <Skeleton height="14px" width="40%" />
                  <Skeleton height="11px" width="60%" />
                </div>
              </div>
            ))}
          </div>
        ) : audit.length === 0 ? (
          <EmptyState icon="📋" title="Inga händelser" />
        ) : (
          audit.slice(0, 6).map((a, i) => {
            const col = statusColor(a.status);
            return (
              <Row key={i} border={i < 5}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: col + "12",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {a.status === "FAILED"
                      ? <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>
                      : <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>
                    }
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{a.event.replace(/_/g, " ")}</div>
                  <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>{a.user} · {a.ip}</div>
                </div>
                <Badge color={col}>{a.status}</Badge>
                <div style={{ fontSize: 11, color: C.tertiary, fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>
                  {fmt(a.timestamp)}
                </div>
              </Row>
            );
          })
        )}
      </Card>
    </div>
  );
}

function UsersView() {
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const users = FALLBACK_USERS.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Sök användare…"
          style={{
            flex: 1, background: C.surface,
            border: `1px solid ${C.border}`, borderRadius: 10,
            padding: "9px 14px", fontSize: 13, color: C.text,
            outline: "none", boxShadow: shadow.sm, fontFamily: "inherit",
          }}
        />
        <Btn onClick={() => setShowInvite(!showInvite)}>+ Bjud in</Btn>
      </div>

      {showInvite && (
        <Card>
          <div style={{
            fontSize: 11, fontWeight: 600, color: C.tertiary,
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14,
          }}>
            Bjud in användare
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              placeholder="namn@företag.se"
              style={{
                flex: 1, background: C.fill,
                border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "8px 12px", fontSize: 13, outline: "none", fontFamily: "inherit",
              }}
            />
            <select style={{
              background: C.fill, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "8px 12px", fontSize: 13,
              outline: "none", fontFamily: "inherit", color: C.text,
            }}>
              {ROLES.map(r => <option key={r.name}>{r.name}</option>)}
            </select>
            <Btn onClick={() => setShowInvite(false)}>Skicka</Btn>
          </div>
        </Card>
      )}

      <Card title={`${users.length} användare`}>
        {users.length === 0 ? (
          <EmptyState icon="👥" title="Inga användare hittades" />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr" }}>
            {["Namn", "E-post", "Roll", "Status", "Senast inloggad"].map(h => (
              <div key={h} style={{
                padding: "8px 0",
                fontSize: 11, fontWeight: 600, color: C.tertiary,
                textTransform: "uppercase", letterSpacing: "0.06em",
                borderBottom: `1px solid ${C.border}`,
              }}>
                {h}
              </div>
            ))}
            {users.map((u, i) => {
              const role = ROLES.find(r => r.name === u.role);
              return [
                <div key={`n${i}`} style={{
                  padding: "12px 0",
                  display: "flex", alignItems: "center", gap: 10,
                  borderBottom: `0.5px solid ${C.separator}`,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: (role?.color ?? C.blue) + "18",
                    color: role?.color ?? C.blue,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700,
                  }}>
                    {u.name[0]}
                  </div>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{u.name}</span>
                </div>,
                <div key={`e${i}`} style={{
                  padding: "12px 0", color: C.secondary, fontSize: 13,
                  display: "flex", alignItems: "center",
                  borderBottom: `0.5px solid ${C.separator}`,
                }}>
                  {u.email}
                </div>,
                <div key={`r${i}`} style={{
                  padding: "12px 0",
                  display: "flex", alignItems: "center",
                  borderBottom: `0.5px solid ${C.separator}`,
                }}>
                  <Badge color={role?.color ?? C.blue}>{u.role}</Badge>
                </div>,
                <div key={`s${i}`} style={{
                  padding: "12px 0",
                  display: "flex", alignItems: "center",
                  borderBottom: `0.5px solid ${C.separator}`,
                }}>
                  <Badge color={statusColor(u.status)}>{u.status}</Badge>
                </div>,
                <div key={`l${i}`} style={{
                  padding: "12px 0",
                  color: C.tertiary, fontFamily: "monospace", fontSize: 11,
                  display: "flex", alignItems: "center",
                  borderBottom: `0.5px solid ${C.separator}`,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {fmt(u.lastLogin)}
                </div>,
              ];
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function RolesView() {
  const [selected, setSelected] = useState("ADMIN");
  const role = ROLES.find(r => r.name === selected)!;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Role tabs */}
      <div style={{ display: "flex", gap: 8 }}>
        {ROLES.map(r => (
          <button
            key={r.name}
            onClick={() => setSelected(r.name)}
            style={{
              background: selected === r.name ? r.color + "15" : C.surface,
              color: selected === r.name ? r.color : C.secondary,
              border: `1px solid ${selected === r.name ? r.color + "40" : C.border}`,
              borderRadius: 8, padding: "7px 16px",
              fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Permissions list */}
      <Card title={`${selected} — Behörigheter`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {ALL_PERMS.map(perm => {
            const hasIt = role.perms.includes(perm);
            return (
              <div key={perm} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "9px 10px", borderRadius: 8,
                background: hasIt ? C.green + "06" : "transparent",
                animation: "fadeIn 0.15s ease",
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: hasIt ? C.green + "18" : C.fill,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {hasIt
                    ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.tertiary} strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  }
                </div>
                <span style={{ fontSize: 13, fontFamily: "monospace", color: hasIt ? C.text : C.tertiary }}>
                  {perm}
                </span>
                {hasIt && <Badge color={C.green}>Tillåten</Badge>}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Matrix */}
      <Card title="Rollmatris — Översikt">
        <div style={{ overflowX: "auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: `160px repeat(${ROLES.length}, 1fr)`,
            minWidth: 560,
          }}>
            <div style={{
              padding: "8px 0",
              fontSize: 11, fontWeight: 600, color: C.tertiary,
              textTransform: "uppercase", letterSpacing: "0.06em",
              borderBottom: `1px solid ${C.border}`,
            }}>
              Behörighet
            </div>
            {ROLES.map(r => (
              <div key={r.name} style={{
                padding: "8px 0",
                fontSize: 11, fontWeight: 600, color: r.color,
                borderBottom: `1px solid ${C.border}`, textAlign: "center",
              }}>
                {r.name}
              </div>
            ))}
            {ALL_PERMS.map((perm, pi) => [
              <div key={`p${pi}`} style={{
                padding: "9px 0",
                fontFamily: "monospace", color: C.secondary, fontSize: 11,
                borderBottom: `0.5px solid ${C.separator}`,
              }}>
                {perm}
              </div>,
              ...ROLES.map(r => (
                <div key={`${pi}${r.name}`} style={{
                  padding: "9px 0", textAlign: "center",
                  borderBottom: `0.5px solid ${C.separator}`,
                }}>
                  {r.perms.includes(perm)
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.separator} strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  }
                </div>
              )),
            ])}
          </div>
        </div>
      </Card>
    </div>
  );
}

function ComplianceView() {
  const { data, loading } = useApi<typeof FALLBACK_COMPLIANCE>(`${API}/api/compliance`);
  const items = (data && data.length > 0) ? data : FALLBACK_COMPLIANCE;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {loading ? (
        [...Array(3)].map((_, i) => (
          <div key={i} style={{ background: C.surface, borderRadius: 12, padding: "20px 24px", boxShadow: shadow.sm }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <Skeleton height="18px" width="40%" />
              <Skeleton height="18px" width="14%" />
            </div>
            <Skeleton height="6px" />
          </div>
        ))
      ) : (
        items.map((c, i) => {
          const pct = c.completion_pct;
          const color = pct >= 85 ? C.green : pct >= 60 ? C.yellow : C.red;
          return (
            <Card key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>
                  {c.name}
                </div>
                <Badge color={color}>{pct}% uppfyllt</Badge>
              </div>
              <div style={{ height: 6, background: C.fill, borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
                <div style={{
                  height: "100%", width: `${pct}%`, background: color, borderRadius: 3,
                  transition: "width 0.6s ease",
                }} />
              </div>
              <div style={{ display: "flex", gap: 20, fontSize: 12 }}>
                {[
                  { label: "Uppfyllda", v: c.met_requirements, c: C.green },
                  { label: "Partiella", v: Math.round((c.total_requirements - c.met_requirements) * 0.5), c: C.yellow },
                  { label: "Ej uppfyllda", v: c.total_requirements - c.met_requirements, c: C.red },
                ].map((s, j) => (
                  <span key={j}>
                    <span style={{ color: C.secondary }}>{s.label} </span>
                    <span style={{ color: s.c, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{s.v}</span>
                  </span>
                ))}
                <span style={{ marginLeft: "auto", color: C.tertiary }}>
                  Totalt: <span style={{ fontVariantNumeric: "tabular-nums" }}>{c.total_requirements}</span> krav
                </span>
              </div>
            </Card>
          );
        })
      )}

      <Card title="Riskmatris">
        {FALLBACK_RISKS.map((r, i) => (
          <Row key={i} border={i < FALLBACK_RISKS.length - 1}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{r.title}</div>
              <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>{r.mitigation_plan}</div>
            </div>
            <Badge color={C.tertiary}>{r.category}</Badge>
            <div style={{
              fontWeight: 700,
              color: r.level === "HIGH" ? C.red : r.level === "MEDIUM" ? C.yellow : C.green,
              minWidth: 30, textAlign: "center",
              fontVariantNumeric: "tabular-nums",
            }}>
              {r.score}
            </div>
            <Badge color={r.level === "HIGH" ? C.red : r.level === "MEDIUM" ? C.yellow : C.green}>
              {r.level}
            </Badge>
          </Row>
        ))}
      </Card>
    </div>
  );
}

function AuditView() {
  const { data, loading } = useApi<typeof FALLBACK_AUDIT>(`${API}/api/audit`);
  const audit = (data && data.length > 0) ? data : FALLBACK_AUDIT;

  const eventColor = (e: string) =>
    e.includes("FAILED") || e.includes("ERROR") ? C.red
    : e.includes("DELETE") ? C.yellow
    : e.includes("LOGIN") ? C.green : C.blue;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: "Totalt idag", value: audit.filter(a => a.timestamp?.startsWith("2026-03-21")).length, color: C.blue },
          { label: "Lyckade", value: audit.filter(a => a.status === "SUCCESS").length, color: C.green },
          { label: "Misslyckade", value: audit.filter(a => a.status === "FAILED").length, color: C.red },
          { label: "Unika användare", value: new Set(audit.map(a => a.user)).size, color: C.purple },
        ].map((s, i) => (
          <div key={i} className="card-animate" style={{
            background: C.surface, borderRadius: 12, padding: "18px 20px", boxShadow: shadow.sm,
            animation: `slideUp 0.2s ease ${i * 0.04}s backwards`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.secondary }}>{s.label}</div>
            <div style={{
              fontSize: 28, fontWeight: 700, color: s.color, marginTop: 6,
              fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em",
            }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <Card title="Tidslinje">
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 16 }}>
                <Skeleton width="36px" height="36px" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
                  <Skeleton height="14px" width="30%" />
                  <Skeleton height="11px" width="50%" />
                </div>
              </div>
            ))}
          </div>
        ) : audit.length === 0 ? (
          <EmptyState icon="📋" title="Inga händelser" />
        ) : (
          <div style={{ position: "relative", paddingLeft: 20 }}>
            <div style={{
              position: "absolute", left: 18, top: 0, bottom: 0,
              width: 1, background: C.separator,
            }} />
            {audit.map((a, i) => {
              const col = eventColor(a.event);
              return (
                <div key={i} style={{
                  display: "flex", gap: 16, marginBottom: 16, position: "relative",
                  animation: `slideUp 0.2s ease ${i * 0.04}s backwards`,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: col + "15", color: col,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, zIndex: 1, position: "relative",
                    border: `2px solid ${C.surface}`, marginLeft: -2,
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {a.event[0]}
                  </div>
                  <div style={{
                    flex: 1, background: C.fill, borderRadius: 10,
                    padding: "10px 14px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>
                        {a.event.replace(/_/g, " ")}
                      </div>
                      <Badge color={statusColor(a.status)}>{a.status}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: C.secondary, marginTop: 4 }}>{a.user} · {a.ip}</div>
                    <div style={{
                      fontSize: 11, color: C.tertiary, marginTop: 3,
                      fontFamily: "monospace", fontVariantNumeric: "tabular-nums",
                    }}>
                      {fmt(a.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function SettingsView() {
  const [saved, setSaved] = useState(false);
  const sections = [
    {
      title: "System",
      settings: [
        { label: "Systemnamn", value: "Pixdrift OMS", type: "text" },
        { label: "API-bas-URL", value: "https://api.bc.pixdrift.com", type: "text" },
        { label: "Tidzon", value: "Europe/Stockholm", type: "text" },
      ],
    },
    {
      title: "Säkerhet",
      settings: [
        { label: "Session-timeout (min)", value: "60", type: "number" },
        { label: "Max inloggningsförsök", value: "5", type: "number" },
        { label: "2FA obligatorisk", value: "true", type: "text" },
      ],
    },
    {
      title: "Notifieringar",
      settings: [
        { label: "E-post för systemfel", value: "admin@pixdrift.com", type: "text" },
        { label: "Slack Webhook", value: "https://hooks.slack.com/...", type: "text" },
      ],
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sections.map((section, si) => (
        <Card key={si} title={section.title}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {section.settings.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ width: 200, fontSize: 14, color: C.secondary, flexShrink: 0 }}>
                  {s.label}
                </div>
                <input
                  defaultValue={s.value}
                  type={s.type}
                  style={{
                    flex: 1, background: C.fill,
                    border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: "8px 12px", fontSize: 14,
                    color: C.text, outline: "none", fontFamily: "inherit",
                  }}
                />
              </div>
            ))}
          </div>
        </Card>
      ))}

      <div style={{ display: "flex", gap: 10 }}>
        <Btn
          onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          style={{ background: saved ? C.green : C.blue }}
        >
          {saved ? "✓ Sparad" : "Spara ändringar"}
        </Btn>
        <Btn variant="secondary">Återställ</Btn>
      </div>
    </div>
  );
}

// ─── App Shell ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("overview");
  const { t } = useTranslation();

  const viewComponents: Record<string, React.ReactNode> = {
    overview: <OverviewView />,
    users: <UsersView />,
    roles: <RolesView />,
    compliance: <ComplianceView />,
    audit: <AuditView />,
    integrations: <IntegrationsHub />,
    settings: <SettingsView />,
  };

  const current = navItems.find(n => n.id === view)!;

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{
        display: "flex", minHeight: "100vh", background: C.bg,
        fontFamily: "Inter, -apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif",
        color: C.text, WebkitFontSmoothing: "antialiased",
      }}>
        {/* Sidebar */}
        <div style={{
          width: 220, background: C.surface,
          borderRight: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column",
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100,
        }}>
          {/* Logo */}
          <div style={{
            padding: "18px 16px",
            borderBottom: `1px solid ${C.separator}`,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: "linear-gradient(135deg, #FF3B30, #FF6B35)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", color: C.text }}>
                Admin
              </div>
              <div style={{ fontSize: 11, color: C.tertiary }}>Pixdrift OMS</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
            {navItems.map(item => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  className="nav-btn"
                  onClick={() => setView(item.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "0 10px", height: 36, borderRadius: 8, border: "none",
                    background: active ? C.blue + "12" : "transparent",
                    color: active ? C.blue : C.secondary,
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    cursor: "pointer", textAlign: "left", width: "100%",
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", color: "inherit" }}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User */}
          <div style={{
            padding: "12px 14px",
            borderTop: `1px solid ${C.separator}`,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: C.red + "18", color: C.red,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700,
            }}>
              E
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Erik Svensson</div>
              <div style={{ fontSize: 11, color: C.tertiary }}>ADMIN</div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div style={{ marginLeft: 220, flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(20px)",
            borderBottom: `0.5px solid ${C.border}`,
            padding: "0 28px", height: 56,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            position: "sticky", top: 0, zIndex: 50,
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: C.text }}>
              {current?.label}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LanguageSwitcher />
              <div style={{
                fontSize: 12, fontVariantNumeric: "tabular-nums",
                color: C.tertiary, fontFamily: "monospace",
              }}>
                {new Date().toLocaleDateString("sv-SE")}
              </div>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green }} />
              <div style={{ fontSize: 12, color: C.secondary }}>System OK</div>
            </div>
          </div>

          <div style={{ flex: 1, padding: "24px 28px 60px" }}>
            {viewComponents[view] ?? <EmptyState icon="🔍" title="Vy saknas" />}
          </div>
        </div>
      </div>
    </>
  );
}
