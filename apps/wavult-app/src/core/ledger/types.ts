// ─── Wavult OS v2 — Event Ledger Types ──────────────────────────────────────────
// All data is readable. Nothing is overwritten. Every change is a new version + signature.
// This is the foundation for: revision safety, regulatory compliance, military robustness.
//
// Principles:
//   - NOTHING is deleted. Ever.
//   - NOTHING is mutated. Only new versions appended.
//   - NOTHING executes without a signed event.
//   - The LLM can READ. It can PROPOSE. It cannot WRITE or EXECUTE.

// ─── Entity (anything in the system) ─────────────────────────────────────────

export type EntityType =
  | 'invoice'
  | 'payment'
  | 'contract'
  | 'email'
  | 'decision'
  | 'task'
  | 'approval'
  | 'entity'          // Legal entity
  | 'document'
  | 'api_credential'  // Reference only — actual secret in vault
  | 'config'
  | 'identity'        // Operator identity snapshot

// ─── Versioned Event (the core primitive) ────────────────────────────────────

export interface LedgerEvent<T = unknown> {
  /** Unique event ID */
  id: string
  /** What entity this event relates to */
  entityId: string
  entityType: EntityType
  /** What happened */
  action: EventAction
  /** Version number — monotonically increasing per entity */
  version: number
  /** Previous version (null for creation events) */
  previousVersion: number | null
  /** The payload — what changed */
  payload: T
  /** Hash of previous event in chain (for integrity verification) */
  previousHash: string | null
  /** Hash of this event (SHA-256 of id + entityId + version + payload + previousHash) */
  hash: string
  /** Signature status */
  signature: SignatureRecord | null
  /** Who created this event */
  actorId: string
  actorType: 'operator' | 'system' | 'agent'
  /** Source system */
  source: string
  /** Immutable timestamp */
  createdAt: string
}

export type EventAction =
  | 'create'
  | 'update'
  | 'approve'
  | 'reject'
  | 'sign'
  | 'execute'
  | 'revoke'
  | 'escalate'
  | 'archive'

// ─── Signature ───────────────────────────────────────────────────────────────

export type SignatureMethod =
  | 'biometric'        // Face ID / Touch ID — for < threshold
  | 'bankid'           // BankID — for >= threshold
  | 'pin'              // Fallback PIN
  | 'device_trust'     // Trusted device auto-sign for low-risk

export interface SignatureRecord {
  method: SignatureMethod
  signedAt: string
  signedBy: string             // User ID
  deviceId: string             // Which device signed
  /** For BankID: the transaction reference */
  externalRef?: string
  /** Verification status */
  verified: boolean
}

// ─── Signing Gate Policy ─────────────────────────────────────────────────────

export interface SigningPolicy {
  /** Actions that always require signature */
  alwaysSign: EventAction[]
  /** Amount threshold for biometric vs BankID */
  biometricThreshold: number   // Below this → biometric OK
  bankidThreshold: number      // At or above this → BankID required
  /** Entity types that require signature for any mutation */
  protectedEntities: EntityType[]
  /** Actions that can auto-sign via device trust */
  deviceTrustActions: EventAction[]
}

// ─── Execution Request (what gets sent to the signing gate) ──────────────────

export type ExecutionStatus = 'pending_signature' | 'signed' | 'executing' | 'executed' | 'failed' | 'rejected'

export interface ExecutionRequest<T = unknown> {
  id: string
  /** The event that needs signing */
  event: LedgerEvent<T>
  /** What will happen when signed */
  effect: string
  /** Required signature method (computed from policy) */
  requiredMethod: SignatureMethod
  /** Amount (if financial) */
  amount: number | null
  /** Current status */
  status: ExecutionStatus
  /** Deadline for signing (optional) */
  expiresAt?: string
  createdAt: string
}

// ─── Audit Trail Query ───────────────────────────────────────────────────────

export interface AuditQuery {
  entityId?: string
  entityType?: EntityType
  action?: EventAction
  actorId?: string
  fromDate?: string
  toDate?: string
  limit?: number
}

// ─── Secrets Vault Reference (NEVER the actual secret) ───────────────────────

export interface VaultReference {
  /** Vault key ID — maps to encrypted storage, NEVER the actual value */
  keyId: string
  /** What type of secret this is */
  type: 'api_key' | 'password' | 'token' | 'certificate' | 'private_key'
  /** Human label */
  label: string
  /** Service this belongs to */
  service: string
  /** When it was stored */
  storedAt: string
  /** When it expires (if applicable) */
  expiresAt?: string
  /** Who has read access */
  readScope: string[]     // User IDs or role IDs
  /** Last accessed (for audit) */
  lastAccessedAt?: string
  lastAccessedBy?: string
}
