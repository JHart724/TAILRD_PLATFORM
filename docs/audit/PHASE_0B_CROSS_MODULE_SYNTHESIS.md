# Phase 0B Cross-Module Synthesis — generated from canonical crosswalks

Aggregate audit findings across all 6 active modules (HF, EP, SH, CAD, VHD, PV). Generated from `docs/audit/canonical/<MODULE>.crosswalk.json` files. See per-module addenda (`PHASE_0B_<MODULE>_AUDIT_ADDENDUM.md`) for module-specific detail.

**Source of truth:** canonical crosswalks. Hand-editing this document is rejected by CI; edit crosswalk JSON and re-run `renderSynthesis.ts`.

---

## 1. Coverage overview

| Module | Spec gaps | DET_OK | PARTIAL | SPEC_ONLY | Any-coverage | DET_OK rate |
|---|---:|---:|---:|---:|---:|---:|
| HF | 126 | 22 | 43 | 61 | 65/126 (51.6%) | 17.5% |
| EP | 89 | 20 | 26 | 43 | 46/89 (51.7%) | 22.5% |
| SH | 88 | 9 | 23 | 56 | 32/88 (36.4%) | 10.2% |
| CAD | 90 | 29 | 27 | 34 | 56/90 (62.2%) | 32.2% |
| VHD | 105 | 5 | 16 | 84 | 21/105 (20.0%) | 4.8% |
| PV | 105 | 16 | 14 | 75 | 30/105 (28.6%) | 15.2% |
| **TOTAL** | **603** | **101** | **149** | **353** | **250/603 (41.5%)** | **16.7%** |

---

## 2. Tier distribution

| Module | T1 total | T1 DET_OK | T1 PARTIAL | T1 SPEC_ONLY | T1 any-coverage |
|---|---:|---:|---:|---:|---:|
| HF | 29 | 8 | 14 | 7 | 75.9% |
| EP | 15 | 7 | 4 | 4 | 73.3% |
| SH | 13 | 2 | 6 | 5 | 61.5% |
| CAD | 18 | 8 | 4 | 6 | 66.7% |
| VHD | 8 | 1 | 3 | 4 | 50.0% |
| PV | 7 | 1 | 2 | 4 | 42.9% |

---

## 3. Tier S triage queue

Per AUDIT_METHODOLOGY.md §6.3, Tier S inclusion requires ALL THREE: (SAFETY-relevant) AND (T1) AND (uncovered). Spec-explicit auto-include; structurally-inferred require operator decision.

### 3.1 Spec-explicit SAFETY uncovered T1 (1 — automatic Tier S)

| Spec gap | Module | Spec line | Class | SAFETY tag | Detection logic (excerpt) |
|---|---|---:|---|---|---|
| **GAP-EP-079** | EP | 352 | SPEC_ONLY | `(CRITICAL)` | WPW + AF on beta-blocker/CCB/digoxin - risk of VF |

### 3.2 Structurally-inferred SAFETY (0 — operator decision required)

None.

---

## 4. Cross-module satisfaction patterns

18 cross-module satisfaction case(s) where a spec gap in module X is satisfied by an evaluator owned by module Y.

### Pattern summary

| Spec module | Owns evaluator | Count | Example gaps |
|---|---|---:|---|
| CAD | PV | 1 | GAP-CAD-027 |
| EP | CAD | 1 | GAP-EP-028 |
| EP | VHD | 2 | GAP-EP-007, GAP-EP-008 |
| HF | CAD | 1 | GAP-HF-072 |
| HF | EP | 8 | GAP-HF-021, GAP-HF-024, GAP-HF-025, GAP-HF-026, ... |
| SH | CAD | 2 | GAP-SH-048, GAP-SH-052 |
| SH | EP | 1 | GAP-SH-060 |
| SH | VHD | 1 | GAP-SH-020 |
| VHD | SH | 1 | GAP-VHD-024 |

### Detail

| Spec gap | Tier | Class | From module | Owning evaluator block | To module |
|---|---|---|---|---|---|
| GAP-HF-021 | T1 | PARTIAL_DETECTION | HF | `EP-DEVICE-CRT` | EP |
| GAP-HF-024 | T1 | PARTIAL_DETECTION | HF | `EP-DEVICE-ICD` | EP |
| GAP-HF-025 | T1 | PARTIAL_DETECTION | HF | `EP-DEVICE-ICD` | EP |
| GAP-HF-026 | T1 | PARTIAL_DETECTION | HF | `EP-SECONDARY-ICD` | EP |
| GAP-HF-022 | T2 | PARTIAL_DETECTION | HF | `EP-DEVICE-CRT` | EP |
| GAP-HF-023 | T2 | PARTIAL_DETECTION | HF | `EP-DEVICE-CRT` | EP |
| GAP-HF-072 | T3 | PARTIAL_DETECTION | HF | `CAD-TAKOTSUBO` | CAD |
| GAP-HF-078 | T2 | PARTIAL_DETECTION | HF | `EP-EARLY-RHYTHM` | EP |
| GAP-HF-085 | T2 | PARTIAL_DETECTION | HF | `EP-INAPPROPRIATE-SHOCKS` | EP |
| GAP-EP-007 | T1 | DET_OK | EP | `VD-6` | VHD |
| GAP-EP-008 | T1 | PARTIAL_DETECTION | EP | `VD-4` | VHD |
| GAP-EP-028 | T2 | PARTIAL_DETECTION | EP | `CAD-BETA-BLOCKER` | CAD |
| GAP-SH-048 | T2 | PARTIAL_DETECTION | SH | `CAD-COMPLETE-REVASC` | CAD |
| GAP-SH-052 | T2 | PARTIAL_DETECTION | SH | `CAD-BETA-BLOCKER` | CAD |
| GAP-SH-060 | T2 | PARTIAL_DETECTION | SH | `EP-REMOTE-MONITORING` | EP |
| GAP-SH-020 | T2 | PARTIAL_DETECTION | SH | `VD-4` | VHD |
| GAP-CAD-027 | T2 | PARTIAL_DETECTION | CAD | `PV-RIVAROXABAN` | PV |
| GAP-VHD-024 | T2 | PARTIAL_DETECTION | VHD | `SH-2` | SH |

---

## 5. Procedural-Pathway-1 blind spot analysis

Subcategories with 0% any-coverage indicate entire procedural surfaces missing implementation:

| Module | Subcategory | Gaps | DET_OK | PARTIAL | SPEC_ONLY |
|---|---|---:|---:|---:|---:|
| HF | Pericardial Disease | 5 | 0 | 0 | 5 |
| HF | LVAD/Transplant | 9 | 0 | 0 | 9 |
| HF | ECMO/MCS | 3 | 0 | 0 | 3 |
| HF | Genetics | 3 | 0 | 0 | 3 |
| EP | Cardiac Arrest | 4 | 0 | 0 | 4 |
| SH | Aortic Disease | 9 | 0 | 0 | 9 |
| SH | Pulmonary HTN | 5 | 0 | 0 | 5 |
| SH | Pulmonary Embolism | 5 | 0 | 0 | 5 |
| SH | Cardiac Masses | 2 | 0 | 0 | 2 |
| CAD | Complex PCI | 4 | 0 | 0 | 4 |
| CAD | Stent Complications | 3 | 0 | 0 | 3 |
| CAD | Cardiogenic Shock | 6 | 0 | 0 | 6 |
| VHD | Prosthesis Selection | 6 | 0 | 0 | 6 |
| VHD | Surgical MVR | 7 | 0 | 0 | 7 |
| VHD | IE General | 8 | 0 | 0 | 8 |
| VHD | IE Pathogens | 7 | 0 | 0 | 7 |
| VHD | IE Surgical | 6 | 0 | 0 | 6 |
| VHD | Drug-Induced | 4 | 0 | 0 | 4 |
| PV | Vasculitis | 6 | 0 | 0 | 6 |
| PV | CTEPH | 4 | 0 | 0 | 4 |
| PV | PAH | 6 | 0 | 0 | 6 |
| PV | AVM | 3 | 0 | 0 | 3 |
| PV | Vascular Access | 3 | 0 | 0 | 3 |

**Total: 23 subcategories with 0% any-coverage across 6 modules.**

---

## 6. BSW pathway-tagged gap distribution

No spec gaps carry literal BSW pathway tags. Pathway analysis lives in per-module §6.2 sections.

---

## 7. Methodology + provenance

Generated by `backend/scripts/auditCanonical/renderSynthesis.ts` from canonical crosswalks. Methodology per `docs/audit/AUDIT_METHODOLOGY.md` v1.0.

*Hand-editing this document is rejected by CI. Update crosswalk JSON files and re-run the renderer.*
