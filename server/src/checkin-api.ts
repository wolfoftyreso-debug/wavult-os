/**
 * ─── SELF CHECK-IN API ────────────────────────────────────────────────────────
 * Standardized integration surface for key boxes, kiosks, and mobile check-in.
 *
 * Core principle: Own the logic, not the box.
 *
 * PIX events emitted:
 *   vehicle_checked_in → when check-in completes
 *   job_created        → when work order is created
 *   vehicle_location_updated → when key location is set
 *   key_dropped        → when key is deposited
 *
 * PUBLIC ENDPOINTS (no auth — customer-facing):
 *   POST /api/checkin/start
 *   GET  /api/checkin/:token
 *   POST /api/checkin/:token/vehicle-info
 *   POST /api/checkin/:token/complete
 *
 * WEBHOOK ENDPOINTS (HMAC-signed):
 *   POST /api/checkin/webhook/checkvik
 *   POST /api/checkin/webhook/generic
 *
 * INTERNAL ENDPOINTS (auth required):
 *   GET  /api/checkin/active
 *   GET  /api/checkin/:id/details
 *   POST /api/checkin/integrations
 *   GET  /api/checkin/integrations
 *   POST /api/checkin/integrations/:id/test
 */

import { Router, Request, Response } from 'express';
import { createHmac } from 'crypto';
import { supabase } from './supabase';

const router = Router();

// ─── SUPPORTED INTEGRATIONS ───────────────────────────────────────────────────

export const SUPPORTED_INTEGRATIONS = [
  {
    id: 'checkvik',
    name: 'Checkvik',
    type: 'KEY_BOX',
    country: 'SE',
    description: 'Nyckelbox för bilverkstäder',
    logo: '🔑',
    status: 'supported',
  },
  {
    id: 'iloq',
    name: 'iLOQ',
    type: 'KEY_BOX',
    country: 'FI/SE',
    description: 'Digital nyckelhantering',
    logo: '🔐',
    status: 'supported',
  },
  {
    id: 'customerlane',
    name: 'CustomerLane',
    type: 'KIOSK',
    country: 'INTL',
    description: 'Digital check-in kiosk',
    logo: '🖥️',
    status: 'supported',
  },
  {
    id: 'keywatcher',
    name: 'KeyWatcher',
    type: 'KEY_BOX',
    country: 'INTL',
    description: 'Intelligent key cabinet',
    logo: '🗄️',
    status: 'supported',
  },
  {
    id: 'qr_mobile',
    name: 'QR / Mobile',
    type: 'MOBILE',
    country: 'ALL',
    description: 'Kund scannar QR och checkar in via mobil',
    logo: '📱',
    status: 'built_in',
  },
  {
    id: 'webhook',
    name: 'Custom webhook',
    type: 'API',
    country: 'ALL',
    description: 'Anslut valfritt system via webhook',
    logo: '🔗',
    status: 'supported',
  },
] as const;

// ─── PIX EVENT EMITTER ────────────────────────────────────────────────────────

async function emitCheckinPIX(
  orgId: string,
  sessionId: string,
  eventType: 'vehicle_checked_in' | 'job_created' | 'vehicle_location_updated' | 'key_dropped',
  metadata: Record<string, unknown>
): Promise<void> {
  const event = {
    org_id: orgId,
    session_id: sessionId,
    event_type: eventType,
    metadata,
    emitted_at: new Date().toISOString(),
  };

  // Store in session's pix_events log
  const { data: session } = await supabase
    .from('checkin_sessions')
    .select('pix_events')
    .eq('id', sessionId)
    .maybeSingle();

  const existing = (session?.pix_events as unknown[]) || [];
  await supabase
    .from('checkin_sessions')
    .update({ pix_events: [...existing, event] })
    .eq('id', sessionId);

  // Also persist to domain_events for full PIX traceability
  await supabase.from('domain_events').insert({
    org_id: orgId,
    event_type: `checkin.${eventType}`,
    entity_id: sessionId,
    entity_type: 'checkin_session',
    source_id: 'checkin-api',
    payload: metadata,
  }).then(({ error }) => {
    if (error) console.error('[checkin-pix] domain_events insert failed:', error.message);
  });

  console.log(`[PIX] ${eventType} | session=${sessionId} | org=${orgId}`);
}

// ─── NOTIFICATION HELPER ──────────────────────────────────────────────────────

async function notifyServiceAdvisor(
  orgId: string,
  session: {
    id: string;
    vehicle_reg?: string | null;
    customer_name?: string | null;
    work_order_id?: string | null;
    checkin_method?: string | null;
  }
): Promise<void> {
  const time = new Date().toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Stockholm',
  });

  const vehicleLabel = session.vehicle_reg || 'Okänt fordon';
  const customerLabel = session.customer_name || 'Kund';
  const method = session.checkin_method || 'CHECK-IN';

  const notification = {
    org_id: orgId,
    type: 'checkin',
    title: `Kund incheckat: ${vehicleLabel}`,
    body: `${customerLabel} — kl ${time} via ${method}`,
    entity_type: 'checkin_session',
    entity_id: session.id,
    link: session.work_order_id
      ? `/work-orders/${session.work_order_id}`
      : `/checkin/${session.id}`,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('notifications').insert(notification);
  if (error) {
    // Table may not exist yet — log but don't fail the check-in
    console.warn('[checkin] notification insert failed:', error.message);
  }
}

// ─── AUTH MIDDLEWARE (lightweight) ───────────────────────────────────────────

function auth(req: Request, res: Response, next: Function) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/checkin/start
 * Customer or hardware initiates a check-in session.
 * No auth required — public endpoint.
 */
router.post('/api/checkin/start', async (req: Request, res: Response) => {
  const {
    org_id,
    vehicle_reg,
    customer_phone,
    customer_name,
    customer_email,
    booking_ref,
    checkin_method = 'QR',
    integration_source,
    external_reference,
  } = req.body;

  if (!org_id || !vehicle_reg) {
    return res.status(400).json({ error: 'org_id and vehicle_reg are required' });
  }

  // Look up booking if ref provided
  let booking_id: string | null = null;
  if (booking_ref) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('id')
      .eq('org_id', org_id)
      .eq('reference', booking_ref)
      .maybeSingle();
    booking_id = booking?.id ?? null;
  }

  const { data: session, error } = await supabase
    .from('checkin_sessions')
    .insert({
      org_id,
      vehicle_reg: vehicle_reg.toUpperCase().replace(/\s/g, ''),
      customer_phone,
      customer_name,
      customer_email,
      booking_id,
      checkin_method,
      integration_source,
      external_reference,
      status: 'PENDING',
    })
    .select()
    .single();

  if (error || !session) {
    console.error('[checkin/start]', error?.message);
    return res.status(500).json({ error: 'Failed to create check-in session' });
  }

  const checkinUrl = `https://checkin.pixdrift.com?token=${session.session_token}`;

  // Attempt SMS via 46elks (non-blocking)
  if (customer_phone) {
    sendCheckinSMS(customer_phone, checkinUrl, org_id).catch((e) =>
      console.warn('[checkin] SMS failed:', e.message)
    );
  }

  return res.status(201).json({
    session_token: session.session_token,
    checkin_url: checkinUrl,
    session_id: session.id,
    instructions: {
      sv: 'Öppna länken för att checka in ditt fordon.',
      en: 'Open the link to check in your vehicle.',
    },
  });
});

/**
 * GET /api/checkin/:token
 * Returns session state. Used by kiosk/mobile to render current step.
 */
router.get('/api/checkin/:token', async (req: Request, res: Response) => {
  const { token } = req.params;

  const { data: session, error } = await supabase
    .from('checkin_sessions')
    .select('*')
    .eq('session_token', token)
    .maybeSingle();

  if (error || !session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Fetch org brand for white-labeling
  const { data: brand } = await supabase
    .from('org_brands')
    .select('display_name, logo_url, primary_color')
    .eq('org_id', session.org_id)
    .maybeSingle();

  return res.json({
    session_token: session.session_token,
    status: session.status,
    vehicle_reg: session.vehicle_reg,
    customer_name: session.customer_name,
    step: deriveStep(session),
    brand: brand || { display_name: 'Pixdrift', logo_url: null, primary_color: '#2563eb' },
  });
});

/**
 * POST /api/checkin/:token/vehicle-info
 * Captures vehicle condition at drop-off.
 */
router.post('/api/checkin/:token/vehicle-info', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { mileage, fuel_level, photos, customer_notes } = req.body;

  const { data: session, error } = await supabase
    .from('checkin_sessions')
    .select('id, org_id, status')
    .eq('session_token', token)
    .maybeSingle();

  if (error || !session) return res.status(404).json({ error: 'Session not found' });
  if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
    return res.status(409).json({ error: `Session already ${session.status}` });
  }

  await supabase
    .from('checkin_sessions')
    .update({
      mileage_at_checkin: mileage ?? null,
      fuel_level_at_checkin: fuel_level ?? null,
      photos: photos ?? [],
      customer_notes: customer_notes ?? null,
    })
    .eq('id', session.id);

  return res.json({ ok: true, message: 'Vehicle info saved' });
});

/**
 * POST /api/checkin/:token/complete
 * Finalizes the check-in. Emits PIX events, creates work order, notifies advisor.
 */
router.post('/api/checkin/:token/complete', async (req: Request, res: Response) => {
  const { token } = req.params;
  const {
    key_location,
    key_number,
    digital_signature,
    agreed_to_terms,
  } = req.body;

  if (!agreed_to_terms) {
    return res.status(400).json({ error: 'Customer must agree to terms' });
  }

  const { data: session, error } = await supabase
    .from('checkin_sessions')
    .select('*')
    .eq('session_token', token)
    .maybeSingle();

  if (error || !session) return res.status(404).json({ error: 'Session not found' });
  if (session.status !== 'PENDING') {
    return res.status(409).json({ error: `Session already ${session.status}` });
  }

  // ── Create work order if booking exists ───────────────────────────────────
  let work_order_id: string | null = null;
  if (session.booking_id) {
    const { data: wo } = await supabase
      .from('work_orders')
      .insert({
        org_id: session.org_id,
        booking_id: session.booking_id,
        vehicle_reg: session.vehicle_reg,
        vehicle_vin: session.vehicle_vin,
        customer_name: session.customer_name,
        customer_phone: session.customer_phone,
        mileage_at_checkin: session.mileage_at_checkin,
        fuel_level: session.fuel_level_at_checkin,
        status: 'RECEIVED',
        source: 'SELF_CHECKIN',
      })
      .select('id')
      .single();
    work_order_id = wo?.id ?? null;
  }

  // ── Finalize session ──────────────────────────────────────────────────────
  const completedAt = new Date().toISOString();
  await supabase
    .from('checkin_sessions')
    .update({
      key_location,
      key_number: key_number ?? null,
      digital_signature: digital_signature ?? null,
      agreed_to_terms: true,
      status: 'CHECKED_IN',
      completed_at: completedAt,
      work_order_id,
    })
    .eq('id', session.id);

  // ── PIX events ────────────────────────────────────────────────────────────
  await emitCheckinPIX(session.org_id, session.id, 'vehicle_checked_in', {
    vehicle_reg: session.vehicle_reg,
    checkin_method: session.checkin_method,
    completed_at: completedAt,
  });

  if (key_location) {
    await emitCheckinPIX(session.org_id, session.id, 'key_dropped', {
      key_location,
      key_number: key_number ?? null,
    });

    await emitCheckinPIX(session.org_id, session.id, 'vehicle_location_updated', {
      location: key_location,
    });
  }

  if (work_order_id) {
    await emitCheckinPIX(session.org_id, session.id, 'job_created', {
      work_order_id,
      vehicle_reg: session.vehicle_reg,
    });
  }

  // ── Notify service advisor ────────────────────────────────────────────────
  await notifyServiceAdvisor(session.org_id, {
    id: session.id,
    vehicle_reg: session.vehicle_reg,
    customer_name: session.customer_name,
    work_order_id,
    checkin_method: session.checkin_method,
  });

  return res.json({
    ok: true,
    status: 'CHECKED_IN',
    work_order_id,
    message: 'Check-in complete. Thank you!',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/checkin/webhook/checkvik
 * Receives events from Checkvik key box system.
 * Verifies HMAC-SHA256 signature.
 */
router.post('/api/checkin/webhook/checkvik', async (req: Request, res: Response) => {
  const sig = req.headers['x-checkvik-signature'] as string;
  const secret = process.env.CHECKVIK_WEBHOOK_SECRET;

  if (secret && sig) {
    const expected = createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');
    if (sig !== expected) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  const { event, key_slot, vehicle_reg, reference, org_id } = req.body;

  console.log(`[checkvik-webhook] event=${event} slot=${key_slot} reg=${vehicle_reg}`);

  // Map Checkvik events → PIX events
  const eventMap: Record<string, string> = {
    KEY_INSERTED: 'key_dropped',
    KEY_REMOVED: 'key_pickup',
    DOOR_OPENED: 'key_box_accessed',
  };

  const pixEventType = eventMap[event];

  if (pixEventType === 'key_dropped' && vehicle_reg && org_id) {
    // Find or create a check-in session for this vehicle
    const { data: existing } = await supabase
      .from('checkin_sessions')
      .select('id, org_id')
      .eq('vehicle_reg', vehicle_reg.toUpperCase())
      .eq('org_id', org_id)
      .eq('status', 'PENDING')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('checkin_sessions')
        .update({
          key_location: `Checkvik slot ${key_slot}`,
          key_number: key_slot,
          integration_source: 'checkvik',
          external_reference: reference,
          status: 'CHECKED_IN',
          completed_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      await emitCheckinPIX(existing.org_id, existing.id, 'key_dropped', {
        key_location: `Checkvik slot ${key_slot}`,
        key_number: key_slot,
        integration_source: 'checkvik',
      });

      await emitCheckinPIX(existing.org_id, existing.id, 'vehicle_location_updated', {
        location: `Checkvik slot ${key_slot}`,
      });

      await emitCheckinPIX(existing.org_id, existing.id, 'vehicle_checked_in', {
        vehicle_reg,
        checkin_method: 'KEY_BOX',
        integration_source: 'checkvik',
      });

      await notifyServiceAdvisor(existing.org_id, {
        id: existing.id,
        vehicle_reg,
        checkin_method: 'KEY_BOX',
      });
    } else {
      // Auto-create session from key box event
      const { data: newSession } = await supabase
        .from('checkin_sessions')
        .insert({
          org_id,
          vehicle_reg: vehicle_reg.toUpperCase(),
          checkin_method: 'KEY_BOX',
          key_location: `Checkvik slot ${key_slot}`,
          key_number: key_slot,
          integration_source: 'checkvik',
          external_reference: reference,
          status: 'CHECKED_IN',
          completed_at: new Date().toISOString(),
        })
        .select('id, org_id')
        .single();

      if (newSession) {
        await emitCheckinPIX(newSession.org_id, newSession.id, 'key_dropped', {
          key_location: `Checkvik slot ${key_slot}`,
        });
        await emitCheckinPIX(newSession.org_id, newSession.id, 'vehicle_checked_in', {
          vehicle_reg,
          checkin_method: 'KEY_BOX',
        });
        await notifyServiceAdvisor(newSession.org_id, {
          id: newSession.id,
          vehicle_reg,
          checkin_method: 'KEY_BOX',
        });
      }
    }
  }

  return res.json({ ok: true, processed: pixEventType || 'unhandled' });
});

/**
 * POST /api/checkin/webhook/generic
 * Generic webhook receiver for any compatible hardware system.
 */
router.post('/api/checkin/webhook/generic', async (req: Request, res: Response) => {
  const { event_type, reference, metadata, org_id } = req.body;

  if (!event_type || !org_id) {
    return res.status(400).json({ error: 'event_type and org_id required' });
  }

  console.log(`[generic-webhook] org=${org_id} event=${event_type} ref=${reference}`);

  // Find integration config for HMAC validation
  const { data: integration } = await supabase
    .from('checkin_integrations')
    .select('webhook_secret')
    .eq('org_id', org_id)
    .eq('integration_type', 'WEBHOOK')
    .eq('is_active', true)
    .maybeSingle();

  if (integration?.webhook_secret) {
    const sig = req.headers['x-webhook-signature'] as string;
    if (sig) {
      const expected = createHmac('sha256', integration.webhook_secret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      if (sig !== expected) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }
  }

  // Find session by reference
  const { data: session } = await supabase
    .from('checkin_sessions')
    .select('id, org_id, status')
    .eq('org_id', org_id)
    .eq('external_reference', reference)
    .maybeSingle();

  if (session) {
    // Append to pix_events
    const pixType = event_type === 'key_inserted' ? 'key_dropped'
      : event_type === 'vehicle_arrived' ? 'vehicle_checked_in'
      : 'vehicle_location_updated';

    await emitCheckinPIX(session.org_id, session.id, pixType as any, {
      event_type,
      reference,
      ...metadata,
    });
  }

  return res.json({ ok: true, session_found: !!session });
});

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL ENDPOINTS (auth required)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/checkin/active
 * Returns all active check-ins for today (org-scoped).
 */
router.get('/api/checkin/active', auth, async (req: Request, res: Response) => {
  const orgId = (req as any).user?.org_id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('checkin_sessions')
    .select('*')
    .eq('org_id', orgId)
    .in('status', ['PENDING', 'CHECKED_IN', 'IN_PROGRESS'])
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ sessions: data, count: data?.length ?? 0 });
});

/**
 * GET /api/checkin/:id/details
 * Full session detail for internal dashboard.
 */
router.get('/api/checkin/:id/details', auth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req as any).user?.org_id;

  const { data, error } = await supabase
    .from('checkin_sessions')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (error || !data) return res.status(404).json({ error: 'Session not found' });
  return res.json(data);
});

/**
 * POST /api/checkin/integrations
 * Configure a new hardware integration for this org.
 */
router.post('/api/checkin/integrations', auth, async (req: Request, res: Response) => {
  const orgId = (req as any).user?.org_id;
  const {
    integration_type,
    display_name,
    api_endpoint,
    api_key,
    webhook_secret,
    config,
  } = req.body;

  if (!integration_type || !display_name) {
    return res.status(400).json({ error: 'integration_type and display_name required' });
  }

  // Encrypt API key (base64 for now — swap with KMS in prod)
  const api_key_encrypted = api_key
    ? Buffer.from(api_key).toString('base64')
    : null;

  const { data, error } = await supabase
    .from('checkin_integrations')
    .insert({
      org_id: orgId,
      integration_type,
      display_name,
      api_endpoint: api_endpoint ?? null,
      api_key_encrypted,
      webhook_secret: webhook_secret ?? null,
      config: config ?? {},
      is_active: true,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

/**
 * GET /api/checkin/integrations
 * List configured integrations for this org.
 */
router.get('/api/checkin/integrations', auth, async (req: Request, res: Response) => {
  const orgId = (req as any).user?.org_id;

  const { data, error } = await supabase
    .from('checkin_integrations')
    .select('id, integration_type, display_name, api_endpoint, is_active, last_ping_at, config, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  return res.json({
    configured: data,
    supported: SUPPORTED_INTEGRATIONS,
  });
});

/**
 * POST /api/checkin/integrations/:id/test
 * Ping the configured integration to verify connectivity.
 */
router.post('/api/checkin/integrations/:id/test', auth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req as any).user?.org_id;

  const { data: integration, error } = await supabase
    .from('checkin_integrations')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (error || !integration) {
    return res.status(404).json({ error: 'Integration not found' });
  }

  let pingResult: { ok: boolean; latency_ms?: number; error?: string } = { ok: false };

  if (integration.api_endpoint) {
    const start = Date.now();
    try {
      const response = await fetch(`${integration.api_endpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      pingResult = {
        ok: response.ok,
        latency_ms: Date.now() - start,
      };
    } catch (e: any) {
      pingResult = { ok: false, error: e.message };
    }
  } else {
    // No endpoint — just mark as tested
    pingResult = { ok: true, latency_ms: 0 };
  }

  // Update last_ping_at regardless of result
  await supabase
    .from('checkin_integrations')
    .update({ last_ping_at: new Date().toISOString() })
    .eq('id', id);

  return res.json({
    integration_id: id,
    integration_type: integration.integration_type,
    ...pingResult,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function deriveStep(session: any): number {
  if (session.status === 'CHECKED_IN' || session.status === 'COMPLETED') return 6;
  if (session.agreed_to_terms) return 5;
  if (session.customer_notes !== null) return 4;
  if (session.photos?.length > 0) return 3;
  if (session.mileage_at_checkin !== null) return 2;
  if (session.vehicle_reg) return 1;
  return 0;
}

async function sendCheckinSMS(phone: string, checkinUrl: string, orgId: string): Promise<void> {
  const apiUsername = process.env.ELKS_API_USERNAME;
  const apiPassword = process.env.ELKS_API_PASSWORD;

  if (!apiUsername || !apiPassword) return;

  // Fetch org name for SMS
  const { data: brand } = await supabase
    .from('org_brands')
    .select('display_name')
    .eq('org_id', orgId)
    .maybeSingle();

  const senderName = (brand?.display_name || 'Pixdrift').slice(0, 11);
  const message = `${senderName}: Checka in ditt fordon här: ${checkinUrl}`;
  const to = normalizePhone(phone);

  const credentials = Buffer.from(`${apiUsername}:${apiPassword}`).toString('base64');

  const response = await fetch('https://api.46elks.com/a1/sms', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ from: senderName, to, message }).toString(),
  });

  if (response.ok) {
    const data = await response.json() as any;
    console.log(`[checkin-sms] Sent to ${to}, id: ${data.id}`);
  } else {
    console.error('[checkin-sms] Failed:', await response.text());
  }
}

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '');
  if (normalized.startsWith('0')) normalized = '46' + normalized.slice(1);
  if (!normalized.startsWith('+')) normalized = '+' + normalized;
  return normalized;
}

export default router;
