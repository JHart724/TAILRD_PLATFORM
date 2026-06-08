# Beta-1 Phase 1 sign-off - data-integrity + disaster-recovery evidence chain (2026-06-07)

This document ties together the closed beta-1 Phase 1 work into a single evidence chain:
the PHI re-encryption correctness arc (AUDIT-016 §10.7 / AUDIT-113 / AUDIT-115 / AUDIT-116),
the production-verification ladder (AUDIT-107 rung 1 + rung 2, AUDIT-114), and the
AUDIT-078 disaster-recovery restore test executed against a real production snapshot.

It is a **point-in-time sign-off of the data-integrity + DR slice**, NOT a whole-platform
gate. Items that remain OPEN are listed explicitly in section 6.

---

## 1. PHI re-encryption correctness arc (AUDIT-016 §10.7 / 113 / 115 / 116)

- **2026-05-16 full rekey sweep** (CloudWatch `auditLogger` evidence): `targets=82` ->
  `rekeyed=495362 skipped=150 failed=0`. The 82 per-target lines reconcile exactly:
  **21 targets fully rekeyed (per-target counts sum to exactly 495,362)** + **3
  `BATCH_ALL_SKIPPED`** + **58 attempted=0** = 82. The current 29-target V2>0 inventory =
  24 V2-bearing on 2026-05-16 (21 rekeyed + 3 abort-skipped) + 5 gained-after = 29.
- **AUDIT-115** (rekey all-skip abort misfire on a front-loaded canonical distribution):
  RESOLVED, PR #357 (`8dad468`) - abort removed, cursor non-progress tripwire added.
- **AUDIT-113** (HF-worklist 500 on `patients.firstName` non-canonical-purpose V2 envelopes):
  RESOLVED 2026-06-06 - rekey on the post-#357 image `rowsRekeyed=5,780 / skipped=367 /
  failed=0`; verify probe 0 failures across all 4 worklist fields / 6,147 patients.
- **§10.7 carryover FULLY RESOLVED:** firstName was the sole real legacy tail; the other two
  abort-skipped targets (`audit_logs.{description,newValues}`) confirmed already-canonical,
  including a **2026-06-07 FULL canonical-decrypt probe (ECS task `76e6a35f`)** over every V2
  envelope of both = `description` 7,305/7,305 + `newValues` 7,101/7,101 = **14,406 / 0
  failures** (rules out a hidden third-purpose class).
- **Censuses:** STEP-4 `audit_logs.newValues` census (ECS task `abd4a721`) = v2 7,101 / v0 0 /
  v1 0 / non-v2 204 (203 JSON-null + 1 SQL NULL) / real-plaintext 0; 28-target JSON census
  (ECS task `0a1b286c`) = **v0=0 / v1=0 across ALL 28 json targets**, totals total 375,888 /
  v2 7,101 / JSON-null 7,507 / SQL-null 361,036 / real-plaintext 244.
- **AUDIT-116** (v0/v1-to-v2 JSON discovery filter ignored the JSON quote-prefix): RESOLVED,
  PR #360 (`3f2be31`) - kind-aware quoted filters + `#>>'{}'` extraction + 3 tests; downgraded
  MEDIUM (P2) -> LOW (P3) after the census proved 0 v0/v1 victims.

## 2. Production-verification ladder (AUDIT-107 option-(B))

- **Rung 1 (B1, loud-fail-only / AUDIT-114):** the smoke-failure alert path is verified
  end-to-end - PRs #361 (`ff84abe`) + #362 (`025366a`); synthetic run 27107094279 ->
  issue #363 filed. Docs PR #364 (`732ef72`).
- **Rung 2 (deploy-time smoke-hold = the B3 block-next-deploy posture, fail-open):** PR #365
  (`b23a8d4`). Reads the smoke **JOB** conclusion (never the workflow conclusion) so a held
  deploy's chained skipped-smoke cannot manufacture a false green. Docs PR #368 (`393308e`).
  - **Live evaluation:** real merge deploy `27108166282` - gate PROCEED -> green deploy ->
    chained smoke `27108278106` green.
  - **Synthetic legs** (all `gate_only_dryrun=true`; production never promoted): HOLD
    (`27108328676` + hold issue #367); **false-green immunity** (chained skipped smoke
    `27108333461` JOB=skipped -> fresh deploy `27108369016` STILL HELD); override
    (`27108386269`, audited on #367); clear-to-green (green smoke `27108402573` -> deploy
    `27108413018` PROCEED). Earlier green smoke baseline: `27107112514`.

## 3. AUDIT-078 disaster-recovery restore test (executed 2026-06-07/08)

End-to-end restore of a real production snapshot into a scratch cluster, verified read-only,
then torn down. **Zero `update-service` calls, zero writes to the production database.**

- **T0 baseline** (ECS RunTask on the current production image, counts-only read-only; evidence
  `docs/audit/sweeps/step6-t0-baseline-counts.js`, task `f9369758`).
- **Snapshot:** `beta1-phase1-signoff-20260607` (tags Purpose=beta1-phase1-signoff,
  HIPAA=6yr-retention, Arc=AUDIT-016-113-115-116); engine 15.15; KMS
  `arn:aws:kms:us-east-1:863518424332:key/ec93e66e-0f65-46bf-b132-11c9b1b7e637`; created 2026-06-08T00:12:02Z; **creation
  duration 257s**. Retained as the durable sign-off artifact.
- **Restore to scratch:** `tailrd-signoff-restore-20260607` (engine inherited 15.15; subnet
  group `tailrd-aurora-production-subnet-group`; SG `sg-0524ba8efe6058f7b`; production KMS key;
  deletion-protection OFF; ServerlessV2 Min 0.5; tags Purpose=...-restore-test, AutoDestroy=true)
  + db.serverless writer.
- **RTO (D4):** restore call 00:12:31Z -> first verified DB connection 00:32:30Z = **~1,199s
  (~20 min)**, **under the 30-min target**. (Cluster-available sub-leg ~812s / 13.5 min; the
  remainder is Fargate scheduling for the verify task.)
- **RPO (D5, set by snapshot cadence):** RTO is now measured; RPO is set by backup cadence and
  is stated explicitly here so the two are not conflated. Production cluster
  `tailrd-production-aurora` runs Aurora continuous backups with `BackupRetentionPeriod = 35`
  days (preferred window 09:00-10:00 UTC). Point-in-time restore is therefore available to any
  second within a rolling 35-day window (verified live at capture: EarliestRestorableTime
  2026-05-03T09:08:14Z, LatestRestorableTime 2026-06-08T00:59:30Z). The latest-restorable time
  trails wall-clock by Aurora's continuous-capture lag (single-digit minutes), so the routine
  recovery-point guarantee is **bounded data loss of roughly the last few minutes via PITR, NOT
  a daily-snapshot 24h window**. Manual HIPAA snapshots (e.g. `beta1-phase1-signoff-20260607`,
  6-yr retention) are coarse on-demand point artifacts layered on top: they extend retention,
  they do not set the routine RPO. DeletionProtection is ON in production.
- **Verification** (ECS RunTask, throwaway task-def `tailrd-backend:276` with `DATABASE_URL`
  env-overridden to the scratch writer, `PHI_ENCRYPTION_KEY` + taskRole + region unchanged;
  task `ec192573`; evidence `docs/audit/sweeps/step7-restore-verify.js`):

  ### (a) Row-count parity (restored vs T0)
  | Table | T0 | Restored | Rule | Result |
  |---|--:|--:|---|---|
  | patients | 6,147 | 6,147 | exact | PASS |
  | conditions | 225,439 | 225,439 | exact | PASS |
  | medications | 220,552 | 220,552 | exact | PASS |
  | recommendations | 8 | 8 | exact | PASS |
  | users | 1 | 1 | exact | PASS |
  | audit_logs | 7,316 | 7,316 | restored >= T0 (append-only) | PASS (no append in window) |
  | audit_logs.description V2 | 7,316 | 7,316 | tracks total | PASS |
  | audit_logs.newValues V2 | 7,101 | 7,101 | holds at 7,101 | PASS |

  All immutable tables matched EXACTLY; audit_logs matched exactly (no login event landed in
  the T0->snapshot window), satisfying the restored>=T0 append-only rule with zero delta.

  ### (b) Canonical-decrypt spotcheck (D3(d) - PHI recoverable from backup)
  Full probe over every V2 envelope of the two audit_logs PHI columns on the RESTORED copy:
  `audit_logs.description` **7,316/7,316 ok / 0 fail** + `audit_logs.newValues` **7,101/7,101
  ok / 0 fail** = **14,417 envelopes / 0 failures**. PHI is provably decryptable end-to-end
  from a restored backup using the same `PHI_ENCRYPTION_KEY` + KMS key + region.

- **Teardown + leak verification:** writer + cluster deleted (`--skip-final-snapshot`);
  `describe-db-clusters` -> `DBClusterNotFoundFault`; `describe-db-instances` ->
  `DBInstanceNotFound`; `describe-db-cluster-automated-backups` ->
  `DBClusterAutomatedBackupNotFoundFault` (no leaked backups); throwaway task-def `:276`
  deregistered (latest ACTIVE reverts to `:275`); scratch DATABASE_URL secret force-deleted
  (`ResourceNotFoundException`). Cost: ~20 min of Serverless v2 (Min 0.5 ACU) + small storage
  proration, well under $1.

### Design choice (IAM-respecting) and a known transient
The scratch verification was wired with a **throwaway task-def `tailrd-backend:276` carrying
`DATABASE_URL` as an ECS environment OVERRIDE** to the scratch writer, reusing the existing
taskRole / execRole / region / `PHI_ENCRYPTION_KEY` unchanged. This was deliberate: it performs
**no IAM mutation** (no new secret, no new policy, no role or grant edit), so a DR test cannot
drift production IAM posture.

Known transient (recorded, not hidden): a `DATABASE_URL` passed as an ECS env override is
**visible in plaintext via `ecs:DescribeTasks`** (the container `overrides` block) for the life
of the task. It is acceptable here because (a) the credential pointed ONLY at the scratch
cluster, which is now destroyed, so the value is dead, and (b) the task was short-lived and
read-only. Future restore-test runbooks should either **accept the same transient explicitly**,
or **pre-provision a scratch secret path that already sits within the execRole's existing
Secrets Manager grants** and pass it as a `secrets` reference instead of an env override (which
keeps the value out of DescribeTasks) - chosen so it still requires no IAM mutation.

### Leak verification (independent re-check 2026-06-08, live AWS describe, read-only)
Re-confirmed after teardown (us-east-1):
- Scratch cluster `tailrd-signoff-restore-20260607`: `describe-db-clusters` ->
  `DBClusterNotFoundFault`.
- Scratch writer `tailrd-signoff-restore-20260607-writer`: `describe-db-instances` ->
  `DBInstanceNotFound`.
- **No orphan snapshot from the scratch cluster's own deletion** (`--skip-final-snapshot` was
  set on both deletes): `describe-db-cluster-snapshots --db-cluster-identifier <scratch>` =
  `[]`; the cluster-snapshot sweep for any id containing `signoff-restore` = `[]`;
  `describe-db-cluster-automated-backups <scratch>` -> `DBClusterAutomatedBackupNotFoundFault`;
  the instance-snapshot sweep for `signoff` = `[]`. Nothing to delete.
- The retained manual snapshot `beta1-phase1-signoff-20260607` is sourced from the PRODUCTION
  cluster (`DBClusterIdentifier = tailrd-production-aurora`, manual, available, 15.15); it is
  the intended durable sign-off artifact, NOT an orphan of the scratch cluster.
- Scratch DATABASE_URL secret: `describe-secret` -> `ResourceNotFoundException`; the name sweep
  for signoff / restore / scratch = `[]`. Force-delete removes a secret immediately, so absence
  is the deleted state.
- Task definitions: the latest ACTIVE `tailrd-backend` revision is **`:275`**; the throwaway
  `:276` is `INACTIVE` (deregistered); the active `:275` carries no `signoff-restore` reference
  (its `DATABASE_URL` value was not echoed, to avoid leaking the production credential).
- Artifact sweep: `/tmp/scratch` is absent; no temp file carries the scratch endpoint;
  `signoff-restore` appears in the repo only as the cluster NAME inside committed evidence docs
  (no `rds.amazonaws.com` endpoint is committed anywhere). `docs/audit/sweeps/step7-restore-verify.js`
  is retained as evidence and reads `DATABASE_URL` from the environment (no hardcoded host).

### Note on the 7,305 -> 7,316 census-to-T0 delta (so future readers do not read it as a discrepancy)
The 2026-06-07 censuses recorded `audit_logs` total 7,305. The T0 baseline (2026-06-07, later)
recorded 7,316 - **+11 rows**. This is dated **append-only growth from the AUDIT-114/AUDIT-107
rung-1/rung-2 verification smoke LOGIN events** (each smoke dispatch logs in, writing audit_log
rows; their `description` is V2-encrypted by the canonical middleware -> description V2 also
7,316, while `newValues` for those rows is JSON-null -> newValues V2 holds at 7,101). It is NOT
a discrepancy; the restored copy (7,316) equals T0 (7,316) exactly.

## 4. Script-defect fixes shipped with this sign-off

`infrastructure/scripts/audit-078/03-execute-restore-test.sh` (surfaced by the read-only
inventory, fixed in this PR):
- Removed the stale `--engine-version 15.14` pin (production + snapshots are now 15.15;
  inherit the version from the snapshot).
- D3(b) now queries the real Prisma `@@map` table `patients` (was `"Patient"`, which does not
  exist) and **removed the `2>/dev/null || printf '0'` mask** so a failed check fails LOUD (the
  silent-success class) instead of silently reporting 0.
- Parameterized the snapshot identifier (`SNAPSHOT_IDENTIFIER` env pins a named manual snapshot;
  default newest automated).

## 5. AUDIT-078 status

**RESOLVED 2026-06-07.** The remediation-step-3 end-to-end restore test executed: schema +
EXACT row-count parity + full PHI-decrypt (14,417/0) on a restored production snapshot, RTO
~20 min (<30 min target), clean teardown with leak verification. Closes the HIPAA
§164.308(a)(7)(ii)(B) disaster-recovery testing gap. Script defects fixed in this PR.

## 6. Explicitly OPEN (NOT claimed closed by this sign-off)

- **AUDIT-022** - legacy JSON PHI not encrypted at rest (244 real-plaintext JSON rows / 12
  columns confirmed by the 28-target census). Tooling shipped; **production backfill execution
  remains operator-side / pending**.
- **AUDIT-111** - staging cluster undeployable (~1 month, Prisma P3009); the AUDIT-107
  B2-literal (pre-merge required check) rung is gated on this + AUDIT-025 + AUDIT-024.

## 7. Operator decision (dated 2026-06-07)

**Full Phase 0 (0A + 0B + 0C complete) remains the v2.0 authorship gate.** This Phase 1
sign-off certifies the data-integrity + DR slice; it does NOT resequence or substitute for the
full Phase 0 completion gate. Resequencing was considered and **rejected** - the v2.0 gate is
unchanged.
