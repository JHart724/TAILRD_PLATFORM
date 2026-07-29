/**
 * AUDIT-222 consolidation-orphan RETIREMENT - retire the stored gaps whose rule the engine has retired.
 *
 * WHY: the AUDIT-195/196 lipid consolidation replaced two rules with one. Their already-fired rows survived
 * (the runners never resolve - AUDIT-223), and the AUDIT-222 backfill deliberately left them `ruleId = NULL`
 * because no current rule emits their status. They are therefore INERT to detection but still presented to
 * clinicians as open recommendations that the engine itself has withdrawn. They are misleading TODAY,
 * independent of the re-detection.
 *
 * Measured target (production, tenant demo-synthea-threaded, verified 2026-07-29 post-sweep): exactly 4,129
 * rows, exactly two statuses - `Consider ezetimibe add-on for LDL not at goal on statin` (2,179) and
 * `Consider PCSK9 inhibitor for LDL not at goal on maximally tolerated statin` (1,950).
 *
 * SEQUENCE (operator ruling 2026-07-29, recorded in docs/audit/AUDIT_222_223_JOINT_DESIGN.md section 8):
 * this retirement runs BEFORE the first post-fix re-detection (G2), both in one gated session. Rationale:
 * G2 will create 1,569 rows carrying the CONSOLIDATED status, so retiring first avoids a duplicate window
 * that would otherwise last until PR-B. Full PR-B resolve semantics remain post-G2.
 *
 * SHAPE (AUDIT-218/225 pattern, deliberately mirrored):
 *   - DEDICATED: updates only therapy_gaps rows it targets, plus ONE summary auditLog row.
 *   - BELT-AND-BRACES TARGETING: tenant literal AND ruleId IS NULL AND resolvedAt IS NULL AND status IN the
 *     two exact strings. No single predicate is sufficient: ruleId-NULL alone would catch any future
 *     unattributed row, and status alone would catch an attributed or already-retired one.
 *   - MUTATION-SAFE PAGINATION (AUDIT-225): pages over `where: { hospitalId }` only - never a column this
 *     runner writes - and filters targets in memory, so the page-set cannot shrink under its own updates.
 *   - COMPLETENESS INVARIANT: assertFullScan aborts on a short walk BEFORE the audit row is written.
 *   - RETIREMENT IS AN UPDATE, NEVER A DELETE: total row count must not change.
 *   - DRY-RUN BY DEFAULT; `--execute` is the only mutating path, gated by snapshot + operator GO.
 *   - IDEMPOTENT: a retired row has resolvedAt set AND a suffixed status, so it no longer matches the
 *     target predicate; a second pass targets 0 and exits 0.
 *   - AUDIT-221 vehicle self-attestation: the startup log emits the container's baked buildSha.
 *
 * HOW RETIREMENT IS EXPRESSED (operator ruling, option (ii) - no migration):
 *   resolvedAt = now, resolvedBy = 'system:audit-222-retirement' (the `system:` prefix is RESERVED for
 *   non-human actors), and a bounded machine-recognizable suffix APPENDED to currentStatus with the original
 *   text preserved verbatim (supersede-not-overwrite - unlike the clinician path, which overwrites status
 *   with the action verb). A schema-enforced distinction is deferred to PR-B's resolution taxonomy.
 *
 * USAGE:
 *   node dist/scripts/retireConsolidationOrphans.js                 # dry-run, no writes
 *   node dist/scripts/retireConsolidationOrphans.js --execute       # mutating; operator-gated
 *   node dist/scripts/retireConsolidationOrphans.js --tenant <id>
 */

import prisma from '../lib/prisma';
import { RETIREMENT_ACTOR, RETIREMENT_MARKER } from '../services/gapResolutionActor';

const EXECUTE = process.argv.includes('--execute');
const tenantArgIdx = process.argv.indexOf('--tenant');
export const DEFAULT_TENANT = 'demo-synthea-threaded' as const;
const TARGET_TENANT =
  tenantArgIdx >= 0 && process.argv[tenantArgIdx + 1] ? process.argv[tenantArgIdx + 1] : DEFAULT_TENANT;

const BATCH = 500;

/** The exact statuses the AUDIT-195/196 consolidation retired. Byte-exact; never pattern-matched. */
export const RETIRED_STATUSES: readonly string[] = [
  'Consider ezetimibe add-on for LDL not at goal on statin',
  'Consider PCSK9 inhibitor for LDL not at goal on maximally tolerated statin',
];

/** The rule that superseded them, named in the retirement suffix so a reader can follow the trail. */
export const SUPERSEDED_BY = 'LDL not at goal on statin - intensify lipid therapy' as const;

function plog(msg: string, extra?: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.log(msg, extra ? JSON.stringify(extra) : '');
}

/** AUDIT-221: the build the container is actually running. 'dev' means the vehicle is unverified. */
export function resolveBuildSha(env: NodeJS.ProcessEnv = process.env): string {
  return env.APP_GIT_SHA || 'dev';
}

export interface RetirementRow {
  ruleId: string | null;
  resolvedAt: Date | null;
  currentStatus: string;
}

/**
 * Belt-and-braces target test. ALL FOUR conditions must hold; the tenant is enforced by the query.
 * Deliberately exact-match on status - a pattern match could catch the consolidated successor.
 */
export function isRetirementTarget(row: RetirementRow): boolean {
  if (row.ruleId !== null) return false;              // attributed rows are live identities
  if (row.resolvedAt !== null) return false;          // already resolved or retired
  return RETIRED_STATUSES.includes(row.currentStatus); // exact, not prefix
}

/**
 * Append the retirement suffix, preserving the original status text verbatim.
 * Idempotent in shape: a status already carrying the marker is never re-suffixed.
 */
export function retiredStatus(original: string, onDate: string): string {
  if (original.includes(RETIREMENT_MARKER)) return original;
  return `${original}${RETIREMENT_MARKER}${onDate}: rule consolidated per AUDIT-195/196; superseded by "${SUPERSEDED_BY}"]`;
}

export interface RetirementCounts {
  scanned: number;
  targeted: number;
  retired: number;
  skippedAttributed: number;
  skippedAlreadyResolved: number;
  skippedOtherStatus: number;
}

/**
 * AUDIT-225 completeness invariant: never report success on a short walk. Execute-only, and asserted BEFORE
 * the audit row so a partial pass cannot durably record a completion it did not achieve.
 */
export function assertFullScan(scanned: number, expectedTotal: number, execute: boolean): void {
  if (!execute) return;
  if (scanned < expectedTotal) {
    throw new Error(
      `[orphan-retire] ABORT: scanned ${scanned} of ${expectedTotal} tenant rows - the paginator skipped ` +
        `${expectedTotal - scanned}. Refusing to report success on a short scan (AUDIT-225).`,
    );
  }
}

/** Guard the write path: targets found but nothing written is a write anomaly, not a no-op. */
export function assertRetirementProgress(c: RetirementCounts, execute: boolean): void {
  if (execute && c.targeted > 0 && c.retired === 0) {
    throw new Error(
      `[orphan-retire] ABORT: execute retired 0 rows despite ${c.targeted} targeted (write anomaly).`,
    );
  }
}

async function main(): Promise<void> {
  plog('[orphan-retire] start', {
    buildSha: resolveBuildSha(),
    tenant: TARGET_TENANT,
    mode: EXECUTE ? 'EXECUTE' : 'DRY-RUN',
    targetStatuses: RETIRED_STATUSES.length,
  });

  const onDate = new Date().toISOString().slice(0, 10);
  const counts: RetirementCounts = {
    scanned: 0, targeted: 0, retired: 0,
    skippedAttributed: 0, skippedAlreadyResolved: 0, skippedOtherStatus: 0,
  };
  const byStatus = new Map<string, number>();

  const expectedTotal = await prisma.therapyGap.count({ where: { hospitalId: TARGET_TENANT } });
  plog('[orphan-retire] tenant rows to walk', { expectedTotal });

  // Cohort-shift measurement (read-only): patients whose ONLY open CORONARY_INTERVENTION gap is a target
  // row. Both retired statuses are CAD, and modules.ts/godView.ts define module cohort membership as
  // "has an OPEN gap in that module", so those patients leave the CAD cohort when the rows retire.
  // Measured here so the cohort shift is a NUMBER at the GO gate rather than a guess.
  const cadOpen = await prisma.therapyGap.findMany({
    where: { hospitalId: TARGET_TENANT, module: 'CORONARY_INTERVENTION', resolvedAt: null },
    select: { patientId: true, ruleId: true, currentStatus: true, resolvedAt: true },
  });
  const cadByPatient = new Map<string, { total: number; targets: number }>();
  for (const g of cadOpen) {
    const e = cadByPatient.get(g.patientId) ?? { total: 0, targets: 0 };
    e.total++;
    if (isRetirementTarget(g)) e.targets++;
    cadByPatient.set(g.patientId, e);
  }
  let cadCohortLeaving = 0;
  for (const e of cadByPatient.values()) if (e.targets > 0 && e.targets === e.total) cadCohortLeaving++;
  plog('[orphan-retire] CAD cohort-membership delta', {
    patientsWithOpenCadGaps: cadByPatient.size,
    patientsWhoseOnlyOpenCadGapsAreRetiring: cadCohortLeaving,
  });

  let cursor: string | undefined;
  for (;;) {
    // AUDIT-225: page over hospitalId ONLY - a column this runner never writes.
    const rows = await prisma.therapyGap.findMany({
      where: { hospitalId: TARGET_TENANT },
      select: { id: true, ruleId: true, resolvedAt: true, currentStatus: true },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    const targets: Array<{ id: string; currentStatus: string }> = [];
    for (const r of rows) {
      counts.scanned++;
      if (r.ruleId !== null) { counts.skippedAttributed++; continue; }
      if (r.resolvedAt !== null) { counts.skippedAlreadyResolved++; continue; }
      if (!RETIRED_STATUSES.includes(r.currentStatus)) { counts.skippedOtherStatus++; continue; }
      counts.targeted++;
      byStatus.set(r.currentStatus, (byStatus.get(r.currentStatus) ?? 0) + 1);
      targets.push({ id: r.id, currentStatus: r.currentStatus });
    }

    if (EXECUTE && targets.length > 0) {
      const now = new Date();
      // Per-row update: the suffix is derived from each row's own status text, so this cannot be a
      // single updateMany. Tenant-scoped on every write.
      for (const t of targets) {
        const res = await prisma.therapyGap.updateMany({
          where: { id: t.id, hospitalId: TARGET_TENANT },
          data: {
            resolvedAt: now,
            resolvedBy: RETIREMENT_ACTOR,
            currentStatus: retiredStatus(t.currentStatus, onDate),
          },
        });
        counts.retired += res.count;
      }
    }

    if (counts.scanned % (BATCH * 20) === 0) plog('[orphan-retire] progress', { scanned: counts.scanned });
    if (rows.length < BATCH) break;
  }

  assertFullScan(counts.scanned, expectedTotal, EXECUTE);
  assertRetirementProgress(counts, EXECUTE);

  if (EXECUTE) {
    await prisma.auditLog.create({
      data: {
        hospitalId: TARGET_TENANT,
        userId: RETIREMENT_ACTOR,
        userEmail: 'system@tailrd-heart.com',
        userRole: 'SYSTEM',
        action: 'GAP_CONSOLIDATION_ORPHAN_RETIREMENT',
        resourceType: 'TherapyGap',
        resourceId: null,
        description:
          `AUDIT-222 consolidation-orphan retirement: retired ${counts.retired} of ${counts.targeted} targeted ` +
          `(walked ${counts.scanned} tenant rows) for ${TARGET_TENANT}; engine-retired rules per AUDIT-195/196`,
        newValues: {
          ...counts,
          expectedTotal,
          byStatus: [...byStatus.entries()],
          cadCohortLeaving,
          buildSha: resolveBuildSha(),
        } as any,
      } as any,
    });
  }

  plog('[orphan-retire] DONE', {
    mode: EXECUTE ? 'EXECUTE' : 'DRY-RUN',
    ...counts,
    expectedTotal,
    byStatus: [...byStatus.entries()],
    cadCohortLeaving,
  });
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      plog('[orphan-retire] FAILED', { error: err instanceof Error ? err.message : String(err) });
      process.exit(1);
    });
}
