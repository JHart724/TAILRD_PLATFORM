# AUDIT-011 Phase b/c/d — Prisma Extension Layer 3 Design Refinement Note

**Status:** Phase B design (pre-implementation)
**Authored:** 2026-05-07
**Catalyst:** AUDIT-011 Phase b/c/d — Layer 3 Prisma extension as structural multi-tenancy backstop
**Methodology:** §17 (clinical-code PR acceptance) + §17.3 scope discipline + §18 register-literal severity
**Stack base:** `feat/audit-016-pr-3-migration-job` (PR #259); fourth-deep stack (#257 → #258 → #259 → this); rebases as upstream lands
**Cross-reference parent:** `docs/audit/AUDIT_011_DESIGN.md` §6 Phase b/c/d
**Decision context:** PAUSE 1 inventory + Inventory Item 11 + D1-D9 captured 2026-05-07

---

## 1. Layer 3 architecture overview (Option 0 plumbing)

### 1.1 Architectural decomposition — different verification axes, not redundant axes

Multi-tenancy enforcement at TAILRD spans three application layers + (future) one infrastructure layer:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 1 — RBAC (`authorizeHospital` middleware)                        │
│   Question: "Is this user allowed to act on this hospital at all?"    │
│   Mechanism: req.user.role + req.params.hospitalId match               │
│   Failure mode: 403; Phase a — RESOLVED                                │
└────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 2 — App-layer scope (`enforceHospitalScope` middleware)          │
│   Question: "Does the where.hospitalId VALUE equal req.user.hospitalId?"│
│   Mechanism: per-handler `where: { hospitalId: req.user.hospitalId }`  │
│   Failure mode: 403/404 (semantic value match); Phase a — RESOLVED     │
└────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 3 — Prisma extension (`prismaTenantGuard.ts`) ← THIS PR          │
│   Question: "Did the caller include hospitalId in where AT ALL?"       │
│   Mechanism: $extends inspection of params.args.where; pure function   │
│   Failure mode: TenantGuardError → 500 (structural presence check)    │
└────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 4 — Aurora row-level security (deferred; future scope)           │
│   Question: "Does the DB enforce session-level tenant binding?"        │
│   Mechanism: Postgres RLS policies; not in TAILRD scope today          │
└────────────────────────────────────────────────────────────────────────┘
```

**Defense-in-depth via different verification axes**, not redundant verification of the same axis. Layer 2 catches "wrong tenant"; Layer 3 catches "forgot to filter at all." Different attack surfaces; complementary not redundant.

### 1.2 Plumbing decision — Option 0 (no request-context propagation needed)

Phase A inventory enumerated 3 options for plumbing `req.user.hospitalId` to the Prisma layer (AsyncLocalStorage / per-request Prisma client / per-call options bag). All three embedded the assumption that Layer 3 needs request context.

**Inventory Item 11 reframed the question:** Layer 3's job is presence-check, not value-match. Pure function over `params.args.where` alone. Zero request context required.

```typescript
// Layer 3 input surface — the entire set:
//   1. params.model (string)        — for allow-list check
//   2. params.action (string)       — for create/createMany handling
//   3. params.args (object)         — for where inspection + bypass marker
//   4. process.env.TENANT_GUARD_MODE — for runtime mode (cached at init)
```

Operator's robustness commitment is satisfied by simpler architecture: fewer moving parts, no async-context bug surface, zero new dependencies. Sister to phiEncryption's pattern (model from `params.model`; no request context).

### 1.3 Ninth §17.1 architectural-precedent of the 3-day arc

Phase A inventory item 11 surfaced Option 0 reframing. Earlier 3-option framing (AsyncLocalStorage / per-request client / options bag) embedded the assumption that Layer 3 needed request-context plumbing. Inventory Item 11 verdict reframed: **Layer 2 owns value-match (semantic); Layer 3 owns presence-check (structural). Defense-in-depth via different verification axes, not redundant verification of the same axis.** Sister to AUDIT-016 PR 3 raw-SQL-bypass precedent (8th, this arc): in both cases, design phase caught a structural reframing that inventory enumerated past.

§17.1 architectural-precedent count advances 8 → 9.

---

## 2. Model coverage — `HIPAA_GRADE_TENANT_MODELS` allow-list

### 2.1 Allow-list (33 models)

Sister-discipline export to `HIPAA_GRADE_ACTIONS` Set (auditLogger.ts). Greppable, intentional, scoped blast radius.

**Design doc §4.3 starter (17):**

Patient, Encounter, Observation, Alert, TherapyGap, Phenotype, RiskScoreAssessment, InterventionTracking, ContraindicationAssessment, CarePlan, DrugTitration, DeviceEligibility, CrossReferral, AuditLog, Notification, PatientDataRequest, WebhookEvent

**Robustness expansion (16 added per operator decision):**

Condition, Medication, Order, Procedure, AllergyIntolerance, DrugInteractionAlert, DeviceImplant, Recommendation, CdsHooksSession, HospitalEhrIssuer, BpciEpisode, CQLResult, QualityMeasure, UploadJob, UserActivity, InternalNote

**Notification model omitted from final allow-list** (not in current schema as a hospitalId-scoped model). Final count: **33 models** confirmed in allow-list.

### 2.2 System-level exclusion table — nullable-hospitalId models requiring bypass

These 6 models have `hospitalId String?` (nullable) per schema introspection. System-level events (failed-login attempts, unauthenticated errors) write `hospitalId: null` legitimately. Layer 3 enforcement on these models requires `TENANT_GUARD_BYPASS` marker for null-hospitalId writes; nullable means Layer 3 cannot blanket-require presence.

| Model | Schema state | Layer 3 verdict | Notes |
|---|---|---|---|
| `AuditLog` | `hospitalId String?` | **In allow-list + bypass-required at null-write callsites** | Already marked at `auditLogger.ts:195` per Phase a-pre. System-level audit events write null hospitalId for unauthenticated activity (failed logins, etc.). User-scoped audit events (LOGIN_SUCCESS, PHI_VIEW) have hospitalId set; Layer 3 will enforce on those queries. |
| `BreachIncident` | `hospitalId String?` | **In allow-list + bypass-required at null-write callsites** | Platform-wide breach events may have null hospitalId until investigation scopes them. Future BreachIncident creates that target a specific tenant must include hospitalId. |
| `ErrorLog` | `hospitalId String?` | **System-bypass; NOT in allow-list** | Application errors are diagnostic, not PHI access. Cross-tenant aggregation legitimate for ops; null hospitalId is the norm not the exception. Layer 2 owns user-scoped error visibility. |
| `FailedFhirBundle` | `hospitalId String?` | **System-bypass; NOT in allow-list** | Pre-validation FHIR ingestion artifacts; hospitalId may not be derivable until parsed. Webhook callsites already marked with bypass. |
| `PerformanceMetric` | `hospitalId String?` | **System-bypass; NOT in allow-list** | Operational metrics; cross-tenant aggregation is the primary use. Null hospitalId is the platform-scope norm. |
| `PerformanceRequestLog` | `hospitalId String?` | **System-bypass; NOT in allow-list** | Per-request perf telemetry; null hospitalId for unauthenticated requests. |

### 2.3 Borderline-model verdicts table — POST-PAUSE-2.6 callsite verification

**PAUSE 2.6 finding (10th §17.1 architectural-precedent of the arc):** Phase A inventory enumerated allow-list candidates by **schema-column presence** (`hospitalId String`). Phase B + PAUSE 2.6 verification caught that **schema-column presence ≠ query-scoping axis.** A model can have a `hospitalId` column for analytics denormalization without using it as the access-control axis at the query layer. Discipline: allow-list entries must be hospitalId-scoped at the QUERY layer, not just hospitalId-column-bearing in the schema.

Each model below verified per actual callsite scoping pattern (see PAUSE 2.6 grep evidence):

| Model | Callsite scoping pattern | Verdict | Reasoning |
|---|---|---|---|
| `BusinessMetric` | 1 read callsite (analytics.ts:170): conditional hospitalId for SUPER_ADMIN cross-tenant aggregation. Zero writes. | **System-bypass** | Analytics aggregation pattern; cross-tenant legitimate by SUPER_ADMIN role-check. |
| `FeatureUsage` | analytics-aggregation reads at 3 callsites (analytics.ts:84, 118, 399); primary write at middleware/analytics.ts:257 IS hospitalId-scoped via compound unique key `hospitalId_userId_featureName_period_periodStart`. | **In allow-list (option b refinement)** | PAUSE 2.7 sub-decision: primary write hospitalId-scoped at query layer; 3 read callsites get bypass markers sister to webhookPipeline pattern. Defense-in-depth (DB compound unique key + Layer 3 application-layer enforcement on the write path). Sister consistency vs LoginSession: LoginSession's PRIMARY pattern is NOT hospitalId-scoped (sessionToken/userId); FeatureUsage's PRIMARY WRITE IS hospitalId-scoped — different category. |
| `ReportGeneration` | Single create callsite (middleware/analytics.ts:473). Layer 3 skips create. | **In allow-list** | Forward-looking protection. Zero false-positive risk today (only create exists); when read callsites appear they'll be enforced. |
| `InviteToken` | findUnique by `where: { token }` (invite.ts:98, 125); update by `where: { id }` (invite.ts:166). Token IS the cryptographic security boundary; hospitalId column is denormalization for analytics. | **System-bypass** | PAUSE 2.6 movement: token-scoped is the natural pattern (sister to LoginSession sessionToken-scoped). Adding hospitalId to `findUnique({ where: { token } })` would deny valid tokens on tenant mismatch. |
| `LoginSession` | sessionToken pre-auth (auth.ts:62); userId-scoped post-auth (~15 callsites in accountSecurity / mfa / sso). | **System-bypass** | sessionToken / userId are the natural scoping axes; hospitalId column is denormalization. PAUSE 2 verdict confirmed. |
| `Onboarding` | findMany, update by `where: { id }`, groupBy in internalOps.ts (SUPER_ADMIN-only platform tooling). | **System-bypass** | PAUSE 2.6 movement: SUPER_ADMIN-only route surface; cross-tenant operations legitimate by route-level role check. |
| `UserActivity` | createMany (middleware/analytics.ts:225); reads in analytics.ts conditional hospitalId (sister to BusinessMetric pattern). | **System-bypass** | PAUSE 2.6 movement: analytics-aggregation pattern; conditional hospitalId for SUPER_ADMIN cross-tenant. |

**Final allow-list count after PAUSE 2.6 + 2.7 verification:** 36 (PAUSE 2 baseline) − InviteToken − Onboarding − UserActivity = **33 models** in `HIPAA_GRADE_TENANT_MODELS` (FeatureUsage stays in allow-list per option (b) refinement; 3 read callsites get bypass markers).

**Final system-bypass list (9 models):** ErrorLog + FailedFhirBundle + PerformanceMetric + PerformanceRequestLog + BusinessMetric + LoginSession + InviteToken + Onboarding + UserActivity. Categories:
- **4 nullable-hospitalId system events:** ErrorLog / FailedFhirBundle / PerformanceMetric / PerformanceRequestLog
- **2 analytics-aggregation models:** BusinessMetric / UserActivity
- **2 token/session-scoped models:** LoginSession (sessionToken/userId-scoped) / InviteToken (token-scoped; cryptographic random secret IS the access boundary)
- **1 SUPER_ADMIN-only operator surface:** Onboarding (internalOps.ts is platform tooling)

**FeatureUsage stays in allow-list with 3 bypass markers** (option b refinement; sister to webhookPipeline × 8 marker pattern). Existing 11 markers + 3 new FeatureUsage markers = **14 bypass-marker callsites** post-Step-1.2 migration.

---

## 3. Where-clause injection logic

### 3.1 Pure function over `params.args.where`

```typescript
function hasHospitalIdInWhere(args: PrismaQueryArgs): boolean {
  const where = (args as { where?: Record<string, unknown> })?.where;
  if (!where) return false;

  // Top-level hospitalId field
  if ('hospitalId' in where) return true;

  // AND-array compound where — at least one branch carries hospitalId
  if (Array.isArray((where as { AND?: unknown[] }).AND)) {
    return (where as { AND: Array<Record<string, unknown>> }).AND.some(
      (clause) => clause && typeof clause === 'object' && 'hospitalId' in clause,
    );
  }

  // Nested AND object form (Prisma allows AND: { hospitalId: ... })
  if (typeof (where as { AND?: unknown }).AND === 'object'
      && (where as { AND: object }).AND !== null
      && 'hospitalId' in ((where as { AND: object }).AND as Record<string, unknown>)) {
    return true;
  }

  return false;
}
```

**Preserves caller's existing where filter unchanged.** Layer 3 inspects, never mutates.

### 3.2 Per-action handling

| Prisma action | Where-clause path | Layer 3 behavior |
|---|---|---|
| `findUnique`, `findFirst` | `args.where` | Inspect + enforce |
| `findMany` | `args.where` (optional) | Inspect + enforce when present; reject unscoped findMany on PHI models |
| `update`, `delete`, `upsert` | `args.where` | Inspect + enforce |
| `updateMany`, `deleteMany` | `args.where` | Inspect + enforce |
| `create` | NO where; `args.data` instead | **PASS unconditionally** (data must include hospitalId per schema; type system enforces) |
| `createMany` | NO where; `args.data` (array) | **PASS unconditionally** |
| `count`, `aggregate`, `groupBy` | `args.where` | Inspect + enforce |
| `findUniqueOrThrow`, `findFirstOrThrow` | `args.where` | Inspect + enforce |

`create` / `createMany` skip Layer 3 because Prisma's schema-typing requires `hospitalId` in the create payload (compile-time guarantee). No structural gap to backstop.

### 3.3 Edge case — empty where

`prisma.patient.findMany()` with NO where argument → `args` is undefined or `args.where` is undefined. **Treat as missing hospitalId → throw in strict mode.** `findMany` on a PHI model without ANY filter is a structural violation regardless of mode (potential cross-tenant data exposure if even one row is returned).

---

## 4. Bypass mechanism — `TENANT_GUARD_BYPASS` Symbol.for() preservation

### 4.1 Existing symbol contract (Phase a-pre)

```typescript
// backend/src/middleware/tenantGuard.ts:27
export const TENANT_GUARD_BYPASS = Symbol.for('tailrd:tenant_guard_bypass');
```

`Symbol.for()` interns globally; multiple imports yield identical symbol identity. **Critical for the Layer 3 hasOwnProperty check.**

**Existing 11 callsites (Phase a-pre):**
- `auditLogger.ts:195` (1) — system-level audit events
- `crossReferralService.ts:848` (1) — `getReferralByIdAcrossTenants` SUPER_ADMIN
- `phenotypeService.ts:570` (1) — `getPhenotypeByIdAcrossTenants` SUPER_ADMIN
- `webhookPipeline.ts` (8) — Redox HMAC-validated payload-derived hospitalId

### 4.2 Symbol survival across `$use → $extends` migration — **Phase C Step 1.0 gate**

**Concern:** Prisma 5.22 `$extends({ query: { $allModels: { $allOperations: async ({ args, model, operation, query }) => ... } } })` receives `args` as a structured parameter. If Prisma internally serializes / clones args before passing to the wrapper, symbol-keyed properties (`[TENANT_GUARD_BYPASS]: true`) could be stripped.

**Step 1.0 verification (BEFORE all other implementation):**

Write a fail-fast unit test that:
1. Sets `args[TENANT_GUARD_BYPASS] = true` on a fixture args object
2. Routes through Prisma 5.22 `$extends` `$allOperations` wrapper
3. Asserts the wrapper sees the symbol property via `hasOwnProperty(TENANT_GUARD_BYPASS)`

**Three outcomes:**

| Outcome | Probability | Consequence |
|---|---|---|
| (a) Symbol survives | HIGH (expected) | Proceed with current 11-callsite preservation; zero callsite changes; document verification in this note as confirmed-not-assumed. |
| (b) Symbol stripped | LOW | Fall back to string-keyed escape hatch `__tenantGuardBypass: true` (NOT `Symbol.for()` global registry pattern). Update `backend/src/middleware/tenantGuard.ts` marker pattern + migrate the 11 existing callsites in same PR. Effort impact: +1-2h. |
| (c) Mixed behavior | LOW | Treat as outcome (b) for safety; full string-keyed migration. |

**Confidence rationale:** Prisma's args serialization to SQL only inspects schema field names (string-keyed). Symbol-keyed properties are non-enumerable in `Object.keys` iteration; transparently passed as bag metadata. But VERIFY explicitly per the operator's robustness-first posture.

**Do NOT proceed with Phase C steps 1-11 until Step 1.0 verifies.** This is the load-bearing assumption for the entire 11-callsite preservation property.

### 4.3 Bypass detection logic

```typescript
function hasBypassMarker(args: unknown): boolean {
  if (!args || typeof args !== 'object') return false;
  // Symbol identity check (Symbol.for() interning) — survives outcome (a)
  // hasOwnProperty filters inherited symbols (defensive)
  const argsObj = args as Record<symbol, unknown>;
  if (Object.prototype.hasOwnProperty.call(argsObj, TENANT_GUARD_BYPASS)) {
    // Value coercion — `true` only; defense against accidental `false` setting
    return argsObj[TENANT_GUARD_BYPASS] !== false;
  }
  // Outcome (b)/(c) fallback path — only activates if Step 1.0 fails
  if (Object.prototype.hasOwnProperty.call(args, '__tenantGuardBypass')) {
    return (args as { __tenantGuardBypass?: unknown }).__tenantGuardBypass !== false;
  }
  return false;
}
```

---

## 5. Configuration — three-state `TENANT_GUARD_MODE` env flag

### 5.1 Three states + per-mode behavior

```typescript
type TenantGuardMode = 'off' | 'audit' | 'strict';
```

| Mode | Allow-list check fires? | Violation logs? | HIPAA-graded audit event? | Throws? | Use case |
|---|---|---|---|---|---|
| `off` | NO (extension inert) | NO | NO | NO | Deploy escape hatch (rollback target if Layer 3 ships unstable) |
| `audit` | YES | YES | YES (`TENANT_GUARD_VIOLATION`) | NO | 14-day production soak — detection without dev-blocking |
| `strict` | YES | YES | YES (`TENANT_GUARD_VIOLATION`) | YES (TenantGuardError → 500) | Production post-soak |

**Default value:** `audit` (NOT `off`) — robustness-first posture. Zero-cost to ship enforcement-attempt-detecting in `audit` mode by default; operators can rollback to `off` per env-var flip + ECS task restart if needed.

### 5.2 Module-level cached read (sister discipline to AUDIT-013 / AUDIT-017 / AUDIT-016 PR 2)

```typescript
// backend/src/lib/prismaTenantGuard.ts
const TENANT_GUARD_MODE: TenantGuardMode = parseTenantGuardMode(process.env.TENANT_GUARD_MODE);

function parseTenantGuardMode(raw: string | undefined): TenantGuardMode {
  if (raw === 'off' || raw === 'audit' || raw === 'strict') return raw;
  if (raw === undefined || raw === '') return 'audit';  // robustness default
  throw new TenantGuardConfigError(
    `TENANT_GUARD_MODE must be 'off' | 'audit' | 'strict'; got: '${raw}'`,
  );
}
```

**Sister-discipline cross-references:**
- `auditLogger.ts` HIPAA_GRADE_ACTIONS Set — module-init constant (AUDIT-013)
- `keyRotation.ts` `validateKeyOrThrow` — module-init validation (AUDIT-017)
- `phiEncryption.ts` `validateEnvelopeConfigOrThrow` — module-init validation (AUDIT-016 PR 2)

**Flag flip = ECS task restart.** Standard ops procedure; documented in operator runbook section. No hot-reload path.

### 5.3 Configuration-error fail-fast

`TENANT_GUARD_MODE=invalid` → `TenantGuardConfigError` thrown at module init → ECS task fails to start → deploy aborts. No silent default-to-off (would mask the misconfiguration).

---

## 6. Failure mode — `TenantGuardError` structured throw

### 6.1 Error shape

```typescript
export class TenantGuardError extends Error {
  readonly model: string;
  readonly action: string;
  readonly providedWhereKeys: readonly string[];
  readonly mode: TenantGuardMode;
  readonly bypassMarkerPresent: boolean;
  readonly bypassGuidance: string;

  constructor(input: TenantGuardErrorInput) {
    super(
      `Tenant guard: ${input.model}.${input.action} called without hospitalId in where clause ` +
      `(provided keys: ${input.providedWhereKeys.join(', ') || '<none>'}). ` +
      `This is a security regression. Either include hospitalId or pass [TENANT_GUARD_BYPASS]: true ` +
      `for SUPER_ADMIN or system-internal tooling. Mode: ${input.mode}.`,
    );
    this.name = 'TenantGuardError';
    this.model = input.model;
    this.action = input.action;
    this.providedWhereKeys = input.providedWhereKeys;
    this.mode = input.mode;
    this.bypassMarkerPresent = input.bypassMarkerPresent;
    this.bypassGuidance = '...'; // TENANT_GUARD_BYPASS Symbol.for + import path
  }
}
```

### 6.2 Per-mode behavior

- **off:** function returns immediately; never constructs the error
- **audit:** error constructed but NOT thrown; logged + audit event recorded; `query(args)` proceeds normally
- **strict:** error constructed AND thrown; `query(args)` is NOT called; caller's request fails 500

### 6.3 Sister to AUDIT-013 / AUDIT-015 fail-loud pattern

`TenantGuardError` is the structural sister to `EnvelopeFormatError` (AUDIT-015) and `KeyValidationError` (AUDIT-017). Same shape: fail-loud, no silent fallback in strict mode, structured fields for forensic triage.

---

## 7. Audit log scope — AUDIT-076 partial closure +1

### 7.1 Promotion table

| Action | Pre-PR state | Post-PR state | D7 verdict | Rationale |
|---|---|---|---|---|
| `TENANT_GUARD_VIOLATION` | not in `HIPAA_GRADE_ACTIONS` | **Promoted to `HIPAA_GRADE_ACTIONS`** | +1 promotion | Tenant isolation breach is HIPAA §164.312(a)(1) access-control event. Sister to `CDS_HOOKS_CROSS_TENANT_ATTEMPT_BLOCKED` (AUDIT-071 PR #257). Fires in both audit + strict modes. DB write failure throws so caller fails closed. |
| `TENANT_GUARD_BYPASS_USED` | not in `HIPAA_GRADE_ACTIONS` | **Stays best-effort** | NO promotion | Volume risk — webhookPipeline emits 8 markers per Redox webhook. Storm potential. AUDIT-076 boundary review separate scope. |

### 7.2 `TENANT_GUARD_VIOLATION` payload shape

```typescript
{
  action: 'TENANT_GUARD_VIOLATION',
  resourceType: model,           // e.g., 'Patient'
  resourceId: null,
  description: `Tenant guard violation: ${model}.${action} missing hospitalId`,
  newValues: {
    model,
    action,
    providedWhereKeys: string[], // for forensic triage
    mode: 'audit' | 'strict',
    bypassMarkerPresent: boolean,
    timestamp: ISO,
  },
  hipaaGrade: true,  // from HIPAA_GRADE_ACTIONS Set
}
```

### 7.3 AUDIT-076 partial closure progression

- AUDIT-071 PR #257: +4 promotions (CDS_HOOKS family)
- AUDIT-016 PR 2 #258: +2 promotions (KMS family)
- This PR: +1 promotion (TENANT_GUARD family)
- **Cumulative AUDIT-076 partial closure: 7 promotions across 3 PRs.**
- AUDIT-076 boundary review final closure (DATA_REQUEST_FULFILLED, BREACH_INCIDENT_*, MFA_*, INVITE_ACCEPTED, GAP_RESOLVED) deferred to dedicated PR per LOW P3 priority.

---

## 8. phiEncryption.ts `$use → $extends` migration

### 8.1 Coordinated refactor in same PR (per §17.3 scope discipline)

Operator decision D1 reversal: when "robust" (Prisma 5+ recommended pattern) and "consistent with existing" (legacy `$use`) diverge, **robust wins; tech debt gets named and paid down, not propagated.** Bundling phiEncryption migration in this PR avoids half-migrated state where Layer 3 uses `$extends` and Layer 2.5 (encryption) uses `$use`.

### 8.2 API mapping table

| `$use` | `$extends query.$allModels.$allOperations` |
|---|---|
| `prisma.$use(async (params, next) => ...)` | `prisma.$extends({ query: { $allModels: { $allOperations: async ({ args, model, operation, query }) => ... } } })` |
| `params.model` | `model` (string) |
| `params.action` | `operation` (string; same string values: `'findUnique'`, `'create'`, etc.) |
| `params.args` | `args` (object) |
| `next(params)` | `query(args)` (function call) |

### 8.3 Migration mechanics

```typescript
// BEFORE (phiEncryption.ts current):
prisma.$use(async (params, next) => {
  const model = params.model as string | undefined;
  // ... encrypt args.data ...
  const result = await next(params);
  // ... decrypt result ...
  return result;
});

// AFTER (phiEncryption.ts post-migration):
prisma.$extends({
  query: {
    $allModels: {
      $allOperations: async ({ args, model, operation, query }) => {
        // ... encrypt args.data (no rename; args is the same object shape) ...
        const result = await query(args);
        // ... decrypt result ...
        return result;
      },
    },
  },
});
```

**Behavior identical.** Prisma routes both through the same internal pipeline. All ~487 LOC of phiEncryption.ts logic reusable; only the wrapper signature changes.

**Generic-operation cast (§8.7 cast-intentionality doc, 2026-05-07):** `$extends` strictly types `args` per operation (e.g., `findUnique` args type ≠ `create` args type). phiEncryption operates generically across all operations (one wrapper, all models, all actions) so the per-operation typing is too narrow for the wrapper to type-check directly against `args.data` / `args.create` / `args.update`. The `as any` cast at `phiEncryption.ts:268 + :309` (declared once as `argsAny: any` then reused) is bounded to the wrapper function scope, documented via eslint-disable + reason comment, and behavior is verified by 10/10 passing tests including T7 EncryptionContext plumb spy (PR 2's per-record context propagation). Future tightening (typed alias for `{ data?: ... } | { create?: ..., update?: ... }` shapes covering only the operations phiEncryption actually inspects) is a follow-up engineering tightening, **not §17.1** — the cast is intentional scope discipline, not a missing inventory finding.

### 8.4 Test re-validation strategy

Existing 10 phiEncryption tests should pass unchanged — they spy on `applyPHIEncryption`'s effect (encryption-on-write, decryption-on-read), not on `$use` API specifically.

**Verification step:** run `npx jest --testPathPattern="phiEncryption"` post-migration; assert all 10 tests green. If any test breaks on $extends-specific shape, capture the failure mode and update the test (test was over-fitted to `$use` internals; refactor sister).

### 8.5 Backwards-compat with PR 2 EncryptionContext propagation

PR 2 plumbs `{ service, purpose, model, field }` per-record context through phiEncryption. The migration preserves this exactly: `model` → `model` (param rename only), per-field iteration logic unchanged. T7 test (PR 2's middleware-plumb spy) should pass unchanged post-migration.

### 8.6 Wire-in extension order — LOCKED 2026-05-07 (PAUSE 2.8 ASK 2)

Per operator decision PAUSE 2.8: **Layer 3 (tenant guard) registers FIRST; encryption SECOND.**

```typescript
// backend/src/lib/prisma.ts wire-in (Step 3):
const baseClient = new PrismaClient({ ... });
const tenantGuarded = applyPrismaTenantGuard(baseClient);
applyPHIEncryption(tenantGuarded);  // mutates via $extends chain
export default tenantGuarded;
```

**Wrapper-call order (outermost → innermost — Prisma `$extends` semantics):**
```
caller → Layer 3 (tenant guard) → encryption → Prisma query engine → DB
```

**Rationale (option a — most-robust posture):**
- Tenant violations throw BEFORE encryption runs — PHI plaintext never touched on rejected queries
- Encryption work is not wasted on tenant-violating queries that would have been rejected anyway
- Defense-in-depth: data-layer access-control gate fires before content-level encryption gate
- Sister to AUDIT-013 fail-closed pattern (gate before action; structural rejection before content processing)

**Rejected: option b — encryption first, Layer 3 second:**
- Would run encryption against args-closer-to-user-supplied form
- But: encryption work would happen on tenant-violating queries before the throw (work waste)
- And: not defense-in-depth-optimal — content-level gate would fire before access-control gate

**Forward-compat note:** Layer 3 does NOT mutate `args` today (pure inspection). Encryption sees the same `args` shape regardless of registration order. The order matters for SHORT-CIRCUIT semantics (which gate throws first), not for args-shape semantics. If Layer 3 ever evolves to mutate args (e.g., automatic `where.hospitalId` injection — explicitly rejected in current design per §3 "preserves caller's existing where filter unchanged"), the order assumption would need re-verification.

---

## 9. Test plan — three layers

### 9.1 Unit tests on `prismaTenantGuard.ts` (~12-15 tests)

| Test | Mode | Scenario | Assertion |
|---|---|---|---|
| Step 1.0 — Symbol survival across $extends | n/a | Set bypass marker in args; route through wrapper | hasOwnProperty(TENANT_GUARD_BYPASS) returns true; value === true |
| Allow-list — PHI model + missing hospitalId in where | strict | Patient.findUnique with where: { id } | TenantGuardError thrown |
| Allow-list — PHI model + hospitalId in where | strict | Patient.findUnique with where: { id, hospitalId } | passes; query(args) called |
| Non-PHI model — system-bypass list | strict | ErrorLog.findMany | passes (not in allow-list) |
| TENANT_GUARD_BYPASS marker + missing hospitalId | strict | Patient.findFirst with marker | passes |
| AND-array compound where — hospitalId in branch | strict | where: { AND: [{ id: 'x' }, { hospitalId: 'h' }] } | detected; passes |
| AND-object form — nested hospitalId | strict | where: { AND: { hospitalId: 'h' } } | detected; passes |
| `create` action skipped | strict | Patient.create | passes (no where; data validates) |
| `createMany` action skipped | strict | Patient.createMany | passes |
| Empty findMany on PHI model | strict | Patient.findMany() (no args) | TenantGuardError thrown |
| **off mode — extension inert** | off | Patient.findUnique missing hospitalId | passes; no log; no audit |
| **audit mode — logs no throw** | audit | Patient.findUnique missing hospitalId | passes; log emitted; audit event recorded; query(args) called |
| **strict mode — logs and throws** | strict | Patient.findUnique missing hospitalId | TenantGuardError thrown; log emitted; audit event recorded |
| TENANT_GUARD_MODE invalid value | n/a | parseTenantGuardMode('garbage') | TenantGuardConfigError thrown |
| TENANT_GUARD_MODE unset | n/a | parseTenantGuardMode(undefined) | returns 'audit' (robustness default) |

### 9.2 phiEncryption.ts test re-validation (~10 existing tests post-$extends migration)

All existing tests in `backend/src/middleware/__tests__/phiEncryption.test.ts` re-run unchanged. No test code modifications expected (tests spy on behavior, not API). Failures indicate `$extends` migration broke a load-bearing assumption — fix at impl time.

### 9.3 Integration tests on real DB with multi-tenant fixtures (~79 tests; gated)

`backend/tests/integration/audit-011-cross-tenant.test.ts` — gated by `RUN_INTEGRATION_TESTS=1` (sister to AUDIT-016 PR 2 scaffold pattern).

**PAUSE 2.13 mid-authoring scope correction (2026-05-07):** Original scope sampled 10-12 of 33 allow-list models for ~30-40 integration tests. Operator-side scope correction caught calibration drift — Phase d strict-mode flip puts ALL 33 models under enforcement simultaneously; production cross-tenant violation on any unsampled model = undetected until customer-discovered. Sampling is acceptable for unit tests; not acceptable for production-confidence gate. Revised to 8 test groups + ~79 tests total. Honest framing-vs-implementation match, not §17.1.

**Coverage by group (8 groups; ~79 tests; load-bearing for Phase d GO/NO-GO confidence gate):**

| Group | Count | Purpose |
|---|---|---|
| **I — Cross-tenant rejection by allow-list model** | **33** | All 33 `HIPAA_GRADE_TENANT_MODELS` members get explicit per-model coverage (table-driven). hospitalA user querying with hospitalB filter triggers Layer 3 enforcement (audit log + audit event in audit mode; throw in strict mode). |
| **II — Bypass marker honored in real DB** | **6** | `__tenantGuardBypass: true` on findFirst / update / delete / findMany; bypass marker stripped scenario; bypass marker false-coercion defensive case. |
| **III — System-bypass models cross-tenant** | **6** | ErrorLog / FailedFhirBundle / PerformanceMetric / PerformanceRequestLog / BusinessMetric / LoginSession — verify NO Layer 3 enforcement (false-positive prevention). |
| **IV — 3-state flag matrix against real DB** | **9** | (off / audit / strict) × (violating / passing / bypass-marker) — verifies mode interaction with all three orthogonal axes. |
| **V — Where-clause detection branches against real DB** | **6** | Top-level + AND-array + AND-object + nested OR + complex production-shape patterns (grep'd from real `src/services/` + `src/routes/` query shapes). False-positive prevention on legitimate production queries. |
| **VI — Edge cases + regression-class coverage** | **12** | Concurrent queries × 3, $transaction wrapping × 3, createMany mixed-tenant × 1, bulk operations × 2, connection pool boundary × 1, empty-result cross-tenant × 1, plus explicit non-fired baseline × 1. |
| **VII — Soak-mode operational readiness (NEW — Phase d GO/NO-GO confidence gate)** | **4** | VII.1 audit-mode latency; VII.2 audit event volume (100 violations captured); VII.3 audit event queryability for soak-summary report; VII.4 strict-mode flip readiness signal. |
| **VIII — Cleanup & isolation discipline (NEW — production-DB-only bug class)** | **3** | Fixture isolation (TEST_PREFIX scoping); no PrismaClient pool leak; afterAll cleanup completeness across 42 models (33 allow-list + 9 system-bypass). |

**Total: ~79 integration tests.**

**Multi-tenant fixture setup:**
- 2 hospital fixtures (hospital-A, hospital-B) seeded in test database with `TEST_PREFIX` for cleanup-by-prefix safety
- 1 patient per hospital seeded
- JWT-equivalent context for hospital-A user + hospital-B user + SUPER_ADMIN (synthesized; integration scope not auth-flow-end-to-end)
- TEST_PREFIX = `audit011-test` (sister to `audit071-test` from PR #257)

**Gating + activation contract (sister to `audit016-pr2-kms-roundtrip.test.ts`):**
- `RUN_INTEGRATION_TESTS=1` + `DATABASE_URL` set + Postgres reachable → suite activates
- Default CI: `describe.skip` envelope; suite becomes scaffolding (auditable spec, not active validation)
- Phase d operator-side GO/NO-GO: operator runs `RUN_INTEGRATION_TESTS=1 npx jest audit-011-cross-tenant` against soak-mode DB before flipping `TENANT_GUARD_MODE=strict`. The 79-test pass IS the gate.

**Group VII honest scope notes (jest-vs-load-test mismatch):**
- VII.1 latency: jest single-process overhead + per-test-suite cold start make sub-5ms latency assertions unreliable. Test instead asserts a **bounded P95 latency relative to no-extension baseline** (Layer 3 wrapper cost <50% of baseline median; calibrated during authoring against actual measurement).
- VII.4 strict-mode flip readiness: not a 14-day simulation in jest; instead asserts that a representative set of legitimate production query shapes (grep'd from `src/services/`) emit zero violations against valid same-tenant fixtures. Real soak-window evidence is operator-side log-mining over 14 calendar days, not jest-runnable.
- Group VI concurrency: jest's serial-by-default + Node single-threaded event loop limit "real concurrency" testing. Tests use `Promise.all` pattern to exercise async-reentrancy; real connection-pool concurrency requires load-test infrastructure (out of jest scope).

### 9.4 Three-state flag test matrix verification

Cross-product of `{off, audit, strict}` × `{passing case, violating case}` × `{representative model}` = 6 explicit test cases. Already covered by §9.1 unit tests + §9.3 integration tests; this matrix is documented in the test descriptions for operator review.

---

## 10. Rollback path

### 10.1 Three-state flag enables one-env-var rollback

```
strict (production post-soak)
   │ env var flip + ECS task restart
   ▼
audit (soak window; detection without enforcement)
   │ env var flip + ECS task restart
   ▼
off (extension inert; deploy escape hatch)
```

**Zero-impact rollback property:** Layer 3 inert in `off` mode. Phase a-pre + Layer 2 enforcement carry the load. Pre-AUDIT-011 production state is reproduced exactly when `TENANT_GUARD_MODE=off`.

### 10.2 phiEncryption $extends migration revert path

Single-PR revert (this PR's own commit reverted) restores `$use` middleware. Tests verify behavior unchanged so revert is mechanical not semantic — the migration ITSELF is the only thing that's different; restore to `$use` and tests pass.

### 10.3 What rollback CANNOT recover

- Database schema state — no schema changes in this PR (Layer 3 is in-process only). N/A.
- Phase a-pre callsite refactors — already merged. N/A.
- Existing TENANT_GUARD_BYPASS markers — already merged. N/A.

---

## 11. Effort breakdown

| Component | Estimate | Actual (running) |
|---|---|---|
| Step 1.0 / 1.0.1 — Symbol + string-keyed survival verification (gate) | 0.5h | ~0.5h ✅ |
| Step 1.1 — `tenantGuard.ts` marker pattern migration (Symbol.for → string-keyed) | ~0.5h | ~0.5h ✅ |
| Step 1.2 — 11-callsite migration + 3 FeatureUsage markers per (b) refinement | ~1-1.75h | ~1h ✅ |
| Step 1.3 — Test fixture migrations (PR 3 + AUDIT-022 + dead jest.mock cleanup) | ~0.25h | ~0.25h ✅ |
| Step 1 — `prismaTenantGuard.ts` authoring | ~3-4h / **~250-350 LOC** | **~2-3h / 473 LOC ✅** (~35% LOC overrun) |
| Step 2 — phiEncryption.ts `$use → $extends` migration + test re-validation | ~2-4h | TBD |
| Step 3 — prisma.ts wire-in (Layer 3 first, encryption second per §8 lock) | ~0.5h (revised; was ~0.25h — original was just the file edit; revised includes mandatory verification battery: downstream-import compatibility grep + smoke test + Step 11.5 self-check; honest scope expansion driven by robustness posture, not §17.1) | TBD |
| Step 4 — auditLogger.ts +1 promotion (TENANT_GUARD_VIOLATION) | ~0.25h | TBD |
| Step 5 — prismaTenantGuard.test.ts (NEW; ~12-15 unit + 3-state flag matrix) | ~1-1.5h | TBD |
| Step 6 — phiEncryption.test.ts re-validation | ~0.5h | TBD |
| Step 7 — audit-011-cross-tenant.test.ts (NEW; ~79 gated tests across 8 groups for Phase d GO/NO-GO confidence gate) | ~4-6h (revised; was 2-3h — PAUSE 2.13 mid-authoring scope correction; original sampled 10-12 of 33 allow-list models, revised covers all 33 + concurrency + perf + soak observability + cleanup discipline; honest framing-vs-implementation match, not §17.1) | TBD |
| Steps 8-11 — register / design doc / BUILD_STATE / jest sanity | ~1.25h | TBD |
| **Subtotal — outcome (b) path** | **~10-13h** | **~4.25h consumed; ~5.75-8.75h remaining** |

**Step 1 LOC overrun driver analysis (NOT §17.1; honest engineering-bar scope expansion):**
- ~120 LOC top-of-file JSDoc + per-section JSDoc (operator engineering bar: full type signatures + cross-references)
- ~40 LOC TenantGuardError class with bypassGuidance string assembled in constructor (vs minimal Error subclass)
- ~30 LOC HIPAA_GRADE_TENANT_MODELS Set with categorical comments (10 core PHI / 7 CDS / 8 clinical content / 6 operational / 2 analytics)
- ~30 LOC `hasHospitalIdInWhere` with all 3 position-detection branches + non-detection notes (OR-array, nested relations) inline-documented
- ~40 LOC test helpers (`_resetTenantGuardModeCacheForTests`) + cached-mode read with init validation pattern (mirrors AUDIT-013/017/AUDIT-016 PR 2 module-init discipline)

Sister to AUDIT-016 PR 3 LOC overrun pattern (~18-27% over Phase B estimate; PR 3 was 600-650 estimate → 764 actual). Both arcs surfaced LOC overrun as scope-clarification within authoring (engineering bar discipline + JSDoc breadth), not §17.1 architectural-precedent. §17.1 count stays at 10.

---

## 12. Cross-references

- **Parent design doc:** `docs/audit/AUDIT_011_DESIGN.md` (615 LOC; §6 Phase b/c/d; §11 callsite audit; §4.3 Layer 3 spec)
- **AUDIT-001 sister precedent** — Phase c integration test suite closes the detection-layer gap for tenant-isolation specifically (AUDIT-001 0% coverage scope reduction)
- **AUDIT-071 lesson** — `docs/architecture/AUDIT_071_CDS_HOOKS_TENANT_ISOLATION_DESIGN.md:427` explicitly states "Layer 3 Prisma extension is the structural backstop; this PR is a CDS-Hooks-specific Layer 2 fix." This PR delivers the Layer 3 backstop AUDIT-071 referenced.
- **AUDIT-016 PR 2 #258** — middleware pattern (`$use` with per-record context) now migrating to `$extends` per §8 of this note. PR 2 EncryptionContext propagation T7 test must remain green post-migration.
- **AUDIT-013 fail-closed module-init pattern** — sister to `parseTenantGuardMode` fail-fast at startup. Standard discipline.
- **AUDIT-015 fail-loud** — sister to `TenantGuardError` structural error vs silent default.
- **AUDIT-017 `validateKeyOrThrow`** — sister to module-init env validation pattern.
- **AUDIT-076 partial closure** — +1 promotion (`TENANT_GUARD_VIOLATION`); cumulative arc total 7 promotions across 3 PRs (#257 +4, #258 +2, this +1).
- **HIPAA Security Rule §164.312(a)(1)** — Access Control standard; tenant-isolation breaches are §164.312(a)(1) events.
- **HIPAA Security Rule §164.312(b)** — Audit Controls; HIPAA-graded audit events for `TENANT_GUARD_VIOLATION` per AUDIT-013 dual-transport pattern.
- **NIST SP 800-53 AC-3** — Access Enforcement; Layer 3 implements structural access enforcement at the data-layer boundary.

---

## 13. What's NOT in scope (§17.3 scope discipline)

- **Phase d flag removal** — operator-side post-14-day-soak; future PR. Once `TENANT_GUARD_MODE=strict` runs clean for 14 days in production, remove the env-var read and inline `mode = 'strict'` constant. Single-line PR.
- **Existing query gap remediation** — per-area-owner discipline. Phase a-pre already shipped 13 REFACTOR + 11 bypass markers. Any miss surfaces as throw during initial deployment with `TENANT_GUARD_MODE=audit` (logs but doesn't break); gap fixes follow per-area-owner discipline.
- **`$extends` migration of OTHER `$use` middleware** — this PR migrates phiEncryption only (the only existing `$use` middleware in the codebase). Any future `$use` middleware migrates separately when introduced.
- **Aurora Row-Level Security (Layer 4)** — out of TAILRD scope today. Postgres RLS policies require migration discipline + DBA-level review. Layer 3 closes the gap that AUDIT-071 demonstrated; Layer 4 is hardening that exceeds production-readiness gate scope.
- **AUDIT-076 final closure** — DATA_REQUEST_FULFILLED, BREACH_INCIDENT_*, MFA_*, INVITE_ACCEPTED, GAP_RESOLVED promotions deserve dedicated PR boundary review per LOW P3 priority.
- **auditLogger.ts dedicated unit test coverage** — Step 4 verification 4 surfaced no dedicated `auditLogger.test.ts` exists (sister to AUDIT-001 0% coverage gap). The +1 `TENANT_GUARD_VIOLATION` promotion ships with indirect coverage via Step 5 `prismaTenantGuard.test.ts` (covering Layer 3 emission path) but no direct coverage of the `HIPAA_GRADE_ACTIONS` Set-membership lookup at `auditLogger.ts:202`. Tracked as follow-up: AUDIT-076 final closure should include authoring `auditLogger.test.ts` with explicit `HIPAAGradedAction` type-narrowing tests (per §13.1 const-assertion-union tightening) + Set-membership coverage. Not §17.1 — known coverage gap inherited from prior 6 promotions (AUDIT-013 baseline 10 + AUDIT-071 PR #257 +4 + AUDIT-016 PR #260 +2); not introduced by this PR.

### 13.1 Engineering tightening follow-ups (NOT §17.1; tracked here for visibility)

- **Type-erasure cast widening for future extension-method additions** — `prisma.ts:51-52` uses `as unknown as PrismaClient` cast at the wire-in boundary (per 11th §17.1 fix). If a future extension adds methods that downstream consumers SHOULD see (e.g., new model accessors via `$extends({ model: { ... } })` shape), the cast erases those additions too. Tightening path: declare a typed alias `type ExtendedPrismaClient = PrismaClient & { /* extension methods */ }` and cast to that alias instead of bare PrismaClient. Triggers when an extension introduces consumer-visible methods. Not §17.1 — no inventory miss; deliberate scope-narrowing for current PR.
- **HIPAA_GRADE_ACTIONS string-typing tightening** — Current state: `HIPAA_GRADE_ACTIONS = new Set<string>([...])` accepts arbitrary string entries; producer-consumer string match (e.g., `auditLogger.info('audit_event', { action: 'TENANT_GUARD_VIOLATION', ... })` producer side ↔ `HIPAA_GRADE_ACTIONS.has(action)` consumer side) relies on runtime grep + eyeball verification (Step 4 verification 2). Producers can typo a string and the runtime check silently doesn't match; the action lands as best-effort instead of HIPAA-graded. Tightening path: `const HIPAA_GRADE_ACTIONS_LIST = ['LOGIN_SUCCESS', ..., 'TENANT_GUARD_VIOLATION'] as const; type HIPAAGradedAction = typeof HIPAA_GRADE_ACTIONS_LIST[number]; const HIPAA_GRADE_ACTIONS: ReadonlySet<HIPAAGradedAction> = new Set(HIPAA_GRADE_ACTIONS_LIST);` then type the auditLogger emit-side action parameter as `HIPAAGradedAction | string` (string for non-graded actions; HIPAAGradedAction for graded). Compiler catches typos. Tracked as engineering tightening, **not §17.1** — no inventory miss; the runtime grep verification at Step 4 covers this PR's emission path.

---

## 14. Ninth §17.1 architectural-precedent capture

**Phase A inventory item 11 surfaced Option 0 reframing.** Earlier 3-option framing (AsyncLocalStorage / per-request client / options bag) embedded the assumption that Layer 3 needed request-context plumbing. Inventory Item 11 verdict reframed: **Layer 2 owns value-match (semantic); Layer 3 owns presence-check (structural). Defense-in-depth via different verification axes, not redundant verification of the same axis.**

Sister to AUDIT-016 PR 3 raw-SQL-bypass precedent (8th, this arc): in both cases, design phase caught a structural reframing that inventory enumerated past.

| § | Precedent | Catalyst | What was caught |
|---|---|---|---|
| 1 | AUDIT-067/068 LOINC reference-only (PR #249) | §17.1 consumer audit | 3-6h architectural estimate → 50min right-sized fix |
| 2 | AUDIT-069 LVEF (PR #248) | NLM Clinical Tables fallback | Prior codebase fix-from comment was itself a regression |
| 3 | AUDIT-016 kmsService reframing (PR #252 design) | §17.1 consumer audit | Register's "scaffolded but unwired" → 305 LOC fully implemented but unconsumed |
| 4 | AUDIT-022 PHI_JSON_FIELDS (PR #253) | §17.1 consumer audit | 11-column register snapshot → 30-column middleware reality + 2 stale refs |
| 5 | AUDIT-016 V0/V1/V2 schema (PR #255) | §17.1 design audit | Original V1 wrappedDEK placeholder → V0/V1/V2 split for signal-shape honesty |
| 6 | Phase 3 audit pre-onboard-gate framing (PR #256) | Operator §17.1 reframing | Data-state-independent reframing rejected derivative drift |
| 7 | AUDIT-071 Phase A inventory expansion (PR #257) | Pre-flight inventory | 2-callsite framing → 3 vulnerable callsites + production header-skip + downstream session-write |
| 8 | AUDIT-016 PR 3 raw SQL bypass (PR #261) | Phase B design | Phase A inventory missed migrateRecord's own write-path middleware double-encrypt risk |
| 9 | AUDIT-011 Layer 3 Option 0 plumbing (this PR) | Inventory Item 11 reframing | Earlier 3-option framing assumed req-context plumbing; Layer 3 is presence-check, not value-match — pure params.args inspection sufficient |
| 10 | AUDIT-011 schema-column ≠ scoping-axis (this PR; PAUSE 2.6 + 2.7) | Phase B callsite verification | Phase A inventory enumerated allow-list candidates by `hospitalId String` schema-column presence; PAUSE 2.6 grep on InviteToken / Onboarding / UserActivity / FeatureUsage callsites caught that schema-column presence ≠ query-scoping axis. 3 models moved to system-bypass (InviteToken / Onboarding / UserActivity); FeatureUsage refined per defense-in-depth posture (PAUSE 2.7 sub-decision option b — primary write hospitalId-scoped via compound unique key justifies in-allow-list with 3 read-callsite bypass markers). Allow-list 36 → 33. Discipline: allow-list entries must be hospitalId-scoped at the QUERY layer, not just hospitalId-column-bearing in the schema; defense-in-depth applies when primary writes ARE hospitalId-scoped (DB constraint + app-layer Layer 3 enforcement). |
| **11** | **AUDIT-011 TS inference erosion through generic `$extends` chain (this PR; PAUSE 2.10 Step 3 verification)** | **Phase C Step 3 TS verification** | **Phase A inventory enumerated 50 downstream consumers + 16 PrismaClient type imports + $-method callsites — but didn't anticipate that the GENERIC return type `<TClient extends PrismaClient>(prisma: TClient): ReturnType<TClient['$extends']>` chained through Step 1 + Step 2 would resolve to `DynamicClientExtensionThis<TypeMap<...>>` at the import site. Result: 100+ TS errors across 50 downstream consumers (`prisma.patient`, `prisma.$transaction`, etc. all resolve to `unknown`). Phase C Step 3 `npx tsc --noEmit` caught it. Fix: `as unknown as PrismaClient` type-erasure cast at the wire-in boundary (`prisma.ts:51-52`) — at runtime the extended client retains every PrismaClient method (`$extends` adds capability, never removes the base shape) so the cast is type-erasure only. Phase A treated downstream-import compatibility as a runtime-method question (does `$transaction` survive? — yes); missed the parallel TypeScript-inference question. Discipline: generic-extends function signatures crossing API boundaries need explicit return-type erasure for downstream consumer type stability. Verification battery (mandatory for non-trivial wire-ins) is the catch surface; not Phase A pre-flight.** |

Methodology stack working as designed. The §17.1 mechanism fires when design phase catches what inventory enumerated past. **Pattern: assumptions about scope embedded in inventory framing are themselves audit targets, not premises.** The 9th + 10th + 11th precedents are sister findings on Layer 3 axes:
- **9th** — Layer 3 INPUT axis (Option 0 plumbing reframing; no req-context plumbing needed; design-time catch)
- **10th** — Layer 3 SCOPE axis (schema-column ≠ query-scoping axis; allow-list verification; design-time catch)
- **11th** — Layer 3 TYPE axis (generic-extends inference erosion at the wire-in boundary; integration-time catch via `tsc` verification battery)

The 9th + 10th surfaced at design time; the 11th surfaced at integration time. Both timing classes are §17.1 — the mechanism fires whenever any phase catches what an earlier phase enumerated past. The verification battery (mandatory for non-trivial wire-ins) is the catch surface for integration-time precedents; design-phase reframings remain the catch surface for design-time precedents. **§17.1 architectural-precedent count advances 10 → 11.**

---

*Authored 2026-05-07 during AUDIT-011 Phase b/c/d Phase B design refinement. Catalyst: AUDIT-071 demonstrated Layer 2 + Phase a-pre app-layer discipline alone is structurally insufficient; Layer 3 Prisma extension is the structural backstop. PR-stacked on PR #259 (4th-deep stack: #257 → #258 → #259 → this). Sister to AUDIT-016 PR 3 design refinement note (`AUDIT_016_PR_3_MIGRATION_JOB_NOTES.md`) — same shape, same rigor, different scope.*
