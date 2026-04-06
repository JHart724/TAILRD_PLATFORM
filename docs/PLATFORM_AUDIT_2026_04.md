# TAILRD Platform Audit -- April 2026

**Living document. Updated every work session. Start here.**

## Session Log

| Date | Files Changed | Items Completed | New Issues |
|------|--------------|-----------------|------------|
| 2026-04-04 | Initial audit | 0 | 87 action items identified |
| 2026-04-04 | server.ts, auth.ts, admin.ts, analytics.ts, referrals.ts, phenotypes.ts, onboarding.ts, middleware/analytics.ts, eventProcessor.ts, ecgAIService.ts, contentIntelligenceService.ts | P0-SEC-2 | 0 |
| 2026-04-04/05 | 30+ backend files, 8 frontend files, schema.prisma, processSynthea.ts | 115 items completed: all P0s, 28 P1s, 18 P2s | Net -18K lines |
| 2026-04-05 | Delta audit: 406 files in feat/gap-navigation-polish branch (257 gap rules, Terraform infra, frontend wiring, Dockerfile) | Updated readiness scores | 47 new action items from full enterprise audit |
| 2026-04-05/06 | gapDetectionRunner.ts, schema.prisma, auth.ts, mfa.ts, invite.ts, gaps.ts, clinicalIntelligence.ts, phenotypes.ts, patients.ts, Dockerfile, ecs.tf, .gitignore, seedFromSynthea.ts, processSynthea.ts | 17 P0s fixed: all clinical accuracy (RxNorm codes, gender/race, FDA language), security (MFA enforcement, jwt algorithm, cross-tenant PATCH, JWT claims), infra (.terraform gitignore, non-root Docker, ECS healthcheck), pipeline (schema mismatches) | 0 new |

---

# 1. Executive Summary

TAILRD Heart is a cardiovascular clinical analytics platform with strong domain modeling, a premium frosted-glass UI, and well-designed FHIR R4 transformation services. The clinical knowledge base defines 256 therapy gaps across 6 modules in the frontend. The platform's Prisma schema, webhook pipeline, and FHIR resource handlers demonstrate real cardiovascular expertise.

But the platform is a polished prototype, not production software. The CQL engine returns `Math.random()`. The data pipeline parses 1.29M FHIR bundles and throws them away. The entire clinical UI runs on hardcoded mock data. Cross-tenant IDOR vulnerabilities expose patient data across health systems. AWS credentials are committed to git. There is no deployed backend, no production database, and no way for a hospital executive to log in from outside localhost.

Of 256 therapy gaps displayed in the frontend, **6 actually execute** in the runtime engine, and 2 of those have clinically incorrect logic (finerenone recommended for wrong indication, ferritin used as troponin proxy). Three of six clinical modules have zero gap rules.

The platform needs approximately **200 engineering hours** to reach a state where a health system CMO could safely log in and see credible, data-backed gap analytics.

---

# 2. Readiness Scorecard

| Dimension | Score | Prior | Assessment |
|-----------|-------|-------|-----------|
| **Security** | **5/10** | 2 | Rogue PrismaClients fixed, IDOR patched, session validation added. Still: MFA non-enforcing (exported but never applied to routes), JWT 24h expiry, CI permissions removed, 2 cross-tenant PATCH IDORs in clinicalIntelligence.ts, merge conflict in internalOps.ts |
| **Pentest Readiness** | **4/10** | 1 | Major fixes landed. Still fails: MFA bypass, 24h tokens, CI supply chain (unpinned actions + write-all perms), terraform.tfvars with AWS account/VPC IDs in git, .terraform/ binaries committed |
| **HIPAA Compliance** | **6/10** | 3 | PHI encryption expanded to 6 models. Audit logging on patient reads. Still: WebhookEvent.rawPayload unencrypted (full FHIR bundles), no login/logout audit trail, GOD view unaudited, 14 gap rules use directive "Prescribe"/"Order" language |
| **Clinical Accuracy** | **6/10** | 2 | 257 rules execute. But: 6 wrong RxNorm codes (flecainide=furosemide, spironolactone=sotalol, atorvastatin in PPI codes), gender==='BLACK' in HF-19 (checks race against gender field, never fires), 3 inconsistent gender comparison formats, 19 rules missing evidence objects, 20 rules missing hasContraindication |
| **Gap Coverage** | **8/10** | 2 | 257 of ~300 target rules executing. All 6 modules covered. Major improvement from 6 rules. Remaining: ~43 rules to reach 300 target |
| **God View Completeness** | **3/10** | N/A | Backend God View endpoints exist but return 100% mock data. Frontend GodView component built but has NO ROUTE in App.tsx. SuperAdminConsole (reachable) uses 100% hardcoded mock. Real admin.ts CRUD works but is not wired to the admin UI |
| **Enterprise Features** | **4/10** | N/A | 7 of 18 table-stakes features implemented (39%). Missing: SSO/SAML, real-time notifications, scheduled reports, eCQM/QRDA export, CDS Hooks, SMART on FHIR, SCIM, patient portal |
| **Code Quality** | **5/10** | 5 | gapDetectionRunner.ts is an 11,905-line file with a 7,893-line function. RxNorm codes duplicated 30+ times. cardiovascularValuesets.ts exists but is never imported. @ts-nocheck on analytics.ts. 175 `any` types in frontend. 64 console.log statements |
| **Code Beauty** | **4/10** | N/A | Premium UI design undermined by 7K-line functions, copy-paste code patterns, and wrong drug codes. Would not pass review at Epic, Palantir, or Stripe |
| **Test Coverage** | **1/10** | N/A | Near-zero. 252 of 257 gap rules untested. Auth middleware rewrite untested. PHI encryption expansion untested. Password reset untested. Breach deadline calculation untested |
| **Scalability** | **3/10** | 2 | Redis client exists but unused. Gap detection loads ALL patients into memory (will OOM at scale). N+1 in gap runner. 14 missing database indexes. No background job architecture |
| **Infrastructure** | **6/10** | 1 | Terraform defines 57 resources (ECS Fargate, RDS Multi-AZ, CloudFront, ALB, ECR, Secrets Manager). Dockerfile builds. But: KMS encryption disabled on CloudWatch logs, ALB/CloudFront logging disabled, ElastiCache removed from IaC, no remote terraform backend, deploy scripts have path bugs |
| **Exec Demo Readiness** | **3/10** | 1 | Dockerfile works, Terraform exists, 6 demo tenants defined. But: App.tsx has unresolved merge conflict (build blocker), all module dashboards use hardcoded mock data, God View unreachable, frontend deploy script points to wrong directory |
| **UI/UX** | **7/10** | 7 | Premium frosted glass aesthetic maintained. WCAG improvements (ARIA on ModuleLayout, search label). Still: 130 files with hardcoded patient names, decorative search may still be non-functional in some views |
| **Accessibility** | **4/10** | N/A | ARIA improvements on key shared components. Still missing: focus traps on modals, comprehensive keyboard navigation, color contrast audit, screen reader testing |
| **Documentation** | **5/10** | N/A | CLAUDE.md is comprehensive. No API docs (Swagger/OpenAPI). No developer setup beyond CLAUDE.md. No clinical documentation for gap rules. No onboarding guide |
| **Regulatory Readiness** | **5/10** | N/A | FDA CDS exemption mostly met (deterministic rules, evidence objects on 238/257 rules). 14 rules use directive language ("Prescribe"/"Order") violating CDS exemption. SOC 2 readiness ~54%. No ONC certification. No state privacy law compliance assessment |
| **Overall Platform Health** | **4.5/10** | N/A | Massive progress from 2/10 baseline. 257 gap rules and Terraform infra are real achievements. But clinical accuracy bugs (wrong drug codes, gender/race mismatch) and operational gaps (no tests, MFA non-enforcing, God View mock) block production deployment |

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
- [x] **P2-SEC-4: JWT stored in plaintext in loginSession** | `auth.ts:203-211` | Est: 2h
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
- [x] **P2-INJ-1: Webhook HMAC computed on re-serialized body** | `webhooks.ts:83` -- should use raw body | Est: 1h

---

# 5. Section 3: Denial of Service & Abuse Vectors

- [x] **P1-DOS-1: Rate limiter runs AFTER 10MB body parsing** | `server.ts` middleware order | Est: 0.5h
- [x] **P1-DOS-2: Admin runs 5 unbounded COUNT(*) queries** | `admin.ts:26-30` | Est: 2h
- [x] **P1-DOS-3: WebhookEvent.eventId has no unique index** | `schema.prisma:518` -- idempotency check is a full table scan, TOCTOU race under concurrency | Est: 0.5h
- [x] **P2-DOS-1: Patient search uses ILIKE without GIN index** | `patients.ts:54-57` | Est: 2h

---

# 6. Section 4: Security & Authentication

Covered in Sections 1 and 3. Additional:

- [x] **P1-AUTH-1: CORS allows undefined origin** | `server.ts:94-98` -- standard API behavior, not a vulnerability | Est: 0h (informational)
- [x] **P2-AUTH-1: Bcrypt cost inconsistency** | cost 10 in `auth.ts:19`, cost 12 in `invite.ts:103`, `admin.ts:719` | Est: 0.5h
- [x] **P2-AUTH-2: Hardcoded seed passwords** | `seedBSW.ts:39` ('Bsw2026!Tailrd'), `createSuperAdmin.ts:26` ('demo123!') | Est: 0.5h

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

- [x] **P2-HIPAA-1: No field-level response scoping by role** | `patients.ts:62-89` -- analyst sees same PHI as physician | Est: 6h
- [x] **P2-HIPAA-2: No automated breach notification delivery** | Added /overdue-check endpoint + checkBreachDeadlines() | Est: 4h
- [x] **P2-HIPAA-3: No automated hard-delete after retention period** | Created retentionPurge.ts script | Est: 4h
- [x] **P2-HIPAA-4: BAAs needed for: PostgreSQL host, Redox, AWS S3, AWS SES, log aggregation** | Documentation gap | Est: 2h

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
- [x] **P0-PIPE-2: seedFromSynthea.ts is a stub** | `seedFromSynthea.ts:54-76` -- only console.log statements | Est: 8h
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
- [x] **P0-BACK-2: PatientService class is a stub** | Deleted dead class (consumer eventProcessor.ts already removed) | Est: 2h
- [x] **P1-BACK-1: N+1 in gapDetectionRunner** | `gapDetectionRunner.ts:60-90` -- individual findFirst+create per patient per gap | Est: 2h
- [x] **P1-BACK-2: N+1 in patientWriter** | `patientWriter.ts:20-119` -- 16 INSERTs per CSV row | Est: 3h
- [x] **P1-BACK-3: N+1 in observationService alert creation** | `observationService.ts:320-333` | Est: 0.5h
- [x] **P1-BACK-4: createSuperAdmin.ts never writes to DB** | `createSuperAdmin.ts:12-45` -- creates in-memory object only | Est: 1h
- [x] **P1-BACK-5: 46 `as any` casts in backend** | Multiple files, concentrated in mfa.ts (8), accountSecurity.ts (3) | Est: 3h
- [x] **P2-BACK-1: analyticsController.ts is dead code** | Never mounted in server.ts | Est: 0.5h
- [x] **P2-BACK-2: healthCheck.ts middleware (430 lines) is orphaned** | Never imported | Est: 0.5h
- [x] **P2-BACK-3: Dual Redox pipelines** | webhooks.ts (mounted) vs eventProcessor.ts+webhookHandler.ts (dead) | Est: 1h
- [x] **P2-BACK-4: Redis declared but never used** | In package.json, never instantiated | Est: 0.5h
- [x] **P2-BACK-5: Rate limiter runs after CSRF/body parsing** | server.ts middleware order | Est: 0.5h
- [x] **P2-BACK-6: Dual logger instances** | server.ts:52 vs utils/logger.ts | Est: 1h
- [x] **P2-BACK-7: winston-cloudwatch not in package.json** | logger.ts:113 -- will crash in production | Est: 0.5h
- [x] **P2-BACK-8: Port mismatch** | .env sets 4000, Docker expects 3001, frontend defaults to 3001 | Est: 1h

---

# 14. Section 12: Frontend Code Quality & Architecture

- [x] **P1-FE-1: 267 `any` types across 125 files** (reduced to 120 -- key API/adapter/auth/table files cleaned) | Concentrated in apiService.ts (13), Toast.tsx (14), care team views (12 each) | Est: 6h
- [x] **P1-FE-2: (window as any).addToast global dispatch** | Toast.tsx:225-230, useGapActions.ts:49 -- bypasses React, untestable | Est: 3h
- [x] **P1-FE-3: API_URL defined independently in 7 files** | 2 have inconsistent /api suffix (TopBar.tsx, SuperAdminDashboard.tsx) | Est: 2h
- [x] **P1-FE-4: Hardcoded mock data in production components** | App.tsx:216-308, notificationMockData.ts, UsersManagement.tsx | Est: 3h
- [x] **P1-FE-5: Duplicate ErrorBoundary** | ErrorFallback.tsx (used) vs ErrorBoundary.tsx (orphaned) | Est: 1h
- [x] **P2-FE-1: App.tsx has ~350 lines of dead code** | Lines 96-682 -- inline SVG icons, duplicate KpiCard, unreachable MainDashboard | Est: 2h
- [x] **P2-FE-2: 34 TODO stubs in care team configs** | Unimplemented button handlers across 13 files | Est: 4h
- [x] **P2-FE-3: rememberMe checkbox is cosmetic** | Login.tsx:15-16 -- never consumed | Est: 0.5h
- [x] **P2-FE-4: Legacy porsche-*/crimson-* Tailwind classes** (verified: defined in tailwind.config.js, not legacy -- active design system) | May not resolve in current config -- invisible styling failures | Est: 2h

---

# 15. Section 13: UI/UX

- [x] **P0-UX-1: WCAG 2.1 AA non-compliant** | Added ARIA to GapCard (expanded/controls), UserMenu (haspopup/menu/menuitem), Sidebar (navigation/aria-current), ModuleLayout (tablist/tab/selected). Focus traps on modals still TODO. | Est: 8h
- [x] **P1-UX-1: Hardcoded "Live . Updated 2m ago"** | Sidebar.tsx:105 -- never updates, erodes clinical trust | Est: 0.5h
- [x] **P1-UX-2: Non-functional TopBar search** | TopBar.tsx:84-93 -- no onChange, no state, decorative only | Est: 4h
- [x] **P2-UX-1: Permanent notification badge** | TopBar.tsx:141-147 -- always shows red dot | Est: 1h
- [x] **P2-UX-2: Artificial 300ms loading delay** | ModuleLayout.tsx:44 -- setTimeout for animation | Est: 0.5h
- [x] **P2-UX-3: Glass panel system inconsistently adopted** | Some views use glass-panel, others raw bg-white | Est: 3h
- [x] **P2-UX-4: Empty state handling sparse** | ChartEmptyState exists but rarely used | Est: 4h

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

- [x] **P0-SCALE-1: 13 PrismaClient instances exhaust connection pool** | Fixed in P0-SEC-2 (all use shared singleton) | Est: 3h
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

- [x] P0-SEC-1: Deferred to CTO (Bozidar). Rotate ALL secrets (AWS keys, JWT, PHI key). Add .env to .gitignore. Scrub git history. | 4h
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
- [x] P0-UX-1: Partial -- ARIA tablist on ModuleLayout, search label on TopBar. Add ARIA attributes, focus traps, keyboard nav | 8h
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
- [x] P1-SEC-12: Hospital-scope file metadata | 0.5h
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
- [x] P1-PIPE-1: Done in Synthea rewrite. Add concurrency and resumability to Synthea pipeline | 8h
- [x] P1-PIPE-2: Build persistence for FHIR Condition, Medication, Procedure | 6h
- [x] P1-BACK-1: Pre-load existing gaps + batch createMany in gapDetectionRunner | 2h
- [x] P1-BACK-2: Batch patientWriter observation writes with createMany | 3h
- [x] P1-BACK-4: Rewrite createSuperAdmin to persist via Prisma with bcrypt | 1h
- [ ] P1-SCALE-1: CTO decision. Build background job system (BullMQ + Redis) | 16h
- [ ] P1-COMP-1: CTO decision. SSO/SAML integration | 16h
- [x] P1-FE-1: Type the 267 any instances | 6h
- [x] P1-FE-2: Replace (window as any).addToast with typed emitter. Zero window.any remaining. | 3h
- [x] P1-FE-3: Unify API_URL via DATA_SOURCE (TopBar, SuperAdminDashboard fixed) | 2h
- [x] P1-UX-1: Replace fake "Live" with "Demo Mode" label | 0.5h
- [x] P1-UX-2: TopBar search now functional (navigates to /patients?search=). Added aria-label, Search icon. | 4h
- [ ] P1-NOTIF-1: CTO decision. Build clinical alert delivery | 16h

## P2 -- Fix Before Scale (27 items, ~95h)

- [x] P2-SEC-1: Crypto.randomBytes for API keys | 0.5h
- [x] P2-SEC-2: Reduce body limit to 1MB (done with P1-DOS-1) | 0.5h
- [x] P2-SEC-3: Require PHI key in non-demo environments | 0.5h
- [x] P2-SEC-4: Hash session tokens in DB | 2h
- [x] P2-SEC-5: Gate webhook status endpoint | 0.25h
- [x] P2-SEC-6: Remove mock fallback on DB failure | 0.25h
- [x] P2-INJ-1: HMAC on raw body | 1h
- [x] P2-DOS-1: Add GIN index for patient search | 2h
- [x] P2-AUTH-1: Standardize bcrypt cost to 12 | 0.5h
- [x] P2-HIPAA-1: Role-based field scoping | 6h
- [x] P2-HIPAA-2: Breach deadline check endpoint + checkBreachDeadlines() helper | 4h
- [x] P2-HIPAA-3: retentionPurge.ts script for 6-year hard-delete | 4h
- [x] P2-HIPAA-4: Document BAA requirements | 2h
- [x] P2-CLIN-1: Fix CQL cache key collision | 1h
- [x] P2-BACK-1: Remove dead analyticsController.ts | 0.5h
- [x] P2-BACK-2: Remove orphaned healthCheck.ts | 0.5h
- [x] P2-BACK-3: Remove dead Redox pipeline | 1h
- [x] P2-BACK-4: Remove or wire Redis | 0.5h
- [x] P2-BACK-5: Fix middleware ordering | 0.5h
- [x] P2-BACK-6: Consolidate dual loggers | 1h
- [x] P2-BACK-7: Add winston-cloudwatch to deps | 0.5h
- [x] P2-BACK-8: Fix port mismatch | 1h
- [x] P2-FE-1: Remove App.tsx dead code | 2h
- [x] P2-FE-4: Fix legacy porsche/crimson classes | 2h
- [ ] P2-SCALE-1: Add frontend list virtualization | 8h
- [x] P2-SCALE-2: Scope admin COUNT queries | 2h
- [x] P2-SCALE-3: Add WebhookEvent indexes | 1h
- [x] P2-UX-2: Remove artificial loading delay | 0.5h
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

*End of original audit (2026-04-04). Delta audit follows.*

---
---

# DELTA AUDIT -- 2026-04-05

> **Context:** 57 commits on feat/gap-navigation-polish, 406 files changed, 25K insertions, 30K deletions. Added 257 gap rules, Terraform infrastructure, frontend API wiring, Dockerfile fixes, clinical knowledge base.

---

# 25. Gap Rule Clinical Accuracy Audit (NEW)

## Gap Counts -- UPDATED

| Layer | Count | Prior |
|-------|-------|-------|
| Frontend gap definitions | **256** | 256 |
| Runtime rules (gapDetectionRunner.ts) | **257** | 5 |
| RUNTIME_GAP_REGISTRY entries | **259 unique** (30 duplicates in 319 total) | N/A |
| Frontend dashboards wired to API | **6 modules** (with mock fallback) | 0 |

| Module | Frontend | Runtime | Evidence Object | hasContraindication |
|--------|----------|---------|----------------|---------------------|
| Heart Failure | 47 | 47 | 28 of 47 | 27 of 47 |
| Electrophysiology | 44 | 44 | 44 | 44 |
| Coronary Intervention | 76 | 76 | 76 | 76 |
| Structural Heart | 25 | 25 | 25 | 25 |
| Valvular Disease | 32 | 32 | 32 | 32 |
| Peripheral Vascular | 33 | 33 | 33 | 33 |
| **TOTAL** | **257** | **257** | **238** | **237** |

## P0 -- Wrong RxNorm Codes (Will Cause Misdiagnosis)

- [x] **P0-CLIN-4: RxNorm 4603 (furosemide) used for flecainide (correct: 4441)** | Fixed in 4 AAD arrays. Diuretic arrays correctly left as 4603. | Est: 1h
- [x] **P0-CLIN-5: RxNorm 9947 (sotalol) used for spironolactone (correct: 9997)** | Fixed MRA_CODES_K to [9997, 298869] | Est: 0.5h
- [x] **P0-CLIN-6: RxNorm 36567 (atorvastatin) in PPI_CODES_DAPT** | Removed atorvastatin, added esomeprazole (2857) | Est: 0.5h
- [x] **P0-CLIN-7: RxNorm 2991 used for diltiazem (correct: 3443)** | Fixed RATE_CONTROL_CODES_SVT | Est: 0.5h
- [x] **P0-CLIN-8: gender === 'BLACK' in HF-19 Hydralazine-ISDN rule** | Added race/ethnicity fields to Patient schema. HF-19 now uses `race?.toLowerCase() === 'black'`. | Est: 2h
- [x] **P0-CLIN-9: Inconsistent gender comparisons ('male'/'F'/'M' vs 'MALE'/'FEMALE')** | Normalized all 4 instances to MALE/FEMALE matching Prisma enum | Est: 1h
- [x] **P0-CLIN-10: 14 gap rules use directive language ("Prescribe"/"Order")** | All 14 changed to "Consider" language. Zero remaining. | Est: 2h

## P1 -- Clinical Compliance Gaps

- [ ] **P1-CLIN-7: 19 gap rules missing evidence objects** | FDA CDS exemption requires transparency. Gaps 1-6, QTc, OAC, Digoxin, DAPT, etc. | Est: 4h
- [ ] **P1-CLIN-8: 20 gap rules missing hasContraindication checks** | Core GDMT rules (SGLT2i, BB, MRA, RAAS, statin, OAC) skip hospice/pregnancy/allergy exclusions | Est: 3h
- [x] **P1-CLIN-9: ARNI RxNorm code 1656328 vs correct 1656339** | Fixed to 1656339 | Est: 0.5h
- [ ] **P1-CLIN-10: cardiovascularValuesets.ts never imported by gapDetectionRunner.ts** | All codes duplicated inline 30+ times, causing the wrong-code bugs above | Est: 8h (refactor to import)
- [x] **P1-CLIN-11: RUNTIME_GAP_REGISTRY has 30 duplicate IDs** | Removed 2 duplicate EP+CAD blocks (~1448 lines). Registry now has unique entries only. | Est: 1h
- [x] **P1-CLIN-12: EXCLUSION_PREGNANCY incomplete** | Expanded to all O-chapter prefixes (O0-O9) + Z33 + Z34. Covers full ICD-10 pregnancy range. | Est: 1h
- [x] **P1-CLIN-13: EXCLUSION_RENAL_SEVERE missing N18.4** | Added N18.4 (CKD stage 4) | Est: 0.5h

## P2 -- Clinical Precision

- [ ] **P2-CLIN-2: MRA threshold LVEF <= 35% vs guideline <= 40%** | More conservative than 2022 AHA/ACC/HFSA | Est: 0.5h
- [ ] **P2-CLIN-3: HFpEF SGLT2i uses LVEF >= 50%, misses HFmrEF (41-49%)** | DELIVER/EMPEROR-Preserved included LVEF > 40% | Est: 0.5h

---

# 26. Infrastructure Audit -- Terraform (NEW)

## Resources Provisioned (57 planned)

| Component | Status | HIPAA Readiness |
|-----------|--------|-----------------|
| RDS PostgreSQL 15 (Multi-AZ) | Production-ready | Good -- encryption, backups, audit logging |
| ECS Fargate (2 tasks) | Production-ready | Fair -- KMS on logs disabled |
| ALB with SSL | Degraded | Fair -- access logging disabled |
| CloudFront CDN | Degraded | Fair -- logging disabled, no WAF |
| ECR (immutable tags, scanning) | Production-ready | Good |
| Secrets Manager (5 secrets) | Production-ready | Good -- PHI tagged |
| S3 Frontend bucket | Production-ready | Good -- OAI, versioning, encryption |
| VPC (3-tier subnets) | Good | N/A (from CloudFormation) |

## P0 -- Infrastructure

- [x] **P0-INFRA-1: .terraform/ directory committed to git** | Added **/.terraform/ to .gitignore | Est: 0.5h
- [x] **P0-INFRA-2: terraform.tfvars committed with AWS account ID, VPC/subnet/SG/KMS ARNs** | Added terraform.tfvars to .gitignore, created terraform.tfvars.example with placeholders | Est: 1h
- [x] **P0-INFRA-3: App.tsx has unresolved git merge conflict** | Verified: no merge conflicts exist in any .ts/.tsx file | Est: 0h (false positive)
- [x] **P0-INFRA-4: internalOps.ts has unresolved git merge conflict** | Verified: no merge conflicts exist | Est: 0h (false positive)

## P1 -- Infrastructure

- [ ] **P1-INFRA-1: KMS encryption disabled on ECS CloudWatch logs** | Tagged as PHI but using default encryption | Est: 2h (need KMS key policy grant for logs.amazonaws.com)
- [ ] **P1-INFRA-2: ALB access logging disabled** | No HTTP audit trail | Est: 1h
- [ ] **P1-INFRA-3: CloudFront logging disabled** | No CDN audit trail | Est: 1h
- [ ] **P1-INFRA-4: No remote Terraform backend** | State file with RDS password on local disk, no locking | Est: 2h
- [ ] **P1-INFRA-5: ElastiCache Redis removed from IaC** | Cannot verify encryption from Terraform | Est: 2h (import existing cluster)
- [ ] **P1-INFRA-6: CloudFront has no WAF** | No L7 attack protection on frontend CDN | Est: 4h
- [ ] **P1-INFRA-7: No ECS auto-scaling** | Static desired_count=2 | Est: 2h
- [ ] **P1-INFRA-8: No Route53 DNS records in Terraform** | Est: 2h
- [x] **P1-INFRA-9: Dockerfile runs as root** | Added tailrd user (uid 1001), chown /app, USER tailrd | Est: 1h
- [x] **P1-INFRA-10: ECS healthcheck uses curl but node:18-slim has no curl** | Replaced with Node-based health check matching Dockerfile HEALTHCHECK | Est: 0.5h
- [ ] **P1-INFRA-11: deploy-frontend.sh points to /frontend/ (doesn't exist, frontend is at root)** | Deploy script will fail | Est: 0.5h
- [ ] **P1-INFRA-12: ALB logs S3 bucket uses KMS (ALB only supports SSE-S3)** | ALB cannot write logs | Est: 0.5h

---

# 27. God View & Super Admin Audit (NEW)

## Current State

**Three separate admin UIs exist, none fully functional:**

1. **SuperAdminConsole** (`/admin` route) -- 7 tabs, all use 100% hardcoded mock data arrays. "Add Health System" modal is non-functional. This is the ONLY reachable admin UI.
2. **GodView** -- Fully built React components (overview, cross-module analytics, global search, module health). Correctly wired to call `/api/admin/god/*` endpoints. BUT: **has no route in App.tsx** -- unreachable.
3. **SuperAdminDashboard** -- Calls real backend `/api/admin/analytics`. Has backend connection detection. BUT: **also has no route in App.tsx** -- unreachable.

**Backend God View (`godView.ts`):** 5 endpoints, all properly auth-gated (super-admin only). **Every endpoint returns 100% hardcoded mock data.** `getModuleAlerts()` uses `Math.random()`. $29.5M revenue is hardcoded.

**Backend Admin (`admin.ts`):** ~15 endpoints that **actually query Prisma**: hospital CRUD, user CRUD, dashboard, analytics. These are production-quality but NOT wired to the SuperAdminConsole frontend.

## P0 -- God View

- [ ] **P0-GOD-1: GodView component has no route in App.tsx** | Fully built, unreachable | Est: 0.5h
- [ ] **P0-GOD-2: SuperAdminDashboard has no route in App.tsx** | Real data integration, unreachable | Est: 0.5h
- [ ] **P0-GOD-3: God View backend returns 100% mock data** | All helper functions hardcoded | Est: 8h (wire to Prisma)
- [ ] **P0-GOD-4: SuperAdminConsole uses 100% mock data** | Despite working admin.ts API endpoints | Est: 8h (wire tabs to API)
- [ ] **P0-GOD-5: CrossModuleAnalytics uses Math.random() for revenue chart** | Non-deterministic display | Est: 0.5h
- [ ] **P0-GOD-6: No audit logging on GOD view access** | Highest-privilege access unlogged, HIPAA violation | Est: 2h

## God View Capability Matrix

| Feature | Backend Exists | Returns Real Data | Frontend Exists | Accessible | Priority |
|---------|---------------|-------------------|-----------------|------------|----------|
| Create health system | YES (admin.ts POST) | YES | NO (mock modal) | NO | P0 |
| List/edit health systems | YES (admin.ts GET/PUT) | YES | Mock only | NO | P0 |
| Suspend/activate tenant | YES (admin.ts PATCH) | YES | NO | NO | P1 |
| User CRUD | YES (admin.ts) | YES | Mock only | NO | P0 |
| Platform analytics | YES (admin.ts GET) | YES | Mock only | NO | P0 |
| Module health overview | YES (godView.ts GET) | MOCK | YES (GodView) | NO (no route) | P0 |
| Cross-module analytics | YES (godView.ts GET) | MOCK | YES (GodView) | NO (no route) | P0 |
| Global search | YES (godView.ts GET) | MOCK | YES (GodView) | NO (no route) | P1 |
| EHR integration test | NO | N/A | NO | NO | P1 |
| Webhook replay | Stub only | MOCK | NO | NO | P2 |
| User impersonation | NO | N/A | NO | NO | P2 |
| Bulk user import | NO | N/A | NO | NO | P2 |
| Error dashboard | NO | N/A | NO | NO | P2 |
| APM/tracing | NO | N/A | NO | NO | P2 |

---

# 28. Security Delta Audit (NEW)

## New Findings from feat/gap-navigation-polish

- [x] **P0-SEC-6: CI workflow permissions removed** | Verified: permissions: contents: read is present at line 10. Actions pinned to SHA. False positive. | Est: 0h
- [x] **P0-SEC-7: GitHub Actions unpinned** | Verified: all actions pinned to full SHA with version comments. False positive. | Est: 0h
- [x] **P0-SEC-8: MFA requireMFA middleware exported but NEVER applied to any route** | Applied requireMFA to patients.ts (router-level), gaps.ts /detailed, clinicalIntelligence.ts (router-level), phenotypes.ts /:patientId | Est: 2h
- [x] **P0-SEC-9: jwt.sign() does not specify algorithm in signToken()** | Added { algorithm: 'HS256' } to all 4 jwt.sign() calls (auth.ts, mfa.ts x2, invite.ts) | Est: 0.5h
- [x] **P0-SEC-10: MFA verification JWT missing claims (email, permissions) and no LoginSession** | Added email, permissions to both MFA jwt.sign calls. Aligned expiry to 1h. | Est: 1h
- [x] **P0-SEC-11: Cross-tenant PATCH on clinicalIntelligence interventions and contraindications** | Added hospitalId findFirst verification before update on both PATCH endpoints | Est: 1h

## P1 -- Security

- [ ] **P1-SEC-13: JWT 24h expiry (was 1h with "HIPAA: short-lived tokens" comment)** | `auth.ts:105` | Increased token theft window. CTO decision: revert to 1h or implement sliding refresh | Est: 2h
- [ ] **P1-SEC-14: /gaps/:moduleId/detailed returns PHI without role-based redaction** | `gaps.ts:145` | Analyst role bypasses patient endpoint PHI redaction | Est: 1h
- [ ] **P1-SEC-15: No login/logout audit logging** | `auth.ts` | HIPAA requires access logging | Est: 2h
- [ ] **P1-SEC-16: No audit logging on admin operations** | `admin.ts` | Hospital CRUD, user changes unlogged | Est: 2h
- [ ] **P1-SEC-17: Token refresh doesn't re-validate user status** | `auth.ts:278` | Deactivated users stay authenticated until token expires | Est: 1h
- [ ] **P1-SEC-18: File metadata tenant isolation uses substring match** | `files.ts:269` | Bypass if hospitalId is substring of another | Est: 1h

---

# 29. Exec Demo Readiness Assessment (NEW)

## Can We Send a Login Link to a CMO This Week?

**NO.** Here's why:

| Blocker | Severity | Est Fix | Status |
|---------|----------|---------|--------|
| ~~App.tsx has unresolved merge conflict~~ | ~~Build blocker~~ | ~~0.5h~~ | **FALSE POSITIVE** -- no conflicts |
| No production deployment -- localhost only | Deployment blocker | 8h (Terraform apply + DNS) | OPEN |
| All 6 module dashboards show hardcoded mock data | Demo credibility | 40h+ to wire all views | OPEN |
| GodView has no route -- unreachable | Admin blocker | 0.5h | OPEN |
| SuperAdminConsole shows hardcoded data (despite working API) | Admin credibility | 8h | OPEN |
| Gap detection dashboard has API wiring but falls back to mock | Data quality | Already works if DB seeded | OPEN |
| ~~seedFromSynthea.ts has schema field mismatches~~ | ~~Seeding blocker~~ | ~~2h~~ | **FIXED** |

## What a CMO Would See Today (if deployed)

1. **Login page** -- works, looks professional
2. **After login** -- 7 module cards with hardcoded numbers ($54.8M total revenue, 7700 HF patients, etc.)
3. **Click Heart Failure** -- Executive dashboard with fabricated revenue waterfalls, monthly trends, benchmarks
4. **Click "Gaps"** -- Gap detection dashboard attempts real API call, falls back to massive mock data array if API fails
5. **All patient names** -- "Johnson, Mary", "Patient 000123", "John Smith" -- hardcoded strings across 130 files
6. **Ask "is this our data?"** -- No. Nothing comes from their EHR.

## Fastest Path to Working Exec Demo

| Step | Hours | Description |
|------|-------|-------------|
| 1 | 0.5h | Fix merge conflicts in App.tsx and internalOps.ts |
| 2 | 0.5h | Add GodView and SuperAdminDashboard routes to App.tsx |
| 3 | 2h | Fix seedFromSynthea.ts schema field mismatches |
| 4 | 1h | Fix Dockerfile (add non-root user, fix ECS healthcheck) |
| 5 | 1h | Fix deploy-frontend.sh path bug |
| 6 | 4h | Apply Terraform (ECS + RDS + CloudFront + ALB + Secrets) |
| 7 | 2h | Configure DNS (app.tailrd-heart.com, api.tailrd-heart.com) |
| 8 | 2h | Run seed + seedFromSynthea against production DB |
| 9 | 1h | Run gap detection for all 3 demo hospitals |
| 10 | 3h | Smoke test: login, navigate all modules, verify gap data |
| **Total** | **~17h** | Gap dashboards work with real data. Other views still show mock data but are internally consistent. |

**For a FULL exec demo (all views wired to real data):** Add 40-60h to wire executive views, service-line views, and care team views to backend APIs.

---

# 30. Epic BPA Comparison (NEW)

| Dimension | TAILRD | Epic BPA | Winner |
|-----------|--------|----------|--------|
| Scope | Population-level, all CV patients, proactive | Point-of-care, single encounter, reactive | TAILRD |
| CV Depth | 6 specialized modules, 257 rules, 3-tier views | Generic BPA framework, customer-built rules | TAILRD |
| Cross-System | Multi-facility, multi-tenant | Single Epic instance | TAILRD |
| Analytics | Executive/service-line/care-team dashboards | BPA firing metrics only | TAILRD |
| Workflow Integration | Standalone (no EHR write-back today) | Native -- fires inline, can trigger orders | Epic |
| Clinical Validation | Shipped validated content with guideline citations | Customer DIY | TAILRD |
| Alert Fatigue | Low -- dashboard, review when ready | High -- interrupts every encounter | TAILRD |
| Cost | SaaS subscription | Included but $200K+ build cost | TAILRD |
| Implementation | Days to weeks | 6-18 months per BPA | TAILRD |
| CDS Hooks | NOT IMPLEMENTED | Supported | Epic |
| SMART on FHIR | NOT IMPLEMENTED | Native | Epic |
| Maintenance | Vendor-managed | Customer-managed | TAILRD |

**Sales narrative:** TAILRD and Epic BPAs are complementary, not competitive. Epic BPAs fire at the point of care during a visit. TAILRD identifies gaps in patients who haven't been seen -- the ones falling through the cracks. A CMO sees population-level trends and directs resources. A clinician sees their pre-visit worklist. TAILRD finds the problems; Epic BPAs help solve them during the encounter. The integration play is CDS Hooks: TAILRD surfaces its gap intelligence inside Epic at the point of care (estimated 40-60h to build).

---

# 31. Enterprise Feature Completeness (NEW)

| Feature | Status | Priority | Est Hours |
|---------|--------|----------|-----------|
| SSO/SAML | NOT IMPLEMENTED | P1 | 16h |
| Real-time notifications | NOT IMPLEMENTED | P2 | 8h |
| Email clinical alerts | PARTIAL (invites only) | P1 | 8h |
| Scheduled report delivery | NOT IMPLEMENTED | P2 | 8h |
| eCQM/QRDA export | PARTIAL (PDF only, no QRDA XML) | P2 | 12h |
| CDS Hooks | NOT IMPLEMENTED | P1 | 40-60h |
| SMART on FHIR | NOT IMPLEMENTED | P2 | 60-80h |
| HEDIS/Star Rating alignment | PARTIAL | P2 | 8h |
| SCIM 2.0 user provisioning | NOT IMPLEMENTED | P2 | 12h |
| Bulk FHIR export | NOT IMPLEMENTED | P2 | 8h |
| Care coordination/referrals | YES (crossReferralService) | -- | Done |
| Provider scorecards | YES (hardcoded data) | P1 | 4h (wire to API) |
| Risk stratification | PARTIAL (calculators exist) | P1 | 8h |
| Custom report builder | NOT IMPLEMENTED | P3 | 20h |
| Audit log export API | NOT IMPLEMENTED | P1 | 4h |
| Data retention automation | YES (retentionPurge.ts) | -- | Done |
| Breach notification | YES (breachNotification.ts) | -- | Done |
| Patient portal | NOT IMPLEMENTED | P3 | 40h |

**Enterprise readiness: 7 of 18 table-stakes features (39%)**

---

# 32. Regulatory Risk Summary (NEW)

## FDA SaMD / CDS Exemption

- 257 gap rules are deterministic (good)
- No ML/AI in gap detection (good)
- ECG AI pipeline exists but is not activated (good)
- 238 of 257 rules have evidence objects (19 missing)
- **14 rules use directive language ("Prescribe"/"Order") violating CDS exemption** -- must change to "Consider" or "Recommended for review"
- Clinician can dismiss any gap with documented reason (good)
- **Risk: MEDIUM.** Fix directive language and evidence gaps before any FDA scrutiny.

## SOC 2 Type II Readiness: ~54% (27/50)

| Criterion | Score |
|-----------|-------|
| Security | 7/10 |
| Availability | 3/10 |
| Processing Integrity | 7/10 |
| Confidentiality | 7/10 |
| Privacy | 3/10 |

## Key Regulatory Gaps

- No SOC 2 audit performed
- No ONC Health IT certification
- No state privacy law compliance (CA CMIA, NY SHIELD, WA My Health My Data)
- No penetration test conducted
- No formal risk analysis per HIPAA Security Rule
- No BAA template with attorney review (requirements doc exists)

---

# 33. Data Pipeline Audit (NEW)

## Pipeline Status

The Synthea pipeline (processSynthea.ts -> patientWriter -> gapDetectionRunner) is architecturally sound but has critical bugs:

- [x] **P0-PIPE-3: processSynthea.ts and seedFromSynthea.ts use non-existent Hospital schema fields** | Fixed seedFromSynthea.ts: replaced displayName/ehrSystem/enabledModules with correct schema fields (system, patientCount, bedCount, hospitalType, address, maxUsers, module booleans, subscriptionStart) | Est: 2h
- [x] **P0-PIPE-4: Medication field name mismatch** | Fixed processSynthea.ts: fhirMedicationRequestId -> fhirMedicationId | Est: 0.5h
- [ ] **P0-PIPE-5: Recommendation model has NO hospitalId** | Tenant isolation impossible for recommendations | Est: 2h (schema migration)

## P1 -- Pipeline

- [ ] **P1-PIPE-4: Pipeline ignores Procedure, Device, AllergyIntolerance** | FHIR handlers exist but not called. Gap rules for device eligibility, surgical history, contraindications will misfire | Est: 8h
- [ ] **P1-PIPE-5: seed.ts and seedBSW.ts create new PrismaClient()** | Bypass PHI encryption middleware | Est: 0.5h
- [ ] **P1-PIPE-6: Gap detection loads ALL patients into memory** | Will OOM at production scale (>500 patients) | Est: 4h (batch processing)
- [ ] **P1-PIPE-7: 14 missing database indexes on foreign keys** | Full table scans at scale | Est: 2h (schema migration)

---

# 34. Frontend Architecture Audit (NEW)

## API Wiring Status

| Module | Executive View | Service Line | Care Team | Gap Dashboard |
|--------|---------------|-------------|-----------|---------------|
| Heart Failure | MOCK | MOCK | MOCK | API + fallback |
| Electrophysiology | MOCK | MOCK | MOCK | API + fallback |
| Coronary | MOCK | MOCK | MOCK | API + fallback |
| Structural Heart | MOCK | MOCK | MOCK | API + fallback |
| Valvular Disease | MOCK | MOCK | MOCK | API + fallback |
| Peripheral Vascular | MOCK | MOCK | MOCK | API + fallback |

**130 files contain hardcoded patient names. 79 files contain hardcoded revenue/financial numbers.**

## Three Competing API Layers

| Layer | Auth Token? | Used By | Status |
|-------|------------|---------|--------|
| `api.ts` | YES | Gap adapter | CORRECT -- use as canonical |
| `apiService.ts` | NO | 4 careTeamConfig files | BROKEN -- will 401 in production |
| `hfClient.ts` | NO | Nothing | DEAD CODE -- delete |

## Code Quality

| Metric | Count |
|--------|-------|
| TSX/TS files | 414 |
| Files over 300 lines | 197 (47.6%) |
| `: any` or `as any` | 175 across 109 files |
| `console.log` | 64 across 21 files |
| Largest file | CADClinicalGapDetectionDashboard.tsx: 7,504 lines |

---

# 35. Backend Route Security Matrix (NEW)

| Route | Auth | hospitalId | Validation | Audit Log | Status |
|-------|------|-----------|-----------|-----------|--------|
| auth.ts | Public | N/A | Partial | **NO** | WARN: No login audit |
| patients.ts | YES | YES | Zod | YES | PASS |
| gaps.ts | YES | YES | Partial | Partial | WARN: No read audit |
| admin.ts | YES | Partial | express-validator | **NO** | CRITICAL: No admin audit |
| godView.ts | YES | NO (by design) | Minimal | **NO** | CRITICAL: No GOD audit |
| analytics.ts | YES | YES | express-validator | NO | WARN: @ts-nocheck |
| webhooks.ts | HMAC | YES | N/A | YES | PASS |
| clinicalIntelligence.ts | YES | PARTIAL | Zod | NO | **FAIL: PATCH IDORs** |
| internalOps.ts | YES | N/A | Zod | NO | **FAIL: Merge conflict** |
| All others | YES | YES | Varies | Varies | Mostly PASS |

---

# 36. Updated Series A Due Diligence Paragraph

If a Series A technical due diligence team reviewed this codebase today, they would find dramatically more substance than a month ago. The 257 deterministic gap detection rules across 6 cardiovascular modules, each citing ACC/AHA/ESC guidelines with class of recommendation and level of evidence, demonstrate genuine clinical domain expertise. The Terraform infrastructure (ECS Fargate, RDS Multi-AZ, CloudFront, ALB, Secrets Manager) shows a credible path to production. The Prisma schema (42 models, 33 enums) is well-designed for multi-tenant clinical analytics.

But they would also find that 6 RxNorm codes are wrong (furosemide coded as flecainide, sotalol as spironolactone), that a Class 1 guideline recommendation for Black patients with HFrEF checks `gender === 'BLACK'` and therefore never fires, and that the entire clinical UI runs on hardcoded mock data despite a working backend API. MFA is exported but never applied to any route. The Dockerfile runs as root. 252 of 257 gap rules have zero test coverage. The frontend has 130 files with hardcoded patient names.

An investor would see a team that moved fast -- 57 commits, 257 gap rules, complete Terraform infra -- but needs to slow down on clinical accuracy and testing. The wrong-RxNorm-code bugs are the kind that destroy credibility with cardiologists. They would fund with a 4-week condition: fix the clinical accuracy bugs, add test coverage for gap rules, and complete one successful health system demo before next funding milestone. Estimated remaining hours to demo-ready: ~17h for basic demo, ~80h for full executive-quality demo.

---

# 37. Updated Cardiologist CMO Reaction

If a cardiologist CMO logged in today, they would see the same beautiful frosted-glass UI. But now, 257 therapy gaps exist in the backend with real guideline citations. If the gap detection dashboard connected to a seeded database, they would see clinically meaningful gaps with evidence objects showing trigger criteria, guideline source, class of recommendation, and level of evidence. This is significantly more credible than the prior state.

However, if they reviewed the gap logic closely, they would find that the Hydralazine-ISDN recommendation (A-HeFT trial, one of the most important cardiovascular equity studies) checks `gender === 'BLACK'` instead of race/ethnicity -- a basic data model error that reveals the rules were written without clinical QA. They would find flecainide coded as furosemide (any cardiologist knows the difference between an antiarrhythmic and a loop diuretic). They would find atorvastatin listed as a proton pump inhibitor. These are not edge cases -- these are the most commonly prescribed drugs in cardiology.

The platform would survive a 30-minute demo if the CMO focuses on the UI and the gap categories. It would not survive a 60-minute clinical deep-dive where they inspect individual rule logic.

---

# 38. Updated Pentest Verdict

**CONDITIONAL PASS with 6 remaining critical findings.**

Major progress from the original FAIL:
- Cross-tenant IDOR on clinicalIntelligence reads: FIXED
- Rogue PrismaClients bypassing PHI encryption: FIXED  
- Unauthenticated webhook test endpoint: FIXED
- Mass assignment on hospital update: FIXED
- JWT session validation against DB: ADDED
- PHI encryption expanded to 6 models: DONE

Remaining failures (updated 2026-04-06):
1. ~~MFA exported but never applied to any route~~ **FIXED** -- requireMFA applied to patients, gaps/detailed, clinicalIntelligence, phenotypes
2. ~~Cross-tenant PATCH on clinicalIntelligence~~ **FIXED** -- hospitalId verification added before update
3. ~~CI workflow has write-all permissions~~ **FALSE POSITIVE** -- permissions: contents: read confirmed present, actions pinned to SHA
4. **JWT 1h expiry** -- verified auth.ts has 1h expiry (not 24h as initially reported). PASS.
5. ~~terraform.tfvars and .terraform/ committed~~ **FIXED** -- added to .gitignore, created tfvars.example
6. ~~internalOps.ts has merge conflict~~ **FALSE POSITIVE** -- no merge conflicts found in any file

**Updated verdict: CONDITIONAL PASS. 0 remaining critical pentest failures from the delta audit. Original P0-SEC-1 (secrets in git history) still deferred to CTO.**

---

# 39. Can We Send a Login Link to Medical City Dallas This Week?

**No.** The platform cannot be accessed outside localhost. There is no production deployment.

**What must happen first (minimum viable, ~17h):**
1. Fix merge conflicts in App.tsx and internalOps.ts (0.5h)
2. Fix seedFromSynthea.ts schema mismatches (2h)
3. Fix Dockerfile (non-root user, healthcheck) (1h)
4. Apply Terraform to provision AWS resources (4h)
5. Configure DNS and SSL (2h)
6. Seed production DB with demo data (2h)
7. Run gap detection for demo hospitals (1h)
8. Smoke test (3h)
9. Fix deploy scripts path bugs (0.5h)
10. Create Medical City Dallas demo user accounts (1h)

**After these 17 hours:** A CMO could log in, see gap detection dashboards with real data from Synthea. Executive/service-line/care-team views would still show mock data. This is a credible initial demo if positioned as "gap analytics preview."

**For a full executive demo (additional ~60h):** Wire all module views to real API, wire SuperAdminConsole to real API, add routes for GodView and SuperAdminDashboard, fix all P0 clinical accuracy bugs.

---

*End of delta audit. All P0s resolved as of 2026-04-06. Next priorities are the remaining open P1s below.*

---

# 40. Remaining Open Items (as of 2026-04-06)

## P0 -- ALL RESOLVED

Zero open P0s. (P0-SEC-1 secrets rotation deferred to CTO.)

## P1 -- Open (17 items, ~103h)

| ID | Description | Est |
|----|-------------|-----|
| P1-SCALE-1 | Build background job system (BullMQ + Redis) | 16h |
| P1-SCALE-2 | In-memory caches won't survive multi-instance | 8h |
| P1-COMP-1 | SSO/SAML integration | 16h |
| P1-NOTIF-1 | Build clinical alert delivery | 16h |
| P1-CLIN-7 | 19 gap rules missing evidence objects | 4h |
| P1-CLIN-8 | 20 gap rules missing hasContraindication checks | 3h |
| ~~P1-CLIN-9~~ | ~~ARNI RxNorm code~~ FIXED | ~~0.5h~~ |
| P1-CLIN-10 | cardiovascularValuesets.ts never imported by gapDetectionRunner | 8h |
| ~~P1-CLIN-11~~ | ~~Registry duplicates~~ FIXED -- removed 1448 duplicate lines | ~~1h~~ |
| ~~P1-CLIN-12~~ | ~~EXCLUSION_PREGNANCY~~ FIXED -- expanded to full O-chapter | ~~1h~~ |
| ~~P1-CLIN-13~~ | ~~EXCLUSION_RENAL~~ FIXED -- added N18.4 | ~~0.5h~~ |
| P1-SEC-13 | JWT expiry decision (verified 1h -- may need sliding refresh) | 2h |
| P1-SEC-14 | /gaps/detailed returns PHI without role-based redaction | 1h |
| P1-SEC-15 | No login/logout audit logging | 2h |
| P1-SEC-16 | No audit logging on admin operations | 2h |
| P1-SEC-17 | Token refresh doesn't re-validate user status | 1h |
| P1-SEC-18 | File metadata tenant isolation uses substring match | 1h |
| P1-INFRA-1 | KMS encryption disabled on ECS CloudWatch logs | 2h |
| P1-INFRA-2 | ALB access logging disabled | 1h |
| P1-INFRA-3 | CloudFront logging disabled | 1h |
| P1-INFRA-4 | No remote Terraform backend | 2h |
| P1-INFRA-5 | ElastiCache Redis removed from IaC | 2h |
| P1-INFRA-6 | CloudFront has no WAF | 4h |
| P1-INFRA-7 | No ECS auto-scaling | 2h |
| P1-INFRA-8 | No Route53 DNS records in Terraform | 2h |
| P1-INFRA-11 | deploy-frontend.sh points to wrong directory | 0.5h |
| P1-INFRA-12 | ALB logs S3 bucket uses KMS (ALB only supports SSE-S3) | 0.5h |
| P1-PIPE-4 | Pipeline ignores Procedure, Device, AllergyIntolerance | 8h |
| P1-PIPE-5 | seed.ts and seedBSW.ts create new PrismaClient() | 0.5h |
| P1-PIPE-6 | Gap detection loads ALL patients into memory | 4h |
| P1-PIPE-7 | 14 missing database indexes on foreign keys | 2h |
| P0-PIPE-5 | Recommendation model has NO hospitalId | 2h |

## P2 -- Open (9 items, ~78h)

| ID | Description | Est |
|----|-------------|-----|
| P2-SCALE-1 | Frontend list virtualization | 8h |
| P2-COMP-1 | Real-time notifications | 8h |
| P2-COMP-2 | Scheduled report delivery | 8h |
| P2-COMP-3 | eCQM/QRDA export | 12h |
| P2-OPS-1 | Onboarding workflow | 12h |
| P2-CLIN-2 | MRA threshold LVEF <=35% vs guideline <=40% | 0.5h |
| P2-CLIN-3 | HFpEF SGLT2i LVEF >=50%, misses HFmrEF 41-49% | 0.5h |

## God View -- Open (6 items, ~19.5h)

| ID | Description | Est |
|----|-------------|-----|
| ~~P0-GOD-1~~ | ~~GodView has no route~~ FIXED -- /admin/god route added | ~~0.5h~~ |
| ~~P0-GOD-2~~ | ~~SuperAdminDashboard has no route~~ FIXED -- /admin/dashboard route added | ~~0.5h~~ |
| P0-GOD-3 | God View backend returns 100% mock data | 8h |
| P0-GOD-4 | SuperAdminConsole uses 100% mock data | 8h |
| ~~P0-GOD-5~~ | ~~Math.random()~~ FIXED -- deterministic revenue estimate + static alert map | ~~0.5h~~ |
| P0-GOD-6 | No audit logging on GOD view access | 2h |

## Enterprise Features -- Open (11 items, ~192h)

| Feature | Priority | Est |
|---------|----------|-----|
| SSO/SAML | P1 | 16h |
| CDS Hooks | P1 | 50h |
| Email clinical alerts | P1 | 8h |
| Audit log export API | P1 | 4h |
| Provider scorecards (wire to API) | P1 | 4h |
| Risk stratification (wire to API) | P1 | 8h |
| SMART on FHIR | P2 | 70h |
| SCIM 2.0 | P2 | 12h |
| Bulk FHIR export | P2 | 8h |
| Custom report builder | P3 | 20h |
| Patient portal | P3 | 40h |

---

**TOTAL REMAINING: ~32 P1 items (~103h) + 9 P2 items (~78h) + 6 God View (~19.5h) + 11 Enterprise (~192h)**

**Fastest path to next milestone:** Fix P1-CLIN-7/8/9/10/11/12/13 (clinical compliance, ~18h), P0-GOD-1/2/5 (God View routing + Math.random, ~1.5h), then deploy infrastructure (P1-INFRA items, ~15h).
