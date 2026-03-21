// ---------------------------------------------------------------------------
// Customer Quality — ISO 9001:2015 §8.2.1, §8.7, §9.1.2
// Complaints, Support Tickets, Recalls, Customer Satisfaction
// ---------------------------------------------------------------------------

import { Router, Request, Response } from "express";
import { supabase } from "./supabase";
import { emitEntityEvent, EventType } from "./events";

const router = Router();

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function ticketCode(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// COMPLAINTS
// ---------------------------------------------------------------------------

// GET /api/complaints
router.get("/api/complaints", async (req: Request, res: Response) => {
  try {
    const { org_id, status, severity, date_from, date_to, search, limit = "50", offset = "0" } = req.query;
    let q = supabase.from("complaints").select("*, companies!customer_id(name)", { count: "exact" });
    if (org_id) q = q.eq("org_id", org_id as string);
    if (status) q = q.eq("status", status as string);
    if (severity) q = q.eq("severity", severity as string);
    if (date_from) q = q.gte("reported_date", date_from as string);
    if (date_to) q = q.lte("reported_date", date_to as string);
    if (search) q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%,customer_name.ilike.%${search}%`);
    q = q.order("created_at", { ascending: false }).range(Number(offset), Number(offset) + Number(limit) - 1);
    const { data, error, count } = await q;
    if (error) throw error;
    return res.json({ complaints: data ?? [], total: count ?? 0, limit: Number(limit), offset: Number(offset) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/complaints
router.post("/api/complaints", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });

  try {
    const { org_id, customer_id, customer_name, title, description, severity, category,
      reported_date, contact_email, contact_phone } = req.body;

    if (!org_id || !title || !severity) {
      return res.status(400).json({ error: "org_id, title, and severity are required" });
    }

    const complaint_number = ticketCode("CMP");

    const { data: complaint, error: cErr } = await supabase.from("complaints").insert({
      org_id, customer_id, customer_name, title, description, severity,
      category: category ?? "OTHER", reported_date: reported_date ?? new Date().toISOString().slice(0, 10),
      contact_email, contact_phone, complaint_number, status: "OPEN",
      created_by: user.id,
    }).select().single();
    if (cErr) throw cErr;

    // Auto-create NC
    const { data: nc } = await supabase.from("non_conformances").insert({
      org_id,
      title: `Kundklagomål: ${title}`,
      description: description ?? "",
      severity: severity === "CRITICAL" ? "MAJOR" : severity,
      source: "CUSTOMER_COMPLAINT",
      status: "OPEN",
      reference_id: complaint.id,
      created_by: user.id,
    }).select("id").single();

    if (nc) {
      await supabase.from("complaints").update({ nc_id: nc.id }).eq("id", complaint.id);
      await emitEntityEvent("nc.raised" as EventType, "nc", nc.id, org_id, user.id, {
        complaint_id: complaint.id, complaint_number, title,
      });
    }

    return res.status(201).json({ complaint: { ...complaint, nc_id: nc?.id } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/complaints/:id
router.get("/api/complaints/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data: complaint, error } = await supabase.from("complaints")
      .select("*, companies!customer_id(name, email)").eq("id", id).single();
    if (error || !complaint) return res.status(404).json({ error: "Complaint not found" });

    const { data: nc } = await supabase.from("non_conformances").select("id, title, status").eq("id", complaint.nc_id).maybeSingle();
    const { data: tickets } = await supabase.from("support_tickets").select("id, ticket_number, subject, status").eq("complaint_id", id);

    return res.json({ complaint, linked_nc: nc, linked_tickets: tickets ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/complaints/:id
router.patch("/api/complaints/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates: Record<string, any> = { ...req.body, updated_at: new Date().toISOString() };

    if (updates.status === "RESOLVED") {
      if (!updates.resolution_description) return res.status(422).json({ error: "resolution_description required to resolve complaint" });
      updates.resolved_at = new Date().toISOString();
    }
    if (updates.status === "CLOSED") {
      updates.closed_at = new Date().toISOString();
    }

    const { data, error } = await supabase.from("complaints").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return res.json({ complaint: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/complaints/:id/response
router.post("/api/complaints/:id/response", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { response_text, responded_by, response_date } = req.body;

    const { data, error } = await supabase.from("complaints").update({
      customer_response: response_text,
      customer_response_received: true,
      last_response_at: new Date().toISOString(),
      response_by: responded_by,
      updated_at: new Date().toISOString(),
    }).eq("id", id).select().single();
    if (error) throw error;
    return res.json({ complaint: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// SUPPORT TICKETS
// ---------------------------------------------------------------------------

// GET /api/tickets
router.get("/api/tickets", async (req: Request, res: Response) => {
  try {
    const { org_id, status, priority, assigned_to, customer_id, limit = "50", offset = "0" } = req.query;
    let q = supabase.from("support_tickets").select("*, profiles!assigned_to(full_name)", { count: "exact" });
    if (org_id) q = q.eq("org_id", org_id as string);
    if (status) q = q.eq("status", status as string);
    if (priority) q = q.eq("priority", priority as string);
    if (assigned_to) q = q.eq("assigned_to", assigned_to as string);
    if (customer_id) q = q.eq("customer_id", customer_id as string);
    q = q.order("created_at", { ascending: false }).range(Number(offset), Number(offset) + Number(limit) - 1);
    const { data, error, count } = await q;
    if (error) throw error;
    return res.json({ tickets: data ?? [], total: count ?? 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets
router.post("/api/tickets", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });

  try {
    const { org_id, customer_id, customer_name, subject, description, priority, channel, category } = req.body;
    if (!org_id || !subject || !priority) return res.status(400).json({ error: "org_id, subject, and priority are required" });

    const slaHours: Record<string, number> = { URGENT: 4, HIGH: 8, MEDIUM: 24, LOW: 72 };
    const sla_due_at = new Date(Date.now() + (slaHours[priority as string] ?? 24) * 3600000).toISOString();
    const ticket_number = ticketCode("TKT");

    const { data, error } = await supabase.from("support_tickets").insert({
      org_id, customer_id, customer_name, subject, description,
      priority, channel: channel ?? "EMAIL", category, ticket_number,
      status: "OPEN", sla_due_at, created_by: user.id,
    }).select().single();
    if (error) throw error;
    return res.status(201).json({ ticket: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/:id
router.get("/api/tickets/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data: ticket, error } = await supabase.from("support_tickets")
      .select("*, profiles!assigned_to(full_name)").eq("id", id).single();
    if (error || !ticket) return res.status(404).json({ error: "Ticket not found" });

    const { data: messages } = await supabase.from("ticket_messages")
      .select("*, profiles!author_id(full_name)")
      .eq("ticket_id", id).order("created_at");

    return res.json({ ticket, messages: messages ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tickets/:id
router.patch("/api/tickets/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates: Record<string, any> = { ...req.body, updated_at: new Date().toISOString() };

    if (updates.status === "RESOLVED") updates.resolved_at = new Date().toISOString();
    if (updates.status === "CLOSED") {
      const now = new Date();
      updates.closed_at = now.toISOString();

      const { data: ticket } = await supabase.from("support_tickets").select("created_at, first_response_at").eq("id", id).single();
      if (ticket) {
        const created = new Date(ticket.created_at);
        updates.resolution_time_minutes = Math.round((now.getTime() - created.getTime()) / 60000);
        if (ticket.first_response_at) {
          updates.first_response_time_minutes = Math.round((new Date(ticket.first_response_at).getTime() - created.getTime()) / 60000);
        }
      }
    }

    const { data, error } = await supabase.from("support_tickets").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return res.json({ ticket: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/:id/messages
router.post("/api/tickets/:id/messages", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });

  try {
    const { id } = req.params;
    const { message_body, is_internal, author_id } = req.body;
    if (!message_body) return res.status(400).json({ error: "message_body is required" });

    const { data: msg, error: msgErr } = await supabase.from("ticket_messages").insert({
      ticket_id: id, message_body,
      is_internal: is_internal ?? false,
      author_id: author_id ?? user.id,
    }).select().single();
    if (msgErr) throw msgErr;

    // Set first_response_at if not set and this is an agent message
    const { data: ticket } = await supabase.from("support_tickets").select("first_response_at, created_by").eq("id", id).single();
    const ticketUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (!ticket?.first_response_at && ticket?.created_by !== user.id) {
      ticketUpdates.first_response_at = new Date().toISOString();
    }
    await supabase.from("support_tickets").update(ticketUpdates).eq("id", id);

    return res.status(201).json({ message: msg });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// RECALLS
// ---------------------------------------------------------------------------

// GET /api/recalls
router.get("/api/recalls", async (req: Request, res: Response) => {
  try {
    const { org_id, status, severity, limit = "50", offset = "0" } = req.query;
    let q = supabase.from("recalls").select("*", { count: "exact" });
    if (org_id) q = q.eq("org_id", org_id as string);
    if (status) q = q.eq("status", status as string);
    if (severity) q = q.eq("severity", severity as string);
    q = q.order("created_at", { ascending: false }).range(Number(offset), Number(offset) + Number(limit) - 1);
    const { data, error, count } = await q;
    if (error) throw error;
    return res.json({ recalls: data ?? [], total: count ?? 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/recalls
router.post("/api/recalls", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });

  try {
    const { org_id, product_name, product_batch, recall_reason, severity,
      affected_quantity, description, regulatory_notification_required } = req.body;

    if (!org_id || !product_name || !severity) {
      return res.status(400).json({ error: "org_id, product_name, and severity are required" });
    }

    const recall_number = ticketCode("RCL");

    const { data: recall, error: rErr } = await supabase.from("recalls").insert({
      org_id, product_name, product_batch, recall_reason, severity,
      affected_quantity, description, regulatory_notification_required: !!regulatory_notification_required,
      recall_number, status: "INITIATED", created_by: user.id,
    }).select().single();
    if (rErr) throw rErr;

    // Auto-create NC
    const { data: nc } = await supabase.from("non_conformances").insert({
      org_id,
      title: `Produktåterkallelse: ${product_name}`,
      description: `${description ?? ""}\nBatch: ${product_batch ?? "N/A"}\nAntal berörda: ${affected_quantity ?? "Okänt"}`,
      severity: "CRITICAL",
      source: "PRODUCT_RECALL",
      status: "OPEN",
      reference_id: recall.id,
      created_by: user.id,
    }).select("id").single();

    if (nc) {
      await supabase.from("recalls").update({ nc_id: nc.id }).eq("id", recall.id);
      await emitEntityEvent("nc.raised" as EventType, "nc", nc.id, org_id, user.id, {
        recall_id: recall.id, recall_number, product_name, severity,
      });
    }

    return res.status(201).json({ recall: { ...recall, nc_id: nc?.id } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/recalls/:id
router.patch("/api/recalls/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from("recalls")
      .update({ ...req.body, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw error;
    return res.json({ recall: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// SATISFACTION SURVEYS
// ---------------------------------------------------------------------------

// GET /api/satisfaction
router.get("/api/satisfaction", async (req: Request, res: Response) => {
  try {
    const { org_id, survey_type, date_from, date_to, limit = "50" } = req.query;
    let q = supabase.from("customer_satisfaction_surveys").select("*", { count: "exact" });
    if (org_id) q = q.eq("org_id", org_id as string);
    if (survey_type) q = q.eq("survey_type", survey_type as string);
    if (date_from) q = q.gte("survey_date", date_from as string);
    if (date_to) q = q.lte("survey_date", date_to as string);
    q = q.order("survey_date", { ascending: false }).limit(Number(limit));
    const { data, error, count } = await q;
    if (error) throw error;

    // Compute averages
    const npsData = (data ?? []).filter((s: any) => s.survey_type === "NPS");
    const csatData = (data ?? []).filter((s: any) => s.survey_type === "CSAT");
    const promoters = npsData.filter((s: any) => s.score >= 9).length;
    const detractors = npsData.filter((s: any) => s.score <= 6).length;
    const nps_score = npsData.length > 0 ? Math.round(((promoters - detractors) / npsData.length) * 100) : null;
    const csat_score = csatData.length > 0
      ? Math.round(csatData.reduce((acc: number, s: any) => acc + s.score, 0) / csatData.length * 10) / 10
      : null;

    return res.json({
      surveys: data ?? [],
      total: count ?? 0,
      averages: { nps_score, csat_score, response_count: count ?? 0 },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/satisfaction
router.post("/api/satisfaction", async (req: Request, res: Response) => {
  try {
    const { org_id, customer_id, customer_name, survey_type, score, max_score,
      comments, survey_date, transaction_reference } = req.body;

    if (!org_id || !survey_type || score == null) {
      return res.status(400).json({ error: "org_id, survey_type, and score are required" });
    }

    let nps_category: string | null = null;
    if (survey_type === "NPS") {
      if (score >= 9) nps_category = "PROMOTER";
      else if (score >= 7) nps_category = "PASSIVE";
      else nps_category = "DETRACTOR";
    }

    const { data, error } = await supabase.from("customer_satisfaction_surveys").insert({
      org_id, customer_id, customer_name, survey_type, score: Number(score),
      max_score: max_score ?? 10, comments, nps_category,
      survey_date: survey_date ?? new Date().toISOString().slice(0, 10),
      transaction_reference,
    }).select().single();
    if (error) throw error;
    return res.status(201).json({ survey: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/satisfaction/dashboard
router.get("/api/satisfaction/dashboard", async (req: Request, res: Response) => {
  try {
    const { org_id, period = "90d" } = req.query;
    const days = period === "365d" ? 365 : period === "30d" ? 30 : 90;
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    let q = supabase.from("customer_satisfaction_surveys").select("*");
    if (org_id) q = q.eq("org_id", org_id as string);
    q = q.gte("survey_date", since);
    const { data: surveys } = await q;

    const npsData = (surveys ?? []).filter((s: any) => s.survey_type === "NPS");
    const promoters = npsData.filter((s: any) => s.score >= 9).length;
    const detractors = npsData.filter((s: any) => s.score <= 6).length;
    const nps_score = npsData.length > 0 ? Math.round(((promoters - detractors) / npsData.length) * 100) : null;

    // Monthly breakdown (last 6 months)
    const monthly: Record<string, { count: number; nps: number; promoters: number; detractors: number }> = {};
    for (const s of surveys ?? []) {
      const month = s.survey_date?.slice(0, 7);
      if (!monthly[month]) monthly[month] = { count: 0, nps: 0, promoters: 0, detractors: 0 };
      monthly[month].count++;
      if (s.survey_type === "NPS") {
        if (s.score >= 9) monthly[month].promoters++;
        if (s.score <= 6) monthly[month].detractors++;
        monthly[month].nps = monthly[month].count > 0
          ? Math.round(((monthly[month].promoters - monthly[month].detractors) / monthly[month].count) * 100)
          : 0;
      }
    }

    return res.json({
      nps_score,
      response_count: surveys?.length ?? 0,
      nps_breakdown: { promoters, passives: npsData.length - promoters - detractors, detractors },
      monthly_trend: Object.entries(monthly).sort(([a],[b]) => a.localeCompare(b)).slice(-6),
      period_days: days,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------------
router.get("/api/customer-quality/dashboard", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query;
    const now = new Date().toISOString();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    let baseFilter = (table: string) => {
      let q = supabase.from(table).select("id, created_at, status", { count: "exact" });
      if (org_id) q = q.eq("org_id", org_id as string);
      return q;
    };

    const [
      { count: openComplaints },
      { count: resolvedThisMonth },
      { count: openTickets },
      { count: overdueTickets },
      { count: activeRecalls },
    ] = await Promise.all([
      baseFilter("complaints").eq("status", "OPEN"),
      baseFilter("complaints").eq("status", "RESOLVED").gte("resolved_at", monthStart),
      baseFilter("support_tickets").eq("status", "OPEN"),
      baseFilter("support_tickets").eq("status", "OPEN").lt("sla_due_at", now),
      baseFilter("recalls").not("status", "in", "(COMPLETED,CLOSED)"),
    ]);

    // Recent complaints
    let recentQ = supabase.from("complaints").select("id, complaint_number, title, severity, status, created_at").order("created_at", { ascending: false }).limit(5);
    if (org_id) recentQ = recentQ.eq("org_id", org_id as string);
    const { data: recentComplaints } = await recentQ;

    // Latest NPS
    let npsQ = supabase.from("customer_satisfaction_surveys").select("score, survey_date").eq("survey_type", "NPS").order("survey_date", { ascending: false }).limit(30);
    if (org_id) npsQ = npsQ.eq("org_id", org_id as string);
    const { data: npsData } = await npsQ;
    const promoters = (npsData ?? []).filter((s: any) => s.score >= 9).length;
    const detractors = (npsData ?? []).filter((s: any) => s.score <= 6).length;
    const nps_score = (npsData ?? []).length > 0
      ? Math.round(((promoters - detractors) / (npsData ?? []).length) * 100)
      : null;

    return res.json({
      open_complaints: openComplaints ?? 0,
      resolved_this_month: resolvedThisMonth ?? 0,
      open_tickets: openTickets ?? 0,
      overdue_tickets: overdueTickets ?? 0,
      active_recalls: activeRecalls ?? 0,
      latest_nps_score: nps_score,
      recent_complaints: recentComplaints ?? [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
