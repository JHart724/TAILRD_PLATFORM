# BUILD_STATE.md

**Single-source-of-truth aggregate state ledger.** Indexes existing canonical docs into one scannable view. When this ledger and a source doc disagree, **the source doc wins** — this is an index, not a content owner.

---

## Header

| Field | Value |
|---|---|
| Last updated | 2026-05-03 (Day 5 of Phase 0) |
| Last update by | jhart |
| Last update commit SHA | `3f4ef57` (PR #223 — AUDIT-025 Phase a Migration Validation gate) |
| Plan reference | `docs/PATH_TO_ROBUST.md` v1.2 (active 2026-04-28) |
| Plan target | Platform v1.0 by 2026-07-29 to 2026-08-29 (3-4 months) |
| Phase 0 day | **5 of 21** (16 days remaining in Phase 0 window) |
| Phase 0 hours budget | **~30-50h consumed of 120-150h** (~80-100h remaining) |
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
- [ ] HF (~7-10h, largest spec at 126 gaps, BSW pilot's most-developed module)
- [ ] CAD (~6-8h, highest rule density at 76 rules)
- [ ] EP (~6-8h)
- [ ] SH (~6-8h)
- [ ] VHD (~6-8h)

### Phase 0C — UI/UX audit (~25-30h)

- [ ] Catalog all current UI surfaces
- [ ] Document existing design system
- [ ] Per-module UI maturity assessment
- [ ] Service line + research view audit

### Phase 0 deliverables

- [/] All audit reports committed (1 of 7 modules + Phase 1, 2 partial)
- [ ] **603-row implementation matrix** (708 minus 105 CX deferred per §3b)
- [/] Updated `AUDIT_FINDINGS_REGISTER.md` (27 findings, current)
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
| Clinical KB | 15% | CK v4.0 with 708 gaps; 1 of 6 modules audited (PV partial) | CK v4.0 + PV addendum |

---

## §3 — Audit surface status (active scope, 20 surfaces)

| # | Surface | Module | View | Audit state |
|---|---|---|---|---|
| 1 | HF — care team | HF | care team | NOT STARTED |
| 2 | HF — service line | HF | service line | NOT STARTED |
| 3 | HF — executive | HF | executive | NOT STARTED |
| 4 | EP — care team | EP | care team | NOT STARTED |
| 5 | EP — service line | EP | service line | NOT STARTED |
| 6 | EP — executive | EP | executive | NOT STARTED |
| 7 | SH — care team | SH | care team | NOT STARTED |
| 8 | SH — service line | SH | service line | NOT STARTED |
| 9 | SH — executive | SH | executive | NOT STARTED |
| 10 | CAD — care team | CAD | care team | NOT STARTED |
| 11 | CAD — service line | CAD | service line | NOT STARTED |
| 12 | CAD — executive | CAD | executive | NOT STARTED |
| 13 | VHD — care team | VHD | care team | NOT STARTED |
| 14 | VHD — service line | VHD | service line | NOT STARTED |
| 15 | VHD — executive | VHD | executive | NOT STARTED |
| 16 | PV — care team | PV | care team | **PARTIAL** (Phase 0B addendum, spec↔code mapping) |
| 17 | PV — service line | PV | service line | file-count inventory only |
| 18 | PV — executive | PV | executive | file-count inventory only |
| 19 | Research/registry/trial | cross-cutting | all 3 views | NOT STARTED — 3 frontend files exist, 0 backend routes / 0 Prisma models |
| 20 | Backend superuser | cross-cutting | admin | **PARTIAL** via AUDIT-011 Phase a-pre |

**Audit coverage:** 1 of 20 surfaces with substantive audit work (PV care team via Phase 0B addendum, spec↔code mapping). Additional partial coverage: 2 PV surfaces inventoried at file-count level only (service line, executive); 1 cross-cutting (Backend superuser) partially audited via AUDIT-011 Phase a-pre tenant isolation work. Source: `docs/audit/PHASE_0B_PV_AUDIT_REPORT*.md`, `docs/audit/AUDIT_011_DESIGN.md`.

---

## §3b — Deferred / Out-of-scope modules

> **CX (Cross-module/Disparities/Safety):** 105 spec gaps in CK v4.0 §6.7. Deferred from current build scope per operator decision 2026-05-03. Revisit in v2.0 PATH_TO_ROBUST. NOT IN `ModuleType` enum, 0 frontend files, 0 backend rules.

---

## §4 — Per-module status (6 active modules)

| Module | Spec gaps | Backend rules | Rule density % | Frontend .tsx files | Audit state | T1 priority gaps |
|---|---|---|---|---|---|---|
| HF | 126 | 48 | 38% | 38 | NOT STARTED | unknown |
| EP | 89 | 45 | 51% | 63 | NOT STARTED | unknown |
| SH | 88 | 25 | 28% | 48 | NOT STARTED | unknown |
| CAD | 90 | 76 | 84% (top) | 25 | NOT STARTED | unknown |
| VHD | 105 | 32 | 30% | 18 | NOT STARTED | unknown |
| PV | 105 | 33 | 31% naive / **26.7% real** | 24 | PARTIAL (addendum) | 7 in spec, 1 covered + 2 partial + 4 SPEC_ONLY |
| **Total active** | **603** | **259** | **43% naive avg** | **216** | 1 of 6 audited | |

**Caveat:** "Rule density %" is naive (rules ÷ spec gaps). PV addendum showed real coverage diverges (33 rules → 26.7% real coverage because 9 rules are EXTRA and several map non-1:1). True per-module coverage requires Phase 0B audit per module.

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

1. **HF Phase 0B audit** — 7-10h, biggest signal for v2.0 (BSW pilot's most-developed module, largest spec at 126 gaps)
2. **CAD Phase 0B audit** — 6-8h, highest rule density (76 rules), counterweight test for "more built than thought" hypothesis
3. **EP / SH / VHD audits batched** — 18-24h, fills v2.0 picture across 5 of 6 active modules

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
| Phase 0B per-module audits | `docs/audit/PHASE_0B_<MODULE>_AUDIT_REPORT*.md` |
| Per-finding designs | `docs/audit/AUDIT_<NNN>_DESIGN.md` (AUDIT-011, AUDIT-025) |
| Tier S remediation design | `docs/audit/TIER_S_REMEDIATION_DESIGN.md` |
| Clinical knowledge base | `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` |
| Migration history (Day 9-11) | `docs/DAY_<N>_PLAN.md`, `docs/DAY_<N>_*_RUNBOOK.md` |
| Change records | `docs/CHANGE_RECORD_*.md` |
| Health system onboarding | `docs/HEALTH_SYSTEM_ONBOARDING_RUNBOOK.md` |
| BUILD_STATE.md design | `docs/BUILD_STATE_LEDGER_DESIGN.md` |

---

## Update protocol

This ledger is updated on every PR that changes state. PR template enforces a checkbox.

**Tier 1 (current):** Manual hand-edit. Reviewer enforces at PR review.
**Tier 2 (planned):** `scripts/build-state-snapshot.sh` auto-fills data-driven sections (rule counts, file counts, finding states). Manual prose preserved verbatim.
**Tier 3 (planned):** CI staleness check fails build if ledger stale relative to last commit. Required check before merge.

See `docs/BUILD_STATE_LEDGER_DESIGN.md` for full design.
