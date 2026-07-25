/**
 * requirements — Requirements Traceability Matrix as code.
 *
 * DO-178C § 6.5 and AS9100D § 8.3.3 both require a traceable link from
 * every requirement to its implementation and verification. We keep that
 * link in TypeScript so it ships with the code, is reviewed in the same
 * PR as the code, and is enforced at build time by rtm/verify.ts.
 *
 * Each requirement has:
 *   - id               unique, stable, never reused
 *   - text             the plain-language requirement
 *   - regulation       the external rule this maps to
 *   - implementation   the file(s) that satisfy it
 *   - verification     the test file that verifies it
 *   - status           draft | implemented | verified
 *
 * `verify.ts` walks the repo and checks that every implementation path
 * exists and contains an @req tag matching the id. A missing tag, a
 * missing file, or a status of "draft" on a production release fails CI.
 */

export type ReqStatus = 'draft' | 'implemented' | 'verified'

export interface Requirement {
  id: string
  text: string
  regulation: string
  implementation: string[]
  verification: string[]
  status: ReqStatus
  hazard_classification?: 'catastrophic' | 'hazardous' | 'major' | 'minor' | 'no-effect'
}

export const REQUIREMENTS: readonly Requirement[] = [
  // -----------------------------------------------------------------
  // Security — the bedrock. DO-326A / ED-202A / ISO 27001.
  // -----------------------------------------------------------------
  {
    id: 'AEAN-REQ-SEC-001',
    text: 'Edge nodes shall authenticate using a hardware root of trust (TPM/SE) at enrolment.',
    regulation: 'DO-326A §3.3; ISO 27001 A.8.24',
    implementation: ['src/routes/edge-nodes.ts'],
    verification: ['tests/edge-nodes.enrol.test.ts'],
    status: 'implemented',
    hazard_classification: 'hazardous',
  },
  {
    id: 'AEAN-REQ-SEC-002',
    text: 'Edge enrolment shall produce a credential that can be revoked without touching the aircraft.',
    regulation: 'DO-326A §3.4',
    implementation: ['src/routes/edge-nodes.ts'],
    verification: ['tests/edge-nodes.retire.test.ts'],
    status: 'implemented',
    hazard_classification: 'hazardous',
  },
  {
    id: 'AEAN-REQ-SEC-003',
    text: 'JWTs issued for control-plane operators shall not be accepted on edge-node ingest endpoints.',
    regulation: 'DO-326A §3.5; ISO 27001 A.5.17',
    implementation: ['src/middleware/requireAuth.ts'],
    verification: ['tests/auth.audience.test.ts'],
    status: 'implemented',
  },
  {
    id: 'AEAN-REQ-SEC-004',
    text: 'Every mutation shall be authenticated and authorised against a role.',
    regulation: 'ISO 27001 A.5.15, A.5.18',
    implementation: [
      'src/middleware/requireAuth.ts',
      'src/routes/fleet.ts',
      'src/routes/edge-nodes.ts',
      'src/routes/content-packs.ts',
      'src/routes/prefetch-policies.ts',
    ],
    verification: ['tests/authz.matrix.test.ts'],
    status: 'implemented',
  },
  {
    id: 'AEAN-REQ-SEC-005',
    text: 'Content-pack signing keys shall be KMS-backed and never exported. Production signs via AWS KMS SignCommand with RSASSA_PSS_SHA_256 and MessageType=DIGEST; only the digest leaves the task. Dev uses an ephemeral in-process RSA-4096 keypair under the same algorithm, with a "local-dev" key id that the fleet rejects.',
    regulation: 'ISO 27001 A.8.24; NIS2 Annex I; DO-326A §3.4',
    implementation: ['src/routes/content-packs.ts'],
    verification: ['tests/content-packs.kms-binding.test.ts'],
    status: 'implemented',
  },

  // -----------------------------------------------------------------
  // Audit — AS9100D / EASA records retention.
  // -----------------------------------------------------------------
  {
    id: 'AEAN-REQ-AUD-001',
    text: 'The domain event log shall be append-only and hash-chained.',
    regulation: 'AS9100D §7.5.3; EASA Part-145.A.55; DO-326A §3.6',
    implementation: ['src/lib/event-store.ts', 'migrations/001_aero_init.sql'],
    verification: ['tests/event-store.chain.test.ts'],
    status: 'implemented',
    hazard_classification: 'hazardous',
  },
  {
    id: 'AEAN-REQ-AUD-002',
    text: 'A broken hash chain shall trip the service into read-only mode until reset by an authorised operator.',
    regulation: 'AS9100D §10.2; DO-326A §3.6',
    implementation: [
      'src/middleware/readOnlyGate.ts',
      'src/index.ts',
    ],
    verification: ['tests/event-store.break.test.ts'],
    status: 'implemented',
    hazard_classification: 'hazardous',
  },
  {
    id: 'AEAN-REQ-AUD-003',
    text: 'Aviation-safety-sensitive events shall be retained for the lifetime of the aircraft.',
    regulation: 'EASA Part-145.A.55; FAA 14 CFR §43.9',
    implementation: ['src/lib/classification.ts'],
    verification: ['tests/classification.retention.test.ts'],
    status: 'implemented',
  },

  // -----------------------------------------------------------------
  // Fleet management.
  // -----------------------------------------------------------------
  {
    id: 'AEAN-REQ-FLT-001',
    text: 'Each aircraft shall have a unique tail number and ICAO24 in the registry.',
    regulation: 'ICAO Annex 7; EASA Part-21.A.801',
    implementation: ['src/routes/fleet.ts', 'migrations/001_aero_init.sql'],
    verification: ['tests/fleet.register.test.ts'],
    status: 'implemented',
  },
  {
    id: 'AEAN-REQ-FLT-002',
    text: 'All changes to the aircraft registry shall be preserved in the hash-chained event log.',
    regulation: 'AS9100D §7.5.3',
    implementation: ['src/routes/fleet.ts'],
    verification: ['tests/fleet.history.test.ts'],
    status: 'implemented',
  },

  // -----------------------------------------------------------------
  // Edge nodes.
  // -----------------------------------------------------------------
  {
    id: 'AEAN-REQ-EDG-001',
    text: 'An edge node shall be bound to exactly one aircraft tail at any time.',
    regulation: 'AS9100D §8.5.2 identification and traceability',
    implementation: ['src/routes/edge-nodes.ts'],
    verification: ['tests/edge-nodes.binding.test.ts'],
    status: 'implemented',
  },
  {
    id: 'AEAN-REQ-EDG-002',
    text: 'Re-enrolment of an edge node on a different tail shall emit a retirement event for the previous binding and a new enrolment event, both atomically in one transaction and causation-linked in the hash-chained audit log. Cross-org re-enrolment is refused.',
    regulation: 'AS9100D §8.5.2; EASA Part-145.A.55',
    implementation: [
      'src/routes/edge-nodes.ts',
      'migrations/002_aero_reenrol.sql',
    ],
    verification: ['tests/edge-nodes.reenrol.test.ts'],
    status: 'implemented',
    hazard_classification: 'major',
  },

  // -----------------------------------------------------------------
  // Telemetry / SMS (ICAO Annex 19).
  // -----------------------------------------------------------------
  {
    id: 'AEAN-REQ-TEL-001',
    text: 'Telemetry ingest shall be authenticated per edge node; operator tokens shall be rejected.',
    regulation: 'DO-326A §3.5',
    implementation: ['src/routes/telemetry.ts', 'src/middleware/requireAuth.ts'],
    verification: ['tests/telemetry.audience.test.ts'],
    status: 'implemented',
  },
  {
    id: 'AEAN-REQ-TEL-002',
    text: 'Safety-relevant telemetry events shall be promoted to the hash-chained audit log.',
    regulation: 'ICAO Annex 19 §5.3; DO-326A §3.6',
    implementation: ['src/routes/telemetry.ts'],
    verification: ['tests/telemetry.promotion.test.ts'],
    status: 'implemented',
    hazard_classification: 'major',
  },
  {
    id: 'AEAN-REQ-SMS-001',
    text: 'Critical tamper or integrity alarms shall trip the circuit breaker automatically.',
    regulation: 'ICAO Annex 19 §5.3; DO-326A §3.6',
    implementation: ['src/routes/telemetry.ts', 'src/middleware/readOnlyGate.ts'],
    verification: ['tests/telemetry.trip.test.ts'],
    status: 'implemented',
    hazard_classification: 'hazardous',
  },

  // -----------------------------------------------------------------
  // Content distribution.
  // -----------------------------------------------------------------
  {
    id: 'AEAN-REQ-CNT-001',
    text: 'Content packs shall be digitally signed over their canonical manifest bytes.',
    regulation: 'DO-326A §3.4',
    implementation: ['src/routes/content-packs.ts', 'src/lib/event-store.ts'],
    verification: ['tests/content-packs.sign.test.ts'],
    status: 'implemented',
  },
  {
    id: 'AEAN-REQ-CNT-002',
    text: 'Content pack distribution shall be scoped to target tail numbers and edge-node models.',
    regulation: 'AS9100D §8.5.2',
    implementation: ['src/routes/content-packs.ts'],
    verification: ['tests/content-packs.scope.test.ts'],
    status: 'implemented',
  },
  {
    id: 'AEAN-REQ-CNT-003',
    text: 'Every content-pack publication shall be recorded as a hash-chained audit event.',
    regulation: 'AS9100D §7.5.3',
    implementation: ['src/routes/content-packs.ts'],
    verification: ['tests/content-packs.audit.test.ts'],
    status: 'implemented',
  },

  // -----------------------------------------------------------------
  // Prefetch policy governance.
  // -----------------------------------------------------------------
  {
    id: 'AEAN-REQ-PFT-001',
    text: 'Prefetch policies shall be declarative and stored versioned in the control plane.',
    regulation: 'AS9100D §8.1',
    implementation: ['src/routes/prefetch-policies.ts'],
    verification: ['tests/prefetch.store.test.ts'],
    status: 'implemented',
  },
  {
    id: 'AEAN-REQ-PFT-002',
    text: 'Promotion of a prefetch policy to production shall require four-eyes approval.',
    regulation: 'ISO 27001 A.5.16; AS9100D §8.3.4',
    implementation: ['src/routes/prefetch-policies.ts'],
    verification: ['tests/prefetch.four-eyes.test.ts'],
    status: 'implemented',
  },
  {
    id: 'AEAN-REQ-PFT-003',
    text: 'All prefetch policy state transitions shall be recorded in the hash-chained audit log.',
    regulation: 'AS9100D §7.5.3',
    implementation: ['src/routes/prefetch-policies.ts'],
    verification: ['tests/prefetch.audit.test.ts'],
    status: 'implemented',
  },
] as const

export function requirementById(id: string): Requirement | undefined {
  return REQUIREMENTS.find((r) => r.id === id)
}
