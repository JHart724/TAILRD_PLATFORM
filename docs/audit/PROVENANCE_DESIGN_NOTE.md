# Provenance design note - source ledger + currency gate

**Status:** DESIGN AUTHORITY. Authored 2026-08-21 on `docs/provenance-design-note`, cut from `main` at `eb734f8`
(the AUDIT-332 phantom-citation sweep, PR #592).

**What this document is:** the design the migration PRs implement. It decides structure, field shapes, lifecycle
semantics, gate behaviour and ordering. It builds nothing. No schema is executed here, no migration script is
written here, no register count moves here.

**What this document is not:** it is not a re-adjudication of any clinical verdict, and it does not change rule
counts, coverage, or threading. See section 8.

**Companions:** `docs/audit/AUDIT_METHODOLOGY.md` (sections 2, 4, 9.2 are load-bearing here),
`docs/audit/AUDIT_FINDINGS_REGISTER.md` (AUDIT-332), `docs/audit/AUDIT_222_RULEID_ASSIGNMENT.md`,
`docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md`, `CLAUDE.md` sections 8 and 20.

---

## 1. Requirement

The operator requirement, verbatim:

> every algorithm has a clear basis of where it came from and why

That sentence names five properties, and the platform currently has partial coverage of one of them. Naming them
separately is the point of this section, because the AUDIT-332 arc repeatedly mistook one for the whole.

| Property | Question it answers | Present today |
|---|---|---|
| **ORIGIN** | Where did this rule come from - which commit, PR, session, author? | Partial, commit-granular |
| **BASIS** | Which document, and *where inside it* - section, recommendation, COR row? | Document name only, no pointer |
| **RATIONALE** | Why THIS threshold, THIS population, THIS class? | Absent |
| **STATE** | Is the basis still current, superseded, contradicted, or absent? | Absent (a date exists, it means something else) |
| **CHAIN** | When the basis moved, what replaced it, and did the rule follow? | Absent |

**Currency is one property of provenance, not the whole of it.** AUDIT-332 was a CURRENCY finding - a citation
naming a year that does not exist - and correcting its 52 sites left BASIS, RATIONALE, STATE and CHAIN exactly
where they were. A ledger that only fixes years would repeat that mistake at larger scale. The design below
carries all five.

---

## 2. Current state, measured

All figures below are from the read-only inventory of 2026-08-20 and were re-derived on 2026-08-21 against
`main` at `eb734f8`. They are measurements, not estimates, except where marked.

### 2.1 BASIS is net-new

Across **775 `guidelineSource` rows** (404 registry entries in the six `*.code.json` extracts plus 371 inline
`evidence` objects in `gapRuleEngine.ts`), the count of section numbers, recommendation-table pointers, DOIs,
PMIDs and URLs is **zero**. Not sparse - zero. Every citation is a document *name*, and a clinician who wants to
check a rule against its guideline gets no closer than the front cover.

BASIS is therefore not a backfill. It is a new field with no existing values to migrate.

### 2.2 RATIONALE is absent entirely

No structured field records why a threshold, population or class was chosen. A repo-wide grep finds **three**
`// Rationale:` prose comments in `gapRuleEngine.ts`, all attached to FDA-label safety carve-outs, plus
occasional prose in the batch audit documents. Nothing machine-readable, nothing per-row, nothing required.

The `evidence` object has a `triggerCriteria` array, which records WHAT fires the rule. It does not record WHY
that is the right trigger.

### 2.3 STATE does not exist; the date that looks like it means something else

Every one of the 404 registry entries carries `lastReviewDate` and `nextReviewDue`, 404/404, no nulls. The
distribution shows what they are:

```
2026-04  253      2026-05    4      2026-06  144      2026-07    3
two-month concentration: 397/404 = 98.3%
```

**`lastReviewDate` is the AUTHORING date, not a review date.** 98.3 percent of it lands in the two months of the
module buildout, because that is when the rules were written. `nextReviewDue` is `lastReviewDate + 6 months`, a
computed constant with no variance, and **nothing consumes it** - no gate reads it, no job alerts on it, no
surface displays it. It is a field that looks like currency tracking and is not.

This matters for the migration: seeding a real verification date into `lastReviewDate` would destroy the
authoring record. Per the Q4 ruling, a NEW field `lastVerifiedDate` is added and `lastReviewDate` is left
untouched.

### 2.4 ORIGIN is commit-granular and degraded

`AUDIT_222_RULEID_ASSIGNMENT.md` records the identity provenance of all 371 `gaps.push` sites:

```
registry-binding  263  70.9%     adopted from RUNTIME_GAP_REGISTRY via the canonical binding artifact
generated         108  29.1%     frozen slug: id, no confident registry binding
```

So roughly 70-80 percent of rules can be traced to an originating commit, and the remaining 108 carry generated
slugs whose lineage is weaker. Two structural degradations sit underneath that number:

- **The 2026-04-08 split.** `git blame` attributes 6,626 lines of `gapRuleEngine.ts` - the single largest block -
  to `5d08e91 refactor(CLINICAL): split gapDetectionRunner`. Everything authored before that split has its
  authorship collapsed into the refactor commit. Per the Q5 ruling, pre-split origin is marked
  **unrecoverable** rather than guessed.
- **Commit granularity, not row granularity.** A commit that lands 34 gaps attributes all 34 to itself. Per Q5,
  existing rows get commit-granular backfill only; row-granular origin is captured **forward** from the
  migration onward.

### 2.5 The citation corpus is a string set, not a document set

```
775 guidelineSource rows
279 distinct strings (exact)
~193 estimated distinct documents
 34 doc-keys carrying more than one string variant
```

The worst clusters: the 2020 VHD guideline is written **16 different ways**, the 2022 HF guideline **10**, the
2024 PAD guideline **10**. This is the title-drift class. Per the Q2 ruling it is resolved **structurally** - by
deriving the display string from the ledger - and **not** by a normalization pass over the existing strings.

### 2.6 Coverage and the uncited remainder

```
603  active spec gaps across 6 modules
313  crosswalk-reachable evidence records          51.9% of active
290  active gaps with no reachable evidence record
105  CX gaps, zero canonical artifacts by design   (Q8: intended until activation)
395  catalog rows with no reachable citation       (290 active + 105 CX, of 708)
```

**Figure correction, recorded because the migration sizes off it.** The uncited count has been stated as 405 in
handoff. That derives from a superseded reachability figure of 303, which under-counted by 10 cross-module
bindings - spec gaps in one module bound to a registry id owned by another. The corrected reachable count is
**313** and the uncited remainder is therefore **395**, not 405. M4 sizes to 395.

### 2.7 Four phantom-citation instances, corrected, class OPEN

AUDIT-332 (HIGH/P1) corrected 52 sites across four instances: A the `2022` chest-pain year (43 sites, the only
instance in running code), B GAP-CX-079's `2024 ACC/AHA lipid update` (1), C the `2024 HRS` pacing backlog (5,
documentation only), D `2022 ACC/AHA Perioperative Guidelines` (3, including the AUDIT-035 remediation plan that
would have propagated the phantom into new code).

Per the Q3 ruling the **class stays OPEN**, and its closure is gated on the currency gate in section 6, not on
the instance fixes. Correcting 52 sites left the next wrong year exactly as invisible as these four were.

---

## 3. The source ledger

### 3.1 Artifact

A new canonical artifact: **`docs/audit/canonical/SOURCE_LEDGER.json`**.

It joins the canonical set governed by `AUDIT_METHODOLOGY.md` section 2.1, and it is PARSED-CANONICAL-DOC under
`CLAUDE.md` section 19.4 from the moment the first gate reads it - which means the same PR that makes it parsed
must list it there. Adding a parsed doc without listing it is the AUDIT-229 defect, and this note names it now so
that step is not left to be remembered.

### 3.2 Granularity

**One entry per DOCUMENT** (Q1 ruling). Not per citation string, not per rule, not per recommendation.

**[CORRECTED 2026-08-22 - M1 Phase 1 measured this. The real figure is ~123, not ~193-210. See the SIZING CORRECTION below; the original estimate is retained here per section 18.]** Expected size **~193-210 entries**: the ~193 distinct documents behind the current corpus, plus the standalone
trials (INVICTUS, COMPASS, CAPRIE, AFFIRM-AHF, PARADIGM-HF and siblings) and FDA labels (Pradaxa, Effient,
Xarelto, Kerendia) that appear today as trailing clauses rather than as documents in their own right.

A citation like `2020 ACC/AHA VHD Guideline; INVICTUS trial` therefore becomes **two** ledger references, not one
compound string - which is exactly how the 16-way title drift on that document stops being expressible.

### 3.3 Entry shape

```json
{
  "sourceId": "acc-aha-2021-chest-pain",
  "society": "ACC/AHA/ASE/CHEST/SAEM/SCCT/SCMR",
  "title": "Guideline for the Evaluation and Diagnosis of Chest Pain",
  "publicationYear": 2021,
  "docType": "guideline",
  "status": "current",
  "successorId": null,
  "supersedeReason": null,
  "externalPointer": "10.1161/CIR.0000000000001029",
  "verifiedVia": "doi",
  "addedDate": "2026-08-2X",
  "addedBy": "M1 ledger authoring pass"
}
```

| Field | Notes |
|---|---|
| `sourceId` | Stable slug, `society-year-topic`. **Never reused, never renamed.** The rule binding depends on it. |
| `society` | Full multi-society attribution as published. |
| `title` | The canonical display string. Section 4 derives `guidelineSource` from this plus the year. |
| `publicationYear` | Integer. Adjudicated against an authoritative source at M1 - this is where the repo-wide phantom screening actually completes. |
| `docType` | `guideline` / `focused-update` / `scientific-statement` / `trial` / `FDA-label` / `consensus` / `registry-standard` |
| `status` | `current` / `superseded` / `retracted` |
| `successorId` | The entry that replaced this one. Populated on supersession, null otherwise. This field IS the CHAIN property. |
| `supersedeReason` | Free text. Distinguishes "a newer edition exists" from "the recommendation was REVERSED" - see section 5. |
| `externalPointer` | DOI or stable URL where one exists, **nullable**. Not every consensus statement or registry standard has one, and a required-but-fabricated pointer would be a new phantom class. |
| `verifiedVia` | **Required, never null.** How `publicationYear` was adjudicated: `doi` / `society-publication-page` / `pubmed-record` / `fda-label-page` / `operator-attestation`. Entries with no DOI or stable page must still say how they were checked, so an unverifiable entry is VISIBLE rather than silently indistinguishable from a verified one. Ruling 10.3. |
| `addedDate` / `addedBy` | Ledger-side origin. |

### 3.4 Ledger edit discipline

Ledger edits follow **supersede-not-overwrite** (`AUDIT_METHODOLOGY.md` section 18). A superseded document has
its `status` flipped and its `successorId` populated. **Entries are never deleted and years are never edited in
place** - because a rule pinned to `acc-aha-2021-chest-pain` must keep resolving after the 2027 edition lands, and
because the historical record of what a rule cited when it was written is itself provenance.

Correcting a genuine data-entry error in an entry is the one exception, and it is an operator-gated edit with a
dated note, not a silent fix.

---

## 4. Row binding

### 4.1 Rules pin to `sourceId`, never to display strings

The `evidence` object gains six fields. Existing fields are unchanged.

```
evidence: {
  triggerCriteria:        [...]         // unchanged
  classOfRecommendation:  '1'           // unchanged
  levelOfEvidence:        'A'           // unchanged
  exclusions:             [...]         // unchanged

  sourceIds:        ['acc-aha-2021-chest-pain'],   // NEW  array, ordered primary-first
  sourceAnnotation: null,                          // NEW  nullable
  basisPointer:     null,                          // NEW  nullable
  rationale:        null,                          // NEW  nullable
  origin:           { ... },                       // NEW
  lastVerifiedDate: null,                          // NEW  nullable
}
```

| Field | Shape | Purpose |
|---|---|---|
| `sourceIds` | array of slugs, **ordered primary-first** | The BASIS binding. Array because dual citations are real and common; ordered because the first entry is the governing document and the rest are supporting. |
| `sourceAnnotation` | nullable string | For trailing clauses that qualify rather than cite - `"(INVICTUS)"`, `"(SCOT-HEART, PROMISE)"`. Where the clause is a real trial it becomes a ledger entry and a second `sourceId` instead; the annotation is for genuinely non-document qualifiers. |
| `basisPointer` | nullable string | Section, recommendation-table, or COR-row reference *within* the document. **This is the net-new BASIS property from section 2.1.** Nullable because it is populated in M6, not at binding time. |
| `rationale` | nullable free text | Why THIS threshold and THIS population. The RATIONALE property. Nullable for the same reason. |
| `origin` | `{ commit, pr, date, granularity }` | `granularity` is `'row'` or `'commit'`, per Q5. Forward rows get `'row'`; backfilled rows get `'commit'`; pre-2026-04-08-split rows get `'commit'` with an explicit unrecoverable marker. |
| `lastVerifiedDate` | nullable date | When a human last checked this row against its source. Distinct from `lastReviewDate`, which stays as the authoring date it has always been (Q4). |

### 4.2 `guidelineSource` becomes derived

This is the structural resolution of the title-drift class (Q2).

Today `guidelineSource` is an authored string, and 278 of them describe ~123 documents (figures corrected 2026-08-22; the note originally read 279 and ~193). After the migration it is
**generated at regen time** from `sourceIds` against the ledger: look up each id, compose
`publicationYear + title`, join. It is written by the pipeline into the derived artifacts, exactly as
`AUDIT_METHODOLOGY.md` section 2.2 already governs derived outputs.

Three consequences worth stating plainly:

1. **A document can be written only one way**, because it exists in exactly one ledger entry. The 16-way VHD
   drift becomes unrepresentable rather than merely discouraged.
2. **A wrong year becomes unrepresentable in a rule.** A rule cannot cite a year at all; it cites an id. The year
   lives in one place, adjudicated once, in the ledger.
3. **No normalization pass is needed or wanted** (Q2). The existing 279 strings are not rewritten in place; they
   are *replaced* by derivation at M2. Attempting a string-normalization sweep first would be the title-drift
   equivalent of correcting 52 sites and leaving the mechanism intact.

---

## 5. Five-state lifecycle

Rule state is **DERIVED**, never hand-set: it is a function of `ledger.status` for the row's primary `sourceId`
crossed with the row's own verification state. Nothing writes a rule's lifecycle state directly, which is what
keeps it from drifting away from the ledger the way `lastReviewDate` drifted away from meaning anything.

| State | Derivation | Firing behaviour |
|---|---|---|
| **CURRENT** | ledger `current` + row verified | Fires normally, no label. |
| **SUPERSEDED** | ledger `superseded`, `supersedeReason` is a newer edition | **Fires, labeled stale-evidence.** |
| **CONTRADICTED** | ledger `superseded`/`retracted` where `supersedeReason` records a REVERSAL | **Suppressed** until re-verified. |
| **NO_SOURCE_EXISTS** | explicit marker, no governing document | **Fires, labeled internal-heuristic.** |
| **UNREVIEWED** | default - not yet through the pipeline | **Fires, labeled unreviewed.** |

### 5.1 Why SUPERSEDED fires rather than suppressing

**Silently suppressing a firing rule in a clinical decision support product is itself a safety event.** A gap that
stops appearing because its guideline got a new edition looks identical, from the care team's side, to a patient
who no longer has that gap. The clinician loses a true finding and is given no signal that anything changed.

A superseded edition is also usually still substantially right - the 2022 HF guideline did not make the 2013 one
dangerous. So SUPERSEDED fires with a visible stale-evidence label, and the label is the prompt to re-verify.

### 5.2 Why CONTRADICTED suppresses

CONTRADICTED is the opposite case and the reason the two-tier split exists. It is not "a newer document exists",
it is "current evidence REVERSES this recommendation". Continuing to surface a gap whose therapy current guidance
recommends against is an active harm, not a stale one.

The ledger must therefore record **reversal**, not merely replacement - which is what `supersedeReason` is for.
`successorId` alone cannot carry this distinction, and a design that only tracked "was it replaced" would
mis-handle every reversal as a stale-label case.

### 5.3 Why NO_SOURCE_EXISTS is legitimate

Per Q1 and the fixed handoff decision, **cite-all-708 with NO_SOURCE_EXISTS as a legitimate terminal state.** The
2026-08-19 currency audit found 22 administrative rules that no clinical guideline governs, plus a handful sitting
in genuine gaps in US guideline coverage. Those are not defects and must not be forced into a fabricated citation
- that is precisely how GAP-CX-079 acquired a phantom.

An honest `NO_SOURCE_EXISTS` marker with a visible internal-heuristic label is the correct terminal state, and it
is distinguishable in every gate from "nobody has looked yet" (UNREVIEWED).

### 5.4 UNREVIEWED is the honest default

The 395 uncited rows enter as UNREVIEWED and fire with a label. They are not suppressed, because they have been
firing all along and suppressing them would be a coverage regression dressed as a safety improvement; and they are
not silently treated as CURRENT, because nobody has checked them.

---

## 6. CI gates

### 6.1 The three gates

**Gate 1 - `validateEvidenceObjects`, existing, UNCHANGED.** Internal consistency: the evidence object against its
own rule's `recommendations` text and preceding comment. Hardened to fatal on both tiers under AUDIT-329. Current
baseline 371/371 rows, 0 inconsistencies, 0 comment divergences, 387 non-failing HYGIENE.

### SIZING CORRECTION 2026-08-22 (M1 Phase 1, measured)

The ~193-210 estimate above is **wrong by roughly 40 percent**. M1 Phase 1 re-extracted the census at `b7e1776` and grouped it properly:

```
distinct guidelineSource strings   278   (279 pre-AUDIT-332; the sweep netted -1, not -2,
                                          because the perioperative pending tag is itself a new string)
raw grouping                       173   143 documents + 16 trials + 14 FDA labels
after abbreviation-synonym merge   123    93 documents + 16 trials + 14 FDA labels
```

**WHY THE ORIGINAL ESTIMATE WAS HIGH: it under-merged abbreviation variants.** The first pass grouped on a raw word set, so `2020 ACC/AHA VHD Guideline` and `2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease` counted as two documents. A synonym-expansion pass (VHD -> valvular heart disease, HF -> heart failure, AF -> atrial fibrillation, and 25 more) collapsed **84 such pairs**, including the 2017 ventricular-arrhythmia guideline written **seven** different ways. The estimate was measuring title drift, not documents - which is the same confusion the ledger exists to end.

**M1 AND M2 EFFORT SHOULD FOLLOW THE CONCENTRATION CURVE, NOT THE ENTRY COUNT.** Measured:

```
top 10 entries  ->  65.0% of all clause-refs
top 20 entries  ->  74.4%
top 30 entries  ->  79.1%
top 50 entries  ->  85.9%
```

Six entries carry 25+ rows each; 150 of the 123 entries' peers sit at 1-4 rows. Adjudicating the top 30 buys 79 percent of the corpus. **The tail is long, cheap per entry, and low-consequence** - a wrong year on a 1-row entry misleads one rule, a wrong year on the 154-row VHD entry misleads a sixth of the corpus. Sequence M1 by rows-bound descending.

### GATE-2 SCOPE CORRECTION 2026-08-22 (M1 Phase 1 found two shapes this gate does not catch)

Section 6.3's coverage table was built from the four AUDIT-332 instances, all of which are **wrong-year**. Phase 1 adjudication surfaced two further shapes, and **a year-only comparator passes both**:

- **WRONG SOCIETY, right year.** `2022 ACC/AHA Guideline for Cardio-Oncology` (4 rows). The 2022 cardio-oncology guideline is **ESC**; no ACC/AHA cardio-oncology guideline exists. A check asking only "does a 2022 cardio-oncology document exist" says yes.
- **WRONG TITLE, right year and society.** `2023 AHA/ACC Guideline Update: Colchicine for Atherosclerotic CVD` (2 rows) and `2024 HRS Expert Consensus on Pulsed Field Ablation` (2 rows). Neither document exists; the recommendations live inside the 2023 Chronic Coronary Disease guideline and the 2024 EHRA/HRS/APHRS/LAHRS AF ablation consensus respectively - both real, both already separate entries.

**THE DESIGN CHANGE, and it is small if made now and expensive after M2 binds 313 rows:** M2 binding is **IDENTITY-LEVEL, not year-level**. A row binds to a ledger entry only when **society AND title AND year** reconcile against that entry. Consequences, all mandatory:

1. **No silent mapping.** A discrepant string may NEVER be quietly bound to the plausible-looking entry. Every string-to-entry resolution that required a correction is recorded as a **`bindingNote`** on the row, naming the string as authored and the entry it truly resolves to.
2. **Unreconcilable strings do not bind.** They surface for adjudication rather than defaulting to the nearest match, because a confident wrong binding is worse than an unbound row - it launders a phantom into a ledger-backed citation.
3. **Gate 2 asserts identity, not existence.** `sourceId` resolves AND the resolved entry's society and title match what the row claims.

**POST-M2 THIS CLASS CLOSES STRUCTURALLY, which is why the correction is worth making rather than patching:** after M2 no rule carries an authored society, title or year at all. All three are derived from the ledger entry the `sourceId` points at, so a wrong-society or wrong-title citation becomes **unrepresentable** rather than merely detectable - the same argument section 4 makes for wrong-year.

### CLASSIFIER CORRECTIONS FOR M2 (M1 Phase 1)

- **Seven trials are misclassified as documents** because they carry a year: SAMMPRIS, VEST, CAST, GiACTA, STELLAR, FINEARTS-HF, RHAPSODY. They re-class to `docType: trial` at M2. This is a grouping-script defect, not a citation defect.
- **`2012 Stable IHD Guideline` merges** into the existing `2012 ACCF/AHA/ACP/AATS/PCNA/SCAI/STS Guideline for Stable Ischemic Heart Disease` entry - an abbreviation variant the synonym pass did not reach because it carries no society token at all.
- **`docType` gains `study`** for systematic reviews and meta-analyses cited as primary basis (operator ruling). First member: DiNicolantonio 2013, thiamine in heart failure.

**Gate 2 - currency gate, NEW.** For every rule row:
- every `sourceId` resolves to a ledger entry - **an unresolvable id is a hard fail**;
- the derived lifecycle state matches the ledger status (a row whose source is `superseded` must carry the
  SUPERSEDED label; a CONTRADICTED source must be suppressed);
- `publicationYear` is never read from the rule, because the rule does not carry one.

**Gate 3 - presence gate, NEW.** Every `gaps.push` site carries either `sourceIds` or an explicit
`NO_SOURCE_EXISTS` marker. UNREVIEWED passes with its label. This gate's job is to make sure no row escapes Gate
2 by having nothing to check.

Per the fixed handoff decision, the check is **against a pinned ledger** - the gate compares to the committed
`SOURCE_LEDGER.json` at that commit, not to a network source. The gate is deterministic and offline.

### 6.2 Rollout

Gates land **warn-first with a dated flip-to-error** (Q7), following the AUDIT-329 pattern: measure the count,
publish it, flip when it is zero or when the remediation is scoped. The flip date is recorded in the register
entry at landing time, not left open.

### 6.3 Which AUDIT-332 phantoms each gate would have caught

Stated plainly, including where the answer is "none", because a gate design that claims more coverage than it has
is the AUDIT-327 defect.

| Instance | Where it lived | Caught by | How |
|---|---|---|---|
| **A** `2022` chest-pain, 43 sites | 31 in `gapRuleEngine.ts`, 12 in `CAD.code.json` | **Gate 2** | The rule would pin to `acc-aha-2021-chest-pain`. A `2022` chest-pain id has no ledger entry, so the id is unresolvable and the gate hard-fails. More strongly: after M2 the rule carries no year at all, so the defect is unrepresentable. |
| **D** `2022` perioperative, 2 of 3 sites | `gapRuleEngine.ts:2680`, `EP.code.json:1383` | **Gate 2** | Same mechanism. The dual-citation shape is handled natively: `sourceIds` is an ordered array, so the real AF guideline and the perioperative document are separate ids and one can fail to resolve without corrupting the other. |
| **B** GAP-CX-079 lipid update, 1 site | `CLINICAL_KNOWLEDGE_BASE_v4.0.md` | **Gate 2 ONLY IF spec rows also bind `sourceIds`** | The KB is spec-side, not rule-side. As scoped above the gates read rule rows. Covering B requires extending the binding to spec rows - see open item 10.1. |
| **C** `2024 HRS` pacing, 5 sites | `BUILD_STATE.md`, 3 EP batch docs | **NONE** | These are backlog prose in narrative documents. No gate reads them and none is proposed that would. |
| **D**, 3rd site | `AUDIT_FINDINGS_REGISTER.md` remediation plan | **NONE** | Same reason, and this is the uncomfortable one: it is the site that would have propagated the phantom into new code. |

**The honest summary: the gates catch the instances that reach a clinician, and do not catch phantom citations in
narrative documentation.** That is a real limitation, not a rounding error - 2 of the 4 instances and 8 of the 52
sites sit outside any proposed gate. It is stated here rather than discovered later.

---

## 7. Migration path

Ordered. Each phase is its own PR, each runs the full section 9.2 eight-stage regen, each lands independently.

| Phase | Scope | Notes |
|---|---|---|
| **M1** | Author `SOURCE_LEDGER.json`, ~193-210 entries | Each entry's `publicationYear` adjudicated against **society publication pages plus DOI resolution**, with `externalPointer` captured at adjudication time and `verifiedVia` recording the method **per entry** (ruling 10.3) - so an entry with no DOI or stable page is visibly attested rather than silently unverified. **This is where the repo-wide phantom screening the AUDIT-332 sweep left incomplete actually completes** - the sweep covered chest-pain and perioperative context only. Ledger-only PR; no rule touched. **M1 is UNBLOCKED.** |
| **M2** | Binding pass, 313 crosswalked rows | Mechanical: string -> `sourceId` via the census clusters, which already group the 279 strings into ~193 documents. `guidelineSource` flips to derived. Largest diff of the arc; no clinical judgment. |
| **M3** | Seed `lastVerifiedDate` | From the 2026-08-19 currency audit for its 541 VERIFIED rows. Q4: NEW field; `lastReviewDate` untouched. |
| **M4** | The 395 uncited rows | Enter as UNREVIEWED. `NO_SOURCE_EXISTS` assigned where the currency audit adjudicated UNVERIFIABLE-with-no-citable-source (the 22 administrative rules and the US-guideline-gap set). Sizes to **395**, not 405 - see section 2.6. |
| **M5** | Gates flip warn -> error | **This is the AUDIT-332 closure condition** (Q3). The class closes here, not at M2. |
| **M6** | `rationale` and `basisPointer` population | **Deferred, gated on operator bandwidth.** Tiered: COR Class 1 and safety-class rules first (Q6), all 708 eventually, UNREVIEWED as the interim state for the rest. |

CX rows are excluded throughout and enter the same pipeline when CX activates (Q8). Their zero-artifact state is
intended, not a gap.

---

## 8. What this does not do

- **No re-adjudication of the currency audit's clinical verdicts.** Its 541 VERIFIED / 18 THRESHOLD DRIFT /
  13 CONTRADICTED / 10 SUPERSEDED / 126 UNVERIFIABLE / 25 EVIDENCE WATCH stand as issued. This design gives them
  somewhere to live; it does not second-guess them.
- **No threading work and no coverage change.** Coverage stays at `313/603 (51.9%)` across the whole arc.
- **No CX activation** (Q8).
- **No title normalization pass** (Q2) - drift is resolved by derivation, not by rewriting strings.
- **No rule suppression except CONTRADICTED**, and that only where the ledger records a reversal.
- **Rationale is scoped IN but sequenced LAST.** It is a real deliverable, not a wish; M6 is deferred on
  bandwidth, not dropped.

---

## 9. Rollback

Every step is designed to be reversible without a data migration:

- **The ledger is additive.** `SOURCE_LEDGER.json` is a new file. Deleting it reverts M1 entirely.
- **The evidence fields are additive and nullable.** `sourceIds`, `sourceAnnotation`, `basisPointer`,
  `rationale`, `origin`, `lastVerifiedDate` all default null/absent. Nothing existing changes shape.
- **`guidelineSource` derivation is flag-controlled.** Reverting the flag restores authored strings, which remain
  in git history and can be restored verbatim.
- **Warn-first gates are removable.** Until the M5 flip, no gate can block a PR, so any gate can be deleted with
  no unwind.
- **`lastReviewDate` is never touched**, so no rollback is required for it (Q4).

The one genuinely one-way step is M5. That is deliberate: it is the point at which the mechanism starts holding,
and it is the operator-gated flip.

---

## 10. Operator items - RULED 2026-08-21

The eight rulings on record decided the structure. Three items were raised as genuinely undecided at authoring and were **ruled by the operator on 2026-08-21**. Per `AUDIT_METHODOLOGY.md` section 18 the original question and recommendation text is RETAINED below each item rather than replaced; the ruling is appended. **No item in this section is open.**

**10.1 Do spec rows bind `sourceIds`, or only rule rows?** Section 6.3 shows instance B (GAP-CX-079) is caught
only if the KB's spec rows also bind. Extending binding to spec rows widens M2 by up to 603 rows and makes the
KB a second parsed-canonical surface; not extending it leaves spec-side phantoms uncaught. **Recommendation:**
rule rows only for M1-M5, revisit after the mechanism is proven, because the spec side does not reach a clinician.

> **RULED 2026-08-21: rule rows only through M5.** Spec-row binding is recorded as a possible **M7**, to be decided after M5 rather than now. RATIONALE: the gates own the clinician-facing surface, and instance B is clinician-invisible - GAP-CX-079 is an unimplemented CX row that reaches no care team. Widening M2 by up to 603 rows to catch a defect that cannot reach a patient would buy coverage in the wrong currency. The decision is deferred, not declined: M7 exists as a named phase.

**10.2 Is a phantom citation in narrative documentation in scope at all?** Instances C and D-third - 8 of the 52
sites - sit in backlog prose and remediation plans that no gate reads. A lint over `docs/**` for
year-bearing citation strings not present in the ledger is buildable. **Recommendation:** file as a separate LOW
finding after M5; the D-third site shows the propagation risk is real but the frequency is low.

> **RULED 2026-08-21: a separate LOW finding, filed after M5.** Not in this arc. **THE CONTAINMENT THAT MAKES THIS SAFE TO DEFER:** after M2, `guidelineSource` is DERIVED from the ledger, so a phantom year sitting in backlog prose **can no longer propagate into the engine** - the year an implementing author reads in a remediation plan is not the year the rule will carry, because the rule carries a `sourceId` and the year comes from the ledger. That is precisely the AUDIT-332 instance-D-third failure mode (a remediation plan queued to propagate a phantom into new code), and M2 closes the path structurally. What remains after M2 is a documentation-accuracy problem, which is what LOW describes.

**10.3 What is the authoritative source for `publicationYear` adjudication at M1?** Section 16 of the
methodology fixes external-verification sources for RxNorm, LOINC and ICD-10, but names none for guideline
publication years. M1 needs one before it starts, or it reproduces the codebase-trust failure that AUDIT-069
established is insufficient. **Recommendation:** society publication pages plus DOI resolution, with the
`externalPointer` captured at adjudication time so the check is reproducible.

> **RULED 2026-08-21: society publication pages plus DOI resolution, `externalPointer` captured at adjudication.** ADDITION beyond the recommendation: entries with no DOI and no stable page must record their verification method in a **required `verifiedVia` field** (section 3.3), so reproducibility is documented **per entry and never silent**. This is the AUDIT-069 lesson applied to a new corpus - the failure mode there was not that a code was wrong but that nothing recorded how it had been checked, which made a wrong one indistinguishable from a right one. A nullable `externalPointer` plus a required `verifiedVia` keeps honest gaps visible without inviting a fabricated pointer to fill them. **M1 IS UNBLOCKED.**
