# PATH TO ROBUST - TAILRD HEART PLATFORM v2.0

**Author:** Jonathan Hart
**Version:** v2.0
**Date:** 2026-05-20
**Status:** ACTIVE
**Supersedes:** v1.2 (archived at `docs/PATH_TO_ROBUST_v1.2_ARCHIVE.md`)
**Audit-baseline-incorporated:** PR #284 through PR #290 (7-PR audit closure arc completing 11 of 12 Phase 0 ledger items)
**Reconciliation summary:** 9 stale-708-references corrected to 603-active; CX deferral codified (revisit-at-v3.0); capacity-vs-scope framing per §3 operator decision (option (b) locked); 14 HIGH P1 GATE items sequenced into Phase 1 + Phase 2 per §5 + §6; AUDIT-001 P0 PRODUCTION_GRADE-ceiling dependency named per §11
**Companions:** `docs/audit/AUDIT_METHODOLOGY.md`, `docs/audit/AUDIT_FINDINGS_REGISTER.md`, `docs/audit/MATRIX_VERIFICATION_2026_05_20.md`, `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md`, `BUILD_STATE.md`, `CLAUDE.md`

---

## 1. Mission + Strategic Reality

Ship a fully production-grade TAILRD platform across 6 active cardiovascular modules: Heart Failure (126 gaps), Electrophysiology (89), Structural Heart (88), Coronary Artery Disease (90), Surgical Valvular Heart Disease (105), Peripheral Vascular (105). **Totaling 603 active structured clinical decision gaps** drawn from the TAILRD Comprehensive Clinical Knowledge Base v4.0. Plus service line view (already built, polishing scope). Plus research and registry views.

**Tier breakdown (audit-baseline verified at PR #290 matrix verification):** 90 T1 + 391 T2 + 122 T3 = 603 active gaps. Per `MATRIX_VERIFICATION_2026_05_20.md` §2 distribution.

**CX deferral:** Cross-module / Disparities / Safety (CX; 105 gaps) deferred per 2026-05-03 operator decision. Revisit at v3.0 per §13 Module Parity Principle. Matrix already CX-stripped at canonical layer (no CX.crosswalk.json). This is a deliberate scope reduction from v1.2's 708-row framing, taken to honor empirical capacity reality while preserving the Module Parity Principle across the 6 active cardiovascular modules. The 105 CX gaps are not abandoned; they re-enter the planning surface at v3.0 authorship checkpoint (end-of-Phase-1), at which point Phase 1 completion state + capacity-vs-scope reality determine whether CX rejoins the v1.0 release surface or carries forward to v1.1.

**Production-grade means:** every active gap implemented with detection logic; every T1 gap (90) with full UI polish + validated calculators; every T2 gap (391) functional with strong templated UI; every T3 gap (122) cataloged and surfaced; backend bulletproof with full test coverage (AUDIT-001 P0 closure dependency); UI/UX unified design system applied consistently (per Phase 0C §5.1 + §5.2 substantive engineering signals); 14 HIGH P1 GATE items closed (per §5 + §6 sequencing); no known tech debt; defensible against any enterprise due diligence or formal compliance audit.

Each criterion above is load-bearing. Detection logic per gap means every gap rule cites its ACC/AHA/ESC guideline source inline with class of recommendation + level of evidence per CLAUDE.md §8 clinical context discipline; gap rules without explicit `evidence` objects are blockers per the FDA CDS exemption (21st Century Cures Act) compliance posture. T1 bespoke UI means a per-gap surface designed for the clinical workflow it serves, not a templated card with substituted text; validated calculators means each risk calculator (CHA2DS2VASc, HAS-BLED, MAGGIC, GRACE, TIMI, SYNTAX, STS, WIfI, Framingham, INTERMACS, Wells, ORBIT) has been §16-verified against authoritative external source per Phase 0C 0C-CLI-03 gate item. T2 templated UI means a per-gap-type (alert / recommendation / educational / safety) pattern applied uniformly across modules; templated does not mean low-effort, it means a strong reusable pattern. T3 catalog means the gap is detection-coded and citation-validated but the UI surface is a catalog row + drill-down rather than a bespoke surface. Backend bulletproof with full test coverage means the platform-wide 0.87% test coverage measured at AUDIT-001 P0 surfacing has risen to > 70% across auth + middleware + services + routes; without this, no gap can achieve PRODUCTION_GRADE tier per `AUDIT_METHODOLOGY.md` L318 codification. UI/UX unified design system means Phase 0C §5.1 token-conflict resolution + §5.2 glassmorphism canonical visual treatment have been spec-codified at `docs/architecture/DESIGN_SYSTEM_SPEC.md` and applied consistently across all 6 modules. 14 HIGH P1 GATE items closed means each item has progressed OPEN -> IN_PROGRESS -> FIXED -> VERIFIED per the §18 register-literal lifecycle. No known tech debt means the AUDIT_FINDINGS_REGISTER P0 count is zero and HIGH count is bounded with explicit deferral rationale per the §17 PR acceptance criteria discipline. Defensible against enterprise due diligence means a Mount Sinai CIO, HCA security officer, or AVAM technical diligence partner can review the platform, the audit register, the methodology stack, and the release notes and conclude the platform is what it claims to be.

**Target completion:** Phase 0 exit ~2026-05-25 to 2026-05-30; v2.0 execution from Phase 0 exit to v1.0 release spans ~21 weeks; v1.0 target release ~2026-09-15 (extended ~3 weeks from v1.2 baseline 2026-07-29 to 2026-08-29 per AUDIT-028 work-mix discipline applied to empirical Phase 4 + Phase 5 + Phase 0C audit-overrun multiplier; CX-deferral from 708 to 603 active scope partially offsets but does not fully absorb the overrun pattern).

**Operating principle:** enterprise / Palantir-grade across all dimensions per operator 2026-05-07 codification (codified during methodology PR #286, reaffirmed during v2.0 V.3 outline review 2026-05-20). Depth is the default. UI polish is tiered (T1 bespoke, T2 templated, T3 catalog). Every gap is real. Solo execution.

"Palantir-grade" is not a stylistic claim; it is an operational discipline. It means: (1) every audit finding lives in a register with severity + status + remediation owner + lifecycle per `AUDIT_FINDINGS_REGISTER.md`; (2) every methodology decision lives in `AUDIT_METHODOLOGY.md` with an inline §17.1 architectural-precedent catalog entry citing the originating PR; (3) every drift mechanism lives in `AGENT_DRIFT_REGISTRY.md` with codification PR + activation scope; (4) every canonical artifact (matrix crosswalks, addenda, synthesis reports) regenerates via the full pipeline per `AUDIT_METHODOLOGY.md` §9.2 (no partial pipeline runs); (5) every clinical code (LOINC, ICD-10, RxNorm, SNOMED) is verified against an authoritative external source per `AUDIT_METHODOLOGY.md` §16; (6) every PR self-reviews against `AUDIT_METHODOLOGY.md` §17 acceptance criteria (correctness + verification + scope discipline + process); (7) every register-literal value (severity, finding-count, gate-item-status) is copied from canonical source per `AUDIT_METHODOLOGY.md` §18, not re-derived in transit. The methodology stack is the durable enterprise asset. The 603 gaps are the surface; the methodology stack is the foundation.

**Stakeholder context** (anchors v2.0 commercial framing; off-repo specifics per CLAUDE.md §12 discipline):
- **Mount Sinai** co-development partner (CMO + CTO + research + commercial path); subawardee on ARPA-H grant per CLAUDE.md §12; relationship anchors academic credibility + research-tier features
- **BSW pilot active 2026-04-27** (DUA pending; pre-DUA-signature window aligns with HIPAA + Phase 0C gate-item remediation timing per §5); pilot is the first operational deployment surface and exercises the §16 clinical-code verification discipline against real patient data
- **4 ROI pathways**: Procedural / Device DRG Capture (cardiovascular intervention revenue capture via gap detection in CAD + SH + VHD); Specialty Pharmacy Retention (medication adherence + GDMT optimization in HF + EP); Avoided Admission / Readmission (HF decompensation prevention via GDMT pillar coverage); Risk Adjustment (HCC coding accuracy via diagnosis-evidence gap surfacing). Each pathway connects gap detection to revenue cycle / cost avoidance / risk capture mechanics health systems already measure.
- **Fundraise narrative** + AVAM Bordeaux investor positioning; technical diligence-readiness is downstream of methodology stack durability
- **Operator-side commitments** STAY operator-side per CLAUDE.md §12 off-repo discipline (no specific dates, deliverables, or stakeholder commitments surfaced in this plan document; the plan document is the in-repo strategic anchor, not the stakeholder communication surface)

---

## 2. Honest Current State (audit-baseline-incorporated)

The v2.0 strategic posture is grounded in a 7-PR audit closure arc executed across the 2026-05-19 to 2026-05-20 session window. Each PR closed a Phase 0 ledger item or codified a methodology-stack mechanism that future Phase 1 / Phase 2 execution depends on. Cumulatively, the arc produced the audit-baseline state v2.0 inherits: 136 register findings, 14 HIGH P1 GATE items aggregated across Phase 4 + Phase 5 + Phase 0C, an 8-entry stale-references checklist resolved via this v2.0 document, and 6 phase reports (Phase 1 + 2 + 3 + 4 + 5 + 0C) representing the full backend + UI/UX audit surface.

7-PR audit closure arc complete this session (2026-05-19 to 2026-05-20):

| PR | Closure | Verdict | Substantive output |
|---|---|---|---|
| #284 | §10.7 PARTIAL register close + diagnostic gitignore + DRIFT-42/43 | Operational | BUILD_STATE row 242 fix + 12 .gitignore patterns + 2 DRIFT codifications |
| #285 | Phase 0A Phase 4 Operational Maturity audit | CONDITIONAL PASS | 21 findings (3 HIGH P1 + 5 MED P2 + 6 LOW P3 + 6 INFO + 1 N/A); operational-monitoring gap cluster |
| #286 | Phase 4 methodology codification arc | Operational | 6 §17.1 entries (16-21) + DRIFT-44 + DRIFT-45 + AUDIT-087 |
| #287 | Ledger reconciliation AUDIT-016 PR-number references | Operational | 3 stale-ref fixes at L54 + L379 + L1700 |
| #288 | Phase 0A Phase 5 HIPAA compliance gap audit | CONDITIONAL PASS | 52 findings across 10 domains (2 HIGH P1 GATE + 5 MED P2 + 7 MED-DOC + sister) |
| #289 | Phase 0A Phase 0C UI/UX audit | CONDITIONAL PASS | 63 findings across 16 domains (8 HIGH P1 GATE candidate/confirmed + 16 MED P2 + sister) |
| #290 | Phase 0 implementation matrix verification | MATRIX VERIFIED CLEAN | 0 content deltas; 6/6 modules VALID; v2.0 authorship handoff bundle authored |

**Cumulative session-arc output:** 136 register findings authored; 14 HIGH P1 GATE items aggregated; 8-entry stale-references checklist resolved via this v2.0 document.

What this arc surfaced (beyond raw finding counts): the operational maturity gap cluster (Phase 4 4-ALR-01/02 + 4-APM-01) sits at the deployment-readiness layer, where ZERO operational CloudWatch alarms + ZERO SNS / PagerDuty routing + ZERO APM tooling means a production incident currently has no automated detection or notification surface. The HIPAA compliance gap cluster (Phase 5 5-ADM-09 + 5-BRC-06) sits at the BSW pilot dependency layer, where BAA execution + §164.410 BA-to-CE notification workflow gaps block the DUA execution that enables BSW real-patient data flow. The UI/UX gap cluster (Phase 0C 0C-A11Y-01 + 0C-CLI-01/02/03 + 0C-PERF-01/02 + 0C-TEST-01/02/03) sits at the v1.0 readiness layer, where WCAG 2.2 AA conformance + ACC/AHA Class/LOE display conventions + 12-calculator §16 verification + Web Vitals baseline + frontend test coverage all gate the enterprise-defensible UI/UX claim. The aggregation of 14 HIGH P1 GATE items is not a tactical to-do list; it is the structural readiness debt v1.0 must clear.

**Backend:** Phase 1 backend audit complete (CONDITIONAL PASS). AUDIT-001 P0 platform-wide test coverage gap (0.87%) OPEN; foundational dependency for PRODUCTION_GRADE tier-attainment per `AUDIT_METHODOLOGY.md` L318 ("PRODUCTION_GRADE ceiling currently zero across all audited modules because of platform-wide test coverage gap (AUDIT-001 P0). Until AUDIT-001 is closed, no gap can be PRODUCTION_GRADE.").

This is the single highest-impact dependency in the v2.0 plan. The PRODUCTION_GRADE tier represents the v1.0 quality bar. Until AUDIT-001 closes, every gap (across all 6 modules + all 3 tiers) carries a ceiling at TESTED_OK or DET_OK, not PRODUCTION_GRADE. The §5.3 placement decision (Phase 1 vs Phase 2) for AUDIT-001 is therefore one of the few operator decisions deferred in this plan; both placements are viable, the tradeoff is upstream gating (Phase 1: Tier A auth middleware to 80%+ gates production-readiness) versus downstream coverage breadth (Phase 2: Tier B services + routes coverage gates Tier 2 PRODUCTION_GRADE attainment).

**Matrix state at PR #290 HEAD `6b9b709`** (per `MATRIX_VERIFICATION_2026_05_20.md` §2):

| Module | Spec gaps | DET_OK | PARTIAL | SPEC_ONLY | Any-coverage | DET_OK rate |
|---|---:|---:|---:|---:|---:|---:|
| HF | 126 | 22 | 43 | 61 | 51.6% | 17.5% |
| EP | 89 | 21 | 26 | 42 | 52.8% | 23.6% |
| SH | 88 | 9 | 23 | 56 | 36.4% | 10.2% |
| CAD | 90 | 29 | 27 | 34 | 62.2% | 32.2% |
| VHD | 105 | 5 | 16 | 84 | 20.0% | 4.8% |
| PV | 105 | 16 | 14 | 75 | 28.6% | 15.2% |
| **TOTAL** | **603** | **102** | **149** | **352** | **41.6%** | **16.9%** |

PRODUCTION_GRADE rate: **0%** (gated by AUDIT-001 P0 closure).

Module-disparity interpretation: CAD leads at 62.2% any-coverage (29 DET_OK + 27 PARTIAL); VHD trails at 20.0% (5 DET_OK + 16 PARTIAL). The 42-point disparity between best-covered and worst-covered modules is real engineering debt against the Module Parity Principle (§13). Phase 1 + Phase 2 module-parity discipline (per §8 burnout-watch checkpoints + §13 operational rules) must converge these rates as Tier 1 + Tier 2 builds advance. Sequencing principle: parallel module advancement, gap-type batching across modules, rebalance toward lagging modules at every 2-week checkpoint per §13 operational rule 4.

**Phase 0B clinical content audit:** 6 per-module addenda complete (CAD + EP + HF + PV + SH + VHD per V.1.4 grep verification). Cross-module synthesis auto-generated. The Phase 0B arc materially completed across the 17-PR clinical-code verification arc (PRs #234-#249 per CLAUDE.md §8) and surfaced the §16 clinical-code verification standard as a codified methodology: every new RxNorm / LOINC / ICD-10 / SNOMED constant must be verified against an authoritative external source (RxNav `properties.json` for RxNorm, loinc.org / NLM Clinical Tables for LOINC, CMS ICD-10-CM 2024 for ICD-10), with codebase trust insufficient. The empirical wrong-code rate observed during Phase 0B (Cat A 15.5% wrong-drug, Cat D 33% inline-array, Batch 5 17.2% LOINC) anchors the §16 trigger threshold for v2.0 clinical-UI accuracy work at Phase 2 §6.1.

**Methodology stack codified:** 8 inline §17.1 architectural-precedent catalog entries (entries 14-21) + 13 design-refinement-note entries (entries 1-13) + 41 AGENT_DRIFT_REGISTRY entries. Mechanisms active: DRIFT-44 em-dash discipline + DRIFT-45 chat-side canonical-doc grep pre-flight.

The methodology stack is the v2.0 durable asset. Each PR in the 7-PR session arc contributed: PR #286 codified entries 16-21 + DRIFT-44 + DRIFT-45 + AUDIT-087; PR #288 + PR #289 sustained the §18 register-literal discipline (audit findings copied verbatim from canonical source); PR #290 codified the matrix-verification-as-input-to-strategic-document pattern. Future Phase 1 + Phase 2 PRs will continue to extend the catalog as new architectural precedents surface; the catalog is unbounded by design (per `AUDIT_METHODOLOGY.md` §17.1 codification posture).

**UI/UX:** Phase 0C audit CONDITIONAL PASS. 4 HIGH P1 GATE clusters (WCAG 2.2 AA + §16 PARTIAL-TRIGGER Class/LOE/risk-score + Web Vitals + frontend test coverage). 2 substantive engineering signal sections at Phase 0C §5.1 design token-conflict + §5.2 glassmorphism canonical visual treatment characterization.

The 2 substantive engineering signal sections are the v2.0 implementation roadmap inputs (per Phase 0C §11 forward-looking codification). §5.1 surfaces a token-conflict between `tokens.ts` (semantic tokens) and `semanticColors.ts` (competing exports); resolution requires a design-token-strategy decision codified to `docs/architecture/DESIGN_SYSTEM_SPEC.md`. §5.2 characterizes glassmorphism as the canonical visual treatment with 5-class module-color mapping, accessibility + performance discipline visible in current implementation; codification protects the canonical visual against future drift. Both sections route to Phase 2 §6.3 design system codification work.

---

## 3. Strategic Posture (codified)

**2026-05-03 extend-timeline-not-scope posture** (carry-forward from v1.2; operator codified):
- When audit findings force a choice between timeline and scope, extend timeline; do not reduce scope
- Module Parity Principle preserved (per §13)
- All Tier 1+2+3 gaps in scope (CX deferred per §13 revisit-at-v3.0)
- Research / registry backend in scope

This posture was originally codified in the 2026-05-03 operator session that surfaced the v1.2 baseline. The reasoning is anti-cargo-cult: a TAILRD platform shipped early but with module disparity or coverage gaps signals to a Mount Sinai CMO or HCA CIO that the team prioritized shipping over rigor. A TAILRD platform shipped on the audit-baseline-honest timeline with uniform module depth + closed gate items + verified clinical content signals the opposite. The commercial cost of the extended timeline (~3 weeks) is bounded; the commercial cost of a half-finished launch is not.

**2026-05-07 robust-over-consistent-with-existing posture** (codified during methodology PR #286):
- "We do it right; we don't cut time"
- Tech debt named via AUDIT entry not propagated; path-of-least-resistance framing is drift indicator (per DRIFT-33 + DRIFT-36 codification)

This posture extends the 2026-05-03 timeline-over-scope discipline to the per-PR execution layer. When a PR surfaces a tech-debt option (path-of-least-resistance: ship a workaround; robust path: file an AUDIT entry + plan remediation), the robust path is the default. DRIFT-33 + DRIFT-36 codify the "drift indicator" framing: any session where the operator catches a path-of-least-resistance suggestion is a methodology-stack input, not just a tactical correction.

**Capacity-vs-scope reconciliation (Q-V-C operator decision):** v1.2 L88 + L201 "solo + no tech debt + full 708 + 3-4 months" framing reconciles to 603-active reality.

**Operator decision (2026-05-20 codified during v2.0 authorship): Option (b) locked per "always the most robust Palantir enterprise approach" posture (2026-05-07 codification, reaffirmed 2026-05-20).** v2.0 execution adopts 603-active scope + extended timeline per AUDIT-028 work-mix discipline. Empirical multiplier from Phase 4 + Phase 5 + Phase 0C 25-40h-actual-vs-10-20h-budget pattern (~2-4x raw scope) applied to phase budgets. Suggested v1.0 target release ~2026-09-15 (~3 week extension from v1.2 baseline). Option (c) capacity-honesty addendum NOT adopted at this v2.0 layer; capacity disclosure is a separate stakeholder-disclosure question from the robustness call, and conflating the two would dilute the in-repo planning surface with off-repo communication framing.

Rationale: the v1.2 baseline assumed a raw-scope budget calculation. The empirical Phase 4 + Phase 5 + Phase 0C audit-execution pattern revealed a sustained ~2-4x actual-vs-budget multiplier when work mix includes both new authorship and concurrent register / methodology / canonical-pipeline maintenance. AUDIT-028 codified this as the work-mix discipline: raw scope (gap count) versus AI-assisted wall-clock (per-PR execution time) cannot be conflated without the multiplier. v2.0 budgets apply the multiplier explicitly at §5.5 + §6.5 + §7.4. The 603-active scope (down from 708) partially offsets the multiplier but does not fully absorb it, hence the ~3 week extension.

**Path B (depth) + Path A (tier-based UI polish) combined** (carry-forward from v1.2 §4):
- Path B is default: every gap properly implemented (detection logic + citations + calculator where applicable)
- Path A layers on top: T1 (90) bespoke UI surfaces + T2 (391) strong templated UI + T3 (122) catalog-tier surfaces
- **Parallel module advancement, not serial** (per §13 Module Parity Principle; anti-HF-first explicit per v1.2 §4 codification)

The Path B + Path A combination is not a sequential choice; both paths execute in parallel within each phase. Phase 1 advances Path B detection-logic verification for all T1 gaps across all 6 modules + Path A bespoke UI for the same 90 gaps. Phase 2 advances Path B verification for T2 + Path A templated UI for T2. Phase 3 advances Path B + Path A catalog-tier for T3. Anti-HF-first means the temptation to "polish HF first because that's where the deepest expertise sits" is rejected at the planning layer; all 6 modules advance in lockstep at each tier per §13 operational rules.

---

## 4. The Plan: Three Phases (audit-baseline-driven)

| Phase | Scope | v1.2 baseline | v2.0 audit-baseline-adjusted budget | Calendar weeks |
|---|---|---|---|---|
| Phase 1 | Production-readiness cluster + Tier 1 build | ~250-350h (v1.2 L90) | **~300-430h** (+50-80h gate-item cluster per §5) | Weeks 1-10 from Phase 0 exit (~2026-06 to ~2026-08) |
| Phase 2 | Tier 2 + UI/UX polish + clinical-UI accuracy cluster | ~600-900h (v1.2 L117) | **~700-1100h** (+100-200h gate-item cluster per §6) | Weeks 11-18 from Phase 0 exit (~2026-08 to ~2026-09) |
| Phase 3 | Tier 3 + Integration + Launch Readiness | ~150-300h (v1.2 L143) | ~150-300h (no gate-item additions) | Weeks 19-21 from Phase 0 exit (~2026-09) |

**Total v2.0 execution: ~21 weeks Phase 0 exit to v1.0 release. v1.0 target release ~2026-09-15.**

**Total v2.0 budget:** ~1,150-1,830h sister to v1.2 ~1,000-1,550h baseline + ~150-280h gate-item cluster overhead.

Phase boundaries are calendar checkpoints, not deliverable hard-cuts; a Phase 1 gap-item that slips by 3 days does not block Phase 2 kickoff if Phase 1 has otherwise hit success criteria. The §17.3 scope discipline mechanism gates re-scoping decisions (per `AUDIT_METHODOLOGY.md` §17.3 codification): scope drift surfaces at the §17.5 PR self-review, not during in-flight execution.

---

## 5. Phase 1 Detailed (production-readiness + Tier 1 build)

Phase 1 is the foundational phase. It clears the production-readiness gate-item cluster (operational maturity + pre-BSW-DUA-signature HIPAA cluster), builds the 90 T1 gaps to bespoke production-grade UI, and (per §5.3) places the AUDIT-001 P0 test coverage closure at either Phase 1 (Tier A) or Phase 2 (Tier B). Phase 1 success unblocks Phase 2 Tier 2 scale + Phase 0C cluster closure.

### 5.1 Gate-item remediation arc (~50-80h; pre-BSW-DUA-signature timing alignment for HIPAA gate items)

5 HIGH P1 GATE items routed to Phase 1 production-readiness cluster:

| Gate item | Source | Scope | Estimated effort | Timing |
|---|---|---|---|---|
| 4-ALR-01 | Phase 4 §3.3 | ZERO operational CloudWatch alarms; deploy 6 baseline alarms | ~3-4h | Pre-pilot data flow |
| 4-ALR-02 | Phase 4 §3.3 | ZERO SNS / PagerDuty routing; provision `tailrd-production-ops-alerts` SNS topic + wire AlarmActions | ~3-4h | Bundled with 4-ALR-01 (~17-25h cluster per Phase 4 §10.2) |
| 4-APM-01 | Phase 4 §4 | ZERO APM tooling; select APM (X-Ray + Application Signals recommended) + instrument Express + Prisma | ~6-10h baseline | Bundled with 4-ALR cluster |
| 5-ADM-09 | Phase 5 §4.2 | BAA execution gap (sub-vendor + customer-hospital surfaces) | ~2-4h operator-side + ~8-16h capability (v2.0) | **Pre-BSW-DUA-signature timing** |
| 5-BRC-06 | Phase 5 §4.7 | §164.410 BA-to-CE notification workflow gap | ~12-20h + ~4-8h CE-side design | **Pre-BSW-DUA-signature timing** |

**4-ALR-01 + 4-ALR-02 (operational alarms cluster):** the production environment currently has ZERO operational CloudWatch alarms wired to ZERO SNS / PagerDuty routing. A production incident has no automated detection surface. Phase 4 §3.3 codified the 6 baseline alarms (ECS service unhealthy task count, ALB 5xx rate, Aurora CPU + connections, ElastiCache CPU + connections) and the SNS topic provisioning + AlarmActions wiring. The ~17-25h cluster total includes alarm authoring + SNS topic + IAM + initial false-positive tuning. Pre-pilot data flow timing means this cluster closes before BSW patient data hits the production environment, so any incident from pilot load triggers automated detection.

**4-APM-01 (APM tooling):** the production environment has ZERO APM tooling. Phase 4 §4 surfaced X-Ray + Application Signals as the recommended baseline (AWS-native, integrates with existing IAM + CloudWatch surfaces, minimal vendor lock-in). The ~6-10h baseline covers the Express middleware + Prisma instrumentation + sample-rate tuning. Bundled with 4-ALR cluster because the operational alerting + APM tooling jointly cover the production-observability gap.

**5-ADM-09 (BAA execution gap):** Phase 5 §4.2 surfaced two BAA execution surfaces: sub-vendor BAAs (AWS, Sentry if adopted, any third-party where PHI flows) and customer-hospital BAAs (TAILRD as Business Associate to customer hospitals as Covered Entities). The operator-side effort (~2-4h) covers BAA template review + sub-vendor inventory. The v2.0 capability effort (~8-16h) covers in-platform BAA tracking surface + execution-state visibility for compliance auditing. Pre-BSW-DUA-signature timing because BSW DUA execution depends on TAILRD demonstrating BAA discipline.

**5-BRC-06 (§164.410 BA-to-CE notification workflow gap):** HIPAA Breach Notification Rule §164.410 requires Business Associates to notify Covered Entities of a breach within 60 days of discovery, with specific information requirements. Phase 5 §4.7 surfaced that TAILRD has no operational workflow for BA-to-CE notification: no template, no notification surface, no logging. The ~12-20h + ~4-8h covers notification workflow scaffolding + CE-side communication channel design. Pre-BSW-DUA-signature timing because the BSW DUA will reference §164.410 obligations and TAILRD must demonstrate readiness.

### 5.2 Tier 1 clinical build (~250-350h baseline per v1.2 L98)

Distribution across 6 modules (CX deferred):

| Module | T1 gaps |
|---|---:|
| HF | 29 |
| CAD | 18 |
| EP | 15 |
| SH | 13 |
| VHD | 8 |
| PV | 7 |
| **TOTAL** | **90** |

Sequencing principle: parallel module advancement per §13 Module Parity Principle. Gap-type batching across modules preferred over module-by-module serialization (sister to v1.2 §5 Phase 1 codification).

The parallel module advancement pattern in practice: a Phase 1 work week selects a gap-type cluster (e.g., GDMT pillar coverage gaps across HF + CAD + VHD where applicable), advances all gaps in that cluster across the relevant modules together, then moves to the next gap-type cluster. This batching mode produces shared UI components + shared test harnesses + shared citation patterns as first-class deliverables (per §13 operational rule 3), which enforce parity by construction rather than by retrospective audit. The alternative (module-by-module: ship all HF T1, then all CAD T1, ...) accumulates HF expertise + UI components without exercising them against other modules; the result is HF-first drift, which §13 explicitly rejects.

Per gap: verify detection logic + validate clinical content against guidelines + trial citations from `CLINICAL_KNOWLEDGE_BASE_v4.0.md` + implement / polish calculator + build bespoke UI surface + write tests. ~3-5h per T1 gap average.

The per-gap budget breakdown: ~30-45min detection-logic verification (read existing rule, verify against current guidelines, cite class + LOE); ~30-45min clinical content validation (verify guideline citations are current, cross-reference any related CV-04 mass-update Clinical Knowledge Base entries); ~45-60min calculator implementation or polish (where applicable; the 12 risk calculators in 0C-CLI-03 are exercised here); ~60-90min bespoke UI surface (per-gap workflow design, integration with shared components); ~30-45min tests (unit tests for detection rule + UI component tests + integration test coverage). The 5-hour upper bound accommodates gaps with §16 PARTIAL-TRIGGER status (clinical-code verification not yet complete), which add ~30-60min of verification overhead per code.

### 5.3 AUDIT-001 P0 placement decision (operator-side)

Foundational dependency for PRODUCTION_GRADE tier-attainment across all 603 rows. Phase 1 or Phase 2 placement is operator decision; v2.0 surfaces both options:

- **Phase 1 placement:** ~40-60h Tier A (auth middleware to 80%+); gates production-readiness verdict
- **Phase 2 placement:** ~80-120h Tier B (services + routes coverage); gates Tier 2 PRODUCTION_GRADE attainment

Phase 1 placement reasoning: auth middleware is the most-load-bearing surface for the platform's tenant-isolation discipline (CLAUDE.md §14 NEVER DO rules 6-8). Test coverage on auth middleware to 80%+ provides the highest per-hour security signal. Phase 1 placement makes production-readiness conditional on this coverage gate.

Phase 2 placement reasoning: Tier B coverage breadth (services + routes) is what unlocks PRODUCTION_GRADE attainment for individual gap rules. Phase 1 placement gates production-readiness but does not unlock PRODUCTION_GRADE; Phase 2 placement unlocks PRODUCTION_GRADE for Tier 2 work but defers the production-readiness gate to Phase 1 with auth-middleware-only coverage.

The decision is operator-side because it trades off security-surface depth-first (Phase 1) against PRODUCTION_GRADE breadth-first (Phase 2). v2.0 does not pre-commit; the decision is captured at Phase 1 kickoff in a separate operator session.

### 5.4 Phase 1 success criteria

- All 5 Phase 1-sequenced HIGH P1 GATE items remediated to RESOLVED status per §18 register-literal (4-ALR-01 + 4-ALR-02 + 4-APM-01 + 5-ADM-09 + 5-BRC-06)
- All 90 T1 gaps production-grade with bespoke UI + validated calculators (distributed across all 6 modules per Module Parity)
- AUDIT-001 P0 placement decision implemented (Tier A if Phase 1 placement; placeholder if Phase 2 placement)
- Pre-BSW-DUA-signature gate items closed (5-ADM-09 + 5-BRC-06; enables BSW DUA execution)
- Module parity verified at Phase 1 exit: no single module materially more polished at T1 than any other (drift > 2 days triggers rebalance per §13)

Per-criterion verification: gate items verified via §18 register-literal status transitions (OPEN -> IN_PROGRESS -> FIXED -> VERIFIED) in `AUDIT_FINDINGS_REGISTER.md`; T1 gaps verified via per-module matrix recount + UI surface review + calculator §16 verification status; AUDIT-001 placement verified via coverage tooling output (jest --coverage threshold gates); BSW DUA enablement verified via BSW DUA signature event (off-repo); Module Parity verified via per-module T1-complete count delta < 2-day rebalance threshold.

### 5.5 Phase 1 budget

**~300-430h total** (~250-350h Tier 1 build per v1.2 baseline + ~50-80h gate-item cluster). Calendar weeks: Weeks 1-10 from Phase 0 exit (~2026-06 to ~2026-08).

Budget math: 250-350h base × 1.0 (v1.2 baseline carry-forward; gap-type batching efficiency offsets the AUDIT-028 multiplier at the per-gap level) + 50-80h gate-item cluster (4-ALR cluster ~17-25h + 4-APM-01 ~6-10h + 5-ADM-09 ~10-20h + 5-BRC-06 ~16-28h). Upper bound 430h accommodates AUDIT-028 multiplier on gate-item cluster (which has high concurrent register / methodology work-mix). The ~10 week calendar window accommodates 60-70h/week max effort per §8 + 2-week burnout-watch checkpoints + module parity rebalancing cycles.

---

## 6. Phase 2 Detailed (Tier 2 + UI/UX polish + clinical-UI accuracy)

Phase 2 is the heaviest phase. It closes the 9 Phase 0C HIGH P1 GATE items (the UI/UX + clinical-UI accuracy cluster), builds the 391 T2 gaps to templated production-grade UI across all 6 modules, and codifies the design system spec at `docs/architecture/DESIGN_SYSTEM_SPEC.md`. Phase 2 success establishes the enterprise-defensible UI/UX claim that v1.0 requires.

### 6.1 Phase 0C HIGH P1 GATE cluster closure (~100-200h)

9 HIGH P1 GATE items routed to Phase 2:

| Gate item | Source | Scope | Estimated effort |
|---|---|---|---|
| 0C-A11Y-01 | Phase 0C §3.1 + §4.1 | WCAG 2.2 AA conformance baseline + remediation arc | ~4-6h baseline + ~40-80h remediation |
| 0C-CLI-01 | Phase 0C §3.2 + §4.2 (§16 TRIGGERED) | ACC/AHA Class display conventions across `therapyGap/` surfaces + RecommendationBadge codification | ~6-10h audit + ~4-6h codification |
| 0C-CLI-02 | Phase 0C §3.2 + §4.2 (§16 TRIGGERED) | ACC/AHA LOE display (bundled with 0C-CLI-01) | Bundled |
| 0C-CLI-03 | Phase 0C §3.2 + §4.2 (§16 TRIGGERED) | 12 risk calculator §16 verification arc (CHA2DS2VASc / HASBLED / MAGGIC / GRACE / TIMI / SYNTAX / STS / WIfI / Framingham / INTERMACS / Wells / ORBIT) | ~12-18h (~1-1.5h per calculator) |
| 0C-PERF-01 | Phase 0C §3.3 + §4.3 | Web Vitals baseline (Lighthouse-CI + web-vitals + perf budget JSON) | ~6-10h infrastructure + ~4-6h measurement |
| 0C-PERF-02 | Phase 0C §3.3 + §4.3 | RUM instrumentation (Sentry recommended; unified error + performance + RUM) | ~6-10h |
| 0C-TEST-01 | Phase 0C §3.4 + §4.4 | Frontend unit test coverage baseline (Jest + RTL) | ~60-100h substantial |
| 0C-TEST-02 | Phase 0C §3.4 + §4.4 | Integration / component test patterns | Bundled with 0C-TEST-01 |
| 0C-TEST-03 | Phase 0C §3.4 + §4.4 | E2E test coverage (Playwright recommended) | ~15-25h baseline |

**0C-A11Y-01 (WCAG 2.2 AA conformance):** Phase 0C §3.1 + §4.1 surfaced the absence of a WCAG 2.2 AA conformance baseline. The ~4-6h baseline covers axe-core integration + initial scan + finding triage. The ~40-80h remediation arc covers the substantive accessibility work surfaced by the baseline scan (color contrast, focus management, keyboard navigation, screen reader semantics across the glassmorphism component library). WCAG 2.2 AA conformance is the de facto enterprise accessibility bar for healthcare SaaS.

**0C-CLI-01 + 02 + 03 (clinical-UI accuracy §16 PARTIAL-TRIGGER cluster):** Phase 0C §3.2 + §4.2 triggered §16 clinical-code verification scope at the UI display layer. The three items cover three surfaces: (01) ACC/AHA Class display conventions (Class I vs Class IIa vs Class IIb vs Class III nomenclature + ordering + visual treatment across `therapyGap/` components), (02) ACC/AHA LOE display (LOE A vs B-R vs B-NR vs C-LD vs C-EO nomenclature; bundled with 01 because the display surfaces are co-located), (03) the 12 risk calculator §16 verification arc (each calculator verified against its primary publication + cross-referenced against MDCalc / UpToDate / current ACC/AHA/ESC guideline citation). The 12-calculator arc is the largest single Phase 0C subscope at ~12-18h.

**0C-PERF-01 + 02 (performance observability):** Phase 0C §3.3 + §4.3 surfaced the absence of Web Vitals tracking + RUM instrumentation. 0C-PERF-01 establishes the Lighthouse-CI + web-vitals + perf budget JSON baseline (CI-side measurement). 0C-PERF-02 adds RUM (real user monitoring; Sentry recommended for unified error + performance + RUM surface). Together they close the performance observability gap that gates v1.0 enterprise-defensibility.

**0C-TEST-01 + 02 + 03 (frontend test coverage):** the largest Phase 0C subscope at ~60-100h substantial work. 0C-TEST-01 + 02 cover Jest + RTL unit + component test patterns; 0C-TEST-03 covers E2E coverage via Playwright. Sister to AUDIT-001 P0 backend test coverage closure (per §5.3); together they establish full-stack test coverage as a v1.0 success criterion. The 60-100h range reflects the substantive coverage authoring; Tier 1 + Tier 2 build PRs (per §5.2 + §6.2) author per-gap tests as they ship, so 0C-TEST-01 covers the shared component + pattern surface that those per-gap tests build on.

### 6.2 Tier 2 clinical build (~600-900h baseline per v1.2 L117)

Distribution across 6 modules (CX deferred):

| Module | T2 gaps |
|---|---:|
| PV | 82 |
| VHD | 72 |
| HF | 62 |
| EP | 62 |
| SH | 58 |
| CAD | 55 |
| **TOTAL** | **391** |

Same parallel module advancement principle per §13. Templated UI pattern per gap-type (alert / recommendation / educational / safety) means T2 work batches across modules by UI pattern. Pattern library accumulates across the phase (sister to v1.2 §5 codification).

The templated UI pattern strategy: T2 gaps cluster by UI surface type. Alert pattern (urgent + dismissible + audit-logged; e.g., QTc safety alerts in EP, drug-drug interaction alerts across all modules). Recommendation pattern (deferred + actionable + workflow-integrated; e.g., GDMT pillar gaps in HF, statin optimization gaps in CAD). Educational pattern (informational + non-dismissible; e.g., guideline-update notifications, screening-window reminders). Safety pattern (high-severity + acknowledgment-required + logged; e.g., contraindication alerts, dose-adjustment requirements). Each pattern has a shared component implementation + shared test harness + shared a11y treatment. T2 build advances by pattern-cluster across all 6 modules together.

Per gap: detection logic verified + citations validated + templated UI applied + sample tests per pattern. ~1.5-2.5h per T2 gap.

The per-gap budget is lower than T1 (~3-5h) because the templated UI pattern is reused. Per-gap effort breakdown: ~20-30min detection-logic verification + citation validation; ~30-45min templated UI application (pattern selection + content + integration); ~20-30min tests (against shared test harness; per-gap test data + edge case coverage). Upper bound 2.5h accommodates §16 PARTIAL-TRIGGER overhead + per-gap citation depth where guideline cross-reference is non-trivial.

### 6.3 Design system codification (per Phase 0C §5.1 + §5.2)

Substantive engineering signal sections from Phase 0C audit:
- §5.1 design system token-conflict resolution (`tokens.ts` + `semanticColors.ts` competing exports); §17.1 design-token-strategy promoted to codification target via separate methodology PR per §17.3
- §5.2 glassmorphism canonical visual treatment characterization (5-class module-color mapping; accessibility + performance discipline visible)

Design system spec authoring: `docs/architecture/DESIGN_SYSTEM_SPEC.md` (~20-30h forward-looking documentation; see Phase 0C §11 v2.0 implementation roadmap implications).

The DESIGN_SYSTEM_SPEC.md scope: (1) token strategy decision codified (semantic tokens vs raw color tokens; export discipline; consumer-side patterns); (2) glassmorphism canonical visual treatment spec (5-class module-color mapping locked; accessibility checklist per class; performance budget per class); (3) component library inventory + per-component design contract (a11y treatment + responsive treatment + state matrix + storybook reference); (4) pattern library inventory (the 4 T2 UI patterns codified with reference implementations); (5) anti-pattern catalog (visual treatments that drift from canonical glassmorphism + how they get caught at PR review). The spec is the durable design-system asset; future module work (research view, registry view, post-v1.0 features) builds on it.

### 6.4 Phase 2 success criteria

- All 9 Phase 0C HIGH P1 GATE items remediated to RESOLVED status per §18 register-literal
- All 391 T2 gaps functional with templated UI + citations (distributed across all 6 modules per Module Parity)
- WCAG 2.2 AA conformance verified (sister 0C-A11Y-01 closure)
- Web Vitals baseline established (sister 0C-PERF-01 + 02 closure)
- Frontend test coverage threshold attained (sister 0C-TEST-01 + 02 + 03 closure)
- §16 PARTIAL-TRIGGER clinical-UI accuracy verification complete (sister 0C-CLI-01 + 02 + 03 closure)
- DESIGN_SYSTEM_SPEC.md authored + applied across all 6 modules
- Module parity verified at Phase 2 exit: no single module materially more polished at T2 than any other

Per-criterion verification: gate items verified via §18 register-literal lifecycle; T2 gaps verified via per-module matrix recount + UI surface review against the 4 pattern surfaces; a11y verified via axe-core CI gate + manual screen reader spot-check; perf verified via Lighthouse-CI gate + RUM data; frontend test coverage verified via jest --coverage threshold + Playwright pass; §16 clinical-UI verified via per-calculator + per-Class/LOE verification log; DESIGN_SYSTEM_SPEC.md verified via spec PR + per-component spec-conformance audit.

### 6.5 Phase 2 budget

**~700-1100h total** (~600-900h Tier 2 build per v1.2 baseline + ~100-200h gate-item cluster). Calendar weeks: Weeks 11-18 from Phase 0 exit (~2026-08 to ~2026-09).

Budget math: 600-900h base × ~1.0 (v1.2 baseline carry-forward; templated UI efficiency partially offsets AUDIT-028 multiplier; 391 T2 gaps at ~1.5-2.5h = 586-977h, rounded to baseline range) + 100-200h gate-item cluster (0C-A11Y-01 ~44-86h + 0C-CLI cluster ~22-34h + 0C-PERF cluster ~16-26h + 0C-TEST cluster ~75-125h, total ~157-271h; some bundled hours absorbed into the gate-item-cluster overhead column). The ~8 week calendar window is tight; if 0C-TEST-01 lands at the upper bound (100h substantial coverage authoring) or 0C-A11Y-01 remediation lands at the upper bound (80h), Phase 2 will compress into the ~9-10 week range and squeeze Phase 3. Module parity discipline is the firewall against compression-driven drift.

---

## 7. Phase 3 Detailed (Tier 3 + Integration + Launch Readiness)

Phase 3 is the launch readiness phase. It builds the 122 T3 gaps to catalog-tier surfaces, executes the integration + load + pen-test arc, polishes documentation, and prepares the canonical 20-minute demo across all 6 active modules. Phase 3 is the lightest phase by budget but the highest leverage per hour because it converts the prior 18 weeks of build work into release readiness.

### 7.1 Tier 3 clinical build (~105-175h per v1.2 L145)

Distribution across 6 modules (CX deferred):

| Module | T3 gaps |
|---|---:|
| HF | 35 |
| VHD | 25 |
| SH | 17 |
| CAD | 17 |
| PV | 16 |
| EP | 12 |
| **TOTAL** | **122** |

Same parallel module advancement principle. Detection logic + citations + catalog surface across all 6 modules. Lighter UI investment (catalog tier).

Per-gap T3 budget: ~0.5-1.5h. Catalog-tier means the gap surfaces as a row in the module catalog view (sortable + filterable + drill-down to detail view) rather than a bespoke or templated workflow surface. Detection logic still ships + citations still validate + tests still cover, but the UI authoring effort is bounded by the shared catalog component. T3 gaps are not low-quality; they are appropriately-tiered for their clinical frequency + workflow weight.

### 7.2 Integration + polish (per v1.2 L160-L166)

- End-to-end integration testing (Playwright suite expanded from Phase 2 baseline; full cross-module workflow coverage)
- Cross-module workflow validation (e.g., HF patient with EP arrhythmia + CAD intervention history; gap detection across modules; cross-referral surfaces work)
- Performance load testing (synthetic load profile + scaling verification; Aurora Serverless v2 ACU scaling + ECS task scaling + ElastiCache hit-rate)
- Security pen-test (single contractor engagement per §9 cash strategy; ~$3-5K; ~1-2 week engagement scope)
- Documentation polish (architecture docs + API docs + deployment docs + runbooks all current per §11 success criteria)
- Demo flow design (canonical 20-minute demo across all 6 active modules + service line + research, runnable solo)

The pen-test contractor engagement is the single material cash outlay across the v2.0 execution arc per §9. The contractor scope is bounded: external + authenticated + multi-tenant boundary testing, with explicit exclusion of FDA SaMD-classification surfaces (per CLAUDE.md §8 ECG AI pipeline disclaimer). The ~1-2 week engagement produces a pen-test report routed into AUDIT_FINDINGS_REGISTER per §18 register-literal discipline; any findings sequence into Phase 3 remediation or carry-forward to v3.0 per severity.

### 7.3 Phase 3 success criteria

- All 122 T3 gaps complete (distributed across all 6 modules per Module Parity)
- Integration + load + pen-test verification complete
- Documentation polish complete (sister §11 documentation success criterion)
- Platform v1.0 ready (sister §11 master success criteria checklist)

Per-criterion verification: T3 gaps verified via per-module matrix final-state + catalog surface review; integration verified via Playwright suite pass; load verified via synthetic load profile execution + scaling-event log review; pen-test verified via contractor report + register-routed findings closure; documentation verified via per-doc currency review; v1.0 readiness verified via §11 master checklist (80%+ checked, per §11 threshold).

### 7.4 Phase 3 budget

**~150-300h total** (no gate-item cluster additions; sister v1.2 baseline). Calendar weeks: Weeks 19-21 from Phase 0 exit (~2026-09).

Budget math: 105-175h T3 build (122 gaps × 0.5-1.5h) + 30-50h integration + load + pen-test execution + 10-20h documentation polish + 5-10h demo flow design + 0-45h margin for pen-test remediation. The ~3 week calendar window is tight but appropriate; if pen-test findings require material remediation, Phase 3 absorbs by extending ~1 week, pushing v1.0 release to ~2026-09-22. The §17.3 scope-discipline mechanism gates any scope-creep ask at this phase boundary.

---

## 8. Pacing + Operational Discipline (v1.2 §6 carry-forward + audit-baseline lessons)

Operating posture: max effort 60-70h/week + full attention (v1.2 §6 carry-forward).

This pacing is not a stretch target; it is the empirical sustainable rate observed across the prior session arcs. Higher rates (sustained 80-90h/week) compress the burnout-watch flag surface and degrade quality (per v1.2 §6 codification). Lower rates (sustained 40-50h/week) extend the calendar significantly and miss the v1.0 release target; the operator-locked option (b) timeline of ~21 weeks Phase 0 exit to v1.0 assumes 60-70h/week sustained.

**Burnout-watch checkpoints every 2 weeks** (sister v1.2 §6):
- Sleep quality, energy, quality (bug/rework rate), mood, physical (spinal) flagged as 5-flag watch
- 2+ flags fire: 3-day reset (plan absorbs)
- 3+ flags fire: 1-week reset + sequence review

The 5-flag burnout-watch is the operational firewall against quality degradation. The 2-flag / 3-flag reset thresholds are pre-codified so that the operator does not relitigate them in-flight. Plan absorption means the v2.0 calendar contains built-in slack for 1-2 burnout resets across the 21-week arc; the +3-week extension over v1.2 baseline includes this margin.

**Spinal surgery contingency:** plan absorbs 2-3 week recovery window; pre-surgery scope freeze + post-surgery mechanical resumption + documentation-only work during recovery (sister v1.2 §6).

The spinal contingency is operationally pre-staged: pre-surgery (1-2 days before) executes a scope freeze (no in-flight PRs, register-status snapshot, last-known-working state captured); post-surgery week 1 is documentation-only work (no code authoring; register reads + plan updates only); post-surgery week 2-3 is mechanical resumption (low-cognitive-load code work: stale-ref fixes, register reconciliation, methodology entries). Net 2-3 week productivity hit absorbs into the ~3-week extension margin.

**Module parity discipline:** at each 2-week burnout-watch checkpoint, verify module parity. ~2-day drift triggers next-cycle rebalancing toward lagging modules (sister v1.2 §6 + §11).

Module parity is the technical firewall against the HF-first drift pattern. The 2-day rebalance threshold is empirically chosen: tighter (1-day) would create execution thrash; looser (5-day) would allow material disparity to accumulate before correction. The 2-week checkpoint cadence aligns with the burnout-watch cadence so both disciplines exercise on the same cycle.

**AUDIT-028 work-mix discipline (NEW for v2.0):** raw scope vs AI-assisted wall-clock disambiguation. Empirical multiplier from Phase 4 + Phase 5 + Phase 0C 25-40h-actual-vs-10-20h-budget pattern (~2-4x raw scope) applied to v2.0 budget estimates. Sister to AUDIT-028 codification.

AUDIT-028 is the methodology-stack entry that codifies the work-mix multiplier discovery. The pattern observed: Phase 4 budget ~10-20h; Phase 4 actual ~25-30h (1.5-2x). Phase 5 budget ~10-20h; Phase 5 actual ~30-35h (2-3x). Phase 0C budget ~10-20h; Phase 0C actual ~35-40h (2-4x). The escalating multiplier reflects increasing audit-execution depth + concurrent methodology-codification + canonical-pipeline-maintenance work mix. v2.0 budgets at §5.5 + §6.5 + §7.4 apply the multiplier to the gate-item cluster portion (where work mix mirrors the audit pattern) but not to the Tier 1 + Tier 2 + Tier 3 build portion (where work mix is more execution-focused and the v1.2 baseline budget already accommodates).

---

## 9. Cash Strategy (v1.2 §7 carry-forward)

- $0 for clinical / backend / UI work (solo execution baseline)
- $3-5K for security pen-test contractor in Phase 3 (specialized expertise + single engagement)
- $0-5K for clinical guideline / reference subscription (UpToDate / MDCalc API if needed)
- **Total: $5-10K**

Preserves cash position. Fundraising round (per §1 stakeholder context) unlocks flexibility for unexpected needs.

The $5-10K total is bounded specifically because the operator-side commitment is solo execution + revenue-first posture (per user-memory). Material outlays would re-trigger the capacity-vs-scope reconciliation per §3; the current option (b) lock assumes the bounded outlay and would re-open if circumstances changed.

---

## 10. Risks Named (v1.2 §8 carry-forward + new risks from audit baseline)

| # | Risk | Status |
|---|---|---|
| 1 | Scope creep | Carry-forward; phase boundaries control via §17.3 scope discipline |
| 2 | Phase 0B reveals scope larger than capacity | Audit complete; matrix verified clean at 603 active; capacity reconciliation per §3 Q-V-C option (b) lock |
| 3 | Mid-stream pressure (Sinai + AVAM + fundraising demos) | Carry-forward; new asks queue for Phase 2 module work |
| 4 | Spinal surgery during execution | Carry-forward; plan absorbs 2-3 week pause |
| 5 | BSW scoping more comprehensive than current build | Audit confirms working hypothesis (41.6% any-coverage); v2.0 reflects |
| **6 (NEW)** | Gate-item remediation timeline slippage | Pre-BSW-DUA timing alignment for 5-ADM-09 + 5-BRC-06; slippage delays BSW data flow |
| **7 (NEW)** | PRODUCTION_GRADE tier-attainment gated by AUDIT-001 P0 closure | Sister §5.3 placement decision; v1.0 success criterion conditional |
| **8 (NEW)** | Clinical-UI accuracy §16 trigger scope | 0C-CLI-01 + 02 + 03 verification arc; 12-calculator §16 verification + Class/LOE display audit; ~22-34h Phase 2 cluster |

**Risk 1 (scope creep):** the durable §17.3 scope-discipline mechanism (codified in `AUDIT_METHODOLOGY.md`) catches scope-creep at PR self-review time. The mechanism activates when a PR surfaces work beyond its stated scope; the operator can accept the expansion (filed as register entry) or reject (deferred to follow-up PR). The mechanism does not prevent in-flight discovery; it prevents silent scope expansion.

**Risk 2 (scope larger than capacity):** the Phase 0B audit arc + Phase 0 matrix verification surfaced the 603-active reality, replacing the v1.2 708 framing. The Q-V-C option (b) lock at §3 reconciles capacity to extended timeline rather than to reduced scope. Risk re-fires if Phase 1 + Phase 2 execution surfaces additional capacity gaps; the v3.0 authorship checkpoint at end-of-Phase-1 absorbs.

**Risk 3 (mid-stream pressure):** Mount Sinai + AVAM + fundraising-round demo asks may arrive during Phase 1 + Phase 2 execution. The carry-forward discipline: new asks queue for Phase 2 module work where they overlap (e.g., AVAM technical-diligence demo overlaps Phase 2 T2 build surface); asks that don't overlap defer to v3.0. The risk is asks that look strategic in the moment but pull module-parity off-balance.

**Risk 4 (spinal surgery):** sister §8 spinal contingency plan. Plan absorbs 2-3 week recovery window. Risk re-fires if surgery occurs at a Phase 1 -> Phase 2 boundary where freeze-state captures partial Phase 1 (rebalance discipline catches at recovery week 2).

**Risk 5 (BSW comprehensive scoping):** Phase 0B audit confirms the working hypothesis: 41.6% any-coverage at PR #290 means BSW pilot data flow may exercise gaps without detection logic. Mitigation: pilot scoping at BSW DUA signature aligns to current any-coverage state + Phase 1 T1 build sequencing prioritizes BSW-pilot-data-overlap surfaces.

**Risk 6 (NEW) gate-item slippage:** the pre-BSW-DUA-signature timing alignment for 5-ADM-09 + 5-BRC-06 is the critical-path constraint. Slippage past BSW DUA signature would block real-patient data flow into the production environment, blocking pilot operationalization. Phase 1 §5.1 sequences these items as Phase 1 cluster items rather than later-Phase items specifically to absorb the timing alignment.

**Risk 7 (NEW) AUDIT-001 P0 dependency:** the §11 success-criterion conditional on PRODUCTION_GRADE tier-attainment is gated by AUDIT-001 closure. If AUDIT-001 closure slips into Phase 3 or later, the v1.0 success criterion is conditional. The §5.3 placement decision (Phase 1 vs Phase 2) determines the earliest closure timing.

**Risk 8 (NEW) §16 clinical-UI accuracy:** the Phase 0C 0C-CLI-01 + 02 + 03 cluster triggered §16 verification scope at the UI display layer. The 12-calculator verification arc is the largest single sub-scope; if §16 verification surfaces material discrepancies (consistent with Phase 0B empirical 15-33% wrong-code rates), remediation expands beyond the ~22-34h cluster budget. Phase 2 §6.5 budget upper bound (1100h) accommodates this expansion.

---

## 11. Success Criteria (reconciled to 603-active + 14-gate-closure + PRODUCTION_GRADE-tier framing)

End of v2.0 execution, platform is robust if:

- [ ] All 7 backend audit phases COMPLETE per PASS or CONDITIONAL PASS with documented remediation (Phase 1 + 2 + 3 + 4 + 5 done; Phase 6 + 7 DEFERRED per CLAUDE.md §13-equivalent operator decisions)
- [ ] **AUDIT-001 P0 Tier A + Tier B complete; project-wide coverage > 70%** (PRODUCTION_GRADE tier-attainment dependency per `AUDIT_METHODOLOGY.md` L318)
- [ ] AUDIT-002 reduced to < 50 ESLint warnings
- [ ] AUDIT-003 reduced to 0 in production code paths (scripts excepted)
- [ ] **All 603 active gaps with documented audit verdict per gap** (reconciled from v1.2 L217 708 framing; CX deferred to v3.0 revisit)
- [ ] **All 14 HIGH P1 GATE items remediated to OPEN -> RESOLVED status per §18 register-literal** (5 Phase 1 + 9 Phase 2 cluster per §5 + §6 sequencing)
- [ ] **PRODUCTION_GRADE tier-attainment capability** (gated by AUDIT-001 P0 closure per L318 codification)
- [ ] All 90 T1 gaps production-grade with bespoke UI + validated calculators (distributed across all 6 modules)
- [ ] All 391 T2 gaps functional with templated UI + citations (distributed across all 6 modules)
- [ ] All 122 T3 gaps detection-coded + catalog-surfaced + cited (distributed across all 6 modules)
- [ ] No single module materially more polished than any other (Module Parity verified at audit)
- [ ] **All 6 active modules with documented UI/UX audit verdict of PASS** (CX in deferred-modules section pending v3.0 revisit)
- [ ] **WCAG 2.2 AA conformance verified** (sister 0C-A11Y-01 closure)
- [ ] **Web Vitals baseline established + RUM instrumented** (sister 0C-PERF-01 + 02 closure)
- [ ] **Frontend test coverage threshold attained** (sister 0C-TEST-01 + 02 + 03 closure)
- [ ] **§16 PARTIAL-TRIGGER clinical-UI accuracy verification complete** (sister 0C-CLI-01 + 02 + 03 closure)
- [ ] Service line + research views: documented user workflows verified + polished
- [ ] Operational maturity: APM live (sister 4-APM-01 closure) + runbook coverage 100% + alerting tested (sister 4-ALR-01 + 02 closure)
- [ ] HIPAA gap analysis: no P0 findings + P1 findings documented with active remediation (sister Phase 5 + 5-ADM-09 + 5-BRC-06 closure)
- [ ] Tech debt register: zero P0 + <=2 HIGH (with explicit deferral rationale)
- [ ] Demo flow: documented 20-minute canonical demo across all 6 active modules + service line + research, runnable solo
- [ ] Documentation: architecture docs + API docs + deployment docs + runbooks all current
- [ ] **CX-deferred-revisit-at-v3.0 codified** (per 2026-05-03 operator decision; CX in deferred-modules section)

If 80%+ of these check, robust achieved. If not, plan failed and that is information for v3.0.

The 80% threshold is deliberately not 100%. v1.0 is a release checkpoint, not a perfection checkpoint; some criteria may carry partial-closure status with documented deferral to v1.1 or later. The 80% threshold + the explicit "plan failed -> v3.0 input" framing makes the success criteria a forecasting instrument rather than a pass/fail gate.

---

## 12. Document Discipline (v1.2 §10 carry-forward; v3.0 + v4.0 + v5.0 timing reconciled per Q-V-C)

- **v3.0** at end-of-Phase-1 checkpoint (~end of week 10 from Phase 0 exit; ~2026-08); based on Phase 1 completion + gate-item closure verification; Tier 2 sequencing locked
- **v4.0** at end-of-Phase-2 checkpoint (~end of week 18 from Phase 0 exit; ~2026-09); final stretch plan
- **v5.0** at platform v1.0 release (~end of week 21 from Phase 0 exit; ~2026-09-15); post-launch reflection + Phase 6 / 7 sequencing

Every revision: separate PR. Document is source of truth. CX-revisit at v3.0 per §13.

The revision-discipline rationale: each major version (v3.0, v4.0, v5.0) corresponds to a phase boundary checkpoint where the prior phase has shipped its deliverables + the next phase plan locks. Inline edits between major versions are scoped (typo fixes + stale-reference corrections + clarifications); substantive plan changes require version bump + separate PR. This discipline mirrors the audit register lifecycle (per §18) and protects the document from in-flight drift while preserving the structured-checkpoint surface for stakeholder communication.

---

## 13. Module Parity Principle (v1.2 §11 carry-forward; CX-as-7th-module reconciled to CX-deferred)

The TAILRD platform's clinical credibility depends on uniform depth across all 6 active modules. A platform that demos exceptionally well in Heart Failure and falls flat in Peripheral Vascular signals "team has expertise in HF, not PV." A platform that demos uniformly across all 6 signals "team has built a true cardiovascular intelligence platform." The latter is the v1.0 target.

**Operational rules during execution** (sister v1.2 §11):

1. No phase is complete until all 6 active modules are at parity for that phase's tier
2. When work is queued, gap-type batching across modules is preferred over module-by-module serialization
3. Shared UI patterns + shared test harnesses are first-class deliverables (enforce parity by construction)
4. At every checkpoint, audit module parity explicitly. Any drift > 2 days triggers rebalancing in next cycle
5. The instinct to "polish HF more" or "wait, PV does not need that" is a known anti-pattern. The plan explicitly rejects both.

**Cross-module / Disparities / Safety (CX) deferred per 2026-05-03 operator decision.** Revisit at v3.0. CX 105 gaps remain in `CLINICAL_KNOWLEDGE_BASE_v4.0.md` spec but absent from canonical/ matrix (CX-stripped per `MATRIX_VERIFICATION_2026_05_20.md` §6). v3.0 authorship revisits CX scope decision based on Phase 1 completion state + capacity-vs-scope reality at that checkpoint.

The CX deferral rationale: CX gaps are cross-module by nature (e.g., a HF + EP + CAD multi-module disparity surface), and operationalizing them at v1.0 would require Module Parity discipline across the 6 active modules + a 7th cross-module synthesis layer. The 2026-05-03 operator decision deferred CX to preserve the focused 6-module execution surface for v1.0. v3.0 revisits with two data points unavailable at v2.0 authorship: actual Phase 1 completion velocity, and actual Module Parity discipline empirical strength. v3.0 may rejoin CX to v1.0 surface, may sequence CX into v1.1, or may permanently de-scope; the decision is data-driven at the v3.0 checkpoint.

---

## 14. Cross-References

**Audit framework + methodology:**
- `docs/audit/AUDIT_FRAMEWORK.md` - 7-phase backend audit framework
- `docs/audit/AUDIT_METHODOLOGY.md` - methodology stack (§1 + §16 + §17 + §17.1 + §17.3 + §17.5 + §18 + §9.2); 8 inline §17.1 architectural-precedent catalog entries + 13 design-refinement-note entries
- `docs/audit/AGENT_DRIFT_REGISTRY.md` - 41 DRIFT entries; DRIFT-44 + DRIFT-45 mechanisms active

**Audit findings + state:**
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` - 136 register findings; 14 HIGH P1 GATE items + AUDIT-001 P0
- `docs/audit/MATRIX_VERIFICATION_2026_05_20.md` - v2.0 authorship handoff bundle (this document's primary input; matrix-verified-clean 6/6 modules VALID at PR #290 HEAD)
- `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` - auto-generated; 6-module classification distribution
- `docs/audit/PHASE_0B_<MODULE>_AUDIT_ADDENDUM.md` - 6 per-module addenda (CAD + EP + HF + PV + SH + VHD)
- `docs/audit/PHASE_1_REPORT.md` + `PHASE_2_REPORT.md` + `PHASE_3_REPORT.md` + `PHASE_4_REPORT.md` + `PHASE_5_REPORT.md` + `PHASE_0C_REPORT.md` - 6 phase reports (Phase 1 + 2 + 3 backend audits + Phase 4 operational maturity + Phase 5 HIPAA + Phase 0C UI/UX)

**Clinical content + state:**
- `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` - 1,307-line spec source for 603-row matrix; canonical source of truth for gap-rule clinical content + guideline citations

**Operational state:**
- `BUILD_STATE.md` - current-state aggregate ledger; section §10.7 audit closure surfaces, section §15 Phase 0 ledger
- `CLAUDE.md` - operational + architectural + clinical-context state; §1 (6-module Project Overview) + §8 (Clinical Context + FDA CDS exemption) + §12 (Key Contacts + off-repo discipline) + §14 (NEVER DO clinical safety rules) + §18 (Phase 2 Operating Rules)

**Historical:**
- `docs/PATH_TO_ROBUST_v1.2_ARCHIVE.md` - v1.2 historical state (preserved per canonical-naming-discipline; 180 lines)
- `docs/CHANGE_RECORD_2026_04_29_day10_aurora_cutover.md` - Day 10 Aurora cutover record

---

## 15. v2.0 Document Header Metadata Summary

- **Title:** TAILRD PATH TO ROBUST v2.0
- **Version:** v2.0 (supersedes v1.2)
- **Date:** 2026-05-20
- **Status:** ACTIVE
- **Audit-baseline-incorporated:** PR #284 + #285 + #286 + #287 + #288 + #289 + #290 (7-PR session arc; 11 of 12 Phase 0 ledger items COMPLETE; v2.0 PR merge fires Phase 0 EXIT closing 12th of 12 items)
- **Reconciliation summary:**
  - 9 stale-708-references corrected to 603-active framing (per `MATRIX_VERIFICATION_2026_05_20.md` §6 + V.1.11 surface)
  - CX deferral codified (revisit-at-v3.0; 2026-05-03 operator decision)
  - Capacity-vs-scope framing per §3 Q-V-C operator decision LOCKED at option (b): 603-active + extended timeline per AUDIT-028 work-mix discipline
  - 14 HIGH P1 GATE items sequenced into Phase 1 + Phase 2 per §5 + §6
  - AUDIT-001 P0 PRODUCTION_GRADE-ceiling dependency named per §11
  - v1.2 metadata mismatch corrected (v1.2 L1 title said "v1.1" + L5 said "v1.2 ACTIVE"; v2.0 metadata consistent throughout)

---

*End of v2.0. Phase 0 EXIT fires at v2.0 PR merge.*
