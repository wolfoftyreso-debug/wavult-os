/**
 * Swedac Compliance API
 * ISO/IEC 17020 — Inspection Bodies
 * ISO/IEC 17025 — Calibration Labs
 * ISO 9001     — Quality Management
 *
 * Endpoints:
 *  GET  /api/swedac/status
 *  GET  /api/swedac/checklist
 *  PUT  /api/swedac/checklist/:id
 *  GET  /api/swedac/calibration
 *  POST /api/swedac/calibration
 *  PUT  /api/swedac/calibration/:id
 *  GET  /api/swedac/calibration/due-soon
 *  GET  /api/swedac/competence
 *  POST /api/swedac/competence
 *  GET  /api/swedac/impartiality
 *  POST /api/swedac/impartiality
 *  GET  /api/swedac/readiness-report
 *  POST /api/swedac/generate-report
 */

import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getOrgId(req: Request): string {
  return (req as any).user?.org_id ?? "00020002-0000-0000-0000-000000000001";
}

function daysUntil(date: string): number {
  const now = new Date();
  const d = new Date(date);
  return Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Status Overview ──────────────────────────────────────────────────────────

router.get("/status", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);

  const [checklistRes, calRes, impartRes] = await Promise.all([
    supabase
      .from("swedac_compliance_items")
      .select("status")
      .eq("org_id", orgId),
    supabase
      .from("swedac_calibration_records")
      .select("equipment_name, valid_until, status")
      .eq("org_id", orgId),
    supabase
      .from("impartiality_declarations")
      .select("declarer_name, valid_until")
      .eq("org_id", orgId),
  ]);

  const items = checklistRes.data ?? [];
  const cals = calRes.data ?? [];
  const impart = impartRes.data ?? [];

  const total = items.length;
  const compliant = items.filter((i) => i.status === "COMPLIANT").length;
  const partial = items.filter((i) => i.status === "PARTIAL").length;
  const pct = total > 0 ? Math.round(((compliant + partial * 0.5) / total) * 100) : 0;

  const criticalGaps: string[] = [];

  // Calibration issues
  cals.forEach((cal) => {
    const days = daysUntil(cal.valid_until);
    if (days < 0) {
      criticalGaps.push(`${cal.equipment_name} — kalibrering utgången (${-days} dagar sedan)`);
    } else if (days < 30) {
      criticalGaps.push(`${cal.equipment_name} — kalibrering utgår om ${days} dagar`);
    }
  });

  // Impartiality missing / old
  impart.forEach((decl) => {
    if (decl.valid_until) {
      const days = daysUntil(decl.valid_until);
      if (days < 30) {
        criticalGaps.push(`Impartialitetdeklaration för ${decl.declarer_name} utgår om ${days} dagar`);
      }
    }
  });

  res.json({
    compliant_pct: pct,
    total_items: total,
    compliant_count: compliant,
    partial_count: partial,
    non_compliant_count: items.filter((i) => i.status === "NON_COMPLIANT").length,
    critical_gaps: criticalGaps,
    calibration_summary: {
      total: cals.length,
      valid: cals.filter((c) => c.status === "VALID").length,
      due_soon: cals.filter((c) => c.status === "DUE_SOON").length,
      expired: cals.filter((c) => c.status === "EXPIRED").length,
    },
  });
});

// ─── Compliance Checklist ─────────────────────────────────────────────────────

router.get("/checklist", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const { data, error } = await supabase
    .from("swedac_compliance_items")
    .select("*")
    .eq("org_id", orgId)
    .order("standard")
    .order("clause");
  if (error) return res.status(500).json({ error: error.message });

  // Group by standard
  const grouped: Record<string, typeof data> = {};
  for (const item of data ?? []) {
    const key = item.standard;
    if (!grouped[key]) grouped[key] = [];
    grouped[key]!.push(item);
  }
  res.json({ items: data, grouped });
});

router.put("/checklist/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, evidence_description, evidence_url, gap_description, action_required, action_owner, action_due } = req.body;

  const { data, error } = await supabase
    .from("swedac_compliance_items")
    .update({
      status,
      evidence_description,
      evidence_url,
      gap_description,
      action_required,
      action_owner,
      action_due,
      last_assessed_at: new Date().toISOString(),
      last_assessed_by: (req as any).user?.name ?? "System",
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── Calibration Records ──────────────────────────────────────────────────────

router.get("/calibration", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const { data, error } = await supabase
    .from("swedac_calibration_records")
    .select("*")
    .eq("org_id", orgId)
    .order("valid_until", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });

  // Enrich with days_remaining
  const enriched = (data ?? []).map((rec) => ({
    ...rec,
    days_remaining: daysUntil(rec.valid_until),
  }));
  res.json(enriched);
});

router.get("/calibration/due-soon", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 60);

  const { data, error } = await supabase
    .from("swedac_calibration_records")
    .select("*")
    .eq("org_id", orgId)
    .lte("valid_until", cutoff.toISOString().split("T")[0])
    .order("valid_until");
  if (error) return res.status(500).json({ error: error.message });

  res.json(
    (data ?? []).map((rec) => ({
      ...rec,
      days_remaining: daysUntil(rec.valid_until),
    }))
  );
});

router.post("/calibration", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const { data, error } = await supabase
    .from("swedac_calibration_records")
    .insert({ ...req.body, org_id: orgId })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put("/calibration/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("swedac_calibration_records")
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── Competence Records ───────────────────────────────────────────────────────

router.get("/competence", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const { data, error } = await supabase
    .from("swedac_competence_records")
    .select("*")
    .eq("org_id", orgId)
    .order("technician_name")
    .order("valid_until");
  if (error) return res.status(500).json({ error: error.message });

  // Group by technician
  const byTech: Record<string, any[]> = {};
  for (const rec of data ?? []) {
    if (!byTech[rec.technician_name]) byTech[rec.technician_name] = [];
    byTech[rec.technician_name]!.push({
      ...rec,
      days_remaining: rec.valid_until ? daysUntil(rec.valid_until) : null,
    });
  }
  res.json({ records: data, by_technician: byTech });
});

router.post("/competence", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const { data, error } = await supabase
    .from("swedac_competence_records")
    .insert({ ...req.body, org_id: orgId })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ─── Impartiality Declarations ────────────────────────────────────────────────

router.get("/impartiality", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const { data, error } = await supabase
    .from("impartiality_declarations")
    .select("*")
    .eq("org_id", orgId)
    .order("signed_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  res.json(
    (data ?? []).map((decl) => ({
      ...decl,
      days_until_expiry: decl.valid_until ? daysUntil(decl.valid_until) : null,
    }))
  );
});

router.post("/impartiality", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const { data, error } = await supabase
    .from("impartiality_declarations")
    .insert({ ...req.body, org_id: orgId })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ─── Readiness Report ─────────────────────────────────────────────────────────

router.get("/readiness-report", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);

  const [itemsRes, calRes, compRes, impartRes] = await Promise.all([
    supabase.from("swedac_compliance_items").select("*").eq("org_id", orgId),
    supabase.from("swedac_calibration_records").select("*").eq("org_id", orgId),
    supabase.from("swedac_competence_records").select("*").eq("org_id", orgId),
    supabase.from("impartiality_declarations").select("*").eq("org_id", orgId),
  ]);

  const items = itemsRes.data ?? [];
  const cals = calRes.data ?? [];
  const comps = compRes.data ?? [];
  const imparts = impartRes.data ?? [];

  const total = items.length;
  const compliant = items.filter((i) => i.status === "COMPLIANT").length;
  const partial = items.filter((i) => i.status === "PARTIAL").length;
  const overall_pct = total > 0 ? Math.round(((compliant + partial * 0.5) / total) * 100) : 0;

  const criticalIssues: string[] = [];

  // Expired / expiring calibration
  cals.forEach((cal) => {
    const days = daysUntil(cal.valid_until);
    if (days < 0) criticalIssues.push(`KALIBRERING UTGÅNGEN: ${cal.equipment_name}`);
    else if (days < 30) criticalIssues.push(`Kalibrering utgår snart: ${cal.equipment_name} (${days} dagar)`);
  });

  // Expired competence
  comps.forEach((comp) => {
    if (comp.valid_until) {
      const days = daysUntil(comp.valid_until);
      if (days < 0) criticalIssues.push(`KOMPETENS UTGÅNGEN: ${comp.technician_name} — ${comp.certificate_name}`);
    }
  });

  // Missing/expired impartiality
  const currentYear = new Date().getFullYear();
  imparts.forEach((decl) => {
    if (decl.valid_until && daysUntil(decl.valid_until) < 0) {
      criticalIssues.push(`Impartialitetdeklaration utgången: ${decl.declarer_name}`);
    }
  });

  const byClause = items.map((item) => ({
    standard: item.standard,
    clause: item.clause,
    requirement: item.requirement_text,
    status: item.status,
    gap: item.gap_description,
    action: item.action_required,
    due: item.action_due,
  }));

  const readyForInspection = overall_pct >= 80 && criticalIssues.length === 0;

  res.json({
    generated_at: new Date().toISOString(),
    overall_pct,
    total_items: total,
    compliant,
    partial,
    non_compliant: items.filter((i) => i.status === "NON_COMPLIANT").length,
    critical_issues: criticalIssues,
    ready_for_inspection: readyForInspection,
    by_clause: byClause,
    calibration_status: cals.map((c) => ({
      name: c.equipment_name,
      status: c.status,
      valid_until: c.valid_until,
      days_remaining: daysUntil(c.valid_until),
    })),
    competence_summary: {
      total: comps.length,
      active: comps.filter((c) => c.status === "ACTIVE").length,
      expired: comps.filter((c) => c.status === "EXPIRED").length,
    },
    impartiality_summary: {
      total: imparts.length,
      valid: imparts.filter((d) => !d.valid_until || daysUntil(d.valid_until) > 0).length,
    },
  });
});

// ─── Generate Report (PDF-ready JSON) ────────────────────────────────────────

router.post("/generate-report", async (req: Request, res: Response) => {
  // Proxy to readiness-report data and format for export
  const orgId = getOrgId(req);

  const [itemsRes, calRes, compRes, impartRes] = await Promise.all([
    supabase.from("swedac_compliance_items").select("*").eq("org_id", orgId).order("standard").order("clause"),
    supabase.from("swedac_calibration_records").select("*").eq("org_id", orgId).order("valid_until"),
    supabase.from("swedac_competence_records").select("*").eq("org_id", orgId).order("technician_name"),
    supabase.from("impartiality_declarations").select("*").eq("org_id", orgId).order("signed_at"),
  ]);

  const report = {
    title: "Ackrediteringsberedskapsrapport — ISO/IEC 17020",
    generated_at: new Date().toISOString(),
    org_id: orgId,
    sections: {
      compliance_checklist: itemsRes.data ?? [],
      calibration_records: (calRes.data ?? []).map((r) => ({
        ...r,
        days_remaining: daysUntil(r.valid_until),
      })),
      competence_records: compRes.data ?? [],
      impartiality_declarations: (impartRes.data ?? []).map((d) => ({
        ...d,
        days_until_expiry: d.valid_until ? daysUntil(d.valid_until) : null,
      })),
    },
  };

  res.json(report);
});

export default router;
