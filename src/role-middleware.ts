import { Request, Response, NextFunction } from "express";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RolePermissions {
  modules: string[];
  actions: string[];       // 'read', 'write', 'delete', 'approve', 'write_own'
  dataFilter: Record<string, any>;  // additional query filters applied to data access
  excludedFields?: string[];        // fields to strip from responses
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    org_id: string;
    role: string;
    active_role?: string;
    roles?: string[];
  };
  allowedModules?: string[];
  allowedActions?: string[];
  dataFilter?: Record<string, any>;
  excludedFields?: string[];
  routeModule?: string;
}

// ---------------------------------------------------------------------------
// Role Permissions — All ISO Roles
// ---------------------------------------------------------------------------

export const ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  EXECUTIVE: {
    modules: [
      "goals",
      "kpis",
      "financials_overview",
      "compliance_status",
      "strategic_reviews",
      "decisions",
    ],
    actions: ["read", "approve"],
    dataFilter: {},
  },

  QUALITY_MANAGER: {
    modules: ["*"],
    actions: ["*"],
    dataFilter: {},
  },

  PROCESS_OWNER: {
    modules: ["processes", "nc", "improvements", "tasks", "documents"],
    actions: ["read", "write"],
    dataFilter: { owner_scoped: true },
  },

  INTERNAL_AUDITOR: {
    modules: [
      "processes",
      "nc",
      "compliance",
      "documents",
      "audits",
      "training",
    ],
    actions: ["read"],
    dataFilter: {
      write_allowed_on: ["findings"],
    },
  },

  HR_MANAGER: {
    modules: ["capabilities", "training", "development_plans", "goals"],
    actions: ["read", "write", "approve"],
    dataFilter: {},
  },

  DOCUMENT_CONTROLLER: {
    modules: ["documents", "compliance"],
    actions: ["read", "write", "approve"],
    dataFilter: {},
  },

  FINANCE_CONTROLLER: {
    modules: ["transactions", "invoices", "payouts", "reports", "fx"],
    actions: ["read", "write", "approve"],
    dataFilter: {},
  },

  OPERATIONS_MANAGER: {
    modules: ["tasks", "meetings", "processes", "team_status"],
    actions: ["read", "write"],
    dataFilter: {},
  },

  MANAGEMENT_REPRESENTATIVE: {
    modules: ["*", "strategic_reviews"],
    actions: ["*"],
    dataFilter: {},
  },

  EXTERNAL_AUDITOR: {
    modules: [
      "processes",
      "nc",
      "improvements",
      "documents",
      "compliance",
      "audits",
      "training",
      "risks",
      "kpis",
      "management_reviews",
    ],
    actions: ["read"],
    dataFilter: {},
    excludedFields: ["financial_data", "capability_names", "chat_messages"],
  },

  EMPLOYEE: {
    modules: ["my_tasks", "my_capabilities", "my_development", "nc_report"],
    actions: ["read", "write_own"],
    dataFilter: { self_scoped: true },
  },

  SUPPLIER: {
    modules: ["supplier_portal"],
    actions: ["read", "write_own"],
    dataFilter: { supplier_scoped: true },
  },
};

// ---------------------------------------------------------------------------
// roleFilter — Attach permissions to request based on active role
// ---------------------------------------------------------------------------

export function roleFilter(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const activeRole = req.user?.active_role;

    if (!activeRole) {
      res.status(401).json({ error: "No active role set for this session" });
      return;
    }

    const permissions = ROLE_PERMISSIONS[activeRole];

    if (!permissions) {
      res.status(403).json({ error: `Unknown role: ${activeRole}` });
      return;
    }

    // Attach permissions to request
    req.allowedModules = permissions.modules;
    req.allowedActions = permissions.actions;
    req.dataFilter = permissions.dataFilter;
    req.excludedFields = permissions.excludedFields;

    // Check if the route's module is allowed
    const routeModule = req.routeModule ?? extractModuleFromPath(req.path);

    if (routeModule && !isModuleAllowed(routeModule, permissions.modules)) {
      res.status(403).json({
        error: "Access denied",
        detail: `Role ${activeRole} does not have access to module: ${routeModule}`,
      });
      return;
    }

    return next();
  } catch (err: any) {
    console.error("[role-middleware] roleFilter error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// requireRole — Check if user has ANY of the specified roles
// ---------------------------------------------------------------------------

export function requireRole(...roles: string[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    const userRoles = req.user?.roles ?? [];
    const activeRole = req.user?.active_role;

    const hasRole = roles.some(
      (role) => userRoles.includes(role) || activeRole === role
    );

    if (!hasRole) {
      res.status(403).json({
        error: "Insufficient role",
        detail: `Required one of: ${roles.join(", ")}`,
        current_roles: userRoles,
      });
      return;
    }

    return next();
  };
}

// ---------------------------------------------------------------------------
// requireAction — Check if user's role allows a specific action
// ---------------------------------------------------------------------------

export function requireAction(action: string) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    const activeRole = req.user?.active_role;

    if (!activeRole) {
      res.status(401).json({ error: "No active role set" });
      return;
    }

    const permissions = ROLE_PERMISSIONS[activeRole];

    if (!permissions) {
      res.status(403).json({ error: `Unknown role: ${activeRole}` });
      return;
    }

    if (!isActionAllowed(action, permissions.actions)) {
      res.status(403).json({
        error: "Action not permitted",
        detail: `Role ${activeRole} cannot perform action: ${action}`,
        allowed_actions: permissions.actions,
      });
      return;
    }

    return next();
  };
}

// ---------------------------------------------------------------------------
// filterResponse — Strip excludedFields from response based on role
// ---------------------------------------------------------------------------

export function filterResponse(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const excluded = req.excludedFields;

  if (!excluded || excluded.length === 0) {
    return next();
  }

  // Override res.json to filter fields before sending
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    const filtered = stripFields(body, excluded);
    return originalJson(filtered);
  };

  return next();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract module name from request path.
 * E.g., /api/processes/123 → "processes"
 */
function extractModuleFromPath(path: string): string | null {
  const segments = path.split("/").filter(Boolean);
  // Skip 'api' prefix if present
  const moduleIndex = segments[0] === "api" ? 1 : 0;
  return segments[moduleIndex] ?? null;
}

/**
 * Check if a module is allowed by the permissions list.
 * Wildcard '*' grants access to all modules.
 */
function isModuleAllowed(module: string, allowedModules: string[]): boolean {
  if (allowedModules.includes("*")) return true;
  return allowedModules.includes(module);
}

/**
 * Check if an action is allowed by the permissions list.
 * Wildcard '*' grants all actions.
 */
function isActionAllowed(action: string, allowedActions: string[]): boolean {
  if (allowedActions.includes("*")) return true;
  return allowedActions.includes(action);
}

/**
 * Recursively strip fields from an object or array.
 */
function stripFields(data: any, fields: string[]): any {
  if (Array.isArray(data)) {
    return data.map((item) => stripFields(item, fields));
  }

  if (data && typeof data === "object") {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (!fields.includes(key)) {
        result[key] = stripFields(value, fields);
      }
    }
    return result;
  }

  return data;
}
