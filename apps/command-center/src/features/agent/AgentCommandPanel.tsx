// ─── Agent Command Panel ─────────────────────────────────────────────────────
// Live priority queue driven by Agent Claw rule engine

import React from 'react'
import { useBosTasks } from '../../core/state/useBosTasks'
import { useAgentQueue } from '../../core/agent/useAgentQueue'
import { useTranslation } from '../../shared/i18n/useTranslation'
import { renderAgentMessage } from '../../shared/i18n/agentTypes'
import { AlertTriangle, Clock, CheckCircle, Lock, ArrowRight, Zap } from 'lucide-react'
import type { AgentSeverity } from '../../core/agent/ruleset'

const severityConfig: Record<AgentSeverity, {
  bg: string
  border: string
  text: string
  icon: React.ComponentType<{ className?: string }>
  dot: string
  style?: React.CSSProperties
}> = {
  critical: {
    bg: '',
    border: '',
    text: '',
    icon: AlertTriangle,
    dot: '',
    style: { background: 'rgba(192,57,43,0.22)', border: '1px solid rgba(220,80,60,0.45)', color: '#FF7B6E' },
  },
  high: {
    bg: '',
    border: '',
    text: '',
    icon: Clock,
    dot: '',
    style: { background: 'rgba(230,126,34,0.18)', border: '1px solid rgba(230,126,34,0.40)', color: '#FFAD5C' },
  },
  medium: {
    bg: '',
    border: '',
    text: '',
    icon: ArrowRight,
    dot: '',
    style: { background: 'rgba(80,130,220,0.18)', border: '1px solid rgba(80,130,220,0.35)', color: '#8BBFFF' },
  },
  low: {
    bg: '',
    border: '',
    text: '',
    icon: Clock,
    dot: '',
    style: { background: 'rgba(245,240,232,0.07)', border: '1px solid rgba(245,240,232,0.15)', color: 'rgba(245,240,232,0.55)' },
  },
  info: {
    bg: '',
    border: '',
    text: '',
    icon: CheckCircle,
    dot: '',
    style: { background: 'rgba(60,180,120,0.15)', border: '1px solid rgba(60,180,120,0.30)', color: '#6FE0A8' },
  },
}

export function AgentCommandPanel() {
  const { tasks, loading, error } = useBosTasks()
  const { queue, systemMessage } = useAgentQueue(tasks)
  const { t } = useTranslation()

  const sysConfig = severityConfig[systemMessage.severity ?? 'info']
  const SysIcon = sysConfig.icon as React.ElementType

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: 'var(--color-bg-muted)', borderRadius: 8, height: 44, marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '32px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 4 }}>Agent-kö ej tillgänglig</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{error}</div>
      </div>
    )
  }

  if (queue.length === 0) {
    return (
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '32px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>Inga väntande uppgifter</div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* System status message */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={sysConfig.style}>
        <SysIcon className="w-3.5 h-3.5 flex-shrink-0" color={sysConfig.style?.color} />
        <span className="text-xs font-medium" style={{ color: sysConfig.style?.color }}>
          {renderAgentMessage(systemMessage, t)}
        </span>
        <Zap className="w-3 h-3 ml-auto" style={{ color: sysConfig.style?.color, opacity: 0.7 }} />
      </div>

      {/* Priority queue */}
      {queue.map(({ task, agentMessage, severity }) => {
        const config = severityConfig[severity]
        const isBlocked = task.state === 'BLOCKED'

        return (
          <div
            key={task.id}
            className="flex items-start gap-2.5 px-3 py-2 rounded-lg"
            style={{ ...config.style, opacity: isBlocked ? 0.6 : 1 }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
              style={{ background: config.style?.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate" style={{ color: config.style?.color }}>{task.title}</p>
              <p className="text-xs mt-0.5" style={{ color: config.style?.color, opacity: 0.75 }}>
                {renderAgentMessage(agentMessage, t)}
              </p>
            </div>
            {isBlocked ? (
              <Lock className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: config.style?.color }} />
            ) : (
              <ArrowRight className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: config.style?.color }} />
            )}
          </div>
        )
      })}

      {queue.length === 0 && (
        <div className="px-3 py-3 text-center text-xs text-[#8A8A9A]">
          {t('agent.system.no_tasks')}
        </div>
      )}
    </div>
  )
}
