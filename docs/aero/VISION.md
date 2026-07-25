# AEAN — Vision, Helicopter View, and the Phased Roadmap

> This document is the anchor for every "next level" idea that has
> come up in brainstorming sessions. Everything gets mapped to a
> phase, and every phase gets a concrete DoD. If a concept cannot be
> mapped to a phase, it is not ready to build.

## 0. What AEAN actually is

Not "better Wi-Fi on aircraft".

> **A predictive, edge-first internet layer for constrained networks,
> operated as an ISO-by-design SaaS.**

Three axes, in priority order:

1. **Identity.** Who is the passenger, which aircraft, which org?
2. **Network.** Where are they on the edge hierarchy, what is the
   link quality, what is the cost per byte?
3. **Session.** What are they doing, what will they do next, what
   should be staged in anticipation?

If we own those three, we own the experience. That is the helicopter
view in one paragraph.

## 1. Three-layer mental model

| Layer         | Where                | Job                                             |
|---------------|----------------------|--------------------------------------------------|
| Edge          | Onboard appliance    | Serve requests locally; predict; mirror sessions |
| Transport     | Satellite link       | Maximise every byte; dedupe; compress             |
| Cloud Brain   | AWS control plane    | Fleet learning; policy; audit; govern            |

The current `wavult-aero` service owns the **Cloud Brain** layer
completely. Edge and Transport are partnerships + future packages.

## 2. The phased roadmap

### Phase 1 — Control Plane MVP  *(this branch)*

Done in the current scaffold:

- Fleet registry with hash-chained history
- Edge-node enrolment with TPM attestation
- Telemetry ingest with SMS promotion
- Signed content packs (KMS integration stubbed, tracked as
  AEAN-REQ-SEC-005)
- Versioned prefetch policies with four-eyes promotion
- Append-only hash-chained event log with tamper detection
- Read-only circuit breaker
- RTM as code + build-time verifier
- Threat model as code
- QMS seed for AS9100D / DO-326A / EASA / ICAO Annex 19 / NIS2
- OpenAPI spec
- wavult-core proxy
- docker-compose integration

Definition of done: service passes `/health/ready` against a real
`wavult_os` database, RTM verifier returns zero violations in
non-strict mode, and at least one live AEAN-REQ-SEC-005-compliant
KMS key exists in eu-north-1.

### Phase 2 — Onboard Edge Daemon  *(next microservice)*

Scope: the actual software running on the 1U/2U appliance in the
passenger services LAN. Go or Rust (strict resource budget, no GC
latency). Owns:

- Local HTTP cache (Varnish or custom, TLS terminating only for
  cooperative origins)
- Prefetch queue driven by policies synced from the cloud
- Session state store (Redis or embedded RocksDB)
- Connectivity manager (FREE / STANDARD / MAX tiers)
- Telemetry uploader (batches to `/v1/telemetry/ingest`)
- Content-pack verifier (KMS public key cached, offline verify)
- TPM enrolment client

Not done in Phase 1 because we need the control plane first, and
because the onboard daemon is hardware-deployed — it cannot ship
from a single code commit.

Definition of done: daemon running on a reference 1U box in a lab,
verified enrolment end-to-end, one signed pack installed, telemetry
visible in the cloud, chaos test (link drop + 30% packet loss)
passes.

### Phase 3 — Passenger PWA + Crew Tablet

Scope: the browser-facing experience. This is what passengers
actually see. Lives in the existing `apps/command-center` stack or
as a new PWA package under `apps/wavult-aero-pwa`. Modules:

- Flight dashboard (cached, offline-first)
- Shop + 1-click buy
- Internet tier selector
- Destination feed (prefetched at takeoff)
- Crew order queue
- Crew inventory toggle

All requests hit the onboard edge daemon (Phase 2), never the cloud
directly in flight.

Definition of done: passenger can place an order, receive it from
the crew, and the order settles to the cloud on next sync, all
without an external internet connection.

### Phase 4 — ML + Prefetch Brain

Scope: the Cloud Brain learns from fleet behaviour and ships
better prefetch policies to the fleet.

Models:
- Next-click model (transformer-lite, per user cluster)
- Demand prediction (for commerce, not just cache)
- Bandwidth allocator (reinforcement-learned reward = perceived UX)
- Fleet intelligence (cross-aircraft learning per route and time
  of day)

SageMaker for training. ONNX for edge deployment. Feature store.
Online inference only for cloud-scope decisions — edge decisions
stay local.

Definition of done: measurable lift in cache hit rate on a
reference fleet compared to a heuristic policy.

### Phase 5 — Seamless Travel Layer (Airport OS)

Scope: extend the edge-first principle to the airport itself. This
is the "helicopter view" the user sketched. Handles:

- Device fingerprinting at airport approach
- Airport edge mesh (WiFi + BLE)
- Identity handshake before the passenger enters the terminal
- Device handoff from airport edge to aircraft edge at boarding
- Session transfer with state sync + conflict resolution
- Passive identification at security checkpoints (pilot with one
  airport, not every airport on day one)

This is a much larger deliverable than Phases 1–4 combined, and
every step is blocked by at least one non-technical party (airport
operator, regulator, airline IT). It is on the roadmap as a
direction, not a sprint.

Definition of done (for a single-airport pilot): one passenger
walks from terminal entry to seat without a manual scan, with
full audit trail of every identity event in the existing
`aero_event_log` pattern.

### Phase 6 — Horizontal expansion

The same primitives apply to every constrained-network environment:

- Maritime (cruise ships, cargo)
- Remote sites (mining, oil, research)
- Military / government (air-gapped islands)

Different GTM, same core product. This is how AEAN becomes
"Cloudflare for constrained networks" rather than just a flight
product.

## 3. Self-improvement loop

```
 Edge collects → Cloud analyses → Model updates → Policy ships → Edge improves
```

Phase 1 (the current scaffold) owns the "Cloud analyses" and
"Policy ships" legs. Phases 2 + 4 close the other two. The loop
becomes measurable once Phase 4 ships its first model update to
a production fleet.

## 4. Compute strategy, in one table

| Compute class | Where | Characteristic | Example workloads |
|---|---|---|---|
| Edge (onboard) | Aircraft | Deterministic, <10ms, offline-resilient | Cache hits, policy evaluation, session state |
| Device (passenger phone) | Client | Local inference, signal detection | PWA rendering, prefetch scoring |
| Cloud real-time | AWS API Gateway + Lambda + Redis | Latency-critical decisions | Content-pack lookups, breaker state |
| Cloud batch | SageMaker + EKS jobs | Heavy, not latency-critical | Model training, nightly analytics |
| Cloud streaming | Kinesis + consumers | Continuous, ordered | Telemetry feedback loop |

World-class execution means **separating these cleanly**. Mixing
real-time and batch compute is how every previous attempt at this
shape has died. The current scaffold enforces the separation at
the service boundary — `wavult-aero` is cloud real-time only;
batch and streaming live in future packages.

## 5. Team shape for each phase

| Phase | Minimum team |
|---|---|
| Phase 1 | 1 staff engineer, 1 QA (current state) |
| Phase 2 | + 1 Go/Rust edge engineer, + 1 hardware integrator |
| Phase 3 | + 1 frontend engineer |
| Phase 4 | + 1 ML engineer, + 1 data engineer |
| Phase 5 | + 1 airport-side SRE, + 1 identity engineer |
| Phase 6 | Different GTM team per vertical |

Total steady-state core team at Phase 4: 7–10 people. Not 100.
Lean elite beats big team in this problem space because the
feedback loop is slow and the correctness bar is high.

## 6. Where the moat actually is

Not the cache. Not the hardware. Not even the ML.

The moat is:

1. **The data.** The first company to have 100 fleets' worth of
   behavioural telemetry under constrained networks owns the
   training set nobody else can replicate.
2. **The audit rail.** Every other vendor in this space will have
   to bolt on hash-chained audit when regulators start asking.
   We have it on day one.
3. **The MRO relationship.** Whoever signs the first exclusive
   regional installation partnership with Lufthansa Technik or
   equivalent locks out fast followers for 3+ years.

The code in `apps/wavult-aero` is a prerequisite for getting to
those moats — it is not the moat itself. Build fast, sell faster.

## 7. What to do with every new "next level" idea

When a new idea comes in (Airport OS, ML MLOps, CI/CD hardening,
satellite optimiser, biometric identity, passenger PWA pixel
design, sales deck, investor memo, pilot strategy):

1. Find its home in the phase table above.
2. If it fits an existing phase, add it to that phase's DoD.
3. If it does not fit, write down WHY under "parked" in the
   next section.
4. Do not expand Phase 1 just because a new idea is exciting.
   Phase 1 is done when Phase 1 is done.

### Parked ideas

| Idea | Why parked | Revisit in |
|---|---|---|
| Full airport BLE mesh | Requires airport operator contract | Phase 5 |
| OEM IFE integration | 18-month sales cycle, no wedge yet | Phase 3+ |
| Military / government vertical | Different compliance stack (ITAR, FedRAMP) | Phase 6 |
| Native OS integration (iOS/Android) | Requires platform partnership | Phase 5 |
| Custom TPM-on-aircraft hardware design | Off-the-shelf is sufficient for MVP | Phase 2+ |
| Cabin IoT (seat, lights, call) | Not required for passenger internet; nice-to-have | Phase 5 |

## 8. One-line summary per phase

1. **Phase 1**: Ship the ISO-compliant cloud control plane. *(done)*
2. **Phase 2**: Put a reference edge appliance on a lab bench.
3. **Phase 3**: Passenger sees the experience in a browser.
4. **Phase 4**: Fleet learns and gets measurably faster.
5. **Phase 5**: Airport and aircraft feel like one system.
6. **Phase 6**: Same product, different constrained-network vertical.

If you find yourself writing code that does not move one of these
six phases forward, stop and re-read this file.
