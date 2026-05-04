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
- **AUDIT-009** — `requireMFA` is opt-in per user (Phase 2A, **DEPLOYED 2026-04-30**; flag-off pending controlled rollout; reproduces tech debt #3)
- **AUDIT-010** — Refresh token = JWT itself (Phase 2A, OPEN; reproduces tech debt #4)
- **AUDIT-011** — `authorizeHospital` silent no-op AND not applied to patient routes (Phase 2A, OPEN; reproduces tech debt #5)
- **AUDIT-013** — Audit log written to ephemeral ECS local storage (Phase 2A, **RESOLVED 2026-04-30**)
- **AUDIT-014** — Patient search silently broken on encrypted PHI fields (Phase 2B, OPEN)
- **AUDIT-015** — `decrypt()` returns ciphertext on integrity failure (Phase 2B, **RESOLVED 2026-04-30**)
- **AUDIT-016** — No PHI key rotation pattern (Phase 2B, OPEN)

### MEDIUM (P2)

- **AUDIT-004** — `@ts-nocheck` on `gapRuleEngine.ts` (11,292 LOC, 22% of source) (Phase 1, OPEN)
- **AUDIT-005** — God-files: `routes/modules.ts` (2,031 LOC) and `routes/admin.ts` (1,337 LOC) (Phase 1, OPEN)
- **AUDIT-006** — 27 outdated dependencies, 9 major-version-behind (Phase 1, OPEN)
- **AUDIT-012** — `/api/auth/verify` returns `valid: true` for revoked sessions (Phase 2A, OPEN)
- **AUDIT-018** — `AuditLog.description` accepts arbitrary input, not encrypted (Phase 2B, OPEN)
- **AUDIT-019** — `FailedFhirBundle` plaintext PHI fragments (Phase 2B, OPEN)
- **AUDIT-020** — External FHIR identifiers (`fhir*Id`) plaintext (Phase 2B, OPEN)
- **AUDIT-022** — Legacy JSON PHI not encrypted at rest (243 row-instances across 11 columns, 6 models) (Phase 2B-extended, OPEN)

### LOW (P3)

- **AUDIT-007** — 2 moderate npm vulnerabilities (`uuid` chain, `node-cron`) (Phase 1, OPEN)
- **AUDIT-017** — `PHI_ENCRYPTION_KEY` length not validated at startup (Phase 2B, OPEN)

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

### AUDIT-027 — `gdmtEngine.ts` / `gapRuleEngine` redundancy

- **Phase:** Code quality / tech debt
- **Severity:** LOW (P3) — duplication, not security or safety
- **Status:** OPEN
- **Tier:** C
- **Detected:** 2026-05-03 during Phase 0B HF audit
- **Evidence:** GDMT four-pillar logic implemented twice — once in `backend/src/ingestion/gaps/gapRuleEngine.ts` (rules tagged for GAP-HF-001/004/007/010 — beta-blocker, RAASi, MRA, SGLT2i) and once in `backend/src/services/gdmtEngine.ts` (service layer with the same four-pillar logic + contraindication checks). Both paths produce overlapping outputs.
- **Severity rationale:** Code-level redundancy. Risk is divergence over time (rule logic and service drift apart, producing inconsistent gap detection). Currently both paths agree on output so no production impact.
- **Remediation:** Reconcile during Phase 0A Phase 3 (data layer) audit. Decide canonical source: (a) move all GDMT logic to `gdmtEngine.ts` service and have `gapRuleEngine` call it; (b) consolidate in `gapRuleEngine` and deprecate the service; (c) keep both with explicit purpose separation documented.
- **Effort estimate:** S (3-5h) — investigation + consolidation + test
- **Cross-references:**
  - `docs/audit/PHASE_0B_HF_AUDIT_ADDENDUM.md` §9 finding HF-04
  - Phase 0A Phase 3 (data layer audit, pending)

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
