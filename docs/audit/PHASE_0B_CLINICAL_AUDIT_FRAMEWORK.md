# Phase 0B — Clinical Content Audit Framework

**Created:** 2026-04-29
**Maintained by:** jhart
**Companion:** `docs/audit/AUDIT_FRAMEWORK.md`, `docs/PATH_TO_ROBUST.md` (v1.2)

---

## Purpose

Audit each of the 7 cardiovascular modules — HF, EP, SH, CAD, VHD, PV, CX — against the TAILRD Comprehensive Clinical Knowledge Base v4.0 (BSW Scoping Document v7.1). Output: per-gap implementation classification, per-module readiness verdict, total work-remaining estimate.

This is **Phase 0B of Path to Robust v1.2**. Phase 0A (backend audit Phases 2-7) and Phase 0C (UI/UX audit) run in parallel; together they produce the v2.0 strategic plan revision at Week 3.

---

## Methodology

Per-gap evaluation matrix. Each gap in the BSW spec receives a row scored across five dimensions:

| Dimension | Question |
|-----------|----------|
| Spec presence | Is the gap defined in the BSW Scoping Document? |
| Detection logic | Does `backend/src/ingestion/gaps/gapRuleEngine.ts` (or related) implement the detection? |
| Calculator | If the gap requires a clinical calculator, is it implemented and validated against published reference values? |
| UI surface | Is the gap visible to users in `src/ui/{module}/`? Tier-appropriate (Tier 1 bespoke, Tier 2 templated, Tier 3 catalog)? |
| Tests | Is there test coverage for detection + calculator + UI flow? |

---

## Classification per gap

| Class | Meaning |
|-------|---------|
| **PRODUCTION_GRADE** | Detection + calculator (if applicable) + UI + tests all present |
| **DETECTION_OK_UI_OK_NO_TESTS** | Detection + UI present, no tests |
| **DETECTION_OK_NO_UI** | Backend detection works, frontend not surfaced |
| **PARTIAL_DETECTION** | Some code exists, incomplete or flagged for review |
| **SPEC_ONLY** | In BSW spec, no code present |

Classification combines with tier (Tier 1 / Tier 2 / Tier 3) to produce remediation effort estimate per gap.

---

## Severity per gap (independent of tier)

| Severity | Meaning |
|----------|---------|
| BLOCKER | Tier 1 gap that's PARTIAL_DETECTION or worse. Production-grade requires full Tier 1 implementation. |
| GAP | Tier 2 gap that's DETECTION_OK_NO_UI or worse |
| OPPORTUNITY | Tier 3 gap that's SPEC_ONLY |
| OK | Gap classified meets-or-exceeds tier expectations |

---

## Module sequencing (per Path to Robust v1.2 §11)

Modules audit in parallel, NOT serially. Ordering by audit-execution-readiness (not module priority):

1. **PV** (today, 2026-04-29) — Phase 93 of session-flow
2. HF, EP, SH, CAD, VHD, CX — to follow in parallel batches

Per Module Parity Principle, no module gets prioritized polish over another. The audit is sequential in *execution order* but the *target state* is synchronous across all 7.

---

## Inputs required

For each module, the audit requires:

1. **Spec gap list** from BSW Scoping Document v7.1 (PV: 105 gaps; HF: 126; EP: 89; SH: 88; CAD: 90; VHD: 105; CX: 105). The document is **not committed to repo** (per `docs/PATH_TO_ROBUST.md` §11 — business confidentiality).
2. **Codebase inventory** — automated grep + classification of detection code, calculators, UI surfaces (this part is fully automatable).

Without spec data, the audit can produce a **codebase-only inventory** (what's built) but cannot produce the **gap analysis** (what's missing). The two together form the complete Phase 0B output.

**Operator decision points** for each module:

- (A) Operator pastes spec gap list as input to the audit → full gap analysis
- (B) Operator authorizes codebase-only inventory → spec comparison deferred until spec access is provided
- (C) Operator commits the spec to a private repo path or provides API access to the spec system → full audit with future replay capability

---

## Per-module audit deliverable

Each module produces:

1. `docs/audit/PHASE_0B_{MODULE}_AUDIT_REPORT.md` — classification table, distribution chart, top-10-built and top-10-gapped gaps, remediation estimate
2. New entries in `docs/audit/AUDIT_FINDINGS_REGISTER.md` for any BLOCKER or GAP-tier findings (specifically, Tier 1 gaps that are PARTIAL_DETECTION or worse)
3. Inputs to v2.0 Path to Robust strategic plan revision (Week 3)

---

## Anti-patterns (per audit framework parent doc)

- Counting rule entries by ID match without checking the rule actually has detection logic body (vs metadata-only stubs)
- Classifying a gap as PRODUCTION_GRADE without reviewing the calculator's reference-value validation
- Confusing "module mention in code" with "module-specific gap detection wired"
- Making severity decisions based on module identity (HF vs PV) rather than tier + classification

---

## Limitations of today's framework

- **Spec confidentiality** — until BSW spec is operator-accessible to the audit process (option A or C above), every module audit is fundamentally blocked at the spec-to-code mapping step
- **Calculator validation** is non-trivial. MDCalc reference-value comparison requires running each calculator against multiple input cases and checking output. Not in scope for the codebase inventory pass.
- **Tier scoring** — Tier classification (T1/T2/T3) per gap is in the BSW spec. Without spec access, tier-aware analysis isn't possible.

---

## Today's PV audit (Phase 93 of session-flow)

Authoring `docs/audit/PHASE_0B_PV_AUDIT_REPORT.md` as **Option B (codebase-only inventory)** today. The report:

- Catalogs the 33 PV gap rules implemented in `backend/src/ingestion/gaps/gapRuleEngine.ts` with full guideline citations
- Catalogs the 26 PV frontend component files in `src/ui/peripheralVascular/`
- Catalogs the 4 PV backend route handlers in `backend/src/routes/modules.ts`
- Identifies which implemented rules carry Class 1 / Level A evidence (production-priority)
- Estimates the gap to BSW spec's reported 105 PV gaps (~31% rule coverage if 1:1)
- Pauses for operator decision: provide spec PV gap list (option A) for full analysis, or accept codebase-only as Phase 0B deliverable for PV

---

## Cross-references

- `docs/audit/AUDIT_FRAMEWORK.md` — parent framework (severity scale, methodology, evidence requirements)
- `docs/PATH_TO_ROBUST.md` — Phase 0B is a sub-phase of Path-to-Robust Phase 0
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` — findings register receives Phase 0B BLOCKER/GAP entries
- BSW Scoping Document v7.1 — spec source (NOT in repo per business confidentiality)
