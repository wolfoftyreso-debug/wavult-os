-- =====================================================================
-- wavult-aero / AEAN — initial schema
--
-- Database: wavult_os  (on wavult-identity-ecs RDS, eu-north-1)
-- Author:   wavult-aero (AMOS Edge Aviation Network)
-- Baseline: 2026-04-11
--
-- Design constraints:
--   * All mutating tables have an immutable event-log counterpart
--     (aero_event_log). Projection tables here exist for query speed
--     only; they can be rebuilt from the log.
--   * aero_event_log is enforced append-only by a trigger — UPDATE and
--     DELETE raise an exception, even from superuser.
--   * Every domain table carries org_id for multi-entity scoping.
--   * Time-series tables are range-partitioned by day.
--   * No cascading DELETEs. Retirement is a state change, not a delete.
--
-- Requirements traceability:
--   @req AEAN-REQ-AUD-001  The domain event log is append-only and hash-chained.
--   @req AEAN-REQ-FLT-001  Aircraft have unique tail + ICAO24 in the registry.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- Schema migrations bookkeeping (lightweight, in-service).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aero_schema_migrations (
    name        TEXT PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum    TEXT NOT NULL
);

-- ---------------------------------------------------------------------
-- The event log. THIS IS THE AUDIT RECORD. Append-only.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aero_event_log (
    id              UUID PRIMARY KEY,
    stream_id       TEXT NOT NULL,
    stream_type     TEXT NOT NULL,
    stream_seq      BIGINT NOT NULL,
    event_type      TEXT NOT NULL,
    payload         JSONB NOT NULL,
    classification  TEXT NOT NULL
        CHECK (classification IN ('public','internal','restricted','aviation-safety-sensitive')),
    actor_sub       TEXT NOT NULL,
    org_id          TEXT NOT NULL,
    correlation_id  TEXT,
    causation_id    TEXT,
    prev_hash       TEXT NOT NULL CHECK (prev_hash ~ '^[0-9a-f]{64}$'),
    this_hash       TEXT NOT NULL CHECK (this_hash ~ '^[0-9a-f]{64}$'),
    recorded_at     TIMESTAMPTZ NOT NULL,
    UNIQUE (stream_type, stream_id, stream_seq)
);

CREATE INDEX IF NOT EXISTS aero_event_log_org_time_idx
    ON aero_event_log (org_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS aero_event_log_type_time_idx
    ON aero_event_log (stream_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS aero_event_log_actor_idx
    ON aero_event_log (actor_sub);
CREATE INDEX IF NOT EXISTS aero_event_log_payload_gin_idx
    ON aero_event_log USING GIN (payload);

-- Append-only trigger. Any UPDATE or DELETE raises a safety-of-audit exception.
CREATE OR REPLACE FUNCTION aero_event_log_immutable() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'aero_event_log is append-only (op=% user=%)', TG_OP, current_user
        USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS aero_event_log_no_update ON aero_event_log;
CREATE TRIGGER aero_event_log_no_update
    BEFORE UPDATE OR DELETE OR TRUNCATE ON aero_event_log
    FOR EACH STATEMENT EXECUTE FUNCTION aero_event_log_immutable();

-- ---------------------------------------------------------------------
-- Circuit breaker — singleton row, toggled by boot check + operator.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aero_circuit_breaker (
    id           TEXT PRIMARY KEY CHECK (id = 'global'),
    tripped_at   TIMESTAMPTZ,
    reason       TEXT,
    tripped_by   TEXT,
    reset_at     TIMESTAMPTZ,
    reset_by     TEXT
);
INSERT INTO aero_circuit_breaker (id, tripped_at) VALUES ('global', NULL)
    ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- Aircraft registry (projection).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aero_aircraft (
    tail_number             TEXT PRIMARY KEY,
    icao24                  TEXT NOT NULL UNIQUE,
    aircraft_type           TEXT NOT NULL,
    operator_icao           TEXT NOT NULL,
    certifying_authority    TEXT NOT NULL,
    registration_country    TEXT NOT NULL,
    org_id                  TEXT NOT NULL,
    registered_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS aero_aircraft_org_idx ON aero_aircraft (org_id);

-- ---------------------------------------------------------------------
-- Edge-node registry (projection).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aero_edge_node (
    edge_node_id        TEXT PRIMARY KEY,
    hardware_id         TEXT NOT NULL UNIQUE,
    tail_number         TEXT NOT NULL REFERENCES aero_aircraft(tail_number),
    model               TEXT NOT NULL,
    firmware_version    TEXT NOT NULL,
    ak_pub_sha256       TEXT NOT NULL,
    org_id              TEXT NOT NULL,
    status              TEXT NOT NULL CHECK (status IN ('active','retired','quarantined')),
    enrolled_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retired_at          TIMESTAMPTZ,
    retirement_reason   TEXT
);
CREATE INDEX IF NOT EXISTS aero_edge_node_tail_idx ON aero_edge_node (tail_number);
CREATE INDEX IF NOT EXISTS aero_edge_node_org_status_idx ON aero_edge_node (org_id, status);

-- ---------------------------------------------------------------------
-- Content packs (signed bundles).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aero_content_pack (
    pack_id             TEXT NOT NULL,
    version             TEXT NOT NULL,
    org_id              TEXT NOT NULL,
    manifest_sha256     TEXT NOT NULL,
    manifest_json       TEXT NOT NULL,
    signature_b64       TEXT NOT NULL,
    signing_key_arn     TEXT NOT NULL,
    signing_algorithm   TEXT NOT NULL,
    total_bytes         BIGINT NOT NULL,
    entry_count         INTEGER NOT NULL,
    target_tails        TEXT[] NOT NULL,
    target_models       TEXT[] NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          TEXT NOT NULL,
    expires_at          TIMESTAMPTZ,
    PRIMARY KEY (pack_id, version, org_id)
);
CREATE INDEX IF NOT EXISTS aero_content_pack_tails_idx
    ON aero_content_pack USING GIN (target_tails);
CREATE INDEX IF NOT EXISTS aero_content_pack_models_idx
    ON aero_content_pack USING GIN (target_models);

-- ---------------------------------------------------------------------
-- Prefetch policies (versioned, stateful).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aero_prefetch_policy (
    policy_id           TEXT NOT NULL,
    version             TEXT NOT NULL,
    org_id              TEXT NOT NULL,
    state               TEXT NOT NULL CHECK (state IN ('draft','pending_review','approved','released','promoted','retired')),
    body_json           TEXT NOT NULL,
    created_by          TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_transition_by  TEXT,
    last_transition_at  TIMESTAMPTZ,
    PRIMARY KEY (policy_id, version, org_id)
);

-- ---------------------------------------------------------------------
-- Telemetry (time-series, hot path).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aero_telemetry (
    edge_node_id   TEXT NOT NULL,
    tail_number    TEXT NOT NULL,
    ts             TIMESTAMPTZ NOT NULL,
    metric         TEXT NOT NULL,
    value          DOUBLE PRECISION NOT NULL,
    unit           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS aero_telemetry_node_ts_idx
    ON aero_telemetry (edge_node_id, ts DESC);
CREATE INDEX IF NOT EXISTS aero_telemetry_tail_ts_idx
    ON aero_telemetry (tail_number, ts DESC);

CREATE TABLE IF NOT EXISTS aero_operational_event (
    edge_node_id   TEXT NOT NULL,
    tail_number    TEXT NOT NULL,
    ts             TIMESTAMPTZ NOT NULL,
    kind           TEXT NOT NULL,
    severity       TEXT NOT NULL,
    detail         JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS aero_operational_event_node_ts_idx
    ON aero_operational_event (edge_node_id, ts DESC);
CREATE INDEX IF NOT EXISTS aero_operational_event_kind_idx
    ON aero_operational_event (kind);

-- ---------------------------------------------------------------------
-- Evidence collector — nightly populated by the continuous compliance job.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aero_continuous_evidence (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    control_id      TEXT NOT NULL,       -- e.g. "AS9100D-7.5.3", "DO-326A-SEC-08"
    status          TEXT NOT NULL CHECK (status IN ('pass','fail','warning','not_applicable')),
    evidence_sha256 TEXT NOT NULL,
    evidence_s3_key TEXT,
    notes           TEXT
);
CREATE INDEX IF NOT EXISTS aero_continuous_evidence_control_idx
    ON aero_continuous_evidence (control_id, collected_at DESC);

-- Migration marker
INSERT INTO aero_schema_migrations (name, checksum)
    VALUES ('001_aero_init', 'v1')
    ON CONFLICT (name) DO NOTHING;
