-- ============================================================================
-- quiXzoom Media Pipeline v1
-- S3 upload, EXIF extraction, CDN delivery, AI tagging
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. MEDIA_UPLOADS — Master-tabell för alla mediafiler
-- ============================================================================
CREATE TABLE IF NOT EXISTS media_uploads (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID    NOT NULL,
  -- Ägare
  uploaded_by       TEXT,               -- user ID
  mission_id        UUID,               -- koppling till uppdrag (om tillämpligt)
  photographer_id   UUID,
  -- Filinfo
  original_filename TEXT,
  file_key          TEXT    NOT NULL UNIQUE,   -- S3 key
  file_size_bytes   BIGINT,
  mime_type         TEXT    DEFAULT 'image/jpeg',
  -- CDN
  cdn_url           TEXT,               -- CloudFront URL
  thumbnail_key     TEXT,               -- S3 key för thumbnail
  thumbnail_url     TEXT,
  -- Geo (från EXIF eller manuellt)
  capture_lat       DOUBLE PRECISION,
  capture_lng       DOUBLE PRECISION,
  capture_altitude  DOUBLE PRECISION,
  capture_bearing   DOUBLE PRECISION,
  geo_source        TEXT    CHECK (geo_source IN ('EXIF','MANUAL','NONE')),
  capture_location  GEOMETRY(Point, 4326),
  -- Tidsstämplar
  captured_at       TIMESTAMPTZ,
  -- EXIF-rådata
  exif_data         JSONB   DEFAULT '{}',
  -- AI-analys
  ai_tags           TEXT[]  DEFAULT '{}',
  ai_description    TEXT,
  ai_confidence     NUMERIC(5,4),
  ai_processed_at   TIMESTAMPTZ,
  ai_model          TEXT,
  -- Pipeline-status
  pipeline_status   TEXT    NOT NULL DEFAULT 'UPLOADED' CHECK (pipeline_status IN (
                      'PENDING','UPLOADED','PROCESSING','READY','FAILED','ARCHIVED'
                    )),
  pipeline_error    TEXT,
  -- Metadata
  metadata          JSONB   DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. PRESIGNED_UPLOAD_TOKENS — Temporära S3 upload-tokens
-- ============================================================================
CREATE TABLE IF NOT EXISTS presigned_upload_tokens (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID    NOT NULL,
  mission_id      UUID,
  photographer_id UUID,
  -- S3
  file_key        TEXT    NOT NULL UNIQUE,
  presigned_url   TEXT    NOT NULL,
  -- Giltighetstid
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ,
  is_used         BOOLEAN DEFAULT false,
  -- Metadata
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. AI_PROCESSING_QUEUE — Kö för AI-analys
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_processing_queue (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id        UUID    NOT NULL REFERENCES media_uploads(id) ON DELETE CASCADE,
  priority        INT     NOT NULL DEFAULT 100,
  status          TEXT    NOT NULL DEFAULT 'PENDING' CHECK (status IN (
                    'PENDING','PROCESSING','COMPLETED','FAILED'
                  )),
  model_requested TEXT    DEFAULT 'basic-tagging',
  result          JSONB,
  error           TEXT,
  attempts        INT     DEFAULT 0,
  max_attempts    INT     DEFAULT 3,
  created_at      TIMESTAMPTZ DEFAULT now(),
  processed_at    TIMESTAMPTZ
);

-- ============================================================================
-- 4. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_media_uploads_org          ON media_uploads(org_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_mission      ON media_uploads(mission_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_photographer ON media_uploads(photographer_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_status       ON media_uploads(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_media_uploads_geo          ON media_uploads USING GIST(capture_location);
CREATE INDEX IF NOT EXISTS idx_presigned_tokens_key       ON presigned_upload_tokens(file_key);
CREATE INDEX IF NOT EXISTS idx_ai_queue_status            ON ai_processing_queue(status, priority);

-- ============================================================================
-- 5. RLS
-- ============================================================================
ALTER TABLE media_uploads            ENABLE ROW LEVEL SECURITY;
ALTER TABLE presigned_upload_tokens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_processing_queue      ENABLE ROW LEVEL SECURITY;

CREATE POLICY mu_svc  ON media_uploads           FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY put_svc ON presigned_upload_tokens FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY aiq_svc ON ai_processing_queue     FOR ALL USING (current_setting('role', TRUE) = 'service_role');
-- Org-nivå read
CREATE POLICY mu_org  ON media_uploads FOR SELECT USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

COMMIT;
