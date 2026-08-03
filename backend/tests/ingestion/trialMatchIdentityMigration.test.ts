/**
 * TrialMatch identity migration: constraint SHAPE + runner-inertness guards.
 *
 * WHY A SHAPE TEST. The partial unique is SQL-only (Prisma's DSL cannot express it), so nothing
 * type-checks it, and CI's Migration Validation job applies migrations against an EMPTY Postgres -
 * where a TOTAL unique passes exactly as happily as a partial one. That job therefore cannot
 * distinguish the correct constraint from the defect it replaces. This test can.
 *
 * This is the same guard `audit223OpenGapUniqueIndex.test.ts` provides for therapy_gaps, applied to
 * the sibling table before it holds a single row.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_DIR = join(__dirname, '..', '..', 'prisma', 'migrations');
const MIGRATION_DIR_NAME = '20260803120000_trialmatch_identity';
const INDEX_NAME = 'trial_matches_patient_trial_current_uniq';

const RAW = readFileSync(join(MIGRATIONS_DIR, MIGRATION_DIR_NAME, 'migration.sql'), 'utf-8');
/** Executable SQL only - assertions must read the statements, not the rationale prose above them. */
const SQL = RAW.split(/\r?\n/).filter(l => !l.trimStart().startsWith('--')).join('\n');

const RUNNER = readFileSync(join(__dirname, '..', '..', 'src', 'scripts', 'refreshTrialMatches.ts'), 'utf-8');
const SCHEMA = readFileSync(join(__dirname, '..', '..', 'prisma', 'schema.prisma'), 'utf-8');

describe('TrialMatch identity migration: constraint shape', () => {
  it('DROPS the total unique that forced overwrite-in-place', () => {
    expect(SQL).toMatch(/DROP INDEX IF EXISTS "trial_matches_patientId_trialId_hospitalId_key"/);
  });

  it('creates a UNIQUE index on (patientId, trialId, hospitalId)', () => {
    expect(SQL).toMatch(/CREATE\s+UNIQUE\s+INDEX/i);
    expect(SQL).toContain(`"${INDEX_NAME}"`);
    expect(SQL).toMatch(/ON\s+"trial_matches"\s*\(\s*"patientId"\s*,\s*"trialId"\s*,\s*"hospitalId"\s*\)/i);
  });

  it('is PARTIAL on the CURRENT row - the property that permits superseded history to coexist', () => {
    expect(SQL).toMatch(/WHERE\s+"supersededAt"\s+IS\s+NULL/i);
  });

  it('is NOT a total unique: every CREATE UNIQUE INDEX carries a WHERE predicate', () => {
    const statements = SQL.split(';').filter(s => /CREATE\s+UNIQUE\s+INDEX/i.test(s));
    expect(statements).toHaveLength(1);
    for (const s of statements) expect(s).toMatch(/\sWHERE\s/i);
  });

  it('records the DRIFT-58 zero-row safety argument in the migration comment', () => {
    expect(RAW).toMatch(/DRIFT-58/);
    expect(RAW).toMatch(/ZERO rows/);
    expect(RAW).toMatch(/cannot raise a uniqueness violation|cannot raise `?23505`?/i);
  });

  it('MUTATES NO DATA: no UPDATE/DELETE/INSERT statement against existing rows', () => {
    // A constraint migration that also moved data could deadlock its own precondition (DRIFT-58).
    // `ON UPDATE CASCADE` / `ON DELETE RESTRICT` are FK REFERENTIAL ACTIONS, not DML - strip them
    // before asserting, or the FK clause on trial_match_runs reads as a false positive.
    const dml = SQL.replace(/ON\s+(UPDATE|DELETE)\s+(CASCADE|RESTRICT|SET NULL|NO ACTION|SET DEFAULT)/gi, '');
    expect(dml).not.toMatch(/\b(UPDATE\s+"|DELETE\s+FROM|INSERT\s+INTO)\b/i);
  });

  it('adds the provenance and lifecycle columns as nullable/defaulted (no table rewrite)', () => {
    for (const col of ['buildSha', 'criteriaVersion', 'lastConfirmedAt', 'supersededAt', 'supersededBy', 'supersessionReason']) {
      expect(SQL).toContain(`"${col}"`);
    }
    // lastConfirmedAt is the only NOT NULL addition and it carries a DEFAULT, so existing rows (none)
    // and future inserts both succeed without a backfill.
    expect(SQL).toMatch(/"lastConfirmedAt"\s+TIMESTAMP\(3\)\s+NOT NULL\s+DEFAULT/i);
  });

  it('creates the AUDIT-224-equivalent run record table', () => {
    expect(SQL).toMatch(/CREATE TABLE "trial_match_runs"/);
    for (const col of ['buildSha', 'patientsEvaluated', 'matchesCreated', 'matchesSuperseded', 'matchesConfirmed', 'completenessFraction', 'outcome']) {
      expect(SQL).toContain(`"${col}"`);
    }
  });

  it('applies AFTER the currently-deployed migrations (relative, not "newest")', () => {
    // Deliberately NOT asserting "is the newest": that is a moving target which the next migration
    // anywhere in the repo would break - exactly how this PR broke the AUDIT-223 sibling assertion.
    // The property that matters is relative ordering against what is already deployed.
    const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => d.name).sort();
    expect(dirs).toContain(MIGRATION_DIR_NAME);
    const lastDeployed = '20260730223000_audit_223_open_gap_unique';
    expect(dirs).toContain(lastDeployed);
    expect(dirs.indexOf(MIGRATION_DIR_NAME)).toBeGreaterThan(dirs.indexOf(lastDeployed));
  });
});

describe('schema records that the partial unique is SQL-only, not missing', () => {
  it('the TrialMatch block names the index and says why it is absent from the DSL', () => {
    const block = SCHEMA.slice(SCHEMA.indexOf('model TrialMatch'), SCHEMA.indexOf('model TrialMatchRun'));
    expect(block).toContain(INDEX_NAME);
    expect(block).toMatch(/cannot express a partial unique/i);
  });

  it('the total unique is GONE as a directive (the comment may still cite it as history)', () => {
    // Scope to executable lines: the block deliberately RECORDS the old constraint in prose, per
    // supersede-not-overwrite, so a whole-block match would fire on the historical note itself.
    const block = SCHEMA.slice(SCHEMA.indexOf('model TrialMatch'), SCHEMA.indexOf('model TrialMatchRun'));
    const directives = block.split(/\r?\n/).filter(l => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('///'));
    expect(directives.join('\n')).not.toMatch(/@@unique\(\[patientId, trialId, hospitalId\]\)/);
  });
});

describe('the runner ships INERT: merging this PR changes no data', () => {
  it('dry-run is the DEFAULT - writes require an explicit --execute', () => {
    expect(RUNNER).toMatch(/const EXECUTE = process\.argv\.includes\('--execute'\)/);
  });

  it('every write is gated behind EXECUTE', () => {
    // Each mutating prisma call must sit inside the `if (EXECUTE)` region.
    const executeBlockStart = RUNNER.indexOf('if (EXECUTE) {');
    expect(executeBlockStart).toBeGreaterThan(-1);
    const writeCalls = [...RUNNER.matchAll(/prisma\.trialMatch\.(create|updateMany|update)\(/g)];
    expect(writeCalls.length).toBeGreaterThan(0);
    for (const m of writeCalls) expect(m.index!).toBeGreaterThan(executeBlockStart);
  });

  it('carries the AUDIT-221 buildSha self-emit and the AUDIT-225 full-scan invariant', () => {
    expect(RUNNER).toMatch(/resolveBuildSha\(\)/);
    expect(RUNNER).toMatch(/assertFullScan\(/);
  });

  it('pages over a cursor and never materializes the whole tenant (the AUDIT-227 lesson)', () => {
    expect(RUNNER).toMatch(/take: BATCH/);
    expect(RUNNER).toMatch(/skip: 1, cursor: \{ id: cursor \}/);
    expect(RUNNER).toMatch(/orderBy: \{ id: 'asc' \}/);
  });

  it('every patient read is tenant-scoped', () => {
    for (const c of RUNNER.split('prisma.patient.').slice(1)) {
      expect(c.slice(0, 300)).toMatch(/hospitalId: TARGET_TENANT/);
    }
  });
});
