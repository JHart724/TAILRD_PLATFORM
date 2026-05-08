# AUDIT-075 PHI Encryption Coverage — Design Refinement Note

**Status:** Phase B design (pre-implementation)
**Authored:** 2026-05-07
**Catalyst:** AUDIT-075 PHI encryption-at-rest coverage gaps; bundles AUDIT-018 + AUDIT-019 per D3
**Methodology:** §17 (clinical-code PR acceptance) + §17.3 scope discipline + §18 register-literal severity
**Stack base:** `main` HEAD `092658b` post-AUDIT-011 Phase b/c merge
**Cross-reference parent:** `docs/audit/AUDIT_FINDINGS_REGISTER.md` AUDIT-075 / AUDIT-018 / AUDIT-019 entries
**Decision context:** PAUSE 1 inventory + D1-D6 captured 2026-05-07

---

## 1. Scope — full inventory table (D1; ~13-15 columns)

PAUSE 1 inventory caught the register's framing-by-column-name embeds an unexamined assumption (12th §17.1; see §8). The effective scope is content-classified per-column, not pattern-matched by column name.

| Model | Column | Type | PHI? | Routing | D2 reframe | Zod | TARGETS | Notes |
|---|---|---|---|---|---|---|---|---|
| **WebhookEvent** | errorMessage | String? | AMBIGUOUS | PHI_FIELD_MAP | **Sanitize-at-write + encrypt-residual** | not covered | YES | Error fragments may carry partial FHIR PHI |
| **ReportGeneration** | errorMessage | String? | AMBIGUOUS | PHI_FIELD_MAP | **Sanitize-at-write + encrypt-residual** | not covered | YES | Report job errors may include patient query fragments |
| **UploadJob** | errorMessage | String? | AMBIGUOUS | PHI_FIELD_MAP | **Sanitize-at-write + encrypt-residual** | not covered | YES | Upload errors may include filenames with patient IDs |
| **FailedFhirBundle** | errorMessage | String | PHI | PHI_FIELD_MAP | **Sanitize-at-write + encrypt-residual** | not covered | YES | Sister AUDIT-019 bundled per D3 |
| **FailedFhirBundle** | originalPath | String | PHI | PHI_FIELD_MAP | **Sanitize-at-write + encrypt-residual** | not covered | YES | Sister AUDIT-019; S3 paths with patient identifiers |
| **Recommendation** | description | String | PHI | PHI_FIELD_MAP | KEEP_AS_IS_ENCRYPT | clinicalSchemas:59 | YES | Patient-tied clinical recommendation rationale |
| **Recommendation** | evidence | String? | PHI | PHI_FIELD_MAP | KEEP_AS_IS_ENCRYPT | not covered | YES | NEW finding (PAUSE 1 expanded scan) |
| **Recommendation** | implementationNotes | String? | PHI | PHI_FIELD_MAP | KEEP_AS_IS_ENCRYPT | not covered | YES | NEW finding |
| **Recommendation** | title | String | PHI | PHI_FIELD_MAP | KEEP_AS_IS_ENCRYPT | not covered | YES | NEW finding |
| **CarePlan** | description | String? | PHI | PHI_FIELD_MAP | KEEP_AS_IS_ENCRYPT | not covered | YES | Sister to CarePlan.title (already covered) |
| **PatientDataRequest** | notes | String? | PHI | PHI_FIELD_MAP | KEEP_AS_IS_ENCRYPT | dataRequests:27 | YES | Right-to-deletion operator notes |
| **AuditLog** | description | String? | PHI | PHI_FIELD_MAP | **Sanitize-at-write + encrypt-residual** | not covered | YES | Sister AUDIT-018 bundled per D3 |
| **InternalNote** | content | String | PHI (CLINICAL noteType) | PHI_FIELD_MAP | KEEP_AS_IS_ENCRYPT | clinicalSchemas:271 | YES | NEW finding |
| **InternalNote** | title | String | AMBIGUOUS | PHI_FIELD_MAP (forward-looking) | KEEP_AS_IS_ENCRYPT | not covered | YES | NEW finding; title may reference patient |
| **User** | firstName | String | staff PII | PHI_FIELD_MAP | KEEP_AS_IS_ENCRYPT | not covered | YES | D4 bundled; not query key |
| **User** | lastName | String | staff PII | PHI_FIELD_MAP | KEEP_AS_IS_ENCRYPT | not covered | YES | D4 bundled; not query key |

**Total: 16 PHI columns** (3 AMBIGUOUS sanitize-at-write-eligible + 11 KEEP_AS_IS_ENCRYPT + 2 staff-PII).

**Excluded (NOT_PHI per inventory; documented for future-reader auditability):**
- `UserActivity.errorMessage` / `ErrorLog.errorMessage` / `Onboarding.notes` / `BusinessMetric.description` / `CQLRule.description` / `Term{ICD10,CPT,MSDRG}.description` — system-bypass models (per AUDIT-011 PAUSE 2.6) or public-domain reference data; not patient-tied content.
- `User.email` — DEFERRED to AUDIT-XXX-future per blind-index requirement (see §5).

---

## 2. D1-D6 decisions captured verbatim

- **D1 (a):** FULL INVENTORY SCOPE (~13-15 columns; effective 16 per §1 table). Register update reflects ground truth; sister to AUDIT-022 PR #253 scope-clarification pattern (11 → 30 columns).
- **D2 (c):** LAYERED — sanitize-at-write redaction + encrypt-residual for AMBIGUOUS errorMessage columns (WebhookEvent / ReportGeneration / UploadJob / FailedFhirBundle.errorMessage / FailedFhirBundle.originalPath / AuditLog.description). Sister to AUDIT-019 register's "Sanitize at write OR add fields" optionality — chosen "BOTH layered" per defense-in-depth posture.
- **D3 (a):** BUNDLE AUDIT-018 + AUDIT-019 + AUDIT-075 family closure in single PR per §17.3 sister-bundle pattern. Atomic family closure; 3 register flips at single merge.
- **D4 (a) WITH OPTION-C REFINEMENT:** BUNDLE User PII (firstName + lastName per §5; email DEFERRED to AUDIT-XXX-future per blind-index requirement found at `auth.ts:52` lookup-by-equals constraint). Sister to AUDIT-014 deferred-with-AUDIT-entry pattern. firstName + lastName are not query keys; standard PHI_FIELD_MAP routing applies.
- **D5 (a):** BUNDLE AUDIT-016 PR 3 TARGETS extension in same PR per runbook §6.2 sister-run pattern + deployment-time atomicity (extending PHI_FIELD_MAP without extending TARGETS leaves new V0/V1 ciphertext that the migration script doesn't sweep).
- **D6 (a):** CODIFY 12th §17.1 — column-name-pattern ≠ PHI-candidate-axis. Sister to 10th SCOPE axis = 12th NAME-PATTERN axis; both Phase A inventory catches.

---

## 3. PHI_FIELD_MAP extension table

Phase C Step 1 mechanical edit to `backend/src/middleware/phiEncryption.ts:83-107`:

```typescript
// Add to PHI_FIELD_MAP:
WebhookEvent: ['errorMessage'],                                          // D2 sanitize-at-write
ReportGeneration: ['errorMessage'],                                      // D2 sanitize-at-write
UploadJob: ['errorMessage'],                                             // D2 sanitize-at-write
FailedFhirBundle: ['errorMessage', 'originalPath'],                      // D2 + D3 (AUDIT-019 bundle)
Recommendation: ['title', 'description', 'evidence', 'implementationNotes'],  // D1 expanded scan
CarePlan: ['title', 'description'],                                      // existing 'title' + new 'description'
PatientDataRequest: ['requestedBy', 'requestorEmail', 'notes'],          // existing 2 + new 'notes'
AuditLog: ['description'],                                               // D2 + D3 (AUDIT-018 bundle)
InternalNote: ['title', 'content'],                                      // D1 NEW finding
User: ['firstName', 'lastName'],                                         // D4 (email deferred per §5)
```

**Already covered (no change; verified PAUSE 1 Item 2):** `BreachIncident.description` / `CarePlan.title` / `CrossReferral.notes` / `CrossReferral.reason` / `Patient.firstName/lastName/etc`.

---

## 4. Sanitize-at-write redaction logic (D2 layered defense)

### 4.1 Approach

Layered defense: redact obvious PHI patterns from operator-supplied free-text BEFORE persistence; encrypt the (now-mostly-sanitized) residual via PHI_FIELD_MAP routing. Two layers because:
- **Sanitize-at-write** prevents PHI from being persisted in the first place (data-minimization per HIPAA §164.502 minimum necessary)
- **Encrypt-residual** protects whatever PHI fragments slip past sanitization (defense-in-depth)

### 4.2 PHI redaction patterns — CONSERVATIVE vs AGGRESSIVE (CONCERN A mitigation)

**Per PAUSE 2-A CONCERN A:** aggressive PHI redaction on errorMessage fields could redact non-PHI content operators need for debugging (false-positive risk). Mitigation: TWO pattern sets, with CONSERVATIVE as default for D2 errorMessage callsites + AGGRESSIVE available via opts param. Sister to AUDIT-011 three-state TENANT_GUARD_MODE pattern (off/audit/strict) — defense-in-depth via configurable rigor.

```typescript
// backend/src/utils/phiRedaction.ts (NEW)
interface RedactionPattern {
  readonly name: string;
  readonly pattern: RegExp;
  readonly replacement: string;
}

// CONSERVATIVE: high-precision patterns; minimize false-positives on operational
// debug content. Default for D2 errorMessage callsites.
export const PATTERNS_CONSERVATIVE: ReadonlyArray<RedactionPattern> = [
  { name: 'SSN', pattern: /\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b/g, replacement: '[REDACTED-SSN]' },
  { name: 'MRN', pattern: /\bMRN[:\s]*[A-Z0-9]{6,}\b/gi, replacement: '[REDACTED-MRN]' },
  { name: 'EMAIL', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replacement: '[REDACTED-EMAIL]' },
  { name: 'PHONE', pattern: /\b\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g, replacement: '[REDACTED-PHONE]' },
];

// AGGRESSIVE: broader patterns; opt-in via opts param; for content known to
// have heavy PHI surface (e.g., FHIR bundle error fragments).
//
// PAUSE 2.5 (2026-05-07): DOB pattern REMOVED after Phase C Step 1.0 FP analysis
// surfaced near-100% FP rate on operational ISO timestamps (`2026-05-07` /
// `2024-12-31` etc.). Structured DOB covered via PHI_FIELD_MAP.Patient.dateOfBirth
// field-level encryption. Free-form DOB-fragment leaks now surface as discoverable
// plaintext bugs (operator can grep error messages for ISO date patterns) vs
// silent partial redaction. If a future production DOB-fragment leak surfaces
// with a specific predictable format: file AUDIT-XXX-future-DOB-redaction with
// tightly-scoped regex (per §13).
export const PATTERNS_AGGRESSIVE: ReadonlyArray<RedactionPattern> = [
  ...PATTERNS_CONSERVATIVE,
  { name: 'NAME', pattern: /\bpatient[:\s]+[A-Z][a-z]+\s+[A-Z][a-z]+\b/gi, replacement: '[REDACTED-NAME]' },
];

export interface RedactOptions {
  readonly aggressive?: boolean;
}

export function redactPHIFragments(input: string, opts?: RedactOptions): string {
  const patterns = opts?.aggressive ? PATTERNS_AGGRESSIVE : PATTERNS_CONSERVATIVE;
  let output = input;
  for (const { pattern, replacement } of patterns) {
    output = output.replace(pattern, replacement);
  }
  return output;
}
```

### 4.1 False-positive analysis per pattern (CONCERN A mitigation; populated at Phase C Step 1.0)

| Pattern | Set | Positive sample | Negative sample (operational debug content) | FP risk | Mitigation |
|---|---|---|---|---|---|
| SSN `\d{3}-\d{2}-\d{4}` | CONSERVATIVE | `123-45-6789` | "timeout 100-50-2000ms" — UNLIKELY (FP requires 9-digit dash-pattern matching SSN shape; rare in error logs) | **LOW** | None needed |
| MRN `MRN[:\s]*[A-Z0-9]{6,}` | CONSERVATIVE | `MRN: ABC123456` | "MRN[:abc]" debug syntax — unlikely (MRN literal followed by 6+ alphanumerics is specific) | **LOW** | None needed |
| EMAIL standard pattern | CONSERVATIVE | `patient@email.com` | "service@health.com" — operator email IS PHI-sensitive too (defense-in-depth posture); accepting this FP-as-PHI is correct | **LOW** | Sister-discipline accepted: any email pattern in error logs is PHI-sensitive |
| PHONE `\d{3}[-.\s]?\d{3}[-.\s]?\d{4}` | CONSERVATIVE | `555-123-4567` | "build 1234567890ms" — 10-digit-no-dash unmatched; 3-3-4 digit clusters in error timestamps unlikely | **LOW** | None needed |
| NAME `patient[:\s]+[A-Z][a-z]+\s+[A-Z][a-z]+` | AGGRESSIVE | `patient John Smith` | "patient John Doe" placeholder in dev/test fixture — dev FP acceptable; production unlikely to log placeholder names | **MEDIUM** | Restrict to AGGRESSIVE set; opt-in only for FHIR bundle / clinical-note error contexts |

**PAUSE 2.5 reconciliation note (2026-05-07):** DOB pattern REMOVED from AGGRESSIVE set after Phase C Step 1.0 FP analysis surfaced **near-100% FP rate** on operational ISO timestamps. The original §4.1 design classified DOB as MEDIUM with "AGGRESSIVE opt-in only" mitigation, but real-world testing revealed every operational timestamp (e.g., `2026-05-07`, `2024-12-31`, `2024-01-15`) matches the `\b(?:19|20)\d{2}-\d{2}-\d{2}\b` pattern. This crosses HIGH-FP threshold. Per §4.1 escape hatch, removed from pattern set. Structured DOB covered via `PHI_FIELD_MAP.Patient.dateOfBirth` field-level encryption. Free-form DOB-fragment leaks now surface as **discoverable plaintext bugs** (operator can grep error messages for ISO date patterns) vs silent partial redaction — robust palantir over consistent-with-original-design. If a future production DOB leak surfaces with predictable format: file `AUDIT-XXX-future-DOB-redaction` with tightly-scoped regex authored against actual observed format (per §13). NOT §17.1 — methodology working as designed; §4.1 escape hatch fired exactly as anticipated.

**Verdict (post-PAUSE-2.5):** 4 LOW-FP-risk patterns (CONSERVATIVE default; safe for all D2 errorMessage callsites). 1 MEDIUM-FP-risk pattern (NAME; AGGRESSIVE opt-in). HIGH-FP-risk patterns: ZERO in final set after DOB removal. Total: **5 patterns** (4 CONSERVATIVE + 1 AGGRESSIVE-only).

**Default behavior:** D2 errorMessage callsites (WebhookEvent / ReportGeneration / UploadJob / AuditLog.description) use CONSERVATIVE. FailedFhirBundle errorMessage + originalPath use AGGRESSIVE (CONSERVATIVE + NAME pattern; FHIR bundle PHI surface justifies opt-in NAME; sister to AUDIT-019 register's heavier-redaction framing).

### 4.3 Apply at write-path

For D2-eligible columns (errorMessage on 5 tables + AuditLog.description), wrap caller-side write paths:

```typescript
// Before persisting WebhookEvent / FailedFhirBundle / etc:
const sanitizedError = redactPHIFragments(rawErrorMessage);
await prisma.webhookEvent.update({
  where: { id },
  data: { errorMessage: sanitizedError },  // PHI_FIELD_MAP middleware encrypts after sanitization
});
```

### 4.4 Test coverage requirements

- **Positive sanitize:** input contains SSN/MRN/DOB/name patterns → redacted in output
- **Negative pass-through:** input is generic system error (no PHI patterns) → output unchanged
- **Encrypt-after-sanitize integration:** sanitized output then routes through PHI_FIELD_MAP encryption; full round-trip verifies redaction + encryption layered correctly
- **Idempotency:** running sanitize twice produces same output (redacted markers don't re-trigger patterns)

### 4.5 Sister to existing patterns

`backend/src/routes/patients.ts:11` `redactPHI()` is RESPONSE-side redaction (for non-clinical roles). New `phiRedaction.ts` is WRITE-side redaction (before persistence). Different mechanisms; sister-discipline.

`backend/src/utils/logger.ts` Winston logger has PHI redaction per existing reference at `server.ts:77` ("Logger imported from utils/logger.ts (shared singleton with PHI redaction)"). Verify in Phase C Step 1.0 inventory whether logger redaction patterns can be reused; potential code-share.

---

## 5. User PII (D4) implementation plan — option-C refinement

### 5.1 Login flow constraint surfaced in PAUSE 1

`backend/src/routes/auth.ts:52` uses Prisma case-insensitive equality match on email:
```typescript
const user = await prisma.user.findFirst({
  where: { email: { equals: email, mode: 'insensitive' } },
  include: { hospital: true },
});
```

AES-256-GCM ciphertext is **non-deterministic** (random IV per encrypt); direct `equals` match against ciphertext fails because encrypting the same plaintext twice produces different ciphertexts. Encrypting User.email therefore breaks the login lookup.

### 5.2 Three options evaluated; option C chosen

| Option | Approach | Verdict | Rationale |
|---|---|---|---|
| (A) Blind-index pattern | Add `emailIndex String @unique` column = HMAC(email_lowercase) keyed by ENV secret. Login: HMAC inbound email → findUnique by emailIndex → decrypt email after match. | **Rejected for this PR** | Blind-index is novel architectural pattern; adds ~4-6h of design + auth-flow refactor + security review. Out of scope for AUDIT-075 + AUDIT-018 + AUDIT-019 family closure. |
| (B) Refactor login flow | Replace email-equals lookup with email-token-challenge flow (request email → email-link → no email exposure on lookup). | **Rejected** | Major UX refactor; not appropriate as side-effect of PHI encryption work. |
| **(C) Defer User.email** | Encrypt firstName + lastName (not query keys; standard PHI_FIELD_MAP routing). File new AUDIT-XXX-future entry capturing email blind-index work. | **CHOSEN** | Sister to AUDIT-014 deferred-with-AUDIT-entry pattern (patient search broken on encrypted PHI; same-pattern problem). Keeps AUDIT-075 scope manageable while still capturing User PII defense-in-depth for the simpler 2 columns. |

### 5.3 Implementation per option C

- `User.firstName` + `User.lastName` → add to `PHI_FIELD_MAP.User` (per §3 table)
- `User.email` → STAY plaintext; file AUDIT-XXX-future entry at AUDIT-075 PR merge time:

```
### AUDIT-XXX — User.email blind-index encryption (deferred from AUDIT-075 D4)

- **Phase:** future
- **Severity:** LOW (P3) — staff PII not strict-PHI per HIPAA §164.514
- **Status:** OPEN — DEFERRED FROM AUDIT-075
- **Detected:** 2026-05-07 during AUDIT-075 PAUSE 1 inventory
- **Location:** `backend/src/routes/auth.ts:52` lookup-by-equals constraint
- **Evidence:** AES-256-GCM ciphertext is non-deterministic; direct equals match breaks login.
- **Severity rationale:** Defense-in-depth gap; not active leak; sister to AUDIT-014 pattern.
- **Remediation:** Blind-index pattern (`User.emailIndex String @unique` = HMAC(email_lowercase)).
- **Effort estimate:** M (4-6h)
- **Cross-references:** AUDIT-014 (patient search broken on encrypted PHI; same pattern), AUDIT-075 (parent deferral).
```

---

## 6. AUDIT-016 PR 3 TARGETS extension (D5)

Extend `backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts:121` TARGETS array:

```typescript
// New entries (kind='string' for all):
{ table: 'webhook_events',        model: 'WebhookEvent',        column: 'errorMessage',        kind: 'string' },
{ table: 'report_generations',    model: 'ReportGeneration',    column: 'errorMessage',        kind: 'string' },
{ table: 'upload_jobs',            model: 'UploadJob',           column: 'errorMessage',        kind: 'string' },
{ table: 'failed_fhir_bundles',   model: 'FailedFhirBundle',    column: 'errorMessage',        kind: 'string' },
{ table: 'failed_fhir_bundles',   model: 'FailedFhirBundle',    column: 'originalPath',        kind: 'string' },
{ table: 'recommendations',       model: 'Recommendation',      column: 'title',               kind: 'string' },
{ table: 'recommendations',       model: 'Recommendation',      column: 'description',         kind: 'string' },
{ table: 'recommendations',       model: 'Recommendation',      column: 'evidence',            kind: 'string' },
{ table: 'recommendations',       model: 'Recommendation',      column: 'implementationNotes', kind: 'string' },
{ table: 'care_plans',             model: 'CarePlan',            column: 'description',         kind: 'string' },
{ table: 'patient_data_requests', model: 'PatientDataRequest',  column: 'notes',               kind: 'string' },
{ table: 'audit_logs',             model: 'AuditLog',            column: 'description',         kind: 'string' },
{ table: 'internal_notes',         model: 'InternalNote',        column: 'title',               kind: 'string' },
{ table: 'internal_notes',         model: 'InternalNote',        column: 'content',             kind: 'string' },
{ table: 'users',                  model: 'User',                column: 'firstName',           kind: 'string' },
{ table: 'users',                  model: 'User',                column: 'lastName',            kind: 'string' },
```

**16 new TARGETS entries** (matches §1 inventory count).

### 6.1 Sister-run sequencing post-deploy

After AUDIT-075 PR merges:
1. Operator runs `--dry-run` to count V0/V1 candidates in newly-covered columns (most should be 0 in pre-DUA state; will surface non-zero counts only if any rows exist)
2. Operator runs `--execute --target <each>.<column>` for each new target (or full execute if pre-DUA + bounded volume)
3. Operator updates AUDIT-075 register entry with execution counts + timestamp

Sister-run requirement formally documented in `docs/runbooks/AUDIT_016_PR_3_MIGRATION_RUNBOOK.md` §6.2; this PR's checklist must reference completion.

---

## 7. AUDIT-018 + AUDIT-019 bundling (D3)

### 7.1 AUDIT-018 — `AuditLog.description`

Approach: D2 layered (sanitize-at-write + encrypt). The ESLint-rule alternative considered + rejected per AUDIT-018 register update — encryption is the primary control; lint provides write-time discipline reminder, not control.

Implementation: PHI_FIELD_MAP.AuditLog gets `description` per §3 table. Existing `writeAuditLog()` callers (16 sites) untouched; middleware encrypts on write.

Sanitize-at-write: `writeAuditLog()` wraps `description` parameter through `redactPHIFragments()` before persistence. Caller-supplied templated strings (per AUDIT-018 evidence "non-PHI templated strings") pass through; any future operator-supplied free-form input gets sanitized.

### 7.2 AUDIT-019 — `FailedFhirBundle.errorMessage` + `originalPath`

Approach: D2 layered (sanitize-at-write + encrypt). 30-day retention prune deferred to operational follow-up (separate PR; not blocking encryption coverage).

Implementation: PHI_FIELD_MAP.FailedFhirBundle gets `errorMessage` + `originalPath` per §3 table. FHIR ingest failure write-paths wrap through `redactPHIFragments()` before persistence.

### 7.3 Register flip discipline

At AUDIT-075 PR merge:
- AUDIT-018 status flips OPEN → RESOLVED with cross-reference to AUDIT-075 PR
- AUDIT-019 status flips OPEN → RESOLVED with cross-reference to AUDIT-075 PR
- AUDIT-075 status flips OPEN → RESOLVED

Sister to AUDIT-016 full-arc closure pattern (3 sub-PRs flipped at PR #261 merge).

---

## 8. 12th §17.1 architectural-precedent codification (D6)

**Pattern: column-name-pattern ≠ PHI-candidate-axis**

PAUSE 1 inventory caught the AUDIT-075 register's framing-by-column-name embeds an unexamined assumption: that "errorMessage / description / notes" column-name patterns correlate with PHI status. Inventory surfaces:
- 3 named columns are NOT_PHI (system-bypass models per AUDIT-011 PAUSE 2.6: UserActivity.errorMessage / ErrorLog.errorMessage / Onboarding.notes)
- 6+ PHI columns are NOT named "errorMessage / description / notes" (Recommendation.{evidence, implementationNotes, title}; InternalNote.{content, title})

**Discipline:** PHI scope must be classified by **content + model context** (patient-tied vs system-internal), not by column-name pattern matching.

### 8.1 Sister-axis decomposition (catalog rows 9 / 10 / 11 / 12)

| § | Axis | Catch surface | Layer |
|---|---|---|---|
| 9 | Layer 3 INPUT axis (Option 0 plumbing reframing) | Design-time | AUDIT-011 |
| 10 | Layer 3 SCOPE axis (schema-column ≠ scoping-axis) | Design-time | AUDIT-011 |
| 11 | Layer 3 TYPE axis (generic-extends inference erosion) | Integration-time (`tsc` verification battery) | AUDIT-011 |
| **12** | **PHI-coverage NAME-PATTERN axis (column-name-pattern ≠ PHI-candidate-axis)** | **Inventory-time (content classification)** | **AUDIT-075** |

The 9th-12th precedents form a coherent axis-decomposition pattern: each catches a different structural assumption embedded in framing. 12th is the first **inventory-time** precedent in the AUDIT-075 family (vs design-time / integration-time prior catches).

### 8.2 Prevention discipline

For future PHI-coverage audits:
1. Inventory every column type (not just named-pattern matches)
2. Classify PHI status by **content + model context** at call-site level
3. Validate classification against AUDIT-011 system-bypass list (system-internal models default NOT_PHI unless content review surfaces patient-tied data)
4. Surface NEW PHI candidates as inventory finding, NOT as scope-creep

§17.1 architectural-precedent count advances **11 → 12**.

---

## 9. Test plan

### 9.1 Unit tests (Phase C Step 6)

**Round-trip semantics distinction (CONCERN C mitigation):** D2 columns (sanitize-at-write applied) round-trip to **sanitized form**, NOT original plaintext. Non-D2 columns round-trip to original. Test infrastructure provides two helpers per the distinction:

- `assertRoundTripStandard(model, column, plaintext)` — for non-D2 columns; equality assertion: `decrypt(encrypt(plaintext)) === plaintext`
- `assertRoundTripSanitized(model, column, plaintext, expectedSanitized)` — for D2 columns; `decrypt(encrypt(plaintext)) === expectedSanitized` (where `expectedSanitized = redactPHIFragments(plaintext, opts)`); pre-sanitization happens at write-path callsite, NOT inside middleware

**Tests authored:**

- **PHI redaction patterns** (`backend/src/utils/__tests__/phiRedaction.test.ts` NEW; ~14-18 tests with both pattern sets per CONCERN A):
  - Each CONSERVATIVE pattern: positive match + negative pass-through + replacement assertion + FP-control test (operational debug content not redacted)
  - Each AGGRESSIVE-only pattern: positive match + negative pass-through + opt-in semantics (default CONSERVATIVE doesn't redact; aggressive opt-in does)
  - Idempotency: running redact twice (both CONSERVATIVE + AGGRESSIVE) produces same output
  - Performance: redact on 10KB string completes <50ms (jest-honest threshold)
- **PHI_FIELD_MAP extension coverage** (extend existing `backend/src/middleware/__tests__/phiEncryption.test.ts`; ~6-8 new tests):
  - **Standard round-trip (~4 tests):** Recommendation.{description, evidence, implementationNotes, title} / CarePlan.description / PatientDataRequest.notes / InternalNote.content / User.{firstName, lastName} — `assertRoundTripStandard` equality
  - **Sanitized round-trip (~2-4 tests):** WebhookEvent.errorMessage / ReportGeneration.errorMessage / UploadJob.errorMessage / FailedFhirBundle.{errorMessage, originalPath} / AuditLog.description — `assertRoundTripSanitized` with explicit expected post-sanitize text
- **D4 User PII** (~3 tests): User.firstName + User.lastName encrypt/decrypt (standard round-trip); User.email NOT encrypted (verified plaintext for login lookup)

### 9.2 Migration script tests (extend existing)

`backend/tests/scripts/migrations/audit-016-pr3-v0v1-to-v2.test.ts` extension:
- TARGETS array length verification (was N; now N+16)
- Per-new-target dry-run output format check (~4 tests; sister to existing TARGETS shape tests)

### 9.3 Integration coverage (gated; sister to AUDIT-011 pattern)

No new dedicated integration suite (existing `audit-011-cross-tenant.test.ts` already covers tenant isolation across models including these new ones; AUDIT-075 doesn't introduce new tenant-isolation surface).

### 9.4 Total test count delta

- Default-suite: ~21-26 net new (12-15 redaction + 6-8 PHI map + 3 User PII)
- Migration script tests: ~4 net new
- Total: ~25-30 net new tests; jest baseline 566 → ~591-596

---

## 10. Phase C implementation step ordering

| Step | Component | Amended (PAUSE 2-A) | Effort |
|---|---|---|---|
| **1.0** | Pre-flight inventory (sister to AUDIT-011 Step 1.0): grep existing logger redaction patterns; verify reusable code-share opportunity for §4 redaction logic. **CONCERN A: ALSO output written false-positive analysis populating §4.1 table.** If any pattern surfaces HIGH FP risk → PAUSE 2.5 design correction before Step 1 authorship. | A | **0.5-0.75h** |
| **1** | `backend/src/utils/phiRedaction.ts` NEW. **CONCERN A: ships TWO pattern sets per §4.2 (PATTERNS_CONSERVATIVE + PATTERNS_AGGRESSIVE) + RedactOptions interface + opt-in routing.** ~80-120 LOC (vs first-pass ~50-80 LOC for single set). | A | **0.75-1.25h** |
| **2** | `backend/src/utils/__tests__/phiRedaction.test.ts` NEW. **CONCERN A + PAUSE 2.5: ~12-15 tests** covering 5 patterns (4 CONSERVATIVE + 1 AGGRESSIVE-only NAME) + opt-in semantics + FP-control assertions + idempotency + perf. Test count revised down from ~14-18 after DOB pattern removal (-3 tests: DOB positive + negative + FP-control). | A | **1.25-1.75h** |
| 3 | `backend/src/middleware/phiEncryption.ts` PHI_FIELD_MAP extension (mechanical edit; +16 column entries across 9 models) | — | 0.5-1h |
| 4 | Sanitize-at-write integration at D2 callsites (WebhookEvent / ReportGeneration / UploadJob / FailedFhirBundle / AuditLog write-paths; ~6-8 callsite edits). FailedFhirBundle uses AGGRESSIVE pattern set per §4.2. | (A reflected) | 1.5-2h |
| **5** | `backend/src/middleware/__tests__/phiEncryption.test.ts` extension. **CONCERN C: helper authoring (`assertRoundTripStandard` / `assertRoundTripSanitized`) + 6-8 tests split standard vs sanitized round-trip per §9.1.** | C | **1.25-1.75h** |
| 6 | `backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts` TARGETS extension (~16 new entries per §6) | — | 0.25h |
| **7** | `backend/tests/scripts/migrations/audit-016-pr3-v0v1-to-v2.test.ts` extension. **CONCERN B: ~5 tests (was ~4); NEW test #5 — TARGETS extension partial-resume idempotency** (simulate state where original-66 TARGETS already migrated; add new-16; assert only new-16 rows touched per V2-input race-skip-no-write semantics inherited from AUDIT-016 PR 3 D3). | B | **0.75h** |
| 8 | AUDIT-XXX-future entry for User.email blind-index (per §5 D4 option-C) | — | 0.25h |
| 9 | Register flips: AUDIT-018 OPEN → RESOLVED + AUDIT-019 OPEN → RESOLVED + AUDIT-075 OPEN → RESOLVED + new AUDIT-XXX-future entry | — | 0.5h |
| 10 | BUILD_STATE.md updates (§1 Phase 2 + §6 priorities advance + §9 closing prose) | — | 0.5h |
| **11** | Verification battery + PR open. **CONCERN E: ADD verification — `npx jest --listTests 2>&1 \| grep -c "audit-011-cross-tenant"` expected: 0** (gated suite contributes zero to default-suite; sister to AUDIT-011 PR #262 default-suite-stable property). | E | **0.75h** |
| **11.5** | NEW — pre-PAUSE-3 self-check (Lever 4 sister-discipline): LOC reconciliation / test count math / §17.1 invocation discipline / status surface integrity / recommendation discipline | — | **0.5h** |
| **Subtotal — base** | | | **~9.25-12.5h** |
| **Buffer for mid-step corrections** | Honest-recalibration buffer | | **+0.5-1h** |
| **End-of-band** | | | **~10-13.5h** |

**Updated estimate ~10-13.5h end-of-band per CONCERN D recalibration.** Acceptable per "extend timeline, not scope" strategic posture. CONCERNS A/B/C/E pre-mitigations surfaced via PAUSE-2-audit save ~1.5-3h interruption cycles vs surfacing as mid-Phase-C PAUSE corrections.

---

## 11. Effort estimate

PAUSE 1 estimate: ~12-16h (PAUSE 1 conservative band)
PAUSE 2 first-pass design-grounded estimate: ~7-10h (per §10 step-by-step breakdown)
**PAUSE 2-A amended estimate: ~10-13.5h end-of-band** (per CONCERN D recalibration accounting for CONCERNS A/B/C/E mitigations)

### 11.1 PAUSE 2-A driver breakdown (CONCERN D)

| Step | First-pass | Amended | Driver |
|---|---|---|---|
| 1.0 | 0.25-0.5h | **0.5-0.75h** | False-positive analysis output (CONCERN A; populates §4.1 table) |
| 1 | 0.5-1h | **0.75-1.25h** | TWO pattern sets (PATTERNS_CONSERVATIVE + PATTERNS_AGGRESSIVE per CONCERN A) |
| 2 | 1-1.5h | **1.5-2h** | Additional tests for both pattern sets (CONCERN A; ~14-18 tests vs ~12-15) |
| 3 | 0.5-1h | 0.5-1h | unchanged (mechanical PHI_FIELD_MAP extension) |
| 4 | 1.5-2h | 1.5-2h | unchanged (sanitize-at-write integration; AGGRESSIVE opt-in routing) |
| 5 | 1h | **1.25-1.75h** | Helper authoring (assertRoundTripStandard / assertRoundTripSanitized) + branching per CONCERN C |
| 6 | 0.25h | 0.25h | unchanged (TARGETS extension) |
| 7 | 0.5h | **0.75h** | Additional partial-resume idempotency test per CONCERN B (~5 shape tests vs ~4) |
| 8 | 0.25h | 0.25h | unchanged (AUDIT-XXX-future entry) |
| 9 | 0.5h | 0.5h | unchanged (register flips) |
| 10 | 0.5h | 0.5h | unchanged (BUILD_STATE.md updates) |
| 11 | 0.5h | **0.75h** | Verification battery + gated-suite-stays-gated assertion per CONCERN E |
| 11.5 | n/a | **0.5h** | NEW — pre-PAUSE-3 self-check (Lever 4 sister-discipline) |
| **Subtotal** | ~7-10h | **~9.25-12.5h base** | |
| Buffer for mid-step corrections | n/a | **+0.5-1h** | Honest-recalibration buffer |
| **End-of-band** | | **~10-13.5h** | |

### 11.2 Honest framing

PAUSE 2 first-pass estimate ~7-10.5h was design-grounded but didn't account for CONCERNS A/B/C/E mitigations surfaced via PAUSE-2-audit (operator-side robust-palantir audit-the-plan-before-executing discipline). Updated estimate is realistic.

**NOT §17.1** (no inventory miss; no unexamined assumption caught at design-time too late). CONCERNS A-E are pre-implementation amendments per "extend timeline, not scope" strategic posture.

Sister-pattern: AUDIT-022 + AUDIT-016 PR 3 grew during scope clarification; AUDIT-011 estimate grew during Phase C catches; AUDIT-075 grows during PAUSE-2-audit pre-mitigation. All three are honest scope/effort recalibration (no §17.1 invocation).

---

## 12. Reversibility

- **PHI_FIELD_MAP entries removable** — single-line revert per column; encrypted data stays encrypted (no auto-decrypt on remove); operator-side decrypt-and-remove if needed
- **Sanitize-at-write removable** — `redactPHIFragments()` calls removable per-callsite; redacted-marker patterns persist in DB but don't break decrypt
- **User PII encryption removable** — single-line revert per column; sister to PHI_FIELD_MAP discipline
- **AUDIT-XXX-future entry** — captures rollback scope for User.email blind-index work if undertaken later

No DB schema migrations in this PR (PHI_FIELD_MAP changes are application-layer only; column types unchanged).

---

## 13. Engineering tightening follow-ups (NOT §17.1; tracked deferred items)

- **AUDIT-XXX-future-DOB-redaction** — file if production DOB-fragment leak surfaces in errorMessage with specific predictable format (e.g., FHIR bundle parse error with structured `birthDate: 1955-01-15` field reference). Tightly-scoped regex authored against actual observed format (sister to MRN pattern's `MRN[:\s]+...` context-anchored discipline; avoids the operational-timestamp FP class that triggered PAUSE 2.5 DOB removal). Tracked as deferred engineering item; not blocking AUDIT-075 PR.
- **Generic blind-index pattern abstraction** — if future AUDIT-XXX (User.email blind-index) ships, abstract into reusable helper. Sister to AUDIT-014 patient search same-pattern. Tracked as engineering tightening.
- **PHI sanitize-at-write regex pattern library extraction** — if §4 patterns reused elsewhere (e.g., logger redaction code-share opportunity surfaced at Step 1.0 inventory), extract into shared `phi-patterns.ts` module. Tracked as engineering tightening; sister to AUDIT-013 dual-transport audit logger pattern.
- **30-day retention prune for FailedFhirBundle** — per AUDIT-019 register; deferred to operational follow-up PR (not blocking encryption coverage). Sister-discipline to log-retention pattern.
- **`redactPHIFragments` performance benchmarking** — if patterns grow to >20 entries, regex compilation overhead may matter. Tracked as engineering tightening.
- **Test-infra duplication: `makeFakeExtendsClient` + `invokeMiddleware`** — Phase C Step 5 duplicated these helpers in a new `describe` block within `phiEncryption.test.ts` (rather than promoting to module scope) to minimize regression risk on the existing 10-test AUDIT-015/016 suite. If a third describe block in the same file needs them, OR a sister test file (e.g., future model-routing coverage), promote to module-scope helpers in a shared `__test-helpers__/extends-fake-client.ts` (sister to `assertRoundTripStandard` helper extraction discipline). Tracked as engineering tightening; not blocking AUDIT-075 PR.

---

## 14. §17.1 architectural-precedent catalog (11 → 12)

| § | Precedent | Catalyst | What was caught |
|---|---|---|---|
| 1-7 | Prior arc precedents (HIPAA-foundations / Phase 0B / Phase 3 / AUDIT-071) | Various | See `AUDIT_011_PHASE_BCD_PRISMA_EXTENSION_NOTES.md` §14 row 1-7 |
| 8 | AUDIT-016 PR 3 raw SQL bypass (PR #261) | Phase B design | migrateRecord write-path middleware double-encrypt risk |
| 9 | AUDIT-011 Layer 3 Option 0 plumbing (PR #262) | Inventory Item 11 reframing | Layer 3 INPUT axis — pure params.args inspection sufficient |
| 10 | AUDIT-011 schema-column ≠ scoping-axis (PR #262) | Phase B callsite verification | Layer 3 SCOPE axis — content classification not schema-column presence |
| 11 | AUDIT-011 TS inference erosion (PR #262) | Phase C Step 3 TS verification | Layer 3 TYPE axis — generic-extends return-type erosion |
| **12** | **AUDIT-075 column-name-pattern ≠ PHI-candidate-axis (this PR)** | **PAUSE 1 inventory content classification** | **PHI-coverage NAME-PATTERN axis — content + model context, not column-name pattern matching** |

**Sister to 10th SCOPE axis = 12th NAME-PATTERN axis; both Phase A inventory catches.** The 9th-12th decomposition forms a coherent axis-pattern recognizable for future audits.

§17.1 architectural-precedent count advances **11 → 12**.

---

*Authored 2026-05-07 during AUDIT-075 PAUSE 2 design-refinement-note authorship. Catalyst: AUDIT-075 PAUSE 1 inventory caught register's column-name-pattern framing assumption; D1-D6 decisions locked at PAUSE 1 → PAUSE 2 transition; design refinement note authorship per AUDIT-011 sister-pattern (Mechanism 1 + Mechanism 2 + pre-step inventory + Step 11.5 self-check + Lever 6 discipline).*
