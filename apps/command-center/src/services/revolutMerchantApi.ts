// Revolut Merchant API Integration
// Docs: https://developer.revolut.com/docs/merchant/merchant-api
// 
// SETUP (du har redan ansökt):
// 1. Merchant account approved → get API key from merchant.revolut.com
// 2. Set REVOLUT_MERCHANT_API_KEY in SSM: /wavult/prod/REVOLUT_MERCHANT_API_KEY
// 3. Webhook URL: https://api.wavult.com/v1/webhooks/revolut-merchant
// 4. Webhook events: ORDER_COMPLETED, ORDER_PAYMENT_DECLINED, REFUND_COMPLETED
//
// Use cases for Wavult Group:
// - Accept payments from Landvex customers (municipalities, property owners)
// - Zoomer payouts (quiXzoom platform)
// - Intercompany transfers between FZCO entities

export const REVOLUT_MERCHANT_BASE = 'https://merchant.revolut.com/api/1.0'
export const REVOLUT_MERCHANT_SANDBOX = 'https://sandbox-merchant.revolut.com/api/1.0'

export interface RevolutOrder {
  id: string
  type: 'payment' | 'refund'
  state: 'pending' | 'processing' | 'authorised' | 'completed' | 'cancelled' | 'failed'
  created_at: string
  updated_at: string
  completed_at?: string
  amount: number
  currency: string
  outstanding_amount: number
  capture_mode: 'automatic' | 'manual'
  merchant_order_ext_ref?: string
  customer_email?: string
  metadata?: Record<string, string>
}

export interface RevolutPaymentLink {
  type: 'payment_link'
  url: string
  id: string
  amount: number
  currency: string
  reference?: string
  expiry_date?: string
}

export interface RevolutRefund {
  id: string
  order_id: string
  amount: number
  currency: string
  state: 'pending' | 'completed' | 'failed'
  created_at: string
  description?: string
}

export interface RevolutPayout {
  id: string
  type: 'payout'
  state: 'pending' | 'completed' | 'failed'
  created_at: string
  amount: number
  currency: string
  recipient: {
    id?: string
    name: string
    email?: string
    bank_account?: {
      type: 'iban' | 'sort_code_account_number'
      value: string
    }
  }
  reference?: string
}

// ── Orders ───────────────────────────────────────────────────────────────────

export async function createOrder(params: {
  amount: number
  currency: string
  customer_email?: string
  merchant_order_ext_ref?: string  // Your internal order ID
  description?: string
  metadata?: Record<string, string>
  capture_mode?: 'automatic' | 'manual'
}, sandbox = false): Promise<RevolutOrder> {
  const base = sandbox ? REVOLUT_MERCHANT_SANDBOX : REVOLUT_MERCHANT_BASE
  const apiKey = import.meta.env.VITE_REVOLUT_MERCHANT_API_KEY || ''
  
  const res = await fetch(`${base}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      capture_mode: params.capture_mode || 'automatic',
      description: params.description,
      merchant_order_ext_ref: params.merchant_order_ext_ref,
      customer_email: params.customer_email,
      metadata: params.metadata,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Revolut createOrder ${res.status}: ${err}`)
  }
  return res.json()
}

export async function getOrder(orderId: string, sandbox = false): Promise<RevolutOrder> {
  const base = sandbox ? REVOLUT_MERCHANT_SANDBOX : REVOLUT_MERCHANT_BASE
  const apiKey = import.meta.env.VITE_REVOLUT_MERCHANT_API_KEY || ''
  const res = await fetch(`${base}/orders/${orderId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`Revolut getOrder ${res.status}`)
  return res.json()
}

export async function listOrders(params?: {
  from?: string   // ISO date
  to?: string
  count?: number
  state?: RevolutOrder['state']
}, sandbox = false): Promise<RevolutOrder[]> {
  const base = sandbox ? REVOLUT_MERCHANT_SANDBOX : REVOLUT_MERCHANT_BASE
  const apiKey = import.meta.env.VITE_REVOLUT_MERCHANT_API_KEY || ''
  const query = new URLSearchParams()
  if (params?.from) query.set('from', params.from)
  if (params?.to) query.set('to', params.to)
  if (params?.count) query.set('count', String(params.count))
  if (params?.state) query.set('state', params.state)
  
  const res = await fetch(`${base}/orders?${query}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`Revolut listOrders ${res.status}`)
  return res.json()
}

// ── Refunds ───────────────────────────────────────────────────────────────────

export async function refundOrder(params: {
  orderId: string
  amount: number
  description?: string
}, sandbox = false): Promise<RevolutRefund> {
  const base = sandbox ? REVOLUT_MERCHANT_SANDBOX : REVOLUT_MERCHANT_BASE
  const apiKey = import.meta.env.VITE_REVOLUT_MERCHANT_API_KEY || ''
  const res = await fetch(`${base}/orders/${params.orderId}/refunds`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: params.amount, description: params.description }),
  })
  if (!res.ok) throw new Error(`Revolut refund ${res.status}`)
  return res.json()
}

// ── Payouts (Zoomer payouts, team transfers) ──────────────────────────────────

export async function createPayout(params: {
  amount: number
  currency: string
  recipient_name: string
  recipient_iban?: string
  reference?: string    // "QuiXzoom mission payout - zoomer-001"
  description?: string
}, sandbox = false): Promise<RevolutPayout> {
  const base = sandbox ? REVOLUT_MERCHANT_SANDBOX : REVOLUT_MERCHANT_BASE
  const apiKey = import.meta.env.VITE_REVOLUT_MERCHANT_API_KEY || ''
  const res = await fetch(`${base}/payouts`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      recipient: {
        name: params.recipient_name,
        bank_account: params.recipient_iban 
          ? { type: 'iban', value: params.recipient_iban }
          : undefined,
      },
      reference: params.reference,
      description: params.description,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Revolut payout ${res.status}: ${err}`)
  }
  return res.json()
}

// ── Payment Link (for Landvex invoices to municipalities) ─────────────────────

export async function createPaymentLink(params: {
  amount: number
  currency: string
  reference: string     // Invoice number
  customer_email?: string
  expiry_date?: string  // ISO date
}, sandbox = false): Promise<RevolutPaymentLink> {
  const base = sandbox ? REVOLUT_MERCHANT_SANDBOX : REVOLUT_MERCHANT_BASE
  const apiKey = import.meta.env.VITE_REVOLUT_MERCHANT_API_KEY || ''
  
  // Create order first
  const order = await createOrder({
    amount: params.amount,
    currency: params.currency,
    merchant_order_ext_ref: params.reference,
    customer_email: params.customer_email,
    description: `Invoice ${params.reference}`,
  }, sandbox)
  
  // Return checkout URL
  return {
    type: 'payment_link',
    url: `https://checkout.revolut.com/pay/${order.id}`,
    id: order.id,
    amount: params.amount,
    currency: params.currency,
    reference: params.reference,
    expiry_date: params.expiry_date,
  }
}

// ── Webhook verification ───────────────────────────────────────────────────────

export function verifyRevolutWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Revolut uses HMAC-SHA256
  // In Node.js backend: use crypto.createHmac('sha256', secret).update(payload).digest('hex')
  // Compare with signature header: 'Revolut-Signature' 
  console.warn('[Revolut] Webhook signature verification should happen on backend only')
  return true // Stub — implement on server side
}
