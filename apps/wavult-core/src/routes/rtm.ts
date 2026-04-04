import { Router } from 'express'
import { Pool } from 'pg'

const router = Router()

const getDb = () => new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// POST /v1/rtm/create — triggas av Gitea webhook vid RTM-PR
router.post('/v1/rtm/create', async (req, res) => {
  const { pr_number, pr_title, pr_url, author } = req.body
  if (!pr_number || !pr_title) return res.status(400).json({ error: 'pr_number och pr_title krävs' })

  const db = getDb()
  try {
    const reviewers = [
      { person: 'dennis', role: 'Legal/Compliance', task: `[RTM #${pr_number}] ⚖️ Juridisk granskning: ${pr_title}` },
      { person: 'winston', role: 'Finans', task: `[RTM #${pr_number}] 💰 Ekonomisk granskning: ${pr_title}` },
      { person: 'johan', role: 'Teknik', task: `[RTM #${pr_number}] 🔧 Teknisk granskning: ${pr_title}` },
      { person: 'erik', role: 'Chairman', task: `[RTM #${pr_number}] 👑 Chairman-godkännande: ${pr_title}` },
    ]

    for (const r of reviewers) {
      await db.query(`
        INSERT INTO tasks (id, title, description, assigned_to, priority, status, source, source_ref, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, 'critical', 'todo', 'rtm', $4, now())
        ON CONFLICT DO NOTHING
      `, [
        r.task,
        `RTM PR #${pr_number}: "${pr_title}"\n\nRoll: ${r.role}\nPR: ${pr_url || 'Se Gitea'}\nSkapad av: ${author}\n\nGranska och godkänn i Gitea innan merge tillåts.`,
        r.person,
        `rtm-pr-${pr_number}`
      ])

      // Notifiera
      await db.query(`
        INSERT INTO notifications (user_id, title, message, priority, type, read, created_at)
        VALUES ($1, $2, $3, 'critical', 'rtm_review', false, now())
      `, [r.person, r.task, `RTM-granskning krävs: ${pr_title}`]).catch(() => {})
    }

    // Logga i agent_action_log
    await db.query(`
      INSERT INTO agent_action_log (agent_id, action_type, trigger_type, trigger_reason, target_entity, action_taken, responsible_person, status)
      VALUES ('qms', 'create_task', 'event', $1, $2, $3, 'system', 'auto_executed')
    `, [`RTM PR #${pr_number} öppnad`, `rtm-pr-${pr_number}`, `Skapade 4 RTM-granskningsuppgifter för PR #${pr_number}`])

    res.json({ success: true, tasks_created: reviewers.length, pr_number })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// GET /v1/rtm/status/:prNumber — status på RTM-granskning
router.get('/v1/rtm/status/:prNumber', async (req, res) => {
  const db = getDb()
  try {
    const { rows } = await db.query(`
      SELECT assigned_to, title, status, updated_at
      FROM tasks
      WHERE source = 'rtm' AND source_ref = $1
      ORDER BY assigned_to
    `, [`rtm-pr-${req.params.prNumber}`])

    const approved = rows.filter(r => r.status === 'done').length
    const total = rows.length

    res.json({
      pr_number: req.params.prNumber,
      approved,
      total,
      ready_for_merge: approved === total && total === 4,
      reviewers: rows
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

export default router
