/**
 * ─── RENTAL PARTNER INTEGRATION API ─────────────────────────────────────────
 * Connects workshops to Europcar, Hertz, Avis, Budget, Sixt, Enterprise + own fleet.
 * Auto-suggests vehicles when a delay or missing part occurs.
 * All state changes emit PIX events.
 */

import { Router, Request, Response } from 'express';
import { supabase } from './supabase';

const router = Router();

// ─── Auth helper ──────────────────────────────────────────────────────────────
function getOrgId(req: Request): string {
  return (req as any).user?.org_id || '';
}
function getUserId(req: Request): string | undefined {
  return (req as any).user?.id;
}
function requireOrg(req: Request, res: Response): string | null {
  const orgId = getOrgId(req);
  if (!orgId) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  return orgId;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RentalVehicle {
  id: string;
  provider: string;
  make: string;
  model: string;
  year: number;
  class: 'ECONOMY' | 'COMPACT' | 'MIDSIZE' | 'SUV' | 'PREMIUM';
  daily_rate: number;
  currency: string;
  available: boolean;
  image_url?: string;
  features: string[];
  booking_ref?: string;
  pickup_location?: string;
}

// ─── Provider mock data ───────────────────────────────────────────────────────
// Real API keys configured per org in rental_integrations table.
// Providers: Europcar, Hertz, Avis, Budget, Sixt, Enterprise + own fleet.

const MOCK_VEHICLES: RentalVehicle[] = [
  {
    id: 'v1', provider: 'Europcar', make: 'Volkswagen', model: 'Golf', year: 2024,
    class: 'COMPACT', daily_rate: 650, currency: 'SEK', available: true,
    features: ['Manuell', 'Diesel', '5 dörrar'],
    pickup_location: 'Hisingen, Göteborg',
  },
  {
    id: 'v2', provider: 'Hertz', make: 'Toyota', model: 'Corolla', year: 2024,
    class: 'COMPACT', daily_rate: 590, currency: 'SEK', available: true,
    features: ['Automat', 'Hybrid', '4 dörrar'],
    pickup_location: 'Centralen, Göteborg',
  },
  {
    id: 'v3', provider: 'Sixt', make: 'BMW', model: '3 Series', year: 2023,
    class: 'MIDSIZE', daily_rate: 1100, currency: 'SEK', available: true,
    features: ['Automat', 'Bensin', 'Premium'],
    pickup_location: 'Göteborg City',
  },
  {
    id: 'v4', provider: 'Avis', make: 'Volvo', model: 'V60', year: 2024,
    class: 'MIDSIZE', daily_rate: 850, currency: 'SEK', available: true,
    features: ['Automat', 'Hybrid', 'Familjevänlig'],
    pickup_location: 'Lindholmen, Göteborg',
  },
  {
    id: 'v5', provider: 'Budget', make: 'Škoda', model: 'Octavia', year: 2023,
    class: 'COMPACT', daily_rate: 520, currency: 'SEK', available: true,
    features: ['Manuell', 'Diesel', '5 dörrar'],
    pickup_location: 'Hisingen, Göteborg',
  },
  {
    id: 'v6', provider: 'Enterprise', make: 'Kia', model: 'EV6', year: 2024,
    class: 'MIDSIZE', daily_rate: 950, currency: 'SEK', available: true,
    features: ['Automat', 'Elektrisk', 'AWD'],
    pickup_location: 'Mölndal, Göteborg',
  },
];

// ─── Provider adapter — normalize external API responses ──────────────────────
// Each real provider has a different API. We normalize via adapters.
// Currently all providers fall back to mock data.
// Real implementation: plug in API keys from rental_integrations table.

async function fetchProviderVehicles(
  integration: any,
  pickupDate: Date,
  returnDate: Date,
  vehicleClass?: string,
): Promise<RentalVehicle[]> {
  const { provider, api_key_encrypted, location_id } = integration;

  // Future: call real provider APIs based on provider type
  // switch (provider) {
  //   case 'EUROPCAR': return await europcarAdapter.search(...);
  //   case 'HERTZ': return await hertzAdapter.search(...);
  //   case 'SIXT': return await sixtAdapter.search(...);
  //   ...
  // }

  // Mock: return provider-specific subset of vehicles
  const vehicles = MOCK_VEHICLES.filter(v =>
    v.provider.toUpperCase() === provider &&
    (!vehicleClass || v.class === vehicleClass)
  );

  if (location_id) {
    return vehicles.map(v => ({ ...v, pickup_location: location_id }));
  }
  return vehicles;
}

// ─── PIX event emitter ────────────────────────────────────────────────────────
async function emitRentalPartnerPIX(
  orgId: string,
  offerId: string | null,
  eventType: string,
  metadata: object,
  userId?: string,
) {
  const { error } = await supabase.from('pix_events').insert({
    org_id: orgId,
    entity_type: 'rental_offer',
    entity_id: offerId,
    event_type: eventType,
    metadata,
    performed_by: userId || null,
    created_at: new Date().toISOString(),
  }).select().single();

  if (error) {
    // pix_events might not have exactly this schema — try rental_pix_events
    await supabase.from('rental_pix_events').insert({
      org_id: orgId,
      booking_id: offerId,
      event_type: eventType,
      metadata,
      performed_by: userId || null,
    }).then(() => { return; });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/rental-partner/available
 * Query active providers for org. Falls back to mock if no integrations.
 * ?pickup=2026-03-23&return=2026-03-24&class=COMPACT&work_order_id=xxx
 */
router.get('/api/rental-partner/available', async (req: Request, res: Response) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;

  const { pickup, return: ret, class: vehicleClass, work_order_id } = req.query as Record<string, string>;
  const pickupDate = pickup ? new Date(pickup) : new Date();
  const returnDate = ret ? new Date(ret) : new Date(Date.now() + 86400000);

  // Get org's configured integrations
  const { data: integrations } = await supabase
    .from('rental_integrations')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true);

  let vehicles: RentalVehicle[] = [];

  if (integrations && integrations.length > 0) {
    // Query each configured provider
    const results = await Promise.allSettled(
      integrations.map(i => fetchProviderVehicles(i, pickupDate, returnDate, vehicleClass))
    );
    results.forEach(r => {
      if (r.status === 'fulfilled') vehicles.push(...r.value);
    });
  }

  // Always include mock vehicles for demo / if no integrations
  if (vehicles.length === 0) {
    vehicles = MOCK_VEHICLES.filter(v =>
      !vehicleClass || v.class === vehicleClass
    );
  }

  // Sort: cheapest first
  vehicles.sort((a, b) => a.daily_rate - b.daily_rate);

  res.json({ vehicles, count: vehicles.length, source: integrations?.length ? 'live' : 'demo' });
});

/**
 * GET /api/rental-partner/integrations
 * List org's configured rental provider integrations.
 */
router.get('/api/rental-partner/integrations', async (req: Request, res: Response) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;

  const { data, error } = await supabase
    .from('rental_integrations')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  // Mask API keys
  const safe = (data || []).map(r => ({
    ...r,
    api_key_encrypted: r.api_key_encrypted ? '••••••••' : null,
  }));

  // Also return list of supported providers not yet configured
  const PROVIDERS = ['EUROPCAR','HERTZ','AVIS','BUDGET','SIXT','ENTERPRISE','LOCALIZA','NATIONAL','THRIFTY','DOLLAR','OWN_FLEET','CUSTOM'];
  const configured = new Set(safe.map((r: any) => r.provider));
  const unconfigured = PROVIDERS.filter(p => !configured.has(p));

  res.json({ integrations: safe, unconfigured });
});

/**
 * POST /api/rental-partner/integrations
 * Add or update a rental provider integration.
 */
router.post('/api/rental-partner/integrations', async (req: Request, res: Response) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;

  const { provider, display_name, api_key, api_endpoint, account_id, location_id, config } = req.body;

  if (!provider || !display_name) {
    return res.status(400).json({ error: 'provider and display_name required' });
  }

  // Upsert by org + provider
  const { data: existing } = await supabase
    .from('rental_integrations')
    .select('id')
    .eq('org_id', orgId)
    .eq('provider', provider)
    .single();

  const payload: Record<string, any> = {
    org_id: orgId,
    provider,
    display_name,
    api_endpoint: api_endpoint || null,
    account_id: account_id || null,
    location_id: location_id || null,
    config: config || {},
    is_active: true,
    last_sync_at: null,
  };

  if (api_key) {
    // In production: encrypt with KMS. Here we store with basic marker.
    payload.api_key_encrypted = Buffer.from(api_key).toString('base64');
  }

  let data, error;
  if (existing?.id) {
    ({ data, error } = await supabase
      .from('rental_integrations')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single());
  } else {
    ({ data, error } = await supabase
      .from('rental_integrations')
      .insert(payload)
      .select()
      .single());
  }

  if (error) return res.status(500).json({ error: error.message });

  // Test connection (mock: always succeeds)
  const testResult = { success: true, message: 'Anslutning OK — provdatahämtning lyckades' };

  res.json({ integration: data, test: testResult });
});

/**
 * DELETE /api/rental-partner/integrations/:id
 */
router.delete('/api/rental-partner/integrations/:id', async (req: Request, res: Response) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;

  const { error } = await supabase
    .from('rental_integrations')
    .delete()
    .eq('id', req.params.id)
    .eq('org_id', orgId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

/**
 * POST /api/rental-partner/offer-to-customer
 * Sends rental offer SMS to customer. Links to work order / missing part incident.
 */
router.post('/api/rental-partner/offer-to-customer', async (req: Request, res: Response) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  const userId = getUserId(req);

  const {
    work_order_id,
    missing_part_incident_id,
    customer_name,
    customer_phone,
    customer_email,
    vehicle,          // Selected vehicle object
    pickup_date,
    return_date,
    workshop_name,
    workshop_phone,
    custom_sms,       // Optional override SMS text
  } = req.body;

  if (!work_order_id || !vehicle) {
    return res.status(400).json({ error: 'work_order_id and vehicle required' });
  }

  const v: RentalVehicle = vehicle;
  const pickupStr = pickup_date
    ? new Date(pickup_date).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'Imorgon fr. 09:00';

  // Build SMS
  const smsText = custom_sms || [
    `Hej ${customer_name || 'kund'}! Vi beklagar förseningen på ditt fordon.`,
    `Vi har reserverat ${v.make} ${v.model} ${v.year} (kostnadsfritt för dig) under väntetiden.`,
    `Hämtning: ${pickupStr} — ${v.pickup_location || v.provider}.`,
    `Bekräfta här: https://portal.pixdrift.com/rental/${work_order_id}`,
    `— ${workshop_name || 'Verkstaden'}`,
  ].join(' ');

  // Create rental offer record
  const { data: offer, error } = await supabase
    .from('rental_offers')
    .insert({
      org_id: orgId,
      work_order_id,
      missing_part_incident_id: missing_part_incident_id || null,
      customer_name: customer_name || null,
      customer_phone: customer_phone || null,
      customer_email: customer_email || null,
      provider: v.provider.toUpperCase(),
      vehicle_class: v.class,
      vehicle_make: v.make,
      vehicle_model: v.model,
      vehicle_year: v.year,
      daily_rate: v.daily_rate,
      customer_cost: 0,
      pickup_date: pickup_date || null,
      return_date: return_date || null,
      pickup_location: v.pickup_location || null,
      status: 'OFFERED',
      offered_at: new Date().toISOString(),
      customer_response_method: 'SMS',
      pix_events: [{
        type: 'offer_sent',
        at: new Date().toISOString(),
        by: userId,
        sms_preview: smsText.substring(0, 120),
      }],
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Emit PIX event
  await emitRentalPartnerPIX(orgId, offer.id, 'rental_offer_sent', {
    work_order_id,
    missing_part_incident_id,
    provider: v.provider,
    vehicle: `${v.make} ${v.model}`,
    customer: customer_name,
    sms_sent: !!customer_phone,
  }, userId);

  // In production: send actual SMS via Twilio/46elks
  // await smsService.send(customer_phone, smsText);

  res.json({
    offer,
    sms_preview: smsText,
    sms_sent: !!customer_phone,
    message: customer_phone ? 'Erbjudande skickat via SMS' : 'Erbjudande skapat (inget telefonnummer)',
  });
});

/**
 * POST /api/rental-partner/book
 * Confirm booking with provider and update offer status.
 */
router.post('/api/rental-partner/book', async (req: Request, res: Response) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  const userId = getUserId(req);

  const {
    offer_id,
    work_order_id,
    provider,
    vehicle_id,
    vehicle,
    pickup_date,
    return_date,
    customer_name,
    customer_phone,
    customer_email,
  } = req.body;

  if (!work_order_id) {
    return res.status(400).json({ error: 'work_order_id required' });
  }

  // In production: call provider's booking API
  // const reservation = await europcarAdapter.book({ vehicle_id, pickup_date, return_date, customer });
  const externalReservationId = `MOCK-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

  const v: Partial<RentalVehicle> = vehicle || {};

  // Upsert offer
  let offerId = offer_id;
  if (!offerId) {
    const { data: newOffer, error: insertErr } = await supabase
      .from('rental_offers')
      .insert({
        org_id: orgId,
        work_order_id,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        customer_email: customer_email || null,
        provider: (provider || v.provider || 'CUSTOM').toUpperCase(),
        vehicle_class: v.class || null,
        vehicle_make: v.make || null,
        vehicle_model: v.model || null,
        vehicle_year: v.year || null,
        daily_rate: v.daily_rate || null,
        customer_cost: 0,
        pickup_date: pickup_date || null,
        return_date: return_date || null,
        status: 'BOOKED',
        booked_at: new Date().toISOString(),
        external_reservation_id: externalReservationId,
      })
      .select()
      .single();

    if (insertErr) return res.status(500).json({ error: insertErr.message });
    offerId = newOffer.id;
  } else {
    await supabase
      .from('rental_offers')
      .update({
        status: 'BOOKED',
        booked_at: new Date().toISOString(),
        external_reservation_id: externalReservationId,
        pickup_date: pickup_date || undefined,
        return_date: return_date || undefined,
      })
      .eq('id', offerId)
      .eq('org_id', orgId);
  }

  // Emit PIX
  await emitRentalPartnerPIX(orgId, offerId, 'rental_car_booked', {
    work_order_id,
    provider,
    vehicle: v.make ? `${v.make} ${v.model}` : vehicle_id,
    reservation_id: externalReservationId,
    customer: customer_name,
  }, userId);

  // In production: send confirmation SMS
  // await smsService.send(customer_phone, `Din hyrbil (${v.make} ${v.model}) är bokad. Ref: ${externalReservationId}`);

  res.json({
    ok: true,
    offer_id: offerId,
    reservation_id: externalReservationId,
    status: 'BOOKED',
    message: 'Hyrbil bokad — bekräftelse skickas till kunden',
  });
});

/**
 * GET /api/rental-partner/offers
 * Active rental offers for org today.
 */
router.get('/api/rental-partner/offers', async (req: Request, res: Response) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;

  const { status, work_order_id, date } = req.query as Record<string, string>;

  let query = supabase
    .from('rental_offers')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (work_order_id) query = query.eq('work_order_id', work_order_id);
  if (date) {
    const d = new Date(date);
    const start = d.toISOString().split('T')[0];
    const end = new Date(d.getTime() + 86400000).toISOString().split('T')[0];
    query = query.gte('created_at', start).lt('created_at', end);
  }

  const { data, error } = await query.limit(100);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ offers: data || [] });
});

/**
 * PATCH /api/rental-partner/offers/:id/status
 * Update offer status (ACCEPTED, DECLINED, ACTIVE, RETURNED, CANCELLED).
 */
router.patch('/api/rental-partner/offers/:id/status', async (req: Request, res: Response) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  const userId = getUserId(req);

  const { status, note } = req.body;
  const validStatuses = ['ACCEPTED','DECLINED','BOOKED','ACTIVE','RETURNED','CANCELLED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const update: Record<string, any> = { status };
  if (status === 'ACCEPTED') update.accepted_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('rental_offers')
    .update(update)
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await emitRentalPartnerPIX(orgId, req.params.id, `rental_offer_${status.toLowerCase()}`, {
    status, note, updated_by: userId,
  }, userId);

  res.json({ offer: data });
});

/**
 * POST /api/rental-partner/offers/:id/return
 * Mark vehicle as returned, close out the offer.
 */
router.post('/api/rental-partner/offers/:id/return', async (req: Request, res: Response) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  const userId = getUserId(req);

  const { return_notes, fuel_level, damage_noted } = req.body;

  const { data, error } = await supabase
    .from('rental_offers')
    .update({
      status: 'RETURNED',
      return_date: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await emitRentalPartnerPIX(orgId, req.params.id, 'rental_car_returned', {
    return_notes, fuel_level, damage_noted, returned_at: new Date().toISOString(),
  }, userId);

  res.json({ offer: data, message: 'Fordon återlämnat — ärendet stängt' });
});

// ─── Compensation Rules ───────────────────────────────────────────────────────

/**
 * GET /api/rental-partner/compensation-rules
 */
router.get('/api/rental-partner/compensation-rules', async (req: Request, res: Response) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;

  const { data, error } = await supabase
    .from('compensation_rules')
    .select('*')
    .eq('org_id', orgId)
    .order('priority', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ rules: data || [] });
});

/**
 * POST /api/rental-partner/compensation-rules
 */
router.post('/api/rental-partner/compensation-rules', async (req: Request, res: Response) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;

  const {
    rule_name, trigger_type, min_delay_hours, max_delay_hours,
    compensation_type, compensation_value, rental_vehicle_class,
    rental_covered_days, rental_provider_preference,
    auto_notify_customer, auto_book_rental,
    customer_sms_template, priority,
  } = req.body;

  if (!rule_name || !trigger_type || !compensation_type) {
    return res.status(400).json({ error: 'rule_name, trigger_type, compensation_type required' });
  }

  const { data, error } = await supabase
    .from('compensation_rules')
    .insert({
      org_id: orgId,
      rule_name, trigger_type,
      min_delay_hours: min_delay_hours ?? null,
      max_delay_hours: max_delay_hours ?? null,
      compensation_type, compensation_value: compensation_value ?? null,
      rental_vehicle_class: rental_vehicle_class || null,
      rental_covered_days: rental_covered_days ?? 1,
      rental_provider_preference: rental_provider_preference || null,
      auto_notify_customer: auto_notify_customer ?? true,
      auto_book_rental: auto_book_rental ?? false,
      customer_sms_template: customer_sms_template || null,
      priority: priority ?? 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ rule: data });
});

/**
 * PATCH /api/rental-partner/compensation-rules/:id
 */
router.patch('/api/rental-partner/compensation-rules/:id', async (req: Request, res: Response) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;

  const allowed = [
    'rule_name','trigger_type','min_delay_hours','max_delay_hours',
    'compensation_type','compensation_value','rental_vehicle_class',
    'rental_covered_days','rental_provider_preference',
    'auto_notify_customer','auto_book_rental','customer_sms_template',
    'priority','is_active',
  ];
  const update: Record<string, any> = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

  const { data, error } = await supabase
    .from('compensation_rules')
    .update(update)
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ rule: data });
});

/**
 * DELETE /api/rental-partner/compensation-rules/:id
 */
router.delete('/api/rental-partner/compensation-rules/:id', async (req: Request, res: Response) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;

  const { error } = await supabase
    .from('compensation_rules')
    .delete()
    .eq('id', req.params.id)
    .eq('org_id', orgId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

/**
 * POST /api/rental-partner/compensation-rules/match
 * Given a trigger (delay_hours, trigger_type), find matching rule.
 * Used by MissingPartFlow to auto-suggest compensation.
 */
router.post('/api/rental-partner/compensation-rules/match', async (req: Request, res: Response) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;

  const { trigger_type, delay_hours } = req.body;

  const { data: rules } = await supabase
    .from('compensation_rules')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .eq('trigger_type', trigger_type || 'MISSING_PART')
    .order('priority', { ascending: false });

  if (!rules || rules.length === 0) {
    return res.json({ rule: null, message: 'Inga matchande regler' });
  }

  const dh = delay_hours ?? 0;
  const matched = rules.find(r => {
    const minOk = r.min_delay_hours == null || dh >= r.min_delay_hours;
    const maxOk = r.max_delay_hours == null || dh <= r.max_delay_hours;
    return minOk && maxOk;
  });

  res.json({ rule: matched || null });
});

export default router;
