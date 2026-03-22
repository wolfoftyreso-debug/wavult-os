import { useState, useEffect } from "react";

const C = {
  bg: "#F2F2F7", surface: "#FFFFFF", border: "#D1D1D6",
  text: "#000000", secondary: "#8E8E93", tertiary: "#C7C7CC",
  blue: "#007AFF", green: "#34C759", orange: "#FF9500",
  red: "#FF3B30", fill: "#F2F2F7", separator: "rgba(60,60,67,0.29)",
};

interface Notification {
  id: string;
  type: 'deal' | 'task' | 'nc' | 'checkin' | 'approval' | 'culture' | 'system';
  title: string;
  body: string;
  time: string;
  read: boolean;
  link?: string;
}

const DEMO_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'deal', title: 'Deal vunnen', body: 'Novacode AB — €12 000 · Erik S.', time: '5 min sedan', read: false },
  { id: '2', type: 'checkin', title: 'Kund incheckat', body: 'Volvo XC60 (ABC 123) — kl 08:47', time: '12 min sedan', read: false },
  { id: '3', type: 'task', title: 'Task försenad', body: 'Offert till Nordic Shop förfaller idag', time: '1h sedan', read: false },
  { id: '4', type: 'approval', title: 'Tilläggsarbete godkänt', body: 'BMW 320 — byte bromsskiva · €2 400', time: '2h sedan', read: true },
  { id: '5', type: 'nc', title: 'Ny avvikelse', body: 'NC-001: Bromsar dokumenterade felaktigt', time: '3h sedan', read: true },
  { id: '6', type: 'culture', title: 'Anders Björk fyller år imorgon 🎂', body: 'Tårta beställd automatiskt', time: 'Idag', read: true },
  { id: '7', type: 'system', title: 'Systemuppdatering', body: 'Pixdrift v1.3 — nya funktioner tillgängliga', time: 'Igår', read: true },
];

const TYPE_ICONS: Record<string, string> = {
  deal: '🟢', checkin: '🔑', task: '⚠️', approval: '✅',
  nc: '📄', culture: '🎂', system: '⚙️',
};

const TYPE_COLORS: Record<string, string> = {
  deal: C.green, checkin: C.blue, task: C.orange, approval: C.green,
  nc: C.red, culture: '#AF52DE', system: C.secondary,
};

export default function NotificationsView() {
  const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  return (
    <div style={{ padding: '0 0 40px 0', maxWidth: 640, margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{
        padding: '20px 24px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: `0.5px solid ${C.separator}`,
        background: C.surface,
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: '-0.03em' }}>
            Notiser
          </div>
          {unreadCount > 0 && (
            <div style={{ fontSize: 13, color: C.secondary, marginTop: 2 }}>
              {unreadCount} olästa
            </div>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{
            border: 'none', background: 'none', color: C.blue,
            fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Markera alla som lästa
          </button>
        )}
      </div>

      {/* Filter */}
      <div style={{ padding: '12px 16px', background: C.surface, borderBottom: `0.5px solid ${C.separator}` }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['all', 'unread'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 16px', borderRadius: 980, border: 'none',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              background: filter === f ? C.blue : C.fill,
              color: filter === f ? '#fff' : C.secondary,
            }}>
              {f === 'all' ? 'Alla' : `Olästa (${unreadCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications list */}
      <div style={{ background: C.surface }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.secondary }}>
              Inga olästa notiser
            </div>
            <div style={{ fontSize: 13, color: C.tertiary, marginTop: 4 }}>
              Du är uppdaterad
            </div>
          </div>
        ) : (
          filtered.map((notif, i) => (
            <div
              key={notif.id}
              onClick={() => markRead(notif.id)}
              style={{
                display: 'flex', gap: 14, padding: '14px 20px',
                borderBottom: i < filtered.length-1 ? `0.5px solid ${C.fill}` : 'none',
                background: notif.read ? C.surface : '#F0F6FF',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = C.fill}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = notif.read ? C.surface : '#F0F6FF'}
            >
              {/* Icon */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: TYPE_COLORS[notif.type] + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                {TYPE_ICONS[notif.type]}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: notif.read ? 400 : 600, color: C.text }}>
                    {notif.title}
                  </div>
                  <div style={{ fontSize: 11, color: C.tertiary, flexShrink: 0 }}>{notif.time}</div>
                </div>
                <div style={{ fontSize: 13, color: C.secondary, marginTop: 2 }}>{notif.body}</div>
              </div>

              {/* Unread dot */}
              {!notif.read && (
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: C.blue, flexShrink: 0, marginTop: 4,
                }} />
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
}
