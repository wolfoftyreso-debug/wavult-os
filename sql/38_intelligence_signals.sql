-- ─── Wavult OS — Intelligence Dashboard Schema ───────────────────────────────
-- Signal-driven intelligence: omvärld, konkurrens, SEO, marknad.
-- Semrush-data normaliseras till intelligence_signals.
-- Cache respekterar Semrush TOS: max 30 dagars lagring.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── intelligence_signals ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS intelligence_signals (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              timestamptz NOT NULL DEFAULT now(),
  detected_at             timestamptz NOT NULL DEFAULT now(),

  -- Source
  source                  text NOT NULL DEFAULT 'manual', -- 'semrush'|'manual'|'agent'|'rss'|'webhook'
  source_url              text,
  source_credibility      numeric(3,2) DEFAULT 0.75,

  -- Classification
  category                text NOT NULL DEFAULT 'market', -- 'competitor'|'regulatory'|'technology'|'market'|'macro'|'seo'
  subcategory             text,
  affects                 text[] NOT NULL DEFAULT '{}',   -- ['quixzoom','landvex',...]

  -- Content
  title                   text NOT NULL,
  summary                 text,
  raw_content             jsonb,

  -- Scoring (input)
  relevance_score         numeric(3,2) NOT NULL DEFAULT 0.50 CHECK (relevance_score BETWEEN 0 AND 1),
  impact_score            numeric(3,2) NOT NULL DEFAULT 0.50 CHECK (impact_score BETWEEN 0 AND 1),
  probability_score       numeric(3,2) NOT NULL DEFAULT 0.50 CHECK (probability_score BETWEEN 0 AND 1),
  urgency                 text NOT NULL DEFAULT '90d' CHECK (urgency IN ('immediate','30d','90d','strategic')),
  sentiment               text DEFAULT 'neutral' CHECK (sentiment IN ('positive','negative','neutral')),

  -- Priority (computed)
  -- RIPU: relevance×0.30 + impact×0.35 + probability×0.20 + urgency_weight×0.15
  priority_score          numeric(3,2) GENERATED ALWAYS AS (
    LEAST(1.0,
      relevance_score   * 0.30 +
      impact_score      * 0.35 +
      probability_score * 0.20 +
      CASE urgency
        WHEN 'immediate' THEN 1.0
        WHEN '30d'       THEN 0.7
        WHEN '90d'       THEN 0.4
        ELSE             0.2
      END * 0.15
    )
  ) STORED,

  priority_tier           text GENERATED ALWAYS AS (
    CASE
      WHEN LEAST(1.0,
        relevance_score * 0.30 + impact_score * 0.35 + probability_score * 0.20 +
        CASE urgency
          WHEN 'immediate' THEN 1.0 WHEN '30d' THEN 0.7 WHEN '90d' THEN 0.4 ELSE 0.2
        END * 0.15) > 0.85 THEN 'P0'
      WHEN LEAST(1.0,
        relevance_score * 0.30 + impact_score * 0.35 + probability_score * 0.20 +
        CASE urgency
          WHEN 'immediate' THEN 1.0 WHEN '30d' THEN 0.7 WHEN '90d' THEN 0.4 ELSE 0.2
        END * 0.15) > 0.65 THEN 'P1'
      WHEN LEAST(1.0,
        relevance_score * 0.30 + impact_score * 0.35 + probability_score * 0.20 +
        CASE urgency
          WHEN 'immediate' THEN 1.0 WHEN '30d' THEN 0.7 WHEN '90d' THEN 0.4 ELSE 0.2
        END * 0.15) > 0.40 THEN 'P2'
      ELSE 'P3'
    END
  ) STORED,

  -- Wavult context
  impact_type             text DEFAULT 'neutral' CHECK (impact_type IN ('opportunity','threat','regulatory','neutral')),
  affected_products       text[] DEFAULT '{}',

  -- Recommendation (auto or manual)
  recommendation_action   text,
  recommendation_owner    text,
  recommendation_deadline date,
  recommendation_rationale text,
  recommendation_confidence numeric(3,2),

  -- Wavult OS integration
  pushed_to_os            boolean DEFAULT false,
  os_task_id              text,
  os_pushed_at            timestamptz,

  -- Lifecycle
  status                  text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','actioned','dismissed','monitoring')),
  dismissed_reason        text,
  outcome                 text,
  outcome_at              date,

  -- Semrush-specific (null for non-SEO signals)
  semrush_domain          text,
  semrush_keyword         text,
  semrush_market          text,
  semrush_metric_name     text,
  semrush_metric_value    text,
  semrush_entity_type     text
);

-- ─── intelligence_semrush_cache ───────────────────────────────────────────────
-- Semrush TOS: max 30 days cache without explicit consent

CREATE TABLE IF NOT EXISTS intelligence_semrush_cache (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain      text NOT NULL,
  endpoint    text NOT NULL,   -- 'domain_overview'|'organic_keywords'|'competitors'|'backlinks'|'keyword_gap'
  market      text NOT NULL DEFAULT 'se',
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  data        jsonb NOT NULL,
  CONSTRAINT semrush_cache_max_30d CHECK (expires_at <= fetched_at + interval '30 days'),
  UNIQUE (domain, endpoint, market)
);

-- Auto-delete expired cache entries
CREATE OR REPLACE FUNCTION cleanup_semrush_cache()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM intelligence_semrush_cache WHERE expires_at < now();
$$;

-- ─── intelligence_market_radar ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS intelligence_market_radar (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date                    date NOT NULL UNIQUE,
  portfolio               jsonb DEFAULT '{}',
  top_signal_ids          uuid[] DEFAULT '{}',
  active_recommendations  int DEFAULT 0,
  p0_count                int DEFAULT 0,
  p1_count                int DEFAULT 0,
  market_sentiment        text DEFAULT 'neutral' CHECK (market_sentiment IN ('positive','negative','neutral')),
  notes                   text,
  created_at              timestamptz DEFAULT now()
);

-- ─── intelligence_competitors ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS intelligence_competitors (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text NOT NULL,
  domain                  text NOT NULL UNIQUE,
  competes_with           text[] DEFAULT '{}',
  tier                    text DEFAULT 'direct' CHECK (tier IN ('direct','adjacent','potential')),
  last_signal_at          timestamptz,
  signal_count_30d        int DEFAULT 0,
  threat_level            text DEFAULT 'low' CHECK (threat_level IN ('low','medium','high','critical')),
  watch_points            text[] DEFAULT '{}',
  -- Semrush metrics (updated on audit)
  semrush_last_audit      timestamptz,
  semrush_organic_traffic int,
  semrush_organic_keywords int,
  semrush_authority_score int,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_intel_signals_priority     ON intelligence_signals (priority_tier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intel_signals_status       ON intelligence_signals (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intel_signals_source       ON intelligence_signals (source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intel_signals_affects      ON intelligence_signals USING GIN (affects);
CREATE INDEX IF NOT EXISTS idx_intel_signals_products     ON intelligence_signals USING GIN (affected_products);
CREATE INDEX IF NOT EXISTS idx_intel_signals_semrush_dom  ON intelligence_signals (semrush_domain) WHERE semrush_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_semrush_cache_domain       ON intelligence_semrush_cache (domain, endpoint, market);
CREATE INDEX IF NOT EXISTS idx_semrush_cache_expires      ON intelligence_semrush_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_radar_date                 ON intelligence_market_radar (date DESC);
CREATE INDEX IF NOT EXISTS idx_competitors_threat         ON intelligence_competitors (threat_level, domain);

-- ─── Views ────────────────────────────────────────────────────────────────────

-- Active dashboard view (new + priority)
CREATE OR REPLACE VIEW intelligence_active AS
SELECT
  id, created_at, source, category, title, summary,
  priority_tier, priority_score, urgency, sentiment, impact_type,
  affects, recommendation_action, recommendation_owner, recommendation_deadline,
  status, semrush_domain, semrush_keyword, semrush_metric_name, semrush_metric_value
FROM intelligence_signals
WHERE status IN ('new', 'monitoring')
ORDER BY priority_score DESC, created_at DESC;

-- Weekly signal summary
CREATE OR REPLACE VIEW intelligence_weekly_summary AS
SELECT
  DATE_TRUNC('week', created_at)::date AS week,
  COUNT(*) AS total_signals,
  COUNT(*) FILTER (WHERE priority_tier = 'P0') AS p0_count,
  COUNT(*) FILTER (WHERE priority_tier = 'P1') AS p1_count,
  COUNT(*) FILTER (WHERE source = 'semrush')   AS semrush_count,
  COUNT(*) FILTER (WHERE status = 'actioned')  AS actioned_count,
  COUNT(*) FILTER (WHERE status = 'dismissed') AS dismissed_count,
  ROUND(AVG(priority_score)::numeric, 2)       AS avg_priority_score
FROM intelligence_signals
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE intelligence_signals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_semrush_cache    ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_market_radar     ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_competitors      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intel_signals_read"     ON intelligence_signals          FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "intel_signals_write"    ON intelligence_signals          FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "intel_signals_update"   ON intelligence_signals          FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "semrush_cache_all"      ON intelligence_semrush_cache    FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "radar_all"              ON intelligence_market_radar      FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "competitors_all"        ON intelligence_competitors        FOR ALL    USING (auth.role() = 'authenticated');

-- ─── Seed competitors ─────────────────────────────────────────────────────────

INSERT INTO intelligence_competitors (name, domain, competes_with, tier, watch_points, threat_level) VALUES
  ('Mapillary',           'mapillary.com',            ARRAY['quixzoom'],             'direct',    ARRAY['feature_releases','funding','partnerships','hiring'], 'medium'),
  ('KartaView',           'kartaview.org',             ARRAY['quixzoom'],             'direct',    ARRAY['feature_releases','api_changes'],                    'low'),
  ('Bentley Systems',     'bentley.com',               ARRAY['landvex'],              'direct',    ARRAY['pricing','enterprise_wins','api_partnerships'],      'medium'),
  ('Trimble',             'trimble.com',               ARRAY['landvex'],              'direct',    ARRAY['pricing','partnerships','hiring'],                   'low'),
  ('CGM',                 'cgm.com',                   ARRAY['mlcs'],                 'direct',    ARRAY['certifications','procurement','partnerships'],       'medium'),
  ('TietoEvry',           'tietoevry.com',             ARRAY['mlcs','wavult_os'],     'direct',    ARRAY['procurement','partnerships','pricing'],              'medium'),
  ('Plaid',               'plaid.com',                 ARRAY['uapix','apifly'],       'adjacent',  ARRAY['nordic_expansion','pricing','developer_adoption'],   'low'),
  ('Nordic API Gateway',  'nordicapigateway.com',      ARRAY['uapix','apifly'],       'direct',    ARRAY['feature_releases','pricing','partnerships'],         'medium'),
  ('Palantir',            'palantir.com',              ARRAY['dissg'],                'adjacent',  ARRAY['government_contracts','pricing','hiring'],           'low'),
  ('Recorded Future',     'recordedfuture.com',        ARRAY['dissg'],                'adjacent',  ARRAY['government_contracts','partnerships'],               'low')
ON CONFLICT (domain) DO NOTHING;
