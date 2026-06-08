# EP Audit - Batch 3: VT/ICD + Channelopathies + Cardiac Arrest (§16 + §1 + §16.5)

**Date:** 2026-06-08. **Scope:** VT/ICD (7) + Channelopathies (11) + Cardiac Arrest (4) = 22 EP gaps
(authoritative list from `EP.spec.json` subcategory + `EP.crosswalk.json` classification; the extraction
subagent only enumerated 13/22 and was used as a map only). **Frozen denominator:** CK v4.0. **Method:**
§16 external verification + §1 DIRECT read of every DET_OK match expression + AUDIT-118 §16.5 modifier.
PROPOSED for operator review; canonical crosswalk/addendum NOT edited.

---

## 1. §16 external code-verification (2026-06-08) - all correct, no defects

Batch-3 implemented rules consume already-verified medication codes (BB_CODES_LQTS = carvedilol 20352 /
metoprolol 6918 / bisoprolol 19484 / nadolol 7226, verified Batch 2; QTc LOINC 8636-3 verified Batch 1).
The new codes are ICD-10 diagnosis/device codes:

| ICD-10 | NLM ICD-10-CM name | Used by | Verdict |
|---|---|---|---|
| I45.81 | Long QT syndrome | EP-024 (LQTS BB), EP-026 | OK |
| R55 | Syncope and collapse | EP-023 (Brugada screen) | OK |
| I47.2 | (parent) -> I47.20 VT unspecified / I47.21 Torsades / I47.29 Other VT | EP-VT-ABLATION (020/021/022/086) | OK (`startsWith('I47.2')` covers all 3 billable children; I47.2 itself non-billable parent - cosmetic) |
| Z95.810 | Presence of automatic (implantable) cardiac defibrillator | EP-089, EP-VT-ABLATION | OK |

**No code defects in Batch 3.** The QT-prolonging "extra" drugs (quinidine/haloperidol/methadone/macrolides/
fluoroquinolones/ondansetron) and CPVT flecainide are DEFINED in `RXNORM_QT_PROLONGING` but are NOT consumed
by any implemented Batch-3 rule (Gap-39 is QTc-lab-only - see §3), so they are not in Batch-3 verification
scope.

## 2. Per-gap classification (PROPOSED; §16.5 applied to DET_OK)

The only DET_OK gaps in Batch 3 are GAP-EP-023, 024, 025, 089. Each match expression was read DIRECTLY:

| DET_OK gap | Evaluator | Match expression (file:line) | Med-presence? | Result |
|---|---|---|---|---|
| GAP-EP-023 (Brugada) | EP-BRUGADA | `dxCodes.some(c=>startsWith('R55')) && gender==='MALE' && age<45` `:9724` | NO (dx + demographics) | **DET_OK hold** |
| GAP-EP-024 (LQTS BB) | EP-LQTS-BB | `hasLQTS=dxCodes.some(c=>startsWith('I45.81'))`; `onBBforLQTS=medCodes.some(c=>BB_CODES_LQTS.includes(c))` `:7224` | **YES** (BB absence, ingredient-exact, not enumerated/resolved) | **PARTIAL (flip)** -> §16.5 |
| GAP-EP-025 (acquired LQT) | Gap-39 | `if (labValues['qtc_interval'] > threshold)` `:4090` - NO medCodes test | NO (QTc lab only) | **DET_OK hold** |
| GAP-EP-089 (inappropriate ICD shocks) | EP-INAPPROPRIATE-SHOCKS | `dxCodes.some(c=>startsWith('Z95.810')) && hasAF` `:10024` | NO (device dx + AF dx) | **DET_OK hold** |

**Batch-3 net flips: 1** (GAP-EP-024 DET_OK -> PARTIAL_DETECTION). Resulting Batch-3 distribution:
**DET_OK 3 (023, 025, 089) / PARTIAL 9 / SPEC_ONLY 10 = 22.**

Full classification (reconciled vs 2026-05-04 addendum):
- **DET_OK (3):** GAP-EP-023, GAP-EP-025, GAP-EP-089.
- **PARTIAL (9):** GAP-EP-020, 021, 022, 086 (VT/ICD, all already PARTIAL - shared EP-VT-ABLATION, no storm/etiology/AAD differentiation) + GAP-EP-024 (flipped) + GAP-EP-026, 027, 028, 081 (Channelopathies, already PARTIAL).
- **SPEC_ONLY (10):** GAP-EP-087, 088 (VT/ICD) + GAP-EP-082, 083, 084, 085 (Channelopathies) + GAP-EP-099, 100, 101, 102 (Cardiac Arrest - no evaluator; post-arrest TTM/neuroprognostication/angiography/genetics require temporal + flowsheet integration not built).

## 3. Subagent errors caught by direct §1 read (per the mandatory-verification instruction)
1. **Incomplete enumeration:** the subagent listed only 13/22 gaps (missed GAP-EP-081/082/083/084/085 +
   087/088 + 089). The authoritative 22 came from the canonical spec+crosswalk, not the subagent.
2. **Fabricated array:** the subagent claimed Gap-39 (GAP-EP-025) uses an inline
   `QT_PROLONGING_CODES = ['703','49247','9947','26225','5093','6813']` and is medication-presence. FALSE -
   Gap-39 (`:4090`) fires purely on `labValues['qtc_interval'] > threshold`; there is no medCodes test. So
   GAP-EP-025 is lab-based and holds DET_OK (had I trusted the subagent it would have been a wrong flip).
3. **Mis-mapped evaluator:** the subagent did not cover GAP-EP-089; direct crosswalk lookup shows it is
   EP-INAPPROPRIATE-SHOCKS (`:10024`), a dx+device rule, not CRT.

## 4. Notes
- **GAP-EP-024 flip rationale:** a LQTS (I45.81) patient on a beta-blocker coded as an SCD (e.g. metoprolol
  succinate ER tablet) reads as "no beta-blocker" -> the rule false-fires "BB not prescribed in LQTS." The
  BB set is ingredient-only (no enumeration, no AUDIT-101 resolver) -> §16.5 caps at PARTIAL. Remediation =
  AUDIT-118 (ingredient-normalize at match).
- **GAP-EP-028 (CPVT)** is cross-module (maps to CAD-BETA-BLOCKER) and already PARTIAL; it also matches BBs
  ingredient-exact, so it carries the AUDIT-118 vulnerability, but its PARTIAL status already stands.
- No new defects; the donepezil/propranolol-miscode class (QT-prolonging set) was re-confirmed clean in
  Batches 1-2 and the additional QT drugs are not consumed by implemented Batch-3 rules.

## 5. PAUSE-C + STOP
Batch 3 close. **STOP for operator review before Batch 4 (Pacing + CIED).** No source code changed; no
canonical crosswalk/addendum edited. Wall-clock in `audit_runs.jsonl` (run `EP-2026-06-08-batch3`).
