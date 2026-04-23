# TAILRD Tech Debt Register

**Last updated:** 2026-04-23
**Maintained by:** Jonathan Hart
**Companion doc:** `docs/ARCHITECTURE_V2_MIGRATION.md`

Each entry lists: severity, impact if unfixed, planned remediation target. Severity follows P0/HIGH/MEDIUM/LOW rather than a strict CVSS — P0 items block production confidence, HIGH items are material compliance or security risk, MEDIUM items are degraded posture, LOW items are annoyances.

---

## P0 — Block production confidence

### 1. Leaked AWS access key in public git history — **RESOLVED 2026-04-23**
- **Severity:** P0
- **Original impact:** An IAM access key (`AKIA****…LPVG`, prefix redacted in this doc to avoid retriggering GitHub secret scanning) was committed to public git history. If the key still had active permissions, an attacker could impersonate `user/tailrd-cli-access`. Even after rotation, the historical rewrite would require force-pushing main, which is not acceptable — so the only available remediation was key rotation + revocation.
- **Resolution (2026-04-23):**
  - **CloudTrail scan** of `AKIA****LPVG` (50 most-recent events via `aws cloudtrail lookup-events`): all legitimate usage by `tailrd-cli-access` — `DescribeTasks` (ECS) and `GetLogEvents` (CloudWatch) from CI and the operator workstation. No unauthorized IPs, no anomalous patterns, no `AccessDenied` spikes. `aws iam get-access-key-last-used` confirmed the key was in active service use up to the moment of rotation — it was *the* working key, not a dormant leftover.
  - **Phase 1-A prep:** The user had two active IAM keys; AWS limits 2 per user. The dormant key `AKIA****KB5A` (last used 2026-03-17, 37 days idle) was deleted first to free the slot. New key `AKIA****XLDF` was then minted and stashed in AWS Secrets Manager at `tailrd-cli-access/access-key-rotation-2026-04-24` (AWS-managed KMS default key). Secret payload includes `AccessKeyId`, `SecretAccessKey`, `CreatedAt`, and a pointer to the previous key.
  - **Phase 1-B cutover:** Operator workstation `~/.aws/credentials` rotated to the new key (backup retained at `~/.aws/credentials.bak.2026-04-23`). GitHub Actions secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` updated via stdin-piped `gh secret set` (values never exposed in shell history or environment variables).
  - **CI verification:** PR [#173](https://github.com/JHart724/TAILRD_PLATFORM/pull/173) merged at `2026-04-23T14:50:23Z`, triggering `deploy.yml` run `24842079232`. The `configure-aws-credentials` → ECR login → docker build+push → `ecs register-task-definition` → `ecs update-service` chain all succeeded end-to-end on the new credentials. Task def `tailrd-backend:93` → `tailrd-backend:94` rolling deploy completed cleanly (`RolloutState: COMPLETED`) with backend `/health` continuously healthy. An auxiliary `aws-auth-verify.yml` workflow (added in the same PR) remains in `.github/workflows/` as a reusable `workflow_dispatch`-triggered health check for any future rotation.
  - **Revocation:** Leaked key `AKIA****LPVG` deleted via `aws iam delete-access-key` on 2026-04-23 (after CI verification confirmed the new key working end-to-end). `aws iam list-access-keys --user-name tailrd-cli-access` now returns the single new key. Post-deletion smoke tests all green: operator `aws sts get-caller-identity` succeeds, `aws s3 ls s3://tailrd-cardiovascular-datasets-863518424332/` succeeds, `GET https://api.tailrd-heart.com/health` returns `healthy`.
- **Followup (separate ticket, not in this resolution):** Add `trufflehog` or `git-secrets` to a CI pre-push hook to prevent future leaks from reaching public git history. Target: **2026-04-27**.

### 2. MCD data in partial wipe state — **RESOLVED 2026-04-22**
- **Severity:** P0 (clinical data integrity)
- **Original impact:** Overnight 2026-04-16 Synthea ingestion OOM'd mid-run and left MCD with ~14k patients but half-populated encounters/observations. The fhir*Id unique constraints were ALSO global rather than per-tenant, so re-running ingestion was skipping encounters and observations as "duplicates" when they were intra-tenant first-time inserts. Schema fix shipped in migration 20260419170743 (per-tenant fhir*Id UNIQUE on encounters, observations, etc.). Patient table only got an index (not a UNIQUE) on fhirPatientId, so repeated Synthea seeds over Apr 14-17 accumulated 5,053 distinct `(hospitalId, fhirPatientId)` keys with 2-6 patient rows per key (13,076 rows total, 8,023 excess).
- **Resolution (Day 7 Phase 7G, 2026-04-22):**
  - Built `infrastructure/scripts/mcdPatientDedup.js` — transactional, keeps oldest `createdAt` per key, SAVEPOINTs between each UPDATE, invariant-checked before COMMIT.
  - Rehearsed against `tailrd-staging-mcd-rehearsal` (restored from `tailrd-production-postgres-pre-mcd-wipe-2026-04-21` snapshot). Dry-run + real run both PASSED all invariants. Total txn time 70-210s depending on cache state.
  - Applied to production 2026-04-22T16:47:33Z. Committed in ~2 min. Post-dedup verification confirmed: 0 dupes, 6,147 patients (was 14,170), 353,512 encounters unchanged. Zero CloudWatch alarms fired during execution.
  - FK reassignment scope: encounters (752 rows), procedures (6,375), conditions (186,452), medications (183,271), device_implants (206), allergy_intolerances (15). Delete: 8,023 patient rows.
- **Prevention (followup work, not in this PR):** `backend/src/services/patientService.ts#processPatientData` still upserts on `(hospitalId, mrn)` only. To prevent recurrence of fhirPatientId duplication on future Synthea re-runs, add a pre-check: if `(hospitalId, fhirPatientId)` already exists for a non-null `fhirPatientId`, UPDATE that existing row directly (bypassing the mrn-keyed upsert). Alternative: add `@@unique([hospitalId, fhirPatientId])` to the Prisma schema and generate a migration. Either way, separate ship.

---

## HIGH — Material security / compliance risk

### 3. No MFA enforcement on PHI routes
- **Severity:** HIGH
- **Impact:** HIPAA expects multi-factor authentication for any user account with access to PHI. Today, MFA is available (setup + verify endpoints exist) but is not enforced — a user with only a password can read Patient, Observation, and Condition data. A single credential leak exposes PHI at scale. This is the single most likely finding in a HIPAA audit.
- **Current mitigation:** Admin users are a small closed set. No pilot is in production with real PHI yet.
- **Planned remediation:** Add an `mfaEnforced` gate in `backend/src/middleware/auth.ts` that, when `user.role !== 'DEMO'`, requires `user.mfaVerifiedAt` within the last 12 hours for any route tagged `phi: true`. Tag the relevant routes.
- **Target:** Before the first real PHI pilot (currently targeted August 2026)

### 4. Refresh token unbounded lifetime
- **Severity:** HIGH (session security)
- **Impact:** Refresh tokens do not appear to have an upper-bound expiry and are not rotated on use. A stolen refresh token gives permanent access until the user changes their password. This violates basic session hygiene and complicates incident response.
- **Current mitigation:** Access token TTL is short. But refresh tokens grant new access tokens indefinitely.
- **Planned remediation:** (a) Add `refreshTokenExpiresAt` at issue time (default 30 days), (b) rotate the refresh token on every refresh and invalidate the old one, (c) add a `revokeAllSessions` endpoint and call it on password change.
- **Target:** **Sprint following Aurora cutover** (2026-05 first week)

### 5. `authorizeHospital` middleware silent no-op
- **Severity:** HIGH (tenant isolation risk)
- **Impact:** If `authorizeHospital` silently passes instead of enforcing `req.user.hospitalId === params.hospitalId`, cross-tenant reads become possible. This is a direct violation of CLAUDE.md rule "never query patient data without `hospitalId` in the WHERE clause" and invalidates tenant isolation guarantees we make to customers.
- **Current mitigation:** Most patient-scoped queries already apply `where: { hospitalId: req.user.hospitalId }` in the service layer, so the middleware failing-open is partially compensated.
- **Planned remediation:** Audit every route that uses `authorizeHospital`. Replace with an explicit guard that `throw`s a 403 on mismatch. Add an integration test that attempts cross-tenant read with a forged `hospitalId` and expects 403.
- **Target:** 2026-05-10 (Sprint following Aurora cutover)

---

## MEDIUM — Degraded posture

### 6. No staging environment
- **Severity:** MEDIUM (release risk)
- **Impact:** Every change is tested in production. The April 7 and April 8 outages (see CLAUDE.md §16) are direct consequences. Any change to server startup, auth, or database wiring carries production-outage risk with no safety net.
- **Current mitigation:** Pre-push checklist (CLAUDE.md §15 Rules 3 and 8) and local Docker smoke test.
- **Planned remediation:** Day 9 of the Aurora V2 migration plan stands up a dedicated `tailrd-staging` environment with its own Aurora cluster, ECS cluster, and ALB.
- **Target:** 2026-04-28 (Day 9 of Aurora plan)

### 7. No APM / distributed tracing
- **Severity:** MEDIUM (debuggability)
- **Impact:** When production latency or errors spike, we can only tell from CloudWatch log volume. No request-level trace from ALB → ECS → Prisma → RDS. Incidents take an order of magnitude longer to root-cause.
- **Current mitigation:** CloudWatch metrics + log search.
- **Planned remediation:** Day 8 of the Aurora V2 migration plan enables X-Ray active tracing on the backend ECS service, with custom segments around Prisma calls and RDS Proxy connections.
- **Target:** 2026-04-27 (Day 8 of Aurora plan)

### 8. Backend does not trust `X-Forwarded-For`
- **Severity:** MEDIUM (forensics / abuse detection)
- **Impact:** All request logs show the ALB ENI IP instead of the real client IP. We cannot identify the source of the 30-second dashboard polling monitor (see ARCHITECTURE_V2_MIGRATION.md §5). We cannot distinguish one abusive client from normal traffic. WAF and rate-limit rules are blind.
- **Current mitigation:** ALB is upstream — we can enable access logs to recover client IP at the ALB level.
- **Planned remediation:** Set Express `trust proxy` to the ALB's hop count (typically `1` for ALB-direct, `2` if CloudFront sits in front). Audit every middleware that uses `req.ip` to confirm it now reflects the real client.
- **Target:** 2026-04-22 (Day 2 pre-req for the Aurora plan, needed to identify the 30s polling source)

### 9. ALB access logs not enabled
- **Severity:** MEDIUM (security forensics)
- **Impact:** Without ALB access logs to S3, we cannot trace client IPs, geographies, or suspicious request patterns after the fact. HIPAA security audit logging expectations are partially unmet.
- **Current mitigation:** Backend logs request metadata, but without real client IP.
- **Planned remediation:** Enable ALB access logs to `tailrd-production-alb-logs` S3 bucket, 30-day lifecycle, S3-managed encryption.
- **Target:** 2026-04-22 (Day 2 pre-req)

### 10. `DEMO_MODE` / `DEMO_FALLBACK_ENABLED` env vars present in production task def
- **Severity:** MEDIUM (dangerous if toggled)
- **Impact:** These env vars are part of the production task definition for `tailrd-backend:84`. Their actual values need to be audited. Per CLAUDE.md, `DEMO_MODE=true` disables authentication, tenant isolation, and CSRF — a one-line misconfiguration would open the production DB to unauthenticated reads.
- **Current mitigation:** The env vars are present but the running behavior (admin login flow works, CSRF enforced) suggests they are `false`. Still needs explicit verification.
- **Planned remediation:** (a) Read current values via `aws ecs describe-task-definition`, (b) if they are `false`, remove them from production task def entirely and confine them to dev/staging configs, (c) add a startup guard that aborts the server if `NODE_ENV=production && DEMO_MODE=true`.
- **Target:** 2026-04-25 (Day 6 — fold into the task def update that points at RDS Proxy)

---

## P1 — Feature debt (separate ship tracks)

### 11. 5 Care Team views still render mock data
- **Severity:** P1 (product — not security)
- **Impact:** EP, Coronary, Structural, Valvular, and Peripheral Vascular Care Team views are hardcoded mocks. A customer demo of any module except Heart Failure shows invented numbers. CMO-level trust is at risk every time we demo one of those modules without disclaiming it.
- **Current mitigation:** CLAUDE.md §10 lists the wiring status honestly so internal expectations are set.
- **Planned remediation:** One PR per module, following the pattern established by Sprint B-1 PR-A through PR-C (see CLAUDE.md §10). Each module wires Executive → Service Line → Care Team in a single PR.
- **Target:** Sprint B-2 (2026-05), one module per week

### 12. SuperAdminConsole not wired to backend
- **Severity:** P1 (product)
- **Impact:** The SuperAdmin console renders mocks — users, audit, config, data management, health systems, customer success tabs all hardcoded. This is how Jonathan and health-system admins are expected to operate the platform. Today it's a facade.
- **Current mitigation:** Direct DB access + Secrets Manager for all admin ops.
- **Planned remediation:** Admin panel rewire sprint. Dependencies: the admin analytics endpoint already works (`/api/admin/analytics`), the health-systems endpoint returns mock data that needs to be replaced with a real `HealthSystem` table query.
- **Target:** Sprint B-3 (2026-05 second half)

---

## LOW — Annoyances / eventual

### 13. Single-region deployment, no DR
- **Severity:** LOW (for current customer footprint)
- **Impact:** Entire platform is in `us-east-1`. An us-east-1 outage takes us down. For a health-system platform, single-region is a deal-breaker above some contract size.
- **Current mitigation:** Multi-AZ RDS + 7-day backups. Aurora will extend this with automatic Multi-AZ and point-in-time recovery.
- **Planned remediation:** Add an us-west-2 warm standby once we're post-pilot (2–3 paying customers). Aurora supports Global Database for cross-region replication.
- **Target:** 2026 Q4 (post-first-paying-customer)

### 14. Manual ECS task def registration for env var changes
- **Severity:** LOW (developer ergonomics)
- **Impact:** Changing a single env var requires re-registering a task def and deploying. No GitOps-style "edit config, PR, auto-apply."
- **Current mitigation:** Deploy workflow in CI handles task def registration per commit. Env-only changes still need a commit.
- **Planned remediation:** Consider ecs-deploy or a Terraform wrapper. Not urgent — current cadence is manageable.
- **Target:** 2026 Q4

### 15. `Math.random()` in analytics queries (partially fixed)
- **Severity:** LOW (was MEDIUM pre-fix)
- **Impact:** CLAUDE.md §14 explicitly forbids `Math.random()` in clinical logic. A previous audit found some instances in analytics code. Partially remediated.
- **Current mitigation:** Most clinical-scoring paths are deterministic. Analytics display (not clinical decisions) may still have residual randomness.
- **Planned remediation:** Grep sweep on merge of Sprint B-2. Any remaining instance gets replaced with a deterministic hash or removed.
- **Target:** 2026-05-15

### 16. Prisma migration history is incomplete — **RESOLVED 2026-04-20**
- **Severity:** HIGH (release / disaster-recovery risk)
- **Impact:** Production RDS schema cannot be reconstructed from `backend/prisma/migrations/` alone. Six FHIR-backed tables (`procedures`, `observations`, `conditions`, `medications`, `device_implants`, `allergy_intolerances`) exist on RDS but are not created by any committed migration SQL. PR #158's migration further assumed 4 global unique indexes existed that had never been committed. A fresh environment (staging, disaster recovery, Aurora bootstrap) cannot be provisioned by `prisma migrate deploy`. This was discovered in Day 3 Phase 3B when the Aurora schema apply failed on PR #158 at `DROP INDEX observations_fhirObservationId_key`.
- **Resolution (2026-04-20):** Replaced five fragmented migrations with a single consolidated baseline `20260420000000_consolidated_baseline/migration.sql` captured from production RDS via `pg_dump --schema-only --no-owner --no-acl`. Verified on a throwaway test RDS (`tailrd-migration-test`) that `prisma migrate deploy` against this baseline produces a schema matching production byte-for-byte (only diff is pg_dump session nonces). Pre-snapshots of RDS and Aurora taken before applying. `_prisma_migrations` table updated on both databases to reflect the single baseline row. See `docs/MIGRATION_HISTORY_CONSOLIDATION_2026_04_20.md` and `docs/SCHEMA_DIFF_REPORT.md` for the full procedure and verification.
- **Verification artifacts (retained in S3 for 30 days):** `s3://tailrd-cardiovascular-datasets-863518424332/migration-artifacts/2026-04-20/{rds-schema,aurora-schema,test-rds-schema,consolidated_baseline,rds-prisma-migrations-pre-consolidation,aurora-prisma-migrations-pre-consolidation}.sql`
- **Snapshots for rollback (retained per AWS default 35 days):** `tailrd-production-postgres-pre-consolidation-2026-04-20` and `tailrd-production-aurora-pre-consolidation-2026-04-20`

### 17. RDS Proxy stuck in "internal error" state (AWS-side)
- **Severity:** MEDIUM (post-cutover pooling only, not migration-critical)
- **Impact:** `tailrd-aurora-proxy` created on Day 2 never left `UNAVAILABLE / DBProxy Target unavailable due to an internal error`. Delete + recreate on Day 3 reproduced the same failure state within 30 minutes. Credentials are correct (log errors stopped after the secret format fix), IAM role is correct, SG config is correct, Aurora writer is directly reachable from the same SG. AWS internal failure.
- **Current mitigation:** None at our layer. Day 3 DMS work uses the Aurora writer endpoint directly (not the proxy), so migration is unblocked.
- **Planned remediation:** (a) Open AWS Support case Severity 3 with reproduction details; (b) if AWS does not resolve before Day 6, cutover points backend DATABASE_URL directly at the Aurora writer endpoint, skipping the proxy. Proxy becomes an optimization we add once AWS resolves.
- **Target:** Unblock by Day 6 (2026-04-25) or accept direct-connect as permanent

### 18. Audit middleware logs ALB IP instead of real client IP (162k legacy rows)
- **Severity:** LOW (forensics / compliance)
- **Impact:** Because Express `trust proxy` was not set until Phase 2A (2026-04-20), every `audit_logs` entry prior to that point recorded the ALB ENI IP (10.0.1.189 range) rather than the real client IP. HIPAA audit trail is technically complete but loses per-user geolocation forensics for the pre-fix period. Approximately 162k rows affected (rough estimate from `SELECT count(*) FROM audit_logs WHERE ipAddress LIKE '10.0.%'`).
- **Current mitigation:** Phase 2A shipped `app.set('trust proxy', 1)` in `backend/src/server.ts`. All new audit entries capture real client IP. Legacy rows are left as-is.
- **Planned remediation:** None. Do not retroactively rewrite historical audit records — doing so would itself be a compliance violation (tampering with audit trail). Document and accept.
- **Target:** N/A (accepted)

### 19. CDC deferred on Wave 1 pending production RDS logical replication enablement — **RESOLVED 2026-04-21**
- **Severity:** LOW (intentional deferral, Palantir-grade risk management)
- **Original impact:** Wave 1 on 2026-04-20 ran in `full-load` migration mode rather than `full-load-and-cdc` because `rds.logical_replication` was `off` on `tailrd-production-postgres`. Waves 2-4 need CDC.
- **Day 5 staging rehearsal (2026-04-21) result: GREEN.** 72.2s reboot, zero backend failures, all four parameter values confirmed post-reboot.
- **Day 6 production reboot (2026-04-21T13:10:43Z): GREEN.** Change record `docs/CHANGE_RECORD_2026_04_21_rds_logical_repl.md` / CR-2026-04-21-001. Measured reboot: 78s (6s faster than staging). Backend `/health` uptime continuous through failover. Post-reboot SHOW values: `wal_level=logical`, `rds.logical_replication=on`, `max_replication_slots=10`, `max_wal_senders=25`. `pg_stat_statements` extension active + stats reset.
- **Day 6 Phase 6E CDC readiness test (2026-04-21T13:26Z): GREEN.** Created `day6_readiness_test` logical slot at LSN `47/A0000098`, advanced WAL 152 bytes via `pg_logical_emit_message`, slot remained healthy, dropped cleanly, final count = 0. Logical decoding path proven end-to-end on production.
- **Unblocks:** Wave 2 (`patients` + `encounters`) can now start with `--migration-type full-load-and-cdc` and `slotName=dms_wave2_slot`. Scheduled for Day 7.

### 20. `rdsRebootHealthCheck.js` probe hangs across Multi-AZ failover — **RESOLVED 2026-04-21**
- **Severity:** LOW (probe limitation only — did not affect production traffic)
- **Original impact:** During Day 6 Phase 6C production reboot, the v1 probe (built on `@prisma/client`) stopped emitting at T+15s and produced zero `fail` samples across the entire 78s failover window. The ECS task stayed RUNNING; Prisma's pool blocked on a half-open TCP after the ENI swap without timing out.
- **Resolution:** Day 7 Phase 7A — probe rewritten on raw `pg` Client with layered timeouts:
  - `connectionTimeoutMillis: 2000`, `query_timeout: 2000`, `statement_timeout: 2000`
  - `Promise.race` wall-clock fallback
  - Manual DATABASE_URL parse to avoid pg-connection-string SSL-mode interpretation overriding client-level `rejectUnauthorized: false`
  - Ephemeral `probe-package.json` with `pg@^8.13` installed at task start (no backend image rebuild)
- **Validation:** Day 7 2026-04-21T14:23:29Z staging `--force-failover` reboot. 166 samples emitted across 2m52s, zero hangs, largest inter-sample gap 2005ms. 7 explicit timeout-error fails between T+11s and T+23s; auto-recovery at T+25s. Full evidence in `docs/CHANGE_RECORD_2026_04_22_wave2_prep.md §7`.

---

## Summary

| Severity | Count | Target |
|---|---|---|
| P0 | 2 | Both complete within 1 week |
| HIGH | 4 | All within the Aurora migration sprint or the one following |
| MEDIUM | 6 | Mostly resolved by the Aurora V2 migration itself (Days 2, 6, 8, 9) |
| P1 | 2 | Dedicated sprints B-2 and B-3 |
| LOW | 5 | 2026 Q4 or as product maturity dictates |

Running this register against the Aurora V2 migration plan shows most MEDIUM items get resolved automatically by the migration. P0 and HIGH items are sequenced explicitly in this doc. New items should be appended here, not inserted mid-list — the numbering is a stable reference.
