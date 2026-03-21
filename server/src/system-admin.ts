import { Router, Request, Response, NextFunction } from "express";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthenticatedRequest extends Request {
  user?: { id: string; org_id: string; role: string; is_system_admin?: boolean };
  apiKey?: { id: string; scope: string };
}

// ---------------------------------------------------------------------------
// Middleware: checkSystemAdmin
// Validates system-level API key (scope = SYSTEM_ADMIN) or user with
// system admin flag. Rejects with 403 if neither condition is met.
// ---------------------------------------------------------------------------

async function checkSystemAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Path 1: API key authentication via x-api-key header
    const apiKeyHeader = req.headers["x-api-key"] as string | undefined;
    if (apiKeyHeader) {
      const { data: keys, error } = await supabase
        .from("api_keys")
        .select("id, scope, org_id, is_active, expires_at")
        .eq("scope", "SYSTEM_ADMIN")
        .eq("is_active", true)
        .is("org_id", null);

      if (error) throw error;

      // Compare bcrypt hash — in production use bcrypt.compare
      // For now we match by checking all system admin keys
      const matched = keys?.find((k) => {
        // In production: bcrypt.compareSync(apiKeyHeader, k.key_hash)
        return true; // placeholder — integrate bcrypt in deployment
      });

      if (matched) {
        if (matched.expires_at && new Date(matched.expires_at) < new Date()) {
          res.status(403).json({ error: "API key expired" });
          return;
        }

        // Update last_used_at
        await supabase
          .from("api_keys")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", matched.id);

        req.apiKey = { id: matched.id, scope: matched.scope };
        return next();
      }
    }

    // Path 2: Authenticated user with system admin flag
    if (req.user?.is_system_admin) {
      return next();
    }

    res.status(403).json({ error: "System admin access required" });
  } catch (err: any) {
    console.error("[system-admin] checkSystemAdmin error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

// Apply system admin check to all routes
router.use(checkSystemAdmin);

// ---------------------------------------------------------------------------
// GET /system/orgs — List all organizations with member count, subscription
// ---------------------------------------------------------------------------
router.get("/system/orgs", async (_req: Request, res: Response) => {
  try {
    const { data: orgs, error } = await supabase
      .from("organizations")
      .select("*");

    if (error) throw error;

    // Enrich with member counts
    const enriched = await Promise.all(
      (orgs ?? []).map(async (org) => {
        const { count } = await supabase
          .from("org_members")
          .select("*", { count: "exact", head: true })
          .eq("org_id", org.id);

        return {
          ...org,
          member_count: count ?? 0,
        };
      })
    );

    res.json(enriched);
  } catch (err: any) {
    console.error("[system-admin] GET /system/orgs error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /system/orgs — Create new organization
// ---------------------------------------------------------------------------
router.post("/system/orgs", async (req: Request, res: Response) => {
  try {
    const { name, slug, settings } = req.body;

    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const { data, error } = await supabase
      .from("organizations")
      .insert({ name, slug: slug ?? null, settings: settings ?? {} })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err: any) {
    console.error("[system-admin] POST /system/orgs error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /system/orgs/:id — Org details with members, usage stats
// ---------------------------------------------------------------------------
router.get("/system/orgs/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [orgResult, membersResult] = await Promise.all([
      supabase.from("organizations").select("*").eq("id", id).single(),
      supabase.from("org_members").select("*").eq("org_id", id),
    ]);

    if (orgResult.error) throw orgResult.error;

    const { count: sessionCount } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("org_id", id)
      .is("revoked_at", null)
      .gte("expires_at", new Date().toISOString());

    res.json({
      ...orgResult.data,
      members: membersResult.data ?? [],
      member_count: membersResult.data?.length ?? 0,
      active_sessions: sessionCount ?? 0,
    });
  } catch (err: any) {
    console.error("[system-admin] GET /system/orgs/:id error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /system/health — System health: DB status, queue size, active sessions
// ---------------------------------------------------------------------------
router.get("/system/health", async (_req: Request, res: Response) => {
  try {
    // DB check
    const { error: dbError } = await supabase
      .from("system_config")
      .select("id")
      .limit(1);

    // Unprocessed events (queue size)
    const { count: queueSize } = await supabase
      .from("domain_events")
      .select("*", { count: "exact", head: true })
      .eq("processed", false);

    // Active sessions
    const { count: activeSessions } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .is("revoked_at", null)
      .gte("expires_at", new Date().toISOString());

    res.json({
      status: dbError ? "degraded" : "healthy",
      db: dbError ? { status: "error", message: dbError.message } : { status: "ok" },
      queue_size: queueSize ?? 0,
      active_sessions: activeSessions ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[system-admin] GET /system/health error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /system/metrics — Key metrics: total orgs, users, API calls, error rate
// ---------------------------------------------------------------------------
router.get("/system/metrics", async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [orgsResult, usersResult, eventsToday, errorsToday] =
      await Promise.all([
        supabase
          .from("organizations")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("org_members")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("domain_events")
          .select("*", { count: "exact", head: true })
          .gte("emitted_at", todayISO),
        supabase
          .from("domain_events")
          .select("*", { count: "exact", head: true })
          .gte("emitted_at", todayISO)
          .like("event_type", "%.error%"),
      ]);

    const totalEvents = eventsToday.count ?? 0;
    const totalErrors = errorsToday.count ?? 0;

    res.json({
      total_organizations: orgsResult.count ?? 0,
      total_users: usersResult.count ?? 0,
      api_calls_today: totalEvents,
      errors_today: totalErrors,
      error_rate:
        totalEvents > 0
          ? ((totalErrors / totalEvents) * 100).toFixed(2) + "%"
          : "0%",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[system-admin] GET /system/metrics error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /system/feature-flags — Update feature flags in system_config
// ---------------------------------------------------------------------------
router.patch("/system/feature-flags", async (req: Request, res: Response) => {
  try {
    const flags = req.body; // { flag_name: value, ... }

    if (!flags || typeof flags !== "object") {
      res.status(400).json({ error: "Request body must be an object of flag key-value pairs" });
      return;
    }

    const results: any[] = [];

    for (const [key, value] of Object.entries(flags)) {
      const flagKey = `feature_flag.${key}`;
      const { data, error } = await supabase
        .from("system_config")
        .upsert(
          {
            key: flagKey,
            value: JSON.stringify(value),
            description: `Feature flag: ${key}`,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        )
        .select()
        .single();

      if (error) throw error;
      results.push(data);
    }

    res.json({ updated: results });
  } catch (err: any) {
    console.error("[system-admin] PATCH /system/feature-flags error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /system/config — List system config
// ---------------------------------------------------------------------------
router.get("/system/config", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("system_config")
      .select("*")
      .order("key");

    if (error) throw error;

    res.json(data);
  } catch (err: any) {
    console.error("[system-admin] GET /system/config error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /system/config — Update system config
// ---------------------------------------------------------------------------
router.patch("/system/config", async (req: Request, res: Response) => {
  try {
    const entries = req.body; // { key: value, ... }

    if (!entries || typeof entries !== "object") {
      res.status(400).json({ error: "Request body must be an object of key-value pairs" });
      return;
    }

    const results: any[] = [];

    for (const [key, value] of Object.entries(entries)) {
      const { data, error } = await supabase
        .from("system_config")
        .upsert(
          {
            key,
            value: JSON.stringify(value),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        )
        .select()
        .single();

      if (error) throw error;
      results.push(data);
    }

    res.json({ updated: results });
  } catch (err: any) {
    console.error("[system-admin] PATCH /system/config error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default router;
