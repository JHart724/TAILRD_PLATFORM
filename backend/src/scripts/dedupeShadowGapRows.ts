/**
 * AUDIT-222 shadow-residue DEDUPE - one open row per (patient, rule).
 *
 * WHY: the AUDIT-222 backfill attributed historical rows by STATUS, and ternary rules emit TWO status
 * strings. A patient holding both branch-variants therefore had two distinct stored rows collapse onto one
 * ruleId. Measured live 2026-07-30: 185 (patientId, ruleId) pairs still hold more than one OPEN row - 185
 * extra rows unreachable by the refresh path (only the first-writer-wins row is matched). Down from 31,108
 * pre-fix (a 99.4% reduction) but not zero. Top offenders: gap-cad-statin 66 pairs (a ternary rule),
 * structural-heart imaging 32, gap-cad-rehab-mi 19, glucose screening 12.
 *
 * WHAT: keep the MOST RECENT open row per pair (most recent identifiedAt, id as the deterministic tiebreak)
 * and RESOLVE the rest under `system:audit-222-shadow-dedupe` with a distinct reason. Keeping the newest
 * preserves the freshest clinical text; the older duplicates are historical noise from the pre-identity era.
 *
 * PRECONDITION FOR THE CONSTRAINT: a PARTIAL unique index (open rows only) will enforce this at the DB
 * level, but it ships in a SEPARATE FOLLOW-UP PR that merges only AFTER this dedupe has executed and a
 * verified-zero-duplicates check has passed. That index is NOT in this PR by design: a migration applied
 * against the still-duplicated table raises 23505, and because the container CMD is
 * `prisma migrate deploy && node dist/server.js`, a failed migration blocks server start and wedges the
 * ROLLOUT - not just the migration. Ordering that load-bearing is enforced by PR sequencing, never by a
 * comment. See DRIFT-58 and docs/audit/AUDIT_222_223_JOINT_DESIGN.md section 10.
 *
 * SHAPE (AUDIT-218/225 pattern): dedicated, deterministic targeting, dry-run default, mutation-safe
 * pagination (pages over hospitalId only - never a column this runner writes), full-scan invariant asserted
 * before the audit row, idempotent (a resolved duplicate leaves the open set, so a second pass targets 0),
 * AUDIT-221 buildSha self-emit. Resolution is an UPDATE, never a delete: total row count is unchanged.
 *
 * USAGE:
 *   node dist/scripts/dedupeShadowGapRows.js                # dry-run, no writes
 *   node dist/scripts/dedupeShadowGapRows.js --execute      # mutating; operator-gated
 */

import prisma from '../lib/prisma';
import { resolveBuildSha } from './buildSha';

const EXECUTE = process.argv.includes('--execute');
const tenantArgIdx = process.argv.indexOf('--tenant');
export const DEFAULT_TENANT = 'demo-synthea-threaded' as const;
const TARGET_TENANT =
  tenantArgIdx >= 0 && process.argv[tenantArgIdx + 1] ? process.argv[tenantArgIdx + 1] : DEFAULT_TENANT;

const BATCH = 1000;

/** Actor for the one-shot dedupe. Distinct from the recurring resolve actor so the two are separable. */
export const DEDUPE_ACTOR = 'system:audit-222-shadow-dedupe' as const;
export const DEDUPE_MARKER = ' [DEDUPED ' as const;

function plog(msg: string, extra?: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.log(msg, extra ? JSON.stringify(extra) : '');
}

export interface DupRow {
  id: string;
  patientId: string;
  ruleId: string | null;
  identifiedAt: Date;
  resolvedAt: Date | null;
  currentStatus: string;
}

/**
 * Given all OPEN attributed rows for a tenant, return the ids to resolve: every row in a (patient, ruleId)
 * group except the most recent. Deterministic: newest identifiedAt wins; id descending breaks exact ties, so
 * the same input always yields the same survivor.
 */
export function selectDuplicatesToResolve(rows: readonly DupRow[]): DupRow[] {
  const groups = new Map<string, DupRow[]>();
  for (const r of rows) {
    if (!r.ruleId) continue;      // NULL ruleId has no identity; never a duplicate for this purpose
    if (r.resolvedAt) continue;   // only OPEN rows compete for the one open slot
    const k = `${r.patientId}::${r.ruleId}`;
    const g = groups.get(k) ?? [];
    g.push(r);
    groups.set(k, g);
  }
  const out: DupRow[] = [];
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const sorted = [...g].sort((a, b) => {
      const d = new Date(b.identifiedAt).getTime() - new Date(a.identifiedAt).getTime();
      return d !== 0 ? d : (a.id < b.id ? 1 : -1);
    });
    out.push(...sorted.slice(1)); // keep sorted[0] (most recent), resolve the rest
  }
  return out;
}

export function dedupedStatus(original: string, onDate: string): string {
  if (original.includes(DEDUPE_MARKER)) return original;
  return `${original}${DEDUPE_MARKER}${onDate}: duplicate open row for this rule (AUDIT-222 status-attribution residue); most recent retained]`;
}

export interface DedupeCounts {
  scanned: number;
  openAttributed: number;
  duplicatePairs: number;
  targeted: number;
  resolved: number;
}

/** AUDIT-225 completeness invariant: never report success on a short walk. Execute-only. */
export function assertFullScan(scanned: number, expectedTotal: number, execute: boolean): void {
  if (!execute) return;
  if (scanned < expectedTotal) {
    throw new Error(
      `[shadow-dedupe] ABORT: scanned ${scanned} of ${expectedTotal} tenant rows - the paginator skipped ` +
        `${expectedTotal - scanned}. Refusing to report success on a short scan (AUDIT-225).`,
    );
  }
}

async function main(): Promise<void> {
  plog('[shadow-dedupe] start', {
    buildSha: resolveBuildSha(), tenant: TARGET_TENANT, mode: EXECUTE ? 'EXECUTE' : 'DRY-RUN',
  });

  const expectedTotal = await prisma.therapyGap.count({ where: { hospitalId: TARGET_TENANT } });
  plog('[shadow-dedupe] tenant rows to walk', { expectedTotal });

  const counts: DedupeCounts = { scanned: 0, openAttributed: 0, duplicatePairs: 0, targeted: 0, resolved: 0 };
  const all: DupRow[] = [];
  let cursor: string | undefined;

  // AUDIT-225: page over hospitalId ONLY - a column this runner never writes.
  for (;;) {
    const rows = await prisma.therapyGap.findMany({
      where: { hospitalId: TARGET_TENANT },
      select: { id: true, patientId: true, ruleId: true, identifiedAt: true, resolvedAt: true, currentStatus: true },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;
    counts.scanned += rows.length;
    for (const r of rows) {
      if (r.ruleId && !r.resolvedAt) { counts.openAttributed++; all.push(r as DupRow); }
    }
    if (rows.length < BATCH) break;
  }

  const targets = selectDuplicatesToResolve(all);
  counts.targeted = targets.length;
  const pairs = new Set(targets.map(t => `${t.patientId}::${t.ruleId}`));
  counts.duplicatePairs = pairs.size;

  if (EXECUTE && targets.length > 0) {
    const onDate = new Date().toISOString().slice(0, 10);
    const now = new Date();
    for (const t of targets) {
      const res = await prisma.therapyGap.updateMany({
        where: { id: t.id, hospitalId: TARGET_TENANT, resolvedAt: null },
        data: { resolvedAt: now, resolvedBy: DEDUPE_ACTOR, currentStatus: dedupedStatus(t.currentStatus, onDate) },
      });
      counts.resolved += res.count;
    }
  }

  assertFullScan(counts.scanned, expectedTotal, EXECUTE);

  if (EXECUTE) {
    await prisma.auditLog.create({
      data: {
        hospitalId: TARGET_TENANT,
        userId: DEDUPE_ACTOR,
        userEmail: 'system@tailrd-heart.com',
        userRole: 'SYSTEM',
        action: 'GAP_SHADOW_DEDUPE',
        resourceType: 'TherapyGap',
        resourceId: null,
        description:
          `AUDIT-222 shadow dedupe: resolved ${counts.resolved} duplicate open rows across ` +
          `${counts.duplicatePairs} (patient, rule) pairs for ${TARGET_TENANT}; most recent retained per pair`,
        newValues: { ...counts, expectedTotal, buildSha: resolveBuildSha() } as any,
      } as any,
    });
  }

  plog('[shadow-dedupe] DONE', { mode: EXECUTE ? 'EXECUTE' : 'DRY-RUN', ...counts, expectedTotal });
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      plog('[shadow-dedupe] FAILED', { error: err instanceof Error ? err.message : String(err) });
      process.exit(1);
    });
}
