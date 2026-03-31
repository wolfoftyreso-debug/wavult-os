// ─── UAPIX Portal API ─────────────────────────────────────────────────────────
// Handles customer portal auth and key management.
// Routes through our API (api.hypbit.com) rather than direct Supabase calls.
//
// POST   /api/uapix/portal/magic-link   → sends magic link to existing customer
// GET    /api/uapix/portal/me           → returns customer's order + keys (requires Bearer)
// POST   /api/uapix/portal/keys         → creates new API key (server-side, requires active sub)
// DELETE /api/uapix/portal/keys/:id     → revokes key

import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import { randomBytes, createHash } from 'crypto'

export const uapixPortalRouter = Router()

// Admin client (service role) for auth operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PORTAL_URL = process.env.UAPIX_PORTAL_URL || 'https://uapix.com'

// ─── Email helper ─────────────────────────────────────────────────────────────
async function sendEmail(to: string[], subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: 'UAPIX <noreply@hypbit.com>', to, subject, html }),
  })
  return res.json()
}

// ─── Auth helper ──────────────────────────────────────────────────────────────
async function getUserFromBearer(req: Request): Promise<{ user: any | null; error: string | null }> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid Authorization header' }
  }
  const token = authHeader.slice(7)
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) {
    return { user: null, error: error?.message || 'Invalid token' }
  }
  return { user: data.user, error: null }
}

// ─── POST /api/uapix/portal/magic-link ───────────────────────────────────────
uapixPortalRouter.post('/api/uapix/portal/magic-link', async (req: Request, res: Response) => {
  const { email } = req.body
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' })
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Check that this customer has an order (don't send magic links to random emails)
  const { data: order } = await supabaseAdmin
    .from('uapix_orders')
    .select('order_ref, total')
    .eq('email', normalizedEmail)
    .limit(1)
    .single()

  if (!order) {
    return res.status(404).json({ error: 'No account found for this email' })
  }

  // Generate magic link via Supabase admin
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
    options: { redirectTo: `${PORTAL_URL}/portal/callback` },
  })

  if (linkError) {
    console.error('[uapix-portal] magic-link error:', linkError.message)
    return res.status(500).json({ error: linkError.message })
  }

  const magicLink = linkData?.properties?.action_link

  try {
    await sendEmail([normalizedEmail], 'Your UAPIX Portal Access Link', `
      <div style="font-family:monospace;background:#0a0a0a;color:#e8e9eb;padding:32px;max-width:600px">
        <div style="font-size:22px;font-weight:700;letter-spacing:2px;margin-bottom:32px;color:#c4961a">UAPIX</div>
        <p style="color:#8b919a">Your secure portal access link:</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${magicLink}" style="display:inline-block;background:#c4961a;color:#0a0a0a;font-family:monospace;font-weight:700;font-size:14px;padding:14px 32px;border-radius:4px;text-decoration:none;letter-spacing:1px">
            Access UAPIX Portal →
          </a>
          <p style="color:#5a6170;font-size:11px;margin-top:12px">Link expires in 24 hours · One-time use</p>
        </div>
        <p style="color:#5a6170;font-size:11px">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `)
  } catch (mailErr) {
    console.error('[uapix-portal] send email error:', mailErr)
    return res.status(500).json({ error: 'Failed to send email' })
  }

  return res.json({ ok: true, message: 'Magic link sent' })
})

// ─── GET /api/uapix/portal/me ─────────────────────────────────────────────────
uapixPortalRouter.get('/api/uapix/portal/me', async (req: Request, res: Response) => {
  const { user, error: authError } = await getUserFromBearer(req)
  if (authError || !user) {
    return res.status(401).json({ error: authError || 'Unauthorized' })
  }

  // Fetch order
  const { data: order, error: orderError } = await supabaseAdmin
    .from('uapix_orders')
    .select('*')
    .eq('supabase_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Fetch active API keys (using is_active column)
  const { data: keys } = await supabaseAdmin
    .from('uapix_api_keys')
    .select('id, name, key_prefix, is_active, created_at, last_used_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return res.json({
    ok: true,
    user: { id: user.id, email: user.email },
    order: orderError ? null : order,
    keys: keys || [],
  })
})

// ─── POST /api/uapix/portal/keys ─────────────────────────────────────────────
uapixPortalRouter.post('/api/uapix/portal/keys', async (req: Request, res: Response) => {
  const { user, error: authError } = await getUserFromBearer(req)
  if (authError || !user) {
    return res.status(401).json({ error: authError || 'Unauthorized' })
  }

  // Check active subscription
  const { data: order } = await supabaseAdmin
    .from('uapix_orders')
    .select('status')
    .eq('supabase_user_id', user.id)
    .limit(1)
    .single()

  if (!order || order.status !== 'active') {
    return res.status(403).json({ error: 'No active subscription. Your order may still be pending activation.' })
  }

  const { name } = req.body
  const keyName = (name?.trim()) || 'Default Key'

  // Check active key limit
  const { count } = await supabaseAdmin
    .from('uapix_api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true)

  if ((count ?? 0) >= 10) {
    return res.status(400).json({ error: 'Maximum 10 active keys allowed. Revoke an existing key first.' })
  }

  // Generate key server-side (cryptographically secure)
  const rawKey = 'uapix_' + randomBytes(30).toString('hex')
  const hash = createHash('sha256').update(rawKey).digest('hex')
  const prefix = rawKey.slice(0, 14)

  const { data: newKey, error: insertError } = await supabaseAdmin
    .from('uapix_api_keys')
    .insert({
      user_id: user.id,
      name: keyName,
      key_prefix: prefix,
      key_hash: hash,
      is_active: true,
    })
    .select('id, name, key_prefix, created_at')
    .single()

  if (insertError) {
    console.error('[uapix-portal] create key error:', insertError.message)
    return res.status(500).json({ error: insertError.message })
  }

  // Return raw key ONCE — never stored in plaintext
  return res.status(201).json({ ok: true, key: rawKey, ...newKey })
})

// ─── DELETE /api/uapix/portal/keys/:id ───────────────────────────────────────
uapixPortalRouter.delete('/api/uapix/portal/keys/:id', async (req: Request, res: Response) => {
  const { user, error: authError } = await getUserFromBearer(req)
  if (authError || !user) {
    return res.status(401).json({ error: authError || 'Unauthorized' })
  }

  const { id } = req.params

  const { error: updateError } = await supabaseAdmin
    .from('uapix_api_keys')
    .update({ is_active: false })
    .eq('id', id)
    .eq('user_id', user.id) // Ensure the key belongs to this user

  if (updateError) {
    console.error('[uapix-portal] revoke key error:', updateError.message)
    return res.status(500).json({ error: updateError.message })
  }

  return res.json({ ok: true, message: 'Key revoked' })
})
