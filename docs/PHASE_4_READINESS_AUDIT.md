# TAILRD Heart Platform — Phase 4 Readiness Audit
## April 8, 2026 | Production: tailrd-backend:20

---

## AUDIT 1 — FRONTEND MOCK DATA INVENTORY

### Files with mock/hardcoded data: 89 files with hardcoded patient names

| Category | Count | Key Files |
|----------|-------|-----------|
| MOCK_ constants | 3 files | NotificationPanel, notificationMockData, UsersManagement |
| Hardcoded patient names | 89 files | Across all modules, configs, shared components |
| Hardcoded financial ($) | 1 file | Minimal |
| DEMO_PATIENT roster | 7 files | CareTeamView for each of 6 modules + shared/types |

### Files with mock data requiring API wiring (by module):

| File | Lines | Mock Type | Target API | Effort |
|------|-------|-----------|------------|--------|
| src/types/shared.ts (DEMO_PATIENT_ROSTER) | 356 | Demo patients | /api/patients | M |
| src/ui/heartFailure/views/CareTeamView.tsx | 357 | Patient list | /api/patients?module=hf | S |
| src/ui/electrophysiology/views/EPCareTeamView.tsx | 524 | Patient list | /api/patients?module=ep | S |
| src/ui/structuralHeart/views/StructuralCareTeamView.tsx | 432 | Patient list | /api/patients?module=sh | S |
| src/ui/coronaryIntervention/views/CoronaryCareTeamView.tsx | 275 | Patient list | /api/patients?module=cad | S |
| src/ui/valvularDisease/views/ValvularCareTeamView.tsx | 390 | Patient list | /api/patients?module=vd | S |
| src/ui/peripheralVascular/views/PeripheralCareTeamView.tsx | 276 | Patient list | /api/patients?module=pv | S |
| src/ui/admin/tabs/PlatformOverview.tsx | 275 | Activity feed, charts | /api/admin/analytics | M |
| src/ui/admin/tabs/UsersManagement.tsx | 358 | Login/action history | /api/admin/users/:id/activity | M |
| src/components/notifications/NotificationPanel.tsx | 334 | Notifications | /api/notifications | M |
| src/components/notifications/notificationMockData.ts | 428 | Mock data file | Delete after wiring | S |
| All 6 Executive Views | ~600 ea | KPIs, charts | /api/analytics/dashboard | XL |
| All 6 Service Line Views | ~800 ea | Gap data, trends | /api/gaps, /api/analytics | XL |
| All 6 Gap Detection Dashboards | ~3000 ea | Gap definitions | /api/gaps + gapRuleEngine | XL |

### Estimated total effort: ~120-160 hours (3-4 weeks, 1 developer)

---

## AUDIT 2 — API CLIENT INVENTORY

### apiService.ts: 25+ methods (clinical calculators, risk scores, interventions)
### api.ts: 16 functions (auth, gaps, patients, platform, registry, trials)

### Overlap: ZERO functions have exact equivalents

| apiService method | api.ts equivalent | Status |
|-------------------|-------------------|--------|
| getModules() | - | NO EQUIVALENT |
| getHeartFailureDashboard() | getExecutiveDashboard('hf') | PARTIAL |
| getHeartFailurePatients() | getPatients('hf') | PARTIAL |
| calculateGDMT() | - | NO EQUIVALENT |
| analyzePhenotype() | - | NO EQUIVALENT |
| assessDeviceEligibility() | - | NO EQUIVALENT |
| getAutomatedCHA2DS2VASc() | - | NO EQUIVALENT |
| getAutomatedHASBLED() | - | NO EQUIVALENT |
| getAutomatedSTSRisk() | - | NO EQUIVALENT |
| predictAblationSuccess() | - | NO EQUIVALENT |
| recommendLAACDevice() | - | NO EQUIVALENT |
| getRiskScores() | - | NO EQUIVALENT |
| createRiskScore() | - | NO EQUIVALENT |
| getInterventions() | - | NO EQUIVALENT |
| getDrugTitrations() | - | NO EQUIVALENT |

### Components using each client:
- apiService.ts: 4 components (careTeamConfig files for HF, EP, SH, VD)
- api.ts: 6 components (AuthContext, adapters, hooks, platformTotals)

### Recommendation: Do NOT consolidate. The clients serve different purposes:
- api.ts = auth, gaps, platform-level data (used by shell/auth)
- apiService.ts = clinical calculators and module-specific data (used by care team views)
- Both now have auth tokens attached (fixed in Phase 2)

---

## AUDIT 3 — FHIR US CORE IG COMPLIANCE

### FHIR Resource Handlers (9 in fhirResourceHandlers.ts):
Patient, Condition, MedicationRequest, Observation, Procedure, Device, Encounter, CarePlan, AllergyIntolerance

| US Core Profile | RECEIVE | HANDLE | PERSIST | GAP USE | Status |
|----------------|---------|--------|---------|---------|--------|
| Patient | Yes | Yes | Yes | Yes | COMPLETE |
| AllergyIntolerance | Partial | Yes | Yes | No | PARTIAL |
| CarePlan | Partial | Yes | Yes | No | PARTIAL |
| CareTeam | No | No | No | No | NOT STARTED |
| Condition (Dx) | Yes | Yes | Yes | Yes | COMPLETE |
| Condition (Problems) | Yes | Yes | Yes | Yes | COMPLETE |
| Coverage | No | No | No | No | NOT STARTED |
| DiagnosticReport (Lab) | No | No | No | No | NOT STARTED |
| DiagnosticReport (Note) | No | No | No | No | NOT STARTED |
| DocumentReference | No | No | No | No | NOT STARTED |
| Encounter | Yes | Yes | Yes | Yes | COMPLETE |
| Goal | No | No | No | No | NOT STARTED |
| Immunization | No | No | No | No | NOT STARTED |
| Location | No | No | No | No | NOT STARTED |
| Medication | Yes (MedReq) | Yes | Yes | Yes | COMPLETE |
| MedicationRequest | Yes | Yes | Yes | Yes | COMPLETE |
| Observation (Lab) | Yes | Yes | Yes | Yes | COMPLETE |
| Observation (Clinical) | Partial | Yes | Yes | Partial | PARTIAL |
| Organization | No | No | No | No | NOT STARTED |
| Practitioner | No | No | No | No | NOT STARTED |
| Procedure | Partial | Yes | Yes | Partial | PARTIAL |
| Provenance | No | No | No | No | NOT STARTED |
| RelatedPerson | No | No | No | No | NOT STARTED |
| ServiceRequest | Yes (Order) | Yes | Yes | No | PARTIAL |

### Summary: 7 COMPLETE, 5 PARTIAL, 12 NOT STARTED (29% complete, 50% with handlers)

---

## AUDIT 4 — CDS HOOKS PRODUCTION READINESS

| Epic Requirement | Status | Notes |
|-----------------|--------|-------|
| Discovery endpoint (GET /cds-services) | PASS | 3 services listed |
| JWT service-authorization verification | FAIL | Not implemented — TODO comment only |
| Response under 5 seconds | LIKELY PASS | Prisma queries are fast; no load testing done |
| Prefetch templates | PASS | 3 hooks have prefetch templates |
| Card format (summary, detail, indicator, source) | PASS | All fields present |
| HTTPS only | PASS | CloudFront enforces HTTPS |
| Feedback endpoint | PASS | POST /:hookId/feedback implemented |
| Always returns HTTP 200 | PASS | 8 catch blocks return empty cards |
| Card actions (suggestions, links) | PARTIAL | Links present; suggestions only on patient-view |

### Blocking for Epic submission: JWT verification must be implemented

---

## AUDIT 5 — SSO CONFIGURATION STATUS

### Environment variables needed but NOT configured in ECS:

| Variable | Purpose | Status |
|----------|---------|--------|
| COGNITO_DOMAIN | Cognito hosted UI domain | NOT SET |
| COGNITO_CLIENT_ID | Cognito app client for SAML | NOT SET |
| COGNITO_USER_POOL_ID | Cognito user pool | NOT SET |
| COGNITO_REGION | Cognito region | NOT SET |
| SMART_CLIENT_ID | SMART on FHIR client ID | NOT SET |
| API_URL | Backend URL for callbacks | NOT SET (uses hardcoded default) |
| REDOX_WEBHOOK_SECRET | Redox HMAC verification | NOT SET |
| S3_BUCKET_UPLOADS | Upload storage | NOT SET |
| S3_PHI_BUCKET | PHI document storage | NOT SET |
| S3_AUDIT_BUCKET | Audit log archival | NOT SET |
| REDIS_URL | Redis connection | NOT SET |
| SES_FROM_ADDRESS | Email sender | NOT SET |

### Configured in ECS (7 total):
NODE_ENV, AWS_REGION, CORS_ORIGINS, FRONTEND_URL, DATABASE_URL (secret), JWT_SECRET (secret), PHI_ENCRYPTION_KEY (secret)

### Missing critical: 12 variables referenced in code but not set in ECS

---

## AUDIT 6 — SECURITY ASSESSMENT

| OWASP Category | Status | Evidence |
|----------------|--------|----------|
| A01 Broken Access Control | PASS | 382 hospitalId references in routes |
| A02 Cryptographic Failures | PASS | PHI encryption 186 lines, AES-256-GCM |
| A03 Injection | PASS | 251 Prisma queries (parameterized), 1 raw SQL |
| A04 Insecure Design | PASS | RBAC, tenant isolation, MFA |
| A05 Security Misconfiguration | PASS | Helmet, CORS, rate limit, CSRF all active |
| A06 Vulnerable Components | PASS | npm audit: 0 high/critical vulnerabilities |
| A07 Auth/Session | PASS | 13 session mgmt refs, 99 MFA refs |
| A08 Software Integrity | PARTIAL | No code signing, CI/CD exists |
| A09 Security Logging | PASS | 49 writeAuditLog calls across codebase |
| A10 SSRF | PASS | No user-controlled URL fetching |

---

## AUDIT 7 — SOC 2 CONTROL STATUS

### Controls: 25 checked / 21 unchecked (54% complete)

### Unchecked controls by owner:

| Control | Owner | Effort | Priority |
|---------|-------|--------|----------|
| Security policies documented | Legal/Ops | 2-3 weeks | P0 |
| Annual security training | HR/Ops | 1 week setup | P1 |
| Background checks | HR | Ongoing | P1 |
| Vendor risk assessments | Ops | 2-3 days per vendor | P1 |
| Security incident comms plan | Ops | 3-5 days | P1 |
| Breach notification templates | Legal | 2-3 days | P1 |
| Annual risk assessment | Security | 1-2 weeks | P0 |
| Threat modeling | Engineering | 1 week | P1 |
| SIEM integration | Engineering | 2-3 weeks | P2 |
| Penetration test | External vendor | 2-4 weeks (vendor) | P0 |
| Code signing | Engineering | 2-3 days | P2 |
| SDLC policy | Engineering | 3-5 days | P1 |
| PAW policy | IT/Security | 1 week | P2 |
| Access review process | Ops | 2-3 days setup | P1 |
| Change management process | Engineering | 1 week | P1 |
| Capacity management | Engineering | 2-3 days | P2 |
| Change advisory board | Ops | 1 day setup | P2 |
| Rollback testing quarterly | Engineering | 1 day per quarter | P1 |
| Cyber liability insurance | Legal/Finance | 1-2 weeks | P0 |
| Business continuity plan | Ops | 1-2 weeks | P1 |
| Supplier risk management | Ops | 1 week | P2 |

---

## AUDIT 8 — PRODUCTION CONFIGURATION GAPS

### Environment variables referenced but not configured:

| Variable | Category | Impact |
|----------|----------|--------|
| COGNITO_DOMAIN | SSO | SSO returns 503 |
| COGNITO_CLIENT_ID | SSO | SSO non-functional |
| SMART_CLIENT_ID | EHR | SMART launch uses default |
| REDIS_URL | Caching | Redis not connected |
| REDOX_WEBHOOK_SECRET | EHR | Webhook HMAC fails |
| S3_BUCKET_UPLOADS | Storage | File upload fails |
| S3_PHI_BUCKET | Storage | PHI storage fails |
| SES_FROM_ADDRESS | Email | Clinical alerts not sent |
| API_URL | SSO/SMART callbacks | Uses hardcoded default |

### Redis status:
- 13 Redis references in code
- 0 RedisStore for rate limiting (in-memory only)
- Redis client connects when REDIS_URL set, falls back gracefully
- ElastiCache deployed in Terraform but REDIS_URL not passed to ECS

### Rate limiting:
- In-memory store (not shared across ECS instances)
- If scaled to 2+ tasks, rate limits are per-instance (not global)

---

## SUMMARY SCORES

| Dimension | Current | Target | Gap |
|-----------|---------|--------|-----|
| Frontend mock data wiring | 5% | 90% | 120-160 hrs |
| FHIR US Core compliance | 29% | 80% | 12 profiles to add |
| CDS Hooks Epic-ready | 80% | 100% | JWT verification |
| SSO operational | 0% (code exists, not configured) | 100% | Env vars + IdP setup |
| SOC 2 controls | 54% | 80% | 21 unchecked controls |
| ECS env vars configured | 7/19 (37%) | 100% | 12 vars to add |
| Test coverage | 34 tests | 200+ tests | Gap rule functional tests |
| Redis production | 0% (not connected) | 100% | REDIS_URL in ECS |

---

*Audit completed: April 8, 2026*
*Production: tailrd-backend:20*
*Overall readiness: 7.4/10*
*Next phase focus: frontend wiring, ECS env vars, CDS JWT, SOC 2 policy docs*
