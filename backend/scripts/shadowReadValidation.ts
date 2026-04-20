/**
 * Aurora V2 migration — shadow read validator.
 *
 * During and after DMS replication, this runs a small, read-only query set
 * against BOTH the RDS source and the Aurora target. If result sets diverge
 * (row count or md5 hash), that is a migration-fidelity problem. The
 * validator emits CloudWatch custom metrics and a structured JSON log line
 * per cycle. Paired with a CloudWatch alarm (SHADOW_READ_DIVERGENCE) that
 * fires when divergences exceed threshold over a time window.
 *
 * Why this exists:
 *   validateMigration.ts proves row-count + id-hash parity. Shadow reads
 *   prove that the queries your application actually makes return the same
 *   results on both databases. These are related but distinct signals —
 *   e.g. if a specific index is missing on Aurora, row counts still match
 *   but SELECT WHERE ... would diverge in runtime / result-shape.
 *
 * Query provenance:
 *   The user asked for "top 10 SELECT queries from pg_stat_statements on
 *   RDS." pg_stat_statements is NOT installed on production RDS (requires
 *   reboot, deferred). As a substitute, this ships with a hardcoded set of
 *   representative queries taken from the backend's actual routes. Swap
 *   QUERIES for pg_stat_statements output once that extension is available.
 *
 * Caveats:
 *   1. During Wave 1 (reference tables), only `hospitals` and `users` are
 *      expected to match. Queries against other tables will show Aurora as
 *      empty until later waves complete. That's expected pre-Wave-2.
 *   2. CDC is not enabled yet. After Wave 1 full-load, Aurora diverges from
 *      RDS every time the app writes to RDS. Run this validator only for
 *      post-Wave-1 timing snapshots, not continuous sync checking, until
 *      CDC is enabled on Day 6.
 *
 * Run:
 *   SOURCE_DATABASE_URL=postgresql://... TARGET_DATABASE_URL=postgresql://... \
 *   npx tsx backend/scripts/shadowReadValidation.ts
 *
 * Loop mode:
 *   ... npx tsx backend/scripts/shadowReadValidation.ts --interval 300
 *
 * CloudWatch namespace: TailrdMigration
 * Metric:  migration.shadow_read.divergence_count
 *          migration.shadow_read.query_count
 * Dimensions: {Scope: "wave1"} (or any --scope value)
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import {
  CloudWatchClient,
  PutMetricDataCommand,
  MetricDatum,
} from '@aws-sdk/client-cloudwatch';
import * as crypto from 'crypto';

// ────────────────────────────────────────────────────────────────────────────
// Query set (hardcoded proxy for pg_stat_statements top-N)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Each query must be side-effect free (SELECT only) and deterministic —
 * ordered, limited, no NOW()/random(). The validator hashes the full result
 * set; any non-determinism shows as spurious divergence.
 */
export type ShadowQuery = {
  name: string;
  sql: string;
  /** If true, skip this query when Aurora likely has no data yet */
  postWave?: 1 | 2 | 3 | 4;
};

export const QUERIES: readonly ShadowQuery[] = [
  // Wave 1 — reference tables
  {
    name: 'hospitals.all',
    sql: `SELECT id, name, system, "hospitalType", city, state FROM public."hospitals" ORDER BY id`,
    postWave: 1,
  },
  {
    name: 'hospitals.count',
    sql: `SELECT count(*)::int AS n FROM public."hospitals"`,
    postWave: 1,
  },
  {
    name: 'users.by_hospital',
    sql: `SELECT "hospitalId", count(*)::int AS n FROM public."users" GROUP BY "hospitalId" ORDER BY "hospitalId"`,
    postWave: 1,
  },
  {
    name: 'users.role_distribution',
    sql: `SELECT role, count(*)::int AS n FROM public."users" GROUP BY role ORDER BY role`,
    postWave: 1,
  },
  // Wave 2 — patient, encounters
  {
    name: 'patients.count_per_hospital',
    sql: `SELECT "hospitalId", count(*)::int AS n FROM public."patients" GROUP BY "hospitalId" ORDER BY "hospitalId"`,
    postWave: 2,
  },
  {
    name: 'encounters.by_type',
    sql: `SELECT "encounterType", count(*)::int AS n FROM public."encounters" GROUP BY "encounterType" ORDER BY "encounterType"`,
    postWave: 2,
  },
  // Wave 3 — clinical
  {
    name: 'observations.count',
    sql: `SELECT count(*)::int AS n FROM public."observations"`,
    postWave: 3,
  },
  {
    name: 'conditions.top_10_codes',
    sql: `SELECT "icd10Code", count(*)::int AS n FROM public."conditions" WHERE "icd10Code" IS NOT NULL GROUP BY "icd10Code" ORDER BY n DESC, "icd10Code" LIMIT 10`,
    postWave: 3,
  },
  {
    name: 'medications.top_10_rx',
    sql: `SELECT "rxnormCode", count(*)::int AS n FROM public."medications" WHERE "rxnormCode" IS NOT NULL GROUP BY "rxnormCode" ORDER BY n DESC, "rxnormCode" LIMIT 10`,
    postWave: 3,
  },
  {
    name: 'procedures.count',
    sql: `SELECT count(*)::int AS n FROM public."procedures"`,
    postWave: 3,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Core
// ────────────────────────────────────────────────────────────────────────────

export type QueryResult = {
  name: string;
  rowCount: number;
  resultHash: string;
  /** Millis — used for crude latency delta, not the primary signal */
  durationMs: number;
  error?: string;
};

export type DivergenceReport = {
  query: string;
  source: { rowCount: number; resultHash: string; durationMs: number };
  target: { rowCount: number; resultHash: string; durationMs: number };
  kind: 'row_count' | 'hash' | 'source_error' | 'target_error';
};

/** Run a single query with a fixed timeout; return its hashed result. */
export async function runQuery(
  client: PrismaClient,
  q: ShadowQuery,
  timeoutMs = 10000,
): Promise<QueryResult> {
  const start = Date.now();
  try {
    const rows = await Promise.race([
      client.$queryRawUnsafe<Record<string, unknown>[]>(q.sql),
      new Promise<Record<string, unknown>[]>((_, rej) =>
        setTimeout(() => rej(new Error('query timeout')), timeoutMs),
      ),
    ]);
    return {
      name: q.name,
      rowCount: rows.length,
      resultHash: hashRows(rows),
      durationMs: Date.now() - start,
    };
  } catch (e) {
    return {
      name: q.name,
      rowCount: -1,
      resultHash: '',
      durationMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Deterministic hash of a result set. Sorts keys within each row (Postgres
 * returns object property order but we play it safe) then JSON-stringifies
 * the whole array and md5s it. This is for equality comparison, not
 * cryptographic integrity.
 */
export function hashRows(rows: Record<string, unknown>[]): string {
  const canonical = rows.map((row) => {
    const sortedKeys = Object.keys(row).sort();
    return sortedKeys.map((k) => {
      const v = row[k];
      // BigInt is not JSON-serializable natively
      if (typeof v === 'bigint') return [k, String(v)];
      if (v instanceof Date) return [k, v.toISOString()];
      return [k, v];
    });
  });
  return crypto
    .createHash('md5')
    .update(JSON.stringify(canonical))
    .digest('hex');
}

export function compare(source: QueryResult, target: QueryResult): DivergenceReport | null {
  if (source.error) {
    return {
      query: source.name,
      source: { rowCount: source.rowCount, resultHash: source.resultHash, durationMs: source.durationMs },
      target: { rowCount: target.rowCount, resultHash: target.resultHash, durationMs: target.durationMs },
      kind: 'source_error',
    };
  }
  if (target.error) {
    return {
      query: target.name,
      source: { rowCount: source.rowCount, resultHash: source.resultHash, durationMs: source.durationMs },
      target: { rowCount: target.rowCount, resultHash: target.resultHash, durationMs: target.durationMs },
      kind: 'target_error',
    };
  }
  if (source.rowCount !== target.rowCount) {
    return {
      query: source.name,
      source: { rowCount: source.rowCount, resultHash: source.resultHash, durationMs: source.durationMs },
      target: { rowCount: target.rowCount, resultHash: target.resultHash, durationMs: target.durationMs },
      kind: 'row_count',
    };
  }
  if (source.resultHash !== target.resultHash) {
    return {
      query: source.name,
      source: { rowCount: source.rowCount, resultHash: source.resultHash, durationMs: source.durationMs },
      target: { rowCount: target.rowCount, resultHash: target.resultHash, durationMs: target.durationMs },
      kind: 'hash',
    };
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// CloudWatch publishing
// ────────────────────────────────────────────────────────────────────────────

export interface CloudWatchPublisher {
  putMetrics(namespace: string, metrics: MetricDatum[]): Promise<void>;
}

export class RealCloudWatchPublisher implements CloudWatchPublisher {
  constructor(private client: CloudWatchClient = new CloudWatchClient({})) {}
  async putMetrics(namespace: string, metrics: MetricDatum[]): Promise<void> {
    for (let i = 0; i < metrics.length; i += 20) {
      const batch = metrics.slice(i, i + 20);
      await this.client.send(
        new PutMetricDataCommand({ Namespace: namespace, MetricData: batch }),
      );
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Orchestration
// ────────────────────────────────────────────────────────────────────────────

export type CycleInput = {
  source: PrismaClient;
  target: PrismaClient;
  cw: CloudWatchPublisher;
  scope: string;
  queries: readonly ShadowQuery[];
  now?: () => Date;
};

export type CycleResult = {
  timestamp: string;
  scope: string;
  queriesRun: number;
  divergences: DivergenceReport[];
  perQueryDurations: Array<{ name: string; source: number; target: number }>;
};

export async function runShadowCycle(inp: CycleInput): Promise<CycleResult> {
  const now = inp.now ?? (() => new Date());
  const timestamp = now();

  const sourceResults: QueryResult[] = [];
  const targetResults: QueryResult[] = [];
  for (const q of inp.queries) {
    // Sequential per client to avoid overwhelming a single Prisma pool
    sourceResults.push(await runQuery(inp.source, q));
    targetResults.push(await runQuery(inp.target, q));
  }

  const divergences: DivergenceReport[] = [];
  for (let i = 0; i < inp.queries.length; i++) {
    const d = compare(sourceResults[i], targetResults[i]);
    if (d) divergences.push(d);
  }

  const metrics: MetricDatum[] = [
    {
      MetricName: 'migration.shadow_read.divergence_count',
      Value: divergences.length,
      Unit: 'Count',
      Timestamp: timestamp,
      Dimensions: [{ Name: 'Scope', Value: inp.scope }],
    },
    {
      MetricName: 'migration.shadow_read.query_count',
      Value: inp.queries.length,
      Unit: 'Count',
      Timestamp: timestamp,
      Dimensions: [{ Name: 'Scope', Value: inp.scope }],
    },
  ];
  await inp.cw.putMetrics('TailrdMigration', metrics);

  const perQueryDurations = inp.queries.map((q, i) => ({
    name: q.name,
    source: sourceResults[i].durationMs,
    target: targetResults[i].durationMs,
  }));

  const logLine = {
    event: 'migration.shadow_read.cycle',
    timestamp: timestamp.toISOString(),
    scope: inp.scope,
    queriesRun: inp.queries.length,
    divergenceCount: divergences.length,
    divergences: divergences.map((d) => ({
      query: d.query,
      kind: d.kind,
      source: { rows: d.source.rowCount, hash: d.source.resultHash.slice(0, 8) },
      target: { rows: d.target.rowCount, hash: d.target.resultHash.slice(0, 8) },
    })),
    perQueryDurations,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(logLine));

  return {
    timestamp: timestamp.toISOString(),
    scope: inp.scope,
    queriesRun: inp.queries.length,
    divergences,
    perQueryDurations,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// CLI entry
// ────────────────────────────────────────────────────────────────────────────

async function cli(): Promise<void> {
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.TARGET_DATABASE_URL;
  if (!sourceUrl || !targetUrl) {
    console.error('FATAL: SOURCE_DATABASE_URL and TARGET_DATABASE_URL must both be set.');
    process.exit(1);
  }
  const scope = process.env.SHADOW_SCOPE || 'wave1';
  const interval = Number(process.env.SHADOW_INTERVAL_SEC || process.argv[process.argv.indexOf('--interval') + 1] || 0);
  const wave = Number(process.env.SHADOW_WAVE || 1);
  const queries = QUERIES.filter((q) => !q.postWave || q.postWave <= wave);

  const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
  const target = new PrismaClient({ datasources: { db: { url: targetUrl } } });
  const cw = new RealCloudWatchPublisher();

  try {
    do {
      try {
        const result = await runShadowCycle({ source, target, cw, scope, queries });
        const humanSummary = `cycle ok scope=${result.scope} queries=${result.queriesRun} divergences=${result.divergences.length}`;
        console.log(humanSummary);
      } catch (err) {
        console.error('cycle error:', err instanceof Error ? err.message : err);
      }
      if (interval > 0) {
        await new Promise((resolve) => setTimeout(resolve, interval * 1000));
      }
    } while (interval > 0);
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

if (require.main === module) {
  cli().catch((err) => {
    console.error('fatal:', err);
    process.exit(1);
  });
}
