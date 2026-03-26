import { randomUUID } from 'crypto';
import type { DbClient } from './db.js';
import { emit } from './event-bus.js';
import { log as auditLog } from './audit.js';
import * as wallet from './wallet.js';
import * as levels from './levels.js';

// ============================================================================
// Types
// ============================================================================

export interface CreateIRInput {
  title: string;
  description?: string;
  category: string;
  tags?: string[];
  area_name?: string;
  city?: string;
  country?: string;
  bounding_box?: { ne: { lat: number; lng: number }; sw: { lat: number; lng: number } };
  price_type?: 'free' | 'one_time' | 'subscription' | 'custom';
  price?: number;
  subscription_monthly?: number;
}

export interface AddIRItemInput {
  repo_id: string;
  image_id?: string;
  title?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  captured_at?: string;
  ai_category?: string;
  ai_condition?: string;
  ai_labels?: Array<{ label: string; confidence: number }>;
  ai_score?: number;
  lead_score?: number;
  lead_analysis?: Record<string, unknown>;
  properties?: Record<string, unknown>;
}

// ============================================================================
// IR CRUD
// ============================================================================

export async function createRepo(
  db: DbClient,
  creatorId: string,
  input: CreateIRInput,
): Promise<string> {
  // Check user level allows IR creation
  const level = await levels.getUserLevel(db, creatorId);
  if (!level.ir_creation) {
    throw new Error(`Level ${level.name} cannot create Intelligence Repos`);
  }

  const id = randomUUID();
  const slug = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id.slice(0, 8)}`;

  await db.query(
    `INSERT INTO qz_intelligence_repos (
       id, creator_id, title, description, slug, category, tags,
       area_name, city, country, bounding_box, price_type, price, subscription_monthly
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      id, creatorId, input.title, input.description ?? null, slug,
      input.category, input.tags ?? [], input.area_name ?? null,
      input.city ?? null, input.country ?? null,
      input.bounding_box ? JSON.stringify(input.bounding_box) : null,
      input.price_type ?? 'one_time', input.price ?? 0,
      input.subscription_monthly ?? null,
    ],
  );

  await emit(db, {
    aggregate_type: 'ir',
    aggregate_id: id,
    event_type: 'IRCreated',
    payload: { creator_id: creatorId, title: input.title, category: input.category },
  });

  await auditLog(db, {
    event_type: 'ir.created',
    actor: creatorId,
    resource_type: 'intelligence_repo',
    resource_id: id,
    payload: { title: input.title },
  });

  return id;
}

export async function addItem(db: DbClient, input: AddIRItemInput): Promise<string> {
  const id = randomUUID();
  await db.query(
    `INSERT INTO qz_ir_items (
       id, repo_id, image_id, title, latitude, longitude, address, captured_at,
       ai_category, ai_condition, ai_labels, ai_score, lead_score, lead_analysis, properties
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      id, input.repo_id, input.image_id ?? null, input.title ?? null,
      input.latitude ?? null, input.longitude ?? null, input.address ?? null,
      input.captured_at ?? null, input.ai_category ?? null, input.ai_condition ?? null,
      JSON.stringify(input.ai_labels ?? []), input.ai_score ?? null,
      input.lead_score ?? null, JSON.stringify(input.lead_analysis ?? {}),
      JSON.stringify(input.properties ?? {}),
    ],
  );

  // Update repo stats
  await db.query(
    `UPDATE qz_intelligence_repos
     SET data_point_count = data_point_count + 1,
         image_count = image_count + CASE WHEN $2::uuid IS NOT NULL THEN 1 ELSE 0 END,
         updated_at = now()
     WHERE id = $1`,
    [input.repo_id, input.image_id ?? null],
  );

  return id;
}

/**
 * Publish an IR (requires publish permission).
 */
export async function publishRepo(
  db: DbClient,
  repoId: string,
  creatorId: string,
): Promise<void> {
  const level = await levels.getUserLevel(db, creatorId);
  if (!level.ir_publish) {
    throw new Error(`Level ${level.name} cannot publish Intelligence Repos`);
  }

  await db.query(
    `UPDATE qz_intelligence_repos
     SET status = 'published', visibility = 'public', published_at = now(), updated_at = now()
     WHERE id = $1 AND creator_id = $2`,
    [repoId, creatorId],
  );

  await auditLog(db, {
    event_type: 'ir.published',
    actor: creatorId,
    resource_type: 'intelligence_repo',
    resource_id: repoId,
  });
}

/**
 * Purchase an IR — creates ledger entries + credits creator wallet.
 */
export async function purchaseRepo(
  db: DbClient,
  params: {
    repo_id: string;
    buyer_id?: string;
    buyer_email?: string;
    buyer_company?: string;
  },
): Promise<{ purchase_id: string; amount: string }> {
  // Get repo details
  const { rows: repoRows } = await db.query(
    `SELECT * FROM qz_intelligence_repos WHERE id = $1 AND status = 'published'`,
    [params.repo_id],
  );
  if (repoRows.length === 0) throw new Error('IR not found or not published');

  const repo = repoRows[0];
  const price = parseFloat(repo.price);

  // Get creator's revenue share
  const level = await levels.getUserLevel(db, repo.creator_id);
  const shareRate = parseFloat(level.revenue_share_pct) / 100;
  const creatorShare = Math.round(price * shareRate * 100) / 100;
  const platformFee = Math.round((price - creatorShare) * 100) / 100;

  const purchaseId = randomUUID();

  await db.query(
    `INSERT INTO qz_ir_purchases (
       id, repo_id, buyer_id, buyer_email, buyer_company,
       amount, currency, creator_share, platform_fee, access_type
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      purchaseId, params.repo_id, params.buyer_id ?? null,
      params.buyer_email ?? null, params.buyer_company ?? null,
      price, repo.currency || 'SEK', creatorShare, platformFee, 'one_time',
    ],
  );

  // Update repo stats
  await db.query(
    `UPDATE qz_intelligence_repos
     SET total_sales = total_sales + 1,
         total_revenue = total_revenue + $1,
         updated_at = now()
     WHERE id = $2`,
    [price, params.repo_id],
  );

  // Credit creator wallet
  await wallet.creditAvailable(db, {
    user_id: repo.creator_id,
    amount: creatorShare,
    type: 'ir_sale',
    reference_type: 'ir_purchase',
    reference_id: purchaseId,
    description: `IR sale: ${repo.title}`,
    actor: 'system:ir-engine',
  });

  await emit(db, {
    aggregate_type: 'ir',
    aggregate_id: params.repo_id,
    event_type: 'IRPurchased',
    payload: {
      purchase_id: purchaseId,
      buyer_id: params.buyer_id,
      amount: price,
      creator_share: creatorShare,
    },
  });

  return { purchase_id: purchaseId, amount: price.toString() };
}

/**
 * Search published IRs.
 */
export async function searchRepos(
  db: DbClient,
  params: {
    query?: string;
    category?: string;
    city?: string;
    min_rating?: number;
    limit?: number;
  },
): Promise<unknown[]> {
  let sql = `SELECT r.*, u.display_name AS creator_name,
             COALESCE(AVG(rv.rating), 0) AS avg_rating,
             COUNT(rv.id) AS review_count
             FROM qz_intelligence_repos r
             JOIN qz_users u ON u.id = r.creator_id
             LEFT JOIN qz_ir_reviews rv ON rv.repo_id = r.id
             WHERE r.status = 'published' AND r.visibility = 'public'`;

  const queryParams: unknown[] = [];

  if (params.query) {
    queryParams.push(`%${params.query}%`);
    sql += ` AND (r.title ILIKE $${queryParams.length} OR r.description ILIKE $${queryParams.length} OR r.area_name ILIKE $${queryParams.length})`;
  }

  if (params.category) {
    queryParams.push(params.category);
    sql += ` AND r.category = $${queryParams.length}`;
  }

  if (params.city) {
    queryParams.push(params.city);
    sql += ` AND r.city = $${queryParams.length}`;
  }

  sql += ` GROUP BY r.id, u.display_name`;

  if (params.min_rating) {
    queryParams.push(params.min_rating);
    sql += ` HAVING COALESCE(AVG(rv.rating), 0) >= $${queryParams.length}`;
  }

  queryParams.push(params.limit ?? 50);
  sql += ` ORDER BY r.total_sales DESC, r.created_at DESC LIMIT $${queryParams.length}`;

  const { rows } = await db.query(sql, queryParams);
  return rows;
}
