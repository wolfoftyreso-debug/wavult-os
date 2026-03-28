import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Task, ValidationInput } from './stateEngine'
import { resolveTaskState, validateTaskInput } from './stateEngine'
import { eventBus } from '../agent/eventBus'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export function useBosTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      // BLOCK 5 — AUTH GUARD: never fetch without authenticated session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)  // Stay empty — never show false "0 tasks" to unauthenticated user
        return
      }

      fetchTasks()
    }

    // Initial fetch
    async function fetchTasks() {
      const { data, error } = await supabase
        .from('bos_tasks')
        .select('*')
        .order('priority', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setTasks(mapRows(data))
      }
      setLoading(false)
    }

    init()

    // BLOCK 1+4 — SINGLE SOURCE OF TRUTH: listen to bos_events (not bos_tasks) for refresh triggers
    const eventsChannel = supabase
      .channel('bos_events_stream')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bos_events' },
        (payload) => {
          // Any system event triggers task refresh
          fetchTasks()
          const eventType = (payload.new as { type?: string })?.type
          const jobPayload = (payload.new as { payload?: Record<string, unknown> })?.payload
          if (eventType && jobPayload) {
            eventBus.publish({ type: 'TASK_UPDATED', taskId: String(jobPayload.taskId || jobPayload.jobId || '') })
          }
        }
      )
      .subscribe()

    // Keep bos_tasks subscription for task-specific events
    const tasksChannel = supabase
      .channel('bos_tasks_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bos_tasks' },
        (payload) => {
          fetchTasks()
          const taskId = (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id
          if (taskId) {
            const newState = (payload.new as { state?: string })?.state
            if (newState === 'DONE') {
              eventBus.publish({ type: 'TASK_COMPLETED', taskId, ownerId: (payload.new as { owner_id?: string })?.owner_id || '' })
            } else {
              eventBus.publish({ type: 'TASK_UPDATED', taskId })
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(eventsChannel)
      supabase.removeChannel(tasksChannel)
    }
  }, [])

  async function updateTaskState(
    taskId: string,
    newState: Task['state'],
    input?: ValidationInput,
    note?: string
  ): Promise<{ success: boolean; error?: string }> {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return { success: false, error: 'Task not found' }

    // HARD BLOCK: check dependencies
    const resolvedState = resolveTaskState(task, tasks)
    if (resolvedState === 'BLOCKED') {
      return { success: false, error: `Blockerad: ${task.blockedReason || 'dependency ej klar'}` }
    }

    // VALIDATION REQUIRED: check input before allowing DONE
    if (newState === 'DONE' && task.validationRequired) {
      if (!input || !validateTaskInput(task, input)) {
        return { success: false, error: 'Validation krävs för att slutföra denna task' }
      }
    }

    // Apply state change
    const { error } = await supabase
      .from('bos_tasks')
      .update({
        state: newState,
        updated_at: new Date().toISOString(),
        completed_at: newState === 'DONE' ? new Date().toISOString() : null,
        validation_value: input ? JSON.stringify(input) : null,
      })
      .eq('id', taskId)

    if (error) return { success: false, error: error.message }

    // Publish event to bus after successful state change
    if (newState === 'DONE') {
      eventBus.publish({ type: 'TASK_COMPLETED', taskId, ownerId: task.owner })
    } else {
      eventBus.publish({ type: 'TASK_UPDATED', taskId })
    }

    // Log audit event
    await supabase.from('bos_task_events').insert({
      task_id: taskId,
      event_type: 'state_change',
      to_state: newState,
      note: note || null,
      actor_id: 'current-user',
    })

    return { success: true }
  }

  return { tasks, loading, error, updateTaskState }
}

function mapRows(rows: any[]): Task[] {
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description || '',
    owner: r.owner_id,
    module: r.module,
    flow: r.flow_id || '',
    state: r.state as Task['state'],
    priority: r.priority as Task['priority'],
    deadline: r.deadline ? r.deadline.split('T')[0] : null,
    dependencies: r.dependencies || [],
    requiredInputs: r.required_inputs || [],
    outputValidation: r.output_validation || '',
    blockedReason: r.blocked_reason || undefined,
    assignedAt: r.assigned_at,
    completedAt: r.completed_at,
    validationRequired: r.validation_required ?? false,
    validationType: r.validation_type || undefined,
    validationValue: r.validation_value || null,
  }))
}
