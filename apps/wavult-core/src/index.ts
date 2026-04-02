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
import mediaApiRouter from './routes/media-api'
import berntRouter from './routes/bernt'
import intelligenceRouter from './routes/intelligence'
import apolloRouter from './routes/apollo'
import voiceRouter from './routes/voice'
import { testEmbedding } from './engines/embeddingEngine'
import { testVision } from './engines/visionEngine'
import ventureEngineRouter from './routes/venture-engine'
import whoopRouter from './routes/whoop'
import orgGraphRouter from './routes/org-graph'

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
app.use('/api/venture-engine', ventureEngineRouter)  // Venture Engine — capital allocation & tracking
app.use('/', revolutOAuthRouter)
app.use('/', healthMonitor)
app.use('/', quixzoomRouter)
app.use('/', flightsRouter)
app.use('/', twilioRouter)
app.use('/', aiApiRouter)
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
