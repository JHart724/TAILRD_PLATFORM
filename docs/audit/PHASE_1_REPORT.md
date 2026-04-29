# Phase 1 Report — Code Quality + Tech Debt Reconciliation

**Phase:** 1 of 7
**Dimension:** Code quality + tech debt reconciliation
**Executed:** 2026-04-29 (post-Aurora-cutover)
**Auditor:** jhart
**Framework:** `docs/audit/AUDIT_FRAMEWORK.md` v1.0
**Companion docs:** `docs/audit/PHASE_1_TECH_DEBT_RECONCILIATION.md`, `docs/audit/AUDIT_FINDINGS_REGISTER.md`

---

## 1. Executive summary

**Verdict: CONDITIONAL PASS.**

The TAILRD backend is structurally well-organized and has clean discipline markers (3 TODO comments in 52k LOC, 0 `@ts-ignore`, 0 `@ts-expect-error`, 0 critical/high npm vulnerabilities, 165 tests all passing, no rogue PrismaClient instances). The Aurora migration cutover landed on 2026-04-29 with zero data loss across 22 tables and 1.82M rows — a non-trivial signal that the codebase reaches production maturity for its current scope.

That said, this audit is critical, and softening would defeat its purpose: **breadth is good, depth is poor.** Test coverage is 0.87% statements / 0.36% branches across 110 source files — and the *kind* of code that's untested is the alarming part. Every authentication, audit-logging, PHI-encryption, CSRF, and tenant-tier middleware file sits at 0% coverage. This is the cluster a HIPAA auditor or enterprise health-system due-diligence team will probe first, and the answer today is that it has no automated regression safety net.

**Findings recorded this phase: 8 (1 P0, 2 P1, 4 P2, 1 P3, 1 INFO).**

**Top 3 priorities (in execution order):**

1. **AUDIT-001 (P0)** — auth-critical middleware at 0% coverage. Blocks any enterprise pilot expansion until Tier A remediation lands.
2. **AUDIT-002 (P1)** — 406 `: any` usages and 779 ESLint warnings, concentrated in PHI-handling code.
3. **AUDIT-003 (P1/P2)** — 69 `console.*` in production code, 16 of those in `server.ts` directly.

**Production safety status:** safe to operate at *current* pilot footprint (single solo operator, no third-party PHI ingest yet). NOT safe to scale to multiple health systems without Tier A remediation defined in §5.

---

## 2. Methodology

**Scope:**

- All `backend/src/**/*.ts` (110 files, 52,159 LOC)
- `backend/prisma/schema.prisma` and migration history
- `backend/package.json` dependency tree
- `docs/TECH_DEBT_REGISTER.md` (37 entries)

**Out of scope (deferred to other phases):**

- Frontend code (`src/`) — separate audit
- Infrastructure scripts (`infrastructure/scripts/`) — Phase 7 (architecture review)
- AI model registry internals (`backend/src/ai/`) — Phase 6 (module clinical maturity)
- Live AWS resource configuration — Phase 4 (operational maturity) and Phase 7

**Tools used (11 automated + 1 manual):**

| Tool | Command | Captured to |
|------|---------|------------|
| Test coverage | `npm test -- --coverage --silent --passWithNoTests` | `/tmp/audit-test-coverage.txt`, `/tmp/audit-coverage-summary.txt` |
| TSC strict | `npx tsc --noEmit --strict` | `/tmp/audit-tsc-strict.txt` |
| `: any` count | `grep -rn ": any" backend/src --include="*.ts"` | `/tmp/audit-any-usage.txt` |
| `: unknown` count | `grep -rn ": unknown" backend/src --include="*.ts"` | inline |
| ESLint | `npx eslint src --max-warnings 0` | `/tmp/audit-eslint.txt` |
| npm audit | `npm audit --audit-level=moderate --json` | `/tmp/audit-npm-audit.json` |
| npm outdated | `npm outdated --json` | `/tmp/audit-outdated.json` |
| Console usage | `grep -rEn "console\.(log|error|warn|info)" backend/src --include="*.ts"` | `/tmp/audit-console-usage.txt` |
| Tech-debt markers | `grep -rEn "TODO\|FIXME\|HACK\|XXX" backend/src --include="*.ts"` | `/tmp/audit-todo-markers.txt` |
| Routes | `grep -rEn "router\.(get\|post\|put\|delete\|patch)" backend/src --include="*.ts"` | `/tmp/audit-routes.txt` |
| Codebase size | `find backend/src -name "*.ts" \| xargs wc -l` | inline |
| Prisma schema sanity | `grep -c "^model\|^enum\|@@index\|@@unique" backend/prisma/schema.prisma` | inline |
| Tech debt walk | manual reconciliation against 37-entry register | `PHASE_1_TECH_DEBT_RECONCILIATION.md` |

All raw output is reproducible from the commands above and lands in `/tmp` files for replay.

---

## 3. Tech debt register reconciliation

Full reconciliation in `docs/audit/PHASE_1_TECH_DEBT_RECONCILIATION.md`.

**Summary:**

- **14 entries verified RESOLVED** (12 marked in register, 2 newly resolved by Aurora work but not yet marked: #6 staging, #8 trust proxy)
- **22 entries verified OPEN** (severity unchanged)
- **2 entries severity-adjusted**: #7 promoted MEDIUM→HIGH (APM gap is now a debugging blocker post-cutover); #13 promoted LOW→MEDIUM (Aurora makes Global Database an actionable next step rather than hypothetical)
- **1 entry OBSOLETE**: #17 (RDS Proxy stuck in internal error — Aurora cutover removed the dependency on the proxy entirely)

**Severity counts post-reconciliation:**

| Severity | Open count | Was |
|----------|-----------:|----:|
| P0 | 0 | 2 (both resolved) |
| HIGH | 4 | 4 (no net change) |
| MEDIUM | 6 | 10 |
| P1 | 2 | 2 |
| LOW | 12 | 16 |

**Auth concentration in HIGH:** 3 of the 4 HIGH items (#3 MFA enforcement, #4 refresh token unbounded lifetime, #5 `authorizeHospital` silent no-op) are in or adjacent to authentication code. The fourth (#7 APM) is operational. This auth concentration is reinforced by the test-coverage findings in §4 — see the cross-tool pattern in §4.4.

**Register hygiene side-issue surfaced:** the register has no entry #27. Either intentionally deleted (reason undocumented) or an artifact. Tracked as AUDIT-008 below; folded into the eventual register-hygiene PR scope along with the RESOLVED markers for #6 / #8 / #17.

---

## 4. Automated tooling findings

### 4.1 Per-tool results table

| # | Tool | Result | Threshold | Verdict |
|---|------|-------|-----------|---------|
| 1 | Test coverage | 165 tests / 15 suites PASS; **0.87% statements, 0.36% branches, 1.06% functions, 0.88% lines** | <80% = fail | **FAIL — extreme** |
| 2 | TSC --strict | 0 errors | 0 | PASS *(with caveat: see §4.3 — 22% of source LOC bypasses strict via `@ts-nocheck`)* |
| 3 | `: any` count | **406** in production code (110 files) | <50 ideal | FAIL |
| 4 | ESLint --max-warnings 0 | **779 warnings, 0 errors** (all `@typescript-eslint/no-explicit-any`) | 0 | FAIL |
| 5 | npm audit | 0 critical, 0 high, **2 moderate** (`uuid` chain via `node-cron`) | 0 high+ | PASS *(2 moderate flagged for routine patching)* |
| 6 | npm outdated | **27 packages outdated**, including major-version-behind: prisma 5→7, express 4→5, eslint 8→10, jest 29→30, redis 4→5, helmet 7→8, zod 3→4, bcryptjs 2→3, typescript 5.9→6.0, node-cron 3→4 | <10 stale | FAIL |
| 7 | console.* in prod code | **69 occurrences** (top files: ingestSynthea.ts 32, server.ts 16, batchGapDetection.ts 7) | <10 ideal | FAIL |
| 8 | TODO/FIXME/HACK/XXX | **3 markers** (2 TODO + 1 HACK) in 52k LOC | — | PASS *(impressive cleanliness)* |
| 9 | Routes | 203 across 30 files | — | INFO |
| 10 | Codebase size | 110 source files, 52,159 LOC; 17 test files (15 in `tests/`, 2 in `__tests__/`) | — | INFO |
| 11 | Prisma schema | 54 models, 47 enums, 115 `@@index`, 12 `@@unique`, 3 migrations | — | INFO |

### 4.2 Concentration analysis — `: any` hot spots

Top 5 files account for 110 of the 406 `: any` occurrences (27% of total):

| File | Count | Domain |
|------|---:|--------|
| `cql/cqlEngine.ts` | 24 | Clinical Quality Language engine — touches PHI |
| `redox/fhirResourceHandlers.ts` | 23 | FHIR R4 ingestion — touches PHI |
| `scripts/ingestSynthea.ts` | 22 | Synthea bulk ingestion — script |
| `routes/clinicalIntelligence.ts` | 21 | Clinical intelligence routes — touches PHI |
| `ai/ecgPostprocessor.ts` | 20 | ECG AI postprocessor — CDS-exempt |
| `services/phenotypeService.ts` | 19 | Phenotype detection — touches PHI |
| `cql/fhirDataMapper.ts` | 16 | FHIR mapping — touches PHI |
| `services/alertService.ts` | 14 | Clinical alerts — touches PHI |
| `routes/admin.ts` | 14 | Admin routes |
| `services/crossReferralService.ts` | 13 | Cross-module referrals — touches PHI |

**Pattern:** the largest `any` concentrations are in PHI-handling code. This is the worst possible distribution — exactly the code that should have the strongest type guarantees has the weakest.

### 4.3 TSC strict caveat — `@ts-nocheck` masking

The `tsc --strict` 0-errors result obscures that 2 files carry `// @ts-nocheck`:

| File | LOC | Justification |
|------|---:|---------------|
| `ingestion/gaps/gapRuleEngine.ts` | 11,292 | Codegen-from-rule-registry; per CLAUDE.md §15 rule 6 listed as known stale-Prisma exception |
| `ingestion/runGapDetectionForPatient.ts` | 106 | Same exception |

**11,398 LOC bypass strict checking — approximately 22% of total source LOC.** The strict-mode "PASS" is therefore conditional. The codegen pattern itself is acceptable engineering practice, but the audit framework's strict-mode coverage claim must be qualified, and the rule-registry source files (which generate `gapRuleEngine.ts`) should themselves be type-safe — Phase 2 should verify that.

### 4.4 Coverage gaps on auth-critical middleware

Test coverage at 0.87% overall is bad; the *concentration* is worse:

| Middleware file | Coverage | Lines | Risk |
|-----------------|---------:|------:|------|
| `middleware/auth.ts` | **0%** | 258 | Touches every authenticated request |
| `middleware/auditLogger.ts` | **0%** | 164 | HIPAA audit trail integrity |
| `middleware/csrfProtection.ts` | **0%** | 110 | CSRF defense |
| `middleware/phiEncryption.ts` | **0%** | 211 | PHI encrypt/decrypt at rest |
| `middleware/tierEnforcement.ts` | **0%** | 269 | Multi-tenant tier gating |
| `middleware/cognitoAuth.ts` | **0%** | 169 | (alternate auth path) |
| `middleware/authRateLimit.ts` | **0%** | 165 | Auth-attempt rate limit |
| `middleware/readOnly.ts` | 100% | (small) | Recently added (PR #200) |
| `middleware/analytics.ts` | 46% | — | Partially tested |

Same pattern in services: `emailService.ts` 100% (recently added), every other service 0% — including `patientService.ts`, `phenotypeService.ts`, `gdmtEngine.ts`, `mfaService.ts`. Same in routes: 27 of 30 route files at 0%.

The pattern is consistent: **only files added or substantively touched in the last sprint are tested.** The pre-existing core has no coverage at all.

### 4.5 Cross-tool patterns

- **Auth-critical files cluster the risk** triple-confirmed:
  - Tech debt walk: 3 of 4 HIGH items in auth (#3, #4, #5)
  - Coverage scan: every auth middleware file 0%
  - Type-safety scan: `: any` clusters in PHI-handling code that auth middleware gates
- **Routes are systematically untested**: 0% on every file under `routes/`
- **God-files emerging**: `routes/modules.ts` (2,031 LOC, 31 routes) and `routes/admin.ts` (1,337 LOC, 27 routes) are getting unwieldy; per-domain split is overdue
- **Outdated dep cluster** suggests no quarterly maintenance ritual: 9 packages are major-version behind across security-relevant boundaries (auth: bcryptjs, jose; data: prisma, redis; framework: express, helmet)
- **Marker discipline is real**: only 3 TODO/HACK markers in 52k LOC reflects intentional engineering — `not implementing X yet` is captured in the tech debt register, not strewn through code as TODOs. This is a positive engineering signal.

---

## 5. Findings (AUDIT-001 through AUDIT-008)

### AUDIT-001 — Test coverage 0.87% with auth-critical middleware at 0%

**Severity:** CRITICAL (P0)
**Status:** OPEN
**Location:** `backend/src/middleware/{auth,auditLogger,phiEncryption,csrfProtection,tierEnforcement,cognitoAuth,authRateLimit}.ts` and ~80% of `backend/src/services/*` and `backend/src/routes/*`
**Evidence:**

```bash
npm test -- --coverage --silent --passWithNoTests --coverageReporters=text-summary
# Output:
# Statements   : 0.87% ( 99/11330 )
# Branches     : 0.36% ( 25/6866 )
# Functions    : 1.06% ( 19/1786 )
# Lines        : 0.88% ( 91/10317 )
# Test Suites: 15 passed, 15 total
# Tests:       165 passed, 165 total
```

Per-file evidence captured in `/tmp/audit-test-coverage.txt`. Auth middleware coverage table in §4.4 of this report.

**Impact:** This is a HIPAA-regulated PHI system. The middleware layer that gates every authenticated request, every audit trail entry, every PHI encryption operation, every CSRF check, and every tenant tier boundary has zero automated regression coverage. A change to `auth.ts` could silently break SUPER_ADMIN authorization, drop tenant isolation, or corrupt audit logging — and CI would never tell us. Every prior auth bug surfaced today (the SUPER_ADMIN gate breaking April 16, the role convention drift resolved April 25, the smoke test login failing April 28) was discovered in production, not pre-merge. This finding would fail any enterprise due-diligence review or formal compliance audit against HIPAA Security Rule §164.312(b) (audit controls) and §164.308(a)(8) (evaluation).

**Current production state notes:** this finding does not indicate active risk to current pilot users. Production is observable (CloudWatch, structured logger), error rate is 0 over the last 24h, the recent Aurora cutover validated end-to-end through 76 soak monitor invocations, and middleware code paths are exercised by every authenticated request. The P0 rating reflects audit-defensibility and scaling readiness, not active operational risk. Existing pilot users at current scale are safe; the finding blocks scaling to additional health systems without Tier A remediation.

**Remediation roadmap (Tier A — must-have before any new pilot user, ~40-60h):**

| Target file | Required coverage | Specific tests |
|-------------|------------------:|---------------|
| `middleware/auth.ts` | 80%+ | JWT verification (valid/invalid/expired/missing); SUPER_ADMIN bypass regression for tech debt #5; hospital authorization regression for #5; refresh token flow regression for #4 |
| `middleware/auditLogger.ts` | 80%+ | Every PHI-route access produces an audit row; row schema correctness; failure mode (DB unavailable) does not silently drop audit |
| `middleware/phiEncryption.ts` | 80%+ | Round-trip encrypt/decrypt; key rotation handling; failed-decrypt error path returns 500, not corrupted plaintext |
| `middleware/csrfProtection.ts` | 80%+ | Token gen/validation; bypass paths (login, HEAD, OPTIONS) work as designed; real CSRF attack returns 403 |
| `middleware/tierEnforcement.ts` | 80%+ | Tier gates work; hospital tier resolution from DB |

**Tier B (within 30 days post-pilot start, ~80-120h):**

- All services to 70%+ coverage (`patientService.ts`, `gdmtEngine.ts`, `phenotypeService.ts`, `crossReferralService.ts`, `mfaService.ts`, `s3Service.ts`)
- All routes to integration-test coverage (one happy-path + one auth-failure smoke per route file)

**Tier C (within 90 days, ~120-200h):**

- 80% project-wide statement coverage target
- E2E test suite for critical user journeys (login → module dashboard → patient drill-down → gap detail → close gap)

**Total Tier A-C: 240-380h focused testing work.** Realistic for solo founder cadence: 4-8 weeks at full bandwidth, or accelerated with a contractor.

**Tier A is the line that materially affects HIPAA defensibility and Mount Sinai due diligence.** Below that line, the platform carries real audit risk.

**Tier A timeline reality check:** 40-60h of focused testing work is realistic for a solo operator across 2-4 weeks IF testing is the primary focus during that window. Concurrent Sinai negotiation, fundraising, Day 11 RDS decommission, and ongoing platform work make this timeline aggressive. Three execution paths:

1. **Founder focus sprint (4-week dedicated)** — push other work, single-track on Tier A. Highest founder cost, lowest cash cost. Realistic if no enterprise sale dependency lands inside the window.
2. **Testing contractor engagement (~$8K-15K, 2-3 week timeline)** — engage a QA / test engineer with TypeScript + Jest experience. Founder reviews and pairs on auth-test design. Lowest founder cost, fastest timeline. **Recommended for compressed timeline if Mount Sinai or other due diligence is imminent.**
3. **Phased over 8 weeks with concurrent priorities** — ~5-8h/week of testing work alongside other commitments. Highest schedule risk, lowest immediate cost. Recommended if no imminent enterprise sale dependency.

**Effort estimate:** Tier A 40-60h (M-L); A+B 120-180h; A+B+C 240-380h.
**Cross-references:** Tech debt #3 (MFA), #4 (refresh token), #5 (authorizeHospital) all live in 0%-coverage files.

---

### AUDIT-002 — 406 `: any` usages, 779 ESLint warnings concentrated in PHI code

**Severity:** HIGH (P1)
**Status:** OPEN
**Location:** All-files affected; top 10 files account for 196 of 406 (48%). PHI-handling concentration documented in §4.2.
**Evidence:**

```bash
grep -rn ": any" backend/src --include="*.ts" | grep -v "node_modules" | grep -v "\.spec\." | wc -l
# 406

npx eslint src --max-warnings 0
# ✖ 779 problems (0 errors, 779 warnings)  -- all @typescript-eslint/no-explicit-any
```

**Impact:** The `: any` type opts out of TypeScript's compile-time guarantees on a per-expression basis. When concentrated in PHI-handling code (`cql/cqlEngine.ts`, `redox/fhirResourceHandlers.ts`, `routes/clinicalIntelligence.ts`, `services/phenotypeService.ts`), the practical effect is that we cannot trust the compiler to catch a malformed FHIR resource, a missing patient field, or a wrong-shape gap-rule input. This is the type-safety side of the same testing-gap risk: the compiler should be a defense-in-depth layer, and right now it has 406 holes.

**Remediation:** File-by-file, prioritizing the top 10. Pattern:

1. Replace `: any` with `: unknown` and refine via type guards or zod schemas at boundaries
2. For external-API payloads (FHIR, Redox), introduce zod schemas in `backend/src/validation/` and parse at ingress
3. For internal helpers, extract proper types from Prisma client or define narrow interfaces

**Effort estimate:** ~30-50h. Roughly 6-8 hours per top-10 file for the concentrated cases (24-22 occurrences each), plus a sweep pass for the long tail (300 occurrences across 100 files at 1-3 each).

**Cross-references:** Reinforces AUDIT-001 (the same untested files often carry `: any` weaknesses). Independent of tech debt register.

---

### AUDIT-003 — 69 `console.*` in production code; 16 in `server.ts`

**Severity:** HIGH (P1) for `server.ts` and middleware paths; MEDIUM (P2) for `scripts/ingestSynthea.ts`
**Status:** OPEN
**Location:**

```
scripts/ingestSynthea.ts:    32 occurrences   (script context — P2)
server.ts:                   16 occurrences   (server entry-point — P1)
redox/batchGapDetection.ts:   7 occurrences   (production middleware path — P1)
middleware/analytics.ts:      5 occurrences   (P1)
lib/redis.ts:                 5 occurrences   (P1)
... 5 more files at 1 each
```

**Evidence:**

```bash
grep -rEn "console\.(log|error|warn|info)" backend/src --include="*.ts" | grep -v node_modules | grep -v "\.spec\." | wc -l
# 69
```

Captured to `/tmp/audit-console-usage.txt`.

**Impact:** `console.*` writes go to ECS task stdout/stderr, which CloudWatch ingests but with different access patterns and retention than the Winston logger output. Specifically: structured logger fields (correlation IDs, hospitalId, userId, requestId) aren't automatically attached to `console.*` lines, so log searches are blind to those fields. PHI-leak risk is concrete: `console.error('failed for patient', err)` where `err` carries a Prisma response with patient data lands in CloudWatch as raw text, not a redacted structured event. Per CLAUDE.md §14, "never leave PHI in logs" — `console.*` directly bypasses that discipline.

`server.ts` having 16 `console.*` calls is the highest-risk subset because server startup runs before the logger is necessarily fully initialized, and one bad startup error can leak environment-variable contents.

**Remediation:**

1. Audit `server.ts` 16 occurrences: replace with `logger.error/info/warn` from `backend/src/utils/logger.ts`. If logger isn't available pre-init, add a small bootstrap logger that supports the same interface
2. Audit middleware/redis/analytics console calls: same replacement
3. `scripts/ingestSynthea.ts` is a one-off CLI — `console.*` is acceptable there but would benefit from logger for consistency; defer to a hygiene pass
4. Add ESLint rule `no-console: error` for `src/**/*.ts` excluding `scripts/`

**Effort estimate:** S-M (4-8h for the P1 subset; S/optional 2h for the scripts P2 subset).

**Cross-references:** Tech debt register has no direct entry; create one if remediation slips beyond 30 days.

---

### AUDIT-004 — `@ts-nocheck` on `gapRuleEngine.ts` (11,292 LOC, 22% of source)

**Severity:** MEDIUM (P2)
**Status:** OPEN
**Location:** `backend/src/ingestion/gaps/gapRuleEngine.ts:1` and `backend/src/ingestion/runGapDetectionForPatient.ts:1`
**Evidence:**

```bash
grep -rn "@ts-nocheck" backend/src
# backend/src/ingestion/gaps/gapRuleEngine.ts:1:// @ts-nocheck
# backend/src/ingestion/runGapDetectionForPatient.ts:1:// @ts-nocheck
```

CLAUDE.md §15 RULE 6 documents the WSL-stale-Prisma-client justification.

**Impact:** The TSC `--strict` 0-errors result is conditional. 11,398 LOC (22% of source) bypass strict checking entirely. The codegen pattern itself (rule-registry → generated `gapRuleEngine.ts`) is reasonable engineering, but two gaps remain:

1. The audit framework's "strict-mode coverage" claim must carry an asterisk
2. The rule-registry source files that generate `gapRuleEngine.ts` should themselves be strict-clean — Phase 2 must verify

**Remediation:**

1. Document the codegen pattern in `docs/audit/PHASE_1_REPORT.md` (this finding is the documentation)
2. In Phase 2, audit the rule-registry source for strict-mode hygiene
3. Long-term: investigate whether the codegen output can be split into a `*.d.ts` declaration + `*.js` data, removing the need for `@ts-nocheck` in TS-compiled code
4. Per CLAUDE.md §15 RULE 6 / §14 "never add `@ts-nocheck` to any file" — these two are explicit known exceptions; adding more is forbidden

**Effort estimate:** Documentation S (1h for this finding); long-term refactor M (8-16h).

**Cross-references:** None.

---

### AUDIT-005 — God-files: `routes/modules.ts` (2,031 LOC) and `routes/admin.ts` (1,337 LOC)

**Severity:** MEDIUM (P2)
**Status:** OPEN
**Location:**

| File | LOC | Routes |
|------|---:|---:|
| `backend/src/routes/modules.ts` | 2,031 | 31 |
| `backend/src/routes/admin.ts` | 1,337 | 27 |

**Evidence:**

```bash
find backend/src -name "*.ts" -not -name "*.spec.ts" -not -path "*/node_modules/*" | xargs wc -l | sort -rn | head -5
# 11292 backend/src/ingestion/gaps/gapRuleEngine.ts          (codegen, AUDIT-004)
#  2031 backend/src/routes/modules.ts
#  1337 backend/src/routes/admin.ts
#  1283 backend/src/ai/modelRegistry.ts                       (AI scope)
#  1242 backend/src/ai/ecgPreprocessor.ts                     (AI scope)
```

**Impact:** Maintainability and cognitive load. `routes/modules.ts` mixes routes for all 6 clinical modules (HF, EP, Coronary, Structural, Valvular, PV) into one file. Splitting per-module would mirror the 6-module domain structure already used elsewhere in the codebase (`src/ui/heartFailure/`, `src/ui/electrophysiology/`, etc.). Each route's authorization, validation, and service-call wiring would land in a focused 200-400 LOC file instead of a 2k-LOC mega-file. `admin.ts` similarly mixes 27 disparate admin operations (users, audit, config, data management, health systems, customer success) into one router.

**Remediation:**

1. Split `routes/modules.ts` into `routes/modules/{heartFailure,electrophysiology,coronary,structural,valvular,peripheralVascular}.ts`, each ~300-400 LOC
2. Split `routes/admin.ts` into `routes/admin/{users,audit,config,dataManagement,healthSystems,customerSuccess}.ts`
3. Keep top-level `routes/modules/index.ts` and `routes/admin/index.ts` that re-mount each sub-router; preserves URL layout
4. Wire integration smoke tests per sub-file as part of Tier B testing (§AUDIT-001)

**Effort estimate:** ~20h (4-6h per file, 2 files, plus integration test scaffolding).

**Cross-references:** Bundles naturally with AUDIT-001 Tier B (route integration tests).

---

### AUDIT-006 — 27 outdated dependencies, 9 major-version-behind

**Severity:** MEDIUM (P2)
**Status:** OPEN
**Location:** `backend/package.json`
**Evidence:**

```bash
npm outdated --json
# 27 packages outdated; major-version-behind subset:
#   @prisma/client  5.22.0 → 7.8.0    (2 majors)
#   prisma          5.22.0 → 7.8.0    (2 majors)
#   express         4.22.1 → 5.2.1
#   eslint          8.57.1 → 10.2.1   (2 majors)
#   jest            29.7.0 → 30.3.0
#   redis           4.7.1  → 5.12.1
#   helmet          7.2.0  → 8.1.0
#   zod             3.25.76 → 4.3.6
#   bcryptjs        2.4.3  → 3.0.3
#   typescript      5.9.3  → 6.0.3
#   node-cron       3.0.3  → 4.2.1
#   @types/express  4.17.25 → 5.0.6
```

Captured to `/tmp/audit-outdated.json`.

**Impact:** Maintenance burden, supply-chain hygiene, and security patching latency. Several behind-by-multiple-majors are in security-sensitive boundaries:

- `bcryptjs` 2→3: password-hashing library
- `jose` (already on 6.2.2 → 6.2.3 patch): JWT signing
- `helmet` 7→8: HTTP-security headers
- `prisma` 5→7: ORM client; PHI-encryption middleware lives on top of this
- `express` 4→5: framework; routes everything

The lack of recent updates suggests there is no quarterly maintenance ritual; updates only land when forced by a downstream issue.

**Remediation:** Per-dependency audit. Batch into a quarterly "dep refresh" PR. Suggested order:

1. **First batch (low-risk, patch/minor):** all the `wanted` ≈ `latest` patches (axios, dotenv-related, @aws-sdk fleet, @typescript-eslint, ts-jest)
2. **Second batch (one major at a time, with full test re-run):** typescript 5→6, jest 29→30, eslint 8→10
3. **Third batch (frameworks — careful, breaking changes):** prisma 5→7, express 4→5, redis 4→5, helmet 7→8 — each in its own PR, with full smoke-test cycle and visual review of the changelog migration guide

**Effort estimate:** Batch 1 ~4h, Batch 2 ~8h per major (24h total), Batch 3 ~16h per major (64h total). Realistic full sweep: ~12-15 weeks at 1 PR/week pace.

**Cross-references:** None directly; supply-chain story for Phase 7 (architecture review).

---

### AUDIT-007 — 2 moderate npm vulnerabilities (`uuid` chain, `node-cron`)

**Severity:** LOW (P3)
**Status:** OPEN
**Location:** `backend/package-lock.json` transitive deps
**Evidence:**

```bash
npm audit --audit-level=moderate --json
# {"metadata": {"vulnerabilities": {"critical": 0, "high": 0, "moderate": 2, ...}}}
# advisories:
#   uuid:     moderate via=['uuid']
#   node-cron: moderate via=['uuid']
```

Captured to `/tmp/audit-npm-audit.json`.

**Impact:** Routine moderate-severity CVE in `uuid`'s dependency chain, transitively pulled in via `node-cron`. No exploitable path identified in TAILRD usage (we use `node-cron` for scheduled tasks, not user-controlled input). No data exposure risk.

**Remediation:** Bump `node-cron` to a version that pulls a patched `uuid`. This is part of AUDIT-006 batch 2 (node-cron 3→4 brings a clean transitive tree).

**Effort estimate:** S (1h, folds into AUDIT-006 work).

**Cross-references:** AUDIT-006 (dep refresh).

---

### AUDIT-008 — Tech debt register has #27 gap

**Severity:** INFO
**Status:** OPEN
**Location:** `docs/TECH_DEBT_REGISTER.md`
**Evidence:**

```bash
grep -E "^### [0-9]+\." docs/TECH_DEBT_REGISTER.md | awk -F'.' '{print $1}' | sed 's/### //' | sort -n | uniq
# 1, 2, ..., 26, 28, 29, ..., 38   (27 missing)
```

**Impact:** The register's stable-numbering guarantee (per the doc's own footer: "items should be appended here, not inserted mid-list — the numbering is a stable reference") is broken if a number was deleted without a stub. Future cross-references to "tech debt #27" could pick up a different entry if anyone re-numbers.

**Remediation:** Investigate the gap (run `git log docs/TECH_DEBT_REGISTER.md` and `git log -S '#27' docs/TECH_DEBT_REGISTER.md` to determine if entry was deleted or never created). Add appropriate stub: either `### 27. (deleted YYYY-MM-DD: reason)` if deliberately removed, or `### 27. (reserved)` if gap is artifact. Combine with the framework register-hygiene PR.

**Effort estimate:** XS (15 min).

**Cross-references:** Folds into the register-hygiene PR scoped earlier.

---

## 6. Cross-phase recommendations

### Phase 2 — Security posture (next phase)

**Mandate:** the auth concentration is now triple-confirmed (tech debt walk + coverage scan + type-safety scan all point at auth code). Phase 2 must:

- Audit auth flow end-to-end: token issuance → validation → authorization → audit logging
- Threat-model the SUPER_ADMIN bypass and tenant isolation edges (#5 `authorizeHospital` is the canary)
- Verify PHI encryption coverage: every Prisma field that should be encrypted at rest, is (`backend/src/middleware/phiEncryption.ts` is the enforcement point)
- Audit secret lifecycle: rotation cadence, retrieval scoping, cross-environment isolation (Aurora cutover changed multiple Secrets Manager values; Phase 2 should verify the rotation path is exercised, not just the read path)
- Audit the rule-registry source files for strict-mode hygiene per AUDIT-004

### Phase 3 — Data layer (likely scope)

Starting points:

- Prisma schema audit: 54 models, 47 enums, 115 `@@index`, 12 `@@unique` — verify index coverage against actual query patterns (especially patient-scoped queries that must include `hospitalId`)
- Migration history: 3 migrations post-consolidation. Verify `prisma migrate deploy` reproduces production schema byte-for-byte against staging (Day 9 already validated this end-to-end; Phase 3 should formalize as a recurring check)
- Multi-tenant query audit: every `prisma.<model>.findMany()` etc. must have `where: { hospitalId }`. Grep for violations.
- N+1 query patterns and Prisma `include` depth review

### Phase 5 — HIPAA + compliance

**Dependency note:** Phase 5 should not start until Phase 1 Tier A and Phase 2 land. HIPAA Security Rule §164.312(b) (audit controls) and §164.308(a)(8) (evaluation) both require demonstrable evidence that auth and audit middleware behave as designed. Without AUDIT-001 Tier A coverage in place, a HIPAA gap-analysis would surface AUDIT-001 itself as the dominant finding.

### Phases 4, 6, 7

Sequence-flexible after Phase 2 lands:

- **Phase 4 (operational maturity)** — naturally pairs with the #7 APM gap promoted in this reconciliation; runbook coverage for Aurora-specific failure modes
- **Phase 6 (module clinical maturity)** — independent of code-quality findings; clinical content review against guideline citations
- **Phase 7 (threat modeling + architecture)** — best done after Phase 2 + 3 land so the threat model can reference real auth + data-layer findings

---

## 7. Verdict

**Phase 1 outcome: CONDITIONAL PASS.**

| Dimension | Result |
|-----------|--------|
| Production safe to operate at current pilot footprint | YES |
| Production safe to scale to multiple health systems | NO — until Tier A remediation (AUDIT-001) lands |
| Code structure and discipline markers | GOOD (3 TODOs in 52k LOC, 0 @ts-ignore, 0 critical CVE, 165 tests passing) |
| Test coverage depth | UNACCEPTABLE for HIPAA-relevant production system |
| Type-safety depth | WEAK — concentrated in PHI-handling code |
| Tech debt management | GOOD — register is honest, severities are calibrated, resolution is real |
| Maintenance ritual (deps, lint, types) | INSUFFICIENT — no recurring cadence visible |

**Top 3 priorities (re-stated):**

1. **AUDIT-001 (P0)** Tier A — auth middleware coverage. 40-60h. Blocks pilot expansion.
2. **AUDIT-002 (P1)** — `: any` cleanup in PHI-handling code. 30-50h. Reinforces AUDIT-001.
3. **AUDIT-003 (P1)** — `console.*` removal from `server.ts` and middleware. 4-8h. Quick win.

**Findings register:** populated with AUDIT-001 through AUDIT-008. See `docs/audit/AUDIT_FINDINGS_REGISTER.md`.

### 7.1 Verdict criteria

**Upgrade from CONDITIONAL PASS to PASS requires:**

1. AUDIT-001 Tier A complete — auth-critical middleware to 80%+ coverage with passing tests
2. Phase 2 (Security posture) executed and clean
3. AUDIT-002 reduced to <100 ESLint warnings
4. AUDIT-003 P1 subset (server.ts + middleware) resolved

**Downgrade to FAIL would require any of the following (none currently applicable):**

1. Production error rate spike sustained
2. Active PHI exposure incident
3. Failed regulatory audit with cited findings
4. Newly discovered exploitable vulnerability in dependency chain

**Phase 1: COMPLETE.** Phase 2 (security posture) is the next dedicated audit session.

---

*Authored 2026-04-29 in branch `docs/backend-audit-framework`. Reviewed and authorized severity assignments without softening.*
