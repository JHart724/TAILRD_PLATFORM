# PATH TO ROBUST v3.0 - TAILRD HEART PLATFORM (Audit-to-Build Pivot)

**Author:** Jonathan Hart
**Version:** v3.0 (build-execution plan)
**Date:** 2026-06-14
**Status:** ACTIVE strategic plan for the build phase (operator-approved 2026-06-14). **SUPERSEDES v2.1** (`docs/PATH_TO_ROBUST.md`, the 2026-06-04 report-spine reorganization) as the active strategic authority. v3.0 is the build-execution authority; v2.1's report-deliverable lens is subsumed into v3.0's track model (the prior report-class organization - per-module inventories, service-line cuts, ROI rollup, research/registry extracts - is carried as the commercial/aggregation and clinical deliverables of Tracks A and C rather than as a separate spine). v2.1 is archived as the report-lens predecessor.
**Authored against:** the v3.0 PATH_TO_ROBUST Step 1 corrected inventory (73 OPEN findings + 528-gap clinical buildout, severities reconciled per Step 1.5 / PR #389), the Step 2 gate + dependency + parallelization resolution, and the Step 2.5 AUDIT-118 match-engine verification (CONFIRMED HIGH P1).
**Companions / cited corpus:** `docs/PATH_TO_ROBUST.md` (the on-disk report-spine plan - see the lineage note below), `docs/audit/AUDIT_FINDINGS_REGISTER.md`, `docs/audit/AUDIT_METHODOLOGY.md`, `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md`, `docs/design/UI_CANON.md`, `docs/design/UI_DESIGN_DECISIONS.md`, `BUILD_STATE.md`, `CLAUDE.md`.

**LINEAGE NOTE (RESOLVED 2026-06-14, operator):** the on-disk `docs/PATH_TO_ROBUST.md` is labeled **v2.1** (the 2026-06-04 report-spine reorganization), and `v1.2` is archived at `docs/PATH_TO_ROBUST_v1.2_ARCHIVE.md`. **v3.0 SUPERSEDES v2.1** as the active strategic plan for the build phase. This document is the **build-execution lens**: it organizes the build program by the five execution tracks and the four gates the Step 1-2.5 arc resolved, where v2.1 organized the same scope by the report-deliverable spine. They are not contradictory - v2.1 answered "what must a BSW-facing report contain and in what order," this answers "what gets built, in what dependency order, to put BSW on a perfected platform" - and v2.1's report-class organization is subsumed into v3.0's track model (carried as the deliverables of Tracks A and C, not a separate spine). Resolved per operator decision 2026-06-14; v2.1 archived as the report-lens predecessor. Recorded in Section 8.

---

## 1. Executive frame - the audit-to-build pivot

v3.0 is the pivot from AUDIT to BUILD. The audit phase is complete: six modules carry per-gap clinical-code audit addenda, the findings register holds 73 OPEN findings at reconciled severities, and the clinical coverage is measured against the live crosswalks (75 DET_OK / 164 PARTIAL / 364 SPEC_ONLY across 603 spec gaps). v1.2's Phase 0 (audit) is **COMPLETE**; this plan supersedes that phase's posture for the build program.

**The posture (operator-codified, carried verbatim):** most-robust, perfected-platform-for-pilot, no shortcuts. "We do it right; we don't cut time" (robust-over-consistent-with-existing, 2026-05-07). Extend-timeline-not-scope (2026-05-03). Tech debt is named via an AUDIT entry, not propagated. Module Parity Principle: uniform depth across all 6 active modules, gap-type batching preferred over module-by-module serialization, no phase complete until all 6 are at parity. Off-repo discipline (CLAUDE.md §12): no stakeholder dates or commitments live in this document.

**The headline scope.** Four bodies of work converge on one pilot-ready platform:
1. **73 OPEN findings** - correctness, safety, security, provenance, and polish defects across all layers.
2. **528-gap clinical buildout** - 364 SPEC_ONLY (zero coverage, author new) + 164 PARTIAL_DETECTION (upgrade existing), per-module, tier-ordered.
3. **The UI rebuild** - 18-to-3 view consolidation, the 826/905 component migration, the glass/motion/elevation/chart systems, built to `UI_CANON.md` + `UI_DESIGN_DECISIONS.md`.
4. **Two commercial features built real** - the VBC quality-measure service (AUDIT-145) and the research / trial-matching capability (AUDIT-148).

**The decisive constraint (operator decision, baked in):** BSW runs the pilot on the **REBUILT and perfected platform**, not the current one. That single decision makes the UI rebuild, the clinical buildout, and the two commercial features **pre-pilot critical work**, not deferred polish. The deferred bucket (Section 7) is correspondingly small: pure tech debt and the lowest-value infrastructure.

---

## 2. The gate model

Four gates classify every item by the external condition that must hold before it is true. Because BSW runs on the perfected platform, the **before-pilot set is large** (clinical correctness + clinical buildout + UI rebuild + commercial features + PHI/auth + production-infra) and the **AFTER set is small** (pure tech debt + lowest-value infra).

### Gate 1 - BEFORE-DUA (real PHI flows / real clinicians act)
Clinical-safety and PHI/auth correctness that becomes live patient or data risk the moment real data flows. Synthetic-data mitigation evaporates here.
- **Clinical safety (escalated to before-DUA now, per operator decision):** AUDIT-117 (dabigatran SCD miss), AUDIT-124 (VD-1 bioprosthetic over-anticoagulation), AUDIT-136 (mech-valve-in-pregnancy warfarin teratogenicity, Tier-S GAP-VHD-099).
- **Match-engine correctness:** AUDIT-118 (silent medication under-detection - CONFIRMED HIGH, Step 2.5).
- **FHIR-path detection:** AUDIT-070 (ABI LOINC mapping; FHIR is the DUA ingestion path).
- **Auth / PHI correctness:** AUDIT-010 (refresh token = JWT), AUDIT-012 (revoked-session verify), AUDIT-014 (encrypted-PHI patient search), AUDIT-020 (fhir*Id plaintext), AUDIT-003 (console.* PHI-in-logs risk).

### Gate 2 - BEFORE-COMMERCIAL-CLAIM (advertise / sell a capability)
Capability-honesty and customer-facing-number correctness. Operator decision: **build the real features**, not disclose-and-defer.
- **Build real:** AUDIT-145 (VBC quality-measure service - dead-on-arrival, fails toward 100% compliance), AUDIT-148 (research / trial-matching - advertised but absent at any tier).
- **Fabrication / provenance honesty on customer surfaces:** AUDIT-099 (non-HF Executive fabricated KPIs, no demo indicator), AUDIT-147 (research fabricated trial/registry data), AUDIT-146 (fabricated exec table + provenance-blind badge), AUDIT-140 (cross-module double-count, >100% managed), AUDIT-141 (unsourced financial multipliers), AUDIT-144 (hardcoded freshness label).

### Gate 3 - PRODUCTION-READINESS (operational / infra before real traffic)
The register-marked production-gate set: operational capability + input validation. A before-DUA sibling, operational rather than clinical.
- AUDIT-014 (search; binding gate is before-DUA), AUDIT-011 Phase d (tenant strict-mode flip, soak-gated), AUDIT-085 (prod-Aurora migration execution path), AUDIT-080 (Zod on 21/26 mutating routes), AUDIT-081 (User.email blind-index; after AUDIT-014), AUDIT-077 (tenant-isolation hygiene), AUDIT-076 (HIPAA audit-action coverage).

### Gate 4 - AFTER (v3.0-build, no external gate; sequenced by dependency / value)
Pure tech debt + lowest-value infra. The intentionally-small bucket (Section 7).
- Tech debt: AUDIT-002 (:any / ESLint), AUDIT-004 (@ts-nocheck on gapRuleEngine), AUDIT-005 (god-files), AUDIT-006 (outdated deps), AUDIT-008 + AUDIT-021 (INFO).
- Lowest-value infra: AUDIT-072, AUDIT-074, AUDIT-079, AUDIT-038, AUDIT-007, AUDIT-110, AUDIT-130, AUDIT-111 -> AUDIT-131, AUDIT-137 (process meta), AUDIT-106 (provenance join-key; foundational if/when the report spine of v2.1 is in scope).

**ESCALATE-AT-DUA disposition (operator decision, baked in):** AUDIT-124, AUDIT-136, AUDIT-145, AUDIT-153 are **escalated NOW**, not deferred-with-trigger. 124/136 sit in before-DUA (safety); 145 in before-commercial-claim (build real); 153 (red semantic overload) is pulled into the before-pilot UI track (Track B) rather than left AFTER.

---

## 3. The five tracks

The Step 2 parallelization found five largely-independent layers. For a solo operator with AI-assisted execution, "track" means an interleavable workstream with its own internal forced-order; it does not imply concurrent execution. The binding constraint is operator attention (Section 4), not parallelism.

### Track A - CLINICAL (correctness + the 528-gap buildout)

**A.0 - the matcher fix FIRST (foundation).** AUDIT-118 (CONFIRMED HIGH, Step 2.5): the medication match path is exact-string RxCUI membership with no ingredient<->descendant normalization, across both runners (`runGapDetectionForPatient.ts:53`, `gapDetectionRunner.ts:100`) and 102 in-engine match-sites. Remediation: ingredient-normalize-at-match (roll each patient med RxCUI up to its ingredient via an offline static IN map; normalize both patient meds and value sets to a common ingredient granularity; deterministic, no network in the gap path per the CDS-exemption rule). Absorbs AUDIT-117 (dabigatran `1037045` -> ingredient `1037042`). Effort: **M-L** (Section 5). **BOUND mandatory sub-task (part of this work item's definition-of-done):** the AUDIT-118 matcher fix includes a mandatory post-fix cascade-flip pass - re-run the GAP-EP-007 / GAP-EP-043 / 044 / 046 / 048 classification (and the PV/HF/CAD medication-presence DET_OK set) against the FIXED matcher and file any reclassifications three-surface per §18, with evidence. This is resolved at fix-time on the running fixed-matcher behavior, NOT predicted in this plan (a classification change is §18-owned). The matcher fix is not DONE until the cascade-flip pass is run and any reclassifications are filed.

**A.1 - the ~128 medication gaps build on the fixed matcher.** Per Step 2.5, ~128 of 603 spec gaps (21%) depend on medication presence/absence matching, concentrated in HF (32%), EP (35%), CAD (33%); these must build AFTER A.0 or they rebuild the under-detection per gap.

**A.2 - the ~475 non-medication gaps build in parallel from day one.** Imaging-surveillance, structural, ICD-driven, and lab-threshold gaps do NOT touch the matcher (SH 6% / VHD 11% / PV 10% medication-dependent) and are parallel-safe with A.0.

**A.3 - the independent detection-correctness fixes** (no matcher dependency; any order, with the one paired edge): AUDIT-121 (bicuspid Q23.1 -> Q23.81), AUDIT-123 + AUDIT-124 (Z95 valve-type inversion; 124 depends on 123), AUDIT-133 / 134 / 135 / 136 (VHD detection defects), AUDIT-126 / 127 / 128 / 129 (SH wrong-target / under-detect), AUDIT-125 (severity-encoding), AUDIT-120 / 122 (over-broad), AUDIT-035 (= AUDIT-119, EP registry orphan), AUDIT-036 (HF vaccine orphan), AUDIT-037 (Math.random in cqlEngine scaffolding; §14), AUDIT-106 (provenance join-key).

**The 528 buildout, per-module, tier-ordered within each module** (operator representation decision). Counts verified against the live crosswalks (Step 2.5); med vs non-med split per Step 2.5 scope:

| Module | SPEC_ONLY (build new) | PARTIAL (upgrade) | Buildout | Med-dependent (gates on A.0) |
|---|---:|---:|---:|---|
| HF | 61 | 43 | 104 | ~32% (matcher-gated subset) |
| EP | 42 | 39 | 81 | ~35% |
| SH | 58 | 30 | 88 | ~6% (mostly parallel-safe) |
| CAD | 34 | 27 | 61 | ~33% |
| VHD | 94 | 11 | 105 | ~11% (mostly parallel-safe) |
| PV | 75 | 14 | 89 | ~10% (mostly parallel-safe) |
| **TOTAL** | **364** | **164** | **528** | **~128 of 603 gated; ~475 parallel-safe** |

Tier ordering within each module follows the crosswalk tier markers (T1 safety/highest-value first, then T2, then T3). VHD (94 SPEC_ONLY, 0 DET_OK) and PV (75 SPEC_ONLY) are the heaviest greenfield modules and are mostly parallel-safe (low med-dependence), so they can run from day one without waiting on A.0.

**A.4 - the surgical peri-operative completeness tranche (NEW buildout addition, KB-completeness class).** The 528 figure is the buildout of gaps that EXIST in the KB. A distinct, newly-surfaced layer is the **KB-completeness / spec-completeness** class: clinically-real, guideline-grounded gaps that are ABSENT from the KB and so were structurally invisible to the code-vs-KB Phase-0B audits (which can only find a gap the KB already specifies). The anchor finding is **AUDIT-163 (POAF prophylaxis absent; COR I; cardiac-surgery population; HIGH P1, FINALIZED 2026-06-15)**; the read-only spot-check found **7 of 8 peri-operative quality concerns absent** (prolonged ventilation, post-op AKI, re-operation for bleeding, post-op delirium, peri-op glucose, early extubation/mobilization, LOS-as-care-process), indicating a systematic surgical blind spot rather than a one-off. **This tranche GROWS the SPEC_ONLY denominator before it is built** (spec-add then code-build), predominantly SH/CAD/EP-owned (cardiac-surgery population + rhythm prophylaxis). Sizing is pending the full surgical KB-completeness audit (the methodology + audit are the next steps after AUDIT-163 is filed); the 528 buildout total will increase by that tranche's count once scoped. Sequenced as a pre-commercial-claim concern for any cardiac-surgery quality surface. See `docs/audit/AUDIT_FINDINGS_REGISTER.md` (KB-Completeness Findings section) + AUDIT-163.

### Track B - UI REBUILD

Build-to spec: `UI_CANON.md` (the rules) + `UI_DESIGN_DECISIONS.md` (the locked values - navy primary, navy-CTA so red is never a button, 12px card radius, logo-as-direction). The AUDIT-149..162 findings are the **deltas** between the current UI and the canon.

**Forced order (the Step 2 inferred edges, operator-confirm where flagged):**
1. **AUDIT-152 primitives** - ensure the shared component primitives exist (`btn-*`, `<Badge>`, `KPICard`, `BaseTable` - the last has ZERO importers today) before consolidation lands on them.
2. **AUDIT-151 consolidation (18 -> 3)** - collapse the 18 bespoke per-module view files to 3 shared parameterized views driven by per-module config; delete the clones. **The largest single UI work item.**
3. **AUDIT-152 migration (826 / 905)** - migrate ~826 hand-rolled `<button>` and ~905 hand-rolled `rounded-full` pills onto the primitives; delete the legacy. Cheaper into 3 consolidated views than 18 (the inferred edge for sequencing 2 before 3-migration).
4. **Polish layer (lands on the migrated component system):** AUDIT-157 (elevation / radius / glass consolidation), AUDIT-158 (motion system + the new declarative-motion dependency, through standard library review), AUDIT-159 + AUDIT-150 (one ChartTheme; the heatmap color-band collapse folds in as a §6 sibling), AUDIT-160 (one-spinner / one-empty / one-hover state standard).
5. **Auto-resolved / independent:** AUDIT-161 (flow inversions auto-resolve once 151 collapses the 6 Exec views to one canonical-order view), AUDIT-153 (red-token split - escalated now, index.css token-level, largely independent), AUDIT-154 (titanium token migration), AUDIT-155 (structural + label drift), AUDIT-149 (dead controls).
6. **AUDIT-099 (non-HF Exec wiring)** - in this track but **waits on Track C** (fix the aggregation backends before wiring the Exec surface; wiring fabricated KPIs to wrong aggregations is worse than mock).

### Track C - AGGREGATION / COMMERCIAL

Fix the aggregation correctness, then build the two commercial features real; this track feeds Track B's AUDIT-099.
- **AUDIT-140** - union patient-id sets (the in-repo `vbcService.ts:57 distinct:['patientId']` pattern) to kill the cross-module double-count (>100% managed).
- **AUDIT-145 (build real)** - the VBC quality-measure service. Needs a schema change (the dedup key collapses ~263 rules into 14 categories, so no rule-level numerator is expressible without one) + correct denominator/numerator/exclusions + verified measure IDs (ACO-13 misassigned, HEDIS-AOB unverified).
- **AUDIT-148 (build real)** - the research / trial-matching capability: a backend service + schema model (ClinicalTrial / TrialMatch / RegistrySubmission, none exist) + matching logic. Preserve the honest live ClinicalTrials.gov feed already in-repo (the AUDIT-147 counter-example).
- **AUDIT-143** (align platform.ts <-> platformTotals to one quantity + fix the cast), **AUDIT-146** (wire the provenance badge + back the tables), **AUDIT-147** (replace fabricated trial/registry display data), **AUDIT-141** (source the financial multipliers), **AUDIT-144** (wire freshness to a real compute timestamp).

### Track D - SECURITY / PHI / AUTH
- AUDIT-010 (refresh-token redesign), AUDIT-012 (revoked-session verify), AUDIT-014 (encrypted-PHI search blind-index), AUDIT-020 (fhir*Id encryption), AUDIT-080 (Zod coverage), AUDIT-081 (User.email blind-index - **after AUDIT-014**, shared design), AUDIT-003 (console.* -> logger), AUDIT-077 / AUDIT-076 (tenant + audit hygiene), AUDIT-002 (:any reduction, before-DUA-soft in PHI code).

### Track E - INFRA / OPERATIONAL
- AUDIT-085 (prod-Aurora migration execution path; ECS RunTask), AUDIT-111 -> AUDIT-131 (staging undeployable -> staging ECS health; 131 likely the same P3009, unverified), AUDIT-130 (Netlify site collision; after its CORS / staging-CFN / CSRF-on-refresh preconditions), AUDIT-110 (content-anchor the brittle line assertions), AUDIT-072 / 074 / 079 (data-layer hygiene), AUDIT-038 (Node 18 LTS tracking) + tech debt AUDIT-004 / 005 / 006.

---

## 4. Sequencing - the cross-track ordering

The tracks are layer-independent; the ordering below is by gate tier, then root-dependency-first within each track, then value. "Concurrent" means interleavable by operator attention (solo, AI-assisted), never simultaneous.

1. **Lead with before-DUA safety + PHI/auth correctness + the matcher fix.** The clinical safety items (AUDIT-117 / 124 / 136), the Track D auth/PHI core (AUDIT-010 / 012 / 014 / 020 / 003), and **AUDIT-118 (Track A.0)** lead. 118 is the single highest-leverage item: it is a M-L fix that unblocks ~128 gaps and closes three confirmed safety instances (GAP-EP-079 CRITICAL, EP-017 / EP-006 Class-3) at once.

2. **Run the two big critical tracks concurrently (interleaved):** Track A clinical buildout (the longest chain) and Track B UI rebuild. Track A.2 (the ~475 non-medication gaps) starts immediately, parallel to A.0; A.1 (the ~128 medication gaps) starts once A.0 lands. Track B runs 152-primitives -> 151 -> 152-migration -> polish on its own forced order.

3. **Track C feeds Track B's AUDIT-099.** Fix the aggregation backends (140/143) and build the commercial features (145/148) before wiring the Exec surface (099). The before-commercial-claim items gate any sell/advertise moment.

4. **Track E + the production-readiness gate items** sequence into the immediate-remediation arc as the report/deploy paths require them (AUDIT-085 before any prod migration; AUDIT-080 phased on the routes as they are built; AUDIT-011 Phase d post-soak).

**Critical path = Track A (clinical).** `AUDIT-118 (M-L) -> the ~128 medication gaps + the ~475 non-medication gaps (the 528 buildout, per-module tier-ordered) + the detection-correctness fixes`. This is the longest dependency chain in the program by a wide margin (the UI rebuild is second-longest). **Pilot-readiness is gated by:** all before-DUA safety + PHI correct; the matcher fixed and the 528 built to the robust standard at all-6 parity; the UI rebuilt to canon; the two commercial features real; the production-readiness gate items closed (Section 6).

---

## 5. Estimates (AUDIT-028 discipline - honest, ranges not commitments)

**Method.** Raw scope (gap counts, greenfield backend) and AI-assisted wall-clock are different units and are never conflated without a stated multiplier. The 2026-05 calibration arc is the only demonstrated data: audit + gate-item work ran **~2-4x the naive budget** (Phase 4/5/0C: ~25-40h actual vs ~10-20h budgeted) - i.e. robust-standard work took 2-4x longer than naive estimates, NOT faster. Greenfield backend (the VBC service, the research engine, the report engine if in scope) has NO prior multiplier and is the largest estimation risk. Wall-clock is **attention-bound** (one solo operator), not parallelism-bound; calendar dates stay operator-side per CLAUDE.md §12.

**Per-item ranges (raw-scope -> AI-adjusted with the 2-4x where the class is known; "needs scoping" where greenfield):**

| Item | Raw scope | AI-adjusted (x2-4 known / greenfield flagged) |
|---|---|---|
| AUDIT-118 matcher fix (A.0) | M-L (~3-5 person-days: IN map + normalize both sides + safety negatives) | ~6-12 person-days at the demonstrated multiplier |
| AUDIT-151 view consolidation (18->3) | XL | greenfield-architecture; needs scoping after the first view collapses (calibrates the rest) |
| AUDIT-152 component migration (826/905) | XL | mechanical-but-vast; ~2-4 weeks; calibrate on the first 100 migrations |
| AUDIT-157/158/159/160 polish | L-XL combined | ~2-3 weeks; 158 adds a dependency-review gate |
| AUDIT-145 VBC (build real) | L-XL (schema change + measure logic) | **greenfield - needs scoping** |
| AUDIT-148 research (build real) | L-XL (service + schema + matching) | **greenfield - needs scoping** |
| Track D auth/PHI core (010/014/080) | M-L each | ~2-4x each |
| Track E infra (085/111/130) | M each | ~2-4x each |

**The 528 buildout - derived from an explicit, flagged authoring-rate assumption (NOT a lump guess).**

There is **no demonstrated authoring rate** yet - the audit arc demonstrated an audit/classification rate (~1-1.3 min per gap, ~95-150 min per ~90-gap module), but **authoring** a robust gap (detection logic + evidence object + §16-verified codes + golden-cohort tests) is a heavier, different unit. The Module Parity Principle's gap-type batching (author a gap-TYPE pattern once, apply across modules) is the effective-rate lever, so the rate is per-pattern-batched, not naive per-gap. Stated assumption band (UNVALIDATED - the first buildout module calibrates it exactly as EP calibrated the audit rate):

- **T1 bespoke SPEC_ONLY** (detection + bespoke UI + calculator): assume ~0.5-1.5 gaps/person-day. Count ~31 (HF7 / EP3 / SH5 / CAD6 / VHD6 / PV4) -> **~21-62 person-days**.
- **T2/T3 templated/catalog SPEC_ONLY** (batched by gap-type): assume ~2-5 gaps/person-day. Count ~333 -> **~67-167 person-days**.
- **PARTIAL upgrades** (logic exists, needs strengthening): assume ~3-8 gaps/person-day. Count 164 -> **~21-55 person-days**.
- **Buildout total (raw authoring + test): ~109-284 person-days.** This already includes the test authoring; it does NOT include the AUDIT-118 fix or the detection-correctness fixes (separate above).

**Pilot-readiness wall-clock RANGE (estimate, NOT a commitment).** Summing the critical path (the ~109-284 person-day buildout + the M-L matcher fix + the detection-correctness fixes) interleaved with Track B (the XL UI rebuild, ~6-10 weeks) and Track C (two greenfield commercial features, needs-scoping), and applying the attention-bound solo constraint, pilot-readiness reads as a **multi-month effort measured in person-months, not weeks** - on the order of the v2.1 timeline math's "10-14 week" read for the report scope, plausibly longer once the UI rebuild and the two greenfield commercial features are added and the buildout authoring rate is unfavorable. **This is a wide estimate, not a date.** Three things narrow it and MUST be measured before any commitment: (1) the AUDIT-118 fix actual, (2) the first buildout module's authoring rate, (3) the first AUDIT-151 view collapse. Underclaim until those three data points land; recalibrate this section as each does.

---

## 6. Success criteria / definition of pilot-ready

BSW goes on the platform only when ALL hold:
- **Clinical safety:** all before-DUA safety items closed (AUDIT-117 / 124 / 136); the matcher fixed (AUDIT-118) and the medication-presence rules proven to fire on product-coded meds (golden-cohort negative tests for the three safety instances).
- **Clinical completeness at parity:** the 528 buildout authored to the robust standard, all-6 modules at equal depth (Module Parity - no module ships unaudited or under-built); every gap carries its evidence object + §16-verified codes.
- **PHI / auth correctness:** AUDIT-010 / 012 / 014 / 020 / 003 closed; tenant isolation enforced (AUDIT-011 Phase d post-soak).
- **Production-readiness:** AUDIT-085 (migration path), AUDIT-080 (Zod on the live routes), AUDIT-014 (search) closed.
- **UI to canon:** the 18->3 consolidation and the component migration complete; the platform conforms to `UI_CANON.md` + `UI_DESIGN_DECISIONS.md`; no fabricated-KPI surface without provenance (AUDIT-099 wired).
- **Commercial honesty:** AUDIT-145 (VBC) and AUDIT-148 (research) built real, or - if any commercial surface is shown - honestly provenance-labeled; no advertise-as-paywalled-but-absent capability.

---

## 7. What is explicitly deferred (AFTER) - intentional, not accidental

Named so deferral is a decision, not an oversight. None blocks pilot-readiness.
- **Pure tech debt:** AUDIT-002 (:any / ESLint, except where it touches PHI code), AUDIT-004 (@ts-nocheck removal, Sprint C-9), AUDIT-005 (god-file split), AUDIT-006 (dep upgrades), AUDIT-008 + AUDIT-021 (INFO).
- **Lowest-value infra:** AUDIT-072 (soft-delete), AUDIT-074 (schema hygiene), AUDIT-079 (connection_limit), AUDIT-038 (Node 18 tracking), AUDIT-007 (moderate CVE chain), AUDIT-110 (test-infra line assertions), AUDIT-130 (Netlify, post-DUA, gated on a real-API frontend consumer), AUDIT-111 -> AUDIT-131 (staging environment; not a prod gate).
- **Process / latent:** AUDIT-137 (VHD baseline meta - re-verify, no runtime defect), AUDIT-106 (provenance join-key - foundational only if the v2.1 report spine is adopted; otherwise AFTER), AUDIT-142 (latent re-creation site for AUDIT-140 on an unconsumed endpoint).

---

## 8. Open decisions carried

1. **Document lineage - RESOLVED 2026-06-14 (operator).** v3.0 SUPERSEDES v2.1 as the active strategic plan for the build phase; v2.1's report-deliverable lens is subsumed into v3.0's track model (carried as the Track A and Track C deliverables); v2.1 is archived as the report-lens predecessor. No longer open.
2. **AUDIT-118 cascade-flip - RESOLVED to a BOUND sub-task, not a loose carried-decision.** The re-application of the §16.5 cap (DET_OK -> PARTIAL) to the ingredient-matched DET_OK rules GAP-EP-007 / 043 / 044 / 046 / 048 and the PV/HF/CAD medication-presence DET_OK set is bound as a mandatory post-fix sub-task of the Track A.0 matcher-fix work item (Section 3): re-run those classifications against the FIXED matcher and file any reclassifications three-surface per §18, with evidence, at fix-time. It is resolved on running fixed-matcher behavior, NOT predicted now; the matcher fix is not DONE until the cascade-flip pass runs. (The v2.1 plan flagged this as the forward §16.5 reconciliation gate at Module Parity; v3.0 binds it to the matcher work item.)
3. **"Needs scoping" items** (Section 5): AUDIT-145 VBC and AUDIT-148 research are greenfield with no prior multiplier; AUDIT-151 view consolidation calibrates after the first collapse. These three carry the largest estimation risk and are not committed until scoped.
4. **The authoring-rate assumption** (Section 5) is unvalidated; the first buildout module is the calibration event. The pilot-readiness range recalibrates once (a) the AUDIT-118 actual, (b) the first module's authoring rate, and (c) the first AUDIT-151 view collapse land.
5. **Parking lot - known, not on the critical path** (recorded so they are not lost): the task-def-revision treadmill (deploy ergonomics), the OneDrive index-write hiccup on fast-forwards (tooling), the legacy em-dash wrapper text in older register entries (DRIFT-44 cleanup), and a CROSS_MODULE_WORKFLOW_MATRIX retro-map (cross-module satisfaction cases for service-line cuts, per the v2.1 report-spine plan). None gates pilot; each is picked up opportunistically or when its own trigger fires.

---

## 9. Document discipline

- Supersession resolved on operator approval (Section 8 item 1); until then this is a DRAFT, not the cited authority.
- Severity is copied register-literal per §18; this plan never re-classifies (AUDIT-118 HIGH is operator-finalized on the Step 2.5 evidence; all other severities are reconciled per Step 1.5 / PR #389).
- DRIFT-44: hyphen-only, `->` for arrows, `§` the only permitted non-ASCII.
- Off-repo discipline (CLAUDE.md §12): no stakeholder dates or commitments; effort ranges are person-effort, calendar wall-clock stays operator-side.
- Robust-first, extend-timeline-over-scope, named-tech-debt-not-propagated - carried verbatim from the strategic posture.
