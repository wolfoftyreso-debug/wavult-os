-- ============================================================================
-- QuixZoom — Intelligence Repos (IR)
-- File: 43_quixzoom_ir.sql
-- Depends: 42_quixzoom_tasks.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. INTELLIGENCE REPOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_intelligence_repos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID        NOT NULL REFERENCES qz_users(id),
  title           TEXT        NOT NULL,
  description     TEXT,
  slug            TEXT        NOT NULL UNIQUE,

  -- Classification
  category        TEXT        NOT NULL,
  tags            TEXT[]      DEFAULT '{}',

  -- Geographic scope
  area_name       TEXT,
  city            TEXT,
  country         TEXT,
  bounding_box    JSONB,       -- { ne: {lat,lng}, sw: {lat,lng} }

  -- Content stats (denormalized for performance)
  image_count     INTEGER     NOT NULL DEFAULT 0,
  data_point_count INTEGER    NOT NULL DEFAULT 0,
  avg_ai_score    NUMERIC(5,2) DEFAULT 0,
  coverage_pct    NUMERIC(5,2) DEFAULT 0,  -- how much of the area is covered

  -- Pricing
  price_type      TEXT        NOT NULL DEFAULT 'one_time'
                    CHECK (price_type IN ('free','one_time','subscription','custom')),
  price           NUMERIC(10,2) DEFAULT 0,
  subscription_monthly NUMERIC(10,2),

  -- State
  status          TEXT        NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','review','published','archived','suspended')),
  visibility      TEXT        NOT NULL DEFAULT 'private'
                    CHECK (visibility IN ('private','unlisted','public')),

  -- Revenue
  total_sales     INTEGER     NOT NULL DEFAULT 0,
  total_revenue   NUMERIC(14,2) NOT NULL DEFAULT 0,

  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qz_ir_creator ON qz_intelligence_repos(creator_id);
CREATE INDEX IF NOT EXISTS idx_qz_ir_status ON qz_intelligence_repos(status);
CREATE INDEX IF NOT EXISTS idx_qz_ir_category ON qz_intelligence_repos(category);
CREATE INDEX IF NOT EXISTS idx_qz_ir_area ON qz_intelligence_repos(area_name, city);

-- ============================================================================
-- 2. IR ITEMS (individual data points within an IR)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_ir_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id         UUID        NOT NULL REFERENCES qz_intelligence_repos(id),
  image_id        UUID        REFERENCES qz_images(id),

  -- Data
  title           TEXT,
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  address         TEXT,
  captured_at     TIMESTAMPTZ,

  -- AI-derived data
  ai_category     TEXT,
  ai_condition    TEXT,
  ai_labels       JSONB       DEFAULT '[]',
  ai_score        NUMERIC(5,2),
  lead_score      NUMERIC(5,2),      -- 0-100 probability business needs service
  lead_analysis   JSONB       DEFAULT '{}',

  -- Structured data
  properties      JSONB       DEFAULT '{}',  -- key-value pairs specific to category

  sort_order      INTEGER     DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qz_ir_items_repo ON qz_ir_items(repo_id);
CREATE INDEX IF NOT EXISTS idx_qz_ir_items_geo ON qz_ir_items(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_qz_ir_items_lead ON qz_ir_items(lead_score DESC);

-- ============================================================================
-- 3. IR PURCHASES
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_ir_purchases (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id         UUID        NOT NULL REFERENCES qz_intelligence_repos(id),
  buyer_id        UUID,       -- NULL for anonymous/guest purchases
  buyer_email     TEXT,
  buyer_company   TEXT,

  -- Payment
  amount          NUMERIC(10,2) NOT NULL,
  currency        TEXT        NOT NULL DEFAULT 'SEK',
  creator_share   NUMERIC(10,2) NOT NULL,  -- what creator gets
  platform_fee    NUMERIC(10,2) NOT NULL,  -- what platform keeps
  transaction_id  UUID        REFERENCES qx_transactions(id),

  -- Access
  access_type     TEXT        NOT NULL CHECK (access_type IN ('one_time','subscription')),
  access_until    TIMESTAMPTZ,

  status          TEXT        NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('pending','completed','refunded','expired')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qz_ir_purchases_repo ON qz_ir_purchases(repo_id);
CREATE INDEX IF NOT EXISTS idx_qz_ir_purchases_buyer ON qz_ir_purchases(buyer_id);

-- ============================================================================
-- 4. IR SUBSCRIPTIONS (recurring access)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_ir_subscriptions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id         UUID        NOT NULL REFERENCES qz_intelligence_repos(id),
  buyer_id        UUID,
  buyer_email     TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','paused','cancelled','expired')),
  monthly_amount  NUMERIC(10,2) NOT NULL,
  next_billing    TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. IR REVIEWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_ir_reviews (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id         UUID        NOT NULL REFERENCES qz_intelligence_repos(id),
  buyer_id        UUID,
  rating          INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
