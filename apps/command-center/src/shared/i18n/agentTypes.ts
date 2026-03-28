import type { AgentSeverity } from '../../core/agent/ruleset'

export type { AgentSeverity }
export type AgentActionType = 'OPEN_TASK' | 'NAVIGATE' | 'COMPLETE_TASK' | 'ESCALATE'

export interface AgentMessage {
  key: string
  severity?: AgentSeverity
  params?: Record<string, string | number | undefined>
  action?: {
    type: AgentActionType
    targetId?: string
    targetPath?: string
  }
}

// Validator — throws if agent returns raw text instead of structured message
export function validateAgentMessage(msg: unknown): AgentMessage {
  if (typeof msg === 'string') {
    throw new Error('[Agent] Raw text not allowed. Must return translation key.')
  }
  const m = msg as AgentMessage
  if (typeof m.key !== 'string' || !m.key.startsWith('agent.')) {
    throw new Error(
      `[Agent] Invalid message format. Key must start with "agent.". Got: ${JSON.stringify(msg)}`
    )
  }
  return m
}

// Safe renderer — returns translated string, falls back to key if missing
export function renderAgentMessage(
  msg: AgentMessage,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const safeParams = msg.params
    ? Object.fromEntries(
        Object.entries(msg.params).filter(([, v]) => v !== undefined)
      ) as Record<string, string | number>
    : undefined
  return t(msg.key, safeParams)
}
