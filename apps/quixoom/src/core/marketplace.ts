import { randomUUID } from 'crypto';
import type { DbClient } from './db.js';
import { emit } from './event-bus.js';
import { log as auditLog } from './audit.js';
import * as wallet from './wallet.js';
import * as levels from './levels.js';
import * as pricingEngine from './pricing-engine.js';
import * as ai from './ai.js';

// ============================================================================
// Marketplace Engine
//
// Handles:
//   1. Listing creation from published IRs
//   2. Lead extraction + scoring
//   3. Buyer purchases (one-time, subscription, per-lead)
//   4. Revenue split to creators
//   5. Search + ranking
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export interface CreateListingInput {
  ir_id: string;
  title: string;
  headline?: string;
  description?: string;
  cover_image_key?: string;
  price_type: 'free' | 'one_time' | 'subscription' | 'lead_based';
  price?: number;
  subscription_monthly?: number;
  price_per_lead?: number;
}

export interface BuyerPurchaseInput {
  buyer_id: string;
  listing_id: string;
  payment_type: 'one_time' | 'subscription' | 'lead';
  leads_requested?: number;
}

export interface MarketplaceSearchQuery {
  q?: string;
  category?: string;
  city?: string;
  area_name?: string;
  buyer_segment?: string;
  price_max?: number;
  min_rating?: number;
  sort?: 'relevance' | 'price_low' | 'price_high' | 'newest' | 'popular';
  limit?: number;
  offset?: number;
}

export interface ListingDetail {
  listing: any;
  leads_summary: {
    total: number;
    avg_score: number;
    high_quality_count: number;
    top_services: string[];
  };
  price_suggestion?: pricingEngine.IRPriceSuggestion;
}

// ============================================================================
// Listing Management
// ============================================================================

/**
 * Create a marketplace listing from a published IR.
 */
export async function createListing(
  db: DbClient,
  sellerId: string,
  input: CreateListingInput,
): Promise<string> {
  // Verify IR is published and owned by seller
  const { rows: irRows } = await db.query(
    `SELECT r.*, u.level_id FROM qz_intelligence_repos r
     JOIN qz_users u ON u.id = r.creator_id
     WHERE r.id = $1 AND r.creator_id = $2 AND r.status = 'published'`,
    [input.ir_id, sellerId],
  );

  if (irRows.length === 0) throw new Error('IR not found, not published, or not owned by you');
  const repo = irRows[0];

  const listingId = randomUUID();

  // Calculate initial rank score
  const rankScore = calculateRankScore({
    data_points: repo.data_point_count,
    image_count: repo.image_count,
    avg_quality: parseFloat(repo.avg_ai_score ?? '50'),
    total_sales: 0,
  });

  await db.query(
    `INSERT INTO qz_marketplace_listings (
       id, ir_id, seller_id, title, headline, description, cover_image_key,
       category, tags, buyer_segments, area_name, city, country,
       data_points, image_count, avg_quality, coverage_pct,
       price_type, price, subscription_monthly, price_per_lead,
       rank_score, status, published_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,'active',now())`,
    [
      listingId, input.ir_id, sellerId, input.title, input.headline ?? null,
      input.description ?? null, input.cover_image_key ?? null,
      repo.category, repo.tags, repo.buyer_segments ?? [],
      repo.area_name, repo.city, repo.country,
      repo.data_point_count, repo.image_count,
      parseFloat(repo.avg_ai_score ?? '0'), parseFloat(repo.coverage_pct ?? '0'),
      input.price_type, input.price ?? 0, input.subscription_monthly ?? null,
      input.price_per_lead ?? null, rankScore,
    ],
  );

  await auditLog(db, {
    event_type: 'marketplace.listing_created',
    actor: sellerId,
    resource_type: 'marketplace_listing',
    resource_id: listingId,
    payload: { ir_id: input.ir_id, price_type: input.price_type, price: input.price },
  });

  return listingId;
}

// ============================================================================
// Lead Extraction
// ============================================================================

/**
 * Extract and score leads from IR items.
 * Runs AI lead scoring on each item and creates marketplace leads.
 */
export async function extractLeads(
  db: DbClient,
  listingId: string,
): Promise<{ leads_created: number }> {
  // Get listing + IR items
  const { rows: listingRows } = await db.query(
    `SELECT l.ir_id FROM qz_marketplace_listings l WHERE l.id = $1`,
    [listingId],
  );
  if (listingRows.length === 0) throw new Error('Listing not found');

  const { rows: items } = await db.query(
    `SELECT * FROM qz_ir_items WHERE repo_id = $1`,
    [listingRows[0].ir_id],
  );

  let created = 0;

  for (const item of items) {
    // Run lead scoring
    const leadResult = ai.calculateLeadScore({
      ai_condition: item.ai_condition ?? 'unknown',
      ai_category: item.ai_category ?? 'unknown',
      ai_score: parseFloat(item.ai_score ?? '50'),
      location: {
        lat: parseFloat(item.latitude ?? '0'),
        lng: parseFloat(item.longitude ?? '0'),
      },
    });

    // Only create leads with meaningful scores
    if (leadResult.score < 20) continue;

    await db.query(
      `INSERT INTO qz_marketplace_leads (
         id, listing_id, ir_item_id, business_name, address, latitude, longitude,
         category, lead_score, urgency, recommended_services, condition,
         condition_details, opportunity_value
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        randomUUID(), listingId, item.id,
        item.title, item.address,
        item.latitude, item.longitude,
        item.ai_category, leadResult.score, leadResult.urgency,
        leadResult.recommended_services,
        item.ai_condition,
        JSON.stringify({ factors: leadResult.factors }),
        estimateOpportunityValue(leadResult),
      ],
    );
    created++;
  }

  // Update listing lead stats
  await db.query(
    `UPDATE qz_marketplace_listings
     SET total_leads = $1,
         avg_lead_score = (SELECT AVG(lead_score) FROM qz_marketplace_leads WHERE listing_id = $2),
         updated_at = now()
     WHERE id = $2`,
    [created, listingId],
  );

  return { leads_created: created };
}

// ============================================================================
// Buyer Purchases
// ============================================================================

/**
 * Process a buyer purchase — handles payment split and access.
 */
export async function processPurchase(
  db: DbClient,
  input: BuyerPurchaseInput,
): Promise<{ purchase_id: string; amount: number }> {
  // Get listing + seller info
  const { rows: listingRows } = await db.query(
    `SELECT l.*, u.level_id FROM qz_marketplace_listings l
     JOIN qz_users u ON u.id = l.seller_id
     WHERE l.id = $1 AND l.status = 'active'`,
    [input.listing_id],
  );

  if (listingRows.length === 0) throw new Error('Listing not found or not active');
  const listing = listingRows[0];

  // Determine amount
  let amount: number;
  if (input.payment_type === 'lead') {
    const leadsRequested = input.leads_requested ?? 10;
    amount = (parseFloat(listing.price_per_lead) || 15) * leadsRequested;
  } else if (input.payment_type === 'subscription') {
    amount = parseFloat(listing.subscription_monthly) || parseFloat(listing.price);
  } else {
    amount = parseFloat(listing.price);
  }

  // Get creator's revenue share from level
  const level = await levels.getUserLevel(db, listing.seller_id);
  const split = pricingEngine.calculatePlatformSplit(amount, parseFloat(level.revenue_share_pct));

  const purchaseId = randomUUID();

  await db.query(
    `INSERT INTO qz_buyer_purchases (
       id, buyer_id, listing_id, ir_id, amount, currency, payment_type,
       creator_payout, platform_fee, leads_included
     ) VALUES ($1,$2,$3,$4,$5,'SEK',$6,$7,$8,$9)`,
    [
      purchaseId, input.buyer_id, input.listing_id, listing.ir_id,
      amount, input.payment_type, split.creator_payout, split.platform_fee,
      input.payment_type === 'lead' ? (input.leads_requested ?? 10) : null,
    ],
  );

  // Credit creator wallet
  await wallet.creditAvailable(db, {
    user_id: listing.seller_id,
    amount: split.creator_payout,
    type: 'ir_sale',
    reference_type: 'buyer_purchase',
    reference_id: purchaseId,
    description: `Marketplace sale: ${listing.title}`,
    actor: 'system:marketplace',
  });

  // Update listing stats
  await db.query(
    `UPDATE qz_marketplace_listings
     SET purchase_count = purchase_count + 1,
         total_revenue = total_revenue + $1,
         updated_at = now()
     WHERE id = $2`,
    [amount, input.listing_id],
  );

  // Update rank score
  const newRank = calculateRankScore({
    data_points: listing.data_points,
    image_count: listing.image_count,
    avg_quality: parseFloat(listing.avg_quality),
    total_sales: listing.purchase_count + 1,
  });
  await db.query(
    `UPDATE qz_marketplace_listings SET rank_score = $1 WHERE id = $2`,
    [newRank, input.listing_id],
  );

  await emit(db, {
    aggregate_type: 'marketplace',
    aggregate_id: purchaseId,
    event_type: 'IRPurchased',
    payload: {
      buyer_id: input.buyer_id,
      listing_id: input.listing_id,
      amount,
      creator_payout: split.creator_payout,
      platform_fee: split.platform_fee,
    },
  });

  // Record demand signal
  await db.query(
    `UPDATE qz_demand_signals
     SET ir_purchase_count = ir_purchase_count + 1, updated_at = now()
     WHERE category = $1 AND area_name = $2`,
    [listing.category, listing.area_name],
  );

  return { purchase_id: purchaseId, amount };
}

// ============================================================================
// Search
// ============================================================================

/**
 * Search marketplace listings with ranking.
 */
export async function search(
  db: DbClient,
  query: MarketplaceSearchQuery,
): Promise<{ listings: any[]; total: number }> {
  const params: unknown[] = [];
  const conditions: string[] = ["l.status = 'active'"];

  if (query.q) {
    params.push(`%${query.q}%`);
    conditions.push(`(l.title ILIKE $${params.length} OR l.description ILIKE $${params.length} OR l.area_name ILIKE $${params.length})`);
  }

  if (query.category) {
    params.push(query.category);
    conditions.push(`l.category = $${params.length}`);
  }

  if (query.city) {
    params.push(query.city);
    conditions.push(`l.city = $${params.length}`);
  }

  if (query.area_name) {
    params.push(`%${query.area_name}%`);
    conditions.push(`l.area_name ILIKE $${params.length}`);
  }

  if (query.buyer_segment) {
    params.push(query.buyer_segment);
    conditions.push(`$${params.length} = ANY(l.buyer_segments)`);
  }

  if (query.price_max) {
    params.push(query.price_max);
    conditions.push(`l.price <= $${params.length}`);
  }

  if (query.min_rating) {
    params.push(query.min_rating);
    conditions.push(`l.avg_rating >= $${params.length}`);
  }

  const where = conditions.join(' AND ');

  // Sort
  let orderBy: string;
  switch (query.sort) {
    case 'price_low': orderBy = 'l.price ASC'; break;
    case 'price_high': orderBy = 'l.price DESC'; break;
    case 'newest': orderBy = 'l.published_at DESC'; break;
    case 'popular': orderBy = 'l.purchase_count DESC'; break;
    default: orderBy = 'l.rank_score DESC'; // relevance
  }

  // Count
  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) AS total FROM qz_marketplace_listings l WHERE ${where}`,
    params,
  );
  const total = parseInt(countRows[0].total);

  // Results
  const limit = query.limit ?? 20;
  const offset = query.offset ?? 0;
  params.push(limit, offset);

  const { rows: listings } = await db.query(
    `SELECT l.*, u.display_name AS seller_name
     FROM qz_marketplace_listings l
     JOIN qz_users u ON u.id = l.seller_id
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  // Record search as demand signal if query present
  if (query.q && query.category) {
    await db.query(
      `INSERT INTO qz_demand_signals (id, category, area_name, city, search_count)
       VALUES (gen_random_uuid(), $1, $2, $3, 1)
       ON CONFLICT (category, area_name, city)
       DO UPDATE SET search_count = qz_demand_signals.search_count + 1, updated_at = now()`,
      [query.category, query.area_name ?? '', query.city ?? ''],
    );
  }

  return { listings, total };
}

/**
 * Get listing details with leads summary.
 */
export async function getListingDetail(
  db: DbClient,
  listingId: string,
): Promise<ListingDetail> {
  const { rows: listingRows } = await db.query(
    `SELECT l.*, u.display_name AS seller_name
     FROM qz_marketplace_listings l
     JOIN qz_users u ON u.id = l.seller_id
     WHERE l.id = $1`,
    [listingId],
  );

  if (listingRows.length === 0) throw new Error('Listing not found');
  const listing = listingRows[0];

  // Track view
  await db.query(
    `UPDATE qz_marketplace_listings SET view_count = view_count + 1 WHERE id = $1`,
    [listingId],
  );

  // Leads summary
  const { rows: leadRows } = await db.query(
    `SELECT COUNT(*) AS total,
            AVG(lead_score) AS avg_score,
            COUNT(*) FILTER (WHERE lead_score > 70) AS high_quality,
            array_agg(DISTINCT unnest) AS top_services
     FROM qz_marketplace_leads,
     LATERAL unnest(recommended_services)
     WHERE listing_id = $1`,
    [listingId],
  );

  const leads = leadRows[0] ?? { total: 0, avg_score: 0, high_quality: 0, top_services: [] };

  return {
    listing,
    leads_summary: {
      total: parseInt(leads.total ?? '0'),
      avg_score: parseFloat(leads.avg_score ?? '0'),
      high_quality_count: parseInt(leads.high_quality ?? '0'),
      top_services: (leads.top_services ?? []).filter(Boolean).slice(0, 5),
    },
  };
}

// ============================================================================
// Helpers
// ============================================================================

function calculateRankScore(params: {
  data_points: number;
  image_count: number;
  avg_quality: number;
  total_sales: number;
}): number {
  return Math.round(
    params.data_points * 0.5 +
    params.image_count * 0.3 +
    params.avg_quality * 1.5 +
    params.total_sales * 20
  );
}

function estimateOpportunityValue(leadResult: ai.LeadScoreResult): number {
  // Estimate contract value based on services and urgency
  const serviceValues: Record<string, number> = {
    facade_cleaning: 3000, painting: 15000, pressure_washing: 2000,
    repair: 8000, renovation: 25000, window_cleaning: 1500,
    sign_replacement: 5000, lighting_repair: 3000,
    storefront_renovation: 20000, maintenance: 2000, inspection: 1500,
  };

  let total = 0;
  for (const service of leadResult.recommended_services) {
    total += serviceValues[service] ?? 2000;
  }

  const urgencyMultiplier =
    leadResult.urgency === 'critical' ? 1.5 :
    leadResult.urgency === 'high' ? 1.2 :
    leadResult.urgency === 'medium' ? 1.0 : 0.7;

  return Math.round(total * urgencyMultiplier);
}
