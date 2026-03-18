-- =============================================================================
-- Hypbit OMS - Complete PostgreSQL/Supabase Schema
-- Deploy: Run this entire file in Supabase SQL Editor
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- STEP 0: ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'SALES', 'FINANCE', 'OPS');
CREATE TYPE lead_status AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'LOST');
CREATE TYPE deal_status AS ENUM ('NEW', 'QUALIFIED', 'DEMO', 'OFFER', 'NEGOTIATION', 'WON', 'LOST');
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED');
CREATE TYPE payout_status AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');
CREATE TYPE nc_severity AS ENUM ('OBSERVATION', 'MINOR', 'MAJOR', 'CRITICAL');
CREATE TYPE nc_status AS ENUM ('OPEN', 'ANALYZING', 'ACTION_PLANNED', 'IMPLEMENTING', 'VERIFYING', 'CLOSED');
CREATE TYPE pdca_phase AS ENUM ('PLAN', 'DO', 'CHECK', 'ACT');
CREATE TYPE improvement_status AS ENUM ('IDEA', 'APPROVED', 'IMPLEMENTING', 'VERIFYING', 'CLOSED');
CREATE TYPE risk_category AS ENUM ('OPERATIONAL', 'TECHNICAL', 'FINANCIAL', 'LEGAL', 'STRATEGIC');
CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE compliance_status AS ENUM ('CONFORMING', 'PARTIAL', 'NON_CONFORMING', 'NOT_ASSESSED');
CREATE TYPE goal_status AS ENUM ('ACTIVE', 'ON_TRACK', 'AT_RISK', 'COMPLETED', 'CANCELLED');
CREATE TYPE dev_action_status AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE dev_action_type AS ENUM ('PRACTICE', 'COACHING', 'TRAINING', 'MENTORING', 'READING');
CREATE TYPE assessment_level AS ENUM ('L1', 'L2', 'L3', 'L4', 'L5');
CREATE TYPE process_execution_status AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE audit_status AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE document_status AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'OBSOLETE');
CREATE TYPE training_status AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED');

-- =============================================================================
-- STEP 0.5: updated_at trigger function
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS 13086
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
13086 LANGUAGE plpgsql;

-- =============================================================================
-- STEP 1: CORE TABLES
-- =============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  reporting_currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  auth_id UUID UNIQUE, -- links to auth.users
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'OPS',
  title TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, email)
);

CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_auth ON users(auth_id);
CREATE INDEX idx_users_role ON users(org_id, role);

-- =============================================================================
-- STEP 2: CRM
-- =============================================================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  org_number TEXT,
  industry TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'SE',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_org ON companies(org_id);
CREATE INDEX idx_companies_name ON companies(org_id, name);

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_org ON contacts(org_id);
CREATE INDEX idx_contacts_company ON contacts(company_id);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status lead_status NOT NULL DEFAULT 'NEW',
  source TEXT,
  notes TEXT,
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_org ON leads(org_id);
CREATE INDEX idx_leads_status ON leads(org_id, status);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status deal_status NOT NULL DEFAULT 'NEW',
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  exchange_rate NUMERIC(12,6) NOT NULL DEFAULT 1.0,
  reporting_amount NUMERIC(14,2) NOT NULL DEFAULT 0, -- amount in reporting currency (EUR)
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  expected_close DATE,
  closed_at TIMESTAMPTZ,
  notes TEXT,
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deals_org ON deals(org_id);
CREATE INDEX idx_deals_status ON deals(org_id, status);
CREATE INDEX idx_deals_assigned ON deals(assigned_to);
CREATE INDEX idx_deals_company ON deals(company_id);
CREATE INDEX idx_deals_currency ON deals(org_id, currency);

-- =============================================================================
-- STEP 3: OPERATIONS
-- =============================================================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'TODO',
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_org ON tasks(org_id);
CREATE INDEX idx_tasks_status ON tasks(org_id, status);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_priority ON tasks(org_id, priority);
CREATE INDEX idx_tasks_due ON tasks(org_id, due_date);
CREATE INDEX idx_tasks_deal ON tasks(deal_id);

CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meetings_org ON meetings(org_id);
CREATE INDEX idx_meetings_dates ON meetings(org_id, starts_at);

CREATE TABLE meeting_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  rsvp TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meeting_attendees_meeting ON meeting_attendees(meeting_id);
CREATE INDEX idx_meeting_attendees_user ON meeting_attendees(user_id);

CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  rationale TEXT,
  decided_by UUID REFERENCES users(id),
  decided_at DATE NOT NULL DEFAULT CURRENT_DATE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_decisions_org ON decisions(org_id);
CREATE INDEX idx_decisions_date ON decisions(org_id, decided_at);

-- =============================================================================
-- STEP 4: FINANCE
-- =============================================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  exchange_rate NUMERIC(12,6) NOT NULL DEFAULT 1.0,
  reporting_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, SENT, PAID, OVERDUE, CANCELLED
  issued_at DATE,
  due_at DATE,
  paid_at DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, invoice_number)
);

CREATE INDEX idx_invoices_org ON invoices(org_id);
CREATE INDEX idx_invoices_deal ON invoices(deal_id);
CREATE INDEX idx_invoices_status ON invoices(org_id, status);
CREATE INDEX idx_invoices_company ON invoices(company_id);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,      -- Swedish BAS chart: 1000-8999
  account_name TEXT NOT NULL,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  exchange_rate NUMERIC(12,6) NOT NULL DEFAULT 1.0,
  reporting_debit NUMERIC(14,2) NOT NULL DEFAULT 0,   -- in reporting currency (EUR)
  reporting_credit NUMERIC(14,2) NOT NULL DEFAULT 0,  -- in reporting currency (EUR)
  description TEXT,
  reference TEXT,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  booked_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_org ON transactions(org_id);
CREATE INDEX idx_transactions_account ON transactions(org_id, account_code);
CREATE INDEX idx_transactions_booked ON transactions(org_id, booked_at);
CREATE INDEX idx_transactions_invoice ON transactions(invoice_id);
CREATE INDEX idx_transactions_currency ON transactions(org_id, currency);

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  exchange_rate NUMERIC(12,6) NOT NULL DEFAULT 1.0,
  reporting_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status payout_status NOT NULL DEFAULT 'PENDING',
  description TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payouts_org ON payouts(org_id);
CREATE INDEX idx_payouts_status ON payouts(org_id, status);

-- =============================================================================
-- STEP 5: COMMUNICATION
-- =============================================================================

CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, slug)
);

CREATE INDEX idx_channels_org ON channels(org_id);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_channel ON messages(channel_id);
CREATE INDEX idx_messages_org ON messages(org_id);
CREATE INDEX idx_messages_created ON messages(channel_id, created_at DESC);

-- =============================================================================
-- STEP 6: SYSTEM
-- =============================================================================

CREATE TABLE kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC(14,2) NOT NULL DEFAULT 0,
  target NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'st',
  status TEXT NOT NULL DEFAULT 'GREEN', -- GREEN, YELLOW, RED
  trend TEXT DEFAULT 'STABLE', -- UP, DOWN, STABLE
  category TEXT,
  period TEXT, -- e.g. '2026-W12', '2026-03', '2026-Q1'
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kpis_org ON kpis(org_id);
CREATE INDEX idx_kpis_name ON kpis(org_id, name);
CREATE INDEX idx_kpis_period ON kpis(org_id, period);

CREATE TABLE configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, key)
);

CREATE INDEX idx_configs_org ON configs(org_id);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_org ON audit_log(org_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(org_id, created_at DESC);
