-- =============================================================================
-- Module 31: Communication Hub — Unified Multi-Channel Communication Center
-- Hypbit OMS Certified
--
-- Supports: Email (Gmail, iCloud), Slack, WhatsApp, Telegram, SMS,
--           LinkedIn, GitHub — per org, per country, per language.
--
-- AI Mail Bots: One per mailbox/department, trained to sort, tag, store,
--               route, verify invoices, and escalate.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE channel_provider AS ENUM (
    'GMAIL', 'ICLOUD', 'OUTLOOK', 'SMTP_GENERIC',
    'SLACK', 'WHATSAPP', 'TELEGRAM', 'SMS',
    'LINKEDIN', 'GITHUB',
    'INTERNAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE mailbox_department AS ENUM (
    'INVOICES',     -- faktura@
    'INFO',         -- info@
    'LEGAL',        -- legal@
    'FINANCE',      -- ekonomi@
    'SUPPORT',      -- support@
    'HR',           -- personal@
    'DEV',          -- dev@
    'SALES',        -- sales@
    'QUALITY',      -- quality@
    'PROCUREMENT',  -- inkop@
    'EXECUTIVE',    -- ledning@
    'GENERAL'       -- catch-all
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_direction AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_processing_status AS ENUM (
    'QUEUED', 'PROCESSING', 'CLASSIFIED', 'ROUTED',
    'AWAITING_ACTION', 'ACTIONED', 'ARCHIVED', 'FAILED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE bot_action_type AS ENUM (
    'CLASSIFY', 'TAG', 'ROUTE', 'STORE_ATTACHMENT',
    'CREATE_TASK', 'CREATE_NC', 'CREATE_TICKET',
    'VERIFY_INVOICE', 'MATCH_PO', 'ESCALATE',
    'AUTO_REPLY', 'FORWARD', 'ARCHIVE',
    'LINK_ENTITY', 'NOTIFY_USER', 'TRANSLATE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE account_connection_status AS ENUM (
    'ACTIVE', 'EXPIRED', 'REVOKED', 'PENDING_AUTH', 'ERROR'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Connected Accounts — Each user's external accounts (Gmail, iCloud, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connected_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        channel_provider NOT NULL,
  account_email   TEXT,                       -- email address or username
  display_name    TEXT,                       -- friendly name
  credentials     JSONB NOT NULL DEFAULT '{}', -- encrypted tokens, refresh_token, etc.
  scopes          TEXT[],                     -- OAuth scopes granted
  status          account_connection_status NOT NULL DEFAULT 'PENDING_AUTH',
  last_sync_at    TIMESTAMPTZ,
  sync_cursor     TEXT,                       -- provider-specific sync token
  settings        JSONB NOT NULL DEFAULT '{}', -- per-account settings (signature, etc.)
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id, provider, account_email)
);

CREATE INDEX IF NOT EXISTS idx_conn_accounts_org ON connected_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_conn_accounts_user ON connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_conn_accounts_provider ON connected_accounts(provider);

-- ---------------------------------------------------------------------------
-- 2. Org Mailboxes — Shared departmental mailboxes (faktura@, support@, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS org_mailboxes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department      mailbox_department NOT NULL,
  email_address   TEXT NOT NULL,               -- faktura@foretag.se
  display_name    TEXT NOT NULL,               -- "Faktura — Företag AB"
  provider        channel_provider NOT NULL DEFAULT 'GMAIL',
  credentials     JSONB NOT NULL DEFAULT '{}', -- OAuth / service account creds
  bot_enabled     BOOLEAN NOT NULL DEFAULT true,
  bot_config      JSONB NOT NULL DEFAULT '{}', -- bot rules, thresholds, etc.
  language        TEXT NOT NULL DEFAULT 'sv',   -- primary language for this mailbox
  country_code    TEXT NOT NULL DEFAULT 'SE',   -- ISO 3166-1
  timezone        TEXT NOT NULL DEFAULT 'Europe/Stockholm',
  auto_reply      JSONB,                       -- auto-reply template config
  routing_rules   JSONB NOT NULL DEFAULT '[]', -- rules for routing to users
  assigned_users  UUID[] DEFAULT '{}',         -- users with access
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_sync_at    TIMESTAMPTZ,
  sync_cursor     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, email_address)
);

CREATE INDEX IF NOT EXISTS idx_org_mailboxes_org ON org_mailboxes(org_id);
CREATE INDEX IF NOT EXISTS idx_org_mailboxes_dept ON org_mailboxes(department);
CREATE INDEX IF NOT EXISTS idx_org_mailboxes_active ON org_mailboxes(org_id, is_active);

-- ---------------------------------------------------------------------------
-- 3. Conversations — Threads grouping related messages across channels
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comm_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mailbox_id      UUID REFERENCES org_mailboxes(id) ON DELETE SET NULL,
  subject         TEXT,
  external_thread_id TEXT,                     -- Gmail thread ID, Slack thread_ts, etc.
  channel         channel_provider NOT NULL,
  department      mailbox_department,
  priority        message_priority NOT NULL DEFAULT 'NORMAL',
  status          message_processing_status NOT NULL DEFAULT 'QUEUED',
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  tags            TEXT[] DEFAULT '{}',
  labels          TEXT[] DEFAULT '{}',
  language        TEXT,                        -- detected or set language
  country_code    TEXT,
  -- Entity linking (what is this conversation about?)
  linked_entity_type TEXT,                     -- 'invoice', 'nc', 'deal', 'ticket', etc.
  linked_entity_id   UUID,
  -- Bot classification
  bot_category    TEXT,                        -- bot-assigned category
  bot_confidence  NUMERIC(3,2),               -- 0.00-1.00
  bot_summary     TEXT,                        -- AI-generated summary
  -- Counters
  message_count   INT NOT NULL DEFAULT 0,
  unread_count    INT NOT NULL DEFAULT 0,
  attachment_count INT NOT NULL DEFAULT 0,
  -- Timestamps
  first_message_at TIMESTAMPTZ,
  last_message_at  TIMESTAMPTZ,
  snoozed_until    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_conv_org ON comm_conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_comm_conv_mailbox ON comm_conversations(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_comm_conv_assigned ON comm_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_comm_conv_status ON comm_conversations(org_id, status);
CREATE INDEX IF NOT EXISTS idx_comm_conv_dept ON comm_conversations(org_id, department);
CREATE INDEX IF NOT EXISTS idx_comm_conv_thread ON comm_conversations(external_thread_id);
CREATE INDEX IF NOT EXISTS idx_comm_conv_linked ON comm_conversations(linked_entity_type, linked_entity_id);
CREATE INDEX IF NOT EXISTS idx_comm_conv_last_msg ON comm_conversations(org_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_conv_tags ON comm_conversations USING gin(tags);

-- ---------------------------------------------------------------------------
-- 4. Messages — Individual messages in any channel
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comm_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES comm_conversations(id) ON DELETE CASCADE,
  mailbox_id      UUID REFERENCES org_mailboxes(id) ON DELETE SET NULL,
  -- Sender/Recipient
  direction       message_direction NOT NULL,
  from_address    TEXT,                        -- email, phone, slack user, etc.
  from_name       TEXT,
  from_user_id    UUID REFERENCES users(id) ON DELETE SET NULL, -- if internal user
  to_addresses    JSONB NOT NULL DEFAULT '[]', -- [{address, name, type: "to"|"cc"|"bcc"}]
  reply_to        TEXT,
  -- Content
  subject         TEXT,
  body_text       TEXT,                        -- plain text
  body_html       TEXT,                        -- HTML version
  snippet         TEXT,                        -- first ~200 chars preview
  -- Provider metadata
  channel         channel_provider NOT NULL,
  external_id     TEXT,                        -- provider message ID
  external_thread_id TEXT,                     -- provider thread ID
  in_reply_to     TEXT,                        -- References/In-Reply-To header
  headers         JSONB,                       -- raw email headers (selected)
  -- Status
  is_read         BOOLEAN NOT NULL DEFAULT false,
  is_starred      BOOLEAN NOT NULL DEFAULT false,
  is_draft        BOOLEAN NOT NULL DEFAULT false,
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  -- Bot processing
  processing_status message_processing_status NOT NULL DEFAULT 'QUEUED',
  bot_actions     JSONB DEFAULT '[]',          -- actions taken by bot
  bot_classification JSONB,                    -- {category, confidence, entities, intent}
  -- Metadata
  language        TEXT,                        -- detected language
  sentiment       NUMERIC(3,2),               -- -1.00 to 1.00
  metadata        JSONB NOT NULL DEFAULT '{}',
  -- Timestamps
  sent_at         TIMESTAMPTZ,                 -- when originally sent
  received_at     TIMESTAMPTZ DEFAULT now(),   -- when we received it
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_msg_org ON comm_messages(org_id);
CREATE INDEX IF NOT EXISTS idx_comm_msg_conv ON comm_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_comm_msg_mailbox ON comm_messages(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_comm_msg_from_user ON comm_messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_comm_msg_external ON comm_messages(external_id);
CREATE INDEX IF NOT EXISTS idx_comm_msg_direction ON comm_messages(org_id, direction);
CREATE INDEX IF NOT EXISTS idx_comm_msg_unread ON comm_messages(org_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_comm_msg_received ON comm_messages(org_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_msg_processing ON comm_messages(processing_status) WHERE processing_status IN ('QUEUED', 'PROCESSING');

-- Full-text search on messages
CREATE INDEX IF NOT EXISTS idx_comm_msg_fts ON comm_messages
  USING gin(to_tsvector('simple', coalesce(subject,'') || ' ' || coalesce(body_text,'')));

-- ---------------------------------------------------------------------------
-- 5. Attachments — Files attached to messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comm_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  message_id      UUID NOT NULL REFERENCES comm_messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES comm_conversations(id) ON DELETE CASCADE,
  -- File info
  filename        TEXT NOT NULL,
  content_type    TEXT,                        -- MIME type
  size_bytes      BIGINT,
  storage_path    TEXT,                        -- Supabase storage path
  storage_bucket  TEXT DEFAULT 'attachments',
  checksum_sha256 TEXT,
  -- Classification
  file_category   TEXT,                        -- 'invoice', 'contract', 'certificate', etc.
  bot_extracted   JSONB,                       -- AI-extracted data from file
  -- Linked to document management
  linked_document_id UUID,                     -- FK to documents table if stored there
  -- Metadata
  is_inline       BOOLEAN NOT NULL DEFAULT false,
  content_id      TEXT,                        -- for inline images (CID)
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_attach_org ON comm_attachments(org_id);
CREATE INDEX IF NOT EXISTS idx_comm_attach_msg ON comm_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_comm_attach_conv ON comm_attachments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_comm_attach_category ON comm_attachments(org_id, file_category);

-- ---------------------------------------------------------------------------
-- 6. Bot Configurations — AI bot settings per department/mailbox
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comm_bot_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mailbox_id      UUID REFERENCES org_mailboxes(id) ON DELETE CASCADE,
  department      mailbox_department NOT NULL,
  name            TEXT NOT NULL,               -- "Faktura-botten", "Support-botten"
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  -- Classification rules
  classification_prompt TEXT,                  -- system prompt for classification
  classification_rules  JSONB NOT NULL DEFAULT '[]', -- rule-based overrides
  -- Routing rules
  routing_matrix  JSONB NOT NULL DEFAULT '{}', -- {category -> user_id/role mapping}
  escalation_rules JSONB NOT NULL DEFAULT '[]', -- when to escalate
  -- Auto-reply
  auto_reply_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_reply_templates JSONB NOT NULL DEFAULT '{}', -- {language -> template}
  auto_reply_delay_seconds INT DEFAULT 0,
  -- Invoice verification (for INVOICES department)
  invoice_verification JSONB NOT NULL DEFAULT '{
    "match_po": true,
    "check_budget": true,
    "verify_supplier": true,
    "check_duplicates": true,
    "amount_threshold_auto_approve": 0,
    "require_manager_approval_above": 50000
  }',
  -- File handling
  file_storage_rules JSONB NOT NULL DEFAULT '{}', -- where to store different file types
  -- Capabilities
  can_create_tasks    BOOLEAN NOT NULL DEFAULT true,
  can_create_tickets  BOOLEAN NOT NULL DEFAULT true,
  can_create_nc       BOOLEAN NOT NULL DEFAULT false,
  can_forward         BOOLEAN NOT NULL DEFAULT true,
  can_auto_reply      BOOLEAN NOT NULL DEFAULT false,
  can_translate       BOOLEAN NOT NULL DEFAULT true,
  -- Language & locale
  primary_language    TEXT NOT NULL DEFAULT 'sv',
  supported_languages TEXT[] DEFAULT '{sv,en}',
  -- Performance
  avg_response_time_seconds NUMERIC,
  total_processed     BIGINT NOT NULL DEFAULT 0,
  accuracy_score      NUMERIC(3,2),            -- 0.00-1.00
  --
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, mailbox_id)
);

CREATE INDEX IF NOT EXISTS idx_comm_bot_org ON comm_bot_configs(org_id);
CREATE INDEX IF NOT EXISTS idx_comm_bot_dept ON comm_bot_configs(department);

-- ---------------------------------------------------------------------------
-- 7. Bot Action Log — Audit trail of every action a bot takes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comm_bot_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bot_config_id   UUID NOT NULL REFERENCES comm_bot_configs(id) ON DELETE CASCADE,
  message_id      UUID REFERENCES comm_messages(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES comm_conversations(id) ON DELETE SET NULL,
  -- Action details
  action_type     bot_action_type NOT NULL,
  action_input    JSONB NOT NULL DEFAULT '{}', -- what the bot received
  action_output   JSONB NOT NULL DEFAULT '{}', -- what the bot produced
  confidence      NUMERIC(3,2),                -- 0.00-1.00
  -- Result
  success         BOOLEAN NOT NULL DEFAULT true,
  error_message   TEXT,
  -- Entity created/linked
  created_entity_type TEXT,                    -- 'task', 'nc', 'ticket', 'invoice'
  created_entity_id   UUID,
  -- Human review
  requires_review BOOLEAN NOT NULL DEFAULT false,
  reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  review_outcome  TEXT,                        -- 'approved', 'corrected', 'rejected'
  reviewed_at     TIMESTAMPTZ,
  -- Timing
  processing_ms   INT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_actions_org ON comm_bot_actions(org_id);
CREATE INDEX IF NOT EXISTS idx_bot_actions_bot ON comm_bot_actions(bot_config_id);
CREATE INDEX IF NOT EXISTS idx_bot_actions_msg ON comm_bot_actions(message_id);
CREATE INDEX IF NOT EXISTS idx_bot_actions_type ON comm_bot_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_bot_actions_review ON comm_bot_actions(requires_review) WHERE requires_review;
CREATE INDEX IF NOT EXISTS idx_bot_actions_created ON comm_bot_actions(org_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 8. Contact Channel Registry — External contacts' known channels
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_channels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  -- Channel info
  channel         channel_provider NOT NULL,
  address         TEXT NOT NULL,               -- email, phone, handle, etc.
  display_name    TEXT,
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  is_verified     BOOLEAN NOT NULL DEFAULT false,
  -- Preferences
  preferred_language TEXT,
  opt_in_marketing   BOOLEAN NOT NULL DEFAULT false,
  opt_in_transactional BOOLEAN NOT NULL DEFAULT true,
  --
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, contact_id, channel, address)
);

CREATE INDEX IF NOT EXISTS idx_contact_ch_org ON contact_channels(org_id);
CREATE INDEX IF NOT EXISTS idx_contact_ch_contact ON contact_channels(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_ch_address ON contact_channels(address);

-- ---------------------------------------------------------------------------
-- 9. Message Templates — Reusable templates per department/language/channel
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comm_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department      mailbox_department,
  channel         channel_provider,
  -- Template
  code            TEXT NOT NULL,                -- unique template code
  name            TEXT NOT NULL,
  language        TEXT NOT NULL DEFAULT 'sv',
  subject         TEXT,                         -- for email
  body_text       TEXT NOT NULL,
  body_html       TEXT,
  -- Variables
  variables       TEXT[] DEFAULT '{}',          -- {{contact_name}}, {{invoice_number}}, etc.
  -- Usage
  is_active       BOOLEAN NOT NULL DEFAULT true,
  use_count       INT NOT NULL DEFAULT 0,
  --
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, code, language)
);

CREATE INDEX IF NOT EXISTS idx_comm_tpl_org ON comm_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_comm_tpl_dept ON comm_templates(department);

-- ---------------------------------------------------------------------------
-- 10. Notification Preferences — Per user notification settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Per-channel preferences
  email_enabled   BOOLEAN NOT NULL DEFAULT true,
  slack_enabled   BOOLEAN NOT NULL DEFAULT true,
  sms_enabled     BOOLEAN NOT NULL DEFAULT false,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  telegram_enabled BOOLEAN NOT NULL DEFAULT false,
  push_enabled    BOOLEAN NOT NULL DEFAULT true,
  -- Quiet hours
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start   TIME,
  quiet_hours_end     TIME,
  quiet_hours_tz      TEXT DEFAULT 'Europe/Stockholm',
  -- Digest
  digest_enabled  BOOLEAN NOT NULL DEFAULT false,
  digest_frequency TEXT DEFAULT 'daily',       -- 'hourly', 'daily', 'weekly'
  digest_time     TIME DEFAULT '08:00',
  -- Category preferences
  category_settings JSONB NOT NULL DEFAULT '{}', -- {category -> {channels, priority_threshold}}
  --
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 11. Notification Queue — Outbound notifications waiting to be sent
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Delivery
  channel         channel_provider NOT NULL,
  recipient       TEXT NOT NULL,                -- email, phone, slack channel, etc.
  -- Content
  template_id     UUID REFERENCES comm_templates(id) ON DELETE SET NULL,
  subject         TEXT,
  body            TEXT NOT NULL,
  body_html       TEXT,
  variables       JSONB NOT NULL DEFAULT '{}',
  -- Context
  source_type     TEXT,                         -- 'conversation', 'task', 'nc', etc.
  source_id       UUID,
  priority        message_priority NOT NULL DEFAULT 'NORMAL',
  -- Status
  status          TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, FAILED, CANCELLED
  attempts        INT NOT NULL DEFAULT 0,
  max_attempts    INT NOT NULL DEFAULT 3,
  last_error      TEXT,
  -- Timing
  scheduled_at    TIMESTAMPTZ DEFAULT now(),
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_queue_pending ON notification_queue(status, scheduled_at)
  WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_notif_queue_user ON notification_queue(user_id);

-- ---------------------------------------------------------------------------
-- 12. Inbox Rules — User-defined rules for message handling
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inbox_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = org-wide rule
  mailbox_id      UUID REFERENCES org_mailboxes(id) ON DELETE CASCADE,
  -- Rule definition
  name            TEXT NOT NULL,
  priority        INT NOT NULL DEFAULT 100,     -- lower = higher priority
  is_active       BOOLEAN NOT NULL DEFAULT true,
  -- Conditions (all must match)
  conditions      JSONB NOT NULL DEFAULT '[]',  -- [{field, operator, value}]
  -- Actions
  actions         JSONB NOT NULL DEFAULT '[]',  -- [{type, params}]
  -- Stats
  match_count     BIGINT NOT NULL DEFAULT 0,
  last_matched_at TIMESTAMPTZ,
  --
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbox_rules_org ON inbox_rules(org_id);
CREATE INDEX IF NOT EXISTS idx_inbox_rules_mailbox ON inbox_rules(mailbox_id);

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE comm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE comm_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comm_bot_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE comm_bot_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE comm_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_rules ENABLE ROW LEVEL SECURITY;

-- Org isolation policies
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'connected_accounts', 'org_mailboxes', 'comm_conversations',
    'comm_messages', 'comm_attachments', 'comm_bot_configs',
    'comm_bot_actions', 'contact_channels', 'comm_templates',
    'notification_preferences', 'notification_queue', 'inbox_rules'
  ]) LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I_org_isolation ON %I; '
      || 'CREATE POLICY %I_org_isolation ON %I FOR ALL USING '
      || '(org_id = (current_setting(''app.current_org_id'', TRUE))::UUID)',
      t, t, t, t
    );
  END LOOP;
END $$;

-- Additional: connected_accounts only visible to own user (or admin)
DROP POLICY IF EXISTS connected_accounts_user_isolation ON connected_accounts;
CREATE POLICY connected_accounts_user_isolation ON connected_accounts
  FOR SELECT USING (
    user_id = (current_setting('app.current_user_id', TRUE))::UUID
    OR org_id = (current_setting('app.current_org_id', TRUE))::UUID
  );

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_conversation_counters()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE comm_conversations SET
    message_count = (SELECT count(*) FROM comm_messages WHERE conversation_id = NEW.conversation_id AND NOT is_deleted),
    unread_count = (SELECT count(*) FROM comm_messages WHERE conversation_id = NEW.conversation_id AND NOT is_read AND NOT is_deleted),
    attachment_count = (SELECT count(*) FROM comm_attachments WHERE conversation_id = NEW.conversation_id),
    last_message_at = (SELECT max(received_at) FROM comm_messages WHERE conversation_id = NEW.conversation_id AND NOT is_deleted),
    updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_conv_counters ON comm_messages;
CREATE TRIGGER trg_update_conv_counters
  AFTER INSERT OR UPDATE OF is_read, is_deleted ON comm_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_counters();

-- Auto-update updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'connected_accounts', 'org_mailboxes', 'comm_conversations',
    'comm_messages', 'comm_bot_configs', 'contact_channels',
    'comm_templates', 'notification_preferences', 'inbox_rules'
  ]) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated ON %I; '
      || 'CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON %I '
      || 'FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t, t, t
    );
  END LOOP;
END $$;

-- =============================================================================
-- DONE. Communication Hub: 12 tables, RLS, triggers, indexes.
-- =============================================================================
