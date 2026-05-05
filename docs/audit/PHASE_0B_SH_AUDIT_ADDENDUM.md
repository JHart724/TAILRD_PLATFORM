# Phase 0B SH Audit Addendum — generated from canonical crosswalk

**Module:** Structural Heart (SH)
**Spec source:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.3
**Code source:** `backend/src/ingestion/gaps/gapRuleEngine.ts` (registry=25, evaluator=25, gapsPush=25)
**Crosswalk:** `docs/audit/canonical/SH.crosswalk.json` (auditMethod: rule-body-citation-AUDIT-030D)
**Audit date:** 2026-05-04

## 1. Summary

Structural Heart has **88 spec gaps** across 14 subcategories. Implementation: **9 DET_OK + 23 PARTIAL + 56 SPEC_ONLY** (any-coverage: 32/88 = 36.4%).

**Tier 1 priority status:** 2 DET_OK + 6 PARTIAL + 5 SPEC_ONLY of 13 T1 gaps (T1 any-coverage: 61.5%).

**Spec-explicit SAFETY-tagged gaps:** 0.

---

## 2. Coverage by classification

| Classification | Count | % of total |
|---|---:|---:|
| PRODUCTION_GRADE | 0 | 0.0% |
| DET_OK | 9 | 10.2% |
| PARTIAL_DETECTION | 23 | 26.1% |
| SPEC_ONLY | 56 | 63.6% |
| **Total** | **88** | **100.0%** |

**PRODUCTION_GRADE = 0** is platform-wide; gated on closure of AUDIT-001 P0 (test coverage gap). Per AUDIT_METHODOLOGY.md §3.1, no rule classifies PRODUCTION_GRADE until the platform testing baseline is established.

---

## 3. Coverage by tier

| Tier | Total | DET_OK | PARTIAL | SPEC_ONLY | Any-coverage % |
|------|------:|-------:|--------:|----------:|---------------:|
| **T1** | 13 | 2 | 6 | 5 | 61.5% |
| **T2** | 58 | 5 | 12 | 41 | 29.3% |
| **T3** | 17 | 2 | 5 | 10 | 41.2% |
| **Overall** | **88** | **9** | **23** | **56** | **36.4%** |

---

## 4. Per-subcategory breakdown

| Subcategory | T1/T2/T3 | DET_OK | PARTIAL | SPEC_ONLY | Coverage |
|---|---|---:|---:|---:|---:|
| Aortic Stenosis (10) | 4/6/0 | 0 | 6 | 4 | 60.0% |
| BAV/Aortopathy (9) | 0/5/4 | 1 | 2 | 6 | 33.3% |
| TAVR Post-op (9) | 1/7/1 | 3 | 2 | 4 | 55.6% |
| Mitral Regurg (10) | 4/6/0 | 1 | 3 | 6 | 40.0% |
| Mitral Stenosis (4) | 0/4/0 | 0 | 1 | 3 | 25.0% |
| Tricuspid (6) | 1/3/2 | 1 | 3 | 2 | 66.7% |
| Aortic Disease (9) | 1/4/4 | 0 | 0 | 9 | 0.0% |
| PFO/ASD (6) | 0/5/1 | 2 | 1 | 3 | 50.0% |
| Pulmonary HTN (5) | 0/4/1 | 0 | 0 | 5 | 0.0% |
| Pulmonary Embolism (5) | 2/3/0 | 0 | 0 | 5 | 0.0% |
| Infective Endocarditis (3) | 0/3/0 | 0 | 1 | 2 | 33.3% |
| ACHD (8) | 0/6/2 | 0 | 3 | 5 | 37.5% |
| Cardiac Masses (2) | 0/0/2 | 0 | 0 | 2 | 0.0% |
| HCM Interventions (2) | 0/2/0 | 1 | 1 | 0 | 100.0% |

---

## 4.5 — T1 SPEC_ONLY work items (load-bearing for v2.0 Phase 1)

5 T1 spec gaps with zero implementation. These are the load-bearing v2.0 Phase 1 work items for Structural Heart.

| GAP-ID | Spec line | Subcategory | Detection Logic (excerpt) | Spec SAFETY | BSW pathway |
|---|---:|---|---|---|---|
| GAP-SH-003 | 447 | Aortic Stenosis | LVEF<50 + AVA<1.0 + MG<40 without DSE | — | — |
| GAP-SH-019 | 488 | Mitral Regurg | FMR mod-severe + HF symptoms without heart team review | — | — |
| GAP-SH-075 | 517 | Aortic Disease | Type B dissection + malperfusion/expansion without TEVAR eval | — | — |
| GAP-SH-090 | 549 | Pulmonary Embolism | Submassive PE (RV strain or troponin elevation) without CDT discussion | — | — |
| GAP-SH-091 | 550 | Pulmonary Embolism | Massive PE (hemodynamic instability) without systemic lysis, surgical embolectom... | — | — |

---

## 4.6 — EXTRA rules + architectural patterns

No EXTRA rules or architectural patterns surfaced. Reconciliation is clean.

---

## 5. Tier 1 priority gaps surfaced

| GAP-ID | Spec line | Class | Rule body cite | Notes |
|---|---:|---|---|---|
| GAP-SH-001 | 445 | PARTIAL_DETECTION | `gap-sh-2-tavr-eval` (SH-2 @5102-5123) | line 4923+ (covers severe AS+age>=65; no asymptomatic-specific check, no Vmax/MG/AVA severity gradin |
| GAP-SH-002 | 446 | PARTIAL_DETECTION | `gap-sh-2-tavr-eval` (SH-2 @5102-5123) | (broad TAVR rule) \| auto-verify: preserved-from-addendum |
| GAP-SH-003 | 447 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-SH-006 | 448 | PARTIAL_DETECTION | `gap-sh-2-tavr-eval` (SH-2 @5102-5123) | (broad) \| auto-verify: preserved-from-addendum |
| GAP-SH-061 | 472 | DET_OK | `gap-sh-valve-in-valve` (SH-VALVE-IN-VALVE @10455-10477) | line 10214+ \| auto-verify: preserved-from-addendum |
| GAP-SH-014 | 485 | PARTIAL_DETECTION | `gap-sh-3-mitral-intervention` (SH-3 @5169-5194) | line 4988+ +  line 6059+ \| Multiple registry ids cited: gap-sh-3-mitral-intervention, gap-sh-10-mitr |
| GAP-SH-015 | 486 | PARTIAL_DETECTION | `gap-sh-3-mitral-intervention` (SH-3 @5169-5194) | (broad) \| auto-verify: preserved-from-addendum |
| GAP-SH-018 | 487 | PARTIAL_DETECTION | `gap-sh-10-mitraclip` (SH-10 @6242-6261) | (broad MR + LVEF<50) \| auto-verify: preserved-from-addendum |
| GAP-SH-019 | 488 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-SH-022 | 507 | DET_OK | `gap-sh-4-tricuspid-assessment` (SH-4 @5203-5229) | line 5022+ +  line 6116+ \| Multiple registry ids cited: gap-sh-4-tricuspid-assessment, gap-sh-12-ttv |
| GAP-SH-075 | 517 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-SH-090 | 549 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-SH-091 | 550 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |

---

## 6. Implementation notes

### 6.1 — EXTRA rules detail

See §4.6 for EXTRA rules + architectural patterns.

### 6.2 — BSW ROI pathway implications

No T1 SPEC_ONLY gaps carry literal BSW pathway tags in CK v4.0 spec text. Pathway analysis is in the §11.5 sequencing notes (hand-authored) and the cross-module synthesis document.

### 6.3 — Strategic posture

*Strategic posture not yet authored. Set `strategicPosture` field in `SH.crosswalk.json` to populate this section.*

---

## 7. Working hypothesis verdict

**For SH:** Light implementation coverage; significant v2.0 Phase 1 build work required.

Coverage data: 32/88 any-coverage (36.4%); 9/88 DET_OK only (10.2%); 23 PARTIAL via broad-rule consolidation or partial-trigger match; 56 SPEC_ONLY.

Rules-per-DET_OK efficiency: 25 registry rules / 9 DET_OK = 2.78.

---

## 8. Implications for v2.0

v2.0 Phase 1 (T1 priority) work items for SH:
- **5 T1 SPEC_ONLY** gaps requiring full build (detection + UI + tests)
- **6 T1 PARTIAL** gaps requiring hardening (broad-rule discrimination, missing exclusions, dose-protocol specificity)
- **2 T1 DET_OK** gaps requiring test coverage + UI polish to reach PRODUCTION_GRADE

Cross-module satisfaction (HF Device Therapy → EP CRT/ICD pattern; CAD-027 → PV; etc.) is captured structurally in `ruleBodyCite.evaluatorModule` per AUDIT_METHODOLOGY.md §2.1.C.

---

## 9. Module-specific findings

No manual classification overrides for this module.


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

4 cross-module satisfaction case(s) where SH spec gap is satisfied by an evaluator owned by another module:

| Spec gap | Tier | Class | Owning module | Evaluator block |
|---|---|---|---|---|
| GAP-SH-048 | T2 | PARTIAL_DETECTION | CAD | `CAD-COMPLETE-REVASC` |
| GAP-SH-052 | T2 | PARTIAL_DETECTION | CAD | `CAD-BETA-BLOCKER` |
| GAP-SH-060 | T2 | PARTIAL_DETECTION | EP | `EP-REMOTE-MONITORING` |
| GAP-SH-020 | T2 | PARTIAL_DETECTION | VHD | `VD-4` |

### 11.5 — Sequencing notes

*Sequencing notes not yet authored. Set `sequencingNotes` field in `SH.crosswalk.json` to populate.*

---

## 12. Lessons learned

*Lessons learned not yet authored. Set `lessonsLearned` field in `SH.crosswalk.json` to populate.*

---

## 13. Wall-clock empirical entry

Audit method: `rule-body-citation-AUDIT-030D`. Audit date: 2026-05-04.

Per-module wall-clock data lives in `docs/audit/canonical/audit_runs.jsonl` (append-only). Aggregate empirical floor table maintained in AUDIT_METHODOLOGY.md §7.2.

---

## 14. Audit verdict

**SH module: LIGHTLY BUILT.**

- 9 DET_OK (10.2%), 23 PARTIAL (26.1%), 56 SPEC_ONLY (63.6%)
- 2/13 T1 priority gaps DET_OK; 5 T1 SPEC_ONLY gaps require v2.0 Phase 1 work
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

This addendum is a **generated artifact** rendered from canonical inputs by `backend/scripts/auditCanonical/renderAddendum.ts`. Hand-editing this markdown is rejected by CI; edit `SH.crosswalk.json` (hand-authored fields: `strategicPosture`, `sequencingNotes`, `lessonsLearned`) and re-render.

*Generated from `docs/audit/canonical/SH.crosswalk.json`.*
