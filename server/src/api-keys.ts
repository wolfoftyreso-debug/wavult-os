import { Router, Request, Response, NextFunction } from "express";
import { createHash, randomBytes } from "crypto";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// SQL (run once to create table):
// ---------------------------------------------------------------------------
// CREATE TABLE IF NOT EXISTS api_keys (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   org_id UUID REFERENCES organizations(id),
//   key_hash TEXT NOT NULL,  -- SHA-256 of the raw key
//   name TEXT NOT NULL,
//   scopes TEXT[] DEFAULT ARRAY['read'],
//   last_used_at TIMESTAMPTZ,
//   expires_at TIMESTAMPTZ,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
// ---------------------------------------------------------------------------

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

function generateKey(): string {
  // Format: pd_live_<32 random hex bytes>
  return `pd_live_${randomBytes(32).toString("hex")}`;
}

// ─── Middleware: apiKeyAuth ───────────────────────────────────────────────────

/**
 * Validates a Bearer API key from the Authorization header.
 * If valid, populates req.user with org_id and scopes.
 * Falls through to next() on success; sends 401 on failure.
 */
export async function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer pd_live_")) {
    // Not an API key — fall through to JWT auth
    return next();
  }

  const rawKey = authHeader.slice(7); // Remove "Bearer "
  const keyHash = hashKey(rawKey);

  try {
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, org_id, scopes, expires_at")
      .eq("key_hash", keyHash)
      .single();

    if (error || !data) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }

    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      res.status(401).json({ error: "API key has expired" });
      return;
    }

    // Update last_used_at (fire-and-forget)
    supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id)
      .then(() => {});

    // Attach to request
    (req as any).user = {
      id: "api-key",
      org_id: data.org_id,
      role: "api",
      scopes: data.scopes,
    };
    (req as any).apiKeyId = data.id;

    next();
  } catch (err: any) {
    res.status(500).json({ error: "API key validation failed" });
  }
}

// ─── Rate limit info per key type ────────────────────────────────────────────

export function getRateLimit(scopes: string[]): number {
  if (scopes.includes("enterprise")) return 1000;
  return 100;
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

/** POST /api/admin/api-keys — Create new API key */
router.post("/api/admin/api-keys", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { name, scopes = ["read"], expires_at } = req.body;

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    const rawKey = generateKey();
    const keyHash = hashKey(rawKey);

    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        org_id: user.org_id,
        key_hash: keyHash,
        name,
        scopes,
        expires_at: expires_at ?? null,
      })
      .select("id, org_id, name, scopes, expires_at, created_at")
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // Return the raw key once — it will never be shown again
    return res.status(201).json({
      ...data,
      key: rawKey,
      message: "Store this key securely — it will not be shown again",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/** GET /api/admin/api-keys — List organization's API keys */
router.get("/api/admin/api-keys", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, scopes, last_used_at, expires_at, created_at")
      .eq("org_id", user.org_id)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/admin/api-keys/:id — Revoke API key */
router.delete(
  "/api/admin/api-keys/:id",
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", req.params.id)
        .eq("org_id", user.org_id);

      if (error) return res.status(400).json({ error: error.message });

      return res.status(204).send();
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

export default router;
