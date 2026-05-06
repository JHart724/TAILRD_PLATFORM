# BUILD_STATE.md

**Single-source-of-truth aggregate state ledger.** Indexes existing canonical docs into one scannable view. When this ledger and a source doc disagree, **the source doc wins** — this is an index, not a content owner.

---

## Header

| Field | Value |
|---|---|
| Last updated | 2026-05-06 (Day 8 of Phase 0) — Phase 0B clinical-code verification arc materially complete; methodology stack §17 codified |
| Last update by | jhart |
| Last update commit SHA | 17-PR session arc 2026-05-05/06: PRs #234-#249 (canonical infra + Tier S series + Cat A/D + AUDIT-052 + AUDIT-041 §9.1 + Cat D §9.2 + LOINC + ABI §17.1) |
| Plan reference | `docs/PATH_TO_ROBUST.md` v1.2 (active 2026-04-28) |
| Plan target | **Under revision per v2.0**; v1.2 timeline (3-4 months) revised preliminary to **7-9 months raw scope**; per CAD audit §13, this translates to ~3-6 months AI-assisted wall-clock. Canonical infrastructure + Tier S closure + Cat A/D/AUDIT-052 corrections + LOINC corrections + methodology stack (§1, §9.1, §9.2, §16, §17) give v2.0 author structured 603-row matrix + verified-codes baseline + drift-prevention discipline as direct input. AI-assisted multiplier observed sustained at higher rate than initial estimate (17 PRs in ~14-15h operator wall-clock + ~9-12h agent over 2 days); feeds v2.0 timeline calibration. v2.0 PATH_TO_ROBUST due ~2026-05-19 |
| Phase 0 day | **8 of 21** (13 days remaining in Phase 0 window) |
| Phase 0 hours budget | **Phase 0B clinical-code verification arc: MATERIALLY COMPLETE.** Tier S queue CLOSED 4→0 (PRs #238/240/241/243). Cat A canonical RxNorm verification: 13 bugs in 84 codes corrected (PR #242). Cat D inline drug-class arrays: 8 bugs in 24 codes corrected (PR #246). AUDIT-052 architectural: 4 new canonical valuesets (DHP CCB / PPI / loop diuretic / thiazide; PR #247). AUDIT-041 applyOverrides §9.1 canonical-default (PR #245). Batch 5 LOINC: 5 wrong-concept bugs (3 RESOLVED PR #248 + 2 RESOLVED PR #249). Methodology stack codified: §1, §9.1, §9.2, §16, §17. **Remaining clinical-code verification debt: Batch 4 (211 inline ICD-10 patterns) + Batch 6 (96 threshold comparisons) + AUDIT-070 (FHIR ingestion expansion) — not blocking, latent risk only.** ~52-82h raw-scope budget partially consumed; redirected to Phase 0A backend Phases 3-5 (data + ops + HIPAA) + Phase 0C UI/UX. |
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
- [x] **Tier S queue CLOSED** (4 → 0 across PRs #238/240/241/243 — EP-017, CAD-016, EP-006, EP-079; only `(CRITICAL)`-tagged spec gap also resolved)
- [x] **Cat A clinical-code verification batch** (PR #242 AUDIT-042..061 — 13 wrong-drug bugs / 84 codes = 15.5%)
- [x] **Cat D inline-array verification batch** (PR #246 AUDIT-046..063 — 8 wrong-code bugs / 24 unique non-canonical = 33%)
- [x] **AUDIT-052 architectural** (PR #247 — 4 new canonical valuesets DHP CCB / PPI / loop diuretic / thiazide; 7 inline arrays refactored to canonical imports)
- [x] **AUDIT-041 §9.1 applyOverrides canonical-default** (PR #245 — eliminated manual canonical patch workaround)
- [x] **Batch 5 LOINC verification** (PRs #248 + #249 AUDIT-065/066/067/068/069 — 5 wrong-concept LOINC codes corrected: QTc/QRS/LVEF/ABI; LVEF marquee finding caught a prior fix-from regression)
- [x] **AUDIT_METHODOLOGY.md methodology stack codified:** §1 (rule-body verification), §9.1 (applyOverrides canonical-default), §9.2 (full-pipeline-regen), §16 (clinical-code verification), §17 (clinical-code PR acceptance criteria)
- [x] **PR template enforcement** (`.github/pull_request_template.md` §17 checklist)
- [/] **Batch 4 ICD-10 inline patterns** (211 startsWith patterns) — not blocking; deferred to follow-up
- [/] **Batch 6 labValues threshold verification** (96 comparisons) — not blocking; deferred to follow-up
- [/] **AUDIT-070 FHIR ingestion expansion** — latent gap (CSV path unaffected); dedicated PR planned

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
| Backend (core APIs) | 70% | 29 routes, 21 services, 6-module rule engine (263 rules post-Tier-S closure); CX absent | `CLAUDE.md` §10 |
| Security | 50% | Tier S 3.5/4 closed; AUDIT-011 Phase a-pre RESOLVED; AUDIT-025 Phase a live | `AUDIT_FINDINGS_REGISTER.md` |
| Infrastructure (AWS) | 85% | Aurora-only, RDS decommissioned 2026-05-02, staging cluster live | `CLAUDE.md` §9 |
| Ingestion | 50% | Webhook + 263 rules across 6 modules (post-Tier-S closure); BSW SFTP/opportunity report not built | `CLAUDE.md` §10 |
| Frontend | 35% | 6 modules × 3 tiers = 216 .tsx files; 5 of 6 use mock data | `CLAUDE.md` §10 |
| Integration | 20% | BSW pilot live since 2026-04-27; Mount Sinai MSA framework; Epic Clarity SQL not in repo | `CLAUDE.md` §11-12 |
| Deployment | 75% | CI + 2 deploy workflows; AUDIT-025 Phase a (Migration Validation gate) live; branch protection TODO | PR #223 |
| Testing | 5% | 27 tests passing, 0.87% backend coverage (AUDIT-001 P0) | `PHASE_1_REPORT.md` |
| Documentation | 70% | 7 PRs in current arc; 3 design docs; runbooks complete | `CHANGE_RECORD_*.md` |
| Clinical KB | 42% | CK v4.0 with 708 gaps; 6 of 6 active modules audited (canonical crosswalks); 250/603 covered any-tier post-Tier-S closure; 101/603 DET_OK; Tier S queue CLOSED; Cat A canonical RxNorms verified per AUDIT_METHODOLOGY.md §16 | `docs/audit/canonical/`, `docs/audit/AUDIT_METHODOLOGY.md` |

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

**Queue CLOSED 2026-05-05** — all 4 items resolved across single session arc:

| Spec gap | Module | Class | SAFETY tag | Resolution |
|---|---|---|---|---|
| GAP-EP-017 | EP | DET_OK | `(SAFETY)` | **RESOLVED PR #238** (registry entry add; queue 4 → 3) |
| GAP-CAD-016 | CAD | DET_OK | `(SAFETY)` | **RESOLVED PR #240** (new SAFETY discriminator block; queue 3 → 2) |
| GAP-EP-006 | EP | DET_OK | `(SAFETY)` | **RESOLVED PR #241** (2-branch SAFETY + DATA gap; queue 2 → 1) |
| GAP-EP-079 | EP | DET_OK | `(CRITICAL)` | **RESOLVED PR #243** (single-branch CRITICAL evaluator; queue 1 → 0 — **CLOSED**) |

**Clinical Tier S queue: 0 items.** No spec-explicit `(SAFETY)` or `(CRITICAL)` T1 gaps remain uncovered. AUDIT-031 was the only `(CRITICAL)` safetyClass item in CK v4.0; closure means no spec-explicit CRITICAL gaps remain.
Source: `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` §3.1.

---

## §6 — Open critical work (top 3, priority order)

**Phase 0B clinical-code verification arc materially COMPLETE (2026-05-06).** Recommended starting points for next session (operator decides at session start):

1. **Phase 0A Phase 3 (data layer)** — ~10h agent; load-bearing for v2.0 PATH_TO_ROBUST authorship (due ~2026-05-19). HIGHEST regulatory + architectural priority.
2. **Phase 0A Phase 5 (HIPAA gap analysis)** — ~15-20h agent; load-bearing; pairs with Phase 3 data layer review. Required for production compliance posture.
3. **AUDIT-070 FHIR ingestion expansion** — ~3-6h agent; closes the latent gap surfaced by §17.1 consumer audit (PR #249). Completes Phase 0B clinical-code arc fully (not just materially).

**Lower priority (capacity-calibrated alternatives):**
- AUDIT-016 PHI key rotation pattern (HIPAA-foundations work; can pair with Phase 5)
- AUDIT-022 legacy JSON PHI backfill (Phase 2B-extended; HIPAA-relevant)
- Batch 4 ICD-10 inline pattern verification (~2-3h; mechanical; deferrable)
- Batch 6 labValues threshold verification (~3-4h; needs guideline cross-references; mechanical)
- AUDIT-035/036 registry orphans (v2.0-deferred per prior design)
- Phase 0C UI/UX audit (~25-30h; lower-priority; appropriate for capacity-calibrated work)

**Anti-recommendation:** v2.0 PATH_TO_ROBUST authorship — load-bearing, novel architectural decisions, never appropriate at fatigue tail.

Tactical security work (AUDIT-025 Phase b, AUDIT-011 Phase a/b/c/d) queued for Phase 1.

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

**Tier S queue closure + Cat A clinical-code verification (2026-05-05):** All 4 spec-explicit Tier S patient-safety items resolved across 4 PRs in single session arc (#238 EP-017 → #240 CAD-016 → #241 EP-006 → #243 EP-079; queue 4 → 3 → 2 → 1 → 0). AUDIT-031 was the only `(CRITICAL)`-tagged spec gap; closure means no spec-explicit CRITICAL gaps remain uncovered. Mid-arc, Phase 2 systematic verification of canonical RxNorm valuesets (PR #242, AUDIT-042..061) surfaced 13 wrong-drug or invalid-CUI errors in 84 cited codes (15.5% bug rate) — patient-safety-active subset (AUDIT-042/044/053/054/055/056/057) was silently miscoding QTc surveillance + finerenone/ivabradine gap rules in production. AUDIT_METHODOLOGY.md §16 added codifying mandatory RxNav/LOINC/ICD-10 authoritative-source verification (cousin to §1 rule-body verification). refreshCites.ts (PR #239) validated on 4 real-world Tier S PRs (idempotent, ~250 cites refreshed per run). AUDIT-041 (applyOverrides canonical-mode gap) recurred 4 times — fast-track follow-up.

**Phase 0B clinical-code verification arc materially complete (2026-05-06):** Cat D inline-array verification (PR #246, AUDIT-046..063) surfaced 8 wrong-code bugs in 24 unique non-canonical codes (33% bug rate — 2× canonical-layer rate, validating AUDIT-052 architectural divergence-vector thesis). AUDIT-052 partial mitigation (PR #247) shipped 4 new canonical valuesets (DHP CCB, PPI, loop diuretic, thiazide) + 7 inline-array refactors. Methodology stack expanded: §9.1 applyOverrides canonical-default (PR #245), §9.2 full-pipeline-regen-after-source-change (PR #246 AUDIT-064), §17 clinical-code PR acceptance criteria (PR #248 — drift-prevention sister to §1/§16/§9.1/§9.2). Batch 5 LOINC verification (PRs #248 + #249) corrected 5 wrong-concept codes including marquee AUDIT-069 LVEF regression catch (prior codebase fix-from comment was itself wrong; only NLM Clinical Tables fallback verification caught it). PR #249 was first §17.1-architectural-precedent: consumer audit corrected over-scoped framing mid-flight (3-6h architectural estimate → 50min right-sized fix). AUDIT-070 NEW filed (FHIR ingestion expansion gap); latent risk only (CSV path unaffected). Methodology working as designed. Total session arc: 17 PRs across 2 days; ~14-15h operator wall-clock + ~9-12h agent. AI-assisted multiplier sustained at higher rate than initial Phase 0 estimate; data point for v2.0 PATH_TO_ROBUST timeline calibration.

---

## Update protocol

This ledger is updated on every PR that changes state. PR template enforces a checkbox.

**Tier 1 (current):** Manual hand-edit. Reviewer enforces at PR review.
**Tier 2 (planned):** `scripts/build-state-snapshot.sh` auto-fills data-driven sections (rule counts, file counts, finding states). Manual prose preserved verbatim.
**Tier 3 (planned):** CI staleness check fails build if ledger stale relative to last commit. Required check before merge.

See `docs/BUILD_STATE_LEDGER_DESIGN.md` for full design.
