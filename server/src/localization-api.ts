import { Router, Request, Response } from "express";
import { supabase } from "./supabase";
import {
  getLocale,
  formatNumber,
  formatCurrency,
  formatDate,
  formatTime,
  formatDistance,
  formatArea,
  formatWeight,
  formatTemperature,
  formatPercent,
  t,
  tBatch,
} from "./localization";

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/locales — all available locale profiles
// ---------------------------------------------------------------------------
router.get("/api/locales", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("locale_profiles")
      .select("*")
      .eq("is_active", true)
      .order("locale_code");

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ locales: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/locales/:code — specific profile with all format rules
// ---------------------------------------------------------------------------
router.get("/api/locales/:code", async (req: Request, res: Response) => {
  try {
    const ctx = await getLocale(req.params.code);
    return res.json({ locale: ctx.profile });
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/languages — all active languages
// ---------------------------------------------------------------------------
router.get("/api/languages", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("languages")
      .select("*")
      .eq("is_active", true)
      .order("code");

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ languages: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/translations/:language/:namespace — all strings in namespace
// ---------------------------------------------------------------------------
router.get(
  "/api/translations/:language/:namespace",
  async (req: Request, res: Response) => {
    try {
      const { language, namespace } = req.params;

      const { data, error } = await supabase
        .from("translations")
        .select("key, value")
        .eq("language_code", language)
        .eq("namespace", namespace);

      if (error) return res.status(500).json({ error: error.message });

      const strings: Record<string, string> = {};
      for (const row of data ?? []) {
        strings[row.key] = row.value;
      }

      return res.json({ language, namespace, strings });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/org/locale — set org's primary_locale + supported_locales
// ---------------------------------------------------------------------------
router.patch("/api/org/locale", async (req: Request, res: Response) => {
  try {
    const { org_id, primary_locale, supported_locales } = req.body;

    if (!org_id) {
      return res.status(400).json({ error: "org_id is required" });
    }

    const update: Record<string, any> = {};
    if (primary_locale) update.primary_locale = primary_locale;
    if (supported_locales) update.supported_locales = supported_locales;
    update.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("organizations")
      .update(update)
      .eq("id", org_id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ organization: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/org/translations — create/update custom translation override
// ---------------------------------------------------------------------------
router.post("/api/org/translations", async (req: Request, res: Response) => {
  try {
    const { org_id, language_code, translation_key, value, namespace } = req.body;

    if (!org_id || !language_code || !translation_key || value === undefined) {
      return res
        .status(400)
        .json({ error: "org_id, language_code, translation_key, and value are required" });
    }

    const { data, error } = await supabase
      .from("custom_translations")
      .upsert(
        {
          org_id,
          language_code,
          translation_key,
          value,
          namespace: namespace || "default",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id,language_code,translation_key" },
      )
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ translation: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/org/translations — org's custom overrides
// ---------------------------------------------------------------------------
router.get("/api/org/translations", async (req: Request, res: Response) => {
  try {
    // SECURITY FIX (Clawbot): org_id from authenticated user only
    const org_id = (req as any).user?.org_id as string;

    if (!org_id) {
      return res.status(401).json({ error: "Authentication required — org_id from user session" });
    }

    const { data, error } = await supabase
      .from("custom_translations")
      .select("*")
      .eq("org_id", org_id)
      .order("translation_key");

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ translations: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/me/locale — set user's locale + ui_language
// ---------------------------------------------------------------------------
router.patch("/api/me/locale", async (req: Request, res: Response) => {
  try {
    const { user_id, locale, ui_language } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const update: Record<string, any> = {};
    if (locale) update.locale = locale;
    if (ui_language) update.ui_language = ui_language;
    update.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("user_profiles")
      .update(update)
      .eq("id", user_id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ user: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/format — format data with specified locale
// ---------------------------------------------------------------------------
router.post("/api/format", async (req: Request, res: Response) => {
  try {
    const { locale, items } = req.body;

    if (!locale || !Array.isArray(items)) {
      return res
        .status(400)
        .json({ error: "locale (string) and items (array) are required" });
    }

    const ctx = await getLocale(locale);

    const results: Array<{ type: string; formatted: string }> = [];

    for (const item of items) {
      const { type, value, amount, currency, format, decimals } = item;
      let formatted: string;

      switch (type) {
        case "currency":
          formatted = formatCurrency(amount ?? value, currency ?? ctx.profile.default_currency, ctx);
          break;
        case "number":
          formatted = formatNumber(value, ctx, decimals);
          break;
        case "date":
          formatted = formatDate(value, ctx, format);
          break;
        case "time":
          formatted = formatTime(value, ctx);
          break;
        case "percent":
          formatted = formatPercent(value, ctx, decimals);
          break;
        case "distance":
          formatted = formatDistance(value, ctx);
          break;
        case "area":
          formatted = formatArea(value, ctx);
          break;
        case "weight":
          formatted = formatWeight(value, ctx);
          break;
        case "temperature":
          formatted = formatTemperature(value, ctx);
          break;
        default:
          formatted = String(value);
      }

      results.push({ type, formatted });
    }

    return res.json({ locale, results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default router;
