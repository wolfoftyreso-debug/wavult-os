import dgsRouter from './routes/decisions-governance'
import configRouter from './routes/config'
import agentSchedulerRouter from './routes/agent-scheduler'
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
import academyRouter from './routes/academy'
import taxAutomationRouter from './routes/tax-automation'
import deploymentsRouter from './routes/deployments'
import cockpitRouter from './routes/cockpit'
import systemAuditRouter from './routes/system-audit'
import okrRouter from './routes/okr'
import llmRouter from './routes/llm'
import { validateDbConfig } from './lib/db'

// ── Database Guard: blockerar cloud Supabase ──────────────────────────────────
// MIGRATION 2026-04-04: Cloud Supabase (znmxtnxxjpmgtycmsqjv.supabase.co) → egna RDS
// Kastar Error vid uppstart om SUPABASE_URL pekar mot cloud. Se lib/db.ts.
validateDbConfig()

const app = express()

// Security: Strip problematic headers to prevent crashes
app.use((req, _res, next) => {
  // Remove Origin from non-CORS contexts to prevent crashes
  if (req.path === '/health') delete req.headers['origin']
  next()
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
app.use('/', academyRouter)                     // Academy — ISO/compliance-kurser + kompetensmatris-koppling
app.use('/', okrRouter)                         // OKR — Google-modellen: Objectives, Key Results, Check-ins
app.use('/api/config', configRouter)
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
    engines: ['state', 'financial', 'fraud', 'event'],
    integrations: ['identity-core', 'revolut', 's3', 'rekognition', 'bernt', 'voice', 'nvidia-nim'],
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
import { runAllProactiveAgents } from './ai/agents/proactive'

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
