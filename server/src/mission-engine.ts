/**
 * quiXzoom Mission Engine v1
 * Hanterar uppdrag från skapande till leverans och payout
 */

import { supabase } from './supabase'
import BillingService from './billing-lago'
import PayoutEngine from './payout-engine'

// ── Types ──────────────────────────────────────────────────────────────────

export type MissionStatus =
  | 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'DELIVERED'
  | 'UNDER_REVIEW' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'

export interface CreateMissionInput {
  orgId: string
  clientOrgId: string
  createdBy: string
  title: string
  description?: string
  instructions?: string
  lat: number
  lng: number
  radiusMeters?: number
  imagesRequired?: number
  imageSpecs?: Record<string, unknown>
  payoutMinor: number
  clientPriceMinor: number
  currency?: string
  deadlineHours?: number
  metadata?: Record<string, unknown>
}

export interface DeliverableInput {
  missionId: string
  photographerId: string
  fileKey: string
  fileUrl?: string
  fileSizeBytes?: number
  mimeType?: string
  lat?: number
  lng?: number
  altitude?: number
  bearing?: number
  capturedAt?: Date
  exifData?: Record<string, unknown>
}

// ── Mission Service ────────────────────────────────────────────────────────

export const MissionEngine = {

  /**
   * Skapa ett nytt uppdrag
   */
  async createMission(input: CreateMissionInput): Promise<{ missionId: string }> {
    const deadline = input.deadlineHours
      ? new Date(Date.now() + input.deadlineHours * 3600000).toISOString()
      : new Date(Date.now() + 7 * 86400000).toISOString()

    const { data, error } = await supabase
      .from('missions')
      .insert({
        org_id: input.orgId,
        client_org_id: input.clientOrgId,
        created_by: input.createdBy,
        title: input.title,
        description: input.description,
        instructions: input.instructions,
        target_location: `SRID=4326;POINT(${input.lng} ${input.lat})`,
        radius_meters: input.radiusMeters ?? 1000,
        images_required: input.imagesRequired ?? 1,
        image_specs: input.imageSpecs ?? {},
        status: 'OPEN',
        payout_minor: input.payoutMinor,
        client_price_minor: input.clientPriceMinor,
        currency: input.currency ?? 'USD',
        deadline,
        metadata: input.metadata ?? {},
      })
      .select('id')
      .single()

    if (error || !data) throw new Error(`Failed to create mission: ${error?.message}`)

    // Logga billing event för kunden (non-blocking)
    BillingService.trackUsage({
      orgId: input.clientOrgId,
      customerId: input.clientOrgId,
      metricCode: 'missions_completed',
      quantity: 0,  // uppdateras vid completion
      properties: { mission_id: data.id, status: 'created' },
      idempotencyKey: `mission-created-${data.id}`,
    }).catch(() => {})

    return { missionId: data.id }
  },

  /**
   * Zoomer accepterar ett uppdrag — atomisk assignment via PostgreSQL RPC.
   *
   * SELECT + UPDATE separerat skapar en race condition där två zoomers
   * kan assignas till samma mission. RPC:n gör en conditional UPDATE
   * (WHERE status = 'OPEN') i en enda databastransaktion — atomar och korrekt.
   */
  async assignMission(missionId: string, zoomerId: string): Promise<void> {
    const { error } = await supabase.rpc('assign_mission', {
      p_mission_id: missionId,
      p_zoomer_id:  zoomerId,
    })
    if (error) throw new Error(error.message)
  },

  /**
   * Fotograf startar ett uppdrag
   */
  async startMission(missionId: string, photographerId: string): Promise<void> {
    await supabase.rpc('transition_mission', {
      p_mission_id: missionId,
      p_to_status: 'IN_PROGRESS',
      p_actor_id: photographerId,
      p_actor_type: 'PHOTOGRAPHER',
    })
  },

  /**
   * Fotograf levererar en bild
   */
  async deliverImage(input: DeliverableInput): Promise<{ deliverableId: string }> {
    const { data, error } = await supabase
      .from('mission_deliverables')
      .insert({
        mission_id: input.missionId,
        photographer_id: input.photographerId,
        file_key: input.fileKey,
        file_url: input.fileUrl,
        file_size_bytes: input.fileSizeBytes,
        mime_type: input.mimeType ?? 'image/jpeg',
        capture_location: input.lat != null && input.lng != null
          ? `SRID=4326;POINT(${input.lng} ${input.lat})`
          : null,
        capture_altitude: input.altitude,
        capture_bearing: input.bearing,
        captured_at: (input.capturedAt ?? new Date()).toISOString(),
        exif_data: input.exifData ?? {},
        status: 'UPLOADED',
      })
      .select('id')
      .single()

    if (error || !data) throw new Error(`Failed to save deliverable: ${error?.message}`)

    // Kolla om uppdraget är färdigt (alla bilder levererade)
    const { data: mission } = await supabase
      .from('missions')
      .select('images_required, id, org_id, client_org_id, payout_minor, currency')
      .eq('id', input.missionId)
      .single()

    const { count: deliveredCount } = await supabase
      .from('mission_deliverables')
      .select('*', { count: 'exact', head: true })
      .eq('mission_id', input.missionId)
      .eq('status', 'UPLOADED')

    if (mission && (deliveredCount ?? 0) >= mission.images_required) {
      await supabase.rpc('transition_mission', {
        p_mission_id: input.missionId,
        p_to_status: 'DELIVERED',
        p_actor_id: input.photographerId,
        p_actor_type: 'PHOTOGRAPHER',
        p_metadata: { deliverables_count: deliveredCount },
      })
    }

    return { deliverableId: data.id }
  },

  /**
   * Verifiera leverans och trigga payout (kallas av Optic Insights eller auto-system)
   */
  async completeMission(missionId: string, reviewedBy: string): Promise<void> {
    const { data: mission } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .single()

    if (!mission) throw new Error('Mission not found')
    if (!['DELIVERED', 'UNDER_REVIEW'].includes(mission.status)) {
      throw new Error(`Cannot complete mission in status: ${mission.status}`)
    }

    // Markera leverabler som accepterade
    await supabase
      .from('mission_deliverables')
      .update({ status: 'ACCEPTED', reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
      .eq('mission_id', missionId)
      .eq('status', 'UPLOADED')

    // Uppdatera fotografens statistik (non-critical)
    if (mission.assigned_photographer_id) {
      void supabase.rpc('increment_photographer_stats', {
        p_photographer_id: mission.assigned_photographer_id,
        p_missions: 1,
        p_images: 0,  // uppdateras separat
        p_earned: mission.payout_minor,
      })
    }

    // Trigga billing event för kunden (non-blocking)
    BillingService.trackUsage({
      orgId: mission.client_org_id,
      customerId: mission.client_org_id,
      metricCode: 'missions_completed',
      quantity: 1,
      properties: { mission_id: missionId },
      idempotencyKey: `mission-completed-${missionId}`,
    }).catch(() => {})

    // Transition till COMPLETED
    await supabase.rpc('transition_mission', {
      p_mission_id: missionId,
      p_to_status: 'COMPLETED',
      p_actor_id: reviewedBy,
      p_actor_type: 'ADMIN',
    })

    // Trigga payout (fire & forget — retries hanteras av n8n)
    PayoutEngine.triggerMissionPayout(missionId).catch((err: unknown) => {
      console.error('Payout trigger failed (will retry):', err)
    })
  },

  /**
   * Hämta uppdrag nära en position
   */
  async findNearbyMissions(lat: number, lng: number, radiusMeters = 10000): Promise<unknown[]> {
    const { data, error } = await supabase.rpc('find_nearby_missions', {
      p_lat: lat,
      p_lng: lng,
      p_radius_meters: radiusMeters,
    })
    if (error) throw new Error(`Geo query failed: ${error.message}`)
    return data ?? []
  },

  /**
   * Hämta alla uppdrag för en klient (Optic Insights dashboard)
   */
  async getClientMissions(clientOrgId: string, status?: MissionStatus): Promise<unknown[]> {
    let query = supabase
      .from('missions')
      .select(`
        *,
        mission_deliverables(id, file_url, status, ai_tags, ai_description, capture_location),
        photographers(display_name, avg_rating)
      `)
      .eq('client_org_id', clientOrgId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw new Error(`Failed to get missions: ${error.message}`)
    return data ?? []
  },

  /**
   * Hämta uppdrag för en fotograf
   */
  async getPhotographerMissions(photographerId: string, status?: MissionStatus): Promise<unknown[]> {
    let query = supabase
      .from('missions')
      .select('*')
      .eq('assigned_photographer_id', photographerId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw new Error(`Failed to get photographer missions: ${error.message}`)
    return data ?? []
  },
}

export default MissionEngine
