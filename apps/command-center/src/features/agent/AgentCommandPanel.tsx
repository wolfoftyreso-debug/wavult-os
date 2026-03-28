// ─── Agent Command Panel ─────────────────────────────────────────────────────
// Live priority queue driven by Agent Claw rule engine

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
}> = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: AlertTriangle,
    dot: 'bg-red-500',
  },
  high: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: Clock,
    dot: 'bg-amber-400',
  },
  medium: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: ArrowRight,
    dot: 'bg-blue-400',
  },
  low: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-600',
    icon: Clock,
    dot: 'bg-gray-300',
  },
  info: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: CheckCircle,
    dot: 'bg-green-400',
  },
}

export function AgentCommandPanel() {
  const { tasks } = useBosTasks()
  const { queue, systemMessage } = useAgentQueue(tasks)
  const { t } = useTranslation()

  const sysConfig = severityConfig[systemMessage.severity ?? 'info']
  const SysIcon = sysConfig.icon

  return (
    <div className="space-y-2">
      {/* System status message */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${sysConfig.bg} ${sysConfig.border}`}>
        <SysIcon className={`w-3.5 h-3.5 ${sysConfig.text} flex-shrink-0`} />
        <span className={`text-xs font-medium ${sysConfig.text}`}>
          {renderAgentMessage(systemMessage, t)}
        </span>
        <Zap className="w-3 h-3 text-purple-400 ml-auto" />
      </div>

      {/* Priority queue */}
      {queue.map(({ task, agentMessage, severity }) => {
        const config = severityConfig[severity]
        const isBlocked = task.state === 'BLOCKED'

        return (
          <div
            key={task.id}
            className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border ${config.bg} ${config.border} ${isBlocked ? 'opacity-60' : ''}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot} mt-1.5 flex-shrink-0`} />
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-semibold ${config.text} truncate`}>{task.title}</p>
              <p className={`text-xs ${config.text} opacity-75 mt-0.5`}>
                {renderAgentMessage(agentMessage, t)}
              </p>
            </div>
            {isBlocked ? (
              <Lock className={`w-3 h-3 ${config.text} flex-shrink-0 mt-0.5`} />
            ) : (
              <ArrowRight className={`w-3 h-3 ${config.text} flex-shrink-0 mt-0.5`} />
            )}
          </div>
        )
      })}

      {queue.length === 0 && (
        <div className="px-3 py-3 text-center text-xs text-gray-400">
          {t('agent.system.no_tasks')}
        </div>
      )}
    </div>
  )
}
