// ─── Builder API Cloud — Leads / Investor Applications ────────────────────────
// POST /api/builder/leads  → investor registration + NDA acceptance
// Stores in Supabase investor_applications table.

import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'

export const builderLeadsRouter = Router()

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

builderLeadsRouter.post('/', async (req: Request, res: Response) => {
  const {
    firstName,
    lastName,
    personalNumber,
    email,
    phone,
    companyName,
    companyOrgNumber,
    roleTitle,
    investmentInterest,
    isAccreditedInvestor,
    sourceOfFunds,
    ndaAccepted,
    termsAccepted,
  } = req.body

  if (!email || !firstName || !lastName || !ndaAccepted || !termsAccepted) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const { error } = await supabaseAdmin.from('investor_applications').insert({
    first_name: firstName,
    last_name: lastName,
    personal_number: personalNumber || null,
    email: email.toLowerCase().trim(),
    phone: phone || null,
    company_name: companyName || null,
    company_org_number: companyOrgNumber || null,
    role_title: roleTitle || null,
    investment_interest_usd: investmentInterest ? parseInt(investmentInterest) : null,
    is_accredited_investor: isAccreditedInvestor || false,
    source_of_funds: sourceOfFunds || null,
    nda_accepted: ndaAccepted,
    nda_accepted_at: ndaAccepted ? new Date().toISOString() : null,
    terms_accepted: termsAccepted,
    terms_accepted_at: termsAccepted ? new Date().toISOString() : null,
    source: 'builder-api-cloud',
  })

  if (error) {
    console.error('[builder-leads] insert error:', error.message)
    return res.status(500).json({ error: error.message })
  }

  return res.status(201).json({ success: true, message: 'Application received' })
})
