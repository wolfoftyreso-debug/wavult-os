// ---------------------------------------------------------------------------
// Asset Management — ISO 7.1.3, 7.1.5, 8.5.1
// ---------------------------------------------------------------------------

import { Router, Request, Response } from "express";
import { supabase } from "./supabase";
import { emitEntityEvent, EventType } from "./events";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/assets/dashboard
// ---------------------------------------------------------------------------
router.get("/api/assets/dashboard", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query;
    let q = supabase.from("assets").select("status, asset_type, criticality_level, current_value, currency");
    if (org_id) q = q.eq("org_id", org_id as string);

    const { data: assets, error } = await q;
    if (error) throw error;

    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);

    const summary = {
      total: assets?.length ?? 0,
      active: assets?.filter(a => a.status === "ACTIVE").length ?? 0,
      under_maintenance: assets?.filter(a => a.status === "UNDER_MAINTENANCE").length ?? 0,
      calibration_due: assets?.filter(a => ["CALIBRATION_DUE","CALIBRATION_OVERDUE"].includes(a.status)).length ?? 0,
      decommissioned: assets?.filter(a => a.status === "DECOMMISSIONED").length ?? 0,
      critical_assets: assets?.filter(a => a.criticality_level === 5).length ?? 0,
    };

    // calibration due soon
    let calQuery = supabase.from("assets").select("id, asset_number, name, next_calibration_due, status")
      .eq("requires_calibration", true)
      .lte("next_calibration_due", in30)
      .eq("status", "ACTIVE");
    if (org_id) calQuery = calQuery.eq("org_id", org_id as string);
    const { data: calDue } = await calQuery;

    // maintenance due soon
    let maintQuery = supabase.from("assets").select("id, asset_number, name, next_maintenance_due")
      .eq("requires_maintenance", true)
      .lte("next_maintenance_due", in30)
      .not("status", "in", "(DECOMMISSIONED,DISPOSED,UNDER_MAINTENANCE)");
    if (org_id) maintQuery = maintQuery.eq("org_id", org_id as string);
    const { data: maintDue } = await maintQuery;

    // pending updates
    let updQuery = supabase.from("system_updates").select("id", { count: "exact" })
      .in("status", ["AVAILABLE", "FAILED"]);
    if (org_id) updQuery = updQuery.eq("org_id", org_id as string);
    const { count: pendingUpdates } = await updQuery;

    // recent calibrations
    let recentCalQuery = supabase.from("calibration_records")
      .select("id, asset_id, calibration_date, result, certificate_number")
      .order("calibration_date", { ascending: false })
      .limit(5);
    if (org_id) recentCalQuery = recentCalQuery.eq("org_id", org_id as string);
    const { data: recentCals } = await recentCalQuery;

    return res.json({
      summary,
      calibration_due_soon: calDue ?? [],
      maintenance_due_soon: maintDue ?? [],
      pending_updates: pendingUpdates ?? 0,
      recent_calibrations: recentCals ?? [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/assets/calibration-due
// ---------------------------------------------------------------------------
router.get("/api/assets/calibration-due", async (req: Request, res: Response) => {
  try {
    const { org_id, days_ahead = "30" } = req.query;
    const cutoff = new Date(Date.now() + Number(days_ahead) * 86400000).toISOString().slice(0, 10);

    let q = supabase.from("assets")
      .select("*, profiles!responsible_user_id(full_name)")
      .eq("requires_calibration", true)
      .lte("next_calibration_due", cutoff)
      .not("status", "in", "(DECOMMISSIONED,DISPOSED)")
      .order("next_calibration_due");
    if (org_id) q = q.eq("org_id", org_id as string);

    const { data, error } = await q;
    if (error) throw error;
    return res.json({ assets: data ?? [], cutoff_date: cutoff });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/assets/maintenance-due
// ---------------------------------------------------------------------------
router.get("/api/assets/maintenance-due", async (req: Request, res: Response) => {
  try {
    const { org_id, days_ahead = "30" } = req.query;
    const cutoff = new Date(Date.now() + Number(days_ahead) * 86400000).toISOString().slice(0, 10);

    let q = supabase.from("assets")
      .select("*")
      .eq("requires_maintenance", true)
      .lte("next_maintenance_due", cutoff)
      .not("status", "in", "(DECOMMISSIONED,DISPOSED,UNDER_MAINTENANCE)")
      .order("next_maintenance_due");
    if (org_id) q = q.eq("org_id", org_id as string);

    const { data, error } = await q;
    if (error) throw error;
    return res.json({ assets: data ?? [], cutoff_date: cutoff });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/assets
// ---------------------------------------------------------------------------
router.get("/api/assets", async (req: Request, res: Response) => {
  try {
    const { org_id, asset_type, status, department, requires_calibration, requires_maintenance, is_it_system, search, limit = "50", offset = "0" } = req.query;

    let q = supabase.from("assets").select("*, profiles!responsible_user_id(full_name)", { count: "exact" });
    if (org_id) q = q.eq("org_id", org_id as string);
    if (asset_type) q = q.eq("asset_type", asset_type as string);
    if (status) q = q.eq("status", status as string);
    if (department) q = q.eq("department", department as string);
    if (requires_calibration !== undefined) q = q.eq("requires_calibration", requires_calibration === "true");
    if (requires_maintenance !== undefined) q = q.eq("requires_maintenance", requires_maintenance === "true");
    if (is_it_system !== undefined) q = q.eq("is_it_system", is_it_system === "true");
    if (search) q = q.or(`name.ilike.%${search}%,asset_number.ilike.%${search}%,serial_number.ilike.%${search}%`);

    q = q.range(Number(offset), Number(offset) + Number(limit) - 1).order("created_at", { ascending: false });

    const { data, error, count } = await q;
    if (error) throw error;
    return res.json({ assets: data ?? [], total: count ?? 0, limit: Number(limit), offset: Number(offset) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/assets
// ---------------------------------------------------------------------------
router.post("/api/assets", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });

  try {
    const { org_id, name, asset_type, description, location, department, responsible_user_id,
      manufacturer, model, serial_number, purchase_date, purchase_cost, currency,
      depreciation_rate, expected_lifetime_years, warranty_expiry,
      requires_calibration, calibration_interval_days,
      requires_maintenance, maintenance_interval_days,
      is_it_system, criticality_level, iso_clause, tags, metadata } = req.body;

    if (!name || !asset_type || !org_id) {
      return res.status(400).json({ error: "name, asset_type, and org_id are required" });
    }

    const today = new Date().toISOString().slice(0, 10);
    const addDays = (days: number) =>
      new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

    const payload: Record<string, any> = {
      org_id, name, asset_type, description, location, department, responsible_user_id,
      manufacturer, model, serial_number, purchase_date, purchase_cost: purchase_cost ? Number(purchase_cost) : null,
      currency: currency ?? "EUR", depreciation_rate, expected_lifetime_years, warranty_expiry,
      requires_calibration: !!requires_calibration, calibration_interval_days,
      requires_maintenance: !!requires_maintenance, maintenance_interval_days,
      is_it_system: !!is_it_system, criticality_level: criticality_level ?? 3,
      iso_clause: iso_clause ?? [], tags: tags ?? [], metadata: metadata ?? {},
      created_by: user.id,
    };

    if (requires_calibration && calibration_interval_days) {
      payload.next_calibration_due = addDays(Number(calibration_interval_days));
    }
    if (requires_maintenance && maintenance_interval_days) {
      payload.next_maintenance_due = addDays(Number(maintenance_interval_days));
    }

    const { data, error } = await supabase.from("assets").insert(payload).select().single();
    if (error) throw error;

    return res.status(201).json({ asset: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/assets/:id
// ---------------------------------------------------------------------------
router.get("/api/assets/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data: asset, error } = await supabase.from("assets").select("*, profiles!responsible_user_id(full_name)").eq("id", id).single();
    if (error || !asset) return res.status(404).json({ error: "Asset not found" });

    const [{ count: calCount }, { count: maintCount }, { count: updCount }, { count: authCount }] = await Promise.all([
      supabase.from("calibration_records").select("id", { count: "exact", head: true }).eq("asset_id", id),
      supabase.from("maintenance_records").select("id", { count: "exact", head: true }).eq("asset_id", id),
      supabase.from("system_updates").select("id", { count: "exact", head: true }).eq("asset_id", id).in("status", ["AVAILABLE","FAILED"]),
      supabase.from("asset_user_authorizations").select("id", { count: "exact", head: true }).eq("asset_id", id).eq("is_active", true),
    ]);

    const { data: latestCal } = await supabase.from("calibration_records").select("*").eq("asset_id", id).order("calibration_date", { ascending: false }).limit(1).maybeSingle();

    return res.json({
      asset,
      latest_calibration: latestCal,
      counts: {
        calibration_records: calCount ?? 0,
        maintenance_records: maintCount ?? 0,
        pending_updates: updCount ?? 0,
        authorized_users: authCount ?? 0,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/assets/:id
// ---------------------------------------------------------------------------
router.patch("/api/assets/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    if (updates.calibration_interval_days && updates.requires_calibration) {
      const { data: current } = await supabase.from("assets").select("last_calibrated_at").eq("id", id).single();
      const base = current?.last_calibrated_at ? new Date(current.last_calibrated_at) : new Date();
      updates.next_calibration_due = new Date(base.getTime() + updates.calibration_interval_days * 86400000).toISOString().slice(0, 10);
    }
    if (updates.maintenance_interval_days && updates.requires_maintenance) {
      const { data: current } = await supabase.from("assets").select("last_maintained_at").eq("id", id).single();
      const base = current?.last_maintained_at ? new Date(current.last_maintained_at) : new Date();
      updates.next_maintenance_due = new Date(base.getTime() + updates.maintenance_interval_days * 86400000).toISOString().slice(0, 10);
    }

    const { data, error } = await supabase.from("assets").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return res.json({ asset: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/assets/:id
// ---------------------------------------------------------------------------
router.delete("/api/assets/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { count: calCount } = await supabase.from("calibration_records").select("id", { count: "exact", head: true }).eq("asset_id", id);
    const { count: maintCount } = await supabase.from("maintenance_records").select("id", { count: "exact", head: true }).eq("asset_id", id);

    if ((calCount ?? 0) > 0 || (maintCount ?? 0) > 0) {
      const { error } = await supabase.from("assets").update({ status: "DECOMMISSIONED", updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      return res.json({ success: true, action: "decommissioned" });
    }

    const { error } = await supabase.from("assets").delete().eq("id", id);
    if (error) throw error;
    return res.json({ success: true, action: "deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/assets/:id/calibration
// ---------------------------------------------------------------------------
router.get("/api/assets/:id/calibration", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = "20", offset = "0" } = req.query;
    const { data, error, count } = await supabase.from("calibration_records")
      .select("*", { count: "exact" })
      .eq("asset_id", id)
      .order("calibration_date", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);
    if (error) throw error;
    return res.json({ records: data ?? [], total: count ?? 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/assets/:id/calibration
// ---------------------------------------------------------------------------
router.post("/api/assets/:id/calibration", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });

  try {
    const { id } = req.params;
    const { calibration_date, next_due_date, performed_by, calibration_lab, certificate_number,
      result, measurement_before, measurement_after, tolerance_spec, pass_criteria, notes } = req.body;

    if (!calibration_date || !next_due_date || !performed_by || !result) {
      return res.status(400).json({ error: "calibration_date, next_due_date, performed_by, and result are required" });
    }

    const { data: asset, error: assetErr } = await supabase.from("assets").select("*").eq("id", id).single();
    if (assetErr || !asset) return res.status(404).json({ error: "Asset not found" });

    let nc_id: string | null = null;
    let nc_created = false;

    if (result === "FAIL") {
      const { data: nc } = await supabase.from("non_conformances").insert({
        org_id: asset.org_id,
        title: `Kalibreringsfel: ${asset.name}`,
        description: `Mätutrustning ${asset.name} (${asset.asset_number}) underkändes vid kalibrering ${calibration_date}. Notering: ${notes ?? ""}`,
        severity: "MAJOR",
        source: "ASSET_CALIBRATION",
        status: "OPEN",
        created_by: user.id,
      }).select("id").single();
      if (nc) {
        nc_id = nc.id;
        nc_created = true;
      }
    }

    const { data: record, error: recErr } = await supabase.from("calibration_records").insert({
      asset_id: id,
      org_id: asset.org_id,
      calibration_date, next_due_date, performed_by, calibration_lab,
      certificate_number, result,
      measurement_before: measurement_before ?? {},
      measurement_after: measurement_after ?? {},
      tolerance_spec, pass_criteria, notes, nc_id,
      created_by: user.id,
    }).select().single();
    if (recErr) throw recErr;

    const newStatus = result === "FAIL" ? "INACTIVE" : "ACTIVE";
    await supabase.from("assets").update({
      last_calibrated_at: new Date(calibration_date).toISOString(),
      next_calibration_due: next_due_date,
      status: newStatus,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (nc_created && nc_id) {
      await emitEntityEvent("nc.raised" as EventType, "nc", nc_id, asset.org_id ?? "", user.id, {
        asset_id: id, asset_name: asset.name, calibration_result: result,
      });
    }

    return res.status(201).json({ calibration: record, asset_updated: true, nc_created });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/assets/:id/maintenance
// ---------------------------------------------------------------------------
router.get("/api/assets/:id/maintenance", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, maintenance_type, limit = "20", offset = "0" } = req.query;

    let q = supabase.from("maintenance_records").select("*", { count: "exact" }).eq("asset_id", id);
    if (status) q = q.eq("status", status as string);
    if (maintenance_type) q = q.eq("maintenance_type", maintenance_type as string);
    q = q.order("scheduled_date", { ascending: false }).range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data, error, count } = await q;
    if (error) throw error;
    return res.json({ records: data ?? [], total: count ?? 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/assets/:id/maintenance
// ---------------------------------------------------------------------------
router.post("/api/assets/:id/maintenance", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });

  try {
    const { id } = req.params;
    const { maintenance_type, scheduled_date, description, performed_by, external_provider, cost, currency } = req.body;

    if (!maintenance_type) return res.status(400).json({ error: "maintenance_type is required" });

    const { data: asset, error: assetErr } = await supabase.from("assets").select("*").eq("id", id).single();
    if (assetErr || !asset) return res.status(404).json({ error: "Asset not found" });

    const { data, error } = await supabase.from("maintenance_records").insert({
      asset_id: id,
      org_id: asset.org_id,
      maintenance_type,
      status: "SCHEDULED",
      scheduled_date,
      description,
      performed_by,
      external_provider,
      cost: cost ? Number(cost) : null,
      currency: currency ?? "EUR",
      created_by: user.id,
    }).select().single();
    if (error) throw error;

    // Update next_maintenance_due if this is further out
    if (scheduled_date && maintenance_type === "PREVENTIVE" && asset.next_maintenance_due) {
      if (scheduled_date > asset.next_maintenance_due) {
        await supabase.from("assets").update({ next_maintenance_due: scheduled_date, updated_at: new Date().toISOString() }).eq("id", id);
      }
    }

    return res.status(201).json({ maintenance: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/assets/:id/maintenance/:maintenanceId
// ---------------------------------------------------------------------------
router.patch("/api/assets/:id/maintenance/:maintenanceId", async (req: Request, res: Response) => {
  try {
    const { id, maintenanceId } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    const { data: existing } = await supabase.from("maintenance_records").select("*").eq("id", maintenanceId).single();
    if (!existing) return res.status(404).json({ error: "Maintenance record not found" });

    const { data: asset } = await supabase.from("assets").select("*").eq("id", id).single();

    if (updates.status === "IN_PROGRESS" && existing.status !== "IN_PROGRESS") {
      updates.started_at = new Date().toISOString();
      await supabase.from("assets").update({ status: "UNDER_MAINTENANCE", updated_at: new Date().toISOString() }).eq("id", id);
    }

    if (updates.status === "COMPLETED" && existing.status !== "COMPLETED") {
      updates.completed_at = new Date().toISOString();

      const assetUpdates: Record<string, any> = {
        last_maintained_at: new Date().toISOString(),
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      };
      if (asset?.maintenance_interval_days) {
        assetUpdates.next_maintenance_due = new Date(Date.now() + asset.maintenance_interval_days * 86400000).toISOString().slice(0, 10);
      }
      await supabase.from("assets").update(assetUpdates).eq("id", id);

      // Auto-create improvement if findings noted
      if (updates.findings && asset) {
        await supabase.from("improvements").insert({
          org_id: asset.org_id,
          title: `Underhållsresultat: ${asset.name}`,
          description: updates.findings,
          type: "CORRECTIVE",
          status: "OPEN",
          source: "ASSET_MAINTENANCE",
        });
      }
    }

    const { data, error } = await supabase.from("maintenance_records").update(updates).eq("id", maintenanceId).select().single();
    if (error) throw error;
    return res.json({ maintenance: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/assets/:id/updates
// ---------------------------------------------------------------------------
router.get("/api/assets/:id/updates", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { severity, status, limit = "20" } = req.query;

    const { data: asset } = await supabase.from("assets").select("is_it_system").eq("id", id).single();
    if (!asset?.is_it_system) return res.status(400).json({ error: "System updates only apply to IT system assets" });

    let q = supabase.from("system_updates").select("*").eq("asset_id", id);
    if (severity) q = q.eq("severity", severity as string);
    if (status) q = q.eq("status", status as string);
    q = q.order("created_at", { ascending: false }).limit(Number(limit));

    const { data, error } = await q;
    if (error) throw error;
    return res.json({ updates: data ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/assets/:id/updates
// ---------------------------------------------------------------------------
router.post("/api/assets/:id/updates", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });

  try {
    const { id } = req.params;
    const { data: asset } = await supabase.from("assets").select("*").eq("id", id).single();
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    if (!asset.is_it_system) return res.status(400).json({ error: "System updates only apply to IT system assets" });

    const { update_title, update_version, severity, description, release_notes, vendor,
      cve_references, scheduled_at, rollback_plan, test_environment_validated } = req.body;

    if (!update_title || !severity) return res.status(400).json({ error: "update_title and severity are required" });

    const { data, error } = await supabase.from("system_updates").insert({
      asset_id: id,
      org_id: asset.org_id,
      update_title, update_version, severity,
      status: "AVAILABLE",
      description, release_notes, vendor,
      cve_references: cve_references ?? [],
      scheduled_at, rollback_plan,
      test_environment_validated: test_environment_validated ?? false,
      created_by: user.id,
    }).select().single();
    if (error) throw error;

    const note = ["MAJOR","CRITICAL"].includes(severity)
      ? "Risk assessment required before applying this update."
      : undefined;

    return res.status(201).json({ update: data, ...(note && { warning: note }) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/assets/:id/updates/:updateId
// ---------------------------------------------------------------------------
router.patch("/api/assets/:id/updates/:updateId", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });

  try {
    const { updateId } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    const { data: existing } = await supabase.from("system_updates").select("*").eq("id", updateId).single();
    if (!existing) return res.status(404).json({ error: "Update not found" });

    if (updates.status === "COMPLETED" && existing.status !== "COMPLETED") {
      if (existing.risk_assessment_required && !existing.risk_assessment_completed && !updates.risk_assessment_completed) {
        return res.status(422).json({ error: "Risk assessment required before applying MAJOR/CRITICAL update" });
      }
      updates.completed_at = new Date().toISOString();
      updates.applied_by = user.id;
    }

    const { data, error } = await supabase.from("system_updates").update(updates).eq("id", updateId).select().single();
    if (error) throw error;
    return res.json({ update: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/assets/:id/authorizations
// ---------------------------------------------------------------------------
router.get("/api/assets/:id/authorizations", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from("asset_user_authorizations")
      .select("*, profiles!user_id(full_name, role, email), profiles!authorized_by(full_name)")
      .eq("asset_id", id)
      .eq("is_active", true);
    if (error) throw error;
    return res.json({ authorizations: data ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/assets/:id/authorizations
// ---------------------------------------------------------------------------
router.post("/api/assets/:id/authorizations", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });

  try {
    const { id } = req.params;
    const { user_id, authorization_level, valid_from, valid_until, notes } = req.body;

    const { data: asset } = await supabase.from("assets").select("*").eq("id", id).single();
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    // Check competency requirements
    const { data: reqs } = await supabase.from("asset_competency_requirements")
      .select("*").eq("asset_id", id).eq("is_mandatory", true);

    let competencyWarning: string | undefined;
    if (reqs && reqs.length > 0) {
      for (const req_ of reqs) {
        if (req_.capability_domain_id) {
          const { data: cap } = await supabase.from("user_capabilities")
            .select("level").eq("user_id", user_id).eq("domain_id", req_.capability_domain_id).maybeSingle();
          if (cap && cap.level < req_.minimum_level) {
            return res.status(422).json({
              error: `User does not meet competency requirements for this asset (required level: ${req_.minimum_level}, current: ${cap.level})`,
            });
          }
          if (!cap) {
            competencyWarning = "No competency data found for user — authorization created but competency could not be verified";
          }
        }
      }
    }

    const { data, error } = await supabase.from("asset_user_authorizations").insert({
      asset_id: id,
      org_id: asset.org_id,
      user_id,
      authorized_by: user.id,
      valid_from: valid_from ?? new Date().toISOString().slice(0, 10),
      valid_until,
      authorization_level: authorization_level ?? "OPERATOR",
      notes,
      is_active: true,
    }).select().single();
    if (error) throw error;

    return res.status(201).json({ authorization: data, ...(competencyWarning && { warning: competencyWarning }) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/assets/:id/authorizations/:authId
// ---------------------------------------------------------------------------
router.delete("/api/assets/:id/authorizations/:authId", async (req: Request, res: Response) => {
  try {
    const { authId } = req.params;
    const { error } = await supabase.from("asset_user_authorizations")
      .update({ is_active: false }).eq("id", authId);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
