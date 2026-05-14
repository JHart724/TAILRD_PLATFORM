/**
 * AUDIT-016 PR3 STEP 1.7 v2-rekey-purpose unit tests.
 *
 * Test scope (sister to spotcheck-decrypt.test.ts discipline):
 *   GROUP A: parseArgs (CLI argument handling; 5 tests)
 *   GROUP B: preFlightValidate (env var validation; 3 tests)
 *   GROUP C: checkRekeyConfirmation (execute gate; 2 tests)
 *   GROUP D: countTarget SQL composition (kind-aware; 2 tests)
 *   GROUP E: fetchV2Rows SQL composition (kind-aware with json unwrap; 2 tests)
 *   GROUP F: rekeyTarget graceful-skip on canonical-purpose records (3 tests)
 *
 * Test mocking discipline:
 *   - prisma client: jest.mock at module level
 *   - auditLogger: jest.mock at module level
 *   - rekeyV2Record: jest.mock at module level (no real KMS in tests)
 *
 * PHI-handling: synthetic non-PHI fixtures only; sister to PHI-exposure
 * discipline at script level.
 *
 * Sister to:
 *   - audit-016-pr3-spotcheck-decrypt.test.ts (PR #273 cadence)
 *   - keyRotation.test.ts T-REKEY-1 through T-REKEY-7 (Day 13)
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

jest.mock('../../../src/services/keyRotation', () => ({
  __esModule: true,
  rekeyV2Record: jest.fn(),
}));

import prisma from '../../../src/lib/prisma';
import { rekeyV2Record } from '../../../src/services/keyRotation';
import {
  parseArgs,
  preFlightValidate,
  checkRekeyConfirmation,
  countTarget,
  fetchV2Rows,
  rekeyTarget,
  type CliOptions,
} from '../../../scripts/migrations/audit-016-pr3-v2-rekey-purpose';

const queryRawMock = prisma.$queryRawUnsafe as jest.Mock;
const rekeyMock = rekeyV2Record as jest.Mock;

beforeEach(() => {
  queryRawMock.mockReset();
  rekeyMock.mockReset();
});

// ===== GROUP A: parseArgs =====
describe('GROUP A: parseArgs', () => {
  it('A1: default mode is dry-run with batch=50 pause-ms=100', () => {
    const opts = parseArgs([]);
    expect(opts.mode).toBe('dry-run');
    expect(opts.batch).toBe(50);
    expect(opts.pauseMs).toBe(100);
    expect(opts.target).toBeNull();
  });

  it('A2: --execute sets mode to execute', () => {
    const opts = parseArgs(['--execute']);
    expect(opts.mode).toBe('execute');
  });

  it('A3: --batch parses positive integer; rejects zero or negative', () => {
    expect(parseArgs(['--batch', '100']).batch).toBe(100);
    expect(() => parseArgs(['--batch', '0'])).toThrow(/positive integer/);
    expect(() => parseArgs(['--batch', '-5'])).toThrow(/positive integer/);
    expect(() => parseArgs(['--batch', 'abc'])).toThrow(/positive integer/);
  });

  it('A4: --pause-ms parses non-negative integer; rejects negative', () => {
    expect(parseArgs(['--pause-ms', '200']).pauseMs).toBe(200);
    expect(parseArgs(['--pause-ms', '0']).pauseMs).toBe(0);
    expect(() => parseArgs(['--pause-ms', '-1'])).toThrow(/non-negative integer/);
  });

  it('A5: --target parses table.column format; rejects malformed', () => {
    const opts = parseArgs(['--target', 'audit_logs.description']);
    expect(opts.target).toEqual({ table: 'audit_logs', column: 'description' });
    expect(() => parseArgs(['--target', 'invalid'])).toThrow(/format/);
    expect(() => parseArgs(['--target', '.column'])).toThrow(/format/);
    expect(() => parseArgs(['--target', 'table.'])).toThrow(/format/);
  });
});

// ===== GROUP B: preFlightValidate =====
describe('GROUP B: preFlightValidate', () => {
  it('B1: returns ok=true when all required env vars present and PHI_ENVELOPE_VERSION=v2', () => {
    const result = preFlightValidate({
      DATABASE_URL: 'postgres://test',
      PHI_ENCRYPTION_KEY: 'a'.repeat(64),
      AWS_KMS_PHI_KEY_ALIAS: 'alias/test',
      PHI_ENVELOPE_VERSION: 'v2',
    } as NodeJS.ProcessEnv);
    expect(result.ok).toBe(true);
  });

  it('B2: returns ok=false when DATABASE_URL missing', () => {
    const result = preFlightValidate({
      PHI_ENCRYPTION_KEY: 'a'.repeat(64),
      AWS_KMS_PHI_KEY_ALIAS: 'alias/test',
      PHI_ENVELOPE_VERSION: 'v2',
    } as NodeJS.ProcessEnv);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/DATABASE_URL/);
  });

  it('B3: returns ok=false when PHI_ENVELOPE_VERSION is not v2', () => {
    const result = preFlightValidate({
      DATABASE_URL: 'postgres://test',
      PHI_ENCRYPTION_KEY: 'a'.repeat(64),
      AWS_KMS_PHI_KEY_ALIAS: 'alias/test',
      PHI_ENVELOPE_VERSION: 'v1',
    } as NodeJS.ProcessEnv);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/PHI_ENVELOPE_VERSION/);
  });
});

// ===== GROUP C: checkRekeyConfirmation =====
describe('GROUP C: checkRekeyConfirmation', () => {
  it('C1: returns ok=true when AUDIT_016_PR3_REKEY_CONFIRMED=yes', () => {
    const result = checkRekeyConfirmation({ AUDIT_016_PR3_REKEY_CONFIRMED: 'yes' } as NodeJS.ProcessEnv);
    expect(result.ok).toBe(true);
  });

  it('C2: returns ok=false when AUDIT_016_PR3_REKEY_CONFIRMED missing or wrong value', () => {
    expect(checkRekeyConfirmation({} as NodeJS.ProcessEnv).ok).toBe(false);
    expect(checkRekeyConfirmation({ AUDIT_016_PR3_REKEY_CONFIRMED: 'YES' } as NodeJS.ProcessEnv).ok).toBe(false);
    expect(checkRekeyConfirmation({ AUDIT_016_PR3_REKEY_CONFIRMED: 'true' } as NodeJS.ProcessEnv).ok).toBe(false);
  });
});

// ===== GROUP D: countTarget SQL composition =====
describe('GROUP D: countTarget SQL composition (kind-aware)', () => {
  it('D1: string-kind target generates raw column reference (no ::text cast)', async () => {
    queryRawMock.mockResolvedValueOnce([{ c: 10n }]).mockResolvedValueOnce([{ c: 5n }]);
    const target = { table: 'patients', column: 'firstName', model: 'patient', kind: 'string' as const };
    const result = await countTarget(target);
    expect(result).toEqual({ total: 10, v2: 5 });
    const v2Sql = queryRawMock.mock.calls[1][0] as string;
    expect(v2Sql).toContain('"firstName" LIKE \'enc:v2:%\'');
    expect(v2Sql).not.toContain('::text');
  });

  it('D2: json-kind target uses ::text cast and quote-wrapped pattern', async () => {
    queryRawMock.mockResolvedValueOnce([{ c: 20n }]).mockResolvedValueOnce([{ c: 12n }]);
    const target = { table: 'audit_logs', column: 'metadata', model: 'auditLog', kind: 'json' as const };
    const result = await countTarget(target);
    expect(result).toEqual({ total: 20, v2: 12 });
    const v2Sql = queryRawMock.mock.calls[1][0] as string;
    expect(v2Sql).toContain('"metadata"::text LIKE \'"enc:v2:%\'');
  });
});

// ===== GROUP E: fetchV2Rows SQL composition =====
describe('GROUP E: fetchV2Rows SQL composition (kind-aware with json unwrap)', () => {
  it('E1: string-kind target SELECTs raw column', async () => {
    queryRawMock.mockResolvedValueOnce([{ id: 'rec-1', value: 'enc:v2:abc' }]);
    const target = { table: 'patients', column: 'firstName', model: 'patient', kind: 'string' as const };
    const rows = await fetchV2Rows(target, 50);
    expect(rows).toHaveLength(1);
    const sql = queryRawMock.mock.calls[0][0] as string;
    expect(sql).toContain('SELECT id, "firstName" AS value');
    expect(sql).toContain('"firstName" LIKE \'enc:v2:%\'');
    expect(sql).not.toContain("#>>'{}'");
  });

  it('E2: json-kind target uses #>>\'{}\' unwrap in SELECT and ::text in WHERE', async () => {
    queryRawMock.mockResolvedValueOnce([{ id: 'rec-2', value: 'enc:v2:def' }]);
    const target = { table: 'audit_logs', column: 'metadata', model: 'auditLog', kind: 'json' as const };
    const rows = await fetchV2Rows(target, 50);
    expect(rows).toHaveLength(1);
    const sql = queryRawMock.mock.calls[0][0] as string;
    expect(sql).toContain("\"metadata\"#>>'{}' AS value");
    expect(sql).toContain('"metadata"::text LIKE \'"enc:v2:%\'');
  });
});

// ===== GROUP F: rekeyTarget graceful-skip behavior =====
describe('GROUP F: rekeyTarget graceful-skip on canonical-purpose records', () => {
  const target = { table: 'audit_logs', column: 'description', model: 'auditLog', kind: 'string' as const };

  beforeEach(() => {
    // countTarget calls (total + v2)
    queryRawMock
      .mockResolvedValueOnce([{ c: 100n }])
      .mockResolvedValueOnce([{ c: 100n }]);
  });

  it('F1: rekeyV2Record success increments rowsRekeyed', async () => {
    // fetchV2Rows returns 2 rows then empty (terminates loop)
    queryRawMock
      .mockResolvedValueOnce([
        { id: 'rec-1', value: 'enc:v2:aaa' },
        { id: 'rec-2', value: 'enc:v2:bbb' },
      ])
      .mockResolvedValueOnce([]);
    rekeyMock.mockResolvedValue({
      recordId: 'x', table: 'audit_logs', column: 'description',
      fromVersion: 'v2', toVersion: 'v2', fieldsConverted: 1,
      skipped: false, migratedAt: new Date(),
    });
    const report = await rekeyTarget(target, 50, 0);
    expect(report.rowsAttempted).toBe(2);
    expect(report.rowsRekeyed).toBe(2);
    expect(report.rowsSkippedCanonical).toBe(0);
    expect(report.rowsFailed).toBe(0);
  });

  it('F2: decrypt-context-mismatch error (UnknownError) records as rowsSkippedCanonical not rowsFailed', async () => {
    queryRawMock
      .mockResolvedValueOnce([{ id: 'rec-1', value: 'enc:v2:canonical' }])
      .mockResolvedValueOnce([]);
    // Sister to audit_logs.description Day 13 finding: production record already
    // under canonical purpose; decrypt-with-old-purpose fails as UnknownError.
    rekeyMock.mockRejectedValue(new Error('UnknownError'));
    const report = await rekeyTarget(target, 50, 0);
    expect(report.rowsAttempted).toBe(1);
    expect(report.rowsRekeyed).toBe(0);
    expect(report.rowsSkippedCanonical).toBe(1);
    expect(report.rowsFailed).toBe(0);
    expect(report.errors).toHaveLength(0);
  });

  it('F3: non-context-mismatch error (e.g. SQL UPDATE failure) records as rowsFailed', async () => {
    queryRawMock
      .mockResolvedValueOnce([{ id: 'rec-1', value: 'enc:v2:abc' }])
      .mockResolvedValueOnce([]);
    rekeyMock.mockRejectedValue(new Error('connection terminated'));
    const report = await rekeyTarget(target, 50, 0);
    expect(report.rowsAttempted).toBe(1);
    expect(report.rowsRekeyed).toBe(0);
    expect(report.rowsSkippedCanonical).toBe(0);
    expect(report.rowsFailed).toBe(1);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0].recordId).toBe('rec-1');
    expect(report.errors[0].message).toMatch(/connection terminated/);
  });
});