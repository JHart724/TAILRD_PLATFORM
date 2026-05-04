# Phase 0B CAD Audit Report — Addendum: Real Spec↔Code Mapping

**Companion to:** `docs/audit/PHASE_0B_HF_AUDIT_ADDENDUM.md` (sibling methodology, module 2 of 6) and `docs/audit/PHASE_0B_PV_AUDIT_REPORT_ADDENDUM.md` (predecessor, module 1 of 6).
**Spec source:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.4 (lines 586-748, 90 CAD gaps across 18 subcategories).
**Code source:** `backend/src/ingestion/gaps/gapRuleEngine.ts` (76 rules tagged `module: 'CORONARY_INTERVENTION'`, 76 distinct rule IDs — 75 canonical `gap-cad-*` + 1 legacy `gap-50-dapt`). No CAD-specific service file.
**Date:** 2026-05-03
**Mode:** Full classification (replicates HF + PV addendum methodology)

---

## 1. Summary

CAD has the highest naive density of any module — 76 rules against 90 spec gaps (84%). Going in, this was the counterweight test for the "more built than thought" hypothesis: if naive density tracks substantive coverage, CAD should show DET_OK rate above 30%; if it scales sub-linearly or is flat, the hypothesis fails.

**Real spec coverage (any-match): 61.1%** (28 DET_OK + 27 PARTIAL + 35 SPEC_ONLY of 90). **DET_OK only: 31.1%.**

CAD has the highest any-coverage and DET_OK rate of the three audited modules so far (PV 26.7% any, HF 46% any / 21.4% DET_OK). The "more built than thought" hypothesis is partially confirmed at the rule-density extreme — but rule-to-DET_OK efficiency actually degrades (HF: 1.78 rules per DET_OK vs CAD: 2.71). Adding rules helps but with diminishing returns; many of the "extra" CAD rules are PARTIAL via broad-rule consolidation rather than substantive per-spec-gap detection.

**Tier 1 priority gap status (18 T1):**
- DET_OK: 7 (38.9%)
- PARTIAL: 5 (27.8%)
- **SPEC_ONLY: 6 (33.3%)** ← v2.0 Phase 1 load-bearing CAD work

The 6 T1 SPEC_ONLY gaps cluster heavily in **Cardiogenic Shock + STEMI timing + Statin adherence/persistence + LM heart team** — all procedural or process metrics with high BSW Pathway 1 alignment. Notably, both T1 cardiogenic shock gaps (GAP-CAD-042 DanGer Shock Impella, GAP-CAD-043 IABP→Impella escalation) appear in the BSW scoping doc Top-25 and have ZERO implementation. Same procedural-domain blind-spot pattern as HF Device Therapy.

**Hypothesis verdict:** PARTIALLY CONFIRMED. CAD is genuinely more-built than HF or PV in absolute terms, but the rule-density advantage produces sub-linear DET_OK gains, and entire procedural subcategories (Cardiogenic Shock 0%, Complex PCI 0%, Stent Complications 0%, Peri-procedure 0%) remain unimplemented despite being the highest-revenue Pathway 1 surfaces.

---

## 2. Coverage by classification

| Classification | Count | % of 90 |
|---|---|---|
| PRODUCTION_GRADE (det + UI + tests) | 0 | 0% |
| DET_OK (det + UI scaffold + no tests) | 28 | 31.1% |
| PARTIAL_DETECTION | 27 | 30.0% |
| SPEC_ONLY | 35 | 38.9% |

**PRODUCTION_GRADE = 0:** AUDIT-001 (test coverage 0.87% project-wide) blocks every CAD gap from earning PRODUCTION_GRADE. Zero CAD test files exist (vs HF's 1; PV's 0). All 28 CAD DET_OK gaps are detection-only with UI scaffold but no test coverage. This is consistent with platform-wide AUDIT-001 P0; not a CAD-specific finding.

---

## 3. Coverage by tier

| Tier | Total | DET_OK | PARTIAL | SPEC_ONLY | Any-Coverage % |
|------|------:|-------:|--------:|----------:|---------------:|
| **T1 (priority)** | 18 | 7 | 5 | 6 | **66.7%** |
| T2 (standard) | 55 | 17 | 18 | 20 | 63.6% |
| T3 (supporting) | 17 | 4 | 4 | 9 | 47.1% |
| **Overall** | **90** | **28** | **27** | **35** | **61.1%** |

**T1 any-coverage at 66.7% is the highest of any audited module so far** (HF 62.1%, PV 42.9%). 6 SPEC_ONLY at T1 means a third of CAD's highest-priority gaps have zero implementation — fewer in absolute count than HF (11) and lower in proportion than PV (4 of 7 = 57%). T2 and T3 also outperform HF and PV.

The pattern: rule density buys T1 priority coverage but doesn't proportionally improve DET_OK depth.

---

## 4. Per-subcategory breakdown

Subcategories follow CK v4.0 §6.4 grouping. Subcategory ordering per operator narrative spec: Lipid Management first (BSW Pathway 2 anchor), Primary Prevention, DAPT, ACS-related cluster (Post-ACS Therapies, STEMI/ACS Timing, Cardiogenic Shock), PCI-related cluster (Intracoronary Imaging, Complex PCI, Stent Complications, Peri/Post-procedure), then Special cases (MINOCA/INOCA, Special Etiologies, Polyvascular, Post-CABG, Chronic CAD, Adjunctive, Cardiac Imaging).

### Lipid Management (13 gaps; T1=7, T2=4, T3=2) — BSW Pathway 2 anchor

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-CAD-001 | T1 | ASCVD: Statin not prescribed | `gap-cad-statin` | DET_OK |
| GAP-CAD-002 | T1 | Post-ACS: high-intensity statin gap | `gap-cad-statin` | DET_OK |
| GAP-CAD-003 | T1 | LDL>=70: add ezetimibe | `gap-cad-ezetimibe` | DET_OK |
| GAP-CAD-004 | T1 | LDL>=70 on statin+ezetimibe: PCSK9i/inclisiran | `gap-cad-pcsk9` | DET_OK |
| GAP-CAD-005 | T1 | LDL<55 extreme risk not achieved | `gap-cad-pcsk9` | PARTIAL |
| GAP-CAD-056 | T1 | Statin Rx not filled (primary non-adherence) | — | **SPEC_ONLY** |
| GAP-CAD-057 | T1 | Statin chronic adherence PDC<80% | — | **SPEC_ONLY** |
| GAP-CAD-006 | T2 | Statin intolerance: bempedoic acid | `gap-cad-bempedoic` | DET_OK |
| GAP-CAD-007 | T2 | LDL not measured in secondary prevention 12mo | `gap-cad-lipid-panel-fu` | DET_OK |
| GAP-CAD-008 | T2 | Lp(a) never measured in ASCVD | `gap-cad-lpa` | DET_OK |
| GAP-CAD-058 | T2 | PCSK9i prior auth gap / cost barrier | — | SPEC_ONLY |
| GAP-CAD-009 | T3 | ApoB not measured | — | SPEC_ONLY |
| GAP-CAD-010 | T3 | hs-CRP not measured residual inflammatory risk | `gap-cad-crp` | DET_OK |

**Coverage:** 8 DET_OK + 1 PARTIAL + 4 SPEC_ONLY = 9/13 (69.2% any, 61.5% DET_OK). Strongest CAD subcategory. The four T1 lipid-titration steps (GAP-CAD-001 → 002 → 003 → 004) are all DET_OK — a complete BSW Pathway 2 stepwise titration ladder. The two T1 SPEC_ONLY items (CAD-056, 057) are pharmacy-fill data integrations, not detection logic — both require pharmacy claims pipeline that doesn't yet exist.

### Primary Prevention (6 gaps; T1=3, T3=3)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-CAD-011 | T1 | PREVENT risk>=7.5 statin gap | `gap-cad-statin` | PARTIAL |
| GAP-CAD-012 | T1 | DM age>=40 statin gap | `gap-cad-statin` | PARTIAL |
| GAP-CAD-014 | T1 | Icosapent ethyl eligible | `gap-cad-omega3` | DET_OK |
| GAP-CAD-013 | T3 | FH screening (LDL>=190) | — | SPEC_ONLY |
| GAP-CAD-059 | T3 | CAC for intermediate-risk primary prev | `gap-cad-calcium-score` | DET_OK |
| GAP-CAD-060 | T3 | Polygenic risk + CAC integration | `gap-cad-family-screen` | PARTIAL |

**Coverage:** 2 DET_OK + 3 PARTIAL + 1 SPEC_ONLY = 5/6 (83.3% any, 33.3% DET_OK). The CAD-specific `gap-cad-statin` rule consolidates primary-prevention statin trigger logic (PREVENT calc, DM-anchored), so CAD-011 and CAD-012 register as PARTIAL — broad-rule consolidation pattern.

### DAPT (7 gaps; T1=2, T2=3, T3=2)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-CAD-015 | T1 | Post-ACS: clopidogrel vs prasugrel/ticagrelor | `gap-cad-ticagrelor-acs` + `gap-cad-prasugrel` | DET_OK |
| GAP-CAD-016 | T1 | Prasugrel + prior stroke/TIA SAFETY | `gap-cad-prasugrel` | PARTIAL |
| GAP-CAD-018 | T2 | Post-PCI DAPT duration review | `gap-cad-dapt-duration` | DET_OK |
| GAP-CAD-061 | T2 | DAPT de-escalation post-PCI (TWILIGHT/TICO) | `gap-50-dapt` | DET_OK |
| GAP-CAD-062 | T2 | Triple therapy AF+PCI (AUGUSTUS) | `gap-cad-anticoag-af` + `gap-cad-heparin-bridge` | PARTIAL |
| GAP-CAD-017 | T3 | Prasugrel age>75 / weight<60 not recommended | `gap-cad-prasugrel` | PARTIAL |
| GAP-CAD-019 | T3 | High bleed risk: PRECISE-DAPT>=25 shorten | — | SPEC_ONLY |

**Coverage:** 3 DET_OK + 3 PARTIAL + 1 SPEC_ONLY = 6/7 (85.7% any, 42.9% DET_OK). DAPT is well-covered. Note: GAP-CAD-061 maps to legacy-named `gap-50-dapt` (the only non-canonical CAD rule ID).

### Post-ACS Therapies (6 gaps; T2=6)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-CAD-020 | T2 | Post-ACS BB gap | `gap-cad-bb-post-mi` | DET_OK |
| GAP-CAD-021 | T2 | Post-ACS ACEi/ARB gap | `gap-cad-acei` | DET_OK |
| GAP-CAD-022 | T2 | Post-MI ICD eval at day 40 (LVEF<=35) | — | SPEC_ONLY |
| GAP-CAD-023 | T2 | Post-ACS colchicine (LoDoCo2) | `gap-cad-colchicine` | DET_OK |
| GAP-CAD-024 | T2 | Post-MI SGLT2i (EMPACT-MI/DAPA-MI) | `gap-cad-sglt2-dm` | PARTIAL |
| GAP-CAD-025 | T2 | Post-ACS smoking cessation pharmacotherapy | `gap-cad-smoking` | PARTIAL |

**Coverage:** 3 DET_OK + 2 PARTIAL + 1 SPEC_ONLY = 5/6 (83.3% any, 50% DET_OK). GAP-CAD-024 is PARTIAL because `gap-cad-sglt2-dm` requires diabetes — but EMPACT-MI / DAPA-MI extends the indication to non-diabetic post-MI. SPEC-CODE intent divergence.

### STEMI/ACS Timing (5 gaps; T1=2, T2=3)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-CAD-063 | T1 | STEMI door-to-balloon >90 min | — | **SPEC_ONLY** |
| GAP-CAD-065 | T1 | NSTEMI early invasive (GRACE>=140) | `gap-cad-catheterization` | PARTIAL |
| GAP-CAD-064 | T2 | STEMI transfer D2B >120 min | — | SPEC_ONLY |
| GAP-CAD-066 | T2 | NSTEMI delayed strategy timing | `gap-cad-catheterization` | PARTIAL |
| GAP-CAD-067 | T2 | UA vs NSTEMI classification | `gap-cad-chest-pain-protocol` | PARTIAL |

**Coverage:** 0 DET_OK + 3 PARTIAL + 2 SPEC_ONLY = 3/5 (60% any, 0% DET_OK). STEMI/ACS timing rules carry process-metric intent (clock-driven) that doesn't fit the rule-engine's snapshot detection model — needs procedural event timing pipeline. Both timing T2 gaps (CAD-064, CAD-063) are SPEC_ONLY.

### Cardiogenic Shock (6 gaps; T1=2, T2=4) — entire subcategory unimplemented

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-CAD-042 | T1 | DanGer Shock - Impella in AMI-CS | — | **SPEC_ONLY** |
| GAP-CAD-043 | T1 | MCS escalation from IABP in ongoing shock | — | **SPEC_ONLY** |
| GAP-CAD-040 | T2 | SCAI C: IABP placed without Impella escalation | — | SPEC_ONLY |
| GAP-CAD-041 | T2 | SCAI D: refractory shock without ECMO eval | — | SPEC_ONLY |
| GAP-CAD-077 | T2 | SCAI Stage B pre-shock identification | — | SPEC_ONLY |
| GAP-CAD-078 | T2 | Shock team activation documentation | — | SPEC_ONLY |

**Coverage: 0/6 (0% any). ENTIRE cardiogenic shock subcategory unimplemented.** Both T1 gaps (GAP-CAD-042 DanGer Shock and GAP-CAD-043 IABP→Impella escalation) are explicitly named in BSW scoping doc v7.1 Part 1.3 Top-25 with Pathway 1 (Procedural DRG: Impella ~$50-90K/case) revenue alignment. **This is the single highest-revenue cluster of unbuilt CAD rules** — directly parallel to HF Device Therapy 17% finding.

### Intracoronary Imaging (3 gaps; T2=3)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-CAD-068 | T2 | Borderline lesion FFR/iFR not measured | `gap-cad-ffr` | DET_OK |
| GAP-CAD-069 | T2 | Complex PCI without IVUS/OCT | `gap-cad-ivus` | PARTIAL |
| GAP-CAD-070 | T2 | Stent sizing IVUS underexpansion | `gap-cad-ivus` | PARTIAL |

**Coverage:** 1 DET_OK + 2 PARTIAL + 0 SPEC_ONLY = 3/3 (100% any, 33% DET_OK). `gap-cad-ivus` is named "Intravascular Imaging for Left Main" — broad rule consolidation; CAD-069 (general complex PCI) and CAD-070 (calcium-stent sizing) get PARTIAL.

### Complex PCI (4 gaps; T1=1, T2=3) — entire subcategory unimplemented

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-CAD-071 | T1 | LM disease: heart team review (SYNTAX II) | — | **SPEC_ONLY** |
| GAP-CAD-072 | T2 | CTO PCI: operator/center expertise match | — | SPEC_ONLY |
| GAP-CAD-073 | T2 | Calcified lesion: rotational atherectomy/IVL | — | SPEC_ONLY |
| GAP-CAD-074 | T2 | Bifurcation PCI strategy documentation | — | SPEC_ONLY |

**Coverage: 0/4 (0% any). ENTIRE Complex PCI subcategory unimplemented.** GAP-CAD-071 (LM heart team review) is T1 — SYNTAX II Class I recommendation; high BSW Pathway 1 alignment.

### Stent Complications (3 gaps; T2=2, T3=1) — entire subcategory unimplemented

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-CAD-075 | T2 | Acute stent thrombosis: emergent repeat angio | — | SPEC_ONLY |
| GAP-CAD-076 | T2 | Subacute stent thrombosis: DAPT compliance | — | SPEC_ONLY |
| GAP-CAD-039 | T3 | In-stent restenosis: DCB consideration | — | SPEC_ONLY |

**Coverage: 0/3 (0% any). ENTIRE Stent Complications subcategory unimplemented.** Stent thrombosis is acute-care decision support — needs procedural event pipeline.

### Peri-procedure (4 gaps; T2=4) — entire subcategory unimplemented

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-CAD-049 | T2 | Pre-op cardiac risk (RCRI/NSQIP) | — | SPEC_ONLY |
| GAP-CAD-050 | T2 | Pre-op BB decision documentation | — | SPEC_ONLY |
| GAP-CAD-051 | T2 | Post-PCI non-cardiac surgery timing | — | SPEC_ONLY |
| GAP-CAD-090 | T2 | Post-arrest TTM with subsequent angio | — | SPEC_ONLY |

**Coverage: 0/4 (0% any). ENTIRE Peri-procedure subcategory unimplemented.**

### Post-procedure (4 gaps; T2=4)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-CAD-052 | T2 | Pre-PCI CIN risk + pre-hydration | `gap-cad-renal-monitor` | PARTIAL |
| GAP-CAD-053 | T2 | Radial access utilization | — | SPEC_ONLY |
| GAP-CAD-054 | T2 | Same-day discharge PCI protocol | — | SPEC_ONLY |
| GAP-CAD-055 | T2 | Post-CABG sternal wound surveillance | — | SPEC_ONLY |

**Coverage:** 0 DET_OK + 1 PARTIAL + 3 SPEC_ONLY = 1/4 (25% any).

### MINOCA/INOCA (5 gaps; T2=5)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-CAD-034 | T2 | MINOCA: CMR not obtained | `gap-cad-minoca` | DET_OK |
| GAP-CAD-035 | T2 | MINOCA: IVUS/OCT for plaque disruption | `gap-cad-minoca` + `gap-cad-ivus` | PARTIAL |
| GAP-CAD-036 | T2 | INOCA: coronary function testing (CFR/IMR) | `gap-cad-microvascular` | PARTIAL |
| GAP-CAD-037 | T2 | Vasospastic angina: provocation testing | `gap-cad-vasospastic` | DET_OK |
| GAP-CAD-038 | T2 | Microvascular angina stepwise therapy | `gap-cad-microvascular` + `gap-cad-nicorandil` | PARTIAL |

**Coverage:** 2 DET_OK + 3 PARTIAL + 0 SPEC_ONLY = 5/5 (100% any, 40% DET_OK). All MINOCA/INOCA gaps have at least partial detection.

### Special Etiologies (8 gaps; T1=1, T2=1, T3=6)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-CAD-081 | T1 | SCAD: young woman + nonobstructive CAD | `gap-cad-scad` + `gap-cad-women-specific` + `gap-cad-young-mi` | DET_OK |
| GAP-CAD-082 | T2 | Post-SCAD: BB + FMD screening | `gap-cad-scad` | PARTIAL |
| GAP-CAD-083 | T3 | Radiation-induced CAD | — | SPEC_ONLY |
| GAP-CAD-084 | T3 | Coronary vasculitis (Kawasaki, Takayasu) | — | SPEC_ONLY |
| GAP-CAD-085 | T3 | Cocaine/methamphetamine-induced CAD | — | SPEC_ONLY |
| GAP-CAD-086 | T3 | Myocardial bridging symptomatic | — | SPEC_ONLY |
| GAP-CAD-087 | T3 | Cardiac allograft vasculopathy | `gap-cad-cardiac-transplant-cad` | DET_OK |
| GAP-CAD-088 | T3 | Chest radiation valve+coronary integrated | — | SPEC_ONLY |

**Coverage:** 2 DET_OK + 1 PARTIAL + 5 SPEC_ONLY = 3/8 (37.5% any, 25% DET_OK). T1 SCAD gap is DET_OK (multi-rule trigger). Rare etiologies (vasculitis, substance-induced, bridging, radiation valve) absent.

### Polyvascular (2 gaps; T2=2)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-CAD-026 | T2 | Polyvascular: intensified regimen | — | SPEC_ONLY |
| GAP-CAD-027 | T2 | Polyvascular: COMPASS dual pathway | `gap-pv-rivaroxaban` (cross-module) | PARTIAL |

**Coverage:** 0 DET_OK + 1 PARTIAL + 1 SPEC_ONLY = 1/2 (50% any). Note: `gap-pv-rivaroxaban` is tagged `module: 'CORONARY_INTERVENTION'` despite the `gap-pv-*` naming — cross-module rule registered to CAD module.

### Post-CABG (2 gaps; T2=2)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-CAD-028 | T2 | Post-CABG: statin + BB + ASA gap | `gap-cad-secondary-prevention` | PARTIAL |
| GAP-CAD-029 | T2 | Post-CABG: cardiac rehab referral | `gap-cad-cardiac-rehab` | DET_OK |

**Coverage:** 1 DET_OK + 1 PARTIAL + 0 SPEC_ONLY = 2/2 (100% any, 50% DET_OK).

### Chronic CAD (4 gaps; T2=4)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-CAD-030 | T2 | 2024 ACC appropriateness review | `gap-cad-revascularization` | PARTIAL |
| GAP-CAD-031 | T2 | ISCHEMIA-eligible: OMT-first confirmation | `gap-cad-ischemia-guided` | DET_OK |
| GAP-CAD-032 | T2 | Stable angina anti-anginal optimization | `gap-cad-beta-blocker` | PARTIAL |
| GAP-CAD-033 | T2 | Ranolazine candidate (refractory) | `gap-cad-ranolazine` | DET_OK |

**Coverage:** 2 DET_OK + 2 PARTIAL + 0 SPEC_ONLY = 4/4 (100% any, 50% DET_OK).

### Adjunctive (5 gaps; T2=3, T3=2)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-CAD-044 | T2 | Post-MI SSRI for depression (ENRICHD) | `gap-cad-depression` | PARTIAL |
| GAP-CAD-045 | T2 | Post-MI influenza vaccination | `gap-cad-influenza` | DET_OK |
| GAP-CAD-046 | T2 | Post-MI cardiac rehab referral + enrollment | `gap-cad-cardiac-rehab` | DET_OK |
| GAP-CAD-079 | T3 | ICD: drive/employment counseling | `gap-cad-driving` | PARTIAL |
| GAP-CAD-080 | T3 | Post-ACS sexual activity counseling | `gap-cad-sexual-health` | DET_OK |

**Coverage:** 3 DET_OK + 2 PARTIAL + 0 SPEC_ONLY = 5/5 (100% any, 60% DET_OK).

### Cardiac Imaging (3 gaps; T2=2, T3=1)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-CAD-047 | T2 | CCTA for intermediate chest pain | `gap-cad-cardiac-ct` | DET_OK |
| GAP-CAD-048 | T2 | Stress imaging modality mismatch | `gap-cad-stress-test` + `gap-cad-nuclear-stress` | PARTIAL |
| GAP-CAD-089 | T3 | Repeat stress testing overuse (appropriate use) | `gap-cad-stress-test` | PARTIAL |

**Coverage:** 1 DET_OK + 2 PARTIAL + 0 SPEC_ONLY = 3/3 (100% any, 33% DET_OK).

---

### 4.5 — T1 SPEC_ONLY work items (load-bearing for v2.0 Phase 1)

The 6 T1 spec gaps with zero implementation. Anchored to BSW scoping doc v7.1 Part 1 ROI pathways (Pathway 1 = Procedural/Device DRG; Pathway 2 = Specialty Pharmacy; Pathway 3 = Avoided Admission; Pathway 4 = Risk Adjustment).

| GAP-ID | Subcategory | Description | Tier | BSW pathway |
|---|---|---|---|---|
| GAP-CAD-056 | Lipid Management | Statin Rx prescribed but not filled (primary non-adherence) | T1 | Pathway 4 (HEDIS SPC adherence) + Pathway 3 |
| GAP-CAD-057 | Lipid Management | Statin chronic adherence PDC<80% | T1 | Pathway 4 (HEDIS SPC) + Pathway 2 |
| GAP-CAD-063 | STEMI/ACS Timing | STEMI door-to-balloon >90 min | T1 | Pathway 1 (PCI quality / DRG) + CMS quality |
| GAP-CAD-071 | Complex PCI | LM disease: heart team review (SYNTAX II) | T1 | Pathway 1 (PCI/CABG decision) |
| GAP-CAD-042 | Cardiogenic Shock | DanGer Shock: Impella in AMI-CS | T1 | Pathway 1 (Impella DRG, $50-90K/case) — **BSW Top-25** |
| GAP-CAD-043 | Cardiogenic Shock | MCS escalation from IABP in ongoing shock | T1 | Pathway 1 (Impella/ECMO DRG) — **BSW Top-25** |

**Pathway distribution of T1 SPEC_ONLY:**
- Pathway 1 (Procedural / Device DRG): 4 of 6 (LM heart team, STEMI D2B, DanGer Shock Impella, IABP→Impella escalation)
- Pathway 2 (Specialty Pharmacy): 1 of 6 (statin PDC<80%)
- Pathway 3 (Avoided Admission): 2 of 6 (statin not filled, statin PDC<80%)
- Pathway 4 (Risk Adjustment): 2 of 6 (statin not filled HEDIS SPC, statin PDC<80% HEDIS SPC)

**4 of 6 T1 SPEC_ONLY are Pathway 1 procedural gaps.** Same procedural-domain-blind-spot pattern as HF (where 6 of 11 T1 SPEC_ONLY were Pathway 1). Cardiogenic shock cluster (CAD-042 + CAD-043) is the single highest-revenue unbuilt feature in CAD — both BSW Top-25, both Class I-II indications, both Pathway 1.

---

## 5. Tier 1 priority gaps surfaced (18 total)

**DET_OK at T1 (7):** GAP-CAD-001 (statin), 002 (post-ACS high-int statin), 003 (ezetimibe), 004 (PCSK9i), 014 (icosapent), 015 (post-ACS DAPT P2Y12), 081 (SCAD young woman). The four-step lipid titration ladder (001 → 002 → 003 → 004) is fully covered — strongest Pathway 2 commercial asset.

**PARTIAL at T1 (5):** GAP-CAD-005 (LDL<55 extreme risk), 011 (PREVENT primary prev statin), 012 (DM primary prev statin), 016 (prasugrel + stroke/TIA SAFETY), 065 (NSTEMI early invasive GRACE>=140). Rules exist but don't cover full spec intent — broad-rule consolidation.

**SPEC_ONLY at T1 (6):** **GAP-CAD-056** (statin Rx not filled), **GAP-CAD-057** (statin PDC<80%), **GAP-CAD-063** (STEMI D2B>90), **GAP-CAD-071** (LM heart team), **GAP-CAD-042** (DanGer Shock Impella), **GAP-CAD-043** (IABP→Impella escalation).

**These 6 T1 SPEC_ONLY gaps are CAD's most material implementation gaps for production-grade.** The two pharmacy-fill adherence gaps (056, 057) require pharmacy claims pipeline integration (cross-cutting infrastructure, not detection logic). The four procedural gaps (063, 071, 042, 043) need procedural event timing pipelines and decision-support trigger thresholds.

---

## 6.1 — Implemented rules NOT mapped to a spec gap

CAD-specific code rules that don't cleanly map to a CK v4.0 §6.4 spec gap:

1. `gap-cad-bnp-cad` (BNP Monitoring in CAD) — not in spec; HF-style biomarker monitoring extended to CAD
2. `gap-cad-thyroid` (Thyroid Function in CAD with AFib) — comorbidity check not in CK §6.4
3. `gap-cad-electrolyte` (Electrolyte Monitoring Post-MI on Diuretic) — not in spec
4. `gap-cad-anemia` (Anemia Screening Post-MI) — not in spec
5. `gap-cad-glucose-screen` (Glucose Screening in CAD) — not in spec (closest is CAD-012 DM-stratified statin, but this rule is screening not therapy)
6. `gap-cad-hemoglobin-a1c-target` (A1c Target Review in CAD+DM) — not in spec
7. `gap-cad-secondary-prevention` (Secondary Prevention Bundle Review) — bundle rule; partially overlaps CAD-028 but broader
8. `gap-cad-women-specific` (Women-Specific CAD Screening) — used as PARTIAL for CAD-081 SCAD trigger but otherwise no spec match
9. `gap-cad-young-mi` (Young MI Workup) — used as PARTIAL for CAD-081 but otherwise no spec match
10. `gap-cad-exercise-prescription` (Exercise Prescription in CAD) — close to CAD-079 but not the ICD-driving variant
11. `gap-cad-sleep-apnea-cad` (Sleep Apnea Screening in CAD) — not in spec
12. `gap-cad-takotsubo` (Takotsubo Follow-Up) — not in CK §6.4 (Takotsubo is in HF chapter)
13. `gap-cad-aspirin-primary` (Aspirin Assessment in CAD) — not in spec; primary prevention aspirin removed from current guidelines
14. `gap-cad-liver-statin` (Liver Function Monitoring on Statin in CAD) — surveillance not in CK §6.4 spec table
15. `gap-cad-heparin-bridge` (Heparin Bridging in CAD with AF and Procedure) — partial map to CAD-062 but more general

**15 EXTRA rules in CAD code without clean spec match.** This is much higher than HF's 1 EXTRA — suggesting CAD code accumulated rules from a different requirements path (pre-CK v4.0 build cycles, BSW scoping iteration churn, or organic expansion). Same broad-rule-consolidation pattern but expressed as additional rules rather than broader logic per rule.

**These EXTRA rules carry clinical content but lack spec backing.** v2.0 should reconcile: either (a) add to CK v4.0 §6.4, (b) deprecate as out-of-scope, or (c) re-tag to other modules. ~3-5h reconciliation work.

---

## 6.2 — BSW ROI pathway implications

The Cardiogenic Shock 0% coverage finding has direct BSW conversation implications. The BSW scoping doc v7.1 Part 1 anchors the ROI conversation on:

- **Pathway 1 (Procedural and Device DRG Capture):** Impella $50-90K/case, ECMO $80-150K/case, PCI $25-40K/case (DRG 246-251), CABG $40-60K/case (DRG 231-236)
- **Pathway 2 (Specialty Pharmacy Retention):** PCSK9i alirocumab/evolocumab $5-6K/year, inclisiran $6-10K/year, bempedoic acid $4-5K/year — Lipid Management subcategory anchor
- **Pathway 3 (Avoided ACS hospitalization):** ACS readmission $20-30K/admission per BSW scoping doc Part 1.1; STEMI re-occlusion $40-60K
- **Pathway 4 (HEDIS SPC):** statin in ASCVD adherence — GAP-CAD-001 anchor + GAP-CAD-056/057 pharmacy-fill

Of CAD Top-25 priority gaps in BSW scoping doc Part 1.3 (subset relevant to CAD module):

| Top-25 Gap | Status per audit | Pathway |
|---|---|---|
| GAP-CAD-001 (HEDIS SPC statin in ASCVD) | DET_OK via `gap-cad-statin` | Pathway 4 + Pathway 2 |
| GAP-CAD-004 (PCSK9i/inclisiran when LDL>=70 on statin+ezetimibe) | DET_OK via `gap-cad-pcsk9` | Pathway 2 |
| GAP-CAD-042 (DanGer Shock - Impella in AMI-CS) | **SPEC_ONLY** | Pathway 1 |
| GAP-CAD-043 (DanGer Shock - Impella over IABP) | **SPEC_ONLY** | Pathway 1 |

**Lipid Management is the strongest CAD commercial asset** — full four-step titration ladder DET_OK, both Top-25 lipid items DET_OK. **Cardiogenic Shock is the largest CAD commercial weakness** — both Top-25 shock items SPEC_ONLY, entire 6-gap subcategory at 0% coverage.

**Complex PCI 0% (4 of 4 SPEC_ONLY) and Peri-procedure 0% (4 of 4 SPEC_ONLY) and Stent Complications 0% (3 of 3 SPEC_ONLY)** — all Pathway 1 procedural surfaces unimplemented. Plus the procedural Cardiogenic Shock 0% — that's 4 entire procedural subcategories totaling 17 spec gaps with zero implementation. This is the load-bearing finding for CAD v2.0 sequencing.

Phase 1 prioritization should sequence by Pathway alignment, not just clinical Tier scoring.

---

## 6.3 — Strategic posture: extend timeline, not scope

**Operator strategic decision (2026-05-03):** when audit findings force a choice between timeline and scope, extend timeline. Do not reduce scope. Module Parity Principle preserved. All Tier 1+2+3 gaps in scope. Research/registry backend in scope.

**Rationale:** TAILRD is clinical decision support; shortcuts in clinical content (broad-rule consolidation that loses gap-level specificity, missing modules, skipped tiers) become patient safety risk or commercial credibility failures. The Palantir approach is to do it right; the timeline absorbs the cost.

**Timeline math (preliminary, refined in v2.0):**
- Phase 1 revised: ~460-730h (vs v1.2's 250-350h, ~2× factor) — CAD findings broadly support this 2× factor
- Phase 2 revised: ~1,500h (vs v1.2's 600-900h, ~2× factor)
- 60-70h/week capacity → Phase 1+2 alone needs ~30-37 weeks
- Rough revised v1.0 target: 7-9 months from 2026-04-29 plan start (~2026-12 to 2027-02)
- This estimate is based on PV + HF + CAD audit data; v2.0 PATH_TO_ROBUST will refine with all 6 module audits + Phase 0C in hand.

**v2.0 authorship is a Phase 0 deliverable**, scheduled end-of-Week-3 (~2026-05-19) per `PATH_TO_ROBUST.md` v1.2 §5. v2.0 codifies the extended timeline with full per-phase budgets and per-module sequencing once all Phase 0 audits land.

---

## 7. Working hypothesis verdict

**Original framing in `docs/PATH_TO_ROBUST.md` v1.2 §2:**
> "Strong working hypothesis: more is implemented than the 280 figure suggests; the gap is wiring and UI surfacing, not detection logic creation."

**Verdict for CAD (data-driven):** **Hypothesis PARTIALLY CONFIRMED with refinement.**

- **Coverage is the highest of any audited module so far** — 61.1% any-coverage / 31.1% DET_OK vs HF's 46% / 21.4% and PV's 26.7% any. CAD (highest naive density, 84%) confirms the directional hypothesis: more rules → more coverage.
- **But rule-to-DET_OK efficiency degrades** at the density extreme:
  - HF: 48 rules / 27 DET_OK = 1.78 rules per DET_OK
  - CAD: 76 rules / 28 DET_OK = 2.71 rules per DET_OK
  - **CAD has 1.5× more rules than HF but only 1.04× more DET_OK gaps.** The "extra" CAD rules are predominantly PARTIAL (broad-rule consolidation) or EXTRA (15 rules without spec backing) rather than substantive per-spec-gap detection.
- **Procedural-domain blind spot is consistent across modules.** Same pattern as HF Device Therapy:
  - HF Device Therapy: 17% any, 0% DET_OK (12 gaps)
  - CAD Cardiogenic Shock: 0% any (6 gaps)
  - CAD Complex PCI: 0% any (4 gaps)
  - CAD Stent Complications: 0% any (3 gaps)
  - CAD Peri-procedure: 0% any (4 gaps)
- **T1 priority gap SPEC_ONLY rate is 33%** (6 of 18) — better than HF's 38% and far better than PV's 57%, but still a third of CAD's highest-priority work has zero implementation.

**Refined characterization:** CAD is **broadly built but procedurally hollow.** The platform succeeds at **medication gaps + screening + adjunctive care** at high coverage rates (Lipid Management 69%, Adjunctive 100%, Chronic CAD 100%, Post-CABG 100%) but fails systematically at **procedural decision support** (Cardiogenic Shock 0%, Complex PCI 0%, Peri-procedure 0%, Stent Complications 0%). The "more built than thought" framing applies to medication-side coverage at scale; the procedural-domain coverage is **less built than thought** even at maximum naive density.

If CAD (highest naive density, most-built) is at 31.1% DET_OK and HF is at 21.4% DET_OK, the platform-wide pattern strongly suggests:
- All-module DET_OK average: 25-30% (using PV any 26.7% as proxy if PV DET_OK ≈ 15%, HF 21.4%, CAD 31.1%, average ≈ 22-23% across audited 3)
- 0.22-0.30 × 708 ≈ 156-212 spec gaps with substantive detection
- 496-552 SPEC_ONLY platform-wide

This is **consistent with HF audit's 210-285 estimate** and refines toward the lower bound — confirming the v2.0 budget revision.

---

## 8. Implications for Path to Robust v2.0 (deferred to Week 3)

**v1.2 timeline math implications, refined:**

CAD's pattern (66.7% T1 any-coverage) is the new ceiling — most-built modules approach two-thirds T1 coverage. PV's 42.9% T1 is the floor. Average across 7 active modules likely 50-55% T1 any-coverage.

- T1: 107 total × 52% any-coverage ≈ 56 covered (mix DET_OK + PARTIAL), ~51 SPEC_ONLY → roughly **51 T1 gaps to build from scratch**, ~28 to harden from PARTIAL → DET_OK
- T2: 462 × ~30% any-coverage ≈ 138 covered, **~324 SPEC_ONLY**
- T3: 139 × ~25% any-coverage ≈ 35 covered, **~104 SPEC_ONLY**
- Total platform-wide: ~480-510 SPEC_ONLY across 7 active modules (subtracting CX which is deferred per `BUILD_STATE.md` §3b)

**Phase 1 (Tier 1) budget impact (refined with CAD data):**
- v1.2 estimate: ~250-350h
- Combined PV + HF + CAD data: 51 SPEC_ONLY T1 gaps × ~6-10h = ~310-510h SPEC_ONLY work
- Plus 28 PARTIAL → DET_OK hardening × ~3-4h = ~85-115h
- Plus 28 already-DET_OK gaps for tests + UI polish × ~2-3h = ~56-84h
- **Revised Phase 1 estimate: ~450-710h** (~2× v1.2 estimate; CAD data confirms HF's 460-730h estimate, narrows the band)

**Phase 2 (Tier 2) budget impact:** unchanged from HF audit ~1,500h estimate.

**v2.0 must reflect these honestly.** The 3-4 month timeline at v1.2 cadence (60-70h/week × 13-17 weeks = 780-1,190h) is unlikely to fit Phase 1 + Phase 2 combined (revised ~1,950-2,210h). The 7-9 month projection holds firm with CAD data; CAD does not justify timeline tightening despite its higher coverage — because the procedural-domain blind spots are absolute, not proportional.

---

## 9. CAD-specific findings worth surfacing (non-Tier S, but flag-worthy)

### Finding CAD-01 — Legacy rule ID `gap-50-dapt` breaks naming convention

`gap-50-dapt` (DAPT Discontinuation, Class 2b LOE B-R) is the only CAD rule that doesn't follow the canonical `gap-cad-*` prefix. Code-hygiene FINDING (LOW). Fold into AUDIT-027 (`gdmtEngine.ts` redundancy / rule-engine code hygiene) remediation scope as broader "rule-engine naming convention reconciliation" (~3-5h total). Not a separate register entry per operator decision 2026-05-03.

### Finding CAD-02 — Zero CAD test files (reference, not re-discovery)

Zero CAD test files in `backend/tests/` (compared to HF=1, PV=0). This is consistent with platform-wide AUDIT-001 P0 testing gap (0.87% project-wide test coverage). **References AUDIT-001; not a CAD-specific finding.** All CAD DET_OK classifications are detection + UI scaffold without test coverage.

### Finding CAD-03 — No CAD-specific service layer (architectural observation)

CAD has 76 rules but no CAD-specific service file (vs HF's `gdmtEngine.ts` for four-pillar GDMT). Rules carry full logic burden. This is most pronounced in **Lipid Management** (4-step LDL goal titration: statin → ezetimibe → PCSK9i → LDL<55 extreme risk), where the stepwise titration logic is split across 4 separate rules rather than a coherent service that tracks patient progression through the ladder.

**Forward-looking note for v2.0 Phase 1 design** (NOT a register finding): consider extracting a `lipidEngine.ts` service for CAD lipid management — analogous to `gdmtEngine.ts` for HF. Complex LDL goal computation + statin/PCSK9i/inclisiran/ezetimibe/bempedoic stepwise titration may benefit from service-layer extraction. Estimated effort: ~15-25h for service + integration with existing 5 lipid rules. Defer scoping decision to v2.0 PATH_TO_ROBUST authorship.

### Finding CAD-04 — Cardiogenic Shock 0% coverage despite Top-25 BSW prominence

Both T1 cardiogenic shock gaps (GAP-CAD-042 DanGer Shock Impella, GAP-CAD-043 IABP→Impella escalation) appear in BSW scoping doc v7.1 Part 1.3 Top-25 with explicit Pathway 1 procedural-DRG ROI tagging. **Both have zero implementation.** Plus 4 T2 cardiogenic shock gaps also SPEC_ONLY. **Highest-revenue cluster of unbuilt CAD rules.** Same pattern as HF Device Therapy. ~30-40h to implement all 6 with detection + UI + tests; ~15-20h for the 2 T1 priority gaps alone.

### Finding CAD-05 — 15 EXTRA rules without spec backing

15 of 76 CAD rules don't cleanly map to a CK v4.0 §6.4 spec gap (vs HF's 1 of 48). EXTRA rules represent organic accumulation from pre-CK-v4.0 build cycles or BSW scoping iteration churn. Reconciliation needed: add to CK §6.4, deprecate, or re-tag. ~3-5h scoping during v2.0 authorship.

---

## 10. Cross-references

- `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.4 (lines 586-748) — spec source for all 90 CAD gaps
- `docs/audit/PHASE_0B_HF_AUDIT_ADDENDUM.md` — sibling addendum (methodology source, module 2 of 6)
- `docs/audit/PHASE_0B_PV_AUDIT_REPORT_ADDENDUM.md` — predecessor addendum (module 1 of 6)
- `docs/audit/PHASE_0B_CLINICAL_AUDIT_FRAMEWORK.md` — methodology
- `docs/audit/PHASE_1_REPORT.md` — AUDIT-001 (testing gap blocks PRODUCTION_GRADE)
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` — AUDIT-027 (`gdmtEngine.ts` redundancy / rule-engine code hygiene)
- `docs/PATH_TO_ROBUST.md` v1.2 — strategic plan; v2.0 will reflect this addendum
- `BUILD_STATE.md` — canonical aggregate ledger (this audit updates §1, §3, §4, §6)
- BSW scoping doc v7.1 Part 1, Part 1.3 Top-25 — commercial framing
- `backend/src/ingestion/gaps/gapRuleEngine.ts` — code source (76 CAD rules)
- `src/ui/coronaryIntervention/` — frontend (25 .tsx files; all 3 view tiers present)

---

## 11. Cross-module Phase 0B synthesis (modules 1-3 of 6)

**Coverage data (3 of 6 modules audited):**

| Module | Spec gaps | Code rules | Naive density | Any-coverage | DET_OK | Rules per DET_OK |
|---|---:|---:|---:|---:|---:|---:|
| PV | 105 | 33 | 31% | 26.7% | (not classified) | — |
| HF | 126 | 48 | 38% | 46.0% | 21.4% | 1.78 |
| CAD | 90 | 76 | 84% | **61.1%** | **31.1%** | 2.71 |

**Hypothesis test: does DET_OK scale with naive density?**

PARTIALLY. Naive density 38% → 84% (CAD vs HF, +121%) yields DET_OK 21.4% → 31.1% (+45%) — sub-linear scaling. Adding rules helps but with diminishing returns: each "extra" rule beyond the first detection layer is more likely to be PARTIAL (broad-rule consolidation) or EXTRA (no spec backing) than DET_OK.

**Any-coverage scales more linearly:** PV 26.7% → HF 46% → CAD 61.1%. Roughly tracks with naive density — adding rules reliably increases any-coverage but not strict DET_OK depth.

**Verdict for v2.0 Phase 1 sequencing:**
- CAD CAN be treated as "polish-heavy / build-moderate" since 31.1% DET_OK is materially higher than HF or PV. ~58 of 90 CAD spec gaps are PARTIAL or DET_OK and need only hardening or test/UI polish.
- BUT four entire CAD procedural subcategories (Cardiogenic Shock, Complex PCI, Stent Complications, Peri-procedure) totaling 17 SPEC_ONLY gaps still need full builds — same pattern as HF Device Therapy 0% DET_OK.
- Sequencing recommendation: in Phase 1, build the procedural-domain T1 gaps first (across modules), then return to module-by-module polish.

**T1 SPEC_ONLY pattern across modules:**

| Module | T1 total | T1 SPEC_ONLY | T1 SPEC_ONLY % |
|---|---:|---:|---:|
| PV | 7 | 4 | 57% |
| HF | 29 | 11 | 38% |
| CAD | 18 | 6 | **33%** |

**T1 SPEC_ONLY proportion declines with naive density** — most-built modules have proportionally fewer T1 gaps absent. But absolute count: 21 T1 SPEC_ONLY across PV+HF+CAD. Extrapolating to remaining 3 active modules (EP, SH, VHD likely lower density than CAD): ~15-25 more T1 SPEC_ONLY → platform-wide ~36-46 T1 SPEC_ONLY across 7 active modules.

**Rules-per-DET_OK efficiency declining with density:**

HF 1.78 → CAD 2.71 means CAD requires ~50% more code per substantive DET_OK gap. This is a Phase 1 productivity warning — adding more rules naively does not yield proportional production-grade improvement. v2.0 Phase 1 sequencing should prefer **rule consolidation + service-layer extraction + per-spec-gap rule splits** over net-new rule volume.

**Implications for remaining 3 audits (EP, SH, VHD):**
- EP has 63 frontend files (highest of any module) — possibly highest UI density paired with moderate code rule count. Test: EP DET_OK should be moderate (20-25%) if procedural-domain blind spot pattern holds (EP procedural = ablation, ICD, CRT decisions).
- SH has 48 frontend files + 25 spec gaps (smallest spec) — naive density unknown until audit. Test: SH likely has best DET_OK rate of any module due to small spec.
- VHD has 18 frontend files + 32 spec gaps (smaller code-side audit) — naive density unknown. Test: VHD likely lower coverage than CAD/HF given smaller frontend footprint.
- Platform-wide DET_OK average likely lands at 22-25%. Total SPEC_ONLY platform-wide likely 480-520 gaps.

**Synthesis verdict for v2.0:** Naive density is a poor proxy for production-grade readiness at the per-module level. Rule-to-DET_OK efficiency degrades with density. Procedural-domain blind spots are systemic, not module-specific. v2.0 Phase 1 must treat all modules as "build" (procedural surfaces) and "polish" (medication/screening surfaces) in parallel rather than sequencing by module.

---

### 11.5 — Sequencing choice deferred to v2.0

The §11 recommendation (domain-by-domain Phase 1 sequencing) is one honest read of the cross-module data. v2.0 author should weigh it against module-by-module sequencing.

**Module-by-module Phase 1 sequencing — case for:**
- Cognitive context preserved per module (no context-switching tax across HF Device Therapy / CAD Cardiogenic Shock / EP procedural)
- Complete-module shipping for BSW demos (HF 100% is more credible than 6-modules-at-60%)
- Clearer module ownership for clinical advisor sign-off (one advisor reviews their module end-to-end)
- Learning compounds within a module (HFrEF GDMT patterns inform HFpEF/HFmrEF more than they inform EP)
- Module Parity Principle preserved structurally (each module reaches completion in turn)

**Domain-by-domain Phase 1 sequencing — case for (per §11):**
- Procedural-decision-support framework built once and reused (SCAI shock staging, MCS escalation, peri-procedural risk scoring transfer across HF LVAD + CAD Shock)
- Procedural-domain blind spot is platform-wide, not module-specific — fixing it module-by-module rebuilds same architectural patterns 6×
- BSW commercial conversation anchored on cardiovascular service line procedural DRG capture (Pathway 1) — partial procedural coverage across all 6 modules is stronger commercial posture than full HF + zero EP/SH/CAD/VHD/PV
- Risk distribution: module roadblocks (clinical advisor unavailable, scope question on subcategory) don't stall entire build
- Operator's v1.2 §11 already rejected HF-first sequencing for similar reasons

**Hybrid sequencing — case for (middle path):**
- Phase 1a: Build procedural-decision-support framework once (~200-300h). HF + CAD as lead modules since they have the most procedural gaps. Shared infrastructure: SCAI staging, MCS escalation, stent complications patterns, peri-procedural risk.
- Phase 1b: Per-module completion using framework from Phase 1a. Sequence module-by-module (HF first, then CAD, EP, SH, VHD, PV). ~250-400h per module × 6 = ~1,500-2,400h.
- Captures domain-first's framework reuse + module-first's complete-shipping benefits.

**v2.0 author decides.** This audit's data supports all three sequencing choices. Final sequencing decision is part of v2.0 PATH_TO_ROBUST authorship (end-of-Week-3, ~2026-05-19), informed by EP/SH/VHD audits which will refine the procedural-domain-vs-non-procedural-domain split per module.

Operator has expressed module-by-module sequencing instinct (preserve full module context, ship complete modules). v2.0 should weigh this seriously alongside the domain-first finding.

---

## 12. Lessons learned for next module audits (EP next)

1. **Methodology robust across 3 modules** — per-subcategory tables, recompute headlines manually, surface broad-rule consolidation.
2. **Hypothesis test data is solid** — PV/HF/CAD provide enough variance (26.7% / 46% / 61.1% any) to verify rule density does correlate with coverage but sub-linearly. EP/SH/VHD audits will refine the platform-wide average.
3. **Pathway anchoring is essential** — every T1 SPEC_ONLY should carry BSW Pathway tag for v2.0 Phase 1 commercial-revenue prioritization.
4. **EXTRA rule count is informative** — HF=1 EXTRA suggests strict spec-driven build; CAD=15 EXTRA suggests organic accumulation. Track this for EP/SH/VHD to surface code-hygiene patterns.
5. **Naming convention drift** — every audited module so far has at least one naming-convention violation (`gap-hf-37-*` collision, `gap-50-dapt`, `gap-pv-rivaroxaban` cross-module). Track in next audits.
6. **Audit time:** ~6-8h hands-on for EP next (63 frontend files = bigger UI inventory but should be orthogonal to spec-code mapping work).
7. **Cross-module synthesis section** is the v2.0 input — keep it as §11 in each subsequent addendum and update the rolling table.

---

## 13. Time-unit disambiguation caveat (applies to all audit hour estimates)

All hour estimates in this addendum, in HF and PV addenda, in PATH_TO_ROBUST v1.2 §5, and in BUILD_STATE.md represent **raw work-scope**, NOT AI-assisted operator wall-clock time.

This is a significant gap. AI-assistance multipliers vary by work-type:

| Work type | AI-assisted speedup vs solo human |
|---|---|
| Audit / spec mapping / documentation | ~5-10× |
| Code generation (well-defined functions) | ~3-5× |
| Code review / debugging in unfamiliar code | ~2-3× |
| Architecture / system design | ~1.5-2× |
| Clinical content authorship | ~2-3× |
| Clinical advisor review / sign-off | 1× (human bottleneck) |
| Integration testing in real environments | ~1.5-2× |
| Production incident response | 1× (operator decision bottleneck) |

**Implications for v2.0 timeline math:**

If Phase 1 raw scope is 460-730h and work-mix is:
- 40% code generation + audit (4× speedup)
- 30% architecture + clinical review + integration (2× speedup)
- 30% clinical advisor sign-off + production debug + incident handling (1×)

Then AI-assisted operator wall-clock is roughly:
- 460h × (0.40/4 + 0.30/2 + 0.30/1) = 460h × 0.55 = ~250h
- 730h × 0.55 = ~400h
- At 60-70h/week capacity: 4-7 weeks for Phase 1 wall-clock, NOT 7-12 weeks raw-scope

Phase 1+2 combined wall-clock: ~10-13 weeks (~2.5-3 months), NOT 7-9 months as raw scope suggests.

**v2.0 PATH_TO_ROBUST authorship must:**
1. Disambiguate raw work-scope vs AI-assisted wall-clock for every estimate
2. State work-mix assumptions explicitly per phase
3. Apply multipliers per work-type
4. Identify human-bottleneck items (clinical advisor sign-off, production incidents) that don't get AI speedup
5. Compute wall-clock projections separately from raw-scope projections

**Empirical calibration plan:**

EP/SH/VHD audits will be logged with actual operator wall-clock minutes (not just "felt like" hours). By v2.0 authorship time (~2026-05-19), 4 module audits provide empirical data to back into multipliers per work-type. This replaces guessed multipliers with measured ones.

**The strategic posture (extend timeline, not scope) may be partially over-correcting:**
- Raw scope says 7-9 months
- AI-assisted wall-clock may be 3-4 months (less timeline extension needed than feared)
- Or AI-assisted wall-clock may be 5-6 months if clinical advisor bottlenecks dominate
- v2.0 makes the actual call with measured data

This caveat does NOT invalidate the §6.3 strategic posture (extend timeline if needed to do it right). It refines what "extend" means quantitatively. "Extend by 4-5 months to 7-9 months total" is a different commitment than "extend by 1-2 months to 5-6 months total."

---

## 14. Audit verdict (full classification mode)

**CAD module — full-classification verdict: BROADLY BUILT BUT PROCEDURALLY HOLLOW.**

- 28 DET_OK (31.1%), 27 PARTIAL (30.0%), 35 SPEC_ONLY (38.9%)
- 7 of 18 T1 priority gaps DET_OK; 6 SPEC_ONLY at T1 — moderate Phase 1 work
- **Lipid Management (69% covered, 62% DET_OK)** is platform's strongest medication subcategory — full Pathway 2 titration ladder works
- **Cardiogenic Shock (0%), Complex PCI (0%), Stent Complications (0%), Peri-procedure (0%)** — 4 entire procedural subcategories totaling 17 SPEC_ONLY gaps unimplemented
- 15 EXTRA rules without spec backing (vs HF 1 EXTRA) — organic accumulation finding
- Rules-per-DET_OK efficiency 2.71 (vs HF 1.78) — sub-linear scaling at density extreme
- Hypothesis "more built than thought" PARTIALLY CONFIRMED — true at the rule-density extreme for medication/screening, false for procedural decision support

**Reusable for other 3 modules (EP next):** methodology proven across PV + HF + CAD. Patterns of "broad rule consolidation" and "procedural-domain blind spot" surface in HF and CAD. Each subsequent module audit should produce per-subcategory tables + recomputed headline + T1 priority status separately + cross-module synthesis update.

---

*Authored 2026-05-03. Verdict driven by per-gap classification; per-subcategory tables are the source of truth.*
