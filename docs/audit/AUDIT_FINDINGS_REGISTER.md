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
- **AUDIT-011** — `authorizeHospital` silent no-op AND not applied to patient routes (Phase 2A, OPEN; reproduces tech debt #5)
- **AUDIT-013** — Audit log written to ephemeral ECS local storage (Phase 2A, **RESOLVED 2026-04-30**)
- **AUDIT-014** — Patient search silently broken on encrypted PHI fields (Phase 2B, OPEN)
- **AUDIT-015** — `decrypt()` returns ciphertext on integrity failure (Phase 2B, **RESOLVED 2026-04-30**)
- **AUDIT-016** — No PHI key rotation pattern (Phase 2B, OPEN)
- **AUDIT-031** — GAP-EP-079: pre-excited AF + AVN blocker (CRITICAL SAFETY, uncovered) (Phase 0B EP, OPEN, **Tier S**)
- **AUDIT-032** — GAP-EP-006: dabigatran in CrCl<30 (SAFETY, uncovered) (Phase 0B EP, OPEN, **Tier S**)
- **AUDIT-033** — GAP-EP-017: HFrEF + non-DHP CCB SAFETY — registry entry deferred (Phase 0B EP, OPEN, **Tier S**, trivial fix)
- **AUDIT-034** — GAP-CAD-016: prasugrel + stroke/TIA SAFETY — PARTIAL needs hardening (Phase 0B CAD, OPEN, **Tier S**)

### MEDIUM (P2)

- **AUDIT-004** — `@ts-nocheck` on `gapRuleEngine.ts` (11,292 LOC, 22% of source) (Phase 1, OPEN)
- **AUDIT-005** — God-files: `routes/modules.ts` (2,031 LOC) and `routes/admin.ts` (1,337 LOC) (Phase 1, OPEN)
- **AUDIT-006** — 27 outdated dependencies, 9 major-version-behind (Phase 1, OPEN)
- **AUDIT-012** — `/api/auth/verify` returns `valid: true` for revoked sessions (Phase 2A, OPEN)
- **AUDIT-018** — `AuditLog.description` accepts arbitrary input, not encrypted (Phase 2B, OPEN)
- **AUDIT-019** — `FailedFhirBundle` plaintext PHI fragments (Phase 2B, OPEN)
- **AUDIT-020** — External FHIR identifiers (`fhir*Id`) plaintext (Phase 2B, OPEN)
- **AUDIT-022** — Legacy JSON PHI not encrypted at rest (243 row-instances across 11 columns, 6 models) (Phase 2B-extended, OPEN)
- **AUDIT-035** — `gap-ep-anticoag-interruption` registry-only orphan (Phase 0B EP, OPEN)
- **AUDIT-037** — `Math.random()` in `cqlEngine.ts:475` default rule scoring (Phase 0B canonical, OPEN, CLAUDE.md §14 violation)

### LOW (P3)

- **AUDIT-007** — 2 moderate npm vulnerabilities (`uuid` chain, `node-cron`) (Phase 1, OPEN)
- **AUDIT-017** — `PHI_ENCRYPTION_KEY` length not validated at startup (Phase 2B, OPEN)
- **AUDIT-027** — `gdmtEngine.ts` / `gapRuleEngine` redundancy + rule-engine naming convention reconciliation (Phase 0B HF + CAD, OPEN)
- **AUDIT-028** — Time-unit disambiguation in timeline math (raw scope vs AI-assisted wall-clock) (Phase 0B CAD, OPEN)
- **AUDIT-029** — Rule-body verification standard for clinical audits (Phase 0B canonical, **RESOLVED 2026-05-04** via PR #234)
- **AUDIT-030** — Per-gap classification citation requirement (Phase 0B canonical, **RESOLVED 2026-05-04** via PR #234)
- **AUDIT-030.D** — Evaluator inventory completeness via multi-pattern detection (Phase 0B canonical, **RESOLVED 2026-05-04** via PR #234)
- **AUDIT-036** — `gap-hf-vaccine-covid` registry-only orphan (Phase 0B HF, OPEN)
- **AUDIT-038** — Node 18 LTS deprecation tracking (Operational debt, OPEN)

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
- **Status:** OPEN (design complete 2026-05-02 — see `docs/audit/AUDIT_011_DESIGN.md`; implementation pending)
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
- **Status:** OPEN
- **Location:** `backend/src/middleware/phiEncryption.ts:4`
- **Evidence:** Key loaded once at module init. No version tag in `enc:` format. No multi-key fallback. `kmsService.ts` scaffolded but unwired.
- **Severity rationale:** HIPAA §164.312(a)(2)(iv) implementation specification expects periodic key rotation. Rotating today would make all existing ciphertext unreadable.
- **Remediation:** Key-version tag in ciphertext; multi-key map; re-encrypt-on-rotation background job; optionally wire `kmsService.ts` for envelope encryption.
- **Effort estimate:** L (24-40h)

### AUDIT-017 — `PHI_ENCRYPTION_KEY` length not validated at startup

- **Phase:** 2B
- **Severity:** LOW (P3)
- **Status:** OPEN
- **Location:** `backend/src/server.ts:38-45`
- **Evidence:** Existence check only. AES-256 requires 32 bytes (64 hex chars). Malformed key throws on first encryption, not at startup.
- **Severity rationale:** Operational, not security.
- **Remediation:** Add `Buffer.from(...).length === 32` check to startup validation.
- **Effort estimate:** XS (15 min)

### AUDIT-018 — `AuditLog.description` accepts arbitrary input, not encrypted

- **Phase:** 2B
- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Location:** `backend/prisma/schema.prisma` (AuditLog model)
- **Evidence:** All current `writeAuditLog` callers (16 sites) pass non-PHI templated strings. Field accepts arbitrary input.
- **Severity rationale:** Latent risk; no active leak today.
- **Remediation:** Add `description` to `PHI_FIELD_MAP.AuditLog` OR ESLint rule on free-form interpolation in `writeAuditLog` calls.
- **Effort estimate:** S (1h)

### AUDIT-019 — `FailedFhirBundle` plaintext PHI fragments

- **Phase:** 2B
- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Location:** `backend/prisma/schema.prisma` (FailedFhirBundle model)
- **Evidence:** `errorMessage` and `originalPath` plaintext. FHIR ingest failures typically include partial bundle JSON; S3 paths sometimes carry patient identifiers.
- **Severity rationale:** Failed-bundle table accumulates raw FHIR fragments with potential PHI in clear text.
- **Remediation:** Sanitize at write OR add fields to `PHI_FIELD_MAP.FailedFhirBundle`. Add 30-day retention prune.
- **Effort estimate:** S-M (4-8h)

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
- **Status:** OPEN
- **Discovered:** 2026-04-30
- **Location:** 11 JSON columns across 6 models, 243 legacy row-instances:
  - `risk_score_assessments.inputData` (4)
  - `risk_score_assessments.components` (4)
  - `intervention_tracking.findings` (2)
  - `alerts.triggerData` (5)
  - `phenotypes.evidence` (7)
  - `contraindication_assessments.reasons` (2)
  - `contraindication_assessments.alternatives` (2)
  - `contraindication_assessments.monitoring` (2)
  - `therapy_gaps.recommendations` (211)
  - `drug_titrations.barriers` (2)
  - `drug_titrations.monitoringPlan` (2)
- **Evidence:** `verify-phi-legacy-json.js` Fargate task run 2026-04-30 (`2e8c333d8bb745ab891a8f13d9061e7e`), `cleanForFlagFlip: false`, 243 total legacy JSON-field row-instances. Detail per-column counts available at `infrastructure/scripts/phase-2d/verify-phi-legacy-json.js` for replay.
- **Runtime safety analysis:** `decryptJsonField` (`phiEncryption.ts:160-170`) gates the `decrypt()` call on `typeof === 'string' && startsWith('enc:')`. Legacy JSON values are `typeof === 'object'` (Prisma returns parsed JSON), so they skip the decrypt path entirely and are returned as-is. **Cannot cause runtime errors under any flag state.**
- **Severity rationale:** HIPAA §164.312(a)(2)(iv) encryption-at-rest is an addressable implementation specification. PHI stored in plaintext in JSON columns violates the principle even though no runtime exposure exists today (cipher tag wouldn't catch tampering on these specific rows; if anyone DUMPS the database via DBA path, these rows leak). Cannot fail formal HIPAA audit on this finding alone but contributes to the at-rest encryption gap surface.
- **Remediation:** Separate JSON-aware backfill script mirroring `backfillPHIEncryption.js` pattern. Read each JSON value via Prisma `findUnique`, write back via `prisma.<model>.update()` to trigger `encryptJsonField` middleware. Per-row try/catch + post-verify discipline. Bulk concern: `therapy_gaps.recommendations` has 211 rows — same approach, just larger batch.
- **Effort estimate:** M (4-8h, larger row count + JSON serialization edge cases)
- **Dependencies:** Independent of AUDIT-015 closeout. Should be addressed before Phase 2 verdict upgrade to PASS. Becomes Tier B (defensibility hardening) per `PHASE_2_REPORT.md` §6.
- **Cross-references:** AUDIT-015 (parallel finding for string columns; same remediation pattern with file-name parallel)

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
- **Status:** OPEN — **automatic Tier S inclusion** per AUDIT_METHODOLOGY.md §6.3
- **Tier:** S
- **Detected:** 2026-05-04 via canonical audit infrastructure (Tier S queue surfacing)
- **Evidence:** spec line 352 (CK v4.0 §6.2) text "WPW + AF on beta-blocker/CCB/digoxin - risk of VF". Canonical `EP.crosswalk.json` row classification: SPEC_ONLY. No evaluator block in `backend/src/ingestion/gaps/gapRuleEngine.ts` detects this scenario. **Highest-priority of the 4 Tier S items per spec-explicit `(CRITICAL)` tag indicating VF risk.** Pre-excited AF + AVN-blocking medications can trigger ventricular fibrillation; classified above `(SAFETY)`-tagged items in mitigation sequencing.
- **Severity rationale:** patient-safety risk; uncovered SAFETY classification with `(CRITICAL)` modifier indicating mortality-relevant downside if missed.
- **Remediation:** author new evaluator block detecting (AF dx I48.x + WPW dx I45.6) + (RxNorm beta-blocker / non-DHP CCB / digoxin on active med list). Recommend procainamide / amiodarone alternatives in safety message. Estimated 2-4h work (evaluator block + registry entry + tests).
- **Effort estimate:** S (2-4h)
- **Cross-references:**
  - `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` §3.1
  - `docs/audit/canonical/EP.crosswalk.json` row GAP-EP-079
  - `docs/audit/canonical/EP.spec.json` gap[GAP-EP-079]
  - PR #234

---

### AUDIT-032 — GAP-EP-006: dabigatran in CrCl<30 (SAFETY, uncovered)

- **Phase:** 0B EP clinical audit
- **Severity:** HIGH (P1) — patient safety, spec-explicit `(SAFETY)`
- **Status:** OPEN — automatic Tier S
- **Tier:** S
- **Detected:** 2026-05-04 via canonical audit infrastructure
- **Evidence:** spec line 312 (CK v4.0 §6.2) text "Dabigatran + severe renal impairment". Canonical `EP.crosswalk.json` row classification: SPEC_ONLY. No CrCl-gated dabigatran SAFETY check in evaluator. Bleeding risk in renal impairment is the documented harm pathway (per FDA prescribing information + 2023 ACC/AHA AFib guideline).
- **Severity rationale:** patient-safety risk; uncovered SAFETY classification.
- **Remediation:** author evaluator block: (RxNorm 1037045 dabigatran on active med list) + (CrCl < 30 from observations OR eGFR LOINC). Switch-to-apixaban recommendation. Estimated 1-2h.
- **Effort estimate:** XS-S (1-2h)
- **Cross-references:**
  - `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` §3.1
  - `docs/audit/canonical/EP.crosswalk.json` row GAP-EP-006
  - PR #234

---

### AUDIT-033 — GAP-EP-017: HFrEF + non-DHP CCB SAFETY — registry entry deferred

- **Phase:** 0B EP clinical audit (related: PR #229 EP-XX-7 mitigation)
- **Severity:** HIGH (P1) — patient safety, spec-explicit `(SAFETY)`
- **Status:** OPEN — automatic Tier S; **trivial fix path** (registry entry only)
- **Tier:** S
- **Detected:** 2026-05-04 via canonical audit infrastructure (correction of earlier "naming collision" interpretation)
- **Evidence:** spec line 339 (CK v4.0 §6.2) text "AF + non-DHP CCB in HFrEF (SAFETY). HFrEF on verapamil/diltiazem". Evaluator block `EP-017` at line 4797 in `gapRuleEngine.ts` (added in PR #229 / commit 9ac3806) DOES detect this scenario at runtime — fires SAFETY gap with Class 3 (Harm) classification when HFrEF + on diltiazem (RxNorm 3443) or verapamil (RxNorm 11170). However, no registry entry exists for `gap-ep-017` (intentionally deferred per CLAUDE.md observation 'v'). Canonical `EP.crosswalk.json` shows SPEC_ONLY at registry-audit level.
- **Severity rationale:** patient-safety risk at the audit/registry level; runtime detection IS active (mitigated by PR #229), but the missing registry entry means the gap is invisible to gap-rule provenance tooling and validateCrosswalk gate.
- **Remediation:** add registry entry `gap-ep-017-hfref-non-dhp-ccb` to `RUNTIME_GAP_REGISTRY` array in `gapRuleEngine.ts`. Pairs with existing evaluator. Re-run extractCode + reconcile + render. Closes Tier S item with ~5-10 min agent work + a small PR. **Recommended FIRST Tier S mitigation PR.** Trivial scope closes the spec-explicit Tier S item via registry-entry-add only; the evaluator block already exists from PR #229. After this lands, Tier S queue reduces from 4 to 3 items.
- **Effort estimate:** XS (~10 min agent + tests)
- **Cross-references:**
  - PR #229 (the EP-XX-7 mitigation that added the evaluator)
  - CLAUDE.md observation 'v' (deferred registry update)
  - `docs/audit/canonical/EP.crosswalk.json` row GAP-EP-017
  - AUDIT-027 (rule-engine reconciliation expanded scope)
  - PR #234

---

### AUDIT-034 — GAP-CAD-016: prasugrel + stroke/TIA SAFETY — PARTIAL needs hardening

- **Phase:** 0B CAD clinical audit
- **Severity:** HIGH (P1) — patient safety, spec-explicit `(SAFETY)`
- **Status:** OPEN — automatic Tier S
- **Tier:** S
- **Detected:** 2026-05-04 via canonical audit infrastructure
- **Evidence:** CK v4.0 §6.4 spec gap text "Prasugrel + prior stroke/TIA SAFETY". Canonical `CAD.crosswalk.json` row classification: PARTIAL_DETECTION via `gap-cad-prasugrel`. Evaluator fires for general prasugrel scenarios (post-ACS DAPT) but doesn't specifically discriminate the prior-stroke/TIA contraindication. Per FDA black-box warning, prasugrel is contraindicated in prior stroke/TIA due to fatal/intracranial bleeding risk.
- **Severity rationale:** patient-safety risk; broad-rule covers without discrimination, missing the spec-mandated contraindication check.
- **Remediation:** harden `gap-cad-prasugrel` evaluator with stroke/TIA history check (ICD-10 I63.x acute, I64 stroke unspecified, G45.x TIA, Z86.73 personal history of stroke). When matched, switch SAFETY recommendation to ticagrelor or clopidogrel rather than continuing prasugrel. Estimated 1-2h.
- **Effort estimate:** XS-S (1-2h)
- **Cross-references:**
  - `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` §3.1
  - `docs/audit/canonical/CAD.crosswalk.json` row GAP-CAD-016
  - PR #234

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
- **Tier:** 3
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

## Phase status

| Phase | Dimension | Findings count | Status |
|-------|-----------|---------------:|--------|
| 1 | Code quality + tech debt reconciliation | 8 (1 P0, 2 P1, 4 P2, 1 P3, 1 INFO) | COMPLETE 2026-04-29 |
| 2 | Security posture | 14 (0 P0, 7 P1, 5 P2, 1 P3, 1 INFO) | COMPLETE 2026-04-29; Tier S findings RESOLVED 2026-04-30 (AUDIT-009 deployed flag-off, AUDIT-013 + AUDIT-015 RESOLVED); AUDIT-011 pending; AUDIT-022 added 2026-04-30 |
| 3 | Data layer | 0 | DEFERRED |
| 4 | Operational maturity | 0 | DEFERRED |
| 5 | HIPAA + compliance | 0 | DEFERRED (depends on Phase 1 Tier A + Phase 2) |
| 6 | Module clinical maturity | 0 | DEFERRED |
| 7 | Threat modeling + architecture | 0 | DEFERRED |
| 0B | Clinical audit (canonical) | 13 (0 P0, 4 P1 Tier S, 3 P2, 6 P3, 0 INFO) | COMPLETE 2026-05-04 via PR #234; methodology defects (AUDIT-029, 030, 030.D) RESOLVED; 4 Tier S clinical items (AUDIT-031 through 034) OPEN — separate mitigation PR series; 2 registry orphans (AUDIT-035, 036) OPEN — v2.0 Phase 1 build; AUDIT-037 (Math.random) + AUDIT-038 (Node 18 EOL) OPEN — operational debt |
