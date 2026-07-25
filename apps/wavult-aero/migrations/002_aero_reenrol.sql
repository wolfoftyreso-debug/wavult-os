-- =====================================================================
-- wavult-aero — migration 002: re-enrolment support
--
-- An edge-node hardware appliance has a physical lifetime of ~5 years.
-- During that lifetime it may be moved between aircraft (a spare unit
-- replacing a failed one, a fleet reconfiguration, etc.). The AEAN model
-- treats that as a re-enrolment: the previous (edge_node_id, tail_number)
-- binding is RETIRED, and a new binding is ENROLLED. Both events are
-- written to the hash-chained audit log in the same transaction, so the
-- full provenance of a physical box is reconstructable from the log.
--
-- Migration 001 declared hardware_id as globally UNIQUE on aero_edge_node,
-- which blocked re-enrolment entirely — the second insert for the same
-- box would fail on the constraint. This migration replaces that with a
-- partial unique index scoped to active rows only, so there can be at
-- most one active binding for a given hardware_id at any time, but an
-- arbitrary number of historical retired bindings may coexist.
--
-- Rationale by regulation:
--   AS9100D §8.5.2 (identification and traceability) requires the full
--   history of the physical item to be traceable. A deleted row would
--   violate that; a retired row preserves it.
--
-- Requirements traceability:
--   @req AEAN-REQ-EDG-002  Re-enrolment on swap emits a retirement event
-- =====================================================================

-- Postgres auto-names UNIQUE column constraints as <table>_<col>_key.
-- The constraint from migration 001 is aero_edge_node_hardware_id_key.
ALTER TABLE aero_edge_node
    DROP CONSTRAINT IF EXISTS aero_edge_node_hardware_id_key;

-- Partial unique index: at most one active row per hardware_id.
CREATE UNIQUE INDEX IF NOT EXISTS aero_edge_node_hardware_active_uidx
    ON aero_edge_node (hardware_id)
    WHERE status = 'active';

-- An index on hardware_id that covers all rows for efficient lookup
-- during re-enrolment (find any active row, or the most recent retired
-- one for audit purposes).
CREATE INDEX IF NOT EXISTS aero_edge_node_hardware_idx
    ON aero_edge_node (hardware_id);

INSERT INTO aero_schema_migrations (name, checksum)
    VALUES ('002_aero_reenrol', 'v1')
    ON CONFLICT (name) DO NOTHING;
