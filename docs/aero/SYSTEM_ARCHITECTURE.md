# AEAN — System Architecture

> AMOS Edge Aviation Network. The cloud-side control plane for the
> onboard edge-internet optimisation appliance.
>
> Scope of this document: the **control plane** microservice that lives
> in `apps/wavult-aero`. The **onboard appliance** (the box on the
> aircraft) and the **satellite link optimiser** are separate deliveries
> and are documented in their own design packs once the hardware
> reference design is frozen.

## 1. What AEAN is, in one paragraph

AEAN makes the onboard passenger internet experience feel like the
ground experience. It does this by maintaining a **locally mirrored,
predictive, edge-optimised version of the internet onboard the
aircraft**, fed by pre-approved, cryptographically signed content packs
and a prefetch engine that learns from fleet-wide behaviour. The cloud
control plane — this service, `wavult-aero` — is the ground-side system
that operators, curators, QA, and auditors use to manage the fleet,
publish content, approve policies, and review what happened.

## 2. Why it is a separate microservice

It sits in `apps/wavult-aero` rather than as a module inside
`wavult-core` because:

1. **Regulatory isolation.** The blast radius of an incident has to be
   small. An unrelated change to `wavult-core` should not be able to
   alter airworthiness records.
2. **Audit boundary.** `wavult-aero` owns its own hash-chained event
   log and its own tamper-detection breaker. A single service owns the
   records; auditors inspect one schema.
3. **Audience separation.** JWTs are audience-scoped to `wavult-aero`
   (operators) or `wavult-aero-edge` (aircraft appliances). A token
   issued to another Wavult service is rejected, closing an easy
   cross-service replay vector.
4. **Release cadence.** Releases are promoted through the existing RTM
   four-approval gate without dragging the rest of the monorepo with
   them.

## 3. Place in the Wavult OS monorepo

```
wavult-os/
├── apps/
│   ├── wavult-core/            <- API Core; aero registers its ingress rules here
│   ├── wavult-aero/            <- THIS SERVICE
│   │   ├── src/
│   │   │   ├── index.ts            <- Express bootstrap + integrity check
│   │   │   ├── routes/             <- /v1/fleet, /v1/telemetry, /v1/content-packs, /v1/prefetch-policies
│   │   │   ├── lib/
│   │   │   │   ├── db.ts                <- Postgres pool, cloud-Supabase block
│   │   │   │   ├── event-store.ts       <- HASH-CHAINED APPEND-ONLY LOG
│   │   │   │   ├── classification.ts    <- brand types for data classification
│   │   │   │   └── migrate.ts           <- runner for migrations/
│   │   │   ├── middleware/
│   │   │   │   ├── requireAuth.ts       <- operator + edge-node JWT
│   │   │   │   └── readOnlyGate.ts      <- circuit breaker
│   │   │   ├── rtm/
│   │   │   │   ├── requirements.ts      <- RTM as code
│   │   │   │   └── verify.ts            <- build-time verifier
│   │   │   ├── security/
│   │   │   │   └── threat-model.ts      <- DO-326A threat model as code
│   │   │   └── build-info.ts
│   │   ├── migrations/
│   │   │   └── 001_aero_init.sql
│   │   ├── openapi.yaml
│   │   └── Dockerfile
│   └── ...
├── docs/
│   └── aero/
│       ├── SYSTEM_ARCHITECTURE.md   <- this file
│       ├── THREAT_MODEL.md          <- narrative, backed by code
│       ├── REQUIREMENTS_TRACEABILITY.md
│       ├── GTM_AVIATION.md
│       └── rtm-matrix.json          <- generated at build time
└── sql/
    └── qms-aviation-controls.sql    <- seeds aviation controls into the QMS
```

## 4. Request flow — happy paths

### 4.1 Operator publishes a content pack

```
curator (browser)
  → command-center (React)
      → wavult-core /v1/aero/content-packs   (proxy, adds org scope)
          → wavult-aero /v1/content-packs    (validates, signs, audits)
              1. requireAuth — JWT audience = "wavult-aero", role = aero_curator
              2. readOnlyGate — verify breaker not tripped
              3. zod-validate the manifest entries
              4. compute canonical JSON of manifest
              5. KMS sign the canonical bytes (RSASSA_PSS_SHA_256)
              6. appendEvent('aero.content_pack.published.v1', classification=internal)
                 - lock tip of stream (SELECT ... FOR UPDATE)
                 - compute this_hash = SHA256(prev_hash || canonical_payload)
                 - INSERT into aero_event_log (append-only trigger enforced)
              7. INSERT into aero_content_pack projection
              8. respond 201 with event_id + manifest_sha256 + this_hash
```

### 4.2 Edge node syncs

```
onboard appliance
  → AEAN CDN endpoint (private, mTLS, edge-node JWT)
      → wavult-aero /v1/content-packs/sync
          1. requireEdgeNode — JWT audience = "wavult-aero-edge", edge_node_id in sub
          2. lookup tail + status — reject retired or quarantined nodes
          3. return all active packs targeting this tail AND model, NOT expired
             with manifest + signature + key ARN
      edge verifies signature OFFLINE using cached KMS public key
      edge fetches missing entries by sha256 from S3
```

### 4.3 Critical tamper alarm from the edge

```
onboard appliance detects sensor chassis opening
  → telemetry batch with events[0].kind = "tamper_alarm", severity = "critical"
      → wavult-aero /v1/telemetry/ingest
          1. requireEdgeNode
          2. resolve edge_node_id → tail + org
          3. promote tamper_alarm to appendEvent(classification=aviation-safety-sensitive)
          4. trip() the global circuit breaker with reason "edge_node:X:tamper_alarm"
          5. return 202
  BREAKER IS NOW TRIPPED:
    - all future mutating requests return 503 SERVICE_READ_ONLY
    - /health/status reports breaker = tripped
    - on-call QA pages via monitoring
    - auditor rebuilds state from aero_event_log to investigate
```

## 5. Data architecture

### 5.1 Hash-chained event log

The only table that matters for compliance is `aero_event_log`. Every
state change in the domain is written here first, and the projection
tables (`aero_aircraft`, `aero_edge_node`, `aero_content_pack`,
`aero_prefetch_policy`) are reconstructable from it.

Chain rule:

```
this_hash = SHA256(prev_hash || canonical_json({
  stream_id, stream_type, stream_seq, event_type, payload,
  classification, actor_sub, org_id, correlation_id, causation_id,
  recorded_at
}))
```

Concurrency: an append on a stream takes a row-level lock on the
current tip inside a transaction. Appends to different streams are
fully parallel. Appends to the same stream are serialised by Postgres.

Immutability: a `BEFORE UPDATE OR DELETE OR TRUNCATE` trigger raises an
`insufficient_privilege` exception even for superusers. The only way
to "change" a record is to append a new event — the history is
preserved.

Tamper detection: `verifyChain(streamType, streamId)` walks a stream
and returns the first sequence number where the chain breaks, or
`null` if intact. The boot integrity check calls
`verifyAllStreams('aircraft' | 'edge_node' | 'content_pack')` and
trips the breaker on any break.

### 5.2 Classification

Every event carries one of four levels:

| Level                          | Retention        | Example                                  |
|--------------------------------|------------------|------------------------------------------|
| `public`                       | 365 days         | Service heartbeat                         |
| `internal`                     | 3 years          | Content pack published                   |
| `restricted`                   | 7 years          | Aircraft registered (operator business)  |
| `aviation-safety-sensitive`    | Aircraft lifetime | Tamper alarm, integrity alarm            |

TypeScript brand types in `src/lib/classification.ts` make it a
compile-time error to pass a higher-classified value into a consumer
that expects a lower classification. This catches leaks at build time
rather than in a runtime log line.

### 5.3 Time-series split

Operational telemetry (cache hits, bandwidth samples) goes into a
separate, partition-ready table (`aero_telemetry`) with no
hash-chaining. Its retention is driven by business value, not audit
requirements. If an attacker floods telemetry to DoS the audit log,
the audit log is unaffected.

## 6. Identity and authorisation

Three audiences:

| Audience            | Who                    | Purpose                          |
|---------------------|------------------------|----------------------------------|
| `wavult-aero`       | Human operator         | Control-plane routes              |
| `wavult-aero-edge`  | Onboard appliance      | Telemetry + sync only             |
| `wavult-aero-auditor` | Read-only auditor     | History + evidence (planned)      |

Roles inside the operator audience:

| Role                | Rights                                                  |
|---------------------|---------------------------------------------------------|
| `aero_admin`        | Register aircraft, enrol/retire nodes, promote policies |
| `aero_curator`      | Publish content packs                                    |
| `aero_operator`     | Draft prefetch policies                                  |
| `aero_reviewer`     | Approve policies                                         |
| `aero_qa`           | Release policies to staging                              |
| `aero_auditor`      | Read-only, including history endpoints                   |

Four-eyes: `prefetch_policy` transitions refuse to accept the same
actor on two consecutive steps. A single compromised admin cannot
drive a policy from draft to promoted in one session.

## 7. Integration with Wavult OS

| Integration point                   | Status                                                  |
|-------------------------------------|---------------------------------------------------------|
| `wavult-core` gateway               | Planned (`/v1/aero/*` proxy routes)                     |
| `identity-core` JWT issuance        | Reuses existing issuer/KMS key; audience configured     |
| QMS 193-control database            | Seeds 30+ aviation controls in `sql/qms-aviation-controls.sql` |
| RTM four-approval PR gate           | Used as-is for `wavult-aero` releases                   |
| Continuous evidence collector        | Planned nightly cron → `aero_continuous_evidence`       |
| `command-center` UI                 | Planned `/aero` module                                  |

## 8. Non-functional targets

| Target                                | Value                  |
|---------------------------------------|------------------------|
| Control-plane availability (SLO)      | 99.9% rolling 30 days  |
| Telemetry ingest p99 latency          | < 200 ms               |
| Content-pack publish p99 latency      | < 1.5 s                |
| Boot integrity check (100k events)    | < 30 s                 |
| Hash-chain break detection → breaker  | < 60 s (background)    |
| Database RPO / RTO                    | 5 min / 30 min         |

## 9. What is deliberately not in scope

1. **Running on the aircraft.** This service is cloud-only. The
   onboard daemon is a separate deliverable and is expected to be
   written in Go or Rust for resource efficiency on constrained
   hardware.
2. **Real-time MITM of passenger HTTPS traffic.** The design is
   cooperative caching + signed content packs only. MITM of
   passenger TLS is both legally and technically off the table.
3. **Flight operations.** CAMO, crew rostering, FDP tracking, and
   maintenance tech logs are adjacent products; they do not live in
   `wavult-aero`.
4. **Airworthiness-release software (DO-178C on-aircraft).** The
   onboard appliance is passenger-services-only. It is not
   certified equipment; it hangs off the passenger bus, not the
   avionics bus. This is a deliberate choice that keeps us out of
   DO-178C certification scope for the MVP.
