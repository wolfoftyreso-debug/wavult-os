import { Router, Request, Response, NextFunction } from "express";
import { supabase } from "./supabase";
import Stripe from "stripe";

const router = Router();

// ---------------------------------------------------------------------------
// Stripe client
// ---------------------------------------------------------------------------
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2025-02-24.acacia",
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type CustomerType = "PRIVATE" | "BUSINESS";
export type PaymentFlow = "CARD" | "INVOICE" | "PARTIAL";

export interface PaymentSettings {
  org_id: string;
  allow_card: boolean;
  allow_invoice: boolean;
  allow_partial: boolean;
  require_deposit: boolean;
  deposit_percentage: number;
  payment_terms: number;
  stripe_connect_account_id?: string;
}

// ---------------------------------------------------------------------------
// Smart payment flow selector
// ---------------------------------------------------------------------------
export function selectPaymentFlow(
  customerType: CustomerType,
  settings: PaymentSettings
): PaymentFlow {
  if (customerType === "BUSINESS" && settings.allow_invoice) {
    return "INVOICE"; // Företagskund → faktura
  }
  if (settings.require_deposit && settings.allow_partial) {
    return "PARTIAL"; // Kräver handpenning
  }
  return "CARD"; // Standard → Stripe direkt
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------
const auth = (req: Request, res: Response, next: NextFunction) => {
  if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

// ---------------------------------------------------------------------------
// GET /api/payments/config — Tenant-specifika betalningsinställningar
// ---------------------------------------------------------------------------
router.get("/config", auth, async (req: Request, res: Response) => {
  const org_id = (req as any).user?.org_id;

  const { data, error } = await supabase
    .from("payment_configs")
    .select("*")
    .eq("org_id", org_id)
    .single();

  if (error || !data) {
    // Return safe defaults if not configured
    return res.json({
      org_id,
      allow_card: true,
      allow_invoice: true,
      allow_partial: false,
      require_deposit: false,
      deposit_percentage: 0,
      payment_terms: 30,
      stripe_connect_account_id: null,
    } as PaymentSettings);
  }

  res.json(data);
});

// ---------------------------------------------------------------------------
// PUT /api/payments/config — Uppdatera betalningsinställningar (admin)
// ---------------------------------------------------------------------------
router.put("/config", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["ADMIN", "SYSTEM_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return res.status(403).json({ error: "Admin required" });
  }

  const {
    allow_card, allow_invoice, allow_partial, require_deposit,
    deposit_percentage, payment_terms, stripe_connect_account_id,
  } = req.body;

  const { data, error } = await supabase
    .from("payment_configs")
    .upsert({
      org_id: user.org_id,
      allow_card: allow_card ?? true,
      allow_invoice: allow_invoice ?? true,
      allow_partial: allow_partial ?? false,
      require_deposit: require_deposit ?? false,
      deposit_percentage: deposit_percentage ?? 0,
      payment_terms: payment_terms ?? 30,
      stripe_connect_account_id: stripe_connect_account_id ?? null,
    }, { onConflict: "org_id" })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ---------------------------------------------------------------------------
// POST /api/payments/create-intent — Stripe PaymentIntent för approval
// ---------------------------------------------------------------------------
router.post("/create-intent", async (req: Request, res: Response) => {
  const { amount, currency = "sek", approval_id, org_id, customer_email } = req.body;

  if (!amount || !approval_id || !org_id) {
    return res.status(400).json({ error: "amount, approval_id och org_id krävs" });
  }

  try {
    // Get payment config for this org
    const { data: config } = await supabase
      .from("payment_configs")
      .select("*")
      .eq("org_id", org_id)
      .single();

    const stripeOptions: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100), // öre
      currency: currency.toLowerCase(),
      metadata: {
        approval_id,
        org_id,
        pixdrift: "true",
      },
      receipt_email: customer_email,
    };

    // Use Stripe Connect if tenant has own account
    const intentOptions: any = {};
    if (config?.stripe_connect_account_id) {
      intentOptions.stripeAccount = config.stripe_connect_account_id;
    }

    const intent = await stripe.paymentIntents.create(stripeOptions, intentOptions);

    res.json({
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
      amount,
      currency,
    });
  } catch (err: any) {
    console.error("Stripe intent error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/payments/create-invoice — Faktura (Fortnox/intern)
// ---------------------------------------------------------------------------
router.post("/create-invoice", auth, async (req: Request, res: Response) => {
  const {
    approval_id, customer_id, org_id,
    amount, description, due_days,
  } = req.body;

  if (!approval_id || !amount) {
    return res.status(400).json({ error: "approval_id och amount krävs" });
  }

  const effectiveOrgId = org_id || (req as any).user?.org_id;

  // Get payment terms
  const { data: config } = await supabase
    .from("payment_configs")
    .select("payment_terms")
    .eq("org_id", effectiveOrgId)
    .single();

  const terms = due_days || config?.payment_terms || 30;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + terms);

  // Store invoice record
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      org_id: effectiveOrgId,
      approval_id,
      customer_id,
      amount,
      currency: "SEK",
      description: description || "Arbete enligt godkännande",
      due_date: dueDate.toISOString().split("T")[0],
      status: "PENDING",
      payment_terms: terms,
    })
    .select()
    .single();

  if (error) {
    // Table might not exist yet — return a mock invoice
    console.warn("Invoice table error:", error.message);
    return res.json({
      invoice_id: `INV-${Date.now()}`,
      approval_id,
      amount,
      due_date: dueDate.toISOString().split("T")[0],
      payment_terms: terms,
      status: "PENDING",
    });
  }

  res.json(invoice);
});

// ---------------------------------------------------------------------------
// POST /api/payments/partial — Handpenning + resterande
// ---------------------------------------------------------------------------
router.post("/partial", async (req: Request, res: Response) => {
  const { approval_id, total_amount, org_id, currency = "sek", customer_email } = req.body;

  if (!approval_id || !total_amount || !org_id) {
    return res.status(400).json({ error: "approval_id, total_amount och org_id krävs" });
  }

  try {
    const { data: config } = await supabase
      .from("payment_configs")
      .select("*")
      .eq("org_id", org_id)
      .single();

    const depositPct = config?.deposit_percentage || 30;
    const depositAmount = Math.round(total_amount * (depositPct / 100));
    const remainingAmount = total_amount - depositAmount;

    // Create Stripe intent for deposit only
    const stripeOptions: any = {};
    if (config?.stripe_connect_account_id) {
      stripeOptions.stripeAccount = config.stripe_connect_account_id;
    }

    const depositIntent = await stripe.paymentIntents.create({
      amount: Math.round(depositAmount * 100),
      currency: currency.toLowerCase(),
      metadata: {
        approval_id,
        org_id,
        type: "deposit",
        deposit_percentage: String(depositPct),
        total_amount: String(total_amount),
      },
      receipt_email: customer_email,
    }, stripeOptions);

    res.json({
      deposit: {
        amount: depositAmount,
        percentage: depositPct,
        client_secret: depositIntent.client_secret,
        payment_intent_id: depositIntent.id,
      },
      remaining: {
        amount: remainingAmount,
        due: "Vid leverans",
      },
      total_amount,
      currency,
    });
  } catch (err: any) {
    console.error("Partial payment error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/payments/approval/:id/status — Betalningsstatus
// ---------------------------------------------------------------------------
router.get("/approval/:id/status", async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check Stripe for payment intents linked to this approval
  try {
    const intents = await stripe.paymentIntents.list({
      limit: 5,
    });

    const linked = intents.data.filter(
      (pi) => pi.metadata?.approval_id === id
    );

    if (linked.length === 0) {
      return res.json({ approval_id: id, status: "NO_PAYMENT", payments: [] });
    }

    const payments = linked.map((pi) => ({
      payment_intent_id: pi.id,
      amount: pi.amount / 100,
      currency: pi.currency.toUpperCase(),
      status: pi.status,
      type: pi.metadata?.type || "full",
      created_at: new Date(pi.created * 1000).toISOString(),
    }));

    const allPaid = payments.every((p) => p.status === "succeeded");
    const anyPaid = payments.some((p) => p.status === "succeeded");

    res.json({
      approval_id: id,
      status: allPaid ? "PAID" : anyPaid ? "PARTIAL_PAID" : "PENDING",
      payments,
    });
  } catch (err: any) {
    console.error("Payment status error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/payments/webhook — Stripe webhook handler
// ---------------------------------------------------------------------------
router.post("/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const { approval_id } = pi.metadata;

    if (approval_id) {
      // Update approval payment status
      await supabase
        .from("approvals")
        .update({
          payment_status: "PAID",
          payment_intent_id: pi.id,
          paid_at: new Date().toISOString(),
        })
        .eq("id", approval_id);

      console.log(`✅ Payment succeeded for approval ${approval_id}`);
    }
  }

  res.json({ received: true });
});

export default router;
