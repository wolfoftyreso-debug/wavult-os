-- ═══════════════════════════════════════════════════════════════════════════
-- Learning & Knowledge Module — Database Schema
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Playbooks (SOPs) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS playbooks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT CHECK (category IN ('onboarding', 'process', 'compliance', 'technical', 'sales', 'hr')),
  process_id  UUID REFERENCES processes(id) ON DELETE SET NULL,
  status      TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  version     INTEGER DEFAULT 1,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playbook_steps (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playbook_id        UUID REFERENCES playbooks(id) ON DELETE CASCADE,
  step_number        INTEGER NOT NULL,
  title              TEXT NOT NULL,
  content            TEXT,            -- Markdown
  media_url          TEXT,            -- video / bild URL
  estimated_minutes  INTEGER DEFAULT 5,
  required           BOOLEAN DEFAULT true,
  UNIQUE(playbook_id, step_number)
);

-- ─── Kunskapsbas ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  content       TEXT,                 -- Markdown
  category      TEXT,
  tags          TEXT[] DEFAULT '{}',
  author_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  version       INTEGER DEFAULT 1,
  status        TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  views         INTEGER DEFAULT 0,
  helpful_votes INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_articles_org ON knowledge_articles(org_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_category ON knowledge_articles(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_status ON knowledge_articles(status);

-- ─── Kurser ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id             UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  description        TEXT,
  thumbnail_url      TEXT,
  duration_minutes   INTEGER,
  difficulty         TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  required_for_roles TEXT[] DEFAULT '{}',
  passing_score      INTEGER DEFAULT 80,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_modules (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id      UUID REFERENCES courses(id) ON DELETE CASCADE,
  module_number  INTEGER NOT NULL,
  title          TEXT NOT NULL,
  content_type   TEXT CHECK (content_type IN ('video', 'article', 'playbook', 'quiz', 'text')),
  content_id     UUID,
  content_text   TEXT,               -- inbyggt textinnehåll
  video_url      TEXT,               -- iframe-redo
  duration_minutes INTEGER,
  UNIQUE(course_id, module_number)
);

-- ─── Framsteg ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_progress (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  org_id               UUID REFERENCES organizations(id) ON DELETE CASCADE,
  content_type         TEXT NOT NULL CHECK (content_type IN ('course', 'module', 'playbook', 'article', 'quiz', 'step')),
  content_id           UUID NOT NULL,
  status               TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  score                INTEGER,
  completed_at         TIMESTAMPTZ,
  time_spent_minutes   INTEGER DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_progress_user ON learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_org ON learning_progress(org_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_content ON learning_progress(content_id, content_type);

-- ─── Quiz ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quizzes (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id              UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  questions           JSONB NOT NULL,  -- [{question, options[], correct_index, explanation}]
  passing_score       INTEGER DEFAULT 80,
  time_limit_minutes  INTEGER
);

-- ─── Interna certifikat ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_certificates (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  org_id           UUID REFERENCES organizations(id) ON DELETE CASCADE,
  course_id        UUID REFERENCES courses(id) ON DELETE SET NULL,
  issued_at        TIMESTAMPTZ DEFAULT NOW(),
  expires_at       TIMESTAMPTZ,
  certificate_url  TEXT
);

-- ─── Externa certifieringar ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS external_certifications (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID REFERENCES users(id) ON DELETE CASCADE,
  org_id             UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  issuer             TEXT,
  issued_date        DATE,
  expiry_date        DATE,
  certificate_number TEXT,
  document_url       TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_external_certs_expiry ON external_certifications(expiry_date);
CREATE INDEX IF NOT EXISTS idx_external_certs_user ON external_certifications(user_id);

-- ─── Prenumerationspåminnelser ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_subscriptions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  types      TEXT[] DEFAULT ARRAY['release', 'incident'],
  verified   BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Updated_at triggers ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_learning_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_playbooks_updated_at') THEN
    CREATE TRIGGER set_playbooks_updated_at
    BEFORE UPDATE ON playbooks
    FOR EACH ROW EXECUTE FUNCTION update_learning_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_articles_updated_at') THEN
    CREATE TRIGGER set_articles_updated_at
    BEFORE UPDATE ON knowledge_articles
    FOR EACH ROW EXECUTE FUNCTION update_learning_updated_at();
  END IF;
END $$;

-- ─── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_certifications ENABLE ROW LEVEL SECURITY;

-- Öppna policies (justera per behov)
CREATE POLICY IF NOT EXISTS "playbooks_org_access" ON playbooks USING (true);
CREATE POLICY IF NOT EXISTS "articles_org_access" ON knowledge_articles USING (true);
CREATE POLICY IF NOT EXISTS "courses_org_access" ON courses USING (true);
CREATE POLICY IF NOT EXISTS "progress_own" ON learning_progress USING (true);
CREATE POLICY IF NOT EXISTS "certs_own" ON learning_certificates USING (true);
CREATE POLICY IF NOT EXISTS "ext_certs_own" ON external_certifications USING (true);
