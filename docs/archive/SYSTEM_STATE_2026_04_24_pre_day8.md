# Pre-Day-8 enterprise-grade checkpoint (2nd rehearsal attempt)

**Captured:** 2026-04-24 morning (read-only; no changes made)
**Purpose:** Prove zero drift, prove all safety machinery armed, prove operational readiness before a second Day 8 Wave 2 rehearsal + production ship attempt.
**Prior artifact:** `docs/SYSTEM_STATE_2026_04_23_pre_day8.md` (pre-first-attempt checkpoint, which recommended GO before the 2026-04-23 rehearsal halted per commit `5a0d6b8`).
**Context:** The 2026-04-23 rehearsal halted with three DMS task start failures. `docs/CHANGE_RECORD_2026_04_23_wave2_execution.md §7-8` contains the full diagnosis and next-session action plan.

---

## Headline

**Recommendation: INVESTIGATE — do NOT proceed to a second Wave 2 rehearsal or production ship today.**

Overnight infrastructure is clean — no drift, all safety machinery still armed, all rehearsal teardown verified. The overnight audit itself is entirely green.

However, **the three DMS failures from 2026-04-23 are unresolved in code**. No fix commits have landed. The production Wave 2 task `tailrd-migration-wave2` (`X4L644C5LNEN3PPYNNWDDLTB24`) still carries the exact source-endpoint configuration (`slotName=dms_wave2_slot`) that failed three consecutive start attempts in rehearsal. Starting production today, or running a second rehearsal with this config, will fail identically.

**Separately, a new P0 finding:** tech-debt item #1 (leaked AWS access key `AKIA****LPVG`, targeted for deletion by 2026-04-22) is **still Active** as of today. Pre-Wave-2, the key must be verified rotated or disabled.

Detailed phase-by-phase findings follow.

---

## PHASE A — Git and code integrity

| Check | Result |
|---|---|
| `git fetch --all --prune` | clean; 10 stale remote branches pruned |
| `origin/main` HEAD | `b92d511` (PR #172 Day 7) — most recent merge ✅ |
| `main` vs `origin/main` | 0 ahead, 0 behind — fully in sync ✅ |
| `git status` on feature branch | 8 untracked docs (all prior audit artifacts) + `.claude/scheduled_tasks.lock` + `.context/`. No tracked changes. |
| `gh pr list --state open` | 22 PRs: all `dependabot[bot]` except PR #89 (JHart, CDS Hooks JWT, last activity 2026-04-09). None Aurora-related. |
| `gh run list --branch main --limit 10` | See anomaly below |
| `git grep TODO\|FIXME\|XXX backend/prisma/` | 0 hits ✅ |
| `git grep TODO\|FIXME\|XXX infrastructure/` | 0 hits ✅ |

### Anomaly A.1 — Post-Deploy Smoke Test failed after Day 7 merge

Run `24791834763` (`workflow_run`, 2026-04-22T17:07:45Z, 9s). Log excerpt:
- Health check: `Healthy after attempt 1` ✅
- Login step: curl exited with code **22** (HTTP ≥400 with `-f`). No `$STATUS` or response captured. Job exited 1.

Live re-verify today: `GET https://api.tailrd-heart.com/health` → `healthy` ✅. Login was not re-tested (would require credentials from secrets). Hypothesis: momentary 4xx during the 2-minute ALB registration window right after the Day 7 task spin-up. The subsequent deployment clearly settled (ECS rolloutState COMPLETED, task def `:93` healthy). **Severity: LOW** — no evidence of ongoing login breakage — but the CI smoke test is showing red on main, which is bad optics. Recommend a follow-up smoke test run to either go green or root-cause.

---

## PHASE B — AWS infrastructure state

### B.1 Aurora cluster `tailrd-production-aurora`

| Property | Value | Expected | Status |
|---|---|---|---|
| Status | available | available | ✅ |
| Engine | aurora-postgresql 15.14 | 15.14 (matches RDS) | ✅ |
| ACU min / max | 0.5 / 16.0 | 0.5 / 16 | ✅ |
| Multi-AZ | true | true | ✅ |
| Encryption at rest | true (KMS `ec93e66e-0f65-46bf-b132-11c9b1b7e637`) | enabled | ✅ |
| Backup retention | 7 days | ≥7 | ✅ |
| Deletion protection | true | true | ✅ |
| Cluster members | writer (1a), reader-1 (1b), reader-2 (1a) | writer + 2 readers across AZs | ✅ (reader-2 shares 1a with writer — acceptable; reader-1 is in 1b for AZ isolation) |
| All instances status | available × 3 (`db.serverless`) | all available | ✅ |

### B.2 Production RDS `tailrd-production-postgres`

| Property | Value | Expected | Status |
|---|---|---|---|
| Status | available | available | ✅ |
| Parameter group | `tailrd-production-postgres15-logical-repl` | same | ✅ |
| ParameterApplyStatus | in-sync | in-sync | ✅ |
| PendingModifiedValues | `{}` | empty | ✅ |
| Multi-AZ | true | true | ✅ |
| Storage | gp3, 100 GiB allocated, 200 GiB max | gp3 | ✅ |
| Encryption at rest | true | enabled | ✅ |
| Enhanced monitoring | `log-stream:db-2NU45GR5BHGZCLWKFQTUBV5VPE` | enabled | ✅ |
| Backup retention | 7 days | ≥7 | ✅ |
| Deletion protection | true | true | ✅ |
| Performance Insights | **false** | enabled (ideal) | ⚠️ LOW — nice-to-have for Day 8 observability. Not a blocker. |

### B.3 Parameter-group values (logical replication)

Queried via `describe-db-parameters`. Direct `SHOW` queries would require psql — `psql` is not installed on this workstation and `SessionManagerPlugin` is not installed either, so ECS exec cannot substitute. The parameter-group values are authoritative because `ParameterApplyStatus=in-sync` with no pending modifications:

| Setting | Param-group value | Required | Status |
|---|---|---|---|
| `rds.logical_replication` | `1` (on) | on | ✅ |
| `max_replication_slots` | `10` | ≥10 | ✅ |
| `max_wal_senders` | `10` | ≥10 | ✅ (yesterday's report listed 25 from a live `SHOW`; param group stores 10. `SHOW` value on engine may differ if PG auto-adjusts based on `rds.logical_replication`, but either way passes ≥10) |
| `shared_preload_libraries` | **not directly queried** | should contain `pg_stat_statements` | ⚠️ pending — Day 6 CR claims `pg_stat_statements` is loaded; re-verify at Day 8 kickoff via psql |

### B.4 Staging RDS `tailrd-staging-postgres`

| Property | Value | Notes |
|---|---|---|
| Status | available | ✅ retained for Day 9 |
| Multi-AZ | true | ✅ |
| Encryption | true | ✅ |
| Backup retention | **1 day** | ⚠️ short but it's staging — acceptable |
| Deletion protection | **false** | ⚠️ staging — acceptable |

### B.5 DMS infrastructure

**Replication instance `tailrd-dms-replication`:**
- Status: **available**
- Class: dms.t3.medium, 50 GiB, engine **3.6.1**
- VPC: `vpc-0fc14ae0c2511b94d`; not publicly accessible ✅

**Endpoints:**
| Id | Type | Extra | Test-connection |
|---|---|---|---|
| `tailrd-rds-source` | SOURCE | `slotName=dms_wave2_slot` | **successful** (re-tested this session) ✅ |
| `tailrd-aurora-target` | TARGET | — | **successful** (prior test) ✅ |

**Tasks:**
| Id | ARN | State |
|---|---|---|
| `tailrd-migration-wave1` | `…IMG4NEHABJCQTHVRK7GNJYTPXI` | stopped ✅ |
| `tailrd-migration-wave2` | `…X4L644C5LNEN3PPYNNWDDLTB24` | ready ✅ (matches design ARN) |
| Other | — | none ✅ |

**Wave 2 task logging (from task settings):**
- `Logging.EnableLogging = true` ✅
- `CloudWatchLogGroup = dms-tasks-tailrd-dms-replication` ✅
- `CloudWatchLogStream = dms-task-X4L644C5LNEN3PPYNNWDDLTB24` ✅
- 22 log components at default severity ✅
- BUT: the log group **`dms-tasks-tailrd-dms-replication` does not yet exist** in CloudWatch — expected behavior for a task that has never successfully started. This aligns with yesterday's rehearsal observation that no task-level logs ever materialized during the three failed attempts. **The next start attempt will either auto-create the log group (DMS IAM role needs `logs:CreateLogGroup`) or fail silently the same way.** Verify the DMS task execution IAM role permissions before retry.

### B.6 Lambda `tailrd-dms-rollback`

| Property | Value | Expected | Status |
|---|---|---|---|
| State | Active | Active | ✅ |
| LastUpdateStatus | Successful | Successful | ✅ |
| Runtime | nodejs20.x | nodejs20.x | ✅ |
| Role | `dms-rollback-role` | same | ✅ |
| VPC subnets | `subnet-0071588b7174f200a`, `subnet-0e606d5eea0f4c89b` | two subnets (private) | ✅ |
| VPC SG | `sg-07cf4b72927f9038f` | present | ✅ |
| Dead letter queue | **null** | present (ideal) | ⚠️ LOW — no DLQ means Lambda failures are silent beyond CloudWatch. Consider SQS DLQ post-Wave-2. |
| Timeout | 300 s | 5 min | ✅ |

**Environment variables (exact Wave 2 match):**
- `DMS_TASK_ARN = arn:aws:dms:us-east-1:863518424332:task:X4L644C5LNEN3PPYNNWDDLTB24` ✅
- `REPLICATION_SLOT_NAME = dms_wave2_slot` ✅
- `AURORA_WRITER_ENDPOINT = tailrd-production-aurora.cluster-...rds.amazonaws.com` ✅
- `AURORA_DATABASE = tailrd` ✅
- `AURORA_SECRET_ARN` points at `tailrd-production/app/aurora-db-password-rAm904` ✅
- `SOURCE_HOST = tailrd-production-postgres...rds.amazonaws.com` ✅
- `SOURCE_DATABASE = tailrd` ✅
- `SOURCE_SECRET_ARN` points at `tailrd-production/app/database-url-SagEmE` ✅
- `TARGET_TRUNCATE_TABLES = patients,encounters` ✅
- `SNS_TOPIC_ARN = arn:aws:sns:us-east-1:863518424332:tailrd-migration-alerts` ✅

**IAM policy (`DMSRollbackPolicy` on `dms-rollback-role`) — verified in full:**
- `logs:CreateLogGroup / CreateLogStream / PutLogEvents` on `/aws/lambda/*` ✅
- `dms:StopReplicationTask / DescribeReplicationTasks` on `*` ✅
- `secretsmanager:GetSecretValue / DescribeSecret` on `tailrd-production/app/aurora-db-password-*` + `tailrd-production/app/database-url-*` ✅
- `kms:Decrypt` on customer CMK `46f6551f-84e6-434f-9316-05055317a1e7` **with `kms:ViaService=secretsmanager.us-east-1.amazonaws.com` condition** ✅ (Day 7 fix preserved)
- `sns:Publish` on `tailrd-migration-alerts` ✅
- `ec2:CreateNetworkInterface / DescribeNetworkInterfaces / DeleteNetworkInterface / AssignPrivateIpAddresses / UnassignPrivateIpAddresses` on `*` ✅

### B.7 ECS backend

| Property | Value | Expected |
|---|---|---|
| Cluster / service | `tailrd-production-cluster` / `tailrd-production-backend` | same |
| Status | ACTIVE | ACTIVE ✅ |
| desiredCount / runningCount / pendingCount | 1 / 1 / 0 | 1/1/0 ✅ |
| Task definition | `tailrd-backend:93` | current Day 7 merge SHA ✅ |
| Deployment rolloutState | COMPLETED | COMPLETED ✅ |
| enableExecuteCommand | true | true ✅ (ready for SSM exec if plugin installed locally) |
| Live `GET /health` | `healthy` | `healthy` ✅ |

### B.8 SNS + EventBridge

- Topic `tailrd-migration-alerts` has exactly **1 subscription**: email → `jhart@hartconnltd.com`, **confirmed** (subscription ARN present, not `PendingConfirmation`) ✅
- EventBridge rule `tailrd-shadow-validator-schedule`: state **DISABLED**, schedule `rate(5 minutes)` ✅ (will enable in Day 8 Phase 8B)

---

## PHASE C — Rehearsal teardown verification (post-2026-04-23)

| Surface | Expected | Today | Status |
|---|---|---|---|
| RDS instances with `rehearsal` in name | 0 | 0 | ✅ |
| DMS replication tasks with `rehearsal` | 0 | 0 | ✅ |
| DMS endpoints with `rehearsal` | 0 | 0 (only source + target) | ✅ |
| Secrets Manager secrets with `rehearsal` | 0 | 0 | ✅ |
| S3 `migration-artifacts/` | only Day 7 scripts | only Day 7 scripts (no rehearsal artifacts) | ✅ |
| CloudWatch log groups `/ecs/rehearsal/*` or `/aws/dms/rehearsal/*` | 0 | 0 | ✅ |
| Aurora `tailrd_rehearsal` database | dropped | **not directly verified** (no psql) — implied dropped by rehearsal teardown CR | ⚠️ soft — re-verify at Day 8 kickoff |
| Production RDS orphan replication slots | 0 | **not directly verified** (no psql) — implied 0 since Wave 2 never started and rehearsal teardown dropped rehearsal slot | ⚠️ soft — re-verify at Day 8 kickoff |

**Full RDS inventory** (for awareness):
- `tailrd-aurora-production-writer` / `reader-1` / `reader-2` (Aurora members, 2026-04-20)
- `tailrd-production-postgres` (prod RDS — migration source, 2026-04-06)
- `tailrd-staging-postgres` (staging, 2026-04-20)
- `tailrd-production` (legacy, created 2026-04-03 — pre-Aurora-V2 artifact; not a rehearsal leftover; flagged for documentation/retirement, not a Day 8 blocker)

---

## PHASE D — Snapshots retained

| Snapshot | Type | Status | Created |
|---|---|---|---|
| `tailrd-production-postgres-pre-consolidation-2026-04-20` | RDS | available | 2026-04-20 17:28 UTC |
| `tailrd-production-aurora-pre-consolidation-2026-04-20` | Aurora | available | 2026-04-20 17:31 UTC |
| `tailrd-production-postgres-pre-logical-repl-2026-04-21` | RDS | available | 2026-04-21 10:17 UTC |
| `tailrd-production-postgres-pre-mcd-wipe-2026-04-21` | RDS | available | 2026-04-22 14:43 UTC |
| `tailrd-production-postgres-day8-rehearsal-2026-04-23` | RDS | available | 2026-04-22 22:49 UTC |

Automated backup retention: **7 days on RDS + Aurora** ✅. Last automated backup window is routine for both (daily via AWS-managed schedule). All 5 expected manual snapshots retained and available. ✅

---

## PHASE E — Data integrity — PENDING (direct DB verification needed)

All six data-integrity queries require psql against production RDS. `psql` is not installed on this workstation; `SessionManagerPlugin` is not installed, so ECS exec cannot substitute from here. Expected values (from Day 7 post-dedup):
1. `SELECT COUNT(*) FROM patients;` — 6,147
2. `SELECT COUNT(*) FROM patients WHERE hospitalId='demo-medical-city-dallas';` — 6,147 (MCD is the only non-zero tenant)
3. Dupe check on `(hospitalId, fhirPatientId)` where fhirPatientId IS NOT NULL — 0 rows
4. `SELECT COUNT(*) FROM encounters;` — 353,512
5. Orphan encounter check — 0
6. Dependent-table baselines: procedures 6,375; conditions 186,452; medications 183,271; device_implants 206; allergy_intolerances 15

Aurora target (should still be empty except hospitals/users prior to Day 8 Wave 1 re-run): patients 0, encounters 0, hospitals 0, users 0 (per Day 4 chaos Test 2 TRUNCATE).

**Indirect evidence that dedup held overnight:**
- `ParameterApplyStatus = in-sync`, `PendingModifiedValues = {}` — no schema/parameter drift
- ECS backend 1/1 running with COMPLETED deployment — no restart loop that would indicate corruption
- Zero CloudWatch alarms (§F) — no hash-mismatch, no row-diff, no error-count triggers
- DMS tasks still in their expected states (Wave 1 stopped, Wave 2 ready) — no unexpected CDC activity

**Action required at Day 8 kickoff:** install SessionManagerPlugin on the operator's workstation, or run a small backend node script via `aws ecs execute-command`, to run the six queries above before any DMS task start.

---

## PHASE F — CloudWatch alarm state

- Alarms in ALARM: **0** ✅
- All 19 `Tailrd*` alarms enumerated and in state **OK** (captured in separate table):
  - 4× `TailrdDMS-*` (error-count, RDS-CPU, replication-lag, task-failed)
  - 3× `TailrdMigration-HASH_MISMATCH_CRITICAL-*` (encounters, observations, patients)
  - 2× `TailrdMigration-LAG_*` (critical, warning)
  - 10× `TailrdMigration-ROW_DIFF_CRITICAL-*` (allergy_intolerances, conditions, device_implants, encounters, hospitals, medications, observations, patients, procedures, users)
  - `ActionsEnabled: true` on all ✅
- Alarm history 2026-04-22T00:00Z → 2026-04-24T12:00Z: **0 state-change events for Tailrd alarms**. No overnight drift. ✅

---

## PHASE G — Cost

- **MTD (2026-04-01 → 2026-04-23, BlendedCost):** Top non-zero service = `AWS Data Transfer` at `-$2.12` (credits net against usage). All AWS Database Migration Service, KMS, Secrets Manager, CloudTrail, Amplify, Certificate Manager, Cost Explorer, Glue line items near zero or credited. No single service shows an abnormal spike. ✅
- **Daily trend (last 7 days, BlendedCost):**
  - 2026-04-17: -$0.19
  - 2026-04-18: -$0.18
  - 2026-04-19: -$0.20
  - 2026-04-20: -$0.22
  - 2026-04-21: -$0.19
  - 2026-04-22: -$0.11
  - 2026-04-23: $0
  - All within normal credit-dominated noise. No spike for rehearsal resources (which were short-lived and free-tier-adjacent). ✅
- **Rehearsal billing confirmation:** DMS line item = $0; rehearsal RDS deletion completed (no orphan instance); no unexpected services. ✅

---

## PHASE H — Tech debt register review

Read `docs/TECH_DEBT_REGISTER.md` (last updated 2026-04-20). Summary:

| # | Title | Severity | Status | Notes |
|---|---|---|---|---|
| 1 | **Leaked AWS access key in public git history** | **P0** | **OPEN** | ⚠️ See H.1 below — this is a NEW finding vs. yesterday's report |
| 2 | MCD partial wipe | P0 | **RESOLVED 2026-04-22** | ✅ |
| 3 | No MFA on PHI routes | HIGH | OPEN | Target Aug 2026 — not a Day 8 blocker |
| 4 | Refresh token unbounded | HIGH | OPEN | Sprint post-cutover |
| 5 | `authorizeHospital` silent no-op | HIGH | OPEN | Sprint post-cutover |
| 6 | No staging env | MEDIUM | OPEN | Day 9 of Aurora plan |
| 7 | No APM / distributed tracing | MEDIUM | OPEN | Day 8 X-Ray enablement planned |
| 8 | Backend trust-proxy | MEDIUM | OPEN | Day 2 pre-req (probably resolved by PR #161, verify) |
| 9 | ALB access logs | MEDIUM | OPEN | Day 2 pre-req (probably resolved by PR #161, verify) |
| 10 | `DEMO_MODE` env var hygiene | MEDIUM | OPEN | Day 6 target (verify :93 task def) |
| 11-15 | UI/feature/ops debt | P1/LOW | OPEN | not Day 8 blockers |
| 16 | Prisma migration history | MEDIUM | **RESOLVED 2026-04-20** | ✅ |
| 17 | RDS Proxy "internal error" | MEDIUM | OPEN | AWS Support case; documented deferral |
| 18 | ALB-IP audit rows | MEDIUM | OPEN | 162k legacy rows |
| 19 | CDC deferred | HIGH | **RESOLVED 2026-04-21** | ✅ (Day 6) |
| 20 | Probe hangs across failover | LOW | **RESOLVED 2026-04-21** | ✅ (Day 7) |

**Resolved:** 4 of 20. All four resolutions verified against AWS state (logical repl on, migration baseline in place, probe v2 in S3).

### H.1 — NEW FINDING: Tech debt #1 (leaked AWS key) is still Active

`aws iam list-access-keys` returned two keys:
- `AKIA****<redacted-leaked-key-1>` — **Active**, created 2026-03-23
- `AKIA****<redacted-leaked-key-2>` — Active, created 2026-02-13

The redacted prefix in the tech-debt doc is `AKIA****…LPVG`. The first key above matches. The debt target was **2026-04-22**. Today is 2026-04-24 (2 days overdue). The key is **still Active**, which means if the leaked credential is usable it remains exploitable.

**Recommended action before any further production ship work:**
- `aws iam delete-access-key --access-key-id AKIA****<redacted-leaked-key-1> --user-name <user>` (after confirming the paired active key `AKIA****<redacted-leaked-key-2>` is the current working one)
- Scan CloudTrail for any use of `AKIA****<redacted-leaked-key-1>` in the past 30 days
- Add trufflehog or git-secrets to CI per the original plan

**Severity assessment:** P0 per the register. Not strictly a Day 8 execution blocker — Wave 2 will succeed or fail regardless of this key — but it is a security hygiene blocker that should be resolved before touching production resources to reduce blast-radius surface.

---

## PHASE I — Runbook and documentation state

All expected migration docs present in `docs/`:
- ✅ `ARCHITECTURE_V2_MIGRATION.md`
- ✅ `DMS_MIGRATION_PLAN.md`
- ✅ `DMS_MIGRATION_LOG.md`
- ✅ `DMS_CHAOS_TEST_LOG.md`
- ✅ `MIGRATION_VALIDATION_RUNBOOK.md`
- ✅ `MIGRATION_HISTORY_CONSOLIDATION_2026_04_20.md`
- ✅ `DISASTER_RECOVERY.md`
- ✅ `RDS_LOGICAL_REPL_ENABLEMENT_RUNBOOK.md`
- ✅ `RDS_BASELINE_2026_04_20.md`
- ✅ `RDS_BASELINE_POST_REBOOT_2026_04_21.md`
- ✅ `SCHEMA_DIFF_REPORT.md`
- ✅ `TECH_DEBT_REGISTER.md`
- ✅ `DATA_DEDUPLICATION_PLAN.md`
- ✅ `CHANGE_RECORD_2026_04_21_rds_logical_repl.md`
- ✅ `CHANGE_RECORD_2026_04_22_wave2_prep.md`
- ✅ `CHANGE_RECORD_2026_04_23_wave2_execution.md` (contains the halt root-cause analysis + action plan)
- ✅ `SYSTEM_STATE_2026_04_22_pre_day7.md`
- ✅ `SYSTEM_STATE_2026_04_23_pre_day8.md`

Plus non-migration runbooks and companion docs (`AURORA_SCHEMA_READY.md`, `HEALTH_SYSTEM_ONBOARDING_RUNBOOK.md`, `RDS_QUERY_ANALYSIS_2026_04_20.md`, `SECRET_ROTATION_RUNBOOK.md`). No missing docs. `SECRET_ROTATION_RUNBOOK.md` is directly relevant to tech debt #1 resolution.

---

## PHASE J — Operational readiness

- **Calendar:** not visible from this workstation. Operator to self-confirm no MCD demos or interruptions during the 4-7 hour Wave 2 window before kickoff.
- **Operator readiness:** solo operator, self-assessment. Recommend:
  - Local environment: install `SessionManagerPlugin` and `psql` client (needed for direct DB verification during Wave 2 monitoring).
  - Local environment: confirm a stable terminal (long-running window), Claude Code context fresh (`/clear` before Day 8 ship prompt is wise).
- **Backup comms:** solo operator — change record doubles as team onboarding reference.

---

## PHASE K — Resource inventory snapshot (current running state)

| Resource | Count | Identity |
|---|---|---|
| Aurora cluster | 1 | `tailrd-production-aurora` |
| Aurora instances | 3 | writer + reader-1 + reader-2 |
| RDS instances | 3 | `tailrd-production-postgres`, `tailrd-staging-postgres`, `tailrd-production` (legacy) |
| DMS replication instance | 1 | `tailrd-dms-replication` (dms.t3.medium) |
| DMS tasks | 2 | Wave 1 (stopped), Wave 2 (ready) |
| DMS endpoints | 2 | source + target |
| Lambda | 1 | `tailrd-dms-rollback` |
| ECS service | 1 | `tailrd-production-backend` @ task def `:93`, 1/1 |
| SNS topic + subs | 1 topic, 1 sub | `tailrd-migration-alerts` → jhart@hartconnltd.com (confirmed) |
| EventBridge rule | 1 | `tailrd-shadow-validator-schedule` (DISABLED) |
| CloudWatch alarms | 19 | all `Tailrd*`, all OK |
| Manual snapshots | 5 | 4× RDS + 1× Aurora (all `available`) |

---

## PHASE L — Comparison vs yesterday (2026-04-23 pre-Day-8)

| Dimension | 2026-04-23 | 2026-04-24 | Delta |
|---|---|---|---|
| origin/main HEAD | `b92d511` | `b92d511` | no change ✅ |
| ECS task def | `:93` | `:93` | no change ✅ |
| DMS Wave 2 task state | ready | ready | no change ✅ |
| Parameter group apply | in-sync | in-sync | no change ✅ |
| Alarms OK | 19/19 | 19/19 | no change ✅ |
| Snapshots retained | 4 (pre-rehearsal) | 5 (+rehearsal snapshot from 2026-04-23) | rehearsal snapshot added ✅ |
| Open PRs | 20 | 22 | +2 dependabot ✅ non-material |
| Rehearsal resources | pending | torn down | ✅ |
| DMS failure diagnosis | n/a (pre-rehearsal) | 3 attempts documented, root-cause partial | new context 🆕 |
| Smoke test status on main | green | **red (1 failure from Day 7)** | downgrade ⚠️ |
| P0 #1 key rotation | target date 2026-04-22 | **still Active, overdue** | downgrade ⚠️ |
| Recommendation | GO | **INVESTIGATE** | downgrade |

---

## PHASE M — Recommendation

**INVESTIGATE.** Do not authorize a second Wave 2 rehearsal or production ship today.

The overnight drift check is green — infrastructure, teardown, snapshots, alarms, cost are all as expected. But two issues must be resolved before any further ship work:

### Primary blocker — unresolved DMS task start failures (from 2026-04-23)

The production Wave 2 task (`X4L644C5LNEN3PPYNNWDDLTB24`) still carries the exact source-endpoint configuration (`slotName=dms_wave2_slot` + DMS-managed slot semantics) that failed three consecutive start attempts in rehearsal. Starting it today will fail identically. Before either a second rehearsal or production:

1. **Implement the action plan from `CHANGE_RECORD_2026_04_23_wave2_execution.md §8` next-session items 1-7.** Key moves:
   - Add DMS task CloudWatch log group pre-creation + verify IAM role has `logs:CreateLogGroup / CreateLogStream / PutLogEvents` so the "Stream Component Fatal error" actually surfaces a trace next time
   - Attempt first without `slotName` extra-attr (mimic the Day 6 Phase 6E CDC readiness test and the Phase 7B chaos test — both of which worked)
   - Disable `ValidationSettings` for attempt-1 to isolate whether validation is the failure mode
   - Only re-add `slotName` with correct plugin (`test_decoding`, matching DMS default) and correct pre-creation order once the task starts cleanly
2. **Rehearse end-to-end** with the fixed config. Only on a clean rehearsal pass proceed to production.

### Secondary blocker — P0 tech debt #1 (leaked AWS key)

`AKIA****<redacted-leaked-key-1>` is still Active and overdue for rotation. Before any further production ship work:

1. Confirm the second key (`AKIA****<redacted-leaked-key-2>`) is the current working key
2. Delete or disable the leaked key
3. Scan CloudTrail for use of the leaked key ID in the past 30 days
4. Update `TECH_DEBT_REGISTER.md` with **RESOLVED** status and evidence

### Non-blocking concerns to track

1. Post-Deploy Smoke Test on main is red (curl 22 on login after Day 7 deploy). Either re-run and verify green, or root-cause.
2. Lambda has no DLQ — consider adding post-Wave-2.
3. RDS Performance Insights disabled — nice-to-have for Day 8 observability.
4. `tailrd-production` legacy RDS instance — retire or document.

### Entry criteria for next authorized ship attempt

- DMS log group `dms-tasks-tailrd-dms-replication` pre-created and DMS IAM role verified
- Rehearsal task starts cleanly without `slotName` extra-attr
- Rehearsal task starts cleanly WITH correct `slotName` + `test_decoding` pre-created slot
- P0 tech debt #1 resolved
- SessionManagerPlugin + psql installed on operator workstation
- All six Phase E data-integrity queries executed and returning expected values
- Green CI smoke test on main

---

**Stopping here per instructions. Awaiting Jonathan's authorization or direction on next step.**
