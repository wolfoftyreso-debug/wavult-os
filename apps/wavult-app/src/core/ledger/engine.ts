// ─── Wavult OS v2 — Event Ledger Engine ─────────────────────────────────────────
// Append-only event store. Nothing mutated. Everything versioned. Everything hashable.
//
// Access model:
//   READ:    Full access (indexed, searchable)
//   WRITE:   Zero direct write — only append via this engine
//   EXECUTE: Only via signed events through the signing gate
//
// The LLM can propose. It cannot execute.

import type {
  LedgerEvent, EntityType, EventAction, SignatureRecord,
  SigningPolicy, SignatureMethod, ExecutionRequest,
  AuditQuery, VaultReference,
} from './types'

// ─── Default Signing Policy ──────────────────────────────────────────────────

export const DEFAULT_SIGNING_POLICY: SigningPolicy = {
  alwaysSign: ['execute', 'approve', 'sign', 'revoke'],
  biometricThreshold: 1000,   // < 1000 SEK → biometric OK
  bankidThreshold: 1000,      // >= 1000 SEK → BankID required
  protectedEntities: ['payment', 'contract', 'api_credential', 'entity'],
  deviceTrustActions: ['create', 'update', 'archive'],
}

// ─── In-Memory Ledger (production: Supabase table with append-only RLS) ─────

let ledger: LedgerEvent[] = []
let executionQueue: ExecutionRequest[] = []
const vaultRegistry: VaultReference[] = []

// ─── Hash computation (simplified — production: crypto.subtle.digest) ────────

async function computeHash(data: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(data)
    const buffer = await crypto.subtle.digest('SHA-256', encoded)
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
  // Fallback for environments without crypto.subtle
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

// ─── Core: Append Event ──────────────────────────────────────────────────────

export async function appendEvent<T>(
  entityId: string,
  entityType: EntityType,
  action: EventAction,
  payload: T,
  actorId: string,
  actorType: 'operator' | 'system' | 'agent' = 'operator',
  source: string = 'wavult-app',
): Promise<LedgerEvent<T>> {
  // Get previous version for this entity
  const entityEvents = ledger.filter(e => e.entityId === entityId)
  const previousEvent = entityEvents[entityEvents.length - 1] || null
  const version = previousEvent ? previousEvent.version + 1 : 1

  const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  // Compute hash
  const hashInput = JSON.stringify({
    id, entityId, version,
    payload,
    previousHash: previousEvent?.hash || null,
  })
  const hash = await computeHash(hashInput)

  const event: LedgerEvent<T> = {
    id,
    entityId,
    entityType,
    action,
    version,
    previousVersion: previousEvent?.version || null,
    payload,
    previousHash: previousEvent?.hash || null,
    hash,
    signature: null,
    actorId,
    actorType,
    source,
    createdAt: new Date().toISOString(),
  }

  ledger.push(event)
  return event
}

// ─── Signing Gate ────────────────────────────────────────────────────────────

export function determineSignatureMethod(
  action: EventAction,
  entityType: EntityType,
  amount: number | null,
  policy: SigningPolicy = DEFAULT_SIGNING_POLICY,
): SignatureMethod | null {
  // Check if action requires any signature
  const needsSign = policy.alwaysSign.includes(action)
    || policy.protectedEntities.includes(entityType)

  if (!needsSign) return null

  // Check if device trust is sufficient
  if (policy.deviceTrustActions.includes(action) && !amount) {
    return 'device_trust'
  }

  // Financial threshold
  if (amount !== null) {
    if (amount >= policy.bankidThreshold) return 'bankid'
    return 'biometric'
  }

  return 'biometric'
}

export async function createExecutionRequest<T>(
  event: LedgerEvent<T>,
  effect: string,
  amount: number | null = null,
  policy: SigningPolicy = DEFAULT_SIGNING_POLICY,
): Promise<ExecutionRequest<T>> {
  const requiredMethod = determineSignatureMethod(
    event.action, event.entityType, amount, policy
  ) || 'biometric'

  const request: ExecutionRequest<T> = {
    id: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    event,
    effect,
    requiredMethod,
    amount,
    status: 'pending_signature',
    createdAt: new Date().toISOString(),
  }

  executionQueue.push(request)
  return request
}

export async function signExecution(
  requestId: string,
  method: SignatureMethod,
  signedBy: string,
  deviceId: string,
  externalRef?: string,
): Promise<ExecutionRequest | null> {
  const request = executionQueue.find(r => r.id === requestId)
  if (!request || request.status !== 'pending_signature') return null

  // Verify method meets minimum requirement
  const methodRank: Record<SignatureMethod, number> = {
    device_trust: 1, pin: 2, biometric: 3, bankid: 4,
  }
  if (methodRank[method] < methodRank[request.requiredMethod]) {
    return null // Insufficient signature method
  }

  const signature: SignatureRecord = {
    method,
    signedAt: new Date().toISOString(),
    signedBy,
    deviceId,
    externalRef,
    verified: true,
  }

  // Update the event with signature
  request.event.signature = signature
  request.status = 'signed'

  // Re-append with signature
  await appendEvent(
    request.event.entityId,
    request.event.entityType,
    'sign',
    { originalEventId: request.event.id, signature },
    signedBy,
    'operator',
    'signing-gate',
  )

  return request
}

export function executeSignedRequest(requestId: string): ExecutionRequest | null {
  const request = executionQueue.find(r => r.id === requestId)
  if (!request || request.status !== 'signed') return null

  request.status = 'executing'

  // In production: dispatch to the actual execution layer
  // For now: mark as executed
  request.status = 'executed'

  return request
}

export function rejectExecution(requestId: string, _reason: string): ExecutionRequest | null {
  const request = executionQueue.find(r => r.id === requestId)
  if (!request || request.status !== 'pending_signature') return null

  request.status = 'rejected'
  return request
}

// ─── Query: Audit Trail ──────────────────────────────────────────────────────

export function queryLedger(query: AuditQuery): LedgerEvent[] {
  let results = [...ledger]

  if (query.entityId) results = results.filter(e => e.entityId === query.entityId)
  if (query.entityType) results = results.filter(e => e.entityType === query.entityType)
  if (query.action) results = results.filter(e => e.action === query.action)
  if (query.actorId) results = results.filter(e => e.actorId === query.actorId)
  if (query.fromDate) results = results.filter(e => e.createdAt >= query.fromDate!)
  if (query.toDate) results = results.filter(e => e.createdAt <= query.toDate!)

  results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  if (query.limit) results = results.slice(0, query.limit)

  return results
}

export function getEntityHistory(entityId: string): LedgerEvent[] {
  return ledger
    .filter(e => e.entityId === entityId)
    .sort((a, b) => a.version - b.version)
}

export function getLatestVersion(entityId: string): LedgerEvent | null {
  const history = getEntityHistory(entityId)
  return history[history.length - 1] || null
}

export function getPendingExecutions(): ExecutionRequest[] {
  return executionQueue.filter(r => r.status === 'pending_signature')
}

// ─── Vault (reference only — never actual secrets) ───────────────────────────

export function registerVaultEntry(ref: VaultReference): void {
  vaultRegistry.push(ref)
}

export function getVaultEntries(service?: string): VaultReference[] {
  if (service) return vaultRegistry.filter(v => v.service === service)
  return [...vaultRegistry]
}

export function recordVaultAccess(keyId: string, accessedBy: string): void {
  const entry = vaultRegistry.find(v => v.keyId === keyId)
  if (entry) {
    entry.lastAccessedAt = new Date().toISOString()
    entry.lastAccessedBy = accessedBy
  }
}

// ─── Integrity Verification ──────────────────────────────────────────────────

export async function verifyChainIntegrity(entityId: string): Promise<{
  valid: boolean
  brokenAt?: number
}> {
  const history = getEntityHistory(entityId)

  for (let i = 1; i < history.length; i++) {
    const current = history[i]
    const previous = history[i - 1]

    if (current.previousHash !== previous.hash) {
      return { valid: false, brokenAt: current.version }
    }

    if (current.previousVersion !== previous.version) {
      return { valid: false, brokenAt: current.version }
    }
  }

  return { valid: true }
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export function getLedgerStats(): {
  totalEvents: number
  pendingSignatures: number
  entitiesTracked: number
  vaultEntries: number
} {
  const entityIds = new Set(ledger.map(e => e.entityId))
  return {
    totalEvents: ledger.length,
    pendingSignatures: executionQueue.filter(r => r.status === 'pending_signature').length,
    entitiesTracked: entityIds.size,
    vaultEntries: vaultRegistry.length,
  }
}
