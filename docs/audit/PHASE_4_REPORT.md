# Phase 4 Report - Operational Maturity Audit

**Phase:** 4 of 7 (Phase 0A continuation)
**Dimension:** Operational maturity. Observability, runbook coverage, alerting, APM + database operational debt, three-plane separation, per-tenant configurability, LLM-call policy, plugin surface, OpenMed Pattern 2 gap-detection-vs-recommendation-emit gating.
**Executed:** 2026-05-19
**Auditor:** jhart
**Framework:** `docs/audit/AUDIT_FRAMEWORK.md` v1.0; methodology stack §1, §16 (PARTIAL; conditional on clinical-code surface, not triggered this phase), §17, §17.1, §18 per `docs/audit/AUDIT_METHODOLOGY.md`
**Companion docs:** `docs/audit/AUDIT_FINDINGS_REGISTER.md`, `docs/audit/PHASE_3_REPORT.md`, `docs/PATH_TO_ROBUST.md`

---

## 1. Executive summary

**Verdict: PASS** (post-remediation 2026-05-28; original 2026-05-19 audit CONDITIONAL PASS, conditioned solely on the 3 HIGH P1 gate items, now all RESOLVED).

Derived from §10 register-severity table per §18 status-surface discipline. 3 HIGH P1 gate items (4-ALR-01 ZERO operational CloudWatch alarms, 4-ALR-02 ZERO SNS/PagerDuty routing, 4-APM-01 ZERO APM tooling) existed at the 2026-05-19 audit with documented remediation roadmap in §10.2. Phase originally passed pending those remediations. Sister to Phase 1/2/3 CONDITIONAL PASS precedent. Post-remediation update 2026-05-28: all 3 HIGH P1 gate items RESOLVED via PR #309 (4-ALR-01) + #310 (4-ALR-02) + #311 (4-APM-01); the conditional basis is satisfied and the phase verdict advances to PASS. Non-gate MEDIUM P2 / LOW P3 findings remain on the opportunistic-remediation roadmap in §10.2 and do not gate the phase verdict.

**Phase 4 scope = UNION of three sources** per 2026-05-19 operator robust-posture decision:
- Source A (`PATH_TO_ROBUST.md` v1.2 L60): observability gaps, runbook coverage, alerting completeness
- Source B (`PHASE_3_REPORT.md` §6): AUDIT-078 backup/IaC integration, APM gap, connection-pool + Aurora ACU calibration
- Source C (operator/userMemories): three-plane separation, per-tenant configurability, LLM-call inventory, plugin surface review, OpenMed Pattern 2 (approval-token gating for gap-finding to clinical-recommendation split)

**Scope-vs-budget delta:** `PATH_TO_ROBUST.md` v1.2 L60 budgets ~10h. Phase 4 actual ~25-40h (Source C dimensions absent from v1.2 L60 scope). v1.2 L60 update deferred to v2.0 PATH_TO_ROBUST authorship as Phase 0 exit deliverable (named in §10.3).

**Findings recorded this phase: 21 new register entries** (3 HIGH P1, 5 MEDIUM P2, 6 LOW P3, 6 INFO, 1 N/A policy-aligned). Full register-severity table at §10.1.

**Highest-visibility finding: 4-ALR-01 + 4-ALR-02 + 4-APM-01 cluster** (Pattern A in §9.1, "operational-monitoring cluster"). ZERO operational alerting and ZERO APM tooling together produce a "logs-only observability" stance. Status: production runs with audit-log persistence and Winston structured logging, but no operational alarms on ECS task failure, Aurora ACU saturation, ALB 5xx rate, or audit-log write failure; no metrics emission; no traces; no dashboards.

**Verdict-rubric per B.1 decision (3):**
- PASS: zero gate-class findings; all operational-maturity dimensions meet Palantir-grade bar
- CONDITIONAL PASS: gate-class findings exist with documented remediation roadmap; phase passes pending those remediations
- FAIL: HIGH P1 findings concentrated above remediation-tolerable density; phase blocks downstream phases

3 HIGH P1 gate items + remediation roadmap in §10.2 originally yielded **CONDITIONAL PASS** (2026-05-19). Post-remediation 2026-05-28: all 3 gate items RESOLVED (PR #309/#310/#311), conditional basis satisfied, verdict advances to **PASS**.

---

## 2. Methodology

**Scope:**

- `backend/src/` (110 source files; logger, middleware, routes, services, ingestion)
- `backend/prisma/schema.prisma` (2,553 LOC, 54 models) for per-tenant configurability surface
- `infrastructure/` (CloudFormation, scripts, IAM policies, Lambdas) for AWS-side alerting + IaC observability
- `docs/runbooks/` + `docs/*RUNBOOK*.md` + `backend/docs/incident-runbooks.md` (12 runbook files total)
- `CLAUDE.md` for LLM policy alignment + tech-debt cross-references
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` for AUDIT-078 / AUDIT-079 / AUDIT-003 cross-references
- `docs/PATH_TO_ROBUST.md` v1.2 for Phase 4 scope reconciliation

**Out of scope (deferred to other phases / v2.0):**
- Live AWS resource configuration deep dive (cross-ref AUDIT-078 closure arc)
- HIPAA gap analysis cross-walk (Phase 5)
- Threat-model coverage (Phase 7)
- Frontend `src/` operational observability
- Fine-grained per-tenant clinical-rule configuration design (v2.0 carry-forward; §10.3)
- Approval-token gating strict-mode codification (v2.0 carry-forward; §10.3)

**Audit ordering rationale:** Source A foundation dimensions first (observability + runbook + alerting are universally applicable), then Source B AUDIT-078-adjacent operational debt, then Source C architectural-pattern dimensions (three-plane + tenant config + LLM + plugin + OMP2). Mirrors Phase 3 §2 area-ordering convention.

**Tools used:** ripgrep via Grep tool, `schema.prisma` manual inspection at B.2.6b secondary scan, register cross-reference reads. All evidence cited as `file:line` per §1 rule-body verification.

**Methodology anchor reinforcement:** Phase 4 PR self-review at §17.5 applied. §17.3 scope discipline preserved (5 §17.1 architectural-precedent candidates flagged in §9.2 for SEPARATE methodology PR; not bundled here). §18 status-surface discipline applied to §10 verdict table (mirrors register severity verbatim; no re-derivation at verdict-table layer).

---

## 3. Source A consolidated findings - Observability + Runbook coverage + Alerting completeness

### 3.1 Observability (B.2.1)

**Logging infrastructure (state of play).** `backend/src/utils/logger.ts` (254 LOC) ships a Winston-based shared logger with PHI-scrubbing built in (logger.ts:14-50 `excludeSensitiveData` format strips 20 sensitive fields including ssn / dob / mrn / firstName / lastName). Three file transports: `logs/error.log`, `logs/combined.log`, `logs/audit.log` (HIPAA-tagged, 50-file rotation). CloudWatch transport is conditional on `process.env.AWS_CLOUDWATCH_GROUP` (logger.ts:113-127) and uses a try/catch swallow on missing `winston-cloudwatch` package. 46 files import the canonical logger; 476 `logger.*` calls across 55 files.

**Findings.**

**4-OBS-01 - Correlation/trace-ID propagation gap.** No middleware injection of request correlation IDs across `backend/src/middleware/`. The only `requestId` usage is in `backend/src/routes/dataRequests.ts:106,170,205,208,220,227,258,268` and refers to PatientDataRequest entity IDs (HIPAA data-access workflow), not request correlation. No tracing context propagated from route handlers into downstream service calls or Prisma queries. Severity: MEDIUM (P2). Remediation roadmap: add `requestId` generator middleware in `server.ts`, propagate via `AsyncLocalStorage` to logger metadata. Effort: S (2-4h).

**4-OBS-02 - Logger configuration hygiene (CloudWatch silent-swallow + helpers ZERO adoption).** Two related gaps consolidated. (a) `backend/src/utils/logger.ts:113-127` CloudWatch transport silently swallows missing `winston-cloudwatch` via try/catch. Production logger silently degrades to file-only if package missing; only side effect is a `console.warn`. Operator has no signal that the production CloudWatch stream is not receiving. (b) `logAPI` / `logRedox` / `logAudit` helpers defined at logger.ts:128-218 are imported by ZERO files (verified via `grep import { ?logAPI`). Helpers are dead code; raw `logger.info` predominates. Severity: LOW (P3). Remediation: validate `winston-cloudwatch` at boot in production; adopt helpers in route+webhook code or remove. Effort: S (2-3h combined).

**Cross-reference (not a new finding).** Console.* leakage: 72 hits across 10 files (server.ts:16, redox/terminologyValidator.ts:1, redox/batchGapDetection.ts:7, lib/__tests__/prismaTenantGuardSymbolSurvival.test.ts:3, utils/logger.ts:1, lib/redis.ts:5, middleware/phiEncryption.ts:1, middleware/analytics.ts:5, scripts/ingestSynthea.ts:32, services/mfaService.ts:1). CLAUDE.md §14 prohibits PHI in console output and AUDIT-003 catalogs 69 in production code at filing time. The 3-call delta is small. Tracking under AUDIT-003 HIGH P1 (not promoted to new Phase 4 row). Sprint C-9 work block per CLAUDE.md §14 exception list closes the @ts-nocheck pair which intersects this finding.

### 3.2 Runbook coverage (B.2.2)

**State of play.** 12 runbooks split across 3 locations:
- `docs/` top-level (8): `MIGRATION_VALIDATION_RUNBOOK.md`, `RDS_LOGICAL_REPL_ENABLEMENT_RUNBOOK.md`, `SECRET_ROTATION_RUNBOOK.md`, `DAY_9_TUESDAY_RUNBOOK.md`, `DAY_9_SYNTHEA_SEED_RUNBOOK.md`, `DAY_10_WEDNESDAY_RUNBOOK.md`, `DAY_11_THURSDAY_RUNBOOK.md`, `HEALTH_SYSTEM_ONBOARDING_RUNBOOK.md`
- `docs/runbooks/` canonical (4): `AUDIT_022_PRODUCTION_RUNBOOK.md`, `AUDIT_071_HOSPITAL_EHR_ISSUER_REGISTRATION.md`, `AUDIT_078_AURORA_BACKUP_RESTORE_RUNBOOK.md`, `AUDIT_016_PR_3_MIGRATION_RUNBOOK.md`
- `backend/docs/incident-runbooks.md` (1, separate split)

**Findings.**

**4-RNB-01 - Split-location runbook hierarchy.** Three runbook locations with no canonical convention. `docs/runbooks/` aligns with AUDIT-NNN naming pattern; `docs/*RUNBOOK*.md` mixes operational onboarding (HEALTH_SYSTEM_ONBOARDING) with point-in-time day-N runbooks; `backend/docs/incident-runbooks.md` predates either pattern. Severity: LOW (P3). Remediation: codify `docs/runbooks/` as canonical; relocate or cross-reference the other 8. Effort: XS (~1h).

**4-RNB-02 - Missing incident-response runbook.** No `docs/runbooks/INCIDENT_*.md` (verified `Glob: docs/runbooks/INCIDENT*` returns empty). No 5xx surge runbook, no auth-failure-storm runbook, no PHI breach response runbook. `backend/docs/incident-runbooks.md` is broader prose, not actionable per-incident-class step-by-step. Severity: MEDIUM (P2). Remediation: author 3 incident-class runbooks at `docs/runbooks/INCIDENT_{5XX_SURGE,AUTH_STORM,PHI_BREACH}.md`. Effort: M (~4-6h).

**Cross-reference (not a new finding).** No DR runbook. `Glob: docs/runbooks/DR_*` empty. AUDIT-078 §6 + AUDIT-078 §6.5 deferral covers the Aurora restore-test execution operator-side; restore RTO measurement remains operator-side per `AUDIT_078_AURORA_BACKUP_RESTORE_RUNBOOK.md` §5 sister-cadence. Cross-region failover runbook not in scope until cross-region replication lands. Tracking under AUDIT-078.

**4-RNB-04 - Day-N runbook lifecycle.** `DAY_9_TUESDAY_RUNBOOK.md`, `DAY_9_SYNTHEA_SEED_RUNBOOK.md`, `DAY_10_WEDNESDAY_RUNBOOK.md`, `DAY_11_THURSDAY_RUNBOOK.md` are point-in-time Aurora-cutover-arc runbooks not maintained beyond their execution window. They retain referential value for incident-archaeology but pollute the runbook surface for new operators. Severity: LOW (P3). Remediation: move to `docs/archive/runbooks/` or delete after cross-referencing CHANGE_RECORD docs. Effort: XS (~30min).

### 3.3 Alerting completeness (B.2.3)

**State of play.** `Grep AlarmActions|MetricAlarm|CloudWatchAlarm` across `infrastructure/` returned 2 files. Closer inspection:
- `infrastructure/cloudformation/waf-cloudtrail.yaml:308,323,338,353` defines 4 CloudWatch alarms: unauthorized AWS API calls, root account use, security group modifications, IAM policy modifications. **Security-event alerts, not operational alerts.**
- `infrastructure/lambdas/dmsRollback/index.js` references SNS for DMS rollback automation (one-off; not an operational alerting surface).

`Grep SNSTopic|sns:Publish|AWS::SNS::|TopicArn` across `infrastructure/` returned only the dmsRollback Lambda. No PagerDuty / OpsGenie / VictorOps integrations found.

Backend "alert/alarm" hits (41 files) are clinical-alert surfaces (`alertService.ts`, `clinicalAlertService.ts`, gap-rule alerts, real-time hospital alerts) - patient-care alerts, not operational alerting.

**Findings.**

**4-ALR-01 - ZERO operational CloudWatch alarms.** Security-event alarms exist (waf-cloudtrail.yaml); operational alarms do not. No alarms on ECS task failure / unhealthy task count, Aurora ACU saturation / CPU / connection count, ALB target 5xx rate / unhealthy host count, audit-log write failure / disk pressure. Severity: HIGH (P1). Remediation: deploy `infrastructure/cloudformation/operational-alarms.yml` covering 6 baseline metric alarms (ECS unhealthy task count, Aurora CPU > 80%, Aurora CPU > 95% paging, ALB target 5xx > 5%, ALB unhealthy host > 0, audit-log write-failure events > 0). Effort: M (~4-6h). **Phase 4 gate.**

**4-ALR-02 - ZERO SNS/PagerDuty/OpsGenie routing.** Alarms in waf-cloudtrail.yaml exist but no `AlarmActions` route them anywhere. ECS task failure produces no notification. Aurora ACU saturation produces no notification. Audit-log write failure produces no notification. Operations relies on manual `aws cloudwatch describe-alarms` checks or no observability at all. Severity: HIGH (P1). Remediation: provision SNS topic `tailrd-production-ops-alerts`, subscribe operator email + PagerDuty/OpsGenie, wire AlarmActions across all operational alarms (including the waf-cloudtrail.yaml security alarms that currently lack actions). Effort: S-M (~3-5h). **Phase 4 gate.**

**4-ALR-03 - "Alert" terminology overload.** `backend/src/services/alertService.ts` + `clinicalAlertService.ts` reference clinical alerts (Alert model in schema.prisma:475-520). Backend grep on `alert|alarm` returns 41 false positives for operational-alerting audit. Documentation-discipline finding: glossary needs explicit distinction between clinical-alerts (patient-care notifications routed via Alert model + cdsHooks emit chain) and operational-alerts (infrastructure-state notifications routed via SNS). Severity: INFO. Remediation: glossary entry in `CLAUDE.md` §17 ECS deployment runbook section or `docs/runbooks/README.md`. Effort: XS (~30min).

---

## 4. Source B findings - APM + AUDIT-078 closure + connection-pool/ACU

**State of play.** `Grep datadog|newrelic|@sentry|elastic-apm|opentelemetry|otel|x-ray|xray` across `backend/` returned NO matches. Zero APM tooling of any kind. AUDIT-078 (Production Aurora backup config not in IaC; restore procedure untested) is IN PROGRESS at register L1289 with Phase C SHIPPED 2026-05-08 + production-side `modify-db-cluster` apply executed + verified; flips RESOLVED at PR #265 merge. AUDIT-079 (`connection_limit` not explicit in DATABASE_URL nor Prisma client) is OPEN at register L1319 with LOW P3 hygiene severity. Aurora ACU config is codified for staging (`infrastructure/cloudformation/tailrd-staging.yml`) but not for production (per AUDIT-078 design note §6 deferral).

**Findings.**

**4-APM-01 - ZERO APM tooling.** No application-performance monitoring of any kind. No request-latency histograms, no dependency-call tracing, no error-rate aggregation beyond audit-log emission. CLAUDE.md tech-debt #7 (cited via PHASE_3_REPORT §6 L210) anchors APM as Phase 4 scope; this finding promotes the gap from tech-debt-register to register-row with HIGH P1 severity matching its observed scale impact. Severity: HIGH (P1). Remediation: select APM (Datadog APM, New Relic, Sentry Performance, or AWS X-Ray + CloudWatch Application Signals) + instrument Express + Prisma. Recommend X-Ray + Application Signals for AWS-native low-cost baseline; recommend Datadog APM if richer dependency dashboards needed. Effort: M (~6-10h baseline; L for full dashboards). **Phase 4 gate.**

**4-APM-02 - Aurora ACU calibration not codified for production.** Production Aurora ServerlessV2 0.5-4 ACU config lives in AWS console state, not in `infrastructure/cloudformation/`. `tailrd-staging.yml` codifies staging ACU; production cluster was provisioned out-of-band per AUDIT-078 §"Evidence" L1297. Cross-references AUDIT-078 §6 + §6.5 CFN-import deferral (AUDIT-XXX-future-aurora-cfn-import). Severity: LOW (P3). Remediation: bundles with AUDIT-078 CFN-import follow-up; no separate work block needed. Effort: bundled.

**Cross-references (not new findings).** AUDIT-078 IN PROGRESS Phase C SHIPPED + production-side modify-db-cluster executed + post-apply verification BackupRetentionPeriod=35 + DeletionProtection=true confirmed; restore-test execution + RTO measurement remain operator-side per `AUDIT_078_AURORA_BACKUP_RESTORE_RUNBOOK.md` §5. AUDIT-079 OPEN LOW P3 hygiene; revisit at multi-Fargate-task scale per register L1323.

---

## 5. Three-plane separation findings

**State of play.** `Grep control[_\- ]plane|data[_\- ]plane|management[_\- ]plane` across the repository returned NO matches. No three-plane discipline of any kind. Implicit boundaries observable in code structure: data plane = `backend/src/services/` + `backend/src/ingestion/` + Prisma reads, control plane (implicit) = `backend/src/routes/admin.ts` + `routes/godView.ts` + `routes/internalOps.ts`, management plane (implicit) = `infrastructure/cloudformation/` + `infrastructure/scripts/` + manual AWS console operations.

**Findings.**

**4-3PL-01 - No explicit plane separation.** Routes organized by clinical-module concern, not by plane. No code-level annotation distinguishing control-plane endpoints from data-plane endpoints. New operators have no signal which endpoints affect tenant administration vs patient-data flow. Severity: INFO (architectural observation; not a remediation target at current pilot scale). Remediation: deferred to v2.0 architectural decision (§10.3). Effort: XL (architectural; deferred).

**4-3PL-02 - Admin / godView / internalOps share ALB + auth surface with data-plane routes.** `backend/src/routes/admin.ts` (1,337 LOC per AUDIT-005), `routes/godView.ts`, `routes/internalOps.ts` mounted under same `authenticateToken` middleware as patient-data routes. Single ALB target group, single API surface, single ECS task role. Defense-in-depth gap: control-plane breach attack surface equals data-plane attack surface. Sister-pattern to AUDIT-005 god-files (which catalogs the LOC concentration) + AUDIT-076/AUDIT-077 tenant-isolation gaps. Severity: MEDIUM (P2). Remediation: separate ALB listener for `/api/admin/**` + `/api/internalOps/**` + `/api/godView/**` with stricter rate-limit + IP allowlist (already partially implemented per IPAllowlist model at schema.prisma:2391); document as v2.0 architectural carry-forward for full network-segmentation work. Effort: M (~6-10h baseline; XL for full segmentation).

**4-3PL-03 - No IAM role separation per plane.** `infrastructure/iam-policies/app-role-policy.json` + `app-role-policy-production.json` define a single ECS task role granting read+write across all resources. No read-only role for analytics/reporting workloads, no admin-elevated role for control-plane operations. Severity: INFO (architectural observation; not a remediation target at current scale). Remediation: deferred to v2.0 architectural decision (§10.3). Effort: L (architectural; deferred).

**§17.1 candidate precedent flagged for SEPARATE methodology PR per §17.3:** Three-plane-discipline-absence rationale codification. (See §9.2.)

---

## 6. Per-tenant configurability findings

**State of play (post B.2.6b schema scan).** Verdict updated from B.2 inventory ZERO to **PARTIAL**. `backend/prisma/schema.prisma:15-115` Hospital model carries per-tenant configuration:
- L38-43: 6 module-subscription Booleans (`moduleHeartFailure`, `moduleElectrophysiology`, `moduleStructuralHeart`, `moduleCoronaryIntervention`, `modulePeripheralVascular`, `moduleValvularDisease`) - coarse-grained feature flags per tenant
- L46-50: `subscriptionTier` enum, `subscriptionStart`, `subscriptionEnd`, `subscriptionActive`, `maxUsers` - tier-gated capacity
- L32-35: Redox EHR integration config (sourceId, destinationId, webhookUrl, isActive)
- L132-145 (HospitalEhrIssuer model): per-hospital EHR JWT issuer mapping (AUDIT-071)

Schema-wide grep for `tenant.config|hospital.config|featureFlag|featureToggle|tenantSettings|hospitalSettings|tenant.override|hospital.override|HospitalConfig` returned only 3 backend files (`routes/onboarding.ts`, `routes/admin.ts`, `ai/modelRegistry.ts`); no Hospital-scoped JSON-settings column found. `TermGapValueSet.labThresholds Json @default("[]")` at schema.prisma:2348 is global terminology, not per-tenant. `User.notificationPreferences Json` at schema.prisma:189 is per-user, not per-hospital.

**Findings.**

**4-TEN-01 - Coarse-only per-tenant config.** Schema-level per-tenant config exists (6 module Booleans + subscription fields + maxUsers + Redox config + EHR issuer mapping). No fine-grained per-hospital clinical-rule configurability surface. Severity: INFO (architectural observation; current pilot scale operates within coarse-only constraint). Remediation: deferred to v2.0 architectural decision (§10.3). Effort: XL (architectural; deferred).

**4-TEN-02 - No per-hospital gap-rule threshold overrides.** `backend/src/ingestion/gaps/gapRuleEngine.ts` consumes global thresholds across all tenants. Representative example: LVEF HFrEF threshold hardcoded at gapRuleEngine.ts:81 ("Threshold: LVEF <= 40% per 2022 AHA/ACC/HFSA HF Guideline") and gapRuleEngine.ts:87 (`return lvef <= 40 ? 'hfref' : 'not_hfref'`). Every hospital sees the same guideline-default thresholds. No mechanism for a hospital to override (e.g., research-grade Mount Sinai institution wanting stricter LVEF cutoff for a study cohort, or a community hospital wanting a slightly looser threshold during pilot). Severity: MEDIUM (P2). Remediation: introduce `HospitalRuleOverride` model (or extend Hospital model with `ruleOverrides Json?`) + threshold lookup at rule-evaluation time; design doc + 4-8h implementation. Effort: L (~12-20h including tests + per-rule audit + admin UI). v2.0 carry-forward candidate.

**4-TEN-03 - No per-hospital rule enable/disable mechanism.** Every hospital sees every gap rule that fires; no opt-out. Some hospitals may want certain gap classes silenced (e.g., a structural-heart-only practice opting out of all peripheral-vascular gaps). Severity: MEDIUM (P2). Remediation: extend Hospital model with `disabledRuleIds String[]` or join-table `HospitalDisabledRule`; rule-engine consults at evaluation time. Effort: M (~6-10h). v2.0 carry-forward candidate.

**4-TEN-04 - No per-hospital alert routing configuration.** `backend/src/services/emailService.ts` + `alertService.ts` route notifications via global config. `User.notificationPreferences Json` at schema.prisma:189 is per-user, not per-hospital. No per-hospital escalation paths, no per-hospital alert email recipients (e.g., a hospital's care team distribution list), no per-hospital alert threshold (frequency, severity floor). Severity: LOW (P3). Remediation: Hospital model extension or new `HospitalAlertRouting` model; defer until first pilot demand. Effort: M (~4-6h).

**§17.1 candidate precedent flagged for SEPARATE methodology PR per §17.3:** Coarse-only-per-tenant-config-positioning rationale codification. (See §9.2.)

---

## 7. LLM-call policy + Plugin surface findings

### 7.1 LLM-call policy (B.2.7)

**State of play (NULL inventory).** `Grep from ['"](@?anthropic|openai|@google/generative-ai|cohere|@xai|@mistralai)` across the repository returned NO matches. No cloud-LLM SDK imports of any kind. The only "claude" hit in `backend/src` is a CLAUDE.md cross-reference comment at `backend/src/services/ecgAIService.ts:11` (`"CLAUDE.md §8 explicitly prohibits activation"`). ECG AI pipeline (`backend/src/ai/`) is local model inference (ecgInferencePipeline.ts, modelRegistry.ts, ecgPreprocessor.ts, ecgPostprocessor.ts) gated off in production per CLAUDE.md §8 FDA-clearance requirement.

**Finding.**

**4-LLM-01 - LLM-call policy documentation (state aligned).** Per CLAUDE.md §8: "Never use ML/AI for gap detection. All gap rules must be deterministic, rule-based, and transparent." Codebase state aligns with policy: zero LLM call sites. Per B.2 decision (1): convert this dimension from "inventory finding" to "policy documentation finding." Severity: N/A (policy-aligned). Status: DOCUMENTED. Remediation: none; ongoing policy audit at any PR adding an `anthropic|openai` SDK import should trigger automatic CLAUDE.md §8 violation flag. Effort: none. **Cross-reference for future enforcement:** consider adding `package.json` dependency-validator CI check that fails on `anthropic|openai|cohere|@xai|@mistralai` package addition without explicit waiver comment + operator approval.

### 7.2 Plugin surface (B.2.8)

**State of play (NULL inventory).** `Grep plugin|extension[_\- ]point|registerPlugin|loadPlugin|pluginRegistry|hookRegistry` across `backend/src` returned NO matches. No plugin architecture of any kind. Backend is monolithic Express; new modules added by adding new route files + new gap rules to `gapRuleEngine.ts`; new clinical content added by extending `cardiovascularValuesets.ts` + corresponding gap rule blocks. Extension surface = source-code modification only.

**Finding.**

**4-PLG-01 - No plugin architecture (architectural observation).** Monolithic Express; no extension-point pattern, no third-party plugin loader, no hook registry. Severity: INFO (architectural observation; current scale operates within monolithic-only constraint). Rationale: deterministic-rule + monolithic + tightly-coupled was the right call at current scale (sister to 4-3PL-01 + 4-TEN-01 + 4-OMP-01 cluster per §9.1 Pattern B). Remediation: deferred to v2.0 architectural decision (§10.3). Effort: XL (architectural; deferred).

**§17.1 candidate precedent flagged for SEPARATE methodology PR per §17.3:** No-plugin-architecture rationale codification. (See §9.2.)

---

## 8. OpenMed Pattern 2 - approval-token gating for gap-finding to clinical-recommendation split

**State of play (PARTIAL per B.2 decision (2)).** `backend/src/ingestion/gaps/gapRuleEngine.ts` is a single 11,673-LOC file with 263 `gaps.push` call sites. Representative sites: gapRuleEngine.ts:3314, 3347, 3385 (three `gaps.push` sites within ~70 lines showing tight-coupling pattern; each pushes a gap object with `recommendation` field inline). Downstream emit surface: `backend/src/routes/cdsHooks.ts` (344 LOC; 7 files match `cdsHooks|cds-hooks|cdsCard|cardCreate`). Emit pattern at `cdsHooks.ts:185` (`return res.json({ cards })`), `:257` (`cards.push({...})`), `:271` (final card return). No intermediate approval-token gating found via `Grep approval[_\- ]token|approvalToken|approveRecommendation|clinicianApproval|gateRecommendation` (NO matches).

**Architectural framing.** CLAUDE.md §8 mandates dismissal-at-consumption: "the clinician always makes the final decision and can dismiss any gap with a documented reason." This is the operator-confirmed effective Pattern 2 implementation for deterministic detection: gap fires → automatic recommendation generation with `evidence` + class/LOE → clinician sees recommendation → clinician approves (acts) or dismisses (with documented reason). The "approval gate" exists, but at the consumption layer (UI dismissal with reason) rather than at the emit layer (approval-token gating between gap-detection and recommendation-emit).

**Findings.**

**4-OMP-01 - Gap-finding and clinical-recommendation emit tightly coupled.** Single 11,673-LOC file holds 263 `gaps.push` call sites with inline recommendations. CLAUDE.md §8 dismissal-at-consumption framing is effective Pattern 2 for deterministic detection per operator confirmation at B.2 decision (2). Severity: INFO (architectural; framing is correct for current deterministic-detection regime). Remediation: none required at current architecture; v2.0 carry-forward if regime changes (ML-augmented detection or FDA SaMD reclassification of dismissal-at-consumption). Effort: none. Sister to 4-PLG-01 + 4-3PL-01 + 4-TEN-01 architectural-observation cluster.

**4-OMP-02 - No intermediate approval-token gate between detection and CDS Hooks emit.** Detection-to-emit chain (`gapRuleEngine.ts` → `routes/cdsHooks.ts:185,257` → `routes/modules.ts` dashboards → frontend) has no token-based intermediate gate. Recommendations flow directly from rule body to clinician-visible surface. Per B.2 decision (2): strict-mode approval-token codification deferred to v2.0. Severity: LOW (P3) per architectural pattern (operator-confirmed dismissal-at-consumption is effective; strict-mode is the upgrade path, not a current gap). Remediation: design doc for v2.0 if regime changes; no current work block needed. Effort: deferred.

**§17.1 candidate precedent flagged for SEPARATE methodology PR per §17.3:** Dismissal-at-consumption-as-effective-Pattern-2 codification (pairs with 14th/15th-entry canonical-primitive architectural-precedent series). (See §9.2.)

---

## 9. Cross-cutting observations

### 9.1 Pattern-level findings

**Pattern A - Operational-monitoring cluster (4-OBS-01 + 4-ALR-01 + 4-ALR-02 + 4-APM-01).** These four findings are not independent dimensions; they form a single operational-instrumentation maturity gap. Trace-ID propagation gap (4-OBS-01 MED P2) + ZERO operational alarms (4-ALR-01 HIGH P1) + ZERO SNS/PagerDuty routing (4-ALR-02 HIGH P1) + ZERO APM (4-APM-01 HIGH P1) together produce a "logs-only observability" stance: structured JSON logs are written to S3 (combined.log + audit.log + error.log) but no observer is watching, no histogram is computed, no alarm is fired, no on-call is paged. Remediation should be designed as a single sprint (~20-30h combined) rather than split per-finding. v2.0 PATH_TO_ROBUST authorship should sequence this sprint as one of the first post-Phase-4 work blocks given its concentration of HIGH P1 gate items.

**Pattern B - Extension-surface absence cluster (4-3PL + 4-TEN-02/03/04 + 4-PLG + 4-OMP-02).** No three-plane separation (4-3PL-01 INFO + 4-3PL-02 MED P2 + 4-3PL-03 INFO) + no fine-grained per-tenant config (4-TEN-02 + 4-TEN-03 MED P2 + 4-TEN-04 LOW P3) + no plugin architecture (4-PLG-01 INFO) + no approval-token gating (4-OMP-02 LOW P3) = a coherent architectural-pattern cluster. All five surfaces share the same architectural rationale: deterministic-rule + monolithic + tightly-coupled was the right call at current pilot scale. The architectural decision point arrives when this rationale breaks: multi-hospital production scale + per-tenant clinical-rule customization demand + third-party CDS Hooks consumer maturity + regulatory shift requiring pre-emit clinician approval. v2.0 authorship records the trigger conditions (§10.3).

**Pattern C - Documentation discipline cluster (4-RNB-01 + 4-RNB-04).** Runbook split-location pattern + day-N point-in-time lifecycle = documentation discipline gap independent of operational maturity. Lower-severity but cheap to fix (~1h total); candidate for hygiene PR after Phase 4 merges (not bundled per §17.3 since the substantive Phase 4 finding is the operational-monitoring cluster).

### 9.2 §17.1 architectural-precedent candidates flagged for SEPARATE methodology PR

Per §17.3 scope discipline, do NOT bundle architectural-precedent codification in Phase 4 PR. Candidates surfaced this phase, **listed verbatim for separate methodology PR queue:**

1. **Three-plane-discipline-absence rationale** (from 4-3PL-01). Why monolithic single-plane architecture is the right call at current pilot scale; trigger conditions for upgrade.
2. **Coarse-only-per-tenant-config-positioning rationale** (from 4-TEN-01). Why 6 module Booleans + subscription tier is sufficient at current pilot scale; trigger conditions for fine-grained config upgrade.
3. **No-plugin-architecture rationale** (from 4-PLG-01). Why monolithic Express without plugin extension points is the right call at current pilot scale; trigger conditions for plugin architecture introduction.
4. **Dismissal-at-consumption-as-effective-Pattern-2 codification** (from 4-OMP-01). Why CLAUDE.md §8 dismissal-at-consumption is effective Pattern 2 for deterministic detection; pairs with 14th/15th-entry canonical-primitive architectural-precedent series; trigger conditions for strict-mode approval-token-gating upgrade.
5. **Logs-only observability stance rationale** (from Pattern A cross-cutting). Whether logs-only is an architectural decision or a remediation target at current pilot scale; operator authors at separate methodology PR.

All five flagged for separate methodology PR. Phase 4 PR stays scope-disciplined to findings + register entries + verdict.

### 9.3 Operational maturity bar-setting (v2.0 input)

PATH_TO_ROBUST.md v1.2 references "enterprise/Palantir-grade across all dimensions" at L17. Phase 4 surfaces this principle's operational-maturity dimension. What is the Palantir-grade operational-maturity bar this codebase should hit at v2.0 production readiness? Out-of-scope for Phase 4 report; flagged for v2.0 PATH_TO_ROBUST authorship.

---

## 10. Verdict + v2.0 Phase 1 carry-forward items

### 10.1 Register-severity table

Per §18.3 rule 1: copy register severity verbatim. Severities below mirror the 21 new register entries authored in this same PR.

| Finding ID | Severity | Status |
|---|---|---|
| 4-ALR-01 | HIGH (P1) | RESOLVED 2026-05-28 (PR #309) |
| 4-ALR-02 | HIGH (P1) | RESOLVED 2026-05-28 (PR #310) |
| 4-APM-01 | HIGH (P1) | RESOLVED 2026-05-28 (PR #311) |
| 4-OBS-01 | MEDIUM (P2) | OPEN |
| 4-RNB-02 | MEDIUM (P2) | OPEN |
| 4-3PL-02 | MEDIUM (P2) | OPEN |
| 4-TEN-02 | MEDIUM (P2) | OPEN |
| 4-TEN-03 | MEDIUM (P2) | OPEN |
| 4-OBS-02 | LOW (P3) | RESOLVED 2026-06-04 (by removal; AUDIT-109 PR, branch `audit-109-prod-error-logging`) |
| 4-RNB-01 | LOW (P3) | OPEN |
| 4-RNB-04 | LOW (P3) | OPEN |
| 4-APM-02 | LOW (P3) | OPEN |
| 4-TEN-04 | LOW (P3) | OPEN |
| 4-OMP-02 | LOW (P3) | OPEN |
| 4-ALR-03 | INFO | OPEN (documentation) |
| 4-3PL-01 | INFO | OPEN (architectural observation) |
| 4-3PL-03 | INFO | OPEN (architectural observation) |
| 4-TEN-01 | INFO | OPEN (architectural observation) |
| 4-PLG-01 | INFO | OPEN (architectural observation) |
| 4-OMP-01 | INFO | OPEN (architectural; dismissal-at-consumption framing) |
| 4-LLM-01 | N/A | DOCUMENTED (policy-aligned) |

**Severity totals:** 3 HIGH P1 / 5 MEDIUM P2 / 6 LOW P3 / 6 INFO / 1 N/A = 21 entries.

**Verdict: PASS** (post-remediation 2026-05-28; the 3 HIGH P1 gate items RESOLVED via PR #309/#310/#311; original 2026-05-19 audit verdict CONDITIONAL PASS per B.1 decision (3) rubric, conditioned solely on those 3 gate items, condition now met). Non-gate MEDIUM P2 / LOW P3 / INFO findings remain OPEN on the §10.2 opportunistic roadmap and do not gate the phase verdict.

### 10.2 Remediation roadmap

**Phase 4 gate items (HIGH P1) - ALL RESOLVED 2026-05-28 via PR #309 (4-ALR-01) + #310 (4-ALR-02) + #311 (4-APM-01). Original roadmap (remediate before Phase 5 HIPAA gap analysis scaling work) retained below as the work record:**

1. **4-APM-01 + 4-OBS-01 (~10-14h):** Select + deploy APM (X-Ray + Application Signals recommended for AWS-native baseline). Add `requestId` middleware in `server.ts` + propagate via AsyncLocalStorage to logger metadata.
2. **4-ALR-01 + 4-ALR-02 (~7-11h):** Author `infrastructure/cloudformation/operational-alarms.yml` with 6 baseline alarms (ECS unhealthy task count, Aurora CPU > 80%/95%, ALB 5xx > 5%, ALB unhealthy host > 0, audit-log write-failure > 0); provision SNS topic `tailrd-production-ops-alerts`; subscribe operator email + PagerDuty/OpsGenie; wire AlarmActions across all operational alarms; backfill AlarmActions on `waf-cloudtrail.yaml:308,323,338,353` security alarms.

**Total Phase 4 gate remediation: ~17-25h.** Sequence as one sprint per Pattern A in §9.1.

**Non-gate items (MEDIUM/LOW; remediate opportunistically or during dedicated cleanup):**
- 4-OBS-02 (~2-3h), 4-RNB-01 (~1h), 4-RNB-02 (~4-6h), 4-RNB-04 (~30min), 4-APM-02 (bundled with AUDIT-078 follow-up), 4-3PL-02 (~6-10h baseline), 4-TEN-02 (~12-20h), 4-TEN-03 (~6-10h), 4-TEN-04 (~4-6h), 4-ALR-03 (~30min), 4-OMP-02 (deferred to v2.0).

**Architectural observations (INFO; not remediation targets at current pilot scale):**
- 4-3PL-01, 4-3PL-03, 4-TEN-01, 4-PLG-01, 4-OMP-01 - deferred to v2.0 architectural-decision work blocks per §10.3.

### 10.3 v2.0 Phase 1 carry-forward items

**Architectural decisions deferred to v2.0:**

1. **3PL (three-plane separation):** when does explicit plane separation become required? Trigger conditions: multi-hospital production + tenant-administrative-isolation requirements + IAM-role-separation audit demand. Authors: 4-3PL-01 + 4-3PL-03 + §17.1 precedent candidate 1.
2. **TEN (fine-grained per-tenant configurability):** when does per-hospital clinical-rule customization become required? Trigger conditions: BSW + Mount Sinai pilot feedback on rule-threshold customization needs. Authors: 4-TEN-01 + §17.1 precedent candidate 2.
3. **PLG (plugin architecture):** when does plugin extensibility become required? Trigger conditions: third-party CDS Hooks consumer integration + multi-vendor extension demand. Authors: 4-PLG-01 + §17.1 precedent candidate 3.
4. **OMP2 strict-mode (approval-token gating between detection and emit):** when does dismissal-at-consumption become insufficient? Trigger conditions: regulatory shift requiring pre-emit clinician approval / FDA SaMD reclassification of dismissal-at-consumption pattern. Authors: 4-OMP-01 + 4-OMP-02 + §17.1 precedent candidate 4.

**Scope-vs-budget delta carry-forward:**
- `PATH_TO_ROBUST.md` v1.2 L60 says ~10h; Phase 4 actual ~25-40h (Source C dimensions absent from v1.2 L60 scope).
- v1.2 L60 update deferred to v2.0 PATH_TO_ROBUST authorship as Phase 0 exit deliverable.

**§17.1 architectural-precedent codifications (5 candidates per §9.2) deferred to separate methodology PR per §17.3 scope discipline.**

**Cross-references to in-flight items:** AUDIT-078 closure pending PR #265 merge (Aurora restore-test + RTO measurement operator-side). AUDIT-079 OPEN LOW P3 (revisit at multi-Fargate scale).

---

## Appendix - Phase 4 closure ledger

- Phase 4 audit executed 2026-05-19
- 21 new register entries authored in same PR (`AUDIT_FINDINGS_REGISTER.md` §"Full findings detail" Phase 4 block)
- `BUILD_STATE.md` §6.1 status table row + narrative entry appended same PR
- 5 §17.1 architectural-precedent candidates flagged for separate methodology PR (§9.2)
- v1.2 L60 scope update deferred to v2.0 PATH_TO_ROBUST authorship (§10.3)
- Verdict originally CONDITIONAL PASS (2026-05-19) derived from §10.1 register-severity totals per §18 status-surface discipline; advanced to PASS post-remediation 2026-05-28 (3 HIGH P1 gate items RESOLVED via PR #309/#310/#311; conditional basis satisfied)
- Reconciliation 2026-05-28: Phase 4 operational-monitoring cluster (4-ALR-01 operational CloudWatch alarms + 4-ALR-02 SNS AlarmActions routing + 4-APM-01 X-Ray APM instrumentation) RESOLVED via PR #309 + #310 + #311; §10.1 status flips + verdict transition mirrored to `AUDIT_FINDINGS_REGISTER.md` L1646-1648 (L1642 verbatim-mirror invariant) + indexed in `BUILD_STATE.md` §1 Phase 4 ledger

*Methodology stack §1 / §16 (PARTIAL; not triggered this phase) / §17 / §17.1 / §18 sustained. §17.3 scope discipline preserved (architectural-precedent codifications deferred to separate methodology PR). Phase 4 sister to Phase 3 CONDITIONAL PASS precedent + Phase 3 §6 cross-phase recommendation arc.*
