-- ============================================================================
-- QuixZoom — Temporal Workflows
-- File: 45_quixzoom_workflows.sql
-- Depends: 44_quixzoom_cis.sql
--
-- Generic workflow engine: state machines, steps, transitions, timers
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. WORKFLOW DEFINITIONS (templates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_workflow_defs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT        NOT NULL UNIQUE,
  name            TEXT        NOT NULL,
  description     TEXT,
  initial_state   TEXT        NOT NULL,
  terminal_states TEXT[]      NOT NULL,
  states          JSONB       NOT NULL,       -- { state: { transitions: [...], on_enter: [...], timeout_seconds: N } }
  version         INTEGER     NOT NULL DEFAULT 1,
  active          BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. WORKFLOW INSTANCES (running workflows)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_workflow_instances (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id   UUID        NOT NULL REFERENCES qz_workflow_defs(id),
  definition_slug TEXT        NOT NULL,
  entity_type     TEXT        NOT NULL,       -- payment, package, ir, withdrawal
  entity_id       UUID        NOT NULL,
  current_state   TEXT        NOT NULL,
  context         JSONB       NOT NULL DEFAULT '{}',  -- workflow-specific data
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  error           TEXT,
  retry_count     INTEGER     NOT NULL DEFAULT 0,
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_qz_wfi_state ON qz_workflow_instances(current_state);
CREATE INDEX IF NOT EXISTS idx_qz_wfi_entity ON qz_workflow_instances(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_qz_wfi_expires ON qz_workflow_instances(expires_at) WHERE completed_at IS NULL;

-- ============================================================================
-- 3. WORKFLOW STEPS (audit trail of every transition)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_workflow_steps (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id     UUID        NOT NULL REFERENCES qz_workflow_instances(id),
  from_state      TEXT        NOT NULL,
  to_state        TEXT        NOT NULL,
  trigger         TEXT        NOT NULL,       -- what caused the transition
  actor           TEXT,
  input           JSONB       DEFAULT '{}',
  output          JSONB       DEFAULT '{}',
  duration_ms     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qz_wfs_instance ON qz_workflow_steps(instance_id);

-- Immutable steps
DROP TRIGGER IF EXISTS trg_qz_wfs_immutable ON qz_workflow_steps;
CREATE TRIGGER trg_qz_wfs_immutable
  BEFORE UPDATE OR DELETE ON qz_workflow_steps
  FOR EACH ROW EXECUTE FUNCTION qx_ledger_immutable();

-- ============================================================================
-- 4. WORKFLOW TIMERS (scheduled state transitions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_workflow_timers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id     UUID        NOT NULL REFERENCES qz_workflow_instances(id),
  fires_at        TIMESTAMPTZ NOT NULL,
  trigger_name    TEXT        NOT NULL,       -- what transition to fire
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','fired','cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qz_wft_fires ON qz_workflow_timers(fires_at) WHERE status = 'pending';

-- ============================================================================
-- 5. INVOICES (generated from workflows)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qz_invoices (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID        REFERENCES qx_entities(id),
  user_id         UUID        REFERENCES qz_users(id),
  buyer_id        UUID        REFERENCES qz_buyers(id),
  type            TEXT        NOT NULL CHECK (type IN (
                    'creator_payout', 'buyer_charge', 'platform_fee',
                    'subscription', 'withdrawal_fee'
                  )),
  amount          NUMERIC(14,2) NOT NULL,
  currency        TEXT        NOT NULL DEFAULT 'SEK',
  tax_amount      NUMERIC(14,2) DEFAULT 0,
  total_amount    NUMERIC(14,2) GENERATED ALWAYS AS (amount + COALESCE(tax_amount, 0)) STORED,
  reference_type  TEXT,
  reference_id    UUID,
  line_items      JSONB       DEFAULT '[]',
  status          TEXT        NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','issued','paid','cancelled','overdue')),
  issued_at       TIMESTAMPTZ,
  due_at          TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qz_invoices_user ON qz_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_qz_invoices_status ON qz_invoices(status);

COMMIT;
