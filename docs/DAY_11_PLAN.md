# Day 11 Plan - RDS Decommission

**Date:** 2026-04-30 (Thursday, 24h after Day 10 cutover)
**Companion runbook:** `docs/DAY_11_THURSDAY_RUNBOOK.md`
**Reference:** `docs/ARCHITECTURE_V2_MIGRATION.md` Day 10 (decom spec) - moved to Thursday because the cutover itself is now Day 10 (Wednesday).

---

## 1. Objective

Cleanly decommission `tailrd-production-postgres` (RDS PostgreSQL 15.14, db.t3.medium) and its associated DMS migration infrastructure, after the 24h post-cutover soak window confirms Aurora is stable. Final RDS snapshot retained for HIPAA audit. AWS bill reflects RDS removal.

This is the irreversible step in the migration. After RDS is deleted, rollback requires snapshot restore (~30-45 min downtime). Execute only after high confidence.

---

## 2. Current state (entering Day 11)

| Component | State |
|---|---|
| `tailrd-production-postgres` | available, db.t3.medium, PG 15.14, deletion-protected. Last 24h: 0 production traffic (writes flipped to Aurora 24h ago). |
| `tailrd-production-aurora` | available, serving 100% production traffic since Day 10 cutover. |
| DMS task `YFGGBH5LXRHDBHYD76DVX5MQRA` | stopped (since Day 10 cutover). |
| DMS replication instance `JGQBSRDUTNH3HO6PKL3BEESYS4` (tailrd-dms-replication) | available, dms.t3.medium, idle. |
| DMS endpoints | tailrd-rds-source (postgres), tailrd-aurora-target (aurora-postgresql). |
| Replication slot on RDS | still present (DMS was stopped, not deleted; slot needs explicit drop). |
| Soak monitor (24h) | SOAK_OK expected (0 sustained failures across 76 invocations). |
| Lambda rollback function | armed during migration; references DMS task. |
| Migration IAM roles | dms-cloudwatch-logs-role, dms-rollback-role, dms-vpc-role. |
| CDC slot on RDS | still allocated (will be dropped during decom). |

---

## 3. Pre-flight investigation

Run BEFORE starting decommission. Failure of any one is a hard STOP.

### 3.1 Soak monitor verdict
- `tail /tmp/soak-monitor-*.log` shows `SOAK_OK: 0 failures across 76 invocations`
- OR (if monitor exited on schedule): exit code 0 from the launcher process

### 3.2 Production stability
- 24-hour `/health` healthy continuously
- 24-hour error rate within tolerance (< 2x baseline)
- No active alerts or pages

### 3.3 No traffic on RDS
- CloudWatch `AWS/RDS.DatabaseConnections` for `tailrd-production-postgres` over the last 24h: max == 0 (or only the soak-monitor's parity-check connections, which are read-only and brief)
- No application reads or writes against RDS endpoint

### 3.4 Aurora taking 100% traffic
- CloudWatch `AWS/RDS.DatabaseConnections` for `tailrd-production-aurora` over 24h: > 0 sustained
- CloudWatch `AWS/RDS.WriteIOPS` for Aurora: > 0 (writes confirmed)

### 3.5 Production task definition references Aurora
- Latest task def's `DATABASE_URL` env var resolves to a secret whose value contains `tailrd-production-aurora.cluster-` (not `tailrd-production-postgres.`)

### 3.6 Operator readiness
- Calendar block held for ~1 hour active operator time
- Slack/PagerDuty in front of operator
- No other production work scheduled

---

## 4. Sub-tasks in execution order

### 4.1 Run pre-decommission validation (5 min)

Attach `Phase2D-Decommission` IAM policy, run `decommissionValidation.js` Fargate one-off, expect `ready_for_decommission: true`. Detach policy after script completes (mandatory, same pattern as pre/post-cutover). Do not proceed to 4.2 if any blocker.

### 4.2 Final RDS snapshot for HIPAA audit (10-15 min)

```bash
aws rds create-db-snapshot \
  --db-instance-identifier tailrd-production-postgres \
  --db-snapshot-identifier tailrd-production-postgres-final-pre-decom-2026-04-30 \
  --tags Key=Project,Value=tailrd Key=Environment,Value=production \
         Key=HIPAA,Value=true Key=Purpose,Value=pre-decom-final \
         Key=RetainUntil,Value=2027-04-30
```

Wait for `available`. Verify accessible via `describe-db-snapshots`. Save snapshot ARN to local file for HIPAA audit log.

### 4.3 DMS task + replication slot cleanup (5 min)

```bash
# Capture replication slot name BEFORE deleting DMS (slot ID embedded in DMS task config)
SLOT_NAME=$(aws dms describe-replication-tasks --filters Name=replication-task-arn,Values=arn:aws:dms:us-east-1:863518424332:task:YFGGBH5LXRHDBHYD76DVX5MQRA --query 'ReplicationTasks[0].ReplicationTaskSettings' --output text | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('LogicalReplicationSlotName', 'unknown'))")

# Or query RDS directly via Fargate one-off (fallback)
# SELECT slot_name FROM pg_replication_slots WHERE slot_name LIKE 'awsdms%' OR slot_name LIKE '%yfggbh%';

# Delete DMS task
aws dms delete-replication-task --replication-task-arn arn:aws:dms:us-east-1:863518424332:task:YFGGBH5LXRHDBHYD76DVX5MQRA

# Drop logical replication slot from RDS (requires superuser DB connection via Fargate one-off)
# SELECT pg_drop_replication_slot('<slot_name>');
```

Verify slot released via `pg_replication_slots` query (count == 0 for awsdms-prefixed slots).

### 4.4 RDS instance retirement (30-45 min)

```bash
# Disable deletion protection (final-snapshot was taken in 4.2)
aws rds modify-db-instance \
  --db-instance-identifier tailrd-production-postgres \
  --no-deletion-protection \
  --apply-immediately

# Delete instance
aws rds delete-db-instance \
  --db-instance-identifier tailrd-production-postgres \
  --skip-final-snapshot

# Wait for deletion (no built-in waiter; poll describe-db-instances every 60s)
```

When `describe-db-instances` returns `DBInstanceNotFound`, deletion is complete.

### 4.5 DMS infrastructure cleanup (5-10 min)

```bash
# Delete DMS replication instance
aws dms delete-replication-instance \
  --replication-instance-arn arn:aws:dms:us-east-1:863518424332:rep:JGQBSRDUTNH3HO6PKL3BEESYS4

# Delete DMS endpoints
aws dms delete-endpoint --endpoint-arn arn:aws:dms:us-east-1:863518424332:endpoint:XG3PQTZG5BB4RNX3RWT3G3KICQ  # tailrd-rds-source
aws dms delete-endpoint --endpoint-arn arn:aws:dms:us-east-1:863518424332:endpoint:CLT4CXLHTJFM3B5IEVDWYKNUFQ  # tailrd-aurora-target

# Delete migration-specific IAM roles
aws iam delete-role --role-name dms-cloudwatch-logs-role
aws iam delete-role --role-name dms-rollback-role
aws iam delete-role --role-name dms-vpc-role

# Delete Lambda rollback function (DMS-task-pinned, now defunct)
aws lambda delete-function --function-name tailrd-production-aurora-rollback || echo "lambda not found, skipping"
```

### 4.6 Update CLAUDE.md

```diff
- **Last known working task definition:** `tailrd-backend:106` ...
+ **Last known working task definition:** `tailrd-backend:<post-cutover-revision>` (deployed 2026-04-29 - Day 10 cutover to Aurora Serverless v2)
- [x] RDS PostgreSQL Multi-AZ
+ [x] Aurora Serverless v2 PostgreSQL (post Day 10/11 migration; final RDS snapshot retained)
```

Document final RDS snapshot ARN + retention policy in the migration history section.

### 4.7 Cost verification (next billing day)

Confirm AWS bill drops by approximately the t3.medium RDS line item (~$50-70/month) the following billing cycle. Verify via Cost Explorer or AWS Console billing dashboard. If RDS still appears as billable, verify deletion completed via `describe-db-instances`.

---

## 5. Pause points

- After 3.1-3.6 pre-flight: report all green or surface specific blocker
- After 4.1 validation: explicit pass before snapshot
- After 4.2 snapshot: confirm snapshot ARN before proceeding to deletion
- After 4.4 deletion: confirm RDS gone before DMS cleanup
- After 4.5: confirm clean state before CLAUDE.md update

---

## 6. Safety stops

- Soak monitor reports any sustained failure: STOP, do not decommission, investigate Aurora regression
- Final snapshot fails: STOP, do NOT delete RDS without valid snapshot
- Replication slot drop fails (slot in use, etc.): STOP, investigate before proceeding to RDS deletion (a held slot can prevent the parent instance deletion)
- Production task def still references RDS: STOP, cutover did not complete properly
- Aurora connection count is 0 (no production traffic): STOP, traffic may have rolled back to RDS unintentionally
- Pre-decommission script returns ready: false: STOP, address blockers

---

## 7. Rollback procedures

### Pre-deletion (Steps 4.1-4.3)
- DMS task delete is reversible: re-create with same source + target endpoints (which still exist) and resume from CDC position. But this requires DMS task config preserved.
- Replication slot drop is irreversible by itself, but creating a new slot is trivial; CDC re-establishes.

### Post-deletion (Step 4.4 done, RDS gone)
- Restore from final snapshot: `aws rds restore-db-instance-from-db-snapshot --db-snapshot-identifier tailrd-production-postgres-final-pre-decom-2026-04-30 --db-instance-identifier tailrd-production-postgres-restored`. ~30-45 min.
- Update DATABASE_URL secret to restored RDS endpoint.
- Force-new-deployment on ECS.
- Re-create DMS infrastructure if CDC needed.

This is a high-cost rollback. Only triggered if production becomes unstable post-decommission and Aurora is the cause.

---

## 8. Acceptance criteria

- [ ] Production stable on Aurora for 48h+ post-cutover (24h soak + 24h additional)
- [ ] Final RDS snapshot verified accessible, tagged with HIPAA + RetainUntil
- [ ] `tailrd-production-postgres` returns DBInstanceNotFound from describe-db-instances
- [ ] DMS task + replication instance + endpoints deleted
- [ ] dms-* IAM roles deleted
- [ ] Lambda rollback function deleted (or confirmed absent)
- [ ] CLAUDE.md updated to reference Aurora as production DB
- [ ] AWS bill reflects RDS removal (verified next billing day)
- [ ] No orphaned security groups, secrets, or networking artifacts referencing RDS endpoint

---

## 9. Estimated time

| Phase | Estimate |
|---|---|
| 4.1 Pre-decom validation | 5 min |
| 4.2 Final snapshot | 10-15 min |
| 4.3 DMS task + slot cleanup | 5 min |
| 4.4 RDS deletion | 30-45 min (mostly waiting) |
| 4.5 DMS infra cleanup | 5-10 min |
| 4.6 CLAUDE.md update + commit | 10 min |
| 4.7 Cost verification | (deferred to next billing cycle) |

**Day 11 active operator time: ~1.5-2 hours** (most of it waiting on RDS deletion).

---

## 10. Out of scope (deferred to later weeks)

- Predecessor t4g RDS investigation (tech debt #34, post-Sinai)
- Aurora minor version upgrade scheduled 2026-05-17 (Day 11 follow-up note from Day 10 runbook)
- Long-term archival of final snapshot (separate compliance task)
- Cost Explorer detailed cost-decomp analysis (informational, not gating)
