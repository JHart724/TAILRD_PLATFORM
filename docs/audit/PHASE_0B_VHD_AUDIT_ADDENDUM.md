# Phase 0B VHD Audit Addendum — generated from canonical crosswalk

**Module:** Valvular Heart Disease (VHD)
**Spec source:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.5
**Code source:** `backend/src/ingestion/gaps/gapRuleEngine.ts` (registry=32, evaluator=32, gapsPush=32)
**Crosswalk:** `docs/audit/canonical/VHD.crosswalk.json` (auditMethod: rule-body-citation-AUDIT-030D)
**Audit date:** 2026-05-04

## 1. Summary

Valvular Heart Disease has **105 spec gaps** across 18 subcategories. Implementation: **5 DET_OK + 16 PARTIAL + 84 SPEC_ONLY** (any-coverage: 21/105 = 20.0%).

**Tier 1 priority status:** 1 DET_OK + 3 PARTIAL + 4 SPEC_ONLY of 8 T1 gaps (T1 any-coverage: 50.0%).

**Spec-explicit SAFETY-tagged gaps:** 1 total; 1 covered (DET_OK), 0 uncovered. All SAFETY gaps covered.

---

## 2. Coverage by classification

| Classification | Count | % of total |
|---|---:|---:|
| PRODUCTION_GRADE | 0 | 0.0% |
| DET_OK | 5 | 4.8% |
| PARTIAL_DETECTION | 16 | 15.2% |
| SPEC_ONLY | 84 | 80.0% |
| **Total** | **105** | **100.0%** |

**PRODUCTION_GRADE = 0** is platform-wide; gated on closure of AUDIT-001 P0 (test coverage gap). Per AUDIT_METHODOLOGY.md §3.1, no rule classifies PRODUCTION_GRADE until the platform testing baseline is established.

---

## 3. Coverage by tier

| Tier | Total | DET_OK | PARTIAL | SPEC_ONLY | Any-coverage % |
|------|------:|-------:|--------:|----------:|---------------:|
| **T1** | 8 | 1 | 3 | 4 | 50.0% |
| **T2** | 72 | 4 | 10 | 58 | 19.4% |
| **T3** | 25 | 0 | 3 | 22 | 12.0% |
| **Overall** | **105** | **5** | **16** | **84** | **20.0%** |

---

## 4. Per-subcategory breakdown

| Subcategory | T1/T2/T3 | DET_OK | PARTIAL | SPEC_ONLY | Coverage |
|---|---|---:|---:|---:|---:|
| Mechanical Valve (9) | 2/7/0 | 1 | 1 | 7 | 22.2% |
| Bioprosthetic Valve (8) | 0/8/0 | 1 | 3 | 4 | 50.0% |
| Prosthesis Selection (6) | 0/5/1 | 0 | 0 | 6 | 0.0% |
| Surgical AVR (6) | 0/5/1 | 0 | 1 | 5 | 16.7% |
| Surgical MVR (7) | 0/5/2 | 0 | 0 | 7 | 0.0% |
| Concomitant Procedures (5) | 0/5/0 | 0 | 1 | 4 | 20.0% |
| IE General (8) | 0/8/0 | 0 | 0 | 8 | 0.0% |
| IE Pathogens (7) | 1/6/0 | 0 | 0 | 7 | 0.0% |
| IE Surgical (6) | 3/3/0 | 0 | 0 | 6 | 0.0% |
| IE Prophylaxis (5) | 0/5/0 | 1 | 0 | 4 | 20.0% |
| PVT (5) | 1/4/0 | 0 | 1 | 4 | 20.0% |
| Post-op Surveillance (6) | 0/2/4 | 0 | 1 | 5 | 16.7% |
| Rheumatic (6) | 0/5/1 | 1 | 1 | 4 | 33.3% |
| Carcinoid (6) | 0/0/6 | 0 | 1 | 5 | 16.7% |
| Drug-Induced (4) | 0/0/4 | 0 | 0 | 4 | 0.0% |
| Radiation (3) | 0/0/3 | 0 | 2 | 1 | 66.7% |
| Pregnancy (4) | 1/3/0 | 0 | 4 | 0 | 100.0% |
| Valve Progression (4) | 0/1/3 | 1 | 0 | 3 | 25.0% |

---

## 4.5 — T1 SPEC_ONLY work items (load-bearing for v2.0 Phase 1)

4 T1 spec gaps with zero implementation. These are the load-bearing v2.0 Phase 1 work items for Valvular Heart Disease.

| GAP-ID | Spec line | Subcategory | Detection Logic (excerpt) | Spec SAFETY | BSW pathway |
|---|---:|---|---|---|---|
| GAP-VHD-050 | 830 | IE Pathogens | aureus bacteremia: TEE indication adherence. S. aureus BSI (any) without TEE per... | — | — |
| GAP-VHD-057 | 841 | IE Surgical | IE + new or worsening HF without surgical eval | — | — |
| GAP-VHD-058 | 842 | IE Surgical | IE + abscess on echo without surgical referral | — | — |
| GAP-VHD-061 | 843 | IE Surgical | PVE + dehiscence/fistula without surgical referral | — | — |

---

## 4.6 — EXTRA rules + architectural patterns

No EXTRA rules or architectural patterns surfaced. Reconciliation is clean.

---

## 5. Tier 1 priority gaps surfaced

| GAP-ID | Spec line | Class | Rule body cite | Notes |
|---|---:|---|---|---|
| GAP-VHD-001 | 753 | PARTIAL_DETECTION | `gap-vd-3-inr-monitoring` (VD-3 @5410-5434) | line 4638+ checks no-warfarin (different scenario);  line 5219+ checks no-INR-data (different scenar |
| GAP-VHD-005 | 754 | DET_OK | `gap-vd-6-doac-mechanical-valve` (VD-6 @5500-5524) | line 5312+ (explicit RE-ALIGN trial citation, Class 3 Harm) \| auto-verify: preserved-from-addendum |
| GAP-VHD-050 | 830 | SPEC_ONLY | — | No S. aureus + TEE rule in evaluator. \| auto-verify: No candidate evaluator block above PARTIAL_MATC |
| GAP-VHD-057 | 841 | SPEC_ONLY | — | No IE + acute HF surgical-urgency rule. \| auto-verify: No candidate evaluator block above PARTIAL_MA |
| GAP-VHD-058 | 842 | SPEC_ONLY | — | No IE + abscess surgical rule. \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-VHD-061 | 843 | SPEC_ONLY | — | No PVE dehiscence/fistula rule. \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-VHD-068 | 860 | PARTIAL_DETECTION | `gap-vd-prosthetic-pannus` (VD-PANNUS @10682-10704) | MANUAL OVERRIDE: VD-PANNUS evaluator at line 10414+ (pattern ID_NAME) was missed by prior 2026-05-04 |
| GAP-VHD-099 | 914 | PARTIAL_DETECTION | `gap-vd-10-pregnancy-risk` (VD-10 @5621-5642) | line 5428+ broad pregnancy + valve risk rule; no LMWH dose-protocol logic \| auto-verify: preserved-f |

---

## 6. Implementation notes

### 6.1 — EXTRA rules detail

See §4.6 for EXTRA rules + architectural patterns.

### 6.2 — BSW ROI pathway implications

No T1 SPEC_ONLY gaps carry literal BSW pathway tags in CK v4.0 spec text. Pathway analysis is in the §11.5 sequencing notes (hand-authored) and the cross-module synthesis document.

### 6.3 — Strategic posture

*Strategic posture not yet authored. Set `strategicPosture` field in `VHD.crosswalk.json` to populate this section.*

---

## 7. Working hypothesis verdict

**For VHD:** Light implementation coverage; significant v2.0 Phase 1 build work required.

Coverage data: 21/105 any-coverage (20.0%); 5/105 DET_OK only (4.8%); 16 PARTIAL via broad-rule consolidation or partial-trigger match; 84 SPEC_ONLY.

Rules-per-DET_OK efficiency: 32 registry rules / 5 DET_OK = 6.40.

---

## 8. Implications for v2.0

v2.0 Phase 1 (T1 priority) work items for VHD:
- **4 T1 SPEC_ONLY** gaps requiring full build (detection + UI + tests)
- **3 T1 PARTIAL** gaps requiring hardening (broad-rule discrimination, missing exclusions, dose-protocol specificity)
- **1 T1 DET_OK** gaps requiring test coverage + UI polish to reach PRODUCTION_GRADE

Cross-module satisfaction (HF Device Therapy → EP CRT/ICD pattern; CAD-027 → PV; etc.) is captured structurally in `ruleBodyCite.evaluatorModule` per AUDIT_METHODOLOGY.md §2.1.C.

---

## 9. Module-specific findings

### Manual classification overrides (13)

Rows where the auto-classifier was wrong and the audit author corrected the classification with explicit reasoning:

- **GAP-VHD-010** (T2, DET_OK, `gap-vd-2-bioprosthetic-echo` (VD-2)): MANUAL OVERRIDE per VHD addendum §5 (Bioprosthetic Valve subcategory): bioprosthetic valve annual echo surveillance covered by gap-vd-2-bioprosthetic-echo evaluator at line 4952+. Auto-classifier missed because spec uses "Bioprosthetic Valve Surveillance" and evaluator block name is "VD-2" (numeric pattern) — token-similarity heuristic insufficient.
- **GAP-VHD-011** (T2, PARTIAL_DETECTION, `gap-vd-11-bioprosthetic-degeneration` (VD-11)): MANUAL OVERRIDE per VHD addendum §4.6(c): broad-rule consolidation. gap-vd-11-bioprosthetic-degeneration consolidates VHD-011 + VHD-016 + VHD-017. Per §3.2.1 broad-rule rule, each gap classifies as PARTIAL_DETECTION because spec wants gap-specific discrimination the broad rule does not carry. Auto-classifier missed because vocabulary mismatch (spec "structural valve deterioration" vs evaluator "Bioprosthetic Valve Degeneration Watch").
- **GAP-VHD-016** (T2, PARTIAL_DETECTION, `gap-vd-11-bioprosthetic-degeneration` (VD-11)): MANUAL OVERRIDE per VHD addendum §4.6(c): broad-rule consolidation via gap-vd-11-bioprosthetic-degeneration (also covers VHD-011, VHD-017). PARTIAL per §3.2.1. Auto-classifier vocabulary mismatch.
- **GAP-VHD-017** (T2, PARTIAL_DETECTION, `gap-vd-11-bioprosthetic-degeneration` (VD-11)): MANUAL OVERRIDE per VHD addendum §4.6(c): broad-rule consolidation via gap-vd-11-bioprosthetic-degeneration (also covers VHD-011, VHD-016). PARTIAL per §3.2.1. Auto-classifier vocabulary mismatch.
- **GAP-VHD-024** (T2, PARTIAL_DETECTION, `gap-sh-2-tavr-eval` (SH-2) cross-module to SH): MANUAL OVERRIDE per VHD addendum §4.6(b): cross-module satisfaction. gap-sh-2-tavr-eval (registered to SH module, line 4923+) provides VHD-024 partial coverage (severe AS AVR vs TAVR). Auto-classifier picked SH-ROSS as cross-module match instead — vocabulary collision on "AS" tokens. Architectural fragility documented at AUDIT-027 expanded scope.
- **GAP-VHD-063** (T2, DET_OK, `gap-vd-14-dental-prophylaxis` (VD-14)): MANUAL OVERRIDE per VHD addendum §5 (IE Prophylaxis subcategory): dental prophylaxis covered by gap-vd-14-dental-prophylaxis evaluator at line 6332+. Auto-classifier missed because spec text uses "infective endocarditis prophylaxis dental procedure" and evaluator name is "VD-14" (numeric pattern).
- **GAP-VHD-068** (T1, PARTIAL_DETECTION, `gap-vd-prosthetic-pannus` (VD-PANNUS)): MANUAL OVERRIDE: VD-PANNUS evaluator at line 10414+ (pattern ID_NAME) was missed by prior 2026-05-04 single-pattern audit (cited as registry-only) AND by auto-classifier (no token overlap with "gradient rise"). Multi-pattern extraction in Phase 2 surfaced VD-PANNUS evaluator with body covering symptomatic prosthetic valve dysfunction. Spec-VHD-068 wants gradient-rise specifically (>=50% from baseline); evaluator covers symptom-driven detection. PARTIAL per §3.2.1 (broad-rule lacks discrimination). UPGRADES from prior SPEC_ONLY classification — Tier S triage queue inclusion may revise.
- **GAP-VHD-077** (T2, PARTIAL_DETECTION, `gap-vd-12-af-valve-anticoag` (VD-12)): MANUAL OVERRIDE per VHD addendum §4.6(c): gap-vd-12-af-valve-anticoag covers AF + valve disease anticoagulation; partial coverage of VHD-077. PARTIAL because broad rule fires for AF+valve combination but spec-VHD-077 wants discrimination.
- **GAP-VHD-080** (T2, DET_OK, `gap-vd-8-rheumatic-screen` (VD-8)): MANUAL OVERRIDE per VHD addendum §5 (Rheumatic subcategory): screening covered by gap-vd-8-rheumatic-screen evaluator at line 5371+. Auto-classifier missed (numeric pattern naming).
- **GAP-VHD-098** (T2, PARTIAL_DETECTION, `gap-vd-10-pregnancy-risk` (VD-10)): MANUAL OVERRIDE per VHD addendum §4.6(c): broad-rule consolidation. gap-vd-10-pregnancy-risk consolidates VHD-098 + VHD-099 + VHD-100 + VHD-101. PARTIAL per §3.2.1.
- **GAP-VHD-100** (T2, PARTIAL_DETECTION, `gap-vd-10-pregnancy-risk` (VD-10)): MANUAL OVERRIDE per VHD addendum §4.6(c): broad-rule consolidation via gap-vd-10-pregnancy-risk (also covers VHD-098, VHD-099, VHD-101). PARTIAL per §3.2.1.
- **GAP-VHD-101** (T2, PARTIAL_DETECTION, `gap-vd-10-pregnancy-risk` (VD-10)): MANUAL OVERRIDE per VHD addendum §4.6(c): broad-rule consolidation via gap-vd-10-pregnancy-risk (also covers VHD-098, VHD-099, VHD-100). PARTIAL per §3.2.1.
- **GAP-VHD-103** (T2, DET_OK, `gap-vd-5-aortic-regurgitation` (VD-5)): MANUAL OVERRIDE per VHD addendum §5 (Valve Progression / Mixed subcategory): AR surveillance covered by gap-vd-5-aortic-regurgitation evaluator at line 5282+. Auto-classifier missed (numeric naming pattern).


---

## 10. Cross-references

- `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.5 — spec source
- `backend/src/ingestion/gaps/gapRuleEngine.ts` — code source
- `docs/audit/canonical/VHD.crosswalk.json` — canonical crosswalk
- `docs/audit/canonical/VHD.spec.json` — canonical spec extract
- `docs/audit/canonical/VHD.code.json` — canonical code extract
- `docs/audit/canonical/VHD.reconciliation.json` — canonical reconciliation
- `docs/audit/AUDIT_METHODOLOGY.md` — canonical audit methodology contract
- `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` — cross-module synthesis
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` — findings register

---

## 11. Cross-module synthesis (per-module slice)

1 cross-module satisfaction case(s) where VHD spec gap is satisfied by an evaluator owned by another module:

| Spec gap | Tier | Class | Owning module | Evaluator block |
|---|---|---|---|---|
| GAP-VHD-024 | T2 | PARTIAL_DETECTION | SH | `SH-2` |

### 11.5 — Sequencing notes

*Sequencing notes not yet authored. Set `sequencingNotes` field in `VHD.crosswalk.json` to populate.*

---

## 12. Lessons learned

*Lessons learned not yet authored. Set `lessonsLearned` field in `VHD.crosswalk.json` to populate.*

---

## 13. Wall-clock empirical entry

Audit method: `rule-body-citation-AUDIT-030D`. Audit date: 2026-05-04.

Per-module wall-clock data lives in `docs/audit/canonical/audit_runs.jsonl` (append-only). Aggregate empirical floor table maintained in AUDIT_METHODOLOGY.md §7.2.

---

## 14. Audit verdict

**VHD module: NEAR-EMPTY.**

- 5 DET_OK (4.8%), 16 PARTIAL (15.2%), 84 SPEC_ONLY (80.0%)
- 1/8 T1 priority gaps DET_OK; 4 T1 SPEC_ONLY gaps require v2.0 Phase 1 work
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

This addendum is a **generated artifact** rendered from canonical inputs by `backend/scripts/auditCanonical/renderAddendum.ts`. Hand-editing this markdown is rejected by CI; edit `VHD.crosswalk.json` (hand-authored fields: `strategicPosture`, `sequencingNotes`, `lessonsLearned`) and re-render.

*Generated from `docs/audit/canonical/VHD.crosswalk.json`.*
