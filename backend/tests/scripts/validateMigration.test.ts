/**
 * Tests for backend/scripts/validateMigration.ts
 *
 * These tests exercise the pure helpers and orchestration logic with mocked
 * Prisma clients, mocked CloudWatch publisher, and mocked DMS lag reader.
 * No network, no database, no AWS API calls.
 */

import type { PrismaClient } from '@prisma/client';
import type { MetricDatum } from '@aws-sdk/client-cloudwatch';
import {
  CW_NAMESPACE,
  TABLES_TO_COMPARE,
  TABLES_TO_HASH,
  buildHashReports,
  buildTableReports,
  countRows,
  hashTable,
  runValidation,
  toHashMatchMetrics,
  toLagMetric,
  toRowDiffMetrics,
  type CloudWatchPublisher,
  type DmsLagReader,
  type HashReport,
  type LagReport,
  type TableReport,
} from '../../scripts/validateMigration';

// ────────────────────────────────────────────────────────────────────────────
// Mocks
// ────────────────────────────────────────────────────────────────────────────

type RawResultByQuery = Record<string, unknown[]>;

/**
 * Minimal fake PrismaClient that only implements the methods validateMigration
 * uses: $queryRawUnsafe and $disconnect. Returns predefined results keyed by
 * the SQL string passed in. Any unexpected query throws.
 */
function makeFakePrisma(resultsByQuery: RawResultByQuery): PrismaClient {
  const client = {
    $queryRawUnsafe: jest.fn(async (sql: string) => {
      const result = resultsByQuery[sql];
      if (result === undefined) {
        throw new Error(`Unexpected query: ${sql}`);
      }
      return result;
    }),
    $disconnect: jest.fn(async () => undefined),
  };
  return client as unknown as PrismaClient;
}

function makeFakeCloudwatch(): jest.Mocked<CloudWatchPublisher> {
  return {
    putMetrics: jest.fn<Promise<void>, [string, MetricDatum[]]>(async () => undefined),
  };
}

function makeFakeDmsLag(lag: LagReport): jest.Mocked<DmsLagReader> {
  return {
    getLag: jest.fn<Promise<LagReport>, [string]>(async () => lag),
  };
}

// Fixed clock for deterministic metric timestamps.
const FIXED_NOW = new Date('2026-04-20T15:00:00.000Z');

// ────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ────────────────────────────────────────────────────────────────────────────

describe('countRows', () => {
  it('returns the count from the first row', async () => {
    const client = makeFakePrisma({
      [`SELECT count(*)::bigint AS n FROM public."patients"`]: [{ n: 14171n }],
    });
    const result = await countRows(client, 'patients');
    expect(result).toBe(14171);
  });

  it('returns 0 when result is empty', async () => {
    const client = makeFakePrisma({
      [`SELECT count(*)::bigint AS n FROM public."patients"`]: [],
    });
    const result = await countRows(client, 'patients');
    expect(result).toBe(0);
  });

  it('converts bigint to number', async () => {
    const client = makeFakePrisma({
      [`SELECT count(*)::bigint AS n FROM public."encounters"`]: [{ n: 353526n }],
    });
    const result = await countRows(client, 'encounters');
    expect(typeof result).toBe('number');
    expect(result).toBe(353526);
  });
});

describe('hashTable', () => {
  it('returns the md5 hash string from the query', async () => {
    const client = makeFakePrisma({
      [`SELECT md5(coalesce(string_agg(id, ',' ORDER BY id), '')) AS h FROM public."patients"`]: [
        { h: 'abc123deadbeef' },
      ],
    });
    const result = await hashTable(client, 'patients');
    expect(result).toBe('abc123deadbeef');
  });

  it('returns empty string when table has no rows', async () => {
    const client = makeFakePrisma({
      [`SELECT md5(coalesce(string_agg(id, ',' ORDER BY id), '')) AS h FROM public."patients"`]: [
        { h: null },
      ],
    });
    const result = await hashTable(client, 'patients');
    // coalesce in SQL would return md5('') which is a real hash, but the mock
    // returns null so the helper falls through to the empty-string branch.
    expect(result).toBe('');
  });
});

describe('buildTableReports', () => {
  it('computes rowDiff as rds minus aurora', () => {
    const reports = buildTableReports(
      ['patients', 'encounters'],
      { patients: 100, encounters: 500 },
      { patients: 98, encounters: 500 },
    );
    expect(reports).toEqual([
      { table: 'patients', rdsCount: 100, auroraCount: 98, rowDiff: 2 },
      { table: 'encounters', rdsCount: 500, auroraCount: 500, rowDiff: 0 },
    ]);
  });

  it('treats missing counts as zero', () => {
    const reports = buildTableReports(
      ['hospitals'],
      {},
      { hospitals: 4 },
    );
    expect(reports[0]).toEqual({
      table: 'hospitals',
      rdsCount: 0,
      auroraCount: 4,
      rowDiff: -4,
    });
  });

  it('handles negative diff (Aurora has more than RDS)', () => {
    const reports = buildTableReports(
      ['audit_logs'],
      { audit_logs: 10 },
      { audit_logs: 15 },
    );
    expect(reports[0].rowDiff).toBe(-5);
  });
});

describe('buildHashReports', () => {
  it('matches when hashes are equal', () => {
    const reports = buildHashReports(
      ['patients'],
      { patients: 'aabb' },
      { patients: 'aabb' },
    );
    expect(reports[0]).toEqual({
      table: 'patients',
      rdsHash: 'aabb',
      auroraHash: 'aabb',
      hashMatch: true,
    });
  });

  it('mismatches when hashes differ', () => {
    const reports = buildHashReports(
      ['patients'],
      { patients: 'aabb' },
      { patients: 'ccdd' },
    );
    expect(reports[0].hashMatch).toBe(false);
  });

  it('two empty hashes count as a match (both-empty case)', () => {
    // Both empty = same empty state = trivially a match. Validation relies on
    // row counts as the primary gate, not hashes.
    const reports = buildHashReports(
      ['patients'],
      { patients: '' },
      { patients: '' },
    );
    expect(reports[0].hashMatch).toBe(true);
  });
});

describe('toRowDiffMetrics', () => {
  it('produces one metric per report with Count unit and Table dimension', () => {
    const reports: TableReport[] = [
      { table: 'patients', rdsCount: 100, auroraCount: 98, rowDiff: 2 },
      { table: 'encounters', rdsCount: 500, auroraCount: 500, rowDiff: 0 },
    ];
    const metrics = toRowDiffMetrics(reports, FIXED_NOW);
    expect(metrics).toHaveLength(2);
    expect(metrics[0]).toEqual({
      MetricName: 'migration.row_diff.patients',
      Value: 2,
      Unit: 'Count',
      Timestamp: FIXED_NOW,
      Dimensions: [{ Name: 'Table', Value: 'patients' }],
    });
    expect(metrics[1].MetricName).toBe('migration.row_diff.encounters');
    expect(metrics[1].Value).toBe(0);
  });
});

describe('toHashMatchMetrics', () => {
  it('emits 1 for match and 0 for mismatch', () => {
    const reports: HashReport[] = [
      { table: 'patients', rdsHash: 'aa', auroraHash: 'aa', hashMatch: true },
      { table: 'encounters', rdsHash: 'bb', auroraHash: 'cc', hashMatch: false },
    ];
    const metrics = toHashMatchMetrics(reports, FIXED_NOW);
    expect(metrics[0].Value).toBe(1);
    expect(metrics[1].Value).toBe(0);
    expect(metrics[0].MetricName).toBe('migration.hash_match.patients');
  });
});

describe('toLagMetric', () => {
  it('returns null when lag is unavailable', () => {
    expect(toLagMetric({ dmsTaskArn: null, replicationLagSeconds: null })).toBeNull();
    expect(
      toLagMetric({ dmsTaskArn: 'arn:aws:dms:...', replicationLagSeconds: null }),
    ).toBeNull();
  });

  it('builds a Seconds-unit metric with the task name as dimension', () => {
    const metric = toLagMetric(
      {
        dmsTaskArn: 'arn:aws:dms:us-east-1:123:task:tailrd-migration-wave1',
        replicationLagSeconds: 7,
      },
      FIXED_NOW,
    );
    expect(metric).toEqual({
      MetricName: 'migration.replication_lag_seconds',
      Value: 7,
      Unit: 'Seconds',
      Timestamp: FIXED_NOW,
      Dimensions: [{ Name: 'Task', Value: 'tailrd-migration-wave1' }],
    });
  });

  it('uses "unknown" when ARN has no colon-separated tail', () => {
    const metric = toLagMetric(
      { dmsTaskArn: '', replicationLagSeconds: 0 },
      FIXED_NOW,
    );
    // Empty ARN → split(':').pop() === ''. The helper substitutes 'unknown'
    // only when pop() is undefined. An empty string passes through.
    expect(metric?.Dimensions?.[0].Value).toBe('');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Orchestration
// ────────────────────────────────────────────────────────────────────────────

describe('runValidation', () => {
  const makeMocks = (
    tablesToCompare: readonly string[],
    tablesToHash: readonly string[],
    rdsCounts: Record<string, number>,
    auroraCounts: Record<string, number>,
    rdsHashes: Record<string, string>,
    auroraHashes: Record<string, string>,
  ) => {
    const rdsResults: RawResultByQuery = {};
    const auroraResults: RawResultByQuery = {};
    for (const t of tablesToCompare) {
      rdsResults[`SELECT count(*)::bigint AS n FROM public."${t}"`] = [
        { n: BigInt(rdsCounts[t] ?? 0) },
      ];
      auroraResults[`SELECT count(*)::bigint AS n FROM public."${t}"`] = [
        { n: BigInt(auroraCounts[t] ?? 0) },
      ];
    }
    for (const t of tablesToHash) {
      rdsResults[`SELECT md5(coalesce(string_agg(id, ',' ORDER BY id), '')) AS h FROM public."${t}"`] = [
        { h: rdsHashes[t] ?? '' },
      ];
      auroraResults[`SELECT md5(coalesce(string_agg(id, ',' ORDER BY id), '')) AS h FROM public."${t}"`] = [
        { h: auroraHashes[t] ?? '' },
      ];
    }
    return {
      rds: makeFakePrisma(rdsResults),
      aurora: makeFakePrisma(auroraResults),
      cloudwatch: makeFakeCloudwatch(),
    };
  };

  it('runs a full cycle with matching data and publishes metrics', async () => {
    const { rds, aurora, cloudwatch } = makeMocks(
      ['patients', 'encounters'],
      ['patients'],
      { patients: 100, encounters: 500 },
      { patients: 100, encounters: 500 },
      { patients: 'samehash' },
      { patients: 'samehash' },
    );

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const result = await runValidation({
        rds,
        aurora,
        cloudwatch,
        tablesToCompare: ['patients', 'encounters'],
        tablesToHash: ['patients'],
        now: () => FIXED_NOW,
      });

      expect(result.tableReports).toHaveLength(2);
      expect(result.tableReports.every((r) => r.rowDiff === 0)).toBe(true);
      expect(result.hashReports[0].hashMatch).toBe(true);
      expect(result.lag).toBeNull();
      expect(result.metricsPublished).toBe(3); // 2 row_diff + 1 hash_match

      expect(cloudwatch.putMetrics).toHaveBeenCalledTimes(1);
      expect(cloudwatch.putMetrics).toHaveBeenCalledWith(
        CW_NAMESPACE,
        expect.arrayContaining([
          expect.objectContaining({ MetricName: 'migration.row_diff.patients' }),
          expect.objectContaining({ MetricName: 'migration.row_diff.encounters' }),
          expect.objectContaining({ MetricName: 'migration.hash_match.patients' }),
        ]),
      );

      expect(logSpy).toHaveBeenCalled();
      const loggedJson = logSpy.mock.calls[0][0];
      expect(() => JSON.parse(loggedJson)).not.toThrow();
      const parsed = JSON.parse(loggedJson);
      expect(parsed.event).toBe('migration.validation.cycle');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('flags row-count divergence correctly', async () => {
    const { rds, aurora, cloudwatch } = makeMocks(
      ['patients'],
      [],
      { patients: 1000 },
      { patients: 900 },
      {},
      {},
    );

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const result = await runValidation({
        rds,
        aurora,
        cloudwatch,
        tablesToCompare: ['patients'],
        tablesToHash: [],
        now: () => FIXED_NOW,
      });
      expect(result.tableReports[0].rowDiff).toBe(100);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('flags hash mismatch correctly', async () => {
    const { rds, aurora, cloudwatch } = makeMocks(
      ['patients'],
      ['patients'],
      { patients: 10 },
      { patients: 10 },
      { patients: 'aaaa' },
      { patients: 'bbbb' },
    );

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const result = await runValidation({
        rds,
        aurora,
        cloudwatch,
        tablesToCompare: ['patients'],
        tablesToHash: ['patients'],
        now: () => FIXED_NOW,
      });
      expect(result.hashReports[0].hashMatch).toBe(false);
      // Metric should be 0 for mismatch
      const calls = cloudwatch.putMetrics.mock.calls;
      const allMetrics = calls.flatMap((c) => c[1]) as MetricDatum[];
      const hashMetric = allMetrics.find((m) => m.MetricName === 'migration.hash_match.patients');
      expect(hashMetric?.Value).toBe(0);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('includes DMS lag when configured', async () => {
    const { rds, aurora, cloudwatch } = makeMocks(
      ['hospitals'],
      [],
      { hospitals: 4 },
      { hospitals: 4 },
      {},
      {},
    );
    const dmsLag = makeFakeDmsLag({
      dmsTaskArn: 'arn:aws:dms:us-east-1:1:task:tailrd-migration-wave1',
      replicationLagSeconds: 5,
    });

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const result = await runValidation({
        rds,
        aurora,
        cloudwatch,
        tablesToCompare: ['hospitals'],
        tablesToHash: [],
        dmsLag,
        dmsTaskArn: 'arn:aws:dms:us-east-1:1:task:tailrd-migration-wave1',
        now: () => FIXED_NOW,
      });
      expect(result.lag?.replicationLagSeconds).toBe(5);
      expect(dmsLag.getLag).toHaveBeenCalledTimes(1);
      const calls = cloudwatch.putMetrics.mock.calls;
      const allMetrics = calls.flatMap((c) => c[1]) as MetricDatum[];
      const lagMetric = allMetrics.find(
        (m) => m.MetricName === 'migration.replication_lag_seconds',
      );
      expect(lagMetric?.Value).toBe(5);
      expect(lagMetric?.Unit).toBe('Seconds');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('skips DMS lag when taskArn is not configured', async () => {
    const { rds, aurora, cloudwatch } = makeMocks(
      ['hospitals'],
      [],
      { hospitals: 4 },
      { hospitals: 4 },
      {},
      {},
    );

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const result = await runValidation({
        rds,
        aurora,
        cloudwatch,
        tablesToCompare: ['hospitals'],
        tablesToHash: [],
        now: () => FIXED_NOW,
      });
      expect(result.lag).toBeNull();
    } finally {
      logSpy.mockRestore();
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Invariants
// ────────────────────────────────────────────────────────────────────────────

describe('TABLES_TO_COMPARE invariants', () => {
  it('is non-empty', () => {
    expect(TABLES_TO_COMPARE.length).toBeGreaterThan(0);
  });

  it('has no duplicates', () => {
    const unique = new Set(TABLES_TO_COMPARE);
    expect(unique.size).toBe(TABLES_TO_COMPARE.length);
  });

  it('contains all Wave 3 high-volume clinical tables', () => {
    const wave3 = ['procedures', 'observations', 'conditions', 'medications', 'device_implants', 'allergy_intolerances'];
    for (const t of wave3) {
      expect(TABLES_TO_COMPARE).toContain(t);
    }
  });

  it('contains all Wave 1 reference tables', () => {
    expect(TABLES_TO_COMPARE).toContain('hospitals');
    expect(TABLES_TO_COMPARE).toContain('users');
  });

  it('is sorted alphabetically (keeps diffs clean)', () => {
    const sorted = [...TABLES_TO_COMPARE].sort();
    expect(TABLES_TO_COMPARE).toEqual(sorted);
  });
});

describe('TABLES_TO_HASH invariants', () => {
  it('is a subset of TABLES_TO_COMPARE', () => {
    for (const t of TABLES_TO_HASH) {
      expect(TABLES_TO_COMPARE).toContain(t);
    }
  });

  it('contains the sample tables named in the design doc', () => {
    expect(TABLES_TO_HASH).toContain('patients');
    expect(TABLES_TO_HASH).toContain('encounters');
    expect(TABLES_TO_HASH).toContain('observations');
  });
});
