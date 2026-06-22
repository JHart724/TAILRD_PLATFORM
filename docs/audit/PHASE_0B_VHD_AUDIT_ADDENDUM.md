# Phase 0B VHD Audit Addendum — generated from canonical crosswalk

**Module:** Valvular Heart Disease (VHD)
**Spec source:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.5
**Code source:** `backend/src/ingestion/gaps/gapRuleEngine.ts` (registry=51, evaluator=50, gapsPush=51)
**Crosswalk:** `docs/audit/canonical/VHD.crosswalk.json` (auditMethod: rule-body-citation-AUDIT-030D)
**Audit date:** 2026-06-10

## 1. Summary

Valvular Heart Disease has **105 spec gaps** across 18 subcategories. Implementation: **15 DET_OK + 12 PARTIAL + 78 SPEC_ONLY** (any-coverage: 27/105 = 25.7%).

**Tier 1 priority status:** 2 DET_OK + 3 PARTIAL + 3 SPEC_ONLY of 8 T1 gaps (T1 any-coverage: 62.5%).

**Spec-explicit SAFETY-tagged gaps:** 1 total; 0 covered (DET_OK), 1 uncovered. Uncovered SAFETY gaps qualify for Tier S triage queue per §6.3.

---

## 2. Coverage by classification

| Classification | Count | % of total |
|---|---:|---:|
| PRODUCTION_GRADE | 0 | 0.0% |
| DET_OK | 15 | 14.3% |
| PARTIAL_DETECTION | 12 | 11.4% |
| SPEC_ONLY | 78 | 74.3% |
| **Total** | **105** | **100.0%** |

**PRODUCTION_GRADE = 0** is platform-wide; gated on closure of AUDIT-001 P0 (test coverage gap). Per AUDIT_METHODOLOGY.md §3.1, no rule classifies PRODUCTION_GRADE until the platform testing baseline is established.

---

## 3. Coverage by tier

| Tier | Total | DET_OK | PARTIAL | SPEC_ONLY | Any-coverage % |
|------|------:|-------:|--------:|----------:|---------------:|
| **T1** | 8 | 2 | 3 | 3 | 62.5% |
| **T2** | 72 | 8 | 7 | 57 | 20.8% |
| **T3** | 25 | 5 | 2 | 18 | 28.0% |
| **Overall** | **105** | **15** | **12** | **78** | **25.7%** |

---

## 4. Per-subcategory breakdown

| Subcategory | T1/T2/T3 | DET_OK | PARTIAL | SPEC_ONLY | Coverage |
|---|---|---:|---:|---:|---:|
| Mechanical Valve (9) | 2/7/0 | 2 | 1 | 6 | 33.3% |
| Bioprosthetic Valve (8) | 0/8/0 | 0 | 2 | 6 | 25.0% |
| Prosthesis Selection (6) | 0/5/1 | 0 | 0 | 6 | 0.0% |
| Surgical AVR (6) | 0/5/1 | 0 | 1 | 5 | 16.7% |
| Surgical MVR (7) | 0/5/2 | 0 | 0 | 7 | 0.0% |
| Concomitant Procedures (5) | 0/5/0 | 0 | 1 | 4 | 20.0% |
| IE General (8) | 0/8/0 | 0 | 0 | 8 | 0.0% |
| IE Pathogens (7) | 1/6/0 | 0 | 0 | 7 | 0.0% |
| IE Surgical (6) | 3/3/0 | 2 | 1 | 3 | 50.0% |
| IE Prophylaxis (5) | 0/5/0 | 1 | 1 | 3 | 40.0% |
| PVT (5) | 1/4/0 | 0 | 1 | 4 | 20.0% |
| Post-op Surveillance (6) | 0/2/4 | 0 | 1 | 5 | 16.7% |
| Rheumatic (6) | 0/5/1 | 2 | 0 | 4 | 33.3% |
| Carcinoid (6) | 0/0/6 | 0 | 0 | 6 | 0.0% |
| Drug-Induced (4) | 0/0/4 | 2 | 0 | 2 | 50.0% |
| Radiation (3) | 0/0/3 | 0 | 2 | 1 | 66.7% |
| Pregnancy (4) | 1/3/0 | 2 | 1 | 1 | 75.0% |
| Valve Progression (4) | 0/1/3 | 4 | 0 | 0 | 100.0% |

---

## 4.5 — T1 SPEC_ONLY work items (load-bearing for v2.0 Phase 1)

3 T1 spec gaps with zero implementation. These are the load-bearing v2.0 Phase 1 work items for Valvular Heart Disease.

| GAP-ID | Spec line | Subcategory | Detection Logic (excerpt) | Spec SAFETY | BSW pathway |
|---|---:|---|---|---|---|
| GAP-VHD-050 | 830 | IE Pathogens | aureus bacteremia: TEE indication adherence. S. aureus BSI (any) without TEE per... | — | — |
| GAP-VHD-058 | 842 | IE Surgical | IE + abscess on echo without surgical referral | — | — |
| GAP-VHD-061 | 843 | IE Surgical | PVE + dehiscence/fistula without surgical referral | — | — |

---

## 4.6 — EXTRA rules + architectural patterns

**Registry-without-evaluator (1):** registry entries with no matching evaluator block body.

- `gap-vd-5-aortic-regurgitation` (registry line 1567): No evaluator body matched via similarity scoring

**Naming convention mismatches (19):** registry IDs not following `gap-vd-` convention.

- `gap-vhd-103-severe-ar-surgical` (line 4124): expected prefix `gap-vd-`, got `gap-vhd-`
- `gap-vhd-060-ie-large-vegetation` (line 4131): expected prefix `gap-vd-`, got `gap-vhd-`
- `gap-vhd-100-mech-valve-pregnancy-antixa` (line 4138): expected prefix `gap-vd-`, got `gap-vhd-`
- `gap-vhd-102-ar-surveillance` (line 4145): expected prefix `gap-vd-`, got `gap-vhd-`
- `gap-vhd-104-mixed-valve-staging` (line 4152): expected prefix `gap-vd-`, got `gap-vhd-`
- `gap-vhd-105-mr-quant-triangulation` (line 4159): expected prefix `gap-vd-`, got `gap-vhd-`
- `gap-vhd-068-mech-pvt-gradient` (line 4167): expected prefix `gap-vd-`, got `gap-vhd-`
- `gap-vhd-011-bio-svd-gradient` (line 4174): expected prefix `gap-vd-`, got `gap-vhd-`
- `gap-vhd-001-subtherapeutic-inr` (line 4182): expected prefix `gap-vd-`, got `gap-vhd-`
- `gap-vhd-006-mech-asa-adjunct` (line 4189): expected prefix `gap-vd-`, got `gap-vhd-`
- `gap-vhd-057-ie-hf-surgery` (line 4197): expected prefix `gap-vd-`, got `gap-vhd-`
- `gap-vhd-059-ie-embolic-surgery` (line 4204): expected prefix `gap-vd-`, got `gap-vhd-`
- `gap-vhd-064-prior-ie-dental-prophylaxis` (line 4211): expected prefix `gap-vd-`, got `gap-vhd-`
- `gap-vhd-079-rheumatic-prophylaxis` (line 4218): expected prefix `gap-vd-`, got `gap-vhd-`
- `gap-vhd-083-rheumatic-af-warfarin` (line 4225): expected prefix `gap-vd-`, got `gap-vhd-`
- `gap-vhd-098-mech-valve-preconception` (line 4233): expected prefix `gap-vd-`, got `gap-vhd-`
- `gap-vhd-099-mech-valve-pregnancy-anticoag` (line 4240): expected prefix `gap-vd-`, got `gap-vhd-`
- `gap-vhd-091-dopamine-agonist-valve-surveillance` (line 4247): expected prefix `gap-vd-`, got `gap-vhd-`
- `gap-vhd-092-ergot-alkaloid-valve-surveillance` (line 4254): expected prefix `gap-vd-`, got `gap-vhd-`


---

## 5. Tier 1 priority gaps surfaced

| GAP-ID | Spec line | Class | Rule body cite | Notes |
|---|---:|---|---|---|
| GAP-VHD-001 | 753 | DET_OK | `gap-vhd-001-subtherapeutic-inr` (VHD-001 @8467-8490) | MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 3 close, AUDIT-133 RESOLVED): SPEC_ONLY -> DET_OK. The 20 |
| GAP-VHD-005 | 754 | PARTIAL_DETECTION | `gap-vd-6-doac-mechanical-valve` (VD-6 @8891-8915) | MANUAL OVERRIDE 2026-06-10 (VHD audit): DET_OK -> PARTIAL per §16.6(i) concept-match / AUDIT-123 + § |
| GAP-VHD-050 | 830 | SPEC_ONLY | — | No S. aureus + TEE rule in evaluator. \| auto-verify: No candidate evaluator block above PARTIAL_MATC |
| GAP-VHD-057 | 841 | DET_OK | `gap-vhd-057-ie-hf-surgery` (VHD-057 @8540-8562) | MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 4 close): newly DET_OK. Purpose-built gap-vhd-057-ie-hf-s |
| GAP-VHD-058 | 842 | SPEC_ONLY | — | No IE + abscess surgical rule. \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-VHD-061 | 843 | SPEC_ONLY | — | No PVE dehiscence/fistula rule. \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-VHD-068 | 860 | PARTIAL_DETECTION | `gap-vhd-068-mech-pvt-gradient` (VHD-068 @8401-8423) | MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 2 close): RE-CITED from the broad VD-PANNUS to the purpos |
| GAP-VHD-099 | 914 | PARTIAL_DETECTION | `gap-vhd-099-mech-valve-pregnancy-anticoag` (VHD-099 @8768-8794) | MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 5 close): SPEC_ONLY -> PARTIAL. RE-CITED to the purpose-b |

---

## 6. Implementation notes

### 6.1 — EXTRA rules detail

See §4.6 for EXTRA rules + architectural patterns.

### 6.2 — BSW ROI pathway implications

No T1 SPEC_ONLY gaps carry literal BSW pathway tags in CK v4.0 spec text. Pathway analysis is in the §11.5 sequencing notes (hand-authored) and the cross-module synthesis document.

### 6.3 — Strategic posture

2026-06-10 re-audit supersedes the 2026-05-04 baseline (5/16/84 -> 0/11/94); the 2026-05-04 baseline is preserved in git history, BUILD_STATE, and the register. VHD is genuinely lightly built - 94 of 105 gaps have no implemented rule - and the baseline's apparent 20% any-coverage rested on an override layer that did not survive re-verify: 4/4 baseline DET_OK overrides failed (AUDIT-134/135/137) and the baseline's 'clean reconciliation, no EXTRA rules' claim was false (16 of 32 rules EXTRA). DET_OK fell 4.8% -> 0.0% and any-coverage 20% -> 10.5% once the 16.5 / 16.6 detection-quality checks were applied. Unlike SH (heterogeneous defects, no shared root cause), VHD has one dominant shared data-coupling class: the AUDIT-123 Z95.2/Z95.3 valve-type inversion lands across the prosthetic-valve cluster (VD-2 / VD-11 / VD-13 / VD-ANTIPLATELET-BIOPROSTHETIC) and carries a CRITICAL-rule safety vector through VD-6 (DOAC + mechanical valve, compounded by the AUDIT-117 exact-RxCUI match; GAP-VHD-005 held PARTIAL on that basis). Posture: VHD needs v2.0 build-out of the 94-gap SPEC_ONLY surface, the cross-module Z95.2/Z95.3 remediation, and dedicated pregnant-mechanical-valve anticoag rules (GAP-VHD-099 Tier-S, ESCALATE-AT-DUA per AUDIT-136).

---

## 7. Working hypothesis verdict

**For VHD:** Light implementation coverage; significant v2.0 Phase 1 build work required.

Coverage data: 27/105 any-coverage (25.7%); 15/105 DET_OK only (14.3%); 12 PARTIAL via broad-rule consolidation or partial-trigger match; 78 SPEC_ONLY.

Rules-per-DET_OK efficiency: 51 registry rules / 15 DET_OK = 3.40.

---

## 8. Implications for v2.0

v2.0 Phase 1 (T1 priority) work items for VHD:
- **3 T1 SPEC_ONLY** gaps requiring full build (detection + UI + tests)
- **3 T1 PARTIAL** gaps requiring hardening (broad-rule discrimination, missing exclusions, dose-protocol specificity)
- **2 T1 DET_OK** gaps requiring test coverage + UI polish to reach PRODUCTION_GRADE

Cross-module satisfaction (HF Device Therapy → EP CRT/ICD pattern; CAD-027 → PV; etc.) is captured structurally in `ruleBodyCite.evaluatorModule` per AUDIT_METHODOLOGY.md §2.1.C.

---

## 9. Module-specific findings

### Manual classification overrides (29)

Rows where the auto-classifier was wrong and the audit author corrected the classification with explicit reasoning:

- **GAP-VHD-001** (T1, DET_OK, `gap-vhd-001-subtherapeutic-inr` (VHD-001)): MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 3 close, AUDIT-133 RESOLVED): SPEC_ONLY -> DET_OK. The 2026-06-10 disjoint-target finding (VD-3 fires on no-INR-data; the anticoag rule on no-warfarin) is resolved by the purpose-built gap-vhd-001-subtherapeutic-inr evaluator: mechanical valve (Z95.2/Z95.4) + warfarin + inr < 2.0, reading the AUDIT-170 INR slug-fix (LOINC 34714-6 -> inr). Genuinely detects the spec target. Position-specific INR target is a documented Path-B refinement, not a detection gap.
- **GAP-VHD-005** (T1, PARTIAL_DETECTION, `gap-vd-6-doac-mechanical-valve` (VD-6)): MANUAL OVERRIDE 2026-06-10 (VHD audit): DET_OK -> PARTIAL per §16.6(i) concept-match / AUDIT-123 + §16.5 / AUDIT-117. VD-6 (DOAC + mechanical valve; spec CRITICAL SAFETY; RE-ALIGN Class 3 Harm) is capped by two data-coupling defects: the AUDIT-123 Z95.2/Z95.3 valve-type inversion (cross-module class inherited from SH) and the AUDIT-117/§16.5 exact-RxCUI DOAC match with no ingredient->descendant expansion. Evaluator retained; PARTIAL until AUDIT-123 + AUDIT-117 remediated.
- **GAP-VHD-006** (T2, DET_OK, `gap-vhd-006-mech-asa-adjunct` (VHD-006)): MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 3 close): newly DET_OK. Purpose-built gap-vhd-006-mech-asa-adjunct (mechanical Z95.2/Z95.4 + warfarin + atherosclerotic disease I25/I70 + no ASA -> low-dose ASA adjunct). Genuinely detects the spec target (mechanical valve without ASA adjunct when indicated; "when indicated" = atherosclerotic disease).
- **GAP-VHD-010** (T2, SPEC_ONLY, no cite): MANUAL OVERRIDE 2026-06-10 (VHD audit): DET_OK -> SPEC_ONLY. The 2026-05-04 baseline DET_OK override (VD-2 gap-vd-2-bioprosthetic-echo) failed re-review under §16.6/§16.5 + clinical-code verification: VD-2 does not genuinely detect the VHD-010 spec target (underclaim governs). registryId dropped.
- **GAP-VHD-011** (T2, PARTIAL_DETECTION, `gap-vhd-011-bio-svd-gradient` (VHD-011)): MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 2 close): RE-CITED from the broad VD-11 to the purpose-built gap-vhd-011-bio-svd-gradient evaluator (bioprosthetic Z95.3 + elevated mean gradient -> SVD/ViV-vs-redo). Holds at PARTIAL per §16 underclaim-governs: the spec wants serial gradient rise >=10 mmHg from baseline OR new PVL; baseline-delta and PVL are not threaded, so the evaluator detects elevated absolute gradient as a proxy. Evaluator retained.
- **GAP-VHD-016** (T2, PARTIAL_DETECTION, `gap-vd-antiplatelet-bioprosthetic` (VD-ANTIPLATELET-BIOPROSTHETIC)): MANUAL OVERRIDE 2026-06-10 (VHD audit Batch 5): PARTIAL hold, RE-CITED from VD-11 (gap-vd-11-bioprosthetic-degeneration) to VD-ANTIPLATELET-BIOPROSTHETIC (gap-vd-antiplatelet-bioprosthetic). The prior VD-11 consolidation cite was imprecise; the antiplatelet-after-bioprosthetic rule is the more precise partial-coverage evaluator. PARTIAL per §3.2.1. Evaluator retained.
- **GAP-VHD-017** (T2, SPEC_ONLY, no cite): MANUAL OVERRIDE 2026-06-10 (VHD audit Batch 5, D-B5-2): PARTIAL -> SPEC_ONLY. The prior VD-11 (gap-vd-11-bioprosthetic-degeneration) consolidation cite does not genuinely detect the VHD-017 spec target (underclaim governs; coverage incidental, not the spec target). registryId dropped.
- **GAP-VHD-024** (T2, PARTIAL_DETECTION, `gap-sh-2-tavr-eval` (SH-002) cross-module to SH): MANUAL OVERRIDE 2026-06-10 (VHD audit): PARTIAL hold, cross-module. gap-sh-2-tavr-eval (SH module, SH-2) provides partial coverage of VHD-024 (severe AS AVR-vs-TAVR). PARTIAL per §3.2.1. Evaluator retained.
- **GAP-VHD-039** (T2, PARTIAL_DETECTION, `gap-vd-tricuspid-secondary` (VD-TRICUSPID-SECONDARY)): MANUAL OVERRIDE 2026-06-10 (VHD audit): PARTIAL hold. VD-TRICUSPID-SECONDARY (gap-vd-tricuspid-secondary) partially covers VHD-039; PARTIAL per §3.2.1 (broad rule lacks gap-specific discrimination). Evaluator retained.
- **GAP-VHD-057** (T1, DET_OK, `gap-vhd-057-ie-hf-surgery` (VHD-057)): MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 4 close): newly DET_OK. Purpose-built gap-vhd-057-ie-hf-surgery (acute IE I33.0 + heart failure I50 -> urgent surgery indication). Genuinely detects the dx-codable spec target (IE + new/worsening HF). Overlaps the SH-module SH-029 (lumped IE-surgery) - surfaced for operator reconciliation at the close.
- **GAP-VHD-059** (T2, PARTIAL_DETECTION, `gap-vhd-059-ie-embolic-surgery` (VHD-059)): MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 4 close): newly PARTIAL. Purpose-built gap-vhd-059-ie-embolic-surgery (IE I33.0 + embolic event I74/I63 + on anticoagulation -> surgery consideration). Holds at PARTIAL per §16 underclaim-governs: the spec axis is "recurrent embolic event on abx" (antibiotic therapy for the IE); the evaluator gates on anticoagulation presence (a narrower/different therapy axis), so an IE+embolic patient not on anticoagulation is not detected. Overlaps SH-029 - surfaced for reconciliation.
- **GAP-VHD-063** (T2, PARTIAL_DETECTION, `gap-vd-14-dental-prophylaxis` (VD-14)): MANUAL OVERRIDE 2026-06-10 (VHD audit): DET_OK -> PARTIAL. The 2026-05-04 baseline DET_OK override (VD-14 dental IE prophylaxis) over-credited fidelity; under §16.6 over-detection / §3.2.1 broad-rule review VD-14 partially covers the VHD-063 target but lacks the gap-specific discrimination the spec wants. Evaluator retained; PARTIAL.
- **GAP-VHD-064** (T2, DET_OK, `gap-vhd-064-prior-ie-dental-prophylaxis` (VHD-064)): MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 4 close): newly DET_OK. Purpose-built gap-vhd-064-prior-ie-dental-prophylaxis (prior IE I33.0/Z86.79 + dental encounter Z01.2x + no prophylaxis antibiotic -> highest-risk dental prophylaxis). Genuinely detects the spec target. Distinct from VHD-063/VD-14 (general prosthetic-valve dental prophylaxis): VHD-064 is the prior-IE-specific highest-risk condition.
- **GAP-VHD-068** (T1, PARTIAL_DETECTION, `gap-vhd-068-mech-pvt-gradient` (VHD-068)): MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 2 close): RE-CITED from the broad VD-PANNUS to the purpose-built gap-vhd-068-mech-pvt-gradient evaluator (mechanical Z95.2/Z95.4 + elevated mean gradient -> PVT workup). Holds at PARTIAL per §16 underclaim-governs: the spec wants gradient rise >=50% from baseline specifically; baseline-delta is not threaded, so the evaluator detects elevated absolute gradient as a proxy. T1. Evaluator retained.
- **GAP-VHD-077** (T2, PARTIAL_DETECTION, `gap-vd-12-af-valve-anticoag` (VD-12)): MANUAL OVERRIDE 2026-06-10 (VHD audit): PARTIAL hold. VD-12 (gap-vd-12-af-valve-anticoag) covers AF + valve-disease anticoagulation; partial coverage of VHD-077 (spec wants discrimination the broad rule lacks). PARTIAL per §3.2.1. Evaluator retained.
- **GAP-VHD-079** (T2, DET_OK, `gap-vhd-079-rheumatic-prophylaxis` (VHD-079)): MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 4 close): SPEC_ONLY -> DET_OK. The prior VD-TRICUSPID-SECONDARY miscite is replaced by the purpose-built gap-vhd-079-rheumatic-prophylaxis evaluator: rheumatic heart disease (I05-I09) + no benzathine penicillin (RxNorm 7982) -> secondary prophylaxis. Exact match to the spec target. Prophylaxis duration (age/risk-dependent) is a documented Path-B refinement.
- **GAP-VHD-080** (T2, SPEC_ONLY, no cite): MANUAL OVERRIDE 2026-06-10 (VHD audit): DET_OK -> SPEC_ONLY. The 2026-05-04 baseline DET_OK override (VD-8 gap-vd-8-rheumatic-screen) failed re-review under §16.6/§16.5 + clinical-code verification: VD-8 does not genuinely detect the VHD-080 spec target (underclaim governs). registryId dropped.
- **GAP-VHD-083** (T2, DET_OK, `gap-vhd-083-rheumatic-af-warfarin` (VHD-083)): MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 4 close): newly DET_OK. Purpose-built gap-vhd-083-rheumatic-af-warfarin (rheumatic I05-I09 + AF I48 + not on warfarin -> warfarin; DOAC-contraindicated SAFETY subgroup, switch-vs-start branch, INVICTUS). Genuinely detects the spec target. Overlaps VD-12 (GAP-VHD-077, general AF+valve OAC) + EP-008 (rheumatic-MS DOAC) - surfaced for operator reconciliation.
- **GAP-VHD-088** (T3, SPEC_ONLY, no cite): MANUAL OVERRIDE 2026-06-10 (VHD audit Batch 5, D-B5-4): PARTIAL -> SPEC_ONLY. The prior VD-PULMONARY-HTN (gap-vd-pulmonary-htn) cite is a miscite - the rule does not detect the VHD-088 spec target. Per §16.6(ii) / §1, miscite with no genuine overlap -> SPEC_ONLY; registryId dropped.
- **GAP-VHD-091** (T3, DET_OK, `gap-vhd-091-dopamine-agonist-valve-surveillance` (VHD-091)): MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 5 close): newly DET_OK. Purpose-built gap-vhd-091-dopamine-agonist-valve-surveillance (cabergoline RxNorm 47579 / pergolide 8047 -> surveillance echo). Genuinely detects the at-risk-drug spec target. Surveillance interval (exposure-duration-dependent) is a documented Path-B refinement.
- **GAP-VHD-092** (T3, DET_OK, `gap-vhd-092-ergot-alkaloid-valve-surveillance` (VHD-092)): MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 5 close): newly DET_OK. Purpose-built gap-vhd-092-ergot-alkaloid-valve-surveillance (ergotamine RxNorm 4025 / methysergide 6911 -> surveillance echo). Genuinely detects the at-risk-drug spec target. Surveillance interval (exposure-duration-dependent) is a documented Path-B refinement.
- **GAP-VHD-095** (T3, PARTIAL_DETECTION, `gap-vd-radiation-valve` (VD-RADIATION)): MANUAL OVERRIDE 2026-06-10 (VHD audit): PARTIAL hold. VD-RADIATION (gap-vd-radiation-valve) is a broad radiation-valve consolidation rule covering VHD-095 + VHD-096; PARTIAL per §3.2.1 (broad rule lacks gap-specific discrimination). Evaluator retained.
- **GAP-VHD-096** (T3, PARTIAL_DETECTION, `gap-vd-radiation-valve` (VD-RADIATION)): MANUAL OVERRIDE 2026-06-10 (VHD audit): PARTIAL hold. VD-RADIATION (gap-vd-radiation-valve) broad radiation-valve consolidation rule (also covers VHD-095); PARTIAL per §3.2.1. Evaluator retained.
- **GAP-VHD-099** (T1, PARTIAL_DETECTION, `gap-vhd-099-mech-valve-pregnancy-anticoag` (VHD-099)): MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 5 close): SPEC_ONLY -> PARTIAL. RE-CITED to the purpose-built gap-vhd-099-mech-valve-pregnancy-anticoag SAFETY_ALERT evaluator (mechanical Z95.2/Z95.4 + pregnancy O99.4x/O09/Z34/Z33.1/Z3A -> heart-team + MFM anticoagulation SAFETY, warfarin-branch teratogenicity tradeoff, do-NOT-discontinue guardrail). Holds at PARTIAL per §16 underclaim-governs: the spec wants warfarin >5mg/day dose-specificity + 1st-trimester-specific LMWH dose-transition (VHD-100 anti-Xa, VHD-101 delivery plan); warfarin dose and gestational-week precision are not threaded, so the evaluator fires the broader SAFETY referral across trimesters. Tier-S structural-safety (ESCALATE-AT-DUA) retained.
- **GAP-VHD-098** (T2, DET_OK, `gap-vhd-098-mech-valve-preconception` (VHD-098)): MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 5 close): PARTIAL -> DET_OK. RE-CITED from the broad VD-10 to the purpose-built gap-vhd-098-mech-valve-preconception evaluator (mechanical Z95.2/Z95.4 + reproductive-age female + not-pregnant -> pre-conception anticoagulation-strategy counseling). Genuinely detects the spec target (pre-conception female + mechanical valve without counseling). VD-10 remains the broader valve-disease pre-conception rule; this is the mechanical-valve-specific layer.
- **GAP-VHD-101** (T2, SPEC_ONLY, no cite): MANUAL OVERRIDE 2026-06-10 (VHD audit, AUDIT-136): PARTIAL -> SPEC_ONLY. VD-10 (gap-vd-10-pregnancy-risk) does not carry the VHD-101 near-term LMWH-restart + delivery-plan protocol; no genuine detection of the spec target. registryId dropped.
- **GAP-VHD-102** (T3, DET_OK, `gap-vhd-102-ar-surveillance` (VHD-102)): MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 1 close): newly DET_OK. Purpose-built gap-vhd-102-ar-surveillance (aortic regurgitation I35.1/I35.2 + no quantitative echo value on file -> surveillance imaging). Genuinely detects the spec target (AR without annual echo quantification).
- **GAP-VHD-104** (T3, DET_OK, `gap-vhd-104-mixed-valve-staging` (VHD-104)): MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 1 close): newly DET_OK. Purpose-built gap-vhd-104-mixed-valve-staging (>=2 of AS I35.0 / MS I34.0... / AR-MR valve lesions -> integrated multi-valve staging). Genuinely detects the spec target (combined/mixed valve disease without integrated staging).
- **GAP-VHD-105** (T3, DET_OK, `gap-vhd-105-mr-quant-triangulation` (VHD-105)): MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 1 close): newly DET_OK. Purpose-built gap-vhd-105-mr-quant-triangulation (mitral I34.0 + regurg grade 2-3 + no EROA/vena-contracta on file -> quantitative triangulation). Genuinely detects the spec target (moderate MR by color/grade only without EROA + VC triangulation).


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
| GAP-VHD-024 | T2 | PARTIAL_DETECTION | SH | `SH-002` |

### 11.5 — Sequencing notes

VHD SPEC_ONLY implementation scoping (94 of 105 gaps) and the cross-module Z95.2/Z95.3 valve-type remediation (AUDIT-123, shared with SH) are deferred to v2.0 authorship, not decided mid-audit. The audit classifies and files findings; build sequencing is a v2.0 work item. Two items carry explicit sequencing weight: GAP-VHD-099 (pregnant mechanical-valve 1st-trimester warfarin->LMWH transition) is a structurally-inferred Tier-S item with ZERO coverage, flagged ESCALATE-AT-DUA (AUDIT-136); and GAP-VHD-001 (sub-therapeutic INR, T1) requires a new INR-to-target rule class that no current rule approximates (AUDIT-133). VD-6 (DOAC + mechanical valve, CRITICAL safety rule) remediation is coupled to both the AUDIT-123 valve-code correction and the AUDIT-117 RxCUI ingredient-expansion fix.

---

## 12. Lessons learned

(a) The dominant VHD finding is baseline trust, not a new defect class: 4/4 of the 2026-05-04 baseline DET_OK overrides failed re-verify (VHD-010/080/103 -> SPEC_ONLY, VHD-063 -> PARTIAL) and the baseline's 'clean reconciliation, no EXTRA rules' claim was false (16 of 32 rules EXTRA) - the pre-16.6 baseline override layer is an untrustworthy v2.0 starting point (AUDIT-137). (b) Existence-proxy checks (labValues['lvef']/['inr'] === undefined standing in for a severity/interval gate) are a recurring DET_OK over-credit pattern (AUDIT-134, 16.6(iii) class). (c) Disjoint-trigger PARTIAL credit - the rule fires on data-ABSENT where the spec wants value-vs-target - flips to SPEC_ONLY per 16.6(ii) (AUDIT-133, GAP-VHD-001). (d) A broad rule cannot be credited for gaps its OWN exclusion criteria make it structurally unable to fire for (VD-10 EXCLUSION_PREGNANCY vs VHD-099/100/101; AUDIT-136). (e) The AUDIT-123 Z95.2/Z95.3 valve-type inversion propagated into the VHD cluster exactly as the SH audit predicted (VD-2 / VD-11 / VD-13 / VD-ANTIPLATELET-BIOPROSTHETIC), and the VD-6 DOAC-contraindication safety vector was folded into AUDIT-123 rather than minted as a new id. (f) Medication-gap rules that omit the therapy-ABSENT guard over-fire on already-treated patients (VD-14; AUDIT-135).

---

## 13. Wall-clock empirical entry

Audit method: `rule-body-citation-AUDIT-030D`. Audit date: 2026-06-10.

Per-module wall-clock data lives in `docs/audit/canonical/audit_runs.jsonl` (append-only). Aggregate empirical floor table maintained in AUDIT_METHODOLOGY.md §7.2.

---

## 14. Audit verdict

**VHD module: LIGHTLY BUILT.**

- 15 DET_OK (14.3%), 12 PARTIAL (11.4%), 78 SPEC_ONLY (74.3%)
- 2/8 T1 priority gaps DET_OK; 3 T1 SPEC_ONLY gaps require v2.0 Phase 1 work
- Audit method: `rule-body-citation-AUDIT-030D`. Generated from canonical crosswalk on 2026-06-10.

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
