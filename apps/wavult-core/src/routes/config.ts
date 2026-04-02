import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()
const sb = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// GET /api/config/founding — check if config exists + is complete
router.get('/founding', async (_req: Request, res: Response) => {
  try {
    const { data } = await sb()
      .from('founding_config')
      .select('*')
      .eq('organization_id', 'wavult-group')
      .single()
    res.json({
      exists: !!data,
      complete: !!data?.completed_at,
      locked: !!data?.locked,
      config: data?.config || null,
    })
  } catch {
    res.json({ exists: false, complete: false, locked: false, config: null })
  }
})

// POST /api/config/founding — save or update config
router.post('/founding', async (req: Request, res: Response) => {
  try {
    const { config, completed_at, completed_by, locked } = req.body
    const { data: existing } = await sb()
      .from('founding_config')
      .select('id,locked')
      .eq('organization_id', 'wavult-group')
      .single()

    if (existing?.locked) {
      return res.status(403).json({
        error: 'Configuration is locked. CEO re-authentication required to modify.',
      })
    }

    const payload = {
      organization_id: 'wavult-group',
      config,
      updated_at: new Date().toISOString(),
      ...(completed_at ? { completed_at, completed_by, locked: !!locked } : {}),
    }

    const { data, error } = existing
      ? await sb()
          .from('founding_config')
          .update(payload)
          .eq('organization_id', 'wavult-group')
          .select()
          .single()
      : await sb().from('founding_config').insert(payload).select().single()

    if (error) throw error
    res.json({ ok: true, data })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/config/autonomy/:action — check autonomy limits for a specific action
router.get('/autonomy/:action', async (req: Request, res: Response) => {
  try {
    const { data } = await sb()
      .from('founding_config')
      .select('config')
      .eq('organization_id', 'wavult-group')
      .single()
    const config = data?.config || {}
    const action = req.params.action

    const autonomyMap: Record<string, string> = {
      send_email: 'can_send_external_email',
      deploy_staging: 'can_deploy_to_staging',
      deploy_production: 'can_deploy_to_production',
      post_social: 'can_post_social_media',
      book_meeting: 'can_book_meetings',
    }

    const key = autonomyMap[action]
    const allowed = key ? config[key] === true : false
    const limit = action === 'make_payment' ? config.can_make_payments_under || 0 : null

    res.json({
      action,
      allowed,
      limit,
      requires_approval: config.requires_approval_for || [],
    })
  } catch {
    res.json({
      action: req.params.action,
      allowed: false,
      limit: null,
      requires_approval: [],
    })
  }
})

export default router
