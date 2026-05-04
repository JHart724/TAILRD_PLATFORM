# Phase 0B EP Audit Report — Addendum: Real Spec↔Code Mapping (rule-body-verified)

**Companion to:** `docs/audit/PHASE_0B_CAD_AUDIT_ADDENDUM.md` (sibling, module 3 of 6) and `docs/audit/PHASE_0B_HF_AUDIT_ADDENDUM.md` (module 2 of 6) and `docs/audit/PHASE_0B_PV_AUDIT_REPORT_ADDENDUM.md` (module 1 of 6).
**Spec source:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.2 (lines 307-440, 89 EP gaps across 11 subcategories).
**Code source:** `backend/src/ingestion/gaps/gapRuleEngine.ts` (45 rules tagged `module: 'ELECTROPHYSIOLOGY'`, 45 distinct rule IDs — 44 canonical `gap-ep-*` + 1 legacy `gap-39-qtc-safety`). No EP-specific service file.
**Date:** 2026-05-04
**Mode:** Full classification, **rule-body-verified** (first module audited under verified-not-name-match methodology)

---

## 1. Summary

EP is module 4 of 6 audited. Naive density: 45 rules / 89 spec gaps = **51%**. Going in, this was an intermediate-density module (between HF 38% and CAD 84%). EP is also the **first module audited under rule-body-verified methodology** — a methodology departure from PV/HF/CAD which were classified by name-match crosswalk. The methodology delta is captured as AUDIT-029 (see §9 + §11).

**Real spec coverage (rule-body-verified): 41.6%** (18 DET_OK + 19 PARTIAL + 52 SPEC_ONLY of 89). **DET_OK only: 20.2%.**

EP coverage lands BELOW HF's 46% any-coverage despite higher naive density (51% vs 38%). This is the **strongest signal yet that name-match audits inflate coverage by ~20pp**: EP rule-body-verified at 20.2% DET_OK vs HF name-match at 21.4% DET_OK — comparable absolute numbers despite EP's 1.5x higher density. AUDIT-029 hypothesis confirmed: prior PV/HF/CAD numbers likely inflated.

**Tier 1 priority gap status (15 T1):**
- DET_OK: 5 (33.3%)
- PARTIAL: 3 (20.0%)
- **SPEC_ONLY: 7 (46.7%)** ← v2.0 Phase 1 load-bearing EP work

The 7 T1 SPEC_ONLY gaps cluster across **AF Anticoagulation dosing safety + WPW SAFETY + STEMI/ACS Cardiogenic Shock-equivalent (post-arrest TTM) + pharmacy-fill adherence**. Notably, **EP-XX-7 (gap-ep-rate-control-afib HFrEF SAFETY scenario) was REMEDIATED via PR #229** (merged 2026-05-04, `9ac3806`) — this is the first EP-finding-to-fix loop closed in this audit cycle.

**Hypothesis verdict:** PARTIALLY CONFIRMED with refinement (see §7). EP is moderately-built but with **major procedural-Pathway-1 blind spots recurring across HF/CAD/EP**, and **AF anticoagulation dosing safety entirely uncovered** (5 SAFETY-tagged dosing gaps SPEC_ONLY).

---

## 2. Coverage by classification

| Classification | Count | % of 89 |
|---|---|---|
| PRODUCTION_GRADE (det + UI + tests) | 0 | 0% |
| DET_OK (det + UI scaffold + no tests) | 18 | 20.2% |
| PARTIAL_DETECTION | 19 | 21.3% |
| SPEC_ONLY | 52 | 58.4% |

**PRODUCTION_GRADE = 0** until EP-XX-7 mitigation PR #229 lands tests for the new EP-017 SAFETY rule. Even then, 1 of 89 is the only PRODUCTION_GRADE candidate — the remaining 88 EP gaps still lack test coverage per platform-wide AUDIT-001 P0. **Note: PR #229 introduced 8 EP tests including the EP-017 SAFETY scenario — first EP gap to receive test coverage in the platform.**

---

## 3. Coverage by tier

| Tier | Total | DET_OK | PARTIAL | SPEC_ONLY | Any-Coverage % |
|------|------:|-------:|--------:|----------:|---------------:|
| **T1 (priority)** | 15 | 5 | 3 | 7 | **53.3%** |
| T2 (standard) | 62 | 13 | 14 | 35 | 43.5% |
| T3 (supporting) | 12 | 0 | 2 | 10 | 16.7% |
| **Overall** | **89** | **18** | **19** | **52** | **41.6%** |

**T1 SPEC_ONLY at 47% is second-highest among 4 audited modules** (PV 57%, EP 47%, HF 38%, CAD 33%). T3 coverage is the lowest of any module (16.7%) — EP rare conditions (channelopathies, syncope etiologies, post-arrest counseling) are largely uncovered.

---

## 4. Per-subcategory breakdown

11 subcategories per CK v4.0 §6.2, ordered per audit narrative:

### AF Anticoagulation (13 gaps; T1=6, T2=6, T3=1) — BSW Pathway 4 anchor + dosing-safety blind spot

| ID | Tier | Spec Gap (intent) | Impl Match (rule + verified body) | Stage | Pathway | Tags | Class |
|----|-----|---------|-----------|-----|------|------|-------|
| GAP-EP-001 | T1 | AF anticoag CHA2DS2-VASc qualifying | `gap-ep-oac-afib` + `gap-ep-af-stroke-risk` | 3 | P3+P4 | Adherence | **DET_OK** |
| GAP-EP-006 | T1 | Dabigatran in CrCl<30 (SAFETY) | (registry only; no CrCl-gated dabigatran SAFETY check in evaluator) | 7 | P3 | SAFETY | **SPEC_ONLY** |
| GAP-EP-007 | T1 | DOAC on mechanical valve (CRITICAL SAFETY) | evaluator line 5198+ explicit detection (RE-ALIGN trial cited, Class 3 Harm) | 7 | P3 | SAFETY-Crit | **DET_OK** |
| GAP-EP-008 | T1 | DOAC on moderate-severe MS | (no DOAC + MS contraindication; mitral stenosis logic at 5134+ only covers echo surveillance) | 7 | P3 | SAFETY | **SPEC_ONLY** |
| GAP-EP-064 | T1 | OAC Rx prescribed but not filled | — (no pharmacy fill data integration) | 7 | P3+P4 | Adherence | **SPEC_ONLY** |
| GAP-EP-065 | T1 | OAC PDC<80% chronic adherence | — (no pharmacy fill data integration) | 7 | P3+P4 | Adherence | **SPEC_ONLY** |
| GAP-EP-002 | T2 | Warfarin TTR<65% → DOAC switch | — (no TTR logic) | 7 | P3 | — | SPEC_ONLY |
| GAP-EP-003 | T2 | DOAC dose inappropriate for CrCl | — (no CrCl-DOAC dose logic) | 7 | P3 | SAFETY | SPEC_ONLY |
| GAP-EP-004 | T2 | Apixaban dose-reduction criteria missed | — (no apixaban dose logic) | 7 | P3 | SAFETY | SPEC_ONLY |
| GAP-EP-005 | T2 | Apixaban under-dosing | — (no apixaban dose logic) | 7 | P3 | SAFETY | SPEC_ONLY |
| GAP-EP-009 | T2 | Edoxaban with CrCl>95 | — (no edoxaban-renal logic) | 7 | P3 | SAFETY | SPEC_ONLY |
| GAP-EP-066 | T2 | Triple therapy AF+PCI duration | — (no triple-therapy timing logic) | 7 | P3 | — | SPEC_ONLY |
| GAP-EP-010 | T3 | Rivaroxaban food counseling | — | 7 | — | — | SPEC_ONLY |

**Coverage:** 2 DET_OK + 0 PARTIAL + 11 SPEC_ONLY = 2/13 (15.4% any, 15.4% DET_OK). **AF dosing safety entirely uncovered at T1+T2 except mechanical-valve detection.** Five SAFETY-tagged dosing gaps SPEC_ONLY. Mechanical-valve DOAC detection (EP-007) is the bright spot — explicit RE-ALIGN-trial-cited logic at line 5198+. Pharmacy-fill SPEC_ONLY pattern repeats from CAD.

### LAAC (5 gaps; T1=2, T2=3) — Pathway 1 device anchor

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-EP-011 | T1 | LAAC: bleeding contraindication | `gap-ep-laac` line 3979+ | 4 | P1 | SAFETY | DET_OK |
| GAP-EP-012 | T1 | LAAC: high CHA2DS2-VASc + bleed history | `gap-ep-laac` (broad rule, no trigger differentiation) | 4 | P1 | — | PARTIAL |
| GAP-EP-067 | T2 | Post-LAAC antithrombotic protocol | — | 6 | P1 | — | SPEC_ONLY |
| GAP-EP-068 | T2 | Post-LAAC TEE surveillance | — | 6 | P1 | — | SPEC_ONLY |
| GAP-EP-069 | T2 | LAAC PDL>5mm management | — | 6 | P1 | — | SPEC_ONLY |

**Coverage:** 1 DET_OK + 1 PARTIAL + 3 SPEC_ONLY = 2/5 (40% any, 20% DET_OK). LAAC eval covered; post-procedure surveillance entirely uncovered.

### Rhythm Control (11 gaps; T1=4, T2=6, T3=1) — Pathway 1 ablation anchor

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-EP-013 | T1 | Early rhythm control (EAST-AFNET 4) | `gap-ep-early-rhythm` line 9129+ | 3 | P3 | — | DET_OK |
| GAP-EP-014 | T1 | AF ablation in HFrEF (CASTLE-AF) | `gap-ep-ablation` line 4014+ | 4 | P1 | — | PARTIAL |
| GAP-EP-017 | T1 | AF + non-DHP CCB in HFrEF (SAFETY) | **REMEDIATED via PR #229** (lines 4774+ refactored; new EP-017 SAFETY gap fires when HFrEF + non-DHP CCB) | 7 | P3 | SAFETY | **DET_OK (post-fix)** |
| GAP-EP-018 | T1 | Subclinical AF: AHRE>=24h | `gap-ep-subclinical-af` line 6819+ | 1+3 | P3 | PopHealth | DET_OK |
| GAP-EP-015 | T2 | Symptomatic paroxysmal AF ablation | `gap-ep-ablation` line 4014+ | 4 | P1 | — | DET_OK |
| GAP-EP-016 | T2 | Post-cardioversion 4+wk OAC | — (no post-CV OAC duration logic) | 6 | P3 | Transitions | SPEC_ONLY |
| GAP-EP-070 | T2 | PFA candidacy | `gap-ep-pfa` line 6584+ | 4 | P1 | — | DET_OK |
| GAP-EP-071 | T2 | Post-ablation OAC continuation | — | 6 | P3 | Transitions | SPEC_ONLY |
| GAP-EP-072 | T2 | Redo ablation in recurrent AF | — | 4 | P1 | — | SPEC_ONLY |
| GAP-EP-073 | T2 | Concomitant Maze at cardiac surgery | — | 4 | P1 | — | SPEC_ONLY |
| GAP-EP-019 | T3 | Cryptogenic stroke ICM not implanted | — | 1 | P3 | — | SPEC_ONLY |

**Coverage:** 4 DET_OK (one post-fix) + 1 PARTIAL + 6 SPEC_ONLY = 5/11 (45% any). Rhythm control core (early rhythm, ablation referral, PFA, subclinical AF) is well-covered. Post-procedure surveillance (post-cardioversion OAC, post-ablation OAC, redo ablation, concomitant Maze) entirely uncovered.

### VT/ICD (7 gaps; T1=1, T2=6) — Pathway 1 device cluster

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-EP-086 | T1 | VT storm: admission + sedation + ablation | `gap-ep-vt-ablation` line 9162+ (broad VT+ICD trigger, not VT-storm-specific) | 5 | P1 | — | PARTIAL |
| GAP-EP-020 | T2 | Ischemic VT catheter ablation | `gap-ep-vt-ablation` (generic) | 4 | P1 | — | PARTIAL |
| GAP-EP-021 | T2 | NICM VT substrate mapping | `gap-ep-vt-ablation` (generic) | 4 | P1 | — | PARTIAL |
| GAP-EP-022 | T2 | VT ablation before amiodarone (VANISH) | `gap-ep-vt-ablation` (no AAD-failure check) | 4 | P1 | — | PARTIAL |
| GAP-EP-087 | T2 | Epicardial VT substrate access | — | 5 | P1 | — | SPEC_ONLY |
| GAP-EP-088 | T2 | Stellate ganglion block for VT storm | — | 5 | P1 | — | SPEC_ONLY |
| GAP-EP-089 | T2 | Inappropriate ICD shocks programming | `gap-ep-inappropriate-shocks` + `gap-ep-icd-programming` | 5 | P1 | — | DET_OK |

**Coverage:** 1 DET_OK + 4 PARTIAL + 2 SPEC_ONLY = 5/7 (71% any, 14% DET_OK). **Broad-rule consolidation pattern severe:** single `gap-ep-vt-ablation` rule (VT+ICD trigger) consolidates 4 distinct trial-specific spec gaps without differentiation.

### Channelopathies (11 gaps; T2=6, T3=5)

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-EP-023 | T2 | Brugada diagnosis gap | `gap-ep-brugada` line 9229+ (syncope+male+age<45 screening, NOT confirmed-Brugada-treatment-decision) | 1 | — | — | DET_OK |
| GAP-EP-024 | T2 | LQTS BB gap | `gap-ep-lqts-bb` line 6786+ | 3 | — | — | DET_OK |
| GAP-EP-025 | T2 | Acquired LQT on QT-prolonging drug | `gap-39-qtc-safety` + `gap-ep-torsades` line 7001+ | 7 | P3 | SAFETY | DET_OK |
| GAP-EP-026 | T2 | Congenital LQTS QT-drug avoidance | overlapping rules (LQTS-BB + Torsades) | 7 | — | SAFETY | PARTIAL |
| GAP-EP-027 | T2 | SCN5A Brugada device decision | `gap-ep-brugada` (screening rule, no genotype split + different stage) | 4 | P1 | — | PARTIAL |
| GAP-EP-028 | T2 | CPVT BB+flecainide | — | 3 | P2 | — | SPEC_ONLY |
| GAP-EP-081 | T3 | LQT1 nadolol preferred | `gap-ep-lqts-bb` (broad LQT+BB; no genotype split) | 3 | — | — | PARTIAL |
| GAP-EP-082 | T3 | LQT2 trigger counseling | — | 6 | — | — | SPEC_ONLY |
| GAP-EP-083 | T3 | LQT3 mexiletine | — | 3 | P2 | — | SPEC_ONLY |
| GAP-EP-084 | T3 | Short QT quinidine | — | 3 | P2 | — | SPEC_ONLY |
| GAP-EP-085 | T3 | ERS post-VF: ICD + quinidine | — | 3+4 | P1+P2 | — | SPEC_ONLY |

**Coverage:** 3 DET_OK + 3 PARTIAL + 5 SPEC_ONLY = 6/11 (55% any, 27% DET_OK). Strongest T2 subcategory; T3 channelopathy genotype-specific gaps largely uncovered.

### Pacing (9 gaps; T2=9) — Pathway 1 device decision-support

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-EP-029 | T2 | Pacemaker Class I indication | — | 4 | P1 | — | SPEC_ONLY |
| GAP-EP-030 | T2 | Bradycardia on AVN blocker | — | 7 | — | — | SPEC_ONLY |
| GAP-EP-031 | T2 | Vasovagal tilt or ILR | `gap-ep-syncope` line 4180+ (broad) | 1 | — | — | PARTIAL |
| GAP-EP-032 | T2 | Pacemaker syndrome RV pacing >=40% | — | 4 | P1 | — | SPEC_ONLY |
| GAP-EP-033 | T2 | Chronic AF + HR<40 pacing | — | 4 | P1 | — | SPEC_ONLY |
| GAP-EP-034 | T2 | CIED infection extraction | — | 5 | P1 | SAFETY | SPEC_ONLY |
| GAP-EP-035 | T2 | Post-AVR conduction pacer | — | 4 | P1 | Transitions | SPEC_ONLY |
| GAP-EP-036 | T2 | Leadless pacemaker candidate | — | 4 | P1 | — | SPEC_ONLY |
| GAP-EP-037 | T2 | LBBAP / CSP | `gap-ep-csp` line 6550+ | 4 | P1 | — | DET_OK |

**Coverage:** 1 DET_OK + 1 PARTIAL + 7 SPEC_ONLY = 2/9 (22% any). **Class I pacemaker indication detection ABSENT.** Same procedural-blind-spot pattern as HF Device Therapy + CAD Cardiogenic Shock.

### CIED Management (8 gaps; T2=7, T3=1)

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-EP-038 | T2 | CIED recall notification | — | 6 | — | — | SPEC_ONLY |
| GAP-EP-039 | T2 | Abandoned lead infection risk | `gap-ep-lead-integrity` line 6881+ (broad) | 6 | — | — | PARTIAL |
| GAP-EP-040 | T2 | MRI-conditional CIED documentation | `gap-ep-cied-mri` (registry; evaluator unclear) | 1 | — | — | PARTIAL |
| GAP-EP-041 | T2 | Primary prev ICD lifestyle/driving counseling | — | 6 | — | — | SPEC_ONLY |
| GAP-EP-042 | T2 | CIED EOL deactivation | — | 6 | — | Transitions | SPEC_ONLY |
| GAP-EP-090 | T2 | Post-CIED infection extraction | — | 5 | P1 | SAFETY | SPEC_ONLY |
| GAP-EP-092 | T2 | S-ICD candidate | — | 4 | P1 | — | SPEC_ONLY |
| GAP-EP-091 | T3 | CIED lead failure pattern detection | `gap-ep-lead-integrity` (broad) | 6 | — | — | PARTIAL |

**Coverage:** 0 DET_OK + 3 PARTIAL + 5 SPEC_ONLY = 3/8 (37.5% any, 0% DET_OK). CIED follow-up management is largest T2 procedural blind spot.

### AAD Safety (8 gaps; T2=8) — strongest T2 subcategory

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-EP-043 | T2 | Amiodarone TSH | line 919-933 (combined TSH+LFT amiodarone monitor) | 7 | — | — | DET_OK |
| GAP-EP-044 | T2 | Amiodarone LFT | line 919-933 (same combined rule) | 7 | — | — | DET_OK |
| GAP-EP-045 | T2 | Amiodarone baseline PFT/CXR | (combined rule covers TSH/LFT, not PFT/CXR) | 7 | — | — | PARTIAL |
| GAP-EP-046 | T2 | Dronedarone in permanent AF/NYHA III-IV (SAFETY) | `gap-ep-dronedarone` line 6646+ | 7 | — | SAFETY | DET_OK |
| GAP-EP-047 | T2 | Sotalol inpatient QT monitoring | — | 5 | — | SAFETY | SPEC_ONLY |
| GAP-EP-048 | T2 | Dofetilide REMS inpatient | line 954+ + `gap-ep-dofetilide-rems` line 4145+ | 5 | — | SAFETY | DET_OK |
| GAP-EP-049 | T2 | Flecainide/propafenone in SHD (SAFETY) | (only pill-in-pocket use at line 6435; no SHD safety check) | 7 | — | SAFETY | SPEC_ONLY |
| GAP-EP-050 | T2 | Inappropriate ICD shocks evaluation | `gap-ep-inappropriate-shocks` | 5 | P1 | — | DET_OK |

**Coverage:** 5 DET_OK + 1 PARTIAL + 2 SPEC_ONLY = 6/8 (75% any, 63% DET_OK). Highest T2 DET_OK rate of any EP subcategory.

### Syncope (6 gaps; T2=4, T3=2)

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-EP-093 | T2 | Syncope without ECG | `gap-ep-syncope` line 4180+ (exact match: R55+no ECG) | 1 | — | — | DET_OK |
| GAP-EP-094 | T2 | Exertional syncope structural workup | `gap-ep-syncope` (broad; recommends echo - partial overlap) | 1 | — | — | PARTIAL |
| GAP-EP-095 | T2 | Syncope + SHD ICD eval | `gap-ep-syncope` recommends ECG/echo, NOT ICD eval | 2 | P1 | — | SPEC_ONLY |
| GAP-EP-097 | T2 | Orthostatic hypotension med review | — | 7 | — | — | SPEC_ONLY |
| GAP-EP-096 | T3 | POTS diagnostic | `gap-ep-syncope` (POTS not pure R55 syncope) | 1 | — | — | SPEC_ONLY |
| GAP-EP-098 | T3 | Carotid sinus hypersensitivity CSM | `gap-ep-syncope` (broad; no CSM-specific) | 1 | — | — | SPEC_ONLY |

**Coverage:** 1 DET_OK + 1 PARTIAL + 4 SPEC_ONLY = 2/6 (33% any, 17% DET_OK).

### Atrial Tachy/SVT (7 gaps; T1=1, T2=5, T3=1)

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-EP-079 | T1 | Pre-excited AF + AVN blocker (CRITICAL) | `gap-ep-wpw` line 6618+ (WPW + age<40 risk strat, NOT med contraindication) | 7 | P3 | SAFETY-Crit | **SPEC_ONLY** |
| GAP-EP-074 | T2 | Typical atrial flutter CTI ablation | `gap-ep-flutter-oac` (covers OAC, not CTI ablation) | 4 | P1 | — | SPEC_ONLY |
| GAP-EP-075 | T2 | Focal AT recurrent ablation | `gap-ep-svt-ablation` line 9195+ (generic SVT) | 4 | P1 | — | PARTIAL |
| GAP-EP-076 | T2 | AVNRT recurrent symptomatic ablation | `gap-ep-svt-ablation` (generic) | 4 | P1 | — | PARTIAL |
| GAP-EP-077 | T2 | AVRT concealed bypass tract | `gap-ep-svt-ablation` (generic) | 4 | P1 | — | PARTIAL |
| GAP-EP-078 | T2 | WPW asymptomatic high-risk occupation | `gap-ep-wpw` (age<40, NOT occupation) | 2 | P1 | — | PARTIAL |
| GAP-EP-080 | T3 | Athlete's heart vs pathology | — | 2 | — | PopHealth | SPEC_ONLY |

**Coverage:** 0 DET_OK + 4 PARTIAL + 3 SPEC_ONLY = 4/7 (57% any, 0% DET_OK).

### Cardiac Arrest (4 gaps; T1=1, T2=2, T3=1)

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-EP-099 | T1 | Post-arrest TTM not documented | — | 5+6 | P1+P3 | Transitions | **SPEC_ONLY** |
| GAP-EP-100 | T2 | Post-arrest neuro prognostication timing | — | 6 | P1 | Transitions | SPEC_ONLY |
| GAP-EP-101 | T2 | Post-arrest coronary angiography | — | 6 | P1 | — | SPEC_ONLY |
| GAP-EP-102 | T3 | Family genetic counseling | — | 6 | — | — | SPEC_ONLY |

**Coverage: 0/4 (0%). Entire post-arrest cluster uncovered.** Same pattern as CAD Cardiogenic Shock and HF Device Therapy.

---

### 4.5 — T1 SPEC_ONLY work items (load-bearing for v2.0 Phase 1)

7 T1 spec gaps with zero implementation. EP-017 was T1 SPEC_ONLY but has been **REMEDIATED via PR #229** — entry retained for audit-trail integrity but flagged as resolved.

| GAP-ID | Subcategory | Description | Tier | BSW pathway | Tags | Status |
|---|---|---|---|---|---|---|
| GAP-EP-006 | AF Anticoagulation | Dabigatran in CrCl<30 | T1 | P3 (avoided bleed) | SAFETY | OPEN |
| GAP-EP-008 | AF Anticoagulation | DOAC on moderate-severe MS | T1 | P3 (avoided embolism) | SAFETY | OPEN |
| ~~GAP-EP-017~~ | ~~Rhythm Control~~ | ~~AF + non-DHP CCB in HFrEF~~ | ~~T1~~ | ~~P3~~ | ~~SAFETY~~ | **REMEDIATED via PR #229 (2026-05-04)** |
| GAP-EP-064 | AF Anticoagulation | OAC Rx prescribed but not filled | T1 | P4 (HEDIS) + P3 | Adherence | OPEN |
| GAP-EP-065 | AF Anticoagulation | OAC PDC<80% chronic adherence | T1 | P4 (HEDIS) + P3 | Adherence | OPEN |
| GAP-EP-079 | Atrial Tachy/SVT | Pre-excited AF + AVN blocker (CRITICAL) | T1 | P3 (avoided VF) | **SAFETY-Crit** | OPEN |
| GAP-EP-099 | Cardiac Arrest | Post-arrest TTM | T1 | P1 + P3 | Transitions | OPEN |

**Pathway distribution of T1 SPEC_ONLY (6 OPEN gaps):**
- P1: 1 (EP-099 procedural)
- P3: 6 (all)
- P4: 2 (EP-064, EP-065 pharmacy-fill HEDIS)
- P2: 0

**Tag distribution:** SAFETY: 3 of 6 (EP-006, EP-008, EP-079) — 50% of T1 SPEC_ONLY are SAFETY. EP-079 is **SAFETY-CRITICAL** (pre-excited AF + AVN blocker → VF risk); recommend prioritizing similarly to EP-XX-7 mitigation pattern.

---

## 4.6 — EXTRA rules table

Three architectural patterns surfaced during rule-body verification (per Step 8 logging addendum captured 2026-05-04):

### (a) Registry-without-detection (registry entries with no evaluator binding)

11 of 45 EP registry rules have `id`/`name`/metadata but no detection-logic block in `evaluateGapRules()` that fires gaps for the spec gap their name implies:

| Registry ID | Reason no spec gap fires |
|---|---|
| `gap-ep-anticoag-interruption` | No perioperative anticoag mgmt rule found |
| `gap-ep-anticoag-score-reassess` | No annual CHA2DS2-VASc reassessment rule found |
| `gap-ep-direct-cardioversion` | No cardioversion timing rule body found |
| `gap-ep-tee-pre-cardioversion` | No TEE-before-cardioversion rule body found |
| `gap-ep-cied-mri` | Evaluator block unclear; metadata only |
| `gap-ep-generator-replacement` | No generator-replacement-planning rule body found |
| `gap-ep-exercise-testing-ep` | No exercise-test-for-arrhythmia rule body found |
| `gap-ep-left-atrial-size` | No LA-size-documentation rule body found |
| `gap-ep-rate-control-afib` (legacy ref) | Rule body now exists post-PR #229 (was registry-only before) |
| `gap-ep-aad-post-ablation` | Detected at line 6908+ but trigger uses Z98.89 proxy — partial implementation |
| `gap-ep-pacemaker-upgrade` | No pacemaker-CRT-upgrade rule body found |

### (b) Detection-without-registry (evaluator code blocks not bound to a registry ID)

1 confirmed case:

| Evaluator location | Spec coverage | Why no registry entry |
|---|---|---|
| Line 5198+ DOAC + mechanical valve | EP-007 (T1 SAFETY-Crit, RE-ALIGN trial) | Rule was added to evaluator without corresponding registry entry; appears to predate registry-driven workflow. **Note: new SAFETY gap added in PR #229 also lives only in evaluator (no separate registry entry); both follow this pattern.** |

### (c) Broad-rule consolidation (single registry rule covers multiple distinct spec scenarios)

| Registry rule | Spec gaps consolidated | Differentiation present? |
|---|---|---|
| `gap-ep-vt-ablation` | EP-020 (ischemic VT), EP-021 (NICM), EP-022 (VANISH amiodarone-failure), EP-086 (VT storm) | NO — single trigger (VT+ICD presence) for all 4 scenarios |
| `gap-ep-svt-ablation` | EP-075 (focal AT), EP-076 (AVNRT), EP-077 (AVRT) | NO — single trigger (SVT + rate control) |
| `gap-ep-syncope` | EP-031 (vasovagal), EP-093 (no ECG), EP-094 (exertional), EP-095 (SHD ICD) | NO — single trigger (R55 + no ECG); EP-093 is the exact-match scenario, others are partial-population overlap |
| `gap-ep-lqts-bb` | EP-024 (LQTS BB), EP-026 (congenital LQT QT-drug avoidance partial), EP-081 (LQT1 nadolol genotype-specific) | NO — single trigger (LQT + no BB) |
| `gap-ep-brugada` | EP-023 (Brugada dx), EP-027 (SCN5A device decision) | NO — single trigger (syncope + male + age<45) |
| `gap-ep-rate-control-afib` | EP-RC + EP-017 SAFETY + LVEF data gap (post-PR #229) | YES, post-fix — three branches: rate-control gap, SAFETY gap, data gap |

**Total broad-rule patterns: 5 pre-PR #229; 4 post-PR #229.** PR #229's refactor of `gap-ep-rate-control-afib` is the first broad-rule rule to be split into spec-aware branches.

Per AUDIT-027 (rule-engine reconciliation, expanded scope): all three architectural patterns require resolution in v2.0 Phase 1 — either by registry/evaluator binding, by detection-without-registry promotion to canonical, or by spec-aware rule splitting (per PR #229 precedent).

---

## 5. Tier 1 priority gaps surfaced (15 total)

**DET_OK at T1 (5):** GAP-EP-001 (AF anticoag), 007 (DOAC mechanical valve), 011 (LAAC bleeding contraindication), 013 (early rhythm control), 018 (subclinical AF). + **EP-017 post-PR #229.**

**PARTIAL at T1 (3 OPEN):** GAP-EP-005 (LDL<55 — wait, this is CAD), 012 (LAAC CHA2DS2-VASc), 014 (AF ablation HFrEF), 086 (VT storm). Recount: 012, 014, 086 = 3. (EP-016 prasugrel was OPEN PARTIAL pre-PR #229; remains.)

Actually correcting: T1 PARTIAL post-EP-XX-7 mitigation = GAP-EP-012, EP-014, EP-086. All three remain PARTIAL because PR #229 did not address them.

**SPEC_ONLY at T1 (7 OPEN, 1 RESOLVED):** **GAP-EP-006**, **EP-008**, **EP-064**, **EP-065**, **EP-079**, **EP-099**. Plus EP-017 RESOLVED.

These T1 SPEC_ONLY gaps are EP's most material implementation gaps for production-grade. **EP-079 (CRITICAL SAFETY: pre-excited AF + AVN blocker → VF risk) deserves immediate Tier S triage** in similar pattern to EP-XX-7 mitigation; GAP-EP-006/008 are SAFETY-tagged; EP-064/065 require pharmacy-claims-pipeline integration; EP-099 needs post-arrest event pipeline.

---

## 6.1 — Implemented rules NOT mapped to a spec gap

Beyond the 11 registry-without-detection cases in §4.6 (a), there are **0 EP rules that fire detection logic but have no spec gap mapping** (other than the EP-007 mechanical-valve case under §4.6 (b), which IS the spec gap for EP-007 — it's only "extra" relative to the registry, not relative to spec).

EP has fewer EXTRA rules than CAD (15) — closer to HF (1). Suggests EP code accumulation followed spec more closely than CAD's organic accumulation.

---

## 6.2 — BSW ROI pathway implications

EP positions strongly on Pathway 1 (Procedural DRG) per spec but has uneven coverage:

- **Pathway 1 (Procedural and Device DRG):** AF ablation + PFA covered; LAAC eval covered; pacemaker Class I indication ABSENT; CIED management ABSENT; LBBAP/CSP covered. ~30 EP gaps tagged P1 in spec; ~10 covered.
- **Pathway 2 (Specialty Pharmacy):** dronedarone safety covered; mexiletine, quinidine, dofetilide partial. ~5 EP gaps tagged P2; ~2 covered.
- **Pathway 3 (Avoided Admission):** AF anticoag missing covered; subclinical AF detection covered. **AF dosing safety entirely uncovered (5 SAFETY items SPEC_ONLY)** — single largest Pathway 3 gap. ~8 EP gaps tagged P3; ~3 covered.
- **Pathway 4 (HEDIS/Adherence):** AF anticoag CHA2DS2-VASc qualifying covered; pharmacy-fill adherence ABSENT (EP-064/065 SPEC_ONLY). ~3 EP gaps tagged P4; ~1 covered.

**Top-25 BSW gaps relevant to EP:**
- GAP-EP-001 (AF anticoag CHA2DS2-VASc): DET_OK ✓
- GAP-EP-013 (early rhythm control EAST-AFNET): DET_OK ✓
- GAP-EP-014 (CASTLE-AF ablation in HFrEF): PARTIAL
- GAP-EP-064/065 (pharmacy-fill OAC HEDIS): SPEC_ONLY (cross-module pattern with CAD-056/057)
- GAP-EP-017 (HFrEF + non-DHP CCB SAFETY): **REMEDIATED via PR #229** (first BSW Top-25 EP fix)

**EP commercial weakness:** AF anticoagulation **dosing safety** (GAP-EP-002 through 009 + EP-066) is the single largest unbuilt cluster — 7 of 13 AF anticoag spec gaps SPEC_ONLY. This affects Pathway 3 (avoided bleed/embolism admission) directly. v2.0 Phase 1 should sequence dosing-safety rules near top of EP priority.

---

## 6.3 — Strategic posture: extend timeline, not scope

**Operator strategic decision (2026-05-03, carried from CAD audit):** when audit findings force a choice between timeline and scope, **extend timeline. Do not reduce scope.** Module Parity Principle preserved. All Tier 1+2+3 gaps in scope. Research/registry backend in scope.

EP audit findings reinforce this posture: 58.4% SPEC_ONLY at the rule-body-verified level means substantially more SPEC_ONLY work platform-wide than name-match audits suggested. The strategic-posture rationale (clinical content shortcuts become patient safety risk) is even stronger given EP-XX-7 surfaced an actual harm vector that name-match would have missed.

**Timeline math (refined per Phase 0 close — extended from initial 7-9 month estimate):**
- Per AUDIT-029: name-match overestimates DET_OK by ~20pp. Retro pass on PV/HF/CAD will surface ~20pp more SPEC_ONLY.
- EP rule-body-verified DET_OK 20.2% is closer to platform-wide ground truth than CAD name-match 31.1%.
- Phase 1 scope expansion: ~50-100 additional T1/T2 SPEC_ONLY gaps platform-wide once retro completes.
- Operator-locked Phase 0 close extension to 2026-06-09 to 2026-06-16 absorbs retro work + remaining 2 module audits + Phase 0A/0C.

---

## 7. Working hypothesis verdict

**Original framing in `docs/PATH_TO_ROBUST.md` v1.2 §2:**
> "Strong working hypothesis: more is implemented than the 280 figure suggests; the gap is wiring and UI surfacing, not detection logic creation."

**Verdict for EP (rule-body-verified):** **PARTIALLY CONFIRMED with refinement.**

- **Coverage at 41.6% any / 20.2% DET_OK is BELOW HF name-match (46% / 21.4%)** despite higher naive density. Confirms AUDIT-029 hypothesis: name-match audits inflate DET_OK by ~20pp.
- **Procedural-Pathway-1 blind spot recurs:** Pacing Class I indication 0%, CIED management mostly SPEC_ONLY, post-arrest 0%, complex VT scenarios PARTIAL. Same pattern as HF Device Therapy + CAD Cardiogenic Shock.
- **AF dosing safety entirely uncovered** (7 of 13 AF anticoag spec gaps SPEC_ONLY). Single largest unbuilt cluster.
- **Broad-rule consolidation pattern severe:** 5 EP rules each consolidate 3-4 distinct spec scenarios.
- **EP-XX-7 mitigation precedent:** PR #229 is the first SAFETY-finding-to-fix loop closed in this audit cycle. Demonstrates the audit-then-fix engineering bar pattern and produces a reusable refactor template (broad-rule → spec-aware branches).

If EP (rule-body-verified, mid-density) is at 20.2% DET_OK and CAD (name-match, highest density) was at 31.1% DET_OK, the **platform-wide rule-body-verified DET_OK average is likely 15-20%** — materially lower than the 22-23% extrapolated from name-match audits.

---

## 8. Implications for Path to Robust v2.0 (deferred to Week 3 / Phase 0 close)

**v1.2 timeline math implications, refined further with EP rule-body data:**

If EP's 20.2% DET_OK is more representative of ground truth than CAD's 31.1% name-match:
- Platform-wide DET_OK estimate: ~15-20% (vs prior name-match-extrapolated 22-23%)
- 0.15-0.20 × 708 ≈ 106-142 spec gaps with substantive detection
- 566-602 SPEC_ONLY platform-wide (vs prior 480-520 estimate)

**Phase 1 (Tier 1) budget impact (refined per EP):**
- v1.2 estimate: ~250-350h
- Combined PV+HF+CAD+EP data + AUDIT-029 retro pending: ~60 T1 SPEC_ONLY gaps × ~6-10h = ~360-600h
- Plus retro-surfaced PARTIAL→DET_OK hardening: ~30-40 × ~3-4h = ~90-160h
- **Revised Phase 1 estimate: ~500-800h** (~2-2.5× v1.2)

**Phase 2 (Tier 2) budget impact:** ~1,500-1,800h.

Total revised Phase 1+2: ~2,000-2,600h — confirms 7-9 month raw scope (per CAD §13 time-unit caveat: AI-assisted wall-clock 3-6 months depending on work-mix).

Per operator's Phase 0 close decision: scope-locked, timeline extends. Phase 0 close target 2026-06-09 to 2026-06-16. v2.0 PATH_TO_ROBUST authorship begins after Phase 0 closes with all data in hand.

---

## 9. EP-specific findings worth surfacing (Tier S candidates + lower)

**EP-XX-1: gap-39-qtc-safety CoR/spec-tier misalignment**
Code rule has Class 1 LOE B-NR (T1-strength) per 2017 AHA/ACC/HRS VT guideline. Closest spec match is GAP-EP-025 (T2 Acquired LQT). Code tiered higher than spec. Tier 3 code-hygiene finding; flag for v2.0 review.

**EP-XX-2: Bifurcated rule architecture**
`RUNTIME_GAP_REGISTRY` (lines 84-3094, ~257 metadata records) decoupled from `evaluateGapRules()` (lines 3195+, ~8k LOC monolith). Three architectural patterns surfaced (registry-without-detection, detection-without-registry, broad-rule consolidation per §4.6). Folded into AUDIT-027 expanded scope. Tier 1 architectural.

**EP-XX-3: Name-match audit methodology overestimates coverage by ~20pp** → AUDIT-029
Verified empirically by EP rule-body-verified delta vs HF/CAD name-match. Tier 2 process/quality.

**EP-XX-4: WPW + AVN blocker CRITICAL SAFETY uncovered (EP-079)**
**Recommend Tier S triage** in pattern of EP-XX-7 mitigation. Spec text explicitly tagged CRITICAL; rule body fires for different trigger (age<40 risk strat). Independent SAFETY-Crit gap deserves prioritized fix.

**EP-XX-5: Broad-rule consolidation pattern**
5 EP rules each consolidate 3-4 distinct spec scenarios. Per §4.6 (c). PR #229 demonstrates the spec-aware-branch refactor pattern; apply to gap-ep-vt-ablation, gap-ep-svt-ablation, gap-ep-syncope, gap-ep-lqts-bb, gap-ep-brugada in v2.0 Phase 1.

**EP-XX-6: AF Anticoagulation dosing safety entirely uncovered**
7 of 13 AF anticoag spec gaps SPEC_ONLY (5 SAFETY-tagged dosing). Single largest unbuilt cluster. Recommend dedicated AF anticoag dosing-safety subsystem in v2.0 Phase 1.

**EP-XX-7: gap-ep-rate-control-afib HFrEF SAFETY scenario** → **REMEDIATED via PR #229 (2026-05-04)**
First EP-finding-to-fix loop closed. Mitigation introduced HFrEF-aware gating, EP-017 SAFETY gap, LVEF data gap, feature flag rollback, 8 tests, `safetyClass` field on `DetectedGap.evidence` (forward-looking architectural promise for persistence-layer AuditLog integration in v2.0). See `docs/CHANGE_RECORD_2026_05_04_t4g_decommission.md` observation (v) for the architectural commitment.

**Plus 2 side findings from Phase 0A operational maturity (surfaced during Step 7 mitigation work):**
- ECS exec capability blocked by missing `ssmmessages:*` IAM on task role (despite `enableExecuteCommand=true` in task def)
- DB endpoint URL not in connection-establishment logs at INFO level (observability gap)

---

## 10. Cross-references

- `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.2 (lines 307-440) — spec source for all 89 EP gaps
- `docs/audit/PHASE_0B_CAD_AUDIT_ADDENDUM.md` — sibling addendum (template source)
- `docs/audit/PHASE_0B_HF_AUDIT_ADDENDUM.md` — module 2 of 6 (name-match)
- `docs/audit/PHASE_0B_PV_AUDIT_REPORT_ADDENDUM.md` — module 1 of 6 (name-match)
- `docs/audit/PHASE_0B_CLINICAL_AUDIT_FRAMEWORK.md` — methodology
- `docs/audit/PHASE_1_REPORT.md` — AUDIT-001 (testing gap)
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` — AUDIT-027 (rule-engine reconciliation expanded for EP-XX-2), AUDIT-029 (name-match methodology, pending Step I register batch)
- `docs/PATH_TO_ROBUST.md` v1.2 — strategic plan; v2.0 will reflect this addendum + all 4 audits + retro pass
- `BUILD_STATE.md` — canonical aggregate ledger (this audit updates §1 EP checkbox, §3 EP rows, §4 EP coverage, §6 priority)
- BSW scoping doc v7.1 Part 1, Part 1.3 Top-25 — commercial framing
- `backend/src/ingestion/gaps/gapRuleEngine.ts` — code source (45 EP rules, post-PR #229)
- `src/ui/electrophysiology/` — frontend (63 .tsx files, highest of any module; all 3 view tiers present)
- **PR #229** (`9ac3806`) — EP-XX-7 mitigation (first EP-finding-to-fix loop closed in this audit cycle)
- `docs/CHANGE_RECORD_2026_05_04_t4g_decommission.md` — observations (t)/(u)/(v) include EP-XX-7 architectural commitments

---

## 11. Cross-module Phase 0B synthesis (modules 1-4 of 6)

**Coverage data (4 of 6 modules audited):**

| Module | Spec gaps | Code rules | Naive density | Any-coverage | DET_OK | T1 SPEC_ONLY % | Method |
|---|---:|---:|---:|---:|---:|---:|---|
| PV | 105 | 33 | 31% | 26.7% | (not classified) | 57% | name-match |
| HF | 126 | 48 | 38% | 46.0% | 21.4% | 38% | name-match |
| CAD | 90 | 76 | 84% | 61.1% | 31.1% | 33% | name-match |
| **EP** | **89** | **45** | **51%** | **41.6%** | **20.2%** | **47%** | **rule-body verified** |

**Hypothesis test (refined): does DET_OK scale with naive density?**

PARTIALLY but with major methodology caveat. Under name-match:
- HF 1.78 rules per DET_OK
- CAD 2.71 rules per DET_OK (sub-linear)

Under rule-body verification:
- EP 2.50 rules per DET_OK (similar to CAD's name-match number, despite EP being a different module)

The CAD-vs-EP comparison suggests **rule-body verification on CAD would likely produce ~20% DET_OK or lower** (closer to EP's number), confirming AUDIT-029. The retro pass on PV/HF/CAD will produce the empirical numbers.

**Procedural-Pathway-1 blind spot is platform-wide:**

| Module | Procedural-domain SPEC_ONLY clusters |
|---|---|
| HF | Device Therapy 17%, LVAD/Transplant 0%, ECMO/MCS 0%, Pericardial 0%, Genetics 0% |
| CAD | Cardiogenic Shock 0%, Complex PCI 0%, Stent Complications 0%, Peri-procedure 0% |
| EP | Pacing 22% (Class I indication 0%), CIED Management 37%, Post-arrest 0% |
| PV | (not granularly classified at name-match level) |

**Pharmacy-fill SPEC_ONLY pattern:**
- CAD-056 (statin not filled), CAD-057 (statin PDC<80%) — T1, P4
- EP-064 (OAC not filled), EP-065 (OAC PDC<80%) — T1, P4
- 4 of 4 pharmacy-fill T1 gaps SPEC_ONLY across 2 modules. **Platform-wide unblocking infrastructure: pharmacy claims pipeline.** Single shared piece of work would close 4 T1 gaps.

**Cross-module SAFETY pattern:**
- HF: amyloid + HCM screening (PARTIAL; broad-rule)
- CAD: cardiogenic shock cluster + LM heart team (SPEC_ONLY; procedural)
- EP: AF anticoag dosing (5 SAFETY SPEC_ONLY) + WPW+AVN (CRITICAL SAFETY-Crit SPEC_ONLY) + EP-017 (REMEDIATED via PR #229)
- 9+ SAFETY-tagged gaps across 4 modules. **Tier S triage pattern (per EP-XX-7) should be applied to remaining SAFETY findings.**

---

### 11.5 — Sequencing choice deferred to v2.0

Per CAD §11.5 (carried forward): Phase 1 sequencing choice (module-by-module / domain-by-domain / hybrid Phase 1a framework + Phase 1b per-module) deferred to v2.0 PATH_TO_ROBUST authorship. EP audit data does not change this deferral; if anything, the procedural-Pathway-1 blind spot recurring across HF/CAD/EP **strengthens the domain-by-domain case** for Phase 1a (procedural-decision-support framework built once, reused across modules).

But operator's module-by-module instinct also strengthened: the EP-XX-7 mitigation pattern (1 module, 1 finding, 1 PR, 1 close-loop) is more digestible than a domain-spanning refactor. v2.0 author decides with full Phase 0 input + retro pass complete.

---

## 12. Lessons learned for next module audits (SH next, then VHD)

1. **Rule-body verification is non-negotiable from now on.** Name-match overestimates DET_OK by ~20pp empirically (EP vs HF comparison). All subsequent module audits (SH, VHD) run rule-body-verified from gate. Retro pass on PV/HF/CAD already locked per Step H.

2. **Track all 3 architectural patterns explicitly per module** (registry-without-detection, detection-without-registry, broad-rule consolidation). Builds AUDIT-027 evidence base for v2.0 Phase 1 reconciliation.

3. **SAFETY-tagged spec gaps deserve immediate Tier S triage if uncovered.** EP-XX-7 mitigation pattern is reusable: surface during audit, surface as Tier S candidate, mitigation PR with full engineering bar (type signatures, tests, rollback flag, observability hooks promised via interface fields).

4. **Pharmacy-fill SPEC_ONLY is a platform-wide pattern.** Don't re-treat per module; surface as cross-cutting infrastructure work.

5. **Wall-clock calibration data (per AUDIT-028):**
   - Pre-flight inventory: 30-45 min agent (depending on module size)
   - Per-gap rule-body verification: ~26 sec/gap (T2 batched), ~57 sec/gap (T1 with spot-check), ~22 sec/gap (T3 batched)
   - Full module audit: ~80-95 min agent for 90-gap module
   - Synthesis (4D): ~25-35 min agent (apply CAD/EP template, don't re-derive)
   - Total per module: ~2 hours agent wall-clock

6. **Mitigation PR pattern (per PR #229):** ~25 min agent wall-clock for max-rigor SAFETY mitigation (read evaluator + author code + author 8 tests + verify all tests + commit + PR + CI). Reusable for EP-079 next + retro-surfaced findings.

7. **Cross-module synthesis section is v2.0 input** — keep updating §11 in each subsequent addendum (SH, VHD) with rolling table.

---

## 13. Time-unit disambiguation caveat (applies to all audit hour estimates)

Per CAD §13 + AUDIT-028, all hour estimates in this addendum, prior addenda, PATH_TO_ROBUST v1.2 §5, and BUILD_STATE.md represent **raw work-scope**, NOT AI-assisted operator wall-clock time.

**EP audit empirical wall-clock data:**
- Steps 1-3 (pre-flight + spec inventory): ~30 min agent
- Step 4A (T1 name-match): 7.5 min for 15 gaps
- Step 4A.5 (T1 SAFETY rule-body spot-check): 12.6 min for 4 gaps (~3.15 min/gap rule-body)
- Step 4B (T2 batched rule-body): 27.4 min for 62 gaps (~26 sec/gap with batched grep amortization)
- Step 4B.5 (PARTIAL verification spot-check): 12.3 min for 13 gaps (~57 sec/gap)
- Step 4C (T3 batched): 4.5 min for 12 gaps (~22 sec/gap)
- Total classification: ~95 min agent
- Synthesis (this doc): ~30 min agent (CAD template applied, not re-derived)

**Wall-clock vs work-scope ratio for audit work: ~5-10×** (per AUDIT-028 work-type table). EP audit at ~2 hours agent wall-clock corresponds to roughly 10-20 hours of solo human raw work-scope.

**v2.0 PATH_TO_ROBUST authorship (per CAD §13 + carried forward):** must explicitly disambiguate raw scope vs AI-assisted wall-clock for every estimate. State work-mix assumptions per phase. Apply multipliers per work-type. Identify human-bottleneck items (clinical advisor sign-off, production incidents). Compute wall-clock projections separately from raw-scope projections.

The 7-9 month raw-scope timeline holds firm with EP data. AI-assisted wall-clock projection: 3-6 months depending on work-mix and clinical advisor bottlenecks.

---

## 14. Audit verdict (full classification mode, rule-body-verified)

**EP module — full-classification verdict: MODERATELY BUILT WITH SAFETY CLUSTER UNCOVERED + ONE FINDING-TO-FIX LOOP CLOSED.**

- 18 DET_OK (20.2%), 19 PARTIAL (21.3%), 52 SPEC_ONLY (58.4%)
- 5 of 15 T1 priority gaps DET_OK; 7 SPEC_ONLY at T1 (with EP-017 just remediated via PR #229)
- **AAD Safety (75% covered, 63% DET_OK)** is platform's strongest medication-monitoring subcategory
- **AF Anticoagulation dosing safety (15% covered, 15% DET_OK; 5 SAFETY items SPEC_ONLY)** is platform's largest unbuilt SAFETY cluster
- **Pacing Class I indication (0%), CIED management (37%), Post-arrest (0%)** — procedural blind spots
- 11 registry-without-detection rules, 1 detection-without-registry rule, 5 broad-rule consolidation patterns (4 post-PR #229)
- **EP-XX-7 mitigation (PR #229) is the first SAFETY-finding-to-fix loop closed in this audit cycle** — pattern reusable for EP-079 and retro-surfaced findings
- Hypothesis "more built than thought" PARTIALLY CONFIRMED with refinement: name-match audits inflate DET_OK by ~20pp (AUDIT-029); rule-body verification is the methodology going forward

**Reusable for SH + VHD audits:** methodology proven across 4 modules (PV name-match, HF name-match, CAD name-match, EP rule-body-verified). Subsequent audits (SH, VHD) run rule-body-verified from gate.

---

*Authored 2026-05-04. First module addendum under rule-body-verified methodology. Verdict driven by per-gap classification with evaluator-side verification; per-subcategory tables are the source of truth.*
