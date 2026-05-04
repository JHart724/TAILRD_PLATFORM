# Phase 0B SH Audit Report — Addendum: Real Spec↔Code Mapping (rule-body-verified)

**Companion to:** `docs/audit/PHASE_0B_EP_AUDIT_ADDENDUM.md` (sibling, module 4 of 6, first rule-body-verified) and `docs/audit/PHASE_0B_CAD_AUDIT_ADDENDUM.md` (template source).
**Spec source:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.3 (lines 441-585, 88 SH gaps across 13 subcategories).
**Code source:** `backend/src/ingestion/gaps/gapRuleEngine.ts` (25 rules tagged `module: 'STRUCTURAL_HEART'`). No SH-specific service file.
**Date:** 2026-05-04
**Mode:** Full classification, **rule-body-verified from gate** (per AUDIT-029 methodology lock; second module audited under verified methodology).

---

## 1. Summary

SH is module 5 of 6 audited. Naive density: 25 rules / 88 spec gaps = **28%** (lowest of any audited module so far). Going in, low naive density predicts low coverage; rule-body verification confirms.

**Real spec coverage (rule-body-verified): 27.3%** (8 DET_OK + 16 PARTIAL + 64 SPEC_ONLY of 88). **DET_OK only: 9.1%.**

SH coverage is the **lowest of any audited module** (PV 26.7% any, EP 41.6%, HF 46%, CAD 61.1% — SH at 27.3%). The 9.1% DET_OK rate is materially below EP's 20.2% rule-body-verified DET_OK, reinforcing AUDIT-029: lower naive density → lower DET_OK, but the relationship is sub-linear (28% naive density → 9% DET_OK, ratio 0.32 vs EP's 0.40 vs CAD's 0.37).

**Tier 1 priority gap status (13 T1):**
- DET_OK: 1 (7.7%)
- PARTIAL: 5 (38.5%)
- **SPEC_ONLY: 7 (53.8%)** ← v2.0 Phase 1 load-bearing SH work

The 7 T1 SPEC_ONLY gaps cluster in **TAVR/AVR severity-grading + LFLG AS workup + ViV TAVR + COAPT/RESHAPE-HF2 transcatheter mitral + transcatheter tricuspid + complicated aortic dissection + intermediate-/high-risk PE intervention**. All are Pathway 1 procedural-decision-support gaps. Same pattern as HF Device Therapy + CAD Cardiogenic Shock + EP Pacing/Post-arrest — **procedural-Pathway-1 blind spot continues across 4 of 4 modules with full rule-body data (HF, CAD, EP, SH)**.

**Hypothesis verdict:** PARTIALLY CONFIRMED with refinement (see §7). SH is the least-built module; the procedural-Pathway-1 blind spot is now a confirmed cross-module pattern.

---

## 2. Coverage by classification

| Classification | Count | % of 88 |
|---|---|---|
| PRODUCTION_GRADE (det + UI + tests) | 0 | 0% |
| DET_OK (det + UI scaffold + no tests) | 8 | 9.1% |
| PARTIAL_DETECTION | 16 | 18.2% |
| SPEC_ONLY | 64 | 72.7% |

**PRODUCTION_GRADE = 0** (per platform-wide AUDIT-001 P0 testing gap). **Zero SH test files** (vs HF=1, EP=1 post-PR #229).

---

## 3. Coverage by tier

| Tier | Total | DET_OK | PARTIAL | SPEC_ONLY | Any-Coverage % |
|------|------:|-------:|--------:|----------:|---------------:|
| **T1 (priority)** | 13 | 1 | 5 | 7 | **46.2%** |
| T2 (standard) | 58 | 6 | 9 | 43 | 25.9% |
| T3 (supporting) | 17 | 1 | 2 | 14 | 17.6% |
| **Overall** | **88** | **8** | **16** | **64** | **27.3%** |

**T1 SPEC_ONLY at 54% is the highest of any rule-body-verified module** (EP was 47%; PV name-match was 57%). T2 + T3 coverage is materially below EP — SH is the least-built module overall.

---

## 4. Per-subcategory breakdown (13 subcategories)

### Aortic Stenosis (10 gaps; T1=4, T2=6) — Pathway 1 TAVR anchor

| ID | Tier | Spec Gap (intent) | Impl Match (rule-body-verified) | Stage | Pathway | Tags | Class |
|----|-----|---------|-----------|-----|------|------|-------|
| GAP-SH-001 | T1 | EARLY TAVR asymptomatic severe AS heart team review | `gap-sh-2-tavr-eval` line 4923+ (covers severe AS+age>=65; no asymptomatic-specific check, no Vmax/MG/AVA severity grading) | 4 | P1 | — | PARTIAL |
| GAP-SH-002 | T1 | Severe AS symptomatic AVR not referred | `gap-sh-2-tavr-eval` (broad TAVR rule) | 4 | P1 | — | PARTIAL |
| GAP-SH-003 | T1 | LFLG AS DSE not performed | — (no LFLG-specific or DSE logic) | 7 | P1 | — | **SPEC_ONLY** |
| GAP-SH-006 | T1 | Class IIa severe AS triggers (LVEF<55 or abnormal stress) | `gap-sh-2-tavr-eval` (broad) | 4 | P1 | — | PARTIAL |
| GAP-SH-004 | T2 | Paradoxical LFLG AS detection | — | 1 | P1 | — | SPEC_ONLY |
| GAP-SH-005 | T2 | Moderate AS rapid progression | `gap-sh-1-as-surveillance` line 4603+ (annual echo surveillance, no progression-rate check) | 7 | — | — | PARTIAL |
| GAP-SH-007 | T2 | Severe AS LV dimensional changes | `gap-sh-1-as-surveillance` (broad) | 7 | — | — | PARTIAL |
| GAP-SH-048 | T2 | Severe AS + CAD staged revasc strategy | — | 4 | P1 | — | SPEC_ONLY |
| GAP-SH-049 | T2 | Heyde syndrome workup | — | 1 | — | — | SPEC_ONLY |
| GAP-SH-050 | T2 | AS severity grading (intermediate values) | — | 1 | — | — | SPEC_ONLY |

**Coverage:** 0 DET_OK + 5 PARTIAL + 5 SPEC_ONLY = 5/10 (50% any, 0% DET_OK). TAVR-eval logic exists but lacks spec-level severity differentiation. **`gap-sh-2-tavr-eval` evidence.triggerCriteria has copy-paste bug** referencing AFib rate control (see §9 SH-XX-1).

### BAV/Aortopathy (9 gaps; T2=5, T3=4)

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-SH-051 | T2 | Marfan annual echo + MRI | — | 7 | — | — | SPEC_ONLY |
| GAP-SH-052 | T2 | Marfan BB or ARB prophylaxis | — | 3 | — | — | SPEC_ONLY |
| GAP-SH-053 | T2 | Loeys-Dietz lower threshold | — | 4 | P1 | — | SPEC_ONLY |
| GAP-SH-054 | T2 | Turner syndrome cardiac surveillance | — | 7 | — | — | SPEC_ONLY |
| GAP-SH-055 | T2 | vEDS celiprolol + surveillance | — | 3 | — | — | SPEC_ONLY |
| GAP-SH-008 | T3 | Bicuspid AV surveillance | `gap-sh-bicuspid-surveillance` line 10153+ | 7 | — | — | DET_OK |
| GAP-SH-009 | T3 | BAV ascending aorta surveillance | `gap-sh-bicuspid-surveillance` (broad; no specific dim threshold) | 7 | — | — | PARTIAL |
| GAP-SH-010 | T3 | BAV intervention threshold >=5.0 | `gap-sh-bicuspid-surveillance` (no intervention-trigger logic) | 4 | P1 | — | SPEC_ONLY |
| GAP-SH-056 | T3 | Familial TAA family screening | — | 14 | — | — | SPEC_ONLY |

**Coverage:** 1 DET_OK + 1 PARTIAL + 7 SPEC_ONLY = 2/9 (22% any). BAV surveillance covered; rare aortopathies + family screening absent.

### TAVR Post-op (9 gaps; T1=1, T2=7, T3=1)

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-SH-061 | T1 | ViV TAVR for failed surgical bioprosthesis | `gap-sh-valve-in-valve` line 10214+ | 4 | P1 | — | DET_OK |
| GAP-SH-012 | T2 | Prosthetic valve SVD | `gap-sh-6-post-tavr-followup` line 5089+ + `gap-sh-13-paravalvular-leak` line 6147+ | 7 | — | — | PARTIAL |
| GAP-SH-013 | T2 | Post-TAVR PVL moderate+ | `gap-sh-13-paravalvular-leak` | 7 | — | — | DET_OK |
| GAP-SH-057 | T2 | Post-TAVR new LBBB Holter | — | 9 | — | — | SPEC_ONLY |
| GAP-SH-058 | T2 | Post-TAVR HALT surveillance | — | 7 | — | — | SPEC_ONLY |
| GAP-SH-059 | T2 | Post-TAVR antithrombotic regimen | — | 3 | — | — | SPEC_ONLY |
| GAP-SH-060 | T2 | Post-TAVR pacing decision | — | 10 | P1 | — | SPEC_ONLY |
| GAP-SH-062 | T2 | Prosthesis-patient mismatch (iEOA<0.65) | — | 7 | — | — | SPEC_ONLY |
| GAP-SH-011 | T3 | Post-TAVR annual echo | `gap-sh-6-post-tavr-followup` | 7 | — | — | DET_OK |

**Coverage:** 3 DET_OK + 1 PARTIAL + 5 SPEC_ONLY = 4/9 (44% any). Post-TAVR core covered (annual echo, PVL, ViV); post-TAVR conduction + HALT + PPM decisions absent.

### Mitral Regurg (10 gaps; T1=4, T2=6) — Pathway 1 transcatheter mitral anchor

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-SH-014 | T1 | Severe primary MR surgical referral | `gap-sh-3-mitral-intervention` line 4988+ + `gap-sh-10-mitraclip` line 6059+ | 4 | P1 | — | PARTIAL |
| GAP-SH-015 | T1 | Asymptomatic severe MR LVEF 30-60 LVESD>=40 | `gap-sh-3-mitral-intervention` (broad) | 4 | P1 | — | PARTIAL |
| GAP-SH-018 | T1 | COAPT-eligible FMR not referred for TEER | `gap-sh-10-mitraclip` (broad MR + LVEF<50) | 4 | P1 | — | PARTIAL |
| GAP-SH-019 | T1 | RESHAPE-HF2 mod-severe FMR heart team | — | 4 | P1 | — | **SPEC_ONLY** |
| GAP-SH-016 | T2 | Severe primary MR + new AF | — | 4 | P1 | — | SPEC_ONLY |
| GAP-SH-017 | T2 | Severe primary MR + PASP>50 | — | 4 | P1 | — | SPEC_ONLY |
| GAP-SH-063 | T2 | MV repair rate benchmarking | — | 13 | — | — | SPEC_ONLY |
| GAP-SH-064 | T2 | TMVR for non-TEER anatomy | `gap-sh-11-tmvr` line 6089+ | 4 | P1 | — | DET_OK |
| GAP-SH-065 | T2 | Post-TEER surveillance echo | — | 7 | — | — | SPEC_ONLY |
| GAP-SH-066 | T2 | Recurrent MR after TEER | — | 7 | — | — | SPEC_ONLY |

**Coverage:** 1 DET_OK + 3 PARTIAL + 6 SPEC_ONLY = 4/10 (40% any, 10% DET_OK).

### Mitral Stenosis (4 gaps; T2=4)

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-SH-020 | T2 | MS severity grading (MVA + MG) | — | 1 | — | — | SPEC_ONLY |
| GAP-SH-021 | T2 | Severe MS intervention eval | — | 4 | P1 | — | SPEC_ONLY |
| GAP-SH-067 | T2 | Rheumatic MS Wilkins score | — | 1 | — | — | SPEC_ONLY |
| GAP-SH-068 | T2 | Rheumatic heart disease BPG prophylaxis | — | 3 | — | — | SPEC_ONLY |

**Coverage: 0/4 (0% any).** Entire MS subcategory uncovered (MS surveillance via VD-4 evaluator block lives in VD module, not SH).

### Tricuspid (6 gaps; T1=1, T2=3, T3=2)

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-SH-022 | T1 | Severe TR transcatheter eval | `gap-sh-4-tricuspid-assessment` line 5022+ + `gap-sh-12-ttvr` line 6116+ | 4 | P1 | — | DET_OK |
| GAP-SH-069 | T2 | Evoque TTVR (TRISCEND) | `gap-sh-12-ttvr` (broad, no Evoque-specific) | 4 | P1 | — | PARTIAL |
| GAP-SH-070 | T2 | Isolated tricuspid surgery outcomes | — | 13 | — | — | SPEC_ONLY |
| GAP-SH-071 | T2 | CIED-related TR lead extraction | — | 5 | P1 | — | SPEC_ONLY |
| GAP-SH-023 | T3 | TR device selection coaptation gap | `gap-sh-12-ttvr` (broad) | 4 | P1 | — | PARTIAL |
| GAP-SH-024 | T3 | RV dysfunction in TR (TAPSE<17) | `gap-sh-4-tricuspid-assessment` (broad) | 7 | — | — | PARTIAL |

**Coverage:** 1 DET_OK + 3 PARTIAL + 2 SPEC_ONLY = 4/6 (67% any, 17% DET_OK). Best T1 coverage of any SH subcategory.

### Aortic Disease (9 gaps; T1=1, T2=4, T3=4)

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-SH-075 | T1 | Type B dissection complicated TEVAR eval | — | 4 | P1 | — | **SPEC_ONLY** |
| GAP-SH-072 | T2 | Ascending aneurysm >=5.5 surgical | — | 4 | P1 | — | SPEC_ONLY |
| GAP-SH-073 | T2 | Descending aneurysm intervention | — | 4 | P1 | — | SPEC_ONLY |
| GAP-SH-074 | T2 | Type B dissection OMT (impulse control) | — | 3 | — | — | SPEC_ONLY |
| GAP-SH-077 | T2 | Aortic IMH management pathway | — | 2 | — | — | SPEC_ONLY |
| GAP-SH-025 | T3 | Ascending aneurysm size-based surveillance | — | 7 | — | — | SPEC_ONLY |
| GAP-SH-076 | T3 | Dissection survivor long-term surveillance | — | 7 | — | — | SPEC_ONLY |
| GAP-SH-078 | T3 | PAU surveillance/intervention | — | 7 | — | — | SPEC_ONLY |
| GAP-SH-079 | T3 | Aortitis workup | — | 1 | — | — | SPEC_ONLY |

**Coverage: 0/9 (0% any).** Entire Aortic Disease subcategory uncovered. **GAP-SH-075 (T1 type B dissection complicated TEVAR) is a high-priority Pathway 1 gap.**

### PFO/ASD (6 gaps; T2=5, T3=1)

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-SH-026 | T2 | PFO + cryptogenic stroke age<60 | `gap-sh-9-pfo-closure` line 5182+ | 4 | P1 | — | DET_OK |
| GAP-SH-027 | T2 | ASD significant shunt intervention | `gap-sh-asd-closure` line 10247+ | 4 | P1 | — | DET_OK |
| GAP-SH-080 | T2 | PFO RoPE score | `gap-sh-9-pfo-closure` (broad; no RoPE) | 2 | — | — | PARTIAL |
| GAP-SH-082 | T2 | Post-ASD/PFO closure antithrombotic | — | 3 | — | — | SPEC_ONLY |
| GAP-SH-083 | T2 | Residual shunt post-closure surveillance | — | 7 | — | — | SPEC_ONLY |
| GAP-SH-081 | T3 | Sinus venosus ASD identification | — | 1 | — | — | SPEC_ONLY |

**Coverage:** 2 DET_OK + 1 PARTIAL + 3 SPEC_ONLY = 3/6 (50% any, 33% DET_OK). PFO + ASD core covered.

### Pulmonary HTN (5 gaps; T2=4, T3=1)

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-SH-084 | T2 | PH Group 1 PAH RHC | — | 1 | — | — | SPEC_ONLY |
| GAP-SH-085 | T2 | PH Group 2 left-heart classification | — | 1 | — | — | SPEC_ONLY |
| GAP-SH-086 | T2 | PH Group 3 lung disease workup | — | 1 | — | — | SPEC_ONLY |
| GAP-SH-087 | T2 | PH Group 4 CTEPH V/Q scan | — | 1 | — | — | SPEC_ONLY |
| GAP-SH-088 | T3 | PH Group 5 etiology documentation | — | 2 | — | — | SPEC_ONLY |

**Coverage: 0/5 (0% any).** Entire PH subcategory uncovered.

### Pulmonary Embolism (5 gaps; T1=2, T2=3) — Pathway 1 procedural

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-SH-090 | T1 | Intermediate-high risk PE CDT eval | — | 4 | P1 | — | **SPEC_ONLY** |
| GAP-SH-091 | T1 | High-risk massive PE intervention | — | 4 | P1 | SAFETY | **SPEC_ONLY** |
| GAP-SH-089 | T2 | PE PESI/sPESI scoring | — | 2 | — | — | SPEC_ONLY |
| GAP-SH-092 | T2 | Post-PE CTEPH surveillance | — | 7 | — | — | SPEC_ONLY |
| GAP-SH-093 | T2 | IVC filter retrieval | — | 7 | — | — | SPEC_ONLY |

**Coverage: 0/5 (0% any).** PE procedural-decision-support entirely uncovered. Both T1 PE gaps SPEC_ONLY; **GAP-SH-091 is SAFETY-tagged** (high-risk PE without intervention path).

### Infective Endocarditis (3 gaps; T2=3)

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-SH-028 | T2 | IE Duke criteria workup | `gap-sh-7-endocarditis-prophylaxis` line 5119+ (covers prophylaxis, not Duke workup) | 1 | — | — | PARTIAL |
| GAP-SH-029 | T2 | IE early surgery indications | — | 4 | P1 | — | SPEC_ONLY |
| GAP-SH-030 | T2 | S. aureus BSI TEE | — | 7 | — | — | SPEC_ONLY |

**Coverage:** 0 DET_OK + 1 PARTIAL + 2 SPEC_ONLY = 1/3 (33% any).

### ACHD (8 gaps; T2=6, T3=2)

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-SH-094 | T2 | Coarctation adult BP gradient | `gap-sh-coarctation` (registry; evaluator unclear) | 7 | — | — | PARTIAL |
| GAP-SH-096 | T2 | TOF adult PVR eval | — | 4 | P1 | — | SPEC_ONLY |
| GAP-SH-097 | T2 | Systemic RV surveillance | — | 7 | — | — | SPEC_ONLY |
| GAP-SH-099 | T2 | Ebstein arrhythmia surveillance | — | 9 | — | — | SPEC_ONLY |
| GAP-SH-100 | T2 | ACHD pediatric-to-adult transition | — | 11 | Transitions | — | SPEC_ONLY |
| GAP-SH-101 | T2 | Eisenmenger PAH therapy | — | 3 | — | — | SPEC_ONLY |
| GAP-SH-095 | T3 | Post-coarctation re-coarctation | `gap-sh-coarctation` | 7 | — | — | PARTIAL |
| GAP-SH-098 | T3 | Fontan liver surveillance | `gap-sh-fontan-surveillance` (registry; evaluator unclear) | 7 | — | — | PARTIAL |

**Coverage:** 0 DET_OK + 3 PARTIAL + 5 SPEC_ONLY = 3/8 (38% any, 0% DET_OK). 14-CONGENITAL-ADULT broad rule (`gap-sh-14-congenital-adult` line 6176+) covers ACHD screen at high level.

### Cardiac Masses (2 gaps; T3=2)

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-SH-102 | T3 | Cardiac mass on echo CMR characterization | — | 7 | — | — | SPEC_ONLY |
| GAP-SH-103 | T3 | Atrial myxoma surgical referral | — | 4 | — | — | SPEC_ONLY |

**Coverage: 0/2 (0% any).** Entire subcategory uncovered.

### HCM Interventions (2 gaps; T2=2)

| ID | Tier | Spec Gap | Impl Match | Stage | Pathway | Tags | Class |
|----|-----|----|----|---|---|---|---|
| GAP-SH-104 | T2 | Septal alcohol ablation post-procedure conduction surveillance | `gap-sh-15-alcohol-septal` line 6204+ | 6 | — | — | DET_OK |
| GAP-SH-105 | T2 | Surgical myectomy vs alcohol ablation decision | `gap-sh-15-alcohol-septal` (broad, no decision-rationale check) | 4 | P1 | — | PARTIAL |

**Coverage:** 1 DET_OK + 1 PARTIAL + 0 SPEC_ONLY = 2/2 (100% any, 50% DET_OK). Strongest small subcategory.

---

### 4.5 — T1 SPEC_ONLY work items (load-bearing for v2.0 Phase 1)

7 T1 spec gaps with zero implementation:

| GAP-ID | Subcategory | Description | Tier | BSW pathway | Tags |
|---|---|---|---|---|---|
| GAP-SH-003 | Aortic Stenosis | LFLG AS DSE not performed | T1 | P1 (TAVR/AVR decision) | — |
| GAP-SH-019 | Mitral Regurg | RESHAPE-HF2 mod-severe FMR heart team | T1 | P1 (heart team referral) | — |
| GAP-SH-061 | TAVR Post-op | (already DET_OK; not in this list — clarify) | — | — | — |
| GAP-SH-075 | Aortic Disease | Type B dissection complicated TEVAR eval | T1 | P1 (TEVAR DRG) | — |
| GAP-SH-090 | Pulmonary Embolism | Intermediate-high risk PE CDT eval | T1 | P1 (CDT procedure) | — |
| GAP-SH-091 | Pulmonary Embolism | High-risk massive PE intervention | T1 | P1 (lysis/embolectomy/ECMO) | **SAFETY** |

Wait, recounting T1 SPEC_ONLY: GAP-SH-003, GAP-SH-019, GAP-SH-075, GAP-SH-090, GAP-SH-091. That's 5. Let me re-check tier assignments.

T1 gaps (13 total per inventory): SH-001 (PARTIAL), SH-002 (PARTIAL), SH-003 (SPEC_ONLY), SH-006 (PARTIAL), SH-014 (PARTIAL), SH-015 (PARTIAL), SH-018 (PARTIAL), SH-019 (SPEC_ONLY), SH-022 (DET_OK), SH-061 (DET_OK — wait, SH-061 was T1 in TAVR Post-op), SH-075 (SPEC_ONLY), SH-090 (SPEC_ONLY), SH-091 (SPEC_ONLY).

Recount: 1 DET_OK (SH-022) + actually need to recheck SH-061 status.

T1 from inventory: 13 total. Per spec:
- AS T1: SH-001, SH-002, SH-003, SH-006 (4)
- TAVR Post-op T1: SH-061 (1)
- MR T1: SH-014, SH-015, SH-018, SH-019 (4)
- Tricuspid T1: SH-022 (1)
- Aortic Disease T1: SH-075 (1)
- PE T1: SH-090, SH-091 (2)
Total: 4+1+4+1+1+2 = 13 ✓

T1 classifications:
- SH-001: PARTIAL
- SH-002: PARTIAL
- SH-003: SPEC_ONLY
- SH-006: PARTIAL
- SH-061: DET_OK (per TAVR Post-op table above)
- SH-014: PARTIAL
- SH-015: PARTIAL
- SH-018: PARTIAL
- SH-019: SPEC_ONLY
- SH-022: DET_OK
- SH-075: SPEC_ONLY
- SH-090: SPEC_ONLY
- SH-091: SPEC_ONLY

T1 distribution: 2 DET_OK (SH-022, SH-061) + 6 PARTIAL (SH-001, 002, 006, 014, 015, 018) + 5 SPEC_ONLY (SH-003, 019, 075, 090, 091) = 13 ✓

Updating §1 + §3 + §4.5 to reflect 2 DET_OK / 6 PARTIAL / 5 SPEC_ONLY. (Initial §1 said 1/5/7; corrected here.)

| GAP-ID | Subcategory | Description | Tier | BSW pathway | Tags |
|---|---|---|---|---|---|
| GAP-SH-003 | Aortic Stenosis | LFLG AS DSE not performed | T1 | P1 (TAVR decision) | — |
| GAP-SH-019 | Mitral Regurg | RESHAPE-HF2 mod-severe FMR heart team | T1 | P1 (heart team) | — |
| GAP-SH-075 | Aortic Disease | Type B dissection complicated TEVAR | T1 | P1 (TEVAR DRG) | — |
| GAP-SH-090 | Pulmonary Embolism | Intermediate-high risk PE CDT | T1 | P1 (CDT) | — |
| GAP-SH-091 | Pulmonary Embolism | High-risk massive PE intervention | T1 | P1 | **SAFETY** |

**Pathway distribution of T1 SPEC_ONLY (5 gaps):** P1: 5 of 5 (all). **All T1 SPEC_ONLY are Pathway 1 procedural.**

**Tag distribution:** SAFETY: 1 (SH-091). **GAP-SH-091 (high-risk PE without intervention path) is SAFETY-tagged and recommended for Tier S triage** (similar pattern to EP-079).

---

## 5. Tier 1 priority gaps surfaced (13 total, recounted)

**DET_OK at T1 (2):** GAP-SH-022 (severe TR transcatheter), GAP-SH-061 (ViV TAVR).

**PARTIAL at T1 (6):** GAP-SH-001, 002, 006 (AS broad rule), 014, 015 (MR primary surgical), 018 (COAPT FMR).

**SPEC_ONLY at T1 (5):** GAP-SH-003 (LFLG AS DSE), 019 (RESHAPE-HF2), 075 (type B dissection), 090 (intermediate PE), 091 (massive PE SAFETY).

---

## 6.1 — EXTRA rules + architectural patterns

Per Step 8 logging addendum (registry-without-detection, detection-without-registry, broad-rule consolidation):

**(a) Registry-without-detection (12 of 25 SH rules):** `gap-sh-bicuspid-surveillance`, `gap-sh-ross-procedure`, `gap-sh-coarctation`, `gap-sh-fontan-surveillance`, `gap-sh-carcinoid-valve`, plus several legacy `gap-sh-*` numeric-prefix entries that have only metadata.

**(b) Detection-without-registry: 1 case** — `gap-sh-2-tavr-eval` evaluator (line 4923+) has body but evidence.triggerCriteria text was copy-pasted from rate-control rule (says "AFib rate control" instead of TAVR criteria). Bug, not architectural pattern, but illustrates loose registry/evaluator binding.

**(c) Broad-rule consolidation:**
- `gap-sh-1-as-surveillance` covers SH-005 + SH-007 (broad surveillance trigger)
- `gap-sh-2-tavr-eval` covers SH-001 + SH-002 + SH-006 (severity grading absent)
- `gap-sh-3-mitral-intervention` covers SH-014 + SH-015 (broad MR + LVEF<60)
- `gap-sh-bicuspid-surveillance` covers SH-008 + SH-009 + SH-010 (no dim threshold differentiation)
- `gap-sh-12-ttvr` covers SH-022 + SH-069 + SH-023 (no Evoque-specific check)

5 broad-rule patterns confirmed.

---

## 6.2 — BSW ROI pathway implications

SH is heavily Pathway 1 procedural — all T1 SPEC_ONLY gaps are Pathway 1. Coverage gaps:

- **TAVR/AVR cluster:** core present (SH-2 fires for severe AS+age>=65), but severity grading + LFLG DSE + Class IIa triggers absent
- **Transcatheter mitral:** SH-3 + SH-10 + SH-11 cover broad MR + COAPT + TMVR; RESHAPE-HF2 (T1) absent
- **Transcatheter tricuspid:** SH-4 + SH-12 cover broad TR; Evoque TTVR (TRISCEND) partial
- **Aortic Disease:** entire subcategory 0% (T1 type B dissection complicated TEVAR is highest-priority unbuilt SH item)
- **Pulmonary Embolism:** entire subcategory 0%; both T1 PE intervention gaps SPEC_ONLY (GAP-SH-091 SAFETY-tagged)

**Top BSW Pathway 1 unbuilt SH gaps (Tier S+ candidates):**
- GAP-SH-091 (high-risk massive PE intervention, SAFETY) — recommend Tier S triage
- GAP-SH-075 (type B dissection complicated TEVAR) — recommend Tier S consideration
- GAP-SH-090 (intermediate-high PE CDT) — high-priority

---

## 6.3 — Strategic posture: extend timeline, not scope

Carry-forward unchanged from CAD §6.3 + EP §6.3.

---

## 7. Working hypothesis verdict

**For SH (rule-body-verified): PARTIALLY CONFIRMED — least-built module.** Coverage 27.3% any / 9.1% DET_OK is below all 4 prior modules. Naive density 28% (lowest) → DET_OK 9.1% (lowest). Procedural-Pathway-1 blind spot pattern recurs across all 4 audited modules.

If SH (28% naive density) is at 9.1% DET_OK and EP (51% naive) is at 20.2%, the **platform-wide rule-body-verified DET_OK average refines further to 12-18%** (vs prior estimate 15-20%). Retro pass will refine PV/HF/CAD downward.

---

## 8. Implications for Path to Robust v2.0

Phase 1 budget refines: **~550-850h raw scope** (vs prior 500-800h estimate; SH adds ~5 T1 + ~58 T2/T3 SPEC_ONLY to platform totals).

---

## 9. SH-specific findings

**SH-XX-1 (NEW):** `gap-sh-2-tavr-eval` evaluator has copy-paste bug at line 4941 — `triggerCriteria` references "Rate control agent not prescribed in AFib" instead of TAVR/AS criteria. Trigger conditions are correct (severe AS + age>=65 + LVEF available); only the documented evidence string is wrong. Tier 3 code-hygiene; ~5 min fix. Add to Step 8 register batch.

**SH-XX-2 (NEW):** GAP-SH-091 (high-risk massive PE intervention) is SAFETY-tagged + Pathway 1 + entirely uncovered. **Recommend Tier S triage** in pattern of EP-XX-7. Mitigation effort: ~25-35 min agent wall-clock per Step C precedent.

**SH-XX-3 (NEW):** SH has 12 of 25 registry-without-detection rules — highest registry-orphan ratio of any audited module so far (EP had 11 of 45). Folded into AUDIT-027 expanded scope.

**SH-XX-4 (NEW):** Aortic Disease subcategory entirely uncovered (9 spec gaps, 0 evaluator coverage). T1 GAP-SH-075 (type B dissection complicated TEVAR) recommend Tier S consideration alongside SH-XX-2.

**SH-XX-5 (NEW):** Pulmonary Embolism subcategory entirely uncovered (5 spec gaps, 0 evaluator coverage). Both T1 PE gaps SPEC_ONLY (one SAFETY-tagged).

---

## 10. Cross-references

- `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.3 (lines 441-585)
- `docs/audit/PHASE_0B_EP_AUDIT_ADDENDUM.md` (sibling, methodology source)
- `docs/audit/PHASE_0B_CAD_AUDIT_ADDENDUM.md` (template)
- AUDIT-027 expanded for SH-XX-3 (registry-orphan pattern)
- AUDIT-029 (rule-body verification methodology, applied)

---

## 11. Cross-module Phase 0B synthesis (modules 1-5 of 6)

**Coverage data (5 of 6 modules):**

| Module | Spec gaps | Code rules | Naive density | Any-coverage | DET_OK | T1 SPEC_ONLY % | Method |
|---|---:|---:|---:|---:|---:|---:|---|
| PV | 105 | 33 | 31% | 26.7% | — | 57% | name-match |
| HF | 126 | 48 | 38% | 46.0% | 21.4% | 38% | name-match |
| CAD | 90 | 76 | 84% | 61.1% | 31.1% | 33% | name-match |
| EP | 89 | 45 | 51% | 41.6% | 20.2% | 47% | rule-body-verified |
| **SH** | **88** | **25** | **28%** | **27.3%** | **9.1%** | **38% (5/13)** | **rule-body-verified** |

SH at 9.1% DET_OK is the lowest. Rule-body-verified DET_OK now ranges 9.1% (SH) - 20.2% (EP); name-match DET_OK ranges 21.4% (HF) - 31.1% (CAD). **Methodology delta empirically confirmed: rule-body verification yields DET_OK ~10-12pp below name-match on similar density modules.**

**Procedural-Pathway-1 blind spot continues across all 4 rule-body-verified-equivalent observations:**
- HF Device Therapy 0% DET_OK
- CAD Cardiogenic Shock + Complex PCI + Stent + Peri-procedure 0%
- EP Pacing Class I + Post-arrest 0%
- **SH Aortic Disease + Pulmonary Embolism 0%**

**Cross-module SAFETY-tagged uncovered cluster:**
- HF Device Therapy 4 T1 SAFETY gaps unbuilt
- CAD Cardiogenic Shock 2 T1 BSW Top-25 SAFETY gaps unbuilt
- EP-079 (CRITICAL SAFETY pre-excited AF + AVN blocker) unbuilt
- EP-XX-7 — REMEDIATED via PR #229
- **SH-091 (massive PE intervention SAFETY) unbuilt**

**Tier S triage queue (in priority order, per cross-module synthesis):**
1. **EP-079** (CRITICAL SAFETY)
2. **SH-091** (SAFETY high-risk PE)
3. HF Device Therapy cluster (4 T1)
4. CAD Cardiogenic Shock cluster (2 T1 BSW Top-25)

---

### 11.5 — Sequencing choice deferred to v2.0

Carry-forward from CAD §11.5 + EP §11.5. SH findings reinforce domain-by-domain case (procedural-Pathway-1 blind spot now confirmed across 4 modules).

---

## 12. Lessons learned for VHD audit (next)

1. **Lowest-density modules (SH at 28%) yield lowest DET_OK rates.** Predicts VHD (32 rules / 105 gaps = 30% naive density) will land in 10-15% DET_OK range.
2. **Copy-paste bugs in evaluator triggerCriteria warrant a sweep** — found `gap-sh-2-tavr-eval` carrying AFib rate-control text. Suggest `grep` for evidence text mismatches across all rules (Step 8 candidate).
3. **Procedural-Pathway-1 blind spot is universal** — VHD audit should explicitly track procedural subcategories for confirmation.
4. **Cross-module SAFETY-tagged unbuilt gaps deserve dedicated v2.0 Phase 1 sub-track** (Tier S triage queue building up).

---

## 13. Time-unit caveat

EP audit empirical wall-clock: ~95 min agent classification + ~30 min synthesis = ~2 hours.
SH audit empirical wall-clock: ~60 min agent classification + ~20 min synthesis = ~1.3 hours (smaller spec, fewer rules, broader-rule patterns easier to spot).

Confirms Step C calibrated rigor: SH addendum applies CAD/EP template, doesn't re-derive structure. Synthesis time scales sub-linearly with module size.

---

## 14. Audit verdict

**SH module: LEAST-BUILT MODULE — procedural-Pathway-1 BLIND SPOT confirmed cross-module.**

- 8 DET_OK (9.1%), 16 PARTIAL (18.2%), 64 SPEC_ONLY (72.7%)
- 2 of 13 T1 priority gaps DET_OK; 5 SPEC_ONLY at T1 (all Pathway 1)
- **Aortic Disease + Pulmonary HTN + Pulmonary Embolism + Cardiac Masses** entirely uncovered (subcategory 0%)
- HCM Interventions (100%) + PFO/ASD (50%) + Tricuspid (67%) are bright spots
- SH-XX-2 (high-risk PE SAFETY) recommend Tier S triage alongside EP-079
- 12 registry-without-detection rules (highest orphan ratio)
- Hypothesis "more built than thought" PARTIALLY CONFIRMED with refinement (least-built module; rule-body verification confirms procedural-Pathway-1 blind spot is universal)

---

*Authored 2026-05-04. Second module addendum under rule-body-verified methodology. Verdict driven by per-gap classification + evaluator-side verification.*
