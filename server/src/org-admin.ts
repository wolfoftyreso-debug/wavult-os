import { Router, Request, Response, NextFunction } from "express";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthenticatedRequest extends Request {
  user?: { id: string; org_id: string; role: string; is_org_admin?: boolean };
}

// ---------------------------------------------------------------------------
// Middleware: checkOrgAdmin
// Validates that the current user is an org admin for the active org.
// ---------------------------------------------------------------------------

async function checkOrgAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    const orgId = req.user?.org_id;

    if (!userId || !orgId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { data: membership, error } = await supabase
      .from("org_members")
      .select("id, is_org_admin, roles, primary_role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .single();

    if (error || !membership) {
      res.status(403).json({ error: "Not a member of this organization" });
      return;
    }

    if (!membership.is_org_admin) {
      res.status(403).json({ error: "Organization admin access required" });
      return;
    }

    return next();
  } catch (err: any) {
    console.error("[org-admin] checkOrgAdmin error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

// Apply org admin check to all routes
router.use(checkOrgAdmin);

// ---------------------------------------------------------------------------
// GET /org/settings — Org settings
// ---------------------------------------------------------------------------
router.get("/org/settings", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.org_id;

    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err: any) {
    console.error("[org-admin] GET /org/settings error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /org/settings — Update org settings
// ---------------------------------------------------------------------------
router.patch("/org/settings", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.org_id;
    const updates = req.body;

    if (!updates || typeof updates !== "object") {
      res.status(400).json({ error: "Request body must be an object" });
      return;
    }

    const { data, error } = await supabase
      .from("organizations")
      .update(updates)
      .eq("id", orgId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err: any) {
    console.error("[org-admin] PATCH /org/settings error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /org/members/invite — Invite user to org (creates org_member with roles)
// ---------------------------------------------------------------------------
router.post("/org/members/invite", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.org_id;
    const invitedBy = req.user!.id;
    const { user_id, roles, primary_role, is_org_admin } = req.body;

    if (!user_id || !roles || !primary_role) {
      res.status(400).json({ error: "user_id, roles, and primary_role are required" });
      return;
    }

    if (!Array.isArray(roles) || roles.length === 0) {
      res.status(400).json({ error: "roles must be a non-empty array" });
      return;
    }

    const { data, error } = await supabase
      .from("org_members")
      .insert({
        org_id: orgId,
        user_id,
        roles,
        primary_role,
        is_org_admin: is_org_admin ?? false,
        invited_by: invitedBy,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        res.status(409).json({ error: "User is already a member of this organization" });
        return;
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (err: any) {
    console.error("[org-admin] POST /org/members/invite error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /org/members — List org members with roles
// ---------------------------------------------------------------------------
router.get("/org/members", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.org_id;

    const { data, error } = await supabase
      .from("org_members")
      .select("*")
      .eq("org_id", orgId)
      .order("joined_at", { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (err: any) {
    console.error("[org-admin] GET /org/members error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /org/members/:id/roles — Update member roles
// ---------------------------------------------------------------------------
router.patch("/org/members/:id/roles", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.org_id;
    const memberId = req.params.id;
    const { roles, primary_role, is_org_admin } = req.body;

    if (!roles && !primary_role && is_org_admin === undefined) {
      res.status(400).json({ error: "At least one of roles, primary_role, or is_org_admin is required" });
      return;
    }

    const updates: Record<string, any> = {};
    if (roles) updates.roles = roles;
    if (primary_role) updates.primary_role = primary_role;
    if (is_org_admin !== undefined) updates.is_org_admin = is_org_admin;

    const { data, error } = await supabase
      .from("org_members")
      .update(updates)
      .eq("id", memberId)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      res.status(404).json({ error: "Member not found in this organization" });
      return;
    }

    res.json(data);
  } catch (err: any) {
    console.error("[org-admin] PATCH /org/members/:id/roles error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /org/members/:id — Remove member from org
// ---------------------------------------------------------------------------
router.delete("/org/members/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.org_id;
    const memberId = req.params.id;

    const { data, error } = await supabase
      .from("org_members")
      .delete()
      .eq("id", memberId)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      res.status(404).json({ error: "Member not found in this organization" });
      return;
    }

    res.json({ deleted: true, member: data });
  } catch (err: any) {
    console.error("[org-admin] DELETE /org/members/:id error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /org/integrations — List API keys for this org
// ---------------------------------------------------------------------------
router.get("/org/integrations", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.org_id;

    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, scope, permissions, rate_limit_per_hour, is_active, last_used_at, expires_at, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Never return key_hash
    res.json(data);
  } catch (err: any) {
    console.error("[org-admin] GET /org/integrations error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /org/integrations — Create integration API key (scope: INTEGRATION)
// ---------------------------------------------------------------------------
router.post("/org/integrations", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.org_id;
    const createdBy = req.user!.id;
    const { name, permissions, rate_limit_per_hour, expires_at } = req.body;

    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    // Generate a random API key — in production use crypto.randomBytes
    const rawKey = `hb_${Array.from({ length: 32 }, () =>
      Math.random().toString(36).charAt(2)
    ).join("")}`;

    // In production: const keyHash = bcrypt.hashSync(rawKey, 12);
    // Placeholder hash for now — MUST be replaced with bcrypt in deployment
    const keyHash = `$2b$12$placeholder_${Buffer.from(rawKey).toString("base64").slice(0, 40)}`;

    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        org_id: orgId,
        name,
        key_hash: keyHash,
        scope: "INTEGRATION",
        permissions: permissions ?? [],
        rate_limit_per_hour: rate_limit_per_hour ?? 1000,
        expires_at: expires_at ?? null,
        created_by: createdBy,
      })
      .select("id, name, scope, permissions, rate_limit_per_hour, is_active, expires_at, created_at")
      .single();

    if (error) throw error;

    // Return the raw key ONCE — it cannot be retrieved after this
    res.status(201).json({
      ...data,
      api_key: rawKey,
      warning: "Store this key securely. It will not be shown again.",
    });
  } catch (err: any) {
    console.error("[org-admin] POST /org/integrations error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /org/integrations/:id — Revoke API key
// ---------------------------------------------------------------------------
router.delete("/org/integrations/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.org_id;
    const keyId = req.params.id;

    const { data, error } = await supabase
      .from("api_keys")
      .update({ is_active: false })
      .eq("id", keyId)
      .eq("org_id", orgId)
      .select("id, name, is_active")
      .single();

    if (error) throw error;

    if (!data) {
      res.status(404).json({ error: "API key not found in this organization" });
      return;
    }

    res.json({ revoked: true, key: data });
  } catch (err: any) {
    console.error("[org-admin] DELETE /org/integrations/:id error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /org/billing — Billing summary (placeholder)
// ---------------------------------------------------------------------------
router.get("/org/billing", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.org_id;

    const { count: memberCount } = await supabase
      .from("org_members")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId);

    res.json({
      org_id: orgId,
      plan: "professional",
      status: "active",
      member_count: memberCount ?? 0,
      billing_cycle: "monthly",
      next_invoice_date: null,
      note: "Billing integration pending — this is a placeholder response",
    });
  } catch (err: any) {
    console.error("[org-admin] GET /org/billing error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /org/audit-log — Org audit log
// ---------------------------------------------------------------------------
router.get("/org/audit-log", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.org_id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, error, count } = await supabase
      .from("domain_events")
      .select("*", { count: "exact" })
      .eq("org_id", orgId)
      .order("emitted_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      events: data,
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (err: any) {
    console.error("[org-admin] GET /org/audit-log error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default router;
