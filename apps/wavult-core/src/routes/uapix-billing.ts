import { Router, Request } from 'express'
import { Pool } from 'pg'
import crypto from 'crypto'

const router = Router()
const getDb = () => new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined } })

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || ''

// Stripe price IDs — create these in Stripe Dashboard then store in AWS SSM
// /wavult/prod/STRIPE_UAPIX_PRO_MONTHLY, etc.
const PLANS = {
  pro: {
    monthly: process.env.STRIPE_UAPIX_PRO_MONTHLY || 'price_uapix_pro_monthly',
    yearly: process.env.STRIPE_UAPIX_PRO_YEARLY || 'price_uapix_pro_yearly',
    calls_limit: 100000,
    price_monthly: 49,
    price_yearly: 39,
  },
  enterprise: {
    monthly: process.env.STRIPE_UAPIX_ENT_MONTHLY || 'price_uapix_enterprise_monthly',
    yearly: process.env.STRIPE_UAPIX_ENT_YEARLY || 'price_uapix_enterprise_yearly',
    calls_limit: 999999999,
    price_monthly: 299,
    price_yearly: 249,
  },
}

function parseToken(token: string) {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString())
  } catch {
    return null
  }
}

// GET /v1/uapix/billing/plans — public plan info
router.get('/v1/uapix/billing/plans', (_req, res) => {
  res.json({
    plans: [
      {
        id: 'free',
        name: 'Free',
        price_monthly: 0,
        price_yearly: 0,
        calls_limit: 1000,
        providers: 5,
        features: [
          '1,000 API calls/month',
          '5 providers',
          'Community support',
          'Usage analytics',
          '1 API key',
        ],
      },
      {
        id: 'pro',
        name: 'Pro',
        price_monthly: 49,
        price_yearly: 39,
        calls_limit: 100000,
        providers: 35,
        popular: true,
        features: [
          '100,000 API calls/month',
          'All 35+ providers',
          'Email support',
          'Advanced analytics',
          '10 API keys',
          'Rate limit bypass',
          'MCP ready',
        ],
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price_monthly: 299,
        price_yearly: 249,
        calls_limit: -1,
        providers: 35,
        features: [
          'Unlimited API calls',
          'All providers + custom',
          'Dedicated support',
          'SLA guarantee',
          'Unlimited API keys',
          'Custom rate limits',
          'SSO/SAML',
          'Audit logs',
          'On-premise option',
        ],
      },
    ],
  })
})

// POST /v1/uapix/billing/checkout — create Stripe Checkout session
router.post('/v1/uapix/billing/checkout', async (req, res) => {
  if (!STRIPE_KEY) {
    return res.status(503).json({ error: 'Stripe not configured', configured: false })
  }

  const rawToken = (req.headers['x-uapix-token'] || req.headers.authorization?.replace('Bearer ', '')) as string
  if (!rawToken) return res.status(401).json({ error: 'Unauthorized' })

  const customer = parseToken(rawToken)
  if (!customer) return res.status(401).json({ error: 'Invalid token' })

  const { plan = 'pro', billing = 'monthly' } = req.body
  const planConfig = PLANS[plan as keyof typeof PLANS]
  if (!planConfig) return res.status(400).json({ error: 'Invalid plan', valid_plans: Object.keys(PLANS) })

  try {
    const priceId = billing === 'yearly' ? planConfig.yearly : planConfig.monthly

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        mode: 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        success_url: 'https://uapix.com/portal/dashboard?upgraded=true',
        cancel_url: 'https://uapix.com/pricing',
        customer_email: customer.email,
        'metadata[customer_id]': customer.id,
        'metadata[plan]': plan,
        'metadata[billing]': billing,
        allow_promotion_codes: 'true',
      }),
    })

    const session = (await r.json()) as any
    if (!r.ok) return res.status(400).json({ error: session.error?.message || 'Stripe error' })

    console.log(`[uapix-billing] Checkout created: ${customer.id} → ${plan}/${billing}`)
    res.json({ checkout_url: session.url, session_id: session.id })
  } catch (err: any) {
    console.error('[uapix-billing] Checkout error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /v1/uapix/billing/portal — Stripe Customer Portal
router.post('/v1/uapix/billing/portal', async (req, res) => {
  if (!STRIPE_KEY) return res.status(503).json({ error: 'Stripe not configured' })

  const rawToken = req.headers['x-uapix-token'] as string
  if (!rawToken) return res.status(401).json({ error: 'Unauthorized' })

  const cust = parseToken(rawToken)
  if (!cust) return res.status(401).json({ error: 'Invalid token' })

  const db = getDb()
  try {
    const { rows } = await db.query(
      'SELECT stripe_customer_id FROM uapix_customers WHERE id=$1',
      [cust.id]
    )
    const customer = rows[0]
    if (!customer?.stripe_customer_id) {
      return res.status(404).json({ error: 'No billing account found. Upgrade first.' })
    }

    const r = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: customer.stripe_customer_id,
        return_url: 'https://uapix.com/portal/dashboard',
      }),
    })

    const portal = (await r.json()) as any
    if (!r.ok) return res.status(400).json({ error: portal.error?.message || 'Stripe portal error' })

    res.json({ portal_url: portal.url })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// ─── Stripe webhook signature verification ────────────────────────────────────
function verifyStripeSignature(req: Request, secret: string): boolean {
  const sig = req.headers['stripe-signature'] as string
  if (!sig) return false
  const raw = (req as any).rawBody as Buffer | undefined
  if (!raw) return false
  // Stripe signature format: t=<ts>,v1=<hmac>,...
  const parts: Record<string, string> = {}
  for (const pair of sig.split(',')) {
    const idx = pair.indexOf('=')
    if (idx > 0) parts[pair.slice(0, idx)] = pair.slice(idx + 1)
  }
  if (!parts.t || !parts.v1) return false
  const payload = `${parts.t}.${raw.toString('utf8')}`
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(parts.v1, 'hex'), Buffer.from(expected, 'hex'))
}

// POST /v1/uapix/billing/webhook — Stripe webhooks
// Register this URL in Stripe Dashboard: https://api.wavult.com/v1/uapix/billing/webhook
router.post('/v1/uapix/billing/webhook', async (req, res) => {
  const webhookSecret = process.env.STRIPE_UAPIX_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET
  if (webhookSecret) {
    if (!verifyStripeSignature(req, webhookSecret)) {
      console.warn('[uapix-billing] Stripe signature verification failed')
      return res.status(400).json({ error: 'Invalid Stripe signature' })
    }
  } else {
    console.warn('[uapix-billing] STRIPE_UAPIX_WEBHOOK_SECRET not set — skipping signature check')
  }

  let event: any
  try {
    const raw = (req as any).rawBody
    event = raw ? JSON.parse(raw.toString()) : (typeof req.body === 'string' ? JSON.parse(req.body) : req.body)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const db = getDb()
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const customerId = session.metadata?.customer_id
        const plan = session.metadata?.plan || 'pro'
        const stripeCustomerId = session.customer
        const limit = PLANS[plan as keyof typeof PLANS]?.calls_limit || 100000

        if (customerId) {
          await db.query(
            'UPDATE uapix_customers SET plan=$1, stripe_customer_id=$2, calls_limit=$3, updated_at=NOW() WHERE id=$4',
            [plan, stripeCustomerId, limit, customerId]
          )
          console.log(`[uapix-billing] Upgraded: ${customerId} → ${plan} (limit: ${limit})`)
        }
        break
      }

      case 'customer.subscription.updated': {
        // Handle plan changes via customer portal
        const sub = event.data.object
        const stripeCustomerId = sub.customer
        // Could map price IDs back to plan names here
        console.log(`[uapix-billing] Subscription updated: ${stripeCustomerId}`)
        break
      }

      case 'customer.subscription.deleted': {
        const stripeCustomerId = event.data.object.customer
        await db.query(
          "UPDATE uapix_customers SET plan='free', calls_limit=1000, stripe_customer_id=NULL, updated_at=NOW() WHERE stripe_customer_id=$1",
          [stripeCustomerId]
        )
        console.log(`[uapix-billing] Cancelled: ${stripeCustomerId} → free`)
        break
      }

      case 'invoice.payment_failed': {
        const stripeCustomerId = event.data.object.customer
        console.warn(`[uapix-billing] Payment failed: ${stripeCustomerId}`)
        // Could send email, flag account, etc.
        break
      }

      default:
        console.log(`[uapix-billing] Unhandled event: ${event.type}`)
    }
  } finally {
    await db.end()
  }

  res.json({ received: true })
})

export default router
