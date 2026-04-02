-- Customer Account Ledger
-- VW Spolfil-principen: invoice header separate from line items

CREATE TABLE IF NOT EXISTS customer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  country TEXT,
  type TEXT DEFAULT 'school',  -- school | government | ngo | corporate
  currency TEXT DEFAULT 'USD',
  credit_threshold NUMERIC DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES customer_accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL,          -- invoice | credit_note | payment_received | payment_sent | subscription | refund
  description TEXT,
  amount NUMERIC NOT NULL,     -- positive = debit (customer owes us), negative = credit (we owe customer)
  currency TEXT DEFAULT 'USD',
  reference TEXT,
  status TEXT DEFAULT 'pending',  -- pending | confirmed | failed | reversed
  receipt_url TEXT,
  revolut_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_account ON account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_tx_status  ON account_transactions(status);

-- Spool file: invoice line items (never returned with invoice summary)
CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES account_transactions(id) ON DELETE CASCADE,
  line_number INT,
  description TEXT,
  quantity NUMERIC,
  unit TEXT,           -- device | month | session | GB | unit
  unit_price NUMERIC,
  amount NUMERIC,
  metadata JSONB,      -- e.g. {"device_id": "DEVICE-001", "serial": "LUN-20264411"}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lines_invoice ON invoice_lines(invoice_id);

-- Atomic audit log per invoice/line
CREATE TABLE IF NOT EXISTS invoice_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES account_transactions(id) ON DELETE CASCADE,
  line_id UUID REFERENCES invoice_lines(id) ON DELETE SET NULL,
  event_time TIMESTAMPTZ DEFAULT NOW(),
  event_type TEXT,     -- device_sync | content_push | heartbeat | payment
  device_id TEXT,
  description TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_invoice ON invoice_audit_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_audit_line    ON invoice_audit_log(line_id);
