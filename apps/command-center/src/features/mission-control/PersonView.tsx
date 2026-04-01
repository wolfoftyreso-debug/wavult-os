// ─── Person View — BOS Per-Person Dashboard ──────────────────────────────────
// Shows what a person must do, what they are blocking, and what they have done.

import { useState, useMemo } from 'react'
import { AlertTriangle, Clock, CheckCircle, Lock, ArrowRight } from 'lucide-react'
import { TASKS, PERSONS } from '../../core/state/taskRegistry'
import {
  getNextActionsForPerson,
  getBlockingTasksForPerson,
  resolveTaskState,
  type Task,
} from '../../core/state/stateEngine'
import { useTranslation } from '../../shared/i18n/useTranslation'

// ─── Mini Task Row ────────────────────────────────────────────────────────────

function TaskRow({ task, variant }: { task: Task; variant: 'action' | 'blocking' | 'done' }) {
  const { t } = useTranslation()
  const effectiveState = resolveTaskState(task, TASKS)
  const isOverdue = task.deadline ? new Date(task.deadline) < new Date() : false

  const borderColor =
    variant === 'action' && task.priority === 'critical' ? 'border-red-500' :
    variant === 'action' && task.priority === 'high' ? 'border-amber-500' :
    variant === 'blocking' ? 'border-orange-400' :
    variant === 'done' ? 'border-emerald-500' :
    'border-gray-300'

  const opacityClass = variant === 'done' ? 'opacity-60' : ''

  return (
    <div className={`bg-white border border-surface-border border-l-4 ${borderColor} rounded-xl shadow-sm p-3 ${opacityClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {variant === 'done' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
            {variant === 'blocking' && <Lock className="w-3.5 h-3.5 text-orange-700 flex-shrink-0" />}
            {variant === 'action' && effectiveState === 'IN_PROGRESS' && (
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
            <span className={`text-sm font-semibold ${variant === 'done' ? 'text-gray-9000 line-through' : 'text-gray-900'}`}>
              {task.title}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
            <span>{task.id}</span>
            {task.deadline && (
              <span className={`flex items-center gap-1 ${isOverdue && variant !== 'done' ? 'text-red-600' : ''}`}>
                <Clock className="w-3 h-3" />
                {task.deadline}
                {isOverdue && variant !== 'done' && ` — ${t('task.overdue')}`}
              </span>
            )}
          </div>

          {variant === 'blocking' && (
            <p className="text-xs text-orange-600 mt-1">
              {t('task.blocking_others')}
            </p>
          )}
        </div>

        {variant === 'action' && (
          <button className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-primary ${
            task.priority === 'critical' ? 'bg-red-600 hover:bg-red-700' : 'bg-white hover:bg-muted/30'
          } transition-colors`}>
            {effectiveState === 'IN_PROGRESS' ? t('task.continue') : t('task.start')}
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PersonView() {
  const { t } = useTranslation()
  const personIds = Object.keys(PERSONS)
  const [selectedId, setSelectedId] = useState<string>(personIds[0])

  const nextActions = useMemo(
    () => getNextActionsForPerson(selectedId, TASKS),
    [selectedId]
  )

  const blockingTasks = useMemo(
    () => getBlockingTasksForPerson(selectedId, TASKS),
    [selectedId]
  )

  const doneTasks = useMemo(
    () => TASKS.filter(task => task.owner === selectedId && task.state === 'DONE'),
    [selectedId]
  )

  const person = PERSONS[selectedId]

  return (
    <div className="min-h-full bg-muted/30 space-y-6">

      {/* ── Person Selector ────────────────────────────────────────────── */}
      <div className="bg-white border border-surface-border rounded-xl shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs font-mono text-gray-9000 mb-1 uppercase tracking-wide">
              {t('person.select')}
            </label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full sm:w-auto text-sm border border-surface-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-text-primary"
            >
              {personIds.map(id => (
                <option key={id} value={id}>
                  {PERSONS[id].name}
                </option>
              ))}
            </select>
          </div>

          {person && (
            <div className="text-right">
              <div className="text-lg font-bold text-text-primary">{person.name}</div>
              <div className="text-sm text-gray-9000 font-mono">{person.role}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Next Actions ───────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
            {t('person.my_tasks')}
          </h2>
          <span className="text-xs font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded">
            {nextActions.length}
          </span>
        </div>

        <div className="space-y-2">
          {nextActions.length === 0 ? (
            <div className="bg-white border border-surface-border rounded-xl p-4 text-sm text-gray-9000">
              {t('person.no_tasks')}
            </div>
          ) : (
            nextActions.map(task => (
              <TaskRow key={task.id} task={task} variant="action" />
            ))
          )}
        </div>
      </section>

      {/* ── You Are Blocking ───────────────────────────────────────────── */}
      {blockingTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-orange-700" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
              {t('task.blocking_others')}
            </h2>
            <span className="text-xs font-mono bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
              {blockingTasks.length}
            </span>
          </div>

          <div className="space-y-2">
            {blockingTasks.map(task => (
              <TaskRow key={task.id} task={task} variant="blocking" />
            ))}
          </div>
        </section>
      )}

      {/* ── Completed ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
            {t('task.completed_tasks')}
          </h2>
          <span className="text-xs font-mono bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
            {doneTasks.length}
          </span>
        </div>

        <div className="space-y-2">
          {doneTasks.length === 0 ? (
            <div className="bg-white border border-surface-border rounded-xl p-4 text-sm text-gray-9000">
              {t('agent.no_actions')}
            </div>
          ) : (
            doneTasks.map(task => (
              <TaskRow key={task.id} task={task} variant="done" />
            ))
          )}
        </div>
      </section>

    </div>
  )
}
