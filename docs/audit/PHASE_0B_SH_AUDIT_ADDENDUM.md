# Phase 0B SH Audit Addendum — generated from canonical crosswalk

**Module:** Structural Heart (SH)
**Spec source:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.3
**Code source:** `backend/src/ingestion/gaps/gapRuleEngine.ts` (registry=61, evaluator=55, gapsPush=55)
**Crosswalk:** `docs/audit/canonical/SH.crosswalk.json` (auditMethod: rule-body-citation-AUDIT-030D)
**Audit date:** 2026-06-08

## 1. Summary

Structural Heart has **88 spec gaps** across 14 subcategories. Implementation: **32 DET_OK + 18 PARTIAL + 38 SPEC_ONLY** (any-coverage: 50/88 = 56.8%).

**Tier 1 priority status:** 7 DET_OK + 2 PARTIAL + 4 SPEC_ONLY of 13 T1 gaps (T1 any-coverage: 69.2%).

**Spec-explicit SAFETY-tagged gaps:** 0.

---

## 2. Coverage by classification

| Classification | Count | % of total |
|---|---:|---:|
| PRODUCTION_GRADE | 0 | 0.0% |
| DET_OK | 32 | 36.4% |
| PARTIAL_DETECTION | 18 | 20.5% |
| SPEC_ONLY | 38 | 43.2% |
| **Total** | **88** | **100.0%** |

**PRODUCTION_GRADE = 0** is platform-wide; gated on closure of AUDIT-001 P0 (test coverage gap). Per AUDIT_METHODOLOGY.md §3.1, no rule classifies PRODUCTION_GRADE until the platform testing baseline is established.

---

## 3. Coverage by tier

| Tier | Total | DET_OK | PARTIAL | SPEC_ONLY | Any-coverage % |
|------|------:|-------:|--------:|----------:|---------------:|
| **T1** | 13 | 7 | 2 | 4 | 69.2% |
| **T2** | 58 | 20 | 12 | 26 | 55.2% |
| **T3** | 17 | 5 | 4 | 8 | 52.9% |
| **Overall** | **88** | **32** | **18** | **38** | **56.8%** |

---

## 4. Per-subcategory breakdown

| Subcategory | T1/T2/T3 | DET_OK | PARTIAL | SPEC_ONLY | Coverage |
|---|---|---:|---:|---:|---:|
| Aortic Stenosis (10) | 4/6/0 | 5 | 3 | 2 | 80.0% |
| BAV/Aortopathy (9) | 0/5/4 | 4 | 2 | 3 | 66.7% |
| TAVR Post-op (9) | 1/7/1 | 5 | 2 | 2 | 77.8% |
| Mitral Regurg (10) | 4/6/0 | 5 | 2 | 3 | 70.0% |
| Mitral Stenosis (4) | 0/4/0 | 0 | 1 | 3 | 25.0% |
| Tricuspid (6) | 1/3/2 | 2 | 2 | 2 | 66.7% |
| Aortic Disease (9) | 1/4/4 | 1 | 1 | 7 | 22.2% |
| PFO/ASD (6) | 0/5/1 | 2 | 2 | 2 | 66.7% |
| Pulmonary HTN (5) | 0/4/1 | 0 | 0 | 5 | 0.0% |
| Pulmonary Embolism (5) | 2/3/0 | 2 | 0 | 3 | 40.0% |
| Infective Endocarditis (3) | 0/3/0 | 1 | 0 | 2 | 33.3% |
| ACHD (8) | 0/6/2 | 4 | 2 | 2 | 75.0% |
| Cardiac Masses (2) | 0/0/2 | 1 | 0 | 1 | 50.0% |
| HCM Interventions (2) | 0/2/0 | 0 | 1 | 1 | 50.0% |

---

## 4.5 — T1 SPEC_ONLY work items (load-bearing for v2.0 Phase 1)

4 T1 spec gaps with zero implementation. These are the load-bearing v2.0 Phase 1 work items for Structural Heart.

| GAP-ID | Spec line | Subcategory | Detection Logic (excerpt) | Spec SAFETY | BSW pathway |
|---|---:|---|---|---|---|
| GAP-SH-001 | 445 | Aortic Stenosis | AV Vmax>=4.0, MG>=40, or AVA<=1.0 asymptomatic - not referred | — | — |
| GAP-SH-015 | 486 | Mitral Regurg | Severe primary MR + LVEF 30-60 or LVESD>=40 without referral | — | — |
| GAP-SH-019 | 488 | Mitral Regurg | FMR mod-severe + HF symptoms without heart team review | — | — |
| GAP-SH-090 | 549 | Pulmonary Embolism | Submassive PE (RV strain or troponin elevation) without CDT discussion | — | — |

---

## 4.6 — EXTRA rules + architectural patterns

**Registry-without-evaluator (6):** registry entries with no matching evaluator block body.

- `gap-sh-9-pfo-closure` (registry line 1531): No evaluator body matched via similarity scoring
- `gap-sh-003-lflg-classical` (registry line 3066): No evaluator body matched via similarity scoring
- `gap-sh-004-lflg-paradoxical` (registry line 3073): No evaluator body matched via similarity scoring
- `gap-sh-006-asymptomatic-as` (registry line 3080): No evaluator body matched via similarity scoring
- `gap-sh-050-moderate-as-grading` (registry line 3087): No evaluator body matched via similarity scoring
- `gap-sh-017-primary-mr-pasp` (registry line 3101): No evaluator body matched via similarity scoring


---

## 5. Tier 1 priority gaps surfaced

| GAP-ID | Spec line | Class | Rule body cite | Notes |
|---|---:|---|---|---|
| GAP-SH-001 | 445 | SPEC_ONLY | — | v3.0 SH close: GAP-SH-001 (asymptomatic very-severe AS, EARLY-TAVR heart-team) has no distinct evalu |
| GAP-SH-002 | 446 | DET_OK | `gap-sh-2-tavr-eval` (SH-002 @7563-7590) | v3.0 SH chunk 1 (AUDIT-125 tightened): severe symptomatic AS -> AVR now gates on concordant severe A |
| GAP-SH-003 | 447 | DET_OK | `gap-sh-003-lflg-classical` (SH-003 @7630-7654) | v3.0 SH chunk 1: classical low-flow low-gradient AS (LVEF<50 + AVA<1.0 + mean gradient<40) -> dobuta |
| GAP-SH-006 | 448 | DET_OK | `gap-sh-006-asymptomatic-as` (SH-006 @7596-7621) | v3.0 SH chunk 1: asymptomatic severe AS + LVEF<55 -> AVR evaluation (Class IIa; LVEF<50 Class 1). Co |
| GAP-SH-061 | 472 | DET_OK | `gap-sh-valve-in-valve` (SH-VALVE-IN-VALVE @15580-15602) | RESOLVED 2026-06-17 (v3.0 SH close): PARTIAL -> DET_OK. AUDIT-123 fixed - ViV (SH-VALVE-IN-VALVE) is |
| GAP-SH-014 | 485 | DET_OK | `gap-sh-3-mitral-intervention` (SH-014 @7788-7816) | v3.0 SH chunk 2 (AUDIT-125 tightened): severe PRIMARY MR (EROA>=0.40 / grade>=4 / valve_severity>=5) |
| GAP-SH-015 | 486 | SPEC_ONLY | — | v3.0 SH close: GAP-SH-015 has no distinct evaluator after the MR block split (the chunk-2 MR build c |
| GAP-SH-018 | 487 | PARTIAL_DETECTION | `gap-sh-10-mitraclip` (SH-10 @9644-9676) | (broad MR + LVEF<50) \| auto-verify: preserved-from-addendum |
| GAP-SH-019 | 488 | SPEC_ONLY | — | â€” \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-SH-022 | 507 | DET_OK | `gap-sh-022-tricuspid-assessment` (SH-022 @7934-8018) | RESOLVED 2026-06-17 (v3.0 SH close; registryId migrated 2026-06-17 v3.0 VHD close, AUDIT-171): PARTI |
| GAP-SH-075 | 517 | PARTIAL_DETECTION | `gap-sh-075-typeb-tevar` (SH-075 @10096-10118) | v3.0 SH chunk 4: complicated type-B dissection (malperfusion proxy K55.0x/N17/I74.3-5) -> urgent TEV |
| GAP-SH-090 | 549 | SPEC_ONLY | — | â€” \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-SH-091 | 550 | DET_OK | `gap-sh-091-massive-pe-reperfusion` (SH-091 @10298-10320) | v3.0 SH chunk 5: massive PE (I26.0x) + cardiogenic shock (R57.0) -> reperfusion (lysis/embolectomy/E |

---

## 6. Implementation notes

### 6.1 — EXTRA rules detail

See §4.6 for EXTRA rules + architectural patterns.

### 6.2 — BSW ROI pathway implications

No T1 SPEC_ONLY gaps carry literal BSW pathway tags in CK v4.0 spec text. Pathway analysis is in the §11.5 sequencing notes (hand-authored) and the cross-module synthesis document.

### 6.3 — Strategic posture

2026-06-08 re-audit supersedes the 2026-05-04 baseline (9/23/56 -> 0/30/58); the 2026-05-04 baseline is preserved in git history, BUILD_STATE, and the register. SH's detection logic is sparse, and the 2026-05-04 audit over-credited the trustworthiness tier: DET_OK fell 10.2% -> 0.0% once the detection-quality checks were applied (16.6(i) wrong-concept, 16.6(ii) wrong-target, 16.6(iii) missing-severity-gate, 16.5 late-proxy under-detection), while any-coverage moved only 36.4% -> 34.1%. Unlike EP (broadly built, trust-capped pending the single AUDIT-118 RxCUI-expansion fix), SH is genuinely lightly built: 58 of 88 gaps have no implemented rule, and the 8 PARTIAL flips are heterogeneous detection-quality defects with no shared root cause. Posture: SH needs v2.0 build-out of the SPEC_ONLY surface plus per-rule remediation; the cross-module Z95.2/Z95.3 valve-type inversion (AUDIT-123) is the one shared data-coupling class VHD inherits.

---

## 7. Working hypothesis verdict

**For SH:** Moderate implementation coverage; medication/screening surfaces typically built, procedural surfaces often lighter.

Coverage data: 50/88 any-coverage (56.8%); 32/88 DET_OK only (36.4%); 18 PARTIAL via broad-rule consolidation or partial-trigger match; 38 SPEC_ONLY.

Rules-per-DET_OK efficiency: 61 registry rules / 32 DET_OK = 1.91.

---

## 8. Implications for v2.0

v2.0 Phase 1 (T1 priority) work items for SH:
- **4 T1 SPEC_ONLY** gaps requiring full build (detection + UI + tests)
- **2 T1 PARTIAL** gaps requiring hardening (broad-rule discrimination, missing exclusions, dose-protocol specificity)
- **7 T1 DET_OK** gaps requiring test coverage + UI polish to reach PRODUCTION_GRADE

Cross-module satisfaction (HF Device Therapy → EP CRT/ICD pattern; CAD-027 → PV; etc.) is captured structurally in `ruleBodyCite.evaluatorModule` per AUDIT_METHODOLOGY.md §2.1.C.

---

## 9. Module-specific findings

### Manual classification overrides (4)

Rows where the auto-classifier was wrong and the audit author corrected the classification with explicit reasoning:

- **GAP-SH-008** (T3, PARTIAL_DETECTION, `gap-sh-bicuspid-surveillance` (SH-BICUSPID)): MANUAL OVERRIDE 2026-06-08 (SH audit Batch 1): DET_OK -> PARTIAL per AUDIT_METHODOLOGY.md 16.6(ii) / AUDIT-121. SH-BICUSPID gates dxCodes.startsWith(Q23.1) (congenital aortic insufficiency) for "bicuspid aortic valve", but bicuspid is Q23.81; the rule misses true bicuspid patients and false-fires on congenital AI. Partial overlap -> PARTIAL not SPEC_ONLY. Evaluator retained; PARTIAL until AUDIT-121 remediated (Q23.1 -> Q23.81).
- **GAP-SH-013** (T2, PARTIAL_DETECTION, `gap-sh-13-paravalvular-leak` (SH-13)): MANUAL OVERRIDE 2026-06-08 (SH audit Batch 2): DET_OK -> PARTIAL per 16.6(ii) / AUDIT-122. SH-13 matches I35.1 OR I34.0 as "new regurgitation", but the gap is aortic-prosthesis PVL-specific: I35.1 (aortic insufficiency) is correct while I34.0 (mitral insufficiency) over-fires on unrelated post-prosthetic mitral regurg with no PVL. Partial overlap -> PARTIAL. Evaluator retained; PARTIAL until AUDIT-122 remediated (drop I34.0, keep I35.1).
- **GAP-SH-028** (T2, SPEC_ONLY, no cite): MANUAL OVERRIDE 2026-06-08 (SH audit Batch 5): PARTIAL -> SPEC_ONLY per 16.6(ii) wrong-target / AUDIT-129. SH-7 detects endocarditis PROPHYLAXIS candidates (prosthetic valve Z95.2/3/4 + high-risk procedure Z01.2/Z96), but GAP-SH-028 targets SUSPECTED-IE Duke-criteria diagnostic workup; prevention vs diagnosis share zero true positives (fully disjoint), so PARTIAL would overclaim. Per the 16.6(ii) overlap rule, disjoint -> SPEC_ONLY. registryId dropped (no genuine coverage). Remediation = a suspected-IE detection rule for GAP-SH-028 (AUDIT-129).
- **GAP-SH-104** (T2, SPEC_ONLY, no cite): MANUAL OVERRIDE 2026-06-08 (SH audit Batch 4, STEP-0): DET_OK -> SPEC_ONLY per 16.6(ii) wrong-target / AUDIT-126. SH-15 detects PRE-procedure ASA candidacy (I42.1 obstructive HCM + obstruction symptoms), but GAP-SH-104 targets POST-ASA conduction surveillance; the two are fully disjoint (zero true-positive overlap), so PARTIAL would overclaim. Per the 16.6(ii) overlap rule, disjoint -> SPEC_ONLY. registryId dropped (no genuine coverage); SH-15 correctly serves the sibling GAP-SH-105. Remediation = a post-ASA procedure-history gate for GAP-SH-104 (AUDIT-126).


---

## 10. Cross-references

- `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.3 — spec source
- `backend/src/ingestion/gaps/gapRuleEngine.ts` — code source
- `docs/audit/canonical/SH.crosswalk.json` — canonical crosswalk
- `docs/audit/canonical/SH.spec.json` — canonical spec extract
- `docs/audit/canonical/SH.code.json` — canonical code extract
- `docs/audit/canonical/SH.reconciliation.json` — canonical reconciliation
- `docs/audit/AUDIT_METHODOLOGY.md` — canonical audit methodology contract
- `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` — cross-module synthesis
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` — findings register

---

## 11. Cross-module synthesis (per-module slice)

2 cross-module satisfaction case(s) where SH spec gap is satisfied by an evaluator owned by another module:

| Spec gap | Tier | Class | Owning module | Evaluator block |
|---|---|---|---|---|
| GAP-SH-048 | T2 | PARTIAL_DETECTION | CAD | `CAD-COMPLETE-REVASC` |
| GAP-SH-020 | T2 | PARTIAL_DETECTION | VHD | `VD-4` |

### 11.5 — Sequencing notes

SH SPEC_ONLY implementation scoping (58 of 88 gaps) and the cross-module Z95.2/Z95.3 valve-type remediation (AUDIT-123) are deferred to v2.0 authorship, not decided mid-audit. The audit classifies and files findings; build sequencing and the cross-module data-coupling fix are v2.0 work items.

---

## 12. Lessons learned

(a) Over-detection (16.6) was the dominant SH defect class: severity-encoding 16.6(iii), wrong-concept 16.6(i), and disjoint-target 16.6(ii). (b) DET_OK deflated 10.2% -> 0.0% under rigorous over-detection review; this is expected, not an error. (c) The Z95.2/Z95.3 inversion (AUDIT-123) is a cross-module data-coupling class that VHD inherits. (d) The disjoint-target -> SPEC_ONLY rule (16.6(ii)) drove SH-104 and SH-028. (e) VHD carries 16 / 16.5 / 16.6 forward and absorbs the AUDIT-121 VD orphans plus AUDIT-123 / AUDIT-124 (VD-1).

---

## 13. Wall-clock empirical entry

Audit method: `rule-body-citation-AUDIT-030D`. Audit date: 2026-06-08.

Per-module wall-clock data lives in `docs/audit/canonical/audit_runs.jsonl` (append-only). Aggregate empirical floor table maintained in AUDIT_METHODOLOGY.md §7.2.

---

## 14. Audit verdict

**SH module: MODERATELY BUILT.**

- 32 DET_OK (36.4%), 18 PARTIAL (20.5%), 38 SPEC_ONLY (43.2%)
- 7/13 T1 priority gaps DET_OK; 4 T1 SPEC_ONLY gaps require v2.0 Phase 1 work
- Audit method: `rule-body-citation-AUDIT-030D`. Generated from canonical crosswalk on 2026-06-08.

---

## 15. Methodology citation appendix

Audit methodology per `docs/audit/AUDIT_METHODOLOGY.md` v1.0. Specifically:
- §2 data model (spec/code/crosswalk artifact triplet)
- §3 classification taxonomy (PRODUCTION_GRADE / DET_OK / PARTIAL_DETECTION / SPEC_ONLY) with §3.2 decision rules + §3.2.1 broad-rule consolidation handling
- §4 citation requirements (AUDIT-030)
- §5 evaluator inventory completeness (AUDIT-030.D, 5 comment patterns)
- §6 SAFETY-tag classification rules + Tier S triage queue inclusion
- §11 addendum markdown template (this document's structure)

This addendum is a **generated artifact** rendered from canonical inputs by `backend/scripts/auditCanonical/renderAddendum.ts`. Hand-editing this markdown is rejected by CI; edit `SH.crosswalk.json` (hand-authored fields: `strategicPosture`, `sequencingNotes`, `lessonsLearned`) and re-render.

*Generated from `docs/audit/canonical/SH.crosswalk.json`.*
