# PATH TO ROBUST — TAILRD HEART PLATFORM v1.1

**Author:** Jonathan Hart
**Created:** 2026-04-29 (post Day 10 Aurora cutover, post Phase 1 backend audit, post BSW scoping document review)
**Status:** v1.1 — ACTIVE
**Companions:** docs/audit/AUDIT_FRAMEWORK.md, docs/TECH_DEBT_REGISTER.md, TAILRD-BSW-Scoping-Document-v7_1.docx (clinical knowledge base v4.0)

## 1. Mission

Ship a fully production-grade TAILRD platform across all 7 cardiovascular modules — Heart Failure (126 gaps), Electrophysiology (89), Structural Heart (88), Coronary Artery Disease (90), Surgical Valvular Heart Disease (105), Peripheral Vascular (105), and Cross-module/Disparities/Safety (105) — totaling **708 structured clinical decision gaps** drawn from the TAILRD Comprehensive Clinical Knowledge Base v4.0. Plus service line view (already built, polishing scope). Plus research and registry views.

Production-grade means: every gap implemented with detection logic, every Tier 1 gap (107) with full UI polish and validated calculators, every Tier 2 gap (462) functional with strong templated UI, every Tier 3 gap (139) cataloged and surfaced; backend bulletproof with full test coverage; UI/UX unified design system applied consistently; no known tech debt; defensible against any enterprise due diligence or formal compliance audit.

**Target completion:** 3-4 months from 2026-04-29 → **2026-07-29 to 2026-08-29.**

**Operating principle:** enterprise/Palantir-grade across all dimensions. Depth is the default. UI polish is tiered (T1 bespoke, T2 templated, T3 catalog). Every gap is real. Solo execution.

## 2. Honest Current State

**Backend:** 52K LOC, 110 source files. Aurora Serverless v2 in production since 2026-04-29. 21 PRs merged on cutover day. Phase 1 backend audit found 1 P0 (test coverage 0.87%, auth-critical middleware 0%), 2 P1, 4 P2, 1 P3, 1 INFO. Verdict: CONDITIONAL PASS. Production safe at current pilot scale.

**Clinical knowledge base:** v4.0 (March 2026), spec catalogs **708 gaps** across 7 modules. CLAUDE.md previously stated "280+ detection algorithms." Discrepancy of ~428 gaps — implementation status to be verified by Phase 0B audit. Strong working hypothesis: more is implemented than the 280 figure suggests; the gap is wiring and UI surfacing, not detection logic creation. Gap detection logic, ICD codes, RxNorm specifications, lab thresholds, calculator components, and tier scoring are formally specified in the BSW scoping document — clinical work is substantially complete at the spec level.

**Calculators:** Component-level math present in knowledge base. Implementation in code and UI integration to be verified by Phase 0B audit.

**UI/UX:** Service line view exists with benchmarking and variability across the service line. Research views exist for clinical trials and registry work. Operator suspicion: "we may be more robust and better built than we think and maybe not everything is wired." Phase 0C audit confirms.

**Tech debt:** 37 entries in register, reconciled. 14 resolved/discovered-resolved, 22 verified open, 1 obsolete, 2 severity changes. 4 HIGH items concentrated in auth.

**Audit framework:** 7-phase backend audit defined; Phase 1 complete. Phases 2-7 deferred to dedicated sessions.

## 3. Strategic Reality

Three concurrent pressures: Mount Sinai commercial path, fundraising round, AVAM Bordeaux speech credibility. Each demands a robust platform. None has a hard deadline that breaks the 3-4 month timeline. The frame is "ship credibly," not "ship fast."

The BSW scoping document is itself a strategic asset — a publishable, defensible artifact: 708 gaps, evidence-based, ROI-pathway-tagged, tier-scored. For Mount Sinai, BSW, fundraising, AVAM — this document carries the platform's depth narrative. The platform must be robust enough that any audience could request a demo against any module and the depth holds up.

## 4. Approach: Path B + A Combined

**Path B (depth) is the default.** Every gap properly implemented: detection logic, citations, calculator where applicable. No gap is "drafted" — all are "real."

**Path A (tier-based UI polish) layers on top.** Tier 1 (107) bespoke UI surfaces, full polish. Tier 2 (462) strong templated UI patterns. Tier 3 (139) catalog-tier surfaces.

**Combined: every gap is enterprise-grade in detection logic and clinical content. UI polish is proportional to user-facing value.** This is how Stripe / Palantir / Epic actually build — bulletproof core engine, tiered UI investment.

## 5. The Plan: Three Phases

### Phase 0 — Audit Everything (Weeks 1-3, ~120-150h)

The most important phase. Every downstream estimate depends on what audit reveals.

**Phase 0A — Backend audit Phase 2-7 continuation (Weeks 1-2, ~50-70h)**

Per existing audit framework:
- Phase 2: Security posture (~20h) — auth flow, PHI encryption, secret lifecycle, threat model SUPER_ADMIN bypass, tenant isolation
- Phase 3: Data layer (~10h) — Prisma schema review, index coverage, migration history, query performance baseline
- Phase 4: Operational maturity (~10h) — observability gaps, runbook coverage, alerting completeness
- Phase 5: HIPAA compliance gap analysis (~15-20h) — depends on Phase 1 Tier A in flight

**Phase 0B — Clinical content audit (Weeks 1-3, ~50-70h)**

Per-module, ~7-10h each across HF, EP, SH, CAD, VHD, PV, CX:
- Pull module gap list from BSW scoping document (the spec)
- Pull module's currently-implemented gap detection from codebase
- Map spec ↔ code: which spec gaps have working detection, which are partially built, which are not yet built
- Audit calculator implementations against published reference values (MDCalc + original publications)
- Document UI integration status per gap
- Output per-module audit report: implementation matrix (708 rows × {spec, code, calculator, UI, tests})

**Phase 0C — UI/UX audit (Week 2-3, ~25-30h)**

- Catalog all current UI surfaces (every page, every component)
- Document existing design system (colors, typography, spacing, components, patterns)
- Identify inconsistencies and gaps
- Per-module UI maturity assessment
- Service line + research view audit
- Output: UI/UX audit report + design system documentation

**Phase 0 deliverables:**
- All audit reports committed to docs/audit/
- 708-row implementation matrix (most valuable artifact)
- Updated docs/audit/AUDIT_FINDINGS_REGISTER.md with all findings
- Revised v2.0 of this document — based on actual implementation state

**Phase 0 checkpoint (end of Week 3):** Confirm execution capacity. If audit reveals scope is significantly larger than capacity, document the gap honestly in v2.0 and adjust scope/sequencing within the constraints (solo, no tech debt, full 708, 3-4 months).

### Phase 1 — Foundation Hardening + Tier 1 Clinical (Weeks 4-9, ~250-350h)

**Backend hardening (~150-200h):**
- AUDIT-001 Tier A (auth middleware to 80%+) — 40-60h
- AUDIT-001 Tier B (services + routes coverage) — 80-120h
- AUDIT-002 type safety + AUDIT-003 console.* cleanup — 35-58h
- Phase 2-5 audit findings remediation — depends on findings

**Tier 1 clinical content (107 gaps, ~250-350h):**
- Module-by-module, starting with Heart Failure (lighthouse module, broadest reach)
- Sequence: HF (29 T1) → SH (13 T1) → CAD (18 T1) → EP (15 T1) → CX (17 T1) → VHD (8 T1) → PV (7 T1)
- Per gap: verify detection logic, validate clinical content against guidelines + trial citations from BSW doc, implement/polish calculator, build bespoke UI surface, write tests
- ~3-5h per Tier 1 gap on average

**Phase 1 checkpoint (end of Week 9):** All Tier 1 gaps production-grade. Backend bulletproof. Mid-timeline reassessment of Tier 2/3 sequencing within Phase 2/3 budget.

### Phase 2 — Tier 2 Clinical + UI/UX Polish (Weeks 10-15, ~600-900h)

**Tier 2 clinical content (462 gaps, ~600-900h):**
- Templated UI pattern per gap-type (alert / recommendation / educational / safety)
- Detection logic verified
- Citations validated
- Sample tests per pattern
- ~1.5-2.5h per Tier 2 gap

**UI/UX polish:**
- Design system applied consistently across all surfaces
- Service line + research views polished
- Cross-module visual consistency

**Phase 2 checkpoint (end of Week 15):** Tier 1 + Tier 2 complete. Tier 3 entering execution.

### Phase 3 — Tier 3 + Integration + Launch Readiness (Weeks 16-17, ~150-300h)

**Tier 3 clinical content (139 gaps, ~105-175h):**
- Detection logic + citations + catalog surface
- Lighter UI investment (catalog tier, not bespoke)

**Integration + polish:**
- End-to-end integration testing
- Cross-module workflow validation
- Performance load testing
- Security pen-test (this single contractor exception is acceptable for specialized expertise)
- Documentation polish
- Demo flow design (canonical 20-minute demo across all 7 modules)

**Phase 3 checkpoint (end of Week 17):** Platform v1.0 complete.

## 6. Pacing & Operational Discipline

Operating posture: max effort, 60-70h/week, full attention.

**Burnout-watch checkpoints every 2 weeks (operational discipline, not doubt):**
- Sleep quality < 6h/night > 5 days/week → flag
- Energy: persistent crash, struggling to start days → flag
- Quality: increasing rate of bugs/rework → flag (this signals execution discipline degrading, not just fatigue)
- Mood: irritability, isolation, persistent low mood → flag
- Physical: spinal situation worsening → STOP and address (medical, non-negotiable)

If 2+ flags fire: 3-day reset. Plan absorbs this.
If 3+ flags fire: 1-week reset + sequence review.

**Spinal surgery contingency:** plan absorbs 2-3 week recovery window. Pre-surgery: lock in surgery-week and recovery-week scope so resumption is mechanical. During recovery: documentation + planning work only.

## 7. Cash Strategy

Stated: $20-40K available. Plan budgets:
- **$0** for clinical/backend/UI work (solo execution)
- **$3-5K** for security pen-test contractor in Phase 3 (specialized expertise, single engagement)
- **$0-5K** for any clinical guideline / reference subscription if needed (UpToDate, MDCalc API, etc.)

Total budget: $5-10K. Preserves cash position. Fundraising round closing during Phase 0 unlocks flexibility for unexpected needs.

## 8. Risks Named

**Risk 1 — Scope creep.** Phase boundaries control this. Out-of-phase items go to Phase 4 backlog file.

**Risk 2 — Phase 0B reveals scope larger than capacity.** Plan handles via v2.0 revision: scope/sequencing adjustment within solo + no-tech-debt + 708 + 3-4 month constraints. Working hypothesis: audit reveals more built than thought, math closes.

**Risk 3 — Mid-stream pressure (Sinai, AVAM, fundraising demos).** Plan does NOT defer current execution. New asks queue for Phase 2 module work where they fit naturally.

**Risk 4 — Spinal surgery during execution.** Real per medical context. Plan absorbs 2-3 week pause. Pre-surgery scope freezing, post-surgery mechanical resumption. Documentation + planning work only during recovery.

**Risk 5 — BSW scoping document is more comprehensive than current build.** This is the optimistic-realistic case and the working hypothesis. Audit confirms; if confirmed, Tier 1 implementation may be largely done already, work is wiring + UI polish, not new builds. v2.0 reflects.

## 9. Success Criteria

End of 3-4 month execution, platform is robust if:

- [ ] All 7 backend audit phases COMPLETE; verdicts of PASS or CONDITIONAL PASS with documented remediation
- [ ] AUDIT-001 Tier A AND Tier B complete; project-wide coverage > 70%
- [ ] AUDIT-002 reduced to < 50 ESLint warnings
- [ ] AUDIT-003 reduced to 0 in production code paths (scripts excepted)
- [ ] All 708 gaps with documented audit verdict per gap (spec ↔ code ↔ UI alignment)
- [ ] All Tier 1 gaps (107) production-grade with bespoke UI + validated calculators
- [ ] All Tier 2 gaps (462) functional with templated UI + citations
- [ ] All Tier 3 gaps (139) detection-coded + catalog-surfaced + cited
- [ ] All 7 modules with documented UI/UX audit verdict of PASS
- [ ] Service line + research views: documented user workflows verified, polished
- [ ] Operational maturity: APM live, runbook coverage 100%, alerting tested
- [ ] HIPAA gap analysis: no P0 findings, P1 findings documented with active remediation
- [ ] Tech debt register: zero P0, ≤ 2 HIGH (with explicit deferral rationale)
- [ ] Demo flow: documented 20-minute canonical demo across all 7 modules + service line + research, runnable solo
- [ ] Documentation: architecture docs, API docs, deployment docs, runbooks all current

If 80%+ of these check, robust achieved. If not, plan failed and that's information for v2.0.

## 10. Document Discipline

This is v1.1. Revisions:
- **v2.0** at end of Week 3 (Phase 0 checkpoint) — based on audit findings, sequencing locked
- **v3.0** at end of Week 9 (Phase 1 checkpoint) — Tier 2 sequencing confirmed
- **v4.0** at end of Week 15 (Phase 2 checkpoint) — final stretch plan

Every revision: separate PR. Document is the source of truth.

## 11. Cross-References

- Backend audit framework: docs/audit/AUDIT_FRAMEWORK.md
- Phase 1 backend audit report: docs/audit/PHASE_1_REPORT.md
- Audit findings register: docs/audit/AUDIT_FINDINGS_REGISTER.md
- Tech debt register: docs/TECH_DEBT_REGISTER.md
- Clinical knowledge base spec: TAILRD-BSW-Scoping-Document-v7_1.docx (referenced; not committed to repo per business confidentiality)
- Day 10 cutover record: docs/CHANGE_RECORD_2026_04_29_day10_aurora_cutover.md

---

End of v1.1.
