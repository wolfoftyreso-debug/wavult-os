/**
 * Wavult Payment Orchestrator API v1
 * Stripe-liknande endpoints
 */

import { Router } from 'express'
import PaymentOrchestrator, { type CreatePaymentIntentInput } from './payment-orchestrator'
import { toMinor, type Currency } from './ledger'

export const paymentRouter = Router()

// POST /api/payments/intents — Skapa PaymentIntent
paymentRouter.post('/intents', async (req, res) => {
  try {
    const {
      orgId,
      amount,           // decimal (100.00)
      amountMinor,      // eller direkt i minor units
      currency,
      description,
      reference,
      customerId,
      fromAccountCode,
      toAccountCode,
      idempotencyKey,
      metadata,
    } = req.body as {
      orgId?: string
      amount?: string | number
      amountMinor?: string | number
      currency?: string
      description?: string
      reference?: string
      customerId?: string
      fromAccountCode?: string
      toAccountCode?: string
      idempotencyKey?: string
      metadata?: Record<string, unknown>
    }

    if (!orgId || !currency || !description) {
      return res.status(400).json({ ok: false, error: 'orgId, currency, description required' })
    }

    const minor = amountMinor
      ? Number(amountMinor)
      : toMinor(Number(amount), currency as Currency)

    if (!minor || minor <= 0) {
      return res.status(400).json({ ok: false, error: 'amount or amountMinor required (> 0)' })
    }

    const input: CreatePaymentIntentInput = {
      orgId,
      amountMinor: minor,
      currency: currency as Currency,
      description,
      reference,
      customerId,
      fromAccountCode,
      toAccountCode,
      idempotencyKey: idempotencyKey ?? req.headers['idempotency-key'] as string | undefined,
      metadata,
    }

    const intent = await PaymentOrchestrator.createIntent(input)
    res.status(201).json({ ok: true, data: intent })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const status = msg.includes('duplicate') || msg.includes('unique') ? 409 : 500
    res.status(status).json({ ok: false, error: msg })
  }
})

// POST /api/payments/intents/:id/process — Skicka till PSP
paymentRouter.post('/intents/:id/process', async (req, res) => {
  try {
    const intent = await PaymentOrchestrator.processIntent(req.params.id)
    res.json({ ok: true, data: intent })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(400).json({ ok: false, error: msg })
  }
})

// POST /api/payments/intents/:id/capture
paymentRouter.post('/intents/:id/capture', async (req, res) => {
  try {
    const intent = await PaymentOrchestrator.captureIntent(req.params.id)
    res.json({ ok: true, data: intent })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(400).json({ ok: false, error: msg })
  }
})

// POST /api/payments/intents/:id/settle
paymentRouter.post('/intents/:id/settle', async (req, res) => {
  try {
    const intent = await PaymentOrchestrator.settleIntent(req.params.id)
    res.json({ ok: true, data: intent })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(400).json({ ok: false, error: msg })
  }
})

// GET /api/payments/intents/:id/events — Audit log
paymentRouter.get('/intents/:id/events', async (req, res) => {
  try {
    const events = await PaymentOrchestrator.getEvents(req.params.id)
    res.json({ ok: true, data: events })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: msg })
  }
})

// GET /api/payments/:orgId/intents — Lista intents per org
paymentRouter.get('/:orgId/intents', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50
    const intents = await PaymentOrchestrator.listIntents(req.params.orgId, limit)
    res.json({ ok: true, data: intents, count: intents.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: msg })
  }
})

// GET /api/payments/:orgId/summary
paymentRouter.get('/:orgId/summary', async (req, res) => {
  try {
    const summary = await PaymentOrchestrator.getSummary(req.params.orgId)
    res.json({ ok: true, data: summary })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: msg })
  }
})
