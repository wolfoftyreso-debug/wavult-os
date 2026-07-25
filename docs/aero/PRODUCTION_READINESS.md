# AEAN — Production Readiness Checklist

> The single document that answers "can we ship this to a paying
> customer?" Every box must be ticked before the first tail goes
> live. No exceptions, no tacit approvals, no "we'll fix it later".
>
> This checklist is the operational projection of:
> - `CERTIFICATION_ROADMAP.md` § 4 (open gaps) and § 5.3 (release gate)
> - `FAILURE_MATRIX.md` § 4–7 (operational failures)
> - `THREAT_MODEL.md` (adversarial failures)
> - `VISION.md` Phase 1 definition of done
>
> The list is intentionally concrete. If a box cannot be ticked
> because the scope is larger than Phase 1 (e.g. crew tablet UX), it
> is **omitted** from this checklist and tracked in the relevant
> phase of VISION.md. This file ONLY covers what must be true for
> the `wavult-aero` control plane to run in production.

## 1. Code quality and build

- [ ] `npm install` succeeds in `apps/wavult-aero/`
- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] `npm run rtm:verify` succeeds with zero violations in
      non-strict mode (feature branches)
- [ ] `RTM_STRICT=1 npm run rtm:verify` succeeds on the branch that
      will be merged into `rtm` (no drafts allowed in production)
- [ ] Docker image builds from `apps/wavult-aero/Dockerfile`
      without warnings
- [ ] Docker image passes `trivy image` with no HIGH or CRITICAL
      findings
- [ ] SBOM generated in CycloneDX format and attached to the image
- [ ] Image signed with cosign
- [ ] No `any` types in production code paths
      (`zod.unknown()` is acceptable)
- [ ] No `@ts-ignore` comments in production code

## 2. Configuration

- [ ] `CONTENT_SIGNING_KEY_ARN` is set to a real KMS key ARN in
      eu-north-1 — **NOT** the dev fallback
- [ ] The KMS key policy grants `Sign` only; denies
      `Decrypt`, `GetKeyPolicy`, `ScheduleKeyDeletion`, `PutKeyPolicy`
- [ ] `KMS_KEY_ID` (for JWT verification in prod) is set to the
      identity-core public key
- [ ] `NODE_ENV=production`
- [ ] `AWS_REGION=eu-north-1`
- [ ] `AERO_DATABASE_URL` or `RDS_HOST_ECS` points at the real
      `wavult_os` database (not Supabase, not localhost)
- [ ] `JWT_ISSUER=identity.wavult.com`
- [ ] `SERVICE_AUDIENCE=wavult-aero`
- [ ] All secrets in AWS SSM Parameter Store, not in environment
      variables or repo

## 3. Database

- [ ] `001_aero_init.sql` applied to `wavult_os`
- [ ] `002_aero_reenrol.sql` applied to `wavult_os`
- [ ] `aero_event_log` append-only trigger verified: manual
      `UPDATE` attempt raises exception
- [ ] `aero_event_log` indexes present (org_time, type_time, actor,
      payload GIN)
- [ ] `aero_edge_node_hardware_active_uidx` partial index present
- [ ] RDS automated backups enabled with a retention of ≥14 days
- [ ] RDS Multi-AZ enabled (for failover)
- [ ] Database connection limit tuned: `pool.max = 20` is correct
      for the current ECS task count; revisit on scale-up
- [ ] Statement timeout set at the database level
      (`idle_in_transaction_session_timeout = 60s`,
      `statement_timeout = 30s`)

## 4. Hash chain and audit

- [ ] Boot integrity check runs on every instance at startup
      (`src/index.ts` bootIntegrityCheck)
- [ ] Nightly cron runs `verifyAllStreams` on at least
      `aircraft`, `edge_node`, `content_pack`
- [ ] Cron failure pages the on-call (not just a log line)
- [ ] Circuit breaker table (`aero_circuit_breaker`) has a monitor
      that alerts when `tripped_at IS NOT NULL`
- [ ] Tamper drill executed: deliberately corrupt a stream in a
      staging DB, verify the breaker trips within 60 seconds

## 5. Authentication and authorisation

- [ ] `requireAuth` uses RS256 via KMS in production
- [ ] `requireEdgeNode` rejects operator-audience tokens
      (test case verified)
- [ ] Role matrix enforced on every mutating route
- [ ] Four-eyes transitions in `prefetch-policies.ts` reject
      same-actor replays (test case verified)
- [ ] JWT `exp` enforced (no extended tokens)
- [ ] Dev-mode HS256 path is unreachable in production
      (`USE_KMS = !!KMS_KEY_ID && NODE_ENV === 'production'`)

## 6. Observability

- [ ] Application logs shipped to CloudWatch Logs
      (or ELK / DataDog per Wavult standard)
- [ ] Logs redact PII by default; only fields below `restricted`
      classification appear unredacted
- [ ] `/health`, `/health/ready`, `/health/status` all reachable
      from the ALB
- [ ] `/health/status` includes breaker state so monitoring can
      alert
- [ ] CloudWatch alarm on:
  - [ ] 5xx rate > 1% for 5 minutes
  - [ ] p99 latency > 500 ms for 5 minutes
  - [ ] ECS task restart rate > 0 per 15 minutes (non-zero means a
        crash loop)
  - [ ] Circuit breaker tripped
- [ ] Correlation id (`x-correlation-id`) end-to-end from client
      through `wavult-core` proxy to `wavult-aero`
- [ ] OpenTelemetry traces exported (future; not blocking for MVP
      if CloudWatch Logs + structured log events are in place)

## 7. Security

- [ ] Penetration test performed by an external party within the
      last 6 months; no high/critical findings open
- [ ] Threat model reviewed within the last 90 days
      (`src/security/threat-model.ts` git log)
- [ ] All outbound HTTP calls have explicit timeouts
- [ ] No use of `eval`, `Function()`, or dynamic `require()`
- [ ] Input validation via `zod` on every route body and query
- [ ] Rate limits active on all mutating routes
- [ ] CSP header + HSTS + X-Frame-Options already set
      (`src/index.ts`); verified in integration test
- [ ] Docker image runs as non-root user
      (already done: `USER aero` in Dockerfile)
- [ ] Container filesystem read-only where possible
      (`readOnlyRootFilesystem: true` in ECS task def)

## 8. Compliance artefacts

- [ ] RoPA updated with a new entry for AEAN telemetry processing
- [ ] DPA register updated with any new subprocessor (likely none
      for Phase 1)
- [ ] DPIA written for aero processing activity
- [ ] Retention policy document matches `src/lib/classification.ts`
      retention constants
- [ ] RTM matrix snapshot saved as `docs/aero/audit-evidence/rtm-matrix-<date>.json`
- [ ] Threat model snapshot saved as
      `docs/aero/audit-evidence/threat-model-<date>.md`
- [ ] QMS controls verified by CAPA review
- [ ] Change control: the release PR has 4 approvals
      (Dennis, Winston, Johan, Erik)

## 9. Infra

- [ ] ECS service definition committed to Terraform
- [ ] Task role permissions: least privilege; specifically allows
      only the KMS key for signing and only the S3 prefix for
      content packs
- [ ] Security group allows ingress only from the ALB
- [ ] ALB listener has TLS 1.3, modern cipher suite
- [ ] Cloudflare in front of the ALB with WAF rules matching the
      rest of the Wavult estate
- [ ] SSM parameters for this service exist in
      `/wavult/aero/prod/*`
- [ ] Deployment via the existing Wavult deploy pipeline (not
      manual `docker push`)
- [ ] Blue/green or canary deployment strategy chosen
      (recommendation: canary at 10% for 30 minutes)
- [ ] Rollback plan documented: `aws ecs update-service --force-new-deployment` with previous image tag

## 10. Commercial prerequisites

- [ ] First paying customer identified
- [ ] MSA signed
- [ ] DPA signed
- [ ] Success criteria agreed in writing (from
      `COMMERCIAL_PACK.md` § C.4)
- [ ] MRO installation slot booked
- [ ] Escalation chain documented (who the customer calls when
      something breaks at 3 am)
- [ ] Invoice issued and first payment received (50% of the pilot
      fee before installation)

## 11. Phase 1 definition-of-done cross-check

From `VISION.md` Phase 1:

- [x] Cloud control plane with event-log backbone
- [x] Fleet registry, edge-node enrolment, telemetry, content
      packs, prefetch policies
- [x] Hash-chained append-only log with tamper detection
- [x] RTM as code + build verifier
- [x] Threat model as code
- [x] QMS seed
- [x] OpenAPI spec
- [x] wavult-core proxy
- [x] docker-compose integration
- [x] KMS-backed content signing (closed in this branch)
- [x] Re-enrolment with retirement event (closed in this branch)
- [ ] Automated test suite (currently just placeholder files
      referenced by the RTM)
- [ ] Boot-time tamper drill executed at least once in staging
- [ ] First external threat-model review

The two unchecked items are the final gates before the branch is
ready for the RTM four-approval process.

## 12. The one line that stops the release

If any item in this checklist is unchecked AND has severity SEV-1
or SEV-2 in the failure matrix, **we do not ship**. Period.

The chief pilot at our first pilot operator is going to ask one
question: "Can this break our aircraft?" The answer has to be
"no, and here is the document that proves it." This checklist is
that document.
