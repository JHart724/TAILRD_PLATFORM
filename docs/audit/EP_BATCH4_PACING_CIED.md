# EP Audit - Batch 4: Pacing + CIED Management (§16 + §1 + §16.5)

**Date:** 2026-06-08. **Scope:** Pacing (9) + CIED Management (8) = 17 EP gaps (authoritative list from
`EP.spec.json` subcategory + `EP.crosswalk.json` classification; **no extraction subagent used** - dropped
after it confabulated in 2 of 3 prior batches). **Frozen denominator:** CK v4.0. **Method:** §16 external
verification + §1 DIRECT read of the DET_OK match expression + AUDIT-118 §16.5 modifier. PROPOSED for
operator review; canonical crosswalk/addendum NOT edited.

---

## 1. §16 external code-verification (NLM ICD-10-CM, 2026-06-08) - all correct, no defects

Batch-4 rules gate on device/dx/lab codes (no medications). New codes verified:

| Code | NLM name | Used by | Verdict |
|---|---|---|---|
| Z95.0 | Presence of cardiac pacemaker | EP-CSP (037), EP-CIED-MRI (040/042) | OK |
| I44 (-> I44.0/.1/.2/.30/.39/.4/.5) | Atrioventricular + fascicular block | EP-CSP (037) pacing-indication gate | OK (`startsWith('I44')` covers all AV-block codes) |

Already verified earlier: Z95.810 (ICD, Batch 3), R55 (syncope, Batch 3), LVEF 10230-1 + QTc 8636-3 +
QRS 8633-0 (Batches 1/3), I50 HF (Batch 1). **No code defects in Batch 4.** No medications are consumed by
any Batch-4 rule.

## 2. Per-gap classification (PROPOSED; §16.5 applied to the sole DET_OK)

The only DET_OK gap is GAP-EP-037. Its match was read DIRECTLY:

| DET_OK gap | Evaluator | Match expression (file:line) | Med-presence? | Result |
|---|---|---|---|---|
| GAP-EP-037 (conduction system pacing) | EP-CSP | `hasHF && labValues['lvef'] <= 35 && (dxCodes.some(c=>startsWith('Z95.0')) \|\| startsWith('I44'))` `:6985-6991` | NO (HF dx + LVEF lab + pacemaker/AV-block dx) | **DET_OK hold** (not medication-presence -> §16.5 N/A) |

All Batch-4 PARTIAL evaluators were also read and confirmed NOT medication-presence (so §16.5 is moot for
them; they remain PARTIAL on their own logic-completeness merits):
- EP-SYNCOPE (031) `:4501` - `hasSyncope (R55) + ECG labs`; dx+lab.
- EP-PACEMAKER-UPGRADE (029/032) `:9826` - `labValues['lvef'] < 35` + device; lab+device.
- EP-LEAD-INTEGRITY (039/091) `:7316` - `hasICDnew (Z95.810) && age >= 70`; dx+device+age.
- EP-CIED-MRI (040/042) `:9964` - `dxCodes.some(c=>startsWith('Z95.0'))`; dx/device.

**Batch-4 net flips: 0.** No Batch-4 rule is medication-presence, so the §16.5 modifier does not apply to
any gap in this batch.

Full distribution (reconciled vs 2026-05-04 addendum):
- **DET_OK (1):** GAP-EP-037.
- **PARTIAL (7):** GAP-EP-029, 031, 032 (Pacing) + GAP-EP-039, 040, 042, 091 (CIED).
- **SPEC_ONLY (9):** GAP-EP-030, 033, 034, 035, 036 (Pacing) + GAP-EP-038, 041, 090, 092 (CIED).
- Totals: Pacing 9 = DET_OK 1 / PARTIAL 3 / SPEC_ONLY 5; CIED 8 = DET_OK 0 / PARTIAL 4 / SPEC_ONLY 4.

## 3. Pacing handling (provisional pending 2024 HRS re-anchor)
Per instruction, the Pacing 9 are classified against their **CURRENT frozen anchors** - e.g. EP-CSP
(GAP-EP-037) is anchored to the **2023 HRS/APHRS/LAHRS Guideline on Cardiac Physiologic Pacing**
(`gapRuleEngine.ts:6999`), against which it is DET_OK. They were **NOT re-anchored to 2024 HRS** in this
pass. The 2024 HRS Cardiac Physiologic Pacing re-anchor is the existing candidate-horizon item (BUILD_STATE
§10, "Pacing 9 = SPEC_ONLY-until-re-anchored"). **All Batch-4 Pacing classifications are therefore
PROVISIONAL**: the v2.0 re-anchor against 2024 HRS CPP could change them (e.g. tighten DET_OK GAP-EP-037 if
the 2024 guidance adds criteria the current rule does not encode). CIED Management gaps are not affected by
the pacing re-anchor.

## 4. Notes
- No subagent was used this batch (dropped per instruction); the gap list is the authoritative canonical
  spec+crosswalk and every DET_OK/PARTIAL match was read directly from the running code.
- No new code defects; no new medication codes; the §16.5 modifier had no targets in this batch (a clean
  illustration that device/dx/lab-gated rules are unaffected by the medication-match architecture finding).

## 5. PAUSE-C + STOP
Batch 4 close. **STOP for operator review before Batch 5 (LAAC 5 + Syncope 6 + cross-module synthesis
closeout).** No source code changed; no canonical crosswalk/addendum edited. Wall-clock in
`audit_runs.jsonl` (run `EP-2026-06-08-batch4`).
