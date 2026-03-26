-- ============================================================================
-- QuixZoom — Creative Intelligence System (CIS)
-- File: 44_quixzoom_cis.sql
-- Depends: 43_quixzoom_ir.sql
--
-- Photo Packages, Value Scoring, Marketplace, Demand Signals
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PACKAGE TEMPLATES (what kinds of packages exist)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_package_templates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT        NOT NULL UNIQUE,
  title           TEXT        NOT NULL,
  description     TEXT,
  category        TEXT        NOT NULL,
  icon            TEXT,          -- emoji or icon key

  -- What to capture
  target_objects   TEXT[]      NOT NULL DEFAULT '{}',  -- facade, window, signage, parking
  analysis_types   TEXT[]      NOT NULL DEFAULT '{}',  -- cleanliness, wear, occupancy, activity
  min_images       INTEGER     NOT NULL DEFAULT 5,
  max_images       INTEGER     NOT NULL DEFAULT 50,
  capture_frequency TEXT       DEFAULT 'once',         -- once, daily, weekly, monthly

  -- Who buys this
  buyer_segments   TEXT[]      DEFAULT '{}',  -- window_cleaner, painter, retail_analytics, municipality
  buyer_description TEXT,

  -- Pricing defaults
  base_payout_per_image  NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  suggested_ir_price     NUMERIC(10,2),
  value_multiplier       NUMERIC(4,2) DEFAULT 1.00,

  active          BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO qz_package_templates (slug, title, description, category, target_objects, analysis_types, min_images, max_images, capture_frequency, buyer_segments, buyer_description, base_payout_per_image, suggested_ir_price, value_multiplier)
VALUES
  ('storefront-survey',
   'Skyltfönster Survey',
   'Fotografera butikers skyltfönster — renhet, exponering, aktivitet',
   'retail',
   ARRAY['storefront','window','signage'],
   ARRAY['cleanliness','exposure','activity','brand_visibility'],
   10, 30, 'weekly',
   ARRAY['window_cleaner','retail_analytics','advertising_agency'],
   'Fönsterputsare, retail analytics-bolag, reklambyråer',
   8.00, 299.00, 1.20),

  ('facade-condition',
   'Fasadkontroll',
   'Dokumentera fasaders skick — slitage, mögel, sprickor',
   'property',
   ARRAY['facade','wall','roof_edge'],
   ARRAY['wear','mold_risk','cracks','paint_condition'],
   15, 50, 'monthly',
   ARRAY['painter','property_manager','renovation_company'],
   'Målerifirmor, fastighetsförvaltare, renoveringsfirmor',
   9.00, 499.00, 1.40),

  ('wooden-facade-audit',
   'Träfasad-audit',
   'Villor och trähus — slitage, målningsbehov, mögelrisk',
   'property',
   ARRAY['facade','wood_surface','trim'],
   ARRAY['wear','mold_risk','paint_condition','wood_rot'],
   20, 60, 'monthly',
   ARRAY['painter','carpenter','insurance'],
   'Målerifirmor, snickare, försäkringsbolag',
   10.00, 699.00, 1.60),

  ('parking-occupancy',
   'Parkeringsanalys',
   'Parkeringsplatser — beläggning, bilskick, typ',
   'infrastructure',
   ARRAY['parking_lot','vehicle','parking_sign'],
   ARRAY['occupancy','vehicle_condition','availability'],
   10, 40, 'daily',
   ARRAY['municipality','parking_company','urban_planner'],
   'Kommuner, parkeringsbolag, stadsplanerare',
   6.00, 399.00, 1.10),

  ('signage-inventory',
   'Skyltinventering',
   'Kartlägg skyltar — typ, skick, synlighet',
   'commercial',
   ARRAY['signage','business_sign','digital_display'],
   ARRAY['visibility','condition','illumination','brand_presence'],
   10, 30, 'once',
   ARRAY['sign_company','advertising_agency','brand_owner'],
   'Skyltföretag, reklambyråer, varumärkesägare',
   7.00, 249.00, 1.00),

  ('construction-progress',
   'Byggdokumentation',
   'Dokumentera byggarbetsplatser — framsteg, säkerhet',
   'construction',
   ARRAY['building_site','scaffolding','machinery','safety_equipment'],
   ARRAY['progress','safety_compliance','material_status'],
   20, 100, 'daily',
   ARRAY['construction_company','insurance','inspector'],
   'Byggföretag, försäkringsbolag, besiktningsfirmor',
   12.00, 999.00, 1.80)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. PHOTO PACKAGES (generated instances for creators)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_photo_packages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID        REFERENCES qz_package_templates(id),
  title           TEXT        NOT NULL,
  description     TEXT,

  -- Location
  latitude        NUMERIC(10,7) NOT NULL,
  longitude       NUMERIC(10,7) NOT NULL,
  radius_meters   INTEGER     NOT NULL DEFAULT 500,
  area_name       TEXT,
  city            TEXT,
  country         TEXT        DEFAULT 'SE',
  bounding_box    JSONB,

  -- Package specs
  target_count    INTEGER     NOT NULL,       -- how many items to capture
  required_images INTEGER     NOT NULL,       -- total images needed
  category        TEXT        NOT NULL,
  target_objects  TEXT[]      DEFAULT '{}',
  analysis_types  TEXT[]      DEFAULT '{}',

  -- Value scoring (the VDE output)
  demand_score    NUMERIC(5,2) NOT NULL DEFAULT 50,  -- 0-100
  scarcity_score  NUMERIC(5,2) NOT NULL DEFAULT 50,  -- 0-100
  accuracy_need   NUMERIC(5,2) NOT NULL DEFAULT 50,  -- 0-100
  freshness_need  NUMERIC(5,2) NOT NULL DEFAULT 50,  -- 0-100
  value_score     NUMERIC(5,2) GENERATED ALWAYS AS (
                    (demand_score * 0.35 + scarcity_score * 0.25 +
                     accuracy_need * 0.20 + freshness_need * 0.20)
                  ) STORED,

  -- Payout
  total_payout    NUMERIC(10,2) NOT NULL,
  payout_per_image NUMERIC(10,2) NOT NULL,
  currency        TEXT        NOT NULL DEFAULT 'SEK',

  -- State
  status          TEXT        NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available','claimed','in_progress','submitted','completed','expired')),
  priority        INTEGER     NOT NULL DEFAULT 0,
  tier            INTEGER     NOT NULL DEFAULT 1,

  -- Source
  source          TEXT        NOT NULL DEFAULT 'vde'
                    CHECK (source IN ('vde','demand','manual','ai_gap','recurring')),
  demand_query_id UUID,
  parent_ir_id    UUID        REFERENCES qz_intelligence_repos(id),  -- if filling an IR gap

  -- Assignment
  assigned_to     UUID        REFERENCES qz_users(id),
  assigned_at     TIMESTAMPTZ,
  deadline        TIMESTAMPTZ,

  -- Metadata
  buyer_segments  TEXT[]      DEFAULT '{}',
  metadata        JSONB       DEFAULT '{}',
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qz_packages_status ON qz_photo_packages(status);
CREATE INDEX IF NOT EXISTS idx_qz_packages_geo ON qz_photo_packages(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_qz_packages_value ON qz_photo_packages(value_score DESC);
CREATE INDEX IF NOT EXISTS idx_qz_packages_area ON qz_photo_packages(area_name, city);
CREATE INDEX IF NOT EXISTS idx_qz_packages_assigned ON qz_photo_packages(assigned_to);

-- ============================================================================
-- 3. PACKAGE CAPTURES (images within a package)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_package_captures (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id      UUID        NOT NULL REFERENCES qz_photo_packages(id),
  image_id        UUID        NOT NULL REFERENCES qz_images(id),
  sequence_num    INTEGER     NOT NULL,
  target_object   TEXT,        -- what was this image supposed to capture
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  ai_match_score  NUMERIC(5,2),  -- how well it matches requirements
  status          TEXT        NOT NULL DEFAULT 'captured'
                    CHECK (status IN ('captured','analyzing','approved','rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qz_pcaptures_pkg ON qz_package_captures(package_id);

-- ============================================================================
-- 4. DEMAND SIGNALS (aggregated demand intelligence)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_demand_signals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category        TEXT        NOT NULL,
  area_name       TEXT,
  city            TEXT,
  country         TEXT        DEFAULT 'SE',
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),

  -- Signal sources
  search_count    INTEGER     NOT NULL DEFAULT 0,
  ir_purchase_count INTEGER   NOT NULL DEFAULT 0,
  query_count     INTEGER     NOT NULL DEFAULT 0,
  external_signal_count INTEGER DEFAULT 0,

  -- Computed
  demand_score    NUMERIC(5,2) GENERATED ALWAYS AS (
                    LEAST(100, (
                      search_count * 2.0 +
                      ir_purchase_count * 10.0 +
                      query_count * 3.0 +
                      external_signal_count * 5.0
                    ))
                  ) STORED,

  -- Data availability
  existing_images INTEGER     DEFAULT 0,
  last_capture_at TIMESTAMPTZ,
  scarcity_score  NUMERIC(5,2) DEFAULT 50,

  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category, area_name, city)
);

CREATE INDEX IF NOT EXISTS idx_qz_demand_sig_score ON qz_demand_signals(demand_score DESC);
CREATE INDEX IF NOT EXISTS idx_qz_demand_sig_area ON qz_demand_signals(area_name, city);

-- ============================================================================
-- 5. MARKETPLACE LISTINGS (published data products)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_marketplace_listings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ir_id           UUID        NOT NULL REFERENCES qz_intelligence_repos(id),
  seller_id       UUID        NOT NULL REFERENCES qz_users(id),

  -- Display
  title           TEXT        NOT NULL,
  headline        TEXT,        -- short pitch
  description     TEXT,
  cover_image_key TEXT,
  preview_images  JSONB       DEFAULT '[]',

  -- Classification
  category        TEXT        NOT NULL,
  tags            TEXT[]      DEFAULT '{}',
  buyer_segments  TEXT[]      DEFAULT '{}',
  area_name       TEXT,
  city            TEXT,
  country         TEXT,

  -- Data metrics (shown to buyers)
  data_points     INTEGER     NOT NULL DEFAULT 0,
  image_count     INTEGER     NOT NULL DEFAULT 0,
  avg_quality     NUMERIC(5,2) DEFAULT 0,
  coverage_pct    NUMERIC(5,2) DEFAULT 0,
  freshness_days  INTEGER,     -- how old is the newest data

  -- Pricing
  price_type      TEXT        NOT NULL DEFAULT 'one_time'
                    CHECK (price_type IN ('free','one_time','subscription','lead_based')),
  price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  subscription_monthly NUMERIC(10,2),
  price_per_lead  NUMERIC(10,2),   -- for lead_based pricing

  -- Lead generation
  total_leads     INTEGER     NOT NULL DEFAULT 0,
  avg_lead_score  NUMERIC(5,2) DEFAULT 0,

  -- Stats
  view_count      INTEGER     NOT NULL DEFAULT 0,
  purchase_count  INTEGER     NOT NULL DEFAULT 0,
  total_revenue   NUMERIC(14,2) NOT NULL DEFAULT 0,
  avg_rating      NUMERIC(3,2) DEFAULT 0,
  review_count    INTEGER     NOT NULL DEFAULT 0,

  -- Ranking
  featured        BOOLEAN     NOT NULL DEFAULT false,
  rank_score      NUMERIC(8,2) DEFAULT 0,  -- for search ranking

  status          TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('draft','active','paused','archived')),
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qz_mpl_status ON qz_marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_qz_mpl_category ON qz_marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_qz_mpl_area ON qz_marketplace_listings(area_name, city);
CREATE INDEX IF NOT EXISTS idx_qz_mpl_rank ON qz_marketplace_listings(rank_score DESC);
CREATE INDEX IF NOT EXISTS idx_qz_mpl_seller ON qz_marketplace_listings(seller_id);

-- ============================================================================
-- 6. MARKETPLACE LEADS (extracted leads from IR data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_marketplace_leads (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID        NOT NULL REFERENCES qz_marketplace_listings(id),
  ir_item_id      UUID        REFERENCES qz_ir_items(id),

  -- Lead data
  business_name   TEXT,
  address         TEXT,
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  category        TEXT,

  -- Scoring
  lead_score      NUMERIC(5,2) NOT NULL,
  urgency         TEXT        CHECK (urgency IN ('low','medium','high','critical')),
  recommended_services TEXT[]  DEFAULT '{}',

  -- AI analysis
  condition       TEXT,
  condition_details JSONB     DEFAULT '{}',
  opportunity_value NUMERIC(10,2),  -- estimated contract value for buyer

  -- Buyer interaction
  viewed_by       UUID[],
  contacted       BOOLEAN     NOT NULL DEFAULT false,
  converted       BOOLEAN     NOT NULL DEFAULT false,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qz_leads_listing ON qz_marketplace_leads(listing_id);
CREATE INDEX IF NOT EXISTS idx_qz_leads_score ON qz_marketplace_leads(lead_score DESC);

-- ============================================================================
-- 7. BUYER PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_buyers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT        NOT NULL UNIQUE,
  company_name    TEXT,
  industry        TEXT,
  segments        TEXT[]      DEFAULT '{}',   -- what they buy
  regions         TEXT[]      DEFAULT '{}',   -- where they operate
  budget_monthly  NUMERIC(10,2),
  status          TEXT        NOT NULL DEFAULT 'active',
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8. BUYER PURCHASES (marketplace transactions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_buyer_purchases (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id        UUID        NOT NULL REFERENCES qz_buyers(id),
  listing_id      UUID        NOT NULL REFERENCES qz_marketplace_listings(id),
  ir_id           UUID        NOT NULL REFERENCES qz_intelligence_repos(id),

  -- Payment
  amount          NUMERIC(10,2) NOT NULL,
  currency        TEXT        NOT NULL DEFAULT 'SEK',
  payment_type    TEXT        NOT NULL CHECK (payment_type IN ('one_time','subscription','lead')),
  creator_payout  NUMERIC(10,2) NOT NULL,
  platform_fee    NUMERIC(10,2) NOT NULL,
  transaction_id  UUID        REFERENCES qx_transactions(id),

  -- Access
  access_granted  BOOLEAN     NOT NULL DEFAULT true,
  access_until    TIMESTAMPTZ,
  leads_included  INTEGER,

  status          TEXT        NOT NULL DEFAULT 'completed',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qz_bpurch_buyer ON qz_buyer_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_qz_bpurch_listing ON qz_buyer_purchases(listing_id);

COMMIT;
