# AUDIT-101 - High-Intensity Statin False-Negative: Approach Note (PAUSE A/READ-FIRST)

**Finding:** AUDIT-101 (HIGH / P1, OPEN) - `gap-cad-statin` ingredient-level
`STATIN_CODES` cannot encode high-intensity dose; the gap silently suppresses
for patients NOT on high-intensity therapy. FALSE-NEGATIVE / MISSED-GAP class.

**Branch:** `feat/audit-101-statin-intensity` (off `main` @ 81c7b38).
**Status of this document:** READ-FIRST findings + design surface + §16
verification log. **No rule code has been mutated.** This note ends at the
AUDIT-101 operator gate (distinct from the AUDIT-106 gate).

This is a report-correctness fix on the R0 critical path. The detection-set
fix is a clinical-logic + structural decision and is ALWAYS-OPERATOR-GATED per
CLAUDE.md §19.3(b) (clinical-logic design) and §19.4 (`backend/**` footprint).

---

## 1. The defect (running code, not addendum text - §1 rule-body standard)

**Location:** `backend/src/ingestion/gaps/gapRuleEngine.ts` L4515-L4543, gap id
`gap-cad-statin` (operator label CAD-001), "High-Intensity Statin in CAD".

```
4515  // Gap CAD-STATIN: High-Intensity Statin in CAD
4516  // Guideline: 2018 ACC/AHA Cholesterol Guideline, Class 1, LOE A
4517  // All ASCVD patients should be on high-intensity statin
4518  if (hasCAD) {
4519    const STATIN_CODES = ['83367', '301542', '36567', '42463'];
4520    const onStatin = medCodes.some(c => STATIN_CODES.includes(c));
4521    if (!onStatin) {
...
4526          status: 'High-intensity statin not prescribed in CAD',
4528          medication: 'Atorvastatin 40-80mg or Rosuvastatin 20-40mg',
4530            action: 'Consider high-intensity statin per 2018 ACC/AHA Cholesterol, Class 1, LOE A',
```

**Intent/gate mismatch.** The comment (L4515-L4517), `status` (L4526),
`medication` (L4528), and `action` (L4530) all assert **high-intensity**
(atorvastatin 40-80mg / rosuvastatin 20-40mg). The gate (L4519-L4521) tests
only **ingredient presence at any dose**, and additionally includes two
agents that are never high-intensity.

Two structural defects make "on high-intensity statin" undetectable with this
set (both confirmed by the §16 RxNav resolution in section 4):

- **(a) Non-high-intensity agents in a "high-intensity" set.** simvastatin
  (`36567`) and pravastatin (`42463`) are not high-intensity at any approved
  dose. A CAD patient on either satisfies `onStatin`, so the gap is silently
  suppressed even though the patient is NOT on guideline high-intensity therapy.
- **(b) Ingredient codes structurally cannot encode dose.** An `IN` RxCUI maps
  to the ingredient, not the strength: atorvastatin 10mg and atorvastatin 80mg
  both resolve to `83367`. The set CANNOT distinguish high-intensity
  atorvastatin 40-80mg from sub-threshold 10-20mg. A patient on low-dose
  atorva/rosuva satisfies `onStatin` and suppresses the gap.

**Net false-negative population:** (i) any CAD patient on simvastatin or
pravastatin, and (ii) any CAD patient on sub-high-intensity atorvastatin or
rosuvastatin doses. The actionable signal (missing guideline-directed therapy)
is absent - more serious than the wrong-display class, because the gap is not
even present for the clinician to see.

**Data-plumbing root cause (the structural half).** `evaluateGapRules`
(L3290-L3297) receives `medCodes: string[]` only. That array is built at
`runGapDetectionForPatient.ts:53` and `gapDetectionRunner.ts:100` as
`patient.medications.map(m => m.rxNormCode).filter(Boolean)`. The `Medication`
Prisma model (`schema.prisma` L1861-L1882) DOES carry dose:
`dose String?`, `doseValue Float?`, `doseUnit String?`, plus `genericName`,
`medicationName`, `drugClass`. **These fields are discarded before the rule
sees them.** Dose data exists in the DB; the engine signature throws it away.
Ingestion populates dose on the FHIR paths: `ingestSynthea.ts:313-314`
(`doseValue`/`doseUnit` from `doseQuantity`) and `fhirResourceHandlers.ts:175`
(Redox FHIR `doseQuantity`). **CSV-path dose population is unverified** - a
build-phase verification item (section 5).

**Sibling note (NOT this fix's scope).** The identical four-code set is
duplicated across `gap-cad-statin` (L4519), the ezetimibe gate (L4689), the PAD
high-intensity gate (L4867), the PCSK9 gate (L7351), the omega-3 gate (L7480),
plus `STATIN_CODES_CV` (L28) and the `STATIN_CODES_*` variants (L8359 / L9183 /
L9336). Semantics differ per gate: the CAD/PAD high-intensity gates are
dose-sensitive; the others are "on any statin" guards. A naive AUDIT-052 unify
would PRESERVE this false-negative wherever the intent is high-intensity. The
AUDIT-052 helper extraction must wait on this finding's high-intensity decision.

---

## 2. Guideline-grounded high-intensity definition (cited)

**Anchor:** 2018 AHA/ACC/Multisociety Guideline on the Management of Blood
Cholesterol (Grundy et al., Circulation 2019;139:e1082-e1143). Secondary
prevention in clinical ASCVD: high-intensity statin therapy is **COR 1, LOE A**.
This matches the citation already inline in the rule (L4516 / L4535-L4537).

**High-intensity statin = lowers LDL-C by approximately >=50%.** The guideline
high-intensity tier is EXACTLY:

| Agent        | High-intensity doses |
|--------------|----------------------|
| Atorvastatin | 40 mg, 80 mg         |
| Rosuvastatin | 20 mg, 40 mg         |

No other agent/dose is high-intensity. Simvastatin (max approved 40 mg for
chronic use) and pravastatin are moderate- or low-intensity only - which is why
their presence in the current set is defect (a).

**Indication population for this gap:** clinical ASCVD. The runtime rule gates
on `hasCAD` (ICD-10 `I25.*`, L3301). The Clinical Knowledge Base
(`CLINICAL_KNOWLEDGE_BASE_v4.0.md` L588-L591, "6.4 Coronary Artery Disease")
distinguishes **two** T1 gaps in this space:

- **GAP-CAD-001** - "ASCVD: Statin not prescribed ... without **any** statin"
  (dose-agnostic; structured elements: ASCVD dx list, med list).
- **GAP-CAD-002** - "Post-ACS: **High-intensity** statin gap. I21.x within 12 mo
  not on atorva 40-80 or rosuva 20-40" (dose-sensitive; structured elements:
  ACS dx date, **statin type/dose**).

The single runtime rule `gap-cad-statin` carries the operator label CAD-001 but
is CODE-labeled "high-intensity" and gates on "any statin presence" - it
conflates the two KB gaps. **No separate high-intensity post-ACS runtime rule
exists** (grep confirms only the CAD + PAD high-intensity-labeled gates). This
conflation is an open operator decision (section 3, Q1).

---

## 3. Detection approach (how intensity gets encoded; how the rule fires)

The fix must make the gate test **strength**, not ingredient. Two structural
options; the recommendation and the open forks follow.

### Approach A (RECOMMENDED): agent + dose-threshold, using ingested dose fields

Thread per-medication dose into the engine and define high-intensity by the
guideline dose thresholds, identifying the agent by ingredient:

```
onHighIntensityStatin =
  (agent is atorvastatin AND doseValue >= 40 [mg])
  OR (agent is rosuvastatin AND doseValue >= 20 [mg])
```

- **Why recommended.** It is the actual guideline definition (dose thresholds),
  it reuses `doseValue`/`doseUnit` already captured at ingestion, and it is
  robust to the RxNorm representation level. It does NOT require enumerating
  every dose-bearing RxCUI (see Approach B brittleness).
- **Agent identification.** `rxNormCode` alone is insufficient in BOTH
  directions: an `IN` code gives no dose; an `SCD`/`SBD` code requires
  enumeration. The robust agent signal is the ingredient identity, resolvable
  from `genericName`/`medicationName` (or an ingredient-RxCUI check that treats
  `83367`/`301542` as the atorva/rosuva ingredients). The dose comes from
  `doseValue` + `doseUnit` regardless of code level.
- **Cost.** Signature change to `evaluateGapRules` (pass a richer med structure
  `{rxNormCode, doseValue, doseUnit, genericName, medicationName}[]` alongside
  or instead of `medCodes`), and updates at the two call sites
  (`runGapDetectionForPatient.ts:53`, `gapDetectionRunner.ts:100`). Blast radius
  is contained to the engine + 2 callers; all other gates can keep using a
  derived `medCodes` for backward compatibility.
- **Dependency.** Relies on `doseValue` being populated. Verified on FHIR paths;
  CSV path is a build-phase verification item (section 5). Where dose is absent,
  define the documented fallback (Q3).

### Approach B (ALTERNATIVE): curated high-intensity SCD/SBD code set

Replace `STATIN_CODES` with a curated set of dose-level RxCUIs (the four SCDs
verified in section 4, plus their SBD/brand/pack variants).

- **Brittleness (why not preferred).** SCD is one representation per dose; the
  real world also has SBD (brand, e.g. Lipitor), BPCK/GPCK pack codes,
  combination products (e.g. atorvastatin/amlodipine, atorvastatin/ezetimibe),
  and non-tablet forms. A curated set must enumerate and maintain ALL of them or
  it reintroduces false-negatives by omission. It also fails entirely if the
  source stores ingredient-level codes (then nothing matches). This is the
  inverse failure mode of the current bug.
- It avoids a signature change, which is its only real advantage.

### Open operator decisions (the genuine forks - ALWAYS-STOP per §19.3 (b),(d),(f))

- **Q1 (clinical scope).** Is `gap-cad-statin` the **high-intensity** gap
  (GAP-CAD-002) or the **any-statin** gap (GAP-CAD-001)? The KB defines both as
  distinct T1 gaps; the runtime conflates them and no any-statin rule exists.
  Options: (i) make this the high-intensity gap and ADD a separate any-statin
  gap; (ii) keep one gap, high-intensity only (accepts that "ASCVD on a
  moderate statin" is the intended fire); (iii) keep one gap, any-statin only
  (re-label away from "high-intensity" - contradicts the cited COR 1 LOE A
  high-intensity intent). **Recommendation: (i)** - it matches the KB and the
  guideline (any-statin and high-intensity are clinically distinct gaps), but
  this is an operator clinical decision.
- **Q2 (structure).** Approach A (dose-threshold; recommended) vs Approach B
  (curated SCD set). **Recommendation: A.**
- **Q3 (dose-missing fallback).** When `doseValue` is absent (e.g. CSV path if
  unpopulated, or free-text meds), should the gate (a) treat agent-present as
  high-intensity-unknown and NOT fire (conservative, preserves a residual
  false-negative), or (b) fire (surfaces for review, risk of false-positive on a
  patient actually on high-intensity)? **Recommendation: document explicitly and
  default to NOT-fire when agent is present but dose unknown**, with the
  limitation logged - but this is a clinical-safety tradeoff for the operator.
- **Q4 (PAD sibling).** `gap-pv-1-pad-statin` (L4861-L4889) has the identical
  defect and the identical "high-intensity" label (2024 ACC/AHA PAD Guideline,
  COR 1 LOE A). In scope for THIS PR (same fix, same approach) or a follow-up?
  **Recommendation: include it** - same approach, atomic correctness, avoids a
  known-broken sibling - but this is a scope decision (§19.3(d)).

---

## 4. Section 16 verification log (RxNav properties.json - external source)

Codebase trust is INSUFFICIENT per AUDIT_METHODOLOGY.md §16. Every code below
was resolved live against RxNav (`rxnav.nlm.nih.gov/REST`) on 2026-06-04. Chain:
code -> external-source confirmation -> in-rule use.

### 4.1 Existing set members (the four AUDIT-101 flags) - CONFIRMED ingredient-level

| RxCUI  | RxNav name      | TTY | High-intensity? | Verdict for the set |
|--------|-----------------|-----|-----------------|---------------------|
| 83367  | atorvastatin    | IN  | dose-dependent  | ingredient only - cannot encode dose (defect b) |
| 301542 | rosuvastatin    | IN  | dose-dependent  | ingredient only - cannot encode dose (defect b) |
| 36567  | simvastatin     | IN  | **NEVER**       | **WRONG for a high-intensity set** (defect a) |
| 42463  | pravastatin     | IN  | **NEVER**       | **WRONG for a high-intensity set** (defect a) |

All four are TTY=`IN`. This corroborates the register's §16 resolution exactly
and confirms both structural defects from running code. simvastatin and
pravastatin must be REMOVED from any high-intensity gate.

### 4.2 High-intensity dose-bearing codes (for Approach B, or as test fixtures) - VERIFIED

Name-lookup (`/rxcui.json?name=...&search=1`) then round-trip
(`/rxcui/{id}/properties.json`) to confirm name + TTY:

| Agent + dose            | RxCUI  | RxNav name (verbatim)                    | TTY | High-intensity |
|-------------------------|--------|------------------------------------------|-----|----------------|
| atorvastatin 40 mg      | 617311 | atorvastatin 40 MG Oral Tablet           | SCD | YES            |
| atorvastatin 80 mg      | 259255 | atorvastatin 80 MG Oral Tablet           | SCD | YES            |
| rosuvastatin 20 mg      | 859751 | rosuvastatin calcium 20 MG Oral Tablet   | SCD | YES            |
| rosuvastatin 40 mg      | 859419 | rosuvastatin calcium 40 MG Oral Tablet   | SCD | YES            |

All four round-trip to TTY=`SCD` with the expected strength. **Caveat (drives
the Approach-A recommendation):** these are the Oral-Tablet SCD representations
ONLY. Brand SBDs, pack codes, and combination/other-form products are NOT
enumerated here - which is exactly why a curated SCD set (Approach B) is brittle
and a dose-threshold gate (Approach A) is preferred.

### 4.3 Codes the codebase uses that external verification contradicts

- **simvastatin `36567` and pravastatin `42463`** in a set labeled
  "high-intensity": external verification (RxNav IN + the 2018 guideline tier)
  contradicts their inclusion. Consistent with the Phase 0B 15-33% wrong-code
  empirical rate (here: a wrong-tier inclusion, not a wrong-drug RxCUI). They
  are valid statin ingredients but invalid for THIS gate's stated semantics.
- No transcription-typo wrong-drug RxCUIs were found in this set (unlike
  AUDIT-102's `1657974`/`1659149`/`1546275`). The four members resolve to the
  named statins; the defect is tier + granularity, not identity.

---

## 5. True-positive / true-negative / exclusion cases the fix must satisfy

Assuming the recommended high-intensity scope (Q1 option i / Q2 Approach A):

**Must FIRE (true positives - currently silently suppressed):**
- TP1: CAD (`I25.*`), on **simvastatin** (any dose), no high-intensity statin.
- TP2: CAD, on **pravastatin** (any dose).
- TP3: CAD, on **atorvastatin 10 mg or 20 mg** (sub-threshold).
- TP4: CAD, on **rosuvastatin 5 mg or 10 mg** (sub-threshold).
- TP5: CAD, on **no statin at all** (the only case the current rule catches).

**Must NOT fire (true negatives):**
- TN1: CAD, on **atorvastatin 40 mg or 80 mg**.
- TN2: CAD, on **rosuvastatin 20 mg or 40 mg**.
- TN3: Patient WITHOUT CAD (`hasCAD` false) - gate never entered.

**Exclusions (must suppress even when otherwise a true positive) - preserve
existing + the rule's evidence.exclusions (L4538):**
- EX1: Documented statin intolerance (and the broader intolerance/allergy
  signal; current code checks only `EXCLUSION_HOSPICE` at L4522 - the
  `evidence.exclusions` list names statin intolerance + active liver disease but
  the gate does NOT yet enforce them; whether to wire those in is a scope
  decision, flag under Q4-adjacent scope).
- EX2: Active liver disease.
- EX3: Hospice / palliative care (`Z51.5`) - already enforced (L4522).

**Edge / fallback (Q3):**
- ED1: CAD, on atorvastatin with **dose unknown** (no `doseValue`) - behavior
  per the Q3 operator decision (recommended: do NOT fire, log limitation).
- ED2: Dose unit not mg (e.g. mislabeled) - normalize or treat as unknown (Q3).

**Test strategy (no new harness):** existing Jest rule-test pattern only
(`backend/tests/gapRules/coronaryIntervention.test.ts`,
`backend/tests/terminology/clinicalCodeCorrections.test.ts`). Per the work
block: NO synthetic fixtures / golden cohorts - that harness does not exist yet
and the golden cohort is seeded later when it lands. Each TP/TN/EX case above
becomes a unit assertion against `evaluateGapRules`.

---

## 6. Build-phase verification items (carried into PAUSE B, not blockers to approval)

1. Confirm CSV-path medication ingestion populates `doseValue`/`doseUnit`
   (FHIR paths confirmed; CSV unverified). If not, Q3 fallback governs CSV.
2. Confirm whether Synthea/Redox store `rxNormCode` at ingredient vs SCD level
   in practice (affects agent-identification implementation in Approach A).
3. If Q1 option (i): scope the new any-statin gap (GAP-CAD-001) - its own rule
   block + tests, or a follow-up finding-PR.
4. Re-run RxNav verification at fix time per §16 if any new code is introduced.

---

## 7. STOP - AUDIT-101 operator gate (PAUSE A record; RESOLVED at section 8)

Per CLAUDE.md §19.3, this was an ALWAYS-STOP point: clinical-logic design (Q1,
Q3), a `backend/**` footprint (§19.4), and genuine forks (Q1-Q4). At the time of
this section no rule code had been mutated. The operator decisions on Q1-Q4 are
now LOCKED and recorded in section 8, which also captures the as-built fix and
the section 6 build-phase verification outcomes. This gate is distinct from and
does not touch the pending AUDIT-106 gate.

---

## 8. Operator decisions (LOCKED) + as-built fix + build-phase verification outcomes

PAUSE B authored against these operator-locked decisions. The fix is dose-aware,
adds NO new `gaps.push` node (runtime gap count unchanged), and keeps every
sibling gate's existing semantics untouched.

### 8.1 Q1-Q4 LOCKED decisions

- **Q1 (clinical scope) - ONE high-intensity gap; do NOT split.** `gap-cad-statin`
  is the HIGH-INTENSITY gap. Its gate now detects "on high-intensity or not"
  (dose-aware, correct agent set), firing for everyone NOT on high-intensity. NO
  new `gaps.push` node is added. The separate any-statin gap (KB GAP-CAD-001,
  "ASCVD without ANY statin") is a TRACKED FOLLOW-ON, to be built with a STABLE
  ID only AFTER the AUDIT-106 gap-id assignment scheme lands. That coordination
  dependency is recorded here and in the register; building it now would mint an
  id the AUDIT-106 scheme would have to renumber.
- **Q2 (structure) - Approach A (agent + doseValue threshold).** `doseValue` /
  `doseUnit` are threaded through `evaluateGapRules` as SHARED infrastructure
  (`meds: MedicationDose[]`), and the two call sites
  (`runGapDetectionForPatient.ts`, `gapDetectionRunner.ts`) stop discarding dose.
  Detection is by ingredient identity + mg threshold, not a curated SCD set.
- **Q3 (dose-missing fallback) - REFRAMED to QUALIFIED fire.** When a
  high-intensity-eligible agent (atorvastatin / rosuvastatin) is present but no
  usable mg dose is documented, the EXISTING gap node fires with a QUALIFIED
  status ("Statin present; high-intensity dosing not documented ... confirm or
  intensify") - the structured-data / fail-loud pattern (sibling to the L-code
  data-quality handling). This is NEITHER silent-suppress (the prior bug) NOR a
  definite therapy-gap assertion. No new node; same `gaps.push`.
- **Q4 (PAD sibling) - INCLUDED.** `gap-pv-1-pad-statin` carries the identical
  defect and is fixed with the same shared helper in the same PR. The
  high-intensity indication is §16-cited directly to the 2024 ACC/AHA/Multisociety
  Lower Extremity PAD Guideline (Gornik et al., Circulation 2024), COR 1, LOE A,
  which adopts the 2018 Cholesterol high-intensity tier (atorvastatin 40-80mg /
  rosuvastatin 20-40mg).

### 8.2 As-built

- **Shared helper** (`gapRuleEngine.ts`): `highIntensityStatinStatus(meds)` returns
  `on_high_intensity` (atorvastatin >=40mg / rosuvastatin >=20mg with a usable mg
  dose), `agent_dose_unknown` (eligible agent present, dose not usable -> Q3
  qualified fire), or `not_high_intensity` (no statin, a non-high-intensity agent
  such as simvastatin / pravastatin, or a documented sub-threshold dose).
  `highIntensityStatinAgent` resolves the agent from the ingredient RxCUI
  (`83367` / `301542`) OR from `genericName` / `medicationName` text, so detection
  survives whichever RxNorm level (IN vs SCD / SBD) was ingested.
- **Gates rewired:** `gap-cad-statin` (CAD, 2018 ACC/AHA Cholesterol) and
  `gap-pv-1-pad-statin` (PAD, 2024 ACC/AHA PAD) both gate on
  `highIntensityStatinStatus(meds) !== 'on_high_intensity'`. Definite-fire status,
  evidence object (COR 1 / LOE A), and the hospice exclusion are preserved; the
  qualified-fire branch is additive within the same node.
- **`gaps.push` count unchanged** (no new node; the 263 runtime registry is not
  touched). Sibling `STATIN_CODES` gates (ezetimibe / PCSK9 / omega-3 ladder +
  the `STATIN_CODES_*` variants) keep their "on any statin" `medCodes` semantics;
  the AUDIT-052 helper unify still waits on this high-intensity decision.

### 8.3 Section 6 build-phase verification outcomes

1. **CSV-path dose population (item 1) - CONFIRMED ABSENT, handled by Q3.** Only
   `src/scripts/ingestSynthea.ts` populates `doseValue` / `doseUnit`; the CSV
   pipe-delimited `medications` column (`csvSchema.ts`) carries no dose. A
   CSV-ingested CAD/PAD statin patient therefore resolves to `agent_dose_unknown`
   -> QUALIFIED fire (fail-loud), never silent-suppress. CSV dose population is a
   separate AUDIT-070-adjacent ingestion enhancement, NOT a blocker to this fix.
2. **rxNormCode ingredient-vs-SCD level (item 2) - HANDLED.** Detection is robust
   to both ingredient-level (IN `83367` / `301542`) and dose-level (SCD / SBD)
   codes via the `genericName` / `medicationName` name-fallback in
   `highIntensityStatinAgent`; covered by the "agent identity is robust to RxNorm
   representation level" tests.
3. **Any-statin gap (item 3) - DEFERRED per Q1** to the AUDIT-106-dependent
   follow-on (above).
4. **§16 re-verification (item 4) - DONE 2026-06-04** (section 4 log; no new code
   constants beyond the verified `83367` / `301542` ingredients).

### 8.4 Tests (jest only; no synthetic fixtures / golden cohorts)

`backend/tests/gapRules/audit101StatinIntensity.test.ts` - 22 assertions:
5 TP (simvastatin / pravastatin / sub-threshold atorva / sub-threshold rosuva /
no-statin all FIRE), 3 TN (atorva 40-80 / rosuva 20-40 / no-CAD-no-PAD), 3
exclusion (hospice on CAD-no-statin, CAD-simvastatin, PAD-no-statin), 2 edge
(dose-null and non-mg-unit -> qualified), the dose-unknown QUALIFIED-fire case,
the explicit simvastatin / pravastatin / low-dose-atorva no-longer-suppresses
regression, the PAD Q4 sibling, and RxNorm-level robustness. The existing
`audit100EvidenceConsistency` definite-fire path and the lipid-ladder
`clinicalCodeCorrections` suites are preserved (all green).
