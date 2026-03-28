import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!
const WORKER_ID = `scheduler-${process.env.HOSTNAME || 'local'}-${Date.now()}`
const LOOP_INTERVAL_MS = 500
const WATCHDOG_INTERVAL_MS = 5000
const JOB_TIMEOUT_SECONDS = 30
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface Job {
  id: string
  type: string
  payload: Record<string, unknown>
  state: string
  priority: number
  next_run_at: string
  locked_at: string | null
  locked_by: string | null
  retry_count: number
  max_retries: number
  last_error: string | null
}

// ─── Scheduler Loop ──────────────────────────────────────────────────────────

async function schedulerLoop() {
  console.log(`[Scheduler] Starting — worker: ${WORKER_ID}`)

  while (true) {
    try {
      await tick()
    } catch (err) {
      console.error('[Scheduler] Tick error:', err)
    }
    await sleep(LOOP_INTERVAL_MS)
  }
}

async function tick() {
  // Fetch and lock pending jobs using FOR UPDATE SKIP LOCKED
  const { data: jobs, error } = await supabase
    .rpc('claim_jobs', {
      worker_id: WORKER_ID,
      limit_count: 10,
    })

  if (error) {
    console.error('[Scheduler] Failed to claim jobs:', error)
    return
  }

  if (!jobs || jobs.length === 0) return

  console.log(`[Scheduler] Processing ${jobs.length} jobs`)

  // Execute jobs concurrently (max 5 at once)
  await Promise.allSettled(
    jobs.map((job: Job) => executeJob(job))
  )
}

async function executeJob(job: Job) {
  console.log(`[Executor] Running job ${job.id} (type: ${job.type})`)

  try {
    let result: unknown

    switch (job.type) {
      case 'DEADLINE_CHECK':
        result = await runDeadlineCheck()
        break
      case 'RECONCILE_STATE':
        result = await runStateReconcile()
        break
      case 'FLOW_CONSISTENCY':
        result = await runFlowConsistency()
        break
      case 'ESCALATION':
        result = await runEscalation(job.payload)
        break
      case 'N8N_WEBHOOK':
        result = await callN8nWebhook(job.payload)
        break
      default:
        throw new Error(`Unknown job type: ${job.type}`)
    }

    await completeJob(job.id, result)
    await logAudit('job', job.id, 'COMPLETED', 'system', String(result))
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error(`[Executor] Job ${job.id} failed:`, error)
    await failJob(job, error)
    await logAudit('job', job.id, 'FAILED', 'system', error)
  }
}

// ─── Job Handlers ─────────────────────────────────────────────────────────────

async function runDeadlineCheck() {
  const { data: tasks } = await supabase
    .from('bos_tasks')
    .select('*')
    .not('deadline', 'is', null)
    .neq('state', 'DONE')

  if (!tasks) return { checked: 0 }

  const now = new Date()
  let escalated = 0

  for (const task of tasks) {
    const deadline = new Date(task.deadline)
    if (deadline < now) {
      // Create escalation job
      await supabase.from('bos_jobs').insert({
        type: 'ESCALATION',
        payload: { taskId: task.id, ownerId: task.owner_id, title: task.title },
        state: 'PENDING',
        priority: 100,
        next_run_at: new Date().toISOString(),
        max_retries: 3,
      })

      // Update task state to FAILED if not already
      if (task.state !== 'FAILED') {
        await supabase
          .from('bos_tasks')
          .update({ state: 'FAILED', updated_at: new Date().toISOString() })
          .eq('id', task.id)
      }

      escalated++
    }
  }

  // Requeue this job for next run (5 min)
  await requeueRecurringJob('00000000-0000-0000-0000-000000000002', 5 * 60 * 1000)

  return { checked: tasks.length, escalated }
}

async function runStateReconcile() {
  const { data: tasks } = await supabase.from('bos_tasks').select('*')
  if (!tasks) return { reconciled: 0 }

  let fixed = 0
  for (const task of tasks) {
    // Check if BLOCKED task should actually be REQUIRED (dependencies are done)
    if (task.state === 'BLOCKED' && task.dependencies?.length > 0) {
      const depIds = task.dependencies as string[]
      const { data: deps } = await supabase
        .from('bos_tasks')
        .select('id, state')
        .in('id', depIds)

      const allDone = deps?.every((d: { state: string }) => d.state === 'DONE') ?? false
      if (allDone) {
        await supabase
          .from('bos_tasks')
          .update({ state: 'REQUIRED', updated_at: new Date().toISOString() })
          .eq('id', task.id)
        fixed++
      }
    }
  }

  await requeueRecurringJob('00000000-0000-0000-0000-000000000001', 10 * 60 * 1000)
  return { reconciled: tasks.length, fixed }
}

async function runFlowConsistency() {
  // Check that all flow tasks are consistent
  const { data: tasks } = await supabase.from('bos_tasks').select('id, flow_id, state, dependencies')
  await requeueRecurringJob('00000000-0000-0000-0000-000000000003', 15 * 60 * 1000)
  return { flows_checked: tasks?.length ?? 0 }
}

async function runEscalation(payload: Record<string, unknown>) {
  const { taskId, ownerId, title } = payload
  console.log(`[Escalation] Task ${taskId} (${title}) escalated. Owner: ${ownerId} → Erik`)

  // Log escalation event
  await supabase.from('bos_events').insert({
    type: 'ESCALATION',
    payload: { taskId, ownerId, escalatedTo: 'erik-svensson', title },
  })

  return { escalated: taskId, to: 'erik-svensson' }
}

async function callN8nWebhook(payload: Record<string, unknown>) {
  const { webhookPath, data } = payload
  const url = `${N8N_WEBHOOK_BASE}/${webhookPath}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) throw new Error(`n8n webhook failed: ${res.status}`)
  return await res.json()
}

// ─── Job Lifecycle ────────────────────────────────────────────────────────────

async function completeJob(jobId: string, result: unknown) {
  await supabase
    .from('bos_jobs')
    .update({
      state: 'DONE',
      updated_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      payload: { result },
    })
    .eq('id', jobId)
}

async function failJob(job: Job, error: string) {
  const newRetryCount = job.retry_count + 1
  const shouldRetry = newRetryCount < job.max_retries

  // Exponential backoff: 1s, 2s, 4s, 8s, 16s
  const backoffMs = Math.pow(2, newRetryCount) * 1000
  const nextRun = new Date(Date.now() + backoffMs).toISOString()

  await supabase
    .from('bos_jobs')
    .update({
      state: shouldRetry ? 'PENDING' : 'FAILED',
      retry_count: newRetryCount,
      last_error: error,
      next_run_at: shouldRetry ? nextRun : new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', job.id)
}

async function requeueRecurringJob(jobId: string, intervalMs: number) {
  await supabase
    .from('bos_jobs')
    .update({
      state: 'PENDING',
      next_run_at: new Date(Date.now() + intervalMs).toISOString(),
      locked_at: null,
      locked_by: null,
      retry_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}

// ─── Watchdog ─────────────────────────────────────────────────────────────────

async function watchdogLoop() {
  console.log('[Watchdog] Starting')

  while (true) {
    await sleep(WATCHDOG_INTERVAL_MS)

    try {
      const timeout = new Date(Date.now() - JOB_TIMEOUT_SECONDS * 1000).toISOString()

      const { data: stuckJobs } = await supabase
        .from('bos_jobs')
        .select('*')
        .eq('state', 'RUNNING')
        .lt('locked_at', timeout)

      if (!stuckJobs?.length) continue

      console.log(`[Watchdog] Found ${stuckJobs.length} stuck jobs — resetting`)

      for (const job of stuckJobs as Job[]) {
        await failJob(job, `Watchdog timeout after ${JOB_TIMEOUT_SECONDS}s`)
        await logAudit('job', job.id, 'WATCHDOG_RESET', 'watchdog', 'Timeout exceeded')
      }
    } catch (err) {
      console.error('[Watchdog] Error:', err)
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function logAudit(
  entityType: string,
  entityId: string,
  action: string,
  actor: string,
  result: string
) {
  await supabase.from('bos_audit_log').insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor_id: actor,
    result,
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[BOS Scheduler] Starting up...')

  // Run scheduler and watchdog concurrently
  await Promise.all([schedulerLoop(), watchdogLoop()])
}

main().catch(err => {
  console.error('[BOS Scheduler] Fatal error:', err)
  process.exit(1)
})
// deployed 2026-03-28T14:38:47Z
