/**
 * AUDIT-075 — PHI redaction at write-path.
 *
 * Defense-in-depth layer for PHI columns receiving operator-supplied
 * free-form text (errorMessage on WebhookEvent / ReportGeneration / UploadJob /
 * FailedFhirBundle / AuditLog.description). Sister to AUDIT-019 register's
 * "sanitize-at-write OR add to PHI_FIELD_MAP" optionality — D2 chose BOTH
 * layered (sanitize THEN encrypt-residual) per defense-in-depth posture.
 *
 * Two pattern sets (per design refinement note §4.2):
 *   - PATTERNS_CONSERVATIVE (4 patterns): high-precision; default for D2 errorMessage
 *     callsites. Safe across all operational debug content.
 *   - PATTERNS_AGGRESSIVE (CONSERVATIVE + 1): adds NAME pattern; opt-in via
 *     RedactOptions.aggressive=true. Reserved for FHIR-bundle / clinical-note
 *     error contexts where name fragments are expected.
 *
 * 2026-05-07 PAUSE 2.5 reconciliation: DOB pattern REMOVED from AGGRESSIVE set
 * after Phase C Step 1.0 FP analysis surfaced near-100% FP rate on operational
 * ISO timestamps (`2026-05-07` / `2024-12-31` etc.). Structured DOB covered via
 * PHI_FIELD_MAP.Patient.dateOfBirth field-level encryption. Free-form
 * DOB-fragment leaks now surface as discoverable plaintext bugs vs silent
 * partial redaction. AUDIT-XXX-future-DOB-redaction tracked in design
 * refinement note §13 if future production leak surfaces with predictable format.
 *
 * Sister-discipline: complementary to `backend/src/utils/logger.ts` PHI
 * redaction. logger.ts redacts by FIELD NAME on structured log objects (Object.keys
 * iteration; sensitive-field name match). This module redacts by CONTENT
 * PATTERN on arbitrary text (regex match on free-form strings). No
 * meaningful code-share; different mechanisms.
 *
 * Cross-references:
 *   - docs/architecture/AUDIT_075_PHI_ENCRYPTION_COVERAGE_NOTES.md §4 (full design)
 *   - docs/audit/AUDIT_FINDINGS_REGISTER.md AUDIT-075 / AUDIT-018 / AUDIT-019
 *   - HIPAA Security Rule §164.312(a)(2)(iv) addressable encryption + §164.502 minimum necessary
 */

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Single redaction pattern: regex match + replacement string + name (for
 * debugging/logging). All patterns are readonly + global-flagged so a single
 * `.replace()` call sweeps all occurrences.
 */
export interface RedactionPattern {
  readonly name: string;
  readonly pattern: RegExp;
  readonly replacement: string;
}

/**
 * Caller-supplied options to `redactPHIFragments`.
 *
 * `aggressive: true` swaps the pattern set from CONSERVATIVE (4 LOW-FP-risk
 * patterns) to AGGRESSIVE (CONSERVATIVE + NAME). Reserved for content known
 * to carry name fragments (FHIR bundle parse errors / clinical-note errors).
 * Default (omitted or false) uses CONSERVATIVE.
 */
export interface RedactOptions {
  readonly aggressive?: boolean;
}

// ─── Errors ─────────────────────────────────────────────────────────────────

/**
 * Thrown when input to `redactPHIFragments` is not a string. Sister to
 * AUDIT-016 PR 2 fail-loud pattern — structured errors over silent
 * defaults.
 */
export class PhiRedactionError extends Error {
  constructor(reason: string) {
    super(`PHI redaction failed: ${reason}`);
    this.name = 'PhiRedactionError';
  }
}

/**
 * Thrown at module init if any pattern fails RegExp validation. Sister to
 * AUDIT-016 PR 2 validateEnvelopeConfigOrThrow / AUDIT-017
 * validateKeyOrThrow patterns — fail-loud at startup vs silent at runtime.
 */
export class PhiRedactionConfigError extends Error {
  constructor(reason: string) {
    super(`PHI redaction config invalid: ${reason}`);
    this.name = 'PhiRedactionConfigError';
  }
}

// ─── Pattern sets ───────────────────────────────────────────────────────────

/**
 * CONSERVATIVE — 4 LOW-FP-risk patterns. Default set for D2 errorMessage
 * callsites. Per §4.1 false-positive analysis, safe across operational debug
 * content.
 */
export const PATTERNS_CONSERVATIVE: ReadonlyArray<RedactionPattern> = [
  {
    name: 'SSN',
    pattern: /\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b/g,
    replacement: '[REDACTED-SSN]',
  },
  {
    name: 'MRN',
    // Pre-ambient `MRN` marker required; specific to medical-record-number references.
    // Sister-discipline pattern for AUDIT-XXX-future-DOB-redaction (context-anchored).
    pattern: /\bMRN[:\s]*[A-Z0-9]{6,}\b/gi,
    replacement: '[REDACTED-MRN]',
  },
  {
    name: 'EMAIL',
    // Standard RFC-5322-ish email pattern. Per §4.1 design — operator emails
    // ARE PHI-sensitive too (defense-in-depth posture); accepting the
    // service-email FP-as-PHI is correct.
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: '[REDACTED-EMAIL]',
  },
  {
    name: 'PHONE',
    // 10-digit US phone with optional separators. 3-3-4 digit clusters in
    // build IDs / response codes are rare in error logs; LOW-FP-risk.
    pattern: /\b\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
    replacement: '[REDACTED-PHONE]',
  },
];

/**
 * AGGRESSIVE — CONSERVATIVE + NAME. Opt-in via `RedactOptions.aggressive=true`.
 *
 * 2026-05-07 PAUSE 2.5: DOB pattern REMOVED after Phase C Step 1.0 FP analysis
 * surfaced near-100% FP rate on operational ISO timestamps. Structured DOB
 * covered via PHI_FIELD_MAP.Patient.dateOfBirth field-level encryption.
 * Free-form DOB-fragment leaks now surface as discoverable plaintext bugs vs
 * silent partial redaction. If a future production DOB-fragment leak surfaces
 * with a specific predictable format: file AUDIT-XXX-future-DOB-redaction
 * with tightly-scoped regex (per design refinement note §13).
 */
export const PATTERNS_AGGRESSIVE: ReadonlyArray<RedactionPattern> = [
  ...PATTERNS_CONSERVATIVE,
  {
    name: 'NAME',
    // `patient` ambient marker required; specific to FHIR-bundle parse errors
    // ("patient John Smith") and clinical-note errors. Dev-fixture FP
    // ("patient John Doe" placeholder) acceptable; production unlikely to log
    // placeholder names.
    pattern: /\bpatient[:\s]+[A-Z][a-z]+\s+[A-Z][a-z]+\b/gi,
    replacement: '[REDACTED-NAME]',
  },
];

// ─── Module init validation ─────────────────────────────────────────────────

/**
 * Validate that every pattern compiles + has expected shape.
 *
 * Fail-loud-at-startup pattern (sister to AUDIT-016 PR 2
 * validateEnvelopeConfigOrThrow / AUDIT-017 validateKeyOrThrow). If any
 * pattern is malformed, the module fails to import and deployment fails fast
 * vs surfacing at first runtime call.
 *
 * Exported for testability (Concern 2.1 — tests pass arbitrary pattern
 * arrays to verify validation rejects non-RegExp / non-string-replacement /
 * non-global patterns). Production module-init invocation below uses the
 * real CONSERVATIVE + AGGRESSIVE arrays.
 *
 * @throws PhiRedactionConfigError on any invariant violation
 */
export function validatePatternsOrThrow(
  patterns: ReadonlyArray<RedactionPattern> = [
    ...PATTERNS_CONSERVATIVE,
    ...PATTERNS_AGGRESSIVE,
  ],
): void {
  for (const p of patterns) {
    if (!(p.pattern instanceof RegExp)) {
      throw new PhiRedactionConfigError(
        `pattern "${p.name}" is not a RegExp instance`,
      );
    }
    if (typeof p.replacement !== 'string') {
      throw new PhiRedactionConfigError(
        `pattern "${p.name}" replacement is not a string`,
      );
    }
    if (!p.pattern.global) {
      throw new PhiRedactionConfigError(
        `pattern "${p.name}" must have global flag (single replace() call sweeps all occurrences)`,
      );
    }
  }
}

// Module-init validation: validates the production CONSERVATIVE + AGGRESSIVE
// arrays at first import. Throws PhiRedactionConfigError to ECS task; deploy
// fails fast on misconfigured pattern set.
validatePatternsOrThrow();

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Redact PHI fragments from arbitrary input string.
 *
 * Selects pattern set based on `opts.aggressive`:
 *   - false / omitted → PATTERNS_CONSERVATIVE (4 patterns; default)
 *   - true            → PATTERNS_AGGRESSIVE (CONSERVATIVE + NAME)
 *
 * Pure function — does not mutate input; returns redacted copy. Idempotent:
 * running twice produces the same output (redacted markers don't re-trigger
 * patterns).
 *
 * @throws PhiRedactionError if input is not a string (fail-loud per project
 *   instructions structured-errors discipline).
 */
export function redactPHIFragments(
  input: string,
  opts?: RedactOptions,
): string {
  if (typeof input !== 'string') {
    throw new PhiRedactionError(
      `input must be a string; got ${typeof input}`,
    );
  }
  const patterns = opts?.aggressive ? PATTERNS_AGGRESSIVE : PATTERNS_CONSERVATIVE;
  let output = input;
  for (const { pattern, replacement } of patterns) {
    output = output.replace(pattern, replacement);
  }
  return output;
}
