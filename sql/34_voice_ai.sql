-- =============================================================================
-- Module 34: Voice AI Engine
--
-- Tables for AI voice agents, conversation sessions, knowledge base,
-- outbound queue, and call analytics
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Voice AI Agents — Configurable AI agents per department
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS voice_ai_agents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  department      TEXT NOT NULL,                -- support, sales, billing, reception, technical, hr
  description     TEXT,
  language        TEXT DEFAULT 'sv',
  -- Voice persona
  voice_provider  TEXT DEFAULT 'ELEVENLABS',    -- ELEVENLABS, GOOGLE, AZURE, LOCAL
  voice_id        TEXT,                         -- Provider-specific voice ID
  voice_name      TEXT,
  voice_style     TEXT DEFAULT 'calm_professional', -- calm_professional, energetic, warm_welcoming, precise_knowledgeable, personal_premium
  speaking_rate   NUMERIC(3,1) DEFAULT 1.0,
  pitch           NUMERIC(3,1) DEFAULT 1.0,
  -- LLM config
  llm_model       TEXT DEFAULT 'claude-sonnet-4-5-20250514',
  system_prompt   TEXT NOT NULL,
  temperature     NUMERIC(3,2) DEFAULT 0.3,
  max_tokens      INT DEFAULT 300,
  -- Behavior
  greeting_message TEXT,
  fallback_message TEXT DEFAULT 'Ursäkta, jag förstod inte riktigt. Kan du upprepa?',
  transfer_message TEXT DEFAULT 'Jag kopplar dig vidare till en kollega.',
  max_conversation_turns INT DEFAULT 20,
  silence_timeout_ms INT DEFAULT 5000,
  interrupt_sensitivity TEXT DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH
  -- Routing
  can_transfer_to_human BOOLEAN DEFAULT true,
  human_transfer_number TEXT,
  escalation_intents TEXT[] DEFAULT '{angry_customer,legal_issue,complex_technical}',
  -- Knowledge
  knowledge_base_ids UUID[] DEFAULT '{}',
  rag_enabled     BOOLEAN DEFAULT false,
  -- Number
  assigned_number TEXT,                         -- E.164 phone number
  -- Stats
  total_calls     INT DEFAULT 0,
  avg_satisfaction NUMERIC(3,1),
  resolution_rate NUMERIC(5,2),
  -- Status
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES users(id),
  --
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vai_agents_org ON voice_ai_agents(org_id);
CREATE INDEX IF NOT EXISTS idx_vai_agents_dept ON voice_ai_agents(department);
CREATE INDEX IF NOT EXISTS idx_vai_agents_number ON voice_ai_agents(assigned_number);

-- ---------------------------------------------------------------------------
-- 2. Voice AI Sessions — Conversation sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS voice_ai_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id),
  agent_id        UUID NOT NULL REFERENCES voice_ai_agents(id),
  call_id         TEXT,                         -- 46elks call ID
  -- Parties
  from_number     TEXT,
  to_number       TEXT,
  -- Conversation
  turn_count      INT DEFAULT 0,
  conversation_history JSONB DEFAULT '[]',      -- [{role, content, timestamp}]
  last_intent     TEXT,
  -- Analysis (filled post-call)
  analysis        JSONB,                        -- {summary, sentiment, resolution, satisfaction, action_items, ...}
  -- Status
  status          TEXT DEFAULT 'ACTIVE',        -- ACTIVE, COMPLETED, TRANSFERRED, ANALYZED
  analyzed_at     TIMESTAMPTZ,
  -- Timing
  started_at      TIMESTAMPTZ DEFAULT now(),
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vai_sessions_org ON voice_ai_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_vai_sessions_agent ON voice_ai_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_vai_sessions_call ON voice_ai_sessions(call_id);
CREATE INDEX IF NOT EXISTS idx_vai_sessions_date ON voice_ai_sessions(created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. Outbound Queue — AI-driven outbound calls
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS voice_ai_outbound_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id        UUID NOT NULL REFERENCES voice_ai_agents(id),
  to_number       TEXT NOT NULL,
  purpose         TEXT DEFAULT 'follow_up',     -- follow_up, booking, survey, collection, upsell
  context         JSONB DEFAULT '{}',           -- Custom context for the call
  -- Scheduling
  scheduled_at    TIMESTAMPTZ NOT NULL,
  max_attempts    INT DEFAULT 3,
  attempt_count   INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  -- Result
  status          TEXT DEFAULT 'QUEUED',        -- QUEUED, CALLING, COMPLETED, FAILED, CANCELLED
  result          TEXT,                          -- answered, no_answer, busy, voicemail
  session_id      UUID REFERENCES voice_ai_sessions(id),
  -- Meta
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vai_outbound_org ON voice_ai_outbound_queue(org_id);
CREATE INDEX IF NOT EXISTS idx_vai_outbound_status ON voice_ai_outbound_queue(status);
CREATE INDEX IF NOT EXISTS idx_vai_outbound_scheduled ON voice_ai_outbound_queue(scheduled_at);

-- ---------------------------------------------------------------------------
-- 4. Knowledge Base — RAG content for voice agents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS voice_ai_knowledge (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  content         TEXT NOT NULL,
  category        TEXT DEFAULT 'general',       -- products, pricing, policies, faq, technical
  tags            TEXT[] DEFAULT '{}',
  -- Embeddings (for vector search)
  embedding       JSONB,                        -- Vector embedding for RAG
  -- Meta
  source_url      TEXT,
  source_document TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vai_knowledge_org ON voice_ai_knowledge(org_id);
CREATE INDEX IF NOT EXISTS idx_vai_knowledge_cat ON voice_ai_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_vai_knowledge_tags ON voice_ai_knowledge USING gin(tags);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE voice_ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_ai_outbound_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_ai_knowledge ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'voice_ai_agents', 'voice_ai_sessions', 'voice_ai_outbound_queue', 'voice_ai_knowledge'
  ]) LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I_org_isolation ON %I; '
      || 'CREATE POLICY %I_org_isolation ON %I FOR ALL USING '
      || '(org_id = (current_setting(''app.current_org_id'', TRUE))::UUID)',
      t, t, t, t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['voice_ai_agents', 'voice_ai_knowledge']) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated ON %I; '
      || 'CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON %I '
      || 'FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t, t, t
    );
  END LOOP;
END $$;

-- =============================================================================
-- DONE. Voice AI: 4 tables (agents, sessions, outbound_queue, knowledge)
-- =============================================================================
