/**
 * Tests for backend/scripts/shadowReadValidation.ts
 *
 * Unit tests covering pure helpers (hashRows, compare) and the
 * runShadowCycle orchestration with mocked Prisma + CloudWatch.
 */

import type { PrismaClient } from '@prisma/client';
import type { MetricDatum } from '@aws-sdk/client-cloudwatch';
import {
  QUERIES,
  compare,
  hashRows,
  runQuery,
  runShadowCycle,
  type CloudWatchPublisher,
  type QueryResult,
  type ShadowQuery,
} from '../../scripts/shadowReadValidation';

// ────────────────────────────────────────────────────────────────────────────
// Mocks
// ────────────────────────────────────────────────────────────────────────────

type ResultsByQuery = Record<string, Record<string, unknown>[] | Error>;

function makeFakePrisma(resultsByQuery: ResultsByQuery): PrismaClient {
  const client = {
    $queryRawUnsafe: jest.fn(async (sql: string) => {
      const r = resultsByQuery[sql];
      if (r === undefined) throw new Error(`Unexpected query: ${sql}`);
      if (r instanceof Error) throw r;
      return r;
    }),
    $disconnect: jest.fn(async () => undefined),
  };
  return client as unknown as PrismaClient;
}

function makeFakeCw(): jest.Mocked<CloudWatchPublisher> {
  return {
    putMetrics: jest.fn<Promise<void>, [string, MetricDatum[]]>(async () => undefined),
  };
}

const FIXED_NOW = new Date('2026-04-20T18:00:00.000Z');

// ────────────────────────────────────────────────────────────────────────────

describe('hashRows', () => {
  it('returns same hash for identical rows', () => {
    const a = [{ x: 1, y: 'foo' }];
    const b = [{ x: 1, y: 'foo' }];
    expect(hashRows(a)).toEqual(hashRows(b));
  });

  it('is key-order independent within a row', () => {
    const a = [{ x: 1, y: 'foo' }];
    const b = [{ y: 'foo', x: 1 }];
    expect(hashRows(a)).toEqual(hashRows(b));
  });

  it('is row-order sensitive', () => {
    const a = [{ x: 1 }, { x: 2 }];
    const b = [{ x: 2 }, { x: 1 }];
    expect(hashRows(a)).not.toEqual(hashRows(b));
  });

  it('handles empty result sets', () => {
    expect(hashRows([])).toMatch(/^[a-f0-9]{32}$/);
    expect(hashRows([])).toEqual(hashRows([]));
  });

  it('serializes BigInt as string without throwing', () => {
    const a = [{ n: 14171n }];
    const b = [{ n: '14171' }];
    expect(hashRows(a)).toEqual(hashRows(b));
  });

  it('serializes Date as ISO string', () => {
    const d = new Date('2026-04-20T18:00:00Z');
    const a = [{ ts: d }];
    const b = [{ ts: d.toISOString() }];
    expect(hashRows(a)).toEqual(hashRows(b));
  });
});

describe('runQuery', () => {
  it('returns row count and hash on success', async () => {
    const client = makeFakePrisma({
      [`SELECT id FROM public."hospitals" ORDER BY id`]: [
        { id: 'h1' },
        { id: 'h2' },
      ],
    });
    const res = await runQuery(client, {
      name: 'test',
      sql: `SELECT id FROM public."hospitals" ORDER BY id`,
    });
    expect(res.rowCount).toBe(2);
    expect(res.resultHash).toMatch(/^[a-f0-9]{32}$/);
    expect(res.error).toBeUndefined();
  });

  it('captures error without throwing', async () => {
    const client = makeFakePrisma({
      [`SELECT bad`]: new Error('relation does not exist'),
    });
    const res = await runQuery(client, { name: 'bad', sql: `SELECT bad` });
    expect(res.rowCount).toBe(-1);
    expect(res.resultHash).toBe('');
    expect(res.error).toContain('relation does not exist');
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe('compare', () => {
  const baseOk = (hash: string, rows: number): QueryResult => ({
    name: 'q', rowCount: rows, resultHash: hash, durationMs: 5,
  });

  it('returns null when source and target match exactly', () => {
    expect(compare(baseOk('aa', 10), baseOk('aa', 10))).toBeNull();
  });

  it('flags row count divergence', () => {
    const d = compare(baseOk('aa', 10), baseOk('aa', 11));
    expect(d?.kind).toBe('row_count');
  });

  it('flags hash divergence', () => {
    const d = compare(baseOk('aa', 10), baseOk('bb', 10));
    expect(d?.kind).toBe('hash');
  });

  it('flags source error', () => {
    const src: QueryResult = { name: 'q', rowCount: -1, resultHash: '', durationMs: 3, error: 'boom' };
    const tgt = baseOk('aa', 10);
    const d = compare(src, tgt);
    expect(d?.kind).toBe('source_error');
  });

  it('flags target error', () => {
    const src = baseOk('aa', 10);
    const tgt: QueryResult = { name: 'q', rowCount: -1, resultHash: '', durationMs: 3, error: 'boom' };
    const d = compare(src, tgt);
    expect(d?.kind).toBe('target_error');
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe('runShadowCycle', () => {
  it('reports zero divergences for a fully matching pair', async () => {
    const sql = `SELECT id, name FROM public."hospitals" ORDER BY id`;
    const source = makeFakePrisma({ [sql]: [{ id: 'h1', name: 'A' }] });
    const target = makeFakePrisma({ [sql]: [{ id: 'h1', name: 'A' }] });
    const cw = makeFakeCw();

    const result = await runShadowCycle({
      source,
      target,
      cw,
      scope: 'test',
      queries: [{ name: 'hospitals.simple', sql }],
      now: () => FIXED_NOW,
    });

    expect(result.queriesRun).toBe(1);
    expect(result.divergences).toHaveLength(0);
    expect(cw.putMetrics).toHaveBeenCalledTimes(1);
    const callMetrics = cw.putMetrics.mock.calls[0][1] as MetricDatum[];
    const divMetric = callMetrics.find((m) => m.MetricName === 'migration.shadow_read.divergence_count');
    expect(divMetric?.Value).toBe(0);
    expect(divMetric?.Dimensions?.[0].Value).toBe('test');
  });

  it('counts divergences correctly when target is empty', async () => {
    const sql = `SELECT count(*)::int AS n FROM public."hospitals"`;
    const source = makeFakePrisma({ [sql]: [{ n: 4 }] });
    const target = makeFakePrisma({ [sql]: [{ n: 0 }] });
    const cw = makeFakeCw();

    const result = await runShadowCycle({
      source,
      target,
      cw,
      scope: 'pre-wave1',
      queries: [{ name: 'hospitals.count', sql }],
      now: () => FIXED_NOW,
    });

    expect(result.divergences).toHaveLength(1);
    expect(result.divergences[0].kind).toBe('hash'); // row counts equal (1 row each) but value differs
  });

  it('aggregates across multiple queries', async () => {
    const q1 = `SELECT 1 AS a`;
    const q2 = `SELECT 2 AS a`;
    const source = makeFakePrisma({
      [q1]: [{ a: 1 }],
      [q2]: [{ a: 2 }],
    });
    const target = makeFakePrisma({
      [q1]: [{ a: 1 }],
      [q2]: [{ a: 99 }], // diverges
    });
    const cw = makeFakeCw();

    const result = await runShadowCycle({
      source, target, cw, scope: 'x',
      queries: [
        { name: 'q1', sql: q1 },
        { name: 'q2', sql: q2 },
      ],
      now: () => FIXED_NOW,
    });

    expect(result.queriesRun).toBe(2);
    expect(result.divergences).toHaveLength(1);
    expect(result.divergences[0].query).toBe('q2');
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe('QUERIES invariants', () => {
  it('has at least one Wave-1 query', () => {
    expect(QUERIES.some((q) => q.postWave === 1)).toBe(true);
  });

  it('all query names are unique', () => {
    const names = QUERIES.map((q) => q.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every query uses SELECT (read-only)', () => {
    for (const q of QUERIES) {
      expect(q.sql.trim().toUpperCase()).toMatch(/^SELECT\s/);
    }
  });

  it('no query uses NOW() or random() (must be deterministic)', () => {
    for (const q of QUERIES) {
      expect(q.sql.toLowerCase()).not.toMatch(/\bnow\s*\(\)/);
      expect(q.sql.toLowerCase()).not.toMatch(/\brandom\s*\(\)/);
    }
  });

  it('Wave-3 queries all have postWave set to 3 (highest in current set)', () => {
    const w3 = QUERIES.filter((q: ShadowQuery) =>
      ['observations.count', 'conditions.top_10_codes', 'medications.top_10_rx', 'procedures.count'].includes(q.name),
    );
    expect(w3.length).toBeGreaterThan(0);
    for (const q of w3) {
      expect(q.postWave).toBe(3);
    }
  });
});
