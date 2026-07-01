# Phase 0B PV Audit Addendum — generated from canonical crosswalk

**Module:** Peripheral Vascular (PV)
**Spec source:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.6
**Code source:** `backend/src/ingestion/gaps/gapRuleEngine.ts` (registry=45, evaluator=45, gapsPush=45)
**Crosswalk:** `docs/audit/canonical/PV.crosswalk.json` (auditMethod: rule-body-citation-AUDIT-030D)
**Audit date:** 2026-05-04

## 1. Summary

Peripheral Vascular has **105 spec gaps** across 20 subcategories. Implementation: **25 DET_OK + 14 PARTIAL + 66 SPEC_ONLY** (any-coverage: 39/105 = 37.1%).

**Tier 1 priority status:** 1 DET_OK + 2 PARTIAL + 4 SPEC_ONLY of 7 T1 gaps (T1 any-coverage: 42.9%).

**Spec-explicit SAFETY-tagged gaps:** 0.

---

## 2. Coverage by classification

| Classification | Count | % of total |
|---|---:|---:|
| PRODUCTION_GRADE | 0 | 0.0% |
| DET_OK | 25 | 23.8% |
| PARTIAL_DETECTION | 14 | 13.3% |
| SPEC_ONLY | 66 | 62.9% |
| **Total** | **105** | **100.0%** |

**PRODUCTION_GRADE = 0** is platform-wide; gated on closure of AUDIT-001 P0 (test coverage gap). Per AUDIT_METHODOLOGY.md §3.1, no rule classifies PRODUCTION_GRADE until the platform testing baseline is established.

---

## 3. Coverage by tier

| Tier | Total | DET_OK | PARTIAL | SPEC_ONLY | Any-coverage % |
|------|------:|-------:|--------:|----------:|---------------:|
| **T1** | 7 | 1 | 2 | 4 | 42.9% |
| **T2** | 82 | 23 | 10 | 49 | 40.2% |
| **T3** | 16 | 1 | 2 | 13 | 18.8% |
| **Overall** | **105** | **25** | **14** | **66** | **37.1%** |

---

## 4. Per-subcategory breakdown

| Subcategory | T1/T2/T3 | DET_OK | PARTIAL | SPEC_ONLY | Coverage |
|---|---|---:|---:|---:|---:|
| PAD Detection (7) | 0/7/0 | 1 | 3 | 3 | 57.1% |
| PAD Prevention (9) | 1/8/0 | 7 | 2 | 0 | 100.0% |
| CLTI (6) | 2/4/0 | 0 | 1 | 5 | 16.7% |
| TASC Staging (5) | 0/5/0 | 0 | 0 | 5 | 0.0% |
| Mesenteric Ischemia (5) | 0/5/0 | 0 | 1 | 4 | 20.0% |
| Renal Artery (4) | 0/4/0 | 1 | 1 | 2 | 50.0% |
| Vasculitis (6) | 0/6/0 | 4 | 0 | 2 | 66.7% |
| Upper Extremity (5) | 0/5/0 | 1 | 0 | 4 | 20.0% |
| Raynaud (3) | 0/2/1 | 0 | 1 | 2 | 33.3% |
| AAA (7) | 2/2/3 | 1 | 0 | 6 | 14.3% |
| Carotid/CVA (5) | 1/4/0 | 1 | 2 | 2 | 60.0% |
| Venous Disease (9) | 0/9/0 | 3 | 1 | 5 | 44.4% |
| PE Risk Strat (6) | 0/6/0 | 1 | 0 | 5 | 16.7% |
| CTEPH (4) | 1/3/0 | 1 | 0 | 3 | 25.0% |
| PAH (6) | 0/6/0 | 2 | 0 | 4 | 33.3% |
| AVM (3) | 0/0/3 | 0 | 0 | 3 | 0.0% |
| Vascular Access (3) | 0/0/3 | 0 | 0 | 3 | 0.0% |
| Lymphatic/Misc (2) | 0/0/2 | 0 | 2 | 0 | 100.0% |
| Peri-procedure (5) | 0/2/3 | 1 | 0 | 4 | 20.0% |
| Special Populations (5) | 0/4/1 | 1 | 0 | 4 | 20.0% |

---

## 4.5 — T1 SPEC_ONLY work items (load-bearing for v2.0 Phase 1)

4 T1 spec gaps with zero implementation. These are the load-bearing v2.0 Phase 1 work items for Peripheral Vascular.

| GAP-ID | Spec line | Subcategory | Detection Logic (excerpt) | Spec SAFETY | BSW pathway |
|---|---:|---|---|---|---|
| GAP-PV-018 | 956 | CLTI | CLTI + intervention without documented strategy | — | — |
| GAP-PV-055 | 1017 | AAA | AAA>=5.5 cm male without surgical/endo referral | — | — |
| GAP-PV-056 | 1018 | AAA | AAA>=5.0 cm female without surgical/endo referral | — | — |
| GAP-PV-079 | 1060 | CTEPH | CTEPH dx without pulmonary thromboendarterectomy eligibility assessment | — | — |

---

## 4.6 — EXTRA rules + architectural patterns

No EXTRA rules or architectural patterns surfaced. Reconciliation is clean.

---

## 5. Tier 1 priority gaps surfaced

| GAP-ID | Spec line | Class | Rule body cite | Notes |
|---|---:|---|---|---|
| GAP-PV-011 | 942 | DET_OK | `gap-pv-rivaroxaban` (PV-RIVAROXABAN @16113-16141) | auto-verify: preserved-from-addendum |
| GAP-PV-017 | 955 | PARTIAL_DETECTION | `gap-pv-bypass-eval` (PV-BYPASS-EVAL @16178-16204) | auto-verify: preserved-from-addendum |
| GAP-PV-018 | 956 | SPEC_ONLY | — | MANUAL OVERRIDE 2026-06-18 (PV chunk 0, AUDIT-180): PARTIAL -> SPEC_ONLY. GAP-PV-018 ("CLTI endovasc |
| GAP-PV-055 | 1017 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-PV-056 | 1018 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-PV-058 | 1028 | PARTIAL_DETECTION | `gap-pv-058-symptomatic-carotid-revasc` (PV-058 @16840-16862) | MANUAL OVERRIDE 2026-06-18 (PV chunk 1): SPEC_ONLY -> PARTIAL. Built gap-pv-058-symptomatic-carotid- |
| GAP-PV-079 | 1060 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |

---

## 6. Implementation notes

### 6.1 — EXTRA rules detail

See §4.6 for EXTRA rules + architectural patterns.

### 6.2 — BSW ROI pathway implications

No T1 SPEC_ONLY gaps carry literal BSW pathway tags in CK v4.0 spec text. Pathway analysis is in the §11.5 sequencing notes (hand-authored) and the cross-module synthesis document.

### 6.3 — Strategic posture

*Strategic posture not yet authored. Set `strategicPosture` field in `PV.crosswalk.json` to populate this section.*

---

## 7. Working hypothesis verdict

**For PV:** Moderate implementation coverage; medication/screening surfaces typically built, procedural surfaces often lighter.

Coverage data: 39/105 any-coverage (37.1%); 25/105 DET_OK only (23.8%); 14 PARTIAL via broad-rule consolidation or partial-trigger match; 66 SPEC_ONLY.

Rules-per-DET_OK efficiency: 45 registry rules / 25 DET_OK = 1.80.

---

## 8. Implications for v2.0

v2.0 Phase 1 (T1 priority) work items for PV:
- **4 T1 SPEC_ONLY** gaps requiring full build (detection + UI + tests)
- **2 T1 PARTIAL** gaps requiring hardening (broad-rule discrimination, missing exclusions, dose-protocol specificity)
- **1 T1 DET_OK** gaps requiring test coverage + UI polish to reach PRODUCTION_GRADE

Cross-module satisfaction (HF Device Therapy → EP CRT/ICD pattern; CAD-027 → PV; etc.) is captured structurally in `ruleBodyCite.evaluatorModule` per AUDIT_METHODOLOGY.md §2.1.C.

---

## 9. Module-specific findings

### Manual classification overrides (15)

Rows where the auto-classifier was wrong and the audit author corrected the classification with explicit reasoning:

- **GAP-PV-003** (T2, DET_OK, `gap-pv-003-abnormal-abi` (PV-003)): MANUAL OVERRIDE 2026-06-18 (PV chunk 0, AUDIT-179 RESOLVED): foundational build + re-cite. GAP-PV-003 ("Abnormal ABI <=0.90 without coded PAD") was MIScited by fuzzy name-match to gap-pv-3-antiplatelet (a different concept); no rule read an ABI VALUE threshold. Built gap-pv-003-abnormal-abi (abi_left/abi_right <= 0.90 + !hasPAD; ABI threaded both paths). The >1.40 non-compressible case is routed to PV-004 (not conflated). PARTIAL -> DET_OK.
- **GAP-PV-004** (T2, PARTIAL_DETECTION, `gap-pv-004-noncompressible-abi` (PV-004)): MANUAL OVERRIDE 2026-06-18 (PV chunk 1): SPEC_ONLY -> PARTIAL. Built gap-pv-004-noncompressible-abi (ABI >1.40 either leg -> non-compressible -> toe-brachial index). Completes the PV-003/004 ABI pair (disjoint ranges, no double-fire). PARTIAL not DET_OK: the spec qualifier "without TBI" is not threaded (TBI is not an ingested observation), so the rule fires on the non-compressible ABI alone and cannot confirm a TBI was not already done.
- **GAP-PV-015** (T2, DET_OK, `gap-pv-6-diabetes-control` (PV-6)): MANUAL OVERRIDE 2026-06-18 (PV chunk 0, AUDIT-178 RESOLVED over-credit tightening): PV-6 previously fired on hba1c===undefined (existence-proxy, always-fire). Tightened to a real threshold (hba1c !== undefined && hba1c >= 7.0%, the standard ADA/ACC glycemic target) so only above-target patients fire. Holds DET_OK, now genuinely gated.
- **GAP-PV-018** (T1, SPEC_ONLY, no cite): MANUAL OVERRIDE 2026-06-18 (PV chunk 0, AUDIT-180): PARTIAL -> SPEC_ONLY. GAP-PV-018 ("CLTI endovascular vs surgical decision, BEST-CLI") was over-matched to the generic gap-pv-bypass-eval rule, which does not encode the endovascular-vs-surgical decision logic (needs anatomic / conduit data not threaded). Cite dropped; PV-017 retains the bypass-eval cite.
- **GAP-PV-024** (T2, SPEC_ONLY, no cite): MANUAL OVERRIDE 2026-06-18 (PV chunk 0, AUDIT-180): PARTIAL -> SPEC_ONLY. GAP-PV-024 ("TASC II C/D iliac: endovascular vs surgical bypass") was over-matched to the generic gap-pv-bypass-eval rule, which has no TASC II lesion-class or iliac-specific signal (anatomic data not threaded). Cite dropped; PV-017 retains the bypass-eval cite.
- **GAP-PV-033** (T2, DET_OK, `gap-pv-12-renal-artery` (PV-12)): MANUAL OVERRIDE 2026-06-18 (PV chunk 0, AUDIT-178 RESOLVED over-credit tightening): PV-12 (resistant HTN -> renal-artery workup) previously fired without confirming resistant HTN. Tightened to require >= 3 concurrent antihypertensive classes (RAAS + beta-blocker + CCB + diuretic), the operational resistant-HTN definition. Holds DET_OK, now genuinely gated.
- **GAP-PV-034** (T2, PARTIAL_DETECTION, `gap-pv-034-fmd-screening` (PV-034)): MANUAL OVERRIDE 2026-06-18 (PV chunk 1): SPEC_ONLY -> PARTIAL. Built gap-pv-034-fmd-screening (HTN + age<35 + female + !I77.3). The population gate is fully threaded, but the spec qualifier "without FMD imaging screening" is proxied by diagnosis-absence (!I77.3) - a patient screened-and-negative (no I77.3 coded) would still fire - so PARTIAL not DET_OK. I77.3 NLM-verified.
- **GAP-PV-038** (T2, DET_OK, `gap-pv-038-takayasu-immunosuppression` (PV-038)): MANUAL OVERRIDE 2026-06-18 (PV chunk 1): SPEC_ONLY -> DET_OK. Built gap-pv-038-takayasu-immunosuppression (M31.4 + NOT on glucocorticoid or steroid-sparing, canonical RXNORM_CORTICOSTEROIDS/STEROID_SPARING). Dx + med gate both threaded; the "active" disease-activity qualifier is a documented Path-B refinement (ESR/CRP/imaging not threaded), per the CAD-022 DET_OK-with-Path-B precedent. M31.4 NLM-verified.
- **GAP-PV-040** (T2, DET_OK, `gap-pv-040-gca-steroid` (PV-040)): MANUAL OVERRIDE 2026-06-18 (PV chunk 1): SPEC_ONLY -> DET_OK. Built gap-pv-040-gca-steroid (M31.5/M31.6 + NOT on a glucocorticoid). Dx + med gate both threaded; vision-symptom acuity is a Path-B refinement. Distinct from PV-038 (Takayasu M31.4 - no code overlap). M31.5/M31.6 NLM-verified; tocilizumab (GiACTA) named in the recommendation.
- **GAP-PV-041** (T2, DET_OK, `gap-pv-041-buerger-cessation` (PV-041)): MANUAL OVERRIDE 2026-06-18 (PV chunk 1): SPEC_ONLY -> DET_OK. Built gap-pv-041-buerger-cessation (I73.1 + active tobacco use F17.*/Z72.0). Both signals threaded - clean gate. Subgroup: cessation-is-treatment (disease-modifying in Buerger), distinct from generic PAD cessation (PV-4). I73.1 NLM-verified.
- **GAP-PV-058** (T1, PARTIAL_DETECTION, `gap-pv-058-symptomatic-carotid-revasc` (PV-058)): MANUAL OVERRIDE 2026-06-18 (PV chunk 1): SPEC_ONLY -> PARTIAL. Built gap-pv-058-symptomatic-carotid-revasc (I65.2x + recent I63/G45). The SYMPTOMATIC gate (I63/G45) is threaded and precise (asymptomatic gates out - the standing subgroup-check), but the spec target severity ">=70%" is NOT codable from ICD-10 (I65.2x carries no percentage) and the 2-week timing is not threaded, so the rule fires on symptomatic stenosis of any severity -> PARTIAL. I65.21/22/23/29, I63, G45 NLM-verified.
- **GAP-PV-062** (T2, DET_OK, `gap-pv-062-intracranial-stenosis-medical` (PV-062)): MANUAL OVERRIDE 2026-06-18 (PV chunk 1): SPEC_ONLY -> DET_OK. Built gap-pv-062-intracranial-stenosis-medical (I67.2 + recent I63/G45 + NOT on antiplatelet OR NOT on statin). Dx + event + antithrombotic/statin absence all threaded (coarse but genuine gate); dual-vs-single antiplatelet and statin intensity are documented Path-B refinements. Subgroup: aggressive MEDICAL therapy, NOT stenting (SAMMPRIS). I67.2 NLM-verified.
- **GAP-PV-071** (T2, DET_OK, `gap-pv-varicose` (PV-VARICOSE)): MANUAL OVERRIDE 2026-06-18 (PV chunk 0, AUDIT-178 RESOLVED over-credit tightening): PV-VARICOSE (spec = CEAP 3+ symptomatic) previously fired on bare I83 (incl asymptomatic I83.9). Tightened to the complicated/symptomatic subcodes I83.0/I83.1/I83.2/I83.8 (ulcer / inflammation / pain), excluding I83.9. Holds DET_OK.
- **GAP-PV-076** (T2, DET_OK, `gap-pv-anticoag-vte` (PV-ANTICOAG-VTE)): MANUAL OVERRIDE 2026-06-18 (PV chunk 0, AUDIT-179 RESOLVED code-mismatch fix): PV-ANTICOAG-VTE (spec = post-PE anticoagulation duration) fired ONLY on I82 (DVT), MISSING the PE population (I26) entirely. Added I26 (PE) so the gap detects its spec population; I82 retained (VTE duration review applies to both). Holds DET_OK.
- **GAP-PV-098** (T3, DET_OK, `gap-pv-graft-surveillance` (PV-GRAFT-SURVEILLANCE)): MANUAL OVERRIDE 2026-06-18 (PV chunk 0, AUDIT-178 RESOLVED interval build): PV-GRAFT-SURVEILLANCE previously fired on graft_duplex_months===undefined (existence-proxy). Added a genuine interval comparison (overdue when > 12 months OR never documented); graft_duplex_months IS threaded so a recently-surveilled patient (<= 12 mo) now gates out. Holds DET_OK.


---

## 10. Cross-references

- `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.6 — spec source
- `backend/src/ingestion/gaps/gapRuleEngine.ts` — code source
- `docs/audit/canonical/PV.crosswalk.json` — canonical crosswalk
- `docs/audit/canonical/PV.spec.json` — canonical spec extract
- `docs/audit/canonical/PV.code.json` — canonical code extract
- `docs/audit/canonical/PV.reconciliation.json` — canonical reconciliation
- `docs/audit/AUDIT_METHODOLOGY.md` — canonical audit methodology contract
- `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` — cross-module synthesis
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` — findings register

---

## 11. Cross-module synthesis (per-module slice)

No cross-module satisfaction cases for PV.

### 11.5 — Sequencing notes

*Sequencing notes not yet authored. Set `sequencingNotes` field in `PV.crosswalk.json` to populate.*

---

## 12. Lessons learned

*Lessons learned not yet authored. Set `lessonsLearned` field in `PV.crosswalk.json` to populate.*

---

## 13. Wall-clock empirical entry

Audit method: `rule-body-citation-AUDIT-030D`. Audit date: 2026-05-04.

Per-module wall-clock data lives in `docs/audit/canonical/audit_runs.jsonl` (append-only). Aggregate empirical floor table maintained in AUDIT_METHODOLOGY.md §7.2.

---

## 14. Audit verdict

**PV module: MODERATELY BUILT.**

- 25 DET_OK (23.8%), 14 PARTIAL (13.3%), 66 SPEC_ONLY (62.9%)
- 1/7 T1 priority gaps DET_OK; 4 T1 SPEC_ONLY gaps require v2.0 Phase 1 work
- Audit method: `rule-body-citation-AUDIT-030D`. Generated from canonical crosswalk on 2026-05-04.

---

## 15. Methodology citation appendix

Audit methodology per `docs/audit/AUDIT_METHODOLOGY.md` v1.0. Specifically:
- §2 data model (spec/code/crosswalk artifact triplet)
- §3 classification taxonomy (PRODUCTION_GRADE / DET_OK / PARTIAL_DETECTION / SPEC_ONLY) with §3.2 decision rules + §3.2.1 broad-rule consolidation handling
- §4 citation requirements (AUDIT-030)
- §5 evaluator inventory completeness (AUDIT-030.D, 5 comment patterns)
- §6 SAFETY-tag classification rules + Tier S triage queue inclusion
- §11 addendum markdown template (this document's structure)

This addendum is a **generated artifact** rendered from canonical inputs by `backend/scripts/auditCanonical/renderAddendum.ts`. Hand-editing this markdown is rejected by CI; edit `PV.crosswalk.json` (hand-authored fields: `strategicPosture`, `sequencingNotes`, `lessonsLearned`) and re-render.

*Generated from `docs/audit/canonical/PV.crosswalk.json`.*
