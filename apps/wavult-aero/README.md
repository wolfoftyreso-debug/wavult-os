# wavult-aero

**AMOS Edge Aviation Network (AEAN) — control plane**

Cloud-side microservice for the onboard edge-internet optimisation
appliance. ISO-by-design: every mutation lands in a hash-chained
append-only event log, every requirement is traced in code, and the
service trips into read-only mode the moment the chain breaks.

## Why it exists

See `docs/aero/SYSTEM_ARCHITECTURE.md` for the full design. In one
sentence: we mirror the busy parts of the internet inside the
aircraft, run a prefetch engine against fleet-wide behaviour, and
distribute signed content packs through a cloud control plane whose
audit rail is something a regulator will actually accept.

## What is in this package

```
apps/wavult-aero/
├── src/
│   ├── index.ts                      Express bootstrap, boot integrity check
│   ├── build-info.ts                 Build metadata (git sha, sbom hash)
│   ├── lib/
│   │   ├── db.ts                     Postgres pool, cloud-Supabase block
│   │   ├── event-store.ts            Hash-chained append-only log
│   │   ├── classification.ts         Compile-time data classification
│   │   └── migrate.ts                Migration runner
│   ├── middleware/
│   │   ├── requireAuth.ts            Operator + edge-node JWT (audience-split)
│   │   └── readOnlyGate.ts           Circuit breaker
│   ├── routes/
│   │   ├── health.ts                 /health, /health/ready, /health/status
│   │   ├── fleet.ts                  /v1/fleet/aircraft*
│   │   ├── edge-nodes.ts             /v1/fleet/edge-nodes*
│   │   ├── telemetry.ts              /v1/telemetry/ingest
│   │   ├── content-packs.ts          /v1/content-packs*
│   │   └── prefetch-policies.ts      /v1/prefetch-policies*
│   ├── rtm/
│   │   ├── requirements.ts           Requirements Traceability Matrix as code
│   │   └── verify.ts                 Build-time RTM verifier
│   └── security/
│       └── threat-model.ts           DO-326A threat model as code
├── migrations/
│   └── 001_aero_init.sql             Postgres schema + append-only trigger
├── openapi.yaml                      Control-plane API spec
├── Dockerfile                        Hardened multi-stage build + RTM gate
├── package.json
└── tsconfig.json
```

Docs live in `docs/aero/`:

- `SYSTEM_ARCHITECTURE.md` — design, data flows, non-functional targets
- `THREAT_MODEL.md` — DO-326A threat model narrative (matches code)
- `REQUIREMENTS_TRACEABILITY.md` — RTM rules and how to add requirements
- `GTM_AVIATION.md` — go-to-market strategy for the aviation industry
- `COMMERCIAL_PACK.md` — pitch deck, investor case, first-deal playbook

QMS seed: `sql/qms-aviation-controls.sql` extends the existing
193-control QMS with AS9100D, DO-326A, EASA Part-145 / Part-21, ICAO
Annex 19, and NIS2 controls that are wired directly to files in this
package.

## Local development

```sh
cd apps/wavult-aero
npm install

# Point at a dev Postgres (wavult_os database)
export AERO_DATABASE_URL=postgres://wavult_admin:...@localhost:5432/wavult_os

# Apply migrations
npm run migrate

# Run the RTM verifier (non-strict, feature-branch mode)
npm run rtm:verify

# Start in watch mode
npm run dev
```

The service listens on `PORT` (default `3017`). The wavult-core
gateway proxies `/v1/aero/*` to this service via
`apps/wavult-core/src/routes/aero-proxy.ts`.

## Production build (RTM strict)

```sh
RTM_STRICT=1 npm run build
```

CI sets `RTM_STRICT=1` for the `rtm` and `main` branches. Under strict
mode, any requirement in status `draft` fails the build. The current
baseline has two drafts:

- `AEAN-REQ-SEC-005` — replace the stub KMS content signer with a
  live `KMS.Sign` call
- `AEAN-REQ-EDG-002` — wire the re-enrolment retirement event

Both are tracked in `docs/aero/GTM_AVIATION.md` section 7 as
day-1 to day-14 actions.

## Authentication model

- Operator routes accept JWTs with audience `wavult-aero`, issued by
  `identity-core`, validated against the KMS public key in
  production and HS256 in dev.
- Edge-node routes (`/v1/telemetry/ingest`, `/v1/content-packs/sync`)
  accept only JWTs with audience `wavult-aero-edge`. Operator tokens
  are rejected by `requireEdgeNode`.
- Roles: `aero_admin`, `aero_curator`, `aero_operator`, `aero_reviewer`,
  `aero_qa`, `aero_auditor`. See `REQUIREMENTS_TRACEABILITY.md`.

## The audit backbone

The single most important file in this package is
`src/lib/event-store.ts`. Read it before you change anything in the
request path. The rules:

1. Every state-changing operation writes to `aero_event_log` before
   it touches a projection table.
2. `aero_event_log` is enforced append-only by a Postgres trigger.
3. Each row chains to the previous row of its stream via
   `this_hash = SHA256(prev_hash || canonical_json(event))`.
4. `verifyChain(streamType, streamId)` walks a stream and returns
   the first sequence where the chain breaks.
5. Boot calls `verifyAllStreams` on `aircraft`, `edge_node`, and
   `content_pack`. A break trips the circuit breaker and the service
   serves GETs only until an authorised operator resets it.
6. There is no `UPDATE` path. If you find yourself wanting one, you
   have found a bug in your design — append a new event instead.

## Where to look when things are on fire

| Symptom | First thing to check |
|---|---|
| All writes return 503 SERVICE_READ_ONLY | `/health/status` → breaker reason |
| RTM verifier fails in CI | `docs/aero/rtm-matrix.json` (generated) |
| Can't register an aircraft | Aircraft with same tail or ICAO24 already exists |
| Edge node can't sync | Node status is `retired` or `quarantined`, or pack expired |
| Hash chain break on boot | Do NOT reset the breaker until a human audits the event log |

## Contributing

Changes go on a feature branch, PR against `rtm`, and take the
existing four-approval RTM gate (Dennis, Winston, Johan, Erik). The
PR template has an aviation section:

- [ ] RTM updated if requirements changed
- [ ] Threat model updated if assets/boundaries changed
- [ ] Classification audit: any new fields labelled correctly?
- [ ] DPA / RoPA checked if new personal data surface
- [ ] Migrations are additive (append-only compatible)
