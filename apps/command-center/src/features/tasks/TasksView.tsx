import { ModuleHeader } from '../../shared/illustrations/ModuleIllustration'
import { useState, useEffect } from 'react'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { useTranslation } from '../../shared/i18n/useTranslation'

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = 'high' | 'medium' | 'low'
type Column = 'backlog' | 'in-progress' | 'review' | 'done'

interface Task {
  id: string
  title: string
  project: string
  projectColor: string
  assignee: string
  assigneeColor: string
  priority: Priority
  column: Column
  tags: string[]
  entity_id: string
}

// ─── Entity mapping helper ────────────────────────────────────────────────────

function projectToEntityId(project: string): string {
  if (project === 'Bolagsstruktur') return 'wavult-group'
  if (project === 'quiXzoom') return 'quixzoom-uab'
  if (project === 'Landvex') return 'landvex-ab'
  if (project === 'Tech/API') return 'wavult-operations'
  if (project === 'Hypbit' || project === 'Hypbit OS') return 'wavult-operations'
  return 'wavult-group'
}

// ─── Initial tasks ────────────────────────────────────────────────────────────

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Texas LLC — incorporation docs signerade',
    project: 'Bolagsstruktur',
    projectColor: '#F59E0B',
    assignee: 'DL',
    assigneeColor: '#F59E0B',
    priority: 'high',
    column: 'in-progress',
    tags: ['juridik', 'WGH'],
    entity_id: projectToEntityId('Bolagsstruktur'),
  },
  {
    id: '2',
    title: 'ECS deployment pipeline (CI/CD)',
    project: 'quiXzoom',
    projectColor: '#3B82F6',
    assignee: 'WA',
    assigneeColor: '#3B82F6',
    priority: 'high',
    column: 'in-progress',
    tags: ['infra', 'devops'],
    entity_id: projectToEntityId('quiXzoom'),
  },
  {
    id: '3',
    title: 'quiXzoom — photographer-app MVP (kartvy)',
    project: 'quiXzoom',
    projectColor: '#3B82F6',
    assignee: 'JL',
    assigneeColor: '#06B6D4',
    priority: 'high',
    column: 'backlog',
    tags: ['frontend', 'mobile'],
    entity_id: projectToEntityId('quiXzoom'),
  },
  {
    id: '4',
    title: 'Thailand workcamp — agenda och boenden',
    project: 'Team',
    projectColor: '#2563EB',
    assignee: 'ES',
    assigneeColor: '#2563EB',
    priority: 'medium',
    column: 'in-progress',
    tags: ['intern', 'thailand'],
    entity_id: 'wavult-group',
  },
  {
    id: '5',
    title: 'Admin-panel CRM-vyer (Hypbit OS)',
    project: 'Hypbit OS',
    projectColor: '#2563EB',
    assignee: 'JL',
    assigneeColor: '#06B6D4',
    priority: 'medium',
    column: 'in-progress',
    tags: ['frontend', 'crm'],
    entity_id: projectToEntityId('Hypbit OS'),
  },
  {
    id: '6',
    title: 'Optic Insights — first pilot-kund identifierad',
    project: 'Optic Insights',
    projectColor: '#06B6D4',
    assignee: 'LR',
    assigneeColor: '#10B981',
    priority: 'medium',
    column: 'backlog',
    tags: ['sales', 'b2b'],
    entity_id: 'wavult-group',
  },
  {
    id: '7',
    title: 'Dubai holding-struktur (initial research)',
    project: 'Bolagsstruktur',
    projectColor: '#F59E0B',
    assignee: 'DL',
    assigneeColor: '#F59E0B',
    priority: 'low',
    column: 'backlog',
    tags: ['juridik', 'WGH'],
    entity_id: projectToEntityId('Bolagsstruktur'),
  },
  {
    id: '8',
    title: 'Brand guidelines Wavult Group v1',
    project: 'Brand',
    projectColor: '#2563EB',
    assignee: 'ES',
    assigneeColor: '#2563EB',
    priority: 'low',
    column: 'review',
    tags: ['brand', 'design'],
    entity_id: 'wavult-group',
  },
  {
    id: '9',
    title: 'Hypbit OS — Command Center routing komplett',
    project: 'Hypbit OS',
    projectColor: '#2563EB',
    assignee: 'WA',
    assigneeColor: '#3B82F6',
    priority: 'medium',
    column: 'done',
    tags: ['frontend', 'intern'],
    entity_id: projectToEntityId('Hypbit OS'),
  },
  {
    id: '10',
    title: 'Konceptdesign quiXzoom klar',
    project: 'quiXzoom',
    projectColor: '#3B82F6',
    assignee: 'ES',
    assigneeColor: '#2563EB',
    priority: 'high',
    column: 'done',
    tags: ['produkt'],
    entity_id: projectToEntityId('quiXzoom'),
  },
]

const COLUMNS: { id: Column; label: string; color: string }[] = [
  { id: 'backlog',     label: 'Backlog',    color: '#6B7280' },
  { id: 'in-progress', label: 'Pågår',      color: '#3B82F6' },
  { id: 'review',     label: 'Review',     color: '#F59E0B' },
  { id: 'done',       label: 'Klart',      color: '#10B981' },
]

const PRIORITY_COLORS: Record<Priority, string> = {
  high:   '#EF4444',
  medium: '#F59E0B',
  low:    '#6B7280',
}

const PRIORITY_LABEL: Record<Priority, string> = {
  high:   'Hög',
  medium: 'Medel',
  low:    'Låg',
}

// ─── Components ───────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onMove,
}: {
  task: Task
  onMove: (id: string, col: Column) => void
}) {
  const cols = COLUMNS.map(c => c.id)
  const idx = cols.indexOf(task.column)

  return (
    <div
      className="bg-muted/30 border border-surface-border rounded-xl p-3.5 flex flex-col gap-2.5 group"
      style={{ opacity: task.column === 'done' ? 0.65 : 1 }}
    >
      {/* Tags row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className="text-xs px-1.5 py-0.5 rounded font-medium"
          style={{ background: task.projectColor + '18', color: task.projectColor }}
        >
          {task.project}
        </span>
        {task.tags.map(t => (
          <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-muted/30 text-text-muted">
            {t}
          </span>
        ))}
      </div>

      {/* Title */}
      <p className={`text-sm text-text-primary leading-snug ${task.column === 'done' ? 'line-through text-gray-500' : ''}`}>
        {task.title}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-0.5">
        <div className="flex items-center gap-2">
          {/* Assignee */}
          <div
            className="h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: task.assigneeColor + '22', color: task.assigneeColor, border: `1px solid ${task.assigneeColor}40` }}
            title={task.assignee}
          >
            {task.assignee[0]}
          </div>
          {/* Priority */}
          <span className="text-xs" style={{ color: PRIORITY_COLORS[task.priority] }}>
            ● {PRIORITY_LABEL[task.priority]}
          </span>
        </div>

        {/* Move buttons */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {idx > 0 && (
            <button
              onClick={() => onMove(task.id, cols[idx - 1] as Column)}
              className="text-xs px-1.5 py-0.5 rounded bg-muted/30 text-text-muted hover:text-text-primary transition-colors"
              title="Flytta bakåt"
            >
              ←
            </button>
          )}
          {idx < cols.length - 1 && (
            <button
              onClick={() => onMove(task.id, cols[idx + 1] as Column)}
              className="text-xs px-1.5 py-0.5 rounded bg-muted/30 text-text-muted hover:text-text-primary transition-colors"
              title="Flytta framåt"
            >
              →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function TasksView() {
  const { t: _t } = useTranslation() // ready for i18n
  const { activeEntity, isInScope } = useEntityScope()
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [taskError, setTaskError] = useState<string | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)

  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { if (d.tasks?.length) setTasks(d.tasks); setLoading(false) })
      .catch(e => { setTaskError(String(e)); setUsingFallback(true); setLoading(false) })
  }, [])

  if (loading) return <div style={{ padding: 24 }}>{[1,2,3,4].map(i => <div key={i} style={{ background: 'var(--color-bg-muted)', borderRadius: 10, height: 56, marginBottom: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />)}</div>
  if (taskError && tasks.length === 0) return <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', margin: 24 }}><div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div><div style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>Uppgifter ej tillgängliga</div><div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{taskError}</div></div>
  const isRoot = activeEntity.layer === 0

  // First: apply entity scope filter
  const scopedTasks = isRoot
    ? tasks
    : tasks.filter(t => isInScope(t.entity_id))

  // Then: apply project filter on top of scoped tasks
  const projects = ['all', ...Array.from(new Set(scopedTasks.map(t => t.project)))]
  const filtered = filter === 'all' ? scopedTasks : scopedTasks.filter(t => t.project === filter)

  const move = (id: string, col: Column) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, column: col } : t))
  }

  return (
    <div className="wv-module-enter space-y-6 max-w-full">
      {usingFallback && (
        <div style={{ marginBottom: 12, padding: '8px 14px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
          Visar exempeluppgifter · Live-API ej ansluten
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Task Board</h1>
          <p className="text-text-muted mt-1">
            {isRoot
              ? `Wavult Group — ${scopedTasks.length} uppgifter`
              : `${activeEntity.name} — ${scopedTasks.length} uppgifter`}
          </p>
          {/* Scope banner */}
          {!isRoot && (
            <div
              className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: activeEntity.color + '15',
                border: `1px solid ${activeEntity.color}30`,
                color: activeEntity.color,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: activeEntity.color }} />
              Scoped to: {activeEntity.name}
            </div>
          )}
        </div>
        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {projects.map(p => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                filter === p
                  ? 'bg-brand-accent text-gray-900'
                  : 'bg-white border border-surface-border text-text-muted hover:text-gray-900'
              }`}
            >
              {p === 'all' ? 'Alla' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const colTasks = filtered.filter(t => t.column === col.id)
          return (
            <div key={col.id} className="flex flex-col gap-3 min-w-0">
              {/* Column header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{col.label}</span>
                </div>
                <span
                  className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-full"
                  style={{ background: col.color + '18', color: col.color }}
                >
                  {colTasks.length}
                </span>
              </div>

              {/* Drop zone */}
              <div
                className="flex flex-col gap-2 min-h-24 p-2 rounded-xl"
                style={{ background: 'rgba(249,250,251,0.5)', border: '1px dashed rgba(55,65,81,0.6)' }}
              >
                {colTasks.map(t => (
                  <TaskCard key={t.id} task={t} onMove={move} />
                ))}
                {colTasks.length === 0 && (
                  <div className="flex items-center justify-center h-16 text-xs text-text-muted">
                    Tom
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Stats footer */}
      <div className="flex gap-4 flex-wrap text-xs text-text-muted pt-2 border-t border-surface-border">
        {COLUMNS.map(col => (
          <span key={col.id}>
            <span style={{ color: col.color }}>●</span>{' '}
            {col.label}: {filtered.filter(t => t.column === col.id).length}
          </span>
        ))}
        <span className="ml-auto">
          Hover på ett kort för att flytta det →
        </span>
      </div>
    </div>
  )
}
