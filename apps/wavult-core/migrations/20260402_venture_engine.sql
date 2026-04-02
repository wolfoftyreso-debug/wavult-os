-- Venture Engine tables
-- Run: psql $DATABASE_URL -f this_file.sql
-- Or via Supabase SQL Editor

-- Opportunities (inkomna investeringsmöjligheter)
CREATE TABLE IF NOT EXISTS venture_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  stage TEXT DEFAULT 'seed',
  status TEXT DEFAULT 'active',
  score NUMERIC(3,1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ventures (aktiva ventures/investeringar)
CREATE TABLE IF NOT EXISTS ventures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  stage TEXT DEFAULT 'active',
  status TEXT DEFAULT 'active',
  equity_pct NUMERIC(5,2),
  valuation BIGINT,
  currency TEXT DEFAULT 'SEK',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Capital investments
CREATE TABLE IF NOT EXISTS venture_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID REFERENCES ventures(id),
  amount BIGINT NOT NULL,
  currency TEXT DEFAULT 'SEK',
  burn_rate BIGINT,
  status TEXT DEFAULT 'active',
  allocated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System impact tracking
CREATE TABLE IF NOT EXISTS venture_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID REFERENCES ventures(id),
  metric TEXT NOT NULL,
  value NUMERIC,
  unit TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vo_status ON venture_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_ventures_status ON ventures(status);
CREATE INDEX IF NOT EXISTS idx_vi_venture ON venture_investments(venture_id);
