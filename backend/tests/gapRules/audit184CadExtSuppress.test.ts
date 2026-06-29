/**
 * AUDIT-184 CAD extension - hollow CAD over-fire suppression (pre-existing defect surfaced by the Synthea
 * proof dry-run; CAD was 92% of gaps, with rules firing 100% of CAD patients on never-threaded signals).
 *
 * Proves, per rule: a SUPPRESSED rule does NOT fire even in its former over-fire condition (CAD present,
 * discriminating signal absent), and a KEPT rule STILL fires on a genuine absent/overdue lab (the runner's
 * staleness window converts absent -> overdue). evaluateGapRules is pure; no DB.
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const CAD = 'I25.10';     // hasCAD (startsWith I25)
const MI = 'I21.9';       // hasRecentMI
const fired = (dx: string[], labs: Record<string, number>, frag: string, age = 60, gender = 'MALE'): boolean =>
  evaluateGapRules(dx, labs, [], age, gender as any, undefined, [], []).some(g => g.status.includes(frag));

describe('AUDIT-184 CAD-EXT: hollow rules (never-threaded Z-code/PHQ discriminator) are SUPPRESSED', () => {
  // each fires its former over-fire condition: CAD (or MI) present, discriminating signal absent
  it('CAD-DEPRESSION suppressed (no PHQ slug)', () => expect(fired([CAD], {}, 'depression screening for CAD')).toBe(false));
  it('CAD-INFLUENZA suppressed (no Z23)', () => expect(fired([CAD], {}, 'annual influenza vaccination for CAD')).toBe(false));
  it('CAD-ACTIVITY suppressed (no Z50.0/Z71.3)', () => expect(fired([CAD], {}, 'physical activity counseling for CAD')).toBe(false));
  it('CAD-DIET suppressed (obesity, no Z71.3)', () => expect(fired([CAD, 'E66.9'], {}, 'dietary counseling for CAD')).toBe(false));
  it('CAD-PSYCHOSOCIAL suppressed (age>65, no Z13.3/Z04.6)', () => expect(fired([CAD], {}, 'psychosocial assessment for elderly CAD', 70)).toBe(false));
  it('CAD-FAMILY-SCREEN suppressed (premature, no Z82.4/Z80.0)', () => expect(fired([CAD], {}, 'family screening for premature CAD', 45)).toBe(false));
  it('CAD-PALLIATIVE suppressed (age>80+angina, no Z51.5)', () => expect(fired([CAD, 'I20.9'], {}, 'palliative care referral for elderly', 85)).toBe(false));
  it('CAD-ADVANCE-DIR suppressed (lvef<30, no Z66)', () => expect(fired([CAD], { lvef: 25 }, 'advance directive discussion for CAD')).toBe(false));
  it('CAD-SEXUAL suppressed (MI, no Z70)', () => expect(fired([MI], {}, 'sexual health counseling for post-MI')).toBe(false));
  it('CAD-DRIVING suppressed (MI, no Z73.6/Z02.4)', () => expect(fired([MI], {}, 'driving restrictions for post-MI')).toBe(false));
});

describe('AUDIT-184 CAD-EXT: slug-mismatch / de-dup / operator-SPEC_ONLY rules are SUPPRESSED', () => {
  it('CAD-FFR suppressed (reads stress_test, real slug is stress_test_months)', () => expect(fired([CAD], {}, 'physiologic assessment (FFR/iFR)')).toBe(false));
  it('CAD-STRESS suppressed (de-dup with CAD-ECHO via !lvef)', () => expect(fired([CAD], {}, 'periodic stress testing or imaging follow-up')).toBe(false));
  it('CAD-BNP suppressed (routine BNP in CAD without HF)', () => expect(fired([CAD], {}, 'BNP/NT-proBNP measurement for CAD')).toBe(false));
  it('women-specific suppressed (primary-prevention, out of CAD count)', () => expect(fired(['I10'], {}, 'women-specific CAD risk', 55, 'FEMALE')).toBe(false));
});

describe('AUDIT-184 CAD-EXT: KEPT monitoring rules STILL fire on genuine absent/overdue lab', () => {
  it('CAD-ECHO still fires (no LVEF)', () => expect(fired([CAD], {}, 'echocardiography for LVEF assessment')).toBe(true));
  it('CAD-BP still fires (no BP)', () => expect(fired([CAD], {}, 'Blood pressure monitoring')).toBe(true));
  it('CAD-LPA still fires (premature, no Lp(a))', () => expect(fired([CAD], {}, 'Lipoprotein(a) screening', 45)).toBe(true));
  it('CAD-GLUCOSE still fires (no HbA1c within interval, no diabetes)', () => expect(fired([CAD], {}, 'glucose screening for CAD')).toBe(true));
});

describe('AUDIT-184 CAD-EXT: NOT over-corrected - legitimate rules still fire', () => {
  it('post-MI REHAB still fires (dx-gated, AUDIT-173 accepted)', () => expect(fired([MI], {}, 'cardiac rehabilitation referral')).toBe(true));
  it('CAD-CALCIUM-SCORE still fires (real single-file slug, reverted)', () => expect(fired(['E11.9'], {}, 'coronary artery calcium scoring', 50)).toBe(true));
  it('CAD-CCTA still fires (real single-file slug, reverted)', () => expect(fired(['I20.9'], {}, 'CCTA for evaluation of stable chest pain', 55, 'FEMALE')).toBe(true));
  it('CAD-ASPIRIN (med-absence) still fires - not in scope', () => expect(fired([CAD], {}, 'aspirin therapy assessment for established CAD')).toBe(true));
});
