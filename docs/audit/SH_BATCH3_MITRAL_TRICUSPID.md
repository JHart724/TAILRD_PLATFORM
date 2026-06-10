# SH Audit - Batch 3: Mitral Regurg (10) + Mitral Stenosis (4) + Tricuspid (6) = 20 gaps

**Date:** 2026-06-08. **Scope:** Mitral Regurg (10) + Mitral Stenosis (4) + Tricuspid (6) = 20 SH gaps
(authoritative from `SH.spec.json` + `SH.crosswalk.json`; **no extraction subagent**). **Frozen denominator:**
CK v4.0. **Method:** standing stack §16 (NLM) + §16.5 + §16.6 + §1 direct DET_OK reads. PROPOSED for operator
review; canonical crosswalk/addendum NOT edited.

---

## 1. §16 + §16.6 per-batch concept-match verification table (mandatory)

| Code | Rule(s) | Claimed concept | NLM authoritative descriptor | Match | Source |
|---|---|---|---|---|---|
| I34.0 | SH-3, SH-10, SH-11 | mitral regurgitation | "Nonrheumatic mitral (valve) insufficiency" | **Y** | NLM 2026-06-08 |
| I36.1 | SH-4, SH-12 | tricuspid regurgitation | "Nonrheumatic tricuspid (valve) insufficiency" | **Y** | NLM 2026-06-08 |
| I50.81 | SH-12 | right heart failure | "Right heart failure" (I50.810-814) | **Y** | NLM 2026-06-08 |
| I34.2 | VD-4 (cross-module) | nonrheumatic mitral stenosis | "Nonrheumatic mitral (valve) stenosis" | **Y** | NLM 2026-06-08 |
| I05.0 | VD-4 (cross-module) | rheumatic mitral stenosis | "Rheumatic mitral stenosis" | **Y** | NLM 2026-06-08 |
| R06/R00 | SH-3 | dyspnea / palpitations | matching symptom categories | Y | - |
| R60/R16/R18 | SH-4, SH-12 | edema / hepatomegaly / ascites | matching symptom categories | Y | - |
| Z51.5 | EXCLUSION_HOSPICE | palliative care | "Encounter for palliative care" | Y | (prior) |

- **No new §16 code defect in Batch 3.** Note: **I34.0 is CORRECT here** (mitral regurg in a mitral-context
  rule) - it was wrong only in SH-13's aortic-PVL context (AUDIT-122). Same code, context-appropriate.
- **No Z95.x in Batch 3** (these are native-valve dx rules), so AUDIT-123 does not extend to this batch.

## 2. §1 direct read of the 2 DET_OK

| DET_OK gap | Evaluator | Match (file:line) | §16.5 | §16.6 concept | Result |
|---|---|---|---|---|---|
| GAP-SH-064 (TMVR candidacy) | SH-11 | `hasMR10 (I34.0) && age > 80` `:6404-6426` | N/A (dx) | concept OK; **(iii) FAIL** | **DET_OK -> PARTIAL (flip)** - AUDIT-125 (severity; gap targets severe MR) |
| GAP-SH-022 (severe TR transcath eval) | SH-4 | `I36.1 && (R60\|R16\|R18)` `:5337-5367` | N/A (dx) | concept OK; **(iii) FAIL** | **DET_OK -> PARTIAL (flip)** - AUDIT-125 (severity) [+ under-anchor flag, sec. 5] |

## 3. §16.5 axis - per-gap

**0 §16.5 flips** (hypothesis HOLDS). No Batch-3 rule is medication-presence: SH-3/SH-4/SH-10/SH-11/SH-12
(dx + echo-lab) + VD-4 (dx + echo). The Rheumatic-MS secondary-prophylaxis gap (GAP-SH-068, benzathine PCN)
is SPEC_ONLY (no rule), so its medication arm is not implemented.

## 4. §16.6 over-detection / concept-match

- **Concept-match (i):** both DET_OK pass - I34.0 (mitral regurg) and I36.1 (TR) match their rules' intent.
  No concept-mismatch flip (contrast AUDIT-122 I34.0-on-an-aortic-gap, which was wrong-context).
- **Over-broad / wrong-target (ii):** no Batch-3 (ii) flip (the DET_OK rules fire on the correct condition).
- **Severity-encoding (iii) - FLIPPED (operator codified §16.6(iii) + AUDIT-125, 2026-06-08):** the earlier
  "noted not flipped / within-target granularity" framing is SUPERSEDED. Per §16.6(iii) the predicate is that
  severity IS echo-encoded in `labValues` and the rule IGNORES it, so a dx + age/symptom rule targeting a
  SEVERE gap over-detects on sub-threshold lesions and cannot be DET_OK:
  - **GAP-SH-064** (SH-11, `I34.0 + age>80`) - spec gap targets SEVERE MR ("ineligible for TEER"); zero
    severity gate -> **DET_OK -> PARTIAL (AUDIT-125).**
  - **GAP-SH-022** (SH-4, `I36.1 + R60/R16/R18`) - spec gap targets SEVERE/torrential TR; zero TR-grade gate
    -> **DET_OK -> PARTIAL (AUDIT-125).**
  Already-PARTIAL §16.6(iii)-affected rules (no flip): SH-1/SH-2 (AS, `I35.0` + LVEF flag - LVEF is not an
  AS-severity gate); SH-3 (MR, LVEF<60-or-symptom); SH-12 (TR, symptom-only).

## 5. Under-anchoring (precise bar) - the transcatheter-tricuspid candidate-horizon flag

**Genuine candidate-horizon under-anchor surfaced (routes to BUILD_STATE §10, NOT the register):** the
transcatheter-tricuspid gaps - GAP-SH-022 (T-TEER/TTVR eval), GAP-SH-069 (Evoque TTVR / TRISCEND), GAP-SH-023
(TR device selection) - are served by rules SH-4 / SH-12 anchored to the **2020 ACC/AHA VHD Guideline**. But
transcatheter tricuspid intervention POSTDATES 2020 VHD: TriClip T-TEER (TRILUMINATE Pivotal) and Evoque TTVR
(TRISCEND II) reached FDA approval in 2024; the 2020 guideline recommends only SURGICAL tricuspid eval. So
these rules implement a post-2020 transcatheter recommendation under a pre-transcatheter anchor - a material
guidance change per the precise bar. **Disposition:** re-anchor candidate (BUILD_STATE §10, the EP
2024-HRS-pacing precedent); classifications HELD PROVISIONAL against the current 2020 anchor (no flip now),
to be re-evaluated at the v2.0 re-anchor against 2024 transcatheter-tricuspid evidence + the forthcoming
focused update. NOT a register finding.
- **Secondary (softer) note:** GAP-SH-064 TMVR (Tendyne/Intrepid) is transcatheter mitral REPLACEMENT, still
  largely investigational/early-approval; its 2020-VHD Class 2a LOE C anchor is weak. Lesser candidate than
  the tricuspid space; noted, not flagged as a firm re-anchor.
- **Correctly anchored (NOT flagged):** SH-10 MitraClip/TEER (COAPT, 2018, already in 2020 VHD Class 2a);
  VD-4 MS surveillance (2020 VHD Class 1); SH-3 MR intervention eval (2020 VHD Class 1).

## 6. Batch-3 distribution

| | Baseline (2026-05-04) | Revised (2026-06-08, §16.6(iii) applied) | Delta |
|---|---:|---:|---:|
| DET_OK | 2 (SH-064, SH-022) | **0** | -2 |
| PARTIAL_DETECTION | 7 | **9** (+SH-064, SH-022) | +2 |
| SPEC_ONLY | 11 | 11 | 0 |
| **Total** | **20** | **20** | reconciles |

- **2 flips in Batch 3 (operator codified §16.6(iii) + AUDIT-125, 2026-06-08):** GAP-SH-064 + GAP-SH-022,
  both DET_OK -> PARTIAL (dx + age/symptom, zero echo-severity gate, gaps target severe lesions). This
  SUPERSEDES the original Batch-3 "0 flips / severity-breadth noted" result.
- §16 new code defects 0 (all codes correct); §16.5 flips 0; §16.6(i)/(ii) flips 0; §16.6(iii) flips 2.
- Under-anchoring: 1 candidate-horizon flag (transcatheter tricuspid, BUILD_STATE §10, provisional).
- **Cumulative 57/88. Cumulative flips: 6** (SH-008 B1; SH-013 + SH-061 + SH-011 B2; SH-064 + SH-022 B3).

## 7. PAUSE + STOP

Batch 3 close (cumulative 57/88). **UPDATED 2026-06-08:** the operator codified §16.6(iii) + filed AUDIT-125,
which FLIPS GAP-SH-064 + GAP-SH-022 DET_OK -> PARTIAL (superseding the original 0-flip result); revised
Batch-3 distribution **0 DET_OK / 9 PARTIAL / 11 SPEC_ONLY**. No source code changed; no canonical
crosswalk/addendum edited (flips PROPOSED for the SH module-close regen). Transcatheter-tricuspid re-anchor in
BUILD_STATE §10. Wall-clock: `SH-2026-06-08-batch3` + this update `batch3-s166iii`. **Batch 4 (PFO/ASD + ACHD
+ HCM) proceeds in this same block under the full stack incl. §16.6(iii).**
