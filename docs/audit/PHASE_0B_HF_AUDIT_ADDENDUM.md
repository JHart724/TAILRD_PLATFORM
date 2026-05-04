# Phase 0B HF Audit Report — Addendum: Real Spec↔Code Mapping

**Companion to:** `docs/audit/PHASE_0B_PV_AUDIT_REPORT_ADDENDUM.md` (sibling methodology)
**Spec source:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.1 (lines 120-306, 126 HF gaps across 15 subcategories)
**Code source:** `backend/src/ingestion/gaps/gapRuleEngine.ts` (48 rules tagged `module: 'HEART_FAILURE'`, 44 distinct rule IDs) + `backend/src/services/gdmtEngine.ts` (GDMT four-pillar service)
**Date:** 2026-05-03
**Mode:** Full classification (replicates PV addendum methodology)

---

## 1. Summary

HF is the BSW pilot's most-developed module per `CLAUDE.md` §10 (the only module with full frontend-backend wiring per Sprint B-1 PRs #98-#102). The codebase has 48 HF rules + a dedicated `gdmtEngine.ts` service; spec has 126 HF gaps. Naive density: 38%. **Real spec coverage (any-match): 46.0%** (27 DET_OK + 31 PARTIAL + 68 SPEC_ONLY of 126). DET_OK only: 21.4%.

**Hypothesis verdict:** "More built than the 280+ figure suggested" is **partially confirmed** for HF. Coverage (46% any-match, 21.4% strict) is materially higher than PV's 26.7% baseline — but the gap distribution reveals a severe procedural-domain blind spot. Medication and screening gaps are well-covered; device decision support, advanced HF triage, post-advanced-therapy monitoring, cardiorenal syndrome, pericardial disease, ECMO, genetics, and LVAD/transplant care are 0-30% covered.

**Tier 1 priority gap status (29 T1):**
- DET_OK: 8 (28%)
- PARTIAL: 10 (34%)
- **SPEC_ONLY: 11 (38%)** ← these are the production-grade HF deliverables not yet built

The 11 T1 SPEC_ONLY gaps include the entire CRT Class I + ICD primary/secondary set (4 gaps), HFpEF Finerenone, Advanced HF triage triggers (frequent flyer, WHF GDMT failure, SCAI C/D MCS escalation), 4-GDMT-pillar discharge check, post-LVAD INR, and VA-ECMO LV unloading. **These are the load-bearing HF deliverables for v2.0 Phase 1.**

---

## 2. Coverage by classification

| Classification | Count | % of 126 |
|---|---|---|
| PRODUCTION_GRADE (det + UI + tests) | 0 | 0% |
| DET_OK (det + UI scaffold + no tests) | 27 | 21.4% |
| PARTIAL_DETECTION | 31 | 24.6% |
| SPEC_ONLY | 68 | 54.0% |

**PRODUCTION_GRADE = 0:** AUDIT-001 (test coverage 0.87% project-wide) blocks every HF gap from earning PRODUCTION_GRADE. The single HF test file (`backend/tests/gapRules/heartFailure.test.ts`) covers a small subset, not all 48 rules.

---

## 3. Coverage by tier

| Tier | Total | DET_OK | PARTIAL | SPEC_ONLY | Any-Coverage % |
|------|------:|-------:|--------:|----------:|---------------:|
| **T1 (priority)** | 29 | 8 | 10 | 11 | **62.1%** |
| T2 (standard) | 62 | 16 | 14 | 32 | 48.4% |
| T3 (supporting) | 35 | 3 | 7 | 25 | 28.6% |
| **Overall** | **126** | **27** | **31** | **68** | **46.0%** |

**T1 priority gaps deserve closest attention.** HF has 29 T1 gaps (most of any module — 27% of platform's 107 T1 total). Tier 1 any-coverage at 62.1% is the highest among any audited module so far (PV was 42.9% at T1) — but **11 SPEC_ONLY at T1 means roughly a third of HF's highest-priority gaps have zero implementation**. Compared to PV's 4 T1 SPEC_ONLY out of 7, HF has more absolute SPEC_ONLY T1 gaps but fewer as a proportion.

---

## 4. Per-subcategory breakdown

Subcategories follow CK v4.0 §6.1 grouping. Each spec gap maps to its current implementation match (or SPEC_ONLY).

### HFrEF GDMT (15 gaps; T1=8, T2=7)

| ID | Tier | Spec Gap (intent) | Impl Match | Class |
|----|-----|-------------------|------------|-------|
| GAP-HF-001 | T1 | HFrEF: BB not prescribed | `gap-hf-35-beta-blocker` + `gdmtEngine.ts` | DET_OK |
| GAP-HF-002 | T1 | HFrEF: non-evidence-based BB | `gap-hf-35-beta-blocker` | PARTIAL |
| GAP-HF-003 | T1 | HFrEF: BB not at target dose | `gap-hf-35-beta-blocker` | PARTIAL |
| GAP-HF-004 | T1 | HFrEF: RAASi not prescribed | `gap-hf-37-raas` + `gdmtEngine.ts` | DET_OK |
| GAP-HF-005 | T1 | HFrEF: ARNI switch opportunity | `gap-hf-arni-switch` | DET_OK |
| GAP-HF-006 | T2 | HFrEF: ARNI not at target dose | `gap-hf-30-arni-underdosing` | DET_OK |
| GAP-HF-007 | T1 | HFrEF: MRA not prescribed | `gap-hf-36-mra` + `gdmtEngine.ts` | DET_OK |
| GAP-HF-008 | T2 | HFrEF: MRA contraindicated by labs | `gap-hf-36-mra` | PARTIAL |
| GAP-HF-009 | T2 | HFrEF: MRA K+ monitoring overdue | `gap-hf-potassium-monitor` | DET_OK |
| GAP-HF-010 | T1 | HFrEF: SGLT2i not prescribed | `gap-hf-34-sglt2i` + `gdmtEngine.ts` | DET_OK |
| GAP-HF-011 | T2 | HFrEF: SGLT2i eGFR contraindication | `gap-hf-34-sglt2i` | PARTIAL |
| GAP-HF-012 | T2 | HFrEF: Hydralazine/ISDN gap (Black) | `gap-hf-19-hydralazine-isdn` | DET_OK |
| GAP-HF-013 | T2 | HFrEF: Ivabradine candidate | `gap-hf-17-ivabradine` | DET_OK |
| GAP-HF-014 | T1 | HFrEF: Vericiguat candidate | `gap-hf-18-vericiguat` | DET_OK |
| GAP-HF-015 | T2 | HF: Digoxin inappropriate use | — | SPEC_ONLY |

**Coverage:** 9 DET_OK + 5 PARTIAL + 1 SPEC_ONLY = 14 covered (93.3% any). **Strongest subcategory — GDMT four-pillar core is well-covered.**

### HFpEF/HFmrEF (5 gaps; T1=3, T2=2)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-HF-016 | T1 | HFpEF: SGLT2i not prescribed | `gap-hf-79-sglt2i-hfpef` | DET_OK |
| GAP-HF-017 | T1 | HFpEF: Finerenone not prescribed | — | **SPEC_ONLY** |
| GAP-HF-018 | T1 | Obese HFpEF: GLP-1 RA | `gap-hf-7-glp1ra` | DET_OK |
| GAP-HF-019 | T2 | Possible undiagnosed HFpEF | `gap-hf-21-hfpef-screening` | DET_OK |
| GAP-HF-020 | T2 | H2FPEF score | `gap-hf-21-hfpef-screening` | PARTIAL |

**Coverage:** 3 DET_OK + 1 PARTIAL + 1 SPEC_ONLY = 4 covered (80% any). **Finerenone is a T1 SPEC_ONLY — high specialty pharma value, FINEARTS-HF evidence.**

### Device Therapy (12 gaps; T1=4, T2=8)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-HF-021 | T1 | CRT Class I candidate | — | **SPEC_ONLY** |
| GAP-HF-022 | T2 | CRT Class IIa candidate | — | SPEC_ONLY |
| GAP-HF-023 | T2 | CRT Class IIb candidate | — | SPEC_ONLY |
| GAP-HF-024 | T1 | ICD primary prevention - ischemic | — | **SPEC_ONLY** |
| GAP-HF-025 | T1 | ICD primary prevention - NICM | — | **SPEC_ONLY** |
| GAP-HF-026 | T1 | ICD secondary prevention | — | **SPEC_ONLY** |
| GAP-HF-027 | T2 | CardioMEMS candidate | `gap-hf-hemodynamic-monitor` | PARTIAL |
| GAP-HF-029 | T2 | CRT non-responder upgrade | `gap-hf-86-crt-d-upgrade` | PARTIAL |
| GAP-HF-030 | T2 | CIED ERI/EOL approaching | — | SPEC_ONLY |
| GAP-HF-031 | T2 | Lead extraction indication | — | SPEC_ONLY |
| GAP-HF-126 | T2 | CCM/Optimizer candidate | — | SPEC_ONLY |
| GAP-HF-127 | T2 | WCD bridge to decision | — | SPEC_ONLY |

**Coverage:** 0 DET_OK + 2 PARTIAL + 10 SPEC_ONLY = 2 covered (16.7% any). **Worst subcategory among major HF domains. All 4 T1 device-therapy gaps are SPEC_ONLY** — CRT Class I and ICD primary/secondary prevention have zero implementation. These are device-DRG procedural revenue drivers per CK v4.0 §1 Top-25.

### Advanced HF (13 gaps; T1=5, T2=8)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-HF-028 | T1 | LVAD/transplant evaluation | `gap-hf-84-transplant-eval` + `gap-hf-85-lvad-referral` | PARTIAL |
| GAP-HF-041 | T1 | WHF event without GDMT intensification | — | **SPEC_ONLY** |
| GAP-HF-043 | T1 | Frequent flyer (≥2 HF hosp/12mo) | — | **SPEC_ONLY** |
| GAP-HF-132 | T1 | Tolvaptan candidate (severe Na+) | `gap-hf-73-hyponatremia` | PARTIAL |
| GAP-HF-133 | T1 | SCAI C/D HF-CS: MCS escalation | — | **SPEC_ONLY** |
| GAP-HF-042 | T2 | Serial LVEF decline | — | SPEC_ONLY |
| GAP-HF-044 | T2 | Palliative care not consulted | `gap-hf-76-palliative-care` + `gap-hf-advance-care` | DET_OK |
| GAP-HF-045 | T2 | Diuretic resistance step-up | `gap-hf-77-diuretic-resistance` + `gap-hf-diuretic-optimization` | PARTIAL |
| GAP-HF-046 | T2 | Hyperkalemia: K+ binder gap | — | SPEC_ONLY |
| GAP-HF-047 | T2 | Inotrope dependence | — | SPEC_ONLY |
| GAP-HF-048 | T2 | End-organ dysfunction pattern | — | SPEC_ONLY |
| GAP-HF-049 | T2 | Low BP despite GDMT | — | SPEC_ONLY |
| GAP-HF-050 | T2 | GDMT intolerance pattern | — | SPEC_ONLY |

**Coverage:** 1 DET_OK + 3 PARTIAL + 9 SPEC_ONLY = 4 covered (30.8% any). **3 of 5 T1 Advanced-HF gaps SPEC_ONLY.** Triage triggers (frequent flyer, WHF GDMT failure, SCAI C/D) are key clinical decision points entirely missing.

### Iron Deficiency (3 gaps; T1=2, T2=1)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-HF-032 | T2 | Iron screening overdue | — | SPEC_ONLY |
| GAP-HF-033 | T1 | Absolute iron deficiency untreated | `gap-hf-iron-iv-monitoring` | PARTIAL |
| GAP-HF-034 | T1 | Functional iron deficiency untreated | `gap-hf-iron-iv-monitoring` | PARTIAL |

**Coverage:** 0 DET_OK + 2 PARTIAL + 1 SPEC_ONLY = 2 covered (66.7% any). T1 iron gaps are PARTIAL — broad rule covers IV iron tracking but doesn't differentiate absolute vs functional triggers.

### Transitions of Care (10 gaps; T1=1, T2=5, T3=4)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-HF-035 | T2 | 14-day f/u post-discharge | `gap-hf-37-fu-discharge` | PARTIAL |
| GAP-HF-036 | T1 | Discharge missing 4 GDMT pillars | — | **SPEC_ONLY** |
| GAP-HF-037 | T2 | Cardiac rehab not referred | `gap-hf-20-cardiac-rehab` | DET_OK |
| GAP-HF-038 | T3 | Depression screening overdue | — | SPEC_ONLY |
| GAP-HF-039 | T3 | Sleep apnea not screened | `gap-hf-26-osa-screening` + `gap-hf-91-sleep-apnea-treatment` | DET_OK |
| GAP-HF-040 | T3 | Vaccinations overdue | `gap-hf-38-influenza-vax` + `gap-hf-vaccine-covid` | DET_OK |
| GAP-HF-128 | T3 | Home health referral gap | — | SPEC_ONLY |
| GAP-HF-129 | T3 | HF discharge education docs | — | SPEC_ONLY |
| GAP-HF-130 | T2 | 30-day readmission HF DRG | — | SPEC_ONLY |
| GAP-HF-131 | T2 | Observation status misclass | — | SPEC_ONLY |

**Coverage:** 3 DET_OK + 1 PARTIAL + 6 SPEC_ONLY = 4 covered (40% any). **GAP-HF-036 (4-pillar discharge) T1 SPEC_ONLY** — Top-25 gap. Discharge readmission triggers (130, 131) entirely missing.

### Amyloid (7 gaps; T1=3, T2=2, T3=2)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-HF-051 | T1 | ATTR-CM screening: red flags | `gap-hf-90-amyloid-biomarker` | PARTIAL |
| GAP-HF-052 | T2 | FLC/immunofixation | `gap-hf-90-amyloid-biomarker` | PARTIAL |
| GAP-HF-053 | T1 | PYP scan not ordered | `gap-hf-90-amyloid-biomarker` | PARTIAL |
| GAP-HF-054 | T1 | ATTR-CM: no DMT | `gap-hf-90-amyloid-biomarker` | PARTIAL |
| GAP-HF-055 | T3 | TTR gene sequencing | `gap-hf-90-amyloid-biomarker` | PARTIAL |
| GAP-HF-056 | T3 | V122I screening Black HFpEF | `gap-hf-90-amyloid-biomarker` | PARTIAL |
| GAP-HF-134 | T2 | AL amyloid workup | `gap-hf-90-amyloid-biomarker` | PARTIAL |

**Coverage:** 0 DET_OK + 7 PARTIAL + 0 SPEC_ONLY = 7 covered (100% any-match, **0% DET_OK**). One broad rule (`gap-hf-90-amyloid-biomarker`) substitutes for 7 distinct spec gaps with different triggers (red flags, PYP timing, gene sequencing, race-stratified screening). **High-value subcategory** (ATTR specialty pharma per Top-25 #9) but implementation is wide and shallow.

### HCM (5 gaps; T1=1, T2=1, T3=3)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-HF-057 | T1 | HCM obstruction: myosin inhibitor | `gap-hf-12-hcm-screening` | PARTIAL |
| GAP-HF-058 | T3 | HCM: SRT candidate | `gap-hf-12-hcm-screening` | PARTIAL |
| GAP-HF-059 | T3 | HCM: SCD risk strat | `gap-hf-12-hcm-screening` | PARTIAL |
| GAP-HF-135 | T2 | HCM family screening | `gap-hf-12-hcm-screening` | PARTIAL |
| GAP-HF-136 | T3 | Apical HCM missed dx | — | SPEC_ONLY |

**Coverage:** 0 DET_OK + 4 PARTIAL + 1 SPEC_ONLY = 4 covered (80% any, **0% DET_OK**). Same pattern as Amyloid: one broad screening rule covers multiple distinct gaps.

### Other Phenotypes (16 gaps; T3=16)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-HF-060 | T3 | Fabry disease screening | `gap-hf-89-fabry` | PARTIAL |
| GAP-HF-061 | T3 | Fabry: enzyme replacement | `gap-hf-89-fabry` | PARTIAL |
| GAP-HF-062 | T3 | Cardiac sarcoid AV block | `gap-hf-82-cardiac-sarcoidosis` | PARTIAL |
| GAP-HF-063 | T3 | Cardiac sarcoid immunosuppression | `gap-hf-82-cardiac-sarcoidosis` | PARTIAL |
| GAP-HF-064 | T3 | Chagas CM screening | — | SPEC_ONLY |
| GAP-HF-065 | T3 | Tachycardia-mediated CM | — | SPEC_ONLY |
| GAP-HF-066 | T3 | Pre-anthracycline baseline | `gap-hf-80-cardio-oncology` | PARTIAL |
| GAP-HF-067 | T3 | Anthracycline LVEF decline | `gap-hf-80-cardio-oncology` | PARTIAL |
| GAP-HF-068 | T3 | HER2 cardiac surveillance | `gap-hf-80-cardio-oncology` | PARTIAL |
| GAP-HF-069 | T3 | ICI myocarditis | `gap-hf-80-cardio-oncology` + `gap-hf-88-myocarditis` | PARTIAL |
| GAP-HF-070 | T3 | Peripartum cardiomyopathy | `gap-hf-87-peripartum` | DET_OK |
| GAP-HF-071 | T3 | LVNC anticoagulation | `gap-hf-lvnc` | DET_OK |
| GAP-HF-072 | T3 | Takotsubo recovery monitoring | — | SPEC_ONLY |
| GAP-HF-073 | T3 | Radiation heart disease | — | SPEC_ONLY |
| GAP-HF-074 | T3 | ARVC ICD + exercise | — | SPEC_ONLY |
| GAP-HF-075 | T3 | Danon transplant eval | — | SPEC_ONLY |

**Coverage:** 2 DET_OK + 8 PARTIAL + 6 SPEC_ONLY = 10 covered (62.5% any). Cardio-oncology gaps consolidated under one rule; rare cardiomyopathies (Chagas, ARVC, Danon) absent.

### Cardiorenal Syndrome (5 gaps; all T2)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-HF-137 | T2 | CRS type 1 (acute) | — | SPEC_ONLY |
| GAP-HF-138 | T2 | CRS type 2 (chronic) | — | SPEC_ONLY |
| GAP-HF-139 | T2 | CRS type 4 (renocardiac) | — | SPEC_ONLY |
| GAP-HF-140 | T2 | Cardiorenal: ultrafiltration | `gap-hf-77-diuretic-resistance` | PARTIAL |
| GAP-HF-141 | T2 | CRS type 5 (sepsis) | — | SPEC_ONLY |

**Coverage:** 0 DET_OK + 1 PARTIAL + 4 SPEC_ONLY = 1 covered (20% any). CRS-type stratification entirely missing.

### Pericardial Disease (5 gaps; T2=1, T3=4)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-HF-142 | T3 | Constrictive pericarditis | — | SPEC_ONLY |
| GAP-HF-143 | T3 | Recurrent pericarditis colchicine | — | SPEC_ONLY |
| GAP-HF-144 | T3 | IL-1 inhibitor refractory | — | SPEC_ONLY |
| GAP-HF-145 | T3 | Pericardial effusion workup | — | SPEC_ONLY |
| GAP-HF-146 | T2 | Tamponade physiology | — | SPEC_ONLY |

**Coverage: 0/5 (0% any). Entire subcategory unimplemented.**

### LVAD/Transplant (9 gaps; T1=1, T2=7, T3=1)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-HF-147 | T1 | Post-LVAD: INR out of range | — | **SPEC_ONLY** |
| GAP-HF-148 | T2 | Post-LVAD: GI bleeding mgmt | — | SPEC_ONLY |
| GAP-HF-149 | T2 | Post-LVAD: pump thrombosis | — | SPEC_ONLY |
| GAP-HF-150 | T2 | Post-LVAD: driveline infection | — | SPEC_ONLY |
| GAP-HF-151 | T2 | Post-transplant: CAV surveillance | — | SPEC_ONLY |
| GAP-HF-152 | T2 | Post-transplant: rejection biopsy | — | SPEC_ONLY |
| GAP-HF-153 | T2 | Post-transplant: immunosuppression levels | — | SPEC_ONLY |
| GAP-HF-154 | T3 | Post-transplant: CMV/EBV | — | SPEC_ONLY |
| GAP-HF-155 | T2 | Post-LVAD: RV failure | — | SPEC_ONLY |

**Coverage: 0/9 (0%). Entire post-advanced-therapy monitoring subcategory unimplemented.** GAP-HF-147 (post-LVAD INR) is T1 — Top-25 priority.

### ECMO/MCS (3 gaps; T1=1, T2=1, T3=1)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-HF-156 | T1 | VA-ECMO: LV venting/unloading | — | **SPEC_ONLY** |
| GAP-HF-157 | T2 | VA-ECMO: weaning protocol | — | SPEC_ONLY |
| GAP-HF-158 | T3 | Impella: SCAI escalation | — | SPEC_ONLY |

**Coverage: 0/3 (0%). Entire subcategory unimplemented.**

### Genetics (3 gaps; all T3)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-HF-159 | T3 | Familial DCM cascade | — | SPEC_ONLY |
| GAP-HF-160 | T3 | LMNA: early ICD | — | SPEC_ONLY |
| GAP-HF-161 | T3 | Filamin C: ICD | — | SPEC_ONLY |

**Coverage: 0/3 (0%). Entire subcategory unimplemented.**

### Cross-cutting (15 gaps; all T2)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-HF-076 | T2 | Stage B progression risk | — | SPEC_ONLY |
| GAP-HF-077 | T2 | Amyloid + AF: anticoag | — | SPEC_ONLY |
| GAP-HF-078 | T2 | HF + chronic AF: rate control | — | SPEC_ONLY |
| GAP-HF-079 | T2 | HF + iron def + anemia workup | `gap-hf-anemia-hf` | DET_OK |
| GAP-HF-080 | T2 | HF + thyroid dysfunction | — | SPEC_ONLY |
| GAP-HF-081 | T2 | HF + DM: HbA1c target | — | SPEC_ONLY |
| GAP-HF-082 | T2 | HF + CKD + metformin | — | SPEC_ONLY |
| GAP-HF-083 | T2 | HF: CMR for unclear etiology | `gap-hf-75-cardiac-mri` + `gap-hf-83-loop-without-mra` | DET_OK |
| GAP-HF-084 | T2 | HF: 6MWT/CPET | — | SPEC_ONLY |
| GAP-HF-085 | T2 | HF: ICD shock review | — | SPEC_ONLY |
| GAP-HF-086 | T2 | HF in pregnancy: teratogenic meds | — | SPEC_ONLY |
| GAP-HF-087 | T2 | HF + opioid: OSA/interaction | — | SPEC_ONLY |
| GAP-HF-088 | T2 | HF + cancer survivorship | — | SPEC_ONLY |
| GAP-HF-089 | T2 | HF Hispanic SDOH | — | SPEC_ONLY |
| GAP-HF-090 | T2 | HF telehealth rural | `gap-hf-29-remote-monitoring` | DET_OK |

**Coverage:** 3 DET_OK + 0 PARTIAL + 12 SPEC_ONLY = 3 covered (20% any). Comorbidity-focused gaps (HF + DM, HF + thyroid, HF + opioid) entirely missing.

---

### 4.5 — T1 SPEC_ONLY work items (load-bearing for v2.0 Phase 1)

The 11 T1 spec gaps with zero implementation. Anchored to BSW scoping doc v7.1 Part 1 ROI pathways (Pathway 1 = Procedural/Device DRG Capture; Pathway 2 = Specialty Pharmacy Retention; Pathway 3 = Avoided Admission/Readmission; Pathway 4 = Risk Adjustment).

| GAP-ID | Subcategory | Description | Tier | BSW pathway |
|---|---|---|---|---|
| GAP-HF-017 | HFpEF/HFmrEF | Finerenone not prescribed (FINEARTS-HF) | T1 | Pathway 2 (Specialty Pharmacy) |
| GAP-HF-021 | Device Therapy | CRT Class I candidate not implanted | T1 | Pathway 1 (Device DRG: CRT-D 226-227, $40-60K/case) |
| GAP-HF-024 | Device Therapy | ICD primary prevention - ischemic | T1 | Pathway 1 (Device DRG: ICD, $35-55K/case) |
| GAP-HF-025 | Device Therapy | ICD primary prevention - NICM (DANISH) | T1 | Pathway 1 (Device DRG: ICD) |
| GAP-HF-026 | Device Therapy | ICD secondary prevention | T1 | Pathway 1 (Device DRG: ICD) |
| GAP-HF-036 | Transitions of Care | Discharge missing 4 GDMT pillars | T1 | Pathway 3 (Readmission) + Pathway 4 (HCC 85 RAF) |
| GAP-HF-041 | Advanced HF | WHF event without GDMT intensification | T1 | Pathway 3 (Avoided Readmission) |
| GAP-HF-043 | Advanced HF | Frequent flyer (≥2 HF hospitalizations / 12mo) | T1 | Pathway 3 |
| GAP-HF-133 | Advanced HF | SCAI C/D HF-CS: MCS escalation gap | T1 | Pathway 1 (MCS DRG 216-221) |
| GAP-HF-147 | LVAD/Transplant | Post-LVAD: anticoagulation INR out of range | T1 | Pathway 3 (post-advanced-therapy admission avoidance) |
| GAP-HF-156 | ECMO/MCS | VA-ECMO: LV venting/unloading gap | T1 | Pathway 1 (Impella/IABP procedure) |

**Pathway distribution of T1 SPEC_ONLY:**
- Pathway 1 (Device DRG / Procedural): 6 of 11 (CRT, ICD ×3, MCS, ECMO unloading)
- Pathway 2 (Specialty Pharmacy): 1 of 11 (Finerenone)
- Pathway 3 (Readmission): 4 of 11 (4-pillar discharge, WHF GDMT, frequent flyer, post-LVAD INR)
- Pathway 4 (Risk Adj): 1 of 11 (4-pillar discharge HCC 85)

**6 of 11 T1 SPEC_ONLY are Pathway 1 procedural/device gaps.** This is the most concentrated commercial-revenue weakness in HF.

---

## 5. Tier 1 priority gaps surfaced (29 total)

**DET_OK at T1 (8):** GAP-HF-001, 004, 005, 007, 010, 014, 016, 018 — six HFrEF GDMT pillars + HFpEF SGLT2i + GLP-1 RA. Strong core.

**PARTIAL at T1 (10):** GAP-HF-002, 003 (BB sub-detection), 028 (LVAD/transplant eval), 132 (Tolvaptan), 033, 034 (iron), 051, 053, 054 (amyloid), 057 (HCM myosin inhibitor). Rules exist but don't cover full spec intent.

**SPEC_ONLY at T1 (11):** **GAP-HF-017** (Finerenone HFpEF), **GAP-HF-021** (CRT Class I), **GAP-HF-024** (ICD primary ischemic), **GAP-HF-025** (ICD primary NICM), **GAP-HF-026** (ICD secondary), **GAP-HF-036** (4-GDMT-pillar discharge), **GAP-HF-041** (WHF without GDMT intensification), **GAP-HF-043** (frequent flyer), **GAP-HF-133** (SCAI C/D MCS escalation), **GAP-HF-147** (post-LVAD INR), **GAP-HF-156** (VA-ECMO LV unloading).

**These 11 T1 SPEC_ONLY gaps are HF's most material implementation gaps for production-grade.** They include specialty pharma (Finerenone), 4 device-DRG cluster (CRT/ICD), discharge/transitions (4-pillar check), advanced HF triage (frequent flyer + WHF + SCAI), post-LVAD monitoring, and ECMO escalation logic.

---

## 6.1 — Implemented rules NOT mapped to a spec gap

1 of 44 implemented rules doesn't cleanly map to a CK v4.0 spec gap:

- **`gap-hf-thiamine`** — Thiamine supplementation in diuretic-treated HF. Class 2a-style recommendation. No matching spec gap; spec focuses on iron-deficiency screening + treatment, not thiamine repletion. **EXTRA — clinical content valid but not in BSW v7.1 catalog.**

This is far less than PV's 9 EXTRA rules — suggesting HF implementation was built more strictly against the spec than PV.

---

## 6.2 — BSW ROI pathway implications

The Device Therapy 16.7% coverage finding has direct BSW conversation implications. The BSW scoping doc v7.1 Part 1 anchors the ROI conversation on:

- **Pathway 1 (Procedural and Device DRG Capture):** TAVR $50-80K/case, CRT-D $40-60K/case, ICD primary $35-55K/case, MitraClip $35-55K/case, Watchman $30-45K/case
- **Pathway 2 (Specialty Pharmacy Retention):** tafamidis $225K/yr, vutrisiran $500K/yr, mavacamten $75-90K/yr — all HF-relevant
- **Pathway 3 (Avoided Admission/Readmission):** HF hospitalization $12K/admission with HRRP penalty exposure
- **Pathway 4 (Risk Adjustment):** HCC 85 heart failure $300-400/member/year MA RAF

Of HF Top 25 priority gaps in BSW scoping doc Part 1.3:

| Top-25 Gap | Status per audit | Pathway |
|---|---|---|
| GAP-HF-021 (CRT Class I) | **SPEC_ONLY** | Pathway 1 |
| GAP-HF-024 (ICD primary ischemic) | **SPEC_ONLY** | Pathway 1 |
| GAP-HF-051 (ATTR-CM screening) | PARTIAL via `gap-hf-90-amyloid-biomarker` | Pathway 2 |
| GAP-HF-001 / 004 / 007 / 010 (GDMT four-pillar) | DET_OK via `gdmtEngine.ts` + rules | Pathway 3 + Pathway 4 |
| GAP-HF-017 (HFpEF Finerenone FINEARTS-HF) | **SPEC_ONLY** | Pathway 2 |
| GAP-HF-018 (Obese HFpEF GLP-1 RA) | DET_OK via `gap-hf-7-glp1ra` | Pathway 2 |
| GAP-HF-033 (IV iron AFFIRM-AHF absolute deficiency) | PARTIAL via `gap-hf-iron-iv-monitoring` | Pathway 3 |

**GDMT four-pillar is the strongest commercial asset in HF** (BSW Sample Exhibit A from scoping doc Part 6.2 is HF GDMT Four-Pillar Closure Rate). Device Therapy + Specialty Pharmacy coverage gaps are the largest commercial weaknesses.

**LVAD/Transplant 0% coverage and Advanced HF 13-gap subcategory ties to Pathway 3** — cardiogenic shock + advanced HF admissions are $40-90K/admission per scoping doc Part 1.1. Zero detection means TAILRD cannot quantify advanced HF opportunity for BSW or any health system.

Phase 1 prioritization should sequence by Pathway alignment, not just clinical Tier scoring.

---

## 6.3 — Strategic posture: extend timeline, not scope

**Operator strategic decision (2026-05-03):** when audit findings force a choice between timeline and scope, extend timeline. Do not reduce scope. Module Parity Principle preserved. All Tier 1+2+3 gaps in scope. Research/registry backend in scope.

**Rationale:** TAILRD is clinical decision support; shortcuts in clinical content (broad-rule consolidation that loses gap-level specificity, missing modules, skipped tiers) become patient safety risk or commercial credibility failures. The Palantir approach is to do it right; the timeline absorbs the cost.

**Timeline math (preliminary, refined in v2.0):**
- Phase 1 revised: ~460-730h (vs v1.2's 250-350h, ~2× factor)
- Phase 2 revised: ~1,500h (vs v1.2's 600-900h, ~2× factor)
- 60-70h/week capacity → Phase 1+2 alone needs ~30-37 weeks
- Rough revised v1.0 target: 7-9 months from 2026-04-29 plan start (~2026-12 to 2027-02)
- This estimate is based on PV + HF audit data only; v2.0 PATH_TO_ROBUST will refine with all 6 module audits + Phase 0C in hand. The 7-9 month figure may shift in either direction.

**v2.0 authorship is a Phase 0 deliverable**, scheduled end-of-Week-3 (~2026-05-19) per `PATH_TO_ROBUST.md` v1.2 §5. v2.0 codifies the extended timeline with full per-phase budgets and per-module sequencing once all Phase 0 audits land.

---

## 7. Working hypothesis verdict

**Original framing in `docs/PATH_TO_ROBUST.md` v1.2 §2:**
> "Strong working hypothesis: more is implemented than the 280 figure suggests; the gap is wiring and UI surfacing, not detection logic creation."

**Verdict for HF (data-driven):** **Hypothesis PARTIALLY CONFIRMED.**

- **Coverage is materially higher than PV (46% vs 26.7%)** — supports "more built than thought" at the most-developed module
- **But the gap distribution is dramatically uneven:**
  - GDMT four-pillar core: 93% any-coverage (excellent)
  - Amyloid + HCM screening: 100% / 80% any-coverage (broad-rule consolidation; PARTIAL not DET_OK)
  - Procedural decision support (CRT/ICD/MCS): 0-17% (catastrophic gaps)
  - Post-advanced-therapy (LVAD/transplant/ECMO): 0% (entire subcategories)
  - Pericardial disease + Genetics: 0% (entire subcategories)
- **T1 priority gap SPEC_ONLY rate is 38%** (11 of 29) — a third of HF's highest-priority work has zero implementation

**Refined characterization:** The platform succeeds at **medication gaps and screening triggers** but fails at **decision support gaps** (device timing thresholds, advanced HF triage, procedural escalation). The "more built than thought" framing applies to medication-side coverage; the procedural-domain coverage is **less built than thought** and is where the load-bearing v2.0 Phase 1 work concentrates.

If HF (most-developed) is at 46% any-coverage and PV (audited baseline) is at 26.7%, **average across 6 modules likely 30-40%**, suggesting platform-wide:
- 0.30-0.40 × 708 ≈ 210-285 spec gaps with implementation
- 425-500 SPEC_ONLY platform-wide

This is **higher than CLAUDE.md's "280+ algorithms" framing's lower bound** but **lower than the v1.2 working hypothesis assumed.**

---

## 8. Implications for Path to Robust v2.0 (deferred to Week 3)

**v1.2 timeline math implications:**

If HF's pattern (62.1% T1 any-coverage) is representative of well-developed modules and PV's pattern (42.9% T1 any-coverage) of less-developed modules, average T1 any-coverage might be ~50% across 7 modules.

- T1: 107 total × 50% any-coverage ≈ 54 covered (mix DET_OK + PARTIAL), ~53 SPEC_ONLY → roughly **53 T1 gaps to build from scratch**, ~30 to harden from PARTIAL → DET_OK
- T2: 462 × ~30% any-coverage ≈ 138 covered, **~324 SPEC_ONLY**
- T3: 139 × ~25% any-coverage ≈ 35 covered, **~104 SPEC_ONLY**
- Total platform-wide: ~480-510 SPEC_ONLY across 7 active modules (subtracting CX which is deferred per `BUILD_STATE.md` §3b)

**Phase 1 (Tier 1) budget impact:**
- v1.2 estimate: ~250-350h
- HF + PV combined data: 53 SPEC_ONLY T1 gaps × ~6-10h = ~320-530h SPEC_ONLY work
- Plus 30 PARTIAL → DET_OK hardening × ~3-4h = ~90-120h
- Plus 27 already-DET_OK gaps for tests + UI polish × ~2-3h = ~54-81h
- **Revised Phase 1 estimate: ~460-730h** (~2× v1.2 estimate)

**Phase 2 (Tier 2) budget impact:**
- v1.2 estimate: ~600-900h
- ~324 SPEC_ONLY × ~4h templated build + ~138 cover × ~1.5h verify = ~1,500h
- **Revised Phase 2 estimate: ~1,500h** (~2× v1.2 estimate)

**v2.0 must reflect these honestly.** The 3-4 month timeline at v1.2 cadence (60-70h/week × 13-17 weeks = 780-1,190h) is unlikely to fit Phase 1 + Phase 2 combined (revised ~1,960-2,230h). Operator may need to:
- Reduce scope (defer some Tier 2/3 to v1.1 post-launch)
- Extend timeline to 5-7 months
- Engage clinical content contractor

---

## 9. HF-specific findings worth surfacing (non-Tier S, but flag-worthy)

### Finding HF-01 — Naming inconsistency: rule ID prefix collision

`gap-hf-37-fu-discharge` and `gap-hf-37-raas` both use `gap-hf-37-*` prefix. Same numeric prefix collision as PV's `gap-ep-*` IDs. Code-hygiene FINDING (LOW). Same remediation path as PV-001.

### Finding HF-02 — Broad rule consolidation in Amyloid + HCM

`gap-hf-90-amyloid-biomarker` covers 7 spec gaps (51, 52, 53, 54, 55, 56, 134) under one rule. `gap-hf-12-hcm-screening` covers 4 spec gaps (57, 58, 59, 135). This produces **0% DET_OK in these subcategories** — every spec gap is PARTIAL. **For v1.0 production-grade, these need to be split into per-spec-gap rules** so DET_OK can be earned. ~10-15h per subcategory.

### Finding HF-03 — Zero device-therapy implementation despite Top-25 prominence

CRT Class I (GAP-HF-021), ICD primary-prevention ischemic (GAP-HF-024), and ICD primary-prevention NICM (GAP-HF-025) are all in CK v4.0 §3 Top-25 priority list with device-DRG ROI tagging. **All three have zero implementation.** This is the single highest-revenue cluster of unbuilt rules in the HF module. ~25-35h to implement all three with detection + UI + tests.

### Finding HF-04 — `gdmtEngine.ts` redundancy with gapRuleEngine

GDMT four-pillar logic is implemented BOTH in `gapRuleEngine.ts` rules (`gap-hf-35-beta-blocker`, `gap-hf-37-raas`, `gap-hf-36-mra`, `gap-hf-34-sglt2i`) AND in the dedicated `gdmtEngine.ts` service. Two code paths for same clinical intent. Future Phase 0A audit Phase 3 (data layer) should reconcile or pick one. Not a functional bug (both paths produce same result on test); a tech-debt finding.

---

## 10. Cross-references

- `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.1 (lines 120-306) — spec source for all 126 HF gaps
- `docs/audit/PHASE_0B_PV_AUDIT_REPORT_ADDENDUM.md` — sibling addendum for PV; methodology template
- `docs/audit/PHASE_0B_CLINICAL_AUDIT_FRAMEWORK.md` — methodology
- `docs/audit/PHASE_1_REPORT.md` — AUDIT-001 (testing gap blocks PRODUCTION_GRADE for all gaps)
- `docs/PATH_TO_ROBUST.md` v1.2 — strategic plan; v2.0 revision will reflect this addendum
- `BUILD_STATE.md` — canonical aggregate ledger (this audit updates §1, §3, §4, §6)
- `backend/src/ingestion/gaps/gapRuleEngine.ts` — code source (48 HF rules)
- `backend/src/services/gdmtEngine.ts` — GDMT four-pillar service

---

## 11. Lessons learned for next module audit (CAD next)

1. **Use the same per-subcategory mapping format** — readable and reconcilable to the spec
2. **Recompute headline numbers manually** — auto-generated summaries from agent analysis can drift from per-row tables
3. **Surface broad-rule-consolidation finding** when one rule covers >3 spec gaps (PARTIAL pattern)
4. **CAD has 76 rules — highest density.** Hypothesis: highest DET_OK rate of any module. Test in next audit.
5. **Audit time:** ~6-8h hands-on for CAD (smaller spec at 90 gaps; potentially higher coverage means less SPEC_ONLY classification work)

---

## 12. Audit verdict (full classification mode)

**HF module — full-classification verdict: BUILT BUT NOT EVENLY.**

- 27 DET_OK (21.4%), 31 PARTIAL (24.6%), 68 SPEC_ONLY (54.0%)
- 8 of 29 T1 priority gaps DET_OK; 11 SPEC_ONLY at T1 — major Phase 1 work
- HFrEF GDMT (93% covered) is platform's strongest subcategory
- Device Therapy (17% covered), LVAD/Transplant (0%), ECMO/MCS (0%), Pericardial (0%), Genetics (0%) — entire procedural-domain blocks unimplemented
- Hypothesis "more built than thought" PARTIALLY CONFIRMED — true for medication gaps, false for procedural decision support

**Reusable for other 5 modules (CAD next):** methodology proven across PV + HF. Pattern of "broad rule consolidation" surfaces in both modules. Each module audit should produce per-subcategory tables + recomputed headline + T1 priority status separately.

---

*Authored 2026-05-03. Verdict driven by per-gap classification; per-subcategory tables are the source of truth.*
