/**
 * CultureModule — pixdrift Culture & Event Automation
 * "Set and forget — no event forgotten, no responsibility unclear."
 *
 * Views:
 *  1. Upcoming Events — calendar strip + event cards
 *  2. Event Detail    — full event info + order + timeline
 *  3. Templates       — preconfigured event packages
 *  4. Cost Overview   — monthly & yearly culture spend
 */

import { useState, useEffect, useCallback } from "react";

// ─── Design tokens (matches Dashboard.tsx) ────────────────────────────────────
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

// ─── Event type config ────────────────────────────────────────────────────────
const EVENT_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  BIRTHDAY:     { emoji: "🎂", label: "Födelsedag",  color: C.purple },
  BREAKFAST:    { emoji: "🥐", label: "Frukost",     color: C.orange },
  CELEBRATION:  { emoji: "🎉", label: "Firande",     color: C.green  },
  KICKOFF:      { emoji: "🚀", label: "Kickoff",     color: C.blue   },
  FAREWELL:     { emoji: "👋", label: "Avsked",      color: C.red    },
  LUNCH:        { emoji: "🍽️", label: "Lunch",       color: C.orange },
  MEETING:      { emoji: "📋", label: "Möte",        color: C.secondary },
  WORKSHOP:     { emoji: "🔧", label: "Workshop",    color: C.blue   },
  ANNIVERSARY:  { emoji: "⭐", label: "Jubileum",    color: C.purple },
  RECURRING:    { emoji: "🔄", label: "Återkommande", color: C.green },
  OTHER:        { emoji: "📅", label: "Övrigt",      color: C.tertiary },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  UPCOMING:  { label: "Kommande",      color: C.blue   },
  CONFIRMED: { label: "Bekräftat",     color: C.green  },
  ORDERED:   { label: "Beställt",      color: C.purple },
  COMPLETED: { label: "Klart",         color: C.secondary },
  CANCELLED: { label: "Avbokat",       color: C.red    },
  MISSED:    { label: "Missat",        color: C.red    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateSE(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("sv-SE", { weekday: "short", month: "short", day: "numeric" });
}

function formatMoney(n: number | null): string {
  if (n == null) return "—";
  return `${n.toLocaleString("sv-SE")} kr`;
}

function getDayStrip(): { date: Date; label: string; dayNum: number; isToday: boolean }[] {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      date: d,
      label: d.toLocaleDateString("sv-SE", { weekday: "short" }),
      dayNum: d.getDate(),
      isToday: i === 0,
    });
  }
  return days;
}

// ─── API ──────────────────────────────────────────────────────────────────────
const API_BASE = "/api/culture";

async function apiFetch(path: string, options?: RequestInit) {
  const orgId = localStorage.getItem("orgId") || "";
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-org-id": orgId,
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      background: color + "18", color,
      fontSize: 11, fontWeight: 600,
      padding: "2px 8px", borderRadius: 6,
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 10,
      padding: "20px", border: `0.5px solid ${C.border}`,
      boxShadow: shadow, ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
function Btn({
  onClick, color = C.blue, secondary = false, small = false,
  disabled = false, children,
}: {
  onClick: () => void; color?: string; secondary?: boolean;
  small?: boolean; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: secondary ? "transparent" : color,
        color: secondary ? C.secondary : "#fff",
        border: secondary ? `1px solid ${C.border}` : "none",
        borderRadius: 8, padding: small ? "6px 12px" : "9px 18px",
        fontSize: small ? 12 : 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ─── VIEW 1: Upcoming Events ──────────────────────────────────────────────────
function UpcomingView({ onSelectEvent }: { onSelectEvent: (id: string) => void }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const days = getDayStrip();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/events");
      setEvents(data.events || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const eventsForDay = (date: Date) => {
    const ds = date.toISOString().split("T")[0];
    return events.filter(e => e.event_date === ds);
  };

  const displayedEvents = selectedDay
    ? events.filter(e => e.event_date === selectedDay)
    : events;

  const handleConfirm = async (eventId: string) => {
    setConfirming(eventId);
    try {
      await apiFetch(`/events/${eventId}/confirm`, { method: "PATCH" });
      await load();
    } catch (e: any) {
      alert("Kunde inte bekräfta: " + e.message);
    } finally {
      setConfirming(null);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: C.secondary, fontSize: 14 }}>
      Laddar events…
    </div>
  );

  if (error) return (
    <div style={{ padding: 20, color: C.red, fontSize: 13 }}>
      Fel: {error}
    </div>
  );

  return (
    <div>
      {/* Calendar strip */}
      <Card style={{ marginBottom: 16, padding: "16px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.secondary, marginBottom: 12, letterSpacing: "0.05em" }}>
          NÄSTA 14 DAGAR
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
          {days.map(day => {
            const ds = day.date.toISOString().split("T")[0];
            const dayEvents = eventsForDay(day.date);
            const isSelected = selectedDay === ds;
            return (
              <button
                key={ds}
                onClick={() => setSelectedDay(isSelected ? null : ds)}
                style={{
                  flex: "0 0 52px",
                  padding: "8px 4px",
                  borderRadius: 10,
                  border: "none",
                  background: day.isToday ? C.blue : isSelected ? C.inset : "transparent",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 10, color: day.isToday ? "#fff" : C.secondary, fontWeight: 500, marginBottom: 2 }}>
                  {day.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: day.isToday ? "#fff" : C.text }}>
                  {day.dayNum}
                </div>
                {dayEvents.length > 0 && (
                  <div style={{ display: "flex", gap: 2, justifyContent: "center", marginTop: 4, flexWrap: "wrap" }}>
                    {dayEvents.slice(0, 3).map((ev, i) => (
                      <div
                        key={i}
                        style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: EVENT_CONFIG[ev.event_type]?.color || C.tertiary,
                        }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Event cards */}
      {displayedEvents.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", color: C.secondary, fontSize: 14, padding: "20px 0" }}>
            {selectedDay ? "Inga events denna dag" : "Inga kommande events nästa 30 dagar 🎉"}
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {displayedEvents.map(ev => {
            const cfg = EVENT_CONFIG[ev.event_type] || EVENT_CONFIG.OTHER;
            const statusCfg = STATUS_CONFIG[ev.status] || STATUS_CONFIG.UPCOMING;
            const needsAttention = ev.status === "UPCOMING" && !ev.responsible_user_id;
            return (
              <Card key={ev.id} style={{ cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  {/* Emoji */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: cfg.color + "18",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, flexShrink: 0,
                  }}>
                    {cfg.emoji}
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }} onClick={() => onSelectEvent(ev.id)}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 3 }}>
                      {ev.title}
                    </div>
                    <div style={{ fontSize: 12, color: C.secondary, marginBottom: 6 }}>
                      {formatDateSE(ev.event_date)}
                      {ev.event_time && ` • ${ev.event_time.substring(0, 5)}`}
                      {ev.participant_count > 0 && ` • ${ev.participant_count} deltagare`}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Badge color={cfg.color}>{cfg.emoji} {cfg.label}</Badge>
                      <Badge color={statusCfg.color}>{statusCfg.label}</Badge>
                      {needsAttention && <Badge color={C.orange}>⚠️ Ingen ansvarig</Badge>}
                      {ev.is_recurring && <Badge color={C.secondary}>🔄 Återkommande</Badge>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, flexDirection: "column", alignItems: "flex-end" }}>
                    {ev.status === "UPCOMING" && (
                      <Btn
                        small
                        onClick={() => handleConfirm(ev.id)}
                        disabled={confirming === ev.id}
                      >
                        {confirming === ev.id ? "…" : "Bekräfta + Beställ"}
                      </Btn>
                    )}
                    {ev.status === "CONFIRMED" || ev.status === "ORDERED" ? (
                      <Btn small secondary onClick={() => onSelectEvent(ev.id)}>
                        Visa order →
                      </Btn>
                    ) : null}
                    {needsAttention && (
                      <Btn small color={C.orange} secondary onClick={() => onSelectEvent(ev.id)}>
                        Tilldela mig
                      </Btn>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── VIEW 2: Event Detail ─────────────────────────────────────────────────────
function EventDetailView({ eventId, onBack }: { eventId: string; onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/events/${eventId}`)
      .then(setData)
      .catch(e => alert(e.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: C.secondary }}>
      Laddar…
    </div>
  );

  if (!data?.event) return (
    <Card><div style={{ color: C.red }}>Event hittades inte.</div></Card>
  );

  const { event, order, template } = data;
  const cfg = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.OTHER;
  const statusCfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.UPCOMING;

  const timeline = [
    { label: "Skapad", done: true, at: event.created_at },
    { label: "Bekräftad", done: ["CONFIRMED","ORDERED","COMPLETED"].includes(event.status), at: null },
    { label: "Beställd", done: ["ORDERED","COMPLETED"].includes(event.status), at: order?.confirmed_at },
    { label: "Levererad", done: event.status === "COMPLETED", at: order?.delivered_at },
  ];

  return (
    <div>
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", color: C.blue, fontSize: 14, cursor: "pointer", marginBottom: 16, padding: 0 }}
      >
        ← Tillbaka
      </button>

      {/* Header */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: cfg.color + "18",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, flexShrink: 0,
          }}>
            {cfg.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 6 }}>
              {event.title}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <Badge color={cfg.color}>{cfg.label}</Badge>
              <Badge color={statusCfg.color}>{statusCfg.label}</Badge>
            </div>
            <div style={{ fontSize: 13, color: C.secondary }}>
              📅 {formatDateSE(event.event_date)}
              {event.event_time && ` • ⏰ ${event.event_time.substring(0, 5)}`}
            </div>
            {event.location && (
              <div style={{ fontSize: 13, color: C.secondary }}>📍 {event.location}</div>
            )}
          </div>
        </div>
        {event.description && (
          <div style={{ marginTop: 12, fontSize: 13, color: C.secondary, borderTop: `0.5px solid ${C.border}`, paddingTop: 12 }}>
            {event.description}
          </div>
        )}
      </Card>

      {/* Participants + Responsible */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.secondary, marginBottom: 12, letterSpacing: "0.05em" }}>
          DELTAGARE & ANSVAR
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, color: C.secondary, marginBottom: 4 }}>Deltagare</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>
              {event.participant_count || 0}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: C.secondary, marginBottom: 4 }}>Ansvarig</div>
            <div style={{ fontSize: 13, color: event.responsible_user_id ? C.text : C.orange, fontWeight: 500 }}>
              {event.responsible_user_id ? `User ${event.responsible_user_id.substring(0, 8)}…` : "⚠️ Ingen ansvarig"}
            </div>
          </div>
          {event.fallback_user_id && (
            <div>
              <div style={{ fontSize: 12, color: C.secondary, marginBottom: 4 }}>Backup</div>
              <div style={{ fontSize: 13, color: C.text }}>
                User {event.fallback_user_id.substring(0, 8)}…
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Order details */}
      {order && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.secondary, marginBottom: 12, letterSpacing: "0.05em" }}>
            BESTÄLLNING
          </div>
          <div style={{ marginBottom: 8 }}>
            <Badge color={STATUS_CONFIG[order.status]?.color || C.secondary}>
              {STATUS_CONFIG[order.status]?.label || order.status}
            </Badge>
          </div>
          {order.supplier_name && (
            <div style={{ fontSize: 13, color: C.secondary, marginBottom: 4 }}>
              Leverantör: {order.supplier_name}
            </div>
          )}
          {order.delivery_date && (
            <div style={{ fontSize: 13, color: C.secondary, marginBottom: 8 }}>
              Leverans: {formatDateSE(order.delivery_date)} {order.delivery_time && `kl. ${order.delivery_time.substring(0, 5)}`}
            </div>
          )}
          {Array.isArray(order.items) && order.items.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: C.secondary, marginBottom: 6 }}>Artiklar:</div>
              {order.items.map((item: any, i: number) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 13, padding: "4px 0",
                  borderBottom: i < order.items.length - 1 ? `0.5px solid ${C.border}` : "none",
                }}>
                  <span>{item.name}</span>
                  <span style={{ color: C.secondary }}>{item.quantity} {item.unit}</span>
                </div>
              ))}
            </div>
          )}
          {order.total_amount && (
            <div style={{ marginTop: 12, fontSize: 14, fontWeight: 700, color: C.text, textAlign: "right" }}>
              Totalt: {formatMoney(order.total_amount)}
            </div>
          )}
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.secondary, marginBottom: 12, letterSpacing: "0.05em" }}>
          TIDSLINJE
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {timeline.map((step, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", position: "relative" }}>
              {i < timeline.length - 1 && (
                <div style={{
                  position: "absolute", top: 10, left: "50%", width: "100%",
                  height: 2, background: step.done ? C.green : C.border,
                }} />
              )}
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                background: step.done ? C.green : C.border,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 6px",
                position: "relative", zIndex: 1,
              }}>
                {step.done && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div style={{ fontSize: 10, color: step.done ? C.text : C.tertiary, fontWeight: step.done ? 600 : 400 }}>
                {step.label}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── VIEW 3: Templates ────────────────────────────────────────────────────────
function TemplatesView({ onCreateFromTemplate }: { onCreateFromTemplate: (templateId: string) => void }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/templates")
      .then(d => setTemplates(d.templates || []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign: "center", color: C.secondary, padding: 40 }}>Laddar mallar…</div>
  );

  return (
    <div>
      <div style={{ fontSize: 13, color: C.secondary, marginBottom: 16 }}>
        Förkonfigurerade eventpaket — klicka för att skapa event från mall.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {templates.map(t => {
          const cfg = EVENT_CONFIG[t.event_type] || EVENT_CONFIG.OTHER;
          const items: any[] = Array.isArray(t.default_items) ? t.default_items : (typeof t.default_items === "string" ? JSON.parse(t.default_items) : []);
          return (
            <Card key={t.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: cfg.color + "18",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20,
                }}>
                  {cfg.emoji}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{t.name}</div>
                  <Badge color={cfg.color}>{cfg.label}</Badge>
                </div>
              </div>

              {t.description && (
                <div style={{ fontSize: 12, color: C.secondary, marginBottom: 10 }}>{t.description}</div>
              )}

              {items.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: C.secondary, marginBottom: 4, fontWeight: 600 }}>INGÅR:</div>
                  {items.map((item: any, i: number) => (
                    <div key={i} style={{ fontSize: 12, color: C.text, padding: "2px 0" }}>
                      • {item.name} ({item.quantity} {item.unit})
                      {item.note && <span style={{ color: C.secondary }}> — {item.note}</span>}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <div style={{ fontSize: 12, color: C.secondary }}>
                  {t.budget_per_person ? `${t.budget_per_person} kr/person` : "Budget ej satt"}
                  {" · "}
                  {t.advance_notice_days}d varsel
                </div>
                <Btn small onClick={() => onCreateFromTemplate(t.id)}>
                  Skapa event →
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── VIEW 4: Cost Overview ────────────────────────────────────────────────────
function CostView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    apiFetch(`/costs?year=${year}`)
      .then(setData)
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign: "center", color: C.secondary, padding: 40 }}>Laddar kostnader…</div>
  );

  if (!data) return null;

  const maxMonthly = Math.max(...(data.monthly || []).map((m: any) => m.total), 1);

  const monthNames = ["Jan","Feb","Mar","Apr","Maj","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];

  return (
    <div>
      {/* Big number */}
      <Card style={{ marginBottom: 12, textAlign: "center", padding: "28px 20px" }}>
        <div style={{ fontSize: 13, color: C.secondary, marginBottom: 8, letterSpacing: "0.05em", fontWeight: 600 }}>
          TOTAL KULTURBUDGET {year}
        </div>
        <div style={{ fontSize: 42, fontWeight: 800, color: C.text, marginBottom: 4 }}>
          {formatMoney(data.total_year)}
        </div>
        <div style={{ fontSize: 13, color: C.secondary }}>
          Fördelat på {(data.by_type || []).reduce((s: number, t: any) => s + t.count, 0)} events
        </div>
      </Card>

      {/* Monthly bar chart */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.secondary, marginBottom: 16, letterSpacing: "0.05em" }}>
          MÅNADSVIS KOSTNAD
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 80 }}>
          {(data.monthly || []).map((m: any) => {
            const pct = maxMonthly > 0 ? (m.total / maxMonthly) * 100 : 0;
            const isCurrentMonth = m.month === new Date().getMonth() + 1;
            return (
              <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div
                  title={`${monthNames[m.month - 1]}: ${formatMoney(m.total)}`}
                  style={{
                    width: "100%",
                    height: `${Math.max(pct, m.total > 0 ? 4 : 0)}%`,
                    minHeight: m.total > 0 ? 4 : 0,
                    background: isCurrentMonth ? C.blue : C.inset,
                    borderRadius: "3px 3px 0 0",
                  }}
                />
                <div style={{ fontSize: 9, color: C.secondary }}>{monthNames[m.month - 1]}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* By type */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.secondary, marginBottom: 12, letterSpacing: "0.05em" }}>
          FÖRDELNING PER TYP
        </div>
        {(data.by_type || []).length === 0 ? (
          <div style={{ fontSize: 13, color: C.secondary }}>Inga kostnadsposter ännu.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(data.by_type || []).map((t: any) => {
              const cfg = EVENT_CONFIG[t.type] || EVENT_CONFIG.OTHER;
              const pct = data.total_year > 0 ? Math.round((t.total / data.total_year) * 100) : 0;
              return (
                <div key={t.type}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>{cfg.emoji} {cfg.label} ({t.count} events)</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{formatMoney(t.total)}</span>
                  </div>
                  <div style={{ height: 4, background: C.inset, borderRadius: 2 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: cfg.color, borderRadius: 2 }} />
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

// ─── Create From Template Modal ───────────────────────────────────────────────
function CreateFromTemplateModal({
  templateId, onClose, onCreated,
}: { templateId: string; onClose: () => void; onCreated: () => void }) {
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [participantCount, setParticipantCount] = useState("10");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<any>(null);

  useEffect(() => {
    apiFetch(`/templates`).then(d => {
      const t = (d.templates || []).find((t: any) => t.id === templateId);
      setTemplate(t);
    });
  }, [templateId]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await apiFetch(`/events/from-template/${templateId}`, {
        method: "POST",
        body: JSON.stringify({
          event_date: eventDate,
          participant_count: parseInt(participantCount) || 0,
          notes: notes || undefined,
        }),
      });
      onCreated();
    } catch (e: any) {
      alert("Kunde inte skapa event: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: C.surface, borderRadius: 16, padding: 28,
        width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          Skapa event från mall
        </div>
        {template && (
          <div style={{ fontSize: 13, color: C.secondary, marginBottom: 20 }}>
            {EVENT_CONFIG[template.event_type]?.emoji} {template.name}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: C.secondary, display: "block", marginBottom: 4 }}>Datum</label>
          <input
            type="date"
            value={eventDate}
            onChange={e => setEventDate(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8,
              border: `1px solid ${C.border}`, fontSize: 13,
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: C.secondary, display: "block", marginBottom: 4 }}>Antal deltagare</label>
          <input
            type="number"
            value={participantCount}
            onChange={e => setParticipantCount(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8,
              border: `1px solid ${C.border}`, fontSize: 13,
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: C.secondary, display: "block", marginBottom: 4 }}>Anteckningar (valfritt)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8,
              border: `1px solid ${C.border}`, fontSize: 13, resize: "vertical",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn secondary onClick={onClose}>Avbryt</Btn>
          <Btn onClick={handleCreate} disabled={loading}>
            {loading ? "Skapar…" : "Skapa event"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Main CultureModule ───────────────────────────────────────────────────────
type CultureView = "upcoming" | "detail" | "templates" | "costs";

export default function CultureModule() {
  const [view, setView] = useState<CultureView>("upcoming");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [createTemplateId, setCreateTemplateId] = useState<string | null>(null);

  const handleSelectEvent = (id: string) => {
    setSelectedEventId(id);
    setView("detail");
  };

  const handleCreateFromTemplate = (templateId: string) => {
    setCreateTemplateId(templateId);
  };

  const handleTemplateCreated = () => {
    setCreateTemplateId(null);
    setView("upcoming");
  };

  const tabs: { id: CultureView; label: string; emoji: string }[] = [
    { id: "upcoming",  label: "Events",     emoji: "📅" },
    { id: "templates", label: "Mallar",     emoji: "📦" },
    { id: "costs",     label: "Kostnader",  emoji: "💰" },
  ];

  return (
    <div style={{ padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 4 }}>
          🎉 Kultur & Events
        </div>
        <div style={{ fontSize: 14, color: C.secondary }}>
          Set and forget — no event forgotten, no responsibility unclear.
        </div>
      </div>

      {/* Tab bar */}
      {view !== "detail" && (
        <div style={{
          display: "flex", gap: 4, marginBottom: 20,
          background: C.inset, borderRadius: 10, padding: 3,
          width: "fit-content",
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              style={{
                padding: "7px 16px", borderRadius: 8, border: "none",
                background: view === tab.id ? C.surface : "transparent",
                color: view === tab.id ? C.text : C.secondary,
                fontSize: 13, fontWeight: view === tab.id ? 600 : 400,
                cursor: "pointer",
                boxShadow: view === tab.id ? shadow : "none",
              }}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {view === "upcoming" && (
        <UpcomingView onSelectEvent={handleSelectEvent} />
      )}
      {view === "detail" && selectedEventId && (
        <EventDetailView
          eventId={selectedEventId}
          onBack={() => setView("upcoming")}
        />
      )}
      {view === "templates" && (
        <TemplatesView onCreateFromTemplate={handleCreateFromTemplate} />
      )}
      {view === "costs" && (
        <CostView />
      )}

      {/* Create from template modal */}
      {createTemplateId && (
        <CreateFromTemplateModal
          templateId={createTemplateId}
          onClose={() => setCreateTemplateId(null)}
          onCreated={handleTemplateCreated}
        />
      )}
    </div>
  );
}
