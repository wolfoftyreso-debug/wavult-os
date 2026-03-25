import { Router } from 'express'
import PayoutEngine from './payout-engine'

export const payoutRouter = Router()

// POST /api/payouts/mission/:missionId — Trigga payout för uppdrag
payoutRouter.post('/mission/:missionId', async (req, res) => {
  try {
    const result = await PayoutEngine.triggerMissionPayout(req.params.missionId)
    res.json({ ok: true, data: result })
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
})

// GET /api/payouts/photographer/:photographerId — Fotografens intjäning
payoutRouter.get('/photographer/:photographerId', async (req, res) => {
  try {
    const earnings = await PayoutEngine.getPhotographerEarnings(req.params.photographerId)
    res.json({ ok: true, data: earnings })
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
})

// GET /api/payouts/platform/:orgId — Plattformsintjäning
payoutRouter.get('/platform/:orgId', async (req, res) => {
  try {
    const earnings = await PayoutEngine.getPlatformEarnings(req.params.orgId)
    res.json({ ok: true, data: earnings })
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
})
