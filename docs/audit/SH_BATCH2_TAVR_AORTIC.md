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

- **Observation (not a defect / not a flip):** SH-13 (post-aortic-prosthetic PVL) matches `I35.1 || I34.0`
  as "new regurgitation". I35.1 (aortic insufficiency) is the correct target for an aortic-prosthesis PVL;
  I34.0 (MITRAL insufficiency) is a slightly over-broad co-finding proxy. The rule still correctly detects
  the I35.1 aortic-regurg target, so GAP-SH-013 holds DET_OK; the I34.0 inclusion is minor over-breadth
  (milder + clinically-related, unlike AUDIT-120's wholly-unrelated Z88). Noted for transparency.
- **No T82.x (prosthetic-device complication) in any Batch-2 implemented rule** (the rules use Z95.2
  presence). The PPM / HALT / PPM-mismatch gaps that would use T82 are SPEC_ONLY.
- **Aortic Disease (9): all 9 SPEC_ONLY - zero implemented rules**, so no running-code I71.x/dissection
  codes to verify. (I71.2 thoracic aneurysm + I77.81 ectasia were NLM-verified via the AUDIT-121 VD sites;
  note I71.0 = aortic DISSECTION, not dilation - a VD-rule semantic looseness, VHD scope.)
- **No new SH §16 code defect in Batch 2.**

## 2. §1 direct read of the 3 DET_OK

| DET_OK gap | Evaluator | Match (file:line) | Med-presence? | §16.5 | Result |
|---|---|---|---|---|---|
| GAP-SH-061 (ViV TAVR) | SH-VALVE-IN-VALVE | `Z95.2 && (R06\|R00\|R55)` `:10604-10632` | NO (dx) | N/A | **DET_OK hold** |
| GAP-SH-013 (post-TAVR PVL) | SH-13 | `Z95.2 && (I35.1\|I34.0)` `:6462-6486` | NO (dx) | N/A | **DET_OK hold** (I34.0 obs above) |
| GAP-SH-011 (post-TAVR surveil echo) | SH-6 | `Z95.2 && hasAorticStenosis (I35.0)` `:5404-5429` | NO (dx) | N/A | **DET_OK hold** |

All 3 DET_OK are dx/device-based; codes correct. **0 flips.**

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

| | Baseline (2026-05-04) | Revised (2026-06-08) | Delta |
|---|---:|---:|---:|
| DET_OK | 3 (SH-061, SH-013, SH-011) | **3** | 0 |
| PARTIAL_DETECTION | 2 (SH-012, SH-060) | **2** | 0 |
| SPEC_ONLY | 13 | 13 | 0 |
| **Total** | **18** | **18** | reconciles |

- **0 flips in Batch 2.** §16.5 flips 0; §16 new SH defects 0 (1 observation, no flip); under-anchoring 0.
- AUDIT-121 blast-radius expanded cross-module (2 VHD sites), but no Batch-2 SH gap uses Q23.1, so no
  Batch-2 flip from it.
- **Cumulative 37/88. Cumulative flips: 1** (GAP-SH-008, Batch 1).

## 6. PAUSE + STOP

Batch 2 close (cumulative 37/88). **STOP for operator review before Batch 3 (Mitral Regurg + Mitral
Stenosis + Tricuspid).** No source code changed; no canonical crosswalk/addendum edited. AUDIT-121 register
entry updated (cross-module blast radius). Wall-clock in `audit_runs.jsonl` (run `SH-2026-06-08-batch2`).
