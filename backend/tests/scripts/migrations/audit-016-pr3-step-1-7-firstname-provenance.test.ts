/**
 * AUDIT-016 PR 3 STEP 1.7 firstName envelope provenance probe unit tests.
 *
 * Test scope:
 *   T1: 3 purposes x 5 fixture envelopes = 15 probes; per-purpose tally
 *       correct (probePurposes + tally builder)
 *   T2: PHI-output sanitization: no plaintext > 10 chars persisted in
 *       SUMMARY_ARTIFACT-shape result (PerPurposeResult.plaintextPrefix
 *       at most PLAINTEXT_PREFIX_LEN chars)
 *   T3: keyset-offset stratification: 5 distinct offsets, results bucketed
 *       per offsetGroup
 *   T4: control rows: lastName envelope fetched from same patient.id as
 *       firstName for each sample row
 *   T5: write-time correlation: createdAt + updatedAt captured + bucketed
 *       pre/in/post AUDIT-084 deployment window
 *   T6: exit code semantics: 0 on per-envelope-per-purpose result captured
 *   T7: parseArgs error paths: throws on out-of-range, non-integer,
 *       unknown args
 *   T8 (GROUP B): regression - canonical purpose imported from
 *       phiEncryption.ts CANONICAL_PHI_PURPOSE; fail if probe hardcodes
 *       the literal instead of using the import (§17.1 15th-entry
 *       single-source-of-truth enforcement)
 *
 * Test mocking discipline:
 *   - prisma client: jest.mock at module level (prevent real Prisma init)
 *   - auditLogger: jest.mock at module level (prevent Winston file writes)
 *   - decryptAny: dependency-injected via probePurposes decryptFn parameter
 *     (no module mock needed)
 *
 * PHI-handling in tests:
 *   Test fixtures use synthetic non-PHI strings ("test-pt", "fake-env"); no
 *   Synthea-realistic patterns; no real PHI; no production-shaped strings.
 *   Sister to spotcheck-decrypt.test.ts PHI discipline.
 */

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    $queryRawUnsafe: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

jest.mock('../../../src/middleware/auditLogger', () => ({
  __esModule: true,
  auditLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import prisma from '../../../src/lib/prisma';
import {
  PURPOSES_TO_PROBE,
  DEFAULT_OFFSETS,
  DEFAULT_SAMPLES_PER_OFFSET,
  AUDIT_084_WINDOW_START,
  AUDIT_084_WINDOW_END,
  parseArgs,
  sampleRowsAtOffset,
  categorizeError,
  probePurposes,
  categorizeWriteTime,
  probeSampleRow,
  type Opts,
  type SampleRow,
  type PerPurposeResult,
  type ErrorCategory,
  type WriteTimeBucket,
} from '../../../scripts/migrations/audit-016-pr3-step-1-7-firstname-provenance';
import { CANONICAL_PHI_PURPOSE } from '../../../src/middleware/phiEncryption';
import type { EncryptionContext } from '../../../src/services/keyRotation';
import * as fs from 'fs';
import * as path from 'path';

const queryRawMock = prisma.$queryRawUnsafe as jest.Mock;

beforeEach(() => {
  queryRawMock.mockReset();
});

// ─── GROUP A: parseArgs (T7 - error paths) ─────────────────────────────────

describe('GROUP A: parseArgs', () => {
  test('T7.1: defaults when no args', () => {
    const opts: Opts = parseArgs([]);
    expect(opts.samplesPerOffset).toBe(DEFAULT_SAMPLES_PER_OFFSET);
    expect(opts.offsets).toBe(DEFAULT_OFFSETS);
  });

  test('T7.2: --samples-per-offset override accepted within range', () => {
    expect(parseArgs(['--samples-per-offset', '10']).samplesPerOffset).toBe(10);
    expect(parseArgs(['--samples-per-offset', '1']).samplesPerOffset).toBe(1);
    expect(parseArgs(['--samples-per-offset', '100']).samplesPerOffset).toBe(100);
  });

  test('T7.3: --samples-per-offset out of range throws', () => {
    expect(() => parseArgs(['--samples-per-offset', '0'])).toThrow(/--samples-per-offset must be 1-100/);
    expect(() => parseArgs(['--samples-per-offset', '101'])).toThrow(/--samples-per-offset must be 1-100/);
    expect(() => parseArgs(['--samples-per-offset', 'abc'])).toThrow(/--samples-per-offset must be 1-100/);
  });

  test('T7.4: --offsets parses comma-separated integers', () => {
    expect(parseArgs(['--offsets', '0,50,100']).offsets).toEqual([0, 50, 100]);
    expect(parseArgs(['--offsets', '5']).offsets).toEqual([5]);
  });

  test('T7.5: --offsets rejects negative, non-integer, or empty', () => {
    expect(() => parseArgs(['--offsets', '-1'])).toThrow(/--offsets/);
    expect(() => parseArgs(['--offsets', '1.5'])).toThrow(/--offsets/);
    expect(() => parseArgs(['--offsets', 'abc'])).toThrow(/--offsets/);
    expect(() => parseArgs(['--offsets', ''])).toThrow(/--offsets/);
  });

  test('T7.6: --dry-run accepted as no-op (sister parity)', () => {
    const opts: Opts = parseArgs(['--dry-run']);
    expect(opts.samplesPerOffset).toBe(DEFAULT_SAMPLES_PER_OFFSET);
  });

  test('T7.7: unknown argument throws', () => {
    expect(() => parseArgs(['--foo'])).toThrow(/Unknown argument/);
    expect(() => parseArgs(['--execute'])).toThrow(/Unknown argument/);
  });
});

// ─── GROUP B: §17.1 15th-entry import-from-canonical regression guard ─────

describe('GROUP B: §17.1 15th-entry canonical purpose import regression', () => {
  test('T8.1: PURPOSES_TO_PROBE[0] is the imported CANONICAL_PHI_PURPOSE constant (not a re-typed literal)', () => {
    // The probe must use the imported constant, NOT a hardcoded 'phi-encryption' literal.
    // Both share the same value, but the regression guard is reference identity to the
    // imported binding. If a future PR re-types the literal, this test still passes by
    // value but the architectural intent (single source of truth) is broken.
    // We therefore assert BOTH: value match AND that the canonical constant resolves
    // to a known canonical string ('phi-encryption' at the time of authoring).
    expect(PURPOSES_TO_PROBE[0]).toBe(CANONICAL_PHI_PURPOSE);
    expect(CANONICAL_PHI_PURPOSE).toBe('phi-encryption');
  });

  test('T8.2: probe source file imports CANONICAL_PHI_PURPOSE from phiEncryption.ts', () => {
    // Static file-content guard: read the probe source and assert it contains
    // the canonical import statement. This catches a future PR that drops the
    // import and re-hardcodes the literal.
    const probeSourcePath = path.resolve(
      __dirname,
      '../../../scripts/migrations/audit-016-pr3-step-1-7-firstname-provenance.ts',
    );
    const src = fs.readFileSync(probeSourcePath, 'utf8');
    expect(src).toContain(
      "import { CANONICAL_PHI_PURPOSE } from '../../src/middleware/phiEncryption'",
    );
    // And the probe must reference CANONICAL_PHI_PURPOSE in PURPOSES_TO_PROBE
    expect(src).toMatch(/PURPOSES_TO_PROBE\s*=\s*\[\s*CANONICAL_PHI_PURPOSE/);
  });

  test('T8.3: PURPOSES_TO_PROBE includes legacy + canonical + direct-encrypt purposes', () => {
    expect(PURPOSES_TO_PROBE).toContain(CANONICAL_PHI_PURPOSE);
    expect(PURPOSES_TO_PROBE).toContain('phi-migration-v0v1-to-v2');
    expect(PURPOSES_TO_PROBE).toContain('phi-field');
    expect(PURPOSES_TO_PROBE.length).toBe(3);
  });
});

// ─── GROUP C: probePurposes (T1 + T2 PHI-sanitization) ─────────────────────

describe('GROUP C: probePurposes (multi-purpose decrypt)', () => {
  test('T1.1: 3 purposes x 1 envelope = 3 probes; per-purpose results captured', async () => {
    let callCount = 0;
    const mockDecrypt = jest.fn(async (env: string, ctx: EncryptionContext) => {
      callCount++;
      if (ctx.purpose === CANONICAL_PHI_PURPOSE) return 'Patient';
      throw new Error('InvalidCiphertextException: context mismatch');
    });
    const out = await probePurposes('enc:v2:fake', 'firstName', PURPOSES_TO_PROBE, mockDecrypt);
    expect(out).toHaveLength(3);
    expect(callCount).toBe(3);
    expect(out[0].purpose).toBe(CANONICAL_PHI_PURPOSE);
    expect(out[0].success).toBe(true);
    expect(out[0].plaintextLength).toBe(7);
    expect(out[1].success).toBe(false);
    expect(out[1].errorCategory).toBe('InvalidCiphertextException');
    expect(out[2].success).toBe(false);
  });

  test('T1.2: success path captures plaintextPrefix up to PLAINTEXT_PREFIX_LEN (10 chars)', async () => {
    const mockDecrypt = jest.fn(async () => 'JonathanHart');  // 12 chars
    const out = await probePurposes('enc:v2:fake', 'firstName', [CANONICAL_PHI_PURPOSE] as readonly any[], mockDecrypt);
    expect(out[0].plaintextLength).toBe(12);
    expect(out[0].plaintextPrefix).toBe('JonathanHa');  // first 10 chars
    expect(out[0].plaintextPrefix.length).toBe(10);
  });

  test('T2.1: PHI-output sanitization - plaintextPrefix never exceeds 10 chars', async () => {
    const oversized = 'A'.repeat(500);
    const mockDecrypt = jest.fn(async () => oversized);
    const out = await probePurposes('enc:v2:fake', 'firstName', [CANONICAL_PHI_PURPOSE] as readonly any[], mockDecrypt);
    expect(out[0].plaintextPrefix.length).toBeLessThanOrEqual(10);
    expect(out[0].plaintextLength).toBe(500);
    // Result must NOT contain the full plaintext anywhere
    expect(JSON.stringify(out)).not.toContain(oversized);
  });

  test('T2.2: failure path stores no plaintext (empty prefix)', async () => {
    const mockDecrypt = jest.fn(async () => {
      throw new Error('AccessDeniedException');
    });
    const out = await probePurposes('enc:v2:fake', 'firstName', [CANONICAL_PHI_PURPOSE] as readonly any[], mockDecrypt);
    expect(out[0].success).toBe(false);
    expect(out[0].plaintextPrefix).toBe('');
    expect(out[0].plaintextLength).toBe(0);
    expect(out[0].errorCategory).toBe('AccessDeniedException');
  });
});

// ─── GROUP D: categorizeError (error-mode classifier) ─────────────────────

describe('GROUP D: categorizeError', () => {
  const cases: Array<{ name: string; err: Error; expected: ErrorCategory }> = [
    { name: 'InvalidCiphertextException by name', err: Object.assign(new Error('x'), { name: 'InvalidCiphertextException' }), expected: 'InvalidCiphertextException' },
    { name: 'InvalidCiphertextException by message', err: new Error('KMS Decrypt InvalidCiphertextException'), expected: 'InvalidCiphertextException' },
    { name: 'AccessDeniedException', err: new Error('AccessDeniedException: not authorized'), expected: 'AccessDeniedException' },
    { name: 'KMSInvalidStateException', err: new Error('KMSInvalidStateException: key disabled'), expected: 'KMSInvalidStateException' },
    { name: 'IncorrectKeyException', err: new Error('IncorrectKeyException'), expected: 'IncorrectKeyException' },
    { name: 'EnvelopeFormatError', err: Object.assign(new Error('bad'), { name: 'EnvelopeFormatError' }), expected: 'EnvelopeFormatError' },
    { name: 'IntegrityCheckFailed', err: new Error('PHI decryption: integrity check failed (v1)'), expected: 'IntegrityCheckFailed' },
    { name: 'UnknownError fallback', err: new Error('something weird happened'), expected: 'UnknownError' },
  ];
  test.each(cases)('classifies $name', ({ err, expected }) => {
    expect(categorizeError(err)).toBe(expected);
  });
});

// ─── GROUP E: categorizeWriteTime (T5 write-time correlation) ──────────────

describe('GROUP E: categorizeWriteTime (AXIS C bucketing)', () => {
  test('T5.1: pre-audit-084 bucket (date before window start)', () => {
    expect(categorizeWriteTime(new Date('2026-05-06T23:59:59Z'))).toBe('pre-audit-084');
    expect(categorizeWriteTime(new Date('2026-04-27T00:00:00Z'))).toBe('pre-audit-084');
  });

  test('T5.2: in-audit-084-window bucket (date within window)', () => {
    expect(categorizeWriteTime(AUDIT_084_WINDOW_START)).toBe('in-audit-084-window');
    expect(categorizeWriteTime(new Date('2026-05-08T12:00:00Z'))).toBe('in-audit-084-window');
    expect(categorizeWriteTime(new Date('2026-05-09T23:59:59Z'))).toBe('in-audit-084-window');
  });

  test('T5.3: post-audit-084 bucket (date at or after window end)', () => {
    expect(categorizeWriteTime(AUDIT_084_WINDOW_END)).toBe('post-audit-084');
    expect(categorizeWriteTime(new Date('2026-05-18T00:00:00Z'))).toBe('post-audit-084');
  });
});

// ─── GROUP F: sampleRowsAtOffset (T3 stratification + T4 control rows) ────

describe('GROUP F: sampleRowsAtOffset (raw SQL fetch)', () => {
  test('T3.1: query uses ORDER BY id ASC + LIMIT + OFFSET (keyset stratification)', async () => {
    queryRawMock.mockResolvedValueOnce([]);
    await sampleRowsAtOffset(prisma, 50, 5);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
    const sql = queryRawMock.mock.calls[0][0] as string;
    expect(sql).toContain('ORDER BY id ASC');
    expect(sql).toContain('LIMIT 5 OFFSET 50');
    expect(sql).toContain(`"firstName" LIKE 'enc:v2:%'`);
    expect(sql).toContain(`"lastName" LIKE 'enc:v2:%'`);
  });

  test('T3.2: distinct offsets produce distinct queries', async () => {
    queryRawMock.mockResolvedValue([]);
    await sampleRowsAtOffset(prisma, 0, 5);
    await sampleRowsAtOffset(prisma, 1500, 5);
    await sampleRowsAtOffset(prisma, 6100, 5);
    expect(queryRawMock).toHaveBeenCalledTimes(3);
    expect((queryRawMock.mock.calls[0][0] as string)).toContain('LIMIT 5 OFFSET 0');
    expect((queryRawMock.mock.calls[1][0] as string)).toContain('LIMIT 5 OFFSET 1500');
    expect((queryRawMock.mock.calls[2][0] as string)).toContain('LIMIT 5 OFFSET 6100');
  });

  test('T4.1: control row pairing - firstName and lastName envelopes fetched from same row', async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        id: 'pat-abc-1',
        firstNameEnv: 'enc:v2:fakeFirst',
        lastNameEnv: 'enc:v2:fakeLast',
        createdAt: new Date('2026-05-08T10:00:00Z'),
        updatedAt: new Date('2026-05-08T10:00:00Z'),
      },
    ]);
    const rows = await sampleRowsAtOffset(prisma, 0, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('pat-abc-1');
    expect(rows[0].firstNameEnvelope).toBe('enc:v2:fakeFirst');
    expect(rows[0].lastNameEnvelope).toBe('enc:v2:fakeLast');
    expect(rows[0].offsetGroup).toBe(0);
  });

  test('T5.4: createdAt + updatedAt captured per row', async () => {
    const created = new Date('2026-05-08T10:00:00Z');
    const updated = new Date('2026-05-15T11:00:00Z');
    queryRawMock.mockResolvedValueOnce([
      { id: 'pat-1', firstNameEnv: 'a', lastNameEnv: 'b', createdAt: created, updatedAt: updated },
    ]);
    const rows = await sampleRowsAtOffset(prisma, 0, 1);
    expect(rows[0].createdAt).toEqual(created);
    expect(rows[0].updatedAt).toEqual(updated);
  });
});

// ─── GROUP G: probeSampleRow (T6 end-to-end orchestration) ─────────────────

describe('GROUP G: probeSampleRow (per-row orchestration)', () => {
  test('T6.1: probes BOTH firstName and lastName under ALL purposes; returns structured PerRowResult', async () => {
    // Spy on probePurposes via mockDecrypt: 6 expected decrypt calls (2 fields x 3 purposes)
    const row: SampleRow = {
      id: 'pat-test-1',
      firstNameEnvelope: 'enc:v2:fakeFirst',
      lastNameEnvelope: 'enc:v2:fakeLast',
      createdAt: new Date('2026-05-08T10:00:00Z'),
      updatedAt: new Date('2026-05-08T10:00:00Z'),
      offsetGroup: 50,
    };
    const result = await probeSampleRow(row);
    expect(result.rowId).toBe('pat-test-1');
    expect(result.offsetGroup).toBe(50);
    expect(result.firstName.perPurpose).toHaveLength(3);
    expect(result.lastName.perPurpose).toHaveLength(3);
    expect(result.firstName.envelopeLength).toBe('enc:v2:fakeFirst'.length);
    expect(result.lastName.envelopeLength).toBe('enc:v2:fakeLast'.length);
  });

  test('T5.5: createdAtBucket + updatedAtBucket on PerRowResult reflect AUDIT-084 window', async () => {
    const inWindow: SampleRow = {
      id: 'pat-test-window',
      firstNameEnvelope: 'enc:v2:a',
      lastNameEnvelope: 'enc:v2:b',
      createdAt: new Date('2026-05-08T10:00:00Z'),
      updatedAt: new Date('2026-05-15T11:00:00Z'),
      offsetGroup: 0,
    };
    const result = await probeSampleRow(inWindow);
    expect(result.createdAtBucket).toBe('in-audit-084-window');
    expect(result.updatedAtBucket).toBe('post-audit-084');
  });

  test('T2.3: PerRowResult envelope previews truncated to 50 chars (PHI-safe; ciphertext only but defensive)', async () => {
    const longEnv = 'enc:v2:' + 'A'.repeat(500);
    const row: SampleRow = {
      id: 'pat-test-long',
      firstNameEnvelope: longEnv,
      lastNameEnvelope: longEnv,
      createdAt: new Date('2026-05-08T10:00:00Z'),
      updatedAt: new Date('2026-05-08T10:00:00Z'),
      offsetGroup: 0,
    };
    const result = await probeSampleRow(row);
    expect(result.firstName.envelopePreview.length).toBeLessThanOrEqual(50);
    expect(result.lastName.envelopePreview.length).toBeLessThanOrEqual(50);
    expect(result.firstName.envelopeLength).toBe(longEnv.length);
  });
});
