#!/usr/bin/env bash
# AUDIT-078 — Backup config verification (post-apply idempotent check)
#
# Read-only verification that production cluster backup config matches AUDIT-078 α scope target state.
# Sister to runbook §4.2 verification command.
#
# Use cases:
#   - Post-apply verification immediately after operator runs runbook §4.1
#   - Pre-cadence sanity check (called by 04-rotate-cadence.sh OR manually)
#   - Drift detection (e.g., someone manually modified BackupRetentionPeriod via console)
#
# Cross-references:
#   - docs/runbooks/AUDIT_078_AURORA_BACKUP_RESTORE_RUNBOOK.md §4.2
#   - docs/architecture/AUDIT_078_AURORA_BACKUP_RESTORE_NOTES.md §1 α scope deliverable 1
#
# Exit codes:
#   0 = backup config matches target state
#   1 = drift detected (BackupRetentionPeriod ≠ 35 OR DeletionProtection ≠ true)
#   2 = describe-db-clusters failed

set -euo pipefail

readonly EXPECTED_CLUSTER="tailrd-production-aurora"
readonly EXPECTED_BACKUP_RETENTION=35
readonly EXPECTED_DELETION_PROTECTION="true"

log() { printf '[AUDIT-078 verify-backup] %s\n' "$*"; }
fail() { printf '[AUDIT-078 verify-backup] FAIL: %s\n' "$*" >&2; exit "${2:-1}"; }

log "verifying backup config on $EXPECTED_CLUSTER"

config_json=$(aws rds describe-db-clusters \
  --db-cluster-identifier "$EXPECTED_CLUSTER" \
  --query 'DBClusters[0].{BackupRetentionPeriod:BackupRetentionPeriod,DeletionProtection:DeletionProtection,Status:Status,PendingModifiedValues:PendingModifiedValues}' \
  --output json 2>/dev/null) || fail "describe-db-clusters failed" 2

actual_retention=$(printf '%s' "$config_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["BackupRetentionPeriod"])')
actual_deletion=$(printf '%s' "$config_json" | python3 -c 'import json,sys; print(str(json.load(sys.stdin)["DeletionProtection"]).lower())')
actual_status=$(printf '%s' "$config_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["Status"])')
pending=$(printf '%s' "$config_json" | python3 -c 'import json,sys; v=json.load(sys.stdin).get("PendingModifiedValues",{}); print("nonempty" if v else "empty")')

log "BackupRetentionPeriod: $actual_retention (expected $EXPECTED_BACKUP_RETENTION)"
log "DeletionProtection:    $actual_deletion (expected $EXPECTED_DELETION_PROTECTION)"
log "Status:                $actual_status"
log "PendingModifiedValues: $pending"

drift_count=0

if [ "$actual_retention" != "$EXPECTED_BACKUP_RETENTION" ]; then
  log "DRIFT: BackupRetentionPeriod mismatch"
  drift_count=$((drift_count + 1))
fi

if [ "$actual_deletion" != "$EXPECTED_DELETION_PROTECTION" ]; then
  log "DRIFT: DeletionProtection mismatch"
  drift_count=$((drift_count + 1))
fi

if [ "$pending" = "nonempty" ]; then
  log "WARN: PendingModifiedValues non-empty (change queued; not yet applied)"
fi

if [ "$drift_count" -eq 0 ]; then
  log "verification PASSED"
  exit 0
fi

fail "$drift_count drift item(s) detected; remediate via runbook §4.1 modify-db-cluster"
