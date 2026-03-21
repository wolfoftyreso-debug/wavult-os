// consumables.ts — Consumables Management System
// Operational Cost Control Engine for pixdrift
// "No item without owner. No stock without location. No usage without trace."

import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL || "https://znmxtnxxjpmgtycmsqjv.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ConsumableItem {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  sku?: string;
  barcode?: string;
  qr_code?: string;
  supplier_id?: string;
  supplier_sku?: string;
  unit_cost: number;
  bas_account?: string;
  location_zone_id?: string;
  location_description?: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  reorder_quantity: number;
  days_until_empty?: number;
  avg_daily_consumption?: number;
  last_stock_count_at?: string;
  auto_consume_enabled: boolean;
  auto_consume_amount: number;
  auto_consume_schedule?: string;
  department_id?: string;
  responsible_user_id?: string;
  is_active: boolean;
  notes?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getOrgId(req: Request): string {
  return (
    (req.headers["x-org-id"] as string) ||
    (req.query.org_id as string) ||
    "00000000-0000-0000-0000-000000000000"
  );
}

function calcDaysUntilEmpty(stock: number, avgDaily: number | null): number | null {
  if (!avgDaily || avgDaily <= 0) return null;
  return Math.round((stock / avgDaily) * 10) / 10;
}

async function updateAvgDailyConsumption(
  itemId: string,
  orgId: string
): Promise<number | null> {
  // Calculate average daily consumption from last 30 days of usage
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data } = await supabase
    .from("consumable_usage")
    .select("quantity, created_at")
    .eq("item_id", itemId)
    .eq("org_id", orgId)
    .neq("usage_type", "ADJUSTMENT")
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (!data || data.length === 0) return null;

  const totalUsed = data.reduce((sum: number, r: any) => sum + Number(r.quantity), 0);
  const avgDaily = totalUsed / 30;
  return Math.round(avgDaily * 10000) / 10000;
}

async function checkLowStock(item: ConsumableItem, orgId: string): Promise<void> {
  if (item.current_stock <= item.min_stock) {
    // Could push a notification here — for now we just log
    console.log(
      `[CONSUMABLES] LOW STOCK ALERT: ${item.name} — ${item.current_stock} ${item.unit} (min: ${item.min_stock})`
    );
    // Future: POST to /api/notifications with alert
  }
}

// ---------------------------------------------------------------------------
// GET /api/consumables — List items with filters
// ---------------------------------------------------------------------------
router.get("/", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const { category, department_id, low_stock, search } = req.query;

  let query = supabase
    .from("consumable_items")
    .select("*")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .order("category")
    .order("name");

  if (category) query = query.eq("category", category);
  if (department_id) query = query.eq("department_id", department_id);
  if (low_stock === "true") {
    // Handled in JS below since Supabase doesn't support column-to-column comparison easily
  }
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  let items = data || [];

  if (low_stock === "true") {
    items = items.filter((i: ConsumableItem) => i.current_stock <= i.min_stock);
  }

  // Enrich with stock status
  const enriched = items.map((item: ConsumableItem) => ({
    ...item,
    stock_status:
      item.current_stock <= item.min_stock
        ? "critical"
        : item.days_until_empty !== null && item.days_until_empty <= 3
        ? "critical"
        : item.days_until_empty !== null && item.days_until_empty <= 7
        ? "warning"
        : "ok",
  }));

  res.json(enriched);
});

// ---------------------------------------------------------------------------
// GET /api/consumables/low-stock
// ---------------------------------------------------------------------------
router.get("/low-stock", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);

  const { data, error } = await supabase
    .from("consumable_items")
    .select("*")
    .eq("org_id", orgId)
    .eq("is_active", true);

  if (error) return res.status(500).json({ error: error.message });

  const lowStock = (data || []).filter(
    (i: ConsumableItem) => i.current_stock <= i.min_stock
  );

  res.json(lowStock);
});

// ---------------------------------------------------------------------------
// GET /api/consumables/reorder-needed
// ---------------------------------------------------------------------------
router.get("/reorder-needed", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);

  const { data, error } = await supabase
    .from("consumable_items")
    .select("*")
    .eq("org_id", orgId)
    .eq("is_active", true);

  if (error) return res.status(500).json({ error: error.message });

  // Items that need ordering: below min OR will run out in <=3 days
  const needsReorder = (data || []).filter((i: ConsumableItem) => {
    if (i.current_stock <= i.min_stock) return true;
    if (i.days_until_empty !== null && i.days_until_empty <= 3) return true;
    return false;
  });

  const withPrediction = needsReorder.map((item: ConsumableItem) => ({
    ...item,
    suggested_order_qty: item.reorder_quantity || item.max_stock - item.current_stock,
    suggested_order_cost:
      (item.reorder_quantity || item.max_stock - item.current_stock) * item.unit_cost,
  }));

  res.json(withPrediction);
});

// ---------------------------------------------------------------------------
// GET /api/consumables/qr/:code — QR lookup
// ---------------------------------------------------------------------------
router.get("/qr/:code", async (req: Request, res: Response) => {
  const { code } = req.params;

  const { data, error } = await supabase
    .from("consumable_items")
    .select("*")
    .or(`qr_code.eq.${code},barcode.eq.${code}`)
    .single();

  if (error || !data) return res.status(404).json({ error: "Item not found" });

  res.json({
    ...data,
    stock_status:
      data.current_stock <= data.min_stock
        ? "critical"
        : data.days_until_empty !== null && data.days_until_empty <= 7
        ? "warning"
        : "ok",
  });
});

// ---------------------------------------------------------------------------
// GET /api/consumables/costs/summary — Cost reports
// ---------------------------------------------------------------------------
router.get("/costs/summary", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const period = (req.query.period as string) || "month";

  let startDate = new Date();
  let prevStartDate = new Date();
  let prevEndDate = new Date();

  if (period === "month") {
    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    prevEndDate = new Date(startDate.getTime() - 1);
    prevStartDate = new Date(prevEndDate.getFullYear(), prevEndDate.getMonth(), 1);
  } else if (period === "quarter") {
    const q = Math.floor(startDate.getMonth() / 3);
    startDate = new Date(startDate.getFullYear(), q * 3, 1);
    prevEndDate = new Date(startDate.getTime() - 1);
    prevStartDate = new Date(prevEndDate.getFullYear(), Math.floor(prevEndDate.getMonth() / 3) * 3, 1);
  } else {
    startDate = new Date(startDate.getFullYear(), 0, 1);
    prevStartDate = new Date(startDate.getFullYear() - 1, 0, 1);
    prevEndDate = new Date(startDate.getFullYear() - 1, 11, 31);
  }

  const [currentRes, prevRes, usageWithItemsRes] = await Promise.all([
    supabase
      .from("consumable_usage")
      .select("total_cost, bas_account, department_id, item_id")
      .eq("org_id", orgId)
      .gte("created_at", startDate.toISOString()),
    supabase
      .from("consumable_usage")
      .select("total_cost")
      .eq("org_id", orgId)
      .gte("created_at", prevStartDate.toISOString())
      .lte("created_at", prevEndDate.toISOString()),
    supabase
      .from("consumable_usage")
      .select("total_cost, item_id, consumable_items(name, category)")
      .eq("org_id", orgId)
      .gte("created_at", startDate.toISOString()),
  ]);

  const current = currentRes.data || [];
  const prev = prevRes.data || [];

  const totalCurrent = current.reduce((s: number, r: any) => s + Number(r.total_cost || 0), 0);
  const totalPrev = prev.reduce((s: number, r: any) => s + Number(r.total_cost || 0), 0);

  // By category
  const byCategory: Record<string, number> = {};
  current.forEach((r: any) => {
    // We'd need to join with items — simplified here
    const cat = r.bas_account || "OTHER";
    byCategory[cat] = (byCategory[cat] || 0) + Number(r.total_cost || 0);
  });

  // Top 10 items
  const itemCosts: Record<string, { name: string; category: string; total: number }> = {};
  (usageWithItemsRes.data || []).forEach((r: any) => {
    if (!r.item_id) return;
    if (!itemCosts[r.item_id]) {
      itemCosts[r.item_id] = {
        name: r.consumable_items?.name || "Unknown",
        category: r.consumable_items?.category || "OTHER",
        total: 0,
      };
    }
    itemCosts[r.item_id].total += Number(r.total_cost || 0);
  });

  const top10 = Object.entries(itemCosts)
    .map(([id, v]) => ({ item_id: id, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  res.json({
    period,
    total_current: Math.round(totalCurrent * 100) / 100,
    total_previous: Math.round(totalPrev * 100) / 100,
    trend_pct:
      totalPrev > 0
        ? Math.round(((totalCurrent - totalPrev) / totalPrev) * 1000) / 10
        : null,
    by_category: byCategory,
    top_10_items: top10,
  });
});

// ---------------------------------------------------------------------------
// GET /api/consumables/:id — Get single item
// ---------------------------------------------------------------------------
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  // Skip if it's a named route handled above
  if (["low-stock", "reorder-needed", "qr", "costs", "orders", "run-auto-consume", "qr-scan"].includes(id)) {
    return res.status(404).json({ error: "Not found" });
  }
  const { data, error } = await supabase
    .from("consumable_items")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return res.status(404).json({ error: "Not found" });
  res.json(data);
});

// ---------------------------------------------------------------------------
// POST /api/consumables — Create item
// ---------------------------------------------------------------------------
router.post("/", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const body = req.body;

  const { data, error } = await supabase
    .from("consumable_items")
    .insert({ ...body, org_id: orgId })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// ---------------------------------------------------------------------------
// PATCH /api/consumables/:id — Update item
// ---------------------------------------------------------------------------
router.patch("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = { ...req.body, updated_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from("consumable_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// ---------------------------------------------------------------------------
// POST /api/consumables/:id/use — Record usage (deduct stock)
// ---------------------------------------------------------------------------
router.post("/:id/use", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const { id } = req.params;
  const { quantity, user_id, work_order_id, notes, usage_type = "MANUAL" } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: "quantity must be positive" });
  }

  // Fetch current item
  const { data: item, error: fetchErr } = await supabase
    .from("consumable_items")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !item) return res.status(404).json({ error: "Item not found" });

  const newStock = Math.max(0, Number(item.current_stock) - Number(quantity));
  const totalCost = Number(quantity) * Number(item.unit_cost);

  // Create usage record
  const { error: usageErr } = await supabase.from("consumable_usage").insert({
    org_id: orgId,
    item_id: id,
    department_id: item.department_id,
    user_id,
    work_order_id,
    quantity: Number(quantity),
    unit_cost: item.unit_cost,
    total_cost: totalCost,
    usage_type,
    bas_account: item.bas_account,
    notes,
  });

  if (usageErr) return res.status(500).json({ error: usageErr.message });

  // Update avg daily consumption
  const avgDaily = await updateAvgDailyConsumption(id, orgId);
  const daysUntilEmpty = calcDaysUntilEmpty(newStock, avgDaily);

  // Update item stock
  const { data: updatedItem, error: updateErr } = await supabase
    .from("consumable_items")
    .update({
      current_stock: newStock,
      avg_daily_consumption: avgDaily,
      days_until_empty: daysUntilEmpty,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateErr) return res.status(500).json({ error: updateErr.message });

  // Low stock alert
  await checkLowStock(updatedItem, orgId);

  res.json({
    item: updatedItem,
    usage: { quantity, total_cost: totalCost, bas_account: item.bas_account },
    low_stock_alert: newStock <= item.min_stock,
  });
});

// ---------------------------------------------------------------------------
// POST /api/consumables/qr-scan — QR scan → instant deduct
// ---------------------------------------------------------------------------
router.post("/qr-scan", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const { qr_code, quantity = 1, user_id } = req.body;

  if (!qr_code) return res.status(400).json({ error: "qr_code required" });

  // Lookup by QR or barcode
  const { data: item, error } = await supabase
    .from("consumable_items")
    .select("*")
    .or(`qr_code.eq.${qr_code},barcode.eq.${qr_code}`)
    .eq("org_id", orgId)
    .single();

  if (error || !item) return res.status(404).json({ error: "Item not found for QR code" });

  // Reuse the use logic via internal call-alike
  const newStock = Math.max(0, Number(item.current_stock) - Number(quantity));
  const totalCost = Number(quantity) * Number(item.unit_cost);

  await supabase.from("consumable_usage").insert({
    org_id: orgId,
    item_id: item.id,
    department_id: item.department_id,
    user_id,
    quantity: Number(quantity),
    unit_cost: item.unit_cost,
    total_cost: totalCost,
    usage_type: "QR_SCAN",
    bas_account: item.bas_account,
  });

  const avgDaily = await updateAvgDailyConsumption(item.id, orgId);
  const daysUntilEmpty = calcDaysUntilEmpty(newStock, avgDaily);

  const { data: updatedItem } = await supabase
    .from("consumable_items")
    .update({
      current_stock: newStock,
      avg_daily_consumption: avgDaily,
      days_until_empty: daysUntilEmpty,
      updated_at: new Date().toISOString(),
    })
    .eq("id", item.id)
    .select()
    .single();

  await checkLowStock(updatedItem || item, orgId);

  res.json({
    success: true,
    item: updatedItem || item,
    deducted: quantity,
    total_cost: totalCost,
    low_stock_alert: newStock <= item.min_stock,
  });
});

// ---------------------------------------------------------------------------
// POST /api/consumables/:id/stock-count — Physical stock reconciliation
// ---------------------------------------------------------------------------
router.post("/:id/stock-count", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const { id } = req.params;
  const { counted_quantity, notes, photo_url, user_id } = req.body;

  const { data: item, error } = await supabase
    .from("consumable_items")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !item) return res.status(404).json({ error: "Item not found" });

  const discrepancy = Number(counted_quantity) - Number(item.current_stock);

  // Log discrepancy as ADJUSTMENT usage record if different
  if (discrepancy !== 0) {
    await supabase.from("consumable_usage").insert({
      org_id: orgId,
      item_id: id,
      user_id,
      quantity: Math.abs(discrepancy),
      unit_cost: item.unit_cost,
      total_cost: Math.abs(discrepancy) * Number(item.unit_cost),
      usage_type: "ADJUSTMENT",
      bas_account: item.bas_account,
      notes: `Lagerinventering. Avvikelse: ${discrepancy > 0 ? "+" : ""}${discrepancy} ${item.unit}. ${notes || ""}`,
    });
  }

  const avgDaily = await updateAvgDailyConsumption(id, orgId);
  const daysUntilEmpty = calcDaysUntilEmpty(Number(counted_quantity), avgDaily);

  const { data: updated } = await supabase
    .from("consumable_items")
    .update({
      current_stock: Number(counted_quantity),
      last_stock_count_at: new Date().toISOString(),
      avg_daily_consumption: avgDaily,
      days_until_empty: daysUntilEmpty,
      photo_url: photo_url || item.photo_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  res.json({
    item: updated,
    discrepancy,
    discrepancy_cost: Math.abs(discrepancy * Number(item.unit_cost)),
  });
});

// ---------------------------------------------------------------------------
// POST /api/consumables/run-auto-consume — Cron: daily auto-deductions
// ---------------------------------------------------------------------------
router.post("/run-auto-consume", async (req: Request, res: Response) => {
  const orgId = req.query.org_id as string;

  let query = supabase
    .from("consumable_items")
    .select("*")
    .eq("auto_consume_enabled", true)
    .eq("is_active", true);

  if (orgId) query = query.eq("org_id", orgId);

  const { data: items, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const results = [];
  for (const item of items || []) {
    if (!item.auto_consume_amount || item.auto_consume_amount <= 0) continue;

    // Check schedule
    if (item.auto_consume_schedule === "weekly") {
      const dayOfWeek = new Date().getDay();
      if (dayOfWeek !== 1) continue; // Only Mondays
    }

    const newStock = Math.max(0, Number(item.current_stock) - Number(item.auto_consume_amount));
    const totalCost = Number(item.auto_consume_amount) * Number(item.unit_cost);

    await supabase.from("consumable_usage").insert({
      org_id: item.org_id,
      item_id: item.id,
      department_id: item.department_id,
      quantity: item.auto_consume_amount,
      unit_cost: item.unit_cost,
      total_cost: totalCost,
      usage_type: "AUTO",
      bas_account: item.bas_account,
      notes: "Automatisk avdrag",
    });

    const avgDaily = await updateAvgDailyConsumption(item.id, item.org_id);
    const daysUntilEmpty = calcDaysUntilEmpty(newStock, avgDaily);

    await supabase
      .from("consumable_items")
      .update({
        current_stock: newStock,
        avg_daily_consumption: avgDaily,
        days_until_empty: daysUntilEmpty,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    await checkLowStock({ ...item, current_stock: newStock }, item.org_id);

    results.push({
      item_id: item.id,
      name: item.name,
      deducted: item.auto_consume_amount,
      new_stock: newStock,
      low_stock: newStock <= item.min_stock,
    });
  }

  res.json({ processed: results.length, results });
});

// ---------------------------------------------------------------------------
// GET /api/consumables/orders — List orders
// ---------------------------------------------------------------------------
router.get("/orders", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);

  const { data, error } = await supabase
    .from("consumable_orders")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ---------------------------------------------------------------------------
// POST /api/consumables/orders — Create order (auto from low-stock)
// ---------------------------------------------------------------------------
router.post("/orders", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const { requested_by, supplier_id, notes, auto_from_low_stock } = req.body;

  let items = req.body.items || [];

  if (auto_from_low_stock) {
    // Auto-populate from items below min_stock
    const { data: lowItems } = await supabase
      .from("consumable_items")
      .select("*")
      .eq("org_id", orgId)
      .eq("is_active", true);

    const toOrder = (lowItems || []).filter(
      (i: ConsumableItem) => i.current_stock <= i.min_stock
    );

    items = toOrder.map((i: ConsumableItem) => ({
      item_id: i.id,
      item_name: i.name,
      quantity: i.reorder_quantity || Math.max(i.min_stock * 2, i.max_stock - i.current_stock),
      unit_cost: i.unit_cost,
      total: (i.reorder_quantity || Math.max(i.min_stock * 2, i.max_stock - i.current_stock)) * i.unit_cost,
      bas_account: i.bas_account,
    }));
  }

  const totalAmount = items.reduce((s: number, i: any) => s + Number(i.total || 0), 0);
  const orderNumber = `KB-${Date.now().toString(36).toUpperCase()}`;

  const { data, error } = await supabase
    .from("consumable_orders")
    .insert({
      org_id: orgId,
      order_number: orderNumber,
      supplier_id,
      items,
      total_amount: totalAmount,
      requested_by,
      notes,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// ---------------------------------------------------------------------------
// PATCH /api/consumables/orders/:id/approve
// ---------------------------------------------------------------------------
router.patch("/orders/:id/approve", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { approved_by } = req.body;

  const { data, error } = await supabase
    .from("consumable_orders")
    .update({
      status: "APPROVED",
      approved_by,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// ---------------------------------------------------------------------------
// PATCH /api/consumables/orders/:id/deliver — Mark delivered, update stock
// ---------------------------------------------------------------------------
router.patch("/orders/:id/deliver", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const { id } = req.params;
  const { partial } = req.body;

  const { data: order, error } = await supabase
    .from("consumable_orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !order) return res.status(404).json({ error: "Order not found" });

  // Update stock for each item in order
  for (const line of order.items || []) {
    if (!line.item_id) continue;

    const { data: item } = await supabase
      .from("consumable_items")
      .select("current_stock, min_stock, avg_daily_consumption")
      .eq("id", line.item_id)
      .single();

    if (!item) continue;

    const newStock = Number(item.current_stock) + Number(line.quantity);
    const daysUntilEmpty = calcDaysUntilEmpty(newStock, item.avg_daily_consumption);

    await supabase
      .from("consumable_items")
      .update({
        current_stock: newStock,
        days_until_empty: daysUntilEmpty,
        updated_at: new Date().toISOString(),
      })
      .eq("id", line.item_id);

    // Log as ADJUSTMENT (incoming stock)
    await supabase.from("consumable_usage").insert({
      org_id: orgId,
      item_id: line.item_id,
      quantity: -Number(line.quantity), // negative = incoming
      unit_cost: line.unit_cost,
      total_cost: -(Number(line.quantity) * Number(line.unit_cost)),
      usage_type: "ADJUSTMENT",
      notes: `Inleverans från order ${order.order_number}`,
    });
  }

  const { data: updated } = await supabase
    .from("consumable_orders")
    .update({
      status: partial ? "PARTIAL" : "DELIVERED",
      delivered_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  res.json(updated);
});

// ---------------------------------------------------------------------------
// GET /api/consumables/usage — Usage log
// ---------------------------------------------------------------------------
router.get("/usage", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const { item_id, user_id, limit = "50" } = req.query;

  let query = supabase
    .from("consumable_usage")
    .select("*, consumable_items(name, category, unit)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(Number(limit));

  if (item_id) query = query.eq("item_id", item_id);
  if (user_id) query = query.eq("user_id", user_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

export default router;
