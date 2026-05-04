# Phase 0B CAD Audit Addendum — generated from canonical crosswalk

**Module:** Coronary Artery Disease (CAD)
**Spec source:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.4
**Code source:** `backend/src/ingestion/gaps/gapRuleEngine.ts` (registry=76, evaluator=76, gapsPush=76)
**Crosswalk:** `docs/audit/canonical/CAD.crosswalk.json` (auditMethod: rule-body-citation-AUDIT-030D)
**Audit date:** 2026-05-04

## 1. Summary

Coronary Artery Disease has **90 spec gaps** across 18 subcategories. Implementation: **28 DET_OK + 28 PARTIAL + 34 SPEC_ONLY** (any-coverage: 56/90 = 62.2%).

**Tier 1 priority status:** 7 DET_OK + 5 PARTIAL + 6 SPEC_ONLY of 18 T1 gaps (T1 any-coverage: 66.7%).

**Spec-explicit SAFETY-tagged gaps:** 1 total; 0 covered (DET_OK), 1 uncovered. Uncovered SAFETY gaps qualify for Tier S triage queue per §6.3.

---

## 2. Coverage by classification

| Classification | Count | % of total |
|---|---:|---:|
| PRODUCTION_GRADE | 0 | 0.0% |
| DET_OK | 28 | 31.1% |
| PARTIAL_DETECTION | 28 | 31.1% |
| SPEC_ONLY | 34 | 37.8% |
| **Total** | **90** | **100.0%** |

**PRODUCTION_GRADE = 0** is platform-wide; gated on closure of AUDIT-001 P0 (test coverage gap). Per AUDIT_METHODOLOGY.md §3.1, no rule classifies PRODUCTION_GRADE until the platform testing baseline is established.

---

## 3. Coverage by tier

| Tier | Total | DET_OK | PARTIAL | SPEC_ONLY | Any-coverage % |
|------|------:|-------:|--------:|----------:|---------------:|
| **T1** | 18 | 7 | 5 | 6 | 66.7% |
| **T2** | 55 | 17 | 19 | 19 | 65.5% |
| **T3** | 17 | 4 | 4 | 9 | 47.1% |
| **Overall** | **90** | **28** | **28** | **34** | **62.2%** |

---

## 4. Per-subcategory breakdown

| Subcategory | T1/T2/T3 | DET_OK | PARTIAL | SPEC_ONLY | Coverage |
|---|---|---:|---:|---:|---:|
| Lipid Management (13) | 7/4/2 | 8 | 1 | 4 | 69.2% |
| Primary Prevention (6) | 3/0/3 | 2 | 3 | 1 | 83.3% |
| DAPT (7) | 2/3/2 | 3 | 3 | 1 | 85.7% |
| Post-ACS Therapies (6) | 0/6/0 | 3 | 2 | 1 | 83.3% |
| STEMI/ACS Timing (5) | 2/3/0 | 0 | 3 | 2 | 60.0% |
| Polyvascular (2) | 0/2/0 | 0 | 1 | 1 | 50.0% |
| Post-CABG (2) | 0/2/0 | 1 | 1 | 0 | 100.0% |
| Chronic CAD (4) | 0/4/0 | 2 | 2 | 0 | 100.0% |
| MINOCA/INOCA (5) | 0/5/0 | 2 | 3 | 0 | 100.0% |
| Intracoronary Imaging (3) | 0/3/0 | 1 | 2 | 0 | 100.0% |
| Complex PCI (4) | 1/3/0 | 0 | 0 | 4 | 0.0% |
| Stent Complications (3) | 0/2/1 | 0 | 0 | 3 | 0.0% |
| Cardiogenic Shock (6) | 2/4/0 | 0 | 0 | 6 | 0.0% |
| Adjunctive (5) | 0/3/2 | 3 | 2 | 0 | 100.0% |
| Special Etiologies (8) | 1/1/6 | 2 | 1 | 5 | 37.5% |
| Cardiac Imaging (3) | 0/2/1 | 1 | 2 | 0 | 100.0% |
| Peri-procedure (4) | 0/4/0 | 0 | 1 | 3 | 25.0% |
| Post-procedure (4) | 0/4/0 | 0 | 1 | 3 | 25.0% |

---

## 4.5 — T1 SPEC_ONLY work items (load-bearing for v2.0 Phase 1)

6 T1 spec gaps with zero implementation. These are the load-bearing v2.0 Phase 1 work items for Coronary Artery Disease.

| GAP-ID | Spec line | Subcategory | Detection Logic (excerpt) | Spec SAFETY | BSW pathway |
|---|---:|---|---|---|---|
| GAP-CAD-056 | 595 | Lipid Management | Statin e-Rx with zero fills in pharmacy claims | — | — |
| GAP-CAD-057 | 596 | Lipid Management | Chronic statin with PDC<80% in past 12mo | — | — |
| GAP-CAD-063 | 638 | STEMI/ACS Timing | STEMI first medical contact to PCI >90 min | — | — |
| GAP-CAD-071 | 683 | Complex PCI | Left main disease without heart team documented decision | — | — |
| GAP-CAD-042 | 698 | Cardiogenic Shock | STEMI + cardiogenic shock + no Impella placed | — | — |
| GAP-CAD-043 | 699 | Cardiogenic Shock | Cardiogenic shock on IABP without Impella/ECMO escalation | — | — |

---

## 4.6 — EXTRA rules + architectural patterns

**Naming convention mismatches (1):** registry IDs not following `gap-cad-` convention.

- `gap-50-dapt` (line 180): expected prefix `gap-cad-`, got `gap-50-`


---

## 5. Tier 1 priority gaps surfaced

| GAP-ID | Spec line | Class | Rule body cite | Notes |
|---|---:|---|---|---|
| GAP-CAD-001 | 590 | DET_OK | `gap-cad-statin` (CAD-STATIN @4332-4357) | auto-verify: preserved-from-addendum |
| GAP-CAD-002 | 591 | DET_OK | `gap-cad-statin` (CAD-STATIN @4332-4357) | auto-verify: preserved-from-addendum |
| GAP-CAD-003 | 592 | DET_OK | `gap-cad-ezetimibe` (CAD-EZETIMIBE @4502-4532) | auto-verify: preserved-from-addendum |
| GAP-CAD-004 | 593 | DET_OK | `gap-cad-pcsk9` (CAD-PCSK9 @7164-7195) | auto-verify: preserved-from-addendum |
| GAP-CAD-005 | 594 | PARTIAL_DETECTION | `gap-cad-pcsk9` (CAD-PCSK9 @7164-7195) | auto-verify: preserved-from-addendum |
| GAP-CAD-056 | 595 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-CAD-057 | 596 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-CAD-011 | 607 | PARTIAL_DETECTION | `gap-cad-statin` (CAD-STATIN @4332-4357) | auto-verify: preserved-from-addendum |
| GAP-CAD-012 | 608 | PARTIAL_DETECTION | `gap-cad-statin` (CAD-STATIN @4332-4357) | auto-verify: preserved-from-addendum |
| GAP-CAD-014 | 609 | DET_OK | `gap-cad-omega3` (CAD-OMEGA3 @7293-7326) | auto-verify: preserved-from-addendum |
| GAP-CAD-015 | 617 | DET_OK | `gap-cad-ticagrelor-acs` (CAD-TICAGRELOR-ACS @7667-7693) | + \| Multiple registry ids cited: gap-cad-ticagrelor-acs, gap-cad-prasugrel \| auto-verify: preserved- |
| GAP-CAD-016 | 618 | PARTIAL_DETECTION | `gap-cad-prasugrel` (CAD-PRASUGREL @8286-8317) | auto-verify: preserved-from-addendum |
| GAP-CAD-063 | 638 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-CAD-065 | 639 | PARTIAL_DETECTION | `gap-cad-catheterization` (CAD-CATHETERIZATION @8664-8691) | auto-verify: preserved-from-addendum |
| GAP-CAD-071 | 683 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-CAD-042 | 698 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-CAD-043 | 699 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-CAD-081 | 717 | DET_OK | `gap-cad-scad` (CAD-SCAD @8785-8813) | +  + \| Multiple registry ids cited: gap-cad-scad, gap-cad-women-specific, gap-cad-young-mi \| auto-ve |

---

## 6. Implementation notes

### 6.1 — EXTRA rules detail

See §4.6 for EXTRA rules + architectural patterns.

### 6.2 — BSW ROI pathway implications

No T1 SPEC_ONLY gaps carry literal BSW pathway tags in CK v4.0 spec text. Pathway analysis is in the §11.5 sequencing notes (hand-authored) and the cross-module synthesis document.

### 6.3 — Strategic posture

*Strategic posture not yet authored. Set `strategicPosture` field in `CAD.crosswalk.json` to populate this section.*

---

## 7. Working hypothesis verdict

**For CAD:** Moderate implementation coverage; medication/screening surfaces typically built, procedural surfaces often lighter.

Coverage data: 56/90 any-coverage (62.2%); 28/90 DET_OK only (31.1%); 28 PARTIAL via broad-rule consolidation or partial-trigger match; 34 SPEC_ONLY.

Rules-per-DET_OK efficiency: 76 registry rules / 28 DET_OK = 2.71.

---

## 8. Implications for v2.0

v2.0 Phase 1 (T1 priority) work items for CAD:
- **6 T1 SPEC_ONLY** gaps requiring full build (detection + UI + tests)
- **5 T1 PARTIAL** gaps requiring hardening (broad-rule discrimination, missing exclusions, dose-protocol specificity)
- **7 T1 DET_OK** gaps requiring test coverage + UI polish to reach PRODUCTION_GRADE

Cross-module satisfaction (HF Device Therapy → EP CRT/ICD pattern; CAD-027 → PV; etc.) is captured structurally in `ruleBodyCite.evaluatorModule` per AUDIT_METHODOLOGY.md §2.1.C.

---

## 9. Module-specific findings

### Manual classification overrides (1)

Rows where the auto-classifier was wrong and the audit author corrected the classification with explicit reasoning:

- **GAP-CAD-027** (T2, PARTIAL_DETECTION, `gap-pv-rivaroxaban` (PV-RIVAROXABAN) cross-module to PV): MANUAL OVERRIDE per CAD addendum line 232: cross-module satisfaction. GAP-CAD-027 (Polyvascular COMPASS dual pathway) is satisfied by PV module rule gap-pv-rivaroxaban. Note: this rule is registered under CAD module enum (module: ModuleType.CORONARY_INTERVENTION) despite gap-pv-* naming — naming convention inconsistency tracked at AUDIT-027.


---

## 10. Cross-references

- `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.4 — spec source
- `backend/src/ingestion/gaps/gapRuleEngine.ts` — code source
- `docs/audit/canonical/CAD.crosswalk.json` — canonical crosswalk
- `docs/audit/canonical/CAD.spec.json` — canonical spec extract
- `docs/audit/canonical/CAD.code.json` — canonical code extract
- `docs/audit/canonical/CAD.reconciliation.json` — canonical reconciliation
- `docs/audit/AUDIT_METHODOLOGY.md` — canonical audit methodology contract
- `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` — cross-module synthesis
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` — findings register

---

## 11. Cross-module synthesis (per-module slice)

1 cross-module satisfaction case(s) where CAD spec gap is satisfied by an evaluator owned by another module:

| Spec gap | Tier | Class | Owning module | Evaluator block |
|---|---|---|---|---|
| GAP-CAD-027 | T2 | PARTIAL_DETECTION | PV | `PV-RIVAROXABAN` |

### 11.5 — Sequencing notes

*Sequencing notes not yet authored. Set `sequencingNotes` field in `CAD.crosswalk.json` to populate.*

---

## 12. Lessons learned

*Lessons learned not yet authored. Set `lessonsLearned` field in `CAD.crosswalk.json` to populate.*

---

## 13. Wall-clock empirical entry

Audit method: `rule-body-citation-AUDIT-030D`. Audit date: 2026-05-04.

Per-module wall-clock data lives in `docs/audit/canonical/audit_runs.jsonl` (append-only). Aggregate empirical floor table maintained in AUDIT_METHODOLOGY.md §7.2.

---

## 14. Audit verdict

**CAD module: MODERATELY BUILT.**

- 28 DET_OK (31.1%), 28 PARTIAL (31.1%), 34 SPEC_ONLY (37.8%)
- 7/18 T1 priority gaps DET_OK; 6 T1 SPEC_ONLY gaps require v2.0 Phase 1 work
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

This addendum is a **generated artifact** rendered from canonical inputs by `backend/scripts/auditCanonical/renderAddendum.ts`. Hand-editing this markdown is rejected by CI; edit `CAD.crosswalk.json` (hand-authored fields: `strategicPosture`, `sequencingNotes`, `lessonsLearned`) and re-render.

*Generated from `docs/audit/canonical/CAD.crosswalk.json`.*
