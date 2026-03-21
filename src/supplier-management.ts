import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

// ---------------------------------------------------------------------------
// Allowed status transition map
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<string, string[]> = {
  PROSPECT: ["UNDER_EVALUATION"],
  UNDER_EVALUATION: ["CONDITIONALLY_APPROVED"],
  CONDITIONALLY_APPROVED: ["APPROVED"],
  APPROVED: ["ON_WATCH"],
  ON_WATCH: ["SUSPENDED"],
  SUSPENDED: ["BLOCKED"],
};

// ---------------------------------------------------------------------------
// GET /api/suppliers
// ---------------------------------------------------------------------------

router.get("/api/suppliers", async (req: Request, res: Response) => {
  try {
    const {
      org_id,
      status,
      category,
      criticality,
      min_rating,
      reapproval_status,
      search,
      limit = "50",
      offset = "0",
    } = req.query as Record<string, string | undefined>;

    let query = supabase
      .from("suppliers")
      .select("*, companies(id, name)", { count: "exact" });

    if (org_id) query = query.eq("org_id", org_id);
    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category", category);
    if (criticality) query = query.eq("criticality", criticality);
    if (min_rating) query = query.gte("current_rating", parseFloat(min_rating));
    if (search) query = query.ilike("companies.name", `%${search}%`);

    if (reapproval_status === "OVERDUE") {
      query = query.lt("next_reapproval_date", new Date().toISOString().split("T")[0]);
    } else if (reapproval_status === "DUE_SOON") {
      const today = new Date();
      const soon = new Date(today);
      soon.setDate(today.getDate() + 30);
      query = query
        .gte("next_reapproval_date", today.toISOString().split("T")[0])
        .lte("next_reapproval_date", soon.toISOString().split("T")[0]);
    }

    query = query
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)
      .order("created_at", { ascending: false });

    const { data: suppliers, error, count } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ suppliers: suppliers ?? [], total: count ?? 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/suppliers
// ---------------------------------------------------------------------------

router.post("/api/suppliers", async (req: Request, res: Response) => {
  try {
    const {
      org_id,
      company_id,
      company_name,
      category,
      criticality,
      quality_contact,
      quality_contact_email,
      commercial_contact,
      responsible_id,
      contract_start,
      contract_end,
      contract_value_annual,
      lead_time_days,
      single_source,
      certifications,
    } = req.body;

    let resolvedCompanyId: string | null = company_id ?? null;

    // Auto-create company if only name is provided
    if (!resolvedCompanyId && company_name) {
      const { data: newCompany, error: companyError } = await supabase
        .from("companies")
        .insert({ name: company_name, org_id: org_id ?? null })
        .select("id")
        .single();

      if (companyError) {
        return res.status(500).json({ error: companyError.message });
      }

      resolvedCompanyId = newCompany.id;
    }

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .insert({
        org_id: org_id ?? null,
        company_id: resolvedCompanyId,
        category: category ?? null,
        criticality: criticality ?? null,
        quality_contact: quality_contact ?? null,
        quality_contact_email: quality_contact_email ?? null,
        commercial_contact: commercial_contact ?? null,
        responsible_id: responsible_id ?? null,
        contract_start: contract_start ?? null,
        contract_end: contract_end ?? null,
        contract_value_annual: contract_value_annual ?? null,
        lead_time_days: lead_time_days ?? null,
        single_source: single_source ?? false,
        certifications: certifications ?? null,
        status: "PROSPECT",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(supplier);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/suppliers/approved-list
// ---------------------------------------------------------------------------

router.get("/api/suppliers/approved-list", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query as Record<string, string | undefined>;

    let query = supabase
      .from("approved_supplier_lists")
      .select("*")
      .eq("is_current", true);

    if (org_id) {
      query = query.eq("org_id", org_id);
    }

    const { data, error } = await query.order("valid_from", { ascending: false }).limit(1).single();

    if (error) {
      return res.status(404).json({ error: "No current approved supplier list found" });
    }

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/suppliers/approved-list/generate
// ---------------------------------------------------------------------------

router.post("/api/suppliers/approved-list/generate", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { org_id } = req.body;

    // Collect all APPROVED and CONDITIONALLY_APPROVED suppliers
    let suppliersQuery = supabase
      .from("suppliers")
      .select(`
        id,
        supplier_code,
        category,
        criticality,
        current_rating,
        approved_at,
        certifications,
        quality_contact,
        companies(id, name)
      `)
      .in("status", ["APPROVED", "CONDITIONALLY_APPROVED"]);

    if (org_id) {
      suppliersQuery = suppliersQuery.eq("org_id", org_id);
    }

    const { data: suppliers, error: suppliersError } = await suppliersQuery;

    if (suppliersError) {
      return res.status(500).json({ error: suppliersError.message });
    }

    // Fetch latest evaluation per supplier
    const supplierIds = (suppliers ?? []).map((s: any) => s.id);
    const evaluationsMap: Record<string, any> = {};

    if (supplierIds.length > 0) {
      const { data: evaluations } = await supabase
        .from("supplier_evaluations")
        .select("supplier_id, overall_rating, weighted_score, evaluation_date")
        .in("supplier_id", supplierIds)
        .order("evaluation_date", { ascending: false });

      for (const ev of evaluations ?? []) {
        if (!evaluationsMap[ev.supplier_id]) {
          evaluationsMap[ev.supplier_id] = ev;
        }
      }
    }

    // Build JSON snapshot
    const snapshot = (suppliers ?? []).map((s: any) => ({
      id: s.id,
      supplier_code: s.supplier_code,
      name: s.companies?.name ?? null,
      category: s.category,
      criticality: s.criticality,
      current_rating: s.current_rating,
      overall_rating: evaluationsMap[s.id]?.overall_rating ?? null,
      approved_at: s.approved_at,
      certifications: s.certifications,
      quality_contact: s.quality_contact,
    }));

    const today = new Date().toISOString().split("T")[0];

    // Mark all previous lists as not current for this org
    const deactivateQuery = supabase
      .from("approved_supplier_lists")
      .update({ is_current: false });

    if (org_id) {
      await deactivateQuery.eq("org_id", org_id);
    } else {
      await deactivateQuery;
    }

    // Insert new approved_supplier_list
    const { data: list, error: listError } = await supabase
      .from("approved_supplier_lists")
      .insert({
        org_id: org_id ?? null,
        valid_from: today,
        suppliers: snapshot,
        is_current: true,
        generated_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (listError) {
      return res.status(500).json({ error: listError.message });
    }

    return res.status(201).json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/suppliers/risk
// ---------------------------------------------------------------------------

router.get("/api/suppliers/risk", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query as Record<string, string | undefined>;

    let query = supabase.from("v_supplier_risk").select("*");

    if (org_id) {
      query = query.eq("org_id", org_id);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ risk: data ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/suppliers/performance
// ---------------------------------------------------------------------------

router.get("/api/suppliers/performance", async (req: Request, res: Response) => {
  try {
    const { org_id, min_rating, status } = req.query as Record<string, string | undefined>;

    let query = supabase.from("v_supplier_performance").select("*");

    if (org_id) query = query.eq("org_id", org_id);
    if (min_rating) query = query.gte("current_rating", parseFloat(min_rating));
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ performance: data ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/evaluations/due
// ---------------------------------------------------------------------------

router.get("/api/evaluations/due", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query as Record<string, string | undefined>;

    const today = new Date();
    const threshold = new Date(today);
    threshold.setDate(today.getDate() + 30);
    const thresholdStr = threshold.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

    let query = supabase
      .from("suppliers")
      .select("*, companies(id, name)")
      .lte("next_reapproval_date", thresholdStr);

    if (org_id) {
      query = query.eq("org_id", org_id);
    }

    const { data: suppliers, error } = await query.order("next_reapproval_date", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const withStatus = (suppliers ?? []).map((s: any) => ({
      ...s,
      reapproval_status: s.next_reapproval_date < todayStr ? "OVERDUE" : "DUE_SOON",
    }));

    return res.json({ suppliers: withStatus, total: withStatus.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/suppliers/:id
// ---------------------------------------------------------------------------

router.get("/api/suppliers/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("*, companies(*)")
      .eq("id", id)
      .single();

    if (supplierError || !supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    // Latest 3 evaluations
    const { data: evaluations } = await supabase
      .from("supplier_evaluations")
      .select("*")
      .eq("supplier_id", id)
      .order("evaluation_date", { ascending: false })
      .limit(3);

    // Latest 3 audits
    const { data: audits } = await supabase
      .from("supplier_audits")
      .select("*")
      .eq("supplier_id", id)
      .order("audit_date", { ascending: false })
      .limit(3);

    // NC count
    const { count: ncCount } = await supabase
      .from("supplier_nc_register")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", id);

    // Active certifications
    const { data: certifications } = await supabase
      .from("supplier_certifications")
      .select("*")
      .eq("supplier_id", id)
      .eq("status", "ACTIVE");

    return res.json({
      ...supplier,
      evaluations: evaluations ?? [],
      audits: audits ?? [],
      nc_count: ncCount ?? 0,
      active_certifications: certifications ?? [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/suppliers/:id
// ---------------------------------------------------------------------------

router.patch("/api/suppliers/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;
    const { status, approved_by, decision_rationale, ...rest } = req.body;

    // Fetch current supplier
    const { data: current, error: fetchError } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    const updates: Record<string, any> = {
      ...rest,
      updated_at: new Date().toISOString(),
    };

    if (status && status !== current.status) {
      // Validate status transition
      const allowed = VALID_TRANSITIONS[current.status] ?? [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          error: `Invalid status transition: ${current.status} → ${status}. Allowed: ${allowed.join(", ") || "none"}`,
        });
      }

      // Additional validation for APPROVED
      if (status === "APPROVED") {
        if (!approved_by) {
          return res.status(400).json({ error: "approved_by is required to set status APPROVED" });
        }

        const { data: evaluations } = await supabase
          .from("supplier_evaluations")
          .select("overall_rating")
          .eq("supplier_id", id)
          .in("overall_rating", ["A", "B", "C"]);

        if (!evaluations || evaluations.length === 0) {
          return res.status(400).json({
            error: "At least one evaluation with overall_rating A, B, or C is required to approve a supplier",
          });
        }

        updates.approved_by = approved_by;
        updates.approved_at = new Date().toISOString();
      }

      // Additional validation for BLOCKED
      if (status === "BLOCKED") {
        if (!decision_rationale) {
          return res.status(400).json({ error: "decision_rationale is required to block a supplier" });
        }
        updates.decision_rationale = decision_rationale;
      }

      updates.status = status;

      // If SUSPENDED: create task for purchasing
      if (status === "SUSPENDED") {
        const { data: company } = await supabase
          .from("companies")
          .select("name")
          .eq("id", current.company_id)
          .single();

        const supplierName = company?.name ?? id;

        await supabase.from("tasks").insert({
          title: `Hitta alternativ leverantör: ${supplierName}`,
          assigned_to: current.responsible_id ?? null,
          status: "OPEN",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Log status change
      await supabase.from("audit_logs").insert({
        entity_type: "supplier",
        entity_id: id,
        action: `status_changed:${current.status}→${status}`,
        actor_id: user.id,
        created_at: new Date().toISOString(),
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from("suppliers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/suppliers/:id/evaluations
// ---------------------------------------------------------------------------

router.post("/api/suppliers/:id/evaluations", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;
    const {
      evaluation_type,
      evaluation_date,
      period_from,
      period_to,
      quality_score,
      delivery_score,
      responsiveness_score,
      compliance_score,
      price_score,
      innovation_score,
      custom_criteria,
      nc_count_period,
      complaint_count_period,
      deliveries_total,
      deliveries_on_time,
      decision,
      decision_rationale,
      action_required,
      follow_up_date,
      notes,
    } = req.body;

    const { data: evaluation, error: evalError } = await supabase
      .from("supplier_evaluations")
      .insert({
        supplier_id: id,
        evaluator_id: user.id,
        evaluation_type: evaluation_type ?? null,
        evaluation_date: evaluation_date ?? new Date().toISOString().split("T")[0],
        period_from: period_from ?? null,
        period_to: period_to ?? null,
        quality_score: quality_score ?? null,
        delivery_score: delivery_score ?? null,
        responsiveness_score: responsiveness_score ?? null,
        compliance_score: compliance_score ?? null,
        price_score: price_score ?? null,
        innovation_score: innovation_score ?? null,
        custom_criteria: custom_criteria ?? null,
        nc_count_period: nc_count_period ?? null,
        complaint_count_period: complaint_count_period ?? null,
        deliveries_total: deliveries_total ?? null,
        deliveries_on_time: deliveries_on_time ?? null,
        decision: decision ?? null,
        decision_rationale: decision_rationale ?? null,
        action_required: action_required ?? null,
        follow_up_date: follow_up_date ?? null,
        notes: notes ?? null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (evalError) {
      return res.status(500).json({ error: evalError.message });
    }

    // Update supplier's current_rating with weighted_score from the generated column
    if (evaluation.weighted_score != null) {
      await supabase
        .from("suppliers")
        .update({
          current_rating: evaluation.weighted_score,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    }

    // If overall_rating = 'F': put supplier on watch and create task
    if (evaluation.overall_rating === "F") {
      await supabase
        .from("suppliers")
        .update({ status: "ON_WATCH", updated_at: new Date().toISOString() })
        .eq("id", id);

      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", (await supabase.from("suppliers").select("company_id").eq("id", id).single()).data?.company_id)
        .single();

      const supplierName = company?.name ?? id;

      await supabase.from("tasks").insert({
        title: `Leverantör underkänd: ${supplierName} — åtgärd krävs`,
        role: "QUALITY_MANAGER",
        status: "OPEN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return res.status(201).json(evaluation);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/suppliers/:id/evaluations
// ---------------------------------------------------------------------------

router.get("/api/suppliers/:id/evaluations", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = "10", offset = "0" } = req.query as Record<string, string | undefined>;

    const { data, error, count } = await supabase
      .from("supplier_evaluations")
      .select("*", { count: "exact" })
      .eq("supplier_id", id)
      .order("evaluation_date", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ evaluations: data ?? [], total: count ?? 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/suppliers/:id/audits
// ---------------------------------------------------------------------------

router.post("/api/suppliers/:id/audits", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;
    const {
      audit_date,
      audit_type,
      auditor_id,
      external_auditor,
      scope,
      findings,
      overall_result,
      conditions,
      corrective_action_deadline,
      notes,
    } = req.body;

    const { data: audit, error: auditError } = await supabase
      .from("supplier_audits")
      .insert({
        supplier_id: id,
        audit_date: audit_date ?? new Date().toISOString().split("T")[0],
        audit_type: audit_type ?? null,
        auditor_id: auditor_id ?? user.id,
        external_auditor: external_auditor ?? null,
        scope: scope ?? null,
        findings: findings ?? null,
        overall_result: overall_result ?? null,
        conditions: conditions ?? null,
        corrective_action_deadline: corrective_action_deadline ?? null,
        notes: notes ?? null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (auditError) {
      return res.status(500).json({ error: auditError.message });
    }

    // If FAIL: suspend supplier and auto-create NC
    if (overall_result === "FAIL") {
      await supabase
        .from("suppliers")
        .update({ status: "SUSPENDED", updated_at: new Date().toISOString() })
        .eq("id", id);

      await supabase.from("non_conformances").insert({
        supplier_id: id,
        source: "AUDIT",
        audit_id: audit.id,
        description: `Audit failure — ${scope ?? ""}. Findings: ${findings ?? ""}`,
        status: "OPEN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return res.status(201).json(audit);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/suppliers/:id/audits
// ---------------------------------------------------------------------------

router.get("/api/suppliers/:id/audits", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("supplier_audits")
      .select("*")
      .eq("supplier_id", id)
      .order("audit_date", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ audits: data ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/suppliers/:id/nc
// ---------------------------------------------------------------------------

router.post("/api/suppliers/:id/nc", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;
    const {
      nc_id,
      impact_description,
      corrective_action_required,
      credit_claimed,
      credit_amount,
    } = req.body;

    if (!nc_id) {
      return res.status(400).json({ error: "nc_id is required" });
    }

    const { data: ncRecord, error: ncError } = await supabase
      .from("supplier_nc_register")
      .insert({
        supplier_id: id,
        nc_id,
        impact_description: impact_description ?? null,
        corrective_action_required: corrective_action_required ?? false,
        credit_claimed: credit_claimed ?? false,
        credit_amount: credit_amount ?? null,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (ncError) {
      return res.status(500).json({ error: ncError.message });
    }

    // Increment total_nc_count
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("total_nc_count, status, company_id, responsible_id")
      .eq("id", id)
      .single();

    const newNcCount = (supplier?.total_nc_count ?? 0) + 1;

    await supabase
      .from("suppliers")
      .update({ total_nc_count: newNcCount, updated_at: new Date().toISOString() })
      .eq("id", id);

    // Check: if NCs in last 90 days >= 3 and status = APPROVED
    if (supplier?.status === "APPROVED") {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { count: recentNcCount } = await supabase
        .from("supplier_nc_register")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", id)
        .gte("created_at", ninetyDaysAgo.toISOString());

      if ((recentNcCount ?? 0) >= 3) {
        await supabase
          .from("suppliers")
          .update({ status: "ON_WATCH", updated_at: new Date().toISOString() })
          .eq("id", id);

        const { data: company } = await supabase
          .from("companies")
          .select("name")
          .eq("id", supplier.company_id)
          .single();

        await supabase.from("tasks").insert({
          title: `Leverantör ${company?.name ?? id} har ${recentNcCount} avvikelser på 90 dagar — uppföljning krävs`,
          assigned_to: supplier.responsible_id ?? null,
          status: "OPEN",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    return res.status(201).json(ncRecord);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/suppliers/:id/nc
// ---------------------------------------------------------------------------

router.get("/api/suppliers/:id/nc", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("supplier_nc_register")
      .select("*, non_conformances(*)")
      .eq("supplier_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ nc_records: data ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/suppliers/nc/:ncRegisterId/response
// ---------------------------------------------------------------------------

router.patch("/api/suppliers/nc/:ncRegisterId/response", async (req: Request, res: Response) => {
  try {
    const { ncRegisterId } = req.params;
    const {
      supplier_response,
      corrective_action_received,
      corrective_action_accepted,
      credit_received,
    } = req.body;

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (supplier_response !== undefined) updates.supplier_response = supplier_response;
    if (corrective_action_received !== undefined) updates.corrective_action_received = corrective_action_received;
    if (corrective_action_accepted !== undefined) updates.corrective_action_accepted = corrective_action_accepted;
    if (credit_received !== undefined) updates.credit_received = credit_received;

    const { data, error } = await supabase
      .from("supplier_nc_register")
      .update(updates)
      .eq("id", ncRegisterId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "NC register record not found" });
    }

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default router;
