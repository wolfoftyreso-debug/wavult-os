# AEAN — Threat Model (DO-326A / ED-202A)

> The canonical threat model for `wavult-aero` is the code in
> `apps/wavult-aero/src/security/threat-model.ts`. This document
> explains it in narrative form for auditors and for PR reviewers who
> need to reason about a change without reading TypeScript.
>
> Any PR that introduces a new asset, new trust boundary, new data
> flow, or new actor MUST update both the code and this document in
> the same commit. The PR template has a checkbox for this.

## 1. Security perimeter

AEAN's control plane lives in AWS eu-north-1 behind:

- Cloudflare (WAF, bot mitigation, TLS termination at edge)
- ALB (TLS termination inside the VPC)
- ECS Fargate tasks for `wavult-aero`
- RDS Postgres `wavult_os` (private subnet, SG allows only the aero
  task and the identity-core task)
- KMS for content-pack signing + JWT signing
- S3 `aean-content-*` bucket for content-pack payloads
- SSM Parameter Store for non-key secrets

Trust boundaries:

```
[ Public Internet ]
      |  TLS 1.3
[ Cloudflare WAF ]
      |  TLS 1.3
[ ALB ]
      |  HTTP/1.1 inside VPC
[ wavult-aero ECS task ] ----- IAM task role ------> [ KMS, S3, SSM, RDS ]
      ^
      |  mTLS + JWT (audience wavult-aero-edge)
[ Onboard edge node ] <-------- satellite ------- [ onboard passengers ]
```

Assets (ordered by safety relevance):

1. The hash-chained audit record (`aero_event_log`).
2. The content-pack signing key (KMS, never exported).
3. The prefetch policy set active on a fleet.
4. Edge-node credentials (TPM-attested short-lived JWTs).
5. Telemetry stream (contains operational KPIs and, on some
   platforms, pseudonymous session metadata).
6. Aircraft registry (tail numbers, operator, ICAO24).
7. Build artefacts (Docker images signed with cosign, SBOM in
   CycloneDX).

## 2. Actors

| Actor                   | Access path                 | Trust |
|-------------------------|-----------------------------|-------|
| Aero curator            | command-center → core → aero | Medium |
| Aero operator           | command-center → core → aero | Medium |
| Aero reviewer           | command-center → core → aero | Medium |
| Aero QA                 | command-center → core → aero | Medium |
| Aero admin              | command-center → core → aero | High (requires MFA) |
| Auditor (read-only)     | command-center → core → aero | Medium |
| Onboard edge appliance  | Direct mTLS + JWT            | Low (outside our physical control) |
| External adversary      | Public internet              | None  |
| Insider (DB-level)      | Direct Postgres              | High but constrained by append-only trigger |

## 3. Threat catalogue (STRIDE)

The code file `src/security/threat-model.ts` is the source of truth.
It currently lists six threats. Summary here for ease of review:

| Id            | Title                                                            | Severity      | Residual       |
|---------------|------------------------------------------------------------------|---------------|----------------|
| AEAN-THR-001  | Edge-node impersonation to poison telemetry                      | Hazardous     | Monitored       |
| AEAN-THR-002  | Malicious content pack reaches aircraft                          | Catastrophic  | Monitored       |
| AEAN-THR-003  | Audit log tampering to hide a safety incident                    | Hazardous     | Monitored       |
| AEAN-THR-004  | Unauthorised prefetch-policy promotion                           | Major         | Accepted        |
| AEAN-THR-005  | DoS on control plane during an SMS event                         | Major         | **Open**        |
| AEAN-THR-006  | Credential reuse across services via audience confusion         | Major         | Accepted        |

### 3.1 AEAN-THR-002 (catastrophic) — deep dive

A malicious content pack is the single highest-severity threat in
this model because its consequence is code reaching aircraft. The
mitigation stack is:

1. **Four-eyes on curator actions** — enforced by the existing
   Wavult approvals flow plus our role split (`aero_curator` can
   publish a pack; only `aero_admin` can register a new curator).
2. **KMS-backed detached signatures** over canonical manifest bytes.
   The signing key never leaves KMS; the app role can `Sign` but not
   `GetPublicKey` without `AERO_CONTENT_SIGNING_KEY_ARN` being set,
   and cannot `ScheduleKeyDeletion`.
3. **Target tail + target model scoping.** A compromised curator who
   publishes a pack can only reach tails already targeted by their
   org. A global-broadcast pack requires an explicit `target_tails`
   list matching every live tail — producing an obvious pattern for
   the continuous compliance job.
4. **Edge-side signature verification before install.** The onboard
   daemon verifies the detached signature using a cached KMS public
   key and rejects any mismatched manifest.
5. **Audit log entry per publish**, correlated by the operator JWT
   subject and the manifest SHA-256.

### 3.2 AEAN-THR-005 (open) — DoS residual

DoS during an SMS event is currently logged as residual-OPEN because
the ingest rate-limit is per-IP at the ALB and per-node in the app,
not per-org or per-fleet. A fleet-level quota and an isolation
pool for SMS-carrying requests are on the roadmap for v0.3.

## 4. Key management

- **JWT signing key.** Managed by `identity-core`. AEAN only
  validates. Key rotation is centralised.
- **Content-pack signing key.** `arn:aws:kms:eu-north-1:.../aean-content`.
  Asymmetric RSA-4096, `RSASSA_PSS_SHA_256`. Key policy grants `Sign`
  only to the AEAN task role; `Verify` is open to the edge-node role.
- **TLS certificates.** ACM managed at the ALB; auto-renewed.
- **Edge node private keys.** Generated inside the TPM, never exit
  the TPM. The app only ever sees a derived attestation quote.

## 5. What changes require a threat-model update

Any PR that:

- Adds a new endpoint, or removes an existing auth middleware
- Adds a new role, audience, or trust boundary
- Changes the classification level of any field
- Changes the retention rule for any classification
- Introduces a new external service dependency
- Changes how the hash chain is computed
- Touches `migrations/001_aero_init.sql`

…is required to update both `threat-model.ts` and this document.
The RTM verifier and the PR template together enforce this.

## 6. Continuous assurance

The nightly evidence collector walks:

1. `verifyAllStreams('aircraft' | 'edge_node' | 'content_pack')` and
   writes a `pass`/`fail` row per stream type into
   `aero_continuous_evidence` with control id `AS9100D-7.5.3`.
2. IAM policy drift for the KMS content-pack key (expected: no
   principals added or removed since last snapshot) — control id
   `DO-326A-KEY-01`.
3. Presence of a valid cosign signature on the currently running
   Docker image — control id `NIST-SSDF-PS.2.1`.
4. Missing draft requirements — control id `DO-178C-TRACE-01`.

Every row is hashed and the hash is stored in the evidence table,
so the nightly packet is itself tamper-evident.
