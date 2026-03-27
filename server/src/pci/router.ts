// ═══════════════════════════════════════════════════════════════════════════════
// PCI — API Router
// ═══════════════════════════════════════════════════════════════════════════════
// All PCI endpoints under /api/pci/*

import { Router, Request, Response } from "express";
import ingestionRouter from "./ingestion";
import { normalizeAllPending } from "./normalization";
import { generateDailyBriefing, whatShouldIDoNow } from "./briefing";
import { supabase } from "../supabase";

const router = Router();

// ─── Ingestion routes ────────────────────────────────────────────────────────
router.use("/", ingestionRouter);

// ─── POST /api/pci/normalize — Process pending raw data ──────────────────────

router.post("/normalize", async (req: Request, res: Response) => {
  const { user_id } = req.body;
  if (!user_id) { res.status(400).json({ error: "user_id required" }); return; }

  const result = await normalizeAllPending(user_id);
  res.json(result);
});

// ─── POST /api/pci/briefing — Generate today's briefing ─────────────────────

router.post("/briefing", async (req: Request, res: Response) => {
  const { user_id } = req.body;
  if (!user_id) { res.status(400).json({ error: "user_id required" }); return; }

  const result = await generateDailyBriefing(user_id);
  res.json(result);
});

// ─── GET /api/pci/briefing/:userId — Get today's briefing ───────────────────

router.get("/briefing/:userId", async (req: Request, res: Response) => {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("briefings")
    .select("*")
    .eq("user_id", req.params.userId)
    .eq("date", today)
    .single();

  if (error || !data) {
    res.status(404).json({ error: "No briefing for today" });
    return;
  }

  res.json(data);
});

// ─── POST /api/pci/command — "What should I do now?" ─────────────────────────

router.post("/command", async (req: Request, res: Response) => {
  const { user_id, command } = req.body;
  if (!user_id) { res.status(400).json({ error: "user_id required" }); return; }

  const cmd = (command || "").toLowerCase().trim();

  if (cmd.includes("what") && (cmd.includes("do") || cmd.includes("should"))) {
    const result = await whatShouldIDoNow(user_id);
    res.json({ intent: "get_tasks", ...result });
    return;
  }

  // Default: treat as get_tasks
  const result = await whatShouldIDoNow(user_id);
  res.json({ intent: "get_tasks", ...result });
});

// ─── POST /api/pci/pipeline — Full pipeline: ingest → normalize → brief ─────

router.post("/pipeline", async (req: Request, res: Response) => {
  const { user_id } = req.body;
  if (!user_id) { res.status(400).json({ error: "user_id required" }); return; }

  const normResult = await normalizeAllPending(user_id);
  const briefResult = await generateDailyBriefing(user_id);

  res.json({
    normalization: normResult,
    briefing: briefResult,
  });
});

export default router;
