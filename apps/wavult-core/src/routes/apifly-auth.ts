// ─── Apifly Auth — BankID + Phone OTP + Google OAuth + Email ──────────────────
// BankID: koppla in provider (Signicat/Freja) när avtal finns — interfacet är klart
// Phone:  46elks SMS OTP — fungerar direkt med credentials i env
// Google: se oauth.ts — redan implementerat
// Email:  se apifly.ts — /v1/apifly/auth/login

import { Router } from 'express'
import { Pool } from 'pg'

const router = Router()
const getDb = () => new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

// In-memory OTP store (byt till Redis i produktion för multi-instance)
const otpStore = new Map<string, { otp: string; phone: string; expires: number; attempts: number }>()

// ─── BankID ───────────────────────────────────────────────────────────────────

// POST /v1/apifly/auth/bankid/init — starta BankID-autentisering
router.post('/v1/apifly/auth/bankid/init', async (req, res) => {
  const BANKID_API = process.env.BANKID_API_URL  // t.ex. Signicat endpoint
  const BANKID_KEY = process.env.BANKID_API_KEY

  if (!BANKID_API || !BANKID_KEY) {
    // BankID ej konfigurerat — returnera pending-mode, frontend visar info
    return res.json({
      status: 'demo',
      message: 'BankID-integration aktiveras när avtal med BankID RP/Signicat är signerat.',
      session_id: null,
      qr_code: null,
    })
  }

  const { personal_number } = req.body  // Valfritt — om tomt öppnas QR-flöde

  try {
    const r = await fetch(`${BANKID_API}/v6/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BANKID_KEY}`,
      },
      body: JSON.stringify({
        endUserIp: req.ip,
        ...(personal_number ? { personalNumber: personal_number.replace(/\D/g, '') } : {}),
      }),
    })
    const data = await r.json() as any
    res.json({
      status: 'pending',
      session_id: data.orderRef,
      qr_code: data.qrStartToken,         // För QR-flöde
      auto_start_token: data.autoStartToken, // För direkt app-länk
    })
  } catch (err: any) {
    res.status(503).json({ error: 'BankID tillfälligt otillgängligt', detail: err.message })
  }
})

// GET /v1/apifly/auth/bankid/collect/:sessionId — kolla BankID-status (polling)
router.get('/v1/apifly/auth/bankid/collect/:sessionId', async (req, res) => {
  const BANKID_API = process.env.BANKID_API_URL
  const BANKID_KEY = process.env.BANKID_API_KEY

  if (!BANKID_API) {
    return res.json({ status: 'demo', hint: 'BankID ej konfigurerat' })
  }

  try {
    const r = await fetch(`${BANKID_API}/v6/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BANKID_KEY}`,
      },
      body: JSON.stringify({ orderRef: req.params.sessionId }),
    })
    const data = await r.json() as any

    if (data.status === 'complete') {
      const { personalNumber, name, givenName, surname } = data.completionData?.user || {}
      const email = `${personalNumber}@bankid.verified`

      const db = getDb()
      try {
        const { rows: [customer] } = await db.query(
          `INSERT INTO apifly_customers (email, name, status, tokens_remaining)
           VALUES ($1, $2, 'active', 5000)
           ON CONFLICT (email) DO UPDATE
             SET name = COALESCE(EXCLUDED.name, apifly_customers.name),
                 updated_at = NOW()
           RETURNING id, email, name, plan`,
          [email, name || `${givenName} ${surname}`]
        )
        const token = Buffer.from(JSON.stringify({
          id: customer.id,
          email: customer.email,
          name: customer.name,
          provider: 'bankid',
          personal_number: personalNumber,
          ts: Date.now(),
        })).toString('base64')
        res.json({ status: 'complete', token, customer })
      } finally {
        await db.end()
      }
    } else {
      res.json({ status: data.status, hint: data.hintCode })
    }
  } catch (err: any) {
    res.status(503).json({ error: err.message })
  }
})

// ─── Phone OTP ────────────────────────────────────────────────────────────────

// POST /v1/apifly/auth/phone/send — skicka SMS OTP via 46elks
router.post('/v1/apifly/auth/phone/send', async (req, res) => {
  const { phone } = req.body

  if (!phone || !/^\+?[0-9]{8,15}$/.test(phone.replace(/\s/g, ''))) {
    return res.status(400).json({ error: 'Ogiltigt telefonnummer. Ange i format +46701234567.' })
  }

  const cleanPhone = phone.replace(/\s/g, '')
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const expires = Date.now() + 10 * 60 * 1000  // 10 minuter

  otpStore.set(cleanPhone, { otp, phone: cleanPhone, expires, attempts: 0 })

  const ELKS_USER = process.env.FORTYSIX_ELKS_USERNAME
  const ELKS_PASS = process.env.FORTYSIX_ELKS_PASSWORD

  if (ELKS_USER && ELKS_PASS) {
    try {
      const r = await fetch('https://api.46elks.com/a1/sms', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${ELKS_USER}:${ELKS_PASS}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          from: 'Apifly',
          to: cleanPhone,
          message: `Din Apifly-kod: ${otp}\n\nGäller i 10 minuter. Dela inte koden med någon.`,
        }),
      })
      if (!r.ok) throw new Error(`46elks HTTP ${r.status}`)
    } catch (err: any) {
      console.error('[phone-otp] SMS misslyckades:', err.message)
      if (process.env.NODE_ENV !== 'production') {
        return res.json({ success: true, demo_code: otp, message: 'Dev: kod returnerad i svaret' })
      }
      return res.status(503).json({ error: 'SMS-tjänst tillfälligt otillgänglig. Försök igen om en stund.' })
    }
  } else {
    // Demo-läge — 46elks ej konfigurerat
    return res.json({ success: true, demo_code: otp, message: 'Demo: 46elks ej konfigurerat, kod i svaret' })
  }

  const maskedPhone = cleanPhone.slice(0, -4) + '****'
  res.json({ success: true, message: `SMS skickat till ${maskedPhone}` })
})

// POST /v1/apifly/auth/phone/verify — verifiera OTP och logga in
router.post('/v1/apifly/auth/phone/verify', async (req, res) => {
  const { phone, code } = req.body
  const cleanPhone = phone?.replace(/\s/g, '')

  if (!cleanPhone || !code) {
    return res.status(400).json({ error: 'Telefonnummer och kod krävs.' })
  }

  const stored = otpStore.get(cleanPhone)

  if (!stored) {
    return res.status(400).json({ error: 'Ingen aktiv kod för detta nummer. Begär en ny.' })
  }
  if (Date.now() > stored.expires) {
    otpStore.delete(cleanPhone)
    return res.status(400).json({ error: 'Koden har gått ut. Begär en ny.' })
  }
  if (stored.attempts >= 3) {
    otpStore.delete(cleanPhone)
    return res.status(429).json({ error: 'För många felaktiga försök. Begär ny kod.' })
  }
  if (stored.otp !== code) {
    stored.attempts++
    return res.status(400).json({
      error: 'Fel kod. Försök igen.',
      attempts_left: 3 - stored.attempts,
    })
  }

  otpStore.delete(cleanPhone)

  const email = `${cleanPhone}@phone.verified`
  const db = getDb()
  try {
    const { rows: [customer] } = await db.query(
      `INSERT INTO apifly_customers (email, name, status, tokens_remaining)
       VALUES ($1, $2, 'active', 5000)
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
       RETURNING id, email, name, plan`,
      [email, cleanPhone]
    )
    const token = Buffer.from(JSON.stringify({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      provider: 'phone',
      phone: cleanPhone,
      ts: Date.now(),
    })).toString('base64')
    res.json({ success: true, token, customer })
  } finally {
    await db.end()
  }
})

export default router
