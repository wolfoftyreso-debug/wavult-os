import { Router, Request, Response } from 'express'
import * as https from 'https'
import * as fs from 'fs'
import * as crypto from 'crypto'
import { requireAuth, requireRole } from '../middleware/requireAuth'

const router = Router()
// OAuth callback is public (Revolut redirects here) — other routes require admin
const CLIENT_ID = process.env.REVOLUT_BUSINESS_CLIENT_ID || 'oTewVSHYqP-EZXpctxOM7v2GJO-qxt0s57e0g7GQFA'
const REDIRECT_URI = 'https://api.wavult.com/revolut/callback'
const PRIVATE_KEY_PATH = process.env.REVOLUT_BUSINESS_PRIVATE_KEY || '/home/erikwsl/.openclaw/secrets/revolut_biz_private_v2.pem'

function generateJWT(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({
    iss: CLIENT_ID,
    sub: CLIENT_ID,
    aud: 'https://revolut.com',
    iat: now,
    exp: now + 2400,
    jti: crypto.randomUUID(),
  })).toString('base64url')

  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8')
  const sign = crypto.createSign('SHA256')
  sign.update(`${header}.${payload}`)
  const signature = sign.sign(privateKey, 'base64url')

  return `${header}.${payload}.${signature}`
}

// OAuth callback — Revolut redirects here after user authorizes
router.get('/revolut/callback', async (req: Request, res: Response) => {
  const { code, error } = req.query

  if (error) {
    console.error('[Revolut OAuth] Error:', error)
    return res.status(400).json({ error: String(error) })
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' })
  }

  try {
    const jwt = generateJWT()
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: jwt,
    }).toString()

    // Exchange code for tokens
    const tokenResp = await fetch('https://b2b.revolut.com/api/1.0/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    const tokens = await tokenResp.json()

    if (!tokenResp.ok) {
      console.error('[Revolut OAuth] Token exchange failed:', tokens)
      return res.status(400).json({ error: 'Token exchange failed', detail: tokens })
    }

    // Save tokens to SSM
    const { access_token, refresh_token, token_type, expires_in } = tokens as any

    // Store in env/SSM (in production: aws ssm put-parameter)
    console.log('[Revolut OAuth] SUCCESS - access token received')
    console.log(`Token type: ${token_type}, expires_in: ${expires_in}s`)

    // In production: save to SSM /wavult/prod/REVOLUT_ACCESS_TOKEN etc
    // For now: respond with success
    res.json({
      success: true,
      message: 'Revolut Business API connected',
      token_type,
      expires_in,
    })
  } catch (err) {
    console.error('[Revolut OAuth] Exception:', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// Refresh token endpoint — admin only
router.post('/v1/oauth/revolut/refresh', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const refreshToken = process.env.REVOLUT_REFRESH_TOKEN
  if (!refreshToken) {
    return res.status(400).json({ error: 'No refresh token stored' })
  }

  const jwt = generateJWT()
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: jwt,
  }).toString()

  const resp = await fetch('https://b2b.revolut.com/api/1.0/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const tokens = await resp.json()
  res.json(tokens)
})

export default router
