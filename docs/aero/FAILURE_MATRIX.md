# AEAN — Failure Matrix

> Every concrete way the system can break, in order of severity, with
> the exact mitigation path and the file that owns it. Structured
> directly from the end-to-end customer-journey audit.
>
> Read this together with `CERTIFICATION_ROADMAP.md` § 5.1 (chaos
> scenarios) and `THREAT_MODEL.md` (adversarial failures). This file
> covers the **operational** failures: the things that go wrong when
> nobody is attacking you.

## 1. How to read this

Each row has:

- **Scenario** — what goes wrong
- **Blast radius** — what it breaks
- **Current state** — mitigated / partial / open
- **Mitigation** — the exact mechanism, with file reference
- **Gap to close** — what's still needed before a pilot

Severity order: SEV-1 (catastrophic, data loss or safety) → SEV-4 (minor UX).

## 2. Pre-flight failures (passenger device, airport)

| # | Scenario | Sev | Current | Mitigation | Gap |
|---|---|---|---|---|---|
| PF-01 | Device fingerprint collides between two passengers | 3 | Open | Phase 5: DID-based identity with device keys in secure enclave | Phase 5 scope (VISION.md) |
| PF-02 | Pre-flight cache exceeds iOS 200 MB background limit | 2 | Open | Tier content by priority: UI > shop > destination > media; evict on storage pressure | Phase 3 PWA scope |
| PF-03 | Passenger never opens the PWA before boarding — no pre-flight cache at all | 3 | Open | Graceful degradation: edge serves all content from its own cache at boarding, no harm done | Edge daemon (Phase 2) must tolerate empty device cache |
| PF-04 | Passenger opts out of pre-flight seeding (GDPR) | 2 | Open | Opt-in UX with plain-language explanation; system works identically, just without the warm cache win | Phase 3 PWA scope; DPIA in `CERTIFICATION_ROADMAP.md` § 4 gap 8 |
| PF-05 | Booking reference doesn't match a known flight | 3 | Open | Reject at identity layer; fall back to anonymous session | Phase 5 identity scope |

## 3. Boarding failures (airport → aircraft handoff)

| # | Scenario | Sev | Current | Mitigation | Gap |
|---|---|---|---|---|---|
| BD-01 | Passenger device connects to aircraft Wi-Fi but captive portal never triggers | 2 | Open | Standard captive-portal detection (Apple CNA, Android, Windows NCSI); bootstrap payload <100 KB | Phase 3 PWA scope |
| BD-02 | Device cache ↔ edge cache merge conflict | 3 | Open | Last-writer-wins for user preferences; immutable content-addressed for media (SHA-256 keys merge trivially) | Phase 2 edge daemon scope |
| BD-03 | Bootstrap payload fails to download (degraded WiFi at boarding) | 2 | Open | Inline critical-path CSS+JS in the captive-portal HTML so the first paint works with zero further requests | Phase 3 PWA scope |
| BD-04 | Edge daemon is down when the aircraft powers up | 1 | Partial | Systemd auto-restart; persistent local state on NVMe | Phase 2 edge daemon scope |

## 4. In-flight core failures (wavult-aero + edge + commerce)

### 4.1 State consistency

| # | Scenario | Sev | Current | Mitigation | Gap |
|---|---|---|---|---|---|
| IF-01 | Passenger places order, crew tablet never sees it | 1 | Partial | Append-only event log is source of truth; crew tablet subscribes to local event bus on the edge daemon; if the bus dies, the tablet polls the log. | Phase 2 edge daemon scope; local pub/sub design |
| IF-02 | Order fulfilled by crew, status on passenger device stays "pending" | 2 | Partial | Same bus, reverse direction. Status updates are also events in the log. | Phase 2 scope |
| IF-03 | Inventory drift — two passengers buy the last beer simultaneously | 1 | Open | Atomic decrement on edge daemon with optimistic-locking retry; on exhaustion, the second order gets a deterministic `OUT_OF_STOCK` event | Phase 2 scope; design locks inventory service to single-writer |
| IF-04 | Prefetch policy mid-flight promotes while a user is already mid-session | 3 | Mitigated | State machine in `prefetch-policies.ts`; promoted policies are effective for NEW sessions only, existing sessions continue on the prior policy until they end | Already handled |
| IF-05 | Hash chain break detected mid-flight | 1 | Mitigated | `verifyChain()` + circuit breaker in `src/middleware/readOnlyGate.ts`; service serves GETs only; on-call QA is paged | Already handled |

### 4.2 Fail-modes

| # | Scenario | Sev | Current | Mitigation | Gap |
|---|---|---|---|---|---|
| IF-06 | Edge daemon crash loop | 1 | Partial | K3s / systemd restart; cached UI continues to render from service worker; writes queue in IndexedDB on the device | Phase 2 scope |
| IF-07 | Passenger expects "real internet", discovers it's a mirror | 2 | Open | Brutally honest UX: "Optimised for flight" label with an info icon explaining what's cached vs. live; never lie about the nature of the link | Phase 3 PWA scope |
| IF-08 | Telemetry floods the control plane during an incident | 2 | Partial | Per-edge-node rate limit in `telemetry.ts`; telemetry batch size cap of 1000 samples / 500 events | Partial — need per-org and per-fleet quotas too (`THREAT_MODEL.md` AEAN-THR-005, residual=OPEN) |
| IF-09 | Wavult-aero control plane unreachable during flight | 2 | Mitigated | Autonomous mode: edge serves the last synced content packs and prefetch policies indefinitely; telemetry queues locally; sync resumes on reconnect | Already handled structurally; validate under chaos (CERTIFICATION_ROADMAP.md § 5.1) |
| IF-10 | AWS region (eu-north-1) full outage | 2 | Open | No multi-region failover yet. First deal is single-region. Multi-region is Phase 4. | Phase 4 scope |

### 4.3 Commerce and payments

| # | Scenario | Sev | Current | Mitigation | Gap |
|---|---|---|---|---|---|
| PY-01 | Passenger charged twice for the same order | 1 | Open | Idempotency key = `sha256(tail + seat + order_items + flight_id + ts_rounded_to_minute)`; Stripe PaymentIntent idempotency_key; edge-side order_id unique constraint | Phase 3 commerce scope |
| PY-02 | Passenger charged, never received the item | 1 | Open | Crew "fulfilled" event is mandatory before settlement; un-fulfilled orders after landing auto-refund via Stripe | Phase 3 scope |
| PY-03 | Crew marks "fulfilled" without delivering (fraud) | 3 | Open | Random passenger post-flight surveys; crew accountability via fulfilment rate anomaly detection | Phase 4 ML + Phase 3 survey UI |
| PY-04 | Crew tablet offline when an order settles | 2 | Partial | Offline queue of fulfilment events, flushed on reconnect | Phase 3 scope |
| PY-05 | Crew inventory is wrong at start of flight | 3 | Open | Pre-flight inventory audit screen on crew tablet; anomaly flagged to the senior crew member | Phase 3 scope |
| PY-06 | Passenger disputes a charge post-flight | 2 | Open | Audit log exposes the order event + fulfilment event with timestamps + crew id; dispute tooling generates a one-click evidence pack for Stripe | Phase 3 scope + commercial ops process |
| PY-07 | Fraud — one passenger buys 50 items on a stolen card | 2 | Open | Spend limit per session (€300 default, configurable per operator); anomaly detection on velocity | Phase 3 scope |

## 5. Synthetic world / map view (Phase 3 UX)

| # | Scenario | Sev | Current | Mitigation | Gap |
|---|---|---|---|---|---|
| MV-01 | GPS position vs rendered position drift | 4 | Open | Kalman smoothing filter on position updates; render at 1 Hz, interpolate for display | Phase 3 scope |
| MV-02 | Low-end device cannot render WebGL | 3 | Open | Capability detection on first load; degrade to pre-rendered video stream; degrade again to static map | Phase 3 scope |
| MV-03 | Tile cache miss over ocean | 3 | Partial | Pre-flight seeding prefers route-corridor tiles; oceans already well-cached since they're empty | Phase 3 scope |
| MV-04 | Map shows wrong aircraft type | 4 | Open | Aircraft type is a field on the fleet registry; map reads it and picks the right model | Already structurally supported; Phase 3 UI work |

## 6. Post-flight failures

| # | Scenario | Sev | Current | Mitigation | Gap |
|---|---|---|---|---|---|
| PO-01 | Passenger cannot find receipt after landing | 3 | Open | Receipt pushed to device email at fulfilment time; backup: passenger can log into wavult.com/aero/receipts with booking ref + seat | Phase 3 scope |
| PO-02 | Data loop doesn't feed ML | 3 | Open | Telemetry batches are already in `aero_telemetry` and `aero_operational_event`; Phase 4 opens a Kinesis consumer to feed the feature store | Phase 4 scope |
| PO-03 | Passenger wants to re-engage for next flight | 4 | Open | Email re-engagement post-flight with destination content for their return leg, if any | Phase 4 commercial scope |

## 7. Systemic failures (cross-cutting)

| # | Scenario | Sev | Current | Mitigation | Gap |
|---|---|---|---|---|---|
| SY-01 | Edge daemon version mismatch with control plane | 2 | Open | Version negotiation header on every call; control plane rejects edge builds older than N-1 | Phase 2 scope |
| SY-02 | Need to kill a feature remotely in mid-flight fleet | 1 | Open | Feature flags served from control plane, cached on edge for 24h offline, tripped via the circuit breaker if a feature causes an incident | Needs feature flag service — I'd recommend LaunchDarkly or an in-house service; Phase 2 scope |
| SY-03 | One operator wants config X, another wants config Y | 3 | Partial | Multi-tenant design: `org_id` on every row, prefetch policies are per-org | Structurally present, needs per-aircraft config overrides (Phase 2) |
| SY-04 | Legal liability for a bad purchase (wrong item, allergen, etc) | 1 | Open | Operator is the merchant of record; Wavult terms of service disclaim for catalogue accuracy; product catalogue content is owned by the operator | Legal contracts (Dennis) |
| SY-05 | GDPR subject access request lands for a passenger | 2 | Partial | Aero inherits Wavult's GDPR SAR process; hash-chained log means events cannot be deleted, but personal data can be crypto-shredded | DPIA + documented SAR runbook for aero |
| SY-06 | Operator leaves us and wants all their data back | 2 | Open | Data export endpoint per org id; output is JSON + SHA-256 manifest + zipped evidence pack | Phase 2 commercial scope |

## 8. The honest severity count

- **SEV-1 (catastrophic or safety):** 9 rows — of which 5 are mitigated structurally in Phase 1, 4 are open (IF-03, IF-06, PY-01, PY-02, SY-02). All 4 are Phase 2/3 scope and non-blocking for the cloud control plane.
- **SEV-2 (major):** 16 rows — all are known, none are surprises.
- **SEV-3 (moderate):** 11 rows — accepted for MVP.
- **SEV-4 (minor UX):** 3 rows — cosmetic.

## 9. What this doc changes in the RTM

Every row above that references a file in `apps/wavult-aero` is
already traced to a requirement. The new rows (IF-01, IF-02, IF-03,
IF-06, PY-01, PY-02, SY-01, SY-02) are Phase 2/3 scope and are
tracked in `VISION.md` under those phases — they are NOT added to
the RTM now, because the RTM should only track the current service.
Adding Phase 2 requirements to the Phase 1 RTM would make the
matrix dishonest.

When Phase 2 (the edge daemon) gets its own TypeScript/Go package,
it will have its own `requirements.ts` and its own RTM, and these
rows will move there.
