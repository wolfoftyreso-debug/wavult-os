import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Types – augment Express Request with auth middleware payload
// ---------------------------------------------------------------------------
interface AuthUser {
  id: string;
  org_id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const router = Router();

/** Shorthand to pull the authenticated user or bail with 401. */
function getUser(req: Request, res: Response): AuthUser | null {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.user;
}

/** Insert an audit-log row (fire-and-forget). */
async function audit(
  userId: string,
  orgId: string,
  action: string,
  entity: string,
  entityId: string | null,
  meta: Record<string, unknown> = {}
) {
  await supabase.from("audit_logs").insert({
    user_id: userId,
    org_id: orgId,
    action,
    entity,
    entity_id: entityId,
    meta,
    created_at: new Date().toISOString(),
  });
}

// ===========================================================================
// 1. CONTACTS  (POST + GET)  — endpoints 1-2
// ===========================================================================
router.post("/api/contacts", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from("contacts")
      .insert({ ...req.body, org_id: user.org_id, created_by: user.id })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await audit(user.id, user.org_id, "create", "contacts", data.id);
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/api/contacts", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("org_id", user.org_id)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 2. COMPANIES  (POST + GET)  — endpoints 3-4
// ===========================================================================
router.post("/api/companies", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from("companies")
      .insert({ ...req.body, org_id: user.org_id, created_by: user.id })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await audit(user.id, user.org_id, "create", "companies", data.id);
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/api/companies", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("org_id", user.org_id)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 3. LEADS  (POST + GET)  — endpoints 5-6
// ===========================================================================
router.post("/api/leads", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from("leads")
      .insert({ ...req.body, org_id: user.org_id, created_by: user.id })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await audit(user.id, user.org_id, "create", "leads", data.id);
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/api/leads", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("org_id", user.org_id)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 4. DEALS  (POST + GET + PATCH status)  — endpoints 7-9
// ===========================================================================
const VALID_DEAL_STATUSES = [
  "prospecting",
  "qualification",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
];

router.post("/api/deals", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from("deals")
      .insert({ ...req.body, org_id: user.org_id, created_by: user.id })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await audit(user.id, user.org_id, "create", "deals", data.id);
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/api/deals", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from("deals")
      .select("*")
      .eq("org_id", user.org_id)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/api/deals/:id/status", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { status } = req.body;
    if (!status || !VALID_DEAL_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_DEAL_STATUSES.join(", ")}`,
      });
    }

    const { data, error } = await supabase
      .from("deals")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("org_id", user.org_id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Deal not found" });

    await audit(user.id, user.org_id, "update_status", "deals", req.params.id, { status });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 5. TASKS  (POST + GET + GET /my + PATCH status)  — endpoints 10-13
// ===========================================================================
router.post("/api/tasks", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...req.body, org_id: user.org_id, created_by: user.id })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await audit(user.id, user.org_id, "create", "tasks", data.id);
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/api/tasks/my", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("org_id", user.org_id)
      .eq("assigned_to", user.id)
      .order("due_date", { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/api/tasks", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("org_id", user.org_id)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/api/tasks/:id/status", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("org_id", user.org_id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Task not found" });

    await audit(user.id, user.org_id, "update_status", "tasks", req.params.id, { status });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 6. MEETINGS  (POST)  — endpoint 14
// ===========================================================================
router.post("/api/meetings", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { attendees, ...meetingData } = req.body;

    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .insert({ ...meetingData, org_id: user.org_id, created_by: user.id })
      .select()
      .single();

    if (meetingError) return res.status(400).json({ error: meetingError.message });

    if (Array.isArray(attendees) && attendees.length > 0) {
      const attendeeRows = attendees.map((userId: string) => ({
        meeting_id: meeting.id,
        user_id: userId,
      }));

      const { error: attendeeError } = await supabase
        .from("meeting_attendees")
        .insert(attendeeRows);

      if (attendeeError) {
        return res.status(400).json({ error: attendeeError.message });
      }
    }

    await audit(user.id, user.org_id, "create", "meetings", meeting.id, {
      attendee_count: attendees?.length ?? 0,
    });
    return res.status(201).json(meeting);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 7. LEDGER  (POST entries + GET trial-balance)  — endpoints 15-16
// ===========================================================================
router.post("/api/ledger/entries", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { lines, description, reference } = req.body;

    if (!Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({
        error: "A ledger entry requires at least two lines (debit + credit)",
      });
    }

    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of lines) {
      totalDebit += Number(line.debit ?? 0);
      totalCredit += Number(line.credit ?? 0);
    }

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      return res.status(400).json({
        error: `Transaction does not balance. Debits: ${totalDebit}, Credits: ${totalCredit}`,
      });
    }

    // Create the journal entry header
    const { data: entry, error: entryError } = await supabase
      .from("ledger_entries")
      .insert({
        org_id: user.org_id,
        description,
        reference,
        created_by: user.id,
      })
      .select()
      .single();

    if (entryError) return res.status(400).json({ error: entryError.message });

    // Insert the individual lines
    const lineRows = lines.map((line: any) => ({
      entry_id: entry.id,
      account_id: line.account_id,
      debit: Number(line.debit ?? 0),
      credit: Number(line.credit ?? 0),
      org_id: user.org_id,
    }));

    const { error: linesError } = await supabase
      .from("ledger_lines")
      .insert(lineRows);

    if (linesError) return res.status(400).json({ error: linesError.message });

    await audit(user.id, user.org_id, "create", "ledger_entries", entry.id, {
      line_count: lines.length,
      total: totalDebit,
    });
    return res.status(201).json(entry);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/api/ledger/trial-balance", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from("ledger_lines")
      .select("account_id, debit, credit")
      .eq("org_id", user.org_id);

    if (error) return res.status(400).json({ error: error.message });

    // Aggregate by account
    const balances: Record<string, { account_id: string; total_debit: number; total_credit: number }> = {};
    for (const line of data ?? []) {
      if (!balances[line.account_id]) {
        balances[line.account_id] = {
          account_id: line.account_id,
          total_debit: 0,
          total_credit: 0,
        };
      }
      balances[line.account_id].total_debit += Number(line.debit ?? 0);
      balances[line.account_id].total_credit += Number(line.credit ?? 0);
    }

    const accounts = Object.values(balances).map((b) => ({
      ...b,
      balance: b.total_debit - b.total_credit,
    }));

    const totalDebits = accounts.reduce((s, a) => s + a.total_debit, 0);
    const totalCredits = accounts.reduce((s, a) => s + a.total_credit, 0);

    return res.json({
      accounts,
      total_debits: totalDebits,
      total_credits: totalCredits,
      balanced: Math.abs(totalDebits - totalCredits) < 0.001,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 8. PAYOUTS  (POST + GET + PATCH approve)  — endpoints 17-19
// ===========================================================================
router.post("/api/payouts", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from("payouts")
      .insert({
        ...req.body,
        org_id: user.org_id,
        created_by: user.id,
        status: "pending",
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await audit(user.id, user.org_id, "create", "payouts", data.id);
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/api/payouts", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from("payouts")
      .select("*")
      .eq("org_id", user.org_id)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/api/payouts/:id/approve", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    if (!["FINANCE", "ADMIN"].includes(user.role)) {
      return res.status(403).json({ error: "Only FINANCE or ADMIN roles can approve payouts" });
    }

    const { data, error } = await supabase
      .from("payouts")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", req.params.id)
      .eq("org_id", user.org_id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Payout not found" });

    await audit(user.id, user.org_id, "approve", "payouts", req.params.id);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 9. CONFIG  (GET + PATCH)  — endpoints 20-21
// ===========================================================================
router.get("/api/config", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from("config")
      .select("*")
      .eq("org_id", user.org_id);

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/api/config", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: "key is required" });

    const { data, error } = await supabase
      .from("config")
      .upsert(
        { org_id: user.org_id, key, value, updated_by: user.id, updated_at: new Date().toISOString() },
        { onConflict: "org_id,key" }
      )
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await audit(user.id, user.org_id, "update", "config", key, { value });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 10. DECISIONS  (POST + GET)  — endpoints 22-23
// ===========================================================================
router.post("/api/decisions", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from("decisions")
      .insert({ ...req.body, org_id: user.org_id, created_by: user.id })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await audit(user.id, user.org_id, "create", "decisions", data.id);
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/api/decisions", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from("decisions")
      .select("*")
      .eq("org_id", user.org_id)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 11. CHANNELS & MESSAGES  (GET channels + POST message + GET messages)
//     — endpoints 24-26
// ===========================================================================
router.get("/api/channels", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from("channels")
      .select("*")
      .eq("org_id", user.org_id)
      .order("name", { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/api/messages", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { channel_id, content } = req.body;
    if (!channel_id || !content) {
      return res.status(400).json({ error: "channel_id and content are required" });
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        channel_id,
        content,
        org_id: user.org_id,
        sender_id: user.id,
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await audit(user.id, user.org_id, "send", "messages", data.id, { channel_id });
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/api/channels/:id/messages", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("channel_id", req.params.id)
      .eq("org_id", user.org_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 12. DASHBOARDS  (admin + sales + finance)  — endpoints 27-29
// ===========================================================================
router.get("/api/dashboards/admin", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const orgFilter = { org_id: user.org_id };

    const [contacts, companies, leads, deals, tasks, payouts] = await Promise.all([
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", user.org_id),
      supabase.from("companies").select("id", { count: "exact", head: true }).eq("org_id", user.org_id),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("org_id", user.org_id),
      supabase.from("deals").select("id, status, value").eq("org_id", user.org_id),
      supabase.from("tasks").select("id, status").eq("org_id", user.org_id),
      supabase.from("payouts").select("id, status, amount").eq("org_id", user.org_id),
    ]);

    const dealsByStatus: Record<string, number> = {};
    for (const d of deals.data ?? []) {
      dealsByStatus[d.status] = (dealsByStatus[d.status] || 0) + 1;
    }

    const tasksByStatus: Record<string, number> = {};
    for (const t of tasks.data ?? []) {
      tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
    }

    return res.json({
      contacts_count: contacts.count ?? 0,
      companies_count: companies.count ?? 0,
      leads_count: leads.count ?? 0,
      deals_count: deals.data?.length ?? 0,
      deals_by_status: dealsByStatus,
      total_deal_value: (deals.data ?? []).reduce((s, d) => s + Number(d.value ?? 0), 0),
      tasks_count: tasks.data?.length ?? 0,
      tasks_by_status: tasksByStatus,
      payouts_pending: (payouts.data ?? []).filter((p) => p.status === "pending").length,
      payouts_total: (payouts.data ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/api/dashboards/sales", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const [leads, deals] = await Promise.all([
      supabase.from("leads").select("id, status, created_at").eq("org_id", user.org_id),
      supabase.from("deals").select("id, status, value, created_at, closed_at").eq("org_id", user.org_id),
    ]);

    const openDeals = (deals.data ?? []).filter(
      (d) => !["closed_won", "closed_lost"].includes(d.status)
    );
    const wonDeals = (deals.data ?? []).filter((d) => d.status === "closed_won");
    const lostDeals = (deals.data ?? []).filter((d) => d.status === "closed_lost");

    return res.json({
      total_leads: leads.data?.length ?? 0,
      total_deals: deals.data?.length ?? 0,
      open_deals: openDeals.length,
      pipeline_value: openDeals.reduce((s, d) => s + Number(d.value ?? 0), 0),
      won_deals: wonDeals.length,
      won_value: wonDeals.reduce((s, d) => s + Number(d.value ?? 0), 0),
      lost_deals: lostDeals.length,
      win_rate:
        wonDeals.length + lostDeals.length > 0
          ? Number(((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100).toFixed(1))
          : 0,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/api/dashboards/finance", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const [payouts, ledgerLines] = await Promise.all([
      supabase.from("payouts").select("id, status, amount").eq("org_id", user.org_id),
      supabase.from("ledger_lines").select("debit, credit").eq("org_id", user.org_id),
    ]);

    const pendingPayouts = (payouts.data ?? []).filter((p) => p.status === "pending");
    const approvedPayouts = (payouts.data ?? []).filter((p) => p.status === "approved");

    const totalDebits = (ledgerLines.data ?? []).reduce((s, l) => s + Number(l.debit ?? 0), 0);
    const totalCredits = (ledgerLines.data ?? []).reduce((s, l) => s + Number(l.credit ?? 0), 0);

    return res.json({
      total_debits: totalDebits,
      total_credits: totalCredits,
      ledger_balanced: Math.abs(totalDebits - totalCredits) < 0.001,
      payouts_pending_count: pendingPayouts.length,
      payouts_pending_amount: pendingPayouts.reduce((s, p) => s + Number(p.amount ?? 0), 0),
      payouts_approved_count: approvedPayouts.length,
      payouts_approved_amount: approvedPayouts.reduce((s, p) => s + Number(p.amount ?? 0), 0),
      payouts_total_amount: (payouts.data ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 13. AUDIT LOG  (GET)  — endpoint 30
// ===========================================================================
router.get("/api/audit", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const entity = req.query.entity as string | undefined;
    const action = req.query.action as string | undefined;

    let query = supabase
      .from("audit_logs")
      .select("*")
      .eq("org_id", user.org_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (entity) query = query.eq("entity", entity);
    if (action) query = query.eq("action", action);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// Catch-all health / module info  — endpoint 31
// ===========================================================================
router.get("/api/execution/health", async (_req: Request, res: Response) => {
  return res.json({
    module: "execution",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
export default router;
