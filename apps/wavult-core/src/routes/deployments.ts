/**
 * Deployment Control System
 *
 * RULES:
 * 1. No CloudFront/DNS change without a deployment record
 * 2. Every deployment requires approval from CEO or CTO
 * 3. Production changes are reversible — every state is versioned
 * 4. Rollback is one API call
 */
import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()
const sb = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

async function ensureTables() {
  await sb().rpc('exec_sql', { sql: `
    CREATE TABLE IF NOT EXISTS deployment_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      domain TEXT NOT NULL,
      version_number INT NOT NULL,
      cloudfront_distribution_id TEXT,
      s3_bucket TEXT,
      s3_key TEXT,
      origin_path TEXT,
      default_root_object TEXT,
      previous_version_id UUID,
      deployed_at TIMESTAMPTZ,
      deployed_by TEXT,
      status TEXT DEFAULT 'active',
      snapshot JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(domain, version_number)
    );

    CREATE TABLE IF NOT EXISTS deployment_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      domain TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      requested_at TIMESTAMPTZ DEFAULT NOW(),
      target_s3_bucket TEXT,
      target_s3_key TEXT,
      description TEXT,
      status TEXT DEFAULT 'pending',
      approved_by TEXT,
      approved_at TIMESTAMPTZ,
      rejected_reason TEXT,
      deployment_version_id UUID REFERENCES deployment_versions(id),
      CONSTRAINT require_approval CHECK (
        status = 'pending' OR
        (status IN ('approved','deployed') AND approved_by IS NOT NULL) OR
        (status = 'rejected' AND rejected_reason IS NOT NULL) OR
        status = 'rolled_back'
      )
    );

    CREATE INDEX IF NOT EXISTS idx_dr_domain ON deployment_requests(domain);
    CREATE INDEX IF NOT EXISTS idx_dr_status ON deployment_requests(status);
    CREATE INDEX IF NOT EXISTS idx_dv_domain ON deployment_versions(domain);
  ` }).catch(() => null)
}

// POST /api/deployments/request — request a deployment (goes to approval queue)
router.post('/request', async (req: Request, res: Response) => {
  try {
    await ensureTables()
    const { domain, target_s3_bucket, target_s3_key, description, requested_by } = req.body
    if (!domain || !requested_by) return res.status(400).json({ error: 'domain and requested_by required' })

    const { data, error } = await sb().from('deployment_requests').insert({
      domain, target_s3_bucket, target_s3_key,
      description: description || `Deploy to ${domain}`,
      requested_by, status: 'pending'
    }).select().single()
    if (error) throw error

    // Notify via audit log
    await sb().from('audit_log').insert({
      actor: requested_by, action: 'deployment_requested',
      resource_type: 'domain', resource_id: domain,
      details: { domain, target: `${target_s3_bucket}/${target_s3_key}`, request_id: data.id },
      severity: 'warning'
    }).catch(() => null)

    res.status(201).json({
      ok: true, request_id: data.id,
      message: `Deployment to ${domain} queued for approval. Awaiting CEO/CTO sign-off.`,
      status: 'pending'
    })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// GET /api/deployments/pending — all pending approvals
router.get('/pending', async (_req: Request, res: Response) => {
  try {
    await ensureTables()
    const { data } = await sb().from('deployment_requests')
      .select('*').eq('status', 'pending').order('requested_at', { ascending: true })
    res.json(data ?? [])
  } catch { res.json([]) }
})

// GET /api/deployments/:requestId/status — get request status
router.get('/:requestId/status', async (req: Request, res: Response) => {
  try {
    const { data } = await sb().from('deployment_requests')
      .select('*').eq('id', req.params.requestId).single()
    if (!data) return res.status(404).json({ error: 'Request not found' })
    res.json({ status: data.status, ...data })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// POST /api/deployments/:requestId/approve — approve and execute deployment
// REQUIRES: deploy_password known only to CEO
router.post('/:requestId/approve', async (req: Request, res: Response) => {
  try {
    await ensureTables()
    const { approved_by, deploy_password } = req.body
    if (!approved_by) return res.status(400).json({ error: 'approved_by required' })
    
    // Validate deploy password — HARD GATE
    const DEPLOY_PASSWORD = process.env.DEPLOY_PASSWORD || ''
    if (!deploy_password || deploy_password !== DEPLOY_PASSWORD) {
      // Log failed attempt
      await sb().from('audit_log').insert({
        actor: approved_by || 'unknown',
        action: 'deployment_approval_rejected_wrong_password',
        resource_type: 'deployment', resource_id: req.params.requestId,
        details: { attempted_by: approved_by, ip: req.ip },
        severity: 'critical'
      }).catch(() => null)
      return res.status(403).json({ 
        error: 'Invalid deploy password. Production deployments require the CEO deploy password.',
        logged: true
      })
    }

    const { data: request } = await sb()
      .from('deployment_requests').select('*').eq('id', req.params.requestId).single()
    if (!request) return res.status(404).json({ error: 'Request not found' })
    if (request.status !== 'pending') return res.status(400).json({ error: `Request is ${request.status}` })

    await sb().from('deployment_requests').update({
      status: 'approved', approved_by, approved_at: new Date().toISOString()
    }).eq('id', req.params.requestId)

    const DIST_MAP: Record<string, string> = {
      'wavult.com': 'E281H61AW2WQOH',
      'quixzoom.com': 'EE30B9WM5ZYM7',
      'landvex.com': 'E2M3J95HLUR89H',
    }
    const distId = DIST_MAP[request.domain]

    const { data: versions } = await sb().from('deployment_versions')
      .select('version_number').eq('domain', request.domain)
      .order('version_number', { ascending: false }).limit(1)
    const nextVersion = (versions?.[0]?.version_number || 0) + 1

    const { data: version } = await sb().from('deployment_versions').insert({
      domain: request.domain,
      version_number: nextVersion,
      cloudfront_distribution_id: distId,
      s3_bucket: request.target_s3_bucket,
      s3_key: request.target_s3_key,
      deployed_at: new Date().toISOString(),
      deployed_by: approved_by,
      status: 'active',
      snapshot: { dist_id: distId, request_id: request.id }
    }).select().single()

    await sb().from('deployment_requests').update({
      status: 'deployed', deployment_version_id: version?.id
    }).eq('id', req.params.requestId)

    await sb().from('audit_log').insert({
      actor: approved_by, action: 'deployment_approved_and_executed',
      resource_type: 'domain', resource_id: request.domain,
      details: { domain: request.domain, version: nextVersion, approved_by },
      severity: 'info'
    }).catch(() => null)

    res.json({
      ok: true, version: nextVersion, domain: request.domain,
      message: `Deployment v${nextVersion} to ${request.domain} approved by ${approved_by} and recorded.`,
      note: 'CloudFront update must be executed by DevOps pipeline with this deployment ID.'
    })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// POST /api/deployments/:requestId/reject
router.post('/:requestId/reject', async (req: Request, res: Response) => {
  try {
    const { rejected_by, reason } = req.body
    await sb().from('deployment_requests').update({
      status: 'rejected', approved_by: rejected_by,
      rejected_reason: reason || 'No reason given'
    }).eq('id', req.params.requestId)
    res.json({ ok: true, message: 'Deployment rejected' })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// POST /api/deployments/:requestId/mark-deployed — called by GitHub Actions after execution
router.post('/:requestId/mark-deployed', async (req: Request, res: Response) => {
  try {
    const { deployed_by, commit } = req.body
    const { data: request } = await sb()
      .from('deployment_requests').select('deployment_version_id, domain').eq('id', req.params.requestId).single()
    if (!request) return res.status(404).json({ error: 'Request not found' })

    if (request.deployment_version_id) {
      await sb().from('deployment_versions').update({
        snapshot: { commit, deployed_by, marked_at: new Date().toISOString() }
      }).eq('id', request.deployment_version_id)
    }

    await sb().from('audit_log').insert({
      actor: deployed_by || 'github-actions', action: 'deployment_executed_by_pipeline',
      resource_type: 'domain', resource_id: request.domain,
      details: { request_id: req.params.requestId, commit },
      severity: 'info'
    }).catch(() => null)

    res.json({ ok: true, message: 'Deployment marked as executed by pipeline' })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// POST /api/deployments/:versionId/rollback — rollback to previous version
router.post('/:versionId/rollback', async (req: Request, res: Response) => {
  try {
    const { rolled_back_by } = req.body
    if (!rolled_back_by) return res.status(400).json({ error: 'rolled_back_by required' })

    const { data: version } = await sb()
      .from('deployment_versions').select('*').eq('id', req.params.versionId).single()
    if (!version) return res.status(404).json({ error: 'Version not found' })

    const { data: prev } = await sb().from('deployment_versions')
      .select('*').eq('domain', version.domain).eq('status', 'active')
      .lt('version_number', version.version_number)
      .order('version_number', { ascending: false }).limit(1)

    await sb().from('deployment_versions').update({ status: 'rolled_back' })
      .eq('id', req.params.versionId)

    await sb().from('audit_log').insert({
      actor: rolled_back_by, action: 'deployment_rolled_back',
      resource_type: 'domain', resource_id: version.domain,
      details: {
        domain: version.domain,
        rolled_back_version: version.version_number,
        target_version: prev?.[0]?.version_number || 'none',
        rolled_back_by
      },
      severity: 'warning'
    }).catch(() => null)

    res.json({
      ok: true,
      rolled_back_version: version.version_number,
      target_version: prev?.[0]?.version_number,
      domain: version.domain,
      snapshot: prev?.[0]?.snapshot,
      message: `Rolled back ${version.domain} from v${version.version_number} to v${prev?.[0]?.version_number || 'initial'}`
    })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// GET /api/deployments/:domain/history
router.get('/:domain/history', async (req: Request, res: Response) => {
  try {
    await ensureTables()
    const { data } = await sb().from('deployment_versions')
      .select('*').eq('domain', req.params.domain)
      .order('version_number', { ascending: false }).limit(20)
    res.json(data ?? [])
  } catch { res.json([]) }
})

export default router
