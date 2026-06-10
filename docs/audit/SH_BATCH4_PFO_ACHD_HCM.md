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
| GAP-SH-026 (PFO + cryptogenic stroke closure) | SH-9 | `I63.9 && age<60 && startsWith('Q21.1')` `:5497-5525` | N/A | **(ii) FAIL** | **DET_OK -> PARTIAL** - AUDIT-127 (no etiology exclusion) |
| GAP-SH-027 (ASD significant shunt) | SH-ASD | `startsWith('Q21.1') && I50.81` `:10637-10665` | **§16.5 FAIL** | - | **DET_OK -> PARTIAL** - AUDIT-128 (I50.81 late-proxy under-detect) |
| GAP-SH-104 (post-ASA conduction surveil) | SH-15 | `I42.1 && (R06\|R55\|R00)` `:6519-6543` | N/A | **(ii) FAIL disjoint** | **DET_OK -> SPEC_ONLY** - AUDIT-126 (zero overlap) |

**NOTE - the Batch-5 STEP-0 verification SUPERSEDES the initial Batch-4 holds:** SH-026 + SH-027 were
initially held DET_OK; direct spec re-verification flips both, and SH-104 was reclassified PARTIAL -> SPEC_ONLY.

- **GAP-SH-026 -> PARTIAL (AUDIT-127, §16.6(ii) over-detection):** the spec targets CRYPTOGENIC stroke, but
  SH-9 fires on `I63.9 + age<60 + Q21.1` with NO coded etiology exclusion. The rule's own evidence object
  lists "Known alternative stroke etiology" as an exclusion (`:5522`), yet the match never checks `!hasAF
  (I48)` / `!hasCarotid (I65)` - an evidence-vs-logic gap. An I63.9 + PFO + AF patient (cardioembolic, a
  competing cause) over-fires. Partial overlap (true cryptogenic patients ARE caught) -> PARTIAL, not SPEC_ONLY.
- **GAP-SH-027 -> PARTIAL (AUDIT-128, §16.5 under-detection):** the gap's significance signals are RV SIZE +
  PASP (structuredDataElements "ASD dx, RV size, PASP, closure"); SH-ASD gates on `I50.81` (right heart
  FAILURE), a LATE consequence. A significant ASD with RV dilation or PASP elevation but NOT yet RV failure is
  MISSED - the rule's gate is set too late on the disease course (it misses exactly the pre-failure window the
  closure targets). This corrects the Batch-4 "§16.6(iii) PASS" framing: I50.81 addresses significance but
  under-detects pre-failure shunts.
- **GAP-SH-104 -> SPEC_ONLY (AUDIT-126, §16.6(ii) wrong-target, DISJOINT):** SH-15 detects PRE-procedure ASA
  CANDIDACY (obstructive HCM + symptoms), the gap targets POST-procedure conduction surveillance. SH-15 shares
  ZERO true positives with the gap (it never checks ASA history) -> per the §16.6(ii) overlap rule, fully
  disjoint -> SPEC_ONLY (PARTIAL would overclaim). SH-15 correctly serves the sibling GAP-SH-105.

## 3. §16.5 axis

No Batch-4 rule is medication-presence (SH-9 / SH-ASD / SH-15 / SH-COARCTATION / SH-FONTAN are all dx +
age/symptom/lab) - so 0 medication-presence flips. **But §16.5 ALSO covers narrow/late dx gating (not only
the AUDIT-118 medication architecture): SH-ASD's `I50.81` (RV failure) under-detects pre-failure significant
shunts -> GAP-SH-027 flips PARTIAL (AUDIT-128).** The Eisenmenger PAH-therapy gap (GAP-SH-101) and the
antithrombotic-regimen gap (GAP-SH-082) are SPEC_ONLY (medication arms not implemented).

## 4. §16.6 results (after Batch-5 STEP-0 re-verification)

- **(i) concept-match:** all pass (codes resolve correctly).
- **(ii) over-broad / wrong-target - 2 flips:** GAP-SH-104 -> **SPEC_ONLY** (AUDIT-126; SH-15 ASA-candidacy
  fully DISJOINT from the post-ASA-surveillance target, zero overlap, per the §16.6(ii) overlap rule);
  GAP-SH-026 -> **PARTIAL** (AUDIT-127; SH-9 has no coded stroke-etiology exclusion, over-fires on
  non-cryptogenic strokes; partial overlap -> PARTIAL).
- **(iii) severity-encoding:** **0 flips.** SH-026 is indication-based (no lesion-severity axis). SH-027 is
  NOT a (iii) case - it HAS a significance gate (I50.81); its defect is that the gate is too LATE
  (under-detection, AUDIT-128 / §16.5), not absent.

## 5. Under-anchoring (precise bar)

**0 under-anchoring flags.** SH-15 is anchored to the **2024 AHA/ACC HCM Guideline** (current). SH-9 PFO
closure (2020 AHA/ASA Stroke - RESPECT/CLOSE/REDUCE, stable), SH-ASD (2018 AHA/ACC CHD, foundational), and
the ACHD coarctation/Fontan rules (2018 ACHD) implement recommendations not materially changed by newer
guidance. (The Eisenmenger PAH-therapy gap, if built, would anchor to PAH-specific guidance - but it is
SPEC_ONLY.)

## 6. Batch-4 distribution

| | Baseline (2026-05-04) | Revised (2026-06-08, after STEP-0 re-verification) | Delta |
|---|---:|---:|---:|
| DET_OK | 3 (SH-026, SH-027, SH-104) | **0** | -3 |
| PARTIAL_DETECTION | 5 | **7** (+SH-026 AUDIT-127, +SH-027 AUDIT-128) | +2 |
| SPEC_ONLY | 8 | **9** (+SH-104 AUDIT-126) | +1 |
| **Total** | **16** | **16** | reconciles |

- **3 flips in Batch 4 (after the Batch-5 STEP-0 re-verification):** GAP-SH-104 DET_OK -> SPEC_ONLY
  (AUDIT-126, disjoint wrong-target); GAP-SH-026 DET_OK -> PARTIAL (AUDIT-127, §16.6(ii) no etiology
  exclusion); GAP-SH-027 DET_OK -> PARTIAL (AUDIT-128, §16.5 late-proxy under-detection).
- §16 new code defects 0; §16.5 flips 1 (SH-027); §16.6(ii) flips 2 (SH-104 disjoint -> SPEC_ONLY; SH-026
  partial-overlap -> PARTIAL); §16.6(iii) flips 0; under-anchoring 0.
- **Cumulative 73/88. Cumulative flips: 9** (SH-008 B1; SH-013 + SH-061 + SH-011 B2; SH-064 + SH-022 B3;
  SH-104 + SH-026 + SH-027 B4). **SH DET_OK is now 0 through Batch 4** (Batch 5 has no DET_OK gaps).

## 7. PAUSE + STOP

Batch 4 close (cumulative 73/88). **UPDATED 2026-06-08 (Batch-5 STEP-0 re-verification):** the initial
Batch-4 result (1 flip; SH-026/027 held DET_OK) is SUPERSEDED - all 3 Batch-4 DET_OK now flip: GAP-SH-104
DET_OK -> SPEC_ONLY (AUDIT-126), GAP-SH-026 -> PARTIAL (AUDIT-127), GAP-SH-027 -> PARTIAL (AUDIT-128). Revised
Batch-4 distribution **0 DET_OK / 7 PARTIAL / 9 SPEC_ONLY**; cumulative flips 9; SH DET_OK now 0 through Batch
4. No source code changed; no canonical crosswalk/addendum edited (all flips PROPOSED). AUDIT-126/127/128 filed.
Wall-clock: `SH-2026-06-08-batch4` + STEP-0 corrections under `batch5` run. **Batch 5 (PHTN + PE + IE + Masses)
proceeds in this same block.**
