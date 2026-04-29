# Phase 0B PV Audit Report — Addendum: Real Spec↔Code Mapping

**Companion to:** `docs/audit/PHASE_0B_PV_AUDIT_REPORT.md`
**Spec source:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.6 (105 PV gaps)
**Code source:** `backend/src/ingestion/gaps/gapRuleEngine.ts` (33 PV rules)
**Date:** 2026-04-29
**Mode:** Full classification (Option A per the Phase 0B framework, now possible since CK v4.0 is in repo)

---

## 1. Summary

Original Phase 0B PV report was codebase-only: 33 implemented rules with full guideline citations, no spec comparison. The 33-rules-vs-105-spec-gaps naive estimate gave ~31% coverage as a "1:1 mapping" assumption.

With CK v4.0 in repo, this addendum performs **the real intent-based mapping**. For each of the 105 PV gaps in the spec, I traced:
1. Does an implemented rule address the same clinical intent?
2. If yes, does it cover the spec's detection logic completely (DETECTION_OK) or only partially (PARTIAL_DETECTION)?
3. If no, the gap is SPEC_ONLY.

**Verdict for PV: 26.7% spec coverage, lower than the naive estimate.** The 33 implemented rules don't all map 1:1 to distinct spec gaps — 9 rules go beyond the spec (extra coverage), and several spec gaps are addressed by the same broad implementation rule.

---

## 2. Coverage by classification

| Classification | Count | % of 105 spec gaps |
|---------------|------:|-------------------:|
| PRODUCTION_GRADE (det + UI + tests) | 0 | 0% |
| DET_OK_UI_OK_NO_TESTS | 16 | 15.2% |
| DETECTION_OK_NO_UI | 0 | 0% |
| PARTIAL_DETECTION | 12 | 11.4% |
| SPEC_ONLY | 77 | 73.3% |

**Note on PRODUCTION_GRADE = 0:** AUDIT-001 from Phase 1 backend audit confirmed 0% test coverage on the gap rule engine. No PV gap can earn PRODUCTION_GRADE today because the test gate alone is binary-fail.

**Note on DETECTION_OK_NO_UI = 0:** PV has 26 frontend component files (per Phase 0B PV codebase inventory). At a directory level, UI scaffolding exists for the implemented gaps. None of the 28 mapped gaps are detection-only-without-UI; they're all in the DET_OK_UI_OK class once you exclude tests.

---

## 3. Coverage by tier

| Tier | Total | Covered | Partial | Spec Only | Any-Coverage % |
|------|------:|--------:|--------:|----------:|---------------:|
| **T1 (priority)** | 7 | 1 | 2 | 4 | **42.9%** |
| T2 (standard) | 82 | 14 | 8 | 60 | 26.8% |
| T3 (supporting) | 16 | 1 | 2 | 13 | 18.8% |
| **Overall** | **105** | **16** | **12** | **77** | **26.7%** |

**Tier 1 priority gaps deserve closest attention.** PV has only 7 T1 gaps (lowest of any module). Of those:
- 1 covered: GAP-PV-011 (COMPASS regimen) → `gap-pv-rivaroxaban`
- 2 partial: GAP-PV-017, GAP-PV-018 (CLTI BEST-CLI heart team / endo-vs-surgical decision) → `gap-pv-bypass-eval` (broader intent)
- 4 spec-only: GAP-PV-055, GAP-PV-056 (AAA intervention thresholds), GAP-PV-058 (symptomatic carotid >=70% revasc <2 wk), GAP-PV-079 (CTEPH PTE evaluation)

The 4 T1 SPEC_ONLY gaps are the **PV module's most material implementation gaps for production-grade**.

---

## 4. Per-gap classification table

Subcategories follow CK v4.0 §6.6 grouping. Each spec gap maps to its current implementation match (or SPEC_ONLY).

### PAD Detection (7 gaps)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-PV-001 | T2 | PAD: ABI never measured in symptomatic | `gap-pv-2-abi-screening` | PARTIAL |
| GAP-PV-002 | T2 | Diabetic + PAD risk: ABI screening | `gap-pv-2-abi-screening` | PARTIAL |
| GAP-PV-003 | T2 | Abnormal ABI without PAD dx coded | — | SPEC_ONLY |
| GAP-PV-004 | T2 | Non-compressible ABI: TBI follow-up | — | SPEC_ONLY |
| GAP-PV-005 | T2 | Exercise ABI for normal resting + symptoms | — | SPEC_ONLY |
| GAP-PV-006 | T2 | Rutherford classification gap | — | SPEC_ONLY |
| GAP-PV-007 | T2 | Fontaine staging | — | SPEC_ONLY |

**Coverage:** 0 covered, 2 partial, 5 spec-only. ABI screening implementation is generic; it doesn't differentiate symptomatic-without-ABI vs DM-risk-without-ABI vs abnormal-ABI-without-dx-coded.

### PAD Prevention (9 gaps)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-PV-008 | T2 | PAD: statin not prescribed | `gap-pv-1-pad-statin` | DET_OK |
| GAP-PV-009 | T2 | PAD: high-intensity statin gap | `gap-pv-1-pad-statin` | PARTIAL |
| GAP-PV-010 | T2 | PAD: antiplatelet gap | `gap-pv-3-antiplatelet` | DET_OK |
| GAP-PV-011 | **T1** | PAD: rivaroxaban 2.5 BID + ASA (COMPASS) | `gap-pv-rivaroxaban` | DET_OK |
| GAP-PV-012 | T2 | PAD: cilostazol for claudication | `gap-pv-10-cilostazol` | DET_OK |
| GAP-PV-013 | T2 | PAD: supervised exercise therapy referral | `gap-pv-5-exercise-therapy` | DET_OK |
| GAP-PV-014 | T2 | PAD: smoking cessation intervention | `gap-pv-4-smoking-cessation` | DET_OK |
| GAP-PV-015 | T2 | PAD + DM: A1c target gap | `gap-pv-6-diabetes-control` | DET_OK |
| GAP-PV-016 | T2 | PAD + BP control: SBP>140 gap | `gap-pv-11-acei-pad` | PARTIAL |

**Coverage:** 7 covered (high density), 2 partial, 0 spec-only. PAD prevention is the strongest-covered subcategory.

### CLTI (6 gaps)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-PV-017 | **T1** | CLTI: BEST-CLI heart team discussion | `gap-pv-bypass-eval` | PARTIAL |
| GAP-PV-018 | **T1** | CLTI: endo-vs-surgical decision (BEST-CLI) | `gap-pv-bypass-eval` | PARTIAL |
| GAP-PV-019 | T2 | CLTI + diabetic foot MDT | — | SPEC_ONLY |
| GAP-PV-020 | T2 | Pedal loop angioplasty for distal CLTI | — | SPEC_ONLY |
| GAP-PV-021 | T2 | CLTI: WIfI staging documentation | — | SPEC_ONLY |
| GAP-PV-022 | T2 | CLTI: SVS amputation risk | — | SPEC_ONLY |

**Coverage:** 0 covered, 2 partial, 4 spec-only. **2 T1 gaps are PARTIAL.** WIfI is a UI component (`WIfIClassification.tsx`) but no backend rule.

### TASC Staging (5 gaps)

All 5 SPEC_ONLY (no implementation): GAP-PV-023 through GAP-PV-027.

### Mesenteric Ischemia (5 gaps)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-PV-028 | T2 | Acute mesenteric ischemia: suspected without CTA | — | SPEC_ONLY |
| GAP-PV-029 | T2 | Chronic mesenteric ischemia: food fear + weight loss | — | SPEC_ONLY |
| GAP-PV-030 | T2 | Confirmed CMI: revasc indication | `gap-pv-mesenteric` | PARTIAL |
| GAP-PV-031 | T2 | Median arcuate ligament syndrome | — | SPEC_ONLY |
| GAP-PV-032 | T2 | NOMI in shock | — | SPEC_ONLY |

### Renal Artery (4 gaps)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-PV-033 | T2 | Resistant HTN: RAS screening | `gap-pv-12-renal-artery` | DET_OK |
| GAP-PV-034 | T2 | FMD screening in young HTN female | — | SPEC_ONLY |
| GAP-PV-035 | T2 | RAS intervention: CORAL-aligned decision | — | SPEC_ONLY |
| GAP-PV-036 | T2 | Flash pulm edema + bilateral RAS | — | SPEC_ONLY |

### Vasculitis (6 gaps)

All 6 SPEC_ONLY: GAP-PV-037 through GAP-PV-042.

### Upper Extremity (5 gaps)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-PV-043 | T2 | Subclavian stenosis: BP differential | — | SPEC_ONLY |
| GAP-PV-044 | T2 | Subclavian steal syndrome | — | SPEC_ONLY |
| GAP-PV-045 | T2 | Thoracic outlet syndrome | `gap-pv-thoracic-outlet` | DET_OK |
| GAP-PV-046 | T2 | Popliteal entrapment in young athlete | — | SPEC_ONLY |
| GAP-PV-047 | T2 | Pre-dialysis access mapping | — | SPEC_ONLY |

### Raynaud (3 gaps)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-PV-048 | T3 | Raynaud primary vs secondary distinction | — | SPEC_ONLY |
| GAP-PV-049 | T2 | Secondary Raynaud + digital ischemia | `gap-pv-raynaud` | PARTIAL |
| GAP-PV-050 | T2 | Scleroderma early referral | — | SPEC_ONLY |

### AAA (7 gaps)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-PV-051 | T2 | AAA screening: male 65-75 ever-smoker | `gap-pv-9-aaa-screening` | DET_OK |
| GAP-PV-052 | T3 | AAA surveillance: 3.0-3.9 every 3 yr | — | SPEC_ONLY |
| GAP-PV-053 | T3 | AAA surveillance: 4.0-4.9 annual | — | SPEC_ONLY |
| GAP-PV-054 | T3 | AAA surveillance: 5.0-5.4 every 6 mo | — | SPEC_ONLY |
| GAP-PV-055 | **T1** | AAA >=5.5 cm male: intervention | — | SPEC_ONLY |
| GAP-PV-056 | **T1** | AAA >=5.0 cm female: intervention | — | SPEC_ONLY |
| GAP-PV-057 | T2 | AAA rapid expansion: intervention | — | SPEC_ONLY |

**Both T1 AAA intervention gaps SPEC_ONLY.** Implementation has AAA screening but not size-threshold intervention triggers.

### Carotid/CVA (5 gaps)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-PV-058 | **T1** | Symptomatic carotid >=70%: revasc <2 wk | — | SPEC_ONLY |
| GAP-PV-059 | T2 | CREST-2 asymptomatic 70-99% decision | `gap-pv-13-carotid` | PARTIAL |
| GAP-PV-060 | T2 | Post-CEA/CAS antiplatelet+statin continuation | — | SPEC_ONLY |
| GAP-PV-061 | T2 | Carotid duplex surveillance post-revasc | — | SPEC_ONLY |
| GAP-PV-062 | T2 | Intracranial stenosis SAMMPRIS | — | SPEC_ONLY |

**T1 GAP-PV-058 SPEC_ONLY.** Time-critical revasc trigger absent.

### Venous Disease (9 gaps)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-PV-063 | T2 | Iliofemoral DVT: thrombolysis (ATTRACT) | — | SPEC_ONLY |
| GAP-PV-064 | T2 | Recurrent DVT thrombophilia workup | — | SPEC_ONLY |
| GAP-PV-065 | T2 | May-Thurner syndrome | `gap-pv-dvt-screen` | PARTIAL |
| GAP-PV-066 | T2 | Paget-Schroetter | — | SPEC_ONLY |
| GAP-PV-067 | T2 | Post-thrombotic syndrome compression | `gap-pv-pts-prevention` | DET_OK |
| GAP-PV-068 | T2 | IVC filter AC contraindication | — | SPEC_ONLY |
| GAP-PV-069 | T2 | Retrievable IVC filter retrieval | — | SPEC_ONLY |
| GAP-PV-070 | T2 | CVI compression therapy | `gap-pv-15-compression` | DET_OK |
| GAP-PV-071 | T2 | Varicose vein ablation | `gap-pv-varicose` | DET_OK |

### PE Risk Strat (6 gaps)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-PV-072 | T2 | PESI/sPESI risk stratification | — | SPEC_ONLY |
| GAP-PV-073 | T2 | Submassive PE: CDT evaluation | — | SPEC_ONLY |
| GAP-PV-074 | T2 | Massive PE: lysis/embolectomy/ECMO | — | SPEC_ONLY |
| GAP-PV-075 | T2 | FlowTriever/EKOS in submassive PE | — | SPEC_ONLY |
| GAP-PV-076 | T2 | Post-PE anticoagulation duration | `gap-pv-anticoag-vte` | DET_OK |
| GAP-PV-077 | T2 | Unprovoked PE cancer screening | — | SPEC_ONLY |

### CTEPH (4 gaps)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-PV-078 | T2 | Post-PE 3-6mo persistent dyspnea V/Q | — | SPEC_ONLY |
| GAP-PV-079 | **T1** | CTEPH dx: PTE evaluation | — | SPEC_ONLY |
| GAP-PV-080 | T2 | Inoperable CTEPH BPA | — | SPEC_ONLY |
| GAP-PV-081 | T2 | CTEPH riociguat | — | SPEC_ONLY |

**T1 GAP-PV-079 SPEC_ONLY.** CTEPH coverage is entirely missing.

### PAH (6 gaps)

All 6 SPEC_ONLY: GAP-PV-082 through GAP-PV-087. PAH is its own emerging clinical area (sotatercept, etc.).

### AVM (3 gaps), Vascular Access (3 gaps), Lymphatic/Misc (2 gaps)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-PV-088 | T3 | HHT screening | — | SPEC_ONLY |
| GAP-PV-089 | T3 | Pulmonary AVM | — | SPEC_ONLY |
| GAP-PV-090 | T3 | HHT GI AVM | — | SPEC_ONLY |
| GAP-PV-091 | T3 | AVF surveillance flow | — | SPEC_ONLY |
| GAP-PV-092 | T3 | AV access salvage | — | SPEC_ONLY |
| GAP-PV-093 | T3 | Central venous stenosis | — | SPEC_ONLY |
| GAP-PV-094 | T3 | Lymphedema staging | `gap-pv-lymphedema` | PARTIAL |
| GAP-PV-095 | T3 | Secondary lymphedema CDT | `gap-pv-lymphedema` | PARTIAL |

### Peri-procedure (5 gaps)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-PV-096 | T2 | Pre-vascular surgery cardiac risk | — | SPEC_ONLY |
| GAP-PV-097 | T2 | CIN prophylaxis in CKD | — | SPEC_ONLY |
| GAP-PV-098 | T3 | Post-bypass duplex 3-6-12mo | `gap-pv-graft-surveillance` | DET_OK |
| GAP-PV-099 | T3 | EVAR surveillance CT | — | SPEC_ONLY |
| GAP-PV-100 | T3 | Endoleak management | — | SPEC_ONLY |

### Special Populations (5 gaps)

| ID | Tier | Spec Gap | Impl Match | Class |
|----|-----|----------|------------|-------|
| GAP-PV-101 | T2 | Diabetic foot annual monofilament + ABI | `gap-pv-14-foot-exam` | DET_OK |
| GAP-PV-102 | T2 | Rural/ADI-high SET telehealth | — | SPEC_ONLY |
| GAP-PV-103 | T2 | Pregnancy + vascular emergency | — | SPEC_ONLY |
| GAP-PV-104 | T3 | Transgender hormone + VTE counseling | — | SPEC_ONLY |
| GAP-PV-105 | T2 | Elderly + PAD + frailty CFS | — | SPEC_ONLY |

---

## 5. Implemented rules NOT mapped to a spec gap

9 of 33 implemented rules don't cleanly map to a CK v4.0 spec gap. These represent either:
- **Extra coverage** (clinical content valid but not in BSW v7.1 catalog), or
- **Naming/intent ambiguity** (the rule could map but the spec phrasing differs)

| Rule ID | Rule Name | Likely Status |
|---------|-----------|---------------|
| `gap-pv-7-wound-care` | Wound Care Assessment | EXTRA — overlaps with CLTI subcategory but no exact spec match |
| `gap-pv-8-duplex-followup` | Duplex Ultrasound Follow-up | EXTRA — generic post-intervention surveillance |
| `gap-pv-clopidogrel` | Clopidogrel for Aspirin Intolerance in PAD | EXTRA — not a separate spec gap (specifies alternative medication) |
| `gap-pv-endovascular` | Endovascular Evaluation for Claudication | EXTRA |
| `gap-pv-venous-ulcer` | Venous Ulcer Management | EXTRA — venous disease subcategory has 9 spec gaps; this is broader-scope |
| `gap-pv-vascular-rehab` | Vascular Rehabilitation Post-Intervention | EXTRA |
| `gap-pv-pentoxifylline` | Pentoxifylline When Cilostazol Contraindicated | EXTRA — alternative medication path |
| `gap-pv-naftidrofuryl` | Naftidrofuryl for Severe Claudication | EXTRA — non-US-formulary (ESC guideline) |
| `gap-cli-urgent` (id mislabeled `gap-ep-af-catheter-timing`) | Critical Limb Ischemia Urgent Evaluation | OVERLAPS with GAP-PV-017/018 CLTI partial coverage; double-counted? |

These 9 rules represent meaningful clinical content but suggest the implementation was not built strictly against the v4.0 spec — it's an earlier or independently-evolved clinical knowledge base.

---

## 6. Working hypothesis verdict

**Original framing in `docs/PATH_TO_ROBUST.md` v1.2 §2:**
> "Strong working hypothesis: more is implemented than the 280 figure suggests; the gap is wiring and UI surfacing, not detection logic creation."

**Verdict for PV (data-driven):** **Hypothesis NOT confirmed for PV.** Real spec coverage is **26.7%, lower** than CLAUDE.md's "280+ algorithms" framing implied.

If PV's coverage rate (26.7%) is representative of all 7 modules:
- 0.267 × 708 = **~189 spec gaps with implementation** across the platform
- This is BELOW the CLAUDE.md "280+" framing
- The hypothesis "more built than 280" is contradicted by PV data

**Caveats:**
- Other modules may have higher coverage. HF has 48 implemented rules vs 126 spec gaps; if its coverage rate is similar to PV's pattern, that's ~33-40 spec gaps covered. EP has 45 rules vs 89 spec gaps — probably higher density but unverified.
- The "280+" figure may have referred to something different from "spec gaps with implementation" (e.g., total rules across modules, including legacy rules that don't map to any current spec gap).
- 9 of 33 PV implemented rules are EXTRA — they cover clinical content not in the spec. This could mean the platform's true clinical coverage is LARGER than the spec, just not aligned to it. Cleanup work would consolidate.

**The honest characterization:** the platform has substantial PV clinical content (33 rules, 26 frontend components, evidence-cited guidelines), but only ~27% of the BSW spec's PV gaps are addressed by it. Path to Robust v2.0 must reflect this concretely.

---

## 7. Implications for Path to Robust v2.0 (deferred to Week 3)

**v1.2 timeline math implications (do not author v1.3 yet):**

If extrapolated to all 7 modules:
- Tier 1: 107 spec gaps × ~43% any-coverage ≈ 46 covered, ~61 SPEC_ONLY → roughly **~61 T1 gaps to build from scratch**, not zero
- Tier 2: 462 × ~27% any-coverage ≈ 125 covered, **~337 SPEC_ONLY**
- Tier 3: 139 × ~19% any-coverage ≈ 26 covered, **~113 SPEC_ONLY**
- Total: ~511 SPEC_ONLY across the platform

**This significantly changes the v1.2 phase budget:**
- v1.2 Phase 1 budget for Tier 1 was ~250-350h based on "verify and polish" framing for ~107 gaps
- If 61 T1 gaps are SPEC_ONLY (build-from-scratch, not verify-and-polish), that's ~6-10h per gap × 61 = ~370-610h additional Phase 1 effort
- Phase 2 budget for Tier 2 (462 gaps at ~1.5-2.5h each = ~600-900h in v1.2) was based on "templated UI + detection verification"
- If 337 are SPEC_ONLY, real Phase 2 effort ≈ 337 × 4h (templated build) + 125 × 1.5h (verify) = ~1540h + 188h = ~1700h, **~2-3× the v1.2 estimate**

**v2.0 must reflect this honestly.** The 3-4 month timeline is potentially understated; the operator may need to either:
- Reduce scope (defer some Tier 2 / Tier 3 to a v1.1 or accept partial coverage for v1.0)
- Extend timeline to 5-6 months
- Engage clinical content contractors

This is a real budget revision, not a minor adjustment.

**Other 6 modules:** Phase 0B audits will follow this same template. Each module's coverage rate will sharpen the v2.0 budget. Module Parity Principle (v1.2 §11) means we don't ship some modules at high coverage and others at low — all 7 must reach the same tier-completion bar before each phase exits.

---

## 8. Cross-references

- `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` — spec source for all 105 PV gaps
- `docs/audit/PHASE_0B_PV_AUDIT_REPORT.md` — original codebase-only PV inventory (now superseded by this addendum's spec↔code mapping)
- `docs/audit/PHASE_0B_CLINICAL_AUDIT_FRAMEWORK.md` — methodology
- `docs/audit/PHASE_1_REPORT.md` — AUDIT-001 (testing gap blocks PRODUCTION_GRADE)
- `docs/PATH_TO_ROBUST.md` v1.2 — strategic plan; v2.0 revision at Week 3 will reflect this addendum's findings

---

## 9. Audit verdict (full classification mode)

**PV module — full-classification verdict: SUBSTANTIAL_GAP.**

- 16 fully covered (15.2%), 12 partial (11.4%), 77 spec-only (73.3%)
- 4 of 7 T1 priority gaps are SPEC_ONLY (AAA intervention thresholds, symptomatic carotid revasc, CTEPH PTE evaluation)
- Real spec coverage: **26.7%**, materially lower than the codebase-only naive estimate (~31%)
- Hypothesis "more built than expected" is **not confirmed** for PV; the work-remaining estimate in v1.2 is significantly understated for this module

**Reusable for other 6 modules:** the methodology and Python mapping script (`/tmp/map_pv_spec_to_code.py`, scoped to PV but parameterizable) can be adapted for HF, EP, SH, CAD, VHD, CX. Each module follows the same data-extraction / spec-parse / intent-mapping / classification pipeline. Estimated effort per module: ~6-10h depending on rule count and ambiguity in the implementation.

---

*Authored 2026-04-29. Verdict driven by data; methodology applied identically across all spec gaps to avoid bias.*
