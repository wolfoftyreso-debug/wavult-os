import { Router, Request, Response } from "express";
import { supabase } from "./supabase";
import { eventBus } from "./events";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AuthUser {
  id: string;
  org_id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const router = Router();

/** Pull authenticated user or respond 401. */
function getUser(req: Request, res: Response): AuthUser | null {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.user;
}

// ===========================================================================
// HELPER FUNCTIONS (exported)
// ===========================================================================

/**
 * Resolve whether a user holds a specific permission.
 *
 * Resolution order:
 *   1. Get user's roles from org_members
 *   2. Get permissions for those roles from role_permissions
 *   3. Apply permission_overrides (GRANT adds, REVOKE removes)
 *   4. Evaluate condition (e.g. own_only: compare entity owner with userId)
 *   5. Return true/false
 */
export async function checkPermission(
  userId: string,
  orgId: string,
  permissionCode: string,
  params?: { entityOwnerId?: string; entityId?: string }
): Promise<boolean> {
  // 1. Get user's roles
  const { data: membership } = await supabase
    .from("org_members")
    .select("roles, is_org_admin")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .single();

  if (!membership) return false;

  // Org admins bypass permission checks
  if (membership.is_org_admin) return true;

  // 2. Get role_definition IDs for the user's roles
  const { data: roleDefs } = await supabase
    .from("role_definitions")
    .select("id")
    .or(`org_id.eq.${orgId},is_system_role.eq.true`)
    .in("role_code", membership.roles);

  if (!roleDefs || roleDefs.length === 0) return false;

  const roleDefIds = roleDefs.map((r: any) => r.id);

  // 3. Look up the permission by code
  const { data: perm } = await supabase
    .from("permissions")
    .select("id")
    .eq("code", permissionCode)
    .single();

  if (!perm) return false;

  // 4. Check role_permissions
  const { data: rolePerms } = await supabase
    .from("role_permissions")
    .select("granted, condition")
    .in("role_definition_id", roleDefIds)
    .eq("permission_id", perm.id);

  let granted = rolePerms?.some((rp: any) => rp.granted) ?? false;
  let condition: any = rolePerms?.find((rp: any) => rp.granted && rp.condition)?.condition ?? {};

  // 5. Apply overrides
  const { data: overrides } = await supabase
    .from("permission_overrides")
    .select("override_type")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .eq("permission_id", perm.id)
    .eq("is_active", true)
    .or("valid_until.is.null,valid_until.gt.now()");

  if (overrides && overrides.length > 0) {
    for (const ov of overrides) {
      if (ov.override_type === "GRANT") granted = true;
      if (ov.override_type === "REVOKE") granted = false;
    }
  }

  // 6. Evaluate condition (own_only)
  if (granted && condition?.own_only && params?.entityOwnerId) {
    if (params.entityOwnerId !== userId) {
      return false;
    }
  }

  return granted;
}

/**
 * Log an immutable entry to the permission_audit table.
 */
export async function logPermissionAudit(
  orgId: string,
  action: string,
  targetUserId: string | null,
  performedBy: string,
  details: any,
  ipAddress?: string
): Promise<void> {
  await supabase.from("permission_audit").insert({
    org_id: orgId,
    action,
    target_user_id: targetUserId,
    performed_by: performedBy,
    details,
    ip_address: ipAddress ?? null,
    created_at: new Date().toISOString(),
  });
}

/**
 * Separation of Duties enforcement.
 * Users who created an entity cannot approve it.
 */
export async function checkSeparationOfDuties(
  userId: string,
  orgId: string,
  action: string,
  resource: string,
  entityId?: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Only enforce for APPROVE actions
  if (action !== "APPROVE") {
    return { allowed: true };
  }

  const restrictedResources = ["nc", "improvements", "documents", "fx_adjustments", "access_requests"];
  if (!restrictedResources.includes(resource)) {
    return { allowed: true };
  }

  if (!entityId) {
    return { allowed: true };
  }

  // Check the entities table to find if the user created this entity
  const { data: entity } = await supabase
    .from("entities")
    .select("owner_id")
    .eq("source_id", entityId)
    .eq("org_id", orgId)
    .single();

  if (entity && entity.owner_id === userId) {
    return {
      allowed: false,
      reason: `Separation of duties: user ${userId} created this ${resource} and cannot approve it`,
    };
  }

  return { allowed: true };
}

// ===========================================================================
// MIDDLEWARE — require a specific permission
// ===========================================================================

function requirePermission(permissionCode: string) {
  return async (req: Request, res: Response, next: Function) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const allowed = await checkPermission(user.id, user.org_id, permissionCode);
    if (!allowed) {
      await logPermissionAudit(
        user.org_id,
        "ACCESS_DENIED",
        user.id,
        user.id,
        { attempted_permission: permissionCode },
        req.ip
      );
      res.status(403).json({ error: "Forbidden", required: permissionCode });
      return;
    }
    next();
  };
}

// ===========================================================================
// ADMIN ENDPOINTS (require ADMIN.CONFIGURE.roles)
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /api/admin/roles — all roles with their permissions
// ---------------------------------------------------------------------------
router.get(
  "/api/admin/roles",
  requirePermission("ADMIN.CONFIGURE.roles"),
  async (req: Request, res: Response) => {
    try {
      const user = getUser(req, res);
      if (!user) return;

      const { data: roles, error } = await supabase
        .from("role_definitions")
        .select("*, role_permissions(*, permissions(*))")
        .or(`org_id.eq.${user.org_id},is_system_role.eq.true`);

      if (error) throw error;
      res.json(roles);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/admin/roles — create new role
// ---------------------------------------------------------------------------
router.post(
  "/api/admin/roles",
  requirePermission("ADMIN.CONFIGURE.roles"),
  async (req: Request, res: Response) => {
    try {
      const user = getUser(req, res);
      if (!user) return;

      const { role_code, display_name, description, template_role_id } = req.body;

      // Create the role
      const { data: role, error } = await supabase
        .from("role_definitions")
        .insert({
          org_id: user.org_id,
          role_code,
          display_name,
          description,
          is_system_role: false,
          base_permissions: {},
        })
        .select()
        .single();

      if (error) throw error;

      // If copying from a template, duplicate its role_permissions
      if (template_role_id) {
        const { data: templatePerms } = await supabase
          .from("role_permissions")
          .select("permission_id, granted, condition")
          .eq("role_definition_id", template_role_id);

        if (templatePerms && templatePerms.length > 0) {
          const newPerms = templatePerms.map((tp: any) => ({
            role_definition_id: role.id,
            permission_id: tp.permission_id,
            granted: tp.granted,
            condition: tp.condition,
          }));
          await supabase.from("role_permissions").insert(newPerms);
        }
      }

      await logPermissionAudit(
        user.org_id,
        "PERMISSION_GRANTED",
        null,
        user.id,
        { action: "role_created", role_id: role.id, role_code, template_role_id },
        req.ip
      );

      eventBus.emit({
        org_id: user.org_id,
        event_type: "role.created" as any,
        entity_type: "role_definition",
        source_id: role.id,
        actor_id: user.id,
        payload: { role_code },
      });

      res.status(201).json(role);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/admin/roles/:id — update role permissions
// ---------------------------------------------------------------------------
router.patch(
  "/api/admin/roles/:id",
  requirePermission("ADMIN.CONFIGURE.roles"),
  async (req: Request, res: Response) => {
    try {
      const user = getUser(req, res);
      if (!user) return;

      const roleId = req.params.id;
      const { display_name, description, permissions: permChanges } = req.body;

      // Update role metadata if provided
      if (display_name || description) {
        const updates: any = {};
        if (display_name) updates.display_name = display_name;
        if (description) updates.description = description;

        await supabase
          .from("role_definitions")
          .update(updates)
          .eq("id", roleId);
      }

      // Update permission assignments: { permission_id, granted, condition }[]
      if (permChanges && Array.isArray(permChanges)) {
        for (const pc of permChanges) {
          const { data: existing } = await supabase
            .from("role_permissions")
            .select("id")
            .eq("role_definition_id", roleId)
            .eq("permission_id", pc.permission_id)
            .single();

          if (existing) {
            await supabase
              .from("role_permissions")
              .update({ granted: pc.granted, condition: pc.condition ?? {} })
              .eq("id", existing.id);
          } else {
            await supabase.from("role_permissions").insert({
              role_definition_id: roleId,
              permission_id: pc.permission_id,
              granted: pc.granted,
              condition: pc.condition ?? {},
            });
          }
        }

        await logPermissionAudit(
          user.org_id,
          "PERMISSION_GRANTED",
          null,
          user.id,
          { action: "role_permissions_updated", role_id: roleId, changes: permChanges },
          req.ip
        );
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/admin/roles/:id — deactivate role (soft delete)
// ---------------------------------------------------------------------------
router.delete(
  "/api/admin/roles/:id",
  requirePermission("ADMIN.CONFIGURE.roles"),
  async (req: Request, res: Response) => {
    try {
      const user = getUser(req, res);
      if (!user) return;

      const roleId = req.params.id;

      const { error } = await supabase
        .from("role_definitions")
        .update({ is_active: false })
        .eq("id", roleId)
        .eq("org_id", user.org_id);

      if (error) throw error;

      await logPermissionAudit(
        user.org_id,
        "ROLE_REMOVED",
        null,
        user.id,
        { action: "role_deactivated", role_id: roleId },
        req.ip
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/admin/permissions — all permissions grouped by module
// ---------------------------------------------------------------------------
router.get(
  "/api/admin/permissions",
  requirePermission("ADMIN.CONFIGURE.roles"),
  async (req: Request, res: Response) => {
    try {
      const user = getUser(req, res);
      if (!user) return;

      const { data: permissions, error } = await supabase
        .from("permissions")
        .select("*")
        .order("module")
        .order("resource")
        .order("action");

      if (error) throw error;

      // Group by module
      const grouped: Record<string, any[]> = {};
      for (const p of permissions ?? []) {
        if (!grouped[p.module]) grouped[p.module] = [];
        grouped[p.module].push(p);
      }

      res.json(grouped);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/admin/members/:userId/roles — assign role to user
// DUAL AUTH: assigning ADMIN role requires a different admin to confirm
// ---------------------------------------------------------------------------
router.post(
  "/api/admin/members/:userId/roles",
  requirePermission("ADMIN.CONFIGURE.roles"),
  async (req: Request, res: Response) => {
    try {
      const user = getUser(req, res);
      if (!user) return;

      const targetUserId = req.params.userId;
      const { role } = req.body;

      // Separation of duties: cannot assign roles to yourself
      if (targetUserId === user.id) {
        res.status(403).json({
          error: "Separation of duties violation: cannot assign roles to yourself",
        });
        return;
      }

      // DUAL AUTH: if assigning ADMIN-level role, require a different admin
      const adminRoles = ["QUALITY_MANAGER", "MANAGEMENT_REPRESENTATIVE"];
      if (adminRoles.includes(role) || role.startsWith("ADMIN")) {
        // Verify the performer is an admin and is different from the target
        if (user.id === targetUserId) {
          res.status(403).json({
            error: "Dual authorization required: a different admin must confirm admin role assignment",
          });
          return;
        }
      }

      // Get current membership
      const { data: membership } = await supabase
        .from("org_members")
        .select("id, roles")
        .eq("org_id", user.org_id)
        .eq("user_id", targetUserId)
        .single();

      if (!membership) {
        res.status(404).json({ error: "User not found in organization" });
        return;
      }

      const updatedRoles = [...new Set([...membership.roles, role])];

      const { error } = await supabase
        .from("org_members")
        .update({ roles: updatedRoles })
        .eq("id", membership.id);

      if (error) throw error;

      await logPermissionAudit(
        user.org_id,
        "ROLE_ASSIGNED",
        targetUserId,
        user.id,
        { role, previous_roles: membership.roles, new_roles: updatedRoles },
        req.ip
      );

      eventBus.emit({
        org_id: user.org_id,
        event_type: "role.assigned" as any,
        entity_type: "org_member",
        source_id: membership.id,
        actor_id: user.id,
        payload: { target_user_id: targetUserId, role },
      });

      res.json({ success: true, roles: updatedRoles });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/admin/members/:userId/roles/:role — remove role from user
// ---------------------------------------------------------------------------
router.delete(
  "/api/admin/members/:userId/roles/:role",
  requirePermission("ADMIN.CONFIGURE.roles"),
  async (req: Request, res: Response) => {
    try {
      const user = getUser(req, res);
      if (!user) return;

      const targetUserId = req.params.userId;
      const roleToRemove = req.params.role;

      const { data: membership } = await supabase
        .from("org_members")
        .select("id, roles")
        .eq("org_id", user.org_id)
        .eq("user_id", targetUserId)
        .single();

      if (!membership) {
        res.status(404).json({ error: "User not found in organization" });
        return;
      }

      const updatedRoles = membership.roles.filter((r: string) => r !== roleToRemove);

      const { error } = await supabase
        .from("org_members")
        .update({ roles: updatedRoles })
        .eq("id", membership.id);

      if (error) throw error;

      await logPermissionAudit(
        user.org_id,
        "ROLE_REMOVED",
        targetUserId,
        user.id,
        { role: roleToRemove, previous_roles: membership.roles, new_roles: updatedRoles },
        req.ip
      );

      res.json({ success: true, roles: updatedRoles });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/admin/overrides — create permission override
// ---------------------------------------------------------------------------
router.post(
  "/api/admin/overrides",
  requirePermission("ADMIN.CONFIGURE.roles"),
  async (req: Request, res: Response) => {
    try {
      const user = getUser(req, res);
      if (!user) return;

      const { user_id: targetUserId, permission_id, override_type, reason, valid_until } = req.body;

      // Cannot grant yourself elevated permissions
      if (targetUserId === user.id && override_type === "GRANT") {
        res.status(403).json({
          error: "Separation of duties violation: cannot grant yourself elevated permissions",
        });
        return;
      }

      if (!valid_until) {
        res.status(400).json({ error: "valid_until is required for overrides" });
        return;
      }

      const { data: override, error } = await supabase
        .from("permission_overrides")
        .insert({
          org_id: user.org_id,
          user_id: targetUserId,
          permission_id,
          override_type,
          reason,
          granted_by: user.id,
          valid_until,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      await logPermissionAudit(
        user.org_id,
        "OVERRIDE_CREATED",
        targetUserId,
        user.id,
        { override_id: override.id, permission_id, override_type, reason, valid_until },
        req.ip
      );

      res.status(201).json(override);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/admin/overrides — list active overrides
// ---------------------------------------------------------------------------
router.get(
  "/api/admin/overrides",
  requirePermission("ADMIN.CONFIGURE.roles"),
  async (req: Request, res: Response) => {
    try {
      const user = getUser(req, res);
      if (!user) return;

      const { data: overrides, error } = await supabase
        .from("permission_overrides")
        .select("*, permissions(code, display_name, module, resource)")
        .eq("org_id", user.org_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json(overrides);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/admin/overrides/:id — revoke override
// ---------------------------------------------------------------------------
router.delete(
  "/api/admin/overrides/:id",
  requirePermission("ADMIN.CONFIGURE.roles"),
  async (req: Request, res: Response) => {
    try {
      const user = getUser(req, res);
      if (!user) return;

      const overrideId = req.params.id;

      const { data: override } = await supabase
        .from("permission_overrides")
        .select("user_id, permission_id")
        .eq("id", overrideId)
        .eq("org_id", user.org_id)
        .single();

      if (!override) {
        res.status(404).json({ error: "Override not found" });
        return;
      }

      const { error } = await supabase
        .from("permission_overrides")
        .update({ is_active: false })
        .eq("id", overrideId);

      if (error) throw error;

      await logPermissionAudit(
        user.org_id,
        "OVERRIDE_EXPIRED",
        override.user_id,
        user.id,
        { override_id: overrideId, permission_id: override.permission_id },
        req.ip
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/admin/audit — permission audit trail with filters
// ---------------------------------------------------------------------------
router.get(
  "/api/admin/audit",
  requirePermission("ADMIN.CONFIGURE.roles"),
  async (req: Request, res: Response) => {
    try {
      const user = getUser(req, res);
      if (!user) return;

      let query = supabase
        .from("permission_audit")
        .select("*")
        .eq("org_id", user.org_id)
        .order("created_at", { ascending: false })
        .limit(200);

      // Filters
      if (req.query.action) {
        query = query.eq("action", req.query.action as string);
      }
      if (req.query.user_id) {
        query = query.eq("target_user_id", req.query.user_id as string);
      }
      if (req.query.from) {
        query = query.gte("created_at", req.query.from as string);
      }
      if (req.query.to) {
        query = query.lte("created_at", req.query.to as string);
      }

      const { data, error } = await query;
      if (error) throw error;

      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/admin/access-matrix — all users × all permissions matrix
// ---------------------------------------------------------------------------
router.get(
  "/api/admin/access-matrix",
  requirePermission("ADMIN.CONFIGURE.roles"),
  async (req: Request, res: Response) => {
    try {
      const user = getUser(req, res);
      if (!user) return;

      // Get all org members
      const { data: members } = await supabase
        .from("org_members")
        .select("user_id, roles, is_org_admin")
        .eq("org_id", user.org_id);

      // Get all permissions
      const { data: allPermissions } = await supabase
        .from("permissions")
        .select("id, code, module, action, resource")
        .order("module")
        .order("resource");

      // Get all role_definitions for this org
      const { data: roleDefs } = await supabase
        .from("role_definitions")
        .select("id, role_code")
        .or(`org_id.eq.${user.org_id},is_system_role.eq.true`);

      // Get all role_permissions
      const roleDefIds = (roleDefs ?? []).map((r: any) => r.id);
      const { data: rolePerms } = await supabase
        .from("role_permissions")
        .select("role_definition_id, permission_id, granted")
        .in("role_definition_id", roleDefIds);

      // Build role_code -> permission_ids map
      const roleCodeById: Record<string, string> = {};
      for (const rd of roleDefs ?? []) {
        roleCodeById[rd.id] = rd.role_code;
      }

      const rolePermMap: Record<string, Set<string>> = {};
      for (const rp of rolePerms ?? []) {
        if (!rp.granted) continue;
        const code = roleCodeById[rp.role_definition_id];
        if (!code) continue;
        if (!rolePermMap[code]) rolePermMap[code] = new Set();
        rolePermMap[code].add(rp.permission_id);
      }

      // Get all active overrides for this org
      const { data: overrides } = await supabase
        .from("permission_overrides")
        .select("user_id, permission_id, override_type")
        .eq("org_id", user.org_id)
        .eq("is_active", true)
        .or("valid_until.is.null,valid_until.gt.now()");

      // Build matrix
      const matrix: Array<{
        user_id: string;
        roles: string[];
        permissions: Record<string, "granted" | "denied" | "override_grant" | "override_revoke">;
      }> = [];

      for (const member of members ?? []) {
        const entry: any = {
          user_id: member.user_id,
          roles: member.roles,
          permissions: {},
        };

        for (const perm of allPermissions ?? []) {
          // Check role-based grant
          let status: "granted" | "denied" | "override_grant" | "override_revoke" = "denied";
          if (member.is_org_admin) {
            status = "granted";
          } else {
            for (const role of member.roles) {
              if (rolePermMap[role]?.has(perm.id)) {
                status = "granted";
                break;
              }
            }
          }

          // Check overrides
          const userOverrides = (overrides ?? []).filter(
            (o: any) => o.user_id === member.user_id && o.permission_id === perm.id
          );
          for (const ov of userOverrides) {
            if (ov.override_type === "GRANT") status = "override_grant";
            if (ov.override_type === "REVOKE") status = "override_revoke";
          }

          entry.permissions[perm.code] = status;
        }

        matrix.push(entry);
      }

      res.json({ permissions: allPermissions, matrix });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/admin/access-requests — pending access requests
// ---------------------------------------------------------------------------
router.get(
  "/api/admin/access-requests",
  requirePermission("ADMIN.CONFIGURE.roles"),
  async (req: Request, res: Response) => {
    try {
      const user = getUser(req, res);
      if (!user) return;

      const { data, error } = await supabase
        .from("access_requests")
        .select("*, permissions:requested_permission_id(code, display_name, module)")
        .eq("org_id", user.org_id)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/admin/access-requests/:id — APPROVE/DENY with reason
// If APPROVED: auto-create permission_override with valid_until
// ---------------------------------------------------------------------------
router.patch(
  "/api/admin/access-requests/:id",
  requirePermission("ADMIN.CONFIGURE.roles"),
  async (req: Request, res: Response) => {
    try {
      const user = getUser(req, res);
      if (!user) return;

      const requestId = req.params.id;
      const { status, reason, valid_until } = req.body;

      if (!["APPROVED", "DENIED"].includes(status)) {
        res.status(400).json({ error: "Status must be APPROVED or DENIED" });
        return;
      }

      // Get the access request
      const { data: accessReq } = await supabase
        .from("access_requests")
        .select("*")
        .eq("id", requestId)
        .eq("org_id", user.org_id)
        .single();

      if (!accessReq) {
        res.status(404).json({ error: "Access request not found" });
        return;
      }

      if (accessReq.status !== "PENDING") {
        res.status(400).json({ error: "Access request is no longer pending" });
        return;
      }

      // Separation of duties: cannot approve your own request
      if (accessReq.requester_id === user.id) {
        res.status(403).json({
          error: "Separation of duties violation: cannot approve your own access request",
        });
        return;
      }

      // Update the request
      const { error: updateError } = await supabase
        .from("access_requests")
        .update({
          status,
          decided_by: user.id,
          decided_at: new Date().toISOString(),
          valid_until: valid_until ?? accessReq.valid_until,
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // If approved and there's a requested permission, auto-create override
      if (status === "APPROVED" && accessReq.requested_permission_id) {
        const overrideValidUntil = valid_until || accessReq.valid_until;
        if (!overrideValidUntil) {
          res.status(400).json({ error: "valid_until is required when approving access" });
          return;
        }

        await supabase.from("permission_overrides").insert({
          org_id: user.org_id,
          user_id: accessReq.requester_id,
          permission_id: accessReq.requested_permission_id,
          override_type: "GRANT",
          reason: reason || accessReq.reason,
          granted_by: user.id,
          valid_until: overrideValidUntil,
          is_active: true,
        });

        await logPermissionAudit(
          user.org_id,
          "OVERRIDE_CREATED",
          accessReq.requester_id,
          user.id,
          {
            source: "access_request",
            access_request_id: requestId,
            permission_id: accessReq.requested_permission_id,
            valid_until: overrideValidUntil,
          },
          req.ip
        );
      }

      await logPermissionAudit(
        user.org_id,
        status === "APPROVED" ? "PERMISSION_GRANTED" : "PERMISSION_REVOKED",
        accessReq.requester_id,
        user.id,
        { access_request_id: requestId, status, reason },
        req.ip
      );

      res.json({ success: true, status });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ===========================================================================
// USER ENDPOINTS
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /api/me/permissions — my resolved permissions
// ---------------------------------------------------------------------------
router.get("/api/me/permissions", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    // Get membership
    const { data: membership } = await supabase
      .from("org_members")
      .select("roles, is_org_admin")
      .eq("org_id", user.org_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      res.json({ permissions: [], roles: [] });
      return;
    }

    // Get all permissions
    const { data: allPermissions } = await supabase
      .from("permissions")
      .select("id, code, display_name, module, action, resource, is_sensitive");

    if (membership.is_org_admin) {
      // Admins get everything
      res.json({
        permissions: (allPermissions ?? []).map((p: any) => ({
          ...p,
          source: "org_admin",
        })),
        roles: membership.roles,
        is_org_admin: true,
      });
      return;
    }

    // Get role definitions
    const { data: roleDefs } = await supabase
      .from("role_definitions")
      .select("id, role_code")
      .or(`org_id.eq.${user.org_id},is_system_role.eq.true`)
      .in("role_code", membership.roles);

    const roleDefIds = (roleDefs ?? []).map((r: any) => r.id);

    // Get role_permissions
    const { data: rolePerms } = await supabase
      .from("role_permissions")
      .select("permission_id, granted, condition")
      .in("role_definition_id", roleDefIds)
      .eq("granted", true);

    const grantedPermIds = new Set((rolePerms ?? []).map((rp: any) => rp.permission_id));

    // Get overrides
    const { data: overrides } = await supabase
      .from("permission_overrides")
      .select("permission_id, override_type")
      .eq("org_id", user.org_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .or("valid_until.is.null,valid_until.gt.now()");

    // Apply overrides
    const overrideGrants = new Set<string>();
    const overrideRevokes = new Set<string>();
    for (const ov of overrides ?? []) {
      if (ov.override_type === "GRANT") overrideGrants.add(ov.permission_id);
      if (ov.override_type === "REVOKE") overrideRevokes.add(ov.permission_id);
    }

    const resolved = (allPermissions ?? [])
      .filter((p: any) => {
        if (overrideRevokes.has(p.id)) return false;
        if (overrideGrants.has(p.id)) return true;
        return grantedPermIds.has(p.id);
      })
      .map((p: any) => ({
        ...p,
        source: overrideGrants.has(p.id) ? "override" : "role",
      }));

    res.json({
      permissions: resolved,
      roles: membership.roles,
      is_org_admin: false,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/me/roles — my roles
// ---------------------------------------------------------------------------
router.get("/api/me/roles", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data: membership, error } = await supabase
      .from("org_members")
      .select("roles, primary_role, is_org_admin")
      .eq("org_id", user.org_id)
      .eq("user_id", user.id)
      .single();

    if (error) throw error;

    // Get role details
    const { data: roleDefs } = await supabase
      .from("role_definitions")
      .select("role_code, display_name, description")
      .or(`org_id.eq.${user.org_id},is_system_role.eq.true`)
      .in("role_code", membership?.roles ?? []);

    res.json({
      roles: roleDefs,
      primary_role: membership?.primary_role,
      is_org_admin: membership?.is_org_admin,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/me/access-requests — request elevated permission
// ---------------------------------------------------------------------------
router.post("/api/me/access-requests", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { permission_id, requested_role, reason, valid_until } = req.body;

    if (!reason) {
      res.status(400).json({ error: "Reason is required" });
      return;
    }

    if (!permission_id && !requested_role) {
      res.status(400).json({ error: "Either permission_id or requested_role is required" });
      return;
    }

    const { data: accessReq, error } = await supabase
      .from("access_requests")
      .insert({
        org_id: user.org_id,
        requester_id: user.id,
        requested_permission_id: permission_id ?? null,
        requested_role: requested_role ?? null,
        reason,
        status: "PENDING",
        valid_until: valid_until ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    eventBus.emit({
      org_id: user.org_id,
      event_type: "access_request.created" as any,
      entity_type: "access_request",
      source_id: accessReq.id,
      actor_id: user.id,
      payload: { permission_id, requested_role, reason },
    });

    res.status(201).json(accessReq);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/me/active-role — switch active (primary) role
// ---------------------------------------------------------------------------
router.patch("/api/me/active-role", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { role } = req.body;

    // Verify user holds this role
    const { data: membership } = await supabase
      .from("org_members")
      .select("id, roles")
      .eq("org_id", user.org_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      res.status(404).json({ error: "Membership not found" });
      return;
    }

    if (!membership.roles.includes(role)) {
      res.status(400).json({ error: "You do not hold this role" });
      return;
    }

    const { error } = await supabase
      .from("org_members")
      .update({ primary_role: role })
      .eq("id", membership.id);

    if (error) throw error;

    res.json({ success: true, active_role: role });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// Export
// ===========================================================================
export default router;
