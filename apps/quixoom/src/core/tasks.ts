import { randomUUID } from 'crypto';
import type { DbClient } from './db.js';
import { emit } from './event-bus.js';
import { log as auditLog } from './audit.js';
import * as wallet from './wallet.js';
import * as levels from './levels.js';

// ============================================================================
// Types
// ============================================================================

export interface Task {
  id: string;
  title: string;
  category: string;
  payout_amount: string;
  latitude: string | null;
  longitude: string | null;
  radius_meters: number;
  area_name: string | null;
  status: string;
  tier: number;
}

export interface CreateTaskInput {
  template_id?: string;
  title: string;
  description?: string;
  category: string;
  required_images?: number;
  payout_amount: number;
  currency?: string;
  tier?: number;
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  address?: string;
  area_name?: string;
  city?: string;
  country?: string;
  source?: string;
  demand_id?: string;
  priority?: number;
  expires_at?: string;
}

export interface NearbyQuery {
  latitude: number;
  longitude: number;
  radius_km?: number;
  category?: string;
  user_tier?: number;
  limit?: number;
}

// ============================================================================
// Task CRUD
// ============================================================================

export async function createTask(db: DbClient, input: CreateTaskInput): Promise<string> {
  const id = randomUUID();
  await db.query(
    `INSERT INTO qz_tasks (
       id, template_id, title, description, category, required_images,
       payout_amount, currency, tier, latitude, longitude, radius_meters,
       address, area_name, city, country, source, demand_id, priority, expires_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    [
      id, input.template_id ?? null, input.title, input.description ?? null,
      input.category, input.required_images ?? 1, input.payout_amount,
      input.currency ?? 'SEK', input.tier ?? 1, input.latitude ?? null,
      input.longitude ?? null, input.radius_meters ?? 200, input.address ?? null,
      input.area_name ?? null, input.city ?? null, input.country ?? 'SE',
      input.source ?? 'system', input.demand_id ?? null, input.priority ?? 0,
      input.expires_at ?? null,
    ],
  );
  return id;
}

/**
 * Find tasks near a location, filtered by user tier.
 * Uses Haversine formula for distance calculation.
 */
export async function findNearby(db: DbClient, query: NearbyQuery): Promise<Task[]> {
  const radiusKm = query.radius_km ?? 5;
  const limit = query.limit ?? 50;

  let sql = `
    SELECT *, (
      6371 * acos(
        cos(radians($1)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(latitude))
      )
    ) AS distance_km
    FROM qz_tasks
    WHERE status = 'open'
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND tier <= $3
  `;
  const params: unknown[] = [query.latitude, query.longitude, query.user_tier ?? 6];

  if (query.category) {
    sql += ` AND category = $${params.length + 1}`;
    params.push(query.category);
  }

  sql += ` HAVING distance_km <= $${params.length + 1}`;
  params.push(radiusKm);

  sql += ` ORDER BY priority DESC, distance_km ASC LIMIT $${params.length + 1}`;
  params.push(limit);

  // Wrap in subquery for HAVING
  const wrappedSql = `SELECT * FROM (${sql}) AS nearby`;

  const { rows } = await db.query(wrappedSql, params);
  return rows;
}

// ============================================================================
// Assignment Flow
// ============================================================================

/**
 * Assign a task to a user.
 */
export async function assignTask(
  db: DbClient,
  taskId: string,
  userId: string,
): Promise<string> {
  // Verify task is open and user level is sufficient
  const { rows: taskRows } = await db.query(
    `SELECT * FROM qz_tasks WHERE id = $1 AND status = 'open' AND assigned_count < max_assignees`,
    [taskId],
  );
  if (taskRows.length === 0) throw new Error('Task not available');

  const task = taskRows[0];

  // Check user level tier
  const userLevel = await levels.getUserLevel(db, userId);
  if (userLevel.task_access_tier < task.tier) {
    throw new Error(`Level ${userLevel.name} cannot access tier ${task.tier} tasks`);
  }

  const assignmentId = randomUUID();
  await db.query(
    `INSERT INTO qz_task_assignments (id, task_id, user_id, status, payout_amount)
     VALUES ($1, $2, $3, 'assigned', $4)`,
    [assignmentId, taskId, userId, task.payout_amount],
  );

  await db.query(
    `UPDATE qz_tasks SET assigned_count = assigned_count + 1, status = 'assigned', updated_at = now() WHERE id = $1`,
    [taskId],
  );

  // Add to pending balance
  await wallet.addPending(db, userId, parseFloat(task.payout_amount));

  return assignmentId;
}

/**
 * Submit images for review.
 */
export async function submitAssignment(
  db: DbClient,
  assignmentId: string,
): Promise<void> {
  await db.query(
    `UPDATE qz_task_assignments
     SET status = 'submitted', submitted_at = now()
     WHERE id = $1`,
    [assignmentId],
  );

  await db.query(
    `UPDATE qz_tasks SET status = 'review', updated_at = now()
     WHERE id = (SELECT task_id FROM qz_task_assignments WHERE id = $1)`,
    [assignmentId],
  );
}

/**
 * Approve an assignment — THIS TRIGGERS INSTANT PAYOUT.
 *
 * Flow:
 * 1. Mark assignment approved
 * 2. Calculate final payout (base * streak multiplier)
 * 3. Credit wallet (instant)
 * 4. Update streak
 * 5. Check level upgrade
 * 6. Emit events
 */
export async function approveAssignment(
  db: DbClient,
  assignmentId: string,
  reviewer: string,
): Promise<{
  payout: number;
  streak: { count: number; multiplier: number; bonus: number };
  level_upgrade?: { name: string };
}> {
  // Get assignment details
  const { rows } = await db.query(
    `SELECT a.*, t.payout_amount AS task_payout, t.id AS task_id
     FROM qz_task_assignments a
     JOIN qz_tasks t ON t.id = a.task_id
     WHERE a.id = $1 AND a.status = 'submitted'`,
    [assignmentId],
  );
  if (rows.length === 0) throw new Error('Assignment not found or not submitted');

  const assignment = rows[0];
  const userId = assignment.user_id;
  const basePayout = parseFloat(assignment.task_payout);

  // 1. Update streak FIRST (to get multiplier)
  const streakResult = await levels.recordTaskCompletion(db, userId);

  // 2. Calculate final payout
  const finalPayout = Math.round(basePayout * streakResult.multiplier * 100) / 100;
  const totalPayout = finalPayout + streakResult.bonus;

  // 3. Mark approved
  await db.query(
    `UPDATE qz_task_assignments
     SET status = 'approved',
         completed_at = now(),
         streak_multiplier = $1,
         final_payout = $2,
         reviewer = $3
     WHERE id = $4`,
    [streakResult.multiplier, totalPayout, reviewer, assignmentId],
  );

  await db.query(
    `UPDATE qz_tasks SET status = 'completed', updated_at = now() WHERE id = $1`,
    [assignment.task_id],
  );

  // 4. INSTANT PAYOUT — credit wallet immediately
  await wallet.creditAvailable(db, {
    user_id: userId,
    amount: totalPayout,
    type: 'task_payout',
    reference_type: 'task_assignment',
    reference_id: assignmentId,
    description: `Task payout (${streakResult.multiplier}x streak)`,
    actor: 'system:payout-engine',
  });

  // 5. Bonus payout if streak milestone
  if (streakResult.bonus > 0) {
    await wallet.creditAvailable(db, {
      user_id: userId,
      amount: streakResult.bonus,
      type: 'streak_bonus',
      reference_type: 'streak',
      description: `Streak bonus: ${streakResult.reward?.unlock_label}`,
      actor: 'system:streak-engine',
    });
  }

  // 6. Emit events
  await emit(db, {
    aggregate_type: 'task',
    aggregate_id: assignment.task_id,
    event_type: 'TaskCompleted',
    payload: { assignment_id: assignmentId, user_id: userId, payout: totalPayout },
  });

  await emit(db, {
    aggregate_type: 'payment',
    aggregate_id: assignmentId,
    event_type: 'PaymentTriggered',
    payload: { user_id: userId, amount: totalPayout, streak_multiplier: streakResult.multiplier },
  });

  // 7. Check level upgrade
  const upgradeResult = await levels.checkAndUpgrade(db, userId);

  // 8. Update user earnings
  await db.query(
    `UPDATE qz_users SET total_earnings = total_earnings + $1, updated_at = now() WHERE id = $2`,
    [totalPayout, userId],
  );

  return {
    payout: totalPayout,
    streak: {
      count: streakResult.streak_count,
      multiplier: streakResult.multiplier,
      bonus: streakResult.bonus,
    },
    level_upgrade: upgradeResult.upgraded ? { name: upgradeResult.new_level!.name } : undefined,
  };
}

/**
 * Reject an assignment.
 */
export async function rejectAssignment(
  db: DbClient,
  assignmentId: string,
  reviewer: string,
  reason: string,
): Promise<void> {
  const { rows } = await db.query(
    `SELECT user_id, payout_amount FROM qz_task_assignments WHERE id = $1`,
    [assignmentId],
  );
  if (rows.length === 0) throw new Error('Assignment not found');

  await db.query(
    `UPDATE qz_task_assignments
     SET status = 'rejected', reviewer = $1, rejection_reason = $2
     WHERE id = $3`,
    [reviewer, reason, assignmentId],
  );

  // Re-open task
  await db.query(
    `UPDATE qz_tasks SET status = 'open', assigned_count = GREATEST(assigned_count - 1, 0), updated_at = now()
     WHERE id = (SELECT task_id FROM qz_task_assignments WHERE id = $1)`,
    [assignmentId],
  );
}
