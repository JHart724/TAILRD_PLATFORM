# TAILRD Heart Platform — Phase 4 Backlog

**Created:** 2026-04-10
**Baseline:** `tailrd-backend:26` (Sprint A complete)
**Source:** Built from live codebase audit, `docs/PHASE_4_READINESS_AUDIT.md`, and git history through commit `f51dcae`.
**Scope:** Everything required to take the platform from "production live, mock clinical UI" to "production live, real patient data rendered end-to-end, Epic-submittable."

---

## 0. Sprint A — COMPLETE (td:26)

Sprint A closed out the infrastructure and EHR-integration blockers that stood between the April 8 production deploy (`td:20`) and an Epic-submittable, restart-safe backend.

| # | Item | Evidence | Status |
|---|------|----------|--------|
| A-1 | Rate limiting moved to Redis via shared `lib/redis.ts` singleton | `fbb5bd8 fix(INFRA): Redis-backed rate limiting` (PR #92) | DONE |
| A-2 | Dynamic `require` for `rate-limit-redis` to prevent cold-start ESM crash | `7d73af0 fix(INFRA): dynamic require for rate-limit-redis` (PR #93) | DONE |
| A-3 | `jose` ESM crash fix + `/api/health` route alias | `4fc0ba3 fix(CRITICAL): jose ESM crash fix` (PR #94) | DONE |
| A-4 | CDS Hooks JWT verification via JWKS (Epic App Orchard unblock) | `790952a feat(EHR): CDS Hooks JWT verification via JWKS` (PR #91). Confirmed in code: `backend/src/routes/cdsHooks.ts:37` dynamically imports `createRemoteJWKSet`, `jwtVerify` from `jose`. | DONE |
| A-5 | Update "last known working task def" marker to `td:26` | `f51dcae chore: update last known working task def to 26` | DONE |

**Production smoke (2026-04-10):**
- `GET /health` → `healthy`
- `POST /api/auth/login` (admin@stmarys.org) → `success: true`
- `GET /cds-services` → 3 services advertised
- Running task def: `tailrd-backend:26`

**What Sprint A did NOT do:** wire the clinical UI to the real backend, expand FHIR resource coverage beyond the 9 handlers, or write functional gap-rule tests. Those are Sprint B.

---

## 1. Sprint B — Clinical UI Wiring, FHIR Expansion, Epic Submission, Gap Rule Tests

Sprint B is the "make the product real" sprint. Target duration: 2 weeks. Exit criteria: a CMO logging in at `app.tailrd-heart.com` sees their own patient population, not mock data.

### B-1 — Frontend wiring (mock data → real API)

**Audit results (run 2026-04-10 against `main`):**

`grep "const (mock|MOCK|sample|SAMPLE|demo|DEMO|fake|FAKE|dummy)[A-Za-z]*\s*[:=]" src --include="*.tsx" --include="*.ts"`

returned **20 files** with named mock constants, plus the 89-file hardcoded-patient-name inventory from `PHASE_4_READINESS_AUDIT.md`. The wiring targets below are the *authoritative Sprint B list* — everything else is Sprint C tail.

#### B-1 wiring targets (ordered by blast radius)

| # | File | Mock kind | Target endpoint (verified in `backend/src/routes`) | Effort |
|---|------|-----------|----------------------------------------------------|--------|
| 1 | `src/ui/heartFailure/views/CareTeamView.tsx` | patient roster, gap list | `GET /api/patients?module=hf` + `GET /api/gaps/:hospitalId?module=heart-failure` | S |
| 2 | `src/ui/electrophysiology/views/EPCareTeamView.tsx` | patient roster | `GET /api/patients?module=ep` + `GET /api/gaps/:hospitalId?module=electrophysiology` | S |
| 3 | `src/ui/structuralHeart/views/StructuralCareTeamView.tsx` | patient roster | `GET /api/patients?module=sh` + `GET /api/gaps/:hospitalId?module=structural-heart` | S |
| 4 | `src/ui/coronaryIntervention/views/CoronaryCareTeamView.tsx` | patient roster | `GET /api/patients?module=cad` + `GET /api/gaps/:hospitalId?module=coronary-intervention` | S |
| 5 | `src/ui/valvularDisease/views/ValvularCareTeamView.tsx` | patient roster | `GET /api/patients?module=vd` + `GET /api/gaps/:hospitalId?module=valvular-disease` | S |
| 6 | `src/ui/peripheralVascular/views/PeripheralCareTeamView.tsx` | patient roster | `GET /api/patients?module=pv` + `GET /api/gaps/:hospitalId?module=peripheral-vascular` | S |
| 7 | `src/ui/heartFailure/views/ExecutiveView.tsx` | KPI cards, trend charts | `GET /api/analytics/dashboard?module=heart-failure` | M |
| 8 | `src/ui/electrophysiology/views/EPExecutiveView.tsx` | KPIs | `GET /api/analytics/dashboard?module=electrophysiology` | M |
| 9 | `src/ui/structuralHeart/views/StructuralExecutiveView.tsx` | KPIs | `GET /api/analytics/dashboard?module=structural-heart` | M |
| 10 | `src/ui/coronaryIntervention/views/CoronaryExecutiveView.tsx` | KPIs | `GET /api/analytics/dashboard?module=coronary-intervention` | M |
| 11 | `src/ui/valvularDisease/views/ValvularExecutiveView.tsx` | KPIs | `GET /api/analytics/dashboard?module=valvular-disease` | M |
| 12 | `src/ui/peripheralVascular/views/PeripheralExecutiveView.tsx` | KPIs | `GET /api/analytics/dashboard?module=peripheral-vascular` | M |
| 13 | `src/ui/heartFailure/views/ServiceLineView.tsx` | gap tables, trends | `GET /api/gaps/:hospitalId?module=heart-failure&detail=service-line` | M |
| 14 | `src/ui/electrophysiology/views/EPServiceLineView.tsx` | gap tables | `GET /api/gaps/:hospitalId?module=electrophysiology&detail=service-line` | M |
| 15 | `src/ui/structuralHeart/views/StructuralServiceLineView.tsx` | gap tables | `GET /api/gaps/:hospitalId?module=structural-heart&detail=service-line` | M |
| 16 | `src/ui/coronaryIntervention/views/CoronaryServiceLineView.tsx` | gap tables | `GET /api/gaps/:hospitalId?module=coronary-intervention&detail=service-line` | M |
| 17 | `src/ui/valvularDisease/views/ValvularServiceLineView.tsx` | gap tables | `GET /api/gaps/:hospitalId?module=valvular-disease&detail=service-line` | M |
| 18 | `src/ui/peripheralVascular/views/PeripheralServiceLineView.tsx` | gap tables | `GET /api/gaps/:hospitalId?module=peripheral-vascular&detail=service-line` | M |
| 19 | `src/components/notifications/NotificationPanel.tsx` | inline alerts | `GET /api/notifications?hospitalId=X` (new route required — see Sprint B-1a) | M |
| 20 | `src/components/notifications/notificationMockData.ts` | dedicated mock file | DELETE after (19) is wired | S |
| 21 | `src/ui/admin/tabs/PlatformOverview.tsx` | activity feed | `GET /api/admin/analytics` | M |
| 22 | `src/ui/admin/tabs/UsersManagement.tsx` | login/action history | `GET /api/admin/users/:id/activity` (new route required) | M |
| 23 | `src/components/therapyGap/TherapyGapDashboard.tsx` | gap list | `GET /api/gaps/:hospitalId` | M |
| 24 | `src/components/therapyGap/DeviceUnderutilizationPanel.tsx` | device list | `GET /api/gaps/:hospitalId?type=device-underutilization` | S |
| 25 | `src/components/therapyGap/GDMTOptimizationTracker.tsx` | patient titrations | `GET /api/drug-titrations/:patientId` (exists) | S |
| 26 | `src/components/populationHealth/PopulationOverviewDashboard.tsx` | cohort counts | `GET /api/analytics/dashboard` | M |
| 27 | `src/components/populationHealth/PatientRiskStratification.tsx` | risk buckets | `GET /api/analytics/dashboard?metric=risk-stratification` | M |
| 28 | `src/components/phenotypeDetection/PhenotypeDetailModal.tsx` | phenotype detail | `POST /api/phenotype/analyze` | M |
| 29 | `src/components/crossReferral/CrossReferralEngine.tsx` | referral list | `GET /api/cross-referral` (verify route) | M |
| 30 | `src/components/reporting/QualityReportGenerator.tsx` | report rows | `GET /api/analytics/:hospitalId` | M |
| 31 | `src/components/shared/ClinicalContextPanel.tsx` | context snippets | `GET /api/patients/:patientId` | S |
| 32 | `src/components/shared/PatientTimeline.tsx` | timeline entries | `GET /api/patients/:patientId/encounters` | S |
| 33 | `src/components/shared/ModuleNavigator.tsx` | module list | `GET /api/modules` (verify — `apiService.getModules()` exists client-side) | S |
| 34 | `src/ui/coronaryIntervention/components/CoronarySafetyScreening.tsx` | screening list | `GET /api/contraindications/:patientId` | S |
| 35 | `src/ui/coronaryIntervention/components/care-team/CoronaryWorklist.tsx` | worklist | `GET /api/gaps/:hospitalId?module=coronary-intervention` | S |
| 36 | `src/ui/electrophysiology/components/AnticoagulationSafetyChecker.tsx` | checker rows | `POST /api/electrophysiology/anticoagulation-decision` | S |
| 37 | `src/ui/electrophysiology/components/care-team/EPAlertDashboard.tsx` | alerts | `GET /api/patients/:patientId/alerts` | S |
| 38 | `src/ui/electrophysiology/components/care-team/EPWorklist.tsx` | worklist | `GET /api/gaps/:hospitalId?module=electrophysiology` | S |
| 39 | `src/ui/heartFailure/components/clinical/GDMTContraindicationChecker.tsx` | contra list | `GET /api/contraindications/:patientId` | S |
| 40 | `src/ui/heartFailure/config/careTeamConfig.tsx` | demo roster | `GET /api/heart-failure/patients` (exists in `apiService.getHeartFailurePatients`) | S |
| 41 | `src/ui/peripheralVascular/components/care-team/PeripheralWorklist.tsx` | worklist | `GET /api/gaps/:hospitalId?module=peripheral-vascular` | S |
| 42 | `src/data/claimsData.ts` | static claims | DELETE if unused; otherwise back with fixture loader | S |
| 43 | `src/types/shared.ts` (`DEMO_PATIENT_ROSTER`) | demo patient constant | DELETE after care-team views are wired | S |

**New backend routes required (audit showed these do not exist):**

- `GET /api/notifications?hospitalId=X` → currently no `notifications` route file. Create `backend/src/routes/notifications.ts` backed by a new Prisma `Notification` model OR an aggregation over `TherapyGap` + `AuditLog`. Start with aggregation, no schema change.
- `GET /api/admin/users/:id/activity` → extend existing `backend/src/routes/admin*.ts` with a read over `AuditLog` filtered by userId.

Everything else in the table maps to already-existing routes (verified against the `grep "router\.(get|post)" backend/src/routes` dump).

#### B-1 exact wiring pattern (use for every file above)

```tsx
// BEFORE — hardcoded mock
const patients = [
  { id: '1', name: 'Test Patient', ... },
  ...
];

// AFTER — real API
import { useEffect, useState } from 'react';
import { apiService } from '../../../services/apiService'; // or api.ts for auth/gaps/platform
import { useAuth } from '../../../auth/AuthContext';

type Patient = { id: string; /* ... */ };

export function CareTeamView() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.hospitalId) return;
    let cancelled = false;
    setLoading(true);
    apiService
      .getHeartFailurePatients(user.hospitalId) // or api.getPatients('hf')
      .then(data => { if (!cancelled) setPatients(data); })
      .catch(e => { if (!cancelled) setError(e.message ?? 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.hospitalId]);

  if (loading) return <ModuleSkeleton />;
  if (error) return <ModuleError message={error} />;
  if (patients.length === 0) return <EmptyState module="Heart Failure" />;

  // render real patients exactly the way the mock data was rendered
}
```

**Mandatory rules for B-1 PRs:**

1. Never accept `hospitalId` from props or URL for authorization — always read from `useAuth().user.hospitalId`, which comes from the verified JWT (CLAUDE.md §14).
2. Never introduce a new `fetch()` call directly — go through `services/api.ts` or `services/apiService.ts`. Add a method if one is missing.
3. Every view must render three states: loading skeleton, empty state, error state. No blank screens.
4. No directive language in anything rendered (§8 "consider" / "recommended for review", never "order").
5. Delete the mock constant in the same PR that wires the view. Do not leave a dead export.
6. One PR per module (6 module PRs) + one PR per cross-cutting component (notifications, admin, therapyGap, populationHealth, crossReferral, phenotypeDetection, reporting, shared). Target: 14 PRs for B-1.

### B-1a — New backend routes

Two small route files to add before B-1 PRs #19 and #22 can land:

- `backend/src/routes/notifications.ts` — `GET /api/notifications`. Implement as aggregation over `TherapyGap` (recent unresolved) + `AuditLog` (recent user-visible events) filtered by `req.user.hospitalId`. No schema change.
- `backend/src/routes/admin.ts` (extend existing) — `GET /users/:id/activity`. Read from `AuditLog` filtered by `userId` and `req.user.hospitalId`. Superadmin bypass via existing middleware.

Both must be tenant-scoped via `req.user.hospitalId` only.

### B-2 — FHIR handler expansion (12 missing US Core profiles)

**Audit result:** `backend/src/redox/fhirResourceHandlers.ts` currently exports **9 handlers**, confirmed by grep:

```
handlePatient, handleCondition, handleMedicationRequest, handleObservation,
handleProcedure, handleDevice, handleEncounter, handleCarePlan, handleAllergyIntolerance
```

**US Core IG v6.0.0 requires 24 profiles.** The readiness audit confirmed:
- **7 COMPLETE** — Patient, Condition (Dx), Condition (Problems), Encounter, Medication, MedicationRequest, Observation (Lab)
- **5 PARTIAL** — AllergyIntolerance, CarePlan, Observation (Clinical), Procedure, ServiceRequest
- **12 NOT STARTED** — listed below

| # | US Core profile | New handler to add in `fhirResourceHandlers.ts` | Prisma table | Priority |
|---|-----------------|------------------------------------------------|--------------|----------|
| 1 | CareTeam | `handleCareTeam(resource, patientId)` | extend `CarePlan` or new `CareTeam` model | P1 |
| 2 | Coverage | `handleCoverage(resource, patientId)` | new `Coverage` model | P1 |
| 3 | DiagnosticReport (Lab) | `handleDiagnosticReportLab(resource, patientId)` | reuse `Observation` + link | P0 |
| 4 | DiagnosticReport (Note) | `handleDiagnosticReportNote(resource, patientId)` | new `ClinicalNote` model | P1 |
| 5 | DocumentReference | `handleDocumentReference(resource, patientId)` | new `DocumentReference` model (S3-backed) | P1 |
| 6 | Goal | `handleGoal(resource, patientId)` | new `Goal` model | P2 |
| 7 | Immunization | `handleImmunization(resource, patientId)` | new `Immunization` model | P2 |
| 8 | Location | `handleLocation(resource)` | new `Location` model | P2 |
| 9 | Organization | `handleOrganization(resource)` | reuse `HealthSystem` | P1 |
| 10 | Practitioner | `handlePractitioner(resource)` | new `Practitioner` model | P0 |
| 11 | Provenance | `handleProvenance(resource, targetId)` | `AuditLog` | P1 |
| 12 | RelatedPerson | `handleRelatedPerson(resource, patientId)` | new `RelatedPerson` model | P2 |

**Sprint B target:** ship **P0 handlers only** (DiagnosticReport (Lab), Practitioner). Everything else moves to Sprint C. P0 is what Epic and Mount Sinai need for lab-result round-trip and attribution.

**Pattern for each new handler** (mirrors existing `handleCondition`):

```ts
export function handleDiagnosticReportLab(
  resource: any,
  patientId: string,
): MappedDiagnosticReport {
  return {
    fhirId: resource.id,
    patientId,
    status: resource.status,
    category: resource.category?.[0]?.coding?.[0]?.code ?? 'LAB',
    code: resource.code?.coding?.[0]?.code,
    effectiveDateTime: resource.effectiveDateTime,
    issued: resource.issued,
    resultReferences: (resource.result ?? []).map((r: any) => r.reference),
  };
}
```

Each handler must be unit-tested with a fixture in `backend/tests/fixtures/fhir/` and wired into `backend/src/redox/batchGapDetection.ts` router so the ingestion loop actually calls it.

### B-3 — Epic App Orchard submission

JWT verification already landed in PR #91 (Sprint A), so CDS Hooks is technically submission-ready. What remains is the *paperwork and sandbox validation*.

**Epic submission checklist:**

- [ ] **CDS Hooks discovery URL** — `https://api.tailrd-heart.com/cds-services` (verified live: 3 services)
- [ ] **JWT verification proof** — capture a sample Epic-issued JWT, run it through `/cds-services/:hookId` in sandbox, save response to `docs/epic-submission/jwt-verification-evidence.md`
- [ ] **Each hook documented** — for all 3 services advertised at `/cds-services`, create `docs/epic-submission/hooks/<hookId>.md` with: hook type, prefetch template, sample request, sample response card, clinical rationale, guideline source
- [ ] **Sandbox credentials** — request an Epic App Orchard sandbox client_id/issuer; store as ECS secret `EPIC_SANDBOX_ISSUER`
- [ ] **Load test** — 100 concurrent requests to `/cds-services/:hookId` with valid JWT, assert p95 under 5 seconds (Epic requirement). Script: `backend/scripts/epicLoadTest.ts` (new)
- [ ] **Feedback endpoint dry-run** — POST `/cds-services/:hookId/feedback` with sandbox accepted/overridden payload, verify it writes to `AuditLog` with a retrievable decision trail
- [ ] **Card-action review** — audit suggestions for directive language per CLAUDE.md §8. Any "order" / "prescribe" / "must" → rewrite to "consider" / "recommended for review"
- [ ] **Terms of use + BAA draft** — coordinate with legal (BAA_REGISTER.md exists; ensure template covers Epic specifically)
- [ ] **Security questionnaire** — Epic sends a standard security questionnaire; pre-fill from `PHASE_4_READINESS_AUDIT.md` §6 (OWASP) and §7 (SOC 2)
- [ ] **Submit** — via Epic App Orchard portal. Track submission ID in `docs/epic-submission/README.md`.

**Blocker for submission:** none from the code side as of td:26. All remaining items are documentation, legal, and sandbox validation.

### B-4 — Gap rule functional tests

**Audit result:** `backend/src/ingestion/gaps/gapRuleEngine.ts` exports exactly two symbols:

```ts
export const RUNTIME_GAP_REGISTRY = [ ... ] as const;  // line 84
export function evaluateGapRules(                       // line 3195
  dxCodes: string[],
  labValues: Record<string, number>,
  medCodes: string[],
  age: number,
  gender?: string,
  race?: string,
): DetectedGap[]
```

Existing tests: `backend/tests/gapRules/heartFailure.test.ts`, `clinicalScenarios.test.ts`, `testHelpers.ts`. Total functional tests today: **~34**. Target: **200+** (one positive + one negative per rule, plus boundary cases).

**Test pattern (use for every new test):**

```ts
// backend/tests/gapRules/<module>.test.ts
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';
import { TherapyGapType, ModuleType } from '../../src/types';

describe('Heart Failure gap rules', () => {
  describe('ATTR-CM screening', () => {
    it('fires when HF + elevated NT-proBNP + preserved LVEF + hs-TnT + age>=65', () => {
      const gaps = evaluateGapRules(
        ['I50.22'],                                 // HFpEF
        { nt_probnp: 1200, lvef: 55, hs_tnt: 20 },  // 3 signals
        [],
        72,
        'M',
      );
      const attr = gaps.find(g => g.status.includes('ATTR-CM'));
      expect(attr).toBeDefined();
      expect(attr?.module).toBe(ModuleType.HEART_FAILURE);
      expect(attr?.type).toBe(TherapyGapType.MONITORING_OVERDUE);
      expect(attr?.evidence?.guidelineSource).toMatch(/2023 ACC/);
    });

    it('does NOT fire when patient is on hospice (exclusion)', () => {
      const gaps = evaluateGapRules(
        ['I50.22', 'Z51.5'],                        // HF + hospice
        { nt_probnp: 1200, lvef: 55, hs_tnt: 20 },
        [],
        72,
      );
      expect(gaps.find(g => g.status.includes('ATTR-CM'))).toBeUndefined();
    });

    it('does NOT fire below 3 signals (boundary)', () => {
      const gaps = evaluateGapRules(
        ['I50.22'],
        { nt_probnp: 1200, lvef: 55 },              // only 2 signals
        [],
        60,                                          // age<65, 3rd signal missing
      );
      expect(gaps.find(g => g.status.includes('ATTR-CM'))).toBeUndefined();
    });
  });
});
```

**Structural rule:** one `describe` block per gap rule in `RUNTIME_GAP_REGISTRY`. Inside, three `it` blocks minimum: (a) positive trigger, (b) exclusion path, (c) boundary / "just below threshold".

**Sprint B target:** Heart Failure (47 rules) + Electrophysiology (44 rules) = **273 new tests**. Remaining 4 modules (Coronary 76, Structural 25, Valvular 32, Peripheral 33 = 166 rules → ~500 tests) move to Sprint C.

**Test infrastructure already present:** `backend/tests/setup.ts`, `fixtures/`, Jest config. No new infra needed.

---

## 2. Sprint C — Production hardening, remaining FHIR, SOC 2, SSO

Sprint C is the "make the platform sellable at enterprise scale" sprint. Target duration: 3 weeks. Starts only after Sprint B exits with all B-1 views wired, B-3 Epic submission filed, and B-4 heart-failure + EP test suites green in CI.

### C-1 — ECS environment variables (12 missing)

From `PHASE_4_READINESS_AUDIT.md` §5. Every one of these is referenced in code but not set in ECS:

`COGNITO_DOMAIN`, `COGNITO_CLIENT_ID`, `COGNITO_USER_POOL_ID`, `COGNITO_REGION`, `SMART_CLIENT_ID`, `API_URL`, `REDOX_WEBHOOK_SECRET`, `S3_BUCKET_UPLOADS`, `S3_PHI_BUCKET`, `S3_AUDIT_BUCKET`, `REDIS_URL`, `SES_FROM_ADDRESS`

**Execution:** one PR that updates the Terraform / CloudFormation task definition template to inject all 12, plus a runbook entry in `docs/SECRET_ROTATION_RUNBOOK.md` documenting which are secrets (Secrets Manager) vs plain env vars. `REDIS_URL` is the highest-priority one because rate limiting in `lib/redis.ts` already falls back to in-memory without it — if we ever scale to ≥2 ECS tasks without it, rate limits become per-instance.

### C-2 — Remaining 10 FHIR handlers (B-2 tail)

Everything B-2 deferred: CareTeam, Coverage, DiagnosticReport (Note), DocumentReference, Goal, Immunization, Location, Organization, Provenance, RelatedPerson. Same handler + unit-test pattern as B-2.

### C-3 — Remaining 4 modules of gap-rule tests

Coronary Intervention (76 rules), Structural Heart (25), Valvular Disease (32), Peripheral Vascular (33). Same test pattern as B-4. Target: ~500 more functional tests.

### C-4 — Frontend B-1 tail

Any frontend file surfaced by broader mock grep in Sprint B retro that did not make the B-1 priority list. Includes `src/data/claimsData.ts` cleanup and `DEMO_PATIENT_ROSTER` removal if still present.

### C-5 — SSO end-to-end (Cognito + SAML)

Code exists (`COGNITO_*` references). Needs: env vars (C-1), IdP trust setup with at least one pilot health system (Medical City Dallas → HCA IdP), and a live SAML round-trip in staging. One-week effort once env vars are in.

### C-6 — SOC 2 policy documentation (21 unchecked controls)

Per readiness audit §7. Non-engineering work (Legal, HR, Ops) but engineering owns: SDLC policy, change management process, threat modeling, rollback testing quarterly, code signing. Carve out one engineer-week.

### C-7 — Load & chaos testing

100 concurrent CDS Hook calls (already scripted for B-3), plus: 50 concurrent logged-in users hitting module dashboards, 1 ECS task killed mid-request (verify no data loss), RDS failover drill. Document outcomes in `docs/LOAD_TEST_2026_Q2.md`.

### C-9 — Remove `@ts-nocheck` from ingestion files

Two pre-existing exceptions currently documented in CLAUDE.md §14:

- `backend/src/ingestion/gaps/gapRuleEngine.ts`
- `backend/src/ingestion/runGapDetectionForPatient.ts`

Both are stale-Prisma-client errors per CLAUDE.md §18. They resolve when `prisma generate` runs inside a Docker build (Linux FS), not under WSL against the Windows filesystem. **Execution:** run the full build inside Docker, remove the `// @ts-nocheck` line from each file, verify `tsc --noEmit` is clean in-container, ship as one PR. Delete the exception note from CLAUDE.md §14 in the same PR.

### C-8 — Frontend deploy (app.tailrd-heart.com)

Still on the "not deployed" list in CLAUDE.md §9. Netlify or Vercel, `REACT_APP_USE_REAL_API=true`, DNS cutover. Depends on Sprint B-1 being done so the real-API build doesn't render blank module pages.

---

## 3. Decision matrix

When two Sprint B items compete for the same hour, decide with this matrix.

| Dimension | Weight | B-1 (UI wiring) | B-2 (FHIR P0) | B-3 (Epic) | B-4 (tests) |
|-----------|:-----:|:---------------:|:-------------:|:----------:|:-----------:|
| Customer-facing impact | 5 | **5** | 3 | 4 | 1 |
| Unblocks revenue | 4 | **4** | 3 | **5** | 1 |
| Clinical safety risk if skipped | 5 | 2 | 3 | 2 | **5** |
| Reversibility (higher = safer to defer) | 2 | 3 | 3 | 2 | 4 |
| Engineering parallelism | 3 | **5** (14 PRs) | 2 | 1 | **5** |
| Dependency on Sprint C | 3 | 1 | 1 | 1 | 1 |
| **Weighted total** | | **67** | **48** | **56** | **56** |

**Read:** B-1 is the single biggest lever. B-3 and B-4 tie for second — B-3 unblocks Epic revenue, B-4 unblocks clinical-safety confidence. B-2 is lowest-scoring of the four but still must happen for lab round-trip.

**Tie-breakers:**
- B-3 vs B-4: if a pilot hospital is waiting, B-3 wins; if a new gap rule is being added, B-4 wins.
- B-1 vs anything: B-1 always wins if a stakeholder is going to look at the product this week.

**Explicit "do not do in Sprint B":**
- Any remaining SSO work (C-5) — blocked on C-1 env vars anyway.
- Any SOC 2 policy writing (C-6) — not engineering bandwidth.
- Any rewrite of `cqlEngine.ts` — it is scaffolding; the deterministic `gapRuleEngine.ts` is the real runtime (CLAUDE.md §8).
- Any ML/AI work in the gap engine — violates CLAUDE.md §14.

---

## 4. Sprint B execution prompt — paste into next session

The block below is the exact prompt for the next Claude Code session. It assumes the agent starts from `main` at or after commit `f51dcae` and has production access.

````
You are picking up Phase 4 Sprint B for the TAILRD Heart platform. Read
CLAUDE.md and docs/PHASE_4_BACKLOG.md first. Do not skip either.

CONTEXT
- Production is live at api.tailrd-heart.com, task def tailrd-backend:26.
- Sprint A is done. Redis rate limiting, jose fix, /api/health alias,
  and CDS Hooks JWT verification (PR #91) all shipped.
- Sprint B has four tracks: B-1 (frontend wiring), B-2 (2 P0 FHIR
  handlers), B-3 (Epic submission paperwork), B-4 (HF + EP gap tests).

BEFORE YOU TOUCH CODE
1. Verify production still green:
   curl -s https://api.tailrd-heart.com/health | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])"
   curl -s -X POST https://api.tailrd-heart.com/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@stmarys.org","password":"demo123"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('success'))"
2. Run the 3-check pre-push gate from CLAUDE.md §18. Must be clean
   before you start.
3. Confirm with Jonathan which Sprint B track to execute first.
   Default order if he does not override: B-1a → B-1 → B-2 → B-4 → B-3.

B-1a — NEW BACKEND ROUTES (must land before B-1 #19 and #22)
- Create backend/src/routes/notifications.ts exposing
  GET /api/notifications. Implement as aggregation over TherapyGap
  (recent unresolved) + AuditLog (recent user-visible events), filtered
  by req.user.hospitalId. No schema change. Mount in server.ts.
- Extend backend/src/routes/admin.ts (or the existing admin router)
  with GET /users/:id/activity reading AuditLog filtered by userId and
  req.user.hospitalId. Superadmin bypass via existing middleware.
- One PR, title: "feat(api): notifications + user activity routes for Sprint B-1".
- Add one integration test per route in backend/tests/integration/.

B-1 — FRONTEND WIRING (14 PRs total)
For each module (HF, EP, Structural, Coronary, Valvular, Peripheral):
- One PR per module. Title: "feat(ui): wire <module> module to real API".
- Wire CareTeamView, ExecutiveView, ServiceLineView in that order.
- Use the exact useEffect/useState pattern in PHASE_4_BACKLOG.md §B-1.
- Read hospitalId from useAuth().user.hospitalId. NEVER from props or URL.
- Add loading skeleton, empty state, error state. No blank screens.
- Delete the corresponding mock constant / DEMO_PATIENT_ROSTER entry
  in the SAME PR. Do not leave dead exports.
- No new fetch() calls. Add methods to services/api.ts or
  services/apiService.ts if missing.
- Review card language for directive verbs (CLAUDE.md §8).

After the 6 module PRs, ship cross-cutting PRs in this order:
7. notifications (NotificationPanel + delete notificationMockData.ts)
8. admin (PlatformOverview + UsersManagement)
9. therapyGap (Dashboard + DeviceUnderutilizationPanel + GDMTOptimizationTracker)
10. populationHealth (PopulationOverviewDashboard + PatientRiskStratification)
11. phenotypeDetection (PhenotypeDetailModal)
12. crossReferral (CrossReferralEngine)
13. reporting (QualityReportGenerator)
14. shared (ClinicalContextPanel + PatientTimeline + ModuleNavigator)

Each PR must pass the 3-check pre-push gate. Run /review before gh pr create.

B-2 — FHIR HANDLERS (P0 only: DiagnosticReport (Lab), Practitioner)
- Add handleDiagnosticReportLab and handlePractitioner to
  backend/src/redox/fhirResourceHandlers.ts using the handler pattern
  at PHASE_4_BACKLOG.md §B-2.
- Wire both into backend/src/redox/batchGapDetection.ts so the ingestion
  loop calls them.
- Add fixtures to backend/tests/fixtures/fhir/ and unit tests to
  backend/tests/. One positive, one malformed-resource test each.
- One PR: "feat(ehr): DiagnosticReport (Lab) and Practitioner handlers".

B-3 — EPIC SUBMISSION
- Work through the checklist in PHASE_4_BACKLOG.md §B-3.
- Create docs/epic-submission/ directory and fill it in as you go.
- Do not submit without Jonathan's explicit go-ahead.
- The only code work here is backend/scripts/epicLoadTest.ts (100
  concurrent hook calls, p95 < 5s assertion).

B-4 — GAP RULE TESTS (HF + EP only in Sprint B)
- For every rule in RUNTIME_GAP_REGISTRY that belongs to Heart Failure
  or Electrophysiology, add three tests using the pattern in
  PHASE_4_BACKLOG.md §B-4: positive trigger, exclusion, boundary.
- Target ~273 new tests. Add to existing
  backend/tests/gapRules/heartFailure.test.ts and a new
  backend/tests/gapRules/electrophysiology.test.ts.
- Do not change evaluateGapRules signature.
- CI must stay green after every commit.

DEPLOY DISCIPLINE
- Every backend PR that touches server.ts, auth.ts, middleware/*, or
  redox/* must be container-tested locally before push (CLAUDE.md §15
  Rule 3).
- After every deploy, run the verification block from CLAUDE.md §18 and
  update "last known working task definition" in CLAUDE.md if successful.
- If anything in production breaks, immediately roll back to td:26 and
  debug locally. Never debug on production.

EXIT CRITERIA FOR SPRINT B
- All 14 B-1 PRs merged, notificationMockData.ts deleted,
  DEMO_PATIENT_ROSTER deleted.
- B-2 P0 handlers merged and active in ingestion loop.
- B-3 Epic submission package staged in docs/epic-submission/ (submit on
  Jonathan's go-ahead).
- B-4: ~273 new gap rule tests passing in CI.
- CLAUDE.md "last known working task definition" updated to whatever
  post-Sprint-B task def is live.
- Production health + login + CDS services all green.
````

---

## 5. Sprint B status tracker (update each session)

| Item | Status | PR | Task def after merge |
|------|--------|----|----------------------|
| B-1a notifications route | OPEN | — | — |
| B-1a admin activity route | OPEN | — | — |
| B-1 HF module | OPEN | — | — |
| B-1 EP module | OPEN | — | — |
| B-1 Structural module | OPEN | — | — |
| B-1 Coronary module | OPEN | — | — |
| B-1 Valvular module | OPEN | — | — |
| B-1 Peripheral module | OPEN | — | — |
| B-1 Notifications panel | OPEN | — | — |
| B-1 Admin tabs | OPEN | — | — |
| B-1 TherapyGap components | OPEN | — | — |
| B-1 PopulationHealth | OPEN | — | — |
| B-1 PhenotypeDetection | OPEN | — | — |
| B-1 CrossReferral | OPEN | — | — |
| B-1 Reporting | OPEN | — | — |
| B-1 Shared components | OPEN | — | — |
| B-2 DiagnosticReport (Lab) | OPEN | — | — |
| B-2 Practitioner | OPEN | — | — |
| B-3 Epic submission package | OPEN | — | — |
| B-4 HF gap tests (47 rules) | OPEN | — | — |
| B-4 EP gap tests (44 rules) | OPEN | — | — |

*Legend: OPEN / IN_PROGRESS / MERGED / DEPLOYED / VERIFIED*
