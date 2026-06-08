# EP Audit - Batch 1: Safety-critical Anticoagulation + AAD Safety (§16 + §1)

**Date:** 2026-06-08. **Scope:** AF Anticoagulation (13) + AAD Safety (8) + the 1 uncovered
SAFETY gap = 22 EP gaps. **Frozen denominator:** CLINICAL_KNOWLEDGE_BASE_v4.0 (no gap
additions). **Method:** §16 external clinical-code verification (RxNav `properties.json` for
RxNorm; NLM Clinical Tables for LOINC; ICD-10-CM for diagnosis) + §1 rule-body re-classification,
reconciled against the 2026-05-04 EP coverage addendum. **PROPOSED classifications below are for
operator review; the canonical crosswalk/addendum is NOT edited in this pass.**

---

## 1. §16 external code-verification results

### RxNorm (RxNav properties.json, 2026-06-08) - 11/12 correct, 1 defect
| Constant | Code | RxNav name / tty | Verdict |
|---|---|---|---|
| AMIODARONE | 703 | amiodarone / IN | OK |
| SOTALOL | 9947 | sotalol / IN | OK |
| DOFETILIDE | 49247 | dofetilide / IN | OK (AUDIT-056 fix holds; was 135447=donepezil) |
| DRONEDARONE | 233698 | dronedarone / IN | OK (AUDIT-057 fix holds; was 997221=donepezil branded) |
| PROCAINAMIDE | 8700 | procainamide / IN | OK (AUDIT-042 fix holds; was 8787=propranolol) |
| FLECAINIDE | 4441 | flecainide / IN | OK |
| PROPAFENONE | 8754 | propafenone / IN | OK |
| APIXABAN | 1364430 | apixaban / IN | OK |
| RIVAROXABAN | 1114195 | rivaroxaban / IN | OK |
| EDOXABAN | 1599538 | edoxaban / IN | OK |
| WARFARIN | 11289 | warfarin / IN | OK |
| **DABIGATRAN** | **1037045** | **"dabigatran etexilate 150 MG Oral Capsule" / SCD** | **DEFECT** (see §3) - single-formulation code, not the ingredient. Correct ingredient = **1037042** ("dabigatran etexilate" / IN, RxNav-verified). |

The donepezil-miscode class (dofetilide, dronedarone) and the propranolol-miscode (procainamide)
- the patient-safety-active Cat A bugs from 2026-05-05 - are **re-verified CORRECT**; no regression.

### LOINC (NLM Clinical Tables, 2026-06-08) - 4/4 correct
| Constant | Code | LONG_COMMON_NAME | Verdict |
|---|---|---|---|
| EGFR | 62238-1 | Glomerular filtration rate ... by Creatinine-based formula (CKD-EPI) | OK (dabigatran renal-safety, GAP-EP-006) |
| QTC_INTERVAL | 8636-3 | Q-T interval corrected | OK (AUDIT-065 fix holds; was 8601-7) |
| LVEF | 10230-1 | Left ventricular Ejection fraction | OK (AUDIT-069 fix holds; was 18010-0) |
| CREATININE | 2160-0 | Creatinine [Mass/volume] in Serum or Plasma | OK (dofetilide REMS, GAP-EP-048) |

### ICD-10 (ICD-10-CM 2024) - correct
`ICD10_ATRIAL_FIBRILLATION` covers all billable AF/flutter codes (I48.0/.11/.19/.20/.21/.91 +
flutter .3/.4/.92). Cosmetic-only: the non-billable parent headers `I48`, `I48.1`, `I48.2` are
also listed; harmless for `startsWith`-style matching (no detection defect).

## 2. Per-gap classification (PROPOSED; reconciled vs 2026-05-04 addendum)

| Gap | Tier | Subcat | Addendum class | Proposed class | Note |
|---|---|---|---|---|---|
| GAP-EP-001 (EP-OAC) | T1 | AF Anticoag | DET_OK | **PARTIAL_DETECTION (flip)** | Logic sound (CHA2DS2-VASc + OAC check), but the OAC-membership set carries the DABIGATRAN SCD defect -> false-positive for dabigatran 75/110mg patients (read as "not on OAC"). |
| GAP-EP-006 (EP-006) | T1 | AF Anticoag (SAFETY) | DET_OK | **PARTIAL_DETECTION (flip)** | Well-structured 2-branch eGFR rule, but the trigger code `1037045` (150mg SCD) MISSES dabigatran 75mg - the dose used in renal impairment - so eGFR<30-on-75mg (the danger scenario) is a false-negative on a Class-3-Harm SAFETY rule. |
| GAP-EP-007 | T1 | AF Anticoag | DET_OK (cross-module VD-6) | DET_OK (hold) | Mechanical-valve+DOAC; codes (Z95.2-.4) verified. |
| GAP-EP-008 | T1 | AF Anticoag | PARTIAL | PARTIAL (hold) | MS contraindication, cross-module VD-4. |
| GAP-EP-002/003/004/005/009/010/064/065/066 | T1-T3 | AF Anticoag | SPEC_ONLY | SPEC_ONLY (hold) | Not implemented (pharmacy-fill/TTR/dose-by-CrCl); no codes to verify in-rule. |
| GAP-EP-043/044 | T2 | AAD Safety | DET_OK | DET_OK (hold) | Amiodarone TSH/LFT monitor; amiodarone 703 verified. |
| GAP-EP-045 | T2 | AAD Safety | PARTIAL | PARTIAL (hold) | Amiodarone PFT baseline. |
| GAP-EP-046 (EP-DRONEDARONE) | T2 | AAD Safety (SAFETY) | DET_OK | DET_OK (hold) | Dronedarone 233698 + LVEF 10230-1 + HF/AF ICD-10 all verified. |
| GAP-EP-048 (EP-DOFETILIDE-REMS) | T2 | AAD Safety | DET_OK | DET_OK (hold) | Dofetilide 49247 + QTc 8636-3 + creatinine 2160-0 all verified. |
| GAP-EP-047 | T2 | AAD Safety | SPEC_ONLY | SPEC_ONLY (hold) | Sotalol inpatient QT monitoring; not implemented (sotalol 9947 verified for when built). |
| GAP-EP-050 (EP-INAPPROPRIATE-SHOCKS) | T2 | AAD Safety | DET_OK | DET_OK (hold) | ICD shock programming; AF ICD-10 verified. |
| **GAP-EP-049** | T2 | AAD Safety (**uncovered SAFETY**) | SPEC_ONLY | SPEC_ONLY (hold; **Tier S queue**) | Flecainide/propafenone in CAD/SHD (CAST). No evaluator. Codes 4441/8754 verified correct for when implemented. Remains the 1 uncovered SAFETY gap. |

**Net proposed flips:** 2 (GAP-EP-001, GAP-EP-006: DET_OK -> PARTIAL_DETECTION), both driven by the
single DABIGATRAN code defect. All other Batch-1 classifications hold (their verified codes are correct).

## 3. New finding (candidate, recorded - NOT fixed in this audit pass)

**AUDIT-XXX-future-ep-dabigatran-single-formulation-code** (proposed MEDIUM-HIGH; **patient-safety-active**;
operator confirms severity per §18):
- **Defect:** `RXNORM_DOACS.DABIGATRAN = '1037045'` (`cardiovascularValuesets.ts:295`) is the
  Semantic Clinical Drug "dabigatran etexilate 150 MG Oral Capsule" (tty=SCD), **not** the
  ingredient. The other three DOACs in the same object are ingredient-level (IN). Verified RxNav 2026-06-08.
- **Impact 1 (EP-006 SAFETY, Class 3 Harm; `gapRuleEngine.ts:4187`):** the rule fires only on the
  exact 150mg capsule. **Dabigatran 75mg** is the dose used in moderate renal impairment, so a
  patient on **dabigatran 75mg with eGFR<30** - the precise contraindication the rule exists to
  catch - is **MISSED (false-negative on a SAFETY rule).**
- **Impact 2 (EP-OAC, GAP-EP-001; `gapRuleEngine.ts:4140-4141`):** `OAC_CODES` includes `'1037045'`
  with exact-RxCUI membership; a patient on dabigatran 75/110mg reads as **not anticoagulated** ->
  **false-positive** "OAC not prescribed."
- **Fix candidate:** `DABIGATRAN -> '1037042'` (dabigatran etexilate IN, RxNav-verified) AND
  ingredient-normalize the medication match (see architectural note).
- **Sister:** the AUDIT-042/056/057 Cat A clinical-code class - but this is **wrong-granularity**
  (formulation-SCD vs ingredient), a new sub-class, not wrong-drug.

**Architectural observation (broader, not a single-code fix):** EP-OAC + EP-006 match medications by
**exact RxCUI membership** (`medCodes.includes(...)`). Even the correctly-ingredient-coded DOACs
(apixaban 1364430 IN, etc.) will MISS patient meds coded at SCD/SBD/branded granularity (e.g. an
"Eliquis 5 MG Oral Tablet" SCD). Robust detection should ingredient-normalize (RxNorm
ingredient/precise-ingredient rollup) rather than exact-match. Flagged for the operator as a
likely cross-DOAC under-detection vector; separate from the single-code dabigatran fix.

## 4. STEP-3 findings (recorded WITHOUT acting on inventory)

**(a) 2024 HRS Cardiac Physiologic Pacing under-anchoring (Pacing subcategory, 9 gaps).** No EP rule
or spec gap cites the 2024 HRS Cardiac Physiologic Pacing guideline; the Pacing gaps anchor to older
guidance. Candidate-horizon entry: the Pacing 9 should be re-anchored against 2024 HRS CPP before
classification is trusted - treat as **SPEC_ONLY-until-re-anchored** for v2.0 sequencing. Not actioned
here (frozen denominator; Pacing is a later batch).

**(b) registry/evaluator/gapsPush 48/47/49 mismatch for EP.** The EP module reports registry=48,
evaluator=47, gapsPush=49 (EP addendum header). The three counts not reconciling indicates at least
one registry entry without an evaluator block (PARTIAL-at-best) and/or a `gaps.push` without a
registry id (provenance-unguarded, the AUDIT-106 class). Recorded as a structural reconciliation
finding; full enumeration is a later-batch task (not actioned here).

## 5. PAUSE-C + STOP

This is the Batch 1 close. **STOP for operator review before Batch 2.** No source code changed; no
canonical crosswalk/addendum edited; the 2 proposed re-classifications and the dabigatran finding
await operator decision. Wall-clock recorded in `docs/audit/canonical/audit_runs.jsonl`
(run `EP-2026-06-08-batch1`).
