import { randomUUID } from 'crypto';
import type { DbClient } from './db.js';
import { emit } from './event-bus.js';
import { log as auditLog } from './audit.js';
import * as valueEngine from './value-engine.js';
import * as geo from './geo.js';

// ============================================================================
// Creative Engine
//
// Generates Photo Packages based on:
//   1. Creator's GPS position
//   2. Demand signals for the area
//   3. AI gap detection (what data is missing)
//   4. Value scoring (what's worth the most)
//
// Output: 3-5 actionable packages with routes, payouts, and instructions
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export interface PhotoPackage {
  id: string;
  template_slug: string;
  title: string;
  description: string;
  category: string;
  icon: string;

  // Location
  latitude: number;
  longitude: number;
  radius_meters: number;
  area_name: string;

  // What to capture
  target_count: number;
  required_images: number;
  target_objects: string[];
  analysis_types: string[];

  // Value
  value_score: number;
  total_payout: number;
  payout_per_image: number;
  currency: string;

  // For UI
  label: 'hot_demand' | 'quick_money' | 'build_ir' | 'recurring' | 'exclusive';
  estimated_time_mins: number;
  distance_meters: number;
  buyer_segments: string[];
}

export interface GenerateOptions {
  latitude: number;
  longitude: number;
  user_id: string;
  user_tier: number;
  max_packages?: number;
  max_radius_km?: number;
  preferred_categories?: string[];
}

export interface GenerateResult {
  packages: PhotoPackage[];
  area_summary: {
    area_name: string;
    city: string;
    total_value: number;
    top_demand_category: string;
  };
}

// ============================================================================
// Package Generation
// ============================================================================

/**
 * Main entry point: generate photo packages for a creator at a given location.
 *
 * Flow:
 * 1. Load active templates
 * 2. For each template, run value assessment
 * 3. Score and rank
 * 4. Generate top N packages
 * 5. Calculate routes + time estimates
 */
export async function generatePackages(
  db: DbClient,
  options: GenerateOptions,
): Promise<GenerateResult> {
  const maxPkg = options.max_packages ?? 5;
  const maxRadius = options.max_radius_km ?? 3;

  // 1. Load templates accessible to this tier
  const { rows: templates } = await db.query(
    `SELECT * FROM qz_package_templates WHERE active = true ORDER BY value_multiplier DESC`,
  );

  // 2. Value assess each template × location combo
  const candidates: Array<{
    template: any;
    assessment: valueEngine.ValueAssessment;
    distance_m: number;
  }> = [];

  // Get area name from nearby packages or demand signals
  const { rows: areaRows } = await db.query(
    `SELECT area_name, city FROM qz_demand_signals
     WHERE latitude IS NOT NULL
     ORDER BY (
       6371000 * acos(
         cos(radians($1)) * cos(radians(latitude)) *
         cos(radians(longitude) - radians($2)) +
         sin(radians($1)) * sin(radians(latitude))
       )
     ) ASC LIMIT 1`,
    [options.latitude, options.longitude],
  );

  const areaName = areaRows[0]?.area_name ?? 'Nearby Area';
  const city = areaRows[0]?.city ?? 'Stockholm';

  for (const tmpl of templates) {
    const assessment = await valueEngine.assessValue(db, {
      latitude: options.latitude,
      longitude: options.longitude,
      area_name: areaName,
      city,
      category: tmpl.category,
    });

    // Tier filter
    if (tmpl.min_level_tier && tmpl.min_level_tier > options.user_tier) continue;

    candidates.push({
      template: tmpl,
      assessment,
      distance_m: 0, // packages are generated at user location
    });
  }

  // 3. Check for demand-driven packages (high demand areas near user)
  const { rows: demandAreas } = await db.query(
    `SELECT * FROM qz_demand_signals
     WHERE demand_score > 30
     ORDER BY demand_score DESC LIMIT 10`,
  );

  for (const da of demandAreas) {
    if (!da.latitude || !da.longitude) continue;
    const distKm = geo.distanceKm(
      { lat: options.latitude, lng: options.longitude },
      { lat: parseFloat(da.latitude), lng: parseFloat(da.longitude) },
    );
    if (distKm > maxRadius) continue;

    // Find matching template
    const matchingTemplate = templates.find(t => t.category === da.category);
    if (!matchingTemplate) continue;

    // Boost value score for demand-driven
    const assessment = await valueEngine.assessValue(db, {
      latitude: parseFloat(da.latitude),
      longitude: parseFloat(da.longitude),
      area_name: da.area_name,
      city: da.city,
      category: da.category,
    });

    candidates.push({
      template: matchingTemplate,
      assessment: { ...assessment, value_score: Math.min(100, assessment.value_score + 15) },
      distance_m: Math.round(distKm * 1000),
    });
  }

  // 4. Sort by value score, deduplicate by category, take top N
  candidates.sort((a, b) => b.assessment.value_score - a.assessment.value_score);

  const seenCategories = new Set<string>();
  const topCandidates = candidates.filter(c => {
    if (seenCategories.has(c.template.category)) return false;
    seenCategories.add(c.template.category);
    return true;
  }).slice(0, maxPkg);

  // 5. Generate packages
  const packages: PhotoPackage[] = [];

  for (const candidate of topCandidates) {
    const tmpl = candidate.template;
    const va = candidate.assessment;

    const targetCount = Math.min(tmpl.max_images, Math.max(tmpl.min_images,
      Math.round(tmpl.min_images + (va.value_score / 100) * (tmpl.max_images - tmpl.min_images) * 0.5)
    ));
    const requiredImages = targetCount;
    const totalPayout = Math.round(va.suggested_payout_per_image * requiredImages * 100) / 100;

    const label = determineLabel(va, tmpl);
    const estimatedTimeMins = Math.round(requiredImages * 3 + candidate.distance_m / 80); // 3 min/photo + walking

    const pkgId = randomUUID();
    packages.push({
      id: pkgId,
      template_slug: tmpl.slug,
      title: `${tmpl.title} — ${areaName}`,
      description: tmpl.description,
      category: tmpl.category,
      icon: tmpl.icon ?? '📦',
      latitude: options.latitude,
      longitude: options.longitude,
      radius_meters: tmpl.radius_meters ?? 500,
      area_name: areaName,
      target_count: targetCount,
      required_images: requiredImages,
      target_objects: tmpl.target_objects,
      analysis_types: tmpl.analysis_types,
      value_score: va.value_score,
      total_payout: totalPayout,
      payout_per_image: va.suggested_payout_per_image,
      currency: 'SEK',
      label,
      estimated_time_mins: estimatedTimeMins,
      distance_meters: candidate.distance_m,
      buyer_segments: va.buyer_segments,
    });
  }

  // 6. Persist packages to DB
  for (const pkg of packages) {
    await db.query(
      `INSERT INTO qz_photo_packages (
         id, template_id, title, description, latitude, longitude, radius_meters,
         area_name, city, country, target_count, required_images, category,
         target_objects, analysis_types, demand_score, scarcity_score, accuracy_need,
         freshness_need, total_payout, payout_per_image, currency, status, priority, tier,
         source, buyer_segments, expires_at
       ) VALUES (
         $1, (SELECT id FROM qz_package_templates WHERE slug = $2), $3, $4, $5, $6, $7,
         $8, $9, 'SE', $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
         'available', $22, $23, 'vde', $24,
         now() + interval '24 hours'
       )`,
      [
        pkg.id, pkg.template_slug, pkg.title, pkg.description,
        pkg.latitude, pkg.longitude, pkg.radius_meters,
        pkg.area_name, city, pkg.target_count, pkg.required_images,
        pkg.category, pkg.target_objects, pkg.analysis_types,
        packages.find(p => p.id === pkg.id) ? // get from assessment
          topCandidates.find(c => c.template.slug === pkg.template_slug)?.assessment.demand_score ?? 50 : 50,
        topCandidates.find(c => c.template.slug === pkg.template_slug)?.assessment.scarcity_score ?? 50,
        topCandidates.find(c => c.template.slug === pkg.template_slug)?.assessment.accuracy_need ?? 50,
        topCandidates.find(c => c.template.slug === pkg.template_slug)?.assessment.freshness_need ?? 50,
        pkg.total_payout, pkg.payout_per_image, pkg.currency,
        pkg.value_score > 70 ? 10 : pkg.value_score > 50 ? 5 : 0,
        Math.min(options.user_tier, 6),
        pkg.buyer_segments,
      ],
    );
  }

  return {
    packages,
    area_summary: {
      area_name: areaName,
      city,
      total_value: packages.reduce((sum, p) => sum + p.total_payout, 0),
      top_demand_category: packages[0]?.category ?? 'unknown',
    },
  };
}

/**
 * Claim a photo package — assigns it to a creator.
 */
export async function claimPackage(
  db: DbClient,
  packageId: string,
  userId: string,
): Promise<void> {
  const { rows } = await db.query(
    `UPDATE qz_photo_packages
     SET status = 'claimed', assigned_to = $1, assigned_at = now(),
         deadline = now() + interval '4 hours', updated_at = now()
     WHERE id = $2 AND status = 'available'
     RETURNING id`,
    [userId, packageId],
  );

  if (rows.length === 0) throw new Error('Package not available');

  await emit(db, {
    aggregate_type: 'package',
    aggregate_id: packageId,
    event_type: 'TaskCompleted', // Reuse — in prod: PackageClaimed
    payload: { event: 'package_claimed', user_id: userId, package_id: packageId },
  });

  await auditLog(db, {
    event_type: 'package.claimed',
    actor: userId,
    resource_type: 'photo_package',
    resource_id: packageId,
  });
}

/**
 * Complete a photo package — triggers payout for all approved captures.
 */
export async function completePackage(
  db: DbClient,
  packageId: string,
): Promise<{ approved_count: number; total_payout: number }> {
  const { rows: captures } = await db.query(
    `SELECT COUNT(*) FILTER (WHERE status = 'approved') AS approved,
            COUNT(*) AS total
     FROM qz_package_captures WHERE package_id = $1`,
    [packageId],
  );

  const approved = parseInt(captures[0]?.approved ?? '0');

  const { rows: pkgRows } = await db.query(
    `SELECT * FROM qz_photo_packages WHERE id = $1`,
    [packageId],
  );

  if (pkgRows.length === 0) throw new Error('Package not found');
  const pkg = pkgRows[0];

  const payoutPerImage = parseFloat(pkg.payout_per_image);
  const totalPayout = Math.round(approved * payoutPerImage * 100) / 100;

  await db.query(
    `UPDATE qz_photo_packages SET status = 'completed', updated_at = now() WHERE id = $1`,
    [packageId],
  );

  return { approved_count: approved, total_payout: totalPayout };
}

// ============================================================================
// Helpers
// ============================================================================

function determineLabel(
  assessment: valueEngine.ValueAssessment,
  template: any,
): PhotoPackage['label'] {
  if (assessment.demand_score > 75) return 'hot_demand';
  if (assessment.value_score > 70 && template.capture_frequency === 'once') return 'quick_money';
  if (template.capture_frequency !== 'once') return 'recurring';
  if (assessment.scarcity_score > 70) return 'build_ir';
  return 'quick_money';
}
