-- ─── Wallet OS Schema — Real-Time Payouts + IR Marketplace + Gamification ───
-- Pre-funded wallets, instant payouts, task engine, intelligence repos.
-- Event-driven: ImageApproved → TaskCompleted → PaymentTriggered → WalletUpdated

-- ─── User Profiles (gamification layer) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_os_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID,                               -- Links to Supabase auth
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  level INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 6),
  xp INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  tasks_completed INT NOT NULL DEFAULT 0,
  irs_created INT NOT NULL DEFAULT 0,
  preferred_payout_rail TEXT DEFAULT 'swish',
  location_lat DECIMAL(10,6),
  location_lng DECIMAL(10,6),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wos_users_level ON wallet_os_users(level);
CREATE INDEX IF NOT EXISTS idx_wos_users_location ON wallet_os_users(location_lat, location_lng);

-- ─── Wallets (pre-funded, instant credit) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES wallet_os_users(id),
  available DECIMAL(18,2) NOT NULL DEFAULT 0,
  pending DECIMAL(18,2) NOT NULL DEFAULT 0,     -- Awaiting validation
  locked DECIMAL(18,2) NOT NULL DEFAULT 0,      -- Invested / held
  currency TEXT NOT NULL DEFAULT 'SEK',
  total_earned DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_withdrawn DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, currency)
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

-- ─── Wallet Transactions (immutable) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES wallet_os_users(id),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  type TEXT NOT NULL CHECK (type IN ('task-payout', 'ir-sale', 'streak-bonus', 'withdrawal', 'investment', 'refund', 'fee', 'deposit')),
  amount DECIMAL(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  description TEXT,
  task_id UUID,
  ir_id UUID,
  payout_rail TEXT,                            -- swish, sepa-instant, ach, etc.
  external_reference TEXT,                     -- PSP transaction ID
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wtx_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wtx_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wtx_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wtx_created ON wallet_transactions(created_at DESC);

-- ─── Tasks ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_os_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('photo-capture', 'data-collection', 'verification', 'survey', 'ir-contribution')),
  title TEXT NOT NULL,
  description TEXT,

  -- Location
  location_lat DECIMAL(10,6) NOT NULL,
  location_lng DECIMAL(10,6) NOT NULL,
  location_address TEXT,
  location_radius INT NOT NULL DEFAULT 500,    -- meters

  -- Payout
  payout DECIMAL(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  xp_reward INT NOT NULL DEFAULT 10,

  -- Requirements
  required_level INT NOT NULL DEFAULT 1,
  required_images INT NOT NULL DEFAULT 1,
  time_limit_minutes INT NOT NULL DEFAULT 60,
  validation_method TEXT NOT NULL DEFAULT 'ai-auto' CHECK (validation_method IN ('ai-auto', 'peer-review', 'client-review', 'hybrid')),

  -- Status
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'claimed', 'in-progress', 'validating', 'completed', 'rejected', 'expired')),
  claimed_by UUID REFERENCES wallet_os_users(id),
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Demand source
  demand_signal_id UUID,
  demand_source TEXT,                          -- "search: skyltfönster södermalm", "client: FirmX", "ai: seasonal"
  streak_eligible BOOLEAN NOT NULL DEFAULT true,

  -- Tags
  tags TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wos_tasks_status ON wallet_os_tasks(status);
CREATE INDEX IF NOT EXISTS idx_wos_tasks_level ON wallet_os_tasks(required_level);
CREATE INDEX IF NOT EXISTS idx_wos_tasks_location ON wallet_os_tasks(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_wos_tasks_claimed ON wallet_os_tasks(claimed_by);

-- ─── Task Events (immutable audit trail) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_os_task_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES wallet_os_tasks(id),
  user_id UUID REFERENCES wallet_os_users(id),
  event_type TEXT NOT NULL,                    -- TaskCreated, TaskClaimed, ImageCaptured, ImageValidated, TaskCompleted, PaymentTriggered, WalletUpdated
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wos_events_task ON wallet_os_task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_wos_events_type ON wallet_os_task_events(event_type);

-- ─── Task Images ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_os_task_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES wallet_os_tasks(id),
  user_id UUID NOT NULL REFERENCES wallet_os_users(id),
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- AI validation
  ai_validated BOOLEAN DEFAULT false,
  ai_score DECIMAL(5,2),                      -- 0-100
  ai_labels JSONB DEFAULT '[]'::jsonb,        -- ["facade", "dirty-window", "shop-front"]
  ai_analysis JSONB DEFAULT '{}'::jsonb,      -- { "cleanliness": 34, "condition": 72 }

  -- Geo
  capture_lat DECIMAL(10,6),
  capture_lng DECIMAL(10,6),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wos_images_task ON wallet_os_task_images(task_id);

-- ─── Intelligence Repos ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS intelligence_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES wallet_os_users(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('retail', 'real-estate', 'infrastructure', 'advertising', 'municipal', 'custom')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'collecting', 'analyzing', 'published', 'sold', 'archived')),

  -- Location
  area TEXT,
  city TEXT,
  country TEXT DEFAULT 'SE',

  -- Data
  data_points INT NOT NULL DEFAULT 0,
  images INT NOT NULL DEFAULT 0,
  ai_analysis JSONB DEFAULT '[]'::jsonb,

  -- Pricing
  price_one_time DECIMAL(18,2),
  price_subscription DECIMAL(18,2),           -- monthly
  price_per_point DECIMAL(18,2),
  currency TEXT NOT NULL DEFAULT 'SEK',

  -- Sales
  total_buyers INT NOT NULL DEFAULT 0,
  total_revenue DECIMAL(18,2) NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ir_creator ON intelligence_repos(creator_id);
CREATE INDEX IF NOT EXISTS idx_ir_category ON intelligence_repos(category);
CREATE INDEX IF NOT EXISTS idx_ir_status ON intelligence_repos(status);

-- ─── IR Purchases ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ir_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ir_id UUID NOT NULL REFERENCES intelligence_repos(id),
  buyer_id TEXT NOT NULL,                     -- Could be external business ID
  buyer_name TEXT,
  access_type TEXT NOT NULL CHECK (access_type IN ('one-time', 'subscription', 'per-point')),
  amount DECIMAL(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  creator_payout DECIMAL(18,2) NOT NULL,      -- Creator's share
  platform_fee DECIMAL(18,2) NOT NULL,        -- Platform's share
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ir_purchases_ir ON ir_purchases(ir_id);

-- ─── Demand Signals ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS demand_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('search', 'client', 'ai-prediction', 'seasonal')),
  query TEXT NOT NULL,
  area TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  tasks_generated INT NOT NULL DEFAULT 0,
  estimated_value DECIMAL(18,2),
  currency TEXT NOT NULL DEFAULT 'SEK',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'expired')),
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demand_status ON demand_signals(status);
CREATE INDEX IF NOT EXISTS idx_demand_source ON demand_signals(source);

-- ─── Streak History ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS streak_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES wallet_os_users(id),
  streak_name TEXT NOT NULL,
  streak_length INT NOT NULL,
  bonus_pct DECIMAL(5,2) NOT NULL,
  bonus_amount DECIMAL(18,2),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_streak_user ON streak_history(user_id);

-- ─── Platform Escrow (pre-funded pool) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_escrow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id TEXT NOT NULL,                    -- Which legal entity holds escrow
  currency TEXT NOT NULL DEFAULT 'SEK',
  balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  last_funded TIMESTAMPTZ,
  last_disbursed TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_id, currency)
);

-- ─── Useful Views ───────────────────────────────────────────────────────────

-- User earnings summary
CREATE OR REPLACE VIEW v_user_earnings AS
SELECT
  u.id, u.display_name, u.level, u.xp,
  w.available, w.pending, w.locked, w.total_earned, w.total_withdrawn,
  u.tasks_completed, u.irs_created, u.current_streak
FROM wallet_os_users u
JOIN wallets w ON w.user_id = u.id;

-- Task completion rate
CREATE OR REPLACE VIEW v_task_stats AS
SELECT
  type,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
  AVG(payout) AS avg_payout,
  SUM(payout) FILTER (WHERE status = 'completed') AS total_paid
FROM wallet_os_tasks
GROUP BY type;

-- IR marketplace stats
CREATE OR REPLACE VIEW v_ir_marketplace AS
SELECT
  category,
  COUNT(*) AS total_repos,
  SUM(total_buyers) AS total_buyers,
  SUM(total_revenue) AS total_revenue,
  AVG(data_points) AS avg_data_points
FROM intelligence_repos
WHERE status IN ('published', 'sold')
GROUP BY category;
