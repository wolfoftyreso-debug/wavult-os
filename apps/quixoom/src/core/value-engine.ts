import type { DbClient } from './db.js';
import { log as auditLog } from './audit.js';

// ============================================================================
// Value Discovery Engine (VDE)
//
// Answers: What has value? For whom? How much? How fast can we get the data?
//
// Value Score = Demand × 0.35 + Scarcity × 0.25 + Accuracy × 0.20 + Freshness × 0.20
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export interface ValueAssessment {
  demand_score: number;     // 0-100: how many buyers want this
  scarcity_score: number;   // 0-100: how little existing data exists
  accuracy_need: number;    // 0-100: how precise the data needs to be
  freshness_need: number;   // 0-100: how time-sensitive
  value_score: number;      // 0-100: composite
  payout_multiplier: number; // 1.0 - 3.0x base payout
  suggested_payout_per_image: number;
  buyer_segments: string[];
  reasoning: string[];
}

export interface AreaContext {
  latitude: number;
  longitude: number;
  area_name?: string;
  city?: string;
  area_type?: 'residential' | 'commercial' | 'industrial' | 'mixed';
  category: string;
}

export interface DemandSignal {
  search_count: number;
  ir_purchase_count: number;
  query_count: number;
  external_signal_count: number;
  last_capture_at?: string;
  existing_images: number;
}

// ============================================================================
// Demand Scoring
// ============================================================================

/**
 * Calculate demand score from aggregated signals.
 */
export function scoreDemand(signals: DemandSignal): number {
  const raw =
    signals.search_count * 2.0 +
    signals.ir_purchase_count * 10.0 +
    signals.query_count * 3.0 +
    signals.external_signal_count * 5.0;

  return Math.min(100, Math.round(raw));
}

/**
 * Calculate scarcity score: less existing data = higher score.
 */
export function scoreScarcity(existingImages: number, lastCaptureAt?: string): number {
  // Few images = high scarcity
  let imageScore: number;
  if (existingImages === 0) imageScore = 100;
  else if (existingImages < 5) imageScore = 85;
  else if (existingImages < 20) imageScore = 60;
  else if (existingImages < 50) imageScore = 35;
  else imageScore = 10;

  // Stale data = higher scarcity
  let freshnessBoost = 0;
  if (lastCaptureAt) {
    const daysSince = (Date.now() - new Date(lastCaptureAt).getTime()) / 86400000;
    if (daysSince > 90) freshnessBoost = 30;
    else if (daysSince > 30) freshnessBoost = 15;
    else if (daysSince > 7) freshnessBoost = 5;
  } else {
    freshnessBoost = 20; // never captured
  }

  return Math.min(100, imageScore + freshnessBoost);
}

/**
 * Calculate accuracy need based on category.
 */
export function scoreAccuracyNeed(category: string): number {
  const scores: Record<string, number> = {
    construction: 90,    // high precision needed
    property: 80,
    infrastructure: 75,
    retail: 60,
    commercial: 55,
    event: 40,
  };
  return scores[category] ?? 50;
}

/**
 * Calculate freshness need based on category.
 */
export function scoreFreshnessNeed(category: string, frequency?: string): number {
  const categoryScores: Record<string, number> = {
    infrastructure: 90,  // parking changes hourly
    retail: 75,          // storefronts change weekly
    commercial: 60,
    property: 40,        // facades change slowly
    construction: 95,    // daily changes
  };

  const frequencyBoost: Record<string, number> = {
    daily: 20,
    weekly: 10,
    monthly: 0,
    once: -10,
  };

  const base = categoryScores[category] ?? 50;
  const boost = frequencyBoost[frequency ?? 'once'] ?? 0;
  return Math.min(100, Math.max(0, base + boost));
}

// ============================================================================
// Full Value Assessment
// ============================================================================

/**
 * Run a full value assessment for an area + category.
 */
export async function assessValue(
  db: DbClient,
  context: AreaContext,
): Promise<ValueAssessment> {
  const reasoning: string[] = [];

  // 1. Get demand signals from DB
  const { rows: signalRows } = await db.query(
    `SELECT * FROM qz_demand_signals
     WHERE category = $1 AND (area_name = $2 OR city = $3)
     ORDER BY demand_score DESC LIMIT 1`,
    [context.category, context.area_name ?? '', context.city ?? ''],
  );

  const signals: DemandSignal = signalRows[0] ?? {
    search_count: 0, ir_purchase_count: 0, query_count: 0,
    external_signal_count: 0, existing_images: 0,
  };

  // 2. Score each dimension
  const demand_score = scoreDemand(signals);
  reasoning.push(`Demand: ${demand_score}/100 (${signals.search_count} searches, ${signals.ir_purchase_count} IR purchases)`);

  const scarcity_score = scoreScarcity(signals.existing_images, signals.last_capture_at);
  reasoning.push(`Scarcity: ${scarcity_score}/100 (${signals.existing_images} existing images)`);

  const accuracy_need = scoreAccuracyNeed(context.category);
  reasoning.push(`Accuracy need: ${accuracy_need}/100 (category: ${context.category})`);

  const freshness_need = scoreFreshnessNeed(context.category);
  reasoning.push(`Freshness need: ${freshness_need}/100`);

  // 3. Composite value score
  const value_score = Math.round(
    demand_score * 0.35 +
    scarcity_score * 0.25 +
    accuracy_need * 0.20 +
    freshness_need * 0.20
  );

  // 4. Payout multiplier: value score maps to 1.0-3.0x
  const payout_multiplier = Math.round((1.0 + (value_score / 100) * 2.0) * 100) / 100;

  // 5. Base payout per image (from template or default)
  const { rows: templateRows } = await db.query(
    `SELECT base_payout_per_image FROM qz_package_templates WHERE category = $1 LIMIT 1`,
    [context.category],
  );
  const basePayout = templateRows[0]?.base_payout_per_image ?? 7.0;
  const suggested_payout_per_image = Math.round(basePayout * payout_multiplier * 100) / 100;

  // 6. Determine buyer segments
  const buyer_segments = inferBuyerSegments(context);

  reasoning.push(`Value score: ${value_score}/100 → payout multiplier: ${payout_multiplier}x`);
  reasoning.push(`Suggested payout: ${suggested_payout_per_image} SEK/image`);
  reasoning.push(`Buyer segments: ${buyer_segments.join(', ')}`);

  return {
    demand_score,
    scarcity_score,
    accuracy_need,
    freshness_need,
    value_score,
    payout_multiplier,
    suggested_payout_per_image,
    buyer_segments,
    reasoning,
  };
}

/**
 * Batch assess multiple areas — used by creative engine to prioritize.
 */
export async function batchAssess(
  db: DbClient,
  contexts: AreaContext[],
): Promise<Array<AreaContext & ValueAssessment>> {
  const results: Array<AreaContext & ValueAssessment> = [];

  for (const ctx of contexts) {
    const assessment = await assessValue(db, ctx);
    results.push({ ...ctx, ...assessment });
  }

  // Sort by value score descending
  results.sort((a, b) => b.value_score - a.value_score);
  return results;
}

/**
 * Record a demand signal (increments counters).
 */
export async function recordDemandSignal(
  db: DbClient,
  params: {
    category: string;
    area_name?: string;
    city?: string;
    signal_type: 'search' | 'ir_purchase' | 'query' | 'external';
    latitude?: number;
    longitude?: number;
  },
): Promise<void> {
  const column = {
    search: 'search_count',
    ir_purchase: 'ir_purchase_count',
    query: 'query_count',
    external: 'external_signal_count',
  }[params.signal_type];

  await db.query(
    `INSERT INTO qz_demand_signals (id, category, area_name, city, country, latitude, longitude, ${column})
     VALUES (gen_random_uuid(), $1, $2, $3, 'SE', $4, $5, 1)
     ON CONFLICT (category, area_name, city)
     DO UPDATE SET ${column} = qz_demand_signals.${column} + 1, updated_at = now()`,
    [params.category, params.area_name ?? '', params.city ?? '',
     params.latitude ?? null, params.longitude ?? null],
  );
}

// ============================================================================
// Helpers
// ============================================================================

function inferBuyerSegments(context: AreaContext): string[] {
  const segments: string[] = [];

  const categorySegments: Record<string, string[]> = {
    retail: ['window_cleaner', 'retail_analytics', 'advertising_agency'],
    property: ['painter', 'property_manager', 'renovation_company', 'insurance'],
    infrastructure: ['municipality', 'parking_company', 'urban_planner'],
    commercial: ['sign_company', 'advertising_agency', 'brand_owner'],
    construction: ['construction_company', 'insurance', 'inspector'],
  };

  segments.push(...(categorySegments[context.category] ?? []));

  // Area type modifiers
  if (context.area_type === 'residential') {
    segments.push('home_services', 'gardener');
  } else if (context.area_type === 'commercial') {
    segments.push('commercial_cleaning', 'security');
  }

  return [...new Set(segments)];
}
