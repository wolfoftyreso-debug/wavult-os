import { useState, useEffect, useRef } from "react";

// ─── Design tokens (matching Dashboard) ──────────────────────────────────────
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

// ─── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES = {
  WORK_ORDER:  { label: "Arbetsorder",        color: "#007AFF", icon: "🔧" },
  TASK:        { label: "Uppgift",             color: "#FF9500", icon: "✓" },
  MEETING:     { label: "Möte",               color: "#AF52DE", icon: "👥" },
  CULTURE:     { label: "Kultur & Event",     color: "#34C759", icon: "🎉" },
  TRAINING:    { label: "Utbildning",         color: "#5AC8FA", icon: "📚" },
  CONFERENCE:  { label: "Konferens",          color: "#FF2D55", icon: "🎤" },
  INSPECTION:  { label: "Besiktning/Revision",color: "#FFCC00", icon: "📋" },
  PERSONAL:    { label: "Personligt",         color: "#8E8E93", icon: "👤" },
} as const;

type CategoryKey = keyof typeof CATEGORIES;

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  category: CategoryKey;
  assignee?: string;
  priority?: "low" | "medium" | "high";
  source_id: string;
  source_type: string;
  description?: string;
}

type ViewMode = "day" | "week" | "month" | "agenda";
type FilterMode = "all" | "work" | "team" | "training" | "inspection";

// ─── Date helpers ─────────────────────────────────────────────────────────────
function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  // Monday = 0, Sunday = 6
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(d: Date): string {
  const days = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];
  return `${days[d.getDay()]} ${d.getDate()}`;
}

function formatMonthYear(d: Date): string {
  const months = ["Januari", "Februari", "Mars", "April", "Maj", "Juni",
    "Juli", "Augusti", "September", "Oktober", "November", "December"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  // Fill from monday before first
  const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
  for (let i = startDay; i > 0; i--) days.push(addDays(first, -i));
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  // Fill to sunday after last
  const endDay = last.getDay() === 0 ? 0 : 7 - last.getDay();
  for (let i = 1; i <= endDay; i++) days.push(addDays(last, i));
  return days;
}

// Build demo events relative to now
function makeDemoEvents(): CalendarEvent[] {
  const now = new Date();
  function at(offsetDays: number, h: number, m: number): Date {
    const d = new Date(now);
    d.setDate(d.getDate() + offsetDays);
    d.setHours(h, m, 0, 0);
    return d;
  }
  function nextWeekday(targetDay: number): Date {
    const d = new Date(now);
    const current = d.getDay();
    let diff = targetDay - current;
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff);
    d.setHours(8, 30, 0, 0);
    return d;
  }
  return [
    {
      id: "demo-1",
      title: "Servicebokning BMW X5",
      start: at(0, 9, 0),
      end: at(0, 11, 0),
      category: "WORK_ORDER",
      assignee: "Anders B.",
      priority: "high",
      source_id: "wo-001",
      source_type: "work_order",
      description: "Oljebyte + bromsinspektio.",
    },
    {
      id: "demo-2",
      title: "Kundmöte Novacode AB",
      start: at(0, 13, 0),
      end: at(0, 14, 0),
      category: "MEETING",
      assignee: "Erik S.",
      priority: "high",
      source_id: "mtg-001",
      source_type: "meeting",
      description: "Genomgång av Q2-avtal och prissättning.",
    },
    {
      id: "demo-3",
      title: "Offert till Nordic Shop",
      start: at(1, 10, 0),
      category: "TASK",
      assignee: "Maria L.",
      priority: "medium",
      source_id: "task-001",
      source_type: "task",
    },
    {
      id: "demo-4",
      title: "Anders Björks födelsedag 🎂",
      start: at(2, 0, 0),
      category: "CULTURE",
      source_id: "cult-001",
      source_type: "culture",
    },
    {
      id: "demo-5",
      title: "ISO 9001 intern revision",
      start: at(7, 9, 0),
      end: at(7, 17, 0),
      category: "INSPECTION",
      assignee: "Dennis K.",
      priority: "high",
      source_id: "audit-001",
      source_type: "audit",
      description: "Intern revision enligt ISO 9001:2015.",
    },
    {
      id: "demo-6",
      title: "Fredagsfrukost 🥐",
      start: nextWeekday(5),
      category: "CULTURE",
      source_id: "cult-002",
      source_type: "culture",
    },
    {
      id: "demo-7",
      title: "DEKRA besiktning",
      start: at(14, 10, 0),
      end: at(14, 12, 0),
      category: "INSPECTION",
      assignee: "Anders B.",
      source_id: "insp-001",
      source_type: "inspection",
      description: "Periodisk fordonskontroll.",
    },
    {
      id: "demo-8",
      title: "React Advanced Workshop",
      start: at(3, 9, 0),
      end: at(3, 17, 0),
      category: "TRAINING",
      assignee: "Johan W.",
      source_id: "trn-001",
      source_type: "training",
    },
    {
      id: "demo-9",
      title: "Servicebokning Volvo V90",
      start: at(1, 14, 0),
      end: at(1, 16, 0),
      category: "WORK_ORDER",
      assignee: "Anders B.",
      source_id: "wo-002",
      source_type: "work_order",
    },
    {
      id: "demo-10",
      title: "Veckomöte team",
      start: at(2, 9, 0),
      end: at(2, 10, 0),
      category: "MEETING",
      assignee: "Erik S.",
      source_id: "mtg-002",
      source_type: "meeting",
    },
  ];
}

// ─── Filter logic ─────────────────────────────────────────────────────────────
const FILTER_MAP: Record<FilterMode, CategoryKey[]> = {
  all:        ["WORK_ORDER", "TASK", "MEETING", "CULTURE", "TRAINING", "CONFERENCE", "INSPECTION", "PERSONAL"],
  work:       ["WORK_ORDER", "TASK"],
  team:       ["MEETING", "CULTURE"],
  training:   ["TRAINING", "CONFERENCE"],
  inspection: ["INSPECTION"],
};

function filterEvents(events: CalendarEvent[], filter: FilterMode): CalendarEvent[] {
  const allowed = FILTER_MAP[filter];
  return events.filter(e => allowed.includes(e.category));
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function MiniAvatar({ name }: { name: string }) {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: "50%",
      background: C.blue + "22", color: C.blue,
      fontSize: 9, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      {name[0]}
    </div>
  );
}

// ─── Event block (used in week/day view) ─────────────────────────────────────
function EventBlock({
  event, onClick, compact = false
}: {
  event: CalendarEvent;
  onClick: (e: CalendarEvent) => void;
  compact?: boolean;
}) {
  const cat = CATEGORIES[event.category];
  const startMin = event.start.getHours() * 60 + event.start.getMinutes();
  const endMin = event.end
    ? event.end.getHours() * 60 + event.end.getMinutes()
    : startMin + 45;
  const dayStart = 7 * 60;
  const dayEnd = 20 * 60;
  const top = ((startMin - dayStart) / (dayEnd - dayStart)) * 100;
  const height = Math.max(((endMin - startMin) / (dayEnd - dayStart)) * 100, 2);

  return (
    <div
      onClick={() => onClick(event)}
      style={{
        position: "absolute",
        top: `${top}%`,
        height: `${height}%`,
        left: 2, right: 2,
        background: cat.color + "18",
        borderLeft: `3px solid ${cat.color}`,
        borderRadius: "0 6px 6px 0",
        padding: compact ? "2px 4px" : "4px 6px",
        cursor: "pointer",
        overflow: "hidden",
        transition: "filter 0.1s",
        zIndex: 1,
      }}
      onMouseEnter={e => (e.currentTarget.style.filter = "brightness(0.95)")}
      onMouseLeave={e => (e.currentTarget.style.filter = "none")}
    >
      <div style={{ fontSize: compact ? 10 : 11, fontWeight: 600, color: C.text, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {cat.icon} {event.title}
      </div>
      {!compact && (
        <div style={{ fontSize: 10, color: C.secondary, marginTop: 1 }}>
          {formatTime(event.start)}{event.end ? ` – ${formatTime(event.end)}` : ""}
        </div>
      )}
      {!compact && event.assignee && (
        <div style={{ marginTop: 2 }}>
          <MiniAvatar name={event.assignee} />
        </div>
      )}
    </div>
  );
}

// ─── Event pill (used in month view) ─────────────────────────────────────────
function EventPill({ event, onClick }: { event: CalendarEvent; onClick: (e: CalendarEvent) => void }) {
  const cat = CATEGORIES[event.category];
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(event); }}
      style={{
        background: cat.color + "22",
        borderLeft: `2px solid ${cat.color}`,
        borderRadius: "0 4px 4px 0",
        padding: "1px 4px",
        fontSize: 10,
        fontWeight: 500,
        color: C.text,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        cursor: "pointer",
        marginBottom: 1,
      }}
    >
      {cat.icon} {event.title}
    </div>
  );
}

// ─── Day Sidebar ──────────────────────────────────────────────────────────────
function DaySidebar({
  date,
  events,
  onClose,
  onEventClick,
}: {
  date: Date;
  events: CalendarEvent[];
  onClose: () => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());

  // Group by category
  const grouped: Partial<Record<CategoryKey, CalendarEvent[]>> = {};
  for (const e of sorted) {
    if (!grouped[e.category]) grouped[e.category] = [];
    grouped[e.category]!.push(e);
  }

  const days = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
  const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

  return (
    <div style={{
      width: 320,
      flexShrink: 0,
      background: C.surface,
      borderLeft: `0.5px solid ${C.border}`,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        borderBottom: `0.5px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>
            {days[date.getDay()]}
          </div>
          <div style={{ fontSize: 13, color: C.secondary, marginTop: 2 }}>
            {date.getDate()} {months[date.getMonth()]} {date.getFullYear()}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: "50%",
            background: C.fill, border: "none",
            cursor: "pointer", fontSize: 16, color: C.secondary,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "inherit",
          }}
        >
          ×
        </button>
      </div>

      {/* Event list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {sorted.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", padding: "32px 0", gap: 8,
          }}>
            <div style={{ fontSize: 32, opacity: 0.2 }}>📅</div>
            <div style={{ fontSize: 13, color: C.secondary }}>Inga händelser denna dag</div>
          </div>
        ) : (
          Object.entries(grouped).map(([catKey, catEvents]) => {
            const cat = CATEGORIES[catKey as CategoryKey];
            return (
              <div key={catKey} style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: cat.color,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  marginBottom: 6,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </div>
                {catEvents!.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    style={{
                      background: C.fill,
                      borderLeft: `3px solid ${cat.color}`,
                      borderRadius: "0 8px 8px 0",
                      padding: "10px 12px",
                      marginBottom: 6,
                      cursor: "pointer",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.inset)}
                    onMouseLeave={e => (e.currentTarget.style.background = C.fill)}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{ev.title}</div>
                    <div style={{ fontSize: 11, color: C.secondary, marginTop: 3 }}>
                      {formatTime(ev.start)}{ev.end ? ` – ${formatTime(ev.end)}` : ""}
                    </div>
                    {ev.assignee && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <MiniAvatar name={ev.assignee} />
                        <span style={{ fontSize: 11, color: C.secondary }}>{ev.assignee}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Add button */}
      <div style={{
        padding: "12px 16px",
        borderTop: `0.5px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <button style={{
          width: "100%", height: 36, borderRadius: 8,
          background: C.blue, color: "#fff", border: "none",
          fontSize: 13, fontWeight: 500, cursor: "pointer",
          fontFamily: "inherit",
        }}>
          + Lägg till händelse
        </button>
      </div>
    </div>
  );
}

// ─── Event Detail Modal ───────────────────────────────────────────────────────
function EventModal({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const cat = CATEGORIES[event.category];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.surface, borderRadius: 16,
          width: 440, maxWidth: "90vw",
          boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
          overflow: "hidden",
          animation: "slideUp 0.15s ease",
        }}
      >
        {/* Color bar */}
        <div style={{ height: 4, background: cat.color }} />

        <div style={{ padding: "20px 24px 24px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: cat.color,
                textTransform: "uppercase", letterSpacing: "0.06em",
                marginBottom: 4,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                {cat.icon} {cat.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>
                {event.title}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: C.fill, border: "none",
                cursor: "pointer", fontSize: 18, color: C.secondary,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "inherit", flexShrink: 0, marginLeft: 8,
              }}
            >
              ×
            </button>
          </div>

          {/* Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <DetailRow icon="🕐" label="Start" value={`${event.start.toLocaleDateString("sv-SE")} ${formatTime(event.start)}`} />
            {event.end && (
              <DetailRow icon="🕑" label="Slut" value={`${event.end.toLocaleDateString("sv-SE")} ${formatTime(event.end)}`} />
            )}
            {event.assignee && (
              <DetailRow icon="👤" label="Ansvarig" value={event.assignee} />
            )}
            {event.priority && (
              <DetailRow icon="⚡" label="Prioritet" value={
                event.priority === "high" ? "Hög" :
                event.priority === "medium" ? "Medium" : "Låg"
              } />
            )}
            {event.description && (
              <div style={{
                marginTop: 8, padding: "12px",
                background: C.fill, borderRadius: 8,
                fontSize: 13, color: C.secondary, lineHeight: 1.5,
              }}>
                {event.description}
              </div>
            )}
          </div>

          {/* Source badge */}
          <div style={{
            marginTop: 16, padding: "8px 12px",
            background: cat.color + "12", borderRadius: 8,
            fontSize: 11, color: cat.color, fontWeight: 500,
          }}>
            Källa: {event.source_type} · {event.source_id}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 12, color: C.secondary, width: 64, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7–19
const HOUR_HEIGHT = 64; // px per hour

function WeekView({
  weekStart,
  events,
  onEventClick,
  onDayClick,
  selectedDay,
}: {
  weekStart: Date;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
  onDayClick: (d: Date) => void;
  selectedDay: Date | null;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const now = new Date();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to 7am-ish on mount
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, []);

  const dayNames = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Day headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "48px repeat(7, 1fr)",
        borderBottom: `0.5px solid ${C.border}`,
        flexShrink: 0,
        background: C.surface,
      }}>
        <div style={{ borderRight: `0.5px solid ${C.border}` }} />
        {days.map((day, i) => {
          const isToday = isSameDay(day, now);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              style={{
                padding: "10px 8px",
                textAlign: "center",
                cursor: "pointer",
                borderRight: i < 6 ? `0.5px solid ${C.border}` : "none",
                background: isSelected ? C.blue + "08" : "transparent",
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = C.fill; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{
                fontSize: 11, color: isToday ? C.blue : C.secondary,
                fontWeight: 500, letterSpacing: "0.02em",
              }}>
                {dayNames[i]}
              </div>
              <div style={{
                width: 28, height: 28, margin: "2px auto 0",
                borderRadius: "50%",
                background: isToday ? C.blue : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: isToday ? 700 : 400,
                color: isToday ? "#fff" : C.text,
              }}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "48px repeat(7, 1fr)",
          height: HOURS.length * HOUR_HEIGHT,
          position: "relative",
        }}>
          {/* Hour labels */}
          <div style={{ borderRight: `0.5px solid ${C.border}`, position: "relative" }}>
            {HOURS.map((h) => (
              <div
                key={h}
                style={{
                  position: "absolute",
                  top: (h - 7) * HOUR_HEIGHT - 8,
                  right: 6,
                  fontSize: 10,
                  color: C.tertiary,
                  fontVariantNumeric: "tabular-nums",
                  userSelect: "none",
                }}
              >
                {h}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const dayEvents = events.filter(e => isSameDay(e.start, day));
            const isToday = isSameDay(day, now);
            const isSelected = selectedDay && isSameDay(day, selectedDay);

            return (
              <div
                key={di}
                style={{
                  borderRight: di < 6 ? `0.5px solid ${C.border}` : "none",
                  position: "relative",
                  background: isSelected ? C.blue + "04" : isToday ? "#FFFDE7" : "transparent",
                  height: HOURS.length * HOUR_HEIGHT,
                }}
                onClick={() => onDayClick(day)}
              >
                {/* Hour lines */}
                {HOURS.map((h, hi) => (
                  <div
                    key={h}
                    style={{
                      position: "absolute",
                      top: hi * HOUR_HEIGHT,
                      left: 0, right: 0,
                      borderTop: `0.5px solid ${C.border}`,
                      pointerEvents: "none",
                    }}
                  />
                ))}

                {/* Current time indicator */}
                {isToday && (() => {
                  const nowMin = now.getHours() * 60 + now.getMinutes();
                  const dayStartMin = 7 * 60;
                  const dayEndMin = 20 * 60;
                  if (nowMin >= dayStartMin && nowMin <= dayEndMin) {
                    const top = ((nowMin - dayStartMin) / (dayEndMin - dayStartMin)) * 100;
                    return (
                      <div style={{
                        position: "absolute",
                        top: `${top}%`,
                        left: 0, right: 0,
                        height: 2,
                        background: C.red,
                        zIndex: 2,
                        pointerEvents: "none",
                      }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: C.red, position: "absolute",
                          left: -4, top: -3,
                        }} />
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Events */}
                {dayEvents.map((ev) => (
                  <EventBlock
                    key={ev.id}
                    event={ev}
                    onClick={onEventClick}
                    compact={false}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({
  year,
  month,
  events,
  onEventClick,
  onDayClick,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
  onDayClick: (d: Date) => void;
}) {
  const days = getDaysInMonth(year, month);
  const now = new Date();
  const dayNames = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      {/* Day name headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        borderBottom: `0.5px solid ${C.border}`,
        background: C.surface,
        flexShrink: 0,
      }}>
        {dayNames.map(d => (
          <div key={d} style={{
            padding: "8px",
            textAlign: "center",
            fontSize: 11,
            fontWeight: 600,
            color: C.secondary,
            letterSpacing: "0.04em",
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gridTemplateRows: `repeat(${Math.ceil(days.length / 7)}, 1fr)`,
        overflow: "auto",
      }}>
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(day, now);
          const dayEvents = events.filter(e => isSameDay(e.start, day));

          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              style={{
                borderRight: i % 7 < 6 ? `0.5px solid ${C.border}` : "none",
                borderBottom: `0.5px solid ${C.border}`,
                padding: "6px",
                minHeight: 100,
                cursor: "pointer",
                background: isToday ? "#FFFDE7" : "transparent",
                opacity: isCurrentMonth ? 1 : 0.35,
              }}
              onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = C.fill; }}
              onMouseLeave={e => { e.currentTarget.style.background = isToday ? "#FFFDE7" : "transparent"; }}
            >
              {/* Date number */}
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: isToday ? C.blue : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12,
                fontWeight: isToday ? 700 : 400,
                color: isToday ? "#fff" : isCurrentMonth ? C.text : C.secondary,
                marginBottom: 4,
              }}>
                {day.getDate()}
              </div>

              {/* Events (max 3) */}
              {dayEvents.slice(0, 3).map(ev => (
                <EventPill key={ev.id} event={ev} onClick={onEventClick} />
              ))}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: 10, color: C.secondary, paddingLeft: 4 }}>
                  +{dayEvents.length - 3} fler
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────
function DayView({
  date,
  events,
  onEventClick,
}: {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
}) {
  const dayEvents = events.filter(e => isSameDay(e.start, date));
  const now = new Date();
  const isToday = isSameDay(date, now);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "12px 20px",
        borderBottom: `0.5px solid ${C.border}`,
        flexShrink: 0,
        background: C.surface,
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>
          {["Söndag","Måndag","Tisdag","Onsdag","Torsdag","Fredag","Lördag"][date.getDay()]}
          {" "}
          <span style={{ color: isToday ? C.blue : C.secondary }}>
            {date.getDate()}
          </span>
        </div>
        <div style={{ fontSize: 13, color: C.secondary }}>
          {dayEvents.length} händelse{dayEvents.length !== 1 ? "r" : ""}
        </div>
      </div>

      {/* Time grid */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "48px 1fr",
          height: HOURS.length * HOUR_HEIGHT,
          position: "relative",
        }}>
          {/* Hour labels */}
          <div style={{ borderRight: `0.5px solid ${C.border}`, position: "relative" }}>
            {HOURS.map((h) => (
              <div
                key={h}
                style={{
                  position: "absolute",
                  top: (h - 7) * HOUR_HEIGHT - 8,
                  right: 6,
                  fontSize: 10,
                  color: C.tertiary,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {h}:00
              </div>
            ))}
          </div>

          {/* Events column */}
          <div style={{ position: "relative", height: HOURS.length * HOUR_HEIGHT }}>
            {HOURS.map((h, hi) => (
              <div
                key={h}
                style={{
                  position: "absolute",
                  top: hi * HOUR_HEIGHT,
                  left: 0, right: 0,
                  borderTop: `0.5px solid ${C.border}`,
                  pointerEvents: "none",
                }}
              />
            ))}
            {isToday && (() => {
              const nowMin = now.getHours() * 60 + now.getMinutes();
              const dayStartMin = 7 * 60, dayEndMin = 20 * 60;
              if (nowMin >= dayStartMin && nowMin <= dayEndMin) {
                const top = ((nowMin - dayStartMin) / (dayEndMin - dayStartMin)) * 100;
                return (
                  <div style={{
                    position: "absolute", top: `${top}%`,
                    left: 0, right: 0, height: 2, background: C.red, zIndex: 2,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.red, position: "absolute", left: -4, top: -3 }} />
                  </div>
                );
              }
              return null;
            })()}
            {dayEvents.map(ev => (
              <EventBlock key={ev.id} event={ev} onClick={onEventClick} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Agenda View ──────────────────────────────────────────────────────────────
function AgendaView({
  events,
  onEventClick,
}: {
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
}) {
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
  const now = new Date();

  // Group by date
  const grouped: { date: Date; events: CalendarEvent[] }[] = [];
  for (const ev of sorted) {
    const last = grouped[grouped.length - 1];
    if (last && isSameDay(last.date, ev.start)) {
      last.events.push(ev);
    } else {
      grouped.push({ date: ev.start, events: [ev] });
    }
  }

  if (grouped.length === 0) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <div style={{ fontSize: 40, opacity: 0.15 }}>📅</div>
        <div style={{ fontSize: 14, color: C.secondary }}>Inga kommande händelser</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 0 32px" }}>
      {grouped.map(({ date, events: evs }, gi) => {
        const isToday = isSameDay(date, now);
        const isPast = date < now && !isToday;
        const dayNames = ["Söndag","Måndag","Tisdag","Onsdag","Torsdag","Fredag","Lördag"];
        const months = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];

        return (
          <div key={gi}>
            {/* Date header */}
            <div style={{
              padding: "16px 20px 8px",
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              position: "sticky",
              top: 0,
              background: C.bg,
              zIndex: 1,
            }}>
              <div style={{
                fontSize: 15, fontWeight: 700,
                color: isToday ? C.blue : isPast ? C.tertiary : C.text,
              }}>
                {isToday ? "Idag" : `${dayNames[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`}
              </div>
              <div style={{ fontSize: 12, color: C.tertiary }}>
                {evs.length} händelse{evs.length !== 1 ? "r" : ""}
              </div>
            </div>

            {/* Events */}
            {evs.map((ev, ei) => {
              const cat = CATEGORIES[ev.category];
              return (
                <div
                  key={ev.id}
                  onClick={() => onEventClick(ev)}
                  style={{
                    margin: "0 16px 6px",
                    background: C.surface,
                    border: `0.5px solid ${C.border}`,
                    borderLeft: `3px solid ${cat.color}`,
                    borderRadius: "0 10px 10px 0",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                    opacity: isPast ? 0.6 : 1,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.fill)}
                  onMouseLeave={e => (e.currentTarget.style.background = C.surface)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>
                      {cat.icon} {ev.title}
                    </div>
                    <div style={{ fontSize: 11, color: C.secondary, marginTop: 2 }}>
                      {formatTime(ev.start)}{ev.end ? ` – ${formatTime(ev.end)}` : ""}
                      {ev.assignee ? ` · ${ev.assignee}` : ""}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 600, color: cat.color,
                    background: cat.color + "18",
                    padding: "3px 8px", borderRadius: 6,
                  }}>
                    {cat.label}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UnifiedCalendar({ user }: { user?: { id?: string; full_name?: string } }) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch from API + merge with demo fallback
  useEffect(() => {
    const API = "https://api.bc.pixdrift.com";
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("pixdrift_token") : null;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    async function load() {
      setLoading(true);
      try {
        const [tasks, meetings, workOrders, cultureEvents, audits] = await Promise.allSettled([
          fetch(`${API}/api/tasks?status=open`, { headers }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
          fetch(`${API}/api/meetings`, { headers }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
          fetch(`${API}/api/workshop/work-orders`, { headers }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
          fetch(`${API}/api/culture/events`, { headers }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
          fetch(`${API}/api/external-audits`, { headers }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        ]);

        const merged: CalendarEvent[] = [];

        // Normalize tasks
        if (tasks.status === "fulfilled" && Array.isArray(tasks.value)) {
          for (const t of tasks.value) {
            if (t.due_date || t.created_at) {
              merged.push({
                id: `task-${t.id}`,
                title: t.title ?? t.name ?? "Uppgift",
                start: new Date(t.due_date ?? t.created_at),
                category: "TASK",
                assignee: t.assignee_name ?? t.assigned_to ?? undefined,
                priority: t.priority === 1 ? "high" : t.priority === 2 ? "medium" : "low",
                source_id: String(t.id),
                source_type: "task",
              });
            }
          }
        }

        // Normalize meetings
        if (meetings.status === "fulfilled" && Array.isArray(meetings.value)) {
          for (const m of meetings.value) {
            if (m.start_time ?? m.date) {
              merged.push({
                id: `meeting-${m.id}`,
                title: m.title ?? m.subject ?? "Möte",
                start: new Date(m.start_time ?? m.date),
                end: m.end_time ? new Date(m.end_time) : undefined,
                category: "MEETING",
                assignee: m.organizer ?? undefined,
                source_id: String(m.id),
                source_type: "meeting",
                description: m.description,
              });
            }
          }
        }

        // Normalize work orders
        if (workOrders.status === "fulfilled" && Array.isArray(workOrders.value)) {
          for (const w of workOrders.value) {
            if (w.scheduled_date ?? w.created_at) {
              merged.push({
                id: `wo-${w.id}`,
                title: w.title ?? w.vehicle_name ?? "Arbetsorder",
                start: new Date(w.scheduled_date ?? w.created_at),
                end: w.estimated_completion ? new Date(w.estimated_completion) : undefined,
                category: "WORK_ORDER",
                assignee: w.mechanic_name ?? undefined,
                source_id: String(w.id),
                source_type: "work_order",
              });
            }
          }
        }

        // Normalize culture events
        if (cultureEvents.status === "fulfilled" && Array.isArray(cultureEvents.value)) {
          for (const c of cultureEvents.value) {
            if (c.event_date ?? c.date) {
              merged.push({
                id: `culture-${c.id}`,
                title: c.title ?? c.name ?? "Kultur & Event",
                start: new Date(c.event_date ?? c.date),
                end: c.end_date ? new Date(c.end_date) : undefined,
                category: "CULTURE",
                source_id: String(c.id),
                source_type: "culture",
              });
            }
          }
        }

        // Normalize audits
        if (audits.status === "fulfilled" && Array.isArray(audits.value)) {
          for (const a of audits.value) {
            if (a.audit_date ?? a.scheduled_date ?? a.date) {
              merged.push({
                id: `audit-${a.id}`,
                title: a.title ?? a.standard ?? "Revision",
                start: new Date(a.audit_date ?? a.scheduled_date ?? a.date),
                end: a.end_date ? new Date(a.end_date) : undefined,
                category: "INSPECTION",
                assignee: a.auditor ?? undefined,
                source_id: String(a.id),
                source_type: "audit",
                description: a.scope,
              });
            }
          }
        }

        // Use merged if we got something, otherwise fall back to demo
        setEvents(merged.length > 0 ? merged : makeDemoEvents());
      } catch {
        setEvents(makeDemoEvents());
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filteredEvents = filterEvents(events, filter);

  // Navigation
  function navigate(dir: 1 | -1) {
    const d = new Date(currentDate);
    if (viewMode === "day") d.setDate(d.getDate() + dir);
    else if (viewMode === "week") d.setDate(d.getDate() + dir * 7);
    else if (viewMode === "month") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 14);
    setCurrentDate(d);
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  const weekStart = startOfWeek(currentDate);

  // Title
  function getTitle(): string {
    if (viewMode === "day") {
      const days = ["Söndag","Måndag","Tisdag","Onsdag","Torsdag","Fredag","Lördag"];
      const months = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];
      return `${days[currentDate.getDay()]} ${currentDate.getDate()} ${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate);
      const we = addDays(ws, 6);
      if (ws.getMonth() === we.getMonth()) {
        return `${ws.getDate()}–${we.getDate()} ${formatMonthYear(ws)}`;
      }
      return `${ws.getDate()} ${ws.toLocaleString("sv-SE",{month:"short"})} – ${we.getDate()} ${we.toLocaleString("sv-SE",{month:"short"})} ${we.getFullYear()}`;
    }
    return formatMonthYear(currentDate);
  }

  const VIEW_MODES: { id: ViewMode; label: string }[] = [
    { id: "day",    label: "Dag" },
    { id: "week",   label: "Vecka" },
    { id: "month",  label: "Månad" },
    { id: "agenda", label: "Agenda" },
  ];

  const FILTERS: { id: FilterMode; label: string }[] = [
    { id: "all",        label: "Alla" },
    { id: "work",       label: "Arbete" },
    { id: "team",       label: "Team" },
    { id: "training",   label: "Utbildning" },
    { id: "inspection", label: "Revision" },
  ];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 52px)",
      overflow: "hidden",
      background: C.bg,
      margin: "-24px -24px 0",
      padding: 0,
    }}>
      {/* ── Topbar ── */}
      <div style={{
        background: C.surface,
        borderBottom: `0.5px solid ${C.border}`,
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
        flexWrap: "wrap",
      }}>
        {/* Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: C.fill, border: "none",
              cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "inherit", color: C.text,
            }}
          >
            ‹
          </button>
          <button
            onClick={goToday}
            style={{
              height: 32, padding: "0 12px",
              background: C.fill, border: "none",
              borderRadius: 8, fontSize: 12,
              fontWeight: 500, cursor: "pointer",
              color: C.text, fontFamily: "inherit",
            }}
          >
            Idag
          </button>
          <button
            onClick={() => navigate(1)}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: C.fill, border: "none",
              cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "inherit", color: C.text,
            }}
          >
            ›
          </button>
        </div>

        {/* Title */}
        <div style={{
          fontSize: 15, fontWeight: 600, color: C.text,
          letterSpacing: "-0.02em", minWidth: 180,
        }}>
          {getTitle()}
        </div>

        {/* View switcher */}
        <div style={{
          display: "flex",
          background: C.fill,
          borderRadius: 8,
          padding: 2,
          marginLeft: "auto",
        }}>
          {VIEW_MODES.map(vm => (
            <button
              key={vm.id}
              onClick={() => setViewMode(vm.id)}
              style={{
                height: 28, padding: "0 12px",
                borderRadius: 6, border: "none",
                fontSize: 12, fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit",
                background: viewMode === vm.id ? C.surface : "transparent",
                color: viewMode === vm.id ? C.text : C.secondary,
                boxShadow: viewMode === vm.id ? shadow : "none",
                transition: "all 0.1s",
              }}
            >
              {vm.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter pills ── */}
      <div style={{
        background: C.surface,
        borderBottom: `0.5px solid ${C.border}`,
        padding: "8px 20px",
        display: "flex",
        gap: 6,
        alignItems: "center",
        flexShrink: 0,
        flexWrap: "wrap",
      }}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              height: 28, padding: "0 12px",
              borderRadius: 14, border: "none",
              fontSize: 12, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
              background: filter === f.id ? C.blue : C.fill,
              color: filter === f.id ? "#fff" : C.secondary,
              transition: "all 0.15s",
            }}
          >
            {f.label}
          </button>
        ))}

        {/* Category legend */}
        <div style={{
          marginLeft: "auto",
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 8, height: 8, borderRadius: 2,
                background: cat.color, flexShrink: 0,
              }} />
              <span style={{ fontSize: 10, color: C.secondary }}>{cat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      {loading ? (
        <div style={{
          flex: 1, display: "flex",
          alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 12,
        }}>
          <div style={{ fontSize: 32, opacity: 0.15 }}>📅</div>
          <div style={{ fontSize: 13, color: C.secondary }}>Laddar kalender…</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Calendar area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: C.surface }}>
            {viewMode === "week" && (
              <WeekView
                weekStart={weekStart}
                events={filteredEvents}
                onEventClick={setSelectedEvent}
                onDayClick={(d) => setSelectedDay(prev => prev && isSameDay(prev, d) ? null : d)}
                selectedDay={selectedDay}
              />
            )}
            {viewMode === "day" && (
              <DayView
                date={currentDate}
                events={filteredEvents}
                onEventClick={setSelectedEvent}
              />
            )}
            {viewMode === "month" && (
              <MonthView
                year={currentDate.getFullYear()}
                month={currentDate.getMonth()}
                events={filteredEvents}
                onEventClick={setSelectedEvent}
                onDayClick={(d) => {
                  setSelectedDay(prev => prev && isSameDay(prev, d) ? null : d);
                  setCurrentDate(d);
                }}
              />
            )}
            {viewMode === "agenda" && (
              <AgendaView
                events={filteredEvents}
                onEventClick={setSelectedEvent}
              />
            )}
          </div>

          {/* Day sidebar */}
          {selectedDay && (
            <DaySidebar
              date={selectedDay}
              events={filteredEvents.filter(e => isSameDay(e.start, selectedDay))}
              onClose={() => setSelectedDay(null)}
              onEventClick={setSelectedEvent}
            />
          )}
        </div>
      )}

      {/* ── Event detail modal ── */}
      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}
