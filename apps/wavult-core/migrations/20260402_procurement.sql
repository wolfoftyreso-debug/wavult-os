-- Procurement tables — suppliers, purchase_orders, contracts, approval_requests
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  country TEXT,
  contact TEXT,
  email TEXT,
  status TEXT DEFAULT 'aktiv',
  avg_monthly_sek NUMERIC DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  supplier_id TEXT,
  supplier_name TEXT,
  description TEXT,
  amount NUMERIC,
  currency TEXT DEFAULT 'SEK',
  status TEXT DEFAULT 'utkast',
  date TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  supplier_id TEXT,
  supplier_name TEXT,
  start_date TEXT,
  end_date TEXT,
  auto_renewal BOOLEAN DEFAULT false,
  annual_value NUMERIC,
  currency TEXT DEFAULT 'SEK',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT,
  supplier_name TEXT,
  description TEXT,
  amount NUMERIC,
  currency TEXT DEFAULT 'SEK',
  requested_by TEXT,
  requested_at TEXT,
  status TEXT DEFAULT 'väntande',
  approver TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
