# Pre-Day-8 system state checkpoint

**Captured:** 2026-04-22T22:33Z (read-only audit; no changes made)
**Purpose:** confirm nothing drifted between Day 7 close-out (PR #172 merged 2026-04-22T17:00:36Z) and Day 8 start.
**Scope:** git, AWS infra, data integrity post-dedup, snapshots, CloudWatch, cost, tech debt, documentation, Day 8 readiness.

---

## 1. Git state

- **Current main HEAD:** `b92d511` — `feat(migration): Aurora V2 Day 7 — Wave 2 prep complete, probe rewrite, live chaos test, MCD dedup resolved (#172)` (merged 2026-04-22T17:00:36Z)
- **Previous commits on main:** all expected (PR #171 Day 6, PR #170 Day 5, PR #167 Day 4, PR #166 migration consolidation). No surprise merges.
- **Local working tree:** clean on `main`. Only pre-existing untracked files (same set as prior checkpoints) plus `docs/SYSTEM_STATE_2026_04_22_pre_day7.md` (read-only artifact from Day 7 checkpoint, never committed). No uncommitted drift.
- **Open PRs: 1.** Only the stale `#89 feat(EHR): CDS Hooks JWT verification for Epic production` (JHart724, last updated 2026-04-09). Unrelated to Aurora V2. Dependabot PRs that existed before Day 7 are no longer showing in `gh pr list --author @me` but remain open across the repo.

**Verdict:** no unexpected commits, no drift. ✅

---

## 2. AWS infrastructure

### 2.1 Aurora cluster `tailrd-production-aurora`
- Status: **available**
- Engine: aurora-postgresql 15.14
- Members: 3 (writer + 2 readers)
- ACU: 0.5–16
- Multi-AZ: true

### 2.2 Production RDS `tailrd-production-postgres`
- Status: **available**
- Engine: 15.14
- Parameter group: `tailrd-production-postgres15-logical-repl` (Day 6)
- ParameterApplyStatus: `in-sync`
- PendingModifiedValues: `{}`
- Multi-AZ: true

Logical replication settings re-verified from `pg_settings`:
| Setting | Value | Required |
|---|---|---|
| `wal_level` | `logical` | ✅ |
| `rds.logical_replication` | `on` | ✅ |
| `max_replication_slots` | `10` | ✅ |
| `max_wal_senders` | `25` | ≥10 ✅ |

Replication slots currently present on RDS: **0** (no active CDC tasks). Expected — Wave 2 has not been started yet.

### 2.3 Staging RDS `tailrd-staging-postgres`
- Status: **available**
- ParameterApplyStatus: `in-sync`
- Retained for Day 9 chaos scenarios.

### 2.4 DMS infrastructure
- **Replication instance** `tailrd-dms-replication` — `available`. Same as Day 7.
- **Endpoints** (2):
  - `tailrd-rds-source` — active, **ExtraConnectionAttributes: `slotName=dms_wave2_slot`** ✅ (set during Day 7 Phase 7C)
  - `tailrd-aurora-target` — active
- **Replication tasks** (2):
  - `tailrd-migration-wave1` — `stopped`, `full-load` (retained from Day 4)
  - `tailrd-migration-wave2` — `ready`, `full-load-and-cdc` ✅ (Day 7 Phase 7C, never started)

No running tasks. No surprise tasks.

### 2.5 ECS `tailrd-production-backend`
- desired 1 / running 1 / pending 0
- rolloutState: `COMPLETED`
- **Task def: `tailrd-backend:93`** — registered 2026-04-22T17:02:49Z (2 min after Day 7 PR merge), image tag `b92d5112ff1d995a04423212ffcc36fd52bcaa36` = Day 7 merge commit SHA. Same CI auto-redeploy behavior as observed after Day 6. Expected per CLAUDE.md §15 rule 5 (new task def per commit). Previous rev `:92` superseded; service healthy on `:93`.

### 2.6 Rollback Lambda `tailrd-dms-rollback`
- State: `Active`
- Env vars — all 10 as configured in Day 7 Phase 7D:

| Variable | Value | Notes |
|---|---|---|
| `DMS_TASK_ARN` | `arn:aws:dms:us-east-1:863518424332:task:X4L644C5LNEN3PPYNNWDDLTB24` | ✅ Wave 2 task |
| `TARGET_TRUNCATE_TABLES` | `patients,encounters` | ✅ |
| `REPLICATION_SLOT_NAME` | `dms_wave2_slot` | ✅ |
| `SOURCE_HOST` | prod RDS endpoint | ✅ |
| `SOURCE_SECRET_ARN` | prod DB URL secret | ✅ |
| `AURORA_WRITER_ENDPOINT` | prod Aurora writer | ✅ |
| `AURORA_SECRET_ARN` | prod Aurora secret | ✅ |
| `AURORA_DATABASE` | `tailrd` | ✅ |
| `SOURCE_DATABASE` | `tailrd` | ✅ |
| `SNS_TOPIC_ARN` | `tailrd-migration-alerts` | ✅ |

### 2.7 SNS topic `tailrd-migration-alerts`
- 1 confirmed subscription: `jhart@hartconnltd.com`

---

## 3. Data integrity post-dedup

All checks on production RDS executed via ECS one-shot (`760cf5a1...`, exit 0):

### 3.1 Dedup persisted ✅
- **`patient_dupe_keys`: 0** — post-Day-7 dedup state holds
- **Patients total: 6,147** (matches Day 7 expected: 14,170 → 6,147)
- **Encounters total: 353,512** (unchanged through dedup)
- **Orphan encounters: 0** — every encounter's `patientId` resolves to a surviving patient row. Day 7 FK reassignment succeeded.
- Hospitals on RDS: 4, Users on RDS: 1

### 3.2 Aurora current state
- patients: **0** (never loaded)
- encounters: **0** (never loaded)
- **hospitals: 0** (wiped by Day 4 chaos Test 2 — expected, documented in Day 7 Phase 7E)
- **users: 0** (same — wiped by Day 4 chaos Test 2)

### 3.3 Aurora settings (informational)
- `wal_level=replica`, `rds.logical_replication=off` (Aurora-as-target doesn't need logical repl)
- `max_replication_slots=20`, `max_wal_senders=20` (Aurora defaults)
- 0 replication slots on Aurora

---

## 4. Snapshots retained

### 4.1 RDS production snapshots (manual, `available`)
| ID | Created | Rollback purpose |
|---|---|---|
| `tailrd-production-postgres-pre-consolidation-2026-04-20` | 2026-04-20T17:28Z | Pre-migration-history consolidation |
| `tailrd-production-postgres-pre-logical-repl-2026-04-21` | 2026-04-21T10:17Z | Pre-Day-6 reboot (logical replication enablement) |
| `tailrd-production-postgres-pre-mcd-wipe-2026-04-21` | 2026-04-22T14:43Z | Pre-Day-7 MCD dedup (this is what the user called "pre-dedup"; the actual identifier uses `pre-mcd-wipe-` per original spec) |

### 4.2 Aurora cluster snapshots (manual, `available`)
| ID | Created |
|---|---|
| `tailrd-production-aurora-pre-consolidation-2026-04-20` | 2026-04-20T17:31Z |

All required snapshots retained and available. ✅

---

## 5. CloudWatch state

- **Alarms in ALARM state: 0** ✅
- **All 19 Tailrd* alarms:** all in `OK` state ✅
- **Last 24h alarm history:** zero state transitions ✅

---

## 6. Cost

### Month-to-date (2026-04-01 to 2026-04-22)
**$0.0159 USD** — essentially free (credit-covered). Unchanged pattern from pre-Day-7 (was $0.017 then; slight decrease due to MTD window extension).

### Yesterday per-service (gross, pre-credits)
- ECS + EC2-Other: ~$0.048 (Fargate run-hours — includes all Day 7 ECS one-shots)
- ELB: $0.00002
- RDS: trivial
- DMS: $0 (no tasks running)
- Everything else: trivial or credited

No unexpected charges. Cost trajectory is consistent with Day 5-7 workload.

---

## 7. Tech debt register

### Resolved items — verified ✅

| # | Title | Status | Verification |
|--:|---|---|---|
| **16** | Prisma migration history incomplete | RESOLVED 2026-04-20 | PR #166 merged; single consolidated baseline on disk |
| **19** | CDC deferred on Wave 1 | RESOLVED 2026-04-21 | `rds.logical_replication=on` verified today |
| **20** | `rdsRebootHealthCheck.js` probe hangs | RESOLVED 2026-04-21 | Probe rewrite on raw `pg` with timeouts; validated on staging force-failover |
| **2** | MCD partial wipe state | RESOLVED 2026-04-22 | 0 dupe keys on RDS verified today; 0 orphan encounters verified today |

### Open items (unchanged since pre-Day-7 checkpoint except for #20 resolution)
- **P0:** #1 leaked AWS access key in public git history
- **HIGH:** #3 no MFA enforcement, #4 refresh token unbounded lifetime, #5 `authorizeHospital` silent no-op
- **MEDIUM:** #6 no full staging environment, #7 no APM, #8 no X-Forwarded-For trust, #9 no ALB access logs, #10 DEMO_MODE env vars in production
- **P1:** #11 5 Care Team views still mock data, #12 SuperAdminConsole not wired
- **LOW:** #13 single-region no DR, #14 manual task def registration for env var changes, #15 Math.random in analytics, #17 RDS Proxy stuck, #18 audit middleware logs ALB IP

None of the open items are Day 8 blockers.

---

## 8. Documentation inventory

All required migration docs present and current:
- `ARCHITECTURE_V2_MIGRATION.md` ✅
- `DMS_MIGRATION_PLAN.md` ✅
- `DMS_MIGRATION_LOG.md` ✅ (Day 7 entry added)
- `DMS_CHAOS_TEST_LOG.md` ✅ (Test 3 + Phase 7B.5 added)
- `MIGRATION_VALIDATION_RUNBOOK.md` ✅
- `MIGRATION_HISTORY_CONSOLIDATION_2026_04_20.md` ✅
- `DISASTER_RECOVERY.md` ✅
- `RDS_LOGICAL_REPL_ENABLEMENT_RUNBOOK.md` ✅
- `RDS_BASELINE_2026_04_20.md` ✅
- `RDS_BASELINE_POST_REBOOT_2026_04_21.md` ✅
- `SCHEMA_DIFF_REPORT.md` ✅
- `TECH_DEBT_REGISTER.md` ✅ (updated)
- `CHANGE_RECORD_2026_04_21_rds_logical_repl.md` ✅ (Day 6)
- `CHANGE_RECORD_2026_04_22_wave2_prep.md` ✅ (Day 7)
- `DATA_DEDUPLICATION_PLAN.md` ✅ (with resolution record)

---

## 9. Day 8 entrance criteria — validated

| Criterion | Status |
|---|:---:|
| Production RDS logical replication on | ✅ (re-verified today via `SHOW wal_level`, `SHOW rds.logical_replication`) |
| Rollback Lambda wired for Wave 2 + IAM/KMS verified | ✅ |
| Wave 2 task in `ready` state | ✅ (`tailrd-migration-wave2`, never started) |
| Source endpoint has `slotName=dms_wave2_slot` | ✅ |
| Zero dupes on source patients + encounters | ✅ (0 dupe keys, 0 orphan encounters) |
| Pre-Day-8 snapshots in place | ✅ (3 RDS manual + 1 Aurora cluster) |
| Shadow validator + disabled EventBridge rule ready | ✅ (target wiring remains deferred to Day 8 cutover) |
| Aurora hospitals + users empty and known-empty | ✅ (Wave 1 re-run is Day 8 step 1) |
| No alarms in ALARM | ✅ |
| Backend healthy, ECS stable | ✅ (task def 93, 1/1, rolloutState COMPLETED) |

---

## 10. Observations / noteworthy

1. **ECS task def rolled 92 → 93 after Day 7 PR merge.** Same CI auto-redeploy pattern as Day 6 → 91→92. Expected per CLAUDE.md §15 rule 5 (new task def per commit). Day 7 PR was docs+scripts only; no application code change. Backend is on `:93` tag = Day 7 merge commit SHA.

2. **Aurora target is empty on hospitals + users.** Known since Day 4 chaos Test 2's TRUNCATE. Day 8 first step should be Wave 1 re-run to repopulate these before Wave 2 CDC begins (otherwise shadow validator will continue to flag hospitals/users divergence).

3. **Pre-MCD-wipe snapshot identifier** was named with `pre-mcd-wipe-2026-04-21` per original spec. The user referenced "pre-dedup" in the checkpoint ask — same snapshot, only naming differs. Created at `2026-04-22T14:43:42Z` despite the `2026-04-21` date in the identifier.

4. **Open dependabot PRs** (20 from prior Day 7 checkpoint) still open. Not relevant to Aurora V2; triage separately post-Wave-2.

5. **No follow-up commits to `patientService.ts`** for the fhirPatientId pre-check. Tech debt #2's "Prevention" section is still open followup work. Not Day 8 blocker.

---

## 11. Recommendation

**GO.** Proceed directly to Day 8 Wave 2 execution.

Rationale:
- Zero drift since Day 7 close.
- Dedup persisted cleanly; no regression.
- All 10 Day 8 entrance criteria satisfied.
- Infrastructure healthy, no alarms, no pending mods, no surprise state.
- The expected auto-redeploy from Day 7 PR has settled (task def 93 is the known-good).

**Suggested Day 8 sequence (from Day 7 final report):**
1. Re-run Wave 1 full-load (`tailrd-migration-wave1`) to repopulate Aurora hospitals + users
2. Shadow validator single-run to verify Wave 1 parity
3. Wire EventBridge target with fresh credentials + enable the rule
4. Start Wave 2 full-load-and-cdc (`tailrd-migration-wave2`)
5. Monitor CDC lag + row-level validation metrics + rollback Lambda alarm posture

**Do not execute any of Day 8 without explicit authorization.** This report is the findings brief; implementation decisions belong to Jonathan.
