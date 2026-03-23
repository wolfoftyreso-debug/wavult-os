import { Router } from 'express'
import BillingService from './billing-lago'

export const billingRouter = Router()

// POST /api/billing/sync-pending — Synka osynkade usage events till Lago
billingRouter.post('/sync-pending', async (req, res) => {
  try {
    const result = await BillingService.syncPendingEvents()
    res.json({ ok: true, data: result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: msg })
  }
})

// GET /api/billing/usage/:customerId — Hämta current usage för kund
billingRouter.get('/usage/:customerId', async (req, res) => {
  try {
    const usage = await BillingService.getCurrentUsage(req.params.customerId)
    res.json({ ok: true, data: usage })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: msg })
  }
})
