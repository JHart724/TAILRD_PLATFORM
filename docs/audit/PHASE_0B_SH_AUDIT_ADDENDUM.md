# Phase 0B SH Audit Addendum — generated from canonical crosswalk

**Module:** Structural Heart (SH)
**Spec source:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.3
**Code source:** `backend/src/ingestion/gaps/gapRuleEngine.ts` (registry=25, evaluator=25, gapsPush=25)
**Crosswalk:** `docs/audit/canonical/SH.crosswalk.json` (auditMethod: rule-body-citation-AUDIT-030D)
**Audit date:** 2026-06-08

## 1. Summary

Structural Heart has **88 spec gaps** across 14 subcategories. Implementation: **0 DET_OK + 30 PARTIAL + 58 SPEC_ONLY** (any-coverage: 30/88 = 34.1%).

**Tier 1 priority status:** 0 DET_OK + 8 PARTIAL + 5 SPEC_ONLY of 13 T1 gaps (T1 any-coverage: 61.5%).

**Spec-explicit SAFETY-tagged gaps:** 0.

---

## 2. Coverage by classification

| Classification | Count | % of total |
|---|---:|---:|
| PRODUCTION_GRADE | 0 | 0.0% |
| DET_OK | 0 | 0.0% |
| PARTIAL_DETECTION | 30 | 34.1% |
| SPEC_ONLY | 58 | 65.9% |
| **Total** | **88** | **100.0%** |

**PRODUCTION_GRADE = 0** is platform-wide; gated on closure of AUDIT-001 P0 (test coverage gap). Per AUDIT_METHODOLOGY.md §3.1, no rule classifies PRODUCTION_GRADE until the platform testing baseline is established.

---

## 3. Coverage by tier

| Tier | Total | DET_OK | PARTIAL | SPEC_ONLY | Any-coverage % |
|------|------:|-------:|--------:|----------:|---------------:|
| **T1** | 13 | 0 | 8 | 5 | 61.5% |
| **T2** | 58 | 0 | 15 | 43 | 25.9% |
| **T3** | 17 | 0 | 7 | 10 | 41.2% |
| **Overall** | **88** | **0** | **30** | **58** | **34.1%** |

---

## 4. Per-subcategory breakdown

| Subcategory | T1/T2/T3 | DET_OK | PARTIAL | SPEC_ONLY | Coverage |
|---|---|---:|---:|---:|---:|
| Aortic Stenosis (10) | 4/6/0 | 0 | 6 | 4 | 60.0% |
| BAV/Aortopathy (9) | 0/5/4 | 0 | 3 | 6 | 33.3% |
| TAVR Post-op (9) | 1/7/1 | 0 | 5 | 4 | 55.6% |
| Mitral Regurg (10) | 4/6/0 | 0 | 4 | 6 | 40.0% |
| Mitral Stenosis (4) | 0/4/0 | 0 | 1 | 3 | 25.0% |
| Tricuspid (6) | 1/3/2 | 0 | 4 | 2 | 66.7% |
| Aortic Disease (9) | 1/4/4 | 0 | 0 | 9 | 0.0% |
| PFO/ASD (6) | 0/5/1 | 0 | 3 | 3 | 50.0% |
| Pulmonary HTN (5) | 0/4/1 | 0 | 0 | 5 | 0.0% |
| Pulmonary Embolism (5) | 2/3/0 | 0 | 0 | 5 | 0.0% |
| Infective Endocarditis (3) | 0/3/0 | 0 | 0 | 3 | 0.0% |
| ACHD (8) | 0/6/2 | 0 | 3 | 5 | 37.5% |
| Cardiac Masses (2) | 0/0/2 | 0 | 0 | 2 | 0.0% |
| HCM Interventions (2) | 0/2/0 | 0 | 1 | 1 | 50.0% |

---

## 4.5 — T1 SPEC_ONLY work items (load-bearing for v2.0 Phase 1)

5 T1 spec gaps with zero implementation. These are the load-bearing v2.0 Phase 1 work items for Structural Heart.

| GAP-ID | Spec line | Subcategory | Detection Logic (excerpt) | Spec SAFETY | BSW pathway |
|---|---:|---|---|---|---|
| GAP-SH-003 | 447 | Aortic Stenosis | LVEF<50 + AVA<1.0 + MG<40 without DSE | — | — |
| GAP-SH-019 | 488 | Mitral Regurg | FMR mod-severe + HF symptoms without heart team review | — | — |
| GAP-SH-075 | 517 | Aortic Disease | Type B dissection + malperfusion/expansion without TEVAR eval | — | — |
| GAP-SH-090 | 549 | Pulmonary Embolism | Submassive PE (RV strain or troponin elevation) without CDT discussion | — | — |
| GAP-SH-091 | 550 | Pulmonary Embolism | Massive PE (hemodynamic instability) without systemic lysis, surgical embolectom... | — | — |

---

## 4.6 — EXTRA rules + architectural patterns

No EXTRA rules or architectural patterns surfaced. Reconciliation is clean.

---

## 5. Tier 1 priority gaps surfaced

| GAP-ID | Spec line | Class | Rule body cite | Notes |
|---|---:|---|---|---|
| GAP-SH-001 | 445 | PARTIAL_DETECTION | `gap-sh-2-tavr-eval` (SH-2 @5347-5368) | line 4923+ (covers severe AS+age>=65; no asymptomatic-specific check, no Vmax/MG/AVA severity gradin |
| GAP-SH-002 | 446 | PARTIAL_DETECTION | `gap-sh-2-tavr-eval` (SH-2 @5347-5368) | (broad TAVR rule) \| auto-verify: preserved-from-addendum |
| GAP-SH-003 | 447 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-SH-006 | 448 | PARTIAL_DETECTION | `gap-sh-2-tavr-eval` (SH-2 @5347-5368) | (broad) \| auto-verify: preserved-from-addendum |
| GAP-SH-061 | 472 | PARTIAL_DETECTION | `gap-sh-valve-in-valve` (SH-VALVE-IN-VALVE @10934-10956) | MANUAL OVERRIDE 2026-06-08 (SH audit Batch 2): DET_OK -> PARTIAL per 16.6(i) concept-match / AUDIT-1 |
| GAP-SH-014 | 485 | PARTIAL_DETECTION | `gap-sh-3-mitral-intervention` (SH-3 @5414-5439) | line 4988+ +  line 6059+ \| Multiple registry ids cited: gap-sh-3-mitral-intervention, gap-sh-10-mitr |
| GAP-SH-015 | 486 | PARTIAL_DETECTION | `gap-sh-3-mitral-intervention` (SH-3 @5414-5439) | (broad) \| auto-verify: preserved-from-addendum |
| GAP-SH-018 | 487 | PARTIAL_DETECTION | `gap-sh-10-mitraclip` (SH-10 @6487-6506) | (broad MR + LVEF<50) \| auto-verify: preserved-from-addendum |
| GAP-SH-019 | 488 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-SH-022 | 507 | PARTIAL_DETECTION | `gap-sh-4-tricuspid-assessment` (SH-4 @5448-5474) | MANUAL OVERRIDE 2026-06-08 (SH audit Batch 3): DET_OK -> PARTIAL per 16.6(iii) severity-encoding / A |
| GAP-SH-075 | 517 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-SH-090 | 549 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |
| GAP-SH-091 | 550 | SPEC_ONLY | — | — \| auto-verify: No candidate evaluator block above PARTIAL_MATCH |

---

## 6. Implementation notes

### 6.1 — EXTRA rules detail

See §4.6 for EXTRA rules + architectural patterns.

### 6.2 — BSW ROI pathway implications

No T1 SPEC_ONLY gaps carry literal BSW pathway tags in CK v4.0 spec text. Pathway analysis is in the §11.5 sequencing notes (hand-authored) and the cross-module synthesis document.

### 6.3 — Strategic posture

2026-06-08 re-audit supersedes the 2026-05-04 baseline (9/23/56 -> 0/30/58); the 2026-05-04 baseline is preserved in git history, BUILD_STATE, and the register. SH's detection logic is sparse, and the 2026-05-04 audit over-credited the trustworthiness tier: DET_OK fell 10.2% -> 0.0% once the detection-quality checks were applied (16.6(i) wrong-concept, 16.6(ii) wrong-target, 16.6(iii) missing-severity-gate, 16.5 late-proxy under-detection), while any-coverage moved only 36.4% -> 34.1%. Unlike EP (broadly built, trust-capped pending the single AUDIT-118 RxCUI-expansion fix), SH is genuinely lightly built: 58 of 88 gaps have no implemented rule, and the 8 PARTIAL flips are heterogeneous detection-quality defects with no shared root cause. Posture: SH needs v2.0 build-out of the SPEC_ONLY surface plus per-rule remediation; the cross-module Z95.2/Z95.3 valve-type inversion (AUDIT-123) is the one shared data-coupling class VHD inherits.

---

## 7. Working hypothesis verdict

**For SH:** Light implementation coverage; significant v2.0 Phase 1 build work required.

Coverage data: 30/88 any-coverage (34.1%); 0/88 DET_OK only (0.0%); 30 PARTIAL via broad-rule consolidation or partial-trigger match; 58 SPEC_ONLY.

Rules-per-DET_OK efficiency: 25 registry rules / 0 DET_OK = n/a.

---

## 8. Implications for v2.0

v2.0 Phase 1 (T1 priority) work items for SH:
- **5 T1 SPEC_ONLY** gaps requiring full build (detection + UI + tests)
- **8 T1 PARTIAL** gaps requiring hardening (broad-rule discrimination, missing exclusions, dose-protocol specificity)
- **0 T1 DET_OK** gaps requiring test coverage + UI polish to reach PRODUCTION_GRADE

Cross-module satisfaction (HF Device Therapy → EP CRT/ICD pattern; CAD-027 → PV; etc.) is captured structurally in `ruleBodyCite.evaluatorModule` per AUDIT_METHODOLOGY.md §2.1.C.

---

## 9. Module-specific findings

### Manual classification overrides (10)

Rows where the auto-classifier was wrong and the audit author corrected the classification with explicit reasoning:

- **GAP-SH-008** (T3, PARTIAL_DETECTION, `gap-sh-bicuspid-surveillance` (SH-BICUSPID)): MANUAL OVERRIDE 2026-06-08 (SH audit Batch 1): DET_OK -> PARTIAL per AUDIT_METHODOLOGY.md 16.6(ii) / AUDIT-121. SH-BICUSPID gates dxCodes.startsWith(Q23.1) (congenital aortic insufficiency) for "bicuspid aortic valve", but bicuspid is Q23.81; the rule misses true bicuspid patients and false-fires on congenital AI. Partial overlap -> PARTIAL not SPEC_ONLY. Evaluator retained; PARTIAL until AUDIT-121 remediated (Q23.1 -> Q23.81).
- **GAP-SH-061** (T1, PARTIAL_DETECTION, `gap-sh-valve-in-valve` (SH-VALVE-IN-VALVE)): MANUAL OVERRIDE 2026-06-08 (SH audit Batch 2): DET_OK -> PARTIAL per 16.6(i) concept-match / AUDIT-123. SH-VALVE-IN-VALVE gates on Z95.2 treated as bioprosthetic, but per NLM Z95.2 = prosthetic/mechanical and Z95.3 = xenogenic/bioprosthetic (inverted codebase-wide), so the ViV rule misses real bioprosthetic (Z95.3) and false-fires on mechanical. Data-coupled defect flips to PARTIAL per the AUDIT-118 precedent. Evaluator retained; PARTIAL until AUDIT-123 remediated (correct Z95.2/Z95.3 semantics).
- **GAP-SH-013** (T2, PARTIAL_DETECTION, `gap-sh-13-paravalvular-leak` (SH-13)): MANUAL OVERRIDE 2026-06-08 (SH audit Batch 2): DET_OK -> PARTIAL per 16.6(ii) / AUDIT-122. SH-13 matches I35.1 OR I34.0 as "new regurgitation", but the gap is aortic-prosthesis PVL-specific: I35.1 (aortic insufficiency) is correct while I34.0 (mitral insufficiency) over-fires on unrelated post-prosthetic mitral regurg with no PVL. Partial overlap -> PARTIAL. Evaluator retained; PARTIAL until AUDIT-122 remediated (drop I34.0, keep I35.1).
- **GAP-SH-011** (T3, PARTIAL_DETECTION, `gap-sh-6-post-tavr-followup` (SH-6)): MANUAL OVERRIDE 2026-06-08 (SH audit Batch 2): DET_OK -> PARTIAL per 16.6(i) concept-match / AUDIT-123. SH-6 post-TAVR surveillance rests on the same inverted Z95.2/Z95.3 valve-type semantics (Z95.2 mechanical mislabeled bioprosthetic), so it misses real bioprosthetic (Z95.3) and false-fires on mechanical. Data-coupled defect -> PARTIAL per the AUDIT-118 precedent. Evaluator retained; PARTIAL until AUDIT-123 remediated.
- **GAP-SH-064** (T2, PARTIAL_DETECTION, `gap-sh-11-tmvr` (SH-11)): MANUAL OVERRIDE 2026-06-08 (SH audit Batch 3): DET_OK -> PARTIAL per 16.6(iii) severity-encoding / AUDIT-125. SH-11 (TMVR) gates I34.0 + age>80 with no echo-severity threshold (EROA / regurgitant volume), but the gap targets severe MR, so it over-detects sub-threshold (mild) mitral regurg. Severity IS echo-encoded in labValues and the rule ignores it -> PARTIAL. Evaluator retained; PARTIAL until AUDIT-125 remediated (add the lesion-appropriate echo-severity gate).
- **GAP-SH-022** (T1, PARTIAL_DETECTION, `gap-sh-4-tricuspid-assessment` (SH-4)): MANUAL OVERRIDE 2026-06-08 (SH audit Batch 3): DET_OK -> PARTIAL per 16.6(iii) severity-encoding / AUDIT-125. SH-4 gates I36.1 + right-heart symptoms with no TR-severity threshold, but the gap targets severe/torrential TR, so it over-detects sub-threshold lesions; the transcatheter-tricuspid recommendation is also under-anchored. -> PARTIAL. Evaluator retained; PARTIAL until AUDIT-125 remediated (add severity gate + re-anchor).
- **GAP-SH-026** (T2, PARTIAL_DETECTION, `gap-sh-9-pfo-closure` (SH-9)): MANUAL OVERRIDE 2026-06-08 (SH audit Batch 4, STEP-0): DET_OK -> PARTIAL per 16.6(ii) over-detection / AUDIT-127. SH-9 fires on I63.9 + age<60 + Q21.1 with no coded stroke-etiology exclusion; the rule own evidence object names "alternative stroke etiology" as an exclusion but the match logic never checks it, so it over-fires on non-cryptogenic (e.g. AF-cardioembolic) strokes. Partial overlap (true cryptogenic still caught) -> PARTIAL. Evaluator retained; PARTIAL until AUDIT-127 remediated (add the coded etiology exclusion the evidence already names).
- **GAP-SH-027** (T2, PARTIAL_DETECTION, `gap-sh-asd-closure` (SH-ASD)): MANUAL OVERRIDE 2026-06-08 (SH audit Batch 4, STEP-0): DET_OK -> PARTIAL per 16.5 under-detection / AUDIT-128. SH-ASD gates significance on I50.81 (right heart failure), but the gap significance signals are RV size + Qp:Qs + PASP; RV failure is a late proxy, so a significant ASD with RV dilation or PASP elevation but not yet RV failure is missed. Under-detection -> PARTIAL. Evaluator retained; PARTIAL until AUDIT-128 remediated (gate on RV size / Qp:Qs / PASP echo signals).
- **GAP-SH-028** (T2, SPEC_ONLY, no cite): MANUAL OVERRIDE 2026-06-08 (SH audit Batch 5): PARTIAL -> SPEC_ONLY per 16.6(ii) wrong-target / AUDIT-129. SH-7 detects endocarditis PROPHYLAXIS candidates (prosthetic valve Z95.2/3/4 + high-risk procedure Z01.2/Z96), but GAP-SH-028 targets SUSPECTED-IE Duke-criteria diagnostic workup; prevention vs diagnosis share zero true positives (fully disjoint), so PARTIAL would overclaim. Per the 16.6(ii) overlap rule, disjoint -> SPEC_ONLY. registryId dropped (no genuine coverage). Remediation = a suspected-IE detection rule for GAP-SH-028 (AUDIT-129).
- **GAP-SH-104** (T2, SPEC_ONLY, no cite): MANUAL OVERRIDE 2026-06-08 (SH audit Batch 4, STEP-0): DET_OK -> SPEC_ONLY per 16.6(ii) wrong-target / AUDIT-126. SH-15 detects PRE-procedure ASA candidacy (I42.1 obstructive HCM + obstruction symptoms), but GAP-SH-104 targets POST-ASA conduction surveillance; the two are fully disjoint (zero true-positive overlap), so PARTIAL would overclaim. Per the 16.6(ii) overlap rule, disjoint -> SPEC_ONLY. registryId dropped (no genuine coverage); SH-15 correctly serves the sibling GAP-SH-105. Remediation = a post-ASA procedure-history gate for GAP-SH-104 (AUDIT-126).


---

## 10. Cross-references

- `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` §6.3 — spec source
- `backend/src/ingestion/gaps/gapRuleEngine.ts` — code source
- `docs/audit/canonical/SH.crosswalk.json` — canonical crosswalk
- `docs/audit/canonical/SH.spec.json` — canonical spec extract
- `docs/audit/canonical/SH.code.json` — canonical code extract
- `docs/audit/canonical/SH.reconciliation.json` — canonical reconciliation
- `docs/audit/AUDIT_METHODOLOGY.md` — canonical audit methodology contract
- `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` — cross-module synthesis
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` — findings register

---

## 11. Cross-module synthesis (per-module slice)

4 cross-module satisfaction case(s) where SH spec gap is satisfied by an evaluator owned by another module:

| Spec gap | Tier | Class | Owning module | Evaluator block |
|---|---|---|---|---|
| GAP-SH-048 | T2 | PARTIAL_DETECTION | CAD | `CAD-COMPLETE-REVASC` |
| GAP-SH-052 | T2 | PARTIAL_DETECTION | CAD | `CAD-BETA-BLOCKER` |
| GAP-SH-060 | T2 | PARTIAL_DETECTION | EP | `EP-REMOTE-MONITORING` |
| GAP-SH-020 | T2 | PARTIAL_DETECTION | VHD | `VD-4` |

### 11.5 — Sequencing notes

SH SPEC_ONLY implementation scoping (58 of 88 gaps) and the cross-module Z95.2/Z95.3 valve-type remediation (AUDIT-123) are deferred to v2.0 authorship, not decided mid-audit. The audit classifies and files findings; build sequencing and the cross-module data-coupling fix are v2.0 work items.

---

## 12. Lessons learned

(a) Over-detection (16.6) was the dominant SH defect class: severity-encoding 16.6(iii), wrong-concept 16.6(i), and disjoint-target 16.6(ii). (b) DET_OK deflated 10.2% -> 0.0% under rigorous over-detection review; this is expected, not an error. (c) The Z95.2/Z95.3 inversion (AUDIT-123) is a cross-module data-coupling class that VHD inherits. (d) The disjoint-target -> SPEC_ONLY rule (16.6(ii)) drove SH-104 and SH-028. (e) VHD carries 16 / 16.5 / 16.6 forward and absorbs the AUDIT-121 VD orphans plus AUDIT-123 / AUDIT-124 (VD-1).

---

## 13. Wall-clock empirical entry

Audit method: `rule-body-citation-AUDIT-030D`. Audit date: 2026-06-08.

Per-module wall-clock data lives in `docs/audit/canonical/audit_runs.jsonl` (append-only). Aggregate empirical floor table maintained in AUDIT_METHODOLOGY.md §7.2.

---

## 14. Audit verdict

**SH module: NEAR-EMPTY.**

- 0 DET_OK (0.0%), 30 PARTIAL (34.1%), 58 SPEC_ONLY (65.9%)
- 0/13 T1 priority gaps DET_OK; 5 T1 SPEC_ONLY gaps require v2.0 Phase 1 work
- Audit method: `rule-body-citation-AUDIT-030D`. Generated from canonical crosswalk on 2026-06-08.

---

## 15. Methodology citation appendix

Audit methodology per `docs/audit/AUDIT_METHODOLOGY.md` v1.0. Specifically:
- §2 data model (spec/code/crosswalk artifact triplet)
- §3 classification taxonomy (PRODUCTION_GRADE / DET_OK / PARTIAL_DETECTION / SPEC_ONLY) with §3.2 decision rules + §3.2.1 broad-rule consolidation handling
- §4 citation requirements (AUDIT-030)
- §5 evaluator inventory completeness (AUDIT-030.D, 5 comment patterns)
- §6 SAFETY-tag classification rules + Tier S triage queue inclusion
- §11 addendum markdown template (this document's structure)

This addendum is a **generated artifact** rendered from canonical inputs by `backend/scripts/auditCanonical/renderAddendum.ts`. Hand-editing this markdown is rejected by CI; edit `SH.crosswalk.json` (hand-authored fields: `strategicPosture`, `sequencingNotes`, `lessonsLearned`) and re-render.

*Generated from `docs/audit/canonical/SH.crosswalk.json`.*
