-- ─── pixdrift Banking Schema ──────────────────────────────────────────────────
-- Migration: Banking Integration Infrastructure
-- Covers: Open Banking (Tink/PSD2), Bankgiro, SEPA, Swish, Fortnox, Visma
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── OAuth state for Tink CSRF protection ────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_oauth_states (
  state TEXT PRIMARY KEY,
  bank_id TEXT,
  org_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-expire OAuth states after 10 minutes (handled by application)
CREATE INDEX IF NOT EXISTS idx_bank_oauth_states_created ON bank_oauth_states(created_at);

-- ─── Kopplade bankkonton ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('tink', 'fortnox', 'visma', 'swish', 'direct')),
  provider_account_id TEXT,
  bank_name TEXT,
  bank_logo_url TEXT,
  iban TEXT,
  account_number TEXT,
  account_name TEXT,
  currency TEXT DEFAULT 'SEK',
  balance DECIMAL(15,2),
  balance_updated_at TIMESTAMPTZ,
  -- Note: In production these should be encrypted at rest
  -- Recommended: Use Supabase Vault or AWS KMS for token encryption
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'reconnecting')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_connections_org ON bank_connections(org_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_provider ON bank_connections(provider);
CREATE INDEX IF NOT EXISTS idx_bank_connections_status ON bank_connections(org_id, status);

-- ─── Importerade banktransaktioner ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES bank_connections(id) ON DELETE SET NULL,
  external_id TEXT UNIQUE,           -- Bankens eget transaktions-ID
  date DATE NOT NULL,
  booking_date DATE,
  value_date DATE,
  amount DECIMAL(15,2) NOT NULL,     -- Negativt = utgift, Positivt = inkomst
  currency TEXT DEFAULT 'SEK',
  description TEXT,
  merchant_name TEXT,
  merchant_category TEXT,            -- MCC-kod om tillgänglig
  category TEXT,                     -- Bankens egen kategori
  suggested_bas_account TEXT,        -- AI-förslag på BAS-konto
  ledger_entry_id UUID,              -- Koppling till transactions-tabell
  status TEXT DEFAULT 'unmatched' CHECK (status IN ('unmatched', 'matched', 'ignored', 'posted')),
  raw_data JSONB,                    -- Rådata från banken (för felsökning)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_org ON bank_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_connection ON bank_transactions(connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(org_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(org_id, status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_external ON bank_transactions(external_id);

-- ─── Utgående betalningar ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES bank_connections(id) ON DELETE SET NULL,
  payment_type TEXT CHECK (payment_type IN ('sepa', 'bgc', 'bankgiro', 'swish', 'domestic')),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'SEK',
  recipient_name TEXT,
  recipient_iban TEXT,
  recipient_bankgiro TEXT,           -- Format: NNNN-NNNN
  recipient_plusgiro TEXT,           -- Format: NNNNN-N
  reference TEXT,                    -- OCR/referensnummer
  ocr TEXT,                          -- Strukturerat OCR
  message TEXT,                      -- Fritt meddelande
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'sent', 'completed', 'failed', 'cancelled')),
  provider_payment_id TEXT,          -- Extern payment ID från bank/Swish/Tink
  scheduled_date DATE,
  executed_at TIMESTAMPTZ,
  failure_reason TEXT,
  -- 4-eyes principle för belopp > 50 000 kr
  requires_second_approval BOOLEAN GENERATED ALWAYS AS (amount >= 50000) STORED,
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  second_approved_by UUID REFERENCES users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_payments_org ON bank_payments(org_id);
CREATE INDEX IF NOT EXISTS idx_bank_payments_status ON bank_payments(org_id, status);
CREATE INDEX IF NOT EXISTS idx_bank_payments_date ON bank_payments(scheduled_date);

-- ─── Autogiro-medgivanden ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS autogiro_mandates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID,                  -- REFERENCES contacts(id)
  account_number TEXT NOT NULL,      -- Kontonummer (utan clearing)
  clearing_number TEXT NOT NULL,     -- 4-siffrigt clearingnummer
  bankgiro_number TEXT,              -- Betalningsmottagarens bankgiro
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'rejected')),
  mandate_date DATE,
  activation_date DATE,
  cancelled_date DATE,
  bgc_mandate_id TEXT,               -- BGC:s eget ID efter godkännande
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autogiro_mandates_org ON autogiro_mandates(org_id);
CREATE INDEX IF NOT EXISTS idx_autogiro_mandates_status ON autogiro_mandates(status);
CREATE INDEX IF NOT EXISTS idx_autogiro_mandates_customer ON autogiro_mandates(customer_id);

-- ─── Bokföringssystem-integrationer (Fortnox, Visma, etc.) ───────────────────
CREATE TABLE IF NOT EXISTS accounting_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('fortnox', 'visma', 'pe_accounting', 'bjornlunden', 'xero', 'quickbooks')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  company_id TEXT,                   -- Fortnox: org-nummer / Visma: agreement-nummer
  company_name TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error', 'success')),
  last_sync_error TEXT,
  settings JSONB DEFAULT '{}',       -- Provider-specifika inställningar
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_accounting_integrations_org ON accounting_integrations(org_id);
CREATE INDEX IF NOT EXISTS idx_accounting_integrations_provider ON accounting_integrations(provider);

-- ─── Bankavstämningslogg ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_reconciliation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES bank_connections(id) ON DELETE SET NULL,
  reconciliation_date DATE NOT NULL,
  period_start DATE,
  period_end DATE,
  bank_balance DECIMAL(15,2),
  ledger_balance DECIMAL(15,2),
  difference DECIMAL(15,2) GENERATED ALWAYS AS (bank_balance - ledger_balance) STORED,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'reconciled', 'disputed', 'closed')),
  unmatched_count INTEGER DEFAULT 0,
  notes TEXT,
  reconciled_by UUID REFERENCES users(id),
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_reconciliation_org ON bank_reconciliation_log(org_id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliation_date ON bank_reconciliation_log(org_id, reconciliation_date DESC);

-- ─── Swish QR-tokens ──────────────────────────────────────────────────────────
-- Tracks Swish payment requests with their lifecycle
CREATE TABLE IF NOT EXISTS swish_payment_tokens (
  token TEXT PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES bank_payments(id) ON DELETE CASCADE,
  qr_code_url TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row-Level Security ────────────────────────────────────────────────────────
-- Enable RLS on all banking tables

ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE autogiro_mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliation_log ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own organization's data
-- (Assumes JWT contains org_id claim — adjust to match your auth setup)

CREATE POLICY "bank_connections_org_isolation"
  ON bank_connections FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE POLICY "bank_transactions_org_isolation"
  ON bank_transactions FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE POLICY "bank_payments_org_isolation"
  ON bank_payments FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE POLICY "autogiro_mandates_org_isolation"
  ON autogiro_mandates FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE POLICY "accounting_integrations_org_isolation"
  ON accounting_integrations FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE POLICY "bank_reconciliation_log_org_isolation"
  ON bank_reconciliation_log FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- ─── Triggers: auto-update updated_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_bank_connections_updated_at') THEN
    CREATE TRIGGER set_bank_connections_updated_at
      BEFORE UPDATE ON bank_connections
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_bank_transactions_updated_at') THEN
    CREATE TRIGGER set_bank_transactions_updated_at
      BEFORE UPDATE ON bank_transactions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_bank_payments_updated_at') THEN
    CREATE TRIGGER set_bank_payments_updated_at
      BEFORE UPDATE ON bank_payments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_accounting_integrations_updated_at') THEN
    CREATE TRIGGER set_accounting_integrations_updated_at
      BEFORE UPDATE ON accounting_integrations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ─── Views ────────────────────────────────────────────────────────────────────

-- Unmatched transactions needing attention
CREATE OR REPLACE VIEW unmatched_bank_transactions AS
SELECT
  bt.*,
  bc.bank_name,
  bc.account_name,
  bc.iban
FROM bank_transactions bt
JOIN bank_connections bc ON bt.connection_id = bc.id
WHERE bt.status = 'unmatched'
ORDER BY bt.date DESC;

-- Payment pipeline overview
CREATE OR REPLACE VIEW payment_pipeline AS
SELECT
  p.*,
  bc.bank_name,
  bc.account_name,
  u1.email AS created_by_email,
  u2.email AS approved_by_email
FROM bank_payments p
LEFT JOIN bank_connections bc ON p.connection_id = bc.id
LEFT JOIN users u1 ON p.created_by = u1.id
LEFT JOIN users u2 ON p.approved_by = u2.id
ORDER BY p.created_at DESC;
