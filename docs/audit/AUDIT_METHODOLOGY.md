# TAILRD Clinical Audit Methodology — Canonical Reference

**Version:** 1.0
**Status:** ACTIVE — contract for v2.0 audit work
**Created:** 2026-05-04
**Replaces / supersedes:** ad-hoc methodology in PHASE_0B_CLINICAL_AUDIT_FRAMEWORK.md (kept for historical context)
**Companion docs:** `docs/audit/AUDIT_FRAMEWORK.md` (parent backend audit framework), `docs/audit/AUDIT_FINDINGS_REGISTER.md` (findings register), `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` (CK v4.0, spec source)

---

## 0. How to read this document

This is the **contract**. Subsequent code under `backend/scripts/auditCanonical/` implements what this document mandates. Subsequent audit deliverables are derived artifacts rendered from canonical JSON per these rules. Hand-editing rendered markdown is rejected by CI.

If a future audit finding contradicts this document, update this document **first**, then the implementation, then the audits. Do not let methodology drift live in audit prose.

The canonical reference is structured for two audiences:
- **Audit author / agent** — reads sections 2-9 to perform an audit run.
- **v2.0 plan author / clinical reviewer** — reads sections 1, 3, 11 to consume audit output and drill from rendered markdown to canonical JSON.

---

## 1. Purpose

Define how clinical content audits work in TAILRD. Canonical reference for v2.0 PATH_TO_ROBUST authorship and all subsequent audit work, including module re-audits, new-module audits, and CI-gated audit regeneration.

Audit subject: each clinical gap defined in `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` (CK v4.0, 708 gaps across 7 modules) is classified against its implementation state in `backend/src/ingestion/gaps/gapRuleEngine.ts` (registry + evaluator), surfacing per-module readiness verdicts and v2.0 Phase 1 work-item lists.

Three goals, in order:
1. **Reconciliation accuracy** — every spec gap maps to its (possibly empty) implementation; every implementation maps to its (possibly empty) spec gap.
2. **Classification correctness** — each spec gap receives one of {`PRODUCTION_GRADE`, `DET_OK`, `PARTIAL_DETECTION`, `SPEC_ONLY`} based on objective rule-body evidence with line citations.
3. **Cross-module synthesis** — patterns (procedural-domain blind spots, broad-rule consolidation, registry-orphan ratios) are aggregated for v2.0 sequencing decisions.

---

## 2. Data model

The audit is built on **three canonical artifacts** (sources of truth, hand-edited where applicable) and **three derived outputs** (generated, never hand-edited).

```
+---------------+      +---------------+      +-----------------+
|  spec.json    |      |  code.json    |      |  crosswalk.json |
|  (extracted)  |      |  (extracted)  |      |  (authored)     |
+-------+-------+      +-------+-------+      +-------+---------+
        |                      |                      |
        +----------+-----------+                      |
                   |                                  |
           +-------v---------+                        |
           | reconciliation  |                        |
           |    .json        |                        |
           +-------+---------+                        |
                   |                                  |
                   +----------+-----------------------+
                              |
                  +-----------v-----------+
                  |  addendum markdown    |
                  |  (rendered)           |
                  +-----------+-----------+
                              |
                              v
                  +-----------------------+
                  |  cross-module         |
                  |  synthesis markdown   |
                  |  (rendered)           |
                  +-----------------------+
```

### 2.1 Canonical artifacts (committed to repo)

#### A. Spec extract — `docs/audit/canonical/<MODULE>.spec.json`

Mechanical extract from CK v4.0 of every gap in the module section. **No clinical inference.** What the spec literally says.

```jsonc
{
  "module": "VHD",                              // canonical module code
  "specSource": "docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md",
  "specSection": "§6.5",
  "moduleHeaderLine": 749,                      // line of "6.5 Valvular Heart Disease..."
  "totalGaps": 105,
  "tierTotals": { "T1": 8, "T2": 72, "T3": 25 },
  "subcategories": [
    {
      "name": "Mechanical Valve",
      "headerLine": 752,
      "gapCount": 9
    }
    // ... ordered as appears in spec
  ],
  "gaps": [
    {
      "id": "GAP-VHD-001",
      "specLine": 753,
      "tier": "T1",
      "tierMarkerLiteral": "| T1 |",            // literal text in spec table cell
      "subcategory": "Mechanical Valve",
      "subcategoryHeaderLine": 752,
      "name": "Mechanical valve + sub-therapeutic INR",
      "detectionLogic": "Mechanical valve (Z95.2) + INR below target range at last check",
      "structuredDataElements": "Mech valve Z-code or history, INR target, INR value",
      "domains": ["D2", "D5", "D7"],
      "phi": "Non-PHI",
      "bswPathwayTags": ["P3"],                 // present only if literally tagged in spec
      "safetyTagLiteral": null,                 // string only if spec contains literal (SAFETY) / (CRITICAL) / (CRITICAL SAFETY) / SAFETY: tag in gap text
      "safetyTagCategory": null                 // enum derived from literal — see §6.1 mapping table
    }
    // ...
  ]
}
```

**`safetyTagCategory` enum mapping (mechanical, applied by `extractSpec.ts`):**

| `safetyTagLiteral` | `safetyTagCategory` |
|--------------------|---------------------|
| `(SAFETY)` | `"SAFETY"` |
| `(CRITICAL)` | `"CRITICAL"` |
| `(CRITICAL SAFETY)` | `"CRITICAL_SAFETY"` |
| string starting with `SAFETY:` | `"SAFETY_PREFIX"` |
| `null` | `null` |

Downstream consumers (Tier S triage, synthesis rendering) read `safetyTagCategory`, not `safetyTagLiteral`. The literal is preserved for citation; the category is the structured key.

**Sidecar:** `<MODULE>.spec.meta.json`
```jsonc
{
  "generatedAt": "2026-05-04T19:30:00Z",
  "specSourceSha256": "<sha256 of CK v4.0>",
  "extractorVersion": "1.0.0",
  "extractorScript": "backend/scripts/auditCanonical/extractSpec.ts"
}
```

**Determinism rule:** the main spec.json contains NO `generatedAt` and NO mutable provenance fields. Sort orders are stable (gaps by spec line ascending, subcategories as appear). Sidecar carries provenance separately so repeated runs against unchanged input produce byte-identical main JSON.

#### B. Code extract — `docs/audit/canonical/<MODULE>.code.json`

Mechanical extract from `gapRuleEngine.ts`. **No clinical inference.** What the code literally contains.

```jsonc
{
  "module": "VHD",
  "codeSource": "backend/src/ingestion/gaps/gapRuleEngine.ts",
  "registry": [
    {
      "id": "gap-vd-1-mechanical-valve-anticoag",
      "registryLine": 78,
      "name": "Mechanical Valve Anticoagulation",
      "guidelineSource": "2020 ACC/AHA Valvular Heart Disease Guideline",
      "classOfRecommendation": "1",
      "levelOfEvidence": "A",
      "lastReviewDate": "2026-04-03",
      "nextReviewDue": "2026-10-03"
    }
    // ...
  ],
  "evaluatorBlocks": [
    {
      "name": "VD-1",                           // canonical name extracted from comment
      "commentLine": 4638,                      // line of the // {pattern} comment
      "commentLiteral": "// Gap VD-1: Mechanical Valve Anticoagulation",
      "commentPattern": "GAP_MOD_N",            // see §5 evaluator-pattern enum
      "bodyStartLine": 4638,
      "bodyEndLine": 4710,                      // line of closing brace of the if-block
      "gapsPushIds": ["VHD anticoagulation"]    // status-string ids surfaced to runtime
    }
    // ...
  ],
  "gapsPushCount": 32,                          // total gaps.push({...}) calls in module-tagged blocks
  "moduleTagPattern": "module: ModuleType.VALVULAR_DISEASE"
}
```

**Sidecar:** `<MODULE>.code.meta.json` (codeSourceSha256, extractorVersion, generatedAt).

#### C. Crosswalk — `docs/audit/canonical/<MODULE>.crosswalk.json`

The audit's authored content. Every spec gap that has implementation evidence carries a row that asserts a classification and cites where the assertion is grounded.

```jsonc
{
  "module": "VHD",
  "crosswalkVersion": "1.0",
  "auditDate": "2026-05-04",
  "auditMethod": "rule-body-citation-verified",  // see §6 enum
  "rows": [
    {
      "specGapId": "GAP-VHD-005",
      "specLine": 754,                           // matches spec.json gap.specLine
      "tier": "T1",
      "classification": "DET_OK",
      "ruleBodyCite": {
        "registryId": "gap-vd-6-doac-mechanical-valve",
        "registryLine": 5298,
        "evaluatorBlockName": "VD-6",
        "evaluatorBodyLineRange": [5312, 5380],
        "evaluatorModule": "VHD"                 // module containing the evaluator block; may differ from row's module on cross-module satisfaction
      },
      "auditNotes": "RE-ALIGN trial cited inline; Class 3 Harm match.",
      "inferredSafetyTag": null,                 // null = spec-explicit only OR not SAFETY
      "inferredSafetyRationale": null
    },
    {
      "specGapId": "GAP-VHD-068",
      "specLine": 860,
      "tier": "T1",
      "classification": "SPEC_ONLY",
      "ruleBodyCite": null,
      "auditNotes": "No gradient-rise detection logic. gap-vd-prosthetic-pannus is registry-only.",
      "inferredSafetyTag": "STRUCTURAL_SAFETY",  // clinical inference, not spec-explicit
      "inferredSafetyRationale": "Untreated mech valve thrombosis -> embolic event. Mortality-relevant if missed."
    }
    // ... rows for every spec gap (whether built or unbuilt)
  ],
  "extras": [
    {
      "registryId": "gap-cad-thyroid",
      "rationale": "Comorbidity check, not in CK v4.0 §6.4. Pre-CK organic accumulation."
    }
    // implementations without spec backing
  ]
}
```

**Crosswalk authorship rules:**
- One row per spec gap. Every spec gap has a row, even SPEC_ONLY (where `ruleBodyCite` is null).
- `ruleBodyCite` points at the **evaluator block** that satisfies the gap, not the registry entry alone. Registry-without-evaluator is `PARTIAL_DETECTION` at best.
- `ruleBodyCite.evaluatorModule` records the module that owns the evaluator block. When `evaluatorModule != module` (the row's module), the row is a **cross-module satisfaction case** — the gap is implemented by a rule registered to a different module. Example: `GAP-VHD-024` (severe AS AVR vs TAVR) satisfied by `gap-sh-2-tavr-eval` (registered to SH module) → row's `module = "VHD"`, `ruleBodyCite.evaluatorModule = "SH"`. Synthesis renderer uses this field to surface cross-module satisfaction patterns separately from intra-module coverage.
- `inferredSafetyTag` is set only when the audit author makes a clinical judgment that a SAFETY classification applies WITHOUT spec-explicit text. `inferredSafetyRationale` is required when `inferredSafetyTag` is set.
- `auditNotes` is free-text but should cite specific code or clinical reasoning, not vague summaries.

### 2.2 Derived outputs (generated, never hand-edited)

#### D. Reconciliation — `docs/audit/canonical/<MODULE>.reconciliation.json`

Output of `backend/scripts/auditCanonical/reconcile.ts`. Pairs spec gaps to code rules + flags orphans on each side + naming-convention mismatches.

```jsonc
{
  "module": "VHD",
  "specGapCount": 105,
  "registryCount": 32,
  "evaluatorBlockCount": 32,
  "gapsPushCount": 32,
  "status": "CLEAN",                              // CLEAN | DIVERGENT
  "matches": [
    {
      "specGapId": "GAP-VHD-005",
      "registryId": "gap-vd-6-doac-mechanical-valve",
      "evaluatorBlockName": "VD-6",
      "matchConfidence": 1.0,                     // 0.0-1.0
      "matchMethod": "explicit"                   // explicit | similarity | manual
    }
  ],
  "registryOrphans": [
    { "registryId": "gap-vd-prosthetic-pannus", "registryLine": 1872, "evaluatorBlockName": null, "reason": "No evaluator body" }
  ],
  "evaluatorOrphans": [
    { "evaluatorBlockName": "EP-017", "commentLine": 4797, "registryId": null, "reason": "Evaluator without registry entry (deferred from PR #229)" }
  ],
  "namingMismatches": [
    { "registryId": "gap-50-dapt", "expectedPrefix": "gap-cad-", "actualPrefix": "gap-50-", "module": "CAD" }
  ]
}
```

#### E. Addendum markdown — `docs/audit/PHASE_0B_<MODULE>_AUDIT_ADDENDUM.md`

Rendered from canonical inputs by `backend/scripts/auditCanonical/renderAddendum.ts`. Sections 1-15 templated per established structure (see §11 for template definition). All counts, percentages, and per-gap citations are computed from JSON; no hand-editing.

#### F. Cross-module synthesis — `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md`

Rendered from all 6+ crosswalks by `renderSynthesis.ts`. Tier S triage queue computed from inferredSafetyTag + spec-explicit SAFETY tags. Procedural-Pathway-1 blind spot analysis computed from subcategory aggregation.

---

## 3. Classification taxonomy

### 3.1 Definitions

| Class | Definition | Required evidence |
|-------|------------|-------------------|
| **PRODUCTION_GRADE** | Detection + (calculator if applicable) + UI surface + tests all present. **Note:** PRODUCTION_GRADE classification is gated on closure of AUDIT-001 P0 (platform-wide test coverage gap). Until AUDIT-001 closes, PRODUCTION_GRADE remains structurally unreachable regardless of per-rule test coverage. v2.0 Phase 1 audit results will continue to show PRODUCTION_GRADE = 0 until the platform's testing baseline is established. | Evaluator block firing the gap, UI component rendering it, test file asserting on the rule, calculator validated against published reference values |
| **DET_OK** | Detection logic correctly fires per spec; UI scaffold present; no test coverage | Evaluator block whose trigger criteria match the spec gap's detection logic. Body cited. |
| **PARTIAL_DETECTION** | Some detection code exists but is incomplete relative to spec intent (broad-rule consolidation, missing exclusions, wrong threshold) | Evaluator block exists but spec intent only partially captured. Specific incompleteness noted in `auditNotes`. |
| **SPEC_ONLY** | Spec defines the gap but no evaluator body implements it | Spec gap exists; no evaluator with matching detection logic. Registry-only entries (registry without evaluator body) classify here. |

### 3.2 Decision rules (deterministic, applied per spec gap)

Apply in order, **per spec gap individually** (not per evaluator block):

1. If no evaluator block has detection logic for the spec gap → `SPEC_ONLY`
2. If an evaluator exists but trigger criteria materially diverge from spec (different thresholds, missing exclusions, missing sub-population discrimination, missing dose-protocol specificity) → `PARTIAL_DETECTION`. Specific incompleteness MUST be noted in `auditNotes`.
3. If evaluator's trigger criteria match spec detection logic and at least one UI component renders the gap → `DET_OK`
4. If `DET_OK` AND (a) test file in `backend/tests/` exercises the rule, AND (b) any required calculator has reference-value validation → `PRODUCTION_GRADE`

**Cross-module satisfaction:** the same decision rules apply when the satisfying evaluator is registered to a different module (`ruleBodyCite.evaluatorModule != row.module`). Cross-module pattern is captured structurally via the schema field; document the satisfaction reasoning in `auditNotes`.

#### 3.2.1 Broad-rule consolidation handling

A **broad rule** is a single evaluator block that provides detection for multiple spec gaps (consolidating closely-related spec entries). The decision rules apply to **each consolidated spec gap individually** — multiple spec gaps may receive different classifications from the same broad rule.

For each spec gap covered by a broad rule:
- If broad rule's trigger criteria match the spec gap's detection logic AND the spec gap has no additional discrimination requirement the broad rule lacks → `DET_OK` for that spec gap
- If broad rule's trigger criteria are right but the spec gap requires logic the broad rule does not carry (sub-population discrimination, dose-protocol specificity, threshold tightening) → `PARTIAL_DETECTION` for that spec gap, with the missing logic noted in `auditNotes`

**Example.** `gap-vd-10-pregnancy-risk` (evaluator at line 5428) consolidates spec gaps VHD-098 + VHD-099 + VHD-100 + VHD-101 (4 distinct pregnancy gaps). Per-gap classification:

| Spec gap | Broad rule covers? | Classification | Rationale |
|----------|-------------------|----------------|-----------|
| VHD-098 | Pregnancy + valve risk trigger fully captured | `DET_OK` | No sub-discrimination needed |
| VHD-099 | Trigger captured; spec specifies LMWH dose-protocol absent from broad rule | `PARTIAL_DETECTION` | `auditNotes`: "Missing 1st-trimester LMWH dose-protocol logic." |
| VHD-100 | Trigger fully captured | `DET_OK` | — |
| VHD-101 | Trigger fully captured | `DET_OK` | — |

The broad rule produces 3 DET_OK and 1 PARTIAL_DETECTION across 4 spec gaps. Crosswalk has 4 rows pointing at the same `ruleBodyCite` with different classifications.

**The `PRODUCTION_GRADE` ceiling is currently zero across all audited modules** because of platform-wide test coverage gap (AUDIT-001 P0). This is not a per-module finding; it is the platform's testing baseline. Until AUDIT-001 is closed, no gap can be `PRODUCTION_GRADE`.

### 3.3 Examples

- **DET_OK example:** GAP-VHD-005 (mechanical valve + DOAC, CRITICAL SAFETY). Evaluator `VD-6` at line 5312 fires on `Z95.2 + DOAC RxNorm`, references RE-ALIGN trial inline, classOfRecommendation = '3 (Harm)'. Spec line 754 trigger matches.
- **PARTIAL_DETECTION example:** GAP-VHD-099 (mechanical valve + pregnancy 1st trimester LMWH). Evaluator `VD-10` at line 5428 fires on broad pregnancy + valve risk; lacks LMWH dose-protocol logic spec specifies. Spec intent partially captured.
- **SPEC_ONLY example:** GAP-VHD-068 (mech valve thrombosis: gradient rise >=50%). Registry has `gap-vd-prosthetic-pannus` but no evaluator body. Spec detection logic is unimplemented.

---

## 4. Citation requirements (AUDIT-030)

**Every classification cites both spec and code.** Without citations, the classification is unverifiable.

### 4.1 Spec-side citation (mandatory for every crosswalk row)

- `specLine` — absolute line number in CK v4.0 source file (this is mechanical, extractable, and produced by `extractSpec.ts`)
- `specGapId` — canonical id (e.g., `GAP-VHD-005`)
- Tier from extracted `tierMarkerLiteral` (the literal `| T1 |` text in the spec table cell)

### 4.2 Code-side citation (mandatory for every non-SPEC_ONLY classification)

When `classification != "SPEC_ONLY"`:
- `ruleBodyCite.registryId` — the registry entry id from `code.json`
- `ruleBodyCite.registryLine` — registry entry line number
- `ruleBodyCite.evaluatorBlockName` — the canonical name of the evaluator block (e.g., `VD-6`)
- `ruleBodyCite.evaluatorBodyLineRange` — `[start, end]` of the if-block body

When `classification == "SPEC_ONLY"`: `ruleBodyCite` is `null`. The audit author may add `auditNotes` describing what was searched (e.g., "no S. aureus + TEE evaluator anywhere in file").

### 4.3 SAFETY-tag citation (mandatory when SAFETY relevant)

- `safetyTagLiteral` in `spec.json` — the LITERAL text from spec (e.g., `(CRITICAL SAFETY)`). Set only if spec text contains one of: `(SAFETY)`, `(CRITICAL)`, `(CRITICAL SAFETY)`, `SAFETY:`.
- `inferredSafetyTag` in `crosswalk.json` — set ONLY when audit author makes a clinical inference that SAFETY applies despite no spec-explicit tag. Required values:
  - `STRUCTURAL_SAFETY` — clinical reasoning suggests SAFETY (untreated condition risks mortality / serious harm)
  - `PROCEDURAL_URGENCY` — time-critical procedural decision without SAFETY tag (e.g., IE+acute HF surgery)
  - `null` — neither spec-explicit NOR inferred
- `inferredSafetyRationale` — REQUIRED when `inferredSafetyTag != null`. Brief clinical reasoning. Example: "Untreated mech valve thrombosis -> embolic event. Mortality-relevant if missed."

**Rule:** spec-explicit SAFETY (the `safetyTagLiteral` from `spec.json`) is mechanical fact. Inferred SAFETY (the `inferredSafetyTag` from `crosswalk.json`) is clinical judgment. The two are tracked separately and never conflated.

### 4.4 Citation completeness check (CI gate)

For any crosswalk row submitted:
- If `classification != "SPEC_ONLY"` and `ruleBodyCite == null` → REJECT
- If `inferredSafetyTag != null` and `inferredSafetyRationale == null` → REJECT
- If `specLine` doesn't match a `specLine` in `spec.json` → REJECT (gap id drifted from spec)

---

## 5. Evaluator inventory completeness (AUDIT-030.D)

The evaluator-detection patterns enumerated in `extractCode.ts` are **exhaustive**. Pattern additions trigger script update before any audit work.

### 5.1 Required evaluator-comment patterns (empirically enumerated 2026-05-04)

Five patterns observed across 257 evaluator comment headers in `gapRuleEngine.ts`:

```
ID_NAME (163)     // CAD-ACEI: ...
                  // SH-VALVE-IN-VALVE: ...
                  // EP-LAAC: ...
                  // HF-ANEMIA-HF: ...
                  Pattern: ^\s*// {MOD}-{NAME}:
                  ({MOD} = HF/EP/SH/CAD/VD/PV; {NAME} = alpha-only suffix, no leading digit)

GAP_MOD_N (84)    // Gap VD-1: ...
                  // Gap HF-34: ...
                  // Gap PV-7: ...
                  Pattern: ^\s*// Gap {MOD}-\d+(-{SUFFIX})?:
                  ({SUFFIX} optional, e.g., HF-37-FU)

GAP_N (6)         // Gap 1: ATTR-CM Detection
                  // Gap 2: Iron Deficiency in HF
                  // Gap 6: Finerenone
                  // Gap 39: QTc Safety Alert
                  // Gap 44: Digoxin Toxicity
                  // Gap 50: Premature DAPT Discontinuation
                  Pattern: ^\s*// Gap \d+:
                  (no module prefix; legacy numbering pre-CK-v4.0)

GAP_MOD_NAME (3)  // Gap CAD-STATIN: ...
                  // Gap CAD-REHAB: ...
                  // Gap EP-OAC: ...
                  Pattern: ^\s*// Gap {MOD}-{NAME}:
                  (combines `Gap ` prefix with alpha-suffix; transitional naming)

ID_N (1)          // EP-017 SAFETY: ...
                  Pattern: ^\s*// {MOD}-\d+
                  (numeric suffix without `Gap ` prefix; introduced PR #229)
```

**Special case — compound parent comments:** `// Gap EP-RC + EP-017: Rate Control in AFib (HFrEF-aware)` (line 4774) is a single comment naming two inner branches. The outer match counts as one evaluator block with `commentLiteral` preserving the full `EP-RC + EP-017` text. The inner `// EP-017 SAFETY:` at line 4797 is detected separately as `ID_N`. Both blocks appear in `code.json`.

### 5.2 Pattern addition workflow

When a new evaluator-comment pattern is observed in `gapRuleEngine.ts`:
1. Add pattern to `extractCode.ts` `EVALUATOR_PATTERNS` enum + regex
2. Update test in `backend/tests/scripts/extractCode.test.ts` to assert detection
3. Re-run `extractCode.ts` against all 6 modules; reconciliation MUST not produce new orphans for the new pattern
4. Update §5.1 of this document with the new pattern

**Audit work that runs against a stale `EVALUATOR_PATTERNS` enum is rejected.** This is mechanical — a `git diff` of `gapRuleEngine.ts` after audit completion is checked for any comment line matching `^\s*//\s*[A-Z]+` that didn't match a known pattern.

### 5.3 Empirical pattern-discovery rule

If reconciliation surfaces an evaluator orphan whose comment line matches a pattern not in §5.1, the audit pauses. The pattern is added to §5.1 + `extractCode.ts`, the script is re-run, and the audit resumes.

This rule is what AUDIT-030.D codifies: "Comment-pattern surface area for evaluator-block detection must be empirically complete before audit conclusions are trustworthy."

---

## 6. SAFETY-tag classification rules

### 6.1 Spec-explicit SAFETY

A spec gap is **spec-explicit SAFETY** if the literal text in CK v4.0 contains one of:

| Literal text | `safetyTagCategory` |
|--------------|---------------------|
| `(SAFETY)` | `"SAFETY"` |
| `(CRITICAL)` | `"CRITICAL"` |
| `(CRITICAL SAFETY)` | `"CRITICAL_SAFETY"` |
| string starting with `SAFETY:` | `"SAFETY_PREFIX"` |

Mechanical extraction: `extractSpec.ts` populates both `gap.safetyTagLiteral` (the matched text, for citation) and `gap.safetyTagCategory` (the enum value, for downstream consumers). Audit author has no discretion here.

A spec gap is spec-explicit SAFETY iff `safetyTagCategory != null`.

### 6.2 Structural-inferred SAFETY

A spec gap is **structurally inferred SAFETY** if the audit author judges the clinical situation has SAFETY-relevant downside (mortality / serious harm) despite no spec-explicit tag.

Required:
- `inferredSafetyTag = "STRUCTURAL_SAFETY"`
- `inferredSafetyRationale` — clinical reasoning, 1-3 sentences, citing the harm pathway

### 6.3 Tier S triage queue inclusion

A spec gap qualifies for Tier S triage queue if ALL THREE:
1. (`safetyTagLiteral != null` OR `inferredSafetyTag != null`) — SAFETY-relevant
2. (`tier == "T1"`) — priority gap
3. (`classification != "DET_OK"` AND `classification != "PRODUCTION_GRADE"`) — uncovered

Spec-explicit SAFETY uncovered T1 gaps are **automatic Tier S inclusion** (no operator decision required).

Structurally-inferred SAFETY uncovered T1 gaps surface for **operator decision** before Tier S inclusion. The synthesis renderer surfaces both groups separately so the operator can review and accept/reject.

### 6.4 Examples

- **Spec-explicit SAFETY uncovered:** `GAP-EP-079` (pre-excited AF + AVN blocker → VF risk, literal `(CRITICAL)` in spec) classified `SPEC_ONLY` → automatic Tier S.
- **Structurally inferred SAFETY uncovered:** `GAP-VHD-068` (mech valve thrombosis detection, no spec tag) classified `SPEC_ONLY` with `inferredSafetyTag = STRUCTURAL_SAFETY` and rationale "untreated thrombosis → embolic event" → operator decision before Tier S.
- **Spec-explicit SAFETY but DET_OK:** `GAP-VHD-005` (mech valve + DOAC, literal `(CRITICAL SAFETY)`) classified `DET_OK` → NOT Tier S (already covered).

---

## 7. Wall-clock empirical floor (AUDIT-028)

Time captured per audit run, used for v2.0 multipliers and to detect under-rigor runs.

### 7.1 Time entry rules

Each audit run logs operator-conversation-timeline ground-truth elapsed timestamps (NOT agent-internal duration estimates). One entry per phase substep.

### 7.2 Empirical floor table (per ~90-105-gap module)

| Methodology | Empirical wall-clock | Rigor confidence |
|-------------|----------------------|------------------|
| Name-match (no rule-body verification) | ~7-15 min | Low — surfaces structure; misses semantic divergence |
| Rule-body verified (no spec citations) | ~25-95 min | Medium — wide variance suggests methodology gaps |
| Rule-body + spec-citation verified (AUDIT-030 standard) | ~95-120 min | Standard floor |
| AUDIT-030 + multi-pattern evaluator inventory (AUDIT-030.D) | ~120-150 min | New baseline post 2026-05-04 |

### 7.3 Under-floor detection

An audit reporting wall-clock below the empirical floor for its claimed methodology level triggers re-audit. Example: if a "rule-body + spec-citation verified" audit completes in 30 minutes, the methodology claim is suspect.

### 7.4 Empirical floor evolves

Each audit run adds data to `docs/audit/canonical/audit_runs.jsonl` (append-only). After 6+ runs at AUDIT-030.D, recompute the §7.2 table and update this section.

---

## 8. Verification gates

### 8.1 Pre-flight inventory (before audit start)

Before any classification work begins, the audit pre-flight script `backend/scripts/auditCanonical/preflight.ts` runs and reports:
- `spec.json` count vs CK v4.0 module section count — must match
- `code.json` registry count vs `gapRuleEngine.ts` registry entries tagged for the module — must match
- `code.json` evaluator block count vs `gapsPushCount` — should match (off-by-one acceptable if a gap.push is in unexpected scope; surface for review)
- Reconciliation orphans surfaced for operator review

If pre-flight fails, audit cannot begin. Fix the canonical extracts first.

### 8.2 Crosswalk row-by-row verification (during audit)

For every crosswalk row submitted, the verification script asserts:
- `specGapId` exists in `spec.json`
- `specLine` matches `spec.json[gap].specLine`
- `tier` matches `spec.json[gap].tier`
- If `classification != "SPEC_ONLY"`: `ruleBodyCite.registryId` exists in `code.json.registry`
- If `classification != "SPEC_ONLY"`: `ruleBodyCite.evaluatorBlockName` exists in `code.json.evaluatorBlocks`
- If `inferredSafetyTag != null`: `inferredSafetyRationale != null`

Rows failing verification surface for operator review with the specific failure reason. Author re-classifies after operator input.

### 8.3 CI gates

See §10.

---

## 9. Workflow

```
+-----------------------+        +-----------------------+
| 1. Pre-flight         |        | 2. Run extractors     |
|    extract producers  | -----> |    extractSpec.ts +   |
|    (one per module)   |        |    extractCode.ts     |
+-----------------------+        +-----------+-----------+
                                              |
                                              v
                                  +-----------------------+
                                  | 3. Reconcile          |
                                  |    reconcile.ts       |
                                  |    -> orphans, naming |
                                  +-----------+-----------+
                                              |
            +---------------------------------+
            |
            v
+-----------------------+        +-----------------------+
| 4. Author crosswalk   |        | 5. Verify rows        |
|    one row per spec   | -----> |    schema + extract   |
|    gap, with cites    |        |    cross-checks       |
+-----------------------+        +-----------+-----------+
                                              |
                                              v
                                  +-----------------------+
                                  | 6. Render addendum    |
                                  |    renderAddendum.ts  |
                                  +-----------+-----------+
                                              |
                                              v
                                  +-----------------------+
                                  | 7. Render synthesis   |
                                  |    (after all 6       |
                                  |    crosswalks done)   |
                                  +-----------------------+
```

Each step has explicit inputs (what files), outputs (what files), and pause points (where operator review is required). See PHASE_0_AUDIT_INFRASTRUCTURE.md for the implementation plan.

### 9.1 applyOverrides target-file convention (AUDIT-041, 2026-05-06)

`applyOverrides.ts` writes manual classification override pins to crosswalk rows. Two flows exist:

| Flow | When | Default? | Invocation |
|---|---|---|---|
| **Canonical** | Source-change PRs (Tier S series, Cat A corrections) — 95% of usage | DEFAULT | `npx tsx applyOverrides.ts --module <CODE>` or `--all` |
| **Candidate** | One-shot verifyDraft baseline cycle (initial crosswalk creation per module) | opt-in | `npx tsx applyOverrides.ts --module <CODE> --candidate` |

Pre-AUDIT-041 the script defaulted to candidate-write, which forced 4 manual canonical patches across PRs #238/240/241/243 because source-change PRs never reached the candidate→canonical promote step. AUDIT-041 (PR #245, 2026-05-06) inverted the default to canonical-write because the real-usage hit rate on candidate-default was 0/4 (100% miss). The legacy candidate workflow remains accessible via the explicit `--candidate` flag for the rare baseline cycle.

**Idempotency:** override application produces byte-identical output via `stableStringify` when re-run on already-applied state. No double-patching risk in either flow.

### 9.2 Full-pipeline regen after source-changing operations (AUDIT-064, 2026-05-06)

Whenever source code or canonical input artifacts change mid-PR — including:
- sed/refactor operations on `gapRuleEngine.ts`, registry, or evaluator code
- comment rephrasing (e.g., `// AUDIT-NNN (...)` → `// Fix (AUDIT-NNN, ...)` to avoid `extractCode.ts` ID_N pattern false-positive evaluator detection)
- line-number-shifting edits (added comments, reformatting, new evaluator blocks)
- any `backend/scripts/auditCanonical/*.ts` source change

The **full** canonical pipeline must be re-run before commit, not partial steps. Pipeline order:

```
extractCode → extractSpec → reconcile → refreshCites → applyOverrides → renderAddendum → renderSynthesis → validateCanonical
```

Skipping `reconcile` / `renderAddendum` / `renderSynthesis` after source changes leaves committed `*.reconciliation.json` and `*_AUDIT_ADDENDUM.md` files referencing pre-change state. CI `auditCanonical.yml` regenerates these and detects the divergence, blocking merge.

**Recurrences before codification:** 2.
- **PR #245** (AUDIT-041) — applyOverrides default flip; reconcile/render regen missed; CI rejected; fixed via standalone fixup commit.
- **PR #246** (AUDIT-046..063) — sed comment rephrase; reconcile/render regen missed; CI rejected; fixed via fixup commit chain (this PR).

**Convention going forward:** after any source change, run the full pipeline. The canonical contract for this PR-shape is non-partial. Partial pipeline runs are a methodology violation.

**Architectural note:** an optional `pipeline-all.sh` / `pipeline-all.ps1` helper script could replace 8 commands with 1 to enforce this via single invocation. Deferred to focused infrastructure PR per scope discipline.

This is an operational-discipline standard — sister to §1 (rule-body verification — output discipline) and §16 (clinical-code verification — input discipline). Together: §1 covers what audits cite, §16 covers what rules consume, §9.2 covers what PRs commit.

---

## 10. CI enforcement model

### 10.1 PR-touching-source-files behavior

| PR touches | CI runs | CI fails if |
|-----------|---------|-------------|
| `backend/src/ingestion/gaps/gapRuleEngine.ts` | `extractCode.ts --module ALL` | Generated `code.json` for any module diverges from committed `code.json` |
| `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` | `extractSpec.ts --module ALL` | Generated `spec.json` for any module diverges from committed `spec.json` |
| `docs/audit/canonical/<MODULE>.crosswalk.json` | `reconcile.ts --module <MODULE>` + `renderAddendum.ts --module <MODULE>` | Generated reconciliation diverges, OR generated addendum diverges from committed addendum |
| `docs/audit/PHASE_0B_<MODULE>_AUDIT_ADDENDUM.md` (direct edit) | hand-edit guard | **Always fail.** Addendum is a generated artifact. Re-edit crosswalk.json, regenerate. |

### 10.2 Rejection messages

CI emits structured rejection messages so failures are actionable:
```
REJECT: addendum-direct-edit
  File: docs/audit/PHASE_0B_VHD_AUDIT_ADDENDUM.md
  Reason: This file is generated from docs/audit/canonical/VHD.crosswalk.json
  Fix: edit the crosswalk JSON, then run:
       npx tsx backend/scripts/auditCanonical/renderAddendum.ts --module VHD
```

### 10.3 Workflow file

`.github/workflows/auditCanonical.yml` — implements the above as PR checks. Fast (extracts run in <30s); can run on every PR without slowing CI materially.

### 10.4 Line-shift workflow (refreshCites.ts)

When `gapRuleEngine.ts` or `CLINICAL_KNOWLEDGE_BASE_v4.0.md` has a line-affecting change (e.g., adding a registry entry, a new evaluator block, or new spec gap rows), every cite in every committed `<MODULE>.crosswalk.json` that references downstream content becomes stale. Cite line numbers (`registryLine`, `evaluatorBodyLineRange`, `specLine`) drift; everything else stays correct.

**Symptom (CI Gate 5 failure):**
```
REJECT: crosswalk-schema-invalid
ERROR BODY_LINE_RANGE_MISMATCH at crosswalk.rows[N/GAP-X-NNN].ruleBodyCite.evaluatorBodyLineRange
ERROR REGISTRY_LINE_MISMATCH at crosswalk.rows[N/GAP-X-NNN].ruleBodyCite.registryLine
```

**Workflow:**

1. Make the source change (gapRuleEngine.ts or CK v4.0).
2. Regenerate the affected extracts:
   ```
   npx tsx backend/scripts/auditCanonical/extractCode.ts --all
   npx tsx backend/scripts/auditCanonical/extractSpec.ts --all
   ```
3. Run the cite refresh:
   ```
   npx tsx backend/scripts/auditCanonical/refreshCites.ts --all
   ```
4. Re-render addenda + synthesis:
   ```
   npx tsx backend/scripts/auditCanonical/renderAddendum.ts --all
   npx tsx backend/scripts/auditCanonical/renderSynthesis.ts
   ```
5. Validate:
   ```
   npx tsx backend/scripts/auditCanonical/validateCanonical.ts
   ```
6. Commit the regenerated artifacts alongside the source change in a single PR.

**What `refreshCites.ts` preserves (byte-for-byte):**
- `auditNotes` — manual override messages, citation prose
- `classification` (DET_OK / PARTIAL_DETECTION / SPEC_ONLY / PRODUCTION_GRADE)
- `inferredSafetyTag` + `inferredSafetyRationale`
- `parseSource` + `parseConfidence` (if present)
- All top-level fields (`module`, `crosswalkVersion`, `auditDate`, `auditMethod`, `strategicPosture`, `sequencingNotes`, `lessonsLearned`, `extras`)

**What `refreshCites.ts` updates (only):**
- `ruleBodyCite.registryLine` — looked up from current `<MODULE>.code.json` by `registryId`
- `ruleBodyCite.evaluatorBodyLineRange` — looked up by `evaluatorBlockName`
- `specLine` — looked up from current `<MODULE>.spec.json` by `specGapId`

**Cross-module cites:** when `ruleBodyCite.evaluatorModule != crosswalk.module` (e.g., GAP-EP-007 cross-module to VHD VD-6), the lookup uses the cited module's `code.json`. All 6 module code extracts are loaded unconditionally.

**Fail-loud behavior:** if a cited `registryId` or `evaluatorBlockName` no longer exists in current code.json, `refreshCites.ts` throws a structured error (`RegistryIdNotFoundInRefresh`, `EvaluatorBlockNotFoundInRefresh`) and exits non-zero. The affected row needs manual review — likely the rule was deleted/renamed in source and the crosswalk row needs reclassification.

**Idempotency:** running `refreshCites.ts` on an already-current crosswalk is a no-op — zero changes, byte-identical output. Safe to invoke before every commit.

**Difference from `verifyDraft.ts`:** `verifyDraft` re-classifies rows from auto-classifier output and may overwrite manual classifications if drafts are re-parsed. `refreshCites` is surgical — only touches line-number fields, never classifications or notes. Use `refreshCites` for source-line-shift PRs; use `verifyDraft` only when re-bootstrapping crosswalks from addenda.

---

## 11. Addendum markdown template

The renderer produces sections in the following hierarchy. Phase 4 renderer produces exactly this structure per module — section numbering and nesting are part of the contract.

| § | Title | Content source | Author |
|---|-------|---------------|--------|
| §1 | Summary | crosswalk row aggregation + tier totals from spec.json | generated |
| §2 | Coverage by classification | crosswalk row aggregation | generated |
| §3 | Coverage by tier | spec.json tierTotals + crosswalk classification | generated |
| §4 | Per-subcategory breakdown | per subcategory in spec.json order | generated |
| §4.5 | T1 SPEC_ONLY work items | filter crosswalk: tier=T1 + classification=SPEC_ONLY; join BSW pathway tags from spec.json | generated |
| §4.6 | EXTRA rules + architectural patterns | crosswalk.extras + reconciliation namingMismatches | generated |
| §5 | Tier 1 priority gaps surfaced | filter crosswalk: tier=T1 (all classifications) | generated |
| §6 | Implementation notes (parent header) | — | — |
| §6.1 | EXTRA rules detail | crosswalk.extras with rationale | generated |
| §6.2 | BSW ROI pathway implications | aggregate bswPathwayTags across T1 SPEC_ONLY rows | generated |
| §6.3 | Strategic posture | carry-forward from prior addendum or operator-set | **hand-authored** |
| §7 | Working hypothesis verdict | aggregate numbers + comparison vs prior modules | generated |
| §8 | Implications for v2.0 | derived from §1 + §7 | generated |
| §9 | Module-specific findings | crosswalk per-row finding fields (if added) + register cross-refs | generated |
| §10 | Cross-references | links to spec, sibling addenda, framework | generated |
| §11 | Cross-module synthesis (optional per-module) | aggregate coverage-data table across modules audited so far | generated |
| §11.5 | Sequencing notes | carry-forward from prior addendum | **hand-authored** |
| §12 | Lessons learned | audit-author observations during this run | **hand-authored** |
| §13 | Wall-clock empirical entry | AUDIT-028 log for this run | generated (from log) |
| §14 | Audit verdict | derived from §1 + §7 | generated |
| §15 | Methodology citation appendix | static reference to this document | generated |

**Hand-authored sections are limited to §6.3, §11.5, §12.** All other sections are generated from canonical inputs. Hand-authored sections live in the crosswalk JSON as named string fields (`strategicPosture`, `sequencingNotes`, `lessonsLearned`) so they pass through CI's hand-edit guard cleanly.

Phase 4 renderer must produce the section hierarchy exactly. Tests assert section order, header text, and the hand-authored / generated split.

---

## 12. Audit-finding lifecycle

When an audit surfaces a finding worth tracking beyond the addendum:

1. Audit-author proposes a register entry inline in the addendum's §9 module-specific findings
2. Operator authorizes register entry
3. Entry written to `docs/audit/AUDIT_FINDINGS_REGISTER.md` with `AUDIT-NNN` id
4. Cross-reference threaded back: addendum §9 cites AUDIT-NNN; register entry cites the addendum
5. Re-audits update register entries when finding state changes (FIXED, MITIGATED, etc.)

Register entries follow `docs/audit/AUDIT_FRAMEWORK.md` §"Evidence requirements per finding".

---

## 13. Open methodology questions (carry forward)

- **Calculator validation:** Currently no per-gap calculator validation against published reference values. Adding this raises the `PRODUCTION_GRADE` ceiling but requires extended scope. Defer until Phase 1.
- **UI surface auto-detection:** Currently `DET_OK` requires manual confirmation that a UI component renders the gap. Auto-detection of `src/ui/{module}/` -> spec-gap mapping is feasible (component name vs gap id) but not implemented.
- **Cross-module satisfaction synthesis:** Cross-module rule firing is captured structurally in the crosswalk via `ruleBodyCite.evaluatorModule` (see §2.1.C). Open question: how should the cross-module synthesis renderer report patterns when multiple modules cross-cite into one shared evaluator (e.g., shared procedural-decision-support framework in v2.0 Phase 1)? Surface format TBD; track as v2.0 architectural decision.

---

## 14. Document discipline

- This document is versioned. Bump version on material methodology changes.
- All future audits cite this document at §15 of their addendum: "Methodology per AUDIT_METHODOLOGY.md v{N}".
- Methodology corrections proposed during an audit are recorded in §12 lessons learned of that addendum, then folded into the next version of this document.
- This document never references a specific audit run's findings. It is methodology-only. Findings live in `AUDIT_FINDINGS_REGISTER.md`.

---

## 15. Cross-references

- `docs/audit/AUDIT_FRAMEWORK.md` — parent backend audit framework
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` — findings register
- `docs/audit/PHASE_0B_CLINICAL_AUDIT_FRAMEWORK.md` — predecessor framework (kept for historical context; superseded by this document)
- `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` — spec source (CK v4.0)
- `backend/src/ingestion/gaps/gapRuleEngine.ts` — code source
- `backend/scripts/auditCanonical/` — implementation of methodology
- `backend/tests/scripts/auditCanonical/` — methodology implementation tests
- `.github/workflows/auditCanonical.yml` — CI gates
- `docs/PATH_TO_ROBUST.md` — strategic plan; v2.0 consumes audit output

---

## 16. Clinical-Code Verification Standard (Cat A canonical valuesets + Cat D inline arrays)

Every RxNorm, LOINC, and ICD-10 constant in the rule engine must be verified against an authoritative external source. Codebase trust (e.g., "the comment says nadolol so the code must be nadolol") is INSUFFICIENT.

**Bug-rate evidence (Phase 0B clinical-code verification, 2026-05-05):** systematic Phase 2 verification of canonical valuesets in `cardiovascularValuesets.ts` surfaced **13 wrong-drug or invalid-CUI errors in 84 cited RxNorm codes (15.5% bug rate)**, including patient-safety-active errors:
- `RXNORM_QT_PROLONGING.DOFETILIDE` and `DRONEDARONE` were donepezil/donepezil-branded (Alzheimer's drug surveilled, not antiarrhythmics)
- `RXNORM_QT_PROLONGING.PROCAINAMIDE` was propranolol (a beta-blocker, not QT-prolonging)
- `RXNORM_FINERENONE` and `RXNORM_GDMT.IVABRADINE` were invalid CUIs — gap rules never fired in production
- `RXNORM_DIGOXIN.DIGOXIN_IV` was a retired aspirin/caffeine/dihydrocodeine combo

This is the data-layer cousin to §1 (rule-body verification — AUDIT-029). §1 was an output discipline (audit conclusions must cite running code, not addendum text). §16 is an input discipline (rule logic must consume verified codes, not codebase-trusted constants).

### 16.1 Verification sources (required)

- **RxNorm**: query `https://rxnav.nlm.nih.gov/REST/rxcui/<cui>/properties.json` and assert the returned `name` field matches the constant's intended drug. For ambiguous cases, additionally query `historystatus.json` to confirm the CUI is `Active` (not retired).
- **LOINC**: query loinc.org official browser or LOINC API. Particular attention to:
  - eGFR formula variants (33914-3 MDRD, 62238-1 CKD-EPI 2009, 98979-8 race-free CKD-EPI 2021 — pick the one matching FHIR ingestion mapping)
  - cTnI variants (89579-7 hs vs 48641-3 conventional)
  - LVEF (18010-0 vs alternatives)
- **ICD-10**: cross-reference current AHA/ACC/CDC code definitions for the rule's clinical intent, preferably via CMS ICD-10-CM 2024 official lookup or icd10data.com.
- **CPT** (when used): AMA CPT directory or AHA Coding Clinic.

### 16.2 Mandatory verification points

1. **Initial constant authoring** — every new RxNorm/LOINC/ICD-10 constant must have its verified name pasted as a comment next to the code (e.g., `PROCAINAMIDE: '8700',  // procainamide (verified RxNav 2026-05-05)`).
2. **Any rule that consumes the constant** — rule author must spot-check the constant's verified name before referencing it in detection logic.
3. **Audit/review cycles** — Phase 0B clinical audits must include a Cat A clinical-code verification batch as a mandatory step alongside §1 rule-body verification. Bug-rate sampling required: if any cited code in a verified subset is wrong-drug, escalate to full Cat A re-verification of that valueset.
4. **Pull-request gate** — PRs that add new RxNorm/LOINC/ICD-10 constants must cite the authoritative-source verification timestamp in the commit message or PR body.

### 16.3 Inline-array discipline (architectural; AUDIT-052)

The Cat A bug rate is amplified by **AUDIT-052**: `gapRuleEngine.ts` contains ~52 inline RxNorm arrays that re-declare drug classes already defined in `cardiovascularValuesets.ts`. When the canonical valueset has a wrong code, the inline array often inherits the bug; when it doesn't, the inline declares a different (sometimes also wrong) code, producing divergence.

Future rule authoring SHOULD prefer importing from the canonical valueset:
```typescript
import { RXNORM_QT_PROLONGING } from '../../terminology/cardiovascularValuesets';
const QT_DRUGS = [RXNORM_QT_PROLONGING.AMIODARONE, RXNORM_QT_PROLONGING.SOTALOL, ...];
```
not declaring inline:
```typescript
const QT_DRUGS = ['703', '9947', ...]; // divergence vector
```

Architectural refactor to eliminate inline arrays tracked as AUDIT-052; partial mitigation (AUDIT-042/056/057-equivalent inline copies corrected) shipped in the AUDIT-042-061 fix PR.

### 16.4 Failure mode taxonomy

| Class | Description | Detection | Example |
|---|---|---|---|
| **Wrong-drug CUI** | RxNorm code maps to entirely different drug | RxNav properties.json `name` mismatch | AUDIT-042: 8787 = propranolol, not procainamide |
| **Invalid CUI** | RxNorm CUI returns `UNKNOWN` or `NotCurrent` status | RxNav historystatus.json | AUDIT-053: 2481926 = UNKNOWN |
| **Retired CUI** | RxNorm CUI was retired (drug withdrawn or restructured) | RxNav historystatus.json `NotCurrent` | AUDIT-044: 197607 (retired aspirin combo) |
| **Form/strength mislabel** | Code is correct drug but wrong dose/form per comment | RxNav properties.json `name` shows different strength/form | AUDIT-045: 197605 is 0.2mg cap, not 250mcg |
| **Same-class wrong-drug** | Code is in the same drug class but wrong specific drug | RxNav properties.json | AUDIT-054: 2627044 = bexagliflozin (SGLT2i), not sotagliflozin (different SGLT2i) |
| **Cross-class match** | LOINC for unrelated lab; ICD for unrelated dx | Authoritative cross-reference | AUDIT-068: ABI_LEFT 44975-1 = "Q-T interval" (an EKG concept, not ABI) |

---

## 17. Clinical-Code PR Acceptance Criteria (AUDIT-065..069 catalyst, 2026-05-06)

A clinical-code PR is "ready to ship" only when ALL the following are explicitly satisfied. Anything failing is sent back for revision, not shipped with caveat.

### 17.1 Correctness (zero half-fixes)

- Every affected rule verified to fire correctly post-fix — not "strictly better than broken state." For ambiguous cases, write the test that proves correct behavior; if you can't write the test cleanly, the fix isn't done.
- Consumer code audited wherever canonical changes affect lookup semantics, side discrimination, or threshold comparison. "Looks like the same lookup" is not consumer audit.
- Behavior changes (expansions, narrowings, semantic shifts) documented per-array with clinical guideline citation; no silent semantic changes.

### 17.2 Verification (per §16 fully exhausted)

- Every changed code verified against authoritative external source (RxNav, loinc.org, NLM Clinical Tables, CMS ICD-10-CM, etc.). Codebase trust is INSUFFICIENT — including codebase comments labeled "FIX-FROM" or "verified" without provenance.
- Verification path documented for each code: which source, which date, which descriptor matched. If primary source fails (e.g., loinc.org 500), at least one fallback (NLM Clinical Tables, fhir.loinc.org, UMLS) attempted before "verification incomplete." First-failure punt is not acceptable.
- Where prior codebase fix-from comments exist, treat them as suspect until re-verified — they may themselves be regressions (per AUDIT-069 LVEF catch: prior comment claimed `10230-1 = QRS duration WRONG`, but re-verification confirmed 10230-1 IS LVEF — the prior "fix" was itself the regression).

### 17.3 Scope discipline (zero silent deferrals)

- No half-fixes shipped with "follow-up flag" framing. If correctness for shipped scope requires architectural work, EITHER expand PR scope to include the architectural fix OR pull the affected item from PR scope entirely with explicit KNOWN BROKEN inline comments + register OPEN entries + visibility tests.
- Deferred items have `AUDIT_FINDINGS_REGISTER.md` OPEN entries with: clear architectural reason for deferral, dedicated-PR resolution plan, and pinning tests that would fail if someone "accidentally fixed" without proper architectural treatment.
- Methodology improvements that surface during the work (recurring patterns) are codified in this same PR per §1, §16, §9.1, §9.2 precedents. Discovery + fix + codification ship together.

### 17.4 Process discipline

- §9.2 full canonical pipeline regen mandatory (`extractCode → extractSpec → reconcile → refreshCites → applyOverrides → renderAddendum → renderSynthesis → validateCanonical`). Partial pipeline runs are §9.2 violations.
- §16 clinical-code verification standard for every changed code.
- Tests cover: positive (rule fires on real concept) + negative (wrong concept doesn't false-fire) + behavior preservation (refactor doesn't change semantics unless explicitly intended). Plus pinning tests for KNOWN BROKEN deferrals.
- PR description surfaces: clinical impact, consumer audit results, deferred items with register references, verification path per code, behavior changes with guideline citations.

### 17.5 Pre-PR self-review (mandatory)

Before any "PR created" status, agent runs through the §17 checklist explicitly in the execution log. Each criterion gets explicit ✓ with evidence, or "not applicable, here's why," or "uncertain — flagging for operator." Self-review is not summarized away.

### 17.6 Operator review bar

At approval time, operator confirms: every checkbox satisfied with evidence, deferred items have proper register entries + pinning tests, PR description gives enterprise-grade traceability, no items shipped on "good enough" basis. Anything failing → revision, not caveat-and-ship.

### 17.7 Drift-prevention rationale

Codified after AUDIT-067/068 ABI deferral course-correction. Pattern observed: under compression pressure, "strictly better with follow-up flag" approval drift becomes invisible erosion of the engineering bar. §17 makes the bar self-enforcing via PR template (`.github/pull_request_template.md`) + agent self-review + operator checkbox confirmation rather than judgment-call approval.

§17 is sister to §1 (rule-body verification — output discipline), §9.1 (applyOverrides canonical default — pipeline ergonomics), §9.2 (full-pipeline regen — what PRs commit), and §16 (clinical-code verification — input discipline). Together: §1+§16 cover the verification disciplines; §9.1+§9.2 cover the pipeline disciplines; §17 covers the **PR shipping discipline** that wraps them all.

---

*Authored 2026-05-04 in response to compounding methodology defect cycles (AUDIT-029 → AUDIT-030 → AUDIT-030.D). This document is the contract that prevents methodology drift living in audit prose. Implementation under `backend/scripts/auditCanonical/` follows. §16 added 2026-05-05 in response to Cat A clinical-code verification surfacing 15.5% wrong-drug bug rate (AUDIT-042 through AUDIT-061). §17 added 2026-05-06 in response to AUDIT-067/068 ABI deferral course-correction; codifies clinical-code PR acceptance criteria as drift-prevention mechanism.*
