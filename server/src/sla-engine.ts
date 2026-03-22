/**
 * SLA Escalation Engine — pixdrift
 * ServiceNow's killer feature, simplified for workshops.
 *
 * Escalation tiers:
 *   T-60: Yellow alert  → Ops Lead notified
 *   T-30: Orange alert  → Ops Lead + mechanic
 *   T-0:  Red alert     → Ops Lead + manager + customer SMS
 *
 * Runs every 5 minutes via startSLAChecker().
 * Also triggered on-demand via POST /api/sla/check.
 */

import { Router, Request, Response } from 'express';
import { supabase } from './supabase';
import { sendGenericSMS } from './sms-service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SLAPromise {
  id: string;
  org_id: string;
  work_order_id: string;
  vehicle_reg?: string;
  customer_name?: string;
  customer_phone?: string;
  technician_id?: string;
  technician_name?: string;
  promised_at: string;
  estimated_duration_mins?: number;
  actual_start?: string;
  t60_alert_sent: boolean;
  t60_sent_at?: string;
  t30_alert_sent: boolean;
  t30_sent_at?: string;
  t0_alert_sent: boolean;
  t0_sent_at?: string;
  status: 'ACTIVE' | 'MET' | 'BREACHED' | 'CANCELLED';
  actual_completion?: string;
  delay_minutes?: number;
  pix_events: any[];
  created_at: string;
  // Computed
  minutes_remaining?: number;
  alert_tier?: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
}

// ─── Core escalation logic ────────────────────────────────────────────────────

export async function checkSLABreaches(orgId?: string): Promise<{
  checked: number;
  t60_fired: number;
  t30_fired: number;
  t0_fired: number;
  errors: string[];
}> {
  const result = { checked: 0, t60_fired: 0, t30_fired: 0, t0_fired: 0, errors: [] as string[] };

  try {
    let query = supabase
      .from('sla_promises')
      .select('*')
      .eq('status', 'ACTIVE');

    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data: promises, error } = await query;
    if (error) throw error;
    if (!promises || promises.length === 0) return result;

    result.checked = promises.length;
    const now = new Date();

    for (const promise of promises as SLAPromise[]) {
      try {
        const promisedAt = new Date(promise.promised_at);
        const minutesRemaining = (promisedAt.getTime() - now.getTime()) / 60000;

        const updates: Record<string, any> = {};
        const pixEvents: any[] = [...(promise.pix_events || [])];

        // ── T-60 Yellow alert ──
        if (minutesRemaining <= 60 && !promise.t60_alert_sent) {
          await sendSLANotification({
            orgId: promise.org_id,
            slaId: promise.id,
            tier: 'T60',
            vehicleReg: promise.vehicle_reg,
            customerName: promise.customer_name,
            technicianName: promise.technician_name,
            promisedAt: promise.promised_at,
            minutesRemaining,
          });

          updates.t60_alert_sent = true;
          updates.t60_sent_at = now.toISOString();
          pixEvents.push({ event: 'T60_ALERT', at: now.toISOString(), minutes_remaining: Math.round(minutesRemaining) });
          result.t60_fired++;
        }

        // ── T-30 Orange alert ──
        if (minutesRemaining <= 30 && !promise.t30_alert_sent) {
          await sendSLANotification({
            orgId: promise.org_id,
            slaId: promise.id,
            tier: 'T30',
            vehicleReg: promise.vehicle_reg,
            customerName: promise.customer_name,
            technicianName: promise.technician_name,
            promisedAt: promise.promised_at,
            minutesRemaining,
          });

          updates.t30_alert_sent = true;
          updates.t30_sent_at = now.toISOString();
          pixEvents.push({ event: 'T30_ALERT', at: now.toISOString(), minutes_remaining: Math.round(minutesRemaining) });
          result.t30_fired++;
        }

        // ── T-0 Red alert + customer SMS ──
        if (minutesRemaining <= 0 && !promise.t0_alert_sent) {
          await sendSLANotification({
            orgId: promise.org_id,
            slaId: promise.id,
            tier: 'T0',
            vehicleReg: promise.vehicle_reg,
            customerName: promise.customer_name,
            customerPhone: promise.customer_phone,
            technicianName: promise.technician_name,
            promisedAt: promise.promised_at,
            minutesRemaining,
          });

          // Customer SMS at breach
          if (promise.customer_phone) {
            const delayMin = Math.abs(Math.round(minutesRemaining));
            const msg = `Hej ${promise.customer_name || 'kund'}! Vi beklagar — din bil (${promise.vehicle_reg || 'reg saknas'}) är något försenad. Vår mekaniker ${promise.technician_name || 'tekniker'} arbetar på den. Vi kontaktar dig så snart den är klar. Tack för ditt tålamod! / Pixdrift`;
            await sendGenericSMS(promise.customer_phone, msg, 'Pixdrift');
          }

          updates.t0_alert_sent = true;
          updates.t0_sent_at = now.toISOString();
          updates.status = 'BREACHED';
          updates.delay_minutes = Math.abs(Math.round(minutesRemaining));
          pixEvents.push({ event: 'T0_BREACH', at: now.toISOString(), delay_minutes: Math.abs(Math.round(minutesRemaining)) });
          result.t0_fired++;
        }

        if (Object.keys(updates).length > 0) {
          updates.pix_events = pixEvents;
          await supabase.from('sla_promises').update(updates).eq('id', promise.id);
        }
      } catch (err: any) {
        result.errors.push(`${promise.id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    result.errors.push(`Query error: ${err.message}`);
  }

  return result;
}

// ─── Notification helper ──────────────────────────────────────────────────────

interface SLANotificationPayload {
  orgId: string;
  slaId: string;
  tier: 'T60' | 'T30' | 'T0';
  vehicleReg?: string;
  customerName?: string;
  customerPhone?: string;
  technicianName?: string;
  promisedAt: string;
  minutesRemaining: number;
}

async function sendSLANotification(payload: SLANotificationPayload): Promise<void> {
  const { orgId, slaId, tier, vehicleReg, customerName, technicianName, promisedAt, minutesRemaining } = payload;

  const promisedTime = new Date(promisedAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  const minRemainingAbs = Math.abs(Math.round(minutesRemaining));
  const isBreached = minutesRemaining <= 0;

  const tierConfig = {
    T60: {
      icon: '⏰',
      color: 'YELLOW',
      label: 'SLA RISK',
      message: `${minRemainingAbs} min kvar — prioritera nu`,
      roles: ['ops_lead'] as string[],
      severity: 'warning',
    },
    T30: {
      icon: '🟡',
      color: 'ORANGE',
      label: 'SLA VARNING',
      message: `${minRemainingAbs} min kvar — kritiskt läge`,
      roles: ['ops_lead', 'mechanic'] as string[],
      severity: 'warning',
    },
    T0: {
      icon: '🔴',
      color: 'RED',
      label: 'SLA BRUTET',
      message: isBreached ? `${minRemainingAbs} min sen — kund notifierad` : 'Deadline nu — eskalera omedelbart',
      roles: ['ops_lead', 'manager'] as string[],
      severity: 'critical',
    },
  }[tier];

  const title = `${tierConfig.icon} ${tierConfig.label} — ${vehicleReg || 'Okänt fordon'}`;
  const body = [
    `${technicianName || 'Tekniker'} · Utlovad kl ${promisedTime}`,
    tierConfig.message,
    customerName ? `Kund: ${customerName}` : null,
  ].filter(Boolean).join('\n');

  // Insert notification for each target role
  for (const role of tierConfig.roles) {
    try {
      await supabase.from('notifications').insert({
        org_id: orgId,
        type: 'SLA_ALERT',
        target_role: role,
        title,
        body,
        severity: tierConfig.severity,
        metadata: {
          sla_id: slaId,
          tier,
          vehicle_reg: vehicleReg,
          technician_name: technicianName,
          customer_name: customerName,
          promised_at: promisedAt,
          minutes_remaining: Math.round(minutesRemaining),
          color: tierConfig.color,
        },
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (err: any) {
      // Notifications table may not exist yet — log and continue
      console.error(`[SLA] Failed to insert notification for role ${role}:`, err.message);
    }
  }

  console.log(`[SLA ${tier}] ${title} | ${body.replace(/\n/g, ' | ')}`);
}

// ─── Background scheduler ─────────────────────────────────────────────────────

let _slaInterval: ReturnType<typeof setInterval> | null = null;

export function startSLAChecker(intervalMs = 5 * 60 * 1000): void {
  if (_slaInterval) return; // already running

  console.log('[SLA] Starting SLA Escalation Engine — checks every 5 minutes');

  // Run immediately on start
  checkSLABreaches().then(r => {
    console.log(`[SLA] Initial check: ${r.checked} active, T60:${r.t60_fired} T30:${r.t30_fired} T0:${r.t0_fired}`);
  });

  _slaInterval = setInterval(async () => {
    try {
      const r = await checkSLABreaches();
      if (r.t60_fired + r.t30_fired + r.t0_fired > 0 || r.errors.length > 0) {
        console.log(`[SLA] Check: ${r.checked} active, T60:${r.t60_fired} T30:${r.t30_fired} T0:${r.t0_fired}`, r.errors.length ? `Errors: ${r.errors.join(', ')}` : '');
      }
    } catch (err: any) {
      console.error('[SLA] Checker error:', err.message);
    }
  }, intervalMs);
}

export function stopSLAChecker(): void {
  if (_slaInterval) {
    clearInterval(_slaInterval);
    _slaInterval = null;
    console.log('[SLA] Stopped SLA Escalation Engine');
  }
}

// ─── Helper: compute alert tier ───────────────────────────────────────────────

function computeAlertTier(minutesRemaining: number): 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' {
  if (minutesRemaining > 60) return 'GREEN';
  if (minutesRemaining > 30) return 'YELLOW';
  if (minutesRemaining > 0) return 'ORANGE';
  return 'RED';
}

// ─── Router ───────────────────────────────────────────────────────────────────

const router = Router();

// POST /api/sla/promise — create a new SLA promise
router.post('/api/sla/promise', async (req: Request, res: Response) => {
  const {
    org_id, work_order_id, vehicle_reg, customer_name, customer_phone,
    technician_id, technician_name, promised_at, estimated_duration_mins,
  } = req.body;

  if (!org_id || !work_order_id || !promised_at) {
    return res.status(400).json({ error: 'org_id, work_order_id, promised_at are required' });
  }

  const { data, error } = await supabase.from('sla_promises').insert({
    org_id, work_order_id, vehicle_reg, customer_name, customer_phone,
    technician_id, technician_name, promised_at, estimated_duration_mins,
    status: 'ACTIVE',
    pix_events: [{ event: 'CREATED', at: new Date().toISOString() }],
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// GET /api/sla/active — all active promises with time remaining
router.get('/api/sla/active', async (req: Request, res: Response) => {
  const { org_id } = req.query;

  let query = supabase
    .from('sla_promises')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('promised_at', { ascending: true });

  if (org_id) query = query.eq('org_id', org_id as string);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const now = new Date();
  const enriched = (data || []).map(p => {
    const minutesRemaining = (new Date(p.promised_at).getTime() - now.getTime()) / 60000;
    return {
      ...p,
      minutes_remaining: Math.round(minutesRemaining),
      alert_tier: computeAlertTier(minutesRemaining),
    };
  });

  res.json(enriched);
});

// GET /api/sla/at-risk — promises with < 60 min remaining
router.get('/api/sla/at-risk', async (req: Request, res: Response) => {
  const { org_id } = req.query;
  const cutoff = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('sla_promises')
    .select('*')
    .eq('status', 'ACTIVE')
    .lte('promised_at', cutoff)
    .order('promised_at', { ascending: true });

  if (org_id) query = query.eq('org_id', org_id as string);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const now = new Date();
  const enriched = (data || []).map(p => {
    const minutesRemaining = (new Date(p.promised_at).getTime() - now.getTime()) / 60000;
    return {
      ...p,
      minutes_remaining: Math.round(minutesRemaining),
      alert_tier: computeAlertTier(minutesRemaining),
    };
  });

  res.json(enriched);
});

// POST /api/sla/check — manually trigger SLA check (for testing)
router.post('/api/sla/check', async (req: Request, res: Response) => {
  const { org_id } = req.body;
  const result = await checkSLABreaches(org_id);
  res.json({ ok: true, ...result });
});

// POST /api/sla/:id/met — mark SLA as completed on time
router.post('/api/sla/:id/met', async (req: Request, res: Response) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  const { data: existing } = await supabase.from('sla_promises').select('promised_at, pix_events').eq('id', id).single();
  if (!existing) return res.status(404).json({ error: 'SLA promise not found' });

  const promisedAt = new Date(existing.promised_at);
  const completedAt = new Date();
  const delayMin = Math.round((completedAt.getTime() - promisedAt.getTime()) / 60000);
  const metOnTime = delayMin <= 0;

  const pixEvents = [...(existing.pix_events || []), {
    event: metOnTime ? 'COMPLETED_ON_TIME' : 'COMPLETED_LATE',
    at: now,
    delay_minutes: Math.max(0, delayMin),
  }];

  const { data, error } = await supabase.from('sla_promises').update({
    status: metOnTime ? 'MET' : 'BREACHED',
    actual_completion: now,
    delay_minutes: Math.max(0, delayMin),
    pix_events: pixEvents,
  }).eq('id', id).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/sla/stats — breach rate, avg delay, by technician
router.get('/api/sla/stats', async (req: Request, res: Response) => {
  const { org_id } = req.query;

  let query = supabase
    .from('sla_promises')
    .select('status, delay_minutes, technician_name, promised_at, actual_completion');

  if (org_id) query = query.eq('org_id', org_id as string);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const all = data || [];
  const total = all.length;
  const met = all.filter(p => p.status === 'MET').length;
  const breached = all.filter(p => p.status === 'BREACHED').length;
  const active = all.filter(p => p.status === 'ACTIVE').length;

  const delays = all.filter(p => p.delay_minutes != null && p.delay_minutes > 0).map(p => p.delay_minutes as number);
  const avgDelay = delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0;

  // By technician
  const byTech: Record<string, { name: string; total: number; met: number; breached: number; avg_delay: number }> = {};
  for (const p of all) {
    const name = p.technician_name || 'Okänd';
    if (!byTech[name]) byTech[name] = { name, total: 0, met: 0, breached: 0, avg_delay: 0 };
    byTech[name].total++;
    if (p.status === 'MET') byTech[name].met++;
    if (p.status === 'BREACHED') byTech[name].breached++;
  }
  for (const tech of Object.values(byTech)) {
    const techDelays = all.filter(p => p.technician_name === tech.name && p.delay_minutes != null && p.delay_minutes > 0).map(p => p.delay_minutes as number);
    tech.avg_delay = techDelays.length > 0 ? Math.round(techDelays.reduce((a, b) => a + b, 0) / techDelays.length) : 0;
  }

  res.json({
    total, met, breached, active,
    sla_rate_pct: total > 0 ? Math.round((met / (met + breached || 1)) * 100) : 100,
    avg_delay_minutes: avgDelay,
    by_technician: Object.values(byTech).sort((a, b) => b.total - a.total),
  });
});

// POST /api/sla/seed-demo — seed 3 SLA promises for testing
router.post('/api/sla/seed-demo', async (req: Request, res: Response) => {
  const { org_id } = req.body;
  if (!org_id) return res.status(400).json({ error: 'org_id required' });

  const now = new Date();
  const promises = [
    {
      org_id,
      work_order_id: '00000000-0000-0000-0000-000000000001',
      vehicle_reg: 'ABC 123',
      customer_name: 'Lars Nilsson',
      customer_phone: '070-123 45 67',
      technician_name: 'Robin Björk',
      // T-45: in yellow zone
      promised_at: new Date(now.getTime() + 45 * 60 * 1000).toISOString(),
      estimated_duration_mins: 120,
      status: 'ACTIVE',
      pix_events: [{ event: 'CREATED', at: now.toISOString() }],
    },
    {
      org_id,
      work_order_id: '00000000-0000-0000-0000-000000000002',
      vehicle_reg: 'DEF 456',
      customer_name: 'Anna Karlsson',
      customer_phone: '070-234 56 78',
      technician_name: 'Eric Karlsson',
      // T-25: in orange zone
      promised_at: new Date(now.getTime() + 25 * 60 * 1000).toISOString(),
      estimated_duration_mins: 90,
      status: 'ACTIVE',
      pix_events: [{ event: 'CREATED', at: now.toISOString() }],
    },
    {
      org_id,
      work_order_id: '00000000-0000-0000-0000-000000000003',
      vehicle_reg: 'GHI 789',
      customer_name: 'Peter Svensson',
      customer_phone: '070-345 67 89',
      technician_name: 'Jonas Lindström',
      // Already breached: -15 min
      promised_at: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      estimated_duration_mins: 60,
      status: 'ACTIVE',
      pix_events: [{ event: 'CREATED', at: now.toISOString() }],
    },
  ];

  const { data, error } = await supabase.from('sla_promises').insert(promises).select();
  if (error) return res.status(500).json({ error: error.message });

  // Trigger immediate check after seeding
  await checkSLABreaches(org_id);

  res.status(201).json({ ok: true, seeded: data?.length, data });
});

export default router;
