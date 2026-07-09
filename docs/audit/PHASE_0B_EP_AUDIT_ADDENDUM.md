# Phase 0B EP Audit Addendum — generated from canonical crosswalk

**Module:** Electrophysiology (EP)
**Spec source:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.2
**Code source:** `backend/src/ingestion/gaps/gapRuleEngine.ts` (registry=71, evaluator=70, gapsPush=72)
**Crosswalk:** `docs/audit/canonical/EP.crosswalk.json` (auditMethod: rule-body-citation-AUDIT-030D)
**Audit date:** 2026-06-08

## 1. Summary

Electrophysiology has **89 spec gaps** across 11 subcategories. Implementation: **44 DET_OK + 16 PARTIAL + 29 SPEC_ONLY** (any-coverage: 60/89 = 67.4%).

**Tier 1 priority status:** 11 DET_OK + 1 PARTIAL + 3 SPEC_ONLY of 15 T1 gaps (T1 any-coverage: 80.0%).

**Spec-explicit SAFETY-tagged gaps:** 7 total; 7 covered (DET_OK), 0 uncovered. All SAFETY gaps covered.

---

## 2. Coverage by classification

| Classification | Count | % of total |
|---|---:|---:|
| PRODUCTION_GRADE | 0 | 0.0% |
| DET_OK | 44 | 49.4% |
| PARTIAL_DETECTION | 16 | 18.0% |
| SPEC_ONLY | 29 | 32.6% |
| **Total** | **89** | **100.0%** |

**PRODUCTION_GRADE = 0** is platform-wide; gated on closure of AUDIT-001 P0 (test coverage gap). Per AUDIT_METHODOLOGY.md §3.1, no rule classifies PRODUCTION_GRADE until the platform testing baseline is established.

---

## 3. Coverage by tier

| Tier | Total | DET_OK | PARTIAL | SPEC_ONLY | Any-coverage % |
|------|------:|-------:|--------:|----------:|---------------:|
| **T1** | 15 | 11 | 1 | 3 | 80.0% |
| **T2** | 62 | 32 | 13 | 17 | 72.6% |
| **T3** | 12 | 1 | 2 | 9 | 25.0% |
| **Overall** | **89** | **44** | **16** | **29** | **67.4%** |

---

## 4. Per-subcategory breakdown

| Subcategory | T1/T2/T3 | DET_OK | PARTIAL | SPEC_ONLY | Coverage |
|---|---|---:|---:|---:|---:|
| AF Anticoagulation (13) | 6/6/1 | 9 | 0 | 4 | 69.2% |
| LAAC (5) | 2/3/0 | 3 | 0 | 2 | 60.0% |
| Rhythm Control (11) | 4/6/1 | 8 | 0 | 3 | 72.7% |
| Atrial Tachy/SVT (7) | 1/5/1 | 3 | 3 | 1 | 85.7% |
| VT/ICD (7) | 1/6/0 | 4 | 1 | 2 | 71.4% |
| Channelopathies (11) | 0/6/5 | 3 | 4 | 4 | 63.6% |
| Pacing (9) | 0/9/0 | 5 | 2 | 2 | 77.8% |
| CIED Management (8) | 0/7/1 | 1 | 4 | 3 | 62.5% |
| AAD Safety (8) | 0/8/0 | 6 | 1 | 1 | 87.5% |
| Syncope (6) | 0/4/2 | 2 | 1 | 3 | 50.0% |
| Cardiac Arrest (4) | 1/2/1 | 0 | 0 | 4 | 0.0% |

---

## 4.5 — T1 SPEC_ONLY work items (load-bearing for v2.0 Phase 1)

3 T1 spec gaps with zero implementation. These are the load-bearing v2.0 Phase 1 work items for Electrophysiology.

| GAP-ID | Spec line | Subcategory | Detection Logic (excerpt) | Spec SAFETY | BSW pathway |
|---|---:|---|---|---|---|
| GAP-EP-064 | 315 | AF Anticoagulation | OAC e-prescribed but zero pharmacy fills | — | — |
| GAP-EP-065 | 316 | AF Anticoagulation | Proportion of days covered <80% in past 12mo | — | — |
| GAP-EP-099 | 436 | Cardiac Arrest | Cardiac arrest survivor without TTM protocol documentation | — | — |

---

## 4.6 — EXTRA rules + architectural patterns

**Registry-without-evaluator (1):** registry entries with no matching evaluator block body.

- `gap-ep-anticoag-interruption` (registry line 2623): No evaluator body matched via similarity scoring

**Naming convention mismatches (1):** registry IDs not following `gap-ep-` convention.

- `gap-39-qtc-safety` (line 281): expected prefix `gap-ep-`, got `gap-39-`


---

## 5. Tier 1 priority gaps surfaced

| GAP-ID | Spec line | Class | Rule body cite | Notes |
|---|---:|---|---|---|
| GAP-EP-001 | 311 | DET_OK | `gap-ep-oac-afib` (EP-OAC @5550-5613) | UN-CAP + verify 2026-06-16 (v3.0 EP close) PARTIAL -> DET_OK: AUDIT-118 remediated (medCodes ingredi |
| GAP-EP-006 | 312 | DET_OK | `gap-ep-006-dabigatran-renal-safety` (EP-006 @5631-5681) | UN-CAP + verify 2026-06-16 (v3.0 EP close) PARTIAL -> DET_OK: AUDIT-118 remediated (dabigatran IN 10 |
| GAP-EP-007 | 313 | DET_OK | `gap-vd-6-doac-mechanical-valve` (VD-6 @8913-8937) **[cross-module: VHD]** | UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033; expandToIngredients ingredie |
| GAP-EP-008 | 314 | DET_OK | `gap-ep-008-doac-mitral-stenosis` (EP-008 @5808-5831) | BUILT 2026-06-16 (v3.0 EP chunk 1): DOAC + moderate-severe MS (I05.0/I34.2). 2020 VHD / INVICTUS, Cl |
| GAP-EP-064 | 315 | SPEC_ONLY | — | — (no pharmacy fill data integration) \| auto-verify: No candidate evaluator block above PARTIAL_MATC |
| GAP-EP-065 | 316 | SPEC_ONLY | — | — (no pharmacy fill data integration) \| auto-verify: No candidate evaluator block above PARTIAL_MATC |
| GAP-EP-011 | 328 | DET_OK | `gap-ep-laac` (EP-LAAC @6483-6518) | RESOLVED 2026-06-16 (v3.0 EP close) PARTIAL -> DET_OK: AUDIT-120 fixed. The bare Z88 (allergy-status |
| GAP-EP-012 | 329 | DET_OK | `gap-ep-012-laac-high-risk-bleed` (EP-012 @5868-5905) | BUILT 2026-06-16 (v3.0 EP chunk 1): distinct LAAC evaluator (CHA2DS2-VASc>=3 + prior major bleed inc |
| GAP-EP-013 | 337 | DET_OK | `gap-ep-early-rhythm` (EP-EARLY-RHYTHM @13382-13404) | UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). EP-EARLY-RHYTHM is an AAD-A |
| GAP-EP-014 | 338 | DET_OK | `gap-ep-014-af-ablation-hfref` (EP-014 @5922-5945) | BUILT 2026-06-16 (v3.0 EP chunk 2): AF (non-flutter) + LVEF<=35 + no CPT 93656. CASTLE-AF, Class 2a. |
| GAP-EP-017 | 339 | DET_OK | `gap-ep-017-hfref-non-dhp-ccb` (EP-017 @7392-7417) | UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). The Class-3-Harm HFrEF + no |
| GAP-EP-018 | 340 | DET_OK | `gap-ep-subclinical-af` (EP-SUBCLINICAL-AF @11318-11341) | line 6819+ \| auto-verify: preserved-from-addendum |
| GAP-EP-079 | 352 | DET_OK | `gap-ep-079-wpw-af-avn-blocker` (EP-079 @6451-6476) | UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). The CRITICAL WPW+AF AVN-blo |
| GAP-EP-086 | 363 | PARTIAL_DETECTION | `gap-ep-vt-ablation` (EP-VT-ABLATION @13415-13437) | line 9162+ (broad VT+ICD trigger, not VT-storm-specific) \| auto-verify: preserved-from-addendum |
| GAP-EP-099 | 436 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |

---

## 6. Implementation notes

### 6.1 — EXTRA rules detail

See §4.6 for EXTRA rules + architectural patterns.

### 6.2 — BSW ROI pathway implications

No T1 SPEC_ONLY gaps carry literal BSW pathway tags in CK v4.0 spec text. Pathway analysis is in the §11.5 sequencing notes (hand-authored) and the cross-module synthesis document.

### 6.3 — Strategic posture

**Re-audit 2026-06-08 (supersedes the 2026-05-04 version; prior retained in git history).** EP's detection LOGIC is broadly present - any-coverage is 52.8% and UNCHANGED - but the 2026-05-04 audit materially OVER-CREDITED the trustworthiness tier: DET_OK fell 23.6% -> 9.0% once §16 plus the §16.5 medication-match modifier were applied. The rules exist and fire; they are capped at PARTIAL because the platform matches medications by exact-RxCUI membership with no ingredient-to-descendant expansion (AUDIT-118), so product-coded (SCD) patient meds under-detect. High-leverage posture: a SINGLE AUDIT-118 ingredient-normalize-at-match fix restores 12 of the 13 flips at once (the 13th is AUDIT-120, a one-line Z88 narrowing). EP is therefore not 'lightly built' in logic - it is 'broadly built but trust-capped pending one architectural fix.'

---

## 7. Working hypothesis verdict

**For EP:** Strong implementation coverage; module is broadly built.

Coverage data: 60/89 any-coverage (67.4%); 44/89 DET_OK only (49.4%); 16 PARTIAL via broad-rule consolidation or partial-trigger match; 29 SPEC_ONLY.

Rules-per-DET_OK efficiency: 71 registry rules / 44 DET_OK = 1.61.

---

## 8. Implications for v2.0

v2.0 Phase 1 (T1 priority) work items for EP:
- **3 T1 SPEC_ONLY** gaps requiring full build (detection + UI + tests)
- **1 T1 PARTIAL** gaps requiring hardening (broad-rule discrimination, missing exclusions, dose-protocol specificity)
- **11 T1 DET_OK** gaps requiring test coverage + UI polish to reach PRODUCTION_GRADE

Cross-module satisfaction (HF Device Therapy → EP CRT/ICD pattern; CAD-027 → PV; etc.) is captured structurally in `ruleBodyCite.evaluatorModule` per AUDIT_METHODOLOGY.md §2.1.C.

---

## 9. Module-specific findings

### Manual classification overrides (12)

Rows where the auto-classifier was wrong and the audit author corrected the classification with explicit reasoning:

- **GAP-EP-007** (T1, DET_OK, `gap-vd-6-doac-mechanical-valve` (VD-6) cross-module to VHD): UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033; expandToIngredients ingredient-normalization at the runner construction points). VHD VD-6 (DOAC + mechanical valve, Class 3 Harm) now detects product-coded (SCD/SBD) DOAC meds - a mechanical-valve patient on an apixaban SCD fires the contraindication. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw SCD misses -> expanded fires). Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118 (exact-RxCUI membership, no expansion).
- **GAP-EP-013** (T1, DET_OK, `gap-ep-early-rhythm` (EP-EARLY-RHYTHM)): UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). EP-EARLY-RHYTHM is an AAD-ABSENCE rule (fires when AF + not-on-rhythm-control); the cap was an OVER-detection (raw SCD-AAD read as not-on-AAD -> false-fired). Now the AAD is detected, so an AF patient on an SCD-coded AAD correctly SUPPRESSES the early-rhythm-control gap. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw false-fires -> expanded suppresses). Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118.
- **GAP-EP-017** (T1, DET_OK, `gap-ep-017-hfref-non-dhp-ccb` (EP-017)): UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). The Class-3-Harm HFrEF + non-DHP-CCB SAFETY rule now detects SCD-coded diltiazem/verapamil (INs 3443/11170 in the ingredient map), so an HFrEF + AF patient on an SCD-coded non-DHP CCB fires the contraindication. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw SCD misses -> expanded fires). Prior 2026-05-05 AUDIT-033 logic closure stands. Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118.
- **GAP-EP-070** (T2, DET_OK, `gap-ep-pfa` (EP-PFA)): UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). EP-PFA (AAD-PRESENCE proxy for failed rhythm control) now detects SCD-coded AADs (AAD_CODES INs in the ingredient map), so an AF patient on an SCD-coded AAD fires the PFA-candidacy gap. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw SCD misses -> expanded fires). Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118.
- **GAP-EP-079** (T1, DET_OK, `gap-ep-079-wpw-af-avn-blocker` (EP-079)): UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). The CRITICAL WPW+AF AVN-blocker rule now detects SCD-coded beta-blockers and non-DHP CCBs (the previously ingredient-only arms of AVN_BLOCKER_CODES_EP079; the digoxin arm was simplified to the IN in the same fix). A WPW+AF patient on an SCD-coded metoprolol fires the fatal-VF contraindication. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw SCD misses -> expanded fires). Prior 2026-05-05 AUDIT-031 logic closure stands. Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118.
- **GAP-EP-024** (T2, DET_OK, `gap-ep-lqts-bb` (EP-LQTS-BB)): UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). EP-LQTS-BB is a beta-blocker-ABSENCE rule; the cap was an OVER-detection (raw SCD-BB read as not-on-BB -> false-fired "BB not prescribed"). Now the BB is detected (BB_CODES_LQTS INs in the ingredient map), so a LQTS patient on an SCD-coded beta-blocker correctly SUPPRESSES the gap. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw false-fires -> expanded suppresses). Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118.
- **GAP-EP-026** (T2, PARTIAL_DETECTION, `gap-ep-lqts-bb` (EP-LQTS-BB)): MANUAL OVERRIDE per EP addendum line 131: GAP-EP-026 (Congenital LQTS QT-drug avoidance) covered by overlapping rules EP-LQTS-BB (line 6906+) and EP-TORSADES (line 7121+). PARTIAL because broad coverage of LQTS+QT-drug scenarios but not specifically the congenital subtype with QT-drug avoidance protocol.
- **GAP-EP-043** (T2, DET_OK, `gap-ep-amiodarone-monitor` (EP-AMIODARONE-MONITOR)): UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). EP-AMIODARONE-MONITOR (TSH) now detects SCD-coded amiodarone - amiodarone IN 703 is in the ingredient map and an amiodarone SCD expands to it, so the TSH-monitoring gap fires. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw SCD misses -> expanded fires). Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118.
- **GAP-EP-044** (T2, DET_OK, `gap-ep-amiodarone-monitor` (EP-AMIODARONE-MONITOR)): UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). EP-AMIODARONE-MONITOR (LFT) now detects SCD-coded amiodarone (IN 703 in the ingredient map). Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw SCD misses -> expanded fires). Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118.
- **GAP-EP-045** (T2, PARTIAL_DETECTION, `gap-ep-amiodarone-monitor` (EP-AMIODARONE-MONITOR)): MANUAL OVERRIDE per EP addendum line 179: GAP-EP-045 (Amiodarone baseline PFT/CXR) covered partially by EP-AMIODARONE-MONITOR evaluator. PARTIAL per §3.2.1: combined rule covers TSH/LFT but not PFT/CXR baseline screening that spec specifies.
- **GAP-EP-046** (T2, DET_OK, `gap-ep-dronedarone` (EP-DRONEDARONE)): UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). EP-DRONEDARONE (SAFETY) now detects SCD-coded dronedarone (IN 233698 in the ingredient map), so the NYHA III/IV contraindication fires for an SCD-coded dronedarone patient with severe HF. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw SCD misses -> expanded fires). Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118.
- **GAP-EP-048** (T2, DET_OK, `gap-ep-dofetilide-rems` (EP-DOFETILIDE-REMS)): UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). EP-DOFETILIDE-REMS now detects SCD-coded dofetilide (IN 49247 in the ingredient map), so the REMS-monitoring gap fires for an SCD-coded dofetilide patient. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw SCD misses -> expanded fires). Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118.


---

## 10. Cross-references

- `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.2 — spec source
- `backend/src/ingestion/gaps/gapRuleEngine.ts` — code source
- `docs/audit/canonical/EP.crosswalk.json` — canonical crosswalk
- `docs/audit/canonical/EP.spec.json` — canonical spec extract
- `docs/audit/canonical/EP.code.json` — canonical code extract
- `docs/audit/canonical/EP.reconciliation.json` — canonical reconciliation
- `docs/audit/AUDIT_METHODOLOGY.md` — canonical audit methodology contract
- `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` — cross-module synthesis
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` — findings register

---

## 11. Cross-module synthesis (per-module slice)

2 cross-module satisfaction case(s) where EP spec gap is satisfied by an evaluator owned by another module:

| Spec gap | Tier | Class | Owning module | Evaluator block |
|---|---|---|---|---|
| GAP-EP-007 | T1 | DET_OK | VHD | `VD-6` |
| GAP-EP-028 | T2 | PARTIAL_DETECTION | CAD | `CAD-BETA-BLOCKER` |

### 11.5 — Sequencing notes

**Sequencing:** the 13 flips are classification corrections, not build work - no EP rule is rewritten in this pass. The AUDIT-118 remediation (ingredient-normalize the medication match) is the single highest-leverage v2.0 item: it lifts 12 of 13 EP flips and the same modifier applies across all 6 modules. **Quantified retroactive magnitude (cross-module synthesis input):** EP lost 62% of its DET_OK (13 of 21) to the §16.5 modifier plus AUDIT-117/120. The merged PV/HF/CAD medication-based DET_OK predate this modifier and are subject to the same correction at v2.0 Module-Parity reconciliation (PATH_TO_ROBUST §5); their DET_OK rates likely overstate trustworthy coverage by a similar magnitude and must be re-applied before any module's DET_OK number is reported as trustworthy. SH and VHD have not yet been audited to the §16 standard at all.

---

## 12. Lessons learned

**Verdict on the 2026-05-04 working hypothesis (that the DET_OK classifications were materially over-credited): CONFIRMED.** 13 of 21 DET_OK flipped to PARTIAL - 12 driven by the medication-match architecture (AUDIT-118) and 1 by an over-broad code (AUDIT-120). Any-coverage is unchanged (52.8%); only the trustworthiness tier moved. **Lessons for the SH audit (next module):** (1) DROP the extraction subagent - it confabulated in 2 of 3 batches (fabricated a Gap-39 QT-drug array, mis-mapped evaluators, enumerated only 13 of 22 gaps); pull the authoritative gap list straight from <MODULE>.spec.json plus <MODULE>.crosswalk.json. (2) Read EVERY DET_OK match expression directly from the running code - the subagent is a map, never a source of truth. (3) Apply the §16.5 medication-match modifier to every medication-presence DET_OK (subject unless the value set enumerates descendants or routes through the AUDIT-101 resolver). (4) §16-verify every code against the external source (RxNav / NLM); the donepezil/propranolol miscode class stayed clean here, but a new wrong-granularity defect (dabigatran SCD, AUDIT-117) and an over-broad code (Z88, AUDIT-120) were still found. **Time-unit caveat (AUDIT-028 / §13):** EP module-completion wall-clock was ~72 min AI-assisted for the full 89-gap §16 + §1 + §16.5 classification (~61 min excluding Batch-2 methodology authoring) plus ~40 external code verifications, ~1.2 gaps/min. This is the FIRST EP empirical AI-assisted data point - the AI-assisted reference, NOT a replacement for the raw §7.2 floor (~120-150 min per module, measured without AI and excluding §16). A second module is needed before a stable multiplier; do not conflate AI-assisted wall-clock with raw scope.

---

## 13. Wall-clock empirical entry

Audit method: `rule-body-citation-AUDIT-030D`. Audit date: 2026-06-08.

Per-module wall-clock data lives in `docs/audit/canonical/audit_runs.jsonl` (append-only). Aggregate empirical floor table maintained in AUDIT_METHODOLOGY.md §7.2.

---

## 14. Audit verdict

**EP module: BROADLY BUILT.**

- 44 DET_OK (49.4%), 16 PARTIAL (18.0%), 29 SPEC_ONLY (32.6%)
- 11/15 T1 priority gaps DET_OK; 3 T1 SPEC_ONLY gaps require v2.0 Phase 1 work
- Audit method: `rule-body-citation-AUDIT-030D`. Generated from canonical crosswalk on 2026-06-08.

---

## 15. Methodology citation appendix

Audit methodology per `docs/audit/AUDIT_METHODOLOGY.md` v1.0. Specifically:
- §2 data model (spec/code/crosswalk artifact triplet)
- §3 classification taxonomy (PRODUCTION_GRADE / DET_OK / PARTIAL_DETECTION / SPEC_ONLY) with §3.2 decision rules + §3.2.1 broad-rule consolidation handling
- §4 citation requirements (AUDIT-030)
- §5 evaluator inventory completeness (AUDIT-030.D, 5 comment patterns)
- §6 SAFETY-tag classification rules + Tier S triage queue inclusion
- §11 addendum markdown template (this document's structure)

This addendum is a **generated artifact** rendered from canonical inputs by `backend/scripts/auditCanonical/renderAddendum.ts`. Hand-editing this markdown is rejected by CI; edit `EP.crosswalk.json` (hand-authored fields: `strategicPosture`, `sequencingNotes`, `lessonsLearned`) and re-render.

*Generated from `docs/audit/canonical/EP.crosswalk.json`.*
