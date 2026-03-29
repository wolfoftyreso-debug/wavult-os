import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { assertTaskTransition, type TaskState } from '../engines/stateEngine'
import { emitEvent } from '../engines/eventEngine'
import { checkFraud } from '../engines/fraudEngine'
import { createClient } from '@supabase/supabase-js'

const router = Router()
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const AcceptSchema = z.object({
  task_id: z.string().uuid(),
  zoomer_id: z.string().uuid(),
})

const UploadSchema = z.object({
  task_id: z.string().uuid(),
  zoomer_id: z.string().uuid(),
  gps_lat: z.number().min(-90).max(90),
  gps_lng: z.number().min(-180).max(180),
  file_type: z.enum(['jpg', 'jpeg', 'png', 'heic']),
})

// POST /v1/task/accept
router.post('/accept', async (req: Request, res: Response) => {
  try {
    const { task_id, zoomer_id } = AcceptSchema.parse(req.body)

    const { data: task, error } = await supabase
      .schema('wavult')
      .from('tasks')
      .select('*')
      .eq('id', task_id)
      .single()

    if (error || !task) return res.status(404).json({ error: 'TASK_NOT_FOUND' })

    // State machine enforcement
    assertTaskTransition(task.status as TaskState, 'accepted')

    await supabase.schema('wavult').from('tasks').update({
      status: 'accepted',
      zoomer_id,
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', task_id)

    await emitEvent('task.accepted', 'task', task_id, { zoomer_id }, { actorId: zoomer_id })

    res.json({ task_id, status: 'accepted', message: 'Task accepted successfully' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'UNKNOWN'
    if (msg.startsWith('INVALID_TASK_TRANSITION')) return res.status(409).json({ error: msg })
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors })
    res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// POST /v1/task/upload — handles file metadata (actual file via S3 presigned URL)
router.post('/upload', async (req: Request, res: Response) => {
  try {
    const { task_id, zoomer_id, gps_lat, gps_lng, file_type } = UploadSchema.parse(req.body)
    const { s3_key, file_size_bytes, resolution_width, resolution_height, captured_at } = req.body

    const { data: task } = await supabase.schema('wavult').from('tasks').select('*').eq('id', task_id).single()
    if (!task) return res.status(404).json({ error: 'TASK_NOT_FOUND' })
    if (task.zoomer_id !== zoomer_id) return res.status(403).json({ error: 'NOT_TASK_OWNER' })

    assertTaskTransition(task.status as TaskState, 'uploaded')

    // Fraud check
    const fraudResult = checkFraud(
      { buffer: Buffer.alloc(0), gps_lat, gps_lng, captured_at: captured_at ? new Date(captured_at) : undefined },
      task.lat,
      task.lng
    )

    if (!fraudResult.passed) {
      await emitEvent('fraud.detected', 'task', task_id, { flags: fraudResult.flags, zoomer_id })
      // Don't block upload, flag it
    }

    // Save media record
    const mediaId = uuid()
    await supabase.schema('wavult').from('task_media').insert({
      id: mediaId,
      task_id,
      s3_key: s3_key || `tasks/${task_id}/${mediaId}.${file_type}`,
      s3_bucket: 'wavult-images-eu-primary',
      file_type,
      file_size_bytes: file_size_bytes || 0,
      resolution_width,
      resolution_height,
      gps_lat,
      gps_lng,
      captured_at,
      fraud_flags: fraudResult.flags,
      gps_valid: !fraudResult.flags.includes('NO_GPS_DATA') && !fraudResult.flags.includes('GPS_MISMATCH'),
    })

    // Update task status
    await supabase.schema('wavult').from('tasks').update({
      status: 'uploaded',
      submitted_at: new Date().toISOString(),
      fraud_flag: !fraudResult.passed,
      updated_at: new Date().toISOString(),
    }).eq('id', task_id)

    await emitEvent('task.submitted', 'task', task_id, { media_id: mediaId, fraud_flags: fraudResult.flags })

    res.json({
      task_id,
      media_id: mediaId,
      status: 'uploaded',
      fraud_flags: fraudResult.flags,
      quality_check: 'pending',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'UNKNOWN'
    if (msg.startsWith('INVALID_TASK_TRANSITION')) return res.status(409).json({ error: msg })
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors })
    res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export { router as taskRouter }
