-- ============================================================================
-- quiXzoom Payout Engine v1
-- Escrow, fotograf-utbetalningar, plattformsavgift
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ESCROW_ACCOUNTS — Hålls medel per organisation
-- ============================================================================
CREATE TABLE IF NOT EXISTS escrow_accounts (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID    NOT NULL UNIQUE,
  balance_minor   BIGINT  NOT NULL DEFAULT 0,
  currency        TEXT    NOT NULL DEFAULT 'USD',
  last_updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed: escrow för Tech LLC (quiXzoom)
INSERT INTO escrow_accounts (org_id, currency) VALUES
  ('a1000000-0000-0000-0000-000000000002', 'USD')
ON CONFLICT (org_id) DO NOTHING;

-- ============================================================================
-- 2. ESCROW_TRANSACTIONS — Rörelser i escrow
-- ============================================================================
CREATE TABLE IF NOT EXISTS escrow_transactions (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID    NOT NULL,
  mission_id      UUID    REFERENCES missions(id),
  type            TEXT    NOT NULL CHECK (type IN (
                    'CLIENT_PAYMENT_IN',    -- klient betalar
                    'PHOTOGRAPHER_PAYOUT',  -- fotograf får betalt
                    'PLATFORM_FEE',         -- plattformsavgift tas ut
                    'REFUND',               -- återbetalning till klient
                    'ADJUSTMENT'            -- manuell justering
                  )),
  amount_minor    BIGINT  NOT NULL,
  currency        TEXT    NOT NULL DEFAULT 'USD',
  balance_after   BIGINT  NOT NULL,
  reference_id    UUID,               -- payment_intent, payout, etc.
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. PHOTOGRAPHER_PAYOUTS — Utbetalningar till fotografer
-- ============================================================================
CREATE TABLE IF NOT EXISTS photographer_payouts (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID    NOT NULL,
  photographer_id     UUID    NOT NULL REFERENCES photographers(id),
  mission_id          UUID    REFERENCES missions(id),
  -- Belopp
  gross_minor         BIGINT  NOT NULL,   -- vad fotografen förtjänade
  fee_minor           BIGINT  NOT NULL DEFAULT 0,  -- eventuell avgift
  net_minor           BIGINT  NOT NULL,   -- vad som faktiskt betalas ut
  currency            TEXT    NOT NULL DEFAULT 'USD',
  -- Status
  status              TEXT    NOT NULL DEFAULT 'PENDING' CHECK (status IN (
                        'PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED'
                      )),
  -- Revolut
  revolut_transfer_id TEXT    UNIQUE,
  revolut_account_id  TEXT,   -- fotografens Revolut-konto
  -- Timing
  scheduled_for       TIMESTAMPTZ DEFAULT now(),
  processed_at        TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  -- Fel
  failure_reason      TEXT,
  retry_count         INT     DEFAULT 0,
  -- Ledger
  journal_entry_id    UUID,
  -- Metadata
  metadata            JSONB   DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. PLATFORM_EARNINGS — Spår plattformens intjäning
-- ============================================================================
CREATE TABLE IF NOT EXISTS platform_earnings (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID    NOT NULL,
  mission_id      UUID    REFERENCES missions(id),
  client_paid     BIGINT  NOT NULL,   -- vad kunden betalade
  photographer_paid BIGINT NOT NULL,  -- vad fotografen fick
  platform_fee    BIGINT  NOT NULL,   -- vår intjäning (client_paid - photographer_paid)
  fee_percentage  NUMERIC(5,2),       -- avgiftsprocent
  currency        TEXT    NOT NULL,
  period_month    TEXT,               -- YYYY-MM för aggregering
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. FUNCTION: Trigga payout vid mission completion
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_mission_payout(p_mission_id UUID)
RETURNS photographer_payouts
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_mission     missions;
  v_payout      photographer_payouts;
  v_fee_pct     NUMERIC := 0.20;  -- 20% plattformsavgift
  v_fee_minor   BIGINT;
  v_net_minor   BIGINT;
BEGIN
  SELECT * INTO v_mission FROM missions WHERE id = p_mission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mission not found: %', p_mission_id; END IF;
  IF v_mission.status != 'COMPLETED' THEN
    RAISE EXCEPTION 'Mission must be COMPLETED to trigger payout, current: %', v_mission.status;
  END IF;
  IF v_mission.assigned_photographer_id IS NULL THEN
    RAISE EXCEPTION 'No photographer assigned to mission: %', p_mission_id;
  END IF;

  -- Beräkna avgift och netto
  v_fee_minor := ROUND(v_mission.payout_minor * v_fee_pct);
  v_net_minor := v_mission.payout_minor - v_fee_minor;

  -- Skapa payout-post
  INSERT INTO photographer_payouts (
    org_id, photographer_id, mission_id,
    gross_minor, fee_minor, net_minor, currency,
    status
  ) VALUES (
    v_mission.org_id, v_mission.assigned_photographer_id, p_mission_id,
    v_mission.payout_minor, v_fee_minor, v_net_minor, v_mission.currency,
    'PENDING'
  ) RETURNING * INTO v_payout;

  -- Spara plattformsintjäning
  INSERT INTO platform_earnings (
    org_id, mission_id,
    client_paid, photographer_paid, platform_fee, fee_percentage,
    currency, period_month
  ) VALUES (
    v_mission.org_id, p_mission_id,
    v_mission.client_price_minor, v_mission.payout_minor,
    v_mission.client_price_minor - v_mission.payout_minor,
    ROUND((v_mission.client_price_minor - v_mission.payout_minor)::NUMERIC / v_mission.client_price_minor * 100, 2),
    v_mission.currency,
    TO_CHAR(NOW(), 'YYYY-MM')
  );

  RETURN v_payout;
END;
$$;

-- ============================================================================
-- 6. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_escrow_tx_org     ON escrow_transactions(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escrow_tx_mission ON escrow_transactions(mission_id);
CREATE INDEX IF NOT EXISTS idx_payouts_photographer ON photographer_payouts(photographer_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status    ON photographer_payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_mission   ON photographer_payouts(mission_id);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_month ON platform_earnings(period_month, org_id);

-- ============================================================================
-- 7. RLS
-- ============================================================================
ALTER TABLE escrow_accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE photographer_payouts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_earnings     ENABLE ROW LEVEL SECURITY;

CREATE POLICY ea_svc  ON escrow_accounts      FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY et_svc  ON escrow_transactions  FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY pp_svc  ON photographer_payouts FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY pe_svc  ON platform_earnings    FOR ALL USING (current_setting('role', TRUE) = 'service_role');

COMMIT;
