// ─── Task Engine — Image Capture → Validation → Instant Payout ──────────────

import { useState } from 'react'
import { SAMPLE_TASKS, TASK_EVENT_FLOW, LEVELS, type Task, type TaskStatus } from './walletOsData'

const STATUS_COLOR: Record<TaskStatus, string> = {
  available: '#10B981', claimed: '#22D3EE', 'in-progress': '#F59E0B',
  validating: '#8B5CF6', completed: '#10B981', rejected: '#EF4444', expired: '#6B7280',
}

const TYPE_COLOR: Record<string, string> = {
  'photo-capture': '#0EA5E9', 'data-collection': '#F59E0B',
  verification: '#8B5CF6', survey: '#10B981', 'ir-contribution': '#EC4899',
}

function TaskCard({ task, isExpanded, onToggle }: { task: Task; isExpanded: boolean; onToggle: () => void }) {
  const typeColor = TYPE_COLOR[task.type] ?? '#6B7280'
  const levelDef = LEVELS.find(l => l.level === task.requiredLevel)

  return (
    <div className="rounded-xl border transition-all"
      style={{
        borderColor: isExpanded ? typeColor + '40' : 'rgba(255,255,255,0.06)',
        background: isExpanded ? typeColor + '04' : 'rgba(255,255,255,0.02)',
      }}>
      <button onClick={onToggle} className="w-full text-left px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: typeColor + '20', color: typeColor }}>
            {task.type === 'photo-capture' ? '📷' : task.type === 'survey' ? '📋' : '🔍'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{task.title}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                style={{ background: typeColor + '18', color: typeColor }}>{task.type}</span>
              {task.streakEligible && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-[#F59E0B15] text-[#F59E0B] font-mono">STREAK</span>
              )}
            </div>
            <div className="text-[10px] text-gray-600 mt-0.5">{task.location.address}</div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <div className="text-sm font-bold text-[#10B981] font-mono">{task.payout} {task.currency}</div>
              <div className="text-[9px] text-gray-600">+{task.xpReward} XP</div>
            </div>
            {levelDef && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                style={{ background: levelDef.color + '15', color: levelDef.color }}>
                L{task.requiredLevel}+
              </span>
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 border-t border-white/[0.04] pt-3 space-y-3">
          <p className="text-xs text-gray-400">{task.description}</p>
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
              <div className="text-[10px] text-gray-600">Images Required</div>
              <div className="text-sm font-bold text-white">{task.requiredImages}</div>
            </div>
            <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
              <div className="text-[10px] text-gray-600">Time Limit</div>
              <div className="text-sm font-bold text-white">{task.timeLimit} min</div>
            </div>
            <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
              <div className="text-[10px] text-gray-600">Validation</div>
              <div className="text-sm font-bold text-white">{task.validationMethod}</div>
            </div>
            <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
              <div className="text-[10px] text-gray-600">Radius</div>
              <div className="text-sm font-bold text-white">{task.location.radius}m</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {task.tags.map(tag => (
              <span key={tag} className="text-[9px] px-2 py-0.5 rounded-lg bg-white/[0.04] text-gray-500 font-mono">#{tag}</span>
            ))}
          </div>
          {task.demandSource && (
            <div className="text-[10px] text-gray-600 bg-white/[0.02] rounded-lg px-3 py-2 border border-white/[0.04]">
              Demand: {task.demandSource}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function TaskEngineView() {
  const [expandedId, setExpandedId] = useState<string | null>('task-1')

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-sm font-bold text-white">Task Engine</h2>
          <p className="text-[10px] text-gray-600 mt-0.5">Claim → Capture → Validate → Instant Payout</p>
        </div>

        {/* Event flow pipeline */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Event Pipeline</h3>
          <div className="flex flex-wrap gap-0">
            {TASK_EVENT_FLOW.map((evt, i) => (
              <div key={evt.event} className="flex items-center">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg border"
                  style={{ borderColor: evt.color + '30', background: evt.color + '08' }}>
                  <span className="text-[10px] font-mono font-bold" style={{ color: evt.color }}>{i + 1}</span>
                  <span className="text-[9px] text-gray-400">{evt.event}</span>
                </div>
                {i < TASK_EVENT_FLOW.length - 1 && <span className="text-gray-700 mx-0.5 text-[10px]">→</span>}
              </div>
            ))}
          </div>
          <div className="text-[10px] text-gray-700 mt-2 font-mono">
            LEDGER: DEBIT Platform.Escrow → CREDIT User.Wallet (milliseconds)
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="text-xs text-gray-600 mb-1">Available Tasks</div>
            <div className="text-2xl font-bold text-white">{SAMPLE_TASKS.length}</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="text-xs text-gray-600 mb-1">Total Payout</div>
            <div className="text-2xl font-bold text-[#10B981] font-mono">
              {SAMPLE_TASKS.reduce((s, t) => s + t.payout, 0)} SEK
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="text-xs text-gray-600 mb-1">Total XP</div>
            <div className="text-2xl font-bold text-[#F59E0B] font-mono">
              {SAMPLE_TASKS.reduce((s, t) => s + t.xpReward, 0)}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="text-xs text-gray-600 mb-1">Streak Eligible</div>
            <div className="text-2xl font-bold text-[#EC4899]">
              {SAMPLE_TASKS.filter(t => t.streakEligible).length}
            </div>
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-2">
          {SAMPLE_TASKS.map(task => (
            <TaskCard key={task.id} task={task} isExpanded={expandedId === task.id}
              onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}
