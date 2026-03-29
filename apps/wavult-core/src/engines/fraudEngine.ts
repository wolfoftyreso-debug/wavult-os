import crypto from 'crypto'

export interface MediaFile {
  buffer: Buffer
  gps_lat?: number
  gps_lng?: number
  captured_at?: Date
  device_model?: string
}

export interface FraudCheckResult {
  passed: boolean
  flags: string[]
  duplicate_hash?: string
}

// In-memory hash store (replace with Redis/DB in prod)
const knownHashes = new Set<string>()

export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export function checkFraud(media: MediaFile, taskGpsLat: number, taskGpsLng: number): FraudCheckResult {
  const flags: string[] = []

  // 1. GPS required check
  if (!media.gps_lat || !media.gps_lng) {
    flags.push('NO_GPS_DATA')
  }

  // 2. GPS mismatch check (>500m from task location)
  if (media.gps_lat && media.gps_lng) {
    const dist = haversineDistance(media.gps_lat, media.gps_lng, taskGpsLat, taskGpsLng)
    if (dist > 0.5) {  // 500 meters
      flags.push(`GPS_MISMATCH: ${dist.toFixed(2)}km from task location`)
    }
  }

  // 3. Duplicate detection
  const hash = computeFileHash(media.buffer)
  if (knownHashes.has(hash)) {
    flags.push('DUPLICATE_IMAGE')
  } else {
    knownHashes.add(hash)
  }

  // 4. Timestamp anomaly
  if (media.captured_at) {
    const now = new Date()
    const diffHours = Math.abs(now.getTime() - media.captured_at.getTime()) / 3600000
    if (diffHours > 24) {
      flags.push(`TIMESTAMP_ANOMALY: captured ${diffHours.toFixed(1)}h ago`)
    }
  }

  return {
    passed: flags.length === 0,
    flags,
    duplicate_hash: flags.includes('DUPLICATE_IMAGE') ? computeFileHash(media.buffer) : undefined,
  }
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371  // km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}
