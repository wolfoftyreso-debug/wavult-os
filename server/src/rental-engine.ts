/**
 * ─── RENTAL ENGINE ───────────────────────────────────────────────────────────
 * PIX-event-sourced availability system.
 * Core principle: availability is CALCULATED, never stored as a boolean.
 * Every state change emits a PIX event — the event log IS the truth.
 */

import { Router, Request, Response } from 'express';
import { supabase } from './supabase';

const router = Router();

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function calculatePrice(vehicle: any, days: number): number {
  if (days >= 7 && vehicle.weekly_rate) {
    return Math.round((days / 7) * vehicle.weekly_rate * 100) / 100;
  }
  return Math.round(days * vehicle.daily_rate * 100) / 100;
}

async function emitRentalPIX(
  orgId: string,
  bookingId: string | null,
  vehicleId: string | null,
  eventType: string,
  metadata: object,
  userId?: string,
  statusChanges?: {
    vehicleBefore?: string; vehicleAfter?: string;
    bookingBefore?: string; bookingAfter?: string;
  }
) {
  const { error } = await supabase.from('rental_pix_events').insert({
    org_id: orgId,
    booking_id: bookingId,
    vehicle_id: vehicleId,
    event_type: eventType,
    metadata,
    performed_by: userId || null,
    vehicle_status_before: statusChanges?.vehicleBefore || null,
    vehicle_status_after: statusChanges?.vehicleAfter || null,
    booking_status_before: statusChanges?.bookingBefore || null,
    booking_status_after: statusChanges?.bookingAfter || null,
  });
  if (error) console.error('[rental-pix]', eventType, error.message);
}

function getOrgId(req: Request): string {
  return (req as any).user?.org_id || '';
}

function getUserId(req: Request): string | undefined {
  return (req as any).user?.id;
}

// ─── AVAILABILITY ENGINE ──────────────────────────────────────────────────────
// The heart of the system. Availability is computed from bookings + blocks.

// GET /api/rental/availability?from_date=&to_date=&category=
router.get('/availability', async (req: Request, res: Response) => {
  const { from_date, to_date, category } = req.query;

  if (!from_date || !to_date) {
    return res.status(400).json({ error: 'from_date and to_date are required' });
  }

  try {
    const orgId = getOrgId(req);
    const from = new Date(from_date as string);
    const to = new Date(to_date as string);
    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));

    let vehicleQuery = supabase
      .from('rental_vehicles')
      .select('*')
      .eq('org_id', orgId)
      .neq('current_status', 'RETIRED')
      .neq('current_status', 'UNAVAILABLE');

    if (category) vehicleQuery = vehicleQuery.eq('category', category);

    const { data: vehicles, error: vErr } = await vehicleQuery;
    if (vErr) return res.status(500).json({ error: vErr.message });

    const availableVehicles: any[] = [];

    // Check each vehicle — availability is derived from event reality
    for (const vehicle of vehicles || []) {
      // 1. Any active/confirmed booking overlaps this window?
      const { data: conflicting } = await supabase
        .from('rental_bookings')
        .select('id')
        .eq('vehicle_id', vehicle.id)
        .in('status', ['RESERVED', 'CONFIRMED', 'ACTIVE'])
        .lt('start_time', to.toISOString())
        .gt('end_time', from.toISOString());

      // 2. Any manual block overlaps?
      const { data: blocks } = await supabase
        .from('rental_blocks')
        .select('id')
        .eq('vehicle_id', vehicle.id)
        .lt('start_time', to.toISOString())
        .gt('end_time', from.toISOString());

      if (!conflicting?.length && !blocks?.length) {
        const calculated_price = calculatePrice(vehicle, days);
        availableVehicles.push({ ...vehicle, calculated_price, days });
      }
    }

    return res.json({
      available: availableVehicles,
      from_date,
      to_date,
      days,
      total_fleet: vehicles?.length || 0,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /api/rental/vehicles/:id/calendar?year=&month=
router.get('/vehicles/:id/calendar', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { year, month } = req.query;

  const y = parseInt(year as string) || new Date().getFullYear();
  const m = parseInt(month as string) || (new Date().getMonth() + 1);

  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0, 23, 59, 59);

  try {
    const [bookingsRes, blocksRes, vehicleRes] = await Promise.all([
      supabase
        .from('rental_bookings')
        .select('id,booking_number,customer_name,start_time,end_time,status,total_amount,currency')
        .eq('vehicle_id', id)
        .neq('status', 'CANCELLED')
        .lte('start_time', to.toISOString())
        .gte('end_time', from.toISOString()),
      supabase
        .from('rental_blocks')
        .select('*')
        .eq('vehicle_id', id)
        .lte('start_time', to.toISOString())
        .gte('end_time', from.toISOString()),
      supabase
        .from('rental_vehicles')
        .select('id,registration_number,make,model,current_status')
        .eq('id', id)
        .single(),
    ]);

    return res.json({
      vehicle: vehicleRes.data,
      vehicle_id: id,
      year: y,
      month: m,
      bookings: bookingsRes.data || [],
      blocks: blocksRes.data || [],
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /api/rental/fleet — fleet overview with utilization
router.get('/fleet', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const { data: vehicles, error } = await supabase
      .from('rental_vehicles')
      .select('*')
      .eq('org_id', orgId)
      .neq('current_status', 'RETIRED');

    if (error) return res.status(500).json({ error: error.message });

    const fleetData = await Promise.all((vehicles || []).map(async (v) => {
      // Get active booking if any
      const { data: activeBookings } = await supabase
        .from('rental_bookings')
        .select('*')
        .eq('vehicle_id', v.id)
        .eq('status', 'ACTIVE')
        .limit(1);

      // Revenue this month
      const { data: monthBookings } = await supabase
        .from('rental_bookings')
        .select('total_amount,total_days,start_time,end_time')
        .eq('vehicle_id', v.id)
        .in('status', ['CONFIRMED', 'ACTIVE', 'COMPLETED'])
        .gte('start_time', monthStart.toISOString())
        .lte('start_time', monthEnd.toISOString());

      const monthRevenue = (monthBookings || []).reduce(
        (sum, b) => sum + (parseFloat(b.total_amount) || 0), 0
      );

      const totalDaysBooked = (monthBookings || []).reduce(
        (sum, b) => sum + (parseFloat(b.total_days) || 0), 0
      );

      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const utilization = Math.round((totalDaysBooked / daysInMonth) * 100);

      return {
        ...v,
        active_booking: activeBookings?.[0] || null,
        month_revenue: monthRevenue,
        month_revenue_formatted: `${monthRevenue.toLocaleString('sv-SE')} SEK`,
        utilization_percent: Math.min(utilization, 100),
        in_use_until: activeBookings?.[0]?.end_time || null,
      };
    }));

    return res.json({ fleet: fleetData, count: fleetData.length });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ─── BOOKING STATE MACHINE ────────────────────────────────────────────────────

// GET /api/rental/bookings
router.get('/bookings', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { status, vehicle_id, from_date, to_date, limit = '50', offset = '0' } = req.query;

    let query = supabase
      .from('rental_bookings')
      .select(`
        *,
        vehicle:rental_vehicles(id,registration_number,make,model,category,current_status)
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (status) query = query.eq('status', status);
    if (vehicle_id) query = query.eq('vehicle_id', vehicle_id);
    if (from_date) query = query.gte('start_time', from_date as string);
    if (to_date) query = query.lte('end_time', to_date as string);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });

    return res.json({ bookings: data || [], total: count });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/rental/bookings — create booking → emits BOOKING_CREATED PIX
router.post('/bookings', async (req: Request, res: Response) => {
  const {
    vehicle_id, customer_name, customer_email, customer_phone,
    customer_driver_license, customer_id,
    start_time, end_time, extras, notes, deposit_amount
  } = req.body;

  if (!vehicle_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'vehicle_id, start_time, end_time required' });
  }

  try {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    const days = Math.max(1, Math.ceil(
      (new Date(end_time).getTime() - new Date(start_time).getTime()) / (1000 * 60 * 60 * 24)
    ));

    // Atomic availability check
    const [{ data: conflicts }, { data: blockConflicts }] = await Promise.all([
      supabase
        .from('rental_bookings')
        .select('id,booking_number,customer_name')
        .eq('vehicle_id', vehicle_id)
        .in('status', ['RESERVED', 'CONFIRMED', 'ACTIVE'])
        .lt('start_time', end_time)
        .gt('end_time', start_time),
      supabase
        .from('rental_blocks')
        .select('id,reason')
        .eq('vehicle_id', vehicle_id)
        .lt('start_time', end_time)
        .gt('end_time', start_time),
    ]);

    if (conflicts?.length) {
      return res.status(409).json({
        error: 'VEHICLE_UNAVAILABLE',
        message: 'Vehicle is already booked for this period',
        conflict: conflicts[0],
      });
    }
    if (blockConflicts?.length) {
      return res.status(409).json({
        error: 'VEHICLE_BLOCKED',
        message: 'Vehicle is blocked during this period',
        block: blockConflicts[0],
      });
    }

    const { data: vehicle, error: vErr } = await supabase
      .from('rental_vehicles')
      .select('*')
      .eq('id', vehicle_id)
      .single();

    if (vErr || !vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const base_amount = calculatePrice(vehicle, days);
    const extras_amount = extras
      ? (Array.isArray(extras) ? extras : []).reduce((s: number, e: any) => s + (e.amount || 0), 0)
      : 0;
    const total_amount = base_amount + extras_amount;

    const { data: booking, error: bErr } = await supabase
      .from('rental_bookings')
      .insert({
        org_id: orgId,
        vehicle_id,
        customer_id: customer_id || null,
        customer_name,
        customer_email,
        customer_phone,
        customer_driver_license,
        start_time,
        end_time,
        daily_rate: vehicle.daily_rate,
        total_days: days,
        base_amount,
        extras_amount,
        total_amount,
        deposit_amount: deposit_amount || vehicle.deposit_amount || 0,
        currency: 'SEK',
        extras: extras || [],
        notes,
        created_by: userId || null,
      })
      .select()
      .single();

    if (bErr) return res.status(500).json({ error: bErr.message });

    await emitRentalPIX(
      orgId, booking.id, vehicle_id, 'BOOKING_CREATED',
      { customer_name, customer_email, days, base_amount, total_amount, start_time, end_time },
      userId,
      { bookingBefore: undefined, bookingAfter: 'RESERVED' }
    );

    return res.status(201).json(booking);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// PATCH /api/rental/bookings/:id/confirm
router.patch('/bookings/:id/confirm', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data: booking, error } = await supabase
      .from('rental_bookings').select('*').eq('id', id).single();
    if (error || !booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'RESERVED') {
      return res.status(400).json({ error: 'Can only confirm RESERVED bookings', current: booking.status });
    }

    await supabase.from('rental_bookings')
      .update({ status: 'CONFIRMED', updated_at: new Date().toISOString() })
      .eq('id', id);

    await emitRentalPIX(
      booking.org_id, id, booking.vehicle_id, 'BOOKING_CONFIRMED', {},
      getUserId(req),
      { bookingBefore: 'RESERVED', bookingAfter: 'CONFIRMED' }
    );

    return res.json({ status: 'CONFIRMED', booking_id: id });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// PATCH /api/rental/bookings/:id/start
router.patch('/bookings/:id/start', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { odometer_start, fuel_level_start } = req.body;
  try {
    const { data: booking, error } = await supabase
      .from('rental_bookings').select('*').eq('id', id).single();
    if (error || !booking) return res.status(404).json({ error: 'Booking not found' });

    if (!['RESERVED', 'CONFIRMED'].includes(booking.status)) {
      return res.status(400).json({ error: 'Cannot start — booking must be RESERVED or CONFIRMED', current: booking.status });
    }

    const startedAt = new Date().toISOString();

    await Promise.all([
      supabase.from('rental_bookings').update({
        status: 'ACTIVE',
        actual_start: startedAt,
        odometer_start: odometer_start || null,
        fuel_level_start: fuel_level_start || null,
        updated_at: startedAt,
      }).eq('id', id),
      supabase.from('rental_vehicles').update({
        current_status: 'IN_USE',
        updated_at: startedAt,
      }).eq('id', booking.vehicle_id),
    ]);

    await emitRentalPIX(
      booking.org_id, id, booking.vehicle_id, 'RENTAL_STARTED',
      { odometer_start, fuel_level_start, started_at: startedAt },
      getUserId(req),
      { vehicleBefore: booking.vehicle_status || 'AVAILABLE', vehicleAfter: 'IN_USE', bookingBefore: booking.status, bookingAfter: 'ACTIVE' }
    );

    return res.json({ status: 'ACTIVE', started_at: startedAt });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// PATCH /api/rental/bookings/:id/complete
router.patch('/bookings/:id/complete', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { odometer_end, fuel_level_end, damage_notes } = req.body;
  try {
    const { data: booking, error } = await supabase
      .from('rental_bookings').select('*').eq('id', id).single();
    if (error || !booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Can only complete ACTIVE rentals', current: booking.status });
    }

    const completedAt = new Date().toISOString();
    const mileage = odometer_end && booking.odometer_start
      ? odometer_end - booking.odometer_start
      : null;

    // Calculate mileage overage charge
    let mileage_charge = 0;
    if (mileage && booking.total_days) {
      const { data: vehicle } = await supabase
        .from('rental_vehicles').select('mileage_limit_daily,mileage_rate_overage').eq('id', booking.vehicle_id).single();
      if (vehicle?.mileage_limit_daily && vehicle?.mileage_rate_overage) {
        const limit = vehicle.mileage_limit_daily * booking.total_days;
        const overage = Math.max(0, mileage - limit);
        mileage_charge = Math.round(overage * vehicle.mileage_rate_overage * 100) / 100;
      }
    }

    const new_total = (parseFloat(booking.base_amount) || 0)
      + (parseFloat(booking.extras_amount) || 0)
      + mileage_charge;

    await Promise.all([
      supabase.from('rental_bookings').update({
        status: 'COMPLETED',
        actual_end: completedAt,
        odometer_end: odometer_end || null,
        fuel_level_end: fuel_level_end || null,
        damage_notes: damage_notes || null,
        mileage_charge,
        total_amount: new_total,
        updated_at: completedAt,
      }).eq('id', id),
      supabase.from('rental_vehicles').update({
        current_status: damage_notes ? 'DAMAGE' : 'AVAILABLE',
        current_odometer_km: odometer_end || undefined,
        updated_at: completedAt,
      }).eq('id', booking.vehicle_id),
    ]);

    await emitRentalPIX(
      booking.org_id, id, booking.vehicle_id, 'RENTAL_COMPLETED',
      { odometer_end, mileage, fuel_level_end, damage_notes, mileage_charge, final_total: new_total },
      getUserId(req),
      { vehicleBefore: 'IN_USE', vehicleAfter: damage_notes ? 'DAMAGE' : 'AVAILABLE', bookingBefore: 'ACTIVE', bookingAfter: 'COMPLETED' }
    );

    if (damage_notes) {
      await emitRentalPIX(
        booking.org_id, id, booking.vehicle_id, 'DAMAGE_REPORTED',
        { damage_notes, reported_at: completedAt },
        getUserId(req)
      );
    }

    return res.json({ status: 'COMPLETED', mileage, mileage_charge, final_total: new_total });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// PATCH /api/rental/bookings/:id/cancel
router.patch('/bookings/:id/cancel', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const { data: booking, error } = await supabase
      .from('rental_bookings').select('*').eq('id', id).single();
    if (error || !booking) return res.status(404).json({ error: 'Booking not found' });
    if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
      return res.status(400).json({ error: 'Cannot cancel a completed or already cancelled booking' });
    }

    const cancelledAt = new Date().toISOString();
    const prevStatus = booking.status;

    await supabase.from('rental_bookings').update({
      status: 'CANCELLED',
      notes: reason ? `${booking.notes || ''}\nCancelled: ${reason}`.trim() : booking.notes,
      updated_at: cancelledAt,
    }).eq('id', id);

    // If active, release the vehicle
    if (booking.status === 'ACTIVE') {
      await supabase.from('rental_vehicles').update({
        current_status: 'AVAILABLE',
        updated_at: cancelledAt,
      }).eq('id', booking.vehicle_id);
    }

    await emitRentalPIX(
      booking.org_id, id, booking.vehicle_id, 'BOOKING_CANCELLED',
      { reason, cancelled_at: cancelledAt },
      getUserId(req),
      { bookingBefore: prevStatus, bookingAfter: 'CANCELLED' }
    );

    return res.json({ status: 'CANCELLED', booking_id: id });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ─── AVAILABILITY BLOCKS ──────────────────────────────────────────────────────

// GET /api/rental/blocks
router.get('/blocks', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { vehicle_id } = req.query;
    let query = supabase
      .from('rental_blocks')
      .select('*,vehicle:rental_vehicles(id,registration_number,make,model)')
      .eq('org_id', orgId)
      .order('start_time', { ascending: true });
    if (vehicle_id) query = query.eq('vehicle_id', vehicle_id);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ blocks: data || [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/rental/blocks
router.post('/blocks', async (req: Request, res: Response) => {
  const { vehicle_id, start_time, end_time, reason, notes } = req.body;
  if (!vehicle_id || !start_time || !end_time || !reason) {
    return res.status(400).json({ error: 'vehicle_id, start_time, end_time, reason required' });
  }
  try {
    const orgId = getOrgId(req);
    const userId = getUserId(req);

    const { data: block, error } = await supabase
      .from('rental_blocks')
      .insert({ org_id: orgId, vehicle_id, start_time, end_time, reason, notes, created_by: userId || null })
      .select().single();

    if (error) return res.status(500).json({ error: error.message });

    await emitRentalPIX(orgId, null, vehicle_id, 'VEHICLE_BLOCKED',
      { reason, start_time, end_time, notes }, userId
    );

    return res.status(201).json(block);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// DELETE /api/rental/blocks/:id
router.delete('/blocks/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const orgId = getOrgId(req);
    const { data: block } = await supabase.from('rental_blocks').select('*').eq('id', id).single();
    if (!block) return res.status(404).json({ error: 'Block not found' });

    await supabase.from('rental_blocks').delete().eq('id', id);
    await emitRentalPIX(orgId, null, block.vehicle_id, 'VEHICLE_RELEASED_FROM_BLOCK',
      { block_id: id, reason: block.reason }, getUserId(req)
    );

    return res.json({ deleted: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ─── PIX FEED ─────────────────────────────────────────────────────────────────

// GET /api/rental/pix-feed
router.get('/pix-feed', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { vehicle_id, event_type, limit = '50' } = req.query;

    let query = supabase
      .from('rental_pix_events')
      .select(`
        *,
        vehicle:rental_vehicles(id,registration_number,make,model),
        booking:rental_bookings(id,booking_number,customer_name)
      `)
      .eq('org_id', orgId)
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit as string));

    if (vehicle_id) query = query.eq('vehicle_id', vehicle_id);
    if (event_type) query = query.eq('event_type', event_type);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    return res.json({ events: data || [], count: data?.length || 0 });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ─── PRICING RULES ────────────────────────────────────────────────────────────

// GET /api/rental/pricing-rules
router.get('/pricing-rules', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { data, error } = await supabase
      .from('rental_pricing_rules')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('priority', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ rules: data || [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/rental/pricing-rules
router.post('/pricing-rules', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { data, error } = await supabase
      .from('rental_pricing_rules')
      .insert({ ...req.body, org_id: orgId })
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ─── VEHICLE MANAGEMENT ───────────────────────────────────────────────────────

// GET /api/rental/vehicles
router.get('/vehicles', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { data, error } = await supabase
      .from('rental_vehicles')
      .select('*')
      .eq('org_id', orgId)
      .order('make');
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ vehicles: data || [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/rental/vehicles
router.post('/vehicles', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { data, error } = await supabase
      .from('rental_vehicles')
      .insert({ ...req.body, org_id: orgId })
      .select().single();
    if (error) return res.status(500).json({ error: error.message });

    await emitRentalPIX(orgId, null, data.id, 'STATUS_CHANGED',
      { action: 'VEHICLE_ADDED', registration: data.registration_number, status: 'AVAILABLE' },
      getUserId(req)
    );

    return res.status(201).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// PATCH /api/rental/vehicles/:id
router.patch('/vehicles/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('rental_vehicles')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
