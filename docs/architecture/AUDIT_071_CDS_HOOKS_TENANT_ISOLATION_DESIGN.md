# AUDIT-071 — CDS Hooks Tenant Isolation Design

**Status:** DESIGN — pending operator approval at PAUSE 2; implementation begins on D1-D6 confirmation
**Authored:** 2026-05-07
**Catalyst:** AUDIT-071 (HIGH P1) — see `docs/audit/AUDIT_FINDINGS_REGISTER.md`
**Methodology:** §17 (clinical-code PR acceptance), §17.3 (scope discipline — bundles AUDIT-073 per shared schema migration), §18 (status-surface discipline)

---

## 1. iss → hospitalId mapping model

Three options surfaced during Phase A inventory; trade-offs analyzed:

### Option 1 — New `HospitalEhrIssuer` model (1:N from Hospital)

```prisma
model HospitalEhrIssuer {
  id          String   @id @default(cuid())
  hospitalId  String
  hospital    Hospital @relation(fields: [hospitalId], references: [id], onDelete: Restrict)
  issuerUrl   String
  label       String?  // operator-readable identifier (e.g., "Epic Production", "Epic Sandbox")
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([issuerUrl])              // global uniqueness — one issuer URL maps to exactly one hospital
  @@index([hospitalId, isActive])
  @@map("hospital_ehr_issuers")
}
```

**Pros:**
- 1:N supports HCA/CommonSpirit multi-instance Epic patterns (production + sandbox + DR + multiple hospital instances per integrated delivery network)
- Auditable via `AuditLog` writes on issuer registration / deactivation (sister to AUDIT-013 audit log discipline)
- Soft-disable via `isActive` for tenant offboarding without losing historical mapping
- FK to Hospital provides referential integrity
- Separates issuer mapping from Hospital row (Hospital row stays narrow; mapping rows scale with EHR instances)

**Cons:**
- One additional model + migration + tests
- Operator runbook must cover "register issuer URL for hospital X" workflow

### Option 2 — `Hospital.epicIssuerUrl String?` field

**Pros:** simpler; no new model; no FK overhead.

**Cons:**
- 1:1 — does not handle HCA's multi-instance Epic pattern (single hospital row would have multiple legitimate issuer URLs)
- Hospital row grows (already 70+ fields per `schema.prisma:35-112`)
- Inflexible: changing issuer URL requires Hospital UPDATE; no historical record
- No soft-disable for offboarding

### Option 3 — Env-var allowlist (`EHR_ISSUER_TO_HOSPITAL_ID_MAP` JSON in Secrets Manager)

**Pros:** zero schema change; deploy-only updates; matches existing config patterns (e.g., `tailrd-production/app/database-url`).

**Cons:**
- Config not data — auditing happens at deploy time, not via DB-resident audit log
- Deploy required to add a new tenant's issuer mapping (couples mapping changes to release cadence)
- Stale-config risk — config drift between environments (staging mapping ≠ production mapping)
- No FK integrity — operator can typo a hospitalId that doesn't exist

### Recommendation

**Option 1** (`HospitalEhrIssuer` model). Per operator preference D1 + matches HIPAA-grade auditability + handles multi-instance Epic + scales with v2.0 multi-tenant pilot expansion.

---

## 2. Middleware composition

### New file: `backend/src/middleware/cdsHooksAuth.ts`

Express middleware that:
1. Reads `req.body.fhirAuthorization?.subject` to extract claimed `iss`
2. Verifies CDS Hooks JWT signature against issuer's JWKS via `jose` (same library + cache pattern as existing `verifyCDSHooksJWT`)
3. Looks up `HospitalEhrIssuer` by issuer URL
4. Populates a CDS-Hooks-specific request shape: `req.cdsHooks = { hospitalId, issuerUrl, ehrIssuerId }` (see §2.3 — distinct from `req.user` to avoid coupling)
5. On failure (no fhirAuthorization, JWT invalid, unmapped issuer, etc.) → audit log entry + return `200 { cards: [] }` (per §4 D3)

### Mount sequence in `server.ts:189`

```ts
app.use(
  '/cds-services',
  cdsLimiter,
  require('./middleware/cdsHooksAuth').cdsHooksAuth,  // NEW
  require('./routes/cdsHooks').default,
);
```

Middleware ordering: rate limit (DoS protection) → tenant resolution (PHI protection) → handler. The discovery `GET /` endpoint at `cdsHooks.ts:54-91` will be exempted from the auth middleware (returns static service catalog; no PHI; spec-required for app-orchard discovery probes).

### req shape (NOT inherited from authenticateToken)

```ts
interface CdsHooksAuthenticatedRequest extends Request {
  cdsHooks?: {
    hospitalId: string;       // resolved via HospitalEhrIssuer lookup
    issuerUrl: string;        // verified iss claim
    ehrIssuerId: string;      // HospitalEhrIssuer.id for audit trail
  };
}
```

**Explicit non-inheritance from `authenticateToken`:**
- No `req.user` synthesis — the platform's `JWTPayload` shape is for platform-issued JWTs; CDS Hooks JWTs are EHR-issued and carry different claims (sub, iss, jti, iat, exp; no userId/role/permissions)
- No demo-mode fallback — Phase A inventory #13 surfaced that `authenticateToken` synthesizes super-admin payload in DEMO_MODE; CDS Hooks endpoints are external-facing and must NOT inherit this bypass

### Discovery endpoint exemption pattern

```ts
export const cdsHooksAuth: RequestHandler = async (req, res, next) => {
  // Discovery endpoint is spec-required public; no PHI exposure
  if (req.method === 'GET' && (req.path === '/' || req.path === '')) return next();
  if (req.method === 'POST' && req.path.endsWith('/feedback')) return next();  // feedback has no PHI
  // All other paths require tenant resolution
  ...
};
```

---

## 3. Both-paths design

### Path A: EHR-initiated CDS Hooks JWT (production primary path)

1. Client (Epic, Cerner, etc.) posts to `/cds-services/<hookId>` with:
   - `Authorization: Bearer <CDS-Hooks-JWT>`
   - Body containing `fhirAuthorization.subject` = the EHR's issuer URL
2. Middleware extracts issuer URL from `fhirAuthorization.subject`
3. Verify JWT signature against the issuer's JWKS (`<iss>/.well-known/jwks.json`)
4. Validate JWT claims: presence of `iss`, `iat`, `exp`, `jti`; audience matches our service URL
5. Look up `HospitalEhrIssuer.findFirst({ where: { issuerUrl: <verified-iss>, isActive: true } })`
6. If no match → audit log `CDS_HOOKS_UNMAPPED_ISSUER` → 200 + empty cards
7. Populate `req.cdsHooks = { hospitalId, issuerUrl, ehrIssuerId }`
8. Handler proceeds with **mandatory** `where: { fhirPatientId, hospitalId, isActive: true }`

### Path B: non-EHR-initiated requests (per D2 — deny + audit)

Per operator D2 sub-option 2b: deny via `200 { cards: [] }` + audit log. Reasoning:
- Today no admin-tooling use case for non-EHR CDS Hooks invocation
- Tighter attack surface (zero non-EHR ingress)
- Platform-JWT path can ship later as a follow-up PR if a use case emerges

Implementation: middleware checks for presence of `req.body.fhirAuthorization?.subject`. If absent:
- Audit log `CDS_HOOKS_NO_TENANT_RESOLVED` (HIPAA-graded per D6)
- Return `200 { cards: [] }`

---

## 4. Error response semantics + audit log integration

Per D3 (operator) + D6 (HIPAA-grade promotion):

| Scenario | HTTP | Body | Audit action | HIPAA-graded? |
|---|---|---|---|---|
| Discovery `GET /` | 200 | service catalog | (none — no PHI) | N/A |
| Feedback `/:hookId/feedback` | 200 | empty | (none — no PHI) | N/A |
| Missing `fhirAuthorization.subject` | 200 | `{ cards: [] }` | `CDS_HOOKS_NO_TENANT_RESOLVED` | YES |
| JWT signature invalid / expired | **401** | `{ error: 'Invalid CDS Hooks JWT' }` | `CDS_HOOKS_JWT_VALIDATION_FAILURE` | YES |
| JWT valid but `iss` not in `HospitalEhrIssuer` | 200 | `{ cards: [] }` | `CDS_HOOKS_UNMAPPED_ISSUER` | YES |
| Patient not found in resolved tenant | 200 | `{ cards: [] }` | `CDS_HOOKS_INVOCATION` (best-effort) | NO |
| Patient found in DIFFERENT tenant (impossible after mandatory filter, but defense-in-depth check post-lookup) | 200 | `{ cards: [] }` | `CDS_HOOKS_CROSS_TENANT_ATTEMPT_BLOCKED` | YES |
| Successful card return | 200 | `{ cards: [...] }` | `CDS_HOOKS_INVOCATION` (best-effort) | NO |

**Spec-compliance note:** CDS Hooks 2.0 spec says hooks should return 200 even on "service errors" but is permissive about 401 for invalid auth. Epic App Orchard documentation accepts 401 for JWT auth failure. Decision per D3: 401 reserved for JWT-signature-level errors only (the auth boundary); all data-state failures (unmapped iss, missing patient, etc.) use 200 + empty cards (the spec-strict path).

---

## 5. Mandatory filter pattern + ordering

### Replace conditional with mandatory

`cdsHooks.ts:117-123` (cardiovascular-gaps) — current vulnerable:
```ts
const hospitalId = (req as any).user?.hospitalId;
const patientWhere: Record<string, unknown> = { fhirPatientId: patientFhirId, isActive: true };
if (hospitalId) patientWhere.hospitalId = hospitalId;
const patient = await prisma.patient.findFirst({ where: patientWhere });
```

Replaced with:
```ts
const cdsCtx = (req as CdsHooksAuthenticatedRequest).cdsHooks;
if (!cdsCtx) {
  // Defense-in-depth — middleware should have already short-circuited; reaching
  // here implies a routing misconfiguration. Fail-loud (audit) + empty cards.
  await auditCrossTenantBlock(req, 'middleware-bypass');
  return res.json({ cards: [] });
}
const patient = await prisma.patient.findFirst({
  where: {
    fhirPatientId: patientFhirId,
    hospitalId: cdsCtx.hospitalId,  // MANDATORY
    isActive: true,
  },
});
```

### Ordering preserves correctness of cdsHooksSession.create (Phase A inventory #11)

The session record at `cdsHooks.ts:158-167` does:
```ts
hospitalId: patient.hospitalId
```

After mandatory filter:
- Patient lookup is tenant-scoped → `patient.hospitalId === cdsCtx.hospitalId` by construction
- Session record's `hospitalId` is correct by construction (no further code change needed)

This is the inventory #11 fix-by-construction. Mandatory filter at the read site automatically resolves the downstream cross-tenant write at line 163.

### Same pattern applied to `tailrd-discharge-gaps` (cdsHooks.ts:294-300)

Lines 294-296 replaced with the same mandatory filter; line 298-300 patient.findFirst gains the `hospitalId: cdsCtx.hospitalId` clause.

---

## 6. Schema migration scope (per D5)

Single Prisma migration adding 3 unique constraints + 1 index, plus the new `HospitalEhrIssuer` model:

```sql
-- AUDIT-071 + AUDIT-073 schema migration
CREATE TABLE "hospital_ehr_issuers" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "issuerUrl" TEXT NOT NULL,
  "label" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hospital_ehr_issuers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "hospital_ehr_issuers_issuerUrl_key" ON "hospital_ehr_issuers"("issuerUrl");
CREATE INDEX "hospital_ehr_issuers_hospitalId_isActive_idx" ON "hospital_ehr_issuers"("hospitalId", "isActive");

ALTER TABLE "hospital_ehr_issuers"
  ADD CONSTRAINT "hospital_ehr_issuers_hospitalId_fkey"
  FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT;

-- AUDIT-071: Patient.fhirPatientId per-tenant uniqueness (closes B2)
CREATE UNIQUE INDEX "patients_hospitalId_fhirPatientId_key"
  ON "patients"("hospitalId", "fhirPatientId");

-- AUDIT-073: Order.fhirOrderId per-tenant uniqueness
CREATE UNIQUE INDEX "orders_hospitalId_fhirOrderId_key"
  ON "orders"("hospitalId", "fhirOrderId");

-- AUDIT-073: CarePlan.fhirCarePlanId per-tenant uniqueness + missing index
CREATE UNIQUE INDEX "care_plans_hospitalId_fhirCarePlanId_key"
  ON "care_plans"("hospitalId", "fhirCarePlanId");
CREATE INDEX "care_plans_fhirCarePlanId_idx"
  ON "care_plans"("fhirCarePlanId");
```

**Pre-migration check confirmed (Phase A inventory #7):**
- `(hospitalId, fhirPatientId)` duplicates: 0
- `(hospitalId, fhirOrderId)` duplicates: 0
- `(hospitalId, fhirCarePlanId)` duplicates: 0

Migration is safe. Postgres uniqueness on a column where both values are NULL is permissive (multiple NULL rows allowed) — `fhirPatientId` is `String?` so existing rows with NULL fhirPatientId remain valid.

**AUDIT-024 awareness:** No `CONCURRENTLY` keyword used. At pilot-stage row counts the brief SHARE lock is sub-second (per AUDIT-024 register). Standard Prisma migration pattern.

---

## 7. AUDIT-077 §17.3 bundling decision (per D4)

**Decision: do NOT bundle.** Per operator D4 — different surface, different fix-shape. Three sub-fixes in AUDIT-077:
1. `cqlRules.ts:271, 630` role-comparison bug
2. `dataRequests.ts:498` bare-id update
3. `dataRequests.ts:478` webhookEvent.updateMany missing hospitalId

These are routes/services unrelated to the cdsHooks surface. §17.3 scope discipline: ship AUDIT-071 + AUDIT-073 (same fix-shape, same migration); file AUDIT-077 separately as small follow-up PR.

---

## 8. Test plan

Mock-based unit tests per existing codebase pattern (`jest.mock` for prisma + middleware). New test file: `backend/src/middleware/__tests__/cdsHooksAuth.test.ts`.

### Path A (EHR-initiated) — happy path
1. Valid CDS Hooks JWT signed by registered issuer → tenant resolved → req.cdsHooks populated → handler proceeds
2. Patient resolved within same tenant → cards returned
3. cdsHooksSession.create writes correct hospitalId

### Path B (non-EHR per D2) — deny path
4. No `fhirAuthorization.subject` → audit log `CDS_HOOKS_NO_TENANT_RESOLVED` → 200 + empty cards

### Cross-tenant attempt blocked
5. JWT valid, issuer mapped to tenant A, body's fhirPatientId belongs to tenant B → mandatory filter excludes the row → 200 + empty cards
6. Defense-in-depth: even if `prisma.patient.findFirst` somehow returned a different-tenant patient (impossible by query construction but tested for paranoia), audit log `CDS_HOOKS_CROSS_TENANT_ATTEMPT_BLOCKED` fires

### JWT failure modes
7. Invalid signature → 401 + audit `CDS_HOOKS_JWT_VALIDATION_FAILURE`
8. Expired JWT → 401 + same audit
9. Missing `iss` claim → 401 + same audit
10. JWT valid but `iss` not in HospitalEhrIssuer → 200 + empty cards + audit `CDS_HOOKS_UNMAPPED_ISSUER`

### Header-skip closure (Phase A inventory #2)
11. Production NODE_ENV + valid CDS Hooks request WITHOUT `fhirAuthorization` body field — middleware blocks (200 + empty + audit), unlike pre-fix behavior which let the request through

### Schema migration tests
12. Insert duplicate `(hospitalId, fhirPatientId)` → Prisma rejects with unique-constraint violation
13. Insert duplicate `(hospitalId, fhirOrderId)` → rejected
14. Insert duplicate `(hospitalId, fhirCarePlanId)` → rejected
15. Two NULL fhirPatientId rows in same hospital → allowed (Postgres NULL semantics)

### Discovery endpoint exemption
16. `GET /cds-services` returns 200 + service catalog without auth — middleware bypasses for spec-required public endpoint

### Demo mode non-inheritance (Phase A inventory #13)
17. `DEMO_MODE=true` + CDS Hooks invocation without fhirAuthorization → still denied per D2 (NOT given super-admin synthesis from authenticateToken)

**Test count target:** ~17 new tests in `cdsHooksAuth.test.ts` + ~5 existing test deltas in `cdsHooks.test.ts` (new file; covers handler-level mandatory-filter assertion). Total expected: ~22 new tests; jest 464 → 486+ passing.

---

## 9. Observability — audit log integration (per D6)

### HIPAA_GRADE_ACTIONS additions (per AUDIT-076 boundary)

`backend/src/middleware/auditLogger.ts:77-88` `HIPAA_GRADE_ACTIONS` Set extended:

```ts
const HIPAA_GRADE_ACTIONS = new Set<string>([
  // ... existing 10 ...
  // AUDIT-071 mitigation — CDS Hooks tenant isolation events
  'CDS_HOOKS_JWT_VALIDATION_FAILURE',
  'CDS_HOOKS_UNMAPPED_ISSUER',
  'CDS_HOOKS_CROSS_TENANT_ATTEMPT_BLOCKED',
  'CDS_HOOKS_NO_TENANT_RESOLVED',
]);
```

These 4 actions throw on DB-write failure (per AUDIT-013 dual-transport pattern). `CDS_HOOKS_INVOCATION` (every successful or unsuccessful patient-context invocation) remains best-effort — high volume, lower per-event criticality.

### Audit log entry shape

Each entry includes:
- `userId: 'system:cds-hooks'` (no platform user — EHR-initiated)
- `userEmail: 'system@cds-hooks.tailrd-heart.com'`
- `userRole: 'SYSTEM'`
- `hospitalId`: resolved hospital (or null if pre-resolution failure)
- `ipAddress`: from request headers (X-Forwarded-For via existing getClientIp helper)
- `description`: structured one-line summary (`CDS Hooks: unmapped issuer <iss>`, etc.)
- `metadata`: `{ issuerUrl, hookId, fhirPatientId, jti }` for forensic tracing

### Sister-finding closure (AUDIT-076)

Adding 4 actions to HIPAA_GRADE_ACTIONS partially addresses AUDIT-076 (LOW P3). After this PR ships, AUDIT-076 register entry should be updated to reflect the boundary refinement (4 of the suggested promotions land here; remaining gaps documented as v2.0 backlog).

---

## 10. Rollback path

### Feature flag — not needed

The mitigation is fail-closed (default deny non-EHR + non-mapped issuer). Pre-DUA pre-data-flow state means:
- Zero production HospitalEhrIssuer rows exist before this PR ships
- ALL CDS Hooks invocations resolve to "unmapped issuer" → 200 + empty cards
- No production CDS Hooks consumer exists yet (Epic App Orchard integration not live)
- BSW pilot has not flipped CDS Hooks switch

No feature flag required. Production deployment is structurally safe because there's no live CDS Hooks traffic to break.

### Revert path — straight `git revert`

If staging integration testing surfaces a regression (e.g., misconfigured HospitalEhrIssuer breaks Epic sandbox):
1. `git revert <commit-sha>` — clean revert, no migration rollback complications because the schema additions (HospitalEhrIssuer table + 3 unique indexes) are additive-only
2. Schema migration ROLLBACK is optional — dropping the new table + indexes is safe but not required. Pre-revert deploy state vs post-revert deploy state can coexist with the schema additions in place; the absence of code references means the schema additions are inert.

### HospitalEhrIssuer registration runbook (operator-side, ships in this PR)

Authoring `docs/runbooks/AUDIT_071_HOSPITAL_EHR_ISSUER_REGISTRATION.md` covering:
1. Operator workflow for adding a hospital's Epic / Cerner / FHIR-server issuer URL
2. SQL or admin endpoint for `HospitalEhrIssuer` row insertion (TBD; design favors admin endpoint with role-gate, but raw SQL acceptable for v1.0)
3. Verification: post-registration test invocation (Epic sandbox JWT → expected card response)
4. Deactivation procedure (`isActive = false`) for tenant offboarding
5. Audit log query for issuer-registration events

---

## 11. Effort breakdown (running 6-8h estimate)

| Sub-task | Estimate | Notes |
|---|---|---|
| Schema migration authoring + dev apply + integrity verification | 0.5h | Pre-flight duplicate check already done (Phase A) |
| `HospitalEhrIssuer` model + relations + Prisma client regen | 0.5h | Includes Hospital relation update |
| `backend/src/middleware/cdsHooksAuth.ts` authoring | 1.5h | JWT verification + JWKS cache + HospitalEhrIssuer lookup + audit log integration + req.cdsHooks population |
| `cdsHooks.ts` handler updates (3 callsites: 2 patient.findFirst + 1 cdsHooksSession.create defense-in-depth) | 0.5h | Mandatory filter + remove conditional |
| `auditLogger.ts` HIPAA_GRADE_ACTIONS extension + 4 new audit actions | 0.25h | Append to Set + verify call shape |
| Test authoring (`cdsHooksAuth.test.ts` + delta to existing) | 2.0h | ~17 new tests; mock-based pattern |
| `server.ts:189` mount sequence update | 0.1h | Single line edit |
| Operator runbook (`docs/runbooks/AUDIT_071_HOSPITAL_EHR_ISSUER_REGISTRATION.md`) | 0.5h | 5-section operator playbook |
| Register entry updates (AUDIT-071 RESOLVED + AUDIT-073 RESOLVED + AUDIT-076 boundary refinement note) | 0.25h | §18-dated reconciliation per Phase A inventory expansion |
| BUILD_STATE.md updates (§1 + §6.1 + §9 closing prose) | 0.25h | Phase 3 production-readiness gate items table — AUDIT-071 + AUDIT-073 rows removed; AUDIT-076 partial-closure note |
| jest sanity + diff surface + commit/push/PR create | 0.5h | Standard sequence per established pattern |
| Buffer for inventory-surfaced surprises (e.g., `cdsHooksSession.create` dependency) | 0.5-1.0h | Phase A surfaced 4 expansions beyond original 2-callsite framing |
| **Total** | **~6.85-8.85h** | Within revised 6-8h estimate; carries forward to PAUSE 2 |

---

## 12. Operator decisions for PAUSE 2

| Decision | Operator recommendation | Confirm / Override |
|---|---|---|
| D1 — mapping model | Option 1: `HospitalEhrIssuer` 1:N | ☐ |
| D2 — non-EHR JWT fallback | Sub-option 2b: deny (200 + empty cards + audit) | ☐ |
| D3 — error response semantics | 200 + empty cards for context-resolution; 401 for JWT-signature-level only | ☐ |
| D4 — AUDIT-077 §17.3 bundling | Do NOT bundle — separate small follow-up PR | ☐ |
| D5 — schema migration scope | Confirmed: HospitalEhrIssuer + 3 unique constraints + CarePlan fhirCarePlanId index | ☐ |
| D6 — HIPAA_GRADE_ACTIONS promotion | 4 promoted (validation failure / unmapped issuer / cross-tenant blocked / no tenant resolved); CDS_HOOKS_INVOCATION best-effort | ☐ |

---

## 13. Cross-references

- AUDIT-071 register entry: `docs/audit/AUDIT_FINDINGS_REGISTER.md`
- AUDIT-073 (bundled per §17.3): same register file
- AUDIT-076 (partial closure via D6 promotions): same register file
- AUDIT-077 (NOT bundled per D4): same register file
- AUDIT-013 (dual-transport audit logger pattern): `backend/src/middleware/auditLogger.ts`
- AUDIT-011 (multi-tenancy enforcement design): `docs/audit/AUDIT_011_DESIGN.md` (Layer 3 Prisma extension is the structural backstop; this PR is a CDS-Hooks-specific Layer 2 fix)
- AUDIT-024 (Prisma migration CONCURRENTLY pattern): not applicable here (no CONCURRENTLY used)
- HIPAA Security Rule §164.312(a)(1) access control + §164.502 minimum necessary
- HIPAA §164.308(a)(1)(ii)(D) Information System Activity Review (audit log promotions)
- CDS Hooks 2.0 spec: https://cds-hooks.org/specification/current/
- Epic App Orchard CDS Hooks JWT requirements
- Phase A inventory: `chore/phase-0a-phase-3-data-layer-audit` PR #256 + this branch's pre-flight notes

---

*Authored 2026-05-07 in branch `feat/audit-071-cds-hooks-tenant-isolation`. Phase A inventory expansion noted: 3rd vulnerable callsite (cdsHooksSession.create) + production header-skip = AUDIT-071 evidence section gets §18-dated reconciliation revision in the same commit. Severity stays HIGH P1 per §18 register-literal classification.*
