import { randomUUID } from 'crypto';
import type { DbClient } from './db.js';
import { emit } from './event-bus.js';
import { log as auditLog } from './audit.js';
import * as ledger from './ledger.js';

// ============================================================================
// Types
// ============================================================================

export interface WalletBalance {
  wallet_id: string;
  available: string;
  pending: string;
  locked: string;
  lifetime_earned: string;
  lifetime_withdrawn: string;
}

export type WalletTxType =
  | 'task_payout' | 'ir_sale' | 'withdrawal' | 'deposit'
  | 'level_invest' | 'streak_bonus' | 'referral_bonus'
  | 'fee' | 'reversal' | 'lock' | 'unlock';

interface WalletTxParams {
  wallet_id: string;
  type: WalletTxType;
  amount: number;
  reference_type?: string;
  reference_id?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Core Operations
// ============================================================================

/**
 * Create a wallet for a new user.
 */
export async function createWallet(
  db: DbClient,
  userId: string,
  currency: string = 'SEK',
): Promise<string> {
  const id = randomUUID();
  await db.query(
    `INSERT INTO qz_wallets (id, user_id, currency) VALUES ($1, $2, $3)`,
    [id, userId, currency],
  );
  return id;
}

/**
 * Get wallet balance for a user.
 */
export async function getBalance(db: DbClient, userId: string): Promise<WalletBalance> {
  const { rows } = await db.query(
    `SELECT id AS wallet_id, available, pending, locked, lifetime_earned, lifetime_withdrawn
     FROM qz_wallets WHERE user_id = $1`,
    [userId],
  );
  if (rows.length === 0) throw new Error('Wallet not found');
  return rows[0];
}

/**
 * Credit available balance (used after task approval).
 * This is the INSTANT PAYOUT path — moves from pending → available in one step.
 */
export async function creditAvailable(
  db: DbClient,
  params: {
    user_id: string;
    amount: number;
    type: WalletTxType;
    reference_type?: string;
    reference_id?: string;
    description?: string;
    actor: string;
  },
): Promise<{ wallet_id: string; new_balance: string }> {
  const { rows } = await db.query(
    `UPDATE qz_wallets
     SET available = available + $1,
         lifetime_earned = lifetime_earned + $1,
         updated_at = now()
     WHERE user_id = $2
     RETURNING id, available`,
    [params.amount, params.user_id],
  );

  if (rows.length === 0) throw new Error('Wallet not found');

  const walletId = rows[0].id;
  const newBalance = rows[0].available;

  // Record transaction
  await recordTx(db, {
    wallet_id: walletId,
    type: params.type,
    amount: params.amount,
    reference_type: params.reference_type,
    reference_id: params.reference_id,
    description: params.description,
  }, newBalance);

  // Emit event
  await emit(db, {
    aggregate_type: 'wallet',
    aggregate_id: walletId,
    event_type: 'WalletUpdated',
    payload: {
      user_id: params.user_id,
      type: params.type,
      amount: params.amount,
      new_available: newBalance,
    },
  });

  await auditLog(db, {
    event_type: `wallet.${params.type}`,
    actor: params.actor,
    resource_type: 'wallet',
    resource_id: walletId,
    payload: { amount: params.amount, balance_after: newBalance },
  });

  return { wallet_id: walletId, new_balance: newBalance };
}

/**
 * Add to pending balance (task assigned but not yet approved).
 */
export async function addPending(
  db: DbClient,
  userId: string,
  amount: number,
  referenceId?: string,
): Promise<void> {
  await db.query(
    `UPDATE qz_wallets SET pending = pending + $1, updated_at = now() WHERE user_id = $2`,
    [amount, userId],
  );
}

/**
 * Move from pending → available (approval triggers this).
 */
export async function resolvePending(
  db: DbClient,
  userId: string,
  amount: number,
): Promise<void> {
  await db.query(
    `UPDATE qz_wallets
     SET pending = GREATEST(pending - $1, 0),
         available = available + $1,
         lifetime_earned = lifetime_earned + $1,
         updated_at = now()
     WHERE user_id = $2`,
    [amount, userId],
  );
}

/**
 * Lock funds (for level investment, etc).
 */
export async function lockFunds(
  db: DbClient,
  userId: string,
  amount: number,
  reason: string,
  actor: string,
): Promise<void> {
  const { rows } = await db.query(
    `UPDATE qz_wallets
     SET available = available - $1,
         locked = locked + $1,
         updated_at = now()
     WHERE user_id = $2 AND available >= $1
     RETURNING id, available`,
    [amount, userId],
  );

  if (rows.length === 0) throw new Error('Insufficient available balance');

  await recordTx(db, {
    wallet_id: rows[0].id,
    type: 'lock',
    amount: -amount,
    description: reason,
  }, rows[0].available);
}

/**
 * Unlock funds back to available.
 */
export async function unlockFunds(
  db: DbClient,
  userId: string,
  amount: number,
  reason: string,
): Promise<void> {
  await db.query(
    `UPDATE qz_wallets
     SET locked = GREATEST(locked - $1, 0),
         available = available + $1,
         updated_at = now()
     WHERE user_id = $2`,
    [amount, userId],
  );
}

/**
 * Process withdrawal.
 * Deducts from available, records withdrawal, returns withdrawal ID.
 */
export async function withdraw(
  db: DbClient,
  params: {
    user_id: string;
    amount: number;
    currency: string;
    method: 'instant' | 'batch' | 'bank_transfer';
    destination: Record<string, unknown>;
    actor: string;
  },
): Promise<{ withdrawal_id: string }> {
  // Deduct from available
  const { rows } = await db.query(
    `UPDATE qz_wallets
     SET available = available - $1,
         lifetime_withdrawn = lifetime_withdrawn + $1,
         updated_at = now()
     WHERE user_id = $2 AND available >= $1
     RETURNING id, available`,
    [params.amount, params.user_id],
  );

  if (rows.length === 0) throw new Error('Insufficient balance for withdrawal');

  const walletId = rows[0].id;
  const withdrawalId = randomUUID();

  // Create withdrawal record
  await db.query(
    `INSERT INTO qz_withdrawals (id, user_id, wallet_id, amount, currency, method, destination, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
    [withdrawalId, params.user_id, walletId, params.amount, params.currency,
     params.method, JSON.stringify(params.destination)],
  );

  // Record wallet transaction
  await recordTx(db, {
    wallet_id: walletId,
    type: 'withdrawal',
    amount: -params.amount,
    reference_type: 'withdrawal',
    reference_id: withdrawalId,
  }, rows[0].available);

  await auditLog(db, {
    event_type: 'wallet.withdrawal',
    actor: params.actor,
    resource_type: 'withdrawal',
    resource_id: withdrawalId,
    payload: { amount: params.amount, method: params.method },
  });

  return { withdrawal_id: withdrawalId };
}

// ============================================================================
// Internal
// ============================================================================

async function recordTx(
  db: DbClient,
  params: WalletTxParams,
  balanceAfter: string | number,
): Promise<void> {
  await db.query(
    `INSERT INTO qz_wallet_transactions (id, wallet_id, type, amount, balance_after, reference_type, reference_id, description, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      randomUUID(), params.wallet_id, params.type, params.amount,
      balanceAfter, params.reference_type ?? null, params.reference_id ?? null,
      params.description ?? null, JSON.stringify(params.metadata ?? {}),
    ],
  );
}
