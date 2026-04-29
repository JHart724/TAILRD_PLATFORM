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

- **AUDIT-002** — 406 `: any` usages, 779 ESLint warnings concentrated in PHI code (Phase 1, OPEN)
- **AUDIT-003** — 69 `console.*` in production code; 16 in `server.ts` (Phase 1, OPEN)

### MEDIUM (P2)

- **AUDIT-004** — `@ts-nocheck` on `gapRuleEngine.ts` (11,292 LOC, 22% of source) (Phase 1, OPEN)
- **AUDIT-005** — God-files: `routes/modules.ts` (2,031 LOC) and `routes/admin.ts` (1,337 LOC) (Phase 1, OPEN)
- **AUDIT-006** — 27 outdated dependencies, 9 major-version-behind (Phase 1, OPEN)

### LOW (P3)

- **AUDIT-007** — 2 moderate npm vulnerabilities (`uuid` chain, `node-cron`) (Phase 1, OPEN)

### INFO

- **AUDIT-008** — Tech debt register has #27 gap (Phase 1, OPEN)

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

## Phase status

| Phase | Dimension | Findings count | Status |
|-------|-----------|---------------:|--------|
| 1 | Code quality + tech debt reconciliation | 8 (1 P0, 2 P1, 4 P2, 1 P3, 1 INFO) | COMPLETE 2026-04-29 |
| 2 | Security posture | 0 | DEFERRED |
| 3 | Data layer | 0 | DEFERRED |
| 4 | Operational maturity | 0 | DEFERRED |
| 5 | HIPAA + compliance | 0 | DEFERRED (depends on Phase 1 Tier A + Phase 2) |
| 6 | Module clinical maturity | 0 | DEFERRED |
| 7 | Threat modeling + architecture | 0 | DEFERRED |
