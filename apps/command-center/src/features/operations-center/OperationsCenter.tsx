import { useState, useEffect } from 'react'
import { AlertTriangle, Clock, CheckCircle, Users, Activity, FileText, ChevronRight } from 'lucide-react'
import { useBosTasks } from '../../core/state/useBosTasks'
import { resolveTaskState, getSystemStatus, type Task } from '../../core/state/stateEngine'
import { useTranslation } from '../../shared/i18n/useTranslation'

// Fallback data om Supabase ej är live
const FALLBACK_TASKS: Task[] = [
  { id: 'legal-001', title: 'Bilda Wavult Group FZCO (Dubai)', owner: 'erik-svensson', module: 'legal', flow: 'dubai-structure', state: 'REQUIRED' as const, priority: 'critical' as const, deadline: '2026-04-10', dependencies: [], requiredInputs: ['Pass', 'UAE-adress'], outputValidation: 'Certificate of Incorporation', assignedAt: '2026-03-28', completedAt: null, description: '', validationRequired: false },
  { id: 'legal-002', title: 'Bilda Wavult DevOps FZCO', owner: 'erik-svensson', module: 'legal', flow: 'dubai-structure', state: 'BLOCKED' as const, priority: 'critical' as const, deadline: '2026-04-10', dependencies: ['legal-001'], requiredInputs: [], outputValidation: '', assignedAt: '2026-03-28', completedAt: null, description: '', blockedReason: 'Wavult Group FZCO måste bildas först', validationRequired: false },
  { id: 'legal-004', title: 'Välj bokföringsbyrå — Landvex AB', owner: 'dennis-bjarnemark', module: 'legal', flow: 'landvex-compliance', state: 'REQUIRED' as const, priority: 'critical' as const, deadline: '2026-04-01', dependencies: [], requiredInputs: [], outputValidation: '', assignedAt: '2026-03-28', completedAt: null, description: '', validationRequired: false },
  { id: 'tech-001', title: 'Byt NS på Loopia — aktivera wavult.com', owner: 'johan-berglund', module: 'tech', flow: 'dns-activation', state: 'REQUIRED' as const, priority: 'high' as const, deadline: '2026-04-01', dependencies: [], requiredInputs: [], outputValidation: '', assignedAt: '2026-03-28', completedAt: null, description: '', validationRequired: false },
  { id: 'ops-002', title: 'Thailand Workcamp — hotellbokning', owner: 'leon-russo', module: 'operations', flow: 'thailand-workcamp', state: 'IN_PROGRESS' as const, priority: 'critical' as const, deadline: '2026-04-01', dependencies: [], requiredInputs: [], outputValidation: '', assignedAt: '2026-03-28', completedAt: null, description: '', validationRequired: false },
]

const OWNER_NAMES: Record<string, string> = {
  'erik-svensson': 'Erik',
  'dennis-bjarnemark': 'Dennis',
  'winston-bjarnemark': 'Winston',
  'johan-berglund': 'Johan',
  'leon-russo': 'Leon',
}

function statusDot(color: 'red' | 'amber' | 'green') {
  const cls = { red: 'bg-red-500', amber: 'bg-amber-400', green: 'bg-emerald-500' }[color]
  return <span className={`inline-block w-2 h-2 rounded-full ${cls} mr-1.5`} />
}

export function OperationsCenter() {
  const { tasks: liveTasks, loading } = useBosTasks()
  const { t } = useTranslation()
  const tasks = loading || liveTasks.length === 0 ? FALLBACK_TASKS : liveTasks
  const [now, setNow] = useState(new Date())
  const [activeModule, setActiveModule] = useState<string | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const resolved = tasks.map(task => ({ ...task, resolvedState: resolveTaskState(task, tasks) }))
  const blockers = resolved.filter(task => task.resolvedState === 'BLOCKED' || (task.priority === 'critical' && task.resolvedState !== 'DONE'))
  const risks = resolved.filter(task => task.priority === 'high' && task.resolvedState === 'REQUIRED')
  const ok = resolved.filter(task => task.resolvedState === 'DONE')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void getSystemStatus(resolved)

  // Group by module
  const modules = ['legal', 'finance', 'operations', 'tech', 'hr'] as const
  const moduleData = modules.map(mod => {
    const modTasks = resolved.filter(task => task.module === mod)
    const hasCritical = modTasks.some(task => task.priority === 'critical' && task.resolvedState !== 'DONE')
    const hasHigh = modTasks.some(task => task.priority === 'high' && task.resolvedState !== 'DONE')
    const status: 'red' | 'amber' | 'green' = hasCritical ? 'red' : hasHigh ? 'amber' : 'green'
    const modLabelKey = `module.${mod}` as const
    return {
      id: mod,
      label: t(modLabelKey),
      status,
      count: modTasks.length,
      openCount: modTasks.filter(task => task.resolvedState !== 'DONE').length,
    }
  })

  // Flows
  const flowMap = new Map<string, typeof resolved>()
  resolved.forEach(task => {
    if (!flowMap.has(task.flow)) flowMap.set(task.flow, [])
    flowMap.get(task.flow)!.push(task)
  })
  const flows = Array.from(flowMap.entries()).map(([id, ftasks]) => {
    const done = ftasks.filter(task => task.resolvedState === 'DONE').length
    const pct = ftasks.length ? Math.round((done / ftasks.length) * 100) : 0
    const hasCritical = ftasks.some(task => task.priority === 'critical' && task.resolvedState !== 'DONE')
    return {
      id,
      label: id.replace(/-/g, ' '),
      pct,
      total: ftasks.length,
      done,
      status: hasCritical ? 'red' as const : pct < 50 ? 'amber' as const : 'green' as const,
    }
  }).sort((a, b) => a.pct - b.pct)

  // Team
  const owners = ['erik-svensson', 'dennis-bjarnemark', 'winston-bjarnemark', 'johan-berglund', 'leon-russo']
  const teamData = owners.map(owner => {
    const ownerTasks = resolved.filter(task => task.owner === owner)
    const open = ownerTasks.filter(task => task.resolvedState !== 'DONE')
    const blocking = resolved.filter(task => task.resolvedState === 'BLOCKED' && task.dependencies.some(dep => {
      const depTask = resolved.find(x => x.id === dep)
      return depTask?.owner === owner && depTask?.resolvedState !== 'DONE'
    }))
    const status: 'red' | 'amber' | 'green' = open.some(task => task.priority === 'critical') ? 'red' : open.length > 0 ? 'amber' : 'green'
    return { owner, name: OWNER_NAMES[owner], open: open.length, blocking: blocking.length, status }
  })

  // Alerts (critical + overdue — BLOCKED excluded)
  const alerts = resolved
    .filter(task =>
      task.priority === 'critical' &&
      task.resolvedState !== 'DONE' &&
      task.resolvedState !== 'BLOCKED'
    )
    .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
    .slice(0, 6)

  // Audit log (mock)
  const auditLog = [
    { time: '15:10', actor: 'System', action: 'Audit genomförd', type: 'system' },
    { time: '14:55', actor: 'Bernt', action: 'Design uppdaterad — light theme', type: 'success' },
    { time: '14:35', actor: 'Bernt', action: 'State Engine byggd', type: 'success' },
    { time: '06:13', actor: 'Erik', action: 'Knowledge Hub utvidgad — 21 kurser', type: 'success' },
  ]

  const panelClass = 'bg-white border border-slate-200 rounded-xl shadow-sm'
  const panelHeader = 'flex items-center justify-between px-4 py-3 border-b border-slate-100'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* GLOBAL STATUS BAR */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 min-h-12 flex flex-wrap items-center px-4 gap-2 py-2 text-sm">
        <button
          onClick={() => setActiveModule(null)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${blockers.length > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'text-slate-400'}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="font-mono">{blockers.length}</span>
          <span>{t('system.blockers')}</span>
        </button>
        <button className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${risks.length > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-slate-400'}`}>
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono">{risks.length}</span>
          <span>{t('ops.risk')}</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 transition-colors">
          <CheckCircle className="w-3.5 h-3.5" />
          <span className="font-mono">{ok.length}</span>
          <span>{t('ops.ok')}</span>
        </button>
        <div className="ml-auto font-mono text-slate-400 text-xs">
          {now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })} · Wavult OS
        </div>
      </div>

      {/* GRID */}
      <div className="p-4 grid grid-cols-12 gap-4">

        {/* ROW 1 */}

        {/* MODULES */}
        <div className={`col-span-12 md:col-span-4 ${panelClass}`}>
          <div className={panelHeader}>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('ops.modules')}</span>
          </div>
          <div className="p-2">
            {moduleData.map(mod => (
              <button
                key={mod.id}
                onClick={() => setActiveModule(activeModule === mod.id ? null : mod.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-slate-50 ${activeModule === mod.id ? 'bg-slate-100' : ''}`}
              >
                <div className="flex items-center gap-2">
                  {statusDot(mod.status)}
                  <span className="font-medium text-slate-800">{mod.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">{mod.openCount} {t('module.open_tasks')}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* FLOWS */}
        <div className={`col-span-12 md:col-span-4 ${panelClass}`}>
          <div className={panelHeader}>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('ops.flows')}</span>
          </div>
          <div className="p-3 space-y-3">
            {flows.slice(0, 5).map(flow => (
              <div key={flow.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700 capitalize">{flow.label}</span>
                  <span className={`font-mono text-xs ${flow.status === 'red' ? 'text-red-600' : flow.status === 'amber' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {flow.done}/{flow.total}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${flow.status === 'red' ? 'bg-red-500' : flow.status === 'amber' ? 'bg-amber-400' : 'bg-emerald-500'}`}
                    style={{ width: `${flow.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TEAM */}
        <div className={`col-span-12 md:col-span-4 overflow-x-auto ${panelClass}`}>
          <div className={panelHeader}>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('ops.team')}</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="p-2">
            {teamData.map(person => (
              <div key={person.owner} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-2">
                  {statusDot(person.status)}
                  <span className="text-sm font-medium text-slate-800">{person.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  {person.blocking > 0 && (
                    <span className="text-red-600">{t('team.blocking')} {person.blocking}</span>
                  )}
                  <span className="text-slate-400">{person.open} {t('team.tasks_left')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROW 2 */}

        {/* ALERTS */}
        <div className={`col-span-12 md:col-span-4 ${panelClass}`}>
          <div className={panelHeader}>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('alerts.title')}</span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="p-2 space-y-1">
            {alerts.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-400 text-center">{t('alerts.none')}</p>
            ) : alerts.map(task => (
              <div key={task.id} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-red-800 truncate">{task.title}</p>
                  <p className="text-xs text-red-500 font-mono">{OWNER_NAMES[task.owner]} · {task.deadline}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TASK PRESSURE */}
        <div className={`col-span-12 md:col-span-4 ${panelClass}`}>
          <div className={panelHeader}>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('ops.task_pressure')}</span>
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-slate-600">{t('ops.total_open')}</span>
              <span className="font-mono text-2xl font-bold text-slate-900">{resolved.filter(task => task.resolvedState !== 'DONE').length}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-slate-600">{t('ops.critical')}</span>
              <span className="font-mono text-lg font-semibold text-red-600">{resolved.filter(task => task.priority === 'critical' && task.resolvedState !== 'DONE').length}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-slate-600">{t('ops.blocked')}</span>
              <span className="font-mono text-lg font-semibold text-slate-500">{resolved.filter(task => task.resolvedState === 'BLOCKED').length}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-slate-600">{t('ops.done')}</span>
              <span className="font-mono text-lg font-semibold text-emerald-600">{ok.length}</span>
            </div>
          </div>
        </div>

        {/* AUDIT LOG */}
        <div className={`col-span-12 md:col-span-4 ${panelClass}`}>
          <div className={panelHeader}>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('ops.audit_log')}</span>
            <FileText className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="p-2 space-y-1">
            {auditLog.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-slate-50">
                <span className="font-mono text-xs text-slate-400 w-10 flex-shrink-0 pt-0.5">{entry.time}</span>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-700">{entry.actor} </span>
                  <span className="text-xs text-slate-500">{entry.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
