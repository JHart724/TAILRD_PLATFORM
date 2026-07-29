/**
 * AUDIT-222 ruleId backfill - attribute existing therapy_gaps rows to the frozen rule identity.
 *
 * WHY: AUDIT-222 gave the write path a real per-rule identity (`therapy_gaps.ruleId`). The migration adds
 * the column NULL for every pre-existing row. Until those rows carry an id they never match a detected gap,
 * so the runner leaves them alone and creates fresh correctly-identified rows beside them. This script
 * attributes the historical rows so the existing clinical record is carried forward rather than orphaned.
 *
 * SHAPE (AUDIT-218 pattern, deliberately mirrored):
 *   - DEDICATED: this is the only thing it does. It reads therapy_gaps and writes therapy_gaps.ruleId plus
 *     ONE summary auditLog row. It touches no other table and runs no gap detection.
 *   - STRUCTURALLY ISOLATED: no rule evaluation, no patient/condition/observation/medication writes.
 *   - DETERMINISTIC: attribution is a pure function of (currentStatus, gapType, module) against a frozen
 *     status->ruleId map derived from the shipped engine. Same input, same output, every run.
 *   - DRY-RUN BY DEFAULT: `--execute` is the only mutating path; gate it behind the section-18 snapshot +
 *     operator execute-GO protocol.
 *   - IDEMPOTENT: only rows with ruleId IS NULL are considered, so a second pass attributes 0 and is a no-op.
 *   - SELF-GATED on the execution vehicle (AUDIT-221): the startup log emits the container's baked buildSha
 *     so a reader can confirm WHICH build is running before a production write.
 *
 * ORPHANS (operator ruling 2026-07-29): rows whose status matches no current rule - the AUDIT-195/196 lipid
 * consolidation residue - are LEFT NULL and counted. They are NOT retired or resolved here; that is a
 * resolve semantic and belongs to PR-B (retire-with-reason). See docs/audit/AUDIT_222_223_JOINT_DESIGN.md.
 *
 * USAGE:
 *   node dist/scripts/backfillGapRuleIds.js                      # dry-run, no writes
 *   node dist/scripts/backfillGapRuleIds.js --execute            # mutating; operator-gated
 *   node dist/scripts/backfillGapRuleIds.js --tenant <id>        # defaults to the Synthea demo tenant
 */

import prisma from '../lib/prisma';
import { RULE_ID_BY_STATUS, PATTERN_ATTRIBUTIONS } from '../ingestion/gaps/ruleIdAttribution';

const EXECUTE = process.argv.includes('--execute'); // mutating path; default = dry-run
const tenantArgIdx = process.argv.indexOf('--tenant');
export const DEFAULT_TENANT = 'demo-synthea-threaded' as const;
const TARGET_TENANT =
  tenantArgIdx >= 0 && process.argv[tenantArgIdx + 1] ? process.argv[tenantArgIdx + 1] : DEFAULT_TENANT;

const BATCH = 500;

function plog(msg: string, extra?: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.log(msg, extra ? JSON.stringify(extra) : '');
}

/** AUDIT-221: the build the container is actually running. 'dev' means the vehicle is unverified. */
export function resolveBuildSha(env: NodeJS.ProcessEnv = process.env): string {
  return env.APP_GIT_SHA || 'dev';
}

export type Attribution =
  | { kind: 'exact'; ruleId: string }
  | { kind: 'pattern'; ruleId: string }
  | { kind: 'orphan' };

/**
 * Attribute one stored row to a frozen ruleId. Exact literal match first (the 358 literal statuses), then
 * the hand-verified pattern rules for the ternary/template families whose stored text carries interpolated
 * values. No match -> orphan (left NULL for PR-B).
 */
export function attributeStatus(currentStatus: string | null): Attribution {
  if (!currentStatus) return { kind: 'orphan' };
  const exact = RULE_ID_BY_STATUS[currentStatus];
  if (exact) return { kind: 'exact', ruleId: exact };
  for (const p of PATTERN_ATTRIBUTIONS) {
    if (p.test.test(currentStatus)) return { kind: 'pattern', ruleId: p.ruleId };
  }
  return { kind: 'orphan' };
}

export interface BackfillCounts {
  scanned: number;
  exact: number;
  pattern: number;
  orphan: number;
  updated: number;
}

/** Non-progress tripwire (AUDIT-115/016 class, refined per AUDIT-220): a real no-op is not a stall. */
export function assertBackfillProgress(c: BackfillCounts, execute: boolean): void {
  if (c.scanned === 0) {
    plog('[ruleid-backfill] nothing to do: no rows with ruleId IS NULL (already backfilled).');
    return;
  }
  const attributable = c.exact + c.pattern;
  if (execute && attributable > 0 && c.updated === 0) {
    throw new Error(
      `[ruleid-backfill] ABORT: execute updated 0 rows despite ${attributable} attributable (write anomaly).`,
    );
  }
}

async function main(): Promise<void> {
  plog('[ruleid-backfill] start', {
    buildSha: resolveBuildSha(),
    tenant: TARGET_TENANT,
    mode: EXECUTE ? 'EXECUTE' : 'DRY-RUN',
  });

  const counts: BackfillCounts = { scanned: 0, exact: 0, pattern: 0, orphan: 0, updated: 0 };
  const orphanStatuses = new Map<string, number>();
  let cursor: string | undefined;

  // Cursor-paginate the NULL-ruleId rows. Tenant-scoped (never a cross-tenant write).
  for (;;) {
    const rows = await prisma.therapyGap.findMany({
      where: { hospitalId: TARGET_TENANT, ruleId: null },
      select: { id: true, currentStatus: true },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    const byRuleId = new Map<string, string[]>();
    for (const r of rows) {
      counts.scanned++;
      const a = attributeStatus(r.currentStatus);
      if (a.kind === 'orphan') {
        counts.orphan++;
        const k = r.currentStatus ?? '(null)';
        orphanStatuses.set(k, (orphanStatuses.get(k) ?? 0) + 1);
        continue;
      }
      if (a.kind === 'exact') counts.exact++;
      else counts.pattern++;
      const list = byRuleId.get(a.ruleId) ?? [];
      list.push(r.id);
      byRuleId.set(a.ruleId, list);
    }

    if (EXECUTE) {
      for (const [ruleId, ids] of byRuleId) {
        const res = await prisma.therapyGap.updateMany({
          where: { id: { in: ids }, hospitalId: TARGET_TENANT },
          data: { ruleId },
        });
        counts.updated += res.count;
      }
    }

    if (counts.scanned % (BATCH * 10) === 0) plog('[ruleid-backfill] progress', { scanned: counts.scanned });
    if (rows.length < BATCH) break;
  }

  assertBackfillProgress(counts, EXECUTE);

  if (EXECUTE) {
    await prisma.auditLog.create({
      data: {
        hospitalId: TARGET_TENANT,
        userId: 'system:ruleid-backfill',
        userEmail: 'system@tailrd-heart.com',
        userRole: 'SYSTEM',
        action: 'GAP_RULEID_BACKFILL',
        resourceType: 'TherapyGap',
        resourceId: null,
        description:
          `AUDIT-222 ruleId backfill: attributed ${counts.updated} of ${counts.scanned} rows ` +
          `(exact ${counts.exact}, pattern ${counts.pattern}, orphan-left-NULL ${counts.orphan}) for ${TARGET_TENANT}`,
        newValues: { ...counts, buildSha: resolveBuildSha() } as any,
      } as any,
    });
  }

  plog('[ruleid-backfill] DONE', {
    mode: EXECUTE ? 'EXECUTE' : 'DRY-RUN',
    ...counts,
    orphanDistinctStatuses: orphanStatuses.size,
    orphanTop: [...orphanStatuses.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
  });
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      plog('[ruleid-backfill] FAILED', { error: err instanceof Error ? err.message : String(err) });
      process.exit(1);
    });
}
