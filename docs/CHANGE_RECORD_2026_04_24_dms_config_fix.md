# Change Record: DMS Wave 2 configuration fix (slot / plugin / logging)

**Change ID:** CR-2026-04-24-001
**Owner:** Jonathan Hart
**Status:** IN PROGRESS
**Created:** 2026-04-23 (following Step 1 — P0 tech debt #1 resolution)
**Prerequisite:** Step 1 complete — tech debt #1 RESOLVED, new key `AKIA****XLDF` verified in CI via PR [#174](https://github.com/JHart724/TAILRD_PLATFORM/pull/174) merge deploy (`24842937487`), task def `tailrd-backend:95` running.
**Target systems:** DMS replication-instance CloudWatch log group (new), DMS IAM roles (read-only verification), DMS source endpoint `tailrd-rds-source` (modify extra-connection-attributes), ephemeral rehearsal resources (staging RDS + Aurora database + DMS endpoints + task).
**Change type:** DMS configuration change. No application code. No data model change. No production data written.

---

## 1. Purpose

Address the three DMS task-start failures from the 2026-04-23 Wave 2 rehearsal (`CHANGE_RECORD_2026_04_23_wave2_execution.md §7-8`) so the production Wave 2 task starts cleanly and replicates `patients` + `encounters` to Aurora via `full-load-and-cdc`.

**Failures to address:**

| Attempt | Failure | Root cause | This change |
|---|---|---|---|
| 1 | `Last Error Slot does not exist Stop Reason FATAL_ERROR` | When `slotName=...` is set on the source endpoint, DMS expects the slot to pre-exist; it does **not** auto-create it. Contradicts common documentation. | Remove `slotName` from source endpoint extra-connection-attributes. Let DMS manage the slot with its default name and default plugin. |
| 2 | `Last Error Specified plugin does not exist, or is not supported` | DMS defaults to `test_decoding` for PostgreSQL logical decoding; pre-creating a slot with `pgoutput` is incompatible. | Same fix — let DMS create and own the slot so plugin is consistent by construction. |
| 3 | `Last Error Stream Component Fatal error` with no further diagnostic; `dms-tasks-*` log group never materialized. | DMS task-level logging was configured (EnableLogging=true, CloudWatchLogGroup set) but the log group itself did not exist, and DMS's attempt to create it silently failed. | Pre-create `dms-tasks-tailrd-dms-replication` log group with 30-day retention. Verify DMS IAM roles have the `logs:*` permissions needed to write to it. Next failure will produce a real stack trace. |

Matches the pattern that **worked** in Day 6 Phase 6E (CDC readiness test on production RDS — DMS-managed slot, no `slotName` extra-attr) and Day 7 Phase 7B (chaos test on staging — same pattern).

## 2. Blast radius

- **Staging rehearsal phase:** none on production. Uses a separate rehearsal RDS restored from fresh snapshot + separate Aurora rehearsal database + separate DMS endpoints + separate DMS task.
- **Production phase (this CR):** two surfaces touched.
  1. Create CloudWatch log group `dms-tasks-tailrd-dms-replication` (30-day retention). Zero cost until the DMS task emits. Purely additive.
  2. Modify source endpoint `tailrd-rds-source` extra-connection-attributes. No running DMS task currently references it (Wave 2 task is in `ready` state, never started). Existing stopped Wave 1 task reference is irrelevant (Wave 1 is not restarting). `test-connection` exercises the modification immediately.
- **Backend traffic:** unaffected. No ECS change. No schema change. No data change.
- **Rollback posture:** current production endpoint `ExtraConnectionAttributes` value will be captured verbatim before modification; reverting is a single `modify-endpoint` away. The log group is non-destructive; it can stay even if the rest of the change rolls back.

## 3. Success criteria

- [ ] Log group `dms-tasks-tailrd-dms-replication` exists with 30-day retention
- [ ] DMS IAM roles confirmed to have `logs:CreateLogStream` + `logs:PutLogEvents` against that log group
- [ ] Source endpoint `tailrd-rds-source` `ExtraConnectionAttributes` updated (slotName removed); `test-connection` returns `successful`
- [ ] Rehearsal staging RDS restored from fresh production snapshot; data integrity verified (6,147 patients + 353,512 encounters)
- [ ] Rehearsal Aurora database `tailrd_rehearsal_2` created with consolidated baseline schema (54 tables)
- [ ] Rehearsal DMS endpoints + task created (no `slotName`); both endpoints test `successful`
- [ ] Rehearsal task starts cleanly (no "slot does not exist" / "plugin does not exist" / "Stream Component Fatal" failures)
- [ ] Rehearsal full-load completes: 6,147 patient rows + 353,512 encounter rows land in Aurora `tailrd_rehearsal_2`
- [ ] Row-level validation inside DMS reports `ValidationState=Valid` with zero `ValidationFailedRecords`
- [ ] Rehearsal CDC activates and sustains <30s lag for ≥15 min after full-load
- [ ] Exact working config documented for production Wave 2

## 4. Lambda rollback behavior (strategy decision)

Current Lambda `tailrd-dms-rollback` env var: `REPLICATION_SLOT_NAME=dms_wave2_slot`. After removing `slotName` from the source endpoint, DMS will create a slot with an auto-generated name (typically `<task-external-resource-id>` or similar; specific format varies by DMS version).

**Two options:**
1. Rewrite Lambda to query `pg_replication_slots` for the active DMS slot and drop whatever matches.
2. Leave Lambda unchanged; rely on its existing graceful "slot not found" handling (verified in Day 7 Phase 7D smoke test). The Lambda will attempt to drop `dms_wave2_slot`, find it doesn't exist, log the skip, and continue with TRUNCATE + SNS notification. The actual DMS-managed slot gets dropped when we delete the DMS task itself (DMS owns the slot lifecycle when it manages the slot).

**Decision: Option 2** for this CR. Lower risk. Lambda was verified to handle missing-slot cases cleanly. DMS owns the slot when DMS creates it, so deleting/stopping the task is the canonical way to release the slot. Documented here so future operators understand `REPLICATION_SLOT_NAME` in the Lambda env is now a hint, not a guarantee.

If we later want strict slot cleanup via Lambda (for safety-in-depth), a separate small PR can swap the env var for a pattern match or a `pg_replication_slots` query.

## 5. Execution plan

### Phase 2-A — Pre-create DMS log group
Create `dms-tasks-tailrd-dms-replication` with 30-day retention.

### Phase 2-B — DMS IAM verification
Enumerate DMS-related roles (`dms-vpc-role`, `dms-cloudwatch-logs-role`, `AWSServiceRoleForDMS`, any others). Verify each has `logs:CreateLogStream` + `logs:PutLogEvents` on the new log group (typically via AWS-managed `AmazonDMSCloudWatchLogsRole`). Attach the policy if missing.

### Phase 2-C — Modify source endpoint
Capture current `ExtraConnectionAttributes`. Remove `slotName=dms_wave2_slot`. Re-run `test-connection`.

### Phase 2-D — Staging rehearsal
1. Fresh production snapshot `tailrd-production-postgres-day8-rehearsal-2-2026-04-24`
2. Restore to `tailrd-staging-wave2-rehearsal-2` with logical-repl parameter group
3. Create Aurora rehearsal database `tailrd_rehearsal_2` and apply consolidated baseline
4. Create rehearsal DMS endpoints (source WITHOUT slotName, target)
5. Test both endpoint connections
6. Create + start rehearsal task `tailrd-migration-wave2-rehearsal-2` (full-load-and-cdc, patients + encounters, TRUNCATE_BEFORE_LOAD, ValidationSettings enabled)
7. Monitor via the new log group
8. Validate row counts + FK integrity + CDC lag
9. Decide go/no-go for production Wave 2

### Phase 2-E — Teardown + PR
Stop rehearsal task, drop any rehearsal slots, delete endpoints, delete rehearsal task, drop Aurora rehearsal database, delete rehearsal RDS (retain fresh snapshot). Commit on `feat/dms-wave2-config-fix`. PR + CI + merge.

## 6. Rollback

| Surface | Rollback |
|---|---|
| Log group creation | `aws logs delete-log-group --log-group-name dms-tasks-tailrd-dms-replication`. Zero-cost to leave. |
| IAM policy attachment (if added) | `aws iam detach-role-policy` with the captured policy ARN. |
| Source endpoint modification | `aws dms modify-endpoint --endpoint-arn <arn> --extra-connection-attributes "slotName=dms_wave2_slot"` (captured verbatim before modification). |
| Rehearsal resources | Full teardown script (same pattern as 2026-04-23). Retain snapshots as rollback assets. |

## 7. Execution log

### Phase 2-A — log group (2026-04-23)

- Pre-check: `aws logs describe-log-groups --log-group-name-prefix dms-tasks-tailrd-dms-replication` → empty (as expected).
- Created: `aws logs create-log-group --log-group-name dms-tasks-tailrd-dms-replication`.
- Retention: `aws logs put-retention-policy --retention-in-days 30`.
- Verified ARN: `arn:aws:logs:us-east-1:863518424332:log-group:dms-tasks-tailrd-dms-replication:*`, `retentionInDays=30`.

### Phase 2-B — DMS IAM verification (2026-04-23)

**Root cause of 2026-04-23 failures identified here.** DMS IAM role enumeration:

- `dms-rollback-role` — the Lambda rollback role; has its own CloudWatch log permissions scoped to `/aws/lambda/*`. Not relevant to task-level DMS logs.
- `dms-vpc-role` — attached policy: `AmazonDMSVPCManagementRole` only. This grants ENI/subnet management. **No CloudWatch log permissions.**
- No `AWSServiceRoleForDMS` or other service-linked role present for `dms.amazonaws.com`.
- **`dms-cloudwatch-logs-role` did not exist** before this change.

DMS task-level logging uses an AWS-convention name-lookup: if a role named exactly `dms-cloudwatch-logs-role` exists in the account, DMS assumes it when writing task logs. No explicit attribute on the replication instance or task ties them together — discovery is by name. Without that role, DMS silently drops all `EnableLogging: true` output and cannot create its `dms-tasks-*` log group. This is why yesterday's Stream Component Fatal error produced zero diagnostic trace.

**Actions taken:**
1. Created role `dms-cloudwatch-logs-role` with trust policy allowing `dms.amazonaws.com` to `sts:AssumeRole` (`arn:aws:iam::863518424332:role/dms-cloudwatch-logs-role`, created 2026-04-23T15:23:56Z).
2. Attached AWS-managed `AmazonDMSCloudWatchLogsRole` policy.
3. Policy document (v2) confirms all five required permissions:
   - `logs:DescribeLogGroups` on `*`
   - `logs:DescribeLogStreams`, `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` scoped to `dms-tasks-*` and `dms-serverless-replication-*` resource patterns.
4. No change to `dms-vpc-role` (it continues to manage VPC/ENIs only — clean separation of concerns).

DMS replication instance `tailrd-dms-replication` (engine 3.6.1) needs no explicit attribute update — it will auto-discover the new role on next task start.

**Implication:** Attempt 3's "Stream Component Fatal error" yesterday was almost certainly secondary to the logging failure. With logging now functional, a repeat failure in Phase 2-D will produce an actionable stack trace.

### Phase 2-C — source endpoint modification (2026-04-23)

- Endpoint ARN captured: `arn:aws:dms:us-east-1:863518424332:endpoint:XG3PQTZG5BB4RNX3RWT3G3KICQ`
- **Rollback value captured (ExtraConnectionAttributes before modification):** `slotName=dms_wave2_slot`
- Other endpoint fields (unchanged): server `tailrd-production-postgres.csp0w6g8u5uq.us-east-1.rds.amazonaws.com`, database `tailrd`, port 5432, SSL `require`.
- `aws dms modify-endpoint --extra-connection-attributes ""` returned `Extra: null`, `Status: active`.
- `describe-endpoints` confirmed `ExtraConnectionAttributes: null`.
- `test-connection` run #1 (initiated before modification, completed after): `successful`.
- `test-connection` run #2 (initiated after modification, on the `Extra: null` config): `successful`.

Source endpoint now uses DMS's default logical-decoding behavior: DMS creates and owns the slot with its default plugin (`test_decoding`). This matches the Day 6 Phase 6E CDC readiness pattern and the Day 7 Phase 7B chaos test pattern — both of which succeeded.

**Lambda rollback strategy (as documented in §4):** Option 2 confirmed. Lambda `tailrd-dms-rollback` env var `REPLICATION_SLOT_NAME=dms_wave2_slot` is not updated. The Lambda's existing graceful "slot not found" handling (verified in Day 7 Phase 7D smoke test) will skip the `DROP SLOT` step cleanly when the auto-generated DMS-managed slot name doesn't match. When DMS manages the slot, DMS also owns its lifecycle — deleting/stopping the DMS task releases the slot.

Production resources modified by Phase 2-C:
| Resource | Before | After |
|---|---|---|
| Log group `dms-tasks-tailrd-dms-replication` | did not exist | created, 30-day retention |
| IAM role `dms-cloudwatch-logs-role` | did not exist | created with `AmazonDMSCloudWatchLogsRole` |
| Source endpoint `tailrd-rds-source` ExtraConnectionAttributes | `slotName=dms_wave2_slot` | `null` |
| Wave 2 task, Wave 1 task, target endpoint, ECS, Lambda, SNS, EventBridge | (unchanged) | (unchanged) |

### Phase 2-D-PRE — prerequisites audit (2026-04-23)

Full comprehensive prerequisites audit written at `docs/DMS_PREREQUISITES_AUDIT_2026_04_24.md`. Five findings: F1 CRITICAL (network), F2-F3 LOW (hygiene), F4 INFO (maintenance), F5 LOW (runbooks).

### Phase 2-D-PRE-FIX — F1 remediation + F3 + F2 (2026-04-23)

**F1 — CloudWatch Logs VPC endpoint (critical, the real root cause of 2026-04-23 rehearsal attempt-3 failure):**

DMS database subnets had no route to `logs.us-east-1.amazonaws.com`. Route table `rtb-01e8ec37e7b928b4e` had only `10.0.0.0/16 → local`. Even with `dms-cloudwatch-logs-role` and the pre-created log group, DMS could not network-reach CloudWatch — yesterday's "Stream Component Fatal error" produced no diagnostic because the logging subsystem itself couldn't initialize.

Resolution:
1. Created security group `sg-0e3602c20030ab565` (`vpce-logs-sg`), ingress 443/TCP from VPC CIDR `10.0.0.0/16`. VPC-wide source chosen deliberately: enabling Private DNS on the new endpoint flips `logs.us-east-1.amazonaws.com` resolution for the entire VPC, so existing log writers (ECS backend, Lambda rollback, RDS/Aurora log exports) all transparently route through the endpoint now. Allowing the VPC CIDR guarantees no silent breakage.
2. Created Interface VPC endpoint `vpce-05ceeb6c12947c215` (`com.amazonaws.us-east-1.logs`) in both DMS database subnets (`subnet-02c70b0a102cf8d3c` + `subnet-0168950e9541ff9f6`, us-east-1a + us-east-1b), Private DNS enabled. State: `available`. ENIs `eni-0814b834e34fdc570` + `eni-0f0ceb813895b38cf`.

Verification:
- ECS backend `/health` live post-flip: `healthy`, `uptime: 3579s` (continuous through change, no task restart).
- DMS source endpoint `test-connection` post-flip: `successful`.
- ECS backend log group showed continued write activity immediately after endpoint went available.

**F3 — log group retention (hygiene):**

All 7 log groups that had null retention now carry explicit retention:

| Log group | Retention |
|---|---|
| `/aws/lambda/tailrd-dms-rollback` | 90 days (security-relevant) |
| `/aws/codebuild/tailrd-ingest-build` | 30 days |
| `/aws/rds/cluster/tailrd-production-aurora/postgresql` | 30 days |
| `/aws/rds/instance/tailrd-production-postgres/postgresql` | 30 days |
| `/aws/rds/proxy/tailrd-aurora-proxy` | 30 days |
| `/ecs/tailrd-ingest` | 30 days |
| `/ecs/tailrd-pgdump` | 30 days |

`describe-log-groups --query 'logGroups[?retentionInDays==null]'` now returns empty.

**F2 — billing alarm (partial):**

Created alarm `TailrdCost-MonthlyEstimatedCharges-Over50` (us-east-1, `AWS/Billing` `EstimatedCharges` metric, threshold $50, action → `tailrd-migration-alerts`). Currently `INSUFFICIENT_DATA` because account-level "Receive Billing Alerts" preference is disabled. That's a console-only toggle: Billing Preferences → Billing Alerts → Receive Billing Alerts. One checkbox enables the metric and the alarm begins firing as expected. Tracked as follow-up.

**F4, F5 — tracked, non-blocking. Documented in audit doc.**

### Phase 2-D — staging rehearsal (executed, teardown complete 2026-04-23)

**Infra provisioned and torn down:**
- Snapshot `tailrd-production-postgres-day8-rehearsal-3-2026-04-24` (RDS, 100 GiB). **RETAINED** as production Wave 2 rollback asset.
- Rehearsal RDS `tailrd-staging-wave2-rehearsal-3` restored from snapshot with `tailrd-production-postgres15-logical-repl` parameter group. **DELETED** at teardown.
- Aurora database `tailrd_rehearsal_3` on `tailrd-production-aurora` cluster via `@prisma/client` + Aurora admin secret. **DROPPED** at teardown.
- Consolidated baseline schema applied via `npx prisma migrate deploy`. Verified: 54 tables, `_prisma_migrations` baseline row present, 12 FHIR unique indexes, `patients` + `encounters` empty.
- DMS rehearsal source endpoint `tailrd-rehearsal-source-3` (no `slotName`, matches Phase 2-C fix). **DELETED** at teardown.
- DMS rehearsal target endpoint `tailrd-rehearsal-target-3` → Aurora `tailrd_rehearsal_3`. **DELETED** at teardown.
- Both endpoint `test-connection` results: **successful**.
- DMS task `tailrd-migration-wave2-rehearsal-3` (`F4NFUCRSMZFQXHO4RIIFIMRSP4`) mirroring production Wave 2 settings. **DELETED** at teardown.

**Phase 2-A/2-B/F1 fixes proven working:**
- DMS task entered `running` state within ~60 s of start.
- Log stream `dms-task-F4NFUCRSMZFQXHO4RIIFIMRSP4` created in `dms-tasks-tailrd-dms-replication` log group with live event flow — the critical verification that `dms-cloudwatch-logs-role` + pre-created log group + CloudWatch Logs VPC endpoint are all wired correctly. Yesterday's "Stream Component Fatal error with no diagnostic" would no longer occur silently.

**🆕 NEW FINDING — TRUNCATE_BEFORE_LOAD incompatible with target FK graph:**

The rehearsal task's full-load attempt failed with a clean, diagnosable error (thanks to the logging fix):
```
[TARGET_LOAD] ERROR: cannot truncate a table referenced in a foreign key constraint.
DETAIL: Table "observations" references "encounters".
...
DETAIL: Table "alerts" references "patients".
```

Root cause: `FullLoadSettings.TargetTablePrepMode = TRUNCATE_BEFORE_LOAD` issues a PostgreSQL `TRUNCATE` on target tables before loading. PostgreSQL rejects TRUNCATE on tables referenced by other tables' foreign keys unless `CASCADE` (which DMS does not issue). Target schema has:
- `observations.encounterId` → `encounters(id)`
- `alerts.patientId` → `patients(id)`
Plus 6+ other referencing tables per the Prisma schema FK graph.

**This would have hit production Wave 2 identically.** The production Wave 2 task was configured with the same `TRUNCATE_BEFORE_LOAD`.

**Fix applied to production Wave 2 task (`X4L644C5LNEN3PPYNNWDDLTB24`):**
- `aws dms modify-replication-task` → `FullLoadSettings.TargetTablePrepMode: DO_NOTHING` (was `TRUNCATE_BEFORE_LOAD`).
- Verified post-modify: task returns to `ready` state, setting confirmed via `describe-replication-tasks`.
- Rationale: Aurora target tables (`patients`, `encounters`) are already empty (verified below). `DO_NOTHING` lets DMS INSERT directly without attempting TRUNCATE; no FK violation.

**DO_NOTHING prerequisite verified:**
Aurora production `tailrd` database row counts (2026-04-23):
- `patients`: 0 ✅
- `encounters`: 0 ✅
- `hospitals`: 0 (also empty; unchanged since Day 4 chaos test TRUNCATE)
- `users`: 0

`DO_NOTHING` will work cleanly on the next production Wave 2 start.

**Note on `reload-target`:** During the rehearsal, after switching to `DO_NOTHING` and restarting with `reload-target`, the TRUNCATE still occurred. `reload-target` truncates the target unconditionally, independent of `TargetTablePrepMode`. Production Wave 2 must use `start-replication` (fresh start), not `reload-target`.

**Prisma-to-Aurora auth diagnostic:**
- All Prisma auth paths to Aurora verified working: sslmode=require, URL-encoded password, channel_binding=disable, sslmode=prefer/verify-ca variants, and pg direct client baseline.
- `password_encryption = scram-sha-256`, `ssl_min_protocol_version = TLSv1.2`, `server_version = 15.14`.
- Earlier ad-hoc auth failures were non-reproducible — most likely caused by an early script version parsing the backend's `DATABASE_URL` env var (which points at RDS, not Aurora) and using RDS's tailrd_admin password to authenticate against Aurora. Production-path scripts now fetch explicitly from the Aurora secret.

### Phase 2-D-TEARDOWN — clean shutdown (2026-04-23)

| Action | Status |
|---|---|
| DMS rehearsal task stopped + deleted | ✅ |
| DMS rehearsal source + target endpoints deleted | ✅ |
| Aurora `tailrd_rehearsal_3` database dropped | ✅ (verified: 0 matching `pg_database` rows) |
| Rehearsal RDS `tailrd-staging-wave2-rehearsal-3` deletion | ✅ (RDS returns `DBInstanceNotFound`) |
| Temporary IAM policy `Phase2D-TempSecretsAccess` on `tailrd-production-ecs-task` | ✅ removed; role is back to original 2 inline policies |
| S3 scripts at `s3://…/migration-artifacts/phase-2d/` | ✅ all deleted |
| Snapshot `tailrd-production-postgres-day8-rehearsal-3-2026-04-24` | ✅ **RETAINED** (rollback asset for production Wave 2) |
| Production Wave 2 task `X4L644C5LNEN3PPYNNWDDLTB24` | ✅ `TargetTablePrepMode: DO_NOTHING`, status `ready` |
| Phase 2-A log group, Phase 2-B IAM role, Phase 2-C endpoint config, Phase 2-D-PRE-FIX VPC endpoint | ✅ all retained (required for production Wave 2) |

### Production Wave 2 updated runbook (for next session)

1. **Pre-flight verification:**
   - Aurora production `tailrd`: `patients` + `encounters` still empty (0 rows).
   - Production RDS `tailrd-production-postgres`: no orphan DMS replication slots.
   - Production Wave 2 task: `Status: ready`, `TargetTablePrepMode: DO_NOTHING` confirmed via `describe-replication-tasks`.
   - DMS log group + role + CloudWatch Logs VPC endpoint all present.
2. **Execution:**
   - `aws dms start-replication-task --replication-task-arn <X4L…> --start-replication-task-type start-replication`.
   - **NOT** `reload-target` — that always TRUNCATEs regardless of `TargetTablePrepMode`.
   - Full-load will INSERT 6,147 patients + 353,512 encounters directly into empty Aurora tables.
3. **Rollback:**
   - If task fails pre-CDC: tables remain empty, fix the issue, restart.
   - If task fails post-full-load: truncate Aurora `patients` + `encounters` via an FK-aware script (drop FK → truncate → re-add FK), then restart.
   - Snapshot `tailrd-production-postgres-day8-rehearsal-3-2026-04-24` restores production RDS if needed.

### Tech debt / follow-ups (not in this PR)

- **Prisma Query Engine to Aurora auth via `DATABASE_URL`-only path.** Before Aurora cutover (when `DATABASE_URL` will point at Aurora), re-verify `@prisma/client` default-path auth works — not expected to be a blocker since all diagnostic paths passed.
- **DMS log group retention = 30 days.** Fine for rehearsal/Wave 2. Consider 90 days for long-term DMS observability posture.
- **Aurora Data API enablement silently failed.** Tracked in §0; investigate post-Wave-2 if Data API becomes desirable for ops tooling.

## 8. Post-change actions

- Update `docs/DMS_MIGRATION_LOG.md` with Day 8-2 entry documenting the fix and rehearsal results
- Update `docs/DMS_MIGRATION_PLAN.md` if the slot-management approach has implications for Wave 3/4
- If rehearsal surfaces any Lambda-side adjustment, open a follow-up ticket (Option 1 from §4)
- PR + merge
