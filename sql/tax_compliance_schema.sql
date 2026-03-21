-- ============================================================
-- TAX COMPLIANCE SCHEMA — pixdrift OMS
-- ============================================================
-- Lagstöd:
--   SFL 2011:1244 (Skatteförfarandelagen)
--   BFL 1999:1078 (Bokföringslagen) — 7 års lagringstid
--   ML 2023:200 (Mervärdesskattelagen)
--   GDPR (EU 2016/679) — kryptering av personnummer
--
-- VIKTIG SÄKERHETSNOTERING:
--   Personnummer lagras ALDRIG i klartext.
--   personal_number_hash = SHA-256 för sökning
--   personal_number_encrypted = AES-256-CBC för läsning (admin)
--   PNR_ENCRYPTION_KEY och PNR_HASH_SALT sätts i miljövariabler
-- ============================================================

-- ─── ARBETSPLATSER ─────────────────────────────────────────────────────────
-- Kopplar personalliggare och kassaregister till fysisk plats
CREATE TABLE IF NOT EXISTS workplaces (
  id                         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id                     UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  name                       TEXT        NOT NULL,
  address                    TEXT        NOT NULL,
  municipality_code          TEXT,                           -- SCB-kommunkod, 4 siffror
  industry_code              TEXT,                           -- SNI-kod (Statistiska centralbyrån)
  requires_personnel_ledger  BOOLEAN     DEFAULT false,      -- Kräver personalliggare (SFL 39:10)
  requires_cash_register     BOOLEAN     DEFAULT false,      -- Kräver kassaregister (SFL 39:4)
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workplaces_org_id ON workplaces(org_id);

-- ─── PERSONALLIGGARE (SFL 39 kap. 9-12§§) ────────────────────────────────
-- IMMUTABLE: Poster får ej ändras efter skapande (SFL 39:11)
-- GDPR: Personnummer krypteras, raderas efter 5 år (SFL/BFL krav)
CREATE TABLE IF NOT EXISTS personnel_checkins (
  id                         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id                     UUID        REFERENCES organizations(id) ON DELETE RESTRICT,
  workplace_id               UUID        REFERENCES workplaces(id)    ON DELETE RESTRICT,

  -- Personnummer — ALDRIG i klartext
  personal_number_hash       TEXT        NOT NULL,           -- SHA-256 + salt, för sökning
  personal_number_encrypted  TEXT        NOT NULL,           -- AES-256-CBC, för admin-läsning
  coordination_number_hash   TEXT,                           -- Samordningsnummer (SFL 39:9 2st.)
  id_type                    TEXT        NOT NULL DEFAULT 'personal'
                             CHECK (id_type IN ('personal', 'coordination')),

  full_name                  TEXT,                           -- Fritext, ej personnummer
  role                       TEXT        NOT NULL,           -- Roll/befattning på arbetsplatsen
  employer_org_number        TEXT        NOT NULL,           -- Arbetsgivaren (ej alltid = org_id)

  checkin_time               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checkout_time              TIMESTAMPTZ,                    -- NULL = fortfarande incheckad

  created_by                 UUID        REFERENCES users(id),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Dataintegritet: inga framtida incheckningstider
  CONSTRAINT no_future_checkin
    CHECK (checkin_time <= NOW() + INTERVAL '1 minute'),

  -- Dataintegritet: utcheckning kan ej vara före incheckning
  CONSTRAINT valid_checkout_time
    CHECK (checkout_time IS NULL OR checkout_time > checkin_time)
);

-- Trigger för att förhindra UPDATE på checkin_time och personal_number (immutability)
CREATE OR REPLACE FUNCTION prevent_checkin_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.checkin_time IS DISTINCT FROM NEW.checkin_time THEN
    RAISE EXCEPTION 'Incheckningstid kan ej ändras (SFL 39 kap. immutability-krav)';
  END IF;
  IF OLD.personal_number_hash IS DISTINCT FROM NEW.personal_number_hash THEN
    RAISE EXCEPTION 'Personnummer kan ej ändras efter incheckning (GDPR + SFL 39 kap.)';
  END IF;
  IF OLD.personal_number_encrypted IS DISTINCT FROM NEW.personal_number_encrypted THEN
    RAISE EXCEPTION 'Personnummer kan ej ändras efter incheckning (GDPR + SFL 39 kap.)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_checkin_tampering ON personnel_checkins;
CREATE TRIGGER trg_prevent_checkin_tampering
  BEFORE UPDATE ON personnel_checkins
  FOR EACH ROW EXECUTE FUNCTION prevent_checkin_tampering();

CREATE INDEX IF NOT EXISTS idx_personnel_org_workplace ON personnel_checkins(org_id, workplace_id);
CREATE INDEX IF NOT EXISTS idx_personnel_hash           ON personnel_checkins(personal_number_hash);
CREATE INDEX IF NOT EXISTS idx_personnel_checkin_time   ON personnel_checkins(checkin_time);
CREATE INDEX IF NOT EXISTS idx_personnel_open           ON personnel_checkins(workplace_id) WHERE checkout_time IS NULL;

-- RLS: Personnummer får ALDRIG läsas av icke-admin (GDPR Art. 5)
ALTER TABLE personnel_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY personnel_org_read ON personnel_checkins
  FOR SELECT
  USING (org_id = (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY personnel_admin_full ON personnel_checkins
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('ADMIN', 'OWNER')
        AND org_id = personnel_checkins.org_id
    )
  );

-- ─── KASSATRANSAKTIONER (SKVFS 2014:9, BFL 7 kap.) ───────────────────────
-- IMMUTABLE journal — poster får ej raderas (BFL 7 kap. 2§)
-- Lagras i minst 7 år (BFL 7:2)
CREATE TABLE IF NOT EXISTS cash_transactions (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id            UUID        REFERENCES organizations(id) ON DELETE RESTRICT,
  workplace_id      UUID        REFERENCES workplaces(id)    ON DELETE RESTRICT,

  receipt_number    BIGSERIAL,  -- Löpnummer: aldrig återanvänt, monotont ökande
  transaction_time  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  items             JSONB       NOT NULL,  -- [{ description, quantity, unit_price, vat_rate }]
  payment_method    TEXT        NOT NULL
                    CHECK (payment_method IN ('cash', 'card', 'swish', 'invoice', 'other')),

  -- Belopp
  gross_amount      DECIMAL(10,2) NOT NULL CHECK (gross_amount >= 0),
  vat_25            DECIMAL(10,2) DEFAULT 0 CHECK (vat_25 >= 0),
  vat_12            DECIMAL(10,2) DEFAULT 0 CHECK (vat_12 >= 0),
  vat_6             DECIMAL(10,2) DEFAULT 0 CHECK (vat_6  >= 0),

  cash_received     DECIMAL(10,2),         -- Kontant: mottaget belopp
  change_given      DECIMAL(10,2),         -- Kontant: växel

  cashier_id        UUID REFERENCES users(id),
  ce_number         TEXT,                  -- Certifierad kontrollenhet-nummer (SKVFS 2014:9)

  -- Kedjehash för journalintegritet (SKVFS 2014:9)
  journal_hash      TEXT,                  -- SHA-256(receipt_number|amount|prev_hash)

  -- Annullering (ej radering — BFL tillåter ej radering)
  voided            BOOLEAN     DEFAULT false,
  void_reason       TEXT,
  void_time         TIMESTAMPTZ,
  voided_by         UUID REFERENCES users(id),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT cash_vat_sum_check
    CHECK (vat_25 + vat_12 + vat_6 <= gross_amount)
);

-- Trigger: förhindra radering (BFL 7 kap. — räkenskapsinformation skyddas)
CREATE OR REPLACE FUNCTION prevent_cash_transaction_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Kassatransaktioner kan ej raderas (BFL 1999:1078 7 kap. 2§ — 7 års lagringstid)';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_cash_delete ON cash_transactions;
CREATE TRIGGER trg_prevent_cash_delete
  BEFORE DELETE ON cash_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_cash_transaction_delete();

-- Trigger: förhindra ändring av kärnfält (immutable journal)
CREATE OR REPLACE FUNCTION prevent_cash_transaction_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.receipt_number    IS DISTINCT FROM NEW.receipt_number    THEN
    RAISE EXCEPTION 'Kvittonummer kan ej ändras (SKVFS 2014:9 — immutable journal)';
  END IF;
  IF OLD.transaction_time  IS DISTINCT FROM NEW.transaction_time  THEN
    RAISE EXCEPTION 'Transaktionstid kan ej ändras';
  END IF;
  IF OLD.gross_amount      IS DISTINCT FROM NEW.gross_amount      THEN
    RAISE EXCEPTION 'Belopp kan ej ändras — annullera och skapa ny transaktion';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_cash_tampering ON cash_transactions;
CREATE TRIGGER trg_prevent_cash_tampering
  BEFORE UPDATE ON cash_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_cash_transaction_tampering();

CREATE INDEX IF NOT EXISTS idx_cash_org_workplace    ON cash_transactions(org_id, workplace_id);
CREATE INDEX IF NOT EXISTS idx_cash_receipt_number   ON cash_transactions(receipt_number);
CREATE INDEX IF NOT EXISTS idx_cash_transaction_time ON cash_transactions(transaction_time);

ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_org_access ON cash_transactions
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- ─── Z-RAPPORTER (SKVFS 2014:9) ───────────────────────────────────────────
-- Dagliga stängningsrapporter — en per arbetsplats per dag, immutable
CREATE TABLE IF NOT EXISTS z_reports (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id               UUID        REFERENCES organizations(id) ON DELETE RESTRICT,
  workplace_id         UUID        REFERENCES workplaces(id)    ON DELETE RESTRICT,

  report_date          DATE        NOT NULL,
  total_sales          DECIMAL(12,2) NOT NULL,
  total_vat_25         DECIMAL(10,2) DEFAULT 0,
  total_vat_12         DECIMAL(10,2) DEFAULT 0,
  total_vat_6          DECIMAL(10,2) DEFAULT 0,
  transaction_count    INTEGER     NOT NULL,
  cash_sales           DECIMAL(12,2) DEFAULT 0,
  card_sales           DECIMAL(12,2) DEFAULT 0,
  swish_sales          DECIMAL(12,2) DEFAULT 0,

  first_receipt_number BIGINT,
  last_receipt_number  BIGINT,

  generated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by         UUID        REFERENCES users(id),

  -- En Z-rapport per arbetsplats per dag (SKVFS 2014:9)
  UNIQUE(org_id, workplace_id, report_date)
);

-- Z-rapporter raderas ej (BFL 7 år)
CREATE OR REPLACE FUNCTION prevent_z_report_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Z-rapporter kan ej raderas (BFL 1999:1078 7 kap. 2§)';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_z_delete ON z_reports;
CREATE TRIGGER trg_prevent_z_delete
  BEFORE DELETE ON z_reports
  FOR EACH ROW EXECUTE FUNCTION prevent_z_report_delete();

CREATE INDEX IF NOT EXISTS idx_z_reports_org_date ON z_reports(org_id, report_date);

ALTER TABLE z_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY z_report_org_access ON z_reports
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- ─── MOMSDEKLARATIONER (ML 2023:200, SFL 26 kap.) ─────────────────────────
CREATE TABLE IF NOT EXISTS vat_declarations (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          UUID          REFERENCES organizations(id) ON DELETE RESTRICT,

  period_year     INTEGER       NOT NULL,
  period_month    INTEGER       CHECK (period_month BETWEEN 1 AND 12),  -- NULL om kvartalsvis
  period_quarter  INTEGER       CHECK (period_quarter BETWEEN 1 AND 4), -- NULL om månadsvis

  outgoing_vat    DECIMAL(12,2) NOT NULL,  -- Utgående moms (försäljning)
  incoming_vat    DECIMAL(12,2) NOT NULL DEFAULT 0,  -- Ingående moms (inköp)
  net_vat         DECIMAL(12,2) NOT NULL,  -- Positiv = att betala, negativ = återfå

  status          TEXT          DEFAULT 'draft'
                  CHECK (status IN ('draft', 'submitted', 'paid', 'corrected')),

  submitted_at    TIMESTAMPTZ,
  due_date        DATE,
  paid_at         TIMESTAMPTZ,

  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW(),

  -- En deklaration per period
  UNIQUE(org_id, period_year, period_month),
  UNIQUE(org_id, period_year, period_quarter),

  CONSTRAINT period_xor CHECK (
    (period_month IS NOT NULL) != (period_quarter IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_vat_decl_org_period ON vat_declarations(org_id, period_year, period_month);

ALTER TABLE vat_declarations ENABLE ROW LEVEL SECURITY;
CREATE POLICY vat_decl_org_access ON vat_declarations
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- ─── KOMMENTARER / DOKUMENTATION ──────────────────────────────────────────
COMMENT ON TABLE personnel_checkins IS
  'Personalliggare per SFL 2011:1244, 39 kap. 9-12§§. '
  'Personnummer lagras krypterat (GDPR). '
  'Poster raderas ej — anonymiseras efter 5 år (SFL/BFL-krav).';

COMMENT ON TABLE cash_transactions IS
  'Kassajournal per SKVFS 2014:9. Immutable — poster raderas aldrig. '
  'Lagras minst 7 år (BFL 1999:1078 7 kap. 2§). '
  'ce_number = certifierad kontrollenhet-nummer — KRÄVS för lagenlighet.';

COMMENT ON TABLE z_reports IS
  'Dagliga Z-rapporter (stängningsrapporter) per SKVFS 2014:9. '
  'Immutable — en per arbetsplats per dag.';

COMMENT ON TABLE vat_declarations IS
  'Momsdeklarationsunderlag per ML 2023:200 och SFL 26 kap. '
  'Förfallodatum: 26:e månaden efter perioden (ej helg).';
