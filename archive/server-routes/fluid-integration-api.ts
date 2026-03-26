/**
 * Fluid Integration API — Alantec, Orion, and generic fluid management systems
 *
 * Alantec systems (FDS-2000/3000/4000 series):
 *   - REST API with bearer token auth (newer firmware ≥ 3.x)
 *   - Modbus TCP for legacy models
 *   - Webhook: POST JSON to configured callback URL on each dispense
 *   - Fields: event_id, dispenser_id, product_code, product_name,
 *             quantity_ml, operator_id, vehicle_reg, timestamp, location
 *
 * Orion / Tecalemit / Samoa systems:
 *   - REST or XML-RPC depending on model
 *   - Orion Pro: JSON REST, bearer auth
 *   - Older Samoa units: XML-RPC with basic auth
 *   - Fields: dispense_id, product_code, quantity_ml, operator_id, timestamp
 *
 * BAS-konto mapping (Swedish chart of accounts):
 *   4010 = Råvaror och förnödenheter (oils, fluids, consumables)
 *   4090 = Övriga material och förnödenheter
 */

import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { parseStringPromise } from "xml2js"; // for Orion XML-RPC
import crypto from "crypto";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Constants ────────────────────────────────────────────────────────────────

const FLUID_BAS_ACCOUNTS: Record<string, string> = {
  ENGINE_OIL:            "4010",
  TRANSMISSION_OIL:      "4010",
  BRAKE_FLUID:           "4010",
  COOLANT:               "4010",
  ADBLUE:                "4010",
  WINDSHIELD_WASHER:     "4010",
  POWER_STEERING_FLUID:  "4010",
  DIFFERENTIAL_OIL:      "4010",
  HYDRAULIC_OIL:         "4010",
  GEAR_OIL:              "4010",
  OTHER:                 "4090",
};

// Alantec product_code → fluid type mapping
const ALANTEC_PRODUCT_MAP: Record<string, string> = {
  "OIL-":   "ENGINE_OIL",
  "GEAR-":  "TRANSMISSION_OIL",
  "BRK-":   "BRAKE_FLUID",
  "CLT-":   "COOLANT",
  "ADB-":   "ADBLUE",
  "WSH-":   "WINDSHIELD_WASHER",
  "PSF-":   "POWER_STEERING_FLUID",
  "DIFF-":  "DIFFERENTIAL_OIL",
  "HYD-":   "HYDRAULIC_OIL",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapAlantecProductCode(code: string): string {
  for (const [prefix, fluidType] of Object.entries(ALANTEC_PRODUCT_MAP)) {
    if (code.toUpperCase().startsWith(prefix)) return fluidType;
  }
  return "OTHER";
}

function encryptApiKey(key: string): string {
  const algo = "aes-256-cbc";
  const secret = process.env.ENCRYPTION_KEY || "pixdrift-fluid-enc-key-32-chars!";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algo, Buffer.from(secret.slice(0, 32)), iv);
  return iv.toString("hex") + ":" + cipher.update(key, "utf8", "hex") + cipher.final("hex");
}

function decryptApiKey(encrypted: string): string {
  try {
    const [ivHex, data] = encrypted.split(":");
    const algo = "aes-256-cbc";
    const secret = process.env.ENCRYPTION_KEY || "pixdrift-fluid-enc-key-32-chars!";
    const decipher = crypto.createDecipheriv(algo, Buffer.from(secret.slice(0, 32)), Buffer.from(ivHex, "hex"));
    return decipher.update(data, "hex", "utf8") + decipher.final("utf8");
  } catch {
    return "";
  }
}

/**
 * Auto-match a dispense event to an open work order.
 * Strategy: find work order for this technician that started within 4 hours.
 */
async function matchWorkOrder(orgId: string, technicianId: string | null, vehicleReg: string | null): Promise<string | null> {
  if (!technicianId && !vehicleReg) return null;

  let query = supabase
    .from("work_orders")
    .select("id")
    .eq("org_id", orgId)
    .in("status", ["IN_PROGRESS", "BOOKED"])
    .order("started_at", { ascending: false })
    .limit(1);

  if (technicianId) {
    query = query.eq("assigned_technician_id", technicianId);
  } else if (vehicleReg) {
    query = query.ilike("vehicle_reg", vehicleReg);
  }

  // Only work orders started within last 4 hours
  const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  query = query.gte("started_at", cutoff);

  const { data } = await query;
  return data?.[0]?.id ?? null;
}

/**
 * Emits a PIX event on the work order for fluid booking.
 */
async function emitFluidPix(eventId: string, workOrderId: string, fluidName: string, quantityLiters: number, totalCost: number) {
  const pix = {
    type: "fluid_dispensed",
    entity_id: workOrderId,
    entity_type: "work_order",
    message: `${fluidName}: ${quantityLiters.toFixed(1)} L — €${totalCost.toFixed(2)} bokfört`,
    metadata: { event_id: eventId, fluid_name: fluidName, quantity_liters: quantityLiters, total_cost: totalCost },
    created_at: new Date().toISOString(),
  };

  await supabase
    .from("fluid_dispensing_events")
    .update({ pix_events: supabase.rpc as any })
    .eq("id", eventId);

  // Append to pix_events array
  const { data: ev } = await supabase
    .from("fluid_dispensing_events")
    .select("pix_events")
    .eq("id", eventId)
    .single();

  const existing = Array.isArray(ev?.pix_events) ? ev.pix_events : [];
  await supabase
    .from("fluid_dispensing_events")
    .update({ pix_events: [...existing, pix] })
    .eq("id", eventId);
}

/**
 * Core: process a normalised dispense event — match WO, book cost, emit PIX.
 */
async function processDispensingEvent(params: {
  orgId: string;
  integrationId: string;
  fluidType: string;
  fluidName: string;
  fluidGrade?: string;
  quantityLiters: number;
  unitPricePerLiter?: number;
  dispenserId: string;
  dispenserLocation?: string;
  operatorId?: string;
  vehicleReg?: string;
  dispensedAt: string;
}) {
  const totalCost = params.unitPricePerLiter
    ? params.quantityLiters * params.unitPricePerLiter
    : undefined;

  const basAccount = FLUID_BAS_ACCOUNTS[params.fluidType] ?? "4090";

  // Auto-match work order
  const workOrderId = await matchWorkOrder(params.orgId, params.operatorId ?? null, params.vehicleReg ?? null);

  const { data: inserted, error } = await supabase
    .from("fluid_dispensing_events")
    .insert({
      org_id: params.orgId,
      integration_id: params.integrationId,
      work_order_id: workOrderId,
      vehicle_reg: params.vehicleReg,
      technician_id: params.operatorId,
      fluid_type: params.fluidType,
      fluid_name: params.fluidName,
      fluid_grade: params.fluidGrade,
      quantity_liters: params.quantityLiters,
      unit_price_per_liter: params.unitPricePerLiter,
      total_cost: totalCost,
      dispenser_id: params.dispenserId,
      dispenser_location: params.dispenserLocation,
      bas_account: basAccount,
      booked_to_work_order: !!workOrderId,
      dispensed_at: params.dispensedAt,
    })
    .select()
    .single();

  if (error) throw error;

  // Emit PIX if linked to work order
  if (workOrderId && inserted) {
    await emitFluidPix(inserted.id, workOrderId, params.fluidName, params.quantityLiters, totalCost ?? 0);
  }

  return { event: inserted, workOrderId, booked: !!workOrderId };
}

// ─── Integration Management ───────────────────────────────────────────────────

// GET /api/fluid/integrations
router.get("/integrations", async (req: Request, res: Response) => {
  const orgId = (req as any).orgId;
  const { data, error } = await supabase
    .from("fluid_integrations")
    .select("id, provider, display_name, system_type, device_serial, location, sync_mode, polling_interval_mins, last_sync_at, is_active, created_at")
    .eq("org_id", orgId)
    .order("created_at");

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/fluid/integrations
router.post("/integrations", async (req: Request, res: Response) => {
  const orgId = (req as any).orgId;
  const { provider, display_name, api_endpoint, api_key, device_serial, location, sync_mode, polling_interval_mins } = req.body;

  const { data, error } = await supabase
    .from("fluid_integrations")
    .insert({
      org_id: orgId,
      provider,
      display_name,
      api_endpoint,
      api_key_encrypted: api_key ? encryptApiKey(api_key) : null,
      device_serial,
      location,
      sync_mode: sync_mode ?? "WEBHOOK",
      polling_interval_mins: polling_interval_mins ?? 5,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /api/fluid/integrations/:id
router.delete("/integrations/:id", async (req: Request, res: Response) => {
  const orgId = (req as any).orgId;
  const { error } = await supabase
    .from("fluid_integrations")
    .update({ is_active: false })
    .eq("id", req.params.id)
    .eq("org_id", orgId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// POST /api/fluid/integrations/:id/test
router.post("/integrations/:id/test", async (req: Request, res: Response) => {
  const orgId = (req as any).orgId;
  const { data: integration } = await supabase
    .from("fluid_integrations")
    .select("*")
    .eq("id", req.params.id)
    .eq("org_id", orgId)
    .single();

  if (!integration) return res.status(404).json({ error: "Integration not found" });

  if (!integration.api_endpoint) {
    return res.json({ ok: true, mode: "WEBHOOK", message: "Webhook mode — no ping needed. Waiting for incoming events." });
  }

  try {
    const apiKey = integration.api_key_encrypted ? decryptApiKey(integration.api_key_encrypted) : "";
    const response = await fetch(`${integration.api_endpoint}/api/v1/status`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    const ok = response.ok;
    if (ok) {
      await supabase.from("fluid_integrations").update({ last_sync_at: new Date().toISOString() }).eq("id", req.params.id);
    }
    res.json({ ok, status: response.status });
  } catch (e: any) {
    res.json({ ok: false, error: e.message });
  }
});

// ─── Webhooks ─────────────────────────────────────────────────────────────────

/**
 * POST /api/fluid/webhook/alantec
 * Alantec FDS series — JSON body from firmware webhook config.
 * Alantec webhook payload (FDS-3000 / FDS-4000 firmware ≥ 3.2):
 * {
 *   event_id: "ALA-2026-001234",
 *   dispenser_id: "DISP-01",
 *   product_code: "OIL-5W30-CASTROL",
 *   product_name: "Castrol Edge 5W-30",
 *   quantity_ml: 4500,
 *   operator_id: "TECH-001",        // operator badge/RFID ID
 *   vehicle_reg: "ABC 123",          // optional, from workshop system link
 *   timestamp: "2026-03-22T10:23:00Z",
 *   location: "Lift 2",
 *   unit_price: 10.00,               // optional, configured in dispenser
 * }
 */
router.post("/webhook/alantec", async (req: Request, res: Response) => {
  const { org_id, event_id, dispenser_id, product_code, product_name, quantity_ml, operator_id, vehicle_reg, timestamp, location, unit_price } = req.body;

  if (!org_id || !quantity_ml) return res.status(400).json({ error: "Missing required fields" });

  // Find integration
  const { data: integration } = await supabase
    .from("fluid_integrations")
    .select("id")
    .eq("org_id", org_id)
    .eq("provider", "ALANTEC")
    .eq("is_active", true)
    .single();

  const fluidType = mapAlantecProductCode(product_code ?? "");

  try {
    const result = await processDispensingEvent({
      orgId: org_id,
      integrationId: integration?.id ?? "",
      fluidType,
      fluidName: product_name ?? product_code ?? "Okänd vätska",
      quantityLiters: quantity_ml / 1000,
      unitPricePerLiter: unit_price,
      dispenserId: dispenser_id ?? "unknown",
      dispenserLocation: location,
      operatorId: operator_id,
      vehicleReg: vehicle_reg,
      dispensedAt: timestamp ?? new Date().toISOString(),
    });

    // Update last_sync_at
    if (integration?.id) {
      await supabase.from("fluid_integrations").update({ last_sync_at: new Date().toISOString() }).eq("id", integration.id);
    }

    res.json({ ok: true, event_id, ...result });
  } catch (e: any) {
    console.error("[fluid/alantec]", e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/fluid/webhook/orion
 * Orion / Tecalemit / Samoa systems.
 * Supports both JSON (Orion Pro) and XML-RPC (legacy Samoa).
 *
 * JSON payload (Orion Pro):
 * {
 *   "DispenseID": "ORN-20260322-001",
 *   "ProductCode": "5W30-SHELL",
 *   "ProductName": "Shell Helix Ultra 5W-30",
 *   "QuantityML": 4200,
 *   "OperatorBadge": "B-042",
 *   "Timestamp": "2026-03-22T10:47:00+01:00",
 *   "UnitName": "DISP-ORION-01"
 * }
 *
 * XML-RPC payload (legacy, Content-Type: text/xml):
 * <methodCall><methodName>fluid.dispense</methodName>
 *   <params>
 *     <param><value><struct>
 *       <member><name>dispense_id</name><value><string>ORN-001</string></value></member>
 *       <member><name>product_code</name><value><string>BRK-DOT4</string></value></member>
 *       <member><name>quantity_ml</name><value><int>500</int></value></member>
 *       <member><name>operator_id</name><value><string>TECH-002</string></value></member>
 *       <member><name>timestamp</name><value><string>2026-03-22T09:47:00Z</string></value></member>
 *     </struct></value></param>
 *   </params>
 * </methodCall>
 */
router.post("/webhook/orion", async (req: Request, res: Response) => {
  const orgId = req.query.org_id as string || req.body?.org_id;
  if (!orgId) return res.status(400).json({ error: "org_id required as query param or body field" });

  let payload: Record<string, any> = {};
  const contentType = req.headers["content-type"] ?? "";

  if (contentType.includes("text/xml") || contentType.includes("application/xml")) {
    // Parse XML-RPC
    try {
      const parsed = await parseStringPromise(req.body.toString(), { explicitArray: false });
      const members = parsed?.methodCall?.params?.param?.value?.struct?.member ?? [];
      for (const m of Array.isArray(members) ? members : [members]) {
        const val = m.value;
        payload[m.name] = val?.string ?? val?.int ?? val?.double ?? Object.values(val ?? {})[0] ?? "";
      }
    } catch {
      return res.status(400).json({ error: "Invalid XML-RPC payload" });
    }
  } else {
    // JSON
    payload = req.body;
  }

  // Normalise Orion field names (mix of camelCase and snake_case)
  const dispenserId  = payload.UnitName     ?? payload.dispenser_id ?? "ORION-01";
  const productCode  = payload.ProductCode  ?? payload.product_code ?? "";
  const productName  = payload.ProductName  ?? payload.product_name ?? productCode;
  const quantityMl   = Number(payload.QuantityML ?? payload.quantity_ml ?? 0);
  const operatorId   = payload.OperatorBadge ?? payload.operator_id;
  const timestamp    = payload.Timestamp    ?? payload.timestamp ?? new Date().toISOString();
  const vehicleReg   = payload.VehicleReg   ?? payload.vehicle_reg;
  const unitPrice    = payload.UnitPrice    ?? payload.unit_price;

  if (!quantityMl) return res.status(400).json({ error: "quantity_ml required" });

  const { data: integration } = await supabase
    .from("fluid_integrations")
    .select("id")
    .eq("org_id", orgId)
    .eq("provider", "ORION")
    .eq("is_active", true)
    .single();

  const fluidType = mapAlantecProductCode(productCode); // same prefix logic

  try {
    const result = await processDispensingEvent({
      orgId,
      integrationId: integration?.id ?? "",
      fluidType,
      fluidName: productName,
      quantityLiters: quantityMl / 1000,
      unitPricePerLiter: unitPrice ? Number(unitPrice) : undefined,
      dispenserId,
      operatorId,
      vehicleReg,
      dispensedAt: timestamp,
    });

    if (integration?.id) {
      await supabase.from("fluid_integrations").update({ last_sync_at: new Date().toISOString() }).eq("id", integration.id);
    }

    res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("[fluid/orion]", e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/fluid/webhook/generic
 * Generic webhook — any compatible fluid management system.
 * Body: { org_id, fluid_type, quantity_liters, dispenser_id, fluid_name?, operator_id?, vehicle_reg?, timestamp?, unit_price? }
 */
router.post("/webhook/generic", async (req: Request, res: Response) => {
  const { org_id, fluid_type, quantity_liters, dispenser_id, fluid_name, operator_id, vehicle_reg, timestamp, unit_price } = req.body;

  if (!org_id || !fluid_type || !quantity_liters) {
    return res.status(400).json({ error: "org_id, fluid_type, quantity_liters required" });
  }

  const validFluidTypes = ["ENGINE_OIL","TRANSMISSION_OIL","POWER_STEERING_FLUID","BRAKE_FLUID","COOLANT","WINDSHIELD_WASHER","ADBLUE","DIFFERENTIAL_OIL","HYDRAULIC_OIL","GEAR_OIL","OTHER"];
  if (!validFluidTypes.includes(fluid_type)) {
    return res.status(400).json({ error: `Invalid fluid_type. Valid: ${validFluidTypes.join(", ")}` });
  }

  try {
    const result = await processDispensingEvent({
      orgId: org_id,
      integrationId: "",
      fluidType: fluid_type,
      fluidName: fluid_name ?? fluid_type,
      quantityLiters: Number(quantity_liters),
      unitPricePerLiter: unit_price ? Number(unit_price) : undefined,
      dispenserId: dispenser_id ?? "generic",
      operatorId: operator_id,
      vehicleReg: vehicle_reg,
      dispensedAt: timestamp ?? new Date().toISOString(),
    });

    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Events ───────────────────────────────────────────────────────────────────

// GET /api/fluid/events?date=today&work_order_id=X&org_id=X
router.get("/events", async (req: Request, res: Response) => {
  const orgId = (req as any).orgId ?? req.query.org_id;
  const { date, work_order_id } = req.query;

  let query = supabase
    .from("fluid_dispensing_events")
    .select("*")
    .eq("org_id", orgId)
    .order("dispensed_at", { ascending: false });

  if (work_order_id) {
    query = query.eq("work_order_id", work_order_id);
  }

  if (date === "today") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    query = query.gte("dispensed_at", today.toISOString());
  } else if (date) {
    const d = new Date(date as string);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    query = query.gte("dispensed_at", d.toISOString()).lt("dispensed_at", next.toISOString());
  }

  const { data, error } = await query.limit(200);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/fluid/events/manual
router.post("/events/manual", async (req: Request, res: Response) => {
  const orgId = (req as any).orgId;
  const { work_order_id, fluid_type, quantity_liters, unit_price, fluid_name, fluid_grade, vehicle_reg } = req.body;

  if (!fluid_type || !quantity_liters) {
    return res.status(400).json({ error: "fluid_type and quantity_liters required" });
  }

  const totalCost = unit_price ? Number(quantity_liters) * Number(unit_price) : undefined;
  const basAccount = FLUID_BAS_ACCOUNTS[fluid_type] ?? "4090";

  const { data, error } = await supabase
    .from("fluid_dispensing_events")
    .insert({
      org_id: orgId,
      work_order_id,
      fluid_type,
      fluid_name: fluid_name ?? fluid_type,
      fluid_grade,
      quantity_liters: Number(quantity_liters),
      unit_price_per_liter: unit_price ? Number(unit_price) : null,
      total_cost: totalCost,
      dispenser_id: "MANUAL",
      vehicle_reg,
      bas_account: basAccount,
      booked_to_work_order: !!work_order_id,
      dispensed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// POST /api/fluid/events/:id/link — manually link to work order
router.post("/events/:id/link", async (req: Request, res: Response) => {
  const orgId = (req as any).orgId;
  const { work_order_id } = req.body;

  const { data, error } = await supabase
    .from("fluid_dispensing_events")
    .update({ work_order_id, booked_to_work_order: true })
    .eq("id", req.params.id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  if (data) {
    await emitFluidPix(data.id, work_order_id, data.fluid_name ?? data.fluid_type, Number(data.quantity_liters), Number(data.total_cost ?? 0));
  }

  res.json(data);
});

// ─── Inventory ────────────────────────────────────────────────────────────────

// GET /api/fluid/inventory
router.get("/inventory", async (req: Request, res: Response) => {
  const orgId = (req as any).orgId;
  const { data, error } = await supabase
    .from("fluid_inventory")
    .select("*")
    .eq("org_id", orgId)
    .order("fluid_type");

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/fluid/inventory/sync — pull tank levels from connected systems
router.post("/inventory/sync", async (req: Request, res: Response) => {
  const orgId = (req as any).orgId;

  const { data: integrations } = await supabase
    .from("fluid_integrations")
    .select("*")
    .eq("org_id", orgId)
    .eq("is_active", true);

  const results: any[] = [];

  for (const integration of integrations ?? []) {
    if (!integration.api_endpoint || !integration.api_key_encrypted) {
      results.push({ integration_id: integration.id, skipped: true, reason: "No endpoint configured" });
      continue;
    }

    try {
      const apiKey = decryptApiKey(integration.api_key_encrypted);
      const response = await fetch(`${integration.api_endpoint}/api/v1/tanks`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        results.push({ integration_id: integration.id, error: `HTTP ${response.status}` });
        continue;
      }

      const tanks: any[] = await response.json();

      for (const tank of tanks) {
        // Normalise field names across Alantec / Orion
        const fluidType  = mapAlantecProductCode(tank.product_code ?? tank.ProductCode ?? "");
        const fluidName  = tank.product_name  ?? tank.ProductName  ?? tank.product_code ?? "Okänd";
        const fluidGrade = tank.grade         ?? tank.Grade        ?? null;
        const current    = Number(tank.current_level_ml ?? tank.CurrentLevelML ?? 0) / 1000;
        const capacity   = Number(tank.capacity_ml      ?? tank.CapacityML      ?? 0) / 1000;
        const levelPct   = capacity > 0 ? Math.round((current / capacity) * 100) : null;

        await supabase.from("fluid_inventory").upsert({
          org_id: orgId,
          integration_id: integration.id,
          fluid_type: fluidType,
          fluid_name: fluidName,
          fluid_grade: fluidGrade,
          current_level_liters: current,
          tank_capacity_liters: capacity,
          level_pct: levelPct,
          last_updated: new Date().toISOString(),
        }, { onConflict: "org_id,integration_id,fluid_name" });

        // Check low-level alert
        if (current > 0) {
          const { data: inv } = await supabase
            .from("fluid_inventory")
            .select("id, reorder_point_liters, alert_sent_at")
            .eq("org_id", orgId)
            .eq("fluid_name", fluidName)
            .single();

          if (inv && current <= (inv.reorder_point_liters ?? 20)) {
            const lastAlert = inv.alert_sent_at ? new Date(inv.alert_sent_at).getTime() : 0;
            if (Date.now() - lastAlert > 24 * 60 * 60 * 1000) {
              // TODO: send notification via PIX / push
              await supabase.from("fluid_inventory").update({ alert_sent_at: new Date().toISOString() }).eq("id", inv.id);
            }
          }
        }
      }

      await supabase.from("fluid_integrations").update({ last_sync_at: new Date().toISOString() }).eq("id", integration.id);
      results.push({ integration_id: integration.id, tanks_synced: tanks.length });

    } catch (e: any) {
      results.push({ integration_id: integration.id, error: e.message });
    }
  }

  res.json({ ok: true, results });
});

// ─── Reports ──────────────────────────────────────────────────────────────────

// GET /api/fluid/report?from=2026-03-01&to=2026-03-31
router.get("/report", async (req: Request, res: Response) => {
  const orgId = (req as any).orgId;
  const { from, to } = req.query;

  let query = supabase
    .from("fluid_dispensing_events")
    .select("fluid_type, fluid_name, quantity_liters, total_cost, technician_id, work_order_id, bas_account, dispensed_at")
    .eq("org_id", orgId)
    .order("dispensed_at");

  if (from) query = query.gte("dispensed_at", from as string);
  if (to)   query = query.lte("dispensed_at", to   as string);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Aggregate by fluid type
  const byFluid: Record<string, { liters: number; cost: number; count: number }> = {};
  const byTech:  Record<string, { liters: number; cost: number; count: number }> = {};
  let totalLiters = 0;
  let totalCost   = 0;

  for (const ev of data ?? []) {
    const ft = ev.fluid_type;
    byFluid[ft] ??= { liters: 0, cost: 0, count: 0 };
    byFluid[ft].liters += Number(ev.quantity_liters);
    byFluid[ft].cost   += Number(ev.total_cost ?? 0);
    byFluid[ft].count  += 1;

    const tid = ev.technician_id ?? "OKÄND";
    byTech[tid] ??= { liters: 0, cost: 0, count: 0 };
    byTech[tid].liters += Number(ev.quantity_liters);
    byTech[tid].cost   += Number(ev.total_cost ?? 0);
    byTech[tid].count  += 1;

    totalLiters += Number(ev.quantity_liters);
    totalCost   += Number(ev.total_cost ?? 0);
  }

  res.json({
    period: { from, to },
    total_liters: totalLiters,
    total_cost: totalCost,
    events_count: data?.length ?? 0,
    by_fluid_type: byFluid,
    by_technician: byTech,
  });
});

export default router;
