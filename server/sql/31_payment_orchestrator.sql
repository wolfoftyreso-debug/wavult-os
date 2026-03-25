-- ============================================================================
-- Wavult Payment Orchestrator v1
-- PaymentIntents med state machine, PSP routing, reconciliation
-- Kör EFTER 30_ledger_core.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PAYMENT_INTENTS — Hjärtat i orchestratorn
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_intents (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID        NOT NULL,
  -- Belopp alltid i minor units (integer). 100 USD = 10000.
  amount_minor        BIGINT      NOT NULL CHECK (amount_minor > 0),
  currency            TEXT        NOT NULL,
  -- State machine: CREATED → PROCESSING → AUTHORIZED → CAPTURED → SETTLED | FAILED | CANCELLED | REFUNDED
  status              TEXT        NOT NULL DEFAULT 'CREATED' CHECK (status IN (
                        'CREATED','PROCESSING','AUTHORIZED','CAPTURED',
                        'SETTLED','FAILED','CANCELLED','REFUNDED'
                      )),
  -- Referens till Ledger
  ledger_journal_id   UUID,       -- sätts när journalpost skapas
  -- PSP-routing
  psp                 TEXT        CHECK (psp IN ('revolut','stripe','adyen','manual','internal')),
  psp_payment_id      TEXT,       -- PSPs externa ID
  psp_response        JSONB,      -- rå PSP-respons
  -- Metadata
  description         TEXT        NOT NULL,
  reference           TEXT,       -- extern referens (fakturanr etc)
  customer_id         UUID,       -- om kopplat till en kund
  from_account_code   TEXT,       -- kontoplan-kod debet
  to_account_code     TEXT,       -- kontoplan-kod kredit
  -- Idempotency (förhindrar dubbelposter)
  idempotency_key     TEXT        UNIQUE,
  -- Timestamps per state
  authorized_at       TIMESTAMPTZ,
  captured_at         TIMESTAMPTZ,
  settled_at          TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  failure_reason      TEXT,
  -- Retry
  retry_count         INT         NOT NULL DEFAULT 0,
  next_retry_at       TIMESTAMPTZ,
  -- Metadata
  metadata            JSONB       DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. PAYMENT_EVENTS — Oföränderlig händelselogg per PaymentIntent
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_events (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID    NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,
  event_type      TEXT    NOT NULL,  -- 'state_change','psp_response','retry','webhook_sent'
  from_status     TEXT,
  to_status       TEXT,
  payload         JSONB   DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. PSP_CONFIGS — PSP-konfiguration per org
-- ============================================================================
CREATE TABLE IF NOT EXISTS psp_configs (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID    NOT NULL,
  psp             TEXT    NOT NULL CHECK (psp IN ('revolut','stripe','adyen','manual')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  -- Routing-regler (JSONB för flexibilitet)
  routing_rules   JSONB   NOT NULL DEFAULT '{}',
  -- Krypterade credentials (aldrig plaintext i logs)
  credentials_ref TEXT    NOT NULL,  -- referens till secrets manager / credentials.env
  config          JSONB   NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, psp)
);

-- Seed: Revolut som default PSP för alla Wavult-orgs
INSERT INTO psp_configs (org_id, psp, is_active, is_default, credentials_ref, routing_rules, config) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'revolut', true, true, 'REVOLUT_API_KEY_HOLDING',
   '{"currencies": ["AED","USD","EUR"], "max_amount_minor": 100000000}',
   '{"sandbox": true, "base_url": "https://sandbox-merchant.revolut.com"}'),
  ('a1000000-0000-0000-0000-000000000002', 'revolut', true, true, 'REVOLUT_API_KEY_TECH',
   '{"currencies": ["USD","EUR"], "max_amount_minor": 100000000}',
   '{"sandbox": true, "base_url": "https://sandbox-merchant.revolut.com"}'),
  ('a1000000-0000-0000-0000-000000000003', 'revolut', true, true, 'REVOLUT_API_KEY_INTEL',
   '{"currencies": ["EUR","USD"], "max_amount_minor": 100000000}',
   '{"sandbox": true, "base_url": "https://sandbox-merchant.revolut.com"}')
ON CONFLICT (org_id, psp) DO NOTHING;

-- ============================================================================
-- 4. WEBHOOK_DELIVERIES — Utgående webhooks
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID    NOT NULL,
  payment_id      UUID    REFERENCES payment_intents(id),
  event_type      TEXT    NOT NULL,  -- 'payment_succeeded','payment_failed','payment_refunded'
  endpoint_url    TEXT    NOT NULL,
  payload         JSONB   NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'PENDING' CHECK (status IN (
                    'PENDING','DELIVERED','FAILED','ABANDONED'
                  )),
  attempt_count   INT     NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ DEFAULT now(),
  response_status INT,
  response_body   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. RECONCILIATION_RUNS — Stämmer av PSP mot ledger
-- ============================================================================
CREATE TABLE IF NOT EXISTS reconciliation_runs (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID    NOT NULL,
  psp             TEXT    NOT NULL,
  run_date        DATE    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'RUNNING' CHECK (status IN (
                    'RUNNING','COMPLETED','FAILED','PARTIAL'
                  )),
  total_checked   INT     DEFAULT 0,
  matched         INT     DEFAULT 0,
  mismatched      INT     DEFAULT 0,
  missing_in_psp  INT     DEFAULT 0,
  missing_in_ledger INT   DEFAULT 0,
  report          JSONB   DEFAULT '{}',
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  UNIQUE(org_id, psp, run_date)
);

-- ============================================================================
-- 6. FUNCTIONS — State machine transitions
-- ============================================================================

-- Trigger: uppdatera updated_at automatiskt
CREATE OR REPLACE FUNCTION update_payment_intent_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS payment_intents_updated_at ON payment_intents;
CREATE TRIGGER payment_intents_updated_at
  BEFORE UPDATE ON payment_intents
  FOR EACH ROW EXECUTE FUNCTION update_payment_intent_timestamp();

-- Transition: säker state machine (förhindrar ogiltiga övergångar)
CREATE OR REPLACE FUNCTION transition_payment_intent(
  p_id        UUID,
  p_to_status TEXT,
  p_payload   JSONB DEFAULT '{}'
)
RETURNS payment_intents
LANGUAGE plpgsql AS $$
DECLARE
  v_intent  payment_intents;
  v_allowed TEXT[];
BEGIN
  SELECT * INTO v_intent FROM payment_intents WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PaymentIntent % not found', p_id;
  END IF;

  -- Tillåtna övergångar
  v_allowed := CASE v_intent.status
    WHEN 'CREATED'     THEN ARRAY['PROCESSING','CANCELLED']
    WHEN 'PROCESSING'  THEN ARRAY['AUTHORIZED','FAILED','CANCELLED']
    WHEN 'AUTHORIZED'  THEN ARRAY['CAPTURED','CANCELLED']
    WHEN 'CAPTURED'    THEN ARRAY['SETTLED','REFUNDED']
    WHEN 'SETTLED'     THEN ARRAY['REFUNDED']
    ELSE ARRAY[]::TEXT[]
  END;

  IF NOT (p_to_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid transition % → % for PaymentIntent %',
      v_intent.status, p_to_status, p_id;
  END IF;

  -- Uppdatera status + timestamp
  UPDATE payment_intents SET
    status          = p_to_status,
    authorized_at   = CASE WHEN p_to_status = 'AUTHORIZED' THEN now() ELSE authorized_at END,
    captured_at     = CASE WHEN p_to_status = 'CAPTURED'   THEN now() ELSE captured_at END,
    settled_at      = CASE WHEN p_to_status = 'SETTLED'    THEN now() ELSE settled_at END,
    failed_at       = CASE WHEN p_to_status = 'FAILED'     THEN now() ELSE failed_at END,
    cancelled_at    = CASE WHEN p_to_status = 'CANCELLED'  THEN now() ELSE cancelled_at END,
    failure_reason  = COALESCE(p_payload->>'failure_reason', failure_reason),
    psp_payment_id  = COALESCE(p_payload->>'psp_payment_id', psp_payment_id),
    psp_response    = COALESCE(p_payload->'psp_response', psp_response)
  WHERE id = p_id
  RETURNING * INTO v_intent;

  -- Logga händelsen
  INSERT INTO payment_events (payment_id, event_type, from_status, to_status, payload)
  VALUES (p_id, 'state_change', v_intent.status, p_to_status, p_payload);

  RETURN v_intent;
END $$;

-- ============================================================================
-- 7. VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW v_payment_summary AS
SELECT
  pi.org_id,
  pi.currency,
  pi.status,
  COUNT(*)                    AS count,
  SUM(pi.amount_minor)        AS total_minor,
  MIN(pi.created_at)          AS oldest,
  MAX(pi.created_at)          AS newest
FROM payment_intents pi
GROUP BY pi.org_id, pi.currency, pi.status;

-- ============================================================================
-- 8. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_payment_intents_org_id      ON payment_intents(org_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status      ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_created_at  ON payment_intents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_intents_idempotency ON payment_intents(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_intents_psp         ON payment_intents(psp) WHERE psp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id   ON payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at   ON payment_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status   ON webhook_deliveries(status) WHERE status IN ('PENDING','FAILED');
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next     ON webhook_deliveries(next_attempt_at) WHERE status = 'PENDING';

-- ============================================================================
-- 9. RLS
-- ============================================================================

ALTER TABLE payment_intents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE psp_configs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_runs ENABLE ROW LEVEL SECURITY;

-- Org-isolation för payment_intents
CREATE POLICY pi_org_read ON payment_intents FOR SELECT
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);
CREATE POLICY pi_org_insert ON payment_intents FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);
-- Uppdatering bara via service role (state machine)
CREATE POLICY pi_service_update ON payment_intents FOR UPDATE
  USING (current_setting('role', TRUE) = 'service_role');

-- Payment events: service role only (audit log)
CREATE POLICY pe_service ON payment_events FOR ALL
  USING (current_setting('role', TRUE) = 'service_role');

-- PSP configs: service role only (innehåller credential-refs)
CREATE POLICY psp_service ON psp_configs FOR ALL
  USING (current_setting('role', TRUE) = 'service_role');

-- Webhooks + reconciliation: service role
CREATE POLICY wh_service ON webhook_deliveries FOR ALL
  USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY recon_service ON reconciliation_runs FOR ALL
  USING (current_setting('role', TRUE) = 'service_role');

COMMIT;

-- ============================================================================
-- Payment Orchestrator v1 — Done.
-- Tables: payment_intents, payment_events, psp_configs, webhook_deliveries, reconciliation_runs
-- Functions: transition_payment_intent()
-- Views: v_payment_summary
-- ============================================================================
