# Phase 2 Report — Security Posture

**Phase:** 2 of 7
**Dimension:** Security posture (auth, PHI encryption, audit logs, secrets, threat surface)
**Executed:** 2026-04-29 (post-Aurora-cutover; Phase 2A + 2B today; 2C/2D deferred)
**Auditor:** jhart
**Framework:** `docs/audit/AUDIT_FRAMEWORK.md` v1.0
**Companions:** `docs/audit/PHASE_2_SCOPE.md`, `docs/audit/PHASE_2_PHI_FIELD_MAP.md`, `docs/audit/PHASE_1_REPORT.md`, `docs/audit/AUDIT_FINDINGS_REGISTER.md`

---

## 1. Executive summary

**Verdict: CONDITIONAL PASS.** Same calibration as Phase 1.

Production is safe at current pilot scale. Defense-in-depth is genuinely strong: AES-256-GCM encryption with auth tags, zero raw SQL on PHI tables, zero `new PrismaClient` outside the lib singleton, CSRF double-submit correctly implemented, startup validation enforces DEMO_MODE-blocked-outside-dev/test plus JWT_SECRET length/entropy plus PHI_ENCRYPTION_KEY presence, bcrypt for passwords, SHA-256 for session tokens, sha256-hashed password-reset tokens, bcrypt-hashed MFA backup codes, audit dual-write to file plus DB. Auth concentration triple-confirmed by Phase 1 reconciliation reproduced at code level here.

**Findings: 13** (0 P0, 7 P1, 4 P2, 1 P3, 1 INFO). The P1 cluster blocks **scaling to additional pilot users** (Tier S) and **formal HIPAA audit defensibility** (Tier B). It does not block today's operations.

| Severity | Count | Phase 2A | Phase 2B |
|----------|------:|---------:|---------:|
| P0 | 0 | 0 | 0 |
| P1 | 7 | 4 | 3 |
| P2 | 4 | 1 | 3 |
| P3 | 1 | 0 | 1 |
| INFO | 1 | 0 | 1 |
| **Total** | **13** | **5** | **8** |

**Top 3 priorities:**

1. **AUDIT-011** — `authorizeHospital` silent no-op AND not applied to patient routes. Tenant isolation depends entirely on per-handler discipline with 0% test coverage backing it.
2. **AUDIT-015** — `decrypt()` returns ciphertext on integrity failure. Masks tampering, leaks ciphertext upstream.
3. **AUDIT-013** — Audit log written to ephemeral ECS local filesystem. HIPAA §164.312(b) audit-control requirement at risk on every task recycle.

---

## 2. Methodology

Per `docs/audit/AUDIT_FRAMEWORK.md` §Methodology. Sub-phases executed today:

- **Phase 2A — Authentication flow audit** (~6h actual). Traced login → JWT issuance → authenticated request → authorization → audit logging. Reviewed `middleware/auth.ts`, `middleware/authRateLimit.ts`, `middleware/auditLogger.ts`, `middleware/csrfProtection.ts`, `middleware/tierEnforcement.ts`, `routes/auth.ts`, `server.ts` startup validation.
- **Phase 2B — PHI encryption coverage** (~6h actual). Per-model PHI inventory (21 models, full field map at `docs/audit/PHASE_2_PHI_FIELD_MAP.md`); encryption mechanism trace; gap analysis; key lifecycle review. Verified hypotheses against code, rejecting four pattern-matches that did not hold up to evidence (UserMFA backup codes, User.resetToken, kmsService unwired, WebhookEvent.processedData).

**Sub-phases deferred:**

- **Phase 2C — Secret lifecycle.** Deferred to a dedicated follow-up. AUDIT-016 (no PHI key rotation) covers the most material secret-lifecycle gap; deeper scoping (rotation cadence, IAM policy review, cross-environment isolation) requires its own audit pass.
- **Phase 2D — Threat modeling.** Deferred. Phase 2A surfaced the SUPER_ADMIN bypass and tenant isolation edges as findings (AUDIT-011); a formal threat model would systematize but not materially change the remediation surface today.

**Scope decision rationale:** the framework's "5+ HIGH/P0 → pause" trigger fired. Continuing 2C / 2D today would produce more findings without changing the action surface. Deferring is correct scoping discipline, not incomplete work.

---

## 3. Phase 2A findings detail (AUDIT-009 through AUDIT-013)

### AUDIT-009 — `requireMFA` is opt-in per user

- **Severity:** HIGH (P1)
- **Status:** OPEN
- **Location:** `backend/src/middleware/auth.ts:221-250`
- **Evidence:** Lines 234-247 query `userMFA.enabled`. If `!mfaRecord?.enabled`, the middleware passes regardless of `mfaVerified`. Wired globally at `server.ts:249` for `/api/*`.
- **Impact:** A user with only password auth can access PHI routes. HIPAA Security Rule §164.312(d) (person-or-entity authentication) expects MFA for any account with PHI access. Today: optional.
- **Reproduces** tech debt #3 with code-level evidence.
- **Remediation:** Add an `mfaEnforced` gate that, when `user.role !== 'DEMO'`, requires `user.mfaVerified` for any route tagged `phi: true`. Force-enroll all SUPER_ADMIN and HOSPITAL_ADMIN users in MFA.
- **Effort:** M (8-16h)
- **Cross-references:** Tech debt #3, AUDIT-001 (auth middleware untested)

### AUDIT-010 — Refresh token equals JWT itself

- **Severity:** HIGH (P1)
- **Status:** OPEN
- **Location:** `backend/src/routes/auth.ts:167-233`
- **Evidence:** `/api/auth/refresh` accepts the same JWT used for auth, verifies it, and issues a new JWT. There is no separate refresh credential.
- **Impact:** A leaked JWT is a refresh credential until `loginSession.isActive=false` (logout). No upper-bound expiry beyond the access expiry. No rotation cadence.
- **Reproduces** tech debt #4 with code-level evidence.
- **Remediation:** Per tech debt #4: separate refresh token (HTTP-only cookie, 30-day expiry), rotated on every refresh, revoked on password change via `revokeAllSessions` endpoint.
- **Effort:** M (12-20h)
- **Cross-references:** Tech debt #4

### AUDIT-011 — `authorizeHospital` silent no-op AND not applied to patient routes

- **Severity:** HIGH (P1)
- **Status:** OPEN
- **Location:** `backend/src/middleware/auth.ts:121-126`; missing-from `backend/src/routes/patients.ts`
- **Evidence:**
  ```ts
  // auth.ts:121-126
  const hospitalId = req.params.hospitalId || req.query.hospitalId as string;
  if (!hospitalId) {
    // No hospitalId requested — continue (the route handler should scope by req.user.hospitalId)
    return next();
  }
  ```
  AND: `grep "authorizeHospital" backend/src/routes/patients.ts` returns 0 hits. Patient routes (the most PHI-intense) rely entirely on per-handler discipline applying `where: { hospitalId: req.user.hospitalId }`.
- **Impact:** Two failure modes:
  1. Routes that DO use `authorizeHospital` but lack `:hospitalId` URL param silently no-op.
  2. Patient routes don't use it at all. With AUDIT-001 0% coverage, any new route that forgets the `hospitalId` filter would silently leak cross-tenant data.
- **Mitigating evidence:** Sampled `routes/patients.ts:37-90` GET / handler; correctly applies `hospitalId: req.user!.hospitalId`. Today's path is tenant-isolated. No compile-time guarantee, no test backing it.
- **Reproduces** tech debt #5 plus surfaces the missing-application gap.
- **Remediation:**
  1. Replace silent no-op with explicit "fail loud if applied to a route without hospitalId param"
  2. Apply explicit guard middleware on all PHI routes asserting `req.user.hospitalId` present
  3. Add integration test attempting cross-tenant read with forged JWT — must return 403
- **Effort:** L (16-24h with integration tests)
- **Cross-references:** Tech debt #5, AUDIT-001

### AUDIT-012 — `/api/auth/verify` returns `valid: true` for revoked sessions

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Location:** `backend/src/routes/auth.ts:237-264`
- **Evidence:** `/verify` runs `jwt.verify` only — no `loginSession.isActive` lookup. Token whose session was revoked still returns `valid: true` until JWT expiry (1h).
- **Impact:** UX-only; not an authorization bypass (`authenticateToken` middleware on protected routes still rejects). UI consumers calling `/verify` to display session-state can surface stale "valid" UI for a logged-out session.
- **Remediation:** Add same `loginSession.findUnique({sessionToken: hash})` lookup as `authenticateToken`.
- **Effort:** S (2h)

### AUDIT-013 — Audit log file written to ephemeral ECS local storage

- **Severity:** HIGH (P1)
- **Status:** OPEN
- **Location:** `backend/src/middleware/auditLogger.ts:8, 24-38`
- **Evidence:** Audit logs written to `path.resolve(__dirname, '../../logs')` via Winston DailyRotateFile (or fallback File transport). ECS Fargate task storage is ephemeral; on task replacement (deploy, scaling, crash) the local filesystem is gone. The DB write at line 138-153 is best-effort and does not throw on failure.
- **Impact:** HIPAA Security Rule §164.312(b) requires audit controls that "record and examine activity in information systems that contain or use electronic protected health information." Ephemeral storage means audit log records can disappear with task recycling. The DB log is the only durable record, and its writes are best-effort.
- **Mitigating context:** Today's traffic is minimal and Aurora is healthy, so DB writes succeed. Each ECS task recycle still loses unflushed file logs.
- **Remediation:**
  1. Stream Winston output to CloudWatch Logs (already collecting stdout/stderr) — add a `winston-cloudwatch` transport OR have Winston write JSON to stdout and let the existing CloudWatch log driver capture it
  2. Add S3 long-term archive cron from CloudWatch Logs (for HIPAA 6-year retention)
  3. Make DB write throw on failure for HIPAA-grade audit events (LOGIN_FAILED, PHI access); route handler catches and degrades safely
- **Effort:** M (8-16h)

---

## 4. Phase 2B findings detail (AUDIT-014 through AUDIT-021)

### AUDIT-014 — Patient search silently broken on encrypted fields

- **Severity:** HIGH (P1)
- **Status:** OPEN
- **Location:** `backend/src/routes/patients.ts:81-86`
- **Evidence:** GET `/api/patients` builds `where.OR = [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: ... }, { mrn: ... }, { email: ... }]`. All four are AES-GCM encrypted (different ciphertext per write). SQL ILIKE on ciphertext can't match plaintext search.
- **Impact:** Production search by name/MRN/email returns 0 results, silently. AUDIT-001's 0% coverage means no detection layer.
- **Remediation options:** (1) deterministic search-key column via HMAC; (2) decrypt-and-filter application-side (small-scale only); (3) restrict to MRN-exact-match (also encrypted; same issue).
- **Effort:** L (16-30h) — requires design choice
- **Cross-references:** AUDIT-001, AUDIT-020 (shared search-key design)

### AUDIT-015 — `decrypt()` returns ciphertext as-is on integrity failure

- **Severity:** HIGH (P1)
- **Status:** OPEN
- **Location:** `backend/src/middleware/phiEncryption.ts:88-101`
- **Evidence:**
  ```ts
  if (!encryptedText.startsWith('enc:')) return encryptedText; // Not encrypted
  try { /* ... AES-GCM decrypt ... */ return decrypted; }
  catch { return encryptedText; /* Return as-is if decryption fails */ }
  ```
- **Impact:** AES-GCM auth-tag mismatch is a tampering or corruption signal. Returning ciphertext to API caller masks the integrity failure and leaks ciphertext bytes upstream where they may be logged or surfaced as `enc:abcdef:...` to UI. HIPAA §164.312(c)(1) (integrity) expects detection of unauthorized alteration.
- **Remediation:** Throw on decrypt failure. Single legacy-data flag (env var `PHI_LEGACY_PLAINTEXT_OK=true`) for documented migration; default off in production.
- **Effort:** S (2-4h)

### AUDIT-016 — No PHI key rotation pattern

- **Severity:** HIGH (P1)
- **Status:** OPEN
- **Location:** `backend/src/middleware/phiEncryption.ts:4`
- **Evidence:** `const ENCRYPTION_KEY = process.env.PHI_ENCRYPTION_KEY` — loaded once at module init. No version tag in `enc:` ciphertext format. No multi-key decryption fallback. `kmsService.ts` is scaffolded but not wired.
- **Impact:** Rotating `PHI_ENCRYPTION_KEY` in Secrets Manager + redeploying makes ALL existing ciphertext unreadable (auth-tag verification fails with different key). HIPAA §164.312(a)(2)(iv) implementation specification expects periodic key rotation. The single-version key with no rotation procedure is a defensibility gap.
- **Remediation:**
  1. Add key-version tag: `enc:v1:{iv}:{tag}:{ct}`
  2. Maintain key map (current + N previous); decrypt tries current first then falls back through map
  3. On rotation: re-encrypt all PHI rows (background job) to current key version
  4. Optionally wire `kmsService.ts` for envelope-encrypted data keys (DEK wrapped by KMS CMK)
- **Effort:** L (24-40h with re-encryption job + tests)

### AUDIT-017 — `PHI_ENCRYPTION_KEY` length not validated at startup

- **Severity:** LOW (P3)
- **Status:** OPEN
- **Location:** `backend/src/server.ts:38-45`
- **Evidence:** Existence check only. AES-256 requires 32 bytes (64 hex chars). Malformed key throws on first encryption, not at startup.
- **Impact:** Server starts with malformed key; first PHI write returns 500. Operational, not security.
- **Remediation:** Add `Buffer.from(process.env.PHI_ENCRYPTION_KEY, 'hex').length === 32` check to startup validation.
- **Effort:** XS (15 min)

### AUDIT-018 — `AuditLog.description` accepts arbitrary input, not encrypted

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Location:** `backend/prisma/schema.prisma` (AuditLog model); not in `PHI_FIELD_MAP`
- **Evidence:** Audited every `writeAuditLog` callsite (16 sites). All current callers pass non-PHI templated strings — discipline is good. The field accepts arbitrary input; future caller could pass PHI in plaintext.
- **Impact:** Latent risk. No active leak today.
- **Remediation:** Add `description` to `PHI_FIELD_MAP.AuditLog`, OR ESLint rule flagging free-form interpolation in `writeAuditLog` description args.
- **Effort:** S (1h, option 1)

### AUDIT-019 — `FailedFhirBundle` plaintext PHI fragments

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Location:** `backend/prisma/schema.prisma` (FailedFhirBundle model)
- **Evidence:** `errorMessage` and `originalPath` plaintext. FHIR ingest failures typically include partial bundle JSON in error messages (Prisma echoes offending input). S3 paths sometimes carry patient identifiers in key names.
- **Impact:** Failed-bundle table accumulates raw FHIR fragments with potential PHI in clear text. DB compromise leaks via failure log even though success path encrypts.
- **Remediation:** Sanitize `errorMessage` at write-time (strip JSON bodies, keep error code + path) OR add fields to `PHI_FIELD_MAP.FailedFhirBundle`. Add 30-day retention prune for resolved bundles.
- **Effort:** S-M (4-8h)

### AUDIT-020 — External FHIR identifiers (`fhir*Id`) plaintext

- **Severity:** MEDIUM (P2)
- **Status:** OPEN
- **Location:** ~8 fields across schema (Patient, Encounter, Observation, Order, Medication, Condition, AllergyIntolerance, Procedure, DeviceImplant)
- **Evidence:** Each `String?` indexed for FHIR sync lookup. Per HIPAA Safe Harbor §164.514(b)(2)(i)(R) "any other unique identifying number, characteristic, or code" — externally-assigned FHIR IDs ARE in the 18-identifier list when traceable to the individual.
- **Impact:** DB compromise leaks the patient's external EHR identifier, allowing re-identification + correlation against the source EHR. Mitigated by tenant isolation (`hospitalId` filter) and the indirect re-identification chain.
- **Operational tradeoff:** these IDs are used in indexes for FHIR sync. Encrypting them breaks lookup unless replaced with deterministic hashes.
- **Remediation:** Decision matches AUDIT-014 search-key design. Three options: accept-risk with documented justification; deterministic search-key; separate FHIR-mapping table.
- **Effort:** Bundled with AUDIT-014 (~24-40h combined)

### AUDIT-021 — `UserSession` model is dead code

- **Severity:** INFO
- **Status:** OPEN
- **Location:** `backend/prisma/schema.prisma` (UserSession model)
- **Evidence:** Schema-defined model + table (`@@map("user_sessions")`). Active session management uses `LoginSession`. Only reference outside schema is `mfaService.ts:27` comment.
- **Impact:** Code hygiene. Increases auth surface area in schema reading; suggests refactor that wasn't completed.
- **Remediation:** Drop the model + migration to remove the table.
- **Effort:** S (2-4h, mostly migration)

---

## 5. Cross-references

### To Phase 1 audit findings

- **AUDIT-001 (Phase 1, P0)** — auth middleware 0% coverage. Reinforced by Phase 2A: every finding here lives in untested middleware.
- **AUDIT-002 (Phase 1, P1)** — `: any` concentration in PHI code. Independent of Phase 2 findings but compounds AUDIT-014 / AUDIT-015 review effort.

### To tech debt register

- **#3 (HIGH)** — MFA enforcement → AUDIT-009 reproduces with code evidence
- **#4 (HIGH)** — Refresh token unbounded → AUDIT-010 reproduces
- **#5 (HIGH)** — `authorizeHospital` silent no-op → AUDIT-011 reproduces + amplifies (missing on patient routes)
- **#7 (HIGH, promoted)** — APM gap → not directly addressed but Phase 4 (operational maturity) will

### To HIPAA Security Rule

- §164.312(a)(2)(iv) (encryption / decryption) — AUDIT-016 (key rotation)
- §164.312(b) (audit controls) — AUDIT-013 (ephemeral storage)
- §164.312(c)(1) (integrity) — AUDIT-015 (decrypt fail-silent)
- §164.312(d) (person/entity authentication) — AUDIT-009 (MFA)
- §164.514(b)(2)(i)(R) (Safe Harbor 18-identifier) — AUDIT-020 (external IDs)

---

## 6. Remediation roadmap (tiered)

### Tier S — Security-critical (must remediate before any new pilot user)

| ID | Finding | Effort |
|----|---------|-------:|
| AUDIT-009 | MFA opt-in → make mandatory for any role with PHI access | 8-16h |
| AUDIT-011 | `authorizeHospital` fail-loud + apply to PHI routes + integration tests | 16-24h |
| AUDIT-013 | Audit log → CloudWatch destination + S3 archive | 8-16h |
| AUDIT-015 | `decrypt()` throw on integrity failure | 2-4h |
| **Total Tier S** | | **34-60h** |

These four are the minimum bar to add a second pilot user without expanding active risk.

### Tier A — Auth/encryption hardening (before scaling beyond current pilot pattern)

| ID | Finding | Effort |
|----|---------|-------:|
| AUDIT-010 | Refresh token: separate credential, HTTP-only cookie, rotation on use | 12-20h |
| AUDIT-014 | Search-key design (HMAC-derived OR feature scope reduction) | 16-30h |
| AUDIT-016 | PHI key versioning + rotation procedure + re-encrypt job | 24-40h |
| **Total Tier A** | | **52-90h** |

### Tier B — Defensibility hardening (before formal HIPAA audit)

| ID | Finding | Effort |
|----|---------|-------:|
| AUDIT-012 | `/verify` session lookup | 2h |
| AUDIT-017 | PHI key startup length validation | 0.25h |
| AUDIT-018 | `AuditLog.description` encryption | 1h |
| AUDIT-019 | `FailedFhirBundle` sanitization + retention | 4-8h |
| AUDIT-020 | External `fhir*Id` deterministic search-key (bundles with AUDIT-014) | bundled |
| **Total Tier B** | | **7-11h** (excl. AUDIT-020 which folds into Tier A) |

### Tier C — Cleanup

| ID | Finding | Effort |
|----|---------|-------:|
| AUDIT-021 | Drop UserSession dead model | 2-4h |
| **Total Tier C** | | **2-4h** |

### Roadmap summary

- **Tier S** (must-have for new pilot user): 34-60h
- **Tier A** (must-have to scale beyond): 52-90h
- **Tier B** (HIPAA audit defensibility): 7-11h
- **Tier C** (hygiene): 2-4h
- **Combined Tier S + A + B + C:** 95-165h

Combined with Phase 1's AUDIT-001 Tier A (40-60h), total **security + coverage minimum bar: 134-220h** before scaling beyond current pilot scope.

---

## 7. Verdict

**Phase 2 outcome: CONDITIONAL PASS.**

Production is safe at current pilot scale. Defense-in-depth is genuinely strong: AES-256-GCM with auth tags, zero raw SQL on PHI, zero PrismaClient bypass paths, CSRF correctly implemented, startup validation enforces three critical invariants, bcrypt for passwords, SHA-256 for session tokens, sha256-hashed reset tokens, bcrypt-hashed MFA backup codes, audit dual-write to file plus DB.

Tier S findings block scaling to additional pilot users.
Tier A findings block scaling beyond current pilot pattern.
Tier B findings block formal HIPAA audit defensibility.

**Upgrade from CONDITIONAL PASS to PASS requires:**

1. Tier S findings remediated (~34-60h)
2. Phase 1 AUDIT-001 Tier A complete (auth middleware coverage to 80%+)
3. Integration tests for tenant isolation passing (validates AUDIT-011 fix)
4. Phase 2C (secret lifecycle) and 2D (threat modeling) executed and clean

**Downgrade to FAIL would require any of:**

1. Active exploit discovered
2. Active PHI exposure incident
3. Failed regulatory audit with cited findings
4. Newly discovered exploitable vulnerability in dependency chain

None currently apply.

**Phase 2 status:** COMPLETE for 2A + 2B. 2C + 2D deferred to Phase 2.5 dedicated session per scoping discipline (5+ HIGH/P0 trigger fired).

---

*Authored 2026-04-29 in branch `docs/audit-phase-2-security`. Verdict calibrated to Phase 1: CONDITIONAL PASS reflects production safety + defensibility roadmap, not absence of findings.*
