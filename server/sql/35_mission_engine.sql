-- ============================================================================
-- quiXzoom Mission Engine v1
-- Uppdrag, fotografer, leveranser, geo-zoner
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PHOTOGRAPHERS — Registrerade fotografer på plattformen
-- ============================================================================
CREATE TABLE IF NOT EXISTS photographers (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID    NOT NULL,   -- vilken Wavult-org de tillhör
  external_user_id  TEXT    NOT NULL,   -- Supabase auth UID
  display_name      TEXT    NOT NULL,
  email             TEXT,
  phone             TEXT,
  -- Status
  status            TEXT    NOT NULL DEFAULT 'PENDING' CHECK (status IN (
                      'PENDING','ACTIVE','SUSPENDED','BANNED'
                    )),
  -- Verifiering
  id_verified       BOOLEAN DEFAULT false,
  equipment_verified BOOLEAN DEFAULT false,
  -- Plats (realtid uppdateras av appen)
  last_location     GEOMETRY(Point, 4326),
  last_seen_at      TIMESTAMPTZ,
  -- Finansiellt
  billing_customer_id UUID,             -- koppling till billing_customers
  revolut_account_id TEXT,              -- för Revolut Payouts
  total_earned_minor BIGINT DEFAULT 0,
  -- Statistik
  missions_completed INT DEFAULT 0,
  images_delivered   INT DEFAULT 0,
  avg_rating        NUMERIC(3,2),
  -- Metadata
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, external_user_id)
);

-- ============================================================================
-- 2. MISSION_ZONES — Geo-zoner som definierar var uppdrag gäller
-- ============================================================================
CREATE TABLE IF NOT EXISTS mission_zones (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID    NOT NULL,
  name            TEXT    NOT NULL,
  description     TEXT,
  -- Geo: polygon som definierar zonen
  boundary        GEOMETRY(Polygon, 4326) NOT NULL,
  center_point    GEOMETRY(Point, 4326),
  area_km2        NUMERIC(10,4),
  -- Metadata
  city            TEXT,
  country         TEXT    DEFAULT 'TH',   -- Thailand som default
  tags            TEXT[]  DEFAULT '{}',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. MISSIONS — Fotouppdrag
-- ============================================================================
CREATE TABLE IF NOT EXISTS missions (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID    NOT NULL,
  -- Beställare
  client_org_id   UUID    NOT NULL,      -- Optic Insights org
  created_by      TEXT    NOT NULL,      -- user som skapade uppdraget
  -- Uppdragsbeskrivning
  title           TEXT    NOT NULL,
  description     TEXT,
  instructions    TEXT,                  -- specifika instruktioner till fotografen
  -- Geo
  zone_id         UUID    REFERENCES mission_zones(id),
  target_location GEOMETRY(Point, 4326), -- specifik punkt (om ej zon)
  radius_meters   INT,                   -- räckvidd i meter
  -- Krav
  images_required INT     NOT NULL DEFAULT 1,
  image_specs     JSONB   DEFAULT '{}',  -- { resolution, format, angles }
  -- Status
  status          TEXT    NOT NULL DEFAULT 'OPEN' CHECK (status IN (
                    'OPEN','ASSIGNED','IN_PROGRESS','DELIVERED',
                    'UNDER_REVIEW','COMPLETED','CANCELLED','EXPIRED'
                  )),
  -- Tilldelning
  assigned_photographer_id UUID REFERENCES photographers(id),
  assigned_at     TIMESTAMPTZ,
  -- Deadlines
  available_from  TIMESTAMPTZ DEFAULT now(),
  deadline        TIMESTAMPTZ,
  -- Betalning
  payout_minor    BIGINT  NOT NULL DEFAULT 0,   -- vad fotografen får
  client_price_minor BIGINT NOT NULL DEFAULT 0,  -- vad kunden betalar
  currency        TEXT    NOT NULL DEFAULT 'USD',
  -- Koppling till payment/billing
  payment_intent_id UUID,
  billing_event_id  UUID,
  -- Metadata
  metadata        JSONB   DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. MISSION_DELIVERABLES — Levererade bilder per uppdrag
-- ============================================================================
CREATE TABLE IF NOT EXISTS mission_deliverables (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id        UUID    NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  photographer_id   UUID    NOT NULL REFERENCES photographers(id),
  -- Fil
  file_key          TEXT    NOT NULL,   -- S3 key
  file_url          TEXT,               -- CloudFront CDN URL
  file_size_bytes   BIGINT,
  mime_type         TEXT    DEFAULT 'image/jpeg',
  -- Geo-metadata
  capture_location  GEOMETRY(Point, 4326),
  capture_altitude  NUMERIC(8,2),
  capture_bearing   NUMERIC(5,2),
  exif_data         JSONB   DEFAULT '{}',
  -- Tidsstämpel
  captured_at       TIMESTAMPTZ,
  uploaded_at       TIMESTAMPTZ DEFAULT now(),
  -- AI-analys (fylls i av AI-pipeline)
  ai_tags           TEXT[]  DEFAULT '{}',
  ai_description    TEXT,
  ai_confidence     NUMERIC(5,4),
  ai_processed_at   TIMESTAMPTZ,
  -- Status
  status            TEXT    NOT NULL DEFAULT 'UPLOADED' CHECK (status IN (
                      'UPLOADED','PROCESSING','ACCEPTED','REJECTED','ARCHIVED'
                    )),
  rejection_reason  TEXT,
  reviewed_by       TEXT,
  reviewed_at       TIMESTAMPTZ
);

-- ============================================================================
-- 5. MISSION_EVENTS — Audit log för alla status-ändringar
-- ============================================================================
CREATE TABLE IF NOT EXISTS mission_events (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id      UUID    NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  event_type      TEXT    NOT NULL,   -- 'CREATED','ASSIGNED','DELIVERED','COMPLETED' etc
  from_status     TEXT,
  to_status       TEXT,
  actor_id        TEXT,
  actor_type      TEXT    CHECK (actor_type IN ('PHOTOGRAPHER','CLIENT','SYSTEM','ADMIN')),
  metadata        JSONB   DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 6. PHOTOGRAPHER_RATINGS — Rating-system
-- ============================================================================
CREATE TABLE IF NOT EXISTS photographer_ratings (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id      UUID    NOT NULL REFERENCES missions(id),
  photographer_id UUID    NOT NULL REFERENCES photographers(id),
  rated_by        TEXT    NOT NULL,
  rating          INT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(mission_id, rated_by)
);

-- ============================================================================
-- 7. FUNCTIONS
-- ============================================================================

-- Uppdatera mission status + logga event
CREATE OR REPLACE FUNCTION transition_mission(
  p_mission_id    UUID,
  p_to_status     TEXT,
  p_actor_id      TEXT DEFAULT NULL,
  p_actor_type    TEXT DEFAULT 'SYSTEM',
  p_metadata      JSONB DEFAULT '{}'
)
RETURNS missions
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_mission missions;
BEGIN
  SELECT * INTO v_mission FROM missions WHERE id = p_mission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mission not found: %', p_mission_id; END IF;

  -- Logga event
  INSERT INTO mission_events (mission_id, event_type, from_status, to_status, actor_id, actor_type, metadata)
  VALUES (p_mission_id, 'STATUS_CHANGE', v_mission.status, p_to_status, p_actor_id, p_actor_type, p_metadata);

  -- Uppdatera status
  UPDATE missions SET
    status = p_to_status,
    updated_at = now()
  WHERE id = p_mission_id
  RETURNING * INTO v_mission;

  RETURN v_mission;
END;
$$;

-- Hitta tillgängliga uppdrag nära en punkt
CREATE OR REPLACE FUNCTION find_nearby_missions(
  p_lat           DOUBLE PRECISION,
  p_lng           DOUBLE PRECISION,
  p_radius_meters INT DEFAULT 10000
)
RETURNS TABLE (
  id UUID, title TEXT, description TEXT,
  distance_meters DOUBLE PRECISION,
  payout_minor BIGINT, currency TEXT,
  deadline TIMESTAMPTZ, images_required INT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    m.id, m.title, m.description,
    ST_Distance(
      m.target_location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_meters,
    m.payout_minor, m.currency,
    m.deadline, m.images_required
  FROM missions m
  WHERE m.status = 'OPEN'
    AND m.target_location IS NOT NULL
    AND ST_DWithin(
      m.target_location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
  ORDER BY distance_meters ASC
  LIMIT 50;
$$;

-- Increment photographer stats (called on mission completion)
CREATE OR REPLACE FUNCTION increment_photographer_stats(
  p_photographer_id UUID,
  p_missions        INT DEFAULT 0,
  p_images          INT DEFAULT 0,
  p_earned          BIGINT DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE photographers SET
    missions_completed = missions_completed + p_missions,
    images_delivered   = images_delivered + p_images,
    total_earned_minor = total_earned_minor + p_earned
  WHERE id = p_photographer_id;
END;
$$;

-- ============================================================================
-- 8. SEED: Demouppdrag för Optic Insights-demo i Thailand
-- ============================================================================
INSERT INTO mission_zones (org_id, name, description, boundary, center_point, area_km2, city, country, tags)
VALUES (
  'a1000000-0000-0000-0000-000000000003',
  'Bangkok Central Zone',
  'Täcker Sukhumvit + Silom-korridoren i Bangkok',
  ST_GeomFromText('POLYGON((100.510 13.720, 100.580 13.720, 100.580 13.760, 100.510 13.760, 100.510 13.720))', 4326),
  ST_SetSRID(ST_MakePoint(100.545, 13.740), 4326),
  35.2,
  'Bangkok', 'TH',
  ARRAY['urban', 'infrastructure', 'high-density']
) ON CONFLICT DO NOTHING;

-- Demouppdrag (för Optic Insights-demo)
INSERT INTO missions (
  org_id, client_org_id, created_by,
  title, description, instructions,
  target_location, radius_meters,
  images_required, image_specs,
  status,
  payout_minor, client_price_minor, currency,
  deadline, metadata
) VALUES (
  'a1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000003',
  'system',
  'Bangkok Infrastructure Survey — Sukhumvit',
  'Fotografera infrastruktur längs Sukhumvit Road: trafikleder, skyltningar, byggnader',
  'Ta 5 bilder från olika vinklar. Inkludera: gatunivå (N/S/E/W) + overview. Håll kameran horisontell.',
  ST_SetSRID(ST_MakePoint(100.5608, 13.7308), 4326),
  2000,
  5,
  '{"resolution": "min 12MP", "format": "JPEG", "angles": ["north", "south", "east", "west", "overview"]}',
  'OPEN',
  500,    -- $5.00 till fotografen
  2500,   -- $25.00 från Optic Insights
  'USD',
  now() + INTERVAL '7 days',
  '{"demo": true, "client": "Optic Insights", "use_case": "infrastructure_monitoring"}'
),
(
  'a1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000003',
  'system',
  'Silom Road Commercial Zone — Retail Density',
  'Kartlägg kommersiell aktivitet längs Silom: skyltfönster, gatukök, trafikflöden',
  'Fokus på: butiksskyltar, kundflöden, infrastrukturskick. 3 bilder räcker.',
  ST_SetSRID(ST_MakePoint(100.5241, 13.7232), 4326),
  1500,
  3,
  '{"resolution": "min 8MP", "format": "JPEG"}',
  'OPEN',
  300,
  1500,
  'USD',
  now() + INTERVAL '5 days',
  '{"demo": true, "client": "Optic Insights", "use_case": "retail_intelligence"}'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_missions_status        ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_org           ON missions(org_id);
CREATE INDEX IF NOT EXISTS idx_missions_client_org    ON missions(client_org_id);
CREATE INDEX IF NOT EXISTS idx_missions_photographer  ON missions(assigned_photographer_id);
CREATE INDEX IF NOT EXISTS idx_missions_deadline      ON missions(deadline) WHERE status IN ('OPEN','ASSIGNED','IN_PROGRESS');
CREATE INDEX IF NOT EXISTS idx_missions_geo           ON missions USING GIST(target_location);
CREATE INDEX IF NOT EXISTS idx_photographers_location ON photographers USING GIST(last_location);
CREATE INDEX IF NOT EXISTS idx_mission_zones_boundary ON mission_zones USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_deliverables_mission   ON mission_deliverables(mission_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status    ON mission_deliverables(status);
CREATE INDEX IF NOT EXISTS idx_mission_events_mission ON mission_events(mission_id, created_at DESC);

-- ============================================================================
-- 10. RLS
-- ============================================================================
ALTER TABLE photographers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_zones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_deliverables  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE photographer_ratings  ENABLE ROW LEVEL SECURITY;

-- Service role = full access
CREATE POLICY pg_svc  ON photographers        FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY mz_svc  ON mission_zones        FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY ms_svc  ON missions             FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY md_svc  ON mission_deliverables FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY me_svc  ON mission_events       FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY pr_svc  ON photographer_ratings FOR ALL USING (current_setting('role', TRUE) = 'service_role');

-- Public read för open missions
CREATE POLICY ms_public_read ON missions FOR SELECT USING (status = 'OPEN');

COMMIT;
