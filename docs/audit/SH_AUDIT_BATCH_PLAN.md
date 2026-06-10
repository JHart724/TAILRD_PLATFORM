# SH (Structural Heart) Audit - SCOPING + Batch Plan (PAUSE-A)

**Date:** 2026-06-08. **Branch:** `audit/phase0b-sh-clinical-gaps` off the EP-inclusive main
(`55c8952`, carries §16.5). **Frozen denominator:** CK v4.0. **Method:** §16 external code verification
+ §1 direct rule-body read + §16.5 medication-match modifier - a re-verification reconciling the
2026-05-04 SH addendum, same as EP (NOT a three-axis manifest; the R1 greenfield carrier is absent).
**No extraction subagent** (dropped per the EP lesson). PROPOSED for operator review.

---

## 1. Confirmed baseline (verbatim from `SH.crosswalk.json`)

- **88 spec gaps** total. auditDate 2026-05-04, auditMethod `rule-body-citation-AUDIT-030D`.
- **Distribution: 9 DET_OK / 23 PARTIAL_DETECTION / 56 SPEC_ONLY = 88.**
- Any-coverage (DET_OK + PARTIAL): 32/88 = 36.4%. DET_OK rate 9/88 = 10.2%.
- Consistent with BUILD_STATE §4 SH row (9 DET_OK / 10.2%); no stale-number drift to reconcile
  (unlike EP's prior 18-vs-21 DET_OK gap).

## 2. Subcategory map (14 subcategories, from `SH.spec.json`)

| Subcategory | Gaps | DET_OK in subcat |
|---|---:|---:|
| Aortic Stenosis | 10 | 0 |
| BAV/Aortopathy | 9 | 1 (SH-008) |
| TAVR Post-op | 9 | 3 (SH-061, SH-013, SH-011) |
| Mitral Regurg | 10 | 1 (SH-064) |
| Mitral Stenosis | 4 | 0 |
| Tricuspid | 6 | 1 (SH-022) |
| Aortic Disease | 9 | 0 |
| PFO/ASD | 6 | 2 (SH-026, SH-027) |
| Pulmonary HTN | 5 | 0 |
| Pulmonary Embolism | 5 | 0 |
| Infective Endocarditis | 3 | 0 |
| ACHD | 8 | 0 |
| Cardiac Masses | 2 | 0 |
| HCM Interventions | 2 | 1 (SH-104) |
| **Total** | **88** | **9** |

## 3. The 9 DET_OK gaps - §16.5 pre-classification (every match expression read DIRECTLY)

| DET_OK gap | Subcat | Evaluator | Match expression (file:lines) | Med-presence? | §16.5 | Anchor |
|---|---|---|---|---|---|---|
| GAP-SH-022 (severe TR transcatheter eval) | Tricuspid | SH-4 | `dxCodes R60/R16/R18 + I36.1` `:5341-5367` | NO (dx) | N/A | 2020 ACC/AHA VHD |
| GAP-SH-011 (post-TAVR surveillance echo) | TAVR Post-op | SH-6 | `Z95.2 + hasAorticStenosis` `:5409-5429` | NO (dx) | N/A | 2020 ACC/AHA VHD |
| GAP-SH-026 (PFO + cryptogenic stroke <60) | PFO/ASD | SH-9 | `I63.9 + age<60 + Q21.1` `:5504-5525` | NO (dx) | N/A | 2020 AHA/ASA Stroke |
| GAP-SH-064 (transcatheter MVR candidacy) | Mitral Regurg | SH-11 | `hasMR10 (I34.0) + age>80` `:6408-6426` | NO (dx) | N/A | 2020 ACC/AHA VHD |
| GAP-SH-013 (post-TAVR paravalvular leak) | TAVR Post-op | SH-13 | `Z95.2 + I35.1/I34.0` `:6468-6486` | NO (dx) | N/A | 2020 ACC/AHA VHD |
| GAP-SH-104 (septal alcohol ablation surveil) | HCM | SH-15 | `I42.1 + R06/R55/R00` `:6525-6543` | NO (dx) | N/A | 2024 AHA/ACC HCM (current) |
| GAP-SH-008 (bicuspid AV surveillance) | BAV/Aortopathy | SH-BICUSPID | `Q23.1` `:10547-10568` | NO (dx) | N/A | 2020 ACC/AHA VHD |
| GAP-SH-061 (ViV TAVR for failed bioprosthesis) | TAVR Post-op | SH-VALVE-IN-VALVE | `Z95.2 + R06/R00/R55` `:10610-10632` | NO (dx) | N/A | 2020 ACC/AHA VHD |
| GAP-SH-027 (ASD significant shunt intervention) | PFO/ASD | SH-ASD | `Q21.1 + I50.81` `:10643-10665` | NO (dx) | N/A | 2018 AHA/ACC CHD |

**§16.5 axis result: 9 of 9 DET_OK are dx / imaging / device-based; 0 are medication-presence.**
None carry a spec SAFETY tag. The §16.5 modifier only flips DET_OK -> PARTIAL on a medication-presence
match, so the predicted §16.5 flip count for SH is **0** - confirming the hypothesis below. (PARTIAL gaps
may have medication arms, but they are already PARTIAL; §16.5 does not move them.)

## 4. Under-anchoring flags (route to candidate horizon, NOT the register - EP 2024-HRS-pacing precedent)

- **6 of 9 DET_OK rules are anchored to the 2020 ACC/AHA VHD Guideline:** SH-4 (SH-022), SH-6 (SH-011),
  SH-11 (SH-064), SH-13 (SH-013), SH-BICUSPID (SH-008), SH-VALVE-IN-VALVE (SH-061). The 2020 VHD
  guideline is the current foundational VHD reference, but its TAVR/TEER/TMVR/ViV recommendations carry
  the trial-endpoint lineage (PARTNER, COAPT `:1690`, RE-ALIGN `:1042`) that newer data may re-anchor.
- SH-9 (SH-026) is on 2020 AHA/ASA Stroke (RESPECT/CLOSE/REDUCE lineage); SH-ASD (SH-027) on 2018
  AHA/ACC CHD; both current-foundational. SH-15 (SH-104) on **2024 AHA/ACC HCM = current, NOT flagged.**
- **Disposition:** these are re-anchor-review CANDIDATES surfaced at scoping. Whether any is actually
  under-anchored (a newer focused update / trial changed the class or threshold) is a PER-BATCH §16
  determination. Confirmed-under-anchored rules route to BUILD_STATE §10 as SPEC_ONLY-until-re-anchored
  (the EP Pacing 2024-HRS-CPP precedent); they do NOT become register findings. Do NOT assume a flip.

## 5. Batch plan (locked sequence; each batch = §16 + §1 + §16.5; EP cadence ~15-22 gaps)

| Batch | Subcategories | Gaps | Cumulative | DET_OK in batch |
|---|---|---:|---:|---:|
| 1 | Aortic Stenosis (10) + BAV/Aortopathy (9) | 19 | 19 | 1 (SH-008) |
| 2 | TAVR Post-op (9) + Aortic Disease (9) | 18 | 37 | 3 (SH-061, SH-013, SH-011) |
| 3 | Mitral Regurg (10) + Mitral Stenosis (4) + Tricuspid (6) | 20 | 57 | 2 (SH-064, SH-022) |
| 4 | PFO/ASD (6) + ACHD (8) + HCM Interventions (2) | 16 | 73 | 3 (SH-026, SH-027, SH-104) |
| 5 | Pulmonary HTN (5) + Pulmonary Embolism (5) + Infective Endocarditis (3) + Cardiac Masses (2) | 15 | 88 | 0 |
| **Total** | **14 subcategories** | **88** | **88** | **9** |

Cumulative reconciles to the SH denominator exactly (19 + 18 + 20 + 16 + 15 = 88; DET_OK 1+3+2+3+0 = 9).
Batch 5 is the module-close batch (consolidated numbers + wall-clock aggregate + cross-module synthesis).

## 6. Hypothesis to test per-gap (do NOT assume)

SH is device / procedure / imaging-heavy (TAVR, TEER, ViV, TMVR, LAAO, ASD/PFO closure, septal ablation,
surveillance echo). The DET_OK set is 9/9 dx-gated, so the hypothesis is **0 §16.5 flips for SH** - the
same outcome as EP's device/dx-gated Pacing/CIED batch (which flipped 0). This is a HYPOTHESIS to confirm
by reading every DET_OK match per-batch, NOT an assumption. The expected non-trivial findings for SH are
§16 code-correctness defects (ICD-10 valve/congenital codes) and under-anchoring (the 2020-VHD lineage),
not the medication-match architecture that drove 12 of EP's 13 flips.

## 7. PAUSE-A + STOP

SCOPING COMPLETE. **STOP for operator review of the batch plan + the §16.5 pre-classification before
Batch 1.** No source code changed; no canonical crosswalk/addendum edited (scoping only). Wall-clock
scoping entry appended to `docs/audit/canonical/audit_runs.jsonl` (run `SH-2026-06-08-scoping`; phase
scoping, gapsAudited 0, isCalibrationPoint false - NOT a §7.2 floor point).
