// ─── Mission Control — BOS Primary Dashboard ────────────────────────────────
// Deterministic. State-driven. Every element has a reason to exist.

import React, { useMemo } from 'react'
import {
  AlertTriangle, Clock, CheckCircle, Lock,
  Building2, DollarSign, Globe, Users, TrendingUp,
} from 'lucide-react'
import { FLOWS } from '../../core/state/taskRegistry'
import {
  resolveTaskState,
  type Task,
  type Flow,
} from '../../core/state/stateEngine'
import { useBosTasks } from '../../core/state/useBosTasks'
import { checkEscalations } from '../../core/state/escalationEngine'
import { useTranslation } from '../../shared/i18n/useTranslation'
import {
  buildTaskViewModel,
  buildSystemViewModel,
} from '../../shared/design-system/viewModels'
import { TaskCard } from '../../shared/design-system/TaskCard'

// ─── Flow Progress Card ───────────────────────────────────────────────────────

function FlowCard({ flow, allTasks }: { flow: Flow; allTasks: Task[] }) {
  const { t } = useTranslation()
  const flowTasks = flow.tasks.map(id => allTasks.find(t => t.id === id)).filter(Boolean) as Task[]
  const doneTasks = flowTasks.filter(t => t.state === 'DONE')
  const progress = flowTasks.length > 0 ? (doneTasks.length / flowTasks.length) * 100 : 0

  const nextTask = flowTasks.find(t => {
    const effective = resolveTaskState(t, allTasks)
    return effective !== 'DONE' && effective !== 'BLOCKED'
  })

  const moduleColors: Record<string, string> = {
    legal: 'bg-purple-50 text-purple-700',
    finance: 'bg-emerald-50 text-emerald-700',
    tech: 'bg-blue-50 text-blue-700',
    operations: 'bg-amber-50 text-amber-700',
    hr: 'bg-pink-50 text-pink-700',
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">{flow.title}</span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded ${moduleColors[flow.module] ?? 'bg-gray-100 text-gray-600'}`}>
            {flow.module.toUpperCase()}
          </span>
        </div>
        <span className="text-xs font-mono text-gray-500">
          {doneTasks.length}/{flowTasks.length} {t('flow.done_count')}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-3">{flow.description}</p>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
        <div
          className={`h-1.5 rounded-full transition-all ${
            progress === 100 ? 'bg-emerald-500' :
            progress > 0 ? 'bg-blue-500' :
            'bg-gray-300'
          }`}
          style={{ width: `${Math.max(progress, 2)}%` }}
        />
      </div>

      {nextTask && (
        <div className="text-xs text-gray-600">
          <span className="text-gray-400 font-mono">{t('flow.next_step')}: </span>
          {nextTask.title}
        </div>
      )}

      {!nextTask && doneTasks.length < flowTasks.length && (
        <div className="flex items-center gap-1 text-xs text-gray-400 font-mono">
          <Lock className="w-3 h-3" />
          {t('flow.all_blocked')}
        </div>
      )}
    </div>
  )
}

// ─── System Health Indicator ──────────────────────────────────────────────────

interface HealthItem {
  label: string
  value: string
  status: 'red' | 'yellow' | 'green'
  icon: React.ComponentType<{ className?: string }>
}

function HealthIndicator({ item }: { item: HealthItem }) {
  const colors = {
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-amber-50 border-amber-200 text-amber-700',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  }
  const dotColors = {
    red: 'bg-red-500',
    yellow: 'bg-amber-500',
    green: 'bg-emerald-500',
  }

  return (
    <div className={`flex flex-col gap-1 p-3 rounded-xl border ${colors[item.status]}`}>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColors[item.status]}`} />
        <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-xs font-medium">{item.label}</span>
      </div>
      <span className="text-xs font-mono font-semibold">{item.value}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MissionControl() {
  const { tasks: TASKS, loading, updateTaskState } = useBosTasks()
  const { t } = useTranslation()

  const sysVM = useMemo(() => buildSystemViewModel(TASKS), [TASKS])

  const criticalVMs = useMemo(() =>
    TASKS
      .filter(t => t.priority === 'critical' && t.state !== 'DONE')
      .map(t => buildTaskViewModel(t, TASKS))
      .sort((a, b) => {
        if (!a.isBlocked && b.isBlocked) return -1
        if (a.isBlocked && !b.isBlocked) return 1
        return 0
      }),
    [TASKS]
  )

  const highVMs = useMemo(() =>
    TASKS
      .filter(t => t.priority === 'high' && t.state !== 'DONE')
      .map(t => buildTaskViewModel(t, TASKS))
      .sort((a, b) => {
        if (!a.isBlocked && b.isBlocked) return -1
        if (a.isBlocked && !b.isBlocked) return 1
        return 0
      }),
    [TASKS]
  )

  const handleAction = async (taskId: string, action: string) => {
    const nextState =
      action === 'task.start' ? 'IN_PROGRESS' :
      action === 'task.continue' ? 'IN_PROGRESS' :
      action === 'task.complete' ? 'DONE' :
      action === 'agent.command.fix_issue' ? 'IN_PROGRESS' :
      'IN_PROGRESS'
    const result = await updateTaskState(taskId, nextState as Task['state'])
    if (!result.success) alert(result.error)
  }

  const hasBookkeeping = TASKS.find(t => t.id === 'finance-002')?.state === 'DONE'
  const hasWavultCom = TASKS.find(t => t.id === 'tech-001')?.state === 'DONE'
  const hasSupabasePro = TASKS.find(t => t.id === 'finance-001')?.state === 'DONE'
  const legalDone = TASKS.filter(t => t.module === 'legal' && t.state === 'DONE').length
  const legalTotal = TASKS.filter(t => t.module === 'legal').length

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 font-mono text-sm">{t('system.loading')}</div>
      </div>
    )
  }

  const healthItems: HealthItem[] = [
    {
      label: t('module.legal'),
      value: `${legalDone}/${legalTotal} bolag`,
      status: legalDone === 0 ? 'red' : legalDone < legalTotal ? 'yellow' : 'green',
      icon: Building2,
    },
    {
      label: t('module.finance'),
      value: hasBookkeeping ? 'Bokföring aktiv' : 'Bokföring saknas',
      status: hasBookkeeping ? 'green' : 'red',
      icon: DollarSign,
    },
    {
      label: t('module.tech'),
      value: hasWavultCom ? 'wavult.com live' : 'wavult.com ej aktiv',
      status: hasWavultCom ? 'green' : 'yellow',
      icon: Globe,
    },
    {
      label: t('module.operations'),
      value: hasSupabasePro ? 'Supabase Pro' : 'Supabase Free (risk)',
      status: hasSupabasePro ? 'green' : 'red',
      icon: Users,
    },
    {
      label: 'Runway',
      value: '333 dagar',
      status: 'yellow',
      icon: TrendingUp,
    },
  ]

  const statusConfig = {
    red: {
      bg: 'bg-red-600',
      text: 'text-white',
      label: `SYSTEM: ${t('system.status.red').toUpperCase()}`,
      desc: `${sysVM.criticalCount} ${t('agent.web.critical_issues').toLowerCase()} — ${t('agent.command.action_required').toLowerCase()}`,
    },
    yellow: {
      bg: 'bg-amber-500',
      text: 'text-white',
      label: `SYSTEM: ${t('system.status.yellow').toUpperCase()}`,
      desc: t('agent.meta.priority_high'),
    },
    green: {
      bg: 'bg-emerald-500',
      text: 'text-white',
      label: `SYSTEM: ${t('system.status.green').toUpperCase()}`,
      desc: t('agent.system.no_tasks'),
    },
  }[sysVM.status]

  const today = new Date().toISOString().split('T')[0]
  const escalations = checkEscalations(TASKS)

  return (
    <div className="min-h-full bg-gray-50 space-y-6">

      {/* ── System Status Header ─────────────────────────────────────────── */}
      <div className={`${statusConfig.bg} ${statusConfig.text} rounded-xl p-5 shadow-sm`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-lg font-bold tracking-wide font-mono">{statusConfig.label}</span>
            </div>
            <p className="text-sm opacity-90">{statusConfig.desc}</p>
          </div>
          <div className="text-right text-xs font-mono opacity-75">
            <div>Wavult Group</div>
            <div>{today}</div>
          </div>
        </div>
      </div>

      {/* ── Escalation Banner ────────────────────────────────────────────── */}
      {escalations.length > 0 && (
        <div className="mb-4 p-3 bg-red-600 text-white rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">
            {t('alerts.critical_count', { count: escalations.length })}
          </span>
        </div>
      )}

      {/* ── Module overview — via SystemViewModel ────────────────────────── */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {sysVM.modules.map(mod => {
          const tierToStatus = {
            critical: 'red',
            high: 'amber',
            medium: 'amber',
            low: 'green',
            done: 'green',
            blocked: 'amber',
          } as const
          const status = tierToStatus[mod.statusTier]
          const modKey = `module.${mod.id}` as const
          return (
            <div key={mod.id} className={`p-3 rounded-xl border text-center ${
              status === 'red' ? 'bg-red-50 border-red-200' :
              status === 'amber' ? 'bg-amber-50 border-amber-200' :
              'bg-emerald-50 border-emerald-200'
            }`}>
              <div className={`text-lg font-mono font-bold ${status === 'red' ? 'text-red-700' : status === 'amber' ? 'text-amber-700' : 'text-emerald-700'}`}>
                {mod.openCount}
              </div>
              <div className={`text-xs font-medium ${status === 'red' ? 'text-red-600' : status === 'amber' ? 'text-amber-600' : 'text-emerald-600'}`}>
                {t(modKey)}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Critical Tasks ───────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            {t('task.priority.critical')} — {t('agent.command.action_required')}
          </h2>
          <span className="text-xs font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded">
            {criticalVMs.length}
          </span>
        </div>
        <div className="space-y-3">
          {criticalVMs.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-500">
              {t('task.no_critical')}
            </div>
          ) : (
            criticalVMs.map(vm => (
              <TaskCard key={vm.id} vm={vm} onAction={handleAction} />
            ))
          )}
        </div>
      </section>

      {/* ── High Priority Tasks ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            {t('task.priority.high')}
          </h2>
          <span className="text-xs font-mono bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
            {highVMs.length}
          </span>
        </div>
        <div className="space-y-3">
          {highVMs.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-500">
              {t('task.no_high')}
            </div>
          ) : (
            highVMs.map(vm => (
              <TaskCard key={vm.id} vm={vm} onAction={handleAction} />
            ))
          )}
        </div>
      </section>

      {/* ── Flows ────────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            {t('flow.ongoing')}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FLOWS.map(flow => <FlowCard key={flow.id} flow={flow} allTasks={TASKS} />)}
        </div>
      </section>

      {/* ── System Health ────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            {t('agent.web.system_overview')}
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {healthItems.map(item => (
            <HealthIndicator key={item.label} item={item} />
          ))}
        </div>
      </section>

    </div>
  )
}
