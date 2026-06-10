# SH Audit - Batch 5 (final): Pulmonary HTN (5) + Pulmonary Embolism (5) + Infective Endocarditis (3) + Cardiac Masses (2) = 15 gaps; MODULE COMPLETE 88/88

**Date:** 2026-06-08. **Scope:** PHTN (5) + PE (5) + IE (3) + Cardiac Masses (2) = 15 SH gaps (authoritative
from `SH.spec.json` + `SH.crosswalk.json`; **no extraction subagent**). **Frozen denominator:** CK v4.0.
**Method:** full stack §16 + §16.5 + §16.6(i)(ii)(iii) + the overlap rule. Reaches 88/88 (module complete).
PROPOSED for operator review; canonical crosswalk/addendum NOT edited (the module-close synthesis is the
separate block).

---

## 1. §16 + §16.6 verification (only 1 implemented rule in this batch)

PHTN (5), PE (5), Cardiac Masses (2) = **12/15 gaps are SPEC_ONLY with no rule.** IE has 1 implemented rule:

| Code | Rule | Claimed concept | NLM/authoritative | Match |
|---|---|---|---|---|
| Z95.2/3/4 | SH-7 (prophylaxis) | prosthetic valve | (per AUDIT-123 - valve-type inversion, cross-ref) | see AUDIT-123 |
| Z01.2 | SH-7 | dental-procedure encounter | "Encounter for other special examination ... " (dental) | Y (prophylaxis context) |
| Z96 | SH-7 | presence of functional implant | "Presence of other functional implants" | Y |
| Z88 | SH-7 exclusion | antibiotic allergy | "Allergy status to ... antibiotic agents" | **Y - correct use here** (contrast AUDIT-120, where Z88 was misused as an OAC contraindication) |

- **No new §16 code defect.** SH-7's codes are prophylaxis-context; its Z88 use (allergy-to-prophylactic-
  antibiotics exclusion) is the CORRECT use of Z88, unlike AUDIT-120.
- **1 §16.6(ii) disjoint wrong-target flip (AUDIT-129)** - see section 2.

## 2. §16.6 - the SH-028 disjoint mismap (AUDIT-129)

GAP-SH-028 = "Infective endocarditis: Duke criteria WORKUP" (DL "Suspected IE without TEE + blood cultures
x3") - target is a SUSPECTED-IE patient needing diagnostic workup. The mapped rule SH-7 (`:5434-5463`)
detects PROPHYLAXIS candidates (`prosthetic valve Z95.2/3/4 + high-risk procedure Z01.2/Z96` ->
"review prophylaxis needs"). SH-7 never checks suspected-IE; the two share ZERO true positives (prevention
vs diagnosis). Per the §16.6(ii) overlap rule (fully disjoint -> SPEC_ONLY): **GAP-SH-028 PARTIAL -> SPEC_ONLY
(AUDIT-129).**

- **§16.5:** 0 (no medication-presence rule; the IE-surgery / S. aureus-TEE / PE-lysis gaps are SPEC_ONLY).
- **§16.6(i)/(iii):** N/A (no DET_OK gaps in this batch; only SH-7 implemented, addressed under (ii)).
- **Under-anchoring:** PHTN (5) + PE (5) are 100% SPEC_ONLY - NO implemented rule cites a guideline, so there
  is nothing to under-anchor. **Build-time note (not a flag):** when PHTN is built, anchor to the **2022
  ESC/ERS Pulmonary Hypertension Guideline** (the current standard; do not anchor to 2015 ESC/ERS); PE
  risk-stratification to 2019 ESC PE (PESI/sPESI + RV-strain/troponin).

## 3. Batch-5 distribution

| | Baseline (2026-05-04) | Revised (2026-06-08) | Delta |
|---|---:|---:|---:|
| DET_OK | 0 | 0 | 0 |
| PARTIAL_DETECTION | 1 (SH-028) | **0** | -1 |
| SPEC_ONLY | 14 | **15** (+SH-028) | +1 |
| **Total** | **15** | **15** | reconciles |

- **1 flip in Batch 5: GAP-SH-028 PARTIAL -> SPEC_ONLY (AUDIT-129, §16.6(ii) disjoint).**

---

## 4. MODULE-CLOSE TALLY (88/88; read-only - the §9.2 regen + addendum is the separate synthesis block)

### Final SH distribution (PROPOSED, all 10 flips applied)

| Class | Baseline (2026-05-04 addendum) | Revised (2026-06-08 re-audit) | Delta |
|---|---:|---:|---:|
| DET_OK | 9 (10.2%) | **0 (0.0%)** | -9 |
| PARTIAL_DETECTION | 23 (26.1%) | **30 (34.1%)** | +7 net |
| SPEC_ONLY | 56 (63.6%) | **58 (65.9%)** | +2 |
| **Total** | **88** | **88** | reconciles |

- **Any-coverage (DET_OK + PARTIAL): 32/88 = 36.4% -> 30/88 = 34.1%** (the 2 SPEC_ONLY flips, SH-104 +
  SH-028, dropped out of any-coverage; the other 8 flips stayed within it).
- **Trustworthy-detection (DET_OK): 10.2% -> 0.0%.** ALL 9 SH DET_OK classifications were over-credited -
  every one failed a §16 / §16.5 / §16.6 check. This is the load-bearing module result.

### The 10 classification changes (all PROPOSED)

| Gap | Change | Driver |
|---|---|---|
| GAP-SH-008 (bicuspid surveil) | DET_OK -> PARTIAL | AUDIT-121 (Q23.1 wrong-concept; bicuspid = Q23.81) |
| GAP-SH-013 (post-TAVR PVL) | DET_OK -> PARTIAL | AUDIT-122 (I34.0 mitral on aortic-PVL gap, §16.6(ii)) |
| GAP-SH-061 (ViV TAVR) | DET_OK -> PARTIAL | AUDIT-123 (Z95.2-as-bioprosthetic concept-inversion) |
| GAP-SH-011 (post-TAVR surveil) | DET_OK -> PARTIAL | AUDIT-123 |
| GAP-SH-064 (TMVR candidacy) | DET_OK -> PARTIAL | AUDIT-125 (§16.6(iii) severity; zero gate, severe MR) |
| GAP-SH-022 (severe TR transcath) | DET_OK -> PARTIAL | AUDIT-125 (§16.6(iii) severity; + transcath-tricuspid under-anchor) |
| GAP-SH-104 (post-ASA surveil) | DET_OK -> SPEC_ONLY | AUDIT-126 (§16.6(ii) disjoint; candidacy != surveillance) |
| GAP-SH-026 (PFO closure) | DET_OK -> PARTIAL | AUDIT-127 (§16.6(ii) no etiology exclusion) |
| GAP-SH-027 (ASD significant shunt) | DET_OK -> PARTIAL | AUDIT-128 (§16.5 I50.81 late-proxy under-detection) |
| GAP-SH-028 (IE Duke workup) | PARTIAL -> SPEC_ONLY | AUDIT-129 (§16.6(ii) disjoint; prophylaxis != workup) |

### AUDIT-121..129 disposition (9 SH findings + the AUDIT-124 safety split)

| # | Severity | One-line |
|---|---|---|
| AUDIT-121 | MEDIUM P2 | bicuspid Q23.1 (= congenital AI) miscode; correct Q23.81; 3 sites / 2 modules |
| AUDIT-122 | LOW P3 | post-TAVR PVL fires on I34.0 mitral regurg (wrong valve) |
| AUDIT-123 | MEDIUM P2 | Z95.2 (mechanical) <-> Z95.3 (xenogenic/bioprosthetic) inverted; 81 refs, cross-module |
| AUDIT-124 | MEDIUM P2 (ESCALATE-HIGH at DUA) | SAFETY: VD-1 warfarin for bioprosthetic valves (over-anticoagulation) |
| AUDIT-125 | LOW-MEDIUM | §16.6(iii) severity-encoding class (dx+age/symptom, no echo-severity gate) |
| AUDIT-126 | LOW P3 | ASA-candidacy rule mapped to post-ASA-surveillance gap (disjoint) |
| AUDIT-127 | LOW P3 | PFO closure rule has no coded stroke-etiology exclusion |
| AUDIT-128 | LOW P3 | ASD significant-shunt gates on RV failure (late proxy; under-detects) |
| AUDIT-129 | LOW P3 | IE Duke-workup gap mapped to the endocarditis-prophylaxis rule (disjoint) |

Methodology codified during the SH audit: **§16.5 medication-match (pre-existing), §16.6(i) concept-match,
§16.6(ii) over-broad/wrong-target + the overlap rule (partial -> PARTIAL, disjoint -> SPEC_ONLY), §16.6(iii)
severity-encoding.** Candidate-horizon: transcatheter-tricuspid re-anchor (BUILD_STATE §10). Cross-module
v2.0 re-application owed: §16.6(iii) severity class + AUDIT-123/124 valve-type across HF/CAD/PV/VHD/EP.

## 5. PAUSE + STOP

SH classification COMPLETE (88/88). **STOP for operator review of the complete SH classification before the
SH module-close synthesis block** (§9.2 full-pipeline-regen applying the 10 flips + the 9 AUDIT overrides,
the 13-section addendum dated-superseding 2026-05-04, the 3 status surfaces, and the PR). No source code
changed; no canonical crosswalk/addendum edited (all flips PROPOSED). Wall-clock in `audit_runs.jsonl`
(run `SH-2026-06-08-batch5`).
