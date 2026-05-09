#!/usr/bin/env bash
# AUDIT-078 — Pre-flight checks for backup-config-apply + restore-test execution
#
# Read-only verification of operator-side prerequisites per runbook §3 Pre-flight Checklist.
# Sister-discipline: AUDIT-022 PR #253 production-runbook §2 + AUDIT-016 PR 3 §2 pre-flight.
#
# Cross-references:
#   - docs/runbooks/AUDIT_078_AURORA_BACKUP_RESTORE_RUNBOOK.md §3
#   - docs/architecture/AUDIT_078_AURORA_BACKUP_RESTORE_NOTES.md §3 (operator-side-vs-repo-side scope split)
#
# Numbering note: 01-import-stack.sh + 02-apply-backup-config.sh REMOVED from α scope per
# α reframe 2026-05-08 (CFN stack-import deferred to AUDIT-XXX-future-aurora-cfn-import).
# Numbering preserved (00 + 03 + 04 + 05) for forward-reference to future work block.
#
# Exit codes:
#   0 = all pre-flight checks passed; proceed to runbook §4 or §5
#   1 = pre-flight failure; investigate before proceeding

set -euo pipefail

readonly EXPECTED_REGION="us-east-1"
readonly EXPECTED_ACCOUNT="863518424332"
readonly EXPECTED_CLUSTER="tailrd-production-aurora"
readonly RESTORE_TEST_CLUSTER="tailrd-production-aurora-restore-test"

log() { printf '[AUDIT-078 preflight] %s\n' "$*"; }
fail() { printf '[AUDIT-078 preflight] FAIL: %s\n' "$*" >&2; exit 1; }

log "AUDIT-078 pre-flight checks starting"

# Check 1: aws CLI present
command -v aws >/dev/null 2>&1 || fail "aws CLI not found in PATH"

# Check 2: caller identity (account + region)
caller_account=$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null) \
  || fail "aws sts get-caller-identity failed; check credentials"

[ "$caller_account" = "$EXPECTED_ACCOUNT" ] \
  || fail "account mismatch: caller=$caller_account expected=$EXPECTED_ACCOUNT"
log "account verified: $caller_account"

caller_region=$(aws configure get region 2>/dev/null || printf '%s' "${AWS_REGION:-${AWS_DEFAULT_REGION:-}}")
[ "$caller_region" = "$EXPECTED_REGION" ] \
  || fail "region mismatch: caller=$caller_region expected=$EXPECTED_REGION (set via AWS_REGION env or aws configure)"
log "region verified: $caller_region"

# Check 3: production cluster exists + is available
prod_status=$(aws rds describe-db-clusters \
  --db-cluster-identifier "$EXPECTED_CLUSTER" \
  --query 'DBClusters[0].Status' \
  --output text 2>/dev/null) || fail "production cluster $EXPECTED_CLUSTER not found OR rds:DescribeDBClusters denied"

[ "$prod_status" = "available" ] \
  || fail "production cluster status=$prod_status (expected: available)"
log "production cluster verified: $EXPECTED_CLUSTER status=$prod_status"

# Check 4: restore-test cluster does NOT exist (must be free identifier)
if aws rds describe-db-clusters --db-cluster-identifier "$RESTORE_TEST_CLUSTER" >/dev/null 2>&1; then
  fail "restore-test cluster $RESTORE_TEST_CLUSTER ALREADY EXISTS; destroy via 03-execute-restore-test.sh §destroy phase OR aws rds delete-db-cluster"
fi
log "restore-test identifier free: $RESTORE_TEST_CLUSTER"

# Check 5: latest automated snapshot identifiable
latest_snapshot=$(aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier "$EXPECTED_CLUSTER" \
  --snapshot-type automated \
  --query 'DBClusterSnapshots[?Status==`available`] | sort_by(@, &SnapshotCreateTime) | [-1].DBClusterSnapshotIdentifier' \
  --output text 2>/dev/null) || fail "rds:DescribeDBClusterSnapshots failed"

[ -n "$latest_snapshot" ] && [ "$latest_snapshot" != "None" ] \
  || fail "no available automated snapshots found; cluster automated backup may be misconfigured"
log "latest automated snapshot identified: $latest_snapshot"

# Check 6: required IAM permissions probe (read-only check via dry-run-style describe)
# Restore + delete operations are NOT dry-run-able server-side; permission probe via describe family only
aws rds describe-db-cluster-parameter-groups --max-items 1 >/dev/null 2>&1 \
  || log "WARN: rds:DescribeDBClusterParameterGroups denied; runbook §4.0 cluster topology view limited"

log "all pre-flight checks PASSED"
log "next: runbook §4 backup config apply (already executed 2026-05-08) OR §5 restore-test execution"
exit 0
