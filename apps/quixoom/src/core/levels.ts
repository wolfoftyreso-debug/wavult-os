import type { DbClient } from './db.js';
import { emit } from './event-bus.js';
import { log as auditLog } from './audit.js';

// ============================================================================
// Types
// ============================================================================

export interface Level {
  id: number;
  slug: string;
  name: string;
  ordinal: number;
  max_daily_earnings: string;
  task_access_tier: number;
  ir_creation: boolean;
  ir_publish: boolean;
  revenue_share_pct: string;
  streak_multiplier: string;
  min_tasks_to_unlock: number;
  min_rating: string;
}

export interface StreakState {
  current_count: number;
  longest_count: number;
  multiplier: string;
  last_task_at: string | null;
  expires_at: string | null;
}

export interface StreakReward {
  streak_count: number;
  multiplier: string;
  bonus_amount: string;
  unlock_label: string;
}

// ============================================================================
// Level Operations
// ============================================================================

let levelCache: Level[] | null = null;

export async function getAllLevels(db: DbClient): Promise<Level[]> {
  if (levelCache) return levelCache;
  const { rows } = await db.query('SELECT * FROM qz_levels ORDER BY ordinal ASC');
  levelCache = rows;
  return rows;
}

export async function getUserLevel(db: DbClient, userId: string): Promise<Level> {
  const { rows } = await db.query(
    `SELECT l.* FROM qz_levels l
     JOIN qz_users u ON u.level_id = l.id
     WHERE u.id = $1`,
    [userId],
  );
  if (rows.length === 0) throw new Error('User not found');
  return rows[0];
}

/**
 * Check if user qualifies for next level and upgrade if so.
 */
export async function checkAndUpgrade(
  db: DbClient,
  userId: string,
): Promise<{ upgraded: boolean; new_level?: Level }> {
  const { rows: userRows } = await db.query(
    `SELECT u.id, u.total_tasks, u.rating, u.level_id, l.ordinal AS current_ordinal
     FROM qz_users u JOIN qz_levels l ON l.id = u.level_id
     WHERE u.id = $1`,
    [userId],
  );

  if (userRows.length === 0) throw new Error('User not found');
  const user = userRows[0];

  // Get next level
  const levels = await getAllLevels(db);
  const nextLevel = levels.find(l => l.ordinal === user.current_ordinal + 1);

  if (!nextLevel) return { upgraded: false }; // Already max level

  // Check requirements
  if (
    user.total_tasks >= nextLevel.min_tasks_to_unlock &&
    parseFloat(user.rating) >= parseFloat(nextLevel.min_rating)
  ) {
    await db.query(
      `UPDATE qz_users SET level_id = $1, updated_at = now() WHERE id = $2`,
      [nextLevel.id, userId],
    );

    await emit(db, {
      aggregate_type: 'user',
      aggregate_id: userId,
      event_type: 'LedgerCommitted', // Reusing — in production add LevelUpgraded event
      payload: {
        event: 'level_upgraded',
        from_level: user.current_ordinal,
        to_level: nextLevel.ordinal,
        level_name: nextLevel.name,
      },
    });

    await auditLog(db, {
      event_type: 'user.level_upgraded',
      actor: 'system:level-engine',
      resource_type: 'user',
      resource_id: userId,
      payload: { from: user.current_ordinal, to: nextLevel.ordinal },
    });

    return { upgraded: true, new_level: nextLevel };
  }

  return { upgraded: false };
}

// ============================================================================
// Streak Operations
// ============================================================================

const STREAK_WINDOW_HOURS = 26; // must complete next task within 26h

/**
 * Record a task completion and update streak.
 */
export async function recordTaskCompletion(
  db: DbClient,
  userId: string,
): Promise<{
  streak_count: number;
  multiplier: number;
  bonus: number;
  reward?: StreakReward;
}> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + STREAK_WINDOW_HOURS * 3600 * 1000);

  // Get or create streak
  const { rows } = await db.query(
    `INSERT INTO qz_streaks (id, user_id, current_count, longest_count, multiplier, last_task_at, streak_start, expires_at, updated_at)
     VALUES (gen_random_uuid(), $1, 0, 0, 1.00, NULL, NULL, NULL, now())
     ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
     RETURNING *`,
    [userId],
  );

  const streak = rows[0];
  const lastTask = streak.last_task_at ? new Date(streak.last_task_at) : null;
  const expired = streak.expires_at ? new Date(streak.expires_at) < now : true;

  let newCount: number;
  let streakStart: Date;

  if (expired || !lastTask) {
    // Streak broken or first task — restart
    newCount = 1;
    streakStart = now;
  } else {
    // Continue streak
    newCount = streak.current_count + 1;
    streakStart = streak.streak_start ? new Date(streak.streak_start) : now;
  }

  const longestCount = Math.max(newCount, streak.longest_count);

  // Get applicable reward
  const { rows: rewardRows } = await db.query(
    `SELECT * FROM qz_streak_rewards
     WHERE streak_count <= $1
     ORDER BY streak_count DESC LIMIT 1`,
    [newCount],
  );

  const reward: StreakReward | undefined = rewardRows[0];
  const multiplier = reward ? parseFloat(reward.multiplier) : 1.0;
  const bonus = reward && newCount === reward.streak_count ? parseFloat(reward.bonus_amount) : 0;

  // Update streak
  await db.query(
    `UPDATE qz_streaks
     SET current_count = $1,
         longest_count = $2,
         multiplier = $3,
         last_task_at = $4,
         streak_start = $5,
         expires_at = $6,
         updated_at = now()
     WHERE user_id = $7`,
    [newCount, longestCount, multiplier, now.toISOString(), streakStart.toISOString(), expiresAt.toISOString(), userId],
  );

  // Update user total tasks
  await db.query(
    `UPDATE qz_users SET total_tasks = total_tasks + 1, updated_at = now() WHERE id = $1`,
    [userId],
  );

  return { streak_count: newCount, multiplier, bonus, reward };
}

/**
 * Get current streak state for a user.
 */
export async function getStreak(db: DbClient, userId: string): Promise<StreakState | null> {
  const { rows } = await db.query(
    `SELECT current_count, longest_count, multiplier, last_task_at, expires_at
     FROM qz_streaks WHERE user_id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}
