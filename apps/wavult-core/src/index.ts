import oauthRouter from './routes/oauth'                  // OAuth SSO — Google, Microsoft, GitHub, Apple
import beeIdeasRouter from './routes/bee-ideas'          // Apifly Bee — 1000 idéer + live AI generation
import apiflyRouter from './routes/apifly'              // Apifly — kundbackend + proxy
import uapixBillingRouter from './routes/uapix-billing'  // UAPIX — Stripe billing (checkout, portal, webhooks)
import uapixCustomersRouter from './routes/uapix-customers'  // UAPIX — Customer auth, keys, usage, proxy
import apiflyBillingRouter from './routes/apifly-billing' // Apifly — Stripe billing (checkout, portal, webhooks)
import apiflyAuthRouter from './routes/apifly-auth'       // Apifly — BankID + Phone OTP auth
import paymentsExtendedRouter from './routes/payments-extended'
import paymentsBnplRouter from './routes/payments-bnpl'          // Klarna + Swish
import aiVideoRouter from './routes/ai-video'                    // Stability + Runway + Groq
import analyticsRouter from './routes/analytics'                  // Mixpanel + Hunter + Clearbit
import legalSignRouter from './routes/legal-sign'                 // Scrive e-signering
import monitoringRouter from './routes/monitoring'                // Sentry + DataDog
import mediaExtendedRouter from './routes/media-extended'
import commsRouter from './routes/comms'
import perplexityRouter from './routes/perplexity'
import mapsRouter from './routes/maps'
import dgsRouter from './routes/decisions-governance'
import configRouter from './routes/config'
import agentSchedulerRouter from './routes/agent-scheduler'
import aeroProxyRouter from './routes/aero-proxy'   // AEAN — wavult-aero proxy (/v1/aero/*)
import express from 'express'
import rateLimit from 'express-rate-limit'
import { taskRouter } from './routes/tasks'
import { paymentRouter } from './routes/payments'
import { payoutRouter } from './routes/payouts'
import revolutOAuthRouter from './routes/revolut-oauth'
import healthMonitor from './routes/health-monitor'
import quixzoomRouter from './routes/quixzoom'
import flightsRouter from './routes/flights'
import twilioRouter from './routes/twilio'
import aiApiRouter from './routes/ai-api'
import agentsRouter from './routes/agents'
import mediaApiRouter from './routes/media-api'
import berntRouter from './routes/bernt'
import intelligenceRouter from './routes/intelligence'
import apolloRouter from './routes/apollo'
import voiceRouter from './routes/voice'
import { testEmbedding } from './engines/embeddingEngine'
import { testVision } from './engines/visionEngine'
import ventureEngineRouter from './routes/venture-engine'
import corpfittRouter from './routes/corpfitt'
import whoopRouter from './routes/whoop'
import orgGraphRouter from './routes/org-graph'
import revolutPaymentRouter from './routes/revolut-payment'
import accountsRouter from './routes/accounts'
import procurementRouter from './routes/procurement'
import decisionsRouter from './routes/decisions'
import mediaRouter from './routes/media'
import accountingRouter from './routes/accounting'
import auditRouter from './routes/audit'
import taxRouter from './routes/tax-integration'
import visaRouter from './routes/visa'
import qmsRouter from './routes/qms'
import tuvRouter from './routes/tuv'
import academyRouter from './routes/academy'
import taxAutomationRouter from './routes/tax-automation'
import deploymentsRouter from './routes/deployments'
import cockpitRouter from './routes/cockpit'
import systemAuditRouter from './routes/system-audit'
import okrRouter from './routes/okr'
import llmRouter from './routes/llm'
import rtmRouter from './routes/rtm'
import jurisdictionRouter from './routes/jurisdiction'
import travelRouter from './routes/travel'
import campaignRouter from './routes/campaign'
import { validateDbConfig } from './lib/db'
import { supabaseCloudWriteGuard } from './middleware/supabase-guard'

// ── Database Guard: blockerar cloud Supabase ──────────────────────────────────
// MIGRATION 2026-04-04: Cloud Supabase (znmxtnxxjpmgtycmsqjv.supabase.co) → egna RDS
// Kastar Error vid uppstart om SUPABASE_URL pekar mot cloud. Se lib/db.ts.
validateDbConfig()

// Supabase Cloud Shutdown Check
const SUPABASE_URL_CHECK = process.env.SUPABASE_URL || ''
if (SUPABASE_URL_CHECK.includes('supabase.co') && !SUPABASE_URL_CHECK.includes('supabase.wavult.com')) {
  console.error('🚨🚨🚨 KRITISK KONFIGURATIONSFEL 🚨🚨🚨')
  console.error('🚨 SUPABASE_URL pekar mot CLOUD-INSTANS som ska avvecklas!')
  console.error(`🚨 Nuvarande: ${SUPABASE_URL_CHECK}`)
  console.error('🚨 Korrekt:   http://supabase.wavult.com')
  // Kraschar inte — loggar tydligt och blockerar skrivningar via middleware
}

const app = express()

// ── Supabase Cloud Write Block ────────────────────────────────────────────────
// Beslut: Erik Svensson 2026-04-04 09:00 — cloud Supabase avvecklas ikväll
app.use(supabaseCloudWriteGuard())

// Security: Strip problematic headers to prevent crashes
app.use((req, _res, next) => {
  // Remove Origin from non-CORS contexts to prevent crashes
  if (req.path === '/health') delete req.headers['origin']
  next()
})

// Preserve raw body for Stripe webhook signature verification
app.use((req, res, next) => {
  if (req.path.includes('/billing/webhook') || req.path.includes('/revolut/webhook') || req.path.includes('/payments/webhook')) {
    express.raw({ type: 'application/json', limit: '1mb' })(req, res, (err) => {
      if (err) return next(err)
      ;(req as any).rawBody = req.body
      // Re-parse for route handlers
      if (Buffer.isBuffer(req.body)) {
        try { req.body = JSON.parse(req.body.toString()) } catch { /* keep as buffer */ }
      }
      next()
    })
  } else {
    next()
  }
})
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))

// Security headers — ALL responses
app.use((_req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.removeHeader('X-Powered-By')
  next()
})

// Health endpoint rate limiter
const healthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many health check requests' },
})

// Routes
app.use('/', oauthRouter)                // OAuth SSO — Google, Microsoft, GitHub, Apple
app.use('/', beeIdeasRouter)             // Apifly Bee — 1000 kreativa idéer + live Perplexity/OpenAI
app.use('/', apiflyRouter)               // Apifly — kundbackend + universal API proxy
app.use('/', uapixBillingRouter)         // UAPIX billing — Stripe checkout, portal, webhook, plans
app.use('/', uapixCustomersRouter)      // UAPIX customers — auth, keys, usage, proxy, admin
app.use('/', apiflyBillingRouter)        // Apifly billing — Stripe checkout, portal, webhook, plans
app.use('/', apiflyAuthRouter)           // Apifly auth — BankID + Phone OTP
app.use('/', paymentsExtendedRouter)    // Stripe + BankSign extended
app.use('/', paymentsBnplRouter)        // Klarna + Swish BNPL
app.use('/', aiVideoRouter)             // Stability AI + Runway + Groq
app.use('/', analyticsRouter)           // Mixpanel + Hunter + Clearbit
app.use('/', legalSignRouter)           // Scrive e-signering
app.use('/', monitoringRouter)          // Sentry + DataDog
app.use('/', mediaExtendedRouter)       // Pexels + Coverr media
app.use('/', commsRouter)               // Resend email + Telegram
app.use('/', perplexityRouter)          // Perplexity AI search
app.use('/', mapsRouter)                // Mapbox geocoding
app.use('/', aeroProxyRouter)           // AEAN — wavult-aero control plane proxy (/v1/aero/*)
app.use('/v1/task', taskRouter)
app.use('/v1/payment', paymentRouter)
app.use('/v1/payout', payoutRouter)
app.use('/v1/bernt', berntRouter)       // OpenClaw/Bernt integration
app.use(intelligenceRouter)             // Intelligence Dashboard (Semrush + signals)
app.use(apolloRouter)                   // Apollo B2B account intelligence
app.use('/voice', voiceRouter)          // Bernt röst-agent (46elks + Whisper + ElevenLabs)
app.use('/whoop', whoopRouter)          // WHOOP integration — recovery, sleep, strain
app.use('/api/procurement', procurementRouter)       // Procurement — suppliers, POs, contracts, approvals
app.use('/api/venture-engine', ventureEngineRouter)  // Venture Engine — capital allocation & tracking
app.use('/api/corpfitt', corpfittRouter)              // CorpFitt — global fitness access platform
app.use('/api/decisions', decisionsRouter)           // Decisions — meetings + decision blocks
app.use('/api/media', mediaRouter)                   // Media — campaigns, channels, audiences
app.use('/api/revolut', revolutPaymentRouter)   // Payment initiation + webhook
app.use('/api/intelligence', intelligenceRouter)
app.use('/api/accounting', accountingRouter)
app.use('/api/audit-log', auditRouter)
app.use('/api/tax', taxRouter)             // Tax Integration — SE moms/AGD, UAE VAT, LT VMI, deadline calendar
app.use('/', visaRouter)                   // Visa & Travel Documents — applications, members, deadlines
app.use('/api/tax-automation', taxAutomationRouter)
app.use('/api/deployments', deploymentsRouter)   // Deployment gate — two-step approval, version history, rollback
app.use('/api/cockpit', cockpitRouter)           // Cockpit — live metrics: latency, Gitea, DB, Cloudflare
app.use('/v1/system', systemAuditRouter)        // System Audit — parallella health-checks, healthScore
app.use('/', llmRouter)                         // Intern LLM-gateway — Llama 4 Scout via Ollama
app.use('/', qmsRouter)                         // QMS — ISO 9001/27001/GDPR/NIS2 compliance tracking
app.use('/', tuvRouter)                         // TÜV Rheinland Audit — sessions, suppliers, sprint
app.use('/', rtmRouter)                         // RTM — Release to Manufacturing gate
app.use('/', jurisdictionRouter)                // Jurisdiction — Legal Boundary Intelligence per marknad
app.use('/', academyRouter)                     // Academy — ISO/compliance-kurser + kompetensmatris-koppling
app.use('/', okrRouter)                         // OKR — Google-modellen: Objectives, Key Results, Check-ins
app.use('/api/config', configRouter)
app.use('/', travelRouter)              // Travel — trip management
app.use('/', campaignRouter)            // Campaign OS — activities, budgets, KPIs
app.use('/api/dgs', dgsRouter)
app.use('/', accountsRouter)                    // Customer account ledger + invoice spool file
app.use('/', revolutOAuthRouter)
app.use('/', healthMonitor)
app.use('/', quixzoomRouter)
app.use('/', flightsRouter)
app.use('/', twilioRouter)
app.use('/', aiApiRouter)
app.use('/', agentsRouter)              // Agent Mesh — 10 expert agents med intelligent routing
app.use(agentSchedulerRouter)           // Proactive Agent Engine — autonoma agenter (scheduler + actions + goals)
app.use('/', mediaApiRouter)

// NVIDIA NIM — status endpoint
app.get('/api/nvidia/status', async (_req, res) => {
  const [embed, vision] = await Promise.allSettled([testEmbedding(), testVision()])
  res.json({
    nvidia_key: !!process.env.NVIDIA_API_KEY,
    embedding: embed.status === 'fulfilled' ? embed.value : { ok: false },
    vision: vision.status === 'fulfilled' ? vision.value : { ok: false },
    models: {
      reasoning: 'nvidia/llama-3.3-nemotron-super-49b-v1',
      embedding: 'nvidia/nv-embedqa-e5-v5',
      vision: 'meta/llama-3.2-11b-vision-instruct',
      safety: 'nvidia/llama-3.1-nemotron-safety-guard-8b-v3',
    },
  })
})

// Health — rate limited
app.get('/health', healthLimiter, (_req, res) => {
  res.json({
    status: 'ok',
    service: 'wavult-core',
    version: '2.0.0',
    providers: {
      ai: {
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        deepseek: !!process.env.DEEPSEEK_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        nvidia: !!process.env.NVIDIA_API_KEY,
        perplexity: !!process.env.PERPLEXITY_API_KEY,
        groq: !!process.env.GROQ_API_KEY,
        stability: !!process.env.STABILITY_API_KEY,
        runway: !!process.env.RUNWAY_API_KEY,
        sora: !!process.env.SORA_API_KEY,
        veo3: !!process.env.VEO3_API_KEY,
      },
      payments: {
        revolut: !!process.env.REVOLUT_CLIENT_ID,
        stripe: !!process.env.STRIPE_SECRET_KEY,
        klarna: !!process.env.KLARNA_API_KEY,
        swish: !!process.env.SWISH_PAYEE_NUMBER,
      },
      communications: {
        elevenlabs: !!process.env.ELEVENLABS_API_KEY,
        '46elks': !!process.env.FORTYSIX_ELKS_USERNAME,
        twilio: !!process.env.TWILIO_ACCOUNT_SID,
        resend: !!process.env.RESEND_API_KEY,
        telegram: !!process.env.TELEGRAM_BOT_TOKEN,
      },
      data: {
        apollo: !!process.env.APOLLO_API_KEY,
        whoop: !!process.env.WHOOP_CLIENT_ID,
        mixpanel: !!process.env.MIXPANEL_TOKEN,
        hunter: !!process.env.HUNTER_API_KEY,
        clearbit: !!process.env.CLEARBIT_API_KEY,
        ga4: !!process.env.GA4_MEASUREMENT_ID,
      },
      media: {
        pexels: !!process.env.PEXELS_API_KEY,
        coverr: !!process.env.COVERR_API_KEY,
        mapbox: !!process.env.MAPBOX_PUBLIC_TOKEN,
        duffel: !!process.env.DUFFEL_ACCESS_TOKEN,
        d_id: !!process.env.DID_API_KEY,
        shotstack: !!process.env.SHOTSTACK_PRODUCTION_KEY,
      },
      legal: {
        scrive: !!process.env.SCRIVE_API_TOKEN,
        docusign: !!process.env.DOCUSIGN_ACCESS_TOKEN,
      },
      monitoring: {
        sentry: !!process.env.SENTRY_DSN,
        datadog: !!process.env.DATADOG_API_KEY,
        pagerduty: !!process.env.PAGERDUTY_KEY,
      },
    },
  })
})

// Enforcement: catch unhandled
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }))

const PORT = parseInt(process.env.PORT || '3007')
app.listen(PORT, () => {
  console.log(`[Wavult Core] Listening on port ${PORT}`)
  console.log(`[Wavult Core] Engines: state + financial + fraud + event`)
})

// ─── Proactive Agent Scheduler ────────────────────────────────────────────────
// Kör alla agenter var 6:e timme + en gång vid uppstart (30s delay)
import { runAllProactiveAgents, runWeeklyAudit } from './ai/agents/proactive'

setInterval(async () => {
  console.log('[scheduler] Running proactive agents...')
  try {
    await runAllProactiveAgents()
  } catch (e) {
    console.error('[scheduler] Agent run failed:', e)
  }
}, 6 * 60 * 60 * 1000) // 6h

setTimeout(async () => {
  console.log('[scheduler] Initial proactive agent run...')
  try {
    await runAllProactiveAgents()
  } catch (e) {
    console.error('[scheduler] Initial agent run failed:', e)
  }
}, 30_000)

// ─── Veckovis Revision — varje måndag 06:00 ──────────────────────────────────
function scheduleWeeklyAudit() {
  const now = new Date()
  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7))
  nextMonday.setHours(6, 0, 0, 0)
  const msToMonday = nextMonday.getTime() - now.getTime()

  setTimeout(() => {
    runWeeklyAudit().catch(console.error)
    setInterval(() => runWeeklyAudit().catch(console.error), 7 * 24 * 60 * 60 * 1000)
  }, msToMonday)

  console.log(`[scheduler] Weekly audit scheduled: next run ${nextMonday.toISOString()}`)
}
scheduleWeeklyAudit()
