-- =====================================================================
-- QMS — Aviation control set (AEAN / wavult-aero)
--
-- Seeds aviation-specific controls into the existing Wavult QMS so the
-- 193-control backbone is extended with AS9100D, DO-326A, EASA Part-145,
-- and ICAO Annex 19 controls for the new microservice.
--
-- Assumes the QMS schema exposes:
--   qms_control(id, framework, clause, title, description, owner_email,
--               status, implementation, evidence_link, review_interval_days)
--
-- This file is IDEMPOTENT — re-running it is safe. Controls are upserted
-- by (framework, clause, id) and the implementation + description are
-- refreshed each time.
-- =====================================================================

-- Some deployments use `qms_controls` and some `qms_control`. Wavult OS
-- uses `qms_control` per AGENTS.md + server/src/routes/*.ts. If that
-- changes, update this file in the same PR as the schema change.

-- ---------------------------------------------------------------------
-- AS9100D — Quality Management Systems (Aviation, Space, Defense)
-- ---------------------------------------------------------------------
INSERT INTO qms_control (id, framework, clause, title, description, owner_email, status, implementation, review_interval_days)
VALUES
  ('AERO-AS9100D-7.5.3',  'AS9100D', '7.5.3',  'Control of Documented Information (Records)',
   'All aviation records are written to the append-only hash-chained event log in wavult-aero (aero_event_log). Updates/deletes are rejected by a database trigger. Projections are rebuildable from the log.',
   'quality@wavult.com', 'implemented',
   'apps/wavult-aero/src/lib/event-store.ts; apps/wavult-aero/migrations/001_aero_init.sql',
   30),
  ('AERO-AS9100D-8.1',    'AS9100D', '8.1',    'Operational Planning and Control',
   'Prefetch policy lifecycle (draft → review → approve → release → promote) is enforced in code, with four-eyes transitions and full audit trail.',
   'quality@wavult.com', 'implemented',
   'apps/wavult-aero/src/routes/prefetch-policies.ts',
   30),
  ('AERO-AS9100D-8.3.3',  'AS9100D', '8.3.3',  'Design and Development Inputs',
   'Requirements Traceability Matrix maintained as code in src/rtm/requirements.ts and verified at build time.',
   'cto@wavult.com', 'implemented',
   'apps/wavult-aero/src/rtm/requirements.ts; apps/wavult-aero/src/rtm/verify.ts',
   30),
  ('AERO-AS9100D-8.3.4',  'AS9100D', '8.3.4',  'Design and Development Controls',
   'Four-eyes promotion required for any prefetch policy reaching production. Enforced server-side, not only in the UI.',
   'cto@wavult.com', 'implemented',
   'apps/wavult-aero/src/routes/prefetch-policies.ts',
   30),
  ('AERO-AS9100D-8.5.2',  'AS9100D', '8.5.2',  'Identification and Traceability',
   'Every aircraft (tail + ICAO24), every edge node (hardware id + TPM attestation hash), and every content pack (pack_id + version + manifest SHA-256) is uniquely identified and fully traceable through the event log.',
   'quality@wavult.com', 'implemented',
   'apps/wavult-aero/src/routes/fleet.ts; apps/wavult-aero/src/routes/edge-nodes.ts; apps/wavult-aero/src/routes/content-packs.ts',
   30),
  ('AERO-AS9100D-10.2',   'AS9100D', '10.2',   'Nonconformity and Corrective Action',
   'Circuit breaker trips the service to read-only on integrity break or critical tamper alarm, pending CAPA resolution by authorised operator.',
   'quality@wavult.com', 'implemented',
   'apps/wavult-aero/src/middleware/readOnlyGate.ts',
   30)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  implementation = EXCLUDED.implementation,
  owner_email = EXCLUDED.owner_email,
  status = EXCLUDED.status;

-- ---------------------------------------------------------------------
-- DO-326A / ED-202A — Airworthiness Security
-- ---------------------------------------------------------------------
INSERT INTO qms_control (id, framework, clause, title, description, owner_email, status, implementation, review_interval_days)
VALUES
  ('AERO-DO326A-3.2', 'DO-326A', '3.2', 'Threat Model Maintained',
   'DO-326A threat model is codified in src/security/threat-model.ts and mirrored narratively in docs/aero/THREAT_MODEL.md. Every PR that changes assets, trust boundaries, or data flows must update both.',
   'cto@wavult.com', 'implemented',
   'apps/wavult-aero/src/security/threat-model.ts; docs/aero/THREAT_MODEL.md',
   30),
  ('AERO-DO326A-3.3', 'DO-326A', '3.3', 'Hardware Root of Trust for Edge Nodes',
   'Edge-node enrolment requires a TPM EK certificate and attestation quote. Software-only enrolment is rejected.',
   'cto@wavult.com', 'implemented',
   'apps/wavult-aero/src/routes/edge-nodes.ts',
   30),
  ('AERO-DO326A-3.4', 'DO-326A', '3.4', 'Signed Content Distribution',
   'Content packs are signed by a KMS-backed RSASSA_PSS_SHA_256 key via SignCommand with MessageType=DIGEST; edge nodes verify the detached signature against the cached KMS public key before install. Signing key is bound to the aero task role with a key policy that grants Sign only, never Decrypt, GetKeyPolicy, ScheduleKeyDeletion. Dev mode uses an ephemeral in-process RSA-4096 keypair under the same algorithm so the scaffold is self-hosting, with a key id prefix the fleet rejects.',
   'cto@wavult.com', 'implemented',
   'apps/wavult-aero/src/routes/content-packs.ts',
   30),
  ('AERO-DO326A-3.5', 'DO-326A', '3.5', 'Audience Separation',
   'JWT audiences are strictly scoped per service and per endpoint class (wavult-aero for operators, wavult-aero-edge for appliances). Cross-service token replay is rejected.',
   'cto@wavult.com', 'implemented',
   'apps/wavult-aero/src/middleware/requireAuth.ts',
   30),
  ('AERO-DO326A-3.6', 'DO-326A', '3.6', 'Tamper-Evident Audit Trail',
   'All safety-relevant events are hash-chained. A broken chain trips the circuit breaker.',
   'quality@wavult.com', 'implemented',
   'apps/wavult-aero/src/lib/event-store.ts; apps/wavult-aero/src/middleware/readOnlyGate.ts',
   30)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  implementation = EXCLUDED.implementation,
  owner_email = EXCLUDED.owner_email,
  status = EXCLUDED.status;

-- ---------------------------------------------------------------------
-- EASA Part-145 / Part-21 — Operational and production organisation rules
-- ---------------------------------------------------------------------
INSERT INTO qms_control (id, framework, clause, title, description, owner_email, status, implementation, review_interval_days)
VALUES
  ('AERO-EASA-145.A.55', 'EASA Part-145', '145.A.55', 'Maintenance Records',
   'Records are preserved for the lifetime of the aircraft. AEAN never deletes aviation-safety-sensitive rows; a lifecycle job moves old rows to S3 Glacier Deep Archive while preserving hash-chain integrity.',
   'quality@wavult.com', 'implemented',
   'apps/wavult-aero/src/lib/classification.ts; apps/wavult-aero/migrations/001_aero_init.sql',
   30),
  ('AERO-EASA-21.A.801', 'EASA Part-21', '21.A.801', 'Identification of Products',
   'Tail number, ICAO24, aircraft type, operator ICAO, and registration country are required fields at registration and immutable after the fact (changes via new events).',
   'quality@wavult.com', 'implemented',
   'apps/wavult-aero/src/routes/fleet.ts',
   30)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  implementation = EXCLUDED.implementation,
  owner_email = EXCLUDED.owner_email,
  status = EXCLUDED.status;

-- ---------------------------------------------------------------------
-- ICAO Annex 19 — Safety Management Systems
-- ---------------------------------------------------------------------
INSERT INTO qms_control (id, framework, clause, title, description, owner_email, status, implementation, review_interval_days)
VALUES
  ('AERO-ICAO19-5.3', 'ICAO Annex 19', '5.3', 'Safety Risk Management',
   'Safety-relevant edge telemetry (tamper, integrity, unauthorised access) is promoted to the SMS hazard log automatically and tripping of the circuit breaker on critical severity events.',
   'quality@wavult.com', 'implemented',
   'apps/wavult-aero/src/routes/telemetry.ts',
   30)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  implementation = EXCLUDED.implementation,
  owner_email = EXCLUDED.owner_email,
  status = EXCLUDED.status;

-- ---------------------------------------------------------------------
-- NIS2 — EU Network and Information Security Directive
-- ---------------------------------------------------------------------
INSERT INTO qms_control (id, framework, clause, title, description, owner_email, status, implementation, review_interval_days)
VALUES
  ('AERO-NIS2-ANNEX-I', 'NIS2', 'Annex I', 'Cybersecurity Risk Management for Essential Entities',
   'Aero inherits the Wavult NIS2 posture. Incident reporting obligations for aviation-safety-sensitive events are met via the MSB notification path already in the QMS.',
   'legal@wavult.com', 'implemented',
   'apps/wavult-aero/src/middleware/readOnlyGate.ts; docs/aero/THREAT_MODEL.md',
   30)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  implementation = EXCLUDED.implementation,
  owner_email = EXCLUDED.owner_email,
  status = EXCLUDED.status;
