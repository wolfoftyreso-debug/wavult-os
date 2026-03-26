import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import { getPool, withTransaction } from '../core/db.js';
import * as wallet from '../core/wallet.js';
import * as tasks from '../core/tasks.js';
import * as levels from '../core/levels.js';
import * as ir from '../core/ir.js';
import * as demand from '../core/demand.js';
import * as ai from '../core/ai.js';
import * as geo from '../core/geo.js';
import {
  CreateUserInput, CreateTaskInput as CreateTaskApiSchema,
  CreateIRInput as CreateIRApiSchema, DemandQueryInput, WithdrawInput,
} from '../core/types.js';

export const qzRouter = Router();

// ============================================================================
// USERS
// ============================================================================

qzRouter.post('/users', async (req: Request, res: Response) => {
  try {
    const input = CreateUserInput.parse(req.body);
    const pool = getPool();
    const userId = randomUUID();

    await pool.query(
      `INSERT INTO qz_users (id, email, display_name, phone, location)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, input.email, input.display_name, input.phone ?? null,
       JSON.stringify(input.location ?? {})],
    );

    // Auto-create wallet
    const walletId = await wallet.createWallet(pool, userId);

    // Auto-create streak record
    await pool.query(
      `INSERT INTO qz_streaks (id, user_id) VALUES ($1, $2)`,
      [randomUUID(), userId],
    );

    res.status(201).json({ user_id: userId, wallet_id: walletId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

qzRouter.get('/users/:id', async (req: Request, res: Response) => {
  const { rows } = await getPool().query(
    `SELECT u.*, l.name AS level_name, l.slug AS level_slug, l.ordinal AS level_ordinal,
            l.max_daily_earnings, l.revenue_share_pct, l.streak_multiplier
     FROM qz_users u JOIN qz_levels l ON l.id = u.level_id
     WHERE u.id = $1`,
    [req.params.id],
  );
  if (rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(rows[0]);
});

qzRouter.patch('/users/:id/mode', async (req: Request, res: Response) => {
  try {
    const { mode } = req.body;
    await getPool().query(
      `UPDATE qz_users SET mode = $1, updated_at = now() WHERE id = $2`,
      [mode, req.params.id],
    );
    res.json({ status: 'ok', mode });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================================
// WALLET
// ============================================================================

qzRouter.get('/wallet/:userId', async (req: Request, res: Response) => {
  try {
    const balance = await wallet.getBalance(getPool(), req.params.userId);
    res.json(balance);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

qzRouter.get('/wallet/:userId/transactions', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const { rows } = await getPool().query(
    `SELECT wt.* FROM qz_wallet_transactions wt
     JOIN qz_wallets w ON w.id = wt.wallet_id
     WHERE w.user_id = $1
     ORDER BY wt.created_at DESC LIMIT $2`,
    [req.params.userId, limit],
  );
  res.json(rows);
});

qzRouter.post('/wallet/:userId/withdraw', async (req: Request, res: Response) => {
  try {
    const input = WithdrawInput.parse(req.body);
    const actor = req.headers['x-actor'] as string || req.params.userId;

    const result = await withTransaction(async (client) =>
      wallet.withdraw(client, {
        user_id: req.params.userId,
        amount: input.amount,
        currency: input.currency,
        method: input.method,
        destination: input.destination,
        actor,
      }),
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================================
// LEVELS & STREAKS
// ============================================================================

qzRouter.get('/levels', async (_req: Request, res: Response) => {
  const allLevels = await levels.getAllLevels(getPool());
  res.json(allLevels);
});

qzRouter.get('/streak/:userId', async (req: Request, res: Response) => {
  const streak = await levels.getStreak(getPool(), req.params.userId);
  res.json(streak ?? { current_count: 0, multiplier: '1.00' });
});

// ============================================================================
// TASKS
// ============================================================================

qzRouter.post('/tasks', async (req: Request, res: Response) => {
  try {
    const input = CreateTaskApiSchema.parse(req.body);
    const taskId = await tasks.createTask(getPool(), input as any);
    res.status(201).json({ task_id: taskId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

qzRouter.get('/tasks/nearby', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radiusKm = parseFloat(req.query.radius as string) || 5;
    const category = req.query.category as string;
    const userTier = parseInt(req.query.tier as string) || 6;

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ error: 'lat and lng are required' });
      return;
    }

    const nearby = await tasks.findNearby(getPool(), {
      latitude: lat, longitude: lng, radius_km: radiusKm,
      category, user_tier: userTier,
    });
    res.json(nearby);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

qzRouter.post('/tasks/:taskId/assign', async (req: Request, res: Response) => {
  try {
    const userId = req.body.user_id || req.headers['x-actor'] as string;
    const assignmentId = await withTransaction(async (client) =>
      tasks.assignTask(client, req.params.taskId, userId),
    );
    res.json({ assignment_id: assignmentId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

qzRouter.post('/tasks/assignments/:id/submit', async (req: Request, res: Response) => {
  try {
    await withTransaction(async (client) =>
      tasks.submitAssignment(client, req.params.id),
    );
    res.json({ status: 'submitted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * APPROVE — triggers INSTANT PAYOUT
 */
qzRouter.post('/tasks/assignments/:id/approve', async (req: Request, res: Response) => {
  try {
    const reviewer = req.headers['x-actor'] as string || 'system';
    const result = await withTransaction(async (client) =>
      tasks.approveAssignment(client, req.params.id, reviewer),
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

qzRouter.post('/tasks/assignments/:id/reject', async (req: Request, res: Response) => {
  try {
    const reviewer = req.headers['x-actor'] as string || 'system';
    await withTransaction(async (client) =>
      tasks.rejectAssignment(client, req.params.id, reviewer, req.body.reason || ''),
    );
    res.json({ status: 'rejected' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================================
// IMAGES
// ============================================================================

qzRouter.post('/images', async (req: Request, res: Response) => {
  try {
    const {
      assignment_id, user_id, task_id, storage_key, storage_bucket,
      latitude, longitude, altitude, accuracy_meters, heading,
    } = req.body;

    const imageId = randomUUID();
    await getPool().query(
      `INSERT INTO qz_images (
         id, assignment_id, user_id, task_id, storage_key, storage_bucket,
         latitude, longitude, altitude, accuracy_meters, heading
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        imageId, assignment_id, user_id, task_id, storage_key, storage_bucket,
        latitude ?? null, longitude ?? null, altitude ?? null,
        accuracy_meters ?? null, heading ?? null,
      ],
    );

    res.status(201).json({ image_id: imageId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

qzRouter.post('/images/:id/analyze', async (req: Request, res: Response) => {
  try {
    const { rows } = await getPool().query(
      `SELECT id, storage_key, (SELECT category FROM qz_tasks WHERE id = qz_images.task_id) AS task_category
       FROM qz_images WHERE id = $1`,
      [req.params.id],
    );
    if (rows.length === 0) { res.status(404).json({ error: 'Image not found' }); return; }

    const result = await ai.analyzeImage(getPool(), {
      image_id: req.params.id,
      storage_key: rows[0].storage_key,
      task_category: rows[0].task_category,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================================
// INTELLIGENCE REPOS
// ============================================================================

qzRouter.post('/ir', async (req: Request, res: Response) => {
  try {
    const input = CreateIRApiSchema.parse(req.body);
    const creatorId = req.headers['x-actor'] as string;
    if (!creatorId) { res.status(400).json({ error: 'x-actor header required' }); return; }

    const repoId = await withTransaction(async (client) =>
      ir.createRepo(client, creatorId, input),
    );
    res.status(201).json({ repo_id: repoId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

qzRouter.post('/ir/:id/items', async (req: Request, res: Response) => {
  try {
    const itemId = await ir.addItem(getPool(), { repo_id: req.params.id, ...req.body });
    res.status(201).json({ item_id: itemId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

qzRouter.post('/ir/:id/publish', async (req: Request, res: Response) => {
  try {
    const creatorId = req.headers['x-actor'] as string;
    await withTransaction(async (client) =>
      ir.publishRepo(client, req.params.id, creatorId),
    );
    res.json({ status: 'published' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

qzRouter.post('/ir/:id/purchase', async (req: Request, res: Response) => {
  try {
    const result = await withTransaction(async (client) =>
      ir.purchaseRepo(client, {
        repo_id: req.params.id,
        buyer_id: req.body.buyer_id,
        buyer_email: req.body.buyer_email,
        buyer_company: req.body.buyer_company,
      }),
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

qzRouter.get('/ir/search', async (req: Request, res: Response) => {
  const results = await ir.searchRepos(getPool(), {
    query: req.query.q as string,
    category: req.query.category as string,
    city: req.query.city as string,
    min_rating: req.query.min_rating ? parseFloat(req.query.min_rating as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
  });
  res.json(results);
});

qzRouter.get('/ir/:id', async (req: Request, res: Response) => {
  const { rows: repoRows } = await getPool().query(
    `SELECT r.*, u.display_name AS creator_name
     FROM qz_intelligence_repos r
     JOIN qz_users u ON u.id = r.creator_id
     WHERE r.id = $1`,
    [req.params.id],
  );
  if (repoRows.length === 0) { res.status(404).json({ error: 'IR not found' }); return; }

  const { rows: items } = await getPool().query(
    `SELECT * FROM qz_ir_items WHERE repo_id = $1 ORDER BY sort_order, created_at`,
    [req.params.id],
  );

  res.json({ ...repoRows[0], items });
});

// ============================================================================
// DEMAND ENGINE
// ============================================================================

qzRouter.post('/demand', async (req: Request, res: Response) => {
  try {
    const input = DemandQueryInput.parse(req.body);
    const result = await withTransaction(async (client) =>
      demand.processDemand(client, input),
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

qzRouter.get('/demand/parse', async (req: Request, res: Response) => {
  const queryText = req.query.q as string;
  if (!queryText) { res.status(400).json({ error: 'q parameter required' }); return; }
  const parsed = demand.parseIntent(queryText);
  res.json(parsed);
});

// ============================================================================
// AI / LEAD SCORING
// ============================================================================

qzRouter.post('/ai/lead-score', async (req: Request, res: Response) => {
  const result = ai.calculateLeadScore(req.body);
  res.json(result);
});

qzRouter.post('/ai/route', async (req: Request, res: Response) => {
  const { current_location, tasks: taskList, max_duration_mins } = req.body;
  const route = ai.recommendRoute(current_location, taskList, max_duration_mins);
  res.json(route);
});

// ============================================================================
// GEO
// ============================================================================

qzRouter.post('/geo/coverage', async (req: Request, res: Response) => {
  const { points, bounding_box, grid_size_meters } = req.body;
  const coverage = geo.calculateCoverage(points, bounding_box, grid_size_meters);
  res.json({ coverage_pct: coverage });
});

qzRouter.post('/geo/gaps', async (req: Request, res: Response) => {
  const { existing_points, bounding_box, grid_size_meters } = req.body;
  const gaps = geo.findGapZones(existing_points, bounding_box, grid_size_meters);
  res.json({ gap_count: gaps.length, gaps: gaps.slice(0, 100) });
});
