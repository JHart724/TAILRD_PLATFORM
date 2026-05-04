# TAILRD Heart — Comprehensive Platform Audit

**Date:** 2026-04-16
**Author:** Claude (synthesis of CSO security audit + scalability investigation + prior audits)
**Scope:** Read-only consolidation. No code changes.
**Production URLs:** `tailrddemo.netlify.app` (frontend) · `https://api.tailrd-heart.com` (backend)
**Current main commit:** `d6a6e81` (PR #152) on top of `14322e2` (PR #150) · task def **`tailrd-backend:76`**
**Sources merged:** `docs/PLATFORM_AUDIT_2026_04.md` (Apr 4-6, 87→121 items), `docs/MASTER_AUDIT_2026_04.md` (Apr 7, 6-agent + codex), `docs/PLATFORM_STATE_2026_04_16.md` (Apr 16, frontend wiring audit), CSO security audit (today), scalability investigation (today).

---

## 1. Executive Summary

**The platform is live. The backend is healthy, running real Prisma data from 12,998 real synthetic patients at Medical City Dallas, and all six Executive-tier cardiovascular module views now consume real API responses through the `useModuleDashboard` hook.** Four successful production deploys landed in the last 48 hours (PR #144 godview role fix, PR #146 exec view wiring, PR #149 demo-mode off in prod, PR #150 coordinated atomic deploy, PR #152 silent-fallback pattern across the remaining four Executive views). The `tailrd-backend:76` task definition is serving from commit `d6a6e81`. A CMO logging in from `tailrddemo.netlify.app` today can land on six module executive dashboards and see numbers that come from the real database, not hardcoded mocks. This is a meaningful shift from April 6, when the CQL engine returned `Math.random()` and the entire clinical UI was a demo.

**The clinical tiers below Executive are still mock.** Five of six Service Line views and five of six Care Team views (all except Heart Failure) render hardcoded patient rosters, inline KPIs, and fake trend arrays. Four of six Clinical Gap Detection Dashboards (CAD, Structural, Valvular, Peripheral) have no API fetch at all — they display their `*_CLINICAL_GAPS` constants regardless of backend state. The real gap engine has evaluated 211 therapy gaps against the 12,998 ingested patients and closed zero; 99.95% of the population is in Heart Failure, and the other five modules have 25 patients combined. Admin tabs show one live number each surrounded by hardcoded charts, activity feeds, and historical trends. `PlatformOverview.tsx` still uses `Math.random()` at lines 98-106 for DAU data (CLAUDE.md §14 explicitly forbids this).

**The top outstanding risk is not code — it is a leaked AWS key in public git history.** AKIA-prefixed credentials were committed in three commits and remain recoverable from `git log` even though the current working tree is clean. The repo is public. The leaked key has the same scope as the account that hosts RDS, S3 FHIR bundles, ECR, and Secrets Manager. Everything else on the security docket (no CODEOWNERS on workflows, unbounded refresh-token lifetime, `authorizeHospital` silent no-op) is hours of work; the AWS key is an incident. Scalability: the overnight Synthea ingest processed 12,998 of a 25,000-bundle target, then stopped — the investigation shows no job-tracking row was ever written (`processSynthea.ts` goes straight to Prisma without a `FileUpload` record), so there is no cursor, no error log, and no way to attribute the halt to any specific failure mode. The ingest needs a job-tracking shim, observability, and concurrent sharding before the next run.

---

## 2. What Works Today vs What Is Mock

### 2.1 Real API (wired, verified 200 OK in prod as of 2026-04-16)

| Surface | File | Endpoint |
|---|---|---|
| Auth (login, logout, refresh, MFA setup/verify, invite accept) | `src/auth/*`, `src/ui/auth/*` | `/api/auth/*`, `/api/mfa/*`, `/api/users/invite/*` |
| Platform totals | `src/data/platformTotals.ts` | `/api/admin/analytics` |
| Heart Failure Executive | `src/ui/heartFailure/views/ExecutiveView.tsx` | `/api/modules/heart-failure/dashboard` |
| HF Care Team | `src/ui/heartFailure/views/CareTeamView.tsx` | `/api/modules/heart-failure/dashboard` + `/api/modules/heart-failure/worklist` |
| HF Clinical Gap Detection | `components/clinical/ClinicalGapDetectionDashboard.tsx` | `/api/gaps?module=heart-failure` (hybrid — mock fallback) |
| EP Executive | `src/ui/electrophysiology/views/EPExecutiveView.tsx` | `/api/modules/electrophysiology/dashboard` |
| EP Clinical Gap Detection | `components/clinical/EPClinicalGapDetectionDashboard.tsx` | `/api/gaps?module=electrophysiology` (hybrid) |
| Coronary Executive | `src/ui/coronaryIntervention/views/CoronaryExecutiveView.tsx` | `/api/modules/coronary-intervention/dashboard` |
| Structural Executive | `src/ui/structuralHeart/views/StructuralExecutiveView.tsx` | `/api/modules/structural-heart/dashboard` |
| Valvular Executive | `src/ui/valvularDisease/views/ValvularExecutiveView.tsx` | `/api/modules/valvular-disease/dashboard` |
| Peripheral Executive | `src/ui/peripheralVascular/views/PeripheralExecutiveView.tsx` | `/api/modules/peripheral-vascular/dashboard` |
| GodView (overview, cross-module analytics, global search) | `src/ui/admin/GodView/*` | `/api/admin/god/*` |
| SuperAdmin Dashboard KPIs | `src/ui/admin/SuperAdminDashboard.tsx` | `/api/admin/analytics`, `/api/health` |
| Gap actions (dismiss/resolve/defer) | `src/hooks/useGapActions.ts` | `/api/gaps/:id/action` |
| File upload | `src/components/DataManagementPortal.tsx` | `/api/data/upload` |
| Notifications | `src/ui/*` | `/api/notifications` |
| Admin user activity | `src/ui/admin/tabs/UsersManagement.tsx` | `/api/admin/users/:id/activity` |

### 2.2 Hybrid (API primary, mock fallback still rendered)

| Surface | Mock content never leaves the code |
|---|---|
| HF Executive | Benchmark tables (lines 104-210), 20-ZIP decompensation heatmap (lines 236-257) |
| HF Care Team | Safety alerts (lines 252-285), workflow action counts "23/31/18" (lines 217-229) |
| All 6 Exec views | Facility revenue arrays ($4.2M/$2.1M/$1.8M/$1.6M), 20-row ZIP data, benchmark KPIs |
| HF + EP Clinical Gap Detection | Full mock patient cohorts and sub-tab content rendered even on 200 response; "Live Data" vs "Demo Data" badge at lines 950-952 is the only place the UI tells the CMO which mode they're in |
| Admin `PlatformOverview` | 15-entry activity feed, 30-day DAU via `Math.random()` (lines 98-106 — CLAUDE.md §14 violation), 12-week upload counts |
| Admin `UsersManagement` | 12 fallback users, slide-in login/action history always mock (lines 152-185) |
| Admin `AuditSecurity` | 3 failed logins, 4 active sessions, MFA pie, IP allowlist (local state, not persisted) |
| Admin `HealthSystems` | Add-hospital modal submit is a no-op (line 149) |
| Admin `DataManagement` | 3 hospital data-quality scores, 6 field completeness bars, 5 recommendations |
| Admin `CustomerSuccess` | 10,660 gaps / 3,624 actioned / $47.2M recovered, 12-month closure trends |

### 2.3 Pure mock (no API call in file)

| Surface | Count of hardcoded patients / KPIs |
|---|---|
| EP Service Line | 1,234 AFib ablations, 456 LAAC, 789 device implants, 123 lead extractions — all fake trends |
| EP Care Team | `DEMO_PATIENT_ROSTER` (line 2): 127 active, 8 critical, 15 follow-ups, 23 pending. Six hardcoded patients (Smith/Williams/Martinez/Chen/Johnson/Thompson) |
| Coronary Service Line | 1,247 PCI, 187 STEMI activations, 1.94 case mix, static trends |
| Coronary Care Team | `DEMO_PATIENT_ROSTER` — full clinical tools panel mock |
| CAD Clinical Gap Detection | `CAD_CLINICAL_GAPS` — hardcoded patient arrays, no fetch |
| Structural Service Line | TEER Mitral 247, TMVR 89, PFO/ASD 67 |
| Structural Care Team | TAVR MTD 327 / 98.2%, risk tiers 2.1%/5.8%/12.3% |
| SH Clinical Gap Detection | `SH_CLINICAL_GAPS` constants only |
| Valvular Service Line | Bicuspid Repair 156, Ross Procedure 23, Echo Surveillance 23 overdue |
| Valvular Care Team | Same shell pattern |
| VD Clinical Gap Detection | `VD_CLINICAL_GAPS` constants only |
| Peripheral Service Line | PAD 1,456 / CLI 392 / Wound Healing 78.3% |
| Peripheral Care Team | LimbSalvageChecklist / CasePlanningWorksheet / WoundCareIntegration / PeripheralWorklist — all mock |
| PV Clinical Gap Detection | 11 mock gap categories (COMPASS, ABI, AAA, VTE, IVC Filter, etc.) |
| `PlatformConfiguration` admin tab | Everything: module enable/disable, feature flags, billing, rate limits, maintenance toggle — all UI-only, zero persistence |
| Sidebar nav badges | No live patient counts, no live alert counts — static labels |

### 2.4 Real data in Prisma (as of 16:47 UTC)

| Hospital | System | Tier | Users | **Patient rows (DB)** |
|---|---|---|---|---:|
| `demo-medical-city-dallas` | HCA Healthcare | ENTERPRISE | 0 | **12,998** |
| `hosp-001` (TAILRD Demo) | Catholic Health Network | ENTERPRISE | 0 | 10 |
| `hosp-002` (TAILRD Demo 2) | — | PROFESSIONAL | 0 | 5 |
| `tailrd-platform` | — | ENTERPRISE | 1 (JHart SUPER_ADMIN) | 0 |
| **Total** | | | **1** | **13,013** |

| Module | Patients | Open gaps | Revenue opp |
|---|---:|---:|---:|
| Heart Failure | 12,992 | 69 | $172,500 |
| Coronary | 11 | 98 | $245,000 |
| Electrophysiology | 3-8 (3 endpoints disagree) | 44 | $110,000 |
| Peripheral | 6 | 0 | $0 |
| Valvular | 3 | 0 | $0 |
| Structural | 2 | 0 | $0 |
| **Total** | **~13,022** | **211** | **$527,500** |

### 2.5 Delta from April 6 → April 16

| Dimension | Apr 6 | Apr 16 | Delta |
|---|---|---|---|
| Real patients in DB | 15 (seed) | **12,998 + seed** | +12,983 real FHIR-derived rows |
| Gap rules executing | 5 (rest `Math.random()`) | 257 deterministic rules | +252 |
| Exec views on real API | 0 | **6 of 6** | HF, EP, Coronary, SH, VD, PV |
| Clinical Gap dashboards on real API | 0 | 2 of 6 (HF, EP) | +2, 4 still pure mock |
| Service Line views on real API | 0 | 1 of 6 (HF partial) | 5 still pure mock |
| Care Team views on real API | 0 | 1 of 6 (HF) | 5 still pure mock |
| Production deployment | None | ECS Fargate + RDS + ElastiCache + CloudFront live | shipped |
| DEMO_MODE in production | true (everywhere) | **false** (PR #149) | resolved |
| GodView route accessibility | 404 in App.tsx | Live at `/admin/god` with SUPER_ADMIN role check (PR #144) | resolved |
| Task definition | (none) | `tailrd-backend:76` | running |

---

## 3. Security Posture

### 3.1 Resolved (since April 6)

| Finding | PR | Status |
|---|---|---|
| `DEMO_MODE` disabled all auth if header absent | PR #139 + PR #149 + td:69 | **RESOLVED** — demo fallback tokens skip session check, `REACT_APP_DEMO_MODE=false` in `.env.production` |
| GodView role case mismatch (`'SUPER_ADMIN'` vs `'super-admin'`) | PR #144 | **RESOLVED** — role guard uses JWT string `SUPER_ADMIN` |
| `terraform.tfvars` + `.terraform/` committed to git | Apr 7 hotfix | **RESOLVED** — `git rm --cached` + `.gitignore` |
| Mass assignment on `admin.ts PUT /users/:userId` | Apr 7 hotfix | **RESOLVED** — explicit field whitelist |
| 13 rogue `PrismaClient` instances bypassing PHI encryption | P0-SEC-2 | **RESOLVED** — shared singleton |
| Cross-tenant IDOR on `clinicalIntelligence` routes | P0-SEC-3 | **RESOLVED** — `hospitalId` in every `WHERE` |
| JWT algorithm not pinned | P1-SEC-1 | **RESOLVED** — `algorithms: ['HS256']` on verify |
| Session logout non-functional (no `isActive` check) | P1-SEC-2 | **RESOLVED** — `authenticateToken` re-validates session |
| MFA non-enforcing | P1-SEC-4 | **RESOLVED** — `requireMFA` applied to patients, gaps, clinicalIntelligence, phenotypes |
| Phenotypes/Referrals/CQL-results IDORs | P1-SEC-6/7/11 | **RESOLVED** |
| PHI encryption coverage expanded | P0-HIPAA-1 | **RESOLVED** — Encounter, Observation, Order, Medication, Condition string fields encrypted |
| PHI in audit log metadata | P0-HIPAA-2 | **RESOLVED** — MRN/name removed from `AuditLog.metadata` |
| DSAR deletion cascade incomplete | P1-HIPAA-5 | **RESOLVED** — 12 additional tables covered |
| Invite accept weak password policy (8 vs 12+) | P1-SEC-9 | **RESOLVED** — aligned to 12-char complexity |
| Login/logout audit trail missing | P1-SEC-15 | **RESOLVED** — `LOGIN_SUCCESS/FAILED/LOGOUT` events |
| `gapDetectionRunner.ts` `dateOfBirth` PHI encryption | PR #141/142/143 | **RESOLVED** — schema `String` + migration + call sites patched |
| Observation upsert on `fhirObservationId` | PR #145 | **RESOLVED** — ~3k errors/batch eliminated |
| Synthea S3 client uses default AWS credential chain | PR #140 | **RESOLVED** — works under ECS task IAM |

### 3.2 Open (ordered by severity)

#### CRITICAL — AWS key `AKIA****<redacted-leaked-key-1>` in public git history

**Source:** CSO audit today. Three commits contain the key. Repo is public on GitHub. `git log -p | grep AKIA` finds it.
**Impact:** Full AWS account compromise. The same account hosts RDS (all patient PHI), S3 (FHIR bundles `tailrd-cardiovascular-datasets-863518424332`), ECR (container images the backend runs), and Secrets Manager (`JWT_SECRET`, `PHI_ENCRYPTION_KEY`, `DATABASE_URL`).
**Mitigation path:**
1. Rotate the IAM key immediately in AWS console. Disable the exposed key before rotation completes (`aws iam update-access-key --status Inactive`).
2. Audit CloudTrail for uses of `AKIA****<redacted-leaked-key-1>` going back 30 days. If unknown principals used it, treat as breach under §13409 and start breach timeline.
3. History scrub: use `git filter-repo` or BFG to rewrite the three commits, force-push, then coordinate with anyone holding a local clone (solo-dev repo, so minimal).
4. Until scrub + rotation are both done, assume the key is compromised. Rotate `JWT_SECRET` and `PHI_ENCRYPTION_KEY` at the same time because anyone with the AWS key can read them from Secrets Manager.
5. Consider making the repo private while remediation is in flight. Public exposure of healthtech credentials can also draw HIPAA §13410(d) "willful neglect" posture if not addressed with reasonable diligence.

**Estimated effort:** 4 hours (rotation + history rewrite + CloudTrail review + Secrets Manager re-issuance).

#### HIGH — No CODEOWNERS on `.github/workflows/`

**Source:** CSO audit today. Confirmed: no `CODEOWNERS` file exists in repo root, `.github/`, or `docs/`.
**Impact:** Any contributor (and any maintainer-bot misconfiguration) can merge changes to `ci.yml`, `deploy.yml`, `smoke-test.yml` without review. The deploy workflow builds the backend container, pushes to ECR, and registers a new ECS task definition. A malicious edit there is a direct path to PHI.
**Mitigation path:** Add `.github/CODEOWNERS` with `/.github/workflows/ @JHart724` and a branch protection rule requiring review from CODEOWNERS on files they own.
**Estimated effort:** 30 minutes.

#### MEDIUM — Refresh token unbounded lifetime

**Source:** CSO audit today. `backend/src/routes/auth.ts:267-345`. Verified in read today.
**Impact:** The `/api/auth/refresh` endpoint takes any valid JWT and mints a new one. There is no separate refresh token with a distinct, longer-lived rotation, and no server-side expiry on how long the chain can extend. If a user stays active, their session can live indefinitely by chaining refreshes. If a token leaks, the attacker can chain-refresh for the same window of time the user does.
**Current mitigation:** Session validation in `authenticateToken` re-checks `loginSession.isActive` on every protected call. A manual logout kills the chain. But there is no inactivity timeout and no absolute session lifetime.
**Fix:** Add `sessionCreatedAt` on `loginSession`, reject refresh if `now - sessionCreatedAt > 12h` (or whatever policy). Require re-login (not just refresh) past absolute expiry.
**Estimated effort:** 2 hours.

#### MEDIUM — `authorizeHospital` middleware silent no-op

**Source:** CSO audit today. Middleware exists but does not enforce.
**Impact:** Routes that depend on `authorizeHospital` to verify the JWT's `hospitalId` matches a URL-param or body-supplied `hospitalId` pass through without error. Cross-tenant requests are not blocked at the middleware layer — they depend on each route adding `hospitalId` to its own `WHERE` clauses. Most routes do this correctly now (post P0-SEC-3), but the middleware is a false assurance.
**Fix:** Make the middleware throw 403 when `req.user.hospitalId !== req.params.hospitalId || req.body.hospitalId`. Add a unit test.
**Estimated effort:** 2 hours.

#### Additional open items from prior audits (still not resolved)

| Finding | Severity | Source | Est |
|---|---|---|---|
| `PlatformOverview.tsx:98-106` uses `Math.random()` for DAU chart | MEDIUM (violates CLAUDE.md §14) | Apr 16 state | 30 min |
| `WebhookEvent.rawPayload` (full FHIR bundle JSON) unencrypted | HIGH-HIPAA | Apr 6 | 4h |
| GodView `globalSearch` returns PHI without MFA gate | HIGH | Apr 7 FINDING-4 | 3h |
| `accountSecurity.ts` session token hash mismatch (compares raw JWT to SHA-256 col) | CRITICAL | Apr 7 FINDING-2 | 1h |
| No ALB access logging | MEDIUM | Apr 6 | 1h |
| No CloudFront logging / no WAF on CloudFront | MEDIUM | Apr 6 | 5h |
| Hospital-admin role can see cross-tenant counts from `admin.ts` analytics | HIGH-HIPAA | Apr 6 | 3h (resolution in commit unclear) |

---

## 4. Scalability Findings

### 4.1 What happened overnight

**The ingestion job targeted 25,000 FHIR bundles and stopped at 12,998 patient rows. There is no server-side record of why.**

Root cause analysis:
1. `backend/scripts/processSynthea.ts` was invoked via CLI (likely via a remote session against the ECS task). It reads from S3 bucket `tailrd-cardiovascular-datasets-863518424332` under prefix `synthea/nyc-population-2026/fhir/`.
2. The script writes a local cursor file (`.synthea-cursor`) on every success — but the cursor lives on the pod-local filesystem. If the ECS task was replaced mid-run (auto-scaling, healthcheck flap, deploy), the cursor was lost.
3. **The script does not create a `FileUpload` row.** It calls `processPatientData` → `processEncounterData` → `processObservationData` direct. The `FileUpload` table (owned by `routes/upload.ts`) is only written for CSV/JSON uploads through the Data Management Portal.
4. There is no heartbeat log, no per-N-bundle progress event sent anywhere observable, and no DLQ for failed bundles. The only evidence of the run is the `_count.patients` on the `demo-medical-city-dallas` hospital.
5. `GET /api/data/upload/status/f525908e` returns `404 Job not found`. `GET /api/data/upload/history` returns `[]`. No trace of the job in the API.

Likely halt causes (in order of plausibility):
1. **RDS connection pool exhaustion.** The script has no pool manager; Prisma's default is 10 connections. Under `--concurrency 10` (script default), every concurrent bundle tries to execute `processPatientData` (≥4 sequential writes) + `processEncounterData` (1-5 writes) + `processObservationData` (N writes, ≥20 per patient). With batching off, peak simultaneous connections per bundle can hit 5-10. At concurrency 10, that is 50-100 connections against a 10-cap pool → hang, timeout, and abort.
2. **RDS max_connections cap hit.** The provisioned RDS instance class (not verified here, but the Terraform default is `db.t4g.medium`) has a default `max_connections` of ~87. Backend service (2 ECS tasks, each with a shared Prisma singleton = at most ~40 connections) + a concurrent ingest can trivially hit the cap. New sessions fail with `53300 too many connections`.
3. **ECS task restart.** A scale-in or healthcheck drain terminates the in-flight Node process. No cursor → no resume on restart → silent data loss.
4. **Malformed bundle / unhandled exception in a deeper handler.** Less likely because the script has try/catch at every persistence call and increments `stats.errors` instead of throwing — but PHI encryption middleware failures or an unencoded unicode character in a name field could surface as an unhandled promise rejection and kill the process.

### 4.2 Current infrastructure limits (observed and inferred)

| Resource | Limit | Source | Observed headroom |
|---|---|---|---|
| RDS instance | `db.t4g.medium` (inferred from Terraform default) | `infrastructure/` | `max_connections` ~87 |
| Prisma pool (per Node process) | 10 (default) | Prisma docs | 10 × 2 ECS tasks = 20 for app |
| ECS service tasks | 1-10 (auto-scaling CPU 70% / mem 80%) | P1-INFRA-7 commit | Running 1 of 1 |
| ElastiCache Redis | Defined in Terraform, client in `lib/redis.ts` | P1-INFRA-5 | Unused for ingestion |
| S3 read | Effectively unlimited; list API paginated | AWS | 1.29M objects accessible |
| ingestion throughput | Unknown — not measured | — | 12,998 in ~8-10h overnight = ~1,400/hr = ~0.4 bundles/sec |

That 0.4/sec observed rate is far below what the RDS tier can actually sustain. The bottleneck is almost certainly pool exhaustion + per-bundle sequential writes, not RDS CPU or IOPS.

### 4.3 Target architecture for concurrent sharded ingest

| Layer | Change | Why |
|---|---|---|
| Job tracking | Create an `IngestionJob` model (hospitalId, bucket/prefix, startedAt, totalBundles, processedCount, cursor, errorCount, status). Write a row before listing S3. | A CMO/operator can answer "is the import running?" from the DB. Restart = resume from stored cursor, not lost pod-local file. |
| Sharding | Split the S3 key list into N shards (alphabetical or hash). Run each shard as a Bull/BullMQ worker job. | Concurrent progress that the pool can actually sustain. Shard failure is isolated. |
| Connection pooling | Set `DATABASE_URL` with `?connection_limit=5&pool_timeout=10` on ingestion workers, `?connection_limit=15` on API. Provision RDS Proxy if connection storms are frequent. | Bound the worker fleet's DB footprint. RDS Proxy handles connection multiplexing. |
| Write batching | Replace per-resource `create` with `createMany` (Prisma 5 supports). Observations especially — currently 20+ writes/bundle become 1. | 10-20× throughput on the write path. |
| Checkpoint | Per-shard cursor stored in `IngestionJob.shards[i].cursor` — DB, not filesystem. | Survives pod restart. |
| Observability | Log every 100 bundles: count, rate, error count, estimated completion. Emit CloudWatch metric. | You know when a run has stalled without waiting until morning. |
| DLQ | Failed bundle key → `IngestionDeadLetter` row with error message. | Forensic analysis of halt causes; no silent data loss. |
| Redis | Store `inflight:{jobId}` set for dedup on restart. | Prevents double-processing if cursor is ambiguous. |

### 4.4 Throughput targets to validate

Before declaring sharded ingest "done", measure:
- Single-shard rate at `concurrency=1` (baseline).
- Rate at `concurrency=5` per worker, 1 worker.
- Rate at `concurrency=5` per worker, 4 workers (20 effective concurrent DB users, inside an 80-connection budget).
- RDS connection count and CPU at each level — the goal is steady-state under 60% of `max_connections` and 70% CPU.

A reasonable target: 25,000 bundles in under 90 minutes (~4.6/sec). That is an achievable 10-12× improvement on the observed 0.4/sec.

---

## 5. Prioritized Action List

### P0 — must finish this week (blocks any external demo or new health system)

| # | Item | Est | Owner |
|---|---|---:|---|
| P0-1 | **Rotate AWS key AKIA****<redacted-leaked-key-1>, scrub git history (3 commits), re-issue JWT_SECRET + PHI_ENCRYPTION_KEY in Secrets Manager, audit CloudTrail for unknown principal usage** | 4h | JHart + Bozidar |
| P0-2 | Make repo private until P0-1 complete | 5m | JHart |
| P0-3 | Add `.github/CODEOWNERS` requiring review on `.github/workflows/**`, enable branch protection rule | 30m | JHart |
| P0-4 | Build `IngestionJob` persistence + resume-from-cursor; re-run Synthea against Medical City Dallas to reach 25,000 | 6h | JHart |
| P0-5 | Remove `Math.random()` from `PlatformOverview.tsx:98-106` (use real `dailyActiveUsers` series or remove the chart) | 30m | JHart |
| P0-6 | Fix `accountSecurity.ts` session token hash mismatch (hash before comparing in change-password, list-sessions, delete-session) | 1h | JHart |
| P0-7 | Pick one source of truth for EP patient count (3 vs 8 across three endpoints) | 1h | JHart |

**P0 total:** ~13 hours.

### P1 — must finish before first paying pilot (closes credibility gaps)

| # | Item | Est |
|---|---|---:|
| P1-1 | Wire EP Service Line + Care Team views to real API (replace `DEMO_PATIENT_ROSTER`) | 6h |
| P1-2 | Wire Coronary Service Line + Care Team views | 6h |
| P1-3 | Wire Structural Service Line + Care Team views | 6h |
| P1-4 | Wire Valvular Service Line + Care Team views | 6h |
| P1-5 | Wire Peripheral Service Line + Care Team views | 6h |
| P1-6 | Wire CAD/SH/VD/PV Clinical Gap Detection dashboards to `/api/gaps?module=` with mock fallback (same pattern as HF/EP) | 8h |
| P1-7 | Absolute + idle session lifetime on refresh endpoint (sessionCreatedAt, 12h abs / 30m idle) | 2h |
| P1-8 | `authorizeHospital` middleware: enforce, don't silently pass | 2h |
| P1-9 | Encrypt `WebhookEvent.rawPayload` (full FHIR bundle JSON) | 4h |
| P1-10 | Add MFA gate + per-query audit log on GodView `globalSearch` | 3h |
| P1-11 | Sharded ingestion worker pool (BullMQ + 4 workers + RDS Proxy or explicit `connection_limit`) | 12h |
| P1-12 | Write a 1-paragraph "live vs mock" banner that renders site-wide when any non-API view is displayed | 2h |
| P1-13 | Ingest 20-50 real patients into EP, Coronary, Structural, Valvular, Peripheral so the Exec views show real numbers for all 6 modules (not just HF) | 4h |

**P1 total:** ~67 hours.

### P2 — scale and polish (pre-production hardening)

| # | Item | Est |
|---|---|---:|
| P2-1 | Wire all 7 SuperAdminConsole tabs to API (`admin.ts` endpoints already exist) | 8h |
| P2-2 | Make `PlatformConfiguration` flags actually persist | 4h |
| P2-3 | Add ALB access logging + CloudFront WAF + CloudFront logging | 5h |
| P2-4 | Notification delivery: real-time (SSE or WebSocket) to replace polling | 8h |
| P2-5 | Scheduled report delivery (daily digest + weekly summary via SES) | 4h (clinical alerts portion partially done) |
| P2-6 | eCQM/QRDA CMS export | 12h |
| P2-7 | Frontend list virtualization (react-window) on worklists | 8h |
| P2-8 | Write the first 100 backend unit tests (start with gap rules — HF-1..HF-10, guideline citations in test names) | 16h |
| P2-9 | E2E test for the critical path (login → HF module → gap detail → dismiss) | 6h |
| P2-10 | OpenAPI spec from existing routes (swagger-jsdoc) | 4h |

**P2 total:** ~75 hours.

**Grand total remaining to "production-ready with 6 fully-wired modules":** ~155 hours after the 13h P0 block. That is about 4 weeks of focused solo work.

---

## 6. What a CMO Sees Today vs What They Should See

### 6.1 What a CMO sees today on `tailrddemo.netlify.app`

1. **Lands on login.** MFA is not required for SUPER_ADMIN in prod (JWT shows `mfaVerified:false` after login). First credibility crack.
2. **Lands on the Heart Failure Executive dashboard.** Sees **real** patient totals, real gap counts, real revenue opportunity (~$172,500 across 12,992 HF patients). Benchmark tables and the ZIP-code heatmap are mock but look plausible at a glance.
3. **Clicks into "Care Team" tab.** Sees a real patient worklist with real gap badges. Safety alerts and workflow action counts ("23 pending review", "31 for evaluation") are hardcoded.
4. **Clicks into "Clinical Gap Detection Dashboard".** Sees a "Live Data" badge (HF is the only module that shows this distinction). Sees real gaps mixed with the full mock cohort that renders regardless — the mock patients never leave the UI even when the API returns 200.
5. **Navigates to Electrophysiology module.** Exec view is real. Service Line is mock (1,234 AFib ablations is fake). Care Team is mock. Clinical Gap Detection has "Live Data" badge and a real API call. EP patient count shows 3 or 8 depending on which tab they opened first.
6. **Navigates to Coronary / Structural / Valvular / Peripheral.** Exec views are real (all four shipped today in PR #152). Service Line, Care Team, and Clinical Gap Detection are all fully mock.
7. **Opens GodView (`/admin/god`).** Sees real module health, real patient coverage, real revenue opportunity aggregated across hospitals. This is a strong artifact.
8. **Opens SuperAdminConsole (`/admin`).** Sees 7 tabs. `PlatformOverview` shows real hospital/user/patient counts but the 30-day DAU chart regenerates from `Math.random()` on every refresh (numbers visibly shift). `PlatformConfiguration` has toggle switches that do nothing. `CustomerSuccess` shows $47.2M recovered — a number that does not exist anywhere in the database.

**What they conclude:** "The Heart Failure module works. Everything else is a prototype." That is approximately correct.

### 6.2 What they should see (demo-ready target)

1. MFA required. Login leads through a TOTP challenge.
2. All six modules show real numbers at Exec, Service Line, and Care Team tier — even if some modules have only 20-50 real patients ingested.
3. Clinical Gap Detection dashboards for all 6 modules show real gap counts with a clearly labeled "Demo Data" badge on rows where synthetic data is substituted.
4. EP patient count is consistent across every endpoint and every tab.
5. No `Math.random()` anywhere in any view. No hardcoded patient rosters. No fake trend arrays.
6. Admin tabs either show real data or are hidden behind a "Coming Soon" state. No silently-broken config toggles.
7. A site-wide "Demo environment — synthetic patients only" banner on the domain `tailrddemo.netlify.app` so the CMO knows up-front what they are looking at.

---

## 7. Demo-Ready vs Production-Ready

### 7.1 Demo-ready (can we put it in front of a CMO at HCA, Mount Sinai, or CommonSpirit with confidence?)

| Criterion | Status |
|---|---|
| All 6 Exec views consume real API | **YES** (shipped today) |
| All 6 Care Team views consume real API | NO (1 of 6) |
| All 6 Service Line views consume real API | NO (1 of 6) |
| All 6 Clinical Gap Detection dashboards consume real API | NO (2 of 6) |
| Real patients exist for each of the 6 modules (≥20 patients each) | NO (5 of 6 modules have <15 patients) |
| No `Math.random()` in clinical or admin views | NO (`PlatformOverview` violates) |
| No hardcoded patient names in the UI | NO (`DEMO_PATIENT_ROSTER` in EP/Coronary/SH/VD/PV Care Team) |
| Endpoint numbers are internally consistent | NO (EP: 3/8 discrepancy) |
| MFA enforced for SUPER_ADMIN and CLINICAL_ADMIN | NO (`mfaVerified:false` works in prod) |
| Site banner distinguishes demo from prod | NO |
| No known public secret leaks | **NO** (AWS key in git history) |

**Verdict:** Not demo-ready. A 30-minute CMO review will surface at least 4 of the above. HCA and Mount Sinai should not see the site in its current state without a pre-demo remediation sprint (the P0 + P1-6 + P1-13 subset, ~25h of work).

### 7.2 Production-ready (can a health system actually use this with their own patients via Redox?)

| Criterion | Status |
|---|---|
| All demo-ready criteria met | NO |
| No AWS credentials in any git history | NO |
| Refresh token has absolute + idle lifetime | NO |
| `authorizeHospital` middleware enforces | NO |
| `WebhookEvent.rawPayload` encrypted at rest | NO |
| Redox webhook end-to-end tested with at least one paying pilot's sandbox | NO |
| Ingestion is resumable, observable, and bounded on connection usage | NO |
| All 6 modules have ≥100 patients of real (Synthea or EHR-derived) data | NO |
| 80%+ of gap rules have a backend unit test with guideline citation | NO (currently near-zero) |
| E2E test covers login → module → gap detail → action | NO |
| BAA executed with RDS host (AWS), Redox, SES, log aggregator | Partial (documented, not all executed) |
| SOC 2 Type I report in progress or complete | Partial (docs exist, no auditor engaged) |
| Disaster recovery plan tested, not just documented | NO (`DISASTER_RECOVERY.md` exists, untested) |
| State privacy law posture assessed (CA, NY, TX, IL minimum) | NO |

**Verdict:** Not production-ready. Distance to production, given the current solo-builder pace and the ~155h P1+P2 estimate above, is approximately 6-8 weeks of focused work. This assumes no additional scope (Redox-real integration, SSO/SAML beyond Cognito scaffold, eCQM export) and does not include a full third-party pentest, which is a separate 2-3 week engagement.

---

**End of audit.** No code was modified. Evidence: all file paths, line numbers, PR numbers, task definitions, and counts cross-referenced against `docs/PLATFORM_STATE_2026_04_16.md`, `docs/PLATFORM_AUDIT_2026_04.md`, `docs/MASTER_AUDIT_2026_04.md`, and live reads of `backend/src/routes/auth.ts`, `backend/scripts/processSynthea.ts`, `.github/workflows/`, and `git log`.
