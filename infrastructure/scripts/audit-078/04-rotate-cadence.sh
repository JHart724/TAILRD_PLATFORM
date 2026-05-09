#!/usr/bin/env bash
# AUDIT-078 — Quarterly cadence trigger script
#
# Wraps 00-preflight.sh + 03-execute-restore-test.sh for quarterly automated execution
# per design note §4 D2 (c) cadence + runbook §9.1 schedule.
#
# Sister-discipline: AUDIT-016 PR 3 --target restriction pattern (focused execution).
# Confirmation gate: AUDIT_078_EXECUTE_CONFIRMED=yes (inherited; sister to AUDIT-016 PR 3 + AUDIT-022).
#
# Cross-references:
#   - docs/runbooks/AUDIT_078_AURORA_BACKUP_RESTORE_RUNBOOK.md §9.1
#   - docs/architecture/AUDIT_078_AURORA_BACKUP_RESTORE_NOTES.md §4 D2
#
# Inputs (env):
#   AUDIT_078_EXECUTE_CONFIRMED — must be "yes" (forwarded to 03-execute-restore-test.sh)
#   VPC_SECURITY_GROUP_ID — forwarded
#   DB_SUBNET_GROUP — forwarded
#   PSQL_PASSWORD — forwarded
#   AUDIT_078_QUARTER_LABEL — optional human label (e.g., "Q3-2026"); defaults to YYYY-MM
#
# Exit codes:
#   0 = preflight + restore-test passed
#   1 = any sub-script failure

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly QUARTER_LABEL="${AUDIT_078_QUARTER_LABEL:-$(date +%Y-%m)}"
readonly CADENCE_LOG_DIR="${AUDIT_078_CADENCE_LOG_DIR:-${SCRIPT_DIR}/cadence-logs}"

log() { printf '[AUDIT-078 cadence:%s] %s\n' "$QUARTER_LABEL" "$*"; }
fail() { printf '[AUDIT-078 cadence:%s] FAIL: %s\n' "$QUARTER_LABEL" "$*" >&2; exit 1; }

[ "${AUDIT_078_EXECUTE_CONFIRMED:-}" = "yes" ] \
  || fail "AUDIT_078_EXECUTE_CONFIRMED env var must be 'yes' to execute"

mkdir -p "$CADENCE_LOG_DIR"
readonly CADENCE_LOG="${CADENCE_LOG_DIR}/cadence-${QUARTER_LABEL}-$(date +%Y%m%d-%H%M%S).log"
log "cadence log: $CADENCE_LOG"

log "Step 1: 00-preflight.sh"
if "$SCRIPT_DIR/00-preflight.sh" 2>&1 | tee -a "$CADENCE_LOG"; then
  log "preflight PASSED"
else
  fail "preflight FAILED; see $CADENCE_LOG"
fi

log "Step 2: 03-execute-restore-test.sh"
if "$SCRIPT_DIR/03-execute-restore-test.sh" 2>&1 | tee -a "$CADENCE_LOG"; then
  log "restore-test PASSED"
else
  fail "restore-test FAILED; see $CADENCE_LOG (test cluster may need manual destroy)"
fi

log "quarterly cadence complete; operator opens sign-off ledger PR per runbook §7.2"
log "log artifact: $CADENCE_LOG"
exit 0
