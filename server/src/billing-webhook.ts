/**
 * Lago webhook receiver
 * POST /api/webhooks/lago
 */
import { Router, Request, Response } from 'express'
import BillingService from './billing-lago'

export const billingWebhookRouter = Router()

billingWebhookRouter.post('/lago', async (req: Request, res: Response) => {
  try {
    const { webhook_type, ...payload } = req.body as { webhook_type: string; [key: string]: unknown }
    if (!webhook_type) {
      res.status(400).json({ ok: false, error: 'webhook_type required' })
      return
    }

    await BillingService.handleLagoWebhook(webhook_type, payload)
    res.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: msg })
  }
})
