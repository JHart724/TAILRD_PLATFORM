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
| GAP-SH-064 (TMVR candidacy) | SH-11 | `hasMR10 (I34.0) && age > 80` `:6404-6426` | N/A (dx) | I34.0 mitral = correct | **DET_OK hold** (severity-breadth noted) |
| GAP-SH-022 (severe TR transcath eval) | SH-4 | `I36.1 && (R60\|R16\|R18)` `:5337-5367` | N/A (dx) | I36.1 TR = correct | **DET_OK hold** (under-anchor flag, sec. 5) |

## 3. §16.5 axis - per-gap

**0 §16.5 flips** (hypothesis HOLDS). No Batch-3 rule is medication-presence: SH-3/SH-4/SH-10/SH-11/SH-12
(dx + echo-lab) + VD-4 (dx + echo). The Rheumatic-MS secondary-prophylaxis gap (GAP-SH-068, benzathine PCN)
is SPEC_ONLY (no rule), so its medication arm is not implemented.

## 4. §16.6 over-detection / concept-match

- **Concept-match (i):** both DET_OK pass - I34.0 (mitral regurg) and I36.1 (TR) match their rules' intent.
  No concept-mismatch flip in Batch 3 (contrast AUDIT-122 I34.0-on-an-aortic-gap, which was wrong-context).
- **Over-broad (ii) - severity-breadth, NOTED not flipped:** SH-11 (`I34.0 + age>80`) and SH-4 (`I36.1 +
  symptoms`) do not encode lesion SEVERITY (ICD-10 I34.0/I36.1 carry no severity grade), so each fires on a
  non-severe-MR/TR patient who meets the age/symptom proxy. This is a WITHIN-TARGET granularity limitation
  (correct condition, imprecise severity), categorically different from §16.6's WRONG-TARGET cases
  (AUDIT-120 allergy-on-OAC, AUDIT-122 mitral-on-aortic). Per that distinction it is a noted proxy
  limitation, not a wrong-target flip; the original DET_OK is held. (If the operator wants severity-breadth
  to flip uniformly, that is a separate cross-module policy call - flagged, not assumed.)

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

| | Baseline (2026-05-04) | Revised (2026-06-08) | Delta |
|---|---:|---:|---:|
| DET_OK | 2 (SH-064, SH-022) | **2** | 0 |
| PARTIAL_DETECTION | 7 | **7** | 0 |
| SPEC_ONLY | 11 | 11 | 0 |
| **Total** | **20** | **20** | reconciles |

- **0 flips in Batch 3.** §16 new defects 0 (all codes verified correct); §16.5 flips 0; §16.6 concept-match
  flips 0 (severity-breadth noted, not flipped); under-anchoring 1 candidate-horizon flag (transcatheter
  tricuspid, classifications held provisional).
- **Cumulative 57/88. Cumulative flips: 4** (SH-008 Batch 1; SH-013 + SH-061 + SH-011 Batch 2).

## 7. PAUSE + STOP

Batch 3 close (cumulative 57/88). **STOP for operator review before Batch 4 (PFO/ASD + ACHD + HCM).** No
source code changed; no canonical crosswalk/addendum edited. Transcatheter-tricuspid re-anchor added to
BUILD_STATE §10 candidate horizon. Wall-clock in `audit_runs.jsonl` (run `SH-2026-06-08-batch3`).
