/**
 * AUDIT-016 PR 3 — V0/V1 → V2 envelope migration script tests.
 *
 * Mocks `prisma` (raw SQL + auditLog.create + $executeRawUnsafe + $disconnect),
 * `auditLogger`, and `tenantGuard` so tests run without a live database. Asserts
 * script-level behavior: CLI parsing, pre-flight env gating, confirmation gate,
 * SQL discovery filter, batch iteration, per-row failure containment, safety
 * abort, summary artifact, audit log entries, idempotency.
 *
 * Real migrateRecord() runs through the test (kmsService local-fallback path
 * activates when NODE_ENV !== 'production'). This integrates the script-level
 * logic with the migrateRecord behavior tested in keyRotation.test.ts.
 *
 * Sister to AUDIT-022 backfill test pattern (22 tests; PR 3 target ~25-30).
 */

import crypto from 'crypto';
import { buildV0, buildV1, buildV2 } from '../../../src/services/envelopeFormat';

// ── Mock prisma + auditLogger + tenantGuard BEFORE importing the script ────

const queryRawUnsafe = jest.fn();
const executeRawUnsafe = jest.fn().mockResolvedValue(1);
const auditLogCreate = jest.fn().mockResolvedValue({ id: 'audit-log-id' });
const disconnect = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    $queryRawUnsafe: (...args: unknown[]) => queryRawUnsafe(...args),
    $executeRawUnsafe: (...args: unknown[]) => executeRawUnsafe(...args),
    $disconnect: disconnect,
    auditLog: {
      create: (...args: unknown[]) => auditLogCreate(...args),
    },
  },
}));

const auditLoggerInfo = jest.fn();
const auditLoggerError = jest.fn();
const auditLoggerWarn = jest.fn();
jest.mock('../../../src/middleware/auditLogger', () => ({
  auditLogger: {
    info: (...args: unknown[]) => auditLoggerInfo(...args),
    error: (...args: unknown[]) => auditLoggerError(...args),
    warn: (...args: unknown[]) => auditLoggerWarn(...args),
  },
}));

jest.mock('../../../src/middleware/tenantGuard', () => ({
  TENANT_GUARD_BYPASS: Symbol('TENANT_GUARD_BYPASS_MOCK'),
}));

const fsMkdir = jest.fn().mockResolvedValue(undefined);
const fsWriteFile = jest.fn().mockResolvedValue(undefined);
jest.mock('fs', () => ({
  promises: {
    mkdir: (...args: unknown[]) => fsMkdir(...args),
    writeFile: (...args: unknown[]) => fsWriteFile(...args),
  },
}));

import {
  main,
  parseArgs,
  preFlightValidate,
  checkExecuteConfirmation,
  writeSummaryArtifact,
  countTarget,
  fetchV0V1Rows,
  migrateTarget,
  TARGETS,
  type CliOptions,
} from '../../../scripts/migrations/audit-016-pr3-v0v1-to-v2';

// 64 hex chars = 256-bit AES key
const TEST_KEY = crypto.randomBytes(32).toString('hex');

const PRE_FLIGHT_ENV = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  PHI_ENCRYPTION_KEY: TEST_KEY,
  AWS_KMS_PHI_KEY_ALIAS: 'alias/test-tailrd-phi',
  PHI_ENVELOPE_VERSION: 'v2',
  AUDIT_016_PR3_EXECUTE_CONFIRMED: 'yes',
  NODE_ENV: 'test',
};

const ORIG_ENV = { ...process.env };
beforeAll(() => {
  Object.assign(process.env, PRE_FLIGHT_ENV);
  delete process.env.DEMO_MODE;
});
afterAll(() => {
  process.env = ORIG_ENV;
});

beforeEach(() => {
  jest.clearAllMocks();
  auditLogCreate.mockResolvedValue({ id: 'audit-log-id' });
  executeRawUnsafe.mockResolvedValue(1);
});

// ── Envelope helpers ─────────────────────────────────────────────────────

function makeV0(plaintext: string): string {
  const key = Buffer.from(TEST_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let enc = cipher.update(plaintext, 'utf8', 'hex');
  enc += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return buildV0(iv.toString('hex'), authTag, enc);
}

function makeV1(plaintext: string): string {
  const key = Buffer.from(TEST_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let enc = cipher.update(plaintext, 'utf8', 'hex');
  enc += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return buildV1(iv.toString('hex'), authTag, enc);
}

// ── SQL routing helper ────────────────────────────────────────────────────

interface SqlScript {
  totals: Map<string, number>;     // key: `${table}.${column}`
  v2: Map<string, number>;
  v0v1: Map<string, number>;
  plaintext: Map<string, number>;
  rows: Map<string, Array<{ id: string; value: string }>>; // drained on fetch
  missingColumns: Set<string>;
}

function emptyScript(): SqlScript {
  return {
    totals: new Map(),
    v2: new Map(),
    v0v1: new Map(),
    plaintext: new Map(),
    rows: new Map(),
    missingColumns: new Set(),
  };
}

function routeSql(script: SqlScript) {
  return (sql: unknown, ..._params: unknown[]) => {
    const s = String(sql);

    if (s.includes('information_schema.columns')) {
      const tm = s.match(/table_name = '([^']+)'/);
      const cm = s.match(/column_name = '([^']+)'/);
      if (tm && cm) {
        const k = `${tm[1]}.${cm[1]}`;
        if (script.missingColumns.has(k)) return Promise.resolve([]);
        return Promise.resolve([{ data_type: 'text' }]);
      }
      return Promise.resolve([{ data_type: 'text' }]);
    }

    const m = s.match(/FROM "([^"]+)"\s+WHERE "([^"]+)"/);
    if (!m) return Promise.resolve([{ c: 0n }]);
    const [, table, column] = m;
    const k = `${table}.${column}`;

    if (s.includes('COUNT(*)::bigint')) {
      // Order matters: most-specific first.
      if (s.includes("LIKE 'enc:%'") && s.includes("NOT LIKE 'enc:v2:%'")) {
        return Promise.resolve([{ c: BigInt(script.v0v1.get(k) ?? 0) }]);
      }
      if (s.includes("LIKE 'enc:v2:%'")) {
        return Promise.resolve([{ c: BigInt(script.v2.get(k) ?? 0) }]);
      }
      if (s.includes("NOT LIKE 'enc:%'")) {
        return Promise.resolve([{ c: BigInt(script.plaintext.get(k) ?? 0) }]);
      }
      // total
      return Promise.resolve([{ c: BigInt(script.totals.get(k) ?? 0) }]);
    }

    if (s.includes('SELECT id') && s.includes('LIMIT')) {
      const limitMatch = s.match(/LIMIT\s+(\d+)/);
      const limit = limitMatch ? Number.parseInt(limitMatch[1], 10) : 50;
      const remaining = script.rows.get(k) ?? [];
      const taken = remaining.splice(0, limit);
      script.rows.set(k, remaining);
      return Promise.resolve(taken);
    }

    return Promise.resolve([{ c: 0n }]);
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('parseArgs', () => {
  it('defaults to dry-run mode + 50 batch + 100 pauseMs + null target', () => {
    expect(parseArgs([])).toEqual({ mode: 'dry-run', batch: 50, pauseMs: 100, target: null });
  });
  it('parses --execute --batch 100 --pause-ms 250 --target patients.firstName', () => {
    expect(
      parseArgs(['--execute', '--batch', '100', '--pause-ms', '250', '--target', 'patients.firstName']),
    ).toEqual({
      mode: 'execute',
      batch: 100,
      pauseMs: 250,
      target: { table: 'patients', column: 'firstName' },
    });
  });
  it('rejects negative --pause-ms', () => {
    expect(() => parseArgs(['--pause-ms', '-5'])).toThrow(/non-negative/);
  });
  it('rejects zero --batch', () => {
    expect(() => parseArgs(['--batch', '0'])).toThrow(/positive integer/);
  });
  it('rejects malformed --target (no dot)', () => {
    expect(() => parseArgs(['--target', 'patients_firstName'])).toThrow(/<table>\.<column>/);
  });
});

describe('preFlightValidate', () => {
  const FULL = {
    DATABASE_URL: 'x',
    PHI_ENCRYPTION_KEY: 'a'.repeat(64),
    AWS_KMS_PHI_KEY_ALIAS: 'alias/x',
    PHI_ENVELOPE_VERSION: 'v2',
  };

  it('passes when all four env vars are set', () => {
    const r = preFlightValidate(FULL);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });
  it('fails when DATABASE_URL is missing', () => {
    const env = { ...FULL };
    delete (env as Partial<typeof FULL>).DATABASE_URL;
    const r = preFlightValidate(env as NodeJS.ProcessEnv);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/DATABASE_URL/);
  });
  it('fails when AWS_KMS_PHI_KEY_ALIAS is missing', () => {
    const env = { ...FULL };
    delete (env as Partial<typeof FULL>).AWS_KMS_PHI_KEY_ALIAS;
    const r = preFlightValidate(env as NodeJS.ProcessEnv);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/AWS_KMS_PHI_KEY_ALIAS/);
  });
  it('fails when PHI_ENVELOPE_VERSION !== v2', () => {
    const r = preFlightValidate({ ...FULL, PHI_ENVELOPE_VERSION: 'v1' });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/PHI_ENVELOPE_VERSION/);
  });
  it('fails when DEMO_MODE=true', () => {
    const r = preFlightValidate({ ...FULL, DEMO_MODE: 'true' });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/DEMO_MODE/);
  });
  it('warns when PHI_ENCRYPTION_KEY length is not 64', () => {
    const r = preFlightValidate({ ...FULL, PHI_ENCRYPTION_KEY: 'a'.repeat(32) });
    expect(r.ok).toBe(true);
    expect(r.warnings.join(' ')).toMatch(/length is 32/);
  });
});

describe('checkExecuteConfirmation', () => {
  it('rejects when AUDIT_016_PR3_EXECUTE_CONFIRMED is not yes', () => {
    expect(checkExecuteConfirmation({}).ok).toBe(false);
    expect(checkExecuteConfirmation({ AUDIT_016_PR3_EXECUTE_CONFIRMED: 'true' }).ok).toBe(false);
  });
  it('accepts when AUDIT_016_PR3_EXECUTE_CONFIRMED=yes', () => {
    expect(checkExecuteConfirmation({ AUDIT_016_PR3_EXECUTE_CONFIRMED: 'yes' }).ok).toBe(true);
  });
});

describe('TARGETS array', () => {
  it('covers ~66 (table, column) pairs spanning string + json kinds', () => {
    expect(TARGETS.length).toBeGreaterThanOrEqual(60);
    expect(TARGETS.length).toBeLessThanOrEqual(75);
    const stringCount = TARGETS.filter(t => t.kind === 'string').length;
    const jsonCount = TARGETS.filter(t => t.kind === 'json').length;
    expect(stringCount).toBeGreaterThan(30);   // ~38 string fields
    expect(jsonCount).toBeGreaterThan(20);     // ~28 json columns
  });
  it('every target has table + model + column + kind', () => {
    for (const t of TARGETS) {
      expect(typeof t.table).toBe('string');
      expect(typeof t.model).toBe('string');
      expect(typeof t.column).toBe('string');
      expect(['string', 'json']).toContain(t.kind);
    }
  });
});

describe('main — dry-run mode', () => {
  it('reports per-target counts without writes', async () => {
    const script = emptyScript();
    script.totals.set('patients.firstName', 100);
    script.v2.set('patients.firstName', 25);
    script.v0v1.set('patients.firstName', 75);
    script.plaintext.set('patients.firstName', 0);
    queryRawUnsafe.mockImplementation(routeSql(script));

    const opts: CliOptions = { mode: 'dry-run', batch: 50, pauseMs: 0, target: { table: 'patients', column: 'firstName' } };
    const code = await main(opts);

    expect(code).toBe(0);
    expect(executeRawUnsafe).not.toHaveBeenCalled();
    expect(auditLogCreate).not.toHaveBeenCalled();
    expect(fsWriteFile).toHaveBeenCalled(); // summary artifact written
  });

  it('--target restriction filters TARGETS to single (table, column)', async () => {
    const script = emptyScript();
    script.totals.set('alerts.message', 10);
    script.v0v1.set('alerts.message', 0);
    queryRawUnsafe.mockImplementation(routeSql(script));

    const opts: CliOptions = { mode: 'dry-run', batch: 50, pauseMs: 0, target: { table: 'alerts', column: 'message' } };
    const code = await main(opts);

    expect(code).toBe(0);
    // Only alerts.message should have triggered SQL queries
    const tableNames = queryRawUnsafe.mock.calls
      .map(c => String(c[0]).match(/FROM "([^"]+)"/))
      .filter(Boolean)
      .map(m => m![1]);
    const uniqueTables = new Set(tableNames);
    expect(uniqueTables.has('alerts')).toBe(true);
    // No other PHI tables hit
    expect(uniqueTables.has('patients')).toBe(false);
  });

  it('returns exit code 2 when --target not in TARGETS', async () => {
    queryRawUnsafe.mockImplementation(routeSql(emptyScript()));
    const opts: CliOptions = { mode: 'dry-run', batch: 50, pauseMs: 0, target: { table: 'nonexistent', column: 'x' } };
    const code = await main(opts);
    expect(code).toBe(2);
  });

  it('reports column-not-found drift as skipped target', async () => {
    const script = emptyScript();
    script.missingColumns.add('patients.firstName');
    queryRawUnsafe.mockImplementation(routeSql(script));

    const opts: CliOptions = { mode: 'dry-run', batch: 50, pauseMs: 0, target: { table: 'patients', column: 'firstName' } };
    const code = await main(opts);
    expect(code).toBe(0);
    // Summary artifact should record skip
    expect(fsWriteFile).toHaveBeenCalled();
    const writtenJson = JSON.parse(fsWriteFile.mock.calls[0][1] as string);
    expect(writtenJson.skippedTargets.length).toBe(1);
    expect(writtenJson.summary.targetsSkipped).toBe(1);
  });
});

describe('main — execute mode', () => {
  it('rejects without AUDIT_016_PR3_EXECUTE_CONFIRMED env', async () => {
    const orig = process.env.AUDIT_016_PR3_EXECUTE_CONFIRMED;
    delete process.env.AUDIT_016_PR3_EXECUTE_CONFIRMED;
    queryRawUnsafe.mockImplementation(routeSql(emptyScript()));

    const opts: CliOptions = { mode: 'execute', batch: 50, pauseMs: 0, target: null };
    const code = await main(opts);

    expect(code).toBe(1);
    expect(executeRawUnsafe).not.toHaveBeenCalled();

    process.env.AUDIT_016_PR3_EXECUTE_CONFIRMED = orig;
  });

  it('rejects when PHI_ENVELOPE_VERSION != v2 (pre-flight)', async () => {
    const orig = process.env.PHI_ENVELOPE_VERSION;
    process.env.PHI_ENVELOPE_VERSION = 'v1';
    queryRawUnsafe.mockImplementation(routeSql(emptyScript()));

    const opts: CliOptions = { mode: 'execute', batch: 50, pauseMs: 0, target: null };
    const code = await main(opts);

    expect(code).toBe(1);
    expect(executeRawUnsafe).not.toHaveBeenCalled();

    process.env.PHI_ENVELOPE_VERSION = orig;
  });

  it('migrates V0+V1 candidates to V2 and bypasses middleware via $executeRawUnsafe', async () => {
    const script = emptyScript();
    const v0 = makeV0('Alice');
    const v1 = makeV1('Bob');
    script.totals.set('patients.firstName', 2);
    script.v0v1.set('patients.firstName', 2);
    script.rows.set('patients.firstName', [
      { id: 'rec-1', value: v0 },
      { id: 'rec-2', value: v1 },
    ]);
    queryRawUnsafe.mockImplementation(routeSql(script));

    const opts: CliOptions = { mode: 'execute', batch: 50, pauseMs: 0, target: { table: 'patients', column: 'firstName' } };
    const code = await main(opts);

    expect(code).toBe(0);
    expect(executeRawUnsafe).toHaveBeenCalledTimes(2);
    const queries = executeRawUnsafe.mock.calls.map(c => c[0]);
    for (const q of queries) {
      expect(q).toMatch(/UPDATE "patients" SET "firstName" = \$1 WHERE id = \$2/);
    }
    // V2 envelope payload check
    const v2Envelopes = executeRawUnsafe.mock.calls.map(c => c[1] as string);
    for (const env of v2Envelopes) {
      expect(env.startsWith('enc:v2:')).toBe(true);
    }
    // Per-row PHI_RECORD_MIGRATED audit log entries
    const migratedCalls = auditLoggerInfo.mock.calls.filter(
      c => (c[1] as { action?: string }).action === 'PHI_RECORD_MIGRATED',
    );
    expect(migratedCalls.length).toBe(2);
    // Per-batch PHI_MIGRATION_BATCH_COMPLETED entry
    const batchCompleted = auditLogCreate.mock.calls.find(c => {
      const data = (c[0] as { data: { action?: string } }).data;
      return data.action === 'PHI_MIGRATION_BATCH_COMPLETED';
    });
    expect(batchCompleted).toBeDefined();
  });

  it('V2 race-skip: input that is already V2 is skipped + logged + no DB write', async () => {
    const script = emptyScript();
    const v2 = buildV2('fakeWrappedDEK', 'fakeIv', 'fakeAuthTag', 'fakeCiphertext');
    script.totals.set('patients.firstName', 1);
    script.v0v1.set('patients.firstName', 1); // SQL filter said V0V1 but value leaked V2 (race)
    script.rows.set('patients.firstName', [{ id: 'rec-race', value: v2 }]);
    queryRawUnsafe.mockImplementation(routeSql(script));

    const opts: CliOptions = { mode: 'execute', batch: 50, pauseMs: 0, target: { table: 'patients', column: 'firstName' } };
    const code = await main(opts);

    expect(code).toBe(0);
    expect(executeRawUnsafe).not.toHaveBeenCalled(); // D3 no-op-write
    const skipCalls = auditLoggerInfo.mock.calls.filter(
      c => (c[1] as { action?: string }).action === 'PHI_RECORD_SKIPPED_ALREADY_V2',
    );
    expect(skipCalls.length).toBe(1);
  });

  it('per-row failure containment: continue on one bad row', async () => {
    const script = emptyScript();
    script.totals.set('patients.firstName', 2);
    script.v0v1.set('patients.firstName', 2);
    script.rows.set('patients.firstName', [
      { id: 'rec-good', value: makeV0('Carol') },
      { id: 'rec-bad', value: 'not-an-envelope' },  // parseEnvelope will throw
    ]);
    queryRawUnsafe.mockImplementation(routeSql(script));

    const opts: CliOptions = { mode: 'execute', batch: 50, pauseMs: 0, target: { table: 'patients', column: 'firstName' } };
    const code = await main(opts);

    expect(code).toBe(1); // failures present
    expect(executeRawUnsafe).toHaveBeenCalledTimes(1); // only good row written
    const failureCalls = auditLoggerError.mock.calls.filter(
      c => (c[1] as { action?: string }).action === 'PHI_MIGRATION_FAILURE',
    );
    expect(failureCalls.length).toBe(1);
  });

  it('safety abort: all rows in batch fail → stop the target (sister to AUDIT-022 :416)', async () => {
    const script = emptyScript();
    script.totals.set('patients.firstName', 100);
    script.v0v1.set('patients.firstName', 100);
    // Every row malformed → every migrateRecord throws
    script.rows.set(
      'patients.firstName',
      Array.from({ length: 100 }, (_, i) => ({ id: `rec-${i}`, value: 'malformed' })),
    );
    queryRawUnsafe.mockImplementation(routeSql(script));

    const opts: CliOptions = { mode: 'execute', batch: 50, pauseMs: 0, target: { table: 'patients', column: 'firstName' } };
    const code = await main(opts);

    expect(code).toBe(1);
    // Safety abort triggers after first batch (50 rows). Should NOT process all 100.
    const failureCalls = auditLoggerError.mock.calls.filter(
      c => (c[1] as { action?: string }).action === 'PHI_MIGRATION_FAILURE',
    );
    expect(failureCalls.length).toBe(50); // first batch only
    // Per-batch _FAILED entry (not _COMPLETED)
    const batchFailed = auditLogCreate.mock.calls.find(c => {
      const data = (c[0] as { data: { action?: string } }).data;
      return data.action === 'PHI_MIGRATION_BATCH_FAILED';
    });
    expect(batchFailed).toBeDefined();
  });

  it('re-run idempotency: second run on already-V2 target → 0 rows attempted', async () => {
    const script = emptyScript();
    script.totals.set('patients.firstName', 100);
    script.v2.set('patients.firstName', 100);
    script.v0v1.set('patients.firstName', 0);
    script.rows.set('patients.firstName', []); // SQL filter excludes V2
    queryRawUnsafe.mockImplementation(routeSql(script));

    const opts: CliOptions = { mode: 'execute', batch: 50, pauseMs: 0, target: { table: 'patients', column: 'firstName' } };
    const code = await main(opts);

    expect(code).toBe(0);
    expect(executeRawUnsafe).not.toHaveBeenCalled();
    expect(auditLogCreate).not.toHaveBeenCalled(); // no batches started
  });

  it('--batch flag honored: smaller batches result in more SQL fetches', async () => {
    const script = emptyScript();
    script.totals.set('patients.firstName', 5);
    script.v0v1.set('patients.firstName', 5);
    script.rows.set(
      'patients.firstName',
      Array.from({ length: 5 }, (_, i) => ({ id: `rec-${i}`, value: makeV0(`p${i}`) })),
    );
    queryRawUnsafe.mockImplementation(routeSql(script));

    const opts: CliOptions = { mode: 'execute', batch: 2, pauseMs: 0, target: { table: 'patients', column: 'firstName' } };
    const code = await main(opts);

    expect(code).toBe(0);
    expect(executeRawUnsafe).toHaveBeenCalledTimes(5);
    const fetchSqlCalls = queryRawUnsafe.mock.calls
      .map(c => String(c[0]))
      .filter(s => s.includes('SELECT id'));
    // Batches: 2 + 2 + 1 + (empty fetch terminates) = 4 fetches
    expect(fetchSqlCalls.length).toBeGreaterThanOrEqual(3);
  });
});

describe('writeSummaryArtifact', () => {
  it('writes timestamped JSON envelope to backend/var/', async () => {
    const envelope = { audit: 'AUDIT-016-PR-3', mode: 'dry-run', summary: { totalsByTarget: [] } };
    const file = await writeSummaryArtifact(envelope, 'dry-run');
    expect(file).toMatch(/audit-016-pr3-dry-run-/);
    expect(file).toMatch(/\.json$/);
    expect(fsMkdir).toHaveBeenCalled();
    expect(fsWriteFile).toHaveBeenCalled();
    const writtenContent = fsWriteFile.mock.calls[0][1] as string;
    expect(JSON.parse(writtenContent).audit).toBe('AUDIT-016-PR-3');
  });
});

describe('countTarget + fetchV0V1Rows', () => {
  it('countTarget returns split: total / v2 / v0v1 / plaintext', async () => {
    const script = emptyScript();
    script.totals.set('patients.firstName', 100);
    script.v2.set('patients.firstName', 30);
    script.v0v1.set('patients.firstName', 60);
    script.plaintext.set('patients.firstName', 10);
    queryRawUnsafe.mockImplementation(routeSql(script));

    const t = TARGETS.find(t => t.table === 'patients' && t.column === 'firstName')!;
    const counts = await countTarget(t);
    expect(counts).toEqual({ total: 100, v2: 30, v0v1: 60, plaintext: 10 });
  });

  it('fetchV0V1Rows returns id+value pairs respecting LIMIT', async () => {
    const script = emptyScript();
    script.rows.set('patients.firstName', [
      { id: 'rec-a', value: 'enc:foo' },
      { id: 'rec-b', value: 'enc:bar' },
      { id: 'rec-c', value: 'enc:baz' },
    ]);
    queryRawUnsafe.mockImplementation(routeSql(script));

    const t = TARGETS.find(t => t.table === 'patients' && t.column === 'firstName')!;
    const rows = await fetchV0V1Rows(t, 2);
    expect(rows.length).toBe(2);
    expect(rows[0].id).toBe('rec-a');
    expect(rows[1].id).toBe('rec-b');
  });
});

describe('migrateTarget direct-call', () => {
  it('returns clean report when v0v1 = 0 (early-return; no batch processing)', async () => {
    const script = emptyScript();
    script.totals.set('patients.firstName', 50);
    script.v2.set('patients.firstName', 50);
    script.v0v1.set('patients.firstName', 0);
    queryRawUnsafe.mockImplementation(routeSql(script));

    const t = TARGETS.find(t => t.table === 'patients' && t.column === 'firstName')!;
    const report = await migrateTarget(t, 50, 0);
    expect(report.rowsAttempted).toBe(0);
    expect(report.rowsMigrated).toBe(0);
    expect(report.afterCounts).toEqual(report.beforeCounts);
  });
});

describe('Audit log cardinality', () => {
  it('emits PHI_MIGRATION_BATCH_STARTED before each batch', async () => {
    const script = emptyScript();
    script.totals.set('patients.firstName', 3);
    script.v0v1.set('patients.firstName', 3);
    script.rows.set(
      'patients.firstName',
      Array.from({ length: 3 }, (_, i) => ({ id: `rec-${i}`, value: makeV0(`p${i}`) })),
    );
    queryRawUnsafe.mockImplementation(routeSql(script));

    const opts: CliOptions = { mode: 'execute', batch: 50, pauseMs: 0, target: { table: 'patients', column: 'firstName' } };
    await main(opts);

    const startedCalls = auditLoggerInfo.mock.calls.filter(
      c => (c[1] as { action?: string }).action === 'PHI_MIGRATION_BATCH_STARTED',
    );
    expect(startedCalls.length).toBe(1); // one batch covers all 3 rows
  });
});
