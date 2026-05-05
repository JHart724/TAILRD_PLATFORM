# Phase 0B PV Audit Addendum — generated from canonical crosswalk

**Module:** Peripheral Vascular (PV)
**Spec source:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.6
**Code source:** `backend/src/ingestion/gaps/gapRuleEngine.ts` (registry=33, evaluator=33, gapsPush=33)
**Crosswalk:** `docs/audit/canonical/PV.crosswalk.json` (auditMethod: rule-body-citation-AUDIT-030D)
**Audit date:** 2026-05-04

## 1. Summary

Peripheral Vascular has **105 spec gaps** across 20 subcategories. Implementation: **16 DET_OK + 14 PARTIAL + 75 SPEC_ONLY** (any-coverage: 30/105 = 28.6%).

**Tier 1 priority status:** 1 DET_OK + 2 PARTIAL + 4 SPEC_ONLY of 7 T1 gaps (T1 any-coverage: 42.9%).

**Spec-explicit SAFETY-tagged gaps:** 0.

---

## 2. Coverage by classification

| Classification | Count | % of total |
|---|---:|---:|
| PRODUCTION_GRADE | 0 | 0.0% |
| DET_OK | 16 | 15.2% |
| PARTIAL_DETECTION | 14 | 13.3% |
| SPEC_ONLY | 75 | 71.4% |
| **Total** | **105** | **100.0%** |

**PRODUCTION_GRADE = 0** is platform-wide; gated on closure of AUDIT-001 P0 (test coverage gap). Per AUDIT_METHODOLOGY.md §3.1, no rule classifies PRODUCTION_GRADE until the platform testing baseline is established.

---

## 3. Coverage by tier

| Tier | Total | DET_OK | PARTIAL | SPEC_ONLY | Any-coverage % |
|------|------:|-------:|--------:|----------:|---------------:|
| **T1** | 7 | 1 | 2 | 4 | 42.9% |
| **T2** | 82 | 14 | 10 | 58 | 29.3% |
| **T3** | 16 | 1 | 2 | 13 | 18.8% |
| **Overall** | **105** | **16** | **14** | **75** | **28.6%** |

---

## 4. Per-subcategory breakdown

| Subcategory | T1/T2/T3 | DET_OK | PARTIAL | SPEC_ONLY | Coverage |
|---|---|---:|---:|---:|---:|
| PAD Detection (7) | 0/7/0 | 0 | 3 | 4 | 42.9% |
| PAD Prevention (9) | 1/8/0 | 7 | 2 | 0 | 100.0% |
| CLTI (6) | 2/4/0 | 0 | 2 | 4 | 33.3% |
| TASC Staging (5) | 0/5/0 | 0 | 1 | 4 | 20.0% |
| Mesenteric Ischemia (5) | 0/5/0 | 0 | 1 | 4 | 20.0% |
| Renal Artery (4) | 0/4/0 | 1 | 0 | 3 | 25.0% |
| Vasculitis (6) | 0/6/0 | 0 | 0 | 6 | 0.0% |
| Upper Extremity (5) | 0/5/0 | 1 | 0 | 4 | 20.0% |
| Raynaud (3) | 0/2/1 | 0 | 1 | 2 | 33.3% |
| AAA (7) | 2/2/3 | 1 | 0 | 6 | 14.3% |
| Carotid/CVA (5) | 1/4/0 | 0 | 1 | 4 | 20.0% |
| Venous Disease (9) | 0/9/0 | 3 | 1 | 5 | 44.4% |
| PE Risk Strat (6) | 0/6/0 | 1 | 0 | 5 | 16.7% |
| CTEPH (4) | 1/3/0 | 0 | 0 | 4 | 0.0% |
| PAH (6) | 0/6/0 | 0 | 0 | 6 | 0.0% |
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
| GAP-PV-055 | 1017 | AAA | AAA>=5.5 cm male without surgical/endo referral | — | — |
| GAP-PV-056 | 1018 | AAA | AAA>=5.0 cm female without surgical/endo referral | — | — |
| GAP-PV-058 | 1028 | Carotid/CVA | Recent stroke/TIA + carotid stenosis>=70% without revasc within 2 weeks | — | — |
| GAP-PV-079 | 1060 | CTEPH | CTEPH dx without pulmonary thromboendarterectomy eligibility assessment | — | — |

---

## 4.6 — EXTRA rules + architectural patterns

No EXTRA rules or architectural patterns surfaced. Reconciliation is clean.

---

## 5. Tier 1 priority gaps surfaced

| GAP-ID | Spec line | Class | Rule body cite | Notes |
|---|---:|---|---|---|
| GAP-PV-011 | 942 | DET_OK | `gap-pv-rivaroxaban` (PV-RIVAROXABAN @10943-10971) | auto-verify: preserved-from-addendum |
| GAP-PV-017 | 955 | PARTIAL_DETECTION | `gap-pv-bypass-eval` (PV-BYPASS-EVAL @11008-11034) | auto-verify: preserved-from-addendum |
| GAP-PV-018 | 956 | PARTIAL_DETECTION | `gap-pv-bypass-eval` (PV-BYPASS-EVAL @11008-11034) | auto-verify: preserved-from-addendum |
| GAP-PV-055 | 1017 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-PV-056 | 1018 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-PV-058 | 1028 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
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

**For PV:** Light implementation coverage; significant v2.0 Phase 1 build work required.

Coverage data: 30/105 any-coverage (28.6%); 16/105 DET_OK only (15.2%); 14 PARTIAL via broad-rule consolidation or partial-trigger match; 75 SPEC_ONLY.

Rules-per-DET_OK efficiency: 33 registry rules / 16 DET_OK = 2.06.

---

## 8. Implications for v2.0

v2.0 Phase 1 (T1 priority) work items for PV:
- **4 T1 SPEC_ONLY** gaps requiring full build (detection + UI + tests)
- **2 T1 PARTIAL** gaps requiring hardening (broad-rule discrimination, missing exclusions, dose-protocol specificity)
- **1 T1 DET_OK** gaps requiring test coverage + UI polish to reach PRODUCTION_GRADE

Cross-module satisfaction (HF Device Therapy → EP CRT/ICD pattern; CAD-027 → PV; etc.) is captured structurally in `ruleBodyCite.evaluatorModule` per AUDIT_METHODOLOGY.md §2.1.C.

---

## 9. Module-specific findings

No manual classification overrides for this module.


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

**PV module: LIGHTLY BUILT.**

- 16 DET_OK (15.2%), 14 PARTIAL (13.3%), 75 SPEC_ONLY (71.4%)
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
