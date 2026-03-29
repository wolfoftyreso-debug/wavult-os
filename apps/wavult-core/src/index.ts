import express from 'express'
import { taskRouter } from './routes/tasks'
import { paymentRouter } from './routes/payments'
import { payoutRouter } from './routes/payouts'

const app = express()
app.use(express.json({ limit: '10mb' }))

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  next()
})

// Routes
app.use('/v1/task', taskRouter)
app.use('/v1/payment', paymentRouter)
app.use('/v1/payout', payoutRouter)

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'wavult-core',
    version: '1.0.0',
    engines: ['state', 'financial', 'fraud', 'event'],
  })
})

// Enforcement: catch unhandled
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }))

const PORT = parseInt(process.env.PORT || '3007')
app.listen(PORT, () => {
  console.log(`[Wavult Core] Listening on port ${PORT}`)
  console.log(`[Wavult Core] Engines: state + financial + fraud + event`)
})
