/**
 * AUDIT-194-B3 (Threading Tranche 2): VD-ECHO-INTERVAL restore + hollow-signature guard, and the
 * HF-72 / HF-73 discrimination behavior change once echo_months is derived.
 *
 * evaluateGapRules is pure. echo_months is passed directly in labValues (the runner derives it via
 * deriveEchoMonths, covered by echoRecency.test.ts). Signature: (dxCodes, labValues, medCodes, age).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const VD_ECHO = 'Surveillance echocardiography overdue in valvular heart disease';
const findVdEcho = (dx: string[], labs: Record<string, number>) =>
  evaluateGapRules(dx, labs, [], 70).find(g => g.status === VD_ECHO);

describe('AUDIT-194-B3: VD-ECHO-INTERVAL restore + HOLLOW-SIGNATURE guard', () => {
  it('FIRES for a valve patient with a documented-but-stale echo (echo_months >= 12)', () => {
    expect(findVdEcho(['I34.0'], { echo_months: 18 })).toBeDefined();
    expect(findVdEcho(['I35.0'], { echo_months: 12 })).toBeDefined();
    expect(findVdEcho(['I05.0'], { echo_months: 36 })).toBeDefined(); // rheumatic MV
  });

  it('HOLLOW GUARD: does NOT fire when echo_months is undefined (no echo on record) - never-fire-on-absence', () => {
    // This is the exact AUDIT-194 hollow direction (fired ~100% of the valve cohort); the restore must NOT reproduce it.
    expect(findVdEcho(['I34.0'], {})).toBeUndefined();
    expect(findVdEcho(['I35.0'], {})).toBeUndefined();
  });

  it('does NOT fire when the echo is recent (echo_months < 12)', () => {
    expect(findVdEcho(['I34.0'], { echo_months: 6 })).toBeUndefined();
    expect(findVdEcho(['I34.0'], { echo_months: 11 })).toBeUndefined();
  });

  it('does NOT fire without a valve dx (I05-I08, I34-I37)', () => {
    expect(findVdEcho(['I25.10'], { echo_months: 24 })).toBeUndefined();
    expect(findVdEcho(['I50.9'], { echo_months: 24 })).toBeUndefined();
  });

  it('carries the 2020 ACC/AHA VHD guideline cite, COR 1 (section 16 preserved)', () => {
    const g = findVdEcho(['I34.0'], { echo_months: 18 });
    expect(g?.evidence?.guidelineSource).toMatch(/2020 ACC\/AHA.*Valvular Heart Disease/);
    expect(g?.evidence?.classOfRecommendation).toBe('Class 1');
  });
});

describe('AUDIT-194-B3: HF-72 / HF-73 discriminate once echo_months is derived', () => {
  const TAKOTSUBO = 'Takotsubo syndrome without recovery echocardiogram';
  const findHf72 = (labs: Record<string, number>) =>
    evaluateGapRules(['I51.81'], labs, [], 65).find(g => g.status === TAKOTSUBO);

  it('HF-72: fire-on-unknown is INTENDED (no echo on record -> fires) for the narrow Takotsubo cohort', () => {
    expect(findHf72({})).toBeDefined();
  });
  it('HF-72 now DISCRIMINATES: a recent echo (echo_months < 2) stops it firing; a stale echo still fires', () => {
    expect(findHf72({ echo_months: 1 })).toBeUndefined();
    expect(findHf72({ echo_months: 3 })).toBeDefined();
  });

  const RADIATION = 'Prior thoracic radiation with cardiac disease - surveillance echo overdue';
  const findHf73 = (labs: Record<string, number>) =>
    evaluateGapRules(['Z92.3', 'I42.0'], labs, [], 65).find(g => g.status === RADIATION);

  it('HF-73: fire-on-unknown is INTENDED (no echo -> fires) for the radiation-surveillance cohort', () => {
    expect(findHf73({})).toBeDefined();
  });
  it('HF-73 now DISCRIMINATES: a recent echo (echo_months < 12) stops it firing; a stale echo still fires', () => {
    expect(findHf73({ echo_months: 6 })).toBeUndefined();
    expect(findHf73({ echo_months: 18 })).toBeDefined();
  });
});
