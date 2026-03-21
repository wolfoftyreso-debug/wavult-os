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
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- =============================================================================
-- STEP 7: CAPABILITY
-- =============================================================================

CREATE TABLE capability_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, code)
);

CREATE INDEX idx_cap_domains_org ON capability_domains(org_id);

CREATE TABLE capabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES capability_domains(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_level assessment_level DEFAULT 'L3',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_capabilities_org ON capabilities(org_id);
CREATE INDEX idx_capabilities_domain ON capabilities(domain_id);

CREATE TABLE role_capabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  capability_id UUID NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
  required_level assessment_level NOT NULL DEFAULT 'L3',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, role, capability_id)
);

CREATE INDEX idx_role_cap_org ON role_capabilities(org_id);

CREATE TABLE user_capabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capability_id UUID NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
  current_level assessment_level NOT NULL DEFAULT 'L1',
  target_level assessment_level DEFAULT 'L3',
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assessed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, capability_id)
);

CREATE INDEX idx_user_cap_user ON user_capabilities(user_id);
CREATE INDEX idx_user_cap_org ON user_capabilities(org_id);

CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capability_id UUID NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
  level assessment_level NOT NULL,
  assessor_id UUID REFERENCES users(id),
  evidence TEXT,
  notes TEXT,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assessments_user ON assessments(user_id);
CREATE INDEX idx_assessments_org ON assessments(org_id);

CREATE TABLE development_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_plans_user ON development_plans(user_id);
CREATE INDEX idx_dev_plans_org ON development_plans(org_id);

CREATE TABLE development_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES development_plans(id) ON DELETE CASCADE,
  capability_id UUID NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  action_type dev_action_type NOT NULL DEFAULT 'PRACTICE',
  status dev_action_status NOT NULL DEFAULT 'PENDING',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_actions_plan ON development_actions(plan_id);
CREATE INDEX idx_dev_actions_org ON development_actions(org_id);
CREATE INDEX idx_dev_actions_status ON development_actions(org_id, status);

CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  current_value NUMERIC(14,2) DEFAULT 0,
  target_value NUMERIC(14,2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'st',
  status goal_status NOT NULL DEFAULT 'ACTIVE',
  readiness INTEGER DEFAULT 0 CHECK (readiness >= 0 AND readiness <= 100),
  start_date DATE,
  end_date DATE,
  owner_id UUID REFERENCES users(id),
  parent_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goals_org ON goals(org_id);
CREATE INDEX idx_goals_status ON goals(org_id, status);
CREATE INDEX idx_goals_owner ON goals(owner_id);

CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capability_id UUID REFERENCES capabilities(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_to ON feedback(to_user_id);
CREATE INDEX idx_feedback_org ON feedback(org_id);

-- =============================================================================
-- STEP 8: PROCESS ENGINE
-- =============================================================================

CREATE TABLE processes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  avg_duration_min INTEGER DEFAULT 0,
  steps JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, code)
);

CREATE INDEX idx_processes_org ON processes(org_id);

CREATE TABLE process_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  status process_execution_status NOT NULL DEFAULT 'RUNNING',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_min INTEGER,
  executed_by UUID REFERENCES users(id),
  data JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proc_exec_org ON process_executions(org_id);
CREATE INDEX idx_proc_exec_process ON process_executions(process_id);
CREATE INDEX idx_proc_exec_status ON process_executions(org_id, status);

CREATE TABLE non_conformances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity nc_severity NOT NULL DEFAULT 'MINOR',
  status nc_status NOT NULL DEFAULT 'OPEN',
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,
  process_id UUID REFERENCES processes(id) ON DELETE SET NULL,
  process_execution_id UUID REFERENCES process_executions(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  detected_at DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_at DATE,
  days_open INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, code)
);

CREATE INDEX idx_nc_org ON non_conformances(org_id);
CREATE INDEX idx_nc_status ON non_conformances(org_id, status);
CREATE INDEX idx_nc_severity ON non_conformances(org_id, severity);
CREATE INDEX idx_nc_process ON non_conformances(process_id);

-- Trigger to compute days_open (CURRENT_DATE is not immutable, cannot use GENERATED ALWAYS AS)
CREATE OR REPLACE FUNCTION compute_days_open()
RETURNS TRIGGER AS $$
BEGIN
  NEW.days_open := CASE
    WHEN NEW.closed_at IS NOT NULL THEN NEW.closed_at - NEW.detected_at
    ELSE CURRENT_DATE - NEW.detected_at
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nc_days_open
  BEFORE INSERT OR UPDATE ON non_conformances
  FOR EACH ROW EXECUTE FUNCTION compute_days_open();

CREATE TABLE improvements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status improvement_status NOT NULL DEFAULT 'IDEA',
  pdca_phase pdca_phase,
  impact INTEGER CHECK (impact >= 1 AND impact <= 5),
  effort INTEGER CHECK (effort >= 1 AND effort <= 5),
  nc_id UUID REFERENCES non_conformances(id) ON DELETE SET NULL,
  process_id UUID REFERENCES processes(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES users(id),
  planned_date DATE,
  completed_at TIMESTAMPTZ,
  results TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, code)
);

CREATE INDEX idx_improvements_org ON improvements(org_id);
CREATE INDEX idx_improvements_status ON improvements(org_id, status);
CREATE INDEX idx_improvements_pdca ON improvements(org_id, pdca_phase);

CREATE TABLE compliance_standards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version TEXT,
  description TEXT,
  total_requirements INTEGER DEFAULT 0,
  next_audit_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comp_standards_org ON compliance_standards(org_id);

CREATE TABLE compliance_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  standard_id UUID NOT NULL REFERENCES compliance_standards(id) ON DELETE CASCADE,
  clause TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status compliance_status NOT NULL DEFAULT 'NOT_ASSESSED',
  evidence TEXT,
  notes TEXT,
  assessed_by UUID REFERENCES users(id),
  assessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comp_req_standard ON compliance_requirements(standard_id);
CREATE INDEX idx_comp_req_org ON compliance_requirements(org_id);
CREATE INDEX idx_comp_req_status ON compliance_requirements(org_id, status);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status document_status NOT NULL DEFAULT 'DRAFT',
  version INTEGER DEFAULT 1,
  file_url TEXT,
  file_type TEXT,
  process_id UUID REFERENCES processes(id) ON DELETE SET NULL,
  standard_id UUID REFERENCES compliance_standards(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  review_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, code)
);

CREATE INDEX idx_documents_org ON documents(org_id);
CREATE INDEX idx_documents_status ON documents(org_id, status);
CREATE INDEX idx_documents_process ON documents(process_id);

CREATE TABLE audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  standard_id UUID REFERENCES compliance_standards(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  audit_type TEXT NOT NULL DEFAULT 'INTERNAL', -- INTERNAL, EXTERNAL, SURVEILLANCE
  status audit_status NOT NULL DEFAULT 'PLANNED',
  scheduled_date DATE,
  completed_date DATE,
  lead_auditor UUID REFERENCES users(id),
  findings JSONB DEFAULT '[]',
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audits_org ON audits(org_id);
CREATE INDEX idx_audits_standard ON audits(standard_id);
CREATE INDEX idx_audits_status ON audits(org_id, status);

CREATE TABLE risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category risk_category NOT NULL DEFAULT 'OPERATIONAL',
  probability INTEGER NOT NULL CHECK (probability >= 1 AND probability <= 5),
  impact INTEGER NOT NULL CHECK (impact >= 1 AND impact <= 5),
  risk_score INTEGER DEFAULT 0,
  risk_level risk_level NOT NULL DEFAULT 'MEDIUM',
  mitigation TEXT,
  owner_id UUID REFERENCES users(id),
  process_id UUID REFERENCES processes(id) ON DELETE SET NULL,
  review_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, code)
);

CREATE INDEX idx_risks_org ON risks(org_id);
CREATE INDEX idx_risks_level ON risks(org_id, risk_level);
CREATE INDEX idx_risks_category ON risks(org_id, category);

-- Trigger to compute risk_score (avoids GENERATED ALWAYS AS compatibility issues)
CREATE OR REPLACE FUNCTION compute_risk_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.risk_score := NEW.probability * NEW.impact;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_risk_score
  BEFORE INSERT OR UPDATE ON risks
  FOR EACH ROW EXECUTE FUNCTION compute_risk_score();

CREATE TABLE training_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  training_type TEXT, -- INTERNAL, EXTERNAL, SELF_STUDY, ON_THE_JOB
  status training_status NOT NULL DEFAULT 'PLANNED',
  provider TEXT,
  capability_id UUID REFERENCES capabilities(id) ON DELETE SET NULL,
  process_id UUID REFERENCES processes(id) ON DELETE SET NULL,
  hours NUMERIC(6,1) DEFAULT 0,
  cost NUMERIC(14,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  scheduled_date DATE,
  completed_date DATE,
  certificate_url TEXT,
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_training_user ON training_records(user_id);
CREATE INDEX idx_training_org ON training_records(org_id);
CREATE INDEX idx_training_status ON training_records(org_id, status);

-- =============================================================================
-- STEP 9: CURRENCY
-- =============================================================================

CREATE TABLE currencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,        -- ISO 4217: EUR, SEK, USD
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimal_places INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, code)
);

CREATE INDEX idx_currencies_org ON currencies(org_id);

CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC(12,6) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT DEFAULT 'MANUAL', -- MANUAL, ECB, API
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, from_currency, to_currency, effective_date)
);

CREATE INDEX idx_fx_rates_org ON exchange_rates(org_id);
CREATE INDEX idx_fx_rates_pair ON exchange_rates(org_id, from_currency, to_currency, effective_date DESC);

CREATE TABLE fx_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  original_amount NUMERIC(14,2) NOT NULL,
  original_currency TEXT NOT NULL,
  original_rate NUMERIC(12,6) NOT NULL,
  new_rate NUMERIC(12,6) NOT NULL,
  adjustment_amount NUMERIC(14,2) NOT NULL, -- in reporting currency
  adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  account_code TEXT NOT NULL DEFAULT '3960', -- BAS: Valutakursdifferenser
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fx_adj_org ON fx_adjustments(org_id);
CREATE INDEX idx_fx_adj_transaction ON fx_adjustments(transaction_id);
CREATE INDEX idx_fx_adj_date ON fx_adjustments(org_id, adjustment_date);

-- =============================================================================
-- UPDATED_AT TRIGGERS (apply to all tables with updated_at)
-- =============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
      AND table_name NOT IN ('audit_log', 'exchange_rates', 'fx_adjustments', 'meeting_attendees', 'assessments', 'feedback')
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE capability_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_conformances ENABLE ROW LEVEL SECURITY;
ALTER TABLE improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fx_adjustments ENABLE ROW LEVEL SECURITY;

-- Helper function: get org_id for current auth user
CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get user role for current auth user
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Organizations: users can only see their own org
CREATE POLICY org_select ON organizations FOR SELECT
  USING (id = auth_org_id());
CREATE POLICY org_update ON organizations FOR UPDATE
  USING (id = auth_org_id() AND auth_user_role() = 'ADMIN');

-- Generic org-based policies (SELECT for all members, INSERT/UPDATE/DELETE for ADMIN/MANAGER)
-- Apply to all org_id-bearing tables using a DO block

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'org_id'
      AND table_schema = 'public'
      AND table_name != 'organizations'
  LOOP
    -- SELECT: any org member can read
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (org_id = auth_org_id())',
      tbl || '_select', tbl
    );
    -- INSERT: any org member can insert into their org
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (org_id = auth_org_id())',
      tbl || '_insert', tbl
    );
    -- UPDATE: any org member can update within their org
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE USING (org_id = auth_org_id())',
      tbl || '_update', tbl
    );
    -- DELETE: only ADMIN can delete
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE USING (org_id = auth_org_id() AND auth_user_role() = ''ADMIN'')',
      tbl || '_delete', tbl
    );
  END LOOP;
END;
$$;

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Organization
INSERT INTO organizations (id, name, slug, domain, reporting_currency) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Hypbit AB', 'hypbit', 'hypbit.com', 'EUR');

-- Users (5 team members matching dashboard)
INSERT INTO users (id, org_id, email, full_name, role, title) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'erik@hypbit.com',    'Erik',    'ADMIN',   'Arkitekt'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'leon@hypbit.com',    'Leon',    'MANAGER', 'CEO'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'johan@hypbit.com',   'Johan',   'OPS',     'IT'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'dennis@hypbit.com',  'Dennis',  'OPS',     'OPS'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'winston@hypbit.com', 'Winston', 'FINANCE', 'CFO');

-- Companies (5)
INSERT INTO companies (id, org_id, name, industry, city, country, created_by) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Kommun X',              'Government',    'Stockholm', 'SE', 'b0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Fastighetsbolaget AB',  'Real Estate',   'Goteborg',  'SE', 'b0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Nordic Inspect Oy',     'Inspection',    'Helsinki',  'FI', 'b0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Baltic Property UAB',   'Real Estate',   'Vilnius',   'LT', 'b0000000-0000-0000-0000-000000000004'),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Scandinavian Foto AB',  'Photography',   'Malmo',     'SE', 'b0000000-0000-0000-0000-000000000004');

-- Contacts (5)
INSERT INTO contacts (id, org_id, company_id, first_name, last_name, email, title, is_primary, created_by) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Anna',   'Lindgren',   'anna@kommunx.se',         'Upphandlare',    TRUE,  'b0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Fredrik', 'Johansson',  'fredrik@fastighetsb.se',  'VD',             TRUE,  'b0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Mikko',  'Virtanen',    'mikko@nordic-inspect.fi', 'COO',            TRUE,  'b0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Dovile', 'Kazlauskaite', 'dovile@balticprop.lt',    'Jurist',         TRUE,  'b0000000-0000-0000-0000-000000000004'),
  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'Maria',  'Svensson',    'maria@scanfoto.se',       'Fotograf-chef',  TRUE,  'b0000000-0000-0000-0000-000000000004');

-- Leads (3)
INSERT INTO leads (id, org_id, contact_id, company_id, title, status, source, assigned_to, created_by) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Kommun X droneinspektion',   'QUALIFIED', 'REFERRAL', 'b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'Nordic Inspect partnerskap', 'CONTACTED', 'OUTBOUND', 'b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 'Baltic Property fasader',    'NEW',       'INBOUND',  'b0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004');

-- Deals (5 with mixed EUR/USD/SEK to match pipeline: NEW=12000, QUALIFIED=18000, DEMO=15000, OFFER=8000, WON=11000)
INSERT INTO deals (id, org_id, lead_id, company_id, contact_id, title, status, amount, currency, exchange_rate, reporting_amount, probability, expected_close, assigned_to, created_by) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
   'Kommun X droneinspektion',     'DEMO',      15000.00, 'EUR', 1.000000, 15000.00, 60, '2026-04-15', 'b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002'),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', NULL, 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002',
   'Fastighetsbolaget fullservice', 'WON',       5500.00,  'EUR', 1.000000, 5500.00,  100, '2026-03-10', 'b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002'),
  ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003',
   'Nordic Inspect SaaS-licens',   'QUALIFIED', 18000.00, 'EUR', 1.000000, 18000.00, 40, '2026-05-01', 'b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002'),
  ('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004',
   'Baltic Property fasadinspektion', 'NEW',     12000.00, 'USD', 0.920000, 11040.00, 20, '2026-06-01', 'b0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004'),
  ('f0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', NULL, 'c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005',
   'Scanfoto samarbetsavtal',       'WON',       60000.00, 'SEK', 0.087000, 5220.00,  100, '2026-03-05', 'b0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004');

-- Tasks (9 - matching dashboard + extras)
INSERT INTO tasks (id, org_id, title, status, priority, due_date, assigned_to, deal_id, created_by) VALUES
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Boka demo: Kommun X',              'IN_PROGRESS', 1, '2026-03-19', 'b0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Supabase schema deploy',           'TODO',        1, '2026-03-21', 'b0000000-0000-0000-0000-000000000003', NULL, 'b0000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'UAB namnbyte',                     'IN_PROGRESS', 2, '2026-03-22', 'b0000000-0000-0000-0000-000000000004', NULL, 'b0000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Budget Q1-Q4',                     'TODO',        2, '2026-03-23', 'b0000000-0000-0000-0000-000000000005', NULL, 'b0000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Onboarding: Fastighetsbolaget',    'TODO',        3, '2026-03-24', 'b0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Offert Nordic Inspect',            'TODO',        2, '2026-03-25', 'b0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Setup CI/CD pipeline',             'IN_PROGRESS', 2, '2026-03-20', 'b0000000-0000-0000-0000-000000000003', NULL, 'b0000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Fakturering Fastighetsbolaget',    'TODO',        1, '2026-03-20', 'b0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Kontakta Baltic Property jurist',  'TODO',        3, '2026-03-26', 'b0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004');

-- Meetings
INSERT INTO meetings (id, org_id, title, starts_at, ends_at, deal_id, created_by) VALUES
  ('11000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Demo Kommun X',           '2026-03-19 10:00+01', '2026-03-19 11:00+01', 'f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002'),
  ('11000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Veckostatus team',        '2026-03-18 09:00+01', '2026-03-18 09:30+01', NULL, 'b0000000-0000-0000-0000-000000000001');

-- Meeting attendees
INSERT INTO meeting_attendees (meeting_id, user_id) VALUES
  ('11000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002'),
  ('11000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004'),
  ('11000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001'),
  ('11000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002'),
  ('11000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003'),
  ('11000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004'),
  ('11000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000005');

-- Decisions (3 matching dashboard)
INSERT INTO decisions (id, org_id, title, rationale, decided_by, decided_at) VALUES
  ('12000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Supabase som primar DB',          'Noll drift.',                  'b0000000-0000-0000-0000-000000000001', '2026-03-18'),
  ('12000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Gruppchatt istallet for Slack',   '5 pers. Hypbit visar status.', 'b0000000-0000-0000-0000-000000000001', '2026-03-16'),
  ('12000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Claude Code som kodverktyg',      'Samma Claude.',                'b0000000-0000-0000-0000-000000000001', '2026-03-15');

-- Transactions (14 entries, 3 currencies, Swedish BAS chart of accounts)
-- Matching trial balance: 1000 Kassa D=15400, 3000 Eget kapital C=10000, 4100 Serviceintakt C=5400
INSERT INTO transactions (id, org_id, account_code, account_name, debit, credit, currency, exchange_rate, reporting_debit, reporting_credit, description, booked_at, created_by) VALUES
  -- Eget kapital insats (EUR)
  ('13000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '1930', 'Bank EUR',         10000.00, 0,        'EUR', 1.000000, 10000.00, 0,        'Grundkapital insats',                '2026-01-15', 'b0000000-0000-0000-0000-000000000005'),
  ('13000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '2081', 'Eget kapital',     0,        10000.00, 'EUR', 1.000000, 0,        10000.00, 'Grundkapital insats',                '2026-01-15', 'b0000000-0000-0000-0000-000000000005'),
  -- Fastighetsbolaget betalning (EUR)
  ('13000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '1930', 'Bank EUR',         5500.00,  0,        'EUR', 1.000000, 5500.00,  0,        'Betalning Fastighetsbolaget',        '2026-03-12', 'b0000000-0000-0000-0000-000000000005'),
  ('13000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '3011', 'Serviceintakt EU', 0,        5500.00,  'EUR', 1.000000, 0,        5500.00,  'Betalning Fastighetsbolaget',        '2026-03-12', 'b0000000-0000-0000-0000-000000000005'),
  -- Scanfoto betalning (SEK -> EUR)
  ('13000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '1930', 'Bank EUR',         5220.00,  0,        'SEK', 0.087000, 5220.00,  0,        'Betalning Scanfoto (60000 SEK)',     '2026-03-08', 'b0000000-0000-0000-0000-000000000005'),
  ('13000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', '3012', 'Serviceintakt SE', 0,        5220.00,  'SEK', 0.087000, 0,        5220.00,  'Betalning Scanfoto (60000 SEK)',     '2026-03-08', 'b0000000-0000-0000-0000-000000000005'),
  -- Kontorskostnader (EUR)
  ('13000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', '5010', 'Kontorskostnader', 800.00,   0,        'EUR', 1.000000, 800.00,   0,        'Coworking Q1',                      '2026-02-01', 'b0000000-0000-0000-0000-000000000005'),
  ('13000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', '1930', 'Bank EUR',         0,        800.00,   'EUR', 1.000000, 0,        800.00,   'Coworking Q1',                      '2026-02-01', 'b0000000-0000-0000-0000-000000000005'),
  -- Supabase prenumeration (USD -> EUR)
  ('13000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', '6540', 'IT-tjanster',      23.00,    0,        'USD', 0.920000, 23.00,    0,        'Supabase Pro mars',                 '2026-03-01', 'b0000000-0000-0000-0000-000000000003'),
  ('13000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', '1930', 'Bank EUR',         0,        23.00,    'USD', 0.920000, 0,        23.00,    'Supabase Pro mars',                 '2026-03-01', 'b0000000-0000-0000-0000-000000000003'),
  -- Vercel hosting (USD -> EUR)
  ('13000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', '6540', 'IT-tjanster',      18.40,    0,        'USD', 0.920000, 18.40,    0,        'Vercel Pro mars',                   '2026-03-01', 'b0000000-0000-0000-0000-000000000003'),
  ('13000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', '1930', 'Bank EUR',         0,        18.40,    'USD', 0.920000, 0,        18.40,    'Vercel Pro mars',                   '2026-03-01', 'b0000000-0000-0000-0000-000000000003'),
  -- Claude Code (USD -> EUR)
  ('13000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', '6540', 'IT-tjanster',      184.00,   0,        'USD', 0.920000, 184.00,   0,        'Claude Code Team mars',             '2026-03-01', 'b0000000-0000-0000-0000-000000000001'),
  ('13000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', '1930', 'Bank EUR',         0,        184.00,   'USD', 0.920000, 0,        184.00,   'Claude Code Team mars',             '2026-03-01', 'b0000000-0000-0000-0000-000000000001');

-- Invoices
INSERT INTO invoices (id, org_id, invoice_number, deal_id, company_id, amount, currency, exchange_rate, reporting_amount, status, issued_at, due_at, paid_at, created_by) VALUES
  ('14000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'HYP-2026-001', 'f0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 5500.00,  'EUR', 1.000000, 5500.00, 'PAID', '2026-03-10', '2026-04-10', '2026-03-12', 'b0000000-0000-0000-0000-000000000005'),
  ('14000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'HYP-2026-002', 'f0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', 60000.00, 'SEK', 0.087000, 5220.00, 'PAID', '2026-03-05', '2026-04-05', '2026-03-08', 'b0000000-0000-0000-0000-000000000005');

-- Payouts
INSERT INTO payouts (id, org_id, recipient, amount, currency, exchange_rate, reporting_amount, status, description, approved_by, approved_at, paid_at, created_by) VALUES
  ('15000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Coworking AB',     800.00, 'EUR', 1.000000, 800.00, 'PAID',    'Coworking Q1',       'b0000000-0000-0000-0000-000000000005', '2026-02-01', '2026-02-01', 'b0000000-0000-0000-0000-000000000005'),
  ('15000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Supabase Inc.',    25.00,  'USD', 0.920000, 23.00,  'PAID',    'Supabase Pro mars',  'b0000000-0000-0000-0000-000000000005', '2026-03-01', '2026-03-01', 'b0000000-0000-0000-0000-000000000003'),
  ('15000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Vercel Inc.',      20.00,  'USD', 0.920000, 18.40,  'PAID',    'Vercel Pro mars',    'b0000000-0000-0000-0000-000000000005', '2026-03-01', '2026-03-01', 'b0000000-0000-0000-0000-000000000003');

-- Channels (5 matching dashboard)
INSERT INTO channels (id, org_id, name, slug, is_default, created_by) VALUES
  ('16000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Sales',     'sales',     TRUE,  'b0000000-0000-0000-0000-000000000001'),
  ('16000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Product',   'product',   TRUE,  'b0000000-0000-0000-0000-000000000001'),
  ('16000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'OPS',       'ops',       TRUE,  'b0000000-0000-0000-0000-000000000001'),
  ('16000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Finance',   'finance',   TRUE,  'b0000000-0000-0000-0000-000000000001'),
  ('16000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Decisions', 'decisions', TRUE,  'b0000000-0000-0000-0000-000000000001');

-- Messages (5 matching dashboard)
INSERT INTO messages (org_id, channel_id, user_id, content, is_system) VALUES
  ('a0000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', NULL,                                  'Fastighetsbolaget signerat! EUR 5 500', TRUE),
  ('a0000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '5 nya kontakter i pipeline',            FALSE),
  ('a0000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', 'Juristkontakt Vilnius svarade',         FALSE),
  ('a0000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000004', NULL,                                  'Betalning: EUR 5 500',                  TRUE),
  ('a0000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'Schema redo for deploy',                FALSE);

-- KPIs (5 matching dashboard)
INSERT INTO kpis (org_id, name, value, target, unit, status, trend, category, period) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Pipeline',     64000, 50000, 'EUR', 'GREEN',  'UP',     'SALES',   '2026-W12'),
  ('a0000000-0000-0000-0000-000000000001', 'Leads/v',      7,     10,    'st',  'YELLOW', 'UP',     'SALES',   '2026-W12'),
  ('a0000000-0000-0000-0000-000000000001', 'Forsenade',    1,     0,     'st',  'YELLOW', 'STABLE', 'OPS',     '2026-W12'),
  ('a0000000-0000-0000-0000-000000000001', 'Trial Bal.',   0,     0,     'EUR', 'GREEN',  'STABLE', 'FINANCE', '2026-W12'),
  ('a0000000-0000-0000-0000-000000000001', 'Runway',       8.2,   6,     'man', 'GREEN',  'STABLE', 'FINANCE', '2026-W12');

-- Configs
INSERT INTO configs (org_id, key, value, description) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'reporting_currency', '"EUR"',           'Default reporting currency'),
  ('a0000000-0000-0000-0000-000000000001', 'fiscal_year_start',  '"01-01"',         'Fiscal year start month-day'),
  ('a0000000-0000-0000-0000-000000000001', 'bas_chart_version',  '"2024"',          'Swedish BAS chart of accounts version'),
  ('a0000000-0000-0000-0000-000000000001', 'vat_rates',          '[0, 6, 12, 25]',    'VAT rates in percent'),
  ('a0000000-0000-0000-0000-000000000001', 'invoice_prefix',     '"HYP"',           'Invoice number prefix');

-- Capability Domains (5 matching dashboard heatmap)
INSERT INTO capability_domains (id, org_id, name, code, sort_order) VALUES
  ('17000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Execution',     'Exec', 1),
  ('17000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Planning',      'Plan', 2),
  ('17000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Decision',      'Dec',  3),
  ('17000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Technology',    'Tech', 4),
  ('17000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Leadership',    'Lead', 5);

-- Capabilities (7 matching dashboard heatmap)
INSERT INTO capabilities (id, org_id, domain_id, name, target_level, sort_order) VALUES
  ('18000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000001', 'Task Completion',   'L4', 1),
  ('18000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000001', 'Quality Focus',     'L4', 2),
  ('18000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000002', 'Prioritization',    'L3', 3),
  ('18000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000003', 'Data-driven Dec.',  'L3', 4),
  ('18000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000003', 'Problem Solving',   'L3', 5),
  ('18000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000004', 'System Usage',      'L3', 6),
  ('18000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000005', 'Process Ownership', 'L3', 7);

-- User Capabilities (35 = 5 users x 7 capabilities, matching heatmap)
INSERT INTO user_capabilities (org_id, user_id, capability_id, current_level, target_level, assessed_by) VALUES
  -- Erik (E): L5, L5, L5, L5, L5, L5, L5
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000001', 'L5', 'L5', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000002', 'L5', 'L5', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000003', 'L5', 'L5', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000004', 'L5', 'L5', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000005', 'L5', 'L5', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000006', 'L5', 'L5', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000007', 'L5', 'L5', 'b0000000-0000-0000-0000-000000000001'),
  -- Leon (L): L3, L2, L2, L2, L3, L3, L3
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000001', 'L3', 'L4', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000002', 'L2', 'L4', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000003', 'L2', 'L3', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000004', 'L2', 'L3', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000005', 'L3', 'L3', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000006', 'L3', 'L3', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000007', 'L3', 'L3', 'b0000000-0000-0000-0000-000000000001'),
  -- Johan (J): L4, L4, L3, L3, L4, L5, L4
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000001', 'L4', 'L4', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000002', 'L4', 'L4', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000003', 'L3', 'L3', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000004', 'L3', 'L3', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000005', 'L4', 'L4', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000006', 'L5', 'L5', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000007', 'L4', 'L4', 'b0000000-0000-0000-0000-000000000001'),
  -- Dennis (Dn): L4, L3, L3, L2, L3, L3, L3
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', '18000000-0000-0000-0000-000000000001', 'L4', 'L4', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', '18000000-0000-0000-0000-000000000002', 'L3', 'L4', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', '18000000-0000-0000-0000-000000000003', 'L3', 'L3', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', '18000000-0000-0000-0000-000000000004', 'L2', 'L3', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', '18000000-0000-0000-0000-000000000005', 'L3', 'L3', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', '18000000-0000-0000-0000-000000000006', 'L3', 'L3', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', '18000000-0000-0000-0000-000000000007', 'L3', 'L3', 'b0000000-0000-0000-0000-000000000001'),
  -- Winston (W): L4, L4, L3, L4, L3, L3, L3
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', '18000000-0000-0000-0000-000000000001', 'L4', 'L4', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', '18000000-0000-0000-0000-000000000002', 'L4', 'L4', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', '18000000-0000-0000-0000-000000000003', 'L3', 'L3', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', '18000000-0000-0000-0000-000000000004', 'L4', 'L4', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', '18000000-0000-0000-0000-000000000005', 'L3', 'L3', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', '18000000-0000-0000-0000-000000000006', 'L3', 'L3', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', '18000000-0000-0000-0000-000000000007', 'L3', 'L3', 'b0000000-0000-0000-0000-000000000001');

-- Development Plans (Leon)
INSERT INTO development_plans (id, org_id, user_id, title, period_start, period_end, status, created_by) VALUES
  ('19000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Leon Q2 2026', '2026-04-01', '2026-06-30', 'ACTIVE', 'b0000000-0000-0000-0000-000000000001');

-- Development Actions (matching dashboard devPlans)
INSERT INTO development_actions (org_id, plan_id, capability_id, title, action_type, status, due_date) VALUES
  ('a0000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000003', '8-lagersanalys pa varje deal',  'PRACTICE',  'ACTIVE',  '2026-04-15'),
  ('a0000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000004', '3 sessioner med Erik',          'COACHING',  'PENDING', '2026-04-30');

-- Goals (3 matching dashboard)
INSERT INTO goals (org_id, title, current_value, target_value, unit, status, readiness, end_date, owner_id, created_by) VALUES
  ('a0000000-0000-0000-0000-000000000001', '3 betalande kunder',    1, 3, 'kunder', 'ACTIVE',   70, '2026-06-15', 'b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'Hypbit i full drift',   3, 5, 'pers',   'ON_TRACK',  60, '2026-04-30', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'UAB Litauen',           0, 1, 'bolag',  'ACTIVE',   40, '2026-06-30', 'b0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001');

-- Feedback
INSERT INTO feedback (org_id, from_user_id, to_user_id, capability_id, content, rating) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000003', 'Behover fokusera mer pa prioritering av deals efter storlek, inte bara aktivitet.', 3),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000006', 'Utmarkt systemkunnande, hjalper hela teamet.', 5);

-- Processes (4 matching dashboard)
INSERT INTO processes (id, org_id, code, name, description, owner_id, avg_duration_min) VALUES
  ('1a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'PROC-001', 'Deal till Kund onboarding',  'Fran won deal till aktiv kund.',      'b0000000-0000-0000-0000-000000000002', 45),
  ('1a000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'PROC-002', 'Inspektion end-to-end',      'Fran bokning till leverans.',         'b0000000-0000-0000-0000-000000000004', 120),
  ('1a000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'PROC-003', 'Manadsavstamning',           'Finansiell manadsstangning.',         'b0000000-0000-0000-0000-000000000005', 60),
  ('1a000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'PROC-004', 'Ny fotograf onboarding',     'Kvalificering och certifiering.',     'b0000000-0000-0000-0000-000000000004', 30);

-- Process Executions (matching runs30d in dashboard)
INSERT INTO process_executions (org_id, process_id, status, started_at, completed_at, duration_min, executed_by) VALUES
  ('a0000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001', 'COMPLETED', '2026-03-10 09:00+01', '2026-03-10 09:50+01', 50,  'b0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001', 'COMPLETED', '2026-03-05 10:00+01', '2026-03-05 10:40+01', 40,  'b0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001', 'RUNNING',   '2026-03-15 14:00+01', NULL,                  NULL, 'b0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000002', 'COMPLETED', '2026-03-01 08:00+01', '2026-03-01 10:00+01', 120, 'b0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000002', 'COMPLETED', '2026-03-04 08:00+01', '2026-03-04 10:15+01', 135, 'b0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000002', 'COMPLETED', '2026-03-07 08:00+01', '2026-03-07 09:45+01', 105, 'b0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000002', 'COMPLETED', '2026-03-10 08:00+01', '2026-03-10 10:05+01', 125, 'b0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000002', 'COMPLETED', '2026-03-12 08:00+01', '2026-03-12 10:00+01', 120, 'b0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000002', 'COMPLETED', '2026-03-14 08:00+01', '2026-03-14 09:55+01', 115, 'b0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000002', 'COMPLETED', '2026-03-16 08:00+01', '2026-03-16 10:00+01', 120, 'b0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000002', 'RUNNING',   '2026-03-18 08:00+01', NULL,                  NULL, 'b0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000003', 'COMPLETED', '2026-03-01 16:00+01', '2026-03-01 17:00+01', 60,  'b0000000-0000-0000-0000-000000000005'),
  ('a0000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000004', 'COMPLETED', '2026-03-02 09:00+01', '2026-03-02 09:25+01', 25,  'b0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000004', 'COMPLETED', '2026-03-09 09:00+01', '2026-03-09 09:35+01', 35,  'b0000000-0000-0000-0000-000000000004');

-- Non-Conformances (3 matching dashboard)
INSERT INTO non_conformances (id, org_id, code, title, severity, status, process_id, assigned_to, reported_by, detected_at, closed_at) VALUES
  ('1b000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'NC-2026-001', 'Faktura utan deal-koppling',         'MINOR', 'ANALYZING',      '1a000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005', '2026-03-15', NULL),
  ('1b000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'NC-2026-002', 'Fotograf levererade utan QC',        'MAJOR', 'ACTION_PLANNED', '1a000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', '2026-03-11', NULL),
  ('1b000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'NC-2026-003', 'Kund fick rapport med fel adress',   'MINOR', 'CLOSED',         '1a000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', '2026-03-14', '2026-03-16');

-- Improvements (3 matching dashboard PDCA)
INSERT INTO improvements (id, org_id, code, title, status, pdca_phase, impact, effort, owner_id, created_by) VALUES
  ('1c000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'IMP-2026-001', 'Auto-QC pa alla foton vid upload',          'IMPLEMENTING', 'DO',   5, 3, 'b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003'),
  ('1c000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'IMP-2026-002', 'GPS-verifiering vid inspektionsstart',       'APPROVED',     'PLAN', 4, 2, 'b0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004'),
  ('1c000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'IMP-2026-003', 'NPS-enkat automatiskt efter leverans',       'IDEA',         NULL,   3, 1, 'b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002');

-- Compliance Standards (2 matching dashboard)
INSERT INTO compliance_standards (id, org_id, name, version, total_requirements, next_audit_date) VALUES
  ('1d000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ISO 9001:2015', '2015', 52, '2026-09-15'),
  ('1d000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'ISO 27001',     '2022', 40, '2027-01-20');

-- Compliance Requirements (sample)
INSERT INTO compliance_requirements (org_id, standard_id, clause, title, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', '4.1', 'Understanding the organization',  'CONFORMING'),
  ('a0000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', '4.2', 'Understanding needs of parties',   'CONFORMING'),
  ('a0000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', '5.1', 'Leadership and commitment',        'CONFORMING'),
  ('a0000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', '6.1', 'Actions to address risks',         'PARTIAL'),
  ('a0000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', '7.1', 'Resources',                        'CONFORMING'),
  ('a0000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', '8.1', 'Operational planning',             'NON_CONFORMING'),
  ('a0000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', '9.1', 'Monitoring and measurement',       'PARTIAL'),
  ('a0000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000002', '5.1', 'Information security policy',      'CONFORMING'),
  ('a0000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000002', '6.1', 'Risk assessment',                  'PARTIAL'),
  ('a0000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000002', '7.1', 'Support',                          'NON_CONFORMING'),
  ('a0000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000002', '8.1', 'Operational planning',             'NOT_ASSESSED');

-- Documents
INSERT INTO documents (org_id, code, title, status, version, process_id, created_by) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'DOC-001', 'Kvalitetsmanual',              'APPROVED', 1, NULL,                                  'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'DOC-002', 'Inspektionsprocedur',          'APPROVED', 2, '1a000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000001', 'DOC-003', 'Informationssakerhetspolicy',  'DRAFT',    1, NULL,                                  'b0000000-0000-0000-0000-000000000001');

-- Audits
INSERT INTO audits (org_id, standard_id, title, audit_type, status, scheduled_date, lead_auditor) VALUES
  ('a0000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', 'Intern revision ISO 9001 Q3',   'INTERNAL',     'PLANNED',    '2026-09-15', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000002', 'Gap-analys ISO 27001',          'INTERNAL',     'COMPLETED',  '2026-03-01', 'b0000000-0000-0000-0000-000000000001');

-- Risks (4 matching dashboard)
INSERT INTO risks (org_id, code, title, category, probability, impact, risk_level, mitigation, owner_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'RISK-001', 'Nyckelperson lamnar',    'OPERATIONAL', 3, 5, 'HIGH',   'Cross-training + dokumentation',        'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'RISK-002', 'Supabase driftstopp',    'TECHNICAL',   2, 4, 'MEDIUM', 'Daglig backup + migration plan',        'b0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'RISK-003', 'Valutarisk EUR/SEK',     'FINANCIAL',   4, 3, 'HIGH',   'Hedging + SEK-prissattning',            'b0000000-0000-0000-0000-000000000005'),
  ('a0000000-0000-0000-0000-000000000001', 'RISK-004', 'GDPR-overtradelse',      'LEGAL',       2, 5, 'MEDIUM', 'DPA + Privacy by Design',               'b0000000-0000-0000-0000-000000000001');

-- Training Records
INSERT INTO training_records (org_id, user_id, title, training_type, status, capability_id, hours, scheduled_date, completed_date) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Prioriteringsworkshop',     'INTERNAL',  'PLANNED',    '18000000-0000-0000-0000-000000000003', 4,  '2026-04-10', NULL),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'Supabase Advanced',         'SELF_STUDY', 'COMPLETED', '18000000-0000-0000-0000-000000000006', 8,  '2026-02-15', '2026-03-01'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'Dronepilot certifiering',   'EXTERNAL',  'IN_PROGRESS', NULL,                                   16, '2026-03-01', NULL),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'IFRS for smabolag',         'EXTERNAL',  'COMPLETED',  NULL,                                   24, '2026-01-20', '2026-02-28');

-- Currencies (3)
INSERT INTO currencies (org_id, code, name, symbol, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'EUR', 'Euro',          '€', TRUE),
  ('a0000000-0000-0000-0000-000000000001', 'SEK', 'Swedish Krona', 'kr',     TRUE),
  ('a0000000-0000-0000-0000-000000000001', 'USD', 'US Dollar',     '$',      TRUE);

-- Exchange Rates (recent rates)
INSERT INTO exchange_rates (org_id, from_currency, to_currency, rate, effective_date, source) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'SEK', 'EUR', 0.087000, '2026-03-18', 'ECB'),
  ('a0000000-0000-0000-0000-000000000001', 'USD', 'EUR', 0.920000, '2026-03-18', 'ECB'),
  ('a0000000-0000-0000-0000-000000000001', 'EUR', 'SEK', 11.494253, '2026-03-18', 'ECB'),
  ('a0000000-0000-0000-0000-000000000001', 'EUR', 'USD', 1.086957, '2026-03-18', 'ECB'),
  ('a0000000-0000-0000-0000-000000000001', 'SEK', 'EUR', 0.087500, '2026-03-01', 'ECB'),
  ('a0000000-0000-0000-0000-000000000001', 'USD', 'EUR', 0.920000, '2026-03-01', 'ECB');

-- FX Adjustments (sample)
INSERT INTO fx_adjustments (org_id, transaction_id, original_amount, original_currency, original_rate, new_rate, adjustment_amount, adjustment_date, account_code, description, created_by) VALUES
  ('a0000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000005', 60000.00, 'SEK', 0.087500, 0.087000, -30.00, '2026-03-18', '3960', 'Valutakursomrakning SEK -> EUR mars', 'b0000000-0000-0000-0000-000000000005');

-- Audit Log (sample entries)
INSERT INTO audit_log (org_id, user_id, action, entity_type, entity_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'UPDATE', 'deals', 'f0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'CREATE', 'invoices', '14000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'CREATE', 'decisions', '12000000-0000-0000-0000-000000000001');

-- Assessments (sample)
INSERT INTO assessments (org_id, user_id, capability_id, level, assessor_id, evidence) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000003', 'L2', 'b0000000-0000-0000-0000-000000000001', 'Behover stod med prioritering av deals.'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000006', 'L5', 'b0000000-0000-0000-0000-000000000001', 'Administrerar hela Supabase-miljon sjalvstandigt.');

-- Role Capabilities (sample required levels)
INSERT INTO role_capabilities (org_id, role, capability_id, required_level) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'ADMIN',   '18000000-0000-0000-0000-000000000001', 'L4'),
  ('a0000000-0000-0000-0000-000000000001', 'ADMIN',   '18000000-0000-0000-0000-000000000004', 'L4'),
  ('a0000000-0000-0000-0000-000000000001', 'MANAGER', '18000000-0000-0000-0000-000000000003', 'L3'),
  ('a0000000-0000-0000-0000-000000000001', 'MANAGER', '18000000-0000-0000-0000-000000000007', 'L3'),
  ('a0000000-0000-0000-0000-000000000001', 'OPS',     '18000000-0000-0000-0000-000000000001', 'L4'),
  ('a0000000-0000-0000-0000-000000000001', 'OPS',     '18000000-0000-0000-0000-000000000002', 'L4'),
  ('a0000000-0000-0000-0000-000000000001', 'FINANCE', '18000000-0000-0000-0000-000000000004', 'L4');

-- =============================================================================
-- DONE. Total: 40 tables, RLS enabled, triggers, indexes, seed data.
-- =============================================================================
