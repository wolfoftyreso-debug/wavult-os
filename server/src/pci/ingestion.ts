// ═══════════════════════════════════════════════════════════════════════════════
// PCI — Ingestion Service
// ═══════════════════════════════════════════════════════════════════════════════
// Read-only ingestion. Raw data in, nothing out to external systems.
// Sources: email (Gmail mock), manual JSON input.

import { Router, Request, Response } from "express";
import { supabase } from "../supabase";

const router = Router();

// ─── POST /api/pci/ingest — Manual data input ───────────────────────────────

router.post("/ingest", async (req: Request, res: Response) => {
  const { user_id, source, type, content } = req.body;

  if (!user_id || !type || !content) {
    res.status(400).json({ error: "user_id, type, and content are required" });
    return;
  }

  const { data, error } = await supabase
    .from("raw_data")
    .insert({
      user_id,
      source: source || "manual",
      type,
      content: typeof content === "string" ? { text: content } : content,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ success: true, id: data.id });
});

// ─── POST /api/pci/ingest/email — Email ingestion (mock-ready) ──────────────

router.post("/ingest/email", async (req: Request, res: Response) => {
  const { user_id, from, subject, body, date } = req.body;

  if (!user_id || !subject) {
    res.status(400).json({ error: "user_id and subject are required" });
    return;
  }

  const { data, error } = await supabase
    .from("raw_data")
    .insert({
      user_id,
      source: "email",
      type: "email",
      content: {
        from: from || "unknown",
        subject,
        body: body || "",
        date: date || new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ success: true, id: data.id });
});

// ─── POST /api/pci/state — Set daily energy level ───────────────────────────

router.post("/state", async (req: Request, res: Response) => {
  const { user_id, energy } = req.body;

  if (!user_id || !energy || energy < 1 || energy > 5) {
    res.status(400).json({ error: "user_id and energy (1-5) are required" });
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("user_state")
    .upsert({ user_id, date: today, energy }, { onConflict: "user_id,date" })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ success: true, date: today, energy });
});

export default router;
