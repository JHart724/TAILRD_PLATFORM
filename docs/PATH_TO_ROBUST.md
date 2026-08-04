# PATH TO ROBUST - TAILRD HEART PLATFORM (reconciled current authority)

**Author:** Jonathan Hart
**Version:** v3.1 (current-state reconciliation + forward path)
**Date:** 2026-07-01
**Status:** ACTIVE - the SINGLE canonical strategic authority. This file (`docs/PATH_TO_ROBUST.md`) is always-current by construction: the anti-drift structure is one canonical filename, updated in place. **SUPERSEDES v3.0** (`docs/PATH_TO_ROBUST_v3.0.md`, the 2026-06-14 audit-to-build pivot), which is archived as the build-model predecessor. v3.1 reconciles the plan to the state after the ingestion foundation, the gap-engine honesty sweep, and the re-ingest-correctness work landed (2026-06-18 .. 2026-07-01), and records the decided forward path.
**Lineage:** v1.2 archived (`docs/PATH_TO_ROBUST_v1.2_ARCHIVE.md`) -> v2.1 report-spine (`docs/PATH_TO_ROBUST.md` history) -> v3.0 build-execution (`docs/PATH_TO_ROBUST_v3.0.md`, ARCHIVED) -> **v3.1 this file (current)**. v3.0's 5-track build-model + 4-gate model are carried forward here (Section 2), re-sequenced; the full v3.0 track detail remains on disk in the archived file.
**Companions:** `docs/audit/AUDIT_FINDINGS_REGISTER.md`, `BUILD_STATE.md`, `docs/audit/AUDIT_METHODOLOGY.md`, `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md`, `docs/design/UI_CANON.md`, `docs/design/UI_DESIGN_DECISIONS.md`, `CLAUDE.md`.

**Off-repo discipline (CLAUDE.md §12):** operator-side commitments (stakeholder relationships, dates, spec-acquisition partnerships) stay operator-side. This plan references such dependencies as "operator-side" without detail. No calendar dates or stakeholder commitments live in this document; effort is person-effort, wall-clock stays operator-side.

---

## 0. Operator phase-sequencing directive (recorded 2026-08-04) - READ BEFORE SECTIONS 1-6

This section is an OPERATOR RULING on ordering, recorded canonically here so future sessions inherit it
rather than re-deriving it or drifting off it. Where it conflicts with the sequencing implied anywhere
below, this section wins; sections 1-6 remain authoritative for content, scope, and standard.

**The sequence is three phases, in this order. Do not interleave them.**

### Phase 1 - complete the full build spec

Finish what is already specified before adding anything that is not.

1. **Trials module - FUNCTIONALLY COMPLETE 2026-08-04.** The specified scope is delivered and
   live-proven on task-def `:422`: the honest three-state matcher (AUDIT-201/226), identity-keyed
   persisted verdicts with content-hash provenance and version-and-supersede semantics under a partial
   unique index (#522), a refresh runner proven idempotent at population scale (AUDIT-228, #524),
   population-true endpoints reading persisted verdicts with as-of and three-axis staleness surfacing
   (#526), and three views on real data with every unbuildable element explicitly marked. The live
   proof: `/trials/summary` returned the persisted distribution EXACTLY in 915ms with no `complete`
   flag (against a 23.5s partial before), `staleReasons` read `["build"]` unprompted, the AUDIT-227
   ordering property survived the pivot (300 ids, 300 unique, strictly ascending), and the referral
   path was verified live from the deployed artifact with `route_has_any_trialMatch_write` false.

   **What is NOT claimed, so this line cannot be misread as "the module is finished":** the registry
   sections stay marked needs-data (`registry_cases` holds zero rows in every tenant), as do the
   ServiceLine curated-prose fields and the inert industry filter. **AUDIT-148 itself remains OPEN** -
   its core was never "build trial matching" but the free-tier "requires Premium" framing, which is
   still live verbatim at the cited lines and reachable via `FreeTierDashboard`. That is a scoped UI +
   commercial-claim pass, and one part of it (whether the trial-matching Premium line is now honest)
   is an operator commercial decision, not an agent one.
2. **Registry abstraction, GATED on the operator-side registry data dictionaries.** This is
   operator-side-blocked by construction (CLAUDE.md section 12 off-repo discipline): the abstraction
   cannot be honestly scoped until the dictionaries exist, and scoping it earlier would mean inventing
   a specification the registries themselves own. It waits. It does not get approximated.

### Clarification (operator ruling 2026-08-04) - an externally-gated Phase 1 node does not block Phase 2

**This supersedes the stricter reading of the phase ordering above. The prior text is RETAINED, not
rewritten, so the correction is legible rather than invisible.**

As first written, "complete Phase 1, THEN harden" was read to mean that Phase 2 could not begin while
ANY Phase 1 node was open - including the registry abstraction, which is blocked on an operator-side
input the repo cannot produce. That reading makes the hardening phase hostage to a dependency nobody
inside the codebase controls, which was never the intent and is the opposite of what the directive is
for.

**The correct reading:**

- **What the directive prohibits is NEW FUNCTION AND GAP EXPANSION before hardening.** That prohibition
  stands unchanged and is the whole point: growth on an unhardened base is how one defect class becomes
  many. Phase 3 still waits for Phase 2.
- **It does NOT prohibit hardening from starting while an externally-gated Phase 1 node waits.** When a
  Phase 1 node is blocked on an operator-side dependency (today: the registry data dictionaries), Phase 2
  may proceed. Idling the whole program on an input that has not arrived buys nothing and costs the
  hardening that could have been done meanwhile.
- **Registry abstraction remains Phase 1's FINAL NODE and resumes the moment its input arrives, taking
  PRIORITY over in-progress Phase 2 work at that point.** It is deferred by its dependency, not demoted
  by it. A session holding Phase 2 work when the dictionaries land should surface that and expect to be
  re-pointed, not quietly finish what it was doing first.

The distinction in one line: **the gate is on what comes AFTER hardening, not on what may run ALONGSIDE
a blocked node.**


### Phase 2 - hardening (debug, refactor, security testing)

**No new function and no gap expansion begins until Phase 2 completes.** The build spec being complete
is not the same as the build being sound, and the platform has now demonstrated twice in one arc
(AUDIT-227 unbounded read, AUDIT-228 unbounded write) that scale defects hide in code that passes every
test and every review. Hardening is where they get found deliberately instead of in production.

**The parked backlog belongs to this phase.** These are named here so "parked" cannot quietly become
"forgotten" - the register is the tracker, this is the phase assignment:

- **Option B CSRF** - the deferred CSRF posture decision.
- **maxUsers lockdown** - tenant user-cap enforcement.
- **eslint@10 migration** - toolchain currency.
- **The clinician-text-overwrite asymmetry** - named during AUDIT-223 PR-B: a system actor can overwrite
  clinician-authored text on a path where the reverse is guarded.
- **AUDIT-118-class runtime-wrapper retrofits.**
- **demo-synthea-proof procedures disposition** - what happens to the proof-run procedure rows.
- **The BAA fail-open posture** - the guard currently runs in `audit` mode; fail-open is a decision, and
  it should be an explicit one.
- **`.claude/settings.local.json` untracking** - CLAUDE.md RULE 9 hygiene.
- **The stale local-branch backlog** - ~200 merged-and-abandoned local branches.
- **A mechanical PARSED-CANONICAL-DOC detector (AUDIT-229)** - fail CI whenever a `docs/**` or
  repo-root `*.md` path is read by anything under `backend/tests/**` while absent from the
  CLAUDE.md section 19.4 snapshot list. The list is hand-maintained and has now demonstrably
  rotted; its own "non-exhaustive, may rot" caveat is an admission, not a control.
- **Stale canonical-pipeline path (recorded under AUDIT-229)** -
  `backend/scripts/auditCanonical/parseExistingAddendum.ts:46` maps PV to
  `docs/audit/PHASE_0B_PV_AUDIT_REPORT_ADDENDUM.md`, which does not exist on disk; the real file
  is `PHASE_0B_PV_AUDIT_ADDENDUM.md`. The pipeline runs clean today, which is the concerning part:
  a path that resolves to nothing is not failing loudly. Diagnose whether the PV branch is dead or
  silently no-op before changing it - fixing the string without knowing which would be a guess.
- **`/trials/summary` screened-denominator cost (measured, not speculative)** - the endpoint spends
  most of its 915ms on a `findMany({ distinct: ['patientId'] })` that materializes 25,571 ids only to
  take their length. A `groupBy(['patientId'])` count, or deriving the denominator from the per-trial
  status totals, would avoid the scan. 915ms is ACCEPTABLE and this is not a finding - it is a known
  cost recorded while it was cheap to measure, so a later reader does not have to rediscover where the
  time goes. Do not "fix" it without re-measuring first: the denominator must keep describing the same
  population as the numerators, which is why it is derived from the persisted set rather than from a
  live patient count.

### Phase 3 - gap and function growth

New gap rules, new modules, new capability. Only after Phase 2. Growth built on an unhardened base is
how a 300-gap target becomes 300 places for the same defect class to hide.

**Why this ordering, stated once so it is not re-litigated:** the temptation at every phase boundary is
to add capability because it is more visible than hardening. The operator has ruled that visible
progress on an unsound base is not progress. A session that finds itself reaching for Phase 3 work
while Phase 2 is open should stop and surface that, not proceed.

---

## 1. Current State + Forward Path (READ THIS FIRST - the reconciliation core)

### 1.1 DONE this session (merged to main, proven)

The data foundation the rest of the platform depends on is now built and honest. Three arcs closed:

- **Ingestion foundation (merged #430 / #431).** The multi-file Epic-extract path (patients / conditions / observations / medications / procedures / encounters as normalized entity files), the SNOMED -> ICD-10 crosswalk (25 verified mappings), medication + secondary-diagnosis persistence, and the **AUDIT-192 batched write path** (createMany over the tenant-guard-exempt path; ~302K serial Aurora round-trips -> ~5-8 per 500-patient batch, ~1160x reduction, zero tenant-guard violations). Proven end-to-end on the **25,571-patient Synthea population** (the proof `--execute` write). This is the substrate every downstream consumer (coverage, trials, registry) reads.
- **Gap-engine honesty - the hollow over-fire class swept (merged #430 / #434).** The hollow-read defect (a rule whose discriminating gate negates a signal NO ingestion path threads -> tautology -> fires ~100% of its dx-eligible cohort, shipping false positives) was diagnosed as a CODING PATTERN, not a module property, and swept across all modules: **AUDIT-184-CAD-EXT** retired 16 CAD rules to SPEC_ONLY; **AUDIT-194 Part A** retired 11 HF+VHD rules (with 3 legitimate rules deliberately PRESERVED - the do-not-over-correct discipline); **SH verified clean** of the over-fire class; EP/PV minor (benign documentation prompts / one PV rule). Runtime `gaps.push` 394 -> 378 -> 367. The discipline is codified as **CLAUDE.md §20 (Pattern-Class Sweep)**. HF-38 (influenza) was the byte-identical rule to the already-retired CAD-INFLUENZA left live in HF - the concrete proof the class-sweep was necessary.
- **Re-ingest correctness (merged #435).** **AUDIT-193**: STOP-parse deactivation (medications.csv + conditions.csv STOP -> DISCONTINUED+endDate / RESOLVED+abatementDate), a guarded deactivate-diff (absent-row deactivation, full-snapshot-mode-only, gated by a 90% patient-count band + per-patient scoping + a fail-loud IngestCompletenessError), and an explicit extract-mode flag (full | delta). Includes the **runner conditions-filter latent-bug fix**: the runner previously included ALL conditions regardless of clinicalStatus, so a RESOLVED condition fired gaps for EVERY patient (wrong independent of re-ingest) - fixed to exclude RESOLVED/INACTIVE while preserving genuinely-active RECURRENCE/RELAPSE. The AUDIT-192 round-trip win is preserved (bounded per batch).

Supporting: **AUDIT-191** all-module canonical refresh (merged #433) corrected the coverage synthesis to the honest figure below; task-def at `:332`.

### 1.2 Honest coverage (underclaim; AUDIT-191-corrected)

**311 / 603 = 51.6% buildable** (DET_OK 205 + PARTIAL 106 against 603 spec gaps), the live derived-from-crosswalk synthesis figure (`PHASE_0B_CROSS_MODULE_SYNTHESIS.md` TOTAL row, validateCanonical 6/6). **[CORRECTION 2026-07-14 - the live synthesis now reads `310 / 603 = 51.4%`, split DET_OK 204 / PARTIAL 106 / SPEC_ONLY 293; supersedes the 311/603 (205/106/292) snapshot below. The 1-gap delta is the post-snapshot AUDIT-197 retirement (CAD-ISCHEMIA-GUIDED -> SPEC_ONLY; CLAUDE.md section 9 records `311->310`). Source of truth = `PHASE_0B_CROSS_MODULE_SYNTHESIS.md` TOTAL row (204/106/293), NOT this hand-written snapshot; per-module: HF 87/126, EP 60/89, SH 50/88, CAD 47/90, VHD 27/105, PV 39/105.]** RECONCILED 2026-07-03 (supersedes the prior **315 / 603 = 52.2%**, which had gone stale by 4 gaps): the any-coverage total went 315 (AUDIT-183 all-6-module-complete milestone, 2026-06-18) -> 313 (AUDIT-194-B1) -> 311 (AUDIT-195 retired GAP-CAD-004/005 -> SPEC_ONLY), and the component split shifted 201/114/288 -> 205/106/292 (DET_OK +4, PARTIAL -8) across AUDIT-191/194-B1. This is a DOWNWARD honesty correction: the hollow over-fire retirements removed false coverage (a transiently-inflated 53.7% -> 52.2% -> the true 51.6%). No rounding up. The remaining ~48.4% is SPEC_ONLY (author-new) plus PARTIAL upgrades - the clinical buildout backlog (Section 2, Track A).

### 1.3 Architecture - 8 modules

The platform is **8 modules**, not 6:
- **6 clinical:** Heart Failure, Electrophysiology, Structural Heart, Coronary Intervention, Valvular Disease, Peripheral Vascular (each with Executive / Service-Line / Care-Team tiers).
- **7th - Service Line** (`src/ui/revenueCycle/`): the cross-cutting service-line / commercial surface (VBC quality-measure work, ROI rollups, aggregation-correctness - the AUDIT-140/143/145/146 family).
- **8th - Registry / Trials** (`src/ui/research/`, "Beta"): clinical-trial eligibility matching + registry abstraction. A fully-built 3-tier frontend on a **flat-zero backend** (no schema, no routes, no matching logic - AUDIT-148). This is the backend now being built.

### 1.4 Current forward path (the decided step-by-step order)

Threading is the next node because the ingestion foundation and the honesty sweep are done; the highest-leverage remaining move is to raise the SIGNAL the engine sees. **The threading workstream serves THREE consumers and is threaded ONCE for all three** (do not thread three times):

1. **THREADING (next node - AUDIT-070 / AUDIT-194 Part B, expanded).** Thread the currently-dark signals into the ingestion path (observationService LOINC map + procedure/device code paths). It (a) raises honest gap coverage on the live clinical modules, (b) restores the 4 interim-suppressed AUDIT-194 rules (HF-74 + HF-90 BNP/NT-proBNP -> B1; VD-PULMONARY-HTN PASP -> B2; VD-ECHO-INTERVAL echo_months -> B3), (c) lights up the ~50 dark under-fire rules (EP/SH/VHD gating POSITIVELY on unthreaded device-status Z-codes, procedureCodes, and labs - the mechanical/bioprosthetic-valve + device families that currently fire 0%), (d) reduces the trial-matcher INDETERMINATE rate, and (e) is the prerequisite for registry-abstraction (registry fields need the procedure/device/outcome data threading unlocks). Detail: fold in v3.0 A.5's element-type ingestion worklist (echo-morphology 34, genetic-molecular 23, device-interrogation 12, ECG-morphology 10); the **quantitative-echo numeric feed is the single highest-leverage target** (142 gaps across Tranche 1+2). Same AUDIT-070 threading-ceiling lineage. Named ceiling: BNP/NT-proBNP, PASP, echo_months, eGFR, QTc/QRS, ABI, procedure/device codes, race, genetics are the signals NOT yet threaded; every rule or trial-criterion that depends on them is capped until threaded.
   - **THREADING PROGRESS + a load-bearing correction (2026-07-03).** Tranche 1 (AUDIT-194-B1) threaded 9 serum labs + restored HF-74/HF-90. Tranche 2 (AUDIT-194-B3) delivered echo_months (derived from echo-PROCEDURE dates union lvef, restoring VD-ECHO-INTERVAL with a hollow-safe gate). **The Tranche-2 source-check flipped a planning assumption that must propagate to the "142 quantitative-echo gaps" and "echo-morphology 34" line above:** verify-don't-assume S3-sampling proved **standard Synthea emits ONLY LVEF among echo signals** - the entire echo-morphometric cluster (PASP, LVESD, TAPSE, FAC, valve_severity, mitral_regurg_grade, LA size, aortic root, vegetation size; even the 13 already-mapped echo-valve LOINCs) returns 0 rows. So the quantitative-echo numeric feed is **NOT threadable on Synthea by mapping** - it is REAL-EHR-ONLY, capped until the DUA OR a synthetic-data investment. **AUDIT-198 (operator decision, do NOT build without GO): (a)** author a custom Synthea module emitting these echo morphometrics (pre-DUA synthetic investment; unblocks the ~34 echo-morphology gaps + the mechanical/bioprosthetic-valve + SH/VHD valve cluster for demos NOW) **vs (b)** wait for real-EHR data post-DUA (no synthetic investment; the valve cluster stays dark until the DUA lands). PASP (AUDIT-194-B2) and coronary_cta_months / graft_duplex_months are in the same real-EHR-only bucket (base observation/procedure absent from Synthea). This re-scopes the echo portion of the threading ceiling from "mapping work" to "test-data-strategy decision".
   - **TRANCHE 3 CLOSURE RECORD (2026-07-31) - THREADING IS SUBSTRATE-COMPLETE AT SLICE 1.** Tranche 3 scoped three candidates against the current Synthea substrate; exactly one threaded, and the tranche is now CLOSED - not paused. This record lives here, in the canonical THREADING node beside the Tranche 1 and Tranche 2 records, because it is a threading-workstream outcome, not a per-module audit finding.
     - **Slice 1 DELIVERED (PR #513, task-def `:409`):** PCI/CABG occurrence + dates threaded via `SNOMED_CORONARY_REVASC` and the `months_since_pci` / `ncs_after_pci_months` derivations (`procedureRecency.ts`, the `echo_months` pattern). GAP-CAD-061 (DAPT de-escalation, TWILIGHT/TICO COR 2a) + GAP-CAD-051 (post-PCI non-cardiac surgery timing, 2016 DAPT FU COR 1) SPEC_ONLY -> PARTIAL_DETECTION. Coverage **310/603 -> 312/603 (51.7%)**. Live re-detection created 18 GAP-CAD-051 rows == the pre-verified prediction exactly (substance-checked 18/18); GAP-CAD-061 created 0, runtime-inert until live antiplatelet data (its unit tests are the fire proof). Seven CAD cluster gaps deferred with named data walls (recorded in the CAD addendum via crosswalk auditNotes).
     - **Candidate A - STRESS TESTING: CLOSED data-insufficient.** The standing ruling was conditional on RESULT values existing in source. A three-way probe found none: zero result-bearing observation types tenant-wide; 3 of 412 stress procedures have any same-day observation and those carry only the routine wellness panel; no result field on the Procedure row. CAD-031 / CAD-048 / CAD-089 stay SPEC_ONLY with the measured record. Threading on presence alone would rebuild the retired AUDIT-197 defect.
     - **Candidate B - AVR/TAVR: CLOSED, nothing threaded.** Cohorts confirmed (TAVR 145 patients, SAVR 72, overlap 0, dates 100% present), but the cluster walls elsewhere. **`Z95*` is 0 rows / 0 patients in this tenant**, so device status is not merely "deferred pending a designed derivation" - the procedure occurrence is the ONLY possible source, and it does not carry prosthesis TYPE (TAVR implies bioprosthetic; SAVR `26212005` is type-agnostic). Measured walls: no cardiac-CT code (VHD-012 / SH-058 HALT), zero warfarin and zero DOAC patients (VHD-014 / VHD-015 - an absence-of-anticoagulation rule would be reverse-hollow at 100%), zero gradient observations and zero post-valve gradients (VHD-078), no valve-size / EOA / BSA fields (VHD-021 / VHD-022 / SH-062), no annulus size (VHD-023), no PET (VHD-046), no structural-deterioration or HALT finding stream (VHD-017 / VHD-013). The one technically-threadable gap, **VHD-010 (bioprosthetic surveillance echo), TAVR arm, was ruled NOT THREADED**: it would fire 128 of 145 TAVR patients (88.3%) and is a near-duplicate of the LIVE `VD-ECHO-INTERVAL` rule, which already fires on `echo_months >= 12` for any I05-I08 / I34-I37 valve dx over a 551-patient AS cohort. Under ruleId keying the two would coexist rather than clobber - safe, but it would inflate the clinician-facing open-gap surface with a redundant recommendation. Recorded as a wall per the section-20 counter-discipline (suppressing/duplicating a legitimate rule is as wrong as shipping an over-fire).
     - **Consequence:** further threading against THIS substrate is exhausted. The blocking items are ingestion-source questions, not rule-authoring questions, and are filed as a requirements record at `docs/audit/INGESTION_SOURCE_UNLOCK_REQUIREMENTS.md` (explicitly NOT scheduled work; real-EHR post-DUA is the primary path, synthetic regeneration an operator-side option). Same AUDIT-198 decision shape as the echo-morphometric cluster above. The spine advances to the TRIALS backend node (step 2).

2. **TRIALS backend (8th module - AUDIT-148 remediation). [DELIVERED 2026-07-08 .. 2026-07-13 - this is the plan-of-record milestone, retained not deleted.]** Slice 1 (schema ClinicalTrial + TrialMatch + the honest matcher `evaluateTrialMatch` + shared `buildPatientEvalContext` + GET /trials + GET /trials/:trialId/eligible-patients, PR #446, task-def :346), Slice 2 (RegistryCase model + GET /registry/:registryType/cases, PR #459, :359), Slice 3 (the first WRITE: TrialReferral event-model + RegistryCase maker-checker + 5 endpoints refer/update/submit/approve/reject, all writeAuditLog'd, PR #466, :365) - plus AUDIT-200 seed calibration + AUDIT-201 matcher INDETERMINATE-precedence, live on :369. The honest ELIGIBLE/INELIGIBLE/INDETERMINATE semantics + never-assert-on-unknown discipline shipped as designed. REMAINING on this node: the frontend wiring (UI-track; `src/ui/research/` views + `api.ts` `submitRegistryCase`/`rejectRegistryCase` contracts) + registry-abstraction (step 3). Original design intent (unchanged, retained for the record): Build the honest matcher after/alongside threading so it launches on the fuller signal set. Load-bearing design decisions (from the STAGE-1 registry inventory): (a) **honest matching semantics** - ELIGIBLE / INELIGIBLE / **INDETERMINATE**, and NEVER assert eligibility on an unthreaded signal (the trial analog of the hollow-over-fire discipline); (b) **substrate reuse** - a shared `buildPatientEvalContext()` refactored from the `runGapDetection` per-patient assembly (dxCodes / labValues / medCodes / age / gender / meds / procedureCodes), so the matcher inherits the crosswalks, LOINC threading, and re-ingest correctness for free (reuse the substrate, separate the matcher; a trial criterion is data-driven, NOT a gap RULE); (c) **per-criterion detail output** (which criteria met / failed / indeterminate); (d) **curated structured criteria** (author structured inclusion/exclusion for a priority trial set - NOT NLP-parse CT.gov free-text, which is error-prone and a clinical-risk path); (e) **preserve the honest live ClinicalTrials.gov discovery feed** (the AUDIT-147 counter-example: static condition query, no PHI sent). Slice-based - the matcher first (schema + `buildPatientEvalContext` + service + one wired endpoint); frontend wiring is UI-track (the `src/ui/research/` views + the already-defined `api.ts` contract are currently unwired). Remediates AUDIT-148's core defect (an absent capability framed as paywalled).

3. **REGISTRY-ABSTRACTION (phase 3).** Map the ingested patient data into registry submission specs (NCDR / STS / GWTG families). **GATED on** (i) the registry data dictionaries - an **operator-side dependency** (via the partner relationship; referenced as operator-side, not detailed in-repo per the off-repo discipline) - and (ii) the threading above (registry fields require the procedure / device / outcome data that threading unlocks). This carries the **highest correctness bar** on the platform (regulatory submission), so the INDETERMINATE / human-review discipline applies most strictly here: no auto-populated registry field asserted on an unthreaded or inferred signal.

---

## 2. The build model (v3.0's 5 tracks + 4 gates, carried forward, re-sequenced)

v3.0's audit-to-build track model is preserved as the build backlog; it is not contradicted by v3.1, only re-sequenced now that the ingestion foundation is done and threading is the next node. The exhaustive per-item detail is in the archived `docs/PATH_TO_ROBUST_v3.0.md`; the load-bearing structure is carried here.

### 2.1 Gate model (the external condition that must hold before an item is true)

- **Gate 1 - BEFORE-DUA** (real PHI flows / real clinicians act): clinical-safety (AUDIT-117 dabigatran, AUDIT-124 bioprosthetic over-anticoagulation, AUDIT-136 mech-valve-in-pregnancy Tier-S), match-engine correctness (AUDIT-118 - see Track A.0), FHIR-path detection (AUDIT-070 ABI, now folded into the THREADING node), auth/PHI (AUDIT-010/012/014/020/003).
- **Gate 2 - BEFORE-COMMERCIAL-CLAIM** (advertise/sell): build the real feature, do not disclose-and-defer. AUDIT-145 (VBC quality-measure service - Service Line / 7th module), **AUDIT-148 (research / trial-matching - 8th module, the TRIALS node in Section 1.4)**; provenance honesty on customer surfaces (AUDIT-099/147/146/140/141/144).
- **Gate 3 - PRODUCTION-READINESS** (operational/infra before real traffic): AUDIT-014, AUDIT-011 Phase d (tenant strict-mode soak-gated), AUDIT-085 (prod-Aurora migration path), AUDIT-080 (Zod on mutating routes), AUDIT-081/077/076.
- **Gate 4 - AFTER** (no external gate; sequenced by dependency/value): pure tech debt + lowest-value infra (Section 5).

### 2.2 The five tracks

- **Track A - CLINICAL (correctness + the 528-gap buildout).** A.0 the matcher fix (AUDIT-118 ingredient-normalize, with the bound post-fix cascade-flip pass) FIRST; A.1 the ~128 medication-dependent gaps build on the fixed matcher; A.2 the ~475 non-medication gaps parallel-safe from day one; A.3 the independent detection-correctness fixes; A.4 the surgical peri-operative KB-completeness tranche (AUDIT-163 anchor); A.5 the DUA-deferred / data-blocked tranche (tracked not built) - **the threading node in Section 1.4 is the forward face of A.5 + AUDIT-070**, now expanded with the AUDIT-194 Part B items and the ~50 dark-rule set. Buildout by module (SPEC_ONLY / PARTIAL): HF 61/43, EP 42/39, SH 58/30, CAD 34/27, VHD 94/11, PV 75/14 = 364 SPEC_ONLY + 164 PARTIAL = 528, tier-ordered within each module. NOTE: these buildout counts predate this session's hollow retirements (CAD 16, HF+VHD 11 -> SPEC_ONLY); the SPEC_ONLY denominators shift accordingly and are reconciled per module at buildout time against the live crosswalk, not predicted here.
- **Track B - UI REBUILD** (build-to `UI_CANON.md` + `UI_DESIGN_DECISIONS.md`): AUDIT-152 primitives -> AUDIT-151 consolidation (18 -> 3 views) -> AUDIT-152 migration (826/905) -> polish (157/158/159/160) -> auto-resolved (161/153/154/155/149). AUDIT-099 (non-HF Exec wiring) waits on Track C. The trials/registry frontend wiring (Section 1.4 step 2/3) is a Track B consumer.
- **Track C - AGGREGATION / COMMERCIAL** (the 7th + 8th module backends): AUDIT-140 (kill cross-module double-count), AUDIT-145 (VBC service - build real), **AUDIT-148 (trials - build real, the Section 1.4 TRIALS node)**, AUDIT-143/146/147/141/144 (provenance honesty). Registry-abstraction (Section 1.4 step 3) extends this track.
- **Track D - SECURITY / PHI / AUTH:** AUDIT-010/012/014/020/080/081/003/077/076/002.
- **Track E - INFRA / OPERATIONAL:** AUDIT-085/111->131/130/110/072/074/079/038 + tech debt 004/005/006.

### 2.3 Re-sequenced ordering (the change v3.1 makes)

v3.0's critical path was "Track A clinical buildout is the longest chain." That remains true for pilot-readiness. v3.1's refinement: the **ingestion foundation is DONE** (it was implicit in v3.0 A.5's "PR #396 threading"; now fully built and proven at scale), so the immediate next node is **THREADING** (Section 1.4 step 1) - it is the single move that raises signal for the clinical buildout (Track A coverage), the trials matcher (Track C / 8th module), and registry-abstraction (Track C phase 3) at once. Lead still with any before-DUA safety + the AUDIT-118 matcher fix where they gate correctness; then threading; then trials backend; then registry-abstraction. "Concurrent" means interleavable by solo operator attention, never simultaneous.

---

## 3. Estimates (AUDIT-028 discipline - honest, ranges not commitments)

Method unchanged from v3.0: raw scope and AI-assisted wall-clock are different units, never conflated without a stated multiplier; the 2026-05 arc demonstrated robust-standard work at ~2-4x the naive budget; greenfield backend has no prior multiplier and is the largest estimation risk. Wall-clock is attention-bound (one solo operator), not parallelism-bound; calendar dates stay operator-side.

Newly-calibrated by this session (data points to carry into future estimates): the ingestion foundation + honesty sweep + re-ingest arc landed as a sequence of scoped, tested, single-finding PRs (#430-435) - the demonstrated cadence for backend-correctness work at the robust standard. The threading node is partly greenfield (new LOINC/procedure ingestion paths) and partly mechanical (restore the 4 suppressed rules once their signals thread); the trials matcher is greenfield (schema + service, needs scoping); registry-abstraction is greenfield AND operator-side-gated (needs the data dictionaries before it can be scoped). Underclaim until each first data point lands.

---

## 4. Success criteria / definition of pilot-ready

BSW goes on the REBUILT and perfected platform (the operator decision baked into v3.0) only when ALL hold:
- **Clinical safety:** before-DUA safety items closed; the matcher fixed and medication-presence rules proven on product-coded meds (golden-cohort negatives).
- **Clinical completeness at parity:** the buildout authored to the robust standard, all-6 modules at equal depth, every gap carrying its evidence object + §16-verified codes. Coverage reported honestly (Section 1.2), underclaimed, never rounded up.
- **Signal honesty:** the threading ceiling is named on every surface that depends on an unthreaded signal; no gap, trial-match, or registry field asserts on a signal no ingestion path threads (the hollow-over-fire / INDETERMINATE discipline, platform-wide).
- **PHI / auth correctness + production-readiness:** Track D core + AUDIT-085/080/014 closed; tenant isolation enforced.
- **UI to canon:** 18 -> 3 consolidation + component migration complete; no fabricated-KPI surface without provenance.
- **Commercial honesty:** the 7th (VBC / AUDIT-145) and 8th (trials / AUDIT-148) module backends built real, or - if any commercial surface is shown - honestly provenance-labeled; no advertise-as-paywalled-but-absent capability.

---

## 5. What is explicitly deferred (AFTER) - intentional, not accidental

Carried from v3.0 Section 7: pure tech debt (AUDIT-002 :any, AUDIT-004 @ts-nocheck removal, AUDIT-005 god-files, AUDIT-006 deps, AUDIT-008/021 INFO); lowest-value infra (AUDIT-072/074/079/038/007/110/130/111->131); process/latent (AUDIT-137 VHD baseline meta, AUDIT-106 provenance join-key - foundational only if a report spine is re-adopted, AUDIT-142 latent re-creation site). None blocks pilot-readiness.

---

## 6. Document discipline + lineage

- **Single canonical authority:** `docs/PATH_TO_ROBUST.md` is always the current plan. Update in place; do not fork a new version-numbered file (the v2.1 -> v3.0 fork was itself a drift source, resolved here). Prior versions are archived with SUPERSEDED headers.
- **Supersession:** v3.1 supersedes v3.0 (archived); v3.0 superseded v2.1; v1.2 archived. The which-doc-is-live ambiguity is closed - this file is live.
- **Honesty:** underclaim coverage (Section 1.2), name the threading ceiling, no aspirational dates, severity copied register-literal per §18, tech debt named via an AUDIT entry not propagated.
- **Off-repo discipline (CLAUDE.md §12):** operator-side commitments (the registry-dictionary partnership, stakeholder dates) stay operator-side; effort is person-effort, wall-clock operator-side.
- **DRIFT-44:** hyphen-only, `->` for arrows, `§` the only permitted non-ASCII.
