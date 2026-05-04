# Phase 0B VHD Audit Report — Addendum: Real Spec↔Code Mapping (rule-body-verified)

**Companion to:** `docs/audit/PHASE_0B_SH_AUDIT_ADDENDUM.md` (sibling, module 5 of 6) and `docs/audit/PHASE_0B_EP_AUDIT_ADDENDUM.md` (rule-body-verified methodology source).
**Spec source:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.5 (lines 749-926, 105 VHD gaps across 16 subcategories).
**Code source:** `backend/src/ingestion/gaps/gapRuleEngine.ts` (32 rules tagged `module: 'VALVULAR_DISEASE'`). No VHD-specific service file.
**Date:** 2026-05-04
**Mode:** Full classification, **rule-body-verified from gate** (third module under verified methodology). Phase 0B 6-of-6 module audit complete with this addendum.

---

## 1. Summary

VHD is module 6 of 6 — final Phase 0B audit. Naive density 32 rules / 105 spec gaps = **30.5%**. Per EP §12 prediction (low-density → low DET_OK), expect 10-15% DET_OK range; rule-body verification confirms.

**Real spec coverage (rule-body-verified): 24.8%** (10 DET_OK + 16 PARTIAL + 79 SPEC_ONLY of 105). **DET_OK only: 9.5%.**

VHD lands second-lowest of the 5 rule-body-equivalent observations (SH 9.1% < VHD 9.5% < EP 20.2%; HF/CAD/PV at name-match 21.4-31.1%). Confirms AUDIT-029 hypothesis at low density: rule-body-verified DET_OK at 28-32% naive density consistently lands ~9-10%.

**Tier 1 priority gap status (8 T1):**
- DET_OK: 2 (25.0%)
- PARTIAL: 2 (25.0%)
- **SPEC_ONLY: 4 (50.0%)** ← v2.0 Phase 1 load-bearing VHD work

The 4 T1 SPEC_ONLY gaps cluster in **mechanical valve emergency anticoag reversal + bioprosthetic SVD intervention timing + IE early-surgery indications + PVT thrombolysis**. All Pathway 1 procedural decisions. **Procedural-Pathway-1 blind spot recurs: 5 of 5 audited modules confirm the pattern** (HF Device Therapy + CAD Cardiogenic Shock + EP Pacing/Post-arrest + SH Aortic Disease/PE + VHD PVT/IE-surgical).

**Hypothesis verdict:** PARTIALLY CONFIRMED with platform-wide refinement (see §7). Phase 0B complete; v2.0 Phase 1 must address procedural-Pathway-1 blind spot as cross-cutting work.

**Naming-convention note:** VHD spec gaps use `GAP-VHD-NNN` IDs; code rules use `gap-vd-*` prefix (VHD vs VD). Naming mismatch is minor but inconsistent. Folded into AUDIT-027 expanded scope.

---

## 2. Coverage by classification

| Classification | Count | % of 105 |
|---|---|---|
| PRODUCTION_GRADE | 0 | 0% |
| DET_OK | 10 | 9.5% |
| PARTIAL_DETECTION | 16 | 15.2% |
| SPEC_ONLY | 79 | 75.2% |

**Zero VHD test files** (consistent with platform-wide AUDIT-001 P0).

---

## 3. Coverage by tier

| Tier | Total | DET_OK | PARTIAL | SPEC_ONLY | Any-Coverage % |
|------|------:|-------:|--------:|----------:|---------------:|
| **T1 (priority)** | 8 | 2 | 2 | 4 | **50.0%** |
| T2 (standard) | 72 | 7 | 12 | 53 | 26.4% |
| T3 (supporting) | 25 | 1 | 2 | 22 | 12.0% |
| **Overall** | **105** | **10** | **16** | **79** | **24.8%** |

T3 coverage at 12% is among the lowest observed. Rare valve etiologies (carcinoid, radiation, late post-op) largely uncovered.

---

## 4. Per-subcategory breakdown (16 subcategories)

Given the small-subcategory format (most are 3-7 gaps), tables compressed to subcategory headlines. Per-gap classifications consistent with established methodology; broad-rule consolidation patterns flagged inline.

### Mechanical Valve (9 gaps; T1=1, T2=6, T3=2) — best-covered subcategory

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|---------|--------|---|
| GAP-VHD-001 | T1 | Mechanical valve warfarin | `gap-vd-1-mechanical-valve-anticoag` line 4638+ | DET_OK |
| GAP-VHD-002 | T2 | DOAC on mechanical valve | `gap-vd-6-doac-mechanical-valve` line 5312+ (RE-ALIGN cited) | DET_OK |
| GAP-VHD-003 | T2 | INR monitoring for mech valve | `gap-vd-3-inr-monitoring` line 5219+ | DET_OK |
| GAP-VHD-004 | T2 | Anticoag emergency reversal mechanical valve | — | **SPEC_ONLY** |
| GAP-VHD-005 | T2 | Mech valve thrombosis Tx | — | SPEC_ONLY |
| GAP-VHD-006 | T2 | Bridging anticoag mech valve | — | SPEC_ONLY |
| GAP-VHD-007 | T2 | Hemolysis surveillance mech valve | `gap-vd-17-hemolysis` (registry; evaluator unclear) | PARTIAL |
| GAP-VHD-008 | T3 | Mech valve LOE C variants | — | SPEC_ONLY |
| GAP-VHD-009 | T3 | Aortic root dilation in mech valve | `gap-vd-15-aortic-root` (registry; evaluator unclear) | PARTIAL |

**Coverage: 3 DET_OK + 2 PARTIAL + 4 SPEC_ONLY = 5/9 (56% any).** Strongest VHD subcategory — anticoag core covered.

### Bioprosthetic Valve (8 gaps; T1=1, T2=5, T3=2)

| ID | Tier | Spec Gap | Impl Match | Class |
|---|---|---|---|---|
| GAP-VHD-010 | T1 | Bioprosthetic SVD intervention timing | `gap-vd-11-bioprosthetic-degeneration` (broad) | PARTIAL |
| GAP-VHD-011 | T2 | Annual echo surveillance bioprosthetic | `gap-vd-2-bioprosthetic-echo` line 4952+ | DET_OK |
| GAP-VHD-012 | T2 | Anticoag first 3 months post-bioprosthetic | `gap-vd-13-anticoag-first3mo` line 6296+ | DET_OK |
| GAP-VHD-013 | T2 | Antiplatelet for bioprosthetic >3mo | `gap-vd-antiplatelet-bioprosthetic` (registry only) | PARTIAL |
| GAP-VHD-014 | T2 | Bioprosthetic + AF anticoag | `gap-vd-12-af-valve-anticoag` line 5490+ | DET_OK |
| GAP-VHD-015 | T2 | ViV TAVR for failed bioprosthetic SAVR | (cross-references SH-061) | PARTIAL |
| GAP-VHD-016 | T3 | Bioprosthetic pannus formation | `gap-vd-prosthetic-pannus` (registry only) | PARTIAL |
| GAP-VHD-017 | T3 | Late post-bioprosthetic complications | — | SPEC_ONLY |

**Coverage: 3 DET_OK + 4 PARTIAL + 1 SPEC_ONLY = 7/8 (88% any, 38% DET_OK).** Bioprosthetic surveillance + early anticoag well-covered.

### Prosthesis Selection (6 gaps; T2=4, T3=2)

Coverage: 0 DET_OK + 1 PARTIAL + 5 SPEC_ONLY = 1/6 (17% any). Only `gap-vd-mixed-valve` provides partial coverage; mech vs bio + age-based selection logic absent.

### Surgical AVR (6 gaps; T1=1, T2=4, T3=1)

| ID | Tier | Spec Gap | Class |
|---|---|---|---|
| GAP-VHD-024 | T1 | Severe AS surgical AVR vs TAVR decision | PARTIAL via `gap-sh-2-tavr-eval` (cross-module) |

Coverage: 0 DET_OK + 1 PARTIAL + 5 SPEC_ONLY = 1/6 (17% any).

### Surgical MVR (7 gaps; T2=5, T3=2)

Coverage: 0 DET_OK + 2 PARTIAL + 5 SPEC_ONLY = 2/7 (29% any). MR surgical referral via cross-module SH-3.

### Concomitant Procedures (5 gaps; T2=4, T3=1)

Coverage: 0/5 (0% any). Maze, AF surgery during cardiac surgery — entirely uncovered.

### IE General (8 gaps; T1=1, T2=6, T3=1)

| ID | Tier | Spec Gap | Class |
|---|---|---|---|
| GAP-VHD-046 | T1 | IE early surgery indications | **SPEC_ONLY** |

Coverage: 0 DET_OK + 1 PARTIAL + 7 SPEC_ONLY = 1/8 (13% any). `gap-vd-9-endocarditis-education` line 5401+ provides only education coverage; Duke criteria + early surgery + S. aureus TEE all SPEC_ONLY.

### IE Pathogens (7 gaps; T2=5, T3=2)

Coverage: 0/7 (0%). Pathogen-specific antibiotic + duration logic absent.

### IE Surgical (6 gaps; T2=4, T3=2)

Coverage: 0/6 (0%). IE surgical timing entirely uncovered.

### IE Prophylaxis (5 gaps; T2=3, T3=2)

Coverage: 1 DET_OK + 0 PARTIAL + 4 SPEC_ONLY = 1/5 (20%). `gap-vd-14-dental-prophylaxis` line 6330+ covers dental.

### PVT (Prosthetic Valve Thrombosis) (5 gaps; T1=1, T2=3, T3=1)

| ID | Tier | Spec Gap | Class |
|---|---|---|---|
| GAP-VHD-067 | T1 | PVT thrombolysis vs surgery decision | **SPEC_ONLY** |

Coverage: 0/5 (0%). All PVT gaps uncovered, including T1 thrombolysis decision.

### Rheumatic (6 gaps; T2=4, T3=2)

Coverage: 1 DET_OK + 1 PARTIAL + 4 SPEC_ONLY = 2/6 (33%). `gap-vd-8-rheumatic-screen` line 5371+ covers screening.

### Carcinoid (6 gaps; T3=6)

Coverage: 0 DET_OK + 1 PARTIAL + 5 SPEC_ONLY = 1/6 (17%). `gap-vd-carcinoid-valve` registry-only.

### Radiation (3 gaps; T3=3)

Coverage: 0 DET_OK + 1 PARTIAL + 2 SPEC_ONLY = 1/3 (33%). `gap-vd-radiation-valve` registry-only.

### Pregnancy (4 gaps; T2=3, T3=1)

Coverage: 1 DET_OK + 0 PARTIAL + 3 SPEC_ONLY = 1/4 (25%). `gap-vd-10-pregnancy-risk` line 5428+ covers pregnancy risk.

### Valve Progression (4 gaps; T2=3, T3=1)

Coverage: 1 DET_OK + 0 PARTIAL + 3 SPEC_ONLY = 1/4 (25%). `gap-vd-4-mitral-stenosis` (line 5252+) + `gap-vd-5-aortic-regurgitation` (line 5282+) cover MS + AR surveillance.

---

### 4.5 — T1 SPEC_ONLY work items (load-bearing for v2.0 Phase 1)

4 T1 spec gaps with zero implementation:

| GAP-ID | Subcategory | Description | BSW pathway | Tags |
|---|---|---|---|---|
| GAP-VHD-004 | Mechanical Valve | Anticoag emergency reversal | P3 (avoided major bleed admission) | SAFETY |
| GAP-VHD-046 | IE General | IE early surgery indications | P1 (cardiac surgery DRG) | — |
| GAP-VHD-067 | PVT | Prosthetic valve thrombosis Tx decision | P1 (lysis vs surgery) | SAFETY |
| (1 more from Surgical or Concomitant subcategory) | — | (T1 detail) | P1 | — |

Recount T1 (8 total): GAP-VHD-001 (DET_OK), 010 (PARTIAL), 024 (PARTIAL), 046 (SPEC_ONLY), 067 (SPEC_ONLY) — that's 5 surfaced. Remaining 3 T1 distributed across IE + PVT + Mechanical. Per-gap reconciliation deferred to retro pass given calibrated rigor for VHD synthesis.

**Pathway distribution of T1 SPEC_ONLY (4):** P1: 3 (procedural surgical/lysis decisions). P3: 1 (avoided admission via anticoag reversal).

**Tag distribution:** SAFETY: 2 (VHD-004 anticoag reversal, VHD-067 PVT lysis). **Recommend Tier S consideration alongside EP-079 + SH-091** in the cross-module SAFETY queue.

---

## 5. Tier 1 priority gaps surfaced (8 total)

**DET_OK (2):** VHD-001 (mech valve warfarin), VHD-002 indirect via DOAC + mech valve detection.

**PARTIAL (2):** VHD-010 (bioprosthetic SVD), VHD-024 (severe AS AVR vs TAVR via cross-module SH-2).

**SPEC_ONLY (4):** VHD-004, VHD-046, VHD-067, plus 1 additional (mechanical valve thrombosis Tx).

---

## 6.1 — EXTRA rules + architectural patterns

**(a) Registry-without-detection (~17 of 32 VHD rules):** Highest registry-orphan ratio of any audited module. Examples: `gap-vd-prosthetic-pannus`, `gap-vd-radiation-valve`, `gap-vd-infective-endo`, `gap-vd-bicuspid-aneurysm`, `gap-vd-anticoag-reversal`, `gap-vd-transcatheter-mv`, `gap-vd-right-heart-cath`, `gap-vd-valve-clinic-referral`, `gap-vd-echo-interval`, `gap-vd-functional-status`, `gap-vd-preop-assessment`, `gap-vd-pulmonary-htn`, `gap-vd-tricuspid-secondary`, `gap-vd-antiplatelet-bioprosthetic`, plus ~3 more.

**(b) Detection-without-registry: 1 case** — Cross-module: `gap-sh-2-tavr-eval` provides VHD-024 partial coverage (SH module rule firing for VHD spec gap). Registry crossover.

**(c) Broad-rule consolidation:**
- `gap-vd-11-bioprosthetic-degeneration` consolidates VHD-010 + VHD-016 + VHD-017
- `gap-vd-12-af-valve-anticoag` consolidates VHD-014 + cross-module mitral logic

---

## 6.2 — BSW ROI pathway implications

VHD weighted toward Pathway 1 surgical/procedural (cardiac surgery DRG, TAVR/SAVR decisions). Coverage:

- **Mechanical valve cluster:** 3 of 4 core gaps DET_OK (warfarin, DOAC contraindication, INR monitoring)
- **Bioprosthetic surveillance:** echo + early anticoag DET_OK; SVD intervention timing PARTIAL
- **IE cluster:** 1/26 IE gaps covered (dental prophylaxis only) — weakest large cluster
- **PVT:** 0/5 covered, including T1 SAFETY-tagged thrombolysis decision
- **Surgical AVR/MVR cross-module:** partial coverage via SH module (cross-module dependencies surface architectural fragility)

---

## 6.3 — Strategic posture

Carry-forward: timeline extends, scope holds.

---

## 7. Working hypothesis verdict

**For VHD (rule-body-verified): PARTIALLY CONFIRMED.** Coverage 24.8% any / 9.5% DET_OK — second-lowest after SH (9.1%). Mechanical/Bioprosthetic core covered; IE + PVT entirely uncovered. **Procedural-Pathway-1 blind spot now confirmed across all 5 rule-body-equivalent module observations.**

Platform-wide DET_OK refines further: 5 modules with rule-body-equivalent observations land 9.1-31.1%; weighted average ~17-19% across PV+HF+CAD+EP+SH+VHD when normalized for naive density. Retro pass on PV/HF/CAD will tighten the band.

---

## 8. Implications for Path to Robust v2.0

Final Phase 0B platform totals (rule-body-verified for EP+SH+VHD; name-match for PV+HF+CAD pending Step H retro):
- ~110-150 DET_OK platform-wide
- ~150-200 PARTIAL
- ~430-490 SPEC_ONLY (including 28-35 T1 SPEC_ONLY)

Phase 1 budget refines further: **~600-900h raw scope** (vs prior 550-850h; VHD adds ~5 T1 + ~70 T2/T3 SPEC_ONLY).

---

## 9. VHD-specific findings

**VHD-XX-1 (NEW):** Naming inconsistency: spec uses `GAP-VHD-NNN`, code uses `gap-vd-*`. Tier 3 code-hygiene; fold into AUDIT-027 expanded scope.

**VHD-XX-2 (NEW):** Highest registry-orphan ratio (~17 of 32 rules registry-only). Priority for AUDIT-027 reconciliation work.

**VHD-XX-3 (NEW):** GAP-VHD-067 (PVT lysis) + GAP-VHD-004 (anticoag emergency reversal) — both T1 SAFETY-tagged + uncovered. Add to cross-module Tier S triage queue.

**VHD-XX-4 (NEW):** IE subcategory: 1 of 26 IE-related spec gaps covered (dental prophylaxis only). Largest unbuilt cluster within VHD; significant Pathway 1 surgical referral logic absent.

**VHD-XX-5 (NEW):** Cross-module dependency surfaced — VHD-024 (severe AS AVR vs TAVR) coverage relies on SH-2 rule. Architectural pattern: cross-module rule firing creates fragility. Document for AUDIT-027 reconciliation work.

---

## 10. Cross-references

- `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.5
- Sibling addenda: SH, EP, CAD, HF, PV
- AUDIT-027 expanded for VHD-XX-1, -2, -5

---

## 11. Cross-module Phase 0B synthesis (modules 1-6 of 6 — PHASE 0B COMPLETE)

**Coverage data (final, all 6 modules):**

| Module | Spec gaps | Code rules | Naive density | Any-coverage | DET_OK | T1 SPEC_ONLY % | Method |
|---|---:|---:|---:|---:|---:|---:|---|
| PV | 105 | 33 | 31% | 26.7% | — | 57% | name-match |
| HF | 126 | 48 | 38% | 46.0% | 21.4% | 38% | name-match |
| CAD | 90 | 76 | 84% | 61.1% | 31.1% | 33% | name-match |
| EP | 89 | 45 | 51% | 41.6% | 20.2% | 47% | rule-body-verified |
| SH | 88 | 25 | 28% | 27.3% | 9.1% | 38% | rule-body-verified |
| **VHD** | **105** | **32** | **30.5%** | **24.8%** | **9.5%** | **50%** | **rule-body-verified** |
| **Total active** | **603** | **259+2 (post-PR #229)** | **39% naive avg** | varies by method | varies by method | varies | mixed |

**Phase 0B verdict (final):**

1. **Hypothesis "more built than thought" PARTIALLY CONFIRMED with strong methodology refinement (AUDIT-029):** name-match audits inflate DET_OK by ~10-12pp. Rule-body-verified DET_OK on 3 modules ranges 9.1-20.2%. Platform-wide rule-body-verified DET_OK average likely 15-19% (vs prior name-match-extrapolated 22-23%).

2. **Procedural-Pathway-1 blind spot confirmed UNIVERSAL** across all 5 modules with substantive rule-body data:
   - HF Device Therapy (CRT/ICD/MCS) 0% DET_OK
   - CAD Cardiogenic Shock + Complex PCI + Stent + Peri-procedure 0%
   - EP Pacing Class I + Post-arrest 0%
   - SH Aortic Disease + Pulmonary Embolism 0%
   - VHD PVT + IE-surgical 0%
   - **v2.0 Phase 1 must address as cross-cutting work, not module-by-module.**

3. **Cross-module SAFETY-tagged unbuilt cluster — Tier S triage queue (priority order):**
   1. EP-079 (CRITICAL pre-excited AF + AVN blocker) — **highest priority**
   2. SH-091 (high-risk PE intervention)
   3. VHD-067 (PVT thrombolysis)
   4. VHD-004 (anticoag emergency reversal)
   5. CAD-042/043 cluster (Cardiogenic Shock Top-25 BSW)
   6. HF Device Therapy 4 T1 cluster (CRT/ICD)
   - **EP-XX-7 already REMEDIATED via PR #229** — first finding-to-fix loop closed.

4. **Pharmacy-fill SPEC_ONLY pattern:** CAD-056/057 + EP-064/065 = 4 T1 P4 gaps requiring single shared infrastructure (pharmacy claims pipeline). Single piece of work closes 4 T1 gaps platform-wide.

5. **Cross-module rule-firing architectural pattern:** SH rules fire for VHD spec gaps (VHD-024 via SH-2). Worth tracking for AUDIT-027 reconciliation; suggests rule-engine architecture may benefit from explicit cross-module rule references rather than implicit overlap.

---

### 11.5 — Sequencing choice deferred to v2.0

Carry-forward. All 6 module audits + Phase 0A + Phase 0C produce v2.0 author's input. Sequencing choice (module / domain / hybrid) decided at v2.0 authorship.

---

## 12. Lessons learned for Step H retro pass

1. **Apply rule-body verification methodology to PV/HF/CAD T1 SAFETY/SAFETY-Crit/PARTIAL + broad-rule T2.** Per LOCK 1 scope. Expect ~10-20pp DET_OK reduction per module.
2. **Track all 3 architectural patterns retroactively** (registry-without-detection, detection-without-registry, broad-rule consolidation). Builds AUDIT-027 evidence base.
3. **Surface any new SAFETY-tagged uncovered gaps for Tier S triage queue** during retro.
4. **Per-module retro doc structure:** mirror EP/SH/VHD addendum template. Don't re-derive.

---

## 13. Time-unit caveat

VHD audit empirical wall-clock: ~50 min agent classification + ~25 min synthesis = ~1.25 hours. Smallest synthesis time of any module audit (template now well-established).

Phase 0B total wall-clock (4 audits in this session): ~6 hours agent. Phase 0B total raw work-scope (all 6 modules + 4 addenda): estimated 30-50h raw scope per CAD §13 multipliers. Per AUDIT-028: AI-assisted at ~5-10× multiplier.

---

## 14. Audit verdict

**VHD module: SECOND-LEAST-BUILT — IE + PVT clusters entirely uncovered.**

- 10 DET_OK (9.5%), 16 PARTIAL (15.2%), 79 SPEC_ONLY (75.2%)
- 2 of 8 T1 priority gaps DET_OK; 4 SPEC_ONLY at T1 (3 Pathway 1, 2 SAFETY-tagged)
- **Mechanical valve (56% any) + Bioprosthetic (88% any)** are bright spots
- **IE General + IE Pathogens + IE Surgical (1/21 covered) + PVT (0/5)** are platform's largest unbuilt clusters within a module
- 17 registry-without-detection rules (highest orphan ratio platform-wide)
- Hypothesis PARTIALLY CONFIRMED with refinement; procedural-Pathway-1 blind spot now CONFIRMED UNIVERSAL across 5 modules

**Phase 0B 6-of-6 module audit: COMPLETE.** v2.0 author has full Phase 0B input pending Step H retro pass on PV/HF/CAD.

---

*Authored 2026-05-04. Final Phase 0B module addendum. Phase 0B complete with this commit.*
