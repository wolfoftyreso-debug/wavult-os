import { Router } from 'express'
import MediaPipeline from './media-pipeline'

export const mediaRouter = Router()

// POST /api/media/request-upload — Begär presigned URL
mediaRouter.post('/request-upload', async (req, res) => {
  try {
    const result = await MediaPipeline.requestUpload(req.body)
    res.json({ ok: true, data: result })
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
})

// POST /api/media/confirm/:fileKey — Bekräfta uppladdning + trigga pipeline
mediaRouter.post('/confirm/:fileKey', async (req, res) => {
  try {
    const fileKey = decodeURIComponent(req.params.fileKey)
    const result = await MediaPipeline.confirmUpload(fileKey, req.body)
    res.json({ ok: true, data: result })
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
})

// GET /api/media/mission/:missionId — Hämta media för ett uppdrag
mediaRouter.get('/mission/:missionId', async (req, res) => {
  try {
    const media = await MediaPipeline.getMissionMedia(req.params.missionId)
    res.json({ ok: true, data: media })
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
})

// GET /api/media/download/:fileKey — Signerad nedladdnings-URL
mediaRouter.get('/download/:fileKey', async (req, res) => {
  try {
    const fileKey = decodeURIComponent(req.params.fileKey)
    const url = await MediaPipeline.getDownloadUrl(fileKey)
    res.json({ ok: true, data: { url } })
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
})

// GET /api/media/near — Hitta bilder nära en position
// Query params: lat, lng, radius (meters, default 1000)
mediaRouter.get('/near', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string)
    const lng = parseFloat(req.query.lng as string)
    const radius = parseInt(req.query.radius as string) || 1000
    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ ok: false, error: 'lat and lng are required' })
      return
    }
    const media = await MediaPipeline.findMediaNearLocation(lat, lng, radius)
    res.json({ ok: true, data: media })
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
})
