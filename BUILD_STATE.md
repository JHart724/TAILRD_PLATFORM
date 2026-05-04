# BUILD_STATE.md

**Single-source-of-truth aggregate state ledger.** Indexes existing canonical docs into one scannable view. When this ledger and a source doc disagree, **the source doc wins** — this is an index, not a content owner.

---

## Header

| Field | Value |
|---|---|
| Last updated | 2026-05-04 (Day 6 of Phase 0) — EP audit ship + EP-XX-7 mitigation landed |
| Last update by | jhart |
| Last update commit SHA | `9ac3806` (PR #229 — EP-XX-7 mitigation) + this PR pending |
| Plan reference | `docs/PATH_TO_ROBUST.md` v1.2 (active 2026-04-28) |
| Plan target | **Under revision per v2.0**; v1.2 timeline (3-4 months) revised preliminary to **7-9 months raw scope**; per CAD audit §13, this translates to ~3-6 months AI-assisted wall-clock depending on work-mix; v2.0 PATH_TO_ROBUST due ~2026-05-19 will codify with explicit raw-scope vs wall-clock disambiguation |
| Phase 0 day | **5 of 21** (16 days remaining in Phase 0 window) |
| Phase 0 hours budget | **~46-68h raw-scope consumed of 120-150h** (~52-82h remaining; HF audit ~7-10h logged + CAD audit ~6-8h logged. Wall-clock actual much smaller per AUDIT-028) |
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

- [/] PV — codebase inventory + spec↔code addendum complete (26.7% coverage)
- [/] HF — spec↔code addendum complete (46% any / 21.4% DET_OK; 11 T1 SPEC_ONLY)
- [/] CAD — spec↔code addendum complete (61.1% any / 31.1% DET_OK; 6 T1 SPEC_ONLY) [name-match]
- [/] EP — spec↔code addendum complete (41.6% any / 20.2% DET_OK; 7 T1 SPEC_ONLY of which 1 REMEDIATED via PR #229) [**rule-body-verified — AUDIT-029 methodology adopted**]
- [ ] SH (~6-8h raw scope; rule-body-verified from gate per Step E)
- [ ] VHD (~6-8h raw scope; rule-body-verified from gate per Step F)

### Phase 0C — UI/UX audit (~25-30h)

- [ ] Catalog all current UI surfaces
- [ ] Document existing design system
- [ ] Per-module UI maturity assessment
- [ ] Service line + research view audit

### Phase 0 deliverables

- [/] All audit reports committed (1 of 7 modules + Phase 1, 3 partial)
- [ ] **603-row implementation matrix** (708 minus 105 CX deferred per §3b)
- [/] Updated `AUDIT_FINDINGS_REGISTER.md` (28 findings, current; AUDIT-027 expanded scope, AUDIT-028 added)
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
| Clinical KB | 18% | CK v4.0 with 708 gaps; 3 of 6 modules audited (PV + HF + CAD addenda) | CK v4.0 + PV/HF/CAD addenda |

---

## §3 — Audit surface status (active scope, 20 surfaces)

| # | Surface | Module | View | Audit state |
|---|---|---|---|---|
| 1 | HF — care team | HF | care team | **PARTIAL** (Phase 0B addendum, spec↔code mapping) |
| 2 | HF — service line | HF | service line | file-count inventory only |
| 3 | HF — executive | HF | executive | file-count inventory only |
| 4 | EP — care team | EP | care team | **PARTIAL** (Phase 0B addendum, **rule-body-verified**) |
| 5 | EP — service line | EP | service line | file-count inventory only |
| 6 | EP — executive | EP | executive | file-count inventory only |
| 7 | SH — care team | SH | care team | NOT STARTED |
| 8 | SH — service line | SH | service line | NOT STARTED |
| 9 | SH — executive | SH | executive | NOT STARTED |
| 10 | CAD — care team | CAD | care team | **PARTIAL** (Phase 0B addendum, spec↔code mapping) |
| 11 | CAD — service line | CAD | service line | file-count inventory only |
| 12 | CAD — executive | CAD | executive | file-count inventory only |
| 13 | VHD — care team | VHD | care team | NOT STARTED |
| 14 | VHD — service line | VHD | service line | NOT STARTED |
| 15 | VHD — executive | VHD | executive | NOT STARTED |
| 16 | PV — care team | PV | care team | **PARTIAL** (Phase 0B addendum, spec↔code mapping) |
| 17 | PV — service line | PV | service line | file-count inventory only |
| 18 | PV — executive | PV | executive | file-count inventory only |
| 19 | Research/registry/trial | cross-cutting | all 3 views | NOT STARTED — 3 frontend files exist, 0 backend routes / 0 Prisma models |
| 20 | Backend superuser | cross-cutting | admin | **PARTIAL** via AUDIT-011 Phase a-pre |

**Audit coverage:** 3 of 20 surfaces with substantive audit work (HF care team via Phase 0B addendum 2026-05-03; CAD care team via Phase 0B addendum 2026-05-03; PV care team via Phase 0B addendum 2026-04-29 — all three spec↔code mapping). Additional partial coverage: 6 surfaces inventoried at file-count level only (HF service line + executive, CAD service line + executive, PV service line + executive); 1 cross-cutting (Backend superuser) partially audited via AUDIT-011 Phase a-pre tenant isolation work. Source: `docs/audit/PHASE_0B_HF_AUDIT_ADDENDUM.md`, `docs/audit/PHASE_0B_CAD_AUDIT_ADDENDUM.md`, `docs/audit/PHASE_0B_PV_AUDIT_REPORT*.md`, `docs/audit/AUDIT_011_DESIGN.md`.

---

## §3b — Deferred / Out-of-scope modules

> **CX (Cross-module/Disparities/Safety):** 105 spec gaps in CK v4.0 §6.7. Deferred from current build scope per operator decision 2026-05-03. Revisit in v2.0 PATH_TO_ROBUST. NOT IN `ModuleType` enum, 0 frontend files, 0 backend rules.

---

## §4 — Per-module status (6 active modules)

| Module | Spec gaps | Backend rules | Rule density % | Frontend .tsx files | Audit state | T1 priority gaps |
|---|---|---|---|---|---|---|
| HF | 126 | 48 | **46% any / 21.4% DET_OK** | 38 | PARTIAL (addendum, name-match) | 29 in spec, 18 covered (62%), 11 SPEC_ONLY |
| EP | 89 | 45 | 51% naive / **41.6% any / 20.2% DET_OK** [rule-body-verified] | 63 | PARTIAL (addendum) | 15 in spec, 8 covered (53%), 7 SPEC_ONLY (1 REMEDIATED via PR #229) |
| SH | 88 | 25 | 28% | 48 | NOT STARTED | unknown |
| CAD | 90 | 76 | **61.1% any / 31.1% DET_OK** | 25 | PARTIAL (addendum) | 18 in spec, 12 covered (67%), 6 SPEC_ONLY |
| VHD | 105 | 32 | 30% | 18 | NOT STARTED | unknown |
| PV | 105 | 33 | 31% naive / **26.7% real** | 24 | PARTIAL (addendum) | 7 in spec, 1 covered + 2 partial + 4 SPEC_ONLY |
| **Total active** | **603** | **261** (was 259; +2 from PR #229 EP-XX-7 mitigation) | **43% naive avg** | **216** | 4 of 6 audited (1 rule-body-verified) | |

**Caveat:** "Rule density %" is naive (rules ÷ spec gaps). PV addendum showed real coverage diverges (33 rules → 26.7% real coverage because 9 rules are EXTRA and several map non-1:1). HF addendum confirmed pattern (48 rules → 46% any-coverage / 21.4% DET_OK; 1 EXTRA + broad-rule consolidation in Amyloid + HCM). CAD addendum extended pattern at density extreme (76 rules → 61.1% any / 31.1% DET_OK; 15 EXTRA — sub-linear scaling per CAD §11). True per-module coverage requires Phase 0B audit per module.

Source: per-module audit docs, `backend/prisma/schema.prisma` `ModuleType` enum, `backend/src/ingestion/gaps/gapRuleEngine.ts` grep, `src/ui/*` file count.

---

## §5 — Tier S findings status

| Finding | Severity | State | Notes |
|---|---|---|---|
| AUDIT-009 (MFA enforcement) | P1 | **DEPLOYED flag-off** | Controlled rollout pending |
| AUDIT-011 (tenant isolation) | P1 | **Phase a-pre RESOLVED** | Phase a/b/c/d remain (~9-11h) |
| AUDIT-013 (audit log durability) | P1 | **RESOLVED** 2026-04-30 | dual-transport CloudWatch |
| AUDIT-015 (decrypt fail-loud) | P1 | **RESOLVED** 2026-04-30 | 51 legacy plaintext rows backfilled |

**Tier S progress: 3.5 of 4 closed.** Source: `AUDIT_FINDINGS_REGISTER.md`.

---

## §6 — Open critical work (top 3, priority order)

1. **SH + VHD Phase 0B audits** — ~12-16h raw scope, rule-body-verified from gate (per AUDIT-029); completes 6-of-6 module audit picture for v2.0 input
2. **Step H retro pass on PV/HF/CAD** — ~3.8h raw scope (full retro per LOCK 1); rule-body-verifies T1 SAFETY/SAFETY-Crit/PARTIAL + broad-rule T2 across 3 prior name-match modules. Per AUDIT-029, expected ~20pp DET_OK reduction
3. **Phase 0C UI/UX audit** — 25-30h raw scope, completes Phase 0 deliverable set for v2.0 authorship
4. **Phase 0A backend audits Phase 3-7** — Data layer (~10h) + Operational maturity (~10h) + HIPAA gap analysis (~15-20h); also load-bearing for v2.0

**Audit-axis is critical-path for v2.0 (due ~2026-05-19).** Tactical security work (AUDIT-025 Phase b, AUDIT-011 Phase a/b/c/d, AUDIT-022 backfill) is queued for Phase 1.

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
| Phase 0B clinical audit framework | `docs/audit/PHASE_0B_CLINICAL_AUDIT_FRAMEWORK.md` |
| Phase 0B per-module audits | `docs/audit/PHASE_0B_<MODULE>_AUDIT_REPORT*.md`, `docs/audit/PHASE_0B_<MODULE>_AUDIT_ADDENDUM.md` (PV + HF complete) |
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

---

## Update protocol

This ledger is updated on every PR that changes state. PR template enforces a checkbox.

**Tier 1 (current):** Manual hand-edit. Reviewer enforces at PR review.
**Tier 2 (planned):** `scripts/build-state-snapshot.sh` auto-fills data-driven sections (rule counts, file counts, finding states). Manual prose preserved verbatim.
**Tier 3 (planned):** CI staleness check fails build if ledger stale relative to last commit. Required check before merge.

See `docs/BUILD_STATE_LEDGER_DESIGN.md` for full design.
