// ─── Wallet OS API — Real-Time Payouts + IR Marketplace + Gamification ──────
// Zero-latency payout engine. Pre-funded wallets. Task → Validate → Pay.
// Event-driven: ImageApproved → TaskCompleted → PaymentTriggered → WalletUpdated

import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

// ─── WALLET ENDPOINTS ───────────────────────────────────────────────────────

// GET /api/wallet-os/wallet/:userId — Get wallet balance
router.get("/wallet/:userId", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", req.params.userId)
      .single();

    if (error) {
      return res.json({
        user_id: req.params.userId,
        available: 0, pending: 0, locked: 0,
        currency: "SEK", total_earned: 0, total_withdrawn: 0,
        source: "mock",
      });
    }
    res.json({ ...data, source: "supabase" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wallet-os/wallet/:userId/transactions — Transaction history
router.get("/wallet/:userId/transactions", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", req.params.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return res.json({ transactions: [], source: "mock" });
    res.json({ transactions: data, source: "supabase" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet-os/wallet/:userId/withdraw — Request withdrawal
router.post("/wallet/:userId/withdraw", async (req: Request, res: Response) => {
  const { amount, currency, rail } = req.body;
  if (!amount || !rail) return res.status(400).json({ error: "amount and rail required" });

  res.json({
    withdrawal_id: `wd_${Date.now()}_mock`,
    user_id: req.params.userId,
    amount, currency: currency ?? "SEK", rail,
    status: "processing",
    estimated_arrival: rail === "swish" ? "instant" : rail === "sepa-instant" ? "<10 seconds" : "1-2 business days",
    fee: rail === "swish" ? 0 : rail === "sepa-instant" ? 0.20 : 0.05,
    mode: "mock",
  });
});

// ─── TASK ENDPOINTS ─────────────────────────────────────────────────────────

// GET /api/wallet-os/tasks — List available tasks
router.get("/tasks", async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string) || 59.33;
    const lng = parseFloat(req.query.lng as string) || 18.07;
    const radius = parseInt(req.query.radius as string) || 5000;
    const user_level = parseInt(req.query.level as string) || 1;

    const { data, error } = await supabase
      .from("wallet_os_tasks")
      .select("*")
      .lte("required_level", user_level)
      .eq("status", "available")
      .order("payout", { ascending: false })
      .limit(20);

    if (error) return res.json({ tasks: [], source: "mock" });
    res.json({ tasks: data, source: "supabase", filters: { lat, lng, radius, user_level } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet-os/tasks/:taskId/claim — Claim a task
router.post("/tasks/:taskId/claim", async (req: Request, res: Response) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: "user_id required" });

  res.json({
    task_id: req.params.taskId,
    user_id,
    status: "claimed",
    claimed_at: new Date().toISOString(),
    events: [{ event: "TaskClaimed", timestamp: new Date().toISOString() }],
    mode: "mock",
  });
});

// POST /api/wallet-os/tasks/:taskId/submit — Submit task completion
router.post("/tasks/:taskId/submit", async (req: Request, res: Response) => {
  const { user_id, images, metadata } = req.body;
  if (!user_id || !images) return res.status(400).json({ error: "user_id and images required" });

  // Simulated event pipeline
  const events = [
    { event: "ImageCaptured", timestamp: new Date().toISOString(), data: { count: images.length } },
    { event: "ImageValidated", timestamp: new Date(Date.now() + 50).toISOString(), data: { method: "ai-auto", passed: true } },
    { event: "TaskCompleted", timestamp: new Date(Date.now() + 60).toISOString(), data: {} },
    { event: "PaymentTriggered", timestamp: new Date(Date.now() + 70).toISOString(), data: { amount: 35, currency: "SEK" } },
    { event: "LedgerCommit", timestamp: new Date(Date.now() + 75).toISOString(), data: { debit: "platform.escrow", credit: "user.wallet" } },
    { event: "WalletUpdated", timestamp: new Date(Date.now() + 80).toISOString(), data: { new_balance: 1280 } },
    { event: "NotificationSent", timestamp: new Date(Date.now() + 90).toISOString(), data: { type: "push" } },
  ];

  res.json({
    task_id: req.params.taskId,
    user_id,
    status: "completed",
    payout: { amount: 35, currency: "SEK", latency_ms: 90 },
    xp_earned: 50,
    streak_bonus: null,
    event_trail: events,
    mode: "mock",
  });
});

// ─── INTELLIGENCE REPO ENDPOINTS ────────────────────────────────────────────

// GET /api/wallet-os/ir — List intelligence repos
router.get("/ir", async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    let query = supabase.from("intelligence_repos").select("*").order("created_at", { ascending: false });
    if (category) query = query.eq("category", category);

    const { data, error } = await query.limit(20);
    if (error) return res.json({ repos: [], source: "mock" });
    res.json({ repos: data, source: "supabase" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet-os/ir — Create new IR
router.post("/ir", async (req: Request, res: Response) => {
  const { title, description, category, location, pricing } = req.body;
  if (!title || !category) return res.status(400).json({ error: "title and category required" });

  res.json({
    ir_id: `ir_${Date.now()}_mock`,
    title, category, location,
    status: "draft",
    pricing,
    created_at: new Date().toISOString(),
    mode: "mock",
  });
});

// POST /api/wallet-os/ir/:irId/purchase — Purchase IR access
router.post("/ir/:irId/purchase", async (req: Request, res: Response) => {
  const { buyer_id, access_type } = req.body;
  if (!buyer_id) return res.status(400).json({ error: "buyer_id required" });

  res.json({
    purchase_id: `pur_${Date.now()}_mock`,
    ir_id: req.params.irId,
    buyer_id,
    access_type: access_type ?? "one-time",
    status: "completed",
    creator_payout: { amount: 3185, currency: "SEK", split_pct: 65 },
    platform_fee: { amount: 1715, currency: "SEK", split_pct: 35 },
    mode: "mock",
  });
});

// ─── GAMIFICATION ENDPOINTS ─────────────────────────────────────────────────

// GET /api/wallet-os/user/:userId/level — Get user level + XP
router.get("/user/:userId/level", async (req: Request, res: Response) => {
  res.json({
    user_id: req.params.userId,
    level: 3, name: "Explorer", xp: 1850,
    next_level: { level: 4, name: "Creative", xp_needed: 2000 },
    progress_pct: 67,
    stats: {
      tasks_completed: 67, irs_created: 1,
      current_streak: 4, longest_streak: 12,
    },
    mode: "mock",
  });
});

// GET /api/wallet-os/user/:userId/streak — Get streak status
router.get("/user/:userId/streak", async (req: Request, res: Response) => {
  res.json({
    user_id: req.params.userId,
    current_streak: 4,
    active_bonus: { name: "Warming Up", bonus_pct: 5, tasks_needed_for_next: 1 },
    next_milestone: { name: "On Fire", required: 5, bonus_pct: 10 },
    mode: "mock",
  });
});

// ─── DEMAND ENGINE ENDPOINTS ────────────────────────────────────────────────

// GET /api/wallet-os/demand — Active demand signals
router.get("/demand", async (_req: Request, res: Response) => {
  res.json({
    signals: [
      { id: "ds-1", source: "search", query: "skyltfönster södermalm", urgency: "high", tasks_generated: 3, estimated_value: 4900 },
      { id: "ds-2", source: "client", query: "träfasader enskede", urgency: "high", tasks_generated: 2, estimated_value: 7900 },
      { id: "ds-3", source: "ai-prediction", query: "fönsterputsning vår 2026", urgency: "medium", tasks_generated: 15, estimated_value: 45000 },
    ],
    mode: "mock",
  });
});

// POST /api/wallet-os/demand/generate-tasks — Generate tasks from demand
router.post("/demand/generate-tasks", async (req: Request, res: Response) => {
  const { area, task_type, count } = req.body;
  if (!area) return res.status(400).json({ error: "area required" });

  res.json({
    demand_id: `dem_${Date.now()}_mock`,
    area,
    tasks_generated: count ?? 5,
    task_type: task_type ?? "photo-capture",
    priority_users_notified: 3,
    status: "tasks_created",
    mode: "mock",
  });
});

export default router;
