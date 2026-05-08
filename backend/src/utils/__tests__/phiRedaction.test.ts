/**
 * AUDIT-075 — `phiRedaction.ts` unit tests.
 *
 * Coverage (per design refinement note §9.1 + Step 2 amended spec):
 *   Group A — CONSERVATIVE patterns positive (4 tests)
 *   Group B — CONSERVATIVE patterns negative / FP-control (4 tests)
 *   Group C — AGGRESSIVE-only NAME pattern (3 tests; opt-in semantics)
 *   Group D — Concerns 2.1 + 2.2 + 2.3 (4 tests; module-init validation,
 *             overlap label-mismatch, input immutability, DOB-removal regression)
 *   Group E — Idempotency (2 tests; CONSERVATIVE + AGGRESSIVE)
 *   Group F — Performance (1 test; 10KB string < 50ms)
 *   Group G — Error path (1 test; non-string input throws)
 *
 * Total: 15 tests.
 *
 * Cross-references:
 *   - backend/src/utils/phiRedaction.ts (system under test)
 *   - docs/architecture/AUDIT_075_PHI_ENCRYPTION_COVERAGE_NOTES.md §9.1
 */

import {
  redactPHIFragments,
  validatePatternsOrThrow,
  PATTERNS_CONSERVATIVE,
  PATTERNS_AGGRESSIVE,
  PhiRedactionError,
  PhiRedactionConfigError,
  type RedactionPattern,
} from '../phiRedaction';

// ─── Group A — CONSERVATIVE positive ───────────────────────────────────────

describe('Group A — CONSERVATIVE patterns positive', () => {
  it('A.SSN: 123-45-6789 → [REDACTED-SSN]', () => {
    expect(redactPHIFragments('SSN: 123-45-6789')).toBe('SSN: [REDACTED-SSN]');
  });

  it('A.MRN: MRN: ABC123456 → MRN: [REDACTED-MRN]', () => {
    expect(redactPHIFragments('MRN: ABC123456')).toBe('[REDACTED-MRN]');
  });

  it('A.EMAIL: patient@email.com → [REDACTED-EMAIL]', () => {
    expect(redactPHIFragments('contact patient@email.com')).toBe('contact [REDACTED-EMAIL]');
  });

  it('A.PHONE: 555-123-4567 → [REDACTED-PHONE]', () => {
    expect(redactPHIFragments('phone 555-123-4567')).toBe('phone [REDACTED-PHONE]');
  });
});

// ─── Group B — CONSERVATIVE negative / FP-control ──────────────────────────

describe('Group B — CONSERVATIVE patterns negative / FP-control', () => {
  it('B.SSN-NEG: operational timestamp shape passes through', () => {
    // 100-50-2000 has 3-2-4 digits; SSN pattern is strict 3-2-4 digit-only;
    // operational ms-suffix pattern doesn't match SSN shape exactly.
    const input = 'response code 200-12-345 status'; // 3-2-3 digits; not SSN
    expect(redactPHIFragments(input)).toBe(input);
  });

  it('B.MRN-NEG: short MRN passes through (length-too-short)', () => {
    // MRN pattern requires [A-Z0-9]{6,}; "abc" is 3 chars + lowercase
    expect(redactPHIFragments('mrn abc')).toBe('mrn abc');
  });

  it('B.EMAIL-NEG: malformed email passes through', () => {
    // Pattern requires user@host.tld with .tld 2+ chars
    expect(redactPHIFragments('@malformed')).toBe('@malformed');
  });

  it('B.PHONE-NEG: short digit sequence passes through (length-too-short)', () => {
    expect(redactPHIFragments('build 12345')).toBe('build 12345');
  });
});

// ─── Group C — AGGRESSIVE-only NAME pattern ────────────────────────────────

describe('Group C — AGGRESSIVE-only NAME pattern', () => {
  it('C.NAME-default-OFF: patient John Smith without aggressive opts → unchanged', () => {
    // CONSERVATIVE doesn't include NAME pattern; default behavior leaves intact
    expect(redactPHIFragments('patient John Smith failed')).toBe('patient John Smith failed');
  });

  it('C.NAME-aggressive-ON: patient John Smith with aggressive opts → [REDACTED-NAME]', () => {
    expect(redactPHIFragments('patient John Smith failed', { aggressive: true })).toBe(
      '[REDACTED-NAME] failed',
    );
  });

  it('C.NAME-context-required: name without "patient" prefix → passes through (with aggressive opts)', () => {
    // Pattern requires `\bpatient[:\s]+` ambient marker before name
    expect(redactPHIFragments('office John Smith', { aggressive: true })).toBe(
      'office John Smith',
    );
  });
});

// ─── Group D — Concerns 2.1 + 2.2 + 2.3 + DOB-removal regression ───────────

describe('Group D — Concerns 2.1 / 2.2 / 2.3 + DOB-removal regression', () => {
  it('D.2.1: validatePatternsOrThrow rejects non-global RegExp (Concern 2.1)', () => {
    const badPatterns: ReadonlyArray<RedactionPattern> = [
      {
        name: 'TEST-NON-GLOBAL',
        pattern: /\b[0-9]{3}\b/, // missing /g flag
        replacement: '[REDACTED-TEST]',
      },
    ];
    expect(() => validatePatternsOrThrow(badPatterns)).toThrow(PhiRedactionConfigError);
    expect(() => validatePatternsOrThrow(badPatterns)).toThrow(/global flag/);
  });

  it('D.2.1b: validatePatternsOrThrow rejects non-RegExp pattern field', () => {
    const badPatterns: ReadonlyArray<RedactionPattern> = [
      {
        name: 'TEST-STRING-PATTERN',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pattern: 'not-a-regex' as any,
        replacement: '[REDACTED-TEST]',
      },
    ];
    expect(() => validatePatternsOrThrow(badPatterns)).toThrow(PhiRedactionConfigError);
    expect(() => validatePatternsOrThrow(badPatterns)).toThrow(/RegExp instance/);
  });

  it('D.2.2: overlap label-mismatch — MRN: 123-45-6789 produces [REDACTED-SSN], NOT [REDACTED-MRN]', () => {
    // PAUSE 2.6 escape hatch decision: option (d) — accept overwrite-redactions /
    // label-mismatch as documented behavior. SSN runs FIRST in CONSERVATIVE
    // pattern array; matches `123-45-6789` before MRN pattern gets a chance.
    // After SSN replaces the digits with `[REDACTED-SSN]`, the bracket char `[`
    // doesn't match MRN's `[A-Z0-9]{6,}` charset, so MRN pattern can't re-match.
    //
    // Output is still PHI-FREE (the load-bearing security property). The
    // [REDACTED-SSN] label may not match the original PHI type (operator reading
    // logs sees SSN-marker for what was an MRN), but MRN context is preserved
    // in the surrounding `MRN: ` prefix; forensic triage can reconstruct.
    //
    // Documented in design refinement note §4.2 PAUSE 2.6 reconciliation note
    // (added during Phase C Step 2 authoring per Concern 2.2).
    expect(redactPHIFragments('MRN: 123-45-6789')).toBe('MRN: [REDACTED-SSN]');
  });

  it('D.2.3: input immutability — original string reference preserved', () => {
    const input = 'SSN: 123-45-6789';
    const originalLength = input.length;
    const output = redactPHIFragments(input);
    // String primitives are immutable in JS, but explicit assertion verifies
    // redactPHIFragments doesn't mutate input via any mechanism (e.g.,
    // accidentally reassigning via String.prototype methods).
    expect(input).toBe('SSN: 123-45-6789');
    expect(input.length).toBe(originalLength);
    expect(output).not.toBe(input); // returned a new string
  });

  it('D.DOB-removal-regression: ISO date passes through unchanged (DOB pattern removed per PAUSE 2.5)', () => {
    // Verify DOB pattern truly removed; regression catch if it lurks.
    expect(redactPHIFragments('log written 2026-05-07')).toBe('log written 2026-05-07');
    expect(redactPHIFragments('event time 2024-12-31', { aggressive: true })).toBe(
      'event time 2024-12-31',
    );
    expect(redactPHIFragments('birth 1955-01-15')).toBe('birth 1955-01-15');
  });
});

// ─── Group E — Idempotency ─────────────────────────────────────────────────

describe('Group E — Idempotency', () => {
  it('E.CONSERVATIVE-idempotent: redact(redact(x)) === redact(x)', () => {
    const input = 'SSN: 123-45-6789, phone 555-123-4567, email patient@email.com';
    const once = redactPHIFragments(input);
    const twice = redactPHIFragments(once);
    expect(twice).toBe(once);
  });

  it('E.AGGRESSIVE-idempotent: redact(redact(x), agg) === redact(x, agg)', () => {
    const input = 'patient John Smith failed at 555-123-4567';
    const once = redactPHIFragments(input, { aggressive: true });
    const twice = redactPHIFragments(once, { aggressive: true });
    expect(twice).toBe(once);
  });
});

// ─── Group F — Performance ─────────────────────────────────────────────────

describe('Group F — Performance', () => {
  it('F.10KB-string: redactPHIFragments completes < 50ms on 10KB mixed-PHI input', () => {
    // Build ~10KB string with mixed PHI + non-PHI content
    const sample =
      'log entry SSN 123-45-6789 phone 555-123-4567 email patient@email.com ' +
      'and operational debug content with timestamps and other text ';
    const input = sample.repeat(80); // ~10KB (sample ~130 chars × 80 = ~10400)
    expect(input.length).toBeGreaterThan(8000);
    expect(input.length).toBeLessThan(15000);

    const t0 = process.hrtime.bigint();
    const output = redactPHIFragments(input);
    const t1 = process.hrtime.bigint();
    const elapsedMs = Number(t1 - t0) / 1e6;

    expect(elapsedMs).toBeLessThan(50);
    expect(output).toContain('[REDACTED-SSN]');
    expect(output).toContain('[REDACTED-PHONE]');
    expect(output).toContain('[REDACTED-EMAIL]');
  });
});

// ─── Group G — Error path ──────────────────────────────────────────────────

describe('Group G — Error path (fail-loud structured errors)', () => {
  it('G.non-string-input: throws PhiRedactionError', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => redactPHIFragments(null as any)).toThrow(PhiRedactionError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => redactPHIFragments(undefined as any)).toThrow(PhiRedactionError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => redactPHIFragments(123 as any)).toThrow(/must be a string/);
  });
});

// ─── Module export sanity ──────────────────────────────────────────────────

describe('module exports', () => {
  it('PATTERNS_CONSERVATIVE has 4 entries', () => {
    expect(PATTERNS_CONSERVATIVE.length).toBe(4);
    expect(PATTERNS_CONSERVATIVE.map((p) => p.name)).toEqual(['SSN', 'MRN', 'EMAIL', 'PHONE']);
  });

  it('PATTERNS_AGGRESSIVE has 5 entries (CONSERVATIVE + NAME)', () => {
    expect(PATTERNS_AGGRESSIVE.length).toBe(5);
    expect(PATTERNS_AGGRESSIVE.map((p) => p.name)).toEqual([
      'SSN',
      'MRN',
      'EMAIL',
      'PHONE',
      'NAME',
    ]);
    // Verify DOB pattern truly absent per PAUSE 2.5
    expect(PATTERNS_AGGRESSIVE.map((p) => p.name)).not.toContain('DOB');
  });
});
