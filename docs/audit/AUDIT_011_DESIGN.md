# AUDIT-011 Design Doc — Tenant Isolation Hardening

**Branch (when implemented):** `fix/audit-011-tenant-isolation`
**Author:** jhart
**Date:** 2026-05-02
**Status:** DESIGN (no code changes yet)
**Companion:** `docs/audit/TIER_S_REMEDIATION_DESIGN.md` (sibling for AUDIT-009/-013/-015)
**Closes:** Tier S finding AUDIT-011, last open Tier S item; reproduces tech debt #5

---

## Purpose

Phase 2A finding **AUDIT-011** flagged that `authorizeHospital` middleware is a silent no-op on routes without a `:hospitalId` URL param, and that it isn't applied to `routes/patients.ts` at all. The original effort estimate was L (16-24h) under the assumption that the patient routes were genuinely unscoped.

**The investigation in §2 below substantially revises that estimate.** A systematic audit of all 29 backend route files (62 PHI-bearing handlers) found **0 RED routes** (no immediate cross-tenant exposure today) and **8 YELLOW routes** (correct today, fragile to refactor). Handler-level scoping via `req.user.hospitalId` in Prisma `where` clauses holds the line across the codebase. The remediation is therefore not "wire enforcement everywhere it's missing" but rather "harden the middleware to fail-loud, fix two specific YELLOW patterns, and add defense-in-depth so the line can't be quietly broken by a future refactor."

**Revised estimate:** M (11.5-15.5h) split across one design + 2 implementation sessions. (See §11.10 for itemized breakdown — the post-design Layer 3 callsite audit added ~3-4h of pre-flag-flip refactor work that wasn't visible until §11 was performed.)

---

## 1. Finding summary (verbatim from register)

> **AUDIT-011** — `authorizeHospital` silent no-op AND not applied to patient routes
> - Severity: HIGH (P1)
> - Location: `backend/src/middleware/auth.ts:128-151`; missing-from `backend/src/routes/patients.ts`
> - Evidence: Middleware silently `next()`s when no `:hospitalId` URL param. Patient routes don't apply the middleware at all. Tenant isolation depends entirely on per-handler `where: { hospitalId: req.user.hospitalId }` discipline.
> - Severity rationale: Two failure modes; with AUDIT-001 0% coverage no detection layer; future route forgetting the filter would silently leak cross-tenant data.
> - Cross-references: Tech debt #5, AUDIT-001

**HIPAA mapping:** §164.312(a)(1) Access Control + §164.308(a)(4) Information Access Management. Cross-tenant data exposure would be a reportable §164.402 breach.

---

## 2. Code surface inventory

### 2.1 The middleware

`backend/src/middleware/auth.ts:128-151`:

```ts
const authorizeHospital = (req, res, next) => {
  if (isDemoMode || req.user?.role === 'SUPER_ADMIN') return next();
  const hospitalId = req.params.hospitalId || req.query.hospitalId as string;
  if (!hospitalId) {
    // No hospitalId requested — continue (the route handler should scope by req.user.hospitalId)
    return next();   // ← silent no-op (the AUDIT-011 finding)
  }
  if (req.user?.hospitalId !== hospitalId) return res.status(403).json(...);
  next();
};
```

The comment at line 137 explicitly acknowledges the silent-no-op design: it relies on handler discipline. That discipline is unwritten and unenforced.

### 2.2 Where the middleware is applied today

| File | Routes with `authorizeHospital` | Routes without |
|---|---|---|
| `routes/clinicalIntelligence.ts` | 3 (the `/summary/:hospitalId` endpoints) | 14 PHI handlers |
| `routes/hospitals.ts` | 3 | — |
| `routes/auditExport.ts` | imported but applied conditionally | — |
| `routes/modules.ts` | imported (TBD on usage) | — |
| `routes/patients.ts` | **imported but never applied** | 8 PHI handlers |

The middleware fires on routes whose path includes `:hospitalId`; everywhere else it's a no-op even when applied.

### 2.3 Tenant-isolation audit results (29 route files, 62 PHI handlers)

| Classification | Count | Definition |
|---|---|---|
| GREEN | 53 | Every Prisma read/write in handler includes `hospitalId: req.user.hospitalId` in `where` |
| YELLOW | 8 | Correct today but fragile (e.g., two-step `findFirst` then `update(where:{id})`) |
| RED | 0 | No hospitalId scoping; cross-tenant access possible |
| N/A | 1 | Intentionally cross-tenant (GodView platform-level analytics, SUPER_ADMIN only) |

The complete audit report is the source of truth; selected high-priority files were:
- `routes/patients.ts` — 8 handlers, 7 GREEN, 1 YELLOW (PUT /:patientId)
- `routes/gaps.ts` — 4 handlers, 3 GREEN, 1 YELLOW (POST /:moduleId/:gapId/action)
- `routes/clinicalIntelligence.ts` — 17 handlers, 15 GREEN, 2 YELLOW (PATCH update endpoints with two-step pattern, both correct)
- `routes/admin.ts` — 11 handlers, all GREEN (SUPER_ADMIN-gated)
- `routes/godView.ts` — 5 handlers, all GREEN (explicit `hospitalId` query-param requirement on global-search)
- `routes/webhooks.ts` — 1 handler, GREEN (Redox payload-derived `hospitalId`, scoped by HMAC auth instead of JWT)
- `routes/dataRequests.ts`, `routes/notifications.ts`, `routes/upload.ts`, `routes/files.ts`, `routes/phenotypes.ts`, `routes/referrals.ts`, `routes/cdsHooks.ts` — all GREEN

### 2.4 The two specific YELLOW patterns worth fixing

#### YELLOW-1: `routes/gaps.ts:157-164` — POST /:moduleId/:gapId/action

```ts
const gap = await prisma.therapyGap.findFirst({
  where: { id: req.params.gapId, hospitalId, patientId },     // scoped ✓
});
if (!gap) return 404;
await prisma.therapyGap.update({
  where: { id: gap.id },                                       // hospitalId missing
  data: { currentStatus: action, ... }
});
```

#### YELLOW-2: `routes/patients.ts:289-300` — PUT /:patientId

```ts
const existing = await prisma.patient.findFirst({
  where: { id: patientId, hospitalId, deletedAt: null },       // scoped ✓
});
if (!existing) return 404;
await prisma.patient.update({
  where: { id: patientId },                                    // hospitalId missing
  data: { ... }
});
```

**Why both are correct today:** The prior `findFirst` resolved an `id` that exists only when `hospitalId` matches; the subsequent `update(where: {id})` mutates that same row. There is no TOCTOU race in Prisma's request-scoped client.

**Why both are fragile:** Any refactor that drops the `findFirst` (e.g., "we already validated, just call update"), or any future code path that calls into the same handler without going through `findFirst`, opens a cross-tenant write. This is the exact "silent leak via forgotten filter" risk AUDIT-011 named.

### 2.5 Existing test coverage

```
$ grep -rn "authorizeHospital\|cross.tenant\|cross-tenant" backend/src/__tests__
# (no matches at the time of this audit)
```

Zero tests for tenant isolation. AUDIT-001 (0% coverage) is the parent finding; this is one of its concrete consequences.

---

## 3. Vulnerability characterization

### 3.1 Is this exploitable today?

**No.** No RED routes were found. A user authenticated as `PHYSICIAN` at Hospital A who attempts `GET /api/patients/<patient-id-in-hospital-B>` receives 404 because the handler's `findFirst({ where: { id, hospitalId: 'A' } })` returns null when the patient belongs to Hospital B.

### 3.2 What's the realized risk surface?

**Refactor risk + lack of detection layer.** The codebase relies on developer discipline to add `hospitalId: req.user.hospitalId` to every PHI Prisma call. There's:

- No middleware-level gate that fires before the handler sees the request
- No Prisma-level extension that injects the filter automatically
- No automated test that proves cross-tenant attempts return 403/404
- No lint rule flagging `prisma.patient.update(where: { id })` without hospitalId

A single forgotten filter in a future PR becomes a silent §164.402 breach.

### 3.3 Concrete scenario (today, post-fix, and post-regression)

| Scenario | Attempt | Today | After fix | After hypothetical regression |
|---|---|---|---|---|
| Cross-tenant read | User-A → GET /api/patients/<patient-id-B> | 404 (handler scope) | 404 (middleware + handler + extension) | 404 (extension) |
| Cross-tenant write via PUT YELLOW pattern | User-A → PUT /api/patients/<id-B> with body | 404 (findFirst scope) | 404 (middleware + Prisma extension) | 404 (extension) |
| Cross-tenant write via SQL injection in body.hospitalId | User-A → POST /api/patients body=`{"hospitalId":"B",...}` | hospitalId overridden by req.user (line 227) | same | same |
| Cross-tenant SUPER_ADMIN access | SuperAdmin → GET /api/patients?hospitalId=B | 200 (intended) | 200 (intended, allow-listed) | 200 |

The fix doesn't change today's behavior for any user; it adds three independent defense layers so the table's "After regression" column stays correct even if a developer forgets a filter.

---

## 4. Remediation approach

### 4.1 Layer 1 — Fix `authorizeHospital` to fail-loud

Replace the silent no-op with an explicit signal that the middleware was misapplied:

```ts
const authorizeHospital = (req, res, next) => {
  if (isDemoMode || req.user?.role === 'SUPER_ADMIN') return next();
  const hospitalId = req.params.hospitalId || req.query.hospitalId as string;
  if (!hospitalId) {
    // Misconfiguration: middleware applied to a route without :hospitalId.
    // This used to silent-no-op; now it returns 500 to surface the bug.
    logger.error('authorizeHospital invoked on route without hospitalId param', {
      path: req.path, method: req.method,
    });
    return res.status(500).json({
      success: false,
      error: 'Server misconfiguration: tenant scope missing.',
      timestamp: new Date().toISOString(),
    });
  }
  if (req.user?.hospitalId !== hospitalId) {
    writeAuditLog(req, 'CROSS_TENANT_DENIED', null, null, ...).catch(() => {});
    return res.status(403).json(...);
  }
  next();
};
```

This change has **zero behavioral impact on production today** because the existing applied-uses (`/risk-scores/summary/:hospitalId` etc.) all have `:hospitalId` in their path, so they never hit the silent-no-op branch. The change activates only if someone applies the middleware on a misconfigured route.

### 4.2 Layer 2 — New middleware `enforceHospitalScope()` for ambient PHI routes

Most PHI routes don't have `:hospitalId` in the URL because the scope is the user's own hospital. For those, `authorizeHospital` is the wrong tool. Introduce a sibling:

```ts
export const enforceHospitalScope = (req, res, next) => {
  if (isDemoMode) return next();
  if (req.user?.role === 'SUPER_ADMIN') return next();   // platform tooling
  if (!req.user?.hospitalId) {
    return res.status(403).json({
      success: false,
      error: 'Authentication missing hospital scope.',
      timestamp: new Date().toISOString(),
    });
  }
  // Attach the canonical scope filter so handlers can opt to use it programmatically.
  (req as any).hospitalScope = { hospitalId: req.user.hospitalId };
  next();
};
```

Apply to every PHI router via `router.use(enforceHospitalScope)` (one line per file). This is semantic documentation: "every handler in this file MUST be scoped to the caller's hospital." It rejects any request without a valid hospital scope before the handler runs.

### 4.3 Layer 3 — Prisma client extension for defense-in-depth

The deepest layer. Add a Prisma `$extends` middleware that, for a defined set of PHI models, requires `hospitalId` in every read/update/delete `where` clause OR throws.

```ts
// backend/src/lib/prismaTenantGuard.ts
const PHI_MODELS_REQUIRING_TENANT = new Set([
  'Patient', 'Encounter', 'Observation', 'Alert', 'TherapyGap',
  'Phenotype', 'RiskScoreAssessment', 'InterventionTracking',
  'ContraindicationAssessment', 'CarePlan', 'DrugTitration',
  'DeviceEligibility', 'CrossReferral', 'AuditLog', 'Notification',
  'PatientDataRequest', 'WebhookEvent', /* + a few more */
]);

const TENANT_GUARD_BYPASS = Symbol('tenantGuardBypass');  // for SUPER_ADMIN tooling

prisma.$use(async (params, next) => {
  if (!PHI_MODELS_REQUIRING_TENANT.has(params.model)) return next(params);
  if (params.action === 'create' || params.action === 'createMany') return next(params);  // create has explicit hospitalId
  if ((params.args as any)?.[TENANT_GUARD_BYPASS]) return next(params);  // explicit bypass

  const where = params.args?.where ?? {};
  const hasHospitalId =
    'hospitalId' in where ||
    (Array.isArray(where.AND) && where.AND.some((c: any) => 'hospitalId' in c));
  if (!hasHospitalId) {
    throw new Error(
      `Tenant guard: ${params.model}.${params.action} called without hospitalId in where clause. ` +
      `This is a security regression. Either include hospitalId or pass [TENANT_GUARD_BYPASS]: true ` +
      `for SUPER_ADMIN tooling.`
    );
  }
  return next(params);
});
```

**Why this is the load-bearing layer:** It makes the YELLOW-1 / YELLOW-2 patterns structurally impossible. If a future PR drops the `findFirst` and calls `update(where: {id})` directly, the extension throws before any DB write. Forgetting the filter becomes a 500 in development, not a silent leak in production.

**Bypass mechanism:** `TENANT_GUARD_BYPASS` symbol passed in args lets SUPER_ADMIN tooling (admin.ts, godView.ts) opt out explicitly. Greppable, audit-able, intentional.

### 4.4 Concrete handler changes

Just two YELLOW spots get explicit handler edits (everything else is structurally protected by Layer 3):

- `gaps.ts:157-164` — add `hospitalId` to `update(where: ...)`
- `patients.ts:299-300` — add `hospitalId` to `update(where: ...)`

Both are 1-line edits.

### 4.5 SUPER_ADMIN cross-tenant access (must preserve)

Three routes legitimately operate across tenants:

- `routes/admin.ts` (SUPER_ADMIN-only platform tooling)
- `routes/godView.ts` (SUPER_ADMIN platform analytics)
- `routes/internalOps.ts` (operator scripts)

For these, either:
- Layer 2 (`enforceHospitalScope`) skips when `req.user.role === 'SUPER_ADMIN'` (already designed in)
- Layer 3 (Prisma extension) accepts the `TENANT_GUARD_BYPASS` symbol for explicit opt-out

The `godView` global-search endpoint already requires explicit `hospitalId` query param (line 142) — that pattern stays.

---

## 5. Risk assessment

| Layer | Production behavioral change | Risk | Mitigation |
|---|---|---|---|
| Layer 1 (fail-loud) | None for current routes (none hit no-op branch) | Future misconfiguration becomes 500 | Acceptable — surfacing bugs |
| Layer 2 (enforceHospitalScope) | Rejects requests with missing `req.user.hospitalId` (currently undefined behavior) | Could 403 a session that previously slipped through with null hospitalId | Audit JWT issuance to confirm hospitalId always set; integration test |
| Layer 3 (Prisma extension) | Throws when PHI Prisma call missing hospitalId | Could throw on a code path we missed; bypass needed for legitimate SUPER_ADMIN ops | Comprehensive unit tests; allowlist mature; ship with `TENANT_GUARD_STRICT` env flag defaulting false initially, flip to true after observation |
| Handler fixes (YELLOW-1, YELLOW-2) | None today (already correct) | Zero — defensive only | None needed |

**Highest-risk: Layer 3.** It's the most behavior-changing because it can throw at runtime if the model allowlist is wrong. Mitigation is the env-flag rollout pattern proven by AUDIT-009 / AUDIT-015.

---

## 6. Rollout plan

Modeled on the AUDIT-015 / AUDIT-009 staged rollout:

### Phase a: Layer 1 + Layer 2 + handler fixes (low-risk batch)

- Implement `authorizeHospital` fail-loud
- Implement `enforceHospitalScope`
- Apply `enforceHospitalScope` to all PHI routers
- Fix YELLOW-1 (`gaps.ts`), YELLOW-2 (`patients.ts`)
- Unit tests for each
- Ship as a single PR; behavioral surface is small (only triggers on previously-undefined-behavior requests)

### Phase a-pre: GAP fixes + Layer 3 readiness refactor (NEW — see §11)

This phase exists because §11's callsite audit surfaced 2 real bugs and 12 fragile patterns that must be cleaned up before Layer 3 can be flag-flipped.

- Fix GAP-1 (`runGapDetectionForPatient.ts:21`) — add hospitalId to patient lookup, switch `findUnique` → `findFirst`
- Fix GAP-2 (`crossReferralService.ts:811`) — add hospitalId parameter to `getReferralById`, update route caller
- Refactor 13 `where: { id }` patterns in services + ingestion + routes to include hospitalId (see §11.5 table; 12 from original audit + 1 found during Phase a-pre line verification at `routes/patients.ts:360`)
- Add `[TENANT_GUARD_BYPASS]: true` to 10 LEGITIMATE_BYPASS callsites (see §11.6 table; 9 from original audit + 1 found during Phase a-pre GAP-2 implementation at `services/crossReferralService.getReferralByIdAcrossTenants` for SUPER_ADMIN cross-tenant referral access)
- Ship as separate PR ahead of Phase b; reviewable in isolation

### Phase b: Layer 3 (Prisma extension, flag-controlled) — **SHIPPED 2026-05-07**

- ✅ Implement `prismaTenantGuard.ts` (473 LOC; `$extends`-based per Step 1)
- ✅ Wire into `lib/prisma.ts` singleton (Layer 3 first, encryption second per design refinement note §8.6 locked order; type-erasure cast per 11th §17.1 architectural-precedent)
- ✅ Gate behind `TENANT_GUARD_MODE` env flag (revised from binary `TENANT_GUARD_STRICT` to three-state `off | audit | strict`; default `audit` for robustness-first soak-mode posture per design refinement note §5)
- ✅ Add allowlist for SUPER_ADMIN tooling — 9 system-bypass models (ErrorLog / FailedFhirBundle / PerformanceMetric / PerformanceRequestLog / BusinessMetric / LoginSession / InviteToken / Onboarding / UserActivity) + 14 production callsite bypass markers (11 Phase a-pre existing + 3 FeatureUsage analytics-read added per PAUSE 2.7 (b) refinement)
- ✅ Comprehensive unit tests — `backend/src/lib/__tests__/prismaTenantGuard.test.ts` (380 LOC; 14 tests across 6 groups: detection branches / bypass marker / allow-list / action discipline / 3-state flag matrix / module-init validation)
- ✅ Ship as separate PR — implementation lands on main via this PR (commit pending)
- Deployment lifecycle: deploy with `TENANT_GUARD_MODE=audit` (default; soak collection mode) → 14-day soak window observation → flip to `TENANT_GUARD_MODE=strict` (Phase d trigger; operator-side env flip + ECS task restart; no code revert needed)

### Phase c: Cross-tenant integration test suite — **SHIPPED 2026-05-07**

- ✅ 79-test gated integration suite — `backend/tests/integration/audit-011-cross-tenant.test.ts` (635 LOC; sister to AUDIT-016 PR 2 + AUDIT-071 schema-constraint integration scaffold pattern)
- ✅ 8 test groups (per design refinement note §9.3): I — Allow-list model coverage (33 tests; ALL HIPAA_GRADE_TENANT_MODELS) / II — Bypass marker honored (6) / III — System-bypass models (6; false-positive prevention) / IV — 3-state flag matrix (9) / V — Where-clause detection (6; incl. real production query shapes) / VI — Edge cases + regression (12; concurrency / $transaction / bulk / connection pool) / VII — Soak-mode operational readiness (4; Phase d GO/NO-GO confidence gate) / VIII — Cleanup & isolation discipline (3)
- ✅ Run as part of operator-side Phase d GO/NO-GO gate — `RUN_INTEGRATION_TESTS=1 npx jest audit-011-cross-tenant` against soak DB before strict-mode flip
- ✅ Closes AUDIT-001 (0% coverage) for the tenant-isolation slice specifically — 14 unit tests (default-suite) + 79 integration tests (gated; opt-in) = 93 net new tests for AUDIT-011 Phase b/c

### Phase d: Remove flag once stable — PENDING (post-soak operator-side PR)

**Phase d strict-mode flip deferred to post-14-day-soak operator-side PR per design §6.** Trigger: zero `TENANT_GUARD_VIOLATION` events captured during 14-day audit-mode soak across all 33 allow-list models (verified via `audit_logs WHERE action = 'TENANT_GUARD_VIOLATION'` query; sister to Group VII.3 queryability test). Operator-side PR flips `TENANT_GUARD_MODE=audit → strict` via env var; no code revert needed (single-line ECS task definition update).

**Phase d GO/NO-GO confidence gate:** the 79-test gated integration suite (`audit-011-cross-tenant.test.ts`) IS the gate. Operator runs the suite against soak-mode DB before flipping; pass = green-light to flip; any failure = root-cause and re-soak.

After 14-day clean window, remove the env-var read entirely + inline `mode = 'strict'` constant (single-line PR cleanup); sister-discipline to AUDIT-009 / AUDIT-015 staged-rollout-then-flag-removal pattern.

---

## 7. Test plan

### Unit tests (Phase a)

- `authorizeHospital` allow same-tenant
- `authorizeHospital` reject cross-tenant (403 + audit log)
- `authorizeHospital` allow SUPER_ADMIN cross-tenant
- `authorizeHospital` 500 when applied without `:hospitalId` param (regression test for Layer 1 fail-loud)
- `enforceHospitalScope` allow when `req.user.hospitalId` set
- `enforceHospitalScope` reject when `req.user.hospitalId` null
- `enforceHospitalScope` allow SUPER_ADMIN

### Unit tests (Phase b — Prisma extension)

- PHI model + missing hospitalId in where → throw with descriptive error
- PHI model + hospitalId in where → pass
- Non-PHI model + missing hospitalId → pass (no enforcement)
- PHI model + `TENANT_GUARD_BYPASS` symbol → pass
- AND-array compound where with hospitalId in one branch → detected
- `create` action → pass (explicit hospitalId on data)

### Integration tests (Phase c)

For every PHI route in the audit table:

- Forge JWT with `hospitalId=A`, attempt cross-tenant operation against `hospitalId=B` resource → expect 403 or 404
- Same JWT, same-tenant operation → expect 200
- SUPER_ADMIN JWT, cross-tenant → expect 200

Estimated 60-80 integration tests; one factory function generates them from the audit table.

### Smoke test after deploy

Live login from `JHart@tailrd-heart.com` → `GET /api/patients` → confirm 200 + non-empty list. Then forge a different-hospital JWT (test fixture from staging) → `GET /api/patients/<id-from-other-hospital>` → confirm 403/404.

---

## 8. Effort estimate

| Phase | Effort |
|---|---|
| Phase a (middleware + handler fixes + unit tests) | 3-4h |
| Phase a-pre (GAP fixes + REFACTOR + bypass markers — discovered in §11) | 3-4h |
| Phase b (Prisma extension + flag rollout + unit tests) | 3-4h |
| Phase c (integration test suite) | 2-3h |
| Phase d (flag removal) | 0.5h after soak |
| **Total** | **11.5-15.5h, split across 2-3 sessions** |

This is still a meaningful revision from the original L (16-24h) estimate. The reduction comes from §2's audit finding that handler-level scoping is already in place; we're adding defense-in-depth, not retrofitting basic scoping. **§11 added ~3-4h** of pre-flag-flip refactor work (12 REFACTOR sites + 2 GAP bug fixes + 9 bypass markers) that wasn't visible until the Layer 3 callsite audit was performed.

---

## 9. Dependencies + open questions

### Dependencies

- **None blocking.** AUDIT-013 (audit log durability) is already RESOLVED, so the `CROSS_TENANT_DENIED` audit log entry will land durably in CloudWatch.
- AUDIT-015 (decrypt fail-loud) is RESOLVED, so PHI is encryption-at-rest compliant.
- AUDIT-009 (MFA flag-off) doesn't block; runs in parallel.

### Open questions (RESOLVED via §11 inventory)

1. **Q:** Are there any code paths that legitimately call `prisma.patient.<op>` without `req.user.hospitalId` available (e.g., background cron, webhook ingest)?
   **A:** RESOLVED. §11 confirms 9 LEGITIMATE_BYPASS callsites: 8 in `webhookPipeline.ts` (Redox ingest with HMAC-validated payload-derived hospitalId), 1 in `auditLogger.ts:163` (nullable hospitalId for unauthenticated audit events).

2. **Q:** Does `routes/internalOps.ts` need the bypass symbol?
   **A:** RESOLVED. §11 audit found no PHI Prisma calls in `internalOps.ts` — it's an admin-tooling-only surface that doesn't directly touch PHI models.

3. **Q:** Should AUDIT-014 (patient search broken on encrypted PHI) be addressed alongside? Both touch `routes/patients.ts`.
   **A:** RESOLVED. No — AUDIT-014 is a search/UX issue, AUDIT-011 is access control. Separate concerns, separate PRs.

4. **Q:** Will the Prisma extension affect Aurora performance?
   **A:** RESOLVED. Negligible. The extension is in-process, runs once per query, does an `'hospitalId' in where` object check (O(1)). No extra DB round-trips.

5. **Q:** AUDIT-022 (243 legacy JSON PHI rows) — should backfill happen first?
   **A:** RESOLVED. No, independent. JSON PHI is at-rest issue; AUDIT-011 is access-control issue. No interaction.

### New questions surfaced by §11

6. **Q:** GAP-1 fix changes `findUnique` to `findFirst`. Any caller that relies on the unique-constraint guarantees of findUnique?
   **A:** Need to verify in implementation. The semantic difference: `findUnique` requires a unique key, `findFirst` accepts any where clause. Composite uniqueness on `(id)` is preserved by either since `id` is still unique; this is a no-behavior-change refactor.

7. **Q:** Should the Layer 3 design be relaxed to allow `where: { id }` patterns when the model has a unique `id`? (i.e., trust UUID entropy as a defense)
   **A:** No. The whole point of Layer 3 is defense-in-depth. UUIDs are high-entropy but not infinite, and the YELLOW patterns are exactly the regression vector AUDIT-011 is designed to prevent. Keep the strict semantics; refactor the 12 callsites instead.

8. **Q:** GAP-2 fix requires changing `getReferralById(referralId)` signature to `getReferralById(referralId, hospitalId)`. How many callers?
   **A:** Need to verify in implementation. Likely 1-2 (route handler at `referrals.ts:285-302` is the only known caller per the audit table).

---

## 10. Success criteria

- [ ] `authorizeHospital` no longer silent-no-ops; returns 500 if applied without `:hospitalId` param
- [ ] `enforceHospitalScope` applied to all 14 PHI router files
- [ ] YELLOW-1 (`gaps.ts:157-164`) fixed — hospitalId in update where clause
- [ ] YELLOW-2 (`patients.ts:299-300`) fixed — hospitalId in update where clause
- [ ] Prisma tenant guard active in production with `TENANT_GUARD_STRICT=true`
- [ ] Cross-tenant integration test suite green in CI
- [ ] All 62 PHI handlers covered by at least one cross-tenant test
- [ ] Production stable for 14 days with strict mode on
- [ ] AUDIT-011 register entry → RESOLVED
- [ ] Tier S verdict eligibility → 4 of 4 RESOLVED (PASS upgrade unblocked)

---

## 11. Layer 3 callsite inventory (deployment-readiness audit)

Investigation discipline: before flag-flipping `TENANT_GUARD_STRICT=true`, every Prisma callsite on a PHI model in production code must be classified. This mirrors the AUDIT-015 backfill discipline — audit the surface, fix the gaps, mark the legitimate bypasses, then flip.

### 11.1 Methodology

Enumerated all callsites on PHI models (`Patient`, `Observation`, `Alert`, `Phenotype`, `TherapyGap`, `DrugTitration`, `InterventionTracking`, `RiskScoreAssessment`, `ContraindicationAssessment`, `AuditLog`, `PatientDataRequest`, `Encounter`, `Notification`, `CarePlan`, `DeviceEligibility`, `CrossReferral`, `WebhookEvent`, `CdsHooksSession`, `CQLResult`) outside of `backend/src/routes/*.ts`. Categories: route handlers (already audited in §2.3, see audit table), services, ingestion, middleware, jobs, scripts.

Total non-route PHI callsites: **47** distinct query sites across 21 files.

### 11.2 Layer 3 PASS criteria (strict)

Under Layer 3 as designed, a query PASSES if:
- It's a `create` / `createMany` (exempt; explicit hospitalId in `data`)
- Its `where` clause includes `hospitalId` directly OR an AND-array branch with `hospitalId`
- Its `where` clause uses a Prisma composite unique key that includes `hospitalId` (e.g., `hospitalId_mrn`, `hospitalId_fhirObservationId`, `hospitalId_fhirEncounterId`)
- It's marked with `[TENANT_GUARD_BYPASS]: true` (LEGITIMATE_BYPASS)

A query THROWS under strict Layer 3 if:
- It's a `findUnique`/`findFirst`/`findMany`/`update`/`updateMany`/`delete`/`deleteMany`/`count`/`aggregate`/`groupBy` on a PHI model
- AND its `where` clause lacks both `hospitalId` and a `hospitalId_*` composite key
- AND it's not marked with the bypass symbol

### 11.3 Classification breakdown

| Category | Count | Description |
|---|---|---|
| **PASS** (explicit hospitalId or composite key) | 28 | Already strict-mode-ready |
| **REFACTOR** (where: { id } pattern needs hospitalId added) | 13 | Correct today via caller validation; needs explicit hospitalId for Layer 3. Includes 1 site discovered during Phase a-pre line-number verification (see §11.5). |
| **LEGITIMATE_BYPASS** (system-internal, payload-resolved scope) | 11 | Webhook ingest (9) + audit logging (1) + SUPER_ADMIN cross-tenant access (2: referral + phenotype). Added during Phase a-pre execution as role-based bypass paths surfaced — see §11.4.1, §11.4.2. |
| **GAP** (real bug; cross-tenant exposure today) | 2 | Must fix before Layer 3 ships |
| **EXEMPT** (archived / dev script, not production runtime) | 6 | `services/_archived/*`, `scripts/ingestSynthea.ts` |
| **Total** | **60** | (some files have multiple callsites) |

### 11.4 GAP findings — must fix before Layer 3

#### GAP-1: `backend/src/ingestion/runGapDetectionForPatient.ts:21`

```ts
// Function signature: (patientId, hospitalId) — receives both
const patient = await prisma.patient.findUnique({
  where: { id: patientId },     // ← hospitalId in scope but not in where
  include: { conditions: true, medications: {...}, observations: {...} },
});
```

**Why this is a real bug today:** The function receives `hospitalId` as parameter (line 16) but doesn't use it in the patient lookup. Any caller passing a patientId from Hospital B with a hospitalId of Hospital A would load Hospital B's patient + medications + observations (all PHI) into memory. The downstream `if (!patient || !patient.isActive)` check (line 30) would proceed to gap-detection logic on the wrong patient's data. The webhook caller (`webhookPipeline.ts`) is the realistic exposure path.

**Fix:** Either (a) add `hospitalId` to the where clause: `where: { id: patientId, hospitalId }` — but `id` alone is the unique key, so this becomes `findFirst` not `findUnique`; or (b) post-fetch assertion: `if (patient && patient.hospitalId !== hospitalId) throw new Error('cross-tenant access')`. **Recommend (a)** with `findFirst` for fail-loud behavior.

#### GAP-2: `backend/src/services/crossReferralService.ts:811`

```ts
async getReferralById(referralId: string): Promise<any | null> {
  return await this.prisma.crossReferral.findUnique({
    where: { id: referralId }      // ← no hospitalId, no parameter for it
  });
}
```

**Why this is a real bug today:** The route handler `referrals.ts:285-302` calls this method then validates `req.user?.hospitalId !== referral.hospitalId` post-fetch. The cross-tenant referral PHI hits the application layer before the validation runs. The validation prevents the HTTP response from leaking, but in-memory exposure is real (and would be visible in any error/exception path that captures the loaded data).

**Fix:** Add `hospitalId` parameter to `getReferralById(referralId, hospitalId)` and include in where clause: `findFirst({ where: { id: referralId, hospitalId } })`. Update the route caller.

**Architectural decision (2026-05-02):** Phase a-pre execution surfaced that `routes/referrals.ts:296` has a SUPER_ADMIN cross-tenant access path. Naive `getReferralById(referralId, req.user.hospitalId)` would regress this — SUPER_ADMIN would no longer see referrals from any other hospital. Resolved by introducing a second service method `getReferralByIdAcrossTenants` with `TENANT_GUARD_BYPASS` marker, dispatched from the route based on `req.user.role`. Adds 1 LEGITIMATE_BYPASS site (now 10 total).

### 11.4.1 Phase a-pre execution addendum (2026-05-02)

During Phase a-pre line-number verification, 1 additional REFACTOR site was discovered: `routes/patients.ts:360` (DELETE handler soft-delete). Same fragile pattern as YELLOW-2 line 299 (PUT update). Folded into the Phase a-pre PR per the robust/no-tech-debt principle — deferring would leave a known site for Layer 3 to catch later.

During Phase a-pre GAP-2 implementation, 1 additional LEGITIMATE_BYPASS site was discovered: `services/crossReferralService.getReferralByIdAcrossTenants` (new method) for SUPER_ADMIN cross-tenant referral access. Route handler `routes/referrals.ts:285-302` dispatches based on `req.user.role`.

This is reflected in §11.3 (REFACTOR 12 → 13, BYPASS 9 → 10, total 57 → 59) and §11.5 (13th row added) + §11.6 (10th row added).

### 11.4.2 Phase a-pre lessons learned (2026-05-02)

**Design audit gap surfaced:** Original §11 audit checked service-layer Prisma callsites for cross-tenant patterns but did not check route handlers for role-based bypass paths (e.g., `req.user.role === 'SUPER_ADMIN'` post-fetch validation). The crossReferralService GAP-2 fix surfaced that `routes/referrals.ts` has SUPER_ADMIN cross-tenant access via post-fetch role check; naive scoping would have regressed it.

**Future Layer 3 readiness audits should:**
1. Grep route handlers for role-based bypass patterns: `req.user.role === 'SUPER_ADMIN'`, `isSuperAdmin`, allow-listed roles
2. Trace what cross-tenant access each enables (read or write?)
3. Plan corresponding `*AcrossTenants` service methods OR explicit bypass-symbol callsites in advance, not as discoveries during implementation

### 11.5 REFACTOR list — `where: { id }` patterns needing hospitalId added

Each is correct today (caller-validated ownership) but Layer 3 throws. Trivial 1-line edit per site: add `hospitalId` to the where clause where the function already has it in scope.

| File | Line | Operation | Notes |
|---|---|---|---|
| `ingestion/gapDetectionRunner.ts` | 144 | `prisma.therapyGap.update({ where: { id }, ... })` | hospitalId is in scope (line 47); add to where |
| `ingestion/runGapDetectionForPatient.ts` | 90 | `prisma.therapyGap.update({ where: { id }, ... })` | hospitalId is parameter; add to where |
| `services/crossReferralService.ts` | 402 | `crossReferral.update({ where: { id }, ... })` | Caller has hospitalId; thread through |
| `services/crossReferralService.ts` | 542 | `patient.findUnique({ where: { id: patientId }, include: { hospital } })` | Service has hospitalId in caller context |
| `services/crossReferralService.ts` | 583 | `crossReferral.findFirst({ where: { patientId, ... } })` | No hospitalId; add it |
| `services/ddiService.ts` | 116 | `patient.findUnique({ where: { id: patientId }, include: { medications } })` | Caller has hospitalId; thread through |
| `services/phenotypeService.ts` | 491 | `patient.findUnique({ where: { id: patientId }, include: {...} })` | Service has hospitalId; thread through |
| `services/phenotypeService.ts` | 542 | `phenotype.findUnique({ where: { id: phenotypeId } })` | Caller has hospitalId; thread through |
| `services/phenotypeService.ts` | 579 | `phenotype.findMany({ where: { patientId }, ... })` | Service has hospitalId; add it |
| `services/phenotypeService.ts` | 603 | `phenotype.update({ where: { id: phenotypeId }, ... })` | Service has hospitalId; thread through |
| `routes/patients.ts` | 299 | `patient.update({ where: { id }, ... })` | YELLOW-2 from §2.4 (PUT handler) |
| `routes/patients.ts` | 360 | `patient.update({ where: { id }, ... })` (soft-delete) | YELLOW-3 — same fragile pattern as YELLOW-2, in the DELETE handler. Discovered during Phase a-pre line-number verification (2026-05-02); see §11.4.1. |
| `routes/gaps.ts` | 157 | `therapyGap.update({ where: { id }, ... })` | YELLOW-1 from §2.4 (note: actual line is 157, not 161 as originally written; cosmetic drift) |

**Total: 13 callsites. Effort: ~30 minutes mechanical edits + ~1h test updates.**

### 11.6 LEGITIMATE_BYPASS list — bypass symbol applies

These are intentional cross-tenant or system-internal operations. Apply `[TENANT_GUARD_BYPASS]: true` in the Prisma args.

| File | Lines | Rationale |
|---|---|---|
| `middleware/auditLogger.ts` | 163 | `AuditLog.create` with nullable hospitalId for unauthenticated audit events (failed-login attempts, etc.). System-level audit trail, not user-scoped. |
| `services/webhookPipeline.ts` | 43, 72, 79, 96, 108, 117, 133, 152, 182 | `WebhookEvent` is the idempotency/retry queue for inbound Redox FHIR ingest. Scope is derived from the HMAC-validated payload, not user JWT. The eventId composite includes hospitalId at line 32 of write, so reads by `eventId` are implicitly scoped. Layer 3 should accept these explicitly via bypass. |
| `services/crossReferralService.ts` | new method `getReferralByIdAcrossTenants` | SUPER_ADMIN cross-tenant referral access. Gated by route-level `req.user.role === 'SUPER_ADMIN'` check in `routes/referrals.ts`. Surfaced during Phase a-pre GAP-2 implementation; design audit missed role-based bypass paths in route handlers (see §11.4.2). |
| `services/phenotypeService.ts` | new method `getPhenotypeByIdAcrossTenants` | SUPER_ADMIN cross-tenant phenotype access. Gated by route-level `req.user.role === 'SUPER_ADMIN'` check in `routes/phenotypes.ts` (PUT /:id/confirm). Same pattern as crossReferralService — surfaced during Phase a-pre Step 100.5c implementation when `getPhenotypeById` signature change forced the SUPER_ADMIN regression analysis. Confirms §11.4.2 lesson that role-based bypass paths recur across route handlers. |

**Total: 11 callsites with bypass symbol** (9 from original audit + 2 SUPER_ADMIN cross-tenant service methods discovered during Phase a-pre).

### 11.7 EXEMPT (not loaded in production runtime)

| File | Status |
|---|---|
| `backend/src/services/_archived/*` (4 files, ~10 callsites) | Archived — not imported by `server.ts`, not loaded at runtime |
| `backend/src/scripts/ingestSynthea.ts` | Operator CLI tool; runs as one-off Fargate task with explicit hospitalId env var |
| `backend/src/redox/batchGapDetection.ts:53` | Commented-out (per inspection) |

### 11.8 Cron jobs touching PHI (verified scoped)

| Cron schedule | Job | PHI scope |
|---|---|---|
| `0 12 * * *` (daily 12:00 UTC) | `calculateQualityMeasures(hospitalId)` | Iterates per-hospital, scoped per call |
| `0 13 * * 1` (weekly Mon 13:00 UTC) | `sendWeeklySummaryForAllHospitals()` | Iterates hospitals, scoped per call |
| `0 9 * * *` (daily 09:00 UTC) | `runDailyDigestForAllHospitals()` | Iterates hospitals, scoped per call |
| `0 2 * * *` (daily 02:00 UTC) | `batchGapDetection` | **CURRENTLY COMMENTED OUT.** When activated, must iterate per-hospital. |

All scoped or dormant. No additional risk.

### 11.9 Revised rollout plan based on inventory

The original §6 rollout plan added a pre-flag-flip step:

**Phase a-pre (NEW, must complete before Phase b can flag-flip):**
- Fix GAP-1 (`runGapDetectionForPatient.ts:21`) — add hospitalId to where clause
- Fix GAP-2 (`crossReferralService.ts:811`) — add hospitalId parameter + where clause
- Refactor 12 REFACTOR callsites to include hospitalId in where clause
- Add `[TENANT_GUARD_BYPASS]: true` to 9 LEGITIMATE_BYPASS callsites

**Phases a/b/c/d remain as in §6.**

### 11.10 Revised effort estimate

| Phase | Original | Revised |
|---|---|---|
| Phase a (middleware + handler fixes) | 3-4h | 3-4h (unchanged) |
| Phase a-pre (NEW: GAP fixes + REFACTOR + bypass markers) | — | **3-4h** |
| Phase b (Prisma extension + flag rollout) | 3-4h | 3-4h (unchanged) |
| Phase c (integration test suite) | 2-3h | 2-3h (unchanged) |
| Phase d (flag removal) | 0.5h | 0.5h |
| **Total** | 8.5-11.5h | **11.5-15.5h** |

Still under the original AUDIT-011 estimate of L (16-24h), but ~3-4h longer than the §8 design's first-pass estimate.

---

## 12. Cross-references

- Original finding: `docs/audit/AUDIT_FINDINGS_REGISTER.md` AUDIT-011
- Sibling design: `docs/audit/TIER_S_REMEDIATION_DESIGN.md` (AUDIT-009/-013/-015 patterns)
- Phase 2 verdict path: `docs/audit/PHASE_2_REPORT.md` §6-7
- Tech debt #5: predecessor finding referenced in register
- Test coverage parent: AUDIT-001 (0% coverage; this design partially closes via Phase c integration suite)
- Sibling backfill discipline: `docs/CHANGE_RECORD_2026_04_29_audit_015_remediation.md` (audit-before-flag-flip pattern reused here)
