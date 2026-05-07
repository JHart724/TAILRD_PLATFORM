# BUILD_STATE.md

**Single-source-of-truth aggregate state ledger.** Indexes existing canonical docs into one scannable view. When this ledger and a source doc disagree, **the source doc wins** — this is an index, not a content owner.

---

## Header

| Field | Value |
|---|---|
| Last updated | 2026-05-07 (Day 8 of Phase 0) — HIPAA-foundations arc + AUDIT-016 PR 1 + Phase 3 data-layer audit (CONDITIONAL PASS) all complete; methodology stack §18 codified |
| Last update by | jhart |
| Last update commit SHA | 20-PR session arc 2026-05-05/07: PRs #234-#253 (canonical infra + Tier S series + Cat A/D + AUDIT-052 + AUDIT-041 §9.1 + Cat D §9.2 + LOINC + ABI §17.1; HIPAA-foundations arc PR #251 AUDIT-016 reconciliation + §18 codification + PR #252 AUDIT-016 PHI key rotation DESIGN PHASE COMPLETE + PR #253 AUDIT-022 production-grade backfill + operator runbook) |
| Plan reference | `docs/PATH_TO_ROBUST.md` v1.2 (active 2026-04-28) |
| Plan target | **Under revision per v2.0**; v1.2 timeline (3-4 months) revised preliminary to **7-9 months raw scope**; per CAD audit §13, this translates to ~3-6 months AI-assisted wall-clock. Canonical infrastructure + Tier S closure + Cat A/D/AUDIT-052 corrections + LOINC corrections + HIPAA-foundations arc + methodology stack (§1, §9.1, §9.2, §16, §17, §18) give v2.0 author structured 603-row matrix + verified-codes baseline + drift-prevention discipline + status-surface discipline + production-grade migration tooling pattern as direct input. AI-assisted multiplier observed sustained at higher rate than initial estimate (20 PRs in ~14-18h operator wall-clock + ~12-16h agent over 3 days); feeds v2.0 timeline calibration. v2.0 PATH_TO_ROBUST due ~2026-05-19 |
| Phase 0 day | **8 of ~21** (13 days remaining in Phase 0 window) |
| Phase 0 hours budget | **Phase 0B clinical-code verification arc: MATERIALLY COMPLETE.** Tier S queue CLOSED 4→0 (PRs #238/240/241/243). Cat A canonical RxNorm verification: 13 bugs in 84 codes corrected (PR #242). Cat D inline drug-class arrays: 8 bugs in 24 codes corrected (PR #246). AUDIT-052 architectural: 4 new canonical valuesets (DHP CCB / PPI / loop diuretic / thiazide; PR #247). AUDIT-041 applyOverrides §9.1 canonical-default (PR #245). Batch 5 LOINC: 5 wrong-concept bugs (3 RESOLVED PR #248 + 2 RESOLVED PR #249). Methodology stack codified: §1, §9.1, §9.2, §16, §17, §18. **HIPAA-foundations arc COMPLETE 2026-05-07** (PRs #251/252/253): AUDIT-016 PHI key rotation DESIGN PHASE COMPLETE + AUDIT-022 production-grade backfill + §18 status-surface discipline + production-grade migration tooling pattern (precedent for future PHI-touching migrations). **Remaining clinical-code verification debt: Batch 4 (211 inline ICD-10 patterns) + Batch 6 (96 threshold comparisons) + AUDIT-070 (FHIR ingestion expansion) — not blocking, latent risk only.** ~52-82h raw-scope budget partially consumed; redirected to Phase 0A backend Phases 3-5 (data + ops + HIPAA) + Phase 0C UI/UX. |
| v2.0 PATH_TO_ROBUST due | end of Week 3 (~2026-05-19) |

---

## §1 — Phase 0 deliverable checklist

Per `docs/PATH_TO_ROBUST.md` §5.

### Phase 0A — Backend audit Phase 2-7 continuation (~50-70h)

- [x] Phase 1 — Code quality + tech debt reconciliation (`PHASE_1_REPORT.md`, CONDITIONAL PASS)
- [/] Phase 2 — Security posture (Tier S 3.5 of 4 closed; AUDIT-011 Phase a-pre RESOLVED; AUDIT-022 RESOLVED 2026-05-07; AUDIT-016 PR 1 SHIPPED 2026-05-07 + AUDIT-017 RESOLVED bundled; **AUDIT-071 RESOLVED 2026-05-07** + AUDIT-073 bundled per §17.3 + AUDIT-076 partial closure (4 HIPAA-grade promotions); **AUDIT-016 PR 2 SHIPPED 2026-05-07** (V2 envelope emission + kmsService wiring + per-record EncryptionContext + 27 net new tests + AUDIT-076 partial closure +2 promotions); AUDIT-016 PR 3 + AUDIT-024 LOW + AUDIT-025 MEDIUM + AUDIT-077 LOW remain)
- [x] Phase 3 — Data layer (`PHASE_3_REPORT.md`, **CONDITIONAL PASS** 2026-05-07; audit findings correct; first production-readiness gate item AUDIT-071 RESOLVED 2026-05-07 via this PR; 9 new findings remain on the immediate-remediation arc — AUDIT-073 bundled-RESOLVED, 4 MEDIUM P2 + 4 LOW P3 still OPEN — see PHASE_3_REPORT.md §5 + register; data-state-independent — PHI may arrive any day)
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
| Security | 55% | Tier S 3.5/4 closed; AUDIT-011 Phase a-pre RESOLVED; AUDIT-022 RESOLVED 2026-05-07; AUDIT-016 DESIGN PHASE COMPLETE 2026-05-07 (3-sub-PR queue); AUDIT-025 Phase a live | `AUDIT_FINDINGS_REGISTER.md` |
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

**Phase 0B clinical-code verification arc materially COMPLETE (2026-05-06).** **HIPAA-foundations arc COMPLETE (2026-05-07).** **Phase 3 data-layer audit COMPLETE (2026-05-07; CONDITIONAL PASS — production posture NOT production-ready today).** **AUDIT-071 RESOLVED (2026-05-07; first production-readiness gate item closed).** **AUDIT-016 PR 2 SHIPPED (2026-05-07; V2 envelope emission + kmsService wiring + per-record EncryptionContext live for new writes).**

**Top 3 priorities — production-readiness immediate-remediation arc** (data-state-independent; PHI may arrive any day):

1. **AUDIT-016 PR 3 (migration handler + background job; ~4-7h)** — IMMEDIATE next work block now that PR 2 SHIPPED. V2 emission live for new writes; PR 3 implements `migrateRecord()` + background re-encryption job to convert legacy V0 + V1 ciphertext to V2. AUDIT-016 register status flips OPEN → RESOLVED at PR 3 merge.
2. **AUDIT-011 Phase b/c/d (Layer 3 Prisma extension; ~9-11h)** — sequenced after AUDIT-016 PR 3. AUDIT-071 demonstrated app-layer `where: { hospitalId }` discipline alone is structurally insufficient; Layer 3 is the structural backstop.
3. **AUDIT-075 PHI encryption coverage (errorMessage / description / notes; ~4-8h)** — production-readiness gate item; sister to AUDIT-018/019.

**Other production-readiness gate items** (sequence into the immediate-remediation arc):
- AUDIT-078 Aurora backup IaC + restore-test — ~6-10h (operator-side ops PR)
- AUDIT-080 Zod validation coverage — ~12-20h (phased rollout)
- AUDIT-077 tenant-isolation hygiene (cqlRules role-comparison + bare-id update + webhookEvent missing hospitalId) — ~30-60min, separate small PR per D4

**Lower priority (capacity-calibrated, post-immediate-remediation arc):**
- AUDIT-072 Soft-delete coverage gap — MEDIUM P2 but not gate-item
- AUDIT-070 FHIR ingestion expansion — completes Phase 0B clinical-code arc
- Batch 4 ICD-10 inline pattern verification (~2-3h; mechanical)
- Batch 6 labValues threshold verification (~3-4h)
- AUDIT-035 / AUDIT-036 registry orphans (v2.0-deferred)
- Phase 0C UI/UX audit (~25-30h)

**Anti-recommendation:** v2.0 PATH_TO_ROBUST authorship — load-bearing, novel architectural decisions, never appropriate at fatigue tail.

Tactical security work (AUDIT-025 Phase b) queued for Phase 1.

### §6.1 — OPEN findings inventory (per §18 register-literal severity)

Mirror of `docs/audit/AUDIT_FINDINGS_REGISTER.md` for non-Tier-S OPEN findings. Severity copied verbatim from register per §18 status-surface discipline. Register is source of truth; on disagreement, register wins.

**Production-readiness gate items** (immediate remediation; data-state-independent; PHI may arrive any day; aggregated in `PHASE_3_REPORT.md` §5):

| Finding | Severity | Status | Notes |
|---|---|---|---|
| AUDIT-075 | MEDIUM (P2) | OPEN — PRODUCTION-READINESS GATE | PHI encryption coverage gaps (errorMessage / description / notes plaintext); sister to AUDIT-018/019. |
| AUDIT-078 | MEDIUM (P2) | OPEN — PRODUCTION-READINESS GATE | Production Aurora backup config not in IaC; restore procedure untested. |
| AUDIT-080 | MEDIUM (P2) | OPEN — PRODUCTION-READINESS GATE | Zod validation coverage gap (21 of 26 mutating-route files lack Zod). |

> **AUDIT-071 + AUDIT-073 RESOLVED 2026-05-07** via PR #257 (HIGH P1 cdsHooks tenant-isolation gate item); see register entries for details. **AUDIT-016 PR 2 SHIPPED 2026-05-07** via this PR (HIGH P1 PHI key rotation; V2 envelope emission + kmsService wiring live for new writes; AUDIT-016 register flips OPEN → RESOLVED at PR 3 merge). 3 production-readiness gate items remain (AUDIT-075 + AUDIT-078 + AUDIT-080); AUDIT-016 PR 3 sequenced as next gate work.

**Other OPEN findings:**

| Finding | Severity | Status | Notes |
|---|---|---|---|
| AUDIT-024 | LOW (P3) | OPEN | Prisma migrate wraps SQL in transaction; CONCURRENTLY index pattern requires multi-step deploy. Pattern issue, not security. |
| AUDIT-025 | MEDIUM (P2) | OPEN (design complete 2026-05-03; Phase a/b implementation pending) | Schema migration validation gate. |
| AUDIT-035 | MEDIUM (P2) | OPEN (v2.0-deferred per prior design) | `gap-ep-anticoag-interruption` registry-only orphan. |
| AUDIT-036 | LOW (P3) | OPEN (v2.0-deferred per prior design) | `gap-hf-vaccine-covid` registry-only orphan. |
| AUDIT-037 | MEDIUM (P2) | OPEN | `Math.random()` in `cqlEngine.ts:475` default rule scoring; CLAUDE.md §14 "NEVER DO" violation; clinical scoring path. |
| AUDIT-038 | LOW (P3) | OPEN | Node 18 LTS deprecation tracking. |
| AUDIT-070 | MEDIUM (P2) | OPEN | FHIR ingestion expansion gap: `CARDIOVASCULAR_LAB_CODES` missing ABI + other LOINC entries. Latent risk only; CSV path unaffected. |
| AUDIT-072 | MEDIUM (P2) | OPEN | Soft-delete coverage gap; DELETE patient does not cascade. |
| AUDIT-074 | LOW (P3) | OPEN | Schema-reading hygiene (onDelete defaults + missing hospitalId-leading index on 10 models). |
| AUDIT-076 | LOW (P3) | OPEN | `HIPAA_GRADE_ACTIONS` set narrow; some clinically-significant events best-effort. |
| AUDIT-077 | LOW (P3) | OPEN | Tenant-isolation defense-in-depth hygiene (cqlRules role-comparison bug; bare-id update; webhookEvent missing hospitalId). |
| AUDIT-079 | LOW (P3) | OPEN | `connection_limit` not explicit in DATABASE_URL nor Prisma client. |

**Recently resolved (2026-05-07 HIPAA-foundations arc, removed from OPEN):**

| Finding | Severity | Resolution |
|---|---|---|
| AUDIT-016 | HIGH (P1) | DESIGN PHASE COMPLETE 2026-05-07 (PR #252). Implementation queue: 3 sub-PRs ~14-22h total — see §6.2. |
| AUDIT-022 | MEDIUM (P2) | RESOLVED 2026-05-07 (PR #253). Production-grade tooling shipped; production --execute timing operator-side per `docs/runbooks/AUDIT_022_PRODUCTION_RUNBOOK.md`. |

### §6.2 — AUDIT-016 implementation queue (PHI key rotation, 3 sub-PRs)

Design source: `docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md` (shipped PR #252). Effort estimates revised post §17.1 consumer audit: total ~14-22h (down from initial 24-40h after `kmsService.ts` was found fully implemented at 305 LOC awaiting wiring).

| Sub-PR | Scope | Effort | Status |
|---|---|---|---|
| PR 1 | Envelope format V0/V1/V2 + V1 single-key emission + AUDIT-017 key validation bundle | ~5-7h | **SHIPPED 2026-05-07** (PR #255) |
| PR 2 | V2 envelope emission + `kmsService` wiring (KMS GenerateDataKey + KEK wrapping + per-record EncryptionContext) | ~5-8h | **SHIPPED 2026-05-07** (this PR; ~7-8h actual incl. D7 in-scope expansion + bonus kmsService.test.ts) |
| PR 3 | `migrateRecord()` implementation + background re-encryption job (V0 + V1 → V2) | ~4-7h | NOT STARTED — IMMEDIATE next work block |

`keyRotation.ts` PR 1 stubs replaced with real V0/V1 single-key paths; PR 2 wires real V2 path through `kmsService.envelopeEncrypt`/`envelopeDecrypt` with per-record `{ service, purpose, model, field }` EncryptionContext. AUDIT-016 status flips OPEN → RESOLVED at PR 3 merge.

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
| **AUDIT-016 PHI key rotation design** | `docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md` (shipped PR #252; 3-sub-PR implementation queue) |
| **AUDIT-022 production runbook** | `docs/runbooks/AUDIT_022_PRODUCTION_RUNBOOK.md` (shipped PR #253; 8-section operator runbook for legacy-JSON-PHI backfill execution) |
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

**Phase 3 data-layer audit complete (2026-05-07):** `docs/audit/PHASE_3_REPORT.md` shipped — **CONDITIONAL PASS** verdict; **production posture NOT production-ready today**; immediate-remediation arc next. 10 new register entries (AUDIT-071 through AUDIT-080): 1 HIGH P1 + 5 MEDIUM P2 + 4 LOW P3. Highest-visibility finding: **AUDIT-071 cdsHooks cross-tenant patient lookup** — `cdsHooks.ts:117-123, 294-300` use a structurally always-false tenant filter because (a) routes are mounted under `cdsLimiter` only at `server.ts:189` (not `authenticateToken`) and (b) `verifyCDSHooksJWT` does not populate `req.user`. Cross-tenant patient lookup by `fhirPatientId` in BOTH dev AND production. Reinforced by missing `@@unique([hospitalId, fhirPatientId])` constraint. Single-tenant verification confirmed (operator: no production hospital data, BSW pre-DUA pre-data-flow). The bug exposes nothing today because there's nothing to expose — but **production-ready posture is data-state-independent**. PHI may arrive any day; today's structural cross-tenant filter bug is tomorrow's PHI exposure on the same code path. Filed as HIGH P1 per §18 register-literal classification with status "OPEN — PRODUCTION-READINESS GATE — HIGH P1 IMMEDIATE; mitigation PR is the next work block."

Methodology paid interest twice. First: front-loading high-risk surfaces (multi-tenancy enforcement + soft-delete coverage) per operator decision D1 surfaced the HIGH P1 in 3.5h; conventional schema-first ordering would have buried it under hours of LOW/MEDIUM density. Second: operator-side §17.1 framing correction caught the agent's "pre-onboard gate" / "before first PHI ingestion" derivative drift before this PR merge. The drift weakened urgency by tying remediation to a future event; operator's correct framing is data-state-independent. **Sixth §17.1 architectural-precedent of the arc; third caught against operator-side derivative artifacts** (after AUDIT-016 V0/V1/V2 schema split caught my own design doc, and AUDIT-022 production-grade-tooling reframing). Production-readiness gate aggregates 5 of this audit's findings (AUDIT-071/073/075/078/080) + 3 existing (AUDIT-011 Phase b/c/d, AUDIT-016 PR 2 + PR 3, AUDIT-022 production `--execute`) into a coordinated immediate-remediation arc; v2.0 PATH_TO_ROBUST authorship will sequence the longer items but the arc starts immediately. AUDIT-011 multi-tenancy enforcement Phase b/c/d cannot defer to v2.0 — AUDIT-071 demonstrates app-layer `where: { hospitalId }` discipline alone is structurally insufficient.

**HIPAA-foundations arc complete (2026-05-07):** 3-PR arc closed three drift / readiness gaps in HIPAA-relevant PHI handling. PR #251 (`fix(audit): AUDIT-016 dated severity reconciliation + §18 status-surface discipline`) added `AUDIT_METHODOLOGY.md §18` codifying register-literal severity copy as drift-prevention discipline (preceded by an operator-caught AUDIT-016 LOW P3 → MEDIUM P2 → HIGH P1 cross-surface drift during PR #248-#250 work). PR #252 (`feat(security): AUDIT-016 PHI key rotation DESIGN PHASE COMPLETE`) shipped the design doc + interface stubs (`backend/src/services/keyRotation.ts` with `DesignPhaseStubError`) for Option-B AWS KMS envelope encryption (180-day app-layer DEK + 365-day AWS-managed KEK; 3-sub-PR implementation queue). PR #253 (`feat(security): AUDIT-022 Legacy JSON PHI backfill — production-grade migration tooling + operator runbook + 28-column coverage`) shipped 574-LOC migration script + 22 tests (417/417 full suite) + 247-LOC operator runbook with confirmation gate (`AUDIT_022_EXECUTE_CONFIRMED=yes`) + pre-flight env validation + rate-limiting + summary artifact + backup-reminder + `cds_hooks_sessions.fhirContext`/`cards` schema-drift skip. Production --execute timing is operator-side per runbook; tooling readiness ships independent of timing. **§17.1 architectural-precedent count: 4 exercises** (AUDIT-067/068 LOINC reference-only PR #249 50min fix; AUDIT-069 LVEF prior-fix-was-itself-regression PR #248; AUDIT-016 `kmsService.ts` 305 LOC fully-implemented vs register's "scaffolded but unwired" PR #252 effort 24-40h → 14-22h; AUDIT-022 PHI_JSON_FIELDS broader than register snapshot + 2 stale refs cleaned + production-grade quality bar correction PR #253). Methodology stack now §1 / §9.1 / §9.2 / §16 / §17 / §18. Total HIPAA-foundations arc: 3 PRs in ~3-4h operator wall-clock + ~3-4h agent on 2026-05-07. Sustains AI-assisted multiplier. Production-grade migration tooling pattern (confirmation gate + pre-flight + rate-limit + artifact + runbook) is now precedent for any future PHI-touching migration script.

**AUDIT-071 mitigation complete (2026-05-07):** First production-readiness gate item (HIGH P1) closed as the work block immediately following Phase 3 audit merge. cdsHooks cross-tenant patient lookup vulnerability resolved via new `HospitalEhrIssuer` mapping model + new `cdsHooksAuth` middleware + mandatory tenant filter at all 3 callsites (the original 2 patient.findFirst sites PLUS the previously-unsurfaced `cdsHooksSession.create` at line 163 — fixed by construction once the read filter is mandatory). Phase A pre-flight inventory expanded original 2-callsite framing to **3 vulnerable callsites + production header-skip + downstream session-write** — all bundled per §17.3. Severity stayed HIGH P1 per §18 register-literal classification; inventory expansion confirmed AND deepened the original framing rather than weakening it. AUDIT-073 schema migration bundled (3 fhir*Id per-tenant uniques + CarePlan fhirCarePlanId index). AUDIT-076 partial closure via 4 HIPAA-grade promotions (D6). 14 new middleware tests + 437-LOC design doc + 178-LOC operator runbook ship same PR. jest 478/478. Methodology stack now §1 / §9.1 / §9.2 / §16 / §17 / §18 with sixth and seventh §17.1 architectural-precedent exercises: (6) Phase 3 audit pre-onboard-gate framing rejection caught by operator before merge; (7) Phase A pre-flight inventory caught hidden cross-tenant SESSION WRITE downstream of cross-tenant READ that the original Phase 3 finding hadn't surfaced. Next production-readiness gate item: **AUDIT-016 PR 2 (V2 envelope + kmsService wiring; ~5-8h)**.

**AUDIT-016 PR 2 complete (2026-05-07):** Second AUDIT-016 implementation PR shipped as PR-stacked follow-up to PR #257 (auto-merge disabled at repo level; branched off `feat/audit-071-cds-hooks-tenant-isolation` HEAD per operator-approved fallback). V2 envelope emission lit up: `keyRotation.ts` `encryptWithCurrent` dispatches V1/V2 via `shouldEmitV2(env)` runtime gate, V2 path calls `kmsService.envelopeEncrypt` with per-record `{ service, purpose, model, field }` EncryptionContext and serializes via `buildV2`; `decryptAny` V2 case replaces PR 1 `DesignPhaseStubError` with real `kmsService.envelopeDecrypt`. `phiEncryption.ts` middleware plumbs `model` + `field` through every call path (encrypt/decrypt + encryptFields/decryptRecord + encryptJsonField/decryptJsonField + Prisma `$use` create/update/upsert/updateMany/createMany/findUnique-decrypt). `kmsService.ts` parameterized: `KmsEncryptionContext` interface, `DEFAULT_KMS_CONTEXT` + `DEFAULT_KMS_FIELD_CONTEXT` constants, `toAwsEncryptionContext` projector; envelopeEncrypt/Decrypt accept context arg with backwards-compat default. `validateEnvelopeConfigOrThrow(env)` runs at module init alongside AUDIT-017 `validateKeyOrThrow` — fails fast if `PHI_ENVELOPE_VERSION=v2` without `AWS_KMS_PHI_KEY_ALIAS`; sister to AUDIT-013 fail-closed pattern. **Decrypt-is-not-gated** rollback safety property documented + tested (T1): set `PHI_ENVELOPE_VERSION=v1` → V2 emission stops, but existing V2 ciphertext continues to decrypt. **Strict fail-loud** per D4 chosen over graceful-degrade: KMS unreachable → throw, no V1 fallback. **Dev-vs-prod separation** intentional: dev V2 envelopes use kmsService localEncrypt-as-DEK-wrap (not portable across env crossings, acceptable because dev DBs are seeded fresh). 27 net new tests across 3 files (10 keyRotation V2 + 16 kmsService new + 1 phiEncryption T7 EncryptionContext-plumb), jest 510/510 (was 483 baseline; exceeds operator's 499 target). AUDIT-076 partial closure +2 HIPAA-grade promotions (`KMS_KEY_VALIDATION_FAILURE`, `KMS_ENVELOPE_DECRYPT_FAILURE`). 310-LOC design refinement note `docs/architecture/AUDIT_016_PR_2_V2_KMS_WIRING_NOTES.md` codifies all 7 operator decisions D1-D7 + future-work deferral (hospitalId-in-EncryptionContext as Phase 1+ enhancement gated on hospitalId being available at encrypt-time without per-call lookup). Methodology stack §1 / §9.1 / §9.2 / §16 / §17 / §18 sustained; no §17.1 architectural-precedent expansion needed (clean execution of PAUSE 2 commitments — design phase + Phase A inventory caught what would otherwise have been §17.1 surprises). §17.1 count stays at 7 across the 3-day arc. Next production-readiness gate item: **AUDIT-016 PR 3 (migration handler + background job; ~4-7h)** — AUDIT-016 status flips OPEN → RESOLVED at PR 3 merge.

---

## Update protocol

This ledger is updated on every PR that changes state. PR template enforces a checkbox.

**Tier 1 (current):** Manual hand-edit. Reviewer enforces at PR review.
**Tier 2 (planned):** `scripts/build-state-snapshot.sh` auto-fills data-driven sections (rule counts, file counts, finding states). Manual prose preserved verbatim.
**Tier 3 (planned):** CI staleness check fails build if ledger stale relative to last commit. Required check before merge.

See `docs/BUILD_STATE_LEDGER_DESIGN.md` for full design.
