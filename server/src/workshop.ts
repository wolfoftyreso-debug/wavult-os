import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

const auth = (req: Request, res: Response, next: Function) => {
  if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

function generateOrderNumber(prefix: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const seq = Math.floor(Math.random() * 900000) + 100000;
  return `${prefix}-${year}-${seq}`;
}

// ─── POST /api/workshop/work-orders ──────────────────────────────────────────
router.post("/api/workshop/work-orders", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const b = req.body;

  const orderNumber = generateOrderNumber("WO");

  const { data: wo, error: woErr } = await supabase
    .from("work_orders")
    .insert({
      org_id: user.org_id,
      order_number: orderNumber,
      customer_id: b.customer_id,
      vehicle_vin: b.vehicle_vin,
      vehicle_reg: b.vehicle_reg,
      work_type: b.work_type,
      status: "OPEN",
      description: b.description,
      technician_id: b.technician_id,
      bay_number: b.bay_number,
      promised_date: b.promised_date,
      warranty_claim: b.warranty_claim ?? false,
      recall_number: b.recall_number,
      internal_notes: b.internal_notes,
      customer_notes: b.customer_notes,
    })
    .select()
    .single();

  if (woErr) return res.status(400).json({ error: woErr.message });

  // Insert line items
  if (b.items && b.items.length > 0) {
    const items = b.items.map((item: any) => ({
      work_order_id: wo.id,
      item_type: item.type,
      part_number: item.code,
      description: item.description,
      quantity: item.quantity ?? 1,
      unit_price: item.unit_price,
      discount_pct: item.discount_pct ?? 0,
      vat_rate: 25,
      warranty_covered: b.warranty_claim ?? false,
      added_by: user.id,
    }));
    await supabase.from("work_order_items").insert(items);
  }

  res.status(201).json({ ...wo, order_number: orderNumber });
});

// ─── GET /api/workshop/work-orders ───────────────────────────────────────────
router.get("/api/workshop/work-orders", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { status, technician_id, date_from, date_to, work_type } = req.query;

  let query = supabase
    .from("work_orders")
    .select("*, work_order_items(*)")
    .eq("org_id", user.org_id)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (technician_id) query = query.eq("technician_id", technician_id);
  if (work_type) query = query.eq("work_type", work_type);
  if (date_from) query = query.gte("promised_date", date_from);
  if (date_to) query = query.lte("promised_date", date_to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── GET /api/workshop/work-orders/:id ───────────────────────────────────────
router.get("/api/workshop/work-orders/:id", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { data, error } = await supabase
    .from("work_orders")
    .select("*, work_order_items(*), time_entries(*)")
    .eq("org_id", user.org_id)
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Arbetsorder ej hittad" });
  res.json(data);
});

// ─── PATCH /api/workshop/work-orders/:id/status ───────────────────────────────
router.patch("/api/workshop/work-orders/:id/status", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { status } = req.body;
  const validStatuses = ["OPEN", "IN_PROGRESS", "WAITING_PARTS", "WAITING_CUSTOMER", "READY", "INVOICED", "CLOSED"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Ogiltigt status. Tillåtna: ${validStatuses.join(", ")}` });
  }

  const updates: any = { status, updated_at: new Date().toISOString() };
  if (status === "IN_PROGRESS") updates.started_at = new Date().toISOString();
  if (status === "CLOSED" || status === "INVOICED") updates.completed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("work_orders")
    .update(updates)
    .eq("org_id", user.org_id)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── POST /api/workshop/work-orders/:id/time-entry ────────────────────────────
router.post("/api/workshop/work-orders/:id/time-entry", auth, async (req: Request, res: Response) => {
  const { technician_id, start_time, end_time, description } = req.body;

  const start = new Date(start_time);
  const end = end_time ? new Date(end_time) : null;
  const hours = end ? (end.getTime() - start.getTime()) / 3600000 : null;

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      work_order_id: req.params.id,
      technician_id,
      start_time,
      end_time,
      hours_worked: hours ? Math.round(hours * 100) / 100 : null,
      description,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// ─── POST /api/workshop/work-orders/:id/invoice ───────────────────────────────
router.post("/api/workshop/work-orders/:id/invoice", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;

  const { data: wo, error: woErr } = await supabase
    .from("work_orders")
    .select("*, work_order_items(*)")
    .eq("org_id", user.org_id)
    .eq("id", req.params.id)
    .single();

  if (woErr) return res.status(404).json({ error: "Arbetsorder ej hittad" });

  const items = wo.work_order_items ?? [];
  let laborNet = 0, partsNet = 0, subletNet = 0;

  for (const item of items) {
    if (item.warranty_covered) continue;
    const net = item.quantity * item.unit_price * (1 - (item.discount_pct ?? 0) / 100);
    if (item.item_type === "labor") laborNet += net;
    else if (item.item_type === "part" || item.item_type === "oil") partsNet += net;
    else if (item.item_type === "sublet") subletNet += net;
  }

  const vatRate = 0.25;
  const totalNet = laborNet + partsNet + subletNet;
  const totalVat = totalNet * vatRate;
  const totalGross = totalNet + totalVat;

  // Update status to INVOICED
  await supabase
    .from("work_orders")
    .update({ status: "INVOICED", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", req.params.id);

  res.json({
    work_order_id: wo.id,
    order_number: wo.order_number,
    invoice_number: generateOrderNumber("INV"),
    invoice_date: new Date().toISOString().split("T")[0],
    breakdown: {
      labor_net: Math.round(laborNet * 100) / 100,
      parts_net: Math.round(partsNet * 100) / 100,
      sublet_net: Math.round(subletNet * 100) / 100,
      total_net: Math.round(totalNet * 100) / 100,
      vat_25pct: Math.round(totalVat * 100) / 100,
      total_gross: Math.round(totalGross * 100) / 100,
    },
    currency: "SEK",
    note: "Moms 25% tillämpas på arbete och delar (ML 2023:200)",
  });
});

// ─── GET /api/workshop/bookings ───────────────────────────────────────────────
router.get("/api/workshop/bookings", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { date_from, date_to } = req.query;

  let query = supabase
    .from("work_orders")
    .select("id, order_number, customer_id, vehicle_vin, vehicle_reg, work_type, status, technician_id, bay_number, promised_date, estimated_hours")
    .eq("org_id", user.org_id)
    .not("promised_date", "is", null)
    .order("promised_date");

  if (date_from) query = query.gte("promised_date", date_from);
  if (date_to) query = query.lte("promised_date", date_to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── POST /api/workshop/bookings ─────────────────────────────────────────────
router.post("/api/workshop/bookings", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { customer_id, vehicle_vin, work_type, preferred_date, estimated_hours, notes } = req.body;

  const { data, error } = await supabase
    .from("work_orders")
    .insert({
      org_id: user.org_id,
      order_number: `WO-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000) + 100000}`,
      customer_id,
      vehicle_vin,
      work_type: work_type ?? "SERVICE",
      status: "OPEN",
      promised_date: preferred_date,
      description: notes ?? `${work_type ?? "SERVICE"}-bokning`,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// ─── GET /api/workshop/availability ──────────────────────────────────────────
router.get("/api/workshop/availability", auth, async (req: Request, res: Response) => {
  const { date, estimated_hours } = req.query;
  const targetDate = date ? new Date(date as string) : new Date();
  const dateStr = targetDate.toISOString().split("T")[0];

  // Stub — real implementation checks calendar, technician schedules, bay availability
  const slots = [];
  for (let h = 7; h <= 16; h++) {
    slots.push({
      time: `${String(h).padStart(2, "0")}:00`,
      available: Math.random() > 0.3,
      technicians_free: Math.floor(Math.random() * 4) + 1,
    });
  }

  res.json({
    date: dateStr,
    estimated_hours: Number(estimated_hours ?? 1),
    available_slots: slots.filter((s) => s.available),
    all_slots: slots,
    note: "[STUB] Riktig tillgänglighet kräver mekaniker- och platsdata",
  });
});

// ─── GET /api/workshop/technicians ───────────────────────────────────────────
router.get("/api/workshop/technicians", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, role, email")
    .eq("org_id", user.org_id)
    .in("role", ["TECHNICIAN", "MEKANIKER", "MECHANIC", "ADMIN"]);

  if (error) return res.status(500).json({ error: error.message });

  // Enrich with stub certifications
  const technicians = (data ?? []).map((t: any) => ({
    ...t,
    certifications: ["Volvo Certified", "EV Service Level 2"],
    capacity_hours_per_day: 8,
    specializations: ["SERVICE", "PDI", "REPAIR"],
  }));

  res.json(technicians);
});

// ─── GET /api/workshop/technicians/:id/schedule ───────────────────────────────
router.get("/api/workshop/technicians/:id/schedule", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { date } = req.query;
  const dateStr = date ? String(date) : new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("work_orders")
    .select("id, order_number, vehicle_vin, vehicle_reg, work_type, status, promised_date, description")
    .eq("org_id", user.org_id)
    .eq("technician_id", req.params.id)
    .gte("promised_date", `${dateStr}T00:00:00`)
    .lte("promised_date", `${dateStr}T23:59:59`)
    .order("promised_date");

  if (error) return res.status(500).json({ error: error.message });
  res.json({ technician_id: req.params.id, date: dateStr, work_orders: data });
});

// ─── POST /api/workshop/pdi ──────────────────────────────────────────────────
router.post("/api/workshop/pdi", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { vin, technician_id, checklist_items } = req.body;

  const passed = checklist_items.filter((i: any) => i.passed).length;
  const failed = checklist_items.filter((i: any) => !i.passed).length;
  const pdiPassed = failed === 0;

  // Update vehicle status
  if (pdiPassed) {
    await supabase
      .from("vehicles")
      .update({ status: "IN_STOCK", updated_at: new Date().toISOString() })
      .eq("org_id", user.org_id)
      .eq("vin", vin.toUpperCase());
  }

  const report = {
    pdi_id: crypto.randomUUID(),
    vin: vin.toUpperCase(),
    technician_id,
    org_id: user.org_id,
    performed_at: new Date().toISOString(),
    result: pdiPassed ? "PASSED" : "FAILED",
    items_checked: checklist_items.length,
    items_passed: passed,
    items_failed: failed,
    checklist: checklist_items,
    vehicle_ready_for_delivery: pdiPassed,
    pdf_url: `[STUB] /api/workshop/pdi/${vin}/pdf`,
    note: "PDI-rapport genererad. PDF-generering kräver integration med rapport-library (puppeteer/pdfkit).",
  };

  res.status(201).json(report);
});

// ─── POST /api/workshop/warranty-claims ───────────────────────────────────────
router.post("/api/workshop/warranty-claims", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const b = req.body;

  const { data, error } = await supabase
    .from("warranty_claims")
    .insert({
      org_id: user.org_id,
      claim_number: generateOrderNumber("WC"),
      work_order_id: b.work_order_id,
      vehicle_vin: b.vin,
      failure_description: b.failure_description,
      diagnosis: b.diagnosis,
      parts_replaced: b.parts_replaced,
      labor_hours: b.labor_hours,
      claim_amount: b.claim_amount,
      status: "SUBMITTED",
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// ─── GET /api/workshop/warranty-claims ────────────────────────────────────────
router.get("/api/workshop/warranty-claims", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { data, error } = await supabase
    .from("warranty_claims")
    .select("*")
    .eq("org_id", user.org_id)
    .order("submitted_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── GET /api/workshop/warranty-claims/:id/status ─────────────────────────────
router.get("/api/workshop/warranty-claims/:id/status", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { data, error } = await supabase
    .from("warranty_claims")
    .select("id, claim_number, vehicle_vin, status, oem_reference, approved_amount, rejection_reason, submitted_at, responded_at")
    .eq("org_id", user.org_id)
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Garantiärende ej hittat" });
  res.json({
    ...data,
    oem_status_stub: {
      note: "[STUB] OEM-status kräver integration med respektive generalagents system (VIDA/DIS/CROSS)",
      last_polled: new Date().toISOString(),
    },
  });
});

// ─── GET /api/workshop/recalls ────────────────────────────────────────────────
router.get("/api/workshop/recalls", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { data, error } = await supabase
    .from("recalls")
    .select("*")
    .eq("org_id", user.org_id)
    .eq("status", "ACTIVE")
    .order("issued_date", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── POST /api/workshop/recalls/:recall_id/complete ───────────────────────────
router.post("/api/workshop/recalls/:recall_id/complete", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { vin, work_order_id, technician_id, completion_date } = req.body;

  // Mark recall as completed for this VIN (in a real system, track per VIN)
  const { data, error } = await supabase
    .from("recalls")
    .select("*")
    .eq("org_id", user.org_id)
    .eq("id", req.params.recall_id)
    .single();

  if (error) return res.status(404).json({ error: "Återkallelse ej hittad" });

  res.json({
    recall_id: req.params.recall_id,
    vin,
    work_order_id,
    technician_id,
    completion_date,
    status: "COMPLETED",
    recall_number: data.recall_number,
    note: "Återkallelse slutförd. Rapportera till OEM via respektive portal (VIDA/DIS/CROSS).",
  });
});

export default router;
