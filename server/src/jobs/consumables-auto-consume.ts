// consumables-auto-consume.ts — Daily auto-consume job
// Runs at 06:00 every day via cron
// "Invisible consumption" — auto-deducts predictable items

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://znmxtnxxjpmgtycmsqjv.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

interface AutoConsumeResult {
  item_id: string;
  item_name: string;
  org_id: string;
  deducted: number;
  new_stock: number;
  low_stock: boolean;
}

export async function runAutoConsume(): Promise<void> {
  console.log("[AUTO-CONSUME] Starting daily auto-consume job", new Date().toISOString());

  const { data: items, error } = await supabase
    .from("consumable_items")
    .select("*")
    .eq("auto_consume_enabled", true)
    .eq("is_active", true);

  if (error) {
    console.error("[AUTO-CONSUME] Failed to fetch items:", error.message);
    return;
  }

  if (!items || items.length === 0) {
    console.log("[AUTO-CONSUME] No auto-consume items found");
    return;
  }

  const results: AutoConsumeResult[] = [];
  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon

  for (const item of items) {
    if (!item.auto_consume_amount || item.auto_consume_amount <= 0) continue;

    // Respect schedule
    if (item.auto_consume_schedule === "weekly" && dayOfWeek !== 1) continue;
    // 'per_work_order' is handled by work order completion, not cron
    if (item.auto_consume_schedule === "per_work_order") continue;

    const newStock = Math.max(0, Number(item.current_stock) - Number(item.auto_consume_amount));
    const totalCost = Number(item.auto_consume_amount) * Number(item.unit_cost);

    // Insert usage record
    const { error: usageErr } = await supabase.from("consumable_usage").insert({
      org_id: item.org_id,
      item_id: item.id,
      department_id: item.department_id,
      quantity: item.auto_consume_amount,
      unit_cost: item.unit_cost,
      total_cost: totalCost,
      usage_type: "AUTO",
      bas_account: item.bas_account,
      notes: `Automatisk daglig avdrag (${item.auto_consume_schedule || "daily"})`,
    });

    if (usageErr) {
      console.error(`[AUTO-CONSUME] Failed to create usage for ${item.name}:`, usageErr.message);
      continue;
    }

    // Calculate new avg daily consumption
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: recentUsage } = await supabase
      .from("consumable_usage")
      .select("quantity")
      .eq("item_id", item.id)
      .neq("usage_type", "ADJUSTMENT")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const totalUsed = (recentUsage || []).reduce(
      (s: number, r: any) => s + Number(r.quantity),
      0
    );
    const avgDaily = totalUsed / 30;
    const daysUntilEmpty = avgDaily > 0 ? Math.round((newStock / avgDaily) * 10) / 10 : null;

    // Update item stock
    await supabase
      .from("consumable_items")
      .update({
        current_stock: newStock,
        avg_daily_consumption: avgDaily > 0 ? Math.round(avgDaily * 10000) / 10000 : item.avg_daily_consumption,
        days_until_empty: daysUntilEmpty,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    const isLowStock = newStock <= item.min_stock;
    if (isLowStock) {
      console.log(
        `[AUTO-CONSUME] LOW STOCK: ${item.name} — ${newStock} ${item.unit} (min: ${item.min_stock})`
      );
    }

    results.push({
      item_id: item.id,
      item_name: item.name,
      org_id: item.org_id,
      deducted: item.auto_consume_amount,
      new_stock: newStock,
      low_stock: isLowStock,
    });
  }

  const lowStockItems = results.filter(r => r.low_stock);
  console.log(
    `[AUTO-CONSUME] Complete. Processed: ${results.length} items. Low stock alerts: ${lowStockItems.length}`
  );
  if (lowStockItems.length > 0) {
    console.log(
      "[AUTO-CONSUME] Low stock items:",
      lowStockItems.map(r => r.item_name).join(", ")
    );
  }
}

// ---------------------------------------------------------------------------
// Schedule registration — call this from index.ts startup
// ---------------------------------------------------------------------------
export function scheduleAutoConsume(): void {
  // Simple interval-based scheduler (no external cron dependency)
  // Fires daily at 06:00 local server time

  function msUntilSixAM(): number {
    const now = new Date();
    const next = new Date(now);
    next.setHours(6, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.getTime() - now.getTime();
  }

  function scheduleNext() {
    const ms = msUntilSixAM();
    console.log(
      `[AUTO-CONSUME] Next run in ${Math.round(ms / 1000 / 60)} minutes (06:00)`
    );
    setTimeout(async () => {
      await runAutoConsume();
      scheduleNext(); // reschedule for next day
    }, ms);
  }

  scheduleNext();
}
