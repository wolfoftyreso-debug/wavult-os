import { Router, Request, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { supabase } from '../supabase'

export const commandsRouter = Router()

// ─── RESOURCE LOCKS ──────────────────────────────────────────────────────────
// In-memory lock per node — prevents concurrent commands on same target.
// nodeId → commandId that holds the lock
const resourceLocks = new Map<string, string>()

// ─── PENDING EXECUTIONS ──────────────────────────────────────────────────────
// Tracks in-flight commands for stale simulation check and timeout enforcement.
interface PendingCommand {
  type: string
  targetNodeId: string
  simulatedAt: string
  timeoutHandle: ReturnType<typeof setTimeout>
}
const pendingCommands = new Map<string, PendingCommand>()

// ─── IDEMPOTENCY STORE ───────────────────────────────────────────────────────
// In-memory for now — swap for Redis/DB in prod
const idempotencyStore = new Map<string, object>()

// ─── COMMAND TIMEOUTS ────────────────────────────────────────────────────────
const COMMAND_TIMEOUTS: Record<string, number> = {
  restart_service:  120_000,  // 2 min
  scale_service:    300_000,  // 5 min
  rollback_service: 180_000,  // 3 min
  kill_traffic:      30_000,  // 30 sec
  reroute_traffic:   60_000,  // 1 min
}

// ─── SIMULATION ENGINE ───────────────────────────────────────────────────────

interface SimulationResult {
  expectedDowntimeSeconds: number
  usersAffected: number
  riskLevel: string
  // confidence score 0-100:
  // 85-100: historical data match + all dependencies known
  // 70-84: partial data, some uncertainty
  // 50-69: estimated, limited historical data
  // <50:   never auto-approve, always require confirmation
  confidence: number
  steps: string[]
  rollbackPlan: string[]
  autoRecoveryLikely: boolean
}

const SIMULATIONS: Record<string, SimulationResult> = {
  restart_service: {
    expectedDowntimeSeconds: 5,
    usersAffected: 3200,
    riskLevel: 'medium',
    confidence: 87,
    steps: ['Drain connections', 'Stop container', 'Pull latest image', 'Start container', 'Health check'],
    rollbackPlan: ['Register previous task definition', 'Force new deployment', 'Verify health'],
    autoRecoveryLikely: true,
  },
  scale_service: {
    expectedDowntimeSeconds: 0,
    usersAffected: 0,
    riskLevel: 'low',
    confidence: 95,
    steps: ['Register new task', 'Wait for healthy', 'Load balance'],
    rollbackPlan: ['Update desired count back to original'],
    autoRecoveryLikely: true,
  },
  rollback_service: {
    expectedDowntimeSeconds: 10,
    usersAffected: 8000,
    riskLevel: 'high',
    confidence: 72,
    steps: ['Identify previous task definition', 'Stop current', 'Deploy previous', 'Verify health'],
    rollbackPlan: ['Re-deploy current task definition', 'Monitor for 5 minutes'],
    autoRecoveryLikely: false,
  },
  reroute_traffic: {
    expectedDowntimeSeconds: 2,
    usersAffected: 1000,
    riskLevel: 'medium',
    confidence: 80,
    steps: ['Update ALB listener rule', 'Verify new target group health', 'Monitor latency'],
    rollbackPlan: ['Revert ALB listener rule to original target group'],
    autoRecoveryLikely: true,
  },
  kill_traffic: {
    expectedDowntimeSeconds: 999,
    usersAffected: 50000,
    riskLevel: 'critical',
    confidence: 99,
    steps: ['Remove target group from ALB', 'Return 503 to all users'],
    rollbackPlan: ['Re-attach target group to ALB', 'Verify health checks pass', 'Confirm traffic resumes'],
    autoRecoveryLikely: false,
  },
}

async function simulateCommand(command: Record<string, unknown>): Promise<SimulationResult> {
  return SIMULATIONS[command.type as string] ?? SIMULATIONS.restart_service
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// POST /v1/commands — create + simulate command
commandsRouter.post('/', async (req: Request, res: Response) => {
  const { type, targetNodeId, requestedBy, context } = req.body
  const idempotencyKey = (req.headers['idempotency-key'] as string | undefined) ?? undefined

  if (!type || !targetNodeId || !requestedBy) {
    return res.status(400).json({ error: 'MISSING_PARAMS' })
  }

  // ── Idempotency check ──
  if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
    console.log(`[Commands] Idempotent replay: ${idempotencyKey}`)
    return res.json(idempotencyStore.get(idempotencyKey))
  }

  const now = new Date().toISOString()
  const command = {
    id: uuid(),
    type,
    targetNodeId,
    requestedBy,
    context: context || {},
    idempotency_key: idempotencyKey ?? uuid(),
    status: 'simulating',
    timestamp: now,
    simulatedAt: now,
  }

  // ── DB audit log ──
  try {
    await supabase.from('system_commands').insert({
      id: command.id,
      type: command.type,
      target_node_id: command.targetNodeId,
      requested_by: command.requestedBy,
      context: command.context,
      idempotency_key: command.idempotency_key,
      status: command.status,
    })
  } catch {
    console.log('[Commands] DB insert skipped (table not provisioned):', command.id)
  }

  const simulation = await simulateCommand(command)

  console.log(`[Command] ${command.type} on ${command.targetNodeId} by ${command.requestedBy}`, {
    commandId: command.id,
    risk: simulation.riskLevel,
    confidence: simulation.confidence,
  })

  const result = { command: { ...command, status: 'simulated' }, simulation }

  // ── Store idempotency result ──
  if (idempotencyKey) {
    idempotencyStore.set(idempotencyKey, result)
  }

  res.json(result)
})

// POST /v1/commands/:id/execute — execute after approval
commandsRouter.post('/:id/execute', async (req: Request, res: Response) => {
  const { id } = req.params
  const { approvedBy, type, targetNodeId, simulatedAt } = req.body

  if (!approvedBy) {
    return res.status(400).json({ error: 'MISSING_APPROVED_BY' })
  }

  // ── Resource lock check ──
  const currentLock = resourceLocks.get(targetNodeId)
  if (currentLock && currentLock !== id) {
    return res.status(409).json({
      error: 'RESOURCE_LOCKED',
      message: `Node ${targetNodeId} is already being modified by command ${currentLock}`,
      lockedBy: currentLock,
    })
  }

  // ── Stale simulation guard — block if simulation is older than 60 seconds ──
  const simTimestamp = simulatedAt || pendingCommands.get(id)?.simulatedAt
  if (simTimestamp) {
    const simAge = Date.now() - new Date(simTimestamp).getTime()
    if (simAge > 60_000) {
      return res.status(409).json({
        error: 'STALE_SIMULATION',
        message: 'Simulation is older than 60 seconds. Re-simulate before executing.',
        simulatedAt: simTimestamp,
        ageMs: simAge,
      })
    }
  }

  // ── Acquire resource lock ──
  resourceLocks.set(targetNodeId, id)

  const commandType = type || pendingCommands.get(id)?.type || 'restart_service'
  const timeoutMs = COMMAND_TIMEOUTS[commandType] ?? 120_000

  console.log(`[Command] EXECUTE: ${id} approved by ${approvedBy} (timeout: ${timeoutMs / 1000}s)`)

  // ── Timeout watchdog — mark FAILED and release lock if not completed in time ──
  const timeoutHandle = setTimeout(() => {
    console.error(`[Command] TIMEOUT: ${id} exceeded ${timeoutMs / 1000}s for ${commandType} on ${targetNodeId}`)
    resourceLocks.delete(targetNodeId)
    pendingCommands.delete(id)
    // In production: update DB status to 'failed', emit event to notify operator
  }, timeoutMs)

  pendingCommands.set(id, {
    type: commandType,
    targetNodeId,
    simulatedAt: simTimestamp || new Date().toISOString(),
    timeoutHandle,
  })

  // TODO: Route to Action Engine → AWS
  // For now: log only (safe dummy execution), then immediately complete
  clearTimeout(timeoutHandle)
  pendingCommands.delete(id)
  resourceLocks.delete(targetNodeId)

  res.json({
    commandId: id,
    status: 'completed',
    result: 'Command logged (Action Engine not yet connected to AWS)',
    approvedBy,
    executedAt: new Date().toISOString(),
  })
})

// GET /v1/commands — list recent commands
commandsRouter.get('/', async (_req: Request, res: Response) => {
  res.json({ commands: [] })
})
