# AUDIT-078 — Aurora Backup Config Apply + Restore-Test Production Runbook

**Status:** Operator-ready (α scope; document-and-defer-IaC reframe locked 2026-05-08)
**Owner:** Security / Compliance lead + Platform engineering
**Last reviewed:** 2026-05-08
**Cross-references:** `docs/audit/AUDIT_FINDINGS_REGISTER.md` (AUDIT-078), `docs/architecture/AUDIT_078_AURORA_BACKUP_RESTORE_NOTES.md` (design refinement note), `docs/runbooks/AUDIT_022_PRODUCTION_RUNBOOK.md` (sister-pattern), `docs/runbooks/AUDIT_016_PR_3_MIGRATION_RUNBOOK.md` (sister-pattern), HIPAA §164.308(a)(7) Contingency Plan + §164.308(a)(7)(ii)(B) Disaster Recovery Plan testing + §164.308(a)(7)(ii)(D) Procedures for periodic testing and revision of contingency plans

---

## 1. Purpose + Scope

AUDIT-078 finds production Aurora cluster `tailrd-production-aurora` has `BackupRetentionPeriod=7` (insufficient HIPAA posture) and the documented restore procedure (per Day 11 RDS decommission runbook §"If catastrophic discovery") has never been executed end-to-end. This runbook closes both gaps (α scope; CFN stack-import deferred to AUDIT-XXX-future-aurora-cfn-import).

**α scope deliverables:**
1. Apply backup config overrides via `aws rds modify-db-cluster` (BackupRetentionPeriod 7 → 35; DeletionProtection idempotent reaffirm)
2. Execute end-to-end restore-test from latest automated snapshot into ephemeral cluster `tailrd-production-aurora-restore-test`
3. Verify pass-criteria: schema parity + sample-row decrypt + PHI-decrypt KMS context end-to-end (D3 (a) + (b) + (d) per design note §4)
4. Document RTO measurement (timer wall-clock from `restore-db-cluster-from-snapshot` to first `psql` connection; target <30 min)
5. Destroy test cluster

**Out of scope (deferred):**
- CFN stack-import of production cluster — AUDIT-XXX-future-aurora-cfn-import (design context preserved at design note §6 + §6.5)
- terraform/ stale-state reconciliation — AUDIT-082 (filed)
- AWS Backup adoption — AUDIT-XXX-future-aws-backup-multi-region (gated on multi-region)
- IAM database authentication — AUDIT-XXX-future-iam-db-auth (defense-in-depth; surfaced PAUSE 2.5-α Block A Step 1)
- Consolidated encryption-at-rest architecture doc — AUDIT-XXX-future-encryption-at-rest-architecture-summary (PAUSE 2.6 OUTCOME A surfacing)

**Concurrent-write safety:** BackupRetentionPeriod is a dynamic-apply parameter on Aurora (no cluster restart; no instance reboot; no downtime). Restore-test creates separate cluster (`tailrd-production-aurora-restore-test`); production cluster untouched throughout.

---

## 2. Encryption-at-Rest Layer Architecture (PAUSE 2.6 OUTCOME A reference)

**Two-key defense-in-depth posture confirmed via PAUSE 2.5-α Block A Step 1 reconciliation 2026-05-08.** Both keys legitimate; both correct in respective layers; key separation is BY-DESIGN.

| Key alias | KeyId | Layer | Purpose | Source authority |
|-----------|-------|-------|---------|------------------|
| `alias/tailrd-aurora-production` | `ec93e66e-0f65-46bf-b132-11c9b1b7e637` | **Aurora storage encryption** (AWS-managed envelope) | Cluster-level at-rest encryption (`StorageEncrypted=true` on cluster) | AUDIT-078 facts dump |
| `alias/tailrd-production-phi` | `46f6551f-84e6-434f-9316-05055317a1e7` | **Application field-level encryption** (AUDIT-016 envelope) | PHI field-level envelope encryption with per-record EncryptionContext binding | AUDIT-016 design doc §59 + PR #260/#261 |

**Restore-test §6 verification implications:** D3 (b) sample-row + D3 (d) PHI-decrypt verifications BOTH pass = both encryption layers verified end-to-end (Aurora storage decrypt on cluster boot + AUDIT-016 application envelope decrypt on field read). Either layer broken = corresponding pass-criterion fails distinctly.

**Cross-references:**
- `docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md` §59 (PHI envelope key alias)
- `docs/architecture/AUDIT_016_PR_2_V2_KMS_WIRING_NOTES.md` (per-record EncryptionContext binding)
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` AUDIT-075 (PHI_FIELD_MAP routing — which fields encrypted at application layer)
- AUDIT-XXX-future-encryption-at-rest-architecture-summary (consolidated layered-architecture doc work block; design note §13 follow-ups)

---

## 3. Pre-flight Checklist

Operator confirms ALL items before §4 Backup Config Apply Execution. Automated pre-flight via `infrastructure/scripts/audit-078/00-preflight.sh` (read-only; verifies aws CLI + account + region + cluster + restore-test identifier free + latest snapshot identifiable).

- [ ] AWS account access verified (us-east-1; account 863518424332)
- [ ] AWS CLI configured with credentials having `rds:ModifyDBCluster` + `rds:DescribeDBClusters` + `rds:DescribeDBClusterSnapshots` + `rds:RestoreDBClusterFromSnapshot` + `rds:DeleteDBCluster` permissions
- [ ] Production cluster identifier confirmed: `tailrd-production-aurora` (per CLAUDE.md §9)
- [ ] Current backup config snapshot captured (PAUSE 2.5-α Block A Step 1 facts dump 2026-05-08; **§4 apply EXECUTED 2026-05-08**; post-apply state per §4.2):
  - `BackupRetentionPeriod=7` (current; → 35 target)
  - `DeletionProtection=true` (idempotent; preserve)
  - `StorageEncrypted=true` + `KmsKeyId=ec93e66e-...` (preserve; HIPAA-correct)
  - `Engine=aurora-postgresql`, `EngineVersion=15.14`
  - `PreferredBackupWindow=09:00-10:00` UTC (= 04:00-05:00 ET; low-traffic)
  - `PreferredMaintenanceWindow=sun:10:00-sun:11:00` UTC (= sun:05:00-06:00 ET; low-traffic)
  - `EnabledCloudwatchLogsExports=[postgresql]`
- [ ] Latest automated snapshot identified for restore-test source (sister to design note §4 D1 sandbox-restore methodology):
  - Latest as of 2026-05-08: `rds:tailrd-production-aurora-2026-05-08-09-08` (created 2026-05-08T09:09:18Z; EngineVersion 15.14)
  - At restore-test execution time, identify FRESH latest via:
    ```bash
    aws rds describe-db-cluster-snapshots \
      --db-cluster-identifier tailrd-production-aurora \
      --snapshot-type automated \
      --query 'DBClusterSnapshots[?Status==`available`] | sort_by(@, &SnapshotCreateTime) | [-1].DBClusterSnapshotIdentifier' \
      --output text
    ```
- [ ] Restore-test cluster identifier reserved: `tailrd-production-aurora-restore-test` (must not exist; verify via `aws rds describe-db-clusters --db-cluster-identifier tailrd-production-aurora-restore-test` → `DBClusterNotFoundFault` expected)
- [ ] Operator runs in low-traffic window (recommended: weekday off-hours OR weekend; sister to AUDIT-022 production-execute timing discipline)
- [ ] Demo PID 60172 (or current production demo backend) baseline verified LISTENING; backend reads from production cluster will be unaffected (BackupRetentionPeriod change is metadata-only; restore-test isolates to separate cluster)

---

## 4. Backup Config Apply Execution

> **EXECUTED 2026-05-08** — modify-db-cluster apply landed instantly (no `Status: modifying` transition observed); post-apply verification BackupRetentionPeriod=35 + DeletionProtection=true confirmed. Section preserved as procedural reference for quarterly cadence + future re-execution if rollback ever needed.

### 4.0 Cluster topology (captured 2026-05-08 via §4.1 modify-db-cluster output)

Bonus facts inlined for runbook accuracy + restore-test §5 source-cluster reference:

| Property | Value |
|----------|-------|
| Cluster identifier | `tailrd-production-aurora` |
| Writer endpoint | `tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com:5432` |
| Reader endpoint | `tailrd-production-aurora.cluster-ro-csp0w6g8u5uq.us-east-1.rds.amazonaws.com:5432` |
| DB name | `tailrd` |
| Master username | `tailrd_admin` |
| DBClusterParameterGroup | `default.aurora-postgresql15` (NOT custom-tuned; AUDIT-XXX-future-aurora-pg-param-group-customize candidate per design note §13) |
| DBSubnetGroup | `tailrd-aurora-production-subnet-group` |
| AvailabilityZones | `us-east-1a`, `us-east-1b`, `us-east-1c` (3-AZ deployment) |
| MultiAZ | true |
| Cluster members | 3 instances total: 1 writer + 2 readers |
| Writer | `tailrd-aurora-production-writer` (PromotionTier 1) |
| Reader 1 | `tailrd-aurora-production-reader-1` (PromotionTier 1) |
| Reader 2 | `tailrd-aurora-production-reader-2` (PromotionTier 1) |
| EarliestRestorableTime (at §4 apply time) | `2026-05-01T09:09:18Z` (~7 days back; will extend to 35 days going forward) |
| LatestRestorableTime (at §4 apply time) | `2026-05-08T23:21:05Z` (continuous PITR baseline) |

### 4.1 Apply BackupRetentionPeriod=35 + DeletionProtection=true

```bash
aws rds modify-db-cluster \
  --db-cluster-identifier tailrd-production-aurora \
  --backup-retention-period 35 \
  --deletion-protection \
  --apply-immediately
```

**Why `--apply-immediately`:** BackupRetentionPeriod is a dynamic-apply parameter on Aurora (no cluster restart; no instance reboot; no downtime). Without `--apply-immediately`, change queues for next maintenance window (sun:10:00-sun:11:00 UTC; ~5-day delay). HIPAA posture closes faster with immediate apply; risk surface zero (parameter is not destructive).

**Why `--deletion-protection` (no value):** flag-presence form; CLI interprets as `true`. Idempotent reaffirm of current state per facts dump.

### 4.2 Verify cluster status post-apply

Automated verification via `infrastructure/scripts/audit-078/05-verify-backup-config.sh` (read-only; exits 0 if BackupRetentionPeriod=35 + DeletionProtection=true; exits 1 on drift; sister to drift-detection use case).


```bash
aws rds describe-db-clusters \
  --db-cluster-identifier tailrd-production-aurora \
  --query 'DBClusters[0].{BackupRetentionPeriod:BackupRetentionPeriod,DeletionProtection:DeletionProtection,Status:Status,PendingModifiedValues:PendingModifiedValues}'
```

**Expected output:**
```json
{
    "BackupRetentionPeriod": 35,
    "DeletionProtection": true,
    "Status": "available",
    "PendingModifiedValues": {}
}
```

If `PendingModifiedValues` is non-empty → change queued, not applied; investigate `--apply-immediately` flag absence. If `BackupRetentionPeriod` remains 7 → modify-db-cluster failed; capture API response for diagnosis.

### 4.3 Audit-trail entry

CloudTrail captures the modify-db-cluster event automatically (sister to AUDIT-013 audit-log durability discipline). Operator records execution timestamp + commit-SHA-of-this-runbook in BUILD_STATE.md §9 closing prose at sign-off ledger update PR.

---

## 5. Restore-Test Execution

Automated end-to-end execution via `infrastructure/scripts/audit-078/03-execute-restore-test.sh` (gated on `AUDIT_078_EXECUTE_CONFIRMED=yes` per AUDIT-016 PR 3 + AUDIT-022 sister-pattern; covers §5 Restore-Test Execution + §6 Pass-Criteria smoke checks + §8 Test Cluster Destroy in single invocation; D3 (d) PHI-decrypt verification SKIPPED in script and run manually per §6.3 due to secret-material handling). Manual step-by-step procedure below preserved for first-execution operator-ramp + diagnosis.

### 5.1 RTO timer start

Operator captures POSIX timestamp immediately before §5.2 command:

```bash
RTO_START=$(date +%s)
echo "RTO timer start: $RTO_START ($(date -u))"
```

### 5.2 Restore from latest automated snapshot

```bash
# Identify FRESH latest snapshot (timing-sensitive; do NOT reuse pre-flight value)
LATEST_SNAPSHOT=$(aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier tailrd-production-aurora \
  --snapshot-type automated \
  --query 'DBClusterSnapshots[?Status==`available`] | sort_by(@, &SnapshotCreateTime) | [-1].DBClusterSnapshotIdentifier' \
  --output text)
echo "Restore source: $LATEST_SNAPSHOT"

# Restore cluster from snapshot
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier tailrd-production-aurora-restore-test \
  --snapshot-identifier "$LATEST_SNAPSHOT" \
  --engine aurora-postgresql \
  --engine-version 15.14 \
  --vpc-security-group-ids <PRODUCTION_VPC_SG_ID> \
  --db-subnet-group-name <PRODUCTION_DB_SUBNET_GROUP> \
  --kms-key-id arn:aws:kms:us-east-1:863518424332:key/ec93e66e-0f65-46bf-b132-11c9b1b7e637 \
  --tags Key=Purpose,Value=AUDIT-078-restore-test Key=AutoDestroy,Value=true
```

**KmsKeyId binding:** Aurora storage encryption layer key (`alias/tailrd-aurora-production`); preserves AUDIT-078 §2 two-key defense-in-depth architecture during restore. AUDIT-016 PHI envelope key (`alias/tailrd-production-phi`) is referenced at application read time, NOT at cluster restore time — separation preserved by design.

### 5.3 Wait for cluster + writer instance available

Aurora restore-from-snapshot creates cluster THEN provisions instances. Cluster reaches `available` first; writer instance reaches `available` ~3-5 min later.

```bash
# Wait for cluster status=available
aws rds wait db-cluster-available --db-cluster-identifier tailrd-production-aurora-restore-test
echo "Cluster available at: $(date +%s) ($(date -u))"

# Provision writer instance (restore-from-snapshot does NOT auto-create; must add)
aws rds create-db-instance \
  --db-instance-identifier tailrd-production-aurora-restore-test-writer \
  --db-cluster-identifier tailrd-production-aurora-restore-test \
  --db-instance-class db.serverless \
  --engine aurora-postgresql \
  --tags Key=Purpose,Value=AUDIT-078-restore-test Key=AutoDestroy,Value=true

# Wait for instance status=available
aws rds wait db-instance-available --db-instance-identifier tailrd-production-aurora-restore-test-writer
echo "Writer instance available at: $(date +%s) ($(date -u))"
```

### 5.4 RTO timer stop (first psql connection)

Per design note §4 D4 RTO measurement methodology: timer stops when first `psql` connection succeeds, NOT when CFN/RDS reports `available` (Aurora has post-`available` provisioning phases that complete before psql can connect).

```bash
# Get cluster endpoint
ENDPOINT=$(aws rds describe-db-clusters \
  --db-cluster-identifier tailrd-production-aurora-restore-test \
  --query 'DBClusters[0].Endpoint' --output text)

# Test psql connection (operator supplies password from secrets manager OR uses IAM token if configured)
psql -h "$ENDPOINT" -U tailrd_admin -d tailrd -c "SELECT 1;" || echo "psql connect failed; investigate"

# RTO timer stop
RTO_STOP=$(date +%s)
echo "RTO timer stop: $RTO_STOP ($(date -u))"
echo "Total RTO: $((RTO_STOP - RTO_START)) seconds = $(( (RTO_STOP - RTO_START) / 60 )) minutes"
```

**Pass criterion (D4 RTO target):** total RTO < 1800 seconds (30 minutes). Document actual measurement in §7 sign-off + BUILD_STATE.md §9 closing prose.

---

## 6. Pass-Criteria Verification (D3 multi-select)

Verify all three pass criteria before §7 sign-off. Any failure = restore-test FAILED; do NOT destroy test cluster until investigation complete.

### 6.1 D3 (a) — Schema integrity

```bash
# Capture production schema (read-only on production cluster; uses production credentials)
pg_dump --schema-only --no-owner --no-acl \
  --host=tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com \
  --username=tailrd_admin \
  --dbname=tailrd \
  > /tmp/production-schema.sql

# Capture restore-test schema
pg_dump --schema-only --no-owner --no-acl \
  --host="$ENDPOINT" \
  --username=tailrd_admin \
  --dbname=tailrd \
  > /tmp/restore-test-schema.sql

# Compare
diff /tmp/production-schema.sql /tmp/restore-test-schema.sql
```

**Pass criterion:** zero diff lines. Snapshot-restore preserves schema by RDS guarantee; any diff = anomaly worth investigating before sign-off.

### 6.2 D3 (b) — Sample-row integrity

Read N=10 representative rows from PHI-encrypted columns; verify shape + presence (NOT decrypted content — that's D3 (d)).

```sql
-- Sample 10 rows across PHI-encrypted columns (per AUDIT-075 PHI_FIELD_MAP scope)
SELECT
  id,
  LEFT("firstName", 20) AS firstName_prefix,
  LEFT("lastName", 20) AS lastName_prefix,
  LEFT("dateOfBirth", 20) AS dob_prefix,
  LEFT("mrn", 20) AS mrn_prefix
FROM "Patient"
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Pass criterion:** rows return; PHI columns show `enc:v1:` or `enc:v2:` prefixes (envelope-encrypted at application layer per AUDIT-016 / AUDIT-075). NULL or plaintext = anomaly; investigate.

### 6.3 D3 (d) — PHI-decrypt KMS context end-to-end

**Load-bearing for AUDIT-016 + AUDIT-017 + AUDIT-075 sister-discipline:** verifies BOTH encryption layers (Aurora storage + AUDIT-016 application envelope) work on restored cluster. If either layer broken, this verification fails distinctly.

Operator runs the existing PHI decryption tooling against restore-test cluster:

```bash
# Use existing AUDIT-016 PR 3 migration script in dry-run + read-only mode against restore-test
DATABASE_URL="postgresql://tailrd_admin:<password>@$ENDPOINT:5432/tailrd?sslmode=require" \
PHI_ENCRYPTION_KEY="<production-PHI-key>" \
AWS_KMS_PHI_KEY_ALIAS="alias/tailrd-production-phi" \
PHI_ENVELOPE_VERSION="v2" \
node backend/scripts/audit-078/sample-row-decrypt.sh
```

**Pass criterion:** sample rows decrypt to plaintext successfully on the restore-test cluster (matching production behavior). Decryption uses `alias/tailrd-production-phi` (AUDIT-016 application envelope key) — verifies key access + envelope round-trip working on restored data.

---

## 7. Restore-Test Sign-off + Ledger Update PR

### 7.1 Pass-criteria results table

Operator captures into BUILD_STATE.md §9 closing prose:

| Criterion | Target | Actual | Pass/Fail |
|-----------|--------|--------|-----------|
| D3 (a) Schema integrity | zero diff | (operator fills) | (operator fills) |
| D3 (b) Sample-row integrity | 10 rows; envelope prefix | (operator fills) | (operator fills) |
| D3 (d) PHI-decrypt KMS context | decryption successful | (operator fills) | (operator fills) |
| D4 RTO measurement | <30 min (1800s) | (operator fills; RTO_STOP - RTO_START) | (operator fills) |

### 7.2 Sign-off ledger update PR

Per AUDIT-011 sister-discipline merge-time-flip pattern: AUDIT-078 status flips OPEN → RESOLVED in dedicated post-execute ledger reconciliation PR (sister to PR #264 ledger pattern for AUDIT-075 closure).

PR scope:
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` — AUDIT-078 status: OPEN → RESOLVED 2026-05-XX (date of execution)
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` — AUDIT-078 add Sign-off note with pass-criteria table + RTO measurement
- `BUILD_STATE.md` §1 + §6 + §6.1 + §9 — AUDIT-078 RESOLVED references; advance top-3 priorities (AUDIT-080 → #1 post-AUDIT-078)
- `docs/audit/SESSION_JOURNAL.md` — Day-N close entry with restore-test execution record

---

## 8. Test Cluster Destroy

After §7 sign-off complete (pass-criteria verified + ledger PR opened):

```bash
# Delete writer instance first (cluster delete requires zero instances OR --skip-final-snapshot)
aws rds delete-db-instance \
  --db-instance-identifier tailrd-production-aurora-restore-test-writer \
  --skip-final-snapshot

# Wait for instance gone
aws rds wait db-instance-deleted \
  --db-instance-identifier tailrd-production-aurora-restore-test-writer

# Delete cluster (test cluster has no DeletionProtection by default; --skip-final-snapshot avoids tagging cost)
aws rds delete-db-cluster \
  --db-cluster-identifier tailrd-production-aurora-restore-test \
  --skip-final-snapshot

# Verify cluster gone
aws rds describe-db-clusters \
  --db-cluster-identifier tailrd-production-aurora-restore-test \
  --query 'DBClusters[0].Status' --output text 2>&1 || echo "Cluster deleted (DBClusterNotFoundFault expected)"
```

**Cleanup discipline:** test cluster destroy is mandatory; orphaned restore-test clusters accrue cost + create audit-trail noise. Sister to AUDIT-022 production-execute concurrent-write-safety discipline.

---

## 9. Quarterly Cadence + Rollback + Cross-References

### 9.1 Quarterly cadence schedule (D2 = (c) quarterly automated)

Per HIPAA §164.308(a)(7)(ii)(D) periodic testing requirement. Automated cadence trigger via `infrastructure/scripts/audit-078/04-rotate-cadence.sh` (wraps 00-preflight + 03-execute-restore-test; emits cadence log artifact at `infrastructure/scripts/audit-078/cadence-logs/cadence-<quarter>-<timestamp>.log`). Next execution dates:

| Quarter | Target month | Reminder mechanism |
|---------|--------------|-------------------|
| Q3 2026 | August 2026 | Calendar reminder + this runbook re-execution |
| Q4 2026 | November 2026 | Calendar reminder |
| Q1 2027 | February 2027 | Calendar reminder |
| (recurring) | quarterly thereafter | Calendar reminder |

Each quarterly execution: §3 pre-flight + §5 restore-test + §6 pass-criteria + §7 sign-off + §8 destroy. §4 backup config apply runs ONCE (not quarterly) — already idempotent reaffirm-only after first execution.

### 9.2 Rollback path

**§4 backup config rollback:**
```bash
aws rds modify-db-cluster \
  --db-cluster-identifier tailrd-production-aurora \
  --backup-retention-period 7 \
  --apply-immediately
```
(DeletionProtection stays true regardless — safer posture preserved.)

**§5 restore-test rollback:** §8 test cluster destroy is the rollback (no production state changed during restore-test).

### 9.3 Cross-references

- `docs/architecture/AUDIT_078_AURORA_BACKUP_RESTORE_NOTES.md` (design refinement note; §1-§14 + §6.5 PAUSE 2.5 + α reframe)
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` AUDIT-078 (this finding) + AUDIT-082 (terraform/ deferral)
- `docs/runbooks/AUDIT_022_PRODUCTION_RUNBOOK.md` (sister-pattern: 8-section operator runbook structure)
- `docs/runbooks/AUDIT_016_PR_3_MIGRATION_RUNBOOK.md` (sister-pattern: tooling-ships-repo / execute-operator-side)
- `docs/CHANGE_RECORD_2026_04_29_day10_aurora_cutover.md` (cluster provenance)
- `docs/CHANGE_RECORD_2026_04_29_day11_rds_decommission.md` §"If catastrophic discovery" (predecessor untested restore procedure)
- `CLAUDE.md` §9 production database state (cluster identifier + endpoints)
- HIPAA §164.308(a)(7) Contingency Plan + §164.308(a)(7)(ii)(B) Disaster Recovery Plan testing + §164.308(a)(7)(ii)(D) Procedures for periodic testing
- HIPAA §164.312(a)(2)(iv) Encryption Standards (two-key architecture per §2)

---

*Authored 2026-05-08 during AUDIT-078 Block A Step 2 runbook authoring per α reframe scope. Sister-discipline: AUDIT-022 PR #253 8-section production runbook structure; AUDIT-016 PR 3 production-execute timing operator-side discipline.*
