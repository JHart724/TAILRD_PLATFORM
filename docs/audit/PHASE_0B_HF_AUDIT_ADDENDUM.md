# Phase 0B HF Audit Addendum — generated from canonical crosswalk

**Module:** Heart Failure (HF)
**Spec source:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.1
**Code source:** `backend/src/ingestion/gaps/gapRuleEngine.ts` (registry=90, evaluator=91, gapsPush=86)
**Crosswalk:** `docs/audit/canonical/HF.crosswalk.json` (auditMethod: rule-body-citation-AUDIT-030D)
**Audit date:** 2026-05-04

## 1. Summary

Heart Failure has **126 spec gaps** across 15 subcategories. Implementation: **62 DET_OK + 25 PARTIAL + 39 SPEC_ONLY** (any-coverage: 87/126 = 69.0%).

**Tier 1 priority status:** 20 DET_OK + 5 PARTIAL + 4 SPEC_ONLY of 29 T1 gaps (T1 any-coverage: 86.2%).

**Spec-explicit SAFETY-tagged gaps:** 1 total; 1 covered (DET_OK), 0 uncovered. All SAFETY gaps covered.

---

## 2. Coverage by classification

| Classification | Count | % of total |
|---|---:|---:|
| PRODUCTION_GRADE | 0 | 0.0% |
| DET_OK | 62 | 49.2% |
| PARTIAL_DETECTION | 25 | 19.8% |
| SPEC_ONLY | 39 | 31.0% |
| **Total** | **126** | **100.0%** |

**PRODUCTION_GRADE = 0** is platform-wide; gated on closure of AUDIT-001 P0 (test coverage gap). Per AUDIT_METHODOLOGY.md §3.1, no rule classifies PRODUCTION_GRADE until the platform testing baseline is established.

---

## 3. Coverage by tier

| Tier | Total | DET_OK | PARTIAL | SPEC_ONLY | Any-coverage % |
|------|------:|-------:|--------:|----------:|---------------:|
| **T1** | 29 | 20 | 5 | 4 | 86.2% |
| **T2** | 62 | 30 | 11 | 21 | 66.1% |
| **T3** | 35 | 12 | 9 | 14 | 60.0% |
| **Overall** | **126** | **62** | **25** | **39** | **69.0%** |

---

## 4. Per-subcategory breakdown

| Subcategory | T1/T2/T3 | DET_OK | PARTIAL | SPEC_ONLY | Coverage |
|---|---|---:|---:|---:|---:|
| HFrEF GDMT (15) | 8/7/0 | 14 | 0 | 1 | 93.3% |
| HFpEF/HFmrEF (5) | 3/2/0 | 4 | 1 | 0 | 100.0% |
| Device Therapy (12) | 4/8/0 | 7 | 4 | 1 | 91.7% |
| Advanced HF (13) | 5/8/0 | 4 | 2 | 7 | 46.2% |
| Iron Deficiency (3) | 2/1/0 | 3 | 0 | 0 | 100.0% |
| Transitions of Care (10) | 1/4/5 | 3 | 1 | 6 | 40.0% |
| Amyloid (7) | 3/2/2 | 1 | 6 | 0 | 100.0% |
| HCM (5) | 1/1/3 | 0 | 4 | 1 | 80.0% |
| Other Phenotypes (16) | 0/0/16 | 9 | 5 | 2 | 87.5% |
| Cardiorenal Syndrome (5) | 0/5/0 | 1 | 1 | 3 | 40.0% |
| Pericardial Disease (5) | 0/1/4 | 2 | 0 | 3 | 40.0% |
| LVAD/Transplant (9) | 1/7/1 | 4 | 0 | 5 | 44.4% |
| ECMO/MCS (3) | 1/1/1 | 0 | 0 | 3 | 0.0% |
| Genetics (3) | 0/0/3 | 0 | 0 | 3 | 0.0% |
| Cross-cutting (15) | 0/15/0 | 10 | 1 | 4 | 73.3% |

---

## 4.5 — T1 SPEC_ONLY work items (load-bearing for v2.0 Phase 1)

4 T1 spec gaps with zero implementation. These are the load-bearing v2.0 Phase 1 work items for Heart Failure.

| GAP-ID | Spec line | Subcategory | Detection Logic (excerpt) | Spec SAFETY | BSW pathway |
|---|---:|---|---|---|---|
| GAP-HF-004 | 127 | HFrEF GDMT | HFrEF without sacubitril/valsartan, ACEi, or ARB | — | — |
| GAP-HF-041 | 169 | Advanced HF | HF hospitalization without discharge GDMT addition/uptitration | — | — |
| GAP-HF-043 | 170 | Advanced HF | Advanced HF trigger signal | — | — |
| GAP-HF-156 | 277 | ECMO/MCS | VA-ECMO without Impella/IABP unloading adjunct in LV distension | — | — |

---

## 4.6 — EXTRA rules + architectural patterns

**Evaluator-without-registry (1):** evaluator blocks with no registry entry.

- `HF-91` (line 9582): No registry entry matched via similarity scoring

**Naming convention mismatches (4):** registry IDs not following `gap-hf-` convention.

- `gap-1-attr-cm` (line 245): expected prefix `gap-hf-`, got `gap-1-`
- `gap-2-iron-deficiency` (line 257): expected prefix `gap-hf-`, got `gap-2-`
- `gap-6-finerenone` (line 269): expected prefix `gap-hf-`, got `gap-6-`
- `gap-44-digoxin-toxicity` (line 293): expected prefix `gap-hf-`, got `gap-44-`


---

## 5. Tier 1 priority gaps surfaced

| GAP-ID | Spec line | Class | Rule body cite | Notes |
|---|---:|---|---|---|
| GAP-HF-001 | 124 | DET_OK | `gap-hf-35-beta-blocker` (HF-35 @4972-4996) | + \| auto-verify: preserved-from-addendum |
| GAP-HF-002 | 125 | DET_OK | `gap-hf-002-bb-non-ebm` (HF-BB-NON-EBM @14502-14518) | BUILT 2026-06-15 (v3.0 HF calibration): HF-BB-NON-EBM evaluator - HFrEF (LVEF<=40) + on atenolol. CO |
| GAP-HF-003 | 126 | DET_OK | `gap-hf-003-bb-target-dose` (HF-BB-TARGET-DOSE @14561-14577) | BUILT 2026-06-15 (v3.0 HF batch): HF-BB-TARGET-DOSE - HFrEF + BB doseValue<target + HR>=60 + SBP>=10 |
| GAP-HF-004 | 127 | SPEC_ONLY | — | AUDIT-194 Part A 2026-06-30: HF-37-FU (discharge-followup, bare hasHF with no discharge/followup sig |
| GAP-HF-005 | 128 | DET_OK | `gap-hf-arni-switch` (HF-ARNI-SWITCH @14001-14025) | auto-verify: preserved-from-addendum |
| GAP-HF-007 | 129 | DET_OK | `gap-hf-36-mra` (HF-36 @5006-5028) | + \| auto-verify: preserved-from-addendum |
| GAP-HF-010 | 130 | DET_OK | `gap-hf-34-sglt2i` (HF-34 @4942-4967) | + \| auto-verify: preserved-from-addendum |
| GAP-HF-014 | 131 | DET_OK | `gap-hf-18-vericiguat` (HF-18 @5125-5141) | auto-verify: preserved-from-addendum |
| GAP-HF-016 | 143 | DET_OK | `gap-hf-79-sglt2i-hfpef` (HF-79 @5444-5464) | auto-verify: preserved-from-addendum |
| GAP-HF-017 | 144 | DET_OK | `gap-hf-017-finerenone-mref` (HF-FINERENONE-MREF @14320-14336) | BUILT 2026-06-15 (v3.0 HF calibration): HF-FINERENONE-MREF evaluator - LVEF>=40 + K<5.0 + eGFR>=25 + |
| GAP-HF-018 | 145 | DET_OK | `gap-hf-7-glp1ra` (HF-7 @5046-5062) | auto-verify: preserved-from-addendum |
| GAP-HF-021 | 152 | PARTIAL_DETECTION | `gap-ep-device-crt` (EP-DEVICE-CRT @6597-6619) **[cross-module: EP]** | — \| auto-verify: broad-rule consolidation: EP-DEVICE-CRT top-matches 3 spec gaps in subcategory "Dev |
| GAP-HF-024 | 153 | DET_OK | `gap-hf-024-icd-primary-ischemic` (HF-ICD-PRIMARY-ISCHEMIC @14651-14666) | BUILT 2026-06-15 (v3.0 HF batch): HF-ICD-PRIMARY-ISCHEMIC - LVEF<=35 + ischemic + BB+RAASi + GDMT>=3 |
| GAP-HF-025 | 154 | DET_OK | `gap-hf-025-icd-primary-nicm` (HF-ICD-PRIMARY-NICM @14682-14697) | BUILT 2026-06-15 (v3.0 HF batch): HF-ICD-PRIMARY-NICM - LVEF<=35 + NICM(I42.0/.9) + BB+RAASi + no IC |
| GAP-HF-026 | 155 | DET_OK | `gap-hf-026-icd-secondary` (HF-ICD-SECONDARY @14707-14722) | BUILT 2026-06-15 (v3.0 HF batch): HF-ICD-SECONDARY - VT(I47.2)/VF(I49.01/.02)/arrest(I46) + no ICD.  |
| GAP-HF-028 | 168 | PARTIAL_DETECTION | `gap-hf-84-transplant-eval` (HF-84 @9375-9394) | + \| Multiple registry ids cited: gap-hf-84-transplant-eval, gap-hf-85-lvad-referral \| auto-verify: p |
| GAP-HF-041 | 169 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-HF-043 | 170 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-HF-132 | 171 | DET_OK | `gap-hf-132-tolvaptan-hyponatremia` (HF-TOLVAPTAN-HYPONATREMIA @15264-15279) | BUILT 2026-06-15 (v3.0 HF batch): HF-TOLVAPTAN-HYPONATREMIA - HF + Na<125 + no tolvaptan (mgmt eval) |
| GAP-HF-133 | 172 | DET_OK | `gap-hf-133-cs-mcs-escalation` (HF-CS-MCS-ESCALATION @15293-15308) | BUILT 2026-06-15 (v3.0 HF batch): HF-CS-MCS-ESCALATION - HF + shock (R57.0) + inotrope + no MCS (CPT |
| GAP-HF-033 | 185 | DET_OK | `gap-hf-033-iron-def-iv` (HF-IRON-DEF-IV @14426-14442) | BUILT 2026-06-15 (v3.0 HF calibration): HF-IRON-DEF-IV evaluator - HF + ferritin<100 + not-on-IV-iro |
| GAP-HF-034 | 186 | DET_OK | `gap-hf-034-iron-functional` (HF-IRON-FUNCTIONAL @15011-15027) | BUILT 2026-06-15 (v3.0 HF batch): HF-IRON-FUNCTIONAL - HF + ferritin 100-299 + TSAT<20 + no IV iron. |
| GAP-HF-036 | 192 | DET_OK | `gap-hf-036-gdmt-incomplete` (HF-GDMT-INCOMPLETE @15077-15092) | BUILT 2026-06-15 (v3.0 HF batch): HF-GDMT-INCOMPLETE - HFrEF + <=2 of 4 pillars. COR 1. Pattern B: r |
| GAP-HF-051 | 206 | PARTIAL_DETECTION | `gap-hf-90-amyloid-biomarker` (HF-90 @9559-9577) | AUDIT-194-B1 2026-07-01: HF-90 amyloid biomarker RESTORED (nt_probnp LOINC 33762-6 threaded) -> re-b |
| GAP-HF-053 | 207 | PARTIAL_DETECTION | `gap-hf-90-amyloid-biomarker` (HF-90 @9559-9577) | AUDIT-194-B1 2026-07-01: HF-90 RESTORED (nt_probnp threaded) -> PARTIAL_DETECTION. |
| GAP-HF-054 | 208 | DET_OK | `gap-hf-054-attr-dmt` (HF-ATTR-DMT @14477-14493) | BUILT 2026-06-15 (v3.0 HF calibration): HF-ATTR-DMT evaluator - E85.82/E85.1 + not-on-DMT. COR 1, AT |
| GAP-HF-057 | 217 | PARTIAL_DETECTION | `gap-hf-12-hcm-screening` (HF-12 @5070-5085) | auto-verify: preserved-from-addendum |
| GAP-HF-147 | 264 | DET_OK | `gap-hf-147-lvad-inr` (HF-LVAD-INR @15405-15421) | BUILT 2026-06-15 (v3.0 HF batch): HF-LVAD-INR SAFETY - LVAD (Z95.811) + INR outside 2.0-3.0. COR 1.  |
| GAP-HF-156 | 277 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |

---

## 6. Implementation notes

### 6.1 — EXTRA rules detail

See §4.6 for EXTRA rules + architectural patterns.

### 6.2 — BSW ROI pathway implications

No T1 SPEC_ONLY gaps carry literal BSW pathway tags in CK v4.0 spec text. Pathway analysis is in the §11.5 sequencing notes (hand-authored) and the cross-module synthesis document.

### 6.3 — Strategic posture

*Strategic posture not yet authored. Set `strategicPosture` field in `HF.crosswalk.json` to populate this section.*

---

## 7. Working hypothesis verdict

**For HF:** Strong implementation coverage; module is broadly built.

Coverage data: 87/126 any-coverage (69.0%); 62/126 DET_OK only (49.2%); 25 PARTIAL via broad-rule consolidation or partial-trigger match; 39 SPEC_ONLY.

Rules-per-DET_OK efficiency: 90 registry rules / 62 DET_OK = 1.45.

---

## 8. Implications for v2.0

v2.0 Phase 1 (T1 priority) work items for HF:
- **4 T1 SPEC_ONLY** gaps requiring full build (detection + UI + tests)
- **5 T1 PARTIAL** gaps requiring hardening (broad-rule discrimination, missing exclusions, dose-protocol specificity)
- **20 T1 DET_OK** gaps requiring test coverage + UI polish to reach PRODUCTION_GRADE

Cross-module satisfaction (HF Device Therapy → EP CRT/ICD pattern; CAD-027 → PV; etc.) is captured structurally in `ruleBodyCite.evaluatorModule` per AUDIT_METHODOLOGY.md §2.1.C.

---

## 9. Module-specific findings

### Manual classification overrides (2)

Rows where the auto-classifier was wrong and the audit author corrected the classification with explicit reasoning:

- **GAP-HF-073** (T3, DET_OK, `gap-hf-073-radiation-surv` (HF-RADIATION-SURV)): BUILT 2026-06-15 (v3.0 HF batch): HF-RADIATION-SURV - radiation (Z92.3) + structural cardiac dx + echo_months>=12. COR 2a. Pattern A narrowing. SPEC_ONLY -> DET_OK (supersedes prior MANUAL OVERRIDE).
- **GAP-HF-151** (T2, DET_OK, `gap-hf-151-transplant-cav` (HF-TRANSPLANT-CAV)): BUILT 2026-06-15 (v3.0 HF batch): HF-TRANSPLANT-CAV - transplant (Z94.1) + coronary_cta_months>=12. COR 1. SPEC_ONLY -> DET_OK (supersedes prior MANUAL OVERRIDE).


---

## 10. Cross-references

- `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.1 — spec source
- `backend/src/ingestion/gaps/gapRuleEngine.ts` — code source
- `docs/audit/canonical/HF.crosswalk.json` — canonical crosswalk
- `docs/audit/canonical/HF.spec.json` — canonical spec extract
- `docs/audit/canonical/HF.code.json` — canonical code extract
- `docs/audit/canonical/HF.reconciliation.json` — canonical reconciliation
- `docs/audit/AUDIT_METHODOLOGY.md` — canonical audit methodology contract
- `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` — cross-module synthesis
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` — findings register

---

## 11. Cross-module synthesis (per-module slice)

4 cross-module satisfaction case(s) where HF spec gap is satisfied by an evaluator owned by another module:

| Spec gap | Tier | Class | Owning module | Evaluator block |
|---|---|---|---|---|
| GAP-HF-021 | T1 | PARTIAL_DETECTION | EP | `EP-DEVICE-CRT` |
| GAP-HF-022 | T2 | PARTIAL_DETECTION | EP | `EP-DEVICE-CRT` |
| GAP-HF-023 | T2 | PARTIAL_DETECTION | EP | `EP-DEVICE-CRT` |
| GAP-HF-085 | T2 | PARTIAL_DETECTION | EP | `EP-INAPPROPRIATE-SHOCKS` |

### 11.5 — Sequencing notes

*Sequencing notes not yet authored. Set `sequencingNotes` field in `HF.crosswalk.json` to populate.*

---

## 12. Lessons learned

*Lessons learned not yet authored. Set `lessonsLearned` field in `HF.crosswalk.json` to populate.*

---

## 13. Wall-clock empirical entry

Audit method: `rule-body-citation-AUDIT-030D`. Audit date: 2026-05-04.

Per-module wall-clock data lives in `docs/audit/canonical/audit_runs.jsonl` (append-only). Aggregate empirical floor table maintained in AUDIT_METHODOLOGY.md §7.2.

---

## 14. Audit verdict

**HF module: BROADLY BUILT.**

- 62 DET_OK (49.2%), 25 PARTIAL (19.8%), 39 SPEC_ONLY (31.0%)
- 20/29 T1 priority gaps DET_OK; 4 T1 SPEC_ONLY gaps require v2.0 Phase 1 work
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

This addendum is a **generated artifact** rendered from canonical inputs by `backend/scripts/auditCanonical/renderAddendum.ts`. Hand-editing this markdown is rejected by CI; edit `HF.crosswalk.json` (hand-authored fields: `strategicPosture`, `sequencingNotes`, `lessonsLearned`) and re-render.

*Generated from `docs/audit/canonical/HF.crosswalk.json`.*
