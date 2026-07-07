/**
 * AUDIT-194-B3 (Threading Tranche 2): deriveEchoMonths unit tests.
 * Pure function - echo_months = months since the most-recent echo (procedure date union lvef obs date).
 */
import { deriveEchoMonths, ECHO_PROCEDURE_SNOMED } from '../../src/ingestion/echoRecency';

const NOW = Date.parse('2026-07-03T00:00:00Z');
const MS_PER_MONTH = 30.436875 * 24 * 60 * 60 * 1000;
const monthsAgo = (m: number) => new Date(NOW - m * MS_PER_MONTH).toISOString();

describe('AUDIT-194-B3: deriveEchoMonths', () => {
  it('derives months from the most-recent echo PROCEDURE date (SNOMED 40701008 Echocardiography)', () => {
    expect(deriveEchoMonths([], [{ snomedCode: '40701008', procedureDate: monthsAgo(18) }], NOW)).toBe(18);
  });

  it('TTE (433236007) and TEE (105376000) also count as echo procedures', () => {
    expect(deriveEchoMonths([], [{ snomedCode: '433236007', procedureDate: monthsAgo(13) }], NOW)).toBe(13);
    expect(deriveEchoMonths([], [{ snomedCode: '105376000', procedureDate: monthsAgo(6) }], NOW)).toBe(6);
  });

  it('falls back to the lvef observation date when there is no echo procedure', () => {
    expect(deriveEchoMonths([{ observationType: 'lvef', observedDateTime: monthsAgo(15) }], [], NOW)).toBe(15);
  });

  it('unions procedure + lvef and returns the MOST-RECENT (smallest months)', () => {
    const m = deriveEchoMonths(
      [{ observationType: 'lvef', observedDateTime: monthsAgo(6) }],
      [{ snomedCode: '40701008', procedureDate: monthsAgo(20) }],
      NOW,
    );
    expect(m).toBe(6);
  });

  it('returns undefined when NO echo is on record (the never-fire-on-absence source condition)', () => {
    expect(deriveEchoMonths([], [], NOW)).toBeUndefined();
    // a non-echo procedure + a non-lvef observation -> still undefined
    expect(deriveEchoMonths(
      [{ observationType: 'ferritin', observedDateTime: monthsAgo(3) }],
      [{ snomedCode: '99999999', procedureDate: monthsAgo(3) }],
      NOW,
    )).toBeUndefined();
  });

  it('is UNFILTERED: a >12-month (and >365-day) old echo is still returned, not dropped', () => {
    // 24 months old - well past the 365-day ECHO_CUTOFF; must survive so VD-ECHO-INTERVAL can catch it.
    expect(deriveEchoMonths([], [{ snomedCode: '40701008', procedureDate: monthsAgo(24) }], NOW)).toBe(24);
  });

  it('clamps a future echo date to 0 (no negative months)', () => {
    const future = new Date(NOW + 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(deriveEchoMonths([], [{ snomedCode: '40701008', procedureDate: future }], NOW)).toBe(0);
  });

  it('the echo procedure SNOMED set is the three Stage-1b source-confirmed codes', () => {
    expect([...ECHO_PROCEDURE_SNOMED].sort()).toEqual(['105376000', '40701008', '433236007']);
  });
});
