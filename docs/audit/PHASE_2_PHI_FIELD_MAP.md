# Phase 2B — PHI Field Map

**Phase:** 2B (PHI encryption coverage)
**Date:** 2026-04-29
**Auditor:** jhart
**Source:** `backend/prisma/schema.prisma`, `backend/src/middleware/phiEncryption.ts`

---

## HIPAA reference

PHI per §164.514(b)(2) Safe Harbor identifies 18 categories of identifiers. The full list governs whether a field is PHI:

(A) Names · (B) Geographic subdivisions smaller than state · (C) Dates directly related to individual · (D) Phone numbers · (E) Fax numbers · (F) Email addresses · (G) Social Security numbers · (H) Medical record numbers · (I) Health plan beneficiary numbers · (J) Account numbers · (K) Certificate/license numbers · (L) Vehicle identifiers · (M) Device identifiers and serial numbers · (N) Web URLs · (O) IP address numbers · (P) Biometric identifiers · (Q) Full-face photos · (**R**) **Any other unique identifying number, characteristic, or code**

§164.312(a)(2)(iv) requires "encryption and decryption" of ePHI as an addressable implementation specification.

---

## Encryption architecture (verified)

| Aspect | Implementation | Verdict |
|--------|---------------|---------|
| Algorithm | AES-256-GCM | PASS — strong, includes auth tag |
| IV | `crypto.randomBytes(16)` per encryption | PASS — unique per write |
| Format | `enc:{ivHex}:{authTagHex}:{ciphertextHex}` | PASS — clearly tagged |
| Key source | `process.env.PHI_ENCRYPTION_KEY` (hex) | Defensible — Secrets Manager → ECS env var |
| Key load | Once at module init (`phiEncryption.ts:4`) | NOT rotation-safe (AUDIT-016) |
| Write hook | Prisma `$use` middleware in `applyPHIEncryption()` | PASS for create/update/upsert/createMany/updateMany |
| Read hook | Same middleware, decrypts on result | PASS |
| Decrypt failure | Returns ciphertext as-is (`phiEncryption.ts:99-101`) | FAIL — silent on tampering (AUDIT-015) |
| Demo mode | Returns plaintext, blocked outside dev/test | PASS |
| Bypass surface | 0 raw SQL on PHI tables; 0 `new PrismaClient` outside lib singleton | PASS |

---

## Per-model PHI inventory

Legend:
- ✓ encrypted = covered by `PHI_FIELD_MAP` or `PHI_JSON_FIELDS` in `phiEncryption.ts`
- ◯ hashed = one-way hash (bcrypt or sha256), not encrypted (intentional)
- ✗ plaintext = not encrypted, not hashed
- N/A = numeric / boolean / not PHI

### Patient

| Field | Type | PHI category | Status | Notes |
|-------|------|--------------|--------|-------|
| id | String | Internal ID | ✗ plaintext | cuid, not derived from individual identifiers |
| hospitalId | String | Tenant key | ✗ plaintext | required for tenant isolation queries |
| mrn | String | (H) MRN | ✓ encrypted | search-broken consequence (AUDIT-014) |
| firstName | String | (A) Name | ✓ encrypted | search-broken consequence (AUDIT-014) |
| lastName | String | (A) Name | ✓ encrypted | search-broken consequence (AUDIT-014) |
| dateOfBirth | String | (C) Date | ✓ encrypted | stored as ISO string, middleware converts Date↔string |
| gender | Gender enum | Demographic | ✗ plaintext | not in 18-identifier list |
| race | String? | Demographic | ✗ plaintext | not in 18-identifier list standalone |
| ethnicity | String? | Demographic | ✗ plaintext | not in 18-identifier list standalone |
| phone | String? | (D) Phone | ✓ encrypted | |
| email | String? | (F) Email | ✓ encrypted | |
| street | String? | (B) Geo | ✓ encrypted | |
| city | String? | (B) Geo | ✓ encrypted | |
| state | String? | (B) Geo (state OK) | ✓ encrypted | over-protective; state is allowed |
| zipCode | String? | (B) Geo | ✓ encrypted | full ZIP is PHI; first 3 digits only is OK |
| riskScore / riskCategory / lastAssessment | Float / enum / DateTime | Derived clinical | ✗ plaintext | derivative; could re-identify |
| heartFailurePatient + 5 other module booleans | Boolean | Clinical context | ✗ plaintext | true/false flags |
| mergedIntoId, mergedAt, isMerged | String? / DateTime? / Boolean | Internal tracking | ✗ plaintext | not PHI |
| **fhirPatientId** | String? | (R) Unique identifier | ✗ plaintext | **AUDIT-020 candidate**: external EHR-assigned unique ID |
| lastEHRSync | DateTime? | Operational | ✗ plaintext | not PHI |

### User (clinician PII; not PHI under HIPAA)

| Field | Type | Category | Status | Notes |
|-------|------|----------|--------|-------|
| email | String @unique | PII | ✗ plaintext | clinician account; not "individual" PHI |
| passwordHash | String | Auth | ◯ hashed | bcrypt |
| firstName / lastName / title / department / npi | String | Clinician PII | ✗ plaintext | not PHI (covered entity employees) |
| resetToken | String? | Auth credential | ◯ hashed | sha256 hashed before storage (`accountSecurity.ts:79-84`) — verified correct |
| resetTokenExpiry | DateTime? | Auth metadata | ✗ plaintext | OK |
| samlNameId / samlSessionIndex | String? | Auth identifier | ✗ plaintext | external IdP identifier |
| permission booleans (perm*) | Boolean | RBAC | ✗ plaintext | OK |

### UserMFA

| Field | Type | Category | Status | Notes |
|-------|------|----------|--------|-------|
| **secret** | String | TOTP seed | ✓ encrypted | listed in `PHI_FIELD_MAP.UserMFA` |
| **backupCodes** | String[] | Auth credentials | ◯ hashed | bcrypt-hashed in `mfaService.ts:93`; plaintext returned to user once and never stored — verified correct |
| backupCodesUsed / enabled / enabledAt | Int / Boolean / DateTime | Metadata | ✗ plaintext | OK |

### Encounter

| Field | Type | Category | Status | Notes |
|-------|------|----------|--------|-------|
| encounterNumber | String | (R) Unique ID from EHR | ✗ plaintext | candidate for AUDIT-020 |
| encounterType / status | enum | Clinical | ✗ plaintext | OK |
| startDateTime / endDateTime | DateTime | (C) Date | ✗ plaintext | dates linked to patient ID — borderline; could be re-identifying. Marginal. |
| department / location | String? | Clinical | ✗ plaintext | OK |
| **attendingProvider** | String? | Provider identity | ✓ encrypted | |
| **chiefComplaint** | String? | Clinical narrative | ✓ encrypted | |
| **primaryDiagnosis** | String? | Clinical narrative | ✓ encrypted | |
| **diagnosisCodes** | Json? | ICD-10 list | ✓ encrypted (JSON) | |
| fhirEncounterId | String? | (R) External ID | ✗ plaintext | AUDIT-020 candidate |

### Observation

| Field | Type | Category | Status | Notes |
|-------|------|----------|--------|-------|
| observationType (LOINC) | String | Coded clinical | ✗ plaintext | required for query/index |
| **observationName** | String | Clinical narrative | ✓ encrypted | |
| **valueText** | String? | Clinical value | ✓ encrypted | |
| valueNumeric / valueBoolean / unit | Float / Bool / String | Clinical value | ✗ plaintext | numeric, can't easily encrypt-and-search |
| referenceRangeLow / High / isAbnormal | numeric / Bool | Reference data | ✗ plaintext | OK |
| **orderingProvider** | String? | Provider identity | ✓ encrypted | |
| performingLab | String? | Org identity | ✗ plaintext | OK (org, not individual) |
| fhirObservationId | String? | (R) External ID | ✗ plaintext | AUDIT-020 candidate |

### Order

| Field | Type | Category | Status |
|-------|------|----------|--------|
| **orderName / indication / instructions / orderingProvider** | String | Clinical narrative + provider | ✓ encrypted |
| orderType / orderCode (CPT) / status / priority | enum / coded | Clinical | ✗ plaintext (OK) |
| fhirOrderId | String? | (R) | ✗ plaintext (AUDIT-020) |

### Medication

| Field | Type | Category | Status |
|-------|------|----------|--------|
| **medicationName / genericName / prescribedBy** | String | Clinical | ✓ encrypted |
| rxNormCode / ndc / drugClass | coded | Clinical | ✗ plaintext (OK) |
| dose / doseValue / doseUnit / route / frequency | String / Float | Clinical | ✗ plaintext |
| status | enum | Status | ✗ plaintext |
| discontinuedReason | String? | Free-text | ✗ plaintext (could carry clinical narrative; P3 marginal) |
| fhirMedicationId | String? | (R) | ✗ plaintext (AUDIT-020) |

### Condition

| Field | Type | Category | Status |
|-------|------|----------|--------|
| **conditionName / recordedBy** | String | Clinical | ✓ encrypted |
| icd10Code / snomedCode | coded | Clinical | ✗ plaintext (required for query) |
| severity | String? | Clinical | ✗ plaintext (small enum) |
| onsetDate / abatementDate / recordedDate | DateTime? | (C) Date | ✗ plaintext (borderline) |
| fhirConditionId | String? | (R) | ✗ plaintext (AUDIT-020) |

### AllergyIntolerance, Procedure, DeviceImplant

All FHIR resource models. Pattern: free-text fields (`substanceName`, `procedureName`, `performedBy`) are NOT in `PHI_FIELD_MAP`; coded fields (CPT/RxNorm/SNOMED) are not PHI by themselves. fhir*Id fields are AUDIT-020 candidates.

| Model | Free-text not encrypted | AUDIT-020 ID field |
|-------|------------------------|---------------------|
| AllergyIntolerance | substanceName | fhirAllergyId |
| Procedure | procedureName, performedBy | fhirProcedureId |
| DeviceImplant | manufacturer, modelNumber (not strictly PHI) | fhirDeviceId |

### LoginSession (active session model)

| Field | Type | Category | Status |
|-------|------|----------|--------|
| sessionToken | String @unique | Auth credential | ◯ hashed | stores SHA-256(token) per `auth.ts:91`. Verified. |
| ipAddress | String | (O) IP | ✗ plaintext | per HIPAA, IP is in 18-identifier list when linked to user. Operational tradeoff. |
| userAgent | String? | Browser fingerprint | ✗ plaintext | borderline |
| location | String? | Geo derivation | ✗ plaintext | borderline |

### UserSession (DEAD MODEL — AUDIT-021)

Schema-defined but only one reference outside the schema (`mfaService.ts:27` comment marks it as awaiting migration). `LoginSession` is the active model. Recommendation: drop or document.

### AuditLog

| Field | Status | Notes |
|-------|--------|-------|
| hospitalId / userId / userEmail / userRole / ipAddress | ✗ plaintext | record metadata, defensible |
| action / resourceType / resourceId / patientId | ✗ plaintext | metadata |
| **description** | ✗ plaintext | **AUDIT-018**: field accepts arbitrary input. Today's `writeAuditLog` callers all pass non-PHI templated strings (e.g. "Successful login: SUPER_ADMIN at hospitalId"); future callers could write PHI. |
| **previousValues / newValues / metadata** | ✓ encrypted (JSON) | |

### WebhookEvent

| Field | Status | Notes |
|-------|--------|-------|
| **rawPayload** | ✓ encrypted (JSON) | full FHIR bundle |
| processedData | ✗ plaintext | currently dead column (only cleared during DSAR cascade); if populated in future, requires addition to `PHI_JSON_FIELDS`. INFO. |
| eventType / eventId / sourceSystem / status | ✗ plaintext | metadata |

### FailedFhirBundle

| Field | Status | Notes |
|-------|--------|-------|
| originalPath | ✗ plaintext | S3 path may contain patient identifiers in key names. AUDIT-019. |
| errorMessage | ✗ plaintext | typically contains failing FHIR fragment. AUDIT-019. |

### Alert, CrossReferral, InterventionTracking, CarePlan, BreachIncident

All have key narrative fields encrypted per `PHI_FIELD_MAP` + `PHI_JSON_FIELDS`. Reviewed; no missing-encryption gaps beyond the AUDIT-018 / AUDIT-020 patterns already noted.

| Model | Encrypted (string) | Encrypted (JSON) | Plaintext narrative? |
|-------|-------------------|------------------|----------------------|
| Alert | message | triggerData | title not encrypted (P3 marginal) |
| CrossReferral | reason, notes | triggerData | OK |
| InterventionTracking | interventionName, indication, performingProvider, outcome | findings, complications, outcomes | technique, followUpPlan plaintext (P3) |
| CarePlan | title | goals, activities, careTeam | description plaintext (P3) |
| BreachIncident | description | — | internalNotes, rootCause, containmentActions, remediationPlan plaintext (P2 — sensitive investigation data) |

---

## Summary statistics

- **Models with PHI fields:** 21
- **String fields covered by `PHI_FIELD_MAP`:** ~40 across 14 models
- **JSON fields covered by `PHI_JSON_FIELDS`:** ~25 across 15 models
- **AUDIT-020 candidates (external `fhir*Id`):** ~8 fields
- **AUDIT-018 candidate (description fields accepting PHI):** 1 (AuditLog)
- **AUDIT-019 candidate (raw FHIR error fragments):** 2 fields (FailedFhirBundle)
- **Search-broken fields (AUDIT-014):** 4 (firstName, lastName, mrn, email — all queried via `contains` in `routes/patients.ts:81-86`)

---

## Cross-references

- `docs/audit/PHASE_2_REPORT.md` (this PR's deliverable, in progress)
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` (will receive AUDIT-014 through AUDIT-021)
- `backend/src/middleware/phiEncryption.ts` (single source of truth for encryption logic)
- HIPAA Security Rule §164.312(a)(2)(iv) (encryption requirement)
- HIPAA Privacy Rule §164.514(b)(2) (Safe Harbor 18 identifiers)
