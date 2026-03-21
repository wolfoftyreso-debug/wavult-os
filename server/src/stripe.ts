import { Router, Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import { supabase } from "./supabase";

const router = Router();

// ---------------------------------------------------------------------------
// Stripe client (uses env var — no real key needed until production)
// ---------------------------------------------------------------------------
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2025-02-24.acacia",
});

// ---------------------------------------------------------------------------
// Plan definitions — replace priceId with real Stripe Price IDs when live
// ---------------------------------------------------------------------------
const PLANS: Record<string, { name: string; price: number; currency: string; interval: string; priceId: string }> = {
  starter: {
    name: "Starter",
    price: 49900,
    currency: "eur",
    interval: "month",
    priceId: process.env.STRIPE_PRICE_STARTER || "price_starter_placeholder",
  },
  growth: {
    name: "Growth",
    price: 99900,
    currency: "eur",
    interval: "month",
    priceId: process.env.STRIPE_PRICE_GROWTH || "price_growth_placeholder",
  },
};

// ---------------------------------------------------------------------------
// GET /api/stripe/plans — list available plans
// ---------------------------------------------------------------------------
router.get("/plans", (_req: Request, res: Response) => {
  const plans = Object.entries(PLANS).map(([key, p]) => ({
    id: key,
    name: p.name,
    price: p.price,
    currency: p.currency,
    interval: p.interval,
    // Don't expose internal priceId to frontend
  }));
  res.json({ plans });
});

// ---------------------------------------------------------------------------
// POST /api/stripe/create-checkout-session
// ---------------------------------------------------------------------------
router.post("/create-checkout-session", async (req: Request, res: Response) => {
  const { plan, email, org_name } = req.body;

  if (!plan || !email || !org_name) {
    return res.status(400).json({ error: "plan, email, och org_name krävs" });
  }

  const selectedPlan = PLANS[plan as string];
  if (!selectedPlan) {
    return res.status(400).json({ error: `Okänd plan: ${plan}. Välj 'starter' eller 'growth'.` });
  }

  // If using placeholder key, return a mock URL for development
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === "sk_test_placeholder") {
    console.log(`[Stripe DEV] Mock checkout session for ${email}, plan=${plan}, org=${org_name}`);
    return res.json({
      url: `${process.env.APP_URL || "https://pixdrift.com"}/success.html?plan=${plan}&org=${encodeURIComponent(org_name)}&email=${encodeURIComponent(email)}&mock=1`,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: email,
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        org_name,
        plan,
      },
      success_url: `${process.env.APP_URL || "https://pixdrift.com"}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || "https://pixdrift.com"}/checkout.html?cancelled=1`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error("[Stripe] create-checkout-session fel:", err);
    res.status(500).json({ error: "Kunde inte skapa Stripe-session", detail: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/stripe/webhook — handle Stripe events
// Raw body required — register this route BEFORE express.json() middleware
// in index.ts by using express.raw() here.
// ---------------------------------------------------------------------------
router.post(
  "/webhook",
  express_raw_middleware,
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    if (!webhookSecret) {
      // No secret configured — parse body directly (dev mode)
      try {
        event = JSON.parse((req as any).rawBody || req.body);
      } catch {
        return res.status(400).json({ error: "Ogiltig webhook payload" });
      }
    } else {
      try {
        event = stripe.webhooks.constructEvent(
          (req as any).rawBody || req.body,
          sig as string,
          webhookSecret
        );
      } catch (err: any) {
        console.error("[Stripe Webhook] Signaturverifiering misslyckades:", err.message);
        return res.status(400).json({ error: `Webhook fel: ${err.message}` });
      }
    }

    // Handle event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  }
);

// ---------------------------------------------------------------------------
// Webhook handler: checkout.session.completed
// ---------------------------------------------------------------------------
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orgName = session.metadata?.org_name || "Unknown Org";
  const plan = session.metadata?.plan || "starter";
  const email = session.customer_email || session.customer_details?.email || "";

  console.log(`[Stripe] ✅ Checkout completed — org: "${orgName}", plan: ${plan}, email: ${email}`);

  // Insert organisation into Supabase
  try {
    const { data, error } = await supabase
      .from("organizations")
      .insert({
        name: orgName,
        plan,
        email,
        stripe_customer_id: session.customer as string || null,
        stripe_subscription_id: session.subscription as string || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[Stripe Webhook] Supabase insert-fel:", error);
    } else {
      console.log(`[Stripe Webhook] Organisation skapad i Supabase, id=${data?.id}`);
    }
  } catch (err) {
    console.error("[Stripe Webhook] Oväntat fel vid Supabase-insert:", err);
  }

  // TODO: Send welcome email via SendGrid / Resend / etc.
  // For now, log the welcome message
  console.log(`[Stripe Webhook] 📧 Välkomstmail till ${email}: "Välkommen till pixdrift! Ditt konto för ${orgName} är redo. Logga in på https://app.bc.pixdrift.com"`);
}

// ---------------------------------------------------------------------------
// Middleware helper to capture raw body for Stripe webhook verification
// ---------------------------------------------------------------------------
function express_raw_middleware(req: Request, _res: Response, next: NextFunction) {
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    (req as any).rawBody = Buffer.concat(chunks);
    next();
  });
  req.on("error", next);
}

export default router;
