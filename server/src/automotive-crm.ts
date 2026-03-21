import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

const auth = (req: Request, res: Response, next: Function) => {
  if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

// ─── GET /api/automotive-crm/customer/:id/vehicles ────────────────────────────
router.get("/api/automotive-crm/customer/:id/vehicles", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { data, error } = await supabase
    .from("customer_vehicles")
    .select("*")
    .eq("org_id", user.org_id)
    .eq("customer_id", req.params.id)
    .order("owned_since", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── POST /api/automotive-crm/customer/:id/vehicles ───────────────────────────
router.post("/api/automotive-crm/customer/:id/vehicles", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { vin, reg_number, make, model, model_year, purchase_date, purchase_dealer, purchase_type } = req.body;

  // Deactivate previous vehicle if is_current
  await supabase
    .from("customer_vehicles")
    .update({ is_current: false })
    .eq("org_id", user.org_id)
    .eq("customer_id", req.params.id)
    .eq("is_current", true);

  const { data, error } = await supabase
    .from("customer_vehicles")
    .insert({
      org_id: user.org_id,
      customer_id: req.params.id,
      vin: vin?.toUpperCase(),
      registration_number: reg_number?.toUpperCase(),
      make,
      model,
      model_year,
      owned_since: purchase_date,
      is_current: true,
      purchase_type: purchase_type ?? "new_at_dealer",
      notes: purchase_dealer ? `Köpt hos: ${purchase_dealer}` : null,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// ─── GET /api/automotive-crm/vehicle/:vin/service-history ─────────────────────
router.get("/api/automotive-crm/vehicle/:vin/service-history", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { data, error } = await supabase
    .from("work_orders")
    .select("id, order_number, work_type, status, description, promised_date, completed_at, work_order_items(description, item_type, quantity, unit_price)")
    .eq("org_id", user.org_id)
    .eq("vehicle_vin", req.params.vin.toUpperCase())
    .in("status", ["INVOICED", "CLOSED"])
    .order("completed_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ vin: req.params.vin.toUpperCase(), service_history: data ?? [], count: data?.length ?? 0 });
});

// ─── GET /api/automotive-crm/service-due ──────────────────────────────────────
router.get("/api/automotive-crm/service-due", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  // Find customer vehicles with no recent service (>10 months ago or 15 000km interval stub)
  const { data: customerVehicles } = await supabase
    .from("customer_vehicles")
    .select("*, contacts:customer_id(full_name, email, phone)")
    .eq("org_id", user.org_id)
    .eq("is_current", true);

  if (!customerVehicles) return res.json({ due_count: 0, vehicles: [] });

  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  const tenMonthsAgo = new Date(Date.now() - 300 * 24 * 3600 * 1000);

  // Get last service dates for each VIN
  const vins = customerVehicles.map((v: any) => v.vin).filter(Boolean);
  let lastServiceMap: Record<string, string> = {};

  if (vins.length > 0) {
    const { data: recentServices } = await supabase
      .from("work_orders")
      .select("vehicle_vin, completed_at")
      .eq("org_id", user.org_id)
      .in("vehicle_vin", vins)
      .in("work_type", ["SERVICE"])
      .in("status", ["INVOICED", "CLOSED"])
      .order("completed_at", { ascending: false });

    for (const ws of recentServices ?? []) {
      if (!lastServiceMap[ws.vehicle_vin]) {
        lastServiceMap[ws.vehicle_vin] = ws.completed_at;
      }
    }
  }

  const due = customerVehicles
    .filter((v: any) => {
      if (!v.vin) return false;
      const lastService = lastServiceMap[v.vin];
      if (!lastService) return true; // Never serviced
      return new Date(lastService) < tenMonthsAgo;
    })
    .map((v: any) => ({
      ...v,
      last_service: lastServiceMap[v.vin] ?? null,
      next_service_due: "Estimerat inom 30 dagar",
    }));

  res.json({ due_count: due.length, vehicles: due });
});

// ─── GET /api/automotive-crm/inspection-due ───────────────────────────────────
router.get("/api/automotive-crm/inspection-due", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  // STUB — real implementation pulls from Transportstyrelsen API
  const { data: customerVehicles } = await supabase
    .from("customer_vehicles")
    .select("*, contacts:customer_id(full_name, email, phone)")
    .eq("org_id", user.org_id)
    .eq("is_current", true);

  res.json({
    stub: true,
    note: "[STUB] Besiktningsdatum kräver Transportstyrelsen API-integration",
    due_count: 0,
    vehicles: [],
    real_api: "https://fordonsuppgifter.transportstyrelsen.se",
    sample: customerVehicles?.slice(0, 2).map((v: any) => ({
      ...v,
      inspection_due_stub: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString().split("T")[0],
    })) ?? [],
  });
});

// ─── POST /api/automotive-crm/test-drives ────────────────────────────────────
router.post("/api/automotive-crm/test-drives", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { customer_id, vehicle_vin, scheduled_time, sales_person_id, notes } = req.body;

  // Reserve vehicle for test drive
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("make, model, status")
    .eq("org_id", user.org_id)
    .eq("vin", vehicle_vin?.toUpperCase())
    .single();

  const testDrive = {
    test_drive_id: crypto.randomUUID(),
    org_id: user.org_id,
    customer_id,
    vehicle_vin: vehicle_vin?.toUpperCase(),
    vehicle_info: vehicle ? `${vehicle.make} ${vehicle.model}` : null,
    scheduled_time,
    sales_person_id,
    notes,
    status: "BOOKED",
    created_at: new Date().toISOString(),
  };

  // In real system: insert into test_drives table
  res.status(201).json({
    ...testDrive,
    note: "[INFO] test_drives-tabell krävs i databasen — lägg till i nästa migration",
  });
});

// ─── GET /api/automotive-crm/test-drives ─────────────────────────────────────
router.get("/api/automotive-crm/test-drives", auth, async (_req: Request, res: Response) => {
  res.json({
    stub: true,
    test_drives: [],
    note: "[STUB] test_drives-tabell krävs i databasen",
  });
});

// ─── POST /api/automotive-crm/csi-surveys ────────────────────────────────────
router.post("/api/automotive-crm/csi-surveys", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { customer_id, transaction_type, transaction_id, score, nps_score, comments } = req.body;

  const { data, error } = await supabase
    .from("csi_surveys")
    .insert({
      org_id: user.org_id,
      customer_id,
      transaction_type,
      transaction_id,
      score,
      nps_score: nps_score ?? score,
      comments,
      surveyed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// ─── GET /api/automotive-crm/csi-statistics ───────────────────────────────────
router.get("/api/automotive-crm/csi-statistics", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { data, error } = await supabase
    .from("csi_surveys")
    .select("transaction_type, score, nps_score, surveyed_at")
    .eq("org_id", user.org_id)
    .order("surveyed_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const surveys = data ?? [];
  const salesSurveys = surveys.filter((s: any) => s.transaction_type === "SALES");
  const serviceSurveys = surveys.filter((s: any) => s.transaction_type === "SERVICE");

  const avgScore = (arr: any[]) =>
    arr.length ? Math.round((arr.reduce((s: number, x: any) => s + x.score, 0) / arr.length) * 10) / 10 : null;

  const npsCalc = (arr: any[]) => {
    if (!arr.length) return null;
    const promoters = arr.filter((s: any) => (s.nps_score ?? s.score) >= 9).length;
    const detractors = arr.filter((s: any) => (s.nps_score ?? s.score) <= 6).length;
    return Math.round(((promoters - detractors) / arr.length) * 100);
  };

  res.json({
    total_surveys: surveys.length,
    sales: {
      count: salesSurveys.length,
      avg_score: avgScore(salesSurveys),
      nps: npsCalc(salesSurveys),
    },
    service: {
      count: serviceSurveys.length,
      avg_score: avgScore(serviceSurveys),
      nps: npsCalc(serviceSurveys),
    },
    overall_nps: npsCalc(surveys),
    oem_reporting_note: "OEM kräver månadsvis CSI-rapportering. Exportera via GET /api/oem/reporting/monthly",
  });
});

export default router;
