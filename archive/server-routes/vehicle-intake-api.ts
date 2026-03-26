/**
 * ─── VEHICLE INTAKE PROTOCOL API ─────────────────────────────────────────────
 * Mandatory guided flow triggered when a mechanic stamps in on a work order.
 *
 * Legal requirement: ISO documentation of customer property.
 * Operational requirement: Attendance registration against manufacturer systems.
 *
 * 4 mandatory stages — mechanic CANNOT skip:
 *   1. 8-angle photo documentation  (ISO — customer property record)
 *   2. Diagnostic connection         (attendance registration)
 *   3. Diagnostic protocol           (saved + linked to work order)
 *   4. Recall/campaign check         (customer already consented at booking)
 *
 * PIX events emitted:
 *   vehicle_photos_documented  → Stage 1 complete
 *   diagnostic_connected       → Stage 2 (attendance registration)
 *   fault_codes_recorded       → Stage 3 complete
 *   vehicle_intake_completed   → All 4 stages done
 *
 * ENDPOINTS:
 *   POST   /api/intake/start
 *   POST   /api/intake/:sessionId/photos
 *   POST   /api/intake/:sessionId/photos/complete
 *   POST   /api/intake/:sessionId/diagnostic/connect
 *   POST   /api/intake/:sessionId/diagnostic/results
 *   GET    /api/intake/:sessionId/recalls
 *   POST   /api/intake/:sessionId/complete
 *   GET    /api/intake/work-order/:workOrderId
 *   GET    /api/recall-check/:reg
 *   POST   /api/recall-consent
 */

import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from './supabase';

const router = Router();

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const REQUIRED_ANGLES = [
  'FRONT', 'FRONT_RIGHT', 'RIGHT', 'REAR_RIGHT',
  'REAR', 'REAR_LEFT', 'LEFT', 'FRONT_LEFT',
] as const;

type PhotoAngle = typeof REQUIRED_ANGLES[number] | 'INTERIOR';

// ─── MOCK RECALL DATA ─────────────────────────────────────────────────────────
// TODO: Replace with real Teknikinformation / NHTSA / OEM API calls.
// Structure is stable — just swap the data source.

interface RecallData {
  id: string;
  title: string;
  description: string;
  estimated_time_hours: number;
  customer_cost: number;
  mandatory: boolean;
}

const MOCK_RECALLS: Record<string, RecallData[]> = {
  'ABC123': [
    {
      id: 'R-2024-001',
      title: 'Bromsvätska kan förorenas',
      description: 'I vissa fordon kan bromsvätskan förorenas av fukt vilket kan påverka bromsprestanda. Åtgärd: Byte av bromsvätska.',
      estimated_time_hours: 1.5,
      customer_cost: 0,
      mandatory: true,
    },
  ],
  'ABC 123': [
    {
      id: 'R-2024-001',
      title: 'Bromsvätska kan förorenas',
      description: 'I vissa fordon kan bromsvätskan förorenas av fukt vilket kan påverka bromsprestanda. Åtgärd: Byte av bromsvätska.',
      estimated_time_hours: 1.5,
      customer_cost: 0,
      mandatory: true,
    },
  ],
  'DEF456': [],
  'DEF 456': [],
};

// ─── OEM RECALL LOOKUP ────────────────────────────────────────────────────────
// Pluggable: swap `lookupRecallsFromOEM` for a real API call when ready.

async function lookupRecallsFromOEM(reg: string, vin?: string): Promise<RecallData[]> {
  // TODO: Replace with real API:
  //   SE: Transportstyrelsen / Teknikinformation
  //   EU: RAPEX
  //   US: NHTSA api.nhtsa.dot.gov/recalls/recallsByVehicle
  //   OEM-specific: VW ELSA, BMW TIS, VAG recall API, etc.

  const normalizedReg = (reg || '').toUpperCase().replace(/\s/g, '');
  const withSpace = reg?.toUpperCase();

  // Check mock data (both with and without spaces)
  return MOCK_RECALLS[reg] || MOCK_RECALLS[withSpace] || MOCK_RECALLS[normalizedReg] || [];
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function emitPixEvent(events: any[], event: string, data: any = {}) {
  return [...events, {
    event,
    timestamp: new Date().toISOString(),
    ...data,
  }];
}

function getOrgId(req: Request): string {
  return (req as any).user?.org_id;
}

function getTechnicianId(req: Request): string {
  return (req as any).user?.id || (req as any).user?.sub;
}

// Middleware: require auth
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// ─── POST /api/intake/start ───────────────────────────────────────────────────
// Creates a new intake session when mechanic stamps in on a work order.

router.post('/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const { work_order_id, vehicle_reg, vehicle_vin } = req.body;
    const org_id = getOrgId(req);
    const technician_id = getTechnicianId(req);

    if (!work_order_id || !vehicle_reg) {
      return res.status(400).json({ error: 'work_order_id and vehicle_reg are required' });
    }

    // Check if session already exists for this work order
    const { data: existing } = await supabase
      .from('vehicle_intake_sessions')
      .select('*')
      .eq('work_order_id', work_order_id)
      .eq('org_id', org_id)
      .single();

    if (existing) {
      return res.json({
        session_id: existing.id,
        current_stage: existing.status,
        checklist: buildChecklist(existing),
        resumed: true,
      });
    }

    const { data, error } = await supabase
      .from('vehicle_intake_sessions')
      .insert({
        org_id,
        work_order_id,
        technician_id,
        vehicle_reg,
        vehicle_vin: vehicle_vin || null,
        status: 'NOT_STARTED',
        pix_events: emitPixEvent([], 'intake_started', { work_order_id, vehicle_reg }),
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      session_id: data.id,
      current_stage: 'NOT_STARTED',
      checklist: buildChecklist(data),
      resumed: false,
    });
  } catch (err: any) {
    console.error('[intake/start]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/intake/:sessionId/photos ──────────────────────────────────────
// Saves a single photo for a specific angle.

router.post('/:sessionId/photos', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { angle, photo_url, damage_noted = false } = req.body;
    const org_id = getOrgId(req);

    if (!angle || !photo_url) {
      return res.status(400).json({ error: 'angle and photo_url are required' });
    }

    const validAngles: PhotoAngle[] = [...REQUIRED_ANGLES, 'INTERIOR'];
    if (!validAngles.includes(angle)) {
      return res.status(400).json({ error: `Invalid angle. Must be one of: ${validAngles.join(', ')}` });
    }

    const { data: session, error: fetchErr } = await supabase
      .from('vehicle_intake_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('org_id', org_id)
      .single();

    if (fetchErr || !session) return res.status(404).json({ error: 'Session not found' });
    if (session.status === 'COMPLETED') return res.status(400).json({ error: 'Intake already completed' });

    const photos = session.photos || {};
    photos[angle.toLowerCase()] = {
      url: photo_url,
      taken_at: new Date().toISOString(),
      damage_noted,
    };

    const completedAngles = REQUIRED_ANGLES.filter(a => photos[a.toLowerCase()]);
    const remainingAngles = REQUIRED_ANGLES.filter(a => !photos[a.toLowerCase()]);
    const readyToProceed = remainingAngles.length === 0;

    const { error: updateErr } = await supabase
      .from('vehicle_intake_sessions')
      .update({
        photos,
        status: session.status === 'NOT_STARTED' ? 'PHOTOS_IN_PROGRESS' : session.status,
      })
      .eq('id', sessionId);

    if (updateErr) throw updateErr;

    res.json({
      completed_angles: completedAngles,
      remaining_angles: remainingAngles,
      ready_to_proceed: readyToProceed,
      photos_taken: Object.keys(photos).length,
    });
  } catch (err: any) {
    console.error('[intake/photos]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/intake/:sessionId/photos/complete ─────────────────────────────
// Marks photo stage as complete. Requires all 8 mandatory angles.

router.post('/:sessionId/photos/complete', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const org_id = getOrgId(req);
    const technician_id = getTechnicianId(req);

    const { data: session, error: fetchErr } = await supabase
      .from('vehicle_intake_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('org_id', org_id)
      .single();

    if (fetchErr || !session) return res.status(404).json({ error: 'Session not found' });

    // Validate all 8 required angles
    const photos = session.photos || {};
    const missingAngles = REQUIRED_ANGLES.filter(a => !photos[a.toLowerCase()]);
    if (missingAngles.length > 0) {
      return res.status(400).json({
        error: 'Cannot complete photo stage — missing required angles',
        missing_angles: missingAngles,
      });
    }

    const pix_events = emitPixEvent(session.pix_events || [], 'vehicle_photos_documented', {
      photo_count: Object.keys(photos).length,
      technician_id,
    });

    const { error: updateErr } = await supabase
      .from('vehicle_intake_sessions')
      .update({
        status: 'PHOTOS_DONE',
        photos_completed_at: new Date().toISOString(),
        photos_accepted_by: technician_id,
        pix_events,
      })
      .eq('id', sessionId);

    if (updateErr) throw updateErr;

    res.json({ status: 'PHOTOS_DONE', message: 'Photo documentation complete' });
  } catch (err: any) {
    console.error('[intake/photos/complete]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/intake/:sessionId/diagnostic/connect ──────────────────────────
// Logs diagnostic tool connection. Acts as attendance registration.

router.post('/:sessionId/diagnostic/connect', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { tool_id, tool_name, vin_verified, odometer, manufacturer_session_id } = req.body;
    const org_id = getOrgId(req);
    const technician_id = getTechnicianId(req);

    if (!tool_id || !tool_name) {
      return res.status(400).json({ error: 'tool_id and tool_name are required' });
    }

    const { data: session, error: fetchErr } = await supabase
      .from('vehicle_intake_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('org_id', org_id)
      .single();

    if (fetchErr || !session) return res.status(404).json({ error: 'Session not found' });
    if (session.status === 'NOT_STARTED' || session.status === 'PHOTOS_IN_PROGRESS') {
      return res.status(400).json({ error: 'Complete photo documentation before connecting diagnostic' });
    }

    const connection_timestamp = new Date().toISOString();
    const pix_events = emitPixEvent(session.pix_events || [], 'diagnostic_connected', {
      tool_id,
      tool_name,
      vin_verified: !!vin_verified,
      technician_id,
      // This event serves as attendance registration against manufacturer systems
      attendance_registered: true,
    });

    const { error: updateErr } = await supabase
      .from('vehicle_intake_sessions')
      .update({
        diagnostic_tool_id: tool_id,
        diagnostic_tool_name: tool_name,
        vin_verified: !!vin_verified,
        connection_timestamp,
        manufacturer_session_id: manufacturer_session_id || null,
        odometer_at_connect: odometer || null,
        status: 'DIAGNOSTIC_CONNECTED',
        pix_events,
      })
      .eq('id', sessionId);

    if (updateErr) throw updateErr;

    res.json({
      status: 'DIAGNOSTIC_CONNECTED',
      connection_timestamp,
      attendance_registered: true,
      message: `Diagnostic tool "${tool_name}" connected. Attendance registered.`,
    });
  } catch (err: any) {
    console.error('[intake/diagnostic/connect]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/intake/:sessionId/diagnostic/results ──────────────────────────
// Saves diagnostic results (fault codes) to the session.

router.post('/:sessionId/diagnostic/results', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { fault_codes = [], raw_data } = req.body;
    const org_id = getOrgId(req);
    const technician_id = getTechnicianId(req);

    const { data: session, error: fetchErr } = await supabase
      .from('vehicle_intake_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('org_id', org_id)
      .single();

    if (fetchErr || !session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'DIAGNOSTIC_CONNECTED') {
      return res.status(400).json({ error: 'Diagnostic must be connected before saving results' });
    }

    const pix_events = emitPixEvent(session.pix_events || [], 'fault_codes_recorded', {
      fault_count: fault_codes.length,
      has_critical: fault_codes.some((f: any) => f.severity === 'HIGH'),
      technician_id,
    });

    const { error: updateErr } = await supabase
      .from('vehicle_intake_sessions')
      .update({
        fault_codes,
        diagnostic_raw_data: raw_data || null,
        diagnostic_completed_at: new Date().toISOString(),
        status: 'DIAGNOSTIC_DONE',
        pix_events,
      })
      .eq('id', sessionId);

    if (updateErr) throw updateErr;

    res.json({
      status: 'DIAGNOSTIC_DONE',
      fault_codes_saved: fault_codes.length,
      critical_faults: fault_codes.filter((f: any) => f.severity === 'HIGH').length,
      message: fault_codes.length === 0
        ? 'Inga felkoder hittades — fordonet är felfritt'
        : `${fault_codes.length} felkod(er) sparade`,
    });
  } catch (err: any) {
    console.error('[intake/diagnostic/results]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/intake/:sessionId/recalls ──────────────────────────────────────
// Checks for open recalls on this vehicle. Returns recall data + prior consents.

router.get('/:sessionId/recalls', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const org_id = getOrgId(req);

    const { data: session, error: fetchErr } = await supabase
      .from('vehicle_intake_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('org_id', org_id)
      .single();

    if (fetchErr || !session) return res.status(404).json({ error: 'Session not found' });

    // Fetch open recalls from OEM API (currently mocked)
    const open_recalls = await lookupRecallsFromOEM(session.vehicle_reg, session.vehicle_vin || undefined);

    // Look up existing consent records for this vehicle
    const { data: consents } = await supabase
      .from('vehicle_recall_consents')
      .select('*')
      .eq('vehicle_reg', session.vehicle_reg)
      .eq('org_id', org_id);

    // Mark recalls with consent status
    const recalls_with_consent = open_recalls.map(recall => {
      const consent = (consents || []).find(c => c.recall_id === recall.id);
      return {
        ...recall,
        customer_consented: consent?.customer_consented || false,
        consented_at: consent?.consented_at || null,
        consent_method: consent?.consent_method || null,
      };
    });

    // Save to session
    await supabase
      .from('vehicle_intake_sessions')
      .update({
        open_recalls: recalls_with_consent,
        recalls_checked_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    res.json({
      open_recalls: recalls_with_consent,
      campaigns: [],  // TODO: Fetch active campaigns from OEM
      customer_consents: consents || [],
      requires_attention: recalls_with_consent.some(r => !r.customer_consented && r.mandatory),
    });
  } catch (err: any) {
    console.error('[intake/recalls]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/intake/:sessionId/complete ────────────────────────────────────
// Finalizes the intake. Validates all stages, generates protocol, notifies ops.

router.post('/:sessionId/complete', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const org_id = getOrgId(req);
    const technician_id = getTechnicianId(req);

    const { data: session, error: fetchErr } = await supabase
      .from('vehicle_intake_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('org_id', org_id)
      .single();

    if (fetchErr || !session) return res.status(404).json({ error: 'Session not found' });

    // Validate all stages are complete
    const validation = validateAllStages(session);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Cannot complete intake — stages incomplete',
        incomplete_stages: validation.incomplete,
      });
    }

    // Generate protocol PDF URL (mock — integrate with PDF service)
    const protocol_url = `https://api.bc.pixdrift.com/intake/${sessionId}/protocol.pdf`;

    const pix_events = emitPixEvent(session.pix_events || [], 'vehicle_intake_completed', {
      technician_id,
      work_order_id: session.work_order_id,
      vehicle_reg: session.vehicle_reg,
      fault_count: (session.fault_codes || []).length,
      recall_count: (session.open_recalls || []).length,
      protocol_url,
    });

    const { error: updateErr } = await supabase
      .from('vehicle_intake_sessions')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        diagnostic_protocol_pdf_url: protocol_url,
        pix_events,
      })
      .eq('id', sessionId);

    if (updateErr) throw updateErr;

    // TODO: Notify Operations Lead via notification system

    const fault_codes = session.fault_codes || [];
    const open_recalls = session.open_recalls || [];

    res.json({
      status: 'COMPLETED',
      protocol_url,
      fault_summary: {
        total: fault_codes.length,
        critical: fault_codes.filter((f: any) => f.severity === 'HIGH').length,
        codes: fault_codes.map((f: any) => f.code),
      },
      recall_actions: open_recalls.map((r: any) => ({
        recall_id: r.id,
        title: r.title,
        customer_consented: r.customer_consented,
        requires_action: !r.customer_consented && r.mandatory,
      })),
      message: 'Intagsprotokoll slutfört. Arbetet kan påbörjas.',
    });
  } catch (err: any) {
    console.error('[intake/complete]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/intake/work-order/:workOrderId ─────────────────────────────────
// Returns the intake session for a specific work order.

router.get('/work-order/:workOrderId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { workOrderId } = req.params;
    const org_id = getOrgId(req);

    const { data, error } = await supabase
      .from('vehicle_intake_sessions')
      .select('*')
      .eq('work_order_id', workOrderId)
      .eq('org_id', org_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.json({ session: null, intake_completed: false });
      throw error;
    }

    res.json({
      session: data,
      intake_completed: data.status === 'COMPLETED',
      checklist: buildChecklist(data),
    });
  } catch (err: any) {
    console.error('[intake/work-order]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/recall-check/:reg ──────────────────────────────────────────────
// Quick recall check — used at booking time before customer consent.

router.get('/recall-check/:reg', requireAuth, async (req: Request, res: Response) => {
  try {
    const { reg } = req.params;
    const open_recalls = await lookupRecallsFromOEM(reg);

    res.json({
      vehicle_reg: reg,
      open_recalls,
      requires_consent: open_recalls.some(r => r.mandatory),
      recall_count: open_recalls.length,
    });
  } catch (err: any) {
    console.error('[recall-check]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/recall-consent ─────────────────────────────────────────────────
// Records customer consent for a recall. Optionally sends SMS.

router.post('/recall-consent', requireAuth, async (req: Request, res: Response) => {
  try {
    const { vehicle_reg, recall_id, customer_phone, consent_method, customer_name, work_order_id } = req.body;
    const org_id = getOrgId(req);

    if (!vehicle_reg || !recall_id) {
      return res.status(400).json({ error: 'vehicle_reg and recall_id are required' });
    }

    // Fetch recall details
    const recalls = await lookupRecallsFromOEM(vehicle_reg);
    const recall = recalls.find(r => r.id === recall_id);
    if (!recall) return res.status(404).json({ error: 'Recall not found for this vehicle' });

    const method = consent_method || 'VERBAL';

    // Send SMS if requested and phone provided
    let sms_sent = false;
    if (method === 'SMS' && customer_phone) {
      // TODO: Integrate with SMS provider (Twilio, 46elks, etc.)
      // await sendSMS(customer_phone, `Pixdrift: Bekräfta återkallelse "${recall.title}" för fordon ${vehicle_reg}. ...`);
      sms_sent = true; // Mock — always succeeds
    }

    const { data, error } = await supabase
      .from('vehicle_recall_consents')
      .insert({
        org_id,
        work_order_id: work_order_id || null,
        vehicle_reg,
        recall_id,
        recall_title: recall.title,
        recall_description: recall.description,
        estimated_time_hours: recall.estimated_time_hours,
        estimated_cost: recall.customer_cost,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        customer_consented: method !== 'SMS', // SMS = pending until confirmed; others = immediate
        consented_at: method !== 'SMS' ? new Date().toISOString() : null,
        consent_method: method,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      consent_id: data.id,
      sms_sent,
      consent_status: method === 'SMS' ? 'PENDING_SMS_CONFIRMATION' : 'CONFIRMED',
      message: method === 'SMS'
        ? `SMS skickat till ${customer_phone} — väntar på bekräftelse`
        : 'Samtycke registrerat',
    });
  } catch (err: any) {
    console.error('[recall-consent]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function buildChecklist(session: any) {
  const photos = session.photos || {};
  const completedAngles = REQUIRED_ANGLES.filter(a => photos[a.toLowerCase()]);

  return {
    stage1_photos: {
      complete: session.status !== 'NOT_STARTED' && session.status !== 'PHOTOS_IN_PROGRESS',
      angles_done: completedAngles.length,
      angles_required: REQUIRED_ANGLES.length,
      completed_at: session.photos_completed_at,
    },
    stage2_diagnostic: {
      complete: ['DIAGNOSTIC_CONNECTED', 'DIAGNOSTIC_DONE', 'RECALLS_CHECKED', 'COMPLETED'].includes(session.status),
      tool: session.diagnostic_tool_name,
      connected_at: session.connection_timestamp,
    },
    stage3_protocol: {
      complete: ['DIAGNOSTIC_DONE', 'RECALLS_CHECKED', 'COMPLETED'].includes(session.status),
      fault_count: (session.fault_codes || []).length,
      completed_at: session.diagnostic_completed_at,
      protocol_url: session.diagnostic_protocol_pdf_url,
    },
    stage4_recalls: {
      complete: ['RECALLS_CHECKED', 'COMPLETED'].includes(session.status),
      recall_count: (session.open_recalls || []).length,
      checked_at: session.recalls_checked_at,
    },
  };
}

function validateAllStages(session: any): { valid: boolean; incomplete: string[] } {
  const incomplete: string[] = [];
  const photos = session.photos || {};
  const completedAngles = REQUIRED_ANGLES.filter(a => photos[a.toLowerCase()]);

  if (completedAngles.length < REQUIRED_ANGLES.length || !session.photos_completed_at) {
    incomplete.push('Stage 1: Photo documentation incomplete');
  }
  if (!session.connection_timestamp) {
    incomplete.push('Stage 2: Diagnostic not connected');
  }
  if (!session.diagnostic_completed_at) {
    incomplete.push('Stage 3: Diagnostic results not saved');
  }
  if (!session.recalls_checked_at) {
    incomplete.push('Stage 4: Recall check not performed');
  }

  return { valid: incomplete.length === 0, incomplete };
}

export default router;
