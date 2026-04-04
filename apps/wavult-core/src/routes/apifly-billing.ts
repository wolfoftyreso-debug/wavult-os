import { Router, Request } from 'express'
import { Pool } from 'pg'
import crypto from 'crypto'

const router = Router()
const getDb = () => new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || ''

// Stripe price IDs — create in Stripe Dashboard (SEK currency)
// Store via: aws ssm put-parameter --name '/wavult/prod/STRIPE_APIFLY_STARTER' --value 'price_xxx' --type SecureString
const PLANS = {
  starter: {
    monthly: process.env.STRIPE_APIFLY_STARTER || 'price_apifly_starter_monthly',
    yearly: process.env.STRIPE_APIFLY_STARTER_YEARLY || 'price_apifly_starter_yearly',
    price_monthly_sek: 899,
    price_yearly_sek: 749,
    requests_limit: 50000,
    endpoints: 100,
  },
  pro: {
    monthly: process.env.STRIPE_APIFLY_PRO || 'price_apifly_pro_monthly',
    yearly: process.env.STRIPE_APIFLY_PRO_YEARLY || 'price_apifly_pro_yearly',
    price_monthly_sek: 2999,
    price_yearly_sek: 2499,
    requests_limit: 500000,
    endpoints: -1, // unlimited
  },
  enterprise: {
    monthly: process.env.STRIPE_APIFLY_ENT || 'price_apifly_enterprise_monthly',
    yearly: process.env.STRIPE_APIFLY_ENT_YEARLY || 'price_apifly_enterprise_yearly',
    price_monthly_sek: 9999,
    price_yearly_sek: 8499,
    requests_limit: -1,
    endpoints: -1,
  },
}

function parseToken(token: string) {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString())
  } catch {
    return null
  }
}

// GET /v1/apifly/billing/plans — public plan info
router.get('/v1/apifly/billing/plans', (_req, res) => {
  res.json({
    currency: 'SEK',
    plans: [
      {
        id: 'free',
        name: 'Free',
        price_monthly_sek: 0,
        price_yearly_sek: 0,
        requests_limit: 5000,
        endpoints: 20,
        features: [
          '5,000 requests/month',
          '20 endpoints',
          'Shared infrastructure',
          'Community support',
          'Basic analytics',
          '1 project',
        ],
      },
      {
        id: 'starter',
        name: 'Starter',
        price_monthly_sek: 899,
        price_yearly_sek: 749,
        requests_limit: 50000,
        endpoints: 100,
        features: [
          '50,000 requests/month',
          '100 endpoints',
          'Priority routing',
          'Email support',
          'Advanced analytics',
          '5 projects',
          'Custom domains',
        ],
      },
      {
        id: 'pro',
        name: 'Pro',
        price_monthly_sek: 2999,
        price_yearly_sek: 2499,
        requests_limit: 500000,
        endpoints: -1,
        popular: true,
        features: [
          '500,000 requests/month',
          'Unlimited endpoints',
          'Dedicated routing',
          'Slack support',
          'Real-time analytics',
          'Unlimited projects',
          'Custom domains',
          'Webhook transforms',
          'Rate limit control',
        ],
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price_monthly_sek: 9999,
        price_yearly_sek: 8499,
        requests_limit: -1,
        endpoints: -1,
        features: [
          'Unlimited requests',
          'Unlimited endpoints',
          'Dedicated infrastructure',
          'Dedicated account manager',
          'Custom SLA',
          'Unlimited projects',
          'SSO/SAML',
          'Audit logs',
          'On-premise option',
          'Custom integrations',
          'Priority support 24/7',
        ],
      },
    ],
  })
})

// POST /v1/apifly/billing/checkout — create Stripe Checkout session
router.post('/v1/apifly/billing/checkout', async (req, res) => {
  if (!STRIPE_KEY) {
    return res.status(503).json({ error: 'Stripe not configured', configured: false })
  }

  const rawToken = (req.headers['x-apifly-token'] || req.headers.authorization?.replace('Bearer ', '')) as string
  if (!rawToken) return res.status(401).json({ error: 'Unauthorized' })

  const customer = parseToken(rawToken)
  if (!customer) return res.status(401).json({ error: 'Invalid token' })

  const { plan = 'starter', billing = 'monthly' } = req.body
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
        success_url: 'https://apifly.se/portal?upgraded=true',
        cancel_url: 'https://apifly.se/pricing',
        customer_email: customer.email,
        'metadata[customer_id]': customer.id,
        'metadata[plan]': plan,
        'metadata[billing]': billing,
        allow_promotion_codes: 'true',
      }),
    })

    const session = (await r.json()) as any
    if (!r.ok) return res.status(400).json({ error: session.error?.message || 'Stripe error' })

    console.log(`[apifly-billing] Checkout created: ${customer.id} → ${plan}/${billing}`)
    res.json({ checkout_url: session.url, session_id: session.id })
  } catch (err: any) {
    console.error('[apifly-billing] Checkout error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /v1/apifly/billing/portal — Stripe Customer Portal
router.post('/v1/apifly/billing/portal', async (req, res) => {
  if (!STRIPE_KEY) return res.status(503).json({ error: 'Stripe not configured' })

  const rawToken = req.headers['x-apifly-token'] as string
  if (!rawToken) return res.status(401).json({ error: 'Unauthorized' })

  const cust = parseToken(rawToken)
  if (!cust) return res.status(401).json({ error: 'Invalid token' })

  const db = getDb()
  try {
    const { rows } = await db.query(
      'SELECT stripe_customer_id FROM apifly_customers WHERE id=$1',
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
        return_url: 'https://apifly.se/portal',
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

// POST /v1/apifly/billing/webhook — Stripe webhooks
// Register: https://api.wavult.com/v1/apifly/billing/webhook
router.post('/v1/apifly/billing/webhook', async (req, res) => {
  const webhookSecret = process.env.STRIPE_APIFLY_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET
  if (webhookSecret) {
    if (!verifyStripeSignature(req, webhookSecret)) {
      console.warn('[apifly-billing] Stripe signature verification failed')
      return res.status(400).json({ error: 'Invalid Stripe signature' })
    }
  } else {
    console.warn('[apifly-billing] STRIPE_APIFLY_WEBHOOK_SECRET not set — skipping signature check')
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
        const plan = session.metadata?.plan || 'starter'
        const stripeCustomerId = session.customer
        const planConfig = PLANS[plan as keyof typeof PLANS]
        const requestsLimit = planConfig?.requests_limit ?? 50000

        if (customerId) {
          await db.query(
            'UPDATE apifly_customers SET plan=$1, stripe_customer_id=$2, requests_limit=$3, updated_at=NOW() WHERE id=$4',
            [plan, stripeCustomerId, requestsLimit, customerId]
          )
          console.log(`[apifly-billing] Upgraded: ${customerId} → ${plan} (limit: ${requestsLimit})`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const stripeCustomerId = event.data.object.customer
        await db.query(
          "UPDATE apifly_customers SET plan='free', requests_limit=5000, stripe_customer_id=NULL, updated_at=NOW() WHERE stripe_customer_id=$1",
          [stripeCustomerId]
        )
        console.log(`[apifly-billing] Cancelled: ${stripeCustomerId} → free`)
        break
      }

      case 'invoice.payment_failed': {
        const stripeCustomerId = event.data.object.customer
        console.warn(`[apifly-billing] Payment failed: ${stripeCustomerId}`)
        break
      }

      default:
        console.log(`[apifly-billing] Unhandled event: ${event.type}`)
    }
  } finally {
    await db.end()
  }

  res.json({ received: true })
})

export default router
