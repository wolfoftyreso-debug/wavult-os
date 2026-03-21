import { Router, Request, Response, NextFunction } from "express";
import { supabase } from "./supabase";

const router = Router();

// ---------------------------------------------------------------------------
// S3 upload helper using AWS SDK v2 style via raw HTTPS
// Falls back gracefully if AWS env vars are not configured
// ---------------------------------------------------------------------------
const BUCKET = process.env.S3_BRAND_BUCKET || "pixdrift-landing-prod";
const AWS_REGION = process.env.AWS_REGION || "eu-north-1";

// ---------------------------------------------------------------------------
// Brand type
// ---------------------------------------------------------------------------
export interface TenantBrand {
  id?: string;
  org_id: string;
  name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  subdomain?: string;
  custom_domain?: string;
  email_from_name?: string;
  email_from_address?: string;
  sms_sender_name?: string;
  sms_footer?: string;
  invoice_footer?: string;
  receipt_logo_url?: string;
  customer_portal_title: string;
  approval_page_title: string;
  created_at?: string;
}

// Default brand fallback
export const DEFAULT_BRAND: Omit<TenantBrand, "org_id" | "name"> = {
  primary_color: "#1C3A1A",
  secondary_color: "#4A7A2A",
  accent_color: "#C4973A",
  font_family: "Inter",
  customer_portal_title: "Mina sidor",
  approval_page_title: "Godkänn arbete",
};

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------
const auth = (req: Request, res: Response, next: NextFunction) => {
  if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (!["ADMIN", "SYSTEM_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return res.status(403).json({ error: "Admin required" });
  }
  next();
};

// ---------------------------------------------------------------------------
// GET /api/brand/:org_id — Hämta brand för tenant
// ---------------------------------------------------------------------------
router.get("/:org_id", auth, async (req: Request, res: Response) => {
  const { org_id } = req.params;

  const { data, error } = await supabase
    .from("tenant_brands")
    .select("*")
    .eq("org_id", org_id)
    .single();

  if (error || !data) {
    // Return default brand if not configured
    return res.json({ org_id, ...DEFAULT_BRAND, name: "Verkstad" });
  }

  res.json(data);
});

// ---------------------------------------------------------------------------
// PUT /api/brand/:org_id — Uppdatera brand (admin only)
// ---------------------------------------------------------------------------
router.put("/:org_id", adminAuth, async (req: Request, res: Response) => {
  const { org_id } = req.params;
  const user = (req as any).user;

  // Only allow updating own org unless SYSTEM_ADMIN
  if (user.role !== "SYSTEM_ADMIN" && user.org_id !== org_id) {
    return res.status(403).json({ error: "Cannot update another org's brand" });
  }

  const allowed = [
    "name", "logo_url", "primary_color", "secondary_color", "accent_color",
    "font_family", "subdomain", "custom_domain", "email_from_name",
    "email_from_address", "sms_sender_name", "sms_footer", "invoice_footer",
    "receipt_logo_url", "customer_portal_title", "approval_page_title",
  ];

  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  const { data, error } = await supabase
    .from("tenant_brands")
    .upsert({ org_id, ...updates }, { onConflict: "org_id" })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ---------------------------------------------------------------------------
// GET /api/brand/by-subdomain/:sub — Hämta brand via subdomain (public)
// ---------------------------------------------------------------------------
router.get("/by-subdomain/:sub", async (req: Request, res: Response) => {
  const { sub } = req.params;

  const { data, error } = await supabase
    .from("tenant_brands")
    .select("*")
    .eq("subdomain", sub)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Brand not found for subdomain" });
  }

  res.json(data);
});

// ---------------------------------------------------------------------------
// POST /api/brand/upload-logo — Accept logo URL or base64, store URL in DB
// Multipart upload support requires @aws-sdk/client-s3 + multer (add to package.json when needed)
// For now: accepts { logo_url: "https://..." } or { logo_data: "base64...", content_type: "image/png" }
// ---------------------------------------------------------------------------
router.post("/upload-logo", adminAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { logo_url } = req.body;

  if (!logo_url) {
    return res.status(400).json({
      error: "logo_url required. Send { logo_url: 'https://...' } with a publicly accessible image URL.",
    });
  }

  // Validate URL format
  try { new globalThis.URL(logo_url); } catch {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  // Auto-update the org's logo_url
  const { data, error } = await supabase
    .from("tenant_brands")
    .upsert(
      { org_id: user.org_id, name: "Verkstad", logo_url },
      { onConflict: "org_id" }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ url: logo_url, brand: data });
});

export default router;

// ---------------------------------------------------------------------------
// Brand Middleware — sätter req.brand baserat på subdomain eller header
// Används på customer-facing routes (portal, approval page)
// ---------------------------------------------------------------------------
export async function brandMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    let brand: TenantBrand | null = null;

    // 1. Check X-Tenant-Org header (API calls with known org)
    const orgHeader = req.headers["x-tenant-org"] as string;
    if (orgHeader) {
      const { data } = await supabase
        .from("tenant_brands")
        .select("*")
        .eq("org_id", orgHeader)
        .single();
      if (data) brand = data;
    }

    // 2. Check subdomain from Host header
    if (!brand) {
      const host = req.hostname || "";
      const subdomain = host.split(".")[0];
      if (subdomain && subdomain !== "api" && subdomain !== "www") {
        const { data } = await supabase
          .from("tenant_brands")
          .select("*")
          .eq("subdomain", subdomain)
          .single();
        if (data) brand = data;
      }
    }

    // 3. Check custom_domain
    if (!brand) {
      const { data } = await supabase
        .from("tenant_brands")
        .select("*")
        .eq("custom_domain", req.hostname)
        .single();
      if (data) brand = data;
    }

    (req as any).brand = brand || { ...DEFAULT_BRAND, name: "Verkstad" };
    next();
  } catch (err) {
    console.warn("brandMiddleware error:", err);
    (req as any).brand = { ...DEFAULT_BRAND, name: "Verkstad" };
    next();
  }
}

// ---------------------------------------------------------------------------
// Helper: getBrandForOrg — callable from other modules
// ---------------------------------------------------------------------------
export async function getBrandForOrg(org_id: string): Promise<TenantBrand> {
  const { data } = await supabase
    .from("tenant_brands")
    .select("*")
    .eq("org_id", org_id)
    .single();

  if (data) return data;
  return { org_id, name: "Verkstad", ...DEFAULT_BRAND };
}
