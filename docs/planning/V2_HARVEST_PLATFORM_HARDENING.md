# V2.0 HARVEST - PLATFORM HARDENING INPUTS

**Purpose:** Sanitized input to v2.0 PATH_TO_ROBUST authorship. This is NOT a plan and carries NO sequencing - phase placement, ordering, and effort are deferred to v2.0 PATH_TO_ROBUST authorship per the mid-Phase-0 deferral rule. It captures platform-hardening capabilities worth adopting, capabilities to defer behind explicit triggers, and one open decision for the v2.0 author to resolve.
**Status:** INPUT (not a plan; not active execution scope)
**Source:** external platform-hardening review, 2026-06 (generic citation by design)
**Companions:** `docs/PATH_TO_ROBUST.md` (the v2.0 plan spine - the destination for any sequencing decisions), `docs/audit/AUDIT_FINDINGS_REGISTER.md`, `BUILD_STATE.md`
**Scope discipline:** docs-only. This document makes no backend change, no AUDIT-106 remediation, no Pattern 2 audit, and no v2.0 PATH_TO_ROBUST edit. It is read by the v2.0 author; nothing else acts on it.

---

## How to read this document

Each adoption section states WHAT to adopt and its design contract, not WHEN. Sequencing, phase assignment, and effort estimates are intentionally absent: they belong to v2.0 PATH_TO_ROBUST authorship, which holds the capacity-vs-scope picture. Where an item depends on an existing finding or arc, the dependency is recorded in both directions so the v2.0 author can sequence without re-deriving it.

---

## Section 1 - Golden dataset regression suite (ADOPT)

Fixed, version-pinned patient cohorts curated from the Synthea synthetic dataset, one cohort set per gap rule. Each gap rule's cohort set contains:
- True positives that MUST fire the gap.
- Near-miss true negatives that must NOT fire (just outside the trigger boundary).
- One patient per documented exclusion path (contraindication, intolerance, trial enrollment, and any other coded exclusion).
- Boundary cases: threshold values at the gate edge, missing-data patterns, and conflicting-record patterns.

**Storage layout:**
- `golden/<module>/<gap_id>/cohort/` - the FHIR bundles.
- `golden/<module>/<gap_id>/expected.json` - ground truth (which gaps fire, with the expected evidence / recommendation fields).
- `golden/<module>/<gap_id>/provenance.md` - the curation record (why each patient is in the cohort, what it exercises).

**Execution model:**
- Full suite runs BLOCKING on merge to main, with a per-patient diff surfaced on any deviation.
- Targeted PR runs select the affected cohorts via a dependency mapping (gap rule -> cohort set), so a PR touching one rule does not pay for the full suite.
- Intentional-change protocol: a deliberate behavior change requires the `expected.json` update PLUS clinical sign-off IN THE SAME PR, with the rendered expected-output diff shown for review. A bare gate-output change without the paired `expected.json` update and sign-off is rejected.
- Quarterly append-only cohort review: cohorts grow, never silently shrink.
- Production-discovered patterns are translated to SYNTHETIC equivalents only; never store PHI in the golden set.

**Precedent (gate-discipline reuse):** this is the same clean-baseline hard-gate discipline as the evidence-object validator shipped 2026-06 (PR #337): the gate runs against a clean baseline, and intentional changes ride the same PR that changes the expected output. Reuse that discipline rather than inventing a second gate convention.

---

## Section 2 - Per-gap-rule trace manifests (ADOPT, adapted)

One version-controlled YAML manifest per gap rule, capturing:
- Clinical basis: guideline + section + COR/LOE + Knowledge Base reference.
- FHIR inputs: the input fields with their code systems.
- Logic reference: a pointer to the rule body.
- Exclusions: the contraindication / intolerance / enrollment paths.
- Risk fields: `risk_class` (see Section 4) and related metadata.
- Validation block: golden-cohort reference (Section 1), last-validated date, metrics.
- Change log: dated entries with reviewer.

**HARD requirement - stable KB anchors:** Knowledge Base references use stable anchor IDs, NEVER raw line ranges. Raw line ranges are exactly the KB-parse-coupling failure mode (a docs edit shifts line numbers and silently breaks the reference). Adding stable anchor IDs to the Knowledge Base is PART OF this work, not a precondition assumed to exist.

**HARD requirement - sibling of the existing pipeline:** manifests are built as a sibling of the auditCanonical pipeline (the `extractCode.ts` / `validateEvidenceObjects.ts` family), NOT as a parallel toolchain. Reuse the existing AST-extraction + canonical-JSON conventions; do not stand up a second extraction stack.

**Cross-reference to AUDIT-106 (bidirectional dependency):** manifests require a stable `id` on every inline `gaps.push` node so each manifest binds to exactly one rule. That `id` back-reference IS the AUDIT-106 structural prerequisite (the A<->B shared join key whose absence is why A<->B consistency is currently un-gateable). One structural fix serves both: it unblocks AUDIT-106's deferred A<->B validator pass AND gives manifests their binding key.
- Recorded on the AUDIT-106 side: the manifest work depends on the `gaps.push` `id` back-reference.
- Recorded here: AUDIT-106's structural prerequisite is satisfied by the same change.

**CI gates when implemented:**
- Schema validation of every manifest.
- Reference integrity: KB anchors resolve, logic paths exist, cohort directories are present.
- A generated traceability matrix emitted as a build artifact.
- A per-build coverage report (which rules have complete manifests).

---

## Section 3 - Approval-token gating (ADOPT as audit input)

Design framing only - no design commits in this document.
- Schema split: `gap_finding` vs `clinical_recommendation`, with a mandatory `approval_token_id` foreign key on the finalized recommendation, so an unapproved finalized recommendation is STRUCTURALLY invalid (it cannot exist in a valid state without an approval token).
- Tokens are signed and immutable; revocation is modeled as a NEW record, never an in-place mutation.
- Downstream consumers (EHR write-back, care-plan generation, registry submission) validate the token AT ACTION TIME, not only at creation.

**Explicit gating:** this feeds the already-queued Pattern 2 scoping audit (which runs after §10.7 closes). NO design commits until that audit answers the current-data-model questions against running code. This section is audit INPUT, not a design decision.

---

## Section 4 - Module risk files (ADOPT)

Six per-module markdown risk files, ISO 14971-aligned and proportionate to clinician-in-the-loop clinical decision support (NOT autonomous diagnosis). Each file contains:
- Intended use statement.
- Hazard analysis covering: false negative (missed gap), false positive / alert fatigue, stale data, patient mismatch, and degraded upstream data quality.
- A 3x3 severity / probability evaluation with recorded rationale per hazard.
- Risk controls mapped to concrete platform mechanisms (e.g. the evidence-object gate, golden cohorts, exclusion checks).
- Residual risk weighed against the therapy-gap burden the module addresses.
- Post-deployment monitoring plan: override rates, confirmation rates, and review cadence.

**Sequencing-free notes:** Heart Failure first. Clinical sign-off required on each file. The manifests' `risk_class` field (Section 2) references these files, giving bidirectional traceability between a rule and its module hazard analysis.

---

## Section 5 - PHI-safe logging library (ADOPT, scoped)

- Typed log API: structured fields only, NO free-text interpolation.
- Field allowlist: unregistered fields are dropped and flagged in CI.
- Patient identifiers appear only as salted hashes, never raw.
- Output-path redaction as defense in depth: MRN patterns and FHIR name fields are redacted at the output boundary even if they slip through.
- A blocking lint rule against raw logging-framework imports (all logging routes through the typed API).

**Scope boundary (explicit):** this is the GENERAL logging path ONLY. The fingerprint-first audit channel is NOT adopted here - see Section 7. This section does not touch the audit-logging architecture.

---

## Section 6 - Deferred capabilities with triggers (RECORD, do not build)

Recorded for the v2.0 author; no build and no design here. Each carries an explicit trigger so it is picked up when - and only when - the trigger fires.
- **Execution-mode separation.** Trigger: a research partnership reaches scoped data-access requirements. Deferral rationale: premature implementation risks designing for the wrong modes; the actual mode set is unknown until a partnership scopes it.
- **Plugin architecture (MCP-style extension surface).** Trigger: a third customer integration that does not fit the current EHR integration path, OR a major scale milestone. Until triggered, integration continues via the existing pipeline.

---

## Section 7 - Open decision for v2.0 authorship (RECORD, do not decide)

**Fingerprint-first audit logging remains deferred.** Prior disposition: architecturally incompatible with the encryption-with-context arc. The V2 envelope + per-record EncryptionContext architecture is DEPLOYED across the full rekeyed PHI surface. Any reversal of this disposition requires an explicit encryption-with-context vs fingerprint-first trade-off note in v2.0 PATH_TO_ROBUST. Until that note is written and the trade-off resolved, the audit channel stays on the deployed encryption-with-context architecture. This document RECORDS the open decision; it does not decide it.

---

## Explicitly dropped (no elaboration)

- Parallel phase numbering and hours tables (no work-mix or AI-assistance multipliers appear anywhere in this doc; a parallel numbered spine plus hours violates the estimate discipline).
- Three-plane hardening and LLM-call right-sizing as standalone phases (already scoped under Phase 0A Phase 4 Operational Maturity).
- Real-patient golden cohorts (synthetic only).
- Full QMS certification scope.

---

**No hour estimates and no sequencing table appear in this document by design. Both belong to v2.0 PATH_TO_ROBUST authorship.**
