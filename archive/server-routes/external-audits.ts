import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

// ---------------------------------------------------------------------------
// Certification bodies registry
// ---------------------------------------------------------------------------
const CERTIFICATION_BODIES = [
  { id: "dekra",          name: "DEKRA",                   logo: "🔵", specialty: ["vehicle_inspection", "process"] },
  { id: "tuv_sud",        name: "TÜV SÜD",                 logo: "🟦", specialty: ["process", "product"] },
  { id: "tuv_nord",       name: "TÜV NORD",                logo: "🟦", specialty: ["process", "energy"] },
  { id: "tuv_rheinland",  name: "TÜV Rheinland",           logo: "🟦", specialty: ["process", "product"] },
  { id: "sgs",            name: "SGS",                     logo: "🔴", specialty: ["management_systems"] },
  { id: "dnv",            name: "DNV",                     logo: "🟢", specialty: ["management_systems", "maritime"] },
  { id: "bureau_veritas", name: "Bureau Veritas",          logo: "🔵", specialty: ["management_systems"] },
  { id: "intertek",       name: "Intertek",                logo: "🔴", specialty: ["product", "management_systems"] },
  { id: "lrqa",           name: "LRQA",                    logo: "🟦", specialty: ["management_systems"] },
  { id: "sp_rise",        name: "RISE Research Institutes", logo: "🇸🇪", specialty: ["testing", "calibration"] },
  { id: "swedac",         name: "Swedac",                  logo: "🇸🇪", specialty: ["accreditation"] },
  { id: "internal",       name: "Intern revision",         logo: "🏢", specialty: ["internal"] },
];

const ISO_STANDARDS = [
  "ISO 9001:2015",
  "ISO 14001:2015",
  "ISO 45001:2018",
  "ISO 27001:2022",
  "ISO/IEC 17025:2017",
  "IATF 16949:2016",
  "ISO 50001:2018",
  "ISO 13485:2016",
];

// ---------------------------------------------------------------------------
// Helper to pick org_id from authenticated context
// ---------------------------------------------------------------------------
// SECURITY FIX (Clawbot): org_id must ONLY come from authenticated user context
function getOrgId(req: Request): string | null {
  return (req as any).user?.org_id ?? null;
}

// ---------------------------------------------------------------------------
// GET /api/external-audits/certification-bodies  — dropdown data
// ---------------------------------------------------------------------------
router.get("/api/external-audits/certification-bodies", (_req: Request, res: Response) => {
  res.json({ bodies: CERTIFICATION_BODIES, standards: ISO_STANDARDS });
});

// ---------------------------------------------------------------------------
// GET /api/external-audits/expiring-certs  — certs expiring within 90 days
// ---------------------------------------------------------------------------
router.get("/api/external-audits/expiring-certs", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: "org_id required" });

  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

  const { data, error } = await supabase
    .from("certification_registry")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "ACTIVE")
    .lte("valid_until", ninetyDaysFromNow.toISOString().split("T")[0])
    .order("valid_until", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ expiring: data ?? [] });
});

// ---------------------------------------------------------------------------
// POST /api/external-audits/spot-check  — random spot check
// ---------------------------------------------------------------------------
router.post("/api/external-audits/spot-check", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: "org_id required" });

  const { assigned_to, trigger = "random", scope_hint } = req.body;
  const userId = (req as any).user?.id;

  // Fetch recent work orders or processes to randomly select from
  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("id, work_order_number, description, status")
    .eq("org_id", orgId)
    .in("status", ["COMPLETED", "IN_PROGRESS"])
    .limit(50)
    .order("created_at", { ascending: false });

  const pool = workOrders ?? [];
  const count = Math.min(pool.length, Math.floor(Math.random() * 3) + 3); // 3-5 items
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, count);

  const checklist = shuffled.map((wo: any) => ({
    work_order_id: wo.id,
    reference: wo.work_order_number ?? wo.id,
    description: wo.description ?? "Arbetsorder",
    items: [
      { label: "Dokumentation fullständig?", checked: false },
      { label: "Processer följda enligt rutin?", checked: false },
      { label: "Avvikelser hanterade korrekt?", checked: false },
      { label: "Kompetenskrav uppfyllda?", checked: false },
      { label: "Spårbarhet säkerställd?", checked: false },
    ],
  }));

  const { data, error } = await supabase
    .from("external_audits")
    .insert({
      org_id: orgId,
      audit_type: "INTERNAL_SPOT_CHECK",
      certification_body: "Internal",
      scope: scope_hint ?? `Slumpmässigt stickprov — ${count} arbetsordrar`,
      status: "IN_PROGRESS",
      is_spot_check: true,
      spot_check_trigger: trigger,
      auditor_name: assigned_to ?? null,
      scheduled_date: new Date().toISOString().split("T")[0],
      findings: checklist,
      corrective_actions: [],
      created_by: userId ?? null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ audit: data, sampled_items: shuffled });
});

// ---------------------------------------------------------------------------
// GET /api/external-audits  — list audits
// ---------------------------------------------------------------------------
router.get("/api/external-audits", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: "org_id required" });

  const { status, audit_type, from, to } = req.query;

  let query = supabase
    .from("external_audits")
    .select("*")
    .eq("org_id", orgId)
    .order("scheduled_date", { ascending: false });

  if (status)     query = query.eq("status", status);
  if (audit_type) query = query.eq("audit_type", audit_type);
  if (from)       query = query.gte("scheduled_date", from as string);
  if (to)         query = query.lte("scheduled_date", to as string);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ audits: data ?? [] });
});

// ---------------------------------------------------------------------------
// POST /api/external-audits  — schedule new audit
// ---------------------------------------------------------------------------
router.post("/api/external-audits", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: "org_id required" });
  const userId = (req as any).user?.id;

  const {
    audit_type, certification_body, certification_standard,
    auditor_name, auditor_company, scheduled_date, scope,
    location, is_spot_check, spot_check_trigger, certificate_number,
    certificate_valid_until, next_audit_date,
  } = req.body;

  if (!audit_type || !scheduled_date) {
    return res.status(400).json({ error: "audit_type and scheduled_date are required" });
  }

  const { data, error } = await supabase
    .from("external_audits")
    .insert({
      org_id: orgId,
      audit_type,
      certification_body: certification_body ?? null,
      certification_standard: certification_standard ?? null,
      auditor_name: auditor_name ?? null,
      auditor_company: auditor_company ?? null,
      scheduled_date,
      scope: scope ?? null,
      location: location ?? null,
      status: "SCHEDULED",
      is_spot_check: is_spot_check ?? false,
      spot_check_trigger: spot_check_trigger ?? null,
      certificate_number: certificate_number ?? null,
      certificate_valid_until: certificate_valid_until ?? null,
      next_audit_date: next_audit_date ?? null,
      findings: [],
      corrective_actions: [],
      created_by: userId ?? null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ audit: data });
});

// ---------------------------------------------------------------------------
// GET /api/external-audits/:id  — single audit detail
// ---------------------------------------------------------------------------
router.get("/api/external-audits/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("external_audits")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return res.status(404).json({ error: "Audit not found" });
  res.json({ audit: data });
});

// ---------------------------------------------------------------------------
// PATCH /api/external-audits/:id/complete  — complete with result & findings
// ---------------------------------------------------------------------------
router.patch("/api/external-audits/:id/complete", async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    result, actual_date, findings, corrective_actions,
    report_url, certificate_number, certificate_valid_until,
    next_audit_date,
  } = req.body;

  if (!result) return res.status(400).json({ error: "result is required" });

  const { data, error } = await supabase
    .from("external_audits")
    .update({
      status: "COMPLETED",
      result,
      actual_date: actual_date ?? new Date().toISOString().split("T")[0],
      findings: findings ?? [],
      corrective_actions: corrective_actions ?? [],
      report_url: report_url ?? null,
      certificate_number: certificate_number ?? null,
      certificate_valid_until: certificate_valid_until ?? null,
      next_audit_date: next_audit_date ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // If passed with certificate, upsert into certification_registry
  if (
    (result === "PASSED" || result === "PASSED_WITH_OBSERVATIONS") &&
    certificate_number
  ) {
    const auditData = data as any;
    await supabase.from("certification_registry").upsert({
      org_id: auditData.org_id,
      standard: auditData.certification_standard ?? "ISO 9001:2015",
      certification_body: auditData.certification_body,
      certificate_number,
      scope: auditData.scope,
      issued_date: actual_date ?? new Date().toISOString().split("T")[0],
      valid_until: certificate_valid_until,
      status: "ACTIVE",
      next_surveillance_date: next_audit_date ?? null,
    }, { onConflict: "certificate_number" });
  }

  res.json({ audit: data });
});

// ---------------------------------------------------------------------------
// GET /api/certifications  — certification registry
// ---------------------------------------------------------------------------
router.get("/api/certifications", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: "org_id required" });

  const { standard, certification_body, status } = req.query;

  let query = supabase
    .from("certification_registry")
    .select("*")
    .eq("org_id", orgId)
    .order("valid_until", { ascending: true });

  if (standard)            query = query.eq("standard", standard);
  if (certification_body)  query = query.eq("certification_body", certification_body);
  if (status)              query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Annotate expiry urgency
  const now = new Date();
  const enriched = (data ?? []).map((cert: any) => {
    const validUntil = new Date(cert.valid_until);
    const daysLeft = Math.ceil((validUntil.getTime() - now.getTime()) / 86400000);
    return {
      ...cert,
      days_until_expiry: daysLeft,
      expiry_urgency:
        daysLeft < 0    ? "EXPIRED" :
        daysLeft <= 90  ? "CRITICAL" :
        daysLeft <= 365 ? "WARNING" : "OK",
    };
  });

  res.json({ certifications: enriched });
});

// ---------------------------------------------------------------------------
// POST /api/certifications  — register new certificate
// ---------------------------------------------------------------------------
router.post("/api/certifications", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: "org_id required" });

  const {
    standard, certification_body, certificate_number,
    scope, issued_date, valid_until, certificate_document_url,
    surveillance_interval_months, next_surveillance_date,
  } = req.body;

  if (!standard || !valid_until) {
    return res.status(400).json({ error: "standard and valid_until are required" });
  }

  const { data, error } = await supabase
    .from("certification_registry")
    .insert({
      org_id: orgId,
      standard,
      certification_body: certification_body ?? null,
      certificate_number: certificate_number ?? null,
      scope: scope ?? null,
      issued_date: issued_date ?? null,
      valid_until,
      status: "ACTIVE",
      certificate_document_url: certificate_document_url ?? null,
      surveillance_interval_months: surveillance_interval_months ?? 12,
      next_surveillance_date: next_surveillance_date ?? null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ certification: data });
});

// ---------------------------------------------------------------------------
// PATCH /api/certifications/:id  — update certificate
// ---------------------------------------------------------------------------
router.patch("/api/certifications/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  delete updates.id;
  delete updates.org_id;

  const { data, error } = await supabase
    .from("certification_registry")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ certification: data });
});

export default router;
