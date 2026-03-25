/**
 * quiXzoom Media Pipeline v1
 *
 * Flow:
 * 1. Client requests presigned URL
 * 2. Client uploads directly to S3
 * 3. S3 event (or webhook) triggers processUpload()
 * 4. EXIF extracted, geo set, thumbnail generated
 * 5. AI queue populated
 * 6. CDN URL returned
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { supabase } from './supabase'

// ── Config ──────────────────────────────────────────────────────────────────

const S3_BUCKET  = process.env.QUIXZOOM_S3_BUCKET ?? 'wavult-quixzoom-media'
const CDN_BASE   = process.env.QUIXZOOM_CDN_URL ?? `https://${S3_BUCKET}.s3.eu-north-1.amazonaws.com`
const AWS_REGION = process.env.AWS_REGION ?? 'eu-north-1'

const s3 = new S3Client({ region: AWS_REGION })

// ── Types ──────────────────────────────────────────────────────────────────

export interface RequestUploadInput {
  orgId: string
  missionId?: string
  photographerId?: string
  filename: string
  mimeType?: string
  fileSizeBytes?: number
}

export interface UploadResult {
  uploadId: string
  fileKey: string
  presignedUrl: string
  expiresAt: Date
}

export interface ProcessedMedia {
  mediaId: string
  fileKey: string
  cdnUrl: string
  thumbnailUrl?: string
  lat?: number
  lng?: number
  capturedAt?: Date
  aiTags: string[]
}

// ── EXIF Parser (lightweight, no native deps) ─────────────────────────────

function parseExifGps(_buffer: Buffer): { lat?: number; lng?: number; altitude?: number; capturedAt?: Date } {
  try {
    // JPEG EXIF markers
    let offset = 0
    if (_buffer[0] !== 0xFF || _buffer[1] !== 0xD8) return {}

    while (offset < _buffer.length - 1) {
      if (_buffer[offset] !== 0xFF) break
      const marker = _buffer[offset + 1]
      if (marker === 0xE1) {
        // APP1 — EXIF
        const segLen = _buffer.readUInt16BE(offset + 2)
        const exifHeader = _buffer.slice(offset + 4, offset + 10).toString('ascii')
        if (exifHeader.startsWith('Exif')) {
          // Minimal EXIF parsing — extract GPS if present
          // For production: use 'exifr' npm package
          // Here we return empty and let the client provide GPS
          return {}
        }
        offset += 2 + segLen
      } else if (marker === 0xDA) {
        break // Start of scan, stop
      } else {
        const segLen = _buffer.readUInt16BE(offset + 2)
        offset += 2 + segLen
      }
    }
  } catch {
    // Silent fail — GPS from client metadata
  }
  return {}
}

// Export for potential future use
export { parseExifGps }

// ── Media Pipeline ─────────────────────────────────────────────────────────

export const MediaPipeline = {

  /**
   * Steg 1: Generera presigned S3 URL för direktuppladdning
   */
  async requestUpload(input: RequestUploadInput): Promise<UploadResult> {
    const timestamp = Date.now()
    const ext = input.filename.split('.').pop()?.toLowerCase() ?? 'jpg'
    const fileKey = `uploads/${input.orgId}/${input.missionId ?? 'general'}/${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)  // 15 min

    // Generera presigned URL
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileKey,
      ContentType: input.mimeType ?? 'image/jpeg',
    })
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 900 })

    // Spara token i Supabase
    const { data: token } = await supabase
      .from('presigned_upload_tokens')
      .insert({
        org_id: input.orgId,
        mission_id: input.missionId,
        photographer_id: input.photographerId,
        file_key: fileKey,
        presigned_url: presignedUrl,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single()

    // Skapa media_uploads rad (PENDING tills upload är klar)
    await supabase.from('media_uploads').insert({
      org_id: input.orgId,
      mission_id: input.missionId,
      photographer_id: input.photographerId,
      original_filename: input.filename,
      file_key: fileKey,
      file_size_bytes: input.fileSizeBytes,
      mime_type: input.mimeType ?? 'image/jpeg',
      cdn_url: `${CDN_BASE}/${fileKey}`,
      pipeline_status: 'PENDING',
    })

    return {
      uploadId: token?.id ?? fileKey,
      fileKey,
      presignedUrl,
      expiresAt,
    }
  },

  /**
   * Steg 2: Bekräfta uppladdning + trigga pipeline
   * Kallas efter att klienten laddat upp till S3
   */
  async confirmUpload(fileKey: string, metadata?: {
    lat?: number
    lng?: number
    altitude?: number
    bearing?: number
    capturedAt?: string
    fileSizeBytes?: number
    exifData?: Record<string, unknown>
  }): Promise<ProcessedMedia> {
    // Uppdatera presigned token
    await supabase
      .from('presigned_upload_tokens')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('file_key', fileKey)

    // Hämta media-raden
    const { data: media } = await supabase
      .from('media_uploads')
      .select('*')
      .eq('file_key', fileKey)
      .single()

    if (!media) throw new Error(`Media not found for key: ${fileKey}`)

    // Sätt geo om tillhandahållen
    const hasGeo = metadata?.lat != null && metadata?.lng != null
    const geoSource = hasGeo ? 'MANUAL' : 'NONE'

    await supabase.from('media_uploads').update({
      pipeline_status: 'PROCESSING',
      capture_lat: metadata?.lat,
      capture_lng: metadata?.lng,
      capture_altitude: metadata?.altitude,
      capture_bearing: metadata?.bearing,
      captured_at: metadata?.capturedAt ?? new Date().toISOString(),
      geo_source: geoSource,
      capture_location: hasGeo
        ? `SRID=4326;POINT(${metadata!.lng} ${metadata!.lat})`
        : null,
      file_size_bytes: metadata?.fileSizeBytes ?? media.file_size_bytes,
      exif_data: metadata?.exifData ?? {},
      cdn_url: `${CDN_BASE}/${fileKey}`,
      updated_at: new Date().toISOString(),
    }).eq('file_key', fileKey)

    // Lägg i AI-kö (placeholder — ersätts med PhotoPrism/ONNX i sprint 3)
    await supabase.from('ai_processing_queue').insert({
      media_id: media.id,
      priority: 50,
      status: 'PENDING',
      model_requested: 'basic-tagging',
    })

    // Kör basic AI-tagging direkt (placeholder)
    const aiTags = await MediaPipeline.runBasicTagging(media.id, fileKey)

    // Markera som READY
    await supabase.from('media_uploads').update({
      pipeline_status: 'READY',
      ai_tags: aiTags,
      ai_processed_at: new Date().toISOString(),
      ai_model: 'placeholder-v1',
      updated_at: new Date().toISOString(),
    }).eq('file_key', fileKey)

    return {
      mediaId: media.id,
      fileKey,
      cdnUrl: `${CDN_BASE}/${fileKey}`,
      thumbnailUrl: undefined,
      lat: metadata?.lat,
      lng: metadata?.lng,
      capturedAt: metadata?.capturedAt ? new Date(metadata.capturedAt) : undefined,
      aiTags,
    }
  },

  /**
   * Basic AI-tagging (placeholder — ersätts med PhotoPrism/ONNX)
   * Genererar relevanta tags baserat på filnamn och metadata
   */
  async runBasicTagging(mediaId: string, fileKey: string): Promise<string[]> {
    // Placeholder: returnera generiska tags
    // Sprint 3: anropa PhotoPrism eller ONNX-modell
    const tags: string[] = ['image', 'field-capture']

    if (fileKey.includes('infrastructure')) tags.push('infrastructure')
    if (fileKey.includes('urban')) tags.push('urban', 'city')
    if (fileKey.includes('road')) tags.push('road', 'traffic')

    // Markera AI-kö som COMPLETED
    await supabase.from('ai_processing_queue').update({
      status: 'COMPLETED',
      result: { tags },
      processed_at: new Date().toISOString(),
    }).eq('media_id', mediaId).eq('status', 'PENDING')

    return tags
  },

  /**
   * Hämta signerad nedladdnings-URL (för skyddade bilder)
   */
  async getDownloadUrl(fileKey: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: fileKey })
    return getSignedUrl(s3, command, { expiresIn: expiresInSeconds })
  },

  /**
   * Hämta alla media för ett uppdrag
   */
  async getMissionMedia(missionId: string): Promise<unknown[]> {
    const { data } = await supabase
      .from('media_uploads')
      .select('*')
      .eq('mission_id', missionId)
      .eq('pipeline_status', 'READY')
      .order('created_at', { ascending: false })
    return data ?? []
  },

  /**
   * Geo-sökning: hitta bilder tagna nära en position
   */
  async findMediaNearLocation(lat: number, lng: number, radiusMeters = 1000): Promise<unknown[]> {
    // Geo-query för media inom radius
    const { data: mediaData } = await supabase
      .from('media_uploads')
      .select('id, file_key, cdn_url, capture_lat, capture_lng, ai_tags, ai_description, captured_at')
      .eq('pipeline_status', 'READY')
      .not('capture_lat', 'is', null)
      .gte('capture_lat', lat - radiusMeters / 111320)
      .lte('capture_lat', lat + radiusMeters / 111320)
      .gte('capture_lng', lng - radiusMeters / (111320 * Math.cos(lat * Math.PI / 180)))
      .lte('capture_lng', lng + radiusMeters / (111320 * Math.cos(lat * Math.PI / 180)))
      .limit(50)

    return mediaData ?? []
  },
}

export default MediaPipeline
