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

- **AUDIT-001** — Test coverage 0.87% with auth-critical middleware at 0% (Phase 1, RESOLVED 2026-05-27, PR #307)
- **AUDIT-108** - Production authentication outage (total): every found-User login 500s on fail-closed decrypt of un-backfilled plaintext User.firstName/lastName (encryption-expected since PR #263) (Production incident / data-state, **RESOLVED 2026-06-04** - targeted plaintext->V2 backfill executed + verified on production, PR #342; mitigated - synthetic pre-DUA, zero real-user exposure)
- **AUDIT-113** - Production HTTP 500 on `GET /api/modules/heart-failure/patients`: PHI decrypt-on-read fail-loud on `patients.firstName` V2 envelopes written under non-canonical purpose `phi-migration-v0v1-to-v2` (AUDIT-016 §10.7 carryover). **ESCALATED HIGH -> CRITICAL 2026-06-06** (probe proved the set BROAD: 5,780 / 6,147 firstName = 94% of the demo-medical-city-dallas population, meeting the entry's own ESCALATE-if-broad condition; mitigated synthetic/pre-DUA, no real PHI - sister to AUDIT-108). (Production incident / data-state, **RESOLVED 2026-06-06** - rekey executed on the post-AUDIT-115-fix image: rowsRekeyed=5,780 / skipped=367 / failed=0; verify probe 0 failures across all 4 worklist fields / 6,147 patients; smoke fully green incl `heart-failure/patients: PASS`. §10.7 cross-target carryover FULLY RESOLVED via full-inventory sweep: firstName was the sole real victim; 21 targets proven rekeyed (their per-target counts sum to exactly 495,362) by the 2026-05-16 full sweep, the other 2 abort-skipped targets (`audit_logs.{description,newValues}`) confirmed already-canonical (incl. a 2026-06-07 full-table canonical-decrypt probe of all 14,406 V2 envelopes / 0 failures), all 29 current-V2 targets canonical-decrypt-verified - see detail.)

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
- **AUDIT-016** - No PHI key rotation pattern (Phase 2B, **RESOLVED 2026-05-07** - full implementation arc complete: PR #255 (PR 1 envelope schema + V1 emission + AUDIT-017 bundle) + PR #260 (PR 2 V2 emission + kmsService wiring + per-record EncryptionContext) + PR #261 (PR 3 migrateRecord + V0/V1 → V2 migration script + operator runbook))
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

- **AUDIT-098** - Double-unwrap `dashboard?.data?.summary` silently renders mock KPI on 5 non-HF Executive views + shared ServiceLineKPIBanner under USE_REAL_API (Phase 0A/0C frontend, **RESOLVED 2026-06-01** PR #322)
- **AUDIT-099** - Non-HF Executive views: fabricated KPI cells, no Demo-Data indicator, dead `dashboardError` state (silent-mock on loading/error/empty) (Phase 0A/0C frontend, OPEN)
- **AUDIT-100** - Three DET_OK gap rules carry copy-pasted `evidence` objects with wrong clinical provenance (MRA / RAAS / CAD-statin) (Phase 0B clinical-code, **RESOLVED 2026-06-01** PR #326)
- **AUDIT-101** - gap-cad-statin ingredient-level `STATIN_CODES` cannot encode high-intensity dose - FALSE-NEGATIVE / missed-gap (Phase 0B clinical-code, RESOLVED 2026-06-04 - dose-aware fix PR #347 merged + PAUSE F on-main verification)
- **AUDIT-102** - Two wrong-drug RxNorm miscodes in CAD lipid gates (gap-cad-pcsk9 + gap-cad-omega3) - FALSE-POSITIVE (Phase 0B clinical-code, **RESOLVED 2026-06-02** PR #332)
- **AUDIT-103** - Two more copy-pasted wrong-provenance `evidence` objects (SH-2 TAVR / VD-1 warfarin) + VD-1 LOE contradiction (Phase 0B clinical-code, **RESOLVED 2026-06-02**)
- **AUDIT-104** - Seven more LIVE-gating RxNorm codes wrong-drug or non-current across seven gap rules (Phase 0B clinical-code, **RESOLVED 2026-06-02** PR #332)
- **AUDIT-107** - Post-deploy Login verification regressed on prod ~2026-05-07 (70 consecutive failures); the gate is also non-blocking decoration so deploys ship unverified (Operational maturity / production verification). 2026-06-03 mechanism resolved to HTTP 500 (NOT credential) - the detection-gap finding whose predicted harm materialized as AUDIT-108. **OPEN - credential-slice CLOSED 2026-06-06** (rotated-credential Login 200 + fully-green smoke run 27068065320 post-AUDIT-113-resolution); remaining scope is the SINGLE option-(B) deploy-gating posture decision (B1-B4 enumerated in detail; generalizes to AUDIT-111 step (2))
- **AUDIT-109** - Production 500 error handler emits no exception/stack to CloudWatch; production failures undiagnosable from logs (Operational maturity / observability, **RESOLVED 2026-06-05** - PR #351 (`ad69666`) merged + PAUSE F CloudWatch synthetic-500 verification PASS: redacted Global-error-handler stack line in `/ecs/tailrd-production-backend`, path SSN token -> `[REDACTED-SSN]`, no raw PHI)
- **AUDIT-112** - Post-deploy smoke workflow parse-dead (`jobs: []`) since 2026-06-04: a de-indented `gh issue create --body` continuation in `.github/workflows/smoke-test.yml` (PR #345 / `8ebc932`) broke the YAML block scalar; GitHub's workflow-schema parser rejected every run with HTTP 422, so the entire AUDIT-107 smoke remediation shipped non-functional and never executed once until the parse fix (PR #354). Third member of the silent-red-gate class, sister AUDIT-107 / AUDIT-111 (Operational maturity / production verification, **RESOLVED 2026-06-06** - PR #354 (`87b68e2`) merged; first-ever green-parse dispatch run 27053503619 confirms jobs execute)

> Index reconciliation (2026-06-03): the AUDIT-098 through AUDIT-105 detail entries were filed during the 2026-05-31..06-02 arc WITHOUT their severity-index rows; the rows above (098-104 here in HIGH, 105 in MEDIUM) restore index completeness, and AUDIT-107 is filed with its index row in the same pass. Adding the severity-index row is part of filing discipline going forward (sister to DRIFT-47). AUDIT-099 + AUDIT-101 are the OPEN HIGH items that were missing from this index.

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
- **AUDIT-105** - terminology registries `rxnorm.ts` / `loinc.ts` systematically corrupted (~40 of 68 RxCUIs) AND dead (no gating consumer) (Phase 0B clinical-code, **RESOLVED 2026-06-02** DELETE fork) (index-reconciled 2026-06-03)
- **AUDIT-110** - brittle absolute-line assertions in `tests/scripts/auditCanonical` (extractCode VD-PANNUS commentLine + extractSpec VHD-005 specLine) break on unrelated source line-shifts (catch-#89 class); local pre-push gate set omits the auditCanonical suite (Test-infra robustness, OPEN)
- **AUDIT-111** - staging undeployable for ~1 month: Prisma P3009 on a staging-only failed `_prisma_migrations` row for the AUDIT-011 tenant-unique-keys migration (failed 2026-05-03; prod was fixed, staging was not); the non-blocking post-merge `deploy-staging.yml` gate has been silently red since (Operational maturity / deploy verification, OPEN - surfaced via AUDIT-109 #351 post-merge review; sister AUDIT-107 silent-red-gate / AUDIT-024 / AUDIT-025)
- **AUDIT-114** - smoke `Notify on smoke failure` step executes but its `gh issue create` fails, so the AUDIT-107 alert-only posture silently cannot alert; the `|| echo` fallback masks it as a green step. Two mechanisms: (1) no `permissions: issues: write`; (2) `gh` cannot resolve the repo on a checkout-less job (`GH_REPO` unset). Latent, exposed by the first real smoke run 2026-06-06 (run 27053503619); same silence class as AUDIT-107 / AUDIT-111 / AUDIT-112 (Operational maturity / production alerting, **RESOLVED 2026-06-07** - PR #361 (issues:write + un-swallow) + PR #362 (GH_REPO); synthetic alert-path verified end-to-end: red run 27107094279 -> notify SUCCESS -> issue #363 filed + closed; green run 27107112514 clean)
- **AUDIT-115** - `audit-016-pr3-v2-rekey-purpose.ts` all-skip-per-batch safety abort misfires on a FRONT-LOADED canonical distribution (leading already-canonical rows by id trip the abort before the rekeyable records at higher ids), producing a silent exit-0 no-op (`rowsRekeyed=0`); it halted the AUDIT-113 firstName rekey at batch 1 and was caught only by the operator `rowsRekeyed~=5,780` count invariant, NOT the exit code (which was 0). Zero mutation. Prior blast radius (corrected): the SAME abort silently skipped 3 targets (firstName + audit_logs.{description,newValues}) in the 2026-05-16 495,362-row full production sweep - see detail. (Tooling correctness / migration scripts, **RESOLVED 2026-06-06** PR #357 - abort removed, cursor non-progress tripwire added, GROUP G LOOP-1 updated + LOOP-4/LOOP-5 added; sister silent-success class to AUDIT-112 parse-dead / AUDIT-107 / AUDIT-111)

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
- **AUDIT-075** — PHI encryption-at-rest coverage gaps (~13-15 columns per PAUSE 1 inventory; bundles AUDIT-018 + AUDIT-019 per D3) (Phase 3, **RESOLVED 2026-05-08 via PR #263** (squash-merge `48eac39`); sister-bundle AUDIT-018 + AUDIT-019 also RESOLVED; 12th §17.1 architectural-precedent codified; AUDIT-081 filed for User.email blind-index deferral)
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
- **AUDIT-106** - RUNTIME_GAP_REGISTRY (id-keyed) vs inline `gaps.push` evidence (status/module-keyed, no id) share no join key, so A<->B cross-structure provenance is unguarded; B-internal axis IS gated by the evidence-object validator (Phase 0B clinical-code verification, OPEN - deferred gate-coverage gap, fuzzy-match only, not a live clinical defect)
- **AUDIT-116** - `audit-016-pr3-v0v1-to-v2.ts` v0/v1-to-v2 JSON discovery/count filters ignore the JSON `"`-quote prefix (compared `::text LIKE 'enc:%'` against a jsonb-stored `"enc:v2:..."`), mis-bucketing JSON-v2 as plaintext AND silently MISSING any JSON-column v0/v1 envelope. **Downgraded MEDIUM (P2) -> LOW (P3) 2026-06-07** per the entry's own downgrade path: the 28-target JSON census (ECS task `0a1b286c`) found **v0=0 / v1=0 across ALL 28 json targets** -> zero migration victims; realized impact was cosmetic mis-bucketing only. (Tooling correctness / migration scripts, **RESOLVED 2026-06-07** - quote-aware kind-aware filters + 3 tests mirroring the rekey script; sister to AUDIT-115; promoted from the `AUDIT-XXX-future-v0v1-json-discovery-filter` placeholder per branch `...-116-jsonfilter`)

### INFO

- **AUDIT-008** — Tech debt register has #27 gap (Phase 1, OPEN)
- **AUDIT-021** — `UserSession` model is dead code (Phase 2B, OPEN)

---

## Full findings detail

### AUDIT-001 — Test coverage 0.87% with auth-critical middleware at 0%

- **Phase:** 1
- **Severity:** CRITICAL (P0)
- **Status:** RESOLVED 2026-05-27
- **Resolution:** RESOLVED 2026-05-27 at AUDIT-001.E closure PR merge (commit 950611f squash-merged as 3817d7d9833c406af8ef185a8374f2156fe97a3f mergedAt 2026-05-27T23:58:25Z UTC); 7 of 7 source files EXTENDS COMPLETE on main; 256 NEW tests authored across 4 feat-audit catalyst PRs (PR #299 + #301 + #303 + #305); 95.5%+ avg coverage across 7 middleware source files (csrfProtection 100/100/100/100 + authRateLimit 100/100/100/100 + cognitoAuth 98.8/94.28/100/100 + auditLogger 96.66/100/100/96.55 + phiEncryption 99.01/98.36/100/98.95 + auth.ts 97.11/95.65/90/98.93 + tierEnforcement 98.75/97.56/100/100); 4 §17.1 entries codified (Entry 28 documentation-claim-vs-canonical-state + Entry 29 defensive-native-require acceptance + Entry 30 jsonwebtoken-strict-validator-induced-test-infrastructure-adaptation + Entry 31 cwd-persistence-across-tool-invocations); 2 in-scope parked items remediated (jest.config.js moduleNameMapping typo + phiEncryption.test.ts legacy 17 em-dashes); 5 parked items moved to separate AUDIT entries (jest worker force-exit + axios CVE en-dash + legacy register em-dash wrapper text + Phase 1 §5 line-count drift + Phase 1 §5 acceptance-criteria mis-scoping); 63+ cumulative V.5-RECOVERY canonical-grep catches sustained across full arc.
- **Resolution PR:** #307
- **Discovered:** 2026-04-29
- **Location:** `backend/src/middleware/{auth,auditLogger,phiEncryption,csrfProtection,tierEnforcement,cognitoAuth,authRateLimit}.ts` and ~80% of `backend/src/services/*` and `backend/src/routes/*`
- **Evidence:** `npm test -- --coverage --silent --passWithNoTests --coverageReporters=text-summary` produces `Statements 0.87% (99/11330), Branches 0.36%, Functions 1.06%, Lines 0.88%`. Auth middleware coverage breakdown in `docs/audit/PHASE_1_REPORT.md` §4.4.
- **Severity rationale:** HIPAA-regulated PHI system; auth, audit-logging, PHI-encryption, CSRF, and tenant-tier middleware all at 0%. Would fail any enterprise due-diligence review or formal HIPAA Security Rule §164.312(b) / §164.308(a)(8) evaluation. Every prior auth bug surfaced was discovered in production, never pre-merge.
- **Current production state:** finding does NOT indicate active risk to current pilot users. Production is observable, error rate 0/24h, Aurora cutover validated through 76 soak monitor invocations, middleware exercised by every authenticated request. P0 reflects audit-defensibility and scaling readiness — not active operational risk. Existing pilot users are safe; finding blocks scaling to additional health systems without Tier A.
- **Remediation:** Tiered roadmap per `docs/audit/PHASE_1_REPORT.md` §5 AUDIT-001. Tier A (40-60h) covers all 7 auth-critical middleware files to 80%+ — must land before any new pilot user.
- **Effort estimate:** Tier A 40-60h (M-L); A+B 120-180h; A+B+C 240-380h
- **Dependencies:** Tier A blocks Phase 5 (HIPAA gap analysis). Phase 2 (Security posture) audit will reinforce this finding.
- **Cross-references:** Tech debt #3 (MFA), #4 (refresh token), #5 (`authorizeHospital`) all live in 0%-coverage files — reinforced by triple signal in Phase 1 report §4.5.
- **Status note:** 2026-05-26 AUDIT-001 file 1 of 7 (phiEncryption.ts) Tier A coverage extension COMPLETE per PR #299 feat-audit catalyst PR merge (commit be682d4 squash-merged as 5fd4a2ca6eb8c334302fc7b4819ba79cd61cc72a mergedAt 2026-05-26T20:06:40Z UTC); +797 lines test authoring (1248 total; 1 NEW describe + 9 nested sub-describes (e through m) + 33 NEW tests; 51 total tests PASS); coverage delta 61.76 to 99.01 Statements + 44.26 to 98.36 Branches + 83.33 to 100 Functions + 62.50 to 98.95 Lines (all 4 dimensions exceed 90% Tier A acceptance per Phase 1 §5); Q-A.A1 Path (b) extension-required + Q-A.A2 Path (b) comprehensive Tier A + Q-AUDIT-001-A Path (b) 7-file scope + Q-AUDIT-001-C Path (c) grouped-PR-by-domain-pair operator decisions LOCKED; 37 cumulative V.5-RECOVERY canonical-grep catches sustained; sister-precedent PR #294 feat-audit catalyst-PR pattern + IMPLEMENT-2A/2B/2C atomic-test-authoring discipline; legacy 17 em-dashes in phiEncryption.test.ts lines 18-442 carried forward per Q-RESUME.AUTH-A operator decision (separate cleanup Q at AUDIT-001.E closure); jest.config moduleNameMapping typo parked per SCOPE.LOCK side-finding (future AUDIT entry candidate); file 1 of 7 ONLY at this work block; full AUDIT-001 Status flip OPEN to RESOLVED deferred to AUDIT-001.E closure PR after P1.AUDIT-001.B + .C + .D sub-PRs merge.
- **Status note:** 2026-05-26 AUDIT-001 file 2 of 7 (auth.ts + tierEnforcement.ts auth-decision domain pair) Tier A coverage extension COMPLETE per PR #301 feat-audit catalyst PR merge (commit 6e782fb squash-merged as f4fb6900b69ce39936e67897da136eb1579260e2 mergedAt 2026-05-26T23:31:07Z UTC; 109-second auto-merge cycle); +1389 lines test authoring across 2 NEW files (auth.test.ts 673 lines + tierEnforcement.test.ts 716 lines; 84 NEW tests across 11 axes a-k; auth.test.ts 37 tests + tierEnforcement.test.ts 47 tests); 111 total tests PASS in suite run (including existing requireMFA 13 + cdsHooksAuth); coverage delta auth.ts 34.61 to 97.11 Statements + 15.21 to 95.65 Branches + 20 to 90 Functions + 37.23 to 98.93 Lines + tierEnforcement.ts 0 to 98.75 Statements + 0 to 97.56 Branches + 0 to 100 Functions + 0 to 100 Lines (all 4 dimensions both files exceed 90% Tier A acceptance per Phase 1 §5); Q-B.B1 Path (a) two separate test files + Q-B.B1.x Path (x1) requireMFA.test.ts standalone preserved + Q-B.B2 Path (b) comprehensive Tier A WITH refresh-token carve-out (routes/auth.ts mis-scoping per catch #42; parked for AUDIT-001.E closure) + Q-B.B3 Path (a) single combined feat-audit PR + Q-E.AUTH-A-2 Path (a) long-form 13-section PR body operator decisions LOCKED; 44 cumulative V.5-RECOVERY canonical-grep catches sustained (catch #44 at A.AUTH.1 main HEAD divergence resolved); sister-precedent PR #299 feat-audit catalyst-PR pattern + PR #300 chore-register pattern + IMPLEMENT-2A/2B/2C atomic-test-authoring discipline; 2 uncovered lines accepted per defensive/dead-code analysis (auth.ts L240 requireMFA unreachable path owned by requireMFA.test.ts per Q-B.B1.x lock + tierEnforcement.ts L249 getMinimumTier BASIC dead-code branch); file 2 of 7 ONLY at this work block; full AUDIT-001 Status flip OPEN to RESOLVED deferred to AUDIT-001.E closure PR after P1.AUDIT-001.C + .D sub-PRs merge.
- **Status note:** 2026-05-27 AUDIT-001 file 3 of 7 (auditLogger.ts PHI-pipeline domain) Tier A coverage extension COMPLETE per PR #303 feat-audit catalyst PR merge (commit 2bcfa97 squash-merged as 0374522d40c3e4f9f4a3cb4a26a49ecd72096406 mergedAt 2026-05-27T05:22:10Z UTC; 114-second auto-merge cycle armed 2026-05-27T05:20:16Z); +474 lines test authoring across 1 NEW file (auditLogger.test.ts; 58 NEW tests across 11 axes a-k; axis b parameterized via test.each across 27 HIPAA_GRADE_ACTIONS entries per HIPAA Security Rule 164.312(b) audit-control regulatory anchor); 58 total tests PASS in 8.036s; coverage delta auditLogger.ts 0 to 96.66 Statements + 0 to 100 Branches + 0 to 100 Functions + 0 to 96.55 Lines (all 4 dimensions exceed 90% Tier A acceptance per Phase 1 §5); Q-C.C1 Path (b) comprehensive Tier A 90%+ all dimensions + Q-C.C2 Path (a) single feat-audit PR + Q-C.C3 Path (a) defer BUILD_STATE.md to AUDIT-001.E closure + Q-E.AUTH-A-3 Path (a) long-form 13-section PR body operator decisions LOCKED; 48 cumulative V.5-RECOVERY canonical-grep catches sustained (catches #45 + #46 + #47 + #48 surfaced documentation-claim-vs-canonical-state pattern at SCOPE.LOCK + A.AUTH; 9-instance pattern catches #29 + #39 + #40 + #41 + #43 + #45 + #46 + #47 + #48 strongest §17.1 Entry 28 codification candidate parked for AUDIT-001.E closure methodology PR); sister-precedent PR #299 single-source-file feat-audit catalyst-PR pattern + PR #301 dual-file feat-audit catalyst-PR pattern + IMPLEMENT-2A/2B/2C atomic-test-authoring discipline; 1 uncovered line accepted per defensive/native-require analysis (auditLogger.ts L32 DailyRotateFile constructor try-branch; catch-fallback L39-46 covered; axis k verifies branch-invariant post-init Logger config; sister-precedent acceptance pattern PR #299 line 352 + PR #301 auth.ts L240 + tierEnforcement.ts L249); test infrastructure novelty justified per axis-required identification (jest.mock prisma REUSE + jest.mock phiRedaction NOVEL + jest.spyOn auditLogger.info/error NOVEL + NO winston full-module mock preserving axis k + NO auditLogger self-mock per catch #47 root-cause avoidance); file 3 of 7 ONLY at this work block; full AUDIT-001 Status flip OPEN-to-RESOLVED deferred to AUDIT-001.E closure PR after P1.AUDIT-001.D sub-PR merges.
- **Status note:** 2026-05-27 AUDIT-001 file 4-5-6 of 7 (csrfProtection.ts + authRateLimit.ts + cognitoAuth.ts request-gate domain triad) Tier A coverage extension COMPLETE per PR #305 feat-audit catalyst PR merge (commit 9b93e3f squash-merged as c00825b0caad4f1391f08a75da98f03f2e825c68 mergedAt 2026-05-27T19:57:47Z UTC; 109-second auto-merge cycle armed 2026-05-27T19:55:58Z); +1405 lines test authoring across 3 NEW files (csrfProtection.test.ts 335 lines + authRateLimit.test.ts 459 lines + cognitoAuth.test.ts 511 lines; 81 NEW tests across 30 axes; csrfProtection 26 tests 10 axes a-j + authRateLimit 28 tests 7 axes a-g + 3 branch-boosters g.4/g.5/g.6 + cognitoAuth 27 tests 13 axes a-n + 1 L122 JSON.parse refinement j.5); coverage delta csrfProtection.ts 0 to 100 Statements + 0 to 100 Branches + 0 to 100 Functions + 0 to 100 Lines (PERFECT) + authRateLimit.ts 0 to 100 Statements + 0 to 100 Branches + 0 to 100 Functions + 0 to 100 Lines (PERFECT post 3 branch-boosters resolving catch #59) + cognitoAuth.ts 15.47 to 98.8 Statements + 14.28 to 94.28 Branches + 0 to 100 Functions + 18.57 to 100 Lines (all 4 dimensions exceed 80% Tier A acceptance per Phase 1 §5 by +14.28pp minimum); Q-D.D1 Path (a) three separate test files + Q-D.D2 Path (b) comprehensive Tier A 80%+ + Q-D.D3 Path (a) single combined feat-audit PR + Q-E.AUTH-A-4 Path (a) long-form 13-section PR body operator decisions LOCKED; 60 cumulative V.5-RECOVERY canonical-grep catches sustained (catches #54 + #55 + #56 + #57 + #58 + #59 + #60 surfaced across full P1.AUDIT-001.D arc; jsonwebtoken v9 strict-validator + RS256-2048-bit-minimum library policy adaptations at catches #57 + #58 are notable methodology insights parked for AUDIT-001.E closure §17.1 Entry 28 codification candidates; catch #60 4-instance defensive-native-require acceptance pattern L352 + L240 + L249 + L32 + L43/L153 secondary §17.1 codification candidate alongside primary 13-instance documentation-claim-vs-canonical-state pattern); sister-precedent PR #299 + PR #301 + PR #303 feat-audit catalyst-PR pattern + IMPLEMENT-2A/2B/2C atomic-test-authoring discipline; 2 unreachable defensive guards accepted per Catch #60 Option A sister-precedent NOT-cover discipline (cognitoAuth.ts L43 if !JWKS_URL throw inside getSigningKey unreachable because verifyCognitoToken L58 if !COGNITO_ISSUER return null guards earlier; cognitoAuth.ts L153 b64.match || [] fallback unreachable because b64 derived from non-empty DER buffer); test infrastructure novelty justified per axis-required identification (REUSE: jest.mock prisma + buildReq/buildRes adapters extended with cookies + headers + jest.isolateModules env-toggle; NOVEL: jest.spyOn(https, 'get') JWKS mock + crypto.generateKeyPairSync 2048-bit RS256 keypair for REAL jwt.sign chain through 5 internal helpers + 130-byte arbitrary-n JWK for encodeLength branch-2 coverage; BLOCKED: NO jest.mock('../cognitoAuth') self-mock per sister catch #47 + #53 root-cause avoidance); file 4-5-6 of 7 ONLY at this work block; full AUDIT-001 Status flip OPEN-to-RESOLVED deferred to AUDIT-001.E closure PR.

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
- **Status:** **RESOLVED 2026-05-07** - full implementation arc complete (3 sub-PRs: #255 + #260 + #261)
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
- **2026-05-16 STEP 1.7 attempt-4 progress note:** AUDIT-016 PR3 STEP 1.7 V2-to-V2 EncryptionContext.purpose rekey arc moved forward. §10.4 production-execute PASSED at 2026-05-16T02:57:48Z (rowsFailed=0, v2Before=515,711 matches Day 16 dry-run baseline 0.000% drift, rowsRekeyed=495,362 across 82 targets, 2h 55min 58s wall clock, task 3a2c8f91a99344c7afc40db2e5c2cd30 on tailrd-backend:192). §10.7 verification BLOCKED at GO/NO-GO verdict construction (missing override file + spotcheck-script-vs-rekey purpose mismatch caught chat-side pre-invocation). §10.7 unblock via PR #278 (audit-016-pr3-step-1-7-spotcheck-canonical-purpose) which flips spotcheck reader to canonical 'phi-encryption' purpose + authors missing override file at repo root. §10.8 post-execute Aurora snapshot remains NO-GO pending §10.7 25-of-25 corroboration post-PR-#278 merge + image-build + task-def-bump. 14th §17.1 architectural-precedent codified (coordinated migration of sister verification tooling). DRIFT-35 codified (sister verification tooling not coordinated-migrated at canonical-primitive introduction).
- **2026-05-18 STEP 1.7 §10.7 spotcheck invocation result:** PARTIAL verdict. §10.7 spotcheck ECS RunTask invoked against tailrd-backend:194 (post-PR-#278 / PR-#279 anchor-bump merge) on 2026-05-18T21:49:16Z; STOPPED 2026-05-18T21:50:25Z (exitCode=1; 1m9s wall clock; task 0826e7648b4b423e8c822272a6989455). Tally: 103 of 108 samples PASS, 5 of 108 samples FAIL (all 5 on patients.firstName). Marquee win: audit_logs.description (the original §10.7 attempt-2 catalyst that catalyzed PR #274-#279 rekey arc) PASSES 5/5 under canonical purpose; 23 of 24 V2-emitting targets clean 5/5. Newly-surfaced failure mode: patients.firstName under canonical 'phi-encryption' purpose throws decryptError='UnknownError' on all 5 samples; §10.4 production-execute had marked patients.firstName as SKIP_CANONICAL (50/50; PR #276 all-skip safety abort) which masked the actual envelope-content state. Hypothesis candidates (Phase G investigation, 2026-05-18): (1) AUDIT-084 deployment-window envelope contamination (production task def lacked PHI_ENVELOPE_VERSION + AWS_KMS_PHI_KEY_ALIAS env vars 2026-05-07 through 2026-05-09); (2) V0/V1-to-V2 migration partial-run + SKIP_CANONICAL heuristic mask. §10.8 post-execute Aurora snapshot + §10.9 rollback HELD pending Phase G.4 multi-purpose decrypt probe execution + patients.firstName resolution path decision. Phase G.4 probe (PR #TBD, 2026-05-18) authoring complete; ECS RunTask invocation post-merge. 15th §17.1 architectural-precedent codified (canonical-purpose single-source-of-truth: readers import, do not hardcode); CANONICAL_PHI_PURPOSE exported from phiEncryption.ts; spotcheck-decrypt.ts + probe both import. DRIFT-39 + DRIFT-40 codified.
- **2026-05-18 STEP 1.7 §10.7 PARTIAL R2 writer-hunt verdict:** phi-migration-v0v1-to-v2 first introduced into production code 2026-05-07 (commit `dfc8519`, AUDIT-016 PR3 V0/V1→V2 envelope migration arc), 3 weeks after the 2026-04-14 incident window. No active writer in main HEAD to fix. R1 discriminator re-rekey (10 legacy-purpose firstName rows) deferred to Phase 1 cleanup task. §10.7 PARTIAL stays Phase 1 carryover. Phase G investigation closed register-side. DRIFT-42 chat-side missed-attached-document recurrence codified.
- **2026-06-03 census cross-check (PREFIX-level only):** the AUDIT-108 production data-state census (one-off run-task, counts by envelope prefix) found ZERO `enc:v0:` / `enc:v1:` envelopes across all 56 PHI columns - every encrypted value carries the `enc:v2:` prefix. So no VERSION-remnant migration target remains for the V0/V1->V2 rekey (the rekey is effectively complete at the version level, or all writes went straight to V2). **CAVEAT - this does NOT close the §10.7 PARTIAL:** the census detects envelope PREFIX only, NOT `EncryptionContext.purpose` content, so it does NOT verify decryptability and does NOT supersede the §10.7 Phase-1 carryover (the ~10 `patients.firstName` legacy-purpose V2 rows that decrypt-fail under canonical purpose per the 2026-05-18 spotcheck). Purpose-content correctness remains the §10.7 Phase-1 item; this note closes only the version-remnant question.

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
- **Status:** **RESOLVED 2026-05-08 via PR #263** (squash-merge `48eac39`; sister-bundle with AUDIT-019 + AUDIT-075 per D3 closure pattern)
- **Location:** `backend/prisma/schema.prisma` (AuditLog model)
- **Evidence:** All current `writeAuditLog` callers (16 sites) pass non-PHI templated strings. Field accepts arbitrary input.
- **Severity rationale:** Latent risk; no active leak today.
- **Remediation:** Add `description` to `PHI_FIELD_MAP.AuditLog` (D2 layered sanitize-at-write + encrypt-residual approach per AUDIT-075 design refinement note §7); ESLint rule on free-form interpolation in `writeAuditLog` calls is the alternative considered + rejected (encryption is the primary control; lint provides write-time discipline reminder, not control).
- **Effort estimate:** S (1h) — folded into AUDIT-075 ~12-16h bundle
- **2026-05-07 reconciliation note:** Bundled into AUDIT-075 PR per D3 sister-family closure pattern.
- **2026-05-08 RESOLVED note:** PR #263 merged `48eac39`. AuditLog.description now in PHI_FIELD_MAP (`backend/src/middleware/phiEncryption.ts:115`); sanitize-at-write applied at `writeAuditLog` wrapper (`backend/src/middleware/auditLogger.ts:175`; CONSERVATIVE pattern set per design §4.2). Single-point integration eliminates 16-callsite fan-out duplication. AUDIT-016 PR 3 TARGETS extension covers backfill (`scripts/migrations/audit-016-pr3-v0v1-to-v2.ts`; AUDIT-018 sister-bundle attribution inline).
- **2026-05-07 Phase C reconciliation:** AuditLog.description added to PHI_FIELD_MAP (`backend/src/middleware/phiEncryption.ts:115`); sanitize-at-write applied at `writeAuditLog` wrapper (`backend/src/middleware/auditLogger.ts:175`; CONSERVATIVE pattern set per design §4.2). Single-point integration eliminates 16-callsite fan-out duplication. Encryption + redaction layered defense live in AUDIT-075 PR branch. AUDIT-016 PR 3 TARGETS extension covers backfill (`scripts/migrations/audit-016-pr3-v0v1-to-v2.ts`; AUDIT-018 sister-bundle attribution inline). Test coverage: Group I.3 sanitized round-trip + Group K.2 callsite integration spy on `prisma.auditLog.create`.

### AUDIT-019 — `FailedFhirBundle` plaintext PHI fragments

- **Phase:** 2B
- **Severity:** MEDIUM (P2)
- **Status:** **RESOLVED 2026-05-08 via PR #263** (squash-merge `48eac39`; sister-bundle with AUDIT-018 + AUDIT-075 per D3 closure pattern)
- **Location:** `backend/prisma/schema.prisma` (FailedFhirBundle model)
- **Evidence:** `errorMessage` and `originalPath` plaintext. FHIR ingest failures typically include partial bundle JSON; S3 paths sometimes carry patient identifiers.
- **Severity rationale:** Failed-bundle table accumulates raw FHIR fragments with potential PHI in clear text.
- **Remediation:** D2 layered sanitize-at-write + encrypt-residual approach (sister to AMBIGUOUS errorMessage columns in AUDIT-075 inventory). Add `errorMessage` + `originalPath` to `PHI_FIELD_MAP.FailedFhirBundle`. 30-day retention prune deferred to operational follow-up (not blocking encryption coverage). Full design in AUDIT-075 design refinement note §7.
- **Effort estimate:** S-M (4-8h) — folded into AUDIT-075 ~12-16h bundle
- **2026-05-07 reconciliation note:** Bundled into AUDIT-075 PR per D3 sister-family closure pattern.
- **2026-05-08 RESOLVED note:** PR #263 merged `48eac39`. FailedFhirBundle.errorMessage + originalPath now in PHI_FIELD_MAP (`backend/src/middleware/phiEncryption.ts:118`); D2 AGGRESSIVE pattern set routing per design §4.2. Zero current write callsites (forward-looking encrypt layer covers any future writes). 30-day retention prune deferred to operational follow-up per `docs/architecture/AUDIT_075_PHI_ENCRYPTION_COVERAGE_NOTES.md` §13. AUDIT-016 PR 3 TARGETS extension covers backfill (AUDIT-019 sister-bundle attribution inline).
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
- **Reaffirmation (2026-06-07, AUDIT-116 census, NOT a new finding):** the AUDIT-116 28-target JSON census (ECS task `0a1b286c`, read-only) incidentally counted **244 real-plaintext JSON rows across 12 columns / 8 models** still unencrypted at rest - the AUDIT-022 population. Delta vs the 2026-04-30 snapshot (243 rows / 11 columns) is +1 row / +1 column, immaterial (most plausibly data growth: the lone `audit_logs.metadata` object + the census's all-28-TARGETS method vs the original verify-script's then-populated-11). Production backfill execution remains operator-side/pending as already tracked. See the AUDIT-116 detail entry for the full reconciliation.
- **Cross-references:** AUDIT-015 (parallel finding for string columns; same remediation pattern), AUDIT-013 (dual-transport audit logger backing this script's audit trail), AUDIT-016 (V0 -> V1 envelope migration follow-on), AUDIT-017 (key validation; surfaced as warning), AUDIT-116 (json discovery-filter fix + the 28-target census reaffirming this population), `docs/runbooks/AUDIT_022_PRODUCTION_RUNBOOK.md` (operator runbook)

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
- **Pattern-extension note (2026-06-01):** AUDIT-104's correction adds a 5th canonical valueset under this pattern - `RXNORM_GLP1_RA` (semaglutide / liraglutide / dulaglutide) - consumed by gap-cad-glp1 + HF-7, replacing two divergent inline GLP-1 arrays. Cited as the first canonical-valueset instance realized post-AUDIT-052 closure (operator decision 2026-06-01). See AUDIT-104.
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
- **§16 sweep cross-reference (2026-06-01):** the read-only §16 clinical-code sweep (`docs/audit/sweeps/clinical-code-sweep-report.md`) flagged ~34 LOINC MISMATCH + 5 LOINC NO_API_MATCH. Triage routes the LOINC results HERE, not to a new gating finding, with this §1 rationale: the gap engine reads labs by ingestion-side `observationType` string keys, NOT by LOINC code (`backend/src/terminology/cardiovascularValuesets.ts:169` documents this), so a wrong or mislabeled LOINC does not change any gate's logic - LOINC correctness matters only at the FHIR LOINC -> observationType ingestion-mapping surface this finding owns. Most of the 34 MISMATCH are matcher artifacts (valueset group-label claims like "Lab observation LOINC codes relevant to cardiovascular gap detection", and abbreviation diffs such as ALT / AST / TSH). The substantive ones are analyte mislabels in the DEAD `loinc.ts` (see AUDIT-105): `14647-2` labeled Ferritin resolves to "Cholesterol [Moles/volume]", `42757-5` labeled BNP resolves to "Troponin I.cardiac", `8601-7` labeled QTc resolves to "EKG impression"; plus a label swap in `cardiovascularValuesets.ts:150` where `10230-1` (the real LVEF LOINC) is labeled "QRS duration" (non-gating per the same reason). The 5 NO_API_MATCH LOINC are LVEF `18010-0`, aortic valve mean gradient `18148-8`, aortic valve area `77912-1`, LV end-systolic diameter `79993-0`, SAQ-7 `71940-2` (the AUDIT-070 entry itself lists the correct LVEF as `10230-1`). When this FHIR-expansion PR adds LOINC mappings to `CARDIOVASCULAR_LAB_CODES`, re-verify each LOINC against loinc.org / NLM Clinical Tables per §16. (Update 2026-06-02: `terminology/loinc.ts` was DELETED per AUDIT-105 - the analyte-mislabel examples above are historical; AUDIT-070's ingestion-mapping work uses `cardiovascularValuesets.ts LOINC_CARDIOVASCULAR_LABS`, never the deleted file, and re-verifies against loinc.org / NLM.)

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
- **Status:** **RESOLVED 2026-05-08 via PR #263** (squash-merge `48eac39`; sister-bundle AUDIT-018 + AUDIT-019 per D3 closure pattern)
- **2026-05-08 RESOLVED note:** PR #263 merged `48eac39` at 2026-05-08T03:33:30Z. Default-suite advanced 588 → 603 in this PR (cumulative 566 → 603 across Day 8 PR arc; +37 net new tests across 4 files). 12th §17.1 codified live on main. AUDIT-018 + AUDIT-019 sister-bundle entries also flipped RESOLVED in same PR. AUDIT-081 NEW (User.email blind-index DEFERRED per D4 option-C). No AUDIT-076 promotions in this PR; cumulative tally stays at 7.
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
- **Status:** **IN PROGRESS — Phase C SHIPPED 2026-05-08; flips RESOLVED at PR merge** (sister to AUDIT-075/AUDIT-018/AUDIT-019 mid-arc status pattern; sister-PR cadence per AUDIT-011 merge-time-flip discipline)
- **Detected:** 2026-05-07 during Phase 3 audit area g
- **2026-05-08 reconciliation note:** α scope Phase C SHIPPED. Production-side `modify-db-cluster` apply EXECUTED + VERIFIED 2026-05-08 (BackupRetentionPeriod 7 → 35; DeletionProtection true idempotent reaffirm; instant apply; zero downtime). Repo-side deliverables: design refinement note (`docs/architecture/AUDIT_078_AURORA_BACKUP_RESTORE_NOTES.md` 14-section + §6.5 + α reframe + PAUSE 2.6 OUTCOME A two-key architecture + 4 §13 follow-ups including AUDIT-XXX-future-iam-db-auth + AUDIT-XXX-future-encryption-at-rest-architecture-summary + AUDIT-XXX-future-aurora-pg-param-group-customize + AUDIT-XXX-future-ci-shellcheck-coverage); 9-section operator runbook (`docs/runbooks/AUDIT_078_AURORA_BACKUP_RESTORE_RUNBOOK.md`); 4 CLI scripts (`infrastructure/scripts/audit-078/{00-preflight,03-execute-restore-test,04-rotate-cadence,05-verify-backup-config}.sh`); cadence-logs/.gitkeep. End-to-end restore-test execution + RTO measurement + D3 (a)+(b)+(d) pass-criteria verification REMAIN OPERATOR-SIDE (per runbook §5 + sister-PR sign-off pattern; sister to AUDIT-016 PR 3 production-execute timing). Deferred per §17.3 scope discipline: CFN stack-import (AUDIT-XXX-future-aurora-cfn-import); design context preserved at design note §6 + §6.5. AUDIT-082 (terraform/ stale-state) deferral path locked; no action this PR.
- **2026-05-08 §17.1 architectural-precedent codified:** 13th IaC-FRAMEWORK axis (PAUSE 1 inventory caught register Location section enumerated only `infrastructure/cloudformation/`; missed parallel `terraform/` tree codifying decommissioned RDS predecessor; sister to 10th SCOPE + 12th NAME-PATTERN axes; coherent 9th-13th axis cluster: INPUT/SCOPE/TYPE/NAME-PATTERN/IaC-FRAMEWORK). Full text in design note §14.
- **Location:**
  - `infrastructure/cloudformation/` directory contains only `tailrd-staging.yml` — production Aurora cluster not codified
  - `docs/CHANGE_RECORD_2026_04_29_day10_aurora_cutover.md` — Day 10 cutover snapshot evidence
  - `docs/CHANGE_RECORD_2026_04_29_day11_rds_decommission.md:118-123` — restore procedure documented (4-step recipe), never end-to-end tested
- **Evidence:** Production Aurora cluster `tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com` was provisioned out-of-band (likely manually or via a different mechanism). `BackupRetentionPeriod`, `DeletionProtection`, snapshot lifecycle policy are AWS console state, not version-controlled. Day 10/11 work proved snapshots are taken and tagged for 6-yr HIPAA retention (final pre-decom snapshot: `tailrd-production-postgres-final-pre-decom-20260429`). Restore procedure documented at Day 11 §"If catastrophic discovery" but never executed end-to-end.
- **Severity rationale:** **HIPAA §164.308(a)(7)(ii)(B) Disaster Recovery Plan testing.** Configuration drift between staging (codified) and production (console-managed) creates audit reproducibility risk. Untested restore procedure means RTO is theoretical. Production-readiness gate item — data-state-independent (codified backup posture + proven restore capability is required for production-ready posture; PHI may arrive any day).
- **Remediation (α scope — locked 2026-05-08 per PAUSE 2.5 fresh-attention pivot; document-and-defer-IaC reframe):**
  1. **Operator-side aws-cli backup config apply** (replaces original step 1+2+3 CFN stack-import path; CFN-import deferred to AUDIT-XXX-future-aurora-cfn-import): `aws rds modify-db-cluster --db-cluster-identifier tailrd-production-aurora --backup-retention-period 35 --deletion-protection --apply-immediately`; verify post-apply via `aws rds describe-db-clusters` query. Closes BackupRetentionPeriod + DeletionProtection HIPAA gap without CFN-import rollback risk on live BSW-pilot cluster.
  2. **Document snapshot lifecycle** in operator runbook: automated daily backups (35-day rolling) + monthly HIPAA-tagged snapshot (6-year retention) per HIPAA §164.530(j)(2) audit needs. Manual operator action for monthly tagging (Lambda automation deferred to AUDIT-XXX-future per design note §13).
  3. **End-to-end restore test:** restore latest pre-cutover snapshot (`tailrd-production-aurora-pre-cutover-20260428-231342`) into a temporary cluster `tailrd-production-aurora-restore-test`; verify schema + sample-row count parity + PHI-decrypt KMS context end-to-end (D3 (a)+(b)+(d) per design note §4); document RTO (target <30 min) per D4 RTO measurement methodology (timer wall-clock from `restore-db-cluster-from-snapshot` to first `psql` connection); destroy test cluster.
  4. **Operator runbook + CLI scaffolding** at `docs/runbooks/AUDIT_078_AURORA_BACKUP_RESTORE_RUNBOOK.md` + `infrastructure/scripts/audit-078/` (8-section runbook + 4 CLI scripts: preflight + execute-restore-test + rotate-cadence + verify-backup-config). Sister-discipline: AUDIT-022 PR #253 + AUDIT-016 PR 3 production-grade tooling pattern.
  5. **Bundle into a single repo PR** (3 explicit Review Section A/B/C headers per design note CONCERN C strategy lock; sister to AUDIT-075 PR #263 cadence). Operator-side execution + sign-off ledger PR follows merge.
  6. **CFN stack-import + IaC codification** — DEFERRED to **AUDIT-XXX-future-aurora-cfn-import** per α reframe; design context preserved at `docs/architecture/AUDIT_078_AURORA_BACKUP_RESTORE_NOTES.md` §6 + §6.5 (CFN production template authoring plan + stack-import risk + dry-run protocol + import-rollback recovery procedure).
- **Effort estimate:** S-M (3-4h α scope; reduced from original 6-10h via CFN-import deferral)
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

### AUDIT-082 — `terraform/` tree codifies decommissioned RDS predecessor; reconciliation deferred

- **Phase:** 3 (data layer audit; IaC reconciliation; deferred from AUDIT-078 α reframe)
- **Severity:** LOW (P3) (operational debt; not blocking AUDIT-078 closure; not security-relevant)
- **Status:** OPEN — DEFERRED per AUDIT-078 D6 + α reframe pivot 2026-05-08
- **Detected:** 2026-05-08 during AUDIT-078 PAUSE 1 inventory item 1.1 IaC repo presence; surfaced as 13th §17.1 architectural-precedent (IaC-FRAMEWORK axis)
- **Location:**
  - `terraform/` directory (13 `.tf` files + `terraform.tfvars`; last edited April 5-9 2026 per `ls -la`)
  - `terraform/main.tf` configures S3 backend at `tailrd-terraform-state-863518424332`
  - `terraform/rds.tf` codifies `aws_db_instance` (single Postgres RDS) with identifier `${local.name_prefix}-postgres` → `tailrd-production-postgres`
  - `terraform/terraform.tfvars` declares `environment = "production"`
- **Evidence:** terraform/ tree codifies the predecessor RDS instance (`tailrd-production-postgres`, db.t3.medium, PG 15.10) decommissioned 2026-04-30 per Day 11 RDS decommission runbook (`docs/CHANGE_RECORD_2026_04_29_day11_rds_decommission.md`). Zero Aurora references in terraform/ tree (`grep -rln "aurora\|Aurora\|aws_rds_cluster" terraform/` returns empty). terraform/ files predate Aurora cutover (2026-04-29) AND predecessor RDS decommission (2026-04-30) by ~3 weeks. terraform.tfvars declares environment=production but the production database resource it codifies no longer exists. Drift state: terraform/ either (i) was never applied, (ii) applied to predecessor only and `terraform.tfstate` (S3) now has stale resource references, or (iii) was applied to a different account/region. Operator-side investigation required.
- **Severity rationale:** **LOW (P3) — operational debt, not security-relevant.** terraform/ is not a live dependency of any production code path; no PHI flows through it; no clinical logic depends on it. AUDIT-078 closes the production Aurora codification gap via `infrastructure/cloudformation/tailrd-production.yml` (CFN-scoped α reframe path); terraform/ stale-state is a separate concern with its own decision-tree (which framework wins long-term). Per HIPAA §164.308(a)(1)(ii)(B) Risk Management framing, operational debt that does not introduce data-exposure or audit-trail risk is appropriately deferred.
- **Remediation:** Three remediation paths surface (operator picks at AUDIT-082 work block start):
  - **(i) Delete terraform/ tree + S3 backend state** — fastest closure; assumes CFN wins long-term IaC framework decision; clean exit
  - **(ii) Migrate Aurora codification into terraform/aurora.tf + decommission terraform/rds.tf** — assumes Terraform wins long-term IaC framework decision; preserves terraform/ ECS+ALB+ElastiCache+etc. work
  - **(iii) Mark terraform/ legacy with README.md note** — defers framework decision; preserves terraform/ for reference but freezes maintenance
  
  Decision deferred to dedicated work block + platform-level IaC framework decision. Sister to AUDIT-052 architectural-divergence-vector deferral pattern (resolution requires architectural-decision input separate from mechanical mitigation).
- **Effort estimate:** S-M (2-4h depending on path: (i) ~2h, (ii) ~4h, (iii) ~30 min)
- **Cross-references:**
  - AUDIT-078 (deferred-from; α reframe pivot 2026-05-08; design refinement note `docs/architecture/AUDIT_078_AURORA_BACKUP_RESTORE_NOTES.md` §2.2 + §4 D6 captures rejected alternatives)
  - CLAUDE.md §9 Aurora cutover (2026-04-29 → Aurora) + §17 last-known-working task definition
  - `docs/CHANGE_RECORD_2026_04_29_day11_rds_decommission.md` (predecessor RDS deletion record)
  - HIPAA §164.308(a)(1)(ii)(B) Risk Management (operational debt risk classification)
  - 13th §17.1 architectural-precedent (IaC-FRAMEWORK axis; AUDIT-078 design note §14)

---

### AUDIT-083 — `fast-xml-builder` transitive CVE remediation (GHSA-5wm8-gmm8-39j9 + GHSA-45c6-75p6-83cc)

- **Phase:** 2 (security posture; CI gate)
- **Severity:** HIGH (P1) — `npm audit --audit-level=high` blocks ALL PR merges including AUDIT-078 PR #265; CI-gate-blocking by virtue of pipeline behavior; sister to AUDIT-079 connection_limit operational-debt severity classification by gate-impact discipline
- **Status:** **RESOLVED 2026-05-09 via PR #266** (squash-merge `bdbc1b0`; unblocks AUDIT-078 PR #265 Security Audit re-run)
- **Detected:** 2026-05-08 during AUDIT-078 PR #265 CI run (Security Audit step `npm audit --audit-level=high` failed)
- **Numbering note:** AUDIT-082 reserved for terraform/ stale-state on AUDIT-078 PR #265 branch (not yet on main at filing time); AUDIT-083 used here to avoid rebase-conflict on AUDIT-078 merge. Conflict resolved cleanly at AUDIT-078 rebase post-PR-#266 merge: both entries preserved in numerical order (082 then 083).
- **Location:** `backend/package-lock.json` (transitive only; `isDirect: false`)
  - Dependency chain: `tailrd-backend@1.0.0 → @aws-sdk/client-cloudwatch@3.1032.0 → @aws-sdk/core@3.974.6 → @aws-sdk/xml-builder@3.972.21 → fast-xml-parser@5.7.2 → fast-xml-builder@1.1.5` (5 levels deep)
- **Evidence:** Two GHSA advisories published 2026-05-07 by NaturalIntelligence org (upstream maintainer of fast-xml-parser + fast-xml-builder):
  - **GHSA-5wm8-gmm8-39j9** (high; CWE-611 XXE-related) — fast-xml-builder allows attribute values with unwanted quotes to bypass malicious or unwanted attributes
  - **GHSA-45c6-75p6-83cc** (moderate; CWE-91 XML injection regex bypass) — fast-xml-builder Comment Value regex can be bypassed
  - `npm audit --json` output: `vulnerabilities.fast-xml-builder.range: <=1.1.6`; `fixAvailable: true`; affected version 1.1.5
  - Pre-existing CVE; published BETWEEN PR #264 (passed Security Audit 2026-05-08) and PR #265 (failed Security Audit 2026-05-08); NOT introduced by AUDIT-078 work block
- **Severity rationale:** **HIGH (P1) by CI-gate-blocking impact** — npm audit --audit-level=high blocks all subsequent PR merges; AUDIT-078 PR #265 already blocked. Transitive nature (no direct backend code touches fast-xml-builder; flows through @aws-sdk/client-cloudwatch CloudWatch metrics XML serialization path) does not reduce CI-gate-blocking severity. HIPAA §164.308(a)(1)(ii)(B) Risk Management framing: an XXE-class vulnerability in CloudWatch metrics path is theoretical low-impact (no PHI flows through XML metrics), but the CI gate is the load-bearing concern.
- **Remediation:** `npm audit fix` (lockfile-only impact; no backend/package.json changes; no application code changes):
  - **fast-xml-builder 1.1.5 → 1.2.0** (minor version bump; semver-safe; backward-compatible per upstream)
  - **+ xml-naming@0.1.0 NEW transitive** (helper package; XML name validation per XML 1.0/1.1 spec; supply-chain verified pre-execute via `npm view xml-naming`: NaturalIntelligence org maintainer + MIT license + zero deps + 18.7 kB unpacked size + same-org-as-fast-xml-builder-parent provenance; pre-1.0 version flagged for §13 follow-up)
  - jest 603/603 pass post-fix (unchanged from baseline; lockfile-only fix has zero test-impact)
  - npm audit --audit-level=high re-verified clean post-fix (`found 0 vulnerabilities`)
- **Effort estimate:** XS (~30-45 min — supply-chain verify + dry-run + apply + test + ledger + PR)
- **Cross-references:**
  - GHSA-5wm8-gmm8-39j9 (https://github.com/advisories/GHSA-5wm8-gmm8-39j9)
  - GHSA-45c6-75p6-83cc (https://github.com/advisories/GHSA-45c6-75p6-83cc)
  - AUDIT-078 PR #265 (blocking-blocked-by relationship; this PR unblocks #265 via clean Security Audit re-run post-rebase)
  - `AUDIT-XXX-future-pre-1-0-transitive-audit` — NEW deferred follow-up: xml-naming@0.1.0 is pre-1.0 stability tier; defense-in-depth supply-chain audit pattern; consider periodic transitive-version-audit cadence in CI as sister to AUDIT-XXX-future-ci-shellcheck-coverage tooling-coverage gap
  - AUDIT-079 connection_limit operational-debt (sister CI-gate-blocking severity classification pattern)
  - HIPAA §164.308(a)(1)(ii)(B) Risk Management

---

### AUDIT-084 — AUDIT-016 PR 2 task-def deployment gap (PHI_ENVELOPE_VERSION + AWS_KMS_PHI_KEY_ALIAS env wiring missed at deploy time)

- **Phase:** 2 (security posture; encryption-at-rest deployment integrity)
- **Severity:** HIGH (P1) — was load-bearing; AUDIT-016 PR 2 envelope-emission infrastructure shipped 2026-05-07 but production task def lacked PHI_ENVELOPE_VERSION + AWS_KMS_PHI_KEY_ALIAS env vars for ~2 days; production backend emitted V1 envelopes instead of V2; new PHI writes during gap window would have lacked KMS-wrapped DEK + per-record EncryptionContext per AUDIT-016 PR 2 §7.1 design
- **Status:** **RESOLVED 2026-05-10 via revision 183 register + deploy** (revision 183 deployed 2026-05-10T11:52:30 -0700; rolloutState COMPLETED ~1.5 min wall-clock; health HTTP 200 uptime 201s post-deploy; env vars confirmed active on running container)
- **Detected:** 2026-05-09 during AUDIT-078 β1 single-arc Pre-Phase-1 substance check (Observation 3-EXTENDED ECS describe-task-definition probe; agent-surfaced)
- **Location:** Production ECS task definition tailrd-backend:123 (AUDIT-016 PR 2 deploy time); persisted through tailrd-backend:182 (latest pre-resolution)
- **Evidence:**
  - AUDIT-016 PR 2 merge SHA 092658b 2026-05-07T20:34:52 -0700 shipped envelope-emission infrastructure (backend/src/middleware/phiEncryption.ts V2 envelope; backend/src/services/keyRotation.ts KMS GenerateDataKey wiring)
  - Production task def tailrd-backend:123 (registered ~2026-05-07 post-PR-#262 merge) lacked PHI_ENVELOPE_VERSION + AWS_KMS_PHI_KEY_ALIAS env vars
  - 59 subsequent task-def revisions (:124 through :182) all lacked same env vars (CI-driven cadence preserved gap)
  - Gap persisted from 2026-05-07 through 2026-05-09 (~2 days; ~minimal production write activity pre-DUA per CLAUDE.md §9 BSW pilot status)
  - Discovery via ECS describe-task-definition probe at Pre-Phase-1 Observation 3-EXTENDED (agent-surfaced 2026-05-09)
- **Severity rationale:** HIGH (P1) by load-bearing-architectural-gap impact — production backend emitted V1 envelopes for ~2 days when AUDIT-016 PR 2 architecture was V2-required; pre-DUA state means minimal PHI traffic but the gap itself violates AUDIT-016 PR 2 deployment contract; HIPAA §164.312(a)(2)(iv) encryption-at-rest implementation completeness implicated
- **Remediation:** Pre-Phase-1 sub-arc of β1 single-arc (sister to AUDIT-022 PR #253 production-execute timing operator-side discipline):
  - P1-REVISED: inventory tailrd-backend:182 (after :123 staleness caught per DRIFT-19; 59 revisions ahead)
  - P2-REVISED: draft tailrd-backend:183 with +2 env vars (PHI_ENVELOPE_VERSION=v2 + AWS_KMS_PHI_KEY_ALIAS=alias/tailrd-production-phi) against :182 base; preserve all other config verbatim (image SHA fdb54e5 + 18 existing env vars including PHI_LEGACY_PLAINTEXT_OK + 4 secrets[] + cpu/memory/network/roles)
  - P3-REVISED: operator-side `aws ecs register-task-definition` → revision 183 ACTIVE 2026-05-10T11:50:58 -0700
  - P5-REVISED: operator-side `aws ecs update-service --force-new-deployment` → deployment ecs-svc/9130118381098689272
  - P6-REVISED: rolloutState COMPLETED at iter 6 (~1.5 min)
  - P7: health verification HTTP 200; uptime 201s; version 1.0.0; environment production
  - P8: running task confirmed RUNNING HEALTHY on revision 183 with all 3 PHI env vars active (PHI_ENVELOPE_VERSION=v2 + AWS_KMS_PHI_KEY_ALIAS=alias/tailrd-production-phi + PHI_LEGACY_PLAINTEXT_OK=false preserved verbatim)
- **Effort estimate:** L (~4-6h operator-side wall-clock; β1 single-arc Pre-Phase-1 sub-arc with 11 DRIFT codifications surfaced during verify-before-execute discipline)
- **Cross-references:**
  - AUDIT-016 PR 2 (gap origin; merge SHA 092658b)
  - DRIFT-17 (PR-merged ≠ deployed-to-production verification gap mechanism)
  - DRIFT-19 (referenced-snapshot-vs-current-state — caught :123 staleness)
  - §17.3 scope discipline (Pre-Phase-1 sub-arc ships as separate ledger PR)
  - HIPAA §164.312(a)(2)(iv) encryption-at-rest implementation completeness
  - β1 single-arc strategic context (AUDIT-078 PR #265 + AUDIT-016 PR 3 + AUDIT-084 unified work block)
  - Reconciliation 2026-05-11: production task def evolved :183 → :184 via CI/CD auto-deploy on PR #268 merge (per CLAUDE.md §15 RULE 5); env-var carry-forward verified intact; codified as DRIFT-25 (fresh-context bootstrap stale-anchor pattern across CI/CD-cadence boundary); AUDIT-084 RESOLVED state preserved on :184 baseline.

---

### AUDIT-085 — Production migration execution environment gap (Prisma-driven migration scripts cannot reach VPC-isolated Aurora from operator's local machine)

- **Phase:** Operations / production-execute infrastructure
- **Severity:** HIGH (P1) — load-bearing for AUDIT-016 PR 3 + AUDIT-022 PR #253 + any future Prisma-driven migration script targeting production Aurora
- **Status:** OPEN — architectural decision to Option A (ECS RunTask with command override); implementation pending
- **Detected:** 2026-05-11 during β1 Phase 1 STEP 1.3 dry-run attempt; PrismaClientInitializationError on private Aurora endpoint from operator's local Windows + PowerShell host
- **Location:** Sister-precedent gap across:
  - docs/runbooks/AUDIT_016_PR_3_MIGRATION_RUNBOOK.md §3.1 (npx tsx ... --execute; no host specified)
  - docs/runbooks/AUDIT_022_PRODUCTION_RUNBOOK.md §3.1 (sister; same shape; same gap)
  - docs/architecture/AUDIT_016_PR_3_MIGRATION_JOB_NOTES.md §1 D1 (one-shot operator-triggered pattern; no operator-host specified)
- **Evidence:**
  - AUDIT-022 PR #253 RESOLVED 2026-05-07 against DEV DB only; "production execution timing operator-side outside this PR" framing; production migration never executed
  - AUDIT-016 PR 3 runbook shipped 2026-05-07 with identical connectivity assumption
  - Production Aurora cluster tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com:5432 is VPC-private (no public ingress per HIPAA + security posture)
  - CLAUDE.md §9 (Aurora endpoint listed as VPC DNS; no public access provision) + §15 RULES 1-9 (no operator-Aurora connectivity provision)
  - Register grep for bastion|ssm-session-manager|vpn|ecs-exec|aurora-data-api|jumphost|private-endpoint|vpc-endpoint returned no matches; gap not previously recognized
- **Severity rationale:** HIGH (P1) load-bearing pre-DUA gate. AUDIT-016 PR 3 + AUDIT-022 PR #253 + any future PHI-touching migration cannot execute against production without resolution. Pre-DUA window (no real PHI flows yet) allows resolution before commercial pressure.
- **Architectural decision (logged 2026-05-11):** Option A — ECS RunTask with command override against tailrd-backend task definition family.
- **Rationale for Option A:**
  1. All prerequisites already in place at production layer (DATABASE_URL + PHI_ENCRYPTION_KEY via Secrets Manager; PHI_ENVELOPE_VERSION=v2 + AWS_KMS_PHI_KEY_ALIAS=alias/tailrd-production-phi on :184; VPC + SG + IAM correct)
  2. Same container image SHA a11f3df contains migration script source
  3. AWS-industry-standard pattern for one-shot DB migrations on ECS Fargate
  4. Isolation: RunTask spawns dedicated container instance; does not share lifecycle with production server workload
  5. Audit trail: existing CloudWatch Logs group; meets HIPAA §164.312(b) audit requirements
  6. Open verification gate (read-only ECR inspection): production image must contain tsx + migration script TypeScript source bundled (Dockerfile may strip backend/scripts/ or dev dependencies from production stage)
- **Options considered + rejected:**
  - Option B (ECS Exec into live tailrd-production-backend task): mixes migration workload with live production server; lifecycle coupling
  - Option C (SSM Session Manager + port-forwarding): requires SSM-managed instance in VPC; no such instance today
  - Option D (Bastion EC2 + SSH tunnel): anti-pattern for modern AWS; SSH key mgmt + SG hardening ongoing cost
  - Option E (AWS Client VPN): viable but ~2-4h setup; ongoing operator-environment cost
  - Option F (AWS Lambda + invoke): 15-min runtime limit incompatible with ~1-3.5h migration wall-clock
  - Option G (Aurora Data API): Prisma incompatibility; would require AWS SDK rewrite of script
- **Remediation plan:**
  1. Verify production image contains tsx + migration script source (read-only ECR inspection / docker pull + introspect)
  2. Design RunTask command override (--task-definition tailrd-backend:184 + --overrides container-name + command + environment + cpu/memory)
  3. Verify IAM execution role has CloudWatch Logs write + Secrets Manager read + KMS Decrypt permissions (should already be true given production server task uses same role)
  4. Surface operator-side aws ecs run-task invocation paste-block with dry-run command override
  5. Operator-side run-task invocation (mutating); output via CloudWatch Logs Live Tail or describe-tasks polling
  6. Iterate Option A on dry-run first; then Option A on --execute after PAUSE 2.20.1 GO/NO-GO
- **Effort estimate:** L (~3-6h: image verification ~30 min + RunTask design ~1h + IAM verification ~30 min + dry-run iteration ~30-60 min + execute iteration ~1-3.5h)
- **Cross-references:**
  - AUDIT-016 PR 3 production-execute gap (this finding's catalyst)
  - AUDIT-022 PR #253 production-execute gap (sister; same gap; production execute STILL pending; will use AUDIT-085 Option A path)
  - DRIFT-26 (sister to DRIFT-13 — runbook references execution environment that operator does not possess; codified inline this PR)
  - HIPAA §164.312(a)(2)(iv) encryption-at-rest implementation completeness (migration completion gate for AUDIT-016 PR 2)
  - β1 single-arc Phase 1 STEP 1.3 PAUSE 1.3.4 surfacing point

---

### AUDIT-086 - Prisma tenant-guard middleware fails to strip TENANT_GUARD_BYPASS_KEY from args; Prisma 5.22 create() schema rejects unknown top-level key

- **Phase:** 2 (security posture; defense-in-depth Layer 3 tenant isolation hygiene) + Operations (production audit-trail integrity)
- **Severity:** HIGH (P1); latent production HIPAA §164.312(b) primary-durable-record regression + AUDIT-016 PR 3 STEP 1.5 mid-flight aggregate-audit failure
- **Status:** RESOLVED 2026-05-11 (this PR: strip-at-entry implementation + 3 new unit tests + register entry + DRIFT-27 codification)
- **Detected:** 2026-05-11 mid-flight β1 single-arc Phase 1 STEP 1.5 PHI migration execute on production task UUID 6ffd2410bde2487d85215f23be2861ef. PAUSE 1.5.1 fired at first per-target PHI_MIGRATION_BATCH_COMPLETED audit write failure at 2026-05-11T18:52:11Z (~9 min into execute; patients.firstName target boundary). Caught via CloudWatch tail probe.
- **Location:**
  - PRIMARY: `backend/src/lib/prismaTenantGuard.ts` $allOperations wrapper (pre-fix passes args UNMODIFIED including TENANT_GUARD_BYPASS_KEY to query())
  - SISTER (latent broader regression): `backend/src/middleware/auditLogger.ts:200-215` writeAuditLog() prisma.auditLog.create({ data, __tenantGuardBypass: true })
  - AFFECTED CALLSITES (transitive; fix is at middleware layer): `backend/src/routes/analytics.ts:101,145,424` (3 conditional bypass calls) + `backend/src/services/crossReferralService.ts:850` + `backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts:601` + webhookPipeline ×8 (per AUDIT-011 Phase b/c documentation)
- **Evidence:**
  - Production execute STEP 1.5 launched 2026-05-11T18:42:44.987Z; first PHI_MIGRATION_BATCH_COMPLETED write at 2026-05-11T18:52:11.216Z failed: `Unknown argument `__tenantGuardBypass`. Available options are marked with ?.`
  - Migration script line 601 calls `prisma.auditLog.create({ data: {...}, __tenantGuardBypass: true } as any);`; per-row PHI_RECORD_MIGRATED audit writes succeed via Winston `auditLogger.info` direct call (different code path; no bypass marker required)
  - `prismaTenantGuard.ts` CREATE_ACTIONS branch pre-fix: `return query(args)` passes args UNMODIFIED → bypass marker reaches Prisma → Prisma 5.22 create() strict args schema rejects unknown top-level keys (`{ data, select, include }` only)
  - Test coverage gap: `prismaTenantGuard.test.ts:218-247` GROUP B uses where-style args (findUnique); never exercised create-with-bypass. Prisma 5.22 where-clause operations tolerate extra top-level keys at runtime (B1 false-clean signal); create() does not. Schema differential missed by test design.
  - Sister-evidence (broader regression): same pattern at `auditLogger.ts:214` means every production writeAuditLog() DB write fails since :183 deploy on 2026-05-10 (~24h latent). HIPAA_GRADE_ACTIONS (LOGIN_SUCCESS, LOGIN_FAILED, PHI_VIEW, PHI_EXPORT, TENANT_GUARD_VIOLATION, KMS_KEY_VALIDATION_FAILURE, KMS_ENVELOPE_DECRYPT_FAILURE, CDS_HOOKS_*) throw on DB write failure per AUDIT-013 design → would 500 production traffic on next authenticated user request. Low-traffic post-:183 window (β1 work-blocks; no real user auth flows) masked the regression.
- **Severity rationale:** HIGH (P1); latent production HIPAA §164.312(b) primary-durable-record gap. Primary canonical audit-trail (DB AuditLog table) was failing; CloudWatch Logs preserved equivalent info per AUDIT-013 dual-transport design but DB write is the compliance-canonical artifact. Test coverage gap is the root cause; closing it prevents regression of same shape across any future $extends-based middleware adding metadata-flag pattern.
- **Architectural classification:** OUTCOME 1 (1-line conceptual / ~25-line literal fix). Single file (`prismaTenantGuard.ts`); single $extends wrapper; destructure-and-reassign strip pattern at wrapper entry; no architectural redesign. Strip-at-entry preserves all existing routing logic (bypassPresent boolean captured BEFORE strip for downstream routing + violation descriptor field).
- **Remediation (this PR):**
  1. Strip TENANT_GUARD_BYPASS_KEY from args at top of $allOperations wrapper (before any query() call); capture bypassPresent boolean BEFORE strip; use cleanArgs for ALL query() call sites (off-mode + non-allow-list + CREATE_ACTIONS + non-ENFORCED_ACTIONS + bypass-present + structural-pass + violation-audit-mode branches)
  2. 3 new unit tests (GROUP G in `prismaTenantGuard.test.ts`): G1 create-with-bypass strip; G2 update-with-bypass strip parity; G3 off-mode-with-bypass strip (hygiene invariant across modes)
  3. No changes required to TENANT_GUARD_BYPASS_KEY constant, hasBypassMarker helper, or any of the 11+ production callsites. Args shape is unchanged at callsite layer; middleware strips on their behalf transparently.
- **Effort estimate:** XS (~30 min: fix ~10 min + 3 tests ~15 min + register entry + DRIFT codification + session journal footer ~15 min)
- **Cross-references:**
  - AUDIT-011 Phase b/c (defines TENANT_GUARD_BYPASS_KEY string-keyed marker pattern; sister-finding origin; missing strip semantics)
  - AUDIT-016 PR 3 STEP 1.5 (catalyst: mid-flight production migration discovery surface; PAUSE 1.5.1 surfacing point)
  - AUDIT-013 (HIPAA-grade dual-transport audit-log design; CloudWatch Logs as durable fallback minimized blast radius of latent regression)
  - DRIFT-21 (verification-script false-clean state, sister-mechanism: implausibly-WRONG-state at tail probe surfaces real defect, here implausibly-WRONG audit_db_write_failed at first per-target boundary)
  - DRIFT-27 codified inline this PR (inspect-only-vs-strip middleware verification gap at create-vs-where operation surface)
  - HIPAA §164.312(b) Audit Controls (primary durable record compliance gate)
  - β1 single-arc Phase 1 STEP 1.5 PAUSE 1.5.1 surfacing + Path A.2 resolution cadence

---

### AUDIT-XXX-future-iam-cli-access-least-privilege

- **Phase:** 2 (security posture; defense-in-depth identity)
- **Severity:** MEDIUM (P2)
- **Status:** OPEN — deferred to dedicated work block post-Phase-2 closure
- **Detected:** 2026-05-09 during Pre-Phase-1 IAM verification sub-step (Sub-step 1 follow-up)
- **Location:** AWS IAM user tailrd-cli-access (arn:aws:iam::863518424332:user/tailrd-cli-access)
- **Evidence:**
  - `aws iam list-attached-user-policies --user-name tailrd-cli-access` surfaces AdministratorAccess + AmazonS3FullAccess attached
  - User has full AWS account control via AdministratorAccess (RDS / ECS / KMS / S3 / IAM / Secrets Manager / all services)
  - Long-lived credentials (IAM user not assumed-role with session expiration); blast radius if credentials compromised includes full account control
  - HIPAA §164.312(a)(1) least-privilege concern; defense-in-depth identity layer gap
- **Severity rationale:** MEDIUM (P2) — not blocking pre-DUA (Synthea synthetic only on production; zero real PHI); becomes load-bearing pre-DUA-signature; sister to AUDIT-XXX-future-iam-db-auth defense-in-depth identity pattern
- **Remediation:** scope tailrd-cli-access permissions to specific RDS + KMS + Secrets Manager + S3 + ECS actions needed for operator-side ops (scope per actual operator-side work pattern); migrate to assumed-role pattern with session expiration (sister to AWS best-practice for long-lived service-user credentials); add MFA-required policy condition; consider separate principals for read-only-describes vs mutating-execute scopes
- **Effort estimate:** M (~4-6h IAM policy authoring + permission audit + soak window + verification)
- **Cross-references:**
  - AUDIT-XXX-future-iam-db-auth (defense-in-depth identity pattern)
  - DRIFT-18 (operator-vs-agent execution-split mechanism; relies on operator-side execution; least-privilege scoping reinforces that boundary)
  - HIPAA §164.312(a)(1) access-control least-privilege
  - AUDIT-009 MFA enforcement (sister-pattern)

---

### AUDIT-XXX-future-claudemd-aurora-acu-doc-refresh

- **Phase:** Documentation hygiene (low-severity infrastructure doc-vs-live drift)
- **Severity:** LOW (P3)
- **Status:** OPEN — non-blocking; doc-refresh queued for next CLAUDE.md update cycle
- **Detected:** 2026-05-09 during Pre-Phase-1 CHECK 4 production cluster pre-flight probe
- **Location:** docs/CLAUDE.md §9 (Aurora cluster configuration documentation)
- **Evidence:**
  - CLAUDE.md §9 documents Aurora ServerlessV2 capacity as 0.5-4 ACU
  - Live Aurora cluster config (per `aws rds describe-db-clusters --db-cluster-identifier tailrd-production-aurora`) shows ServerlessV2 0.5-16 ACU
  - Documentation drift; live config more permissive than documented (4× max-capacity headroom)
  - Likely from intermediate ACU adjustment between CLAUDE.md authoring and live state (CI / IaC / manual mutation)
- **Severity rationale:** LOW (P3) — not blocking; doc-drift not architectural-drift; live config is more permissive (favorable for Phase 1 KMS rate spike per CHECK 5); cosmetic but worth refresh for operator-decision-context accuracy
- **Remediation:** refresh CLAUDE.md §9 to match live config (0.5-16 ACU); verify all CLAUDE.md infrastructure-config sections against live state in single doc-refresh pass (e.g., BackupRetentionPeriod which is now 35 not 7 post-AUDIT-078 apply; verify any other config drift)
- **Effort estimate:** XS (~30 min CLAUDE.md edit + verification + commit)
- **Cross-references:**
  - DRIFT-17 (PR-merged ≠ deployed-to-production; doc-drift is sister-pattern at documentation layer)
  - CHECK 4 evidence (Pre-Phase-1 substance check capture)
  - AUDIT-078 Day 9 morning arc BackupRetentionPeriod modification (sister doc-refresh candidate)

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

## Phase 4 Operational Maturity Audit Findings (2026-05-19)

**Phase 4 of Phase 0A audit arc.** Companion report: `docs/audit/PHASE_4_REPORT.md`. Verdict CONDITIONAL PASS (3 HIGH P1 gate items + documented remediation roadmap per PHASE_4_REPORT.md §10.2). Severity totals: 3 HIGH P1 / 5 MEDIUM P2 / 6 LOW P3 / 6 INFO / 1 N/A = 21 entries. Status column mirrors PHASE_4_REPORT.md §10.1 verbatim per AUDIT_METHODOLOGY.md §18 status-surface discipline. Citations follow §1 rule-body verification (file:line).

| Finding ID | Severity | Status | Description | Citation | Cross-reference |
|---|---|---|---|---|---|
| 4-ALR-01 | HIGH (P1) | RESOLVED 2026-05-28 (PR #309) | ZERO operational CloudWatch alarms (no ECS task failure / Aurora ACU saturation / ALB 5xx / audit-log write-failure alarms; only 4 security-event alarms exist). | `infrastructure/cloudformation/waf-cloudtrail.yaml:308,323,338,353` (security-event alarms only) | See `PHASE_4_REPORT.md` §3.3; RESOLVED via PR #309 |
| 4-ALR-02 | HIGH (P1) | RESOLVED 2026-05-28 (PR #310) | ZERO SNS / PagerDuty / OpsGenie alarm action routing (existing security-event alarms lack `AlarmActions`; no operational notification surface). | `infrastructure/cloudformation/waf-cloudtrail.yaml:308,323,338,353` (no AlarmActions); `infrastructure/lambdas/dmsRollback/index.js` (only SNS reference, one-off Lambda) | See `PHASE_4_REPORT.md` §3.3; RESOLVED via PR #310 |
| 4-APM-01 | HIGH (P1) | RESOLVED 2026-05-28 (PR #311) | ZERO APM tooling across backend (no Datadog / New Relic / Sentry / X-Ray / OpenTelemetry / OTel SDK imports). | `backend/` (grep `datadog|newrelic|@sentry|elastic-apm|opentelemetry|otel|x-ray|xray` returned NO matches) | See `PHASE_4_REPORT.md` §4; RESOLVED via PR #311 |
| 4-OBS-01 | MEDIUM (P2) | OPEN | Correlation / trace-ID propagation gap; no request-correlation middleware in backend/src/middleware/. Only `requestId` usage is PatientDataRequest entity IDs (HIPAA workflow), not request correlation. | `backend/src/middleware/` (no correlation middleware); `backend/src/routes/dataRequests.ts:106,170,205,208,220,227,258,268` (entity-ID usage, not correlation) | See `PHASE_4_REPORT.md` §3.1 |
| 4-RNB-02 | MEDIUM (P2) | OPEN | Missing incident-response runbooks (no 5xx surge / auth-failure-storm / PHI-breach runbook). | `docs/runbooks/` (Glob `INCIDENT*` returned empty); `backend/docs/incident-runbooks.md` (broader prose, not per-incident-class) | See `PHASE_4_REPORT.md` §3.2 |
| 4-3PL-02 | MEDIUM (P2) | OPEN | Admin / godView / internalOps share ALB target group + auth surface with data-plane routes (single ECS task role; no listener segmentation; control-plane breach attack surface equals data-plane). | `backend/src/routes/admin.ts`; `backend/src/routes/godView.ts`; `backend/src/routes/internalOps.ts` | See `PHASE_4_REPORT.md` §5 |
| 4-TEN-02 | MEDIUM (P2) | OPEN | No per-hospital gap-rule threshold overrides (LVEF HFrEF threshold hardcoded for all tenants; representative surface). | `backend/src/ingestion/gaps/gapRuleEngine.ts:81,87` | See `PHASE_4_REPORT.md` §6 |
| 4-TEN-03 | MEDIUM (P2) | OPEN | No per-hospital rule enable / disable mechanism (every hospital sees every rule that fires; no opt-out path). | `backend/prisma/schema.prisma` (no HospitalDisabledRule model or disabledRuleIds field on Hospital) | See `PHASE_4_REPORT.md` §6 |
| 4-OBS-02 | LOW (P3) | RESOLVED 2026-06-04 (by removal; AUDIT-109 PR, branch `audit-109-prod-error-logging`) | Logger CloudWatch silent-swallow + helpers ZERO adoption (`logAPI` / `logRedox` / `logAudit` imported by 0 files, dead code; CloudWatch transport silently degrades on missing winston-cloudwatch package). RESOLVED-by-removal: the dead `winston-cloudwatch` try/catch branch AND the 3 zero-adoption helpers were deleted (verified zero importers via `\b(logAPI\|logRedox\|logAudit)\b` -> only logger.ts). The silent-swallow concern is structurally moot - the AUDIT-109 unconditional stdout Console transport (no env-var gate) supersedes the env-gated CloudWatch branch. | `backend/src/utils/logger.ts` (dead branch + helpers removed) | See `PHASE_4_REPORT.md` §3.1 + §10.1; resolved in AUDIT-109 PR |
| 4-RNB-01 | LOW (P3) | OPEN | Split-location runbook hierarchy (3 locations with no canonical convention). | `docs/runbooks/` (4 canonical); `docs/` top-level (8 `*RUNBOOK*.md`); `backend/docs/incident-runbooks.md` (1) | See `PHASE_4_REPORT.md` §3.2 |
| 4-RNB-04 | LOW (P3) | OPEN | Day-N runbook lifecycle (point-in-time Aurora-cutover-arc runbooks pollute new-operator runbook surface beyond their execution window). | `docs/DAY_9_TUESDAY_RUNBOOK.md`; `docs/DAY_9_SYNTHEA_SEED_RUNBOOK.md`; `docs/DAY_10_WEDNESDAY_RUNBOOK.md`; `docs/DAY_11_THURSDAY_RUNBOOK.md` | See `PHASE_4_REPORT.md` §3.2 |
| 4-APM-02 | LOW (P3) | OPEN | Aurora ACU calibration not codified in IaC for production (only staging cluster codified; production provisioned out-of-band per AUDIT-078 deferral). | `infrastructure/cloudformation/tailrd-staging.yml` (staging only); production Aurora cluster not in `infrastructure/cloudformation/` | See `PHASE_4_REPORT.md` §4 |
| 4-TEN-04 | LOW (P3) | OPEN | No per-hospital alert routing configuration (`User.notificationPreferences` is per-user, not per-hospital; no escalation paths, recipients, or alert thresholds per tenant). | `backend/prisma/schema.prisma:189` (User.notificationPreferences); no Hospital-scoped alert routing column or model | See `PHASE_4_REPORT.md` §6 |
| 4-OMP-02 | LOW (P3) | OPEN | No intermediate approval-token gate between detection and CDS Hooks emit (recommendations flow directly to clinician surface; dismissal-at-consumption per CLAUDE.md §8 is effective Pattern 2 for deterministic detection per operator confirmation B.2 decision (2); strict-mode codification deferred to v2.0). | `backend/src/ingestion/gaps/gapRuleEngine.ts` (263 gaps.push sites); `backend/src/routes/cdsHooks.ts:185,257,271` | See `PHASE_4_REPORT.md` §8 |
| 4-ALR-03 | INFO | OPEN (documentation) | "Alert" terminology overload (clinical-alerts via Alert model + cdsHooks emit chain vs operational-alerts via SNS; glossary needs explicit disambiguation). | `backend/src/services/alertService.ts`; `backend/src/services/clinicalAlertService.ts`; `backend/prisma/schema.prisma:475-520` (Alert model) | See `PHASE_4_REPORT.md` §3.3 |
| 4-3PL-01 | INFO | OPEN (architectural observation) | No explicit control / data / management plane separation (no plane annotation across backend/src/routes/ files; routes organized by clinical-module concern, not by plane). | `backend/src/routes/` (grep `control[_\- ]plane|data[_\- ]plane|management[_\- ]plane` returned NO matches across repository) | See `PHASE_4_REPORT.md` §5 |
| 4-3PL-03 | INFO | OPEN (architectural observation) | No IAM role separation per plane (single ECS task role grants read + write across all resources; no read-only role for analytics, no admin-elevated role for control-plane operations). | `infrastructure/iam-policies/app-role-policy.json`; `infrastructure/iam-policies/app-role-policy-production.json` | See `PHASE_4_REPORT.md` §5 |
| 4-TEN-01 | INFO | OPEN (architectural observation) | Coarse-only per-tenant config (6 module Booleans + subscription tier + Redox config + EHR issuer mapping; no fine-grained per-hospital clinical-rule configurability surface). | `backend/prisma/schema.prisma:38-43` (module Booleans), `:46-50` (subscription), `:32-35` (Redox config), `:132-145` (HospitalEhrIssuer) | See `PHASE_4_REPORT.md` §6 |
| 4-PLG-01 | INFO | OPEN (architectural observation) | No plugin architecture (monolithic Express; no extension-point pattern, no plugin loader, no hook registry; extension surface = source-code modification only). | `backend/src/` (grep `plugin|extension[_\- ]point|registerPlugin|loadPlugin|pluginRegistry|hookRegistry` returned NO matches) | See `PHASE_4_REPORT.md` §7.2 |
| 4-OMP-01 | INFO | OPEN (architectural; dismissal-at-consumption framing) | Gap-finding + clinical-recommendation emit tightly coupled (single 11,673-LOC file, 263 gaps.push sites with inline recommendations; CLAUDE.md §8 dismissal framing is effective Pattern 2 for deterministic detection per B.2 decision (2)). | `backend/src/ingestion/gaps/gapRuleEngine.ts:3314,3347,3385` (representative tight-coupling sites) | See `PHASE_4_REPORT.md` §8 |
| 4-LLM-01 | N/A | DOCUMENTED (policy-aligned) | LLM-call policy ALIGNED (ZERO cloud-LLM SDK imports across repository; ECG AI pipeline is local-only and gated off per CLAUDE.md §8 FDA-clearance requirement). | `backend/` (grep `from ['"](@?anthropic|openai|@google/generative-ai|cohere|@xai|@mistralai)` returned NO matches); `backend/src/services/ecgAIService.ts:11` (CLAUDE.md §8 cross-reference comment) | See `PHASE_4_REPORT.md` §7.1 |

**Phase 4 cross-cutting observations (Pattern A / B / C per PHASE_4_REPORT.md §9.1):**

- **Pattern A operational-monitoring cluster** (4-OBS-01 + 4-ALR-01 + 4-ALR-02 + 4-APM-01): single operational-instrumentation maturity gap producing logs-only observability stance; remediation should be designed as a single sprint (~20-30h combined; ~17-25h gate-item subset per PHASE_4_REPORT.md §10.2).
- **Pattern B extension-surface absence cluster** (4-3PL + 4-TEN-02/03/04 + 4-PLG + 4-OMP-02): coherent architectural-pattern cluster sharing the same rationale (deterministic-rule + monolithic + tightly-coupled was the right call at current pilot scale); trigger conditions for upgrade tracked in PHASE_4_REPORT.md §10.3 v2.0 carry-forward.
- **Pattern C documentation discipline cluster** (4-RNB-01 + 4-RNB-04): runbook hygiene independent of operational maturity; ~1h total; candidate for hygiene PR after Phase 4 merges (not bundled per §17.3 scope discipline).

**§17.1 architectural-precedent candidates flagged for SEPARATE methodology PR per §17.3 scope discipline:**

5 candidates listed verbatim in PHASE_4_REPORT.md §9.2 for separate methodology PR queue (NOT bundled in Phase 4 PR). Candidates: 3PL-discipline-absence rationale, coarse-only-per-tenant-config-positioning rationale, no-plugin-architecture rationale, dismissal-at-consumption-as-effective-Pattern-2 codification, logs-only-observability-stance rationale.

---

### AUDIT-087 - Phase 0A Phase 4 methodology codification arc (6 §17.1 entries + 2 DRIFT entries + 2 gitignore patterns)

- **Phase:** Methodology codification (Phase 0A Phase 4 sister-arc; standalone methodology PR)
- **Severity:** LOW (P3); drift-prevention discipline; no production-risk; methodology-debt paydown across 4 surface layers (`AUDIT_METHODOLOGY.md` inline §17.1 catalog, `AGENT_DRIFT_REGISTRY.md`, `.gitignore`, `BUILD_STATE.md` narrative)
- **Status:** **RESOLVED 2026-05-19** at this methodology PR's merge
- **Tier:** B (methodology-discipline; sister to AUDIT-064)
- **Detected:** 2026-05-19; methodology-debt accumulated across PR #284 §6 (§17.1 16th-entry codification deferral; gitignore pattern pre-flight anchoring discipline) + PR #285 §9.2 (5 §17.1 candidates from Phase 4 audit) + same-session arc DRIFT-44 trigger events (PR #284 chat-side + PR #285 agent-side em-dash slips) + same-session arc DRIFT-45 trigger events (PAUSE B.1 Source C scope sourcing + PAUSE M.1 `/pr-body-*.md` duplicate)
- **Evidence:**
  - `docs/audit/PHASE_4_REPORT.md` §9.2 (5 §17.1 candidates verbatim; codified inline as entries 17-21)
  - PR #284 commit body §6 (§17.1 16th-entry deferral; codified inline as entry 16)
  - DRIFT-44 catalyst events: PR #284 pr-body chat-side em-dash slip (2-round Select-String catch, 4 initial + 7 secondary = 11 total); PR #285 pr-body agent-side em-dash slip (9 em-dashes caught at B.4.10 pre-flight scan; fixed via 3 Edit replacements to 0)
  - DRIFT-45 catalyst events: PAUSE B.1 Source C scope sourcing not canonical-grep-verified against `PATH_TO_ROBUST.md` v1.2 L60; PAUSE M.1 scope item 5 included `/pr-body-*.md` as new gitignore addition but pattern already present at `.gitignore` L82 per PR #284 (M.1.6 finding 3 caught the duplicate)
- **Resolution:** This methodology PR ships across 5 files:
  - `docs/audit/AUDIT_METHODOLOGY.md` §17.1 catalog 15 to 21 inline entries (entries 16-21 added; entries 1-13 remain in design-refinement-notes per existing convention)
  - `docs/audit/AGENT_DRIFT_REGISTRY.md` DRIFT-43 to DRIFT-45 (DRIFT-44 em-dash discipline + DRIFT-45 chat-side canonical-doc grep pre-flight; mechanism updates active for future PR-authoring + scope-prompt-authoring steps)
  - `.gitignore` 10 patterns to 12 patterns (2 new patterns `/docs/audit/V2_*_DAY11.md` + `/docs/audit/AGENT_DRIFT_REGISTRY_DRAFTS_*.md` covering 5 pre-existing DAY11 draft files; sister-section to AUDIT-016 PR #284 backlog with leading-slash anchoring per §17.1 16th entry)
  - `BUILD_STATE.md` 2026-05-19 narrative entry (sister-arc to Phase 4 audit closure entry; co-located 2 entries dated 2026-05-19)
  - This AUDIT-087 register entry (per AUDIT-064 standalone-methodology-PR precedent; LOW P3, RESOLVED at PR merge)
- **Architectural note:** §17.1 entries 1-13 inline consolidation deferred to future engineering-tightening PR per `AUDIT_METHODOLOGY.md` §13 AUDIT-XXX-future-methodology-17.1-consolidation follow-up entry. This PR adds entries 16-21 inline; pre-existing convention of 14-15 inline + 1-13 in design notes preserved.
- **Cross-references:**
  - AUDIT-064 (sister methodology-codification register precedent; §9.2 full-pipeline-regen codification, 2026-05-06)
  - `AUDIT_METHODOLOGY.md` §17.1 entries 16-21 (the codified content)
  - `AGENT_DRIFT_REGISTRY.md` DRIFT-44 + DRIFT-45 (the codified drift mechanisms)
  - Phase 4 closure PR #285 (source-of-truth for §17.1 entries 17-21 via PHASE_4_REPORT.md §9.2 sister §9.2 deferred-candidate enumeration)
  - PR #284 §6 (source-of-truth for §17.1 16th entry + sister origin for DRIFT-44 chat-side trigger event)
  - `BUILD_STATE.md` 2026-05-19 methodology-PR-sister-arc narrative entry (operational ledger surface)
  - §17.3 scope discipline (named tech-debt items NOT bundled here; `AUDIT_FINDINGS_REGISTER.md` L54 stale `#258 (PR 2)` reference RESOLVED in ledger-reconciliation PR (sister to AUDIT-087))

---

### AUDIT-088 - BreachIncident.hospitalId lacks @relation FK declaration (schema-integrity gap)

- **Phase:** 5 (5-BRC-06 P1.3.3c sister-arc discovery)
- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Discovered:** 2026-05-20 during P1.3.3c integrity verification of D6 breachNotification.ts handlers; surfaced when authoring tenant-isolation tests against `prisma.breachIncident.findFirst({ where: { id, hospitalId } })`
- **Location:** `backend/prisma/schema.prisma:2113-2115` (model BreachIncident; hospitalId String? declared without `hospital Hospital @relation(...)`)
- **Evidence:** All sister patient-data models declare `hospitalId String` + `hospital Hospital @relation(fields: [hospitalId], references: [id], onDelete: Restrict)` together (verified at schema.prisma:174-175 RedoxEHRConnection, :202-203 RedoxConnection, :275-276 User, :374-375 Encounter, :424-425 Observation, :477-478 Order, :523-524 Diagnosis, etc.). BreachIncident.hospitalId at :2115 carries the column without the relation. Practical effect: no FK constraint at DB layer; ON DELETE Restrict not enforced; `prisma.hospital.findUnique({ include: { breachIncidents: true } })` cannot work; orphan BreachIncident rows possible after hospital delete.
- **Severity rationale:** Tenant-isolation at application layer (`coveredEntityService.assertTenantScope` + Layer 3 prismaTenantGuard) currently provides defense; absence of DB-layer FK is hygiene-tier risk for v2.0+ scale (orphan row backfill cost if a hospital is ever hard-deleted). NOT a Phase 5 GATE item; v3.0 schema hygiene track.
- **Remediation:** Schema migration adding `hospital Hospital @relation(fields: [hospitalId], references: [id], onDelete: Restrict)` with explicit relation name to disambiguate from CoveredEntity relation. Validate no orphan rows exist before applying (`SELECT id FROM "BreachIncident" WHERE "hospitalId" IS NOT NULL AND "hospitalId" NOT IN (SELECT id FROM "Hospital")`). v3.0 schema-hygiene PR.
- **Effort estimate:** S (1-2h migration + verification; sister to existing FK pattern)
- **Dependencies:** None hard; coordinates naturally with any future BreachIncident schema work
- **Cross-references:** see 5-BRC-06 (sister parent finding); see AUDIT-011 (tenant-isolation Layer 3 currently compensates); see AUDIT-074 (schema-reading hygiene gaps; sister-pattern); see `backend/prisma/schema.prisma:174-175` (canonical sister-model FK declaration pattern)

---

### AUDIT-089 - breachNotification.ts dual-export hygiene (module.exports overrides export default)

- **Phase:** 5 (5-BRC-06 P1.3.3c sister-arc discovery)
- **Severity:** LOW (P3)
- **Status:** OPEN
- **Discovered:** 2026-05-20 during P1.3.3c D10 jest execution; 19 of 48 route-handler tests initially failed with `TypeError: Cannot read properties of undefined (reading 'stack')` when accessing `require('../routes/breachNotification').default.stack`
- **Location:** `backend/src/routes/breachNotification.ts:693-694` (`module.exports = router;` immediately precedes `export default router;`)
- **Evidence:** TypeScript compiles `export default router` to roughly `exports.default = router`. The preceding `module.exports = router` REPLACES the module.exports binding with the router function; the local `exports` reference is now stale (still pointing at the original empty object). The subsequent `exports.default = router` sets `.default` on the stale (now-orphaned) object. Net effect: `require('../routes/breachNotification')` returns the router function; `require('../routes/breachNotification').default` returns `undefined`. D10 getHandler test helper required `mod.default ?? mod` workaround (codified at `backend/src/__tests__/breachCeNotification.test.ts:212-219` with explicit AUDIT-089 reference comment).
- **Severity rationale:** No production-runtime impact; existing routes/mounting work fine because Express imports the default mount. Tests + future tooling that assume canonical TS `export default` semantics will silently get undefined. Hygiene-tier finding.
- **Remediation:** Delete `module.exports = router;` at L693; rely solely on `export default router;` at L694 (canonical ES module pattern; matches all other route files including coveredEntity.ts:321). After remediation, remove the `mod.default ?? mod` workaround in `breachCeNotification.test.ts:212-219`.
- **Effort estimate:** XS (5min single-line deletion + 1-line test cleanup)
- **Dependencies:** None
- **Cross-references:** see 5-BRC-06 (sister parent finding); see `backend/src/__tests__/breachCeNotification.test.ts:212-219` (test-side workaround codified inline); see canonical sister-route pattern at `backend/src/routes/coveredEntity.ts:321` (single `export default router;`)

---

### AUDIT-090 - PDF-signing infrastructure absence (§164.410(c) signedPdf channel deferral)

- **Phase:** 5 (5-BRC-06 P1.3.3c sister-arc discovery)
- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Discovered:** 2026-05-20 during P1.3.3b breachCeNotificationService NotificationChannel framework authoring (Q-5BRC-B v1.0 channel scope)
- **Location:** `backend/src/services/breachCeNotificationService.ts:315-323` (dispatchChannel.signedPdf throws NotImplementedError); `backend/src/routes/breachNotification.ts:481-496` (POST /:id/ce-notification/send returns 501 for signedPdf channel)
- **Evidence:** Q-5BRC-B locked channel framework with 4 NotificationChannel types (email, signedPdf, securePortal, sms). v1.0 scope ships email channel concrete (AWS SES via emailService.sendEmail). signedPdf channel currently throws `NotImplementedError('signedPdf channel', 'PDF-signing infrastructure deferred to v3.0 per Q-5BRC-B; AUDIT entry filed at P1.3.3c per Deliverable 11')`. No PDF-signing dependency in package.json (no `pdf-lib` + `node-signpdf` + DocuSign SDK + AWS Signer client). §164.410 does not REQUIRE PDF as a notification format (email + securePortal + signed-document acknowledgment paths all permissible per §164.404(c)(1)(F) contact-procedures flexibility), but PDF is preferred by many CEs for record-retention discipline + statutory archival.
- **Severity rationale:** v1.0 production-deployable through email channel alone for current pilot scope (single CE per tenant; BSW + Mount Sinai pilot phase). v3.0 multi-tenant + many-CE scaling pressure surfaces PDF requirement as differentiator for sales conversations + enterprise BAA negotiations.
- **Remediation:** Three-step v3.0 work block: (1) PDF-signing library evaluation (pdf-lib + node-signpdf for self-signed PKI vs DocuSign SDK for managed e-signature vs AWS Signer for cloud-managed); (2) certificate/key management strategy (KMS-issued cert vs CA-issued vs managed-DocuSign); (3) breach-ce-notification template PDF rendering branch + dispatchChannel.signedPdf concrete implementation. Recommend §17.1 architectural-precedent candidate codification at P1.3.4 self-review (pattern: notification-channel-deferral-with-explicit-NotImplementedError sister to AUDIT-022 phased-rollout precedent).
- **Effort estimate:** v3.0 scope (~20-40h depending on library choice + cert strategy)
- **Dependencies:** Q-5BRC-B v3.0 channel-expansion scope; potential dependency on enterprise BAA negotiations that surface PDF as contractual requirement
- **Cross-references:** see 5-BRC-06 (sister parent finding); see Q-5BRC-B (channel framework lock decision); see §17.1 candidate at P1.3.4; see `backend/src/services/breachCeNotificationService.ts:315-323` (deferred dispatch path); see `backend/src/services/breachCeNotificationService.ts:36-42` (channel framework v1.0 scope rationale)

---

### AUDIT-091 - P1.3.3b prisma generate Docker discipline (WSL stale-client risk during 5-BRC-06 sister-arc)

- **Phase:** 5 (5-BRC-06 P1.3.3b sister-arc discovery)
- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Discovered:** 2026-05-20 during P1.3.3b coveredEntityService + breachCeNotificationService authoring; Prisma client types for new CoveredEntity model + BreachIncident extensions (ceNotifiedAt + ceAcknowledgedAt + ceFollowupRequestedAt + ceFollowupRespondedAt + baActsAsAgent + baActsAsAgentRationale + fourFactorRiskAssessment + fourFactorRiskCompletedAt + fourFactorRiskCompletedBy + lawEnforcementDelayActive + lawEnforcementDelayUntil + lawEnforcementDelayRationale + burdenOfProofRetentionUntil) added in P1.3.3a migration require `npx prisma generate` to materialize TypeScript types
- **Location:** `backend/prisma/schema.prisma` (P1.3.3a additions); local WSL Prisma client regeneration disciplines per CLAUDE.md §15 RULE 6 + §18 stale Prisma type detection
- **Evidence:** CLAUDE.md §15 RULE 6 explicitly notes "WSL cannot run `prisma generate` locally against Windows filesystem" + §18 "When `tsc` shows errors for fields that exist in `schema.prisma`, these are stale-client errors from WSL. Do NOT add `as any` casts. Verify the field exists in schema.prisma, note it as a stale-client error, and move on. These resolve in Docker build where `prisma generate` runs correctly." P1.3.3c TypeScript compile PASSED locally (exit 0) at RESUME.1 gate, indicating the Windows-side Prisma client was successfully regenerated post-P1.3.3a migration. If a WSL-only operator re-runs the workflow without Docker-build verification, stale-client errors will surface on new schema fields.
- **Severity rationale:** Operator-discipline finding rather than code-defect. Mitigated for current operator via Windows-side regen success. Risk surfaces if future maintainer operates from WSL-only environment + skips Docker-build verification step.
- **Remediation:** Two-step v2.0 codification: (1) Promote `docs/POST_MIGRATION_PRISMA_GENERATE_PROTOCOL.md` if not extant + cross-reference from CLAUDE.md §18 stale-Prisma-detection rule; (2) CI/CD pre-merge gate that runs `docker build --target=builder` against the PR's schema.prisma + verifies Prisma client compiles. Sister to CLAUDE.md §15 RULE 3 "Test the container locally before every push" but specifically scoped to schema-change PRs.
- **Effort estimate:** v2.0 scope (~4-8h for protocol doc + ~6-10h for CI/CD gate)
- **Dependencies:** None hard; coordinates naturally with AUDIT-085 production-migration-execution-environment work + AUDIT-091 itself rolls into broader schema-hygiene track
- **Cross-references:** see 5-BRC-06 P1.3.3a migration (catalyst); see CLAUDE.md §15 RULE 6 + §18 (precedent stale-client discipline); see AUDIT-085 (sister production-migration-execution-environment finding); see CLAUDE.md §15 RULE 3 (sister "test container locally" discipline)

---

### AUDIT-092 - emitAudit CE-binding refactor candidate (5-ADM-09 P1.3.3b sister-arc discovery)

- **Phase:** 5 (5-ADM-09 P1.3.3c.IMPLEMENT-2 sister-arc discovery)
- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Discovered:** 2026-05-22 during 5-ADM-09 P1.3.3c.IMPLEMENT-2A test authoring; F1 updateHospitalBaaCache + F2 upsertCoveredEntityBaaExecution audit-emission divergence surfaced (F1 uses inline `auditLogger.info` with `resourceType='Hospital'`; F2 uses `emitAudit` helper hardcoded to `resourceType='CoveredEntity'`)
- **Location:** `backend/src/services/coveredEntityService.ts` (`emitAudit` helper hardcoded CE binding; F1 `updateHospitalBaaCache` inlines `auditLogger.info` for Hospital scope)
- **Evidence:** `emitAudit` was designed for CE-scoped audit events per PR #292 D8 + D9. F1 audit emission for Hospital scope cannot reuse helper without resourceType parameterization OR per-scope helper split. Current divergence is functionally correct (verified at 42 IMPLEMENT-2A test PASS) but creates two parallel audit-emission idioms in the same module + adds a third pattern in `baaDocumentService.ts` (SIGNED_BAA_UPLOADED + SIGNED_BAA_RETRIEVED inline). Three idioms across one BAA arc create sister-precedent divergence cost as future audit-resource scopes are added.
- **Severity rationale:** Maintenance-burden finding rather than runtime defect. Mitigated for current behavior via 118 IMPLEMENT-2 test PASS coverage. Risk surfaces as audit-emission patterns multiply across BAA + breach-notification + CE management surfaces; refactor would unify discipline.
- **Remediation:** Refactor `emitAudit` to accept `resourceType` + `resourceId` parameters; OR split into `emitCeAudit` + `emitHospitalAudit` + `emitBaaDocumentAudit` per scope. Migration touches `coveredEntityService.ts` + `baaDocumentService.ts` + IMPLEMENT-2A + IMPLEMENT-2B + IMPLEMENT-2C test assertions.
- **Effort estimate:** ~4-8h (refactor + test update)
- **Dependencies:** None hard; coordinates naturally with future audit-emission patterns across BAA + breach-notification + CE management surfaces
- **Cross-references:** see 5-ADM-09 P1.3.3b commit 81dbea4 (catalyst); see PR #292 D8 + D9 (emitAudit helper origin); see `backend/src/services/coveredEntityService.ts` emitAudit helper; see `backend/src/services/baaDocumentService.ts` SIGNED_BAA_UPLOADED inline pattern
- **Status note:** 2026-05-22 OPEN at P1.3.3c.IMPLEMENT-3 batch-filing per Q-5ADM-O Default decomposition.

---

### AUDIT-093 - HospitalNotFoundError candidate addition to CE error hierarchy (5-ADM-09 P1.3.3b sister-arc discovery)

- **Phase:** 5 (5-ADM-09 P1.3.3c.IMPLEMENT-1 + IMPLEMENT-2A sister-arc discovery)
- **Severity:** LOW (P3)
- **Status:** OPEN
- **Discovered:** 2026-05-22 during 5-ADM-09 P1.3.3c.IMPLEMENT-2A F1 test authoring; Hospital-not-found path surfaces via `CoveredEntityValidationError('hospitalId', ...)` per F1 + IMPLEMENT-1 sister-precedent `linkHospitalToCoveredEntity` discipline (line 532)
- **Location:** `backend/src/services/coveredEntityService.ts` CE error hierarchy (CoveredEntityServiceError base + CoveredEntityNotFoundError + TenantScopeViolationError + CoveredEntityAccessDeniedError + CoveredEntityValidationError + BAANotExecutedError + HospitalBaaCacheStaleError + InvalidBaaTransitionError + BAAExpiredError; 9 error classes)
- **Evidence:** F1 + IMPLEMENT-1 currently use `CoveredEntityValidationError('hospitalId', 'Hospital h-XXX not found...')` for Hospital-not-found semantics. Dedicated `HospitalNotFoundError` would improve error-path semantic clarity + downstream route-layer HTTP mapping precision (404 vs 422 per Q-5ADM-Q finer-grained mapping decision).
- **Severity rationale:** Quality-of-design finding rather than runtime defect. Current behavior correct; verified at IMPLEMENT-2A coveredEntityValidationError-class assertion. HTTP mapping at IMPLEMENT-1 routes already maps validation-class to 422; promotion to HospitalNotFoundError would shift to 404 (more precise per Q-5ADM-Q decision).
- **Remediation:** Add `HospitalNotFoundError` class extending `CoveredEntityServiceError`; update F1 `updateHospitalBaaCache` + `linkHospitalToCoveredEntity` to throw new class; update IMPLEMENT-1 route error-mapper for 404; update IMPLEMENT-2A test assertions.
- **Effort estimate:** ~1-2h
- **Dependencies:** None hard; coordinates with Q-5ADM-Q finer-grained error-to-HTTP mapping (already partially applied at IMPLEMENT-1)
- **Cross-references:** see 5-ADM-09 P1.3.3b commit 81dbea4 (catalyst); see Q-5ADM-Q Path A error-to-HTTP mapping decision; see `backend/src/services/coveredEntityService.ts` CE error hierarchy
- **Status note:** 2026-05-22 OPEN at P1.3.3c.IMPLEMENT-3 batch-filing per Q-5ADM-O Default decomposition.

---

### AUDIT-094 - KmsEncryptionContext 4-field shape extension candidate (5-ADM-09 P1.3.3b sister-arc discovery)

- **Phase:** 5 (5-ADM-09 P1.3.3b sister-arc discovery)
- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Discovered:** 2026-05-22 during 5-ADM-09 P1.3.3b `baaDocumentService.ts` authoring; KmsEncryptionContext 4-field shape `{service, purpose, model, field}` forced JSON envelope sidecar pattern for tenant + uploader attribution
- **Location:** `backend/src/services/kmsService.ts` KmsEncryptionContext type definition + `envelopeEncrypt` + `envelopeDecrypt` signatures; `backend/src/services/baaDocumentService.ts` signed-BAA upload uses sidecar metadata JSON for `hospitalId` + `uploadedBy` attribution
- **Evidence:** Current KmsEncryptionContext `{service, purpose, model, field}` fixed 4-field shape per AUDIT-016 v2 envelope encryption design. Tenant + uploader attribution for signed-BAA documents is carried in separate sidecar JSON metadata blob (not in KMS encryption context). Tampering with sidecar JSON does NOT invalidate KMS decryption; only KMS-context tampering does. Extension to include `hospitalId` + `uploadedBy` in KMS context itself would consolidate attribution in single tamper-evidenced surface.
- **Severity rationale:** Defense-in-depth posture improvement; current pattern is secure (KMS context binds blob to service / purpose / model / field; tampering would corrupt decryption). Extension would push tenant + uploader attribution into KMS-enforced surface for stronger tamper evidence + remove sidecar parsing burden in retrieval path.
- **Remediation:** Extend KmsEncryptionContext to `{service, purpose, model, field, tenantId, uploadedBy}` OR equivalent; update `kmsService.envelopeEncrypt` + `envelopeDecrypt` signatures; migrate `baaDocumentService.ts` signed-BAA upload pattern; migrate all other callers (PHI encryption surface + future breach-notification signed-PDF surface).
- **Effort estimate:** ~6-10h
- **Dependencies:** AUDIT-016 v2 envelope encryption pattern (sister-precedent); coordinates with future audit-emission attribution discipline + AUDIT-090 signed-PDF infrastructure work
- **Cross-references:** see 5-ADM-09 P1.3.3b commit 81dbea4 (catalyst); see AUDIT-016 v2 envelope encryption design; see `backend/src/services/kmsService.ts` KmsEncryptionContext type; see `backend/src/services/baaDocumentService.ts` signed-BAA upload sidecar pattern; see AUDIT-090 (sister signed-PDF infrastructure track)
- **Status note:** 2026-05-22 OPEN at P1.3.3c.IMPLEMENT-3 batch-filing per Q-5ADM-O Default decomposition.

---

### AUDIT-095 - Circular import via BAANotExecutedError refactor candidate (5-ADM-09 P1.3.3b sister-arc discovery)

- **Phase:** 5 (5-ADM-09 P1.3.3b sister-arc discovery)
- **Severity:** LOW (P3)
- **Status:** OPEN
- **Discovered:** 2026-05-22 during 5-ADM-09 P1.3.3b extension chain wire-in; `prismaBaaGuard.ts` imports `BAANotExecutedError` from `coveredEntityService.ts` which imports `prisma` from `../lib/prisma` which itself wires in `prismaBaaGuard` via extension chain; three-hop dependency cycle resolves load-safe via CommonJS lazy-default-access semantics; tsc verification confirms no type-cycle
- **Location:** `backend/src/lib/prismaBaaGuard.ts` (imports `BAANotExecutedError` from `../services/coveredEntityService`); `backend/src/services/coveredEntityService.ts` (imports `prisma` from `../lib/prisma`); `backend/src/lib/prisma.ts` (imports + wires `prismaBaaGuard`)
- **Evidence:** Three-hop import chain: `prisma.ts -> prismaBaaGuard.ts -> coveredEntityService.ts -> prisma.ts`. Load-safe per CommonJS lazy-default-access semantics; `tsc --noEmit` exit 0 at IMPLEMENT-1 + IMPLEMENT-2 verification gates confirms no type-cycle. Functional behavior verified at 118/118 IMPLEMENT-2 test PASS.
- **Severity rationale:** Architectural-discipline finding rather than runtime defect; current behavior correct + verified. Refactor candidate to break cycle architecturally for cleaner dependency graph + reduced future-maintenance load-order risk.
- **Remediation:** Extract `BAANotExecutedError` + related BAA error classes (`BAAExpiredError` + `HospitalBaaCacheStaleError` + `InvalidBaaTransitionError`) to shared errors module (e.g., `backend/src/services/errors/baaErrors.ts`); update both `prismaBaaGuard.ts` + `coveredEntityService.ts` imports; verify cycle broken via dependency-graph tool.
- **Effort estimate:** ~3-5h
- **Dependencies:** None hard; coordinates naturally with broader CE error hierarchy maintenance (AUDIT-093 sister)
- **Cross-references:** see 5-ADM-09 P1.3.3b commit 81dbea4 (catalyst); see AUDIT-093 (sister CE error hierarchy track); see `backend/src/lib/prismaBaaGuard.ts` (catalyst location); see `backend/src/services/coveredEntityService.ts` (BAA error class origin)
- **Status note:** 2026-05-22 OPEN at P1.3.3c.IMPLEMENT-3 batch-filing per Q-5ADM-O Default decomposition.

---

### AUDIT-096 - PR-merges-shipping-unmounted-routers architectural class (silent capability gap)

- **Phase:** 5 (5-ADM-09 P1.3.3c.IMPLEMENT-1 sister-precedent catch)
- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Discovered:** 2026-05-22 during 5-ADM-09 P1.3.3c.IMPLEMENT-1 PAUSE A sister-precedent canonical-grep; PR #292 (5-BRC-06 CoveredEntity service) was authored + landed with `backend/src/routes/coveredEntity.ts` router export but without the matching `app.use('/api/coveredEntities', coveredEntityRouter)` mount line in `backend/src/server.ts`. CE CRUD operations were unreachable in production until IMPLEMENT-1 added the mount line inline.
- **Location:** `backend/src/server.ts` (router mount sequence); `backend/src/routes/*.ts` (router exports); CI/CD pipeline (no integration test verifies mount completeness against routes/ directory listing)
- **Evidence:** PR #292 merged + landed without server.ts mount; capability unreachable until P1.3.3c.IMPLEMENT-1 added the mount line. No CI check + no integration test + no PR review prompt caught the absence. Sister to AUDIT-089 ESM/CJS export hygiene catch (different architectural class but same surface: routes/ directory hygiene + mount discipline). HIGH compliance impact for HIPAA-sensitive routers (CE management + BAA execution + breach notification + signed-BAA upload).
- **Severity rationale:** Silent capability gap with HIGH compliance impact for §164.308(b) BA contract execution + §164.404 breach notification hot paths. Mitigated retroactively for PR #292 via P1.3.3c.IMPLEMENT-1 mount fix; risk persists for future router-shipping PRs absent CI/CD or PR-template gate.
- **Remediation:** Two-track v2.0 codification: (1) CI check that scans `backend/src/routes/*.ts` for default-exported routers + verifies each has matching `app.use()` mount in `backend/src/server.ts`; PR-blocking on mismatch. (2) PR template checklist item: "Router added? Verify server.ts mount line added." Lower-effort interim mitigation.
- **Effort estimate:** ~2-4h (CI check authoring + integration with existing CI pipeline) + ~30min (PR template item)
- **Dependencies:** None hard; coordinates naturally with AUDIT-091 schema-hygiene CI/CD discipline + AUDIT-089 ESM/CJS export hygiene track
- **Cross-references:** see PR #292 (5-BRC-06 CoveredEntity service catalyst); see 5-ADM-09 P1.3.3c.IMPLEMENT-1 (sister-precedent catch surface); see AUDIT-089 (sister routes/ directory hygiene); see AUDIT-091 (sister CI/CD-pre-merge-gate discipline); see `backend/src/server.ts` (mount sequence location)
- **Status note:** 2026-05-22 OPEN at P1.3.3c.IMPLEMENT-3 batch-filing per Q-5ADM-O AMENDMENT (recommended at IMPLEMENT-3 scope; acceptance proceeded under most-robust posture given A.IMPLEMENT-3.4 surfaced no existing routing-mount-verification entry).

### AUDIT-097 - Standalone methodology PR sister-arc: 6 §17.1 codifications from P1.3.3 5-ADM-09 closure arc

- **Phase:** 5 (5-ADM-09 P1.3.3 closure arc sister-arc methodology PR)
- **Severity:** LOW (P3)
- **Status:** RESOLVED
- **Tier:** DRIFT-PREVENTION
- **Detected:** 2026-05-25 methodology-debt-paydown standalone PR per Q-5ADM-U Path (c) sister-precedent AUDIT-087 / PR #287; 6 §17.1 codifications (entries 22-27) + §13 tracking entry filing (broadened Candidate 6 mechanism per Q-METH-B fold housekeeping) + DRIFT-44 + DRIFT-45 sustained
- **Evidence:** 6 architectural-precedent candidates surfaced across P1.3.3 5-ADM-09 closure arc; methodology debt accumulated during no-live-clients window; sister AUDIT-087 register entry pattern (LOW P3 drift-prevention discipline; RESOLVED at methodology PR merge)
- **Resolution:** RESOLVED 2026-05-26 at PR #297 methodology PR merge (commit c6d5962258b0544f379e7eb14e0107dd883b6ac7 mergedAt 2026-05-26T03:59:49Z UTC)
- **Architectural note:** Sister-arc to PR #287 standalone-methodology-PR-during-no-live-clients-window precedent; AUDIT_METHODOLOGY.md §17.1 catalog advances 21 to 27 inline entries (entries 22-27 codified inline per AUDIT-087 entries 16-21 sister-precedent format); AGENT_DRIFT_REGISTRY.md DRIFT-45 sustained (no new DRIFT entries this PR; §17.1 entries cover the same patterns at architectural-precedent surface vs drift-event surface); §13 tracking entry for AUDIT-097 future methodology 17.1 consolidation tracking filed per Q-METH-B fold housekeeping to close documentation-narrative-vs-canonical-state divergence at filing surface
- **Cross-references:** see AUDIT-087 sister-precedent methodology PR; see PR #287 sister-arc; see PR #294 + PR #295 + PR #296 P1.3.3 5-ADM-09 closure arc catalyst; see Q-5ADM-U Path (c) operator decision; see Q-METH-A Path (b) standalone Candidate 6 operator decision; see Q-METH-B fold §13-tracking-entry-missing operator decision
- **Status note:** 2026-05-26 AUDIT-097 RESOLVED-on-main per PR #297 methodology PR merge (commit c6d5962258b0544f379e7eb14e0107dd883b6ac7 mergedAt 2026-05-26T03:59:49Z UTC); 6 §17.1 codifications (entries 22-27) + §13 housekeeping tracking bullet landed across AUDIT_METHODOLOGY.md +73 + AUDIT_FINDINGS_REGISTER.md +12 = 85 insertions total per PAUSE C.E.METH 5-gate verification + PR #297 13-section sister-precedent PR #286 long-form body authored at zero em-dash discipline drift; Q-METH-D Path (b) post-merge fresh-context OPEN-to-RESOLVED transition pattern per §18 register-literal RESOLVED-on-main lifecycle (Q-METH-D Path (b) supersedes PR #286 atomic-pattern precedent which predates §18 lifecycle codification arc; subsequent PRs #293 + #295 + #296 established Path (b) as more-recent more-robust discipline); sister-precedent POSTMERGE-1 + P1.3.4 + PR #295 + PR #293 + PR #296 5-PR post-merge Status-flip track record sustained; 27 cumulative V.5-RECOVERY catches across full P1.3.3 + METH + RESUME.METH + PAUSE E.METH + this PAUSE F.METH work block (27th catch = AUDIT-097 Detected + Cross-references fields citing "PR #287 sister-arc" brief-error from pre-Q-METH-E authoring; §17.3 scope discipline locked those fields as non-modifiable at this work block per kickoff brief; canonical methodology sister-precedent is PR #286 per Q-METH-E operator acknowledgment + PR #297 PR-body Cross-references section + Methodology Event section narrative; divergence is documentation-time-locked per Entry 27 codification of documentation-claim-vs-canonical-state divergence pattern; future engineering-tightening PR may retroactively correct AUDIT-097 Detected + Cross-references fields if operator decides scope warrant).

### AUDIT-098 - Double-unwrapped `dashboard?.data?.summary` silently renders mock KPI / GapIntelligence on 5 non-HF Executive views + shared ServiceLineKPIBanner under USE_REAL_API

- **Phase:** Frontend-backend wiring (clinical-gap-surface Option 2 verification arc; non-HF Executive + service-line KPI surface)
- **Severity:** HIGH (P1)
- **Status:** RESOLVED
- **Discovered:** 2026-05-31 during Option 2 clinical-gap-surface code trace (verifying the clinical-gap surface is wired + code-identical across all 6 modules). PAUSE A canonical-grep of `dashboard?.data?.summary` surfaced a double-unwrap consumer pattern on the Executive KPI / GapIntelligence surface that diverges from the HF ExecutiveView correct single-unwrap. `apiFetch` (`src/services/api.ts:254`) already unwraps the backend `{ success, data, ... }` envelope (`return json.data !== undefined ? json.data : json;`), so a consumer reading `dashboard?.data?.summary` reads `.data` on the already-unwrapped object (undefined) and `?.summary` short-circuits to undefined, silently falling back to the hardcoded mock KPI block with no error and no Demo-Data indicator even under `REACT_APP_USE_REAL_API=true` with a valid MFA session.
- **Location (6 files):** `src/ui/coronaryIntervention/views/CoronaryExecutiveView.tsx`; `src/ui/electrophysiology/views/EPExecutiveView.tsx`; `src/ui/peripheralVascular/views/PeripheralExecutiveView.tsx`; `src/ui/structuralHeart/views/StructuralExecutiveView.tsx`; `src/ui/valvularDisease/views/ValvularExecutiveView.tsx`; `src/components/shared/ServiceLineKPIBanner.tsx`. HF `src/ui/heartFailure/views/ExecutiveView.tsx` UNAFFECTED (reads correct `dashboard.summary` per `:326`-`:372`).
- **Evidence:** `grep dashboard?.data?.summary src/` returns exactly the 6 files above (5 non-HF Executive views + the shared service-line banner; no others). HF `ExecutiveView.tsx` reads `dashboard.summary.*` single-unwrap (correct) at lines 326-372. `apiFetch` envelope unwrap confirmed at `src/services/api.ts:254`. The double-unwrap renders fabricated KPI numbers (totalPatients / totalOpenGaps / gdmtOptimized / deviceCandidates / gapsByType) on CMO/VP Executive dashboards + the shared ServiceLineKPIBanner with NO error path and NO Demo-Data indicator under live API + valid MFA. Silent-wrong-data on the platform's core customer-facing value surface.
- **Severity rationale:** HIGH (P1), classified up from a P2 first-read per the decision-framework default (between two severities take the higher; downgrade later only if evidence supports). Silent-mock-when-live is a correctness defect on the CMO/VP + service-line KPI surface, the platform's core customer-facing value surface; it violates the structured-errors-over-silent-defaults discipline (no error, no Demo-Data indicator, fabricated numbers presented as real). Not PHI / security / auth (so not P0); underclaiming severity on a silent-wrong-data defect at the executive surface is the wrong direction.
- **Remediation (Option 1, ACCEPTED):** Collapse the double-unwrap to the single-unwrap `dashboard?.summary` in all 6 files (uniform mechanical fix; `apiFetch` already unwraps `.data`). Batched single PR. Add tests covering the real-render / loading / error / empty branches per file (the four states the silent fallback currently collapses). Justification for Option 1 over a per-module rewire: the clinical-gap surface is already wired + code-identical across all 6 modules (Option 2 verification ACCEPTED, decisive in code), so the defect is a uniform consumer-side unwrap error, not a per-module wiring gap; a uniform 6-file collapse is the minimal correct fix and no PATH-3 per-module wiring is a prerequisite on this surface. Per-module seed-coverage (the one runtime unknown) folds into the clinical-build verification later when gaps are seeded.
- **Effort estimate:** ~1-2h (6-file uniform edit + real-render / loading / error / empty branch tests)
- **Dependencies:** None hard. Sequences ahead of the clinical Tier-1 build (the clinical-gap surface already surfaces gaps in all 6 modules; this fix unblocks the Executive + service-line KPI surface independently).
- **Cross-references:** see DRIFT-46 (prompt pre-state "5 modules render mock, wire first" diverged from disk; clinical-gap surface wired + code-identical in all 6; bug footprint 6 files not 5; caught via DRIFT-45 canonical-grep discipline); see `src/services/api.ts:254` (apiFetch envelope unwrap); see `src/ui/heartFailure/views/ExecutiveView.tsx:326` (correct single-unwrap reference pattern); see CLAUDE.md section 10 Frontend-Backend Wiring Status (non-HF module wiring surface).
- **Status note:** 2026-05-31 OPEN at filing. Option 1 (6-file double-unwrap collapse + branch tests) is the accepted remediation and the next work block per operator decision; clinical Tier-1 build proceeds after, since the clinical-gap surface already surfaces gaps in all 6 modules.
- **Status note:** 2026-05-31 OPEN to IN_PROGRESS (remediation-in-PR) per branch `fix/audit-098-dashboard-unwrap`. Option 1 remediation authored and on disk: the 6-file double-unwrap collapse `dashboard?.data?.summary` to `dashboard?.summary` is grep-verified (0 remaining double-unwrap sites in `src/`; 10 corrected single-unwrap sites across the 6 files; HF `ExecutiveView.tsx` untouched, already correct). Two branch tests added per locked PAUSE-A scope (no new deps; RTL absent, `react-dom/client` + `react-dom/test-utils act` + `jest.mock`): `src/components/shared/ServiceLineKPIBanner.test.tsx` exhaustive 4-state (real-data render / loading / error / empty-shows-visible-Demo-Data, the visible-empty load-bearing criterion) + `src/ui/coronaryIntervention/views/CoronaryExecutiveView.test.tsx` representative wired-value prop-capture (GapIntelligenceCard `totalGaps` surfaces the real `totalOpenGaps` when present; falls back to the inline literal 26 when absent). The other 4 Executive sites (EP / Structural / Valvular / Peripheral) are byte-identical grep-verified collapses; their full-render tests are DEFERRED to the AUDIT-099 testability surface (no RTL added, no scope expansion). Suite green (6/6); tsc clean on the new test files; DRIFT-44 ASCII-clean (both test files). PR operator-gated at PAUSE E per the frontend `src/**` footprint. NOT marked RESOLVED until merged + PAUSE F on-main verification. See AUDIT-099 (the deferred Executive-view honesty finding split out at this remediation).
- **Status note:** 2026-06-01 IN_PROGRESS to RESOLVED on-main per PR #322 squash-merge (mergeCommit `00a2a4fb9410a0ccf40cd04ed9be9a8e3d858b98`, mergedAt 2026-06-01T03:14:45Z UTC; origin/main HEAD over `7cc912e` #321). PAUSE F on-main canonical-grep PASS: `grep dashboard?.data?.summary src/` returns 0 (double-unwrap fully gone on the landed copy); 10 corrected `dashboard?.summary` sites across the 6 files (Coronary x2 / Valvular x2 / Structural x1 / EP x1 / Peripheral x2 / ServiceLineKPIBanner x2); both branch tests present on main (`src/components/shared/ServiceLineKPIBanner.test.tsx` + `src/ui/coronaryIntervention/views/CoronaryExecutiveView.test.tsx`); HF `ExecutiveView.tsx` confirmed absent from the merge (untouched). CI on the merge commit green: TAILRD Platform CI (TypeScript Check + Jest Tests) + Audit Canonical Gates both completed success (Build & Deploy to Staging + ECS are deploy pipelines, not correctness gates). The 4 deferred Executive full-render tests + the Executive-view honesty defects remain tracked under AUDIT-099 (OPEN, HIGH P1).

---

### AUDIT-099 - Non-HF Executive views present fabricated KPI cells with no Demo-Data indicator and a dead `dashboardError` state (silent-mock on loading/error/empty + ~80% hardcoded-by-design cells)

- **Phase:** Frontend-backend wiring (non-HF Executive KPI honesty surface; split out from the AUDIT-098 remediation at its PAUSE C)
- **Severity:** HIGH (P1)
- **Status:** OPEN
- **Discovered:** 2026-05-31 during AUDIT-098 PAUSE C, while authoring the Executive-view collapse tests. The AUDIT-098 unwrap collapse fixes the consumer-side double-unwrap (wired cells now surface real data on a successful load) but does NOT fix the residual honesty defects below; this finding splits them out as distinct from + larger than AUDIT-098.
- **Location (5 files):** `src/ui/coronaryIntervention/views/CoronaryExecutiveView.tsx`; `src/ui/electrophysiology/views/EPExecutiveView.tsx`; `src/ui/peripheralVascular/views/PeripheralExecutiveView.tsx`; `src/ui/structuralHeart/views/StructuralExecutiveView.tsx`; `src/ui/valvularDisease/views/ValvularExecutiveView.tsx`. HF `src/ui/heartFailure/views/ExecutiveView.tsx` UNAFFECTED (renders a real error branch consuming `dashboardError` at `:322`-`:324` and conditionally surfaces live-vs-fallback).
- **Evidence:** (1) Each non-HF Executive view destructures `dashboardError` from `useModuleDashboard` but NEVER consumes it - grep returns a single occurrence per file, the destructure line, with zero render-branch usage (dead error state). A failed dashboard fetch therefore shows fabricated mock numbers with no error path and no indicator. (2) The KPI cells use inline `?? mockLiteral` fallbacks; only a couple of cells per view (`totalPatients`, `totalOpenGaps` via `dashboard?.summary`) have a backend source. The remaining ~80% of cells (Revenue Opportunity, Optimal Therapy Rate, Avg Revenue / Patient, the GapIntelligence `categories` arrays, etc.) are hardcoded `config.kpiData.*` / inline literals with NO backend source at all. (3) Even after the AUDIT-098 single-unwrap collapse, on loading / error / empty the wired cells silently fall back to the inline literal with NO visible Demo-Data badge - in direct contrast to `src/components/shared/ServiceLineKPIBanner.tsx`, which DOES render a visible "Demo Data" badge (the honest pattern). Net: the CMO/VP Executive dashboards present fabricated numbers as real on every non-success state, and for the majority of cells on every state.
- **Severity rationale:** HIGH (P1) by the decision-framework default (between two severities take the higher; downgrade later only with evidence). Confirmed as a register-literal by the operator on 2026-05-31; the downgrade-consideration below is retained as historical rationale. Same customer-facing surface and same silent-fabricated-data class as AUDIT-098 (HIGH P1): no error path, no Demo-Data indicator, fabricated KPI numbers presented as real on the platform's core CMO/VP value surface. Distinct from + larger than AUDIT-098: AUDIT-098 was a uniform consumer-side unwrap correctness bug with a mechanical 6-file fix; AUDIT-099 is a design-dependent honesty + wiring-completeness gap requiring a product decision and per-cell backend sourcing. Downgrade-to-P2 consideration: one can argue the ~80% hardcoded cells are a known demo-data limitation (no backend aggregation yet) rather than a live correctness defect, which would put the residual at MEDIUM (P2); the load-bearing factor for HIGH is the absence of ANY Demo-Data indicator or error path on the Executive surface (the ServiceLineKPIBanner honest-badge pattern is not replicated there, so fabricated numbers are indistinguishable from real). Final severity is the operator decision at PAUSE E.
- **Remediation options (design decision required; NOT in AUDIT-098 scope):** (A) Badge every unbacked cell with a visible "Demo Data" indicator and add an error branch that consumes `dashboardError` (minimal, honesty-first; mirrors ServiceLineKPIBanner + HF). (B) Build the missing backend KPI aggregation sources so the cells are genuinely wired (largest; product-roadmap dependent). (C) HF-style conditional restructure of the Executive views (live-data branch vs Demo-Data branch vs error branch), the pattern HF `ExecutiveView.tsx` already implements. Recommend (A) as the immediate honesty fix, with (B)/(C) as the durable wiring track.
- **Effort estimate:** (A) ~3-5h across the 5 views; (B) unscoped (per-KPI backend aggregation, roadmap dependent); (C) ~6-10h across the 5 views.
- **Dependencies:** Sequences after AUDIT-098 merge (the unwrap collapse is a prerequisite so the wired cells surface real data before the honesty-labeling work lands). Not a clinical-logic / PHI / auth / encryption path (frontend KPI display only).
- **Cross-references:** see AUDIT-098 (parent remediation; the unwrap-collapse this finding was split from); see DRIFT-46 (the PAUSE-A canonical-grep catch that surfaced the wiring-state divergence); see `src/ui/heartFailure/views/ExecutiveView.tsx:322`-`:324` (correct error-branch + live-vs-fallback reference pattern); see `src/components/shared/ServiceLineKPIBanner.tsx` (correct visible Demo-Data badge reference pattern); see CLAUDE.md section 10 Frontend-Backend Wiring Status (non-HF module wiring surface).
- **Status note:** 2026-05-31 OPEN at filing during AUDIT-098 PAUSE C/D. Severity confirmed as register-literal HIGH (P1) by the operator at PAUSE E (2026-05-31): the load-bearing factor is the absence of ANY Demo-Data badge plus the dead `dashboardError` state, so fabricated KPI numbers are indistinguishable from real on the CMO/VP surface - same silent-fabricated-data class and same customer-facing surface as AUDIT-098 (P1); the P2 known-demo-data-limitation argument would hold only if those cells were labeled demo, which they are not, so the classify-up default governs. The 4 deferred Executive full-render tests (EP / Structural / Valvular / Peripheral) fold into this finding's testability surface.

---

### AUDIT-100 - Three DET_OK gap rules carry copy-pasted `evidence` objects with wrong clinical provenance (MRA / RAAS / CAD-statin) on the FDA-CDS-exemption transparency surface

- **Phase:** Clinical-code verification (Phase 0B clinical-code arc continuation; surfaced during the HF/CAD Tier-1 clinical-build PAUSE A 1A inventory)
- **Severity:** HIGH (P1)
- **Status:** RESOLVED 2026-06-01 (correction PR #326, mergeCommit `79a7147`)
- **Discovered:** 2026-05-31 during the Tier-1 clinical-build PAUSE A 1A inventory (first build cluster: HF GDMT + CAD lipid). Per-gap inspection of the cluster's DET_OK gaps surfaced three rules whose `evidence` objects were copy-pasted from unrelated gaps and never corrected, so each renders wrong clinical provenance (wrong guideline, wrong trigger criteria, wrong contraindication set, and in one case a wrong level-of-evidence) on the transparency surface the FDA CDS exemption depends on.
- **Location (3 evaluator blocks in `backend/src/ingestion/gaps/gapRuleEngine.ts`):**
  - MRA-in-HFrEF (code id `Gap HF-36`; operator label HF-007 in the 1A inventory), `evidence` at L3484-L3490: `triggerCriteria: ['Evidence-based beta-blocker not prescribed in HFrEF']` plus beta-blocker exclusions (`Severe bradycardia (HR < 50)`, `Cardiogenic shock`), copy-pasted from a beta-blocker gap. The rule's own gating is LVEF<=40 + K<5.0 + eGFR>30 (L3469-L3471); the correct exclusion set is hyperkalemia / eGFR<30, NOT bradycardia or cardiogenic shock. (Class 1 / LOE A / 2022 AHA/ACC/HFSA source happen to match the MRA rule, so only trigger + exclusions are wrong.)
  - RAAS-in-HFrEF (code id `gap-hf-37-raas`; operator label HF-004), `evidence` at L4945-L4951: `triggerCriteria: ['High-intensity statin not prescribed in PAD']` + `guidelineSource: '2024 ACC/AHA Guideline for Peripheral Artery Disease'`, copy-pasted from the PAD high-intensity-statin gap. The rule's own `recommendations.action` (L4941) correctly cites `2022 AHA/ACC/HFSA, Class 1, LOE A`, so the `evidence` block contradicts the rule's own recommendation text.
  - CAD high-intensity statin (code id `Gap CAD-STATIN`; operator label CAD-001), `evidence` at L4531-L4537: `triggerCriteria: ['Digoxin toxicity risk']` + `guidelineSource: 'DIG Trial Post-Hoc Analysis; 2022 AHA/ACC/HFSA Guideline'` + `levelOfEvidence: 'B'`, copy-pasted from a digoxin gap. The rule's comment + `recommendations.action` (L4514, L4528) correctly cite `2018 ACC/AHA Cholesterol Guideline, Class 1, LOE A`, so even the level-of-evidence in the `evidence` block is wrong (B vs A).
- **Evidence:** Read-File of the running evaluator (per `AUDIT_METHODOLOGY.md` §1 rule-body verification standard, not addendum text) confirms each `evidence` object verbatim at the cited lines. In all three cases the gap still FIRES correctly (detection logic is sound and DET_OK in the canonical crosswalk); the corruption is confined to the `evidence` provenance object the clinician sees. Per CLAUDE.md §14 + the FDA CDS exemption (21st Century Cures Act), every gap must be transparent: the clinician must see the patient data, the guideline, and the logic. These three gaps present a guideline citation and trigger/contraindication set belonging to a DIFFERENT therapy. This is silent-wrong-clinical-data on the exemption-bearing transparency surface, worse than a KPI defect (AUDIT-098 / AUDIT-099) because the wrong content is clinical provenance citing wrong guidelines and wrong contraindications, presented to cardiologists and CMOs as the rule's evidentiary basis.
- **Correction template (3 CLEAN exemplars in the same file):** the CAD lipid-ladder siblings carry self-consistent `evidence` objects and are the correction pattern: `gap-cad-ezetimibe` (`evidence` L4698-L4712, trigger `Ezetimibe not in active medications (RxNorm 341248)`, source `2018 ACC/AHA Cholesterol Guideline (IMPROVE-IT)`); `gap-cad-pcsk9` (`evidence` L7361-L7375, trigger `No PCSK9 inhibitor in active medications`, source `2018 ACC/AHA Cholesterol Guideline`); `gap-cad-omega3` icosapent ethyl (`evidence` L7492-L7501, trigger `Icosapent ethyl not in active medications (RxNorm 1546275)`, source `REDUCE-IT`). Each clean exemplar's `triggerCriteria` / `guidelineSource` match its own detection logic; the three corrupted blocks must be rewritten the same way against authoritative guideline text.
- **Severity rationale:** HIGH (P1) by the classify-up default (between two severities take the higher; downgrade later only with evidence). Same or higher class than AUDIT-098 / AUDIT-099 (HIGH P1, silent-wrong-data on the customer-facing KPI surface): this is silent-wrong-data on the CLINICAL provenance surface the FDA CDS exemption is built on, presented to cardiologists. Not PHI / auth / encryption (so not P0 on those axes), but a wrong-guideline / wrong-contraindication citation on a clinical-decision-support surface is a clinical-accuracy + regulatory-transparency defect, and CLAUDE.md §8 states clinical accuracy is non-negotiable. Underclaiming a wrong-clinical-provenance defect is the wrong direction.
- **Methodology lesson (applies to every DET_OK gap in the 90-gap Tier-1 build):** DET_OK certifies that detection FIRES, NOT that the `evidence` object is semantically correct. The canonical crosswalk's DET_OK status is a detection-logic verdict; it says nothing about whether `triggerCriteria` / `guidelineSource` / `classOfRecommendation` / `levelOfEvidence` / `exclusions` describe THIS rule or a copy-paste donor. Evidence-object verification is therefore mandatory per-gap and must NOT be assumed from DET_OK. This lesson is load-bearing for the remaining DET_OK gaps in the build and is to be applied at each per-gap PAUSE C.
- **Remediation (separate operator-gated `backend/**` PR; NOT in this finding's scope):** rewrite the three `evidence` objects against authoritative guideline text using the three CLEAN exemplars as template (correct `triggerCriteria` to each rule's actual gating; correct `guidelineSource` to the rule's own cited guideline; fix CAD-statin `levelOfEvidence` B to A; replace BB exclusions on MRA with the MRA contraindication set). Per the 1A build plan, that correction PR additionally bundles (separate scope from this filing): §16 RxNav re-verification of the cluster's RxNorm sets - including resolving whether the high-intensity `STATIN_CODES` (`83367` / `301542` / `36567` / `42463`) admit moderate-intensity agents that would suppress a high-intensity-missing gap - and the AUDIT-052 shared med-absence-detector helper extraction. This finding's scope is strictly the evidence-object corruption; it justifies and bounds the correction PR.
- **Effort estimate:** ~2-4h for the evidence-object rewrite + per-gap §16 verification of the three rules' guideline citations (the bundled RxNav re-verification + AUDIT-052 helper extraction are estimated separately in the correction PR).
- **Dependencies:** None hard. The correction PR is the first `backend/**` PR of the Tier-1 clinical build and is operator-gated at PAUSE E per §19.4. Build-time flags to carry into that PR's PAUSE C (NOT blockers, NOT this finding's scope): AUDIT-070 (`lvef` not in `observationService.ts CARDIOVASCULAR_LAB_CODES`, so FHIR-ingested patients miss the 4 HF gaps; CSV path unaffected) and an LDL / TG LOINC FHIR-coverage check for the 4 CAD gaps.
- **Cross-references:** see CLAUDE.md §14 (gap-rule evidence-object requirement + FDA CDS exemption transparency) + §8 (clinical accuracy non-negotiable); see AUDIT-069 (LVEF regression catch precedent - codebase trust, including fix-from comments, is insufficient; verify against authoritative source); see AUDIT-052 (inline-array-to-canonical refactor; the med-absence-detector helper bundled in the correction PR); see AUDIT-070 (FHIR ingestion expansion; build-time flag for the 4 HF gaps); see `AUDIT_METHODOLOGY.md` §1 (rule-body verification standard; this finding's evidence cites running code) + §16 (clinical-code verification standard); see the 3 CLEAN exemplars `gap-cad-ezetimibe` / `gap-cad-pcsk9` / `gap-cad-omega3` (correction template).
- **Status note:** 2026-05-31 OPEN at filing. This finding is filed as an operator-gated docs PR BEFORE any evidence-correction code is authored, so the finding justifies and scopes the correction PR (per the 1A build plan). The correction (a `backend/**` evidence-object rewrite) is the next work block after this finding merges, operator-gated at PAUSE E. NOT marked RESOLVED until the correction PR lands + PAUSE F on-main verification confirms the three `evidence` objects are self-consistent with their rules.
- **Status note (RESOLVED):** 2026-06-01 (UTC; PR #326 commit `Sun May 31 22:36:22 2026 -0700` = 2026-06-01 UTC) OPEN -> RESOLVED. Correction PR #326 (mergeCommit `79a7147`) landed on origin/main and PAUSE F on-main verification confirms all three `evidence` objects corrected: (1) MRA `gap-hf-36` no longer carries beta-blocker `triggerCriteria`/exclusions - now MRA gating (HFrEF + K<5.0 + eGFR>30) with hyperkalemia / eGFR<30 exclusions (Class 1 / LOE A / 2022 AHA/ACC/HFSA were already correct); (2) RAAS `gap-hf-37-raas` `guidelineSource` corrected from the PAD high-intensity-statin copy-paste to 2022 AHA/ACC/HFSA (PARADIGM-HF), COR 1 / LOE A, RAAS exclusions; (3) CAD-statin `gap-cad-statin` `levelOfEvidence` corrected B -> A under 2018 ACC/AHA Cholesterol Guideline, COR 1. Atomic consistency tests present in the PR; `gaps.push` runtime count unchanged at 263 (no detection logic changed); CI green (TAILRD Platform CI + Audit Canonical Gates). Scope of THIS RESOLVED flip is strictly the evidence-object provenance correction. It does NOT cover the gating-code defects in the same cluster: AUDIT-101 (gap-cad-statin ingredient-level `STATIN_CODES` cannot encode high-intensity dose - false-negative / missed-gap class) and AUDIT-102 (gap-cad-pcsk9 + gap-cad-omega3 wrong-drug RxNorm miscodes) remain OPEN as separate findings tracked independently. Evidence-object cleanliness (AUDIT-100, now RESOLVED) and gating-code correctness (AUDIT-101 / AUDIT-102, OPEN) are independent axes per the AUDIT-102 framing note above.

---

### AUDIT-101 - gap-cad-statin silently suppresses a guideline-directed-therapy gap for patients on non-high-intensity or low-dose statins (ingredient-level RxNorm set structurally cannot encode dose) - FALSE-NEGATIVE / MISSED-GAP class

- **Phase:** Clinical-code verification (Phase 0B clinical-code arc continuation; surfaced during the AUDIT-100 PAUSE A 1A inventory + the bundled §16 RxNav re-verification of the HF GDMT + CAD lipid cluster's RxNorm sets)
- **Severity:** HIGH (P1)
- **Status:** RESOLVED 2026-06-04 (dose-aware detection-set fix PR #347 merged to `origin/main` @ `4299a97`, `mergedAt 2026-06-04T21:17:06Z`; PAUSE F on-main verification PASS - see the PAUSE F status note below)
- **Discovered:** 2026-05-31 during the §16 RxNav re-verification of the CAD-statin `STATIN_CODES` set scoped into the AUDIT-100 correction PR. Resolving each member of the high-intensity `STATIN_CODES` set against RxNav `properties.json` surfaced two structural defects that make "on high-intensity statin" undetectable with this code set, so the gap silently fails to fire for patients who are NOT on a high-intensity statin. This is a FALSE-NEGATIVE / MISSED-GAP defect (a patient who SHOULD be flagged is not), a class distinct from AUDIT-100's wrong-provenance / wrong-display class (where the gap fires correctly but renders wrong `evidence` text).
- **Location (`backend/src/ingestion/gaps/gapRuleEngine.ts`):**
  - Gating constant + check: `Gap CAD-STATIN` (code id `gap-cad-statin`; operator label CAD-001), L4517-L4518: `const STATIN_CODES = ['83367', '301542', '36567', '42463'];` then `const onStatin = medCodes.some(c => STATIN_CODES.includes(c));`. The gap fires only when `!onStatin` (L4519); presence of ANY one of the four ingredient codes at ANY dose suppresses it.
  - Intent / gate mismatch surface: the rule comment (L4513-L4515) and `recommendations.action` (L4528) state "High-Intensity Statin in CAD" / "Consider high-intensity statin", and the `medication` field (L4526) specifies "Atorvastatin 40-80mg or Rosuvastatin 20-40mg" (high-intensity doses), but the gate tests only ingredient presence, not strength.
- **Evidence (§1 rule-body verification - running code + authoritative external source, NOT addendum text):**
  - RxNav `properties.json` resolution of the four set members (the §16 external-verification artifact, verbatim): `83367` = atorvastatin; `301542` = rosuvastatin; `36567` = simvastatin; `42463` = pravastatin. All four are ingredient-level (RxNorm TTY `IN`) concepts.
  - Defect (a) - non-high-intensity ingredients in a "high-intensity" set: simvastatin (`36567`) and pravastatin (`42463`) are NOT high-intensity statins at any approved dose (the 2018 ACC/AHA Cholesterol Guideline high-intensity tier is atorvastatin 40-80mg / rosuvastatin 20-40mg only). A CAD patient on simvastatin or pravastatin therefore satisfies `onStatin` and the gap is silently suppressed, even though the patient is NOT on the guideline-recommended high-intensity therapy the gap exists to detect.
  - Defect (b) - ingredient-level codes structurally cannot encode dose: an `IN` RxCUI maps to the ingredient, not the strength. Atorvastatin 10mg and atorvastatin 80mg both resolve to RxCUI `83367`. The set therefore CANNOT distinguish high-intensity atorvastatin 40-80mg from sub-threshold atorvastatin 10-20mg; a patient on low-dose atorvastatin satisfies `onStatin` and suppresses the gap. "On high-intensity statin" is structurally undetectable with an ingredient-level set, regardless of which ingredients are included.
  - Net: the gap is a false-negative for (i) any patient on simvastatin / pravastatin and (ii) any patient on sub-high-intensity atorvastatin / rosuvastatin doses. Detection of "on high-intensity statin" requires dose-level (RxNorm TTY `SCD` / `SBD`) codes or a curated high-intensity-only dose-aware constant.
- **Severity rationale:** HIGH (P1). A silent missed gap on guideline-directed therapy is patient-safety-adjacent: a patient who should be flagged for missing high-intensity statin is not, so the clinical team never sees the gap. This is arguably more serious than the wrong-display class (AUDIT-100 / AUDIT-098 / AUDIT-099), where wrong content is shown but the gap is at least present; here the actionable signal is absent. Per the classify-up default (between two severities take the higher; downgrade later only with evidence) and CLAUDE.md §8 (clinical accuracy non-negotiable), HIGH P1 is the floor. Not PHI / auth / encryption (so not P0 on those axes).
- **Sibling-set note (NOT this finding's scope; flagged for the AUDIT-052 helper):** the identical four-code ingredient-level set is duplicated across sibling gaps in the same file (`gap-cad-statin` L4517, the ezetimibe gate L4687, the PAD high-intensity-statin gate L4865, the PCSK9 gate L7349, the omega-3 gate L7478, plus the canonical `STATIN_CODES_CV` at L27 and the `STATIN_CODES_*` variants at L8357 / L9181 / L9334). Whether each sibling's "on a statin" semantics is dose-sensitive (the CAD / PAD high-intensity gates) or dose-agnostic (an "on any statin" guard) differs per gate; a naive unify of all of them to one shared constant would PRESERVE this false-negative wherever the intended semantics are high-intensity. The AUDIT-052 helper extraction must therefore wait on this finding's high-intensity decision (which set encodes "high-intensity" vs "any statin").
- **Remediation (separate operator-gated `backend/**` PR; NOT in this finding's scope; sequenced AFTER the AUDIT-100 evidence-correction PR):** a clinical-logic + dose-detection decision: replace the ingredient-level set for the high-intensity gates with a dose-aware high-intensity-only constant (RxNorm `SCD` / `SBD` codes for atorvastatin 40-80mg + rosuvastatin 20-40mg), or introduce a dose-extraction step so the gate tests strength, not ingredient. The decision is clinical (which agents / doses count as high-intensity) and structural (where dose data comes from in the ingested medication record), so it is operator-gated and its own PR. This finding justifies and bounds that PR.
- **Effort estimate:** ~4-8h (dose-aware code-set curation + §16 RxNav `SCD` / `SBD` verification of each high-intensity dose + the dose-extraction-vs-coded-set design decision + per-gate semantics triage of the duplicated set + tests). The AUDIT-052 helper extraction is estimated separately and sequences after.
- **Dependencies:** Sequences after AUDIT-100's evidence-correction PR (sibling finding, same gap cluster; that PR corrects the `evidence` provenance, this one corrects the detection set). Blocks the AUDIT-052 high-intensity-statin helper unify (a naive unify preserves the false-negative). Build-time flag (NOT a blocker): AUDIT-070 (FHIR-ingested patients may miss CAD lipid LOINC coverage; CSV path unaffected).
- **Cross-references:** see AUDIT-100 (sibling finding, same MRA / RAAS / CAD-statin cluster; wrong-provenance class vs this false-negative class); see AUDIT-052 (inline-array-to-canonical refactor + the statin med-absence helper that must wait on this finding's high-intensity decision); see AUDIT-069 + `AUDIT_METHODOLOGY.md` §16 (clinical-code external-verification standard; codebase trust insufficient - the RxNav lookup that caught this false-negative is the §16 precedent in action); see CLAUDE.md §8 (clinical accuracy non-negotiable) + §14 (gap-rule evidence object + FDA CDS transparency); see `AUDIT_METHODOLOGY.md` §1 (rule-body verification standard; this finding cites running code at L4517-L4518).
- **Status note:** 2026-05-31 OPEN at filing. Filed as an operator-gated docs PR BEFORE any detection-set code is authored, so the finding justifies and scopes the correction PR. Per the operator-locked sequencing: (i) this AUDIT-101 filing, then (ii) the AUDIT-100 evidence-correction `backend/**` PR, then (iii) the evidence-object validator, then (iv) this finding's detection-set fix + the AUDIT-052 helper. NOT marked RESOLVED until the detection-set fix lands + PAUSE F on-main verification confirms the high-intensity gates test dose, not ingredient.
- **Status note (PAUSE B->D, 2026-06-04):** IN_PROGRESS. Detection-set fix authored on `feat/audit-101-statin-intensity` (off `main` @ `81c7b38`); approach + decisions in `docs/architecture/AUDIT_101_STATIN_INTENSITY_NOTES.md` §8. Operator-locked decisions: Q1 ONE high-intensity gap (no any-statin split; `gap-cad-statin` gate detects high-intensity vs not, fires for everyone not on high-intensity, NO new `gaps.push`); Q2 Approach A (agent + `doseValue` threshold threaded through `evaluateGapRules` as shared `meds: MedicationDose[]` infrastructure; the two call sites stop discarding dose); Q3 REFRAME (dose-unknown -> QUALIFIED fire within the existing node - statin present, high-intensity dosing not documented, confirm or intensify - fail-loud, not silent-suppress, not a definite assertion); Q4 INCLUDE the PAD sibling `gap-pv-1-pad-statin`, §16-cited to the 2024 ACC/AHA PAD Guideline (Gornik 2024, COR 1 LOE A). As-built: shared `highIntensityStatinStatus` helper (atorvastatin `83367` >=40mg / rosuvastatin `301542` >=20mg, with `genericName`/`medicationName` name-fallback so detection survives IN vs SCD/SBD code level); both high-intensity gates rewired; `gaps.push` count unchanged (263); definite-fire status + evidence (COR 1 / LOE A) + hospice exclusion preserved. Sibling `STATIN_CODES` gates (ezetimibe / PCSK9 / omega-3 + `STATIN_CODES_*` variants) keep their "on any statin" `medCodes` semantics untouched; AUDIT-052 unify still waits on this decision. Build-phase verification: CSV-path medications carry no dose (only `ingestSynthea.ts` populates `doseValue`/`doseUnit`), so CSV-ingested statin patients resolve to the Q3 QUALIFIED-fire branch (fail-loud), never silent-suppress - a separate AUDIT-070-adjacent enhancement, not a blocker. Tests: `backend/tests/gapRules/audit101StatinIntensity.test.ts` 22 green (5 TP / 3 TN / 3 exclusion / 2 edge + dose-unknown qualified-fire + simvastatin/pravastatin-no-longer-suppresses regression + PAD sibling + RxNorm-level robustness); existing `audit100EvidenceConsistency` + `clinicalCodeCorrections` suites preserved; tsc clean. Stopped at PAUSE E for the operator-gated `backend/**` merge.
- **Tracked follow-on (Q1 dependency):** the separate any-statin gap KB GAP-CAD-001 ("ASCVD without ANY statin", dose-agnostic) is intentionally NOT built in this PR. It must be authored with a STABLE gap id AFTER the AUDIT-106 gap-id assignment scheme lands, so it is not minted with an id the AUDIT-106 codemod would renumber. This is a coordination dependency on AUDIT-106, not a blocker to the AUDIT-101 high-intensity fix.
- **Status note (PAUSE F, 2026-06-04):** RESOLVED. Dose-aware detection-set fix PR #347 merged (squash) to `origin/main` @ `4299a97` (`mergedAt 2026-06-04T21:17:06Z`). On-main verification: the `highIntensityStatinStatus` helper + the dose-threaded `evaluateGapRules` signature are present on `origin/main`; `gaps.push` runtime count unchanged at **263** (no new node; Q1 ONE-gap decision held); evidence-object validator PASS (263/263 with evidence, 0 inconsistencies); the AUDIT-101 jest suite `backend/tests/gapRules/audit101StatinIntensity.test.ts` is **22 green on main**. Dose-aware gate behavior confirmed via that suite (jest-only, no synthetic golden cohort): a simvastatin or low-dose-atorvastatin CAD/PAD patient FIRES (was silently suppressed); an atorvastatin-80 / rosuvastatin-20-or-40 patient does NOT fire; a dose-unknown atorvastatin patient gets the QUALIFIED fire (Q3 fail-loud). The high-intensity gates now test dose, not ingredient - the closing PAUSE F criterion is met. A follow-up CI-line-coupling fix (commit `b278d08`, `extractCode.test.ts` VD-PANNUS hardcoded line `10675 -> 10801` after the source line-shift) was included in the merged PR; all required checks green at merge. RESOLVED is flipped here in a docs-only ledger PR per the operator-gated sequencing.

---

### AUDIT-102 - Two wrong-drug RxNorm miscodes in the CAD lipid-ladder gates (gap-cad-pcsk9 PCSK9_CODES + gap-cad-omega3 icosapent) detect the wrong drugs entirely - FALSE-POSITIVE / WRONG-SUPPRESSION class

- **Phase:** Clinical-code verification (Phase 0B clinical-code arc continuation; surfaced during the AUDIT-100 correction PR's bundled §16 RxNav re-verification of the CAD lipid cluster's RxNorm sets)
- **Severity:** HIGH (P1)
- **Status:** RESOLVED 2026-06-02 (shared correction PR #332 merged + PAUSE F on-main verification)
- **Discovered:** 2026-05-31 during the §16 RxNav `properties.json` re-verification of the CAD lipid-ladder RxNorm constants (the verification the AUDIT-100 correction PR bundled). Resolving each constant against RxNav surfaced three RxCUIs that resolve to entirely unrelated drugs, so two sibling gaps gate on the wrong medication and cannot correctly detect whether a patient is on the therapy. This is a FALSE-POSITIVE / WRONG-SUPPRESSION class (the gate matches the wrong drug, so a patient actually on the intended therapy is not recognized and the gap mis-fires), distinct from AUDIT-100 (wrong-provenance / wrong-display) and AUDIT-101 (false-negative via dose-blind ingredient set). These constants are NOT in the AUDIT-100 / AUDIT-101 gaps (MRA / RAAS / CAD-statin); they are their own gaps and out of those PRs' scope.
- **Location (`backend/src/ingestion/gaps/gapRuleEngine.ts`):**
  - `gap-cad-pcsk9` (PCSK9 inhibitor gate), L7347 comment + L7351 `const PCSK9_CODES = ['1657974', '1659149'];` then L7352 `const onPCSK9 = medCodes.some(c => PCSK9_CODES.includes(c));`. The comment claims `evolocumab (1657974), alirocumab (1659149)`.
  - `gap-cad-omega3` (icosapent ethyl gate), L7476 comment `RxNorm icosapent ethyl: 1546275` + L7483 `!medCodes.includes('1546275')` (gating) + L7501 evidence triggerCriteria `'Icosapent ethyl not in active medications (RxNorm 1546275)'`.
- **Evidence (§1 rule-body verification - running code + authoritative external source, NOT addendum text):**
  - RxNav `properties.json` resolution of the three coded RxCUIs (verbatim, the §16 external-verification artifact): `1657974` = "4 ML tocilizumab 20 MG/ML Injection" (tty `SCD`; tocilizumab is an IL-6 receptor antagonist, NOT a PCSK9 inhibitor); `1659149` = "piperacillin 4000 MG / tazobactam 500 MG Injection" (tty `SCD`; an antibiotic, NOT a PCSK9 inhibitor); `1546275` = "iodide ion" (tty `IN`; NOT icosapent ethyl).
  - RxNav name-search for the intended drugs (the correct RxCUIs, recorded for the fix; NOT corrected here): evolocumab = `1665684`; alirocumab = `1659152` (note `1659149` vs `1659152` is an off-by-three transcription typo); icosapent ethyl = `1304974`.
  - Behavioral consequence: each gate tests membership against a wrong-drug code. A patient actually on evolocumab / alirocumab / icosapent ethyl is coded with the CORRECT RxCUI in the medication record, which is NOT in the gate's set, so `onPCSK9` / the icosapent guard evaluates false and the gap mis-fires (recommends a therapy the patient is already on) - a FALSE POSITIVE. Conversely a patient on tocilizumab (rheumatology) or piperacillin/tazobactam (infection) is mis-counted as "on a PCSK9 inhibitor" and the gap is wrongly suppressed - a rarer FALSE NEGATIVE on the overlap. Both directions are wrong-drug detection defects.
  - Note on AUDIT-100 framing: AUDIT-100 cited `gap-cad-pcsk9` and `gap-cad-omega3` as CLEAN exemplars. That was correct as to their `evidence` OBJECTS (self-consistent triggerCriteria / guidelineSource) and remains a valid evidence-object template; this finding is a SEPARATE defect in the same gaps' RxNorm GATING constants. Evidence-object cleanliness and gating-code correctness are independent axes.
- **Severity rationale:** HIGH (P1). Wrong-drug gating on guideline-directed CAD lipid therapy produces both false positives (patients on the correct drug flagged as missing it - eroding clinician trust and surfacing wrong worklist items) and false negatives on the wrong-drug overlap (a patient on tocilizumab counted as on a PCSK9 inhibitor). Per the classify-up default and CLAUDE.md §8 (clinical accuracy non-negotiable), HIGH P1 is the floor; this is the same wrong-drug class as the Cat A RxNorm corrections (AUDIT-042..061, 15.5% wrong-drug rate) that the §16 standard was written to catch. Not PHI / auth / encryption (so not P0 on those axes).
- **Remediation (separate operator-gated `backend/**` PR; NOT in this finding's scope):** replace the three wrong RxCUIs with the RxNav-verified correct codes - `PCSK9_CODES` `1657974` -> `1665684` (evolocumab) and `1659149` -> `1659152` (alirocumab); icosapent ethyl `1546275` -> `1304974` across the L7483 gate + L7501 evidence + L7476 comment - and add a rule-behavior test per the AUDIT-100 / clinicalCodeCorrections.test.ts pattern (positive: correct drug detected and suppresses the gap; negative: wrong drug no longer matched). Prefer sourcing from the canonical valuesets per AUDIT-052 where a canonical PCSK9 / icosapent constant exists. The fix is a clinical-code correction and its own PR.
- **Effort estimate:** ~2-3h (3 RxCUI corrections + per-gap rule-behavior tests + §16 re-verification of the replacement codes + canonical-valueset cross-check).
- **Dependencies:** None hard. Independent of AUDIT-100 (evidence objects) and AUDIT-101 (CAD-statin dose-blind set) - different gaps, different constants. May be bundled with the AUDIT-052 canonical-valueset refactor if a canonical PCSK9 / icosapent constant is the chosen source.
- **Cross-references:** see AUDIT-100 (sibling cluster; the §16 sweep that surfaced this was bundled into its correction PR; the two gaps here were AUDIT-100's evidence-object CLEAN exemplars - clean object, wrong gating code); see AUDIT-101 (sibling false-negative on gap-cad-statin; same lipid cluster, different defect axis); see AUDIT-042..061 + `AUDIT_METHODOLOGY.md` §16 (Cat A wrong-drug RxNorm corrections; same class, same RxNav `properties.json` verification method; 15.5% wrong-drug rate); see AUDIT-069 (codebase trust including fix-from comments is insufficient); see AUDIT-052 (canonical-valueset refactor; preferred fix source); see CLAUDE.md §8 (clinical accuracy non-negotiable).
- **Status note:** 2026-05-31 OPEN at filing. Filed as an operator-gated docs PR; the correction (a `backend/**` RxCUI fix + rule-behavior tests) is a separate PR. NOT marked RESOLVED until the correction lands + PAUSE F on-main verification confirms each gate resolves to the RxNav-verified correct drug.
- **Status note:** 2026-06-01 correction authored (PAUSE B->D) on the shared branch `fix/audit-102-104-rxnorm-wrong-drug` with AUDIT-104; Status -> IN_PROGRESS. PCSK9_CODES corrected to evolocumab `1665684` + alirocumab `1659152`; icosapent ethyl gate + evidence + comment corrected to `1304974`; all RxNav `properties.json`-re-verified (IN tty) at fix time per §16. Per-gate behavior tests added (`clinicalCodeCorrections.test.ts`, 83 green). Stopped at PAUSE E for operator-gated merge. RESOLVED only after merge + PAUSE F.
- **Status note (PAUSE F, 2026-06-02):** RESOLVED. Shared correction PR #332 merged to main at `82b072bbef3af3d4e3eb97075e538b9fb330f716` (squash). On-main verification: `PCSK9_CODES = ['1665684', '1659152']` (gapRuleEngine.ts:7353) and icosapent gate `includes('1304974')` (L7485) present; old codes `1657974` / `1659149` / `1546275` absent from all gate expressions (comment-only); `clinicalCodeCorrections.test.ts` 83 green on main; gaps.push 263 unchanged; §9.2 canonical pipeline regenerated + all 6 modules VALID (PR #332 follow-up commit `a1790f9`).

---

### AUDIT-103 - Two more gap rules carry copy-pasted `evidence` objects with wrong clinical provenance (SH-2 TAVR / VD-1 mechanical-valve warfarin); VD-1 additionally has a level-of-evidence contradiction (evidence LOE B vs comment/action LOE A) requiring a clinical read

- **Phase:** Clinical-code verification (Phase 0B clinical-code arc continuation; surfaced during the post-AUDIT-100 internal-consistency sweep of the `evidence` objects across the runtime gap rules - the same wrong-provenance / copy-paste class AUDIT-100 established)
- **Severity:** HIGH (P1)
- **Status:** RESOLVED 2026-06-02 (both wrong-provenance `evidence` objects corrected + VD-1 three-way LOE-B agreement; correction lands via the single operator-gated `backend/**` fix PR - see Resolution + Status note)
- **Discovered:** 2026-05-31 during the internal-consistency axis of the `evidence`-object review that followed AUDIT-100. Per-rule inspection of the Structural Heart and Valvular Disease evaluator blocks surfaced two more gap rules whose `evidence` objects are copy-pasted from unrelated donor gaps and never corrected, so each renders wrong clinical provenance on the FDA-CDS-exemption transparency surface. This is the SAME class as AUDIT-100 (wrong-provenance / wrong-display; the gap still fires, but the `evidence` text the clinician sees belongs to a different therapy). One of the two (VD-1) additionally carries an internal level-of-evidence contradiction that is NOT auto-resolvable and is flagged for the operator's clinical read.
- **Location (2 evaluator blocks in `backend/src/ingestion/gaps/gapRuleEngine.ts`):**
  - **Gap SH-2 (TAVR evaluation for severe aortic stenosis)** - `gaps.push` at L5114; `evidence` object at L5124-L5130. The rule's own comment (L5107-L5111), `status` (L5117), `target` (L5118), `recommendations.action` (L5120), `guideline` (L5121), and `note` (L5122) all correctly describe TAVR evaluation under `2020 ACC/AHA Valvular Heart Disease Guideline, Class 1, LOE A`. The `evidence` object, by contrast, is entirely an AF-rate-control object: `triggerCriteria: ['Rate control agent not prescribed in AFib']`, `guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for AF Management'`, `classOfRecommendation: '1'`, `levelOfEvidence: 'B'`, `exclusions: ['Severe bradycardia', 'Sick sinus syndrome without pacemaker', 'Hospice/palliative care']`. Every semantic field (trigger, guideline source, exclusion set) belongs to an atrial-fibrillation rate-control gap, not to a TAVR / severe-AS rule; the AF-rate-control `evidence` object at L5064-L5072 is the same-provenance donor pattern (`guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for AF Management'`, the bradycardia / sick-sinus exclusions). This is an UNAMBIGUOUS copy-paste, the same class as AUDIT-100. The `levelOfEvidence: 'B'` in the `evidence` object also contradicts the rule's own `LOE A` text (L5109 / L5120), but here the whole object is wrong-donor so the LOE is corrected as part of the wholesale rewrite (not a standalone clinical question - the donor object simply does not apply).
  - **Gap VD-1 (anticoagulation missing in mechanical valve)** - `gaps.push` at L4833; `evidence` object at L4843-L4849. The rule's own comment (L4823) and `recommendations.action` (L4840) cite `2020 ACC/AHA VHD Guideline, Class 1, LOE A` for lifelong warfarin (target INR 2.5-3.5) in mechanical-valve patients. The `evidence` object reads: `triggerCriteria: ['Echo surveillance overdue for aortic stenosis']`, `guidelineSource: '2020 ACC/AHA Guideline for Valvular Heart Disease'`, `classOfRecommendation: '1'`, `levelOfEvidence: 'B'`, `exclusions: ['Hospice/palliative care']`. Two distinct issues on this one object:
    - **(a) `triggerCriteria` is an UNAMBIGUOUS copy-paste** of the aortic-stenosis echo-surveillance gap: the string `'Echo surveillance overdue for aortic stenosis'` is verbatim that AS-echo gap's `status` (L4800), grafted in here as VD-1's trigger criteria. VD-1's actual trigger is mechanical-valve-present AND warfarin-absent (L4826-L4831). Same wrong-provenance class as SH-2 and AUDIT-100. (`guidelineSource` `2020 ACC/AHA Guideline for Valvular Heart Disease` and `classOfRecommendation: '1'` happen to be correct for VD-1, so only `triggerCriteria` is wrong-donor.)
    - **(b) Level-of-evidence INTERNAL CONTRADICTION requiring a clinical read - NOT auto-resolved here:** the `evidence` object states `levelOfEvidence: 'B'`, but the rule's own comment (L4823) and `recommendations.action` (L4840) both state `LOE A`. Unlike SH-2 (where the whole object is wrong-donor and the LOE falls out of the rewrite), here the guidelineSource is already correct, so which level of evidence is correct for warfarin in a mechanical valve under the 2020 ACC/AHA VHD Guideline is a genuine clinical-fact question. Per the operator-locked scope, this finding does NOT pick a side: it records the B-vs-A contradiction verbatim and defers the resolution to the operator's clinical read at the fix-PR design gate. (Note: the `triggerCriteria` copy-paste in (a) does not depend on the LOE decision and can be corrected unconditionally.)
- **Evidence:** Read-File of the running evaluator (per `AUDIT_METHODOLOGY.md` §1 rule-body verification standard - running code, not addendum text) confirms both `evidence` objects verbatim at the cited lines (SH-2 L5124-L5130; VD-1 L4843-L4849), and confirms each rule's own comment / `recommendations` text describes the correct therapy. In both cases the gap still FIRES correctly (detection logic is sound); the corruption is confined to the `evidence` provenance object the clinician sees. Per CLAUDE.md §14 + the FDA CDS exemption (21st Century Cures Act), every gap must be transparent - the clinician must see the patient data, the guideline, and the logic. SH-2 presents a 2023 AF rate-control guideline and AF-specific exclusions (bradycardia, sick sinus) as the evidentiary basis for a TAVR referral; VD-1 presents an aortic-stenosis echo-surveillance trigger as the basis for a mechanical-valve anticoagulation gap. This is silent-wrong-clinical-data on the exemption-bearing transparency surface, the same defect class as AUDIT-100 (MRA / RAAS / CAD-statin).
- **Correction template (CLEAN exemplars in the same file):** same template AUDIT-100 used. The self-consistent `evidence` objects in the file (e.g. the AS echo-surveillance gap L4806-L4812, whose `triggerCriteria` / `guidelineSource` match its own gating; the bioprosthetic-valve echo gap SH/VD-2 L4844... cf. L5157-L5163) are the correction pattern: each clean object's `triggerCriteria` / `guidelineSource` / `classOfRecommendation` / `levelOfEvidence` / `exclusions` describe its own detection logic. SH-2 and VD-1 must be rewritten the same way against the rule's own (correct) comment + `recommendations` text.
- **Severity rationale:** HIGH (P1) by the classify-up default (between two severities take the higher; downgrade later only with evidence). Identical class to AUDIT-100 (HIGH P1, silent-wrong-clinical-provenance on the FDA-CDS transparency surface presented to cardiologists). Not PHI / auth / encryption (so not P0 on those axes), but a wrong-guideline / wrong-trigger / wrong-contraindication citation on a clinical-decision-support surface is a clinical-accuracy + regulatory-transparency defect, and CLAUDE.md §8 states clinical accuracy is non-negotiable.
- **Methodology lesson (reinforces AUDIT-100):** DET_OK / fires-correctly certifies detection, NOT `evidence`-object semantic correctness. AUDIT-100 found 3 such corrupted objects in the HF GDMT + CAD lipid cluster; the internal-consistency sweep that followed found 2 more in the Structural Heart + Valvular Disease blocks (SH-2, VD-1). Evidence-object verification is per-gap and must not be assumed from detection status. This is the catalyst for the planned `evidence`-object validator (flag-only + gate-new-rules; see the validator scoping note) - a consistency check that would have caught all five mechanically.
- **Remediation (separate operator-gated `backend/**` PR; NOT in this finding's scope; cluster-1A file-then-fix pattern, fix PR sequenced AFTER this finding merges):** rewrite the two `evidence` objects against each rule's own (correct) comment + `recommendations` text, using the file's clean exemplars as template. (1) SH-2: replace the wholesale AF-rate-control donor object with a TAVR / severe-AS object - `triggerCriteria` to the rule's actual gating (severe AS I35.0 + age >= 65 + LVEF available + no documented TAVR evaluation), `guidelineSource` to `2020 ACC/AHA Valvular Heart Disease Guideline`, `levelOfEvidence` to `A`, exclusions to the TAVR-relevant set (the AF bradycardia / sick-sinus exclusions do not apply). (2) VD-1: correct `triggerCriteria` from the copy-pasted AS-echo string to the rule's actual gating (mechanical valve Z95.2 / Z95.3 / Z95.4 + warfarin absent) - this part is unconditional - AND resolve the `levelOfEvidence` B-vs-A contradiction per the operator's clinical read at the fix-PR design gate (the fix PR does not proceed on VD-1's LOE field until that read is given). Add atomic consistency tests per the AUDIT-100 / `clinicalCodeCorrections.test.ts` pattern. `gaps.push` runtime count unchanged (no detection logic changes). This finding's scope is strictly the evidence-object corruption (documentation); it justifies and bounds the correction PR.
- **Effort estimate:** ~1-2h for the two evidence-object rewrites + consistency tests, GATED on the operator's clinical read of VD-1's LOE (B vs A) before the VD-1 LOE field is finalized.
- **Dependencies:** None hard. Sibling of AUDIT-100 (same wrong-provenance class, different module blocks - SH / VD vs HF / CAD). VD-1's LOE-field resolution is BLOCKED on an operator clinical decision (B vs A); the `triggerCriteria` corrections for both rules are not blocked. Independent of AUDIT-101 (false-negative dose-blind set) and AUDIT-102 (wrong-drug RxNorm) - different gaps, different defect axes.
- **Cross-references:** see AUDIT-100 (sibling finding, identical wrong-provenance / copy-pasted-`evidence`-object class; MRA / RAAS / CAD-statin cluster - this finding is the SH-2 / VD-1 continuation found by the follow-on internal-consistency sweep); see CLAUDE.md §14 (gap-rule evidence-object requirement + FDA CDS exemption transparency) + §8 (clinical accuracy non-negotiable); see AUDIT-069 + `AUDIT_METHODOLOGY.md` §16 (clinical-code external-verification; codebase trust including fix-from comments is insufficient); see AUDIT-052 (canonical refactor; orthogonal); see `AUDIT_METHODOLOGY.md` §1 (rule-body verification standard - this finding cites running code at SH-2 L5124-L5130 and VD-1 L4843-L4849); see the planned `evidence`-object validator (flag-only + gate-new-rules) that would catch all five corrupted objects mechanically.
- **Resolution (correction authored 2026-06-02, branch `fix/audit-103-evidence-objects-sh2-vd1` cut off main `4dfd132`; single operator-gated `backend/**` PR - `gapRuleEngine.ts` + `clinicalCodeCorrections.test.ts` + this register entry):**
  - **SH-2 (TAVR for severe AS) - wholesale AF-donor rewrite.** The entire AF-rate-control `evidence` object was replaced with a TAVR / VHD object matching the rule's own correct comment + `recommendations` text: `triggerCriteria: ['Severe aortic stenosis (I35.0)', 'Age >= 65', 'LVEF available (echo performed)', 'No documented TAVR evaluation']`, `guidelineSource: '2020 ACC/AHA Guideline for Valvular Heart Disease'`, `classOfRecommendation: '1'`, `levelOfEvidence: 'A'`, `exclusions: ['Hospice/palliative care']`. The AF donor strings (`'Rate control agent not prescribed in AFib'`, `'2023 ACC/AHA/ACCP/HRS Guideline for AF Management'`, the bradycardia / sick-sinus exclusions) are gone. LOE A is correct here (TAVR-for-severe-AS has the multi-RCT base) and falls out of the wholesale rewrite, not a standalone clinical question.
  - **VD-1 (mechanical-valve warfarin) - unconditional `triggerCriteria` fix.** `triggerCriteria` corrected from the copy-pasted AS-echo string (`'Echo surveillance overdue for aortic stenosis'`) to the rule's actual gating: `['Mechanical heart valve (Z95.2/Z95.3/Z95.4)', 'Warfarin (RxNorm 11289) not on active medication list']` (this part was unconditional - it did not depend on the LOE read). `guidelineSource` / `classOfRecommendation` were already correct and unchanged.
  - **VD-1 LOE B-vs-A contradiction resolved to B (operator clinical read at the fix-PR design gate).** The `evidence` object's `levelOfEvidence: 'B'` was CORRECT; the rule's self-text (comment L4825 + `recommendations.action` L4842) carrying `LOE A` was the ERROR. Both self-text sites were corrected A -> B for three-way agreement (evidence object + action + comment all `LOE B`). Guideline basis: Class 1 (strong recommendation for lifelong anticoagulation in a mechanical valve) is settled, but the supporting evidence base is observational plus the halted phase-II RE-ALIGN trial, and the pivotal NOAC-vs-warfarin RCTs explicitly EXCLUDED mechanical-valve patients - so there is no multi-RCT base to support LOE A. LOE B is the correct level under the 2020 ACC/AHA VHD Guideline.
  - **Section 9.2 canonical regen NOT needed (verified, not assumed).** The engine change is a pure in-place string edit - 7 insertions / 7 deletions, net-zero line shift - so no line-coupled artifact moves (unlike PR #332, which added +2 lines and required full regen). `extractCode --all` produced 0 content-line diffs across all six `code.json`; `validateCanonical` reports all 6 modules VALID, and the canonical gate suite (`tests/scripts/auditCanonical/`, incl. `extractCode.test.ts` line assertions) is 118/118 green against the committed canonical with the edited engine. CI Gate 2 (`git diff --exit-code *.code.json`) is clean on Linux/LF; the `*.code.meta.json` `sourceSha256` / `generatedAt` churn is not diffed by any gate or test.
  - **Validator-baseline note:** the two internal-consistency inconsistencies the planned `evidence`-object validator's current-state probe surfaced ARE exactly these two defects (SH-2 + VD-1). With this correction they are cleared, so the validator can ship as a PURE HARD GATE over all `gaps.push` evidence objects - no allowlist, no grandfathered exceptions.
  - **Tests + verification (PAUSE C):** two `describe` blocks added to `backend/tests/terminology/clinicalCodeCorrections.test.ts` - SH-2 TAVR/VHD-provenance atomic assertions + negatives that the AF donor strings are gone; VD-1 mechanical-valve trigger + three-way LOE-B agreement across evidence / action / comment - each scoped per-rule via a `gapBlockFor` brace-matcher so donor strings that legitimately survive in their real home rules do not produce false negatives. Full jest suite 1234 green (56 suites); tsc 0 errors; eslint 0 errors (added lines warning-free); `gaps.push` count 263 (unchanged - pure string edits); DRIFT-44 clean (all 86 added lines ASCII).
- **Status note (PAUSE D, 2026-06-02):** Status OPEN -> RESOLVED. Correction authored on branch `fix/audit-103-evidence-objects-sh2-vd1`; both `evidence` objects are now self-consistent with their rules (SH-2 TAVR/VHD LOE A; VD-1 three-way LOE B). Flipped to RESOLVED WITHIN the single operator-gated fix PR per operator instruction - this differs from AUDIT-102 / AUDIT-104, which flipped in a separate post-PAUSE-F register commit (#333); the PR is operator-gated with NO auto-merge, so operator review-before-merge is retained. PAUSE F on-main verification to be appended after merge.
- **Status note:** 2026-05-31 OPEN at filing. Filed as an operator-gated docs PR BEFORE any evidence-correction code is authored (cluster-1A file-then-fix pattern), so the finding justifies and scopes the correction PR. The correction (a `backend/**` evidence-object rewrite) is a separate operator-gated PR sequenced AFTER this finding merges; VD-1's `levelOfEvidence` resolution within that PR waits on the operator's clinical read (B vs A). NOT marked RESOLVED until the correction PR lands + PAUSE F on-main verification confirms both `evidence` objects are self-consistent with their rules.
- **Status note (PAUSE F, 2026-06-02):** VERIFIED on main. Correction PR #335 merged to main at `fef10d264bbc707772c70a37cd6b73439ff635a2` (squash). On-main canonical-grep of the landed `gapRuleEngine.ts`: **SH-2** evidence object now carries TAVR/VHD provenance (`triggerCriteria` severe AS I35.0 + age >= 65 + LVEF available + no TAVR eval; `guidelineSource` 2020 ACC/AHA Guideline for Valvular Heart Disease; `levelOfEvidence: 'A'`; `exclusions: ['Hospice/palliative care']`), and the AF-rate-control donor strings are absent from the SH-2 block (rule-scoped check: the AF strings survive only in their real home rules, count unchanged). **VD-1** `triggerCriteria` is now the mechanical-valve gating (Z95.2/Z95.3/Z95.4 + warfarin 11289 absent), the copy-pasted AS-echo donor string is gone from the VD-1 block (`'Echo surveillance overdue for aortic stenosis'` count 1 = the AS-echo home rule only), and LOE B holds three-way (evidence object + `recommendations.action` + rule comment all `LOE B`; the prior `Class 1, LOE A` self-text is absent file-wide). Build on main: tsc 0 errors; full jest 1234 green (incl. the 7 AUDIT-103 assertions across both `describe` blocks); `gaps.push` count 263 (unchanged); Audit-Canonical-Gates green - `validateCanonical` all 6 modules VALID and the canonical gate suite 118/118 pass with NO regen (net-zero line-shift confirmed at PAUSE C held on main). AUDIT-103 RESOLVED is now confirmed on landed main.

---

### AUDIT-104 - Seven more LIVE-gating RxNorm codes are wrong-drug or non-current/nonexistent across seven gap rules (GLP-1 in 2 gates incl. HF-7, ranolazine, bempedoic, cilostazol, nitroglycerin, pentoxifylline) - same FALSE-POSITIVE / WRONG-SUPPRESSION class as AUDIT-102

- **Phase:** Clinical-code verification (Phase 0B clinical-code arc continuation; surfaced by the read-only §16 clinical-code sweep `backend/scripts/sweepClinicalCodes.mjs` -> `docs/audit/sweeps/clinical-code-sweep-report.md`, generated 2026-06-01, and confirmed per §1 against the running rule bodies + RxNav)
- **Severity:** HIGH (P1)
- **Status:** RESOLVED 2026-06-02 (shared correction PR #332 merged + PAUSE F on-main verification - see Resolution + PAUSE-F Status note)
- **Discovered:** 2026-06-01 during operator-directed triage of the §16 sweep. The sweep flagged 154 MISMATCH + 34 NO_API_MATCH; triage (beginning with a RxNav resolver-validation step) separated genuine wrong-code defects from matcher/extractor artifacts. Seven RxNorm codes used in LIVE gap-gating membership tests resolve to the wrong drug or to a non-current / nonexistent RxCUI. This is the SAME defect class as AUDIT-102 (wrong or dead code in a gating membership test - the "patient is already on this therapy" suppressor never matches a real prescription, so the gap over-fires). The three AUDIT-102 codes (PCSK9 1657974 / 1659149, icosapent 1546275) are NOT repeated here; this is the seven-code continuation in other gaps.
- **Resolver-validation note (why the NO_API_MATCH codes here are genuine bad codes, not sweep artifacts):** RxNav `properties.json` is sound (control codes simvastatin `36567` and captopril `1998` resolve correctly). The non-resolving codes were re-checked via `historystatus.json` and are genuinely `NotCurrent` (retired SNOMED CT) or `UNKNOWN` (nonexistent RxCUI): semaglutide `2551758` = UNKNOWN, ranolazine `355019` = UNKNOWN, bempedoic `2390411` = NotCurrent, pentoxifylline `7979` = NotCurrent. A NO_API_MATCH on these is a genuine bad code, not a resolver coverage / throttling gap (the pre-triage hypothesis that NO_API_MATCH meant a resolver gap was inverted by this check).
- **Location (seven evaluator blocks in `backend/src/ingestion/gaps/gapRuleEngine.ts`; all confirmed by Read-File per §1 rule-body verification - running code + RxNav, NOT addendum text):**
  - **gap-cad-glp1 (GLP-1 RA in CAD + T2DM)** - `const GLP1_CODES = ['2551758', '475968', '1803932'];` L7654, `onGLP1` L7655, gate `if (!onGLP1)` L7656. Two of three codes bad: `2551758` (claimed semaglutide) = UNKNOWN / no RxNav match (true semaglutide IN = `1991302`); `1803932` (claimed dulaglutide) = "leucovorin 100 MG Injection" (RxNav, tty SCD; true dulaglutide IN = `1551291`). Only `475968` (liraglutide) is correct. PARTIALLY broken: a patient on real semaglutide or dulaglutide is not detected, so the GLP-1 gap over-fires for them.
  - **gap HF-7 (GLP-1 RA for HFpEF with obesity, Heart Failure module)** - inline `!medCodes.some(c => ['2551758', '475968'].includes(c))` at L3508. This is the SECOND live gate carrying the dead `2551758`, surfaced by the PAUSE-A touch-point inventory of the correction and ADDED to this finding by operator decision 2026-06-01 (the original filing named only gap-cad-glp1; per §17.3 a known-broken gate is not left out for a doc artifact). Same dead `2551758` (semaglutide); additionally this gate OMITTED dulaglutide entirely (narrow `{semaglutide, liraglutide}` set). See Resolution for the union-membership clinical change.
  - **gap-cad-ranolazine (ranolazine for refractory angina on maximal anti-anginal therapy)** - gate `if (hasAngina && onBBran && onCCBran && !medCodes.includes('355019'))` L7524. `355019` (claimed ranolazine) = UNKNOWN / no RxNav match (true ranolazine IN = `35829`). The `!includes('355019')` exclusion never matches a real ranolazine prescription, so a patient already on ranolazine still receives the gap. (The BB / CCB codes in this rule use canonical lookups and are correct.)
  - **gap-cad-bempedoic (bempedoic acid for statin-intolerant CAD + high LDL)** - gate `!medCodes.includes('2390411')` L7726. `2390411` (claimed bempedoic acid) = NotCurrent / no RxNav match. Exclusion never matches -> over-fire.
  - **gap PAD cilostazol** - gate `!medCodes.includes('19847')` L6674. `19847` (claimed cilostazol) = "bumadizone" (RxNav, IN; an NSAID, NOT cilostazol; the nominal cilostazol IN `24592` is itself NotCurrent - see AUDIT-105 - so the replacement must be re-verified). Exclusion never matches a real cilostazol prescription -> over-fire.
  - **gap angina nitroglycerin** - `const onNitro = medCodes.includes('7832');` L7885, gate L7886. `7832` (claimed nitroglycerin) = "4-aminohippuric acid" (RxNav, IN; a renal-plasma-flow diagnostic agent, NOT nitroglycerin; true nitroglycerin IN = `4917`). `onNitro` is never true for a real nitroglycerin prescription -> over-fire.
  - **gap PAD+HF pentoxifylline (cilostazol contraindicated in HF)** - `const onPentoxifyllinePV = medCodes.includes('7979');` L11518. `7979` (claimed pentoxifylline) = NotCurrent / no RxNav match (true pentoxifylline IN = `8745`). Detection never true -> over-fire.
- **Behavioral consequence (uniform across all seven gates - per operator decision, wrong-drug and non-current sub-classes are NOT split because the behavior is identical):** each is a `medCodes.includes(badCode)` / `!medCodes.includes(badCode)` membership test. Because the coded value never matches the RxCUI a real prescription carries, the "patient is already on this therapy" suppressor fails and the gap mis-fires (recommends a therapy the patient may already be on) - a FALSE POSITIVE / WRONG-SUPPRESSION, identical to AUDIT-102. For the three wrong-drug codes that resolve to a real different drug (`1803932` leucovorin, `19847` bumadizone, `7832` 4-aminohippuric acid), a patient coincidentally on that unrelated drug is also mis-counted as on-therapy - a rarer FALSE NEGATIVE on the overlap.
- **Bucket (c) clinical-intent cases flagged for the operator's clinical read (NOT auto-resolved, NOT wrong-code-resolution defects; line refs per the §16 sweep source-location column, RxNav resolutions confirmed directly in triage, full rule-body §1 read deferred to the operator clinical-read step - these are NOT §1-closed here):**
  - **High-intensity statin set membership** (`cardiovascularValuesets.ts:366-368`): `861634` = pitavastatin, `41127` = fluvastatin, `6472` = lovastatin (also mislabeled "pitavastatin" in the dead `rxnorm.ts:114`). All three resolve to real statins, but NONE is a high-intensity statin (only atorvastatin 40-80 mg and rosuvastatin 20-40 mg qualify). This is a set-MEMBERSHIP correctness question (should these be in the high-intensity-statin set at all), not a code-resolution defect. Operator clinical read.
  - `83818` = irbesartan (claimed candesartan), LIVE in `ACEI_ARB_CODES_RENAL` (gapRuleEngine.ts:7971) + `RAAS_CODES_SCAD` (gapRuleEngine.ts:8744): both are ARBs, and real candesartan `214354` is ALSO present in the set, so the ARB-class gate is functionally complete; the question is whether candesartan-specific intent matters. Operator intent read.
  - `6185` = labetalol (claimed nebivolol), LIVE in `AVN_BLOCKER_CODES_EP079` (gapRuleEngine.ts:4160): both are beta-blockers with AV-nodal effect; intent read.
  - `9068` = quinidine (claimed sotalol), LIVE in the QT-prolonging valueset (`cardiovascularValuesets.ts:253`): both are QT-prolonging, so functionally valid for a QT-risk set; the antiarrhythmic identity differs. Intent read.
- **Severity rationale:** HIGH (P1) by the classify-up default and by exact parity with AUDIT-102 (HIGH P1) - identical wrong-drug / dead-gating-code class, identical FDA-CDS / clinical-accuracy stakes (CLAUDE.md §8: clinical accuracy non-negotiable). Wrong-drug gating on guideline-directed therapy produces false positives (patients on the correct drug flagged as missing it, eroding clinician trust and surfacing wrong worklist items) and false negatives on the wrong-drug overlap. Not PHI / auth / encryption (not P0 on those axes).
- **Remediation (separate operator-gated `backend/**` PR; NOT in this finding's scope; MAY share one PR with the AUDIT-102 correction since both are the same class in the same file):** replace each code with its current RxNav-verified RxCUI and add per-gap rule-behavior tests (positive: correct drug detected and suppresses the gap; negative: wrong/old code no longer matched) per the AUDIT-102 / `clinicalCodeCorrections.test.ts` pattern. Triage-recorded replacement candidates (each MUST be re-verified via RxNav `properties.json` at fix time per §16 - do NOT treat these as final, and do NOT source from the dead `rxnorm.ts`): GLP-1 semaglutide `2551758` -> `1991302`, dulaglutide `1803932` -> `1551291` (liraglutide `475968` unchanged); ranolazine `355019` -> `35829`; bempedoic acid `2390411` -> re-verify current IN; cilostazol `19847` -> re-verify current cilostazol IN (nominal `24592` is NotCurrent); nitroglycerin `7832` -> `4917`; pentoxifylline `7979` -> `8745`. Prefer canonical valuesets per AUDIT-052 where one exists. The bucket (c) clinical-intent cases are resolved separately on the operator's clinical read and do not block the seven-code correction.
- **Effort estimate:** ~3-5h (7 RxCUI corrections across 7 gates + per-gap rule-behavior tests + §16 re-verification of replacements + canonical-valueset cross-check), excluding the operator's bucket (c) clinical reads.
- **Dependencies:** Sibling of AUDIT-102 (same FALSE-POSITIVE / WRONG-SUPPRESSION wrong/dead-gating-code class; different gaps); the two corrections MAY share a single operator-gated `backend/**` PR. Independent of AUDIT-100 / AUDIT-103 (evidence-object provenance) and AUDIT-101 (dose-blind set). Relates to AUDIT-105 (the DORMANT terminology-file corruption surfaced by the same sweep; note several true replacement codes are themselves bad in the dead `rxnorm.ts`, which is why fix-time RxNav re-verification is mandatory). Bucket (c) clinical reads are tracked on this finding but do not block the seven-code correction.
- **Cross-references:** see AUDIT-102 (sibling; the three CAD lipid-ladder wrong-drug codes; same class, same RxNav `properties.json` method); see AUDIT-105 (the dead `rxnorm.ts` / `loinc.ts` corruption from the same sweep); see AUDIT-070 (the LOINC mismatches from the same sweep route there - non-gating ingestion-mapping surface); see AUDIT-042..061 + `AUDIT_METHODOLOGY.md` §16 (Cat A wrong-drug RxNorm class; 15.5% wrong-drug rate; same RxNav verification method); see AUDIT-069 (codebase trust including fix-from comments is insufficient); see AUDIT-052 (canonical-valueset refactor; preferred fix source); see CLAUDE.md §8 (clinical accuracy non-negotiable) + §14 (no gap without a correct evidence object); see the §16 sweep report `docs/audit/sweeps/clinical-code-sweep-report.md`.
- **Resolution (correction authored 2026-06-01, branch `fix/audit-102-104-rxnorm-wrong-drug`, shared PR with AUDIT-102; PAUSE B->D complete, awaiting operator merge):**
  - All 10 codes (3 AUDIT-102 + 7 AUDIT-104) replaced with RxNav-verified ingredient (IN tty) RxCUIs, re-verified at fix time via NLM name-search -> `properties.json` per §16 (NOT sourced from the dead `rxnorm.ts`): PCSK9 evolocumab `1665684`, alirocumab `1659152`; icosapent ethyl `1304974`; GLP-1 semaglutide `1991302`, liraglutide `475968`, dulaglutide `1551291`; ranolazine `35829`; bempedoic acid `2282403`; cilostazol `21107`; nitroglycerin `4917`; pentoxifylline `8013`.
  - **Three triage-recorded candidates were SUPERSEDED at fix-time re-verification** (the §16 "re-verify at fix time, do not trust triage codes" discipline catching itself): bempedoic acid `2282403` (triage said "re-verify"); cilostazol `21107` (triage `24592` is itself NotCurrent); pentoxifylline `8013` (triage `8745` was wrong - authoritative IN is `8013`).
  - **GLP-1 canonicalization (first AUDIT-052 instance):** both GLP-1 gates (gap-cad-glp1 L7654 + HF-7 L3508) now consume one new canonical valueset `RXNORM_GLP1_RA = {SEMAGLUTIDE 1991302, LIRAGLUTIDE 475968, DULAGLUTIDE 1551291}` in `cardiovascularValuesets.ts`, via module-level `GLP1_RA_CODES_CV = codes(RXNORM_GLP1_RA)`. First concrete realization of the canonical-valueset pattern AUDIT-052 generalizes (operator decision 2026-06-01).
  - **HF-7 clinical-logic change (operator-approved union membership, documented per §8 / §17.3 - NOT folded in silently):** HF-7's detection set was `{semaglutide, liraglutide}` and is now `{semaglutide, liraglutide, dulaglutide}` - it GAINS dulaglutide detection. Rationale: dulaglutide is a valid GLP-1 RA; a HFpEF+obesity patient already on dulaglutide should suppress the gap, so the prior narrow set was a latent narrow-set over-fire. The widened footprint (second file, `cardiovascularValuesets.ts`) was confirmed at PAUSE C: both gates resolve through `RXNORM_GLP1_RA` (source-grep + behavior tests), and no other consumer of `cardiovascularValuesets` breaks (tsc clean).
  - **Tests + verification (PAUSE C):** 9-gate behavior tests added to `backend/tests/terminology/clinicalCodeCorrections.test.ts` (positive: correct drug suppresses; negative: old/dead code no longer suppresses -> gap still fires), plus canonical-set constant assertions, a both-gates-consume-canonical source-grep, an explicit HF-7-dulaglutide-now-suppresses assertion, and a trimetazidine `47832` substring-exclusion guard. Full file 83 tests green; tsc 0 errors; eslint 0 errors; `gaps.push` count 263 (unchanged); DRIFT-44 clean.
- **Status note:** 2026-06-01 OPEN at filing. Filed as an operator-gated docs PR (file-then-fix pattern, per AUDIT-102 / AUDIT-103); the correction is a separate operator-gated `backend/**` PR. NOT marked RESOLVED until the correction lands + PAUSE F on-main verification confirms each gate resolves to the RxNav-verified correct drug.
- **Status note:** 2026-06-01 correction authored (PAUSE B->D) on branch `fix/audit-102-104-rxnorm-wrong-drug` (shared with AUDIT-102); Status -> IN_PROGRESS. Stopped at PAUSE E for operator-gated merge. RESOLVED only after merge + PAUSE F on-main verification.
- **Status note (PAUSE F, 2026-06-02):** RESOLVED. Shared correction PR #332 merged to main at `82b072bbef3af3d4e3eb97075e538b9fb330f716` (squash). On-main verification: all 7 gate corrections present (ranolazine `includes('35829')` L7526; bempedoic `includes('2282403')` L7728; cilostazol `includes('21107')` L6676; nitroglycerin `includes('4917')` L7887; pentoxifylline `includes('8013')` L11520); GLP-1 canonical `RXNORM_GLP1_RA` at cardiovascularValuesets.ts:249, `GLP1_RA_CODES_CV = codes(RXNORM_GLP1_RA)` at gapRuleEngine.ts:39, consumed by both HF-7 (L3510) and gap-cad-glp1 (L7656); old codes `2551758`/`1803932`/`355019`/`2390411`/`19847`/`7832`/`7979` absent from all gate expressions (comment-only; trimetazidine `47832` correctly distinct at L8813). `clinicalCodeCorrections.test.ts` 83 green on main; gaps.push 263 unchanged; §9.2 canonical pipeline regenerated + all 6 modules VALID (follow-up commit `a1790f9`). HF-7 dulaglutide union-membership change verified live (dulaglutide now suppresses the gap).

---

### AUDIT-105 - The terminology registries `backend/src/terminology/rxnorm.ts` (and parallel `loinc.ts`) are systematically corrupted (~40 of 68 RxCUIs wrong) AND dead (consumed by no gating path) - a verified-dead correctness landmine; remediation fork deferred to the operator

- **Phase:** Clinical-code verification (Phase 0B clinical-code arc continuation; surfaced by the same read-only §16 sweep as AUDIT-104, 2026-06-01)
- **Severity:** MEDIUM (P2)
- **Status:** RESOLVED 2026-06-02 (DELETE fork - `rxnorm.ts` + `loinc.ts` deleted + barrel re-exports pruned; see Resolution + PAUSE-F note)
- **Discovered:** 2026-06-01 during the §16 sweep triage. Resolving every RxCUI in `rxnorm.ts DRUG_CLASSES` against RxNav showed roughly 40 of 68 codes are wrong-drug or non-current / nonexistent. Crucially, a §1 consumer check shows the file is DEAD: its lookup functions (`getMedicationConcept`, `matchesMedication`, `expandDrugClass`, `getIngredientFromBrand`, `getDrugClassName`) are called by NO other file - the only reference is the `export * as RxNorm` re-export in `terminology/index.ts`. The gap engine gates on its own inline RxNorm arrays + `cardiovascularValuesets.ts` (it imports `from '../../terminology/cardiovascularValuesets'`, never `rxnorm`). So the corruption has ZERO current gating impact: it is a correctness landmine (catastrophic if the file is ever wired up as the drug registry) and a source of noise in the §16 sweep, NOT an active patient-safety defect. This is a DIFFERENT blast-radius tier from AUDIT-102 / AUDIT-104, which are LIVE gating codes.
- **§1 dead-status evidence (running code):** Grep across `backend/src` for `getMedicationConcept|matchesMedication|expandDrugClass|getIngredientFromBrand|getDrugClassName|DRUG_CLASSES` returns only `rxnorm.ts` itself and the `terminology/index.ts` re-export - no runtime consumer. `gapRuleEngine.ts` imports only `cardiovascularValuesets`. `loinc.ts` has no importer at all (a grep for its functions / import path returns only a comment reference in `cardiovascularValuesets.ts:169`). This verified-dead status is what HOLDS severity at MEDIUM rather than classifying up to HIGH: the no-consumer evidence affirmatively rebuts gating impact (verified-dead, not severity-uncertain).
- **Evidence (representative corruption in `backend/src/terminology/rxnorm.ts DRUG_CLASSES`; RxNav `properties.json` resolutions, NOT addendum text):**
  - Wrong-drug: `1520` (claimed bisoprolol) = betaxolol [L52]; `596` (amiodarone) = alprazolam [L99, L190]; `4099` (flecainide) = "estrogens, conjugated (USP)" [L103]; `8629` (ramipril) = prazosin [L69]; `3820` (ezetimibe) = emetine [L168]; `7531` (methadone) = nortriptyline [L195]; `8640` (haloperidol) = prednisone [L194]; `1730193` (prasugrel) = cisatracurium [L123]; `2200644` (dapagliflozin) = "semaglutide 14 MG Oral Tablet" [L18]; `897122` (dulaglutide) = "liraglutide ... Pen Injector" [L43]; `8156` (pravastatin) = phenylalanine [L112]; `2169274` (tafamidis) = "dapagliflozin / saxagliptin Oral Tablet" [L129]; `6472` (pitavastatin) = lovastatin [L114]; `36567` is labeled atorvastatin but RxNav resolves it to simvastatin [L110]; `7226` is labeled lisinopril but RxNav resolves it to nadolol [L68].
  - Non-current / nonexistent (retired SNOMED CT or UNKNOWN per `historystatus.json`): `9145` simvastatin [L113], `7373` captopril [L70], `2200016` semaglutide [L40], `1854900` evolocumab [L32], `2665` colchicine [L202], `7612` iron sucrose [L178], `1649380` ivabradine [L149], `2481926` finerenone [L61], and others (~24 NO_API_MATCH in `rxnorm.ts` per the sweep).
  - Parallel `loinc.ts` analyte mislabels: `14647-2` labeled Ferritin = "Cholesterol [Moles/volume]" [L26]; `42757-5` labeled BNP = "Troponin I.cardiac" [L18]; `8601-7` labeled QTc = "EKG impression" [L96]; plus 5 NO_API_MATCH LOINC (LVEF `18010-0`, aortic valve mean gradient `18148-8`, etc.). (LOINC routing detail is recorded on AUDIT-070.)
- **Severity rationale:** MEDIUM (P2). The §1 no-consumer evidence rebuts active gating impact, so the classify-up default does not apply (classify-up is for genuine severity uncertainty, not verified-dead code). Still a CLAUDE.md §8 clinical-accuracy correctness defect at scale and a latent landmine, so not LOW. Not PHI / auth / encryption.
- **Remediation fork (OPERATOR DECISION - deliberately NOT picked in this finding, per operator instruction):** the correct fix depends on whether `rxnorm.ts` was ever intended to be the canonical drug registry, which is an operator call pending the operator's own consideration. Recorded options:
  - (a) DELETE the dead `rxnorm.ts` + `loinc.ts` (and prune the `terminology/index.ts` re-exports) - removes the landmine and the sweep noise; lowest risk if the canonical drug/lab registry is `cardiovascularValuesets.ts`.
  - (b) FIX-IN-PLACE - correct all ~40 codes against RxNav / LOINC per §16, leaving the files dead but accurate (preserves them as a future registry).
  - (c) FIX-AND-WIRE - correct the codes AND make the registry the canonical source the gap engine consumes (largest blast radius; itself a major clinical-code PR + re-verification of every affected gap).
  This finding documents the corruption + the verified-dead status + the un-picked fork as OPEN; remediation is deferred to the operator's decision and is its own separate operator-gated PR (delete = `backend/**`; fix = `backend/**` clinical-code correction).
- **Effort estimate (fork-dependent):** (a) ~1h (delete + re-export prune + confirm no consumer regression); (b) ~4-6h (~40 RxCUI + LOINC corrections + §16 re-verification); (c) larger - (b) plus full gap-engine rewire + per-gap re-verification + tests.
- **Dependencies:** Surfaced by the same §16 sweep as AUDIT-104; independent remediation. Note overlap: several true codes referenced for the AUDIT-104 fix are themselves bad in this dead file (e.g. cilostazol's nominal `24592` is NotCurrent), so AUDIT-104 replacements must be re-verified against RxNav at fix time, NOT sourced from `rxnorm.ts`. Relates to AUDIT-052 (canonical-valueset preference - if the resolution is "canonical lives in `cardiovascularValuesets`", option (a) aligns).
- **Cross-references:** see AUDIT-104 + AUDIT-102 (the LIVE gating wrong-code siblings from the same sweep); see AUDIT-070 (the LOINC mismatches' ingestion-mapping surface - `loinc.ts` correctness ultimately matters there, not in gating); see `AUDIT_METHODOLOGY.md` §16 (RxNav / LOINC external-verification standard) + §1 (the no-consumer dead-status determination is a running-code conclusion, not addendum text); see AUDIT-069 (codebase trust insufficient); see CLAUDE.md §8 (clinical accuracy non-negotiable); see the §16 sweep report `docs/audit/sweeps/clinical-code-sweep-report.md`.
- **Status note:** 2026-06-01 OPEN at filing. Filed as an operator-gated docs PR documenting the corruption + verified-dead status + the un-picked remediation fork. Remediation deferred to the operator's fork decision (delete vs fix-in-place vs fix-and-wire) and is a separate operator-gated PR. NOT marked RESOLVED until the operator picks the fork and that PR lands + PAUSE F verification.
- **Resolution (DELETE fork, authored 2026-06-02 on branch `chore/audit-105-delete-dead-terminology`; PAUSE B->D):** Operator chose **DELETE** (2026-06-02): canonical drug/lab codes live in `cardiovascularValuesets.ts` (consistent with the AUDIT-104 GLP-1 canonicalization landed in PR #332); fix-in-place would preserve a corrupted landmine for a hypothetical future consumer, and fix-and-wire would rearchitect files nothing consumes. Deleted `backend/src/terminology/rxnorm.ts` (320 lines) + `backend/src/terminology/loinc.ts` (155 lines) + the two re-export lines `export * as RxNorm from './rxnorm'` / `export * as LOINC from './loinc'` in `terminology/index.ts` (ICD10 / CPT / MSDRG / NPI re-exports retained). The orphaned interfaces in `types.ts` (`RxNormConcept`, `DrugClassMapping`, `LOINCCode`) were intentionally LEFT in place per operator minimal-scope decision (tsc-clean as unused exports; opportunistic cleanup later, not bundled here).
  - **Dead-status re-confirmation (PAUSE A, repo-wide):** grep across `backend/src` + `backend/tests` + frontend `src/` + `scripts/` + `docs/` for every export of both files (`DRUG_CLASSES` / `getMedicationConcept` / `getIngredientFromBrand` / `expandDrugClass` / `matchesMedication` / `getDrugClassName` / `getAllRxcuis` / `getAllDrugClassKeys`; `LOINC_CODES` / `validateLOINC` / `getLabDescription` / `getLabUnit` / `isLabCode` / `getCode` / `getCodesByClass`) + both import paths + both namespaces (`RxNorm.` / `LOINC.`) found NO runtime consumer: every symbol referenced only within its own file, no test imports either, no file imports the terminology barrel. Only references were the barrel re-exports (removed here), the untracked `sweepClinicalCodes.mjs` text-input map, and docs/comments.
  - **Verification (PAUSE C, on the actual deletion):** tsc `--noEmit` clean (no broken import/type reference); eslint clean; full jest suite **1227/1227 green (56 suites)**; `gaps.push` **263 unchanged**; **NO canonical regen needed** - the deletion touches `terminology/**` only, not `gapRuleEngine.ts`, so no evaluator-block line shift, `docs/audit/canonical/**` untouched, and no Audit-Canonical-Gates trigger fires (re-confirmed git status shows zero canonical changes).
- **Status note (2026-06-02):** Status -> RESOLVED via the DELETE fork in PR (branch `chore/audit-105-delete-dead-terminology`; operator-gated `backend/**` + `docs/**`). On-main PAUSE F verification (git fetch + confirm both files absent on origin/main + tsc/jest green on landed main) runs post-merge; RESOLVED reflects the in-PR end-state per the operator's PAUSE-D-flip instruction.

---

### AUDIT-106 - RUNTIME_GAP_REGISTRY (static, id-keyed) and inline `gaps.push` `evidence` (status/module-keyed, no id) share no join key, so A<->B cross-structure provenance consistency is unguarded - deferred gate-coverage gap (fuzzy-match only), NOT a live clinical defect

- **Phase:** Clinical-code verification (Phase 0B clinical-code arc continuation; surfaced while scoping the evidence-object validator as the cross-structure axis the validator deliberately does NOT cover)
- **Severity:** LOW (P3)
- **Status:** OPEN
- **Discovered:** 2026-06-02 during authoring of the evidence-object validator (`backend/scripts/auditCanonical/validateEvidenceObjects.ts`). The validator gates B-internal consistency (each inline `gaps.push` `evidence` object vs that same push's `recommendations` text). Scoping it surfaced a second, structurally distinct consistency axis the validator does NOT cover and cannot cheaply cover: the static `RUNTIME_GAP_REGISTRY` (keyed by stable gap `id`) vs the inline `gaps.push` evidence (keyed only by `status` / `module`, carrying no `id`). The two structures describe overlapping gaps but share no join key, so any A<->B provenance comparison requires fuzzy matching (by module + status + recommendation text), which is non-deterministic and therefore not gate-worthy as authored.
- **Location (`backend/src/ingestion/gaps/gapRuleEngine.ts`):**
  - A: `RUNTIME_GAP_REGISTRY` (declared L131), static entries keyed by gap `id` (e.g. `id: 'gap-1-attr-cm'` L133).
  - B: the 263 inline `gaps.push({...})` nodes, each carrying an `evidence` object but NO `id` field (keyed at runtime by `status` + `module`; e.g. the first push L3316-L3335 has `type` / `module` / `status` / `recommendations` / `evidence`, no `id`).
  - No shared key: B nodes do not reference their A registry `id`, so a deterministic A<->B join does not exist in the current structure.
- **Evidence (§1 rule-body verification - running code):** the evidence-object validator's own scope boundary is the artifact. It parses the 263 `gaps.push` nodes and checks each evidence object against its sibling `recommendations` within the same push (B-internal); it loads NO registry and performs no A<->B comparison, because registry entries cannot be deterministically matched to push nodes without a shared id (the validator labels each push by `status`, falling back to `gaps.push@<line>`, precisely because no `id` is present). Confirmed by the validator run: 263 `gaps.push` nodes, 263 with evidence object, 0 inconsistencies on the B-internal axis (the only axis it gates).
- **Evidence (§1 consumer census of `RUNTIME_GAP_REGISTRY`, verified 2026-06-03):** the A registry has NO live value-consumer. The sole non-declaration references across `backend/src` + `backend/scripts` + `backend/tests` + frontend `src/` are: (i) a no-consumer re-export passthrough `export { RUNTIME_GAP_REGISTRY } from './gaps/gapRuleEngine'` at `gapDetectionRunner.ts:22` (re-publishes the symbol; nothing imports the value back); (ii) a generated-string JSDoc comment at `extractCode.ts:80`; (iii) a test-only export assertion at `clinicalScenarios.test.ts:90-91` (`content.toContain('export const RUNTIME_GAP_REGISTRY')`). A name-grep is a COMPLETE consumer census here because any value access - direct import, rename-on-import, or namespace `.RUNTIME_GAP_REGISTRY` access - spells the symbol verbatim at the use site, so the absence of any use site is dispositive. Residual: `extractCode.ts` parses registry entries into `docs/audit/canonical/**` (internal audit artifacts only, NOT clinician-facing), so A<->B divergence could at worst pollute an internal canonical artifact - there is NO provenance-rendering path to any UI / API / clinician surface. This affirmatively rebuts the AUDIT-100 / AUDIT-103 harm class (whose wrong provenance lived on the live B transparency surface), rather than merely "no divergence instance found".
- **Why excluded from the validator (scope boundary, documented per operator instruction):** the validator's contract is B-internal evidence-vs-recommendations consistency, which is deterministic (same push, sibling AST fields, exact token / year comparison) and therefore a sound hard gate. A<->B is the un-keyed cross-structure axis: matching a registry entry to its inline push requires heuristic / fuzzy correspondence, which would make the gate non-deterministic and flaky. Encoding A<->B as a hard gate without a shared key would either false-positive on legitimate divergence or require a fuzzy matcher whose own correctness is unverifiable. The clean enabling fix is structural (give B nodes an `id` that references A), itself a `backend/**` change out of the validator's scope.
- **Severity rationale:** LOW (P3, "when convenient"). This is an audit-coverage / gate-completeness gap, NOT a live clinical defect: no gap currently renders wrong clinical provenance because of it (the wrong-provenance class AUDIT-100 / AUDIT-103 fixed was B-internal and IS now gated). A<->B divergence is a latent integrity risk only, with no demonstrated runtime instance. Per the classify-up default this could be argued MEDIUM, but the absence of any live defect plus the future-work / structural-prerequisite nature holds it at LOW; the operator may bump at review. The classify-up default is affirmatively rebutted by the deadness evidence above (the A registry has no live value-consumer; the AUDIT-105 verified-dead pattern), verified 2026-06-03 - this is verified-dead, not severity-uncertainty, so LOW is affirmed rather than a held-down guess. Not PHI / auth / encryption.
- **Remediation (future work; separate operator-gated `backend/**` PR; NOT in scope here):** the enabling step is structural - add a stable `id` (or registry back-reference) to each inline `gaps.push` node so A and B share a deterministic join key, then a follow-on validator pass can hard-gate A<->B provenance equality (registry `evidence` consistent with inline `evidence` for the same id). Until the shared key exists, A<->B remains a fuzzy-match-only check and is not gate-worthy.
- **Effort estimate:** ~4-8h (add id back-reference across the 263 push nodes + registry reconciliation + the A<->B validator pass + tests), gated on the structural-key decision.
- **Dependencies:** Follows the evidence-object validator (this finding's parent; the validator establishes the B-internal gate and explicitly scopes A<->B out, per the register note below). Relates to AUDIT-100 / AUDIT-103 (the wrong-provenance / copy-paste defect class the validator prevents on the B-internal axis; A<->B is the adjacent uncovered axis).
- **Cross-references:** see the evidence-object validator register note below (the parent tooling that scopes this out); see AUDIT-100 + AUDIT-103 (the B-internal wrong-provenance class now gated); see `AUDIT_METHODOLOGY.md` §1 (rule-body verification standard) + §16 (clinical-code verification standard); see CLAUDE.md §8 (clinical accuracy non-negotiable) + §14 (gap-rule evidence-object requirement + FDA CDS transparency).
- **Status note:** 2026-06-02 OPEN at filing. Filed as the deferred cross-structure follow-on to the evidence-object validator, in the same operator-gated PR that ships the validator. Future work; not gate-worthy until the A<->B shared-key structural prerequisite lands.

---

### Register note - Evidence-object validator (`backend/scripts/auditCanonical/validateEvidenceObjects.ts`, shipped 2026-06-02)

Documents the evidence-object validator shipped alongside AUDIT-106, the standing gate that prevents the AUDIT-100 / AUDIT-103 defect class from recurring. (Not a numbered finding; tooling documentation cross-referenced by AUDIT-106.)

- **What it gates (defect class prevented):** the AUDIT-100 / AUDIT-103 wrong-provenance / copy-paste class - an inline `gaps.push` `evidence` object whose `classOfRecommendation` / `levelOfEvidence` / `guidelineSource` was copy-pasted from an unrelated gap and contradicts the rule's own `recommendations`. AUDIT-100 (3 gaps: MRA / RAAS / CAD-statin) and AUDIT-103 (2 gaps: SH-2 TAVR / VD-1 mechanical-valve warfarin) were the live instances; both are RESOLVED, so the validator ships as a regression gate on an already-clean baseline.
- **Scope (B-internal, AST-based):** uses the TypeScript compiler API (not regex-on-free-text) to locate every `gaps.push(<objectLiteral>)` node in `gapRuleEngine.ts` and cross-check each `evidence` object against that same push's `recommendations`. Intentionally B-internal; the A<->B cross-structure axis (registry vs inline) is out of scope and filed as AUDIT-106 (no shared key -> fuzzy-match only -> not gate-worthy).
- **Two-tier design (hard gate + soft tier):**
  - HARD (fails CI, exit 1): evidence `classOfRecommendation` / `levelOfEvidence` / `guidelineSource` vs the co-located `recommendations.action` / `recommendations.guideline` string literals - same AST node, unambiguous 1:1 with the evidence object.
  - SOFT (warn-only, never fails, exit 0): the preceding `//` comment cross-check - one comment may govern multiple push nodes (e.g. an HFrEF SAFETY multi-push), so a comment divergence warns but never fails the gate.
- **Normalized token comparison:** COR reduced to graded arabic token (1 / 2a / 2b / 3); non-graded values ('Expert Consensus', 'FDA Mandate') are not false-flagged, and Vaughan-Williams (1a / 1c) + roman / NYHA "Class" are excluded from claim extraction. LOE reduced to A / B / C with optional -R/-NR/-LD/-EO suffix.
- **guidelineSource comparison (year-set-intersection, NOT string equality):** extracts the set of 4-digit guideline years (1900-2099) from each side and requires a non-empty intersection, so `2022 AHA/ACC/HFSA HF Guideline` and `2022 AHA/ACC/HFSA` match while a copy-paste citing a different guideline year does not. Flags only when both sides carry years and the sets are disjoint (the SH-2 catch: evidence 2023 AF-Management vs rule 2020 VHD). Multi-guideline ';'/'+'-joined sources carry multiple years and pass on any overlap.
- **Current baseline (validator run, 2026-06-02):** 263 `gaps.push` nodes, 263 carrying an evidence object, **0 inconsistencies / 0 warnings** on the gated axes. PASS (exit 0).
- **Prefix-hygiene backlog (385 items, flagged-not-rewritten):** the validator reports 385 prefix-hygiene items (193 `"Class "`-prefixed COR values + 192 `"LOE "`-prefixed LOE values) as non-failing HYGIENE. These are stylistic prefixes in the source `evidence` strings ('Class 1' vs bare '1', 'LOE B' vs bare 'B'); the validator FLAGS them but deliberately does NOT rewrite source, and they are decoupled from the hard gate so a clean-baseline regression gate ships now. Recorded as a minor hygiene backlog (cosmetic normalization, no clinical impact), to be addressed opportunistically.
- **Behavior:** PURE HARD GATE, no allowlist - the runtime baseline is clean post-AUDIT-103, so any future inconsistency fails CI immediately rather than being grandfathered.
- **Cross-references:** prevents the AUDIT-100 + AUDIT-103 defect class (both RESOLVED); deferred follow-on AUDIT-106 (A<->B cross-structure axis); see `AUDIT_METHODOLOGY.md` §1 (rule-body verification - the validator asserts against running code) + §16 (clinical-code verification standard); see CLAUDE.md §14 (gap-rule evidence-object requirement + FDA CDS transparency surface) + §8 (clinical accuracy non-negotiable).

---

### AUDIT-107 - Post-deploy Login verification regressed on production ~2026-05-07 (70 consecutive smoke-test failures); the gate is also non-blocking decoration so deploys ship unverified

- **Phase:** Operational maturity / production verification (surfaced during the 2026-06-03 security-verification block, PART C smoke-test scoping + STEP 0 run-history check)
- **Severity:** HIGH (P1)
- **Status:** OPEN
- **Discovered:** 2026-06-03 during the security-verification block. PART C scoped the Post-Deploy Smoke Test as non-blocking decoration; STEP 0 then pulled the full `gh run` history, which showed the gate has been failing at the Login step for a long unbroken streak with a real prior-success baseline (so this is a REGRESSION, not a never-functional gate).
- **Location (`.github/workflows/smoke-test.yml`):**
  - Trigger L3-8: `workflow_run` on `["Build & Deploy to ECS"]` `completed`, plus `workflow_dispatch`. Runs AFTER the deploy workflow finishes.
  - Login step L44-57: `curl -sf -X POST $API_BASE/api/auth/login` with `LOGIN_EMAIL` / `LOGIN_PASSWORD`, asserting `success == True` (`[ "$SUCCESS" = "True" ] || exit 1`).
- **Evidence (gh run history, read-only; verified 2026-06-03):**
  - 187 total runs; 22 successes; LAST success `2026-05-07T20:54:07Z` (run 25521519631). First failure after = `2026-05-07T22:57:29Z` (~2h later). 70 consecutive failures from then through `2026-06-03T22:08:33Z` (run 26916087062 - the deploy from merge 411239b / PR #337), all `completed / failure`.
  - Failure locus: the Health-check step passes; the Login step fails (curl `-sf` exits non-zero on HTTP >= 400, or `success != True`). Subsequent module-dashboard / patient-endpoint steps never run.
  - Non-blocking design: the smoke workflow is a SEPARATE `workflow_run` that fires only after "Build & Deploy to ECS" has already completed; NOTHING downstream consumes its conclusion (no rollback, no required-check gating, no status reference). Production deploys ship regardless of smoke outcome.
  - Credential source: GitHub Actions repo secrets `secrets.SMOKE_TEST_EMAIL` / `secrets.SMOKE_TEST_PASSWORD` (L47-48). The seed scripts (`backend/prisma/seed.ts`, `backend/scripts/seedBSW.ts`) create NO account matching these secrets, so the smoke account must be provisioned on production out-of-band; the streak is consistent with no such provisioned account (or a rotated password / changed login response shape).
- **Correction to the initial PART C scoping (§1 evidence discipline):** the first-pass observation framed this as "8 consecutive failures since ~2026-06-01." The STEP 0 full-history pull corrects that to LAST success `2026-05-07` and 70 consecutive failures over ~4 weeks. The accurate boundary is recorded here; the original 8/06-01 figure was a truncated-window artifact.
- **Severity rationale:** HIGH (P1). A prior-success baseline exists (last 2026-05-07), so production has had NO working post-deploy auth + dashboard verification signal for ~4 weeks; a real auth or module-endpoint regression would have shipped undetected. Per the classify-up default and the regression framing, HIGH is the floor. Tempering note (operator may weigh): the gate is non-blocking by design, so it never gated a deploy - the harm is the loss of the only post-deploy verification signal, not a removed safety control. Not itself a live exploit / PHI / encryption defect.
- **BLOCKING operator action (immediate, OUT of this PR's scope):** manually verify production login at `api.tailrd-heart.com` NOW - 4 weeks of deploys are unverified at the auth + dashboard surface.
- **Remediation (separate operator-gated work; NOT in this PR):** (1) provision a dedicated smoke-test account on production matching the `SMOKE_TEST_*` secrets (or repair the secrets / login-response-shape assertion); (2) decide the gate's blocking posture (gate the deploy on smoke success, or wire a failure alert) so a future regression is not silent. This PR FILES the finding only; smoke-account provisioning and workflow changes are explicitly out of scope.
- **Effort estimate:** provisioning + assertion repair ~1-2h; blocking-posture decision + wiring ~2-4h (operator-side, fork-dependent).
- **Dependencies:** relates to the CLAUDE.md §18 deploy-verification login credential (the `JHart@tailrd-heart.com` smoke credential is not created by any seed script); relates to the April-review crosswalk note below (the same production-auth surface the April Phase 1 findings covered).
- **Cross-references:** `.github/workflows/smoke-test.yml`; the 2026-06-03 security-verification block PART C; CLAUDE.md §18 (deploy verification sequence); `backend/prisma/seed.ts` + `backend/scripts/seedBSW.ts` (no matching smoke account).
- **Status note:** 2026-06-03 OPEN at filing. Filed as an operator-gated docs PR. NOT marked RESOLVED until a provisioned smoke account makes the Login step pass on a post-deploy run AND the blocking-posture decision lands.
- **Status note (mechanism resolved):** 2026-06-03 the smoke Login failure was root-caused to HTTP 500, NOT a credential/account miss. An operator probe of `POST /api/auth/login` returned 500 for a real account; a nonexistent-user probe returned a clean 401. The 500 is the AUDIT-108 production authentication outage (fail-closed decrypt on un-backfilled plaintext User fields). AUDIT-107 is therefore reframed as the DETECTION-GAP finding: a non-blocking post-deploy gate let a total auth outage ship unverified for ~4 weeks - the predicted harm materialized as AUDIT-108. AUDIT-107 stays OPEN pending smoke-account provisioning + the blocking-posture decision (a working smoke also requires AUDIT-108 to be fixed first). See AUDIT-108 (outage) + AUDIT-109 (no error logging).
- **§18-vs-smoke pass-criteria reconciliation (2026-06-03):** the CLAUDE.md §18 deploy-verification login uses `curl -s` and accepts "Login: True (or valid error)" - a 401 passes §18. The post-deploy smoke (`.github/workflows/smoke-test.yml:50`) uses `curl -sf`, which HARD-FAILS on any HTTP >= 400. So the two checks disagree: a "valid error" 401 that §18 tolerates still trips the smoke gate. Combined with the burned `JHart@.../Demo2026!` credential (now scrubbed from §18 to `$SMOKE_TEST_*` + rotation required), the smoke Login cannot pass until (1) AUDIT-108 is fixed (decrypt path healthy), (2) the smoke credential matches a real, rotated account, and (3) the `-sf`-vs-`-s` criteria are reconciled (decide whether the smoke should tolerate a valid 401 or require 200). Items (2)+(3) are AUDIT-107 remediation scope.
- **Prerequisite (1) MET 2026-06-04:** AUDIT-108 RESOLVED (backfill executed + verified; login probe HTTP 200). The decrypt path is healthy, so a 500 no longer blocks the smoke. Remaining AUDIT-107 remediation scope is now (2) provision/rotate the `SMOKE_TEST_*` account+secret (the `Demo2026!` credential is burned - returned 200 in the probe, so it IS valid but compromised; rotate per runbook §7) and (3) decide the smoke blocking posture + the `-sf` vs `-s` pass-criteria. AUDIT-107 stays OPEN on (2)+(3).
- **Remediation SHIPPED (code/workflow) 2026-06-04, item (3) addressed + (2) tooling ready:** smoke `Login` step made self-diagnosing (`smoke-test.yml`: dropped `curl -f`, captures `%{http_code}`, asserts HTTP 200 + success==True, classified `::error::` for 401/500/000) - this resolves the `-sf`-vs-`-s` pass-criteria question (now explicit 200). Blocking-posture **option (A) alert-only IMPLEMENTED** (deduped `gh issue create` on smoke failure; does NOT gate deploy); **option (B) deploy-gating remains an OPEN operator decision**. Rotation tooling shipped: `backend/scripts/migrations/audit-107-rotate-smoke-credential.ts` (gated `--dry-run`/`--execute` + `AUDIT_107_ROTATE_CONFIRMED=yes`; reads `SMOKE_NEW_PASSWORD` from env, never logs it) + 3-step runbook `docs/runbooks/AUDIT_107_SMOKE_ROTATION_RUNBOOK.md`. **Remaining = OPERATOR-SIDE (2):** run the rotation (run-task) + `gh secret set SMOKE_TEST_*` + workflow_dispatch the smoke; the smoke going green on a post-deploy run after rotation flips AUDIT-107's remaining scope. Stays OPEN until that green run + the option-(B) decision.
- **Correction (2026-06-06; supersedes the "Remediation SHIPPED (code/workflow) 2026-06-04" line above, per the AUDIT-109 root-cause-correction precedent):** the 2026-06-04 remediation was SHIPPED-BUT-NEVER-EXECUTED-UNTIL-PR-#354. The same PR that shipped the self-diagnosing Login step (PR #345 / `8ebc932`, merged 2026-06-04) also introduced a YAML parse defect in `.github/workflows/smoke-test.yml` (a de-indented `gh issue create --body` continuation that broke the `run:` block scalar). GitHub's workflow-schema parser rejected the workflow with HTTP 422 (`Unexpected value 'AUDIT-107 alert-only posture'`, Line 163), so the workflow was parse-dead (`jobs: []`) on EVERY run from 2026-06-04 onward - the self-diagnosing Login step, the alert-only notify, and the http_code/200 assertion never executed once. The remediation's runtime existence began only when the parse fix (PR #354 / `87b68e2`) merged 2026-06-06. This parse-dead window is filed as its own finding AUDIT-112; the non-functional alert path is AUDIT-114. So the "code/workflow SHIPPED 2026-06-04" claim is corrected to "authored 2026-06-04, first executed 2026-06-06."
- **Status note (partial proof; 2026-06-06; register-literal, NO closure):** on the first green-parse dispatch (run 27053503619, `workflow_dispatch` on main post-#354), the rotated credential PROVED OUT at the Login step: `Login HTTP status: 200` -> `Login: PASS (HTTP 200, success=True)`, token issued (http_code captured, 200 asserted - the AUDIT-108-prerequisite + rotation chain is confirmed healthy at the auth surface). Health check + all 6 module dashboards also PASS. HOWEVER the overall run is RED: the `Verify module patient endpoints` step failed 5/6 on `heart-failure/patients: FAIL: Failed to load Heart Failure patient worklist` (a production 500, filed as AUDIT-113; unrelated to the smoke/credential chain). Per the green-post-deploy-run flip language, AUDIT-107's remaining scope is therefore NOT closed: the credential slice is proven (Login 200) but the PHASE-4 closure gate ("a green post-deploy run") is unmet because the run is red on AUDIT-113. AUDIT-107 stays OPEN. The remaining slices are now (B) the deploy-gating posture decision (still operator-open) and a green end-to-end smoke run (blocked on AUDIT-113). This is an underclaim by design: no slice is flipped on a red run.
- **Status note (credential-slice CLOSED; 2026-06-06):** AUDIT-113 is now RESOLVED (firstName rekey executed + verified), and a `workflow_dispatch` smoke on main (run 27068065320) is **fully green** - `heart-failure/patients: PASS` + all 6 dashboards + all 6 patient endpoints PASS + Login 200 (HTTP 200, success=True). This closes the two slices that were pending: (1) the rotated-credential proof (Login 200) and (2) the green-post-deploy-run gate. **AUDIT-107's remaining scope is now a SINGLE slice: the option-(B) deploy-gating posture decision** (the alert-only option-A is shipped but cannot file an issue - AUDIT-114). AUDIT-107 stays OPEN on option-(B) only; the operator owns the final flip + the option-(B) selection (enumerated below).
- **Option-(B) deploy-gating enumeration (the final AUDIT-107 slice; operator decision):** the post-deploy smoke is currently a non-blocking `workflow_run` decoration - nothing consumes its conclusion (the original AUDIT-107 detection-gap). Four postures, least-to-most coupled:
  - **(B1) Loud-fail-only (alert, do not gate):** keep the smoke non-blocking but make its failure impossible to miss - fix AUDIT-114 (`permissions: issues: write`) so the alert-only `gh issue create` actually files, and/or add a Slack/email/PagerDuty notify. Trade-off: zero deploy-flow risk and no false-positive blast radius, but a real regression still ships - it is detected fast, not prevented. Lowest effort (the AUDIT-114 one-liner). 
  - **(B2) Required status check (gate the NEXT deploy/PR):** promote the smoke to a required check so a red smoke blocks the next merge/deploy. Trade-off: prevents compounding a regression across deploys, but it gates the FOLLOWING change, not the one that broke prod (the smoke runs post-deploy), and a flaky smoke blocks unrelated merges - needs a quarantine/retry story first. Medium effort.
  - **(B3) Block-next-deploy / auto-hold (pipeline gate):** wire the deploy workflow to check the prior smoke conclusion and refuse to promote a new image while the last smoke is red (a deploy-time gate rather than a merge-time gate). Trade-off: tighter coupling of deploy to smoke health; risks a wedged pipeline if the smoke itself breaks (cf. AUDIT-112 parse-dead - a broken gate must fail-open or it blocks all deploys). Medium-high effort + a fail-open design requirement.
  - **(B4) Auto-rollback on red smoke:** on a failed post-deploy smoke, automatically roll the ECS service back to the last-known-good task def. Trade-off: minimizes time-to-recovery, but auto-rollback on a flaky/false-positive smoke is itself an availability risk, and rollback must be safe w.r.t. already-applied migrations (CLAUDE.md RULE 2 runs `migrate deploy` before server start - a rollback to an older image against a newer schema can crashloop). Highest effort + the strongest correctness preconditions (migration-compat gating).
  - **Recommendation:** **(B1) now, (B2) next.** (B1) is the AUDIT-114 one-line fix and removes the silent-decoration property immediately at zero deploy-risk; pair it with a real notify channel. Then (B2) required-check once the smoke has a quarantine/retry story (a single post-fix green run is not yet enough flake history to gate merges safely). Defer (B3)/(B4) until there is operational confidence + the fail-open (B3) and migration-compat (B4) preconditions are designed - both are higher-risk than the harm they prevent at the current pre-DUA stage. 
  - **Generalization to AUDIT-111 (staging silent-red gate), remediation step (2) "make the gate non-silent":** the same posture ladder applies to the non-blocking post-merge `deploy-staging.yml`. The minimal shared fix is (B1)-class: make staging-deploy failure loud (issue/alert) rather than silently red (it has been `failure` ~1 month unnoticed). The durable shared fix is AUDIT-025 Phase a/b (pre-merge migration validation) so a failed migration is caught BEFORE merge - which is the (B2)-class required-check generalized to the migration surface. Treat the AUDIT-107 option-(B) decision and AUDIT-111 step (2) as one "make non-blocking verification gates non-silent" policy rather than two ad-hoc fixes.

---

### Reconciliation note - April Master Platform Review Phase 1 crosswalk (2026-06-03)

The April 2026 Master Platform Review (`docs/MASTER_PLATFORM_REVIEW_2026_04.md`, Phase 1 COMPLETE) used a `FINDING-1.1-NNN` id namespace that was never transcribed into this register's `AUDIT-NNN` namespace. A 2026-06-03 §1 reproduction check on `main` (`411239b`) confirmed the two candidate Phase 1 findings flagged as possibly-unabsorbed are in fact FIXED on main; these dated notes close the crosswalk lineage. No new findings filed (both verified-fixed).

- **April FINDING-1.1-001 (CRITICAL: "Demo Mode Accepts Tampered Tokens as Super-Admin"):** DOES NOT REPRODUCE on main. The current `backend/src/middleware/auth.ts` catch block (L77-94) always rejects a provided-but-invalid token with HTTP 403 (comment L87-88: "A token was provided but failed verification - always reject. Demo fallback only applies when NO token is provided"). The demo super-admin payload is reachable only in the no-token branch (L97-100). Fixed at commit `9469918` / PR #112 ("fix(CRITICAL): 12 P0 fixes from master platform review", 2026-04-12). Residual (documented design, not the finding): when `DEMO_MODE=true` the middleware bypasses auth/authorization wholesale per CLAUDE.md §14; `DEMO_MODE` defaults false (`auth.ts:17`).
- **April FINDING-1.1-008 (HIGH: "JWT Secret Entropy Not Validated"):** DOES NOT REPRODUCE on main. `backend/src/server.ts:48-66` (gated `if (!isDemoMode)`) FATAL-exits on missing `JWT_SECRET`, on length < 32 chars (L58), and on a weak-value blocklist (L62-66). Distinct from AUDIT-017's `PHI_ENCRYPTION_KEY` validator - this is a dedicated JWT_SECRET block. Fixed at commit `b71942c` / PR #117 ("fix(security+infra): logout auth, JWT entropy...", 2026-04-12). Un-adopted hardening noted: the April RS256-migration suggestion was not taken (still HS256, `auth.ts:55`), and the check is length + weak-substring rather than measured Shannon entropy.

---

### AUDIT-108 - Production authentication outage (total): every found-User login returns HTTP 500 because fail-closed decrypt throws on un-backfilled plaintext User.firstName/lastName (encryption-expected since PR #263)

- **Phase:** Production incident / clinical-data-state (surfaced 2026-06-03 during the security-verification block; root-caused via STEP 1-3 read-only trace + one operator-authorized prod probe)
- **Severity:** CRITICAL (P0)
- **Status:** RESOLVED 2026-06-04 (targeted plaintext->V2 backfill executed + verified on production; see Resolution note)
- **Discovered:** 2026-06-03. The non-blocking post-deploy smoke (AUDIT-107) had been failing its Login step for 70 consecutive runs. An operator manual probe of `POST /api/auth/login` with a real account returned HTTP 500, and a discriminator probe with a nonexistent user returned a clean 401 - localizing the fault to post-lookup processing of a found User row.
- **Location (current main):**
  - Throw site: `backend/src/middleware/phiEncryption.ts:185` - `decrypt()` throws `'PHI decryption: unencrypted value found in encrypted-field column ...'` on any value lacking the `enc:` prefix (the AUDIT-015 fail-closed control; header `:27`, opt-out flag `PHI_LEGACY_PLAINTEXT_OK` `:49-53`).
  - Encryption-expected columns: `User: ['firstName', 'lastName']` in `PHI_FIELD_MAP` (`phiEncryption.ts:128`), added by PR #263 / AUDIT-075 (2026-05-08). (`User.email` deferred per AUDIT-081.)
  - Read result-handler: `decryptRecord` (`phiEncryption.ts:206`) runs inside the phiEncryption `$extends` read path on every returned row.
  - Login trigger: `prisma.user.findFirst({ where:{email...}, include:{hospital:true} })` returns the full User row (`backend/src/routes/auth.ts:52-55`); the decrypt throws on the `await`, before any audit write.
- **Evidence:**
  - Operator probe 2026-06-03T23:30:58Z: `{"success":false,"error":"Internal server error"}` HTTP 500 for a real account.
  - Discriminator probe (same class, operator-authorized) 2026-06-03T23:49:51Z: nonexistent user -> HTTP 401 `Invalid credentials` (clean lookup-miss path; no row to decrypt). The 500-only-on-found-user split is the proof the throw is in returned-row decrypt.
  - The 500 emitted NO audit event (no `LOGIN_SUCCESS`/`LOGIN_FAILED`), consistent with the throw at `auth.ts:52` before the audit writes at `:57`/`:68`. (The 401 path DID log `LOGIN_FAILED` - see AUDIT-109 for why the 500 logged nothing.)
  - No plaintext->ciphertext backfill exists: the only User-touching migration is the V0/V1->V2 envelope re-wrap (`backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts:201`, `users.firstName`), which assumes values are ALREADY encrypted and whose production `--execute` is operator-deferred. Existing User rows (created before #263) therefore hold plaintext firstName/lastName.
- **Mechanism: DATA-STATE, not a code bug.** The decrypt control is fail-closed by design (AUDIT-015: never silently return ciphertext/plaintext). The defect is un-backfilled plaintext data meeting newly-encryption-expected columns. `PHI_LEGACY_PLAINTEXT_OK` is a migration-only flag and is not set in production.
- **Scope:** every read of any `User` row -> total production authentication outage (all logins 500). Latently, every read of ANY encrypted-field column holding legacy plaintext across ALL models shares the same throw path; those endpoints are auth-gated (hence unreachable to confirm) but would 500 identically. The `/health` check passes because it reads no encrypted field.
- **Mitigating context (recorded inline; does NOT lower the P0 floor):** no public entry path; synthetic-only, pre-DUA pilot; zero real-user / real-PHI exposure; the data at risk is synthetic.
- **Boundary refinement (recorded):** the prior pin to the #262 deploy (2026-05-07) is corrected. The confirmed persistent mechanism requires PR #263 (2026-05-08 User-field encryption), so the current outage is #263-driven. The #262-era first smoke failures (2026-05-07 22:57Z onward) predate #263 and remain unattributed - the production stack is unavailable (AUDIT-109), so their exact cause (the `$use -> $extends` migration, or transient) is not confirmed. The unbroken streak spans the #262/#263 encryption-arc deploys.
- **Remediation (separate operator-gated `backend/**` work block; NOT in this PR):** author + run a plaintext->ciphertext backfill for `User.firstName`/`lastName` (and any other plaintext-holding encrypted columns surfaced by the production data-state census), scoped by that census; then confirm reads succeed and the smoke Login passes. The existing V0/V1->V2 migration does NOT cover plaintext->ciphertext.
  - **Stopgap EVALUATED and REJECTED:** setting `PHI_LEGACY_PLAINTEXT_OK=true` in production would restore login immediately, but it is a PLATFORM-WIDE disable of the AUDIT-015 fail-closed control (every encrypted column on every model would silently read plaintext), re-opening the exact integrity-failure class AUDIT-015 closed. Rejected as a global control-disable; the targeted backfill is the correct fix. (A narrower revert - temporarily removing `User.firstName/lastName` from `PHI_FIELD_MAP` - is less broad but still defers encryption; both are operator decisions, not taken here.)
- **Severity rationale:** CRITICAL (P0) by classify-up - a total functional outage of production authentication (and latently broad encrypted-read failure) is the highest functional-impact class. The mitigating synthetic/pre-DUA context is recorded but does not lower the floor per the classify-up default; it informs urgency sequencing, not the severity label.
- **Cross-references:** AUDIT-015 (the fail-closed decrypt control that correctly throws here); AUDIT-075 + `phiEncryption.ts:128` (the #263 User-field encryption that created the encryption-expected columns); AUDIT-016 PR3 (`audit-016-pr3-v0v1-to-v2.ts`; V0/V1->V2 re-wrap, NOT a plaintext backfill; production execute operator-deferred); AUDIT-107 (the non-blocking smoke gate that let this ship unverified for 4 weeks); AUDIT-109 (no production error logging - why the stack was unavailable); AUDIT-081 (User.email deferral); CLAUDE.md §16 (production incident history) + §9 (deployment state).
- **Status note:** 2026-06-03 OPEN at filing. Filed as an operator-gated docs PR. This is a CONFIRMED LIVE production outage (mitigated: synthetic, pre-DUA, no real users). NOT marked RESOLVED until the backfill lands, found-User reads succeed, and a post-deploy smoke Login passes.
- **Census evidence (2026-06-03 production data-state census via one-off ECS run-task, counts only):** plaintext is confined to 6 columns / 202 rows / 219 values - `users.firstName`(1), `users.lastName`(1), `recommendations.title`(8), `recommendations.description`(8), `recommendations.evidence`(8), `audit_logs.description`(193). `patients.*` is 100% V2 by PREFIX (zero plaintext), so the outage does NOT widen to patient reads via the plaintext mechanism; the plaintext worst case is bounded to these 3 tables. The single production User row (the login account) has BOTH name fields plaintext - the exact row that 500s. **Scope caveat (prefix-vs-content):** the census counts envelope PREFIX (`enc:v2:`/`v1`/`v0`), NOT `EncryptionContext.purpose` content, so a V2-prefixed row encrypted under a wrong/legacy purpose would count as `v2` here yet still decrypt-fail on read. That is a SEPARATE failure mode from AUDIT-108's plaintext class - specifically the AUDIT-016 §10.7 PARTIAL Phase-1 carryover (~10 `patients.firstName` legacy-purpose V2 rows). This backfill does NOT address §10.7; if those rows persist, patient reads of them 500 independently. Cross-ref AUDIT-016 §10.7. Zero v0/v1 by prefix anywhere (see AUDIT-016 2026-06-03 census cross-check note).
- **Remediation IN FLIGHT (2026-06-03, operator-gated PAUSE A->B->C):** targeted plaintext->V2 backfill - design note `docs/architecture/AUDIT_108_PLAINTEXT_BACKFILL_NOTES.md` (PAUSE A approved) + script `backend/scripts/migrations/audit-108-plaintext-to-v2-backfill.ts` (canonical `encryptWithCurrent` + exported `contextFor` for writer==reader context; raw read/write; self-discriminating predicate; all-skip assertion; `--dry-run`/`--execute` gated by `AUDIT_108_EXECUTE_CONFIRMED=yes`) + jest suite (18 passing + 1 gated `$extends` integration) + 9-section runbook `docs/runbooks/AUDIT_108_BACKFILL_RUNBOOK.md`. Stopgap `PHI_LEGACY_PLAINTEXT_OK` rejected (global control disable). Execute is PAUSE C (post-merge run-task, Aurora snapshot first). RESOLVED flips in a separate closeout docs PR after re-census + login probe + read-path spot-check pass.
- **Resolution (2026-06-04, PAUSE C executed + verified on production):** backfill PR #342 merged (squash `0e62cbf`) + deployed (running image == `0e62cbf`, task def `tailrd-backend:252`) - pre-flight image-SHA gate confirmed before any action.
  - **Rollback anchor:** Aurora snapshot `audit-108-pre-backfill-20260604` created + verified `available` before execute.
  - **Dry-run** (run-task `bcb11286`): candidates exactly 1 / 1 / 8 / 8 / 8 / 193 = 219, matching the census; zero deviation.
  - **Execute** (run-task `15588440`, `--execute` + `AUDIT_108_EXECUTE_CONFIRMED=yes`): `migrated=219 failed=0`; all-skip assertion PASSED (0 plaintext candidates remain); per-row `PHI_RECORD_MIGRATED` audit events emitted.
  - **Re-census** (run-task `8e4fe8af`): plaintext = 0 across all 6 columns; totals unchanged; encrypted moved to v2 (e.g. `audit_logs.description` v2 7103 -> 7296; `users.firstName/lastName` v2 0 -> 1).
  - **Login probe:** `POST /api/auth/login` returned **HTTP 200** (was 500) - decrypt path healthy on the migrated User row.
  - **Read-path spot-check** (run-task `377d61c5`, REAL `$extends` app client, PASS/FAIL only): Recommendation PASS + AuditLog PASS - writer/reader EncryptionContext agree end-to-end on production data.
  - **Scope unchanged:** this resolves the plaintext-class outage on the 6 census columns ONLY. Does NOT cover the AUDIT-016 §10.7 patients.firstName legacy-PURPOSE V2 carryover (a content/purpose issue invisible to the prefix census; tracked separately under AUDIT-016). The `Demo2026!` credential returned 200 (valid) but is BURNED - rotation + `SMOKE_TEST_*` secrets update is operator-side per runbook §7 (AUDIT-107 scope).

---

### AUDIT-109 - Production 500 error handler emits no exception/stack to CloudWatch; production failures are undiagnosable from logs

- **Phase:** Operational maturity / observability (surfaced 2026-06-03 during the AUDIT-108 root-cause trace, STEP 2)
- **Severity:** HIGH (P1)
- **Status:** RESOLVED 2026-06-05 (PR #351 (`ad69666`) merged; task def `tailrd-backend:262` live 1/1; PAUSE F CloudWatch synthetic-500 verification PASS). Severity unchanged.
- **Discovered:** 2026-06-03. While retrieving the production stack trace for the AUDIT-108 login 500, CloudWatch held no error line for the failing request across all candidate log groups.
- **Location:** the global Express error handler / route try/catch path that returns `{ success:false, error:'Internal server error' }` HTTP 500 (e.g. `backend/src/routes/auth.ts` login catch) does not write the caught exception/stack to the logger before responding.
- **Root-cause correction (2026-06-04, supersedes the Location line above + the original Remediation line below):** canonical re-verification on `main` for the remediation PR found the original framing imprecise. The global Express error handler (`server.ts:304-311`) ALREADY logs `error.message` + `error.stack`; only the `auth.ts` login catch (`auth.ts:131`) logged message-only. Neither reached CloudWatch because the operational logger (`logger.ts`) had NO production stdout transport: its `Console` transport was gated `NODE_ENV !== 'production'`, and the `winston-cloudwatch` branch was dead (package absent from `backend/package.json`; `AWS_CLOUDWATCH_GROUP` set nowhere operationally). The 401 path's `LOGIN_FAILED` was visible only because `auditLogger` ships an UNCONDITIONAL Console transport (AUDIT-013). The true root cause is the ABSENT PRODUCTION TRANSPORT, not a silent handler. Corrected remediation: add an unconditional stdout Console JSON transport on the operational logger (mirroring the AUDIT-013 auditLogger pattern; presence ungated, verbosity tunable via `LOG_STDOUT_LEVEL`, default `warn`) + a format-layer fail-closed PHI redaction (`redactPHIFragments` over message/stack/error, AGGRESSIVE on error-context) + `auth.ts` login-catch stack parity; and remove the dead winston-cloudwatch branch + 3 zero-adoption helpers (closes 4-OBS-02 RESOLVED-by-removal in the same PR). Design: `docs/architecture/AUDIT_109_ERROR_LOGGING_OBSERVABILITY_NOTES.md`. requestId correlation deferred (cross-ref 4-OBS-01); 173-site error-logging sweep explicitly deferred (minimal per-site scope this PR: transport + global handler coverage + auth.ts catch + canonical pattern documented).
- **Evidence (read-only CloudWatch, 2026-06-03):** for the operator probe 500 at 2026-06-03T23:30:58Z, `filter-log-events` over `/ecs/tailrd-production-backend`, `/tailrd/production/application`, and `/tailrd/production/security` in the 23:29-23:51Z window returned ZERO error lines and ZERO audit event for that request (the only events were the 5-minute `WebhookEvent` tenant-guard cron + the 401 probe's `LOGIN_FAILED`). By contrast the 401 path DID emit a `LOGIN_FAILED` audit event - so login failures are observable but login 500s are not.
- **Severity rationale:** HIGH (P1). A production outage that emits no stack is undiagnosable from logs; AUDIT-108 required a live operator probe + source reading to root-cause precisely because the logs were silent. Not PHI/auth/encryption itself; the floor is HIGH for an observability gap that blocks incident response on a P0.
- **Remediation (separate operator-gated `backend/**` PR; NOT in this PR):** add error-path logging (logger.error with the exception + stack) on the 500 handler, with PHI-safe redaction (route through the existing `phiRedaction` utility per AUDIT-075; never log raw PHI in the stack/message). Confirm a synthetic 500 produces a redacted stack line in CloudWatch.
- **Cross-references:** AUDIT-108 (the outage whose stack was unavailable, motivating this finding); AUDIT-075 / `phiRedaction.ts` (PHI-safe redaction for the error logging); CLAUDE.md §14 (never leave PHI in logs - the redaction requirement) + §16 (production incident history).
- **Status note:** 2026-06-03 OPEN at filing. 2026-06-04 IN_PROGRESS - code remediation authored + locally verified in the AUDIT-109 PR (branch `audit-109-prod-error-logging`): unconditional stdout JSON transport + format-layer fail-closed redaction (`logger.ts`), `auth.ts` login-catch stack, 8 tests (incl. PHI-throw redacted on message AND stack, fail-closed, stack-legibility); tsc clean, full backend suite + auditCanonical gates green. NOT marked RESOLVED until the PR merges AND a synthetic 500 is verified to produce a redacted stack line in CloudWatch (operator-side, post-deploy, per PAUSE F). **2026-06-05 RESOLVED (PAUSE F):** PR #351 merged to `main` (`ad69666`); production task def `tailrd-backend:262` live 1/1. Synthetic-500 verification PASS - a single disallowed-`.invalid`-Origin probe with a synthetic SSN (`123-45-6789`) as the request-path token produced ONE structured JSON error line in `/ecs/tailrd-production-backend` (`level:error`, `message:"Global error handler:"`, `service:tailrd-backend`, `version:1.0.0`) carrying a genuine multi-frame `stack` (`Error: Not allowed by CORS` -> `/app/dist/server.js:141` -> cors/express frames) with the path SSN token redacted to `[REDACTED-SSN]` (CONSERVATIVE content-pattern set on the non-error-context `path` field) and ZERO raw PHI on the line (`ip` is an allowed operational identifier per CLAUDE.md §14 / design-note §4.2; no name/MRN/email/phone/DOB). All four gate criteria PASS: (1) structured JSON line present, (2) `stack` present, (3) genuine 500 (CORS error, no `statusCode` -> 500; probe response body `{"error":"Internal server error"}`), (4) `[REDACTED-SSN]` placeholder with no raw PHI. 4-OBS-02 closed RESOLVED-by-removal in the same PR (dead winston-cloudwatch branch + 3 zero-adoption helpers removed).

---

### AUDIT-110 - Brittle absolute-line assertions in `tests/scripts/auditCanonical` couple to live-source line numbers and break on unrelated source line-shifts (catch-#89 class); the local pre-push gate set omits the auditCanonical suite, so the breakage is invisible until CI

- **Phase:** Test-infrastructure robustness / canonical-gate maintainability (surfaced 2026-06-04 during the AUDIT-101 dose-aware statin fix, PR #347)
- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Discovered:** 2026-06-04 during PR #347 (AUDIT-101). Adding the shared `highIntensityStatinStatus` helper + rewiring the CAD/PAD high-intensity gates added lines to `backend/src/ingestion/gaps/gapRuleEngine.ts`, shifting every line below the edit. A hardcoded absolute-line assertion in `extractCode.test.ts` broke as a pure side effect of that shift, caught ONLY by CI - the local pre-push verification had run the gap-rule suites but not the `tests/scripts/auditCanonical` suite, so the breakage was invisible locally.
- **Location (`backend/tests/scripts/auditCanonical/`):**
  - **Brittle (real-source-coupled, in scope):** `extractCode.test.ts:204` (description string "at line N") + `:209` `expect(pannus!.commentLine).toBe(10801)` - asserts the absolute `commentLine` of the `VD-PANNUS` block extracted from the REAL `gapRuleEngine.ts`. `extractSpec.test.ts:114` `expect(vhd5!.specLine).toBe(754)` - asserts the absolute `specLine` of `GAP-VHD-005` extracted from the REAL `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` (the exact catch-#89 mechanism: a doc/source line-shift moves the asserted line).
  - **NOT brittle (synthetic fixtures / semantic invariants, out of scope - documented so the audit is not over-scoped):** `crosswalkSchema.test.ts:70-74`, `reconcile.test.ts:111-115` + the `dummyEvaluator` helper, and `refreshCites.test.ts:*` construct `EvaluatorBlock`/crosswalk objects where the literal line number is test INPUT, not an assertion against live source; `extractSpec.test.ts:160` asserts a synthetic `InvalidTierError(... , 100, ...)` constructor arg; `validateEvidenceObjects.test.ts:152-153` `toBe(263)` is a deliberate semantic COUNT invariant on `gaps.push`, not a line number (keep).
- **Evidence (running CI, not addendum text):** PR #347 CI run - both `Jest Tests` (`1 failed, 1295 passed`) and `Audit Canonical Gates` -> `Gate 6 auditCanonical tests` (`1 failed, 139 passed`) failed on the identical assertion: `extractCode.test.ts:209` `Expected: 10675 / Received: 10801` ("VHD evaluator extraction includes VD-PANNUS at line 10675"). `mergeStateStatus` was BLOCKED until the assertion was corrected `10675 -> 10801` in commit `b278d08` (a literal-number bump - the brittle pattern survived, not the fragility). The local-vs-CI divergence: the pre-push run exercised `gapRules/*`, `gaps/*`, `terminology/*` but NOT `tests/scripts/auditCanonical`, so the failing assertion passed no local gate and depended entirely on CI to catch it.
- **Severity rationale:** MEDIUM (P2). Test-infrastructure robustness + a local verification-process gap on the canonical-gate enforcement surface (the suite that backs §9.2 Audit Canonical Gates). The CI net HELD (caught pre-merge at PR #347), so there is no production, clinical, PHI, or audit-defensibility risk - the floor is NOT HIGH/P1. It is above LOW/P3 because it is not cosmetic: (a) recurring fragility - any future line-shift in `gapRuleEngine.ts` or `CLINICAL_KNOWLEDGE_BASE_v4.0.md` will spuriously fail these assertions, generating false-failure toil and red-herring CI noise on the very suite that enforces canonical integrity; (b) a verification-process gap - the local pre-push gate set omitted the auditCanonical suite, so the breakage was invisible locally; the same incomplete-local-gate-set gap could mask a genuine regression if CI coverage ever lapses. Sister to AUDIT-064 (canonical-infra operational debt; partial-pipeline-regen) and AUDIT-096 (silent CI capability gap), both MEDIUM (P2). Per the classify-up default (between two tiers take the higher; downgrade later only with evidence) and the operator's tie-break instruction, MEDIUM (P2) over LOW (P3).
- **Remediation (separate `backend/**` + tooling PR; NOT in this filing's scope):**
  1. Convert the two brittle assertions to content-anchored assertions: keep the existing `blocks.find((b) => b.name === 'VD-PANNUS')` / `gaps.find((g) => g.id === 'GAP-VHD-005')` location-by-identity, then assert `commentPattern` (e.g. `'ID_NAME'`) + structural relationships (`commentLine <= bodyStartLine <= bodyEndLine`; `specLine > 0`) + the semantic content already checked (`tier`, `safetyTagCategory`, `safetyTagLiteral`) - NEVER a literal absolute line number. Drop `expect(...commentLine).toBe(10801)` and `expect(...specLine).toBe(754)` and the "at line N" description literals.
  2. Audit the whole `tests/scripts/auditCanonical` suite to confirm no other real-source-coupled absolute-line assertion remains; record the synthetic-fixture / count-invariant exclusions above so the audit is not over-scoped.
  3. Add a pre-push hook (husky or `.git/hooks/pre-push`) covering the REQUIRED gate set so local pre-push matches CI: the FULL jest suite (or at minimum `tests/scripts/auditCanonical` + the gap-rule suites), `tsc --noEmit`, the §9.2 canonical staleness regen check (extractCode -> extractSpec -> reconcile -> refreshCites -> applyOverrides -> renderAddendum -> renderSynthesis -> validateCanonical + git-diff-empty), `validateEvidenceObjects`, the §18 3-check (no new `@ts-nocheck` / no rogue `PrismaClient` / no `var`), and the DRIFT-44 em-dash scan. This closes the local-vs-CI divergence that let this slip.
- **Effort estimate:** ~2-4h (2 assertion conversions + suite audit + pre-push hook authoring + a deliberate line-shift smoke test to prove the converted assertions survive).
- **Dependencies:** None hard. Independent of the clinical findings. The pre-push hook composes with the existing §18 3-check (extends, does not replace it).
- **Cross-references:** AUDIT-101 (the source line-shift that triggered the catch; fix PR #347, follow-up commit `b278d08`); catch #89 (the `CLINICAL_KNOWLEDGE_BASE_v4.0.md` line-range parse break that shifted `extractSpec.ts` ranges - the same brittleness mechanism; cited in CLAUDE.md §19.4 PARSED-CANONICAL-DOC); AUDIT-064 (sister canonical-infra operational-debt finding, RESOLVED via `AUDIT_METHODOLOGY.md` §9.2); AUDIT-096 (sister silent-CI-capability-gap class); CLAUDE.md §18 (3-check pre-push gate this finding extends) + `AUDIT_METHODOLOGY.md` §9.2 (full-pipeline-regen, the gate set the hook must cover).
- **Status note:** 2026-06-04 OPEN at filing. NOT marked RESOLVED until (i) the two absolute-line assertions are content-anchored, (ii) the suite is audited clean of real-source-coupled line assertions, and (iii) a pre-push hook covering the required gate set is in place and verified (a deliberate line-shift no longer red-herring-fails the auditCanonical suite, and the omitted-suite divergence is closed).

---

### AUDIT-111 - Staging environment undeployable for ~1 month (Prisma P3009 on a staging-only failed `_prisma_migrations` row for the AUDIT-011 tenant-unique-keys migration); the non-blocking post-merge staging deploy gate has been silently red since 2026-05-03

- **Phase:** Operational maturity / deploy verification (surfaced 2026-06-04 during the AUDIT-109 PR #351 post-merge deploy review; read-only investigation)
- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Discovered:** 2026-06-04. The #351 merge to main (`ad69666`) "Build & Deploy to Staging" run (26986857532) failed at the "Deploy to staging ECS and verify" step. Read-only investigation found the staging container exits 1 at the pre-app `prisma migrate deploy` step.
- **Location / mechanism:** staging Aurora `_prisma_migrations` holds the `20260502000000_audit_011_tenant_scoped_unique_keys` migration in `failed` state (failed 2026-05-03 17:54:25 UTC). The Dockerfile CMD runs `prisma migrate deploy` before `node dist/server.js` (CLAUDE.md RULE 2); Prisma aborts with `Error: P3009` ("migrate found failed migrations in the target database, new migrations will not be applied"), the essential container exits 1 (ECS `stoppedReason: Essential container in task exited`, exitCode 1; 8 failed tasks observed), the service never stabilizes, and `deploy-staging.yml` health-polls 20x/5min -> "ERROR: Staging deploy did not stabilize in 5 minutes" -> exit 1. The application process never starts, so the new (#351) logger is not even reached in staging.
- **Root cause - asymmetric incident remediation:** this is the unremediated residue of the AUDIT-024 / AUDIT-025 incident of 2026-05-03 (the `CREATE UNIQUE INDEX CONCURRENTLY`-in-transaction failure, PG error 25001, on this exact migration). PRODUCTION recovered: its failed `_prisma_migrations` row was manually marked `rolled_back_at` (Fargate one-off task `3e56e40dbe924ff089f5ce2222ce409c`) and PR #221's de-`CONCURRENTLY`'d migration re-applied; production now reports `No pending migrations to apply` (verified read-only on `/ecs/tailrd-production-backend` 2026-06-05T00:01:31Z). The IDENTICAL manual fix was NEVER applied to the staging Aurora `_prisma_migrations`, so staging has been P3009-blocked continuously since. Both prod and staging task defs reference the same image (`tailrd-backend:ad69666...`); this is purely staging-DB data-state divergence, image-independent.
- **Silent-red-gate class (sister AUDIT-107):** `deploy-staging.yml` triggers on push to main (post-merge) and runs in parallel with the production `deploy.yml`; per its own header "neither blocks the other if one fails." Nothing consumes its conclusion - no required check, no rollback, no alert. It has been `failure` on EVERY push back through at least 2026-06-02 (15/15 in the read-only `gh run list` window; identical "did not stabilize" signature on prior push `5f50b00`) and root-cause-dates to 2026-05-03 - a month of silent red on a non-blocking decoration gate. This is the same class as AUDIT-107 (the non-blocking post-deploy smoke whose silent red let the AUDIT-108 outage ship unverified ~4 weeks). Each failed run also registers a NEW broken staging task-def revision (staging now at `:144`).
- **AUDIT-011 cross-reference (the failed migration IS the audit-011 tenant-scoped-unique-keys migration):** the AUDIT-011 Phase d 14-day soak is PRODUCTION-based, NOT staging. The design notes (`docs/architecture/AUDIT_011_PHASE_BCD_PRISMA_EXTENSION_NOTES.md`) define `audit` mode as a "14-day production soak" (mode table), `strict` as "Production post-soak", and Phase d evidence as "operator-side log-mining over 14 calendar days" in production; the live `TENANT_GUARD_VIOLATION` audit-mode events in the production log group ARE that soak telemetry. So the staging outage does NOT compromise AUDIT-011 Phase d soak evidence - soak evidence was production-only. (Independent observation, flagged for separate triage, NOT this finding's scope: the production soak is not currently zero-violation - a recurring `WebhookEvent.count missing hospitalId (mode=audit)` event repeats ~every 5 min in production, which bears on the AUDIT-011 Phase d "zero violations" GO trigger and on the AUDIT-077 webhookEvent-hospitalId hygiene gap.)
- **Blast radius (staging-based verification claims since 2026-05-03):** with staging undeployable for ~1 month, any claim of staging-RUNTIME verification in that window would be unsound. A targeted read-only review found NONE load-bearing: AUDIT-011 Phase d soak = production (above); AUDIT-016 key rotation, AUDIT-022 PHI backfill, and AUDIT-108 plaintext backfill were executed/verified against PRODUCTION per their register notes; AUDIT-025 Phase b (the proposed "Staging Migration Validation" pre-merge CI against `tailrd-staging-aurora`) was never implemented (no such workflow exists - only the post-merge `deploy-staging.yml`), so nothing actually gated on staging; AUDIT-025 Phase a (CI migration validation) is also unimplemented and CI uses `prisma db push --force-reset`, which never exercises the migration runner, so CI never saw the failed-migration state either. COMPLETENESS CAVEAT: this is a targeted scan plus a reasoned review of the major landed work, not an exhaustive audit of every "verified"/"confirmed" claim since 2026-05-03; residual unknown is bounded but non-zero.
- **Severity rationale:** MEDIUM (P2). Loss of the pre-production verification environment for ~1 month plus a silent-monitoring gap (a non-blocking CI/CD gate red and unnoticed). NOT HIGH/P1: the production deploy path is independent and healthy (post-#351 image live, running 1/1, production deploy verify passed), there is no realized production / clinical / PHI / audit-defensibility harm, and AUDIT-011 soak evidence is production-sourced (unaffected). Above LOW/P3: a real pre-prod safety net is down and a real CI/CD observability gate failed silently for a month (classify-up default: between two tiers take the higher; downgrade later only with evidence). Severity is the operator's to confirm per §18.
- **Remediation (NOT in this filing's scope; operator-gated):** (1) immediate unblock - repair the staging Aurora `_prisma_migrations` state, mirroring the production fix: `prisma migrate resolve --rolled-back 20260502000000_audit_011_tenant_scoped_unique_keys` against `STAGING_DATABASE_URL` (after inspecting the row), then redeploy staging and confirm the app starts and health goes green; (2) make the staging deploy gate non-silent - gate something on it or wire a failure alert (the AUDIT-107 blocking-posture decision generalizes); (3) land AUDIT-025 Phase a/b (pre-merge migration validation) so a failed migration is caught before merge rather than as a silent post-merge staging red. (2) + (3) are the durable fixes; (1) is the immediate unblock.
- **Effort estimate:** (1) ~30-60 min operator-side DB-state repair + redeploy; (2) + (3) fold into AUDIT-107 blocking-posture + AUDIT-025 Phase a/b (already scoped there).
- **Dependencies:** AUDIT-025 (the migration-validation-gate parent; Phase a/b unimplemented), AUDIT-024 (the CONCURRENTLY pattern that caused the original failure), AUDIT-107 (silent-red-gate sister; the blocking-posture decision generalizes).
- **Cross-references:** AUDIT-024 (the `CONCURRENTLY`-in-transaction PG-25001 failure on this exact migration; PR #220 / #221); AUDIT-025 (schema-migration-validation gate - CI `db push` bypasses the runner + staging deploy is post-merge-parallel, not a pre-merge gate; this finding is the realized month-long consequence); AUDIT-107 (silent-red non-blocking gate class; predicted-harm-materialized precedent in AUDIT-108); AUDIT-011 (the tenant-unique-keys migration; Phase d soak = production, unaffected); AUDIT-077 (webhookEvent missing hospitalId - the recurring production audit-mode violation noted above); CLAUDE.md RULE 2 (migrate-before-server CMD) + §18 (deploy verification). **DRIFT-47 cross-ref resolved (2026-06-04, operator option (c)):** AUDIT-107 is the SOLE silent-red-gate class anchor for this finding. The operator-requested DRIFT-47 cross-ref was inapplicable and is DROPPED - DRIFT-47 is next-step-ordering drift (AUDIT-099 vs AUDIT-101 prioritization), not a gate-class drift. The meta-lesson (a register cross-ref asserted in an instruction without register-literal verification, agent-caught and held before writing) is logged as DRIFT-49 in `docs/audit/AGENT_DRIFT_REGISTRY.md`.
- **Status note:** 2026-06-04 OPEN at filing (read-only investigation; no fix, no redeploy, no rerun). Filed from the AUDIT-109 #351 post-merge deploy review. NOT marked RESOLVED until the staging `_prisma_migrations` state is repaired, staging redeploys green (app starts, health healthy), and the silent-gate blocking-posture is decided.

---

### AUDIT-112 - Post-deploy smoke workflow parse-dead (`jobs: []`) for ~2 days: a de-indented `gh issue create --body` continuation broke the YAML block scalar; GitHub rejected every dispatch with HTTP 422, so the entire AUDIT-107 smoke remediation shipped non-functional

- **Phase:** Operational maturity / production verification (surfaced 2026-06-06 during the AUDIT-107 PHASE-3 smoke-dispatch verification - the operator-authorized `workflow_dispatch` returned HTTP 422 instead of starting a run).
- **Severity:** HIGH (P1)
- **Status:** RESOLVED 2026-06-06 (PR #354 / `87b68e2`)
- **Discovered:** 2026-06-06. The AUDIT-107 remediation (PR #345) was thought SHIPPED 2026-06-04. The PHASE-3 proof step (`gh workflow run smoke-test.yml --ref main`) was rejected by the GitHub API: `HTTP 422: failed to parse workflow: (Line: 163, Col: 1): Unexpected value 'AUDIT-107 alert-only posture'`. Read-only investigation traced it to PR #345 (`8ebc932`, merged 2026-06-04).
- **Location (`.github/workflows/smoke-test.yml`):** the `Notify on smoke failure (AUDIT-107 alert-only)` step (`run: |` block scalar, base content indent 10 spaces). Its `gh issue create --body "..."` argument spanned three physical lines; the second paragraph (line 163) was de-indented to column 1, below the block-scalar base indent, terminating the scalar. The orphaned text `AUDIT-107 alert-only posture:` then parsed as a spurious top-level mapping key alongside `name` / `on` / `env` / `jobs`, which GitHub's workflow schema rejects.
- **Evidence (read-only):**
  - `git show 'origin/main~1:.github/workflows/smoke-test.yml'` (pre-fix) parses (in PyYAML 6.0.3 and js-yaml YAML 1.2) to top-level keys `["name","on","env","jobs","AUDIT-107 alert-only posture"]` - the spurious 5th key IS the HTTP 422 value. The fixed file parses to exactly `["name","on","env","jobs"]`.
  - The workflow has therefore been `jobs: []` (no runnable jobs) on every `workflow_run` trigger since 2026-06-04 - the self-diagnosing Login step, the http_code/200 assertion, and the alert-only notify never executed once. PR #345's entire AUDIT-107 remediation was runtime-inert.
- **Root cause + the validation lesson (why it shipped):** generic YAML parsers (PyYAML, js-yaml) ACCEPT the broken file - the de-indented line is schema-valid-but-wrong YAML (a well-formed extra top-level key), so a "does it parse as YAML" check passes. ONLY GitHub's workflow-schema parser - which enforces the allowed top-level key set - rejects it. So a local `yaml.safe_load` smoke check would have green-lit the defect; the only authoritative validators are `actionlint` (a workflow-aware linter) or an actual dispatch. This is the precise mechanism by which a parse-fatal workflow shipped through review undetected. The meaningful local check is the top-level-key set, not bare YAML parseability.
- **Silent-red-gate class (third member; sister AUDIT-107 / AUDIT-111):** like AUDIT-107 (non-blocking post-deploy smoke whose silent red let the AUDIT-108 outage ship unverified) and AUDIT-111 (non-blocking staging gate silently P3009-red for a month), this is a production-verification gate that was silently non-functional - here not red-but-ignored but parse-dead-so-never-ran, a strictly worse failure mode (no run, no conclusion, nothing to even be red). The AUDIT-107 remediation intended to harden the smoke gate; the same PR silently disabled the gate entirely.
- **Severity rationale:** HIGH (P1). The production post-deploy verification gate was rendered completely inert for ~2 days, and the defect nullified the full AUDIT-107 remediation PR (every step unexecuted). Classify-up between the silent-red-gate sisters AUDIT-107 (HIGH) and AUDIT-111 (MEDIUM) -> HIGH. Tempering note (operator may weigh): the smoke gate is non-blocking by design, so the parse-dead window gated no deploy; the harm is the continued absence of any post-deploy verification signal (compounding AUDIT-107) plus a shipped-broken remediation. Not itself a live exploit / PHI / encryption defect.
- **Remediation (SHIPPED this arc):** PR #354 re-indented line 163 to the block-scalar base indent (YAML strips the common indent, so the shell-side issue body is byte-identical to intent; no behavior change beyond parseability). Whole-file audited - line 163 was the only de-indented-below-base continuation; the two `python3 -c` heredoc strings sit at exactly the base indent and are safe. Validated with PyYAML + js-yaml + top-level-key schema check (actionlint not available in-environment, noted in PR). Final proof was the post-merge `workflow_dispatch` (run 27053503619) starting a real run (no HTTP 422; jobs executed).
- **Effort estimate:** parse fix ~30 min (SHIPPED). No residual code work.
- **Dependencies:** AUDIT-107 (the remediation this defect silently disabled; see AUDIT-107 Correction note 2026-06-06). The first real run then surfaced AUDIT-113 (HF worklist 500) and AUDIT-114 (notify token-permission gap).
- **Cross-references:** `.github/workflows/smoke-test.yml`; PR #345 (`8ebc932`, the defect) + PR #354 (`87b68e2`, the fix); AUDIT-107 (remediation correction); AUDIT-111 + AUDIT-107 (silent-red-gate class); CLAUDE.md §18 (deploy verification).
- **Status note:** 2026-06-06 RESOLVED at the parse layer (workflow is parseable and runs). This finding documents the parse-dead window and the validation lesson; it does NOT close AUDIT-107 (whose green-run gate is now blocked on AUDIT-113) and is distinct from the alert-path defect AUDIT-114 the first run exposed.

---

### AUDIT-113 - Production HTTP 500 on `GET /api/modules/heart-failure/patients`: PHI decrypt-on-read fails fail-loud on a Patient record in the HF cohort; latent across all 6 module worklist endpoints

- **Phase:** Production incident / data-state (surfaced 2026-06-06 by the first green-parse post-#354 smoke run - the AUDIT-112 fix is what allowed the gate to run and catch this).
- **Severity:** CRITICAL (P0) (escalated from HIGH 2026-06-06; see Escalation note - mitigated synthetic/pre-DUA)
- **Status:** RESOLVED 2026-06-06 (rekey executed on the post-AUDIT-115-fix image; see Resolution note)
- **Discovered:** 2026-06-06, smoke run 27053503619. The `Verify module patient endpoints` step failed 5/6: `heart-failure/patients: FAIL: Failed to load Heart Failure patient worklist`. EP / coronary / structural / valvular / peripheral `/patients` all PASS (`count=2-3 source=database`); all 6 module DASHBOARDS PASS; Login + Health PASS.
- **Location:** `backend/src/routes/modules.ts:299-370` (`router.get('/heart-failure/patients')`). The throwing call is `await prisma.patient.findMany(...)` at `:309`, whose `select` pulls `firstName` / `lastName` / `mrn` / `dateOfBirth` (all PHI-encrypted columns). The shared PHI middleware (`backend/src/middleware/phiEncryption.ts`, `$extends({ name: 'audit-016-phi-encryption' })`) decrypts on read via `decryptRecord` -> `decrypt` (`:177`) -> `decryptAny`; `decryptAny` is fail-loud (AUDIT-015 invariant - throws on a malformed / wrong-context / auth-tag-failing envelope rather than returning ciphertext). The route catch (`:366-369`) logs and returns 500.
- **Evidence (AUDIT-109 CloudWatch observability, first real diagnostic use):** the failing request emitted exactly one line in `/ecs/tailrd-production-backend` at the matching timestamp: `{"environment":"production","error":"UnknownError","level":"error","message":"Failed to load HF patient worklist","service":"tailrd-backend","timestamp":"2026-06-06T05:14:22.099Z","version":"1.0.0"}`. `"UnknownError"` is the real `error.message`, NOT a redaction artifact (the `phiRedaction` layer emits named placeholders like `[REDACTED-NAME]`, never the literal `"UnknownError"`); it is the KMS-wrapper-masked decrypt signature documented in `docs/runbooks/AUDIT_016_PR_3_MIGRATION_RUNBOOK.md` ("`UnknownError` (KMS wrapper): wrapper masked the underlying KMS exception").
- **Observability meta-note (did the AUDIT-109 log line suffice? NO):** the AUDIT-109 stdout->CloudWatch transport DID deliver its core value - it captured the failing request with a precise timestamp, confirming WHICH request failed and WHEN (the AUDIT-108-class "no error line at all" failure mode did not recur). But it did NOT suffice for root cause: the handler logs only `error.message` (not `error.name` / `stack`), and the upstream KMS wrapper masks its own exception as `"UnknownError"`, so the WHY (which envelope, which KMS context, which field) was invisible from logs alone. Source archaeology was required (handler + `$extends` decrypt path + AUDIT-016 runbook cross-ref). NOTE: the aggressive PHI redaction over the `error` key did NOT cause the genericization (redaction would have produced a named placeholder, not `"UnknownError"`), so this is not redaction over-reach - it is a thin log payload (`.message`-only) plus upstream KMS masking. Improvement candidate (separate): log `error.name` + a categorized decrypt-error class (the AUDIT-016 `categorizeError` taxonomy already exists) on the decrypt path.
- **Root cause - data-state, not code / not schema:** the EP `/patients` handler (`:831-902`) is byte-for-byte identical in shape to the HF handler (same `findMany`, same `OR: [{ <module>Patient: true }, { therapyGaps: { some } }]`, same nested `select`, same `map`); only the module discriminators differ. EP passes, HF 500s on identical code -> the defect is record-specific data-state, not handler logic and not schema (identical schema fields; a schema/stale-client error would fail EP too). At least one Patient record in the HF cohort (`heartFailurePatient: true` OR has an open HF therapy gap) has a PHI envelope that fails decrypt under the canonical KMS EncryptionContext - the same family as AUDIT-016 §10.7 (5/5 `patients.firstName` decrypt failures "UnknownError" under canonical purpose, the purpose-content carryover that the AUDIT-108 plaintext backfill explicitly did NOT cover) and the AUDIT-108 login-500 decrypt family.
- **Dashboard-passes-but-patients-fails split (explained):** the HF dashboard handler returns aggregates via `prisma.patient.count` + `prisma.therapyGap.groupBy` / `findMany` selecting only `medication` / `patientId` / gap fields - it never selects patient-name PHI (`firstName` / `lastName` / `mrn` = 0 occurrences), so it triggers no decrypt-on-read and cannot hit the poisoned envelope. The worklist selects the name PHI and does. The split is a decrypt-surface difference, not a route-code regression.
- **Latent across all 6 modules (blast radius):** all six `/patients` handlers share the identical decrypt-dependent code; the other five pass ONLY because their current cohorts do not include the poisoned record(s). The defect class is platform-wide; HF is merely the cohort that currently intersects a bad envelope. The smoke gate caught it via HF on its first-ever real run.
- **When it regressed:** not a code event - the route code is unchanged and identical to the passing modules. The data-state condition predates this run; it became VISIBLE only now because (a) the smoke workflow was parse-dead 2026-06-04..06 (AUDIT-112) and (b) HF is the only API-first-wired module otherwise exercised. So "first observed 2026-06-06," root-cause-dates to whenever the bad envelope was written (likely the AUDIT-016 §10.7 purpose-carryover population; not bounded by this filing).
- **Severity rationale:** HIGH (P1). A live production 500 on a PHI decrypt-on-read path, latent across all 6 module worklist endpoints, sister to the CRITICAL AUDIT-108. NOT P0/CRITICAL: it is scoped to one module endpoint (degraded, not a total outage) and mitigated by synthetic / pre-DUA data (no real patient exposure, same mitigation as AUDIT-108). Classify-up from MEDIUM -> HIGH (a production 500 on the encryption hot path with platform-wide latency). ESCALATE to CRITICAL if investigation shows the poisoned-envelope set is broad (many records / multiple modules) or persists into post-DUA real PHI. Severity is the operator's to confirm per §18.
- **Remediation (NOT in this filing's scope; operator-gated; read-only investigation only):** (1) identify the failing record(s) - enumerate the HF cohort and probe-decrypt `firstName` / `lastName` / `mrn` / `dateOfBirth` per record (the AUDIT-016 `audit-016-pr3-step-1-7-firstname-provenance.ts` provenance-probe pattern applies); (2) determine the envelope class (non-canonical purpose / un-rekeyed V2 / corrupted) and remediate via the matching AUDIT-016 path (`audit-016-pr3-v2-rekey-purpose.ts` rekey, or backfill) - this is the §10.7 carryover the AUDIT-108 plaintext backfill deferred; (3) consider a graceful-degradation decision for the worklist (one un-decryptable record should arguably not 500 the entire cohort list - but per AUDIT-015 fail-loud discipline this is a clinical/PHI design decision, operator-gated, NOT a unilateral catch-and-skip).
- **Effort estimate:** (1)+(2) ~2-4h operator-side probe + targeted rekey/backfill (depends on the failing-set size); (3) is a design decision folded into the AUDIT-015 fail-loud posture.
- **Dependencies:** AUDIT-016 §10.7 (patients.firstName purpose-content carryover - the most likely source class), AUDIT-108 (sibling decrypt-500; its backfill scoped out this class), AUDIT-015 (fail-loud decrypt invariant - why one bad record 500s the list), AUDIT-109 (the observability that captured the request; meta-note above), AUDIT-112 (the parse fix that let the gate catch this).
- **Cross-references:** `backend/src/routes/modules.ts:299-370` (HF) + `:831-902` (EP, identical-shape control); `backend/src/middleware/phiEncryption.ts:177-223`; `docs/runbooks/AUDIT_016_PR_3_MIGRATION_RUNBOOK.md` §10 + line 507 ("UnknownError" KMS-wrapper); smoke run 27053503619; CloudWatch `/ecs/tailrd-production-backend`.
- **Status note:** 2026-06-06 OPEN at filing (read-only investigation; no fix, no probe-decrypt run, no data mutation). Caught by the smoke gate's first-ever real run. NOT marked RESOLVED until the failing record(s) decrypt cleanly (or are remediated per the AUDIT-016 path) and a re-run smoke shows `heart-failure/patients: PASS`.
- **Escalation note (HIGH -> CRITICAL, 2026-06-06):** the Phase-A blast-radius probe (read-only, full table x 4 fields via the real `$extends` client) resolved the set size that the filing left open: **5,780 of 6,147 firstName envelopes (94%)** fail canonical decrypt - all in tenant `demo-medical-city-dallas`, all `firstName`-only (lastName/mrn/dateOfBirth = 0 failures), all class `non-canonical-purpose:phi-migration-v0v1-to-v2` (real-client error `InvalidCiphertextException`; the incident's `error.message="UnknownError"` and the probe's `error.name="InvalidCiphertextException"` are two views of the same KMS purpose-mismatch). This meets the filing's own "ESCALATE to CRITICAL if the poisoned-envelope set is broad" condition, so severity is escalated **HIGH -> CRITICAL (P0)** per §18 (broad criterion). Mitigation is unchanged and load-bearing: **synthetic / pre-DUA data, no real PHI** (parallel to AUDIT-108 CRITICAL-but-mitigated). The dashboard-passes / 5-of-6-worklists-passed observation is reconciled: the failing set is concentrated in the HF cohort; the smoke's `?limit=3` worklists for the other modules returned canonical top-N rows.
- **Resolution note (RESOLVED 2026-06-06):** remediated via `audit-016-pr3-v2-rekey-purpose.ts --execute --target patients.firstName` (purpose `phi-migration-v0v1-to-v2` -> canonical `phi-encryption`), run via ECS run-task on the post-merge image AFTER the AUDIT-115 tooling-defect fix (PR #357) - the FIRST execute attempt (pre-fix) was a silent no-op (`rowsRekeyed=0`, all-skip abort, see AUDIT-115). Post-fix execute: **rowsAttempted=6,147 / rowsRekeyed=5,780 / rowsSkippedCanonical=367 / rowsFailed=0** (full table scanned; invariants met exactly). Pre-execute rollback snapshot `audit-113-pre-rekey-firstname-20260606` (available, unused). **Verification:** (1) re-run AUDIT-113 probe across all 4 worklist fields / 6,147 patients -> `failingRecordCount=0`, perFieldFailureMap all-zero, envelopeClassMap empty; (2) `workflow_dispatch` smoke on main -> fully green, `heart-failure/patients: PASS count=3 source=database` (+ all 6 dashboards + all 6 patient endpoints PASS, Login 200). This green run also satisfies AUDIT-107's green-post-deploy-run gate.
- **§10.7 carryover-scope check - FULLY RESOLVED 2026-06-06 (the earlier UNDERCLAIM is now closed by a full-inventory sweep):** the initial filing left the cross-target carryover UNKNOWN. A read-only full-TARGETS investigation + corrective sweep closed it:
  - **The 2026-05-16 full sweep is the source of truth (CloudWatch `auditLogger` evidence, run `targets=82`, `PHI_REKEY_RUN_START`@00:01:52Z -> `PHI_REKEY_RUN_COMPLETED rekeyed=495362 skipped=150 failed=0`@02:57:48Z).** It ran under the buggy AUDIT-115 all-skip abort. All 82 per-target `PHI_REKEY_TARGET_COMPLETED` lines reconcile exactly: **21 targets fully rekeyed to canonical** (their `rekeyed` counts sum to precisely 495,362; incl. `conditions.conditionName` 225,439, `medications.medicationName` 220,552, and `patients.{lastName,dateOfBirth,phone,mrn,street,city,state,zipCode}` 6,147 each), **3 targets `PHI_REKEY_BATCH_ALL_SKIPPED`** (rekeyed=0; next bullet), and **58 targets attempted=0** (no V2 rows that day). [Correction 2026-06-07: the earlier "27 of 29 fully rekeyed" was an overcount; the run log shows 21 fully-rekeyed targets. The current 29-target V2>0 inventory = the 24 V2-bearing targets touched on 2026-05-16 (21 rekeyed + 3 abort-skipped) + 5 targets that gained V2 rows only AFTER 2026-05-16 -- `recommendations.{title,description,evidence}` + `users.{firstName,lastName}`, written by the post-rekey canonical middleware and confirmed canonical by the 2026-06-07 verify-by-rekey (rekeyed=0/skipped=all). 21 + 3 + 58 = 82; 24 + 5 = 29.]
  - **Exactly 3 targets hit `PHI_REKEY_BATCH_ALL_SKIPPED` (rekeyed=0; skipped=150 = 3 x 50-row batch-1 aborts):** `patients.firstName`, `audit_logs.description`, `audit_logs.newValues`. These were the only AUDIT-115 abort victims.
  - **Of those 3, only `patients.firstName` had a real legacy tail** (5,780 behind a 367-row canonical seed) - fixed by this remediation. The post-#357 corrective sweep re-executed `audit_logs.description` (`attempted=7305 rekeyed=0 skipped=7305 failed=0`) and `audit_logs.newValues` (`attempted=7101 rekeyed=0 skipped=7101 failed=0`): **both were already fully canonical** (the abort fired on them because batch-1 was genuinely all-canonical - its flawed premise happened to hold for them). New-since-2026-05-16 targets `recommendations.{title,description,evidence}` + `users.{firstName,lastName}` verify-by-rekey `rekeyed=0/skipped=all`.
  - **Canonical-decrypt verification (two layers):** (1) spotcheck (2026-06-06), all 29 current-V2 targets, 1,521 samples, **0 failures**; (2) **FULL canonical-context decrypt probe (2026-06-07, ECS task `76e6a35f`, read-only, zero DB writes, zero plaintext logged)** attempting `contextFor('AuditLog', col)` / purpose `phi-encryption` decrypt on EVERY V2 envelope of the two abort-skipped audit_logs targets: `audit_logs.description` **7,305/7,305 ok / 0 fail** + `audit_logs.newValues` **7,101/7,101 ok / 0 fail** (14,406 envelopes, **0 failures**). The full probe is load-bearing: it proves the 2026-06-07 skip-canonical result reflects genuine canonical state, ruling out a hidden third-purpose/poison envelope class that would be invisible to BOTH the rekey scan (skips on old-purpose decrypt failure) AND the verify-by-rekey skip path.
  - **STEP 4 census of `audit_logs.newValues` non-V2 rows (2026-06-07, ECS task `abd4a721`, read-only, no decrypt, no PHI):** total 7,305 rows; v2=7,101; **v0=0, v1=0**; non-v2=**204** = **203 JSON-`null` literals** (jsonb_typeof=`null`) + **1 SQL NULL**; **real plaintext content (object/string/number/array)=0**. The 204 non-v2 carry NO encryptable content (null sentinels), so they are out of `v0v1-to-v2` scope (0 v0/v1) AND carry nothing for AUDIT-022 plaintext backfill either. [Correction: prior framing "the 202 non-v2 / plaintext-json=203 / null=1" was inexact -- it is 204 non-v2 and the 203 are JSON-null literals, not plaintext-json.]
  - **Conclusion: §10.7 purpose-carryover is FULLY RESOLVED across all 82 targets.** `patients.firstName` was the sole real victim. No global carryover remains. The `AUDIT-XXX-future-full-target-rekey-sweep` candidate is therefore COMPLETE (closed by this block).
- **Probe-path precision (2026-06-06):** the AUDIT-113 probe's DESIGNED primary path is the real `$extends` client; at runtime all production tenants are pre-DUA with `baaExecuted=false`, so every record (both probe runs) ran via the BAA-gated raw + `contextFor`-canonical-context decrypt fallback - the identical canonical decrypt the middleware performs (`totalRealClientReads=0` in both runs, confirmed). The 0-vs-5,780 before/after result is therefore faithful and apples-to-apples. (The Escalation note's "via the real `$extends` client" phrasing reflects the designed path, not the runtime path.)

---

### AUDIT-114 - Smoke `Notify on smoke failure` step cannot actually file an issue (no `permissions: issues: write`): the AUDIT-107 alert-only posture is silently non-functional

- **Phase:** Operational maturity / production alerting (surfaced 2026-06-06 by the first real smoke run, which failed and so exercised the failure-notify path for the first time).
- **Severity:** MEDIUM (P2)
- **Status:** RESOLVED 2026-06-07 (PR #361 + PR #362; alert path verified end-to-end - see Resolution note). Severity unchanged at MEDIUM per §18; severity is the operator's to confirm.
- **Discovered:** 2026-06-06, smoke run 27053503619. The run failed (AUDIT-113), so the `if: failure()` `Notify on smoke failure (AUDIT-107 alert-only)` step ran for the first time. Its `gh issue create` emitted `gh issue create failed (token/permission?); see run logs above for the failing step.` and filed NO issue. (Verified: no open issue titled "Post-deploy smoke test FAILED in:title".)
- **Location (`.github/workflows/smoke-test.yml`):** the notify step runs `gh issue create` with `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`. The workflow declares no `permissions:` block, so the default `GITHUB_TOKEN` permission set (read-only or restricted, per repo/org default) lacks `issues: write`; `gh issue create` 403s. The step's trailing `|| echo "..."` swallows the failure, so the step exits 0 and shows GREEN despite filing nothing.
- **Evidence (read-only):** run-log line (notify step): `gh issue create failed (token/permission?); see run logs above for the failing step.` The step's `dedup` guard (`gh issue list ... | jq 'length'`) and the create both depend on `issues` token scope; the create path is the one that fails closed-to-silent.
- **Root cause + silence class:** the AUDIT-107 remediation added option-(A) alert-only notification specifically so a failed post-deploy smoke would RAISE a signal (since the gate is non-blocking). But without `permissions: issues: write` (or a PAT with issue scope), the alert mechanism cannot emit the alert, and the `|| echo` fallback masks the failure as a green step. So the alert-only posture is itself silently non-functional - the same silence class as AUDIT-107 / AUDIT-111 / AUDIT-112 (a verification/alerting mechanism that appears present but does nothing). This was latent until the first real failure exercised it.
- **Severity rationale:** MEDIUM (P2). It defeats the AUDIT-107 alert-only safety mechanism (a failed production smoke raises no issue), classify-up from LOW because it is a silent failure of a safety/alerting control on the production-verification surface (same class the AUDIT-107 arc is trying to close). NOT HIGH: it causes no production / clinical / PHI harm itself, the failure IS loudly visible in the run log (just not as an issue), and the fix is a one-line `permissions:` block. Arguably LOW; held at MEDIUM per classify-up given the silence-class pattern. Severity is the operator's to confirm per §18.
- **Remediation (NOT in this filing's scope; operator-gated; one-line + decision):** add a top-level `permissions:` block granting `issues: write` (plus `contents: read`) to the workflow - or scope it to the notify job - so `gh issue create` succeeds; OPTIONALLY drop the `|| echo` swallow so a future notify failure is loud rather than green. Confirm org/repo policy allows `GITHUB_TOKEN` issue writes (if disabled at org level, a PAT secret is required instead). This is a `.github/**` change (operator-gated footprint), deliberately NOT bundled into the docs-only filing PR.
- **Effort estimate:** ~15 min (permissions block) + a policy check.
- **Dependencies:** AUDIT-107 (the alert-only posture this defect disables; option-(B) deploy-gating decision is the related open fork), AUDIT-112 (the parse fix that let the notify step run at all), AUDIT-113 (the failure that exposed it).
- **Cross-references:** `.github/workflows/smoke-test.yml` (notify step); smoke run 27053503619; AUDIT-107 (alert-only option A) + AUDIT-111 + AUDIT-112 (silence class); GitHub Actions `GITHUB_TOKEN` permissions model.
- **Mechanism-2 note (2026-06-07, exposed BY the rung-1 verification):** the filing named only mechanism 1 (missing `issues: write`). After PR #361 fixed mechanism 1 (grant + removed the `|| echo` swallow), the first synthetic verification run (`27105986858`, dispatched `simulate_failure=true`) went red and the notify step **failed loudly** with `failed to run git: fatal: not a git repository` - **NOT a 403**. Root cause: the smoke job runs no `actions/checkout`, so `gh issue list`/`create` have no local git remote to resolve the repo from. The SAME `|| echo` swallow had masked this second mechanism too; removing it (the whole point of the un-swallow) is what surfaced it. Fixed by PR #362 adding `GH_REPO: ${{ github.repository }}` to the notify step env (covers both the dedup list and the create). Lesson: removing a failure-swallow can peel one masked layer to reveal the next; verify end-to-end, not just that the step stopped being green.
- **Resolution note (RESOLVED 2026-06-07):** two code PRs + an on-demand synthetic verification. **PR #361** (`ff84abe`): job-level `permissions: issues: write` (least-privilege; also confers issues read for the dedup), removed the `|| echo` swallow (fail loud), and added a `workflow_dispatch` input `simulate_failure` + a dispatch-only first step that `exit 1`s when set (guarded `github.event_name == 'workflow_dispatch' && inputs.simulate_failure`) so the `if: failure()` path can be exercised WITHOUT calling production endpoints. **PR #362** (`025366a`): `GH_REPO: ${{ github.repository }}` (mechanism 2). **Verification (synthetic, no production calls):** run `27105986858` (post-#361) = red, notify FAILED LOUDLY on the git-repo error (proving mechanism 2 + that the un-swallow works); run `27107094279` (post-#362) = red, **notify SUCCESS**, issue **#363** actually filed with a body linking the run, then closed with a verification-artifact comment; normal run `27107112514` (`simulate_failure=false`) = **full green** with the synthetic step correctly SKIPPED (guard confirmed - it cannot fire on `workflow_run`/scheduled or `simulate_failure=false`). The alert path now files an issue end-to-end on a real failure. Validated with actionlint (schema clean; 0 new shellcheck findings vs the 6 pre-existing baseline) on both PRs.
- **Option-(B) rung-1 note (AUDIT-107 cross-link):** this closes **option-(B) rung 1** (B1 "loud-fail-only / make the gate non-silent") with a *verified-functional* alert path, not just a code change - the AUDIT-107 B1 recommendation's blocker (AUDIT-114) is removed. **Rung 2** (B2 required-status-check) remains a deferred operator decision, pending flake history: a single green run is not enough confidence to gate merges. **Flake-ledger observation #1 (2026-06-07):** PR #360's `Jest Tests` check went red on a Docker Hub registry timeout in the "Initialize containers" step (run `27102508897`), not a test failure; it recovered green on rerun. First data point toward the quarantine/retry story B2 needs.
- **Status note (RESOLVED 2026-06-07; supersedes the 2026-06-06 OPEN-at-filing note):** the notify step now files an issue on a failed run (verified end-to-end, synthetic run `27107094279` -> issue #363). The original filing's "NOT marked RESOLVED until the notify step files an issue on a failed run" condition is met. Both fixes were operator-authorized `.github/**` PRs (#361 + #362), not docs-only.

---

### AUDIT-115 - Rekey all-skip safety abort misfires on a front-loaded canonical distribution: silent exit-0 no-op (rowsRekeyed=0), caught by the count invariant not the exit code

- **Phase:** Tooling correctness / migration scripts (surfaced 2026-06-06 during the AUDIT-113 PHASE-E rekey execute; read-only investigation of the halt).
- **Severity:** MEDIUM (P2)
- **Status:** RESOLVED 2026-06-06 (PR #357 / `8dad468`)
- **Discovered:** 2026-06-06. The first AUDIT-113 `patients.firstName` rekey execute (`--execute --target patients.firstName`, run-task on `:266`) returned exit 0 with `rowsAttempted=50 / rowsRekeyed=0 / rowsSkippedCanonical=50 / rowsFailed=0` - it processed only the first batch of 50 and stopped, rekeying nothing, despite the AUDIT-113 probe having proven 5,780 rekeyable firstName records. Caught by the operator-mandated `rowsRekeyed~=5,780` count invariant; the exit code (0) would have falsely read as success.
- **Location:** `backend/scripts/migrations/audit-016-pr3-v2-rekey-purpose.ts` `rekeyTarget` loop - the "all-skip safety abort" (former lines ~363-376): `if (batchSkippedCanonical === rows.length && batchRekeyed===0 && batchFailed===0) break;`. Per-row logic decrypts under the OLD purpose (`phi-migration-v0v1-to-v2`); a decrypt FAILURE is recorded as skip-canonical (record assumed already canonical). The abort breaks the loop on any all-skip batch.
- **Root cause:** the abort assumes "all-skip batch -> target converged (fully canonical)." False for a FRONT-LOADED distribution: the ~367 already-canonical seed rows hold the LOWEST patient ids, so batch 1 (by `id ASC`) was 100% skip-canonical and tripped the abort BEFORE the 5,780 legacy-purpose records at higher ids were reached. Context was bit-identical to the AUDIT-113 probe's successful decrypt (`SERVICE_NAME='tailrd-backend'`, same purpose/model/field) - the records were rekeyable; the abort just never reached them. The 50 skipped ids were the global-lowest (`cmno7z...`, matching the STEP-1 provenance offset-0 samples).
- **Silent-success failure mode (the actual defect class):** the script exited 0 and reported a clean run while doing nothing - a remediation operator reading the exit code (not the `rowsRekeyed` count) would believe the rekey completed. This is the same silence class as AUDIT-112 (parse-dead workflow, `jobs:[]`, no run), AUDIT-107 (silent-red decoration gate), and AUDIT-111 (silently-red staging gate): a mechanism that appears to succeed/complete while accomplishing nothing.
- **Blast-radius correction (2026-06-06; the abort's real prior impact was wider than the AUDIT-113 firstName attempt):** CloudWatch `auditLogger` evidence shows the SAME abort silently skipped **3 targets** in the **2026-05-16 full production sweep** (`PHI_REKEY_RUN_START targets=82` -> `RUN_COMPLETED rekeyed=495362 skipped=150 failed=0`; 3 x `PHI_REKEY_BATCH_ALL_SKIPPED` on `patients.firstName` + `audit_logs.description` + `audit_logs.newValues`; `skipped=150 = 3 x 50` batch-1 aborts). So AUDIT-115's real-world manifestation was a **3-target silent gap in a 495,362-row production rekey** (2026-05-16), discovered only ~3 weeks later because `patients.firstName` - the one of the three with an actual legacy tail - broke the HF worklist (AUDIT-113). The other two (`audit_logs.{description,newValues}`) were already canonical, so the abort caused no carryover there, but the abort still STOPPED their scans prematurely - the defect fired identically; only the data behind the canonical seed differed. Post-#357 corrective sweep confirmed all three clean (see AUDIT-113 §10.7 note). The "halted the AUDIT-113 firstName rekey" framing in the Discovered note is the symptom that surfaced it; this is the full prior blast radius.
- **Severity rationale:** MEDIUM (P2), classify-up from LOW per Tier-1-first discipline. NOT LOW: it silently blocked a CRITICAL (AUDIT-113) production remediation and its silent-exit-0 mode would defeat an exit-code-only verification - a real correctness defect in PHI re-encryption tooling. NOT HIGH/P0: it caused ZERO data mutation (fail-safe direction - it under-ran, never mis-wrote), was caught immediately by the count invariant, and affects an operator-run migration script (not a live production hot path). Severity is the operator's to confirm per §18.
- **Fix (RESOLVED, PR #357):** REMOVED the all-skip-per-batch abort (and its per-batch counters). The keyset cursor (`id > lastId`, `ORDER BY id ASC`) + the partial/empty-batch breaks already guarantee correct termination; an all-skip batch is normal and must not stop the scan. REPLACED with a cursor NON-PROGRESS tripwire (`throw PHI_REKEY_CURSOR_NONPROGRESS`, propagates to the entrypoint `.catch` -> `process.exit(2)`) guarding the actual Day-15 pre-cursor infinite-loop pathology (cursor failing to advance). Tests GROUP G: LOOP-1 updated (cursor + empty-batch termination, not premature abort), LOOP-4 added (the exact front-loaded regression - scan proceeds past the all-skip batch and rekeys later records), LOOP-5 added (stuck cursor throws); 22/22 green. Runbook §10.11.4/§10.11.5 rewritten. Verified end-to-end: post-fix execute rekeyed 5,780 / skipped 367 / failed 0 (AUDIT-113 Resolution note).
- **Cross-references:** PR #357 (`8dad468`); `audit-016-pr3-v2-rekey-purpose.ts` + `backend/tests/scripts/migrations/audit-016-pr3-v2-rekey-purpose.test.ts` GROUP G; `docs/runbooks/AUDIT_016_PR_3_MIGRATION_RUNBOOK.md` §10.11.4/§10.11.5; AUDIT-113 (the remediation it blocked); AUDIT-112 / AUDIT-107 / AUDIT-111 (silent-success/silent-red class).
- **Status note:** 2026-06-06 RESOLVED at fix-merge + verified by the post-fix AUDIT-113 rekey hitting the exact invariants (5,780/367/0). Filed as a standalone tooling-defect entry (independent of AUDIT-113) per operator instruction so the defect exists in the register on its own.

---

### AUDIT-116 - v0/v1-to-v2 JSON discovery filter ignores the JSON quote-prefix: mis-buckets JSON v2 as plaintext and would silently miss JSON-column v0/v1 envelopes

- **Phase:** Tooling correctness / migration scripts (surfaced 2026-06-07 during the AUDIT-016 §10.7 STEP-4 `audit_logs.newValues` census).
- **Severity:** LOW (P3) - **downgraded from MEDIUM (P2) 2026-06-07** per the downgrade path below, after the 28-target census proved 0 v0/v1 victims (was classify-up-from-LOW while blast radius was UNVERIFIED). Severity is the operator's to confirm per §18.
- **Status:** RESOLVED 2026-06-07 (quote-aware kind-aware filters + 3 tests; see Resolution note). The realized impact was cosmetic count mis-bucketing only - zero migration victims (28-target census: 0 v0/v1 everywhere).
- **Discovered:** 2026-06-07. The AUDIT-016 §10.7 STEP-4 census of `audit_logs.newValues` had to be re-run quote-aware because the migration script's own count filter reported `audit_logs.newValues v2=0 plaintext=7304` - which is impossible given the column is fully canonical (the 2026-06-07 full canonical-decrypt probe, ECS task `76e6a35f`, read 7,101 V2 envelopes / 0 failures). The quote-aware STEP-4 census (ECS task `abd4a721`) returned the true split: total 7,305 / `v2=7101 / v0=0 / v1=0 / JSON-null=203 / SQL-null=1 / real-plaintext=0`.
- **Location:** `backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts` - the `kind: 'json'` discovery/count filters.
- **Defect:** the `kind: 'json'` filters compare the stored value with `::text LIKE 'enc:%'` (and `NOT LIKE 'enc:v2:%'`). A jsonb string column stores the envelope WITH its surrounding JSON double-quotes, i.e. `"enc:v2:..."`, so the leading character is `"`, not `e`. The unquoted `LIKE 'enc:%'` therefore matches NONE of the JSON-v2 rows. The sibling rekey script `audit-016-pr3-v2-rekey-purpose.ts` handles json correctly (it matches the quoted form `'"enc:v2:%'`), so this is a discovery-script-only divergence.
- **Two consequences:**
  - **(1) count mis-bucketing** - the v0/v1 census mis-reports JSON-v2 as plaintext (printed `v2=0 plaintext=7304` for `audit_logs.newValues`, vs the correct `v2=7101 / v0=0 / v1=0 / JSON-null=203 / SQL-null=1 / real-plaintext=0`). Cosmetic, but it actively misleads the operator about migration state.
  - **(2) latent migration miss** - the candidate v0/v1 discovery filter (`::text LIKE 'enc:%' AND NOT LIKE 'enc:v2:%'`) would MISS any JSON column actually carrying v0/v1 envelopes, because `"enc:v1:...` does not match `LIKE 'enc:%'` either. A real JSON-column v0/v1 envelope would be invisible to discovery and would never migrate to v2 - a SILENT skip, no error.
- **Blast radius:** MOOT for `audit_logs.newValues` (the only JSON target censused so far - 0 v0/v1 envelopes there, confirmed quote-aware by STEP-4), so no actual victim exists at this column. But the defective filter is LATENT across all **28 JSON targets** in the migration TARGETS table; whether any of the other 27 JSON columns carries a v0/v1 envelope is UNVERIFIED.
- **Severity rationale (downgrade path now satisfied):** filed MEDIUM (P2), classify-up from LOW while the blast radius was UNVERIFIED (a v0/v1 JSON envelope would be SILENTLY skipped from migration). **Downgrade path:** "if the 28-JSON-target census confirms 0 v0/v1 envelopes across all JSON columns, the realized impact collapses to a cosmetic count-display bug and this downgrades to LOW." That census ran 2026-06-07 (next bullet) and confirmed 0 v0/v1 everywhere -> **downgraded to LOW (P3)**.
- **28-target JSON census (2026-06-07, ECS task `0a1b286c`, image `tailrd-backend:269`, read-only, no decrypt, no PHI; evidence script `docs/audit/sweeps/step5-28target-json-census.js`):** quote-aware classification across ALL 28 `kind:'json'` TARGETS = **v0=0 and v1=0 on every target** (`v0v1Targets: []`). Totals: total 375,888 / v2 7,101 (all `audit_logs.newValues`) / v0 0 / v1 0 / JSON-null 7,507 / SQL-null 361,036 / real-plaintext 244. The SAFETY-STOP condition (any v0/v1 found = a finding, those envelopes unreachable until this fix) DID NOT trigger - there are no such envelopes. Conclusion: zero migration victims; the defect's only realized impact was the cosmetic JSON-v2-as-plaintext mis-bucketing.
- **Remediation (IMPLEMENTED, this PR):** (1) made the `countTarget` + `fetchV0V1Rows` `kind:'json'` filters kind-aware - quoted prefix `'"enc:%'` / `'"enc:v2:%'` for json (bare `'enc:%'` unchanged for string) + `#>>'{}'` unquoted-envelope extraction in the fetch, mirroring `audit-016-pr3-v2-rekey-purpose.ts`; (2) 3 tests added (json-v2 counted as v2 not plaintext; a quoted json v1/v0 IS matched by the discovery filter + value extracted unquoted; JSON-null + SQL-null excluded from the envelope buckets); (3) the 28-target census ran (above). String-target behavior is byte-identical (no regression to the 50+ string targets). **Scope note:** the WRITE path (`migrateRecord` in `keyRotation.ts`, kind-blind) is intentionally OUT of scope (PR = scripts+tests+docs) and DEAD in production (census = 0 json v0/v1); this PR fixes the DETECTION defect (the actual silent-miss), so any future json v0/v1 would now be SEEN rather than silently skipped. Completing the json write-path round-trip would be a gated follow-up only if a future census ever surfaces a json v0/v1.
- **Resolution note (RESOLVED 2026-06-07):** quote-aware kind-aware filters landed in `audit-016-pr3-v0v1-to-v2.ts` with 3 new tests (40/40 in the suite, 180/181 across the 7 migration suites; tsc clean; 3-check pass; DRIFT-44 pass). No production data mutated (the census proved nothing needs migrating); the fix is drift-prevention so a future json v0/v1 is detected, not silently missed.
- **AUDIT-022 reaffirmation (dated 2026-06-07, NOT a new finding):** the 28-target census incidentally counted **244 real-plaintext JSON rows across 12 columns / 8 models** (risk_score_assessments.{inputData,components} 4+4; intervention_tracking.findings 2; alerts.triggerData 5; phenotypes.evidence 7; contraindication_assessments.{reasons,alternatives,monitoring} 2+2+2; therapy_gaps.recommendations 211; audit_logs.metadata 1; drug_titrations.{barriers,monitoringPlan} 2+2). These are plaintext-at-rest jsonb objects/arrays (NOT enc envelopes), i.e. the **AUDIT-022** domain (legacy JSON PHI not encrypted at rest), not AUDIT-116's v0/v1 scope. Reconciliation vs AUDIT-022's original snapshot (243 rows / 11 columns / 6 models, `verify-phi-legacy-json.js` 2026-04-30): the delta is **+1 row / +1 column**, immaterial and most plausibly DATA GROWTH (the lone `audit_logs.metadata` object, written after the 2026-04-30 snapshot) combined with a counting-method difference (the census enumerates all 28 TARGETS columns; the original verify-script counted only the then-populated 11). A precise row-level bisection is not possible without the original per-column breakdown, but the envelope-version conclusion is identical (0 v0/v1; 0 already-encrypted-but-legacy). No new finding: AUDIT-022 remains RESOLVED-tooling / production-backfill-execution operator-side per its entry; this census reaffirms that pending population.
- **Cross-references:** `backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts` (defective filter) vs `audit-016-pr3-v2-rekey-purpose.ts` (correct quoted json handling); STEP-4 census evidence script `docs/audit/sweeps/step4-newvalues-census.js` (ECS task `abd4a721`) + full-probe evidence `docs/audit/sweeps/step3-canonical-decrypt-probe.js` (ECS task `76e6a35f`); AUDIT-113 §10.7 closure note + runbook §10.12; AUDIT-115 (sister tooling-correctness defect in the same migration family); AUDIT-022 (the JSON-PHI-at-rest domain these JSON targets belong to).
- **Status note:** filed 2026-06-07 as standalone AUDIT-116 (promoted from the `AUDIT-XXX-future-v0v1-json-discovery-filter` placeholder) per the branch-name promise (`docs/audit-016-sweep-closure-115-blastradius-116-jsonfilter`). Surfaced by the AUDIT-113 §10.7 STEP-4 census; the census itself was the corrected, quote-aware classification that exposed the filter bug.

---

### Follow-on candidates (named, NOT implemented; logged per operator instruction 2026-06-06)

- **AUDIT-XXX-future-decrypt-path-error-logging** (LOW-MEDIUM): the PHI decrypt path / route catch blocks log only `error.message`, and the KMS wrapper masks its exception as `"UnknownError"` - so a production decrypt 500 (e.g. AUDIT-113) is undiagnosable from logs alone (root cause needed source archaeology). Candidate: log `error.name` + a categorized decrypt-error class (the AUDIT-016 `categorizeError` taxonomy already exists - `InvalidCiphertextException` / `AccessDeniedException` / `IntegrityCheckFailed` / `UnknownError` / ...) at the decrypt callsites and/or the global error handler. Surfaced by AUDIT-113.
- **AUDIT-XXX-future-probe-compact-summary** (LOW): the AUDIT-113 blast-radius probe emits one large `JSON.stringify` summary (per-record `failures[]` + full id lists); on a broad failing set (5,780) this overflowed CloudWatch's per-event size limit and truncated the `perModuleIntersection` tail. Candidate: emit a COMPACT summary (counts + class maps only) plus optional capped/streamed id lists, so the full diagnostic always lands. Surfaced by AUDIT-113 STEP-3.
- **AUDIT-XXX-future-ci-lint-scope-scripts-tests** (LOW): the CI `npm run lint` is scoped to `eslint src/**/*.ts` only - `backend/scripts/**` and `backend/tests/**` are NOT linted by CI. Pre-existing `no-constant-condition` (`while (true)`) and `no-explicit-any` in the migration scripts are therefore invisible to CI. Candidate: extend the lint glob (or add a scripts/tests lint job) so migration-script and test defects are caught pre-merge. Surfaced during PR #357 verification.
- **AUDIT-XXX-future-full-target-rekey-sweep** (MEDIUM) - **COMPLETE 2026-06-06 (closed in this block, NOT outstanding):** the full-inventory investigation + corrective sweep ran. Result: **21 targets proven rekeyed (per-target counts sum to exactly 495,362)** by the 2026-05-16 full sweep + 3 abort-skipped + 58 attempted=0 = 82; the 3 abort-skipped (firstName fixed; audit_logs.{description,newValues} confirmed already-canonical, incl. a 2026-06-07 FULL canonical-decrypt probe of all 14,406 V2 envelopes / 0 failures); all 29 current-V2 targets canonical-decrypt-verified (1,521 spotcheck samples, 0 failures). §10.7 FULLY RESOLVED. See AUDIT-113 §10.7 note. No further sweep needed.
- **AUDIT-116** (was `AUDIT-XXX-future-v0v1-json-discovery-filter`) - **RESOLVED 2026-06-07** (promoted from placeholder + fixed in the same arc): the v0/v1-to-v2 JSON discovery/count filters now match the quoted prefix `'"enc:%'` / `'"enc:v2:%'` (kind-aware, mirroring the rekey script) + `#>>'{}'` value extraction; 3 tests added; 28-target census (ECS task `0a1b286c`) confirmed 0 v0/v1 across all 28 targets -> downgraded MEDIUM (P2) -> LOW (P3). See the **AUDIT-116** detail entry above and its LOW (P3) severity-index row. No longer an unnumbered candidate.

---

## Phase 5 HIPAA Compliance Gap Analysis Findings (2026-05-20)

**Phase 5 of Phase 0A audit arc.** Companion report: `docs/audit/PHASE_5_REPORT.md`. Verdict: **CONDITIONAL PASS** sister to Phase 1/2/3/4 precedent. Scope: Option A full HIPAA compliance gap analysis (45 CFR Part 164 Subparts A + C + D + E; 45 CFR Part 160; Omnibus 2013 cross-cutting). TAILRD classification: Business Associate per B5.2.0 canonical-grep determination.

**Severity totals (52 entries):**

| Severity | Count |
|---|---|
| HIGH (P1) GATE | 2 |
| MEDIUM (P2) | 5 |
| MEDIUM-DOCUMENTATION | 7 |
| LOW (P3) | 4 |
| LOW-DOCUMENTATION | 6 |
| DOCUMENTATION | 19 |
| CROSSREF | 7 |
| N/A | 2 |
| **Total** | **52** |

Severity column copied verbatim from PHASE_5_REPORT.md §4.X per §18 register-literal discipline. Citations follow §1 rule-body verification (file:line where applicable).

### 5-CLS-01 - BA classification attestation documentation

- **CFR:** 45 CFR §164.103 Definitions
- **Severity:** DOCUMENTATION
- **Status:** RESOLVED
- **Description:** TAILRD BA classification established by canonical-grep at B5.2.0 but not formally documented as HIPAA compliance attestation
- **Code-surface:** `docs/BAA_REGISTER.md:1`; `docs/BAA_REQUIREMENTS.md:1-38`
- **Cross-references:** see 5-ADM-09; see 5-OMN-01
- **Remediation:** Author `docs/HIPAA_CLASSIFICATION.md` (~1-2h)
- **Status note:** 2026-05-21 transitioned OPEN to IN_PROGRESS at P1.3.2 scope-lock; bundled with 5-ADM-09 closure per Q-5ADM-J 8-finding sister-bundle (BA classification documentation surface).
- **Status note:** 2026-05-22 P1.3.3c.SCOPE operator decisions locked per 5-ADM-09 primary catalyst (Q-5ADM-K Path B PUT verb HTTP idiom + Q-5ADM-L Path B defense-in-depth route+service authorization + Q-5ADM-M Path A per-service-file tests + Q-5ADM-N Path B extended PR body + Q-5ADM-O default 4 NEW AUDIT + 2 cross-references + Q-5ADM-P Path A JSDoc inline fix + Q-5ADM-Q Path A finer-grained error-to-HTTP mapping + Q-5ADM-R Path A multi-hospital per-cardinality tests + Q-5ADM-S Path A comprehensive BUILD_STATE narrative + Q-5ADM-T Path A 5 atomic sub-blocks); sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern (P1.3.4 scope).
- **Status note:** 2026-05-22 P1.3.3c.IMPLEMENT-3 transitioned OPEN to IN_PROGRESS per §18 register-literal lifecycle per 5-ADM-09 primary catalyst; sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern (P1.3.4 scope).
- **Status note:** 2026-05-25 FIXED-on-main per PR #294 merge (5-ADM-09 P1.3.3c primary catalyst, commit 3cc3370a61be3de2162b76dbe8b92f6a847de64a, mergedAt 2026-05-23T01:18:53Z UTC); sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern next work block (P1.3.4 scope).
- **Status note:** 2026-05-25 RESOLVED-on-main per PR #295 sister-bundle Status-flip merge (5-ADM-09 P1.3.3c primary catalyst, commit 3cc3370a61be3de2162b76dbe8b92f6a847de64a, mergedAt 2026-05-23T01:18:53Z UTC); Q-5ADM-J sister-bundle closure complete.

### 5-CLS-02 - General Security Rule requirements documentation

- **CFR:** 45 CFR §164.306 Security standards general rules
- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** Flexibility-of-approach decisions across audit arc not consolidated into §164.306 compliance posture statement
- **Code-surface:** None (policy-layer)
- **Cross-references:** see AUDIT-016, AUDIT-011, AUDIT-076 (flexibility exemplars); see 5-PNP-01
- **Remediation:** Section in `docs/HIPAA_CLASSIFICATION.md` (~1-2h bundled)

### 5-ADM-01 - Security management process documentation

- **CFR:** 45 CFR §164.308(a)(1)(i)-(ii)
- **Severity:** MEDIUM-DOCUMENTATION
- **Status:** OPEN
- **Description:** Risk analysis (Required spec) + sanction policy + info system activity review cadence not formally consolidated; partial coverage via AUDIT-076 + AUDIT-082 + AUDIT-083 + Phase 1-5 audit arc
- **Code-surface:** None (policy-layer)
- **Cross-references:** see AUDIT-076, AUDIT-082, AUDIT-083; see Phase 1-5 reports
- **Remediation:** Author `docs/HIPAA_RISK_ANALYSIS.md` (~6-10h)

### 5-ADM-02 - Assigned security responsibility documentation

- **CFR:** 45 CFR §164.308(a)(2)
- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** Designated security official not formally documented
- **Code-surface:** None (policy-layer)
- **Cross-references:** see 5-ADM-01, 5-ADM-05
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` or `CLAUDE.md` (~30min)

### 5-ADM-03 - Workforce security procedures

- **CFR:** 45 CFR §164.308(a)(3)
- **Severity:** MEDIUM-DOCUMENTATION
- **Status:** OPEN
- **Description:** Workforce authorization / supervision / clearance / termination procedures not documented
- **Code-surface:** None (policy-layer; cross-ref AUDIT-011 infrastructure-layer)
- **Cross-references:** see AUDIT-011; see 5-ADM-04, 5-ADM-05
- **Remediation:** Author `docs/HIPAA_WORKFORCE_SECURITY.md` (~4-6h)

### 5-ADM-04 - Information access management documentation

- **CFR:** 45 CFR §164.308(a)(4)
- **Severity:** LOW-DOCUMENTATION
- **Status:** OPEN
- **Description:** Strong technical controls via AUDIT-011 Layer 3; documentation gap for workflow + access establishment / modification procedure
- **Code-surface:** `backend/src/lib/prismaTenantGuard.ts`
- **Cross-references:** see AUDIT-011, AUDIT-077; see 4-3PL-02
- **Remediation:** Author `docs/HIPAA_ACCESS_MANAGEMENT.md` (~2-3h)

### 5-ADM-05 - Security awareness and training program

- **CFR:** 45 CFR §164.308(a)(5)
- **Severity:** MEDIUM-DOCUMENTATION
- **Status:** OPEN
- **Description:** HIPAA security awareness + training program not documented
- **Code-surface:** None (policy-layer)
- **Cross-references:** see 5-ADM-02, 5-ADM-03; see 5-ENF-04
- **Remediation:** Author `docs/HIPAA_TRAINING_PROGRAM.md` (~3-5h); v2.0 carry-forward for workforce expansion

### 5-ADM-06 - Security incident procedures runbook gap

- **CFR:** 45 CFR §164.308(a)(6)
- **Severity:** MEDIUM (P2)
- **Status:** OPEN - CROSSREF to Phase 4 4-RNB-02
- **Description:** No per-incident-class actionable runbooks (5xx surge / auth-failure-storm / PHI breach response) per Phase 4 4-RNB-02 sister finding
- **Code-surface:** `backend/docs/incident-runbooks.md` (broad prose only)
- **Cross-references:** see 4-RNB-02; see 5-BRC-06
- **Remediation:** Author `docs/runbooks/INCIDENT_PHI_BREACH.md` + sister runbooks (~4-6h)

### 5-ADM-07 - Contingency plan documentation + testing cadence

- **CFR:** 45 CFR §164.308(a)(7)(i)-(ii)
- **Severity:** MEDIUM (P2)
- **Status:** OPEN - CROSSREF to AUDIT-078 IN-PROGRESS
- **Description:** Aurora backup posture covered by AUDIT-078; periodic-testing cadence + criticality analysis documentation gap
- **Code-surface:** `docs/runbooks/AUDIT_078_AURORA_BACKUP_RESTORE_RUNBOOK.md`
- **Cross-references:** see AUDIT-078; see 5-PHY-04
- **Remediation:** Author `docs/HIPAA_CONTINGENCY_PLAN.md` bundled with AUDIT-078 closure (~2-3h consolidation)

### 5-ADM-08 - Periodic evaluation cadence documentation

- **CFR:** 45 CFR §164.308(a)(8)
- **Severity:** LOW (P3)
- **Status:** OPEN
- **Description:** Audit framework partially satisfies; periodic evaluation cadence not formally documented
- **Code-surface:** None (process-layer)
- **Cross-references:** see AUDIT-001 (Tier A test coverage); see Phase 1-5 reports
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` (~1h)

### 5-ADM-09 - BA contracts execution gap (sub-vendor + customer-hospital surfaces)

- **CFR:** 45 CFR §164.308(b)(1)-(4)
- **Severity:** **HIGH (P1) GATE**
- **Status:** RESOLVED - PHASE 5 GATE
- **Description:** Two surfaces: (a) sub-vendor BAAs PENDING (AWS / Redox / ElastiCache per `docs/BAA_REGISTER.md`); (b) customer-hospital BAA tracking capability gap (no automated PHI-flow-gating against BAA-execution state)
- **Code-surface:** `docs/BAA_REGISTER.md`; `backend/src/routes/internalOps.ts:31-48`; `docs/TAILRD_COMPLETE_PLATFORM_AUDIT.md:889`
- **Severity rationale:** Direct OCR enforcement trigger per Omnibus 2013 BA direct liability; PHI flow pre-BAA-execution is §164.308(b) Administrative Safeguards violation + §164.502(e) Privacy Rule violation (cross-ref 5-PRV-03). Severity floor preserved per B5.4.1 evidence; not downgradeable until both surfaces close.
- **Cross-references:** see AUDIT-082, AUDIT-085; see 5-ORG-01, 5-PRV-03, 5-OMN-02
- **Remediation:** (1) Operator-side BAA execution (~2-4h; accept AWS BAA via AWS Artifact + execute Redox BAA + verify ElastiCache umbrella); (2) Customer-hospital PHI-flow-gating capability (~8-16h or v2.0 carry-forward per pre-DUA timing tolerance)
- **Status note:** 2026-05-21 transitioned OPEN to IN_PROGRESS at P1.3.2 scope-lock; primary catalyst for Q-5ADM-J 8-finding sister-bundle (5-ADM-09 + 5-PRV-03 + 5-OMN-02 + 5-PRV-01 + 5-PHY-01 + 5-ORG-01 + 5-PRV-04 + 5-CLS-01) per most-robust posture (2026-05-03 extend-timeline-not-scope + 2026-05-07 robust-over-consistent-with-existing); P1.3.2 operator decisions locked Q-5ADM-A Path 2 both-surfaces-in-scope + Q-5ADM-B Path (c) Prisma extension Layer 3 + Q-5ADM-C reuse-CoveredEntity-baaExecutedAt + Q-5ADM-D signed-BAA-S3-upload-in-scope + Q-5ADM-E 8-finding-bundle + Q-5ADM-F BAA_REGISTER.md+HIPAA_POLICIES.md repo artifacts + Q-5ADM-G 4-sub-phase decomposition + Q-5ADM-H NOT-v2.0-carry-forward + Q-5ADM-I retroactive-transition-log-discipline + Q-5ADM-J sister-PR register-reconciliation pattern; P1.3.3a schema + migration sub-phase follows.
- **Status note:** 2026-05-22 P1.3.3c.SCOPE operator decisions locked per most-robust posture (2026-05-03 extend-timeline-not-scope + 2026-05-07 robust-over-consistent-with-existing); Q-5ADM-K Path B PUT verb HTTP idiom (PUT /api/coveredEntities/:id/baa-execution + PUT /api/hospitals/:id/baa-document + GET /api/hospitals/:id/baa-document; REST idiom aligning with F2 idempotent-skip discipline); Q-5ADM-L Path B defense-in-depth (requireRole route middleware + service-layer assertCanManage + assertTenantScope; sister Q-5ADM-B Path (c) Layer 3 philosophy); Q-5ADM-M Path A per-service-file test suite (coveredEntityBaaExecution.test.ts + baaDocumentService.test.ts + prismaBaaGuard.integration.test.ts; ~65-105 tests; sister-precedent PR #292 D10 48-test pattern); Q-5ADM-N Path B PR body extended 10-section (8 PR #292 sections + §17.1 architectural-precedent reuse documentation + filing rationale); Q-5ADM-O Default decomposition (AUDIT-092 NEW emitAudit CE-binding refactor + AUDIT-093 NEW HospitalNotFoundError addition + AUDIT-094 NEW KmsEncryptionContext extension + AUDIT-095 NEW BAANotExecutedError circular import refactor + cross-ref S3 orphan -> AUDIT-053 + cross-ref prisma.ts JSDoc -> IMPLEMENT-1 inline fix); Q-5ADM-P Path A prisma.ts JSDoc inline fix at IMPLEMENT-1; Q-5ADM-Q Path A finer-grained error-to-HTTP mapping (422 validation + 409 conflict + 404 not-found + 403 forbidden + 500 server-error + tenant-scope-violation NOT 404 to avoid resource-existence leak); Q-5ADM-R Path A multi-hospital fan-out per-cardinality test coverage (0-linked + 1-linked + N>=3-linked + transactional rollback verification); Q-5ADM-S Path A BUILD_STATE.md comprehensive narrative entry; Q-5ADM-T Path A 5 atomic sub-blocks per V.5-RECOVERY discipline (SCOPE + SCOPE.LOCK + IMPLEMENT-1 routes + IMPLEMENT-2 tests + IMPLEMENT-3 AUDIT+BUILD_STATE+Status-flips + IMPLEMENT-4 main PR commit+push+auto-merge); P1.3.3c.IMPLEMENT-1 routes authoring follows fresh-context kickoff per V.5-RECOVERY discipline.
- **Status note:** 2026-05-22 P1.3.3c.IMPLEMENT-3 transitioned OPEN to IN_PROGRESS per §18 register-literal lifecycle; 5 NEW AUDIT entries filed (AUDIT-092 emitAudit CE-binding refactor + AUDIT-093 HospitalNotFoundError candidate + AUDIT-094 KmsEncryptionContext 4-field shape extension + AUDIT-095 BAANotExecutedError circular import refactor + AUDIT-096 PR-merges-shipping-unmounted-routers silent capability gap per Q-5ADM-O AMENDMENT proceeded under most-robust posture given A.IMPLEMENT-3.4 surfaced no existing routing-mount-verification entry); 2 cross-references documented in BUILD_STATE.md narrative (S3 orphan -> AUDIT-053 + prisma.ts JSDoc inline-fixed at IMPLEMENT-1); BUILD_STATE.md comprehensive narrative entry per Q-5ADM-S Path A authored; 118 cumulative tests across 3 IMPLEMENT-2 test files (42 + 34 + 42 PASS at jest EXIT_CODE=0); IMPLEMENT-4 main PR commit + push + auto-merge --squash next sub-block to transition IN_PROGRESS to FIXED.
- **Status note:** 2026-05-25 PR #294 merged to main as commit 3cc3370a61be3de2162b76dbe8b92f6a847de64a (mergedAt 2026-05-23T01:18:53Z UTC); 5-ADM-09 P1.3.3c BAA execution gap remediation FIXED-on-main; 5 NEW AUDIT entries (AUDIT-092 through AUDIT-096) landed; 4 IMPLEMENT-1 src files + 3 IMPLEMENT-2 test files (118 tests / 118 PASS) + AUDIT_FINDINGS_REGISTER.md + BUILD_STATE.md merged; Q-5ADM-V Path (b) post-merge fresh-context FIXED transition pattern; sister-PR P1.3.4 reconciliation FIXED-to-RESOLVED next per Q-5ADM-J sister-precedent (PR #287 / PR #293 timing pattern); branch feat/phase-1-5-adm-09-baa-execution deleted on remote per deleteBranchOnMerge=true.
- **Status note:** 2026-05-25 RESOLVED-on-main per PR #295 chore-register Status-flip merge (commit d6106b6700ba8d053bcbe4c33744c8e868865d91, mergedAt 2026-05-26T00:49:51Z UTC); FIXED-to-RESOLVED reconciliation per Q-5ADM-J sister-precedent + Q-5ADM-V Path (b) post-merge fresh-context lifecycle; Q-5ADM-J sister-bundle closure complete (Phase 5 GATE 2 of 2); 5-ADM-09 HIGH P1 GATE fully closed; Phase 5 verdict converts CONDITIONAL PASS to PASS-pending-Phase-4-observability-cluster + AUDIT-001-P0-Tier-A; sister-PR P1.3.4 chore-register-resolved-transition for this transition itself.

### 5-PHY-01 - Facility access controls cross-reference documentation

- **CFR:** 45 CFR §164.310(a)(1)-(2)
- **Severity:** DOCUMENTATION-CROSSREF
- **Status:** RESOLVED
- **Description:** AWS shared-responsibility model covers datacenter physical access; cross-reference documentation gap
- **Code-surface:** None (compliance posture cross-reference layer)
- **Cross-references:** see 5-ADM-09 (AWS BAA PENDING); see `docs/BAA_REGISTER.md`
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` cross-referencing AWS SOC 2 + AWS BAA (~1h)
- **Status note:** 2026-05-21 transitioned OPEN to IN_PROGRESS at P1.3.2 scope-lock; bundled with 5-ADM-09 closure per Q-5ADM-J 8-finding sister-bundle (AWS BAA shared-responsibility facility access surface).
- **Status note:** 2026-05-22 P1.3.3c.SCOPE operator decisions locked per 5-ADM-09 primary catalyst (Q-5ADM-K Path B PUT verb HTTP idiom + Q-5ADM-L Path B defense-in-depth route+service authorization + Q-5ADM-M Path A per-service-file tests + Q-5ADM-N Path B extended PR body + Q-5ADM-O default 4 NEW AUDIT + 2 cross-references + Q-5ADM-P Path A JSDoc inline fix + Q-5ADM-Q Path A finer-grained error-to-HTTP mapping + Q-5ADM-R Path A multi-hospital per-cardinality tests + Q-5ADM-S Path A comprehensive BUILD_STATE narrative + Q-5ADM-T Path A 5 atomic sub-blocks); sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern (P1.3.4 scope).
- **Status note:** 2026-05-22 P1.3.3c.IMPLEMENT-3 transitioned OPEN to IN_PROGRESS per §18 register-literal lifecycle per 5-ADM-09 primary catalyst; sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern (P1.3.4 scope).
- **Status note:** 2026-05-25 FIXED-on-main per PR #294 merge (5-ADM-09 P1.3.3c primary catalyst, commit 3cc3370a61be3de2162b76dbe8b92f6a847de64a, mergedAt 2026-05-23T01:18:53Z UTC); sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern next work block (P1.3.4 scope).
- **Status note:** 2026-05-25 RESOLVED-on-main per PR #295 sister-bundle Status-flip merge (5-ADM-09 P1.3.3c primary catalyst, commit 3cc3370a61be3de2162b76dbe8b92f6a847de64a, mergedAt 2026-05-23T01:18:53Z UTC); Q-5ADM-J sister-bundle closure complete.

### 5-PHY-02 - Workstation use policy

- **CFR:** 45 CFR §164.310(b)
- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** No documented workstation use policy
- **Code-surface:** None (policy-layer)
- **Cross-references:** see 5-ADM-03, 5-ADM-05
- **Remediation:** Author `docs/HIPAA_WORKSTATION_POLICY.md` (~1-2h); v2.0 carry-forward

### 5-PHY-03 - Workstation security hardening policy

- **CFR:** 45 CFR §164.310(c)
- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** No documented workstation hardening policy (FDE / screen-lock / removable-media)
- **Code-surface:** None (policy-layer)
- **Cross-references:** see 5-PHY-02
- **Remediation:** Bundle with 5-PHY-02

### 5-PHY-04 - Device and media controls policy

- **CFR:** 45 CFR §164.310(d)(1)-(2)
- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** Aurora backup posture covered by AUDIT-078; device-disposal policy + secure-deletion verification procedure not documented
- **Code-surface:** `docs/runbooks/AUDIT_078_AURORA_BACKUP_RESTORE_RUNBOOK.md`
- **Cross-references:** see AUDIT-078, AUDIT-082; see 5-ADM-07
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` (~1-2h)

### 5-TEC-01 - Access control documentation + emergency access procedure

- **CFR:** 45 CFR §164.312(a)(1)
- **Severity:** LOW (P3)
- **Status:** OPEN
- **Description:** Strong technical controls via AUDIT-009/011/071; gaps are emergency-access procedure documentation + automatic-logoff configuration in policy doc
- **Code-surface:** `backend/src/middleware/auth.ts`; `backend/src/lib/prismaTenantGuard.ts`; `backend/src/middleware/cdsHooksAuth.ts`
- **Cross-references:** see AUDIT-009, AUDIT-010, AUDIT-011, AUDIT-071
- **Remediation:** Document emergency-access procedure + automatic-logoff config bundled with 4-RNB-02 + 5-ADM-04 (~2-3h bundled)

### 5-TEC-02 - Encryption-at-rest CROSSREF

- **CFR:** 45 CFR §164.312(a)(2)(iv)
- **Severity:** CROSSREF
- **Status:** OPEN - tracked via AUDIT-085 (other findings RESOLVED)
- **Description:** AUDIT-016 + AUDIT-022 + AUDIT-075 + AUDIT-084 RESOLVED; AUDIT-085 OPEN-tracked
- **Code-surface:** `backend/src/middleware/phiEncryption.ts`; `backend/src/services/keyRotation.ts`; `backend/src/services/kmsService.ts`
- **Cross-references:** see AUDIT-016, AUDIT-022, AUDIT-075, AUDIT-084 (RESOLVED); see AUDIT-085 (OPEN)
- **Remediation:** AUDIT-085 progresses through its own remediation arc; no new Phase 5 action

### 5-TEC-03 - Audit controls CROSSREF

- **CFR:** 45 CFR §164.312(b)
- **Severity:** CROSSREF
- **Status:** OPEN - tracked via AUDIT-076
- **Description:** AUDIT-013 RESOLVED dual-transport; AUDIT-076 OPEN-tracked (HIPAA_GRADE_ACTIONS narrow set); AUDIT-086 RESOLVED
- **Code-surface:** `backend/src/middleware/auditLogger.ts`; `backend/src/utils/logger.ts`
- **Cross-references:** see AUDIT-013, AUDIT-076, AUDIT-086; see 4-ALR-01, 4-ALR-02, 4-APM-01 (Phase 4 logs-only-observability sister cluster per §17.1 entry 21)
- **Remediation:** AUDIT-076 progresses through its own remediation arc

### 5-TEC-04 - Integrity controls documentation

- **CFR:** 45 CFR §164.312(c)(1)-(2)
- **Severity:** LOW-DOCUMENTATION
- **Status:** OPEN
- **Description:** Strong technical controls via AUDIT-015 + AUDIT-016 V2 envelope AEAD; gap is policy + cadence documentation
- **Code-surface:** `backend/src/middleware/phiEncryption.ts`; `backend/src/services/keyRotation.ts`
- **Cross-references:** see AUDIT-015, AUDIT-016; see 5-TEC-02
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` (~1-2h)

### 5-TEC-05 - Person-or-entity authentication CROSSREF

- **CFR:** 45 CFR §164.312(d)
- **Severity:** LOW (P3) CROSSREF
- **Status:** OPEN - CROSSREF AUDIT-009
- **Description:** AUDIT-009 MFA opt-in DEPLOYED flag-off; AUDIT-012 RESOLVED
- **Code-surface:** `backend/src/middleware/auth.ts`
- **Cross-references:** see AUDIT-009, AUDIT-012
- **Remediation:** Document MFA flag-on timeline bundled with 5-ADM-04 + 5-TEC-01

### 5-TEC-06 - Transmission security IaC codification gap

- **CFR:** 45 CFR §164.312(e)(1)-(2)
- **Severity:** **MEDIUM (P2)** (downgraded from B5.3 HIGH P1 escalation candidate per B5.4.1 evidence)
- **Status:** OPEN
- **Description:** Strong TLS at staging (`tailrd-staging.yml:578` ELBSecurityPolicy-TLS13-1-2-2021-06) + strong HSTS at app layer (`server.ts:129-133` 1-year maxAge + preload); gap is production IaC codification (sister to AUDIT-082 + 4-APM-02)
- **Code-surface:** `backend/src/server.ts:120-134`; `infrastructure/cloudformation/tailrd-staging.yml:576-579`; `infrastructure/lambdas/dmsRollback/index.js:142,176` (weak posture cross-ref)
- **Severity rationale:** Per `decision_frameworks` classify Tier 1 + downgrade with evidence; runtime posture strong; gap is IaC codification completeness + Lambda hygiene
- **Cross-references:** see AUDIT-082, AUDIT-078; see 4-APM-02, 4-3PL-03
- **Remediation:** (1) Codify production ALB SslPolicy in CFN (~2-4h; bundle with AUDIT-XXX-future-aurora-cfn-import); (2) DMS rollback Lambda hygiene (~1-2h or bundled with AUDIT-082); (3) Operator-side TLS posture verification via openssl (~15min)

### 5-ORG-01 - BA contract terms audit

- **CFR:** 45 CFR §164.314(a)(1)-(2)
- **Severity:** MEDIUM (P2)
- **Status:** RESOLVED
- **Description:** Sister to 5-ADM-09 at BA contract terms layer; no audit of actual BAA contract terms against §164.314(a)(2) required provisions checklist
- **Code-surface:** `docs/BAA_REGISTER.md`; `docs/BAA_REQUIREMENTS.md`
- **Cross-references:** see 5-ADM-09; see 5-PRV-03, 5-PRV-04
- **Remediation:** Append BAA contract-terms checklist to `docs/BAA_REQUIREMENTS.md` (~3-4h)
- **Status note:** 2026-05-21 transitioned OPEN to IN_PROGRESS at P1.3.2 scope-lock; bundled with 5-ADM-09 closure per Q-5ADM-J 8-finding sister-bundle (BA contract-terms layer; §164.314(a) sister).
- **Status note:** 2026-05-22 P1.3.3c.SCOPE operator decisions locked per 5-ADM-09 primary catalyst (Q-5ADM-K Path B PUT verb HTTP idiom + Q-5ADM-L Path B defense-in-depth route+service authorization + Q-5ADM-M Path A per-service-file tests + Q-5ADM-N Path B extended PR body + Q-5ADM-O default 4 NEW AUDIT + 2 cross-references + Q-5ADM-P Path A JSDoc inline fix + Q-5ADM-Q Path A finer-grained error-to-HTTP mapping + Q-5ADM-R Path A multi-hospital per-cardinality tests + Q-5ADM-S Path A comprehensive BUILD_STATE narrative + Q-5ADM-T Path A 5 atomic sub-blocks); sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern (P1.3.4 scope).
- **Status note:** 2026-05-22 P1.3.3c.IMPLEMENT-3 transitioned OPEN to IN_PROGRESS per §18 register-literal lifecycle per 5-ADM-09 primary catalyst; sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern (P1.3.4 scope).
- **Status note:** 2026-05-25 FIXED-on-main per PR #294 merge (5-ADM-09 P1.3.3c primary catalyst, commit 3cc3370a61be3de2162b76dbe8b92f6a847de64a, mergedAt 2026-05-23T01:18:53Z UTC); sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern next work block (P1.3.4 scope).
- **Status note:** 2026-05-25 RESOLVED-on-main per PR #295 sister-bundle Status-flip merge (5-ADM-09 P1.3.3c primary catalyst, commit 3cc3370a61be3de2162b76dbe8b92f6a847de64a, mergedAt 2026-05-23T01:18:53Z UTC); Q-5ADM-J sister-bundle closure complete.

### 5-ORG-02 - Group health plan requirements

- **CFR:** 45 CFR §164.314(b)
- **Severity:** N/A
- **Status:** N/A
- **Description:** TAILRD is a CDS BA; not a group health plan; provision categorically inapplicable
- **Remediation:** None required; out-of-scope per §2.4

### 5-PNP-01 - HIPAA policies and procedures consolidation

- **CFR:** 45 CFR §164.316(a)
- **Severity:** MEDIUM-DOCUMENTATION
- **Status:** OPEN
- **Description:** Substantial operational documentation exists (`docs/runbooks/`, `CLAUDE.md`, `BAA_REQUIREMENTS.md`) but no consolidated HIPAA-specific P&P document set
- **Code-surface:** `docs/runbooks/`; `CLAUDE.md`
- **Cross-references:** see all 5-ADM findings; see 5-CLS-01, 5-CLS-02
- **Remediation:** Author `docs/HIPAA_POLICIES.md` consolidating Phase 5 documentation deliverables (~8-12h)

### 5-PNP-02 - Documentation retention policy

- **CFR:** 45 CFR §164.316(b)(1)-(2)
- **Severity:** LOW-DOCUMENTATION
- **Status:** OPEN
- **Description:** No documented 6-year retention policy for HIPAA P&P documentation
- **Code-surface:** None (policy-layer)
- **Cross-references:** see 5-PNP-01; see 5-PHY-04
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` (~30min bundled)

### 5-BRC-01 - Breach + unsecured PHI definitions documentation

- **CFR:** 45 CFR §164.400-401
- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** Definitions consolidation; AUDIT-016 V2 envelope AES-256-GCM satisfies §164.402 unsecured-PHI safe-harbor
- **Code-surface:** None (definitions-layer)
- **Cross-references:** see AUDIT-016; see 5-BRC-02
- **Remediation:** Definitions section in `docs/runbooks/INCIDENT_PHI_BREACH.md` (~1h bundled)

### 5-BRC-02 - 4-factor risk assessment framework documentation

- **CFR:** 45 CFR §164.402
- **Severity:** MEDIUM-DOCUMENTATION
- **Status:** RESOLVED
- **Description:** 4-factor risk assessment framework not codified; `breachNotification.ts` schema lacks structured 4-factor fields
- **Code-surface:** `backend/src/routes/breachNotification.ts:25-37`
- **Cross-references:** see 5-BRC-06, 5-OMN-03
- **Remediation:** Schema extension + workflow documentation bundled with 5-BRC-06 (~2-4h)
- **Status note:** 2026-05-20 transitioned OPEN to IN_PROGRESS at P1.3.2 scope-lock; bundled with 5-BRC-06 PR per PHASE_5_REPORT.md §4.7 co-remediation framing + P1.3.2 operator Q-5BRC-J lock; transitioned IN_PROGRESS to FIXED 2026-05-20 at 5-BRC-06 P1.3.4 PR commit (D1-D12 bundle complete: schema migration P1.3.3a adds fourFactorRiskAssessment + fourFactorRiskCompletedAt + fourFactorRiskCompletedBy on BreachIncident; POST /:id/four-factor-risk-assessment route handler shipped at breachNotification.ts:613-638; D10 test coverage at breachCeNotification.test.ts sister-bundle suite). RESOLVED transition pending PR merge confirmation per P1.3.3c.RESUME.13 sister-PR scope; transitioned FIXED to RESOLVED 2026-05-21 at PR #292 merge SHA 5844f07 per Option A sister-PR register-reconciliation pattern (P1.3.3c.RESUME.13 surface; sister AUDIT-075 + AUDIT-018 + AUDIT-019 precedent); 6-finding sister-bundle lifecycle complete per Q-5BRC-J scope-lock.

### 5-BRC-03 - Individual notification BA-cooperation workflow

- **CFR:** 45 CFR §164.404
- **Severity:** MEDIUM (P2)
- **Status:** RESOLVED
- **Description:** `breachNotification.ts:42` includes `INDIVIDUALS_NOTIFIED` status but no BAA-delegation determination (CE vs BA-delegated)
- **Code-surface:** `backend/src/routes/breachNotification.ts:42`
- **Cross-references:** see 5-BRC-06, 5-ORG-01
- **Remediation:** Schema field + runbook section bundled with 5-BRC-06 (~1-2h)
- **Status note:** 2026-05-20 transitioned OPEN to IN_PROGRESS at P1.3.2 scope-lock; bundled with 5-BRC-06 PR per PHASE_5_REPORT.md §4.7 co-remediation framing + P1.3.2 operator Q-5BRC-J lock; transitioned IN_PROGRESS to FIXED 2026-05-20 at 5-BRC-06 P1.3.4 PR commit (P1.3.3a schema migration adds baActsAsAgent Boolean + baActsAsAgentRationale String on BreachIncident per §164.402 agency-determination; POST /:id/ba-acts-as-agent route handler shipped at breachNotification.ts:640-664; template `agentLine` renders per-determination notification language at breach-ce-notification.ts:141-143; D10 test coverage). RESOLVED transition pending PR merge confirmation per P1.3.3c.RESUME.13 sister-PR scope; transitioned FIXED to RESOLVED 2026-05-21 at PR #292 merge SHA 5844f07 per Option A sister-PR register-reconciliation pattern (P1.3.3c.RESUME.13 surface; sister AUDIT-075 + AUDIT-018 + AUDIT-019 precedent); 6-finding sister-bundle lifecycle complete per Q-5BRC-J scope-lock.

### 5-BRC-04 - Media notification BA-cooperation procedure

- **CFR:** 45 CFR §164.406
- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** `breachNotification.ts:107` calculates 500+ trigger; BA-CE-delegation procedure not documented
- **Code-surface:** `backend/src/routes/breachNotification.ts:107`
- **Cross-references:** see 5-BRC-03
- **Remediation:** Runbook section (~30min bundled)

### 5-BRC-05 - HHS Secretary notification BA-cooperation workflow

- **CFR:** 45 CFR §164.408
- **Severity:** MEDIUM-DOCUMENTATION
- **Status:** RESOLVED
- **Description:** `breachNotification.ts:74-76` calculates 60-day HHS deadline; sister gap to 5-BRC-06 (workflow positions TAILRD as CE-to-HHS direct)
- **Code-surface:** `backend/src/routes/breachNotification.ts:74-76`
- **Cross-references:** see 5-BRC-06
- **Remediation:** Bundled with 5-BRC-06 schema rework
- **Status note:** 2026-05-20 transitioned OPEN to IN_PROGRESS at P1.3.2 scope-lock; bundled with 5-BRC-06 PR per PHASE_5_REPORT.md §4.7 co-remediation framing + P1.3.2 operator Q-5BRC-J lock; transitioned IN_PROGRESS to FIXED 2026-05-20 at 5-BRC-06 P1.3.4 PR commit (BA-to-CE workflow now provides the cooperation path: BA notifies CE per §164.410 within 60 days; CE then bears §164.408 HHS notification responsibility; baActsAsAgent determination at §164.402 resolves clock-start ambiguity; cross-referenced in breach-ce-notification template §164.410 Agency Determination section). RESOLVED transition pending PR merge confirmation per P1.3.3c.RESUME.13 sister-PR scope; transitioned FIXED to RESOLVED 2026-05-21 at PR #292 merge SHA 5844f07 per Option A sister-PR register-reconciliation pattern (P1.3.3c.RESUME.13 surface; sister AUDIT-075 + AUDIT-018 + AUDIT-019 precedent); 6-finding sister-bundle lifecycle complete per Q-5BRC-J scope-lock.

### 5-BRC-06 - BA-to-CE notification workflow gap (§164.410)

- **CFR:** 45 CFR §164.410 (TAILRD primary obligation as BA)
- **Severity:** **HIGH (P1) GATE**
- **Status:** RESOLVED - PHASE 5 GATE
- **Description:** `breachNotification.ts:1-348` implements CE-to-HHS direct workflow; MISSING §164.410 BA-primary-obligation path: no `ceNotifiedAt` field, no `CE_NOTIFIED` status, no CE-side endpoint, no BA-as-agent determination per §164.402
- **Code-surface:** `backend/src/routes/breachNotification.ts:1-348`
- **Severity rationale:** BA-primary obligation MISSING in implementation; severe CMP exposure per Omnibus 2013 tiered structure ($50K min - $1.5M cap per §160.404 willful-neglect tier); severity floor preserved per B5.4.1 evidence
- **Cross-references:** see AUDIT-076; see 4-RNB-02; see AUDIT-013; see 5-BRC-02, 5-OMN-03, 5-ADM-06; see AUDIT-088 (FK absence sister); see AUDIT-089 (dual-export hygiene sister); see AUDIT-090 (PDF-signing absence sister); see AUDIT-091 (prisma generate Docker discipline sister)
- **Remediation:** (1) Schema extension (add `ceNotifiedAt`, `CE_NOTIFIED` status, `baActsAsAgent` flag); (2) Timeline calculation rework; (3) CE-receive endpoint; (4) §164.410(c) content audit; (5) `HIPAA_GRADE_ACTIONS` promotion. Estimated ~12-20h implementation + ~4-8h CE-side workflow design with BSW + Mount Sinai
- **Status note:** 2026-05-20 transitioned OPEN to IN_PROGRESS at P1.3.2 scope-lock; bundled with 5-BRC-06 PR per PHASE_5_REPORT.md §4.7 co-remediation framing + P1.3.2 operator Q-5BRC-J lock; transitioned IN_PROGRESS to FIXED 2026-05-20 at 5-BRC-06 P1.3.4 PR commit. D1-D12 bundle shipped: (D1) P1.3.3a CoveredEntity model + BreachIncident sister-bundle field extensions + 7 new BreachStatus enum values (CE_NOTIFICATION_QUEUED + CE_NOTIFICATION_SENT + CE_NOTIFICATION_DELIVERED + CE_ACKNOWLEDGED + CE_FOLLOWUP_REQUESTED + CE_FOLLOWUP_RESPONDED + CE_CLOSED) + 6 HIPAA_GRADE_ACTIONS promotions (BREACH_CE_QUEUED + BREACH_CE_NOTIFIED + BREACH_CE_DELIVERED + BREACH_CE_ACKNOWLEDGED + BREACH_CE_FOLLOWUP_REQUESTED + BREACH_CE_FOLLOWUP_RESPONDED + BREACH_CE_CLOSED); (D2) P1.3.3b coveredEntityService.ts (7 CRUD functions + 4 structured error classes + tenant-isolation at service layer); (D3) P1.3.3b breachCeNotificationService.ts (7 state-transition methods + VALID_STATE_TRANSITIONS map + NotificationChannel discriminated union + projectBreachToTemplateInput + dispatchChannel + 4 structured error classes); (D4) P1.3.3b auditLogger.ts auditLogger promotion (Winston named export); (D5) P1.3.3c coveredEntity.ts routes (7 CRUD endpoints + Zod validation + extractActor + mapErrorToResponse + writeAuditLog dual-emission per Q-5BRC-F); (D6) P1.3.3c breachNotification.ts 7 BA-to-CE workflow handlers + 3 sister-bundle handlers (4-factor-risk-assessment + ba-acts-as-agent + law-enforcement-delay); (D7) P1.3.3b breach-ce-notification.ts template (§164.404(c)(1)(A)-(F) required content + §164.410 agency determination + §164.414(b) acknowledgment request); (D9) coveredEntity.test.ts (48 tests PASS); (D10) breachCeNotification.test.ts (48 tests PASS); (D11) 4 NEW AUDIT entries AUDIT-088 + AUDIT-089 + AUDIT-090 + AUDIT-091 filed; (D12) docs/PHASE_5_5BRC_BUNDLE_REMEDIATION_NOTES.md authored. RESOLVED transition pending PR merge confirmation per P1.3.3c.RESUME.13 sister-PR scope; transitioned FIXED to RESOLVED 2026-05-21 at PR #292 merge SHA 5844f07 per Option A sister-PR register-reconciliation pattern (P1.3.3c.RESUME.13 surface; sister AUDIT-075 + AUDIT-018 + AUDIT-019 precedent); 6-finding sister-bundle lifecycle complete per Q-5BRC-J scope-lock.

### 5-BRC-07 - Law enforcement delay procedure

- **CFR:** 45 CFR §164.412
- **Severity:** DOCUMENTATION
- **Status:** RESOLVED
- **Description:** No documented law-enforcement-delay procedure
- **Code-surface:** `backend/src/routes/breachNotification.ts:666-691`
- **Cross-references:** see 5-BRC-06, 5-ADM-06
- **Remediation:** Runbook section (~30min bundled)
- **Status note:** 2026-05-20 transitioned OPEN to IN_PROGRESS at P1.3.2 scope-lock; bundled with 5-BRC-06 PR per PHASE_5_REPORT.md §4.7 co-remediation framing + P1.3.2 operator Q-5BRC-J lock; transitioned IN_PROGRESS to FIXED 2026-05-20 at 5-BRC-06 P1.3.4 PR commit (P1.3.3a schema migration adds lawEnforcementDelayActive Boolean + lawEnforcementDelayUntil DateTime? + lawEnforcementDelayRationale String? on BreachIncident per §164.412; POST /:id/law-enforcement-delay route handler shipped at breachNotification.ts:666-691; D10 test coverage including 4-active/inactive cycle + tenant-isolation; runbook documentation pattern codified inline via route-handler audit-log message). RESOLVED transition pending PR merge confirmation per P1.3.3c.RESUME.13 sister-PR scope; transitioned FIXED to RESOLVED 2026-05-21 at PR #292 merge SHA 5844f07 per Option A sister-PR register-reconciliation pattern (P1.3.3c.RESUME.13 surface; sister AUDIT-075 + AUDIT-018 + AUDIT-019 precedent); 6-finding sister-bundle lifecycle complete per Q-5BRC-J scope-lock.

### 5-BRC-08 - Burden of proof + 4-factor retention documentation

- **CFR:** 45 CFR §164.414(a)-(b)
- **Severity:** MEDIUM-DOCUMENTATION
- **Status:** RESOLVED
- **Description:** Burden-of-proof retention policy not codified; structured 4-factor fields missing from schema (sister 5-BRC-02)
- **Code-surface:** `backend/src/routes/breachNotification.ts:39-55`
- **Cross-references:** see 5-BRC-02, 5-BRC-06; see AUDIT-013
- **Remediation:** Bundled with 5-BRC-02 + 5-BRC-06 schema rework + 5-PNP-02 retention policy
- **Status note:** 2026-05-20 transitioned OPEN to IN_PROGRESS at P1.3.2 scope-lock; bundled with 5-BRC-06 PR per PHASE_5_REPORT.md §4.7 co-remediation framing + P1.3.2 operator Q-5BRC-J lock; transitioned IN_PROGRESS to FIXED 2026-05-20 at 5-BRC-06 P1.3.4 PR commit (P1.3.3a schema migration adds burdenOfProofRetentionUntil DateTime? on BreachIncident; recordCeAcknowledgment service method auto-computes 6-year retention window from discoveredAt per §164.414(b) burden-of-proof timeline anchor; 4-factor structured fields shared with 5-BRC-02 sister via P1.3.3a fourFactorRiskAssessment + fourFactorRiskCompletedAt + fourFactorRiskCompletedBy migration; D10 test coverage verifies retention math + audit-event payload). RESOLVED transition pending PR merge confirmation per P1.3.3c.RESUME.13 sister-PR scope; transitioned FIXED to RESOLVED 2026-05-21 at PR #292 merge SHA 5844f07 per Option A sister-PR register-reconciliation pattern (P1.3.3c.RESUME.13 surface; sister AUDIT-075 + AUDIT-018 + AUDIT-019 precedent); 6-finding sister-bundle lifecycle complete per Q-5BRC-J scope-lock.

### 5-PRV-01 - BA permitted uses + disclosures documentation

- **CFR:** 45 CFR §164.502(a)(3)-(5)
- **Severity:** DOCUMENTATION
- **Status:** RESOLVED - conditional on 5-ADM-09 closure
- **Description:** BA-permitted-use scope not formally documented; conditional on BAA execution
- **Code-surface:** None (BAA terms layer)
- **Cross-references:** see 5-ADM-09, 5-PRV-03, 5-PRV-04
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` (~1h bundled)
- **Status note:** 2026-05-21 transitioned OPEN to IN_PROGRESS at P1.3.2 scope-lock; bundled with 5-ADM-09 closure per Q-5ADM-J 8-finding sister-bundle (BA permitted uses + disclosures documentation surface; conditional on 5-ADM-09 closure).
- **Status note:** 2026-05-22 P1.3.3c.SCOPE operator decisions locked per 5-ADM-09 primary catalyst (Q-5ADM-K Path B PUT verb HTTP idiom + Q-5ADM-L Path B defense-in-depth route+service authorization + Q-5ADM-M Path A per-service-file tests + Q-5ADM-N Path B extended PR body + Q-5ADM-O default 4 NEW AUDIT + 2 cross-references + Q-5ADM-P Path A JSDoc inline fix + Q-5ADM-Q Path A finer-grained error-to-HTTP mapping + Q-5ADM-R Path A multi-hospital per-cardinality tests + Q-5ADM-S Path A comprehensive BUILD_STATE narrative + Q-5ADM-T Path A 5 atomic sub-blocks); sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern (P1.3.4 scope).
- **Status note:** 2026-05-22 P1.3.3c.IMPLEMENT-3 transitioned OPEN to IN_PROGRESS per §18 register-literal lifecycle per 5-ADM-09 primary catalyst; sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern (P1.3.4 scope).
- **Status note:** 2026-05-25 FIXED-on-main per PR #294 merge (5-ADM-09 P1.3.3c primary catalyst, commit 3cc3370a61be3de2162b76dbe8b92f6a847de64a, mergedAt 2026-05-23T01:18:53Z UTC); sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern next work block (P1.3.4 scope).
- **Status note:** 2026-05-25 RESOLVED-on-main per PR #295 sister-bundle Status-flip merge (5-ADM-09 P1.3.3c primary catalyst, commit 3cc3370a61be3de2162b76dbe8b92f6a847de64a, mergedAt 2026-05-23T01:18:53Z UTC); Q-5ADM-J sister-bundle closure complete.

### 5-PRV-02 - Minimum necessary treatment-exception documentation

- **CFR:** 45 CFR §164.502(b)
- **Severity:** LOW-DOCUMENTATION
- **Status:** OPEN
- **Description:** Gap detection workflow returns full clinical context; complies with §164.502(b)(2)(i) treatment exception per §17.1 entry 20 dismissal-at-consumption framing
- **Code-surface:** `backend/src/ingestion/gaps/gapRuleEngine.ts`
- **Cross-references:** see §17.1 entry 20 (AUDIT_METHODOLOGY); see 4-OMP-01; see 5-PRV-01
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` (~1h)

### 5-PRV-03 - Disclosures to BAs (sub-BAs) documentation

- **CFR:** 45 CFR §164.502(e)(1)-(ii)
- **Severity:** DOCUMENTATION
- **Status:** RESOLVED - CROSSREF to 5-ADM-09
- **Description:** Sub-BA disclosure chain documentation gap; same execution-layer gap as 5-ADM-09 at documentation surface
- **Code-surface:** `docs/BAA_REGISTER.md`
- **Cross-references:** see 5-ADM-09, 5-PRV-04; see `docs/BAA_REGISTER.md`
- **Remediation:** Bundled with 5-ADM-09 closure
- **Status note:** 2026-05-21 transitioned OPEN to IN_PROGRESS at P1.3.2 scope-lock; bundled with 5-ADM-09 closure per Q-5ADM-J 8-finding sister-bundle (sub-BA disclosure documentation surface).
- **Status note:** 2026-05-22 P1.3.3c.SCOPE operator decisions locked per 5-ADM-09 primary catalyst (Q-5ADM-K Path B PUT verb HTTP idiom + Q-5ADM-L Path B defense-in-depth route+service authorization + Q-5ADM-M Path A per-service-file tests + Q-5ADM-N Path B extended PR body + Q-5ADM-O default 4 NEW AUDIT + 2 cross-references + Q-5ADM-P Path A JSDoc inline fix + Q-5ADM-Q Path A finer-grained error-to-HTTP mapping + Q-5ADM-R Path A multi-hospital per-cardinality tests + Q-5ADM-S Path A comprehensive BUILD_STATE narrative + Q-5ADM-T Path A 5 atomic sub-blocks); sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern (P1.3.4 scope).
- **Status note:** 2026-05-22 P1.3.3c.IMPLEMENT-3 transitioned OPEN to IN_PROGRESS per §18 register-literal lifecycle per 5-ADM-09 primary catalyst; sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern (P1.3.4 scope).
- **Status note:** 2026-05-25 FIXED-on-main per PR #294 merge (5-ADM-09 P1.3.3c primary catalyst, commit 3cc3370a61be3de2162b76dbe8b92f6a847de64a, mergedAt 2026-05-23T01:18:53Z UTC); sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern next work block (P1.3.4 scope).
- **Status note:** 2026-05-25 RESOLVED-on-main per PR #295 sister-bundle Status-flip merge (5-ADM-09 P1.3.3c primary catalyst, commit 3cc3370a61be3de2162b76dbe8b92f6a847de64a, mergedAt 2026-05-23T01:18:53Z UTC); Q-5ADM-J sister-bundle closure complete.

### 5-PRV-04 - BA contract terms CROSSREF

- **CFR:** 45 CFR §164.504(e)
- **Severity:** CROSSREF
- **Status:** RESOLVED - CROSSREF to 5-ORG-01
- **Description:** Sister surface at BA contract terms
- **Code-surface:** `docs/BAA_REQUIREMENTS.md`
- **Cross-references:** see 5-ORG-01, 5-ADM-09
- **Remediation:** Bundled with 5-ORG-01
- **Status note:** 2026-05-21 transitioned OPEN to IN_PROGRESS at P1.3.2 scope-lock; bundled with 5-ADM-09 closure per Q-5ADM-J 8-finding sister-bundle (BA contract terms downstream of 5-ORG-01).
- **Status note:** 2026-05-22 P1.3.3c.SCOPE operator decisions locked per 5-ADM-09 primary catalyst (Q-5ADM-K Path B PUT verb HTTP idiom + Q-5ADM-L Path B defense-in-depth route+service authorization + Q-5ADM-M Path A per-service-file tests + Q-5ADM-N Path B extended PR body + Q-5ADM-O default 4 NEW AUDIT + 2 cross-references + Q-5ADM-P Path A JSDoc inline fix + Q-5ADM-Q Path A finer-grained error-to-HTTP mapping + Q-5ADM-R Path A multi-hospital per-cardinality tests + Q-5ADM-S Path A comprehensive BUILD_STATE narrative + Q-5ADM-T Path A 5 atomic sub-blocks); sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern (P1.3.4 scope).
- **Status note:** 2026-05-22 P1.3.3c.IMPLEMENT-3 transitioned OPEN to IN_PROGRESS per §18 register-literal lifecycle per 5-ADM-09 primary catalyst; sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern (P1.3.4 scope).
- **Status note:** 2026-05-25 FIXED-on-main per PR #294 merge (5-ADM-09 P1.3.3c primary catalyst, commit 3cc3370a61be3de2162b76dbe8b92f6a847de64a, mergedAt 2026-05-23T01:18:53Z UTC); sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern next work block (P1.3.4 scope).
- **Status note:** 2026-05-25 RESOLVED-on-main per PR #295 sister-bundle Status-flip merge (5-ADM-09 P1.3.3c primary catalyst, commit 3cc3370a61be3de2162b76dbe8b92f6a847de64a, mergedAt 2026-05-23T01:18:53Z UTC); Q-5ADM-J sister-bundle closure complete.

### 5-PRV-05 - De-identification + limited data sets

- **CFR:** 45 CFR §164.514
- **Severity:** LOW-DOCUMENTATION
- **Status:** OPEN
- **Description:** Current workflow does not produce de-identified data sets; documentation gap forward-looking; cross-references AUDIT-020 fhir*Id-as-PHI sister surface
- **Code-surface:** `backend/src/redox/fhirResourceHandlers.ts`
- **Cross-references:** see AUDIT-020; see 5-PRV-01
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` documenting N/A status + trigger conditions (~30min)

### 5-PRV-06 - Right of access BA-cooperation documentation

- **CFR:** 45 CFR §164.524
- **Severity:** LOW-DOCUMENTATION
- **Status:** OPEN
- **Description:** `dataRequests.ts` PatientDataRequest workflow exists; BA-cooperation framing (BA-provides-PHI-to-CE-which-provides-to-individual) not documented
- **Code-surface:** `backend/src/routes/dataRequests.ts`
- **Cross-references:** see 5-BRC-06 (sister CE-vs-BA workflow positioning); see 5-ORG-01
- **Remediation:** Documentation + route header docstring (~1h)

### 5-PRV-07 - Right of amendment BA-cooperation

- **CFR:** 45 CFR §164.526
- **Severity:** DOCUMENTATION
- **Status:** OPEN - v2.0 carry-forward
- **Description:** No PHI-amendment workflow surface; forward-looking gap
- **Code-surface:** None
- **Cross-references:** see 5-PRV-06, 5-ORG-01
- **Remediation:** Documentation now (~30min); implementation deferred to v2.0

### 5-PRV-08 - Accounting of disclosures endpoint implementation

- **CFR:** 45 CFR §164.528
- **Severity:** LOW (P3)
- **Status:** OPEN
- **Description:** AuditLog data exists; accounting-report generation workflow not implemented
- **Code-surface:** `backend/src/middleware/auditLogger.ts`; `backend/prisma/schema.prisma` AuditLog model
- **Cross-references:** see AUDIT-013, AUDIT-076; see 5-TEC-03
- **Remediation:** Implement `/api/dataRequests/:id/accounting` endpoint (~4-6h)

### 5-PRV-09 - Safeguards CROSSREF (BA-applicable per Omnibus)

- **CFR:** 45 CFR §164.530(c)(1)
- **Severity:** CROSSREF
- **Status:** OPEN - CROSSREF to 5-TEC + 5-PHY + 5-ADM
- **Description:** Sister cross-reference to entire Security Rule
- **Code-surface:** (cross-ref domains)
- **Cross-references:** see all 5-ADM / 5-PHY / 5-TEC findings
- **Remediation:** Closure of 5-ADM / 5-PHY / 5-TEC domains closes 5-PRV-09

### 5-ENF-01 - Enforcement Rule general provisions documentation

- **CFR:** 45 CFR Part 160 Subpart A
- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** Enforcement Rule applicability documentation gap
- **Code-surface:** None (policy-layer)
- **Cross-references:** see 5-CLS-01, 5-OMN-04
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` (~30min bundled)

### 5-ENF-02 - State law preemption analysis

- **CFR:** 45 CFR Part 160 Subpart B
- **Severity:** DOCUMENTATION
- **Status:** OPEN - v2.0 carry-forward legal review
- **Description:** Texas (BSW) + New York (Mount Sinai) state PHI / data-breach laws preemption analysis required
- **Code-surface:** None (legal-review flag)
- **Cross-references:** see 5-BRC-06, 5-CLS-01
- **Remediation:** Engage legal counsel for preemption analysis (~4-8h legal + 1h documentation)

### 5-ENF-03 - OCR investigation cooperation procedure

- **CFR:** 45 CFR Part 160 Subpart C
- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** No documented OCR-investigation-cooperation procedure
- **Code-surface:** None (policy-layer)
- **Cross-references:** see 5-ADM-06, 5-PNP-02
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` (~1h bundled)

### 5-ENF-04 - CMP tier awareness documentation

- **CFR:** 45 CFR Part 160 Subpart D + §160.404
- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** CMP tier awareness + training-program inclusion gap
- **Code-surface:** None (policy-layer)
- **Cross-references:** see 5-ADM-05, 5-OMN-04
- **Remediation:** Section in `docs/HIPAA_TRAINING_PROGRAM.md` (~1h bundled)

### 5-ENF-05 - Procedures for hearings

- **CFR:** 45 CFR Part 160 Subpart E
- **Severity:** N/A
- **Status:** N/A
- **Description:** Procedural-regulatory; applicable only after enforcement action; not applicable at current pre-incident posture
- **Remediation:** None required; out-of-scope per §2.4

### 5-OMN-01 - Omnibus BA direct liability framework documentation

- **Modification:** Omnibus 2013 BA direct liability under Security + Breach + select Privacy
- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** Direct-liability framework not formally documented
- **Code-surface:** None
- **Cross-references:** see 5-CLS-01; see all Security Rule + 5-BRC findings; see 5-PRV
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` (~1h bundled)

### 5-OMN-02 - BA + sub-BA accountability chain CROSSREF

- **Modification:** Omnibus sub-BA flowdown requirements
- **Severity:** CROSSREF
- **Status:** RESOLVED - CROSSREF to 5-ADM-09
- **Description:** Sister at sub-BA accountability chain surface
- **Code-surface:** `docs/BAA_REGISTER.md`
- **Cross-references:** see 5-ADM-09, 5-PRV-03
- **Remediation:** Bundled with 5-ADM-09 closure
- **Status note:** 2026-05-21 transitioned OPEN to IN_PROGRESS at P1.3.2 scope-lock; bundled with 5-ADM-09 closure per Q-5ADM-J 8-finding sister-bundle (sub-BA accountability chain surface).
- **Status note:** 2026-05-22 P1.3.3c.SCOPE operator decisions locked per 5-ADM-09 primary catalyst (Q-5ADM-K Path B PUT verb HTTP idiom + Q-5ADM-L Path B defense-in-depth route+service authorization + Q-5ADM-M Path A per-service-file tests + Q-5ADM-N Path B extended PR body + Q-5ADM-O default 4 NEW AUDIT + 2 cross-references + Q-5ADM-P Path A JSDoc inline fix + Q-5ADM-Q Path A finer-grained error-to-HTTP mapping + Q-5ADM-R Path A multi-hospital per-cardinality tests + Q-5ADM-S Path A comprehensive BUILD_STATE narrative + Q-5ADM-T Path A 5 atomic sub-blocks); sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern (P1.3.4 scope).
- **Status note:** 2026-05-22 P1.3.3c.IMPLEMENT-3 transitioned OPEN to IN_PROGRESS per §18 register-literal lifecycle per 5-ADM-09 primary catalyst; sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern (P1.3.4 scope).
- **Status note:** 2026-05-25 FIXED-on-main per PR #294 merge (5-ADM-09 P1.3.3c primary catalyst, commit 3cc3370a61be3de2162b76dbe8b92f6a847de64a, mergedAt 2026-05-23T01:18:53Z UTC); sister-bundle closure tracking per Q-5ADM-J sister-PR FIXED-to-RESOLVED reconciliation pattern next work block (P1.3.4 scope).
- **Status note:** 2026-05-25 RESOLVED-on-main per PR #295 sister-bundle Status-flip merge (5-ADM-09 P1.3.3c primary catalyst, commit 3cc3370a61be3de2162b76dbe8b92f6a847de64a, mergedAt 2026-05-23T01:18:53Z UTC); Q-5ADM-J sister-bundle closure complete.

### 5-OMN-03 - 4-factor risk assessment framework CROSSREF

- **Modification:** Omnibus 4-factor framework replacing pre-2013 harm-threshold
- **Severity:** CROSSREF
- **Status:** OPEN - CROSSREF to 5-BRC-02
- **Description:** Sister at framework codification surface
- **Cross-references:** see 5-BRC-02, 5-BRC-06, 5-BRC-08
- **Remediation:** Bundled with 5-BRC schema rework

### 5-OMN-04 - Tiered CMP structure CROSSREF

- **Modification:** Omnibus 4-tier CMP structure
- **Severity:** CROSSREF
- **Status:** OPEN - CROSSREF to 5-ENF-04
- **Description:** Sister at CMP awareness layer
- **Cross-references:** see 5-ENF-04, 5-ADM-05
- **Remediation:** Bundled with 5-ENF-04 + 5-ADM-05

### 5-OMN-05 - Privacy Rule modifications inapplicability documentation

- **Modification:** Omnibus Privacy modifications (marketing / fundraising / research / decedent rights)
- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** Mostly N/A for CDS BA at current pilot scale; trigger conditions documentation
- **Code-surface:** None
- **Cross-references:** see 5-PRV-01, 5-CLS-01
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` documenting inapplicability + trigger conditions (~1h bundled)

---

## Phase 0A Phase 0C UI/UX Audit Findings (2026-05-20)

**Phase 0C of Phase 0A audit arc.** Companion report: `docs/audit/PHASE_0C_REPORT.md`. Verdict: **CONDITIONAL PASS** sister to Phase 1/2/3/4/5 precedent. Scope: canonical `PATH_TO_ROBUST.md` L73-L80 verbatim (Option B-CANONICAL per B0C.2 scope-lock; ~25-30h budget; audit + design system documentation framing).

**Severity totals (63 unique IDs across 16 domains):**

| Severity | Count |
|---|---|
| HIGH (P1) GATE | 8 |
| MEDIUM (P2) + MEDIUM-DOCUMENTATION | 16 |
| LOW (P3) + LOW-DOCUMENTATION | 13 |
| DOCUMENTATION (incl CROSSREF) | 22 |
| **Total** | **59** (4 additional IDs are CROSSREF-only meta-pointers to §5.1 + §5.2 substantive engineering signal sections; total unique-ID count 63) |

Severity column copied verbatim from PHASE_0C_REPORT.md §3 per §18 register-literal discipline. Citations follow §1 rule-body verification.

### 0C-CAT-01 - Route + page catalog

- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** Route catalog at `src/App.tsx` + `src/pages/`; no standalone documentation enumerating all routes + per-route persona-mapping
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.10 + per-finding prose
- **Cross-references:** see 0C-NAV-06; see 0C-MOD-01 through 06
- **Remediation:** Author `docs/architecture/ROUTES_CATALOG.md` (~3-5h); v2.0 design system codification arc per L117

### 0C-CAT-02 - Component catalog

- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** 365 .tsx files in `src/`; no standalone component catalog
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.10
- **Cross-references:** see 0C-CMP-01; see 0C-CMP-03
- **Remediation:** Author `docs/architecture/COMPONENT_CATALOG.md` (~10-15h) OR Storybook deployment per 0C-CMP-03 (~40-60h); v2.0 territory

### 0C-COL-01 - Design system token-conflict (see §5.1)

- **Severity:** MEDIUM (P2) DOCUMENTATION
- **Status:** OPEN; flagged for SEPARATE methodology PR per §17.3
- **Description:** Single-source-of-truth violation at `tokens.ts` + `semanticColors.ts` competing exports for `semantic` + `chartColors`
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §5.1 substantive engineering signal section
- **Cross-references:** see §5.1 detailed treatment; see §17.1 entry 15 canonical-purpose single-source-of-truth (PR #283 sister precedent); §17.1 candidate "design token strategy" PROMOTED via this finding
- **Remediation:** 7-step path documented at §5.1; ~6-10h consolidation + ~2-4h methodology PR codification; v2.0 Phase 2 design system codification per L117

### 0C-COL-02 - Color palette completeness

- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** 3x 11-stop palettes (Chrome Blue + Arterial / Carmona Red + Titanium Neutrals) documented at `tokens.ts:9-53`; palette depth comprehensive
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.11
- **Cross-references:** see 0C-COL-01; see §5.1
- **Remediation:** Document in `docs/architecture/DESIGN_SYSTEM_SPEC.md`; bundled with §5.1 consolidation

### 0C-COL-03 - Module identity colors

- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** 6 cardio modules with mid + glow + peak colors per `tokens.ts:100-107`; module identity color system mature
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.11
- **Cross-references:** see §5.2; see 0C-MOD-01 through 06
- **Remediation:** Document in `docs/architecture/DESIGN_SYSTEM_SPEC.md`; bundled

### 0C-COL-04 - Dark mode coverage

- **Severity:** LOW (P3) DOCUMENTATION
- **Status:** OPEN
- **Description:** Dark mode essentially unused (2 occurrences in `src/index.css:2` only); no ThemeProvider; no theme switching surface
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.11
- **Cross-references:** see §5.2; see 0C-A11Y-01
- **Remediation:** v2.0 architectural decision: implement OR document N/A; ~20-40h implementation OR ~30min N/A documentation

### 0C-COL-05 - Colorblind considerations

- **Severity:** LOW (P3) DOCUMENTATION
- **Status:** OPEN
- **Description:** Chart palette + status color verification under deuteranopia / protanopia / tritanopia simulations not documented
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.11
- **Cross-references:** see 0C-A11Y-01; see §5.1
- **Remediation:** Coblis / Stark simulator verification (~3-5h); v2.0 Phase 2 territory

### 0C-TYP-01 - 3-family typography stack

- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** Playfair Display (display) + DM Sans (body) + IBM Plex Mono (data) at `tokens.ts:165-180`; luxury-positioned font selection
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.12
- **Cross-references:** see §5.2 luxury-positioning sister; see 0C-TYP-02
- **Remediation:** Document in `docs/architecture/DESIGN_SYSTEM_SPEC.md`; bundled

### 0C-TYP-02 - Web font loading strategy

- **Severity:** LOW (P3) DOCUMENTATION
- **Status:** OPEN (already conformant per evidence)
- **Description:** Strong loading strategy: preconnect + display=swap deployed at `public/index.html:L26-L28`
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.12
- **Cross-references:** see 0C-TYP-01; see 0C-PERF-01 LCP
- **Remediation:** No action; document conformance; optional self-hosted-fonts for privacy

### 0C-TYP-03 - Clinical-density readability

- **Severity:** LOW (P3) DOCUMENTATION
- **Status:** OPEN
- **Description:** Line-height + measure + size hierarchy for dense clinical data not codified at spec layer
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.12
- **Cross-references:** see 0C-TYP-01; see 0C-A11Y-01 SC 1.4.12
- **Remediation:** Spec + per-view audit (~2-3h spec + ~variable); v2.0 Phase 2 territory

### 0C-SPC-01 - 8-tier spacing scale

- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** 8-tier scale at `tokens.ts:182-192` (4-8-16-24-32-48-64px); Tailwind-aligned
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.13
- **Cross-references:** see 0C-CMP-01; see Tailwind config
- **Remediation:** Document in `docs/architecture/DESIGN_SYSTEM_SPEC.md`; bundled

### 0C-SPC-02 - Grid system + container patterns

- **Severity:** LOW (P3) DOCUMENTATION
- **Status:** OPEN
- **Description:** Tailwind utility-class layer (grid-cols-N + container mx-auto); no design-system-codified Grid component
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.13
- **Cross-references:** see 0C-SPC-01; see 0C-CMP-02
- **Remediation:** Grid + Container primitives + per-view responsive audit (~6-10h); v2.0 Phase 2 territory

### 0C-CMP-01 - Current component library inventory

- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** 7 design-system components (AppShell + Badge + DotScale + LockedOverlay + SectionCard + Sidebar + TopBar) + 2 token files
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.5
- **Cross-references:** see 0C-CMP-02; see §5.1
- **Remediation:** Document inventory in `docs/architecture/DESIGN_SYSTEM_SPEC.md` (~1-2h bundled)

### 0C-CMP-02 - Component coverage gaps

- **Severity:** MEDIUM (P2) DOCUMENTATION
- **Status:** OPEN
- **Description:** Missing primitives (Button + Card + Modal + Form + Input + Select + Tabs + Toast + Tooltip + DataTable + Dialog + Combobox + Switch + Radio + Checkbox + Accordion + Breadcrumb + Skeleton + Spinner + Progress + Avatar + Divider)
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.5
- **Cross-references:** see 0C-CMP-01; see §17.1 candidate 1
- **Remediation:** v2.0 design system codification arc per L117 (~80-120h for primitives)

### 0C-CMP-03 - Storybook absence

- **Severity:** MEDIUM (P2) DOCUMENTATION
- **Status:** OPEN
- **Description:** No Storybook config; component documentation surface absent; sister 0C-TEST-04 visual regression
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.5
- **Cross-references:** see 0C-CMP-01; see 0C-TEST-04
- **Remediation:** v2.0 design system codification (~40-60h Storybook deployment)

### 0C-CMP-04 - Form handling pattern

- **Severity:** LOW-DOCUMENTATION
- **Status:** OPEN
- **Description:** No React Hook Form / Formik; 7 handleSubmit native form patterns; not codified
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.5
- **Cross-references:** see §17.1 candidate 6; see 0C-A11Y-05
- **Remediation:** v2.0 design system codification; React Hook Form selection (~6-10h selection + ~20-30h migration)

### 0C-CMP-05 - Library-vs-deployment pattern (framer-motion sparse)

- **Severity:** LOW-DOCUMENTATION
- **Status:** OPEN
- **Description:** framer-motion installed but 1-file deployment; library-vs-deployment mismatch; sister 0C-PAT-04
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.5
- **Cross-references:** see 0C-PAT-04; see §17.1 candidate 1
- **Remediation:** v2.0 architectural decision (expand / deprecate / document); ~2-4h decision

### 0C-PAT-01 - Glassmorphism canonical visual treatment (see §5.2)

- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** Module-color-tinted backdrop-filter blur classes per `tokens.ts:110-117`; 48 occurrences across 13 files; accessibility + performance discipline visible
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §5.2 substantive engineering signal section
- **Cross-references:** see §5.2 detailed treatment; see 0C-MOD-01 through 06
- **Remediation:** Document canonical pattern in `docs/architecture/DESIGN_SYSTEM_SPEC.md`; bundled

### 0C-PAT-02 - Gradient deployment characterization

- **Severity:** LOW (P3) DOCUMENTATION
- **Status:** OPEN
- **Description:** 80+ occurrences across 15 files; widespread deployment; canonical visual treatment sister
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.14
- **Cross-references:** see §5.2; see 0C-COL-01
- **Remediation:** Per-gradient palette-source audit + canonical gradient catalog (~3-5h); v2.0 design system codification

### 0C-PAT-03 - Shadow elevation system

- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** 8 tokens at `tokens.ts:151-163`; 93+ occurrences across 15 files; canonical pattern established
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.14
- **Cross-references:** see §5.2; see 0C-PAT-01
- **Remediation:** Document usage convention in `docs/architecture/DESIGN_SYSTEM_SPEC.md`; bundled

### 0C-PAT-04 - Motion-sparse-deployment

- **Severity:** LOW (P3) DOCUMENTATION
- **Status:** OPEN
- **Description:** framer-motion 1-file deployment; sister 0C-CMP-05 library-vs-deployment pattern
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.14
- **Cross-references:** see 0C-A11Y-07 (reduce-motion conformant); see 0C-CMP-05; see §17.1 candidate 1
- **Remediation:** v2.0 architectural decision; bundled with 0C-CMP-05

### 0C-PAT-05 - lucide-react canonical iconography

- **Severity:** LOW (P3) DOCUMENTATION
- **Status:** OPEN
- **Description:** 254 lucide-react imports across 250 files; WIDESPREAD canonical deployment (sister glassmorphism depth)
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.14
- **Cross-references:** see 0C-A11Y-06 SC 2.5.8; see 0C-CMP-02
- **Remediation:** IconButton primitive + size-discipline lint rule (~6-10h); v2.0 design system codification

### 0C-PAT-06 - Border radius system

- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** 6 tokens at `tokens.ts:194-203`; Tailwind-aligned; widespread utility-class deployment
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.14
- **Cross-references:** see 0C-SPC-01; see 0C-CMP-01
- **Remediation:** Document convention in `docs/architecture/DESIGN_SYSTEM_SPEC.md`; bundled

### 0C-A11Y-01 - WCAG 2.2 AA conformance unverified

- **Severity:** **HIGH (P1) GATE**
- **Status:** OPEN - PHASE 0C GATE
- **Description:** Repository-wide WCAG 2.2 Level AA conformance unverified; no axe-core / lighthouse-ci / pa11y config; 69 ARIA patterns across 15 files (4.1% file-level density); Section 508 + ADA enforcement risk
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.1 + §4.1
- **Cross-references:** see AUDIT-001 (sister foundational gap); see WCAG 2.2 SC list; see Section 508 Revised
- **Remediation:** axe-core + lighthouse-ci integration + baseline scan + per-SC remediation arc; ~4-6h baseline + ~40-80h remediation arc; v2.0 Phase 2 territory per L117

### 0C-A11Y-02 - WCAG 1.4.3 contrast minimum unverified

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** Color contrast ratios unverified against `tokens.ts` palette stops; semantic colors + chartColors WCAG 1.4.3 ratios not documented
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.1
- **Cross-references:** see 0C-A11Y-01; see 0C-COL-01
- **Remediation:** Contrast-ratio matrix + WCAG conformance tier annotation + stylelint rule (~3-5h)

### 0C-A11Y-03 - Keyboard navigation patterns ad-hoc

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** No documented tab-order convention or skip-link; 28 keyboard handlers across 14 files
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.1
- **Cross-references:** see 0C-A11Y-01; see 0C-NAV-01 / 0C-NAV-02
- **Remediation:** Tab-order audit + skip-to-content link + modal focus-trap verification (~4-6h)

### 0C-A11Y-04 - ARIA 1.2 widget pattern conformance unverified

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** 69 ARIA patterns across 15 files; per-widget pattern conformance (combobox / dialog / tab / tooltip / menu / treegrid) unverified
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.1
- **Cross-references:** see 0C-A11Y-01; see 0C-A11Y-03
- **Remediation:** Per-pattern inventory + eslint-plugin-jsx-a11y + remediation arc (~6-10h inventory + ~20-40h remediation); v2.0 Phase 2 territory

### 0C-A11Y-05 - Focus management on route transitions + modals + forms

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** React Router 6.20.0 does NOT auto-manage focus; route transition + modal + form focus-management unverified
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.1
- **Cross-references:** see 0C-A11Y-01; see 0C-A11Y-04
- **Remediation:** Route-transition focus-shift + modal focus-trap audit + focus-visible polyfill (~8-12h); v2.0 Phase 2 territory

### 0C-A11Y-06 - WCAG 2.2 SC 2.5.8 Target Size Minimum

- **Severity:** LOW (P3)
- **Status:** OPEN
- **Description:** 24x24 CSS pixels minimum unverified across button + link + icon-button surfaces
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.1
- **Cross-references:** see 0C-A11Y-01; see 0C-PAT-05 (lucide-react)
- **Remediation:** Tailwind config min-target-size utility + per-component audit (~4-6h audit + ~6-10h remediation)

### 0C-A11Y-07 - Reduce-motion respect

- **Severity:** DOCUMENTATION (already conformant)
- **Status:** RESOLVED (conformance verified)
- **Description:** CONFORMANT per `src/index.css:1130` + `src/hooks/usePerformanceOptimization.ts:73`
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.1
- **Cross-references:** see 0C-A11Y-01; see 0C-PAT-04 (motion sparse)
- **Remediation:** None required; document conformance in `docs/architecture/DESIGN_SYSTEM_SPEC.md`

### 0C-CLI-01 - ACC/AHA Class of Recommendation display

- **Severity:** **HIGH (P1) GATE; §16 TRIGGERED**
- **Status:** OPEN - PHASE 0C GATE
- **Description:** Class (I / IIa / IIb / III) display conventions unverified; asymmetric deployment (`DeviceUnderutilizationPanel.tsx:10` Class refs but `GDMTOptimizationTracker.tsx` + `TherapyGapDashboard.tsx` 0 refs); per CLAUDE.md §8 FDA CDS exemption
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.2 + §4.2
- **Cross-references:** see CLAUDE.md §8; see Phase 4 4-OMP-01 + §17.1 entry 20; see 0C-CLI-02
- **Remediation:** Audit Class-display consistency + RecommendationBadge component + §16 verification + non-directive language verification (~6-10h audit + ~4-6h codification); v2.0 Phase 2

### 0C-CLI-02 - ACC/AHA Level of Evidence display

- **Severity:** **HIGH (P1) GATE; §16 TRIGGERED**
- **Status:** OPEN - PHASE 0C GATE
- **Description:** LOE (A / B-R / B-NR / C-LD / C-EO) display conventions; sister 0C-CLI-01 pattern
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.2 + §4.2
- **Cross-references:** see 0C-CLI-01; see ACC/AHA Methodology document
- **Remediation:** Bundled with 0C-CLI-01 RecommendationBadge codification

### 0C-CLI-03 - Risk score rendering accuracy

- **Severity:** **HIGH (P1) GATE; §16 TRIGGERED**
- **Status:** OPEN - PHASE 0C GATE
- **Description:** 12 risk calculator UI components at `src/components/riskCalculators/` (CHA2DS2VASc / CRTICDEligibility / FRAMINGHAMHF / GRACEScore / HASBLED / INTERMACS / MAGGIC / ORBITBleeding / STSRisk / SYNTAXScore / WIFIClassification / WellsPE); §16 verification against published scoring algorithms required
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.2 + §4.2
- **Cross-references:** see Phase 0B per-module addenda; see AUDIT-METHODOLOGY §16
- **Remediation:** Per-calculator §16 verification arc (~1-1.5h per × 12 = ~12-18h); v2.0 Phase 2 territory

### 0C-CLI-04 - Drug interaction surfacing

- **Severity:** MEDIUM (P2); §16 TRIGGERED
- **Status:** OPEN
- **Description:** DDI UI rendering against `backend/src/services/ddiService.ts` unverified for Lexicomp / Micromedex / AHFS DI accuracy
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.2
- **Cross-references:** see 0C-CLI-03 sister verification pattern
- **Remediation:** Frontend grep + per-drug-pair §16 verification + annotation (~4-6h + ~2-4h); v2.0 Phase 2

### 0C-CLI-05 - Gap detection UI rendering (dismissal-at-consumption)

- **Severity:** MEDIUM (P2); §16 TRIGGERED
- **Status:** OPEN
- **Description:** Asymmetric Class/LOE rendering across `src/components/therapyGap/` 3 components; per Phase 4 §17.1 entry 20 dismissal-at-consumption framing
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.2
- **Cross-references:** see Phase 4 4-OMP-01 + §17.1 entry 20; see AUDIT-071 (RESOLVED)
- **Remediation:** Audit GDMTOptimizationTracker + TherapyGapDashboard parity + RecommendationBadge per 0C-CLI-01 (~6-10h); v2.0 Phase 2

### 0C-CLI-06 - Clinical alert banner

- **Severity:** MEDIUM (P2); §16 TRIGGERED
- **Status:** OPEN
- **Description:** `ClinicalAlertBanner.tsx` 4 ARIA patterns; severity rendering + non-directive language + CDS Hooks 2.0 Card spec compliance unverified
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.2
- **Cross-references:** see AUDIT-071; see CDS Hooks 2.0 spec §Cards; see CLAUDE.md §8 + §14
- **Remediation:** Severity audit + non-directive language audit + ARIA live-region verification (~4-6h); v2.0 Phase 2

### 0C-CLI-07 - Phenotype detection rendering

- **Severity:** MEDIUM (P2); §16 TRIGGERED
- **Status:** OPEN
- **Description:** Phenotype UI accuracy against `backend/src/services/phenotypeService.ts` definitions
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.2
- **Cross-references:** see backend phenotypeService; see Phase 0B addenda; see 0C-CLI-03
- **Remediation:** Per-phenotype UI-vs-backend accuracy audit + annotation + tests (~6-10h); v2.0 Phase 2

### 0C-CLI-08 - Clinical visualizations

- **Severity:** MEDIUM (P2); conditional §16
- **Status:** OPEN
- **Description:** recharts + react-leaflet rendering; accessibility (chart alternatives + labels + colorblind) + accuracy (data binding) audit
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.2
- **Cross-references:** see 0C-A11Y-04; see 0C-COL-05; see 0C-PERF-04
- **Remediation:** Per-visualization accessibility + accuracy audit (~6-10h); v2.0 Phase 2

### 0C-NAV-01 - Primary navigation (Sidebar)

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** `Sidebar.tsx` 2 aria-label/nav patterns; responsive collapse + active-route highlighting + per-module color-tinting deployment depth + accessibility TBD
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.6
- **Cross-references:** see 0C-NAV-02; see 0C-A11Y-01; see §5.2
- **Remediation:** Per-route accessibility audit + responsive-collapse keyboard accessibility (~3-5h); v2.0 Phase 2

### 0C-NAV-02 - Secondary navigation (TopBar)

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** `TopBar.tsx` 1 nav pattern + 8 UserMenu ARIA; menubutton + dropdown focus-trap + notifications-panel keyboard accessibility TBD
- **Source:** `docs/audit/PHASE_0C_REPORT.md` §3.6
- **Cross-references:** see 0C-NAV-01; see 0C-A11Y-04 (menubutton pattern)
- **Remediation:** Per-control accessibility audit + WAI-ARIA APG menubutton conformance (~3-5h); v2.0 Phase 2

### 0C-NAV-03 - Breadcrumb absence

- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** No dedicated Breadcrumb component; per-module breadcrumb navigation absent
- **Cross-references:** see 0C-CMP-02; see 0C-NAV-05
- **Remediation:** Breadcrumb primitive + WAI-ARIA APG conformance (~3-5h); v2.0 design system codification

### 0C-NAV-04 - Search surface (admin-only)

- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** `src/ui/admin/GodView/GlobalSearch.tsx` admin-scoped only; clinician personas lack patient-search / module-level search
- **Cross-references:** see 0C-NAV-05; see Phase 4 4-3PL-02
- **Remediation:** SearchInput primitive + per-persona search surface (~6-10h); v2.0 design system codification

### 0C-NAV-05 - User-flow audit

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** Canonical flows (login + MFA + module-entry + patient-detail + gap-detail + recommendation-action); per-flow click-depth + abandonment-risk + accessibility TBD
- **Cross-references:** see 0C-NAV-01 / 02; see 0C-MOD-01 through 06
- **Remediation:** Per-persona journey map + per-flow accessibility (~10-15h); v2.0 Phase 2

### 0C-NAV-06 - Information architecture

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** Per Phase 4 4-3PL-02 sister: admin / godView / internalOps share UI shell with patient-data routes
- **Cross-references:** see Phase 4 4-3PL-01 / 02 + §17.1 entry 17; see 0C-NAV-05
- **Remediation:** v2.0 architectural decision per Phase 4 §17.1 entry 17 trigger conditions; ~4-6h IA documentation

### 0C-MOD-01 - Heart Failure (HF)

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** `src/ui/heartFailure/` + `src/components/heartFailure/` (10 components; highest depth); Chrome Blue Dark / `glass-chrome-blue`; MAGGIC + FRAMINGHAM + GDMT + Phenotype clinical-UI
- **Cross-references:** see Phase 0B HF addendum; see 0C-CLI-03; see §5.2
- **Remediation:** Per-module maturity audit (~4-6h); v2.0 Phase 2

### 0C-MOD-02 - Electrophysiology (EP)

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** `src/ui/electrophysiology/` deep view + component structure; Chrome Blue Mid; CHA2DS2VASc + LAAC + Anticoagulation + Phenotype clinical-UI
- **Cross-references:** see Phase 0B EP addendum; see 0C-CLI-03; see 0C-CLI-04
- **Remediation:** Per-module maturity audit (~4-6h); v2.0 Phase 2

### 0C-MOD-03 - Structural Heart (SH)

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** `src/ui/structuralHeart/` views; Carmona Red / `glass-carmona-red`; STS + SYNTAX clinical-UI
- **Cross-references:** see Phase 0B SH addendum; see 0C-CLI-03; see §5.2
- **Remediation:** Per-module maturity audit (~4-6h); v2.0 Phase 2

### 0C-MOD-04 - Coronary Intervention (CAD)

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** `src/ui/coronaryIntervention/` views + config; Deep Forest / `glass-forest-green`; GRACE + TIMI + SYNTAX clinical-UI
- **Cross-references:** see Phase 0B CAD addendum; see 0C-CLI-03
- **Remediation:** Per-module maturity audit (~4-6h); v2.0 Phase 2

### 0C-MOD-05 - Valvular Disease (VHD)

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** `src/ui/valvularDisease/` full view + component cluster; Aged Gold / `glass-liquid-teal`; 2020 ACC/AHA VHD Guideline severity grading
- **Cross-references:** see Phase 0B VHD addendum; see 0C-CLI-03
- **Remediation:** Per-module maturity audit (~4-6h); v2.0 Phase 2

### 0C-MOD-06 - Peripheral Vascular (PVD)

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** `src/ui/peripheralVascular/` full view + component cluster; Gunmetal / `glass-gunmetal`; WIfI + 2024 ACC/AHA PAD Guideline; sister AUDIT-067/068 ABI consumer audit precedent
- **Cross-references:** see Phase 0B PV addendum; see AUDIT-067/068; see 0C-CLI-03
- **Remediation:** Per-module maturity audit (~4-6h); v2.0 Phase 2

### 0C-SLR-01 - Per-module triple-view pattern audit

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** ExecutiveView + ServiceLineView + CareTeamView consistent across 6 modules per L78; per-view depth TBD
- **Cross-references:** see 0C-MOD-01 through 06
- **Remediation:** Per-view audit (~4-6h × 6 = ~24-36h); v2.0 Phase 2

### 0C-SLR-02 - Research persona views

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** `src/ui/research/views/` 3-view structure; clinical-trial + registry workflows TBD
- **Cross-references:** see 0C-SLR-01; see Phase 0B CAD audit §11
- **Remediation:** Per-research-view audit (~4-6h); v2.0 Phase 2

### 0C-SLR-03 - Revenue Cycle views

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** `src/ui/revenueCycle/` RC Module + ExecutiveView + OperationsView + CDIView; DRG + CDI + financial-waterfall workflows
- **Cross-references:** see 0C-SLR-01; see Phase 4 4-3PL-02
- **Remediation:** Per-RC-view audit (~4-6h); v2.0 Phase 2

### 0C-SLR-04 - Admin + Data Management views

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** `src/ui/admin/` + `GodView/` super-admin surface; control-plane persona per Phase 4 4-3PL-02
- **Cross-references:** see Phase 4 4-3PL-02; see 0C-NAV-04; see Phase 5 5-PRV-08
- **Remediation:** Per-admin-view audit + plane-separation visual cue (~4-6h); v2.0 Phase 2

### 0C-PERF-01 - Web Vitals baseline absence

- **Severity:** **HIGH (P1) GATE**
- **Status:** OPEN - PHASE 0C GATE
- **Description:** No Lighthouse / web-vitals / perf budget; Core Web Vitals baseline unknown; heavy deps ~2.9MB without measurement
- **Cross-references:** see Phase 4 §17.1 entry 21 sister; see 0C-PERF-02
- **Remediation:** lighthouse-ci + web-vitals + perf budget JSON + baseline (~6-10h + ~4-6h); v2.0 Phase 2

### 0C-PERF-02 - RUM instrumentation absence

- **Severity:** **HIGH (P1) GATE**
- **Status:** OPEN - PHASE 0C GATE
- **Description:** No frontend RUM; production user experience invisible
- **Cross-references:** see Phase 4 4-ALR-01/02 sister; see §17.1 entry 21; see 0C-OBS-01/02
- **Remediation:** Sentry (unified surface) recommended (~6-10h); v2.0 Phase 2

### 0C-PERF-03 - Bundle size visibility

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** No bundle analyzer; ~2.9MB heavy deps (xlsx + recharts + react-leaflet + framer-motion + jspdf)
- **Cross-references:** see 0C-PERF-04
- **Remediation:** webpack-bundle-analyzer + bundlesize CI (~2-3h); v2.0 Phase 2

### 0C-PERF-04 - Heavy component performance

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** Route-level + per-module lazy-loading TBD; admin / research / revenueCycle on-demand opportunity
- **Cross-references:** see 0C-PERF-01; see 0C-PERF-03
- **Remediation:** Lazy-loading + dynamic imports (~6-10h); v2.0 Phase 2

### 0C-PERF-05 - Performance budget definitions

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** No per-route + per-bundle thresholds
- **Cross-references:** see 0C-PERF-01; see 0C-PERF-03
- **Remediation:** Bundled with 0C-PERF-01/03 (~2-3h after tooling); v2.0 Phase 2

### 0C-I18N-01 - i18n N/A current state

- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** English-only US deployment; no react-intl / next-intl / i18next
- **Cross-references:** see Phase 5 5-OMN-05 N/A pattern
- **Remediation:** Document N/A + trigger conditions (~30min); v2.0 implementation if triggered (~80-120h)

### 0C-I18N-02 - Date / time / number / currency localization

- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** Native Intl formatting ad-hoc; centralized formatting not codified
- **Cross-references:** see 0C-I18N-01
- **Remediation:** Centralized formatting helpers (~10-15h); v2.0

### 0C-TEST-01 - Unit test coverage foundational gap

- **Severity:** **HIGH (P1) GATE CONFIRMED**
- **Status:** OPEN - PHASE 0C GATE
- **Description:** 1 test file in 365 .tsx = 0.27% coverage; sister AUDIT-001 Tier A backend foundational gap; frontend WORSE
- **Cross-references:** see AUDIT-001 (Tier A); see CLAUDE.md §11; see Phase 5 §164.312(b) + 5-ADM-08
- **Remediation:** Jest + RTL baseline + per-component coverage + CI gate (~60-100h); v2.0 Phase 2

### 0C-TEST-02 - Integration / component test absence

- **Severity:** **HIGH (P1) GATE CONFIRMED**
- **Status:** OPEN - PHASE 0C GATE
- **Description:** No @testing-library/react integration tests at scale
- **Cross-references:** see 0C-TEST-01
- **Remediation:** Bundled with 0C-TEST-01

### 0C-TEST-03 - E2E test absence

- **Severity:** **HIGH (P1) GATE CONFIRMED**
- **Status:** OPEN - PHASE 0C GATE
- **Description:** No playwright.config.* / cypress.config.*; end-to-end regression invisible
- **Cross-references:** see 0C-TEST-01; see AUDIT-001
- **Remediation:** Playwright + critical-flow tests + CI (~15-25h); v2.0 Phase 2

### 0C-TEST-04 - Visual regression test absence

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** No Chromatic / Percy / Playwright snapshots; visual regressions invisible
- **Cross-references:** see 0C-CMP-03 Storybook sister
- **Remediation:** Bundled with 0C-CMP-03 + 0C-TEST-03 (~6-10h)

### 0C-OBS-01 - Frontend error tracking absence

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** No Sentry / Datadog / Bugsnag; 24 ErrorBoundary patterns but no external reporting; production errors invisible
- **Cross-references:** see Phase 4 4-ALR-01/02 + 4-APM-01 sister; see §17.1 entry 21; see 0C-PERF-02
- **Remediation:** Sentry (unified) + ErrorBoundary callback + handlers (~6-10h); v2.0 Phase 2

### 0C-OBS-02 - RUM (sister 0C-PERF-02)

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Description:** Sister to 0C-PERF-02 at observability layer
- **Cross-references:** see 0C-PERF-02; see §17.1 entry 21
- **Remediation:** Bundled with 0C-PERF-02 + 0C-OBS-01 (Sentry unifies)

### 0C-OBS-03 - Structured frontend logging

- **Severity:** DOCUMENTATION
- **Status:** OPEN
- **Description:** Ad-hoc console.* usage; no centralized logger primitive with PHI-scrubbing format; PHI-leak risk per CLAUDE.md §14
- **Cross-references:** see CLAUDE.md §14; see backend logger.ts; see 5-TEC-03
- **Remediation:** Frontend logger primitive + lint rule (~6-10h); v2.0 Phase 2

### 0C-CNT-01 - Clinical terminology accuracy

- **Severity:** LOW (P3) DOCUMENTATION
- **Status:** OPEN
- **Description:** Per-module clinical-vocabulary audit against ACC/AHA + HRS + 2024 PAD terminology
- **Cross-references:** see 0C-CLI-01 / 02; see Phase 0B addenda
- **Remediation:** Per-module audit (~6-10h × modules); v2.0 Phase 2

### 0C-CNT-02 - Empty state messaging

- **Severity:** LOW (P3) DOCUMENTATION
- **Status:** OPEN
- **Description:** `ChartEmptyState.tsx` + per-module ad-hoc; per-context consistency TBD
- **Cross-references:** see 0C-CMP-02 (EmptyState primitive)
- **Remediation:** EmptyState primitive + conventions (~3-5h); v2.0 design system codification

### 0C-CNT-03 - Error message consistency + non-PHI-leak

- **Severity:** LOW (P3) DOCUMENTATION
- **Status:** OPEN
- **Description:** Per CLAUDE.md §14: no PHI in error messages; `ErrorHandler.ts` + `ErrorFallback.tsx` PHI-leak audit TBD
- **Cross-references:** see CLAUDE.md §14; see 0C-OBS-03; see 5-TEC-03
- **Remediation:** Error surface PHI-leak audit + ARIA live-region (~4-6h); v2.0 Phase 2

### 0C-CNT-04 - Tooltip + help text density

- **Severity:** LOW (P3) DOCUMENTATION
- **Status:** OPEN
- **Description:** 27 Tooltip occurrences across 10 files; ARIA tooltip pattern + clinical-context help density TBD
- **Cross-references:** see 0C-A11Y-04; see 0C-CMP-02
- **Remediation:** Tooltip primitive + accessibility audit (~6-10h); v2.0 design system codification

---

## Phase status

| Phase | Dimension | Findings count | Status |
|-------|-----------|---------------:|--------|
| 1 | Code quality + tech debt reconciliation | 8 (1 P0, 2 P1, 4 P2, 1 P3, 1 INFO) | COMPLETE 2026-04-29 |
| 2 | Security posture | 14 (0 P0, 7 P1, 5 P2, 1 P3, 1 INFO) | COMPLETE 2026-04-29; Tier S findings RESOLVED 2026-04-30 (AUDIT-009 deployed flag-off, AUDIT-013 + AUDIT-015 RESOLVED); AUDIT-011 pending; AUDIT-022 added 2026-04-30 |
| 3 | Data layer | 10 (1 P1, 5 P2, 4 P3) | COMPLETE 2026-05-07 — CONDITIONAL PASS; production posture NOT production-ready today; 5 production-readiness gate items require immediate remediation (data-state-independent); AUDIT-071 mitigation PR is next work block; see `docs/audit/PHASE_3_REPORT.md` |
| 4 | Operational maturity | 21 (0 P0, 3 P1, 5 P2, 6 P3, 6 INFO, 1 N/A) | COMPLETE 2026-05-19 - originally CONDITIONAL PASS; 3 HIGH P1 gate items (4-ALR-01, 4-ALR-02, 4-APM-01; operational-monitoring cluster) RESOLVED 2026-05-28 via PR #309/#310/#311, verdict advanced to PASS per PHASE_4_REPORT.md §10.1; 5 §17.1 architectural-precedent candidates flagged for separate methodology PR per §17.3; see `docs/audit/PHASE_4_REPORT.md` |
| 5 | HIPAA + compliance | 52 (2 HIGH P1 GATE, 5 MED P2, 7 MED-DOC, 4 LOW P3, 6 LOW-DOC, 19 DOC, 7 CROSSREF, 2 N/A) | COMPLETE 2026-05-20 - CONDITIONAL PASS; 2 HIGH P1 GATE items (5-ADM-09 BAA execution, 5-BRC-06 §164.410 BA-to-CE notification workflow) pending remediation per PHASE_5_REPORT.md §7; pre-BSW-DUA-signature timing aligns with gate-closure window; see `docs/audit/PHASE_5_REPORT.md` |
| 0C | UI/UX audit | 63 (8 HIGH P1 GATE, 16 MED P2, 13 LOW P3 + LOW-DOC, 22 DOC) | COMPLETE 2026-05-20 - CONDITIONAL PASS; 4 HIGH P1 GATE clusters (0C-A11Y WCAG 2.2 AA conformance unverified, 0C-CLI §16 PARTIAL-TRIGGER Class/LOE/risk-score rendering, 0C-PERF Web Vitals + RUM baselines, 0C-TEST frontend test coverage sister AUDIT-001 Tier A) pending remediation per PHASE_0C_REPORT.md §8; v2.0 Phase 2 territory per L117 for substantive remediation; §17.1 architectural-precedent design-token-strategy promoted via §5.1 token-conflict to codification target for SEPARATE methodology PR per §17.3; see `docs/audit/PHASE_0C_REPORT.md` |
| 6 | Module clinical maturity | 0 | DEFERRED |
| 7 | Threat modeling + architecture | 0 | DEFERRED |
| 0B | Clinical audit (canonical) | 13 (0 P0, 4 P1 Tier S, 3 P2, 6 P3, 0 INFO) | COMPLETE 2026-05-04 via PR #234; methodology defects (AUDIT-029, 030, 030.D) RESOLVED; 4 Tier S clinical items (AUDIT-031 through 034) OPEN — separate mitigation PR series; 2 registry orphans (AUDIT-035, 036) OPEN — v2.0 Phase 1 build; AUDIT-037 (Math.random) + AUDIT-038 (Node 18 EOL) OPEN — operational debt |
