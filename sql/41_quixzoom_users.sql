-- ============================================================================
-- QuixZoom — Users, Wallets, Levels, Streaks
-- File: 41_quixzoom_users.sql
-- Depends: 40_quixoom_core.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATOR LEVELS (reference table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_levels (
  id              SERIAL      PRIMARY KEY,
  slug            TEXT        NOT NULL UNIQUE,
  name            TEXT        NOT NULL,
  ordinal         INTEGER     NOT NULL UNIQUE,   -- 1-6 for sorting
  max_daily_earnings  NUMERIC(12,2) NOT NULL,
  task_access_tier    INTEGER     NOT NULL,       -- which task tiers are visible
  ir_creation         BOOLEAN     NOT NULL DEFAULT false,
  ir_publish          BOOLEAN     NOT NULL DEFAULT false,
  revenue_share_pct   NUMERIC(5,2) NOT NULL,      -- creator's cut on IR sales
  streak_multiplier   NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  min_tasks_to_unlock INTEGER     NOT NULL DEFAULT 0,
  min_rating          NUMERIC(3,2) DEFAULT 0,
  description         TEXT
);

INSERT INTO qz_levels (slug, name, ordinal, max_daily_earnings, task_access_tier, ir_creation, ir_publish, revenue_share_pct, streak_multiplier, min_tasks_to_unlock, min_rating, description)
VALUES
  ('beginner',     'Beginner',     1,   50.00,  1, false, false, 60.00, 1.00,   0,  0.00, 'Getting started — guided tasks only'),
  ('hobby',        'Hobby',        2,  150.00,  2, false, false, 65.00, 1.10,  25,  3.50, 'Casual mode — broader task variety'),
  ('explorer',     'Explorer',     3,  400.00,  3, true,  false, 70.00, 1.20,  100, 4.00, 'Can create IR drafts, geo-expanded tasks'),
  ('creative',     'Creative',     4, 1000.00,  4, true,  true,  75.00, 1.35,  300, 4.25, 'Build and publish IR datasets'),
  ('professional', 'Professional', 5, 3000.00,  5, true,  true,  82.00, 1.50,  750, 4.50, 'High-value jobs, priority matching'),
  ('elite',        'Elite',        6, 10000.00, 6, true,  true,  90.00, 2.00, 2000, 4.75, 'Exclusive access, top revenue share')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. USERS (creators)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID        REFERENCES qx_entities(id),  -- link to financial entity
  email           TEXT        NOT NULL UNIQUE,
  display_name    TEXT        NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  level_id        INTEGER     NOT NULL DEFAULT 1 REFERENCES qz_levels(id),
  mode            TEXT        NOT NULL DEFAULT 'beginner'
                    CHECK (mode IN ('beginner','hobby','creative','professional','elite')),
  total_tasks     INTEGER     NOT NULL DEFAULT 0,
  total_earnings  NUMERIC(14,2) NOT NULL DEFAULT 0,
  rating          NUMERIC(3,2) NOT NULL DEFAULT 5.00,
  status          TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','banned','onboarding')),
  location        JSONB       DEFAULT '{}',  -- { lat, lng, city, country }
  preferences     JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qz_users_level ON qz_users(level_id);
CREATE INDEX IF NOT EXISTS idx_qz_users_status ON qz_users(status);
CREATE INDEX IF NOT EXISTS idx_qz_users_email ON qz_users(email);

-- ============================================================================
-- 3. WALLETS (one per user, multi-balance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_wallets (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL UNIQUE REFERENCES qz_users(id),
  currency        TEXT        NOT NULL DEFAULT 'SEK',
  available       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (available >= 0),
  pending         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (pending >= 0),
  locked          NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (locked >= 0),
  lifetime_earned NUMERIC(14,2) NOT NULL DEFAULT 0,
  lifetime_withdrawn NUMERIC(14,2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. WALLET TRANSACTIONS (every wallet movement, append-only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_wallet_transactions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       UUID        NOT NULL REFERENCES qz_wallets(id),
  type            TEXT        NOT NULL CHECK (type IN (
                    'task_payout', 'ir_sale', 'withdrawal', 'deposit',
                    'level_invest', 'streak_bonus', 'referral_bonus',
                    'fee', 'reversal', 'lock', 'unlock'
                  )),
  amount          NUMERIC(14,2) NOT NULL,
  balance_after   NUMERIC(14,2) NOT NULL,
  reference_type  TEXT,         -- task, ir, withdrawal, etc.
  reference_id    UUID,
  description     TEXT,
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qz_wtx_wallet ON qz_wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_qz_wtx_type ON qz_wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_qz_wtx_created ON qz_wallet_transactions(created_at);

-- Immutable wallet transactions
DROP TRIGGER IF EXISTS trg_qz_wtx_immutable ON qz_wallet_transactions;
CREATE TRIGGER trg_qz_wtx_immutable
  BEFORE UPDATE OR DELETE ON qz_wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION qx_ledger_immutable();

-- ============================================================================
-- 5. STREAKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_streaks (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES qz_users(id),
  current_count   INTEGER     NOT NULL DEFAULT 0,
  longest_count   INTEGER     NOT NULL DEFAULT 0,
  multiplier      NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  last_task_at    TIMESTAMPTZ,
  streak_start    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,  -- streak breaks if no task before this
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_qz_streaks_user ON qz_streaks(user_id);

-- ============================================================================
-- 6. STREAK REWARDS (what you earn at each milestone)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_streak_rewards (
  id              SERIAL      PRIMARY KEY,
  streak_count    INTEGER     NOT NULL UNIQUE,
  multiplier      NUMERIC(4,2) NOT NULL,
  bonus_amount    NUMERIC(10,2) DEFAULT 0,
  unlock_label    TEXT,
  description     TEXT
);

INSERT INTO qz_streak_rewards (streak_count, multiplier, bonus_amount, unlock_label, description)
VALUES
  (3,   1.10,   5.00,  'Warm Up',        '3-task streak — 10% boost'),
  (7,   1.25,  15.00,  'On Fire',        '7-task streak — 25% boost + bonus'),
  (14,  1.40,  40.00,  'Unstoppable',    '14-task streak — 40% boost'),
  (30,  1.60, 100.00,  'Legend',         '30-task streak — 60% boost + big bonus'),
  (60,  1.80, 250.00,  'Machine',        '60-task streak — 80% boost'),
  (100, 2.00, 500.00,  'Transcendent',   '100-task streak — 2x everything')
ON CONFLICT (streak_count) DO NOTHING;

-- ============================================================================
-- 7. WITHDRAWALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_withdrawals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES qz_users(id),
  wallet_id       UUID        NOT NULL REFERENCES qz_wallets(id),
  amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency        TEXT        NOT NULL,
  method          TEXT        NOT NULL CHECK (method IN ('instant', 'batch', 'bank_transfer')),
  destination     JSONB       NOT NULL,  -- { type, account_number, bank, etc. }
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','completed','failed','reversed')),
  psp_reference   TEXT,
  fee             NUMERIC(10,2) DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

COMMIT;
