/**
 * SLAWidget — Pixdrift SLA Escalation Engine
 * Real-time countdown display for Operations Lead view.
 *
 * Shows:
 *  - Per-job SLA status with color coding and time-remaining
 *  - SLA status bar in Ops Lead header
 *  - Auto-refreshes every 30 seconds
 */

import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SLAPromise {
  id: string;
  org_id: string;
  work_order_id: string;
  vehicle_reg?: string;
  customer_name?: string;
  technician_name?: string;
  promised_at: string;
  status: 'ACTIVE' | 'MET' | 'BREACHED' | 'CANCELLED';
  minutes_remaining: number;
  alert_tier: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  t60_alert_sent: boolean;
  t30_alert_sent: boolean;
  t0_alert_sent: boolean;
}

// ─── Color system ─────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  GREEN:  { bg: '#F0FFF4', border: '#34C759', text: '#1B7A34', icon: '✅', label: 'I tid' },
  YELLOW: { bg: '#FFFBEB', border: '#FF9500', text: '#B35E00', icon: '⚠️', label: 'Risk' },
  ORANGE: { bg: '#FFF3E0', border: '#FF6B00', text: '#A63D00', icon: '🟡', label: 'Kritisk' },
  RED:    { bg: '#FFF0F0', border: '#FF3B30', text: '#CC0000', icon: '🔴', label: 'Brutet' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeRemaining(minutesRemaining: number): string {
  if (minutesRemaining <= 0) {
    const overdue = Math.abs(minutesRemaining);
    if (overdue < 60) return `${overdue} min sen`;
    const h = Math.floor(overdue / 60);
    const m = overdue % 60;
    return m > 0 ? `${h}h ${m}min sen` : `${h}h sen`;
  }
  if (minutesRemaining < 60) return `${minutesRemaining} min kvar`;
  const h = Math.floor(minutesRemaining / 60);
  const m = minutesRemaining % 60;
  return m > 0 ? `${h}h ${m}min kvar` : `${h}h kvar`;
}

function formatPromisedTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}

function getAlertSentLabel(promise: SLAPromise): string {
  if (promise.t0_alert_sent) return 'Kund notifierad';
  if (promise.t30_alert_sent) return 'Alert skickat';
  if (promise.t60_alert_sent) return 'Alert skickat';
  return '';
}

// ─── SLA Row — one job entry ──────────────────────────────────────────────────

interface SLARowProps {
  promise: SLAPromise;
}

export function SLARow({ promise }: SLARowProps) {
  const tier = TIER_CONFIG[promise.alert_tier];
  const alertLabel = getAlertSentLabel(promise);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 10px',
      borderRadius: 8,
      background: tier.bg,
      border: `1px solid ${tier.border}`,
      marginBottom: 4,
    }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{tier.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>
            {promise.vehicle_reg || '—'}
          </span>
          {promise.technician_name && (
            <span style={{ fontSize: 12, color: '#555' }}>· {promise.technician_name}</span>
          )}
          <span style={{ fontSize: 12, color: '#777' }}>
            kl {formatPromisedTime(promise.promised_at)}
          </span>
        </div>
        {promise.customer_name && (
          <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{promise.customer_name}</div>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: tier.text }}>
          {formatTimeRemaining(promise.minutes_remaining)}
        </div>
        {alertLabel && (
          <div style={{ fontSize: 10, color: tier.text, opacity: 0.8 }}>{alertLabel}</div>
        )}
      </div>
    </div>
  );
}

// ─── SLA Status Bar — compact header widget ───────────────────────────────────

interface SLAStatusBarProps {
  promises: SLAPromise[];
  total?: number;
}

export function SLAStatusBar({ promises, total }: SLAStatusBarProps) {
  const onTime = promises.filter(p => p.alert_tier === 'GREEN').length;
  const atRisk = promises.filter(p => p.alert_tier === 'YELLOW' || p.alert_tier === 'ORANGE').length;
  const breached = promises.filter(p => p.alert_tier === 'RED' || p.status === 'BREACHED').length;
  const n = total ?? promises.length;

  // Dot display (max 8)
  const displayCount = Math.min(n, 8);
  const dots = Array.from({ length: displayCount }, (_, i) => {
    if (i < onTime) return '#34C759';
    if (i < onTime + atRisk) return '#FF9500';
    return '#FF3B30';
  });

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '7px 12px',
      background: '#F9F9FB',
      borderRadius: 10,
      border: '0.5px solid #D1D1D6',
      fontSize: 12,
    }}>
      <span style={{ fontWeight: 700, color: '#555', fontSize: 11, letterSpacing: 0.5 }}>
        ⏰ SLA STATUS
      </span>
      <div style={{ display: 'flex', gap: 3 }}>
        {dots.map((color, i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        ))}
        {n > 8 && (
          <span style={{ fontSize: 10, color: '#888', marginLeft: 2 }}>+{n - 8}</span>
        )}
      </div>
      <span style={{ color: '#34C759', fontWeight: 600 }}>{onTime}/{n} i tid</span>
      {atRisk > 0 && <span style={{ color: '#FF9500', fontWeight: 600 }}>⚠️ {atRisk} risk</span>}
      {breached > 0 && <span style={{ color: '#FF3B30', fontWeight: 600 }}>🔴 {breached} brutet</span>}
    </div>
  );
}

// ─── SLAPanel — full panel for Ops Lead overview ──────────────────────────────

interface SLAPanelProps {
  orgId: string;
  style?: React.CSSProperties;
}

export function SLAPanel({ orgId, style }: SLAPanelProps) {
  const [promises, setPromises] = useState<SLAPromise[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchActive = useCallback(async () => {
    try {
      const token = localStorage.getItem('pixdrift_token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/sla/active?org_id=${orgId}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SLAPromise[] = await res.json();
      setPromises(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.warn('[SLA] Failed to fetch active promises:', err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchActive();
    const interval = setInterval(fetchActive, 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchActive]);

  if (loading) {
    return (
      <div style={{ padding: 16, color: '#8E8E93', fontSize: 13, ...style }}>
        Laddar SLA-data...
      </div>
    );
  }

  if (promises.length === 0) {
    return (
      <div style={{
        padding: '14px 16px',
        background: '#F9FFFA',
        borderRadius: 12,
        border: '0.5px solid #34C759',
        color: '#34C759',
        fontSize: 13,
        fontWeight: 600,
        ...style,
      }}>
        ✅ Inga aktiva SLA-åtaganden just nu
      </div>
    );
  }

  const atRisk = promises.filter(p => ['YELLOW', 'ORANGE', 'RED'].includes(p.alert_tier));
  const onTime = promises.filter(p => p.alert_tier === 'GREEN');

  return (
    <div style={{ ...style }}>
      {/* Status bar */}
      <SLAStatusBar promises={promises} />

      {/* At-risk first */}
      {atRisk.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#FF9500', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' }}>
            ⚠️ Kräver åtgärd ({atRisk.length})
          </div>
          {atRisk.map(p => <SLARow key={p.id} promise={p} />)}
        </div>
      )}

      {/* On time */}
      {onTime.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#34C759', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' }}>
            ✅ I tid ({onTime.length})
          </div>
          {onTime.map(p => <SLARow key={p.id} promise={p} />)}
        </div>
      )}

      <div style={{ fontSize: 10, color: '#C7C7CC', marginTop: 8, textAlign: 'right' }}>
        Uppdaterad {lastRefresh.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        {' '}· Uppdateras var 30s
      </div>
    </div>
  );
}

// ─── useSLAForJob — hook to get SLA data for a single work order ──────────────

export function useSLAForJob(workOrderId: string, orgId: string): {
  promise: SLAPromise | null;
  tier: typeof TIER_CONFIG[keyof typeof TIER_CONFIG] | null;
  timeLabel: string;
} {
  const [promise, setPromise] = useState<SLAPromise | null>(null);

  useEffect(() => {
    if (!workOrderId || !orgId) return;

    const token = localStorage.getItem('pixdrift_token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${API_URL}/api/sla/active?org_id=${orgId}`, { headers })
      .then(r => r.json())
      .then((data: SLAPromise[]) => {
        const match = data.find(p => p.work_order_id === workOrderId);
        setPromise(match || null);
      })
      .catch(() => {});
  }, [workOrderId, orgId]);

  if (!promise) return { promise: null, tier: null, timeLabel: '' };

  return {
    promise,
    tier: TIER_CONFIG[promise.alert_tier],
    timeLabel: formatTimeRemaining(promise.minutes_remaining),
  };
}

// ─── SLANotificationCard — for use in NotificationsView ──────────────────────

interface SLANotification {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: string;
  metadata?: {
    sla_id?: string;
    tier?: string;
    vehicle_reg?: string;
    technician_name?: string;
    customer_name?: string;
    promised_at?: string;
    minutes_remaining?: number;
    color?: string;
  };
  read: boolean;
  created_at: string;
}

interface SLANotificationCardProps {
  notification: SLANotification;
  onViewJob?: (slaId: string) => void;
}

export function SLANotificationCard({ notification, onViewJob }: SLANotificationCardProps) {
  const meta = notification.metadata || {};
  const tierKey = (meta.color || 'YELLOW') as keyof typeof TIER_CONFIG;
  const tier = TIER_CONFIG[tierKey] || TIER_CONFIG.YELLOW;

  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 12,
      background: tier.bg,
      border: `1px solid ${tier.border}`,
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{tier.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#000' }}>{notification.title}</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 3, whiteSpace: 'pre-line' }}>
            {notification.body}
          </div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
            {new Date(notification.created_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        {meta.sla_id && onViewJob && (
          <button
            onClick={() => onViewJob(meta.sla_id!)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: tier.border,
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            Visa jobb
          </button>
        )}
      </div>
    </div>
  );
}

export default SLAPanel;
