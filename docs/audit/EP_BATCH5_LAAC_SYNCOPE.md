# EP Audit - Batch 5: LAAC + Syncope (final classification batch) + module-close numbers

**Date:** 2026-06-08. **Scope:** LAAC (5) + Syncope (6) = 11 EP gaps (authoritative canonical
spec+crosswalk; no subagent). Reaches 89/89. **Frozen denominator:** CK v4.0. PROPOSED for operator review.

---

## 1. Batch-5 §16 + §1 + §16.5

**§16 external verification (NLM ICD-10-CM, 2026-06-08):** the LAAC OAC-contraindication codes -
**D68.3** (-> D68.311/312/318/32, "hemorrhagic disorder due to circulating anticoagulants") **OK**,
**K92.2** ("GI hemorrhage, unspecified") **OK**, **I61** ("nontraumatic intracerebral hemorrhage") **OK**
(I60/I62 siblings) - are correctly OAC-relevant. **BUT `Z88` ("Allergy status", any drug class - Z88.0
penicillin, Z88.1 antibiotics, Z88.4 anesthetic, Z88.5 narcotic, ...) is OVER-BROAD** for an
OAC-contraindication gate -> **new defect AUDIT-120** (see register). Syncope codes (R55 + QTc/QRS) were
verified in Batches 3/4.

**DET_OK gaps - direct §1 read:**
| DET_OK gap | Evaluator | Match (file:line) | Med-presence? | Result |
|---|---|---|---|---|
| GAP-EP-011 (LAAC) | EP-LAAC | `hasAF && age>=65 && hasOACContraindication(Z88\|D68.3\|K92.2\|I60-62)` `:4299` | NO (dx+age) | **PARTIAL (flip)** - driver **AUDIT-120** (Z88 over-broad over-detection), NOT §16.5 |
| GAP-EP-093 (Syncope) | EP-SYNCOPE | `hasSyncope(R55) && ECG labs(qtc/qrs)` `:4501` | NO (dx+lab) | **DET_OK hold** |

**Batch-5 net flips: 1** (GAP-EP-011, AUDIT-120). GAP-EP-093 holds DET_OK.
**Batch-5 distribution:** DET_OK 1 (093) / PARTIAL 3 (011, 012, 094) / SPEC_ONLY 7 (067, 068, 069, 095,
096, 097, 098) = 11.

---

## 2. Consolidated module numbers (all 5 batches; 89/89)

### Final distribution vs 2026-05-04 addendum baseline
| Class | Baseline (2026-05-04) | Revised (2026-06-08 audit) | Delta |
|---|---:|---:|---:|
| DET_OK | 21 (23.6%) | **8 (9.0%)** | -13 |
| PARTIAL_DETECTION | 26 (29.2%) | **39 (43.8%)** | +13 |
| SPEC_ONLY | 42 (47.2%) | 42 (47.2%) | 0 |
| **Total** | **89** | **89** | reconciles |

- **Any-coverage (DET_OK + PARTIAL): 47/89 = 52.8% - UNCHANGED** (every flip is DET_OK -> PARTIAL, within
  the any-coverage bucket).
- **Trustworthy-detection (DET_OK) rate collapses 23.6% -> 9.0%:** 13 of the 21 DET_OK classifications were
  over-credited. This is the load-bearing audit result - the EP module's *highest-confidence* coverage is
  ~9%, not the ~24% the addendum reported; the gap is the medication-match architecture (AUDIT-118), the
  dabigatran code (AUDIT-117), and the Z88 over-broad gate (AUDIT-120).

### The 8 surviving DET_OK gaps (verified clean, not medication-presence-under-detection)
GAP-EP-015 (ablation, dx+age), GAP-EP-018 (subclinical-AF, device+dx), GAP-EP-023 (Brugada, dx+demographics),
GAP-EP-025 (acquired-LQT, QTc lab), GAP-EP-037 (CSP, HF+LVEF+device), GAP-EP-050 (inappropriate-shocks,
device+dx), GAP-EP-089 (inappropriate-shocks/AF, device+dx), GAP-EP-093 (syncope, dx+lab).

### The 13 DET_OK -> PARTIAL flips with drivers
| Batch | Gap | Driver |
|---|---|---|
| 1 | GAP-EP-001 (OAC) | AUDIT-117 (dabigatran SCD) + AUDIT-118 |
| 1 | GAP-EP-006 (dabigatran renal SAFETY) | AUDIT-117 + AUDIT-118 |
| 1 | GAP-EP-007 (DOAC+mech valve) | AUDIT-118 |
| 1 | GAP-EP-043 (amiodarone TSH) | §16.5 / AUDIT-118 |
| 1 | GAP-EP-044 (amiodarone LFT) | §16.5 / AUDIT-118 |
| 1 | GAP-EP-046 (dronedarone SAFETY) | §16.5 / AUDIT-118 |
| 1 | GAP-EP-048 (dofetilide REMS) | §16.5 / AUDIT-118 |
| 2 | GAP-EP-013 (early rhythm AAD) | §16.5 / AUDIT-118 |
| 2 | GAP-EP-017 (HFrEF non-DHP-CCB SAFETY) | §16.5 / AUDIT-118 |
| 2 | GAP-EP-070 (PFA AAD) | §16.5 / AUDIT-118 |
| 2 | GAP-EP-079 (WPW AVN-blocker CRITICAL) | §16.5 / AUDIT-118 |
| 3 | GAP-EP-024 (LQTS BB) | §16.5 / AUDIT-118 |
| 5 | GAP-EP-011 (LAAC Z88) | AUDIT-120 (over-detection) |

12 of 13 flips are AUDIT-118/§16.5 (medication-presence under-detection); 1 is AUDIT-120 (over-detection).

### §16 code-correctness summary (all 5 batches)
~40 external verifications (RxNav RxNorm + NLM LOINC + NLM ICD-10). **2 code defects found:** AUDIT-117
(dabigatran SCD, HIGH) and AUDIT-120 (Z88 over-broad, LOW). The donepezil/propranolol-miscode class
(dofetilide 49247 / dronedarone 233698 / procainamide 8700) was re-verified CLEAN; all BB/CCB/digoxin/AAD/
DOAC/warfarin/LOINC codes verified correct.

### Architecture findings (cross-cutting)
- **AUDIT-118** (HIGH) - exact-RxCUI matching, no ingredient expansion -> module-wide under-detection;
  drove 12 flips. Highest-leverage safety fix (one ingredient-normalize closes EP-079/017/006).
- **AUDIT-119** (MEDIUM) - registry/evaluator/gaps.push 48/47/49 mismatch (the AUDIT-035 orphan + the
  no-join-key AUDIT-106 class).

## 3. Module wall-clock aggregate (AUDIT-028 / §7.2 calibration - the first EP empirical point)

**Work-mix assumptions (explicit; §7.1 operator-conversation-timeline, not agent compute):**
- AI-assisted throughout: extraction subagents (Batches 1-3; DROPPED Batches 4-5 after it confabulated in
  2 of 3 batches), parallel WebFetch external verification, direct file reads. Every classification was
  verified directly against the running code (the subagent was a map, never authoritative).
- Wall-clock = elapsed conversation time per batch.

**Classification pass (the §7.2-relevant work), per `audit_runs.jsonl`:**
| Batch | Gaps | AI-assisted min |
|---|---:|---:|
| 1 (safety anticoag + AAD) | 21 | 13 |
| 2 (rhythm + SVT) | 18 | 25 (incl. ~11 min methodology authoring: §16.5 + PATH_TO_ROBUST note) |
| 3 (VT/ICD + channel + arrest) | 22 | 13 |
| 4 (pacing + CIED) | 17 | 12 |
| 5 (LAAC + syncope + close) | 11 | ~9 |
| **Total** | **89** | **~72** (pure classification ~61 ex-Batch-2-methodology) |

- **~72 min AI-assisted for the full 89-gap §16 + §1 + §16.5 classification** (~61 min ex-methodology).
- **Throughput: ~1.2 gaps/min** (~1.5 ex-methodology), i.e. ~0.7-0.8 min/gap, INCLUDING ~40 external
  code verifications.
- **Tracked separately (non-classification):** scoping 5 min; AUDIT-117/118/119 filing 25 min; AUDIT-120
  filing + this consolidation (within Batch 5).
- **Calibration interpretation:** the §7.2 RAW floor for AUDIT-030.D is ~120-150 min/~90-gap module and
  does NOT include §16 code verification. This EP run did AUDIT-030.D + full §16 (40 external lookups) +
  the §16.5 modifier in ~72 min AI-assisted. **This is the FIRST EP empirical AI-assisted data point** for
  the v2.0 multiplier; it should be read as the AI-assisted reference, NOT a replacement for the raw §7.2
  floor (which is measured without AI assistance). A second module (SH or VHD) is needed before computing a
  stable multiplier.

## 4. Provisional caveats carried forward
- Pacing 9 classifications are PROVISIONAL pending the 2024 HRS CPP re-anchor (candidate horizon,
  BUILD_STATE §10) - could change GAP-EP-037.
- The PV/HF/CAD merged medication-based DET_OK are subject to the same §16.5 modifier at v2.0 Module-Parity
  reconciliation (PATH_TO_ROBUST §5 note) - they may overstate coverage the same way EP did.

## 5. PAUSE-C + STOP
EP classification COMPLETE (89/89). **STOP for operator review of the complete EP classification before the
13-section addendum synthesis block.** No source code changed; no canonical crosswalk/addendum edited (the
flips are PROPOSED; the canonical crosswalk regen happens in the synthesis block after operator approval).
Wall-clock in `audit_runs.jsonl` (run `EP-2026-06-08-batch5`).
