# AEAN — Certification Roadmap

> How we turn compliance into a **commercial wedge** instead of a
> drag. Everything here is designed so that the first time an
> auditor walks in, they find a system that was designed to be
> certified — not retrofitted for an audit.
>
> Anchor: the control plane in `apps/wavult-aero` already ships the
> structural pieces that most aviation software stacks spend two
> years adding. This doc closes the gap from "good scaffold" to
> "walkable by TÜV SÜD, Bureau Veritas, DNV, or whichever audit body
> the customer prefers".

## 1. Starting position (where we sit relative to avionics certification)

**AEAN is a non-flight-critical, passenger-services-LAN system.**

This is a deliberate architectural choice with commercial consequences:

| We ARE | We are NOT |
|---|---|
| On the passenger services LAN | On the avionics bus |
| Behind the same STC as existing WiFi | Inside the flight-critical domain |
| Subject to AS9100D, DO-326A, DO-355, ED-202A | Subject to DO-178C |
| Subject to ISO 27001, NIS2, GDPR | Subject to ARP4754A, DO-254 |
| Installed via an MRO that holds the STC | Installed as a Type Certificate change |

The single most important sentence to remember when talking to a
regulator or chief of safety: **"We sit on the passenger services
LAN. We never touch the avionics bus. The airworthiness path is the
same as your existing Wi-Fi installation."**

If we ever lose that sentence, we lose the 18-month head start we
currently have over any vendor who thinks they need DO-178C.

## 2. The certification stack — framework by framework

Each row answers four questions:

1. **What is it?** — one sentence.
2. **Do we need it?** — yes / scope-exclude / inherit from Wavult.
3. **Where is it covered in code / docs already?**
4. **What is the gap, who owns it, when?**

### 2.1 Aviation-specific (mandatory)

| Framework | What it is | Status | Evidence | Gap / Owner / Target |
|---|---|---|---|---|
| **AS9100D** (EN 9100) | Aerospace quality management — ISO 9001 + aviation addendum. Covers identification, traceability, configuration management, control of documented information. | In progress | 6 controls in `sql/qms-aviation-controls.sql`, all mapped to files. Hash-chained audit log closes §7.5.3. | Formal audit by TÜV SÜD Transportation. **Owner:** Dennis. **Target:** first audit within 12 months of first paying customer. |
| **DO-326A / ED-202A** | Airworthiness Security Process Specification. Requires a threat model, continuous threat assessment, and security-impact analysis for every change. | Implemented | 5 controls in the QMS seed; threat model as code in `src/security/threat-model.ts`; narrative in `docs/aero/THREAT_MODEL.md`; RTM verifier enforces tag presence. | External threat-model review by an aviation security specialist before first pilot. **Owner:** Johan. **Target:** before Phase 1 pilot install. |
| **DO-355 / ED-204** | Information Security Guidance for Continuing Airworthiness — operationalises DO-326A across the lifecycle. Requires documented processes for vulnerability handling, patch distribution, and incident response for airborne information systems. | Partial | Content-pack signing + read-only breaker + hash-chained audit cover the runtime side. | Written process docs for vulnerability intake, advisory publication, emergency patch distribution. **Owner:** Johan. **Target:** before Phase 1 pilot install. |
| **ICAO Annex 19** | State-level Safety Management System obligations. Indirect for us — our customers need it, we support it. | Supported | Telemetry ingest promotes `tamper_alarm`, `integrity_alarm`, `unauthorized_access` to the audit log; critical severity trips the breaker. Control `AERO-ICAO19-5.3` in the QMS seed. | None structural. Operator-facing SMS report export format (CSV / JSON). **Owner:** Johan. **Target:** first pilot close. |
| **EASA Part-145.A.55** / **FAA 14 CFR §43.9** | Maintenance records retention. We are not an approved maintenance organisation, but we touch records indirectly. | Implemented | `aviation-safety-sensitive` classification has retention = aircraft lifetime; S3 Glacier Deep Archive lifecycle preserves hash-chain integrity. | Written retention policy document bound to the classification brands. **Owner:** Dennis. **Target:** during AS9100D audit prep. |
| **EASA Part-21.A.801** | Identification of products, parts, appliances. | Implemented | Tail number, ICAO24, operator ICAO, certifying authority, registration country required at registration. | None. |

### 2.2 Payments (scope exclude — this is a moat)

| Framework | What it is | Status | Evidence |
|---|---|---|---|
| **PCI-DSS Level 1** | Card-data security. 300+ controls. | **Scope exclude** | AEAN never touches card data. All payment flows in Phase 3 use tokenised processors (Stripe, Adyen) where the card data goes directly from the passenger device to the processor's iframe / native SDK. Our service only sees `payment_intent_id`, which is not PCI data. |
| **PSD2 SCA** | EU Strong Customer Authentication for payments. | **Scope exclude** | Same reason. The payment processor is the regulated entity. We are a merchant of record at most, never a payment institution. |

**Why this matters commercially:** every RFP we see will ask about
PCI. The correct answer is "we are out of PCI scope because our
architecture never touches card data" — and we can prove it because
the entire commerce flow is one line of code (`stripe.confirm()`) on
the passenger device that calls Stripe directly. This is not
ambition. This is the only way a 10-person aviation startup can
ship a payments story without burning 18 months on QSA audits.

### 2.3 Data protection (mandatory, inherited from Wavult)

| Framework | What it is | Status | Evidence | Gap |
|---|---|---|---|---|
| **GDPR** | EU data protection. | Inherited | Wavult's existing RoPA (15 processing activities), DPA register, DPIA process. Aero inherits the posture. | New RoPA entry for "AEAN onboard telemetry" + new DPA entry for any new subprocessor. **Owner:** Dennis. **Target:** before first pilot ingests real passenger data. |
| **Swedish Data Protection Act** + country-specific variants | GDPR supplements. | Inherited | Wavult QMS. | None additional. |
| **NIS2** (EU Directive 2022/2555) | Cybersecurity for essential & important entities. Aviation supply chain is in scope. | In progress | Control `AERO-NIS2-ANNEX-I` in QMS seed; MSB (Myndigheten för samhällsskydd och beredskap) incident reporting path already wired in Wavult QMS. | NIS2 formal registration with MSB is an open item in `AGENTS.md` active gaps. **Owner:** Dennis. **Target:** per the existing Wavult NIS2 timeline. |

### 2.4 Information security (mandatory, inherited + extended)

| Framework | What it is | Status | Evidence | Gap |
|---|---|---|---|---|
| **ISO 27001:2022** | Information Security Management System. 93 Annex A controls. | Inherited + extended | Wavult's existing ISO 27001 backbone. Aero adds: KMS-backed signing (A.8.24), audience-separated JWTs (A.5.15), append-only audit log (A.5.15 + A.5.30), four-eyes approvals (A.5.16), classification brands (A.5.12). | Formal Stage 1 + Stage 2 audit — this is on Wavult's existing ISO 27001 track; aero inherits when it certifies. **Owner:** Dennis. **Target:** aligned with the Wavult group ISO 27001 audit window. |
| **ISO 27017** | Cloud security. | Inherited | AWS-native controls. | None. |
| **ISO 27018** | PII in public clouds. | Inherited | Wavult's posture. | None. |
| **SOC 2 Type II** | US-style trust principles audit. | Planned | Not yet engaged. | Only needed when the first US customer asks. Do not pre-burn budget. |

### 2.5 Quality (TÜV pathway)

| Framework | What it is | Status | Gap |
|---|---|---|---|
| **ISO 9001:2015** | General QMS. | Inherited via AS9100D. | None separate. |
| **TÜV SÜD Transportation aviation quality audit** | Third-party assurance that the QMS is real, operational, and auditable. | Planned | Engagement with TÜV SÜD aviation practice for a pre-audit gap assessment. **Owner:** Dennis. **Target:** month 6 post first-pilot. |

## 3. What is already in the branch that closes audit findings up-front

Because we built "ISO by design" into Phase 1, a majority of the
structural findings a TÜV / ISO / DO-326A audit would raise are
already closed:

| Typical finding | How we closed it |
|---|---|
| "Show me the audit trail for change X." | `/v1/fleet/aircraft/{tail}/history` endpoint; hash-chained per stream. |
| "Show me the threat model and its version history." | `src/security/threat-model.ts` + `git log` + `docs/aero/THREAT_MODEL.md`. |
| "Show me the mapping from regulation to code." | `docs/aero/rtm-matrix.json` (generated at build); `src/rtm/requirements.ts`. |
| "Prove records cannot be silently modified." | Postgres trigger on `aero_event_log` rejects UPDATE/DELETE; cross-checked by `verifyChain()` on boot and nightly. |
| "Prove you have least privilege." | Role matrix enforced in `requireAuth` + `requireRole`; four-eyes in `prefetch-policies.ts` state machine. |
| "Prove keys are KMS-backed." | `AEAN-REQ-SEC-005` implementation in `content-packs.ts` with `MessageType=DIGEST` KMS.Sign. |
| "Prove you separate operator and machine credentials." | JWT audience split: `wavult-aero` vs `wavult-aero-edge`. |
| "Prove you can detect tampering." | `verifyChain()` + circuit breaker that serves read-only on break. |
| "Prove you have retention policy per data class." | `src/lib/classification.ts` with compile-time enforcement. |
| "Prove you have a change-approval workflow." | Existing Wavult RTM 4-approval gate + `prefetch_policy` state machine. |

The gap list (§4 below) is what the audit WILL raise that we have
not yet closed.

## 4. Open gaps (honest list)

Ordered by severity for a first TÜV pre-audit:

| # | Gap | Severity | Owner | Target |
|---|---|---|---|---|
| 1 | No automated tests yet. Every `verification` slot in the RTM points at a file that does not exist. | High | Johan | Before first pilot install |
| 2 | No penetration test. | High | Johan | Before first pilot install |
| 3 | No formal vulnerability intake / advisory publication process. | High | Johan | Before first pilot install |
| 4 | No documented incident response runbook specific to an aviation customer (who to call, in what order, within what timeframe). | High | Dennis | Before first pilot install |
| 5 | No SBOM attached to the Docker image. CycloneDX generation needs to be wired into the Dockerfile build. | Medium | Johan | Before first pilot install |
| 6 | Docker image is not signed with cosign. | Medium | Johan | Before first pilot install |
| 7 | CI is not wired with SAST (semgrep) + dependency scanning (npm audit) + container scanning (trivy). | Medium | Johan | Before first pilot install |
| 8 | No DPIA for the aero processing activity. | Medium | Dennis | Before first pilot ingests real data |
| 9 | No backup/restore drill for `wavult_os` with aero data. | Medium | Johan | Before first pilot install |
| 10 | No boot-time tamper drill (deliberately break a stream in a test DB, confirm the breaker trips). | Low | Johan | Before first pilot install |
| 11 | No third-party threat-model review. | Low | Johan | Within 3 months of first pilot install |
| 12 | No published retention policy document (informal policy is in the classification code but not in a standalone PDF). | Low | Dennis | During AS9100D audit prep |

## 5. Continuous hardening — the chaos engineering contract

This is how we move from "good scaffold" to "actually survives
production". Structured loop:

```
BUILD → DEPLOY (staging) → BREAK (chaos) → PATCH → RELEASE
```

### 5.1 Chaos scenarios that must pass before any pilot release

| Scenario | How to run | Success criteria |
|---|---|---|
| **30% packet loss on satellite link** | `tc qdisc add dev eth0 root netem loss 30%` on the staging edge simulator | Cache hit rate stays ≥50%. Telemetry ingest catches up on reconnect. No hash-chain break. |
| **800 ms added latency** | `tc qdisc add dev eth0 root netem delay 800ms` | UI renders from cache; API p99 from the edge stays <150 ms local. |
| **Full link drop for 60 minutes** | `ip link set eth0 down` | Edge serves all cached + prefetched content. Writes queue locally. Sync resumes automatically. |
| **300 concurrent passenger sessions** | Load generator against edge | No 5xx. No OOM on the 1U reference box. |
| **Postgres primary failover** | Trigger RDS Multi-AZ failover | Aero reconnects within 30 s. No duplicate event_log rows. |
| **Deliberate hash-chain corruption** | Test DB only: `UPDATE aero_event_log SET this_hash = '0'*64` | Boot integrity check detects the break. Breaker trips. Service serves GETs only. |
| **Compromised curator JWT** | Replay an expired / tampered token | `requireAuth` rejects with `INVALID_TOKEN` or `TOKEN_EXPIRED`. |
| **Operator token replayed on edge-node endpoint** | Use a `wavult-aero` audience token against `/v1/telemetry/ingest` | `requireEdgeNode` rejects. Control `AEAN-REQ-SEC-003` verified. |
| **Rapid-fire prefetch policy promotions by a single actor** | Automated script | Four-eyes check rejects with `FOUR_EYES_VIOLATION`. |

### 5.2 Hardening rules (baked into every service)

1. **Timeouts everywhere.** No HTTP call without a timeout. No DB query without a statement timeout.
2. **Retries with backoff.** Idempotent operations retry up to 3 times; non-idempotent ones never retry without an idempotency key.
3. **Fallbacks.** Every cache miss has a fallback; every external service has a circuit breaker.
4. **No hard dependencies.** The UI renders even if the cloud is unreachable. The edge serves GETs even if the DB is degraded.
5. **Idempotency keys on payments.** `idempotency_key = hash(tail + seat + timestamp + items)`. Never double-charge.
6. **Logging discipline.** Every significant action logs `{ action, actor, latency_ms, result, correlation_id }`. No PII in logs above `restricted` classification.
7. **Correlation id on every request.** Already implemented in `src/index.ts`.

### 5.3 Release gate (nothing ships to a pilot tail unless ALL true)

- [ ] Zero crashes under the chaos scenarios above for 48 hours
- [ ] Zero hash-chain breaks detected in staging
- [ ] All RTM requirements with hazard class `hazardous` or higher are in status `verified`
- [ ] Penetration test report closed (no high/critical findings open)
- [ ] Backup/restore drill completed within the last 14 days
- [ ] SBOM generated and signed for the release image
- [ ] Docker image signed with cosign
- [ ] Change reviewed by 4 RTM approvers (Dennis, Winston, Johan, Erik)

If any box is unchecked, we do not ship. Aviation is not the place
to be quick and loose.

## 6. The TÜV audit plan, concrete

Phase 0 — **Internal gap assessment** (owner: Dennis + Johan)
- Walk the open gaps list in §4
- Generate RTM matrix and evidence pack
- Estimated effort: 5 working days

Phase 1 — **Pre-audit self-assessment**
- Run the full certification roadmap against an internal checklist
- Document every answer in `docs/aero/audit-evidence/` (this folder
  does not exist yet; create it on first engagement)
- Target: 3 months after first paying pilot

Phase 2 — **TÜV SÜD Transportation engagement**
- Engage their aviation practice (Hamburg office is the right door)
- Request a "gap assessment against AS9100D + DO-326A" — not a
  formal audit yet
- Fix findings
- Target: 6 months after first paying pilot

Phase 3 — **Formal audit**
- Stage 1 (document review), Stage 2 (operational audit)
- Target: 12 months after first paying pilot

Phase 4 — **Certificate in hand**
- Press release + update COMMERCIAL_PACK.md with the cert line
- Target: 13–14 months after first paying pilot

## 7. The one principle that holds all of this together

**Compliance is a product feature, not overhead.**

Every control we implement has a dual purpose:

1. It makes an auditor's job easier
2. It makes a sales conversation shorter

If a control only does the first and not the second, we either
misunderstood the control or we wrote too much ceremony. Delete the
ceremony.

Concrete example: the hash-chained audit log is the single most
demoable thing in AEAN. Every first customer conversation opens
with it. Every auditor closes their finding the moment they see it.
That is what "compliance as a wedge" looks like in practice, and
it is why we built it before we built literally anything else in
this service.
