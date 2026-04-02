/**
 * Customer Account Ledger — /api/accounts/* + /api/invoices/*
 *
 * VW-style net-balance ledger.
 * Spolfil-principen: invoice summary is separate from invoice line items.
 * Auto Revolut payment trigger when net credit balance exceeds threshold.
 */
import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

// ── Schema bootstrap ─────────────────────────────────────────────────────────

async function ensureTables() {
  const client = sb()
  // Using individual table creates — Supabase RPC exec_sql may or may not be available
  await Promise.allSettled([
    client.from('customer_accounts').select('id').limit(1),
    client.from('account_transactions').select('id').limit(1),
    client.from('invoice_lines').select('id').limit(1),
    client.from('invoice_audit_log').select('id').limit(1),
  ])
  // If tables don't exist, the migration SQL handles creation (see migrations/)
}

// ── Balance calculation ──────────────────────────────────────────────────────

function calcBalance(transactions: any[]) {
  const total_debit = transactions
    .filter(t => Number(t.amount) > 0)
    .reduce((s, t) => s + parseFloat(t.amount), 0)
  const total_credit = transactions
    .filter(t => Number(t.amount) < 0)
    .reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0)
  const net_balance = total_debit - total_credit
  return {
    total_debit,
    total_credit,
    net_balance,
    status: Math.abs(net_balance) < 0.01
      ? 'clear'
      : net_balance > 0 ? 'owes_us' : 'we_owe',
  }
}

async function maybeAutoPayment(accountId: string) {
  const client = sb()
  const { data: acc } = await client.from('customer_accounts').select('*').eq('id', accountId).single()
  if (!acc) return
  const { data: txs } = await client.from('account_transactions').select('amount').eq('account_id', accountId)
  const { net_balance } = calcBalance(txs ?? [])
  if (net_balance < -(acc.credit_threshold ?? 100)) {
    console.log(`[accounts] Auto-payment trigger: account ${accountId}, amount ${Math.abs(net_balance)} ${acc.currency}`)
    // TODO: call revolutPaymentRouter when Revolut OAuth is configured
    // await fetch(`${process.env.API_BASE_URL}/api/revolut/payment`, { method:'POST', ... })
  }
}

// ── /api/accounts ────────────────────────────────────────────────────────────

// GET /api/accounts
router.get('/api/accounts', async (_req: Request, res: Response) => {
  try {
    await ensureTables()
    const client = sb()
    const { data: accounts } = await client.from('customer_accounts').select('*').order('name')
    const result = await Promise.all((accounts ?? []).map(async (acc) => {
      const { data: txs } = await client.from('account_transactions').select('*').eq('account_id', acc.id).order('date', { ascending: false })
      return { ...acc, transactions: txs ?? [], ...calcBalance(txs ?? []) }
    }))
    res.json(result)
  } catch (e: any) {
    res.json([])
  }
})

// GET /api/accounts/:id
router.get('/api/accounts/:id', async (req: Request, res: Response) => {
  try {
    const client = sb()
    const { data: acc } = await client.from('customer_accounts').select('*').eq('id', req.params.id).single()
    if (!acc) return res.status(404).json({ error: 'Not found' })
    const { data: txs } = await client.from('account_transactions').select('*').eq('account_id', acc.id).order('date', { ascending: false })
    res.json({ ...acc, transactions: txs ?? [], ...calcBalance(txs ?? []) })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/accounts
router.post('/api/accounts', async (req: Request, res: Response) => {
  try {
    await ensureTables()
    const { data, error } = await sb().from('customer_accounts').insert(req.body).select().single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/accounts/:id/transactions
router.get('/api/accounts/:id/transactions', async (req: Request, res: Response) => {
  try {
    const client = sb()
    const { data: txs } = await client
      .from('account_transactions')
      .select('*')
      .eq('account_id', req.params.id)
      .order('date', { ascending: false })
    res.json(txs ?? [])
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/accounts/:id/transactions
router.post('/api/accounts/:id/transactions', async (req: Request, res: Response) => {
  try {
    const client = sb()
    const tx = { ...req.body, account_id: req.params.id }
    const { data, error } = await client.from('account_transactions').insert(tx).select().single()
    if (error) throw error
    await maybeAutoPayment(req.params.id)
    res.status(201).json(data)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ── /api/invoices (Spolfil-principen) ────────────────────────────────────────

// GET /api/invoices/:id — summary ONLY, no line items
router.get('/api/invoices/:id', async (req: Request, res: Response) => {
  try {
    const client = sb()
    const { data: tx, error } = await client
      .from('account_transactions')
      .select('id, account_id, date, type, description, amount, currency, reference, status, receipt_url')
      .eq('id', req.params.id)
      .in('type', ['invoice', 'subscription'])
      .single()
    if (error || !tx) return res.status(404).json({ error: 'Invoice not found' })
    // Intentionally NO line items in this response
    res.json(tx)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/invoices/:id/lines — spolfilen
router.get('/api/invoices/:id/lines', async (req: Request, res: Response) => {
  try {
    const client = sb()
    const { data: lines } = await client
      .from('invoice_lines')
      .select('*')
      .eq('invoice_id', req.params.id)
      .order('line_number', { ascending: true })
    res.json(lines ?? [])
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/invoices/:id/audit — full audit log, optionally filtered by line_id
router.get('/api/invoices/:id/audit', async (req: Request, res: Response) => {
  try {
    const client = sb()
    let query = client
      .from('invoice_audit_log')
      .select('*')
      .eq('invoice_id', req.params.id)
      .order('event_time', { ascending: true })
    if (req.query.line_id) {
      query = query.eq('line_id', req.query.line_id as string)
    }
    const { data: events } = await query
    res.json(events ?? [])
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/invoices/:id/lines — add line item to spool file
router.post('/api/invoices/:id/lines', async (req: Request, res: Response) => {
  try {
    const client = sb()
    const line = { ...req.body, invoice_id: req.params.id }
    const { data, error } = await client.from('invoice_lines').insert(line).select().single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ── Payment webhook ───────────────────────────────────────────────────────────

// POST /api/payments/webhook — Revolut event → mark transaction confirmed + generate receipt
router.post('/api/payments/webhook', async (req: Request, res: Response) => {
  const event = req.body
  console.log('[accounts] Payment webhook:', event.type, event.id)

  if (['payment.completed', 'payment.created'].includes(event.type)) {
    await sb()
      .from('account_transactions')
      .update({ status: 'confirmed' })
      .eq('revolut_payment_id', event.id)
  }

  res.json({ ok: true })
})

export default router
