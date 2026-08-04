/**
 * AUDIT-148 Slice 1 (STEP 4): trials route structural guards.
 *
 * Source-level guards (the codebase's established guard-test style) over the tenant-isolation and
 * honesty invariants of the trials route. A full supertest integration test (auth + DB) is a follow-up
 * slice; these lock the load-bearing structural properties now.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '../../src/routes/trials.ts'), 'utf8');

describe('AUDIT-148 trials route: tenant isolation from the JWT', () => {
  it('hospitalId is taken from the verified JWT (req.user.hospitalId), NEVER from params/body', () => {
    expect(SRC).toMatch(/req\.user!?\.hospitalId/);
    // no hospitalId sourced from the request body or params for authorization
    expect(SRC).not.toMatch(/req\.body\.hospitalId/);
    expect(SRC).not.toMatch(/req\.params\.hospitalId/);
  });

  it('every patient and match query is tenant-scoped - another tenant\'s rows are never loaded', () => {
    // TRIALS PR 3 moved the aggregate reads off `patient` and onto `trialMatch`, so the invariant is
    // asserted over BOTH models rather than one hardcoded call shape.
    //
    // It also had to stop being a naive text scan. A read may scope itself by spreading a hoisted
    // predicate (`...where` / `...matchWhere`) instead of writing `hospitalId` inline - correct code
    // that a substring check would have failed. So a spread is accepted ONLY if the binding it names
    // is itself proven tenant-scoped. Otherwise this test would push the code toward a shape it likes
    // rather than the shape that is right, which is how a guard starts costing more than it protects.
    // No RegExp construction here on purpose: plain substring checks are unambiguous, and the
    // escaping needed to build these patterns from strings is itself a place to be quietly wrong.
    const SCOPED_BINDINGS = ['where', 'matchWhere'];
    for (const name of SCOPED_BINDINGS) {
      const at = SRC.indexOf('const ' + name + ' = {');
      if (at >= 0) expect(SRC.slice(at, SRC.indexOf('}', at))).toContain('hospitalId');
    }
    const referencesScopedBinding = (head: string): boolean =>
      SCOPED_BINDINGS.some(n => head.includes('...' + n) || head.includes('where: ' + n));

    for (const model of ['prisma.patient.findMany(', 'prisma.patient.findFirst(', 'prisma.trialMatch.findMany(']) {
      for (const c of SRC.split(model).slice(1)) {
        const head = c.slice(0, 400);
        expect(head.includes('hospitalId') || referencesScopedBinding(head)).toBe(true);
      }
    }
    // At least one tenant-scoped match read must exist - the pivot's whole read path.
    expect(SRC).toMatch(/prisma\.trialMatch\.findMany\(/);
  });

  it('the persisted read is scoped to CURRENT rows, so superseded history never inflates a count', () => {
    for (const c of SRC.split('prisma.trialMatch.').slice(1)) {
      expect(c.slice(0, 400)).toMatch(/supersededAt: null|matchWhere|\bwhere\b/);
    }
    expect(SRC).toMatch(/supersededAt: null/);
  });

  it('the trial lookup is tenant-scoped (global-curated OR this tenant), never cross-tenant', () => {
    expect(SRC).toMatch(/tenantTrialWhere/);
    expect(SRC).toMatch(/hospitalId: null \}, \{ hospitalId \}/);
  });

  it('the endpoints require auth + MFA + an allowed role', () => {
    expect(SRC).toMatch(/authenticateToken/);
    expect(SRC).toMatch(/requireMFA/);
    expect(SRC).toMatch(/authorizeRole/);
  });
});

describe('AUDIT-148 trials route: honesty + PHI invariants', () => {
  it('does NOT filter out INDETERMINATE patients (they are the coordinator worklist)', () => {
    // No status narrowing anywhere: all three states are returned and all three are counted.
    expect(SRC).not.toMatch(/filter\([^)]*INDETERMINATE/);
    expect(SRC).not.toMatch(/matchStatus\s*===\s*'ELIGIBLE'\s*\)/);
    expect(SRC).not.toMatch(/status:\s*'ELIGIBLE'\s*[,}]/); // no eligible-only WHERE on the persisted read
    expect(SRC).toMatch(/matchStatus:/);
  });

  it('returns the extended honest shape (matchStatus + criteriaResults + indeterminateSignals)', () => {
    // TRIALS PR 3: these now come off the STORED ROW rather than a fresh evaluation, so the assertion
    // is on the payload keys, not on which expression fills them. The source of the detail is pinned
    // separately below - what this guards is that the honesty payload still REACHES the client, which
    // is the property AUDIT-148 filed and which no refactor may quietly drop.
    expect(SRC).toMatch(/criteriaResults:/);
    expect(SRC).toMatch(/indeterminateSignals:/);
  });

  it('the per-criterion detail comes from the SAME evaluation as the verdict beside it', () => {
    // Reading `status` from the stored row while re-evaluating the detail would let a page show a
    // patient counted ELIGIBLE whose displayed criteria say otherwise - at exactly the moment the two
    // disagree, which is when a coordinator most needs them not to. So the page selects all three off
    // the row together, and does not construct an eval context to fill them.
    const page = SRC.slice(SRC.indexOf("router.get('/:trialId/eligible-patients'"), SRC.indexOf("router.post('/:trialId/refer'"));
    expect(page).toMatch(/criteriaResults: true/);        // selected from the row
    expect(page).toMatch(/indeterminateSignals: true/);
    expect(page).not.toMatch(/buildPatientEvalContext/);  // no re-evaluation on this path
    expect(page).not.toMatch(/evaluateTrialMatch/);
  });

  it('the REFERRAL path still evaluates LIVE - a decision record, not a cache read', () => {
    // Design 5.1: matchStatusAtReferral captures what the clinician was looking at AT THAT INSTANT.
    // Binding it to a possibly-stale stored verdict would misrepresent the decision. It is one
    // patient (~18ms), so the aggregate cost argument that justified persistence does not apply.
    const refer = SRC.slice(SRC.indexOf("router.post('/:trialId/refer'"));
    expect(refer).toMatch(/buildPatientEvalContext\(/);
    expect(refer).toMatch(/evaluateTrialMatch\(/);
    expect(refer).toMatch(/matchStatusAtReferral: match\.status/);
    // and it must NOT have been quietly switched to reading the persisted verdict
    expect(refer).not.toMatch(/prisma\.trialMatch\.findFirst/);
    expect(refer).not.toMatch(/prisma\.trialMatch\.findMany/);
  });

  it('every trials read carries the as-of envelope - a precomputed number must say when', () => {
    const summary = SRC.slice(SRC.indexOf("router.get('/summary'"), SRC.indexOf("router.get('/:trialId/referrals'"));
    const page = SRC.slice(SRC.indexOf("router.get('/:trialId/eligible-patients'"), SRC.indexOf("router.post('/:trialId/refer'"));
    expect(summary).toMatch(/asOf/);
    expect(page).toMatch(/asOf/);
  });

  it('DETECTS staleness but never auto-refreshes (ruling R3)', () => {
    // A read request must never trigger a 451-second write pass. The refresh stays operator-gated.
    expect(SRC).not.toMatch(/refreshTrialMatches/);
    expect(SRC).not.toMatch(/prisma\.trialMatch\.(create|updateMany|update)\(/);
    expect(SRC).not.toMatch(/prisma\.trialMatchRun\.(create|update)\(/);
  });

  it('logs counts only, never PHI (no patient name/mrn in logger calls)', () => {
    const logLines = SRC.split('\n').filter(l => /logger\.(info|error|warn)/.test(l));
    for (const l of logLines) {
      expect(l).not.toMatch(/firstName|lastName|\.mrn/);
    }
  });
});
