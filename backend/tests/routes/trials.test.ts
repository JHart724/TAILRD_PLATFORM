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

  it('the patient query is tenant-scoped (where hospitalId) - a patient in another tenant is never loaded', () => {
    expect(SRC).toMatch(/prisma\.patient\.findMany\(\{\s*where:\s*\{\s*hospitalId/);
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
    // the handler maps ALL patients to results; no filter that drops a matchStatus
    expect(SRC).not.toMatch(/filter\([^)]*INDETERMINATE/);
    expect(SRC).not.toMatch(/matchStatus\s*===\s*'ELIGIBLE'\s*\)/); // no eligible-only narrowing
    expect(SRC).toMatch(/matchStatus: match\.status/);
  });

  it('returns the extended honest shape (matchStatus + criteriaResults + indeterminateSignals)', () => {
    expect(SRC).toMatch(/criteriaResults: match\.criteriaResults/);
    expect(SRC).toMatch(/indeterminateSignals: match\.indeterminateSignals/);
  });

  it('logs counts only, never PHI (no patient name/mrn in logger calls)', () => {
    const logLines = SRC.split('\n').filter(l => /logger\.(info|error|warn)/.test(l));
    for (const l of logLines) {
      expect(l).not.toMatch(/firstName|lastName|\.mrn/);
    }
  });
});
