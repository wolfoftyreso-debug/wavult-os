import type { DbClient } from './db.js';

// ============================================================================
// Pricing Engine
//
// Calculates:
//   1. Creator payouts (dynamic, based on value + streak + level)
//   2. IR pricing (suggested retail price for marketplace)
//   3. Lead pricing (per-lead model for buyers)
//   4. Platform margins
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export interface PayoutCalculation {
  base_payout: number;
  value_multiplier: number;       // from VDE
  streak_multiplier: number;      // from streak system
  level_multiplier: number;       // from level system
  time_bonus: number;             // for fast completion
  quality_bonus: number;          // for high AI scores
  final_payout: number;
  breakdown: string[];
}

export interface IRPriceSuggestion {
  base_price: number;
  data_value: number;             // based on data quality + volume
  market_adjustment: number;      // supply/demand in category
  freshness_premium: number;      // newer = more valuable
  coverage_premium: number;       // more coverage = more valuable
  suggested_price: number;
  price_range: { min: number; max: number };
  reasoning: string[];
}

export interface LeadPricing {
  price_per_lead: number;
  estimated_leads: number;
  estimated_revenue: number;
  factors: string[];
}

// ============================================================================
// Creator Payout Calculation
// ============================================================================

/**
 * Calculate the final payout for a completed package capture.
 */
export function calculatePayout(params: {
  base_payout_per_image: number;
  image_count: number;
  value_score: number;          // 0-100
  streak_multiplier: number;    // 1.0-2.0
  level_revenue_share_pct: number;  // 60-90
  completion_time_mins?: number;
  deadline_mins?: number;
  avg_ai_quality_score?: number;  // 0-100
}): PayoutCalculation {
  const breakdown: string[] = [];

  const basePayout = params.base_payout_per_image * params.image_count;
  breakdown.push(`Base: ${params.base_payout_per_image} × ${params.image_count} = ${basePayout} SEK`);

  // Value multiplier (1.0 - 3.0x based on VDE score)
  const valueMultiplier = 1.0 + (params.value_score / 100) * 2.0;
  breakdown.push(`Value multiplier: ${valueMultiplier.toFixed(2)}x (score: ${params.value_score})`);

  // Streak multiplier (passed from level system)
  const streakMultiplier = params.streak_multiplier;
  breakdown.push(`Streak multiplier: ${streakMultiplier.toFixed(2)}x`);

  // Level multiplier (higher levels get more per-unit)
  const levelMultiplier = params.level_revenue_share_pct / 70; // normalize around 70%
  breakdown.push(`Level multiplier: ${levelMultiplier.toFixed(2)}x (share: ${params.level_revenue_share_pct}%)`);

  // Time bonus: complete before deadline = up to 15% bonus
  let timeBonus = 0;
  if (params.completion_time_mins && params.deadline_mins) {
    const timeRatio = params.completion_time_mins / params.deadline_mins;
    if (timeRatio < 0.5) {
      timeBonus = basePayout * 0.15;
      breakdown.push(`Speed bonus: +${timeBonus.toFixed(2)} SEK (completed in ${Math.round(timeRatio * 100)}% of deadline)`);
    } else if (timeRatio < 0.75) {
      timeBonus = basePayout * 0.08;
      breakdown.push(`Speed bonus: +${timeBonus.toFixed(2)} SEK`);
    }
  }

  // Quality bonus: high AI scores = up to 10% bonus
  let qualityBonus = 0;
  if (params.avg_ai_quality_score && params.avg_ai_quality_score > 85) {
    qualityBonus = basePayout * 0.10;
    breakdown.push(`Quality bonus: +${qualityBonus.toFixed(2)} SEK (AI score: ${params.avg_ai_quality_score})`);
  } else if (params.avg_ai_quality_score && params.avg_ai_quality_score > 70) {
    qualityBonus = basePayout * 0.05;
    breakdown.push(`Quality bonus: +${qualityBonus.toFixed(2)} SEK`);
  }

  const finalPayout = Math.round(
    (basePayout * valueMultiplier * streakMultiplier * levelMultiplier + timeBonus + qualityBonus) * 100
  ) / 100;

  breakdown.push(`Final payout: ${finalPayout} SEK`);

  return {
    base_payout: basePayout,
    value_multiplier: Math.round(valueMultiplier * 100) / 100,
    streak_multiplier: streakMultiplier,
    level_multiplier: Math.round(levelMultiplier * 100) / 100,
    time_bonus: Math.round(timeBonus * 100) / 100,
    quality_bonus: Math.round(qualityBonus * 100) / 100,
    final_payout: finalPayout,
    breakdown,
  };
}

// ============================================================================
// IR Pricing Suggestion
// ============================================================================

/**
 * Suggest a price for an Intelligence Repo based on its content.
 */
export async function suggestIRPrice(
  db: DbClient,
  repoId: string,
): Promise<IRPriceSuggestion> {
  const reasoning: string[] = [];

  // Get repo details
  const { rows: repoRows } = await db.query(
    `SELECT r.*, AVG(i.ai_score) AS avg_score, AVG(i.lead_score) AS avg_lead
     FROM qz_intelligence_repos r
     LEFT JOIN qz_ir_items i ON i.repo_id = r.id
     WHERE r.id = $1
     GROUP BY r.id`,
    [repoId],
  );

  if (repoRows.length === 0) throw new Error('Repo not found');
  const repo = repoRows[0];

  // Base price from data volume
  const dataPoints = repo.data_point_count || 0;
  const basePrice = dataPoints * 5; // 5 SEK per data point baseline
  reasoning.push(`Base: ${dataPoints} data points × 5 SEK = ${basePrice} SEK`);

  // Data value: AI quality
  const avgScore = parseFloat(repo.avg_score ?? '50');
  const dataValue = basePrice * (avgScore / 100) * 0.3;
  reasoning.push(`Data quality value: +${dataValue.toFixed(0)} SEK (avg AI score: ${avgScore.toFixed(1)})`);

  // Market adjustment: check similar listings
  const { rows: similarRows } = await db.query(
    `SELECT AVG(price) AS avg_price, COUNT(*) AS count
     FROM qz_marketplace_listings
     WHERE category = $1 AND status = 'active' AND city = $2`,
    [repo.category, repo.city],
  );

  let marketAdj = 0;
  if (similarRows[0]?.count > 0) {
    const avgMarketPrice = parseFloat(similarRows[0].avg_price);
    marketAdj = (avgMarketPrice - basePrice) * 0.2; // 20% pull toward market
    reasoning.push(`Market adjustment: ${marketAdj > 0 ? '+' : ''}${marketAdj.toFixed(0)} SEK (avg market: ${avgMarketPrice.toFixed(0)} SEK)`);
  }

  // Freshness premium
  const coveragePct = parseFloat(repo.coverage_pct ?? '0');
  const freshnessPremium = basePrice * 0.15; // 15% premium for fresh data
  reasoning.push(`Freshness premium: +${freshnessPremium.toFixed(0)} SEK`);

  // Coverage premium
  const coveragePremium = basePrice * (coveragePct / 100) * 0.2;
  reasoning.push(`Coverage premium: +${coveragePremium.toFixed(0)} SEK (${coveragePct}% coverage)`);

  // Lead value bonus
  const avgLead = parseFloat(repo.avg_lead ?? '0');
  let leadBonus = 0;
  if (avgLead > 50) {
    leadBonus = dataPoints * avgLead * 0.1; // high-scoring leads are very valuable
    reasoning.push(`Lead value bonus: +${leadBonus.toFixed(0)} SEK (avg lead score: ${avgLead.toFixed(1)})`);
  }

  const suggested = Math.round(
    Math.max(49, basePrice + dataValue + marketAdj + freshnessPremium + coveragePremium + leadBonus)
  );

  // Price range: ±30%
  const min = Math.round(suggested * 0.7);
  const max = Math.round(suggested * 1.3);

  reasoning.push(`Suggested price: ${suggested} SEK (range: ${min}-${max} SEK)`);

  return {
    base_price: Math.round(basePrice),
    data_value: Math.round(dataValue),
    market_adjustment: Math.round(marketAdj),
    freshness_premium: Math.round(freshnessPremium),
    coverage_premium: Math.round(coveragePremium),
    suggested_price: suggested,
    price_range: { min, max },
    reasoning,
  };
}

// ============================================================================
// Lead-Based Pricing
// ============================================================================

/**
 * Calculate per-lead pricing for a listing.
 */
export async function calculateLeadPricing(
  db: DbClient,
  listingId: string,
): Promise<LeadPricing> {
  const { rows } = await db.query(
    `SELECT COUNT(*) AS total_leads,
            AVG(lead_score) AS avg_score,
            AVG(opportunity_value) AS avg_opportunity
     FROM qz_marketplace_leads
     WHERE listing_id = $1`,
    [listingId],
  );

  const totalLeads = parseInt(rows[0]?.total_leads ?? '0');
  const avgScore = parseFloat(rows[0]?.avg_score ?? '50');
  const avgOpportunity = parseFloat(rows[0]?.avg_opportunity ?? '500');

  const factors: string[] = [];

  // Price per lead scales with quality
  let pricePerLead: number;
  if (avgScore > 80) {
    pricePerLead = 50;
    factors.push('Premium leads (score > 80) → 50 SEK/lead');
  } else if (avgScore > 60) {
    pricePerLead = 30;
    factors.push('Good leads (score > 60) → 30 SEK/lead');
  } else {
    pricePerLead = 15;
    factors.push('Standard leads → 15 SEK/lead');
  }

  // Opportunity value adjustment
  if (avgOpportunity > 5000) {
    pricePerLead *= 1.5;
    factors.push('High-value opportunities (+50%)');
  }

  const estimatedRevenue = Math.round(pricePerLead * totalLeads * 100) / 100;

  return {
    price_per_lead: Math.round(pricePerLead * 100) / 100,
    estimated_leads: totalLeads,
    estimated_revenue: estimatedRevenue,
    factors,
  };
}

// ============================================================================
// Platform Margin Calculation
// ============================================================================

export function calculatePlatformSplit(
  salePrice: number,
  creatorRevenuePct: number,
): { creator_payout: number; platform_fee: number; platform_pct: number } {
  const creatorPayout = Math.round(salePrice * (creatorRevenuePct / 100) * 100) / 100;
  const platformFee = Math.round((salePrice - creatorPayout) * 100) / 100;
  const platformPct = Math.round((100 - creatorRevenuePct) * 100) / 100;

  return { creator_payout: creatorPayout, platform_fee: platformFee, platform_pct: platformPct };
}
