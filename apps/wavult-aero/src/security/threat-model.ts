/**
 * threat-model — DO-326A / ED-202A threat model, codified.
 *
 * DO-326A §3.2 requires the applicant to maintain an evolving threat
 * model of the airborne information system security environment. We
 * keep it in TypeScript for the same reason we keep the RTM there: it
 * ships with the code, it is reviewed in the same PR, and CI can check
 * that every high-severity threat has a mitigation.
 *
 * This is the ground-side control plane's threat model. The onboard
 * appliance has its own model; the two intersect at the edge-node
 * enrolment and content-pack sync protocols.
 *
 * STRIDE categories are used for classification. Severity follows the
 * ARP4761 hazard classification scale so that it can be rolled up into
 * the system-level safety assessment.
 */

export type StrideCategory =
  | 'spoofing'
  | 'tampering'
  | 'repudiation'
  | 'information_disclosure'
  | 'denial_of_service'
  | 'elevation_of_privilege'

export type Severity = 'catastrophic' | 'hazardous' | 'major' | 'minor' | 'no-effect'

export interface Threat {
  id: string
  title: string
  stride: StrideCategory[]
  attacker: string
  asset: string
  scenario: string
  severity: Severity
  likelihood: 'rare' | 'unlikely' | 'possible' | 'likely' | 'almost-certain'
  mitigations: string[] // references to requirement ids
  residual_risk: 'accepted' | 'monitored' | 'open'
}

export const THREATS: readonly Threat[] = [
  {
    id: 'AEAN-THR-001',
    title: 'Attacker impersonates an edge node to poison the telemetry stream',
    stride: ['spoofing', 'tampering'],
    attacker: 'Network-adjacent adversary with stolen or cloned credentials',
    asset: 'Telemetry stream feeding fleet intelligence and SMS',
    scenario:
      'An attacker obtains a JWT or private key from a decommissioned edge ' +
      'appliance and attempts to push fabricated telemetry that hides real ' +
      'tamper alarms or suppresses cache-miss metrics to inflate vendor KPIs.',
    severity: 'hazardous',
    likelihood: 'possible',
    mitigations: ['AEAN-REQ-SEC-001', 'AEAN-REQ-SEC-002', 'AEAN-REQ-TEL-001', 'AEAN-REQ-SEC-003'],
    residual_risk: 'monitored',
  },
  {
    id: 'AEAN-THR-002',
    title: 'Malicious content pack reaches aircraft',
    stride: ['tampering', 'elevation_of_privilege'],
    attacker: 'Compromised curator account or insider',
    asset: 'Content distributed to the onboard cache',
    scenario:
      'A curator with stolen credentials publishes a content pack whose ' +
      'manifest references cached assets containing malicious payloads. ' +
      'Without signing, the edge node would install it on next sync.',
    severity: 'catastrophic',
    likelihood: 'unlikely',
    mitigations: ['AEAN-REQ-CNT-001', 'AEAN-REQ-CNT-002', 'AEAN-REQ-CNT-003', 'AEAN-REQ-SEC-005'],
    residual_risk: 'monitored',
  },
  {
    id: 'AEAN-THR-003',
    title: 'Audit log tampering to hide a safety incident',
    stride: ['tampering', 'repudiation'],
    attacker: 'Insider with database access',
    asset: 'The aero_event_log audit record',
    scenario:
      'An insider with direct Postgres access attempts to rewrite rows in ' +
      'aero_event_log to remove evidence of a tamper alarm or an unauthorised ' +
      'prefetch-policy change.',
    severity: 'hazardous',
    likelihood: 'rare',
    mitigations: ['AEAN-REQ-AUD-001', 'AEAN-REQ-AUD-002'],
    residual_risk: 'monitored',
  },
  {
    id: 'AEAN-THR-004',
    title: 'Unauthorised prefetch-policy promotion',
    stride: ['elevation_of_privilege', 'tampering'],
    attacker: 'Compromised operator with promote role',
    asset: 'The active prefetch policy set on a fleet',
    scenario:
      'An attacker with the aero_admin role attempts to draft, approve, ' +
      'release, and promote a malicious policy in a single session to reach ' +
      'production without independent review.',
    severity: 'major',
    likelihood: 'unlikely',
    mitigations: ['AEAN-REQ-PFT-002', 'AEAN-REQ-PFT-003', 'AEAN-REQ-SEC-004'],
    residual_risk: 'accepted',
  },
  {
    id: 'AEAN-THR-005',
    title: 'Denial of service on the control plane during an SMS event',
    stride: ['denial_of_service'],
    attacker: 'External adversary or misconfigured fleet',
    asset: 'Control plane availability during an active incident',
    scenario:
      'A burst of telemetry from a misbehaving or malicious fleet saturates ' +
      'the ingest path, preventing authorised SMS reports from reaching the ' +
      'operator.',
    severity: 'major',
    likelihood: 'possible',
    mitigations: ['AEAN-REQ-TEL-001', 'AEAN-REQ-SEC-004'],
    residual_risk: 'open',
  },
  {
    id: 'AEAN-THR-006',
    title: 'Credential reuse across services via audience confusion',
    stride: ['spoofing', 'elevation_of_privilege'],
    attacker: 'Adversary with a token from a sibling Wavult service',
    asset: 'Any aero control-plane route',
    scenario:
      'A token issued for wavult-core (audience "wavult-os") is replayed ' +
      'against wavult-aero. Without strict audience checks, aero would ' +
      'accept it and grant operator permissions.',
    severity: 'major',
    likelihood: 'possible',
    mitigations: ['AEAN-REQ-SEC-003'],
    residual_risk: 'accepted',
  },
] as const

export function highSeverityThreatsWithoutMitigation(): Threat[] {
  return THREATS.filter(
    (t) =>
      (t.severity === 'catastrophic' || t.severity === 'hazardous') &&
      t.mitigations.length === 0,
  )
}
