# TAILRD Tech Debt Register

**Last updated:** 2026-04-25
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

### 21. Dual role convention (kebab-case vs SCREAMING_SNAKE_CASE) — **RESOLVED 2026-04-25**
- **Severity:** MEDIUM
- **Status:** RESOLVED — closed by PR 2 of Phase 2-A split (`fix/auth-hardening-and-role-standardization`) on 2026-04-25, same day the bridge was introduced
- **Resolution:** Standardized the entire codebase on the Prisma SCREAMING_SNAKE_CASE convention. Both `UserRole` type definitions (`backend/src/types/index.ts` canonical export + `src/auth/AuthContext.tsx` mirror) updated. Cascade through ~165 production sites: 88 `authorizeRole([...])` call values, ~40 backend direct `req.user.role === ...` comparisons, ROLE_PERMISSIONS map keys, 5 frontend comparisons, demo-mode role assignments, fallback defaults. The `BackendRole` redundancy in `backend/src/config/rolePermissions.ts` is now a thin alias of `UserRole` from `types/index.ts`. Both normalizers deleted: the backend middleware normalizer at `backend/src/middleware/auth.ts:148` (`.toLowerCase().replace(/_/g, '-')`) and the frontend `normalizeRole` Fix α helper. The 5 silently-buggy backend direct comparisons (`auth.ts:117 authorizeHospital`, `tierEnforcement.ts:104, 137, 167, 196`) that bypassed the middleware normalizer are now correct by construction. 4 dead ROLE_PERMISSIONS keys (`'admin'`, `'executive'`, `'service-line'`, `'care-team'`) removed — they weren't in the active UserRole type and never reachable. View-tier strings (`'service-line'`, `'care-team'`, `'executive'`) preserved as-is across module routing — separate concept from user roles. `crossReferralService.ts` `recipientType` union preserved snake_case — separate concept that happens to share the literal `'physician'`.
- **Verification:**
  - Frontend `npx tsc --noEmit`: 0 errors
  - Backend `npx tsc --noEmit`: 0 role-cascade errors (TS2367 / TS2820); remaining errors are stale-Prisma-client per CLAUDE.md §15 RULE 6 and resolve in Docker build
  - `git grep -E "'super-admin'|'hospital-admin'|'physician'|'nurse-manager'|'quality-director'|'analyst'|'viewer'"` in `src/` and `backend/src/`: returns ONLY the 2 deliberate skips in `crossReferralService.ts`
- **Original entry (preserved for audit):**
- **Target close:** 2026-04-25 (PR 2 of Phase 2-A split — `refactor/standardize-role-convention`)
- **Impact:** The Prisma enum stores roles as SCREAMING_SNAKE_CASE (`SUPER_ADMIN`, `HOSPITAL_ADMIN`, etc.), and the JWT carries those values verbatim to the client. Backend code (~88 `authorizeRole([...])` call sites + ~40 direct `req.user.role === '...'` comparisons) was written against kebab-case (`super-admin`), and the backend middleware at `backend/src/middleware/auth.ts:148` quietly normalizes Prisma → kebab on every request to bridge the gap. The frontend (~18 sites including `UserRole` type, `ROLE_PERMISSIONS` map keys, role comparisons in `AuthContext.tsx`, `ProtectedRoute.tsx`, `SuperAdminLogin.tsx`, etc.) likewise uses kebab-case but had no normalizer — which silently broke the SUPER_ADMIN admin console gate in production after PR #150 disabled the demo bypass on 2026-04-16.
- **PR 1 patch (this commit):** A `normalizeRole` helper at `src/auth/AuthContext.tsx` mirrors the backend's middleware-level normalizer at the data-ingress point in `buildUserFromResponse`. This unblocks SUPER_ADMIN access today without touching the 165+ comparison sites.
- **PR 2 plan:** Standardize the entire codebase on the backend convention (SCREAMING_SNAKE_CASE — what Prisma already enforces). TypeScript-driven cascade — change the two `UserRole` type definitions (`backend/src/types/index.ts:447` and `src/auth/AuthContext.tsx`) and let the compiler list every literal-mismatch site. Also delete `BackendRole` redundancy in `backend/src/config/rolePermissions.ts` (use `User.role` from `types/index.ts`). Delete both normalizers (frontend `normalizeRole` from this PR, backend `auth.ts:148`). Delete the 4 legacy ROLE_PERMISSIONS keys (`'admin'`, `'executive'`, `'service-line'`, `'care-team'`) that aren't in the active UserRole type.
- **Also resolves on PR 2 close:** 5 silently-buggy direct comparison sites in backend that bypass the middleware normalizer — `backend/src/middleware/auth.ts:117` (authorizeHospital), `tierEnforcement.ts:104, 137, 167, 196`. These work-by-accident today; standardization makes them correct by construction.
- **Estimated PR 2 scope:** ~165 production sites + tests, TypeScript-driven, ~6-8 hours of focused work.
- **Why a temporary bridge instead of going straight to PR 2:** Sinai demo Apr 27. The admin gate was blocking real work today. Two-PR split keeps each diff reviewable and ships unblock + hardening immediately while sequencing the larger refactor properly.

---

### 22. Wix DNS authoritative, Route 53 hosted zone is a shadow
- **Severity:** MEDIUM (blocks SES verification today; ongoing drift risk)
- **Discovered:** 2026-04-25 during Phase 2-B SES setup
- **Impact:** The domain `tailrd-heart.com` has its NS delegation pointed at `ns8.wixdns.net` / `ns9.wixdns.net`. The Route 53 hosted zone `Z1021439AHJE52WRSBZ3` (12 records) is a parallel shadow zone — public DNS queries never hit it. Records written to Route 53 (including the SES DKIM CNAMEs / SPF / DMARC published 2026-04-25T00:51Z under change `C07417783M6I2THZ0571C`) are inert until either (a) the same records are added at Wix DNS, or (b) NS delegation moves to Route 53. Confirmed via `Resolve-DnsName`: SES DKIM CNAMEs do NOT resolve publicly; old DMARC `p=none` and original SPF do resolve (from Wix); SendGrid `s1._domainkey` resolves from Wix too. ACM cert validation appears to work — likely because either ACM does internal-to-AWS validation or the validation CNAMEs were also manually mirrored to Wix DNS at some point. Drift risk: any future record added to Route 53 by an engineer assuming it's authoritative will silently fail to take effect.
- **Current mitigation:** SES verification is manually unblocked by adding the 5 records to Wix DNS via the Wix console (operator action 2026-04-25, see `docs/SES_SETUP_2026_04_25.md` for the records).
- **Planned remediation:** Two paths possible. (a) **NS migration**: change the registrar to use the four Route 53 nameservers, port any Wix-only records into Route 53 first (most importantly `api.tailrd-heart.com` CNAME → ALB), then update NS at registrar — 24-72h propagation, blackholes `api.` if mishandled. (b) **Stay on Wix authoritative + tear down the Route 53 shadow**: delete the unused Route 53 hosted zone, accept Wix-manual DNS as the operating model. Recommendation will follow a longer audit (likely path A once we have IaC discipline). Either way, documenting the current state explicitly so no future engineer is misled.
- **Target:** Audit + decision in the post-Sinai cleanup sprint (week of 2026-04-28). Decision deadline before the next pilot onboarding.

### 23. SES infrastructure not in IaC
- **Severity:** LOW
- **Discovered:** 2026-04-25 during Phase 2-B SES setup
- **Impact:** SES domain identity (`tailrd-heart.com`), DKIM signing (RSA 2048), the DKIM/SPF/DMARC DNS records, the sandbox-recipient verification for `jhart@hartconnltd.com`, and the production-access request payload were all created via AWS CLI on 2026-04-25. None of this is in `infrastructure/cloudformation/` or any Terraform module. A fresh AWS environment cannot be reproduced from IaC alone. Same general posture as other manually-created production infra (RDS, ALB, ECS cluster).
- **Current mitigation:** Setup is fully documented in `docs/SES_SETUP_2026_04_25.md` with all CLI commands run, DKIM tokens, DNS records, and request artifacts. Anyone re-creating from scratch can replay from the runbook.
- **Planned remediation:** Codify in `infrastructure/terraform/ses.tf` (or CloudFormation equivalent) — domain identity with DKIM signing attributes, SPF / DKIM / DMARC records (once the Wix→Route 53 NS question in #22 is settled), configuration set with bounce/complaint event destinations, sandbox-recipient identities for test addresses.
- **Target:** Sprint post-Sinai (week of 2026-04-28+)

### 24. Orphaned SendGrid DNS records (account `u50524464`)
- **Severity:** LOW
- **Discovered:** 2026-04-25 during Phase 2-B SES setup
- **Impact:** Three CNAMEs at Wix DNS (and mirrored in Route 53 shadow zone): `s1._domainkey.tailrd-heart.com`, `s2._domainkey.tailrd-heart.com`, `em5637.tailrd-heart.com` — all pointing to `*.u50524464.wl215.sendgrid.net`. SendGrid sender authentication (DKIM + branded link/return-path) is fully published, but no code path uses it: 0 hits in `backend/src/`, frontend `package.json`, Secrets Manager, or SSM Parameter Store. Account ownership is unclear (see #26). Records are inert from a "no email is being sent" standpoint, but anyone who logs into that SendGrid account and sends mail would have a working DKIM-aligned sender that bypasses our intended SES-only governance.
- **Current mitigation:** None. Records are passive — no risk unless somebody actively misuses the SendGrid account.
- **Planned remediation:** (a) Determine SendGrid console ownership (#26); (b) decision: reactivate (replace SES with SendGrid as the transactional ESP — unlikely given today's SES setup investment) OR tear down (delete the 3 CNAMEs at both Wix and Route 53; close the SendGrid account). Default plan: tear down.
- **Target:** Sprint post-Sinai (week of 2026-04-28+)

### 25. Stale Google site-verification + Google SPF reference
- **Severity:** LOW
- **Discovered:** 2026-04-25 during Phase 2-B SES setup
- **Impact:** The root `tailrd-heart.com` TXT record contains two `google-site-verification=...` tokens and an SPF `include:_spf.google.com`. No MX records on the domain → no Google Workspace mailboxes for `tailrd-heart.com` (so `jhart@tailrd-heart.com` does not exist as a real inbox; the working contact is `jhart@hartconnltd.com`). The Google references are leftover from a prior Google Site / Search Console / Workspace verification attempt that was never cleaned up. SPF reference is harmless (just a permitted-sender include for a sender that does not exist), site-verification tokens are inert.
- **Current mitigation:** The 2026-04-25 SES SPF merge preserved the Google reference rather than dropping it, on the principle of "do one thing per PR." Updated SPF: `v=spf1 include:amazonses.com include:_spf.google.com ~all`.
- **Planned remediation:** Verify with Jonathan that no active Google service depends on these (e.g., that Google Search Console for tailrd-heart.com is no longer in use), then strip the two `google-site-verification` TXT entries and the `include:_spf.google.com` from the SPF.
- **Target:** Sprint post-Sinai (week of 2026-04-28+) — combine with #24 cleanup PR.

### 26. SendGrid setup origin investigation
- **Severity:** LOW (governance / ownership clarity)
- **Discovered:** 2026-04-25 during Phase 2-B SES setup
- **Impact:** The SendGrid sender authentication for account `u50524464` was set up at some point in the past but has zero presence in our git history, code, or documentation. Plausible origins: (a) early solo-work attempt by Jonathan that was abandoned, (b) Bozidar (CTO) setup as part of an earlier infra exploration, (c) a previous developer / contractor who had access. Account access for the SendGrid console is unknown — if nobody has the credentials, the account is permanently dormant; if somebody does, we need to know who. Until ownership is established, the orphan cleanup in #24 is blocked on account closure.
- **Current mitigation:** None. Records are inert at the email-sending layer.
- **Planned remediation:** (a) Ask Jonathan if he set this up; (b) ask Bozidar if he set this up; (c) if neither, escalate to "SendGrid account abandoned, recover via support or accept as orphan."
- **Target:** Sprint post-Sinai (week of 2026-04-28+) — must precede #24 cleanup.

### 28. Prisma `performanceMetric.createMany()` failing — never collected analytics — **RESOLVED 2026-04-26**
- **Severity:** MEDIUM (silent data loss + memory leak; not security-impacting)
- **Discovered:** 2026-04-26 in production CloudWatch logs, surfaced during Wave 2 Attempt 3 pre-flight Fargate run
- **Original impact:** The `PerformanceMetric` model was designed for aggregate-by-period metrics (hourly/daily/weekly rollups: `metricType` enum, `operation`, `requestCount`, `period`, `periodStart`, `periodEnd` all required). The `middleware/analytics.ts` writer was producing per-request data (one row per HTTP request) and missing every required aggregate field. `prisma.performanceMetric.createMany()` therefore failed with `Argument 'metricType' is missing` on every flush, silently dropping all per-request performance telemetry to the floor. Schema and writer have never matched — git archaeology shows the bug has existed since `32d4672 Initial commit`. Production has never collected analytics. Compounding bug: the writer's catch block did not reset `performanceBuffer`, so a sustained DB error would leak memory unbounded across every periodic flush.
- **Resolution (2026-04-26):**
  - Added new `PerformanceRequestLog` Prisma model dedicated to per-request data (`endpoint`, `method`, `statusCode`, `responseTime`, `memoryUsage`, `cpuUsage`, `dbQueryTime`, `metadata` Json, `timestamp` plus optional FKs to Hospital + User).
  - Migration `20260427000000_add_performance_request_log` creates `performance_request_logs` table + 4 indexes + 2 FK constraints. Hand-written following the `audit_log_hospital_nullable` convention since Docker daemon was offline locally.
  - Writer (`middleware/analytics.ts`) switched from `prisma.performanceMetric.createMany` to `prisma.performanceRequestLog.createMany`, with buffer reset moved into a `finally` block to guarantee reset on both success and failure (memory-leak fix). `JSON.stringify(metadata)` removed since Prisma `Json?` columns accept plain JS objects directly. `userId` added to writer signature so per-user drill-down is possible.
  - Readers in `routes/analytics.ts` switched to query `performanceRequestLog`. The `_avg` semantics still work because each row is one request — sample-by-sample average is meaningful. Field references updated: `dbQueries` → `dbQueryTime`, `operation` → `method`, error inference now uses `statusCode >= 400` (no longer reads non-existent `errorRate`).
  - `PerformanceMetric` model retained unchanged — reserved for the future scheduled-aggregation job (#29).
  - `scripts/validateMigration.ts` table list updated; `analytics-guide.md` description clarified.
- **Verification:** Production deploy applied migration via `prisma migrate deploy` in container CMD. CloudWatch logs show clean `performanceRequestLog.createMany` writes, no more `Argument 'metricType' is missing` errors. `SELECT COUNT(*) FROM performance_request_logs` returns growing count in real time.

### 29. PerformanceRequestLog retention policy not implemented
- **Severity:** LOW (becomes MEDIUM at ~10M rows or storage-cost concern)
- **Discovered:** 2026-04-26 during tech debt #28 fix
- **Impact:** Per-request log table grows unbounded. At expected production scale (5,000-50,000 req/day, 12 months) the table reaches 1.5M-15M rows/year. No business problem until then, but planning ahead avoids a future emergency cleanup.
- **Current mitigation:** None — table is small today (just deployed).
- **Planned remediation:** Scheduled job (e.g. nightly cron) aggregates rows >90 days old into `PerformanceMetric` using its existing `period`/`periodStart`/`periodEnd` aggregate schema, then deletes the raw rows. The retained `PerformanceMetric` model is purpose-built for exactly this rollup workflow — so the write side already exists; only the rollup job needs implementation.
- **Target:** Post-funding (Q3 2026) — earlier if row count exceeds ~1M or storage cost surfaces.

### 30. Metadata field PII review for PerformanceRequestLog
- **Severity:** LOW (until first PHI-handling pilot)
- **Discovered:** 2026-04-26 during tech debt #28 fix
- **Impact:** The `metadata` Json field captures `userAgent`, `ipAddress`, `pageUrl`, `referrer`, `queryParams` from every authenticated request. IP addresses are PII under HIPAA. `pageUrl` may contain patient IDs in path params (e.g. `/api/patients/cmnxlp.../gaps`). `queryParams` may contain search terms. Storing this verbatim is acceptable for an admin-only audit trail in pre-pilot demo state; will require sanitization before the first real-PHI customer.
- **Current mitigation:** Field treated as audit-grade data. Read access gated to SUPER_ADMIN only in `/api/analytics/*` routes. Schema comment block documents the PII sensitivity inline so future engineers see it. Same access-control posture as `audit_logs`.
- **Planned remediation:** Pre-PHI-pilot (likely pre-Sinai-production):
  - Hash IP addresses (e.g. SHA-256 of IP + per-deploy salt) for session continuity without storing raw addresses
  - Sanitize `pageUrl`: strip query strings, redact path params matching `/cm[a-z0-9]{20,}/` (cuid pattern) → `:id`
  - Whitelist allowed `metadata` keys; reject anything else at the middleware boundary
- **Target:** Before first real-PHI customer (likely Sinai production).

### 31. AnalyticsTracker singleton `setInterval` not cleanly disposable
- **Severity:** LOW
- **Discovered:** 2026-04-26 during tech debt #28 fix (CI test-leak warning surfaced the issue)
- **Impact:** `AnalyticsTracker.startPeriodicFlush()` registers a `setInterval` in the constructor that never gets cleared. Test teardown can't stop it; Jest's `--forceExit` is required to terminate the worker process at end of run, which masks any other cleanup issues that might exist. In production this isn't a bug — the process lives forever intentionally — but the test-leak warning ("A worker process has failed to exit gracefully") obscures legitimate teardown failures we'd want to see.
- **Current mitigation:** `npm test` already passes `--forceExit`. CI continues to function correctly.
- **Planned remediation:** Add a public `dispose()` method on `AnalyticsTracker` that calls `clearInterval(this.flushTimerId)` and any other cleanup. Wire it into Jest `afterAll()` for test files that import the tracker, and into a future graceful-shutdown handler for the backend process.
- **Target:** Post-Sinai cleanup sprint, low priority — current `--forceExit` posture is acceptable while we have so few tests; revisit when we expand test coverage and the leak warning starts hiding real issues.

### 34. Investigate and decommission predecessor RDS instance `tailrd-production` (t4g)
- **Severity:** MEDIUM (HIPAA-tagged, deletion-protected, contents unknown - until investigated, cannot determine disposition)
- **Discovered:** 2026-04-27 during Day 9 pre-flight investigation
- **Impact:** A predecessor production RDS instance named exactly `tailrd-production` (db.t4g.medium, PG 15.10, 50 GB) exists in the production VPC `vpc-0fc14ae0c2511b94d`, created **2026-04-03** - 17 days before the migration sprint started, 24 days before today. State observed:
  - DeletionProtection: **TRUE**
  - Tags: `Project=tailrd`, `Environment=production`, **`HIPAA=true`**
  - 14-day backup retention (production-grade)
  - Daily automated snapshots since 2026-04-13
  - 0 active connections in the last hour (currently dormant)
  - Database name: `tailrd_platform` (different from current production DB `tailrd` on `tailrd-production-postgres`)
  - Engine 15.10 (older than current prod's 15.14)
  - Subnet group `tailrd-production-db` (different from current prod's `tailrd-production-db-subnet-group`)
  - Shares security group `sg-09e3b87c3cbc42925` with the active `tailrd-production-postgres` (same VPC database SG)
  - Empty ECS cluster `tailrd-production` (also predecessor, 0 services, 0 tasks) likely paired with this instance

  Either contains genuine production data from a previous architecture iteration that needs proper retirement, or is leftover that was never decommissioned. The HIPAA tag + deletion protection + production-grade backup retention signal someone valued this instance enough to safeguard it. Cannot be safely retired without investigation.

- **Investigation steps required (week of 2026-04-28+):**
  1. Read-only Fargate query against `tailrd-production` to enumerate `tailrd_platform` schema, table list, row counts. Identify whether contents are real PHI, stale demo data, or empty.
  2. Search CloudTrail for connection patterns: which IAM principals or service roles ever connected? When was the last successful connection? Last `RDS-DataAPI` or `secretsmanager:GetSecretValue` for any related secret?
  3. Search git history + Secrets Manager for any reference to `tailrd-production.csp0w6g8u5uq.us-east-1.rds.amazonaws.com` (the predecessor's endpoint) - identify any code paths still pointing at it.
  4. Inspect any old ECS task definitions in the empty `tailrd-production` ECS cluster (revisions retain even after service delete). Look for `DATABASE_URL` env vars or secrets that referenced this instance.
  5. Check related CloudFormation/IaC history (the 3 March-12 stacks own only foundation networking, not this instance - confirms it was created out-of-band).
  6. Document findings; decide: retire (after data extraction if needed) vs preserve (if business reason surfaces).

- **Planned remediation:** Investigation in week of 2026-04-28+ after Sinai meetings. If contents are real production data, extract relevant data and archive the final snapshot for HIPAA records. If leftover, remove deletion protection (`aws rds modify-db-instance --no-deletion-protection`), delete instance, delete the empty `tailrd-production` ECS cluster, retire any orphaned IAM roles. If genuinely active in some pipeline I haven't identified, do NOT delete and update this entry with the new context.

- **Severity rationale:** MEDIUM not LOW because the HIPAA tag implies the instance may have held PHI at some point. Even if currently empty, retirement requires proper HIPAA decommissioning (snapshot retention, audit log capture, BAA-aware data destruction). Treat with caution. The instance's deletion protection is the safety rail that prevents accidental destruction during this investigation window.

- **Target:** Post-Sinai (week of 2026-05-04). Not blocking Day 9 staging environment work - staging uses `tailrd-staging-aurora` (Aurora Serverless v2) at a completely different name + class + VPC SG; no collision with this predecessor instance.

---

## Summary

| Severity | Count | Target |
|---|---|---|
| P0 | 2 | Both complete within 1 week (RESOLVED) |
| HIGH | 4 | All within the Aurora migration sprint or the one following |
| MEDIUM | 10 (2 resolved) | Mostly resolved by the Aurora V2 migration itself (Days 2, 6, 8, 9); #21 RESOLVED 2026-04-25 via PR 2 of Phase 2-A split; #22 added 2026-04-25 (Wix DNS shadow zone, post-Sinai); #28 RESOLVED 2026-04-26 (PerformanceRequestLog architecture cleanup); #34 added 2026-04-27 (predecessor `tailrd-production` t4g RDS investigation, post-Sinai) |
| P1 | 2 | Dedicated sprints B-2 and B-3 |
| LOW | 12 | 2026 Q4 or as product maturity dictates; #23-26 added 2026-04-25 (SES + SendGrid + Google DNS hygiene cluster); #29-31 added 2026-04-26 (PerformanceRequestLog retention + PII review + AnalyticsTracker disposal, pre-PHI-pilot or post-Sinai cleanup sprint) |

Running this register against the Aurora V2 migration plan shows most MEDIUM items get resolved automatically by the migration. P0 and HIGH items are sequenced explicitly in this doc. New items should be appended here, not inserted mid-list — the numbering is a stable reference.
