-- ============================================================================
-- Wavult Ledger Core v1
-- Double-entry bookkeeping med multi-currency och intercompany support
-- Kör EFTER 99_wavult_entities.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CURRENCIES — Stödda valutor
-- ============================================================================
CREATE TABLE IF NOT EXISTS currencies (
  code          TEXT    PRIMARY KEY,         -- ISO 4217: 'SEK', 'EUR', 'USD', 'AED'
  name          TEXT    NOT NULL,
  symbol        TEXT    NOT NULL,
  minor_units   INT     NOT NULL DEFAULT 2,  -- öre = 2, fils = 2
  is_active     BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO currencies (code, name, symbol, minor_units) VALUES
  ('SEK', 'Swedish Krona',           'kr',  2),
  ('EUR', 'Euro',                    '€',   2),
  ('USD', 'US Dollar',               '$',   2),
  ('AED', 'UAE Dirham',              'AED', 2),
  ('GBP', 'British Pound',           '£',   2),
  ('NOK', 'Norwegian Krone',         'kr',  2),
  ('DKK', 'Danish Krone',            'kr',  2),
  ('LTL', 'Lithuanian Litas (legacy)','Lt', 2)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2. FX_RATES — Växelkurser
-- ============================================================================
CREATE TABLE IF NOT EXISTS fx_rates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency   TEXT        NOT NULL REFERENCES currencies(code),
  to_currency     TEXT        NOT NULL REFERENCES currencies(code),
  rate            NUMERIC(20,10) NOT NULL,  -- multiplicera from-belopp med rate för to-belopp
  rate_date       DATE        NOT NULL,
  source          TEXT        NOT NULL DEFAULT 'manual',  -- 'ecb', 'manual', 'stripe'
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_currency, to_currency, rate_date)
);

-- Seed: approximativa kurser 2026-03-23
INSERT INTO fx_rates (from_currency, to_currency, rate, rate_date, source) VALUES
  ('EUR', 'SEK', 11.42,  '2026-03-23', 'manual'),
  ('USD', 'SEK', 10.38,  '2026-03-23', 'manual'),
  ('AED', 'SEK',  2.83,  '2026-03-23', 'manual'),
  ('SEK', 'EUR',  0.0876,'2026-03-23', 'manual'),
  ('USD', 'EUR',  0.921, '2026-03-23', 'manual'),
  ('AED', 'EUR',  0.248, '2026-03-23', 'manual'),
  ('EUR', 'USD',  1.086, '2026-03-23', 'manual'),
  ('AED', 'USD',  0.272, '2026-03-23', 'manual'),
  ('USD', 'AED',  3.674, '2026-03-23', 'manual')
ON CONFLICT (from_currency, to_currency, rate_date) DO NOTHING;

-- ============================================================================
-- 3. CHART_OF_ACCOUNTS — Kontoplan per entitet
-- ============================================================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID    NOT NULL,
  account_code  TEXT    NOT NULL,
  name          TEXT    NOT NULL,
  type          TEXT    NOT NULL CHECK (type IN (
                  'ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'
                )),
  subtype       TEXT,   -- 'cash','accounts_receivable','accounts_payable' etc
  currency      TEXT    NOT NULL REFERENCES currencies(code),
  is_active     BOOLEAN DEFAULT true,
  parent_id     UUID    REFERENCES chart_of_accounts(id),
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, account_code)
);

-- Seed: Baskonton för alla tre Wavult-entiteter
DO $$
DECLARE
  holding_id UUID := 'a1000000-0000-0000-0000-000000000001';
  tech_id    UUID := 'a1000000-0000-0000-0000-000000000002';
  intel_id   UUID := 'a1000000-0000-0000-0000-000000000003';
BEGIN
  -- Holding (AED)
  INSERT INTO chart_of_accounts (org_id, account_code, name, type, subtype, currency) VALUES
    (holding_id, '1000', 'Cash & Bank',           'ASSET',     'cash',                'AED'),
    (holding_id, '1100', 'Accounts Receivable',    'ASSET',     'accounts_receivable', 'AED'),
    (holding_id, '1200', 'Intercompany Receivable','ASSET',     'intercompany',        'AED'),
    (holding_id, '2000', 'Accounts Payable',       'LIABILITY', 'accounts_payable',    'AED'),
    (holding_id, '2100', 'Intercompany Payable',   'LIABILITY', 'intercompany',        'AED'),
    (holding_id, '3000', 'Share Capital',          'EQUITY',    'capital',             'AED'),
    (holding_id, '3100', 'Retained Earnings',      'EQUITY',    'retained_earnings',   'AED'),
    (holding_id, '4000', 'Revenue',                'REVENUE',   'operating',           'AED'),
    (holding_id, '5000', 'Operating Expenses',     'EXPENSE',   'operating',           'AED'),
    (holding_id, '5100', 'Management Fees',        'EXPENSE',   'intercompany',        'AED')
  ON CONFLICT (org_id, account_code) DO NOTHING;

  -- Tech LLC (USD)
  INSERT INTO chart_of_accounts (org_id, account_code, name, type, subtype, currency) VALUES
    (tech_id, '1000', 'Cash & Bank',              'ASSET',     'cash',                'USD'),
    (tech_id, '1100', 'Accounts Receivable',       'ASSET',     'accounts_receivable', 'USD'),
    (tech_id, '1200', 'Intercompany Receivable',   'ASSET',     'intercompany',        'USD'),
    (tech_id, '2000', 'Accounts Payable',          'LIABILITY', 'accounts_payable',    'USD'),
    (tech_id, '2100', 'Intercompany Payable',      'LIABILITY', 'intercompany',        'USD'),
    (tech_id, '3000', 'Member Capital',            'EQUITY',    'capital',             'USD'),
    (tech_id, '3100', 'Retained Earnings',         'EQUITY',    'retained_earnings',   'USD'),
    (tech_id, '4000', 'Platform Revenue',          'REVENUE',   'operating',           'USD'),
    (tech_id, '4100', 'Mission Fees',              'REVENUE',   'operating',           'USD'),
    (tech_id, '5000', 'Operating Expenses',        'EXPENSE',   'operating',           'USD'),
    (tech_id, '5100', 'AWS Infrastructure',        'EXPENSE',   'infrastructure',      'USD'),
    (tech_id, '5200', 'Personnel',                 'EXPENSE',   'personnel',           'USD'),
    (tech_id, '5300', 'Management Fee to Holding', 'EXPENSE',   'intercompany',        'USD')
  ON CONFLICT (org_id, account_code) DO NOTHING;

  -- Intelligence UAB (EUR)
  INSERT INTO chart_of_accounts (org_id, account_code, name, type, subtype, currency) VALUES
    (intel_id, '1000', 'Cash & Bank',              'ASSET',     'cash',                'EUR'),
    (intel_id, '1100', 'Accounts Receivable',       'ASSET',     'accounts_receivable', 'EUR'),
    (intel_id, '1200', 'Intercompany Receivable',   'ASSET',     'intercompany',        'EUR'),
    (intel_id, '2000', 'Accounts Payable',          'LIABILITY', 'accounts_payable',    'EUR'),
    (intel_id, '2100', 'Intercompany Payable',      'LIABILITY', 'intercompany',        'EUR'),
    (intel_id, '3000', 'Share Capital',             'EQUITY',    'capital',             'EUR'),
    (intel_id, '3100', 'Retained Earnings',         'EQUITY',    'retained_earnings',   'EUR'),
    (intel_id, '4000', 'Intelligence Revenue',      'REVENUE',   'operating',           'EUR'),
    (intel_id, '4100', 'Subscription Revenue',      'REVENUE',   'operating',           'EUR'),
    (intel_id, '5000', 'Operating Expenses',        'EXPENSE',   'operating',           'EUR'),
    (intel_id, '5100', 'Personnel',                 'EXPENSE',   'personnel',           'EUR'),
    (intel_id, '5200', 'Infrastructure',            'EXPENSE',   'infrastructure',      'EUR'),
    (intel_id, '5300', 'Management Fee to Holding', 'EXPENSE',   'intercompany',        'EUR')
  ON CONFLICT (org_id, account_code) DO NOTHING;
END $$;

-- ============================================================================
-- 4. JOURNAL_ENTRIES — Verifikat (oföränderliga)
-- ============================================================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL,
  entry_number      TEXT        NOT NULL,    -- 'WGH-2026-0001'
  entry_date        DATE        NOT NULL,
  description       TEXT        NOT NULL,
  currency          TEXT        NOT NULL REFERENCES currencies(code),
  status            TEXT        NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
                      'DRAFT','POSTED','VOID'
                    )),
  type              TEXT        NOT NULL DEFAULT 'STANDARD' CHECK (type IN (
                      'STANDARD','INTERCOMPANY','PAYROLL','ADJUSTMENT','OPENING_BALANCE'
                    )),
  idempotency_key   TEXT        UNIQUE,      -- förhindrar dubbelposter
  posted_at         TIMESTAMPTZ,
  posted_by         UUID,
  void_reason       TEXT,
  void_at           TIMESTAMPTZ,
  void_by           UUID,
  reference         TEXT,                    -- extern referens (fakturanr, etc)
  metadata          JSONB       DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, entry_number)
);

-- ============================================================================
-- 5. JOURNAL_LINES — Rader (debet/kredit)
-- ============================================================================
CREATE TABLE IF NOT EXISTS journal_lines (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id      UUID    NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id      UUID    NOT NULL REFERENCES chart_of_accounts(id),
  debit_minor     BIGINT  NOT NULL DEFAULT 0,   -- alltid positiv, i minor units
  credit_minor    BIGINT  NOT NULL DEFAULT 0,   -- alltid positiv, i minor units
  description     TEXT,
  -- FX om raden bokförs i annan valuta
  original_amount   BIGINT,
  original_currency TEXT  REFERENCES currencies(code),
  fx_rate           NUMERIC(20,10),
  created_at        TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT debit_or_credit CHECK (
    (debit_minor > 0 AND credit_minor = 0) OR
    (credit_minor > 0 AND debit_minor = 0)
  ),
  CONSTRAINT non_negative CHECK (debit_minor >= 0 AND credit_minor >= 0)
);

-- ============================================================================
-- 6. INTERCOMPANY_FLOWS — Transaktioner mellan entiteter
-- ============================================================================
CREATE TABLE IF NOT EXISTS intercompany_flows (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  from_org_id           UUID    NOT NULL,
  to_org_id             UUID    NOT NULL,
  amount_minor          BIGINT  NOT NULL,
  currency              TEXT    NOT NULL REFERENCES currencies(code),
  -- Matching journal entries i respektive bolag
  from_journal_id       UUID    REFERENCES journal_entries(id),
  to_journal_id         UUID    REFERENCES journal_entries(id),
  flow_type             TEXT    NOT NULL CHECK (flow_type IN (
                          'MANAGEMENT_FEE','LOAN','DIVIDEND','LICENSE_FEE',
                          'SERVICE_FEE','CAPITAL_INJECTION','OTHER'
                        )),
  description           TEXT    NOT NULL,
  status                TEXT    NOT NULL DEFAULT 'PENDING' CHECK (status IN (
                          'PENDING','MATCHED','VOID'
                        )),
  settlement_date       DATE,
  idempotency_key       TEXT    UNIQUE,
  metadata              JSONB   DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT different_orgs CHECK (from_org_id != to_org_id)
);

-- ============================================================================
-- 7. FUNCTIONS — Balansräkning & dubbel-bokföring validering
-- ============================================================================

-- Beräkna saldo för ett konto
CREATE OR REPLACE FUNCTION account_balance(p_account_id UUID, p_as_of DATE DEFAULT CURRENT_DATE)
RETURNS BIGINT
LANGUAGE SQL STABLE AS $$
  SELECT COALESCE(
    SUM(jl.debit_minor) - SUM(jl.credit_minor), 0
  )
  FROM journal_lines jl
  JOIN journal_entries je ON je.id = jl.journal_id
  WHERE jl.account_id = p_account_id
    AND je.status = 'POSTED'
    AND je.entry_date <= p_as_of
$$;

-- Validera att ett verifikat är i balans (debet = kredit)
CREATE OR REPLACE FUNCTION validate_journal_balance(p_journal_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
  SELECT (
    COALESCE(SUM(debit_minor), 0) = COALESCE(SUM(credit_minor), 0)
    AND COUNT(*) >= 2
  )
  FROM journal_lines
  WHERE journal_id = p_journal_id
$$;

-- Posta ett verifikat (kräver balans)
CREATE OR REPLACE FUNCTION post_journal_entry(p_journal_id UUID, p_posted_by UUID DEFAULT NULL)
RETURNS journal_entries
LANGUAGE plpgsql AS $$
DECLARE
  v_entry journal_entries;
BEGIN
  IF NOT validate_journal_balance(p_journal_id) THEN
    RAISE EXCEPTION 'Journal entry % is not balanced (debit must equal credit)', p_journal_id;
  END IF;

  UPDATE journal_entries
  SET status = 'POSTED', posted_at = now(), posted_by = p_posted_by
  WHERE id = p_journal_id AND status = 'DRAFT'
  RETURNING * INTO v_entry;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journal entry % not found or not in DRAFT status', p_journal_id;
  END IF;

  RETURN v_entry;
END $$;

-- ============================================================================
-- 8. VIEWS
-- ============================================================================

-- Trial Balance per entitet
CREATE OR REPLACE VIEW v_trial_balance AS
SELECT
  coa.org_id,
  coa.account_code,
  coa.name         AS account_name,
  coa.type         AS account_type,
  coa.currency,
  COALESCE(SUM(jl.debit_minor), 0)  AS total_debit,
  COALESCE(SUM(jl.credit_minor), 0) AS total_credit,
  COALESCE(SUM(jl.debit_minor), 0) - COALESCE(SUM(jl.credit_minor), 0) AS balance
FROM chart_of_accounts coa
LEFT JOIN journal_lines jl ON jl.account_id = coa.id
LEFT JOIN journal_entries je ON je.id = jl.journal_id AND je.status = 'POSTED'
WHERE coa.is_active = true
GROUP BY coa.org_id, coa.account_code, coa.name, coa.type, coa.currency
ORDER BY coa.org_id, coa.account_code;

-- Intercompany summary
CREATE OR REPLACE VIEW v_intercompany_summary AS
SELECT
  ic.from_org_id,
  ic.to_org_id,
  ic.flow_type,
  ic.currency,
  COUNT(*)                    AS transaction_count,
  SUM(ic.amount_minor)        AS total_minor,
  MAX(ic.created_at)          AS last_transaction
FROM intercompany_flows ic
WHERE ic.status != 'VOID'
GROUP BY ic.from_org_id, ic.to_org_id, ic.flow_type, ic.currency;

-- ============================================================================
-- 9. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_journal_entries_org_id      ON journal_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date  ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status      ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_type        ON journal_entries(type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_idempotency ON journal_entries(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journal_lines_journal_id    ON journal_lines(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account_id    ON journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_intercompany_from_org       ON intercompany_flows(from_org_id);
CREATE INDEX IF NOT EXISTS idx_intercompany_to_org         ON intercompany_flows(to_org_id);
CREATE INDEX IF NOT EXISTS idx_intercompany_status         ON intercompany_flows(status);
CREATE INDEX IF NOT EXISTS idx_coa_org_id                  ON chart_of_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_fx_rates_date               ON fx_rates(rate_date DESC);

-- ============================================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE currencies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fx_rates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines        ENABLE ROW LEVEL SECURITY;
ALTER TABLE intercompany_flows   ENABLE ROW LEVEL SECURITY;

-- Currencies + fx_rates: public read
CREATE POLICY currencies_read   ON currencies FOR SELECT USING (true);
CREATE POLICY currencies_manage ON currencies FOR ALL    USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY fx_rates_read     ON fx_rates   FOR SELECT USING (true);
CREATE POLICY fx_rates_manage   ON fx_rates   FOR ALL    USING (current_setting('role', TRUE) = 'service_role');

-- Chart of accounts: org-isolated
CREATE POLICY coa_org_isolation ON chart_of_accounts
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);
CREATE POLICY coa_org_insert ON chart_of_accounts
  FOR INSERT WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

-- Journal entries: org-isolated
CREATE POLICY journal_entries_org_isolation ON journal_entries
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);
CREATE POLICY journal_entries_org_insert ON journal_entries
  FOR INSERT WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);
-- INGEN DELETE-policy — poster raderas aldrig (void istället)

-- Journal lines: via journal_entries (service role hanterar direkt)
CREATE POLICY journal_lines_service ON journal_lines
  FOR ALL USING (current_setting('role', TRUE) = 'service_role');

-- Intercompany: service role only (korsade entiteter kräver elevated access)
CREATE POLICY intercompany_service ON intercompany_flows
  FOR ALL USING (current_setting('role', TRUE) = 'service_role');

COMMIT;

-- ============================================================================
-- Wavult Ledger Core v1 — Done.
-- Tables: currencies, fx_rates, chart_of_accounts, journal_entries, journal_lines, intercompany_flows
-- Functions: account_balance(), validate_journal_balance(), post_journal_entry()
-- Views: v_trial_balance, v_intercompany_summary
-- ============================================================================
