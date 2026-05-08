# TAILRD Audit Findings Register

**Created:** 2026-04-29
**Maintained by:** Jonathan Hart
**Companion docs:** `docs/audit/AUDIT_FRAMEWORK.md`, `docs/TECH_DEBT_REGISTER.md`

This is the single source of truth for findings produced by the multi-phase backend audit. Each entry has a stable `AUDIT-NNN` ID. The register is parallel to `docs/TECH_DEBT_REGISTER.md` but specific to formal audit findings (with full evidence, severity rationale, and verification commands per `docs/audit/AUDIT_FRAMEWORK.md`).

---

## Status legend

| Status | Meaning |
|--------|---------|
| OPEN | Discovered, not yet remediated |
| IN_PROGRESS | Remediation work started |
| RESOLVED | Fixed and verified |
| ACCEPTED_RISK | Reviewed and consciously accepted; rationale documented inline |
| OBSOLETE | No longer applies (architectural change, replaced finding, etc.) |

---

## Severity legend

See `docs/audit/AUDIT_FRAMEWORK.md` for full definitions.

| Severity | Time-to-fix target |
|----------|--------------------|
| CRITICAL (P0) | 24-48 hours |
| HIGH (P1) | 1-2 weeks |
| MEDIUM (P2) | 1-2 months |
| LOW (P3) | When convenient |
| INFO | N/A |

---

## Findings by severity

### CRITICAL (P0)

- **AUDIT-001** — Test coverage 0.87% with auth-critical middleware at 0% (Phase 1, OPEN)

### HIGH (P1)

- **AUDIT-039** — axios HIGH-severity CVE cluster (5 advisories 2026-05-04) (Operational deps, **RESOLVED 2026-05-05** via axios 1.15.0 → 1.16.0)
- **AUDIT-002** — 406 `: any` usages, 779 ESLint warnings concentrated in PHI code (Phase 1, OPEN)
- **AUDIT-003** — 69 `console.*` in production code; 16 in `server.ts` (Phase 1, OPEN)
- **AUDIT-009** — `requireMFA` is opt-in per user (Phase 2A, **DEPLOYED 2026-04-30**; flag-off pending controlled rollout; reproduces tech debt #3)
- **AUDIT-010** — Refresh token = JWT itself (Phase 2A, OPEN; reproduces tech debt #4)
- **AUDIT-011** — `authorizeHospital` silent no-op AND not applied to patient routes (Phase 2A, **IN PROGRESS — Phase b/c SHIPPED 2026-05-07**; Layer 3 Prisma `$extends` extension + 14 unit tests + 79 gated integration tests; Phase d strict-mode flip deferred post-14-day-soak; reproduces tech debt #5)
- **AUDIT-013** — Audit log written to ephemeral ECS local storage (Phase 2A, **RESOLVED 2026-04-30**)
- **AUDIT-014** — Patient search silently broken on encrypted PHI fields (Phase 2B, OPEN)
- **AUDIT-015** — `decrypt()` returns ciphertext on integrity failure (Phase 2B, **RESOLVED 2026-04-30**)
- **AUDIT-016** — No PHI key rotation pattern (Phase 2B, **RESOLVED 2026-05-07** — full implementation arc complete: PR #255 (PR 1 envelope schema + V1 emission + AUDIT-017 bundle) + PR #258 (PR 2 V2 emission + kmsService wiring + per-record EncryptionContext) + PR 3 (migrateRecord + V0/V1 → V2 migration script + operator runbook))
- **AUDIT-031** — GAP-EP-079: pre-excited AF + AVN blocker (CRITICAL SAFETY, uncovered) (Phase 0B EP, **RESOLVED 2026-05-05** via new CRITICAL evaluator block; closes Tier S queue — queue 1 → 0, **CLOSED**)
- **AUDIT-032** — GAP-EP-006: dabigatran in CrCl<30 (SAFETY, uncovered) (Phase 0B EP, **RESOLVED 2026-05-05**, ~~Tier S~~)
- **AUDIT-033** — GAP-EP-017: HFrEF + non-DHP CCB SAFETY (Phase 0B EP, **RESOLVED 2026-05-05** via registry-entry-add; closes Tier S item — queue 4→3)
- **AUDIT-034** — GAP-CAD-016: prasugrel + stroke/TIA SAFETY (Phase 0B CAD, **RESOLVED 2026-05-05** via new SAFETY discriminator block; closes Tier S item — queue 3→2)
- **AUDIT-042** — `RXNORM_QT_PROLONGING.PROCAINAMIDE = '8787'` is propranolol (wrong-drug; QTc safety rule monitored wrong drug) (Phase 0B Cat A clinical-code verification, **RESOLVED 2026-05-05**)
- **AUDIT-043** — `BB_CODES_LQTS` / `BB_CODES_SCAD` `'7512'` is norepinephrine (claimed nadolol) (Phase 0B Cat A, **RESOLVED 2026-05-05**)
- **AUDIT-044** — `RXNORM_DIGOXIN.DIGOXIN_IV = '197607'` is a retired aspirin/caffeine/dihydrocodeine combo, not digoxin (Phase 0B Cat A, **RESOLVED 2026-05-05**)
- **AUDIT-053** — `RXNORM_FINERENONE` codes `2481926/2481928` UNKNOWN status — finerenone gap rule never fired in production (Phase 0B Cat A, **RESOLVED 2026-05-05**)
- **AUDIT-054** — `RXNORM_GDMT.SOTAGLIFLOZIN = '2627044'` is bexagliflozin (wrong drug) (Phase 0B Cat A, **RESOLVED 2026-05-05**)
- **AUDIT-055** — `RXNORM_GDMT.IVABRADINE = '1649380'` invalid CUI — ivabradine gap rule never fired (Phase 0B Cat A, **RESOLVED 2026-05-05**)
- **AUDIT-056** — `RXNORM_QT_PROLONGING.DOFETILIDE = '135447'` is donepezil (Alzheimer's drug; AAD/QT-prolonging rules false-positive on Alzheimer's patients) (Phase 0B Cat A, **RESOLVED 2026-05-05**)
- **AUDIT-057** — `RXNORM_QT_PROLONGING.DRONEDARONE = '997221'` is donepezil branded (EP-DRONEDARONE rule false-positive on Alzheimer's patients) (Phase 0B Cat A, **RESOLVED 2026-05-05**)
- **AUDIT-058** — `RXNORM_ASPIRIN.ASPIRIN_81MG = '198464'` is aspirin 300mg rectal suppository (DAPT misses 81mg oral) (Phase 0B Cat A, **RESOLVED 2026-05-05**)
- **AUDIT-046** — `MRA_CODES_K = ['9947', '37801']` — 9947 is sotalol (Class III AAD, NOT MRA), 37801 is terbinafine (antifungal, NOT eplerenone); HF K+ monitoring rule fired on wrong drugs and never on real MRAs (Phase 0B Cat D, **RESOLVED 2026-05-06**)
- **AUDIT-047** — `ARNI_CODES = ['1656328']` is sacubitril alone (NOT the sacubitril/valsartan combo); HF ARNI rule never fired in production (Phase 0B Cat D, **RESOLVED 2026-05-06**)
- **AUDIT-048** — `ARB_CODES` had 3 of 4 wrong drugs (eprosartan/telmisartan instead of valsartan/candesartan); silent ARB miss (Phase 0B Cat D, **RESOLVED 2026-05-06**)
- **AUDIT-050** — `RATE_CONTROL_CODES_SVT = ['6918', '2991', '11170']` — 2991 is invalid CUI; SVT rate-control rule never matched diltiazem patients (Phase 0B Cat D, **RESOLVED 2026-05-06**)
- **AUDIT-062** — `PPI_CODES_DAPT = ['7646', '36567', '40790', '283742']` — 36567 is simvastatin (statin in PPI list, drug-class collision); DAPT co-prescription rule false-fired on statin patients (Phase 0B Cat D, **RESOLVED 2026-05-06**)
- **AUDIT-065** — `LOINC_CARDIOVASCULAR_LABS.QTC_INTERVAL = '8601-7'` is "EKG impression" (free-text concept), NOT Q-T interval; QTc safety rule silent-failed on real Q-T measurements (Phase 0B Batch 5, **RESOLVED 2026-05-06**)
- **AUDIT-066** — `LOINC_CARDIOVASCULAR_LABS.QRS_DURATION = '8632-2'` is "QRS axis" (degrees), NOT QRS duration (ms); CRT eligibility rule (LVEF≤35 + QRS>150) read axis values as if duration — threshold >150 effectively never triggered (Phase 0B Batch 5, **RESOLVED 2026-05-06**)
- **AUDIT-067** — `LOINC_CARDIOVASCULAR_LABS.ABI_RIGHT = '44974-4'` is "Pulse intensity of unspecified artery palpation", NOT ABI (Phase 0B Batch 5, **RESOLVED 2026-05-06** via reference-correctness fix per §17.1 consumer audit; right-sized after architectural assumption corrected mid-flight)
- **AUDIT-068** — `LOINC_CARDIOVASCULAR_LABS.ABI_LEFT = '44975-1'` is "Q-T interval" (an EKG concept!), NOT ABI (Phase 0B Batch 5, **RESOLVED 2026-05-06** via reference-correctness fix per §17.1 consumer audit)
- **AUDIT-070** — FHIR ingestion expansion gap: `observationService.CARDIOVASCULAR_LAB_CODES` does not include ABI LOINC mappings; FHIR-ingested patients with ABI observations don't reach PAD screening rule (CSV path unaffected — uses observationType bypass). Latent risk, not active patient-safety. (Phase 0B clinical-code, **OPEN** — dedicated FHIR ingestion expansion PR; will also audit other LOINC entries similarly absent from CARDIOVASCULAR_LAB_CODES.)
- **AUDIT-069** — `LOINC_CARDIOVASCULAR_LABS.LVEF = '18010-0'` unverifiable per NLM Clinical Tables (search empty; loinc.org direct 500); not in NLM LOINC LVEF concept set. Real canonical LVEF = 10230-1 ("Left ventricular Ejection fraction" verified loinc.org direct + NLM). **Prior codebase fix-from comment "(was 10230-1 = QRS duration — WRONG)" was itself a regression** — 10230-1 IS LVEF per authoritative sources; the prior "fix" replaced the correct code with an unverifiable one. Every HF rule reading `labValues['lvef']` depended on this LOINC mapping (Phase 0B Batch 5, **RESOLVED 2026-05-06**)
- **AUDIT-071** — cdsHooks cross-tenant patient lookup + missing fhirPatientId per-tenant unique (Phase 3 area b, **RESOLVED 2026-05-07** — first production-readiness gate item closed; mitigation PR ships HospitalEhrIssuer model + cdsHooksAuth middleware + mandatory tenant filter + 4 HIPAA-graded audit actions + 14 tests + design doc + operator runbook)

### MEDIUM (P2)

- **AUDIT-004** — `@ts-nocheck` on `gapRuleEngine.ts` (11,292 LOC, 22% of source) (Phase 1, OPEN)
- **AUDIT-005** — God-files: `routes/modules.ts` (2,031 LOC) and `routes/admin.ts` (1,337 LOC) (Phase 1, OPEN)
- **AUDIT-006** — 27 outdated dependencies, 9 major-version-behind (Phase 1, OPEN)
- **AUDIT-012** — `/api/auth/verify` returns `valid: true` for revoked sessions (Phase 2A, OPEN)
- **AUDIT-018** — `AuditLog.description` accepts arbitrary input, not encrypted (Phase 2B, OPEN)
- **AUDIT-019** — `FailedFhirBundle` plaintext PHI fragments (Phase 2B, OPEN)
- **AUDIT-020** — External FHIR identifiers (`fhir*Id`) plaintext (Phase 2B, OPEN)
- **AUDIT-022** — Legacy JSON PHI not encrypted at rest (243 row-instances across 11 columns, 6 models) (Phase 2B-extended, RESOLVED 2026-05-07 — production-grade tooling shipped; production execution timing operator-side)
- **AUDIT-035** — `gap-ep-anticoag-interruption` registry-only orphan (Phase 0B EP, OPEN)
- **AUDIT-037** — `Math.random()` in `cqlEngine.ts:475` default rule scoring (Phase 0B canonical, OPEN, CLAUDE.md §14 violation)
- **AUDIT-049** — `DOAC_CODES_STROKE/TEE` use rivaroxaban formulation/pack codes; missing dabigatran + edoxaban ingredients (Phase 0B Cat D, **RESOLVED 2026-05-06**)
- **AUDIT-064** — Partial-pipeline-regen pattern after source-changing operations: reconcile/renderAddendum/renderSynthesis skipped after extractCode-affecting source changes leaves committed derived artifacts stale; CI Audit Canonical Gates rejects (2 recurrences PR #245 + PR #246) (Operational debt / canonical infrastructure, **RESOLVED 2026-05-06** via AUDIT_METHODOLOGY.md §9.2 codification)

### LOW (P3)

- **AUDIT-007** — 2 moderate npm vulnerabilities (`uuid` chain, `node-cron`) (Phase 1, OPEN)
- **AUDIT-017** — `PHI_ENCRYPTION_KEY` length not validated at startup (Phase 2B, RESOLVED 2026-05-07 — bundled into AUDIT-016 PR 1 per operator decision D4)
- **AUDIT-027** — `gdmtEngine.ts` / `gapRuleEngine` redundancy + rule-engine naming convention reconciliation (Phase 0B HF + CAD, OPEN)
- **AUDIT-028** — Time-unit disambiguation in timeline math (raw scope vs AI-assisted wall-clock) (Phase 0B CAD, OPEN)
- **AUDIT-029** — Rule-body verification standard for clinical audits (Phase 0B canonical, **RESOLVED 2026-05-04** via PR #234)
- **AUDIT-030** — Per-gap classification citation requirement (Phase 0B canonical, **RESOLVED 2026-05-04** via PR #234)
- **AUDIT-030.D** — Evaluator inventory completeness via multi-pattern detection (Phase 0B canonical, **RESOLVED 2026-05-04** via PR #234)
- **AUDIT-036** — `gap-hf-vaccine-covid` registry-only orphan (Phase 0B HF, OPEN)
- **AUDIT-045** — `RXNORM_DIGOXIN.DIGOXIN_250MCG/DIGOXIN_ELIXIR` strength/form labels mismatch actual codes (codes valid digoxin) (Phase 0B Cat A, **RESOLVED 2026-05-05**)
- **AUDIT-052** — Architectural: inline drug-class arrays in `gapRuleEngine.ts` bypass canonical valuesets in `cardiovascularValuesets.ts` (divergence vector for Cat A/D bugs) (Phase 0B clinical-code verification, **RESOLVED 2026-05-06** for the 4 major drug classes (DHP CCB / PPI / loop diuretic / thiazide) via 4 new canonical valuesets + 7 inline-array refactors)
- **AUDIT-059** — `RXNORM_WARFARIN.WARFARIN_2MG = '855296'` is actually warfarin 10mg tablet (label only — code is valid warfarin) (Phase 0B Cat A, **RESOLVED 2026-05-05**)
- **AUDIT-060** — `RXNORM_WARFARIN.WARFARIN_5MG = '855318'` is actually warfarin 3mg tablet (label only) (Phase 0B Cat A, **RESOLVED 2026-05-05**)
- **AUDIT-061** — `RXNORM_WARFARIN.WARFARIN_10MG = '855332'` is actually warfarin 5mg tablet (label only) (Phase 0B Cat A, **RESOLVED 2026-05-05**)
- **AUDIT-072** — Soft-delete coverage gap + DELETE patient does not cascade (Phase 3, OPEN)
- **AUDIT-073** — Per-tenant unique gap on Order.fhirOrderId + CarePlan.fhirCarePlanId (Phase 3, **RESOLVED 2026-05-07** — bundled with AUDIT-071 per §17.3; same schema migration)
- **AUDIT-075** — PHI encryption-at-rest coverage gaps (~13-15 columns per PAUSE 1 inventory; bundles AUDIT-018 + AUDIT-019 per D3) (Phase 3, **IN PROGRESS — Phase C SHIPPED 2026-05-07**; flips RESOLVED at PR merge; 12th §17.1 architectural-precedent codified; AUDIT-081 filed for User.email blind-index deferral)
- **AUDIT-078** — Production Aurora backup config not in IaC; restore procedure untested (Phase 3, OPEN — PRODUCTION-READINESS GATE)
- **AUDIT-080** — Zod validation coverage gap (21 of 26 mutating-route files) (Phase 3, OPEN — PRODUCTION-READINESS GATE)
- **AUDIT-038** — Node 18 LTS deprecation tracking (Operational debt, OPEN)
- **AUDIT-074** — Schema-reading hygiene gaps (onDelete defaults + missing hospitalId index) (Phase 3, OPEN)
- **AUDIT-076** — `HIPAA_GRADE_ACTIONS` set narrow; some clinically-significant events best-effort (Phase 3, OPEN)
- **AUDIT-077** — Tenant-isolation defense-in-depth hygiene gaps (Phase 3, OPEN)
- **AUDIT-079** — connection_limit not explicit in DATABASE_URL nor Prisma client (Phase 3, OPEN)
- **AUDIT-040** — Line-shift handling in canonical pipeline (Operational debt / canonical infrastructure, **RESOLVED 2026-05-05** via refreshCites.ts)
- **AUDIT-041** — `applyOverrides.ts` candidate-default mismatch with source-change PR usage (4 prior recurrences across PRs #238/240/241/243) (Canonical infrastructure, **RESOLVED 2026-05-06** via canonical-default flag flip + `--candidate` opt-in)
- **AUDIT-051** — `ACEI_CODES` `'50166'` is fosinopril (codebase comment claimed benazepril; class-correct, comment wrong) (Phase 0B Cat D, **RESOLVED 2026-05-06** via canonical benazepril CUI 18867)
- **AUDIT-063** — `LOOP_DIURETIC_CODES_TH/OPT` `'4109'` is ethacrynic acid (codebase comment claimed bumetanide; class-correct, comment wrong) (Phase 0B Cat D, **RESOLVED 2026-05-06** with addition of real bumetanide 1808)

### INFO

- **AUDIT-008** — Tech debt register has #27 gap (Phase 1, OPEN)
- **AUDIT-021** — `UserSession` model is dead code (Phase 2B, OPEN)

---

## Full findings detail

### AUDIT-001 — Test coverage 0.87% with auth-critical middleware at 0%

- **Phase:** 1
- **Severity:** CRITICAL (P0)
- **Status:** OPEN
- **Discovered:** 2026-04-29
- **Location:** `backend/src/middleware/{auth,auditLogger,phiEncryption,csrfProtection,tierEnforcement,cognitoAuth,authRateLimit}.ts` and ~80% of `backend/src/services/*` and `backend/src/routes/*`
- **Evidence:** `npm test -- --coverage --silent --passWithNoTests --coverageReporters=text-summary` produces `Statements 0.87% (99/11330), Branches 0.36%, Functions 1.06%, Lines 0.88%`. Auth middleware coverage breakdown in `docs/audit/PHASE_1_REPORT.md` §4.4.
- **Severity rationale:** HIPAA-regulated PHI system; auth, audit-logging, PHI-encryption, CSRF, and tenant-tier middleware all at 0%. Would fail any enterprise due-diligence review or formal HIPAA Security Rule §164.312(b) / §164.308(a)(8) evaluation. Every prior auth bug surfaced was discovered in production, never pre-merge.
- **Current production state:** finding does NOT indicate active risk to current pilot users. Production is observable, error rate 0/24h, Aurora cutover validated through 76 soak monitor invocations, middleware exercised by every authenticated request. P0 reflects audit-defensibility and scaling readiness — not active operational risk. Existing pilot users are safe; finding blocks scaling to additional health systems without Tier A.
- **Remediation:** Tiered roadmap per `docs/audit/PHASE_1_REPORT.md` §5 AUDIT-001. Tier A (40-60h) covers all 7 auth-critical middleware files to 80%+ — must land before any new pilot user.
- **Effort estimate:** Tier A 40-60h (M-L); A+B 120-180h; A+B+C 240-380h
- **Dependencies:** Tier A blocks Phase 5 (HIPAA gap analysis). Phase 2 (Security posture) audit will reinforce this finding.
- **Cross-references:** Tech debt #3 (MFA), #4 (refresh token), #5 (`authorizeHospital`) all live in 0%-coverage files — reinforced by triple signal in Phase 1 report §4.5.

---

### AUDIT-002 — 406 `: any` usages, 779 ESLint warnings concentrated in PHI code

- **Phase:** 1
- **Severity:** HIGH (P1)
- **Status:** OPEN
- **Discovered:** 2026-04-29
- **Location:** All-files affected; top 10 files account for 196 of 406 (48%). PHI-handling concentration: `cql/cqlEngine.ts` (24), `redox/fhirResourceHandlers.ts` (23), `scripts/ingestSynthea.ts` (22), `routes/clinicalIntelligence.ts` (21), `ai/ecgPostprocessor.ts` (20), `services/phenotypeService.ts` (19), `cql/fhirDataMapper.ts` (16), `services/alertService.ts` (14), `routes/admin.ts` (14), `services/crossReferralService.ts` (13).
- **Evidence:** `grep -rn ": any" backend/src --include="*.ts" | grep -v node_modules | grep -v "\.spec\." | wc -l` → 406. `npx eslint src --max-warnings 0` → `✖ 779 problems (0 errors, 779 warnings)`.
- **Severity rationale:** `: any` opts out of TypeScript's compile-time guarantees per-expression. Concentration in PHI-handling code means the compiler cannot catch malformed FHIR resources, missing patient fields, or wrong-shape gap-rule inputs. Reinforces AUDIT-001's testing-gap risk: the compiler should be a defense-in-depth layer; right now it has 406 holes.
- **Remediation:** File-by-file, prioritizing top 10. Replace with `: unknown` + type guards or zod schemas at boundaries. For external-API payloads (FHIR/Redox), introduce zod schemas in `backend/src/validation/` and parse at ingress. Folds into AUDIT-001 Tier A for auth/PHI files; remainder is independent cleanup.
- **Effort estimate:** ~30-50h
- **Dependencies:** None hard. Naturally co-located with AUDIT-001 Tier A work for auth-touching files.
- **Cross-references:** AUDIT-001 (concentration overlap).

---

### AUDIT-003 — 69 `console.*` in production code; 16 in `server.ts`

- **Phase:** 1
- **Severity:** HIGH (P1) for `server.ts` and middleware paths; MEDIUM (P2) for `scripts/ingestSynthea.ts`
- **Status:** OPEN
- **Discovered:** 2026-04-29
- **Location:** `scripts/ingestSynthea.ts` (32, P2), `server.ts` (16, P1), `redox/batchGapDetection.ts` (7, P1), `middleware/analytics.ts` (5, P1), `lib/redis.ts` (5, P1), 5 more files at 1 each.
- **Evidence:** `grep -rEn "console\.(log|error|warn|info)" backend/src --include="*.ts" | grep -v node_modules | grep -v "\.spec\." | wc -l` → 69. Captured in `/tmp/audit-console-usage.txt`.
- **Severity rationale:** `console.*` writes go to ECS task stdout/stderr without the structured logger's correlation/hospitalId/userId/requestId fields. PHI-leak risk is concrete: `console.error('failed for patient', err)` where `err` carries Prisma data lands as raw text in CloudWatch. Per CLAUDE.md §14 "never leave PHI in logs", `console.*` directly bypasses the discipline. `server.ts` is highest-risk because startup runs before logger init and one bad startup error can leak environment variables.
- **Remediation:**
  1. `server.ts` 16 → replace with `logger.error/info/warn` from `backend/src/utils/logger.ts`; add bootstrap logger if pre-init logging needed
  2. Middleware/redis/analytics → same replacement
  3. `scripts/ingestSynthea.ts` is a CLI; defer to a hygiene pass
  4. Add ESLint rule `no-console: error` for `src/**/*.ts` excluding `scripts/`
- **Effort estimate:** S-M (4-8h P1 subset; S/optional 2h P2 subset)
- **Dependencies:** None
- **Cross-references:** None (tech debt register has no direct entry).

---

### AUDIT-004 — `@ts-nocheck` on `gapRuleEngine.ts` (11,292 LOC, 22% of source)

- **Phase:** 1
- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Discovered:** 2026-04-29
- **Location:** `backend/src/ingestion/gaps/gapRuleEngine.ts:1`, `backend/src/ingestion/runGapDetectionForPatient.ts:1`
- **Evidence:** `grep -rn "@ts-nocheck" backend/src` returns 2 files. CLAUDE.md §15 RULE 6 documents the WSL-stale-Prisma-client justification.
- **Severity rationale:** TSC `--strict` 0-errors result is conditional. 11,398 LOC bypass strict checking entirely. Codegen pattern is justifiable engineering, but two gaps remain: (1) audit framework's "strict-mode coverage" claim must carry an asterisk; (2) the rule-registry source files generating `gapRuleEngine.ts` should themselves be strict-clean.
- **Remediation:**
  1. Document codegen pattern (this finding is the documentation)
  2. Phase 2: audit rule-registry source for strict-mode hygiene
  3. Long-term: investigate splitting codegen output into `*.d.ts` declarations + `*.js` data, removing the need for `@ts-nocheck`
  4. Per CLAUDE.md §15 RULE 6 / §14: these two files are explicit known exceptions; adding more is forbidden
- **Effort estimate:** Documentation S (1h); long-term refactor M (8-16h)
- **Dependencies:** Long-term refactor is non-blocking
- **Cross-references:** None

---

### AUDIT-005 — God-files: `routes/modules.ts` (2,031 LOC) and `routes/admin.ts` (1,337 LOC)

- **Phase:** 1
- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Discovered:** 2026-04-29
- **Location:** `backend/src/routes/modules.ts` (2,031 LOC, 31 routes), `backend/src/routes/admin.ts` (1,337 LOC, 27 routes)
- **Evidence:** `find backend/src -name "*.ts" -not -name "*.spec.ts" -not -path "*/node_modules/*" | xargs wc -l | sort -rn | head -5`
- **Severity rationale:** Maintainability and cognitive load. `routes/modules.ts` mixes routes for all 6 clinical modules into one file. `admin.ts` mixes 27 disparate admin operations. Per-domain split would mirror the 6-module domain structure already present in `src/ui/`.
- **Remediation:**
  1. Split `routes/modules.ts` → `routes/modules/{heartFailure,electrophysiology,coronary,structural,valvular,peripheralVascular}.ts`
  2. Split `routes/admin.ts` → `routes/admin/{users,audit,config,dataManagement,healthSystems,customerSuccess}.ts`
  3. Top-level `routes/{modules,admin}/index.ts` re-mounts each sub-router; preserves URL layout
  4. Wire integration smoke tests per sub-file as part of AUDIT-001 Tier B
- **Effort estimate:** ~20h (4-6h per file)
- **Dependencies:** Bundles naturally with AUDIT-001 Tier B route integration tests
- **Cross-references:** AUDIT-001 Tier B

---

### AUDIT-006 — 27 outdated dependencies, 9 major-version-behind

- **Phase:** 1
- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Discovered:** 2026-04-29
- **Location:** `backend/package.json`
- **Evidence:** `npm outdated --json` → 27 packages outdated. Major-version-behind: `prisma 5→7` (2 majors), `express 4→5`, `eslint 8→10` (2 majors), `jest 29→30`, `redis 4→5`, `helmet 7→8`, `zod 3→4`, `bcryptjs 2→3`, `typescript 5.9→6.0`, `node-cron 3→4`. Captured to `/tmp/audit-outdated.json`.
- **Severity rationale:** Maintenance burden, supply-chain hygiene, security-patching latency. Several behind-by-multiple-majors are in security-sensitive boundaries: bcryptjs, helmet, prisma, express. No quarterly maintenance ritual visible.
- **Remediation:** Per-dependency audit, batched into a quarterly "dep refresh" PR cycle. Suggested order:
  - **Batch 1 (low-risk):** all `wanted` ≈ `latest` patches (axios, dotenv, @aws-sdk fleet, @typescript-eslint, ts-jest)
  - **Batch 2 (one major at a time):** typescript 5→6, jest 29→30, eslint 8→10
  - **Batch 3 (frameworks):** prisma 5→7, express 4→5, redis 4→5, helmet 7→8 — each its own PR with full smoke-test cycle
- **Effort estimate:** Batch 1 ~4h, Batch 2 ~24h total, Batch 3 ~64h total. Realistic full sweep: 12-15 weeks at 1 PR/week.
- **Dependencies:** AUDIT-007 folds into Batch 2 (`node-cron` upgrade)
- **Cross-references:** AUDIT-007

---

### AUDIT-007 — 2 moderate npm vulnerabilities (`uuid` chain, `node-cron`)

- **Phase:** 1
- **Severity:** LOW (P3)
- **Status:** OPEN
- **Discovered:** 2026-04-29
- **Location:** `backend/package-lock.json` transitive deps
- **Evidence:** `npm audit --audit-level=moderate --json` → `{"metadata":{"vulnerabilities":{"critical":0,"high":0,"moderate":2}}}`. Advisories: `uuid` and `node-cron` (via `uuid` chain). Captured to `/tmp/audit-npm-audit.json`.
- **Severity rationale:** Routine moderate CVE in `uuid`'s dependency chain via `node-cron`. No exploitable path identified (we use `node-cron` for scheduled tasks, not user-controlled input).
- **Remediation:** Bump `node-cron` to a version that pulls a patched `uuid`. Folds into AUDIT-006 Batch 2.
- **Effort estimate:** S (1h, folds into AUDIT-006)
- **Dependencies:** AUDIT-006 Batch 2
- **Cross-references:** AUDIT-006

---

### AUDIT-008 — Tech debt register has #27 gap

- **Phase:** 1
- **Severity:** INFO
- **Status:** OPEN
- **Discovered:** 2026-04-29
- **Location:** `docs/TECH_DEBT_REGISTER.md`
- **Evidence:** `grep -E "^### [0-9]+\." docs/TECH_DEBT_REGISTER.md | awk -F'.' '{print $1}' | sed 's/### //' | sort -n | uniq` returns 1, 2, ..., 26, 28, 29, ..., 38 (27 missing).
- **Severity rationale:** Register's stable-numbering guarantee (per its footer: "items should be appended here, not inserted mid-list — the numbering is a stable reference") is broken if a number was deleted without a stub. Future cross-references to "tech debt #27" could pick up a different entry if anyone re-numbers.
- **Remediation:** Add stub `### 27. (deleted)` with a note explaining why — either "intentionally deleted on YYYY-MM-DD because [reason]" or "merge artifact, never a real entry". Combine with the framework register-hygiene PR alongside the RESOLVED markers for #6 / #8 / #17.
- **Effort estimate:** XS (15 min)
- **Dependencies:** Folds into the register-hygiene PR
- **Cross-references:** Register-hygiene PR (separate from this audit branch)

---

### AUDIT-009 — `requireMFA` is opt-in per user

- **Phase:** 2A
- **Severity:** HIGH (P1)
- **Status:** **DEPLOYED 2026-04-30** (code shipped via PR #214; `MFA_ENFORCED=false` in production pending controlled rollout — user notification + admin enrollment required first)
- **Resolution note:** Code path active on production task def `:138`. Enforcement gate dormant via env flag. Tracked as open follow-up: MFA_ENFORCED rollout planning runbook.
- **Discovered:** 2026-04-29
- **Location:** `backend/src/middleware/auth.ts:221-250`
- **Evidence:** Lines 234-247 query `userMFA.enabled`. If `!mfaRecord?.enabled`, middleware passes regardless of `mfaVerified`. Wired globally at `server.ts:249` for `/api/*`.
- **Severity rationale:** HIPAA §164.312(d) (person-or-entity authentication) expects MFA for any account with PHI access. A user with only password auth can access PHI routes today.
- **Remediation:** `mfaEnforced` gate requiring `user.mfaVerified` for any route tagged `phi: true` when `user.role !== 'DEMO'`. Force-enroll SUPER_ADMIN and HOSPITAL_ADMIN users.
- **Effort estimate:** M (8-16h)
- **Dependencies:** None
- **Cross-references:** Tech debt #3, AUDIT-001

### AUDIT-010 — Refresh token equals JWT itself

- **Phase:** 2A
- **Severity:** HIGH (P1)
- **Status:** OPEN
- **Location:** `backend/src/routes/auth.ts:167-233`
- **Evidence:** `/api/auth/refresh` accepts the same JWT used for auth, verifies it, issues new JWT. No separate refresh credential.
- **Severity rationale:** Leaked JWT remains a refresh credential until logout. No upper-bound expiry. No rotation cadence.
- **Remediation:** Separate refresh token (HTTP-only cookie, 30-day expiry); rotate on every refresh; revoke on password change.
- **Effort estimate:** M (12-20h)
- **Cross-references:** Tech debt #4

### AUDIT-011 — `authorizeHospital` silent no-op AND not applied to patient routes

- **Phase:** 2A
- **Severity:** HIGH (P1)
- **Status:** **IN PROGRESS — Phase b/c SHIPPED 2026-05-07** (Layer 3 Prisma extension + 14 unit tests + 79 gated integration tests; Phase d strict-mode flip deferred post-14-day-soak operator-side PR per design §6 + design refinement note §9.3)
- **2026-05-07 reconciliation note (Phase b/c shipped):** Layer 3 Prisma `$extends` extension live in **audit mode by default** (TENANT_GUARD_MODE=audit; revised from binary TENANT_GUARD_STRICT to three-state off/audit/strict per design refinement note §5 robustness-first posture). 33-model `HIPAA_GRADE_TENANT_MODELS` allow-list + 9 system-bypass models + 14 production callsite bypass markers (11 Phase a-pre existing + 3 FeatureUsage analytics-read added per PAUSE 2.7 (b) defense-in-depth refinement). 14 unit tests (`backend/src/lib/__tests__/prismaTenantGuard.test.ts`; default-suite 552→566) + 79 gated integration tests (`backend/tests/integration/audit-011-cross-tenant.test.ts`; activates via `RUN_INTEGRATION_TESTS=1`; Phase d GO/NO-GO confidence gate per design refinement note §9.3). 8-test-group structure: I — Allow-list model coverage (33; ALL HIPAA_GRADE_TENANT_MODELS) / II — Bypass marker (6) / III — System-bypass models (6) / IV — 3-state flag matrix (9) / V — Where-clause detection (6) / VI — Edge cases + regression (12) / VII — Soak-mode operational readiness (4) / VIII — Cleanup & isolation (3). +1 HIPAA-graded audit promotion (`TENANT_GUARD_VIOLATION`) per AUDIT-076 partial-closure +1 (cumulative 7 across 3 PRs: AUDIT-071 PR #257 +4 + AUDIT-016 PR #260 +2 + this PR +1). **11th §17.1 architectural-precedent surfaced:** TS inference erosion through generic `$extends` chain (Phase A inventory enumerated 50 downstream consumers + 16 PrismaClient type imports + $-method callsites but didn't anticipate that the GENERIC return type would resolve to `unknown` model accessors at downstream import sites; Phase C Step 3 `tsc --noEmit` caught it; fix: `as unknown as PrismaClient` type-erasure cast at wire-in boundary documented inline at `prisma.ts:31-49`; sister to 9th INPUT axis + 10th SCOPE axis = 11th TYPE axis). Methodology stack §1 / §9.1 / §9.2 / §16 / §17 / §18 sustained. Design refinement note: `docs/architecture/AUDIT_011_PHASE_BCD_PRISMA_EXTENSION_NOTES.md` (~700 LOC; 14 sections; D1-D9 + Step 1.0/1.0.1 verification + PAUSE 2.6/2.7/2.10/2.13 design corrections + 11 §17.1 catalog). Phase d trigger: zero `TENANT_GUARD_VIOLATION` events during 14-day audit-mode soak; operator runs the 79-test integration suite against soak DB; flip `TENANT_GUARD_MODE=audit → strict` via env var (no code revert).
- **Location:** `backend/src/middleware/auth.ts:128-151`; missing-from `backend/src/routes/patients.ts`
- **Evidence:** Middleware silently `next()`s when no `:hospitalId` URL param. Patient routes don't apply the middleware at all. Tenant isolation depends entirely on per-handler `where: { hospitalId: req.user.hospitalId }` discipline.
- **Severity rationale:** Two failure modes; with AUDIT-001 0% coverage no detection layer; future route forgetting the filter would silently leak cross-tenant data.

**Pre-fix subfindings (surfaced 2026-05-02 during AUDIT-011 design):**

- **GAP-1**: `backend/src/ingestion/runGapDetectionForPatient.ts:21` — `prisma.patient.findUnique({ where: { id: patientId } })` ignores the `hospitalId` parameter in scope (line 16). Webhook caller path can load cross-tenant patient PHI + medications + observations into memory. Fix: `findFirst({ where: { id: patientId, hospitalId } })` (Phase a-pre).

- **GAP-2**: `backend/src/services/crossReferralService.ts:811` — `getReferralById(referralId)` lacks `hospitalId` parameter; `findUnique({ where: { id: referralId } })` loads cross-tenant referral PHI before route handler's post-fetch validation runs. Fix: add `hospitalId` parameter, scope query (Phase a-pre).

Both bugs are pre-existing. Detected via Layer 3 deployment-readiness audit (see `docs/audit/AUDIT_011_DESIGN.md` §11). Bundled into AUDIT-011 remediation Phase a-pre.

- **Remediation:** Defense-in-depth across 3 layers (see `docs/audit/AUDIT_011_DESIGN.md`): Layer 1 fail-loud `authorizeHospital`; Layer 2 new `enforceHospitalScope` middleware; Layer 3 Prisma client extension `TENANT_GUARD_STRICT` (env-flag rollout). Plus: 13 REFACTOR sites (where: { id } → where: { id, hospitalId }; 12 from original audit + 1 found during Phase a-pre line verification at `routes/patients.ts:360`), 11 LEGITIMATE_BYPASS markers (9 from original audit + 2 found during Phase a-pre at `crossReferralService.getReferralByIdAcrossTenants` and `phenotypeService.getPhenotypeByIdAcrossTenants` for SUPER_ADMIN cross-tenant access), GAP-1 + GAP-2 fixes, 60-80 cross-tenant integration tests.
- **Effort estimate:** Revised to M (11.5-15.5h) — original L (16-24h) lowered after §2 audit found 0 RED routes; raised again by §11 callsite audit (+3-4h pre-flag-flip work).
- **Cross-references:** Tech debt #5, AUDIT-001, `docs/audit/AUDIT_011_DESIGN.md`

### AUDIT-012 — `/api/auth/verify` returns `valid: true` for revoked sessions

- **Phase:** 2A
- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Location:** `backend/src/routes/auth.ts:237-264`
- **Evidence:** `/verify` runs `jwt.verify` only — no `loginSession.isActive` lookup. Token whose session was revoked still returns `valid: true` until JWT expiry.
- **Severity rationale:** UX-only; not an authorization bypass. UI may surface stale "valid" state for logged-out sessions.
- **Remediation:** Add `loginSession.findUnique({sessionToken: hash})` lookup matching `authenticateToken`.
- **Effort estimate:** S (2h)

### AUDIT-013 — Audit log written to ephemeral ECS local storage

- **Phase:** 2A
- **Severity:** HIGH (P1)
- **Status:** **RESOLVED 2026-04-30** (PR #214)
- **Resolution note:** Dual-transport audit logging shipped: file (dev convenience) + stdout-JSON Winston transport captured by ECS awslogs driver to CloudWatch Logs. HIPAA-grade actions (LOGIN_*, LOGOUT, PHI_*, PATIENT_*, BREACH_*) throw on DB write failure instead of silently degrading. Verified active on `:138` via CloudWatch `service:tailrd-audit` JSON output stream.
- **Location:** `backend/src/middleware/auditLogger.ts:8, 24-38`
- **Evidence:** Audit logs written to `path.resolve(__dirname, '../../logs')` via Winston. ECS Fargate task storage is ephemeral. DB write at line 138-153 is best-effort and does not throw on failure.
- **Severity rationale:** HIPAA §164.312(b) requires audit controls. Ephemeral storage means records can disappear with task recycling.
- **Remediation:** Stream Winston output to CloudWatch Logs + S3 archive cron; make DB write throw on HIPAA-grade events.
- **Effort estimate:** M (8-16h)

### AUDIT-014 — Patient search silently broken on encrypted PHI fields

- **Phase:** 2B
- **Severity:** HIGH (P1)
- **Status:** OPEN
- **Location:** `backend/src/routes/patients.ts:81-86`
- **Evidence:** GET `/api/patients` builds `where.OR` with `contains` on encrypted `firstName`/`lastName`/`mrn`/`email`. AES-GCM is non-deterministic; SQL ILIKE on ciphertext can't match plaintext.
- **Severity rationale:** Production search returns 0 results, silently. AUDIT-001 0% coverage means no detection.
- **Remediation:** Design choice — deterministic search-key column via HMAC, OR application-side filter, OR feature scope reduction.
- **Effort estimate:** L (16-30h)
- **Cross-references:** AUDIT-001, AUDIT-020

### AUDIT-015 — `decrypt()` returns ciphertext on integrity failure

- **Phase:** 2B
- **Severity:** HIGH (P1)
- **Status:** **RESOLVED 2026-04-30** (PR #214 + commit `3ee03cf` backfill)
- **Resolution note:** Three throw paths active in production task def `:138` since 2026-04-30T18:31:00Z: (a) AES-GCM auth-tag mismatch throws "integrity check failed"; (b) malformed `enc:` format throws; (c) legacy plaintext throws unless `PHI_LEGACY_PLAINTEXT_OK=true`. Pre-deploy verify-phi-legacy.js found 51 legacy plaintext rows across 8 string columns. Backfill (commit `3ee03cf`, Fargate run `9a3ff7860e40406ea05507769a7fdd00`) re-encrypted all 51 via Prisma `update()` middleware path: 51/51 succeeded, 0 failures. Independent re-verification (`3904f48bdca8474bb7d71b079ac88cf5`) confirmed `cleanForDeploy: true` (0 legacy rows, 36 columns scanned). Production stable on `:138` for 79+ minutes with `PHI_LEGACY_PLAINTEXT_OK=false` and zero PHI decryption errors in CloudWatch. HIPAA §164.312(c)(1) integrity expectation met.
- **Location:** `backend/src/middleware/phiEncryption.ts:88-101`
- **Evidence:** Catch block returns `encryptedText` as-is on AES-GCM auth-tag mismatch.
- **Severity rationale:** HIPAA §164.312(c)(1) (integrity) expects detection of unauthorized alteration. Fail-silent masks tampering and leaks ciphertext upstream.
- **Remediation:** Throw on decrypt failure. Single legacy-data flag for documented migration.
- **Effort estimate:** S (2-4h)

### AUDIT-016 — No PHI key rotation pattern

- **Phase:** 2B
- **Severity:** HIGH (P1)
- **Status:** **RESOLVED 2026-05-07** — full implementation arc complete (3 sub-PRs: #255 + #258 + this PR)
- **Location:** `backend/src/middleware/phiEncryption.ts:4`
- **Evidence:** Key loaded once at module init. No version tag in `enc:` format. No multi-key fallback.
- **Original evidence (corrected by §17.1 consumer audit):** `kmsService.ts` was described as "scaffolded but unwired." A consumer audit during this PR's design phase corrected the framing: kmsService.ts is **fully implemented (305 LOC of working AWS KMS envelope encryption + EncryptionContext + local-fallback)** but **zero callers in `backend/src/`** — implementation exists but is not wired into the phiEncryption middleware. This is the second §17.1-architectural-precedent finding (sister to AUDIT-067/068 ABI consumer audit, PR #249). Effort estimate revised downward: 14-22h implementation across 3 sub-PRs (was 24-40h before consumer audit).
- **Severity rationale:** HIPAA §164.312(a)(2)(iv) implementation specification expects periodic key rotation. Rotating today would make all existing ciphertext unreadable.
- **Severity reconciliation 2026-05-07:** HIGH (P1) confirmed per HIPAA §164.312(a)(2)(iv) addressable spec + production BSW PHI exposure (live pilot since 2026-04-27) + no compensating rotation pathway (compromise scenario unrecoverable; rotating today destroys all existing ciphertext). Reconciliation triggered after agent-side status-surface drift on 2026-05-06 (drift to LOW P3 / MEDIUM P2 across multiple status surfaces during PR #248-#250 work). Future status surfaces MUST copy this severity literally — do not re-classify based on Phase 2B (prior phase) tag, "deferred" framing, or "v2.0 backlog" framing. Phase-tag is provenance, not severity. See AUDIT_METHODOLOGY.md §18 for status-surface discipline codification.
- **Design phase resolution (this PR, 2026-05-07):**
  - Architecture: Option B — AWS KMS envelope encryption (wire existing kmsService into phiEncryption middleware)
  - Layered rotation cadence: 365-day AWS-managed KEK + 180-day app-layer DEK discipline (per NIST SP 800-57 cryptoperiod guidance)
  - Migration: background re-encryption job + access-fallback for legacy V0 untagged ciphertext; 30-day target completion window
  - Key custody: framework in design doc (Secrets Manager + KMS EncryptionContext + IAM least-privilege + break-glass procedure); specifics deferred to operator runbook
  - Deliverables: `docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md` (full design doc), `backend/src/services/keyRotation.ts` (interface stubs throwing `DesignPhaseStubError`), `backend/src/middleware/phiEncryption.ts` JSDoc update (no logic change), `backend/src/services/__tests__/keyRotation.test.ts` (stub tests)
- **Implementation PR plan (3 sub-PRs, ~14-22h total):**
  - **Implementation PR 1** ✅ **SHIPPED 2026-05-07** (~5-7h + ~1h AUDIT-017 bundle): V0/V1/V2 envelope schema (revised inline from original V0/V1; signal-shape-honesty per fifth §17.1 architectural-precedent) + V1 emission for new writes (single-key versioned) + AUDIT-017 PHI_ENCRYPTION_KEY validation bundled per operator D4. Test count: 464/464 passing (417 prior + 47 net new). New module: `backend/src/services/envelopeFormat.ts` (pure parse/build for V0/V1/V2 + EnvelopeFormatError). Refactored: `keyRotation.ts` real implementations for `decryptAny` + `encryptWithCurrent`; `phiEncryption.ts` async-propagation through middleware. AUDIT-022 SQL-filter compatibility verified (all three versions match `enc:%`).
  - **Implementation PR 2** ✅ **SHIPPED 2026-05-07** (~7-8h actual; D7 in-scope expansion + bonus kmsService.test.ts): V2 envelope emission via kmsService.envelopeEncrypt + per-record EncryptionContext (model + field) propagation through phiEncryption middleware → keyRotation → kmsService. Flag-flip via `PHI_ENVELOPE_VERSION=v2` + `AWS_KMS_PHI_KEY_ALIAS` (alias OR ARN per D1). New `validateEnvelopeConfigOrThrow` + `EnvelopeConfigError` (fail-fast at module init; sister to AUDIT-017). decryptAny V2 case wired (replaces PR 1 DesignPhaseStubError). Decrypt-is-not-gated rollback safety property: V2 ciphertext decrypts even when PHI_ENVELOPE_VERSION rolled back to v1. 27 net new tests (10 keyRotation V2 + 16 kmsService + 1 phiEncryption T7); jest 510/510 pass. 2 audit actions promoted to HIPAA_GRADE_ACTIONS per D6 (KMS_KEY_VALIDATION_FAILURE + KMS_ENVELOPE_DECRYPT_FAILURE; continues AUDIT-076 partial closure). Design refinement note: `docs/architecture/AUDIT_016_PR_2_V2_KMS_WIRING_NOTES.md`. Strict fail-loud per D4 — KMS unreachable throws; no V1 fallback. Dev-vs-prod intentional separation documented: dev V2 envelopes use localEncrypt-as-DEK-wrap and are NOT portable to production (different DEK-wrap mechanism).
  - **Implementation PR 3** ✅ **SHIPPED 2026-05-07** (~6-8h actual; mid-range of 4-7h band per design refinement note §11): `migrateRecord(recordId, table, column, context, prismaClient, currentValue)` real implementation in `keyRotation.ts` (parseEnvelope dispatch + V2-input race-skip-no-write per D3 + decryptAny single-key V0/V1 → encryptWithCurrent V2 emit + raw SQL UPDATE via `$executeRawUnsafe` parameterized recordId+ciphertext bypassing applyPHIEncryption middleware to prevent double-encrypt). New migration script `backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts` (~764 LOC actual, ~18-27% over PAUSE 2 design refinement note §11 estimate of ~600-650 LOC; not a §17.1, normal scope clarification — additional pre-flight detail + boilerplate + error handling; sister to AUDIT-022 backfill; ~66 (table, column) TARGETS spanning 14 string-PHI + 15 JSON-PHI models per D2). Three-layer gate: `--dry-run` (default) / `--execute` / `AUDIT_016_PR3_EXECUTE_CONFIRMED=yes` env per D7. Pre-flight validates DATABASE_URL + PHI_ENCRYPTION_KEY + AWS_KMS_PHI_KEY_ALIAS + PHI_ENVELOPE_VERSION=v2 (without v2, encryptWithCurrent emits V1 — defense-in-depth re-parse rejects non-V2 emit). Per-row try/catch + safety abort (sister to AUDIT-022 `:416`) per D4. All audit events best-effort per D5 (`PHI_RECORD_MIGRATED` + `PHI_RECORD_SKIPPED_ALREADY_V2` + `PHI_MIGRATION_FAILURE` + per-batch `PHI_MIGRATION_BATCH_STARTED/_COMPLETED/_FAILED`); auditLogger.ts unchanged. 39 net new tests = 8 keyRotation T-MR-1..T-MR-8 round-trip + 32 script tests sister to AUDIT-022 22-test pattern − 1 PR 1 stub-throw test removed; jest 549/549 (matches 549 − 510 baseline = 39 delta). **Eighth §17.1 architectural-precedent of the arc:** Phase A inventory missed that `migrateRecord` ITSELF, if naively implemented as `prisma.<model>.update`, would route the WRITE through phiEncryption middleware causing double-encrypt; Phase B design caught it; raw SQL bypass via `$executeRawUnsafe` is the fix. Design refinement note: `docs/architecture/AUDIT_016_PR_3_MIGRATION_JOB_NOTES.md` (475 LOC, 12 sections, D1-D9). Operator runbook: `docs/runbooks/AUDIT_016_PR_3_MIGRATION_RUNBOOK.md` (9 sections; sister to AUDIT-022 production runbook). D9 — `rotateKey()` stub remains with updated comment clarifying it's NOT in PR 3 scope: PR 3 is envelope-format upgrade (V0/V1 → V2), `rotateKey()` is ongoing key rotation policy (KEK / PHI_ENCRYPTION_KEY rotation per NIST SP 800-57 365-day cycle); deferred to future PR. AUDIT-016 register status flips OPEN → RESOLVED at this PR's merge.
- **Effort estimate (revised):** ~14-22h implementation (down from original L estimate of 24-40h; reduction = kmsService already-implemented saves 8-15h of KMS service authoring)
- **Cross-references:**
  - `docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md` (design source of truth)
  - `backend/src/services/keyRotation.ts` (interface stubs; implementation deferred)
  - `backend/src/services/kmsService.ts` (305 LOC fully implemented; awaiting wiring in implementation PR 2)
  - AUDIT_METHODOLOGY.md §17.1 (consumer audit precedent; second architectural-precedent finding)
  - AUDIT_METHODOLOGY.md §17.3 (scope discipline — design-phase-only ships; implementation deferred)
  - AUDIT_METHODOLOGY.md §18 (status-surface discipline; codified after this drift)
  - AUDIT-017 (LOW P3) — PHI_ENCRYPTION_KEY length not validated; bundled-eligible with implementation PR 1
  - AUDIT-022 (MEDIUM P2) — Legacy JSON PHI not encrypted at rest; benefits from rotation pattern in eventual re-encryption work; PR 3 of today's session-arc plan
  - HIPAA Security Rule §164.312(a)(2)(iv) (addressable encryption/decryption implementation specification)
  - NIST SP 800-57 Part 1 Rev 5 (cryptoperiod guidance)
  - NIST FIPS 197 (AES algorithm)

### AUDIT-017 — `PHI_ENCRYPTION_KEY` length not validated at startup

- **Phase:** 2B
- **Severity:** LOW (P3)
- **Status:** RESOLVED 2026-05-07 (bundled into AUDIT-016 PR 1 per operator decision D4)
- **Resolution PR:** AUDIT-016 implementation PR 1 — `feat(security): AUDIT-016 implementation PR 1 — V0/V1/V2 envelope schema + V1 emission + AUDIT-017 key validation (bundled)`
- **Resolution evidence:**
  - `backend/src/services/keyRotation.ts` `validateKeyOrThrow()` — checks presence + 64-hex-char length + hex regex; throws `KeyValidationError` (sister to AUDIT-015 fail-loud pattern)
  - `backend/src/middleware/phiEncryption.ts` module init calls `validateKeyOrThrow(ENCRYPTION_KEY)` outside demo mode — invalid key fails fast at startup, not at first encrypt
  - 6 tests in `backend/src/services/__tests__/keyRotation.test.ts §validateKeyOrThrow()` — covers undefined / empty / too-short / too-long / non-hex / valid (64-hex)
  - Cross-referenced from AUDIT-022 `preFlightValidate` (PR #253) which surfaced the awareness as a runtime warning; now formalized as fail-loud validation at module init
- **Original location:** `backend/src/server.ts:38-45` (existence check only). Resolution moved validation into `keyRotation.ts` so it lives with the encryption surface, not the server bootstrap surface.
- **Original severity rationale (preserved):** Operational, not security.
- **Cross-references:** AUDIT-016 (this PR's parent), AUDIT-015 (fail-loud pattern), AUDIT-022 PR #253 (`preFlightValidate` raised this as a warning surface)

### AUDIT-018 — `AuditLog.description` accepts arbitrary input, not encrypted

- **Phase:** 2B
- **Severity:** MEDIUM (P2)
- **Status:** **IN PROGRESS — Phase C SHIPPED 2026-05-07; bundled into AUDIT-075 PR per D3; flips RESOLVED at AUDIT-075 PR merge**
- **Location:** `backend/prisma/schema.prisma` (AuditLog model)
- **Evidence:** All current `writeAuditLog` callers (16 sites) pass non-PHI templated strings. Field accepts arbitrary input.
- **Severity rationale:** Latent risk; no active leak today.
- **Remediation:** Add `description` to `PHI_FIELD_MAP.AuditLog` (D2 layered sanitize-at-write + encrypt-residual approach per AUDIT-075 design refinement note §7); ESLint rule on free-form interpolation in `writeAuditLog` calls is the alternative considered + rejected (encryption is the primary control; lint provides write-time discipline reminder, not control).
- **Effort estimate:** S (1h) — folded into AUDIT-075 ~12-16h bundle
- **2026-05-07 reconciliation note:** Bundled into AUDIT-075 PR per D3 sister-family closure pattern. Status flips IN PROGRESS → RESOLVED at AUDIT-075 PR merge.
- **2026-05-07 Phase C reconciliation:** AuditLog.description added to PHI_FIELD_MAP (`backend/src/middleware/phiEncryption.ts:115`); sanitize-at-write applied at `writeAuditLog` wrapper (`backend/src/middleware/auditLogger.ts:175`; CONSERVATIVE pattern set per design §4.2). Single-point integration eliminates 16-callsite fan-out duplication. Encryption + redaction layered defense live in AUDIT-075 PR branch. AUDIT-016 PR 3 TARGETS extension covers backfill (`scripts/migrations/audit-016-pr3-v0v1-to-v2.ts`; AUDIT-018 sister-bundle attribution inline). Test coverage: Group I.3 sanitized round-trip + Group K.2 callsite integration spy on `prisma.auditLog.create`.

### AUDIT-019 — `FailedFhirBundle` plaintext PHI fragments

- **Phase:** 2B
- **Severity:** MEDIUM (P2)
- **Status:** **IN PROGRESS — Phase C SHIPPED 2026-05-07; bundled into AUDIT-075 PR per D3; flips RESOLVED at AUDIT-075 PR merge**
- **Location:** `backend/prisma/schema.prisma` (FailedFhirBundle model)
- **Evidence:** `errorMessage` and `originalPath` plaintext. FHIR ingest failures typically include partial bundle JSON; S3 paths sometimes carry patient identifiers.
- **Severity rationale:** Failed-bundle table accumulates raw FHIR fragments with potential PHI in clear text.
- **Remediation:** D2 layered sanitize-at-write + encrypt-residual approach (sister to AMBIGUOUS errorMessage columns in AUDIT-075 inventory). Add `errorMessage` + `originalPath` to `PHI_FIELD_MAP.FailedFhirBundle`. 30-day retention prune deferred to operational follow-up (not blocking encryption coverage). Full design in AUDIT-075 design refinement note §7.
- **Effort estimate:** S-M (4-8h) — folded into AUDIT-075 ~12-16h bundle
- **2026-05-07 reconciliation note:** Bundled into AUDIT-075 PR per D3 sister-family closure pattern. Status flips IN PROGRESS → RESOLVED at AUDIT-075 PR merge.
- **2026-05-07 Phase C reconciliation:** FailedFhirBundle.errorMessage + originalPath added to PHI_FIELD_MAP (`backend/src/middleware/phiEncryption.ts:118`); D2 AGGRESSIVE pattern set routing per design §4.2 (FHIR bundle PHI surface justifies opt-in NAME pattern). Zero current write callsites (verified via grep at Step 4); encryption layer covers any future writes (forward-looking). 30-day retention prune deferred to operational follow-up per `docs/architecture/AUDIT_075_PHI_ENCRYPTION_COVERAGE_NOTES.md` §13. AUDIT-016 PR 3 TARGETS extension covers backfill (AUDIT-019 sister-bundle attribution inline at `scripts/migrations/audit-016-pr3-v0v1-to-v2.ts`).

### AUDIT-020 — External FHIR identifiers (`fhir*Id`) plaintext

- **Phase:** 2B
- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Location:** ~8 fields across schema (Patient, Encounter, Observation, Order, Medication, Condition, AllergyIntolerance, Procedure, DeviceImplant)
- **Evidence:** Each `String?` indexed for FHIR sync lookup. Per HIPAA §164.514(b)(2)(i)(R) externally-assigned unique identifiers are PHI.
- **Severity rationale:** DB compromise leaks external EHR identifier; mitigated by tenant isolation. Operational tradeoff: encrypting breaks lookup.
- **Remediation:** Decision matches AUDIT-014 search-key design.
- **Effort estimate:** Bundled with AUDIT-014
- **Cross-references:** AUDIT-014

### AUDIT-021 — `UserSession` model is dead code

- **Phase:** 2B
- **Severity:** INFO
- **Status:** OPEN
- **Location:** `backend/prisma/schema.prisma` (UserSession model)
- **Evidence:** Schema-defined; only reference outside schema is `mfaService.ts:27` comment. Active session management uses `LoginSession`.
- **Severity rationale:** Code hygiene. Increases auth surface area in schema reading.
- **Remediation:** Drop the model + migration to remove the table.
- **Effort estimate:** S (2-4h)

---

### AUDIT-022 — Legacy JSON PHI not encrypted at rest

- **Phase:** 2B-extended (surfaced 2026-04-30 during AUDIT-015 diagnostic)
- **Severity:** MEDIUM (P2)
- **Status:** RESOLVED 2026-05-07 (production-grade tooling shipped; production execution timing is operator-side per runbook)
- **Discovered:** 2026-04-30
- **Resolution PR:** see commit `feat(security): AUDIT-022 Legacy JSON PHI backfill — production-grade migration tooling + operator runbook + 28-column coverage`
- **Resolution evidence (2026-05-07):**
  - Migration script: `backend/scripts/migrations/audit-022-legacy-json-phi-backfill.ts`
  - Test coverage: 22 tests in `backend/tests/scripts/migrations/audit-022-legacy-json-phi-backfill.test.ts` (10 design behaviors + 4 parseArgs + 4 preFlightValidate + 3 confirmation-gate + 1 TARGETS coverage). Full suite: 417/417 passing (395 prior + 22 new).
  - Operator runbook: `docs/runbooks/AUDIT_022_PRODUCTION_RUNBOOK.md` (8 sections — pre-flight, execution, monitoring, post-run validation, rollback, concurrent-write safety)
  - Dev-environment dry-run: targetsScanned=28, targetsSkipped=2 (post §17.1 cleanup), totalLegacyBefore=0, exit code 0
  - Dev-environment --execute: cleanForCloseout=true, totalRowsAttempted=0 (dev DB clean), exit code 0
  - Idempotent re-run: identical output (modulo timestamp), exit code 0
  - Summary artifact: `backend/var/audit-022-execute-{ISO}.json` written each run (gitignored; archived to S3 per runbook §5.3)
- **§17.1 architectural-precedent reframing (2026-05-07):**
  - Original register snapshot reported 11 columns / 6 models / 243 rows. Consumer audit during implementation revealed phiEncryption.ts PHI_JSON_FIELDS map covers 30 (table, column) pairs across 16 models — broader than register snapshot. Migration tooling targets the full middleware surface, not the register snapshot.
  - Two stale references discovered + cleaned up in this PR: `RiskScoreAssessment.inputs` and `InterventionTracking.outcomes` were declared in PHI_JSON_FIELDS but do not exist in `schema.prisma`. Middleware silently no-oped on them; verify-phi-legacy-json.js + migration tooling tripped on them. Removed from middleware + verify script + migration TARGETS array. Active coverage: 28 (table, column) pairs across 15 models post-cleanup.
  - Local-DB migration drift: `CdsHooksSession.fhirContext` + `cards` exist in schema but not in local dev DB (older migration). Production has the columns. Skip-on-missing-column pre-flight handles both classes of drift.
  - Third architectural-precedent example after AUDIT-067/068 (LOINC reference-only) and AUDIT-016 kmsService (305 LOC fully implemented vs register's "scaffolded but unwired").
- **Production-grade tooling pattern (precedent for future PHI-touching migrations):**
  - Confirmation gate: `--execute` requires `AUDIT_022_EXECUTE_CONFIRMED=yes` env var; without it, exit 1 + runbook pointer. Forces operator into runbook flow.
  - Pre-flight env validation: DATABASE_URL + PHI_ENCRYPTION_KEY checked before any DB query. AUDIT-017 awareness on key length (warning, not blocking).
  - Rate-limiting: `--pause-ms` flag (default 100) sleeps between batches AND between targets. Bounds DB load for arbitrary row counts.
  - Summary artifact: every run writes timestamped JSON envelope to `backend/var/audit-022-{mode}-{ISO}.json` for compliance archival (HIPAA §164.312(b)).
  - Backup-reminder warning: --execute prints informational warning before run (informational, doesn't block).
  - Audit trail: dual transport per AUDIT-013 — file (winston DailyRotateFile, 6yr retention) + Console JSON → ECS stdout → CloudWatch Logs. Plus per-batch DB AuditLog entries with `action='PHI_BACKFILL_BATCH'`.
- **Envelope version:** V0 (legacy `enc:iv:authTag:ciphertext`). AUDIT-016 PR 3 will re-encrypt to V1 (KMS-wrapped DEK) once the rotation pipeline ships. V0 → V1 migration is independent of AUDIT-022.
- **Production execution timing:** separate operator-side action outside this PR. Tooling ships ready. Runbook §2 captures pre-flight (RDS snapshot mandatory), §3 execution, §5 validation, §6 rollback. Recommended: off-hours window with maintenance mode or no concurrent writers on PHI_JSON_FIELDS columns.
- **Original location (preserved for historical reference):** 11 JSON columns across 6 models, 243 legacy row-instances per `verify-phi-legacy-json.js` Fargate task run 2026-04-30 (`2e8c333d8bb745ab891a8f13d9061e7e`).
- **Original runtime safety analysis:** `decryptJsonField` gates on `typeof === 'string' && startsWith('enc:')`. Legacy JSON values are `typeof === 'object'`, so they skip the decrypt path entirely and are returned as-is. Cannot cause runtime errors under any flag state.
- **Severity rationale (preserved):** HIPAA §164.312(a)(2)(iv) encryption-at-rest is an addressable implementation specification. PHI stored in plaintext in JSON columns violates the principle even though no runtime exposure exists today.
- **Cross-references:** AUDIT-015 (parallel finding for string columns; same remediation pattern), AUDIT-013 (dual-transport audit logger backing this script's audit trail), AUDIT-016 (V0 → V1 envelope migration follow-on), AUDIT-017 (key validation; surfaced as warning), `docs/runbooks/AUDIT_022_PRODUCTION_RUNBOOK.md` (operator runbook)

---

### AUDIT-024 — Prisma migration runner wraps raw SQL in transactions; CONCURRENTLY index pattern requires multi-step deploy

- **Phase:** Operations / migration tooling
- **Severity:** LOW (P3) — pattern issue, not security
- **Status:** OPEN
- **Tier:** C
- **Detected:** 2026-05-03 during AUDIT-011 Phase a-pre deploy (PR #220)
- **Evidence:** Migration `20260502000000_audit_011_tenant_scoped_unique_keys` used `CREATE UNIQUE INDEX CONCURRENTLY` to avoid write-blocking. Prisma 5.22's migrate runner wraps migration SQL in a transaction; PG rejected with error 25001 ("CREATE INDEX CONCURRENTLY cannot run inside a transaction block"). Production deploy crashlooped on `:144` until rollback to `:143`. Migration row marked `rolled_back_at` via direct UPDATE on `_prisma_migrations` (Fargate one-off task `3e56e40dbe924ff089f5ce2222ce409c`).
- **Workaround applied (PR #221):** Removed CONCURRENTLY from this migration. At pilot-stage row counts the brief SHARE lock during index build is sub-second and acceptable.
- **Remediation:** Investigate proper non-transactional migration pattern for future migrations on larger tables. Options:
  - Apply CONCURRENTLY indexes via direct DB connection before deploying app code (manual ops step, two-PR pattern)
  - Use `prisma migrate diff` to generate SQL, apply out-of-band via Fargate one-off, then `prisma migrate resolve --applied` to mark recorded
  - Investigate if Prisma 5.x has added a `--prisma:no-transaction` directive
- **Effort estimate:** S (2-4h) — research + runbook authoring + one test run
- **Cross-references:** AUDIT-011 (Phase a-pre PR #220 failure), AUDIT-025 (the staging-environment gap that allowed this to ship)

---

### AUDIT-027 — `gdmtEngine.ts` / `gapRuleEngine` redundancy + rule-engine naming convention reconciliation

- **Phase:** Code quality / tech debt
- **Severity:** LOW (P3) — duplication, not security or safety
- **Status:** OPEN (scope expanded 2026-05-03 during CAD audit)
- **Tier:** C
- **Detected:** 2026-05-03 during Phase 0B HF audit; expanded same day during Phase 0B CAD audit
- **Evidence:**
  - (a) GDMT four-pillar logic implemented twice — once in `backend/src/ingestion/gaps/gapRuleEngine.ts` (rules tagged for GAP-HF-001/004/007/010 — beta-blocker, RAASi, MRA, SGLT2i) and once in `backend/src/services/gdmtEngine.ts` (service layer with the same four-pillar logic + contraindication checks). Both paths produce overlapping outputs.
  - (b) Rule-engine naming convention non-uniform: legacy `gap-50-dapt` (CAD module) breaks the canonical `gap-cad-*` prefix convention; cross-module rule `gap-pv-rivaroxaban` is tagged `module: 'CORONARY_INTERVENTION'` despite the `gap-pv-*` naming; HF has `gap-hf-37-fu-discharge` and `gap-hf-37-raas` colliding on same numeric prefix. Rename to canonical pattern (`gap-{module}-{descriptor}`) for consistency.
- **Severity rationale:** Code-level redundancy and naming drift. Risk is divergence over time (rule logic and service drift apart, producing inconsistent gap detection) and reader confusion when grepping for module rules. Currently both paths agree on output so no production impact.
- **Remediation:** Reconcile (a) gdmtEngine.ts / gapRuleEngine duplication AND (b) rule-engine naming convention reconciliation (e.g., legacy `gap-50-dapt` to `gap-cad-dapt-discontinuation`, any other non-canonical IDs surfaced during reconciliation; collision-numbered IDs renamed to descriptors). Decide canonical source: (a) move all GDMT logic to `gdmtEngine.ts` service and have `gapRuleEngine` call it; (b) consolidate in `gapRuleEngine` and deprecate the service; (c) keep both with explicit purpose separation documented.
- **Effort estimate:** S+ (4-6h, was 3-5h) — investigation + consolidation + naming reconciliation + test
- **Cross-references:**
  - `docs/audit/PHASE_0B_HF_AUDIT_ADDENDUM.md` §9 finding HF-04 (gdmtEngine redundancy)
  - `docs/audit/PHASE_0B_HF_AUDIT_ADDENDUM.md` §9 finding HF-01 (numeric prefix collision)
  - `docs/audit/PHASE_0B_CAD_AUDIT_ADDENDUM.md` §9 finding CAD-01 (gap-50-dapt naming)
  - Phase 0A Phase 3 (data layer audit, pending)

---

### AUDIT-028 — Time-unit disambiguation in timeline math (raw scope vs AI-assisted wall-clock)

- **Phase:** Planning / strategy
- **Severity:** LOW (P3) — methodology gap, not production risk
- **Status:** OPEN (will be addressed in v2.0 PATH_TO_ROBUST authorship ~2026-05-19)
- **Tier:** C
- **Detected:** 2026-05-04 during CAD Phase 0B audit (operator surfaced)
- **Evidence:** All hour estimates in `docs/PATH_TO_ROBUST.md` v1.2 §5, audit addenda (PV/HF/CAD), and `BUILD_STATE.md` represent raw work-scope without disambiguating AI-assisted operator wall-clock time. Wall-clock vs work-scope ratios vary significantly by work-type (5-10× speedup for audits/spec mapping/documentation, 3-5× for code generation, 2-3× for code review/clinical authorship, 1.5-2× for architecture/integration testing, 1× for clinical advisor sign-off and production incident response which remain human bottlenecks). Concrete example: CAD audit estimated 6-8h raw scope, actual operator wall-clock ~30-45 min plus ~15-20 min agent-driven analysis.
- **Severity rationale:** Methodology gap that affects strategic-planning accuracy. Without disambiguation, v2.0 timeline math may over-correct (extending too far) or under-correct (extending too little). The "preliminary 7-9 month timeline" in BUILD_STATE.md §9 may translate to 3-6 months wall-clock depending on work-mix assumptions and clinical advisor bottlenecks — that's a 2-3× variance in commitment. Not a production risk; a planning-honesty risk.
- **Remediation:** v2.0 PATH_TO_ROBUST authorship explicitly disambiguates raw scope vs AI-assisted wall-clock for every estimate, states work-mix assumptions per phase, applies multipliers per work-type, identifies human-bottleneck items (clinical advisor sign-off, production incidents), and computes wall-clock projections separately from raw-scope projections. Empirical calibration plan: log actual operator wall-clock minutes for EP/SH/VHD audits (next 3 modules) to back into measured multipliers per work-type.
- **Effort estimate:** folded into v2.0 authorship (~8-12h total, no separate work item)
- **Cross-references:**
  - `docs/audit/PHASE_0B_CAD_AUDIT_ADDENDUM.md` §13 (full caveat)
  - `BUILD_STATE.md` §9 (strategic posture refinement)
  - `docs/PATH_TO_ROBUST.md` v1.2 §5 (raw-scope estimates that need wall-clock disambiguation in v2.0)

---

### AUDIT-025 — Schema migration validation gate (originally framed as "no staging environment")

- **Phase:** Infrastructure
- **Severity:** MEDIUM (P2) — real risk to future schema changes; surfaced via AUDIT-011 deploy failure
- **Status:** OPEN (design complete 2026-05-03; Phase a/b implementation pending)
- **Tier:** B
- **Detected:** 2026-05-03 during AUDIT-011 Phase a-pre deploy
- **Reframed scope (per `docs/audit/AUDIT_025_DESIGN.md` §2 investigation):** Investigation revealed staging Aurora cluster + ECS + deploy pipeline already operational since 2026-04-28 (per CLAUDE.md). Original "no staging environment" framing was inaccurate. Real gap is two-layered: (1) CI uses `prisma db push --force-reset` which bypasses the migration runner entirely; (2) staging deploy fires *parallel* with production post-merge, not as a pre-merge gate.
- **Evidence:** `prisma db push` does not execute migration SQL files and does not wrap operations in transactions the way `migrate deploy` does. The CONCURRENTLY-in-transaction failure that caused PR #220 was therefore invisible to CI. Staging crashlooped identically to production at 18:25-18:35Z UTC on 2026-05-03, proving migration determinism but not the gate (timing was wrong).
- **Severity rationale:** Future schema migrations have no pre-merge verification path against the migration runner's actual semantics. With BSW pilot live and more migrations expected (AUDIT-022 backfill, AUDIT-016 key rotation, future feature schema), this gap will recur without remediation.
- **Remediation:** 2-phase fix using existing infrastructure (no new cluster needed):
  - **Phase a (load-bearing, 1-2h):** New CI job `Migration Validation` runs `prisma migrate deploy` against an isolated postgres:15 service container. Required check before merge.
  - **Phase b (belt-and-suspenders, 1-2h):** New CI job `Staging Migration Validation` runs `prisma migrate deploy` against `tailrd-staging-aurora` directly via STAGING_DATABASE_URL secret. Required check before merge. GitHub Actions concurrency group prevents PR collisions.
  - **Phase c (deferred):** Schema drift verification.
- **Effort estimate:** S (2-4h) — revised down from M (8-12h) after §2 investigation revealed staging cluster already operational. See `docs/audit/AUDIT_025_DESIGN.md` §9 for itemized breakdown.
- **Cross-references:**
  - `docs/audit/AUDIT_025_DESIGN.md` (full design)
  - AUDIT-024 (CONCURRENTLY pattern; remediation depends on AUDIT-025 Phase b being live)
  - AUDIT-022 (next migration that would benefit; 243 PHI rows backfill)
  - AUDIT-011 (the finding that surfaced AUDIT-025 via PR #220 production incident)
  - PR #220, PR #221 (the incident)
  - BSW pilot risk
  - **`AUDIT_025_DESIGN.md` §12.4** proposes an actionable template change for future audit design docs (Pre-flight inventory checklist, scope-speculative tagging on mid-incident register entries). Worth adopting across audits.

---

### AUDIT-029 — Rule-body verification standard for clinical audits

- **Phase:** 0B clinical audit methodology
- **Severity:** LOW (P3) — methodology gap
- **Status:** **RESOLVED 2026-05-04** via PR #234 (canonical audit infrastructure)
- **Detected:** 2026-05-04 during VHD re-audit cycle
- **Evidence:** name-match audits (earlier PV/HF/CAD addenda) overestimated DET_OK by counting registry-id-to-spec-gap-id matches without verifying the rule body actually fires for the spec gap's detection criteria. VHD re-audit demonstrated the divergence: naive 30.5% rule density vs rule-body-verified 23.8% any-coverage. The auto-classifier consistently under-counted relative to addendum claims for the same reason — vocabulary mismatch between spec language and code language requires reading bodies, not just IDs.
- **Severity rationale:** methodology gap that produced over-confident audit results. No production impact, but invalidated portions of three module addenda (PV/HF/CAD) until re-audited with rule-body verification.
- **Resolution:** `docs/audit/AUDIT_METHODOLOGY.md` §3.2 decision rules require evaluator block citation with bodyLineRange; §3.2.1 codifies broad-rule consolidation per-gap evaluation. Canonical crosswalks (`docs/audit/canonical/<MODULE>.crosswalk.json`) enforce mechanical citation via `validateCrosswalk()`. CI gate 5 (`auditCanonical.yml`) rejects any crosswalk with classification != SPEC_ONLY but ruleBodyCite null.
- **Effort estimate:** RESOLVED (ZERO ongoing; methodology is now contract-enforced)
- **Cross-references:**
  - PR #234 (canonical audit infrastructure)
  - `docs/audit/AUDIT_METHODOLOGY.md` §3.2 + §4
  - `docs/audit/PHASE_0B_VHD_AUDIT_ADDENDUM.md` (re-audited under this standard)

---

### AUDIT-030 — Per-gap classification citation requirement

- **Phase:** 0B clinical audit methodology
- **Severity:** LOW (P3) — methodology gap
- **Status:** **RESOLVED 2026-05-04** via PR #234
- **Detected:** 2026-05-04 during VHD re-audit cycle
- **Evidence:** VHD addendum §13 wall-clock inconsistency (claimed 120 min vs ground truth 70 min). T1 mis-classifications surfaced when spec lines weren't cited: VHD-004 and VHD-067 incorrectly labeled T1 SAFETY when CK §6.5 lines 757 and 855 confirm both T2. Inferring tier without citation produced wrong Tier S queue priorities (operator-visible defect: priorities #3 and #4 in the prior queue were based on wrong tier classifications).
- **Severity rationale:** methodology gap with downstream commercial impact (wrong Tier S triage queue could have driven wrong mitigation priorities pre-BSW DUA). RESOLVED via mechanical citation requirement.
- **Resolution:** `docs/audit/AUDIT_METHODOLOGY.md` §4 mandates spec-side citation (specLine + tierMarkerLiteral) and code-side citation (registryId + registryLine + evaluatorBlockName + bodyLineRange) for every crosswalk row. Schema validator rejects rows missing required fields. CI gate 5 enforces.
- **Effort estimate:** RESOLVED
- **Cross-references:**
  - PR #234
  - `docs/audit/AUDIT_METHODOLOGY.md` §4
  - AUDIT-030.D (sub-clause: evaluator inventory completeness)

---

### AUDIT-030.D — Evaluator inventory completeness via multi-pattern detection

- **Phase:** 0B clinical audit methodology (sub-clause of AUDIT-030)
- **Severity:** LOW (P3) — methodology gap
- **Status:** **RESOLVED 2026-05-04** via PR #234
- **Detected:** 2026-05-04 during VHD re-audit cycle
- **Evidence:** VHD re-audit's first pass missed 14 evaluator blocks at lines 10414-10837 in `gapRuleEngine.ts` because it used only the `// Gap VD-N:` comment pattern. Multi-pattern enumeration surfaced VD-PANNUS at line 10414 (under `// VD-NAME:` ID_NAME pattern) which the prior audit had listed as registry-only. Same defect class verified in EP audit (claimed 11 registry-orphans, actual 1 — gap-ep-anticoag-interruption).
- **Severity rationale:** methodology gap where audits running under partial pattern enumeration produced under-reported coverage. The defect surfaces consistently across modules; mitigated only by enumerating all empirically-observed patterns.
- **Resolution:** `docs/audit/AUDIT_METHODOLOGY.md` §5.1 enumerates 5 empirically-observed comment patterns (GAP_MOD_N, GAP_N, ID_NAME, GAP_MOD_NAME, ID_N) with example matches. §5.2 mandates pattern-addition workflow (script update + test + reconciliation re-run before any audit work). `extractCode.ts` implements all 5 patterns; tests assert detection per pattern.
- **Effort estimate:** RESOLVED
- **Cross-references:**
  - PR #234
  - `docs/audit/AUDIT_METHODOLOGY.md` §5
  - AUDIT-030 (parent finding)

---

### AUDIT-031 — GAP-EP-079: pre-excited AF + AVN blocker (CRITICAL SAFETY, uncovered)

- **Phase:** 0B EP clinical audit
- **Severity:** HIGH (P1) — patient safety, spec-explicit `(CRITICAL)`
- **Status:** **RESOLVED 2026-05-05** via new CRITICAL evaluator block + registry entry (this PR). **Tier S queue CLOSED — queue 1 → 0.** All four spec-explicit Tier S items resolved across PRs #238, #240, #241, this PR. AUDIT-031 was the only `(CRITICAL)` safetyClass item; no spec-explicit CRITICAL gaps remain uncovered.
- **Tier:** S (CLOSED)
- **Detected:** 2026-05-04 via canonical audit infrastructure (Tier S queue surfacing)
- **Evidence:** spec line 352 (CK v4.0 §6.2) text "WPW + AF on beta-blocker/CCB/digoxin - risk of VF". Canonical `EP.crosswalk.json` row classification was SPEC_ONLY. No evaluator block detected this scenario. Highest-priority of the 4 Tier S items per spec-explicit `(CRITICAL)` tag indicating VF risk.
- **Severity rationale:** patient-safety risk; uncovered SAFETY classification with `(CRITICAL)` modifier indicating mortality-relevant downside if missed.
- **Resolution:** Added registry entry `gap-ep-079-wpw-af-avn-blocker` to `RUNTIME_GAP_REGISTRY` (line 253) and single-branch CRITICAL evaluator block (line 4131+) in `gapRuleEngine.ts`. Trigger: WPW (I45.6) + AF (I48.x) + any AVN_BLOCKER_CODES_EP079 + !hospice. AVN_BLOCKER_CODES_EP079 = 14 verified RxNorms (8 beta-blockers: metoprolol 6918, carvedilol 20352, bisoprolol 19484, nadolol 7226, atenolol 1202, propranolol 8787, esmolol 49737, labetalol 6185; 2 non-DHP CCBs: diltiazem 3443, verapamil 11170; digoxin: ingredient 3407 + 3 formulations 197604/197605/197606). All RxNorms verified via RxNav per AUDIT_METHODOLOGY.md §16. Switch recommendation: procainamide (8700, post-AUDIT-042 correction) or amiodarone (703); definitive catheter ablation (Class 1). safetyClass: 'CRITICAL' (escalated above 'SAFETY' per spec). Class 3 (Harm) LOE B per 2023 ACC/AHA/ACCP/HRS AFib Guideline. Hospice exclusion (Z51.5) preserved. Single-branch design — categorical inputs only (no labs, no thresholds; no DATA gap branch needed). Canonical pipeline regenerated: EP registry 47 → 48; EP gapsPush 48 → 49; ID_N pattern 2 → 3; `EP.crosswalk.json` row GAP-EP-079 promoted SPEC_ONLY → DET_OK with override pin. 7 new tests in `tests/gapRules/electrophysiology.test.ts` covering all 3 AVN-blocker subcategories (BB/CCB/digoxin) + 4 negative scenarios (no WPW, no AF, on procainamide, hospice). All 342 jest tests passing.
- **Effort estimate:** RESOLVED (~30 min agent including verified-codes-from-prior-session, evaluator authoring, tests, canonical regen, register update)
- **Cross-references:**
  - `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` §3.1 (Tier S queue, now 0 — CLOSED)
  - `docs/audit/canonical/EP.crosswalk.json` row GAP-EP-079 (DET_OK with cite to gap-ep-079-wpw-af-avn-blocker)
  - PR #234 (canonical infrastructure baseline)
  - PR #239 (refreshCites.ts pipeline — third real-world Tier S validation here)
  - PR #242 (AUDIT-042..061 Cat A clinical-code corrections — provided verified procainamide/nadolol RxNorms used in this rule)
  - This PR (registry entry + new CRITICAL evaluator block + override + 7 tests; final Tier S item)

---

### AUDIT-032 — GAP-EP-006: dabigatran in CrCl<30 (SAFETY, uncovered)

- **Phase:** 0B EP clinical audit
- **Severity:** HIGH (P1) — patient safety, spec-explicit `(SAFETY)`
- **Status:** **RESOLVED 2026-05-05** via new SAFETY evaluator block + registry entry (this PR). Tier S queue reduced from 2 to 1 (only EP-079 remains).
- **Tier:** S
- **Detected:** 2026-05-04 via canonical audit infrastructure
- **Evidence:** spec line 312 (CK v4.0 §6.2) text "Dabigatran + severe renal impairment". Canonical `EP.crosswalk.json` row classification: SPEC_ONLY. No CrCl-gated dabigatran SAFETY check in evaluator. Bleeding risk in renal impairment is the documented harm pathway (per FDA prescribing information + 2023 ACC/AHA AFib guideline).
- **Severity rationale:** patient-safety risk; uncovered SAFETY classification.
- **Resolution:** Added registry entry `gap-ep-006-dabigatran-renal-safety` to `RUNTIME_GAP_REGISTRY` (line 240) and 2-branch compound evaluator block at line 4049 in `gapRuleEngine.ts`. Branch 1 (SAFETY): dabigatran (RxNorm 1037045) + eGFR<30 fires Class 3 (Harm) gap with switch-to-apixaban (RxNorm 1364430) or warfarin (RxNorm 11289) recommendation per FDA Pradaxa PI + 2023 ACC/AHA AFib Guideline LOE B. Branch 2 (DATA gap): dabigatran on med list + eGFR undefined fires structured measurement-required gap (fail-loud, no silent default — mirrors EP-RC LVEF-data-required pattern from PR #229). Hospice exclusion (Z51.5) preserved. Canonical pipeline regenerated: EP registry 46 → 47; gapsPush 46 → 48 (+2 from 2-branch); ID_N evaluator pattern 1 → 2; `EP.crosswalk.json` row GAP-EP-006 promoted SPEC_ONLY → DET_OK with override pin. 7 new tests in `tests/gapRules/electrophysiology.test.ts` covering positive/edge/negative/data-gap/hospice scenarios. All 313 jest tests passing.
- **Effort estimate:** RESOLVED (~30 min agent)
- **Cross-references:**
  - `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` §3.1
  - `docs/audit/canonical/EP.crosswalk.json` row GAP-EP-006
  - PR #234 (canonical infrastructure baseline)
  - PR #240 (AUDIT-034 mitigation, prior Tier S resolution pattern)
  - This PR (AUDIT-032 SAFETY evaluator + registry entry)

---

### AUDIT-033 — GAP-EP-017: HFrEF + non-DHP CCB SAFETY — registry entry deferred

- **Phase:** 0B EP clinical audit (related: PR #229 EP-XX-7 mitigation)
- **Severity:** HIGH (P1) — patient safety, spec-explicit `(SAFETY)`
- **Status:** **RESOLVED 2026-05-05** via registry-entry-add (this PR). Tier S queue reduced from 4 to 3.
- **Tier:** S
- **Detected:** 2026-05-04 via canonical audit infrastructure (correction of earlier "naming collision" interpretation)
- **Evidence:** spec line 339 (CK v4.0 §6.2) text "AF + non-DHP CCB in HFrEF (SAFETY). HFrEF on verapamil/diltiazem". Evaluator block `EP-017` at line 4809 in `gapRuleEngine.ts` (added in PR #229 / commit 9ac3806) detects this scenario at runtime — fires SAFETY gap with Class 3 (Harm) classification when HFrEF + on diltiazem (RxNorm 3443) or verapamil (RxNorm 11170). Pre-resolution: no registry entry existed (intentionally deferred per CLAUDE.md observation 'v'); canonical `EP.crosswalk.json` showed SPEC_ONLY at registry-audit level despite runtime detection active.
- **Severity rationale:** patient-safety risk at the audit/registry level; runtime detection was active (mitigated by PR #229), but the missing registry entry meant the gap was invisible to gap-rule provenance tooling and validateCrosswalk gate.
- **Resolution:** Added registry entry `gap-ep-017-hfref-non-dhp-ccb` to `RUNTIME_GAP_REGISTRY` array in `gapRuleEngine.ts` at line 324. Pairs with existing evaluator block `EP-017`. Canonical pipeline regenerated: `EP.code.json` registry count 45 → 46; `EP.reconciliation.json` evaluatorOrphans removed `EP-017`; `EP.crosswalk.json` row GAP-EP-017 promoted SPEC_ONLY → DET_OK with proper cite; `PHASE_0B_CROSS_MODULE_SYNTHESIS.md` Tier S queue 4 → 3 items (EP-079, EP-006, CAD-016 remain).
- **Effort estimate:** RESOLVED (~10 min agent including this register update)
- **Cross-references:**
  - PR #229 (the EP-XX-7 mitigation that added the evaluator)
  - CLAUDE.md observation 'v' (deferred registry update — now closed)
  - `docs/audit/canonical/EP.crosswalk.json` row GAP-EP-017 (DET_OK with cite)
  - AUDIT-027 (rule-engine reconciliation expanded scope)
  - PR #234 (canonical infrastructure that surfaced this gap)
  - This PR (registry-entry-add fix)

---

### AUDIT-034 — GAP-CAD-016: prasugrel + stroke/TIA SAFETY — PARTIAL needs hardening

- **Phase:** 0B CAD clinical audit
- **Severity:** HIGH (P1) — patient safety, spec-explicit `(SAFETY)`
- **Status:** **RESOLVED 2026-05-05** via new SAFETY evaluator block (this PR). Tier S queue reduced from 3 to 2.
- **Tier:** S
- **Detected:** 2026-05-04 via canonical audit infrastructure
- **Evidence:** CK v4.0 §6.4 line 618 spec gap text "Prasugrel + prior stroke/TIA (SAFETY). Prasugrel + stroke/TIA history". Pre-resolution: canonical `CAD.crosswalk.json` row classification was PARTIAL_DETECTION via `gap-cad-prasugrel` — but inspection during this PR's pre-flight surfaced that the cited evaluator covers the OPPOSITE clinical scenario (recommends prasugrel when patient should start it), not the SAFETY contraindication when patient is already on prasugrel with stroke history. The original PARTIAL classification was an auto-classifier token-similarity error. Per FDA Effient (prasugrel) Black-Box Warning + 2023 ACC/AHA Chronic Coronary Disease Guideline Class 3 (Harm), prasugrel + prior ischemic stroke/TIA carries fatal/intracranial bleeding risk.
- **Severity rationale:** patient-safety risk; missing spec-mandated SAFETY contraindication check (auto-classifier mis-pointed at recommendation rule, not contraindication discriminator).
- **Resolution:** Added new SAFETY evaluator block `// CAD-016 SAFETY:` (line 8324+) in `gapRuleEngine.ts` co-located with CAD-PRASUGREL recommendation block. Fires when patient on prasugrel (RxNorm 613391) AND has stroke/TIA history (ICD-10 I63.x cerebral infarction, I64 stroke unspecified, G45.x TIA, Z86.73 history without deficit) AND not in hospice. Recommends switch to ticagrelor (RxNorm 1116632) or clopidogrel (RxNorm 32968) preserving DAPT continuity. Class 3 (Harm) classification. New registry entry `gap-cad-016-prasugrel-stroke-safety` paired to evaluator. Hemorrhagic stroke (I60-I62) intentionally NOT in discriminator — FDA black-box specifically warns about prior ISCHEMIC stroke/TIA. 6 unit tests in `tests/gapRules/coronaryIntervention.test.ts` cover positive (acute stroke I63.5), edge (TIA-only G45.9), edge (distant history Z86.73), negative (no stroke), negative (on ticagrelor not prasugrel), edge (hospice exclusion).
- **Effort estimate:** RESOLVED (~25 min agent including tests, canonical regen, register update)
- **Cross-references:**
  - `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` §3.1 (Tier S queue, now 2 items)
  - `docs/audit/canonical/CAD.crosswalk.json` row GAP-CAD-016 (DET_OK with cite to gap-cad-016-prasugrel-stroke-safety)
  - PR #234 (canonical infrastructure that surfaced this gap)
  - PR #239 (refreshCites.ts pipeline script — first real-world Tier S validation; refreshed 249 cites cleanly)
  - This PR (registry entry + new SAFETY evaluator block + override + 6 tests)

---

### AUDIT-042 through AUDIT-061 — Cat A clinical-code verification batch

- **Phase:** 0B clinical-code verification (new sub-phase initiated 2026-05-05 after EP-079 RxNorm spot-verify surfaced two wrong-drug bugs in canonical valuesets)
- **Severity:** HIGH (P1) for AUDIT-042/044/053/054/055/056/057/058; MEDIUM (P2) for AUDIT-043; LOW (P3) for AUDIT-045/059/060/061
- **Status:** **RESOLVED 2026-05-05** via single fix PR (this entry covers all 14 findings)
- **Detected:** 2026-05-05 via systematic Phase 2 verification — RxNav `properties.json` lookup of every cited code in `cardiovascularValuesets.ts` (Category A). Bug-hit rate: 13/84 codes (15%) in canonical valuesets are wrong-drug or invalid-CUI errors.
- **Findings:**
  - **AUDIT-042** — `RXNORM_QT_PROLONGING.PROCAINAMIDE = '8787'` is propranolol per RxNav. Real procainamide CUI is 8700. QTc safety rule was monitoring propranolol (a beta-blocker — NOT QT-prolonging) and missing actual procainamide.
  - **AUDIT-043** — `BB_CODES_LQTS` / `BB_CODES_SCAD` `'7512'` (commented `// nadolol`) is norepinephrine per RxNav. Real nadolol CUI is 7226. LQTS/SCAD beta-blocker exclusion logic was firing on ICU patients on norepinephrine pressors.
  - **AUDIT-044** — `RXNORM_DIGOXIN.DIGOXIN_IV = '197607'` is a retired aspirin/caffeine/dihydrocodeine combo (`historystatus: NotCurrent`, released 2005, retired 2009). Not digoxin at all.
  - **AUDIT-045** — `RXNORM_DIGOXIN.DIGOXIN_250MCG = '197605'` is actually a 0.2mg capsule (label mismatch); `RXNORM_DIGOXIN.DIGOXIN_ELIXIR = '197606'` is actually a 0.25mg tablet. Codes are valid digoxin formulations but mislabeled.
  - **AUDIT-053** — `RXNORM_FINERENONE.FINERENONE_10MG = '2481926'` and `FINERENONE_20MG = '2481928'` — both `historystatus: UNKNOWN` per RxNav. Invalid CUIs. Real finerenone ingredient is 2562811. Finerenone gap rule never matched any patient prescription in production.
  - **AUDIT-054** — `RXNORM_GDMT.SOTAGLIFLOZIN = '2627044'` is bexagliflozin per RxNav. Real sotagliflozin is 2638675. SGLT2i HF rules were firing on bexagliflozin (a different SGLT2i) and missing actual sotagliflozin (the SOLOIST-WHF drug).
  - **AUDIT-055** — `RXNORM_GDMT.IVABRADINE = '1649380'` invalid CUI (UNKNOWN status). Real ivabradine ingredient is 1649480. HF ivabradine recommendation rule never matched any patient.
  - **AUDIT-056** — `RXNORM_QT_PROLONGING.DOFETILIDE = '135447'` is donepezil (Aricept — Alzheimer's drug). Real dofetilide is 49247. AAD detection + QTc-prolonging detection rules were false-positive on Alzheimer's patients on donepezil and missing patients on actual dofetilide.
  - **AUDIT-057** — `RXNORM_QT_PROLONGING.DRONEDARONE = '997221'` is donepezil hydrochloride 10 MG branded (an SBD for donepezil). Real dronedarone is 233698. EP-DRONEDARONE contraindication rule (advanced HF) was false-positive on Alzheimer's patients.
  - **AUDIT-058** — `RXNORM_ASPIRIN.ASPIRIN_81MG = '198464'` is aspirin 300mg rectal suppository. Real 81mg oral tablet is 243670. DAPT detection missed routine 81mg oral aspirin prescriptions.
  - **AUDIT-059/060/061** — `RXNORM_WARFARIN` formulation labels: `WARFARIN_2MG = '855296'` is actually 10mg tablet; `WARFARIN_5MG = '855318'` is actually 3mg tablet; `WARFARIN_10MG = '855332'` is actually 5mg tablet. Codes valid warfarin but mislabeled. Added `WARFARIN_2MG = '855302'` (verified) + relabeled others to match real strengths.
- **Patient-safety-active subset:** AUDIT-042/044/053/054/055/056/057. Net effect on production: false-positive QTc-safety alerts on Alzheimer's patients (AUDIT-056/057), false-positive QT-prolonging alerts on propranolol patients (AUDIT-042), silent failure on finerenone gap (AUDIT-053) and ivabradine gap (AUDIT-055), wrong-drug surveilled in digoxin toxicity (AUDIT-044), wrong-drug-class match in SGLT2i (AUDIT-054), missed 81mg oral aspirin in DAPT (AUDIT-058).
- **Resolution:** All 14 corrections applied to `cardiovascularValuesets.ts` and inline references in `gapRuleEngine.ts`. Each correction's RxNorm verified via RxNav `properties.json` (authoritative source). 19 new tests added in `tests/terminology/clinicalCodeCorrections.test.ts` covering both positive (real drug detected) and negative (wrong drug no longer false-flagged) for behavior-changing rules. AUDIT_METHODOLOGY.md §11 added: clinical-code verification standard (mandatory RxNav/LOINC/ICD-10 authoritative-source verification at constant authoring + audit cycles).
- **Out of scope (tracked separately):**
  - **AUDIT-052** (architectural) — inline drug-class arrays in `gapRuleEngine.ts` bypass canonical valuesets, producing the divergence vector that allowed AUDIT-042/056/057-equivalent inline copies. Partial mitigation in this PR (inline references to AUDIT-042-061 wrong codes are corrected); full refactor to import from canonical deferred to follow-up.
  - **AUDIT-046 through AUDIT-051** (candidates) — additional inline-array bugs surfaced during Phase 1 inventory but NOT verified yet. Batch 2 of the Phase 0B clinical-code verification work will surface these on a clean tree post this PR.
- **Effort estimate:** RESOLVED (~2 hours agent including 84 RxNav lookups + corrections + 19 tests + canonical regen + register/methodology updates)
- **Cross-references:**
  - PR #234 (canonical audit infrastructure baseline)
  - AUDIT-029 (rule-body verification standard — methodology cousin to §11 added in this PR)
  - This PR (Cat A canonical valueset corrections + inline reference updates + AUDIT_METHODOLOGY.md §11)

---

### AUDIT-035 — `gap-ep-anticoag-interruption` registry-only orphan

- **Phase:** 0B EP clinical audit
- **Severity:** MEDIUM (P2) — registry-without-evaluator code-hygiene + missing clinical content
- **Status:** OPEN
- **Tier:** 2 (v2.0 Phase 1 build work, not Tier S — no SAFETY tag in spec)
- **Detected:** 2026-05-04 via canonical audit infrastructure (`EP.reconciliation.json` registryOrphans)
- **Evidence:** registry entry `gap-ep-anticoag-interruption` at line 1884 in `backend/src/ingestion/gaps/gapRuleEngine.ts` (Perioperative Anticoagulation Management, 2023 ACC/AHA/ACCP/HRS Class 1 LOE B-NR). No evaluator block anywhere in file (verified via multi-pattern grep + canonical reconciliation). Patients with anticoagulation interrupted around procedures have no detection logic for bridging guidance.
- **Severity rationale:** missing clinical content; no patient-safety tag in spec but procedural-decision-support gap that affects perioperative AF management.
- **Remediation:** author evaluator block detecting AF + recent procedure date + OAC discontinuation. Bridging guidance per 2022 ACC/AHA Perioperative Guidelines. Estimated 3-4h (more complex due to procedure-event timing pipeline).
- **Effort estimate:** S-M (3-4h)
- **Cross-references:**
  - `docs/audit/canonical/EP.reconciliation.json` registryOrphans (`gap-ep-anticoag-interruption`)
  - `docs/audit/PHASE_0B_EP_AUDIT_ADDENDUM.md` §4.6 EXTRA rules (registry-only orphan)
  - PR #234

---

### AUDIT-036 — `gap-hf-vaccine-covid` registry-only orphan

- **Phase:** 0B HF clinical audit
- **Severity:** LOW (P3) — registry-without-evaluator code-hygiene + missing clinical content
- **Status:** OPEN
- **Tier:** 3 (lower priority; vaccine guidance evolving with seasonal updates)
- **Detected:** 2026-05-04 via canonical audit infrastructure
- **Evidence:** registry entry `gap-hf-vaccine-covid` at line 2052 in `gapRuleEngine.ts` (COVID Vaccination in HF). No evaluator. CAD has flu vaccine evaluator (line 7632) but no COVID equivalent. Per 2022 AHA/ACC/HFSA Class 1, COVID vaccination is recommended for HF patients.
- **Severity rationale:** missing clinical content; non-safety procedural recommendation.
- **Remediation:** author evaluator block: HF dx + no COVID vaccine immunization record. Estimated 1-2h.
- **Effort estimate:** XS-S (1-2h)
- **Cross-references:**
  - `docs/audit/canonical/HF.reconciliation.json` registryOrphans (`gap-hf-vaccine-covid`)
  - `docs/audit/PHASE_0B_HF_AUDIT_ADDENDUM.md` §4.6 EXTRA rules
  - PR #234

---

### AUDIT-037 — `Math.random()` in `cqlEngine.ts:475` default rule scoring

- **Phase:** Code quality (surfaced during canonical audit work)
- **Severity:** MEDIUM (P2) — CLAUDE.md §14 "NEVER DO" violation; clinical scoring path
- **Status:** OPEN
- **Tier:** B
- **Detected:** 2026-05-04 during register-batch finding inventory
- **Evidence:** `backend/src/cql/cqlEngine.ts:475` returns `score: Math.floor(Math.random() * 100)` for default rule recommendations. Per CLAUDE.md §14 "NEVER DO": "Never use `Math.random()` for any clinical scoring or gap detection logic. Clinical scores must be deterministic and grounded in patient data." cqlEngine.ts is documented as scaffolding (CLAUDE.md §8: "the CQL engine is scaffolding — gap rules run directly via deterministic TypeScript, not CQL"), so the path may not be exercised in production. But the violation remains in source code.
- **Severity rationale:** rule violation in clinical-scoring path. Production impact gated on whether the scaffolding path ever activates; if cqlEngine were enabled (even for testing), this would produce non-deterministic clinical recommendations.
- **Remediation:** either (a) replace with deterministic score derived from rule's evidence attributes (classOfRecommendation + levelOfEvidence weighting), OR (b) remove the default branch entirely if cqlEngine is genuinely dead code. Decide via Phase 0A backend audit Phase 3 (data layer). Estimated 1h.
- **Effort estimate:** XS (1h once decision made)
- **Cross-references:**
  - CLAUDE.md §14 "NEVER DO" rule on Math.random in clinical code
  - CLAUDE.md §8 (cqlEngine documented as scaffolding)
  - `backend/src/cql/cqlEngine.ts:475`

---

### AUDIT-038 — Node 18 LTS deprecation tracking

- **Phase:** Operational debt / Phase 1 prep
- **Severity:** LOW (P3) — not urgent but tracked
- **Status:** OPEN
- **Tier:** B
- **Detected:** 2026-05-05 during register batch inventory
- **Evidence:** Node 18 LTS support ended 2025-04-30 per Node release schedule. Current repo CI runs Node 18 (`.github/workflows/ci.yml` line 14: `NODE_VERSION: '18'`). All CI workflows including the new `auditCanonical.yml` use Node 18. Continuing on EOL Node version blocks security patches and produces CI noise as ecosystem moves to Node 20+ as baseline.
- **Severity rationale:** operational debt; no immediate production risk (production runs in container with pinned Node from Dockerfile, not from CI runner). Risk grows as upstream packages start dropping Node 18 support.
- **Remediation:** upgrade CI matrix to Node 20 LTS. Update workflow `NODE_VERSION` env. Verify all dependencies compatible (`npm ls` + `npm test` on Node 20). Test suite must pass on Node 20 before cutover. Estimated 2-3h.
- **Effort estimate:** S (2-3h)
- **Dependencies:** AUDIT-006 (outdated dependencies) — coordinated upgrade pass.
- **Cross-references:**
  - `.github/workflows/ci.yml` (NODE_VERSION env)
  - `.github/workflows/auditCanonical.yml`, `deploy-staging.yml`, `deploy.yml`, `smoke-test.yml`, `aws-auth-verify.yml`
  - AUDIT-006 (dependency upgrade context)

---

### AUDIT-039 — axios HIGH-severity CVE cluster (5 new advisories 2026-05-04)

- **Phase:** Operational dependency security
- **Severity:** HIGH (P1) — patient/operator data security; multiple CVE pathways
- **Status:** **RESOLVED 2026-05-05** via axios 1.15.0 → 1.16.0 upgrade (PR #236)
- **Tier:** B
- **Detected:** 2026-05-05 via Security Audit gate failure on PR #235 (chore/step-i-register-batch)
- **Evidence:** 5 newly-published advisories affecting axios 1.0.0 – 1.15.1:
  - GHSA-w9j2-pvgh-6h63 — Authentication Bypass via Prototype Pollution Gadget in `validateStatus` Merge Strategy
  - GHSA-pmwg-cvhr-8vh7 — Incomplete Fix for CVE-2025-62718, NO_PROXY Protection Bypassed via RFC 1122 Loopback Subnet (127.0.0.0/8)
  - GHSA-3w6x-2g7m-8v23 — Invisible JSON Response Tampering via Prototype Pollution Gadget in `parseReviver`
  - GHSA-q8qp-cvcw-x6jj — Prototype pollution read-side gadgets in HTTP adapter that allow credential injection and request hijacking
  - GHSA-xhjh-pmcv-23jw — Null Byte Injection via Reverse-Encoding in `AxiosURLSearchParams`
- **Severity rationale:** patient/operator data security; auth bypass + prototype pollution + credential injection are all in the HTTP adapter chain. TAILRD uses axios for Redox webhooks + outbound HTTP calls.
- **Remediation:** `npm audit fix` upgrades axios 1.15.0 → 1.16.0 (non-breaking semver minor; package.json `^1.6.0` constraint preserved). Transitive dep `follow-redirects` ^1.15.11 → ^1.16.0. Verified `npm audit --audit-level=high` returns exit 0 after fix.
- **Effort estimate:** XS (~10 min agent including this register entry)
- **Cross-references:**
  - PR #235 Security Audit failure (`gh run view 25351630120 --log-failed` on chore/step-i-register-batch)
  - PR #236 (axios upgrade)
  - AUDIT-007 (existing moderate uuid/node-cron advisories — distinct chain, separate remediation)

---

### AUDIT-040 — Line-shift handling in canonical pipeline (refreshCites.ts)

- **Phase:** Operational debt / canonical infrastructure
- **Severity:** LOW (P3) — pipeline ergonomics; no production / patient-safety impact
- **Status:** **RESOLVED 2026-05-05** via `backend/scripts/auditCanonical/refreshCites.ts` (this PR)
- **Tier:** B
- **Detected:** 2026-05-05 via PR #238 line-shift propagation discovery
- **Evidence:** PR #238 (AUDIT-033 mitigation) added a 12-line registry entry to `gapRuleEngine.ts`. Every cite in every committed `<MODULE>.crosswalk.json` that references downstream content (registry entries below the insertion point + evaluator blocks below it) became stale — 249 cite line-numbers across 6 modules. The existing `verifyDraft.ts` pipeline preserves stale cite line numbers from drafts when "preserving from addendum" rather than refreshing from current `code.json` (verifyDraft.ts:357-358). PR #238 worked around this with a one-off `.tmp-refresh.ts` script, but future Tier S mitigation PRs (AUDIT-031 GAP-EP-079, AUDIT-032 GAP-EP-006, AUDIT-034 GAP-CAD-016) will add new evaluator blocks producing larger line shifts — the workaround needs to become permanent infrastructure.
- **Severity rationale:** pipeline-ergonomics gap. Failure mode: CI Gate 5 surfaces BODY_LINE_RANGE_MISMATCH / REGISTRY_LINE_MISMATCH errors; without a documented refresh path, contributors hit blocking CI failure with unclear remediation. No production or clinical risk; canonical content is correct, only line-number cites drift.
- **Resolution:** added permanent pipeline script `backend/scripts/auditCanonical/refreshCites.ts` with byte-preservation guarantees (auditNotes, classifications, overrides preserved verbatim; only `registryLine`, `evaluatorBodyLineRange`, `specLine` updated). Cross-module cites (where row's `evaluatorModule` differs from crosswalk's module) refresh against the cited module's `code.json`. Idempotent: zero-change on already-current crosswalks. Fail-loud when registry/evaluator no longer exists (`RegistryIdNotFoundInRefresh`, `EvaluatorBlockNotFoundInRefresh`, `CrossModuleSourceMissing` structured errors). 7 unit tests in `refreshCites.test.ts` cover line-shift updates, content byte-preservation, classification preservation, cross-module refresh, idempotency, and fail-loud behavior. CI Gate 5 error message updated with `refreshCites.ts --all` hint. AUDIT_METHODOLOGY.md §10.4 documents the line-shift workflow.
- **Effort estimate:** RESOLVED (~30 min agent including tests, docs, register entry, workflow hint)
- **Cross-references:**
  - PR #238 (discovery source — AUDIT-033 mitigation that surfaced the line-shift gap)
  - PR #234 (canonical infrastructure that established the cite-line-number invariants)
  - This PR (`refreshCites.ts` permanent script + AUDIT_METHODOLOGY.md §10.4 + workflow Gate 5 hint)
  - `backend/scripts/auditCanonical/verifyDraft.ts:357-358` (preserve-cite logic that produced stale line numbers; not modified by this PR — `refreshCites` is a separate concern from verify)

---

### AUDIT-041 — `applyOverrides.ts` candidate-default mismatch with source-change PR usage

- **Phase:** Canonical infrastructure
- **Severity:** LOW (P3) — pipeline ergonomics; no production / patient-safety impact (overrides are documentation/classification, not runtime logic)
- **Status:** **RESOLVED 2026-05-06** via canonical-default flag flip in `applyOverrides.ts` + `--candidate` opt-in (this PR)
- **Tier:** B
- **Detected:** 2026-05-04 (first surfaced during PR #238 work; recurred 4 times before architectural fix)
- **Evidence:** `applyOverrides.ts` (pre-fix) read and wrote `<MODULE>.crosswalk.candidate.json` only. The committed canonical artifact is `<MODULE>.crosswalk.json`. Two distinct flows existed but the script served only one:
  - **Initial baseline flow** (one-shot per module, ran during PR #234): `verifyDraft → candidate → applyOverrides → manual promote candidate→canonical`. applyOverrides correctly modifies candidate.
  - **Source-change PR flow** (95% of usage; Tier S series, Cat A corrections): `extractCode → extractSpec → reconcile → refreshCites → applyOverrides → renderAddendum → renderSynthesis → validateCanonical`. applyOverrides writes candidate but **canonical is never updated**. Forced manual canonical patches across 4 PRs:
    - PR #238 (AUDIT-033 EP-017) — partial; some override prose drifted
    - PR #240 (AUDIT-034 CAD-016) — manual canonical patch via Edit tool
    - PR #241 (AUDIT-032 EP-006) — manual canonical patch via Edit tool
    - PR #243 (AUDIT-031 EP-079) — manual canonical patch via Edit tool
  - Hit rate on candidate-default for source-change PRs: **0/4 (100% miss)**.
- **Severity rationale:** ergonomic gap — every Tier S / source-change PR required a manual canonical patch step that's easy to forget. No clinical or production risk; override pins are commentary that aids canonical consumers (renderAddendum, validateCanonical) but don't change rule runtime behavior. The recurring pattern was tracked across 4 PRs as architectural debt before this fix.
- **Resolution:** inverted defaults in `backend/scripts/auditCanonical/applyOverrides.ts` per design option (c). Before: `applyOverrides --module EP` writes candidate. After: `applyOverrides --module EP` writes canonical (the common path). Legacy candidate workflow remains accessible via explicit `--candidate` flag for the rare verifyDraft baseline cycle. JSDoc header updated. AUDIT_METHODOLOGY.md §9.1 documents the new convention. 6 unit tests in `tests/scripts/auditCanonical/applyOverrides.test.ts` cover canonical-default mode, --candidate opt-in mode, idempotency (byte-identical re-run via `stableStringify`), missing target file graceful skip, no-op-overrides modules (SH/PV with empty OVERRIDES), and `--all` cross-module deterministic iteration. Hard gate validated pre-flip: no automated caller (CI workflows, package.json scripts, README quickstarts) depended on candidate-default.
- **Architectural note:** candidate files are now stale relative to canonical (the 4 prior Tier S override pins live in canonical only). Per verifyDraft.ts logic, the candidate is always regenerated from scratch when a verifyDraft cycle runs — staleness has no operational impact and is cosmetic only.
- **Effort estimate:** RESOLVED (~30-45 min agent including hard-gate consumer audit, flag flip, 6 tests, methodology section, register entry, no-op pipeline validation)
- **Cross-references:**
  - PRs #238, #240, #241, #243 (4 prior recurrences cited above)
  - PR #234 (canonical infrastructure baseline that introduced the dual-file architecture)
  - `docs/audit/AUDIT_METHODOLOGY.md` §9.1 (new section documenting canonical-default convention)
  - `backend/scripts/auditCanonical/applyOverrides.ts` (the script itself, with inline AUDIT-041 reference)
  - This PR (canonical-default flag flip + --candidate opt-in + 6 tests + methodology update)

---

### AUDIT-046 through AUDIT-063 — Cat D inline-array clinical-code verification batch

- **Phase:** 0B clinical-code verification — Batch 2 (Cat D inline-array verification, follow-up to PR #242 Cat A canonical valuesets)
- **Severity:** HIGH (P1) for AUDIT-046/047/048/050/062; MEDIUM (P2) for AUDIT-049; LOW (P3) for AUDIT-051/063
- **Status:** **RESOLVED 2026-05-06** via single fix PR (this entry covers all 8 findings + AUDIT-052 partial mitigation)
- **Detected:** 2026-05-06 via systematic Phase 2 verification of 50 inline RxNorm arrays in `gapRuleEngine.ts`. Canonical-subset codes (verified in PR #242 Cat A) skipped; 24 unique non-canonical codes RxNav-verified. Bug-rate: **8 of 24 unique codes wrong (33%)** — approximately 2× the Cat A rate (15.5%). The higher rate validates AUDIT-052 architectural concern: inline arrays bypass canonical valuesets, producing the divergence vector.
- **Findings:**
  - **AUDIT-046** — `MRA_CODES_K = ['9947', '37801']` in HF K+ monitoring rule. RxNav truth: 9947 = sotalol (Class III antiarrhythmic, NOT MRA); 37801 = terbinafine (oral antifungal, NOT eplerenone). Codebase comment self-disclosed "spironolactone (using sotalol proxy), eplerenone" — but the "proxy" was wrong-class, and 37801 is unrelated. Rule fired on sotalol/terbinafine patients and never on real MRAs (spironolactone 9997, eplerenone 298869).
  - **AUDIT-047** — `ARNI_CODES = ['1656328']`. Real CUI 1656328 = sacubitril alone, not the sacubitril/valsartan combo. Real combo = 1656339 (canonical RXNORM_GDMT). HF GDMT optimization rule never fired on actual ARNI prescriptions in production.
  - **AUDIT-048** — `ARB_CODES = ['83818', '83515', '52175', '73494']` with comment "losartan, valsartan, irbesartan, candesartan". RxNav truth: 83818 = irbesartan, 83515 = eprosartan, 52175 = losartan (matches), 73494 = telmisartan. So 3 of 4 codes don't match the comment, and valsartan (69749) + candesartan (214354) are missing entirely. HF GDMT rule fired on eprosartan/telmisartan/irbesartan and missed valsartan/candesartan.
  - **AUDIT-049** — `DOAC_CODES_STROKE` and `DOAC_CODES_TEE` = `['1364430', '1232082', '1114195', '1549682']` with comment "apixaban, rivaroxaban, dabigatran, edoxaban". RxNav truth: 1232082 = rivaroxaban 15mg formulation; 1549682 = rivaroxaban-pack (combination product). Both are rivaroxaban-only at the SCD/Pack level; dabigatran (1037045) and edoxaban (1599538) ingredients missing. Stroke / TEE detection rule matched only apixaban + rivaroxaban-formulation patients.
  - **AUDIT-050** — `RATE_CONTROL_CODES_SVT = ['6918', '2991', '11170']` with comment "metoprolol, diltiazem, verapamil". RxNav truth: 2991 returns empty/invalid (not a valid CUI). Real diltiazem ingredient = 3443 (canonical RXNORM_RATE_CONTROL.DILTIAZEM). SVT rate-control rule never matched diltiazem patients.
  - **AUDIT-051** — `ACEI_CODES` last code `'50166'` with comment "benazepril". RxNav truth: 50166 = fosinopril. Drug class still ACEi (correct), but specific drug wrong. Real benazepril ingredient = 18867 (RxNav-verified this PR).
  - **AUDIT-062** — `PPI_CODES_DAPT = ['7646', '36567', '40790', '283742']`. RxNav truth: 36567 = simvastatin (a statin, NOT a PPI). Drug class collision — DAPT co-prescription rule false-fired on patients on simvastatin as if they were on PPIs. Real PPIs (omeprazole 7646, pantoprazole 40790, esomeprazole 283742) preserved.
  - **AUDIT-063** — `LOOP_DIURETIC_CODES_TH` and `LOOP_DIURETIC_CODES_OPT` = `['4603', '4109']` with comment "furosemide, bumetanide". RxNav truth: 4109 = ethacrynic acid (a loop diuretic — class still correct), bumetanide is 1808. Drug class correct; comment wrong; bumetanide added to arrays for full coverage.
- **Patient-safety-active subset:** AUDIT-046, 047, 048, 050, 062 (5 of 8 — silent failure on HF MRA/ARNI/ARB/SVT-rate-control rules + false positive on DAPT-statin patients).
- **AUDIT-052 partial mitigation:** added `RXNORM_QT_PROLONGING.PROPAFENONE = '8754'` (RxNav-verified) to canonical valueset so AAD detection inline arrays can import from canonical instead of redeclaring. Full architectural refactor (new RXNORM_DHP_CCB / RXNORM_PPI / RXNORM_LOOP_DIURETICS valuesets) deferred to focused AUDIT-052 follow-up PR per operator scoping.
- **Resolution:** All 8 corrections applied. Where canonical valuesets cover the drug class (MRA, ARNI, ARB, DOAC ingredients, diltiazem rate control), inline arrays now import from `cardiovascularValuesets.ts` (canonical-import strategy reduces future divergence). AUDIT-051 / 063 are class-correct comment-only fixes plus added benazepril (18867) / bumetanide (1808) ingredient codes. 11 new tests in `tests/terminology/clinicalCodeCorrections.test.ts` cover constant assertions + behavior changes (positive: real drug detected; negative: wrong drug no longer false-flagged for AUDIT-046 K+ monitoring scenario). Pipeline regen: 6/6 modules VALID. AUDIT-041 fix in effect — `applyOverrides.ts (canonical)` mode applied EP=8 overrides (now includes EP-079) without manual canonical patch.
- **Effort estimate:** RESOLVED (~85 min agent including 24 RxNav lookups + 8 corrections + propafenone canonical promotion + 11 tests + comment rephrase to avoid extractCode pattern false-positives + canonical regen + register update)
- **Cross-references:**
  - PR #234 (canonical infrastructure baseline)
  - PR #242 (Cat A canonical valueset corrections — provided verified canonical references used by canonical-import strategy in this PR)
  - PR #245 (AUDIT-041 applyOverrides canonical-default — eliminated manual canonical patch step that this PR's pipeline run consumed)
  - This PR (Cat D inline-array corrections + AUDIT-052 partial mitigation)
  - **AUDIT-052** (architectural follow-up; out of scope for this PR — full refactor of inline arrays to canonical imports)

---

### AUDIT-052 — Inline drug-class arrays bypass canonical valuesets (architectural divergence vector)

- **Phase:** Canonical infrastructure / Phase 0B clinical-code verification
- **Severity:** MEDIUM (P2) — architectural; root cause of Cat D 33% bug rate (vs Cat A 15.5%)
- **Status:** **RESOLVED 2026-05-06** for the 4 major drug-class refactor (DHP CCB / PPI / loop diuretic / thiazide) via this PR. Smaller residual inline arrays may remain for future opportunistic refactor; not blocking.
- **Tier:** B
- **Detected:** 2026-05-04 (initial observation during PR #234 canonical infrastructure work; reserved as AUDIT-052 architectural follow-up); deepened 2026-05-06 (Cat D verification PR #246 surfaced 33% bug rate — 2× Cat A — confirming inline-array bypass as systemic divergence vector)
- **Evidence:** `gapRuleEngine.ts` contained ~50 inline RxNorm arrays. Many redeclared drug classes that already had canonical valuesets in `cardiovascularValuesets.ts`. Where canonical was wrong (Cat A bugs), the inline often inherited the bug. Where canonical was right, the inline often diverged with different codes — sometimes wrong-drug, sometimes wrong-formulation, sometimes invalid CUIs. Cat D verification (PR #246) surfaced 8 wrong-code bugs in 24 unique non-canonical codes (33% rate). Higher rate than Cat A (15.5%) confirms the architectural hypothesis: inline arrays are an unverified divergence vector.
- **Resolution:** Added 4 new canonical valuesets to `cardiovascularValuesets.ts`:
  - `RXNORM_DHP_CCB` (5 DHP CCBs: amlodipine, nifedipine, isradipine, felodipine, nicardipine)
  - `RXNORM_PPI` (5 standard PPIs: omeprazole, pantoprazole, esomeprazole, lansoprazole, rabeprazole)
  - `RXNORM_LOOP_DIURETICS` (4 loop diuretics: furosemide, bumetanide, torsemide, ethacrynic acid)
  - `RXNORM_THIAZIDES` (4 thiazide-class: hydrochlorothiazide, chlorthalidone, indapamide, metolazone)
  - All 18 RxNorms RxNav-verified per AUDIT_METHODOLOGY.md §16.

  Refactored 7 inline arrays to import from canonical:
  - `CCB_CODES_VASOSP` → `codes(RXNORM_DHP_CCB)` (expanded from 3 to 5 DHPs — clinically intended; vasospastic angina rule covers any DHP)
  - `CCB_CODES_RAYNAUD` → `codes(RXNORM_DHP_CCB)` (expanded from 3 to 5 DHPs — Raynaud's first-line is any DHP per ACR/ACC)
  - `CCB_CODES_RAN` → selective `[RXNORM_RATE_CONTROL.DILTIAZEM, RXNORM_DHP_CCB.AMLODIPINE, RXNORM_DHP_CCB.NIFEDIPINE]` (preserves exact 3-drug membership; mixed non-DHP + DHP)
  - `PPI_CODES_DAPT` → `codes(RXNORM_PPI)` (expanded from 3 to 5 PPIs)
  - `LOOP_DIURETIC_CODES_TH` → `codes(RXNORM_LOOP_DIURETICS)` (expanded from 3 to 4 loops; added torsemide)
  - `LOOP_DIURETIC_CODES_OPT` → `codes(RXNORM_LOOP_DIURETICS)` (same expansion)
  - `DIURETIC_CODES_ELEC` → `[...codes(RXNORM_LOOP_DIURETICS), ...codes(RXNORM_THIAZIDES)]` (expanded from 4 drugs to 8 — covers all loops + all thiazides; clinical intent is electrolyte-monitoring on any diuretic)

  Behavior changes documented per-array in inline `// Fix (AUDIT-052, ...)` comments. Behavior expansions are clinically-intent-aligned (rule semantics already cover the drug class; new canonical members make detection complete).

  14 new tests in `tests/terminology/clinicalCodeCorrections.test.ts` cover canonical valueset content + inline-import-pattern assertions + drug-class separation (negative tests confirm wrong-class drugs not pulled in).
- **AUDIT_METHODOLOGY.md §9.2 first end-to-end exercise:** this PR is the first to ship a major refactor under §9.2 (full pipeline regen mandatory after source change). Pipeline ran cleanly: 6/6 modules VALID, 251 cite refreshes propagated automatically, no manual canonical patch (AUDIT-041 canonical-default in effect).
- **Bug-rate evidence supporting closure:**
  - Pre-AUDIT-052: Cat A canonical valuesets 15.5% bug rate, Cat D inline arrays 33% bug rate (2× higher).
  - Post-AUDIT-052: 7 of 7 refactored consumers now derive from canonical → no future divergence path for these classes. Future RxNav-verification work for these drug classes happens at the canonical layer only (one place to update).
- **Architectural notes:**
  - ~43 inline arrays remain (e.g., AAD codes, statin codes, RAAS codes, BB codes for various indications). Many of these are already canonical-derived from prior PRs (PR #242, PR #246). Future opportunistic refactor work can address residuals as they surface in clinical authoring.
  - Optional `pipeline-all.sh` helper script (AUDIT-064 follow-up) would further reduce ergonomics friction.
- **Effort estimate:** RESOLVED (~75 min agent including pre-flight inventory + 7 RxNav lookups for new codes + 4 canonical valueset authoring + 7 inline-array refactors + 14 tests + comment-prefix consistency + full §9.2 pipeline regen + register update)
- **Cross-references:**
  - PR #234 (canonical infrastructure baseline)
  - PR #242 (AUDIT-042..061 Cat A canonical corrections — established the canonical-import pattern)
  - PR #245 (AUDIT-041 canonical-default — eliminated manual canonical patch friction)
  - PR #246 (AUDIT-046..063 + AUDIT-064 — Cat D 33% bug rate provided priority signal; §9.2 codified)
  - This PR (AUDIT-052 4-class refactor closing the major divergence vectors)
  - `docs/audit/AUDIT_METHODOLOGY.md` §16 (clinical-code verification standard) + §9.2 (full-pipeline-regen standard, exercised end-to-end this PR)

---

### AUDIT-065, AUDIT-066, AUDIT-069 — LOINC clinical-concept corrections (Batch 5 partial)

- **Phase:** 0B clinical-code verification — Batch 5 (LOINC, follow-up to PR #246 Cat D + PR #247 AUDIT-052)
- **Severity:** **HIGH (P1)** for all 3 — patient-safety-active silent-failure pattern in CDS rules
- **Status:** **RESOLVED 2026-05-06** via this PR. AUDIT-067 + AUDIT-068 (ABI codes) are documented as separate detail blocks below — both are wrong-concept LOINC bugs but require dedicated architectural fix PR (consumer audit + FHIR bodySite ingestion review). They remain OPEN, pinned with KNOWN BROKEN inline comments + register visibility per operator standard "no half-fixes."
- **Detected:** 2026-05-06 via systematic Phase 5 LOINC verification (29 of 30 codes verified across loinc.org direct + NLM Clinical Tables fallback). Bug-rate among canonical-layer LOINC: **5 wrong-concept of 29 verified = 17.2%** (3 fixed in this PR, 2 ABI deferred). Comparable to Cat A 15.5% canonical-layer rate.
- **Findings (RESOLVED in this PR):**
  - **AUDIT-065** — `QTC_INTERVAL = '8601-7'` per loinc.org = "EKG impression" (a free-text concept, NOT a numeric Q-T interval measurement). QTc safety rule (`labValues['qtc_interval'] > qtcThreshold`) silent-failed on real patient observations because the LOINC code maps to text-impression observations, not numeric Q-T values. Real Q-T interval corrected = **8636-3** (verified loinc.org). Earlier codebase comment noted prior fix from 8867-4 (heart rate) to 8601-7 — but 8601-7 was also wrong; this is the second-iteration correction.
  - **AUDIT-066** — `QRS_DURATION = '8632-2'` per loinc.org = "QRS axis" (degrees, e.g., 60°), NOT QRS duration (ms, e.g., 150ms). CRT eligibility rule (LVEF≤35 + QRS>150ms) was reading axis values: typical QRS axis range is -30° to +120°, so threshold >150 effectively never triggered. CRT-D recommendation rule silent-failed at the rule-input layer. Real QRS duration = **8633-0** (verified loinc.org).
  - **AUDIT-069** — `LVEF = '18010-0'` per NLM Clinical Tables = unverifiable / not in LOINC index (search returns empty; direct loinc.org returns 500). Real canonical LVEF = **10230-1** ("Left ventricular Ejection fraction" verified loinc.org direct + listed in NLM LVEF concept set: `[10230-1, 55406-3, 18043-0, 8811-2, 8810-4, 8808-8, 8806-2]`). **Prior codebase fix-from comment "(was 10230-1 = QRS duration — WRONG)" was itself a regression** — 10230-1 IS LVEF per authoritative sources; the prior "fix" replaced the correct code with an unverifiable one. Every HF rule reading `labValues['lvef']` depended on this LOINC mapping. Verification path: NLM Clinical Tables `/api/loinc_items/v3/search?terms=18010-0` returns empty (only `18010-9 = "Aorta Diam US"` matched), confirming 18010-0 is not a current LOINC concept.
- **Patient-safety-active impact:** All 3 are in actively-deployed CDS rules:
  - QTc safety rule (drug-induced QT prolongation surveillance) — was reading "EKG impression" text
  - CRT-D eligibility rule (LVEF≤35 + QRS>150ms guideline criterion) — was reading QRS axis (degrees)
  - All HF rules reading `labValues['lvef']` (GDMT optimization, ATTR-CM screening, ARNI/SGLT2i prescription, etc.) — were depending on a LOINC mapping that doesn't exist
  In all cases, the rule logic LOOKS correct (`labValues['lvef'] !== undefined && labValues['lvef'] <= 40`) but the data plumbing reads wrong / nonexistent observations. Same wrong-concept-mapped-to-right-name pattern as Cat A RxNorm bugs (AUDIT-056 dofetilide=donepezil).
- **Resolution:** 3 corrections applied to `cardiovascularValuesets.ts`:
  - `QTC_INTERVAL`: 8601-7 → **8636-3** ("Q-T interval corrected")
  - `QRS_DURATION`: 8632-2 → **8633-0** ("QRS duration")
  - `LVEF`: 18010-0 → **10230-1** ("Left ventricular Ejection fraction")
  7 new tests in `tests/terminology/clinicalCodeCorrections.test.ts` cover constant assertions + 3 negative-class-separation assertions + 2 ABI-known-broken pinning tests for AUDIT-067/068 visibility.

  Plus inline Batch 3 minor: E85 amyloidosis comment-precision fix (E85.4 was labeled "Primary AL" but real descriptor per ICD-10-CM 2024 is "Organ-limited amyloidosis"; coverage unchanged because real AL = E85.81 also in valueset).
- **Bug-rate evidence in arc context:**
  - Cat A canonical RxNorm valuesets: 15.5% (PR #242)
  - Cat D inline drug-class arrays: 33% (PR #246)
  - Batch 5 LOINC canonical: **17.2% (3 RESOLVED + 2 deferred = 5/29 in this PR)**
  - Batch 3 ICD-10 canonical: 0% wrong-code (1 comment imprecision LOW, fixed inline)
  - LOINC rate matches Cat A canonical-layer pattern; both ~15-17%. Cat D 33% confirms inline-array bypass amplification.
- **Open items deferred (separate detail blocks below for AUDIT-067/068; bullets here for awareness):**
  - **AUDIT-067 + AUDIT-068** (ABI codes) — wrong-concept LOINC bugs **DEFERRED to dedicated architectural fix PR** per operator standard. Both pinned with KNOWN BROKEN comments in cardiovascularValuesets.ts; register visibility ensures non-silent.
  - **Batch 4** (211 inline ICD-10 startsWith patterns in gapRuleEngine.ts) — verification deferred to follow-up PR per scope discipline.
  - **Batch 6** (96 labValues threshold comparisons) — verification deferred to follow-up PR.
  - **Batch 7 minor** — `EXCLUSION_PREGNANCY = ['O00', 'O09', 'Z33']` narrow scope flagged for operator clinical-intent decision (see this PR's body for explicit question).
- **Effort estimate:** RESOLVED (~110 min agent including pre-flight inventory + 29 LOINC verifications + LVEF NLM verification path + ABI architectural-deferral re-scoping + 3 corrections + Batch 3 E85 comment fix + 7 tests + §9.2 full pipeline regen + register update + course correction)
- **Cross-references:**
  - PR #234 (canonical infrastructure baseline)
  - PR #242 (Cat A canonical RxNorm corrections — sister wrong-concept-mapped-to-right-name pattern)
  - PR #246 (Cat D inline-array corrections + AUDIT-064 §9.2 codification — exercised here)
  - PR #247 (AUDIT-052 partial — sister architectural improvement)
  - `docs/audit/AUDIT_METHODOLOGY.md` §16 (verification standard) + §9.2 (full-pipeline-regen, exercised end-to-end)
  - This PR (Batch 5 LOINC clinical-concept corrections — 3 of 5 RESOLVED; ABI 2 deferred to architectural PR)

---

### AUDIT-067 / AUDIT-068 — ABI canonical LOINC reference-correctness (right-sized per §17.1)

- **Phase:** 0B clinical-code verification — Batch 5 (LOINC) + §17.1 consumer audit (mid-flight scope correction)
- **Severity:** ~~HIGH (P1)~~ → **MEDIUM (P2)** post-consumer-audit (reference-correctness, not active silent-failure; CSV path bypasses LOINC; FHIR path doesn't currently ingest ABI per AUDIT-070 latent gap)
- **Status:** **RESOLVED 2026-05-06** via reference-correctness fix
- **Tier:** B
- **Detected:** 2026-05-06 via Batch 5 LOINC verification (initial framing); architectural picture corrected mid-flight via §17.1 consumer audit
- **Evidence:** `LOINC_CARDIOVASCULAR_LABS.ABI_RIGHT = '44974-4'` = "Pulse intensity of Unspecified artery palpation"; `ABI_LEFT = '44975-1'` = "Q-T interval {Electrocardiograph lead}". Both wrong-concept LOINC codes. Initial framing assumed these participated in active runtime silent-failure on PAD screening rule. **§17.1 consumer audit corrected the assumption:**
  - **Active CSV path** (`patientWriter.ts:91`): writes `observationType='abi_right'`/`'abi_left'` directly from CSV column names, bypassing LOINC entirely. PAD rule fires correctly on CSV-ingested patients today.
  - **FHIR path** (`observationService.ts CARDIOVASCULAR_LAB_CODES`): does not currently include ABI mappings — FHIR-ingested ABI observations don't reach the rule (this is a separate ingestion-coverage gap, filed as AUDIT-070).
  - **Conclusion:** the wrong LOINC codes never participated in any active runtime path. They were reference-correctness bugs (canonical valueset misleading future FHIR ingestion code that consumes it), not silent-failure bugs.
- **§17.1 catch — methodology working as designed:** initial AUDIT-067/068 framing led to 110-min architectural deferral (PR #248) based on assumption that fixing LOINC alone would "break runtime mapping" and "conflate left/right." Consumer audit at this PR's pre-flight verified neither concern applied — the LOINC entries are reference-only. Right-sized fix is canonical correction + JSDoc documentation. The over-scoped framing was caught by the §17 self-review discipline before shipping the wrong-sized PR. **This PR is the §17.1 architectural-precedent reference: consumer audit corrected scope mid-flight.**
- **Resolution:**
  - `LOINC_CARDIOVASCULAR_LABS.ABI_RIGHT`: 44974-4 → **77194-9** ("Ankle-brachial index" verified loinc.org + NLM Clinical Tables)
  - `LOINC_CARDIOVASCULAR_LABS.ABI_LEFT`: 44975-1 → **77194-9** (same canonical; LOINC has no side-specific codes)
  - JSDoc documents architecture: CSV path bypasses LOINC; FHIR path needs `bodySite` extension handling when ABI ingestion enabled (AUDIT-070 dedicated PR)
  - 4 new tests in `tests/terminology/clinicalCodeCorrections.test.ts`: corrected-code constants + ABI-keys-equal + reference-only assertion (greps src/ to verify no active runtime path consumes `LOINC_CARDIOVASCULAR_LABS.ABI_RIGHT/LEFT`)
- **Effort estimate:** RESOLVED (~30 min agent — pre-flight + consumer audit + scope correction + canonical fix + JSDoc + tests + register update)
- **Cross-references:**
  - PR #248 (initial framing; KNOWN BROKEN pinning until architectural fix)
  - This PR (right-sized reference-correctness fix; AUDIT-070 filed for FHIR ingestion gap)
  - **AUDIT-070** (FHIR ingestion expansion gap — separate dedicated PR for `observationService.CARDIOVASCULAR_LAB_CODES` mapping + bodySite handling)
  - `AUDIT_METHODOLOGY.md` §17.1 (correctness — zero half-fixes; consumer audit prevents over-scoped framing)

---

### AUDIT-070 — FHIR ingestion expansion gap: CARDIOVASCULAR_LAB_CODES missing ABI (and other LOINC entries)

- **Phase:** 0B clinical-code verification — surfaced via §17.1 consumer audit during AUDIT-067/068 architectural reframing
- **Severity:** MEDIUM (P2) — latent risk, not active patient-safety. CSV path unaffected; FHIR path inactive for ABI today.
- **Status:** **OPEN** — dedicated FHIR ingestion expansion PR
- **Tier:** B
- **Detected:** 2026-05-06 via §17.1 consumer audit
- **Evidence:** `backend/src/services/observationService.ts CARDIOVASCULAR_LAB_CODES` includes BNP, NT-proBNP, Troponin, CK-MB, lipids, HbA1c, creatinine, eGFR, INR, PT, PTT, D-dimer — but does NOT include LOINC mappings for ABI (77194-9), LVEF (10230-1), QTc (8636-3), QRS duration (8633-0), or others. FHIR-ingested patients with these observations would not reach the gap rules because the LOINC→observationType translation layer doesn't exist for them. Active production path is CSV (patientWriter writes observationType directly from CSV columns); FHIR path is functional for the labs in CARDIOVASCULAR_LAB_CODES but inactive for ABI/LVEF/QTc/QRS.
- **Architectural scope of dedicated PR:**
  1. Audit `LOINC_CARDIOVASCULAR_LABS` — for each entry, verify whether observationService currently maps it. Categorize: mapped ✓ / unmapped (latent gap) / N/A (not used by rules).
  2. Add LOINC mappings to `CARDIOVASCULAR_LAB_CODES` for: ABI 77194-9 (with FHIR `bodySite` extension handling for right/left side discrimination → `observationType='abi_right'`/`'abi_left'`), LVEF 10230-1, QTc corrected 8636-3, QRS duration 8633-0, ferritin 2276-4, TSAT 2502-3, etc.
  3. Implement FHIR `bodySite` extension handling for ABI: same LOINC + bodySite=lower-extremity-right → observationType='abi_right'; bodySite=lower-extremity-left → observationType='abi_left'.
  4. Full-stack tests: simulate FHIR Observation with bodySite = right/left lower extremity → assert correct labValues key population in gapDetectionRunner.
  5. Verify all rules fire correctly on FHIR-ingested patients post-mapping (parity with CSV path).
- **Effort estimate (dedicated PR):** S-M (3-6h) — observationService audit + LOINC mappings + bodySite extension handling + full-stack tests
- **Cross-references:**
  - AUDIT-067 / AUDIT-068 (sister; this gap surfaced via §17.1 consumer audit during their reference-correctness fix)
  - `backend/src/services/observationService.ts CARDIOVASCULAR_LAB_CODES` (lines 40-56)
  - `backend/src/terminology/cardiovascularValuesets.ts LOINC_CARDIOVASCULAR_LABS` (the canonical valueset that should drive observationService mapping)
  - `AUDIT_METHODOLOGY.md` §17.3 (scope discipline — zero silent deferrals; this OPEN entry is the §17.3 visibility mechanism)
  - This PR (AUDIT-067/068 reference-correctness fix that surfaced AUDIT-070 latent gap)

---

### AUDIT-071 — cdsHooks cross-tenant patient lookup + missing fhirPatientId per-tenant unique

- **Phase:** 3 (data layer audit; multi-tenancy enforcement) — surfaced via Phase 3 audit area b (front-loaded high-risk surface per operator decision D1)
- **Severity:** **HIGH (P1)**
- **Status:** **RESOLVED 2026-05-07** (mitigation PR shipped as the work block immediately following Phase 3 audit; production-readiness gate item closed)
- **Resolution PR:** `feat(security): AUDIT-071 cdsHooks tenant isolation + AUDIT-073 schema migration — HIGH P1 production-readiness gate item RESOLVED`
- **§18-dated reconciliation note (2026-05-07):** Phase A pre-flight inventory (during mitigation) expanded the original "2 callsites" framing to **3 vulnerable callsites + production header-skip**:
  - `cdsHooks.ts:121-123` patient.findFirst — original Phase 3 B1 finding
  - `cdsHooks.ts:158-167` cdsHooksSession.create at line 163 sets `hospitalId: patient.hospitalId` — silent cross-tenant SESSION WRITE downstream of cross-tenant READ (newly surfaced)
  - `cdsHooks.ts:298-300` patient.findFirst — sister to the first callsite
  - In production, JWT verification was skipped entirely when `req.body.fhirAuthorization` was absent (lines 98, 193, 279) — bug worse than original framing
  - All 4 issues bundled into AUDIT-071 mitigation per §17.3. Severity stays HIGH P1 per §18 register-literal classification — inventory expansion confirms AND deepens the original framing rather than weakening it.
- **Original location:** `backend/src/routes/cdsHooks.ts:117-123, 294-300`; `backend/prisma/schema.prisma:242, 282`; `backend/src/server.ts:189`
- **Original evidence:** Both cdsHooks endpoints used `const hospitalId = (req as any).user?.hospitalId; ... if (hospitalId) patientWhere.hospitalId = hospitalId; const patient = await prisma.patient.findFirst({ where: patientWhere });`. The conditional filter was structurally always-false because (a) cdsHooks routes were mounted at server.ts:189 under `cdsLimiter` only — not under `authenticateToken`, and (b) `verifyCDSHooksJWT` returned a boolean only — it did not populate `req.user`. Result: cross-tenant patient lookup by `fhirPatientId` in BOTH dev AND production. Reinforced by `Patient.fhirPatientId` having `@@index` only — no per-tenant unique constraint.
- **Severity rationale:** **HIPAA §164.312(a)(1) access control + §164.502 minimum necessary.** Active CDS Hooks endpoint surface that produces clinical recommendations based on cross-tenant patient match. Production-readiness is data-state-independent; the bug exposed nothing today only because there was no production hospital data to expose, but the structural cross-tenant filter bug would expose PHI on the same code path the moment data flowed.
- **Resolution evidence (2026-05-07):**
  - **New `HospitalEhrIssuer` model (1:N from Hospital)** — maps EHR JWT `iss` claim → `hospitalId` for CDS Hooks tenant resolution. `@@unique([issuerUrl])` global uniqueness, `@@index([hospitalId, isActive])` for soft-disable filtering, `onDelete: Restrict` for HIPAA retention.
  - **New `backend/src/middleware/cdsHooksAuth.ts`** — verifies JWT signature against issuer JWKS via `jose@6.2.2`, validates required claims (iss/iat/exp/jti), checks JWT iss matches fhirAuthorization.subject (defends against subject spoofing), looks up HospitalEhrIssuer with `isActive: true` filter, populates `req.cdsHooks = { hospitalId, issuerUrl, ehrIssuerId }`. Discovery + feedback exempt (no PHI). Demo-mode explicitly NOT inherited (would re-introduce the vulnerability).
  - **Refactored `backend/src/routes/cdsHooks.ts`** — replaces conditional with **MANDATORY** `where: { hospitalId: ctx.hospitalId, ... }` filter at all 3 callsites. Mandatory filter at the read site means `cdsHooksSession.create` at line 163 inherits correct tenant by construction (fix-by-construction for the 3rd vulnerable callsite).
  - **`server.ts:189` mount sequence:** `cdsLimiter` → `cdsHooksAuth` → router
  - **Schema migration `20260507000000_audit_071_073_cds_hooks_tenant_isolation`:** `HospitalEhrIssuer` table + `@@unique([hospitalId, fhirPatientId])` on Patient + AUDIT-073 bundled (`@@unique([hospitalId, fhirOrderId])` on Order, `@@unique([hospitalId, fhirCarePlanId])` + `@@index([fhirCarePlanId])` on CarePlan). Pre-flight duplicate check confirmed 0 dups in dev DB.
  - **4 audit actions promoted to `HIPAA_GRADE_ACTIONS`** per AUDIT-076 boundary refinement (D6): `CDS_HOOKS_JWT_VALIDATION_FAILURE`, `CDS_HOOKS_UNMAPPED_ISSUER`, `CDS_HOOKS_CROSS_TENANT_ATTEMPT_BLOCKED`, `CDS_HOOKS_NO_TENANT_RESOLVED`.
  - **14 new tests** in `backend/src/middleware/__tests__/cdsHooksAuth.test.ts` — covers happy path, Path B deny, JWT failures, iss mismatch, unmapped issuer, isActive=false filter, discovery/feedback exemptions, demo-mode non-inheritance, system-identity audit, HIPAA-grade throw propagation. jest 478/478 pass (464 prior + 14 new).
  - **Operator runbook:** `docs/runbooks/AUDIT_071_HOSPITAL_EHR_ISSUER_REGISTRATION.md` (7-section operator playbook)
  - **Design doc:** `docs/architecture/AUDIT_071_CDS_HOOKS_TENANT_ISOLATION_DESIGN.md`
- **Operator decisions captured (D1-D6):** D1 Option 1 (`HospitalEhrIssuer` 1:N) / D2 sub-option 2b (deny non-EHR via 200+empty+audit) / D3 (200+empty for context-resolution; 401 for JWT-signature only) / D4 (do NOT bundle AUDIT-077; separate follow-up PR) / D5 (3 schema unique constraints + CarePlan index) / D6 (4 HIPAA-graded promotions).
- **Cross-references:**
  - `docs/architecture/AUDIT_071_CDS_HOOKS_TENANT_ISOLATION_DESIGN.md` (design doc)
  - `docs/runbooks/AUDIT_071_HOSPITAL_EHR_ISSUER_REGISTRATION.md` (operator runbook)
  - AUDIT-073 (bundled per §17.3 — same schema migration)
  - AUDIT-076 (partial closure via D6 — 4 of the suggested HIPAA-grade promotions land here)
  - AUDIT-013 (dual-transport audit logger pattern preserved)
  - AUDIT-011 (HIGH P1) — Layer 3 Prisma extension is the structural backstop; this PR is a CDS-Hooks-specific Layer 2 fix
  - HIPAA Security Rule §164.312(a)(1) + §164.502(b)

---

### AUDIT-072 — Soft-delete coverage gap + DELETE patient does not cascade

- **Phase:** 3 (data layer audit; soft-delete coverage)
- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Detected:** 2026-05-07 during Phase 3 audit area h (soft-delete coverage)
- **Location:**
  - 6 soft-delete-aware models: User, Patient, Encounter, Observation, Order, Alert (`prisma/schema.prisma` — `deletedAt DateTime?` field on each)
  - 3 route files filter `deletedAt: null`: `routes/patients.ts`, `routes/dataRequests.ts`, `routes/internalOps.ts`
  - All other readers do NOT filter: `ingestion/gapDetectionRunner.ts`, `ingestion/runGapDetectionForPatient.ts`, `routes/cdsHooks.ts`, `routes/cqlRules.ts`, `routes/modules.ts`, `routes/admin.ts`, `routes/gaps.ts`, `routes/godView.ts`, `services/encounterService.ts`, `routes/auth.ts` (uses `!user.isActive` only)
  - `backend/src/routes/patients.ts:368-371` — DELETE soft-deletes Patient row only, no cascade
- **Evidence:** Per-model read-site survey (Phase 3 area h):
  - Patient: 57 read sites; ~6 use `deletedAt: null` filter; ~51 do not.
  - Encounter: 3 read sites; 1 uses filter (patients.ts:398); 2 do not (encounterService.ts:460, archived visitService).
  - Observation: 2 read sites; 1 uses filter (patients.ts:430); 1 does not (archived resultsService).
  - Order: 1 read site; 0 use filter (ordersService.ts:76).
  - Alert: 6 read sites; 0 use filter.
  - User: 27 read sites; 3 use filter (internalOps.ts); 24 do not — auth.ts:50-58, 187-193 use `!user.isActive` as proxy but not `deletedAt` directly.
- **Severity rationale:** Silent soft-deleted-record exposure. PHI from soft-deleted patients can surface in CDS Hooks responses, module dashboards, gap analytics, admin counts, and gap re-evaluation runs. HIPAA-relevant for deceased-patient records and for HIPAA right-to-deletion fulfillment (`PatientDataRequest`) where `dataRequests.ts:451-501` properly cascades but `patients.ts:368-371` simple DELETE does not. Inconsistent cascade semantics between the two delete paths is itself a bug surface.
- **Remediation:**
  1. Apply consistent `deletedAt: null` filter discipline at all read sites for the 6 soft-delete models (audit + retrofit).
  2. `DELETE /api/patients/:id` (`patients.ts:368-371`) must cascade soft-delete to dependent Encounter / Observation / Order / Alert rows. Mirror the discipline in `dataRequests.ts:451-501`.
  3. `auth.ts` login flow add explicit `deletedAt: null` filter alongside `!user.isActive` defense-in-depth.
  4. Consider Prisma middleware to inject `deletedAt: null` automatically for soft-delete-aware models (sister to PHI encryption middleware pattern).
- **Effort estimate:** M (4-8h — audit + retrofit + middleware investigation + tests)
- **Cross-references:**
  - `docs/audit/PHASE_3_REPORT.md` (this audit)
  - AUDIT-011 (tenant isolation Layer 3) — Prisma middleware pattern from that effort applies here

---

### AUDIT-073 — Per-tenant unique constraint gap on Order.fhirOrderId + CarePlan.fhirCarePlanId

- **Phase:** 3 (data layer audit; schema review)
- **Severity:** MEDIUM (P2)
- **Status:** **RESOLVED 2026-05-07** (bundled with AUDIT-071 mitigation per §17.3 — same schema migration)
- **Resolution PR:** see AUDIT-071 RESOLVED entry
- **Detected:** 2026-05-07 during Phase 3 audit area a (schema review)
- **Original location:**
  - `backend/prisma/schema.prisma:425` — `Order.fhirOrderId String?` (line 433: `@@index([fhirOrderId])` only; no per-tenant unique)
  - `backend/prisma/schema.prisma:1928` — `CarePlan.fhirCarePlanId String?` (no index, no per-tenant unique)
- **Original evidence:** Schema had 8 per-tenant uniques on fhir*Id fields (`Encounter`, `Observation`, `Medication`, `Condition`, `Procedure`, `Device`, `Allergy`, `Patient.mrn`). Two fhir*Id fields not covered: `Order.fhirOrderId` and `CarePlan.fhirCarePlanId`. Sister to AUDIT-020 (which addressed the existing 8). Sister to AUDIT-071 fhirPatientId.
- **Severity rationale:** Same family as AUDIT-020 + AUDIT-071. Two tenants could share an EHR-supplied fhirOrderId or fhirCarePlanId without schema rejection, enabling subtle cross-tenant matches if a query were ever written using bare `fhirOrderId` or `fhirCarePlanId`. Defense-in-depth + structural correctness. Production-readiness gate item — data-state-independent.
- **Resolution evidence (2026-05-07):** Schema migration `20260507000000_audit_071_073_cds_hooks_tenant_isolation` adds `@@unique([hospitalId, fhirOrderId])` on Order + `@@unique([hospitalId, fhirCarePlanId])` + `@@index([fhirCarePlanId])` on CarePlan. Pre-flight duplicate check confirmed 0 duplicates in dev DB. Postgres NULL semantics permit multiple rows where `fhir*Id IS NULL` — existing rows with NULL identifiers remain valid post-migration.
- **Cross-references:**
  - `docs/audit/PHASE_3_REPORT.md` (this audit)
  - AUDIT-020 (MEDIUM P2) — sister finding for the existing 8 fhir*Id per-tenant uniques
  - AUDIT-071 (HIGH P1) — bundled per §17.3 (same migration)

---

### AUDIT-074 — Schema-reading hygiene gaps (onDelete defaults + missing hospitalId index)

- **Phase:** 3 (data layer audit; schema review)
- **Severity:** LOW (P3) — hygiene only; no security or correctness impact
- **Status:** OPEN
- **Detected:** 2026-05-07 during Phase 3 audit area a
- **Location:**
  - 14 child-side relations missing explicit `onDelete`: lines 238, 489, 568, 2322, 2338, 2355, 2374, 2397, 2419, 2462, 2483, 2484, 2508, 2509 in `backend/prisma/schema.prisma`
  - 10 models with `hospitalId` field but NO `hospitalId`-leading `@@index`: User, LoginSession, CQLResult, Phenotype, CrossReferral, DrugTitration, QualityMeasure, DeviceEligibility, BreachIncident, FailedFhirBundle
- **Evidence:** 66 explicit `onDelete` declarations exist (53 Restrict / 11 SetNull / 2 Cascade); 14 child-side relations rely on Prisma defaults (NoAction-equivalent, safe but inconsistent). Of 54 models, 10 have `hospitalId` field but no `[hospitalId, ...]`-leading index — tenant-scoped queries on these tables use less-optimal indexes.
- **Severity rationale:** Hygiene only. Default Postgres NoAction is safe for HIPAA retention. Missing `[hospitalId, ...]` indexes have performance impact (full-scan or weaker index pick) but no correctness impact at current scale.
- **Remediation:**
  1. Add explicit `onDelete: Restrict` (or appropriate behavior) to the 14 child-side relations.
  2. Add `@@index([hospitalId, ...])` to the 10 models, leading on `hospitalId` followed by next-most-common filter column.
- **Effort estimate:** S (2-4h — schema edits + migration + verification)
- **Cross-references:**
  - `docs/audit/PHASE_3_REPORT.md` (this audit)

---

### AUDIT-075 — PHI encryption-at-rest coverage gaps (~13-15 columns per PAUSE 1 inventory)

- **Phase:** 3 (data layer audit; PHI encryption coverage)
- **Severity:** MEDIUM (P2) (per §18 register-literal discipline; scope expansion does not auto-promote severity)
- **Status:** **IN PROGRESS — Phase C SHIPPED 2026-05-07; flips RESOLVED at PR merge**
- **2026-05-07 Phase C reconciliation:** Steps 1.0/1/2/3/4/5/6/7 complete.
  - **phiRedaction.ts NEW** (`backend/src/utils/phiRedaction.ts`; 215 LOC; 4 CONSERVATIVE patterns SSN/MRN/EMAIL/PHONE + 1 AGGRESSIVE NAME pattern; module-init `validatePatternsOrThrow` fail-loud; PAUSE 2.5 DOB removed per HIGH-FP analysis on operational ISO timestamps).
  - **PHI_FIELD_MAP +16 columns / 10 models touched** at `backend/src/middleware/phiEncryption.ts:99-122` (CarePlan.description / Recommendation NEW / PatientDataRequest.notes / InternalNote NEW / WebhookEvent.errorMessage / ReportGeneration.errorMessage / UploadJob.errorMessage / AuditLog.description / FailedFhirBundle.{errorMessage, originalPath} / User.{firstName, lastName}). User.email DEFERRED to AUDIT-081 per D4 option-C blind-index requirement.
  - **Sanitize-at-write integration at 5 callsites + writeAuditLog wrapper single-point** (Step 4): `services/webhookPipeline.ts:136,154` + `routes/upload.ts:50,69` + `middleware/auditLogger.ts:175` (single-point wrapper inside `writeAuditLog` — eliminates 16-callsite fan-out duplication).
  - **AUDIT-016 PR 3 TARGETS extension +16 entries** (66 → 82) at `scripts/migrations/audit-016-pr3-v0v1-to-v2.ts`; mirrors PHI_FIELD_MAP at script merge time per AUDIT-022 sister-discipline.
  - **Test coverage: 37 net new tests across this PR's branch (cumulative across all sub-blocks).** 22 phiRedaction unit tests (Groups A/B/C/D/E/F/G + module exports per `backend/src/utils/__tests__/phiRedaction.test.ts`) + 8 phiEncryption round-trip tests (Groups H/I/J in `backend/src/middleware/__tests__/phiEncryption.test.ts`) + 2 callsite-integration tests (Group K in NEW `backend/src/services/__tests__/webhookPipeline-sanitize.test.ts`) + 5 migration shape tests (Step 7 Test 1-5 in `backend/tests/scripts/migrations/audit-016-pr3-v0v1-to-v2.test.ts`; CONCERN B partial-resume idempotency validated via 16-write/82-target run).
  - **Default-suite advances 566 → 603** across this PR's branch (cumulative; +14 from AUDIT-011 PR #262 baseline + Block A/B Phase C delta).
  - **12th §17.1 codified** — column-name-pattern ≠ PHI-candidate-axis (AUDIT-075 PAUSE 1 inventory catch; sister to 10th SCOPE axis = 12th NAME-PATTERN axis; both Phase A inventory catches).
  - **User.email DEFERRED per D4 option-C; AUDIT-081 filed** per Phase C Step 8 (blind-index requirement; sister to AUDIT-014 patient-search pattern).
- **Detected:** 2026-05-07 during Phase 3 audit area d
- **2026-05-07 PAUSE 1 inventory reconciliation:** Original framing named 12 columns (5 errorMessage + 2 description + 2 notes + 3 User PII). PAUSE 1 inventory caught **column-name-pattern ≠ PHI-candidate-axis** (12th §17.1 architectural-precedent of arc; sister to 10th SCOPE axis = 12th NAME-PATTERN axis; both Phase A inventory catches). Inventory reduced register's named-12 by 3 NOT_PHI columns (UserActivity.errorMessage / ErrorLog.errorMessage / Onboarding.notes — all in AUDIT-011 system-bypass models per PAUSE 2.6); expanded by 6+ PHI surfaced via content classification (Recommendation.{evidence, implementationNotes, title} / InternalNote.{content, title} + sister-bundle AUDIT-018 AuditLog.description + AUDIT-019 FailedFhirBundle.{errorMessage, originalPath}). Effective scope ~13-15 columns. Discipline: PHI scope must be classified by content + model context (patient-tied vs system-internal), not by column-name pattern matching. Full scope table + classification + routing in `docs/architecture/AUDIT_075_PHI_ENCRYPTION_COVERAGE_NOTES.md` §1.
- **D1-D6 decisions locked 2026-05-07 (PAUSE 1 → PAUSE 2 transition):**
  - D1: Full inventory scope (~13-15 columns)
  - D2: Layered sanitize-at-write redaction + encrypt-residual for AMBIGUOUS errorMessage columns (WebhookEvent / ReportGeneration / UploadJob)
  - D3: Bundle AUDIT-018 + AUDIT-019 + AUDIT-075 family closure in single PR per §17.3 sister-bundle pattern
  - D4: Bundle User PII (firstName + lastName per design §5; email DEFERRED to AUDIT-XXX-future per blind-index requirement found in PAUSE 1 auth.ts:52 lookup-by-equals constraint)
  - D5: Bundle AUDIT-016 PR 3 TARGETS extension per runbook §6.2 sister-run + deployment-time atomicity
  - D6: 12th §17.1 codified — column-name-pattern ≠ PHI-candidate-axis
- **Location:**
  - `errorMessage` plaintext on 5 tables (sister to AUDIT-019 `FailedFhirBundle`):
    - `WebhookEvent` (`schema.prisma` ~line 558)
    - `UploadJob`
    - `ReportGeneration`
    - `ErrorLog`
    - `UserActivity`
  - `Recommendation.description` plaintext (`Recommendation` model)
  - `CarePlan.description` plaintext (CarePlan.title IS in PHI_FIELD_MAP; description is not)
  - `Onboarding.notes` plaintext
  - `PatientDataRequest.notes` plaintext (HIPAA right-to-deletion flow accepts operator-supplied free-form input)
  - **Sub-finding (defense-in-depth):** `User.email`, `User.firstName`, `User.lastName` plaintext (staff PII; not strict PHI per HIPAA "individually identifiable health information" definition but high-value for offline attacker reconnaissance)
- **Evidence:** `backend/src/middleware/phiEncryption.ts` PHI_FIELD_MAP covers 38 fields across 14 models; PHI_JSON_FIELDS covers 28 fields across 15 models. The above fields are in concerning models (error-tracking, clinical-content free-form, request-fulfillment) but absent from both maps. Same pattern as already-filed AUDIT-018 (`AuditLog.description`) + AUDIT-019 (`FailedFhirBundle.errorMessage` + `originalPath`).
- **Severity rationale:** HIPAA §164.312(a)(2)(iv) addressable encryption/decryption. Error-message tables accumulate raw input fragments that may include partial PHI (same logic as AUDIT-019). Free-form description/notes columns receive operator-supplied PHI-rich content. DB compromise leaks plaintext fragments. Production-readiness gate item — data-state-independent. Today's pre-DUA pre-data-flow state means nothing is currently leaking because nothing is currently in the columns; remediation discipline doesn't depend on that.
- **Remediation:**
  1. Add the 5 `errorMessage` fields, 2 `description` fields, 2 `notes` fields, and 3 `User` PII fields to `PHI_FIELD_MAP` in `phiEncryption.ts`.
  2. Coordinate with AUDIT-018, AUDIT-019, AUDIT-020 if pursuing as a single PR (sister-family PHI coverage hardening).
  3. Re-run `verify-phi-legacy-json.js` and `audit-022-legacy-json-phi-backfill.ts` post-extension to confirm clean state.
  4. Consider source-side sanitization for error tables: redact PHI fragments at write time rather than encrypt-and-store (sister to error-message log redaction patterns).
- **Effort estimate:** S-M (4-8h — PHI map extensions + backfill + tests; coordinate with AUDIT-018/019/020)
- **Cross-references:**
  - `docs/audit/PHASE_3_REPORT.md` (this audit)
  - AUDIT-018 (MEDIUM P2) — `AuditLog.description` plaintext (sister)
  - AUDIT-019 (MEDIUM P2) — `FailedFhirBundle` plaintext PHI fragments (sister)
  - AUDIT-020 (MEDIUM P2) — fhir*Id plaintext (related family)
  - AUDIT-022 PR #253 — `audit-022-legacy-json-phi-backfill.ts` will need to extend coverage post-AUDIT-075 PHI map updates
  - HIPAA §164.312(a)(2)(iv)

---

### AUDIT-076 — `HIPAA_GRADE_ACTIONS` set is narrow; some clinically-significant events are best-effort

- **Phase:** 3 (data layer audit; audit log integrity)
- **Severity:** LOW (P3)
- **Status:** **OPEN — partial closure 2026-05-07** (cumulative 7 promotions across 3 PRs). PR #257 (AUDIT-071): 4 promotions (`CDS_HOOKS_JWT_VALIDATION_FAILURE`, `CDS_HOOKS_UNMAPPED_ISSUER`, `CDS_HOOKS_CROSS_TENANT_ATTEMPT_BLOCKED`, `CDS_HOOKS_NO_TENANT_RESOLVED`). PR #260 (AUDIT-016 PR 2): +2 promotions (`KMS_KEY_VALIDATION_FAILURE`, `KMS_ENVELOPE_DECRYPT_FAILURE`). AUDIT-011 Phase b/c (this PR, 2026-05-07): +1 promotion (`TENANT_GUARD_VIOLATION` — tenant-isolation incident audit trail per HIPAA §164.312(b)). Remaining boundary review (DATA_REQUEST_FULFILLED, BREACH_INCIDENT_CREATED, MFA_ENABLED/DISABLED, INVITE_ACCEPTED, GAP_RESOLVED) deserves its own PR scope per LOW P3 priority.
- **Detected:** 2026-05-07 during Phase 3 audit area e
- **Location:** `backend/src/middleware/auditLogger.ts:77-88` — `HIPAA_GRADE_ACTIONS` Set
- **Evidence:** `HIPAA_GRADE_ACTIONS` contains 10 entries: LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, PHI_VIEW, PHI_EXPORT, PATIENT_CREATED/UPDATED/DELETED, BREACH_DATA_ACCESSED/MODIFIED. Per AUDIT-013 remediation, HIPAA-grade actions THROW on DB write failure (caller surfaces 500); non-HIPAA-grade actions are best-effort (file + Console transports still capture; DB failure logged but not thrown). Several clinically-significant events are NOT HIPAA-graded:
  - `DATA_REQUEST_FULFILLED` (HIPAA right-to-deletion completion)
  - `BREACH_INCIDENT_CREATED`, `BREACH_INCIDENT_UPDATED` (the BREACH_DATA_* actions cover view/modify but not creation/lifecycle)
  - `MFA_ENABLED`, `MFA_DISABLED`
  - `INVITE_ACCEPTED`
  - `GAP_RESOLVED` (clinical decision provenance)
- **Severity rationale:** Per HIPAA §164.308(a)(1)(ii)(D) Information System Activity Review, covered entities must implement procedures to regularly review records of information system activity. The HIPAA-grade subset that throws on DB write failure is too narrow for full compliance posture; events listed above also belong to "information system activity records." File + Console transports capture them, but the throw-on-DB-failure escalation is the strong signal that distinguishes HIPAA-grade from best-effort. LOW P3 because file/CloudWatch capture provides redundant coverage; the gap is procedural rigor, not data loss.
- **Remediation:** Audit existing audit-event call-sites; promote actions matching the criteria above to `HIPAA_GRADE_ACTIONS`. Consider a tier system rather than binary flag (e.g., HIPAA_GRADE_REQUIRED / HIPAA_GRADE_RECOMMENDED).
- **Effort estimate:** XS (30-60 min — set extension + audit of call-site coverage)
- **Cross-references:**
  - `docs/audit/PHASE_3_REPORT.md` (this audit)
  - AUDIT-013 (RESOLVED 2026-04-30) — dual-transport audit logger; this finding refines the boundary policy
  - HIPAA §164.308(a)(1)(ii)(D)

---

### AUDIT-077 — Tenant-isolation defense-in-depth hygiene gaps

- **Phase:** 3 (data layer audit; areas b + f)
- **Severity:** LOW (P3)
- **Status:** OPEN
- **Detected:** 2026-05-07 during Phase 3 audit areas b + f
- **Location:**
  - `backend/src/routes/cqlRules.ts:271, 630` — role-comparison bug
  - `backend/src/routes/dataRequests.ts:478` — `tx.webhookEvent.updateMany({ where: { patientId } })` missing `hospitalId` filter
  - `backend/src/routes/dataRequests.ts:498-501` — `tx.patient.update({ where: { id: patientId } })` uses bare `id` instead of AUDIT-011 `id_hospitalId` composite
  - `backend/src/ingestion/patientWriter.ts:51-56` — same bare-`id` pattern (`prisma.patient.update({ where: { id: existing.id } })`)
- **Evidence:**
  - cqlRules.ts: `req.user?.role?.toLowerCase().replace(/_/g, '-') !== 'SUPER_ADMIN'` is structurally always-true (lowercase-hyphenated `'super-admin'` never equals uppercase-underscored `'SUPER_ADMIN'`). Tenant check ALWAYS RUNS — fail-safe (over-strict, not under-strict) but locks SUPER_ADMIN out of `/api/cql/results/:patientId` routes inconsistent with codebase pattern.
  - dataRequests.ts:478: webhookEvent records have `patientId` FK to a Patient row that's already tenant-scoped, but the explicit `hospitalId` filter is the codebase convention.
  - dataRequests.ts:498-501 + patientWriter.ts:51-56: bare-id update bypasses the AUDIT-011 `id_hospitalId` composite key. Prior queries scoped tenant correctly so this isn't an active leak, but defense-in-depth would use `id_hospitalId`.
- **Severity rationale:** All three are defense-in-depth gaps — no active leak today, but the pattern weakens the multi-layer isolation model that AUDIT-011 design relies on. LOW P3.
- **Remediation:**
  1. cqlRules.ts: fix the role comparison to compare uppercase-underscored against `'SUPER_ADMIN'`.
  2. dataRequests.ts:478: add `hospitalId` to webhookEvent.updateMany WHERE.
  3. dataRequests.ts:498-501 + patientWriter.ts:51-56: convert bare-id updates to `where: { id_hospitalId: { id, hospitalId } }`.
- **Effort estimate:** XS (30-60 min — three small edits + unit tests)
- **Cross-references:**
  - `docs/audit/PHASE_3_REPORT.md` (this audit)
  - AUDIT-011 (HIGH P1) — `id_hospitalId` composite key from Phase a-pre

---

### AUDIT-078 — Production Aurora backup config not in IaC; restore procedure untested

- **Phase:** 3 (data layer audit; backup + restore)
- **Severity:** MEDIUM (P2)
- **Status:** **OPEN — PRODUCTION-READINESS GATE**
- **Detected:** 2026-05-07 during Phase 3 audit area g
- **Location:**
  - `infrastructure/cloudformation/` directory contains only `tailrd-staging.yml` — production Aurora cluster not codified
  - `docs/CHANGE_RECORD_2026_04_29_day10_aurora_cutover.md` — Day 10 cutover snapshot evidence
  - `docs/CHANGE_RECORD_2026_04_29_day11_rds_decommission.md:118-123` — restore procedure documented (4-step recipe), never end-to-end tested
- **Evidence:** Production Aurora cluster `tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com` was provisioned out-of-band (likely manually or via a different mechanism). `BackupRetentionPeriod`, `DeletionProtection`, snapshot lifecycle policy are AWS console state, not version-controlled. Day 10/11 work proved snapshots are taken and tagged for 6-yr HIPAA retention (final pre-decom snapshot: `tailrd-production-postgres-final-pre-decom-20260429`). Restore procedure documented at Day 11 §"If catastrophic discovery" but never executed end-to-end.
- **Severity rationale:** **HIPAA §164.308(a)(7)(ii)(B) Disaster Recovery Plan testing.** Configuration drift between staging (codified) and production (console-managed) creates audit reproducibility risk. Untested restore procedure means RTO is theoretical. Production-readiness gate item — data-state-independent (codified backup posture + proven restore capability is required for production-ready posture; PHI may arrive any day).
- **Remediation:**
  1. Author `infrastructure/cloudformation/tailrd-production.yml` matching production state. Use AWS CLI introspection (`aws rds describe-db-clusters`) to capture current production config; commit as IaC.
  2. Set `BackupRetentionPeriod: 35` (max for Aurora automated backups) on production via the CFN stack import flow.
  3. Set `DeletionProtection: true` on production cluster.
  4. Document snapshot lifecycle: automated daily backups (35-day rolling) + monthly HIPAA-tagged snapshot (6-year retention) per audit needs.
  5. **End-to-end restore test:** restore latest pre-cutover snapshot (`tailrd-production-aurora-pre-cutover-20260428-231342`) into a temporary cluster + `tailrd-production-aurora-restore-test`; verify schema + sample row count parity; document RTO (target <30 min); destroy test cluster.
  6. Bundle into a dedicated operator-side ops PR (separate from app-code PRs).
- **Effort estimate:** M (6-10h — CFN authoring + import + restore-test + runbook)
- **Cross-references:**
  - `docs/audit/PHASE_3_REPORT.md` (this audit)
  - `docs/CHANGE_RECORD_2026_04_29_day10_aurora_cutover.md` (snapshot evidence)
  - `docs/CHANGE_RECORD_2026_04_29_day11_rds_decommission.md` §"If catastrophic discovery" (untested restore procedure)
  - HIPAA §164.308(a)(7)(ii)(B) Disaster Recovery Plan testing requirement

---

### AUDIT-079 — `connection_limit` not explicit in DATABASE_URL nor Prisma client

- **Phase:** 3 (data layer audit; connection pooling)
- **Severity:** LOW (P3) — hygiene only
- **Status:** OPEN
- **Detected:** 2026-05-07 during Phase 3 audit area i
- **Location:** `backend/src/lib/prisma.ts:6` — `new PrismaClient({ log: ... })`; no pool configuration
- **Evidence:** Prisma's default pool size is `num_physical_cpus * 2 + 1`. ECS Fargate task at `vcpu=1` yields default pool of 3 connections — adequate for current scale (single Fargate task, low concurrency, Aurora ServerlessV2 0.5-4 ACU max_connections scales with ACU; default 0.5 ACU ≈ 90 connections). DATABASE_URL does not include `?connection_limit=N` parameter (per Day 10 docs). No PgBouncer / RDS Proxy.
- **Severity rationale:** Hygiene only at current scale. Becomes more material at multi-Fargate-task scale where total connection count = task_count × pool_size and may approach Aurora max_connections. Revisit at multi-tenant production scale.
- **Remediation:**
  1. Add explicit `?connection_limit=N` to DATABASE_URL OR `connectionLimit: N` in PrismaClient config. Suggested baseline: 10 per Fargate task.
  2. At multi-Fargate-task production scale, evaluate RDS Proxy or PgBouncer for connection multiplexing.
- **Effort estimate:** XS (15 min for explicit limit; M for Proxy/PgBouncer evaluation)
- **Cross-references:**
  - `docs/audit/PHASE_3_REPORT.md` (this audit)

---

### AUDIT-080 — Zod validation coverage gap (21 of 26 mutating-route files lack Zod)

- **Phase:** 3 (data layer audit; data validation)
- **Severity:** MEDIUM (P2)
- **Status:** **OPEN — PRODUCTION-READINESS GATE**
- **Detected:** 2026-05-07 during Phase 3 audit area j
- **Location:** 21 of 26 route files with POST/PUT/PATCH endpoints lack Zod schema validation:
  - `auth.ts` (4 mutating endpoints, 0 zod) — login, register, refresh, MFA
  - `mfa.ts` (4 mutating endpoints, 0 zod) — MFA enrollment + verification
  - `admin.ts` (11 mutating endpoints, 0 zod) — admin operations
  - `modules.ts` (15 mutating endpoints, 0 zod) — module dashboard mutations
  - `patients.ts` (2 mutating endpoints, 0 zod) — patient CRUD
  - `cdsHooks.ts` (4 mutating endpoints, 0 zod)
  - `clinicalIntelligence.ts` (6, 0)
  - `cqlRules.ts` (3, 0)
  - `gaps.ts` (1, 0)
  - `godView.ts` (1, 0)
  - `internalOps.ts` (4, 0)
  - `invite.ts` (2, 0)
  - `notifications.ts` (3, 0)
  - `onboarding.ts` (3, 0)
  - `phenotypes.ts` (2, 0)
  - … + others
- **Evidence:** `grep -cE 'z\.object\(\|safeParse\|parse\(' src/routes/*.ts` survey. CLAUDE.md §2 backend stack lists "Zod for request validation" — discipline gap vs stated practice. Files that DO use Zod: `accountSecurity.ts` (4/4), `auditExport.ts`, `breachNotification.ts` (2/2), `dataRequests.ts` (3/4), `files.ts` (2/3).
- **Severity rationale:** Malformed input can produce unexpected behavior. Prisma is type-coerce-permissive on some inputs; missing-required-field handling depends on Prisma's runtime error path. The auth/mfa surfaces are the highest-risk because they're pre-authentication or bootstrapping authentication — input validation is the first line of defense. Implementation discipline gap reaches across most of the codebase.
- **Remediation:** Phased rollout per route-file priority:
  1. **Phase 1 (highest priority):** auth.ts, mfa.ts — pre-auth surface (4-6h)
  2. **Phase 2:** admin.ts, patients.ts, internalOps.ts — privileged-mutation surface (4-6h)
  3. **Phase 3:** modules.ts (highest LOC; 15 endpoints; ~4-6h)
  4. **Phase 4:** remaining 13 files (~4-6h)
  5. Add ESLint rule to require Zod parse on body before any prisma.create/update call (codebase-wide enforcement).
- **Effort estimate:** L (12-20h total across phases)
- **Cross-references:**
  - `docs/audit/PHASE_3_REPORT.md` (this audit)
  - CLAUDE.md §2 (Zod stated as backend stack discipline)

---

### AUDIT-081 — User.email encryption-at-rest deferred (blind-index requirement)

- **Phase:** 3 (data layer audit; PHI encryption coverage; deferred from AUDIT-075)
- **Severity:** MEDIUM (P2) (sister-pattern: AUDIT-014 patient-search blind-index pattern at MEDIUM P2; staff PII not strict-PHI per HIPAA §164.514 but defense-in-depth applies per §164.530(c))
- **Status:** OPEN — DEFERRED per AUDIT-075 D4 option-C; tracked for post-Phase-0 work block
- **Detected:** 2026-05-07 during AUDIT-075 PAUSE 1 inventory; `auth.ts:52` lookup-by-equals constraint surfaced at PAUSE 2 Concern F audit
- **Location:** `backend/src/routes/auth.ts:52` (User.email findFirst with `mode: 'insensitive'` equality match)
- **Evidence:** `prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })`. AES-256-GCM ciphertext is non-deterministic; encrypting User.email at rest breaks login flow because identical plaintext produces different ciphertext on each encrypt call. AUDIT-075 D4 added User.firstName + User.lastName to PHI_FIELD_MAP at Phase C Step 3; User.email DEFERRED per this entry.
- **Severity rationale:** User.email is staff PII (workforce member identifiers) per HIPAA §164.530(c); not strict-PHI per §164.514 (no patient-tied health information). MEDIUM P2 calibration matches AUDIT-014 patient-search blind-index deferral pattern. Defense-in-depth posture — encrypt-at-rest is bonus layer, not primary control (primary controls: tenant isolation per AUDIT-011 + MFA per AUDIT-009 + audit logging per AUDIT-013).
- **Remediation:** Blind-index pattern. Two implementation options:
  - (a) Deterministic-encryption-with-blind-index: separate `email_blind_index` column stores HMAC-SHA256(email + tenant_salt); login flow queries by blind_index; row-fetch decrypts email for verification. Sister to AUDIT-014 patient-search planned approach.
  - (b) Refactor login flow: use email-as-tenant-scoped-blind-index directly via deterministic encryption with global salt. Lower complexity; weaker security property (rainbow-table-resistance).
  - Decision deferred to dedicated work block; ~4-6h estimate including tests + auth flow regression coverage.
- **Effort estimate:** M (4-6h)
- **Cross-references:**
  - AUDIT-014 (patient-search blind-index sister-pattern)
  - AUDIT-075 (deferred-from; design refinement note `docs/architecture/AUDIT_075_PHI_ENCRYPTION_COVERAGE_NOTES.md` §5 D4 option-C captures rejected alternatives)
  - AUDIT-009 (MFA enforcement; same User table; defense-in-depth coordination)
  - HIPAA §164.530(c) (workforce member identifier safeguards)

---

### AUDIT-064 — Partial-pipeline-regen pattern after source-changing operations

- **Phase:** Canonical infrastructure (operational debt surfaced via Cat A → Cat D verification batch arc)
- **Severity:** MEDIUM (P2) — pipeline ergonomics; CI catches the divergence before merge so no production risk, but each recurrence costs ~10-15 min agent + operator review cycle
- **Status:** **RESOLVED 2026-05-06** via AUDIT_METHODOLOGY.md §9.2 codification (this PR's fixup commit chain)
- **Tier:** B
- **Detected:** 2026-05-05 (PR #245 first recurrence — applyOverrides default flip required reconcile/render regen which was missed); 2026-05-06 (PR #246 second recurrence — `// AUDIT-NNN (...)` → `// Fix (AUDIT-NNN, ...)` sed rephrase required reconcile/render regen which was missed). Two recurrences = methodology gap.
- **Evidence:** Both PRs produced commits where extractCode/refreshCites/applyOverrides were re-run but reconcile/renderAddendum/renderSynthesis were not, leaving committed `*.reconciliation.json` + addendum.md + cross-module-synthesis.md files referencing pre-change state. CI `auditCanonical.yml` regenerates these and rejects the divergence, blocking merge.
- **Resolution:** AUDIT_METHODOLOGY.md §9.2 codifies the convention — full pipeline regen mandatory after any source-changing operation. Pipeline order: `extractCode → extractSpec → reconcile → refreshCites → applyOverrides → renderAddendum → renderSynthesis → validateCanonical`. The canonical contract is non-partial; partial pipeline runs are a methodology violation. §9.2 frames the standard as a sister to §1 (rule-body verification, output discipline) and §16 (clinical-code verification, input discipline) — together: §1 covers what audits cite, §16 covers what rules consume, §9.2 covers what PRs commit.
- **Architectural note:** Optional `pipeline-all.sh` / `pipeline-all.ps1` helper script could replace 8 commands with 1 to enforce this via single invocation. Deferred to focused infrastructure PR per scope discipline (out of band for this fixup).
- **Cross-references:**
  - PR #245 (first recurrence — fixed via standalone fixup commit; methodology not codified)
  - PR #246 (second recurrence — fixed via this PR's fixup commit chain; methodology codified)
  - AUDIT_METHODOLOGY.md §9.2 (the codified standard)
  - AUDIT_METHODOLOGY.md §1 (rule-body verification — sister output discipline)
  - AUDIT_METHODOLOGY.md §16 (clinical-code verification — sister input discipline)

---

## Phase status

| Phase | Dimension | Findings count | Status |
|-------|-----------|---------------:|--------|
| 1 | Code quality + tech debt reconciliation | 8 (1 P0, 2 P1, 4 P2, 1 P3, 1 INFO) | COMPLETE 2026-04-29 |
| 2 | Security posture | 14 (0 P0, 7 P1, 5 P2, 1 P3, 1 INFO) | COMPLETE 2026-04-29; Tier S findings RESOLVED 2026-04-30 (AUDIT-009 deployed flag-off, AUDIT-013 + AUDIT-015 RESOLVED); AUDIT-011 pending; AUDIT-022 added 2026-04-30 |
| 3 | Data layer | 10 (1 P1, 5 P2, 4 P3) | COMPLETE 2026-05-07 — CONDITIONAL PASS; production posture NOT production-ready today; 5 production-readiness gate items require immediate remediation (data-state-independent); AUDIT-071 mitigation PR is next work block; see `docs/audit/PHASE_3_REPORT.md` |
| 4 | Operational maturity | 0 | DEFERRED |
| 5 | HIPAA + compliance | 0 | DEFERRED (depends on Phase 1 Tier A + Phase 2) |
| 6 | Module clinical maturity | 0 | DEFERRED |
| 7 | Threat modeling + architecture | 0 | DEFERRED |
| 0B | Clinical audit (canonical) | 13 (0 P0, 4 P1 Tier S, 3 P2, 6 P3, 0 INFO) | COMPLETE 2026-05-04 via PR #234; methodology defects (AUDIT-029, 030, 030.D) RESOLVED; 4 Tier S clinical items (AUDIT-031 through 034) OPEN — separate mitigation PR series; 2 registry orphans (AUDIT-035, 036) OPEN — v2.0 Phase 1 build; AUDIT-037 (Math.random) + AUDIT-038 (Node 18 EOL) OPEN — operational debt |
