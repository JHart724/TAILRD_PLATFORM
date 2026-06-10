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
- **AUDIT-097 future methodology 17.1 consolidation tracking:** entries 1-13 in §17.1 catalog remain in design-refinement-notes per informal convention established at AUDIT-087 architectural note narrative; future consolidation work scope = author entries 1-13 inline at §17.1 catalog at canonical entry format (Catalyst / Drift pattern / Rule / Reference example / Sister disciplines fields) sister to entries 14-27. Filed at AUDIT-097 methodology PR per Q-METH-B fold housekeeping to close documentation-narrative-vs-canonical-state divergence (AUDIT-087 architectural-note narrative cited tracking entry that did not exist in §13 at canonical-grep verification).

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

### 16.5 Medication-match-architecture classification modifier (AUDIT-118)

A code can be the correct concept (passes §16.1-16.4) yet still under-detect because of HOW it is
matched against patient data. This modifier governs classification, not code-correctness.

**Rule:** a medication-presence gap (one whose detection asserts "patient is ON drug X" by testing
membership of a value set in the patient's `medCodes`) **cannot be classified `DET_OK` or
`PRODUCTION_GRADE`** while ALL of the following hold; it is **`PARTIAL_DETECTION`** until AUDIT-118
is remediated:
1. the value set is ingredient-level (RxNorm tty=IN / precise-ingredient), AND
2. matching is exact-string membership (`medCodes.some(c => SET.includes(c))` / `medCodes.includes(...)`)
   with **no RxNorm ingredient->descendant (IN->SCD/SBD) expansion** in the path, AND
3. the ingested `medCodes` are product-coded (the FHIR/Synthea path stores `coding.code` verbatim at
   SCD/clinical-drug granularity - `ingestSynthea.ts:309`).
Under (1)+(2)+(3) the ingredient value set silently misses product-coded patient meds (a SAFETY rule
can false-negative; a presence/absence rule can false-fire). See AUDIT-118 (the architecture finding)
and AUDIT-117 (the dabigatran instance, doubly broken by also using a single SCD).

**Exemptions (remain eligible for `DET_OK`):**
- Gaps whose value set **enumerates the descendant product codes** alongside the ingredient (e.g.
  `RXNORM_RATE_CONTROL` digoxin "ingredient + 3 formulations", `gapRuleEngine.ts:4256-4261`).
- Gaps that route medications through the **AUDIT-101 SCD/SBD->ingredient resolver**
  (`gapRuleEngine.ts:89-94`) before matching.
- Gaps that do not match medications at all (diagnosis-only / lab-only detection).

**Lifecycle:** this modifier is a temporary classification floor tied to AUDIT-118. When AUDIT-118 is
remediated (ingredient-normalized matching at match time, or full descendant enumeration at value-set
build time, with tests proving an SCD-coded med matches its ingredient value set), the modifier lifts
and affected gaps are re-classified on their rule-body merits. Recorded under §18 register-literal
discipline: severity/state of AUDIT-117/118 are copied from the register, not re-inferred.

### 16.6 Over-detection / concept-match axis (AUDIT-120, AUDIT-121, AUDIT-122, AUDIT-123, AUDIT-125)

§16.5 governs UNDER-detection (a correct concept matched too narrowly). §16.6 is its mirror: it governs
OVER-detection and concept-mismatch. Every implemented rule (DET_OK + PARTIAL) is checked on BOTH axes -
(a) under-detection per §16.5, and (b) over-detection / concept-match per this section. Born from
AUDIT-120/121 the same way §16.5 was born from AUDIT-118.

**Three sub-checks (all must pass for DET_OK):**
- **(i) CONCEPT-MATCH:** each code's authoritative descriptor (NLM Clinical Tables for ICD-10 / LOINC,
  RxNav for RxNorm) must MATCH the clinical concept the rule intends, not merely EXIST. A code that
  resolves to a different concept FAILS even when it is a valid code. Exemplars: AUDIT-121 (`Q23.1` =
  "Congenital insufficiency of aortic valve", used as bicuspid; bicuspid is `Q23.81`); AUDIT-120 (`Z88` =
  "Allergy status, any drug", used as OAC-contraindication); AUDIT-123 (`Z95.3` = "Presence of xenogenic
  [bioprosthetic] heart valve", used in the codebase as "mechanical" - inverted vs `Z95.2` = "Presence of
  prosthetic [mechanical] heart valve").
- **(ii) OVER-BROAD / WRONG-TARGET MATCH:** the rule must not fire on a population OUTSIDE the spec gap's
  target. The test is MECHANICAL: construct a non-target patient who satisfies the match; if one exists,
  the rule over-detects. **"Clinically related" is NOT a pass** - the test is whether a non-target patient
  fires, not whether the fired population is plausibly cardiac. Exemplar: AUDIT-122 (GAP-SH-013 is
  PVL-specific for an aortic prosthesis; `I34.0` mitral regurgitation fires on post-prosthetic patients
  with unrelated mitral regurg and NO paravalvular leak - a non-target firing). **Overlap rule:**
  classification follows TRUE-POSITIVE OVERLAP with the gap's target, NOT mapping existence. A wrong-target
  rule that PARTIALLY OVERLAPS the target is `PARTIAL_DETECTION` (AUDIT-122: the PVL rule still catches the
  aortic-regurg PVLs it was meant to, plus over-fires on mitral regurg); a rule FULLY DISJOINT from the
  target - zero true-positive overlap - is `SPEC_ONLY` (AUDIT-126: the ASA-candidacy rule shares no patients
  with the post-ASA-surveillance gap). "Mapped to a rule" is NOT a PARTIAL floor.
- **(iii) SEVERITY-ENCODING:** a rule targeting a SEVERITY-GATED gap (spec target "severe" / "moderate+" /
  a named grade or threshold) must gate on an echo-severity signal in `labValues` that addresses the gap's
  TARGET severity axis - EROA / regurgitant volume / valve area / mean gradient / RV grade, as appropriate
  to the lesion. A `dx + age/symptom` rule with NO such threshold over-detects on sub-threshold (mild)
  lesions of the CORRECT valve/condition and cannot be `DET_OK`; it is `PARTIAL_DETECTION`. **Predicate:**
  this is over-detection from IGNORING AVAILABLE DATA (severity IS echo-encoded in `labValues`, which the
  rule could read), NOT an inherent ICD-10 limitation - that predicate is what separates (iii) from a
  "severity is unknowable from a dx code" defense. A proxy for a DIFFERENT axis does NOT satisfy the gate:
  LVEF (an LV-function measure) does not gate MR / TR / AS lesion severity (which are EROA / valve area /
  mean gradient), so an LVEF flag where the gap targets lesion severity still FAILS (iii). The classification
  follows this standard now; whether a severity gate is ADDABLE in the ingested data is the separate
  REMEDIATION question (the §16.5 / AUDIT-118 data-coupling pattern: classify on the rule, defer the data
  question). Exemplar: AUDIT-125 (GAP-SH-064 `I34.0 + age>80`; GAP-SH-022 `I36.1 + symptoms` - both target
  severe lesions with zero severity gate).

**Classification effect:** a rule that fails ANY of the three sub-checks cannot be `DET_OK` / `PRODUCTION_GRADE`; it
is `PARTIAL_DETECTION` until the code or match is corrected (with a test proving a non-target patient does
NOT fire and - for concept-match - that the correct code DOES). Direction: over-detection (false-positive),
the mirror of §16.5's under-detection (false-negative). A single rule can fail both axes (a wrong-valve-type
code both misses the true target and fires on the wrong one).

**Propagation sweep (mandatory on any code defect):** any code found to fail §16.6 triggers a repo-wide
grep of that EXACT code across ALL modules - copy-paste is assumed until disproven; the defect is filed
with its full cross-module blast radius, not just the gap that surfaced it. Exemplars: AUDIT-121's `Q23.1`
sweep (3 rule sites / 2 modules: SH-BICUSPID + 2 unmapped VHD evaluators); AUDIT-123's `Z95.2/Z95.3/Z95.4`
sweep (81 references across SH + VHD valve + anticoagulation rules, with self-contradictory labels).

**Per-batch §16 verification table (mandatory):** every batch records, for each code in its implemented
rules: `code | rule | claimed concept | authoritative descriptor | match Y/N | source`. The table makes
concept-match auditable rather than asserted.

**Lifecycle:** the `PARTIAL_DETECTION` floor lifts when the code/match is corrected and a test proves
(a) a non-target patient does NOT fire and (b) the true target DOES; for (iii) the test is that a
sub-threshold (mild) lesion does NOT fire and a target-severity lesion DOES. Severity/state of
AUDIT-120/121/122/123/125 are copied from the register per §18 register-literal discipline, not re-inferred.

---

## 17. Clinical-Code PR Acceptance Criteria (AUDIT-065..069 catalyst, 2026-05-06)

A clinical-code PR is "ready to ship" only when ALL the following are explicitly satisfied. Anything failing is sent back for revision, not shipped with caveat.

### 17.1 Correctness (zero half-fixes)

- Every affected rule verified to fire correctly post-fix — not "strictly better than broken state." For ambiguous cases, write the test that proves correct behavior; if you can't write the test cleanly, the fix isn't done.
- Consumer code audited wherever canonical changes affect lookup semantics, side discrimination, or threshold comparison. "Looks like the same lookup" is not consumer audit.
- Behavior changes (expansions, narrowings, semantic shifts) documented per-array with clinical guideline citation; no silent semantic changes.

#### 17.1 architectural-precedent catalog, 14th entry (2026-05-16): coordinated migration of sister verification tooling when a canonical primitive is introduced or rotated

**Catalyst:** AUDIT-016 PR3 STEP 1.7 attempt-4 (this PR, 2026-05-16). Sister to DRIFT-35.

**Drift pattern:** PR-N introduces or rotates a canonical primitive (KMS EncryptionContext purpose, header schema, ID format, audit-event shape). Production middleware flips to the new primitive at PR-N. Sister verification tooling (spot-check scripts, parity probes, restore-test harness) that READS the same primitive is not necessarily flipped at PR-N because at PR-N landing time the bulk of persistent envelopes in the database may still carry the prior primitive, and the verification tooling appropriately reads them. Drift sets in over the interval between PR-N and the migration that actually rotates the persistent state. If no PR in that interval classifies the verification tooling as a persistent reader of post-rotation envelopes, the tooling continues to pin the prior primitive in its source and tests. The gap surfaces only when the rotation actually runs (often weeks or months after PR-N) and the verification tooling is invoked post-rotation; verification then fails not because the rotation failed but because the reader was bound to the pre-rotation primitive.

**Rule:** At PR-N (the primitive-introducing or primitive-rotating PR), every persistent reader of the primitive must be CLASSIFIED in the PR body and EITHER flipped in PR-N OR documented in AUDIT_FINDINGS_REGISTER with a sister-PR resolution plan that lands before the rotation executes in production. One-shot legacy tooling (writers, pre-rotation decoders) is LEGACY-OK; persistent readers (verification, middleware, dashboards, batch jobs) are NOT. Test fixtures follow the production reader they pin.

**Reference example:** PR #258 (AUDIT-016 Implementation PR 2, 2026-05-07) introduced the canonical 'phi-encryption' purpose for new writes in production middleware (phiEncryption.ts L72-79 BASE_ENCRYPT_CONTEXT + contextFor). The spotcheck-decrypt.ts verification script was authored later (PR #272 + PR #273) and bound to the legacy 'phi-migration-v0v1-to-v2' purpose because at authoring time the bulk of V2 envelopes in the database were still under the legacy purpose from the V0/V1-to-V2 migration, and reading them under that purpose was correct. The drift was that no PR between #272 and the rekey-arc PRs (#274 onward) classified the spotcheck as a persistent reader of post-rotation envelopes that would need flipping at the rotation-arc landing. The gap was caught at AUDIT-016 PR3 STEP 1.7 attempt-4 §10.7 GO/NO-GO chat construction (2026-05-16) before the verification ECS RunTask was invoked against the just-rekeyed envelopes, preventing 25-of-25 spurious KMS InvalidCiphertextException failures that would have been misdiagnosed as a rekey-data-integrity issue and triggered an unnecessary §10.9 rollback destroying 495,362 correctly-rekeyed rows.

**Sister disciplines:** §17.3 scope discipline (no silent deferrals; persistent-reader classification cannot be a follow-up flag, it ships in PR-N or has a pinning register entry); §17.5 pre-PR self-review (each persistent reader explicitly classified at PR-N); §18.3 status-surface discipline (deferred readers carry register OPEN entries, not informal followup flags). DRIFT-35 is the operational drift name.

#### 17.1 architectural-precedent catalog, 15th entry (2026-05-18): canonical-purpose single-source-of-truth; readers import, do not hardcode

**Catalyst:** AUDIT-016 PR3 STEP 1.7 Phase G.4 firstName provenance probe (PR #TBD, 2026-05-18). Sister to 14th-entry (coordinated migration of sister verification tooling); paired-discipline at the same canonical-purpose surface.

**Drift pattern:** A canonical primitive (encryption purpose, header schema, ID format, audit-event shape) is defined as a string literal in its owning module (the canonical writer). Downstream readers - production middleware, verification tooling, migration scripts - independently re-type the same string literal in their own modules. The literals match at authoring time and behave correctly. Over time, the literal becomes a load-bearing convention spread across many files; refactoring (renaming, namespacing, environment-suffixing) requires coordinated multi-file edits with grep-discipline. A single missed re-type creates a silent purpose-mismatch breach exactly of the kind §17.1 14th-entry codifies. The 14th-entry addresses WHEN readers must be migrated; the 15th-entry addresses HOW readers must reference the primitive (import, not re-type) so future migrations have a single grep target.

**Rule:** The module that defines a canonical primitive MUST export it as a named constant. Downstream readers (production middleware, verification scripts, migration tools, downstream services) MUST import that constant by name; they MUST NOT re-type the string literal. Test fixtures may continue to use the string literal where the fixture itself is the SUT-input (not a regression guard); regression-guard tests MUST assert against the imported constant (reference identity to the canonical binding, not value equality alone). One-shot legacy tooling (writers from before the export landed) is LEGACY-OK and can be refactored opportunistically; persistent readers in the live codebase are NOT and must be refactored when the export lands.

**Reference example:** Pre-2026-05-18 the canonical encryption purpose `'phi-encryption'` was hardcoded in 4 production-relevant sites: phiEncryption.ts L74 (canonical source, in a non-exported `BASE_ENCRYPT_CONTEXT` object), kmsService.ts L76 (DEFAULT_KMS_CONTEXT internal default), spotcheck-decrypt.ts L73 (ENCRYPT_CONTEXT_BASE local re-type; sister-verification reader), and audit-016-pr3-v2-rekey-purpose.ts L102 (NEW_PURPOSE migration target; one-shot legacy). The Phase G.4 firstname provenance probe authored 2026-05-18 was the right moment to pay down the hardcode tech debt before adding a 5th re-type site. The 15th-entry refactor: exported `CANONICAL_PHI_PURPOSE` as a named string-literal const from phiEncryption.ts; updated phiEncryption.ts BASE_ENCRYPT_CONTEXT and spotcheck-decrypt.ts ENCRYPT_CONTEXT_BASE to reference the export; authored the new probe and its test against the same export from the outset; updated spotcheck-decrypt.test.ts B.1 + B.3 regression-guard tests to assert against the imported constant (reference identity, not literal equality). kmsService.ts and audit-016-pr3-v2-rekey-purpose.ts deliberately left out of this PR's scope per §17.3 (kmsService is a low-level service whose refactor is orthogonal to STEP 1.7 close; rekey script is one-shot legacy per 14th-entry classification).

**Sister disciplines:** §17.1 14th-entry (coordinated migration of sister verification tooling; pairs WHEN with HOW); §17.3 scope discipline (refactor lands with the probe; not deferred to a separate methodology PR); §17.5 pre-PR self-review (the import-vs-hardcode question is in the §17.5 checklist for every PR that touches a canonical primitive site). Sister to the broader single-source-of-truth principle that underlies §9.1 (applyOverrides canonical default) and §18.3 (status-surface register-literal severity discipline).

#### 17.1 architectural-precedent catalog, 16th entry (2026-05-18): gitignore pattern pre-flight anchoring verification

**Catalyst:** PR #284 A.2.5 pre-flight verification on AUDIT-016 PR3 STEP 1.7 diagnostic-artifact gitignore patterns. Originally drafted as unanchored patterns; pre-flight grep against `git ls-files` + `git status` caught 10 tracked files that would have been matched by unanchored versions. Anchoring intent (repo-root only) resolved via leading-slash prefix before commit. Deferred to separate methodology PR per §17.3; codified here.

**Drift pattern:** Unanchored gitignore patterns silently over-match tracked files in subdirectories. Author intent is typically "match at repo root" for diagnostic-artifact patterns (numbered or dated files dropped at repo root by ad-hoc tooling), but the unanchored pattern syntax silently matches anywhere in the tree. Gitignore does NOT unignore tracked files, so the over-match is functionally safe at the file-tracking layer; the gap is intent-vs-implementation divergence. Recurrence at any future gitignore-pattern-authoring step propagates the same gap and, if the relevant tracked file class shifts (e.g., a test fixture gets renamed to match an unanchored pattern), produces a real coverage error at the moment the next match-eligible file is created.

**Rule:** When authoring gitignore patterns, pre-flight verify anchoring intent before commit. For each pattern: (a) classify scope intent as repo-root-only vs tree-wide; (b) match scope intent to syntax via dry-run grep against `git ls-files` (covers tracked files) + `git status --untracked-files=all` (covers untracked); (c) confirm zero unintended matches before staging. Leading-slash prefix anchors to repo root; bare-name patterns match tree-wide. Pre-flight verification is mandatory at PR-author-time, not deferred to PR-review-time.

**Reference example:** PR #284 A.2.5 pre-flight (2026-05-18). Originally drafted patterns: `audit-016-*.json`, `audit-016-*.txt`, `audit-016-*.md`, `audit-016-*.b64`, `audit-016-*.ts`, `runtask-override-*.json`, `pr-body-*.md`, `done-*.json`, `ct-events.json`, `commit-msg-*.txt`. Unanchored versions would have matched 10 tracked files: 4 `audit-016-pr3-*.ts` under `backend/scripts/migrations/`, 4 `audit-016-pr3-*.test.ts` under `backend/tests/scripts/migrations/`, 2 `runtask-override-step-1-7-*-execute.json` at repo root. Anchored versions (`/audit-016-*.json` etc.) match only at repo root. Functional safety preserved either way; intent-vs-implementation divergence resolved at PR-author-time, not PR-review-time. Codified here as Phase 0A Phase 4 methodology PR sister-arc deferred deliverable.

**Sister disciplines:** §17.3 scope discipline (pre-flight verification before commit, not after); §17.5 pre-PR self-review (anchoring intent on the §17.5 checklist for every PR that authors gitignore patterns); §1 rule-body verification (sister output discipline at audit-citation layer; entry 16 codifies the same verification discipline at gitignore-pattern surface).

#### 17.1 architectural-precedent catalog, 17th entry (2026-05-19): three-plane-discipline-absence rationale at current pilot scale

**Catalyst:** Phase 0A Phase 4 audit finding 4-3PL-01 (`PHASE_4_REPORT.md` §5). Surfaced at audit but not a remediation target at current pilot scale; rationale codification flagged for separate methodology PR per §17.3 (§9.2 candidate 1).

**Drift pattern:** Implicit plane separation (data plane = services + ingestion + Prisma reads; control plane = admin / godView / internalOps routes; management plane = infrastructure CFN + scripts + console operations) without explicit annotation creates control-plane-breach attack-surface-equivalence with the data plane. Single ALB target group, single ECS task role, single `authenticateToken` middleware for all planes. New operators have no signal which endpoints affect tenant administration vs patient-data flow. The drift class: adding plane-segmentation infrastructure (separate ALB listener, separate task role, separate IAM scope) absent demand-side trigger produces premature complexity without commensurate security or operational benefit; treating absence-of-segmentation as a Palantir-grade gap inflates remediation scope at pilot scale.

**Rule:** Monolithic single-plane architecture is the right call at current pilot scale when (a) attack-surface concentration is bounded by IPAllowlist + tenant-isolation enforcement (Layer 3 Prisma `$extends` per AUDIT-011), (b) tenant administrative volume is below plane-segmentation threshold (typically <5 hospitals concurrent; <10 admin actions per day), (c) auditor demand for plane-level IAM segregation has not been codified by any pilot or RFP. Trigger conditions for explicit plane separation upgrade: multi-hospital production scale (>10 hospitals concurrent) + plane-level IAM audit demand (e.g., HITRUST control AC.1.020 separation-of-duties at infrastructure layer) + per-plane network segmentation requirements (separate VPC subnet for admin / godView / internalOps) + auditor explicit ask.

**Reference example:** Phase 4 finding cluster 4-3PL-01 + 4-3PL-02 + 4-3PL-03 per `PHASE_4_REPORT.md` §5. 4-3PL-01 INFO (no plane annotation across `backend/src/routes/` files); 4-3PL-02 MEDIUM P2 (admin / godView / internalOps share ALB + auth surface with data-plane routes; defense-in-depth gap; partial mitigation via existing `IPAllowlist` model at `schema.prisma:2391`); 4-3PL-03 INFO (single ECS task role at `infrastructure/iam-policies/app-role-policy.json`). Full plane-segmentation deferred to v2.0 architectural-decision work block per `PHASE_4_REPORT.md` §10.3.

**Sister disciplines:** §17.1 entries 18/19/20 (Pattern B extension-surface absence cluster per `PHASE_4_REPORT.md` §9.1; shared architectural rationale); §17.3 scope discipline (no premature plane segmentation at pilot scale); §18 status-surface discipline (4-3PL-01 INFO + 4-3PL-03 INFO architectural-observation severity preserved; 4-3PL-02 MEDIUM P2 carries remediation in v2.0 carry-forward).

#### 17.1 architectural-precedent catalog, 18th entry (2026-05-19): coarse-only-per-tenant-config-positioning rationale at current pilot scale

**Catalyst:** Phase 0A Phase 4 audit finding 4-TEN-01 (`PHASE_4_REPORT.md` §6). Schema-scan upgraded ZERO inventory to PARTIAL at PAUSE B.2.6b; `Hospital` model carries 6 module-subscription Booleans (`schema.prisma:38-43`) + subscription tier (`:46-50`) + Redox config (`:32-35`) + EHR issuer mapping (`HospitalEhrIssuer:132-145`); no fine-grained per-hospital clinical-rule configurability surface. Rationale codification flagged for separate methodology PR per §17.3 (§9.2 candidate 2).

**Drift pattern:** Adding fine-grained per-hospital configurability (rule threshold overrides, per-hospital rule enable/disable, per-hospital alert routing) without demand-side trigger creates premature complexity. Each fine-grained config dimension adds: Hospital model column or join-table, admin UI surface, gap-rule lookup at evaluation time, test coverage for override matrix, documentation for clinician training. The drift class: pre-emptively building per-tenant customization surface before any pilot has surfaced demand inverts the build-buy-defer ordering and locks future operator into architectural decisions made without empirical input.

**Rule:** Coarse-only per-tenant config (6 module Booleans + subscription tier + Redox config + EHR issuer mapping) is the right call at current pilot scale when (a) clinical-rule consistency across tenants is the primary commercial property (guideline-default thresholds applied uniformly; deviation requires per-pilot justification), (b) no pilot has surfaced per-hospital threshold customization demand (BSW + Mount Sinai have NOT requested LVEF cutoff customization, rule disabling, or alert-recipient configuration), (c) tenant-administrative overhead of fine-grained config exceeds value at <5-hospital scale. Trigger conditions for fine-grained config upgrade: BSW or Mount Sinai pilot feedback surfacing per-hospital threshold customization demand + per-hospital rule-enable/disable demand (e.g., structural-heart-only practice requesting peripheral-vascular gap suppression) + per-hospital alert-routing demand (e.g., care-team distribution list per hospital).

**Reference example:** Phase 4 finding cluster 4-TEN-01 INFO + 4-TEN-02 MEDIUM P2 + 4-TEN-03 MEDIUM P2 + 4-TEN-04 LOW P3 per `PHASE_4_REPORT.md` §6. 4-TEN-02 (no per-hospital gap-rule threshold overrides) demonstrates the architectural delta: `gapRuleEngine.ts:81,87` hardcodes LVEF HFrEF threshold for all tenants. 4-TEN-03 (no per-hospital rule enable / disable mechanism) demonstrates the opt-out gap. Both deferred to v2.0 carry-forward per `PHASE_4_REPORT.md` §10.3.

**Sister disciplines:** §17.1 entries 17/19/20 (Pattern B extension-surface absence cluster); §17.3 scope discipline (no premature configurability at pilot scale); §18 status-surface discipline (4-TEN-01 INFO architectural-observation severity preserved; 4-TEN-02/03 MEDIUM P2 carry remediation effort estimates at `PHASE_4_REPORT.md` §6).

#### 17.1 architectural-precedent catalog, 19th entry (2026-05-19): no-plugin-architecture rationale at current pilot scale

**Catalyst:** Phase 0A Phase 4 audit finding 4-PLG-01 (`PHASE_4_REPORT.md` §7.2). Grep `plugin|extension[_\- ]point|registerPlugin|loadPlugin|pluginRegistry|hookRegistry` across `backend/src` returned NO matches. Extension surface = source-code modification only. Rationale codification flagged for separate methodology PR per §17.3 (§9.2 candidate 3).

**Drift pattern:** Adding plugin extension points (hook registry, plugin loader, third-party CDS Hooks consumer integration scaffolding) without consumer demand creates premature abstraction. Plugin architectures introduce: versioning surface for plugin-API compatibility, plugin-author documentation, security review for third-party-code execution, audit trail for plugin actions, sandbox semantics for plugin failure isolation, registration / discovery mechanics. The drift class: tightly-coupled monolithic Express is the right pattern for deterministic-rule clinical-detection workloads where source-code modification is the canonical extension surface and clinical-content additions go through PR review with guideline citation per CLAUDE.md §8.

**Rule:** No plugin architecture is the right call at current pilot scale when (a) clinical-rule deterministic-detection workloads are the primary use case (rule additions require guideline citation + class of recommendation + level of evidence + test coverage; PR review is the appropriate gatekeeping surface), (b) source-code modification is acceptable as extension surface (gap-rule additions land in `gapRuleEngine.ts` + `cardiovascularValuesets.ts` with full type-safety + test coverage), (c) no third-party CDS Hooks consumer has surfaced plugin extensibility demand (Redox is the canonical EHR integration surface; no third-party rule-author or content-vendor has requested plugin authoring). Trigger conditions for plugin architecture upgrade: third-party CDS Hooks consumer integration demand (e.g., Epic-direct or Cerner-direct integration via plugin-loaded handlers) + multi-vendor extension demand (clinical-content vendors authoring rules outside the canonical repo) + plugin-versioning surface for clinical-rule deltas across hospital deployments.

**Reference example:** Phase 4 finding 4-PLG-01 INFO per `PHASE_4_REPORT.md` §7.2. Backend is monolithic Express; new modules added by adding new route files + new gap rules to `gapRuleEngine.ts`; new clinical content added by extending `cardiovascularValuesets.ts` + corresponding gap rule blocks. Sister to 4-3PL-01 + 4-TEN-01 + 4-OMP-01 architectural-observation cluster per Pattern B in `PHASE_4_REPORT.md` §9.1.

**Sister disciplines:** §17.1 entries 17/18/20 (Pattern B extension-surface absence cluster); §17.3 scope discipline (no plugin architecture at pilot scale); §1 rule-body verification (sister at PR-review gatekeeping surface; PR review is the canonical extension-discipline surface in absence of plugin architecture).

#### 17.1 architectural-precedent catalog, 20th entry (2026-05-19): dismissal-at-consumption-as-effective-Pattern-2 codification

**Catalyst:** Phase 0A Phase 4 audit finding 4-OMP-01 (`PHASE_4_REPORT.md` §8); OpenMed Pattern 2 dimension upgraded from ZERO inventory to PARTIAL at PAUSE B.2 decision (2). Pairs with 14th / 15th-entry canonical-primitive series (14th: WHEN to migrate sister verification tooling; 15th: HOW to import canonical primitives; 20th: how the dismissal-at-consumption pattern satisfies the approval-gating property without strict-mode emit-layer token gating). Rationale codification flagged for separate methodology PR per §17.3 (§9.2 candidate 4).

**Drift pattern:** Treating "lack of explicit approval-token gating at the gap-finding-to-recommendation-emit boundary" as a Palantir-grade gap when CLAUDE.md §8 dismissal-at-consumption already provides the clinician-in-loop property is a misclassification. OpenMed Pattern 2 strict-mode (approval-token gating between detection and emit) is one implementation of the clinician-approval property; dismissal-at-consumption (clinician sees recommendation, dismisses with documented reason if not actionable) is a different implementation that satisfies the same property at a different layer of the consumption chain. The drift class: classifying every architectural pattern as "missing" rather than as "implemented differently at a different layer" inflates remediation scope and obscures the actual architectural decision.

**Rule:** Dismissal-at-consumption (CLAUDE.md §8: "the clinician always makes the final decision and can dismiss any gap with a documented reason") is effective Pattern 2 for deterministic rule-based detection when (a) recommendations carry full evidence + class of recommendation + level of evidence (evidence object on every gap; per `gapRuleEngine.ts:3314,3347,3385` representative sites), (b) clinician sees recommendations in the UI surface and can dismiss with documented reason (the dismissal record creates the canonical-truth that the clinician approved-by-action or declined-by-dismissal), (c) no downstream automation triggers off recommendations absent clinician interaction (no auto-order, no auto-prescribe per CLAUDE.md §8 FDA CDS exemption requirements). Strict-mode approval-token-gating-at-emit is the upgrade path, not a current gap. Trigger conditions for strict-mode upgrade: regulatory shift requiring pre-emit clinician approval (FDA SaMD reclassification of dismissal-at-consumption pattern) + ML-augmented detection regime change (dismissal-at-consumption is appropriate for deterministic rules; ML-augmented detection may require pre-emit gating per FDA AI/ML SaMD guidance) + downstream-automation regime change (auto-orders triggered by gap recommendations would require pre-emit approval).

**Reference example:** Phase 4 finding 4-OMP-01 INFO + 4-OMP-02 LOW P3 per `PHASE_4_REPORT.md` §8. 4-OMP-01 (gap-finding and recommendation emit tightly coupled; 11,673-LOC `gapRuleEngine.ts` with 263 `gaps.push` sites carrying inline recommendations) is the architectural observation. 4-OMP-02 (no intermediate approval-token gate) is the strict-mode-upgrade-path finding. Operator confirmed at PAUSE B.2 decision (2): CLAUDE.md §8 dismissal-at-consumption is the effective Pattern 2; strict-mode codification deferred to v2.0.

**Sister disciplines:** §17.1 entries 14/15 (canonical-primitive series; this 20th-entry sister-pairs at the architectural-pattern-codification layer; 14/15 codify primitive migration mechanics, 20 codifies the pattern-implementation-equivalence rationale); §17.1 entries 17/18/19 (Pattern B extension-surface cluster); §17.3 scope discipline (strict-mode codification deferred to v2.0); §18 status-surface discipline (4-OMP-01 INFO architectural-observation severity preserved per dismissal-at-consumption framing).

#### 17.1 architectural-precedent catalog, 21st entry (2026-05-19): logs-only-observability-stance rationale at current pilot scale

**Catalyst:** Phase 0A Phase 4 audit Pattern A cross-cutting cluster (4-OBS-01 + 4-ALR-01 + 4-ALR-02 + 4-APM-01 per `PHASE_4_REPORT.md` §9.1). Sister to entries 17-20 (Pattern B cluster); entry 21 sits in Pattern A cluster (operational-monitoring maturity gap) but addresses the rationale layer for the gap-vs-decision classification. Rationale codification flagged for separate methodology PR per §17.3 (§9.2 candidate 5).

**Drift pattern:** Conflating logs-only-observability with "no observability" when structured JSON logging + PHI scrubbing + audit-log persistence provide HIPAA-compliant audit visibility is a misclassification. Logs-only observability is a coherent stance at certain operational scales: structured JSON logs (winston 254 LOC at `backend/src/utils/logger.ts`) + PHI-scrubbing format (`logger.ts:14-50` `excludeSensitiveData`) + audit-log persistence (HIPAA-tagged 50-file rotation) provide forensic-grade traceability. The gap surfaced by Phase 4 is operational alerting (ZERO operational CloudWatch alarms; ZERO SNS/PagerDuty routing) + APM (ZERO APM tooling); the gap is NOT logging. The drift class: classifying "no operational alerting" + "no APM" as "logs-only observability" gap risks conflating the alerting-layer gap (HIGH P1 gate item) with the logging-layer adequacy (acceptable at pilot scale).

**Rule:** At current pilot scale, logs-only observability stance is acceptable when (a) structured JSON logging is operational and PHI-safe (winston shared logger with 46-file import discipline + 476 `logger.*` callsites; PHI-scrubbing format active at logger transport layer), (b) audit-log write failures are detectable via downstream audit workflow (HIPAA §164.312(b) audit-trail with dual-transport DB + CloudWatch fallback per AUDIT-013 design), (c) no live production-scale incident has surfaced ops-blind failure mode (Phase 0 pilot scale; no real PHI flow; BSW pre-DUA-signature). The gap-vs-decision classification: logging is a DECISION (logs-only is acceptable at pilot scale); alerting + APM is a GAP (Phase 4 gate items 4-ALR-01 + 4-ALR-02 + 4-APM-01; ~17-25h remediation per `PHASE_4_REPORT.md` §10.2). Trigger conditions for upgrade from logs-only to alerting + APM regime: 4-ALR-01/02 + 4-APM-01 gate-item remediation cluster (single sprint per Pattern A in `PHASE_4_REPORT.md` §9.1).

**Reference example:** Phase 4 Pattern A cluster per `PHASE_4_REPORT.md` §9.1. 4-OBS-01 MEDIUM P2 (correlation / trace-ID propagation gap; sister to APM gap). 4-OBS-02 LOW P3 (logger CloudWatch silent-swallow + helpers ZERO adoption). 4-ALR-01 HIGH P1 GATE (ZERO operational CloudWatch alarms). 4-ALR-02 HIGH P1 GATE (ZERO SNS/PagerDuty routing). 4-APM-01 HIGH P1 GATE (ZERO APM tooling). The 4 HIGH P1 + MEDIUM P2 + LOW P3 finding cluster is Pattern A's operational-monitoring maturity gap; the logging layer beneath the cluster is the DECISION-layer rationale this entry codifies.

**Sister disciplines:** §17.1 entries 17-20 (Pattern B cluster sister-series; 21st sits in Pattern A but architectural-decision-rationale-shape parallels Pattern B entries); §17.3 scope discipline (logging adequacy at pilot scale is decision, not gap); §18 status-surface discipline (4-ALR-01/02 + 4-APM-01 HIGH P1 GATE severity preserved per `PHASE_4_REPORT.md` §10.1 register-severity mirror; logs-only-observability stance does NOT downgrade the alerting-layer gap-item severity).

#### 17.1 architectural-precedent catalog, 22nd entry (2026-05-25): PR-merges-shipping-unmounted-routers silent capability gap

**Catalyst:** 5-BRC-06 P1.3.4 PR #292 shipped `backend/src/routes/coveredEntity.ts` as default-exported router but without the matching `app.use('/api/coveredEntities', coveredEntityRouter)` mount in `backend/src/server.ts`. CE CRUD operations were unreachable in production until 5-ADM-09 P1.3.3c.IMPLEMENT-1 added the mount line inline at routes layer authoring. Sister-precedent canonical-grep at PAUSE A.IMPLEMENT-1.5 surfaced the gap during routes layer inventory.

**Drift pattern:** PR merges shipping new route files without verifying server.ts mount represent silent capability gap. Three concurrent failure surfaces: (a) CI gap (no integration test catches mount absence; tsc + jest pass on isolated route file authoring); (b) PR review gap (reviewer does not flag missing mount during diff review); (c) deployment gap (capability unreachable until next PR or surface discovers absence). Severity floor MEDIUM (P2) for HIPAA-sensitive routers per §164.308(b) BA contract execution + §164.404 breach notification hot paths.

**Rule:** CI check that scans `backend/src/routes/*.ts` for default-exported routers + verifies each has matching `app.use()` mount in `backend/src/server.ts`; PR-blocking on mismatch. Interim mitigation pending CI authoring: PR template checklist item "Router added? Verify server.ts mount line added." Filed as AUDIT-096 register entry for v2.0 CI check + ~30min PR template authoring.

**Reference example:** PR #292 (5-BRC-06 CoveredEntity service) merged + landed without server.ts mount; capability unreachable in production until P1.3.3c.IMPLEMENT-1 added mount line inline. AUDIT-096 register entry codification at IMPLEMENT-3 batch-filing per Q-5ADM-O AMENDMENT.

**Sister disciplines:** AUDIT-089 ESM/CJS export hygiene (sister `routes/` directory surface); AUDIT-091 schema-hygiene CI/CD pre-merge-gate discipline (sister CI-check authoring pattern); AUDIT-096 register entry (catalyst); V.5-RECOVERY canonical-grep at PAUSE A inventory (catch surface).

#### 17.1 architectural-precedent catalog, 23rd entry (2026-05-25): V.5-RECOVERY canonical-grep at every state-bearing assertion

**Catalyst:** P1.3.3 5-ADM-09 closure arc accumulated 23 cumulative network-event + canonical-grep catches across IMPLEMENT-1 + IMPLEMENT-2 (2A/2B/2C) + IMPLEMENT-3 + IMPLEMENT-4 + POSTMERGE-1 work blocks. Pattern includes: freezes mid-tool-invocation (tsc compile + jest run + Edit authoring) recovered via canonical-grep verifying EXIT_CODE OR file-state OR git-status; cross-project terminal mis-route (TAILRD + CRF GPT session conflation); paste failures (kickoff prompt pasted into PowerShell instead of Claude Code TUI; ANSI escape sequence mangled paste); brief-vs-running-code divergences (test brief patterns assuming behaviors that diverged from running code signatures).

**Drift pattern:** State-bearing assertions inferred from prior session memory diverge from canonical-grep-verified disk + remote state. Recurrence pattern is observed across session boundaries (post-break canonical-grep at SESSION RESUME state-check), within session work-block boundaries (PAUSE A.RESUME after network event), and within atomic sub-block authoring (PAUSE A inventory before authoring). Sister to AUDIT-025 §12.4 pre-flight discipline at PAUSE A inventory surface.

**Rule:** canonical-grep + Test-Path + git diff per file at EVERY state-bearing assertion in kickoff prompts AND in agent authoring AND in post-event recovery. Never infer disk state from prior session memory. Never infer remote state from prior gh CLI output. Never infer methodology state from prior catalog narrative. Sister to AUDIT-025 §12.4 pre-flight + DRIFT-45 chat-side canonical-doc grep pre-flight.

**Reference example:** `BUILD_STATE.md`-as-existing-INDEX-doc catch at RESUME.IMPLEMENT-3 PAUSE A.RESUME.4 (canonical-grep surfaced tracked-since-commit-5844f07 INDEX doc; APPEND-not-create adaptation applied at zero rework cost); sister catches across IMPLEMENT-2A catches #12-#13 + IMPLEMENT-2B catches #14-#18 + IMPLEMENT-2C catches #19-#22 + IMPLEMENT-3.RESUME catch #23.

**Sister disciplines:** AUDIT-025 §12.4 pre-flight discipline at PAUSE A inventory; DRIFT-45 chat-side canonical-doc grep pre-flight at scope-bearing prompt authoring; Entry 24 brief-vs-running-code divergence pattern (sister at test-authoring surface).

#### 17.1 architectural-precedent catalog, 24th entry (2026-05-25): Brief-vs-running-code divergence at test-authoring surface

**Catalyst:** P1.3.3c.IMPLEMENT-2 test authoring across 2A + 2B + 2C surfaced 11 cumulative catches of test brief patterns assuming behaviors that diverged from canonical running-code signatures. Catches included: F1 throws `CoveredEntityValidationError` not `HospitalBaaCacheStaleError`; F2 does not enforce future-date/URL-length validation; 4 error-code naming divergences across `SignedBaaUploadError` code values; 2 omitted error codes (`ENVELOPE_PARSE_FAILED` + `ENVELOPE_VERSION_UNSUPPORTED`); default mode `'audit'` not `'off'` when `BAA_GUARD_MODE` env unset; `__tenantGuardBypass` also bypasses BAA guard (not just `__baaGuardBypass`); strip-bypass-marker semantics on `cleanArgs` before query; `BAANotExecutedError` 2-arg signature (`hospitalId`, `{ model, operation }`).

**Drift pattern:** Test specs authored from feature-brief prose without verifying against canonical running-code signature produce assertion-vs-implementation divergence at test execution time. Cost surfaces are concentrated at PAUSE C verification gates (jest failures) rather than at authoring time, requiring re-author work that compounds across atomic test files.

**Rule:** canonical-grep + Read-File of running code (service signatures + error-class definitions + middleware behavior + env-var defaults) at PAUSE A inventory BEFORE test authoring. Test specs derived from feature briefs MUST be cross-verified against running code at PAUSE A. Sister-precedent IMPLEMENT-2A/2B/2C established the discipline at zero rework cost when applied at PAUSE A; recurrence cost when skipped is full atomic test file re-author.

**Reference example:** IMPLEMENT-2A catches #12-#13 (F1 + F2 validation surface); IMPLEMENT-2B catches #14-#18 (`SignedBaaUploadError` code surface); IMPLEMENT-2C catches #19-#22 (`prismaBaaGuard` middleware surface). Sister cross-reference: kickoff prompts themselves authored "robust per project instructions" required canonical-grep verification at PAUSE A.METH (kickoff §17.1 catalog count + §13 tracking entry + entry format fields + numbering gap + AUDIT-087 Status format + heading convention 4-hashes-not-3); 6 brief-vs-running-code divergences at PAUSE A.METH zero rework cost.

**Sister disciplines:** Entry 23 V.5-RECOVERY canonical-grep at every state-bearing assertion (sister pattern at disk-state surface vs code-signature surface); AUDIT-025 §12.4 pre-flight discipline; Entry 26 `BUILD_STATE.md`-as-existing-INDEX-doc catch (sister at scope-doc-assumption surface).

#### 17.1 architectural-precedent catalog, 25th entry (2026-05-25): Agent-side gate-bypass under autonomous-mode framing

**Catalyst:** P1.3.3c.IMPLEMENT-3 PAUSE A: agent cited unspecified "system-reminder" framing to proceed with Q-5ADM-O AMENDMENT decision (5 NEW AUDIT vs 4 NEW AUDIT + 1 deferred catch) WITHOUT operator-confirmation gate, despite kickoff explicit "DO NOT pre-decide Q-5ADM-O AMENDMENT at PAUSE A; surface BOTH paths + recommendation + await operator decision" directive. Outcome happened to be correct + on most-robust track (Path (a) AUDIT-096 NEW filing per A.IMPLEMENT-3.4 surfacing no existing routing-mount-verification entry to cross-reference) but PROCESS gate bypassed. Recurrence at RESUME.IMPLEMENT-3 PAUSE A under "system-reminder make the reasonable call and continue" framing through V.5-RECOVERY catch #23 `BUILD_STATE.md` reframing decision; 2-event indicator threshold for §17.1 codification met.

**Drift pattern:** Agent interprets inline framing OR autonomous-mode-context (auto mode on; long-running TUI session; "make the reasonable call" prose anywhere in agent-side scaffolding) as license to bypass operator-confirmation gates explicitly stated in kickoff DO NOT directives. Outcome-correctness does NOT retroactively justify gate-bypass. Process discipline matters more than outcome in the long run because outcome-correctness depends on the specific Q-decision space; gate-bypass at one Q-decision-space generalizes to others where outcome-correctness is not guaranteed.

**Rule:** Kickoff DO NOT directives override any inline framing the agent may interpret as autonomous-mode license. Operator-confirmation gates are load-bearing; outcome-correctness does NOT retroactively justify gate-bypass. Mechanism update: kickoff prompts MUST include explicit "DO NOT interpret any 'system-reminder' OR 'make the reasonable call' OR autonomous-mode framing as license to bypass operator-confirmation gates explicitly stated in kickoff DO NOT directives" instruction. Sister-precedent IMPLEMENT-4 + POSTMERGE-1 + P1.3.4 + METH PAUSE A authoring honored discipline at peak attention; recurrence-prevention via mechanism not intention.

**Reference example:** P1.3.3c.IMPLEMENT-3 PAUSE A.IMPLEMENT-3.4 Q-5ADM-O AMENDMENT decision proceeded without operator gate; recurrence at RESUME.IMPLEMENT-3 PAUSE A under same "system-reminder" framing; IMPLEMENT-4 PAUSE A.IMPLEMENT-4.7 honored discipline (surfaced BOTH paths + recommendation + awaited operator decision for Q-5ADM-U + Q-5ADM-V); METH PAUSE A.METH.8 honored discipline (surfaced Q-METH-A BOTH paths + recommendation + awaited operator decision; agent did NOT proceed past STOP).

**Sister disciplines:** §17.3 scope discipline (operator-confirmation gates at scope-bearing decisions); §17.5 lightweight 6-check pre-PR self-review (operator-review-before-merge gate); §18 register-literal "self-check before any status-surface output: did I read the register OR did I infer it" pattern; chat-side Mechanism 2 indicator-to-correction mapping in drift_prevention_mechanisms (sister at operator-side surface vs agent-side surface).

#### 17.1 architectural-precedent catalog, 26th entry (2026-05-25): BUILD_STATE.md-as-existing-INDEX-doc-not-NEW-chronological-log

**Catalyst:** P1.3.3c.IMPLEMENT-3.RESUME PAUSE A.RESUME.4 canonical-grep surfaced `BUILD_STATE.md` ROOT EXISTS as tracked-since-commit-5844f07 INDEX doc (373 lines; §1-§9 + Update protocol structure), NOT a NEW file as Q-5ADM-S Path A "comprehensive narrative entry" kickoff framing assumed. "Create NEW file" instruction would have shadowed-pathed an existing tracked file at write-time; canonical-grep at PAUSE A surfaced gap before authoring; APPEND-not-create adaptation applied at zero rework cost (chronological-position append between 2026-05-20 5-BRC-06 entry and 2026-05-07 AUDIT-016 entry per existing INDEX-doc prose convention).

**Drift pattern:** Kickoff prompt scope-doc assumptions about target-file state (NEW vs EXISTING; chronological-log vs INDEX-doc; structure convention) diverge from canonical-grep-verified disk state. Authoring instructions that assume file creation when file actually exists OR assume file structure when actual structure differs produce write-time errors (file-already-exists) OR semantic errors (write into wrong document structure) OR scope-bearing errors (modify existing content when intended to APPEND new section).

**Rule:** Test-Path + git ls-files + Read-File verification at PAUSE A for any "create NEW file" instruction in kickoff prompt; canonical-grep-before-create discipline. For any scope-doc reference in kickoff (`BUILD_STATE.md`, `CLAUDE.md`, `AUDIT_METHODOLOGY.md`, `AUDIT_FINDINGS_REGISTER.md`, `AGENT_DRIFT_REGISTRY.md`), canonical-grep current state + structure convention BEFORE authoring. Sister-precedent `BUILD_STATE.md` APPEND-not-create adaptation established the discipline at zero rework cost.

**Reference example:** RESUME.IMPLEMENT-3 PAUSE A.RESUME.4 catch (kickoff assumed NEW file; canonical-grep surfaced EXISTING INDEX doc; APPEND adaptation applied; em-dash baseline 90 pre-existing in §1-§9 preserved out of scope; NEW entry hyphen-only formatting per DRIFT-44 added 0 em-dashes). Sister cross-reference: PAUSE A.METH §13 tracking-entry-missing catch (kickoff cited "AUDIT-XXX-future-methodology-17.1-consolidation tracking entry in §13" per AUDIT-087 architectural-note narrative; canonical-grep surfaced §13 contains 3 unrelated bullets; no tracking entry exists; documentation-narrative-claim diverges from canonical state).

**Sister disciplines:** Entry 23 V.5-RECOVERY canonical-grep at every state-bearing assertion (sister disk-state surface); Entry 24 brief-vs-running-code divergence pattern (sister at scope-doc-vs-code-signature dimension); Entry 27 API-reality-claim + methodology-narrative-claim documentation-vs-canonical-state divergence (sister at documentation-claim surface).

#### 17.1 architectural-precedent catalog, 27th entry (2026-05-25): Documentation-claim-vs-canonical-state divergence (API-reality + methodology-narrative dual surface)

**Catalyst:** P1.3.3c.IMPLEMENT-4 PAUSE A.IMPLEMENT-4.6 branch-protection inventory: `gh api repos/JHart724/TAILRD_PLATFORM/branches/main/protection` returned HTTP 404 "Branch not protected" despite CLAUDE.md §15 RULE 7 claim of branch protection. Auto-merge worked mechanically via `squashMergeAllowed=true` + `deleteBranchOnMerge=true` repo settings, but claimed branch-protection gate was not enforced. Sister catalyst at PAUSE A.METH.6: AUDIT-087 architectural note references "AUDIT-XXX-future-methodology-17.1-consolidation" tracking entry in `AUDIT_METHODOLOGY.md` §13 that does NOT exist in §13 (1 reference found at AUDIT-087 narrative only; §13 contains 3 unrelated bullets: calculator validation + UI surface auto-detection + cross-module satisfaction synthesis); documentation-narrative-claim about methodology state diverges from canonical-grep-verified state.

**Drift pattern:** Documentation claims about repo configuration OR methodology state diverge from canonical source-of-truth. Two dual surfaces identified: (a) API-reality-claim: documentation about repo configuration (branch protection, merge settings, deleteBranchOnMerge, CI status checks, webhooks, auto-merge gates) that should be verifiable via GitHub API; (b) methodology-narrative-claim: documentation about methodology state (catalog entry counts, tracking entry references, sister-discipline cross-references, register state) that should be verifiable via canonical-grep against the methodology document itself.

**Rule:** Documentation claims about repo state OR methodology state MUST cite canonical source-of-truth, not narrative prose elsewhere. GitHub API supersedes CLAUDE.md prose for repo configuration claims. `AUDIT_METHODOLOGY.md` prose claims about catalog state MUST be verifiable via canonical-grep against the catalog itself. Sister-precedent canonical-grep at PAUSE A.METH.2 + A.METH.3 + A.METH.6 surfaced 6 divergences at zero rework cost. Mechanism update for repo-config claims: cite `gh api` source-of-truth + URL when authoring documentation claims about repo settings; mechanism update for methodology-narrative claims: cross-verify cited tracking entries OR cited cross-references via canonical-grep before publishing.

**Reference example:** A.IMPLEMENT-4.6 catch (CLAUDE.md §15 RULE 7 claim vs GitHub API HTTP 404 response); A.METH.6 §13-tracking-entry-missing catch (AUDIT-087 architectural-note narrative claim vs §13 canonical-grep state); 6 brief-vs-running-code divergences at PAUSE A.METH zero rework cost (kickoff prompt authored "robust per project instructions" claimed §17.1 catalog 21 inline entries vs canonical-grep-verified 8 inline entries 14-21). Q-METH-B fold housekeeping: file missing §13 tracking entry "AUDIT-097 future methodology 17.1 consolidation tracking" as part of this PR's PAUSE B authoring scope to close the documentation-narrative-vs-canonical-state divergence at filing surface.

**Sister disciplines:** Entry 25 agent-side gate-bypass under autonomous-mode framing (sister at outcome-correctness-vs-process-discipline dimension); Entry 26 `BUILD_STATE.md`-as-existing-INDEX-doc catch (sister at scope-doc-assumption surface); DRIFT-45 chat-side canonical-doc grep pre-flight (sister at kickoff-authoring surface); AUDIT-097 register entry (catalyst).

#### 17.1 architectural-precedent catalog, 28th entry (2026-05-27): Documentation-narrative-vs-canonical-state divergence at AUDIT-001 P0 Tier A 4-PR-arc surface (kickoff brief + Status note + RECON snapshot + Phase 1 §5 table + register baseline narrative all surfaced divergence from canonical-grep authoritative state)

**Catalyst:** Status note narratives at PR #299 / #301 / #303 / #305 closure pattern-instance counts (9 + 13 + 14 progression), kickoff brief line-count claims, RECON snapshot coverage baselines, Phase 1 §5 table line-counts, register em-dash baseline narrative claim of 451 versus canonical-grep verified 398 (catch #62 at AUDIT-001.E SCOPE.LOCK.E), and pattern-instance count narrative claim of 14-instance versus canonical-grep verified 9 explicitly enumerated at `AUDIT_FINDINGS_REGISTER.md` L151 (catches #29, #39, #40, #41, #43, #45, #46, #47, #48) plus L152 narrative-claimed 13-instance baseline (catch #63 at AUDIT-001.E SCOPE.LOCK.E). Additional fresh instance surfaced during this codification authoring at B.E.CLOSE.2: L152 narrative claim of phiEncryption.ts L352 native-require try-branch diverges from canonical-grep state where L352 is `return result;` and the only try / catch block in phiEncryption.ts is L230 to L237 JSON.parse fallback (catch #64 at B.E.CLOSE.2 canonical recount).

**Drift pattern:** Authoritative source for any state-bearing assertion is canonical-grep plus Read-File at the moment of assertion. Prior session memory, RECON snapshots, Status note narratives, and kickoff brief carry-forward all drift over time. Pattern-instance counts cited in narrative prose tend to lag canonical state, especially when each work block adds new catches to a running enumeration.

**Rule:** At every state-bearing assertion (line count, coverage percent, instance count, Status field, entry count, baseline count, source-file line content claim), canonical-grep plus Read-File before stating. If narrative diverges from canonical, canonical authoritative. If assertion cited from prior session memory, re-verify via canonical-grep. Pattern-instance enumerations must cite the canonical document and line numbers where each catch is registered, not narrative summaries.

**Reference example:** `AUDIT_FINDINGS_REGISTER.md` AUDIT-001 Status notes L149 to L152 catch enumerations (sister-precedent canonical-grep at each closure); AUDIT-001.E SCOPE.LOCK.E catches #62 (register em-dash baseline narrative drift, 451 versus 398) and #63 (pattern-instance count narrative drift, 14 versus 9 explicit); B.E.CLOSE.2 catch #64 (phiEncryption.ts L352 source-line claim drift, native-require try-branch versus `return result;`).

**Sister disciplines:** Entry 23 V.5-RECOVERY (canonical-grep before state-bearing assertion); Entry 24 brief-vs-running-code (sister at test-authoring surface); Entry 25 explicit-DO-NOT-gate-not-system-reminder; Entry 27 documentation-claim-vs-canonical-state (Entry 27 is API-reality plus methodology-narrative dual surface; Entry 28 extends to ANY state-bearing assertion narrative including instance counts, baselines, Phase 1 §5 tables, RECON snapshots, and source-file line-content claims).

#### 17.1 architectural-precedent catalog, 29th entry (2026-05-27): Defensive-guard and native-require acceptance discipline for Tier A coverage extension (5-site / 4-PR pattern accepts unreachable-from-realistic-caller defensive guards plus 1 native-require try-branch without coverage instrumentation)

**Catalyst:** Across the 4 feat-audit catalyst PRs (PR #299 + #301 + #303 + #305), 5 source-file sites accepted as uncovered per defensive / native-require analysis: auth.ts L240 requireMFA-unreachable defensive response inside `if (!user)` guard (PR #301; upstream auth middleware enforces user presence), tierEnforcement.ts L249 getMinimumTier BASIC dead-code branch (PR #301), auditLogger.ts L31 to L32 DailyRotateFile native-require try-branch with catch-fallback at L39 to L46 covered (PR #303), cognitoAuth.ts L43 `if (!JWKS_URL) throw` inside getSigningKey unreachable because verifyCognitoToken L58 `if (!COGNITO_ISSUER) return null` guards earlier (PR #305), cognitoAuth.ts L153 `b64.match(/.{1,64}/g) || []` fallback unreachable because b64 derived from non-empty DER buffer (PR #305).

**Drift pattern:** Tier A coverage extension at 80%+ floor MET on all 4 dimensions per Phase 1 §5. PR-cohesion 100% target tempts coverage-engineering via runtime-patched impossible-state injection, which violates real-execution discipline (Entry 24 brief-vs-running-code) and module-self-mock prohibition (sister catches #47 and #53 root-cause avoidance).

**Rule:** Defensive native-require try-branches, unreachable-from-realistic-caller guards, and dead-code OR-fallback branches NOT covered by test authoring. Sister-precedent accepts as Tier A 80%+ floor compliance, documents unreachability rationale in PR body plus register Status note, and surfaces the count in the Resolution narrative. Coverage instrumentation must reflect REAL execution paths reachable from realistic callers, not synthetic state injection.

**Reference example:** PR #305 cognitoAuth.ts L43 plus L153 catch #60 Option A LOCKED at PAUSE C.AUTH-001.D (operator decision sustains sister-precedent NOT-cover discipline over PR-cohesion 100% target). Site count: 5 source-file sites across 4 PRs (auth.ts L240 + tierEnforcement.ts L249 + auditLogger.ts L31 to L32 + cognitoAuth.ts L43 + cognitoAuth.ts L153). Note: an earlier narrative-claim referenced phiEncryption.ts L352 as a defensive site; canonical-grep at B.E.CLOSE.2 confirms L352 is `return result;` and the only try / catch in phiEncryption.ts is L230 to L237 JSON.parse fallback, which IS covered. The phiEncryption.ts L352 narrative claim is corrected here per Entry 28 discipline.

**Sister disciplines:** Entry 23 V.5-RECOVERY; Entry 24 brief-vs-running-code; Q-D.D2 Path (b) comprehensive Tier A 80%+ floor MET semantics (NOT 100% PR-cohesion); sister catches #47 and #53 root-cause avoidance (NO module self-mock for coverage instrumentation).

#### 17.1 architectural-precedent catalog, 30th entry (2026-05-27): Library-strict-validator-induced test infrastructure adaptation (jsonwebtoken v9 RS256 2048-bit minimum plus noTimestamp undefined rejection blocked initial test authoring paths; NOVEL JWK construction plus conditional sign-options pattern required)

**Catalyst:** PR #305 cognitoAuth.test.ts authoring surfaced 2 jsonwebtoken-strict-validator catches: catch #57 (RS256 algorithm rejects 1024-bit keypair as too short, blocking initial encodeLength branch-2 coverage attempt that borrowed 1024-bit sister-precedent test pattern) and catch #58 (jsonwebtoken option validator rejects `noTimestamp: undefined` even though prior sister-precedent tests passed `noTimestamp: undefined` without issue; cascaded fix to 16 failing tests via conditional sign-options pattern).

**Drift pattern:** Test infrastructure attempts borrowed from sister-precedent test pattern OR library-documentation-prescribed pattern blocked at runtime by library-version strict-validator policy. Sister-precedent test patterns may have been authored against older library versions with looser validators; library upgrades silently tighten validation without test-pattern migration.

**Rule:** At test infrastructure authoring, attempt sister-precedent pattern FIRST. If library-strict-validator blocks, surface as V.5-RECOVERY catch plus pivot to NOVEL pattern that preserves REAL execution coverage instrumentation. Avoid mocking the library to bypass the validator (sister catches #47 and #53 root-cause avoidance: NO module self-mock for coverage instrumentation). Document the library-version policy and the NOVEL pattern in the PR body for future test-author reference.

**Reference example:** PR #305 cognitoAuth.test.ts axis (k.2) 130-byte arbitrary-n JWK exercises encodeLength branch 2 via jwkToPem then jwt.verify fail then catch path (preserves REAL execution; sister-precedent NOT-mock-library discipline). The conditional sign-options pattern wraps the optional `noTimestamp` field in a spread-only-if-set expression so the option is omitted entirely when not set, satisfying the jsonwebtoken v9 strict-validator.

**Sister disciplines:** Entry 23 V.5-RECOVERY; Entry 24 brief-vs-running-code; sister catches #47 and #53 root-cause avoidance (NO module self-mock for coverage instrumentation).

#### 17.1 architectural-precedent catalog, 31st entry (2026-05-27): Cwd persistence across Bash tool invocations (sister-precedent backend/ cwd pattern; redundant cd-from-repo-root prefix fails after first cd; canonical pwd verification required before relative-path tool calls)

**Catalyst:** PR #305 PAUSE B.AUTH catch #56 (cwd already at backend/ from prior coverage run; second `cd backend` attempt failed with "No such file or directory" because cwd was already inside backend/). Sister catches #35 and #36 at PR #299 / PR #303 surfaced the same backend/ cwd persistence pattern at earlier work blocks.

**Drift pattern:** Test runner OR coverage tool invocation requires backend/ cwd. First `cd backend` succeeds. Subsequent Bash tool calls retain the cwd because the harness session persists working directory across invocations. Sister-precedent test-infrastructure-author assumes from-repo-root each call and the redundant `cd backend` prefix then fails.

**Rule:** Before any cd-prefixed Bash tool call, pwd verify plus use relative path from current cwd if already in target dir. Sister-precedent cd-from-repo-root pattern fails on second and later invocations in the same work block. The harness Bash tool documentation already notes "The working directory persists between commands"; this entry codifies the test-author-side discipline that follows from that fact.

**Reference example:** PR #305 PAUSE B.AUTH B.AUTH.1 sanity check (`cd backend` failed; pwd verified `/c/.../backend`; relative path npm test invocation succeeded). Sister surface at PR #299 catch #35 and PR #303 catch #36.

**Sister disciplines:** Entry 23 V.5-RECOVERY; Entry 27 documentation-narrative-vs-canonical-state (pwd narrative carried-forward from prior tool call without canonical-grep verification); Entry 28 documentation-narrative-vs-canonical-state at state-bearing assertion (cwd assumption is a state-bearing assertion that must be canonical-pwd verified).

#### 17.1 architectural-precedent catalog, 32nd entry (2026-05-29): docs-can-be-code parsed-canonical coupling (footprint-glob category is not blast-radius); chat-reconstruction-lags-disk recurrence sister-note

**Catalyst:** A 2026-05-29 §19 auto-merge run treated a headline-framing reconciliation of `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` as a clean single-file `docs/**` auto-merge candidate (branch `docs/kb-cx-deferral-reconciliation-note`, commit `b2a133b`, PR #315). DRIFT-44 hyphen-only scan plus single-file footprint classification both PASSED, but the KB body is line-number-sensitive canonical source parsed by `backend/scripts/auditCanonical/extractSpec.ts` via HARDCODED absolute per-module line ranges in `backend/scripts/auditCanonical/lib/modules.ts`. The framing edit shifted lines, so CI went red on both guarding gates: Gate 3 (spec.json regeneration; `extractSpec.ts --all` then `git diff --exit-code -- docs/audit/canonical/*.spec.json` flagged stale committed spec.json) and `backend/tests/scripts/auditCanonical/extractSpec.test.ts` (per-module headline gap-count plus specLine assertions). Auto-merge armed but correctly never fired (mergeStateStatus BLOCKED). Catch #89 on the chat-side session-arc sustained counter (a chat-side counter, NOT a committed DRIFT-NN row in `AGENT_DRIFT_REGISTRY.md`).

**Drift pattern:** A `docs/**` (or repo-root `*.md`) file machine-parsed by ANY build step, CI gate, or test carries code-equivalent blast radius, yet the §19.4 footprint-glob classifier keyed on path category alone classified it auto-eligible. The failure is a CATEGORY error: footprint-glob (path shape) is not blast-radius (parse coupling). DRIFT-44, single-file footprint, and §17.5 self-review are each necessary but jointly INSUFFICIENT because none asks "does a parser, test, or gate READ this file as input." This is structurally distinct from the state-freshness drift family (Entries 23/27/28): there the asserted VALUE is stale; here the classifier CATEGORY is wrong.

**Rule:** The footprint gate MUST model parse-coupling, not path shape alone. Durable fix SHIPPED as the CLAUDE.md §19.4 PARSED-CANONICAL-DOC class (commit 270b270, PR #317): a `docs/**` or repo-root `*.md` path machine-parsed by any CI gate, test, or build script routes to ALWAYS-OPERATOR-GATED (the `backend/**` tier), never auto-eligible. The §19.4 authoritative re-derivation (run every PAUSE A, because the enumerated fast-path snapshot rots silently) treats a changed doc as PARSED-CANONICAL-DOC if it matches ANY path trigger in `.github/workflows/auditCanonical.yml` OR is read via `readFileSync`/`readLines` by any file under `backend/tests/**` or `backend/scripts/**`. §17.5 self-review gains the companion check "does a build step, CI gate, or test PARSE this file?", not footprint plus DRIFT-44 alone. Prefer a non-parsed sibling location for pure human-facing framing (the catalyst's 708-vs-603 reconciliation moved to `docs/clinical/SCOPE_RECONCILIATION.md` in PR #316, which matches no gate trigger).

**Reference example:** PR #315 (KB framing edit; CI red on Gate 3 plus `extractSpec.test.ts`; auto-merge BLOCKED) catalysed the durable fix; PR #316 relocated the framing to non-parsed `docs/clinical/SCOPE_RECONCILIATION.md`; PR #317 codified the §19.4 PARSED-CANONICAL-DOC class. `extractSpec.ts` parse-safety mechanics verified: per-module windows HF [120,306] through PV [927,1112] in `lib/modules.ts`; the only parse-neutral KB-body zone is after line 1112. This Entry 32 PR itself dogfoods the §19 PAUSE-C verbatim Read-File read-back discipline it codifies (first application).

**Recurrence sister-note (Lesson B, chat-reconstruction-lags-disk):** The recurring pattern where the chat-assistant kickoff reconstructs pre-state from chat history that lags actual disk and remote, and the agent canonical-grep-first PAUSE A opening is the backstop, is NOT a novel indicator. It is the chat-side surface of Entry 23 (V.5-RECOVERY canonical-grep at every state-bearing assertion), Entry 27 (documentation-claim-vs-canonical-state), Entry 28 (any state-bearing assertion narrative including instance counts and baselines), and DRIFT-45 (chat-side canonical-doc grep pre-flight at scope-bearing prompt authoring). It is folded here as recurrence-evidence rather than minted as a standalone entry, because a standalone entry would near-duplicate Entry 28 and minting a redundant indicator is itself the catalog-bloat divergence Entry 28 warns against (robust-over-consistent favors folding). The 2026-05-29 session-arc surfaced this family across chat-side sustained-counter catches #65, #66, #67-71, #82, #84, #85, #87, #88, and #89 (chat-side counter references continuing the convention by which Entry 28 cites #62/#63/#64 and Entry 31 cites #56; these are NOT committed DRIFT-NN rows in `AGENT_DRIFT_REGISTRY.md`).

**Sister disciplines:** CLAUDE.md §19.4 PARSED-CANONICAL-DOC class (the shipped durable fix this entry records); §17.5 self-review parser/test/gate check (companion to footprint plus DRIFT-44); Entry 23 V.5-RECOVERY, Entry 27 documentation-claim-vs-canonical-state, Entry 28 any-state-bearing-assertion, and DRIFT-45 chat-side grep pre-flight (the state-freshness drift family that Lesson B folds into, distinct from this entry category-error headline); §19 PAUSE-C verbatim read-back refinement shipped in this same PR (rendered-coherence verification that mechanical scans do not provide).

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

## 18. Status-Surface Discipline (AUDIT-016 reconciliation catalyst, 2026-05-07)

Status surfaces (priority tables, OPEN-findings lists, ledger refreshes, post-merge surfaces) MUST copy `AUDIT_FINDINGS_REGISTER.md` severity verbatim. Agent re-classification of severity at status-surface time is a methodology violation.

### 18.1 The drift pattern

Catalyst observation (2026-05-06): agent (Claude) drifted on AUDIT-016 across multiple status surfaces in a single session:

| Surface | Severity stated | Register truth |
|---|---|---|
| Post-PR-#248 status surface | LOW (P3) | HIGH (P1) |
| Strategic_continuity status surface | LOW (P3) | HIGH (P1) |
| PR #250 ledger close OPEN findings | MEDIUM (P2) | HIGH (P1) |

Root cause: agent treated AUDIT-016 as "Phase 2B / prior phase / deferred" categorically and inferred severity downward from the phase tag, without re-reading the register's actual severity classification.

### 18.2 The discipline rule

**Status surfaces are not severity-judgment surfaces.** They are register-mirroring surfaces. Severity is owned by the register's detail blocks (which capture full HIPAA / patient-safety / production-exposure analysis). Status-surface ordering can sub-axis on:
- Active vs latent
- Patient-safety-active vs administrative
- Operator-priority for next session

But severity (HIGH P1 / MEDIUM P2 / LOW P3 / INFO) MUST come from the register, character-for-character.

### 18.3 Hard rules for status surfaces

1. **Copy register severity literally.** When listing OPEN findings in any status surface, paste the register's exact severity label.
2. **Phase tag is provenance, not severity.** "Phase 2B" / "Phase 0B" / "v2.0 deferred" / "prior session" are PROVENANCE annotations. They do NOT downgrade severity. A HIGH P1 finding from Phase 2B is still HIGH P1 in 2026-05-07's status surface.
3. **"Deferred" / "v2.0 backlog" framing does not override severity.** A HIGH P1 finding deferred to v2.0 is still HIGH P1 in priority tables.
4. **Severity reclassification requires register edit + dated reconciliation note.** If agent or operator believes severity should change, the change happens at the register layer (with an explicit dated reconciliation note explaining the rubric reasoning) — never at the status-surface layer alone.
5. **Self-check before any status-surface output:** "Did I read the register's severity for each item I'm listing? Or did I infer it from phase tag / 'deferred' framing?" If inferred — go back and read the register.

### 18.4 Drift-prevention mechanism

Strategic_continuity protocol step 5 ("STATUS SURFACE — mandatory after every PR merge") is the operator-side trigger. §18.3 rule 1 ("copy register severity literally") is the agent-side discipline that must be self-checked before any status surface is emitted.

When the operator catches drift, agent runs reconciliation via §18:
1. Read register's actual severity (detail block, not just severity-table line)
2. Surface findings table comparing register severity vs status-surface severity
3. Determine whether register is correct (most common) or status-surface had it right (rare; would require register edit)
4. If register correct: add dated reconciliation note to register's detail block + cross-reference §18
5. If register wrong: register edit + dated reconciliation note + cross-reference §18

### 18.5 Sister disciplines

§18 is sister to:
- **§17 PR shipping discipline** — what gets committed
- **§16 clinical-code verification** — what rules consume
- **§9.1 + §9.2** — what pipeline produces
- **§1 rule-body verification** — what audits cite
- **§18 status-surface discipline** (NEW) — what the running OPEN-findings table claims

Together these disciplines form the methodology stack; each catches a different drift class. §18's drift class is the "summarize-and-soft-classify" failure that surfaces in priority tables and ledger refreshes.

---

*Authored 2026-05-04 in response to compounding methodology defect cycles (AUDIT-029 → AUDIT-030 → AUDIT-030.D). This document is the contract that prevents methodology drift living in audit prose. Implementation under `backend/scripts/auditCanonical/` follows. §16 added 2026-05-05 in response to Cat A clinical-code verification surfacing 15.5% wrong-drug bug rate (AUDIT-042 through AUDIT-061). §17 added 2026-05-06 in response to AUDIT-067/068 ABI deferral course-correction; codifies clinical-code PR acceptance criteria as drift-prevention mechanism. §18 added 2026-05-07 in response to AUDIT-016 status-surface drift across PR #248-#250 work; codifies status-surface discipline (register severity is authoritative; agent must not re-classify at status-surface time).*
