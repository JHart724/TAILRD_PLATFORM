# PATH TO ROBUST - TAILRD HEART PLATFORM v2.1 (Report-Spine Reorganization)

**Author:** Jonathan Hart
**Version:** v2.1
**Date:** 2026-06-04
**Status:** ACTIVE (operator-approved 2026-06-04) - reorganizes v2.0 (2026-05-20) around the report-deliverable spine; supersedes v2.0.
**Operator decision (2026-06-04):** v2.1 label confirmed; fingerprint-first NOT-adopted disposition confirmed (Section 7); **cut-line = A-as-60-day-milestone within C's extend-posture** - all-6 module trust + report class (a) per-module inventories land in the 60-day window; classes (b) service-line cuts / (c) 4-pathway ROI / (d) research-registry continue immediately after off the SAME spine; NO scope cut (Section 8: cut-line A milestone executed under cut-line C extend-timeline posture).
**Supersedes:** v2.0 (2026-05-20); v1.2 archived at `docs/PATH_TO_ROBUST_v1.2_ARCHIVE.md`
**Companions:** `docs/audit/AUDIT_METHODOLOGY.md`, `docs/audit/AUDIT_FINDINGS_REGISTER.md`, `BUILD_STATE.md`, `docs/planning/V2_HARVEST_PLATFORM_HARDENING.md`, `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md`, `CLAUDE.md`

**Version-number note (operator decision):** this draft is labeled v2.1 to avoid two distinct documents both named "v2.0" in history (the 2026-05-20 v2.0 was framed around the 603-gap production-grade build; this reorganizes the SAME scope around the report deliverable). If you prefer to keep the "v2.0" label, say so and I will rename - no content changes.

---

## 1. Mission + the reorganizing principle

Ship a fully production-grade TAILRD platform across 6 active cardiovascular modules: Heart Failure (126 gaps), Electrophysiology (89), Structural Heart (88), Coronary Artery Disease (90), Surgical Valvular Heart Disease (105), Peripheral Vascular (105). **603 active structured clinical decision gaps** (90 T1 + 391 T2 + 122 T3, verified at PR #290 matrix verification). Cross-module / Disparities / Safety (CX; 105 gaps) deferred per the 2026-05-03 operator decision; revisit at v3.0.

**The reorganizing principle (the change from v2.0):** the 60-day deliverable is **DATA OUTPUTS IN REPORTS** covering all 6 modules + the service-line tier + research/registry outputs. **Platform-UX work queues behind report-critical work.** v2.0 sequenced by tier (T1 bespoke UI -> T2 templated -> T3 catalog); v2.1 sequences by what a report needs to be correct and complete, and treats bespoke UI polish as downstream of report integrity. The gap-detection engine, the clinical-code correctness, and the classification metadata all exist to feed reports a health-system executive trusts; the report is the product surface that matters first.

This is not a scope change - all 603 gaps, all 6 modules, service-line, and research/registry remain in scope. It is a **sequencing change**: report-critical work first, UI polish second.

---

## 2. Strategic posture (carried forward verbatim from v2.0; hyphen-normalized per DRIFT-44)

These are operator-codified and carried forward unchanged:

- **Operating principle:** enterprise / Palantir-grade across all dimensions per operator 2026-05-07 codification. Depth is the default. UI polish is tiered (T1 bespoke, T2 templated, T3 catalog). Every gap is real. Solo execution.
- **Extend-timeline-not-scope (2026-05-03):** when audit findings force a choice between timeline and scope, extend timeline; do not reduce scope. Module Parity Principle preserved. All Tier 1+2+3 gaps in scope (CX deferred, revisit at v3.0). Research / registry backend in scope.
- **Robust-over-consistent-with-existing (2026-05-07):** "We do it right; we don't cut time." Tech debt is named via an AUDIT entry, not propagated; path-of-least-resistance framing is a drift indicator (DRIFT-33 + DRIFT-36).
- **Path B (depth) + Path A (tiered UI) combined:** Path B is default (every gap properly implemented: detection logic + citations + calculator where applicable); Path A layers on top (T1 bespoke, T2 templated, T3 catalog). **Parallel module advancement, not serial** (Module Parity Principle; anti-HF-first explicit).
- **Module Parity Principle (§13 of v2.0, carried as Section 5 here):** uniform depth across all 6 active modules. No phase is complete until all 6 are at parity for that phase. Gap-type batching across modules is preferred over module-by-module serialization. Shared UI patterns + shared test harnesses are first-class deliverables (parity by construction). Audit module parity at every checkpoint; drift > 2 days triggers rebalancing. The instinct to "polish HF more" or "PV does not need that" is a rejected anti-pattern.
- **Off-repo discipline (CLAUDE.md §12):** operator-side commitments stay operator-side. No specific dates, deliverables, or stakeholder commitments are surfaced in this plan document. This plan is the in-repo strategic anchor, not the stakeholder communication surface.

---

## 3. The report spine (THE CENTRAL ARCHITECTURAL DECISION)

The single most important decision in v2.1: **one data spine carries a gap from detection to every report class.** Everything report-facing routes through it. The convergence, named explicitly:

```
stable gap ids  (absorbs AUDIT-106)
      |
      v
per-rule manifests  (V2-harvest Section 2 artifact; YAML, one per gap rule)
   carrying: clinical basis (guideline + COR/LOE + stable KB anchor),
             FHIR inputs, logic reference, exclusions,
             THREE-AXIS CLASSIFICATION + BSW ROI PATHWAY TAGS, risk_class
      |
      v
backend report engine  (reads manifests + live detection output)
      |
      v
the four report classes:
   (a) per-module gap inventories x6
   (b) service-line cuts  (three-axis: workflow stage / BSW ROI pathway / cross-cutting tags)
   (c) 4-pathway BSW ROI rollup  (from REAL detection sources, not mock)
   (d) research / registry extracts  (cohort-format + registry-format)
```

**Why this is the central decision:** the 2026-06-03 report-pipeline inventory (Appendix A) found the backend report engine ABSENT, the three-axis service-line classification ABSENT, the executive ROI rollup a hardcoded mock shell, and research/registry export ABSENT. Existing reporting is client-side CSV/PDF over largely-mock data for ~3-4 of 6 modules. So the report deliverable is **mostly greenfield**, and every report class depends on the same upstream artifacts. Building four report classes against four ad-hoc data paths would re-create the mock-surface problem (AUDIT-099) at the report layer. One spine, four consumers.

**The manifest IS the classification carrier.** The V2-harvest Section 2 per-rule manifest is not a documentation nicety; it is the data structure that carries the three-axis classification (workflow stage / BSW ROI pathway / cross-cutting tags) and the risk_class. The service-line cuts (class b) and the 4-pathway ROI rollup (class c) are projections over the manifest's classification fields joined to live detection output. Without the manifests there is no structured classification to cut by - which is exactly why class (b) is ABSENT today.

**The AUDIT-106 stable-id fix is the shared structural prerequisite.** Manifests require a stable `id` on every inline `gaps.push` node so each manifest binds to exactly one rule. That `id` back-reference IS the AUDIT-106 structural prerequisite (the A<->B shared join key whose absence makes A<->B provenance consistency un-gateable today). **One structural fix serves both:** it unblocks AUDIT-106's deferred A<->B validator pass AND gives the manifests their binding key. This fix is the first item on the critical path (Section 6, Phase R0).

**Pipeline-sibling discipline (V2-harvest Section 2 HARD requirement):** the manifest tooling and the report engine are built as siblings of the existing auditCanonical pipeline (the `extractCode.ts` / `validateEvidenceObjects.ts` family), reusing the AST-extraction + canonical-JSON conventions. NOT a parallel toolchain. KB references use stable anchor IDs, never raw line ranges (the catch-#89 / KB-parse-coupling failure mode); adding anchor IDs to `CLINICAL_KNOWLEDGE_BASE_v4.0.md` is part of this work.

---

## 4. Report-correctness gating (sequenced EARLY)

**A wrong number in a BSW-facing report is worse than a missing report.** Three known clinical-correctness defects produce wrong report numbers and are sequenced BEFORE any report class ships:

- **AUDIT-101 (HIGH, OPEN)** - `gap-cad-statin` ingredient-level `STATIN_CODES` cannot encode high-intensity dose, so the high-intensity-statin gap silently fails to fire for patients not on a high-intensity statin. In a report this is an undercount of a guideline-directed-therapy gap - the worst kind of wrong number (it tells a CMO there is no gap when there is). Must be fixed before CAD lipid gaps appear in any report.
- **AUDIT-070 (OPEN)** - `observationService.CARDIOVASCULAR_LAB_CODES` lacks ABI LOINC mappings, so FHIR-ingested ABI patients never reach the PAD screening rule (CSV path unaffected). In a report this is a silent miss of PAD gaps for FHIR-sourced cohorts. Must be fixed before PV reports ship against FHIR-ingested data.
- **AUDIT-016 §10.7 legacy-purpose carryover** - ~10 `patients.firstName` envelopes carry the legacy V2 encryption purpose (`phi-migration-v0v1-to-v2`) rather than the canonical purpose. This is a content/purpose-discriminator divergence INVISIBLE to a plaintext-prefix census (the AUDIT-108 backfill did not and could not address it). It is not broken data today (the rows decrypt under the legacy purpose), but any report path that reads those patient rows under the canonical purpose would fail. Must close before patient-data reports ship. Tracked under AUDIT-016; sequenced into Phase R0.

**The golden-dataset suite (V2-harvest Section 1) is the standing protection for report integrity.** Per-gap version-pinned synthetic (Synthea) cohorts - true positives that MUST fire, near-miss true negatives, one patient per exclusion path, boundary cases - run BLOCKING on merge to main with a per-patient diff, plus targeted PR runs via a gap-rule-to-cohort dependency map. The intentional-change protocol (expected.json update + clinical sign-off in the same PR with rendered diff) makes a report-number change a reviewed, signed event rather than a silent regression. This reuses the clean-baseline hard-gate discipline of the evidence-object validator (PR #337). The golden suite is what keeps report numbers correct as the engine and the rules evolve; it is built in Phase R0 alongside the manifest schema, before report classes are authored.

---

## 5. All-6-module coverage on the critical path

**All-6 coverage rule (report-scoped Module Parity):** no module's outputs ship in a BSW-facing report without its per-gap clinical-code audit complete to the §16 standard. A report that is rigorous in HF/CAD/PV and unaudited in EP/SH/VHD is a report that publishes unverified numbers for half the platform - exactly the credibility failure the Module Parity Principle exists to prevent.

- **Done:** HF, CAD, PV have Phase 0B audit addenda (per-module §8 implications: PV 4 T1 SPEC_ONLY + 2 PARTIAL + 1 DET_OK, verdict LIGHTLY BUILT; HF 7 SPEC_ONLY + 14 PARTIAL + 8 DET_OK; CAD 8/18 T1 DET_OK, MODERATELY BUILT).
- **On the critical path:** EP, SH, VHD per-gap clinical-code audits to the §16 standard (external-source verification of every RxNorm/LOINC/ICD-10 constant; codebase trust insufficient). These three modules' numbers are NOT report-trustworthy until audited. They gate their modules' report outputs.
- **Empirical wall-clock logging starts at EP** per AUDIT-028 / methodology §7 (the empirical floor: rule-body + spec-citation ~95-120min per ~90-gap module; AUDIT-030.D multi-pattern ~120-150min). EP is the first new data point that calibrates the v2.1 timeline math (Section 8); log it to `audit_runs.jsonl`.
- **CROSS_MODULE_WORKFLOW_MATRIX retro-mapping after EP:** once EP is audited, retro-map the cross-module satisfaction cases (the Phase 0B §11 material: e.g. HF GAP-HF-021/024/025/026 satisfied by EP device evaluators) into a workflow matrix so service-line cuts (class b) reflect real cross-module dependencies, not per-module silos.
- **AUDIT-118 retroactive reconciliation (v2.0 cross-module synthesis input; filed 2026-06-08 from the EP audit; NOT a re-audit, NOT a register reopen):** the merged PV/HF/CAD **medication-based DET_OK** classifications predate AUDIT-118 + the §16.5 modifier, so they may **overstate coverage** - any DET_OK whose detection asserts "patient is ON drug X" by exact-ingredient-membership with no ingredient->descendant expansion is capped at PARTIAL_DETECTION under §16.5 until AUDIT-118 is remediated (exempt: descendant-enumerated value sets or the AUDIT-101 resolver). The EP Batch-1 cascade flipped 7 EP gaps on this basis; PV/HF/CAD were not re-examined. **At v2.0 Module-Parity reconciliation, re-apply the §16.5 modifier to the PV/HF/CAD medication-presence DET_OK set against the completed 0B baseline** before any of those DET_OK counts are reported as trustworthy. (This is the report-correctness reason the §16.5 cap exists; it does not reopen the 0B register entries - it is a forward reconciliation gate.)

---

## 6. The phases (reorganized around the report spine)

Tier 1/2/3 UI build and the production-readiness gate items from v2.0 are NOT removed; they fold into / queue behind these report-critical phases per the reorganizing principle. Hours are AUDIT-028-multiplied estimates (Section 8); they are ranges, not commitments.

### Phase R0 - Spine foundations (the critical-path prerequisites)
- **AUDIT-106 stable-`gaps.push`-`id` fix** (shared prerequisite: manifests + A<->B validator). FIRST item.
- **Per-rule manifest schema + tooling** as a sibling of the auditCanonical pipeline; stable KB anchor IDs added to `CLINICAL_KNOWLEDGE_BASE_v4.0.md`.
- **Golden-dataset harness** (Section 1): blocking-on-merge gate + intentional-change protocol + dependency map. Seed cohorts for the already-audited modules first.
- **Report-correctness findings:** AUDIT-101, AUDIT-070, AUDIT-016 §10.7 closed (Section 4).
- Production-readiness gate items that block any production report path (AUDIT-109 error logging, the AUDIT-107 smoke - see Block 2 - are sequenced here as report-deploy prerequisites).

### Phase R1 - Module trust + classification (all-6 parity)
- **EP, SH, VHD per-gap audits** to §16 (Section 5), with EP first + wall-clock logging.
- **Per-module manifests authored** carrying the three-axis classification + BSW ROI pathway tags + risk_class, for all 6 modules (the classification carrier exists only once manifests do).
- **Six module risk files** (V2-harvest Section 4, ISO-14971-aligned; HF first; clinical sign-off per file; risk_class in manifests references them).

### Phase R2 - Report engine + the four classes
- **Backend report engine** reading manifests + live detection output (greenfield; the central spine consumer).
- **Class (a) per-module gap inventories x6** - the first and simplest projection.
- **Class (b) service-line cuts** - three-axis projection over manifest classification + the CROSS_MODULE_WORKFLOW_MATRIX.
- **Class (c) 4-pathway BSW ROI rollup** - from REAL detection sources (replacing the mock `ROICalculationEngine` shell), structured around the four BSW pathways.
- **Class (d) research / registry extracts** - cohort-format + registry-format export (greenfield; the Approval-token gating of V2-harvest Section 3 feeds the Pattern-2 scoping audit before any write-back design).

### Phases beyond R2 (queue behind reports)
- Tier 1 bespoke UI (90 gaps), Tier 2 templated UI (391), Tier 3 catalog (122) - the v2.0 build, now downstream of report integrity.
- Phase 0C UI/UX gate cluster, DESIGN_SYSTEM_SPEC.md, the 14 HIGH P1 GATE items not already pulled forward as report prerequisites.

---

## 7. Deferred list with explicit triggers

Recorded so each is picked up when - and only when - its trigger fires. None is in the 60-day report window unless its trigger states otherwise.

- **Front door / login button + frontend production deploy decision.** Trigger: the first report class is ready to demo to a BSW-facing reviewer (reports need a way in). Until then the backend report engine + API is the deliverable; the frontend production deploy + app.tailrd-heart.com DNS is a separate decision.
- **AUDIT-099 restructure (non-HF Executive fabricated-KPI surfaces).** Trigger: an interim client-side export ships against those surfaces. **Minimum viable interim = Demo-Data badging IF any existing client export ships before the backend report engine lands** - never publish a fabricated number without a Demo-Data indicator. Full restructure (HF-style backend wiring) queues behind the report engine.
- **Smoke blocking posture beyond a failure alert.** Trigger: a green post-rotation smoke baseline exists (Block 2 ships the alert-only posture now; deploy-gating is a later operator decision once the smoke is reliably green).
- **Phase 0C (full UI/UX gate cluster).** Trigger: report classes (a)-(d) shipped; UI polish is platform-UX, queued behind reports per the reorganizing principle.
- **AUDIT-080 (Zod validation coverage, 21 of 26 mutating routes).** Phased: the mutating routes on the report-engine API path are validated as those routes are built; the remaining routes phase in behind.
- **V2-harvest deferred capabilities (Section 6):** execution-mode separation (trigger: a research partnership reaches scoped data-access requirements); plugin / MCP-style extension surface (trigger: a third customer integration that does not fit the EHR path, OR a major scale milestone).
- **V2-harvest open decision (Section 7):** fingerprint-first audit logging stays deferred - architecturally incompatible with the deployed V2-envelope + per-record EncryptionContext architecture. **Disposition for v2.1 (per the required trade-off note): NOT adopted.** The encryption-with-context architecture is live across the full PHI surface (AUDIT-016 V2 envelopes + the 2026-06-04 AUDIT-108 backfill). Reversing to fingerprint-first would require re-architecting the deployed PHI encryption + every read-path context reconstruction, for an audit-channel benefit that the existing CloudTrail kms:Decrypt EncryptionContext payload already largely provides. Trade-off recorded; decision is to keep the deployed architecture. Reopen only if a concrete audit-channel requirement the current architecture cannot meet is named.

---

## 8. Timeline math (AUDIT-028; underclaim)

**Method (AUDIT-028 work-mix):** raw scope (gap counts, lines of greenfield engine) and AI-assisted wall-clock are different units; they cannot be conflated without a stated multiplier. The 2026-05 arc is the calibration data: audit + gate-item work ran ~2-4x the raw budget (Phase 4/5/0C: ~25-40h actual vs ~10-20h budget). Greenfield backend (the report engine, the manifest tooling, the registry extracts) has no prior multiplier and is the largest estimation risk.

**Raw-scope inventory for the 60-day report window:**
- Spine foundations (R0): AUDIT-106 id fix + manifest schema/tooling + golden harness + KB anchors + 3 correctness findings (101/070/§10.7). Greenfield tooling + clinical-code fixes.
- Module trust (R1): EP + SH + VHD audits (3 modules x the §16 per-gap floor) + 6 modules of manifests + 6 risk files.
- Report engine + 4 classes (R2): greenfield backend engine + 4 report classes, of which (b) three-axis, (c) real-source ROI, (d) registry are entirely greenfield.

**Honest verdict: all-6 audits + service-line + research/registry, built to the robust-first standard, do NOT credibly fit 60 days.** The greenfield report engine + three-axis classification + 4-pathway real-source ROI + registry extracts alone is a multi-week backend build BEFORE the per-module manifests and the EP/SH/VHD audits that gate trustworthy numbers. Applying the 2-4x audit multiplier to the gate-item portions and treating the engine as unestimated-greenfield, the full scope reads as a 10-14 week effort, not 8-9. **No date is promised here that the math does not support** (per AUDIT-028 + the off-repo discipline, specific dates stay operator-side regardless).

**EP is the first new empirical data point.** Its wall-clock (logged per Section 5) recalibrates this estimate; the timeline is updated as EP, then SH, then VHD logs land. Underclaim until the data is in.

**Cut-line options for the operator (choose the 60-day boundary):**
- **Cut-line A (depth-first, fewest classes):** Phase R0 + R1 (all-6 module trust + manifests + correctness gating + golden harness) + report class (a) per-module inventories x6. Defers service-line cuts (b), real-source ROI (c), registry (d) to a second window. Delivers trustworthy, all-6, per-module numbers - the credibility floor - and the spine that makes (b)/(c)/(d) fast afterward.
- **Cut-line B (breadth-first, fewer modules):** all four report classes (a)-(d), but only for the already-audited modules (HF/CAD/PV) in the window, with EP/SH/VHD audits + their report outputs in the second window. Delivers the full report taxonomy but violates the all-6 parity rule on day 60 (flagged as a parity exception requiring explicit operator acceptance).
- **Cut-line C (extend the window):** keep all-6 + all-4-classes; extend past 60 days per the extend-timeline-not-scope posture. Consistent with the strategic posture; requires the off-repo commitment window to move.

**Recommendation (operator decides):** Cut-line A. It honors the Module Parity Principle (all-6, no parity exception), it sequences correctness before breadth (a wrong number is worse than a missing report class), and it front-loads the spine so the remaining classes are projections rather than new builds. But this is an operator scope/timeline call, not an agent call.

---

## 9. Success criteria + document discipline

- **Report integrity:** every report number is backed by an audited rule (all-6 §16) and protected by a golden-cohort gate; the intentional-change protocol makes every number-change a signed event.
- **Module parity:** all 6 modules at equal report depth for any shipped class (no parity exception without explicit operator acceptance per Cut-line B).
- **Spine, not silos:** the four report classes are projections over one manifest + detection spine; no ad-hoc per-class data path.
- **Posture preserved:** robust-first, extend-timeline-over-scope-cuts, off-repo discipline, named-tech-debt-not-propagated - all carried verbatim (Section 2).
- **Document discipline:** v2.1 supersedes v2.0 on operator approval; CX revisit at v3.0 unchanged; DRIFT-44 hyphen-only; severity copied register-literal per §18.

---

## Appendix A - Report-pipeline inventory verdict table (2026-06-03, reproduced)

Backend has no report engine (only `ReportGeneration` analytics telemetry at `analytics.ts:443/473`, a `godView.ts:434` stub, and audit/patient-data JSON exports). Reporting is client-side (jsPDF/xlsx/CSV) over largely-mock data.

| Output class | Verdict | Evidence (file:line) |
|---|---|---|
| (a) Per-module gap inventories x6 | **PARTIAL** | Client-side CSV for CAD (`CoronaryWorklist.tsx:306`), EP (`EPWorklist.tsx:334`), PV (`PeripheralWorklist.tsx:298`) + generic `TherapyGapDashboard.tsx:215`. HF/SH/VHD have no dedicated worklist CSV. No backend report path. Over loaded/mock data. |
| (b) Service-line cuts (three-axis: workflow stage / BSW ROI pathway / cross-cutting tags) | **ABSENT** | No `workflowStage` / `bswPathway` / `crossCutting` classification field exists. `serviceLineConfig.tsx` is JSX layout, not a consumable taxonomy. Nothing consumes a three-axis cut. |
| (c) Executive ROI rollup across 4 BSW pathways | **PARTIAL (mock shell)** | `ROICalculationEngine.tsx` has `calculateROI` (`:164`) + `exportROIReport` (`:210`), but `roiMetrics` (`:121`) is hardcoded mock (no fetch), not structured around the 4 BSW pathways, not a backend rollup. |
| (d) Research/registry outputs (cohort-extract / registry-format) | **ABSENT** | Aspirational only: `openapi.ts:9`, `featureFlags.registryAssist` (flag, no impl), mock registry events. `dataRequests /export` is single-patient, not cohort. No cohort-extract or registry-format export code. |

**Net:** the report deliverable is mostly greenfield - client-side CSV/PDF over mock data for ~3-4 of 6 modules and a mock ROI shell; the backend report engine, the three-axis classification, the 4-pathway ROI rollup, and any cohort/registry export are absent. Cross-ref AUDIT-099 (non-HF executive surfaces render hardcoded data, so even existing client exports often export mock).

## Appendix B - Open decisions surfaced for the operator

1. **Version label:** v2.1 vs keeping "v2.0" (header note). My call: v2.1 for lineage clarity; rename on request.
2. **Cut-line A / B / C** (Section 8): the 60-day boundary. My recommendation: A.
3. **AUDIT-108 severity-index reconciliation:** the register severity-index one-liner (line 42) still reads OPEN-flavored while the AUDIT-108 detail Status + BUILD_STATE row are RESOLVED 2026-06-04. A 1-line register-index reconciliation is needed (kept out of this PR per scope discipline). Flagging for a separate ledger pass.
4. **Fingerprint-first (Section 7):** disposition recorded as NOT adopted with the trade-off note; confirm or reopen.
