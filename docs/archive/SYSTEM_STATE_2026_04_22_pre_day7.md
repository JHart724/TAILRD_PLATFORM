# Pre-Day-7 system state checkpoint

**Captured:** 2026-04-21T14:08Z (read-only audit; no changes made)
**Purpose:** confirm nothing drifted between Day 6 close-out (2026-04-21T13:50Z merge) and Day 7 start.
**Scope:** git, AWS infra, snapshots, CloudWatch, cost, tech debt, documentation.

---

## 1. Git state

- **Current main HEAD:** `7390262` — `feat(migration): Aurora V2 Day 6 — production RDS logical replication enabled, CDC proven, tech debt #19 RESOLVED (#171)` (merged 2026-04-21T13:50:32Z)
- **Previous 4 commits on main:** all expected (Day 5 PR #170, Day 4 PR #167, migration history consolidation PR #166, Day 3 PR #165). No surprise commits.
- **Local working tree:** clean on `main`. The 5 untracked files present (`.claude/scheduled_tasks.lock`, `.context/`, `docs/COMPREHENSIVE_PLATFORM_AUDIT_2026_04_16.md`, `docs/HEALTH_SYSTEM_ONBOARDING_RUNBOOK.md`, `docs/PLATFORM_STATE_2026_04_16.md`) were already present at the Day 6 session start — they are not drift.
- **Open PRs: 21.** One human, twenty dependabot.
  - **#89** — `feat(EHR): CDS Hooks JWT verification for Epic production` (JHart724, last updated 2026-04-09 — stale, 12 days since update). Not blocking Aurora V2 migration; pre-dates this work stream.
  - **20 dependabot PRs** — routine dependency bumps. None touch migration-critical paths. Safe to triage after Wave 2.

**Verdict:** no unexpected commits, no drift. ✅

---

## 2. AWS infrastructure

### 2.1 Aurora cluster `tailrd-production-aurora`
- Status: **available**
- Engine: aurora-postgresql 15.14
- Members: 3 (writer + reader-1 tier 1 + reader-2 tier 2)
- ACU: min 0.5, max 16.0
- Multi-AZ: true
- Backup retention: 7 days
- Endpoint: `tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com`
- Reader endpoint: `tailrd-production-aurora.cluster-ro-csp0w6g8u5uq.us-east-1.rds.amazonaws.com`

All expected. ✅

### 2.2 Production RDS `tailrd-production-postgres`
- Status: **available**
- Engine: 15.14
- Parameter group: **`tailrd-production-postgres15-logical-repl`** (Day 6 group, attached)
- ParameterApplyStatus: **`in-sync`** (was `pending-reboot` at end of Phase 6B; settled after reboot)
- PendingModifiedValues: `{}`
- Multi-AZ: true
- Backup retention: 7 days
- **Primary AZ: `us-east-1b`** (was `us-east-1a` before Day 6). Standby: `us-east-1a` (was `us-east-1b`).
  - **Not a finding** — the AZ roles swapped because Day 6 used `--force-failover`. Expected and documented.

Logical replication runtime values re-verified via ECS one-shot `1f686b28ebb84ce78bb5271182859330` (exit 0):

| Setting | Value | Required |
|---|---|---|
| `wal_level` | `logical` | ✅ |
| `rds.logical_replication` | `on` | ✅ |
| `max_replication_slots` | `10` | ✅ |
| `max_wal_senders` | `25` | ≥10 ✅ |
| `shared_preload_libraries` | `rdsutils,pg_stat_statements` | ✅ |

All checks PASS. No drift. ✅

### 2.3 Staging RDS `tailrd-staging-postgres`
- Status: **available**
- Multi-AZ: true
- Parameter group: `tailrd-staging-postgres15-logical-repl` (Day 5 rehearsal group, retained)
- ParameterApplyStatus: `in-sync`
- Backup retention: 1 day (acceptable for non-production)

Retained for Day 9. ✅

### 2.4 DMS infrastructure
- **Replication instance** `tailrd-dms-replication` — `available`, dms.t3.medium, engine 3.6.1, single-AZ. Retained.
- **Endpoints** (2): `tailrd-rds-source` (postgres, active), `tailrd-aurora-target` (aurora-postgresql, active). Both retained, both active.
- **Replication tasks** (1): `tailrd-migration-wave1` — status `stopped`, migration-type `full-load`, stopReason `FULL_LOAD_ONLY_FINISHED`. FullLoadProgressPercent 100, TablesLoaded 2, TablesErrored 0. No surprise tasks. ✅
  - **Note:** `lastStop` field reads null while `statistics.StopDate` reads `2026-04-20T11:48:48Z`. This is an AWS API quirk — full-load-only tasks that finish naturally populate `StopDate` (in stats) but not `lastStop` (top-level). Not an anomaly.

### 2.5 ECS `tailrd-production-backend`
- desired 1 / running 1 / pending 0
- Single PRIMARY deployment, rolloutState `COMPLETED`
- **Task def: `tailrd-backend:92`** (created 2026-04-21T13:52:06Z by CI role `tailrd-cli-access`, image tag `73902624b897681f1b6738195f922ce75b7f6721` = Day 6 merge commit SHA)
- ⚠️ **Behavior worth noting (not a drift):** CI registered task def 92 and rolled the service to it at 13:52Z — ~2 minutes after the Day 6 PR merge, ~9 minutes after the Day 6 observation window ended (13:43Z). The PR was docs+scripts only with no backend code changes, but CI's deploy workflow registers a new task def per commit SHA per CLAUDE.md §15 Rule 5. The resulting rolling deploy took ~2 min. Backend went from uptime ~15100s+ on :91 to a fresh container on :92. This is expected CI behavior; just flagging that the Day 6 "uptime continuous through reboot" finding applies to task def :91, not :92. :92 is healthy now and contains identical application code to :91 (the PR added no application code, only docs + scripts/ and infrastructure/).

### 2.6 Rollback Lambda `tailrd-dms-rollback`
- State: `Active`, lastUpdate `Successful`, runtime nodejs20.x
- Timeout 300s, memory 256 MB
- lastModified: 2026-04-20T18:46:33Z (no changes since Day 4 — as expected)
- Env vars:
  - `DMS_TASK_ARN` = Wave 1 task ARN (`arn:aws:dms:us-east-1:863518424332:task:IMG4NEHABJCQTHVRK7GNJYTPXI`) — **must be updated for Wave 2** (Day 7 prereq, already on user's list)
  - `TARGET_TRUNCATE_TABLES` = `hospitals,users` — also must be updated for Wave 2 (`patients,encounters`)
  - Aurora + source endpoints, SNS topic — all correct

### 2.7 SNS topic `tailrd-migration-alerts`
- 1 subscription: `jhart@hartconnltd.com` (email), confirmed (real SubscriptionArn, not `PendingConfirmation`) ✅

---

## 3. Snapshots and backups

### 3.1 RDS manual snapshots (production)
| ID | Status | Created | Size | Encrypted |
|---|---|---|---:|---|
| `tailrd-production-postgres-pre-consolidation-2026-04-20` | available | 2026-04-20T17:28Z | 100 GB | yes |
| `tailrd-production-postgres-pre-logical-repl-2026-04-21` | available | 2026-04-21T10:17Z | 100 GB | yes |

### 3.2 Aurora manual snapshots
| ID | Status | Created | Engine |
|---|---|---|---|
| `tailrd-production-aurora-pre-consolidation-2026-04-20` | available | 2026-04-20T17:31Z | 15.14 |

### 3.3 Automated backup retention
- Aurora cluster: **7 days** ✅
- Production RDS: **7 days** ✅
- Staging RDS: 1 day (non-production, acceptable)

All snapshots present and available. ✅

---

## 4. CloudWatch state

### 4.1 Alarms in ALARM
**Zero alarms in ALARM state.** ✅

### 4.2 All Tailrd* alarms (19 total)

| Category | Count | All OK? |
|---|---:|:---:|
| `TailrdDMS-*` | 4 | ✅ |
| `TailrdMigration-ROW_DIFF_CRITICAL-*` | 10 (one per tracked table) | ✅ |
| `TailrdMigration-HASH_MISMATCH_CRITICAL-*` | 3 (patients, encounters, observations) | ✅ |
| `TailrdMigration-LAG_*` | 2 | ✅ |

`TailrdDMS-TASK_FAILED` last state change 2026-04-21T10:08Z (our Day 6 Go/No-Go fix — `breaching → notBreaching`). Nothing in `INSUFFICIENT_DATA`.

### 4.3 24-hour alarm state history
All 30 state transitions in the last 24h accounted for:
- Day 4 Wave 1 task lifecycle (INSUFFICIENT_DATA → OK as metrics started flowing, ALARM → OK on chaos test cleanup) — 2026-04-20
- Day 6 `TailrdDMS-TASK_FAILED` config fix (ALARM → OK at 10:08Z) — 2026-04-21

No surprise transitions. ✅

---

## 5. Cost

### 5.1 Month-to-date (2026-04-01 to 2026-04-21)
**$0.017 USD** — essentially on credits. Most AWS services show small negative values (credit applications) offsetting the positive usage.

Daily gross (before credits) is ~$0.10/day based on yesterday's per-service breakdown. Burn rate is well under the ~$12/day budget mentioned.

### 5.2 Yesterday's top cost drivers (gross, before credits)
| Service | Cost ($) | Notes |
|---|---:|---|
| EC2 - Other (NAT, ENI) | 0.048 | Fargate + NAT gateway |
| Amazon Elastic Container Service | 0.048 | Fargate task-hours |
| AWS Database Migration Service | 0.00 | Day 4 task was brief; no Wave 2 yet |
| Amazon RDS | 0.0000000117 | Credit-offset |
| Amazon ElastiCache | 0.00 | — |
| AWS Lambda | 0.00 | — |

No unexpected large charges. DMS cost is currently near-zero because Wave 1 ran for ~3 seconds and no CDC is active. Expect DMS cost to grow during Wave 2 (CDC is continuous).

**Flag:** real spend begins when AWS credits expire. Not a current-day concern, but worth tracking.

---

## 6. Tech debt register

`docs/TECH_DEBT_REGISTER.md` status:

| # | Title | Severity | Status |
|--:|---|---|---|
| 1 | Leaked AWS access key in public git history | P0 | open |
| 2 | MCD data in partial wipe state | P0 | open (expected; cleaned up by Wave 2 FK cascade) |
| 3 | No MFA enforcement on PHI routes | HIGH | open |
| 4 | Refresh token unbounded lifetime | HIGH | open |
| 5 | `authorizeHospital` silent no-op | HIGH | open |
| 6 | No staging environment | MEDIUM | open (staging RDS exists but no full stack) |
| 7 | No APM / distributed tracing | MEDIUM | open |
| 8 | Backend does not trust X-Forwarded-For | MEDIUM | open |
| 9 | ALB access logs not enabled | MEDIUM | open |
| 10 | DEMO_MODE env var in production | MEDIUM | open |
| 11 | 5 Care Team views still mock data | P1 | open |
| 12 | SuperAdminConsole not wired | P1 | open |
| 13 | Single-region no DR | LOW | open |
| 14 | Manual ECS task def registration for env var changes | LOW | open |
| 15 | Math.random() in analytics (partially fixed) | LOW | open |
| **16** | **Prisma migration history incomplete** | **LOW** | **RESOLVED 2026-04-20** ✅ |
| 17 | RDS Proxy stuck internal-error | LOW | open (deferred to Day 11+) |
| 18 | Audit middleware logs ALB IP | LOW | open |
| **19** | **CDC deferred on Wave 1 pending logical repl** | **LOW** | **RESOLVED 2026-04-21** ✅ |
| **20** | **rdsRebootHealthCheck.js probe hangs across Multi-AZ failover** | **LOW** | **NEW 2026-04-21** |

**Resolved items verified:**
- #16 — confirmed merged via PR #166. Single consolidated baseline in `backend/prisma/migrations/20260420000000_consolidated_baseline/`, verified against production schema.
- #19 — confirmed `rds.logical_replication=on` on production (see §2.2 re-verification run today). Wave 2 CDC path unblocked.

**Items relevant to Day 7 / Wave 2:**
- **#20** (probe rewrite) — mentioned in user's Day 7 prereq list. Should be done before any future production reboot; not strictly blocking Wave 2 CDC.
- **#14** (manual task def registration) — will bite us if Wave 2 rollback Lambda needs env var changes. Day 7 Wave 2 prereq #4 (update Lambda `DMS_TASK_ARN`) requires this pattern.

---

## 7. Documentation inventory

All 13 required docs present:

| Doc | Exists |
|---|:---:|
| `ARCHITECTURE_V2_MIGRATION.md` | ✅ |
| `DMS_MIGRATION_PLAN.md` | ✅ |
| `DMS_MIGRATION_LOG.md` | ✅ |
| `DMS_CHAOS_TEST_LOG.md` | ✅ |
| `MIGRATION_VALIDATION_RUNBOOK.md` | ✅ |
| `MIGRATION_HISTORY_CONSOLIDATION_2026_04_20.md` | ✅ |
| `DISASTER_RECOVERY.md` | ✅ |
| `RDS_LOGICAL_REPL_ENABLEMENT_RUNBOOK.md` | ✅ (updated Day 6 with production timings) |
| `RDS_BASELINE_2026_04_20.md` | ✅ |
| `RDS_BASELINE_POST_REBOOT_2026_04_21.md` | ✅ (new Day 6) |
| `SCHEMA_DIFF_REPORT.md` | ✅ |
| `TECH_DEBT_REGISTER.md` | ✅ |
| `CHANGE_RECORD_2026_04_21_rds_logical_repl.md` | ✅ (new Day 6) |

---

## 8. Findings summary

### No drift found
- Git: clean, no surprise commits, PR #171 is latest merge
- Aurora cluster + RDS + Staging: all `available`, expected settings
- Logical replication still live on production (re-verified today)
- DMS: 1 retained task, expected state
- SNS + Lambda: correct configuration, no regressions
- Snapshots: all present and available
- Alarms: zero in ALARM, all 19 OK, no surprise history
- Docs: all 13 present

### Items to note (not blocking)
- **ECS task def `:92` rolled out at 13:52Z** after Day 6 PR merge — expected CI behavior per CLAUDE.md §15 rule 5. The running container image tag is the Day 6 merge commit SHA. Service healthy.
- **Primary AZ swapped** from 1a → 1b due to Day 6 force-failover. Expected.
- **Lambda `DMS_TASK_ARN` still on Wave 1** — known Day 7 prereq, not drift.
- **Stale human PR #89** (CDS Hooks JWT, 12 days since update). Unrelated to Aurora V2. Triage separately.

### Items opened by Day 6 (already tracked)
- Tech debt **#20** — probe rewrite before next production reboot.

---

## 9. Day 7 Wave 2 prerequisites (from user's Day 6 final report, verified here)

Must complete in order before Wave 2 CDC starts:

1. Fresh change record for Wave 2 (new CR ID, new Go/No-Go checklist)
2. Probe rewrite (tech debt #20) — raw `pg` with aggressive timeouts
3. Live-running DMS rollback chaos test (Day 4 was synthetic `DMS_TASK_ARN=TBD`)
4. Update rollback Lambda env vars:
   - `DMS_TASK_ARN` → new Wave 2 task ARN
   - `TARGET_TRUNCATE_TABLES` → `patients,encounters`
   - Add `REPLICATION_SLOT_NAME=dms_wave2_slot`
5. Shadow validator preparation (`shadowReadValidation.ts` needs Aurora patients + encounters to be CDC-applied before comparison is meaningful)

All five items are **known work**, not drift. None have been started (expected — user explicitly said Day 7 is a new session).

---

## 10. Recommendation

**GO.** Proceed to Day 7 Wave 2 prep ship.

Rationale:
- No drift detected between Day 6 close and this checkpoint.
- Zero alarms, zero pending modifications, zero surprise infrastructure changes.
- Production logical replication still active 32+ min after reboot, re-verified end-to-end today.
- The only "movement" since Day 6 is expected CI behavior (task def 92 rolled out on PR merge).
- All Day 7 prereqs are known work items, none of them are new findings.

**Suggested sequencing for Day 7 start (Jonathan decides):**
- Start with **prereq #2** (probe rewrite — tech debt #20). Cheap, self-contained, unblocks confidence for any future reboot/failover-watching scenarios. Can be done before opening the Wave 2 CR.
- Then **prereq #4** (Lambda env var update) in its own small PR.
- Then **prereq #3** (live chaos test) as a dedicated sub-ship.
- Then **prereq #1** (Wave 2 CR) and execute Wave 2.

Or accept a single large Wave 2 prep ship that bundles all of the above.

**Do not execute any of the above without explicit authorization.** This report is the findings brief; implementation decisions belong to Jonathan.
