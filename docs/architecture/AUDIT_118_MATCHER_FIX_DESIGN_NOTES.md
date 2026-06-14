# AUDIT-118 Matcher Fix - Design Note (ingredient-normalize-by-expansion)

**Author:** Jonathan Hart
**Date:** 2026-06-14
**Status:** DESIGN for operator review (the one design-review step before the build). Authored against the v3.0 Work-Block 1 scoping pass (read-only, main HEAD `b01c176`).
**Work item:** PATH_TO_ROBUST v3.0 Track A.0 (the matcher fix; FIRST on the clinical critical path).
**Companions:** `docs/audit/AUDIT_FINDINGS_REGISTER.md` (AUDIT-118 CONFIRMED HIGH P1, AUDIT-117, AUDIT-101, AUDIT-052), `docs/audit/AUDIT_METHODOLOGY.md` (§16 clinical-code verification), `docs/architecture/AUDIT_101_STATIN_INTENSITY_NOTES.md` (the orthogonal dose resolver), `backend/src/terminology/cardiovascularValuesets.ts` (the IN-level value sets).

This note resolves three design decisions (the IN-map asset + verification, the expansion-function durability, the value-set edits) with the operator-leans, surfaces the trade-offs, and states the test plan, rollback, the bound cascade-flip sub-task, and the build sequence. **It does NOT write the fix code.**

---

## 0. The defect (one paragraph, from Step 2.5 CONFIRMED)

Medication matching is exact-string RxCUI membership with no ingredient<->descendant normalization. Patient meds are stored at source/product granularity (`ingestSynthea.ts:309` stores the FHIR `coding.code` verbatim; Synthea emits SCD/clinical-drug RxCUIs), while the rule value sets are ingredient-level (TTY=IN, built from `cardiovascularValuesets.ts`). So an SCD-coded patient med silently fails to match its IN-level value set across ~128 medication-dependent gaps (HF 32% / EP 35% / CAD 33%), including the confirmed safety instances GAP-EP-079 (CRITICAL fatal-VF), GAP-EP-017 (Class-3 non-DHP-CCB in HFrEF), GAP-EP-006 (Class-3 dabigatran-renal, via AUDIT-117).

---

## 1. The fix shape - expand, not replace

`medCodes` becomes the per-med UNION `[rawCode, ingredientOf(rawCode)]` at the two runner construction points:
- `backend/src/ingestion/runGapDetectionForPatient.ts:53`
- `backend/src/ingestion/gapDetectionRunner.ts:100`

**Why expansion, not replacement.** There are two match-site shapes that pull in opposite directions:
- 68 `medCodes.some(c => SET.includes(c))` sites match against IN-level value sets -> need the INGREDIENT present in `medCodes`.
- 35 `medCodes.includes('<literal>')` sites match against specific literal codes -> need the RAW code present in `medCodes`.

Rolling raw -> IN (replacement) would fix the first and BREAK the second (a literal-SCD site would no longer find its SCD). Expansion (keep raw, ADD ingredient) serves both with zero value-set churn: the IN entry satisfies the set-membership sites, the raw entry satisfies the literal sites. Expansion is additive, so it never removes a currently-passing match (no regression by construction).

**Single-point viability - CONFIRMED.** `evaluateGapRules(dxCodes, labValues, medCodes: string[], age, gender, race, meds=[])` (`gapRuleEngine.ts:3380`) takes one flat `medCodes` array used by every dose-agnostic gate. There are exactly TWO callers - the two runners above (verified: no third path). There is exactly ONE `.rxNormCode` re-derivation inside the engine (`gapRuleEngine.ts:91`, the statin dose resolver), which is orthogonal (strength, not presence) and KEPT (Section 4). So normalizing at the two construction points covers all 104 sites; nothing downstream re-derives codes.

**No false-positive risk.** Adding a patient's true ingredient is a true-positive enablement, not a fabrication: the IN we add is the ingredient the patient is genuinely on. Expansion cannot make a rule fire for a drug the patient is not taking.

---

## 2. The IN-map asset + verification (DESIGN DECISION 1)

**Decision (operator lean ADOPTED):** generate the map offline, §16-verify the FULL map at generation time, commit it as a static asset, and add a CI coverage-guard test.

- **(a) Generation.** An offline generator tool, a sibling of the `auditCanonical` pipeline (under `backend/scripts/` or `backend/src/terminology/tools/`), walks RxNav `relatedByType` (IN -> SCD/SBD/SCDC/BPCK descendants) over the **bounded ingredient universe**: the union of IN codes across the 69 canonical + 48 inline value sets (~40-50 ingredients). It emits a reverse map `descendant RxCUI -> ingredient IN`. The generator is run by the operator, not in the gap path.
- **(b) Verification (§16 discipline).** Because the universe is bounded (hundreds to low-thousands of entries) and the source is authoritative (RxNav `relatedByType`), the **FULL generated map is verified at generation time**, not spot-checked: the generator records, per ingredient, the RxNav query and the returned descendant set, and writes a provenance sidecar (the query URL + retrieval date + count per ingredient) so the asset is fully auditable. A determinism check is part of generation: re-running the generator against the same RxNav snapshot must produce a byte-identical map (sorted keys, stable formatting) - this is the §16 "authoritative external source, not codebase trust" standard applied to a generated asset. Any descendant whose `relatedByType` IN cannot be resolved is logged loudly, never silently dropped.
- **(c) Currency (the static-asset regeneration story).** The asset is static, so currency is enforced two ways: (1) a documented regen command in the asset header (the exact generator invocation), and (2) a **CI coverage-guard test** that fails if any IN code present in the live value sets (the 69 canonical + 48 inline, read programmatically) is NOT a value in the committed map - i.e. adding a new value set without regenerating the map fails CI. This makes the asset's staleness a hard, visible gate rather than a silent drift (the catch-#89 class: a static artifact going stale against live source). The guard checks coverage of ingredients, not exhaustiveness of descendants (RxNorm grows; the guard ensures every rule-targeted ingredient is mapped, which is the correctness-relevant invariant).
- **(d) Location + load.** A static JSON or TS asset under `backend/src/terminology/` next to `cardiovascularValuesets.ts` (e.g. `rxnormIngredientMap.ts` + a provenance sidecar). Loaded once at engine init (module import). **Deterministic at runtime: a static in-memory lookup, no network in the gap path** (the CDS-exemption deterministic-logic rule - the gap engine must never make a live call).

**Trade-off surfaced.** Full-verify-at-gen-time is more upfront work than spot-checking, but the universe is bounded and the alternative (trusting an unverified generated map) reimports the exact codebase-trust failure mode §16 exists to prevent. The coverage-guard adds a CI test but converts asset-staleness from a silent clinical-miss into a loud build failure - worth it for a clinical asset. **Residual risk to record:** the map covers the descendants RxNav knows at generation time; a brand-new formulation coded after the last regen would not roll up until the next regen. The coverage-guard does NOT catch this (it checks ingredient coverage, not descendant completeness). Mitigation: the regen is cheap and documented; note in the asset that descendant completeness is regen-bound. At DUA, a periodic regen cadence is the operational answer (recorded as a deferred operational item, not a blocker now).

---

## 3. The expansion function + durability (DESIGN DECISION 2)

**Decision (operator lean ADOPTED):** a named canonical function + a canonical-path guard.

- **Where it lives:** `backend/src/terminology/` alongside the IN-map (e.g. `expandToIngredients.ts`), importing the map. NOT inline at the two runner sites (inline would let a third runner reintroduce the bug - which is exactly how AUDIT-118 arose: two runners independently built raw `medCodes`).
- **Signature:** `expandToIngredients(rawCodes: string[]): string[]` - returns the de-duplicated union of each raw code plus its ingredient IN (raw codes with no map entry pass through unchanged, so an already-IN code or an unmapped code is preserved, never dropped). Pure, deterministic, no I/O.
- **Durability mechanism.** The function is THE canonical medCodes-construction path; both runners call `expandToIngredients(patient.medications.map(m => m.rxNormCode).filter(Boolean))`. To prevent a future third runner from re-introducing raw membership: (1) a contract comment at both the function and `evaluateGapRules`'s `medCodes` param stating "medCodes MUST be ingredient-expanded via expandToIngredients(); raw membership silently under-detects product-coded meds (AUDIT-118)"; and (2) a **guard test** that asserts every caller of `evaluateGapRules` passes an expanded array - implementable as a lightweight test that greps the two runner sites for the `expandToIngredients` call, OR (stronger) a runtime dev-assertion in `evaluateGapRules` that a known SCD canary code, if present, co-occurs with its IN (off in production, on in test). Operator decision sub-point: the grep-guard is cheaper and sufficient given only two callers; the runtime canary is stronger but adds engine code. **Lean: the grep-style caller-guard test now; revisit a runtime assertion only if a third runner appears.**

**Trade-off surfaced.** A named function is marginally more indirection than two inline expansions, but it is the only thing that makes the fix durable - the defect's root cause was duplicated inline construction. The guard test is the cheap insurance that the "one path" stays one path.

---

## 4. Value-set edits (DESIGN DECISION 3) - cleanup in the same change

**Decision (operator lean ADOPTED):** simplify the now-redundant SCD literals in the same pass; keep the statin dose resolver.

Because expansion now rolls any dabigatran SCD up to ingredient `1037042`, the 14 literal `1037045` (the 150mg-capsule SCD) sites become **dead-but-contradictory**: they would still match only the 150mg SCD raw entry, not the renal-dose SCD, and the IN `1037042` now carries the real signal. Leaving them is worse than removing them (a reader sees a wrong-granularity literal that "works" only by accident). So in the same change:
- **dabigatran `1037045` -> `1037042` (IN), 14 occurrences.** This IS the AUDIT-117 fix, absorbed. After this, a dabigatran patient at ANY dose matches via the expanded IN.
- **digoxin descendant-enumeration -> IN `3407`, 2 sites** (`gapRuleEngine.ts:4261`, `:4563`): the `197604/197605/197606` formulation literals are subsumed by expansion; simplify to the IN.

**Statin dose resolver - KEPT (orthogonal, NOT subsumed).** `gapRuleEngine.ts:89-100` solves a different problem: high-intensity detection requires DOSE (atorvastatin 10mg and 80mg are both IN `83367`, so ingredient identity cannot distinguish intensity - `gapRuleEngine.ts:51-53`). The IN-map handles PRESENCE; the resolver handles STRENGTH. The fix touches neither the resolver nor the AUDIT-101 dose path.

**Scope discipline (§17.3):** these value-set edits are in-scope for THIS change because they are the direct redundancy the expansion creates - not an opportunistic extra. The broader AUDIT-052 inline-array-to-canonical refactor (the other ~46 inline sets, already IN-level and correct) is NOT pulled in - it is orthogonal and stays its own tracked item.

---

## 5. Test plan (tests are part of the change)

**New SCD-coded fixtures are required** - the existing fixtures (`backend/tests/fixtures/sample-patients.json`) are IN-coded, which is precisely why the under-detection is invisible to the current green suite. The new fixtures live alongside `sample-patients.json` (e.g. `scd-coded-patients.json`) and cover the target drug classes (beta-blocker, non-DHP CCB, DOAC incl. dabigatran dose variants, statin, MRA, SGLT2i) plus the three safety scenarios.

| Class | Test | Definition-of-done |
|---|---|---|
| (a) core fire | an SCD-coded med fires its IN rule (metoprolol-tartrate SCD -> beta-blocker set) | new fixture + assertion: gap fires |
| (b) safety negatives | GAP-EP-079 (WPW+AF on an SCD-coded AVN blocker -> fatal-VF gap), GAP-EP-017 (HFrEF + SCD-coded non-DHP CCB), GAP-EP-006 (SCD-coded dabigatran + eGFR<30) all fire | new SCD variants; each gap fires |
| (c) AUDIT-117 | dabigatran 75mg-SCD + eGFR<30 fires the SAFETY gap (the renal-dose false-negative is closed) | new fixture; SAFETY gap fires |
| (d) no-regression | the full existing engine suite (IN-coded) stays green | run `tests/gapRules/*` + `tests/gaps/*`; expected green by construction (expansion is additive) |

**Green-bar definition-of-done:** all new tests pass; the full backend suite holds its current pass/skip baseline (currently 1334 pass / 1 skip per the AUDIT-156 verification); the IN-map coverage-guard test passes; the caller-guard test passes.

---

## 6. Rollback + observability

- **Rollback.** The change is additive and the asset is inert if unused. Reverting the two construction-point edits (drop the `expandToIngredients` wrapper) restores prior raw-membership behavior exactly; the committed IN-map and `expandToIngredients` function become unreferenced (harmless dead code) until the wrapper is restored. No schema change, no migration, no data mutation - so rollback is a pure code revert with zero state implications. (This is why A.0 is safe to land early on the critical path.)
- **Observability.** The fix's effect IS a gap-fire-rate increase on medication rules. Worth a **before/after gap-count log on a fixture run**: run the engine over the SCD-coded fixture set with expansion off vs on and log the per-module medication-gap delta (the count that was silently zero before). This both proves the fix and quantifies the realized under-detection on synthetic data (a number for the AUDIT-118 record). No production metric is added to the gap path (determinism); the before/after is a test-harness artifact.

---

## 7. The bound cascade-flip sub-task (definition-of-done)

Per v3.0 Track A.0, the fix is NOT DONE until:
1. **Re-run GAP-EP-007 / 043 / 044 / 046 / 048** against the FIXED matcher. All five are currently PARTIAL_DETECTION (flipped DET_OK -> PARTIAL on 2026-06-08 under the §16.5 under-detection cap). With the matcher fixed, the cap no longer applies, so the expected direction is **PARTIAL -> DET_OK (an un-cap / improvement)** - to be confirmed on running fixed-matcher behavior, not assumed. File each reclassification three-surface per §18 (severity-index + detail entry + BUILD_STATE) with evidence (the fixture run showing the rule now detects its SCD-coded target).
2. **PV/HF/CAD medication-presence DET_OK parity set** (the v3.0 plan's forward §16.5 reconciliation gate): re-apply the same un-cap reasoning to those modules' medication-presence DET_OK rules against the fixed matcher. Record the parity outcome.

This is the CLOSING step of the work-block; the matcher fix PR does not close AUDIT-118 until the cascade-flip pass is run and any reclassifications are filed.

---

## 8. Effort + build sequence

**Effort: M-L holds, with the scope now confirmed.** The confirmed scope did not enlarge the estimate: the value-set side is narrow (one literal swap x14 + one simplification x2, not a wholesale rewrite, because the sets are already IN-level), and the engine change is a single two-site wrapper. The two items that carry the weight are the **IN-map generator + full §16 verification** (the largest single piece - a new tool + an authoritative-source verification pass over a few hundred entries) and the **SCD-coded fixture authoring + 4 test classes**. Neither pushes past L. **No step is now bigger than the M-L estimate;** the value-set side is smaller than a naive read would assume (IN-level sets were the lucky precondition).

**Build sequence (each step gated on the prior):**
1. **IN-map generator** (offline tool, sibling to auditCanonical) over the bounded ingredient universe.
2. **Generate + full-§16-verify the asset** + provenance sidecar + determinism check; commit the static map.
3. **`expandToIngredients` function** + the coverage-guard test + the caller-guard test.
4. **Wire the 2 runners** to call `expandToIngredients` at construction.
5. **Value-set cleanup** in the same change: dabigatran `1037045`->`1037042` (x14), digoxin enumeration -> IN (x2). Keep the statin resolver.
6. **SCD-coded fixtures + the 4 test classes**; before/after gap-count log; full suite green.
7. **Cascade-flip re-run** (Section 7): re-classify GAP-EP-007/043/044/046/048 + the PV/HF/CAD parity set three-surface per §18. Only then is AUDIT-118 closed.

---

## 9. Document discipline

- DESIGN note only - no fix code, no value-set edit, no engine change in this document's commit.
- DRIFT-44: hyphen-only, `->` for arrows, `§` the only permitted non-ASCII.
- §16 clinical-code verification governs the IN-map generation (authoritative external source, full-verify at gen time, determinism check).
- §17.3 scope discipline: the in-pass value-set edits are the direct redundancy of the fix; the broader AUDIT-052 refactor is NOT pulled in.
- Severity is register-literal (AUDIT-118 HIGH P1, operator-finalized on the Step 2.5 evidence); this note does not re-classify.
