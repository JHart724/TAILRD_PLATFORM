# Phase 0B HF Audit Addendum — generated from canonical crosswalk

**Module:** Heart Failure (HF)
**Spec source:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.1
**Code source:** `backend/src/ingestion/gaps/gapRuleEngine.ts` (registry=48, evaluator=47, gapsPush=47)
**Crosswalk:** `docs/audit/canonical/HF.crosswalk.json` (auditMethod: rule-body-citation-AUDIT-030D)
**Audit date:** 2026-05-04

## 1. Summary

Heart Failure has **126 spec gaps** across 15 subcategories. Implementation: **22 DET_OK + 43 PARTIAL + 61 SPEC_ONLY** (any-coverage: 65/126 = 51.6%).

**Tier 1 priority status:** 8 DET_OK + 14 PARTIAL + 7 SPEC_ONLY of 29 T1 gaps (T1 any-coverage: 75.9%).

**Spec-explicit SAFETY-tagged gaps:** 1 total; 0 covered (DET_OK), 1 uncovered. Uncovered SAFETY gaps qualify for Tier S triage queue per §6.3.

---

## 2. Coverage by classification

| Classification | Count | % of total |
|---|---:|---:|
| PRODUCTION_GRADE | 0 | 0.0% |
| DET_OK | 22 | 17.5% |
| PARTIAL_DETECTION | 43 | 34.1% |
| SPEC_ONLY | 61 | 48.4% |
| **Total** | **126** | **100.0%** |

**PRODUCTION_GRADE = 0** is platform-wide; gated on closure of AUDIT-001 P0 (test coverage gap). Per AUDIT_METHODOLOGY.md §3.1, no rule classifies PRODUCTION_GRADE until the platform testing baseline is established.

---

## 3. Coverage by tier

| Tier | Total | DET_OK | PARTIAL | SPEC_ONLY | Any-coverage % |
|------|------:|-------:|--------:|----------:|---------------:|
| **T1** | 29 | 8 | 14 | 7 | 75.9% |
| **T2** | 62 | 10 | 16 | 36 | 41.9% |
| **T3** | 35 | 4 | 13 | 18 | 48.6% |
| **Overall** | **126** | **22** | **43** | **61** | **51.6%** |

---

## 4. Per-subcategory breakdown

| Subcategory | T1/T2/T3 | DET_OK | PARTIAL | SPEC_ONLY | Coverage |
|---|---|---:|---:|---:|---:|
| HFrEF GDMT (15) | 8/7/0 | 10 | 4 | 1 | 93.3% |
| HFpEF/HFmrEF (5) | 3/2/0 | 3 | 1 | 1 | 80.0% |
| Device Therapy (12) | 4/8/0 | 0 | 8 | 4 | 66.7% |
| Advanced HF (13) | 5/8/0 | 1 | 3 | 9 | 30.8% |
| Iron Deficiency (3) | 2/1/0 | 0 | 3 | 0 | 100.0% |
| Transitions of Care (10) | 1/4/5 | 3 | 1 | 6 | 40.0% |
| Amyloid (7) | 3/2/2 | 0 | 7 | 0 | 100.0% |
| HCM (5) | 1/1/3 | 0 | 4 | 1 | 80.0% |
| Other Phenotypes (16) | 0/0/16 | 2 | 9 | 5 | 68.8% |
| Cardiorenal Syndrome (5) | 0/5/0 | 0 | 1 | 4 | 20.0% |
| Pericardial Disease (5) | 0/1/4 | 0 | 0 | 5 | 0.0% |
| LVAD/Transplant (9) | 1/7/1 | 0 | 0 | 9 | 0.0% |
| ECMO/MCS (3) | 1/1/1 | 0 | 0 | 3 | 0.0% |
| Genetics (3) | 0/0/3 | 0 | 0 | 3 | 0.0% |
| Cross-cutting (15) | 0/15/0 | 3 | 2 | 10 | 33.3% |

---

## 4.5 — T1 SPEC_ONLY work items (load-bearing for v2.0 Phase 1)

7 T1 spec gaps with zero implementation. These are the load-bearing v2.0 Phase 1 work items for Heart Failure.

| GAP-ID | Spec line | Subcategory | Detection Logic (excerpt) | Spec SAFETY | BSW pathway |
|---|---:|---|---|---|---|
| GAP-HF-017 | 144 | HFpEF/HFmrEF | EF>=40% HF without finerenone (FINEARTS-HF); K+<5.0, eGFR>=25 | — | — |
| GAP-HF-041 | 169 | Advanced HF | HF hospitalization without discharge GDMT addition/uptitration | — | — |
| GAP-HF-043 | 170 | Advanced HF | Advanced HF trigger signal | — | — |
| GAP-HF-133 | 172 | Advanced HF | HF-cardiogenic shock without Impella/ECMO/VA-MCS escalation | — | — |
| GAP-HF-036 | 192 | Transitions of Care | Discharge med list missing BB, RAASi, MRA, or SGLT2i | — | — |
| GAP-HF-147 | 264 | LVAD/Transplant | LVAD (Z95.811) + INR not 2.0-3.0 at last check | — | — |
| GAP-HF-156 | 277 | ECMO/MCS | VA-ECMO without Impella/IABP unloading adjunct in LV distension | — | — |

---

## 4.6 — EXTRA rules + architectural patterns

**Registry-without-evaluator (1):** registry entries with no matching evaluator block body.

- `gap-hf-vaccine-covid` (registry line 2077): No evaluator body matched via similarity scoring

**Naming convention mismatches (4):** registry IDs not following `gap-hf-` convention.

- `gap-1-attr-cm` (line 121): expected prefix `gap-hf-`, got `gap-1-`
- `gap-2-iron-deficiency` (line 133): expected prefix `gap-hf-`, got `gap-2-`
- `gap-6-finerenone` (line 145): expected prefix `gap-hf-`, got `gap-6-`
- `gap-44-digoxin-toxicity` (line 169): expected prefix `gap-hf-`, got `gap-44-`


---

## 5. Tier 1 priority gaps surfaced

| GAP-ID | Spec line | Class | Rule body cite | Notes |
|---|---:|---|---|---|
| GAP-HF-001 | 124 | DET_OK | `gap-hf-35-beta-blocker` (HF-35 @3416-3440) | + \| auto-verify: preserved-from-addendum |
| GAP-HF-002 | 125 | PARTIAL_DETECTION | `gap-hf-35-beta-blocker` (HF-35 @3416-3440) | auto-verify: preserved-from-addendum |
| GAP-HF-003 | 126 | PARTIAL_DETECTION | `gap-hf-35-beta-blocker` (HF-35 @3416-3440) | auto-verify: preserved-from-addendum |
| GAP-HF-004 | 127 | DET_OK | `gap-hf-37-raas` (HF-37 @4852-4878) | + \| auto-verify: preserved-from-addendum |
| GAP-HF-005 | 128 | DET_OK | `gap-hf-arni-switch` (HF-ARNI-SWITCH @10004-10028) | auto-verify: preserved-from-addendum |
| GAP-HF-007 | 129 | DET_OK | `gap-hf-36-mra` (HF-36 @3450-3472) | + \| auto-verify: preserved-from-addendum |
| GAP-HF-010 | 130 | DET_OK | `gap-hf-34-sglt2i` (HF-34 @3386-3411) | + \| auto-verify: preserved-from-addendum |
| GAP-HF-014 | 131 | DET_OK | `gap-hf-18-vericiguat` (HF-18 @3567-3583) | auto-verify: preserved-from-addendum |
| GAP-HF-016 | 143 | DET_OK | `gap-hf-79-sglt2i-hfpef` (HF-79 @3894-3914) | auto-verify: preserved-from-addendum |
| GAP-HF-017 | 144 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-HF-018 | 145 | DET_OK | `gap-hf-7-glp1ra` (HF-7 @3488-3504) | auto-verify: preserved-from-addendum |
| GAP-HF-021 | 152 | PARTIAL_DETECTION | `gap-ep-device-crt` (EP-DEVICE-CRT @4226-4248) **[cross-module: EP]** | — \| auto-verify: broad-rule consolidation: EP-DEVICE-CRT top-matches 3 spec gaps in subcategory "Dev |
| GAP-HF-024 | 153 | PARTIAL_DETECTION | `gap-ep-device-icd` (EP-DEVICE-ICD @4189-4215) **[cross-module: EP]** | — \| auto-verify: broad-rule consolidation: EP-DEVICE-ICD top-matches 2 spec gaps in subcategory "Dev |
| GAP-HF-025 | 154 | PARTIAL_DETECTION | `gap-ep-device-icd` (EP-DEVICE-ICD @4189-4215) **[cross-module: EP]** | — \| auto-verify: broad-rule consolidation: EP-DEVICE-ICD top-matches 2 spec gaps in subcategory "Dev |
| GAP-HF-026 | 155 | PARTIAL_DETECTION | `gap-ep-secondary-icd` (EP-SECONDARY-ICD @7173-7195) **[cross-module: EP]** | — \| auto-verify: Top candidate score=0.404 between PARTIAL and HIGH thresholds; tokenJaccard=0.07; n |
| GAP-HF-028 | 168 | PARTIAL_DETECTION | `gap-hf-84-transplant-eval` (HF-84 @5904-5923) | + \| Multiple registry ids cited: gap-hf-84-transplant-eval, gap-hf-85-lvad-referral \| auto-verify: p |
| GAP-HF-041 | 169 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-HF-043 | 170 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-HF-132 | 171 | PARTIAL_DETECTION | `gap-hf-73-hyponatremia` (HF-73 @3774-3789) | auto-verify: preserved-from-addendum |
| GAP-HF-133 | 172 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-HF-033 | 185 | PARTIAL_DETECTION | `gap-hf-iron-iv-monitoring` (HF-IRON-IV-MONITORING @10273-10296) | auto-verify: preserved-from-addendum |
| GAP-HF-034 | 186 | PARTIAL_DETECTION | `gap-hf-iron-iv-monitoring` (HF-IRON-IV-MONITORING @10273-10296) | auto-verify: preserved-from-addendum |
| GAP-HF-036 | 192 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-HF-051 | 206 | PARTIAL_DETECTION | `gap-hf-90-amyloid-biomarker` (HF-90 @6082-6100) | auto-verify: preserved-from-addendum |
| GAP-HF-053 | 207 | PARTIAL_DETECTION | `gap-hf-90-amyloid-biomarker` (HF-90 @6082-6100) | auto-verify: preserved-from-addendum |
| GAP-HF-054 | 208 | PARTIAL_DETECTION | `gap-hf-90-amyloid-biomarker` (HF-90 @6082-6100) | auto-verify: preserved-from-addendum |
| GAP-HF-057 | 217 | PARTIAL_DETECTION | `gap-hf-12-hcm-screening` (HF-12 @3512-3527) | auto-verify: preserved-from-addendum |
| GAP-HF-147 | 264 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
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

**For HF:** Light implementation coverage; significant v2.0 Phase 1 build work required.

Coverage data: 65/126 any-coverage (51.6%); 22/126 DET_OK only (17.5%); 43 PARTIAL via broad-rule consolidation or partial-trigger match; 61 SPEC_ONLY.

Rules-per-DET_OK efficiency: 48 registry rules / 22 DET_OK = 2.18.

---

## 8. Implications for v2.0

v2.0 Phase 1 (T1 priority) work items for HF:
- **7 T1 SPEC_ONLY** gaps requiring full build (detection + UI + tests)
- **14 T1 PARTIAL** gaps requiring hardening (broad-rule discrimination, missing exclusions, dose-protocol specificity)
- **8 T1 DET_OK** gaps requiring test coverage + UI polish to reach PRODUCTION_GRADE

Cross-module satisfaction (HF Device Therapy → EP CRT/ICD pattern; CAD-027 → PV; etc.) is captured structurally in `ruleBodyCite.evaluatorModule` per AUDIT_METHODOLOGY.md §2.1.C.

---

## 9. Module-specific findings

### Manual classification overrides (2)

Rows where the auto-classifier was wrong and the audit author corrected the classification with explicit reasoning:

- **GAP-HF-073** (T3, SPEC_ONLY, no cite): MANUAL OVERRIDE: auto-classifier matched HF-073 (radiation cardiomyopathy) to VD-RADIATION cross-module evaluator. FALSE POSITIVE — VD-RADIATION covers radiation valve disease, different clinical scenario. HF-073 has no in-module or cross-module evaluator coverage. SPEC_ONLY.
- **GAP-HF-151** (T2, SPEC_ONLY, no cite): MANUAL OVERRIDE: auto-classifier matched HF-151 (post-cardiac-transplant HF) to CAD-CARDIAC-TRANSPLANT-CAD cross-module evaluator. FALSE POSITIVE — CAD evaluator covers cardiac allograft vasculopathy (CAV; post-transplant CAD), distinct from HF graft dysfunction. HF-151 has no specific evaluator coverage. SPEC_ONLY.


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

9 cross-module satisfaction case(s) where HF spec gap is satisfied by an evaluator owned by another module:

| Spec gap | Tier | Class | Owning module | Evaluator block |
|---|---|---|---|---|
| GAP-HF-021 | T1 | PARTIAL_DETECTION | EP | `EP-DEVICE-CRT` |
| GAP-HF-024 | T1 | PARTIAL_DETECTION | EP | `EP-DEVICE-ICD` |
| GAP-HF-025 | T1 | PARTIAL_DETECTION | EP | `EP-DEVICE-ICD` |
| GAP-HF-026 | T1 | PARTIAL_DETECTION | EP | `EP-SECONDARY-ICD` |
| GAP-HF-022 | T2 | PARTIAL_DETECTION | EP | `EP-DEVICE-CRT` |
| GAP-HF-023 | T2 | PARTIAL_DETECTION | EP | `EP-DEVICE-CRT` |
| GAP-HF-072 | T3 | PARTIAL_DETECTION | CAD | `CAD-TAKOTSUBO` |
| GAP-HF-078 | T2 | PARTIAL_DETECTION | EP | `EP-EARLY-RHYTHM` |
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

**HF module: LIGHTLY BUILT.**

- 22 DET_OK (17.5%), 43 PARTIAL (34.1%), 61 SPEC_ONLY (48.4%)
- 8/29 T1 priority gaps DET_OK; 7 T1 SPEC_ONLY gaps require v2.0 Phase 1 work
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
