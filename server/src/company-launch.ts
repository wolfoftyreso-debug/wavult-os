// ─── Company Launch API ────────────────────────────────────────────────────
// Tables: company_launches, company_launch_steps
// All routes are relative to /api/company-launch (mounted in index.ts)

import { Router, Request, Response } from 'express'
import { supabase } from './supabase'

export const companyLaunchRouter = Router()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUser(req: Request, res: Response): { id: string; org_id: string } | null {
  if (!(req as any).user) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  return (req as any).user
}

const FLAG_MAP: Record<string, string> = {
  'SE': '🇸🇪',
  'US-TX': '🇺🇸',
  'US-DE': '🇺🇸',
  'LT': '🇱🇹',
  'AE-DMCC': '🇦🇪',
}

// ---------------------------------------------------------------------------
// GET /api/company-launch — list all companies
// ---------------------------------------------------------------------------
companyLaunchRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('company_launches')
      .select('*')
      .order('priority', { ascending: true })

    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// ---------------------------------------------------------------------------
// POST /api/company-launch — create new company
// ---------------------------------------------------------------------------
companyLaunchRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type, jurisdiction, flag, priority, notes } = req.body

    if (!name || !type || !jurisdiction) {
      return res.status(400).json({ error: 'name, type, and jurisdiction are required' })
    }

    const resolvedFlag = flag || FLAG_MAP[jurisdiction] || '🏢'

    const { data, error } = await supabase
      .from('company_launches')
      .insert({
        name,
        type,
        jurisdiction,
        flag: resolvedFlag,
        priority: priority ?? 5,
        notes: notes ?? null,
        status: 'not_started',
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// ---------------------------------------------------------------------------
// PATCH /api/company-launch/:id — update company
// ---------------------------------------------------------------------------
companyLaunchRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status, notes, priority, name } = req.body

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (status !== undefined) updates.status = status
    if (notes !== undefined) updates.notes = notes
    if (priority !== undefined) updates.priority = priority
    if (name !== undefined) updates.name = name

    const { data, error } = await supabase
      .from('company_launches')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'Not found' })
    return res.json(data)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/company-launch/:id — delete company
// ---------------------------------------------------------------------------
companyLaunchRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('company_launches')
      .delete()
      .eq('id', id)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(204).send()
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// ---------------------------------------------------------------------------
// GET /api/company-launch/:id/steps — list steps for a company
// ---------------------------------------------------------------------------
companyLaunchRouter.get('/:id/steps', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('company_launch_steps')
      .select('*')
      .eq('company_id', id)
      .order('created_at', { ascending: true })

    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// ---------------------------------------------------------------------------
// POST /api/company-launch/:id/steps — add step to a company
// ---------------------------------------------------------------------------
companyLaunchRouter.post('/:id/steps', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const {
      step_key, title, description, owner, category,
      estimated_days, cost_eur, prerequisites, evidence_required, external_url, notes
    } = req.body

    if (!title) {
      return res.status(400).json({ error: 'title is required' })
    }

    const { data, error } = await supabase
      .from('company_launch_steps')
      .insert({
        company_id: id,
        step_key: step_key || title.toLowerCase().replace(/\s+/g, '_').slice(0, 50),
        title,
        description: description ?? null,
        owner: owner ?? 'external',
        category: category ?? 'registration',
        estimated_days: estimated_days ?? 7,
        cost_eur: cost_eur ?? null,
        prerequisites: prerequisites ?? [],
        evidence_required: evidence_required ?? null,
        external_url: external_url ?? null,
        notes: notes ?? null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// ---------------------------------------------------------------------------
// PATCH /api/company-launch/:id/steps/:stepId — update step status
// ---------------------------------------------------------------------------
companyLaunchRouter.patch('/:id/steps/:stepId', async (req: Request, res: Response) => {
  try {
    const { id, stepId } = req.params
    const { status, notes, completed_at } = req.body

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (status !== undefined) updates.status = status
    if (notes !== undefined) updates.notes = notes
    if (completed_at !== undefined) updates.completed_at = completed_at
    else if (status === 'done') updates.completed_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('company_launch_steps')
      .update(updates)
      .eq('id', stepId)
      .eq('company_id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'Step not found' })

    // Auto-update company status based on all steps
    const { data: allSteps } = await supabase
      .from('company_launch_steps')
      .select('status')
      .eq('company_id', id)

    if (allSteps && allSteps.length > 0) {
      const doneCount = allSteps.filter(s => s.status === 'done').length
      const total = allSteps.length
      let companyStatus: string
      if (doneCount === total) companyStatus = 'operational'
      else if (doneCount > 0) companyStatus = 'in_progress'
      else companyStatus = 'not_started'

      await supabase
        .from('company_launches')
        .update({ status: companyStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
    }

    return res.json(data)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})
