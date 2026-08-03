# TrialMatch identity + persistence design

**Status: DESIGN, docs-first. No implementation.** This document is the reviewable artifact; nothing
ships until it is ruled on. It follows the `AUDIT_222_223_JOINT_DESIGN.md` contract precedent: settle
the identity question in prose, with the measurements in front of the decision, before touching a
schema that will hold clinician-facing rows.

**Filed:** 2026-08-03, at the close of AUDIT-227.
**Lineage:** AUDIT-148 (the honest matcher and its register design note) / AUDIT-222 (rule-stable
identity) / AUDIT-223 (partial uniqueness on the open set, two-clock discriminator) / AUDIT-224 (the
durable run record) / AUDIT-225 (mutation-safe pagination) / AUDIT-227 (the bounded request path and
the measurements below).

---

## 1. The measured inputs

Every number here was measured on production `demo-synthea-threaded` with the deployed matcher, not
estimated. They are stated first because each one constrains the design, and two of them change what
a defensible design even looks like.

### 1.1 Full-population evaluation costs 451 seconds

**451,143 ms** for 4 trials over **25,571** active patients: **17.64 ms/patient**, 128 batches of 200
(measured 2026-08-02 on task-def `:414`). The cost is dominated by loading each patient's relation
graph (conditions + medications + observations + procedures) so `buildPatientEvalContext` can run;
the matcher itself is cheap and scales with criteria count, not patient count.

Consequences: a synchronous request cannot complete a population-true evaluation (an ALB idles out at
60s), and re-computing on every page load wastes the entire cost repeatedly.

### 1.2 A budget-truncated sample is NOT representative

`GET /trials/summary` currently walks under a 20s budget and reports `complete: false` with
`patientsEvaluated`. Measured on `:415`: the truncated walk covered **1,200** patients and read HFrEF
GDMT at **5 ELIGIBLE / 52 INDETERMINATE / 1,143 INELIGIBLE**. The true population figures are
**68 / 1,184 / 24,319**.

Normalised, the sample says 0.42% eligible where the population says 0.27% - off by more than half
again. The cause is structural, not statistical noise: the walk is **id-ordered**, so a truncated
sample is the first N patients by cuid, which correlates with insertion order, which correlates with
cohort construction. It is a biased prefix, not a random sample.

### 1.3 Verdicts move with the clock, absent any data change

Two measured instances:

- 2026-08-01 -> 2026-08-02: the `ldl` signal count moved 21,158 -> 21,160 (2 patients).
- 2026-08-01 -> 2026-08-03: Residual Lipid Risk moved 218/24,798/555 -> 214/24,798/559 (4 patients
  crossed ELIGIBLE -> INDETERMINATE).

In both cases no patient data changed. Values aged past the 180-day lab-staleness window in
`buildPatientEvalContext`, so a criterion that was evaluable became UNEVALUABLE. This is the substrate
behaving exactly as designed - and it means **a stored verdict has a shelf life**, which the design
must express rather than hide.

### 1.4 Zero rows today: the design is free

`trial_matches`: **0 rows**. No writer exists anywhere in `backend/src` (verified by grep for
`trialMatch.(create|upsert|update|createMany|deleteMany)` - no hits). Evaluation is purely on-demand.
`trial_referrals`: 0 rows. `clinical_trials`: 4.

Every decision below can be made on its merits. The same decisions after the first bulk write become
a data migration.

### 1.5 The pre-committed constraint is the AUDIT-223 defect, already in the schema

`TrialMatch` carries:

```prisma
@@unique([patientId, trialId, hospitalId])
```

A **TOTAL** unique, with no version axis. This is precisely the shape AUDIT-223 ruled wrong for
`therapy_gaps` and replaced with a partial unique on the open set. It was migrated into production
before any row existed, so it is presently harmless - and correcting it now costs one migration
against an empty table.

---

## 2. The requirement the sample finding adds

The AUDIT-227 closeout labels a truncated summary as a sample, which is honest about
**incompleteness**. Section 1.2 shows that is not sufficient.

**Executive-tier numbers must be population-true. Sampling is structurally incapable of supplying
them, regardless of how carefully it is labelled.** A CMO reading "5 eligible (sample of 1,200)"
will scale it mentally - and scaling a biased prefix produces a wrong number. Labelling protects
against the claim "this is the total"; it does not protect against the inference "this is
representative", and that inference is the natural one.

This is the platform's own honesty discipline applied one level up. The gap engine refuses to assert
on an unthreaded signal; the matcher refuses to assert ELIGIBLE on an unevaluable criterion; the
aggregate layer must refuse to imply a population figure it did not compute. The only way to satisfy
that for an aggregate is to **compute it over the population**, which - given section 1.1 - means
computing it **outside the request path** and reading the result.

**This requirement, not the 451s cost alone, is what makes persistence necessary rather than merely
convenient.** Performance could be papered over with a longer timeout or a spinner. Representativeness
cannot.

---

## 3. The design

### 3.1 (a) Constraint shape: partial unique on the current row

Replace the total unique with:

```sql
CREATE UNIQUE INDEX "trial_matches_patient_trial_current_uniq"
    ON "trial_matches" ("patientId", "trialId", "hospitalId")
    WHERE "supersededAt" IS NULL;
```

At most one **current** verdict per (patient, trial, tenant); any number of superseded ones beside it.
This is the AUDIT-223 pattern, and the reasoning transfers exactly: a total unique forces
overwrite-in-place, which destroys the prior verdict and makes a flip inexplicable. Prisma's DSL
cannot express a partial unique, so it lives in SQL with the schema comment pointing at it - the same
arrangement as `therapy_gaps_patient_rule_open_uniq`.

`hospitalId` stays in the key. It is redundant given `patientId` implies a tenant, but it makes every
index scan tenant-local and mirrors the existing convention.

**Migration safety: trivial, and this is the moment.** The table is empty, so dropping the total
unique and creating the partial one cannot raise `23505` and cannot wedge a rollout - the exact
hazard DRIFT-58 was filed for. It must therefore ship **before** any writer exists, not after. If
this design is deferred past the first bulk write, the same migration becomes a dedupe-then-constrain
sequence with a snapshot and a gated execute, which is the AUDIT-223 arc re-run for no reason.

### 3.2 (b) Lifecycle: version-and-supersede, never overwrite

A re-evaluation that produces a **different** verdict:

1. sets `supersededAt = now()`, `supersededBy = <new row id>` on the current row;
2. inserts a new row with the new verdict, `supersededAt = NULL`.

A re-evaluation that produces the **same** verdict does not write a new row; it advances
`lastConfirmedAt` on the current row. This keeps the table proportional to verdict *changes* rather
than to evaluation *runs* - important because a scheduled refresh over 102K pairs would otherwise
add 102K rows per run regardless of whether anything moved.

Overwrite is rejected for the reason AUDIT-223 rejected it: a clinician who saw ELIGIBLE yesterday and
INDETERMINATE today is entitled to an answer, and an overwritten row cannot give one. Never delete;
supersession is an UPDATE plus an INSERT.

### 3.3 (c) Per-row provenance, and the three-way discriminator

Required on every row:

| field | why |
|---|---|
| `buildSha` | which matcher produced this verdict (AUDIT-221/224 convention, already used by `GapDetectionRun`) |
| `criteriaVersion` | which criteria the verdict was evaluated against |
| `evaluatedAt` | when - the basis for staleness (section 3.6) |
| `lastConfirmedAt` | most recent run that re-derived the same verdict |
| `supersededAt` / `supersededBy` / `supersessionReason` | the lifecycle above, and why it flipped |

**Where `criteriaVersion` lives - the trade-off, surfaced rather than decided unilaterally:**

- **Option A - integer column on `ClinicalTrial`, bumped on criteria edit.** Cheap to read and to
  index; the version is meaningful to a human ("v3 of this trial's criteria"). Its weakness is that
  it depends on the writer remembering to bump - the same
  documented-discipline-instead-of-mechanism failure DRIFT-58 was filed for. It would need a DB
  trigger or a service-layer chokepoint to be a mechanism rather than a convention.
- **Option B - content hash of the criteria JSON, computed on read/write.** Cannot drift, because it
  *is* the content; no discipline required. Its weaknesses are that it is opaque to a human, and that
  key ordering or whitespace changes in the JSON would change the hash without changing semantics
  (mitigable with a canonical stringify - the repo already has `stableStringify` in the canonical
  pipeline).

**Recommendation: Option B with `stableStringify`,** because the platform's own drift history is
overwhelmingly about conventions that were not mechanisms. Option A's readability can be recovered by
*also* storing a human-facing integer for display, derived rather than depended upon. Operator ruling
requested.

**The supersession discriminator is THREE-way**, extending AUDIT-223's two-way:

| reason | meaning | how it is determined |
|---|---|---|
| `criteria` | the trial's criteria changed | `criteriaVersion` differs from the superseded row's |
| `clock` | same criteria, same patient data, but a staleness window elapsed | criteriaVersion equal; re-evaluating the patient's rows at the OLD row's `evaluatedAt` reproduces the OLD verdict |
| `state` | the patient's data actually changed | criteriaVersion equal; re-evaluating at the old clock does NOT reproduce the old verdict |

The `clock` vs `state` test is exactly AUDIT-223's two-clock discriminator, and it works for the same
reason: `buildPatientEvalContext(patient, nowMs)` is pure over rows plus a clock, so evaluating the
same rows at two clocks isolates the clock's contribution. The `criteria` axis is checked first
because it is decidable without re-evaluation - a version comparison - and because a criteria edit
explains the flip completely, making the clock test unnecessary.

Section 1.3 is why this matters: two of the three measured verdict movements to date were `clock`
movements with no data change at all. Collapsing them into "the verdict changed" would be true and
useless.

### 3.4 (d) The refresh mechanism

A dedicated batch runner, following the AUDIT-218/225 shape that this repo has now proven four times:

- **Dedicated script**, not folded into an existing runner (`backend/src/scripts/`).
- **Dry-run default**, `--execute` operator-gated.
- **Mutation-safe pagination**: page over `hospitalId` + `isActive`, never over a column the runner
  writes - the AUDIT-225 lesson, where paging over the filter being mutated silently skipped 125 rows.
  Patients are not written here, so the hazard is lower, but the shape is free.
- **Full-scan invariant** (`assertFullScan`): refuse to report success on a short walk.
- **buildSha self-gate**: abort unless the running image is the expected commit (AUDIT-219/221).
- **Run record** per AUDIT-224: a `TrialMatchRun` row opened up-front (so a crash leaves evidence) and
  closed with tallies - evaluated, created, superseded, confirmed, completeness fraction, outcome.
- **Completeness gate** per AUDIT-193/223: below 0.9 evaluated/stored, do not supersede anything. A
  truncated run must never mass-supersede.

Cost per full run: the 451s of section 1.1, plus write time for changed verdicts.

**Invalidation triggers, with scope stated:**

| trigger | in scope for the first implementation? |
|---|---|
| Scheduled staleness refresh (nightly) | **In scope.** The baseline mechanism; everything else is an optimisation on top. |
| Criteria edit on a trial | **In scope, narrow form**: re-evaluate that one trial across the tenant (1/4 of a full run). The criteria-edit path is a single service chokepoint, so hooking it is cheap and it is the trigger most likely to produce a *wrong* stored verdict rather than merely a stale one. |
| New trial added | **In scope**, same narrow form. |
| Patient data ingest | **Deferred.** Correct in principle - an ingest changes `state` - but the ingest path is batch and high-volume, and per-patient re-evaluation on write needs its own design to avoid amplifying ingest cost. The nightly refresh covers it with at most one day of lag; section 3.6 makes that lag visible. |
| Matcher code change (new `buildSha`) | **Deferred, flagged.** A matcher change can flip verdicts platform-wide (AUDIT-226 flipped one, and would have flipped 25,571 on a DAPT trial). The nightly run picks it up; a deploy-triggered full refresh is the tighter answer and is worth a follow-up. |

### 3.5 (e) The read path

- **`GET /trials/summary`** pivots to a `groupBy` over current rows (`supersededAt IS NULL`), indexed
  on `(hospitalId, trialId, status)` which already exists. Population-true and effectively instant.
  The 20s budget, the `complete: false` flag, and the sample banner all retire.
- **`GET /trials/:trialId/eligible-patients`** pivots to reading current rows joined to patients,
  keeping the AUDIT-227 cursor pagination (the page is now a cheap indexed read rather than an
  evaluation).
- **Evaluate-on-read is RETAINED, deliberately, in two places:**
  1. **The referral flow** (`POST /trials/:trialId/refer`) computes `matchStatusAtReferral` live. A
     referral is a clinical decision being recorded at an instant; binding it to a possibly-stale
     stored verdict would misrepresent what the clinician was looking at. It is one patient, so the
     cost is ~18ms.
  2. **Single-patient real-time checks** generally - a coordinator opening one patient and asking
     "why?" should get a fresh answer, not a cached one.

  The rule: **aggregates read persisted verdicts; single-patient decisions evaluate live.** Cost
  scales with patients-per-request, so the expensive path is exactly the one that gets persisted.

### 3.6 (f) Staleness honesty

Every persisted verdict carries `evaluatedAt`. The read path surfaces the **oldest** `evaluatedAt` in
the returned set as an explicit as-of, e.g. "eligibility as of 2026-08-03 02:00" - not a footnote,
the same prominence the sample banner has today.

**Staleness bound: 36 hours.** Chosen so a single missed nightly run is visible rather than silent,
without alarming on normal operation. Past the bound the UI marks the figures stale and names the
last successful run; it does **not** hide them (a stale honest number beats no number, provided it
says it is stale). A staleness breach is an operational signal that the refresh is not running.

This is the direct analog of the AUDIT-194 never-fire-on-absence discipline: the platform says what it
knows and when it knew it, and declines to imply currency it cannot back.

---

## 4. Rollout

Sequenced so each step is independently reversible, and so the constraint correction lands while it is
still free.

1. **Schema migration PR.** Drop the total unique, add the partial unique, add the provenance and
   lifecycle columns, add `TrialMatchRun`. **Trivially safe: the table is empty**, so no `23505` is
   possible and the DRIFT-58 rollout hazard does not exist. This must be first - after any bulk write
   it becomes a dedupe-then-constrain migration.
2. **Runner PR.** The batch evaluator per section 3.4, dry-run default, with tests. Ships inert: it
   writes nothing until executed.
3. **Endpoint pivot PR.** `/trials/summary` and `/eligible-patients` read persisted verdicts; the
   as-of surfaces; evaluate-on-read retained per section 3.5. **Sequenced after the first successful
   run**, not before - pivoting to an empty table would show zeros, which is the AUDIT-148 defect
   (an absent capability presented as a real one).
4. **The gated first full evaluation run.** Standing mutation protocol: Aurora snapshot -> dry-run
   reporting predicted volume -> operator execute-GO -> invariant battery -> idempotency re-run.
   - **Predicted row volume: 25,571 patients x 4 active trials = 102,284 rows** on first run (every
     pair is new, so every pair writes a current row).
   - **Wall-clock prior: 451s evaluation** plus insert time for ~102K rows; the dry-run supplies the
     real figure before the execute.
   - **Invariants to check:** exactly one current row per (patient, trial); total rows ==
     102,284; every row carries buildSha + criteriaVersion + evaluatedAt; the per-trial distribution
     matches the independently-measured population figures (**HFrEF 68/24,319/1,184**, Lipid per the
     measurement of the day - noting section 1.3 means the Lipid figure will have drifted, and the
     prediction must be re-derived at execute time, not taken from this document); zero superseded
     rows on a first run; the partial unique index held; run record COMPLETED with completeness 1.0.
   - **Idempotency:** an immediate second run must supersede nothing and create nothing - only
     `lastConfirmedAt` advances.
5. **UI banner retirement.** The sample banner and `complete: false` handling come out once the read
   path is population-true; the as-of indicator replaces them.

---

## 5. Interaction checks

### 5.1 `matchStatusAtReferral` vs the persisted verdict - two records, different jobs

`TrialReferral.matchStatusAtReferral` is an **immutable historical fact**: what the matcher said at
the instant a clinician chose to refer. `TrialMatch` is the **current** verdict, superseded as things
change.

They will legitimately disagree, and that disagreement is meaningful, not a bug: a patient referred as
INDETERMINATE whose missing lab has since arrived may now be ELIGIBLE. Neither record should be
"corrected" to match the other. A referral is never re-derived; a match is never frozen.

**Design consequence:** the referral flow keeps evaluating live (section 3.5) rather than reading the
persisted verdict, because binding a decision record to a cache would corrupt exactly the property
that makes it evidence.

### 5.2 The CT.gov discovery feed boundary stays explicit

`ResearchServiceLineView` renders a live ClinicalTrials.gov v2 query (AUDIT-147: static condition
query, no PHI sent). Those trials are **not curated, not in `clinical_trials`, and never evaluated** -
no criteria exist for them in structured form, and NLP-parsing free-text criteria is the
error-prone clinical-risk path AUDIT-148 explicitly rejected.

Persistence does not change this. The two lists must remain visually and structurally distinct: a
discovered trial can never show an eligibility count, and no persisted verdict can ever reference one.
Worth an explicit test at implementation time - the failure mode is a well-meaning join.

### 5.3 The reserved `system:` actor convention

Supersession is performed by a runner, not a human. If any actor field is added, it uses the reserved
`system:` prefix per `gapResolutionActor.ts` - e.g. `system:trialmatch-refresh` - so the existing
`clinicianResolvedWhere` style of filter keeps working by construction and machine activity never
inflates a human-throughput metric (the AUDIT-187 class the AUDIT-222 blast-radius pass fixed).

No resolution-like clinician semantics exist on `TrialMatch` today: nobody dismisses or defers a
match. If that is ever added, the AUDIT-223 preservation guard applies - key it on the actor field,
never on a timestamp, because a REFERRED-but-open match is the analog of the deferred gap that guard
exists to protect.

---

## 6. Open questions for the operator

1. **`criteriaVersion` mechanism**: content hash (recommended) vs bumped integer vs both (section
   3.3).
2. **Staleness bound**: 36h proposed (section 3.6).
3. **Deploy-triggered refresh** on matcher change: deferred as proposed, or in scope (section 3.4)?
4. **Ingest-triggered invalidation**: deferred as proposed, accepting up to one day of lag made
   visible by the as-of indicator?

No implementation is scoped until these are ruled on.
