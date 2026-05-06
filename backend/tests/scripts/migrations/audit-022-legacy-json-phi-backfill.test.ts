/**
 * AUDIT-022 Legacy JSON PHI backfill — unit tests.
 *
 * Mocks `prisma` (raw SQL + per-model findUnique/update + auditLog.create) and
 * `auditLogger` so tests run without a live database. Asserts script-level
 * behavior: detection counts, batch iteration, idempotency, partial-failure
 * resilience, single-target restriction. Encryption-on-write is exercised
 * separately by the existing applyPHIEncryption middleware (not under test).
 */

// ── Mock prisma + auditLogger BEFORE importing the script ──────────────────

const queryRawUnsafe = jest.fn();
const alertFindUnique = jest.fn();
const alertUpdate = jest.fn();
const webhookEventFindUnique = jest.fn();
const webhookEventUpdate = jest.fn();
const auditLogCreate = jest.fn().mockResolvedValue({ id: 'audit-log-id' });
const disconnect = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    $queryRawUnsafe: (...args: unknown[]) => queryRawUnsafe(...args),
    $disconnect: disconnect,
    alert: {
      findUnique: (...args: unknown[]) => alertFindUnique(...args),
      update: (...args: unknown[]) => alertUpdate(...args),
    },
    webhookEvent: {
      findUnique: (...args: unknown[]) => webhookEventFindUnique(...args),
      update: (...args: unknown[]) => webhookEventUpdate(...args),
    },
    auditLog: {
      create: (...args: unknown[]) => auditLogCreate(...args),
    },
  },
}));

jest.mock('../../../src/middleware/auditLogger', () => ({
  auditLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../../src/middleware/tenantGuard', () => ({
  TENANT_GUARD_BYPASS: Symbol('TENANT_GUARD_BYPASS_MOCK'),
}));

// Mock fs.promises so writeSummaryArtifact doesn't touch the filesystem.
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
  TARGETS,
} from '../../../scripts/migrations/audit-022-legacy-json-phi-backfill';

// Pre-flight requires these env vars to be set for any main() invocation.
const PRE_FLIGHT_ENV = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  PHI_ENCRYPTION_KEY: 'a'.repeat(64), // 64 hex chars = 256-bit key
  AUDIT_022_EXECUTE_CONFIRMED: 'yes',
};

const ORIG_ENV = { ...process.env };
beforeAll(() => {
  Object.assign(process.env, PRE_FLIGHT_ENV);
});
afterAll(() => {
  // Restore original env (preserve test isolation).
  for (const k of Object.keys(PRE_FLIGHT_ENV)) {
    if (k in ORIG_ENV) {
      process.env[k] = ORIG_ENV[k];
    } else {
      delete process.env[k];
    }
  }
});

// ── SQL routing helper ─────────────────────────────────────────────────────
// Every call to $queryRawUnsafe goes through `route(sql, table, column)` so
// each test specifies counts + legacy IDs per (table, column).

interface SqlScript {
  totals: Map<string, number>;        // key: `${table}.${column}.total`
  encrypted: Map<string, number>;     // key: `${table}.${column}.encrypted`
  legacy: Map<string, number>;        // key: `${table}.${column}.legacy`
  ids: Map<string, string[]>;         // key: `${table}.${column}` — full list, drained as fetched
}

function routeSql(script: SqlScript, opts: { missingColumns?: Set<string> } = {}) {
  return (sql: unknown, ..._params: unknown[]) => {
    const s = String(sql);

    // information_schema.columns pre-flight check.
    // Matches: SELECT data_type FROM information_schema.columns
    //          WHERE table_schema = 'public' AND table_name = '<t>' AND column_name = '<c>'
    if (s.includes('information_schema.columns')) {
      const tm = s.match(/table_name = '([^']+)'/);
      const cm = s.match(/column_name = '([^']+)'/);
      if (tm && cm) {
        const k = `${tm[1]}.${cm[1]}`;
        if (opts.missingColumns?.has(k)) return Promise.resolve([]);
        return Promise.resolve([{ data_type: 'jsonb' }]);
      }
      return Promise.resolve([{ data_type: 'jsonb' }]);
    }

    // Extract table + column from the SQL text. Matches:
    //   SELECT COUNT(*)::bigint AS c FROM "<table>" WHERE "<column>" IS NOT NULL ...
    //   SELECT id FROM "<table>" WHERE "<column>" ...
    const m = s.match(/FROM "([^"]+)"\s+WHERE "([^"]+)"/);
    if (!m) return Promise.resolve([{ c: 0n }]);
    const [, table, column] = m;
    const k = `${table}.${column}`;

    if (s.includes('COUNT(*)::bigint')) {
      if (s.includes("NOT LIKE '\"enc:%'") && s.includes('NOT IN')) {
        return Promise.resolve([{ c: BigInt(script.legacy.get(k) ?? 0) }]);
      }
      if (s.includes("LIKE '\"enc:%'")) {
        return Promise.resolve([{ c: BigInt(script.encrypted.get(k) ?? 0) }]);
      }
      // total
      return Promise.resolve([{ c: BigInt(script.totals.get(k) ?? 0) }]);
    }

    if (s.includes('SELECT id FROM')) {
      const limitMatch = s.match(/LIMIT\s+(\d+)/);
      const limit = limitMatch ? Number.parseInt(limitMatch[1], 10) : 50;
      const remaining = script.ids.get(k) ?? [];
      const taken = remaining.splice(0, limit);
      script.ids.set(k, remaining);
      return Promise.resolve(taken.map(id => ({ id })));
    }

    return Promise.resolve([{ c: 0n }]);
  };
}

function emptyScript(): SqlScript {
  return {
    totals: new Map(),
    encrypted: new Map(),
    legacy: new Map(),
    ids: new Map(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  auditLogCreate.mockResolvedValue({ id: 'audit-log-id' });
});

describe('parseArgs', () => {
  it('defaults to dry-run mode + 50 batch + 100 pauseMs + null target', () => {
    expect(parseArgs([])).toEqual({ mode: 'dry-run', batch: 50, pauseMs: 100, target: null });
  });
  it('parses --execute --batch 100 --pause-ms 250 --target alerts.triggerData', () => {
    expect(parseArgs(['--execute', '--batch', '100', '--pause-ms', '250', '--target', 'alerts.triggerData'])).toEqual({
      mode: 'execute',
      batch: 100,
      pauseMs: 250,
      target: { table: 'alerts', column: 'triggerData' },
    });
  });
  it('rejects negative --pause-ms', () => {
    expect(() => parseArgs(['--pause-ms', '-5'])).toThrow(/non-negative/);
  });
  it('accepts --pause-ms 0', () => {
    expect(parseArgs(['--pause-ms', '0']).pauseMs).toBe(0);
  });
});

describe('preFlightValidate', () => {
  it('passes when DATABASE_URL + 64-hex PHI_ENCRYPTION_KEY are set', () => {
    const r = preFlightValidate({ DATABASE_URL: 'x', PHI_ENCRYPTION_KEY: 'a'.repeat(64) });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });
  it('fails when DATABASE_URL is missing', () => {
    const r = preFlightValidate({ PHI_ENCRYPTION_KEY: 'a'.repeat(64) });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/DATABASE_URL/);
  });
  it('fails when PHI_ENCRYPTION_KEY is missing', () => {
    const r = preFlightValidate({ DATABASE_URL: 'x' });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/PHI_ENCRYPTION_KEY/);
  });
  it('warns (does not fail) when PHI_ENCRYPTION_KEY length != 64', () => {
    const r = preFlightValidate({ DATABASE_URL: 'x', PHI_ENCRYPTION_KEY: 'short' });
    expect(r.ok).toBe(true);
    expect(r.warnings.join(' ')).toMatch(/AUDIT-017/);
  });
});

describe('checkExecuteConfirmation', () => {
  it('blocks --execute when AUDIT_022_EXECUTE_CONFIRMED is unset', () => {
    const r = checkExecuteConfirmation({});
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/AUDIT_022_EXECUTE_CONFIRMED=yes/);
    expect(r.error).toMatch(/AUDIT_022_PRODUCTION_RUNBOOK/);
  });
  it('blocks --execute when env value is not exactly "yes"', () => {
    expect(checkExecuteConfirmation({ AUDIT_022_EXECUTE_CONFIRMED: 'true' }).ok).toBe(false);
    expect(checkExecuteConfirmation({ AUDIT_022_EXECUTE_CONFIRMED: '1' }).ok).toBe(false);
  });
  it('passes when env value is exactly "yes"', () => {
    expect(checkExecuteConfirmation({ AUDIT_022_EXECUTE_CONFIRMED: 'yes' }).ok).toBe(true);
  });
});

describe('TARGETS coverage', () => {
  it('declares 28 (table, column) pairs across 15 models (post §17.1 cleanup)', () => {
    expect(TARGETS).toHaveLength(28);
    const models = new Set(TARGETS.map(t => t.model));
    expect(models.size).toBe(15);
    // §17.1 cleanup verification: stale references removed.
    const pairs = TARGETS.map(t => `${t.table}.${t.column}`);
    expect(pairs).not.toContain('risk_score_assessments.inputs');
    expect(pairs).not.toContain('intervention_tracking.outcomes');
  });
});

describe('AUDIT-022 backfill — 7 design tests', () => {
  // ── Test 1: dry-run produces no DB writes ────────────────────────────────
  it('Test 1: dry-run produces no DB writes (no findUnique / update / auditLog.create)', async () => {
    const script = emptyScript();
    // 5 legacy alerts, 0 elsewhere
    script.totals.set('alerts.triggerData', 10);
    script.encrypted.set('alerts.triggerData', 5);
    script.legacy.set('alerts.triggerData', 5);
    queryRawUnsafe.mockImplementation(routeSql(script));

    const code = await main({ mode: 'dry-run', batch: 50, pauseMs: 0, target: null });

    expect(code).toBe(0);
    expect(alertFindUnique).not.toHaveBeenCalled();
    expect(alertUpdate).not.toHaveBeenCalled();
    expect(auditLogCreate).not.toHaveBeenCalled();
  });

  // ── Test 2: execute encrypts target column (modelClient.update called) ──
  it('Test 2: execute mode invokes modelClient.update for each legacy row', async () => {
    const script = emptyScript();
    script.totals.set('alerts.triggerData', 3);
    script.encrypted.set('alerts.triggerData', 0);
    script.legacy.set('alerts.triggerData', 3);
    script.ids.set('alerts.triggerData', ['a-1', 'a-2', 'a-3']);
    queryRawUnsafe.mockImplementation(routeSql(script));

    alertFindUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({ triggerData: { sourceId: where.id, payload: { ok: true } } }),
    );
    alertUpdate.mockImplementation(() => {
      // After the update, simulate a clean post-state: legacy=0, encrypted=3.
      script.legacy.set('alerts.triggerData', 0);
      script.encrypted.set('alerts.triggerData', 3);
      return Promise.resolve({ id: 'updated' });
    });

    const code = await main({
      mode: 'execute',
      batch: 50,
      pauseMs: 0,
      target: { table: 'alerts', column: 'triggerData' },
    });

    expect(code).toBe(0);
    expect(alertUpdate).toHaveBeenCalledTimes(3);
    expect(alertUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'a-1' },
      data: { triggerData: { sourceId: 'a-1', payload: { ok: true } } },
    }));
  });

  // ── Test 3: round-trip — value passed to update deep-equals findUnique ─
  it('Test 3: value written via update deep-equals value read via findUnique (script is a passthrough; middleware encrypts)', async () => {
    const script = emptyScript();
    script.totals.set('alerts.triggerData', 1);
    script.legacy.set('alerts.triggerData', 1);
    script.ids.set('alerts.triggerData', ['a-1']);
    queryRawUnsafe.mockImplementation(routeSql(script));

    const ORIGINAL = {
      gapId: 'GAP-001',
      patient: { mrn: 'MRN-12345', dob: '1955-03-14' },
      triggers: ['HF-LVEF-LT40', 'NO-ARNI-90D'],
      meta: { source: 'cqlEngine', detectedAt: '2026-04-30T18:22:11Z' },
    };

    alertFindUnique.mockResolvedValueOnce({ triggerData: ORIGINAL });
    alertUpdate.mockImplementation(() => {
      script.legacy.set('alerts.triggerData', 0);
      return Promise.resolve({});
    });

    await main({
      mode: 'execute',
      batch: 50,
      pauseMs: 0,
      target: { table: 'alerts', column: 'triggerData' },
    });

    expect(alertUpdate).toHaveBeenCalledTimes(1);
    const updateArg = alertUpdate.mock.calls[0][0];
    expect(updateArg.data.triggerData).toEqual(ORIGINAL);
    // Identity is also preserved (same object reference passed through, no deep clone).
    expect(updateArg.data.triggerData).toBe(ORIGINAL);
  });

  // ── Test 4: idempotent re-run — zero writes when legacy=0 ──────────────
  it('Test 4: idempotent re-run on a clean DB performs zero writes', async () => {
    const script = emptyScript();
    // All 30 targets clean (legacy=0).
    queryRawUnsafe.mockImplementation(routeSql(script));

    const code = await main({ mode: 'execute', batch: 50, pauseMs: 0, target: null });

    expect(code).toBe(0);
    expect(alertFindUnique).not.toHaveBeenCalled();
    expect(alertUpdate).not.toHaveBeenCalled();
    expect(webhookEventFindUnique).not.toHaveBeenCalled();
    expect(webhookEventUpdate).not.toHaveBeenCalled();
    // No batch summaries written either (no batches were processed).
    expect(auditLogCreate).not.toHaveBeenCalled();
  });

  // ── Test 5: mixed table state — encrypted rows excluded by detection ──
  it('Test 5: detection SQL excludes already-encrypted rows; only legacy rows are updated', async () => {
    const script = emptyScript();
    script.totals.set('alerts.triggerData', 10);
    script.encrypted.set('alerts.triggerData', 7);
    script.legacy.set('alerts.triggerData', 3);
    // Only the 3 legacy IDs are returned by fetchLegacyIds; the 7 encrypted
    // rows are filtered out by the `NOT LIKE '"enc:%'` clause.
    script.ids.set('alerts.triggerData', ['legacy-1', 'legacy-2', 'legacy-3']);
    queryRawUnsafe.mockImplementation(routeSql(script));

    alertFindUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({ triggerData: { id: where.id, plaintext: true } }),
    );
    alertUpdate.mockImplementation(() => {
      script.legacy.set('alerts.triggerData', 0);
      script.encrypted.set('alerts.triggerData', 10);
      return Promise.resolve({});
    });

    await main({
      mode: 'execute',
      batch: 50,
      pauseMs: 0,
      target: { table: 'alerts', column: 'triggerData' },
    });

    expect(alertUpdate).toHaveBeenCalledTimes(3);
    const updatedIds = alertUpdate.mock.calls.map(c => c[0].where.id).sort();
    expect(updatedIds).toEqual(['legacy-1', 'legacy-2', 'legacy-3']);
  });

  // ── Test 6: partial failure — failed row logged, others continue ──────
  it('Test 6: per-row failure does not abort batch; final exit code 1; failures captured', async () => {
    const script = emptyScript();
    script.totals.set('alerts.triggerData', 3);
    script.legacy.set('alerts.triggerData', 3);
    script.ids.set('alerts.triggerData', ['ok-1', 'fail-2', 'ok-3']);
    queryRawUnsafe.mockImplementation(routeSql(script));

    alertFindUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({ triggerData: { id: where.id } }),
    );
    alertUpdate.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === 'fail-2') {
        return Promise.reject(new Error('simulated middleware encrypt failure'));
      }
      return Promise.resolve({});
    });

    // After the run, simulate that 2 rows succeeded encrypting + 1 still legacy.
    let calls = 0;
    alertUpdate.mockImplementation(({ where }: { where: { id: string } }) => {
      calls++;
      if (where.id === 'fail-2') {
        return Promise.reject(new Error('simulated middleware encrypt failure'));
      }
      // After 2 successful updates, drop legacy to 1 (the failed row remains).
      if (calls === 3) {
        script.legacy.set('alerts.triggerData', 1);
        script.encrypted.set('alerts.triggerData', 2);
      }
      return Promise.resolve({});
    });

    const code = await main({
      mode: 'execute',
      batch: 50,
      pauseMs: 0,
      target: { table: 'alerts', column: 'triggerData' },
    });

    expect(code).toBe(1);
    expect(alertUpdate).toHaveBeenCalledTimes(3);
    // ok-1 + ok-3 succeeded (returned). fail-2 rejected.
    const succeededIds = alertUpdate.mock.calls
      .filter((_, i) => i !== 1)
      .map(c => c[0].where.id);
    expect(succeededIds).toEqual(['ok-1', 'ok-3']);
  });

  // ── Test 8: schema-drift handling — missing column SKIPPED, not FATAL ──
  it('Test 8: schema-drift — column absent in live schema is skipped (not fatal)', async () => {
    const script = emptyScript();
    queryRawUnsafe.mockImplementation(routeSql(script, {
      missingColumns: new Set(['risk_score_assessments.inputs']),
    }));

    const code = await main({ mode: 'dry-run', batch: 50, pauseMs: 0, target: null });

    expect(code).toBe(0);
    // Migration completed without throwing despite the missing column.
  });

  // ── Test 9: summary artifact is written to backend/var/ ────────────────
  it('Test 9: summary artifact JSON file is written to backend/var/ on every run', async () => {
    const script = emptyScript();
    queryRawUnsafe.mockImplementation(routeSql(script));

    await main({ mode: 'dry-run', batch: 50, pauseMs: 0, target: null });

    expect(fsMkdir).toHaveBeenCalledWith(expect.stringMatching(/[\\/]var$/), { recursive: true });
    expect(fsWriteFile).toHaveBeenCalledWith(
      expect.stringMatching(/audit-022-dry-run-.*\.json$/),
      expect.stringContaining('"audit": "AUDIT-022"'),
      'utf8',
    );
  });

  // ── Test 10: main() with --execute + missing confirmation gate fails ───
  it('Test 10: main() blocks --execute and exits 1 when AUDIT_022_EXECUTE_CONFIRMED is unset', async () => {
    const script = emptyScript();
    queryRawUnsafe.mockImplementation(routeSql(script));

    delete process.env.AUDIT_022_EXECUTE_CONFIRMED;
    try {
      const code = await main({ mode: 'execute', batch: 50, pauseMs: 0, target: null });
      expect(code).toBe(1);
      // No DB queries should run after gate failure (gate fails before SQL).
      expect(queryRawUnsafe).not.toHaveBeenCalled();
      expect(alertUpdate).not.toHaveBeenCalled();
    } finally {
      process.env.AUDIT_022_EXECUTE_CONFIRMED = 'yes';
    }
  });

  // ── Test 7: single-target mode restricts to one (table, column) ────────
  it('Test 7: --target restricts execution to a single (table, column)', async () => {
    const script = emptyScript();
    // Both alerts.triggerData and webhook_events.rawPayload have legacy rows
    // in the simulated DB. With --target alerts.triggerData, only alerts is touched.
    script.totals.set('alerts.triggerData', 1);
    script.legacy.set('alerts.triggerData', 1);
    script.ids.set('alerts.triggerData', ['only-alert']);
    script.totals.set('webhook_events.rawPayload', 5);
    script.legacy.set('webhook_events.rawPayload', 5);
    script.ids.set('webhook_events.rawPayload', ['w-1', 'w-2', 'w-3', 'w-4', 'w-5']);
    queryRawUnsafe.mockImplementation(routeSql(script));

    alertFindUnique.mockResolvedValueOnce({ triggerData: { tagged: true } });
    alertUpdate.mockImplementation(() => {
      script.legacy.set('alerts.triggerData', 0);
      return Promise.resolve({});
    });

    await main({
      mode: 'execute',
      batch: 50,
      pauseMs: 0,
      target: { table: 'alerts', column: 'triggerData' },
    });

    expect(alertUpdate).toHaveBeenCalledTimes(1);
    expect(webhookEventFindUnique).not.toHaveBeenCalled();
    expect(webhookEventUpdate).not.toHaveBeenCalled();
    // Verify webhook_events legacy rows still pending in the script (untouched).
    expect(script.legacy.get('webhook_events.rawPayload')).toBe(5);
  });
});
