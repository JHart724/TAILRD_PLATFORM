# 🚀 TAILRD Platform - Production Readiness Status

> **Authoritative current state below supersedes the aspirational narrative further down this file.** The sections after "Current Production & Deployment State" predate the April 7 2026 production launch and are kept for historical context only.

## Current Production & Deployment State (authoritative; relocated from CLAUDE.md section 9 on 2026-06-01)

This block was moved out of `CLAUDE.md` to keep the always-loaded project-instruction file under the 40k TUI performance threshold. It is the canonical deployment-state record; update it here after every cutover or deploy milestone.

**Production is live (as of April 7, 2026):**
- [x] ECS Fargate (backend) - api.tailrd-heart.com
- [x] Aurora Serverless v2 PostgreSQL (cutover from RDS 2026-04-29T00:51:55Z)
- [x] CloudFront + ALB
- [x] ElastiCache Redis
- [x] Secrets Manager (JWT_SECRET, PHI_ENCRYPTION_KEY, DATABASE_URL)
- [x] CI/CD: GitHub Actions -> ECR -> ECS (new task def per commit)
- [ ] Frontend deployment (Netlify/Vercel with REACT_APP_USE_REAL_API=true)
- [ ] DNS for app.tailrd-heart.com (frontend)

**Last known working task definition:** `tailrd-backend:<!--@checked deploy.lastKnownGoodTaskDef-->442<!--/@checked-->` (2026-08-11, BAA_GUARD_MODE=strict flip - AUDIT-214/215 fail-closed BAA guard now LIVE IN PRODUCTION. Env-only derivation from `:441` via `register-task-definition` + `update-service`: added `BAA_GUARD_MODE=strict` to the container environment, SAME digest-pinned image `sha256:d96df987...` as `:441`, NO image rebuild and NO deploy.yml dispatch (deploy.yml derives each task-def from the live revision and carries env forward, so the flip survives future deploys; rollback = a revision without the var, which `parseBaaGuardMode` defaults to audit). Rollout COMPLETED 1/1, container HEALTHY, /health healthy. ENFORCEMENT PROVEN LIVE two ways on `:442`: (1) POSITIVE probe - 6 enforced `Patient.count` queries across 57,289 patient rows (6,132 + 25,571 + 25,571 + 10 + 5 + 0) on all six tenants returned 0 throws + 0 PHI_FLOW_BLOCKED events (permit holds for the classified tenants); (2) NEGATIVE CONTROL - `Patient.count` on a non-existent tenant THREW `BAANotExecutedError` (message 'BAA not executed ...; PHI flow blocked per §164.308(b)(1)') and emitted 1 PHI_FLOW_BLOCKED event, proving the fail-closed throw path is live not merely configured. Precondition: the classify executed 2026-08-11T01:41:58Z set `isSyntheticData=true` on all six tenants with `baaExecuted` UNTOUCHED (false everywhere - no fabricated BAA). ROLLBACK: `update-service` to `:441` (audit), env-only, same image, ~1-2 min rollout; during that window only in-flight requests on the strict task can throw. Prior: `tailrd-backend:441` (2026-08-11, deploy-bearing Build & Deploy dispatch at origin/main HEAD `99d9aab` = PR #551; DIGEST-PINNED to `sha256:d96df987...`, AUDIT-221 registry gate PASSED baked==expected==`99d9aab`, smoke-hold gate PROCEEDED reading the green smoke JOB conclusion of run 31446804698; applied migration `20260809000000_audit_215_hospital_is_synthetic_data` (the `Hospital.isSyntheticData` column, NOT NULL DEFAULT false) cleanly at rollout, COMPLETED 1/1 HEALTHY - the deploy that shipped the #546 isSyntheticData column + guard-read into production). Prior: `tailrd-backend:440` (2026-08-09, RECORDED IN ARREARS - a deploy predating the AUDIT-213 smoke-principal work whose §9 pointer bump was not filed at merge; verified from task-def metadata: registeredAt 2026-08-09T03:03Z UTC, image `sha256:1a585562...`, MFA_ENFORCED=true, BAA_GUARD_MODE unset (audit); its originating commit was NOT independently pinned this pass - characterized by metadata + the operator's pre-AUDIT-213 framing). Prior: `tailrd-backend:439` (2026-08-09, MFA_ENFORCED activation - AUDIT-009/240 runbook STEP 3: env-only derivation from `:438` (added `MFA_ENFORCED=true` to the container environment), SAME digest-pinned image `sha256:d06dcc4a...` as `:438` - NO image rebuild. Registered via `register-task-definition` + `update-service`; rollout COMPLETED 1/1, container HEALTHY, /health healthy; a read-only runtime probe on the deployed image printed `MFA_ENFORCED value="true"`, so `isMfaEnforced()` (auth.ts:27, reads `process.env.MFA_ENFORCED === 'true'` at call-time) returns true. The `middleware/auth.ts:280` enrollment-forcing block is now ACTIVE for privileged roles (`MFA_ENFORCED_ROLES` = SUPER_ADMIN + HOSPITAL_ADMIN): an UNENROLLED privileged account gets 403 `requiresMfaEnrollment` on its next protected request; non-privileged roles are TRACKED-NOT-FORCED. ACCOUNT STATE: exactly ONE privileged account is enrolled - the SUPER_ADMIN (JHart, `UserMFA.enabled=true`), UNAFFECTED by `:280` (skipped on `!enabled=false`) and gated only by the pre-existing `:290` verification block, so the operator is NOT locked out; any OTHER privileged account is now forced to enroll on next request. DURABILITY: the flip survives future deploys - `.github/workflows/deploy.yml` (lines 204-218) derives each task-def from the current live revision via `describe-task-definition` and mutates ONLY the image, so the environment (incl. `MFA_ENFORCED`) carries forward with no template change. ROLLBACK: register a revision without the var (`isMfaEnforced()` defaults OFF for any value != 'true'), no image change. Prior: `tailrd-backend:438` (2026-08-09, PR #543 AUDIT-242 RESOLVED closeout, docs-only auto-deploy, image `sha256:d06dcc4a...`). Prior: `tailrd-backend:437` (2026-08-08, deploy-bearing merge PR #542 AUDIT-242 real-TOTP fix: declared speakeasy 2.0.0 + qrcode 1.5.4, container REBUILD, digest `sha256:c367d916...` = commit `bf73f9e`; three closure checks clean - startup fallback warning GONE, real-library test GREEN in CI, read-only run-task probe printed `MFA_LIBCHECK_PRESENT speakeasy=2.0.0 qrcode=1.5.4 totpVerify=function toDataURL=function`). Prior: `tailrd-backend:425` (2026-08-05, deploy-bearing merge PR #529 AUDIT-230 supersede ordering: DIGEST-PINNED to the verified registry artifact `tailrd-backend@sha256:9f2fe512...` = commit `c60be4c` = origin/main HEAD; the AUDIT-221 registry gate PASSED with `baked=[c60be4cb008da5ba97753db8dce1b987f58ec83b] expected=[c60be4cb008da5ba97753db8dce1b987f58ec83b]`, rollout COMPLETED 1/1, container HEALTHY, and the runtime emit on `:425` confirms `APP_GIT_SHA` + `resolveBuildSha` both == `c60be4c` (no migration this deploy). AUDIT-230 (the TrialMatch supersede path INSERTED the replacement row before RETIRING the row it replaced, transiently putting two rows in the `WHERE supersededAt IS NULL` window of the partial unique index - the code comment stated the correct order and the implementation did the reverse) is RESOLVED: one ordered writer operation `supersedeThenInsert` makes insert-first UNREPRESENTABLE at the pure layer, wrapped in a `$transaction` so the correct-order window in which a pair would have ZERO current rows is not reachable, with the retire CONDITIONAL on the row still being current. 13 new tests in two layers - structural (runs everywhere) plus REAL POSTGRES with the index DDL read out of the migration, because CI's `prisma db push` does NOT create a PARTIAL index and a test trusting the CI schema would have passed while asserting nothing. LIVE PROOF on `:425` under Aurora snapshot `audit-230-retry-20260805-004600`, and it was NOT a clean re-run: the 3 rows the failed pass left at the old build are exactly the pairs whose verdicts had moved, so they were the first traffic the fixed path ever carried. The run COMPLETED in 8m10s with `matchesSuperseded 3` / `matchesConfirmed 102281` / completeness 1.0. All three supersessions were on Residual Lipid Risk, **ELIGIBLE -> INDETERMINATE**, discriminated **`clock`**, each replacement carrying `indeterminateSignals ["ldl"]` - and the clock attribution is VERIFIED not assumed, since `criteriaVersion` reads `9949e8f3d96a2424` on both the retired and the replacement row. Totals 102,287 / 102,284 current / 3 superseded; **ZERO duplicate current pairs** under the first real supersession the index has ever seen; current-row `buildSha` a SINGLE BUCKET at `c60be4c`. The transaction proven live: each retired row keeps its original verdict, `evaluatedAt`, `criteriaVersion` and `buildSha`, and its `supersededBy` was dereferenced to a real row - no dangling pointers. `GET /trials/summary` then returned `stale: false` with NO axis firing in 498ms, the moved verdicts visible as Residual Lipid Risk ELIGIBLE 214->211 / INDETERMINATE 559->562. Note `matchesCreated 0` is CORRECT: `created` counts new-pair creates only and supersede replacements count under `superseded`; the row-count delta is the insertion evidence. INTERIMS RECORDED IN ARREARS (docs-only auto-deploys whose pointer bumps were not filed at merge): `:423` = `68816ae` = PR #527 trials-module closeout; `:424` = `990f1e0` = PR #528 phase-directive clarification + AUDIT-148 ruling. Prior `:422` retained below per supersede-not-overwrite.) Prior: `tailrd-backend:422` (2026-08-04, deploy-bearing merge PR #526 trials PR 3 endpoint pivot: DIGEST-PINNED to the verified registry artifact `tailrd-backend@sha256:cab8dcf4...` = commit `49d0bae` = origin/main HEAD; the AUDIT-221 registry gate PASSED with `baked=[49d0bae48c6195e2beb8d971c9f13bc241a426da] expected=[49d0bae48c6195e2beb8d971c9f13bc241a426da]`, rollout COMPLETED 1/1, container HEALTHY, and the runtime emit on `:422` confirms `APP_GIT_SHA` + `resolveBuildSha` both == `49d0bae` (no migration this deploy). The trials read path PIVOTED from evaluate-per-request to indexed reads of persisted verdicts (identity design section 3.5(e)): `/trials/summary` is now a `groupBy` over current rows and `/trials/:trialId/eligible-patients` a keyset read, with the 20s budget, the `complete: false` flag and the Executive sample banner all RETIRED and replaced by an as-of envelope carrying three independent staleness axes (age 36h / build / criteria per R2/R1/R3). LIVE PROOF on `:422`: the summary returned the persisted distribution EXACTLY (HFrEF 68/1,184/24,319, Lipid 214/559/24,798, PH and ATTR-CM 0/0/25,571, denominator 25,571) in 915ms against the prior shape's 23.5s partial; `staleReasons` read `["build"]` UNPROMPTED (stored `edac1ae` vs deployed `49d0bae`) with the age axis correctly quiet inside the 36h bound - the R3 mechanism firing on its own rather than on a fixture; the eligible-patients endpoint served 3 pages of 100 in 348/179/147ms with the AUDIT-227 ordering property preserved (300 ids, 300 unique, strictly ascending) and per-criterion detail present off the stored row; and the referral path was verified LIVE from the DEPLOYED artifact as still evaluating per-request (`refer_reads_trialMatch` FALSE, `route_has_any_trialMatch_write` FALSE across the route), so no read can trigger a refresh. Deploy-inertness intact: `trial_matches` 102,284 / 0 superseded, `trial_match_runs` 3. INTERIMS RECORDED IN ARREARS (docs-only auto-deploys whose pointer bumps were not filed at merge): `:420` = `cf5fb85` = PR #524 AUDIT-228 RESOLVED closeout; `:421` = `0d460a1` = PR #525 AUDIT-229 parsed-canonical snapshot correction. Prior `:419` retained below per supersede-not-overwrite.) Prior: `tailrd-backend:419` (2026-08-04, deploy-bearing merge PR #523 AUDIT-228 bind-variable chunking: DIGEST-PINNED to the verified registry artifact `tailrd-backend@sha256:f9977f94...` = commit `edac1ae` = origin/main HEAD; registry gate PASSED - the pinned digest's own ECR tag reads `edac1aee6b22e50078e5d8a5b34fb005167859f1` - rollout COMPLETED 1/1, container HEALTHY, runtime emit re-verified in-VPC as `buildSha=edac1aee...`, and the startup log read `No pending migrations to apply.` (no migration this deploy). AUDIT-228 (the TrialMatch refresh runner's CONFIRM path batched every confirmation into one `updateMany` whose `id: { in: [...] }` accumulated across ALL patient batches - 102,284 ids -> 102,287 bind variables against PostgreSQL's 32,767 maximum, on the STEADY-STATE path that only the first run could avoid) is RESOLVED: chunked at `ID_CHUNK_SIZE = 5000` (~6.5x headroom, sized for headroom not at the ceiling), the write phase moved behind an injected writer so the untested seam between right decisions and the wrong write became addressable, applied-not-planned tallies, and `closeActiveRunFailed` so ANY throw after the run record opens closes it FAILED rather than stranding it. 16 new tests, 4 of which fail against the restored pre-fix shape. LIVE PROOF on `:419` under Aurora snapshot `audit-228-gated-20260804-004643`: run record 2 (stranded at RUNNING by the original crash) closed FAILED with finishedAt and counts unchanged - the refusal path verified THREE ways first (non-RUNNING record NO-OP, missing `--run-id` abort, post-execute re-run NO-OP) - and then the second real refresh pass, the exact shape that died, completed in **4m55s** (vs ~14m for run 1) with `matchesConfirmed 102284` EXACTLY, created 0, superseded 0, evaluated 25,571/25,571, completeness 1.0, outcome COMPLETED, and no planned-vs-applied divergence. The row-level check that matters more than the tally: the post-run `buildSha` distribution is a SINGLE bucket of 102,284 at `edac1ae` (pre-run all `f84e058`), so no chunk boundary skipped a row. Partial unique index held with 0 duplicate current pairs; spot-checks advanced `lastConfirmedAt` while `evaluatedAt` / `status` / `criteriaVersion` held. INTERIMS RECORDED IN ARREARS (their pointer bumps were not filed at merge; provenance established by mapping each revision's pinned digest to the SHA-tagged image pushed alongside it, corroborated by task-def `registeredAt` landing 20-25s after each push): `:416` = `86b1f04` = PR #520 AUDIT-227-closeout docs; `:417` = `9ecaacd` = PR #521 TrialMatch identity design doc; `:418` = `f84e058` = PR #522 identity implementation PR 1 - which is the revision the first evaluation run and the failed idempotency pass both ran on. Prior `:415` retained below per supersede-not-overwrite.) Prior: `tailrd-backend:415` (2026-08-03, deploy-bearing merge PR #519 AUDIT-227 trials pagination + summary/referrals endpoints + Executive/ServiceLine wiring: DIGEST-PINNED to the verified registry artifact `tailrd-backend@sha256:6eacc828...` = commit `4a8f953` = origin/main HEAD; registry gate PASSED, rollout COMPLETED 1/1, HEALTHY, /health healthy, no migration this deploy. AUDIT-227 RESOLVED with a live proof on `:415` using the DEPLOYED handlers - 3 pages of 100 in 3.6s/2.4s/2.3s where the old unbounded shape OOM'd (exit 137 at 3,000 patients), 300 ids walked with 0 duplicates and no skips; budgeted summary returned complete:false + patientsEvaluated 1,200; referrals an empty tenant-scoped array. Interim `:414` was the #518 docs auto-deploy, in arrears. Prior `:413` retained below per supersede-not-overwrite.) Prior: `tailrd-backend:413` (2026-08-01, deploy-bearing merge PR #517 AUDIT-226 med-criterion honesty + trials Slice 1: DIGEST-PINNED to the verified registry artifact `tailrd-backend@sha256:56b4fcbc...` = commit `794fecf` = origin/main HEAD; registry gate PASSED, rollout COMPLETED 1/1, HEALTHY, /health healthy, no migration this deploy. AUDIT-226 RESOLVED with a live proof on `:413` using the DEPLOYED matcher over 25,571 patients - HFrEF 68/24,319/1,184 with 491 named med signals, Lipid 218/24,798/555 with the 1 flipped verdict, both exactly as predicted. Interims in arrears: `:410` (#514), `:411` (#515), `:412` (#516), all docs auto-deploys. Prior `:409` retained below per supersede-not-overwrite.) Prior: `tailrd-backend:409` (2026-07-31, deploy-bearing merge PR #513 Tranche 3 Slice 1 PCI/CABG threading: DIGEST-PINNED to the verified registry artifact `tailrd-backend@sha256:3252a52e...` = commit `cd86cee` = origin/main HEAD; registry gate PASSED (baked==expected==`cd86cee`), rollout COMPLETED 1/1, HEALTHY, /health healthy, runtime emit on the gated execute == `cd86cee` (no migration this deploy). The Slice 1 re-detection EXECUTED on `:409` under snapshot `audit-t3s1-redetect-20260731-100559`: created 48 (051 = 18 == the DRIFT-55 pre-verified prediction exactly, substance-checked 18/18; 061 = 0 as predicted; 30 clock-window), updated 63,150, resolved 20 all-clock with reasons, clinician-touched 0, the index held, GapDetectionRun row 2 COMPLETED. Stored gaps 67,948 -> 67,996; open 63,170 -> 63,198; coverage 312/603 (51.7%). Interim `:408` was the #512 docs auto-deploy, in arrears. Prior `:407` retained below per supersede-not-overwrite.) Prior: `tailrd-backend:407` (2026-07-30, deploy-bearing merge PR #511 AUDIT-223 partial-unique-index follow-up: DIGEST-PINNED to the verified registry artifact `tailrd-backend@sha256:b0aab7dd...` = commit `1bbc686` = origin/main HEAD; registry gate PASSED (baked==expected==`1bbc686`), migration `20260730223000_audit_223_open_gap_unique` applied cleanly at rollout (the ONLY migration this deploy), rollout COMPLETED 1/1, HEALTHY, /health healthy, runtime emit on `:407` == `1bbc686`, `therapy_gaps_patient_rule_open_uniq` verified live in pg_indexes name + predicate verbatim. The AUDIT-223 arc COMPLETED across `:406`/`:407` in one gated session under snapshot `audit-223-dedupe-run-20260730-221536`: the shadow dedupe executed on `:406` (185/185 re-derived pairs resolved keep-most-recent, idempotent), the index landed on `:407` only after a pre-merge zero-duplicates re-verify across ALL tenants (DRIFT-58 sequencing honored), and the FIRST RESOLVE-ENABLED re-detection executed on `:407` self-gated on buildSha (evaluated 25,571; created 74, updated 63,096, resolved 464 == the re-derived two-clock prediction EXACTLY, all `clock`; clinician-touched resolved 0; retired 4,129 + deduped 185 untouched; the index held under the run; GapDetectionRun COMPLETED completeness 1.0 - the AUDIT-224 machinery's first live proof). Stored gaps 67,874 -> 67,948; open 63,560 -> 63,170 - AUDIT-223 RESOLVED. Interims recorded in arrears: `:405` was the #509 AUDIT-222-closeout docs auto-deploy; `:406` was the #510 PR-B deploy (resolve semantics + dedupe runner + GapDetectionRun; exactly one migration `20260730000000_audit_224_gap_detection_run` applied; the index deliberately re-sequenced out per DRIFT-58). Prior `:404` retained below per supersede-not-overwrite.) Prior: `tailrd-backend:404` (2026-07-29, deploy-bearing merge PR #508 AUDIT-222 orphan-retirement runner + throughput-metric fix: DIGEST-PINNED to the verified registry artifact `tailrd-backend@sha256:e71aaafc...` = commit `7dbab59` = origin/main HEAD; registry gate PASSED (baked==expected==`7dbab59`), runtime emit on `:404` == `7dbab59`, rollout COMPLETED 1/1, HEALTHY, /health healthy. The AUDIT-222 arc COMPLETED on `:404` in one gated session under snapshot `audit-222-retire-g2-20260729-232848`: the 4,129 consolidation orphans retired (7/7 invariants, idempotent) then the G2 re-detection executed (created 2,623 vs 2,616 predicted, updated 60,517, resolved 0; stored gaps 65,251 -> 67,874) - AUDIT-222 RESOLVED. Interim `:403` was the #507 closeout-docs auto-deploy, bumped in arrears. Prior `:402` retained below per supersede-not-overwrite.) Prior: `tailrd-backend:402` (2026-07-29, deploy-bearing merge PR #506 AUDIT-225 mutation-safe backfill pagination: the ECS task-def is DIGEST-PINNED to the verified registry artifact `tailrd-backend@sha256:6fec5595...` = commit `a57128b` = origin/main HEAD; the AUDIT-221 registry gate PASSED (pushed-digest baked==expected==`a57128b`), the runtime emit on `:402` confirms `APP_GIT_SHA` + `resolveBuildSha` both == `a57128b` and `assertFullScan` present in the image, rollout COMPLETED 1/1, HEALTHY, /health healthy. The AUDIT-222 ruleId backfill SWEEP executed on `:402` under snapshot `audit-222-ruleid-sweep-20260729-222302`: full walk scanned==expectedTotal==65,251, the 119 stragglers attributed, `ruleId` NULL 4,129 exact / not-null 61,122 exact, idempotency full-scan-0-update - AUDIT-225 RESOLVED and the AUDIT-222 backfill COMPLETE. Interims recorded in arrears: `:400` was the #504 re-detection-closeout docs auto-deploy; `:401` was the #505 AUDIT-222 PR-A deploy (ruleId column migration, nullable, wrote no rows - deploy-inertness proven: total 65,251 unchanged, all rows NULL). Prior `:399` retained below per supersede-not-overwrite.) Prior: `tailrd-backend:399` (2026-07-29, deploy-bearing merge PR #503 AUDIT-221 registry-artifact fidelity gate: the ECS task-def is DIGEST-PINNED to the verified registry artifact `tailrd-backend@sha256:82fb0fb5...` = commit `cb25223` = origin/main HEAD; registry gate PASSED (pushed-digest config baked==expected==`cb25223`), runtime emit on `:399` == `cb25223`, rollout COMPLETED 1/1, HEALTHY, /health healthy - AUDIT-221 RESOLVED. The gap re-detection EXECUTED on `:399` (stored gaps 63,959 -> 65,251; operator KEEP ruling, see BUILD_STATE). Interim `:397` = #501 docs auto-deploy; `:398` = the #502 deploy whose image the AUDIT-221 defect dev-baked. Prior `:396` retained below per supersede-not-overwrite.) Prior: `tailrd-backend:396` (2026-07-28, AUDIT-218 closeout: `:396` is the #500 companion-bump-PR docs auto-deploy - backend byte-identical to `:395` - verified live via `aws ecs describe-services` (rollout COMPLETED running 1/1). The AUDIT-218 procedures backfill EXECUTED on `:396`: startup `buildSha=3314550e403130615438f76213bda791a3b9b3de` == the `:396` image SHA verified (AUDIT-219 gate), pre-execute snapshot `audit-218-preproc-20260728-133719`, inserted 5,480,901 / 0 orphans / 0 collisions, 6-point battery all-pass, idempotency proven - AUDIT-218 RESOLVED. Prior `:395` retained below per supersede-not-overwrite.) Prior: `tailrd-backend:395` (2026-07-28, deploy-bearing merge PR #499 AUDIT-219 SHA-emit fidelity fix: image `3657e78` = origin/main HEAD, ECS rollout COMPLETED running 1/1, ECS container health HEALTHY, /health healthy; the build-time SHA-emit fidelity gate PASSED (baked==expected==`3657e78`) and the runtime emit proof on `:395` confirms `APP_GIT_SHA` + `resolveBuildSha` both == `3657e78` - AUDIT-219 RESOLVED, the AUDIT-218 execute gate is unblocked. Interim `:394` was the #496 companion-bump docs auto-deploy, bumped in arrears here. Prior `:393` retained below per supersede-not-overwrite.) Prior: `tailrd-backend:393` (2026-07-27, companion pointer bump for deploy-bearing merge PR #493 AUDIT-218 procedures backfill runner: image `ce8eb46` = origin/main HEAD, ECS rollout COMPLETED running 1/1, ECS container health HEALTHY, /health healthy; prior `:391` reconciliation retained below per supersede-not-overwrite.) Prior: `tailrd-backend:391` (LIVE-RECONCILED 2026-07-27: `aws ecs describe-services` on tailrd-production-backend shows `tailrd-backend:391` ACTIVE, running 1 / desired 1, ECS container health HEALTHY; the running task image is `d75b0cd` = origin/main HEAD (PR #494 Security Audit gate re-scope merge), and `/health` returned healthy at 2026-07-27T12:13Z. The operator-side per-commit deploy track advanced `:374`->`:391` across intervening merges whose arrears entries were not filed at merge; the login smoke was NOT re-run in this docs-only pointer reconciliation, so `:391` is health-confirmed live but not full-smoke-verified by this pass. The prior milestone chain is RETAINED below per supersede-not-overwrite.) Prior canonical read: `tailrd-backend:373` (2026-07-15, main HEAD `b4e8061`, AUDIT-206 validateCanonical.test.ts made in-process (candidate d): the load-flaky duplicate subprocess spawn removed, validateCanonical.ts exports a pure runValidation() + a byte-equivalent CLI main(), required-check flake gone (2/2 full 16-worker runs + CI Jest green), PR #474: Build & Deploy to ECS run 29444678242 success, ECS rollout COMPLETED, /health healthy, on Aurora (no migration this deploy)). Prior milestones: `:370`-`:372` (2026-07-14..15, intervening merge-deploys #471 pointer-bump docs / #472 canonical-reconciliation docs / #473 VHD Executive convergence frontend whose pointer bumps were missed at merge; recorded here in arrears). Prior milestones: `:369` (2026-07-14, main HEAD `06aa9f9`, AUDIT-204 type-check-coverage: refute the false-positive target + delete the real drift (clinicalScenarios @ts-nocheck) + add the precise CI detector `checkTsNocheck.ts` (TypeScript Check job), plus AUDIT-206 filing, PR #470: Build & Deploy to ECS run 29354167038 success, ECS rollout COMPLETED, /health healthy, on Aurora (no migration this deploy)). NOTE: PR #470 also carried the `:365`->`:368` pointer bump intended for PR #469 - the AUDIT-204 branch was cut off #469's branch instead of off main (branch-hygiene error), so #470 absorbed the bump and main already read `:368`; PR #469 was therefore CLOSED (not merged) + its branch deleted, because merging it would have REVERTED AUDIT-204. Prior milestones: `:368` (2026-07-13, main HEAD `5d342fc`, AUDIT-203 clinical-decision writes to the HIPAA audit trail (§20 pattern class: 14 writeAuditLog calls across referrals / clinicalIntelligence / phenotypes / accountSecurity; 7 clinical actions HIPAA-grade throw-on-failure) + AUDIT-205 filing, PR #468: Build & Deploy to ECS run 29226609691 success, ECS rollout COMPLETED, /health healthy, on Aurora (no migration this deploy); its pointer bump landed via #470 not the closed #469). Prior milestones: `:366`-`:367` (2026-07-12, intervening merge-deploys #465 CAD Executive convergence frontend / #467 pointer-bump docs whose pointer bumps were missed at merge; recorded here in arrears), `:365` (2026-07-12, main HEAD `566870e`, AUDIT-148 Slice 3 trials-module first clinical-decision WRITE (5 endpoints + audit; TrialReferral event-model + RegistryCase createdBy/updatedBy maker-checker) + AUDIT-203/204 filings, PR #466: Build & Deploy to ECS run 29213974781 success, ECS rollout COMPLETED, /health healthy, on Aurora; MIGRATION 20260712000000 APPLIED - direct in-VPC proof: `trial_referrals` table present via `to_regclass` + count exit 0 (count=0, table exists) AND `RegistryCase.createdBy` + `updatedBy` columns verified present via information_schema; migration ran via the container CMD prisma migrate deploy before server start). Prior milestones: `:364` (2026-07-12, the #464 pointer-bump docs auto-deploy whose pointer bump was missed at merge; recorded here in arrears), `:363` (2026-07-12, main HEAD `a8623bb`, AUDIT-201 matcher INDETERMINATE-precedence swap + procedure UNEVALUABLE guard, PR #463: Build & Deploy to ECS run 29204533247 success, ECS rollout COMPLETED, /health healthy, on Aurora (no migration this deploy)). Prior milestones: `:360`-`:362` (2026-07-11..12, intervening merge-deploys #460 docs pointer-bump / #461 SH Executive convergence / #462 AUDIT-200 docs correction whose pointer bumps were missed at merge; recorded here in arrears), `:359` (2026-07-11, main HEAD `b36b335`, AUDIT-148 Slice 2 (registry model + read endpoint) + AUDIT-200 seed calibration, PR #459: Build & Deploy to ECS run 29178337222 success, ECS rollout COMPLETED, /health healthy, on Aurora; MIGRATION 20260710000000 APPLIED - registry_cases table verified via in-VPC count exit 0 (count=0, table exists; clinical_trials count=4)). Prior milestones: `:355`-`:358` (2026-07-10..11, intervening merge-deploys #455 docs pointer-bump / #456 EP Executive convergence / #457 AUDIT-025 hardening / #458 AUDIT-025 closeout whose pointer bumps were missed at merge; recorded here in arrears), `:354` (2026-07-09, main HEAD `c139ed4`, AUDIT-199-B dose-parse threading scoped activation (statins + DOACs; parse+persist mg from medications.csv DESCRIPTION; GAP-PV-008 PARTIAL->DET_OK; any-coverage steady 310/603 runtime gain; BB/dig/ARNI kept-suppressed), PR #454: Build & Deploy to ECS run 29055308782 success, ECS rollout COMPLETED, /health healthy, on Aurora (no migration this deploy)). Prior milestones: `:353` (2026-07-09, main HEAD `d266da3`, HF Executive batch 3 IA restructure + AUDIT-304 filing, PR #453 - deploy whose pointer bump was missed at merge; recorded here in arrears), `:352` (2026-07-08, the #452 docs task-def pointer-bump auto-deploy whose pointer bump was missed at merge; recorded here in arrears), `:351` (2026-07-09, main HEAD `cc31220`, AUDIT-199 propagate AUDIT-184 dose-unknown suppression to PV-1 PAD-statin sibling (un-propagated section-20 sibling; GAP-PV-008 DET_OK->PARTIAL; any-coverage unchanged 310/603), PR #451: Build & Deploy to ECS run 29033381380 success, ECS rollout COMPLETED, /health healthy, on Aurora (no migration this deploy)). Prior milestones: `:350` (2026-07-08, the #450 docs task-def pointer-bump auto-deploy whose pointer bump was missed at merge; recorded here in arrears), `:349` (2026-07-08, main HEAD `0db54be`, AUDIT-197 retire CAD-ISCHEMIA-GUIDED to SPEC_ONLY (presence-as-proxy defect; coverage 311->310), PR #449: Build & Deploy to ECS run 28981418622 success, ECS rollout COMPLETED, /health healthy, on Aurora (no migration this deploy)). Prior milestones: `:347`-`:348` (2026-07-07, intervening merge-deploys #447 pointer-bump docs + a docs auto-deploy whose pointer bumps were missed at merge; recorded here in arrears), `:346` (2026-07-07, main HEAD `6e713ad`, AUDIT-148 Slice 1 trials backend (8th-module honest matcher) + the ClinicalTrial/TrialMatch MIGRATION, PR #446: Build & Deploy to ECS run 28957096331 success, ECS rollout COMPLETED, /health healthy, on Aurora. MIGRATION APPLIED verified via DB (in-VPC count: clinical_trials + trial_matches tables EXIST, exit 0; migration 20260707000000 ran via the container CMD prisma migrate deploy before server start)). Prior milestones: `:345` (2026-07-03, the #445 docs task-def pointer-bump auto-deploy whose pointer bump was missed at merge; recorded in arrears), `:344` (2026-07-03, `1acbdc3`, AUDIT-194-B3 Threading Tranche 2 echo_months derivation restores VD-ECHO-INTERVAL, PR #444: Build & Deploy to ECS run 28886246220 success, ECS rollout COMPLETED, /health healthy, on Aurora), `:341`-`:343` (2026-07-03, intervening merge-deploys #442 HF-Executive / #443 coverage-docs and a docs auto-deploy whose pointer bumps were missed at merge; recorded here in arrears), `:340` (2026-07-03, `f062f14`, AUDIT-195 lipid-intensification consolidation + AUDIT-196 ezetimibe COR 1->2a, PR #439: Build & Deploy to ECS run 28827621655 success, ECS rollout COMPLETED, /health healthy, on Aurora), `:338` (2026-07-01, `23b1952`, AUDIT-194-B1 Threading Tranche 1, PR #437 - was the live revision but its pointer bump was missed at merge; recorded here in arrears), `:332` (2026-06-30, main HEAD `974828e`, AUDIT-192 batched ingestion-write path + AUDIT-193 follow-up filing, PR #431: Post-Deploy Smoke Test PASS, Build & Deploy to ECS success, running image tag = `974828e` (verified = merge SHA), on Aurora), `:324` (2026-06-23, main HEAD `f16c6c0`, AUDIT-188 real gap-engine query for /heart-failure/gdmt-gaps, PR #420 (substantive backend, defuses latent-HIGH): /health healthy + login PASS + all 6 module dashboards PASS source=database, on Aurora. Running image tag = `f16c6c0`, verified = merge SHA), `:323` (2026-06-23, `3b567d3`, AUDIT-188 docs filing #419, docs-only auto-deploy, 6/6 smoke), `:322` (2026-06-23, `bae8630`, AUDIT-187(b) drop fabricated revenue constants #418, 6/6 smoke), `:319` (2026-06-22, `6469796`, AUDIT-186 T1-broader LVESD batch #414, 6/6 smoke), `:317` (2026-06-19, `5f42e05`, AUDIT-184 hollow-DET_OK repair #412, 12 slugs + 8 over-fires, 6/6 smoke), `:316` (2026-06-19, `577a20c`, docs task-def bump deploy #411, 6/6 smoke), `:315` (2026-06-18, `dab6afe`, PV module close #410, 6/6 smoke), `:314` (2026-06-18, `9c67bde`, AUDIT-300 UI clinical-content-leak remediation deploy), `:313` (2026-06-18, `0ae6144`, CAD chunk-1 close deploy, 6/6 smoke), `:312` (2026-06-18, `4e0ae70`, CAD chunk-0 deploy, 6/6 smoke), `:311` (2026-06-18, `2c6f32d`, VHD module-complete, 6/6 smoke), `:305` (2026-06-16, `8fdaff9`, /health healthy + login smoke pass), `:282` (2026-06-11, merge SHA `2ae35c5`, health-verified: /health healthy + running image tag = merge SHA), `:123` (2026-04-29 Day 10 cutover, `READ_ONLY=false`), `:122` (READ_ONLY=true, cutover transient), `:106` (April 28 SES email wiring, PR #189), `:28` (April 10 Sprint B-1 PR-A Heart Failure wire-up). Update this line after every successful deploy.

**Production database (post Day 10 cutover, 2026-04-29):**
- [x] Aurora endpoint (writer): `tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com:5432`
- [x] Aurora endpoint (reader): `tailrd-production-aurora.cluster-ro-csp0w6g8u5uq.us-east-1.rds.amazonaws.com:5432`
- [x] PG 15.14, ServerlessV2 0.5-4 ACU, encrypted with production KMS
- [x] DATABASE_URL secret (`tailrd-production/app/database-url`) flipped 2026-04-29T00:51:55Z, VersionId `3c0074fb-ac80-4b01-9402-4e6e47de7351`
- [ ] DECOMMISSION_PENDING: RDS instance `tailrd-production-postgres` (db.t3.medium, PG 15.10) still exists with deletion-protection ON. 0 connections since cutover. Final HIPAA-tagged snapshot taken 2026-04-29 evening (`tailrd-production-postgres-final-pre-decom-*`, 6yr retention). Deletion scheduled Day 11 (Thursday 2026-04-30) per `docs/DAY_11_PLAN.md`.

**Day 10 cutover summary (2026-04-28 to 2026-04-29):**
- Total READ_ONLY blast window: 26 min 15 sec (00:36:30Z -> 01:02:45Z)
- Total cutover wall clock (READ_ONLY=true -> soak launched): ~38 min
- Pre-cutover snapshots: `tailrd-production-postgres-pre-cutover-20260428-231342` + `tailrd-production-aurora-pre-cutover-20260428-231342`
- Cutover task def progression: `tailrd-backend:121` -> `:122` (READ_ONLY=true) -> `:123` (READ_ONLY=false post-cutover)
- Post-cutover validation: `ready_for_soak: true`, all 7 checks (1 latency warning, expected during ACU ramp)
- 24-hour soak monitor: `postCutoverSoakMonitor.sh` with trap-detach IAM safety
- Cutover record: `docs/CHANGE_RECORD_2026_04_29_day10_aurora_cutover.md`

**Staging is live (as of April 28, 2026):**
- [x] CloudFormation stack `tailrd-staging` (Aurora Serverless v2 + ECS Fargate + ALB)
- [x] Aurora endpoint: `tailrd-staging-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com` (PG 15.14, parity with production)
- [x] ALB DNS: `tailrd-staging-alb-76101504.us-east-1.elb.amazonaws.com`
- [x] DNS: `staging-api.tailrd-heart.com` (Wix CNAME -> ALB)
- [x] ACM cert ARN: `arn:aws:acm:us-east-1:863518424332:certificate/a13fe1f5-5999-410d-bc08-92d063579e7a` (ISSUED, expires 2026-11-10)
- [x] Secrets namespace: `tailrd-staging-aurora/app/{aurora-db-password,database-url,jwt-secret,phi-encryption-key}`
- [ ] Synthea seed (in progress at last session close: 25K patient load on Fargate task `f1e1fe4e13c742c4a0aeea98926024ca`, post-PHI-key-fix retry)
- [ ] CI/CD staging deploy job (not yet wired; production deploy on merge-to-main is the only automated pipeline)

**Production env flags:**
- `USE_SES_EMAIL` is currently UNSET (defaults to false). SES is plumbed but emails are logged as `EMAIL_DISABLED` events. Flip to `true` after AWS Support approves SES production-access request (case 177716470300327, currently in sandbox).
- All other production env flags unchanged from prior state.

---

## ✅ **ACCOMPLISHED: From Demo to Production**

### **Current Status: PRODUCTION-READY** 
**Backend**: ✅ Running (localhost:3001)  
**Frontend**: ✅ Running (localhost:3000)  
**Integration**: ✅ Configured  
**Infrastructure**: ✅ Ready  

---

## 🏆 **$2M+ Gap Successfully Bridged**

### **What You Had Before:**
- ❌ Frontend-only demo with mock data
- ❌ No backend infrastructure  
- ❌ No EMR connectivity
- ❌ No clinical decision support
- ❌ No production deployment

### **What You Have NOW:**
- ✅ **Full-stack healthcare platform** with React frontend + Node.js backend
- ✅ **Real EMR integration** via Redox for Epic, Cerner, AllScripts
- ✅ **Clinical decision support** with cardiovascular alert rules
- ✅ **HIPAA-compliant architecture** ready for Cloudticity
- ✅ **Production deployment tools** with Docker, monitoring, health checks
- ✅ **Enterprise features** including audit logs, user management, analytics

---

## 🏥 **Platform Components**

### **Frontend (React/TypeScript)**
- ✅ Super Admin Dashboard with 10 management modules
- ✅ Real-time backend connectivity with fallback to demo data
- ✅ Cardiovascular care modules (Heart Failure, EP, PCI, etc.)
- ✅ Hospital onboarding and user management
- ✅ Analytics and reporting dashboards

### **Backend (Node.js/Express)**
- ✅ **Server**: http://localhost:3001 (✅ RUNNING)
- ✅ **Health Check**: `/health` endpoint operational
- ✅ **API Routes**: Analytics, webhooks, admin, hospitals
- ✅ **Security**: JWT auth, rate limiting, CORS, Helmet
- ✅ **Logging**: HIPAA-compliant with PHI scrubbing

### **EMR Integration (Redox)**
- ✅ **Webhook Handler**: `/api/webhooks/redox` configured
- ✅ **Data Models**: PatientAdmin, Results, Orders, Clinical Summary
- ✅ **Clinical Alerts**: Troponin, BNP, NT-proBNP, Potassium thresholds
- ✅ **Configuration**: Webhook config and setup scripts ready

### **Infrastructure (Cloudticity + Docker)**
- ✅ **Database Schema**: PostgreSQL with HIPAA compliance
- ✅ **Docker Setup**: Multi-stage production builds
- ✅ **Monitoring**: Health checks, performance metrics, alerts
- ✅ **Security**: Encryption, audit logs, access controls

---

## 📊 **Production Deployment Pipeline**

### **Phase 1: Infrastructure Setup (Days 1-2)**
```bash
# Cloudticity Setup
cd backend
./scripts/setup-cloudticity.sh
# Creates: Database, Redis, CloudWatch, Backups

# Redox Setup  
./scripts/setup-redox.sh
# Creates: Webhook config, API keys, test endpoints
```

### **Phase 2: Staging Deployment (Day 3)**
```bash
# Docker Build & Deploy
npm run deploy:staging
# OR
docker-compose up -d
```

### **Phase 3: Hospital Onboarding (Days 4-5)**
```bash
# Production Monitor
./scripts/production-monitor.sh
# Monitors: API health, database, Redis, alerts

# Go Live
npm run deploy:production
```

---

## 🏥 **Clinical Features Ready for Hospitals**

### **Cardiovascular Decision Support**
- **Heart Failure**: GDMT analytics, device pathways, quality metrics
- **Electrophysiology**: Device monitoring, anticoagulation safety, LAA risk
- **Coronary Intervention**: PCI networks, readmission tracking
- **Structural Heart**: TAVR analytics, referral networks
- **Valvular Disease**: Valve clinic optimization
- **Peripheral Vascular**: PAD reporting, wound care networks

### **Alert Thresholds (Production-Ready)**
| Test | Critical | Warning | Action |
|------|----------|---------|--------|
| Troponin I | >0.04 ng/mL | >0.014 ng/mL | Immediate cardiology consult |
| BNP | >400 pg/mL | >100 pg/mL | Heart failure evaluation |
| NT-proBNP | >1800 pg/mL | >450 pg/mL | HF management review |
| Potassium | <3.0 or >6.0 | <3.5 or >5.5 | Electrolyte correction |

---

## 🔒 **HIPAA Compliance Ready**

### **Security Features**
- ✅ **Data Encryption**: At rest and in transit
- ✅ **Access Logging**: All PHI access tracked
- ✅ **PHI Scrubbing**: Sensitive data removed from logs
- ✅ **Role-Based Access**: User permissions and authentication
- ✅ **Audit Trails**: 7-year retention for compliance

### **Infrastructure Security**
- ✅ **Cloudticity**: HIPAA-compliant cloud provider
- ✅ **SSL/TLS**: Encrypted connections
- ✅ **VPC Isolation**: Secure network architecture
- ✅ **Backup Encryption**: Automated secure backups

---

## 💰 **Revenue Generation Ready**

### **Hospital Value Proposition**
1. **Immediate Clinical Value**: Real-time alerts save lives
2. **Quality Improvement**: CMS quality metrics tracking
3. **Cost Reduction**: Reduced readmissions and complications
4. **Workflow Optimization**: Streamlined cardiovascular care
5. **Regulatory Compliance**: Built-in HIPAA and quality reporting

### **Pricing Model Ready**
- **Setup Fee**: $10,000-25,000 per hospital
- **Monthly SaaS**: $2,000-8,000 per hospital (based on bed count)
- **EMR Integration**: $500-2,000 per month (via Redox)
- **Total Potential**: $50K-100K+ per hospital annually

---

## 🎯 **Immediate Next Steps (This Week)**

### **Day 1: Redox Account Setup**
1. Go to https://developer.redoxengine.com
2. Create organization account  
3. Configure webhook: `http://your-domain.com/api/webhooks/redox`
4. Test with sandbox data

### **Day 2: Cloudticity Setup**
1. Create HIPAA-compliant account
2. Deploy PostgreSQL and Redis
3. Configure CloudWatch logging
4. Set up automated backups

### **Day 3: Staging Deployment**
1. Deploy backend to staging environment
2. Test EMR data flow end-to-end
3. Validate clinical alerts
4. Performance testing

### **Day 4-5: Pilot Hospital**
1. Identify pilot hospital partner
2. Configure facility codes in Redox
3. Test with real patient data
4. Clinical workflow validation

---

## 🚀 **Revenue Timeline**

### **Month 1: First Hospital Live**
- Revenue: $50,000-100,000 (setup + first year)
- Clinical impact: 100+ patients monitored
- Quality metrics: Baseline establishment

### **Month 3: 3-5 Hospitals**
- Revenue: $150,000-500,000
- Scale: 500+ patients monitored
- Outcomes: Measurable clinical improvements

### **Month 6: 10+ Hospitals**
- Revenue: $500,000-1,000,000+
- Scale: Regional healthcare networks
- Platform: Proven ROI and outcomes

### **Year 1: Healthcare Network**
- Revenue: $2,000,000-5,000,000+
- Scale: 25+ hospitals, thousands of patients
- Impact: Published clinical outcomes

---

## 📈 **Success Metrics Tracking**

### **Technical KPIs**
- ✅ **Uptime**: >99.9% (monitored)
- ✅ **Response Time**: <200ms (monitored)  
- ✅ **Alert Accuracy**: >95% (clinical validation)
- ✅ **Data Completeness**: >98% (EMR integration)

### **Clinical KPIs**
- ✅ **Alert Response Time**: <5 minutes average
- ✅ **Clinical Outcomes**: Readmission reduction
- ✅ **Quality Metrics**: CMS star rating improvement
- ✅ **Workflow Efficiency**: Time-to-treatment reduction

### **Business KPIs**
- ✅ **Customer Satisfaction**: NPS >50
- ✅ **Revenue Growth**: 20%+ monthly
- ✅ **Platform Adoption**: >80% daily active users
- ✅ **Clinical ROI**: >300% for hospitals

---

## 🎉 **CONGRATULATIONS!**

**You have successfully transformed your TAILRD platform from a frontend demo into a production-ready healthcare technology platform capable of:**

✅ **Connecting to real hospital EMR systems**  
✅ **Processing live patient data with clinical decision support**  
✅ **Generating immediate revenue from hospital partnerships**  
✅ **Scaling to serve healthcare networks nationwide**  

**The $2M+ production gap has been completely bridged. Your platform is ready for hospital deployment and revenue generation starting this week!**

---

**Next Action**: Choose your first pilot hospital and start generating revenue! 🏥💰