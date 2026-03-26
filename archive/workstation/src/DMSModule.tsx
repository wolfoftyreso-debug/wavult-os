import { useState, useEffect, useCallback } from "react";

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "https://api.bc.pixdrift.com";

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = localStorage.getItem("pixdrift_token");
  const headers: HeadersInit = { "Content-Type": "application/json", ...(options.headers ?? {}) };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const api = {
  get: (path: string) => apiFetch(path),
  post: (path: string, body: unknown) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) => apiFetch(path, { method: "PATCH", body: JSON.stringify(body) }),
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#F5F5F7", surface: "#FFFFFF", elevated: "#FAFAFA", border: "#E5E5EA",
  separator: "#F2F2F7", text: "#1D1D1F", secondary: "#86868B", tertiary: "#AEAEB2",
  blue: "#007AFF", blueLight: "#E8F3FF", green: "#34C759", greenLight: "#E8F8ED",
  yellow: "#FF9500", yellowLight: "#FFF3E0", red: "#FF3B30", redLight: "#FFF0EF",
  purple: "#AF52DE", purpleLight: "#F5EEFF", fill: "#F2F2F7", orange: "#FF6B35",
  orangeLight: "#FFF0E8", teal: "#5AC8FA", tealLight: "#E5F7FF",
};

const shadow = {
  sm: "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.04)",
  md: "0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
  lg: "0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
};

const globalStyles = `
  @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulse   { 0%,100%{opacity:1}50%{opacity:0.5} }
  .dms-animate { animation: slideUp 0.2s ease forwards; }
  .dms-row:hover { background: ${C.fill}; transition: background 0.1s; cursor:pointer; }
  .dms-btn:hover { opacity: 0.88; transform: translateY(-1px); transition: all 0.15s; }
  .dms-btn:active { transform: scale(0.97); }
  .dms-card:hover { box-shadow: ${shadow.lg}!important; transform: translateY(-1px); transition: all 0.2s; }
  .dms-pulse { animation: pulse 1.5s infinite; }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number | null | undefined, cur = "SEK") =>
  n != null ? new Intl.NumberFormat("sv-SE", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n) : "—";

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" }) : "—";

const Badge = ({ label, color, bg, pulse }: { label: string; color: string; bg: string; pulse?: boolean }) => (
  <span className={pulse ? "dms-pulse" : undefined} style={{
    background: bg, color, fontSize: 10, fontWeight: 700,
    letterSpacing: "0.06em", borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap",
  }}>{label}</span>
);

function vehicleStatusBadge(status: string) {
  const map: Record<string, any> = {
    IN_STOCK:   { label: "I LAGER",    color: C.green,  bg: C.greenLight },
    RESERVED:   { label: "RESERVERAD", color: C.yellow, bg: C.yellowLight },
    IN_TRANSIT: { label: "TRANSIT",    color: C.blue,   bg: C.blueLight },
    ORDERED:    { label: "BESTÄLLD",   color: C.purple, bg: C.purpleLight },
    SOLD:       { label: "SÅLD",       color: C.secondary, bg: C.fill },
    LOANER:     { label: "LÅNEFORDON", color: C.teal,   bg: C.tealLight },
    SCRAPPED:   { label: "SKROTAD",    color: C.red,    bg: C.redLight },
  };
  const s = map[status] ?? { label: status, color: C.secondary, bg: C.fill };
  return <Badge label={s.label} color={s.color} bg={s.bg} />;
}

function workOrderStatusBadge(status: string) {
  const map: Record<string, any> = {
    OPEN:             { label: "ÖPPEN",        color: C.blue,      bg: C.blueLight },
    IN_PROGRESS:      { label: "PÅGÅR",        color: C.green,     bg: C.greenLight },
    WAITING_PARTS:    { label: "VÄNTAR DELAR", color: C.orange,    bg: C.orangeLight, pulse: true },
    WAITING_CUSTOMER: { label: "VÄNTAR KUND",  color: C.yellow,    bg: C.yellowLight },
    READY:            { label: "KLAR",         color: C.teal,      bg: C.tealLight },
    INVOICED:         { label: "FAKTURERAD",   color: C.purple,    bg: C.purpleLight },
    CLOSED:           { label: "STÄNGD",       color: C.secondary, bg: C.fill },
  };
  const s = map[status] ?? { label: status, color: C.secondary, bg: C.fill };
  return <Badge label={s.label} color={s.color} bg={s.bg} pulse={s.pulse} />;
}

function quoteStatusBadge(status: string) {
  const map: Record<string, any> = {
    DRAFT:    { label: "UTKAST",   color: C.secondary, bg: C.fill },
    SENT:     { label: "SKICKAD",  color: C.blue,      bg: C.blueLight },
    ACCEPTED: { label: "ACCEPTERAD",color: C.green,    bg: C.greenLight },
    DECLINED: { label: "NEKAD",    color: C.red,       bg: C.redLight },
    EXPIRED:  { label: "UTGÅNGEN", color: C.orange,    bg: C.orangeLight },
  };
  const s = map[status] ?? { label: status, color: C.secondary, bg: C.fill };
  return <Badge label={s.label} color={s.color} bg={s.bg} />;
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  Car: () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v5h-3"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><polyline points="3 9 16 9"/></svg>,
  Wrench: () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  Package: () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  TrendingUp: () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  Users: () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Globe: () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Plus: () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Search: () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  AlertTriangle: () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Check: () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) => (
  <div style={{
    background: C.surface, borderRadius: 12, padding: "16px 20px",
    border: `1px solid ${C.border}`, boxShadow: shadow.sm,
  }}>
    <div style={{ fontSize: 11, color: C.secondary, fontWeight: 600, letterSpacing: "0.04em", marginBottom: 6 }}>{label.toUpperCase()}</div>
    <div style={{ fontSize: 24, fontWeight: 700, color: color ?? C.text, letterSpacing: "-0.5px" }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: C.secondary, marginTop: 4 }}>{sub}</div>}
  </div>
);

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>{title}</h2>
    {action}
  </div>
);

const Btn = ({ children, onClick, variant = "primary", small }: any) => {
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";
  return (
    <button
      className="dms-btn"
      onClick={onClick}
      style={{
        background: isDanger ? C.redLight : isPrimary ? C.blue : C.fill,
        color: isDanger ? C.red : isPrimary ? "#fff" : C.text,
        border: "none", borderRadius: 8,
        padding: small ? "5px 12px" : "8px 16px",
        fontSize: small ? 12 : 13, fontWeight: 600, cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 5,
      }}
    >{children}</button>
  );
};

// ─── Input helper ─────────────────────────────────────────────────────────────
const Input = ({ label, value, onChange, placeholder, type = "text" }: any) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.secondary, marginBottom: 4 }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", boxSizing: "border-box",
        border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px",
        fontSize: 14, color: C.text, background: C.surface,
        outline: "none",
      }}
    />
  </div>
);

const Select = ({ label, value, onChange, options }: any) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.secondary, marginBottom: 4 }}>{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
        padding: "8px 12px", fontSize: 14, color: C.text, background: C.surface,
      }}
    >
      {options.map((o: any) => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  </div>
);

// ─── Modal ────────────────────────────────────────────────────────────────────
const Modal = ({ title, children, onClose }: any) => (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  }} onClick={onClose}>
    <div
      style={{
        background: C.surface, borderRadius: 16, padding: 28, width: 500, maxWidth: "90vw",
        maxHeight: "80vh", overflowY: "auto", boxShadow: shadow.lg,
        animation: "slideUp 0.2s ease",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.secondary }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 1: FORDONSLAGER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function InventoryTab() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFuel, setFilterFuel] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [valuation, setValuation] = useState<any>(null);
  const [newVin, setNewVin] = useState({ vin: "", make: "", model: "", model_year: "", list_price: "", fuel_type: "ICE_PETROL", condition: "NEW", status: "IN_STOCK", location: "" });

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterFuel) params.set("fuel_type", filterFuel);
      const data = await api.get(`/api/vehicles/inventory?${params}`);
      setVehicles(Array.isArray(data) ? data : []);
    } catch { setVehicles([]); } finally { setLoading(false); }
  }, [filterStatus, filterFuel]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get("/api/vehicles/inventory/valuation").then(setValuation).catch(() => {});
  }, []);

  const filtered = vehicles.filter((v) => {
    if (!search) return true;
    return `${v.make} ${v.model} ${v.vin} ${v.registration_number}`.toLowerCase().includes(search.toLowerCase());
  });

  const addVehicle = async () => {
    try {
      await api.post("/api/vehicles/inventory", { ...newVin, model_year: Number(newVin.model_year), list_price: Number(newVin.list_price) });
      setShowModal(false);
      load();
    } catch (e: any) { alert("Fel: " + e.message); }
  };

  return (
    <div className="dms-animate">
      {/* Stats row */}
      {valuation && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          <StatCard label="Totalt i lager" value={String(valuation.summary?.total_vehicles ?? 0)} />
          <StatCard label="Lagervärde (listpris)" value={fmt(valuation.summary?.total_list_value)} />
          <StatCard label="Snitt lagertid" value={`${valuation.summary?.avg_days_in_stock ?? 0} dagar`} />
          <StatCard label=">90 dagar (åtgärda!)" value={String(valuation.summary?.flagged_over_90_days ?? 0)} color={valuation.summary?.flagged_over_90_days > 0 ? C.red : C.green} />
        </div>
      )}

      <SectionHeader
        title="Fordonslager"
        action={<Btn onClick={() => setShowModal(true)}><Icon.Plus /> Lägg till fordon</Btn>}
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Icon.Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök VIN, märke, modell..."
            style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: 14, boxSizing: "border-box" }}
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
          <option value="">Alla status</option>
          {["IN_STOCK", "ORDERED", "IN_TRANSIT", "RESERVED", "SOLD", "LOANER"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterFuel} onChange={(e) => setFilterFuel(e.target.value)} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
          <option value="">Alla bränslen</option>
          {["BEV", "PHEV", "HEV", "ICE_PETROL", "ICE_DIESEL", "HYDROGEN"].map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: shadow.sm, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.fill }}>
              {["VIN", "Märke / Modell", "År", "Bränsle", "Km", "Pris", "Status", "Lagertid", ""].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.secondary, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: C.secondary }}>Laddar...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: C.secondary }}>Inga fordon hittade</td></tr>
            ) : filtered.map((v) => {
              const days = v.days_in_stock ?? 0;
              const isOld = days > 90;
              return (
                <tr key={v.id} className="dms-row" style={{ borderTop: `1px solid ${C.separator}` }}>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "monospace", color: C.secondary }}>{v.vin}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 600, fontSize: 14 }}>{v.make} {v.model}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>{v.model_year ?? "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12 }}><Badge label={v.fuel_type ?? "?"} color={C.blue} bg={C.blueLight} /></td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>{v.odometer_km ? `${v.odometer_km.toLocaleString("sv-SE")} km` : "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>{fmt(v.list_price)}</td>
                  <td style={{ padding: "10px 14px" }}>{vehicleStatusBadge(v.status)}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: isOld ? C.red : C.secondary, fontWeight: isOld ? 700 : 400 }}>
                    {isOld && "⚠ "}{days} dagar
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn small onClick={() => api.patch(`/api/vehicles/inventory/${v.vin}/status`, { status: "RESERVED" })}>Reservera</Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add vehicle modal */}
      {showModal && (
        <Modal title="Lägg till fordon" onClose={() => setShowModal(false)}>
          <Input label="VIN (17 tecken, ISO 3779)" value={newVin.vin} onChange={(v: string) => setNewVin(x => ({ ...x, vin: v }))} placeholder="YV1BZBAB2K2xxxxxx" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Märke" value={newVin.make} onChange={(v: string) => setNewVin(x => ({ ...x, make: v }))} placeholder="Volvo" />
            <Input label="Modell" value={newVin.model} onChange={(v: string) => setNewVin(x => ({ ...x, model: v }))} placeholder="XC60" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Årsmodell" type="number" value={newVin.model_year} onChange={(v: string) => setNewVin(x => ({ ...x, model_year: v }))} placeholder="2026" />
            <Input label="Listpris (SEK)" type="number" value={newVin.list_price} onChange={(v: string) => setNewVin(x => ({ ...x, list_price: v }))} />
          </div>
          <Select label="Bränsle" value={newVin.fuel_type} onChange={(v: string) => setNewVin(x => ({ ...x, fuel_type: v }))}
            options={["BEV", "PHEV", "HEV", "ICE_PETROL", "ICE_DIESEL", "HYDROGEN"].map(f => ({ value: f, label: f }))} />
          <Select label="Skick" value={newVin.condition} onChange={(v: string) => setNewVin(x => ({ ...x, condition: v }))}
            options={[{ value: "NEW", label: "Ny" }, { value: "USED", label: "Begagnad" }, { value: "DEMO", label: "Demo" }]} />
          <Input label="Anläggning/plats" value={newVin.location} onChange={(v: string) => setNewVin(x => ({ ...x, location: v }))} placeholder="Hall A" />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Avbryt</Btn>
            <Btn onClick={addVehicle}>Spara fordon</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 2: VERKSTAD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function WorkshopTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newOrder, setNewOrder] = useState({ vehicle_vin: "", vehicle_reg: "", work_type: "SERVICE", description: "", estimated_hours: "1", promised_date: "" });

  const load = useCallback(async () => {
    try {
      const params = filterStatus ? `?status=${filterStatus}` : "";
      const data = await api.get(`/api/workshop/work-orders${params}`);
      setOrders(Array.isArray(data) ? data : []);
    } catch { setOrders([]); } finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const statusPipeline = ["OPEN", "IN_PROGRESS", "WAITING_PARTS", "WAITING_CUSTOMER", "READY", "INVOICED", "CLOSED"];

  const addOrder = async () => {
    try {
      await api.post("/api/workshop/work-orders", { ...newOrder, estimated_hours: Number(newOrder.estimated_hours) });
      setShowModal(false);
      load();
    } catch (e: any) { alert("Fel: " + e.message); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/api/workshop/work-orders/${id}/status`, { status });
      load();
    } catch (e: any) { alert("Fel: " + e.message); }
  };

  const stats = {
    open: orders.filter(o => o.status === "OPEN").length,
    inProgress: orders.filter(o => o.status === "IN_PROGRESS").length,
    waitingParts: orders.filter(o => o.status === "WAITING_PARTS").length,
    ready: orders.filter(o => o.status === "READY").length,
  };

  return (
    <div className="dms-animate">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Öppna" value={String(stats.open)} color={C.blue} />
        <StatCard label="Pågår" value={String(stats.inProgress)} color={C.green} />
        <StatCard label="Väntar delar" value={String(stats.waitingParts)} color={C.orange} />
        <StatCard label="Redo" value={String(stats.ready)} color={C.teal} />
      </div>

      <SectionHeader
        title="Arbetsorder"
        action={<Btn onClick={() => setShowModal(true)}><Icon.Plus /> Ny AO</Btn>}
      />

      {/* Status pipeline filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <Btn small variant={filterStatus === "" ? "primary" : "ghost"} onClick={() => setFilterStatus("")}>Alla</Btn>
        {statusPipeline.map(s => (
          <Btn key={s} small variant={filterStatus === s ? "primary" : "ghost"} onClick={() => setFilterStatus(s)}>
            {s.replace(/_/g, " ")}
          </Btn>
        ))}
      </div>

      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: shadow.sm, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.fill }}>
              {["AO-nr", "Fordon", "Typ", "Status", "Utlovad", "Mekaniker", "Åtgärd"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.secondary, letterSpacing: "0.04em" }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: C.secondary }}>Laddar...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: C.secondary }}>Inga arbetsorder</td></tr>
            ) : orders.map(o => {
              const overdue = o.promised_date && new Date(o.promised_date) < new Date() && !["INVOICED", "CLOSED"].includes(o.status);
              return (
                <tr key={o.id} className="dms-row" style={{ borderTop: `1px solid ${C.separator}`, background: overdue ? "#FFF8F7" : undefined }}>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12, color: C.secondary }}>{o.order_number}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{o.vehicle_reg ?? o.vehicle_vin?.slice(0, 8) ?? "—"}</div>
                    <div style={{ fontSize: 11, color: C.secondary }}>{o.vehicle_vin}</div>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <Badge label={o.work_type} color={C.purple} bg={C.purpleLight} />
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {workOrderStatusBadge(o.status)}
                    {overdue && <span style={{ marginLeft: 6, color: C.red, fontSize: 11 }}>⚠ FÖRSENAD</span>}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>{fmtDate(o.promised_date)}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: C.secondary }}>{o.technician_id ? "Tilldelad" : "—"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <select
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                      style={{ fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px" }}
                    >
                      {statusPipeline.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Ny arbetsorder" onClose={() => setShowModal(false)}>
          <Input label="Reg.nr / VIN" value={newOrder.vehicle_reg} onChange={(v: string) => setNewOrder(x => ({ ...x, vehicle_reg: v }))} placeholder="ABC123" />
          <Input label="VIN" value={newOrder.vehicle_vin} onChange={(v: string) => setNewOrder(x => ({ ...x, vehicle_vin: v }))} placeholder="YV1BZBAB..." />
          <Select label="Arbetstyp" value={newOrder.work_type} onChange={(v: string) => setNewOrder(x => ({ ...x, work_type: v }))}
            options={["SERVICE", "REPAIR", "WARRANTY", "RECALL", "PDI", "BODYWORK", "TIRES", "INSPECTION"].map(t => ({ value: t, label: t }))} />
          <Input label="Beskrivning" value={newOrder.description} onChange={(v: string) => setNewOrder(x => ({ ...x, description: v }))} placeholder="Vad ska göras?" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Estimerade timmar" type="number" value={newOrder.estimated_hours} onChange={(v: string) => setNewOrder(x => ({ ...x, estimated_hours: v }))} />
            <Input label="Utlovad datum" type="datetime-local" value={newOrder.promised_date} onChange={(v: string) => setNewOrder(x => ({ ...x, promised_date: v }))} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Avbryt</Btn>
            <Btn onClick={addOrder}>Skapa AO</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 3: RESERVDELAR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function PartsTab() {
  const [parts, setParts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showLowStock, setShowLowStock] = useState(false);

  const load = useCallback(async () => {
    try {
      const url = showLowStock ? "/api/parts/inventory/low-stock" : `/api/parts/inventory${search ? `?search=${encodeURIComponent(search)}` : ""}`;
      const data = await api.get(url);
      const arr = showLowStock ? (data.parts ?? []) : (Array.isArray(data) ? data : []);
      setParts(arr);
    } catch { setParts([]); } finally { setLoading(false); }
  }, [search, showLowStock]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  return (
    <div className="dms-animate">
      <SectionHeader title="Reservdelslager" action={
        <div style={{ display: "flex", gap: 8 }}>
          <Btn small variant={showLowStock ? "danger" : "ghost"} onClick={() => setShowLowStock(x => !x)}>
            <Icon.AlertTriangle /> {showLowStock ? "Alla delar" : "Lågt lager"}
          </Btn>
        </div>
      } />

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Sök artikelnummer, beskrivning..."
            style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 14, boxSizing: "border-box" }}
          />
        </div>
      </div>

      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: shadow.sm, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.fill }}>
              {["Artikelnr", "Beskrivning", "Märke", "Saldo", "Reserverat", "Min.nivå", "Hyllplats", "Listpris", "Åtgärd"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.secondary, letterSpacing: "0.04em" }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: C.secondary }}>Laddar...</td></tr>
            ) : parts.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: C.secondary }}>Inga delar</td></tr>
            ) : parts.map(p => {
              const isLow = p.quantity_on_hand < p.min_quantity;
              return (
                <tr key={p.id} className="dms-row" style={{ borderTop: `1px solid ${C.separator}`, background: isLow ? "#FFF8F7" : undefined }}>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12 }}>{p.part_number}</td>
                  <td style={{ padding: "10px 14px", fontSize: 14, fontWeight: 500 }}>{p.description}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: C.secondary }}>{p.make ?? "—"}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: isLow ? C.red : C.text }}>{p.quantity_on_hand}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: C.secondary }}>{p.quantity_reserved ?? 0}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: C.secondary }}>{p.min_quantity}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: C.secondary }}>{p.location ?? "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>{fmt(p.list_price)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    {isLow && <Btn small onClick={() => api.post("/api/parts/orders", { part_number: p.part_number, quantity: p.min_quantity * 2, supplier: p.supplier })}>
                      Beställ
                    </Btn>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 4: FÖRSÄLJNING (KANBAN)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function SalesTab() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/vehicle-sales/quotes"),
      api.get("/api/vehicle-sales/statistics"),
    ]).then(([q, s]) => {
      setQuotes(Array.isArray(q) ? q : []);
      setStats(s);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: "DRAFT", label: "Utkast", color: C.secondary },
    { key: "SENT", label: "Skickad", color: C.blue },
    { key: "ACCEPTED", label: "Accepterad", color: C.green },
    { key: "DECLINED", label: "Nekad", color: C.red },
  ];

  const byStatus = (status: string) => quotes.filter(q => q.status === status);
  const sumValue = (qs: any[]) => qs.reduce((s, q) => s + (q.net_price ?? q.list_price ?? 0), 0);

  return (
    <div className="dms-animate">
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          <StatCard label="Sålda fordon" value={String(stats.sales?.total_sold ?? 0)} />
          <StatCard label="Snittvinstmarginal" value={fmt(stats.sales?.avg_margin_sek)} color={C.green} />
          <StatCard label="Snitt lagertid (sålda)" value={`${stats.sales?.avg_days_to_sell ?? 0} dagar`} />
          <StatCard label="Konverteringsrate" value={`${stats.quotes?.conversion_rate_pct ?? 0}%`} color={C.blue} />
        </div>
      )}

      <SectionHeader title="Offert-pipeline" />

      {loading ? <div style={{ textAlign: "center", padding: 40, color: C.secondary }}>Laddar...</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {columns.map(col => {
            const colQuotes = byStatus(col.key);
            const colValue = sumValue(colQuotes);
            return (
              <div key={col.key} style={{ background: C.fill, borderRadius: 12, padding: 14, minHeight: 200 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: col.color }}>{col.label}</span>
                  <span style={{ fontSize: 11, color: C.secondary, background: C.surface, borderRadius: 5, padding: "2px 7px" }}>{colQuotes.length}</span>
                </div>
                {colValue > 0 && (
                  <div style={{ fontSize: 12, color: C.secondary, marginBottom: 10 }}>{fmt(colValue)}</div>
                )}
                {colQuotes.map(q => (
                  <div key={q.id} className="dms-card" style={{
                    background: C.surface, borderRadius: 8, padding: "10px 12px", marginBottom: 8,
                    border: `1px solid ${C.border}`, boxShadow: shadow.sm,
                  }}>
                    <div style={{ fontSize: 12, fontFamily: "monospace", color: C.secondary, marginBottom: 4 }}>{q.quote_number}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{q.vehicle_vin ? q.vehicle_vin.slice(0, 12) + "..." : "Fabriksorder"}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmt(q.net_price ?? q.list_price)}</div>
                    {q.financing_type && (
                      <div style={{ fontSize: 11, color: C.secondary, marginTop: 4 }}>{q.financing_type} · {fmt(q.monthly_payment)}/mån</div>
                    )}
                    <div style={{ fontSize: 11, color: C.secondary, marginTop: 4 }}>Giltig t.o.m. {fmtDate(q.valid_until)}</div>
                  </div>
                ))}
                {colQuotes.length === 0 && (
                  <div style={{ textAlign: "center", padding: "20px 0", color: C.tertiary, fontSize: 13 }}>Inga offerter</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 5: CRM AUTOMOTIVE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CRMTab() {
  const [serviceDue, setServiceDue] = useState<any>(null);
  const [csiStats, setCsiStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/automotive-crm/service-due"),
      api.get("/api/automotive-crm/csi-statistics"),
    ]).then(([s, c]) => {
      setServiceDue(s);
      setCsiStats(c);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: C.secondary }}>Laddar...</div>;

  return (
    <div className="dms-animate">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Service inom 30 dagar" value={String(serviceDue?.due_count ?? 0)} color={C.orange} />
        <StatCard label="CSI snitt (försäljning)" value={csiStats?.sales?.avg_score ? `${csiStats.sales.avg_score}/10` : "—"} color={C.blue} />
        <StatCard label="CSI snitt (service)" value={csiStats?.service?.avg_score ? `${csiStats.service.avg_score}/10` : "—"} color={C.green} />
        <StatCard label="Övergripande NPS" value={csiStats?.overall_nps != null ? String(csiStats.overall_nps) : "—"} color={csiStats?.overall_nps >= 0 ? C.green : C.red} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Service due */}
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: shadow.sm, padding: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: C.text }}>
            🔧 Service inom 30 dagar ({serviceDue?.due_count ?? 0})
          </h3>
          {(serviceDue?.vehicles ?? []).slice(0, 8).map((v: any) => (
            <div key={v.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.separator}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{v.make} {v.model} {v.model_year}</div>
                <div style={{ fontSize: 12, color: C.secondary }}>{v.registration_number ?? v.vin ?? "—"}</div>
                <div style={{ fontSize: 11, color: C.tertiary }}>Senaste service: {fmtDate(v.last_service)}</div>
              </div>
              <Btn small>Kontakta</Btn>
            </div>
          ))}
          {(!serviceDue?.vehicles?.length) && (
            <div style={{ textAlign: "center", padding: 20, color: C.secondary }}>
              <Icon.Check />
              <div style={{ marginTop: 8, fontSize: 13 }}>Inga service-påminnelser</div>
            </div>
          )}
        </div>

        {/* CSI stats */}
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: shadow.sm, padding: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: C.text }}>📊 CSI-statistik</h3>
          {csiStats && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Försäljning", data: csiStats.sales, color: C.blue },
                { label: "Service", data: csiStats.service, color: C.green },
              ].map(({ label, data, color }) => (
                <div key={label} style={{ padding: 16, background: C.fill, borderRadius: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 8 }}>{label}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
                    <div><div style={{ fontSize: 22, fontWeight: 700 }}>{data?.avg_score ?? "—"}</div><div style={{ fontSize: 11, color: C.secondary }}>Snitt /10</div></div>
                    <div><div style={{ fontSize: 22, fontWeight: 700 }}>{data?.nps ?? "—"}</div><div style={{ fontSize: 11, color: C.secondary }}>NPS</div></div>
                    <div><div style={{ fontSize: 22, fontWeight: 700 }}>{data?.count ?? 0}</div><div style={{ fontSize: 11, color: C.secondary }}>Svar</div></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 16, padding: 12, background: C.blueLight, borderRadius: 8, fontSize: 12, color: C.blue }}>
            💡 OEM kräver månadsvis CSI-rapportering. Exportera via OEM-rapporter-fliken.
          </div>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 6: OEM-RAPPORTER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function OEMTab() {
  const [report, setReport] = useState<any>(null);
  const [recalls, setRecalls] = useState<any[]>([]);
  const [warranty, setWarranty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [manufacturer, setManufacturer] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = manufacturer ? `?manufacturer=${manufacturer}` : "";
      const [r, rec, war] = await Promise.all([
        api.get(`/api/oem/reporting/monthly${params}`),
        api.get("/api/workshop/recalls"),
        api.get("/api/workshop/warranty-claims"),
      ]);
      setReport(r);
      setRecalls(Array.isArray(rec) ? rec : []);
      setWarranty(Array.isArray(war) ? war : []);
    } catch { } finally { setLoading(false); }
  }, [manufacturer]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="dms-animate">
      <SectionHeader title="OEM-rapportering & KPI:er" action={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={manufacturer} onChange={e => setManufacturer(e.target.value)} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 13 }}>
            <option value="">Alla märken</option>
            {["Volvo", "BMW", "Volkswagen", "Mercedes", "Stellantis"].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <Btn onClick={load}>Uppdatera</Btn>
        </div>
      } />

      {loading ? <div style={{ textAlign: "center", padding: 40, color: C.secondary }}>Laddar...</div> : report && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            <StatCard label="Sälj (månaden)" value={String(report.kpis?.sales_volume?.total_vehicles ?? 0)} />
            <StatCard label="Omsättning" value={fmt(report.kpis?.sales_volume?.total_revenue_sek)} color={C.green} />
            <StatCard label="CSI-snitt" value={report.kpis?.csi?.avg_score_out_of_10 ? `${report.kpis.csi.avg_score_out_of_10}/10` : "—"} color={C.blue} />
            <StatCard label="Finanspenetration" value={`${report.kpis?.financing_penetration_pct ?? 0}%`} color={C.purple} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            {/* Recall tracker */}
            <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: shadow.sm, padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>🔴 Aktiva återkallelser ({recalls.length})</h3>
              {recalls.length === 0 ? (
                <div style={{ textAlign: "center", padding: 20, color: C.secondary, fontSize: 13 }}>Inga aktiva återkallelser</div>
              ) : recalls.map((r: any) => (
                <div key={r.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.separator}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{r.recall_number}</div>
                      <div style={{ fontSize: 12, color: C.secondary }}>{r.manufacturer} — {r.description}</div>
                    </div>
                    <Badge label="AKTIV" color={C.red} bg={C.redLight} />
                  </div>
                  {r.deadline_date && <div style={{ fontSize: 11, color: C.tertiary, marginTop: 4 }}>Deadline: {fmtDate(r.deadline_date)}</div>}
                </div>
              ))}
            </div>

            {/* Warranty claims */}
            <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: shadow.sm, padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>🛡 Garantiärenden ({warranty.length})</h3>
              {warranty.length === 0 ? (
                <div style={{ textAlign: "center", padding: 20, color: C.secondary, fontSize: 13 }}>Inga garantiärenden</div>
              ) : warranty.slice(0, 6).map((w: any) => {
                const statusMap: Record<string, any> = {
                  SUBMITTED: { label: "INLÄMNAD", color: C.blue, bg: C.blueLight },
                  APPROVED: { label: "GODKÄND", color: C.green, bg: C.greenLight },
                  REJECTED: { label: "NEKAD", color: C.red, bg: C.redLight },
                  IN_REVIEW: { label: "GRANSKAS", color: C.yellow, bg: C.yellowLight },
                };
                const s = statusMap[w.status] ?? { label: w.status, color: C.secondary, bg: C.fill };
                return (
                  <div key={w.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.separator}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, fontFamily: "monospace", color: C.secondary }}>{w.claim_number}</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{w.vehicle_vin}</div>
                      <div style={{ fontSize: 12, color: C.secondary }}>{fmt(w.claim_amount)}</div>
                    </div>
                    <Badge label={s.label} color={s.color} bg={s.bg} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* OEM certifications status */}
          <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: shadow.sm, padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>🏆 OEM-certifieringsstatus</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
              {[
                { oem: "Volvo", system: "VIDA/VDN", status: "STUB", priority: "HIGH" },
                { oem: "BMW", system: "KOBRA/DIS", status: "STUB", priority: "MEDIUM" },
                { oem: "VW Group", system: "CROSS/ETKA", status: "STUB", priority: "HIGH" },
                { oem: "Stellantis", system: "DealerConnect", status: "STUB", priority: "LOW" },
                { oem: "Mercedes", system: "MO360/XENTRY", status: "STUB", priority: "MEDIUM" },
              ].map(c => (
                <div key={c.oem} style={{ background: C.fill, borderRadius: 10, padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{c.oem}</div>
                  <div style={{ fontSize: 11, color: C.secondary, marginBottom: 8 }}>{c.system}</div>
                  <Badge label="STUB REDO" color={C.yellow} bg={C.yellowLight} />
                  <div style={{ marginTop: 8 }}>
                    <Badge
                      label={c.priority === "HIGH" ? "PRIORITET" : c.priority}
                      color={c.priority === "HIGH" ? C.red : c.priority === "MEDIUM" ? C.orange : C.secondary}
                      bg={c.priority === "HIGH" ? C.redLight : c.priority === "MEDIUM" ? C.orangeLight : C.fill}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN DMS MODULE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const TABS = [
  { id: "inventory", label: "Fordonslager", icon: Icon.Car, component: InventoryTab },
  { id: "workshop", label: "Verkstad", icon: Icon.Wrench, component: WorkshopTab },
  { id: "parts", label: "Reservdelar", icon: Icon.Package, component: PartsTab },
  { id: "sales", label: "Försäljning", icon: Icon.TrendingUp, component: SalesTab },
  { id: "crm", label: "CRM Automotive", icon: Icon.Users, component: CRMTab },
  { id: "oem", label: "OEM-rapporter", icon: Icon.Globe, component: OEMTab },
];

export default function DMSModule() {
  const [activeTab, setActiveTab] = useState("inventory");

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component ?? InventoryTab;

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif" }}>
        {/* Header */}
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 24px", position: "sticky", top: 0, zIndex: 100, boxShadow: shadow.sm }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, height: 56 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, background: C.blue, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon.Car />
              </div>
              <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>pixdrift DMS</span>
              <Badge label="BETA" color={C.blue} bg={C.blueLight} />
            </div>

            <nav style={{ display: "flex", gap: 4, flex: 1 }}>
              {TABS.map(tab => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                      fontSize: 13, fontWeight: 600,
                      background: active ? C.blue : "transparent",
                      color: active ? "#fff" : C.secondary,
                      transition: "all 0.15s",
                    }}
                  >
                    <tab.icon />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
          <ActiveComponent />
        </div>
      </div>
    </>
  );
}
