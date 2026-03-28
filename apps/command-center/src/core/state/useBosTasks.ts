import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Task } from './stateEngine'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export function useBosTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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

    fetchTasks()

    // Realtime subscription
    const channel = supabase
      .channel('bos_tasks_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bos_tasks' },
        () => fetchTasks()  // refetch on any change
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function updateTaskState(taskId: string, newState: Task['state'], note?: string) {
    const { error } = await supabase
      .from('bos_tasks')
      .update({ state: newState, updated_at: new Date().toISOString() })
      .eq('id', taskId)

    if (!error) {
      // Log event
      await supabase.from('bos_task_events').insert({
        task_id: taskId,
        event_type: 'state_change',
        to_state: newState,
        note: note || null,
      })
    }
    return { error }
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
  }))
}
