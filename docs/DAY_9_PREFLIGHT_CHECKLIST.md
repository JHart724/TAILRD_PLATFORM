# Day 9 pre-flight checklist — Wave 2 production execution

One page, actionable. Do not start Wave 2 task until every box checks.

## 1. Context refresh (5 min)

- [ ] Read `docs/SYSTEM_STATE_2026_04_24_post_day8.md` §3 (readiness) + §6 (opening action)
- [ ] Read `docs/CHANGE_RECORD_2026_04_24_dms_config_fix.md` "Production Wave 2 updated runbook"
- [ ] `git fetch --all && git log origin/main -5 --oneline` — verify #176 is top of main (or newer docs-only merges above it)
- [ ] `git status` — working tree clean on main

## 2. Infrastructure state (AWS-layer verification, 5 min)

- [ ] `aws dms describe-replication-tasks` — Wave 1 stopped, Wave 2 **ready**, no others
- [ ] `aws dms describe-endpoints` — source Extra=null, target db=tailrd, both active
- [ ] `aws rds describe-db-instances` — no `rehearsal` in any identifier
- [ ] `aws rds describe-db-clusters` — Aurora available, `HttpEndpointEnabled: false`, 3 members
- [ ] `aws cloudwatch describe-alarms --alarm-name-prefix Tailrd` — 20/20 OK
- [ ] `aws cloudwatch describe-alarms --state-value ALARM` — empty list
- [ ] `aws iam list-role-policies --role-name tailrd-production-ecs-task` — 2 policies (no Phase2D-TempSecretsAccess)
- [ ] `aws secretsmanager list-secrets` — no `rehearsal` names
- [ ] VPC endpoint `vpce-05ceeb6c12947c215` available with Private DNS enabled
- [ ] `dms-cloudwatch-logs-role` present, `dms-tasks-tailrd-dms-replication` log group present

## 3. Wave 2 task config final verification (2 min)

```bash
PROD_WAVE2=arn:aws:dms:us-east-1:863518424332:task:X4L644C5LNEN3PPYNNWDDLTB24
aws dms describe-replication-tasks \
  --filters Name=replication-task-arn,Values=$PROD_WAVE2 \
  --query 'ReplicationTasks[0].{Status:Status,MigrationType:MigrationType}' \
  --output json
```

Must show: `Status: ready`, `MigrationType: full-load-and-cdc`.

Settings validation:

- [ ] `FullLoadSettings.TargetTablePrepMode = DO_NOTHING` (the fix from Day 8)
- [ ] `Logging.EnableLogging = true`
- [ ] `Logging.CloudWatchLogGroup = dms-tasks-tailrd-dms-replication`
- [ ] `ValidationSettings.EnableValidation = true`, `ValidationMode = ROW_LEVEL`
- [ ] `ErrorBehavior.FailOnNoTablesCaptured = true`

## 4. DB-level pre-flight (requires psql/Fargate one-off, 10 min)

Re-attach temp IAM policy `Phase2D-TempSecretsAccess` to `tailrd-production-ecs-task` if running via Fargate one-off. Remove at end.

- [ ] Aurora `tailrd.patients` count = **0**
- [ ] Aurora `tailrd.encounters` count = **0**
- [ ] Aurora `pg_database` list has **no** `rehearsal%` entries
- [ ] Production RDS `pg_replication_slots` count = **0** (no orphans from Day 7/8 rehearsals)
- [ ] Production RDS `tailrd_admin` is member of `rds_superuser` (via `SELECT rolname FROM pg_auth_members JOIN pg_roles r ON roleid=r.oid JOIN pg_roles u ON member=u.oid WHERE u.rolname='tailrd_admin';`)

If any fail, **DO NOT START Wave 2**. Stop and investigate.

## 5. Operator readiness (2 min)

- [ ] 4-7 hour monitoring window cleared — no MCD demo, no team meeting, no interruptions
- [ ] Fresh Claude Code session with clear context
- [ ] Terminal stable, network reliable
- [ ] Snapshot `tailrd-production-postgres-day8-rehearsal-3-2026-04-24` confirmed available (ultimate rollback)

## 6. Execution (record in `docs/CHANGE_RECORD_2026_04_24_wave2_production.md`)

```bash
T0=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "Wave 2 production T0: $T0"

aws dms start-replication-task \
  --replication-task-arn arn:aws:dms:us-east-1:863518424332:task:X4L644C5LNEN3PPYNNWDDLTB24 \
  --start-replication-task-type start-replication
```

**NOT `reload-target`** — that always TRUNCATEs and the FK graph will fail it.

## 7. Monitoring (every 30 s for first 5 min, then every 2 min)

- Task state transitions: `ready → starting → running`
- `aws dms describe-table-statistics --replication-task-arn $PROD_WAVE2` → patients + encounters progress
- Tail `dms-tasks-tailrd-dms-replication` log group
- RDS + Aurora CPU / ACU metrics
- SOURCE_CAPTURE WAL fetch rate (should start ticking once full-load finishes and CDC begins)

Expected timings (from rehearsal actuals):
- Patients full-load (6,147 rows): ~30 sec to 5 min
- Encounters full-load (353,512 rows): 10-45 min
- Full-load → CDC transition: automatic, within 60 s

## 8. Validation gates (post-full-load)

Each must pass. Any fail → stop, document, diagnose.

- [ ] **Gate 1:** Row counts match — source RDS `SELECT count(*) FROM patients/encounters` = target Aurora `SELECT count(*) FROM patients/encounters`
- [ ] **Gate 2:** Full patient checksum — `SELECT md5(string_agg(id::text, ',' ORDER BY id)) FROM patients` on both sides matches
- [ ] **Gate 3:** 10k encounter sample checksum — pick same 10k IDs, md5 rowset on both sides matches
- [ ] **Gate 4:** FK integrity on Aurora — `SELECT count(*) FROM encounters e LEFT JOIN patients p ON e.patientId = p.id WHERE p.id IS NULL` = 0
- [ ] **Gate 5:** DMS validation report — `describe-replication-task-assessment-results` → `ValidationState: Validated`, `ValidationSuspendedRecords: 0`
- [ ] **Gate 6:** CDC slot active — `SELECT slot_name, plugin, slot_type, active FROM pg_replication_slots` on source RDS shows one DMS-managed slot, active=true, slot_type=logical

## 9. CDC live test (5 min)

On source RDS:
```sql
UPDATE patients SET updatedAt = NOW() WHERE id = (SELECT id FROM patients LIMIT 1);
```

On Aurora (within 60 s):
```sql
SELECT id, updatedAt FROM patients ORDER BY updatedAt DESC LIMIT 1;
```

Verify UPDATE propagated. Then repeat with an INSERT of a marked-test row and a DELETE.

## 10. 15-minute CDC observation

- [ ] `CDCLatencySource` stays < 30 s
- [ ] `CDCLatencyTarget` stays < 30 s
- [ ] Zero errors in `dms-tasks-tailrd-dms-replication`
- [ ] No CloudWatch alarm state changes

## 11. Abort / rollback

| Trigger | Action |
|---|---|
| Task fails to reach `running` within 2 min | Check log group immediately. Diagnose. Stop. |
| Full-load exceeds 60 min | Stop. Investigate RDS IOPS / Aurora ACU throttling. |
| Any Gate 1-5 fails | Stop DMS task. Target tables are empty OR can be dropped-FK / truncated / re-added to reset. |
| Any Gate 6 fail / CDC doesn't activate within 5 min | Stop DMS task. Root cause. |
| CDC lag spikes > 5 min sustained | Stop or throttle, diagnose |

Ultimate rollback (production RDS corruption, theoretical): restore from `tailrd-production-postgres-day8-rehearsal-3-2026-04-24` snapshot.

## 12. Post-execution

- [ ] Document actual timings vs rehearsal predictions in change record
- [ ] Update `docs/DMS_MIGRATION_LOG.md` with Day 9 Wave 2 completion entry
- [ ] If Lambda rollback was invoked for any reason, document why + outcome
- [ ] If temp IAM policy was re-attached for DB-level pre-flight, verify removal before closing change record
- [ ] Commit change record. PR. Merge.
- [ ] Enable `tailrd-shadow-validator-schedule` EventBridge rule (Day 8 original plan, Phase 8B)

## 13. Known caveats

- `REPLICATION_SLOT_NAME` in Lambda env = `dms_wave2_slot` (hint name). Actual DMS-managed slot will have a different auto-generated name. Lambda handles "slot not found" gracefully per Day 7 Phase 7D smoke test.
- Do NOT use `reload-target`. It truncates unconditionally and will hit the FK issue even with `DO_NOTHING` in settings.
- Wave 1 re-run to populate Aurora `hospitals` + `users` may or may not be desired before Wave 2. Wave 2 only replicates `patients` + `encounters`; if shadow validator is later enabled and flags hospitals/users empty, that is expected until Wave 1 re-runs. Not blocking.
