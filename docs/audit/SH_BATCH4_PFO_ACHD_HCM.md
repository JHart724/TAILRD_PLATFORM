# SH Audit - Batch 4: PFO/ASD (6) + ACHD (8) + HCM Interventions (2) = 16 gaps

**Date:** 2026-06-08. **Scope:** PFO/ASD (6) + ACHD (8) + HCM Interventions (2) = 16 SH gaps (authoritative
from `SH.spec.json` + `SH.crosswalk.json`; **no extraction subagent**). **Frozen denominator:** CK v4.0.
**Method:** full standing stack §16 (NLM) + §16.5 + §16.6(i)(ii)(iii) + §1 direct DET_OK reads. PROPOSED for
operator review; canonical crosswalk/addendum NOT edited.

---

## 1. §16 + §16.6(i) per-batch concept-match verification table (mandatory)

| Code | Rule(s) | Claimed concept | NLM authoritative descriptor | Match | Source |
|---|---|---|---|---|---|
| Q21.1 | SH-9 (PFO), SH-ASD | atrial septal defect / PFO | "Atrial septal defect" family Q21.10-19 incl. **Q21.12 Patent foramen ovale** | **Y** | NLM 2026-06-08 |
| I63.9 | SH-9 | cryptogenic stroke | "Cerebral infarction, unspecified" | **Y** (unspecified-cause proxy) | NLM 2026-06-08 |
| I50.81 | SH-ASD | RV dilation / right heart failure | "Right heart failure" (I50.810-814) | **Y** | NLM (Batch 3) |
| I42.1 | SH-15 | obstructive HCM | "Obstructive hypertrophic cardiomyopathy" | **Y** | NLM 2026-06-08 |
| R06/R55/R00 | SH-15 | dyspnea / syncope / palpitations | matching symptom categories | Y | - |
| Z51.5 | EXCLUSION_HOSPICE | palliative care | "Encounter for palliative care" | Y | (prior) |

- **No new §16 CODE defect in Batch 4** - all codes resolve to their intended concepts. `startsWith('Q21.1')`
  correctly spans ASD + PFO (Q21.12). No Z95.x (AUDIT-123 N/A). The ACHD PARTIAL rules (SH-COARCTATION
  `:10706`, SH-FONTAN `:10739`) gate on Q-codes already PARTIAL via broad consolidation; not re-verified here.
- **1 §16.6(ii) wrong-target MAPPING defect found (AUDIT-126)** - see section 4.

## 2. §1 direct read of the 3 DET_OK + determinations

| DET_OK gap | Evaluator | Match (file:line) | §16.5 | §16.6 | Result |
|---|---|---|---|---|---|
| GAP-SH-026 (PFO + cryptogenic stroke closure) | SH-9 | `I63.9 && age<60 && startsWith('Q21.1')` `:5497-5525` | N/A | (i) OK, (ii) note, (iii) N/A | **DET_OK hold** |
| GAP-SH-027 (ASD significant shunt) | SH-ASD | `startsWith('Q21.1') && I50.81` `:10637-10665` | N/A | (i) OK, (iii) PASS | **DET_OK hold** |
| GAP-SH-104 (post-ASA conduction surveil) | SH-15 | `I42.1 && (R06\|R55\|R00)` `:6519-6543` | N/A | **(ii) FAIL** | **DET_OK -> PARTIAL (flip)** - AUDIT-126 |

- **GAP-SH-026 HOLD:** PFO closure is INDICATION-based (cryptogenic stroke + PFO + age<60 = the
  RESPECT/CLOSE/REDUCE criteria), NOT lesion-severity-graded, so §16.6(iii) does not apply. §16.6(ii) note:
  `startsWith('Q21.1')` also matches ASD (Q21.10/11), so an ASD + cryptogenic-stroke patient fires - but ASD
  is the SAME atrial-septum structure and the SAME closure-eval pathway (the subcategory is "PFO/ASD"), so
  this is within-family breadth, not a wrong-organ target; DET_OK held. RoPE risk-stratification is the
  sibling gap GAP-SH-080 (PARTIAL).
- **GAP-SH-027 HOLD - §16.6(iii) PASS:** the gap targets "significant shunt" (a hemodynamic-severity
  threshold). SH-ASD gates on `I50.81` (RV dilation / right heart failure) - the standard hemodynamic
  CONSEQUENCE of a significant ASD shunt (volume overload -> RV dilation). This IS a severity-addressing gate
  (unlike SH-064/022 which had a pure age/symptom proxy with ZERO severity signal), so it passes §16.6(iii).
  (Caveat: I50.81 is a consequence dx, not a direct Qp/Qs echo measure; a Qp/Qs gate would be the ideal
  remediation, but I50.81 constrains to hemodynamically-significant ASD, which is the gap's target.)
- **GAP-SH-104 FLIP - §16.6(ii) wrong-target (AUDIT-126):** the gap targets POST-procedure conduction
  surveillance (had ASA -> needs telemetry), but SH-15 detects PRE-procedure CANDIDACY (obstructive HCM +
  symptoms -> "consider ASA/myectomy"). SH-15 never checks ASA history; it fires on the wrong (pre-procedure)
  population. SH-15 correctly serves the sibling GAP-SH-105 (ASA-vs-myectomy decision). -> DET_OK -> PARTIAL.

## 3. §16.5 axis

**0 §16.5 flips** (hypothesis HOLDS). No Batch-4 rule is medication-presence (SH-9 / SH-ASD / SH-15 /
SH-COARCTATION / SH-FONTAN are all dx + age/symptom/lab). The Eisenmenger PAH-therapy gap (GAP-SH-101) and
the antithrombotic-regimen gap (GAP-SH-082) are SPEC_ONLY (medication arms not implemented).

## 4. §16.6 results

- **(i) concept-match:** all pass (codes resolve correctly).
- **(ii) over-broad / wrong-target:** **1 flip - GAP-SH-104 / AUDIT-126** (candidacy rule mapped to a
  post-procedure-surveillance gap). GAP-SH-026's Q21.1-includes-ASD breadth is within-family (noted, held).
- **(iii) severity-encoding:** **0 flips** - SH-026 is indication-based (no lesion-severity axis); SH-027
  has a hemodynamic-significance gate (I50.81). Neither is a zero-severity-gate case.

## 5. Under-anchoring (precise bar)

**0 under-anchoring flags.** SH-15 is anchored to the **2024 AHA/ACC HCM Guideline** (current). SH-9 PFO
closure (2020 AHA/ASA Stroke - RESPECT/CLOSE/REDUCE, stable), SH-ASD (2018 AHA/ACC CHD, foundational), and
the ACHD coarctation/Fontan rules (2018 ACHD) implement recommendations not materially changed by newer
guidance. (The Eisenmenger PAH-therapy gap, if built, would anchor to PAH-specific guidance - but it is
SPEC_ONLY.)

## 6. Batch-4 distribution

| | Baseline (2026-05-04) | Revised (2026-06-08) | Delta |
|---|---:|---:|---:|
| DET_OK | 3 (SH-026, SH-027, SH-104) | **2** (SH-026, SH-027) | -1 |
| PARTIAL_DETECTION | 5 | **6** (+SH-104) | +1 |
| SPEC_ONLY | 8 | 8 | 0 |
| **Total** | **16** | **16** | reconciles |

- **1 flip in Batch 4: GAP-SH-104 DET_OK -> PARTIAL (AUDIT-126, §16.6(ii) wrong-target).**
- §16 new code defects 0; §16.5 flips 0; §16.6(i) flips 0; §16.6(ii) flips 1; §16.6(iii) flips 0;
  under-anchoring 0.
- **Cumulative 73/88. Cumulative flips: 7** (SH-008 B1; SH-013 + SH-061 + SH-011 B2; SH-064 + SH-022 B3;
  SH-104 B4).

## 7. PAUSE + STOP

Batch 4 close (cumulative 73/88). **STOP for operator review before Batch 5 (Pulmonary HTN + Pulmonary
Embolism + Infective Endocarditis + Cardiac Masses = 15; the module-close batch).** No source code changed;
no canonical crosswalk/addendum edited (all flips PROPOSED). AUDIT-126 filed. Wall-clock in `audit_runs.jsonl`
(run `SH-2026-06-08-batch4`).
