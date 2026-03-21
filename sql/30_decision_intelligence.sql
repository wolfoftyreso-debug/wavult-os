-- ---------------------------------------------------------------------------
-- Module 30: Unified Decision Intelligence
-- ISO 9.1.3 — Analysis and evaluation, 9.3 — Management review
-- ---------------------------------------------------------------------------

DO $$ BEGIN CREATE TYPE impact_type AS ENUM ('CAUSAL','FINANCIAL','QUALITY','RISK','CAPABILITY','COMPLIANCE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE context_type AS ENUM ('STATUS_CHANGE','APPROVAL','ESCALATION','REVIEW','ASSIGNMENT','CREATION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- entity_impact_paths (pre-computed relationship chains)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entity_impact_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  source_entity_id UUID NOT NULL,
  source_entity_type TEXT NOT NULL,
  target_entity_id UUID NOT NULL,
  target_entity_type TEXT NOT NULL,
  path JSONB NOT NULL,
  path_length INTEGER,
  relationship_chain TEXT[],
  impact_type impact_type,
  impact_strength NUMERIC(3,2),
  calculated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- decision_contexts (real-time context for every decision)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS decision_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  context_type context_type NOT NULL,
  context_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  viewed_by UUID[] DEFAULT '{}',
  decision_made BOOLEAN DEFAULT false,
  decision_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- pattern_detections (auto-detected patterns)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pattern_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  pattern_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'MEDIUM',
  entity_ids UUID[] DEFAULT '{}',
  entity_types TEXT[] DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  detected_at TIMESTAMPTZ DEFAULT now(),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resulting_action_type TEXT,
  resulting_action_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_eip_source ON entity_impact_paths(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_eip_target ON entity_impact_paths(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_eip_org ON entity_impact_paths(org_id);
CREATE INDEX IF NOT EXISTS idx_dc_entity ON decision_contexts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_dc_org ON decision_contexts(org_id);
CREATE INDEX IF NOT EXISTS idx_pd_org ON pattern_detections(org_id);
CREATE INDEX IF NOT EXISTS idx_pd_type ON pattern_detections(pattern_type);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE entity_impact_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eip_org" ON entity_impact_paths USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "dc_org" ON decision_contexts USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "pd_org" ON pattern_detections USING (org_id = current_setting('app.org_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- Additional metrics for Decision Intelligence
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO metric_definitions (code, name, module, category, aggregation_type, default_period, default_target, threshold_direction, unit, format, display_as, decision_context, action_if_red) VALUES
    ('DECISION_CONTEXT_UTILIZATION', 'Decision Intelligence användning', 'STRATEGIC', 'PERFORMANCE', 'PERCENTAGE', 'MONTHLY', 80, 'HIGHER_IS_BETTER', '%', 'percentage', 'GAUGE', 'Fattas beslut med kontext?', 'Utbilda. Visa värde.'),
    ('IMPACT_PREDICTION_ACCURACY', 'Impact-prediktion träffsäkerhet', 'STRATEGIC', 'PERFORMANCE', 'PERCENTAGE', 'QUARTERLY', 70, 'HIGHER_IS_BETTER', '%', 'percentage', 'GAUGE', 'Stämmer våra impact-analyser?', 'Förbättra modellen.'),
    ('PATTERN_DETECTION_COUNT', 'Detekterade mönster', 'STRATEGIC', 'OPERATIONAL', 'COUNT', 'MONTHLY', null, 'LOWER_IS_BETTER', 'st', 'number', 'TREND_ARROW', 'Hur många mönster detekteras?', 'Varje mönster kräver åtgärd.')
  ON CONFLICT (code) DO NOTHING;
EXCEPTION WHEN undefined_table THEN NULL;
WHEN OTHERS THEN NULL;
END $$;
