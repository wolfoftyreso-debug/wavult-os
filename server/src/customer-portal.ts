import { Router, Request, Response } from "express";
import { supabase } from "./supabase";
import { getBrandForOrg } from "./brand-layer";
import { CustomerState, getWelcomeMessage, shouldShowUpsell } from "./customer-state";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/customer-portal/:token — Komplett portal-payload för kund
// Public — authenticated via guest_token
// ---------------------------------------------------------------------------
router.get("/:token", async (req: Request, res: Response) => {
  const { token } = req.params;

  // 1. Lookup contact by guest_token
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select(`
      id, first_name, last_name, email, phone, org_id,
      customer_state, customer_state_updated_at,
      total_approvals, total_spend, last_visit_at,
      guest_token, account_created_at
    `)
    .eq("guest_token", token)
    .single();

  if (contactError || !contact) {
    return res.status(404).json({ error: "Ogiltigt token — länken fungerar inte längre" });
  }

  // 2. Update state: INVITED → ACTIVE when portal is opened
  const currentState: CustomerState = (contact.customer_state as CustomerState) || "INVITED";
  if (currentState === "INVITED") {
    await supabase
      .from("contacts")
      .update({
        customer_state: "ACTIVE",
        customer_state_updated_at: new Date().toISOString(),
        last_visit_at: new Date().toISOString(),
      })
      .eq("id", contact.id);
    contact.customer_state = "ACTIVE";
  } else {
    await supabase
      .from("contacts")
      .update({ last_visit_at: new Date().toISOString() })
      .eq("id", contact.id);
  }

  // 3. Load brand for org
  const brand = await getBrandForOrg(contact.org_id);

  // 4. Load pending approvals
  const { data: pendingApprovals } = await supabase
    .from("approvals")
    .select("id, title, description, amount, created_at, approval_url, status")
    .eq("contact_id", contact.id)
    .in("status", ["PENDING", "SENT"])
    .order("created_at", { ascending: false });

  // 5. Load current active work order
  const { data: currentJobs } = await supabase
    .from("work_orders")
    .select("id, state, vehicle_reg, title, description, created_at, updated_at")
    .eq("contact_id", contact.id)
    .eq("org_id", contact.org_id)
    .not("state", "in", '("DELIVERED","CANCELLED","CLOSED")')
    .order("created_at", { ascending: false })
    .limit(1);

  const currentJob = currentJobs?.[0] || null;

  // Enrich job with status label
  if (currentJob) {
    const STATUS_LABELS: Record<string, string> = {
      CHECKED_IN: "Incheckad",
      DIAGNOSING: "Diagnos pågår",
      WAITING_APPROVAL: "Väntar på godkännande",
      IN_PROGRESS: "Arbete pågår",
      QUALITY_CHECK: "Kvalitetskontroll",
      READY: "Klar för leverans",
      DELIVERED: "Levererad",
    };
    (currentJob as any).status_label = STATUS_LABELS[currentJob.state] || currentJob.state;
  }

  // 6. Load timeline (recent events)
  const { data: timelineEvents } = await supabase
    .from("contact_events")
    .select("id, type, title, description, created_at, metadata")
    .eq("contact_id", contact.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fallback: build timeline from approvals + work orders if no contact_events table
  let timeline = timelineEvents || [];
  if (!timeline.length) {
    const events: any[] = [];

    if (pendingApprovals?.length) {
      events.push({
        id: "approval-pending",
        type: "approval",
        title: "Godkännande skickat",
        description: pendingApprovals[0].description || "Din verkstad behöver ditt svar",
        created_at: pendingApprovals[0].created_at,
      });
    }

    if (currentJob) {
      events.push({
        id: "job-active",
        type: "checkin",
        title: "Fordon inlämnat",
        description: currentJob.description || "Ditt fordon är hos verkstaden",
        created_at: currentJob.created_at,
      });
    }

    timeline = events;
  }

  // 7. Load history (completed work orders + paid approvals)
  const { data: historyOrders } = await supabase
    .from("work_orders")
    .select("id, state, vehicle_reg, title, description, total_amount, created_at, completed_at")
    .eq("contact_id", contact.id)
    .eq("org_id", contact.org_id)
    .in("state", ["DELIVERED", "COMPLETED", "CLOSED"])
    .order("created_at", { ascending: false })
    .limit(20);

  const history = (historyOrders || []).map((order: any) => ({
    id: order.id,
    title: order.title || order.description || "Servicebesök",
    vehicle: order.vehicle_reg,
    date: order.completed_at || order.created_at,
    amount: order.total_amount,
    status: order.state,
    approved: true,
  }));

  // 8. Calculate upsell eligibility
  const daysSinceVisit = contact.last_visit_at
    ? Math.floor((Date.now() - new Date(contact.last_visit_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const state = contact.customer_state as CustomerState;
  const showUpsell = shouldShowUpsell(state, daysSinceVisit);
  const welcomeMessage = getWelcomeMessage(state, brand.name);

  // 9. Build and return full payload
  res.json({
    customer: {
      id: contact.id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      customer_state: contact.customer_state,
      total_approvals: contact.total_approvals,
      total_spend: contact.total_spend,
      account_created_at: contact.account_created_at,
    },
    brand,
    welcome_message: welcomeMessage,
    pending_approvals: (pendingApprovals || []).map((a: any) => ({
      ...a,
      approval_url: a.approval_url || `https://approve.bc.pixdrift.com/?id=${a.id}&t=${token}`,
    })),
    current_job: currentJob,
    timeline,
    history,
    show_upsell: showUpsell,
    _meta: {
      token,
      generated_at: new Date().toISOString(),
    },
  });
});

export default router;
