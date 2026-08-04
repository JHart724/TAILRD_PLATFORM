/**
 * AUDIT-230: the supersede path inserted the replacement row BEFORE retiring the row it replaced,
 * which transiently violates the partial unique index and fails on first contact.
 *
 * WHY THE EXISTING TESTS COULD NOT CATCH THIS, stated plainly because it is the whole lesson.
 * `audit228BindVariableChunking.test.ts` exercises `applyWritePhase` through an INJECTED WRITER - a
 * plain object with no database behind it. That seam is exactly what made the AUDIT-228 chunking
 * testable, and it is exactly what made this defect invisible: a fake writer has no unique index, so
 * BOTH orderings pass. Worse, those tests asserted the wrong order as the expected behaviour, so they
 * did not merely miss the defect, they PINNED it. A test that encodes the bug is worse than no test,
 * because it converts a latent defect into a defended one.
 *
 * So the fix needs a test that exercises the REAL CONSTRAINT, and this file has two layers:
 *
 *   LAYER 1 - STRUCTURAL, runs everywhere including with no database. Asserts the retire precedes the
 *   insert in the shipped source. Cheap, and it WOULD have caught this exact defect. It is not a
 *   substitute for the constraint - it cannot tell you the index semantics - but it is the backstop
 *   that runs on every machine and every CI job unconditionally.
 *
 *   LAYER 2 - REAL POSTGRES with the ACTUAL index DDL read out of the migration file. Proves
 *   create-then-supersede RAISES and supersede-then-insert SUCCEEDS. Runs wherever `DATABASE_URL` is
 *   set, which includes the CI Jest job (it provisions postgres and runs `prisma db push` before
 *   `npm test`).
 *
 * ONE LIMITATION, NAMED RATHER THAN PAPERED OVER: `prisma db push` builds the schema from
 * `schema.prisma`, and the partial unique index is NOT expressible in Prisma's DSL - it exists only in
 * `20260803120000_trialmatch_identity/migration.sql`. So a CI database does NOT have the index unless
 * a test creates it. This test therefore reads the `CREATE UNIQUE INDEX` statement out of that
 * migration and applies it itself, against a scratch table with the same shape. The scratch table is
 * the compromise - it keeps the test free of the FK graph, PHI middleware and tenant guard that
 * inserting real `trial_matches` rows would drag in - and the DDL provenance is the migration itself,
 * so the two cannot drift on the property under test.
 */
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../../src/lib/prisma';
import {
  applyWritePhase, evaluateCompleteness, MatchPayload, TrialMatchWriter, WritePlan,
} from '../../src/services/trialMatchLifecycle';

const MIGRATION = path.join(
  __dirname, '../../prisma/migrations/20260803120000_trialmatch_identity/migration.sql',
);
const LIFECYCLE = path.join(__dirname, '../../src/services/trialMatchLifecycle.ts');
const RUNNER = path.join(__dirname, '../../src/scripts/refreshTrialMatches.ts');

// ---------------------------------------------------------------------------------------------
// LAYER 1 - structural. No database required.
// ---------------------------------------------------------------------------------------------

describe('AUDIT-230 (structural): the retire precedes the insert in the shipped source', () => {
  const lifecycle = fs.readFileSync(LIFECYCLE, 'utf-8');
  const runner = fs.readFileSync(RUNNER, 'utf-8');

  it('applyWritePhase cannot choose the order - the writer owns it', () => {
    // The defect was possible because the pure layer sequenced two independent writer calls. It now
    // makes ONE call whose name states the order, so "insert first" is not expressible here.
    const phase = lifecycle.slice(lifecycle.indexOf('export async function applyWritePhase'));
    expect(phase).toMatch(/writer\.supersedeThenInsert\(/);
    expect(phase).not.toMatch(/writer\.create\(s\.next\)/);
    expect(phase).not.toMatch(/writer\.supersede\(/);
  });

  it('the writer retires BEFORE it inserts', () => {
    const impl = runner.slice(runner.indexOf('async supersedeThenInsert('));
    const body = impl.slice(0, impl.indexOf('\n    },'));
    const retireAt = body.search(/updateMany\(/);
    const insertAt = body.search(/\.create\(/);
    expect(retireAt).toBeGreaterThan(-1);
    expect(insertAt).toBeGreaterThan(-1);
    expect(retireAt).toBeLessThan(insertAt); // THE assertion. Reversed, this is the shipped defect.
  });

  it('the pair is transactional - the zero-current-rows window is not reachable', () => {
    const impl = runner.slice(runner.indexOf('async supersedeThenInsert('));
    const body = impl.slice(0, impl.indexOf('\n    },'));
    expect(body).toMatch(/\$transaction\(/);
  });

  it('the retire is CONDITIONAL on the row still being current', () => {
    const impl = runner.slice(runner.indexOf('async supersedeThenInsert('));
    const body = impl.slice(0, impl.indexOf('\n    },'));
    expect(body).toMatch(/supersededAt: null/);
    // and a lost race inserts NOTHING - otherwise the replacement becomes a second current row
    expect(body).toMatch(/if \(retired\.count === 0\) return 0;/);
  });
});

// ---------------------------------------------------------------------------------------------
// LAYER 2 - the real constraint, against real postgres.
// ---------------------------------------------------------------------------------------------

const HAS_DB = Boolean(process.env.DATABASE_URL);
const TABLE = 'audit230_supersede_probe';

/** The index statement, read from the migration so test and production cannot drift. */
function indexDdlFromMigration(): string {
  const sql = fs.readFileSync(MIGRATION, 'utf-8');
  const m = /CREATE UNIQUE INDEX "trial_matches_patient_trial_current_uniq"[\s\S]*?;/.exec(sql);
  if (!m) throw new Error('AUDIT-230: partial unique index DDL not found in the migration');
  return m[0]
    .replace('"trial_matches_patient_trial_current_uniq"', `"${TABLE}_current_uniq"`)
    .replace('"trial_matches"', `"${TABLE}"`);
}

if (!HAS_DB) {
  // A skipped constraint test that says nothing is how this class of defect survives. Say it loudly.
  // eslint-disable-next-line no-console
  console.warn(
    '[AUDIT-230] DATABASE_URL is not set: the REAL-CONSTRAINT layer did NOT run. The structural layer ' +
    'above still ran and still catches an order reversal. Set DATABASE_URL (CI does) to verify the ' +
    'index semantics themselves.',
  );
}

const describeDb = HAS_DB ? describe : describe.skip;

describeDb('AUDIT-230 (real constraint): a partial unique index rejects insert-before-retire', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${TABLE}"`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "${TABLE}" (
        "id" TEXT PRIMARY KEY,
        "patientId" TEXT NOT NULL,
        "trialId" TEXT NOT NULL,
        "hospitalId" TEXT NOT NULL,
        "supersededAt" TIMESTAMP(3)
      )`);
    await prisma.$executeRawUnsafe(indexDdlFromMigration());
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${TABLE}"`);
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`DELETE FROM "${TABLE}"`);
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${TABLE}" VALUES ('old', 'p1', 't1', 'h1', NULL)`,
    );
  });

  const currentCount = async (): Promise<number> => {
    const rows = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(*)::int AS n FROM "${TABLE}" WHERE "supersededAt" IS NULL`,
    );
    return Number(rows[0].n);
  };

  it('the index is actually present - otherwise everything below passes vacuously', async () => {
    const rows = await prisma.$queryRawUnsafe<Array<{ indexdef: string }>>(
      `SELECT indexdef FROM pg_indexes WHERE tablename = '${TABLE}' AND indexname = '${TABLE}_current_uniq'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].indexdef).toMatch(/UNIQUE/);
    expect(rows[0].indexdef).toMatch(/supersededAt.*IS NULL/);
  });

  it('THE DEFECT: inserting the replacement while the old row is still current RAISES', async () => {
    await expect(
      prisma.$executeRawUnsafe(`INSERT INTO "${TABLE}" VALUES ('new', 'p1', 't1', 'h1', NULL)`),
    ).rejects.toThrow();
    // and nothing landed - the failure is atomic at the statement level
    expect(await currentCount()).toBe(1);
  });

  it('THE FIX: retiring the old row first, then inserting, SUCCEEDS', async () => {
    await prisma.$executeRawUnsafe(`UPDATE "${TABLE}" SET "supersededAt" = NOW() WHERE "id" = 'old'`);
    await prisma.$executeRawUnsafe(`INSERT INTO "${TABLE}" VALUES ('new', 'p1', 't1', 'h1', NULL)`);
    expect(await currentCount()).toBe(1); // exactly one current row, which is the invariant
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT "id" FROM "${TABLE}" WHERE "supersededAt" IS NULL`,
    );
    expect(rows[0].id).toBe('new');
  });

  it('a SUPERSEDED row does not block a new current row - that is why the index is partial', async () => {
    await prisma.$executeRawUnsafe(`UPDATE "${TABLE}" SET "supersededAt" = NOW() WHERE "id" = 'old'`);
    await prisma.$executeRawUnsafe(`INSERT INTO "${TABLE}" VALUES ('new', 'p1', 't1', 'h1', NULL)`);
    await prisma.$executeRawUnsafe(`UPDATE "${TABLE}" SET "supersededAt" = NOW() WHERE "id" = 'new'`);
    await prisma.$executeRawUnsafe(`INSERT INTO "${TABLE}" VALUES ('newer', 'p1', 't1', 'h1', NULL)`);
    const all = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT COUNT(*)::int AS n FROM "${TABLE}"`,
    );
    expect(Number(all[0].n)).toBe(3); // full history retained
    expect(await currentCount()).toBe(1); // one current
  });

  it('a DIFFERENT pair is unaffected - the constraint is per (patient, trial, tenant)', async () => {
    await prisma.$executeRawUnsafe(`INSERT INTO "${TABLE}" VALUES ('other', 'p2', 't1', 'h1', NULL)`);
    expect(await currentCount()).toBe(2);
  });
});

// ---------------------------------------------------------------------------------------------
// The write phase against a writer that MODELS the constraint.
// ---------------------------------------------------------------------------------------------

const payload = (patientId: string): MatchPayload => ({
  patientId, trialId: 't1', status: 'ELIGIBLE', criteriaResults: [], indeterminateSignals: [],
});

const plan = (over: Partial<WritePlan> = {}): WritePlan => ({
  toCreate: [], toConfirm: [], toSupersede: [], ...over,
});

/**
 * A writer that ENFORCES the partial unique index in memory. The AUDIT-228 recording writer did not,
 * which is why it could not see this. Any future writer stub for this phase should model the
 * constraint too - the fake being cheaper than the real thing is only a virtue while it stays honest
 * about the same invariants.
 */
function constraintAwareWriter() {
  const current = new Map<string, string>([['p1::t1::h1', 'old']]); // key -> row id
  const inserted: string[] = [];
  const retired: string[] = [];
  let seq = 0;

  const writer: TrialMatchWriter = {
    async create(p) {
      const key = `${p.patientId}::${p.trialId}::h1`;
      if (current.has(key)) throw new Error(`unique violation: a current row exists for ${key}`);
      const id = `new-${++seq}`;
      current.set(key, id);
      inserted.push(id);
      return { id };
    },
    async confirm(ids) { return ids.length; },
    async supersedeThenInsert(rowId, _reason, next) {
      const key = `${next.patientId}::${next.trialId}::h1`;
      if (current.get(key) !== rowId) return 0;   // lost the race - insert nothing
      current.delete(key);                        // retire FIRST
      retired.push(rowId);
      const id = `new-${++seq}`;                  // then insert
      current.set(key, id);
      inserted.push(id);
      return 1;
    },
  };
  return { writer, current, inserted, retired };
}

describe('AUDIT-230 write phase against a constraint-modelling writer', () => {
  const COMPLETE = evaluateCompleteness(100, 100);

  it('a supersession leaves exactly ONE current row for the pair', async () => {
    const w = constraintAwareWriter();
    const out = await applyWritePhase(w.writer, plan({
      toSupersede: [{ rowId: 'old', reason: 'clock', next: payload('p1') }],
    }), COMPLETE);

    expect(out.superseded).toBe(1);
    expect(w.retired).toEqual(['old']);
    expect(w.inserted).toHaveLength(1);
    expect(w.current.size).toBe(1);
  });

  it('a lost race reports 0 and inserts NOTHING', async () => {
    // Another actor already retired the row: the replacement must not be inserted, or it becomes the
    // second current row this whole finding is about.
    const w = constraintAwareWriter();
    w.current.set('p1::t1::h1', 'someone-elses-row');

    const out = await applyWritePhase(w.writer, plan({
      toSupersede: [{ rowId: 'old', reason: 'state', next: payload('p1') }],
    }), COMPLETE);

    expect(out.superseded).toBe(0);
    expect(w.inserted).toEqual([]);
  });

  it('several supersessions in one pass each keep the invariant', async () => {
    const w = constraintAwareWriter();
    w.current.set('p2::t1::h1', 'old2');
    w.current.set('p3::t1::h1', 'old3');

    const out = await applyWritePhase(w.writer, plan({
      toSupersede: [
        { rowId: 'old', reason: 'clock', next: payload('p1') },
        { rowId: 'old2', reason: 'state', next: payload('p2') },
        { rowId: 'old3', reason: 'criteria', next: payload('p3') },
      ],
    }), COMPLETE);

    expect(out.superseded).toBe(3);
    expect(w.current.size).toBe(3); // one current row per pair, still
  });

  it('the completeness gate still withholds supersession entirely', async () => {
    const w = constraintAwareWriter();
    const out = await applyWritePhase(w.writer, plan({
      toSupersede: [{ rowId: 'old', reason: 'clock', next: payload('p1') }],
    }), evaluateCompleteness(10, 100));

    expect(out.supersessionWithheld).toBe(true);
    expect(out.superseded).toBe(0);
    expect(w.retired).toEqual([]);
  });
});
