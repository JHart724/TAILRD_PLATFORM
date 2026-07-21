/**
 * Regression test for registerOpenCount.ts (C2 / AUDIT_METHODOLOGY section 23).
 *
 * Two layers:
 *   1. SYNTHETIC fixtures pin the classification logic (token forms) deterministically - these do not
 *      change as the register grows.
 *   2. REAL-register invariants pin the properties that must hold regardless of count: no id in two
 *      buckets (the AUDIT-080 dedup), and a stable known-OPEN / known-RESOLVED cross-check. The exact
 *      total is intentionally NOT asserted (it changes every time a finding is filed or resolved);
 *      the script's stdout is the source of truth for the number.
 */

import * as path from 'path';
import { computeOpen, parseIndex, runCount } from '../../scripts/registerOpenCount';

const HEADER = '## Findings by severity';
const FOOTER = '## Full findings detail';

function idx(...bullets: string[]): string {
  return [HEADER, '### HIGH (P1)', ...bullets, FOOTER].join('\n');
}

describe('registerOpenCount classification (synthetic)', () => {
  it('counts a bold **OPEN** with no supersession as OPEN', () => {
    const r = computeOpen(parseIndex(idx('- **AUDIT-900** - x (foo; **OPEN** 2026-01-01 - bar).')));
    expect(r.total).toBe(1);
    expect(r.openIds).toEqual(['AUDIT-900']);
  });

  it('counts plain "(Phase 1, OPEN)" and the ; and - delimiter variants as OPEN', () => {
    const r = computeOpen(
      parseIndex(
        idx(
          '- **AUDIT-901** - x (Phase 1, OPEN)',
          '- **AUDIT-902** - x (Phase 2A, OPEN; reproduces tech debt #4)',
          '- **AUDIT-903** - x (Operational, OPEN - surfaced via review)',
        ),
      ),
    );
    expect(r.openIds.sort()).toEqual(['AUDIT-901', 'AUDIT-902', 'AUDIT-903']);
  });

  it('does NOT treat prose "**OPEN QUESTION**" or "(..., an OPEN gap)" as a status token', () => {
    const r = computeOpen(
      parseIndex(
        idx(
          '- **AUDIT-904** - x (**OPEN QUESTION (do NOT answer):** ...; **RESOLVED 2026-02-02**).',
          '- **AUDIT-905** - x describing an OPEN gap in coverage (Phase 1, RESOLVED 2026-02-02).',
        ),
      ),
    );
    expect(r.openIds).toEqual([]); // both are resolved / not-a-status-OPEN
  });

  it('supersedes an OPEN token via bold, bracket, or dated RESOLVED/REMEDIATED', () => {
    const r = computeOpen(
      parseIndex(
        idx(
          '- **AUDIT-906** - x (**OPEN** 2026-01-01) **RESOLVED 2026-03-03 - fixed**.',
          '- **AUDIT-907** - x (**OPEN** 2026-01-01) **[RESOLVED 2026-03-03 - fixed]**.',
          '- **AUDIT-908** - x (Phase 0A, REMEDIATED 2026-03-03 - done).',
        ),
      ),
    );
    expect(r.openIds).toEqual([]);
  });

  it('does NOT let prose VERIFIED / FIXED close a live OPEN (the AUDIT-211/215/217 class)', () => {
    const r = computeOpen(
      parseIndex(
        idx(
          '- **AUDIT-909** - x **VERIFIED ABSENT** from all stores (...; **OPEN** 2026-07-19 - bar).',
          '- **AUDIT-910** - x precondition VERIFIED SAFE (read-only, 2026-07-21) (...; **OPEN** 2026-07-21).',
        ),
      ),
    );
    expect(r.openIds.sort()).toEqual(['AUDIT-909', 'AUDIT-910']);
  });

  it('treats bold/bracket REFUTED|INVALID|DUPLICATE as a superseding verdict', () => {
    const r = computeOpen(
      parseIndex(idx('- **AUDIT-911** - x (target **REFUTED** as a false positive; **OPEN** 2026-01-01).')),
    );
    expect(r.openIds).toEqual([]);
  });

  it('dedupes an id across buckets: open-token bullet + tombstone counts ONCE (AUDIT-080 shape)', () => {
    const md = [
      HEADER,
      '### MEDIUM (P2)',
      '- **AUDIT-912** - x (Phase 3, **OPEN - PRODUCTION-READINESS GATE**)',
      '### LOW (P3)',
      '- **AUDIT-912** - RELOCATED to MEDIUM (supersede-not-delete tombstone): stale outlier.',
      FOOTER,
    ].join('\n');
    const r = computeOpen(parseIndex(md));
    expect(r.total).toBe(1);
    expect(r.bySeverity['MEDIUM (P2)']).toBe(1);
    expect(r.bySeverity['LOW (P3)']).toBeUndefined();
    expect(r.duplicateIds).toEqual(['AUDIT-912']);
  });

  it('does not count DEPLOYED / IN PROGRESS / no-status bullets as OPEN (surfaces them)', () => {
    const r = computeOpen(
      parseIndex(
        idx(
          '- **AUDIT-913** - x (Phase 2A, **DEPLOYED 2026-04-30**; flag-off pending rollout).',
          '- **AUDIT-914** - x (Phase 2A, **IN PROGRESS - Phase b/c SHIPPED 2026-05-07**).',
          '- **AUDIT-915** - x descriptive meta bullet with no status. TWO DISTINCT FINDINGS:',
        ),
      ),
    );
    expect(r.openIds).toEqual([]);
    expect(r.unclassifiedBullets.map((u) => u.id).sort()).toEqual([
      'AUDIT-913',
      'AUDIT-914',
      'AUDIT-915',
    ]);
  });
});

describe('registerOpenCount invariants against the live register', () => {
  const registerPath = path.resolve(__dirname, '..', '..', '..', 'docs', 'audit', 'AUDIT_FINDINGS_REGISTER.md');
  const r = runCount(registerPath);

  it('no id appears in more than one severity bucket (AUDIT-080 dedup holds)', () => {
    expect(r.duplicateIds).toEqual([]);
  });

  it('known-RESOLVED findings are NOT counted OPEN', () => {
    for (const id of ['AUDIT-001', 'AUDIT-039', 'AUDIT-099', 'AUDIT-139', 'AUDIT-197', 'AUDIT-201', 'AUDIT-204', 'AUDIT-205', 'AUDIT-206']) {
      expect(r.openIds).not.toContain(id);
    }
  });

  it('known-OPEN findings ARE counted OPEN', () => {
    for (const id of ['AUDIT-002', 'AUDIT-080', 'AUDIT-148', 'AUDIT-208', 'AUDIT-211', 'AUDIT-215', 'AUDIT-217']) {
      expect(r.openIds).toContain(id);
    }
  });

  it('the total equals the sum of the per-severity split', () => {
    const sum = Object.values(r.bySeverity).reduce((a, b) => a + b, 0);
    expect(sum).toBe(r.total);
  });

  // Operator ruling 2026-07-21: AUDIT-011 IN PROGRESS stays EXCLUDED from the OPEN total per the
  // literal rule (it carries no OPEN status token); no vocabulary change. It must be surfaced by the
  // script (not silently dropped), not counted OPEN.
  it('AUDIT-011 (IN PROGRESS) is not counted OPEN and IS surfaced', () => {
    expect(r.openIds).not.toContain('AUDIT-011');
    expect(r.unclassifiedBullets.map((u) => u.id)).toContain('AUDIT-011');
  });
});
