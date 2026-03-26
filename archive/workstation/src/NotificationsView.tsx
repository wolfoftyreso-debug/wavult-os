import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = 'https://znmxtnxxjpmgtycmsqjv.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubXh0bnh4anBtZ3R5Y21zcWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4ODA2NjUsImV4cCI6MjA4OTQ1NjY2NX0.3LzBF2cE95X0vtW-5LwfJu8iGebnE9AUXglHchMPH60';

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
  navigateTo?: string;  // view id to navigate to
  entityId?: string;    // specific entity id
}

const DEMO_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'deal', title: 'Deal vunnen', body: 'Novacode AB — €12 000 · Erik S.', time: '5 min sedan', read: false, navigateTo: 'deals', entityId: 'deal-novacode-001' },
  { id: '2', type: 'checkin', title: 'Kund incheckat', body: 'Volvo XC60 (ABC 123) — kl 08:47', time: '12 min sedan', read: false, navigateTo: 'work-orders', entityId: 'wo-abc123' },
  { id: '3', type: 'task', title: 'Task försenad', body: 'Offert till Nordic Shop förfaller idag', time: '1h sedan', read: false, navigateTo: 'tasks', entityId: 'task-nordic-shop' },
  { id: '4', type: 'approval', title: 'Tilläggsarbete godkänt', body: 'BMW 320 — byte bromsskiva · €2 400', time: '2h sedan', read: true, navigateTo: 'approval', entityId: 'approval-bmw320' },
  { id: '5', type: 'nc', title: 'Ny avvikelse', body: 'NC-001: Bromsar dokumenterade felaktigt', time: '3h sedan', read: true, navigateTo: 'quality', entityId: 'nc-001' },
  { id: '6', type: 'culture', title: 'Anders Björk fyller år imorgon 🎂', body: 'Tårta beställd automatiskt', time: 'Idag', read: true, navigateTo: 'culture' },
  { id: '7', type: 'system', title: 'Systemuppdatering', body: 'Pixdrift v1.3 — nya funktioner tillgängliga', time: 'Igår', read: true, navigateTo: 'devops' },
];

const TYPE_ICONS: Record<string, string> = {
  deal: '🟢', checkin: '🔑', task: '⚠️', approval: '✅',
  nc: '📄', culture: '🎂', system: '⚙️',
};

const TYPE_COLORS: Record<string, string> = {
  deal: C.green, checkin: C.blue, task: C.orange, approval: C.green,
  nc: C.red, culture: '#AF52DE', system: C.secondary,
};

function mapTypeToView(type: string): string | undefined {
  const map: Record<string, string> = {
    deal: 'deals',
    task: 'tasks',
    nc: 'quality',
    checkin: 'work-orders',
    approval: 'approval',
    culture: 'culture',
    system: 'devops',
  };
  return map[type];
}

interface NotificationsViewProps {
  onNavigate?: (view: string, entityId?: string) => void;
}

export default function NotificationsView({ onNavigate }: NotificationsViewProps) {
  const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isLive, setIsLive] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  // Supabase Realtime subscription
  useEffect(() => {
    const token = localStorage.getItem('pixdrift_token');
    if (!token) return;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const channel = supabase
      .channel('notifications-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const n = payload.new as Record<string, unknown>;
          const newNotif: Notification = {
            id: String(n.id),
            type: (n.type as Notification['type']) || 'system',
            title: String(n.title ?? ''),
            body: String(n.body ?? n.message ?? ''),
            time: 'Just nu',
            read: false,
            navigateTo: mapTypeToView(String(n.type ?? '')),
            entityId: n.entity_id ? String(n.entity_id) : undefined,
          };
          setNotifications(prev => [newNotif, ...prev]);
          setNewIds(prev => new Set(prev).add(newNotif.id));
          // Remove highlight after 3s
          setTimeout(() => {
            setNewIds(prev => {
              const next = new Set(prev);
              next.delete(newNotif.id);
              return next;
            });
          }, 3000);
        }
      )
      .subscribe();

    setIsLive(true);

    return () => {
      supabase.removeChannel(channel);
      setIsLive(false);
    };
  }, []);

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

      {/* Pulse keyframe */}
      <style>{`
        @keyframes notif-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }
        @keyframes notif-slide-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '20px 24px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: `0.5px solid ${C.separator}`,
        background: C.surface,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: '-0.03em' }}>
              Notiser
            </div>
            {isLive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.green }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', background: C.green,
                  animation: 'notif-pulse 2s infinite',
                }} />
                Live
              </div>
            )}
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
              onClick={() => {
                markRead(notif.id);
                if (notif.navigateTo && onNavigate) {
                  onNavigate(notif.navigateTo, notif.entityId);
                }
              }}
              style={{
                display: 'flex', gap: 14, padding: '14px 20px',
                borderBottom: i < filtered.length - 1 ? `0.5px solid ${C.fill}` : 'none',
                background: newIds.has(notif.id) ? '#E8F8EE' : notif.read ? C.surface : '#F0F6FF',
                cursor: notif.navigateTo ? 'pointer' : 'default',
                transition: 'background 0.3s',
                animation: newIds.has(notif.id) ? 'notif-slide-in 0.3s ease' : undefined,
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = C.fill}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background =
                newIds.has(notif.id) ? '#E8F8EE' : notif.read ? C.surface : '#F0F6FF'}
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

              {/* Navigation arrow */}
              {notif.navigateTo && (
                <div style={{ color: C.tertiary, fontSize: 16, flexShrink: 0, alignSelf: 'center' }}>›</div>
              )}

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
