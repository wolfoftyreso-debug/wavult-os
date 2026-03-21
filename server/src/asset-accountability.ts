// ---------------------------------------------------------------------------
// Asset Accountability & Traceability System
// Philosophy: "No asset without owner. No return without verification. Every movement is an inventory event."
// ---------------------------------------------------------------------------

import { Router, Request, Response } from "express";
import { supabase } from "./supabase";
import { requireAuth } from "./auth";
import { logZoneEvent } from "./spatial-flow";

const router = Router();
router.use(requireAuth);

// ─── Helpers ────────────────────────────────────────────────────────────────

function getOrgId(req: Request): string | null {
  // SECURITY FIX: org_id must come from authenticated user session only.
  // NEVER trust org_id from query params — that allows cross-tenant data access.
  return (req as any).user?.org_id ?? null;
}

function getUserId(req: Request): string {
  return (req as any).user?.id;
}

// ─── ASSET CRUD ──────────────────────────────────────────────────────────────

// GET /api/tool-assets — list with filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const org_id = getOrgId(req);
    const { status, category, holder, location, search } = req.query;

    let q = supabase
      .from("tool_assets")
      .select("*")
      .order("name");

    if (org_id) q = q.eq("org_id", org_id);
    if (status) q = q.eq("status", status as string);
    if (category) q = q.eq("category", category as string);
    if (holder) q = q.eq("current_holder_id", holder as string);
    if (location) q = q.ilike("location", `%${location}%`);
    if (search) q = q.or(`name.ilike.%${search}%,asset_number.ilike.%${search}%,serial_number.ilike.%${search}%`);

    const { data, error, count } = await q;
    if (error) throw error;

    res.json({ assets: data, total: count ?? data?.length ?? 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/tool-assets — create
router.post("/", async (req: Request, res: Response) => {
  try {
    const org_id = getOrgId(req);
    if (!org_id) return res.status(400).json({ error: "org_id required" });

    const {
      name, category, asset_number, qr_code, barcode, serial_number,
      manufacturer, model, purchase_date, purchase_price,
      location, notes, photo_url, requires_photo_on_return,
      requires_condition_check, max_checkout_days, inspection_interval_days,
    } = req.body;

    if (!name || !category) return res.status(400).json({ error: "name and category required" });

    // Auto-generate asset_number if not provided
    const finalNumber = asset_number ?? `ASS-${Date.now()}`;
    const finalQr = qr_code ?? `QR-${finalNumber}`;

    const { data, error } = await supabase
      .from("tool_assets")
      .insert({
        org_id, name, category,
        asset_number: finalNumber,
        qr_code: finalQr,
        barcode, serial_number, manufacturer, model,
        purchase_date, purchase_price,
        location, notes, photo_url,
        requires_photo_on_return: requires_photo_on_return ?? false,
        requires_condition_check: requires_condition_check ?? true,
        max_checkout_days: max_checkout_days ?? 7,
        inspection_interval_days: inspection_interval_days ?? 90,
        status: "AVAILABLE",
        condition_score: 5,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tool-assets/overdue — must come before /:id
router.get("/overdue", async (req: Request, res: Response) => {
  try {
    const org_id = getOrgId(req);
    const now = new Date().toISOString();

    let q = supabase
      .from("tool_assets")
      .select("*")
      .eq("status", "IN_USE");

    if (org_id) q = q.eq("org_id", org_id);

    const { data: inUse, error } = await q;
    if (error) throw error;

    // Find overdue via movements
    const assetIds = (inUse ?? []).map((a: any) => a.id);
    if (!assetIds.length) return res.json([]);

    const { data: movements } = await supabase
      .from("asset_movements")
      .select("asset_id, expected_return_at, to_holder_name")
      .in("asset_id", assetIds)
      .eq("movement_type", "CHECKOUT")
      .lt("expected_return_at", now)
      .is("actual_return_at", null)
      .order("created_at", { ascending: false });

    const overdueIds = new Set((movements ?? []).map((m: any) => m.asset_id));
    const overdueMap: Record<string, any> = {};
    (movements ?? []).forEach((m: any) => {
      if (!overdueMap[m.asset_id]) overdueMap[m.asset_id] = m;
    });

    const overdue = (inUse ?? [])
      .filter((a: any) => overdueIds.has(a.id))
      .map((a: any) => ({
        ...a,
        expected_return_at: overdueMap[a.id]?.expected_return_at,
        days_overdue: Math.floor((Date.now() - new Date(overdueMap[a.id]?.expected_return_at).getTime()) / 86400000),
      }));

    res.json(overdue);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tool-assets/inspection-due
router.get("/inspection-due", async (req: Request, res: Response) => {
  try {
    const org_id = getOrgId(req);
    const in7days = new Date(Date.now() + 7 * 86400000).toISOString();

    let q = supabase
      .from("tool_assets")
      .select("*")
      .lte("next_inspection_at", in7days)
      .not("status", "eq", "DECOMMISSIONED");

    if (org_id) q = q.eq("org_id", org_id);

    const { data, error } = await q;
    if (error) throw error;
    res.json(data ?? []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tool-assets/qr/:qr_code — lookup by QR (for mobile scan)
router.get("/qr/:qr_code", async (req: Request, res: Response) => {
  try {
    const { qr_code } = req.params;
    const { data, error } = await supabase
      .from("tool_assets")
      .select("*")
      .eq("qr_code", qr_code)
      .single();

    if (error || !data) return res.status(404).json({ error: "Asset not found" });

    // Also get last checkout movement
    const { data: lastMovement } = await supabase
      .from("asset_movements")
      .select("*")
      .eq("asset_id", data.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    res.json({ asset: data, last_movement: lastMovement });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tool-assets/holder/:userId — assets held by user
router.get("/holder/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from("tool_assets")
      .select("*")
      .eq("current_holder_id", userId)
      .order("name");

    if (error) throw error;
    res.json(data ?? []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tool-assets/report/utilization
router.get("/report/utilization", async (req: Request, res: Response) => {
  try {
    const org_id = getOrgId(req);
    let q = supabase.from("tool_assets").select("status, category");
    if (org_id) q = q.eq("org_id", org_id);
    const { data, error } = await q;
    if (error) throw error;

    const total = data?.length ?? 0;
    const inUse = data?.filter((a: any) => a.status === "IN_USE").length ?? 0;
    const available = data?.filter((a: any) => a.status === "AVAILABLE").length ?? 0;
    const maintenance = data?.filter((a: any) => a.status === "MAINTENANCE").length ?? 0;
    const damaged = data?.filter((a: any) => a.status === "DAMAGED").length ?? 0;
    const missing = data?.filter((a: any) => a.status === "MISSING").length ?? 0;

    const byCategory: Record<string, any> = {};
    (data ?? []).forEach((a: any) => {
      if (!byCategory[a.category]) byCategory[a.category] = { total: 0, in_use: 0 };
      byCategory[a.category].total++;
      if (a.status === "IN_USE") byCategory[a.category].in_use++;
    });

    res.json({
      total, in_use: inUse, available, maintenance, damaged, missing,
      utilization_rate: total > 0 ? Math.round((inUse / total) * 100) : 0,
      by_category: byCategory,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tool-assets/report/holder-summary
router.get("/report/holder-summary", async (req: Request, res: Response) => {
  try {
    const org_id = getOrgId(req);
    let q = supabase.from("tool_assets")
      .select("current_holder_id, current_holder_name, status")
      .eq("status", "IN_USE");
    if (org_id) q = q.eq("org_id", org_id);
    const { data, error } = await q;
    if (error) throw error;

    const summary: Record<string, any> = {};
    (data ?? []).forEach((a: any) => {
      const key = a.current_holder_id ?? "unassigned";
      if (!summary[key]) summary[key] = { holder_id: key, holder_name: a.current_holder_name, count: 0 };
      summary[key].count++;
    });

    res.json(Object.values(summary).sort((a: any, b: any) => b.count - a.count));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tool-assets/report/missing
router.get("/report/missing", async (req: Request, res: Response) => {
  try {
    const org_id = getOrgId(req);
    let q = supabase.from("tool_assets").select("*").eq("status", "MISSING");
    if (org_id) q = q.eq("org_id", org_id);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data ?? []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tool-assets/:id — asset detail with full movement history
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data: asset, error } = await supabase
      .from("tool_assets")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !asset) return res.status(404).json({ error: "Asset not found" });

    const { data: movements } = await supabase
      .from("asset_movements")
      .select("*")
      .eq("asset_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: alerts } = await supabase
      .from("asset_alerts")
      .select("*")
      .eq("asset_id", id)
      .eq("status", "OPEN");

    res.json({ ...asset, movements: movements ?? [], alerts: alerts ?? [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/tool-assets/:id — update asset
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id;
    delete updates.org_id;

    const { data, error } = await supabase
      .from("tool_assets")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tool-assets/:id/photos
router.get("/:id/photos", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("asset_movements")
      .select("id, movement_type, photo_urls, created_at, to_holder_name, from_holder_name")
      .eq("asset_id", id)
      .not("photo_urls", "eq", "{}")
      .order("created_at", { ascending: false });

    if (error) throw error;
    const photos = (data ?? []).flatMap((m: any) =>
      (m.photo_urls ?? []).map((url: string) => ({
        url, movement_id: m.id,
        movement_type: m.movement_type,
        created_at: m.created_at,
        holder: m.to_holder_name || m.from_holder_name,
      }))
    );
    res.json(photos);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tool-assets/:id/condition-timeline
router.get("/:id/condition-timeline", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("asset_movements")
      .select("condition_score, movement_type, created_at, to_holder_name")
      .eq("asset_id", id)
      .not("condition_score", "is", null)
      .order("created_at", { ascending: true });

    if (error) throw error;
    res.json(data ?? []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── CHECKOUT / CHECKIN / TRANSFER ──────────────────────────────────────────

// POST /api/tool-assets/:id/checkout
router.post("/:id/checkout", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id, user_name, expected_return_date, work_order_id, notes } = req.body;
    const created_by = getUserId(req);

    if (!user_id) return res.status(400).json({ error: "user_id required" });

    // Get current asset state
    const { data: asset, error: assetErr } = await supabase
      .from("tool_assets")
      .select("*")
      .eq("id", id)
      .single();

    if (assetErr || !asset) return res.status(404).json({ error: "Asset not found" });
    if (asset.status !== "AVAILABLE") {
      return res.status(409).json({
        error: `Asset is not available (current status: ${asset.status})`,
        current_holder: asset.current_holder_name,
      });
    }

    // Calculate expected return
    const daysLimit = asset.max_checkout_days ?? 7;
    const expectedReturn = expected_return_date
      ? new Date(expected_return_date).toISOString()
      : new Date(Date.now() + daysLimit * 86400000).toISOString();

    const org_id = asset.org_id;

    // Update asset
    await supabase
      .from("tool_assets")
      .update({
        status: "IN_USE",
        current_holder_id: user_id,
        current_holder_name: user_name ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Create movement record
    const { data: movement, error: movErr } = await supabase
      .from("asset_movements")
      .insert({
        asset_id: id,
        org_id,
        movement_type: "CHECKOUT",
        to_holder_id: user_id,
        to_holder_name: user_name ?? null,
        from_location: asset.location,
        to_location: asset.location,
        expected_return_at: expectedReturn,
        work_order_id: work_order_id ?? null,
        notes: notes ?? null,
        created_by,
        verified: true,
      })
      .select()
      .single();

    if (movErr) throw movErr;

    // Spatial Flow: log zone event for tool checkout
    const locationZoneId: string | null = (asset as any).location_zone_id ?? null;
    logZoneEvent(org_id, user_id, locationZoneId, "TOOL_CHECKOUT", {
      asset_id: id,
      work_order_id: work_order_id ?? undefined,
    }).catch(() => {});

    res.json({
      success: true,
      asset_id: id,
      movement,
      expected_return_at: expectedReturn,
      message: `Asset checked out to ${user_name ?? user_id}. Expected return: ${new Date(expectedReturn).toLocaleDateString("sv-SE")}`,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/tool-assets/:id/checkin
router.post("/:id/checkin", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { condition_score, condition_notes, photos, signature } = req.body;
    const created_by = getUserId(req);

    const { data: asset, error: assetErr } = await supabase
      .from("tool_assets")
      .select("*")
      .eq("id", id)
      .single();

    if (assetErr || !asset) return res.status(404).json({ error: "Asset not found" });
    if (asset.status !== "IN_USE" && asset.status !== "MISSING") {
      return res.status(409).json({ error: `Asset is not checked out (status: ${asset.status})` });
    }

    // ENFORCE: photo required on return
    if (asset.requires_photo_on_return && (!photos || photos.length === 0)) {
      return res.status(422).json({
        error: "PHOTO_REQUIRED",
        message: "This asset requires a photo on return. Please take a photo before checking in.",
        requires_photo_on_return: true,
      });
    }

    // ENFORCE: condition check required
    if (asset.requires_condition_check && !condition_score) {
      return res.status(422).json({
        error: "CONDITION_REQUIRED",
        message: "Condition score is required for this asset.",
      });
    }

    const finalScore = condition_score ?? asset.condition_score;
    const now = new Date().toISOString();
    const org_id = asset.org_id;

    // Update asset
    await supabase
      .from("tool_assets")
      .update({
        status: "AVAILABLE",
        current_holder_id: null,
        current_holder_name: null,
        condition_score: finalScore,
        updated_at: now,
      })
      .eq("id", id);

    // Find last checkout movement for this asset
    const { data: lastCheckout } = await supabase
      .from("asset_movements")
      .select("id, expected_return_at, to_holder_id, to_holder_name")
      .eq("asset_id", id)
      .eq("movement_type", "CHECKOUT")
      .is("actual_return_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Update checkout record with actual return
    if (lastCheckout) {
      await supabase
        .from("asset_movements")
        .update({ actual_return_at: now })
        .eq("id", lastCheckout.id);
    }

    // Create checkin movement
    const { data: movement, error: movErr } = await supabase
      .from("asset_movements")
      .insert({
        asset_id: id,
        org_id,
        movement_type: "CHECKIN",
        from_holder_id: lastCheckout?.to_holder_id ?? asset.current_holder_id,
        from_holder_name: lastCheckout?.to_holder_name ?? asset.current_holder_name,
        condition_score: finalScore,
        condition_notes: condition_notes ?? null,
        photo_urls: photos ?? [],
        signature_data: signature ?? null,
        verified: true,
        actual_return_at: now,
        created_by,
      })
      .select()
      .single();

    if (movErr) throw movErr;

    // If condition degraded significantly, create alert
    if (finalScore < asset.condition_score && finalScore <= 2) {
      await supabase.from("asset_alerts").insert({
        org_id,
        asset_id: id,
        alert_type: "CONDITION_DEGRADED",
        severity: finalScore === 1 ? "HIGH" : "MEDIUM",
        title: `Skick försämrat: ${asset.name}`,
        description: `Skick ändrades från ${asset.condition_score}/5 till ${finalScore}/5. ${condition_notes ?? ""}`,
        status: "OPEN",
      });
    }

    res.json({
      success: true,
      movement,
      condition_score: finalScore,
      message: `Asset returned successfully. Condition: ${finalScore}/5`,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/tool-assets/:id/transfer
router.post("/:id/transfer", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { to_user_id, to_user_name, condition_score, notes } = req.body;
    const created_by = getUserId(req);

    if (!to_user_id) return res.status(400).json({ error: "to_user_id required" });

    const { data: asset, error: assetErr } = await supabase
      .from("tool_assets")
      .select("*")
      .eq("id", id)
      .single();

    if (assetErr || !asset) return res.status(404).json({ error: "Asset not found" });

    const org_id = asset.org_id;
    const now = new Date().toISOString();

    await supabase
      .from("tool_assets")
      .update({
        current_holder_id: to_user_id,
        current_holder_name: to_user_name ?? null,
        condition_score: condition_score ?? asset.condition_score,
        status: "IN_USE",
        updated_at: now,
      })
      .eq("id", id);

    const { data: movement } = await supabase
      .from("asset_movements")
      .insert({
        asset_id: id,
        org_id,
        movement_type: "TRANSFER",
        from_holder_id: asset.current_holder_id,
        from_holder_name: asset.current_holder_name,
        to_holder_id: to_user_id,
        to_holder_name: to_user_name ?? null,
        condition_score: condition_score ?? asset.condition_score,
        notes: notes ?? null,
        created_by,
        verified: true,
      })
      .select()
      .single();

    res.json({ success: true, movement });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── INSPECTION ──────────────────────────────────────────────────────────────

// POST /api/tool-assets/:id/inspect
router.post("/:id/inspect", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { condition_score, notes, photos, checklist_items } = req.body;
    const created_by = getUserId(req);

    const { data: asset, error: assetErr } = await supabase
      .from("tool_assets")
      .select("*")
      .eq("id", id)
      .single();

    if (assetErr || !asset) return res.status(404).json({ error: "Asset not found" });

    const now = new Date().toISOString();
    const nextInspection = new Date(
      Date.now() + (asset.inspection_interval_days ?? 90) * 86400000
    ).toISOString();

    await supabase
      .from("tool_assets")
      .update({
        condition_score: condition_score ?? asset.condition_score,
        last_inspection_at: now,
        next_inspection_at: nextInspection,
        updated_at: now,
      })
      .eq("id", id);

    const { data: movement } = await supabase
      .from("asset_movements")
      .insert({
        asset_id: id,
        org_id: asset.org_id,
        movement_type: "INSPECTION",
        condition_score: condition_score ?? asset.condition_score,
        condition_notes: notes ?? null,
        photo_urls: photos ?? [],
        notes: checklist_items ? JSON.stringify(checklist_items) : null,
        created_by,
        verified: true,
      })
      .select()
      .single();

    res.json({ success: true, movement, next_inspection_at: nextInspection });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── DAMAGE REPORT ───────────────────────────────────────────────────────────

// POST /api/tool-assets/:id/damage-report
router.post("/:id/damage-report", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, severity, photos, estimated_repair_cost } = req.body;
    const created_by = getUserId(req);

    const { data: asset, error: assetErr } = await supabase
      .from("tool_assets")
      .select("*")
      .eq("id", id)
      .single();

    if (assetErr || !asset) return res.status(404).json({ error: "Asset not found" });

    const org_id = asset.org_id;
    const now = new Date().toISOString();

    // Set asset to DAMAGED
    await supabase
      .from("tool_assets")
      .update({ status: "DAMAGED", updated_at: now })
      .eq("id", id);

    // Create movement
    await supabase
      .from("asset_movements")
      .insert({
        asset_id: id,
        org_id,
        movement_type: "DAMAGE_REPORT",
        condition_notes: description,
        photo_urls: photos ?? [],
        notes: estimated_repair_cost ? `Estimated repair: ${estimated_repair_cost}` : null,
        created_by,
        from_holder_id: asset.current_holder_id,
        from_holder_name: asset.current_holder_name,
      });

    // Create alert
    const { data: alert } = await supabase
      .from("asset_alerts")
      .insert({
        org_id,
        asset_id: id,
        alert_type: "DAMAGED",
        severity: severity ?? "HIGH",
        title: `Skaderapport: ${asset.name}`,
        description,
        responsible_user_id: asset.current_holder_id ?? null,
        status: "OPEN",
      })
      .select()
      .single();

    res.json({ success: true, alert, message: "Damage report filed. Asset marked as DAMAGED." });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── INVENTORY TASKS ─────────────────────────────────────────────────────────

// GET /api/asset-tasks
router.get("/tasks", async (req: Request, res: Response) => {
  try {
    const org_id = getOrgId(req);
    const { status, due } = req.query;

    let q = supabase
      .from("asset_inventory_tasks")
      .select("*")
      .order("next_due_at");

    if (org_id) q = q.eq("org_id", org_id);
    if (status) q = q.eq("status", status as string);
    if (due === "today") {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      q = q.lte("next_due_at", endOfDay.toISOString());
    }

    const { data, error } = await q;
    if (error) throw error;
    res.json(data ?? []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/asset-tasks
router.post("/tasks", async (req: Request, res: Response) => {
  try {
    const org_id = getOrgId(req);
    if (!org_id) return res.status(400).json({ error: "org_id required" });

    const { title, asset_ids, asset_category, location, assigned_to, assigned_role, frequency, next_due_at, checklist } = req.body;
    if (!title || !next_due_at) return res.status(400).json({ error: "title and next_due_at required" });

    const { data, error } = await supabase
      .from("asset_inventory_tasks")
      .insert({ org_id, title, asset_ids, asset_category, location, assigned_to, assigned_role, frequency: frequency ?? "ONE_TIME", next_due_at, checklist: checklist ?? [] })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/asset-tasks/:id/start
router.patch("/tasks/:id/start", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("asset_inventory_tasks")
      .update({ status: "IN_PROGRESS" })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/asset-tasks/:id/complete
router.patch("/tasks/:id/complete", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { checklist, completion_notes } = req.body;
    const completed_by = getUserId(req);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("asset_inventory_tasks")
      .update({
        status: "COMPLETED",
        last_completed_at: now,
        completed_by,
        completion_notes: completion_notes ?? null,
        checklist: checklist ?? [],
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/asset-tasks/overdue
router.get("/tasks/overdue", async (req: Request, res: Response) => {
  try {
    const org_id = getOrgId(req);
    const now = new Date().toISOString();

    let q = supabase
      .from("asset_inventory_tasks")
      .select("*")
      .lt("next_due_at", now)
      .not("status", "in", "(COMPLETED,SKIPPED)")
      .order("next_due_at");

    if (org_id) q = q.eq("org_id", org_id);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data ?? []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── ALERTS ──────────────────────────────────────────────────────────────────

// GET /api/asset-alerts
router.get("/alerts", async (req: Request, res: Response) => {
  try {
    const org_id = getOrgId(req);
    const { status } = req.query;

    let q = supabase
      .from("asset_alerts")
      .select("*, tool_assets(name, category, asset_number)")
      .order("created_at", { ascending: false });

    if (org_id) q = q.eq("org_id", org_id);
    if (status) q = q.eq("status", status as string);
    else q = q.in("status", ["OPEN", "ACKNOWLEDGED", "ESCALATED"]);

    const { data, error } = await q;
    if (error) throw error;
    res.json(data ?? []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/asset-alerts/:id/acknowledge
router.patch("/alerts/:id/acknowledge", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("asset_alerts")
      .update({ status: "ACKNOWLEDGED", acknowledged_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/asset-alerts/:id/resolve
router.patch("/alerts/:id/resolve", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("asset_alerts")
      .update({ status: "RESOLVED", resolved_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/asset-alerts/:id/escalate
router.post("/alerts/:id/escalate", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { escalated_to_id } = req.body;

    const { data, error } = await supabase
      .from("asset_alerts")
      .update({
        status: "ESCALATED",
        escalated_to_id: escalated_to_id ?? null,
        severity: "CRITICAL",
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
