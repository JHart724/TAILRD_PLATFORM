/**
 * AUDIT-223 open-gap unique index - constraint SHAPE regression guard.
 *
 * The index is SQL-only (Prisma's DSL cannot express a partial unique), so nothing in the schema file pins
 * its shape and no type error fires if someone later "simplifies" it. This test reads the migration and
 * pins the two properties that make it correct rather than harmful:
 *
 *   1. It is PARTIAL on the OPEN set. A TOTAL unique on (patientId, ruleId) would block a genuine NEW
 *      EPISODE - a resolved row keeps its ruleId, so therapy lapsing or a value drifting back out of range
 *      must be able to open a fresh row beside the resolved one. Converting this to a total unique would
 *      silently turn every recurrence into a write failure.
 *   2. It is created in its OWN migration, never alongside a runner that produces duplicates (DRIFT-58): the
 *      container CMD is `prisma migrate deploy && node dist/server.js`, so a 23505 here wedges the rollout,
 *      not just the migration.
 *
 * Syntactic validity + Prisma-parseability are covered separately by the CI Migration Validation job, which
 * applies every migration against an empty Postgres 15. That job cannot catch either property above (an
 * empty table satisfies a total unique just as happily as a partial one), which is why this test exists.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_DIR = join(__dirname, '..', '..', 'prisma', 'migrations');
const MIGRATION_DIR_NAME = '20260730223000_audit_223_open_gap_unique';
const INDEX_NAME = 'therapy_gaps_patient_rule_open_uniq';

function readMigration(dirName: string): string {
  return readFileSync(join(MIGRATIONS_DIR, dirName, 'migration.sql'), 'utf-8');
}

/** Strip `--` comments so assertions read the executable SQL, not the rationale prose above it. */
function sqlOnly(raw: string): string {
  return raw
    .split(/\r?\n/)
    .filter(l => !l.trimStart().startsWith('--'))
    .join('\n');
}

describe('AUDIT-223 open-gap partial unique index', () => {
  const sql = sqlOnly(readMigration(MIGRATION_DIR_NAME));

  it('creates a UNIQUE index on (patientId, ruleId)', () => {
    expect(sql).toMatch(/CREATE\s+UNIQUE\s+INDEX/i);
    expect(sql).toContain(`"${INDEX_NAME}"`);
    expect(sql).toMatch(/ON\s+"therapy_gaps"\s*\(\s*"patientId"\s*,\s*"ruleId"\s*\)/i);
  });

  it('is PARTIAL on the open set - the property that permits a new episode after resolution', () => {
    expect(sql).toMatch(/WHERE[\s\S]*"resolvedAt"\s+IS\s+NULL/i);
  });

  it('excludes NULL ruleId rows (AUDIT-222 orphans carry NULL by design)', () => {
    expect(sql).toMatch(/"ruleId"\s+IS\s+NOT\s+NULL/i);
  });

  it('is NOT a total unique: every CREATE UNIQUE INDEX in the file carries a WHERE predicate', () => {
    const statements = sql.split(';').filter(s => /CREATE\s+UNIQUE\s+INDEX/i.test(s));
    expect(statements).toHaveLength(1);
    for (const s of statements) expect(s).toMatch(/\sWHERE\s/i);
  });

  it('ships ALONE - no runner, backfill, or data mutation shares this migration (DRIFT-58)', () => {
    // A migration that both creates the constraint AND mutates data could deadlock its own precondition.
    expect(sql).not.toMatch(/\b(UPDATE|DELETE|INSERT|ALTER\s+TABLE|DROP)\b/i);
    expect(sql.split(';').filter(s => s.trim().length > 0)).toHaveLength(1);
  });

  it('records the pre-flight zero-duplicates evidence in the migration comment', () => {
    // The ordering is enforced by PR sequencing; the evidence of WHY it was safe to apply lives with it.
    const raw = readMigration(MIGRATION_DIR_NAME);
    expect(raw).toMatch(/PRE-FLIGHT EVIDENCE/);
    expect(raw).toMatch(/DRIFT-58/);
  });

  it('applies AFTER the dedupe-era migrations (the ordering this index depends on)', () => {
    // Originally asserted "is the newest migration". That was a MOVING TARGET - the next migration
    // added anywhere in the repo broke it (and did: 20260803120000_trialmatch_identity). The property
    // this test actually cares about is RELATIVE: the index must not apply before the dedupe-era
    // migrations, because it can only hold once duplicates are gone. Asserted directly now.
    const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort();
    expect(dirs).toContain(MIGRATION_DIR_NAME);
    const dedupeEra = '20260730000000_audit_224_gap_detection_run';
    expect(dirs).toContain(dedupeEra);
    expect(dirs.indexOf(MIGRATION_DIR_NAME)).toBeGreaterThan(dirs.indexOf(dedupeEra));
  });
});
