# AUDIT-222 + AUDIT-223 Joint Remediation Design

**Status:** DESIGN AGREED (operator-ruled 2026-07-29). This document is the reviewable CONTRACT for both
remediation PRs. PR-A (identity) and PR-B (resolve) are authored against this note; any deviation from it
is a scope change requiring its own operator ruling.

**Findings covered:**
- **AUDIT-222** (MEDIUM P2 / Tier 1, OPEN 2026-07-29) - cross-rule `currentStatus` clobbering via the coarse
  `gapType::module` match key.
- **AUDIT-223** (MEDIUM P2 / Tier 1, OPEN 2026-07-29) - the gap runners never resolve stopped-firing gaps
  (append-only stale-open honesty risk).

**Operator rulings encoded here (2026-07-29):**
- (a) **Option (i)**: a `ruleId` column, with mechanically-generated-then-FROZEN slugs.
- (b) **Orphans carry `ruleId = NULL` in PR-A**, explicitly enumerated (4,129 rows: ezetimibe 2,179 +
  PCSK9 1,950, the AUDIT-195/196 consolidation residue); their disposition is DEFERRED to PR-B
  retire-with-reason semantics.
- (c) **Joint design document, two sequenced PRs** (PR-A identity, then PR-B resolve).

All measured figures below are from the production tenant `demo-synthea-threaded` immediately after the
2026-07-29 re-detection (task-def `:399`, stored gaps 65,251), and from a static parse of
`backend/src/ingestion/gaps/gapRuleEngine.ts` at commit `e025ce4`.

---

## 1. The identity loss chain

Rule identity does not exist in the emitted gap. It is lost at the push site, BEFORE the writer runs.

| Stage | Artifact | What identity survives |
|---|---|---|
| Rule fires | `gaps.push({...})` in `gapRuleEngine.ts` | NONE. `DetectedGap` (`:181`) is `{type, module, status, target, medication?, recommendations?, evidence?}` - there is no id field. |
| Writer matches | `${gapType}::${module}` (`runGapDetectionForPatient.ts:65`, `gapDetectionRunner.ts:41`) | `status` is dropped from the key; only the coarse bucket remains. |
| Row persists | `TherapyGap` (`schema.prisma:1282`) | No `ruleId` column exists. |

`RUNTIME_GAP_REGISTRY` (`gapRuleEngine.ts:258`, 401 entries with stable ids such as `gap-1-attr-cm`) DOES
exist and is re-exported by the runner (`gapDetectionRunner.ts:20`), but it is pure provenance metadata and
is NOT wired to emission. Nothing in the write path reads it. There is no code-level link from a
`gaps.push` site to its registry id; the canonical pipeline reconstructs that association externally via
evaluator line-ranges plus confidence scoring, which is why some bindings sit below threshold (for example
`gap-vd-echo-interval` at reconcile confidence 0.444, per the AUDIT-194-B3 register note).

**Counts at `e025ce4`:** 368 `gaps.push` sites; 358 literal `status:` strings (all distinct); 401 registry
entries. The registry is NOT 1:1 with the push sites, so establishing the mapping is itself authoring work,
not a lookup.

## 2. Three failure modes, with measured impact

The writer builds `new Map(existingGaps.map(g => [key, g.id]))`. For duplicate keys the Map keeps only the
LAST id, so **exactly one row per patient-bucket is reachable by the refresh path, permanently**.

| Measure | Value |
|---|---|
| Rules in a COLLIDING `gapType::module` bucket | **357 of 368 (97.0%)** |
| Collision-free buckets | 11 of 57 |
| Most crowded bucket | 30 rules (`MEDICATION_MISSING/HEART_FAILURE`) |
| Next most crowded | 23 (`MEDICATION_MISSING/CORONARY_INTERVENTION`), 23 (`MONITORING_OVERDUE/CORONARY_INTERVENTION`), 22 (`PROCEDURE_INDICATED/STRUCTURAL_HEART`) |
| Stored rows (tenant `demo-synthea-threaded`) | 65,251 |
| Distinct (patient, gapType, module) triples | 34,143 |
| Triples holding more than one row | 13,864 (max 9 rows in one triple) |
| **Shadow rows unreachable by any future refresh** | **31,108 (47.7%)** |

**Mode 1 - SHADOWING.** 31,108 rows (47.7%) can never be updated by any future detection, and per AUDIT-223
are never resolved either. Their clinical text is permanently frozen at whatever the rule said when the row
was created.

**Mode 2 - RELABELING.** The single reachable row per bucket has its `currentStatus` overwritten by whichever
sibling rule the current engine fires last. Evidenced on 2026-07-29: VD-ECHO-INTERVAL's post-run count of
416 decomposed to 321 genuinely new rows plus **95 relabels** of pre-existing sibling VALVULAR/IMAGING_OVERDUE
rows (aortic-regurgitation surveillance -92, aortic-stenosis echo -32, mitral-stenosis echo -1). Across the
run, 48 statuses changed with relabels netting to zero while creates netted to +1,292 (sum-of-deltas equals
`gapFlagsCreated` exactly).

**Mode 3 - SIBLING SUPPRESSION.** When a bucket already holds a row, EVERY detected sibling routes to
`toUpdate` against that one id (last write wins) and NO rows are created for the genuinely-missing siblings.
This is silent clinical under-reporting, not merely mislabeling. Consistent with the observed 61,815 updates
landing on roughly 34,143 reachable rows (about 1.8 writes per reachable row per run).

**Consequence for rollout:** the current stored state UNDER-represents real gaps. Correct identity will
produce a large create wave on the first post-fix re-detection (see section 6).

## 3. Schema options and the option-(ii) inviability evidence

### Option (i) - ADOPTED: `ruleId` column, match on `patient + ruleId`

- True identity. Immune to status renames, template interpolation, and ternary-conditional statuses.
- Cost: a nullable-column migration (safe, non-blocking, applied via the Dockerfile CMD per RULE 2), a stable
  slug assigned at all 368 push sites, and a backfill decision for the 65,251 existing rows.
- **Identity mechanism (operator-ruled 2026-07-29, amended):** `ruleId` ADOPTS the `RUNTIME_GAP_REGISTRY` id
  wherever a confident binding exists, REUSING the canonical pipeline's existing binding artifact - it is not
  hand-re-derived. Where no confident binding exists, a status-generated slug is assigned under a distinct
  `slug:` prefix so the two namespaces never collide. **Both are FROZEN at assignment**: a later status
  rename must not move an id, and ids are never re-derived from status.

#### Binding source (reused, not re-derived)

The binding artifact is the canonical pair already produced by the audit pipeline:
`docs/audit/canonical/*.code.json` -> `evaluatorBlocks[]` (`bodyStartLine`, `bodyEndLine`, `gapsPushIds`) and
`docs/audit/canonical/*.crosswalk.json` -> `ruleBodyCite` (`evaluatorBlockName`, `evaluatorModule`,
`registryId`). A push site binds to a registry id when it falls inside the tightest containing evaluator block
whose (module, blockName) carries a crosswalk `ruleBodyCite.registryId`.

**A binding counts as CONFIDENT only when that block contains exactly ONE `gaps.push` (source-measured), and
only when exactly ONE block claims the tightest containing range.** A block holding two or more pushes cannot
say WHICH push is the registry rule. Separately, an AMBIGUITY GUARD is required: rules retired to SPEC_ONLY
leave comment-only stubs whose canonical ranges COLLAPSE onto the next live rule, so several block names can
claim one identical range (for example `HF-37-FU` / `HF-38` / `HF-73` all span `[5336,5351]`, where only
HF-73 is live). Picking any one of a tied set would attach a stored clinical row to a rule that is not the
one that fired it, so ties fall through to a generated slug. Measured at commit `e025ce4`: 373 evaluator
blocks across the 6 module files, 263 block-to-registryId bindings, and zero blocks bound to more than one
registryId (no ambiguity on the registry side; the ambiguity is on the code-range side).

Note also that the artifact's own `gapsPushIds` length is NOT a reliable push count: for a rule whose status
is a ternary or template it can read 0 (the extractor captures literal statuses only). Push counts are
therefore measured from source, which is authoritative.

#### Measured assignment yield (368 push sites, as shipped in PR-A)

| Provenance | Sites | Share | Note |
|---|---|---|---|
| **Registry-adopted** (exactly one block, 1:1 with a push, carrying a crosswalk registryId) | **260** | 70.7% | 260 DISTINCT registry ids, zero id collisions; all verified present in `RUNTIME_GAP_REGISTRY` (401 entries) |
| Generated slug - containing block has no crosswalk binding | 99 | 26.9% | `slug:` prefix |
| Generated slug - AMBIGUOUS range (retired-stub collapse) | 5 | 1.4% | `HF-37-FU`/`HF-38`/`HF-73`, `VD-7`/`VD-8`, `HF-91`/`HF-92`, `VD-16`/`VD-17`, `HF-149`/`HF-LVAD-INR` |
| Generated slug - registry-bound block holds >1 push | 2 | 0.5% | `gap-ep-006-dabigatran-renal-safety` (2 pushes) |
| Generated slug - push in no extracted block | 2 | 0.5% | |
| **Total generated slug** | **108** | **29.3%** | |

Ten push sites emit a dynamic status and so have no literal to kebab-case. Eight of them resolved to a
registry id; the remaining two, plus the ambiguous HF-73 site, carry hand-resolved frozen slugs
(`slug:hf-hyponatremia-monitoring`, `slug:ep-rate-control-afib`,
`slug:sh-ascending-aorta-intervention-threshold`). The per-site record is
`docs/audit/AUDIT_222_RULEID_ASSIGNMENT.md`, machine-checked every CI run by `audit222RuleIdFreeze.test.ts`.

#### The unconverged population (follow-up, named here)

**108 push sites (29.3%) carry a generated `slug:` id rather than a registry id.** This is the UNCONVERGED
population. The intended path is convergence: as registry bindings are hand-confirmed (a block split so it is
1:1 with a push, a collapsed retired-stub range disambiguated, or a missing crosswalk `ruleBodyCite`
supplied), a `slug:` id converts to its registry id.

**Every such conversion is a DATA MIGRATION on `therapy_gaps.ruleId`, not a code-only edit** - stored rows
carry the old id and must be re-pointed. This is the ONLY sanctioned path by which an assigned id may change.
PR-B and every future runner change must treat ids as immutable except through that documented migration path;
silently re-deriving an id would re-introduce exactly the identity instability AUDIT-222 exists to remove.

The committed slug-generation report (three columns: push site, assigned ruleId, provenance) is the record of
this assignment and the checklist for future convergence.

### Option (ii) - REJECTED: match on `patient + gapType + module + currentStatus` (no migration)

Rejected on this codebase's own evidence. Status text is not a stable rule identity here:

1. **10 push sites emit DYNAMIC statuses** - the same rule produces a different key per patient or per run,
   so each run would spuriously create rows and shadowing would continue:

   | Line | Kind | Bucket | Status shape |
   |---|---|---|---|
   | `:5337` | template | SAFETY_ALERT/HEART_FAILURE | `Hyponatremia detected: sodium ${labValues['sodium']} mEq/L` |
   | `:5546` | template | MEDICATION_CONTRAINDICATED/ELECTROPHYSIOLOGY | `QTc ${severity}: ${...}ms (threshold ${...})` |
   | `:6848` | conditional | MEDICATION_MISSING/CORONARY_INTERVENTION | ternary (see item 2) |
   | `:7253` | conditional | MEDICATION_MISSING/PERIPHERAL_VASCULAR | ternary |
   | `:7468` | conditional | MEDICATION_MISSING/ELECTROPHYSIOLOGY | ternary (see item 2) |
   | `:9669` | conditional | PROCEDURE_INDICATED/STRUCTURAL_HEART | ternary |
   | `:10068` | template | PROCEDURE_INDICATED/STRUCTURAL_HEART | `Ascending aorta at the ${ascSubgroup_SH} intervention threshold...` |
   | `:11155` | template | MEDICATION_CONTRAINDICATED/ELECTROPHYSIOLOGY | `Dronedarone contraindicated in ${arm}` |
   | `:14258` | template | MONITORING_OVERDUE/HEART_FAILURE | `Consider anemia workup for HF patient with hemoglobin <${anemiaThreshold} g/dL` |
   | `:15093` | template | MEDICATION_MISSING/HEART_FAILURE | `HFrEF GDMT substantially incomplete (${hfPillarCount} of 4 pillars)` |

2. **At least 2 sites emit MULTIPLE statuses via ternaries** - one rule, many keys:
   `:6853` (`'High-intensity statin not prescribed in CAD'` vs its alternate arm) and `:7472-7473`
   (`'Rate control agent not prescribed in AFib (HFrEF: avoid non-DHP CCB)'` vs
   `'Rate control agent not prescribed in AFib'`).

3. **Brittle to renames, already proven in production data.** 4,129 stored rows match no current rule after
   the AUDIT-195/196 lipid consolidation (ezetimibe 2,179 + PCSK9 1,950). Under option (ii) that rename would
   have been read as "old gaps vanished, new gaps appeared" - re-creating this very defect class on the next
   rename.

## 4. Backfill attribution (PR-A)

Attribution is per-row via `currentStatus`, so it applies to shadow rows equally.

| Bucket | Rows | Share | Disposition in PR-A |
|---|---|---|---|
| Exact status match to a current rule | 53,266 | 81.6% | Direct map to the frozen slug |
| Attributable only by PATTERN (ternary/template families): statin 7,676, rate-control 91, HFrEF GDMT 69, anemia 20 | 7,856 | 12.0% | Prefix/regex mapping rules, each hand-verified and unit-tested |
| **Un-attributable - no current rule emits them**: ezetimibe 2,179, PCSK9 1,950 | **4,129** | **6.3%** | **`ruleId = NULL`**, enumerated; disposition deferred to PR-B |

Total attributable in PR-A: 61,122 of 65,251 (93.7%).

**Orphan disposition (operator-ruled (b)):** PR-A leaves the 4,129 rows with `ruleId = NULL` and enumerates
them explicitly. It does NOT retire or resolve them - that is a resolve semantic and therefore PR-B work.
A NULL `ruleId` means the row is invisible to future rule matching, which is acceptable ONLY because PR-B
follows; if PR-B were abandoned these rows would be silently abandoned open, which would itself be an
AUDIT-223-class honesty defect.

## 5. Why one design and two PRs

**AUDIT-223 is technically BLOCKED by AUDIT-222, not merely adjacent.** Under the coarse key the runner
cannot distinguish "a sibling rule relabeled this row" from "this rule stopped firing." Implementing resolve
semantics first would mass-resolve siblings - a catastrophic write against clinical data. The 31,108 shadow
rows also require a disposition that is purely a resolve-semantics question.

Designing them separately risks a schema that cannot express resolve. Shipping them as ONE PR would put a
migration, a 65,251-row backfill, a match-key change, and new resolve semantics into a single reviewable
unit - too much blast radius for one gate.

**PR-A (identity).** `DetectedGap.ruleId`, the nullable migration, frozen slugs at all 368 push sites, the
match-key change to `patient + ruleId` in both runners, and the dedicated backfill runner (authored, NOT
executed). No resolve behavior.

**PR-B (resolve).** A guarded deactivate/resolve pass built on correct identity: resolve stored gaps whose
rule did not fire this run, with an AUDIT-193-class completeness guard (abort if the run covers less than a
threshold share of stored rows, so a partial or failed detection can never mass-resolve), clinician-dismissed
gaps preserved, and the retire-with-reason disposition for the 4,129 `ruleId = NULL` orphans plus any shadow
rows still un-refreshed.

## 6. Test proofs and rollout gates

### 6.1 Proofs (each MUST fail on current code, then pass after the fix)

1. **Clobber reproduction** - one fixture patient, two sibling rules in one `gapType::module`; assert both
   persist with their own distinct statuses. Fails today: one row, last-write-wins.
2. **Shadow reproduction** - seed two pre-existing rows in one bucket; assert BOTH refresh. Fails today: only
   the last id is reachable.
3. **Sibling suppression** - bucket holds one stored row, three siblings fire; assert 2 creates plus 1 update.
   Fails today: 3 updates, 0 creates.
4. **Rename stability** - change a rule's status text; assert the stored row still matches by `ruleId`. This
   is the guard against the option-(ii) failure mode.
5. **Backfill-mapper unit tests** over all three attribution buckets, including the orphan path
   (`ruleId = NULL`, count asserted at 4,129 against a fixture standing in for the production distribution).

### 6.2 Rollout gates

**The PR-A code change mutates NO stored data on deploy.** It changes future write behavior only. The
nullable-column migration is safe and non-blocking.

Two follow-on actions ARE data mutations, each separately operator-gated after merge under the standing
protocol (Aurora snapshot -> dry-run -> execute-GO, with the runtime wrapper self-gating on the container's
emitted `buildSha` per AUDIT-221):

- **G1 - the `ruleId` backfill** over 65,251 rows. The runner follows the AUDIT-218 pattern: dedicated,
  structurally isolated (touches only `therapy_gaps.ruleId` plus one summary audit row), deterministic,
  dry-run by default, `--execute` gated.
- **G2 - the first post-fix re-detection.** Because of Mode 3 (sibling suppression), correct identity will
  create the long-suppressed sibling gaps: expect a LARGE create wave, materially larger than the +1,292 of
  the 2026-07-29 run.

**DRIFT-55 predicate requirements for G2.** The prediction for that create wave must state its baseline
assumptions as explicit predicates and VERIFY each before the delta is treated as an invariant:
- first-run-since-WHEN (when was the stored baseline last recomputed?);
- engine-version-since-WHEN (which rule changes landed since that baseline?);
- clock-sensitive-rules-since-WHEN (which staleness windows have moved?);
- plus, specific to this change: the expected create volume derived from the measured bucket-collision
  distribution (357 colliding rules, 13,864 multi-row triples), not from the marginal effect alone.
A prediction whose baseline predicates are unverified is a HYPOTHESIS, not an invariant.

### 6.3 Canonical pipeline statement (section 9.2)

PR-A changes NO rule logic: no `gaps.push` is added, removed, or re-gated; only an identity field is added to
the emitted shape and to the persistence key. Runtime `gaps.push` count stays 368. `validateCanonical` is
expected 6/6 with no coverage movement, since coverage counts spec-crosswalked gaps and no crosswalk binding
changes. Any observed coverage delta would indicate an unintended logic change and is a stop condition.

---

## 7. Lineage

AUDIT-194 (rule-identity discipline) / AUDIT-193 (the guarded deactivate-diff pattern PR-B reuses) /
AUDIT-184 and AUDIT-197 (retired rules whose stored rows remain open) / AUDIT-195 and AUDIT-196 (the lipid
consolidation that produced the 4,129 orphans) / AUDIT-218 (the backfill-runner pattern G1 reuses) /
AUDIT-221 (the runtime buildSha self-gate both mutations must carry) / DRIFT-55 (the prediction-predicate
discipline G2 must satisfy).

---

## 8. AMENDMENT 2026-07-29: orphan retirement moved AHEAD of G2

**Supersede-not-overwrite: the sequencing text in sections 4, 5 and 6 above stands as originally written. This
section records an operator-ruled change to the ORDER of execution, not to the design.**

### What changed

A bounded **orphan-retirement mutation** now runs BEFORE G2 (the first post-fix re-detection). Its scope is
exactly the **4,129** `ruleId IS NULL` rows of tenant `demo-synthea-threaded`, which carry exactly the two
AUDIT-195/196 lipid-consolidation statuses (`Consider ezetimibe add-on for LDL not at goal on statin` 2,179 +
`Consider PCSK9 inhibitor for LDL not at goal on maximally tolerated statin` 1,950). Retirement and G2 then
execute in the SAME gated session, to keep the window between them as short as possible.

**Full PR-B is UNCHANGED and remains post-G2**: general resolve semantics, the 419 stored-attributed-but-no-
longer-detected candidates, and the shadow-row policy all stay in PR-B exactly as section 5 specifies. This
amendment carves out a bounded subset, it does not pull PR-B forward.

### Why (operator rationale, recorded verbatim in substance)

The G2 prediction (read-only, measured over all 25,571 patients on `:402`) forecast **2,616 creates**, of which
**1,569 (60%)** are the consolidated `LDL not at goal on statin - intensify lipid therapy` status. Mechanism:
those patients' stored lipid rows carry the RETIRED predecessor statuses, attribution left them NULL and
therefore inert, so the consolidated rule matches no row and creates a fresh one - leaving a NULL-ruleId
legacy row AND a new correctly-identified row for the same clinical concern.

Two orderings were weighed:
- Execute G2 first: a **duplicate window** of ~1,569 duplicate-concern pairs lasting until PR-B ships.
- Retire orphans first: an **absence window** for those concerns lasting only the minutes between the two
  runs in one session.

Ruled: retire first. The duplicate window lasts until PR-B; the absence window lasts minutes. Decisively, the
orphan rows carry **engine-retired recommendations** - they are misleading to a clinician TODAY, independent of
G2 - so retiring them is correct on its own merits and not merely a G2 convenience.

### Constraints carried into the retirement runner

Same gates as every mutation in this arc: AUDIT-218/225 runner shape (dedicated, structurally isolated,
deterministic targeting, dry-run default, completeness invariant, audit row, idempotent), AUDIT-221 runtime
buildSha self-gate, a fresh Aurora snapshot, and an operator execute-GO. Retirement is an UPDATE, never a
delete: the total row count must not change. Invariants for the gated execute: retired == 4,129 exactly, the
two statuses only, tenant isolation, total unchanged, and the 61,122 attributed rows untouched.

---

## 9. AMENDMENT 2026-07-29: how retirement is EXPRESSED, and the resolution-taxonomy debt it hands to PR-B

**Operator ruling (2026-07-29): option (ii) - no migration.** Retirement is expressed with EXISTING columns:

| Column | Value |
|---|---|
| `resolvedAt` | the retirement timestamp |
| `resolvedBy` | `system:audit-222-retirement` |
| `currentStatus` | ORIGINAL TEXT PRESERVED, with a bounded machine-recognizable suffix APPENDED: `<original> [RETIRED <date>: rule consolidated per AUDIT-195/196; superseded by "LDL not at goal on statin - intensify lipid therapy"]` |

The append (never a replace) is supersede-not-overwrite applied to a clinical text column. Note the contrast
with the CLINICIAN path (`routes/gaps.ts`), which OVERWRITES `currentStatus` with the bare action verb
(`INITIATED` / `CONTRAINDICATED`) - retirement deliberately does not, because the original recommendation text
is the only record of what the row used to assert.

### The `system:` prefix is RESERVED (documented convention)

`resolvedBy` is the actor discriminator, and the `system:` prefix is reserved for non-human writers. Existing
system writers already conform (`system:proc-backfill`, `system:ruleid-backfill`, `system:baa-guard`). A real
user id must never begin with it. `backend/src/services/gapResolutionActor.ts` is the single home for the
prefix, the retirement actor, the suffix marker, and the `clinicianResolvedWhere` filter.

### Why this is a CONVENTION-enforced distinction, and what that costs

Nothing in the schema prevents a future writer from setting `resolvedAt` without honouring the prefix, and
nothing forces a new metric to apply the filter. The distinction therefore holds by discipline, not by
construction. That is acceptable ONLY because the debt has a designed home:

**DIRECTIVE TO PR-B (resolution taxonomy):** PR-B's resolve-semantics design MUST either (a) ADOPT this
convention explicitly - documenting `system:`-prefixed `resolvedBy` as the canonical machine-readable
resolution-actor class and adding it to the resolve pass it authors - or (b) MIGRATE it to a schema-enforced
form (for example a `resolutionClass` enum, or dedicated `retiredAt` / `retiredReason` columns) and backfill
the rows this retirement wrote. What PR-B must NOT do is invent a third, parallel way to express a non-clinical
resolution: that would leave three conventions and no source of truth. The schema-enforced distinction is
DEFERRED to its designed home, not skipped.

### Blast-radius remediation shipped WITH the retirement (not deferred)

Retirement sets `resolvedAt` on 4,129 rows, and every `resolvedAt`-based throughput metric would have read
that as clinical achievement. Because this change CAUSES the distortion, its correction ships in the same PR
(this is blast-radius remediation, not section 17.3 bundling). A section 20 sweep of every `resolvedAt`
throughput metric found FOUR, all now filtered through `clinicianResolvedWhere`:

| Site | Metric | Why it mattered |
|---|---|---|
| `godView.ts` getSystemQualityMetrics | `gapClosureRate` / `totalGapsClosed` | presents closures as clinical quality |
| `godView.ts` getSystemFinancialSummary | `captured` = closedGaps x REVENUE_PER_GAP_ESTIMATE | would FABRICATE captured revenue - the AUDIT-187 class |
| `godView.ts` getDetailedModuleHealth | `closedThisWeek` -> closureRate -> healthy/warning/critical verdict | would flip a module's health verdict |
| `clinicalAlertService.ts` sendWeeklySummary | `closedGaps` -> closureRate % in the leader EMAIL | would report phantom closures to hospital leaders |

The windowed pair (`resolvedAt: { gte: weekAgo }`) was the pair named in the ruling; the sweep additionally
found the two lifetime `resolvedAt: { not: null }` counts, and they are the WORSE of the four - one drives a
revenue figure. Both were fixed on the same causation rationale. No other `resolvedAt` throughput metric
exists in `backend/src`.

NULL handling is deliberate and is the subtle part: a bare `resolvedBy: { not: { startsWith: 'system:' } }`
compiles to `NOT (resolvedBy LIKE 'system:%')`, which is NULL - and so FALSE - for rows whose `resolvedBy` is
NULL. Legacy clinician closures and the data-request purge path DO leave it NULL, so the naive form would have
silently DROPPED real closures while fixing the phantom ones. `clinicianResolvedWhere` keeps them via an
explicit `OR`, and throws rather than clobber a base clause that already carries a top-level `OR`.

### Cohort-shift measurement at the GO gate

Both retired statuses are CORONARY_INTERVENTION, and `modules.ts` / `godView.ts` define module cohort
membership as "has an OPEN gap in that module". A patient whose ONLY open CAD gap is a retirement target
therefore LEAVES the CAD cohort. The runner measures this read-only in BOTH modes and logs
`patientsWhoseOnlyOpenCadGapsAreRetiring`, so the cohort shift is a measured number at the execute-GO gate
rather than a discovered surprise afterwards.

---

## 10. AMENDMENT 2026-07-30: PR-B rulings, the option-(iv) tripwire, and a constraint correction

**Supersede-not-overwrite: sections 5 and 9 stand. This section records operator rulings and one design
correction that the measured inventory forced.**

### Ruling 1 - option (ii) STANDS, with a named tripwire

The retirement work PRICED the convention-enforced approach: ONE helper (`clinicianResolvedWhere`) plus FOUR
call sites covered the entire `resolvedAt` throughput surface. Option (iv) (a schema `resolutionClass` enum or
dedicated columns) would additionally cost a migration, a backfill of the 4,129 retired rows, and a rewrite of
those same four sites. Measured cost of (ii) came in far below what section 9 assumed, so (ii) stands.

**TRIPWIRE (codified):** the `system:` prefix currently has TWO resolution actors -
`system:audit-222-retirement` and PR-B's `system:audit-223-no-longer-detected` (plus
`system:audit-222-shadow-dedupe` for the one-shot dedupe). **Any THIRD durable, recurring system-resolution
actor triggers the schema conversation BEFORE that work ships.** Rationale: two actors are memorable and
reviewable by discipline; three is where convention-by-discipline stops scaling and an unenforced prefix
becomes a silent-divergence risk. The tripwire is the designed moment to revisit option (iv), not a vague
"someday".

### Ruling 2 - shadow residue: dedupe-and-resolve, THEN constrain

Measured live 2026-07-30: **185 `(patientId, ruleId)` pairs hold more than one row = 185 extra unreachable
rows** (down from 31,108 pre-fix, a 99.4% reduction, but NOT zero). Cause is backfill residue, not a
re-emergence: attribution mapped by STATUS, and ternary rules emit two status strings, so a patient holding
both branch-variants had two rows collapse onto one ruleId (`gap-cad-statin` 66 pairs, structural-heart
imaging 32, `gap-cad-rehab-mi` 19, glucose screening 12).

Order: **dedupe first (keep most recent per pair, resolve the rest under `system:audit-222-shadow-dedupe`),
then the uniqueness constraint.** The constraint is the end state; the dedupe is its precondition. It lands
only after a verified-zero-duplicates check.

### CORRECTION to ruling 2: the constraint must be PARTIAL, not `@@unique([patientId, ruleId])`

A plain unique on `(patientId, ruleId)` would be WRONG and would break a legitimate clinical case. Once PR-B
resolves gaps, a resolved row RETAINS its `ruleId`. If that rule later fires again for the same patient - a
genuine new episode (the therapy lapsed, the value drifted back out of range) - the runner must CREATE a new
open row beside the resolved historical one. A total unique constraint would reject that write and the
detection run would fail.

The correct constraint expresses the real invariant: **at most one OPEN row per (patient, rule)**:

```sql
CREATE UNIQUE INDEX therapy_gaps_patient_rule_open_uniq
  ON therapy_gaps ("patientId", "ruleId")
  WHERE "resolvedAt" IS NULL AND "ruleId" IS NOT NULL;
```

Prisma's schema DSL cannot express a partial unique index, so this is a migration-level constraint carrying a
comment in `schema.prisma` pointing at it. `ruleId IS NOT NULL` is included because Postgres treats NULLs as
distinct anyway and the 4,129 retired rows legitimately share NULL.

**Fail-safe on a still-duplicated table:** `CREATE UNIQUE INDEX` on a table that still has duplicate open
pairs FAILS with `23505 unique_violation` and the migration ABORTS in its transaction, leaving the table
untouched. That is the desired behaviour: the constraint cannot land until the dedupe has actually run. The
migration is therefore written to be applied AFTER the dedupe execute, and its failure mode is a loud,
non-destructive abort rather than silent data loss.

### Ruling 3 - AUDIT-224 folds into PR-B

Resolve makes runs consequential: a run that resolves clinical rows without leaving a durable record is the
observability gap AUDIT-224 describes, now with teeth. Per Coverage-of-an-Invariant (section 22) the record
ships WITH the semantics that need it. A `GapDetectionRun` row per run captures tenant, buildSha, start/finish,
patientsEvaluated, creates/updates/resolves, and the completeness fraction.

### Resolve reasons carry the two-clock discriminator (not collapsed)

`buildPatientEvalContext(patient, nowMs)` is a pure function of the patient's rows and a clock. Evaluating the
SAME patient rows at two clocks therefore isolates the clock's contribution exactly:

- fired at the row's `identifiedAt` but NOT now -> **`clock`**: the passage of time alone closed it (a
  staleness window moved past the observation).
- fired at NEITHER clock -> **`state`**: the patient's data no longer supports the rule (therapy started,
  value normalised) - it fired when created because the data was different then.

Both are recorded verbatim in the resolution reason. Collapsing them into "no longer applicable" would destroy
the distinction between "a clinician fixed this" and "this aged out of a window", which are different clinical
facts and should not read the same in a closure metric.

### FLAGGED ASYMMETRY (follow-up, explicitly OUTSIDE PR-B scope)

The clinician action path (`routes/gaps.ts`) OVERWRITES `currentStatus` with the bare action verb
(`REFERRED` / `INITIATED` / `DEFERRED` / `CONTRAINDICATED`), destroying the original recommendation text. The
system paths (retirement, and PR-B's resolve) deliberately PRESERVE it under an appended marker. So the
supersede-not-overwrite property holds for machine-written resolutions but NOT for human-written ones - the
inverse of what one would expect, and a real gap in the clinical record: after a clinician defers a gap, no
surface records what was deferred. Filed here as a named follow-up; NOT fixed in PR-B, because changing that
write path touches the clinician-facing contract and deserves its own finding and review.

### AMENDMENT 2026-07-30 (b): deviation approvals, and the ENFORCED sequence

**Two PR-B deviations, operator-APPROVED 2026-07-30:**

1. **The uniqueness constraint is PARTIAL, not total.** `WHERE resolvedAt IS NULL AND ruleId IS NOT NULL` is
   the invariant the ruling intended: at most one OPEN row per (patient, rule). A resolved row retains its
   `ruleId`, and must not block a genuine new episode.
2. **The match map is OPEN-rows-only.** The same design point: a re-firing rule must never rewrite a closed
   row (which would leave a live recommendation reading as closed); it creates a new open row instead.

**ENFORCED SEQUENCE (re-sequencing ruling 2026-07-30).** The partial index migration is REMOVED from PR-B and
ships in its own follow-up PR. The order is enforced by PR sequencing, not by documentation:

1. PR-B merges and deploys (applies only the `gap_detection_runs` CREATE TABLE - no data dependency).
2. The shadow-dedupe **executes** under snapshot + operator GO, clearing the 185 duplicate open pairs.
3. A **verified-zero-duplicates** check passes.
4. ONLY THEN does the index PR merge, so its migration succeeds by construction.

**Why the index could not ride PR-B.** The container CMD is `npx prisma migrate deploy && node
dist/server.js`. `migrate deploy` applies ALL pending migrations at container start, and there is no
directory exclusion, guard clause, or feature flag anywhere in the Dockerfile or deploy workflow. Against the
185 still-duplicated pairs the index raises `23505 unique_violation`; the `&&` then prevents the server from
starting, the task exits non-zero, and the ROLLOUT fails - and stays failing for every subsequent deploy until
the dedupe runs. The in-transaction abort protects the DATA but wedges the DEPLOY, which is a different
property. See DRIFT-58.

**The self-guarding alternative was REJECTED** (a `DO $$ ... skip if duplicates exist $$` migration): it would
be recorded in `_prisma_migrations` as applied while the constraint was silently absent, so nothing would ever
re-attempt it - trading a loud, recoverable failure for a permanent invisible gap in the invariant.
