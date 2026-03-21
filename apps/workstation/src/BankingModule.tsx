import { useState, useEffect, useCallback } from "react";

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "https://api.bc.pixdrift.com";

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = localStorage.getItem("pixdrift_token");
  const headers: HeadersInit = { "Content-Type": "application/json", ...(options.headers ?? {}) };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

const api = {
  get: (path: string) => apiFetch(path),
  post: (path: string, body: unknown) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
};

// ─── Design tokens (same as Dashboard.tsx) ────────────────────────────────────
const C = {
  bg: "#F5F5F7",
  surface: "#FFFFFF",
  elevated: "#FAFAFA",
  border: "#E5E5EA",
  separator: "#F2F2F7",
  text: "#1D1D1F",
  secondary: "#86868B",
  tertiary: "#AEAEB2",
  blue: "#007AFF",
  blueLight: "#E8F3FF",
  green: "#34C759",
  greenLight: "#E8F8ED",
  yellow: "#FF9500",
  yellowLight: "#FFF3E0",
  red: "#FF3B30",
  redLight: "#FFF0EF",
  purple: "#AF52DE",
  purpleLight: "#F5EEFF",
  fill: "#F2F2F7",
  orange: "#FF6B35",
};

const shadow = {
  sm: "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.04)",
  md: "0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
  lg: "0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
};

const globalStyles = `
  @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes spin    { to { transform: rotate(360deg); } }
  .banking-animate { animation: slideUp 0.2s ease forwards; }
  .banking-fade { animation: fadeIn 0.15s ease forwards; }
  .banking-row:hover { background: ${C.fill}; transition: background 0.1s; }
  .banking-card:hover { box-shadow: ${shadow.lg}!important; transform: translateY(-1px); transition: all 0.2s; }
  .banking-btn:hover { opacity: 0.88; transform: translateY(-1px); }
  .banking-btn:active { transform: scale(0.97); }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number, currency = "SEK") =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency, minimumFractionDigits: 2 }).format(n ?? 0);

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" }) : "—";

const statusBadge = (status: string) => {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending:    { bg: C.yellowLight, color: C.yellow,  label: "VÄNTAR" },
    approved:   { bg: C.blueLight,   color: C.blue,    label: "GODKÄND" },
    sent:       { bg: C.purpleLight, color: C.purple,  label: "SKICKAD" },
    completed:  { bg: C.greenLight,  color: C.green,   label: "KLAR" },
    failed:     { bg: C.redLight,    color: C.red,     label: "FEL" },
    cancelled:  { bg: C.fill,        color: C.tertiary,label: "AVBRUTEN" },
    active:     { bg: C.greenLight,  color: C.green,   label: "AKTIV" },
    expired:    { bg: C.redLight,    color: C.red,     label: "UTGÅNGEN" },
    unmatched:  { bg: C.yellowLight, color: C.yellow,  label: "EJ MATCHAD" },
    matched:    { bg: C.greenLight,  color: C.green,   label: "MATCHAD" },
    posted:     { bg: C.blueLight,   color: C.blue,    label: "BOKFÖRD" },
    ignored:    { bg: C.fill,        color: C.tertiary,label: "IGNORERAD" },
    open:       { bg: C.yellowLight, color: C.yellow,  label: "ÖPPEN" },
    reconciled: { bg: C.greenLight,  color: C.green,   label: "AVSTÄMD" },
    disputed:   { bg: C.redLight,    color: C.red,     label: "TVISTIG" },
  };
  const s = map[status] ?? { bg: C.fill, color: C.secondary, label: status?.toUpperCase() };
  return (
    <span style={{
      background: s.bg, color: s.color, fontSize: 10, fontWeight: 700,
      letterSpacing: "0.06em", borderRadius: 5, padding: "2px 7px",
    }}>{s.label}</span>
  );
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  Bank: () => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/>
      <line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/>
      <line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/>
    </svg>
  ),
  Card: () => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  Plus: () => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Refresh: () => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
  Check: () => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Link2: () => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  Shield: () => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  BalanceScale: () => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="3" x2="12" y2="21"/><path d="M3 6l3 6c0 1.7-1.3 3-3 3s-3-1.3-3-3l3-6z"/>
      <path d="M21 6l3 6c0 1.7-1.3 3-3 3s-3-1.3-3-3l3-6z"/><line x1="8" y1="21" x2="16" y2="21"/>
    </svg>
  ),
  Briefcase: () => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  X: () => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  Send: () => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
};

// ─── Bank logo placeholder ────────────────────────────────────────────────────
const BankLogo = ({ name, color }: { name: string; color?: string }) => (
  <div style={{
    width: 40, height: 40, borderRadius: 10, background: color ?? C.fill,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: 700, color: color ? "#fff" : C.secondary,
    flexShrink: 0, letterSpacing: -0.5,
  }}>
    {name.substring(0, 2).toUpperCase()}
  </div>
);

// ─── Provider logo ────────────────────────────────────────────────────────────
const ProviderLogo = ({ name, color }: { name: string; color: string }) => (
  <div style={{
    width: 36, height: 36, borderRadius: 8, background: color,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
  }}>
    {name.substring(0, 2).toUpperCase()}
  </div>
);

// ─── Loading Spinner ──────────────────────────────────────────────────────────
const Spinner = ({ size = 16 }: { size?: number }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%",
    border: `2px solid ${C.border}`, borderTopColor: C.blue,
    animation: "spin 0.8s linear infinite", flexShrink: 0,
  }} />
);

// ─── Modal wrapper ────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <div style={{
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20,
  }} onClick={onClose}>
    <div style={{
      background: C.surface, borderRadius: 18, boxShadow: shadow.lg,
      width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto",
    }} onClick={(e) => e.stopPropagation()}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0" }}>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: C.text }}>{title}</h3>
        <button onClick={onClose} style={{
          background: C.fill, border: "none", borderRadius: 8, width: 32, height: 32,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: C.secondary,
        }}><Icon.X /></button>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  </div>
);

// ─── Swedish banks list (for modal) ──────────────────────────────────────────
const SWEDISH_BANKS = [
  { id: "se-seb", name: "SEB", color: "#006F44" },
  { id: "se-handelsbanken", name: "Handelsbanken", color: "#003B6F" },
  { id: "se-nordea", name: "Nordea", color: "#00005E" },
  { id: "se-swedbank", name: "Swedbank", color: "#FF6600" },
  { id: "se-lansforsakringar", name: "Länsförsäkringar", color: "#005AA0" },
  { id: "se-ica", name: "ICA Banken", color: "#D32926" },
  { id: "se-klarna", name: "Klarna", color: "#FFB3C7" },
  { id: "se-revolut", name: "Revolut", color: "#0075EB" },
  { id: "se-danske", name: "Danske Bank", color: "#003755" },
  { id: "se-sparbanken", name: "Sparbanken Skåne", color: "#1B5E97" },
];

const ACCOUNTING_PROVIDERS = [
  { id: "fortnox", name: "Fortnox", color: "#1A73E8", desc: "Marknadsledande för svenska SMB" },
  { id: "visma", name: "Visma e-conomic", color: "#0033A0", desc: "Nordisk standard" },
  { id: "pe_accounting", name: "PE Accounting", color: "#6C3483", desc: "Medelstora företag" },
];

// ─── Tab navigation ───────────────────────────────────────────────────────────
const TABS = [
  { id: "accounts",       label: "Konton",       icon: <Icon.Bank /> },
  { id: "transactions",   label: "Transaktioner", icon: <Icon.Card /> },
  { id: "payments",       label: "Betalningar",   icon: <Icon.Send /> },
  { id: "reconciliation", label: "Avstämning",    icon: <Icon.BalanceScale /> },
  { id: "integrations",   label: "Integrationer", icon: <Icon.Briefcase /> },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function BankingModule() {
  
  const [activeTab, setActiveTab] = useState("accounts");

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: C.text }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <Icon.Bank />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text }}>Banking</h1>
          </div>
          <p style={{ color: C.secondary, fontSize: 14 }}>Koppla bankkonton, hantera betalningar och stäm av mot bokföringen.</p>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, background: C.surface, borderRadius: 12, padding: 4, boxShadow: shadow.sm, marginBottom: 24, overflowX: "auto" }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "8px 16px",
              borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
              background: activeTab === tab.id ? C.blue : "transparent",
              color: activeTab === tab.id ? "#fff" : C.secondary,
              transition: "all 0.15s", whiteSpace: "nowrap",
            }}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "accounts"       && <AccountsView />}
        {activeTab === "transactions"   && <TransactionsView />}
        {activeTab === "payments"       && <PaymentsView />}
        {activeTab === "reconciliation" && <ReconciliationView />}
        {activeTab === "integrations"   && <IntegrationsView />}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNTS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function AccountsView() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectingBank, setConnectingBank] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/banking/accounts");
      setAccounts(res.accounts ?? []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post("/api/banking/sync", {});
      await load();
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectBank = async (bankId: string) => {
    setConnectingBank(bankId);
    try {
      const res = await api.get(`/api/banking/connect?bank_id=${bankId}`);
      if (res.url) window.open(res.url, "_blank");
    } finally {
      setConnectingBank(null);
      setShowConnectModal(false);
    }
  };

  const totalBalance = accounts.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);

  return (
    <div className="banking-animate">
      {/* Summary card */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: C.surface, borderRadius: 14, padding: 20, boxShadow: shadow.sm }}>
          <p style={{ fontSize: 12, color: C.secondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Totalt saldo</p>
          <p style={{ fontSize: 26, fontWeight: 700, color: C.text }}>{fmt(totalBalance)}</p>
          <p style={{ fontSize: 12, color: C.secondary, marginTop: 4 }}>Alla kopplade konton</p>
        </div>
        <div style={{ background: C.surface, borderRadius: 14, padding: 20, boxShadow: shadow.sm }}>
          <p style={{ fontSize: 12, color: C.secondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Kopplade konton</p>
          <p style={{ fontSize: 26, fontWeight: 700, color: C.text }}>{accounts.length}</p>
          <p style={{ fontSize: 12, color: C.secondary, marginTop: 4 }}>Aktiva bankförbindelser</p>
        </div>
        <div style={{ background: C.surface, borderRadius: 14, padding: 20, boxShadow: shadow.sm, border: `1.5px solid ${C.blue}22` }}>
          <p style={{ fontSize: 12, color: C.blue, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Open Banking</p>
          <p style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>PSD2-koppling via Tink (Visa). Täcker 3 500+ banker i Europa.</p>
        </div>
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
        <button onClick={() => setShowConnectModal(true)} className="banking-btn" style={{
          background: C.blue, color: "#fff", border: "none", borderRadius: 10,
          padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 7,
        }}>
          <Icon.Plus /> Koppla bank
        </button>
        <button onClick={handleSync} disabled={syncing} className="banking-btn" style={{
          background: C.surface, color: C.text, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 500,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
        }}>
          {syncing ? <Spinner size={14} /> : <Icon.Refresh />}
          Synka alla
        </button>
      </div>

      {/* Accounts list */}
      <div style={{ background: C.surface, borderRadius: 14, boxShadow: shadow.sm, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 48, display: "flex", justifyContent: "center" }}><Spinner size={24} /></div>
        ) : accounts.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏦</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>Inga kopplade bankkonton</p>
            <p style={{ fontSize: 14, color: C.secondary, marginBottom: 20 }}>Koppla ditt bankkonto för att importera transaktioner automatiskt.</p>
            <button onClick={() => setShowConnectModal(true)} style={{
              background: C.blue, color: "#fff", border: "none", borderRadius: 10,
              padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>Koppla bank</button>
          </div>
        ) : (
          accounts.map((account, i) => (
            <div key={account.id} className="banking-row" style={{
              display: "flex", alignItems: "center", padding: "16px 20px", gap: 16,
              borderBottom: i < accounts.length - 1 ? `1px solid ${C.separator}` : "none",
            }}>
              <BankLogo name={account.bank_name ?? "???"} color={SWEDISH_BANKS.find(b => account.bank_name?.includes(b.name.split(" ")[0]))?.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{account.account_name ?? "Okänt konto"}</p>
                  {statusBadge(account.status ?? "active")}
                </div>
                <p style={{ fontSize: 12, color: C.secondary }}>
                  {account.bank_name} {account.iban ? `• ${account.iban}` : account.account_number ? `• ${account.account_number}` : ""}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{fmt(parseFloat(account.balance ?? 0), account.currency ?? "SEK")}</p>
                <p style={{ fontSize: 11, color: C.tertiary }}>
                  {account.balance_updated_at ? fmtDate(account.balance_updated_at) : "—"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Connect bank modal */}
      {showConnectModal && (
        <Modal title="Koppla bankkonto" onClose={() => setShowConnectModal(false)}>
          <p style={{ fontSize: 13, color: C.secondary, marginBottom: 20 }}>
            Välj din bank. Du omdirigeras till bankens säkra inloggning via Open Banking (PSD2).
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {SWEDISH_BANKS.map((bank) => (
              <button key={bank.id} onClick={() => handleConnectBank(bank.id)} disabled={connectingBank === bank.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface,
                cursor: "pointer", textAlign: "left", transition: "all 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = C.blue)}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = C.border)}>
                <BankLogo name={bank.name} color={bank.color} />
                <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{bank.name}</span>
                {connectingBank === bank.id && <Spinner size={12} />}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: "12px 14px", background: C.fill, borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <Icon.Shield />
              <p style={{ fontSize: 12, color: C.secondary, lineHeight: 1.5 }}>
                <strong>PSD2-säkert:</strong> Du delar aldrig bankuppgifter med pixdrift. Inloggning sker direkt hos din bank via Tink (Visa).
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTIONS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function TransactionsView() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categorizing, setCategorizing] = useState(false);
  const [filter, setFilter] = useState({ status: "", from_date: "", to_date: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set("status", filter.status);
      if (filter.from_date) params.set("from_date", filter.from_date);
      if (filter.to_date) params.set("to_date", filter.to_date);
      const res = await api.get(`/api/banking/transactions?${params}`);
      setTransactions(res.transactions ?? []);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [api, filter]);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === transactions.length) setSelected(new Set());
    else setSelected(new Set(transactions.map((t) => t.id)));
  };

  const handleCategorize = async () => {
    const ids = selected.size > 0 ? Array.from(selected) : transactions.filter(t => !t.suggested_bas_account).map(t => t.id);
    if (!ids.length) return;
    setCategorizing(true);
    try {
      await api.post("/api/banking/categorize", { transaction_ids: ids });
      await load();
      setSelected(new Set());
    } finally {
      setCategorizing(false);
    }
  };

  const handlePost = async (txId: string, basAccount?: string) => {
    try {
      await api.post(`/api/banking/transactions/${txId}/post`, { bas_account: basAccount });
      await load();
    } catch (e) {
      console.error(e);
    }
  };

  const unmatchedCount = transactions.filter(t => t.status === "unmatched").length;

  return (
    <div className="banking-animate">
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Totalt", value: transactions.length, color: C.text },
          { label: "Ej matchade", value: unmatchedCount, color: unmatchedCount > 0 ? C.yellow : C.green },
          { label: "Matchade", value: transactions.filter(t => t.status === "matched").length, color: C.green },
          { label: "Bokförda", value: transactions.filter(t => t.status === "posted").length, color: C.blue },
        ].map((stat) => (
          <div key={stat.label} style={{ background: C.surface, borderRadius: 12, padding: "14px 16px", boxShadow: shadow.sm }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</p>
            <p style={{ fontSize: 12, color: C.secondary }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <select value={filter.status} onChange={(e) => setFilter(f => ({ ...f, status: e.target.value }))} style={{
          border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 13,
          background: C.surface, color: C.text, cursor: "pointer",
        }}>
          <option value="">Alla statusar</option>
          <option value="unmatched">Ej matchad</option>
          <option value="matched">Matchad</option>
          <option value="posted">Bokförd</option>
          <option value="ignored">Ignorerad</option>
        </select>
        <input type="date" value={filter.from_date} onChange={(e) => setFilter(f => ({ ...f, from_date: e.target.value }))} style={{
          border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 13,
          background: C.surface, color: C.text,
        }} />
        <input type="date" value={filter.to_date} onChange={(e) => setFilter(f => ({ ...f, to_date: e.target.value }))} style={{
          border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 13,
          background: C.surface, color: C.text,
        }} />
        {selected.size > 0 && (
          <>
            <span style={{ fontSize: 13, color: C.secondary }}>{selected.size} valda</span>
            <button onClick={handleCategorize} disabled={categorizing} style={{
              background: C.blue, color: "#fff", border: "none", borderRadius: 8,
              padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {categorizing ? <Spinner size={12} /> : null}
              AI-kategorisera
            </button>
          </>
        )}
        {selected.size === 0 && unmatchedCount > 0 && (
          <button onClick={handleCategorize} disabled={categorizing} style={{
            background: C.purple, color: "#fff", border: "none", borderRadius: 8,
            padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6, marginLeft: "auto",
          }}>
            {categorizing ? <Spinner size={12} /> : null}
            Kategorisera alla ({unmatchedCount})
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: C.surface, borderRadius: 14, boxShadow: shadow.sm, overflow: "hidden" }}>
        {/* Table header */}
        <div style={{
          display: "grid", gridTemplateColumns: "32px 100px 1fr 110px 110px 100px",
          padding: "10px 16px", borderBottom: `1px solid ${C.separator}`,
          background: C.elevated,
        }}>
          <input type="checkbox" checked={selected.size === transactions.length && transactions.length > 0} onChange={selectAll} />
          {["Datum", "Beskrivning", "Belopp", "BAS-förslag", "Status"].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: C.secondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 48, display: "flex", justifyContent: "center" }}><Spinner size={24} /></div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Inga transaktioner</p>
            <p style={{ fontSize: 13, color: C.secondary, marginTop: 6 }}>Synka dina bankkonton för att se transaktioner här.</p>
          </div>
        ) : transactions.map((tx, i) => {
          const amount = parseFloat(tx.amount);
          const isExpense = amount < 0;
          return (
            <div key={tx.id} className="banking-row" style={{
              display: "grid", gridTemplateColumns: "32px 100px 1fr 110px 110px 100px",
              padding: "12px 16px", alignItems: "center",
              borderBottom: i < transactions.length - 1 ? `1px solid ${C.separator}` : "none",
            }}>
              <input type="checkbox" checked={selected.has(tx.id)} onChange={() => toggleSelect(tx.id)} />
              <span style={{ fontSize: 12, color: C.secondary }}>{fmtDate(tx.date)}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 1 }}>
                  {tx.merchant_name || tx.description || "—"}
                </p>
                {tx.merchant_name && tx.description && tx.description !== tx.merchant_name && (
                  <p style={{ fontSize: 11, color: C.tertiary }}>{tx.description}</p>
                )}
              </div>
              <span style={{
                fontSize: 14, fontWeight: 600,
                color: isExpense ? C.red : C.green,
              }}>
                {isExpense ? "" : "+"}{fmt(amount, tx.currency ?? "SEK")}
              </span>
              <div>
                {tx.suggested_bas_account ? (
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: C.blue, background: C.blueLight, padding: "2px 8px", borderRadius: 5 }}>
                    {tx.suggested_bas_account}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: C.tertiary }}>—</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {statusBadge(tx.status ?? "unmatched")}
                {tx.status === "unmatched" && tx.suggested_bas_account && (
                  <button onClick={() => handlePost(tx.id, tx.suggested_bas_account)} style={{
                    background: C.green, color: "#fff", border: "none", borderRadius: 6,
                    padding: "3px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  }}>Bokför</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function PaymentsView() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [form, setForm] = useState({ payment_type: "sepa", amount: "", currency: "SEK", recipient_name: "", recipient_iban: "", recipient_bankgiro: "", reference: "", scheduled_date: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/banking/payments");
      setPayments(res.payments ?? []);
    } catch { setPayments([]); } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.amount || (!form.recipient_iban && !form.recipient_bankgiro)) return;
    setSubmitting(true);
    try {
      if (form.payment_type === "sepa") {
        await api.post("/api/banking/sepa/payment", form);
      } else if (form.payment_type === "bgc" || form.payment_type === "bankgiro") {
        await api.post("/api/banking/payments", form);
      } else if (form.payment_type === "swish") {
        await api.post("/api/banking/swish/payment-request", { amount: form.amount, phone_number: form.recipient_iban, message: form.reference });
      }
      setShowNewPayment(false);
      setForm({ payment_type: "sepa", amount: "", currency: "SEK", recipient_name: "", recipient_iban: "", recipient_bankgiro: "", reference: "", scheduled_date: "" });
      await load();
    } finally { setSubmitting(false); }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/api/banking/payments/${id}/approve`, {});
      await load();
    } catch (e) { console.error(e); }
  };

  const requiresApproval = parseFloat(form.amount) >= 50000;

  return (
    <div className="banking-animate">
      {/* Header actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 14 }}>
          {[
            { label: "Totalt", value: payments.length },
            { label: "Väntar", value: payments.filter(p => p.status === "pending").length, color: C.yellow },
            { label: "Klara", value: payments.filter(p => p.status === "completed").length, color: C.green },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface, borderRadius: 12, padding: "12px 16px", boxShadow: shadow.sm, minWidth: 80 }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: s.color ?? C.text }}>{s.value}</p>
              <p style={{ fontSize: 11, color: C.secondary }}>{s.label}</p>
            </div>
          ))}
        </div>
        <button onClick={() => setShowNewPayment(true)} className="banking-btn" style={{
          background: C.blue, color: "#fff", border: "none", borderRadius: 10,
          padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 7,
        }}>
          <Icon.Plus /> Ny betalning
        </button>
      </div>

      {/* Payments table */}
      <div style={{ background: C.surface, borderRadius: 14, boxShadow: shadow.sm, overflow: "hidden" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 80px 120px 100px 120px 100px",
          padding: "10px 20px", borderBottom: `1px solid ${C.separator}`, background: C.elevated,
        }}>
          {["Mottagare", "Typ", "Belopp", "Datum", "Status", "Åtgärd"].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: C.secondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 48, display: "flex", justifyContent: "center" }}><Spinner size={24} /></div>
        ) : payments.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Inga betalningar</p>
            <p style={{ fontSize: 13, color: C.secondary, marginTop: 6 }}>Skapa din första betalning via "+ Ny betalning".</p>
          </div>
        ) : payments.map((p, i) => (
          <div key={p.id} className="banking-row" style={{
            display: "grid", gridTemplateColumns: "1fr 80px 120px 100px 120px 100px",
            padding: "13px 20px", alignItems: "center",
            borderBottom: i < payments.length - 1 ? `1px solid ${C.separator}` : "none",
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{p.recipient_name ?? p.recipient_iban ?? p.recipient_bankgiro ?? "—"}</p>
              <p style={{ fontSize: 11, color: C.secondary }}>{p.reference ?? "—"}</p>
            </div>
            <span style={{ fontSize: 12, textTransform: "uppercase", color: C.secondary, fontWeight: 500 }}>{p.payment_type}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{fmt(parseFloat(p.amount), p.currency)}</span>
            <span style={{ fontSize: 12, color: C.secondary }}>{p.scheduled_date ? fmtDate(p.scheduled_date) : "—"}</span>
            <div>{statusBadge(p.status)}</div>
            <div>
              {p.status === "pending" && (
                <button onClick={() => handleApprove(p.id)} style={{
                  background: C.green, color: "#fff", border: "none", borderRadius: 7,
                  padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <Icon.Check /> Godkänn
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New payment modal */}
      {showNewPayment && (
        <Modal title="Ny betalning" onClose={() => setShowNewPayment(false)}>
          {/* Payment type selector */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[["sepa", "SEPA"], ["bankgiro", "Bankgiro"], ["swish", "Swish"]].map(([type, label]) => (
              <button key={type} onClick={() => setForm(f => ({ ...f, payment_type: type }))} style={{
                flex: 1, padding: "9px 0", borderRadius: 9, fontSize: 13, fontWeight: 500,
                border: `1.5px solid ${form.payment_type === type ? C.blue : C.border}`,
                background: form.payment_type === type ? C.blueLight : C.surface,
                color: form.payment_type === type ? C.blue : C.secondary,
                cursor: "pointer",
              }}>{label}</button>
            ))}
          </div>

          {/* Form fields */}
          {[
            { label: "Mottagarens namn", key: "recipient_name", placeholder: "Företag AB" },
            ...(form.payment_type === "sepa" ? [
              { label: "IBAN", key: "recipient_iban", placeholder: "SE12 1234 5678 9012 3456 7890" },
            ] : form.payment_type === "bankgiro" ? [
              { label: "Bankgiro", key: "recipient_bankgiro", placeholder: "1234-5678" },
            ] : [
              { label: "Telefonnummer", key: "recipient_iban", placeholder: "07X XXX XX XX" },
            ]),
            { label: "Belopp (SEK)", key: "amount", placeholder: "0.00", type: "number" },
            { label: "Referens / OCR", key: "reference", placeholder: "Faktura #1234" },
            { label: "Betaldatum", key: "scheduled_date", placeholder: "", type: "date" },
          ].map((field) => (
            <div key={field.key} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.secondary, marginBottom: 5 }}>{field.label}</label>
              <input
                type={field.type ?? "text"}
                value={(form as any)[field.key]}
                onChange={(e) => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                style={{
                  width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: "9px 12px", fontSize: 13, background: C.surface, color: C.text,
                }}
              />
            </div>
          ))}

          {requiresApproval && (
            <div style={{ background: C.yellowLight, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: C.yellow, fontWeight: 600 }}>{"⚠ Belopp > 50 000 kr kräver 2 godkännanden"}</p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting || !form.amount} style={{
            width: "100%", background: C.blue, color: "#fff", border: "none", borderRadius: 10,
            padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {submitting ? <Spinner size={16} /> : <Icon.Send />}
            {submitting ? "Skickar..." : "Skapa betalning"}
          </button>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECONCILIATION VIEW
// ─────────────────────────────────────────────────────────────────────────────
function ReconciliationView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showClose, setShowClose] = useState(false);
  const [closeForm, setCloseForm] = useState({ reconciliation_date: new Date().toISOString().split("T")[0], bank_balance: "", ledger_balance: "", notes: "" });
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/banking/reconciliation");
      setData(res);
    } catch { setData(null); } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleClose = async () => {
    if (!closeForm.bank_balance || !closeForm.ledger_balance) return;
    setClosing(true);
    try {
      await api.post("/api/banking/reconciliation/close", closeForm);
      setShowClose(false);
      await load();
    } finally { setClosing(false); }
  };

  const logs = data?.reconciliation_log ?? [];
  const unmatched = data?.unmatched_transactions ?? [];

  return (
    <div className="banking-animate">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: C.text }}>Bankavstämning</h2>
          <p style={{ fontSize: 13, color: C.secondary }}>Stäm av bankbalans mot bokföring månadsvis</p>
        </div>
        <button onClick={() => setShowClose(true)} style={{
          background: C.blue, color: "#fff", border: "none", borderRadius: 10,
          padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>Stäng period</button>
      </div>

      {/* Unmatched summary */}
      {unmatched.length > 0 && (
        <div style={{ background: C.yellowLight, borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.yellow }}>⚠ {unmatched.length} oavstämda transaktioner</p>
            <p style={{ fontSize: 12, color: C.secondary, marginTop: 3 }}>Matcha eller bokför dessa innan du stänger perioden.</p>
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: C.yellow }}>{unmatched.length}</span>
        </div>
      )}

      {/* Reconciliation log */}
      <div style={{ background: C.surface, borderRadius: 14, boxShadow: shadow.sm, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.separator}`, background: C.elevated }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Historik</h3>
        </div>
        {loading ? (
          <div style={{ padding: 40, display: "flex", justifyContent: "center" }}><Spinner size={24} /></div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: C.secondary }}>Ingen avstämningshistorik ännu.</p>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 120px 90px", padding: "8px 20px", borderBottom: `1px solid ${C.separator}`, background: C.elevated }}>
              {["Datum", "Bankbalans", "Bokfört", "Differens", "Status"].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 600, color: C.secondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
              ))}
            </div>
            {logs.map((log: any, i: number) => {
              const diff = parseFloat(log.difference ?? 0);
              const hasDiff = Math.abs(diff) > 0.01;
              return (
                <div key={log.id} className="banking-row" style={{
                  display: "grid", gridTemplateColumns: "120px 1fr 1fr 120px 90px",
                  padding: "13px 20px", alignItems: "center",
                  borderBottom: i < logs.length - 1 ? `1px solid ${C.separator}` : "none",
                }}>
                  <span style={{ fontSize: 13, color: C.secondary }}>{fmtDate(log.reconciliation_date)}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{fmt(parseFloat(log.bank_balance))}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{fmt(parseFloat(log.ledger_balance))}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: hasDiff ? C.red : C.green }}>
                    {hasDiff ? "" : "✓ "}{fmt(diff)}
                  </span>
                  {statusBadge(log.status)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unmatched transactions list */}
      {unmatched.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 14, boxShadow: shadow.sm, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.separator}`, background: C.elevated }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Oavstämda poster</h3>
          </div>
          {unmatched.slice(0, 20).map((tx: any, i: number) => (
            <div key={tx.id} className="banking-row" style={{
              display: "flex", padding: "12px 20px", gap: 16, alignItems: "center",
              borderBottom: i < Math.min(20, unmatched.length) - 1 ? `1px solid ${C.separator}` : "none",
            }}>
              <span style={{ fontSize: 12, color: C.secondary, width: 90, flexShrink: 0 }}>{fmtDate(tx.date)}</span>
              <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{tx.description ?? "—"}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: parseFloat(tx.amount) < 0 ? C.red : C.green }}>
                {fmt(parseFloat(tx.amount), tx.currency ?? "SEK")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Close period modal */}
      {showClose && (
        <Modal title="Stäng period" onClose={() => setShowClose(false)}>
          <p style={{ fontSize: 13, color: C.secondary, marginBottom: 20 }}>Fyll i saldot för att stänga av perioden.</p>
          {[
            { label: "Datum", key: "reconciliation_date", type: "date" },
            { label: "Bankbalans (SEK)", key: "bank_balance", type: "number", placeholder: "0.00" },
            { label: "Bokfört saldo (SEK)", key: "ledger_balance", type: "number", placeholder: "0.00" },
            { label: "Noteringar", key: "notes", placeholder: "Valfria kommentarer..." },
          ].map((f) => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.secondary, marginBottom: 5 }}>{f.label}</label>
              <input type={f.type ?? "text"} value={(closeForm as any)[f.key]}
                onChange={(e) => setCloseForm(cf => ({ ...cf, [f.key]: e.target.value }))}
                placeholder={f.placeholder ?? ""}
                style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, background: C.surface, color: C.text }} />
            </div>
          ))}

          {closeForm.bank_balance && closeForm.ledger_balance && (
            <div style={{
              background: Math.abs(parseFloat(closeForm.bank_balance) - parseFloat(closeForm.ledger_balance)) < 0.01 ? C.greenLight : C.redLight,
              borderRadius: 10, padding: "10px 14px", marginBottom: 16,
            }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: Math.abs(parseFloat(closeForm.bank_balance) - parseFloat(closeForm.ledger_balance)) < 0.01 ? C.green : C.red }}>
                Differens: {fmt(parseFloat(closeForm.bank_balance) - parseFloat(closeForm.ledger_balance))}
              </p>
            </div>
          )}

          <button onClick={handleClose} disabled={closing} style={{
            width: "100%", background: C.blue, color: "#fff", border: "none", borderRadius: 10,
            padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>
            {closing ? "Stänger..." : "Stäng period"}
          </button>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATIONS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function IntegrationsView() {
  const [status, setStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/banking/integrations/status");
      setStatus(res.integrations ?? []);
    } catch { setStatus([]); } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleConnect = async (providerId: string) => {
    try {
      const res = await api.get(`/api/integrations/${providerId}/connect`);
      if (res.url) window.open(res.url, "_blank");
    } catch (e) { console.error(e); }
  };

  const handleSync = async (providerId: string) => {
    setSyncing(providerId);
    try {
      await api.post(`/api/integrations/${providerId}/sync`, {});
      await load();
    } finally { setSyncing(null); }
  };

  return (
    <div className="banking-animate">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: C.text }}>Bokföringssystem</h2>
        <p style={{ fontSize: 13, color: C.secondary, marginTop: 4 }}>Koppla pixdrift mot ditt bokföringssystem för tvåvägssynk.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {ACCOUNTING_PROVIDERS.map((provider) => {
          const integration = status.find(s => s.id === provider.id);
          const connected = integration?.connected ?? false;
          const syncing_ = syncing === provider.id;

          return (
            <div key={provider.id} className="banking-card" style={{
              background: C.surface, borderRadius: 14, padding: 20,
              boxShadow: shadow.sm, display: "flex", alignItems: "center", gap: 16,
              border: connected ? `1.5px solid ${C.green}30` : `1px solid ${C.border}`,
            }}>
              <ProviderLogo name={provider.name} color={provider.color} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{provider.name}</h3>
                  {connected ? (
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.green, background: C.greenLight, padding: "2px 7px", borderRadius: 5 }}>ANSLUTEN</span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.secondary, background: C.fill, padding: "2px 7px", borderRadius: 5 }}>EJ ANSLUTEN</span>
                  )}
                  {integration?.token_expired && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.red, background: C.redLight, padding: "2px 7px", borderRadius: 5 }}>TOKEN UTGÅNGEN</span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: C.secondary }}>
                  {provider.desc}
                  {connected && integration?.last_sync_at && ` • Senaste synk: ${fmtDate(integration.last_sync_at)}`}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {connected ? (
                  <>
                    <button onClick={() => handleSync(provider.id)} disabled={syncing_} style={{
                      background: C.surface, color: C.blue, border: `1px solid ${C.blue}40`,
                      borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {syncing_ ? <Spinner size={12} /> : <Icon.Refresh />}
                      Synka nu
                    </button>
                    <button onClick={() => handleConnect(provider.id)} style={{
                      background: C.fill, color: C.secondary, border: "none",
                      borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer",
                    }}>Återkoppla</button>
                  </>
                ) : (
                  <button onClick={() => handleConnect(provider.id)} style={{
                    background: provider.color, color: "#fff", border: "none",
                    borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <Icon.Link2 /> Koppla
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info section */}
      <div style={{ background: C.fill, borderRadius: 14, padding: 20, marginTop: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Vad synkroniseras?</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Fakturor", desc: "Import från och export till bokföringssystemet" },
            { label: "Verifikationer", desc: "Synk av bokförda verifikationer" },
            { label: "Kontoplan", desc: "Hämtar kontoplanen för automatisk kategorisering" },
            { label: "Leverantörsfakturor", desc: "Import av leverantörsfakturor för godkännande" },
          ].map((item) => (
            <div key={item.label} style={{ padding: "10px 12px", background: C.surface, borderRadius: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 3 }}>{item.label}</p>
              <p style={{ fontSize: 12, color: C.secondary }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
