# SH Audit - Batch 1: Aortic Stenosis (10) + BAV/Aortopathy (9) = 19 gaps

**Date:** 2026-06-08. **Scope:** Aortic Stenosis (10) + BAV/Aortopathy (9) = 19 SH gaps (authoritative
list from `SH.spec.json` + `SH.crosswalk.json`; **no extraction subagent**). **Frozen denominator:** CK v4.0.
**Method:** §16 external verification (NLM ICD-10-CM) + §1 DIRECT read of every implemented match expression
+ §16.5 medication-match modifier. PROPOSED for operator review; canonical crosswalk/addendum NOT edited.

---

## 1. §16 external code verification (NLM Clinical Tables ICD-10-CM, 2026-06-08)

| Code | Used by | NLM name | Verdict |
|---|---|---|---|
| I35.0 | SH-1 (`:4905`), SH-2 (`:5240`) | "Nonrheumatic aortic (valve) stenosis" | **OK** (correct for aortic stenosis) |
| **Q23.1** | **SH-BICUSPID (`:10543`)** | **"Congenital insufficiency of aortic valve"** | **WRONG - new defect AUDIT-121** |
| Q87.40 | (Marfan; SH-051 SPEC_ONLY, SH-052 via CAD-BB) | "Marfan syndrome, unspecified" | OK (code correct; no Marfan-specific rule implemented) |

**AUDIT-121 (new):** the SH-BICUSPID rule gates on `dxCodes.some(c => c.startsWith('Q23.1'))` and its own
evidence triggerCriteria + code comment both claim "Bicuspid aortic valve (Q23.1)". Per NLM, **Q23.1 is
"Congenital insufficiency of aortic valve" and bicuspid aortic valve is `Q23.81`** (Q23.0 = "Congenital
stenosis of aortic valve" - also not bicuspid; the spec detectionLogic's "Q23.0 BAV" is independently
wrong). The rule therefore NEVER fires for an actual bicuspid patient (coded Q23.81) and FALSE-FIRES on
congenital aortic-insufficiency patients (Q23.1). Wrong-concept / cross-class miscode (sister to AUDIT-068).
See register.

## 2. §1 direct read of the DET_OK (re-confirm from scoping)

| DET_OK gap | Evaluator | Match (file:line) | Med-presence? | §16.5 | Result |
|---|---|---|---|---|---|
| GAP-SH-008 (bicuspid AV surveillance) | SH-BICUSPID | `dxCodes.some(c=>startsWith('Q23.1'))` `:10543-10568` | NO (dx) | N/A | **DET_OK -> PARTIAL (flip)** - driver **AUDIT-121** (Q23.1 wrong-concept; not §16.5) |

The flip driver is the §16 code defect, NOT §16.5. The rule structurally exists (an evaluator block is
present), so it is PARTIAL_DETECTION, not SPEC_ONLY; but it detects the wrong population entirely.

## 3. §16.5 axis - per-gap (medication-presence vs dx/device/lab)

**Result: 0 §16.5 flips in Batch 1** (the scoping hypothesis HOLDS - the sole DET_OK is dx-based). The only
medication-presence rule touched is the cross-module CAD-BETA-BLOCKER consolidation (SH-052), already PARTIAL.

| Gap | Class | Evaluator | §16.5 axis |
|---|---|---|---|
| GAP-SH-001/002/006 (severe AS) | PARTIAL | SH-2 (I35.0 + age>=65 + echo lvef) | dx/lab/age - NOT med |
| GAP-SH-005/007 (AS progression) | PARTIAL | SH-1 (I35.0 + no echo) | dx/lab - NOT med |
| GAP-SH-048 (AS + CAD revasc) | PARTIAL | CAD-COMPLETE-REVASC (cross-module) | procedure - NOT med |
| GAP-SH-052 (Marfan BB/ARB) | PARTIAL | CAD-BETA-BLOCKER (cross-module) | **medication-presence (subject)** - already PARTIAL, no flip |
| GAP-SH-008 (bicuspid) | DET_OK->PARTIAL | SH-BICUSPID (Q23.1) | dx - NOT med (flip is AUDIT-121, not §16.5) |
| GAP-SH-009 (BAV aortopathy) | PARTIAL | SH-BICUSPID (Q23.1) | dx - NOT med (also hit by AUDIT-121) |
| GAP-SH-003/004/049/050 (AS) + SH-051/053/054/055/010/056 (aortopathy) | SPEC_ONLY | none | N/A (no rule) |

## 4. Under-anchoring (precise bar - did a newer update MATERIALLY change the recommendation?)

**0 under-anchoring flags in Batch 1.** The implemented Batch-1 rules on 2020 ACC/AHA VHD implement
recommendations that newer guidance did NOT materially change:
- SH-2 (severe AS + age>=65 -> heart-team TAVR eval, Class 1 LOE A): TAVR indication expansion
  (PARTNER 3 / Evolut Low Risk) is already incorporated in the 2020 guideline; recommendation stable.
- SH-1 (AS echo surveillance, Class 1 LOE B): stable surveillance recommendation.
- SH-BICUSPID (serial echo/aortic imaging for BAV, Class 1 LOE B): stable; not materially changed.

Per the precise bar (flag only if a 2023+ focused update or newer trial-endpoint guideline materially
changed the specific recommendation), none of the Batch-1 implemented rules qualifies. The scoping's broad
"6 of 9 DET_OK on 2020 VHD" flag narrows to 0 genuine under-anchors here. (The GAP-SH-008 flip is a CODE
defect, a separate axis from anchoring.)

## 5. Batch-1 distribution

| | Baseline (2026-05-04) | Revised (2026-06-08) | Delta |
|---|---:|---:|---:|
| DET_OK | 1 (SH-008) | **0** | -1 |
| PARTIAL_DETECTION | 8 | **9** | +1 |
| SPEC_ONLY | 10 | 10 | 0 |
| **Total** | **19** | **19** | reconciles |

- **1 flip: GAP-SH-008 DET_OK -> PARTIAL, driver AUDIT-121 (§16 wrong-concept code), NOT §16.5.**
- §16.5 flips: 0 (hypothesis holds). §16 code defects: 1 (AUDIT-121). Under-anchoring: 0.
- Any-coverage UNCHANGED (the flip is DET_OK -> PARTIAL, within the any-coverage bucket: 9/19 -> 9/19).

## 6. PAUSE + STOP

Batch 1 close (cumulative 19/88). **STOP for operator review before Batch 2 (TAVR Post-op + Aortic
Disease).** No source code changed; no canonical crosswalk/addendum edited (the GAP-SH-008 flip is PROPOSED;
the canonical regen happens at the SH module-close synthesis after operator approval, per the EP precedent).
Finding AUDIT-121 filed in the register. Wall-clock in `audit_runs.jsonl` (run `SH-2026-06-08-batch1`).
