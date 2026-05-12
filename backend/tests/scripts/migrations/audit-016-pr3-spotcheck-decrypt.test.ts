/**
 * AUDIT-016 PR 3 STEP 1.7 spotcheck-decrypt unit tests.
 *
 * Test scope (Decision 5B from PAUSE A.2.5):
 *   GROUP A: parseArgs (CLI argument handling)
 *   GROUP B: contextFor (EncryptionContext anchor; regression guard against
 *            drift from migration script line 455-457)
 *   GROUP C: filterNonZeroV2Targets (target filter logic)
 *   GROUP D: shapeCheck predicates (4 success/failure paths + PHI-exposure
 *            surface contract)
 *   GROUP E: SampleResult / SpotCheckEnvelope PHI-exposure surface
 *            regression guard (Object.keys inspection; permanent guard
 *            against re-introducing plaintext fields)
 *
 * Test mocking discipline:
 *   - prisma client: jest.mock at module level (prevent real Prisma init)
 *   - auditLogger: jest.mock at module level (prevent Winston file writes)
 *   - decryptAny: dependency-injected via shapeCheck decryptFn parameter
 *     (no module mock needed; type-only import erased at compile time)
 *
 * PHI-handling in tests:
 *   Test fixtures use synthetic non-PHI strings ("test-plaintext", "John",
 *   "enc:v0:fake-envelope"). NO Synthea-realistic patterns; NO real PHI;
 *   NO production-shaped strings. Sister to PHI-exposure discipline at
 *   script level: tests never carry PHI even by accident.
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
  contextFor,
  filterNonZeroV2Targets,
  parseArgs,
  sampleRowsForTarget,
  shapeCheck,
  type ShapeCheckResult,
  type SampleResult,
  type Opts,
} from '../../../scripts/migrations/audit-016-pr3-spotcheck-decrypt';
import { TARGETS } from '../../../scripts/migrations/audit-016-pr3-v0v1-to-v2';
import type { EncryptionContext } from '../../../src/services/keyRotation';

const queryRawMock = prisma.$queryRawUnsafe as jest.Mock;

beforeEach(() => {
  queryRawMock.mockReset();
});

// ─── GROUP A: parseArgs ────────────────────────────────────────────────────

describe('GROUP A: parseArgs', () => {
  test('A.1: default batchSize=5 when no args', () => {
    const opts: Opts = parseArgs([]);
    expect(opts.batchSize).toBe(5);
  });

  test('A.2: --batch-size override accepted within range', () => {
    expect(parseArgs(['--batch-size', '10']).batchSize).toBe(10);
    expect(parseArgs(['--batch-size', '1']).batchSize).toBe(1);
    expect(parseArgs(['--batch-size', '100']).batchSize).toBe(100);
  });

  test('A.3: --batch-size out of range throws', () => {
    expect(() => parseArgs(['--batch-size', '0'])).toThrow(/--batch-size must be 1-100/);
    expect(() => parseArgs(['--batch-size', '101'])).toThrow(/--batch-size must be 1-100/);
    expect(() => parseArgs(['--batch-size', 'abc'])).toThrow(/--batch-size must be 1-100/);
  });

  test('A.4: --dry-run accepted as no-op (sister parity with migration script)', () => {
    const opts: Opts = parseArgs(['--dry-run']);
    expect(opts.batchSize).toBe(5);
  });

  test('A.5: unknown argument throws', () => {
    expect(() => parseArgs(['--execute'])).toThrow(/Unknown argument/);
    expect(() => parseArgs(['--foo'])).toThrow(/Unknown argument/);
  });
});

// ─── GROUP B: contextFor (regression guard) ────────────────────────────────

describe('GROUP B: contextFor (EncryptionContext anchor)', () => {
  test('B.1: context matches migration script line 455-457 verbatim', () => {
    const t = {
      table: 'patients',
      model: 'Patient',
      column: 'firstName',
      kind: 'string' as const,
    };
    const context: EncryptionContext = contextFor(t);

    expect(context.service).toBe('tailrd-backend');
    expect(context.purpose).toBe('phi-migration-v0v1-to-v2');
    expect(context.model).toBe('Patient');
    expect(context.field).toBe('firstName');
  });

  test('B.2: context.model + field track input target', () => {
    const t = {
      table: 'medications',
      model: 'Medication',
      column: 'medicationName',
      kind: 'string' as const,
    };
    const context: EncryptionContext = contextFor(t);

    expect(context.model).toBe('Medication');
    expect(context.field).toBe('medicationName');
  });

  test('B.3: context base fields are constant across all targets', () => {
    const contexts = TARGETS.slice(0, 5).map(t => contextFor(t));
    for (const c of contexts) {
      expect(c.service).toBe('tailrd-backend');
      expect(c.purpose).toBe('phi-migration-v0v1-to-v2');
    }
  });
});

// ─── GROUP C: filterNonZeroV2Targets ───────────────────────────────────────

describe('GROUP C: filterNonZeroV2Targets', () => {
  test('C.1: filters out zero-count targets', async () => {
    const subset = TARGETS.slice(0, 4);
    queryRawMock
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 100 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 50 }]);

    const result = await filterNonZeroV2Targets(prisma, subset);

    expect(result).toHaveLength(2);
    expect(result[0].target).toBe(subset[1]);
    expect(result[0].rowCount).toBe(100);
    expect(result[1].target).toBe(subset[3]);
    expect(result[1].rowCount).toBe(50);
  });

  test('C.2: returns empty array when all targets zero (post-rollback scenario)', async () => {
    const subset = TARGETS.slice(0, 3);
    queryRawMock.mockResolvedValue([{ count: 0 }]);

    const result = await filterNonZeroV2Targets(prisma, subset);

    expect(result).toHaveLength(0);
  });

  test('C.3: returns all targets when all non-zero (hypothetical full coverage)', async () => {
    const subset = TARGETS.slice(0, 3);
    queryRawMock.mockResolvedValue([{ count: 42 }]);

    const result = await filterNonZeroV2Targets(prisma, subset);

    expect(result).toHaveLength(3);
    for (const r of result) {
      expect(r.rowCount).toBe(42);
    }
  });

  test('C.4: handles bigint counts (Postgres COUNT::bigint return shape)', async () => {
    const subset = TARGETS.slice(0, 1);
    queryRawMock.mockResolvedValueOnce([{ count: BigInt(225439) }]);

    const result = await filterNonZeroV2Targets(prisma, subset);

    expect(result).toHaveLength(1);
    expect(result[0].rowCount).toBe(225439);
  });

  test('C.5: handles empty result row (defensive null guard)', async () => {
    const subset = TARGETS.slice(0, 1);
    queryRawMock.mockResolvedValueOnce([]);

    const result = await filterNonZeroV2Targets(prisma, subset);

    expect(result).toHaveLength(0);
  });
});

// ─── GROUP D: shapeCheck predicates ────────────────────────────────────────

describe('GROUP D: shapeCheck predicates', () => {
  const context: EncryptionContext = {
    service: 'tailrd-backend',
    purpose: 'phi-migration-v0v1-to-v2',
    model: 'Patient',
    field: 'firstName',
  };
  const envelope = 'enc:v2:fakeWrappedDEK:fakeIV:fakeAuthTag:fakeCiphertext';

  test('D.1: all 4 predicates pass (success path)', async () => {
    const mockDecrypt = jest.fn().mockResolvedValue('test-plaintext');
    const result: ShapeCheckResult = await shapeCheck(envelope, context, mockDecrypt);

    expect(result.success).toBe(true);
    expect(result.predicateAResult).toBe(true);
    expect(result.predicateBResult).toBe(true);
    expect(result.predicateCResult).toBe(true);
    expect(result.predicateDResult).toBe(true);
    expect(result.plaintextLength).toBe('test-plaintext'.length);
    expect(result.decryptError).toBeUndefined();
  });

  test('D.2: predicate A fails (decrypt throws); PHI-exposure-free result', async () => {
    const mockDecrypt = jest.fn().mockRejectedValue(new Error('KMS access denied'));
    const result: ShapeCheckResult = await shapeCheck(envelope, context, mockDecrypt);

    expect(result.success).toBe(false);
    expect(result.predicateAResult).toBe(false);
    // Downstream predicates short-circuit when A fails (no plaintext to evaluate)
    expect(result.predicateBResult).toBe(false);
    expect(result.predicateCResult).toBe(false);
    expect(result.predicateDResult).toBe(false);
    expect(result.plaintextLength).toBe(0);
    expect(result.decryptError).toContain('KMS access denied');
    // PHI-exposure surface: result must NOT carry plaintext fields
    expect(result).not.toHaveProperty('plaintextPrefix');
    expect(result).not.toHaveProperty('plaintext');
    expect(result).not.toHaveProperty('plaintextContent');
  });

  test('D.3: predicate B fails (empty plaintext); ZERO plaintext content recorded', async () => {
    const mockDecrypt = jest.fn().mockResolvedValue('');
    const result: ShapeCheckResult = await shapeCheck(envelope, context, mockDecrypt);

    expect(result.success).toBe(false);
    expect(result.predicateAResult).toBe(true);
    expect(result.predicateBResult).toBe(false);
    expect(result.predicateCResult).toBe(true); // empty string does not start with 'enc:v'
    expect(result.predicateDResult).toBe(true); // empty string fits ≤10000
    expect(result.plaintextLength).toBe(0);
    expect(result.decryptError).toBeUndefined();
  });

  test('D.4: predicate C fails (envelope-encoded leak); plaintext NOT recorded', async () => {
    const leakedPlaintext = 'enc:v0:fake-iv:fake-authtag:fake-ciphertext';
    const mockDecrypt = jest.fn().mockResolvedValue(leakedPlaintext);
    const result: ShapeCheckResult = await shapeCheck(envelope, context, mockDecrypt);

    expect(result.success).toBe(false);
    expect(result.predicateAResult).toBe(true);
    expect(result.predicateBResult).toBe(true);
    expect(result.predicateCResult).toBe(false); // envelope leak
    expect(result.predicateDResult).toBe(true);
    expect(result.plaintextLength).toBe(leakedPlaintext.length);
    // PHI-exposure surface: leaked plaintext NEVER stored in result
    expect(JSON.stringify(result)).not.toContain('fake-iv');
    expect(JSON.stringify(result)).not.toContain('fake-ciphertext');
  });

  test('D.5: predicate D fails (oversized plaintext); content NOT recorded', async () => {
    const oversized = 'x'.repeat(20000);
    const mockDecrypt = jest.fn().mockResolvedValue(oversized);
    const result: ShapeCheckResult = await shapeCheck(envelope, context, mockDecrypt);

    expect(result.success).toBe(false);
    expect(result.predicateAResult).toBe(true);
    expect(result.predicateBResult).toBe(true);
    expect(result.predicateCResult).toBe(true);
    expect(result.predicateDResult).toBe(false);
    expect(result.plaintextLength).toBe(20000);
    // Only metadata recorded; actual 20K plaintext NOT in result
    expect(JSON.stringify(result).length).toBeLessThan(1000);
  });

  test('D.6: multiple predicates can fail simultaneously', async () => {
    // length=12000 (exceeds D), starts with 'enc:v' (fails C), non-empty (B passes)
    const dualFail = 'enc:v0:' + 'x'.repeat(11993);
    const mockDecrypt = jest.fn().mockResolvedValue(dualFail);
    const result: ShapeCheckResult = await shapeCheck(envelope, context, mockDecrypt);

    expect(result.success).toBe(false);
    expect(result.predicateAResult).toBe(true);
    expect(result.predicateBResult).toBe(true);
    expect(result.predicateCResult).toBe(false);
    expect(result.predicateDResult).toBe(false);
    // Both C and D failures recorded distinctly (robust posture; not first-fail-short-circuit)
  });
});

// ─── GROUP E: PHI-exposure surface regression guard ────────────────────────

describe('GROUP E: PHI-exposure surface regression guard', () => {
  test('E.1: ShapeCheckResult interface has no plaintext-content fields', async () => {
    const mockDecrypt = jest.fn().mockResolvedValue('John');
    const result = await shapeCheck(
      'enc:v2:envelope',
      {
        service: 'tailrd-backend',
        purpose: 'phi-migration-v0v1-to-v2',
        model: 'Patient',
        field: 'firstName',
      },
      mockDecrypt,
    );

    const keys = Object.keys(result);
    const forbiddenKeys = ['plaintext', 'plaintextPrefix', 'plaintextContent', 'plaintextSample'];
    for (const k of forbiddenKeys) {
      expect(keys).not.toContain(k);
    }
    // Permitted PHI-free metadata
    expect(keys).toEqual(
      expect.arrayContaining([
        'success',
        'plaintextLength',
        'predicateAResult',
        'predicateBResult',
        'predicateCResult',
        'predicateDResult',
      ]),
    );
  });

  test('E.2: SampleResult shape conforms to plaintext-free contract (type-level)', () => {
    // Compile-time + runtime check: construct a SampleResult; ensure no
    // plaintext fields can be assigned without TypeScript rejection.
    const sample: SampleResult = {
      target: 'patients.firstName',
      rowId: 'test-uuid',
      success: true,
      plaintextLength: 4,
      predicateAResult: true,
      predicateBResult: true,
      predicateCResult: true,
      predicateDResult: true,
    };

    const keys = Object.keys(sample);
    expect(keys).not.toContain('plaintext');
    expect(keys).not.toContain('plaintextPrefix');
    expect(keys).not.toContain('plaintextContent');
  });

  test('E.3: decryptError carries plaintext-free error message', async () => {
    const mockDecrypt = jest
      .fn()
      .mockRejectedValue(new Error('Invalid envelope format at position 7'));
    const result = await shapeCheck(
      'malformed-envelope',
      {
        service: 'tailrd-backend',
        purpose: 'phi-migration-v0v1-to-v2',
        model: 'Patient',
        field: 'firstName',
      },
      mockDecrypt,
    );

    expect(result.decryptError).toBeDefined();
    expect(result.decryptError).toContain('Invalid envelope format');
    // decryptError is plaintext-free by construction: KMS / envelope-format
    // errors do not leak record values. Sanity check: no obvious PHI patterns.
    expect(result.decryptError).not.toMatch(/\b\d{3}-\d{2}-\d{4}\b/); // no SSN
    expect(result.decryptError).not.toMatch(/\b\d{10,}\b/); // no MRN-like long digit run
  });
});

// ─── GROUP F: kind-aware SQL composition (jsonb vs text columns) ──────────
// AUDIT-016 PR 3 STEP 1.7 attempt-1 failed exitCode 2 on PostgreSQL error
// 42883 (operator does not exist: jsonb ~~ unknown). Sister to AUDIT-086
// GROUP G discipline: middleware-bypass code paths need explicit type-aware
// coverage. The migration script's TARGETS const discriminates kind:
// 'string' | 'json'; both filterNonZeroV2Targets and sampleRowsForTarget
// must branch SQL composition accordingly. These tests assert the SQL
// string composition (captured from $queryRawUnsafe mock arg) matches
// expected jsonb-cast pattern for json-kind targets and raw column ref
// pattern for string-kind targets.
describe('GROUP F: kind-aware SQL composition (jsonb vs text)', () => {
  test('F.1: filterNonZeroV2Targets uses ::text cast + leading-quote pattern for json-kind target', async () => {
    const jsonTarget = TARGETS.find(t => t.kind === 'json');
    expect(jsonTarget).toBeDefined();
    queryRawMock.mockResolvedValueOnce([{ count: 42 }]);
    await filterNonZeroV2Targets(prisma, [jsonTarget!]);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
    const sql = queryRawMock.mock.calls[0][0] as string;
    expect(sql).toContain('::text');
    expect(sql).toContain(`'"enc:v2:%'`);
    expect(sql).not.toMatch(/"[a-zA-Z]+"\s+LIKE\s+'enc:v2:%'/);
  });

  test('F.2: filterNonZeroV2Targets uses raw column ref + no-cast pattern for string-kind target (regression guard)', async () => {
    const stringTarget = TARGETS.find(t => t.kind === 'string');
    expect(stringTarget).toBeDefined();
    queryRawMock.mockResolvedValueOnce([{ count: 42 }]);
    await filterNonZeroV2Targets(prisma, [stringTarget!]);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
    const sql = queryRawMock.mock.calls[0][0] as string;
    expect(sql).not.toContain('::text');
    expect(sql).toContain(`LIKE 'enc:v2:%'`);
    expect(sql).not.toContain(`'"enc:v2:%'`);
  });

  test('F.3: sampleRowsForTarget uses #>>{} SELECT + ::text LIKE WHERE for json-kind target', async () => {
    const jsonTarget = TARGETS.find(t => t.kind === 'json');
    expect(jsonTarget).toBeDefined();
    queryRawMock.mockResolvedValueOnce([]);
    await sampleRowsForTarget(prisma, jsonTarget!, 5);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
    const sql = queryRawMock.mock.calls[0][0] as string;
    expect(sql).toContain(`#>>'{}'`);
    expect(sql).toContain('::text LIKE');
    expect(sql).toContain(`'"enc:v2:%'`);
  });

  test('F.4: sampleRowsForTarget uses raw column ref in SELECT for string-kind target (regression guard)', async () => {
    const stringTarget = TARGETS.find(t => t.kind === 'string');
    expect(stringTarget).toBeDefined();
    queryRawMock.mockResolvedValueOnce([]);
    await sampleRowsForTarget(prisma, stringTarget!, 5);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
    const sql = queryRawMock.mock.calls[0][0] as string;
    expect(sql).not.toContain(`#>>'{}'`);
    expect(sql).not.toContain('::text');
    expect(sql).toContain(`LIKE 'enc:v2:%'`);
  });
});