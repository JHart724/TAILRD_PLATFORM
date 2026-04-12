# TAILRD Heart Platform — Master Platform Review

**Version:** 3.0 | Clinical Grade | Adversarial
**Run date:** April 12, 2026
**Auditor:** Claude Opus 4.6 (automated multi-agent suite)
**Production:** `tailrd-backend:30` at `api.tailrd-heart.com`
**Methodology:** White-box pentest + HIPAA audit + clinical accuracy review + UI/UX review
**Prior baseline:** Phase 3 audit (April 8, 7.4/10) → Sprint A (April 10) → Sprint B (April 12, 7.8/10)

---

## Table of Contents

### Phase 1: Security Penetration Test (Sections 1.1-1.9)
- [1.1 Authentication Attack Surface (JWT, Session, MFA)](#11-authentication-attack-surface)
- [1.2 Authorization & Privilege Escalation (RBAC, IDOR, DEMO_MODE, Mass Assignment)](#12-authorization--privilege-escalation)
- [1.3 Injection Attacks (SQL, NoSQL, Command, Prototype Pollution, SSRF, ReDoS)](#13-injection-attacks)
- [1.4 Denial of Service Attack Surface](#14-denial-of-service)
- [1.5 Sensitive Data Exposure (Logs, URLs, Errors, Browser Storage, Headers)](#15-sensitive-data-exposure)
- [1.6 Network & Transport Security (TLS, CORS, CSRF)](#16-network--transport-security)
- [1.7 Supply Chain & CI/CD Security](#17-supply-chain--cicd)
- [1.8 Secrets & Credential Hygiene](#18-secrets--credential-hygiene)
- [1.9 Audit Logging Completeness](#19-audit-logging-completeness)
- [1.L Live API Penetration Test Results](#1l-live-api-penetration-tests)

### Phase 2: HIPAA Compliance & Regulatory (Sections 2.1-2.7) — PENDING
### Phase 3: Clinical Logic & Accuracy (Sections 3.1-3.10) — PENDING
### Phase 3B: Service Line View Audit — PENDING
### Phase 3C: Research View, Registry, Trial Matching — PENDING
### Phase 4: UI/UX & Design System (Sections 4.1-4.10) — PENDING
### Phase 5: Multi-Tenancy & Data Isolation — PENDING
### Phase 5B: EHR Integration (Redox, FHIR, CDS Hooks, SMART) — PENDING
### Phase 6: Data Pipeline & FHIR Integrity — PENDING
### Phase 7: Backend Architecture — PENDING
### Phase 8: Frontend Architecture — PENDING
### Phase 9: Infrastructure & DevOps — PENDING
### Phase 10: God View & Admin Console — PENDING
### Phase 11: Demo Readiness — PENDING
### Phase 12: Code Quality & Technical Debt — PENDING
### Phase 13: Scalability & Performance — PENDING
### Phase 14: Competitive Positioning & Enterprise Features — PENDING
### Phases 15-31: Specialized Domains — PENDING

### Deliverables
- Deliverable 1: Severity Distribution Table — PENDING
- Deliverable 2: Top 20 Pre-Demo Fix List — PENDING
- Deliverable 3: HIPAA Violation Register — PENDING
- Deliverable 4: Clinical Safety Register — PENDING
- Deliverable 5: Build & Deployment Blocker List — PENDING
- Deliverable 6: Route Security Matrix — PENDING
- Deliverable 7: Module × Tier Data Source Matrix — PENDING
- Deliverable 8: Drug Code Error Table — PENDING
- Deliverable 9: Admin & God View Capability Matrix — PENDING
- Deliverable 10: Overall Readiness Scorecard — PENDING
- Deliverable 11: Series A Technical Due Diligence Paragraph — PENDING
- Deliverable 12: Cardiologist CMO First Impression — PENDING
- Deliverable 13: Fastest Path to Deployable Demo — PENDING
- Deliverable 14: Quick Wins List — PENDING

---

# PHASE 1: SECURITY PENETRATION TEST

**Reviewer persona:** Senior penetration tester with OSCP, CEH, and HIPAA security specialization. White-box access to full source code.

**Files under review:** All 29 route files in `backend/src/routes/`, `backend/src/middleware/auth.ts`, `backend/src/server.ts`, `backend/src/lib/redis.ts`, `backend/src/utils/logger.ts`, `backend/Dockerfile`, `.github/workflows/*.yml`

---

## Phase 1 Summary — Security Penetration Test

**Agents deployed:** 6 parallel + 1 live API test suite
**Total findings:** 92
**Severity distribution:**

| Severity | Count |
|----------|------:|
| CRITICAL | 10 |
| HIGH | 35 |
| MEDIUM | 31 |
| LOW | 10 |
| **Total** | **92** |

**All 6 agents complete.** Includes live API penetration test results.

---

## 1.1 Authentication Attack Surface

**Agent:** §1.1 JWT + Session + MFA | **Findings:** 19 (2 CRITICAL, 8 HIGH, 7 MEDIUM, 2 LOW)

### FINDING-1.1-001 — CRITICAL: Demo Mode Accepts Tampered Tokens as Super-Admin
**File:** `backend/src/middleware/auth.ts:72-76`
**Issue:** When a token fails `jwt.verify()` in DEMO_MODE, the catch block creates a synthetic super-admin payload instead of rejecting. Any malformed/expired/tampered token → full super-admin access in demo mode.
**Fix:** Remove the `isDemoMode` fallback inside the token failure catch block. Only allow demo fallback when no token is provided at all.
**Effort:** 0.5h

### FINDING-1.1-002 — CRITICAL: Pre-MFA Token Accesses PHI Routes
**File:** `backend/src/routes/auth.ts:196` + `backend/src/middleware/auth.ts:241`
**Issue:** Login issues a full JWT before MFA verification. `requireMFA` is only mounted on 5 of 29 route groups. Routes without it (`/api/analytics/*`, `/api/admin/*`, `/api/modules/*`, `/api/hospitals/*`, etc.) accept pre-MFA tokens with full PHI access.
**Fix:** Mount `requireMFA` globally on all `/api/*` routes except `/api/auth/*` and `/api/mfa/*`.
**Effort:** 4h

### FINDING-1.1-003 — HIGH: /verify Dumps Full JWT Payload
**File:** `backend/src/routes/auth.ts:391`
**Issue:** `POST /api/auth/verify` returns the complete decoded JWT including userId, email, role, hospitalId, hospitalName, and full permissions map. No authentication required.
**Fix:** Return only `{ valid: true, expiresAt }`.
**Effort:** 0.5h

### FINDING-1.1-004 — HIGH: No Refresh Token Rotation
**File:** `backend/src/routes/auth.ts:306-339`
**Issue:** Same access JWT serves as refresh credential. Old tokens not invalidated atomically on refresh. No `httpOnly` cookie isolation. Both access and "refresh" tokens in `localStorage` = XSS-stealable.
**Fix:** Introduce separate UUID refresh token in `httpOnly Secure SameSite=Strict` cookie. Single-use rotation.
**Effort:** 8h

### FINDING-1.1-005 — HIGH: mfaVerified Absent (Not False) in Initial JWT
**File:** `backend/src/routes/auth.ts:196-203`
**Issue:** Initial JWT omits `mfaVerified` entirely (undefined, not false). Future code checking truthiness vs explicit false could diverge.
**Fix:** Always include `mfaVerified: false` in initial JWT. Check `!== true` (strict) in requireMFA.
**Effort:** 1h

### FINDING-1.1-006 — HIGH: Logout Has No Auth; Session Persistence Attack
**File:** `backend/src/routes/auth.ts:258-282`
**Issue:** `POST /logout` doesn't call `authenticateToken`. An attacker who MITMs the logout request and replaces the token keeps the victim's session alive. Returns 200 OK regardless.
**Fix:** Mount `authenticateToken` on logout. Invalidate by `userId` not token hash.
**Effort:** 1h

### FINDING-1.1-007 — HIGH: Session Revocation Disabled in Demo Mode
**File:** `backend/src/middleware/auth.ts:44`
**Issue:** Server-side `LoginSession` validation skipped in demo mode. Combined with FINDING-1.1-001, there is no way to terminate any session in demo mode.
**Fix:** Startup hard-abort if `DEMO_MODE=true && NODE_ENV=production`.
**Effort:** 0.5h

### FINDING-1.1-008 — HIGH: JWT Secret Entropy Not Validated
**File:** `backend/src/routes/auth.ts:109`
**Issue:** `JWT_SECRET` presence checked but entropy not validated. A weak secret like "secret" is trivially brute-forceable offline against captured JWTs.
**Fix:** Require `≥32 bytes` at startup. Consider RS256 migration.
**Effort:** 2h (validation) / 8h (RS256)

### FINDING-1.1-009 — HIGH: Refresh Not Rate-Limited; Session Expiry Not Enforced
**File:** `backend/src/routes/auth.ts:286-366`
**Issue:** Rate limiter keys on email, but refresh sends no email. No per-user session count limit. `LoginSession.expiresAt` set but never checked in `authenticateToken`.
**Fix:** Enforce `expiresAt` check. Limit active sessions per user to 5.
**Effort:** 3h

### FINDING-1.1-010 — HIGH: CIDR Matching Broken in IP Allowlist
**File:** `backend/src/services/mfaService.ts:165-169`
**Issue:** CIDR matching uses string `startsWith` on first 3 octets. `192.168.1.0/24` permits `192.168.10.x`, `192.168.100.x`, etc. Currently orphaned (not called), but if wired would be a security failure.
**Fix:** Use `cidr-matcher` library or implement bitmask matching.
**Effort:** 2h

### Additional findings: 7 MEDIUM, 2 LOW (MFA verify invalidates all sessions, MFA disable doesn't revoke sessions, no rate limit on MFA verify, TOTP secret stored unencrypted, no account lockout, Cognito tokens bypass session revocation, demo credentials in source).

---

## 1.2 Authorization & Privilege Escalation + 1.3 Injection Attacks

**Agent:** §1.2-1.3 RBAC + IDOR + Injection | **Findings:** 10 (1 CRITICAL, 3 HIGH, 3 MEDIUM, 2 LOW)

### FINDING-1.2-001 — CRITICAL: Mass Assignment in User Creation
**File:** `backend/src/routes/admin.ts:721-741`
**Issue:** `permissions` object from `req.body` spread directly into `prisma.user.create()`. Any super-admin can set arbitrary `perm*` boolean columns (permAccessPHI, permManageUsers, permExportData) on new users.
**Fix:** Explicit allowlist of permitted permission keys.
**Effort:** 1h

### FINDING-1.2-002 — HIGH: Any Authenticated User Can Invite Super-Admin
**File:** `backend/src/routes/invite.ts:14-34`
**Issue:** `POST /api/users/invite` has no `authorizeRole` guard. A `viewer` or `analyst` can send an invite with `role: 'SUPER_ADMIN'`.
**Fix:** Add `authorizeRole(['super-admin', 'hospital-admin'])`. Only super-admin can assign super-admin role.
**Effort:** 1h

### FINDING-1.2-003 — HIGH: Missing authorizeRole on /gaps/:moduleId/detailed
**File:** `backend/src/routes/gaps.ts:187`
**Issue:** Full patient list with names, MRN, DOB accessible by any authenticated user with any role (including viewer). PHI redaction only applies to analyst/quality-director, not viewer.
**Fix:** Add `authorizeRole` matching other gap endpoints.
**Effort:** 0.5h

### FINDING-1.2-004 — HIGH: DEMO_MODE Bypass — Inconsistent Guard
**File:** `backend/src/middleware/auth.ts:17`, `tierEnforcement.ts:104`
**Issue:** Each middleware reads `process.env.DEMO_MODE` independently. If server.ts guard is bypassed (Lambda context, test harness), all middlewares still honor DEMO_MODE.
**Fix:** Shared `isDemoMode()` function from single module with env gate.
**Effort:** 2h

### Injection Assessment: **No SQL injection, command injection, or prototype pollution found.** All DB access uses Prisma parameterized queries. Zero `exec/spawn/eval/new Function` calls. One `prisma.$queryRaw` (health check only, tagged template literal).

---

## 1.4-1.6 DoS + Data Exposure + Network Security

**Agent:** §1.4-1.6 | **Findings:** 20 (1 CRITICAL, 6 HIGH, 6 MEDIUM, 4 LOW)

### FINDING-1.4-001 — CRITICAL: JWT Stored in localStorage (XSS-Stealable)
**File:** `src/auth/AuthContext.tsx:401-403`
**Issue:** Access token, refresh token, and full user object (email, name, hospitalId, role, permissions) in `localStorage`. 12+ files read from `localStorage.getItem('tailrd-session-token')`. Single XSS = total session compromise.
**Fix:** Move to `httpOnly Secure SameSite=Strict` cookies. Remove all localStorage token access.
**Effort:** 8h

### FINDING-1.4-002 — HIGH: Unbounded findMany on TherapyGap + Patient Join
**File:** `backend/src/routes/gaps.ts:202`
**Issue:** No `take` clause on `therapyGap.findMany` with `include: { patient }`. Hospital with 250K gaps loads entire result into heap.
**Fix:** Add `take: 500` with cursor pagination.
**Effort:** 1h

### FINDING-1.4-003 — HIGH: Raw Error Messages in 30+ Production Routes
**File:** Multiple (clinicalIntelligence.ts, breachNotification.ts, files.ts, auditExport.ts, cqlRules.ts, content.ts)
**Issue:** `{ error: err.message }` returned unconditionally in catch blocks. Prisma errors include table names, column names, query fragments.
**Fix:** Shared `safeErrorResponse()` helper returning generic message in production.
**Effort:** 3h

### FINDING-1.4-004 — HIGH: CDS Hooks Endpoint Has No Rate Limiting
**File:** `backend/src/server.ts:153`, `backend/src/routes/cdsHooks.ts`
**Issue:** `/cds-services` mounted before `/api/` rate limiter. JWT check disabled in non-production. Unlimited unauthenticated requests triggering DB queries.
**Fix:** Apply rate limiter to `/cds-services` path.
**Effort:** 1h

### Additional: 5 unbounded query findings (MEDIUM), CORS empty-string origin (HIGH), CSRF bypass on password-reset/confirm (MEDIUM), environment disclosure in health endpoint (MEDIUM), CSP unsafe-inline (LOW), Redis console.log bypass (LOW).

---

## 1.9 Audit Logging Completeness

**Agent:** §1.9 | **Findings:** 14 (0 CRITICAL, 6 HIGH, 7 MEDIUM, 0 LOW + 1 PHI-in-log finding)

### Audit Event Coverage Summary

| Event Type | Logged? |
|------------|---------|
| User login success | YES |
| User login failure | YES |
| User logout | YES |
| Password reset requested | **NO** |
| Password reset completed | **NO** |
| MFA enabled/disabled | YES |
| Patient record read | YES |
| Patient record modified | **NO** |
| Patient record deleted | **NO** |
| Therapy gap viewed | **NO** |
| Therapy gap actioned | YES |
| Data export (general) | **NO** |
| Admin: hospital created | YES |
| Admin: hospital modified | YES |
| Admin: user created | YES |
| Admin: user role changed | PARTIAL |
| Admin: user deactivated | PARTIAL |
| GOD view accessed | YES |
| Webhook received | **NO** |
| DSAR request/deletion | YES |
| File uploaded | YES |
| File downloaded | **NO** |
| Notification prefs changed | YES |

**8 event types not logged. 4 inadequately logged. 1 PHI leak (MRN in PATIENT_MERGED description). 1 immutability violation (auditLog.update in dataRequests.ts:244).**

---

## 1.IDOR — Systematic Route Security Matrix

**Agent:** §1 IDOR Route Scan | **Findings:** 8 (3 CRITICAL, 4 HIGH, 1 MEDIUM)

### CRITICAL IDOR Findings

| Finding | Route | Issue |
|---------|-------|-------|
| IDOR-001 | `POST /cds-services/tailrd-cardiovascular-gaps` | Patient lookup by fhirPatientId with NO hospitalId — cross-tenant gap exposure |
| IDOR-002 | `POST /cds-services/tailrd-discharge-gaps` | Same as above — discharge hook |
| IDOR-003 | `POST /api/cql/batch-evaluate` | patientIds array from body with no hospital ownership check |

### HIGH IDOR Findings

| Finding | Route | Issue |
|---------|-------|-------|
| IDOR-004 | `PATCH /api/clinical/interventions/:id/status` | TOCTOU: findFirst checks hospitalId, update uses bare `where: { id }` |
| IDOR-005 | `PATCH /api/clinical/contraindications/:id/override` | Same TOCTOU pattern |
| IDOR-006 | `POST /api/phenotypes/screen/:patientId` | No patient ownership check before screening |
| IDOR-007 | `GET /api/referrals/patient/:patientId` | Patient ownership not verified at route layer |

### Route Security Matrix

**120+ routes audited across 29 route files.** Full matrix available in agent output. Summary:
- **SAFE:** 108 routes (proper hospitalId scoping, auth middleware, tenant verification)
- **VULNERABLE:** 5 routes (cross-tenant data access possible)
- **PARTIAL:** 7 routes (some operations checked, some not; TOCTOU patterns)

---

## 1.L Live API Penetration Test Results

**Tests run against production `api.tailrd-heart.com` with valid bearer token.**

| Test | Result |
|------|--------|
| CORS: evil-site.com origin | PASS — not reflected |
| CORS: null origin | PASS — not reflected |
| Security headers (HSTS, X-Frame, X-Content-Type, Referrer-Policy) | PASS — all present |
| X-Powered-By suppressed | PASS — Helmet active |
| Rate limiting on /auth/login | PASS — 429 after 8 attempts |
| Cross-tenant IDOR (fake patient ID) | PASS — HTTP 404 |
| Unauthenticated /api/patients | PASS — HTTP 401 |
| alg:none JWT attack | PASS — rejected (HTTP 403) |
| Tampered SUPER_ADMIN JWT | PASS — rejected (HTTP 403) |
| Expired/invalid JWT | PASS — rejected (HTTP 403) |
| SQL injection in search parameter | PARTIAL — safe (Prisma parameterized) but non-JSON error response |
| Path traversal on /api/files | PASS — HTTP 404 |
| Hospital admin → super-admin dashboard | PASS — HTTP 403 |
| Hospital admin → create user in other hospital | PASS — HTTP 403 |
| CDS Hooks discovery (public) | PASS — HTTP 200 |
| CDS Hooks POST without JWT | PASS — HTTP 403 (JWT verification active) |
| JWT claims decoded | Token lifetime: 60 minutes. Algorithm: HS256. Contains: userId, email, role, hospitalId, hospitalName, permissions (full module/view/action map). |

---

## Phase 1 Checkpoint

**Status:** Phase 1 COMPLETE. 71+ findings documented. 7 CRITICAL, 27 HIGH.

**Top 5 Critical Fixes (before any other work):**

1. **Move JWT to httpOnly cookie** (FINDING-1.4-001) — eliminates XSS token theft. 8h.
2. **Mount requireMFA globally** (FINDING-1.1-002) — closes pre-MFA PHI access. 4h.
3. **Add hospitalId to CDS Hooks patient lookup** (IDOR-001, IDOR-002) — closes cross-tenant gap exposure. 2h.
4. **Fix mass assignment in user creation** (FINDING-1.2-001) — closes permission escalation. 1h.
5. **Remove demo-mode token acceptance in catch block** (FINDING-1.1-001) — closes tampered-token bypass. 0.5h.

---

## 1.7-1.8 Supply Chain & CI/CD Security + Secrets & Credential Hygiene

**Agent:** §1.7-1.8 | **Findings:** 21 (3 CRITICAL, 8 HIGH, 6 MEDIUM, 2 LOW)

### FINDING-1.8-001 — CRITICAL: Live AWS IAM Key on Disk
**File:** `backend/.env:15-16`
**Issue:** Real AWS IAM access key `AKIA4SDNVPUGEZOYLPVG` + secret key present on disk. Comment says "ROTATE IMMEDIATELY". Same file has 126-char JWT secret and 64-char PHI encryption key in plaintext. File is in `.gitignore` but existed on disk in cloned repo. Git history shows prior commits of `terraform.tfvars` with AWS account IDs, VPC IDs, subnet IDs, security groups, KMS ARNs.
**Fix:** Immediately rotate IAM key, JWT_SECRET (invalidates all sessions), and PHI_ENCRYPTION_KEY (requires re-encryption migration). Purge from git history with `git filter-repo`. Enable GitHub secret scanning push protection.
**Effort:** 5-9h

### FINDING-1.8-002 — CRITICAL: Infrastructure Secrets in Git History
**File:** `terraform/terraform.tfvars` (committed in `19a9dbc`, removed in `db4e90a`)
**Issue:** AWS Account ID, all 6 subnet IDs, 3 security group IDs, 2 KMS key ARNs, S3 bucket names all accessible via `git show 19a9dbc:terraform/terraform.tfvars`. Full network topology reconstructible.
**Fix:** `git filter-repo` to purge. Ensure `.gitignore` covers `terraform.tfvars` and `.terraform/`.
**Effort:** 2h

### FINDING-1.7-001 — CRITICAL: Mutable Action Tags in Production Deploy
**File:** `.github/workflows/deploy.yml:24,27,35`
**Issue:** `actions/checkout@v4`, `aws-actions/configure-aws-credentials@v4`, `aws-actions/amazon-ecr-login@v2` — all mutable tags. Runner has `id-token: write` + AWS credentials. Supply chain compromise = production AWS access.
**Fix:** Pin all to commit SHAs. `backend/.github/workflows/deploy.yml` already does this — root-level is the exception.
**Effort:** 0.5h

### FINDING-1.7-002 — HIGH: `prisma db push --accept-data-loss` in Production CMD
**File:** `backend/Dockerfile:38`
**Issue:** Production CMD falls back to `db push --accept-data-loss` if `migrate deploy` fails. Can DROP COLUMNS with PHI. `2>/dev/null` suppresses all errors. This pattern caused the April 7 incident.
**Fix:** `CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]` — fail hard, no fallback.
**Effort:** 0.5h

### FINDING-1.7-003 — HIGH: Math.random() in ECG AI Clinical Probabilities
**File:** `backend/src/services/ecgAIService.ts:510-511,545,548`
**Issue:** Returns `probability: 0.87 + Math.random() * 0.1` and `confidence: 0.82 + Math.random() * 0.1` as clinical inference results. CLAUDE.md states ECG AI pipeline "is NOT covered by CDS exemption and should not be activated without FDA clearance." Random-but-realistic AF probabilities could be acted on by clinicians.
**Fix:** Hard-disable ECG AI behind `ECG_AI_ENABLED=false` feature flag. Return HTTP 403 with FDA clearance message.
**Effort:** 2h

### FINDING-1.7-004 — HIGH: Math.random() for Clinical Risk Scores
**File:** `backend/src/cql/cqlEngine.ts:475`, `backend/src/routes/cqlRules.ts:862-867`
**Issue:** CQL engine generates `score` using `Math.floor(Math.random() * 100)`. Batch evaluation generates random `riskScore`, `qualityScore`. Non-deterministic clinical scoring violates FDA CDS exemption.
**Fix:** Replace with deterministic rule-based scoring or return 501 Not Implemented.
**Effort:** 4-8h

### FINDING-1.7-005 — HIGH: Static IAM Keys Instead of OIDC
**File:** Both deploy workflows
**Issue:** `id-token: write` declared but static IAM keys used. Long-lived credentials stored as GitHub Secrets.
**Fix:** Implement OIDC-based AWS authentication via `role-to-assume`.
**Effort:** 3h

### FINDING-1.7-006 — HIGH: Mutable `:latest` Docker Tag Pushed
**File:** Both deploy workflows
**Issue:** Both push `$IMAGE_URI:latest` alongside SHA tag. Compromised branch → `:latest` overwrite → next ECS scale-out pulls malicious image.
**Fix:** Remove `:latest` push. ECS task defs reference SHA tag only.
**Effort:** 0.5h

### Additional: Blocking bcrypt at module load (HIGH), plaintext JWT in CI workflow (HIGH), no Secrets Manager integration (MEDIUM), no container image scanning (MEDIUM), no frontend npm audit in CI (MEDIUM), Math.random for record IDs (MEDIUM), DEMO_MODE=true default in .env.example (MEDIUM), Dependabot un-pins SHAs (LOW), no CODEOWNERS file (LOW).

---

## Phase 1 — Final Severity Count

| Severity | §1.1 JWT | §1.2 RBAC | §1.4-1.6 DoS/Net | §1.7-1.8 Supply | §1.9 Audit | §1.IDOR | **Total** |
|----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| CRITICAL | 2 | 1 | 1 | 3 | 0 | 3 | **10** |
| HIGH | 8 | 3 | 6 | 8 | 6 | 4 | **35** |
| MEDIUM | 7 | 3 | 6 | 6 | 7 | 1 | **30** |
| LOW | 2 | 2 | 4 | 2 | 0 | 0 | **10** |
| **Total** | **19** | **10** | **20** | **21** | **14** | **8** | **92** |

---

## Phase 1 Top 10 Critical/High Fixes (Priority Order)

| # | Finding | File | Impact | Effort |
|---|---------|------|--------|--------|
| 1 | Rotate compromised AWS IAM key | `backend/.env` | Full AWS account access | **NOW** |
| 2 | Pin mutable action tags in deploy workflow | `.github/workflows/deploy.yml` | Supply chain → prod | 0.5h |
| 3 | Move JWT to httpOnly cookie | `AuthContext.tsx:401` | XSS → full session theft | 8h |
| 4 | Mount requireMFA globally | `server.ts` mounts | Pre-MFA token → PHI | 4h |
| 5 | Add hospitalId to CDS Hooks patient lookup | `cdsHooks.ts:114,286` | Cross-tenant PHI | 2h |
| 6 | Fix Dockerfile CMD (remove db push fallback) | `Dockerfile:38` | Data loss in production | 0.5h |
| 7 | Fix mass assignment in user creation | `admin.ts:740` | Permission escalation | 1h |
| 8 | Remove demo-mode token acceptance in catch | `auth.ts:72` | Tampered token → superadmin | 0.5h |
| 9 | Disable ECG AI endpoint | `ecgAIService.ts` | Random clinical probabilities | 2h |
| 10 | Fix invite endpoint (any user → SUPER_ADMIN) | `invite.ts:14` | Privilege escalation | 1h |

**Estimated total for top 10:** ~20 hours of focused engineering work.

---

# PHASE 2: HIPAA COMPLIANCE & REGULATORY

**Reviewer persona:** HIPAA compliance officer conducting Security Rule risk analysis and Privacy Rule audit.
**Agents deployed:** 4 parallel
**Total findings:** ~45+ (pending Agent 4 final count)

---

## 2.1 PHI Encryption at Rest (§164.312(a)(2)(iv))

**Agent:** §2.1 PHI Encryption | **Findings:** 17 (1 CRITICAL, 7 HIGH, 6 MEDIUM, 3 LOW)

### Key Discovery: 146 PHI Fields Inventoried Across 40+ Models

The agent produced a complete field-by-field PHI inventory. Of 146 identified PHI fields:
- **~35 fields** currently encrypted via `PHI_FIELD_MAP` or `PHI_JSON_FIELDS`
- **~25 JSON fields** containing clinical data are NOT encrypted (TherapyGap.barriers, Encounter.diagnosisCodes, CdsHooksSession.fhirContext, AuditLog.previousValues/newValues, CarePlan.goals/activities, etc.)
- **~15 DateTime fields** (dates of service, lab dates, onset dates) silently bypass encryption due to `typeof === 'string'` type check

### FINDING-2.1-001 — CRITICAL: Silent Plaintext in DEMO_MODE
**File:** `backend/src/middleware/phiEncryption.ts:48-53`
**Issue:** When `DEMO_MODE=true` AND `PHI_ENCRYPTION_KEY` absent, `encrypt()` returns plaintext unchanged. No guard, no warning. If demo mode reaches production with real data, all PHI stored cleartext.
**Fix:** Hard-fail if `DEMO_MODE=true` and Patient records exist. Log WARN at startup.
**Effort:** 4h

### FINDING-2.1-002 — HIGH: DateTime Fields Bypass Encryption
**File:** `phiEncryption.ts:89`
**Issue:** `Patient.dateOfBirth` is in PHI_FIELD_MAP but the `typeof data[field] === 'string'` check fails because Prisma sends `Date` objects for DateTime fields. dateOfBirth is silently NOT encrypted despite being in the map.
**Fix:** Convert Date to ISO string before encrypting. Restore on decrypt.
**Effort:** 4h

### FINDING-2.1-003 — HIGH: 25+ JSON Fields Not Encrypted
**Issue:** TherapyGap.barriers/recommendations, Encounter.diagnosisCodes, WebhookEvent.processedData, CdsHooksSession.fhirContext/cards, AuditLog.previousValues/newValues/metadata, CarePlan.goals/activities/careTeam, DrugTitration.barriers/monitoringPlan, DeviceEligibility.criteria/barriers/contraindications, CrossReferral.triggerData, CQLResult.result, RiskScoreAssessment.components, InterventionTracking.complications, ContraindicationAssessment.alternatives/monitoring — all store clinical PHI in JSON, all stored plaintext.
**Fix:** Add each to `PHI_JSON_FIELDS` in phiEncryption.ts.
**Effort:** 4h (code) + migration for existing rows

### FINDING-2.1-004 — HIGH: updateMany Not Covered
**File:** `phiEncryption.ts:136`
**Issue:** Write-path encrypt handles create/update/upsert/createMany but NOT `updateMany`. Bulk updates to encrypted fields bypass encryption.
**Fix:** Add `updateMany` to the action list.
**Effort:** 1h

### FINDING-2.1-005 — HIGH: No Key Rotation Mechanism
**Issue:** All PHI encrypted under single static key. No versioning, no rotation pathway. Key compromise = all historical PHI exposed.
**Fix:** Key version prefix scheme + rotation script.
**Effort:** 16h

### Additional: AuditLog.userEmail plaintext (HIGH), IP addresses plaintext in 5 models (MEDIUM), key length validation missing (MEDIUM), decrypt errors silently swallowed (MEDIUM), BreachIncident.affectedPatientIds array not encrypted (MEDIUM), UserMFA.backupCodes array not encrypted (MEDIUM), Patient.race/ethnicity not encrypted (LOW), DeviceImplant.modelNumber not encrypted (LOW).

---

## 2.2-2.3 Access Controls + Audit Controls

**Agent:** §2.2-2.3 | **Findings:** 12 (1 CRITICAL, 5 HIGH, 5 MEDIUM, 1 LOW)

### FINDING-2.2-001 — CRITICAL: Audit Log Records Mutable
**File:** `backend/src/routes/dataRequests.ts:244`
**Rule:** §164.312(b)
**Issue:** `prisma.auditLog.update()` mutates existing audit records. HIPAA requires tamper-evident, append-only audit logs.
**Fix:** Remove the update call. Use chain of immutable append entries. Revoke UPDATE on `audit_logs` table from app DB user.
**Effort:** 4h

### FINDING-2.2-002 — HIGH: Audit Logs on Ephemeral Filesystem
**File:** `backend/src/middleware/auditLogger.ts:7-8`
**Issue:** File-based audit logs written to ECS Fargate ephemeral storage. Lost on task replacement.
**Fix:** Ship to CloudWatch Logs with 6-year retention, or S3 with Object Lock.
**Effort:** 8h

### FINDING-2.2-003 — HIGH: No Anomalous Access Detection
**Issue:** Audit log records exist but are never analyzed for bulk PHI harvesting, off-hours access, or cross-patient enumeration.
**Fix:** Redis-backed counter alerting on >50 unique patients per 5-minute window.
**Effort:** 1-2 days

### Role-Based Field Scoping Matrix

| Role | /patients list | /patients detail | Sees Name | Sees MRN | Sees DOB | Encounters | Observations |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| physician | YES | YES | Full | Full | Full | Full | Full |
| hospital-admin | YES | YES | Full | Full | Full | Full | Full |
| quality-director | YES | YES | `***` | `***` | null | **FULL (gap!)** | **FULL (gap!)** |
| analyst | YES | YES | `***` | `***` | null | Not allowed | Not allowed |

**Gap:** quality-director sees full encounter and observation detail (including all clinical data) without redaction. §164.502(b) Minimum Necessary violated.

### Additional: Missing authorizeRole on /gaps/:moduleId/detailed (MEDIUM), riskCategory not redacted for analyst role (MEDIUM), PHI mutations not audited (MEDIUM), patientId not captured in audit DB records (MEDIUM).

---

## 2.4-2.5 Transmission Security + DSAR + Breach

**Agent:** §2.4-2.5 | **Findings:** 10 (0 CRITICAL, 3 HIGH, 5 MEDIUM, 2 LOW)

### DSAR Deletion Cascade — 6 Models Missing

| Model | In DSAR? | Gap |
|-------|:---:|---|
| Patient → Encounter → Observation → Medication → Condition → TherapyGap → CQLResult → Phenotype → CrossReferral → DrugTitration → DeviceEligibility → RiskScoreAssessment → InterventionTracking → ContraindicationAssessment → Alert → Recommendation → CarePlan | YES | — |
| **Order** | **NO** | Prescriptions, lab orders with PHI |
| **Procedure** | **NO** | CPT codes, performing provider |
| **DeviceImplant** | **NO** | Device type, implant date |
| **AllergyIntolerance** | **NO** | Substance, severity |
| **BpciEpisode** | **NO** | Episode type, financial data |
| **DrugInteractionAlert** | **NO** | Drug names, interaction details |
| **WebhookEvent** | **NO** | Raw FHIR payloads with full patient PHI (no patientId FK) |

**FINDING-2.5-001 — HIGH:** 6 patient-linked models omitted from both DSAR deletion AND export. §164.524 (right of access) and erasure rights violated.
**FINDING-2.5-002 — HIGH:** WebhookEvent.rawPayload contains full patient FHIR bundles but has no patientId FK — cannot be cascade-deleted. PHI persists indefinitely after DSAR.
**FINDING-2.5-003 — HIGH:** Breach 60-day deadline check (`checkBreachDeadlines()`) exists as HTTP endpoint but is NOT wired to any cron job. Manual polling required.

### Additional: No HTTP→HTTPS redirect at app layer (MEDIUM), DATABASE_URL missing sslmode=require (MEDIUM), Redis TLS not enforced (LOW-MEDIUM), PatientDataRequest model defined but never used (MEDIUM), breach notification delivery fully manual (MEDIUM), no HHS-compliant notification templates (MEDIUM).

---

## 2.6-2.7 BAA + SOC 2 + FDA SaMD + State Privacy

**Agent:** §2.6-2.7 | **Findings:** 15 (3 CRITICAL, 6 HIGH, 4 MEDIUM, 0 LOW)

### FINDING-2.6-001 — CRITICAL: No BAA Executed for ANY Vendor
**File:** `docs/BAA_REGISTER.md`
**Issue:** TAILRD went live in production on April 7 receiving, storing, and processing PHI on AWS infrastructure. BAA_REGISTER.md shows ALL vendors as "PENDING." AWS BAA requires a single click in AWS Artifact — it has not been done. Redox BAA requires contacting compliance@redoxengine.com — not initiated. Under 45 CFR §164.502(e), operating without BAAs constitutes unauthorized disclosure of PHI to business associates.
**Fix:** Execute AWS BAA via AWS Artifact (10 minutes). Email Redox legal immediately.
**Effort:** 10 minutes (AWS) + 1-3 business days (Redox)

### FINDING-2.6-002 — CRITICAL: Redox BAA Not Initiated Before EHR Connection
**Issue:** The Redox EHR integration is receiving live FHIR bundles containing full patient demographics, diagnoses, and medications — with no executed BAA.

### FINDING-2.7-001 — CRITICAL: ECG AI Pipeline Requires 510(k) If Activated
**File:** `backend/src/ai/` (5 files)
**Issue:** Complete ML inference pipeline for ECG analysis (amyloidosis, HCM, ARVC, AF detection). Currently dormant (no model weights, not routed). But no runtime feature flag prevents accidental activation. CLAUDE.md acknowledges: "NOT covered by CDS exemption — should not be activated without FDA clearance."
**Fix:** Add `ECG_AI_ENABLED=false` env var gate in pipeline init. Hard-fail if called without gate.
**Effort:** 2h

### SOC 2 Type II Readiness Scores

| Trust Service Criterion | Score | Key Gap |
|------------------------|:---:|--------|
| Security — CC6 (Logical Access) | 5/10 | No access reviews, VIEWER PHI leak, no PAW policy |
| Security — CC7 (Operations) | 4/10 | No SIEM, no pen test, no change mgmt process |
| Availability — A1 | 3/10 | No cross-region DR, backup tests unrun, no SLA |
| Processing Integrity — PI1 | 6/10 | 19 incomplete evidence objects, @ts-nocheck on clinical core |
| Confidentiality — C1 | 3/10 | 13 PHI models unencrypted, ingest bypasses encryption |
| Privacy — P1-P8 | 2/10 | No PIA, incomplete DSAR, no minimum necessary enforcement |
| **Overall** | **3.5/10** | |

### FDA CDS Exemption Assessment
- **257 gap rules** have `evidence:` key present. **19 rules** have incomplete evidence objects (missing guidelineSource or classOfRecommendation) — violates CDS transparency requirement.
- **No directive language** found in `action:` fields — all use "Consider" pattern. Compliant.
- **`target:` fields** use past-tense imperative forms ("Warfarin prescribed", "IV iron prescribed") — not a direct violation but could be misread by FDA reviewer.
- **ECG AI pipeline** would be Class II SaMD requiring 510(k) if activated. Currently dormant — must remain so.

### State Privacy Law Assessment
| Law | Status | Key Gap |
|-----|--------|---------|
| California CMIA | **NON-COMPLIANT** | No CMIA analysis. CommonSpirit operates in CA. Private right of action. |
| Washington MHMDA | **NON-COMPLIANT** | No MHMDA posture. CommonSpirit operates in WA. Most aggressive state law. |
| New York SHIELD | **PARTIAL** | Gaps mirror HIPAA technical safeguard gaps. Mount Sinai = NY. |
| Illinois BIPA | **UNKNOWN** | ECG waveforms may be biometric identifiers. Requires legal counsel. |

---

## Phase 2 Severity Summary

| Severity | §2.1 PHI | §2.2-2.3 Access | §2.4-2.5 DSAR | §2.6-2.7 Regulatory | **Total** |
|----------|:---:|:---:|:---:|:---:|:---:|
| CRITICAL | 1 | 1 | 0 | 3 | **5** |
| HIGH | 7 | 5 | 3 | 6 | **21** |
| MEDIUM | 6 | 5 | 5 | 4 | **20** |
| LOW | 3 | 1 | 2 | 0 | **6** |
| **Total** | **17** | **12** | **10** | **15** | **54** |

## Phase 2 Top 10 Fixes (Priority Order)

| # | Finding | Impact | Effort |
|---|---------|--------|--------|
| 1 | **Execute AWS BAA** (2.6-001) | Operating without BAA = unauthorized PHI disclosure | **10 min** |
| 2 | **Initiate Redox BAA** (2.6-002) | EHR integration without BAA | **1 email** |
| 3 | Fix DEMO_MODE silent plaintext (2.1-001) | All PHI unencrypted if demo mode reaches prod | 4h |
| 4 | Fix DateTime encryption bypass (2.1-002) | Patient.dateOfBirth silently not encrypted | 4h |
| 5 | Remove auditLog.update() (2.2-001) | Mutable audit trail = compliance failure | 4h |
| 6 | Add 6 missing models to DSAR cascade (2.5-001) | Incomplete erasure = §164.524 violation | 4h |
| 7 | Add ECG_AI_ENABLED feature flag (2.7-001) | Prevent accidental FDA SaMD activation | 2h |
| 8 | Wire breach deadline check to cron (2.5-003) | Silent 60-day OCR deadline miss | 1h |
| 9 | Ship audit logs to CloudWatch (2.2-002) | Logs lost on ECS task replacement | 8h |
| 10 | Extend PHI_JSON_FIELDS to 25+ unencrypted fields (2.1-003) | Clinical JSON stored plaintext | 4h |

**Items #1 and #2 are the single highest-priority actions across the entire audit. They require zero code changes and can be completed today.**

---

## Running Totals (Phase 1 + Phase 2)

| Severity | Phase 1 | Phase 2 | **Cumulative** |
|----------|:---:|:---:|:---:|
| CRITICAL | 10 | 5 | **15** |
| HIGH | 35 | 21 | **56** |
| MEDIUM | 30 | 20 | **50** |
| LOW | 10 | 6 | **16** |
| **Total** | **92** | **54** | **146** |

---

# PHASE 3: CLINICAL LOGIC & ACCURACY

**Reviewer persona:** Cardiologist with informatics training. Will not let a single wrong drug code or incorrect threshold pass.
**Agents deployed:** 4 parallel
**Total findings:** 38 (6 CRITICAL, 14 HIGH, 11 MEDIUM, 7 LOW)

**This is the most clinically dangerous section of the entire audit.** Six CRITICAL findings directly affect patient safety — wrong drug codes, wrong lab codes, and discontinued medications suppressing valid gap flags.

---

## 3.2 RxNorm Drug Code Audit

**Agent:** §3.2 RxNorm | **Findings:** 9 (3 CRITICAL, 3 HIGH, 2 MEDIUM, 1 LOW)
**66 drug codes audited across gapRuleEngine.ts and cardiovascularValuesets.ts**

### FINDING-3.2-001 — CRITICAL: Atorvastatin ↔ Simvastatin RxNorm Codes Transposed
**File:** `cardiovascularValuesets.ts:256-258` + `gapRuleEngine.ts:3269,4439,4617`
**Issue:** `ATORVASTATIN: '36567'` (should be `83367`) and `SIMVASTATIN: '83367'` (should be `36567`). Fully swapped. Cascades to 3 inline statin arrays. Patients on atorvastatin (most common high-intensity statin) are incorrectly flagged as "no statin." Patients on simvastatin incorrectly suppress the gap.
**Clinical impact:** Affects every CAD statin gap, PAD statin gap, and ezetimibe add-on gap. Thousands of patients in any health system.
**Fix:** Swap the two values. 0.5h.

### FINDING-3.2-002 — CRITICAL: Ivabradine Code Off by 1 Digit
**File:** `cardiovascularValuesets.ts:194` + `gapRuleEngine.ts:3462`
**Issue:** `IVABRADINE: '1649480'` — correct is `1649380`. Code doesn't exist in any formulary. All HFrEF patients on ivabradine will still have the ivabradine gap fire (false positive). 
**Fix:** Change to `1649380`. 0.25h.

### FINDING-3.2-003 — CRITICAL: Furosemide Labeled as Flecainide in EP-PFA Rule
**File:** `gapRuleEngine.ts:6558`
**Issue:** AAD array `['4603', ...]` — `4603` is furosemide (loop diuretic), not flecainide (`4441`). PFA candidacy gap fires for every diuretic user (nearly the entire HF population) instead of patients on class IC antiarrhythmics.
**Fix:** Change `4603` to `4441`. 0.25h.

### Additional HIGH findings: Metoprolol ingredient code (`6918`) used where succinate-specific (`866514`) required for HFrEF; GLP-1 RA codes unverified. MEDIUM: 17 inline duplicate code arrays; 3 copy-pasted wrong triggerCriteria. LOW: Finerenone only checks 10mg dose, not 20mg.

---

## 3.3-3.4 LOINC + ICD-10 Code Audit

**Agent:** §3.3-3.4 | **Findings:** 11 (2 CRITICAL, 5 HIGH, 3 MEDIUM, 1 LOW)
**51 LOINC codes audited + 5 ICD-10 code sets checked for completeness**

### FINDING-3.3-001 — CRITICAL: QTc Interval Assigned Heart Rate LOINC Code
**File:** `cardiovascularValuesets.ts:133`
**Issue:** `QTC_INTERVAL: '8867-4'` — this is Heart Rate, not QTc. Correct codes: `8601-7` (general QTc), `8634-0` (Bazett), `8636-5` (Fridericia). FHIR observations for QTc will never match this code — QTc safety alerts will not fire from Redox data. 
**Fix:** Change to `8601-7`. 0.25h.

### FINDING-3.3-002 — CRITICAL: NT-proBNP Routing Code Doesn't Exist
**File:** `observationService.ts:42`
**Issue:** `'33762-9'` — should be `'33762-6'` (check digit transposition). `33762-9` is not a registered LOINC code. All NT-proBNP from FHIR will be unrecognized. NT-proBNP is the primary HF biomarker.
**Fix:** Change `9` to `6`. 0.25h.

### HIGH findings: hs-Troponin I mapped to conventional code (not `89579-7`); QRS duration mapped to LVEF code `10230-1` in loinc.ts; hs-troponin codes absent from FHIR routing; BNP code `42757-5` nonexistent; eGFR labeled CKD-EPI but code is MDRD (`33914-3` → should be `62238-1`).

### MEDIUM: ICD-10/LOINC valuesets from cardiovascularValuesets.ts NOT IMPORTED by gap engine — centralized codes unused at runtime. Ferritin/creatinine/potassium codes inconsistent across files. @ts-nocheck on gapRuleEngine.ts.

### ICD-10 completeness: HF (COMPLETE), AF (COMPLETE), CAD (COMPLETE), PAD (PARTIALLY COMPLETE — missing laterality sub-codes but `startsWith` matching covers them), AS (COMPLETE).

---

## 3.5-3.6 Race/Gender/Equity + Guideline Accuracy

**Agent:** §3.5-3.6 | **Findings:** 12 (0 CRITICAL, 5 HIGH, 4 MEDIUM, 3 LOW)

### FINDING-3.5-001 — HIGH: CHA₂DS₂-VASc Uses Age-Only Proxy
**File:** `gapRuleEngine.ts:3916-3946`
**Issue:** EP-OAC-AFIB rule uses `age >= 65` as proxy for elevated CHA₂DS₂-VASc. Misses high-risk young patients (55yo with HTN+DM+stroke = score 5). No sex-specific thresholds (male ≥2, female ≥3). This is the highest-volume gap in cardiology.
**Fix:** Implement actual CHA₂DS₂-VASc calculation from available dx codes. 4h.

### FINDING-3.5-002 — HIGH: HFpEF SGLT2i Shows Class 1 LOE A, Should Be Class 2a LOE B-R
**File:** `gapRuleEngine.ts:3831-3832`
**Issue:** 2023 ACC focused update assigns SGLT2i for HFpEF/HFmrEF as Class 2a (not 1). Overstating evidence strength to clinicians violates FDA CDS transparency.
**Fix:** Change class to `'2a'` and LOE to `'B-R'`. 0.25h.

### FINDING-3.5-003 — HIGH: Hemoglobin Anemia Threshold Not Sex-Specific
**File:** `gapRuleEngine.ts:9941`
**Issue:** Uses `hemoglobin < 10` for all. WHO criteria: male <13.0, female <12.0. Misses the vast majority of anemic HF patients (Hgb 10-13 range = 30-50% of HF population).
**Fix:** Sex-specific thresholds. 0.5h.

### FINDING-3.5-004 — HIGH: Iron Deficiency Rule Missing LVEF ≤45% and NYHA II-III Gates
**File:** `gapRuleEngine.ts:3245-3269`
**Issue:** Fires for ANY HF patient with low ferritin. Guideline requires LVEF ≤45% AND NYHA II-III.
**Fix:** Add gates. 1h.

### Race field audit: A-HeFT rule (HF-19) correctly queries `race?.toUpperCase() === 'BLACK'` — field is correct, threshold correct (LVEF ≤40%). Missing RAAS intolerance check context. Race-free eGFR: PASS — engine doesn't calculate eGFR, receives as input.

### 3 copy-pasted evidence objects with wrong trigger text (RAAS rule has PAD statin text, MRA has BB text). SGLT2i HFpEF missing NYHA gate.

---

## 3.7-3.9 Edge Cases + Architecture + DRG

**Agent:** §3.7-3.9 | **Findings:** 6 (1 CRITICAL, 1 HIGH, 2 MEDIUM, 2 LOW)

### FINDING-3.7-001 — CRITICAL: Discontinued Medications Not Filtered
**File:** `gapDetectionRunner.ts:51` + `runGapDetectionForPatient.ts:21`
**Issue:** Medication fetch includes ALL statuses (ACTIVE, DISCONTINUED, ON_HOLD, COMPLETED, ENTERED_IN_ERROR). A patient whose metoprolol was discontinued 2 years ago still has the BB RxNorm code in `medCodes`, suppressing the beta-blocker gap. **This produces dangerous false negatives across every medication-based gap rule.**
**Fix:** Add `.filter(m => m.status === 'ACTIVE')` to medication extraction. 0.5h.

### FINDING-3.7-002 — HIGH: Observation Staleness Not Enforced
**File:** `gapDetectionRunner.ts:79-82`
**Issue:** Lab value extraction takes the latest observation regardless of age. A 5-year-old LVEF reading suppresses imaging gaps. No dates passed to `evaluateGapRules()`.
**Fix:** Add max age cutoffs (12mo for echo, 6mo for labs). Architecture change needed to pass obs dates. 4h.

### Additional: LVEF null handling correct (PASS). Hospice exclusion correct (PASS). Contraindication checks present on all major rules (PASS). No duplicate gap IDs (PASS). guidelineVersion + lastReviewDate present on all registry entries (PASS). DRG codes in schema (PASS) but revenue calculation uses flat $2,500/gap estimate, not actual DRG payments (MEDIUM). No ICD-10→DRG crosswalk (MEDIUM).

---

## Phase 3 Severity Summary

| Severity | §3.2 RxNorm | §3.3-3.4 LOINC/ICD | §3.5-3.6 Equity/Guidelines | §3.7-3.9 Edge Cases | **Total** |
|----------|:---:|:---:|:---:|:---:|:---:|
| CRITICAL | 3 | 2 | 0 | 1 | **6** |
| HIGH | 3 | 5 | 5 | 1 | **14** |
| MEDIUM | 2 | 3 | 4 | 2 | **11** |
| LOW | 1 | 1 | 3 | 2 | **7** |
| **Total** | **9** | **11** | **12** | **6** | **38** |

## Phase 3 Top 10 Fixes — ALL Affect Patient Safety

| # | Finding | Impact | Effort |
|---|---------|--------|--------|
| 1 | **Swap atorvastatin/simvastatin codes** (3.2-001) | All statin gaps inverted | 0.5h |
| 2 | **Fix ivabradine code** (3.2-002) | All ivabradine patients missed | 0.25h |
| 3 | **Fix flecainide→furosemide** (3.2-003) | PFA fires for all diuretic users | 0.25h |
| 4 | **Fix QTc LOINC** (3.3-001) | QTc safety alerts fail from FHIR | 0.25h |
| 5 | **Fix NT-proBNP code** (3.3-002) | HF biomarker lost from FHIR | 0.25h |
| 6 | **Filter discontinued meds** (3.7-001) | All med gaps produce false negatives | 0.5h |
| 7 | **Implement CHA₂DS₂-VASc** (3.5-001) | AF anticoagulation — highest volume | 4h |
| 8 | **Add hs-troponin to FHIR routing** (3.3-005) | ATTR-CM screening from real EHR | 0.5h |
| 9 | **Sex-specific hemoglobin** (3.5-003) | Anemia missed in 30-50% of HF | 0.5h |
| 10 | **Fix iron deficiency gates** (3.5-004) | Over-detection in non-indicated patients | 1h |

**Items #1-6 are less than 2 hours total and fix the 6 most dangerous clinical errors in the platform. They should be fixed before any clinical demo.**

---

## Running Totals (Phase 1 + Phase 2 + Phase 3)

| Severity | Phase 1 | Phase 2 | Phase 3 | **Cumulative** |
|----------|:---:|:---:|:---:|:---:|
| CRITICAL | 10 | 5 | 6 | **21** |
| HIGH | 35 | 21 | 14 | **70** |
| MEDIUM | 30 | 20 | 11 | **61** |
| LOW | 10 | 6 | 7 | **23** |
| **Total** | **92** | **54** | **38** | **184** |

**Next phase:** Phase 4 (UI/UX & Design System) + Phase 5 (Multi-Tenancy) + Phase 5B (EHR Integration).

