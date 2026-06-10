# SH Audit - Batch 2: TAVR Post-op (9) + Aortic Disease (9) = 18 gaps

**Date:** 2026-06-08. **Scope:** TAVR Post-op (9) + Aortic Disease (9) = 18 SH gaps (authoritative from
`SH.spec.json` + `SH.crosswalk.json`; **no extraction subagent**). **Frozen denominator:** CK v4.0.
**Method:** §16 NLM verification of every code in the implemented rules + §1 DIRECT read of every DET_OK
match + §16.5 modifier. PROPOSED for operator review; canonical crosswalk/addendum NOT edited.

---

## 0. Batch-1 §16 completeness check (close the rigor gap)

Every distinct code in the IMPLEMENTED Batch-1 rules (1 DET_OK + 8 PARTIAL), verified:

| Code | Implemented rule(s) | NLM verdict |
|---|---|---|
| I35.0 | SH-1 (`:4905`), SH-2 (`:5240`) | OK (nonrheumatic aortic stenosis) |
| Q23.1 | SH-BICUSPID (`:10543`) | **WRONG -> AUDIT-121** (congenital aortic insufficiency, not bicuspid) |
| Z51.5 | EXCLUSION_HOSPICE (`:214`, all SH rules) | **OK** (Encounter for palliative care) - newly verified this batch |

- The cross-module PARTIAL consolidations (CAD-COMPLETE-REVASC for SH-048; CAD-BETA-BLOCKER for SH-052) use
  CAD-module codes, audited in the CAD audit - not re-verified here.
- **The aortopathy codes the operator flagged (I71.x, Q96 Turner, connective-tissue) are NOT in any
  implemented Batch-1 SH rule** - the Batch-1 aortopathy gaps (Marfan/Turner/vEDS/LDS/familial-TAA) are all
  SPEC_ONLY, so those codes live only in unimplemented detectionLogic. Completeness gap CLOSED: no new
  Batch-1 defect beyond AUDIT-121.
- **AUDIT-121 blast-radius expansion (this scan):** the Q23.1-as-bicuspid miscode recurs at 2 more code
  sites - `VD-BICUSPID-AORTOPATHY` (`:10899`, reuses the shared `hasBicuspid` const) and `VD-15` (`:6678`,
  own `Q23.1||Q87.4`) - both VHD-module evaluators UNMAPPED to any crosswalk gap (AUDIT-106 orphan class).
  AUDIT-121 register entry updated: 3 rule sites, 2 modules, 2-edit remediation. VD reclassification deferred
  to the VHD re-audit.

## 1. §16 external verification - Batch-2 implemented rules (NLM ICD-10-CM, 2026-06-08)

| Code | Used by | NLM name | Verdict |
|---|---|---|---|
| Z95.2 | SH-6 (`:5404`), SH-13 (`:6462`), SH-VALVE-IN-VALVE (`:10604`) | "Presence of prosthetic heart valve" | OK |
| I35.0 | SH-6 | "Nonrheumatic aortic (valve) stenosis" | OK |
| I35.1 | SH-13 | "Nonrheumatic aortic (valve) insufficiency" | OK |
| I34.0 | SH-13 (regurg proxy) | "Nonrheumatic mitral (valve) insufficiency" | OK code, but see observation |
| R06 / R00 / R55 | SH-VALVE-IN-VALVE | breathing / heart-beat / syncope symptom codes | OK (standard symptom proxies) |
| Z51.5 | exclusion (all) | "Encounter for palliative care" | OK |

- **SH-13 I34.0 - REOPENED + ADJUDICATED under the new §16.6 axis (see section 6):** the original Batch-2
  "minor / clinically-related, holds DET_OK" framing was WRONG. The §16.6 (ii) test - does a NON-target
  patient fire? - flips it: GAP-SH-013 is PVL-specific (aortic prosthesis; spec name "Post-TAVR paravalvular
  leak moderate+", structuredDataElements "TAVR, PVL grade"), so `I34.0` (mitral regurg) fires on
  post-prosthetic patients with no PVL -> **AUDIT-122 (LOW), GAP-SH-013 DET_OK -> PARTIAL.** Separately, all
  3 Batch-2 DET_OK gate on `Z95.2` for bioprosthetic/TAVR targets -> **AUDIT-123** (Z95.2/Z95.3 inversion).
- **No T82.x (prosthetic-device complication) in any Batch-2 implemented rule** (the rules use Z95.2
  presence). The PPM / HALT / PPM-mismatch gaps that would use T82 are SPEC_ONLY.
- **Aortic Disease (9): all 9 SPEC_ONLY - zero implemented rules**, so no running-code I71.x/dissection
  codes to verify. (I71.2 thoracic aneurysm + I77.81 ectasia were NLM-verified via the AUDIT-121 VD sites;
  note I71.0 = aortic DISSECTION, not dilation - a VD-rule semantic looseness, VHD scope.)
- **No new SH §16 code defect in Batch 2.**

## 2. §1 direct read of the 3 DET_OK

| DET_OK gap | Evaluator | Match (file:line) | §16.5 | §16.6 | Result |
|---|---|---|---|---|---|
| GAP-SH-061 (ViV TAVR) | SH-VALVE-IN-VALVE | `Z95.2 && (R06\|R00\|R55)` `:10604-10632` | N/A (dx) | **FAIL** | **DET_OK -> PARTIAL (flip)** - AUDIT-123 (Z95.2 concept-match) |
| GAP-SH-013 (post-TAVR PVL) | SH-13 | `Z95.2 && (I35.1\|I34.0)` `:6462-6486` | N/A (dx) | **FAIL** | **DET_OK -> PARTIAL (flip)** - AUDIT-122 (I34.0 over-detect) [+ AUDIT-123 Z95.2] |
| GAP-SH-011 (post-TAVR surveil echo) | SH-6 | `Z95.2 && hasAorticStenosis (I35.0)` `:5404-5429` | N/A (dx) | **FAIL** | **DET_OK -> PARTIAL (flip)** - AUDIT-123 (Z95.2 concept-match) |

All 3 DET_OK are dx/device-based (§16.5 N/A - 0 §16.5 flips, hypothesis holds). But ALL 3 fail §16.6: each
gates on `Z95.2` for a bioprosthetic/TAVR target (AUDIT-123), and SH-13 additionally over-detects via I34.0
(AUDIT-122). **All 3 flip DET_OK -> PARTIAL (operator-decided 2026-06-08): SH-013 (AUDIT-122) + SH-061 +
SH-011 (AUDIT-123). The data-coupling caveat + 81-ref remediation are deferred; the classification is not
(underclaim per AUDIT-118). Revised Batch-2 = 0 DET_OK / 5 PARTIAL / 13 SPEC_ONLY.**

## 3. §16.5 axis - per-gap

**0 §16.5 flips in Batch 2** (hypothesis HOLDS). No Batch-2 rule is medication-presence:
- DET_OK SH-061/013/011: Z95.2 + dx/lab proxies - NOT med.
- PARTIAL SH-012 (SH-6, Z95.2 + I35.0) dx; SH-060 (EP-REMOTE-MONITORING cross-module, device-monitoring) - NOT med.
- SPEC_ONLY (13): no rule - N/A.

## 4. Under-anchoring (precise bar)

**0 under-anchoring flags.** SH-VALVE-IN-VALVE (ViV TAVR, Class 2a), SH-13 (PVL echo assessment, Class 1),
SH-6 (post-TAVR follow-up echo, Class 1) implement stable 2020-VHD recommendations; ViV TAVR and post-TAVR
echo surveillance were not materially changed by newer guidance (PARTNER/Evolut ViV evidence already
underpins the 2020 Class 2a). The 9 Aortic Disease gaps are SPEC_ONLY (no rule to anchor); when built they
should anchor to the **2022 ACC/AHA Aortic Disease Guideline** (size thresholds), which the VD-15 VD rule
already cites - a build-time note, not an under-anchoring flag here.

## 5. Batch-2 distribution

| | Baseline (2026-05-04) | Revised (operator-decided 2026-06-08) | Delta |
|---|---:|---:|---:|
| DET_OK | 3 (SH-061, SH-013, SH-011) | **0** | -3 |
| PARTIAL_DETECTION | 2 (SH-012, SH-060) | **5** (+SH-013, SH-061, SH-011) | +3 |
| SPEC_ONLY | 13 | 13 | 0 |
| **Total** | **18** | **18** | reconciles |

- **3 flips (all operator-decided 2026-06-08):** GAP-SH-013 (AUDIT-122, §16.6 over-detect via I34.0) +
  GAP-SH-061 + GAP-SH-011 (AUDIT-123, §16.6 concept-match on Z95.2-as-bioprosthetic). Revised Batch-2 =
  **0 DET_OK / 5 PARTIAL / 13 SPEC_ONLY.**
- The data-coupling caveat (Z95.2 vs Z95.3 in ingested data) + the 81-ref cross-module remediation are
  operator-gated and deferred; the classification is NOT (underclaim per AUDIT-118 / §16.6).
- The SAFETY vector (VD-1 warfarin over-treatment of bioprosthetic) is split to **AUDIT-124** (MEDIUM,
  escalate-to-HIGH at DUA).
- AUDIT-121 (Q23.1) unaffected here (no Batch-2 SH gap uses Q23.1).
- **Cumulative 37/88. Cumulative flips: 4** (SH-008 Batch 1; SH-013 + SH-061 + SH-011 Batch 2).

## 6. §16.6 retro-confirm (Batches 1-2, all implemented DET_OK + PARTIAL)

§16.6 (over-detection / concept-match) was codified this block (AUDIT_METHODOLOGY.md §16.6) and applied
retroactively to every implemented Batch-1 + Batch-2 rule. Per-batch §16 concept-match verification table:

| Code | Rule | Claimed concept | NLM/authoritative descriptor | Match | Finding |
|---|---|---|---|---|---|
| I35.0 | SH-1, SH-2, SH-6 | aortic stenosis | "Nonrheumatic aortic (valve) stenosis" | Y | - |
| Q23.1 | SH-BICUSPID | bicuspid aortic valve | "Congenital insufficiency of aortic valve" | **N** | AUDIT-121 |
| I35.1 | SH-13 | aortic regurgitation | "Nonrheumatic aortic (valve) insufficiency" | Y | - |
| I34.0 | SH-13 | "new regurgitation" (aortic PVL gap) | "Nonrheumatic MITRAL (valve) insufficiency" | **N** | AUDIT-122 |
| Z95.2 | SH-6, SH-13, SH-VALVE-IN-VALVE | bioprosthetic/TAVR valve | "Presence of prosthetic [mechanical] heart valve" | **N** | AUDIT-123 |
| Z95.3 | (codebase, VD rules) | "mechanical" | "Presence of XENOGENIC [bioprosthetic] heart valve" | **N** | AUDIT-123 |
| Z51.5 | EXCLUSION_HOSPICE | palliative care | "Encounter for palliative care" | Y | - |
| R06/R00/R55 | SH-VALVE-IN-VALVE | dyspnea / palpitations / syncope | matching symptom categories | Y | - |

- **§16.6 (i) concept-match failures:** AUDIT-121 (Q23.1), AUDIT-123 (Z95.2/Z95.3 inversion).
- **§16.6 (ii) over-broad failures:** AUDIT-122 (I34.0 mitral on aortic-PVL gap).
- **Propagation sweeps:** AUDIT-121 Q23.1 (3 sites / 2 modules - the first exemplar, run in Batch-2 STEP 0);
  AUDIT-123 Z95.2/Z95.3/Z95.4 (81 refs across SH + VHD valve + anticoag rules, self-contradictory labels -
  the second exemplar).
- **Batch-1 retro:** SH-1 / SH-2 (I35.0) pass §16.6 (correct concept, fire only on AS-target). SH-BICUSPID
  already flipped (AUDIT-121). No new Batch-1 §16.6 finding.
- **Cross-module / clinical-safety angle:** the VD-1 warfarin rule (`:4939`) treats all prosthetic valves
  incl. bioprosthetic (Z95.3) as needing lifelong warfarin - a bioprosthetic over-treatment direction; this
  SAFETY vector is split into **AUDIT-124** (MEDIUM, escalate-to-HIGH at DUA). VD-1's full reclassification
  stays with the VHD re-audit.

## 7. RESOLUTION (operator-decided 2026-06-08) + STOP

Batch 2 fully resolved under the standing §16/§16.5/§16.6 stack. Sequence: codified §16.6
(AUDIT_METHODOLOGY.md); flipped GAP-SH-013 (AUDIT-122, operator pre-authorized); filed AUDIT-123 (Z95.2/Z95.3
inversion, 81-ref cross-module sweep); **operator then decided (2026-06-08): GAP-SH-061 + GAP-SH-011 ->
PROPOSED PARTIAL** (underclaim, not held DET_OK), and **split the SAFETY vector to AUDIT-124** (VD-1 warfarin
over-treatment of bioprosthetic, MEDIUM now / escalate-to-HIGH at DUA). **Final Batch-2 distribution: 0
DET_OK / 5 PARTIAL / 13 SPEC_ONLY** (3 flips: SH-013, SH-061, SH-011). The data-coupling caveat + 81-ref
remediation remain operator-gated/deferred; the classifications are settled. No source code changed; no
canonical crosswalk/addendum edited (all flips PROPOSED; regen at SH module-close). Register: AUDIT-122 +
AUDIT-123 + AUDIT-124 filed, AUDIT-121 cross-ref updated. **Proceed to Batch 3 (Mitral Regurg + Mitral
Stenosis + Tricuspid).** Wall-clock: `SH-2026-06-08-batch2-s166` + this resolution under `batch2-resolve`.
