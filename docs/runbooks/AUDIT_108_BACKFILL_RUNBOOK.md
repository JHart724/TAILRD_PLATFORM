# AUDIT-108 Plaintext-to-V2 PHI Backfill - Operator Runbook

**Finding:** AUDIT-108 (CRITICAL P0) - production authentication outage (fail-closed decrypt throws on plaintext User/Recommendation/AuditLog rows).
**Script:** `backend/scripts/migrations/audit-108-plaintext-to-v2-backfill.ts`
**Design:** `docs/architecture/AUDIT_108_PLAINTEXT_BACKFILL_NOTES.md`
**Execution model:** ECS `run-task` command override on the post-merge image (census precedent). NEVER run against production from a developer machine.
**Scope (census 2026-06-03):** 6 columns / 202 rows / 219 values - `users.firstName`(1), `users.lastName`(1), `recommendations.title`(8), `recommendations.description`(8), `recommendations.evidence`(8), `audit_logs.description`(193).

This runbook is operator-side. Nothing here runs in CI. Steps 2-7 run only after the fix image is merged + deployed and the operator approves execute (PAUSE C).

---

## 1. Pre-flight + Aurora snapshot (rollback anchor)

Before any execute, take a manual Aurora snapshot and confirm it is `available`:
```
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier tailrd-production-aurora \
  --db-cluster-snapshot-identifier audit-108-pre-backfill-$(date +%Y%m%d) \
  --region us-east-1
aws rds describe-db-cluster-snapshots \
  --db-cluster-snapshot-identifier audit-108-pre-backfill-$(date +%Y%m%d) \
  --query 'DBClusterSnapshots[0].Status' --region us-east-1
```
Wait for `available`. Restore procedure: `docs/runbooks/AUDIT_078_AURORA_BACKUP_RESTORE_RUNBOOK.md`. Do NOT proceed to execute until the snapshot is `available`.

## 2. Dry-run (counts only, no writes)

Launch a one-off run-task with the override `node -r tsx/cjs scripts/migrations/audit-108-plaintext-to-v2-backfill.ts --dry-run` (or the `npx tsx` equivalent that matches the image). Expected per-column candidate counts: **users.firstName=1, users.lastName=1, recommendations.title=8, description=8, evidence=8, audit_logs.description=193; TOTAL=219**. If counts differ materially from 219, STOP and reconcile against a fresh census before executing.

## 3. Execute (gated)

Only after operator approval. Run-task override with environment:
`AUDIT_108_EXECUTE_CONFIRMED=yes` (the image already carries `PHI_ENVELOPE_VERSION=v2`, `AWS_KMS_PHI_KEY_ALIAS`, `PHI_ENCRYPTION_KEY`, `DATABASE_URL`):
```
... --execute
```
The script: reads each plaintext value via raw SQL, encrypts via the canonical `encryptWithCurrent(value, contextFor(model, field))` (V2 envelope, matching read-path context), writes back via raw parameterized UPDATE, emits a `PHI_RECORD_MIGRATED` audit event per row, and runs the all-skip assertion. It refuses to write a non-V2 envelope. Exit 0 = success; non-zero = STOP and investigate (snapshot is the rollback).

## 4. Re-census (verify zero plaintext)

Re-run the census query (the 2026-06-03 shape) against all 6 columns: **plaintext must be 0** on every column; `total` unchanged; the encrypted counts now appear under `v2`. A non-zero plaintext count means the backfill did not converge - STOP.

## 5. Login probe (decrypt path healthy)

Probe `POST https://api.tailrd-heart.com/api/auth/login` with a real account. Expect a **non-500**: HTTP 200 (correct credentials) OR 401-on-wrong-password BOTH prove the decrypt path is healthy (the outage is gone). A 500 means the read path still throws - STOP and investigate.

## 6. Read-path spot-check (Addition 2 - real client, no values)

Launch a second one-off run-task running the read-path spot-check: SELECT one migrated `Recommendation` row and one migrated `AuditLog` row through the REAL prisma client (`$extends` decrypt), assert decrypt succeeds, and log PASS/FAIL only (NO field values, no PHI). PASS on both = the writer/reader EncryptionContext agree end-to-end on production data (beyond the single User row the login probe exercises).

## 7. §18 credential rotation (the burned credential)

The plaintext smoke/verification credential `JHart@tailrd-heart.com` / `Demo2026!` appeared in diagnostic probes, chat, and logs - it is burned. ROTATE that account's password in production, and update the `SMOKE_TEST_*` GitHub secrets to a freshly-rotated value (see CLAUDE.md §18, now scrubbed to a secrets reference). The post-deploy smoke Login step (AUDIT-107) cannot pass until both AUDIT-108 (this backfill) is done AND the smoke credential matches a real, rotated account.

## 8. Idempotency / re-run safety

The script is safe to re-run: the candidate predicate `NOT LIKE 'enc:%' AND <> '' AND IS NOT NULL` excludes already-encrypted rows, so a second run finds 0 candidates and the all-skip assertion passes. A re-run that reports non-zero candidates indicates non-convergence and is a hard failure.

## 9. Rollback

If any step 3-6 fails: restore from the step-1 Aurora snapshot per the AUDIT-078 runbook. The backfill is also logically reversible (V2 envelopes decrypt to the original plaintext), but the snapshot is the authoritative rollback. After rollback, re-investigate before re-attempting. Register RESOLVED flips for AUDIT-108 ship as a separate closeout docs PR ONLY after steps 4-6 pass.
