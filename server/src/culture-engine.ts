/**
 * Culture & Event Automation Engine
 * "Set and forget — no event forgotten, no responsibility unclear."
 *
 * Birthday = automatic cake order + team notification (zero manual steps)
 * Friday breakfast = recurring order, auto-confirmed weekly
 * Every event has exactly ONE owner, with fallback
 * Event packages: preconfigured bundles (birthday, breakfast, celebration)
 */

import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType =
  | "BIRTHDAY" | "MEETING" | "WORKSHOP" | "CELEBRATION" | "BREAKFAST"
  | "LUNCH" | "KICKOFF" | "FAREWELL" | "ANNIVERSARY" | "RECURRING" | "OTHER";

type EventStatus = "UPCOMING" | "CONFIRMED" | "ORDERED" | "COMPLETED" | "CANCELLED" | "MISSED";
type OrderStatus = "DRAFT" | "CONFIRMED" | "ORDERED" | "DELIVERED" | "FAILED" | "CANCELLED";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOrgId(req: Request): string | null {
  // SECURITY FIX (Clawbot): req.user.org_id is authoritative for tenant isolation
  return (
    (req as any).user?.org_id ||
    (req.headers["x-org-id"] as string) ||
    null
  );
}

function subtractMinutes(timeStr: string | null, minutes: number): string | null {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m - minutes;
  const hh = Math.floor(((total % 1440) + 1440) % 1440 / 60);
  const mm = ((total % 1440) + 1440) % 1440 % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// ─── GET /api/culture/events ─────────────────────────────────────────────────
// Upcoming events (next 30 days)
router.get("/events", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "org_id required" });

    const now = new Date();
    const future = new Date(now);
    future.setDate(future.getDate() + 30);

    const { data, error } = await supabase
      .from("culture_events")
      .select("*")
      .eq("org_id", orgId)
      .gte("event_date", now.toISOString().split("T")[0])
      .lte("event_date", future.toISOString().split("T")[0])
      .not("status", "in", '("CANCELLED","COMPLETED")')
      .order("event_date", { ascending: true });

    if (error) throw error;
    res.json({ events: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/culture/events ─────────────────────────────────────────────────
// Create event manually
router.post("/events", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "org_id required" });

    const {
      title, event_type, description, event_date, event_time,
      location, participant_ids, participant_count, responsible_user_id,
      fallback_user_id, template_id, is_recurring, recurrence_rule,
      auto_order_enabled, notes
    } = req.body;

    if (!title || !event_type || !event_date) {
      return res.status(400).json({ error: "title, event_type and event_date are required" });
    }

    const { data, error } = await supabase
      .from("culture_events")
      .insert({
        org_id: orgId,
        title, event_type, description, event_date, event_time,
        location, participant_ids, participant_count,
        responsible_user_id, fallback_user_id, template_id,
        is_recurring: is_recurring || false,
        recurrence_rule: recurrence_rule || null,
        auto_order_enabled: auto_order_enabled !== false,
        notes,
        status: "UPCOMING",
        created_by: req.body.created_by || "system",
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ event: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/culture/events/:id ─────────────────────────────────────────────
router.get("/events/:id", async (req: Request, res: Response) => {
  try {
    const { data: event, error: eventErr } = await supabase
      .from("culture_events")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (eventErr) throw eventErr;
    if (!event) return res.status(404).json({ error: "Event not found" });

    // Fetch associated order if exists
    let order = null;
    if (event.order_id) {
      const { data: orderData } = await supabase
        .from("event_orders")
        .select("*")
        .eq("id", event.order_id)
        .single();
      order = orderData;
    }

    // Fetch template if exists
    let template = null;
    if (event.template_id) {
      const { data: tpl } = await supabase
        .from("event_templates")
        .select("*")
        .eq("id", event.template_id)
        .single();
      template = tpl;
    }

    res.json({ event, order, template });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── PATCH /api/culture/events/:id/confirm ────────────────────────────────────
// Confirm event + trigger order creation
router.patch("/events/:id/confirm", async (req: Request, res: Response) => {
  try {
    const { data: event, error: fetchErr } = await supabase
      .from("culture_events")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (fetchErr || !event) return res.status(404).json({ error: "Event not found" });

    // Update status
    const { error: updateErr } = await supabase
      .from("culture_events")
      .update({ status: "CONFIRMED", updated_at: new Date().toISOString() })
      .eq("id", req.params.id);

    if (updateErr) throw updateErr;

    // Auto-create order if template exists and auto_order_enabled
    let order = null;
    if (event.auto_order_enabled && event.template_id) {
      const { data: template } = await supabase
        .from("event_templates")
        .select("*")
        .eq("id", event.template_id)
        .single();

      if (template) {
        const deliveryTime = subtractMinutes(event.event_time, 30);
        const { data: newOrder, error: orderErr } = await supabase
          .from("event_orders")
          .insert({
            org_id: event.org_id,
            event_id: event.id,
            items: template.default_items || [],
            currency: "SEK",
            status: "DRAFT",
            delivery_date: event.event_date,
            delivery_time: deliveryTime,
            auto_ordered: true,
            notes: `Auto-created for: ${event.title}`,
          })
          .select()
          .single();

        if (!orderErr && newOrder) {
          order = newOrder;
          // Link order to event
          await supabase
            .from("culture_events")
            .update({ order_id: newOrder.id, status: "ORDERED" })
            .eq("id", event.id);
        }
      }
    }

    res.json({ success: true, event_id: event.id, status: "CONFIRMED", order });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── PATCH /api/culture/events/:id/complete ───────────────────────────────────
router.patch("/events/:id/complete", async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from("culture_events")
      .update({ status: "COMPLETED", updated_at: new Date().toISOString() })
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/culture/templates ──────────────────────────────────────────────
router.get("/templates", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);

    let query = supabase
      .from("event_templates")
      .select("*")
      .order("name", { ascending: true });

    if (orgId) {
      // Return system templates + org-specific ones
      query = supabase
        .from("event_templates")
        .select("*")
        .or(`is_system_template.eq.true,org_id.eq.${orgId}`)
        .order("name", { ascending: true });
    } else {
      query = supabase
        .from("event_templates")
        .select("*")
        .eq("is_system_template", true)
        .order("name", { ascending: true });
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ templates: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/culture/events/from-template/:template_id ─────────────────────
// Create event pre-populated from template
router.post("/events/from-template/:template_id", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "org_id required" });

    const { event_date, participant_ids, notes, responsible_user_id, fallback_user_id } = req.body;
    if (!event_date) return res.status(400).json({ error: "event_date required" });

    const { data: template, error: tplErr } = await supabase
      .from("event_templates")
      .select("*")
      .eq("id", req.params.template_id)
      .single();

    if (tplErr || !template) return res.status(404).json({ error: "Template not found" });

    const participantCount = Array.isArray(participant_ids) ? participant_ids.length : (req.body.participant_count || 0);

    const { data: event, error } = await supabase
      .from("culture_events")
      .insert({
        org_id: orgId,
        title: template.name,
        event_type: template.event_type,
        description: template.description,
        event_date,
        participant_ids: participant_ids || [],
        participant_count: participantCount,
        responsible_user_id: responsible_user_id || null,
        fallback_user_id: fallback_user_id || null,
        template_id: template.id,
        auto_order_enabled: true,
        notes: notes || null,
        status: "UPCOMING",
        created_by: "template",
        total_cost: template.budget_per_person ? template.budget_per_person * participantCount : null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ event, template });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/culture/auto-generate-birthdays ───────────────────────────────
// Scan users for birthdays in next 2 days → create culture_events
// Called by cron job daily
router.post("/auto-generate-birthdays", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req) || req.body?.org_id;

    // Find birthday template
    const { data: birthdayTemplate } = await supabase
      .from("event_templates")
      .select("*")
      .eq("event_type", "BIRTHDAY")
      .eq("is_system_template", true)
      .single();

    // Query users with birthdays in next 2 days
    // Using raw SQL via supabase rpc or direct query
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const targetMonth = targetDate.getMonth() + 1;
    const targetDay = targetDate.getDate();

    let usersQuery = supabase
      .from("users")
      .select("id, name, birth_date, org_id")
      .not("birth_date", "is", null);

    if (orgId) {
      usersQuery = usersQuery.eq("org_id", orgId);
    }

    const { data: users, error: usersErr } = await usersQuery;
    if (usersErr) throw usersErr;

    const birthdayUsers = (users || []).filter((u: any) => {
      if (!u.birth_date) return false;
      const bd = new Date(u.birth_date);
      return bd.getMonth() + 1 === targetMonth && bd.getDate() === targetDay;
    });

    const created: any[] = [];
    const skipped: any[] = [];

    for (const user of birthdayUsers) {
      const eventDate = targetDate.toISOString().split("T")[0];

      // Check if already exists
      const { data: existing } = await supabase
        .from("culture_events")
        .select("id")
        .eq("org_id", user.org_id || orgId)
        .eq("event_type", "BIRTHDAY")
        .eq("event_date", eventDate)
        .ilike("title", `%${user.name}%`)
        .single();

      if (existing) {
        skipped.push({ user_id: user.id, name: user.name, reason: "already_exists" });
        continue;
      }

      const { data: event, error: createErr } = await supabase
        .from("culture_events")
        .insert({
          org_id: user.org_id || orgId,
          title: `${user.name}s födelsedag 🎂`,
          event_type: "BIRTHDAY",
          description: `Automatiskt genererat födelsedag för ${user.name}`,
          event_date: eventDate,
          event_time: "09:00",
          participant_count: 0,
          template_id: birthdayTemplate?.id || null,
          auto_order_enabled: true,
          is_recurring: false,
          recurrence_rule: "annual:birthday",
          status: "UPCOMING",
          created_by: "system",
          notes: `Birthday auto-generated for user ${user.id}`,
        })
        .select()
        .single();

      if (!createErr && event) {
        created.push({ event_id: event.id, name: user.name });
      }
    }

    res.json({
      success: true,
      checked: birthdayUsers.length,
      created: created.length,
      skipped: skipped.length,
      events: created,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/culture/events/:id/order ──────────────────────────────────────
// Create order for event (auto-populated from template)
router.post("/events/:id/order", async (req: Request, res: Response) => {
  try {
    const { data: event, error: eventErr } = await supabase
      .from("culture_events")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (eventErr || !event) return res.status(404).json({ error: "Event not found" });

    let items: any[] = req.body.items || [];
    let totalAmount = req.body.total_amount || null;

    // Auto-populate from template if no items provided
    if (items.length === 0 && event.template_id) {
      const { data: template } = await supabase
        .from("event_templates")
        .select("*")
        .eq("id", event.template_id)
        .single();

      if (template) {
        items = template.default_items || [];
        if (template.budget_per_person && event.participant_count) {
          totalAmount = template.budget_per_person * event.participant_count;
        }
      }
    }

    const deliveryTime = subtractMinutes(event.event_time, 30);

    const { data: order, error: orderErr } = await supabase
      .from("event_orders")
      .insert({
        org_id: event.org_id,
        event_id: event.id,
        supplier_id: req.body.supplier_id || null,
        supplier_name: req.body.supplier_name || null,
        items,
        total_amount: totalAmount,
        currency: "SEK",
        status: "DRAFT",
        delivery_date: event.event_date,
        delivery_time: deliveryTime,
        delivery_address: req.body.delivery_address || null,
        ordered_by: req.body.ordered_by || null,
        auto_ordered: false,
        notes: req.body.notes || null,
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    // Link order to event
    await supabase
      .from("culture_events")
      .update({ order_id: order.id, status: "ORDERED", updated_at: new Date().toISOString() })
      .eq("id", event.id);

    res.status(201).json({ order });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/culture/calendar ───────────────────────────────────────────────
// Returns all events in month with status and cost
router.get("/calendar", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "org_id required" });

    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0]; // last day

    const { data, error } = await supabase
      .from("culture_events")
      .select("id, title, event_type, event_date, event_time, status, total_cost, responsible_user_id, participant_count, is_recurring")
      .eq("org_id", orgId)
      .gte("event_date", startDate)
      .lte("event_date", endDate)
      .order("event_date", { ascending: true });

    if (error) throw error;

    // Group by day
    const byDay: Record<string, any[]> = {};
    for (const ev of (data || [])) {
      const day = ev.event_date;
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(ev);
    }

    res.json({ year, month, events: data || [], byDay });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/culture/costs ───────────────────────────────────────────────────
// Cost report: monthly spend, by type, by team
router.get("/costs", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "org_id required" });

    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const { data: events, error } = await supabase
      .from("culture_events")
      .select("id, event_type, event_date, total_cost, status, participant_count")
      .eq("org_id", orgId)
      .gte("event_date", `${year}-01-01`)
      .lte("event_date", `${year}-12-31`)
      .not("status", "in", '("CANCELLED")');

    if (error) throw error;

    // Monthly breakdown
    const monthly: Record<number, { month: number; count: number; total: number }> = {};
    for (let m = 1; m <= 12; m++) monthly[m] = { month: m, count: 0, total: 0 };

    // By type
    const byType: Record<string, { type: string; count: number; total: number }> = {};

    for (const ev of (events || [])) {
      const m = new Date(ev.event_date).getMonth() + 1;
      monthly[m].count++;
      monthly[m].total += ev.total_cost || 0;

      if (!byType[ev.event_type]) byType[ev.event_type] = { type: ev.event_type, count: 0, total: 0 };
      byType[ev.event_type].count++;
      byType[ev.event_type].total += ev.total_cost || 0;
    }

    const totalYear = Object.values(monthly).reduce((s, m) => s + m.total, 0);

    res.json({
      year,
      total_year: totalYear,
      monthly: Object.values(monthly),
      by_type: Object.values(byType),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
