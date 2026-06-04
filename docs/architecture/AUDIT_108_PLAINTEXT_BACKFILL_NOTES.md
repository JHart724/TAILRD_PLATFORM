# AUDIT-108 Plaintext-to-V2 PHI Backfill - Design Note

**Author:** Jonathan Hart
**Status:** APPROVED 2026-06-03 (PAUSE A) with two additions (see §8.1 + §8.2); implementation in PAUSE B. NOTHING executes against production until PAUSE C approval.
**Date:** 2026-06-03
**Finding:** AUDIT-108 (CRITICAL P0) - total production authentication outage
**Companions:** `docs/audit/AUDIT_FINDINGS_REGISTER.md` (AUDIT-108 / AUDIT-016 / AUDIT-015), `docs/runbooks/AUDIT_078_AURORA_BACKUP_RESTORE_RUNBOOK.md` (snapshot/restore), `backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts` (rekey precedent)

---

## 1. Problem

Production login returns HTTP 500 on every found-User read: the fail-closed decrypt control (`backend/src/middleware/phiEncryption.ts:185`, AUDIT-015) throws on a value lacking the `enc:` prefix, and `User.firstName`/`lastName` became encryption-expected in PR #263 (`phiEncryption.ts:128`) without a plaintext-to-ciphertext backfill of existing rows. The V0/V1->V2 rekey migration (`audit-016-pr3-v0v1-to-v2.ts`) re-wraps ALREADY-encrypted envelopes only; it does not encrypt plaintext. This note designs the missing targeted plaintext->V2 backfill.

## 2. Scope (from the 2026-06-03 production data-state census)

Exactly 6 columns / 202 distinct rows / 219 plaintext field-values:

| table.column | model.field | plaintext rows |
|---|---|--:|
| `users.firstName` | User.firstName | 1 |
| `users.lastName` | User.lastName | 1 |
| `recommendations.title` | Recommendation.title | 8 |
| `recommendations.description` | Recommendation.description | 8 |
| `recommendations.evidence` | Recommendation.evidence | 8 |
| `audit_logs.description` | AuditLog.description | 193 |

Distinct rows: users 1 + recommendations 8 + audit_logs 193 = 202. Field-values: 2 + 24 + 193 = 219. The census found ZERO plaintext in `patients.*` (100% V2) and ZERO `v0`/`v1` envelopes anywhere, so the scope is exactly these 6 columns - no other column holds plaintext.

## 3. Mechanism

Per (table, model, column) target, per row whose value is plaintext:
1. **Read** the plaintext value via `prisma.$queryRawUnsafe` (raw SQL bypasses the `$extends` model-decrypt path entirely, so the AUDIT-015 throw never fires during the read).
2. **Encrypt** via the canonical primitive (see §4) to a V2 envelope with the correct per-record EncryptionContext.
3. **Write back** via raw `UPDATE "<table>" SET "<col>" = $1 WHERE id = $2` through `$executeRawUnsafe` (raw write bypasses the `$extends` encryption middleware, preventing double-encrypt - the eighth-precedent lesson from AUDIT-016 PR3).

**No `PHI_LEGACY_PLAINTEXT_OK` anywhere.** The rejected global stopgap stays rejected in migration form: the script never sets that env flag, never disables the fail-closed control. It reads plaintext via raw SQL precisely so it does not need the flag.

## 4. Canonical encryption primitive (coordinated-migration discipline)

Import and reuse the codebase primitive; NEVER reimplement envelope construction:
- `encryptWithCurrent(plaintext, context)` from `backend/src/services/keyRotation.ts:251` (emits a V2 envelope via `kmsService.envelopeEncrypt`, KMS-wrapped DEK + per-record EncryptionContext) - the same function the rekey migration uses.
- `EncryptionContext` (`keyRotation.ts`): `{ service: 'tailrd-backend', purpose: 'phi-encryption', model: '<PascalCaseModel>', field: '<column>' }`.

The context MUST match what the read-path decrypt expects per (model, field), so that after the backfill the normal `$extends` read path decrypts these rows successfully. Reusing the identical primitive + context shape the read path was built against guarantees this. Requires `PHI_ENVELOPE_VERSION=v2` + `AWS_KMS_PHI_KEY_ALIAS` in the execution environment (the production task already carries these); the script asserts them in pre-flight and refuses to write a non-V2 envelope (re-parse check, per the rekey precedent).

## 5. Idempotency + loop safety

Candidate predicate per column: `WHERE "<col>" IS NOT NULL AND "<col>"::text <> '' AND "<col>"::text NOT LIKE 'enc:%'`. This is self-discriminating: once a row is encrypted (`enc:v2:...`), it leaves the predicate, so re-runs are safe and converge - the infinite-loop class is structurally excluded (an encrypted row can never re-enter the candidate set). Belt-and-suspenders per the rekey precedent: an **all-skip sanity assertion** - on a second consecutive run (or a post-execute re-run) the candidate count MUST be 0 across all 6 columns; a non-zero count on re-run is a hard failure (indicates the predicate or the write is not converging).

## 6. Design decision recorded: `audit_logs.description` encrypt-in-place

The 193 plaintext `audit_logs.description` rows are encrypted-in-place (read plaintext -> V2 -> UPDATE), NOT left as-is, NOT deleted.
- **Rationale for encrypting:** content is preserved reversibly (V2 envelope decrypts back to the original on read); these 193 rows currently 500 on any AuditLog read through the `$extends` path, so leaving them plaintext leaves a standing 500 path on the audit surface, not just login. Encrypting closes that path while preserving the audit record.
- **The migration itself emits an audit event** (`PHI_RECORD_MIGRATED` per the rekey precedent's best-effort audit pattern), so the backfill is itself audit-trailed.
- **Alternative considered + rejected:** leaving the audit_logs rows plaintext (or scrubbing them) - rejected because it either preserves a standing 500 path (leave) or destroys audit history (scrub). Encrypt-in-place is the only option that both restores readability and preserves the record.

## 7. Modes + execution mechanism

- `--dry-run` (default): report candidate counts per column (the §2 numbers: expect 1/1/8/8/8/193), change NOTHING. No reads of plaintext values beyond what the count predicate needs; counts only.
- `--execute` (gated by an explicit env confirmation token, e.g. `AUDIT_108_EXECUTE_CONFIRMED=yes`, per the AUDIT-016 PR3 / AUDIT-022 three-layer gate): perform the read/encrypt/write per §3.
- **Execution mechanism:** ECS `run-task` command override on the **post-merge image** (the 2026-06-03 census precedent: one-off ephemeral task, existing task definition + command override, same network config as the service, no service/taskdef/cluster modification). Never run against production from a developer machine.

## 8.1 Addition 1 (approved) - end-to-end $extends read-path round-trip test

A jest test must prove the backfill's WRITER agrees with the app's READER, not merely with `decryptAny`. Encrypt a fixture value with the backfill's exact primitive + EncryptionContext, write it, then read it back through the REAL app Prisma client composition (`backend/src/lib/prisma.ts` - tenant guard + phiEncryption `$extends`), NOT through `decryptAny` directly. Assert the decrypted value equals the original plaintext. This catches any writer/reader EncryptionContext drift (the spotcheck-decrypt lesson: a writer that encrypts with a context the reader does not reconstruct produces rows that pass a `decryptAny` test but 500 in production). The test is the authoritative proof that backfilled rows will decrypt on the actual login/read path.

## 8.2 Addition 2 (approved) - PAUSE C read-path spot-check via run-task

After `--execute`, a second one-off run-task runs a spot-check script using the REAL app client (not `decryptAny`): select ONE migrated `Recommendation` row and ONE migrated `AuditLog` row through the app read path (`$extends` decrypt), assert decrypt succeeds, and log PASS/FAIL only - NO field values, no PHI. This is the production analogue of the §8.1 unit test: it confirms on real production data that the writer/reader contexts agree end-to-end, beyond the login probe (which only exercises the single User row). Counts/PASS-FAIL only to CloudWatch.

## 8. Verification plan (PAUSE C, post-execute)

1. **Re-census** (same counts query as 2026-06-03): `plaintext` must be 0 across all 6 columns; `total` unchanged; the encrypted counts move into `v2`.
2. **Login probe** against `api.tailrd-heart.com`: expect a non-500 - HTTP 200 (correct credentials) OR 401-on-wrong-password BOTH prove the decrypt path is healthy (the 500 is gone). A 500 means the backfill did not fix the read path.
3. **Smoke reconciliation:** confirm the next deploy's post-deploy smoke Login step status and reconcile against the `SMOKE_TEST_*` secrets question (AUDIT-107). Note: a healthy decrypt path is necessary but not sufficient for the smoke to pass - the smoke ALSO needs valid `SMOKE_TEST_*` credentials matching a real account (AUDIT-107 detection-gap), and the smoke uses `curl -sf` (hard-fails on any HTTP >= 400) vs §18's `curl -s` (tolerates a valid error). Both reconciliations are AUDIT-107 scope, tracked separately.

## 9. Rollback

- **Aurora snapshot immediately before `--execute`** (manual snapshot of `tailrd-production-aurora`; verify `available` before proceeding). Restore procedure referenced from `docs/runbooks/AUDIT_078_AURORA_BACKUP_RESTORE_RUNBOOK.md`.
- The backfill is also logically reversible without a restore (the V2 envelopes decrypt back to the original plaintext), but the snapshot is the authoritative rollback for any unexpected state.

## 10. Out of scope / explicit non-targets

- **No V0/V1 remnant migration:** the 2026-06-03 census found ZERO `v0`/`v1` envelopes across all 56 columns - every encrypted value is already V2. The V0/V1->V2 rekey (AUDIT-016 PR3) has no remaining target. (Register note to be added.)
- **`patients.*` not touched:** 100% V2, zero plaintext - the outage does not widen to patient reads.
- **No global control change:** no `PHI_LEGACY_PLAINTEXT_OK`, no `phiEncryption.ts` edit, no `PHI_FIELD_MAP` change, no service/taskdef/cluster/env modification beyond the one-off run-task.
- **AUDIT-107 (smoke account + blocking posture) and AUDIT-109 (500 error logging) are separate findings**, not closed by this backfill.

## 11. Open items carried to PAUSE B / C

- PAUSE B: migration script + jest tests (plaintext->V2 fixture round-trip + non-SELECT/predicate guards) + 9-section operator runbook + the PR riders (CLAUDE.md §18 credential scrub + rotation, AUDIT-016 PR3 zero-remnant register note, §18-vs-smoke pass-criteria reconciliation under AUDIT-107, AUDIT-108 census-table evidence update, BUILD_STATE sync).
- PAUSE C: snapshot -> dry-run (expect 193/8/8/8/1/1) -> operator execute approval -> execute -> re-census -> login probe -> RESOLVED closeout docs PR only after verification passes.
- **§18 credential is burned:** the plaintext `JHart@tailrd-heart.com` / `Demo2026!` in CLAUDE.md §18 was used in diagnostic probes and appears in chat/logs; PAUSE B scrubs it to a secrets reference and the runbook requires rotating that password.
