export type CommandType =
  | 'restart_service'
  | 'scale_service'
  | 'rollback_service'
  | 'reroute_traffic'
  | 'kill_traffic'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

// State machine — NO jumps allowed:
// created → simulating → simulated → awaiting_approval → approved → executing → completed | failed | rolled_back
// cancelled is reachable from: created, simulated, awaiting_approval, approved
export type CommandStatus =
  | 'created'
  | 'simulating'
  | 'simulated'
  | 'awaiting_approval'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'rolled_back'

export interface CommandRequest {
  id: string
  type: CommandType
  targetNodeId: string
  requestedBy: string
  timestamp: string
  idempotency_key: string
  context: {
    incidentId?: string
    reason?: string
    intent?: string  // "Restore Checkout Stability"
  }
}

export interface CommandSimulation {
  expectedDowntimeSeconds: number
  usersAffected: number
  revenueImpactPerMinute: number
  autoRecoveryLikely: boolean
  // confidence score 0-100:
  // 85-100: historical data match + all dependencies known
  // 70-84: partial data, some uncertainty
  // 50-69: estimated, limited historical data
  // <50: never auto-approve, always require confirmation
  confidence: number
  riskLevel: RiskLevel
  steps: string[]
  rollbackPlan?: string[]  // steps to undo this command if it fails or is rolled back
}

export interface CommandExecution {
  commandId: string
  status: CommandStatus
  simulation?: CommandSimulation
  simulatedAt?: string
  approvedBy?: string
  startedAt?: string
  completedAt?: string
  result?: string
  error?: string
}

export interface Incident {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  affectedNodeIds: string[]
  rootCauseNodeId?: string
  causalChain: Array<{ nodeId: string; event: string; timestamp: string }>
  suggestedCommands: CommandType[]
  status: 'active' | 'mitigating' | 'mitigated' | 'resolved'
  detectedAt: string
}

export interface NodeResponsibility {
  nodeId: string
  primaryOwner: string
  secondaryOwner?: string
  onCall: boolean
  escalationPath: string[]
}
