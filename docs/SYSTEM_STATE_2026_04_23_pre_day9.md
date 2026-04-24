# System state pre-Day 9 Wave 2 execution

**Generated:** 2026-04-23 (session start for Day 9)
**Purpose:** Phase 9-PRE findings + decision gate for production Wave 2 migration
**Target:** GO / FIX-THEN-GO / STOP recommendation

---

## 1. Phase 9-PRE-1 — Git state

| Check | Expected | Actual | Status |
|---|---|---|---|
| PR #173 merged | yes | yes | ✅ |
| PR #174 merged | yes | yes | ✅ |
| PR #175 merged | yes | yes | ✅ |
| PR #176 merged | yes | yes | ✅ |
| PR #177 merged (top of main) | yes | `8bba7d6` top | ✅ |
| Working tree clean on main | yes | up to date, only untracked system-state docs + phase-2d scripts | ✅ (benign) |
| Open PRs | dependabot only | 22 open, all `chore(deps)` / dependabot | ✅ |
| Last CI on main | success | TAILRD CI + Build&Deploy green on #177 | ✅ |
| Post-Deploy Smoke Test | success | **FAILED x2** at 22:00:58Z + 21:24:25Z, exit 22 on login curl | ⚠️ transient |

**Smoke test investigation:** Both failures clustered at ECS rollout boundaries (deploys from #176 and #177). Current backend `/health` returns `healthy`, uptime 1599s (started 21:56:59Z). Direct login endpoint test now returns HTTP 401 for invalid creds (endpoint alive, auth path working). Conclusion: transient 5xx window during ECS target-group drain/register, not a lingering production issue. Non-blocking for Wave 2 (DMS bypasses backend entirely).

---

## 2. Phase 9-PRE-2 — Wave 2 task config

| Check | Expected | Actual | Status |
|---|---|---|---|
| Task ARN | `...X4L644C5LNEN3PPYNNWDDLTB24` | match | ✅ |
| Status | ready | ready | ✅ |
| MigrationType | full-load-and-cdc | full-load-and-cdc | ✅ |
| Table mappings | patients + encounters | patients + encounters (rules 1 + 2, public schema, include) | ✅ |
| `TargetTablePrepMode` | DO_NOTHING | DO_NOTHING | ✅ (Day 8 fix holds) |
| `Logging.EnableLogging` | true | true | ✅ |
| `Logging.CloudWatchLogGroup` | dms-tasks-tailrd-dms-replication | match | ✅ |
| `Logging.CloudWatchLogStream` | dms-task-X4L644... | match | ✅ |
| `ValidationSettings.EnableValidation` | true | true | ✅ |
| `ValidationSettings.ValidationMode` | ROW_LEVEL | ROW_LEVEL | ✅ |
| `ErrorBehavior.FailOnNoTablesCaptured` | true | true | ✅ |
| ReplicationInstance | `...JGQBSRDUTNH3HO6PKL3BEESYS4` (tailrd-dms-replication) | match | ✅ |

**Note on RecoveryCheckpoint:** Task shows `checkpoint:V1#5#00000052/...`. Consistent with Day 8 Phase 2-C modify-task behavior — the task retained a checkpoint reference from the original Wave 2 Day 7 attempts. `start-replication` with `TargetTablePrepMode: DO_NOTHING` will begin fresh full-load regardless. Not a blocker.

---

## 3. Phase 9-PRE-3 — Endpoint verification

**Source `tailrd-rds-source`:**
- Status: active
- Server: `tailrd-production-postgres.csp0w6g8u5uq.us-east-1.rds.amazonaws.com`
- Database: tailrd, Port: 5432, SSL: require, User: tailrd_admin
- ExtraConnectionAttributes: **absent/null** (Day 8 Phase 2-C fix persisting — no `slotName=...`)
- Last test-connection: **successful**

**Target `tailrd-aurora-target`:**
- Status: active
- Server: `tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com` (writer endpoint)
- Database: tailrd, Port: 5432, SSL: require, User: tailrd_admin
- Last test-connection: **successful**

Both endpoints pointing at production resources. Both current connection-test results cached successful. ✅

---

## 4. Phase 9-PRE-4 — Database state (AWS-layer)

| Check | Expected | Actual | Status |
|---|---|---|---|
| Production RDS status | available | available | ✅ |
| Production RDS params | in-sync | in-sync | ✅ |
| Production RDS MultiAZ | true | true | ✅ |
| Production RDS engine | postgres 15.x | postgres 15.14 | ✅ |
| Aurora cluster status | available | available | ✅ |
| Aurora HttpEndpointEnabled | false | false | ✅ |
| Aurora cluster members | 3 (1 writer + 2 readers) | writer + 2 readers, all in-sync | ✅ |
| Rehearsal RDS lingering | none | none | ✅ |
| rds.logical_replication | on (1) | 1 | ✅ |
| max_replication_slots | 10 | 10 | ✅ |

**DB-layer (inside PostgreSQL) checks NOT EXECUTED in this pre-flight session:**

| Check | Source | Required for | Status |
|---|---|---|---|
| Production RDS patients count = 6,147 | pg via Fargate one-off | Sanity baseline | ⛔ not verified this session (Day 8 teardown: 6,147) |
| Production RDS encounters count = 353,512 | pg via Fargate one-off | Sanity baseline | ⛔ not verified this session (Day 8 teardown: 353,512) |
| Aurora `tailrd.patients` count = 0 | pg via Fargate one-off | DO_NOTHING precondition | ⛔ not verified this session (Day 8 teardown: 0) |
| Aurora `tailrd.encounters` count = 0 | pg via Fargate one-off | DO_NOTHING precondition | ⛔ not verified this session (Day 8 teardown: 0) |
| Aurora `pg_database` no rehearsal% | pg via Fargate one-off | Clean cluster | ⛔ not verified this session (Day 8 teardown: clean) |
| Production RDS `pg_replication_slots` = 0 | pg via Fargate one-off | No orphan slots | ⛔ not verified this session (Day 8 teardown: 0) |
| tailrd_admin ∈ rds_superuser | pg via Fargate one-off | Slot create permission | ⛔ not verified this session (inherited from Day 7 Phase 7B verification) |

Running the DB-layer check requires re-attaching inline policy `Phase2D-TempSecretsAccess` to `tailrd-production-ecs-task`, running a Fargate one-off (scripts already drafted at `infrastructure/scripts/phase-2d/verifyAuroraEmpty.js` from Day 8), then detaching the policy. ~15-20 min.

---

## 5. Phase 9-PRE-5 — Data integrity baseline

**NOT EXECUTED this session.** Baseline artifacts required for post-Wave-2 Gates 2 + 3:

| Artifact | Purpose | Status |
|---|---|---|
| md5 checksum of source RDS patients (ordered by id) | Gate 2 comparison | ⛔ not recorded |
| 10k random encounter ID sample, saved to S3 | Gate 3 target-side lookup | ⛔ not recorded |
| md5 checksum of source encounter sample rowset | Gate 3 comparison | ⛔ not recorded |

**This is a hard requirement.** Without these, Gates 2 and 3 cannot be validated post-full-load. The only source of truth on source-side data shape is captured RIGHT BEFORE Wave 2 starts (to rule out any drift during execution window).

Scripts to run this do NOT exist yet — need to extend `phase-2d/verifyAuroraEmpty.js` pattern to also do checksum + sample generation on source RDS. Estimate ~15 min to write + 5 min to execute via Fargate.

---

## 6. Phase 9-PRE-6 — Safety infrastructure

| Component | Check | Status |
|---|---|---|
| Rollback Lambda `tailrd-dms-rollback` | Active, LastUpdateStatus Successful | ✅ |
| Lambda env `DMS_TASK_ARN` | matches Wave 2 ARN | ✅ |
| Lambda env `REPLICATION_SLOT_NAME` | `dms_wave2_slot` (hint name; graceful fallback per Day 7 Phase 7D) | ✅ |
| Lambda env `TARGET_TRUNCATE_TABLES` | `patients,encounters` | ✅ |
| Lambda env `SNS_TOPIC_ARN`, `AURORA_WRITER_ENDPOINT`, `SOURCE_HOST`, secret ARNs | all correct | ✅ |
| SNS subscription `jhart@hartconnltd.com` | confirmed (ARN, not PendingConfirmation) | ✅ |
| CloudWatch alarms prefixed `Tailrd*` | 20 found, **all OK**, none ALARM | ✅ |
| Account-wide alarms in ALARM state | **0** | ✅ |
| IAM role `dms-cloudwatch-logs-role` | exists (created 2026-04-23T15:23:56Z) | ✅ |
| Log group `dms-tasks-tailrd-dms-replication` | exists, 30-day retention | ✅ |
| VPC endpoint `vpce-05ceeb6c12947c215` | available, Private DNS enabled, both DMS subnets attached | ✅ |
| ECS task role inline policies | 2 (`tailrd-production-ecs-task-permissions`, `TailrdMigrationCloudWatch`) — NO `Phase2D-TempSecretsAccess` | ✅ |
| Rehearsal secrets in Secrets Manager | none | ✅ |
| DMS tasks inventory | Wave 1 stopped, Wave 2 ready — only 2 tasks | ✅ |
| Rollback snapshot `tailrd-production-postgres-day8-rehearsal-3-2026-04-24` | available, 100 GiB, 2026-04-23T17:05:54Z | ✅ |

---

## 7. Phase 9-PRE-7 — Cost and billing

- MTD April 2026 cost: `-$0.0000031` (net negative — AWS credits offsetting charges; no anomaly)
- Last 4 days daily cost: all within $0.0000002 variance (flat, no spikes)
- Billing alarm `TailrdCost-MonthlyEstimatedCharges-Over50`: OK (missing datapoints treated as NonBreaching per §7 of Day 8 change record — account billing-alerts preference toggle still pending, known non-blocker)

✅

---

## 8. Phase 9-PRE-8 — Decision gate

### Summary

**Infrastructure-layer (AWS):** **CLEAN.** Every Day 8 closing-state invariant persists into Day 9: task config, endpoint config, IAM, networking, observability, rollback, alarms, snapshots, cost. Nothing regressed overnight.

**Database-layer (inside PostgreSQL):** **NOT RE-VERIFIED this session.** Day 8 post-teardown (<6h ago, 2026-04-23 late afternoon) confirmed Aurora empty, no orphan slots, tailrd_admin superuser. No writes or schema changes occurred between then and now that could invalidate those values. But the runbook explicitly calls for DB-layer verification at §4 of the pre-flight checklist.

**Data integrity baseline:** **NOT RECORDED.** Required for post-Wave-2 Gate 2 and Gate 3. This must happen before Wave 2 starts because once the task starts, source data may not be stable in the same moment as the baseline.

### Verdict: **FIX-THEN-GO**

Two specific gaps to close before starting Wave 2:

1. **DB-layer pre-flight (§4)** — confirm Aurora `patients` + `encounters` = 0, `pg_database` clean, RDS `pg_replication_slots` = 0, RDS counts = 6,147 / 353,512. Via Fargate one-off with temp IAM policy `Phase2D-TempSecretsAccess` reattached.

2. **Data integrity baseline (Phase 9-PRE-5)** — record md5 of source patients (ordered by id), generate 10k random encounter ID sample, save sample to `s3://tailrd-cardiovascular-datasets-863518424332/migration-artifacts/wave2-production/` along with source-side md5 of the sampled rowset.

Both can run in the same Fargate task invocation to minimize IAM churn (one attach → combined script → one detach).

### Recommended options for the operator

**A. Pragmatic (recommended):** Execute DB-layer pre-flight + data baseline in one combined Fargate one-off task right before Phase 9-A. Re-attach temp IAM policy, run combined script, detach. Baseline artifacts get written to S3. Then proceed to Phase 9-A. **~20-30 min added to execution window.**

**B. Strict runbook:** Run DB-layer pre-flight now as a separate step, then return to this decision gate for full GO, then run data baseline during Phase 9-A prep. Adds IAM churn (two attach/detach cycles). **~30-40 min.**

**C. Skip DB-layer verification:** Trust Day 8 post-teardown state (<6h old) + AWS-layer "nothing changed" posture. Still MUST record data integrity baseline because Gate 2 and Gate 3 depend on it. **~15 min for baseline only.** Not recommended — violates runbook; first real-data production migration deserves the extra 15 min of verification.

### STOP condition checklist

If any of these were true I would recommend STOP:
- ❌ Any PR #173-#177 missing from main — NOT true, all merged
- ❌ Wave 2 task status ≠ ready — NOT true, ready
- ❌ TargetTablePrepMode ≠ DO_NOTHING — NOT true, DO_NOTHING
- ❌ Any endpoint connection test failed — NOT true, both successful
- ❌ Any CloudWatch alarm in ALARM state — NOT true, 20/20 OK
- ❌ Rollback snapshot missing — NOT true, 100 GiB available
- ❌ Rollback Lambda env vars drifted — NOT true, all correct
- ❌ SNS subscription PendingConfirmation — NOT true, confirmed
- ❌ Rehearsal infrastructure lingering — NOT true, clean
- ❌ Production backend unhealthy — NOT true, uptime 26 min, /health 200, /login 401-on-invalid

None trigger STOP. The only reason this isn't an unqualified GO is the un-executed DB-layer pre-flight and un-recorded integrity baseline.

---

## 9. Combined pre-flight execution (Path A chosen 2026-04-23T22:47Z)

Jonathan authorized Path A. Executed combined pre-flight + baseline via single Fargate one-off task `6ad655f2c49c44b9bba878dbce70ec04` on task def `tailrd-backend:98`.

**Timeline:**
- 22:48Z — Policy `Phase2D-TempSecretsAccess` attached to `tailrd-production-ecs-task`
- 22:48Z — `ecs run-task` returned PROVISIONING
- 22:49:21Z — Task reached PENDING, then RUNNING
- 22:49:28.292Z — Script started on source RDS
- 22:49:28.967Z — Script wrote S3 artifacts and completed (script wall clock ~700 ms — extremely fast, 6k patient + 353k encounter table sizes are modest for md5/sort)
- 22:49:30Z — Task STOPPED with ExitCode 0
- 22:49:XX — Policy `Phase2D-TempSecretsAccess` detached; role verified back to 2 original inline policies

**Phase 9-PRE-4 (DB-layer) results:**

| Check | Expected | Actual | Status |
|---|---|---|---|
| Source RDS patients count | 6,147 | 6,147 | ✅ |
| Source RDS encounters count | 353,512 | 353,512 | ✅ |
| Source RDS `pg_replication_slots` count | 0 | 0 | ✅ |
| `tailrd_admin` ∈ rds_superuser | yes | yes (direct member) | ✅ |
| Aurora patients count | 0 | 0 | ✅ |
| Aurora encounters count | 0 | 0 | ✅ |
| Aurora hospitals count | 0 (informational) | 0 | — |
| Aurora users count | 0 (informational) | 0 | — |
| Aurora `pg_database` no `rehearsal%` / `tailrd_rehearsal%` | empty | empty | ✅ |

**Phase 9-PRE-5 (data integrity baseline) results:**

| Artifact | Value |
|---|---|
| Source patients md5 (ordered by id) | `021d42bbf952e12e492ff7daaa3e379b` |
| 10k random encounter sample size | 10,000 |
| Source encounter sample rowset checksum (md5 of `id\|patientId\|startDateTime\|encounterType` ordered by id) | `d71dc1e18a07ccd98d253561b7f0be36` |
| S3 timestamped artifact | `s3://tailrd-cardiovascular-datasets-863518424332/migration-artifacts/wave2-production/encounter-sample-2026-04-23T22-49-28-292Z.json` |
| S3 latest pointer | `s3://tailrd-cardiovascular-datasets-863518424332/migration-artifacts/wave2-production/encounter-sample-latest.json` |
| Artifact size | 280,280 bytes (273.7 KiB, each) |
| Artifact ETag | `1153e9c5af08788a420ee957ba6e5cc5` |

**Script verdict:** `GO` (all three gates: `source_rds_clean`, `aurora_empty`, `baseline_recorded`).

## 10. Final decision gate

All Phase 9-PRE gates have now been evaluated and passed:

- Phase 9-PRE-1 git state ✅
- Phase 9-PRE-2 DMS Wave 2 task config ✅
- Phase 9-PRE-3 endpoint verification ✅
- Phase 9-PRE-4 database state (AWS + DB layer) ✅
- Phase 9-PRE-5 data integrity baseline recorded ✅
- Phase 9-PRE-6 safety infrastructure ✅
- Phase 9-PRE-7 cost and billing ✅

Rollback posture confirmed:
- Lambda `tailrd-dms-rollback` armed with Wave 2 ARN + correct env vars
- SNS `tailrd-migration-alerts` with `jhart@hartconnltd.com` confirmed
- 20/20 CloudWatch alarms OK
- Snapshot `tailrd-production-postgres-day8-rehearsal-3-2026-04-24` available (100 GiB)
- Temporary IAM grant used during pre-flight now removed; role back to minimum set of 2 inline policies

### Verdict: **GO**

Ready to execute Phase 9-A. No remaining gaps. Awaiting final authorization from Jonathan to start the task.

Phase 9-A will:
1. Create `docs/CHANGE_RECORD_2026_04_23_wave2_production.md` (CR-2026-04-23-001)
2. Record T0 in the change record
3. `aws dms start-replication-task --replication-task-arn <Wave 2 ARN> --start-replication-task-type start-replication`  (NOT `reload-target`)
4. Confirm task enters `starting → running`

Then Phases 9-B through 9-G follow the runbook with gate discipline.
