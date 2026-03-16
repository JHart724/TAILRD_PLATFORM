# TAILRD Platform — Complete Audit & Rebuild Roadmap

**Date:** March 11, 2026
**Scope:** Full-stack audit covering Security/HIPAA, UI/UX, AWS/Data Architecture, Data Model, Infrastructure/DevOps, Internal Operations, and Visual Identity

---

# TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Security & HIPAA Compliance](#2-security--hipaa-compliance)
3. [UI/UX — Liquid Metal Visual Identity](#3-uiux--liquid-metal-visual-identity)
4. [AWS / Redox / Cloudticity Architecture](#4-aws--redox--cloudticity-architecture)
5. [Data Model & Data Flow](#5-data-model--data-flow)
6. [Infrastructure & DevOps](#6-infrastructure--devops)
7. [Internal Operations Backend](#7-internal-operations-backend)
8. [Clinical Knowledge Base Integration](#8-clinical-knowledge-base-integration)
9. [Prioritized Rebuild Sequence](#9-prioritized-rebuild-sequence)

---

# 1. EXECUTIVE SUMMARY

TAILRD is a cardiovascular clinical analytics SaaS platform with 6 clinical modules (HF, EP, Structural Heart, Coronary, Valvular, Peripheral Vascular), each with 3 view tiers (Executive, Service Line, Care Team). The platform has a well-designed clinical data model, working auth schema, and solid component structure — but is currently a polished prototype with critical gaps across security, data persistence, infrastructure, and visual polish.

**Current state by area:**

| Area | Readiness | Summary |
|---|---|---|
| Security / HIPAA | **15%** | 8 critical vulnerabilities, fails every HIPAA technical safeguard |
| UI/UX | **35%** | Good component structure, wrong visual language (flat/white vs liquid metal) |
| AWS Infrastructure | **0%** | Zero AWS SDK, zero IaC, zero S3, zero deployment automation |
| Data Pipeline | **5%** | FHIR mapping works, but data transforms then vanishes — never persists |
| Data Model | **55%** | Good structure, missing 7 clinical models, tenant isolation gaps |
| Testing / CI/CD | **5%** | 1 test file, zero CI/CD, zero git hooks |
| Internal Ops | **0%** | No onboarding system, no BAA tracking, no credential delivery |
| Clinical Logic | **25%** | Rules scaffolded, helpers return Math.random() |

**Total findings:** 130+ across all audit domains.

---

# 2. SECURITY & HIPAA COMPLIANCE

## 2.1 Critical Findings (8)

### CRITICAL-01: DEMO_MODE=true Disables All Security
**Files:** `backend/src/middleware/auth.ts` (lines 6, 30-34, 48-52, 81, 109, 127, 151), `backend/.env` (line 39)

`DEMO_MODE=true` is the default in both `.env` and `.env.example`. When active:
- `authenticateToken`: Any unauthenticated request gets synthetic super-admin access
- `authorizeHospital`: Cross-tenant isolation is fully disabled
- `authorizeRole`: All role checks return `next()`
- `authorizeModule`: All module checks return `next()`
- `authorizeView`: All view checks return `next()`

No guard prevents this from reaching production. If deployed as-is, every endpoint is fully open.

**HIPAA:** Violates every technical safeguard in 164.312.

**Fix:** Add startup validation: crash if `DEMO_MODE=true && NODE_ENV=production`. Move toward compile-time flag elimination for production builds.

---

### CRITICAL-02: Zero Authentication on Clinical Intelligence Routes
**File:** `backend/src/routes/clinicalIntelligence.ts`

Every endpoint is publicly accessible with no auth middleware:
- `GET /risk-scores/:patientId` — patient risk scores (PHI)
- `POST /risk-scores` — creates with raw `req.body` (mass assignment)
- `GET /interventions/:patientId` — patient interventions (PHI)
- `POST /interventions` — creates with raw `req.body`
- `GET /contraindications/:patientId` — patient contraindications (PHI)
- `POST /contraindications` — creates with raw `req.body`
- `GET /drug-titrations/:patientId` — patient drug titrations (PHI)
- Summary endpoints for hospitals

**HIPAA:** Violates 164.312(a)(1), 164.312(d), 164.312(c)(1).
**OWASP:** A01:2021 — Broken Access Control.

**Fix:** Add `authenticateToken`, `authorizeHospital`, `authorizeModule` middleware to all routes.

---

### CRITICAL-03: Mass Assignment on All Clinical POST Endpoints
**Files:** `clinicalIntelligence.ts` lines 45, 149, 288; `admin.ts` lines 394-405, 785-803

All creation endpoints pass raw `req.body` directly to `prisma.create()`:
```
const assessment = await prisma.riskScoreAssessment.create({ data: req.body });
```

Attacker can set any field including `hospitalId` (cross-tenant), foreign keys, internal flags.

**Fix:** Define Zod schemas for every POST/PUT endpoint. Whitelist allowed fields. Validate before persistence.

---

### CRITICAL-04: JWT Fallback to Hardcoded Secret
**File:** `backend/src/middleware/auth.ts` line 7

```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
```

If `JWT_SECRET` env var is unset, tokens are signed with a publicly-known string. Any attacker can forge JWTs for any user.

**Fix:** Remove fallback. Throw at startup if `JWT_SECRET` is not set.

---

### CRITICAL-05: Hardcoded Plaintext Demo Passwords Exposed via API
**File:** `backend/src/routes/auth.ts` lines 14-97

Demo users have plaintext passwords (`admin123`, `demo123`) in source code. `/api/auth/demo-users` endpoint returns these in the response message.

**Fix:** Remove password hints from API responses. Use bcrypt even in demo mode.

---

### CRITICAL-06: Unauthenticated Admin Analytics
**File:** `backend/src/routes/admin.ts` lines 16-59

`GET /api/admin/analytics` has no auth middleware. Exposes platform-wide statistics (hospitals, users, patients, revenue) to anonymous callers.

**Fix:** Add `authenticateToken` + `authorizeRole('super-admin')`.

---

### CRITICAL-07: No Encryption at Rest for PHI
**File:** `backend/prisma/schema.prisma`

Patient model stores `firstName`, `lastName`, `dateOfBirth`, `phone`, `email`, `mrn`, `street`, `city`, `state`, `zipCode` as plain `String` fields. No application-level encryption, no pgcrypto, no TDE configuration.

**HIPAA:** Violates 164.312(a)(2)(iv).

**Fix:** Implement application-level field encryption via Prisma middleware or custom encrypt/decrypt layer. Use AWS KMS for key management in production.

---

### CRITICAL-08: Cascade Deletes Destroy Audit Trails
**File:** `backend/prisma/schema.prisma` — every `@relation` uses `onDelete: Cascade`

Deleting a Hospital permanently destroys all users, patients, encounters, observations, orders, alerts, login sessions, webhook events, and all CDS records. Violates HIPAA 6-year retention requirement.

**Fix:** Replace `onDelete: Cascade` with `onDelete: Restrict` on clinical data relationships. Implement soft deletes (`deletedAt` field) on all PHI-containing models.

---

## 2.2 High-Severity Findings (18)

| # | Finding | File(s) | HIPAA Impact |
|---|---------|---------|-------------|
| H-01 | PHI captured in analytics request body metadata | `middleware/analytics.ts` lines 324, 97 | 164.312(a)(2)(iv), Minimum Necessary |
| H-02 | No token blacklist / revocation on logout | `middleware/auth.ts`, `routes/auth.ts` | 164.312(a)(2)(iii), 164.312(d) |
| H-03 | 24-hour JWT lifetime, no idle timeout | `routes/auth.ts` line 105 | 164.312(a)(2)(iii) |
| H-04 | No server-side account lockout | `routes/auth.ts` | 164.312(d) |
| H-05 | Webhook HMAC signatures logged in plaintext | `routes/webhooks.ts` lines 46-49 | Credential exposure |
| H-06 | Full Redox payloads (PHI) logged on error | `routes/webhooks.ts` line 133 | 164.312(a)(2)(iv), Minimum Necessary |
| H-07 | God View role check uses wrong casing | `routes/godView.ts` line 17 | Access control bypass |
| H-08 | JWT tokens stored in localStorage (XSS-stealable) | `src/auth/AuthContext.tsx` lines 372-374 | A07:2021 |
| H-09 | Client-side-only account lockout | `src/auth/AuthContext.tsx` line 180 | Bypassable via direct API |
| H-10 | Hospital update accepts arbitrary fields | `routes/admin.ts` lines 381-430 | Mass assignment |
| H-11 | User update accepts arbitrary fields | `routes/admin.ts` lines 771-829 | Privilege escalation |
| H-12 | No separate refresh token mechanism | `routes/auth.ts` lines 274-324 | Token theft = unlimited refresh |
| H-13 | API key generation uses Math.random() | `routes/onboarding.ts` lines 491-497 | A02:2021 |
| H-14 | Generated API keys not stored | `routes/onboarding.ts` lines 339-352 | Keys cannot be verified |
| H-15 | Logger PHI redaction incomplete | `utils/logger.ts` lines 14-17 | Missing: names, MRN, diagnosis |
| H-16 | Audit log does not redact PHI | `utils/logger.ts` lines 82-93 | 164.312(a)(2)(iv) |
| H-17 | Error messages expose internal schema | `clinicalIntelligence.ts` (12 instances) | Information disclosure |
| H-18 | Webhook signature uses parsed JSON, not raw body | `routes/webhooks.ts` line 34 | Signature bypass risk |

## 2.3 Medium-Severity Findings (21)

| # | Finding | File(s) |
|---|---------|---------|
| M-01 | JWT contains full permissions object (no real-time revocation) | `routes/auth.ts` |
| M-02 | Verify endpoint returns full JWT payload | `routes/auth.ts` lines 328-356 |
| M-03 | console.error leaks error objects | `routes/auth.ts` line 239 |
| M-04 | IP addresses stored without justification | `middleware/analytics.ts` lines 94, 198 |
| M-05 | All health checks are mocked | `middleware/healthCheck.ts` |
| M-06 | Health endpoints expose internal infrastructure details | `middleware/healthCheck.ts` line 128 |
| M-07 | Minimal password policy (8 chars only) | `routes/admin.ts` line 669 |
| M-08 | Test endpoint echoes request body (no auth) | `routes/webhooks.ts` lines 145-153 |
| M-09 | Status endpoint exposes internal config (no auth) | `routes/webhooks.ts` lines 155-168 |
| M-10 | God View audit via console.log | `routes/godView.ts` line 24 |
| M-11 | Global search returns PHI across tenants | `routes/godView.ts` lines 328-358 |
| M-12 | Mock NPI numbers in hardcoded hospital data | `routes/hospitals.ts` lines 8-84 |
| M-13 | Patients route stub with no auth | `routes/patients.ts` |
| M-14 | ProtectedRoute never checks requiredRole prop | `src/auth/ProtectedRoute.tsx` lines 79-105 |
| M-15 | Session expiry managed client-side only | `src/auth/AuthContext.tsx` lines 160-161 |
| M-16 | Demo mode bypasses all frontend permission checks | `src/auth/AuthContext.tsx` |
| M-17 | Rate limit is per-IP not per-user | `backend/src/server.ts` lines 39-49 |
| M-18 | No CSRF protection | `backend/src/server.ts` |
| M-19 | Error stack traces exposed in development | `backend/src/server.ts` lines 170-171 |
| M-20 | Request logging lacks user context | `backend/src/server.ts` lines 85-92 |
| M-21 | Cascade deletes on User destroy activity history | `prisma/schema.prisma` |

## 2.4 HIPAA Technical Safeguard Compliance Matrix

| Requirement | Section | Status | Key Gaps |
|---|---|---|---|
| Access Control | 164.312(a)(1) | **FAIL** | Demo bypass, unauthenticated endpoints, no DB-level tenant isolation |
| Unique User ID | 164.312(a)(2)(i) | **PARTIAL** | Users have unique IDs, but demo mode shares synthetic identity |
| Emergency Access | 164.312(a)(2)(ii) | **FAIL** | No break-glass mechanism |
| Automatic Logoff | 164.312(a)(2)(iii) | **FAIL** | 24-hour tokens, no idle timeout, no server-side session invalidation |
| Encryption/Decryption | 164.312(a)(2)(iv) | **FAIL** | No PHI field encryption, raw PHI in analytics and webhook tables |
| Audit Controls | 164.312(b) | **FAIL** | No patient-level access logging, console.log for audit events, cascade deletes destroy audit trails |
| Integrity | 164.312(c)(1) | **FAIL** | Mass assignment vulnerabilities, no checksums on stored PHI |
| ePHI Authentication | 164.312(c)(2) | **FAIL** | No mechanism to verify ePHI has not been altered |
| Person/Entity Auth | 164.312(d) | **FAIL** | Weak passwords, no MFA, no server-side lockout, hardcoded credentials |
| Transmission Security | 164.312(e)(1) | **PARTIAL** | HSTS headers configured but no TLS infrastructure exists |
| Integrity Controls | 164.312(e)(2)(i) | **FAIL** | Webhook signature uses reconstructed JSON |
| Encryption (transit) | 164.312(e)(2)(ii) | **PARTIAL** | HSTS configured but Math.random() for key generation |

## 2.5 OWASP Top 10 Assessment

| Category | Status | Key Findings |
|---|---|---|
| A01: Broken Access Control | **FAIL** | Unauthenticated clinical endpoints, demo bypass, missing tenant isolation |
| A02: Cryptographic Failures | **FAIL** | No PHI encryption, Math.random() keys, hardcoded JWT secret fallback |
| A03: Injection | **PARTIAL RISK** | Prisma parameterizes (no SQL injection), but mass assignment on all POST |
| A04: Insecure Design | **FAIL** | Demo mode as default, single-token auth, no security-by-design |
| A05: Security Misconfiguration | **FAIL** | Insecure .env defaults, health endpoints expose system info |
| A06: Vulnerable Components | **UNKNOWN** | No automated dependency audit |
| A07: Auth Failures | **FAIL** | No server-side lockout, 24-hour tokens, localStorage tokens, no MFA |
| A08: Software/Data Integrity | **FAIL** | Webhook verification uses reconstructed JSON |
| A09: Logging/Monitoring | **FAIL** | PHI in logs, mocked health checks, console.log for audit events |
| A10: SSRF | **LOW RISK** | No user-controlled URL fetching found |

## 2.6 Security Remediation Priority

| Priority | Action | Effort |
|---|---|---|
| 1 | Crash on `DEMO_MODE=true` + `NODE_ENV=production` | 1 hour |
| 2 | Add auth middleware to all clinical intelligence routes | 2 hours |
| 3 | Remove JWT secret fallback — hard fail if unset | 30 min |
| 4 | Add Zod validation schemas to all POST/PUT endpoints | 2-3 days |
| 5 | Implement PHI field encryption (Prisma middleware + KMS) | 3-5 days |
| 6 | Reduce token expiry to 15min, implement refresh token rotation | 2 days |
| 7 | Add server-side account lockout + login rate limiting | 1 day |
| 8 | Replace Math.random() with crypto.randomBytes() | 1 hour |
| 9 | Implement token blacklist (Redis-backed) | 1-2 days |
| 10 | Move tokens from localStorage to httpOnly secure cookies | 1-2 days |
| 11 | Fix webhook signature to use raw body buffer | 1 day |
| 12 | Extend logger PHI redaction list | 2 hours |
| 13 | Replace cascade deletes with restrict + soft delete | 2 days |
| 14 | Add MFA support (Cognito TOTP) | 3-5 days |
| 15 | Implement HIPAA audit log (patient-level access tracking) | 3-5 days |

---

# 3. UI/UX — LIQUID METAL VISUAL IDENTITY

## 3.1 Design Vision

The TAILRD visual identity is inspired by automotive liquid metal finishes — specifically:
- **Porsche 918 Liquid Metal Chrome Blue** (paint code 3R7): Silver-leaning blue with deep navy shadows, created with 9 coats and magnetically-aligned metallic flake
- **Platinum Gloss Metallic Dragon Blood** (X-M201): Deep candy crimson that shifts from near-black in shadows to bright metallic cherry in highlights

The design language is: **dark atmospheric backgrounds, frosted glass panels, metallic gradient accents, glowing status indicators**. Think macOS Sonoma glass morphism meets Tesla dashboard meets Bloomberg Terminal.

**Explicit constraints:**
- No standard primary colors (no basic blue/red/green)
- No pastels (no bg-green-50 text-green-700)
- No flat white backgrounds on cards
- No generic Bootstrap/Tailwind admin template aesthetics
- Hospital-appropriate: professional, not gaming/crypto

## 3.2 The Liquid Metal Color System

### Primary — Chrome Blue (Porsche 918 Liquid Metal)

| Role | Hex | Usage |
|---|---|---|
| Shadow | `#061525` | Deepest areas, near-black with blue undertone |
| Deep | `#0D2640` | Dark backgrounds, sidebar base |
| Body | `#1A3B5C → #2A5578` | Primary depth range |
| Midtone | `#3D6F94` | Where the metallic lives — primary brand |
| Bright | `#5A8AB0 → #7BA3C4` | Interactive elements, hover states |
| Highlight | `#A8C5DD` | Chrome reflections, text highlights |
| Chrome Peak | `#C8DAE8 → #DBE4EB` | Ice-chrome flash on metallic text |

### Secondary — Dragon Blood (Metallic Crimson)

| Role | Hex | Usage |
|---|---|---|
| Shadow | `#1A0508 → #2D0609` | Near-black with red undertone |
| Deep | `#4A0B11 → #6B1019` | Dark arterial blood |
| Body | `#8B1520 → #A01825` | Candy base — where the metal lives |
| Midtone | `#B82030 → #D42A3E` | Bright metallic cherry, alerts |
| Highlight | `#E84858 → #F06070` | Metallic flash, critical status glow |

### Module Accent Colors — All Liquid Metal

| Module | Color Name | Shadow | Midtone | Highlight | Chrome Peak |
|---|---|---|---|---|---|
| Heart Failure | Chrome Blue | `#0D2640` | `#3D6F94` | `#A8C5DD` | `#C8DAE8` |
| Electrophysiology | Liquid Amber | `#3D1E00` | `#B45309` | `#FBBF24` | `#FDE68A` |
| Structural Heart | Chrome Violet | `#2D1054` | `#7C3AED` | `#C084FC` | `#E9D5FF` |
| Coronary | Dragon Blood | `#2D0609` | `#8B1520` | `#D42A3E` | `#F06070` |
| Valvular | Liquid Teal | `#042F2E` | `#0D9488` | `#2DD4BF` | `#99F6E4` |
| Peripheral | Chrome Emerald | `#052E16` | `#15803D` | `#4ADE80` | `#BBF7D0` |

### Status Colors — Metallic Glow (Not Pastels)

| Status | Glow Color | CSS Implementation |
|---|---|---|
| Critical | Dragon Blood | `background: #D42A3E; box-shadow: 0 0 12px rgba(212,42,62,0.5)` |
| Warning | Liquid Amber | `background: #F59E0B; box-shadow: 0 0 12px rgba(245,158,11,0.5)` |
| Healthy | Chrome Emerald | `background: #22C55E; box-shadow: 0 0 12px rgba(34,197,94,0.5)` |
| Info | Chrome Blue | `background: #5A8AB0; box-shadow: 0 0 12px rgba(90,138,176,0.5)` |

## 3.3 Core CSS Primitives

### Glass Panels (Replace all bg-white cards)

```css
/* Primary container — frosted glass on dark background */
.glass-panel {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(24px) saturate(1.2);
  -webkit-backdrop-filter: blur(24px) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  box-shadow:
    inset 0 1px 0 0 rgba(255, 255, 255, 0.08),
    0 4px 24px -4px rgba(0, 0, 0, 0.3);
}

/* Elevated container — modals, dropdowns */
.glass-panel-elevated {
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(32px) saturate(1.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    inset 0 1px 0 0 rgba(255, 255, 255, 0.12),
    0 8px 40px -4px rgba(0, 0, 0, 0.35);
}

/* Module-tinted glass — Heart Failure (Chrome Blue) */
.glass-chrome-blue {
  background: rgba(61, 111, 148, 0.06);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(61, 111, 148, 0.12);
  box-shadow: inset 0 1px 0 0 rgba(168, 197, 221, 0.1);
}

/* Module-tinted glass — Coronary (Dragon Blood) */
.glass-dragon-blood {
  background: rgba(139, 21, 32, 0.06);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(139, 21, 32, 0.12);
  box-shadow: inset 0 1px 0 0 rgba(212, 42, 62, 0.1);
}

/* Module-tinted glass — EP (Liquid Amber) */
.glass-liquid-amber {
  background: rgba(180, 83, 9, 0.06);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(180, 83, 9, 0.12);
  box-shadow: inset 0 1px 0 0 rgba(251, 191, 36, 0.1);
}

/* Module-tinted glass — Structural Heart (Chrome Violet) */
.glass-chrome-violet {
  background: rgba(124, 58, 237, 0.06);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(124, 58, 237, 0.12);
  box-shadow: inset 0 1px 0 0 rgba(192, 132, 252, 0.1);
}

/* Module-tinted glass — Valvular (Liquid Teal) */
.glass-liquid-teal {
  background: rgba(13, 148, 136, 0.06);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(13, 148, 136, 0.12);
  box-shadow: inset 0 1px 0 0 rgba(45, 212, 191, 0.1);
}

/* Module-tinted glass — Peripheral (Chrome Emerald) */
.glass-chrome-emerald {
  background: rgba(21, 128, 61, 0.06);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(21, 128, 61, 0.12);
  box-shadow: inset 0 1px 0 0 rgba(74, 222, 128, 0.1);
}
```

### App Background

```css
.app-surface {
  background: #060A12;
  background-image:
    radial-gradient(ellipse at 15% 5%, rgba(61, 111, 148, 0.12) 0%, transparent 55%),
    radial-gradient(ellipse at 85% 95%, rgba(26, 59, 92, 0.08) 0%, transparent 45%);
}
```

### Metallic Text Gradients

```css
/* Chrome Blue metal — KPI numbers, module titles */
.text-chrome-metal {
  background: linear-gradient(135deg, #A8C5DD 0%, #5A8AB0 40%, #C8DAE8 60%, #7BA3C4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Dragon Blood metal — critical alerts, arterial metrics */
.text-dragon-blood {
  background: linear-gradient(135deg, #F06070 0%, #B82030 40%, #E84858 60%, #D42A3E 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Silver chrome — secondary headings */
.text-chrome-silver {
  background: linear-gradient(135deg, #D8DDE6 0%, #8D96A8 40%, #C8DAE8 60%, #A8A9AD 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### Glowing Status Indicators

```css
.status-glow-critical {
  width: 8px; height: 8px; border-radius: 50%;
  background: #D42A3E;
  box-shadow: 0 0 8px rgba(212, 42, 62, 0.6), 0 0 16px rgba(212, 42, 62, 0.3);
  animation: pulse-glow 2s ease-in-out infinite;
}

.status-glow-warning {
  width: 8px; height: 8px; border-radius: 50%;
  background: #F59E0B;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.6), 0 0 16px rgba(245, 158, 11, 0.3);
}

.status-glow-healthy {
  width: 8px; height: 8px; border-radius: 50%;
  background: #22C55E;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.6), 0 0 16px rgba(34, 197, 94, 0.3);
}

.status-glow-info {
  width: 8px; height: 8px; border-radius: 50%;
  background: #5A8AB0;
  box-shadow: 0 0 8px rgba(90, 138, 176, 0.6), 0 0 16px rgba(90, 138, 176, 0.3);
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

## 3.4 Component-Level Transformation

| Element | Current (Web 2.0) | Target (Liquid Metal) |
|---|---|---|
| App background | `bg-chrome-50` (flat light grey) | `#060A12` + radial chrome-blue atmospheric glow |
| Sidebar | `bg-white border-r border-titanium-200` | `bg-chrome-950/80 backdrop-blur-xl` glass panel |
| TopBar | `bg-white border-b border-titanium-200` | `bg-white/[0.03] backdrop-blur-xl border-b border-white/[0.06]` |
| Cards | `bg-white border border-titanium-200 shadow-chrome-card` | `glass-panel` with module-tinted variant |
| KPI number | `text-3xl font-bold text-titanium-900` (black on white) | `text-chrome-metal` gradient on glass |
| Status badge | `bg-green-50 text-green-700` (pastel) | Glowing orb + tinted glass chip |
| Active nav item | `border-l-[3px] border-chrome-600 bg-chrome-50` | `bg-white/[0.08] backdrop-blur` frosted pill + glow dot |
| Charts | CSS `<div>` bars with flat colors | Recharts/Tremor with metallic gradients + hover glow |
| Primary button | `bg-porsche-600 text-white` (flat) | Chrome-blue gradient + bezel highlight + hover glow |
| Dividers | `border-t border-titanium-200` | `border-t border-white/[0.06]` (glass edge) |
| Text primary | `text-titanium-900` (near-black on white) | `text-chrome-100` / `text-white/90` (light on dark) |
| Text secondary | `text-titanium-500` | `text-chrome-300/70` (muted chrome) |

## 3.5 Current CSS Technical Debt (Must Clean Up)

| Issue | Description |
|---|---|
| 4 button systems | `btn-medical-*`, `btn-web3-*`, `btn-liquid-*`, plus theme buttons — consolidate to ONE |
| 3 card systems | `retina-card`, `metal-card`, `card-web3-hover` — consolidate to `glass-panel` |
| 3 skeleton systems | `clinical-skeleton`, `skeleton-web3`, `skeleton-liquid` — consolidate to ONE |
| 2 status badge systems | `status-*` and `status-liquid-*` — replace with glow system |
| `porsche-*` alias | 1,296+ references that duplicate `chrome-*` — global rename |
| Ghost tokens | `glass.*`, `web3-*`, `retina-*`, `metal-*` naming from previous iterations |
| Off-system components | FinancialSummary, ZipHeatMap use raw `gray-*` instead of `titanium-*` |
| Off-system shadows | Stock `shadow-lg`/`shadow-xl` mixed with `shadow-chrome-*` |
| Web 2.0 gradient blobs | `animate-pulse`/`animate-float` orbs in BaseExecutiveView/BaseCareTeamView |
| Mixed font families | `font-sf` (legacy), `font-body`, `font-display` used inconsistently |
| No type scale | Every component invents text sizes ad hoc |
| Skeleton classes never used | Defined in CSS, zero JSX references |

## 3.6 Missing UI/UX Features

| Feature | Status | Priority |
|---|---|---|
| 404 page | Missing — blank page on unmatched URLs | HIGH |
| Empty states | No components — blank containers when no data | HIGH |
| Session idle timeout | Not implemented on frontend | CRITICAL (HIPAA) |
| Hardcoded user identity | "Dr. Smith" / "Dr. Sarah Williams" in TopBar/App | HIGH |
| Dead links | "Forgot password?" and "Register here today" are `href="#"` | MEDIUM |
| Command palette (Cmd+K) | Not implemented | HIGH (premium UX) |
| Route transitions | Content swaps with no animation | MEDIUM |
| Staggered entrance animations | Not implemented despite CountUp being imported | MEDIUM |
| Skip-nav link | Defined in CSS, never rendered | HIGH (accessibility) |
| ARIA tab roles | Tab interfaces use plain buttons, no `role="tablist"` | HIGH (accessibility) |
| Focus traps in modals | Not implemented | HIGH (accessibility) |
| `aria-live` regions | Not implemented | MEDIUM (accessibility) |
| Color-only status indicators | No text/icon fallback for colorblind users | MEDIUM |
| Mobile responsive sidebar | Fixed width, never hides, no hamburger menu | MEDIUM |
| Grid responsive breakpoints | `grid-cols-4` without responsive modifiers in BaseExecutiveView | MEDIUM |
| Self-hosted fonts | Google Fonts CDN — blocked on hospital networks | MEDIUM |
| 185 console.log calls | May log PHI to browser devtools | HIGH |
| Two ErrorBoundary implementations | ErrorFallback.tsx and ErrorBoundary.tsx diverge | LOW |
| Toast uses window.addToast | Global mutation anti-pattern | MEDIUM |

## 3.7 Visual Rewrite Implementation Order

| # | Task | Effort | Impact |
|---|---|---|---|
| 1 | Build new Tailwind config (liquid metal tokens, remove legacy) | 1 day | Foundation for everything |
| 2 | Rewrite index.css (glass primitives, metallic gradients, glow system) | 1 day | CSS primitives |
| 3 | App shell (AppShell, Sidebar, TopBar) on dark glass | 2 days | Entire navigation feel |
| 4 | KPICard component on glass with metallic numbers | 1 day | Most-seen component |
| 5 | Module dashboard tiles on glass with accent glow | 1 day | Landing page |
| 6 | One full module view (HF Executive) as reference | 2-3 days | Proves the system works |
| 7 | Roll to all BaseExecutiveView / BaseServiceLineView / BaseCareTeamView | 3-5 days | All shared views |
| 8 | Module-specific views (Group A: HF, EP, SH custom dashboards) | 5-7 days | Custom views |
| 9 | Module-specific views (Group B: Coronary, Valvular, Peripheral) | 3-5 days | Wrapper views |
| 10 | Login page, empty states, 404, error boundaries | 2-3 days | Polish |

---

# 4. AWS / REDOX / CLOUDTICITY ARCHITECTURE

## 4.1 Target Architecture

```
Hospital EHR Systems
       |
       v
   [ REDOX ] ──── Protocol translation, FHIR normalization, interface maintenance
       |
       v
   [ AWS (TAILRD) ]
       |
       ├── API Gateway / ALB (TLS termination, WAF)
       ├── EKS / ECS (application containers)
       ├── Aurora PostgreSQL (encrypted, Multi-AZ)
       ├── ElastiCache Redis (sessions, CQL cache)
       ├── S3 (raw payloads, FHIR bundles, exports, ECG files)
       ├── SQS (webhook queuing, batch jobs, dead-letter)
       ├── KMS (encryption key management)
       ├── Cognito (user auth, MFA, token management)
       ├── CloudTrail + CloudWatch (audit + monitoring)
       ├── Secrets Manager (credentials, API keys)
       ├── EventBridge (scheduled batch processing)
       ├── Step Functions (multi-step clinical workflows)
       └── SageMaker (ECG AI inference - future)
       |
       v
   [ CLOUDTICITY ] ──── HIPAA-oriented AWS setup, security baselines,
                         monitoring/logging, backup/DR, compliance evidence,
                         350+ continuous HITRUST CSF compliance checks
       |
       v
   [ TAILRD Application ]
       |
       ├── Executive dashboards (revenue, quality, population)
       ├── Service Line views (therapy gaps, risk distributions, referrals)
       ├── Care Team views (patient-level action items, drug titration)
       └── (Future) EHR writeback via Redox
```

## 4.2 Production Readiness Scorecard

| Area | Readiness | Key Blocker |
|---|---|---|
| FHIR data mapping (Redox → internal) | **80%** | Most production-ready component |
| Auth/RBAC | **60%** | Works, needs Cognito migration + MFA |
| Prisma data model | **55%** | Missing 7 clinical models, tenant gaps |
| Tenant isolation | **35%** | Application-level only, no DB RLS |
| Clinical intelligence services | **30%** | DB persistence works but helpers return Math.random() |
| CQL engine | **25%** | Framework solid, mock execution, no real CQL library |
| Patient identity | **15%** | MRN-only, no matching/merge |
| CI/CD & deployment | **10%** | Dockerfile exists, nothing else |
| Core data persistence | **5%** | **Services transform FHIR data but never write to DB** |
| Real-time processing | **5%** | Synchronous webhook handler, no queue |
| Batch processing | **5%** | Referenced in config, no scheduler |
| AWS SDK integration | **0%** | Zero `@aws-sdk` imports anywhere |
| S3 file storage | **0%** | No file handling of any kind |
| Infrastructure-as-code | **0%** | No Terraform, CDK, CloudFormation |

## 4.3 Redox Webhook Handler — Current State

**File:** `backend/src/routes/webhooks.ts`

**What works:**
- HMAC-SHA256 signature verification using `crypto.timingSafeEqual`
- Event type routing for PatientAdmin, Results, Encounters
- Test and status endpoints for connectivity validation

**What is broken / missing:**
- **Async queue processing:** Webhooks handled synchronously inline — will fall over at hospital scale (thousands of ADT events/hour)
- **Idempotency:** No deduplication by Redox message ID. Retries create duplicates
- **Raw payload archival:** rawBody is `JSON.stringify(req.body)`, not the original byte stream — breaks signature verification for non-canonical JSON
- **Dead-letter queue / retry:** retryCount in schema but no retry orchestration
- **Batch event handling:** No mechanism for Redox batch delivery
- **Back-pressure / circuit breaker:** No throttling if downstream is overwhelmed
- **WebhookEvent records never created** despite model existing in schema

**Target architecture:**
1. API Gateway terminates TLS, forwards to Lambda or EKS pod
2. Raw payload captured via `express.raw()`, archived to S3
3. Enqueued to SQS for async processing
4. SQS consumer handles transform → persist → alert generation
5. Dead-letter queue for failed processing with CloudWatch alarms
6. Idempotency table in RDS keyed on Redox message ID

## 4.4 Service Layer — Data Persistence Gap

**THE SINGLE BIGGEST BLOCKER:** Core services transform FHIR data but never write to the database.

| Service | Transforms Data? | Writes to DB? | Status |
|---|---|---|---|
| `patientService.ts` | YES — FHIR Patient → internal format | **NO** | Data vanishes |
| `observationService.ts` | YES — LOINC mapping, significance scoring | **NO** | Data vanishes |
| `encounterService.ts` | YES — encounter mapping, readmission risk | **NO** | Data vanishes |
| `alertService.ts` | YES — threshold rules defined | **NO** | Alerts never stored |
| `phenotypeService.ts` | PARTIAL — 3 of 12 algorithms | **YES** | Helpers return Math.random() |
| `crossReferralService.ts` | PARTIAL — rules defined | **YES** | checkCondition returns Math.random() |
| `drugTitrationService.ts` | YES — 4-pillar GDMT | **YES** | Data access methods return empty arrays |
| `qualityMeasureService.ts` | YES — CMS eCQM definitions | **YES** | Patient queries return empty arrays |
| `contentIntelligenceService.ts` | Mock | NO | Entirely mock |
| `ecgAIService.ts` | Mock | NO | Entirely mock |

## 4.5 CQL Engine

**Files:** `backend/src/cql/`

**What works:**
- `fhirDataMapper.ts`: Comprehensive Redox-to-FHIR R4 mapping — **most production-ready component**
- `cqlEngine.ts`: Execution framework with caching (5-min TTL, 1000 max), batch execution, timeout support
- `clinicalDecisionProcessor.ts`: Orchestration pipeline — event → FHIR mapping → rule selection → execution → alerts

**What is missing:**
- No real CQL execution library (no `cql-execution` npm package)
- All terminology data is mock (hardcoded SNOMED, LOINC, RxNorm values)
- CQL rules loaded from filesystem path (`~/tailrd-research/cql-rules/`) — needs S3 with versioning
- No rule versioning, no approval workflow, no A/B testing

## 4.6 S3 Bucket Requirements

| Bucket | Purpose | Encryption | Lifecycle |
|---|---|---|---|
| `tailrd-{env}-raw-webhooks` | Raw Redox payloads (compliance audit) | KMS (CMK) | Glacier 90d, delete 7yr |
| `tailrd-{env}-fhir-bundles` | FHIR Bundle archives | KMS (CMK) | Glacier 1yr, delete 7yr |
| `tailrd-{env}-ecg-waveforms` | ECG raw data (1-10MB each) | KMS (CMK) | IA after 1yr |
| `tailrd-{env}-clinical-docs` | Uploaded clinical documents | KMS (CMK) | Per retention policy |
| `tailrd-{env}-exports` | Report exports (PDF/CSV) | KMS (CMK) | Delete after 30d |
| `tailrd-{env}-cql-rules` | CQL rule definitions | SSE-S3 | Versioning enabled |
| `tailrd-{env}-terminology` | SNOMED/LOINC/RxNorm valuesets | SSE-S3 | Versioning enabled |
| `tailrd-{env}-backups` | Database backups | KMS (CMK) | Glacier 30d |

All buckets: versioning enabled, public access blocked, VPC endpoint access only, access logging, bucket policies restricting to app IAM role.

## 4.7 Missing AWS Infrastructure (Zero IaC Exists Today)

| Component | Purpose | Status |
|---|---|---|
| VPC + Subnets | Network isolation | Not defined |
| Aurora PostgreSQL | Encrypted DB, Multi-AZ, read replicas | Not defined |
| ElastiCache Redis | Session cache, CQL result cache | Not defined |
| SQS Queues | Webhook processing, batch jobs, DLQ | Not defined |
| S3 Buckets | 8 buckets listed above | Not defined |
| KMS Keys | Per-tenant or per-data-class encryption | Not defined |
| Cognito User Pool | Auth, MFA, token management | Not defined |
| API Gateway / ALB | TLS termination, WAF | Not defined |
| EKS / ECS | Container orchestration | Not defined |
| CloudTrail | Infrastructure audit trail | Not defined |
| CloudWatch | Application monitoring, alarms | Not defined |
| Secrets Manager | Credentials, API keys | Not defined |
| EventBridge | Scheduled batch processing | Not defined |
| Step Functions | Multi-step clinical workflows | Not defined |
| WAF Rules | Web application firewall | Not defined |
| IAM Roles/Policies | Service-level access control | Not defined |

---

# 5. DATA MODEL & DATA FLOW

## 5.1 Current Schema (24 Models)

**Core Identity:** Hospital, User, LoginSession
**Clinical Data:** Patient, Encounter, Observation, Order
**Alerts:** Alert, Recommendation
**CDS:** CQLRule, CQLResult, TherapyGap, Phenotype, CrossReferral, DrugTitration, QualityMeasure, DeviceEligibility
**Group B Intelligence:** RiskScoreAssessment, InterventionTracking, ContraindicationAssessment
**Analytics:** UserActivity, FeatureUsage, PerformanceMetric, BusinessMetric, ReportGeneration, ErrorLog
**Webhooks:** WebhookEvent

## 5.2 Missing Models

| Model | Why It Is Needed |
|---|---|
| **Medication / MedicationStatement** | No way to store patient medication lists. DrugTitration references drug names as strings. Critical for therapy gap analysis, contraindication checking. |
| **Condition / ProblemList** | No structured diagnosis model. Patient has `primaryDiagnosis` (String) and `comorbidities` (String[]) — flat text, not coded ICD-10 conditions. |
| **Procedure / ProcedureHistory** | No general procedure model. InterventionTracking is partial but not FHIR-structured. |
| **DiagnosticReport** | FHIR DiagnosticReport bundles multiple Observations (echo report, cath report). No grouping model. |
| **CarePlan** | Central to HF management pathways. No model exists. |
| **ImagingStudy** | No model for echos, cardiac CT/MRI, angiography. Fundamental to SH, VHD, CAD modules. |
| **AllergyIntolerance** | No allergy tracking. Required for drug safety checks. |
| **AuditLog** | No general-purpose PHI access audit trail. |
| **S3FileReference** | No model linking to S3 objects (EHR documents, ECG waveforms, exports). |
| **PatientMergeLink** | No mechanism for patient identity resolution across MRN systems. |
| **BAADocument** | No BAA tracking per hospital. |

## 5.3 Missing Fields on Existing Models

| Model | Missing Field | Rationale |
|---|---|---|
| Patient | `deceasedDate` | Mortality tracking |
| Patient | `race`, `ethnicity`, `language` | Health equity analytics, risk score inputs |
| Patient | `insuranceType` / `payerInfo` | Reimbursement analytics |
| All models | `createdBy`, `updatedBy` | HIPAA audit trail |
| All models | `deletedAt` | Soft delete support |
| Encounter | `hospitalId` | **Tenant isolation gap** |
| Observation | `hospitalId` | **Tenant isolation gap** |
| Order | `hospitalId` | **Tenant isolation gap** |
| Alert | `acknowledgedBy`, `acknowledgedAt` | Alert lifecycle tracking |
| Recommendation | `rejectedReason` | Recommendation lifecycle |

## 5.4 Tenant Isolation Gaps

**Models WITHOUT hospitalId (PHI exposure risk):**

| Model | Contains PHI? | Risk |
|---|---|---|
| Encounter | YES — diagnosis codes, visit dates | Direct query without Patient join leaks across tenants |
| Observation | YES — lab values, vital signs | Same |
| Order | YES — ordered procedures, medications | Same |

**Fix:** Add `hospitalId` + foreign key to all three models. Add composite indexes. Consider PostgreSQL row-level security (RLS) policies.

## 5.5 Missing Indexes (16 High-Priority)

| Model | Field(s) | Query Pattern |
|---|---|---|
| Patient | `fhirPatientId` | Webhook patient lookup |
| Encounter | `fhirEncounterId` | Webhook encounter lookup |
| Observation | `fhirObservationId` | Webhook observation lookup |
| Order | `fhirOrderId` | Webhook order lookup |
| Patient | `email` | Patient search |
| Patient | `lastName, firstName` | Name-based search |
| Observation | `code` | Lab type queries (all BNP results) |
| Observation | `effectiveDateTime` | Time-range trend queries |
| Alert | `hospitalId, severity, isResolved` | Dashboard active alerts |
| CQLResult | `patientId, ruleId` | Rule results per patient |
| Phenotype | `patientId, phenotypeType` | Phenotype detection queries |
| TherapyGap | `patientId, isResolved` | Open therapy gaps |
| WebhookEvent | `hospitalId, processedAt` | Webhook monitoring |
| LoginSession | `sessionToken` | Token lookup |
| RiskScoreAssessment | `patientId, scoreType` | Risk score queries |
| InterventionTracking | `patientId, status` | Active interventions |

## 5.6 Data Flow Status

| Route | Data Source | Status |
|---|---|---|
| `auth.ts` | Prisma (production) / Hardcoded (demo) | **WORKING** |
| `admin.ts` | Prisma | **WORKING** |
| `analytics.ts` | Prisma | **WORKING** |
| `clinicalIntelligence.ts` | Prisma | **WORKING** (no auth!) |
| `onboarding.ts` | Prisma transactions | **WORKING** |
| `phenotypes.ts` | PhenotypeService → Prisma | **SERVICE-BACKED** |
| `referrals.ts` | CrossReferralService → Prisma | **SERVICE-BACKED** |
| `hospitals.ts` | Hardcoded mock array | **MOCK** |
| `modules.ts` | Hardcoded (~65KB fake data) | **MOCK** |
| `godView.ts` | Hardcoded mock data | **MOCK** |
| `patients.ts` | None | **STUB** (returns `[]`) |
| `webhooks.ts` | Processes but discards | **BROKEN** |

## 5.7 FHIR Resource Mapping Capability

| FHIR Resource | Prisma Model | Quality |
|---|---|---|
| Patient | Patient | PARTIAL — missing race, ethnicity, language, deceased, multiple identifiers |
| Encounter | Encounter | PARTIAL — missing hospitalId, limited class mapping |
| Observation | Observation | GOOD — has code, value, unit, reference range, interpretation |
| ServiceRequest | Order | PARTIAL — missing hospitalId |
| DiagnosticReport | NONE | No model |
| Condition | NONE | Flat string fields on Patient |
| Procedure | NONE | InterventionTracking is partial |
| MedicationStatement | NONE | No model |
| CarePlan | NONE | No model |
| AllergyIntolerance | NONE | No model |

---

# 6. INFRASTRUCTURE & DEVOPS

## 6.1 Testing

| Area | Status |
|---|---|
| Frontend test files | **Zero** — no .test.tsx files, no testing libraries installed |
| Backend test files | **1** — `tests/cql-validation.test.ts` (tests mock CQL engine, not production code) |
| Integration tests | **Zero** |
| End-to-end tests | **Zero** |
| Test coverage | **~0%** of production code |
| Frontend testing libraries | Not installed (`@testing-library/react`, etc.) |

## 6.2 CI/CD

| Area | Status |
|---|---|
| GitHub Actions | Not configured |
| Any CI pipeline | Not configured |
| Automated builds | Not configured |
| Automated deployment | Not configured |
| Pre-commit hooks | Not configured (no husky) |

## 6.3 Code Quality

| Area | Status |
|---|---|
| Frontend ESLint | Nearly empty config (zero rules) |
| Backend ESLint | Config file doesn't exist |
| Prettier | Not configured anywhere |
| Git hooks (husky) | Not configured |
| lint-staged | Not configured |
| TypeScript strict mode | Enabled (good) |

## 6.4 Docker

| Area | Status |
|---|---|
| Backend Dockerfile | Exists — multi-stage build, non-root user, healthcheck. **Bug:** runs `--only=production` before TypeScript compile |
| docker-compose.yml | Exists — PostgreSQL 15, Redis 7, nginx. **Issues:** hardcoded JWT_SECRET, missing nginx.conf, missing ssl/ |
| Frontend Docker | Does not exist |

## 6.5 Logging & Monitoring

| Area | Status |
|---|---|
| Winston logger | Configured with file rotation, PHI redaction (incomplete) |
| CloudWatch integration | `winston-cloudwatch` dynamically required but **not in package.json** — production crash |
| Two logger instances | `server.ts` creates a second logger without PHI scrubbing |
| Health checks | All mocked — return hardcoded "connected" |
| Error reporting (Sentry) | Not connected (commented-out code only) |
| Performance monitoring | Not configured |

## 6.6 Dependencies

| Issue | Package | Risk |
|---|---|---|
| CRA deprecated | `react-scripts@5.0.1` | No active security patching |
| `crypto` npm stub | `backend/package.json` | Unnecessary deprecated dependency |
| `winston-cloudwatch` missing | `backend/src/utils/logger.ts` | Runtime crash in production |
| `snyk` not in deps | `backend/package.json` scripts | security:scan fails |
| `xlsx@0.18.5` | `package.json` | Known security advisories |
| `framer-motion` | `package.json` | Heavy for clinical dashboard |

## 6.7 Documentation

| Document | Status |
|---|---|
| Root README.md | 3-line stub with stray deploy comment |
| Backend README.md | Comprehensive — architecture, endpoints, HIPAA checklist |
| API reference (OpenAPI/Swagger) | Does not exist |
| Architecture Decision Records | Do not exist |
| HIPAA Security Risk Assessment | Does not exist |
| Incident response runbook | Does not exist |
| Data model documentation | Only Prisma schema |

---

# 7. INTERNAL OPERATIONS BACKEND

## 7.1 What Is Needed

The internal operations layer is the back-office system TAILRD-the-company uses to manage TAILRD-the-product. This does not exist today.

| Function | Current State | Required |
|---|---|---|
| Hospital onboarding | Manual seed scripts | Intake form → auto-provision hospital, generate API keys, create admin user, send welcome email |
| User provisioning | Manual API calls | Hospital admin gets invite link → sets password via secure one-time token |
| BAA tracking | Nothing | Upload signed BAA → S3, mark hospital BAA-complete, gate PHI flow until signed |
| Subscription management | Boolean flags in DB | Manage module access per hospital, track contract dates, auto-disable on expiry |
| Deployment status | Nothing | Per-hospital checklist: BAA signed, Redox connected, webhook verified, first data received, go-live |
| Support/tickets | Nothing | Internal ticket system or Zendesk/Intercom integration |
| Billing | Nothing | Track billing per hospital, Stripe integration |
| Platform health | Mocked health checks | Real-time dashboard: webhook processing rates, error rates, data freshness per hospital |
| Audit log viewer | Nothing | Internal view of PHI access events for compliance reviews |
| Credential delivery | Nothing | Secure one-time link for password setup (never email passwords) |

## 7.2 Architecture

- Backend API: `/api/internal/*` namespace, gated behind super-admin auth + IP allowlisting
- Frontend: Separate React app or dedicated section within existing app ("Mission Control")
- Database: PostgreSQL (existing) — add `Onboarding`, `BAADocument`, `SupportTicket`, `InternalNote`, `DeploymentChecklist` models
- Email: AWS SES for transactional emails (welcome, password setup, alerts)
- File storage: S3 for BAA documents, onboarding artifacts

## 7.3 New Prisma Models Needed

```prisma
model Onboarding {
  id              String   @id @default(uuid())
  hospitalId      String   @unique
  hospital        Hospital @relation(fields: [hospitalId], references: [id])
  status          OnboardingStatus @default(INTAKE)
  baaSignedAt     DateTime?
  baaDocumentUrl  String?
  redoxConnected  Boolean  @default(false)
  webhookVerified Boolean  @default(false)
  firstDataAt     DateTime?
  goLiveDate      DateTime?
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model InternalNote {
  id          String   @id @default(uuid())
  hospitalId  String
  hospital    Hospital @relation(fields: [hospitalId], references: [id])
  authorEmail String
  content     String
  createdAt   DateTime @default(now())
}

enum OnboardingStatus {
  INTAKE
  BAA_PENDING
  BAA_SIGNED
  REDOX_SETUP
  WEBHOOK_TESTING
  DATA_VALIDATION
  GO_LIVE
  ACTIVE
  SUSPENDED
}
```

---

# 8. CLINICAL KNOWLEDGE BASE INTEGRATION

## 8.1 Overview

A comprehensive cardiovascular clinical knowledge base (~7,500+ lines) has been reviewed. It contains:

- **25+ computable decision trees** (GDMT optimization, device eligibility, phenotype detection)
- **40+ drug tables** with dosing ranges, contraindications, monitoring requirements
- **8 risk calculators** (MAGGIC, CHA2DS2-VASc, HAS-BLED, STS, SYNTAX, WIfI, Wilkins, CRT/ICD eligibility)
- **20+ "TAILRD flag" scenarios** (therapy/diagnostic gaps the platform should identify)
- **Revenue rates** for every procedure across all 6 modules
- **Quality metrics** (CMS HRRP, MIPS, GWTG-HF, STS, ACC registries)
- **LOS optimization** (ERAS cardiac surgery protocols, modifiable LOS drivers)
- **ICD-10 code mappings** for all conditions
- **Pharmacogenomics** (CYP2C19, VKORC1/CYP2C9, SLCO1B1)
- **Cross-module referral patterns**

## 8.2 Three Integration Layers

### Layer 1: Rules Engine (Computable Logic)
Backend service layer. Each module gets a `rules/` folder with pure functions that take patient data in, return flags/recommendations out. Frontend never contains clinical logic.

**Categories:**
- **Therapy Gap Detection:** GDMT optimization (4 pillars), anticoagulation gaps (CHA2DS2-VASc → OAC), device eligibility (ICD, CRT, TAVR/SAVR), statin intensity gaps
- **Diagnostic Gaps:** Iron studies in HF, BNP trending, echo follow-up timing, cardiac amyloid screening
- **Phenotype Classification:** 12 HF phenotypes, AF classification, CAD burden, PAD severity

### Layer 2: View-Level Content (Dashboard Data)
Rules engine output aggregated differently for each view:
- **Executive:** COUNT/SUM/AVG across population (revenue, quality penalties, volume trends)
- **Service Line:** Filtered cohorts and distributions (therapy gap prevalence, risk score distributions)
- **Care Team:** Individual patient rows with actionable items (specific gaps, drug titration status)

### Layer 3: Reference Data (Static Knowledge)
Database reference tables + config files:
- Drug tables, procedure definitions, CPT codes, reimbursement rates
- ICD-10 mappings, LOINC codes, risk calculator formulas
- Quality measure definitions, ERAS protocols
- Pharmacogenomic interactions

## 8.3 TAILRD Flags — The Product Differentiator

20+ explicitly defined scenarios where the platform says "you're missing something":
- Patient on ACEi but not switched to ARNI despite LVEF ≤40%
- AF patient with CHA2DS2-VASc ≥2 and no anticoagulant
- HF patient with no iron studies in 12 months
- Post-STEMI patient not on high-intensity statin
- CRT-eligible patient with no device referral
- Severe AS patient meeting TAVR criteria with no SH referral

These flags are the atomic unit of clinical value. Every view level consumes them differently.

## 8.4 Recommended First Target

**HF GDMT Optimization** — most clinically mature logic, most complete frontend module, highest financial impact (HF readmission penalties are the biggest driver for most hospitals).

---

# 9. PRIORITIZED REBUILD SEQUENCE

## 9.1 Workstream Overview

| Phase | Focus | Duration | Dependency |
|---|---|---|---|
| **Phase 1** | Visual identity + security hardening | 3-4 weeks | None |
| **Phase 2** | Data pipeline + model fixes | 2-3 weeks | Phase 1 security fixes |
| **Phase 3** | AWS infrastructure + deployment | 2-3 weeks | Phase 2 data model |
| **Phase 4** | Internal ops + clinical logic | 3-4 weeks | Phase 3 infrastructure |
| **Phase 5** | Testing, CI/CD, polish | 2-3 weeks | All phases |

## 9.2 Phase 1: Visual Identity + Security (Weeks 1-4)

**Why first:** Visual identity IS the product for demos/sales. Security is liability.

| Week | Tasks |
|---|---|
| Week 1 | Liquid metal design system (Tailwind config, CSS primitives, glass panels, metallic gradients) |
| Week 2 | App shell transformation (Sidebar, TopBar, AppShell, MainDashboard on dark glass) |
| Week 3 | Reference module view (HF Executive on glass) + KPICard + shared components |
| Week 4 | Security critical fixes (demo mode guard, clinical auth, JWT secret, input validation) |

## 9.3 Phase 2: Data Pipeline + Model (Weeks 5-7)

**Why second:** Without data persistence, nothing else matters.

| Week | Tasks |
|---|---|
| Week 5 | Schema fixes (missing models, hospitalId on Encounter/Observation/Order, indexes, soft deletes) |
| Week 6 | Service persistence (patientService, observationService, encounterService write to DB) |
| Week 7 | Webhook pipeline (async SQS processing, raw payload archival, idempotency, WebhookEvent records) |

## 9.4 Phase 3: AWS Infrastructure (Weeks 8-10)

**Why third:** Can't deploy without infrastructure.

| Week | Tasks |
|---|---|
| Week 8 | IaC foundation (Terraform/CDK: VPC, Aurora, Redis, S3 buckets, KMS) |
| Week 9 | Auth migration (Cognito user pool, MFA, token management) + Secrets Manager |
| Week 10 | Deployment pipeline (CI/CD, ECS/EKS, API Gateway, CloudTrail, monitoring) |

## 9.5 Phase 4: Internal Ops + Clinical Logic (Weeks 11-14)

| Week | Tasks |
|---|---|
| Week 11 | Internal operations backend (onboarding, BAA tracking, credential delivery) |
| Week 12 | HF GDMT rules engine (first clinical module fully functional) |
| Week 13 | Remaining clinical intelligence services (real data access, not Math.random()) |
| Week 14 | Cross-module referrals, quality measures, HIPAA audit log |

## 9.6 Phase 5: Testing, CI/CD, Polish (Weeks 15-17)

| Week | Tasks |
|---|---|
| Week 15 | Test infrastructure (Jest, Testing Library, integration tests for auth + webhook pipeline) |
| Week 16 | Visual polish (remaining module views, empty states, 404, command palette, accessibility) |
| Week 17 | Documentation (OpenAPI spec, deployment guide, incident response runbook) + pen test prep |

## 9.7 Things You Should Be Thinking About Beyond Code

| Topic | Why It Matters | When |
|---|---|---|
| **SOC 2 Type II** | Hospitals increasingly require alongside HIPAA | Start tracking practices now |
| **BAA execution** | Required before receiving any hospital's PHI | Before first deployment |
| **Data residency** | Some hospitals require specific AWS regions | Architecture decision |
| **Incident response plan** | HIPAA requires breach notification within 60 days | Before handling real PHI |
| **Penetration testing** | Hospital IT will ask for third-party pen test results | Before first enterprise deal |
| **Clinical content governance** | Who approves changes to clinical rules and thresholds? | Before clinical logic goes live |
| **Data validation** | What happens when Redox sends BNP of 999999? | During data pipeline build |
| **Performance under load** | 500-bed hospital = thousands of ADT events/hour | During architecture phase |
| **EHR writeback liability** | If TAILRD triggers a recommendation that harms a patient | Legal review before writeback |
| **CRA migration** | react-scripts is deprecated, migrate to Vite | Phase 5 or separate effort |

---

# APPENDIX A: FILES REFERENCED

## Backend
- `backend/src/middleware/auth.ts`
- `backend/src/middleware/analytics.ts`
- `backend/src/middleware/healthCheck.ts`
- `backend/src/routes/auth.ts`
- `backend/src/routes/admin.ts`
- `backend/src/routes/clinicalIntelligence.ts`
- `backend/src/routes/patients.ts`
- `backend/src/routes/hospitals.ts`
- `backend/src/routes/webhooks.ts`
- `backend/src/routes/godView.ts`
- `backend/src/routes/onboarding.ts`
- `backend/src/routes/modules.ts`
- `backend/src/utils/logger.ts`
- `backend/src/server.ts`
- `backend/src/config/rolePermissions.ts`
- `backend/src/services/patientService.ts`
- `backend/src/services/observationService.ts`
- `backend/src/services/encounterService.ts`
- `backend/src/services/alertService.ts`
- `backend/src/services/phenotypeService.ts`
- `backend/src/services/crossReferralService.ts`
- `backend/src/services/drugTitrationService.ts`
- `backend/src/services/qualityMeasureService.ts`
- `backend/src/services/contentIntelligenceService.ts`
- `backend/src/services/ecgAIService.ts`
- `backend/src/cql/cqlEngine.ts`
- `backend/src/cql/fhirDataMapper.ts`
- `backend/src/cql/ruleLoader.ts`
- `backend/src/cql/valuesetResolver.ts`
- `backend/src/cql/clinicalDecisionProcessor.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`
- `backend/.env` / `backend/.env.example`
- `backend/Dockerfile`
- `backend/docker-compose.yml`
- `backend/scripts/setup-cloudticity.sh`
- `backend/scripts/setup-redox.sh`

## Frontend
- `src/App.tsx`
- `src/index.css`
- `tailwind.config.js`
- `src/design-system/tokens.ts`
- `src/design-system/Sidebar.tsx`
- `src/design-system/TopBar.tsx`
- `src/design-system/AppShell.tsx`
- `src/design-system/SectionCard.tsx`
- `src/theme/semanticTokens.ts`
- `src/theme/index.ts`
- `src/auth/AuthContext.tsx`
- `src/auth/ProtectedRoute.tsx`
- `src/components/shared/KPICard.tsx`
- `src/components/shared/BaseExecutiveView.tsx`
- `src/components/shared/BaseServiceLineView.tsx`
- `src/components/shared/BaseCareTeamView.tsx`
- `src/components/shared/ModuleLayout.tsx`
- `src/components/shared/Toast.tsx`
- `src/components/shared/FinancialSummary.tsx`
- `src/components/shared/ZipHeatMap.tsx`
- `src/components/shared/PatientTimeline.tsx`
- `src/components/shared/DRGOptimizationAlert.tsx`
- `src/components/shared/ErrorFallback.tsx`
- `src/components/shared/ErrorBoundary.tsx`
- `src/components/TailrdLogo.tsx`
- `src/components/Login.tsx`

---

*Document generated: March 11, 2026*
*Total findings: 130+ across all audit domains*
*Total files analyzed: 60+*
