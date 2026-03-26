-- ─── QuixZoom Economy Engine Schema ──────────────────────────────────────────
-- Production-grade double-entry ledger. BIGINT amounts (öre/cents).
-- IMMUTABLE: append-only. No updates. No deletes.
-- Constraint: SUM(debit) = SUM(credit) per transaction.

-- ─── Economy Wallets ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS economy_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL DEFAULT 'SEK',
  balance_available BIGINT NOT NULL DEFAULT 0,
  balance_pending BIGINT NOT NULL DEFAULT 0,
  balance_locked BIGINT NOT NULL DEFAULT 0,
  total_earned BIGINT NOT NULL DEFAULT 0,
  total_withdrawn BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Safety: no negative available balance
  CONSTRAINT chk_no_negative_available CHECK (balance_available >= 0),
  CONSTRAINT chk_no_negative_pending CHECK (balance_pending >= 0),
  CONSTRAINT chk_no_negative_locked CHECK (balance_locked >= 0)
);

CREATE INDEX IF NOT EXISTS idx_econ_wallets_user ON economy_wallets(user_id);

-- ─── Economy Ledger (IMMUTABLE, append-only) ────────────────────────────────
-- This is the financial source of truth. NEVER update or delete rows.
CREATE TABLE IF NOT EXISTS economy_ledger (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  account_id TEXT NOT NULL,                   -- ESCROW, PLATFORM_REVENUE, USER_WALLET_{id}, BUYER_{id}, PAYOUT_{rail}
  type TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
  amount BIGINT NOT NULL CHECK (amount > 0),  -- Always positive. Direction is determined by type.
  currency TEXT NOT NULL DEFAULT 'SEK',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DO NOT add UPDATE or DELETE triggers — this table is append-only
CREATE INDEX IF NOT EXISTS idx_econ_ledger_tx ON economy_ledger(transaction_id);
CREATE INDEX IF NOT EXISTS idx_econ_ledger_account ON economy_ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_econ_ledger_created ON economy_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_econ_ledger_type ON economy_ledger(type);

-- ─── Economy Transactions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS economy_transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('task_payout', 'ir_sale', 'ir_refund', 'withdrawal', 'deposit', 'adjustment')),
  status TEXT NOT NULL DEFAULT 'committed' CHECK (status IN ('pending', 'committed', 'processing', 'completed', 'failed', 'rolled_back')),
  user_id TEXT,
  reference_id TEXT,                          -- task_id, ir_id, etc.
  amount BIGINT NOT NULL,
  fee BIGINT NOT NULL DEFAULT 0,
  payout BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_econ_tx_user ON economy_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_econ_tx_type ON economy_transactions(type);
CREATE INDEX IF NOT EXISTS idx_econ_tx_status ON economy_transactions(status);
CREATE INDEX IF NOT EXISTS idx_econ_tx_created ON economy_transactions(created_at DESC);

-- ─── Platform Escrow Account ────────────────────────────────────────────────
-- Pre-funded pool that holds money before task payouts
CREATE TABLE IF NOT EXISTS economy_escrow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id TEXT NOT NULL,                    -- Which legal entity
  currency TEXT NOT NULL DEFAULT 'SEK',
  balance BIGINT NOT NULL DEFAULT 0,
  last_funded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_id, currency),
  CONSTRAINT chk_escrow_positive CHECK (balance >= 0)
);

-- ─── Wallet Credit Function (atomic) ───────────────────────────────────────
-- Called after ledger write to atomically update wallet balance
CREATE OR REPLACE FUNCTION economy_wallet_credit(
  p_user_id TEXT,
  p_amount BIGINT,
  p_currency TEXT DEFAULT 'SEK'
) RETURNS VOID AS $$
BEGIN
  INSERT INTO economy_wallets (user_id, currency, balance_available, total_earned)
  VALUES (p_user_id, p_currency, p_amount, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    balance_available = economy_wallets.balance_available + p_amount,
    total_earned = economy_wallets.total_earned + p_amount,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- ─── Wallet Debit Function (atomic, with balance check) ────────────────────
CREATE OR REPLACE FUNCTION economy_wallet_debit(
  p_user_id TEXT,
  p_amount BIGINT,
  p_currency TEXT DEFAULT 'SEK'
) RETURNS BOOLEAN AS $$
DECLARE
  current_balance BIGINT;
BEGIN
  SELECT balance_available INTO current_balance
  FROM economy_wallets WHERE user_id = p_user_id AND currency = p_currency
  FOR UPDATE; -- Lock row

  IF current_balance IS NULL OR current_balance < p_amount THEN
    RETURN FALSE; -- Insufficient funds
  END IF;

  UPDATE economy_wallets SET
    balance_available = balance_available - p_amount,
    total_withdrawn = total_withdrawn + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id AND currency = p_currency;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ─── Ledger Balance Check (verify integrity) ───────────────────────────────
-- Run this periodically to verify system integrity
CREATE OR REPLACE VIEW v_economy_ledger_balance AS
SELECT
  transaction_id,
  SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) AS total_debit,
  SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) AS total_credit,
  SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) -
    SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) AS imbalance
FROM economy_ledger
GROUP BY transaction_id
HAVING SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) !=
       SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END);
-- This view should ALWAYS return 0 rows. Any rows = CRITICAL BUG.

-- ─── Account Balances (computed from ledger) ────────────────────────────────
CREATE OR REPLACE VIEW v_economy_account_balances AS
SELECT
  account_id,
  currency,
  SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) -
    SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) AS balance
FROM economy_ledger
GROUP BY account_id, currency;

-- ─── Platform Revenue Summary ───────────────────────────────────────────────
CREATE OR REPLACE VIEW v_economy_platform_revenue AS
SELECT
  date_trunc('day', created_at) AS day,
  currency,
  SUM(amount) AS revenue,
  COUNT(*) AS transactions
FROM economy_ledger
WHERE account_id = 'PLATFORM_REVENUE' AND type = 'credit'
GROUP BY date_trunc('day', created_at), currency
ORDER BY day DESC;

-- ─── Daily Financial Summary ────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_economy_daily_summary AS
SELECT
  t.type,
  date_trunc('day', t.created_at) AS day,
  COUNT(*) AS count,
  SUM(t.amount) AS total_gmv,
  SUM(t.fee) AS total_fees,
  SUM(t.payout) AS total_payouts,
  t.currency
FROM economy_transactions t
WHERE t.status = 'committed'
GROUP BY t.type, date_trunc('day', t.created_at), t.currency
ORDER BY day DESC, type;
