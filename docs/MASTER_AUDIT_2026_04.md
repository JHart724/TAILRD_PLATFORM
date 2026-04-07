# TAILRD Heart Platform — Master Audit Report
## Phase 1 Complete | April 7, 2026
## 6 Specialist Agents + Codex Adversarial Review
## 121 Findings: 14 CRITICAL | 52 HIGH | 41 MEDIUM | 14 LOW

---

## Severity Distribution

| Domain | CRITICAL | HIGH | MEDIUM | LOW | Total |
|--------|----------|------|--------|-----|-------|
| Security Pentest | 4 | 8 | 5 | 2 | 19 |
| Clinical Codes | 1 | 6 | 4 | 1 | 12 |
| HIPAA Compliance | 3 | 12 | 8 | 3 | 26 |
| Infrastructure | 3 | 9 | 10 | 3 | 25 |
| UI/UX Design | 1 | 12 | 9 | 2 | 24 |
| Data Pipeline | 2 | 5 | 5 | 3 | 15 |
| **TOTAL** | **14** | **52** | **41** | **14** | **121** |

---


---
---

# SECTION 1 — SECURITY PENTEST REPORT

## FINDING-1: terraform.tfvars AND .terraform/ COMMITTED TO GIT — AWS ACCOUNT/VPC/KMS SECRETS EXPOSED

**Severity:** CRITICAL
**File:** `terraform/terraform.tfvars`
**Location:** Entire file; also `terraform/.terraform/` directory
**Category:** Secrets Exposure
**Issue:** `terraform.tfvars` is committed to git despite being in `.gitignore`. It contains the AWS account ID (`863518424332`), VPC ID, all subnet IDs, all security group IDs, and KMS key ARNs. The `.terraform/` provider directory is also committed. The `.gitignore` rules were added after these files were tracked.
**Impact:** Any attacker with repo access knows the exact AWS account, VPC topology, security group IDs, and KMS key ARNs. The KMS ARN for PHI encryption is exposed.
**Fix:** `git rm --cached terraform/terraform.tfvars terraform/.terraform/ -r`, commit, rotate any exposed secrets.
**Effort:** 1 hour
**Status:** FIXED (2026-04-07)

---

## FINDING-2: SESSION TOKEN HASH MISMATCH IN accountSecurity.ts — SESSION EXCLUSION LOGIC IS BROKEN

**Severity:** CRITICAL
**File:** `backend/src/routes/accountSecurity.ts`
**Location:** Lines 244-252 (change-password), lines 297-302 (list-sessions), lines 348-350 (delete-session)
**Category:** Authentication Bypass
**Issue:** The `auth.ts` middleware hashes tokens with SHA-256 before storing in `loginSession.sessionToken`. But `accountSecurity.ts` compares the raw JWT against the hashed column. The `{ not: currentToken }` filter compares raw JWT to SHA-256 hashes — never matches. Password change invalidates ALL sessions including current. Session listing and deletion guards are broken.
**Impact:** Broken session management. User is immediately logged out after changing password. Session listing shows no current session. Delete-session guard never fires.
**Fix:** Hash token before comparing: `const tokenHash = crypto.createHash('sha256').update(currentToken).digest('hex');` in all queries.
**Effort:** 1 hour
**Status:** OPEN — assigned to Bozidar

---

## FINDING-3: MASS ASSIGNMENT IN admin.ts PUT /users/:userId — ARBITRARY ROLE ESCALATION

**Severity:** CRITICAL
**File:** `backend/src/routes/admin.ts`
**Location:** Lines 778-837, specifically line 784
**Category:** Mass Assignment / Privilege Escalation
**Issue:** The `PUT /api/admin/users/:userId` endpoint did `const updateData = req.body;` then only deleted 4 fields before passing to `prisma.user.update()`. Attacker with super-admin access could set: `role: 'SUPER_ADMIN'`, `hospitalId: 'any-hospital'`, `isActive: true`, `email` (account takeover).
**Impact:** Complete privilege escalation and cross-tenant data access.
**Fix:** Whitelist allowed fields explicitly.
**Effort:** 15 minutes
**Status:** FIXED (2026-04-07) — replaced with explicit field whitelist

---

## FINDING-4: GOD VIEW GLOBAL SEARCH — CROSS-TENANT PHI EXPOSURE

**Severity:** CRITICAL
**File:** `backend/src/routes/godView.ts`
**Location:** Lines 347-375 (`globalSearch` function)
**Category:** IDOR / Tenant Isolation
**Issue:** The `globalSearch` function queries patients with `isActive: true` and name/MRN search but does NOT filter by `hospitalId`. Returns firstName, lastName, mrn, hospitalId. No MFA required for god view.
**Impact:** Super-admin or demo-mode session can view PHI for all patients across all hospitals.
**Fix:** Add MFA requirement. Require explicit hospital selection for PHI searches. Add per-query audit logging.
**Effort:** 3 hours

---

## FINDING-5: MASS ASSIGNMENT IN admin.ts POST /hospitals/:hospitalId/users — PERMISSION OVERRIDE

**Severity:** HIGH
**File:** `backend/src/routes/admin.ts`
**Location:** Lines 717, 735-737
**Category:** Mass Assignment
**Issue:** The `permissions` object from `req.body` is spread directly into Prisma create with `...permissions` AFTER `...defaultPermissions`. Attacker can override any default permission.
**Impact:** Hospital-admin creating a VIEWER-role user could grant that user full PHI access.
**Fix:** Remove `...permissions` spread. Only accept validated permissions appropriate for the role.
**Effort:** 30 minutes

---

## FINDING-6: MFA NOT ENFORCED ON MOST PHI ROUTES

**Severity:** HIGH
**File:** Multiple route files
**Category:** Authentication
**Issue:** `requireMFA` is only applied to 4 of 26 route files: patients.ts, gaps.ts (detailed only), clinicalIntelligence.ts, phenotypes.ts. Routes handling PHI without MFA: admin.ts, godView.ts, files.ts, upload.ts, referrals.ts, dataRequests.ts, notifications.ts, auditExport.ts.
**Impact:** Pre-MFA token grants PHI access to gaps, files, referrals, admin analytics, god view search, data exports.
**Fix:** Apply `requireMFA` to all PHI routes.
**Effort:** 2 hours

---

## FINDING-7: MFA VERIFY ISSUES JWT WITHOUT SESSION CREATION

**Severity:** HIGH
**File:** `backend/src/routes/mfa.ts`
**Location:** Lines 93-107 (verify), lines 131-141 (verify-backup)
**Category:** Session Management
**Issue:** After MFA verification, a new JWT is issued with `mfaVerified: true` but NO `loginSession` is created. The session validation in `auth.ts` will fail to find it and return 401 "Session has been revoked."
**Impact:** In production mode, MFA verification is broken. Post-MFA token immediately fails session validation.
**Fix:** Create loginSession with hashed post-MFA token. Invalidate pre-MFA session.
**Effort:** 1 hour
**Status:** OPEN — assigned to Bozidar

---

## FINDING-8: DEMO_MODE BYPASSES ALL SECURITY — PRODUCTION GUARD IS FRAGILE

**Severity:** HIGH
**File:** `backend/src/server.ts` lines 20-29; `middleware/auth.ts`
**Category:** Security Bypass
**Issue:** When `DEMO_MODE=true`: authentication bypassed, RBAC bypassed, hospital isolation bypassed, MFA bypassed, CSRF bypassed, PHI encryption bypassed, tier enforcement bypassed. The guard relies on `NODE_ENV` being set — if undefined, it defaults to 'development' which ALLOWS demo mode.
**Impact:** If operator deploys to production without setting NODE_ENV, DEMO_MODE=true disables ALL security.
**Fix:** Only allow demo mode when NODE_ENV explicitly set to 'development' or 'test'.
**Effort:** 30 minutes

---

## FINDING-9: CORS ALLOWS UNDEFINED ORIGIN

**Severity:** HIGH
**File:** `backend/src/server.ts` lines 74-76
**Category:** CORS Misconfiguration
**Issue:** `if (!origin || allowedOrigins.includes(origin))` — requests with NO Origin header always allowed.
**Impact:** Server-to-server, curl, mobile apps bypass CORS.
**Fix:** Remove `!origin` bypass for production.
**Effort:** 15 minutes

---

## FINDING-10: RATE LIMITING IS IN-MEMORY ONLY

**Severity:** HIGH
**File:** `backend/src/middleware/authRateLimit.ts`
**Category:** Rate Limiting
**Issue:** All rate limiters use in-memory MemoryStore. ECS has 2+ instances behind ALB. Each instance maintains own counter — attacker gets 5 login attempts per instance (10+ total).
**Impact:** Rate limits doubled or more with multiple instances.
**Fix:** Use `rate-limit-redis` backed by ElastiCache Redis.
**Effort:** 2 hours

---

## FINDING-11: JWT REFRESH DOES NOT REBUILD PERMISSIONS FROM DATABASE

**Severity:** HIGH
**File:** `backend/src/routes/auth.ts` lines 319-327
**Category:** Authorization
**Issue:** `/api/auth/refresh` re-signs JWT using permissions from OLD token. Role changes not enforced until user logs out and back in.
**Impact:** Revoked permissions persist for up to 1 hour.
**Fix:** Reload user record and call `buildUserPermissions()` during refresh.
**Effort:** 30 minutes

---

## FINDING-12: MASS ASSIGNMENT IN PUT /health-systems/:id

**Severity:** HIGH
**File:** `backend/src/routes/admin.ts` line 1002
**Category:** Mass Assignment
**Issue:** `data: { id: req.params.id, ...req.body }` — entire request body spread into response.
**Impact:** Currently mock endpoint but establishes dangerous pattern.
**Fix:** Replace with field whitelist.
**Effort:** 15 minutes

---

## FINDING-13: ONBOARDING AND ADMIN CREATE USER WITH 8-CHAR PASSWORD MINIMUM

**Severity:** MEDIUM
**File:** `backend/src/routes/onboarding.ts` line 22; `admin.ts` line 675
**Category:** Weak Authentication
**Issue:** `isLength({ min: 8 })` only. No uppercase, digit, or special character requirements. Other routes correctly require 12+ chars with complexity.
**Fix:** Use same 12-char policy everywhere.
**Effort:** 30 minutes

---

## FINDING-14: INVITE ACCEPT AND MFA VERIFY DON'T INCLUDE hospitalName IN JWT

**Severity:** MEDIUM
**File:** `backend/src/routes/invite.ts` line 153; `mfa.ts` lines 94-105
**Category:** Authentication
**Issue:** JWTs from invite accept and MFA verify use `user.permissions || {}` (raw DB field) instead of properly built `UserPermissions` object.
**Impact:** Downstream permission checks may fail or fail-open.
**Fix:** Call `buildUserPermissions(user, user.hospital)`.
**Effort:** 30 minutes

---

## FINDING-15: AUDIT LOGGER RECORDS userEmail — PHI IN LOGS

**Severity:** MEDIUM
**File:** `backend/src/middleware/auditLogger.ts` lines 115-128
**Issue:** Every audit entry includes `userEmail`. `previousValues` and `newValues` can contain PHI.
**Fix:** Log user IDs instead of emails. Scrub PHI from previousValues/newValues.
**Effort:** 2 hours

---

## FINDING-16: LOGIN AUDIT LOGS FAILED ATTEMPT EMAILS

**Severity:** MEDIUM
**File:** `backend/src/routes/auth.ts` line 175
**Issue:** `Failed login attempt for email: ${email}` logs email and differentiates "user not found". Audit log leaks whether email exists.
**Fix:** Log without email or reason.
**Effort:** 15 minutes

---

## FINDING-17: GAPS ROUTES LACK ROLE AUTHORIZATION

**Severity:** MEDIUM
**File:** `backend/src/routes/gaps.ts` lines 26, 84, 130
**Issue:** Uses `authenticateToken` but no `authorizeRole`. Any authenticated user including viewer can view and action gaps.
**Fix:** Add `authorizeRole` middleware.
**Effort:** 1 hour

---

## FINDING-18: NOTIFICATION TRIGGER ENDPOINTS USE INLINE ROLE CHECK

**Severity:** LOW
**File:** `backend/src/routes/notifications.ts` lines 80, 100
**Issue:** `req.user?.role !== 'super-admin'` inline — doesn't normalize SUPER_ADMIN to super-admin.
**Fix:** Use `authorizeRole(['super-admin'])` middleware.
**Effort:** 15 minutes

---

## FINDING-19: NO ROLE NORMALIZATION IN MFA DISABLE CHECK

**Severity:** LOW
**File:** `backend/src/routes/mfa.ts` line 174
**Issue:** `userRole === 'SUPER_ADMIN'` doesn't match kebab-case JWT role.
**Fix:** Normalize role comparison.
**Effort:** 10 minutes

---

## JWT AUDIT TABLE

| File | Line | Function | Algorithm | Expiry | Session Created? |
|------|------|----------|-----------|--------|-----------------|
| auth.ts | 108 | signToken() | HS256 (pinned) | 1 hour | Yes (login only) |
| auth.ts | 298 | /refresh verify | HS256 (pinned) | N/A | Session updated |
| mfa.ts | 94 | MFA verify | HS256 (pinned) | 1h | **NO — BROKEN** |
| mfa.ts | 136 | Backup verify | HS256 (pinned) | 1h | **NO — BROKEN** |
| invite.ts | 153 | Invite accept | HS256 (pinned) | 1h | **NO** |

## DEMO_MODE BYPASS TABLE

| Control | Bypassed? |
|---------|-----------|
| JWT authentication | YES |
| Session validation | YES |
| RBAC (role check) | YES |
| Hospital isolation | YES |
| Module permissions | YES |
| View permissions | YES |
| MFA enforcement | YES |
| CSRF protection | YES |
| PHI encryption | YES |
| Tier enforcement | YES |

## AUDIT LOGGING EVENT TABLE

| Event | Logged? | PHI in Log? |
|-------|---------|-------------|
| Login success | YES | Email in description |
| Login failure | YES | **Email in description** |
| Logout | YES | No |
| Patient list viewed | YES | No |
| Patient detail viewed | YES | No |
| Patient created | NO | — |
| Patient updated | NO | — |
| Patient deleted | NO | — |
| Gap actioned | YES | Notes |
| File upload | YES | No |
| File download | NO | — |
| MFA enabled/disabled | YES | No |
| Hospital created | YES | No |
| Hospital updated | YES | No |
| User created | YES | No |
| User updated | YES | No |
| GOD view access | YES | Method+URL |
| DSAR export | YES | No |
| DSAR deletion | YES | Deletion counts |
| Breach incident | NO | — |
| Password reset | NO | — |
| Password change | NO | — |
| Session revoke | NO | — |


---
---

# SECTION 3 — CLINICAL CODE AUDIT REPORT

## Files Audited
- `backend/src/ingestion/gapDetectionRunner.ts` (11,217 lines, 257 gap rules)
- `backend/src/terminology/cardiovascularValuesets.ts` (264 lines)

## AUDIT 1: RxNorm Code Ledger — ALL CODES VERIFIED CORRECT

All drug codes in cardiovascularValuesets.ts and gapDetectionRunner.ts are correct as of this audit. Previously reported errors (flecainide=4603, spironolactone=9947, diltiazem=2991, sacubitril/valsartan=1656328, atorvastatin in PPI codes) were fixed in prior sessions.

Key verifications:
- Flecainide: 4441 ✓ (was 4603/furosemide — FIXED)
- Spironolactone: 9997 ✓ (was 9947/sotalol — FIXED)
- Diltiazem: 3443 ✓ (was 2991 — FIXED)
- Sacubitril/valsartan: 1656339 ✓ (was 1656328 — FIXED)
- Atorvastatin: NOT in PPI arrays ✓ (was in PPI_CODES_DAPT — FIXED)
- Finerenone: 2481926 ✓ with diabetes check present ✓
- Ivabradine: 1649480 ✓ with correct HR>70 + sinus rhythm + max BB + LVEF≤35 logic ✓
- Hydralazine/ISDN: 5470/6058 ✓

**RxNorm Audit Result: 0 active code errors.**

---

## AUDIT 2: LOINC Code Verification

### FINDING-3-1 | SEVERITY: HIGH
**LVEF mapped to wrong LOINC code in cardiovascularValuesets.ts**
- File: `cardiovascularValuesets.ts` line 132
- `LVEF: '10230-1'` but 10230-1 is QRS duration. Correct LVEF LOINC: `18010-0`
- Impact: If any service consumes this LOINC mapping for FHIR observation matching, it would pull QRS duration instead of ejection fraction.
- Note: gapDetectionRunner.ts uses string keys (`labValues['lvef']`) not LOINC codes directly, so runtime gap detection is unaffected. But FHIR ingestion pipeline could be affected.

### FINDING-3-2 | SEVERITY: MEDIUM
**QTc interval LOINC inconsistency between files**
- cardiovascularValuesets.ts uses `8636-3` (QTc Bazett)
- loinc.ts uses `8601-7` (QTc interval general)
- Both valid but internal disagreement risks mapping confusion.

### Lab Value Key Verification — All Correct
- `labValues['lvef']` → LVEF ✓
- `labValues['nt_probnp']` → NT-proBNP (distinct from BNP) ✓
- `labValues['bnp']` → BNP (distinct from NT-proBNP) ✓
- `labValues['hs_tnt']` → High-sensitivity Troponin T (NOT ferritin) ✓
- `labValues['ferritin']` → Ferritin (NOT troponin) ✓
- `labValues['egfr']` → eGFR ✓

**Troponin/ferritin substitution: CONFIRMED FIXED.** Line 3345 correctly uses `hs_tnt` with comment "NOT ferritin".

---

## AUDIT 3: ICD-10 Code Verification

All ICD-10 prefix matching is correct:
- HF: `c.startsWith('I50')` catches ALL I50.* (HFrEF, HFpEF, HFmrEF) ✓
- AF/Flutter: `c.startsWith('I48')` catches I48.0-I48.92 including flutter ✓
- CAD: `c.startsWith('I25')` catches all I25.* ✓
- PAD: `I73.9 || I70.2` correct ✓
- T2DM: `c.startsWith('E11')` correct ✓

### FINDING-3-3 | SEVERITY: LOW
**Flutter patients double-counted** by both AFib OAC rule and dedicated Flutter OAC rule. Over-inclusive but not a safety risk.

---

## AUDIT 4: Exclusion Code Completeness

| Code Set | Codes | Assessment |
|----------|-------|------------|
| EXCLUSION_RENAL_SEVERE | N18.4, N18.5, N18.6, N19 | Adequate (N18.4 added in prior session) |
| EXCLUSION_PREGNANCY | O0-O9 prefixes + Z33, Z34 | Expanded in prior session to full O-chapter |
| EXCLUSION_HOSPICE | Z51.5 | Correct but narrow |
| EXCLUSION_ALLERGY | Z88 | Correct |

### FINDING-3-4 | SEVERITY: MEDIUM
**EXCLUSION_PREGNANCY uses O-chapter prefixes** which is comprehensive but may be over-broad (includes O80-O82 delivery codes which are not active pregnancy). Acceptable for safety — over-exclusion is better than under-exclusion.

---

## AUDIT 5: Evidence Objects — 19 OF 257 MISSING

**FINDING-3-5 | SEVERITY: HIGH**
19 gap rules lack the required `evidence` object (FDA CDS exemption violation):
- Gap 2: Iron Deficiency in HF
- Gap 6: Finerenone for CKD+T2DM
- Gap HF-34: SGLT2i in HFrEF
- Gap HF-35: Beta-Blocker in HFrEF
- Gap HF-36: MRA in HFrEF
- Gap 39: QTc Safety Alert
- Gap EP-OAC: AFib Anticoagulation
- Gap 44: Digoxin Toxicity
- Gap 50: DAPT Discontinuation
- Gap CAD-STATIN: High-Intensity Statin
- Gap EP-RC: Rate Control (partial)
- Gap VD-1: Mechanical Valve Anticoagulation
- Plus 7 others in the early rule set

---

## AUDIT 6: hasContraindication Coverage — ~12 EARLY RULES MISSING

**FINDING-3-6 | SEVERITY: HIGH**
~12 early rules skip `hasContraindication()`: Iron Deficiency, Finerenone, SGLT2i, Beta-Blocker, MRA, QTc, AFib OAC, Digoxin, DAPT, CAD-STATIN, VD-1 Warfarin.
These may fire for hospice/pregnant patients.

---

## AUDIT 7: Directive Language — 1 REMAINING

**FINDING-3-7 | SEVERITY: HIGH**
Line 4618: `'Initiate warfarin per 2020 ACC/AHA VHD Guideline'` — "Initiate" is directive.
All other 256 rules use compliant "Consider" language.

---

## AUDIT 8: Gender/Race Field Audit

### FINDING-3-8 | SEVERITY: CRITICAL
**Hydralazine-ISDN rule: race parameter silently dropped**
- Function signature accepts 5 params but caller passes 6 (including `patient.race`)
- `gender === 'BLACK'` on line 3595 always false
- A-HeFT Class 1 LOE A recommendation 100% non-functional
- **Status: FIXED (2026-04-07)** — added race as 6th parameter, changed to `race?.toUpperCase() === 'BLACK'`

### FINDING-3-9 | SEVERITY: HIGH
**4 rules use wrong gender enum values:**
- Line 7902: `gender === 'male'` (CAD-FAMILY-SCREEN) — should be 'MALE'
- Line 8592: `gender === 'F'` (CAD-SCAD) — should be 'FEMALE'
- Line 8930: `gender === 'F'` (CAD-WOMEN-SPECIFIC) — should be 'FEMALE'
- Line 9159: `gender === 'male'` (EP-BRUGADA) — should be 'MALE'
- All 4 silently non-functional.

---

## AUDIT 9: cardiovascularValuesets.ts Integration

### FINDING-3-10 | SEVERITY: MEDIUM
- File IS imported and canonical arrays created (lines 7-33)
- But 8+ early rules define inline duplicate code arrays instead of using canonical `*_CV` arrays
- All duplicates currently agree (no active errors), but drift risk on future updates

---

## ADDITIONAL FINDINGS

### FINDING-3-11 | SEVERITY: HIGH
**`@ts-nocheck` on line 1** of 11,217-line gap detection file. Violates CLAUDE.md. Disables TypeScript safety on the most critical clinical file.

### FINDING-3-12 | SEVERITY: MEDIUM (PASS)
**Ivabradine logic verified correct:** LVEF ≤35 ✓, HR >70 ✓, on beta-blocker ✓, sinus rhythm via !hasAF ✓, not already on ivabradine ✓.

### FINDING-3-13 | SEVERITY: MEDIUM (PASS)
**Finerenone correctly requires diabetes.** Does NOT fire for general HFpEF. Missing hospice/pregnancy contraindication check.

## CLINICAL FINDING SUMMARY

| Finding | Severity | Rules Affected | Status |
|---------|----------|---------------|--------|
| FINDING-3-8: race param dropped | CRITICAL | 1 rule (Class 1 LOE A) | FIXED |
| FINDING-3-9: wrong gender enum | HIGH | 4 rules | OPEN |
| FINDING-3-1: LVEF LOINC wrong | HIGH | Future FHIR consumers | OPEN |
| FINDING-3-5: 19 rules no evidence | HIGH | 19 rules | OPEN |
| FINDING-3-6: 12 rules no contraindication | HIGH | 12 rules | OPEN |
| FINDING-3-7: directive "Initiate" | HIGH | 1 rule | OPEN |
| FINDING-3-11: @ts-nocheck | HIGH | Entire file | OPEN |


---
---

# SECTION 2 — HIPAA COMPLIANCE AUDIT REPORT

## AUDIT 1: PHI Field Mapping — §164.312(a)(2)(iv)

### PHI Encryption Coverage Summary

| Category | Count |
|----------|-------|
| Models with PHI fields encrypted | 6 (Patient, Encounter, Observation, Order, Medication, Condition) |
| Models with PHI fields NOT encrypted | 13 (WebhookEvent, Alert, TherapyGap, DrugTitration, CrossReferral, CarePlan, Phenotype, RiskScoreAssessment, InterventionTracking, ContraindicationAssessment, BreachIncident, PatientDataRequest, AuditLog) |
| Total PHI fields encrypted | 21 |
| Total PHI fields NOT encrypted | 30+ |

### CRITICAL PHI FINDINGS

**FINDING-2-C1 (CRITICAL): §164.312(a)(2)(iv) — WebhookEvent.rawPayload**
Stores complete FHIR R4 bundles (patient names, SSN, MRN, DOB, addresses, full clinical records) as unencrypted JSON. This is the single largest PHI exposure in the database.

**FINDING-2-C2 (CRITICAL): §164.312(a)(2)(iv) — ingestSynthea.ts bypasses encryption**
`backend/src/scripts/ingestSynthea.ts` line 27 creates `new PrismaClient()` bypassing PHI encryption middleware. This is the primary data ingestion path — all ingested patient data stored in PLAINTEXT.

**FINDING-2-C3 (CRITICAL): §164.524 — WebhookEvent records never purged**
Raw FHIR bundles persist indefinitely. Not in DSAR deletion cascade. Not in retention purge.

### HIGH PHI FINDINGS

**FINDING-2-H1:** 30+ PHI fields across 13 models not in PHI_FIELD_MAP
**FINDING-2-H2:** FHIR resource IDs (fhirPatientId, fhirEncounterId, etc.) stored unencrypted — linkable identifiers
**FINDING-2-H3:** UserMFA.secret and backupCodes stored in plaintext — DB compromise defeats MFA
**FINDING-2-H4:** Json fields (diagnosisCodes, triggerData, inputData) structurally immune to encryption middleware

### Encryption Implementation
- **Algorithm:** AES-256-GCM (authenticated encryption) — COMPLIANT
- **Key length:** 256-bit — COMPLIANT
- **IV handling:** crypto.randomBytes(16) per operation — COMPLIANT (non-deterministic)
- **Format:** `enc:{iv_hex}:{authTag_hex}:{ciphertext_hex}` — well-structured

---

## AUDIT 2: Access Controls — §164.312(a)(1), §164.514(d)

### Role × PHI Access Matrix

| Role | accessPHI | PHI Redacted? | Should Be? |
|------|-----------|--------------|------------|
| SUPER_ADMIN | YES | NO | NO |
| HOSPITAL_ADMIN | YES | NO | NO |
| PHYSICIAN | YES | NO | NO |
| NURSE_MANAGER | YES | NO | NO |
| QUALITY_DIRECTOR | NO | YES (analyst) | YES |
| ANALYST | NO | YES | YES |
| VIEWER | NO | **NO** | **YES** |

**FINDING-2-H5 (HIGH): §164.514(d) — VIEWER role sees unredacted PHI**
VIEWER has `accessPHI: false` but is NOT in `PHI_REDACTED_ROLES` array. VIEWER accessing patient endpoints sees full PHI.

**FINDING-2-H6 (HIGH): §164.514(d) — PHI redaction only on /patients and /gaps routes**
All other PHI routes (DSAR export, encounters, observations) return unredacted data regardless of role.

---

## AUDIT 3: Audit Controls — §164.312(b)

**FINDING-2-H7 (HIGH): Audit logs are MUTABLE**
`dataRequests.ts` line 243: `prisma.auditLog.update()` modifies existing entries. HIPAA requires append-only.

**FINDING-2-H8 (HIGH): Breach notification actions not audit-logged**
breachNotification.ts routes never call writeAuditLog(). Most sensitive compliance actions have no trail.

**FINDING-2-H9 (HIGH): Failed authentication attempts not logged**
auth.ts returns 401/403 without audit entries. Required for intrusion detection per §164.312(b).

**Audit Log Retention:** File-based logs: 6-year rotation via Winston — COMPLIANT.

---

## AUDIT 4: DSAR Deletion Cascade — §164.524

| Table | Patient PHI? | In DSAR Deletion? |
|-------|-------------|-------------------|
| Patient | YES | YES |
| Encounter | YES | YES |
| Observation | YES | YES |
| Order | YES | **NO** |
| Medication | YES | YES |
| Condition | YES | YES |
| TherapyGap | YES | YES |
| Phenotype | YES | YES |
| CrossReferral | YES | YES |
| DrugTitration | YES | YES |
| Recommendation | YES | **NO** |
| WebhookEvent | YES (rawPayload) | **NO** |

**FINDING-2-H10 (HIGH):** Order records excluded from DSAR deletion
**FINDING-2-H11 (HIGH):** Recommendation records excluded from DSAR deletion

---

## AUDIT 5: Breach Notification — §164.400-414

- 60-day deadline tracking: IMPLEMENTED ✓
- 14-day approaching warning: IMPLEMENTED ✓
- **FINDING-2-H12 (HIGH):** No automated notification delivery (no email, HHS, media integration)
- **FINDING-2-H13 (HIGH):** Media notification trigger at 500 records is advisory only

---

## AUDIT 6: BAA Register — §164.502(e)

| Service | PHI Exposure | BAA Status |
|---------|-------------|------------|
| AWS (S3, RDS, ECS) | Database + files | UNKNOWN — must accept via AWS Artifact |
| Redox | Full FHIR bundles | UNKNOWN |
| Redis | Potential cached PHI | UNKNOWN |
| GitHub | No PHI (if .env excluded) | N/A |

**FINDING-2-H14 (HIGH):** No BAA tracking system exists
**FINDING-2-H15 (HIGH):** Redox BAA status undocumented

---

## AUDIT 7: SOC 2 Readiness — 3.5/10

| Criterion | Score |
|-----------|-------|
| CC5: Control Activities | 5/10 |
| CC6: Logical Access | 5/10 |
| CC7: System Operations | 3/10 |
| A1: Availability | 2/10 |
| C1: Confidentiality | 4/10 |
| PI1: Processing Integrity | 5/10 |
| P1: Privacy | 4/10 |

**NOT READY for SOC 2 Type I examination.**


---
---

# SECTION 9 — INFRASTRUCTURE AUDIT REPORT

## AWS Resource Configuration — HIPAA Gap Analysis

| Resource | Current Config | Status |
|----------|---------------|--------|
| RDS PostgreSQL 15 | KMS encryption, SSL forced, Multi-AZ, pgaudit, 7-day backup, private only | **PASS** |
| ECS Fargate | Secrets via Secrets Manager, private subnets, CloudWatch logs w/ KMS | **PASS** |
| CloudWatch Logs | KMS encrypted, 90-day retention | **PASS** |
| ALB | TLS 1.3, HTTP→HTTPS redirect, access logs, drop invalid headers | **PASS** |
| CloudFront | HTTPS only, TLSv1.2_2021, WAF attached, logging to S3 | **PASS** |
| S3 Frontend | KMS encryption, public access block, versioning, OAI-only | **PASS** |
| S3 ALB Logs | SSE-S3 (correct for ALB), public access block, versioning, lifecycle | **PASS** |
| Secrets Manager | All 6 secrets use PHI KMS key | **PASS** |
| ECR | Scan on push, KMS encryption, immutable tags | **PASS** |
| VPC | DB in dedicated subnets, ECS in private subnets, separate SGs | **PASS** |
| ElastiCache | At-rest + transit encryption, private subnets | **FINDING-9-H1** |
| Cognito | 12-char passwords, TOTP MFA, advanced security | **FINDING-9-H2** |

### CRITICAL Infrastructure Findings

**FINDING-9-C1 (CRITICAL): .terraform/ providers committed to git**
Status: FIXED (2026-04-07)

**FINDING-9-C2 (CRITICAL): terraform.tfvars with live AWS IDs committed**
Status: FIXED (2026-04-07)

**FINDING-9-C3 (CRITICAL): local.common_tags undefined — breaks terraform plan**
Status: FIXED (2026-04-07)

### HIGH Infrastructure Findings

**FINDING-9-H1:** ElastiCache Redis has no authentication token (elasticache.tf line 93)
**FINDING-9-H2:** Cognito MFA is OPTIONAL not REQUIRED (cognito.tf line 25)
**FINDING-9-H3:** ElastiCache single node — no HA (elasticache.tf line 82)
**FINDING-9-H4:** No VPC Flow Logs configured
**FINDING-9-H5:** Deploy pipeline uses static AWS credentials instead of OIDC
**FINDING-9-H6:** Deploy pipeline does not specify --platform linux/amd64
**FINDING-9-H7:** No multi-stage Docker build — devDependencies in production image
**FINDING-9-H8:** No CloudWatch alarms, SNS topic, error tracking, or uptime monitoring
**FINDING-9-H9:** No defined RTO/RPO for disaster recovery

### MEDIUM Infrastructure Findings

- Provider versions loosely pinned (~> 5.0)
- No REDIS_URL in ECS task definition
- ECR latest tag conflicts with IMMUTABLE setting
- Security groups managed externally — not auditable from Terraform
- No WAF on ALB (only on CloudFront)
- CI deploy step in ci.yml is a no-op
- tsc || true silently ignores build failures in Dockerfile
- No rollback procedure in deploy scripts
- deploy-backend.sh doesn't specify amd64 platform
- ECR image tag is `latest` in task definition

### Container Security
- Base image: node:18-slim ✓
- Non-root user: tailrd (UID 1001) ✓
- Health check: Node-based (no curl) ✓
- Secrets from Secrets Manager ✓
- Multi-stage build: **MISSING** — devDeps ship in production

### CI/CD
- GitHub Actions workflow exists for deploy ✓
- CI permissions: contents: read ✓
- Actions SHA-pinned in ci.yml ✓ (but not in deploy.yml)
- npm audit enforced: audit-level=high ✓

### DNS
- Route53 records provisioned for api. and app. ✓
- ACM certificates with DNS validation ✓

### Monitoring
- **ZERO CloudWatch alarms configured**
- **ZERO SNS topics**
- **ZERO error tracking (no Sentry)**
- **ZERO uptime monitoring**
- No defined RTO/RPO


---
---

# SECTION 4 — UI/UX DESIGN AUDIT REPORT

## Design Standard: Porsche Liquid Metal aesthetic. Midnight navy, Liquid Metal Blue, Carmine Red, Signal Green, Amber Yellow, frosted glass panels, surgical precision typography.

### CRITICAL Finding

**FINDING-4-C1 (CRITICAL): No "data as of" timestamp on ANY clinical data view**
Zero instances of data freshness indicators across all views. Clinicians could act on stale data without knowing. A cardiologist needs to know when the EF was measured or the BNP was drawn.

### HIGH Findings — Design Token System

**FINDING-4-H1:** Token definitions split across 5 locations (index.css, tokens.ts, semanticTokens.ts, theme/index.ts, tailwind.config.js) with no single source of truth.

**FINDING-4-H2:** 225+ legacy `porsche-`/`crimson-` color references across 20+ files. Tailwind config marks them as legacy but they're used heavily in production components.

**FINDING-4-H3:** Brand colors in audit brief (#0066CC, #FF2800, #00C851, #FFB800) do NOT exist in the codebase. Actual palette uses Chrome Blue #2C4A60, Carmona Red #7A1A2E. Must be reconciled.

### HIGH Findings — Severity Hierarchy

**FINDING-4-H4:** Three conflicting severity color maps across index.css, tokens.ts, and semanticColors.ts. CRITICAL = #7A1A2E in one, #9B2438 in another. WARNING = #7A5A00 in one, #6B7280 (gray!) in another.

**FINDING-4-H5:** Color-only severity indication in CareTeamView safety cards, patient rows, and GapCard. No icon, no text label. WCAG 2.1 AA failure for color vision deficiency.

### HIGH Findings — Frosted Glass System

**FINDING-4-H6:** `metal-card bg-white` used 95 times vs `glass-panel` used 26 times. The marquee "Porsche Liquid Metal" aesthetic is absent from most views. ServiceLineView and CareTeamView bypass the glass system entirely.

### HIGH Findings — Components

**FINDING-4-H7:** No shared Button component exists. Ad-hoc button styling everywhere: Login.tsx uses inline JS hover effects, ErrorFallback.tsx uses porsche-600/crimson-600/teal-700, CareTeamView uses chrome-50/arterial-50.

**FINDING-4-H8:** Modals lack focus trapping, `role="dialog"`, `aria-modal="true"`. WCAG 2.1 AA failure.

### HIGH Findings — Typography

**FINDING-4-H9:** 9-9.5px font sizes in index.css (.sb-live, .kpi-label, .kpi-delta, .severity-badge). Below clinical readability minimum. Effectively unreadable at arm's length.

### HIGH Findings — Accessibility

**FINDING-4-H10:** Modal focus trapping absent. Tab can escape into background content.

**FINDING-4-H11:** Search navigates to `/patients?search=...` but no `/patients` route exists in App.tsx. Search is non-functional.

**FINDING-4-H12:** KPI grid hardcoded `grid-cols-4` with no responsive breakpoints. Severely compressed at 1024px.

### MEDIUM Findings

- Login.tsx uses raw hex values outside token system (#1A2F4A, #CBD5E1, #5C1A1A)
- Inline style hex values in TopBar.tsx (#0A1828), SectionCard.tsx, DotScale.tsx
- Module-tinted glass variants built but unused
- `text-[10px]` used in DotScale, Sidebar, PatientRiskHeatmap
- Artificial setTimeout delays in 8+ components (1.5-2s fake loading)
- ChartEmptyState exists but rarely adopted
- ModuleLayout loading state is dead code (setIsLoading never called)
- Browser back-button breaks in-module tab navigation

### Mock Data Visible in UI

**FINDING-4-M1:** Hardcoded patient names in CareTeamView: "Johnson, Mary", "Smith, Robert", "Davis, Carol", etc. (18 names)
**FINDING-4-M2:** Hardcoded provider names in ExecutiveView: "Dr. Sarah Chen", "Dr. Robert Lee", etc. with revenue figures
**FINDING-4-M3:** Hardcoded financial numbers: "$387K", "$70M", "$14.2K above national average"
**FINDING-4-M4:** Hardcoded workflow counts: "23 patients pending review", "31 patients for evaluation"
**FINDING-4-M5:** 20+ TODO comments on user-clickable buttons that do nothing

### Responsive Design

- Max-width 1800px consistently applied ✓
- Mobile sidebar overlay exists ✓
- KPI grid NOT responsive (grid-cols-4 no breakpoints)
- CareTeamView tab grid: xl:grid-cols-9 collapses acceptably

### Accessibility Passes

- Skip-to-content link exists ✓
- Global focus-visible outlines defined ✓
- 3-click gap accessibility achievable ✓
- Type scale well-defined (display/body/data font families) ✓


---
---

# SECTION 6 — DATA PIPELINE & FHIR AUDIT REPORT

## Pipeline Architecture
S3 FHIR bundles → processSynthea.ts → parse → patientService/encounterService/observationService → Prisma persist → gapDetectionRunner.ts → TherapyGap table

## FHIR Resource Coverage

| Resource Type | Handler Exists? | Called in Pipeline? | Persisted? | Required By |
|---|---|---|---|---|
| Patient | YES | YES | YES | All gap rules |
| Encounter | YES | YES | YES | Context |
| Observation | YES | YES | YES | Lab values |
| Condition | YES | YES | YES | ICD-10 codes |
| MedicationRequest | YES | YES | YES | RxNorm codes |
| Procedure | YES | **NO** | **NO MODEL** | CPT codes |
| Device | YES | **NO** | **NO MODEL** | ICD/CRT gaps |
| AllergyIntolerance | YES | **NO** | **NO MODEL** | Contraindications |
| DiagnosticReport | NO | NO | NO | Imaging gaps |
| CarePlan | YES | **NO** | Model exists | Rehab gaps |

### CRITICAL Pipeline Findings

**FINDING-6-C1 (CRITICAL): processSynthea.ts ensureHospital() has 12 schema mismatches**
Writes 3 nonexistent fields (displayName, ehrSystem, enabledModules) and omits 9 required fields. Will crash if hospital doesn't pre-exist.

**FINDING-6-C2 (CRITICAL): MedicationStatus 'STOPPED' not in enum**
processSynthea.ts line 240: `as any` cast hides that 'STOPPED' is not a valid enum value. Medications with this status silently fail.

### HIGH Pipeline Findings

**FINDING-6-H1:** Procedure, Device, AllergyIntolerance resources silently discarded by pipeline. FHIR handlers exist but are never called from ingestion.

**FINDING-6-H2:** No Procedure, Device, or AllergyIntolerance models in schema.prisma. Even if pipeline extracted them, nowhere to persist.

**FINDING-6-H3:** Gap rules referencing CPT/device data produce false positives since data never ingested.

**FINDING-6-H4:** Persistently failing FHIR bundles block cursor resumption — no retry/skip.

**FINDING-6-H5:** No dead letter queue for failed bundles.

### Seed Script Status

- seed.ts: Uses shared PrismaClient singleton ✓
- seedBSW.ts: Uses shared singleton ✓
- seedFromSynthea.ts: Uses shared singleton ✓
- All creates include hospitalId ✓

### Gap Detection Architecture

- Batch processing: 100 patients per batch with cursor pagination ✓
- Pre-loads all existing gaps for hospital in one query ✓
- Per-patient error handling ✓
- Batch creates and updates ✓
- **@ts-nocheck on line 1** — type safety disabled on entire clinical file

### Scalability Estimates

| Patients | Gap Pre-load | Est. Time | OOM Risk? |
|----------|-------------|-----------|-----------|
| 100 | ~200KB | ~5s | No |
| 1,000 | ~2MB | ~30s | No |
| 10,000 | ~20MB | ~5min | No |
| 100,000 | ~200MB | ~50min | **YES** |

### Missing Indexes

| Table | Column | Usage | Recommended |
|-------|--------|-------|-------------|
| therapy_gaps | hospitalId alone | Pre-load all gaps | YES |
| medications | patientId alone | Relation include | YES |
| conditions | patientId alone | Relation include | YES |
| medications | patientId + status | Active med queries | YES |

### Redis Status

Redis singleton exists at `lib/redis.ts`. Correctly initializes on REDIS_URL. **Used for NOTHING.** No code calls `getRedisClient()`. Should be used for: rate limiting, session store, gap detection cache, BullMQ job queue.

### Reliability

- Cursor-based resumability ✓
- Per-bundle try/catch ✓
- No transaction wrapping per bundle — partial writes possible
- No dead letter queue
- Concurrent processing creates race conditions on shared patients


---
---

# TOP 20 PRE-DEMO FIX LIST

| # | Finding | Domain | Effort | Why | Status |
|---|---------|--------|--------|-----|--------|
| 1 | Fix `gender === 'BLACK'` — add race param | Clinical | 10min | Patient safety, Class 1 guideline broken | **FIXED** |
| 2 | Whitelist fields in PUT /admin/users/:userId | Security | 15min | Privilege escalation | **FIXED** |
| 3 | `git rm --cached terraform.tfvars .terraform/` | Infra | 15min | AWS secrets in git | **FIXED** |
| 4 | Add `local.common_tags` to terraform/main.tf | Infra | 5min | Unblocks terraform plan | **FIXED** |
| 5 | Fix 4 gender enum mismatches ('male'/'F' → 'MALE'/'FEMALE') | Clinical | 10min | 4 gap rules silently broken | OPEN |
| 6 | Change "Initiate warfarin" to "Consider warfarin" | Clinical | 5min | FDA CDS exemption | OPEN |
| 7 | Map FHIR 'stopped' → 'DISCONTINUED' in processSynthea | Data | 5min | Medications silently dropped | OPEN |
| 8 | Fix session token hash in accountSecurity.ts | Security | 1h | Session management broken | Bozidar |
| 9 | Create LoginSession after MFA verify | Security | 1h | Post-MFA tokens fail in prod | Bozidar |
| 10 | Apply requireMFA to all PHI routes | Security | 2h | MFA bypassed on 80% of routes | OPEN |
| 11 | Add evidence objects to 19 gap rules | Clinical | 3h | FDA CDS exemption | OPEN |
| 12 | Add hospice/pregnancy checks to 12 early rules | Clinical | 2h | Recommending drugs to hospice patients | OPEN |
| 13 | Add "data as of" timestamp to clinical views | UI/UX | 2h | Clinician trust/safety | OPEN |
| 14 | Whitelist fields in POST /hospitals/:hospitalId/users | Security | 15min | Permission override | OPEN |
| 15 | Add VIEWER to PHI_REDACTED_ROLES | HIPAA | 5min | VIEWER sees full PHI | OPEN |
| 16 | Set Redis auth_token in elasticache.tf | Infra | 1h | Redis accessible without credentials | OPEN |
| 17 | Set Cognito mfa_configuration = "ON" | Infra | 5min | HIPAA mandatory MFA | OPEN |
| 18 | Add Order/Recommendation/WebhookEvent to DSAR deletion | HIPAA | 2h | DSAR misses PHI tables | OPEN |
| 19 | Remove @ts-nocheck from gapDetectionRunner.ts | Clinical | 4h | Type safety on critical clinical file | OPEN |
| 20 | Add CloudWatch alarms + SNS topic | Infra | 3h | No monitoring in production | OPEN |

---

# OVERALL READINESS SCORECARD

| Dimension | Score | Assessment |
|-----------|-------|-----------|
| Security | 5/10 | Mass assignment fixed, but session hash broken, MFA non-enforcing on most routes, CORS allows undefined origin, rate limiting in-memory only |
| Pentest Readiness | 4/10 | 4 criticals fixed, 4 highs remain. Would still fail a formal pentest. |
| HIPAA Compliance | 4/10 | PHI encryption on 6 of 19 PHI models. Audit logs mutable. DSAR incomplete. No BAA tracking. |
| Clinical Accuracy | 7/10 | All drug codes correct. Race param fixed. But 19 rules no evidence, 12 rules no contraindication check, 4 rules wrong gender enum, 1 directive language. |
| Gap Rule Coverage | 8/10 | 257 of ~300 target rules executing across all 6 modules. |
| UI/UX Quality | 5/10 | Premium design system built but underutilized. 95 metal-card vs 26 glass-panel. No data timestamps. 9px fonts. |
| Design System Integrity | 4/10 | 5 competing token locations. 225+ legacy color references. 3 conflicting severity maps. |
| Accessibility | 3/10 | Skip-to-content ✓, focus outlines ✓. But no modal focus traps, color-only severity, 9px text, broken search. |
| Backend Architecture | 6/10 | Solid Prisma schema, good service layer. But @ts-nocheck on clinical file, competing API clients, dead code. |
| Frontend Architecture | 4/10 | 130 files with hardcoded mock data. 3 API client layers. 7500-line component files. |
| Data Pipeline | 5/10 | Pipeline works for 5 of 8 FHIR resource types. Procedure/Device/AllergyIntolerance silently dropped. |
| Multi-Tenancy | 6/10 | hospitalId enforced on most routes. GOD view search is cross-tenant. 2 PATCH IDORs fixed. |
| Infrastructure | 7/10 | Terraform well-structured. RDS/ECS/CloudFront all HIPAA-configured. But no monitoring, no HA Redis, no VPC Flow Logs. |
| Test Coverage | 1/10 | Near-zero. 252 of 257 gap rules untested. Smoke test framework saved but not yet running. |
| Scalability | 4/10 | Batch gap processing ✓. But in-memory rate limiting, no Redis wiring, no job queue. |
| Code Quality | 4/10 | 11K-line single function. @ts-nocheck. 175 `any` types. 64 console.logs. |
| Demo Readiness | 5/10 | Backend live at api.tailrd-heart.com. Frontend deployed. 211 gaps detected. But mock data in most views, no data timestamps, MFA broken in prod. |
| Enterprise Readiness | 4/10 | Cognito SSO built. Clinical alerts built. But no CDS Hooks, no SMART on FHIR, no registry export. |
| Regulatory Readiness | 4/10 | FDA CDS exemption mostly met. SOC 2 at 3.5/10. No ONC certification. No state privacy compliance. |
| **Overall Platform Health** | **5/10** | Massive progress from initial audit. 257 gap rules, Terraform infra, live deployment. But 64 HIGH+ findings block production. |

---

# Phase 2 Pending
- Multi-tenancy deep audit (Section 5)
- EHR/Redox/CDS Hooks (Section 5B)
- God View + Admin Console (Section 10)
- Demo walkthrough (Section 11)
- All 14 deliverables compilation

---

*End of Phase 1 Master Audit. 121 findings. 14 CRITICAL (4 fixed). 52 HIGH. 41 MEDIUM. 14 LOW.*
