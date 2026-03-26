import { randomUUID } from 'crypto';
import type { DbClient } from './db.js';
import { emit } from './event-bus.js';

// ============================================================================
// AI Analysis Layer
// Designed to be backed by external ML service (Claude Vision, custom model, etc.)
// This module defines the interface and orchestration logic.
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export interface ImageAnalysisRequest {
  image_id: string;
  storage_key: string;
  task_category: string;
  requirements?: Record<string, unknown>;
}

export interface ImageAnalysisResult {
  labels: Array<{ label: string; confidence: number }>;
  condition: 'good' | 'fair' | 'poor' | 'damaged' | 'unknown';
  category: string;
  quality_score: number;    // 0-100
  objects_detected: string[];
  analysis: Record<string, unknown>;
}

export interface LeadScoreInput {
  ai_condition: string;
  ai_category: string;
  ai_score: number;
  location: { lat: number; lng: number };
  business_density?: number;
  last_service_date?: string;
}

export interface LeadScoreResult {
  score: number;             // 0-100 probability business needs service
  factors: Array<{ factor: string; weight: number; value: number }>;
  recommended_services: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface RouteRecommendation {
  waypoints: Array<{ lat: number; lng: number; task_id: string; priority: number }>;
  estimated_duration_mins: number;
  estimated_earnings: number;
  tasks_count: number;
}

// ============================================================================
// Image Analysis
// ============================================================================

/**
 * Analyze a captured image.
 * In production, this calls an ML service. Here we define the orchestration.
 */
export async function analyzeImage(
  db: DbClient,
  request: ImageAnalysisRequest,
): Promise<ImageAnalysisResult> {
  // Mark as processing
  await db.query(
    `UPDATE qz_images SET ai_status = 'processing' WHERE id = $1`,
    [request.image_id],
  );

  try {
    // ---- ML SERVICE CALL GOES HERE ----
    // In production: call Claude Vision API, custom model endpoint, etc.
    // For now: return structured placeholder that matches real output format
    const result = await callImageAnalysisService(request);

    // Persist results
    await db.query(
      `UPDATE qz_images
       SET ai_status = 'completed',
           ai_labels = $1,
           ai_condition = $2,
           ai_category = $3,
           ai_score = $4,
           ai_analysis = $5
       WHERE id = $6`,
      [
        JSON.stringify(result.labels),
        result.condition,
        result.category,
        result.quality_score,
        JSON.stringify(result.analysis),
        request.image_id,
      ],
    );

    // Auto-approve high quality images
    if (result.quality_score >= 80) {
      await db.query(
        `UPDATE qz_images SET validation_status = 'auto_approved' WHERE id = $1`,
        [request.image_id],
      );

      await emit(db, {
        aggregate_type: 'image',
        aggregate_id: request.image_id,
        event_type: 'ImageValidated',
        payload: { auto: true, score: result.quality_score },
      });
    } else if (result.quality_score < 40) {
      await db.query(
        `UPDATE qz_images SET validation_status = 'rejected', validation_notes = 'Auto-rejected: low quality score' WHERE id = $1`,
        [request.image_id],
      );
    } else {
      await db.query(
        `UPDATE qz_images SET validation_status = 'manual_review' WHERE id = $1`,
        [request.image_id],
      );
    }

    return result;
  } catch (err) {
    await db.query(
      `UPDATE qz_images SET ai_status = 'failed' WHERE id = $1`,
      [request.image_id],
    );
    throw err;
  }
}

// ============================================================================
// Lead Scoring
// ============================================================================

/**
 * Score a location for business opportunity.
 * Used in IR items to help buyers prioritize.
 */
export function calculateLeadScore(input: LeadScoreInput): LeadScoreResult {
  const factors: LeadScoreResult['factors'] = [];
  let totalScore = 0;

  // Condition factor (poor condition = higher need)
  const conditionScores: Record<string, number> = {
    damaged: 95, poor: 80, fair: 50, good: 15, unknown: 30,
  };
  const conditionScore = conditionScores[input.ai_condition] ?? 30;
  factors.push({ factor: 'condition', weight: 0.35, value: conditionScore });
  totalScore += conditionScore * 0.35;

  // AI quality score (inverse — low quality = more opportunity)
  const qualityFactor = Math.max(0, 100 - input.ai_score);
  factors.push({ factor: 'quality_gap', weight: 0.25, value: qualityFactor });
  totalScore += qualityFactor * 0.25;

  // Business density (more businesses = more demand)
  const densityFactor = Math.min(100, (input.business_density ?? 50) * 2);
  factors.push({ factor: 'business_density', weight: 0.20, value: densityFactor });
  totalScore += densityFactor * 0.20;

  // Recency of last service (longer ago = more need)
  let recencyFactor = 50;
  if (input.last_service_date) {
    const daysSince = (Date.now() - new Date(input.last_service_date).getTime()) / 86400000;
    recencyFactor = Math.min(100, daysSince / 3.65); // 365 days = 100
  }
  factors.push({ factor: 'recency', weight: 0.20, value: recencyFactor });
  totalScore += recencyFactor * 0.20;

  const score = Math.round(totalScore);

  // Determine recommended services based on category + condition
  const services = inferServices(input.ai_category, input.ai_condition);

  const urgency: LeadScoreResult['urgency'] =
    score >= 80 ? 'critical' :
    score >= 60 ? 'high' :
    score >= 40 ? 'medium' : 'low';

  return { score, factors, recommended_services: services, urgency };
}

function inferServices(category: string, condition: string): string[] {
  const services: string[] = [];

  if (condition === 'damaged' || condition === 'poor') {
    services.push('repair', 'renovation');
  }

  if (category === 'facade') {
    services.push('facade_cleaning', 'painting', 'pressure_washing');
  } else if (category === 'signage') {
    services.push('sign_replacement', 'lighting_repair');
  } else if (category === 'storefront') {
    services.push('window_cleaning', 'storefront_renovation');
  }

  if (condition === 'fair') {
    services.push('maintenance', 'inspection');
  }

  return [...new Set(services)];
}

// ============================================================================
// Route Optimization
// ============================================================================

/**
 * Recommend optimal task route for a creator.
 * Simple greedy nearest-neighbor for now. Swap for OR-Tools in production.
 */
export function recommendRoute(
  currentLocation: { lat: number; lng: number },
  tasks: Array<{ id: string; lat: number; lng: number; payout: number; priority: number }>,
  maxDurationMins: number = 120,
): RouteRecommendation {
  const remaining = [...tasks];
  const waypoints: RouteRecommendation['waypoints'] = [];
  let current = currentLocation;
  let totalDuration = 0;
  let totalEarnings = 0;

  while (remaining.length > 0 && totalDuration < maxDurationMins) {
    // Score: priority * 10 - distance (nearest + highest priority wins)
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversine(current.lat, current.lng, remaining[i].lat, remaining[i].lng);
      const score = remaining[i].priority * 10 + remaining[i].payout - dist * 5;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const next = remaining.splice(bestIdx, 1)[0];
    const distKm = haversine(current.lat, current.lng, next.lat, next.lng);
    const travelMins = (distKm / 4) * 60; // ~4 km/h walking
    const taskMins = 5; // avg time per task

    totalDuration += travelMins + taskMins;
    if (totalDuration > maxDurationMins) break;

    waypoints.push({
      lat: next.lat,
      lng: next.lng,
      task_id: next.id,
      priority: next.priority,
    });
    totalEarnings += next.payout;
    current = { lat: next.lat, lng: next.lng };
  }

  return {
    waypoints,
    estimated_duration_mins: Math.round(totalDuration),
    estimated_earnings: Math.round(totalEarnings * 100) / 100,
    tasks_count: waypoints.length,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Placeholder for ML service call.
 * Replace with actual API call in production.
 */
async function callImageAnalysisService(
  _request: ImageAnalysisRequest,
): Promise<ImageAnalysisResult> {
  // This is where you'd call Claude Vision, a custom model, etc.
  // Returning structured placeholder:
  return {
    labels: [
      { label: 'building', confidence: 0.95 },
      { label: 'facade', confidence: 0.88 },
      { label: 'storefront', confidence: 0.72 },
    ],
    condition: 'fair',
    category: 'facade',
    quality_score: 75,
    objects_detected: ['building', 'window', 'door', 'signage'],
    analysis: {
      model: 'placeholder',
      note: 'Replace with real ML service integration',
    },
  };
}
