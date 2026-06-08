# EP Audit - Batch 2: Rhythm Control + Atrial Tachy/SVT (§16 + §1 + §16.5 modifier)

**Date:** 2026-06-08. **Scope:** Rhythm Control (11) + Atrial Tachy/SVT (7) = 18 EP gaps. **Frozen
denominator:** CK v4.0. **Method:** §16 external code verification (RxNav / NLM / ICD-10) + §1 rule-body
re-classification reconciled against the 2026-05-04 addendum, **applying the AUDIT-118 classification
modifier (AUDIT_METHODOLOGY.md §16.5)** to every medication-presence DET_OK. PROPOSED classifications for
operator review; canonical crosswalk/addendum NOT edited.

---

## 1. §16 external code-verification (RxNav, 2026-06-08) - all new Batch-2 codes correct

The Batch-2-new codes are the `AVN_BLOCKER_CODES_EP079` set (`gapRuleEngine.ts:4258-4262`) + the SVT
rate-control subset. The AAD set (flecainide 4441 / propafenone 8754 / sotalol 9947 / amiodarone 703 /
dofetilide 49247) and the OAC set were verified in Batch 1.

| Code | RxNav name / tty | Used by | Verdict |
|---|---|---|---|
| 6918 | metoprolol / IN | EP-079 (BB), EP-rate-control | OK |
| 20352 | carvedilol / IN | EP-079 (BB) | OK |
| 19484 | bisoprolol / IN | EP-079 (BB) | OK |
| 7226 | nadolol / IN | EP-079 (BB) | OK (AUDIT-043 fix holds; was 7512=norepinephrine) |
| 1202 | atenolol / IN | EP-079 (BB) | OK |
| 8787 | propranolol / IN | EP-079 (BB) | OK (correctly propranolol here; same code AUDIT-042 found mis-used as procainamide) |
| 49737 | esmolol / IN | EP-079 (BB) | OK |
| 6185 | labetalol / IN | EP-079 (BB) | OK |
| 3443 | diltiazem / IN | EP-079, EP-017, EP-rate-control | OK |
| 11170 | verapamil / IN | EP-079, EP-017 | OK |
| 3407 | digoxin / IN | EP-079 (digoxin arm) | OK |
| 197604 | "digoxin 0.125 MG Oral Tablet" / SCD | EP-079 | OK (descendant-enumerated) |
| 197605 | "digoxin 0.2 MG Oral Capsule" / SCD | EP-079 | OK |
| 197606 | "digoxin 0.25 MG Oral Tablet" / SCD | EP-079 | OK |

**No new code defects in Batch 2.** (GAP-EP-074's OAC set re-uses the dabigatran 1037045 SCD - already
captured by AUDIT-117; GAP-EP-074 is already PARTIAL.)

## 2. Per-gap classification (PROPOSED; reconciled + §16.5 applied)

| Gap | Tier | Subcat | Addendum | Proposed | Driver |
|---|---|---|---|---|---|
| GAP-EP-013 (EP-EARLY-RHYTHM) | T1 | Rhythm Ctrl | DET_OK | **PARTIAL (flip)** | Med-presence: `onRhythmControlER = medCodes.some(c => RHYTHM_CONTROL_CODES_ER.includes(c))` `:9624`, AAD ingredient-exact -> §16.5. |
| GAP-EP-014 (EP-ABLATION) | T1 | Rhythm Ctrl | PARTIAL | PARTIAL (hold) | Logic-completeness (HF-as-proxy, not LVEF-gated); not med-presence. |
| GAP-EP-015 (EP-ABLATION) | T2 | Rhythm Ctrl | DET_OK | DET_OK (hold) | Trigger `hasAF && age<80 && hasHF` `:4334` - dx+age only, NO medication match -> §16.5 N/A. |
| GAP-EP-017 (EP-017) | T1 | Rhythm Ctrl (SAFETY) | DET_OK | **PARTIAL (flip)** | Med-presence: `onNonDhpCcb = medCodes.some(c => NON_DHP_CCB_CODES.includes(c))` `:5103`, diltiazem/verapamil ingredient-exact -> §16.5. Class-3-Harm SAFETY rule (AUDIT-033 closure). |
| GAP-EP-018 (EP-SUBCLINICAL-AF) | T1 | Rhythm Ctrl | DET_OK | DET_OK (hold) | Device(Z95.0)+no-AF-dx -> interrogation rec `:7251`; NO medication match -> §16.5 N/A. |
| GAP-EP-070 (EP-PFA) | T2 | Rhythm Ctrl | DET_OK | **PARTIAL (flip)** | Med-presence: `onAAD = medCodes.some(c => AAD_CODES.includes(c))` `:7021`, ingredient-exact -> §16.5. |
| GAP-EP-071 (EP-AAD-POST-ABLATION) | T2 | Rhythm Ctrl | PARTIAL | PARTIAL (hold) | Already PARTIAL (lacks ablation-specific gate). |
| GAP-EP-016 / 072 / 073 / 019 | T2-T3 | Rhythm Ctrl | SPEC_ONLY | SPEC_ONLY (hold) | Not implemented. |
| **GAP-EP-079 (EP-079)** | T1 | ATachy/SVT (**CRITICAL**) | DET_OK | **PARTIAL (flip)** | Med-presence: `medCodes.some(c => AVN_BLOCKER_CODES_EP079.includes(c))` `:4265`. The set is MIXED - digoxin is descendant-enumerated (exempt) but the **8 BBs + 2 non-DHP CCBs are ingredient-only** (no enumeration, no resolver) -> §16.5 applies. A WPW+AF patient on an SCD-coded BB (e.g. metoprolol) is MISSED -> the fatal-VF contraindication under-detects. (CRITICAL; AUDIT-031 closure.) |
| GAP-EP-074 (EP-FLUTTER-OAC) | T2 | ATachy/SVT | PARTIAL | PARTIAL (hold) | Already PARTIAL (OAC-only, no ablation gate); also inherits AUDIT-117/118. |
| GAP-EP-075 / 076 / 077 (EP-SVT-ABLATION) | T2 | ATachy/SVT | PARTIAL | PARTIAL (hold) | Already PARTIAL (generic SVT, no subtype split). |
| GAP-EP-078 (EP-WPW) | T2 | ATachy/SVT | PARTIAL | PARTIAL (hold) | Already PARTIAL (age<40 gate, not occupation-risk). |
| GAP-EP-080 | T3 | ATachy/SVT | SPEC_ONLY | SPEC_ONLY (hold) | Not implemented. |

**Batch-2 net flips:** 4 (GAP-EP-013, GAP-EP-017, GAP-EP-070, GAP-EP-079: DET_OK -> PARTIAL_DETECTION), all
under the §16.5 modifier. GAP-EP-015 + GAP-EP-018 hold DET_OK (verified NOT medication-presence). Resulting
Batch-2 distribution: **DET_OK 2 / PARTIAL 11 / SPEC_ONLY 5 = 18.**

## 3. Notes
- **Subagent-extraction corrections (caught by direct §1 read, per §1 evidence discipline):** the extraction
  claimed GAP-EP-079 was "EXEMPT" from §16.5 (false - only its digoxin arm is enumerated; the BB/CCB arms are
  ingredient-only), and described GAP-EP-015/018 as medication-presence (false - both are dx/device-based).
  All three corrected against the running code.
- **GAP-EP-079 flip is the most consequential:** it is the CRITICAL pre-excited-AF + AVN-blocker safety gap
  (AUDIT-031). Under §16.5 it is PARTIAL because a WPW+AF patient on an SCD-coded BB/CCB under-detects - the
  remediation is AUDIT-118 (ingredient-normalize) and/or enumerate BB/CCB descendants like digoxin already is.
- **2024 HRS PFA consensus (GAP-EP-070):** cites the 2024 HRS Expert Consensus on PFA - distinct from the
  2024 HRS Cardiac Physiologic Pacing under-anchoring (candidate horizon); PFA is appropriately anchored.

## 4. PAUSE-C + STOP
Batch 2 close. **STOP for operator review before Batch 3.** No source code changed; no canonical
crosswalk/addendum edited. Wall-clock in `docs/audit/canonical/audit_runs.jsonl` (run `EP-2026-06-08-batch2`).
