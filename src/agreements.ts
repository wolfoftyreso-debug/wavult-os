// ---------------------------------------------------------------------------
// Agreements, Job Descriptions & Document Templates
// ISO 5.3, 7.2, 8.4.3, GDPR Art 28
// ---------------------------------------------------------------------------

import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

// ===== AGREEMENTS =====

router.get("/api/agreements", async (req: Request, res: Response) => {
  try {
    const { org_id, agreement_type, status, linked_user_id, linked_supplier_id, expiring, search, limit = "50", offset = "0" } = req.query;
    let q = supabase.from("agreements").select("*, companies!party_external_company_id(name)", { count: "exact" });
    if (org_id) q = q.eq("org_id", org_id as string);
    if (agreement_type) q = q.eq("agreement_type", agreement_type as string);
    if (status) q = q.eq("status", status as string);
    if (linked_user_id) q = q.eq("linked_user_id", linked_user_id as string);
    if (linked_supplier_id) q = q.eq("linked_supplier_id", linked_supplier_id as string);
    if (expiring === "true") {
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      q = q.lte("expiration_date", in30).in("status", ["ACTIVE", "EXPIRING"]);
    }
    if (search) q = q.or(`title.ilike.%${search}%,code.ilike.%${search}%,party_external_name.ilike.%${search}%`);
    q = q.order("created_at", { ascending: false }).range(Number(offset), Number(offset) + Number(limit) - 1);
    const { data, error, count } = await q;
    if (error) throw error;
    return res.json({ agreements: data ?? [], total: count ?? 0 });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/api/agreements", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });
  try {
    const payload = { ...req.body, created_by: user.id, status: "DRAFT" };
    delete payload.code; // let DB trigger auto-generate
    const { data, error } = await supabase.from("agreements").insert(payload).select().single();
    if (error) throw error;

    let template_variables: any[] = [];
    if (req.body.template_id) {
      const { data: tpl } = await supabase.from("document_templates").select("variables").eq("id", req.body.template_id).single();
      if (tpl) template_variables = tpl.variables;
    }
    return res.status(201).json({ agreement: data, template_variables });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/api/agreements/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data: agreement, error } = await supabase.from("agreements")
      .select("*, companies!party_external_company_id(name, email)").eq("id", id).single();
    if (error || !agreement) return res.status(404).json({ error: "Agreement not found" });

    const [{ data: clauses }, { data: amendments }] = await Promise.all([
      supabase.from("agreement_clauses").select("*").eq("agreement_id", id).order("clause_number"),
      supabase.from("agreement_amendments").select("*").eq("agreement_id", id).order("amendment_number"),
    ]);

    let linked_user = null;
    if (agreement.linked_user_id) {
      const { data: u } = await supabase.from("profiles").select("id, full_name, email, role").eq("id", agreement.linked_user_id).single();
      linked_user = u;
    }

    return res.json({ agreement, clauses: clauses ?? [], amendments: amendments ?? [], linked_user });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.patch("/api/agreements/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("agreements").update(updates).eq("id", id).select().single();
    if (error) throw error;

    if (req.body.status) {
      await supabase.from("audit_logs").insert({
        entity_type: "agreement", entity_id: id, action: "status_changed",
        metadata: { new_status: req.body.status },
      });
    }
    return res.json({ agreement: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.patch("/api/agreements/:id/sign", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });
  try {
    const { id } = req.params;
    const { signature_method, signed_by_external } = req.body;

    const updates: Record<string, any> = {
      signed_at: new Date().toISOString(),
      signed_by_internal: user.id,
      signature_method,
      signed_by_external,
      updated_at: new Date().toISOString(),
    };

    if (signed_by_external) {
      updates.countersigned_at = new Date().toISOString();
      updates.status = "ACTIVE";
    } else {
      updates.status = "PENDING_SIGNATURE";
    }

    const { data: existing } = await supabase.from("agreements").select("*").eq("id", id).single();
    if (!existing) return res.status(404).json({ error: "Agreement not found" });

    if (!updates.effective_date && !existing.effective_date && updates.status === "ACTIVE") {
      updates.effective_date = new Date().toISOString().slice(0, 10);
    }

    const { data, error } = await supabase.from("agreements").update(updates).eq("id", id).select().single();
    if (error) throw error;

    // If EMPLOYMENT and linked_user_id: auto-create job assignment
    if (data.agreement_type === "EMPLOYMENT" && data.linked_user_id && data.status === "ACTIVE") {
      const { data: jobDesc } = await supabase.from("job_descriptions")
        .select("id").eq("org_id", data.org_id).eq("status", "ACTIVE").limit(1).maybeSingle();
      if (jobDesc) {
        await supabase.from("user_job_assignments").insert({
          org_id: data.org_id, user_id: data.linked_user_id,
          job_description_id: jobDesc.id, agreement_id: data.id,
          start_date: data.effective_date ?? new Date().toISOString().slice(0, 10),
        });
      }
    }

    return res.json({ agreement: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/api/agreements/:id/amendments", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });
  try {
    const { id } = req.params;
    const { count } = await supabase.from("agreement_amendments").select("id", { count: "exact", head: true }).eq("agreement_id", id);
    const { data, error } = await supabase.from("agreement_amendments").insert({
      ...req.body, agreement_id: id, amendment_number: (count ?? 0) + 1, created_by: user.id,
    }).select().single();
    if (error) throw error;
    return res.status(201).json({ amendment: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/api/agreements/:id/terminate", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });
  try {
    const { id } = req.params;
    const { termination_reason, termination_notice_given_at } = req.body;
    if (!termination_reason) return res.status(400).json({ error: "termination_reason required" });

    const { data: existing } = await supabase.from("agreements").select("*").eq("id", id).single();
    if (!existing) return res.status(404).json({ error: "Agreement not found" });

    const { data, error } = await supabase.from("agreements").update({
      status: "TERMINATED", terminated_date: new Date().toISOString().slice(0, 10),
      termination_reason, termination_notice_given_at, updated_at: new Date().toISOString(),
    }).eq("id", id).select().single();
    if (error) throw error;

    if (existing.agreement_type === "EMPLOYMENT" && existing.linked_user_id) {
      await supabase.from("tasks").insert({
        org_id: existing.org_id, title: `Avsluta anställning: avtal ${existing.code} terminerat`,
        description: `Anställningsavtalet har avslutats. Orsak: ${termination_reason}. Starta offboarding.`,
        status: "TODO", priority: "HIGH", type: "HR",
      }); // LEGAL_REVIEW_REQUIRED
    }
    if (existing.agreement_type === "SUPPLIER" && existing.linked_supplier_id) {
      await supabase.from("suppliers").update({ status: "DEACTIVATED", updated_at: new Date().toISOString() })
        .eq("id", existing.linked_supplier_id);
    }
    return res.json({ agreement: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/api/agreements/:id/renew", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });
  try {
    const { id } = req.params;
    const { effective_date, expiration_date } = req.body;
    const { data: old } = await supabase.from("agreements").select("*").eq("id", id).single();
    if (!old) return res.status(404).json({ error: "Agreement not found" });

    const { data: renewed, error } = await supabase.from("agreements").insert({
      org_id: old.org_id, agreement_type: old.agreement_type, title: old.title,
      party_internal: old.party_internal, party_external_company_id: old.party_external_company_id,
      party_external_name: old.party_external_name, jurisdiction_id: old.jurisdiction_id,
      governing_law: old.governing_law, confidentiality_level: old.confidentiality_level,
      effective_date: effective_date ?? old.expiration_date,
      expiration_date: expiration_date ?? null,
      contract_value: old.contract_value, contract_currency: old.contract_currency,
      linked_user_id: old.linked_user_id, linked_supplier_id: old.linked_supplier_id,
      parent_agreement_id: old.id, status: "DRAFT", created_by: user.id,
      auto_renew: old.auto_renew, auto_renew_period_months: old.auto_renew_period_months,
      version: old.version + 1,
    }).select().single();
    if (error) throw error;

    await supabase.from("agreements").update({ status: "RENEWED", updated_at: new Date().toISOString() }).eq("id", id);
    return res.status(201).json({ agreement: renewed, previous_id: id });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/api/agreements/expiring", async (req: Request, res: Response) => {
  try {
    const { org_id, days = "90" } = req.query;
    const cutoff = new Date(Date.now() + Number(days) * 86400000).toISOString().slice(0, 10);
    let q = supabase.from("agreements").select("*").in("status", ["ACTIVE", "EXPIRING"]).lte("expiration_date", cutoff);
    if (org_id) q = q.eq("org_id", org_id as string);
    const { data, error } = await q.order("expiration_date");
    if (error) throw error;
    return res.json({ agreements: data ?? [] });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/api/agreements/user/:userId", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("agreements").select("*")
      .eq("linked_user_id", req.params.userId).order("created_at", { ascending: false });
    if (error) throw error;
    return res.json({ agreements: data ?? [] });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/api/agreements/supplier/:supplierId", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("agreements").select("*")
      .eq("linked_supplier_id", req.params.supplierId).order("created_at", { ascending: false });
    if (error) throw error;
    return res.json({ agreements: data ?? [] });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// ===== CLAUSES =====

router.post("/api/agreements/:id/clauses", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("agreement_clauses").insert({ ...req.body, agreement_id: req.params.id }).select().single();
    if (error) throw error;
    return res.status(201).json({ clause: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/api/agreements/:id/clauses", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("agreement_clauses").select("*").eq("agreement_id", req.params.id).order("clause_number");
    if (error) throw error;
    return res.json({ clauses: data ?? [] });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.patch("/api/agreements/clauses/:clauseId", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("agreement_clauses").update(req.body).eq("id", req.params.clauseId).select().single();
    if (error) throw error;
    return res.json({ clause: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.delete("/api/agreements/clauses/:clauseId", async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.from("agreement_clauses").delete().eq("id", req.params.clauseId);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// ===== JOB DESCRIPTIONS =====

router.get("/api/job-descriptions", async (req: Request, res: Response) => {
  try {
    const { org_id, status, role_code, department, search, limit = "50", offset = "0" } = req.query;
    let q = supabase.from("job_descriptions").select("*", { count: "exact" });
    if (org_id) q = q.eq("org_id", org_id as string);
    if (status) q = q.eq("status", status as string);
    if (role_code) q = q.eq("role_code", role_code as string);
    if (department) q = q.eq("department", department as string);
    if (search) q = q.or(`title.ilike.%${search}%,code.ilike.%${search}%,purpose.ilike.%${search}%`);
    q = q.order("code").range(Number(offset), Number(offset) + Number(limit) - 1);
    const { data, error, count } = await q;
    if (error) throw error;
    return res.json({ job_descriptions: data ?? [], total: count ?? 0 });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/api/job-descriptions", async (req: Request, res: Response) => {
  try {
    const payload = { ...req.body };
    delete payload.code; // auto-generated
    const { data, error } = await supabase.from("job_descriptions").insert(payload).select().single();
    if (error) throw error;
    return res.status(201).json({ job_description: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/api/job-descriptions/:id", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("job_descriptions").select("*").eq("id", req.params.id).single();
    if (error || !data) return res.status(404).json({ error: "Job description not found" });

    const { data: assignments } = await supabase.from("user_job_assignments")
      .select("*, profiles!user_id(full_name, email, role)")
      .eq("job_description_id", req.params.id).is("end_date", null);

    return res.json({ job_description: data, assignments: assignments ?? [] });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.patch("/api/job-descriptions/:id", async (req: Request, res: Response) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("job_descriptions").update(updates).eq("id", req.params.id).select().single();
    if (error) throw error;
    return res.json({ job_description: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/api/job-descriptions/:id/gap-analysis", async (req: Request, res: Response) => {
  try {
    const { data: jd } = await supabase.from("job_descriptions").select("*").eq("id", req.params.id).single();
    if (!jd) return res.status(404).json({ error: "Job description not found" });

    const { data: assignments } = await supabase.from("user_job_assignments")
      .select("user_id, profiles!user_id(full_name)")
      .eq("job_description_id", req.params.id).is("end_date", null);

    const requiredCaps = jd.required_capabilities as any[] ?? [];
    const users: any[] = [];

    for (const a of assignments ?? []) {
      const gaps: any[] = [];
      for (const req_ of requiredCaps) {
        const { data: userCap } = await supabase.from("user_capabilities")
          .select("level").eq("user_id", a.user_id).eq("domain_id", req_.capability_id).maybeSingle();
        const currentLevel = userCap?.level ?? 0;
        const reqLevel = parseInt(req_.min_level?.replace("L", "") ?? "3");
        if (currentLevel < reqLevel) {
          gaps.push({
            capability_id: req_.capability_id, required_level: reqLevel,
            current_level: currentLevel, gap: reqLevel - currentLevel, critical: req_.critical ?? false,
          });
        }
      }
      users.push({ user_id: a.user_id, full_name: (a as any).profiles?.full_name, gaps });
    }

    return res.json({ job_description: jd.title, users });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/api/job-assignments", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("user_job_assignments").insert(req.body).select().single();
    if (error) throw error;

    // Check if user has employment agreement
    let warning: string | undefined;
    const { count } = await supabase.from("agreements").select("id", { count: "exact", head: true })
      .eq("linked_user_id", req.body.user_id).eq("agreement_type", "EMPLOYMENT").in("status", ["ACTIVE", "EXPIRING"]);
    if ((count ?? 0) === 0) {
      warning = "Användaren har inget aktivt anställningsavtal. ISO 5.3 kräver dokumenterat avtal.";
    }

    return res.status(201).json({ assignment: data, ...(warning && { warning }) });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/api/job-assignments/user/:userId", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("user_job_assignments")
      .select("*, job_descriptions!job_description_id(*)")
      .eq("user_id", req.params.userId);
    if (error) throw error;
    return res.json({ assignments: data ?? [] });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// ===== DOCUMENT TEMPLATES =====

router.get("/api/templates", async (req: Request, res: Response) => {
  try {
    const { org_id, template_type, status, language_code } = req.query;
    let q = supabase.from("document_templates").select("*");
    if (org_id) q = q.eq("org_id", org_id as string);
    if (template_type) q = q.eq("template_type", template_type as string);
    if (status) q = q.eq("status", status as string);
    if (language_code) q = q.eq("language_code", language_code as string);
    const { data, error } = await q.order("code");
    if (error) throw error;
    return res.json({ templates: data ?? [] });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/api/templates", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("document_templates").insert(req.body).select().single();
    if (error) throw error;
    return res.status(201).json({ template: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.patch("/api/templates/:id", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("document_templates")
      .update({ ...req.body, updated_at: new Date().toISOString() }).eq("id", req.params.id).select().single();
    if (error) throw error;
    return res.json({ template: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/api/templates/:id/variables", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("document_templates").select("variables, name, code").eq("id", req.params.id).single();
    if (error || !data) return res.status(404).json({ error: "Template not found" });
    return res.json({ template_code: data.code, template_name: data.name, variables: data.variables });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/api/templates/:id/preview", async (req: Request, res: Response) => {
  try {
    const { data: tpl, error } = await supabase.from("document_templates").select("*").eq("id", req.params.id).single();
    if (error || !tpl) return res.status(404).json({ error: "Template not found" });

    let content = tpl.template_content ?? "";
    const vars = tpl.variables as any[] ?? [];
    for (const v of vars) {
      const sampleValue = v.default ?? v.label ?? `[${v.key}]`;
      content = content.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, "g"), sampleValue);
    }
    return res.json({ preview: content, template: tpl.name });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/api/templates/:id/generate", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });
  try {
    const { variable_values, linked_agreement_id, linked_entity_type, linked_entity_id } = req.body;
    const { data: tpl, error: tplErr } = await supabase.from("document_templates").select("*").eq("id", req.params.id).single();
    if (tplErr || !tpl) return res.status(404).json({ error: "Template not found" });

    let content = tpl.template_content ?? "";
    const vals = variable_values ?? {};
    for (const [key, value] of Object.entries(vals)) {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value));
    }

    // Remove any remaining unfilled variables
    content = content.replace(/\{\{[^}]+\}\}/g, "[EJ IFYLLT]");

    const { data: doc, error } = await supabase.from("generated_documents").insert({
      org_id: tpl.org_id, template_id: tpl.id,
      title: `${tpl.name} — ${new Date().toISOString().slice(0, 10)}`,
      generated_by: user.id, variable_values: vals,
      output_format: tpl.format, linked_agreement_id, linked_entity_type, linked_entity_id,
    }).select().single();
    if (error) throw error;

    return res.status(201).json({ document: doc, content });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/api/documents/generated", async (req: Request, res: Response) => {
  try {
    const { org_id, template_id, linked_entity_type, limit = "50" } = req.query;
    let q = supabase.from("generated_documents").select("*, document_templates!template_id(name, code)");
    if (org_id) q = q.eq("org_id", org_id as string);
    if (template_id) q = q.eq("template_id", template_id as string);
    if (linked_entity_type) q = q.eq("linked_entity_type", linked_entity_type as string);
    q = q.order("generated_at", { ascending: false }).limit(Number(limit));
    const { data, error } = await q;
    if (error) throw error;
    return res.json({ documents: data ?? [] });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/api/documents/generated/:id", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("generated_documents")
      .select("*, document_templates!template_id(*)").eq("id", req.params.id).single();
    if (error || !data) return res.status(404).json({ error: "Document not found" });
    return res.json({ document: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

export default router;
