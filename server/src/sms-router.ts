// ─── Quick SMS route for CommHub ──────────────────────────────────────────────
import { Router } from 'express'
const smsQuickRouter = Router()

smsQuickRouter.post('/api/sms/send', async (req, res) => {
  const { to, message, from: sender } = req.body
  if (!to || !message) return res.status(400).json({ error: 'to and message required' })
  
  const username = process.env.FORTYSIX_ELKS_USERNAME
  const password = process.env.FORTYSIX_ELKS_PASSWORD
  if (!username || !password) return res.status(503).json({ error: '46elks not configured' })
  
  try {
    const params = new URLSearchParams({
      from: sender || 'Wavult',
      to,
      message,
    })
    const creds = Buffer.from(`${username}:${password}`).toString('base64')
    const resp = await fetch('https://api.46elks.com/a1/sms', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })
    const data = await resp.json()
    if (!resp.ok) return res.status(400).json({ error: data.message || 'SMS failed' })
    return res.json({ ok: true, id: data.id, status: data.status })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

export { smsQuickRouter }
