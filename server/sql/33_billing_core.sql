-- ============================================================================
-- Wavult Billing Core v1
-- Usage-based billing för quiXzoom / Optic Insights
-- Integrerar med Lago och Ledger Core
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. BILLING_CUSTOMERS — Speglar Lago-kunder i vår databas
-- ============================================================================
CREATE TABLE IF NOT EXISTS billing_customers (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID    NOT NULL,
  external_id       TEXT    NOT NULL,   -- vår interna ID som skickas till Lago
  lago_customer_id  TEXT,               -- Lago:s UUID (sätts efter sync)
  name              TEXT    NOT NULL,
  email             TEXT,
  currency          TEXT    NOT NULL DEFAULT 'EUR',
  billing_entity    TEXT    NOT NULL CHECK (billing_entity IN (
                      'OPTIC_INSIGHTS','QUIXZOOM_ENTERPRISE','DIRECT'
                    )),
  plan_code         TEXT,               -- aktiv Lago-plan
  lago_synced_at    TIMESTAMPTZ,
  metadata          JSONB   DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, external_id)
);

-- ============================================================================
-- 2. BILLING_METRICS — Usage events vi mäter och fakturerar
-- ============================================================================
CREATE TABLE IF NOT EXISTS billing_metrics (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID    NOT NULL,
  code            TEXT    NOT NULL,   -- 'images_delivered', 'missions_completed', 'zone_coverage_km2'
  name            TEXT    NOT NULL,
  aggregation     TEXT    NOT NULL CHECK (aggregation IN (
                    'COUNT','SUM','MAX','UNIQUE_COUNT','LATEST'
                  )),
  unit            TEXT,               -- 'image', 'mission', 'km²'
  lago_metric_id  TEXT,               -- Lago:s UUID
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, code)
);

-- Seed: quiXzoom billing metrics
INSERT INTO billing_metrics (org_id, code, name, aggregation, unit, description) VALUES
  ('a1000000-0000-0000-0000-000000000002', 'images_delivered',     'Images Delivered',      'COUNT', 'image',    'Antal levererade bilder per faktureringsperiod'),
  ('a1000000-0000-0000-0000-000000000002', 'missions_completed',   'Missions Completed',    'COUNT', 'mission',  'Antal genomförda fotouppdrag'),
  ('a1000000-0000-0000-0000-000000000002', 'zone_coverage_km2',    'Zone Coverage',         'SUM',   'km²',      'Täckt yta i km² per period'),
  ('a1000000-0000-0000-0000-000000000002', 'ai_analyses',          'AI Analyses Run',       'COUNT', 'analysis', 'Antal AI-analyser körda på bilddata'),
  ('a1000000-0000-0000-0000-000000000003', 'intelligence_reports', 'Intelligence Reports',  'COUNT', 'report',   'Antal intelligence-rapporter levererade'),
  ('a1000000-0000-0000-0000-000000000003', 'api_calls',            'API Calls',             'COUNT', 'call',     'Antal API-anrop till Optic Insights')
ON CONFLICT (org_id, code) DO NOTHING;

-- ============================================================================
-- 3. USAGE_EVENTS — Raw events (buffras innan Lago-sync)
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_events (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID    NOT NULL,
  customer_id       TEXT    NOT NULL,   -- external_id i billing_customers
  metric_code       TEXT    NOT NULL,
  -- Belopp (SUM-aggregation) eller 1 (COUNT)
  quantity          NUMERIC NOT NULL DEFAULT 1,
  properties        JSONB   DEFAULT '{}',
  -- Lago-status
  lago_event_id     TEXT    UNIQUE,     -- sätts när sync är klar
  lago_synced_at    TIMESTAMPTZ,
  lago_error        TEXT,
  -- Idempotency
  idempotency_key   TEXT    UNIQUE,
  -- Timestamps
  event_timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. INVOICES — Speglar Lago-fakturor i vår databas
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID    NOT NULL,
  customer_id       UUID    REFERENCES billing_customers(id),
  lago_invoice_id   TEXT    UNIQUE,
  invoice_number    TEXT,
  status            TEXT    NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
                      'DRAFT','FINALIZED','VOIDED','PAID','OVERDUE'
                    )),
  -- Belopp
  amount_minor      BIGINT  NOT NULL DEFAULT 0,
  tax_minor         BIGINT  NOT NULL DEFAULT 0,
  total_minor       BIGINT  NOT NULL DEFAULT 0,
  currency          TEXT    NOT NULL,
  -- Perioder
  issuing_date      DATE,
  payment_due_date  DATE,
  -- Koppling till Ledger
  journal_entry_id  UUID,   -- sätts när fakturan bokförs i Ledger Core
  -- Metadata
  lago_payload      JSONB   DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. BILLING_PLANS — Prisnivåer (synkroniseras med Lago)
-- ============================================================================
CREATE TABLE IF NOT EXISTS billing_plans (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID    NOT NULL,
  code            TEXT    NOT NULL,
  name            TEXT    NOT NULL,
  interval        TEXT    NOT NULL CHECK (interval IN ('monthly','yearly','weekly')),
  currency        TEXT    NOT NULL,
  -- Base fee
  base_fee_minor  BIGINT  NOT NULL DEFAULT 0,
  -- Lago-sync
  lago_plan_id    TEXT    UNIQUE,
  lago_synced_at  TIMESTAMPTZ,
  -- Tiers (JSON för flexibilitet)
  charge_tiers    JSONB   DEFAULT '[]',
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, code)
);

-- Seed: grundplaner för quiXzoom B2B
INSERT INTO billing_plans (org_id, code, name, interval, currency, base_fee_minor, charge_tiers, description) VALUES
  ('a1000000-0000-0000-0000-000000000002', 'quixzoom_starter', 'quiXzoom Starter',
   'monthly', 'EUR', 49900,
   '[{"metric": "images_delivered", "unit_price_minor": 15, "free_units": 100}]',
   'Upp till 100 bilder inkl, sedan €0.15/bild'),
  ('a1000000-0000-0000-0000-000000000002', 'quixzoom_growth', 'quiXzoom Growth',
   'monthly', 'EUR', 199900,
   '[{"metric": "images_delivered", "unit_price_minor": 10, "free_units": 1000}, {"metric": "ai_analyses", "unit_price_minor": 50, "free_units": 100}]',
   'Upp till 1000 bilder + 100 AI-analyser inkl'),
  ('a1000000-0000-0000-0000-000000000002', 'quixzoom_enterprise', 'quiXzoom Enterprise',
   'monthly', 'EUR', 999900,
   '[{"metric": "images_delivered", "unit_price_minor": 5, "free_units": 10000}, {"metric": "ai_analyses", "unit_price_minor": 25, "free_units": 1000}, {"metric": "zone_coverage_km2", "unit_price_minor": 100, "free_units": 0}]',
   'Enterprise: volympris, dedikerad support'),
  ('a1000000-0000-0000-0000-000000000003', 'optic_insights_pro', 'Optic Insights Pro',
   'monthly', 'EUR', 299900,
   '[{"metric": "intelligence_reports", "unit_price_minor": 500, "free_units": 10}, {"metric": "api_calls", "unit_price_minor": 1, "free_units": 10000}]',
   'Optic Insights: 10 rapporter + 10k API-calls inkl')
ON CONFLICT (org_id, code) DO NOTHING;

-- ============================================================================
-- 6. INDEXES + RLS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_usage_events_org_customer  ON usage_events(org_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_metric        ON usage_events(metric_code);
CREATE INDEX IF NOT EXISTS idx_usage_events_unsynced      ON usage_events(lago_synced_at) WHERE lago_synced_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_usage_events_timestamp     ON usage_events(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_org               ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status            ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_billing_customers_org      ON billing_customers(org_id);

ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_metrics   ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_plans     ENABLE ROW LEVEL SECURITY;

CREATE POLICY bc_org ON billing_customers FOR ALL USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);
CREATE POLICY bm_org ON billing_metrics   FOR SELECT USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);
CREATE POLICY ue_org ON usage_events      FOR ALL USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);
CREATE POLICY inv_org ON invoices         FOR ALL USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);
CREATE POLICY bp_org ON billing_plans     FOR SELECT USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);
-- Service role override
CREATE POLICY bc_svc ON billing_customers FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY bm_svc ON billing_metrics   FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY ue_svc ON usage_events      FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY inv_svc ON invoices         FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY bp_svc ON billing_plans     FOR ALL USING (current_setting('role', TRUE) = 'service_role');

COMMIT;
