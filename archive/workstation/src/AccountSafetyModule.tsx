import { useState, useEffect } from "react";
import { useApi } from "./useApi";

// ─── Design tokens (matchar Dashboard.tsx) ────────────────────────────────────
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface MasterAccount {
  id: string;
  service: string;
  account_type: string;
  display_name: string;
  login_email: string;
  email_is_personal: boolean;
  email_owner?: string;
  two_factor_enabled: boolean;
  two_factor_method?: string;
  recovery_email?: string;
  recovery_codes_stored: boolean;
  backup_admin_id?: string | null;
  notes?: string;
  risk_level: "low" | "medium" | "high" | "critical";
  risk_reasons: string[];
}

interface OffboardingItem {
  id: string;
  service: string;
  action: string;
  status: "pending" | "done" | "skipped";
  assigned_to?: string;
  due_date?: string;
  notes?: string;
}

interface OffboardingChecklist {
  id: string;
  user_name?: string;
  user_email?: string;
  exit_date?: string;
  status: string;
  items: OffboardingItem[];
  progress?: { total: number; done: number; pct: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const riskColor = (level: string): string => ({
  critical: C.red,
  high:     C.orange,
  medium:   "#FFCC00",
  low:      C.green,
}[level] ?? C.tertiary);

const riskLabel = (level: string): string => ({
  critical: "KRITISK",
  high:     "HÖG",
  medium:   "MEDIUM",
  low:      "LÅG",
}[level] ?? level.toUpperCase());

// ─── Sub-components ───────────────────────────────────────────────────────────

const Badge = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span style={{
    background: color + "18", color,
    fontSize: 11, fontWeight: 600,
    padding: "2px 8px", borderRadius: 6,
    whiteSpace: "nowrap",
  }}>
    {children}
  </span>
);

const Btn = ({ children, onClick, variant = "primary", size = "md", style: st }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md";
  style?: React.CSSProperties;
}) => {
  const s: Record<string, React.CSSProperties> = {
    primary:     { background: C.blue, color: "#fff", border: "none" },
    secondary:   { background: C.fill, color: C.text, border: "none" },
    ghost:       { background: "transparent", color: C.blue, border: "none" },
    destructive: { background: C.red + "10", color: C.red, border: `0.5px solid ${C.red}30` },
  };
  return (
    <button type="button" onClick={onClick} style={{
      height: size === "sm" ? 32 : 36,
      padding: size === "sm" ? "0 12px" : "0 16px",
      borderRadius: 8, fontSize: 13, fontWeight: 500,
      cursor: "pointer", fontFamily: "inherit",
      transition: "opacity 0.1s",
      ...s[variant], ...st,
    }}>
      {children}
    </button>
  );
};

// ─── ShieldCheckIcon ──────────────────────────────────────────────────────────

export const ShieldCheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);

// ─── RiskCard ─────────────────────────────────────────────────────────────────

const RiskCard = ({ account, onFix }: { account: MasterAccount; onFix?: () => void }) => (
  <div style={{
    borderLeft: `4px solid ${riskColor(account.risk_level)}`,
    background: C.surface,
    borderRadius: "0 10px 10px 0",
    padding: "14px 16px",
    marginBottom: 8,
    boxShadow: shadow,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{account.service} — {account.display_name}</div>
        <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>{account.login_email}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: riskColor(account.risk_level) }}>
          {riskLabel(account.risk_level)}
        </span>
        {(account.risk_level === "critical" || account.risk_level === "high") && onFix && (
          <Btn size="sm" variant="destructive" onClick={onFix}>Åtgärda →</Btn>
        )}
      </div>
    </div>
    {account.risk_reasons?.length > 0 && (
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
        {account.risk_reasons.map(r => (
          <div key={r} style={{ fontSize: 12, color: C.red, display: "flex", gap: 6, alignItems: "center" }}>
            <span>⚠️</span><span>{r}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─── View 1: Risk Dashboard ───────────────────────────────────────────────────

function RiskDashboard({ accounts, onViewAccount }: { accounts: MasterAccount[]; onViewAccount: (a: MasterAccount) => void }) {
  const groups: { level: "critical" | "high" | "medium" | "low"; emoji: string; label: string }[] = [
    { level: "critical", emoji: "🔴", label: "KRITISK RISK" },
    { level: "high",     emoji: "🟠", label: "HÖG RISK" },
    { level: "medium",   emoji: "🟡", label: "MEDIUM RISK" },
    { level: "low",      emoji: "🟢", label: "LÅGT RISK" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {groups.map(g => {
          const count = accounts.filter(a => a.risk_level === g.level).length;
          return (
            <div key={g.level} style={{
              background: C.surface, borderRadius: 10,
              padding: "16px 20px",
              border: `0.5px solid ${C.border}`,
              borderTop: `3px solid ${riskColor(g.level)}`,
              boxShadow: shadow,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: riskColor(g.level), letterSpacing: "0.06em" }}>
                {g.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: riskColor(g.level), marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
                {count}
              </div>
              <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
                {count === 1 ? "konto" : "konton"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Groups */}
      {groups.map(g => {
        const grpAccounts = accounts.filter(a => a.risk_level === g.level);
        if (grpAccounts.length === 0) return null;
        return (
          <div key={g.level}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.secondary, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              {g.emoji} {g.label}
              <span style={{ fontSize: 11, background: riskColor(g.level) + "18", color: riskColor(g.level), padding: "1px 6px", borderRadius: 4 }}>
                {grpAccounts.length}
              </span>
            </div>
            {grpAccounts.map(acc => (
              <RiskCard key={acc.id} account={acc} onFix={() => onViewAccount(acc)} />
            ))}
          </div>
        );
      })}

      {accounts.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: C.secondary }}>
          <div style={{ fontSize: 32, opacity: 0.3 }}>🛡️</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>Inga master-konton registrerade</div>
          <div style={{ fontSize: 13, color: C.tertiary, marginTop: 4 }}>Lägg till era kritiska tjänster för att se riskanalys</div>
        </div>
      )}
    </div>
  );
}

// ─── View 2: Master Accounts List ────────────────────────────────────────────

const BEST_PRACTICES: Record<string, { tips: string[]; tool: string }> = {
  GitHub: {
    tips: [
      "Skapa ett github.com/[orgnamn]-org och bjud in individer som members, inte owners",
      "Aktivera team-ägare — aldrig en enskild person",
      "Sätt branch protection rules på main/master",
      "Aktivera SAML SSO om möjligt",
    ],
    tool: "github.com/[org] → Settings → Members",
  },
  AWS: {
    tips: [
      "Aktivera AWS Organizations",
      "Root-konto: MFA + hardware key — används ALDRIG i vardagen",
      "IAM users för varje person, aldrig delade credentials",
      "Regelbunden access review varje kvartal",
    ],
    tool: "AWS IAM → Users → Create user",
  },
  "Google Workspace": {
    tips: [
      "admin@[domän].se som super-admin (inte person)",
      "Minst 2 super-admins alltid",
      "Aktivera Google Vault för retention",
      "Påtvinga 2FA för hela organisationen",
    ],
    tool: "admin.google.com → Security → 2-Step Verification",
  },
  Stripe: {
    tips: [
      "Använd team-ägare, restricted keys per integration",
      "Webhook endpoints på org-domän, aldrig localhost",
      "Aktivera 2FA för alla teammedlemmar",
    ],
    tool: "dashboard.stripe.com → Settings → Team",
  },
  Vercel: {
    tips: [
      "Skapa team-konto, aldrig personligt",
      "Bjud in via org-email, aldrig Gmail",
      "Audit log — granska regelbundet",
    ],
    tool: "vercel.com → Settings → Members",
  },
};

function AccountsList({
  accounts,
  orgId,
  onRefresh,
}: {
  accounts: MasterAccount[];
  orgId: string;
  onRefresh: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [form, setForm] = useState({
    service: "", display_name: "", login_email: "",
    email_is_personal: false, two_factor_enabled: false,
    two_factor_method: "", recovery_email: "",
    recovery_codes_stored: false, backup_admin_id: "", notes: "",
  });

  const handleAdd = async () => {
    const token = localStorage.getItem("pixdrift_token") ?? "";
    const res = await fetch("/api/account-safety/master-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "x-org-id": orgId },
      body: JSON.stringify({
        ...form,
        backup_admin_id: form.backup_admin_id || null,
        two_factor_method: form.two_factor_method || undefined,
        recovery_email: form.recovery_email || undefined,
      }),
    });
    if (res.ok) { setShowAdd(false); onRefresh(); }
  };

  const bp = selectedService ? BEST_PRACTICES[selectedService] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, color: C.secondary }}>{accounts.length} konton registrerade</div>
        <Btn size="sm" onClick={() => setShowAdd(!showAdd)}>+ Lägg till konto</Btn>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background: C.surface, borderRadius: 10, padding: 20, border: `0.5px solid ${C.border}`, boxShadow: shadow }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Nytt master-konto</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Tjänst", key: "service", placeholder: "GitHub, AWS, Stripe..." },
              { label: "Visningsnamn", key: "display_name", placeholder: "GitHub Organisation" },
              { label: "Inloggningsemail", key: "login_email", placeholder: "admin@novacode.se" },
              { label: "2FA-metod", key: "two_factor_method", placeholder: "authenticator / hardware_key / sms" },
              { label: "Återställningsemail", key: "recovery_email", placeholder: "backup@novacode.se" },
              { label: "Anteckningar", key: "notes", placeholder: "Valfria anteckningar..." },
            ].map(f => (
              <div key={f.key}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.secondary, marginBottom: 4 }}>{f.label}</div>
                <input
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: 8,
                    border: `0.5px solid ${C.border}`, fontSize: 13,
                    fontFamily: "inherit", background: C.fill,
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            {[
              { label: "Personlig email", key: "email_is_personal" },
              { label: "2FA aktiverat", key: "two_factor_enabled" },
              { label: "Återst.koder sparade", key: "recovery_codes_stored" },
            ].map(f => (
              <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.checked }))}
                />
                {f.label}
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <Btn onClick={handleAdd}>Spara konto</Btn>
            <Btn variant="secondary" onClick={() => setShowAdd(false)}>Avbryt</Btn>
          </div>
        </div>
      )}

      {/* Account rows */}
      <div style={{ background: C.surface, borderRadius: 10, border: `0.5px solid ${C.border}`, boxShadow: shadow, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 120px 80px 80px 100px", padding: "10px 16px", borderBottom: `0.5px solid ${C.border}`, background: C.fill }}>
          {["TJÄNST", "EMAIL", "2FA", "BACKUP", "KODER", "RISK"].map((h, i) => (
            <div key={h} style={{ fontSize: 11, fontWeight: 600, color: C.secondary, textAlign: i > 1 ? "center" : "left" }}>{h}</div>
          ))}
        </div>

        {accounts.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: C.secondary, fontSize: 13 }}>
            Inga konton registrerade ännu
          </div>
        ) : (
          accounts.map((acc, i) => (
            <div
              key={acc.id}
              onClick={() => setSelectedService(selectedService === acc.service ? null : acc.service)}
              style={{
                display: "grid", gridTemplateColumns: "160px 1fr 120px 80px 80px 100px",
                padding: "12px 16px",
                borderBottom: i < accounts.length - 1 ? `0.5px solid ${C.fill}` : "none",
                alignItems: "center", cursor: "pointer",
                background: selectedService === acc.service ? C.blue + "08" : "transparent",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{acc.service}</div>
                <div style={{ fontSize: 11, color: C.secondary }}>{acc.account_type}</div>
              </div>
              <div>
                <div style={{ fontSize: 13 }}>{acc.login_email}</div>
                {acc.email_is_personal && (
                  <div style={{ fontSize: 11, color: C.red }}>⚠️ Personlig email</div>
                )}
              </div>
              <div style={{ textAlign: "center" }}>
                {acc.two_factor_enabled ? (
                  <Badge color={acc.two_factor_method === "sms" ? C.orange : C.green}>
                    {acc.two_factor_method ?? "✓"} 
                  </Badge>
                ) : (
                  <Badge color={C.red}>Saknas</Badge>
                )}
              </div>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 16 }}>{acc.backup_admin_id ? "✅" : "❌"}</span>
              </div>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 16 }}>{acc.recovery_codes_stored ? "✅" : "❌"}</span>
              </div>
              <div style={{ textAlign: "center" }}>
                <Badge color={riskColor(acc.risk_level)}>{riskLabel(acc.risk_level)}</Badge>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Best practices panel */}
      {bp && (
        <div style={{
          background: C.blue + "08", borderRadius: 10,
          border: `0.5px solid ${C.blue}30`, padding: 20,
          animation: "fadeIn 0.15s ease",
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            🛡️ Best practices — {selectedService}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {bp.tips.map((t, i) => (
              <div key={i} style={{ fontSize: 13, display: "flex", gap: 8 }}>
                <span style={{ color: C.green, fontWeight: 600 }}>✓</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: C.secondary }}>
            Verktyg: <span style={{ color: C.blue }}>{bp.tool}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── View 3: Offboarding Wizard ───────────────────────────────────────────────

function OffboardingWizard({ orgId, onRefresh }: { orgId: string; onRefresh: () => void }) {
  const [step, setStep] = useState(1);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [exitDate, setExitDate] = useState("");
  const [checklist, setChecklist] = useState<OffboardingChecklist | null>(null);
  const [checklists, setChecklists] = useState<OffboardingChecklist[]>([]);
  const [selectedChecklist, setSelectedChecklist] = useState<OffboardingChecklist | null>(null);
  const [loading, setLoading] = useState(false);

  const token = () => localStorage.getItem("pixdrift_token") ?? "";
  const headers = () => ({ "Content-Type": "application/json", "Authorization": `Bearer ${token()}`, "x-org-id": orgId });

  useEffect(() => {
    fetch("/api/account-safety/offboarding", { headers: headers() })
      .then(r => r.json())
      .then(d => Array.isArray(d) && setChecklists(d))
      .catch(() => {});
  }, [orgId]);

  const startOffboarding = async () => {
    setLoading(true);
    const id = userId || `user-${Date.now()}`;
    const res = await fetch("/api/account-safety/offboarding", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ user_id: id, user_name: userName, user_email: userEmail, exit_date: exitDate }),
    });
    if (res.ok) {
      const data = await res.json();
      setChecklist(data);
      setStep(2);
      onRefresh();
    }
    setLoading(false);
  };

  const markItem = async (checklistId: string, itemId: string, status: "done" | "skipped" | "pending") => {
    const res = await fetch(`https://api.bc.pixdrift.com/api/account-safety/offboarding/${checklistId}/items/${itemId}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      if (checklist?.id === checklistId) setChecklist(data);
      if (selectedChecklist?.id === checklistId) setSelectedChecklist(data);
      setChecklists(prev => prev.map(c => c.id === checklistId ? data : c));
    }
  };

  const activeChecklist = selectedChecklist ?? checklist;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Existing checklists */}
      {checklists.length > 0 && !checklist && (
        <div style={{ background: C.surface, borderRadius: 10, border: `0.5px solid ${C.border}`, boxShadow: shadow, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `0.5px solid ${C.border}`, background: C.fill }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Aktiva offboardings</div>
          </div>
          {checklists.map((cl, i) => {
            const items: OffboardingItem[] = cl.items ?? [];
            const done = items.filter(it => it.status === "done" || it.status === "skipped").length;
            const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
            return (
              <div
                key={cl.id}
                onClick={() => setSelectedChecklist(cl)}
                style={{
                  padding: "12px 16px", cursor: "pointer",
                  borderBottom: i < checklists.length - 1 ? `0.5px solid ${C.fill}` : "none",
                  background: selectedChecklist?.id === cl.id ? C.blue + "08" : "transparent",
                  display: "flex", alignItems: "center", gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{cl.user_name ?? cl.user_email ?? "Okänd"}</div>
                  <div style={{ fontSize: 12, color: C.secondary }}>
                    Avslut: {cl.exit_date ?? "—"} · {done}/{items.length} klara
                  </div>
                </div>
                <div style={{ width: 80, height: 4, background: C.fill, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? C.green : C.blue, borderRadius: 2 }} />
                </div>
                <Badge color={cl.status === "completed" || cl.status === "verified" ? C.green : cl.status === "in_progress" ? C.blue : C.secondary}>
                  {cl.status === "completed" ? "Klar" : cl.status === "verified" ? "Verifierad" : cl.status === "in_progress" ? "Pågår" : "Väntande"}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* Active checklist progress view */}
      {activeChecklist && (
        <div style={{ background: C.surface, borderRadius: 10, border: `0.5px solid ${C.border}`, boxShadow: shadow }}>
          <div style={{ padding: "16px 20px", borderBottom: `0.5px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  Offboarding: {activeChecklist.user_name ?? activeChecklist.user_email}
                </div>
                <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
                  Avslutsdatum: {activeChecklist.exit_date ?? "—"}
                </div>
              </div>
              {(() => {
                const items: OffboardingItem[] = activeChecklist.items ?? [];
                const done = items.filter(it => it.status === "done" || it.status === "skipped").length;
                const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
                return (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: pct === 100 ? C.green : C.blue }}>{pct}%</div>
                    <div style={{ fontSize: 12, color: C.secondary }}>{done}/{items.length} klara</div>
                  </div>
                );
              })()}
            </div>
            {/* Progress bar */}
            {(() => {
              const items: OffboardingItem[] = activeChecklist.items ?? [];
              const done = items.filter(it => it.status === "done" || it.status === "skipped").length;
              const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
              return (
                <div style={{ marginTop: 12, height: 4, background: C.fill, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? C.green : C.blue, borderRadius: 2, transition: "width 0.3s ease" }} />
                </div>
              );
            })()}
          </div>

          {/* Items */}
          <div style={{ padding: "0 4px" }}>
            {(activeChecklist.items ?? []).map((item: OffboardingItem, i: number, arr: OffboardingItem[]) => (
              <div
                key={item.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px",
                  borderBottom: i < arr.length - 1 ? `0.5px solid ${C.fill}` : "none",
                  opacity: item.status === "skipped" ? 0.5 : 1,
                }}
              >
                {/* Status toggle */}
                <div
                  onClick={() => markItem(activeChecklist.id, item.id, item.status === "done" ? "pending" : "done")}
                  style={{
                    width: 22, height: 22, borderRadius: 6,
                    border: `2px solid ${item.status === "done" ? C.green : C.border}`,
                    background: item.status === "done" ? C.green : "transparent",
                    cursor: "pointer", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {item.status === "done" && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500,
                    textDecoration: item.status === "done" ? "line-through" : "none",
                    color: item.status === "done" ? C.secondary : C.text,
                  }}>
                    {item.action}
                  </div>
                  <div style={{ fontSize: 11, color: C.secondary, marginTop: 2 }}>{item.service}</div>
                </div>

                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => markItem(activeChecklist.id, item.id, item.status === "skipped" ? "pending" : "skipped")}
                  style={{ fontSize: 11 }}
                >
                  {item.status === "skipped" ? "Ångra" : "Hoppa över"}
                </Btn>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New offboarding form */}
      {step === 1 && (
        <div style={{ background: C.surface, borderRadius: 10, border: `0.5px solid ${C.border}`, padding: 20, boxShadow: shadow }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>🚪 Starta ny offboarding</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Namn", val: userName, set: setUserName, ph: "Jonas Karlsson" },
              { label: "Email", val: userEmail, set: setUserEmail, ph: "jonas@novacode.se" },
              { label: "User ID (valfritt)", val: userId, set: setUserId, ph: "UUID eller lämna tomt" },
              { label: "Avslutsdatum", val: exitDate, set: setExitDate, ph: "", type: "date" },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.secondary, marginBottom: 4 }}>{f.label}</div>
                <input
                  type={(f as any).type ?? "text"}
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.ph}
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: 8,
                    border: `0.5px solid ${C.border}`, fontSize: 13,
                    fontFamily: "inherit", background: C.fill,
                  }}
                />
              </div>
            ))}
          </div>

          <Btn
            onClick={startOffboarding}
            style={{ marginTop: 16 }}
          >
            {loading ? "Genererar checklist..." : "Generera offboarding-checklist →"}
          </Btn>
        </div>
      )}
    </div>
  );
}

// ─── View 4: Best Practices Guide ────────────────────────────────────────────

const FULL_GUIDE = [
  {
    service: "GitHub",
    icon: "🐙",
    items: [
      { ok: true, text: "Skapa org-konto (github.com/[orgnamn]) — aldrig personligt" },
      { ok: true, text: "Bjud in individer som members, inte owners" },
      { ok: true, text: "Branch protection rules på main/master" },
      { ok: true, text: "SAML SSO om organisationen har Google Workspace" },
      { ok: true, text: "Minst 2 owners i org (aldrig bara 1)" },
      { ok: false, text: "Personliga repos med produktionskod — flytta till org" },
    ],
    tool: "github.com/[org] → Settings → Members",
    critical: "Om grundaren är enda ägaren och slutar — organisationen förlorar repos!",
  },
  {
    service: "AWS",
    icon: "☁️",
    items: [
      { ok: true, text: "Aktivera AWS Organizations för multi-account structure" },
      { ok: true, text: "Root-konto: MFA med hardware key (YubiKey) — används ALDRIG" },
      { ok: true, text: "IAM users för varje person — aldrig delade credentials" },
      { ok: true, text: "Regelbunden access review varje kvartal" },
      { ok: true, text: "CloudTrail aktiverat i alla regioner" },
      { ok: false, text: "Root-kontot på personlig email" },
    ],
    tool: "AWS IAM → Users → Access Analyzer",
    critical: "Root-kontot på personlig email = kritisk risk. En person kan låsa hela infrastrukturen.",
  },
  {
    service: "Google Workspace",
    icon: "📧",
    items: [
      { ok: true, text: "admin@[domän].se som super-admin (roll, inte person)" },
      { ok: true, text: "Minst 2 super-admins alltid aktiva" },
      { ok: true, text: "Aktivera Google Vault för email retention" },
      { ok: true, text: "Tvinga 2FA för alla användare" },
      { ok: false, text: "@gmail.com-adresser för inloggning på tredjepartstjänster" },
    ],
    tool: "admin.google.com → Security → 2-Step Verification",
    critical: "Om enda super-admins lämnar — kontakta Google Support med domänägarens bevis.",
  },
  {
    service: "Stripe",
    icon: "💳",
    items: [
      { ok: true, text: "Team-ägare — aldrig en enskild persons konto" },
      { ok: true, text: "Restricted API keys per integration (aldrig secret key)" },
      { ok: true, text: "Webhook endpoints på org-domän" },
      { ok: true, text: "Aktivera 2FA för alla teammedlemmar" },
      { ok: false, text: "Secret API key i kod eller .env utan rotation" },
    ],
    tool: "dashboard.stripe.com → Settings → Team → Invite",
    critical: "Stripe-kontot på personlig Gmail = om den personen förlorar access förlorar ni betalningar.",
  },
];

function BestPracticesGuide() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 13, color: C.secondary, marginBottom: 4 }}>
        Klicka på en tjänst för detaljerade riktlinjer
      </div>

      {FULL_GUIDE.map(guide => {
        const isOpen = expanded === guide.service;
        return (
          <div
            key={guide.service}
            style={{
              background: C.surface, borderRadius: 10,
              border: `0.5px solid ${isOpen ? C.blue : C.border}`,
              boxShadow: shadow, overflow: "hidden",
            }}
          >
            <div
              onClick={() => setExpanded(isOpen ? null : guide.service)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "16px 20px", cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 20 }}>{guide.icon}</span>
              <div style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{guide.service}</div>
              <span style={{ color: C.secondary, fontSize: 18 }}>{isOpen ? "›" : "›"}</span>
            </div>

            {isOpen && (
              <div style={{ padding: "0 20px 20px", borderTop: `0.5px solid ${C.fill}` }}>
                {/* Alert */}
                <div style={{
                  background: C.orange + "12", borderRadius: 8, padding: "10px 14px",
                  marginTop: 16, marginBottom: 16,
                  border: `0.5px solid ${C.orange}30`,
                  fontSize: 12, color: C.orange, fontWeight: 500,
                }}>
                  ⚠️ {guide.critical}
                </div>

                {/* Checklist */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {guide.items.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13 }}>
                      <span style={{ color: item.ok ? C.green : C.red, fontWeight: 700, flexShrink: 0 }}>
                        {item.ok ? "✓" : "✗"}
                      </span>
                      <span style={{ color: item.ok ? C.text : C.secondary }}>{item.text}</span>
                    </div>
                  ))}
                </div>

                {/* Tool */}
                <div style={{ marginTop: 16, padding: "8px 12px", background: C.fill, borderRadius: 8, fontSize: 12, color: C.secondary }}>
                  🛠️ Verktyg: <span style={{ color: C.blue }}>{guide.tool}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Module ──────────────────────────────────────────────────────────────

export default function AccountSafetyModule({ orgId }: { orgId?: string }) {
  const [tab, setTab] = useState<"risk" | "accounts" | "offboarding" | "guide">("risk");
  const [accounts, setAccounts] = useState<MasterAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const effectiveOrgId = orgId ?? "00000000-0000-0000-0000-000000000001";
  const token = localStorage.getItem("pixdrift_token") ?? "";
  const headers = { "Authorization": `Bearer ${token}`, "x-org-id": effectiveOrgId };

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const [accRes, recRes] = await Promise.all([
        fetch("/api/account-safety/master-accounts", { headers }),
        fetch("/api/account-safety/recommendations", { headers }),
      ]);
      if (accRes.ok) setAccounts(await accRes.json());
      if (recRes.ok) {
        const d = await recRes.json();
        setRecommendations(d.recommendations ?? []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadAccounts(); }, [effectiveOrgId]);

  const criticalCount = accounts.filter(a => a.risk_level === "critical").length;
  const highCount = accounts.filter(a => a.risk_level === "high").length;

  const tabs = [
    { id: "risk" as const, label: "Riskdashboard", badge: criticalCount > 0 ? `${criticalCount}` : null, badgeColor: C.red },
    { id: "accounts" as const, label: "Master Accounts", badge: null, badgeColor: "" },
    { id: "offboarding" as const, label: "Offboarding", badge: null, badgeColor: "" },
    { id: "guide" as const, label: "Best Practices", badge: null, badgeColor: "" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Recommendations banner */}
      {recommendations.length > 0 && (
        <div style={{
          background: C.orange + "12", borderRadius: 10, padding: "14px 16px",
          border: `0.5px solid ${C.orange}30`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.orange, marginBottom: 8 }}>
            💡 {recommendations.length} rekommendationer
          </div>
          {recommendations.slice(0, 3).map((r, i) => (
            <div key={i} style={{ fontSize: 12, color: C.text, marginBottom: 4 }}>• {r}</div>
          ))}
          {recommendations.length > 3 && (
            <div style={{ fontSize: 12, color: C.secondary }}>...och {recommendations.length - 3} till</div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: C.fill, borderRadius: 10, padding: 4 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, height: 36, borderRadius: 8,
              border: "none", cursor: "pointer",
              background: tab === t.id ? C.surface : "transparent",
              color: tab === t.id ? C.text : C.secondary,
              fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              fontFamily: "inherit",
              boxShadow: tab === t.id ? shadow : "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "all 0.15s ease",
            }}
          >
            {t.label}
            {t.badge && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 8,
                background: t.badgeColor, color: "#fff",
              }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: C.secondary, fontSize: 14 }}>
          Laddar kontosäkerhet...
        </div>
      ) : (
        <>
          {tab === "risk" && (
            <RiskDashboard
              accounts={accounts}
              onViewAccount={() => setTab("accounts")}
            />
          )}
          {tab === "accounts" && (
            <AccountsList
              accounts={accounts}
              orgId={effectiveOrgId}
              onRefresh={loadAccounts}
            />
          )}
          {tab === "offboarding" && (
            <OffboardingWizard orgId={effectiveOrgId} onRefresh={loadAccounts} />
          )}
          {tab === "guide" && <BestPracticesGuide />}
        </>
      )}

      {/* Demo seed button (dev only) */}
      {accounts.length === 0 && tab === "risk" && (
        <div style={{ textAlign: "center", paddingTop: 8 }}>
          <Btn
            variant="secondary"
            size="sm"
            onClick={async () => {
              const res = await fetch("/api/account-safety/demo-seed", {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
              });
              if (res.ok) loadAccounts();
            }}
          >
            🧪 Ladda demo-data (Novacode AB)
          </Btn>
        </div>
      )}
    </div>
  );
}
