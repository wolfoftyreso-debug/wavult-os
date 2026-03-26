/**
 * ─── RENTAL ENGINE — WORKSTATION UI ─────────────────────────────────────────
 * PIX-native visual system. Availability is reality built from events.
 * Not a calendar with forms — a living timeline of fleet state.
 */

import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "https://api.bc.pixdrift.com";

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = localStorage.getItem("pixdrift_token");
  const headers: HeadersInit = { "Content-Type": "application/json", ...(options.headers ?? {}) };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const api = {
  get: (path: string) => apiFetch(path),
  post: (path: string, body: unknown) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) => apiFetch(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path: string) => apiFetch(path, { method: "DELETE" }),
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

const shadow = "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)";
const shadowMd = "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)";

// ─── Status config ────────────────────────────────────────────────────────────
const VEHICLE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  AVAILABLE:   { label: "Tillgänglig", color: C.green,  bg: C.greenLight },
  RESERVED:    { label: "Reserverad",  color: C.blue,   bg: C.blueLight },
  IN_USE:      { label: "Uthyrd",      color: C.orange, bg: C.orangeLight },
  SERVICE:     { label: "Service",     color: C.yellow, bg: C.yellowLight },
  DAMAGE:      { label: "Skada",       color: C.red,    bg: C.redLight },
  UNAVAILABLE: { label: "Ej tillgänglig", color: C.secondary, bg: C.fill },
  RETIRED:     { label: "Avvecklad",   color: C.tertiary, bg: C.fill },
};

const BOOKING_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: "Utkast",    color: C.tertiary, bg: C.fill },
  RESERVED:  { label: "Reserverad", color: C.blue,    bg: C.blueLight },
  CONFIRMED: { label: "Bekräftad", color: C.purple,   bg: C.purpleLight },
  ACTIVE:    { label: "Aktiv",     color: C.orange,   bg: C.orangeLight },
  COMPLETED: { label: "Avslutad",  color: C.green,    bg: C.greenLight },
  CANCELLED: { label: "Avbokad",   color: C.red,      bg: C.redLight },
  NO_SHOW:   { label: "Uteblev",   color: C.secondary, bg: C.fill },
};

const BLOCK_COLORS: Record<string, string> = {
  SERVICE: C.yellow, DAMAGE: C.red, PRIVATE: C.purple, INSPECTION: C.teal, OTHER: C.secondary,
};

// ─── Utils ────────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("sv-SE", { month: "short", day: "numeric" });
}
function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("sv-SE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtRelative(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return "nyss";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min sedan`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} tim sedan`;
  return `${Math.floor(diff / 86400000)} dag(ar) sedan`;
}
function fmtSEK(n: number) {
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);
}
function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
const Badge = ({ label, color, bg }: { label: string; color: string; bg: string }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", padding: "2px 8px",
    borderRadius: 20, fontSize: 11, fontWeight: 600, color, background: bg, letterSpacing: 0.2,
  }}>{label}</span>
);

const Btn = ({
  children, onClick, variant = "default", disabled = false, style: st = {},
}: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "default" | "primary" | "danger" | "ghost";
  disabled?: boolean; style?: React.CSSProperties;
}) => {
  const styles: Record<string, React.CSSProperties> = {
    default: { background: C.fill, color: C.text, border: `1px solid ${C.border}` },
    primary: { background: C.blue, color: "#fff", border: "none" },
    danger:  { background: C.red,  color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: C.blue, border: "none" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, transition: "opacity 0.15s", ...styles[variant], ...st,
      }}
    >{children}</button>
  );
};

const Input = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <label style={{ fontSize: 12, fontWeight: 500, color: C.secondary }}>{label}</label>
    <input
      {...props}
      style={{
        padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`,
        fontSize: 14, color: C.text, background: C.surface, outline: "none",
        ...(props.style || {}),
      }}
    />
  </div>
);

const Select = ({ label, options, ...props }: {
  label: string; options: { value: string; label: string }[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <label style={{ fontSize: 12, fontWeight: 500, color: C.secondary }}>{label}</label>
    <select
      {...props}
      style={{
        padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`,
        fontSize: 14, color: C.text, background: C.surface, outline: "none",
        ...(props.style || {}),
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ─── VIEWS ────────────────────────────────────────────────────────────────────

type RentalView = "fleet" | "timeline" | "active" | "pix" | "new-booking";

export default function RentalModule() {
  const [view, setView] = useState<RentalView>("fleet");
  const [bookingModal, setBookingModal] = useState(false);
  const [completeModal, setCompleteModal] = useState<string | null>(null); // booking id
  const [blockModal, setBlockModal] = useState<string | null>(null); // vehicle id
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const TABS: { id: RentalView; label: string; icon: string }[] = [
    { id: "fleet",    label: "Flotta",    icon: "🚗" },
    { id: "timeline", label: "Tidslinje", icon: "📅" },
    { id: "active",   label: "Aktiva",    icon: "🔑" },
    { id: "pix",      label: "PIX Feed",  icon: "⚡" },
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "20px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: C.text }}>Hyrbil</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: C.secondary }}>
            PIX-driven tillgänglighetsmotor
          </p>
        </div>
        <Btn variant="primary" onClick={() => setBookingModal(true)}>+ Ny bokning</Btn>
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 4, background: C.fill, borderRadius: 10,
        padding: 4, marginBottom: 20, width: "fit-content",
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            style={{
              padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 500, transition: "all 0.15s",
              background: view === t.id ? C.surface : "transparent",
              color: view === t.id ? C.text : C.secondary,
              boxShadow: view === t.id ? shadow : "none",
            }}
          >{t.icon} {t.label}</button>
        ))}
      </div>

      {/* View content */}
      {view === "fleet"    && <FleetView onBlock={(id) => setBlockModal(id)} onBook={() => setBookingModal(true)} onToast={showToast} />}
      {view === "timeline" && <TimelineView onBook={() => setBookingModal(true)} />}
      {view === "active"   && <ActiveRentalsView onComplete={(id) => setCompleteModal(id)} onToast={showToast} />}
      {view === "pix"      && <PixFeedView />}

      {/* Modals */}
      {bookingModal && (
        <BookingModal
          onClose={() => setBookingModal(false)}
          onSuccess={(msg) => { setBookingModal(false); showToast(msg); }}
        />
      )}
      {completeModal && (
        <CompleteRentalModal
          bookingId={completeModal}
          onClose={() => setCompleteModal(null)}
          onSuccess={(msg) => { setCompleteModal(null); showToast(msg); }}
        />
      )}
      {blockModal && (
        <BlockModal
          vehicleId={blockModal}
          onClose={() => setBlockModal(null)}
          onSuccess={(msg) => { setBlockModal(null); showToast(msg); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === "ok" ? "#1D1D1F" : C.red,
          color: "#fff", padding: "12px 20px", borderRadius: 12,
          fontSize: 14, fontWeight: 500, boxShadow: shadowMd,
          animation: "slideUp 0.2s ease",
        }}>{toast.type === "ok" ? "✓" : "✗"} {toast.msg}</div>
      )}
    </div>
  );
}

// ─── VIEW 1: FLEET OVERVIEW ───────────────────────────────────────────────────
function FleetView({
  onBlock, onBook, onToast,
}: { onBlock: (id: string) => void; onBook: () => void; onToast: (m: string, t?: "ok" | "err") => void }) {
  const [fleet, setFleet] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { fleet: f } = await api.get("/api/rental/fleet");
      setFleet(f || []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSkeleton />;

  if (!fleet.length) return (
    <EmptyState
      icon="🚗"
      title="Inga fordon i flottan"
      desc="Lägg till fordon för att komma igång med hyrbil."
      action={<Btn variant="primary" onClick={onBook}>+ Ny bokning</Btn>}
    />
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
      {fleet.map(v => <VehicleCard key={v.id} vehicle={v} onBlock={onBlock} onBook={onBook} onToast={onToast} onRefresh={load} />)}
    </div>
  );
}

function VehicleCard({ vehicle: v, onBlock, onBook, onToast, onRefresh }: {
  vehicle: any; onBlock: (id: string) => void; onBook: () => void;
  onToast: (m: string, t?: "ok" | "err") => void; onRefresh: () => void;
}) {
  const status = VEHICLE_STATUS[v.current_status] || VEHICLE_STATUS.UNAVAILABLE;
  const util = v.utilization_percent || 0;

  return (
    <div style={{ background: C.surface, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, boxShadow: shadow }}>
      {/* Vehicle plate & status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "monospace", letterSpacing: 1 }}>
            {v.registration_number}
          </div>
          <div style={{ fontSize: 13, color: C.secondary, marginTop: 2 }}>
            {v.make} {v.model} {v.year ? `(${v.year})` : ""}
          </div>
        </div>
        <Badge label={status.label} color={status.color} bg={status.bg} />
      </div>

      {/* Utilization bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: C.secondary }}>Beläggning denna månad</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: util > 70 ? C.green : C.secondary }}>{util}%</span>
        </div>
        <div style={{ height: 4, background: C.fill, borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2, width: `${util}%`,
            background: util > 70 ? C.green : util > 40 ? C.blue : C.tertiary,
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      {/* In use until */}
      {v.in_use_until && (
        <div style={{
          background: C.orangeLight, borderRadius: 8, padding: "6px 10px",
          fontSize: 12, color: C.orange, marginBottom: 12, fontWeight: 500,
        }}>
          🔑 Återlämnas {fmtDate(v.in_use_until)}
        </div>
      )}

      {/* Revenue */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: C.secondary }}>Intäkter denna månad</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{fmtSEK(v.month_revenue || 0)}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Btn onClick={() => onBlock(v.id)} style={{ fontSize: 12 }}>Blockera</Btn>
        <Btn variant="primary" onClick={onBook} style={{ fontSize: 12 }}>Boka</Btn>
      </div>
    </div>
  );
}

// ─── VIEW 2: AVAILABILITY TIMELINE ───────────────────────────────────────────
function TimelineView({ onBook }: { onBook: () => void }) {
  const [fleet, setFleet] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);
  const DAYS = 30;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [{ fleet: f }, { bookings: b }, { blocks: bl }] = await Promise.all([
          api.get("/api/rental/fleet"),
          api.get(`/api/rental/bookings?from_date=${isoDate(days[0])}&to_date=${isoDate(days[DAYS - 1])}&limit=200`),
          api.get("/api/rental/blocks"),
        ]);
        setFleet(f || []);
        setBookings(b || []);
        setBlocks(bl || []);
      } catch { /* silent */ }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <LoadingSkeleton />;

  const dayW = 28; // px per day
  const rowH = 48;

  function getBlocksForVehicle(vehicleId: string, type: "booking" | "block") {
    const items = type === "booking"
      ? bookings.filter(b => b.vehicle_id === vehicleId && b.status !== "CANCELLED")
      : blocks.filter(bl => bl.vehicle_id === vehicleId);
    return items;
  }

  function dayOffset(d: string) {
    const start = new Date(d);
    const diff = Math.floor((start.getTime() - today.getTime()) / 86400000);
    return Math.max(0, Math.min(diff, DAYS));
  }

  function daySpan(start: string, end: string) {
    const s = dayOffset(start);
    const e = Math.min(dayOffset(end) + 1, DAYS);
    return { left: s * dayW, width: Math.max((e - s) * dayW, dayW) };
  }

  return (
    <div style={{ background: C.surface, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, boxShadow: shadow, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Tillgänglighetstidslinje — 30 dagar</h3>
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.secondary }}>
          {[
            { color: C.blue, label: "Bokad" },
            { color: C.orange, label: "Aktiv" },
            { color: C.red, label: "Blockad" },
            { color: C.yellow, label: "Service" },
          ].map(l => (
            <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: "inline-block" }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        {/* Day header */}
        <div style={{ display: "flex", marginLeft: 140, marginBottom: 8 }}>
          {days.map((d, i) => {
            const isToday = i === 0;
            return (
              <div key={i} style={{
                width: dayW, flexShrink: 0, textAlign: "center",
                fontSize: 10, color: isToday ? C.blue : C.tertiary,
                fontWeight: isToday ? 700 : 400,
              }}>
                {d.getDate()}
              </div>
            );
          })}
        </div>

        {/* Vehicle rows */}
        {fleet.map(v => (
          <div key={v.id} style={{ display: "flex", alignItems: "center", marginBottom: 6, height: rowH }}>
            {/* Vehicle label */}
            <div style={{
              width: 140, flexShrink: 0, paddingRight: 10,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{v.registration_number}</div>
              <div style={{ fontSize: 11, color: C.secondary }}>{v.make} {v.model}</div>
            </div>

            {/* Timeline row */}
            <div style={{
              position: "relative", flex: 1,
              height: rowH - 8, background: C.fill, borderRadius: 6,
              width: DAYS * dayW,
            }}>
              {/* Today line */}
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: 2, background: C.red, opacity: 0.5, zIndex: 2,
              }} />

              {/* Booking blocks */}
              {getBlocksForVehicle(v.id, "booking").map(b => {
                const { left, width } = daySpan(b.start_time, b.end_time);
                const isActive = b.status === "ACTIVE";
                return (
                  <div
                    key={b.id}
                    onMouseEnter={e => setTooltip({
                      x: (e as any).clientX, y: (e as any).clientY,
                      content: (
                        <div>
                          <div style={{ fontWeight: 600 }}>{b.customer_name || "Okänd kund"}</div>
                          <div style={{ fontSize: 11, color: C.secondary, marginTop: 2 }}>
                            {fmtDate(b.start_time)} → {fmtDate(b.end_time)}
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <Badge label={BOOKING_STATUS[b.status]?.label || b.status}
                              color={BOOKING_STATUS[b.status]?.color || C.text}
                              bg={BOOKING_STATUS[b.status]?.bg || C.fill} />
                          </div>
                        </div>
                      ),
                    })}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      position: "absolute", left, width,
                      top: 4, bottom: 4,
                      background: isActive ? C.orange : C.blue,
                      borderRadius: 4, opacity: 0.85, cursor: "pointer",
                      overflow: "hidden", whiteSpace: "nowrap",
                    }}
                  >
                    <div style={{ fontSize: 10, color: "#fff", padding: "2px 5px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {b.customer_name}
                    </div>
                  </div>
                );
              })}

              {/* Block segments */}
              {getBlocksForVehicle(v.id, "block").map(bl => {
                const { left, width } = daySpan(bl.start_time, bl.end_time);
                const color = BLOCK_COLORS[bl.reason] || C.secondary;
                return (
                  <div
                    key={bl.id}
                    onMouseEnter={e => setTooltip({
                      x: (e as any).clientX, y: (e as any).clientY,
                      content: (
                        <div>
                          <div style={{ fontWeight: 600 }}>Blockerad: {bl.reason}</div>
                          {bl.notes && <div style={{ fontSize: 11, marginTop: 2 }}>{bl.notes}</div>}
                          <div style={{ fontSize: 11, color: C.secondary, marginTop: 2 }}>
                            {fmtDate(bl.start_time)} → {fmtDate(bl.end_time)}
                          </div>
                        </div>
                      ),
                    })}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      position: "absolute", left, width,
                      top: 4, bottom: 4, background: color,
                      borderRadius: 4, opacity: 0.7, cursor: "default",
                    }}
                  >
                    <div style={{ fontSize: 10, color: "#fff", padding: "2px 5px" }}>
                      {bl.reason}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: "fixed", left: tooltip.x + 12, top: tooltip.y - 8, zIndex: 9999,
          background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10,
          padding: "10px 14px", boxShadow: shadowMd, fontSize: 13, pointerEvents: "none",
          minWidth: 160,
        }}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

// ─── VIEW 3: ACTIVE RENTALS ───────────────────────────────────────────────────
function ActiveRentalsView({
  onComplete, onToast,
}: { onComplete: (id: string) => void; onToast: (m: string, t?: "ok" | "err") => void }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [active, confirmed] = await Promise.all([
        api.get("/api/rental/bookings?status=ACTIVE"),
        api.get("/api/rental/bookings?status=CONFIRMED"),
      ]);
      setBookings([...(active.bookings || []), ...(confirmed.bookings || [])]);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSkeleton />;

  if (!bookings.length) return (
    <EmptyState icon="🔑" title="Inga aktiva uthyrningar" desc="Just nu är inga fordon uthyrda." />
  );

  const now = new Date();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {bookings.map(b => {
        const end = new Date(b.end_time);
        const isOverdue = b.status === "ACTIVE" && end < now;
        const hoursLeft = Math.round((end.getTime() - now.getTime()) / 3600000);
        const st = BOOKING_STATUS[b.status];

        return (
          <div key={b.id} style={{
            background: C.surface, borderRadius: 12, padding: 20,
            border: `1px solid ${isOverdue ? C.red : C.border}`,
            boxShadow: shadow,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{b.customer_name || "Okänd"}</span>
                  <Badge label={st?.label || b.status} color={st?.color || C.text} bg={st?.bg || C.fill} />
                  {isOverdue && <Badge label="FÖRSENAD" color={C.red} bg={C.redLight} />}
                </div>
                <div style={{ fontSize: 13, color: C.secondary }}>
                  {b.vehicle?.registration_number} — {b.vehicle?.make} {b.vehicle?.model}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{b.booking_number}</div>
                <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
                  {fmtSEK(b.total_amount || 0)}
                </div>
              </div>
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12,
              marginTop: 14, padding: "12px 0", borderTop: `1px solid ${C.separator}`,
            }}>
              <div>
                <div style={{ fontSize: 11, color: C.secondary }}>Startade</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {b.actual_start ? fmtDateTime(b.actual_start) : fmtDate(b.start_time)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.secondary }}>Planerat slut</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: isOverdue ? C.red : C.text }}>
                  {fmtDate(b.end_time)}
                  {!isOverdue && hoursLeft > 0 && hoursLeft < 48 && (
                    <span style={{ fontSize: 11, color: C.secondary, marginLeft: 4 }}>({hoursLeft}h kvar)</span>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.secondary }}>Mätarstart</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {b.odometer_start ? `${b.odometer_start.toLocaleString("sv-SE")} km` : "—"}
                </div>
              </div>
            </div>

            {b.status === "ACTIVE" && (
              <div style={{ marginTop: 12 }}>
                <Btn variant="primary" onClick={() => onComplete(b.id)}>Slutför uthyrning</Btn>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── VIEW 4: PIX FEED ─────────────────────────────────────────────────────────
function PixFeedView() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { events: e } = await api.get("/api/rental/pix-feed?limit=100");
        setEvents(e || []);
      } catch { /* silent */ }
      setLoading(false);
    };
    load();
    const t = setInterval(load, 15000); // refresh every 15s
    return () => clearInterval(t);
  }, []);

  const EVENT_ICONS: Record<string, string> = {
    BOOKING_CREATED: "📋", BOOKING_CONFIRMED: "✅", BOOKING_CANCELLED: "❌",
    RENTAL_STARTED: "🔑", RENTAL_COMPLETED: "🏁", RENTAL_EXTENDED: "⏱",
    VEHICLE_BLOCKED: "🚫", VEHICLE_RELEASED_FROM_BLOCK: "✅",
    DAMAGE_REPORTED: "⚠️", DAMAGE_CLEARED: "✅",
    PAYMENT_RECEIVED: "💰", DEPOSIT_CHARGED: "💳", DEPOSIT_REFUNDED: "↩️",
    STATUS_CHANGED: "🔄",
  };

  const EVENT_LABELS: Record<string, string> = {
    BOOKING_CREATED: "Bokning skapad", BOOKING_CONFIRMED: "Bokning bekräftad",
    BOOKING_CANCELLED: "Bokning avbokad", RENTAL_STARTED: "Uthyrning startad",
    RENTAL_COMPLETED: "Uthyrning avslutad", RENTAL_EXTENDED: "Uthyrning förlängd",
    VEHICLE_BLOCKED: "Fordon blockerat", VEHICLE_RELEASED_FROM_BLOCK: "Blockering borttagen",
    DAMAGE_REPORTED: "Skada rapporterad", DAMAGE_CLEARED: "Skada åtgärdad",
    PAYMENT_RECEIVED: "Betalning mottagen", DEPOSIT_CHARGED: "Deposition debiterad",
    DEPOSIT_REFUNDED: "Deposition återbetald", STATUS_CHANGED: "Status ändrad",
  };

  const filtered = events.filter(e =>
    !filter || e.event_type.includes(filter.toUpperCase()) ||
    e.vehicle?.registration_number?.includes(filter.toUpperCase()) ||
    e.booking?.customer_name?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <LoadingSkeleton />;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="Filtrera på fordon, event eller kund..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            width: "100%", maxWidth: 400, padding: "8px 12px",
            borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13,
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ color: C.secondary, textAlign: "center", padding: "40px 0", fontSize: 14 }}>
            Inga PIX-händelser
          </div>
        )}
        {filtered.map(e => (
          <div key={e.id} style={{
            background: C.surface, borderRadius: 10, padding: "12px 16px",
            border: `1px solid ${C.border}`, boxShadow: shadow,
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>
              {EVENT_ICONS[e.event_type] || "⚡"}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {EVENT_LABELS[e.event_type] || e.event_type}
                </span>
                {e.vehicle && (
                  <span style={{ fontSize: 12, color: C.secondary }}>
                    {e.vehicle.registration_number} — {e.vehicle.make} {e.vehicle.model}
                  </span>
                )}
                {e.booking?.customer_name && (
                  <span style={{ fontSize: 12, color: C.blue }}>
                    {e.booking.customer_name}
                  </span>
                )}
              </div>
              {e.metadata && Object.keys(e.metadata).length > 0 && (
                <div style={{ fontSize: 11, color: C.secondary, marginTop: 3 }}>
                  {e.metadata.mileage && `${e.metadata.mileage} km körda`}
                  {e.metadata.total_amount && ` · ${fmtSEK(e.metadata.total_amount)}`}
                  {e.metadata.damage_notes && ` · Skada: ${e.metadata.damage_notes}`}
                  {e.metadata.reason && ` · ${e.metadata.reason}`}
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: C.tertiary, flexShrink: 0, marginTop: 2 }}>
              {fmtRelative(e.timestamp)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MODAL: BOOKING ───────────────────────────────────────────────────────────
function BookingModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (m: string) => void }) {
  const [step, setStep] = useState(1);
  const [fromDate, setFromDate] = useState(isoDate(new Date()));
  const [toDate, setToDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 3); return isoDate(d); });
  const [available, setAvailable] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_name: "", customer_email: "", customer_phone: "",
    customer_driver_license: "", notes: "",
  });

  const searchAvailability = async () => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    try {
      const { available: a } = await api.get(
        `/api/rental/availability?from_date=${fromDate}&to_date=${toDate}`
      );
      setAvailable(a || []);
      setStep(2);
    } catch (e: any) {
      alert(e.message);
    }
    setLoading(false);
  };

  const submit = async () => {
    if (!selectedVehicle || !form.customer_name) return;
    setSubmitting(true);
    try {
      await api.post("/api/rental/bookings", {
        vehicle_id: selectedVehicle.id,
        start_time: new Date(fromDate).toISOString(),
        end_time: new Date(toDate).toISOString(),
        ...form,
      });
      onSuccess(`Bokning skapad för ${form.customer_name}`);
    } catch (e: any) {
      alert(e.message);
    }
    setSubmitting(false);
  };

  return (
    <Modal title="Ny hyrbilsbokning" onClose={onClose} width={540}>
      {/* Step indicator */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
        {["Välj datum", "Välj fordon", "Kunduppgifter", "Bekräfta"].map((s, i) => (
          <div key={i} style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, flexShrink: 0,
              background: step > i + 1 ? C.green : step === i + 1 ? C.blue : C.fill,
              color: step >= i + 1 ? "#fff" : C.tertiary,
            }}>{step > i + 1 ? "✓" : i + 1}</div>
            {i < 3 && <div style={{ flex: 1, height: 1, background: step > i + 1 ? C.green : C.border }} />}
          </div>
        ))}
      </div>

      {/* Step 1: Dates */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Upphämtning" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            <Input label="Återlämning" type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <Btn variant="primary" onClick={searchAvailability} disabled={loading}>
            {loading ? "Söker..." : "Visa tillgängliga fordon →"}
          </Btn>
        </div>
      )}

      {/* Step 2: Vehicle selection */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {available.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: C.secondary }}>
              Inga fordon tillgängliga för vald period.
            </div>
          ) : (
            available.map(v => (
              <div
                key={v.id}
                onClick={() => { setSelectedVehicle(v); setStep(3); }}
                style={{
                  padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                  border: `2px solid ${selectedVehicle?.id === v.id ? C.blue : C.border}`,
                  background: selectedVehicle?.id === v.id ? C.blueLight : C.surface,
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {v.registration_number} — {v.make} {v.model}
                    </div>
                    <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
                      Kategori {v.category} · {v.seats} säten · {v.transmission}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{fmtSEK(v.calculated_price)}</div>
                    <div style={{ fontSize: 11, color: C.secondary }}>{v.days} dagar</div>
                  </div>
                </div>
              </div>
            ))
          )}
          <Btn onClick={() => setStep(1)}>← Ändra datum</Btn>
        </div>
      )}

      {/* Step 3: Customer details */}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input label="Namn *" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
          <Input label="E-post" type="email" value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} />
          <Input label="Telefon" type="tel" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
          <Input label="Körkortsnummer" value={form.customer_driver_license} onChange={e => setForm(f => ({ ...f, customer_driver_license: e.target.value }))} />
          <Input label="Anteckningar" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => setStep(2)}>← Tillbaka</Btn>
            <Btn variant="primary" onClick={() => setStep(4)} disabled={!form.customer_name}>Granska bokning →</Btn>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && selectedVehicle && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: C.fill, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: C.secondary }}>Fordon</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                {selectedVehicle.registration_number} — {selectedVehicle.make} {selectedVehicle.model}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: C.secondary }}>Period</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{fmtDate(fromDate)} → {fmtDate(toDate)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: C.secondary }}>Kund</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{form.customer_name}</span>
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              paddingTop: 10, borderTop: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Totalt</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.blue }}>
                {fmtSEK(selectedVehicle.calculated_price)}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => setStep(3)}>← Ändra</Btn>
            <Btn variant="primary" onClick={submit} disabled={submitting}>
              {submitting ? "Skapar..." : "✓ Bekräfta bokning"}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── MODAL: COMPLETE RENTAL ───────────────────────────────────────────────────
function CompleteRentalModal({ bookingId, onClose, onSuccess }: {
  bookingId: string; onClose: () => void; onSuccess: (m: string) => void;
}) {
  const [form, setForm] = useState({ odometer_end: "", fuel_level_end: "", damage_notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const { mileage, final_total } = await api.patch(`/api/rental/bookings/${bookingId}/complete`, {
        odometer_end: form.odometer_end ? parseInt(form.odometer_end) : undefined,
        fuel_level_end: form.fuel_level_end ? parseInt(form.fuel_level_end) : undefined,
        damage_notes: form.damage_notes || undefined,
      });
      const msg = `Uthyrning avslutad${mileage ? ` · ${mileage} km körda` : ""}${final_total ? ` · ${fmtSEK(final_total)}` : ""}`;
      onSuccess(msg);
    } catch (e: any) {
      alert(e.message);
    }
    setSubmitting(false);
  };

  return (
    <Modal title="Slutför uthyrning" onClose={onClose} width={420}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Input label="Mätarställning vid retur (km)" type="number" value={form.odometer_end}
          onChange={e => setForm(f => ({ ...f, odometer_end: e.target.value }))} />
        <Input label="Bränslenivå (0–100%)" type="number" min="0" max="100" value={form.fuel_level_end}
          onChange={e => setForm(f => ({ ...f, fuel_level_end: e.target.value }))} />
        <Input label="Skadeanmärkning (lämna tomt om inget)" value={form.damage_notes}
          onChange={e => setForm(f => ({ ...f, damage_notes: e.target.value }))} />
        {form.damage_notes && (
          <div style={{ background: C.redLight, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: C.red }}>
            ⚠️ Fordonet markeras som skadat och måste godkännas innan nästa uthyrning.
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <Btn onClick={onClose}>Avbryt</Btn>
          <Btn variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? "Avslutar..." : "🏁 Slutför"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─── MODAL: BLOCK VEHICLE ─────────────────────────────────────────────────────
function BlockModal({ vehicleId, onClose, onSuccess }: {
  vehicleId: string; onClose: () => void; onSuccess: (m: string) => void;
}) {
  const [form, setForm] = useState({
    start_time: isoDate(new Date()),
    end_time: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return isoDate(d); })(),
    reason: "SERVICE", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post("/api/rental/blocks", {
        vehicle_id: vehicleId,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        reason: form.reason,
        notes: form.notes,
      });
      onSuccess("Fordon blockerat");
    } catch (e: any) {
      alert(e.message);
    }
    setSubmitting(false);
  };

  return (
    <Modal title="Blockera fordon" onClose={onClose} width={380}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Från" type="date" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
          <Input label="Till" type="date" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
        </div>
        <Select
          label="Orsak"
          value={form.reason}
          onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
          options={[
            { value: "SERVICE", label: "Service" },
            { value: "DAMAGE", label: "Skada" },
            { value: "PRIVATE", label: "Privat bruk" },
            { value: "INSPECTION", label: "Besiktning" },
            { value: "OTHER", label: "Övrigt" },
          ]}
        />
        <Input label="Anteckning" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <Btn onClick={onClose}>Avbryt</Btn>
          <Btn variant="danger" onClick={submit} disabled={submitting}>
            {submitting ? "Blockerar..." : "🚫 Blockera"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Modal({ title, children, onClose, width = 480 }: {
  title: string; children: React.ReactNode; onClose: () => void; width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      backdropFilter: "blur(2px)",
    }}>
      <div ref={ref} style={{
        background: C.surface, borderRadius: 16, padding: "24px",
        width, maxWidth: "calc(100vw - 48px)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        maxHeight: "85vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{
            border: "none", background: C.fill, color: C.secondary, borderRadius: "50%",
            width: 28, height: 28, cursor: "pointer", fontSize: 16,
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          borderRadius: 12, padding: 20,
          border: `1px solid ${C.border}`, height: 120,
          background: `linear-gradient(90deg, ${C.fill} 0%, ${C.surface} 50%, ${C.fill} 100%)`,
          backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite",
        }} />
      ))}
    </div>
  );
}

function EmptyState({ icon, title, desc, action }: {
  icon: string; title: string; desc: string; action?: React.ReactNode;
}) {
  return (
    <div style={{
      textAlign: "center", padding: "60px 20px",
      background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`,
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: C.secondary, marginBottom: 20 }}>{desc}</div>
      {action}
    </div>
  );
}
