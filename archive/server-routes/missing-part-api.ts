// ============================================================
// Missing Part Protocol API — Pixdrift
// "A missing part on a booked job is a company failure — not an inconvenience."
// Modeled after airline delay response: immediate notification + compensation
// ============================================================

import { Router, Request, Response } from 'express';
import { supabase } from './supabase';
import { sendGenericSMS as sendSMS } from './sms-service';

export const missingPartRouter = Router();

// ─── Compensation matrix ─────────────────────────────────────────────────────
export const COMPENSATION_MATRIX = {
  SAME_DAY:     { type: 'FREE_WASH',    description: 'Gratis invändig städning vid nästa besök', value: 0 },
  SHORT_DELAY:  { type: 'DISCOUNT_10',  description: '10% rabatt på arbetet', value: null },    // 1-3 days
  MEDIUM_DELAY: { type: 'DISCOUNT_20',  description: '20% rabatt på arbetet', value: null },    // 3-7 days
  LONG_DELAY:   { type: 'DISCOUNT_50',  description: '50% rabatt på arbetet eller ombokning kostnadsfritt', value: null }, // > 7 days
  URGENT:       { type: 'COURTESY_CAR', description: 'Lånefordon utan kostnad under väntetiden', value: 0 },
};

function suggestCompensation(delayDays: number): typeof COMPENSATION_MATRIX[keyof typeof COMPENSATION_MATRIX] & { key: string } {
  if (delayDays < 1)  return { ...COMPENSATION_MATRIX.SAME_DAY,     key: 'SAME_DAY' };
  if (delayDays <= 3) return { ...COMPENSATION_MATRIX.SHORT_DELAY,   key: 'SHORT_DELAY' };
  if (delayDays <= 7) return { ...COMPENSATION_MATRIX.MEDIUM_DELAY,  key: 'MEDIUM_DELAY' };
  return               { ...COMPENSATION_MATRIX.LONG_DELAY,   key: 'LONG_DELAY' };
}

function formatDate(dt: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(dt).toLocaleString('sv-SE', {
    timeZone: 'Europe/Stockholm',
    ...opts,
  });
}

function formatETA(eta: string | Date): string {
  const d = new Date(eta);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString())    return 'idag';
  if (d.toDateString() === tomorrow.toDateString()) return 'imorgon';
  return formatDate(d, { weekday: 'long', day: 'numeric', month: 'long' });
}

async function emitPixEvent(
  incidentId: string,
  eventType: string,
  severity: 'HIGH' | 'MEDIUM' | 'LOW',
  data: Record<string, unknown> = {}
) {
  try {
    const { data: incident } = await supabase
      .from('missing_part_incidents')
      .select('pix_events')
      .eq('id', incidentId)
      .single();

    const events = (incident?.pix_events || []) as unknown[];
    events.push({
      type: eventType,
      severity,
      timestamp: new Date().toISOString(),
      ...data,
    });

    await supabase
      .from('missing_part_incidents')
      .update({ pix_events: events })
      .eq('id', incidentId);
  } catch (err) {
    console.error('[PIX] Failed to emit event:', err);
  }
}

// ─── POST /api/missing-part/report ──────────────────────────────────────────
// Triggered when mechanic flags missing part or intake check fails
missingPartRouter.post('/report', async (req: Request, res: Response) => {
  const { work_order_id, part_description, part_number, part_supplier, detected_by } = req.body;
  const org_id = (req as any).orgId || req.body.org_id;

  if (!work_order_id || !part_description || !org_id) {
    return res.status(400).json({ error: 'work_order_id, part_description, and org_id required' });
  }

  try {
    // Fetch work order for vehicle + customer info
    const { data: wo } = await supabase
      .from('work_orders')
      .select('vehicle_reg, customer_name, customer_phone, customer_email, scheduled_at')
      .eq('id', work_order_id)
      .single();

    const { data: incident, error } = await supabase
      .from('missing_part_incidents')
      .insert({
        org_id,
        work_order_id,
        vehicle_reg:   wo?.vehicle_reg || 'Okänd',
        customer_name: wo?.customer_name,
        customer_phone: wo?.customer_phone,
        customer_email: wo?.customer_email,
        part_description,
        part_number,
        part_supplier,
        detected_by,
        status: 'DETECTED',
        ops_lead_notified_at: new Date().toISOString(),
        pix_events: [{
          type: 'part_missing',
          severity: 'HIGH',
          timestamp: new Date().toISOString(),
          work_order_id,
          part_description,
        }],
      })
      .select()
      .single();

    if (error) throw error;

    // Emit PIX
    console.log(`[PIX] part_missing HIGH — ${part_description} on WO ${work_order_id}`);

    return res.json({
      incident_id: incident.id,
      next_steps: [
        'Kontakta leverantör och sätt ETA',
        'Informera kund automatiskt via SMS',
        'Välj kompensation baserat på försening',
        'Boka om till ny tid',
      ],
    });
  } catch (err) {
    console.error('[MissingPart] report error:', err);
    return res.status(500).json({ error: 'Kunde inte skapa incident' });
  }
});

// ─── POST /api/missing-part/:id/set-eta ─────────────────────────────────────
missingPartRouter.post('/:id/set-eta', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { part_eta, part_ordered_at, supplier_confirmed } = req.body;

  if (!part_eta) return res.status(400).json({ error: 'part_eta required' });

  try {
    const { data: incident, error } = await supabase
      .from('missing_part_incidents')
      .update({
        part_eta,
        part_ordered_at: part_ordered_at || new Date().toISOString(),
        part_confirmed_eta: supplier_confirmed ? part_eta : null,
        status: 'ORDERED',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await emitPixEvent(id, 'part_eta_set', 'MEDIUM', { part_eta, supplier_confirmed });

    return res.json({ success: true, incident });
  } catch (err) {
    console.error('[MissingPart] set-eta error:', err);
    return res.status(500).json({ error: 'Kunde inte sätta ETA' });
  }
});

// ─── POST /api/missing-part/:id/notify-customer ──────────────────────────────
missingPartRouter.post('/:id/notify-customer', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { message_override, notification_method = 'SMS' } = req.body;

  try {
    const { data: incident } = await supabase
      .from('missing_part_incidents')
      .select('*, org_id')
      .eq('id', id)
      .single();

    if (!incident) return res.status(404).json({ error: 'Incident saknas' });

    // Fetch org name for SMS signature
    const { data: org } = await supabase
      .from('organizations')
      .select('name, phone')
      .eq('id', incident.org_id)
      .single();

    const workshopName = org?.name || 'Verkstaden';
    const workshopPhone = org?.phone || '08-123 456';

    // Suggest compensation based on delay
    const delayDays = incident.part_eta
      ? (new Date(incident.part_eta).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      : 1;
    const compensation = suggestCompensation(delayDays);

    const firstName = incident.customer_name?.split(' ')[0] || 'Kund';
    const eta = incident.part_eta ? formatETA(incident.part_eta) : 'inom kort';
    const bookedAt = incident.created_at
      ? formatDate(incident.created_at, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
      : 'bokad tid';

    const smsText = message_override || [
      `Hej ${firstName}! Vi behöver meddela att din ${incident.vehicle_reg} (bokad ${bookedAt}) tyvärr försenas.`,
      `En reservdel saknas. Vi förväntar leverans ${eta} och kontaktar dig för att boka ny tid.`,
      `Som ursäkt erbjuder vi ${compensation.description}.`,
      `Ring oss på ${workshopPhone} om du har frågor.`,
      `— ${workshopName}`,
    ].join('\n');

    let smsSent = false;
    if ((notification_method === 'SMS' || notification_method === 'ALL') && incident.customer_phone) {
      smsSent = await sendSMS(incident.customer_phone, smsText, workshopName);
    }

    const { data: updated } = await supabase
      .from('missing_part_incidents')
      .update({
        customer_notified_at: new Date().toISOString(),
        notification_method,
        status: 'CUSTOMER_NOTIFIED',
        compensation_type: compensation.type,
        compensation_description: compensation.description,
      })
      .eq('id', id)
      .select()
      .single();

    await emitPixEvent(id, 'customer_notified_of_delay', 'MEDIUM', {
      method: notification_method,
      sms_sent: smsSent,
      compensation: compensation.type,
    });

    return res.json({
      success: true,
      sms_sent: smsSent,
      sms_preview: smsText,
      compensation_suggested: compensation,
      incident: updated,
    });
  } catch (err) {
    console.error('[MissingPart] notify-customer error:', err);
    return res.status(500).json({ error: 'Kunde inte notifiera kund' });
  }
});

// ─── POST /api/missing-part/:id/reschedule ───────────────────────────────────
missingPartRouter.post('/:id/reschedule', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { new_appointment_at } = req.body;

  if (!new_appointment_at) return res.status(400).json({ error: 'new_appointment_at required' });

  try {
    const { data: incident } = await supabase
      .from('missing_part_incidents')
      .select('*, org_id')
      .eq('id', id)
      .single();

    if (!incident) return res.status(404).json({ error: 'Incident saknas' });

    // Update work order with new time
    await supabase
      .from('work_orders')
      .update({ scheduled_at: new_appointment_at })
      .eq('id', incident.work_order_id);

    // Send confirmation SMS
    const { data: org } = await supabase
      .from('organizations')
      .select('name, phone')
      .eq('id', incident.org_id)
      .single();

    const firstName = incident.customer_name?.split(' ')[0] || 'Kund';
    const newDate = formatDate(new_appointment_at, {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit',
    });
    const confirmSMS = `Hej ${firstName}! Din nya tid för ${incident.vehicle_reg} är bokad: ${newDate}. Vi ser fram emot ditt besök! — ${org?.name || 'Verkstaden'}`;

    if (incident.customer_phone) {
      await sendSMS(incident.customer_phone, confirmSMS, org?.name);
    }

    const { data: updated } = await supabase
      .from('missing_part_incidents')
      .update({ new_appointment_at, status: 'RESCHEDULED' })
      .eq('id', id)
      .select()
      .single();

    await emitPixEvent(id, 'job_rescheduled', 'LOW', { new_appointment_at });

    return res.json({ success: true, incident: updated });
  } catch (err) {
    console.error('[MissingPart] reschedule error:', err);
    return res.status(500).json({ error: 'Kunde inte boka om' });
  }
});

// ─── POST /api/missing-part/:id/apply-compensation ──────────────────────────
missingPartRouter.post('/:id/apply-compensation', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { compensation_type, compensation_value, compensation_description } = req.body;

  if (!compensation_type) return res.status(400).json({ error: 'compensation_type required' });

  try {
    const { data: updated, error } = await supabase
      .from('missing_part_incidents')
      .update({
        compensation_type,
        compensation_value,
        compensation_description,
        compensation_sent_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await emitPixEvent(id, 'compensation_applied', 'LOW', {
      type: compensation_type,
      value: compensation_value,
      description: compensation_description,
    });

    return res.json({ success: true, incident: updated });
  } catch (err) {
    console.error('[MissingPart] apply-compensation error:', err);
    return res.status(500).json({ error: 'Kunde inte registrera kompensation' });
  }
});

// ─── POST /api/missing-part/:id/part-arrived ────────────────────────────────
missingPartRouter.post('/:id/part-arrived', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data: updated, error } = await supabase
      .from('missing_part_incidents')
      .update({
        part_arrived_at: new Date().toISOString(),
        status: 'PART_ARRIVED',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await emitPixEvent(id, 'part_arrived', 'LOW', { arrived_at: new Date().toISOString() });

    console.log(`[MissingPart] Part arrived for incident ${id} — notifying Ops Lead + mechanic`);

    return res.json({ success: true, incident: updated });
  } catch (err) {
    console.error('[MissingPart] part-arrived error:', err);
    return res.status(500).json({ error: 'Kunde inte markera del som anländ' });
  }
});

// ─── GET /api/missing-part/active ───────────────────────────────────────────
missingPartRouter.get('/active', async (req: Request, res: Response) => {
  const org_id = (req as any).orgId;
  if (!org_id) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data, error } = await supabase
      .from('missing_part_incidents')
      .select('*')
      .eq('org_id', org_id)
      .not('status', 'eq', 'RESOLVED')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('[MissingPart] active error:', err);
    return res.status(500).json({ error: 'Kunde inte hämta incidenter' });
  }
});

// ─── GET /api/missing-part/work-order/:workOrderId ──────────────────────────
missingPartRouter.get('/work-order/:workOrderId', async (req: Request, res: Response) => {
  const { workOrderId } = req.params;

  try {
    const { data, error } = await supabase
      .from('missing_part_incidents')
      .select('*')
      .eq('work_order_id', workOrderId)
      .not('status', 'eq', 'RESOLVED')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return res.json(data || null);
  } catch (err) {
    console.error('[MissingPart] work-order lookup error:', err);
    return res.status(500).json({ error: 'Kunde inte hämta incident' });
  }
});
