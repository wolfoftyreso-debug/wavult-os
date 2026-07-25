# MASTER ROADMAP — Wavult Travel Platform

> Konsoliderad roadmap som fångar VARJE produkt, system, och specifikation
> från hela designsessionen. Inget utelämnat. Organiserat i faser med
> status, effort, beroenden, och ägare per item.
>
> Datum: 2026-07-25
> Grenar med levererad kod:
>   - `claude/aviation-microservice-iso-uBQeQ` (commit 30d1e70)
>   - `claude/ai-runtime-resilience-01` (commit f383bf4)

---

## STATUS-LEGEND

| Markör | Betydelse |
|---|---|
| LEVERERAD | Kod finns committad och pushad på en gren |
| DESIGNAD | Specifikation/design-doc finns, ingen kod |
| SPECIFICERAD | Krav definierade i sessionen, inget dokument/kod |
| ASPIRATIONELL | Nämnts som vision, inte detaljerat |

---

## DEL 1 — VISIONEN (ett stycke)

Wavult bygger en global travel-plattform som äger hela passagerarresan
från pre-flight (device-seeding, profiling) genom airport (AR-navigation,
digital twin, flow AI) till aircraft (edge-internet, commerce, cabin
control, synthetic earth view) och post-flight (data loop, re-engagement).
Plattformen är edge-first, offline-first, ISO-by-design, och white-label.
Den säljs som neutral infrastruktur — "AWS + Stripe + iOS layer for
aviation" — och monetiseras via SaaS per aircraft, revenue share på
försäljning, och revenue share på internet-tiers. Första kunden nås via
en 90-dagars betald pilot på en enda svansregistrering hos en europeisk
bizav- eller regionaloperatör.

---

## DEL 2 — VAD SOM FAKTISKT FINNS IDAG

### 2.1 Gren: `claude/aviation-microservice-iso-uBQeQ`

Commit `30d1e70`. 35 filer, 5 691 rader.

| Komponent | Status | Rader |
|---|---|---|
| `apps/wavult-aero/` — Express+TS microservice | LEVERERAD | ~3 240 |
| Hash-chained append-only event store | LEVERERAD | 309 |
| Fleet registry (aircraft, ICAO24, operator) | LEVERERAD | 111 |
| Edge-node enrolment + re-enrolment + retirement | LEVERERAD | 258 |
| Telemetry ingest (samples + safety-promotion) | LEVERERAD | 141 |
| Content-pack publishing (KMS-signerade manifest) | LEVERERAD | 283 |
| Prefetch-policy governance (4-stegs four-eyes) | LEVERERAD | 168 |
| RTM-as-code (21 krav, 0 drafts, verifierare) | LEVERERAD | 341 |
| Threat model as code (6 threats, STRIDE + ARP4761) | LEVERERAD | 141 |
| Data classification brands (compile-time) | LEVERERAD | 77 |
| Circuit breaker (read-only på tamper) | LEVERERAD | 94 |
| Auth middleware (RS256/KMS prod, HS256 dev, audience-split) | LEVERERAD | 155 |
| Postgres migrations (001 init + 002 re-enrolment) | LEVERERAD | 261 |
| OpenAPI 3.0.3 spec | LEVERERAD | 276 |
| Dockerfile (multi-stage, non-root, RTM build gate) | LEVERERAD | 20 |
| QMS aviation controls seed (13 kontroller) | LEVERERAD | 149 |
| `docs/aero/SYSTEM_ARCHITECTURE.md` | LEVERERAD | 257 |
| `docs/aero/THREAT_MODEL.md` | LEVERERAD | 152 |
| `docs/aero/REQUIREMENTS_TRACEABILITY.md` | LEVERERAD | 130 |
| `docs/aero/GTM_AVIATION.md` | LEVERERAD | 286 |
| `docs/aero/COMMERCIAL_PACK.md` | LEVERERAD | 378 |
| `docs/aero/VISION.md` | LEVERERAD | 256 |
| `docs/aero/PILOT_HIT_LIST.md` (15 namngivna targets + 3 mail) | LEVERERAD | 293 |
| `docs/aero/CERTIFICATION_ROADMAP.md` | LEVERERAD | 229 |
| `docs/aero/FAILURE_MATRIX.md` (48 failure modes) | LEVERERAD | 124 |
| `docs/aero/PRODUCTION_READINESS.md` (~90 checkboxar) | LEVERERAD | 211 |

**OBS:** Inte typekompilerad. Kräver `npm install && npm run build` lokalt.

### 2.2 Gren: `claude/ai-runtime-resilience-01`

Commit `f383bf4`. 8 filer, 958 rader.

| Komponent | Status | Rader |
|---|---|---|
| Heuristic fallback engine (`fallback.ts`) | LEVERERAD | 113 |
| Response quality gate (`response-quality.ts`) | LEVERERAD | 150 |
| Streaming orchestrator (`streaming.ts`) | LEVERERAD | 497 |
| Modified `orchestrator.ts` (fallback + quality integration) | LEVERERAD | +82/−41 |
| Modified `types.ts` (ResolvedModelId) | LEVERERAD | +17 |
| Modified `ai/index.ts` (new exports) | LEVERERAD | +14 |
| Modified `agents/types.ts` (ripple fix) | LEVERERAD | +7 |
| SSE endpoint `/v1/ai/orchestrate/stream` | LEVERERAD | +80 |

**Typekompilerad:** `tsc -p . --noEmit` exit 0, verifierat i sessionen.

### 2.3 Befintlig Wavult OS-stack (redan på main)

| System | Var |
|---|---|
| AI Orchestration (13 modeller, 7 providers, routing matrix) | `apps/wavult-core/src/ai/` |
| Agent Mesh (10 expert-agenter, proaktiv motor) | `apps/wavult-core/src/ai/agents/` |
| QMS (193 ISO-kontroller, RoPA, riskregister, CAPA) | `server/src/`, `sql/` |
| Command Center (React + TS frontend) | `apps/command-center/` |
| Identity Core (JWT, KMS, auth) | `apps/identity-core/` |
| Ledger + Finance + Payments | `server/src/ledger-api.ts` m.fl. |
| Governance + Audit | `server/src/governance-api.ts` m.fl. |
| RTM 4-approval gate | `.gitea/workflows/` |

---

## DEL 3 — FASINDELAD ROADMAP (7 FASER)

### FAS 1: AEAN Control Plane — LEVERERAD

**Vad:** Cloud-sidan av AMOS Edge Aviation Network. Registrerar fleet,
enrollar edge-noder, tar emot telemetri, distribuerar signerade content
packs, och governerar prefetch-policies via four-eyes-flöde. Allt
hash-chainat, append-only, tamper-detekterande.

**Status:** LEVERERAD (commit 30d1e70). Kvarvarande blockers:

| Blocker | Effort | Ägare |
|---|---|---|
| Kör `npm install && npm run build && RTM_STRICT=1 npm run rtm:verify` | 15 min | Johan |
| Skriv 3 integrationstester (hash-chain break, re-enrolment, four-eyes) | 1 dag | Johan |
| Extern threat-model-review | 1 dag extern | Johan |
| Wire `wavult-core` proxy `/v1/aero/*` | 2 timmar | Johan |
| Uppdatera `docker-compose.yml` med wavult-aero service | 30 min | Johan |
| ECS task-definition + SSM-parameterhierarki | 2–3 timmar | Johan |

---

### FAS 2: Onboard Edge Daemon

**Vad:** Den fysiska appliance-mjukvaran som körs på 1U/2U-servern i
flygplanet. Hanterar lokal cache, prefetch-exekvering, QoS-scheduling,
connectivity management, och offline-drift. Synkar mot control plane
(Fas 1) när satellitlänken är uppe.

**Status:** SPECIFICERAD. Noll kod.

**Effort:** 2–3 månader, team om 2–3 seniora engineers.

**Språk:** Go eller Rust (resurseffektivitet på constrained hw, inte Node).

| Subkomponent | Beskrivning | Effort |
|---|---|---|
| `edge-gateway` | Lokal API-router, entrypoint för alla passenger/crew-anrop | 2 v |
| `cache-engine` | L1 memory + L2 Redis + L3 NVMe, LFU+TTL eviction, content-addressed | 3 v |
| `prefetch-engine` | Konsumerar promoted policies från Fas 1, kör mot S3 via sat-länk | 2 v |
| `session-service` | Anonym device-session, seat-binding (optional) | 1 v |
| `connectivity-manager` | FREE/STANDARD/MAX tiers, token-bucket QoS, priority queue | 2 v |
| `protocol-optimizer` | HTTP/3 QUIC tuning, TCP BBR, connection pooling | 2 v |
| `compression-engine` | Brotli adaptive, delta encoding (rsync-style) | 1 v |
| `sync-agent` | Batch upload av telemetri + orders, retry med backoff, delta sync | 2 v |
| `offline-content-registry` | Lokal DB av preloaded content packs, verifierar signaturer offline | 1 v |
| K3s / containerd runtime | OS-image, secure boot, TPM-backed attestation vid boot | 2 v |
| Device ↔ edge handshake | När passenger WiFi-ansluter: mappa device cache → edge cache | 1 v |

**Beroenden:** Fas 1 levererad + referenshårdvara (1U AMD EPYC/Xeon D, 64 GB ECC, 4×NVMe RAID10, 2×10GbE).

**Regulatoriskt:** Kräver STC via MRO-partner (Lufthansa Technik, SR Technics, STS Aviation, AJW Group). Vi bygger mjukvaran, de äger STC.

---

### FAS 3: Passenger App + Crew Tablet + Commerce

**Vad:** Frontend-lagret som passagerare och kabinpersonal interagerar
med. Edge-first PWA som serveras lokalt från edge-daemon. All commerce
körs lokalt med offline payment queue.

**Status:** SPECIFICERAD. Noll kod.

**Effort:** 3–6 veckor, team om 2–3 (1 frontend, 1 backend, 1 UX).

| Subkomponent | Beskrivning | Effort |
|---|---|---|
| **Passenger PWA** | Next.js, App Router, Service Worker, IndexedDB | — |
| — `/` Home | Flight card (live), 3 CTA: Shop, Internet, Flight | 2 d |
| — `/shop` | Product grid, bundle section (AI), 1-click buy | 3 d |
| — `/internet` | FREE/STANDARD/MAX tier-val, live speed indicator | 1 d |
| — `/flight` | Karta (edge-cached tiles), höjd, hastighet, väder | 2 d |
| — `/orders` | Orderstatus (pending → preparing → delivered) | 1 d |
| — `/seat` (optional) | Lamp toggle, call crew | 1 d |
| **Crew Panel** | iPad-optimerad tablet-UI | — |
| — Orders queue | Nya/aktiva orders, filtrera, 1-tap fulfill | 2 d |
| — Inventory toggle | In stock / out, pre-flight audit screen | 1 d |
| **Commerce Service** | Product catalog, bundles, orders, inventory (atomic decrement) | 1 v |
| **Payment Service** | Tokeniserad via Stripe/Adyen, offline queue, batch settlement post-flight, idempotency key, spend limits, fraud guard | 2 v |
| **Bundle Engine** | Rule-based MVP (route=Spain → beer bundle), later ML | 3 d |

**UX-principer:**
- 0 loading screens. Alltid responsiv (<100 ms).
- Offline fallback alltid. UI renderar även om edge daemon kraschar.
- Aldrig ljug om vad som är live vs cached.

**Beroenden:** Fas 2 (edge daemon serverar PWA + API lokalt).

---

### FAS 4: ML Pipeline + Fleet Intelligence + Synthetic View

**Vad:** Dataplattformen som gör systemet intelligent. Telemetri flödar
från edge → cloud → SageMaker → feature store → modell → tillbaka till
edge som uppdaterade policies.

**Status:** SPECIFICERAD. Noll kod.

**Effort:** 3–6 månader, team om 2 (1 ML, 1 data engineering).

| Subkomponent | Beskrivning | Effort |
|---|---|---|
| **Kinesis telemetry pipeline** | Edge → Kinesis → Lambda/Glue → S3 data lake | 2 v |
| **Feature store** (SageMaker) | Aggregerade features per route, per aircraft, per tidsfönster | 2 v |
| **Next-action model** | Transformer-lite/LSTM: förutse nästa click/scroll/content-type | 2 mån |
| **Demand prediction** | Per-route inventory prediction (route=Spain → hög öl-demand) | 1 mån |
| **Bandwidth allocator** | RL-baserad: reward = upplevd UX-förbättring | 2 mån |
| **Cross-aircraft learning** | Aggregera beteendemönster per route/tid/aircraft type, pushback till enskild edge | 1 mån |
| **ONNX edge-deploy** | Exportera modeller till ONNX, deploya till edge-daemon inference runtime | 2 v |
| **Synthetic Earth View** | Mapbox + WebGL, GPS → viewport, tile prefetch längs flygväg | 3 v |
| — AI enhancement | ESRGAN/super-resolution, cloud removal (segmentation), detail synthesis | 2 mån |
| — Camera blending (optional) | `finalFrame = alpha * realCamera + (1-alpha) * mapRender` | 2 v |
| — Low-end fallback | Capability detection → video stream / static map | 1 v |

**Beroenden:** Fas 2 + 3 levererade (telemetriflöde + passenger-session-data behövs för training).

---

### FAS 5: Trust Fabric + Cryptographic Identity

**Vad:** Verifiable Edge Fabric — kryptografisk identitet för device →
airport → airline → aircraft utan centralt single-point-of-failure.
INTE blockchain. W3C DID + Verifiable Credentials + append-only
hash-chained log (redan levererat i Fas 1).

**Status:** DESIGNAD (koncept i sessionen). Noll kod.

**Effort:** 2–3 månader, team om 2 (1 krypto/identity, 1 backend).

| Subkomponent | Beskrivning | Effort |
|---|---|---|
| **Device identity** | Private key i Secure Enclave (iOS) / StrongBox (Android), `device_id = hash(pubkey)` | 2 v |
| **DID registry** (cloud) | `did:web` för airlines, `did:key` för devices, registrerat i wavult-aero | 2 v |
| **Credential issuance** | Airline utfärdar `BookingCredential` (VC), Wavult utfärdar `DeviceBindingCredential` | 3 v |
| **Offline verification** | Edge-nod verifierar presentation utan cloud-hopp; cached public keys | 2 v |
| **Revocation status list** | Short-TTL status list publicerad till S3/CDN, OCSP-style | 1 v |
| **Presence events** | Edge publicerar verifierade presence-events till hash-chain-loggen | 1 v |
| **Airport → aircraft handoff** | Session serialiseras vid boarding zone, aircraft edge tar emot state, device reconnectar sömlöst | 2 v |
| **Zero-knowledge positioning** | Systemet vet "någon är i zon X" men inte exakt vem (om inte Apple/airline godkänner) | 1 v |
| **Edge consensus** | Lightweight quorum: device + airport + airline → consensus = allow. Inte mining. | 2 v |

**Trust-modell:**
```
Device signs: "I am this user"
Ticket signed by: airline authority
Edge verifies: signatures match
→ no QR, no scanning, just presence + trust
```

**Beroenden:** Fas 1 (hash-chain-loggen) + MRO-partner + airport-partner.

**Nyckelprincip:** ALDRIG använda ordet "blockchain" externt. Säg istället:
"Verifiable Edge Network", "Cryptographic Identity Fabric", "Distributed Trust Layer".

---

### FAS 6: Airport OS + AR + Digital Twin + Flow AI

**Vad:** Flygplatsens operativsystem. Indoor positioning, AR-navigation,
live digital twin med crowd density, och AI som styr passagerarflöden.

**Status:** SPECIFICERAD. Noll kod.

**Effort:** 6–12 månader, team om 4–6 + hårdvara + airport-partnerskap.

| Subkomponent | Beskrivning | Effort |
|---|---|---|
| **Indoor positioning** | Hybrid: BLE beacons + WiFi fingerprinting + IMU (accelerometer/gyro). Cm-precision via Visual SLAM. | 2 mån + hw |
| **2D/3D karta** | Kräver CAD-data från flygplatsoperatören. Renderas i Three.js/Unity. | 1 mån |
| **AR navigation** | ARKit (iOS), ARCore (Android), WebXR fallback. World anchors vid gates, butiker, lounger. Pilar på golvet, "Gate B12 → 4 min". | 3 mån |
| **Digital Twin** | Sensor-ingestion (WiFi probes, BLE scans, kameror med CV, boarding data). State engine per zon (people count, density, flow speed). Update-loop 1 Hz. 3D-render med grön/gul/röd per zon. | 3 mån |
| **Flow AI** | Optimal-path routing: `cost = distance + crowd_factor + delay_risk`. Real-time re-routing vid crowd buildup. Nudging: "gå nu", "ta vänster", "du hinner köpa kaffe här". | 2 mån |
| **Route monetization** | "Gå via butik X" (sponsrad route deviation). "Du har 6 min → köp detta" (time-window offers). | 1 mån |
| **Predictive crowd model** | Förutse köer 30 min innan baserat på flight schedule + historisk data. | 2 mån |
| **Global network effect** | Alla flygplatser lär sig av varandra. Cross-airport learning via aggregerad data. | 3 mån |
| **Autonomous flow control** | AI styr hela flygplatsens passagerarflöde autonomt. Fas 6 extended scope. | 6 mån |

**MVP-steg inom Fas 6:**
1. 2D-karta + manuell position + enkel routing (2 v)
2. BLE positioning + live routing (2 mån)
3. AR-pilar + basic twin (3 mån)
4. Flow AI + monetisering (2 mån)

**Beroenden:** Airport-partner (fysisk access, CAD-data, BLE-installation), Fas 5 (identity).

---

### FAS 7: Platform Expansion

**Vad:** Samma edge-first, offline-first, commerce-driven arkitektur
applicerad på andra constrained-network-miljöer.

**Status:** ASPIRATIONELL.

| Vertikal | Varför det passar | Effort |
|---|---|---|
| **Maritime** (kryssningar, färjor) | Samma satellit-länk, samma commerce-behov, liknande passagerarvolym | 3–6 mån adaptation |
| **Remote mining / oil rigs** | Extreme constrained connectivity, hög betalningsvilja | 3–6 mån adaptation |
| **Military networks** | Zero trust, edge-first, offline mandatory, classified data handling | 6–12 mån + clearance |
| **Tåg / high-speed rail** | Intermittent connectivity, commerce opportunity, crowd flow | 3–6 mån adaptation |

---

## DEL 4 — KOMPLETT PRODUKTKATALOG (21 PRODUKTER)

Varje rad = en distinkt byggbar enhet med eget team-scope.

| # | Produkt | Fas | Status | Effort (1 team) | Beroenden |
|---|---|---|---|---|---|
| 1 | AEAN Control Plane (fleet, edge-nodes, telemetry, content-packs, prefetch-policies) | 1 | LEVERERAD | — | — |
| 2 | AI Runtime Resilience (fallback, quality gate, streaming) | 1 | LEVERERAD | — | — |
| 3 | Onboard Edge Daemon (Go/Rust, K3s, cache, sync) | 2 | SPECIFICERAD | 2–3 mån | #1 + hw |
| 4 | Satellite Link Optimizer (QUIC, TCP BBR, FEC, dedup, delta) | 2 | SPECIFICERAD | 2–3 mån | #3 |
| 5 | Passenger PWA (Next.js, Service Worker, offline-first) | 3 | SPECIFICERAD | 3–4 v | #3 |
| 6 | Crew Tablet Panel (iPad, orders, inventory, fulfill) | 3 | SPECIFICERAD | 2 v | #5 |
| 7 | Commerce Service (products, orders, inventory, bundles) | 3 | SPECIFICERAD | 2–3 v | #3 |
| 8 | Payment Service (Stripe/Adyen tokenized, offline queue, settlement) | 3 | SPECIFICERAD | 3–4 v | #7 |
| 9 | Connectivity Manager (FREE/STANDARD/MAX tiers, QoS, priority) | 2 | SPECIFICERAD | 2 v | #3 |
| 10 | Pre-Flight Personal Edge Seeding (device agent, profile, prefetch) | 4 | SPECIFICERAD | 4–8 v | #3 + #5 |
| 11 | ML Pipeline (Kinesis → SageMaker → feature store → ONNX → edge) | 4 | SPECIFICERAD | 3–6 mån | #3 + data |
| 12 | Next-Action / Demand / Bandwidth ML Models | 4 | SPECIFICERAD | 3–6 mån | #11 |
| 13 | Synthetic Earth View (Mapbox + WebGL + AI upscaling) | 4 | SPECIFICERAD | 2–4 mån | #3 + #5 |
| 14 | Trust Fabric / DID + VC Identity Layer | 5 | DESIGNAD | 2–3 mån | #1 + airport |
| 15 | AIR Runtime (zone engine, event engine, delivery layer) | 5 | SPECIFICERAD | 2–3 mån | #14 |
| 16 | Apple Context Activation Layer (Wallet, Siri, PassKit triggers) | 5 | SPECIFICERAD | 2–4 mån | #14 + Apple |
| 17 | Airport OS (indoor positioning, AR nav, digital twin, flow AI) | 6 | SPECIFICERAD | 6–12 mån | #14 + airport hw + CAD |
| 18 | Neutral Aviation Experience Layer (SDK, adapters Viasat/Gogo/Stripe) | 3 | SPECIFICERAD | 2–4 mån | #3 |
| 19 | Terraform + Helm + EKS Infra | 1–2 | SPECIFICERAD | 2–4 v | — |
| 20 | Cabin Adapter (Airbus/Boeing abstraction) | 3 | SPECIFICERAD | 2–4 mån | OEM docs |
| 21 | Chaos / Load Testing Framework | 1–2 | DESIGNAD | 1–2 v | #1 |

---

## DEL 5 — 30-DAGARS MVP-SPRINT

Mappning av den 30-dagars sprint-planen mot faserna ovan. Denna sprint
fokuserar på att nå "demo-ready" status med edge + commerce + AI.

| Dagar | Fokus | Produkter (från DEL 4) | Definition of Done |
|---|---|---|---|
| 1–3 | Foundation | #3 (skeleton), #5 (bootstrap), #19 (docker-compose) | `localhost:3000` laddar UI, `/open/products` svarar |
| 4–6 | Commerce core | #7, #6 | 3 devices → beställ → syns i crew panel. Order <2 s. |
| 7–9 | Offline + queue | #7 (queue), #8 (mock payment) | Stäng nät → beställ → återställ → sync. 0 data loss. |
| 10–12 | Edge cache + prefetch | #3 (cache-engine) | Första load långsam, andra load <100 ms. |
| 13–15 | AI runtime | #2 (redan LEVERERAD) | Stäng API → fortfarande svar. Svar <500 ms alltid. |
| 16–18 | Preflight system | #10 (MVP) | Öppna app innan flight → öppna ombord → instant. |
| 19–21 | Internet tiers + QoS | #9 | MAX märkbart snabbare än FREE. |
| 22–24 | Synthetic Earth View | #13 (MVP) | Zoom + rotation smooth. Inga lagg. |
| 25–26 | Airport OS MVP | #17 (2D only) | Klicka → route visas. |
| 27–28 | Chaos + hardening | #21 | `tc qdisc netem delay 800ms loss 20%` → system lever. |
| 29 | Demo build | Alla ovan | 1 edge, 3–5 mobiler, 1 iPad. Full flow. |
| 30 | Pilot ready | — | Fungerande demo, stabil edge, offline works, payment queue. |

**Krav per dag:**
- Ship varje dag (commit + deploy staging)
- Edge-first, offline-first
- Commerce MÅSTE funka dag 7
- AI får ALDRIG dö (Fas 1-leverans täcker detta redan)

**Prioritetsordning (rubba inte):**
1. UI speed
2. Orders
3. Offline
4. Edge cache
5. AI

---

## DEL 6 — GO-TO-MARKET (konsoliderad)

### 6.1 Positionering

> "We plug into your stack and increase revenue without changing anything."

Vi är:
- Orchestration + Experience + Revenue Layer
- INTE connectivity provider, INTE avionics system, INTE payment processor

Vi ersätter inget. Vi kopplar ihop allt.

### 6.2 Intäktsmodell

| SKU | Pris | Notering |
|---|---|---|
| AEAN Edge per aircraft per år (bizav) | EUR 80 000 | Inkl. appliance, cloud, SLA |
| AEAN Edge per aircraft per år (regional, fleet ≥10) | EUR 50 000 | Volume |
| AEAN Edge per aircraft per år (major, fleet ≥100) | EUR 30 000 | Volume |
| Revenue share (onboard sales) | 10–15% | Alignment |
| Revenue share (internet tiers) | 15–20% | Alignment |
| AEAN Intelligence (anonymiserad fleet data) | Revenue share 40/60 (operator/Wavult) | Ancillary |

### 6.3 Channels

```
Wavult (us)
  ├── MRO installation partner (EASA Part-145 / Part-21J) → äger STC
  ├── Connectivity provider (Starlink, Inmarsat, Viasat) → vi sitter ovanpå
  ├── IFE content curator (Deltek, Touch, SPAFAX) → content packs
  └── Direct sales (AE + SE) → bizav, regional
```

### 6.4 Entry strategy

1. Sälj INTE till stora airlines först
2. Sälj till IFE/connectivity providers (gatekeepers) ELLER direkt till bizav/regional
3. Visa demo → ROI proof → pilot deal (1 aircraft, 90 dagar, EUR 25k)
4. Bevisa revenue uplift → fleet expansion → OEM-samtal

### 6.5 Pilot hit-list (15 targets)

Fullständig lista med namngivna operatörer, warm-intro-hypotetser, ägare
på Wavult-sidan, och 3 ready-to-send outreach-mail finns i:
**`docs/aero/PILOT_HIT_LIST.md`** (på `claude/aviation-microservice-iso-uBQeQ`).

**Tier 1 (Nordic, varmast):** BRA, Widerøe, Air Leap, Novair, TAG Aviation Nordic.
**Tier 2 (European bizav):** GlobeAir, Air Hamburg, Luxaviation, VistaJet, Flexjet Europe.
**Tier 3 (Opportunistic):** Loganair, Binter Canarias, Aurigny, Air Corsica, Titan Airways.

**Blockers innan outreach:**
1. 1-pager PDF (brand colors cream/navy/gold)
2. 90-sekunder demo-video
3. Landningssida `wavult.com/aero`
4. Calendly-länk
5. `aero@wavult.com` alias

### 6.6 OEM-samtal (månad 9+, parallellt)

Collins Aerospace, Panasonic Avionics, Thales InFlyt, Viasat.
Mål: integration som layer inuti deras next-gen IFE content server.
Budget 6–12 månader bara för att komma till pilot.

### 6.7 Talking points (första kundmötet)

1. "Vi ersätter inte er WiFi. Vi sitter mellan er WiFi och internet."
2. "Instagram loads instantly even over the Atlantic. Det är vad de ser."
3. "Er chief of safety frågar vad som kan gå fel. Jag öppnar hash-chain-loggen."
4. "Vi är AS9100D och DO-326A by design. Regulatorn frågar — vi har pappret."
5. "Första året: en betald pilot på en svans. Ingen fleet-commitment."

---

## DEL 7 — CERTIFIERINGSSTACK (konsoliderad)

### 7.1 Position

**Safety-adjacent, non-flight-critical system.** Vi sitter på passenger
services LAN, inte avionics bus. Samma STC-path som befintlig WiFi.

### 7.2 Ramverk-för-ramverk

| Ramverk | Behov | Status | Evidens |
|---|---|---|---|
| **AS9100D** (aerospace quality) | Måste | 6 kontroller i QMS seed | `sql/qms-aviation-controls.sql` |
| **DO-326A / ED-202A** (airworthiness security) | Måste | 5 kontroller + threat model as code | `src/security/threat-model.ts` |
| **DO-355 / ED-204** (info sec continuing airworthiness) | Måste | Partiellt | Gap: vuln intake + patch process |
| **ICAO Annex 19** (SMS) | Stöd | 1 kontroll | Telemetri-promotion till audit log |
| **EASA Part-145.A.55** (records retention) | Måste | Implementerad | Classification + append-only + Glacier lifecycle |
| **PCI-DSS** | Scope exclude | — | Vi rör aldrig kortdata (Stripe/Adyen) |
| **PSD2 SCA** | Scope exclude | — | Payment processor äger SCA |
| **GDPR** | Ärvs från Wavult | RoPA finns | Gap: ny processing activity för aero telemetri |
| **NIS2** | Ärvs från Wavult | 1 kontroll i QMS | Gap: MSB-registrering (öppet i AGENTS.md) |
| **ISO 27001** | Ärvs + utvidgas | KMS, audit log, audience split | Formell audit planerasmed Wavult-schemat |
| **ISO 9001** | Via AS9100D | — | — |
| **TÜV SÜD** | Planerad | — | Pre-audit gap assessment månad 6 |

### 7.3 TÜV-processplan

1. Intern gap assessment (Dennis + Johan, 5 dagar)
2. Pre-audit self-assessment (3 mån efter pilot)
3. TÜV SÜD engagement, Hamburg (6 mån efter pilot)
4. Formell audit Stage 1 + 2 (12 mån efter pilot)
5. Certifikat i hand (13–14 mån efter pilot)

### 7.4 Chaos testing (krav före pilotrelease)

| Scenario | Hur | Success |
|---|---|---|
| 30% packet loss | `tc qdisc netem loss 30%` | Cache hit ≥50%, telemetri catchup |
| 800 ms latency | `tc qdisc netem delay 800ms` | UI <150 ms lokalt |
| 60 min full drop | `ip link set down` | Edge serverar allt cached |
| 300 sessions | Load gen | Inga 5xx, ingen OOM |
| RDS failover | Multi-AZ trigger | Reconnect <30 s |
| Hash-chain corruption | Deliberat UPDATE i test-DB | Breaker trips, read-only |
| Token replay cross-service | Operator-token mot edge-endpoint | Rejected |
| Four-eyes bypass | Samma actor submit+approve | FOUR_EYES_VIOLATION |

### 7.5 Release gate (noll undantag)

- [ ] Zero crashes under chaos 48h
- [ ] Zero hash-chain breaks i staging
- [ ] Alla hazardous+ RTM-krav i status verified
- [ ] Pen-test rapport stängd (inga high/critical öppna)
- [ ] Backup/restore drill <14 dagar
- [ ] SBOM genererad + signerad (CycloneDX + cosign)
- [ ] Docker image signerad
- [ ] 4 RTM-godkännanden (Dennis/Winston/Johan/Erik)

### 7.6 Compliance-principen

> Compliance är en produktfeature, inte overhead. Varje kontroll vi
> implementerar har dubbelt syfte: (1) gör auditorns jobb enklare,
> (2) gör sales-konversationen kortare. Om en kontroll bara gör (1)
> men inte (2), radera ceremonin.

Fullständig cert-roadmap med gaps, ägare, och deadlines finns i:
**`docs/aero/CERTIFICATION_ROADMAP.md`** (på `claude/aviation-microservice-iso-uBQeQ`).

---

## DEL 8 — HORIZONTAL TRACKS (tvärgående system)

### 8.1 AI Runtime

| Komponent | Status | Gren |
|---|---|---|
| 13-model routing matrix per task_type | LEVERERAD (befintlig) | main |
| Heuristic fallback (silence is failure) | LEVERERAD | ai-runtime-resilience-01 |
| Response quality gate (empty/refusal/truncation) | LEVERERAD | ai-runtime-resilience-01 |
| SSE streaming orchestrator | LEVERERAD | ai-runtime-resilience-01 |
| Token splitting (reasoning/factual/format) | EJ BYGGT, EJ REKOMMENDERAT | — |
| Self-healing critique loops | EJ BYGGT, EJ REKOMMENDERAT | — |
| Periodic 2s health checks | EJ BYGGT, låg ROI vs API-quota | — |
| Latency-aware dynamic routing | EJ BYGGT, ~50 rader, värt att bygga | — |

### 8.2 Commerce + Payments

| Komponent | Status | Fas |
|---|---|---|
| Product catalog | SPECIFICERAD | 3 |
| Order lifecycle (created → queued → fulfilled → settled) | SPECIFICERAD | 3 |
| Offline payment queue | SPECIFICERAD | 3 |
| Stripe/Adyen tokenized capture | SPECIFICERAD | 3 |
| Idempotency keys (`hash(tail + seat + items + flight + ts)`) | SPECIFICERAD | 3 |
| Spend limits + anomaly detection | SPECIFICERAD | 3 |
| Bundle engine (rule-based → ML) | SPECIFICERAD | 3→4 |
| Receipt + post-flight re-engagement | SPECIFICERAD | 3 |

### 8.3 Apple Integration

| Komponent | Status | Fas |
|---|---|---|
| Wallet trigger (boardingkort visas automatiskt) | SPECIFICERAD | 5 |
| Apple Pay readiness i lounge/gate | SPECIFICERAD | 5 |
| Siri actions (context-triggered) | SPECIFICERAD | 5 |
| **Positionering:** "We activate Apple experiences, we don't own identity" | DESIGNAD | 5 |
| **Privacy-krav:** On-device identity, ephemeral tokens, zero-knowledge positioning | SPECIFICERAD | 5 |

### 8.4 Observability

| Komponent | Status | Plats |
|---|---|---|
| AI stats (byModel, byTaskType, avgLatency, cacheHitRate, successRate) | LEVERERAD | `orchestrator.ts` |
| AI logs (10k in-memory buffer, trim on overflow) | LEVERERAD | `orchestrator.ts` |
| Cache stats (size, activeEntries) | LEVERERAD | `cache.ts` |
| Aero health/ready/status endpoints | LEVERERAD | `routes/health.ts` |
| Circuit breaker status | LEVERERAD | `readOnlyGate.ts` |
| Nightly evidence collector (aero) | SPECIFICERAD | Fas 1 gap |
| CloudWatch alarms (5xx, p99, restarts, breaker) | SPECIFICERAD | Fas 1 gap |

---

## DEL 9 — PARTNERS & CHANNELS

| Typ | Namn | Roll | Status |
|---|---|---|---|
| MRO (STC-partner) | Lufthansa Technik | STC-ägare, installation | Identifierad |
| MRO | SR Technics | A320/A330 focus | Identifierad |
| MRO | AJW Group | Europa/US | Identifierad |
| MRO | STS Aviation | Bizav + regional | Identifierad |
| Connectivity | Starlink Aviation | Vi sitter ovanpå | Co-sell potential |
| Connectivity | Viasat | Vi sitter ovanpå | Co-sell potential |
| Connectivity | Gogo | Vi sitter ovanpå | Co-sell potential |
| IFE OEM | Collins Aerospace | Next-gen IFE integration | Fas 7+ |
| IFE OEM | Panasonic Avionics | Next-gen IFE integration | Fas 7+ |
| IFE OEM | Thales InFlyt | Next-gen IFE integration | Fas 7+ |
| Payment | Stripe | Tokenized payments | Standard integration |
| Payment | Adyen | Tokenized payments | Alternativ |
| Content | Deltek / Touch / SPAFAX | Licensed catalogues → content packs | Fas 3 |

---

## DEL 10 — VAD SOM ÄR EXPLICIT OUT-OF-SCOPE

| Sak | Varför det inte byggs |
|---|---|
| DO-178C-certad programvara | Vi sitter på passenger services LAN, inte avionics bus |
| MITM av passenger HTTPS | Juridiskt och tekniskt omöjligt; cooperative caching only |
| Flight operations (CAMO, crew rostering, tech log) | Angränsande produkt, inte vår |
| Äga passagerarens identity | Apple/airline äger identity; vi triggar context |
| Ersätta connectivity providers | Vi sitter ovanpå, aldrig istället för |
| Kräva exklusivitet | Vi ska vara "the easiest yes in the room" |
| Kalla zoomers för "fotografer" | AGENTS.md ABSOLUT REGEL |
| Dark mode | AGENTS.md permanent borttaget |

---

## DEL 11 — DELIVERY LEDGER

| Leverans | Commit | Gren | Rader | Typekompilerad |
|---|---|---|---|---|
| AEAN Control Plane (Fas 1) | `30d1e70` | `claude/aviation-microservice-iso-uBQeQ` | 5 691 | Nej (kräver lokal verify) |
| AI Runtime Resilience | `f383bf4` | `claude/ai-runtime-resilience-01` | 958 | Ja (`tsc` exit 0) |
| Master Roadmap | (denna commit) | `claude/roadmap-consolidation-01` | — | N/A (markdown) |

---

## DEL 12 — ÖPPNA BESLUT SOM KRÄVER MÄNSKLIGT SVAR

| # | Fråga | Vem bestämmer | Påverkar |
|---|---|---|---|
| 1 | Ska edge-daemon skrivas i Go eller Rust? | Johan (CTO) | Fas 2 rekrytering |
| 2 | Ska Apple-spåret (CAL/Wallet/Siri) drivas aktivt eller parkeras? | Erik (CEO) | Fas 5 scope |
| 3 | Vilken MRO-partner kontaktas först? | Erik + Leon | Fas 2 timeline |
| 4 | Ska 30-dagars-sprinten startas med befintligt team eller kräver den anställning? | Erik + Winston (CFO) | Budget |
| 5 | Vilken av de 15 pilot-targets prioriteras? | Erik | GTM execution |
| 6 | Ska AI-runtime-grenen mergas till main nu eller vänta på review? | Johan | Release |
| 7 | Vem kör `npm run build` på aero-grenen och rapporterar resultatet? | Johan | Fas 1 stängning |

---

## DEL 13 — DOKUMENTKARTA

Alla docs som skapats under sessionen, var de lever, och vad de täcker:

| Dokument | Gren | Sökväg | Vad det täcker |
|---|---|---|---|
| System Architecture | aero | `docs/aero/SYSTEM_ARCHITECTURE.md` | Kontrollplanet, request flows, data architecture, identity, non-functional targets |
| Threat Model | aero | `docs/aero/THREAT_MODEL.md` | 6 threats STRIDE + ARP4761, security perimeter, key management |
| Requirements Traceability | aero | `docs/aero/REQUIREMENTS_TRACEABILITY.md` | Hur RTM-processen fungerar, id-format, status lifecycle |
| Vision | aero | `docs/aero/VISION.md` | 6-fas roadmap (subset av detta dokument) |
| GTM Aviation | aero | `docs/aero/GTM_AVIATION.md` | 12-månaders GTM-plan, pricing, channels, first-30-days |
| Commercial Pack | aero | `docs/aero/COMMERCIAL_PACK.md` | Pitch deck skelett, investor case, first-deal playbook |
| Pilot Hit List | aero | `docs/aero/PILOT_HIT_LIST.md` | 15 namngivna targets, 3 outreach-mail, follow-up rules |
| Certification Roadmap | aero | `docs/aero/CERTIFICATION_ROADMAP.md` | Framework-by-framework mapping, chaos scenarios, release gate, TÜV plan |
| Failure Matrix | aero | `docs/aero/FAILURE_MATRIX.md` | 48 operational failure modes med SEV + mitigation + gap |
| Production Readiness | aero | `docs/aero/PRODUCTION_READINESS.md` | ~90-box checklist: code, config, DB, auth, observability, security, compliance, infra, commercial |
| **Master Roadmap** | roadmap | **`docs/MASTER_ROADMAP.md`** | **DETTA DOKUMENT — den konsoliderade helheten** |

---

## DEL 14 — NÄSTA 5 KONKRETA ACTIONS (i ordning)

1. **Kör `npm install && npm run build` på `apps/wavult-aero/`** — verifierar att Fas 1-koden kompilerar. 15 min. Ägare: Johan.
2. **Merga `claude/ai-runtime-resilience-01` till main** — redan typekompilerad, additiv, isolerad. Ägare: Johan, reviewer: Dennis.
3. **Fixa de 5 outreach-blockers** (1-pager PDF, demo-video, landing page, Calendly, aero@). 3–5 arbetsdagar. Ägare: Erik + designer.
4. **Skicka 5 av de 15 outreach-mailen** — börja med Tier 1 (BRA, Widerøe, Novair). Ägare: Erik.
5. **Besluta Go/Rust för edge-daemon** — krävs för att starta Fas 2 rekrytering. Ägare: Johan.

---

*Detta dokument är den konsoliderade sanningskällan för hela
travel-plattformens roadmap. Uppdatera det — inte sessionens
chatthistorik — när beslut fattas eller scope ändras.*
