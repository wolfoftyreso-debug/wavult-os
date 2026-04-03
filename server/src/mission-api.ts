import { Router, Request, Response } from 'express'
import MissionEngine from './mission-engine'
import { supabase } from './supabase'

export const missionRouter = Router()

// POST /api/missions — Skapa uppdrag (kräver autentisering)
missionRouter.post('/', async (req: Request, res: Response) => {
  if (!(req as any).user) {
    return res.status(401).json({ ok: false, error: 'Authentication required to create missions' })
  }
  try {
    const result = await MissionEngine.createMission(req.body)
    res.status(201).json({ ok: true, data: result })
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
})

// GET /api/missions/nearby?lat=&lng=&radius= — Uppdrag nära position
missionRouter.get('/nearby', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string)
    const lng = parseFloat(req.query.lng as string)
    const radius = parseInt(req.query.radius as string) || 10000
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ ok: false, error: 'lat/lng required' })
    }
    const missions = await MissionEngine.findNearbyMissions(lat, lng, radius)
    res.json({ ok: true, data: missions })
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
})

// GET /api/missions/client/:orgId — Klientens uppdrag
missionRouter.get('/client/:orgId', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined
    const missions = await MissionEngine.getClientMissions(req.params.orgId, status as any)
    res.json({ ok: true, data: missions })
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
})

// GET /api/missions/photographer/:photographerId — Fotografens uppdrag
missionRouter.get('/photographer/:photographerId', async (req: Request, res: Response) => {
  try {
    const missions = await MissionEngine.getPhotographerMissions(req.params.photographerId)
    res.json({ ok: true, data: missions })
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
})

// POST /api/missions/:id/assign — Zoomer accepterar uppdrag (kräver autentisering)
missionRouter.post('/:id/assign', async (req: Request, res: Response) => {
  if (!(req as any).user) {
    return res.status(401).json({ ok: false, error: 'Authentication required' })
  }
  // zoomerId kan skickas i body, annars används inloggad users id
  const zoomerId = req.body.zoomerId ?? (req as any).user.id
  try {
    await MissionEngine.assignMission(req.params.id, zoomerId)
    res.json({ ok: true })
  } catch (err: unknown) {
    res.status(400).json({ ok: false, error: (err as Error).message })
  }
})

// POST /api/missions/:id/start — Fotograf startar uppdrag
missionRouter.post('/:id/start', async (req: Request, res: Response) => {
  try {
    await MissionEngine.startMission(req.params.id, req.body.photographerId)
    res.json({ ok: true })
  } catch (err: unknown) {
    res.status(400).json({ ok: false, error: (err as Error).message })
  }
})

// POST /api/missions/:id/deliver — Fotograf levererar bild
missionRouter.post('/:id/deliver', async (req: Request, res: Response) => {
  try {
    const result = await MissionEngine.deliverImage({ missionId: req.params.id, ...req.body })
    res.json({ ok: true, data: result })
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
})

// POST /api/missions/:id/complete — Verifiera och complete
missionRouter.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    await MissionEngine.completeMission(req.params.id, req.body.reviewedBy ?? 'system')
    res.json({ ok: true })
  } catch (err: unknown) {
    res.status(400).json({ ok: false, error: (err as Error).message })
  }
})

// GET /api/missions/:id — Hämta ett specifikt uppdrag med deliverables
missionRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('missions')
      .select(`*, mission_deliverables(*), mission_events(*)`)
      .eq('id', req.params.id)
      .single()
    if (error || !data) return res.status(404).json({ ok: false, error: 'Not found' })
    res.json({ ok: true, data })
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
})
