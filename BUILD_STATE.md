# BUILD_STATE.md

**Single-source-of-truth aggregate state ledger.** Indexes existing canonical docs into one scannable view. When this ledger and a source doc disagree, **the source doc wins** — this is an index, not a content owner.

---

## Header

| Field | Value |
|---|---|
| Last updated | 2026-05-04 (Day 6 of Phase 0) — Phase 0B canonical infrastructure complete |
| Last update by | jhart |
| Last update commit SHA | _pending canonical infrastructure PR_ (this PR's chore commit) |
| Plan reference | `docs/PATH_TO_ROBUST.md` v1.2 (active 2026-04-28) |
| Plan target | **Under revision per v2.0**; v1.2 timeline (3-4 months) revised preliminary to **7-9 months raw scope**; per CAD audit §13, this translates to ~3-6 months AI-assisted wall-clock; canonical infrastructure (this PR) gives v2.0 author structured 603-row matrix as direct input; v2.0 PATH_TO_ROBUST due ~2026-05-19 |
| Phase 0 day | **6 of 21** (15 days remaining in Phase 0 window) |
| Phase 0 hours budget | **Phase 0B clinical audit: COMPLETE** (canonical infrastructure consolidated 6-module audits via auto-classifier + 21 manual overrides; ~50 min agent wall-clock for infrastructure + classification work per AUDIT-028 — see canonical PR description). ~52-82h raw-scope budget remaining; redirected to Phase 0A backend + Phase 0C UI/UX. |
| v2.0 PATH_TO_ROBUST due | end of Week 3 (~2026-05-19) |

---

## §1 — Phase 0 deliverable checklist

Per `docs/PATH_TO_ROBUST.md` §5.

### Phase 0A — Backend audit Phase 2-7 continuation (~50-70h)

- [x] Phase 1 — Code quality + tech debt reconciliation (`PHASE_1_REPORT.md`, CONDITIONAL PASS)
- [/] Phase 2 — Security posture (Tier S 3.5 of 4 closed; AUDIT-011 Phase a-pre RESOLVED; 2 P2/P3 items remain — AUDIT-022, AUDIT-024)
- [ ] Phase 3 — Data layer (~10h)
- [ ] Phase 4 — Operational maturity (~10h)
- [ ] Phase 5 — HIPAA gap analysis (~15-20h)
- [ ] Phase 7 — Threat modeling (not in v1.2 budget)

### Phase 0B — Per-module clinical audits (~50-70h)

- [x] PV — canonical addendum (16 DET_OK / 14 PARTIAL / 75 SPEC_ONLY of 105 = 29% any-coverage)
- [x] HF — canonical addendum (22 DET_OK / 43 PARTIAL / 61 SPEC_ONLY of 126 = 52% any-coverage; 9 cross-module to EP CRT/ICD)
- [x] CAD — canonical addendum (28 DET_OK / 28 PARTIAL / 34 SPEC_ONLY of 90 = 62% any-coverage; 1 cross-module to PV)
- [x] EP — canonical addendum (18 DET_OK / 26 PARTIAL / 45 SPEC_ONLY of 89 = 49% any-coverage; 3 cross-module incl. EP-007 to VHD)
- [x] SH — canonical addendum (9 DET_OK / 23 PARTIAL / 56 SPEC_ONLY of 88 = 36% any-coverage; 4 cross-module)
- [x] VHD — canonical addendum (5 DET_OK / 16 PARTIAL / 84 SPEC_ONLY of 105 = 20% any-coverage; 1 cross-module to SH)
- [x] **Cross-module synthesis** with Tier S triage queue, blind-spot analysis, BSW pathway distribution
- [x] **Canonical infrastructure** (AUDIT_METHODOLOGY.md + 8 scripts + CI gates + 101 tests)

### Phase 0C — UI/UX audit (~25-30h)

- [ ] Catalog all current UI surfaces
- [ ] Document existing design system
- [ ] Per-module UI maturity assessment
- [ ] Service line + research view audit

### Phase 0 deliverables

- [x] All 6 active module audit addenda committed (canonical, generated from crosswalks)
- [x] **603-row implementation matrix** in `docs/audit/canonical/<MODULE>.crosswalk.json` files (98 DET_OK + 150 PARTIAL + 355 SPEC_ONLY = 248 covered / 603 total = 41% any-coverage)
- [/] Updated `AUDIT_FINDINGS_REGISTER.md` (AUDIT-029, AUDIT-030, AUDIT-030.D resolved via AUDIT_METHODOLOGY.md; pending: register-batch update for ~16-19 findings surfaced during canonical work)
- [ ] **v2.0 PATH_TO_ROBUST** (due ~2026-05-19)

---

## §2 — Build dimension status (10 workstreams)

| Workstream | % | State (1 line) | Source |
|---|---|---|---|
| Backend (core APIs) | 70% | 29 routes, 21 services, 6-module rule engine (259 rules); CX absent | `CLAUDE.md` §10 |
| Security | 50% | Tier S 3.5/4 closed; AUDIT-011 Phase a-pre RESOLVED; AUDIT-025 Phase a live | `AUDIT_FINDINGS_REGISTER.md` |
| Infrastructure (AWS) | 85% | Aurora-only, RDS decommissioned 2026-05-02, staging cluster live | `CLAUDE.md` §9 |
| Ingestion | 50% | Webhook + 259 rules across 6 modules; BSW SFTP/opportunity report not built | `CLAUDE.md` §10 |
| Frontend | 35% | 6 modules × 3 tiers = 216 .tsx files; 5 of 6 use mock data | `CLAUDE.md` §10 |
| Integration | 20% | BSW pilot live since 2026-04-27; Mount Sinai MSA framework; Epic Clarity SQL not in repo | `CLAUDE.md` §11-12 |
| Deployment | 75% | CI + 2 deploy workflows; AUDIT-025 Phase a (Migration Validation gate) live; branch protection TODO | PR #223 |
| Testing | 5% | 27 tests passing, 0.87% backend coverage (AUDIT-001 P0) | `PHASE_1_REPORT.md` |
| Documentation | 70% | 7 PRs in current arc; 3 design docs; runbooks complete | `CHANGE_RECORD_*.md` |
| Clinical KB | 41% | CK v4.0 with 708 gaps; 6 of 6 active modules audited (canonical crosswalks); 248/603 covered any-tier; 98/603 DET_OK | `docs/audit/canonical/`, `docs/audit/AUDIT_METHODOLOGY.md` |

---

## §3 — Audit surface status (active scope, 20 surfaces)

| # | Surface | Module | View | Audit state |
|---|---|---|---|---|
| 1 | HF — care team | HF | care team | **CANONICAL** (Phase 0B canonical addendum, AUDIT-030 citation-verified) |
| 2 | HF — service line | HF | service line | file-count inventory only |
| 3 | HF — executive | HF | executive | file-count inventory only |
| 4 | EP — care team | EP | care team | **CANONICAL** (Phase 0B canonical addendum) |
| 5 | EP — service line | EP | service line | NOT STARTED |
| 6 | EP — executive | EP | executive | NOT STARTED |
| 7 | SH — care team | SH | care team | **CANONICAL** (Phase 0B canonical addendum) |
| 8 | SH — service line | SH | service line | NOT STARTED |
| 9 | SH — executive | SH | executive | NOT STARTED |
| 10 | CAD — care team | CAD | care team | **CANONICAL** (Phase 0B canonical addendum) |
| 11 | CAD — service line | CAD | service line | file-count inventory only |
| 12 | CAD — executive | CAD | executive | file-count inventory only |
| 13 | VHD — care team | VHD | care team | **CANONICAL** (Phase 0B canonical addendum, AUDIT-030 citation-verified + 13 manual overrides) |
| 14 | VHD — service line | VHD | service line | NOT STARTED |
| 15 | VHD — executive | VHD | executive | NOT STARTED |
| 16 | PV — care team | PV | care team | **CANONICAL** (Phase 0B canonical addendum) |
| 17 | PV — service line | PV | service line | file-count inventory only |
| 18 | PV — executive | PV | executive | file-count inventory only |
| 19 | Research/registry/trial | cross-cutting | all 3 views | NOT STARTED — 3 frontend files exist, 0 backend routes / 0 Prisma models |
| 20 | Backend superuser | cross-cutting | admin | **PARTIAL** via AUDIT-011 Phase a-pre |

**Audit coverage:** 6 of 20 surfaces with canonical audit coverage (all 6 module care-team views via Phase 0B canonical addenda 2026-05-04 — generated from `docs/audit/canonical/<MODULE>.crosswalk.json`). Additional partial coverage: 6 surfaces inventoried at file-count level only (HF/CAD/PV service line + executive); 1 cross-cutting (Backend superuser) partially audited via AUDIT-011 Phase a-pre tenant isolation work. Source: `docs/audit/PHASE_0B_<MODULE>_AUDIT_ADDENDUM.md` (6 modules), `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md`, `docs/audit/AUDIT_METHODOLOGY.md`, `docs/audit/AUDIT_011_DESIGN.md`.

---

## §3b — Deferred / Out-of-scope modules

> **CX (Cross-module/Disparities/Safety):** 105 spec gaps in CK v4.0 §6.7. Deferred from current build scope per operator decision 2026-05-03. Revisit in v2.0 PATH_TO_ROBUST. NOT IN `ModuleType` enum, 0 frontend files, 0 backend rules.

---

## §4 — Per-module status (6 active modules)

| Module | Spec gaps | Backend rules | Rule density % | Frontend .tsx files | Audit state | T1 priority gaps |
|---|---|---|---|---|---|---|
| HF | 126 | 48 | **52% any / 17.5% DET_OK** | 38 | CANONICAL | 29 T1: 8 DET_OK + 14 PARTIAL + 7 SPEC_ONLY |
| EP | 89 | 45 | **49% any / 20.2% DET_OK** | 63 | CANONICAL | 15 T1: 5 DET_OK + 4 PARTIAL + 6 SPEC_ONLY |
| SH | 88 | 25 | **36% any / 10.2% DET_OK** | 48 | CANONICAL | 13 T1: 2 DET_OK + 6 PARTIAL + 5 SPEC_ONLY |
| CAD | 90 | 76 | **62% any / 31.1% DET_OK** | 25 | CANONICAL | 18 T1: 7 DET_OK + 5 PARTIAL + 6 SPEC_ONLY |
| VHD | 105 | 32 | **20% any / 4.8% DET_OK** | 18 | CANONICAL | 8 T1: 1 DET_OK + 3 PARTIAL + 4 SPEC_ONLY |
| PV | 105 | 33 | **29% any / 15.2% DET_OK** | 24 | CANONICAL | 7 T1: 1 DET_OK + 2 PARTIAL + 4 SPEC_ONLY |
| **Total active** | **603** | **259** | **41% any / 16.3% DET_OK** | **216** | 6 of 6 canonical | 90 T1: 24 DET_OK + 34 PARTIAL + 32 SPEC_ONLY |

**Coverage numbers** are computed from canonical crosswalks (`docs/audit/canonical/<MODULE>.crosswalk.json`) per AUDIT_METHODOLOGY.md §3. Auto-classifier with manual overrides applies §3.2.1 broad-rule consolidation per-gap (one evaluator block top-matched for ≥2 spec gaps in same subcategory → all classified PARTIAL_DETECTION unless evaluator's trigger criteria match a specific spec gap completely). 21 manual overrides documented inline in crosswalk auditNotes (13 VHD, 5 EP, 2 HF, 1 CAD).

Source: `docs/audit/canonical/<MODULE>.crosswalk.json` (canonical), `docs/audit/PHASE_0B_<MODULE>_AUDIT_ADDENDUM.md` (rendered), `docs/audit/AUDIT_METHODOLOGY.md` (methodology contract).

---

## §5 — Tier S findings status

### §5.1 — Security Tier S (operational)

| Finding | Severity | State | Notes |
|---|---|---|---|
| AUDIT-009 (MFA enforcement) | P1 | **DEPLOYED flag-off** | Controlled rollout pending |
| AUDIT-011 (tenant isolation) | P1 | **Phase a-pre RESOLVED** | Phase a/b/c/d remain (~9-11h) |
| AUDIT-013 (audit log durability) | P1 | **RESOLVED** 2026-04-30 | dual-transport CloudWatch |
| AUDIT-015 (decrypt fail-loud) | P1 | **RESOLVED** 2026-04-30 | 51 legacy plaintext rows backfilled |

**Security Tier S progress: 3.5 of 4 closed.** Source: `AUDIT_FINDINGS_REGISTER.md`.

### §5.2 — Clinical Tier S triage queue (per AUDIT_METHODOLOGY.md §6.3)

Generated from canonical crosswalks. Auto-include criteria: spec-explicit SAFETY-tagged + T1 + uncovered.

| Spec gap | Module | Class | SAFETY tag | Notes |
|---|---|---|---|---|
| GAP-EP-079 | EP | SPEC_ONLY | `(CRITICAL)` | pre-excited AF + AVN blocker → VF risk; highest priority |
| GAP-EP-006 | EP | SPEC_ONLY | `(SAFETY)` | dabigatran in CrCl<30 |
| GAP-EP-017 | EP | SPEC_ONLY | `(SAFETY)` | HFrEF + non-DHP CCB; evaluator EP-017 exists at line 4797 (PR #229) but no registry entry — trivial fix: add registry entry |
| GAP-CAD-016 | CAD | PARTIAL | `(SAFETY)` | prasugrel + stroke/TIA; needs hardening for full SAFETY closure |

**Clinical Tier S queue: 4 spec-explicit items.** Mitigation work tracked as separate PR series.
Source: `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` §3.1.

---

## §6 — Open critical work (top 3, priority order)

1. **Clinical Tier S mitigation PR series** — 4 patient-safety items (EP-079, EP-006, CAD-016, EP-017). EP-017 trivial (add registry entry). Others require new evaluator block authorship. Estimate ~6-12h raw scope across 4 PRs.
2. **Phase 0A backend audits Phase 3-5** — Data layer (~10h) + Operational maturity (~10h) + HIPAA gap analysis (~15-20h); load-bearing for v2.0.
3. **Phase 0C UI/UX audit** — 25-30h raw scope, completes Phase 0 deliverable set for v2.0 authorship.

**Audit-axis Phase 0B critical path COMPLETE.** Phase 0A + 0C remain. Tactical security work (AUDIT-025 Phase b, AUDIT-011 Phase a/b/c/d, AUDIT-022 backfill) queued for Phase 1.

---

## §7 — Date-driven commitments (committed only)

| Commitment | Date | Source |
|---|---|---|
| **v2.0 PATH_TO_ROBUST** | end of Week 3 (~2026-05-19) | `PATH_TO_ROBUST.md` §5, §10 |
| Platform v1.0 | 2026-07-29 to 2026-08-29 | `PATH_TO_ROBUST.md` §1 |
| BSW pilot active | continuous since 2026-04-27 | `CLAUDE.md` §9 |

---

## §8 — Cross-reference index

| Domain | Source doc |
|---|---|
| Strategic plan | `docs/PATH_TO_ROBUST.md` v1.2 |
| Operational state | `CLAUDE.md` |
| Security findings register | `docs/audit/AUDIT_FINDINGS_REGISTER.md` |
| Backend audit framework | `docs/audit/AUDIT_FRAMEWORK.md` |
| Phase 1 backend audit | `docs/audit/PHASE_1_REPORT.md` |
| Phase 2 backend audit | `docs/audit/PHASE_2_REPORT.md` |
| Phase 0B clinical audit framework | `docs/audit/PHASE_0B_CLINICAL_AUDIT_FRAMEWORK.md` (predecessor; superseded by `AUDIT_METHODOLOGY.md`) |
| Phase 0B per-module audits | `docs/audit/PHASE_0B_<MODULE>_AUDIT_ADDENDUM.md` (6 of 6, canonical) |
| **Audit methodology canonical contract** | `docs/audit/AUDIT_METHODOLOGY.md` |
| **Canonical audit artifacts (6 modules)** | `docs/audit/canonical/<MODULE>.{spec,code,reconciliation,crosswalk,crosswalk.draft}.json` |
| **Cross-module synthesis** | `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` |
| **Audit canonical scripts** | `backend/scripts/auditCanonical/` |
| **Audit canonical CI gates** | `.github/workflows/auditCanonical.yml` |
| Per-finding designs | `docs/audit/AUDIT_<NNN>_DESIGN.md` (AUDIT-011, AUDIT-025) |
| Tier S remediation design | `docs/audit/TIER_S_REMEDIATION_DESIGN.md` |
| Clinical knowledge base | `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` |
| Migration history (Day 9-11) | `docs/DAY_<N>_PLAN.md`, `docs/DAY_<N>_*_RUNBOOK.md` |
| Change records | `docs/CHANGE_RECORD_*.md` |
| Health system onboarding | `docs/HEALTH_SYSTEM_ONBOARDING_RUNBOOK.md` |
| BUILD_STATE.md design | `docs/BUILD_STATE_LEDGER_DESIGN.md` |

---

## §9 — Strategic posture (per HF audit §6.3)

Per operator decision 2026-05-03: when audit findings force a choice between timeline and scope, **extend timeline. Do not reduce scope.** Module Parity Principle preserved. All Tier 1+2+3 gaps in scope. Research/registry backend in scope.

**Rationale:** TAILRD is clinical decision support; shortcuts in clinical content, missing modules, or skipped tiers become patient safety risk or commercial credibility failures.

**Preliminary timeline revision (raw scope):** 3-4 months → 7-9 months raw scope. v2.0 PATH_TO_ROBUST (due ~2026-05-19) codifies final timeline with all Phase 0 audit inputs.

Per CAD audit §11 cross-module synthesis (2026-05-03): DET_OK scales SUB-LINEARLY with naive density (HF 1.78 rules per DET_OK → CAD 2.71 rules per DET_OK). Procedural-domain blind spot is platform-wide pattern (HF Device Therapy + CAD Cardiogenic Shock / Complex PCI / Stent Complications / Peri-procedure all 0% or near-0%). Phase 1 sequencing choice (module-by-module / domain-by-domain / hybrid Phase 1a framework + Phase 1b per-module) deferred to v2.0 PATH_TO_ROBUST authorship per CAD audit §11.5.

Per CAD audit §13 time-unit caveat (AUDIT-028, 2026-05-04): all hour estimates in this ledger and PATH_TO_ROBUST v1.2 represent raw work-scope, NOT AI-assisted operator wall-clock. v2.0 will disambiguate. "7-9 month preliminary timeline" may translate to **3-6 months wall-clock** depending on work-mix assumptions and clinical advisor bottlenecks. v2.0 commits to wall-clock projections with stated multipliers per work-type. Begin empirical wall-clock tracking on EP/SH/VHD audits.

Source: `docs/audit/PHASE_0B_HF_AUDIT_ADDENDUM.md` §6.3, `docs/audit/PHASE_0B_CAD_AUDIT_ADDENDUM.md` §11, §11.5, §13.

**Canonical infrastructure (2026-05-04):** AUDIT-029 / AUDIT-030 / AUDIT-030.D methodology defects resolved via `docs/audit/AUDIT_METHODOLOGY.md` canonical contract. 6-module audits regenerated from canonical JSON crosswalks; CI gates enforce regeneration discipline. Auto-classifier accuracy: 5 of 6 modules within ±10% of prior addendum claims; VHD bridged via 13 manual overrides documenting addendum's broad-rule consolidations + cross-module satisfaction. 18 cross-module satisfaction patterns surfaced (notably HF Device Therapy → EP module CRT/ICD evaluators). Wall-clock per AUDIT-028: ~50 min agent across 8 phases for full canonical infrastructure build.

---

## Update protocol

This ledger is updated on every PR that changes state. PR template enforces a checkbox.

**Tier 1 (current):** Manual hand-edit. Reviewer enforces at PR review.
**Tier 2 (planned):** `scripts/build-state-snapshot.sh` auto-fills data-driven sections (rule counts, file counts, finding states). Manual prose preserved verbatim.
**Tier 3 (planned):** CI staleness check fails build if ledger stale relative to last commit. Required check before merge.

See `docs/BUILD_STATE_LEDGER_DESIGN.md` for full design.
