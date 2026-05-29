# TAILRD Scope Reconciliation - Full Catalog (708) vs Active Build Scope (603)

**Status:** Canonical reconciliation note
**Date:** 2026-05-29
**Companions:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` (full catalog), `docs/PATH_TO_ROBUST.md` (active build scope, source-wins for active figures)

---

## Why this note exists

`CLINICAL_KNOWLEDGE_BASE_v4.0.md` presents the full **708 gap / 7-module** catalog as its scope headline (Scope section, Top-25 intro, Part 4 catalog). `PATH_TO_ROBUST.md` plans against the active **603 gap / 6-module** build scope. Both are correct for their purpose; the two figures differ only by the deferred CX module. A reader who sees only the KB headline can anchor on 708 / 107-T1 instead of the active 603 / 90-T1 figure that drives build planning. This note reconciles the two.

This note lives OUTSIDE the KB body by design: `CLINICAL_KNOWLEDGE_BASE_v4.0.md` is a machine-parsed canonical source (parsed by `backend/scripts/auditCanonical/extractSpec.ts` against hardcoded per-module line ranges, guarded by the Audit Canonical Gate 3 spec.json-staleness check and `tests/scripts/auditCanonical/extractSpec.test.ts`). Inserting any line into the KB body shifts those line ranges and breaks extraction, so the reconciliation is recorded here rather than annotated into the parsed KB.

## The reconciliation

- **708** = the full 7-module clinical catalog in `CLINICAL_KNOWLEDGE_BASE_v4.0.md`. It is accurate and preserved verbatim as the full-catalog reference.
- **CX module** (Cross-module / Disparities / Safety), **105 gaps = 17 T1 + 71 T2 + 17 T3**, is **deferred per the 2026-05-03 operator decision** (revisit at v3.0 per the Module Parity Principle).
- **Active build scope = 603 gaps = 90 T1 + 391 T2 + 122 T3** across the 6 active cardiovascular modules (Heart Failure, Electrophysiology, Structural Heart, Coronary Artery Disease, Surgical Valvular Heart Disease, Peripheral Vascular).
- **Build planning uses the active 603 / 90-T1 figure**, NOT the full-catalog 708 / 107-T1 figure.

The two figures reconcile exactly at every tier via the 105-gap CX subtraction:

| Tier | Full catalog (708) | minus CX | = Active (603) |
|---|---|---|---|
| T1 | 107 | 17 | 90 |
| T2 | 462 | 71 | 391 |
| T3 | 139 | 17 | 122 |
| Total | 708 | 105 | 603 |

## Source of truth

The active figures above mirror `PATH_TO_ROBUST.md` L18 verbatim (`90 T1 + 391 T2 + 122 T3 = 603 active gaps`, audit-baseline verified at PR #290 matrix verification). `PATH_TO_ROBUST.md` is source-wins for the active build scope. The full-catalog figures mirror `CLINICAL_KNOWLEDGE_BASE_v4.0.md` (Scope section and Part 4 Tier Distribution table), which is source-wins for the full catalog.
