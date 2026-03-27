-- ═══════════════════════════════════════════════════════════════════════════════
-- WAVULT OS v2 — Personal Cognitive Interface — Database Schema
-- ═══════════════════════════════════════════════════════════════════════════════
-- Principles:
--   • Append-only (event sourcing) — nothing deleted, nothing mutated
--   • Read-only ingestion from external systems
--   • Execution requires explicit user approval
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Raw Data (ingested, never modified) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS raw_data (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  source      TEXT NOT NULL,            -- 'email', 'manual', 'webhook'
  type        TEXT NOT NULL,            -- 'email', 'task', 'event', 'note'
  content     JSONB NOT NULL,           -- Raw payload (subject, body, sender, etc.)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_raw_data_user ON raw_data(user_id, created_at DESC);

-- RLS: users can only read their own data
ALTER TABLE raw_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own raw_data"
  ON raw_data FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users insert own raw_data"
  ON raw_data FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ─── Normalized Data (processed from raw, never modified) ────────────────────

CREATE TABLE IF NOT EXISTS normalized_data (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_id      UUID NOT NULL REFERENCES raw_data(id),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  type        TEXT NOT NULL CHECK (type IN ('task', 'info', 'decision')),
  urgency     REAL NOT NULL CHECK (urgency >= 0 AND urgency <= 1),
  entities    TEXT[] NOT NULL DEFAULT '{}',
  summary     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_normalized_user ON normalized_data(user_id, created_at DESC);

ALTER TABLE normalized_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own normalized_data"
  ON normalized_data FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ─── User State (one per day per user, append-only) ──────────────────────────

CREATE TABLE IF NOT EXISTS user_state (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  date        DATE NOT NULL,
  energy      INTEGER NOT NULL CHECK (energy >= 1 AND energy <= 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE user_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own user_state"
  ON user_state FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users insert own user_state"
  ON user_state FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ─── Tasks (scored from normalized data) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_id   UUID NOT NULL REFERENCES normalized_data(id),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  priority_score  REAL NOT NULL CHECK (priority_score >= 0 AND priority_score <= 1),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'deferred', 'rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_user ON tasks(user_id, status, priority_score DESC);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own tasks"
  ON tasks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ─── Briefings (generated daily, text + audio URL) ───────────────────────────

CREATE TABLE IF NOT EXISTS briefings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  date        DATE NOT NULL,
  text        TEXT NOT NULL,             -- Briefing text (max ~200 words)
  audio_url   TEXT,                      -- S3 URL to TTS audio
  task_ids    UUID[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own briefings"
  ON briefings FOR SELECT TO authenticated
  USING (user_id = auth.uid());
