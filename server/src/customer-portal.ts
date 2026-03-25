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

// ---------------------------------------------------------------------------
// Helper: Validate token & return contact
// ---------------------------------------------------------------------------
async function getContactByToken(token: string) {
  const { data: contact, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, org_id, guest_token")
    .eq("guest_token", token)
    .single();
  if (error || !contact) return null;
  return contact;
}

// ---------------------------------------------------------------------------
// GET /api/customer-portal/:token/invoices
// Lista fakturor — intern data från payments/invoices-tabell
// ---------------------------------------------------------------------------
router.get("/:token/invoices", async (req: Request, res: Response) => {
  const { token } = req.params;
  const contact = await getContactByToken(token);
  if (!contact) return res.status(404).json({ error: "Ogiltigt token" });

  // Hämta fakturor från payments-tabellen (eller stripe_invoices om integrerat)
  const { data: invoices } = await supabase
    .from("payments")
    .select("id, amount, currency, status, description, due_date, paid_at, invoice_pdf_url, created_at")
    .eq("contact_id", contact.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Berika med labels
  const enriched = (invoices || []).map((inv: any) => ({
    ...inv,
    status_label: inv.status === "paid" ? "Betald" : inv.status === "pending" ? "Obetald" : inv.status,
    status_color: inv.status === "paid" ? "green" : inv.status === "pending" ? "red" : "gray",
    download_url: inv.invoice_pdf_url || null,
  }));

  return res.json({
    invoices: enriched,
    total_paid: enriched.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + (i.amount || 0), 0),
    total_outstanding: enriched.filter((i: any) => i.status === "pending").reduce((s: number, i: any) => s + (i.amount || 0), 0),
  });
});

// ---------------------------------------------------------------------------
// GET /api/customer-portal/:token/api-info
// API-endpoint, maskerad nyckel, rate limits, usage
// ---------------------------------------------------------------------------
router.get("/:token/api-info", async (req: Request, res: Response) => {
  const { token } = req.params;
  const contact = await getContactByToken(token);
  if (!contact) return res.status(404).json({ error: "Ogiltigt token" });

  // Hämta API-nyckel för org (om finns)
  const { data: apiKey } = await supabase
    .from("api_keys")
    .select("id, key_prefix, key_suffix, status, rate_limit, created_at, last_used_at")
    .eq("org_id", contact.org_id)
    .eq("status", "active")
    .limit(1)
    .single();

  return res.json({
    api_endpoint: "https://api.bc.pixdrift.com",
    developer_portal: "https://docs.pixdrift.com",
    api_key: apiKey ? {
      id: apiKey.id,
      masked: `${apiKey.key_prefix}****${apiKey.key_suffix || ""}`,
      status: apiKey.status,
      rate_limit: apiKey.rate_limit || 1000,
      created_at: apiKey.created_at,
      last_used_at: apiKey.last_used_at,
    } : null,
    code_examples: {
      curl: `curl -H "Authorization: Bearer YOUR_API_KEY" https://api.bc.pixdrift.com/api/data`,
      node: `const res = await fetch('https://api.bc.pixdrift.com/api/data', {\n  headers: { Authorization: 'Bearer YOUR_API_KEY' }\n});`,
      python: `import requests\nr = requests.get('https://api.bc.pixdrift.com/api/data',\n  headers={'Authorization': 'Bearer YOUR_API_KEY'})`,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /api/customer-portal/:token/documents
// DPA, Användarvillkor, SLA — med signatur-status
// ---------------------------------------------------------------------------
router.get("/:token/documents", async (req: Request, res: Response) => {
  const { token } = req.params;
  const contact = await getContactByToken(token);
  if (!contact) return res.status(404).json({ error: "Ogiltigt token" });

  // Hämta signade avtal från agreements-tabellen
  const { data: signed } = await supabase
    .from("agreements")
    .select("type, signed_at, document_url")
    .eq("contact_id", contact.id);

  const signedMap: Record<string, any> = {};
  for (const a of signed || []) {
    signedMap[a.type] = a;
  }

  const documents = [
    {
      id: "dpa",
      type: "DPA",
      title: "Personuppgiftsbiträdesavtal (DPA)",
      description: "GDPR-avtal för behandling av personuppgifter",
      icon: "🔒",
      download_url: "https://pixdrift.com/legal/dpa.pdf",
      signed: !!signedMap["dpa"],
      signed_at: signedMap["dpa"]?.signed_at || null,
    },
    {
      id: "terms",
      type: "terms",
      title: "Allmänna villkor",
      description: "Användarvillkor för pixdrift Business",
      icon: "📄",
      download_url: "https://pixdrift.com/legal/terms.pdf",
      signed: !!signedMap["terms"],
      signed_at: signedMap["terms"]?.signed_at || null,
    },
    {
      id: "sla",
      type: "SLA",
      title: "SLA — Servicenivåavtal",
      description: "Garanterad tillgänglighet och support-SLA",
      icon: "⚡",
      download_url: "https://pixdrift.com/legal/sla.pdf",
      signed: !!signedMap["sla"],
      signed_at: signedMap["sla"]?.signed_at || null,
    },
    {
      id: "implementation",
      type: "implementation",
      title: "Implementationsdokumentation",
      description: "Teknisk guide för integration med pixdrift",
      icon: "🛠️",
      download_url: "https://docs.pixdrift.com/implementation",
      signed: false,
      signed_at: null,
      sign_required: false,
    },
  ];

  return res.json({ documents });
});

// ---------------------------------------------------------------------------
// GET /api/customer-portal/:token/readonly-views
// Konfigurerbara läsvyer av kundens nyckeltal
// ---------------------------------------------------------------------------
router.get("/:token/readonly-views", async (req: Request, res: Response) => {
  const { token } = req.params;
  const contact = await getContactByToken(token);
  if (!contact) return res.status(404).json({ error: "Ogiltigt token" });

  // Hämta konfigurerade vyer för denna kund (från portal_views-tabell om finns)
  const { data: viewConfig } = await supabase
    .from("portal_views")
    .select("*")
    .eq("contact_id", contact.id)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (!viewConfig?.length) {
    return res.json({ views: [], message: "Inga konfigurerade vyer" });
  }

  // För varje vy, hämta data
  const views = await Promise.all(
    viewConfig.map(async (view: any) => {
      let data: any = null;

      if (view.type === "kpi_summary") {
        // Hämta KPI-data baserat på kontaktens org och senaste arbetsorder
        const { data: orders } = await supabase
          .from("work_orders")
          .select("total_amount, created_at, state")
          .eq("contact_id", contact.id)
          .order("created_at", { ascending: false })
          .limit(12);
        data = {
          total_visits: orders?.length || 0,
          total_spend: orders?.reduce((s: number, o: any) => s + (o.total_amount || 0), 0) || 0,
        };
      }

      return {
        id: view.id,
        title: view.title,
        type: view.type,
        description: view.description,
        data,
        last_updated: new Date().toISOString(),
      };
    })
  );

  return res.json({ views });
});

// ---------------------------------------------------------------------------
// POST /api/customer-portal/:token/export-data
// GDPR-export — asynkron, skickar email när klar
// ---------------------------------------------------------------------------
router.post("/:token/export-data", async (req: Request, res: Response) => {
  const { token } = req.params;
  const contact = await getContactByToken(token);
  if (!contact) return res.status(404).json({ error: "Ogiltigt token" });

  // Logga GDPR-förfrågan
  await supabase.from("gdpr_requests").insert({
    contact_id: contact.id,
    org_id: contact.org_id,
    type: "export",
    status: "pending",
    email: contact.email,
    requested_at: new Date().toISOString(),
  }).select();

  // TODO: Trigga asynkron export-job (via queue/webhook)

  return res.json({
    message: "Din data-export är beställd. Du får ett email med nedladdningslänk inom 24 timmar.",
    estimated_delivery: "Inom 24 timmar",
    contact_email: contact.email,
  });
});

export default router;
