/**
 * Aurora V2 migration shadow validator.
 *
 * Compares RDS (source) and Aurora (target) on every table the DMS task is
 * replicating. Emits CloudWatch custom metrics for row-count deltas, checksum
 * matches, and DMS replication lag. Designed to run every 5 minutes via cron
 * or as a long-lived loop.
 *
 * Run once:
 *   SOURCE_DATABASE_URL=postgresql://... TARGET_DATABASE_URL=postgresql://... \
 *   DMS_REPLICATION_TASK_ARN=arn:aws:dms:... \
 *   npx tsx backend/scripts/validateMigration.ts
 *
 * Run every 5 min:
 *   ... npx tsx backend/scripts/validateMigration.ts --interval 300
 *
 * Exit codes:
 *   0 — completed one cycle (or many, in loop mode) without fatal errors
 *   1 — fatal error (could not connect, misconfigured env, etc.)
 *
 * CloudWatch namespace: `TailrdMigration`
 * Metric dimensions: `{Table: <name>}` for per-table metrics,
 *                    `{Task: <dms-task-name>}` for lag.
 *
 * This is a migration-only script. It does NOT use the shared Prisma singleton
 * (that one has PHI encryption middleware and is DATABASE_URL-bound). It opens
 * its own PrismaClients against the two datasource URLs.
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import {
  CloudWatchClient,
  PutMetricDataCommand,
  MetricDatum,
} from '@aws-sdk/client-cloudwatch';
import {
  DatabaseMigrationServiceClient,
  DescribeReplicationTasksCommand,
} from '@aws-sdk/client-database-migration-service';

// ────────────────────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────────────────────

export const CW_NAMESPACE = 'TailrdMigration';

/**
 * Full list of Prisma-managed tables that DMS replicates. Keep sorted
 * alphabetically for diff readability. Must match `schema.prisma` @@map
 * names. If a table is added to the schema, add it here — otherwise the
 * validator will silently skip it and divergence goes unnoticed.
 */
export const TABLES_TO_COMPARE: readonly string[] = [
  'alerts',
  'allergy_intolerances',
  'audit_logs',
  'bpci_episodes',
  'breach_incidents',
  'business_metrics',
  'care_plans',
  'cds_hooks_sessions',
  'conditions',
  'contraindication_assessments',
  'cql_results',
  'cql_rules',
  'cross_referrals',
  'device_eligibility',
  'device_implants',
  'drug_interaction_alerts',
  'drug_titrations',
  'encounters',
  'error_logs',
  'failed_fhir_bundles',
  'feature_usage',
  'hospitals',
  'internal_notes',
  'intervention_tracking',
  'invite_tokens',
  'ip_allowlist',
  'login_sessions',
  'medications',
  'observations',
  'onboarding',
  'orders',
  'patient_data_requests',
  'patients',
  'performance_metrics',
  'phenotypes',
  'procedures',
  'quality_measures',
  'recommendations',
  'report_generations',
  'risk_score_assessments',
  'term_cpt',
  'term_gap_valueset',
  'term_icd10',
  'term_loinc',
  'term_msdrg',
  'term_rxnorm',
  'therapy_gaps',
  'upload_jobs',
  'user_activities',
  'user_mfa',
  'user_sessions',
  'users',
  'webhook_events',
];

/**
 * Tables to checksum (full hash) — kept small because md5(string_agg) scans
 * every row. For Wave 3 large tables we rely on row counts plus spot checks,
 * not full hashes.
 */
export const TABLES_TO_HASH: readonly string[] = [
  'patients',
  'encounters',
  'observations',
];

export type TableReport = {
  table: string;
  rdsCount: number;
  auroraCount: number;
  rowDiff: number;
};

export type HashReport = {
  table: string;
  rdsHash: string;
  auroraHash: string;
  hashMatch: boolean;
};

export type LagReport = {
  dmsTaskArn: string | null;
  replicationLagSeconds: number | null;
};

// ────────────────────────────────────────────────────────────────────────────
// Core validators (pure, testable)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Compare row counts for a single table. Uses `$queryRawUnsafe` with a literal
 * table name because table names cannot be parameterized. The table argument
 * comes from the const `TABLES_TO_COMPARE` list, never user input — so the
 * "SQL injection" surface is zero as long as callers don't pass arbitrary
 * strings.
 */
export async function countRows(client: PrismaClient, table: string): Promise<number> {
  // Use identifier quoting. Postgres treats "patients" as a case-sensitive
  // identifier matching the lowercased @@map name.
  const rows = await client.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*)::bigint AS n FROM public."${table}"`,
  );
  return Number(rows[0]?.n ?? 0n);
}

/**
 * Deterministic md5 hash across all `id` values ordered ascending. Returns a
 * hex string. Designed for equality comparison, NOT for content verification
 * (it only hashes IDs, not row content, on the theory that if IDs match 1:1
 * then DMS moved the right rows).
 */
export async function hashTable(client: PrismaClient, table: string): Promise<string> {
  const rows = await client.$queryRawUnsafe<{ h: string | null }[]>(
    `SELECT md5(coalesce(string_agg(id, ',' ORDER BY id), '')) AS h FROM public."${table}"`,
  );
  return rows[0]?.h ?? '';
}

export function buildTableReports(
  tables: readonly string[],
  rdsCounts: Record<string, number>,
  auroraCounts: Record<string, number>,
): TableReport[] {
  return tables.map((table) => {
    const rdsCount = rdsCounts[table] ?? 0;
    const auroraCount = auroraCounts[table] ?? 0;
    return {
      table,
      rdsCount,
      auroraCount,
      rowDiff: rdsCount - auroraCount,
    };
  });
}

export function buildHashReports(
  tables: readonly string[],
  rdsHashes: Record<string, string>,
  auroraHashes: Record<string, string>,
): HashReport[] {
  return tables.map((table) => {
    const rdsHash = rdsHashes[table] ?? '';
    const auroraHash = auroraHashes[table] ?? '';
    return {
      table,
      rdsHash,
      auroraHash,
      hashMatch: rdsHash === auroraHash,
    };
  });
}

/**
 * Translate TableReports into CloudWatch metric data. One datum per table for
 * `migration.row_diff.<table>`. Callers can batch up to 20 per PutMetricData.
 */
export function toRowDiffMetrics(reports: TableReport[], timestamp: Date = new Date()): MetricDatum[] {
  return reports.map((r) => ({
    MetricName: `migration.row_diff.${r.table}`,
    Value: r.rowDiff,
    Unit: 'Count',
    Timestamp: timestamp,
    Dimensions: [{ Name: 'Table', Value: r.table }],
  }));
}

export function toHashMatchMetrics(reports: HashReport[], timestamp: Date = new Date()): MetricDatum[] {
  return reports.map((r) => ({
    MetricName: `migration.hash_match.${r.table}`,
    Value: r.hashMatch ? 1 : 0,
    Unit: 'Count',
    Timestamp: timestamp,
    Dimensions: [{ Name: 'Table', Value: r.table }],
  }));
}

export function toLagMetric(lag: LagReport, timestamp: Date = new Date()): MetricDatum | null {
  if (lag.replicationLagSeconds === null || lag.dmsTaskArn === null) return null;
  return {
    MetricName: 'migration.replication_lag_seconds',
    Value: lag.replicationLagSeconds,
    Unit: 'Seconds',
    Timestamp: timestamp,
    Dimensions: [{ Name: 'Task', Value: lag.dmsTaskArn.split(':').pop() ?? 'unknown' }],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// External integrations (mockable via DI)
// ────────────────────────────────────────────────────────────────────────────

export interface CloudWatchPublisher {
  putMetrics(namespace: string, metrics: MetricDatum[]): Promise<void>;
}

export class RealCloudWatchPublisher implements CloudWatchPublisher {
  constructor(private client: CloudWatchClient = new CloudWatchClient({})) {}
  async putMetrics(namespace: string, metrics: MetricDatum[]): Promise<void> {
    // PutMetricData caps at 20 datums per call
    for (let i = 0; i < metrics.length; i += 20) {
      const batch = metrics.slice(i, i + 20);
      await this.client.send(
        new PutMetricDataCommand({ Namespace: namespace, MetricData: batch }),
      );
    }
  }
}

export interface DmsLagReader {
  getLag(taskArn: string): Promise<LagReport>;
}

export class RealDmsLagReader implements DmsLagReader {
  constructor(
    private client: DatabaseMigrationServiceClient = new DatabaseMigrationServiceClient({}),
  ) {}
  async getLag(taskArn: string): Promise<LagReport> {
    const res = await this.client.send(
      new DescribeReplicationTasksCommand({
        Filters: [{ Name: 'replication-task-arn', Values: [taskArn] }],
      }),
    );
    const task = res.ReplicationTasks?.[0];
    const statsRaw = task?.ReplicationTaskStats;
    // CDCLatencyTarget is a string in DMS API, representing seconds
    const lagStr = (statsRaw as { CDCLatencyTarget?: number } | undefined)?.CDCLatencyTarget;
    const lag = typeof lagStr === 'number' ? lagStr : null;
    return { dmsTaskArn: taskArn, replicationLagSeconds: lag };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Orchestration
// ────────────────────────────────────────────────────────────────────────────

export type ValidateOptions = {
  rds: PrismaClient;
  aurora: PrismaClient;
  cloudwatch: CloudWatchPublisher;
  dmsLag?: DmsLagReader;
  dmsTaskArn?: string;
  tablesToCompare?: readonly string[];
  tablesToHash?: readonly string[];
  now?: () => Date;
};

export type ValidateResult = {
  timestamp: string;
  tableReports: TableReport[];
  hashReports: HashReport[];
  lag: LagReport | null;
  metricsPublished: number;
};

export async function runValidation(opts: ValidateOptions): Promise<ValidateResult> {
  const now = opts.now ?? (() => new Date());
  const timestamp = now();
  const tablesToCompare = opts.tablesToCompare ?? TABLES_TO_COMPARE;
  const tablesToHash = opts.tablesToHash ?? TABLES_TO_HASH;

  // Count rows on both sides in parallel. Each PrismaClient serializes, so
  // within a client we sequence per-table, but across clients we parallelize.
  const rdsCountsPromise = sequentialMap(tablesToCompare, async (t) => [t, await countRows(opts.rds, t)] as const);
  const auroraCountsPromise = sequentialMap(tablesToCompare, async (t) => [t, await countRows(opts.aurora, t)] as const);
  const [rdsCountPairs, auroraCountPairs] = await Promise.all([rdsCountsPromise, auroraCountsPromise]);
  const rdsCounts: Record<string, number> = Object.fromEntries(rdsCountPairs);
  const auroraCounts: Record<string, number> = Object.fromEntries(auroraCountPairs);
  const tableReports = buildTableReports(tablesToCompare, rdsCounts, auroraCounts);

  // Hashes (smaller set, same pattern).
  const rdsHashesPromise = sequentialMap(tablesToHash, async (t) => [t, await hashTable(opts.rds, t)] as const);
  const auroraHashesPromise = sequentialMap(tablesToHash, async (t) => [t, await hashTable(opts.aurora, t)] as const);
  const [rdsHashPairs, auroraHashPairs] = await Promise.all([rdsHashesPromise, auroraHashesPromise]);
  const rdsHashes: Record<string, string> = Object.fromEntries(rdsHashPairs);
  const auroraHashes: Record<string, string> = Object.fromEntries(auroraHashPairs);
  const hashReports = buildHashReports(tablesToHash, rdsHashes, auroraHashes);

  // DMS lag (optional — skipped if no task ARN configured).
  let lag: LagReport | null = null;
  if (opts.dmsLag && opts.dmsTaskArn) {
    lag = await opts.dmsLag.getLag(opts.dmsTaskArn);
  }

  // Emit metrics.
  const metrics: MetricDatum[] = [
    ...toRowDiffMetrics(tableReports, timestamp),
    ...toHashMatchMetrics(hashReports, timestamp),
  ];
  if (lag) {
    const lagMetric = toLagMetric(lag, timestamp);
    if (lagMetric) metrics.push(lagMetric);
  }
  await opts.cloudwatch.putMetrics(CW_NAMESPACE, metrics);

  // Structured JSON log (one line, whole cycle). Downstream log consumers
  // parse the JSON; no PHI, only counts + hashes.
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      event: 'migration.validation.cycle',
      timestamp: timestamp.toISOString(),
      tableReports,
      hashReports,
      lag,
      metricsPublished: metrics.length,
    }),
  );

  return {
    timestamp: timestamp.toISOString(),
    tableReports,
    hashReports,
    lag,
    metricsPublished: metrics.length,
  };
}

// Sequential map to avoid flooding a single Prisma client with parallel queries.
async function sequentialMap<T, U>(items: readonly T[], fn: (item: T) => Promise<U>): Promise<U[]> {
  const out: U[] = [];
  for (const item of items) out.push(await fn(item));
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// CLI entrypoint
// ────────────────────────────────────────────────────────────────────────────

async function cli(): Promise<void> {
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.TARGET_DATABASE_URL;
  if (!sourceUrl || !targetUrl) {
    console.error(
      'FATAL: SOURCE_DATABASE_URL and TARGET_DATABASE_URL must both be set.',
    );
    process.exit(1);
  }

  const rds = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
  const aurora = new PrismaClient({ datasources: { db: { url: targetUrl } } });

  const cloudwatch = new RealCloudWatchPublisher();
  const dmsTaskArn = process.env.DMS_REPLICATION_TASK_ARN;
  const dmsLag = dmsTaskArn ? new RealDmsLagReader() : undefined;

  const intervalArgIdx = process.argv.indexOf('--interval');
  const intervalSec = intervalArgIdx >= 0 ? parseInt(process.argv[intervalArgIdx + 1] ?? '0', 10) : 0;

  try {
    do {
      try {
        const result = await runValidation({
          rds,
          aurora,
          cloudwatch,
          dmsLag,
          dmsTaskArn,
        });
        const critical = result.tableReports.filter((r) => Math.abs(r.rowDiff) > 100).length;
        const hashFails = result.hashReports.filter((r) => !r.hashMatch).length;
        console.log(
          `cycle ok tables=${result.tableReports.length} row_diff_gt_100=${critical} hash_mismatches=${hashFails} lag_s=${result.lag?.replicationLagSeconds ?? 'n/a'}`,
        );
      } catch (err) {
        console.error('cycle error:', err instanceof Error ? err.message : err);
      }
      if (intervalSec > 0) {
        await new Promise((resolve) => setTimeout(resolve, intervalSec * 1000));
      }
    } while (intervalSec > 0);
  } finally {
    await rds.$disconnect();
    await aurora.$disconnect();
  }
}

// Only run CLI when invoked directly, not when imported by tests.
if (require.main === module) {
  cli().catch((err) => {
    console.error('fatal:', err);
    process.exit(1);
  });
}
