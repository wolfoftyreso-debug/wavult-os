import { Router, type Request, type Response } from 'express';
import { getPool, withTransaction } from '../core/db.js';
import * as valueEngine from '../core/value-engine.js';
import * as creativeEngine from '../core/creative-engine.js';
import * as pricingEngine from '../core/pricing-engine.js';
import * as marketplace from '../core/marketplace.js';

export const cisRouter = Router();

// ============================================================================
// VALUE DISCOVERY ENGINE
// ============================================================================

/**
 * Assess value for a location + category.
 */
cisRouter.post('/value/assess', async (req: Request, res: Response) => {
  try {
    const result = await valueEngine.assessValue(getPool(), req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Batch assess multiple areas.
 */
cisRouter.post('/value/batch', async (req: Request, res: Response) => {
  try {
    const results = await valueEngine.batchAssess(getPool(), req.body.areas);
    res.json(results);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Record a demand signal.
 */
cisRouter.post('/value/signal', async (req: Request, res: Response) => {
  try {
    await valueEngine.recordDemandSignal(getPool(), req.body);
    res.json({ status: 'recorded' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================================
// CREATIVE ENGINE — Photo Package Generation
// ============================================================================

/**
 * Generate photo packages for a creator at their current location.
 * This is the MAIN app entry point — what the user sees when they open the app.
 */
cisRouter.post('/packages/generate', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, max_packages, max_radius_km, preferred_categories } = req.body;
    const userId = req.headers['x-actor'] as string;

    if (!userId || !latitude || !longitude) {
      res.status(400).json({ error: 'x-actor header, latitude, and longitude are required' });
      return;
    }

    // Get user tier
    const { rows: userRows } = await getPool().query(
      `SELECT l.ordinal AS tier FROM qz_users u JOIN qz_levels l ON l.id = u.level_id WHERE u.id = $1`,
      [userId],
    );
    const userTier = userRows[0]?.tier ?? 1;

    const result = await withTransaction(async (client) =>
      creativeEngine.generatePackages(client, {
        latitude, longitude, user_id: userId, user_tier: userTier,
        max_packages, max_radius_km, preferred_categories,
      }),
    );

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * List available packages near a location.
 */
cisRouter.get('/packages/nearby', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseFloat(req.query.radius as string) || 5;
    const tier = parseInt(req.query.tier as string) || 6;

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ error: 'lat and lng are required' });
      return;
    }

    const { rows } = await getPool().query(
      `SELECT *, (
         6371000 * acos(
           cos(radians($1)) * cos(radians(latitude)) *
           cos(radians(longitude) - radians($2)) +
           sin(radians($1)) * sin(radians(latitude))
         )
       ) AS distance_m
       FROM qz_photo_packages
       WHERE status = 'available'
         AND tier <= $3
         AND (expires_at IS NULL OR expires_at > now())
       ORDER BY value_score DESC, distance_m ASC
       LIMIT 20`,
      [lat, lng, tier],
    );

    res.json(rows.filter((r: any) => r.distance_m <= radius * 1000));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Claim a package.
 */
cisRouter.post('/packages/:id/claim', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-actor'] as string;
    if (!userId) { res.status(400).json({ error: 'x-actor header required' }); return; }

    await withTransaction(async (client) =>
      creativeEngine.claimPackage(client, req.params.id, userId),
    );
    res.json({ status: 'claimed' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Complete a package — triggers payout.
 */
cisRouter.post('/packages/:id/complete', async (req: Request, res: Response) => {
  try {
    const result = await withTransaction(async (client) =>
      creativeEngine.completePackage(client, req.params.id),
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * List package templates.
 */
cisRouter.get('/templates', async (_req: Request, res: Response) => {
  const { rows } = await getPool().query(
    `SELECT * FROM qz_package_templates WHERE active = true ORDER BY value_multiplier DESC`,
  );
  res.json(rows);
});

// ============================================================================
// PRICING ENGINE
// ============================================================================

/**
 * Calculate payout for a package capture.
 */
cisRouter.post('/pricing/payout', async (req: Request, res: Response) => {
  const result = pricingEngine.calculatePayout(req.body);
  res.json(result);
});

/**
 * Get IR price suggestion.
 */
cisRouter.get('/pricing/ir/:repoId', async (req: Request, res: Response) => {
  try {
    const suggestion = await pricingEngine.suggestIRPrice(getPool(), req.params.repoId);
    res.json(suggestion);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Get lead-based pricing for a listing.
 */
cisRouter.get('/pricing/leads/:listingId', async (req: Request, res: Response) => {
  try {
    const pricing = await pricingEngine.calculateLeadPricing(getPool(), req.params.listingId);
    res.json(pricing);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================================
// MARKETPLACE
// ============================================================================

/**
 * Create a marketplace listing.
 */
cisRouter.post('/marketplace/listings', async (req: Request, res: Response) => {
  try {
    const sellerId = req.headers['x-actor'] as string;
    if (!sellerId) { res.status(400).json({ error: 'x-actor header required' }); return; }

    const listingId = await withTransaction(async (client) =>
      marketplace.createListing(client, sellerId, req.body),
    );
    res.status(201).json({ listing_id: listingId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Extract leads from a listing's IR data.
 */
cisRouter.post('/marketplace/listings/:id/extract-leads', async (req: Request, res: Response) => {
  try {
    const result = await withTransaction(async (client) =>
      marketplace.extractLeads(client, req.params.id),
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Get listing detail with leads summary.
 */
cisRouter.get('/marketplace/listings/:id', async (req: Request, res: Response) => {
  try {
    const detail = await marketplace.getListingDetail(getPool(), req.params.id);
    res.json(detail);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

/**
 * Search marketplace.
 */
cisRouter.get('/marketplace/search', async (req: Request, res: Response) => {
  try {
    const result = await marketplace.search(getPool(), {
      q: req.query.q as string,
      category: req.query.category as string,
      city: req.query.city as string,
      area_name: req.query.area_name as string,
      buyer_segment: req.query.buyer_segment as string,
      price_max: req.query.price_max ? parseFloat(req.query.price_max as string) : undefined,
      min_rating: req.query.min_rating ? parseFloat(req.query.min_rating as string) : undefined,
      sort: req.query.sort as any,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Purchase from marketplace.
 */
cisRouter.post('/marketplace/purchase', async (req: Request, res: Response) => {
  try {
    const result = await withTransaction(async (client) =>
      marketplace.processPurchase(client, req.body),
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================================
// DEMAND SIGNALS (analytics)
// ============================================================================

/**
 * Get top demand areas (for internal dashboard).
 */
cisRouter.get('/demand/top', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const { rows } = await getPool().query(
    `SELECT * FROM qz_demand_signals ORDER BY demand_score DESC LIMIT $1`,
    [limit],
  );
  res.json(rows);
});
