/**
 * Wavult Ledger API v1
 * REST endpoints för Ledger Core
 */

import { Router } from 'express'
import LedgerService, { formatAmount, type Currency } from './ledger'

export const ledgerRouter = Router()

// GET /api/ledger/:orgId/trial-balance
ledgerRouter.get('/:orgId/trial-balance', async (req, res) => {
  try {
    const balance = await LedgerService.getTrialBalance(req.params.orgId)
    res.json({ ok: true, data: balance })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: message })
  }
})

// GET /api/ledger/:orgId/accounts/:code/balance
ledgerRouter.get('/:orgId/accounts/:code/balance', async (req, res) => {
  try {
    const { orgId, code } = req.params
    const asOf = req.query.asOf as string | undefined
    const balanceMinor = await LedgerService.getAccountBalance(orgId, code, asOf)
    const currency = (req.query.currency as Currency) ?? 'EUR'
    res.json({
      ok: true,
      data: {
        accountCode: code,
        balanceMinor,
        balanceFormatted: formatAmount(balanceMinor, currency),
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: message })
  }
})

// POST /api/ledger/entries
ledgerRouter.post('/entries', async (req, res) => {
  try {
    const result = await LedgerService.createEntry(req.body)
    res.status(201).json({ ok: true, data: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const status = message.includes('duplicate') ? 409 : 500
    res.status(status).json({ ok: false, error: message })
  }
})

// POST /api/ledger/entries/:id/post
ledgerRouter.post('/entries/:id/post', async (req, res) => {
  try {
    await LedgerService.postEntry(req.params.id)
    res.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(400).json({ ok: false, error: message })
  }
})

// POST /api/ledger/entries/:id/void
ledgerRouter.post('/entries/:id/void', async (req, res) => {
  try {
    const { reason } = req.body as { reason?: string }
    if (!reason) {
      res.status(400).json({ ok: false, error: 'reason required' })
      return
    }
    await LedgerService.voidEntry(req.params.id, reason)
    res.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(400).json({ ok: false, error: message })
  }
})

// POST /api/ledger/intercompany
ledgerRouter.post('/intercompany', async (req, res) => {
  try {
    const result = await LedgerService.createIntercompanyFlow(req.body)
    res.status(201).json({ ok: true, data: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const status = message.includes('duplicate') ? 409 : 500
    res.status(status).json({ ok: false, error: message })
  }
})

// GET /api/ledger/fx/:from/:to
ledgerRouter.get('/fx/:from/:to', async (req, res) => {
  try {
    const { from, to } = req.params
    const rate = await LedgerService.getFxRate(from as Currency, to as Currency)
    res.json({ ok: true, data: { from, to, rate } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(404).json({ ok: false, error: message })
  }
})
