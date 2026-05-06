# Phase 3 Report — Data Layer Audit

**Phase:** 3 of 7 (Phase 0A continuation)
**Dimension:** Data layer — schema, multi-tenancy, soft-delete, PHI coverage, audit log integrity, query patterns, backup/restore, connection pooling, validation
**Executed:** 2026-05-07
**Auditor:** jhart
**Framework:** `docs/audit/AUDIT_FRAMEWORK.md` v1.0; methodology stack §1, §16, §17, §18 per `docs/audit/AUDIT_METHODOLOGY.md`
**Companion docs:** `docs/audit/AUDIT_FINDINGS_REGISTER.md`, `docs/audit/PHASE_1_REPORT.md`

---

## 1. Executive summary

**Verdict: CONDITIONAL PASS.**

Audit found correctly with file:line evidence. **Production posture is NOT production-ready today.** The 5 production-readiness gate items (§5 below) require immediate remediation before further deferrable audit/feature work blocks. PHI may arrive any day; production-ready posture is data-state-independent. **Immediate-remediation arc starts next work block.**

The TAILRD data layer is structurally well-organized: 54 models across 4 migrations, Restrict-dominant cascade pattern (53 of 66 explicit `onDelete` declarations), minimal raw-SQL surface (1 occurrence in `server.ts:212` health check), no rogue `PrismaClient` instances, no detected N+1 antipatterns, AUDIT-013 dual-transport audit logger operational with 6-year retention. Single-tenant verification confirmed (operator: no production hospital data today; BSW pilot at pre-DUA pre-data-flow state) — the structural bugs surfaced in this audit do not currently expose data because there IS no PHI to expose, but several would expose PHI immediately on arrival. The "pre-onboard gate" framing (initially used in this report) was rejected by operator: production-readiness is data-state-independent. Today's bug-without-data is tomorrow's bug-with-data; the audit work treats them as equivalent.

**Highest-visibility finding: AUDIT-071 (HIGH P1)** — `cdsHooks.ts` two `prisma.patient.findFirst` callsites have a structurally always-false tenant filter (route is not mounted under `authenticateToken`; `verifyCDSHooksJWT` does not populate `req.user`). Cross-tenant patient lookup by `fhirPatientId` is the active failure mode. Reinforced by missing `@@unique([hospitalId, fhirPatientId])` schema constraint. Both bundled into AUDIT-071.

**Findings recorded this phase: 10 new register entries** (1 HIGH, 5 MEDIUM, 4 LOW; INFO-class observations folded into prose). 5 of the 6 MEDIUM/HIGH entries are production-readiness gate items requiring immediate remediation.

**Methodology paid interest (twice):** front-loading the high-risk surfaces (multi-tenancy enforcement + soft-delete coverage) per operator decision D1 surfaced the HIGH P1 finding in 3.5h — conventional schema-first ordering would have buried it under hours of LOW/MEDIUM density. Then operator-side §17.1 framing correction caught the agent's "pre-onboard gate" derivative drift before this PR merge — sixth §17.1 architectural-precedent of the arc, third caught against operator-side derivative artifacts.

---

## 2. Methodology

**Scope:**

- `backend/prisma/schema.prisma` (2,514 LOC, 54 models, 47 enums, 115 indexes, 14 unique constraints, 4 migrations)
- `backend/prisma/migrations/` (1 baseline + 3 incremental)
- `backend/src/middleware/phiEncryption.ts` PHI_FIELD_MAP + PHI_JSON_FIELDS coverage
- `backend/src/middleware/auditLogger.ts` HIPAA_GRADE_ACTIONS + retention
- `backend/src/lib/prisma.ts` singleton wiring
- `backend/src/middleware/tenantGuard.ts` Layer 3 enforcement state
- 278 Prisma read callsites across `backend/src/routes/` + `backend/src/services/`
- `infrastructure/cloudformation/tailrd-staging.yml` + Day 10/11 change records for backup posture

**Out of scope (deferred to Phase 4/5/7):**
- Live AWS resource configuration (Phase 4)
- Threat-model coverage (Phase 7)
- HIPAA gap analysis cross-walk (Phase 5)
- Frontend `src/`

**Audit ordering (per operator decision D1):** front-loaded high-risk surfaces b + h, then conventional a → c → d → e → f → g → i → j.

**Tools used:** ripgrep + Node introspection scripts. All raw evidence cited as `file:line` per §1 rule-body verification.

---

## 3. Findings inventory

### Severity distribution

| Severity | Count | Production-readiness gate |
|---|---|---|
| HIGH (P1) | 1 | 1 |
| MEDIUM (P2) | 5 | 4 |
| LOW (P3) | 4 | 0 |
| **Total** | **10** | **5** |

INFO-class observations (cross-tenant-by-design SUPER_ADMIN routes, no down-migrations, raw SQL minimal, N+1 absent, staging Aurora retention=1d, no PgBouncer at current scale) are folded into prose context within the relevant findings.

### Findings table

| ID | Severity | Domain | Prod-ready gate | One-line |
|---|---|---|---|---|
| AUDIT-071 | **HIGH (P1)** | Multi-tenancy | **YES** | cdsHooks cross-tenant patient lookup; missing fhirPatientId tenant unique constraint |
| AUDIT-072 | MEDIUM (P2) | Soft-delete | NO | deletedAt filter not applied across most reads; DELETE patient does not cascade soft-delete |
| AUDIT-073 | MEDIUM (P2) | Schema | YES | Order.fhirOrderId + CarePlan.fhirCarePlanId missing per-tenant unique (sister to AUDIT-020) |
| AUDIT-074 | LOW (P3) | Schema hygiene | NO | 14 child-side relations missing explicit `onDelete`; 10 models missing hospitalId-leading `@@index` |
| AUDIT-075 | MEDIUM (P2) | PHI encryption | YES | `errorMessage` / `description` / `notes` plaintext on multiple tables (sister to AUDIT-018/019) |
| AUDIT-076 | LOW (P3) | Audit log | NO | `HIPAA_GRADE_ACTIONS` set is narrow; some clinically-significant events are best-effort DB writes |
| AUDIT-077 | LOW (P3) | Tenant hygiene | NO | Defense-in-depth gaps: webhookEvent without hospitalId; bare-id patient update; cqlRules role-comparison bug |
| AUDIT-078 | MEDIUM (P2) | Backup / DR | YES | Production Aurora backup config not codified in IaC; restore procedure documented but never end-to-end tested |
| AUDIT-079 | LOW (P3) | Connection pool | NO | `connection_limit` not explicit in DATABASE_URL nor Prisma client config |
| AUDIT-080 | MEDIUM (P2) | Validation | YES | 21 of 26 mutating-route files have NO Zod schema validation (CLAUDE.md §2 stated discipline gap) |

Detail blocks for each finding land in `docs/audit/AUDIT_FINDINGS_REGISTER.md` per the established format (Phase / Severity / Status / Location / Evidence with file:line / Severity rationale / Remediation / Effort estimate / Cross-references).

---

## 4. Per-area summary

### 4.1 Area b — Multi-tenancy enforcement (front-loaded)

**Finding density: HIGH.** Surfaced **AUDIT-071 (HIGH P1)** on the first sample. `cdsHooks.ts:117-123` and `:294-300` both contain `const hospitalId = (req as any).user?.hospitalId; ... if (hospitalId) patientWhere.hospitalId = hospitalId;` — a structurally always-false tenant filter because (a) `cdsHooks` routes are mounted under `cdsLimiter` only at `server.ts:189`, NOT under `authenticateToken`, and (b) `verifyCDSHooksJWT` (lines 26-51) returns a boolean only — it does not populate `req.user`. Result: cross-tenant patient lookup by `fhirPatientId` in BOTH dev (NODE_ENV !== 'production' returns true unconditionally) AND production. Reinforced by `Patient.fhirPatientId` having only `@@index([fhirPatientId])` — no `@@unique([hospitalId, fhirPatientId])` constraint. Both bundled into AUDIT-071.

**Other area-b observations (folded into AUDIT-077):**
- `cqlRules.ts:271, 630` — role-comparison bug `req.user?.role?.toLowerCase().replace(/_/g, '-') !== 'SUPER_ADMIN'` is structurally always-true (lowercase-hyphenated never equals uppercase-underscored). Tenant check ALWAYS RUNS — fail-safe (over-strict, not under-strict) but locks SUPER_ADMIN out of these routes inconsistent with codebase pattern.
- `breachNotification.ts` cross-tenant by design (SUPER_ADMIN gated at `router.use(authorizeRole(['SUPER_ADMIN']))` at line 21). Acknowledged INFO; relies on route-level gate; if ever weakened, tenant isolation breaks.

### 4.2 Area h — Soft-delete coverage (front-loaded)

**Finding density: HIGH.** Surfaced **AUDIT-072 (MEDIUM P2)**. Of the 6 soft-delete-aware models (User, Patient, Encounter, Observation, Order, Alert), only **3 route files** filter `deletedAt: null` (`patients.ts`, `dataRequests.ts`, `internalOps.ts`). All other reads — `gapDetectionRunner`, `runGapDetectionForPatient`, `cdsHooks`, `cqlRules`, `modules.ts`, `admin.ts`, `gaps.ts`, `godView.ts`, `encounterService` — return soft-deleted PHI as if active. Reinforced by `DELETE /api/patients/:id` (`patients.ts:368-371`) soft-deleting the Patient row only without cascading to dependent Encounter/Observation/Order/Alert. Only `dataRequests.ts:451-501` cascades properly.

User-login `auth.ts:50-58, 187-193` uses `!user.isActive` as safety net but does NOT filter `deletedAt: null` directly. Defense-in-depth gap (folded into AUDIT-072).

### 4.3 Area a — Schema review

Coverage: FK completeness (66 explicit `onDelete` declarations), index alignment (115 declarations), unique-key tenant scoping (14 declarations including 8 per-tenant `[hospitalId, fhir*Id]`).

**Findings:**
- **AUDIT-073 (MEDIUM P2 — gate):** Order.fhirOrderId + CarePlan.fhirCarePlanId missing `@@unique([hospitalId, fhir*Id])`. Sister to AUDIT-020 (which addressed Patient/Encounter/Observation/Medication/Condition/Procedure/Device/Allergy fhir*Ids). Two newly-discovered gaps in the same family.
- **AUDIT-074 (LOW P3):** 14 child-side relations missing explicit `onDelete` (default Postgres NoAction is safe but inconsistent). 10 models with `hospitalId` field but NO `hospitalId`-leading `@@index` — tenant-scoped queries will use less-optimal indexes (User, LoginSession, CQLResult, Phenotype, CrossReferral, DrugTitration, QualityMeasure, DeviceEligibility, BreachIncident, FailedFhirBundle).

### 4.4 Area c — Migration discipline

Migration history: 1 baseline (`20260420_consolidated_baseline`, 3,647 LOC) + 3 incremental. Migration `20260502_audit_011_tenant_scoped_unique_keys` carries the AUDIT-024 historical note (CONCURRENTLY pattern + Prisma transaction-wrapping).

**Observations (no new register entry; cross-references AUDIT-024):**
- No down-migrations; rollback procedure not codified per HIPAA §164.308(a)(7)(ii)(B) DR plan testing requirement.
- Local dev DB drift vs schema (CdsHooksSession.fhirContext + .cards present in schema, missing in dev) — covered by AUDIT-022 §17.1 reframing in PR #253.

### 4.5 Area d — PHI encryption-at-rest coverage

PHI_FIELD_MAP: 38 fields across 14 models. PHI_JSON_FIELDS: 28 fields across 15 models. AUDIT-018 (`AuditLog.description`) + AUDIT-019 (`FailedFhirBundle.errorMessage` + `originalPath`) + AUDIT-020 (`fhir*Id`) already filed.

**AUDIT-075 (MEDIUM P2 — gate)** consolidates new sister findings:
- `errorMessage` plaintext on **5 additional tables** (sister to AUDIT-019): WebhookEvent, UploadJob, ReportGeneration, ErrorLog, UserActivity. Same pattern: error fragments accumulate raw input including potential PHI.
- `Recommendation.description` and `CarePlan.description` plaintext (CarePlan.title IS encrypted; description not). Free-form clinical-content fields likely contain patient context.
- `Onboarding.notes` and `PatientDataRequest.notes` plaintext. PatientDataRequest is the HIPAA right-to-deletion flow — its notes column accepts operator-supplied PHI-rich free-form input.
- Sub-finding: `User.email`, `User.firstName`, `User.lastName` plaintext (staff PII, not strict PHI; defense-in-depth).

### 4.6 Area e — Audit log integrity

55 audit-log call sites; 6-year retention (`RETENTION_DAYS = 2190`); AUDIT-013 dual-transport (file + Console JSON → CloudWatch) operational and verified during AUDIT-022 PR #253 D3 step.

**AUDIT-076 (LOW P3):** `HIPAA_GRADE_ACTIONS` set has 10 entries (LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, PHI_VIEW, PHI_EXPORT, PATIENT_CREATED/UPDATED/DELETED, BREACH_DATA_ACCESSED/MODIFIED). Some clinically-significant events are NOT HIPAA-graded (DB write failure is best-effort): `DATA_REQUEST_FULFILLED` (HIPAA right-to-deletion), `BREACH_INCIDENT_CREATED`, MFA enable/disable, INVITE_ACCEPTED. Per HIPAA §164.308(a)(1)(ii)(D) Information System Activity Review, the boundary deserves periodic review.

### 4.7 Area f — Query patterns

- Raw SQL surface: **1 occurrence** (`server.ts:212` `SELECT 1` health check). Excellent containment.
- N+1 antipatterns: **none detected** (no `for-await-prisma` loops; no `Promise.all` + `prisma.find`).
- 5 transaction sites (`gapDetectionRunner`, `runGapDetectionForPatient`, `dataRequests`, `onboarding`, `webhooks`). `dataRequests.ts:451` cascade-delete transaction is well-disciplined.
- 31 `include:` patterns; eager-load shape acceptable.

**AUDIT-077 (LOW P3)** consolidates tenant-isolation-hygiene gaps:
- `dataRequests.ts:478` `tx.webhookEvent.updateMany({ where: { patientId } })` missing `hospitalId` filter (defense-in-depth; FK provides effective scoping).
- `dataRequests.ts:498` `tx.patient.update({ where: { id: patientId } })` uses bare `id` instead of AUDIT-011 `id_hospitalId` composite.
- `cqlRules.ts:271, 630` role-comparison bug from area b folds in here.

### 4.8 Area g — Backup + restore

Production Aurora cluster (`tailrd-production-aurora.cluster-...`) is NOT codified in `infrastructure/cloudformation/`. Only `tailrd-staging.yml` exists (BackupRetentionPeriod: 1 day, intentional staging posture). Day 10/11 change records show snapshots are taken (`tailrd-production-aurora-pre-cutover-20260428-231342`; final pre-decom snapshot tagged for 6-yr HIPAA retention).

**AUDIT-078 (MEDIUM P2 — gate):**
- Production Aurora backup configuration (BackupRetentionPeriod, DeletionProtection, snapshot lifecycle) is AWS console state, not version-controlled. Configuration-drift risk.
- Restore procedure documented in Day 11 change record (4-step recipe under "If catastrophic discovery") but never end-to-end tested. HIPAA §164.308(a)(7)(ii)(B) requires DR plan with periodic testing.

### 4.9 Area i — Connection pooling + transaction discipline

Prisma singleton (`lib/prisma.ts`) — 1 `new PrismaClient` instance. No rogue clients. AUDIT-013 / 015 / 016 PR 1 middleware wired correctly via the singleton.

**AUDIT-079 (LOW P3):** `connection_limit` not explicit in DATABASE_URL nor Prisma client config. Default Prisma pool of `cpu*2+1` per Fargate task works for current scale (single Fargate task, low concurrency, Aurora ServerlessV2 0.5-4 ACU max_connections scales with ACU). Hygiene only.

INFO: No PgBouncer / RDS Proxy. Acceptable for current scale; revisit at multi-tenant scale.

### 4.10 Area j — Data validation

26 route files with mutating endpoints (POST/PUT/PATCH). Only **5 use Zod**: `accountSecurity` (4/4), `auditExport`, `breachNotification` (2/2), `dataRequests` (3/4), `files` (2/3). The other **21 files** accept arbitrary input shapes. CLAUDE.md §2 backend stack lists "Zod for request validation" — discipline gap vs stated practice.

**AUDIT-080 (MEDIUM P2 — gate):** Zod input validation coverage gap. High-risk surfaces include `auth.ts` (login/register, 0/4), `mfa.ts` (MFA enrollment, 0/4), `admin.ts` (admin operations, 0/11), `modules.ts` (module dashboard mutations, 0/15), `patients.ts` (patient CRUD, 0/2). Risk: malformed input can produce unexpected behavior, and the missing schemas hide intent (operator can't grep "what shape does this endpoint expect?").

---

## 5. Production-Readiness Gate (Immediate Remediation)

These items are required for production-ready posture **independent of data ingestion state**. PHI may arrive any day; production-ready posture is data-state-independent. The "pre-onboard gate" framing (initially used in this report draft) is rejected — operator posture is production-ready now is the standard. The immediate-remediation arc starts the next work block after this Phase 3 audit merges.

### 5.1 Gate items (this audit)

| Gate item | Severity | Effort | Sequencing |
|---|---|---|---|
| AUDIT-071 — cdsHooks cross-tenant + fhirPatientId unique | HIGH (P1) | ~3-5h | **IMMEDIATE — next work block after Phase 3 audit merge** |
| AUDIT-073 — Order.fhirOrderId + CarePlan.fhirCarePlanId per-tenant unique | MEDIUM (P2) | ~1-2h | Bundled with AUDIT-071 mitigation per §17.3 (same schema migration) |
| AUDIT-075 — PHI encryption coverage (errorMessage / description / notes) | MEDIUM (P2) | ~4-8h | Immediate after AUDIT-071; independent PR; coordinate with AUDIT-019 if pursuing together |
| AUDIT-078 — Aurora backup IaC + restore-test | MEDIUM (P2) | ~6-10h | Immediate operator-side ops PR; required for production-ready posture |
| AUDIT-080 — Zod validation coverage | MEDIUM (P2) | ~12-20h | Phased rollout starting immediately; auth + mfa + admin + patients first; modules last |

### 5.2 Gate items (existing register, must coordinate)

| Gate item | Status | Sequencing |
|---|---|---|
| AUDIT-011 Phase b/c/d (Layer 3 Prisma extension multi-tenancy enforcement) | OPEN | Cannot defer to v2.0; required for production-ready posture (this audit's AUDIT-071 demonstrates app-layer discipline alone is structurally insufficient) |
| AUDIT-016 implementation arc (PR 2 V2/KMS + PR 3 migration job) | DESIGN PHASE COMPLETE; PR 1 SHIPPED | Both PRs required for production-ready posture; V0 → V1 → V2 envelope migration depends on the full arc |
| AUDIT-022 production `--execute` (legacy JSON PHI backfill) | RESOLVED 2026-05-07 (tooling shipped) | Production `--execute` runs on first PHI load; covered by `docs/runbooks/AUDIT_022_PRODUCTION_RUNBOOK.md` (data-state-dependent — only meaningful when PHI exists) |

### 5.3 Total gate-item effort estimate

| Source | Estimate | Notes |
|---|---|---|
| This audit's gate items (AUDIT-071/073/075/078/080) | 26-45h | AUDIT-071 IMMEDIATE next work block; others sequence into the immediate-remediation arc |
| AUDIT-011 Phase b/c/d | 9-11h (per AUDIT-011 design) | Layer 3 Prisma extension authoring + tests + deploy |
| AUDIT-016 PR 2 + PR 3 | 9-15h | Per AUDIT-016 design doc §10 |
| AUDIT-022 production `--execute` | 1-2h operator-side | Per runbook (data-state-dependent — runs once PHI exists) |
| **Total** | **~45-73h** | Immediate-remediation arc (AUDIT-071 first); rest sequenced via v2.0 PATH_TO_ROBUST authorship + parallel execution |

**v2.0 PATH_TO_ROBUST input note:** AUDIT-011 multi-tenancy enforcement Phase b/c/d cannot be deferred to v2.0; required for production-ready posture. AUDIT-071 demonstrates the structural inadequacy of relying on app-layer `where: { hospitalId }` discipline alone — the cdsHooks lookup fails because the discipline isn't reachable when `req.user` is not populated. Layer 3 Prisma extension is the structural backstop. Production-ready posture is data-state-independent: the pre-onboard-gate framing was rejected by operator. Today's bug-without-data is tomorrow's bug-with-data; remediation discipline treats them as equivalent.

---

## 6. Cross-phase recommendations

### Phase 4 — Operational maturity (next phase)

- AUDIT-078 backup/IaC work pairs naturally with Phase 4 (operational runbooks)
- Tech-debt #7 APM gap promoted in Phase 1 reconciliation belongs in Phase 4
- Connection-pool + Aurora ACU calibration work-stream lands here

### Phase 5 — HIPAA gap analysis

- HIPAA §164.308(a)(7)(ii)(B) DR plan testing — addressed by AUDIT-078 G2 sub-finding
- HIPAA §164.308(a)(1)(ii)(D) Information System Activity Review — addressed by AUDIT-076
- HIPAA §164.312(a)(1) access control + §164.502 minimum necessary — addressed by AUDIT-071
- HIPAA §164.312(a)(2)(iv) addressable encryption/decryption — addressed by AUDIT-016 arc + AUDIT-075
- HIPAA §164.312(b) audit controls — already addressed by AUDIT-013 dual-transport (operational)

### Phase 7 — Threat modeling

- Threat-model AUDIT-071 cdsHooks endpoint after AUDIT-071 mitigation lands
- Threat-model SUPER_ADMIN cross-tenant patterns (godView, breachNotification, internalOps) per AUDIT-077 INFO observation

---

## 7. Verdict

**Phase 3 outcome: CONDITIONAL PASS.**

| Dimension | Result |
|---|---|
| Schema structure + cascade discipline | GOOD (Restrict-dominant; explicit `@@map`; per-tenant uniqueness on most fhir IDs) |
| Multi-tenancy enforcement (app-layer) | UNCERTAIN (AUDIT-071 HIGH P1 demonstrates structural inadequacy; AUDIT-011 Layer 3 Prisma extension is the backstop) |
| Soft-delete semantics | INCOMPLETE (AUDIT-072 — coverage gap across most reads; cascade gap on bare DELETE) |
| PHI encryption-at-rest coverage | PARTIAL (AUDIT-018/019/020 + AUDIT-075 sister findings) |
| Audit log durability | GOOD (AUDIT-013 dual-transport operational; 6-year retention) |
| Query pattern hygiene | GOOD (no N+1, minimal raw SQL, well-disciplined transactions) |
| Backup / DR posture | INCOMPLETE (AUDIT-078 — IaC gap + untested restore) |
| Connection pool | ADEQUATE for current scale (AUDIT-079 hygiene only) |
| Input validation | INCONSISTENT (AUDIT-080 — 21/26 mutating-route files lack Zod) |

**Upgrade from CONDITIONAL PASS to PASS requires:**
1. Production-readiness gate items §5 complete (5 items from this audit, immediate remediation)
2. AUDIT-011 Phase b/c/d complete (Layer 3 Prisma extension)
3. AUDIT-016 PR 2 + PR 3 complete (KMS wiring + migration job)
4. Re-audit confirms zero HIGH P1 findings remain on data-layer surface

**Downgrade to FAIL would require:**
1. AUDIT-071 mitigation indefinitely deferred (active structural cross-tenant breach path remains in production code)
2. Production PHI loss event prior to AUDIT-078 G2 restore-test completion
3. Newly-discovered PHI exposure path not surfaced by this audit

**Findings register:** populated with AUDIT-071 through AUDIT-080. See `docs/audit/AUDIT_FINDINGS_REGISTER.md`.

**Phase 3: COMPLETE.** Phase 4 (operational maturity) is the next dedicated audit session.

---

*Authored 2026-05-07 in branch `chore/phase-0a-phase-3-data-layer-audit`. Severity assignments per §18 register-literal classification — no softening. AUDIT-071 dedicated mitigation PR commitment: IMMEDIATE — next work block after this audit merges. Production-ready posture is data-state-independent; "pre-onboard gate" framing rejected by operator (sixth §17.1 architectural-precedent of the arc; third caught against operator-side derivative artifacts).*
