import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

// ─────────────────────────────────────────────
// SUPPLY CHAIN
// ─────────────────────────────────────────────

// GET /api/supply-chain — List all supply_chain_links
router.get("/api/supply-chain", async (req: Request, res: Response) => {
  try {
    const { org_id, criticality, risk_flag, parent_supplier_id } = req.query;

    let query = supabase
      .from("supply_chain_links")
      .select(
        "*, parent_supplier:suppliers!supply_chain_links_parent_supplier_id_fkey(*, company:companies(*)), sub_supplier:suppliers!supply_chain_links_sub_supplier_id_fkey(*, company:companies(*))",
        { count: "exact" }
      );

    if (org_id) {
      query = query.eq("org_id", org_id);
    }
    if (criticality) {
      query = query.eq("criticality", criticality);
    }
    if (parent_supplier_id) {
      query = query.eq("parent_supplier_id", parent_supplier_id);
    }

    const { data: links, count, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    let filtered = links || [];

    if (risk_flag) {
      const { data: depthRows, error: depthErr } = await supabase
        .from("v_supply_chain_depth")
        .select("*")
        .eq("risk_flag", risk_flag);

      if (depthErr) {
        return res.status(500).json({ error: depthErr.message });
      }

      const linkIds = new Set((depthRows || []).map((r: any) => r.link_id));
      filtered = filtered.filter((l: any) => linkIds.has(l.id));
    }

    return res.json({ links: filtered, total: risk_flag ? filtered.length : count });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/supply-chain/tree/:supplierId — Recursive tree
router.get("/api/supply-chain/tree/:supplierId", async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;

    const { data, error } = await supabase.rpc("get_supply_chain_tree", {
      root_supplier_id: supplierId,
    });

    if (error) {
      // Fallback: manual recursive CTE via raw SQL
      const { data: rawData, error: rawErr } = await supabase
        .from("supply_chain_links")
        .select("*, sub_supplier:suppliers!supply_chain_links_sub_supplier_id_fkey(*, company:companies(*))")
        .eq("parent_supplier_id", supplierId);

      if (rawErr) {
        return res.status(500).json({ error: rawErr.message });
      }

      // Build tree manually up to depth 5
      const buildTree = async (parentId: string, depth: number): Promise<any[]> => {
        if (depth >= 5) return [];

        const { data: children, error: childErr } = await supabase
          .from("supply_chain_links")
          .select("*, sub_supplier:suppliers!supply_chain_links_sub_supplier_id_fkey(*, company:companies(*))")
          .eq("parent_supplier_id", parentId);

        if (childErr || !children) return [];

        const result: any[] = [];
        for (const child of children) {
          const grandchildren = await buildTree(child.sub_supplier_id, depth + 1);
          result.push({
            supplier: child.sub_supplier,
            link: child,
            children: grandchildren,
          });
        }
        return result;
      };

      const { data: rootSupplier, error: rootErr } = await supabase
        .from("suppliers")
        .select("*, company:companies(*)")
        .eq("id", supplierId)
        .single();

      if (rootErr) {
        return res.status(500).json({ error: rootErr.message });
      }

      const children = await buildTree(supplierId, 0);
      return res.json({ tree: { supplier: rootSupplier, children } });
    }

    // If RPC succeeded, build nested tree from flat CTE result
    const nodeMap: Record<string, any> = {};
    const rootChildren: any[] = [];

    for (const row of data || []) {
      const node = { supplier: row, children: [] as any[] };
      nodeMap[row.sub_supplier_id] = node;
    }

    for (const row of data || []) {
      if (row.parent_supplier_id === supplierId) {
        rootChildren.push(nodeMap[row.sub_supplier_id]);
      } else if (nodeMap[row.parent_supplier_id]) {
        nodeMap[row.parent_supplier_id].children.push(nodeMap[row.sub_supplier_id]);
      }
    }

    const { data: rootSupplier } = await supabase
      .from("suppliers")
      .select("*, company:companies(*)")
      .eq("id", supplierId)
      .single();

    return res.json({ tree: { supplier: rootSupplier, children: rootChildren } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/supply-chain/links — Register sub-supplier link
router.post("/api/supply-chain/links", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const body = req.body;

    const { data: link, error } = await supabase
      .from("supply_chain_links")
      .insert({ ...body, created_by: user.id })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // If criticality CRITICAL and right_to_audit false
    if (body.criticality === "CRITICAL" && body.right_to_audit === false) {
      await supabase.from("tasks").insert({
        org_id: body.org_id,
        assigned_role: "QUALITY_MANAGER",
        title: "Kritisk underleverantör utan audit-rätt.",
        related_entity_type: "supply_chain_link",
        related_entity_id: link.id,
        status: "OPEN",
        created_by: user.id,
      });
    }

    // If status UNKNOWN
    if (body.status === "UNKNOWN") {
      await supabase.from("tasks").insert({
        org_id: body.org_id,
        assigned_role: "QUALITY_MANAGER",
        title: "Begär underleverantörsdeklaration.",
        related_entity_type: "supply_chain_link",
        related_entity_id: link.id,
        status: "OPEN",
        created_by: user.id,
      });
    }

    return res.status(201).json(link);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/supply-chain/links/:id — Update link
router.patch("/api/supply-chain/links/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Fetch old values for audit log
    const { data: oldLink, error: fetchErr } = await supabase
      .from("supply_chain_links")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr) {
      return res.status(404).json({ error: "Link not found" });
    }

    const { data: updated, error } = await supabase
      .from("supply_chain_links")
      .update(req.body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Log changes to audit_logs
    await supabase.from("audit_logs").insert({
      entity_type: "supply_chain_link",
      entity_id: id,
      action: "UPDATE",
      old_values: oldLink,
      new_values: updated,
      performed_by: user?.id || null,
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/supply-chain/risks — Risk-flagged links
router.get("/api/supply-chain/risks", async (req: Request, res: Response) => {
  try {
    const { data: risks, error } = await supabase
      .from("v_supply_chain_depth")
      .select("*")
      .neq("risk_flag", "OK");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ risks });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/supply-chain/depth-report — Summary report
router.get("/api/supply-chain/depth-report", async (req: Request, res: Response) => {
  try {
    const { data: rows, error } = await supabase
      .from("v_supply_chain_depth")
      .select("*");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const allRows = rows || [];

    let maxDepth = 0;
    const countPerTier: Record<number, number> = {};
    const countPerRiskFlag: Record<string, number> = {};
    let singleSourceCount = 0;

    for (const row of allRows) {
      const tier = row.tier_depth ?? row.depth ?? 0;
      if (tier > maxDepth) maxDepth = tier;
      countPerTier[tier] = (countPerTier[tier] || 0) + 1;

      const flag = row.risk_flag || "UNKNOWN";
      countPerRiskFlag[flag] = (countPerRiskFlag[flag] || 0) + 1;

      if (row.single_source === true) {
        singleSourceCount++;
      }
    }

    return res.json({
      report: {
        max_tier_depth: maxDepth,
        count_per_tier: countPerTier,
        count_per_risk_flag: countPerRiskFlag,
        single_source_count: singleSourceCount,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// OUTSOURCED PROCESSES
// ─────────────────────────────────────────────

// POST /api/outsourced-processes — Register
router.post("/api/outsourced-processes", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const {
      process_id,
      supplier_id,
      description,
      scope,
      retained_control,
      control_method,
      quality_requirements,
      sla,
      kpi_targets,
      monitoring_frequency,
      verification_method,
      contract_reference,
    } = req.body;

    const { data, error } = await supabase
      .from("outsourced_processes")
      .insert({
        process_id,
        supplier_id,
        description,
        scope,
        retained_control,
        control_method,
        quality_requirements,
        sla,
        kpi_targets,
        monitoring_frequency,
        verification_method,
        contract_reference,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/outsourced-processes — List
router.get("/api/outsourced-processes", async (req: Request, res: Response) => {
  try {
    const { org_id, status, monitoring_status } = req.query;

    let query = supabase
      .from("outsourced_processes")
      .select("*, supplier:suppliers(*, company:companies(*)), process:processes(*)");

    if (org_id) {
      query = query.eq("org_id", org_id);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data: processes, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    let result = processes || [];

    // Enrich with monitoring_status from view
    const { data: statusRows, error: statusErr } = await supabase
      .from("v_outsourced_process_status")
      .select("*");

    if (!statusErr && statusRows) {
      const statusMap: Record<string, any> = {};
      for (const row of statusRows) {
        statusMap[row.id] = row.monitoring_status;
      }
      result = result.map((p: any) => ({
        ...p,
        monitoring_status: statusMap[p.id] || null,
      }));

      if (monitoring_status) {
        result = result.filter(
          (p: any) => p.monitoring_status === monitoring_status
        );
      }
    }

    return res.json({ processes: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/outsourced-processes/:id — Update
router.patch("/api/outsourced-processes/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("outsourced_processes")
      .update(req.body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/outsourced-processes/:id/monitor — Record monitoring result
router.post("/api/outsourced-processes/:id/monitor", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { performance, findings, kpi_results } = req.body;

    // Fetch the process for context
    const { data: process, error: procErr } = await supabase
      .from("outsourced_processes")
      .select("*")
      .eq("id", id)
      .single();

    if (procErr || !process) {
      return res.status(404).json({ error: "Outsourced process not found" });
    }

    // Insert monitoring result
    const { data: result, error: insertErr } = await supabase
      .from("outsourced_process_monitoring")
      .insert({
        outsourced_process_id: id,
        performance,
        findings,
        kpi_results,
        monitored_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      return res.status(500).json({ error: insertErr.message });
    }

    // Update current_performance and last_monitored_at on the process
    await supabase
      .from("outsourced_processes")
      .update({
        current_performance: performance,
        last_monitored_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Check KPIs against targets
    let ncCreated = false;
    const kpiTargets = process.kpi_targets;

    if (kpiTargets && kpi_results) {
      let belowTarget = false;
      for (const key of Object.keys(kpi_results)) {
        if (
          kpiTargets[key] !== undefined &&
          kpi_results[key] < kpiTargets[key]
        ) {
          belowTarget = true;
          break;
        }
      }

      if (belowTarget) {
        const processName =
          process.description || process.process_id || id;
        await supabase.from("nonconformances").insert({
          org_id: process.org_id,
          title: `Outsourcad process under KPI-mål: ${processName}`,
          source: "OUTSOURCED_PROCESS_MONITORING",
          related_entity_type: "outsourced_process",
          related_entity_id: id,
          supplier_id: process.supplier_id,
          status: "OPEN",
        });
        ncCreated = true;
      }
    }

    return res.json({ result, nc_created: ncCreated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/outsourced-processes/overdue — Overdue or never monitored
router.get("/api/outsourced-processes/overdue", async (req: Request, res: Response) => {
  try {
    const { data: processes, error } = await supabase
      .from("v_outsourced_process_status")
      .select("*")
      .in("monitoring_status", ["OVERDUE", "NEVER_MONITORED"]);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ processes });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// FLOWDOWN REQUIREMENTS
// ─────────────────────────────────────────────

// POST /api/flowdown-requirements — Create requirement
router.post("/api/flowdown-requirements", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { data, error } = await supabase
      .from("flowdown_requirements")
      .insert({ ...req.body, created_by: user.id })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/flowdown-requirements — List all requirements
router.get("/api/flowdown-requirements", async (req: Request, res: Response) => {
  try {
    const { org_id, requirement_type, mandatory } = req.query;

    let query = supabase.from("flowdown_requirements").select("*");

    if (org_id) {
      query = query.eq("org_id", org_id);
    }
    if (requirement_type) {
      query = query.eq("requirement_type", requirement_type);
    }
    if (mandatory !== undefined) {
      query = query.eq("mandatory", mandatory === "true");
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ requirements: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/flowdown/compliance — Compliance matrix
router.get("/api/flowdown/compliance", async (req: Request, res: Response) => {
  try {
    const { data: rows, error } = await supabase
      .from("v_flowdown_compliance")
      .select("*");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Group by requirement for matrix view
    const grouped: Record<string, any> = {};
    for (const row of rows || []) {
      const reqId = row.requirement_id;
      if (!grouped[reqId]) {
        grouped[reqId] = {
          requirement_id: reqId,
          requirement_name: row.requirement_name,
          requirement_type: row.requirement_type,
          mandatory: row.mandatory,
          suppliers: [],
        };
      }
      grouped[reqId].suppliers.push({
        supplier_id: row.supplier_id,
        supplier_name: row.supplier_name,
        compliance_status: row.compliance_status,
        declaration_id: row.declaration_id,
        valid_until: row.valid_until,
      });
    }

    const matrix = Object.values(grouped);
    return res.json({ matrix });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/flowdown/gaps — Compliance gaps
router.get("/api/flowdown/gaps", async (req: Request, res: Response) => {
  try {
    const { data: gaps, error } = await supabase
      .from("v_flowdown_compliance")
      .select("*")
      .in("compliance_status", ["MISSING", "EXPIRED", "REJECTED"]);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ gaps });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/flowdown/request-declarations — Batch request declarations
router.post("/api/flowdown/request-declarations", async (req: Request, res: Response) => {
  try {
    const { requirement_id, org_id } = req.body;

    // Get the requirement to know which suppliers it applies to
    const { data: requirement, error: reqErr } = await supabase
      .from("flowdown_requirements")
      .select("*")
      .eq("id", requirement_id)
      .single();

    if (reqErr || !requirement) {
      return res.status(404).json({ error: "Requirement not found" });
    }

    // Find all applicable suppliers
    const { data: suppliers, error: suppErr } = await supabase
      .from("suppliers")
      .select("id")
      .eq("org_id", org_id || requirement.org_id);

    if (suppErr) {
      return res.status(500).json({ error: suppErr.message });
    }

    // Find existing non-expired declarations
    const { data: existing, error: existErr } = await supabase
      .from("supplier_declarations")
      .select("supplier_id, valid_until")
      .eq("requirement_id", requirement_id)
      .gte("valid_until", new Date().toISOString());

    if (existErr) {
      return res.status(500).json({ error: existErr.message });
    }

    const existingSupplierIds = new Set(
      (existing || []).map((d: any) => d.supplier_id)
    );

    const toInsert: any[] = [];
    let skippedCount = 0;

    for (const supplier of suppliers || []) {
      if (existingSupplierIds.has(supplier.id)) {
        skippedCount++;
        continue;
      }
      toInsert.push({
        supplier_id: supplier.id,
        requirement_id,
        declaration_status: "REQUESTED",
        requested_at: new Date().toISOString(),
        org_id: org_id || requirement.org_id,
      });
    }

    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from("supplier_declarations")
        .insert(toInsert);

      if (insertErr) {
        return res.status(500).json({ error: insertErr.message });
      }
    }

    return res.json({
      requested_count: toInsert.length,
      skipped_count: skippedCount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// SUPPLIER DECLARATIONS
// ─────────────────────────────────────────────

// POST /api/supplier-declarations — Register received declaration
router.post("/api/supplier-declarations", async (req: Request, res: Response) => {
  try {
    const {
      supplier_id,
      requirement_id,
      declaration_type,
      document_url,
      valid_until,
      notes,
    } = req.body;

    const { data, error } = await supabase
      .from("supplier_declarations")
      .insert({
        supplier_id,
        requirement_id,
        declaration_type,
        document_url,
        valid_until,
        notes,
        declaration_status: "RECEIVED",
        received_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/supplier-declarations/:id/review — Review declaration
router.patch("/api/supplier-declarations/:id/review", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { decision, rejection_reason } = req.body;
    const user = (req as any).user;

    const updatePayload: any = {
      declaration_status: decision,
      reviewed_by: user?.id || null,
      reviewed_at: new Date().toISOString(),
    };

    if (decision === "REJECTED" && rejection_reason) {
      updatePayload.rejection_reason = rejection_reason;
    }

    const { data: updated, error } = await supabase
      .from("supplier_declarations")
      .update(updatePayload)
      .eq("id", id)
      .select("*, requirement:flowdown_requirements(*)")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // If REJECTED and mandatory requirement: auto-create NC
    if (decision === "REJECTED" && updated.requirement?.mandatory === true) {
      await supabase.from("nonconformances").insert({
        org_id: updated.org_id || updated.requirement?.org_id,
        title: `Avvisad leverantörsdeklaration: ${updated.requirement?.name || updated.requirement_id}`,
        source: "SUPPLIER_DECLARATION_REVIEW",
        related_entity_type: "supplier_declaration",
        related_entity_id: id,
        supplier_id: updated.supplier_id,
        corrective_action_required: true,
        status: "OPEN",
      });
    }

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/supplier-declarations/expiring — Declarations expiring within 30 days
router.get("/api/supplier-declarations/expiring", async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { data: declarations, error } = await supabase
      .from("supplier_declarations")
      .select("*, supplier:suppliers(*, company:companies(*)), requirement:flowdown_requirements(*)")
      .gte("valid_until", now.toISOString())
      .lte("valid_until", thirtyDaysLater.toISOString());

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ declarations });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// RECEIVING INSPECTIONS
// ─────────────────────────────────────────────

// POST /api/receiving-inspections — Register inspection
router.post("/api/receiving-inspections", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const {
      supplier_id,
      delivery_reference,
      delivery_date,
      inspection_type,
      items_received,
      items_inspected,
      items_accepted,
      items_rejected,
      result,
      findings,
      notes,
    } = req.body;

    const { data: inspection, error } = await supabase
      .from("receiving_inspections")
      .insert({
        supplier_id,
        delivery_reference,
        delivery_date,
        inspection_type,
        items_received,
        items_inspected,
        items_accepted,
        items_rejected,
        result,
        findings,
        notes,
        inspected_by: user.id,
        org_id: req.body.org_id,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // If result=QUARANTINED: create task for QUALITY_MANAGER
    if (result === "QUARANTINED") {
      await supabase.from("tasks").insert({
        org_id: req.body.org_id,
        assigned_role: "QUALITY_MANAGER",
        title: `Beslut om spärrat gods: ${delivery_reference}`,
        related_entity_type: "receiving_inspection",
        related_entity_id: inspection.id,
        status: "OPEN",
        created_by: user.id,
      });
    }

    // Auto-update supplier quality_performance_pct
    const { data: allInspections, error: inspErr } = await supabase
      .from("receiving_inspections")
      .select("items_accepted, items_inspected")
      .eq("supplier_id", supplier_id);

    if (!inspErr && allInspections && allInspections.length > 0) {
      let totalAccepted = 0;
      let totalInspected = 0;
      for (const insp of allInspections) {
        totalAccepted += insp.items_accepted || 0;
        totalInspected += insp.items_inspected || 0;
      }
      const pct = totalInspected > 0 ? Math.round((totalAccepted / totalInspected) * 100) : 100;

      await supabase
        .from("suppliers")
        .update({ quality_performance_pct: pct })
        .eq("id", supplier_id);
    }

    // Check: 3+ rejected inspections from same supplier in 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentRejections, error: rejErr } = await supabase
      .from("receiving_inspections")
      .select("id")
      .eq("supplier_id", supplier_id)
      .eq("result", "REJECTED")
      .gte("created_at", ninetyDaysAgo);

    if (!rejErr && recentRejections && recentRejections.length >= 3) {
      // Check if supplier is APPROVED
      const { data: supplier, error: supErr } = await supabase
        .from("suppliers")
        .select("id, status")
        .eq("id", supplier_id)
        .single();

      if (!supErr && supplier && supplier.status === "APPROVED") {
        await supabase
          .from("suppliers")
          .update({ status: "ON_WATCH" })
          .eq("id", supplier_id);
      }
    }

    return res.status(201).json(inspection);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/receiving-inspections — List
router.get("/api/receiving-inspections", async (req: Request, res: Response) => {
  try {
    const { org_id, supplier_id, result, date_from, date_to, limit, offset } = req.query;

    const queryLimit = Math.min(Number(limit) || 50, 50);
    const queryOffset = Number(offset) || 0;

    let query = supabase
      .from("receiving_inspections")
      .select("*, supplier:suppliers(*, company:companies(*))", { count: "exact" })
      .range(queryOffset, queryOffset + queryLimit - 1)
      .order("created_at", { ascending: false });

    if (org_id) {
      query = query.eq("org_id", org_id);
    }
    if (supplier_id) {
      query = query.eq("supplier_id", supplier_id);
    }
    if (result) {
      query = query.eq("result", result);
    }
    if (date_from) {
      query = query.gte("delivery_date", date_from as string);
    }
    if (date_to) {
      query = query.lte("delivery_date", date_to as string);
    }

    const { data: inspections, count, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ inspections, total: count });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/receiving-inspections/trend — Trend data
router.get("/api/receiving-inspections/trend", async (req: Request, res: Response) => {
  try {
    const { org_id, supplier_id } = req.query;

    let query = supabase.from("v_receiving_inspection_trend").select("*");

    if (org_id) {
      query = query.eq("org_id", org_id);
    }
    if (supplier_id) {
      query = query.eq("supplier_id", supplier_id);
    }

    const { data: trend, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ trend });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/receiving-inspections/skip-lot-eligible — Skip lot eligible suppliers
router.get("/api/receiving-inspections/skip-lot-eligible", async (req: Request, res: Response) => {
  try {
    const twelveMonthsAgo = new Date(
      Date.now() - 365 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Get all suppliers with rating >= 4.0
    const { data: highRatedSuppliers, error: supErr } = await supabase
      .from("suppliers")
      .select("id, rating, company:companies(*)")
      .gte("rating", 4.0);

    if (supErr) {
      return res.status(500).json({ error: supErr.message });
    }

    // For each high-rated supplier, check if they have 0 rejects in last 12 months
    const eligibleSuppliers: any[] = [];

    for (const supplier of highRatedSuppliers || []) {
      const { data: rejections, error: rejErr } = await supabase
        .from("receiving_inspections")
        .select("id")
        .eq("supplier_id", supplier.id)
        .eq("result", "REJECTED")
        .gte("created_at", twelveMonthsAgo);

      if (rejErr) continue;

      if (!rejections || rejections.length === 0) {
        eligibleSuppliers.push(supplier);
      }
    }

    return res.json({ eligible_suppliers: eligibleSuppliers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
