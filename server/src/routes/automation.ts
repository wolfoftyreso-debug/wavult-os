// ─── Automation Routes ─────────────────────────────────────────────────────────
// GET   /api/automation/workflows        — list n8n workflows
// PATCH /api/automation/workflows/:id   — activate/deactivate

import { Router, Request, Response } from 'express'

const router = Router()

const N8N_BASE = process.env.N8N_URL ?? 'https://n8n.wavult.com'
const N8N_API_KEY = process.env.N8N_API_KEY ?? process.env.N8N_TOKEN ?? ''

function n8nHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'wavult-os/1.0',
  }
  if (N8N_API_KEY) h['X-N8N-API-KEY'] = N8N_API_KEY
  return h
}

// ─── GET /api/automation/workflows ───────────────────────────────────────────

router.get('/api/automation/workflows', async (_req: Request, res: Response) => {
  try {
    const [workflowsRes, execRes] = await Promise.all([
      fetch(`${N8N_BASE}/api/v1/workflows?limit=100`, { headers: n8nHeaders() }),
      fetch(`${N8N_BASE}/api/v1/executions?limit=50&includeData=false`, { headers: n8nHeaders() }),
    ])

    if (!workflowsRes.ok) {
      return res.status(workflowsRes.status).json({ error: `n8n API: ${workflowsRes.statusText}` })
    }

    const wfData = await workflowsRes.json() as {
      data: Array<{
        id: string;
        name: string;
        active: boolean;
        nodes: unknown[];
        tags?: Array<{ name: string }>;
        createdAt?: string;
        updatedAt?: string;
        nextRunAt?: string;
      }>;
    }

    // Build last execution map
    const execMap: Record<string, { startedAt: string; finished: boolean; status: string }> = {}
    if (execRes.ok) {
      const execData = await execRes.json() as {
        data: Array<{ workflowId: string; startedAt: string; finished: boolean; status: string }>
      }
      for (const exec of execData.data ?? []) {
        if (!execMap[exec.workflowId]) {
          execMap[exec.workflowId] = exec
        }
      }
    }

    const workflows = (wfData.data ?? []).map(wf => {
      const lastExec = execMap[wf.id]
      let lastExecutionStatus: 'success' | 'error' | 'running' | null = null
      if (lastExec) {
        if (!lastExec.finished) lastExecutionStatus = 'running'
        else if (lastExec.status === 'success') lastExecutionStatus = 'success'
        else lastExecutionStatus = 'error'
      }
      return {
        id: wf.id,
        name: wf.name,
        active: wf.active,
        lastExecution: lastExec?.startedAt ?? null,
        lastExecutionStatus,
        nextExecution: wf.nextRunAt ?? null,
        nodeCount: Array.isArray(wf.nodes) ? wf.nodes.length : 0,
        tags: (wf.tags ?? []).map((t: { name: string }) => t.name),
      }
    })

    return res.json({ workflows, total: workflows.length })
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Serverfel' })
  }
})

// ─── PATCH /api/automation/workflows/:id ─────────────────────────────────────

router.patch('/api/automation/workflows/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const { active } = req.body ?? {}

  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: 'active (boolean) är obligatoriskt' })
  }

  try {
    const endpoint = active
      ? `${N8N_BASE}/api/v1/workflows/${id}/activate`
      : `${N8N_BASE}/api/v1/workflows/${id}/deactivate`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: n8nHeaders(),
    })

    if (!response.ok) {
      const body = await response.text()
      return res.status(response.status).json({ error: `n8n: ${response.statusText}`, body })
    }

    const data = await response.json()
    return res.json({ success: true, workflow: data })
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Serverfel' })
  }
})

export default router
