/**
 * AUDIT-194 Part A - cross-module hollow over-fire suppression (HF + VHD).
 *
 * The AUDIT-184-CAD-EXT hollow-read defect is a coding PATTERN, not CAD-specific: a rule whose
 * discriminating gate negates a signal NO ingestion path threads is a tautology -> fires ~100% of its
 * dx-eligible cohort. The cross-module sweep found the same cluster live in HF and VHD (HF-38 was the
 * IDENTICAL rule to the already-retired CAD-INFLUENZA - see CLAUDE.md section 20).
 *
 * Proves per rule: a SUPPRESSED rule (7 permanent RETIRE + 4 SPEC_ONLY-pending-threading) does NOT fire in
 * its former over-fire condition (dx present, unthreaded discriminating signal absent); and the 3 KEPT rules
 * (do-not-over-correct) STILL fire. evaluateGapRules is pure; no DB.
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const HF = 'I50.9'; // hasHF
const fired = (
  dx: string[],
  labs: Record<string, number>,
  frag: string,
  age = 60,
  gender = 'MALE',
): boolean =>
  evaluateGapRules(dx, labs, [], age, gender as any, undefined, [], []).some((g) => g.status.includes(frag));

describe('AUDIT-194 HF: hollow over-fire rules SUPPRESSED (fire their former over-fire condition)', () => {
  it('HF-37-FU discharge follow-up suppressed (bare hasHF, no discharge/followup signal)', () =>
    expect(fired([HF], {}, 'Post-discharge follow-up')).toBe(false));
  it('HF-38 influenza suppressed (bare hasHF, no Z23 - identical to retired CAD-INFLUENZA)', () =>
    expect(fired([HF], {}, 'Influenza vaccination status')).toBe(false));
  // HF-74 + HF-90 RESTORED by AUDIT-194-B1 (Threading Tranche 1): nt_probnp (LOINC 33762-6) is now threaded,
  // so they are no longer hollow. They fire only when the patient lacks a natriuretic peptide (a real gap) -
  // see the AUDIT-194-B1 restore-and-not-hollow block below. They are intentionally NOT in the suppressed set.
  it('HF-91 sleep-apnea suppressed (G47.3+HF, !Z99.8 broken proxy)', () =>
    expect(fired([HF, 'G47.30'], {}, 'Sleep-disordered breathing treatment')).toBe(false));
});

describe('AUDIT-194-B1 Threading Tranche 1: HF-74/HF-90 RESTORED, fire only on real absence (NOT hollow)', () => {
  // Threading nt_probnp makes the gate discriminate: fires when the patient has NO natriuretic peptide (real
  // monitoring gap for a subset), does NOT fire when nt_probnp is present -> not the ~100% hollow over-fire.
  it('HF-74 fires for an HF patient with NO natriuretic peptide (real gap)', () =>
    expect(fired([HF], {}, 'NT-proBNP/BNP monitoring not documented')).toBe(true));
  it('HF-74 does NOT fire when nt_probnp IS present (threaded signal discriminates - not hollow)', () =>
    expect(fired([HF], { nt_probnp: 450 }, 'NT-proBNP/BNP monitoring not documented')).toBe(false));
  it('HF-90 fires for an E85 amyloid patient with NO natriuretic peptide (real gap)', () =>
    expect(fired(['E85.4'], {}, 'Amyloid biomarker follow-up')).toBe(true));
  it('HF-90 does NOT fire when nt_probnp IS present (not hollow)', () =>
    expect(fired(['E85.4'], { nt_probnp: 900 }, 'Amyloid biomarker follow-up')).toBe(false));
});

describe('AUDIT-194 VHD: hollow over-fire rules SUPPRESSED (fire their former over-fire condition)', () => {
  it('VD-7 exercise-restriction AS>65 suppressed (over-broad, no counseling signal)', () =>
    expect(fired(['I35.0'], {}, 'Exercise restriction documentation', 70)).toBe(false));
  it('VD-16 mixed-valve suppressed (bare I35.2, no discriminator)', () =>
    expect(fired(['I35.2'], {}, 'Mixed aortic valve disease assessment')).toBe(false));
  it('VD-ECHO-INTERVAL suppressed-pending-threading (echo_months unthreaded)', () =>
    expect(fired(['I35.0'], {}, 'echocardiographic surveillance interval')).toBe(false));
  it('VD-FUNCTIONAL-STATUS suppressed (valve+symptom, nyha_class unthreaded)', () =>
    expect(fired(['I35.0', 'R06.00'], {}, 'functional status assessment (NYHA class)')).toBe(false));
  it('VD-PREOP-ASSESSMENT suppressed (severe valve, sts_score unthreaded)', () =>
    expect(fired(['I35.0'], {}, 'preoperative risk assessment')).toBe(false));
  it('VD-PULMONARY-HTN suppressed-pending-threading (valve+dyspnea, pasp unthreaded)', () =>
    expect(fired(['I35.0', 'R06.00'], {}, 'pulmonary hypertension screening in valve disease')).toBe(false));
});

describe('AUDIT-194 KEPT rules STILL fire (do-not-over-correct; post-MI-REHAB discipline)', () => {
  it('HF-20 cardiac rehab still fires (analog of preserved CAD post-MI REHAB, Class 2a)', () =>
    expect(fired([HF], {}, 'Cardiac rehabilitation referral')).toBe(true));
  it('VD-18 exercise-test asymptomatic-severe-valve still fires (threaded symptom gate, correct)', () =>
    expect(fired(['I35.0'], {}, 'Exercise testing recommended')).toBe(true));
  it('VD-10 pregnancy-risk still fires (real threaded gender/age/dx, narrow cohort)', () =>
    expect(fired(['I34.0'], {}, 'Pregnancy risk assessment', 30, 'FEMALE')).toBe(true));
});
