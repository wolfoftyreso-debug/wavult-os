import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    org_id: string;
    role: string;
    [key: string]: any;
  };
}

// ---------------------------------------------------------------------------
// Helper — write audit log
// ---------------------------------------------------------------------------

async function logAudit(
  orgId: string,
  action: string,
  entityType: string,
  entityId: string,
  performedBy: string,
  details: Record<string, any> = {}
): Promise<void> {
  await supabase.from("audit_logs").insert({
    org_id: orgId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    performed_by: performedBy,
    details,
    created_at: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// POST /api/legal/reviews — Create a legal review request
// ---------------------------------------------------------------------------

router.post(
  "/api/legal/reviews",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orgId = req.user?.org_id;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const { module, feature, jurisdiction_id } = req.body;

      if (!module || !feature || !jurisdiction_id) {
        return res.status(400).json({
          error: "module, feature, and jurisdiction_id are required",
        });
      }

      const { data, error } = await supabase
        .from("legal_reviews")
        .insert({
          org_id: orgId,
          module,
          feature_code: feature,
          jurisdiction_id,
          status: "PENDING",
          requested_by: req.user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      await logAudit(
        orgId,
        "LEGAL_REVIEW_CREATED",
        "legal_review",
        data.id,
        req.user?.id ?? "system",
        { module, feature, jurisdiction_id }
      );

      return res.status(201).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/legal/reviews — List reviews (filterable by status, module, jurisdiction_id)
// ---------------------------------------------------------------------------

router.get(
  "/api/legal/reviews",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orgId = req.user?.org_id;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      let query = supabase
        .from("legal_reviews")
        .select("*, jurisdictions(*)")
        .eq("org_id", orgId);

      if (req.query.status) {
        query = query.eq("status", req.query.status as string);
      }
      if (req.query.module) {
        query = query.eq("module", req.query.module as string);
      }
      if (req.query.jurisdiction_id) {
        query = query.eq(
          "jurisdiction_id",
          req.query.jurisdiction_id as string
        );
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/legal/reviews/:id — Review detail
// ---------------------------------------------------------------------------

router.get(
  "/api/legal/reviews/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orgId = req.user?.org_id;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const { data, error } = await supabase
        .from("legal_reviews")
        .select("*, jurisdictions(*)")
        .eq("id", req.params.id)
        .eq("org_id", orgId)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: "Review not found" });
      }

      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/legal/reviews/:id — Update review status
// ---------------------------------------------------------------------------

router.patch(
  "/api/legal/reviews/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orgId = req.user?.org_id;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const { status, reviewer_name, reviewer_firm, conditions, valid_until } =
        req.body;

      const allowedStatuses = ["APPROVED", "CONDITIONAL", "REJECTED"];
      if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({
          error: `status must be one of: ${allowedStatuses.join(", ")}`,
        });
      }

      // Verify the review exists and belongs to this org
      const { data: existing, error: fetchErr } = await supabase
        .from("legal_reviews")
        .select("*")
        .eq("id", req.params.id)
        .eq("org_id", orgId)
        .single();

      if (fetchErr || !existing) {
        return res.status(404).json({ error: "Review not found" });
      }

      const updatePayload: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (reviewer_name !== undefined) updatePayload.reviewer_name = reviewer_name;
      if (reviewer_firm !== undefined) updatePayload.reviewer_firm = reviewer_firm;
      if (conditions !== undefined) updatePayload.conditions = conditions;
      if (valid_until !== undefined) updatePayload.valid_until = valid_until;

      const { data, error } = await supabase
        .from("legal_reviews")
        .update(updatePayload)
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      // Log to audit
      await logAudit(
        orgId,
        "LEGAL_REVIEW_UPDATED",
        "legal_review",
        req.params.id,
        req.user?.id ?? "system",
        {
          previous_status: existing.status,
          new_status: status,
          reviewer_name,
          reviewer_firm,
          conditions,
          valid_until,
        }
      );

      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/legal/features/:featureCode/enable — Enable feature for org
// ---------------------------------------------------------------------------

router.post(
  "/api/legal/features/:featureCode/enable",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orgId = req.user?.org_id;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const { featureCode } = req.params;

      // Look up the feature gate
      const { data: gate, error: gateErr } = await supabase
        .from("feature_gates")
        .select("*")
        .eq("feature_code", featureCode)
        .single();

      if (gateErr || !gate) {
        return res.status(404).json({ error: "Feature not found" });
      }

      // Resolve org's primary jurisdiction
      const { data: orgJur } = await supabase
        .from("org_jurisdictions")
        .select("jurisdiction_id")
        .eq("org_id", orgId)
        .eq("is_primary", true)
        .single();

      if (!orgJur) {
        return res
          .status(400)
          .json({ error: "No primary jurisdiction configured for org" });
      }

      const jurisdictionId = orgJur.jurisdiction_id;

      // If requires_legal_review, verify an APPROVED review exists
      if (gate.requires_legal_review) {
        const { data: review } = await supabase
          .from("legal_reviews")
          .select("id, status")
          .eq("org_id", orgId)
          .eq("jurisdiction_id", jurisdictionId)
          .eq("feature_code", featureCode)
          .eq("status", "APPROVED")
          .limit(1)
          .single();

        if (!review) {
          return res.status(403).json({ error: "Legal review required" });
        }
      }

      // Upsert the feature_gate_status entry
      const { data, error } = await supabase
        .from("feature_gate_status")
        .upsert(
          {
            feature_gate_id: gate.id,
            org_id: orgId,
            jurisdiction_id: jurisdictionId,
            enabled: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "feature_gate_id,org_id,jurisdiction_id" }
        )
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      await logAudit(
        orgId,
        "FEATURE_ENABLED",
        "feature_gate_status",
        data.id,
        req.user?.id ?? "system",
        { feature_code: featureCode, jurisdiction_id: jurisdictionId }
      );

      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/legal/features/:featureCode/disable — Disable feature for org
// ---------------------------------------------------------------------------

router.post(
  "/api/legal/features/:featureCode/disable",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orgId = req.user?.org_id;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const { featureCode } = req.params;

      // Look up the feature gate
      const { data: gate, error: gateErr } = await supabase
        .from("feature_gates")
        .select("*")
        .eq("feature_code", featureCode)
        .single();

      if (gateErr || !gate) {
        return res.status(404).json({ error: "Feature not found" });
      }

      // Resolve org's primary jurisdiction
      const { data: orgJur } = await supabase
        .from("org_jurisdictions")
        .select("jurisdiction_id")
        .eq("org_id", orgId)
        .eq("is_primary", true)
        .single();

      if (!orgJur) {
        return res
          .status(400)
          .json({ error: "No primary jurisdiction configured for org" });
      }

      const jurisdictionId = orgJur.jurisdiction_id;

      // Upsert the feature_gate_status entry as disabled
      const { data, error } = await supabase
        .from("feature_gate_status")
        .upsert(
          {
            feature_gate_id: gate.id,
            org_id: orgId,
            jurisdiction_id: jurisdictionId,
            enabled: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "feature_gate_id,org_id,jurisdiction_id" }
        )
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      await logAudit(
        orgId,
        "FEATURE_DISABLED",
        "feature_gate_status",
        data.id,
        req.user?.id ?? "system",
        { feature_code: featureCode, jurisdiction_id: jurisdictionId }
      );

      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/legal/features — All features with status per org jurisdiction
// ---------------------------------------------------------------------------

router.get(
  "/api/legal/features",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orgId = req.user?.org_id;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      // Get all feature gates
      const { data: gates, error: gatesErr } = await supabase
        .from("feature_gates")
        .select("*")
        .order("feature_code");

      if (gatesErr) {
        return res.status(500).json({ error: gatesErr.message });
      }

      // Get org's primary jurisdiction
      const { data: orgJur } = await supabase
        .from("org_jurisdictions")
        .select("jurisdiction_id")
        .eq("org_id", orgId)
        .eq("is_primary", true)
        .single();

      const jurisdictionId = orgJur?.jurisdiction_id;

      // Get all statuses for this org
      const { data: statuses } = await supabase
        .from("feature_gate_status")
        .select("*")
        .eq("org_id", orgId);

      // Get pending reviews for this org
      const { data: pendingReviews } = await supabase
        .from("legal_reviews")
        .select("feature_code, status")
        .eq("org_id", orgId)
        .eq("status", "PENDING");

      const statusMap = new Map<string, any>();
      (statuses ?? []).forEach((s: any) => {
        statusMap.set(`${s.feature_gate_id}:${s.jurisdiction_id}`, s);
      });

      const pendingSet = new Set(
        (pendingReviews ?? []).map((r: any) => r.feature_code)
      );

      const features = (gates ?? []).map((gate: any) => {
        const statusEntry = jurisdictionId
          ? statusMap.get(`${gate.id}:${jurisdictionId}`)
          : undefined;

        let featureStatus: string;
        if (statusEntry) {
          featureStatus = statusEntry.enabled ? "enabled" : "disabled";
        } else if (pendingSet.has(gate.feature_code)) {
          featureStatus = "pending";
        } else {
          featureStatus = gate.default_enabled ? "enabled" : "disabled";
        }

        return {
          ...gate,
          status: featureStatus,
        };
      });

      return res.json(features);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/legal/matrix — Features x Jurisdictions matrix
// ---------------------------------------------------------------------------

router.get(
  "/api/legal/matrix",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orgId = req.user?.org_id;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      // Fetch all feature gates
      const { data: gates } = await supabase
        .from("feature_gates")
        .select("*")
        .order("feature_code");

      // Fetch all jurisdictions
      const { data: jurisdictions } = await supabase
        .from("jurisdictions")
        .select("*")
        .order("code");

      // Fetch all statuses for this org
      const { data: statuses } = await supabase
        .from("feature_gate_status")
        .select("*")
        .eq("org_id", orgId);

      // Fetch all legal reviews for this org
      const { data: reviews } = await supabase
        .from("legal_reviews")
        .select("feature_code, jurisdiction_id, status")
        .eq("org_id", orgId);

      // Build lookup maps
      const statusMap = new Map<string, any>();
      (statuses ?? []).forEach((s: any) => {
        statusMap.set(`${s.feature_gate_id}:${s.jurisdiction_id}`, s);
      });

      const reviewMap = new Map<string, string>();
      (reviews ?? []).forEach((r: any) => {
        const key = `${r.feature_code}:${r.jurisdiction_id}`;
        // Keep the "best" status: APPROVED > CONDITIONAL > PENDING > REJECTED
        const existing = reviewMap.get(key);
        if (
          !existing ||
          (r.status === "APPROVED") ||
          (r.status === "CONDITIONAL" && existing !== "APPROVED") ||
          (r.status === "PENDING" && existing === "REJECTED")
        ) {
          reviewMap.set(key, r.status);
        }
      });

      // Build the matrix
      const matrix = (gates ?? []).map((gate: any) => {
        const row: Record<string, any> = {
          feature_code: gate.feature_code,
          feature_name: gate.name ?? gate.feature_code,
          requires_legal_review: gate.requires_legal_review,
          jurisdictions: {} as Record<string, string>,
        };

        (jurisdictions ?? []).forEach((jur: any) => {
          const statusEntry = statusMap.get(`${gate.id}:${jur.id}`);
          const reviewStatus = reviewMap.get(
            `${gate.feature_code}:${jur.id}`
          );

          let cellStatus: string;
          if (statusEntry) {
            cellStatus = statusEntry.enabled ? "enabled" : "disabled";
          } else if (gate.requires_legal_review && !reviewStatus) {
            cellStatus = "not_applicable";
          } else if (
            gate.requires_legal_review &&
            reviewStatus === "PENDING"
          ) {
            cellStatus = "pending_review";
          } else if (gate.default_enabled) {
            cellStatus = "enabled";
          } else {
            cellStatus = "disabled";
          }

          row.jurisdictions[jur.code] = cellStatus;
        });

        return row;
      });

      return res.json({
        features: matrix,
        jurisdictions: jurisdictions ?? [],
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/legal/jurisdictions — List all jurisdictions
// ---------------------------------------------------------------------------

router.get(
  "/api/legal/jurisdictions",
  async (_req: Request, res: Response) => {
    try {
      const { data, error } = await supabase
        .from("jurisdictions")
        .select("*")
        .order("code");

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/legal/jurisdictions/activate — Activate jurisdiction for org
// ---------------------------------------------------------------------------

router.post(
  "/api/legal/jurisdictions/activate",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orgId = req.user?.org_id;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const { jurisdiction_id, is_primary } = req.body;

      if (!jurisdiction_id) {
        return res
          .status(400)
          .json({ error: "jurisdiction_id is required" });
      }

      // If setting as primary, unset any existing primary first
      if (is_primary) {
        await supabase
          .from("org_jurisdictions")
          .update({ is_primary: false })
          .eq("org_id", orgId)
          .eq("is_primary", true);
      }

      const { data, error } = await supabase
        .from("org_jurisdictions")
        .upsert(
          {
            org_id: orgId,
            jurisdiction_id,
            is_primary: is_primary ?? false,
            activated_at: new Date().toISOString(),
          },
          { onConflict: "org_id,jurisdiction_id" }
        )
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      await logAudit(
        orgId,
        "JURISDICTION_ACTIVATED",
        "org_jurisdiction",
        data.id,
        req.user?.id ?? "system",
        { jurisdiction_id, is_primary }
      );

      return res.status(201).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/legal/rules — List rules for org's jurisdiction(s)
// ---------------------------------------------------------------------------

router.get(
  "/api/legal/rules",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orgId = req.user?.org_id;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      // Get all org jurisdictions
      const { data: orgJurs } = await supabase
        .from("org_jurisdictions")
        .select("jurisdiction_id")
        .eq("org_id", orgId);

      if (!orgJurs || orgJurs.length === 0) {
        return res.json([]);
      }

      const jurisdictionIds = orgJurs.map((j: any) => j.jurisdiction_id);

      let query = supabase
        .from("jurisdiction_rules")
        .select("*, jurisdictions(code, name)")
        .in("jurisdiction_id", jurisdictionIds);

      if (req.query.module) {
        query = query.eq("module", req.query.module as string);
      }

      const { data, error } = await query.order("module").order("rule_key");

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default router;
