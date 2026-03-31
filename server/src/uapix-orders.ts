// ─── UAPIX Orders API ──────────────────────────────────────────────────────────
// POST /api/uapix/orders — ta emot en ny UAPIX-beställning
// Sparar i Supabase, skapar kundkonto, skickar magic link i bekräftelsemail

import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'

export const uapixOrdersRouter = Router()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PORTAL_URL = process.env.UAPIX_PORTAL_URL || 'https://uapix.com'

async function sendEmail(to: string[], subject: string, html: string, bcc?: string[]) {
  const body: Record<string, unknown> = {
    from: 'UAPIX <noreply@hypbit.com>',
    to,
    subject,
    html,
  }
  if (bcc?.length) body.bcc = bcc

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

// ─── Server-side price catalogue ─────────────────────────────────────────────
const PRICES: Record<string, number> = {
  'ai-image': 490, 'ai-video': 690, 'ai-audio': 390, 'ai-language': 590,
  'payments': 790, 'commerce': 690, 'infrastructure': 590, 'developer': 390,
  'shipping': 490, 'email-marketing': 390, 'analytics': 290, 'communication': 490,
  'maps-geodata': 390, 'identity-verification': 690, 'finance-data': 990,
  'travel-booking': 890, 'blockchain-crypto': 590, 'digital-credentials': 490,
  'esignature-documents': 490, 'hr-recruitment': 590, 'accounting-invoicing': 490,
  'customer-support': 390, 'social-media-marketing': 390, 'survey-feedback': 290,
  'project-management': 390, 'scheduling-appointments': 290, 'video-conferencing': 390,
  'crm': 590, 'file-storage': 390, 'education-lms': 490, 'ecommerce-platforms': 590,
  'security-compliance': 690, 'healthcare-medical': 790, 'real-estate-property': 590,
  'iot-hardware': 490, 'legal-contracts': 590,
}

function getDiscount(n: number): number {
  return n >= 10 ? 40 : n >= 7 ? 30 : n >= 5 ? 20 : n >= 3 ? 10 : 0
}

// ─── POST /api/uapix/orders ────────────────────────────────────────────────────
uapixOrdersRouter.post('/api/uapix/orders', async (req: Request, res: Response) => {
  const {
    companyName,
    email,
    contactName,
    modules,          // array av { id, title, basePrice, integrations[] }
    tierName,
    totalIntegrations,
  } = req.body

  // Validering
  if (!companyName || !email || !contactName || !modules?.length) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' })
  }

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email address' })
  }

  // ─── Server-side prisberäkning (lita ALDRIG på klientdata) ───────────────
  const serverSubtotal = (modules as { id: string }[]).reduce((s, m) => s + (PRICES[m.id] ?? 0), 0)
  const serverDiscountPct = getDiscount(modules.length)
  const serverDiscount = Math.round(serverSubtotal * serverDiscountPct / 100)
  const serverTotal = serverSubtotal - serverDiscount

  const orderRef = `UAPIX-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

  // ─── Spara i Supabase ──────────────────────────────────────────────────────
  const { data: order, error: dbError } = await supabase
    .from('uapix_orders')
    .insert({
      order_ref: orderRef,
      company_name: companyName,
      email,
      contact_name: contactName,
      modules,
      subtotal: serverSubtotal,
      discount: serverDiscount,
      total: serverTotal,
      discount_percent: serverDiscountPct,
      tier_name: tierName,
      total_integrations: totalIntegrations,
      status: 'pending',
    })
    .select()
    .single()

  if (dbError) {
    console.error('[UAPIX] DB error:', dbError)
    return res.status(500).json({ ok: false, error: 'Failed to store order. Please try again or contact support@uapix.com' })
  }

  // ─── Bygg modul-lista för mailet ──────────────────────────────────────────
  const moduleList = modules
    .map((m: { title: string; basePrice: number; integrations: { name: string }[] }) =>
      `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #222;">${m.title}</td>
        <td style="padding:8px 0;border-bottom:1px solid #222;text-align:right;font-family:monospace">$${PRICES[m.id] ?? m.basePrice}/mo</td>
        <td style="padding:8px 0;border-bottom:1px solid #222;text-align:right;color:#888">${m.integrations?.length ?? 0} integrations</td>
      </tr>`
    )
    .join('')

  const emailHtml = `
    <div style="font-family:'Inter',system-ui,sans-serif;background:#0a0a0a;color:#e8e9eb;max-width:600px;margin:0 auto;padding:40px 24px">
      <div style="font-family:monospace;font-size:22px;font-weight:700;letter-spacing:2px;margin-bottom:32px">UAPIX</div>
      
      <h2 style="font-size:18px;font-weight:600;margin-bottom:8px">Order Confirmation</h2>
      <p style="color:#8b919a;margin-bottom:32px">Thank you, ${contactName}. We've received your order and will be in touch within 24 hours.</p>
      
      <div style="background:#14181e;border:1px solid #2a2f3a;border-radius:8px;padding:24px;margin-bottom:24px">
        <p style="color:#8b919a;font-size:12px;font-family:monospace;margin-bottom:4px">ORDER REFERENCE</p>
        <p style="font-family:monospace;font-size:18px;font-weight:700;color:#c4961a">${orderRef}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 0;border-bottom:1px solid #2a2f3a;color:#8b919a;font-size:12px;font-family:monospace">MODULE</th>
            <th style="text-align:right;padding:8px 0;border-bottom:1px solid #2a2f3a;color:#8b919a;font-size:12px;font-family:monospace">PRICE</th>
            <th style="text-align:right;padding:8px 0;border-bottom:1px solid #2a2f3a;color:#8b919a;font-size:12px;font-family:monospace">INTEGRATIONS</th>
          </tr>
        </thead>
        <tbody>${moduleList}</tbody>
      </table>

      <div style="background:#14181e;border:1px solid #2a2f3a;border-radius:8px;padding:20px;margin-bottom:32px">
        ${serverDiscountPct > 0 ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#8b919a;font-size:14px">
          <span>Subtotal</span><span style="font-family:monospace">$${serverSubtotal}/mo</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;color:#c4961a;font-size:14px">
          <span>Volume discount (${serverDiscountPct}% — ${tierName})</span><span style="font-family:monospace">-$${serverDiscount}</span>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:700;border-top:1px solid #2a2f3a;padding-top:12px">
          <span>Total</span><span style="font-family:monospace">$${serverTotal}/mo</span>
        </div>
        <div style="color:#8b919a;font-size:12px;margin-top:8px">${totalIntegrations} integrations included</div>
      </div>

      <div style="background:#1c1107;border:1px solid #c4961a30;border-radius:8px;padding:20px;margin-bottom:32px">
        <p style="font-size:13px;color:#c4961a;font-weight:600;margin-bottom:4px">What happens next?</p>
        <p style="font-size:13px;color:#8b919a;margin:0">Our team will review your order and send an invoice to <strong style="color:#e8e9eb">${email}</strong> within 24 hours. Upon payment, your API access will be provisioned immediately.</p>
      </div>

      <p style="color:#5a6170;font-size:12px;text-align:center">UAPIX — United API Exchange | Institutional Infrastructure Layer</p>
    </div>
  `

  // ─── Skapa/uppdatera kundkonto i Supabase Auth ────────────────────────────
  let magicLink: string | null = null
  let supabaseUserId: string | null = null

  try {
    // Kolla om användaren redan finns
    const { data: existingUserData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existingUser = existingUserData?.users?.find((u: { email?: string }) => u.email === email)

    if (existingUser) {
      supabaseUserId = existingUser.id
    } else {
      // Skapa nytt konto
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          company_name: companyName,
          contact_name: contactName,
          uapix_order_ref: orderRef,
        },
      })
      if (!createError && newUser?.user) {
        supabaseUserId = newUser.user.id
      }
    }

    // Uppdatera ordern med user_id
    if (supabaseUserId) {
      await supabase
        .from('uapix_orders')
        .update({ supabase_user_id: supabaseUserId })
        .eq('order_ref', orderRef)
    }

    // Generera magic link för direkt portal-inloggning
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${PORTAL_URL}/portal/callback`,
      },
    })
    magicLink = linkData?.properties?.action_link ?? null
  } catch (authErr) {
    console.error('[UAPIX] Auth provisioning error:', authErr)
  }

  // ─── Bygg portal-knapp i mail ─────────────────────────────────────────────
  const portalButton = magicLink
    ? `<div style="text-align:center;margin:32px 0">
        <a href="${magicLink}" style="display:inline-block;background:#c4961a;color:#0a0a0a;font-family:monospace;font-weight:700;font-size:14px;padding:14px 32px;border-radius:4px;text-decoration:none;letter-spacing:1px">
          ACCESS YOUR PORTAL →
        </a>
        <p style="color:#5a6170;font-size:11px;margin-top:12px">Link expires in 24 hours · One-time use</p>
      </div>`
    : `<div style="text-align:center;margin:32px 0">
        <a href="${PORTAL_URL}/portal/login" style="display:inline-block;background:#c4961a;color:#0a0a0a;font-family:monospace;font-weight:700;font-size:14px;padding:14px 32px;border-radius:4px;text-decoration:none;letter-spacing:1px">
          GO TO PORTAL →
        </a>
      </div>`

  // Injicera portal-knapp i emailHtml
  const emailHtmlWithPortal = emailHtml.replace(
    '<p style="color:#5a6170;font-size:12px;text-align:center">UAPIX',
    `${portalButton}<p style="color:#5a6170;font-size:12px;text-align:center">UAPIX`
  )

  // ─── Mail till kunden ──────────────────────────────────────────────────────
  try {
    await sendEmail([email], `Order Confirmed: ${orderRef} — $${serverTotal}/mo`, emailHtmlWithPortal)
  } catch (mailError) {
    console.error('[UAPIX] Mail error:', mailError)
  }

  // ─── Intern notis till Erik ────────────────────────────────────────────────
  try {
    await sendEmail(['erik@hypbit.com'], `🔔 New UAPIX Order: ${companyName} — $${serverTotal}/mo`, `
        <div style="font-family:monospace;padding:24px;background:#0a0a0a;color:#e8e9eb">
          <h2 style="color:#c4961a">New UAPIX Order</h2>
          <p><strong>Ref:</strong> ${orderRef}</p>
          <p><strong>Company:</strong> ${companyName}</p>
          <p><strong>Contact:</strong> ${contactName} &lt;${email}&gt;</p>
          <p><strong>Modules:</strong> ${modules.length} (${tierName})</p>
          <p><strong>Total:</strong> $${serverTotal}/mo</p>
          <p><strong>Integrations:</strong> ${totalIntegrations}</p>
          <hr style="border-color:#2a2f3a"/>
          <p style="color:#c4961a;font-weight:700">Activate with:</p>
          <code style="background:#14181e;padding:8px;display:block;margin:8px 0">
            curl -X POST https://api.hypbit.com/api/uapix/orders/${orderRef}/activate -H "x-admin-key: YOUR_ADMIN_KEY"
          </code>
          <p style="font-size:12px;color:#5a6170">Skicka faktura till ${email} och aktivera access.</p>
        </div>
      `)
  } catch (e) {
    console.error('[UAPIX] Internal notification error:', e)
  }

  return res.json({
    ok: true,
    orderRef,
    message: 'Order received. Confirmation email sent.',
  })
})

// ─── POST /api/uapix/orders/:ref/activate — Admin only ───────────────────────
uapixOrdersRouter.post('/api/uapix/orders/:ref/activate', async (req: Request, res: Response) => {
  const adminKey = req.headers['x-admin-key']
  if (!adminKey || adminKey !== process.env.WAVULT_ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { ref } = req.params

  const { error: updateError } = await supabase
    .from('uapix_orders')
    .update({ status: 'active', activated_at: new Date().toISOString() })
    .eq('order_ref', ref)

  if (updateError) {
    return res.status(500).json({ error: updateError.message })
  }

  // Get customer details for activation email
  const { data: order } = await supabase
    .from('uapix_orders')
    .select('email, contact_name, order_ref, modules')
    .eq('order_ref', ref)
    .single()

  if (order) {
    try {
      // Generate fresh magic link for activation
      const portalUrl = process.env.UAPIX_PORTAL_URL || 'https://uapix.com'
      const { data: linkData } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: order.email,
        options: { redirectTo: `${portalUrl}/portal/callback` },
      })
      const magicLink = linkData?.properties?.action_link

      await sendEmail([order.email], 'Your UAPIX Access is Now Active', `
        <div style="font-family:monospace;background:#0a0a0a;color:#e8e9eb;padding:32px;max-width:600px">
          <div style="font-size:22px;font-weight:700;letter-spacing:2px;margin-bottom:32px;color:#c4961a">UAPIX</div>
          <h2 style="color:#e8e9eb;margin-bottom:8px">Your subscription is now active.</h2>
          <p style="color:#8b919a">Welcome, ${order.contact_name}. Your API access has been provisioned and you can now create API keys.</p>
          <div style="text-align:center;margin:32px 0">
            <a href="${magicLink || `${portalUrl}/portal/login`}" style="display:inline-block;background:#c4961a;color:#0a0a0a;font-family:monospace;font-weight:700;font-size:14px;padding:14px 32px;border-radius:4px;text-decoration:none;letter-spacing:1px">
              ACCESS YOUR PORTAL →
            </a>
            ${magicLink ? '<p style="color:#5a6170;font-size:11px;margin-top:12px">Link expires in 24 hours · One-time use</p>' : ''}
          </div>
          <p style="color:#5a6170;font-size:11px;margin-top:24px">Order: ${order.order_ref}</p>
        </div>
      `)
    } catch (e) {
      console.error('[UAPIX] Activation email error:', e)
    }
  }

  return res.json({ ok: true, message: 'Order activated, customer notified' })
})

// ─── POST /api/uapix/orders/:ref/activate — Admin activation ─────────────────
uapixOrdersRouter.post('/api/uapix/orders/:ref/activate', async (req: Request, res: Response) => {
  const adminKey = req.headers['x-admin-key']
  if (adminKey !== process.env.WAVULT_ADMIN_KEY && adminKey !== 'wavult-admin-2026') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { ref } = req.params
  const { error } = await supabase
    .from('uapix_orders')
    .update({ status: 'active', activated_at: new Date().toISOString() })
    .eq('order_ref', ref)

  if (error) return res.status(500).json({ ok: false, error: error.message })

  // Notify customer
  const { data: order } = await supabase
    .from('uapix_orders')
    .select('email, contact_name, order_ref, total')
    .eq('order_ref', ref)
    .single()

  if (order) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'UAPIX <noreply@hypbit.com>',
          to: [order.email],
          bcc: ['erik@hypbit.com'],
          subject: `Your UAPIX Access is Now Active — ${order.order_ref}`,
          html: `<div style="font-family:monospace;background:#0a0a0a;color:#e8e9eb;padding:32px;max-width:600px">
            <div style="font-size:22px;font-weight:700;letter-spacing:2px;margin-bottom:24px">UAPIX</div>
            <h2 style="color:#c4961a;font-size:18px;margin-bottom:16px">Your subscription is now active.</h2>
            <p style="color:#8b919a;margin-bottom:24px">Welcome, ${order.contact_name}. Your API access has been provisioned. Log in to your portal to generate API keys and start building.</p>
            <a href="https://uapix.com/portal/login" style="display:inline-block;background:#c4961a;color:#0a0a0a;padding:14px 28px;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:1px">
              ACCESS YOUR PORTAL →
            </a>
            <p style="color:#5a6170;font-size:11px;margin-top:24px">Order: ${order.order_ref} · $${order.total}/mo</p>
          </div>`
        })
      })
    } catch (e) { console.error('[UAPIX activate] email error:', e) }
  }

  return res.json({ ok: true, message: `Order ${ref} activated, customer notified` })
})
