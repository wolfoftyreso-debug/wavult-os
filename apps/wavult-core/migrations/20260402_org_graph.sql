CREATE TABLE IF NOT EXISTS org_entities (
  id TEXT PRIMARY KEY,
  wg_id TEXT, parent_wg_id TEXT, name TEXT NOT NULL, short_name TEXT,
  type TEXT, jurisdiction TEXT, parent_entity_id TEXT, description TEXT,
  active_status TEXT DEFAULT 'planned', color TEXT, flag TEXT,
  layer INT DEFAULT 0, metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS org_relationships (
  id TEXT PRIMARY KEY, from_entity_id TEXT NOT NULL, to_entity_id TEXT NOT NULL,
  type TEXT, label TEXT, bidirectional BOOLEAN DEFAULT false,
  wg_id TEXT, parent_wg_id TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS org_role_mappings (
  id SERIAL PRIMARY KEY, person TEXT NOT NULL, initials TEXT, color TEXT,
  role_type TEXT, scope TEXT, entity_ids TEXT[], permissions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
