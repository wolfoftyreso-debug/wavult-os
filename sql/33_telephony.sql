-- =============================================================================
-- Module 33: Telephony Engine — 46elks integration
--
-- Tables for phone number management, call logs, IVR configs, voicemails
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Phone Numbers — Allocated 46elks numbers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telephony_numbers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  elks_id         TEXT NOT NULL,                -- 46elks number ID
  number          TEXT NOT NULL,                -- E.164 format (+468XXXXXXX)
  country         TEXT NOT NULL DEFAULT 'se',
  category        TEXT NOT NULL DEFAULT 'fixed', -- 'fixed' (08-nr), 'mobile'
  capabilities    TEXT[] DEFAULT '{sms,voice}',
  -- Webhooks
  voice_start_url TEXT,
  sms_url         TEXT,
  -- Assignment
  assigned_to_department TEXT,                  -- 'support', 'sales', 'finance', etc.
  assigned_to_user UUID REFERENCES users(id),
  assigned_to_mailbox UUID,                    -- comm_mailboxes reference
  -- Status
  is_active       BOOLEAN NOT NULL DEFAULT true,
  allocated_by    UUID REFERENCES users(id),
  deallocated_at  TIMESTAMPTZ,
  monthly_cost_eur NUMERIC(8,2) DEFAULT 3.00,
  --
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tel_numbers_org ON telephony_numbers(org_id);
CREATE INDEX IF NOT EXISTS idx_tel_numbers_number ON telephony_numbers(number);
CREATE INDEX IF NOT EXISTS idx_tel_numbers_active ON telephony_numbers(is_active);

-- ---------------------------------------------------------------------------
-- 2. Call Log — All inbound/outbound calls
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telephony_calls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id),
  elks_call_id    TEXT,                         -- 46elks call ID
  direction       TEXT NOT NULL DEFAULT 'OUTBOUND', -- INBOUND, OUTBOUND
  from_number     TEXT NOT NULL,
  to_number       TEXT NOT NULL,
  -- Status
  status          TEXT NOT NULL DEFAULT 'initiated', -- initiated, ongoing, success, failed, busy, noanswer
  duration_seconds INT,
  cost            NUMERIC(8,4),
  -- Recording
  recording_url   TEXT,
  record          BOOLEAN NOT NULL DEFAULT false,
  -- Context
  initiated_by    UUID REFERENCES users(id),
  ivr_config_id   UUID,
  linked_entity_type TEXT,                     -- 'support_ticket', 'lead', 'contact'
  linked_entity_id   UUID,
  -- Meta
  actions_log     JSONB DEFAULT '[]',          -- IVR actions taken
  notes           TEXT,
  --
  started_at      TIMESTAMPTZ DEFAULT now(),
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tel_calls_org ON telephony_calls(org_id);
CREATE INDEX IF NOT EXISTS idx_tel_calls_elks ON telephony_calls(elks_call_id);
CREATE INDEX IF NOT EXISTS idx_tel_calls_from ON telephony_calls(from_number);
CREATE INDEX IF NOT EXISTS idx_tel_calls_to ON telephony_calls(to_number);
CREATE INDEX IF NOT EXISTS idx_tel_calls_date ON telephony_calls(created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. IVR Configurations — Menu trees for incoming calls
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telephony_ivr_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  -- Associated number
  number_id       TEXT,                         -- 46elks number ID
  -- Greeting
  greeting_text   TEXT,                         -- TTS greeting
  greeting_audio_url TEXT,                      -- Pre-recorded greeting URL
  -- Menu
  menu_options    JSONB NOT NULL DEFAULT '[]',  -- [{key, label, action, connect_to, message, timeout}]
  -- Business hours
  business_hours  JSONB,                        -- {mon: {open: "08:00", close: "17:00"}, ...}
  after_hours_action JSONB,                     -- {play: "Vi har stängt...", voicemail: true}
  -- Language
  language        TEXT DEFAULT 'sv',
  -- Generated 46elks action JSON
  ivr_json        JSONB,
  -- Status
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES users(id),
  --
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tel_ivr_org ON telephony_ivr_configs(org_id);
CREATE INDEX IF NOT EXISTS idx_tel_ivr_number ON telephony_ivr_configs(number_id);

-- ---------------------------------------------------------------------------
-- 4. Voicemails
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telephony_voicemails (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id         TEXT,                         -- 46elks call ID
  from_number     TEXT NOT NULL,
  to_number       TEXT,
  recording_url   TEXT NOT NULL,
  ivr_config_id   UUID REFERENCES telephony_ivr_configs(id),
  -- Status
  is_listened     BOOLEAN NOT NULL DEFAULT false,
  listened_by     UUID REFERENCES users(id),
  listened_at     TIMESTAMPTZ,
  -- Transcription
  transcription   TEXT,
  transcribed_at  TIMESTAMPTZ,
  --
  duration_seconds INT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tel_vm_listened ON telephony_voicemails(is_listened);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE telephony_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE telephony_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE telephony_ivr_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE telephony_voicemails ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'telephony_numbers', 'telephony_calls', 'telephony_ivr_configs'
  ]) LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I_org_isolation ON %I; '
      || 'CREATE POLICY %I_org_isolation ON %I FOR ALL USING '
      || '(org_id = (current_setting(''app.current_org_id'', TRUE))::UUID)',
      t, t, t, t
    );
  END LOOP;
END $$;

-- Voicemails don't have org_id directly, accessible by authenticated users
DROP POLICY IF EXISTS telephony_voicemails_read ON telephony_voicemails;
CREATE POLICY telephony_voicemails_read ON telephony_voicemails FOR ALL USING (true);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_telephony_numbers_updated ON telephony_numbers;
CREATE TRIGGER trg_telephony_numbers_updated BEFORE UPDATE ON telephony_numbers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_telephony_ivr_updated ON telephony_ivr_configs;
CREATE TRIGGER trg_telephony_ivr_updated BEFORE UPDATE ON telephony_ivr_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- DONE. Telephony: 4 tables (numbers, calls, ivr, voicemails)
-- =============================================================================
