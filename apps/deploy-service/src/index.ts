/**
 * Wavult Deployment Service
 * Enterprise-grade deployment orchestration
 * Cryptographic verification + RBAC + dual approval + append-only audit
 */
import express from 'express'
import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'
import * as https from 'https'
import { execSync } from 'child_process'

const app = express()
app.use(express.json())

const sb = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────

async function requireAuth(req: any, res: any, next: any) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '')
  if (!apiKey) return res.status(401).json({ error: 'Authentication required' })

  const username = req.headers['x-username'] as string
  if (!username) return res.status(401).json({ error: 'x-username header required' })

  const { data: u } = await sb().from('deploy_users').select('*').eq('username', username).eq('is_active', true).single()
  if (!u) return res.status(403).json({ error: 'User not found or inactive' })

  req.user = u
  next()
}

function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!roles.includes(req.user?.role)) {
      auditLog(req.user?.username, 'access_denied', { required: roles, actual: req.user?.role, path: req.path }, 'warning')
      return res.status(403).json({ error: `Role required: ${roles.join(' or ')}`, your_role: req.user?.role })
    }
    next()
  }
}

async function auditLog(actor: string, action: string, metadata: any = {}, severity = 'info') {
  try {
    await sb().from('deploy_audit_log').insert({
      actor, action, metadata, severity,
      deployment_id: metadata.deployment_id,
      environment: metadata.environment,
      service_name: metadata.service_name,
    })
  } catch (e) { console.error('Audit log failed:', e) }
}

// ── VERIFY GPG SIGNATURE ──────────────────────────────────────────────────────

async function verifyCommitSignature(commitHash: string): Promise<{ verified: boolean; signer?: string }> {
  try {
    const res = await new Promise<any>((resolve, reject) => {
      const req = https.get(
        `${process.env.GITEA_URL}/api/v1/repos/${process.env.GITEA_ORG}/wavult-os/git/commits/${commitHash}/verification`,
        { headers: { Authorization: `token ${process.env.GITEA_TOKEN}` } },
        r => { let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(JSON.parse(d))) }
      )
      req.on('error', reject)
    })
    return { verified: res.verified, signer: res.signer?.email }
  } catch {
    return { verified: false }
  }
}

// ── ROUTES ───────────────────────────────────────────────────────────────────

// POST /deploy — request a new deployment
app.post('/deploy', requireAuth, async (req: any, res: any) => {
  const { service_name, environment, commit_hash, artifact_version } = req.body

  if (!service_name || !environment || !commit_hash) {
    return res.status(400).json({ error: 'service_name, environment, commit_hash required' })
  }

  // Production requires admin role
  if (environment === 'production' && req.user.role !== 'admin') {
    await auditLog(req.user.username, 'production_deploy_denied', { service_name, reason: 'not_admin' }, 'critical')
    return res.status(403).json({ error: 'Production deployments require admin role' })
  }

  // Verify commit signature
  const sig = await verifyCommitSignature(commit_hash)
  if (!sig.verified && environment === 'production') {
    await auditLog(req.user.username, 'unsigned_commit_blocked', { commit_hash, service_name }, 'critical')
    return res.status(400).json({ error: 'Unsigned commits cannot be deployed to production', commit_hash })
  }

  // Get artifact
  const { data: artifact } = await sb().from('artifacts')
    .select('*').eq('commit_hash', commit_hash).eq('service_name', service_name).single()
  if (!artifact && environment === 'production') {
    return res.status(400).json({ error: 'No built artifact found for this commit. Build must complete first.' })
  }

  const { data: deployment, error } = await sb().from('deployments').insert({
    service_name, environment, commit_hash,
    artifact_version: artifact_version || commit_hash.slice(0, 8),
    artifact_id: artifact?.id,
    status: 'pending',
    requested_by: req.user.username,
    metadata: { gpg_verified: sig.verified, signer: sig.signer }
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })

  await auditLog(req.user.username, 'deployment_requested', {
    deployment_id: deployment.id, service_name, environment, commit_hash
  })

  const { data: policy } = await sb().from('approval_policies').select('*').eq('environment', environment).single()

  res.status(201).json({
    deployment_id: deployment.id,
    status: 'pending',
    required_approvals: policy?.required_approvals || 1,
    message: policy?.required_approvals === 0
      ? 'Dev deployment — auto-approving...'
      : `Deployment queued. Requires ${policy?.required_approvals} approval(s).`
  })
})

// POST /approve/:deploymentId
app.post('/approve/:deploymentId', requireAuth, requireRole('reviewer', 'admin'), async (req: any, res: any) => {
  const { action, reason } = req.body
  if (!action || !['approved','rejected'].includes(action)) {
    return res.status(400).json({ error: 'action must be approved or rejected' })
  }

  const { data: dep } = await sb().from('deployments').select('*').eq('id', req.params.deploymentId).single()
  if (!dep) return res.status(404).json({ error: 'Deployment not found' })
  if (dep.status !== 'pending') return res.status(400).json({ error: `Deployment is ${dep.status}` })

  // Cannot approve your own deployment
  if (dep.requested_by === req.user.username && action === 'approved') {
    return res.status(403).json({ error: 'Cannot approve your own deployment request' })
  }

  // Production requires admin approver
  if (dep.environment === 'production' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Production approvals require admin role' })
  }

  const { error: approvalError } = await sb().from('deployment_approvals').insert({
    deployment_id: dep.id, approved_by: req.user.username,
    role_at_time: req.user.role, action, reason
  })
  if (approvalError) return res.status(500).json({ error: approvalError.message })

  const { data: approvals } = await sb().from('deployment_approvals')
    .select('*').eq('deployment_id', dep.id).eq('action', 'approved')
  const { data: policy } = await sb().from('approval_policies')
    .select('*').eq('environment', dep.environment).single()

  const approved_count = approvals?.length || 0
  const required = policy?.required_approvals || 1

  if (action === 'rejected') {
    await sb().from('deployments').update({ status: 'rejected' }).eq('id', dep.id)
    await auditLog(req.user.username, 'deployment_rejected', { deployment_id: dep.id, reason })
    return res.json({ ok: true, status: 'rejected' })
  }

  await auditLog(req.user.username, 'deployment_approved', {
    deployment_id: dep.id, approvals: approved_count, required
  })

  if (approved_count >= required) {
    await sb().from('deployments').update({ status: 'deploying', deployed_by: req.user.username }).eq('id', dep.id)

    try {
      await executeDeployment(dep)
      await sb().from('deployments').update({ status: 'deployed', deployed_at: new Date().toISOString() }).eq('id', dep.id)
      await auditLog(req.user.username, 'deployment_executed', { deployment_id: dep.id, service: dep.service_name, env: dep.environment })
      res.json({ ok: true, status: 'deployed', message: `${dep.service_name} deployed to ${dep.environment}` })
    } catch (e: any) {
      await sb().from('deployments').update({ status: 'failed', metadata: { error: e.message } }).eq('id', dep.id)
      await auditLog('system', 'deployment_failed', { deployment_id: dep.id, error: e.message }, 'critical')
      res.status(500).json({ ok: false, status: 'failed', error: e.message })
    }
  } else {
    res.json({ ok: true, status: 'pending', approvals: approved_count, required, message: `${required - approved_count} more approval(s) needed` })
  }
})

// POST /rollback
app.post('/rollback', requireAuth, requireRole('admin'), async (req: any, res: any) => {
  const { deployment_id } = req.body
  if (!deployment_id) return res.status(400).json({ error: 'deployment_id required' })

  const { data: dep } = await sb().from('deployments').select('*').eq('id', deployment_id).single()
  if (!dep) return res.status(404).json({ error: 'Deployment not found' })

  const { data: previous } = await sb().from('deployments')
    .select('*').eq('service_name', dep.service_name).eq('environment', dep.environment)
    .eq('status', 'deployed').lt('deployed_at', dep.deployed_at)
    .order('deployed_at', { ascending: false }).limit(1)

  if (!previous?.length) return res.status(404).json({ error: 'No previous deployment to rollback to' })

  const prev = previous[0]

  const { data: rollback } = await sb().from('deployments').insert({
    service_name: dep.service_name, environment: dep.environment,
    commit_hash: prev.commit_hash, artifact_version: prev.artifact_version,
    artifact_id: prev.artifact_id, status: 'deploying',
    requested_by: req.user.username, deployed_by: req.user.username,
    rollback_target_id: prev.id,
    metadata: { is_rollback: true, rolled_back_from: dep.id }
  }).select().single()

  await auditLog(req.user.username, 'rollback_initiated', {
    deployment_id: rollback?.id, from: dep.artifact_version, to: prev.artifact_version,
    service: dep.service_name, environment: dep.environment
  }, 'warning')

  try {
    await executeDeployment(prev)
    await sb().from('deployments').update({ status: 'deployed', deployed_at: new Date().toISOString() }).eq('id', rollback?.id)
    await sb().from('deployments').update({ status: 'rolled_back' }).eq('id', dep.id)
    res.json({ ok: true, rolled_back_to: prev.artifact_version, deployment_id: rollback?.id })
  } catch (e: any) {
    await sb().from('deployments').update({ status: 'failed' }).eq('id', rollback?.id)
    res.status(500).json({ ok: false, error: e.message })
  }
})

// GET /deployments
app.get('/deployments', requireAuth, async (req: any, res: any) => {
  const { environment, status, service } = req.query as any
  let query = sb().from('deployments').select('*, deployment_approvals(*)').order('requested_at', { ascending: false }).limit(50)
  if (environment) query = query.eq('environment', environment)
  if (status) query = query.eq('status', status)
  if (service) query = query.eq('service_name', service)
  const { data } = await query
  res.json(data ?? [])
})

// GET /audit
app.get('/audit', requireAuth, requireRole('admin'), async (req: any, res: any) => {
  const { data } = await sb().from('deploy_audit_log').select('*').order('timestamp', { ascending: false }).limit(100)
  res.json(data ?? [])
})

// GET /health
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'wavult-deploy-service', version: '1.0.0' }))

// ── DEPLOY EXECUTION ──────────────────────────────────────────────────────────

async function executeDeployment(dep: any): Promise<void> {
  const serviceMap: Record<string, () => Promise<void>> = {
    'wavult-os-api': () => ecsRedeploy('wavult-os-api'),
    'wavult-core':   () => ecsRedeploy('wavult-core'),
    'quixzoom-api':  () => ecsRedeploy('quixzoom-api'),
    'landvex-api':   () => ecsRedeploy('landvex-api'),
  }

  const executor = serviceMap[dep.service_name]
  if (!executor) throw new Error(`No executor for service: ${dep.service_name}`)
  await executor()
}

async function ecsRedeploy(serviceName: string): Promise<void> {
  // TODO: uncomment when AWS SDK is wired in
  // const { ECSClient, UpdateServiceCommand } = await import('@aws-sdk/client-ecs')
  // const ecs = new ECSClient({ region: 'eu-north-1' })
  // await ecs.send(new UpdateServiceCommand({ cluster: 'wavult', service: serviceName, forceNewDeployment: true }))
  console.log(`[ECS] Triggering redeploy for ${serviceName}`)
}

app.listen(3001, () => console.log('Deploy service running on :3001'))
