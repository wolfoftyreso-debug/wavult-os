import { Router, Request, Response, NextFunction } from "express";
import { supabase } from "./supabase";

const router = Router();

// ---------------------------------------------------------------------------
// Customer State Machine
// INVITED → ACTIVE → VERIFIED → RETURNING
// ---------------------------------------------------------------------------

export type CustomerState = "INVITED" | "ACTIVE" | "VERIFIED" | "RETURNING";

export interface CustomerStateData {
  customer_state: CustomerState;
  customer_state_updated_at: string;
  total_approvals: number;
  total_spend: number;
  last_visit_at: string | null;
  guest_token: string | null;
  account_created_at: string | null;
}

// ---------------------------------------------------------------------------
// State transition logic
// ---------------------------------------------------------------------------
export function getNextState(
  current: CustomerState,
  event: "PORTAL_OPENED" | "APPROVAL_COMPLETED" | "PAYMENT_MADE" | "REPEAT_VISIT"
): CustomerState {
  switch (event) {
    case "PORTAL_OPENED":
      return current === "INVITED" ? "ACTIVE" : current;

    case "APPROVAL_COMPLETED":
    case "PAYMENT_MADE":
      if (current === "INVITED" || current === "ACTIVE") return "VERIFIED";
      return current;

    case "REPEAT_VISIT":
      if (current === "VERIFIED") return "RETURNING";
      return current;

    default:
      return current;
  }
}

// State-based welcome messages (svenska)
export function getWelcomeMessage(state: CustomerState, workshopName: string): string {
  switch (state) {
    case "INVITED":
      return `Hej! ${workshopName} har skickat dig en uppdatering om ditt fordon.`;
    case "ACTIVE":
      return `Välkommen tillbaka! Ditt fordon är hos ${workshopName}.`;
    case "VERIFIED":
      return `Tack för ditt förtroende! Här är din historik hos ${workshopName}.`;
    case "RETURNING":
      return `Kul att se dig igen! Välkommen tillbaka till ${workshopName}.`;
  }
}

// State-based upsell timing check
export function shouldShowUpsell(state: CustomerState, daysSinceLastVisit: number): boolean {
  if (state === "VERIFIED" || state === "RETURNING") {
    return daysSinceLastVisit > 30; // Visa upsell efter 30 dagar
  }
  return false;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
const auth = (req: Request, res: Response, next: NextFunction) => {
  if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

// ---------------------------------------------------------------------------
// GET /api/customer-state/:contact_id — Hämta kundens state
// ---------------------------------------------------------------------------
router.get("/:contact_id", auth, async (req: Request, res: Response) => {
  const { contact_id } = req.params;
  const org_id = (req as any).user?.org_id;

  const { data, error } = await supabase
    .from("contacts")
    .select(`
      id, first_name, last_name, email, phone,
      customer_state, customer_state_updated_at,
      total_approvals, total_spend, last_visit_at,
      guest_token, account_created_at
    `)
    .eq("id", contact_id)
    .eq("org_id", org_id)
    .single();

  if (error || !data) return res.status(404).json({ error: "Contact not found" });

  // Calculate days since last visit
  const daysSinceVisit = data.last_visit_at
    ? Math.floor((Date.now() - new Date(data.last_visit_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  res.json({
    ...data,
    days_since_last_visit: daysSinceVisit,
    should_show_upsell: shouldShowUpsell(data.customer_state || "INVITED", daysSinceVisit || 999),
    welcome_message: getWelcomeMessage(data.customer_state || "INVITED", "Verkstaden"),
  });
});

// ---------------------------------------------------------------------------
// POST /api/customer-state/:contact_id/transition — Trigga state-transition
// ---------------------------------------------------------------------------
router.post("/:contact_id/transition", auth, async (req: Request, res: Response) => {
  const { contact_id } = req.params;
  const { event } = req.body;
  const org_id = (req as any).user?.org_id;

  if (!event) return res.status(400).json({ error: "event krävs" });

  const { data: contact, error: fetchError } = await supabase
    .from("contacts")
    .select("customer_state, total_approvals, total_spend, last_visit_at")
    .eq("id", contact_id)
    .eq("org_id", org_id)
    .single();

  if (fetchError || !contact) return res.status(404).json({ error: "Contact not found" });

  const currentState: CustomerState = (contact.customer_state as CustomerState) || "INVITED";
  const newState = getNextState(currentState, event);

  const updates: Record<string, any> = {
    customer_state: newState,
    customer_state_updated_at: new Date().toISOString(),
  };

  if (event === "PORTAL_OPENED" || event === "REPEAT_VISIT") {
    updates.last_visit_at = new Date().toISOString();
  }

  if (event === "APPROVAL_COMPLETED") {
    updates.total_approvals = (contact.total_approvals || 0) + 1;
  }

  const { data: updated, error: updateError } = await supabase
    .from("contacts")
    .update(updates)
    .eq("id", contact_id)
    .eq("org_id", org_id)
    .select()
    .single();

  if (updateError) return res.status(500).json({ error: updateError.message });

  res.json({
    contact_id,
    previous_state: currentState,
    new_state: newState,
    transition_event: event,
    transitioned: currentState !== newState,
    updated_at: updates.customer_state_updated_at,
  });
});

// ---------------------------------------------------------------------------
// PUT /api/customer-state/:contact_id/spend — Uppdatera total spend
// ---------------------------------------------------------------------------
router.put("/:contact_id/spend", auth, async (req: Request, res: Response) => {
  const { contact_id } = req.params;
  const { amount } = req.body;
  const org_id = (req as any).user?.org_id;

  if (typeof amount !== "number" || amount < 0) {
    return res.status(400).json({ error: "amount (positiv siffra) krävs" });
  }

  // Fetch current spend
  const { data: contact } = await supabase
    .from("contacts")
    .select("total_spend")
    .eq("id", contact_id)
    .eq("org_id", org_id)
    .single();

  const newTotal = (contact?.total_spend || 0) + amount;

  const { data, error } = await supabase
    .from("contacts")
    .update({ total_spend: newTotal })
    .eq("id", contact_id)
    .eq("org_id", org_id)
    .select("id, total_spend")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ---------------------------------------------------------------------------
// POST /api/customer-state/:contact_id/generate-token — Generera guesttoken
// ---------------------------------------------------------------------------
router.post("/:contact_id/generate-token", auth, async (req: Request, res: Response) => {
  const { contact_id } = req.params;
  const org_id = (req as any).user?.org_id;

  // Generate a secure random token
  const { randomBytes } = await import("crypto");
  const token = randomBytes(32).toString("base64url");

  const { data, error } = await supabase
    .from("contacts")
    .update({ guest_token: token })
    .eq("id", contact_id)
    .eq("org_id", org_id)
    .select("id, guest_token")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    contact_id,
    guest_token: token,
    portal_url: `https://portal.bc.pixdrift.com/?t=${token}`,
  });
});

// ---------------------------------------------------------------------------
// GET /api/customer-state/by-token/:token — Hämta kontakt via guest token
// (public — används av customer portal)
// ---------------------------------------------------------------------------
router.get("/by-token/:token", async (req: Request, res: Response) => {
  const { token } = req.params;

  const { data, error } = await supabase
    .from("contacts")
    .select(`
      id, first_name, last_name, email, phone,
      customer_state, total_approvals, total_spend, last_visit_at, org_id
    `)
    .eq("guest_token", token)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Ogiltigt token eller session utgången" });
  }

  // Update last_visit + trigger ACTIVE state if INVITED
  const currentState: CustomerState = (data.customer_state as CustomerState) || "INVITED";
  const newState = getNextState(currentState, "PORTAL_OPENED");

  await supabase
    .from("contacts")
    .update({
      last_visit_at: new Date().toISOString(),
      customer_state: newState,
      customer_state_updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  res.json({ ...data, customer_state: newState });
});

// ---------------------------------------------------------------------------
// GET /api/customer-state/org/summary — Summering per state för org
// ---------------------------------------------------------------------------
router.get("/org/summary", auth, async (req: Request, res: Response) => {
  const org_id = (req as any).user?.org_id;

  const { data, error } = await supabase
    .from("contacts")
    .select("customer_state")
    .eq("org_id", org_id);

  if (error) return res.status(500).json({ error: error.message });

  const summary = { INVITED: 0, ACTIVE: 0, VERIFIED: 0, RETURNING: 0 };
  for (const row of data || []) {
    const state = (row.customer_state as CustomerState) || "INVITED";
    summary[state] = (summary[state] || 0) + 1;
  }

  res.json({ org_id, summary, total: (data || []).length });
});

export default router;
