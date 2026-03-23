-- ============================================================================
-- Wavult PSP Router v1
-- Intelligent routing + availability tracking + cost optimization
-- Inspirerad av Hyperswitch routing-logik
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PSP_AVAILABILITY — Track PSP health i realtid
-- ============================================================================
CREATE TABLE IF NOT EXISTS psp_availability (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  psp             TEXT    NOT NULL,
  org_id          UUID    NOT NULL,
  is_healthy      BOOLEAN NOT NULL DEFAULT true,
  success_rate    NUMERIC(5,2) DEFAULT 100.00,  -- % success senaste 100 calls
  avg_latency_ms  INT DEFAULT 0,
  last_check_at   TIMESTAMPTZ DEFAULT now(),
  last_failure_at TIMESTAMPTZ,
  failure_reason  TEXT,
  consecutive_failures INT DEFAULT 0,
  -- Circuit breaker state
  circuit_state   TEXT NOT NULL DEFAULT 'CLOSED' CHECK (circuit_state IN ('CLOSED','OPEN','HALF_OPEN')),
  circuit_opened_at TIMESTAMPTZ,
  UNIQUE(psp, org_id)
);

-- Seed: Revolut healthy för alla Wavult-orgs
INSERT INTO psp_availability (psp, org_id, is_healthy, circuit_state) VALUES
  ('revolut', 'a1000000-0000-0000-0000-000000000001', true, 'CLOSED'),
  ('revolut', 'a1000000-0000-0000-0000-000000000002', true, 'CLOSED'),
  ('revolut', 'a1000000-0000-0000-0000-000000000003', true, 'CLOSED'),
  ('stripe',  'a1000000-0000-0000-0000-000000000001', true, 'CLOSED'),
  ('stripe',  'a1000000-0000-0000-0000-000000000002', true, 'CLOSED'),
  ('stripe',  'a1000000-0000-0000-0000-000000000003', true, 'CLOSED')
ON CONFLICT (psp, org_id) DO NOTHING;

-- ============================================================================
-- 2. PSP_COSTS — Kostnad per PSP per valuta (för cost-optimized routing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS psp_costs (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  psp               TEXT    NOT NULL,
  currency          TEXT    NOT NULL,
  -- Kostnad i basis-punkter (1 bp = 0.01%)
  percentage_bp     INT     NOT NULL DEFAULT 0,   -- t.ex. 140 = 1.40%
  fixed_minor       INT     NOT NULL DEFAULT 0,   -- fast avgift i minor units
  fx_markup_bp      INT     NOT NULL DEFAULT 0,   -- FX-påslag
  effective_from    DATE    NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  UNIQUE(psp, currency, effective_from)
);

-- Seed: ungefärliga kostnader (Revolut Merchant)
INSERT INTO psp_costs (psp, currency, percentage_bp, fixed_minor, fx_markup_bp, notes) VALUES
  ('revolut', 'EUR', 100,  25, 0,   '1.0% + €0.25 (EU cards)'),
  ('revolut', 'USD', 125,  25, 50,  '1.25% + $0.25 + 0.5% FX'),
  ('revolut', 'AED', 200,  100, 100, '2.0% + AED 1.00 + 1% FX'),
  ('revolut', 'GBP', 100,  20, 0,   '1.0% + £0.20'),
  ('stripe',  'EUR', 140,  25, 0,   '1.4% + €0.25'),
  ('stripe',  'USD', 150,  30, 0,   '1.5% + $0.30'),
  ('stripe',  'AED', 290,  100, 150, '2.9% + AED 1.00 + 1.5% FX'),
  ('stripe',  'GBP', 140,  20, 0,   '1.4% + £0.20')
ON CONFLICT (psp, currency, effective_from) DO NOTHING;

-- ============================================================================
-- 3. ROUTING_RULES — Konfigurerbara routing-regler per org
-- ============================================================================
CREATE TABLE IF NOT EXISTS routing_rules (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID    NOT NULL,
  name            TEXT    NOT NULL,
  priority        INT     NOT NULL DEFAULT 100,  -- lägre = högre prioritet
  is_active       BOOLEAN NOT NULL DEFAULT true,
  -- Villkor (JSONB för flexibilitet)
  conditions      JSONB   NOT NULL DEFAULT '{}',
  -- Åtgärd
  action          TEXT    NOT NULL CHECK (action IN (
                    'ROUTE_TO_PSP','BLOCK','REQUIRE_3DS','FLAG_FOR_REVIEW'
                  )),
  target_psp      TEXT,   -- om action = ROUTE_TO_PSP
  -- Metadata
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, name)
);

-- Seed: grundregler för Wavult
INSERT INTO routing_rules (org_id, name, priority, conditions, action, target_psp, description) VALUES
  -- Holding: AED alltid Revolut
  ('a1000000-0000-0000-0000-000000000001', 'AED to Revolut', 10,
   '{"currency": "AED"}', 'ROUTE_TO_PSP', 'revolut', 'AED-betalningar via Revolut'),
  -- Tech LLC: USD default Revolut
  ('a1000000-0000-0000-0000-000000000002', 'USD default', 50,
   '{"currency": "USD"}', 'ROUTE_TO_PSP', 'revolut', 'USD via Revolut'),
  -- Intel UAB: EUR default Revolut (lägst kostnad)
  ('a1000000-0000-0000-0000-000000000003', 'EUR default', 50,
   '{"currency": "EUR"}', 'ROUTE_TO_PSP', 'revolut', 'EUR via Revolut'),
  -- Stora belopp (>10000 USD) → manuell review
  ('a1000000-0000-0000-0000-000000000002', 'Large amount review', 5,
   '{"currency": "USD", "amount_min_minor": 1000000}', 'FLAG_FOR_REVIEW', NULL, 'Belopp >$10k kräver review')
ON CONFLICT (org_id, name) DO NOTHING;

-- ============================================================================
-- 4. ROUTING_DECISIONS — Logg över routing-beslut (för analys)
-- ============================================================================
CREATE TABLE IF NOT EXISTS routing_decisions (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID    REFERENCES payment_intents(id),
  org_id          UUID    NOT NULL,
  selected_psp    TEXT    NOT NULL,
  fallback_psps   TEXT[]  DEFAULT '{}',
  decision_reason TEXT    NOT NULL,  -- 'rule_match','cost_optimized','fallback','default'
  rule_id         UUID    REFERENCES routing_rules(id),
  estimated_cost_minor BIGINT,       -- estimerad kostnad i minor units
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. PSP_RETRY_LOG — Retry-historik per betalning
-- ============================================================================
CREATE TABLE IF NOT EXISTS psp_retry_log (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID    NOT NULL REFERENCES payment_intents(id),
  attempt_number  INT     NOT NULL,
  psp             TEXT    NOT NULL,
  success         BOOLEAN NOT NULL,
  error_code      TEXT,
  error_message   TEXT,
  latency_ms      INT,
  attempted_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 6. FUNCTION: Beräkna PSP-kostnad för ett belopp
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_psp_cost(
  p_psp       TEXT,
  p_currency  TEXT,
  p_amount_minor BIGINT
)
RETURNS BIGINT
LANGUAGE SQL STABLE AS $$
  SELECT COALESCE(
    ROUND(
      p_amount_minor * (pc.percentage_bp::NUMERIC / 10000.0) + pc.fixed_minor
    )::BIGINT,
    0
  )
  FROM psp_costs pc
  WHERE pc.psp = p_psp
    AND pc.currency = p_currency
    AND pc.effective_from <= CURRENT_DATE
  ORDER BY pc.effective_from DESC
  LIMIT 1
$$;

-- ============================================================================
-- 7. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_psp_availability_psp_org   ON psp_availability(psp, org_id);
CREATE INDEX IF NOT EXISTS idx_psp_availability_healthy   ON psp_availability(is_healthy, circuit_state);
CREATE INDEX IF NOT EXISTS idx_routing_rules_org_priority ON routing_rules(org_id, priority) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_routing_decisions_payment  ON routing_decisions(payment_id);
CREATE INDEX IF NOT EXISTS idx_routing_decisions_org      ON routing_decisions(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_psp_retry_log_payment      ON psp_retry_log(payment_id);

-- ============================================================================
-- 8. RLS
-- ============================================================================
ALTER TABLE psp_availability   ENABLE ROW LEVEL SECURITY;
ALTER TABLE psp_costs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_rules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_decisions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE psp_retry_log      ENABLE ROW LEVEL SECURITY;

CREATE POLICY psp_avail_service   ON psp_availability  FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY psp_costs_read      ON psp_costs         FOR SELECT USING (true);
CREATE POLICY routing_rules_org   ON routing_rules     FOR SELECT USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);
CREATE POLICY routing_rules_svc   ON routing_rules     FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY routing_dec_org     ON routing_decisions FOR SELECT USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);
CREATE POLICY routing_dec_svc     ON routing_decisions FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY retry_log_svc       ON psp_retry_log     FOR ALL USING (current_setting('role', TRUE) = 'service_role');

COMMIT;
