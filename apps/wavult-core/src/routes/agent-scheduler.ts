import { Router } from 'express'
import { runAllProactiveAgents } from '../ai/agents/proactive'

const router = Router()

// POST /v1/agents/run — trigga alla proaktiva agenter manuellt (eller via extern cron)
router.post('/v1/agents/run', async (_req, res) => {
  try {
    const results = await runAllProactiveAgents()
    const total = results.reduce((sum, r) => sum + r.actions, 0)
    res.json({ success: true, agents_run: results.length, total_actions: total, results })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /v1/agents/actions — lista senaste agent-handlingar
router.get('/v1/agents/actions', async (req, res) => {
  const { Pool } = require('pg')
  const db = new Pool({ connectionString: process.env.DATABASE_URL || process.env.WAVULT_DB_URL, ssl: { rejectUnauthorized: false } })
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500)
    const { rows } = await db.query(
      `SELECT * FROM agent_action_log ORDER BY created_at DESC LIMIT $1`,
      [limit],
    )
    res.json(rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// GET /v1/agents/goals — agent-definierade mål
router.get('/v1/agents/goals', async (_req, res) => {
  const { Pool } = require('pg')
  const db = new Pool({ connectionString: process.env.DATABASE_URL || process.env.WAVULT_DB_URL, ssl: { rejectUnauthorized: false } })
  try {
    const { rows } = await db.query(
      `SELECT * FROM agent_goals WHERE status = 'active' ORDER BY created_at DESC`,
    )
    res.json(rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

export default router
