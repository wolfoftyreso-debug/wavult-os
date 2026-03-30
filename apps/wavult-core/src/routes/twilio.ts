import { Router, Request, Response } from 'express'
import { requireAuth, requireRole } from '../middleware/requireAuth'

const router = Router()
router.use(requireAuth, requireRole('admin'))

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || ''
  const authToken = process.env.TWILIO_AUTH_TOKEN || ''
  if (!accountSid || !authToken) throw new Error('Twilio credentials not configured')
  // Dynamic import to avoid bundle issues
  const Twilio = require('twilio')
  return new Twilio(accountSid, authToken)
}

// GET /v1/twilio/numbers/available — list available US numbers to purchase
router.get('/v1/twilio/numbers/available', async (req: Request, res: Response) => {
  try {
    const client = getTwilioClient()
    const { area_code = '212', limit = 10 } = req.query

    const numbers = await client.availablePhoneNumbers('US')
      .local
      .list({ areaCode: String(area_code), limit: Number(limit) })

    return res.json(numbers.map((n: any) => ({
      number: n.phoneNumber,
      friendly: n.friendlyName,
      region: n.region,
      locality: n.locality,
      capabilities: n.capabilities,
    })))
  } catch (err) {
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// POST /v1/twilio/numbers/purchase
// Body: { phone_number, friendly_name }
router.post('/v1/twilio/numbers/purchase', async (req: Request, res: Response) => {
  const { phone_number, friendly_name } = req.body
  if (!phone_number) return res.status(400).json({ error: 'phone_number required' })

  try {
    const client = getTwilioClient()
    const number = await client.incomingPhoneNumbers.create({
      phoneNumber: phone_number,
      friendlyName: friendly_name || phone_number,
    })
    return res.status(201).json({
      sid: number.sid,
      phone_number: number.phoneNumber,
      friendly_name: number.friendlyName,
    })
  } catch (err) {
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// GET /v1/twilio/numbers — list purchased numbers
router.get('/v1/twilio/numbers', async (_req: Request, res: Response) => {
  try {
    const client = getTwilioClient()
    const numbers = await client.incomingPhoneNumbers.list({ limit: 20 })
    return res.json(numbers.map((n: any) => ({
      sid: n.sid,
      phone_number: n.phoneNumber,
      friendly_name: n.friendlyName,
      capabilities: n.capabilities,
    })))
  } catch (err) {
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// POST /v1/twilio/sms/send
// Body: { to, from, body }
router.post('/v1/twilio/sms/send', async (req: Request, res: Response) => {
  const { to, from, body } = req.body
  if (!to || !body) return res.status(400).json({ error: 'to and body required' })

  try {
    const client = getTwilioClient()
    const msg = await client.messages.create({ to, from, body })
    return res.json({ sid: msg.sid, status: msg.status })
  } catch (err) {
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export default router
