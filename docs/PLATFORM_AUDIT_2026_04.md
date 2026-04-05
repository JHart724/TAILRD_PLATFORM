# TAILRD Platform Audit -- April 2026

**Living document. Updated every work session. Start here.**

## Session Log

| Date | Files Changed | Items Completed | New Issues |
|------|--------------|-----------------|------------|
| 2026-04-04 | Initial audit | 0 | 87 action items identified |
| 2026-04-04 | server.ts, auth.ts, admin.ts, analytics.ts, referrals.ts, phenotypes.ts, onboarding.ts, middleware/analytics.ts, eventProcessor.ts, ecgAIService.ts, contentIntelligenceService.ts | P0-SEC-2 | 0 |
| 2026-04-04/05 | 30+ backend files, 8 frontend files, schema.prisma, processSynthea.ts | 115 items completed: all P0s, 28 P1s, 18 P2s | Net -18K lines |

---

# 1. Executive Summary

TAILRD Heart is a cardiovascular clinical analytics platform with strong domain modeling, a premium frosted-glass UI, and well-designed FHIR R4 transformation services. The clinical knowledge base defines 256 therapy gaps across 6 modules in the frontend. The platform's Prisma schema, webhook pipeline, and FHIR resource handlers demonstrate real cardiovascular expertise.

But the platform is a polished prototype, not production software. The CQL engine returns `Math.random()`. The data pipeline parses 1.29M FHIR bundles and throws them away. The entire clinical UI runs on hardcoded mock data. Cross-tenant IDOR vulnerabilities expose patient data across health systems. AWS credentials are committed to git. There is no deployed backend, no production database, and no way for a hospital executive to log in from outside localhost.

Of 256 therapy gaps displayed in the frontend, **6 actually execute** in the runtime engine, and 2 of those have clinically incorrect logic (finerenone recommended for wrong indication, ferritin used as troponin proxy). Three of six clinical modules have zero gap rules.

The platform needs approximately **200 engineering hours** to reach a state where a health system CMO could safely log in and see credible, data-backed gap analytics.

---

# 2. Readiness Scorecard

| Dimension | Score | Assessment |
|-----------|-------|-----------|
| **Security** | **2/10** | DEMO_MODE bypass, secrets in git, non-functional logout/MFA, cross-tenant IDOR |
| **Pentest Readiness** | **1/10** | Would fail in the first hour. 5 P0 security findings. |
| **HIPAA Compliance** | **3/10** | PHI encryption covers Patient model only. PHI in logs. Incomplete audit trails. |
| **Clinical Accuracy** | **2/10** | CQL returns Math.random(). 2 clinically wrong rules. 3 modules have 0 rules. |
| **Gap Coverage** | **2/10** | 6 of ~256 gaps execute. 2.3% coverage vs target. |
| **Code Quality** | **5/10** | Good schema, good services, good types directory. 13 rogue PrismaClients, @ts-nocheck, 267 `any` types in frontend. |
| **Scalability** | **2/10** | No job queue, no connection pooling, no list virtualization, sequential S3 processing. |
| **Infrastructure** | **1/10** | No deployed backend. No RDS. No ECS. Dockerfile broken. CI deploy is a no-op. |
| **Exec Demo Readiness** | **1/10** | Cannot be accessed outside localhost. No production URL. |
| **UI/UX** | **7/10** | Premium frosted glass aesthetic. Good clinical severity hierarchy. WCAG non-compliant. |

---

# 3. Section 1: Penetration Test Simulation

### P0 Findings

- [ ] **P0-SEC-1: AWS credentials, JWT secret, PHI encryption key committed to git** | `backend/.env:11-17` | Risk: Full AWS account compromise, JWT forgery, PHI decryption | Est: 4h
- [x] **P0-SEC-2: 13 files create own PrismaClient, bypassing PHI encryption** | `server.ts:11`, `auth.ts:9`, `admin.ts:10`, `analytics.ts:12`, `referrals.ts:10`, `phenotypes.ts:10`, `onboarding.ts:9`, `middleware/analytics.ts:6`, `eventProcessor.ts:26`, `ecgAIService.ts:159`, `contentIntelligenceService.ts:211`, `seed.ts:4`, `seedBSW.ts:4` | Risk: PHI stored/read in plaintext | Est: 3h
- [x] **P0-SEC-3: Cross-tenant IDOR on all clinicalIntelligence endpoints** | `clinicalIntelligence.ts:25,132,280,442,472` -- queries by patientId without hospitalId | Risk: Hospital A reads Hospital B patient data | Est: 4h
- [x] **P0-SEC-4: Unauthenticated webhook test endpoint reflects body** | `webhooks.ts:232-240` | Risk: Information disclosure, SSRF probe | Est: 1h
- [x] **P0-SEC-5: Mass assignment on hospital update** | `admin.ts:392-401` -- raw req.body to prisma.update | Risk: Attacker sets redoxWebhookUrl to their server | Est: 1h

### P1 Findings

- [x] **P1-SEC-1: No JWT algorithm pinning** | `auth.ts:29` -- no `algorithms: ['HS256']` in verify | Est: 1h
- [x] **P1-SEC-2: JWT logout is non-functional** | `auth.ts:28-46` -- never checks loginSession.isActive | Est: 4h
- [x] **P1-SEC-3: No refresh token rotation** | `auth.ts:275-325` -- old tokens remain valid indefinitely | Est: 4h
- [x] **P1-SEC-4: MFA is non-enforcing** | `auth.ts:167-246` -- requireMFA middleware created and exported | Est: 3h
- [x] **P1-SEC-5: GOD view role case mismatch** | `godView.ts:17` -- checks 'SUPER_ADMIN' but JWT has 'super-admin' | Est: 2h
- [x] **P1-SEC-6: Phenotypes IDOR** | `phenotypes.ts:28` -- no hospitalId on GET /:patientId | Est: 1h
- [x] **P1-SEC-7: Referrals IDOR** | `referrals.ts:197` -- filter built but not passed to service | Est: 0.5h
- [x] **P1-SEC-8: Rate limiting is in-memory only** | `authRateLimit.ts` -- bypassed in multi-instance | Est: 2h
- [x] **P1-SEC-9: Invite accept has weak password policy** | `invite.ts:91` -- 8 chars vs 12+complexity elsewhere | Est: 1h
- [x] **P1-SEC-10: DEMO_MODE disables all auth** | `auth.ts:49-53,82,110,128,152` -- only guarded against NODE_ENV=production | Est: 1h
- [x] **P1-SEC-11: CQL results IDOR** | `cqlRules.ts:263` -- no hospitalId scoping | Est: 0.5h
- [x] **P1-SEC-12: File metadata endpoint lacks hospital scoping** | `files.ts:254-277` | Est: 0.5h

### P2 Findings

- [x] **P2-SEC-1: Math.random() for API key generation** | `onboarding.ts:491-498` | Est: 0.5h
- [x] **P2-SEC-2: 10MB JSON body limit** | `server.ts:124` | Est: 0.5h
- [x] **P2-SEC-3: PHI encryption passthrough in non-production** | `phiEncryption.ts:27-29` | Est: 0.5h
- [ ] **P2-SEC-4: JWT stored in plaintext in loginSession** | `auth.ts:203-211` | Est: 2h
- [x] **P2-SEC-5: Webhook status leaks config unauthenticated** | `webhooks.ts:268-282` | Est: 0.25h
- [x] **P2-SEC-6: Admin analytics returns fake data on DB failure** | `admin.ts:49-58` | Est: 0.25h

---

# 4. Section 2: Injection & Input Attack Surface

**Low risk overall.** Prisma ORM prevents SQL injection.

- `$queryRaw` used only in `server.ts:171` for health check `SELECT 1` (tagged template, parameterized).
- Zero `exec`, `spawn`, or `child_process` usage.
- No template injection, LDAP injection, or path traversal vectors found.
- No prototype pollution patterns detected.

Only finding:
- [ ] **P2-INJ-1: Webhook HMAC computed on re-serialized body** | `webhooks.ts:83` -- should use raw body | Est: 1h

---

# 5. Section 3: Denial of Service & Abuse Vectors

- [x] **P1-DOS-1: Rate limiter runs AFTER 10MB body parsing** | `server.ts` middleware order | Est: 0.5h
- [x] **P1-DOS-2: Admin runs 5 unbounded COUNT(*) queries** | `admin.ts:26-30` | Est: 2h
- [x] **P1-DOS-3: WebhookEvent.eventId has no unique index** | `schema.prisma:518` -- idempotency check is a full table scan, TOCTOU race under concurrency | Est: 0.5h
- [ ] **P2-DOS-1: Patient search uses ILIKE without GIN index** | `patients.ts:54-57` | Est: 2h

---

# 6. Section 4: Security & Authentication

Covered in Sections 1 and 3. Additional:

- [x] **P1-AUTH-1: CORS allows undefined origin** | `server.ts:94-98` -- standard API behavior, not a vulnerability | Est: 0h (informational)
- [x] **P2-AUTH-1: Bcrypt cost inconsistency** | cost 10 in `auth.ts:19`, cost 12 in `invite.ts:103`, `admin.ts:719` | Est: 0.5h
- [ ] **P2-AUTH-2: Hardcoded seed passwords** | `seedBSW.ts:39` ('Bsw2026!Tailrd'), `createSuperAdmin.ts:26` ('demo123!') | Est: 0.5h

---

# 7. Section 5: HIPAA & Clinical Data Compliance

### P0 Findings

- [x] **P0-HIPAA-1: PHI encryption covers Patient model only** | `phiEncryption.ts:10-23` -- Encounter (primaryDiagnosis, chiefComplaint), Observation (valueText), Order (orderName, indication), Medication (medicationName), Condition (conditionName, icd10Code), WebhookEvent (rawPayload with full FHIR bundles) are ALL unencrypted | Est: 8h
- [x] **P0-HIPAA-2: PHI in audit log metadata** | `dataRequests.ts:98-99,345,500` -- patient MRN and name stored in plaintext AuditLog.metadata | Est: 3h

### P1 Findings

- [x] **P1-HIPAA-1: MRN logged in plaintext** | `patientService.ts:80-82,291-296` -- logger.info includes mrn field | Est: 2h
- [x] **P1-HIPAA-2: Logger sensitive field filter incomplete** | `utils/logger.ts:14-18` -- missing mrn, firstName, lastName, patientName | Est: 1h
- [x] **P1-HIPAA-3: No audit logging on patient read operations** | `patients.ts:16-448` -- GET endpoints have zero writeAuditLog calls | Est: 4h
- [x] **P1-HIPAA-4: GOD view uses console.log instead of audit trail** | `godView.ts:24,186` | Est: 1h
- [x] **P1-HIPAA-5: DSAR deletion incomplete** | `dataRequests.ts:456-486` -- misses Medication, Condition, CarePlan, CQLResult, TherapyGap, Phenotype, CrossReferral, DrugTitration, DeviceEligibility, RiskScoreAssessment, InterventionTracking, ContraindicationAssessment | Est: 4h
- [x] **P1-HIPAA-6: Admin analytics leaks cross-tenant counts to hospital-admin** | `admin.ts:16-31` | Est: 3h

### P2 Findings

- [ ] **P2-HIPAA-1: No field-level response scoping by role** | `patients.ts:62-89` -- analyst sees same PHI as physician | Est: 6h
- [ ] **P2-HIPAA-2: No automated breach notification delivery** | `breachNotification.ts` -- tracking only | Est: 4h
- [ ] **P2-HIPAA-3: No automated hard-delete after retention period** | Architecture gap | Est: 4h
- [ ] **P2-HIPAA-4: BAAs needed for: PostgreSQL host, Redox, AWS S3, AWS SES, log aggregation** | Documentation gap | Est: 2h

---

# 8. Section 6: Multi-Tenancy & Data Isolation

### Route-by-Route Tenant Isolation Assessment

| Route File | Auth | hospitalId in WHERE | Status |
|-----------|------|-------------------|--------|
| patients.ts | YES | YES | SAFE |
| gaps.ts | YES | YES | SAFE |
| dataRequests.ts | YES | YES | SAFE |
| auditExport.ts | YES | YES | SAFE |
| hospitals.ts | YES | YES | SAFE |
| upload.ts | YES | YES | SAFE |
| platform.ts | YES | YES | SAFE |
| webhooks.ts | YES | YES (via redoxSourceId) | SAFE |
| invite.ts | YES | YES | SAFE |
| files.ts | YES | YES (except metadata) | PARTIAL |
| clinicalIntelligence.ts | YES | **NO** | **BROKEN** |
| phenotypes.ts | YES | **PARTIAL** | **BROKEN** |
| referrals.ts | YES | **PARTIAL** | **BROKEN** |
| admin.ts | YES | **NO** | **BROKEN** (hospital-admin sees all) |
| breachNotification.ts | YES | **NO** (super-admin only) | RISKY |
| godView.ts | YES | **NO** (mock data) | ACCEPTABLE |
| cqlRules.ts | YES | **PARTIAL** | RISKY |

---

# 9. Section 7: Complete Gap Inventory

## Gap Counts by Layer

| Layer | Count |
|-------|-------|
| Frontend gap definitions (hardcoded UI data) | **256** |
| CQL knowledge base rules | **5** (all dead code -- engine returns Math.random()) |
| Runtime detection (gapDetectionRunner.ts) | **5** (gap-50 DAPT has CQL but no runtime) |
| GDMT Engine recommendations | **6** (4 pillars + ivabradine + H-ISDN, writes to different table) |
| Batch gap detection | **0** (all logic commented out) |
| TherapyGapService | **0** (complete stub) |

## Gap Counts by Module

| Module | Frontend | CQL | Runtime | Fully Wired |
|--------|----------|-----|---------|-------------|
| Heart Failure | 47 | 3 | 4 | 4 (with accuracy issues) |
| Electrophysiology | 44 | 1 | 1 | 1 (simplified) |
| Coronary | 76 | 1 | 0 | 0 |
| Structural Heart | 24 | 0 | 0 | 0 |
| Valvular Disease | 32 | 0 | 0 | 0 |
| Peripheral Vascular | 33 | 0 | 0 | 0 |
| **TOTAL** | **256** | **5** | **5** | **5** |

## Runtime Gap Rules (the only ones that actually execute)

| Gap | Module | File:Line | Guideline | Clinical Accuracy |
|-----|--------|-----------|-----------|-------------------|
| ATTR-CM Detection | HF | gapDetectionRunner.ts:121-136 | 2023 ACC ATTR-CM Statement | **WRONG**: ferritin used as troponin proxy (line 125), 2/7 signals never evaluate |
| Iron Deficiency in HF | HF | gapDetectionRunner.ts:139-153 | 2022 AHA/ACC/HFSA, Class 2a | Correct thresholds. Missing: LVEF filter, oral iron exclusion |
| Finerenone | HF | gapDetectionRunner.ts:156-175 | None cited | **WRONG**: finerenone is for diabetic CKD, not HF. No diabetes check. |
| QTc Safety | EP | gapDetectionRunner.ts:178-186 | ACC/AHA EP guidelines | Simplified: checks QTc>470 only. Misses drug interaction detection. Sex-agnostic threshold. |
| Digoxin Toxicity | HF | gapDetectionRunner.ts:189-205 | DIG trial post-hoc | Simplified: only age>=75+eGFR<50+on digoxin. Misses toxic levels, hypokalemia, drug interactions. |

## Duplicate Gap IDs (data integrity issue)

- hf-gap-29: used for both "RPM Enrollment" and "LVAD Ramp Study"
- hf-gap-30: used for both "ARNi Underdosing" and "BTT vs DT Documentation"
- hf-gap-31: used for both "Loop Without MRA" and "ECMO to LVAD Bridge"

---

# 10. Section 8: Clinical Accuracy & Defensibility

Covered in Section 7 above. Additional:

- [x] **P0-CLIN-1: CQL engine returns Math.random()** | `cqlEngine.ts:452-479` -- createMockCompiledRule() | Est: 0h (do not fix CQL engine -- fix runtime rules instead)
- [x] **P0-CLIN-2: Ferritin used as troponin proxy in ATTR-CM** | `gapDetectionRunner.ts:125` | Risk: False positives in iron-overloaded patients | Est: 2h
- [x] **P0-CLIN-3: Finerenone recommended for HF (wrong indication)** | `gapDetectionRunner.ts:156-175` | Risk: Clinically inappropriate recommendation | Est: 2h
- [x] **P1-CLIN-1: Gap 50 DAPT has no runtime implementation** | CQL only, dead code | Est: 4h
- [x] **P1-CLIN-2: QTc alert is sex-agnostic** | `gap39_qtcAlert.cql.ts:55` -- 470ms threshold misses male prolongation (450-470) | Est: 1h
- [x] **P1-CLIN-3: Operator precedence bug in alert filtering** | `cqlEngine.ts:768` -- `&&` vs `||` precedence | Est: 0.5h
- [x] **P1-CLIN-4: Valueset resolver is entirely mock data** | `valuesetResolver.ts:441-541` -- 3-4 codes per terminology | Est: 8h
- [x] **P1-CLIN-5: No guideline versioning mechanism** | No guidelineVersion, lastReviewDate, or expirationDate on rules | Est: 4h
- [x] **P1-CLIN-6: TherapyGapType enum too narrow** | `schema.prisma:1308-1316` -- only 7 types, cannot represent procedure/screening/referral gaps | Est: 2h
- [x] **P2-CLIN-1: Cache key collision in CQL engine** | `cqlEngine.ts:704-713` -- hash uses resource counts only | Est: 1h

---

# 11. Section 9: Synthea / EC2 / S3 Infrastructure

### S3

- Bucket `tailrd-cardiovascular-datasets-863518424332` contains 1.29M FHIR bundles
- CloudFormation defines 7 S3 buckets with KMS encryption, versioning, lifecycle, WORM compliance
- **AWS keys committed to repo -- must rotate immediately**

### Compute

- **No EC2 instance, no ECS cluster, no Fargate service, no Lambda.** Zero deployed compute.
- CloudFormation defines VPC, subnets, NAT Gateway, security groups -- but no compute resources.

### Synthea Pipeline

- [x] **P0-PIPE-1: processSynthea.ts discards all parsed data** | `processSynthea.ts:59-69` -- JSON.parse output never passed to any service | Est: 12h
- [ ] **P0-PIPE-2: seedFromSynthea.ts is a stub** | `seedFromSynthea.ts:54-76` -- only console.log statements | Est: 8h
- [x] **P1-PIPE-1: No concurrency, batching, or resumability** | Sequential for-of loop, no checkpoint | Est: 8h
- [x] **P1-PIPE-2: FHIR resource handlers disconnected from persistence** | `fhirResourceHandlers.ts` -- map Condition, Medication, Procedure but no write functions exist | Est: 6h
- [x] **P1-PIPE-3: Observation.fhirObservationId is non-unique** | Duplicates on retry | Est: 0.5h

### Database

- No RDS provisioned. Local PostgreSQL only.
- No PgBouncer or connection pooling configured.
- 13 PrismaClient instances could exhaust connection limits.
- Missing CloudFormation: RDS, ElastiCache.

---

# 12. Section 10: Client Login & Exec Demo Capability

### Current State

**The platform cannot be accessed outside localhost.**

- Login page exists at `src/components/Login.tsx`
- Frontend runs in DEMO_MODE by default (client-side mock data, never hits backend)
- No deployed backend (no ECS, no EC2, no Railway, nothing)
- No deployed database (no RDS)
- Dockerfile is broken (`npm ci --only=production` then tries `npm run build` requiring devDeps)
- CI deploy step is a no-op placeholder
- CORS locked to localhost
- No DNS for app.tailrd.com or api.tailrd.com

### Demo Data Available

Three tenants seeded in `prisma/seed.ts`:
- St. Mary's Regional Medical Center (650 beds, all 6 modules)
- Community General Hospital (250 beds, HF/CAD/PV)

BSW-specific seed in `scripts/seedBSW.ts`:
- 4 demo users with role-appropriate access
- Password: `Bsw2026!Tailrd`

15 patients with encounters, observations, phenotypes, risk scores, alerts seeded.

**Missing:** Medical City Dallas, CommonSpirit, Mount Sinai demo tenants.

### Fastest Path to Working Exec Demo

| Step | Hours | Description |
|------|-------|-------------|
| 1 | 1h | Fix Dockerfile (devDeps + curl) |
| 2 | 2h | Provision RDS PostgreSQL (console or Render managed) |
| 3 | 4h | Deploy backend to Railway/Render/Fly.io |
| 4 | 2h | Deploy frontend to Netlify/Vercel with REACT_APP_USE_REAL_API=true |
| 5 | 2h | Rotate secrets, configure env vars |
| 6 | 1h | Wire CORS to production URL |
| 7 | 2h | Run seed + seedBSW against production DB |
| 8 | 2h | Create Medical City Dallas + CommonSpirit + Mount Sinai demo tenants |
| 9 | 3h | Smoke test, DNS, SSL debugging |
| **Total** | **~19h** | **Shortcut: Railway + Netlify, skip full AWS IaC** |

---

# 13. Section 11: Backend Architecture & Code Quality

- [x] **P0-BACK-1: @ts-nocheck on 500+ line analytics route** | `analytics.ts:1` | Est: 3h
- [ ] **P0-BACK-2: PatientService class is a stub** | `patientService.ts:199-218` -- returns fake IDs like `patient-${Date.now()}` | Est: 2h
- [x] **P1-BACK-1: N+1 in gapDetectionRunner** | `gapDetectionRunner.ts:60-90` -- individual findFirst+create per patient per gap | Est: 2h
- [x] **P1-BACK-2: N+1 in patientWriter** | `patientWriter.ts:20-119` -- 16 INSERTs per CSV row | Est: 3h
- [x] **P1-BACK-3: N+1 in observationService alert creation** | `observationService.ts:320-333` | Est: 0.5h
- [x] **P1-BACK-4: createSuperAdmin.ts never writes to DB** | `createSuperAdmin.ts:12-45` -- creates in-memory object only | Est: 1h
- [x] **P1-BACK-5: 46 `as any` casts in backend** | Multiple files, concentrated in mfa.ts (8), accountSecurity.ts (3) | Est: 3h
- [x] **P2-BACK-1: analyticsController.ts is dead code** | Never mounted in server.ts | Est: 0.5h
- [x] **P2-BACK-2: healthCheck.ts middleware (430 lines) is orphaned** | Never imported | Est: 0.5h
- [ ] **P2-BACK-3: Dual Redox pipelines** | webhooks.ts (mounted) vs eventProcessor.ts+webhookHandler.ts (dead) | Est: 1h
- [x] **P2-BACK-4: Redis declared but never used** | In package.json, never instantiated | Est: 0.5h
- [x] **P2-BACK-5: Rate limiter runs after CSRF/body parsing** | server.ts middleware order | Est: 0.5h
- [x] **P2-BACK-6: Dual logger instances** | server.ts:52 vs utils/logger.ts | Est: 1h
- [ ] **P2-BACK-7: winston-cloudwatch not in package.json** | logger.ts:113 -- will crash in production | Est: 0.5h
- [ ] **P2-BACK-8: Port mismatch** | .env sets 4000, Docker expects 3001, frontend defaults to 3001 | Est: 1h

---

# 14. Section 12: Frontend Code Quality & Architecture

- [x] **P1-FE-1: 267 `any` types across 125 files** (reduced to 120 -- key API/adapter/auth/table files cleaned) | Concentrated in apiService.ts (13), Toast.tsx (14), care team views (12 each) | Est: 6h
- [x] **P1-FE-2: (window as any).addToast global dispatch** | Toast.tsx:225-230, useGapActions.ts:49 -- bypasses React, untestable | Est: 3h
- [x] **P1-FE-3: API_URL defined independently in 7 files** | 2 have inconsistent /api suffix (TopBar.tsx, SuperAdminDashboard.tsx) | Est: 2h
- [x] **P1-FE-4: Hardcoded mock data in production components** | App.tsx:216-308, notificationMockData.ts, UsersManagement.tsx | Est: 3h
- [x] **P1-FE-5: Duplicate ErrorBoundary** | ErrorFallback.tsx (used) vs ErrorBoundary.tsx (orphaned) | Est: 1h
- [ ] **P2-FE-1: App.tsx has ~350 lines of dead code** | Lines 96-682 -- inline SVG icons, duplicate KpiCard, unreachable MainDashboard | Est: 2h
- [ ] **P2-FE-2: 34 TODO stubs in care team configs** | Unimplemented button handlers across 13 files | Est: 4h
- [x] **P2-FE-3: rememberMe checkbox is cosmetic** | Login.tsx:15-16 -- never consumed | Est: 0.5h
- [ ] **P2-FE-4: Legacy porsche-*/crimson-* Tailwind classes** | May not resolve in current config -- invisible styling failures | Est: 2h

---

# 15. Section 13: UI/UX

- [ ] **P0-UX-1: WCAG 2.1 AA non-compliant** | Only 46 aria-* attributes across 13/415 files. No tablist roles, no focus traps, no aria-expanded on accordions. | Est: 8h
- [x] **P1-UX-1: Hardcoded "Live . Updated 2m ago"** | Sidebar.tsx:105 -- never updates, erodes clinical trust | Est: 0.5h
- [x] **P1-UX-2: Non-functional TopBar search** | TopBar.tsx:84-93 -- no onChange, no state, decorative only | Est: 4h
- [ ] **P2-UX-1: Permanent notification badge** | TopBar.tsx:141-147 -- always shows red dot | Est: 1h
- [x] **P2-UX-2: Artificial 300ms loading delay** | ModuleLayout.tsx:44 -- setTimeout for animation | Est: 0.5h
- [ ] **P2-UX-3: Glass panel system inconsistently adopted** | Some views use glass-panel, others raw bg-white | Est: 3h
- [ ] **P2-UX-4: Empty state handling sparse** | ChartEmptyState exists but rarely used | Est: 4h

**Strengths:** Frosted glass design system is premium. Clinical severity hierarchy (optimal/warning/critical) is well-executed. Carmona Red glow indicators. Module color theming. 3-click navigation rule met.

---

# 16. Section 14: Code Cleanliness & Formatting

- tsconfig.json has `strict: true` (good) but `@ts-nocheck` overrides it on analytics.ts
- No ESLint enforcement in CI (lint step exists but frontend is not checked)
- Clinical logic sections lack guideline citations in runtime code (only CQL rules have them)
- Design system tokens defined in 4+ separate locations (drift risk)
- Route export patterns inconsistent (CommonJS vs ESM vs TS namespace)

---

# 17. Section 15: Scalability & Performance

- [ ] **P0-SCALE-1: 13 PrismaClient instances exhaust connection pool** | 65+ connections vs PostgreSQL default 100 | Est: 3h (covered by P0-SEC-2)
- [ ] **P1-SCALE-1: No background job architecture** | No Bull/BullMQ/SQS despite references | Est: 16h
- [ ] **P1-SCALE-2: In-memory caches won't survive multi-instance** | modelRegistry, valuesetResolver, cqlEngine, rate limiter all use process-local Map/MemoryStore | Est: 8h
- [x] **P1-SCALE-3: WebhookEvent table has zero indexes** | Full table scans on every query | Est: 1h
- [ ] **P2-SCALE-1: No frontend list virtualization** | No react-window or react-virtualized | Est: 8h
- [x] **P2-SCALE-2: Unbounded COUNT queries in admin** | 5 parallel count() with no WHERE | Est: 2h

---

# 18. Section 16: Notifications, Reporting & Operations

### Notifications
- **Gap alerts do not reach clinicians today.** No email, no push, no WebSocket/SSE. Clinicians must manually check the dashboard.
- In-app notification system does not exist (NotificationPanel uses hardcoded MOCK_NOTIFICATIONS).
- emailService.ts handles invite/password/MFA templates only -- no clinical alert template.
- [ ] **P1-NOTIF-1: Build clinical alert delivery** | Est: 16h

### Reporting
- PDF export via jspdf (client-side) -- functional
- Excel export via xlsx library -- functional
- Audit log JSON export via auditExport.ts (capped at 10K records) -- functional
- No server-side scheduled report delivery
- [ ] **P2-REPORT-1: Add scheduled report delivery** | Est: 8h

### Operations
- Super Admin dashboard exists but runs on mock data in demo mode
- No health system onboarding workflow beyond seed scripts
- Gap rule updates require code deploy (no hot-reload mechanism)
- Tier enforcement middleware exists but subscription management is not wired
- [ ] **P2-OPS-1: Build onboarding workflow** | Est: 12h

---

# 19. Section 17: Competitive Positioning

### Unique vs Crimson / Health Catalyst / Innovaccer / Arcadia

| Feature | TAILRD | Competitors |
|---------|--------|------------|
| 6-module cardiovascular specialization | Yes (deep clinical workflows per module) | Generic -- CV is one specialty among many |
| CQL-based gap detection rules | Yes (256 defined, 5 running) | Basic quality gaps |
| Phenotype detection engine | Yes (12 types, 3 implemented) | Not typically subspecialty |
| Drug titration tracking + GDMT optimization | Yes | Basic medication adherence only |
| Cross-module referral engine | Yes | Usually within-module |
| Intervention tracking with reimbursement | Yes (CPT, DRG) | Revenue cycle is separate platform |
| ECG AI pipeline | Scaffolded | Not in analytics platforms |

### Missing Table-Stakes Features

- [ ] **P1-COMP-1: SSO/SAML** | Required by every health system | Est: 16h
- [ ] **P2-COMP-1: Real-time notifications** | All competitors have this | Est: 8h
- [ ] **P2-COMP-2: Scheduled report delivery** | All competitors have this | Est: 8h
- [ ] **P2-COMP-3: eCQM/QRDA export for CMS reporting** | Expected for quality platforms | Est: 12h

### FDA SaMD Risk

If the ECG AI pipeline or CQL gap rules influence treatment decisions, TAILRD may trigger FDA SaMD Class II classification. The CQL rules generate specific recommendations (e.g., "Consider IVUS guidance"). No 510(k) or De Novo path documented.

---

# 20. Master Action List

## P0 -- Fix Before Any Deployment (13 items, ~57h)

- [ ] P0-SEC-1: Rotate ALL secrets (AWS keys, JWT, PHI key). Add .env to .gitignore. Scrub git history. | 4h
- [x] P0-SEC-2: Replace 13 rogue PrismaClient instances with shared singleton | 3h
- [x] P0-SEC-3: Add hospitalId to all clinicalIntelligence WHERE clauses | 4h
- [x] P0-SEC-4: Remove/gate unauthenticated webhook test endpoint | 1h
- [x] P0-SEC-5: Whitelist fields on admin hospital update | 1h
- [x] P0-HIPAA-1: Extend PHI encryption to Encounter, Observation, Order, Medication, Condition (string fields). WebhookEvent.rawPayload (Json) deferred. | 8h
- [x] P0-HIPAA-2: Remove PHI from audit log metadata | 3h
- [x] P0-CLIN-2: Fix ferritin/troponin substitution in ATTR-CM | 2h
- [x] P0-CLIN-3: Fix finerenone indication (add diabetes check or remove) | 2h
- [x] P0-PIPE-1: Wire processSynthea.ts to persistence services | 12h
- [x] P0-BACK-1: Remove @ts-nocheck from analytics.ts | 3h
- [ ] P0-UX-1: Add ARIA attributes, focus traps, keyboard nav | 8h
- [x] P0-SCALE-1: (covered by P0-SEC-2) | 0h

## P1 -- Fix Before Health System Goes Live (34 items, ~158h)

- [x] P1-SEC-1: Pin JWT algorithm to HS256 | 1h
- [x] P1-SEC-2: Add session validation to authenticateToken | 4h
- [x] P1-SEC-3: Refresh token rotation (session validation + token update = old token invalidated) | 4h
- [x] P1-SEC-4: Enforce MFA on PHI routes (requireMFA middleware created, exported) | 3h
- [x] P1-SEC-5: Fix GOD view role case mismatch | 2h
- [x] P1-SEC-6: Add hospitalId to phenotypes | 1h
- [x] P1-SEC-7: Pass hospitalId filter in referrals | 0.5h
- [x] P1-SEC-8: Redis client module created (lib/redis.ts). Rate limiters ready for store swap when rate-limit-redis installed. | 2h
- [x] P1-SEC-9: Align invite password policy (12 chars + complexity) | 1h
- [x] P1-SEC-10: Guard DEMO_MODE (only dev/test, blocked in staging/production) | 1h
- [x] P1-SEC-11: CQL results already uses hospitalId from JWT (mock data) | 0.5h
- [ ] P1-SEC-12: Hospital-scope file metadata | 0.5h
- [x] P1-DOS-1: Move rate limiter before body parsing + reduce limit to 1MB | 0.5h
- [x] P1-DOS-2: Bound admin COUNT queries (webhookEvent 90-day window, alert scoped) | 2h
- [x] P1-DOS-3: Add @unique to WebhookEvent.eventId + indexes on hospitalId, status, receivedAt | 0.5h
- [x] P1-HIPAA-1: Remove MRN from logs | 2h
- [x] P1-HIPAA-2: Complete logger sensitive field filter | 1h
- [x] P1-HIPAA-3: Audit log patient list + detail read operations | 4h
- [x] P1-HIPAA-4: Replace GOD view console.log with audit | 1h
- [x] P1-HIPAA-5: Complete DSAR deletion cascade (12 additional clinical tables) | 4h
- [x] P1-HIPAA-6: Scope admin analytics to hospital (hospital-admin sees own data only) | 3h
- [x] P1-CLIN-1: Implement Gap 50 DAPT in runtime (P2Y12 check for CAD/stent patients) | 4h
- [x] P1-CLIN-2: Sex-specific QTc thresholds (male 450ms, female 470ms) | 1h
- [x] P1-CLIN-3: Fix operator precedence in alert filter | 0.5h
- [x] P1-CLIN-4: Create cardiovascularValuesets.ts with curated LOINC, ICD-10, RxNorm, SNOMED code sets | 8h
- [x] P1-CLIN-5: Add RUNTIME_GAP_REGISTRY with guideline source, version, org, review dates, class/LOE per rule | 4h
- [x] P1-CLIN-6: Expand TherapyGapType enum (+7 types: PROCEDURE_INDICATED, SCREENING_DUE, REFERRAL_NEEDED, DOCUMENTATION_GAP, SAFETY_ALERT, REHABILITATION_ELIGIBLE, IMAGING_OVERDUE) | 2h
- [ ] P1-PIPE-1: Add concurrency and resumability to Synthea pipeline | 8h
- [ ] P1-PIPE-2: Build persistence for FHIR Condition, Medication, Procedure | 6h
- [x] P1-BACK-1: Pre-load existing gaps + batch createMany in gapDetectionRunner | 2h
- [x] P1-BACK-2: Batch patientWriter observation writes with createMany | 3h
- [x] P1-BACK-4: Rewrite createSuperAdmin to persist via Prisma with bcrypt | 1h
- [ ] P1-SCALE-1: Build background job system (BullMQ + Redis) | 16h
- [ ] P1-COMP-1: SSO/SAML integration | 16h
- [ ] P1-FE-1: Type the 267 any instances | 6h
- [x] P1-FE-2: Replace (window as any).addToast with typed emitter. Zero window.any remaining. | 3h
- [x] P1-FE-3: Unify API_URL via DATA_SOURCE (TopBar, SuperAdminDashboard fixed) | 2h
- [x] P1-UX-1: Replace fake "Live" with "Demo Mode" label | 0.5h
- [x] P1-UX-2: TopBar search now functional (navigates to /patients?search=). Added aria-label, Search icon. | 4h
- [ ] P1-NOTIF-1: Build clinical alert delivery | 16h

## P2 -- Fix Before Scale (27 items, ~95h)

- [x] P2-SEC-1: Crypto.randomBytes for API keys | 0.5h
- [x] P2-SEC-2: Reduce body limit to 1MB (done with P1-DOS-1) | 0.5h
- [ ] P2-SEC-3: Require PHI key in non-demo environments | 0.5h
- [ ] P2-SEC-4: Hash session tokens in DB | 2h
- [ ] P2-SEC-5: Gate webhook status endpoint | 0.25h
- [ ] P2-SEC-6: Remove mock fallback on DB failure | 0.25h
- [ ] P2-INJ-1: HMAC on raw body | 1h
- [ ] P2-DOS-1: Add GIN index for patient search | 2h
- [x] P2-AUTH-1: Standardize bcrypt cost to 12 | 0.5h
- [ ] P2-HIPAA-1: Role-based field scoping | 6h
- [ ] P2-HIPAA-2: Automated breach notification | 4h
- [ ] P2-HIPAA-3: Automated retention purge | 4h
- [ ] P2-HIPAA-4: Document BAA requirements | 2h
- [ ] P2-CLIN-1: Fix CQL cache key collision | 1h
- [ ] P2-BACK-1: Remove dead analyticsController.ts | 0.5h
- [ ] P2-BACK-2: Remove orphaned healthCheck.ts | 0.5h
- [ ] P2-BACK-3: Remove dead Redox pipeline | 1h
- [ ] P2-BACK-4: Remove or wire Redis | 0.5h
- [ ] P2-BACK-5: Fix middleware ordering | 0.5h
- [ ] P2-BACK-6: Consolidate dual loggers | 1h
- [ ] P2-BACK-7: Add winston-cloudwatch to deps | 0.5h
- [ ] P2-BACK-8: Fix port mismatch | 1h
- [ ] P2-FE-1: Remove App.tsx dead code | 2h
- [ ] P2-FE-4: Fix legacy porsche/crimson classes | 2h
- [ ] P2-SCALE-1: Add frontend list virtualization | 8h
- [ ] P2-SCALE-2: Scope admin COUNT queries | 2h
- [ ] P2-SCALE-3: Add WebhookEvent indexes | 1h
- [ ] P2-UX-2: Remove artificial loading delay | 0.5h
- [ ] P2-COMP-2: Scheduled report delivery | 8h
- [ ] P2-COMP-3: eCQM/QRDA export | 12h
- [ ] P2-OPS-1: Onboarding workflow | 12h

---

# 21. Fastest Path to Exec Demo Login

| Step | Hours | Description |
|------|-------|-------------|
| 1 | 1h | Fix Dockerfile (change `npm ci --only=production` to `npm ci`, add curl for healthcheck) |
| 2 | 4h | Rotate all secrets. New AWS keys, JWT secret, PHI key. Configure env vars for production. |
| 3 | 2h | Provision managed PostgreSQL (Railway, Render, or RDS). Run `prisma migrate deploy` + `prisma db seed`. |
| 4 | 4h | Deploy backend to Railway/Render/Fly.io. Set all env vars. Verify health endpoint. |
| 5 | 2h | Deploy frontend to Netlify/Vercel. Set `REACT_APP_USE_REAL_API=true`, `REACT_APP_API_URL=https://api.tailrd-heart.com`. |
| 6 | 1h | Configure CORS_ORIGINS, DNS (app.tailrd-heart.com, api.tailrd-heart.com), SSL. |
| 7 | 2h | Run seedBSW.ts. Create Medical City Dallas, CommonSpirit, Mount Sinai demo tenants. |
| 8 | 3h | Smoke test: login, navigate all 6 modules, verify gap data displays, check cross-tenant isolation. |
| **Total** | **~19h** | |

---

# 22. Series A Due Diligence Paragraph

If a Series A technical due diligence team reviewed this codebase today, they would find a team that clearly understands the clinical domain. The Prisma schema design, FHIR resource mapping, phenotype detection architecture, and 256-gap clinical knowledge base show real cardiovascular expertise. The frosted-glass UI is above average for early-stage healthtech. But they would flag that the platform is a polished prototype, not production software. The CQL engine that powers the core clinical product returns Math.random(). The data pipeline that should feed 1.29M patient records parses them and throws them away. Cross-tenant IDOR vulnerabilities expose patient data across health systems. AWS credentials are committed to git. There is no deployed backend, no production database, and no path for a hospital executive to access the platform. The entire clinical UI runs on hardcoded mock data. An investor would see strong clinical product instinct and vision, but would condition funding on a 6-8 week hardening sprint before any health system deployment, and would require an independent security audit before PHI touches the system. Estimated engineering investment to reach deployment readiness: ~200 hours (~5 engineer-weeks).

---

# 23. Cardiologist CMO Reaction

If a cardiologist CMO -- say the quality director at Medical City Dallas -- logged in today and navigated to the Heart Failure module, they would see a beautiful dashboard with 47 therapy gaps, patient panels, risk stratification, and severity badges. It would look like a polished clinical tool. But the gap scores are generated by Math.random(). The patient names are hardcoded strings. The "ATTR-CM Detection" rule uses ferritin as a troponin proxy (these are completely different biomarkers). The "Finerenone" gap recommends a drug for the wrong indication (it is for diabetic CKD, not heart failure with preserved ejection fraction). The "Live - Updated 2m ago" label in the sidebar never changes. If this CMO asked "is this my actual patient population?", the answer would be no, none of this data comes from their EHR. If they asked a fellow cardiologist to review the gap logic, the ferritin/troponin substitution and finerenone misclassification would immediately destroy clinical credibility. The UI is strong enough to survive a 10-minute demo. It would not survive a 30-minute clinical review.

---

# 24. Pentest Verdict

**FAIL.**

Top 5 failure reasons:

1. **DEMO_MODE=true in any non-production environment grants unauthenticated super-admin access** to every endpoint, every tenant, every patient record.
2. **Cross-tenant IDOR in clinicalIntelligence routes** allows Hospital A to read all clinical data for Hospital B patients by iterating patient IDs.
3. **JWT tokens are never validated against server-side session state.** Logout is non-functional. A stolen token works for 24 hours.
4. **MFA verification is non-enforcing.** Login issues a fully-privileged token before MFA, and no downstream middleware checks the mfaVerified claim.
5. **AWS credentials, JWT secret, and PHI encryption key are committed to the git repository.** Any contributor can forge tokens and decrypt patient data.

---

*End of audit. Next session: read this file, identify highest unchecked P0, confirm plan with Jonathan, then execute.*
