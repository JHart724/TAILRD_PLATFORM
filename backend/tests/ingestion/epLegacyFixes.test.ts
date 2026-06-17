/**
 * v3.0 EP legacy fold-in fixes (2026-06-16) - regression tests for the corrections applied during the
 * EP DET_OK legacy clinical re-review.
 * Covers: EP-007 (AUDIT-164 bioprosthetic over-fire), EP-046 (permanent-AF arm), EP-015 (relabel),
 * EP-023 (sex restriction removed), EP-097 (alpha-blocker set).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

const APIXABAN = '1364430';
const DRONEDARONE = '233698';
const FLECAINIDE = '4441';
const TAMSULOSIN = '77492';

// ---- EP-007 / AUDIT-164: shared mechanical-valve helper drops Z95.3 (bioprosthetic) ----
describe('EP-007 mechanical-valve DOAC contraindication (AUDIT-164)', () => {
  it('fires: mechanical valve (Z95.2) + DOAC', () => {
    const g = evaluateGapRules(['Z95.2'], {}, [APIXABAN], 70, 'MALE');
    expect(find(g, 'DOAC detected in mechanical valve patient')).toBeTruthy();
  });
  it('fires: mechanical valve (Z95.4) + DOAC', () => {
    const g = evaluateGapRules(['Z95.4'], {}, [APIXABAN], 70, 'MALE');
    expect(find(g, 'DOAC detected in mechanical valve patient')).toBeTruthy();
  });
  it('gates (the fix): BIOPROSTHETIC valve (Z95.3) + DOAC -> NOT contraindicated', () => {
    const g = evaluateGapRules(['Z95.3'], {}, [APIXABAN], 70, 'MALE');
    expect(find(g, 'DOAC detected in mechanical valve patient')).toBeFalsy();
  });
});

// ---- EP-046: dronedarone permanent-AF arm (PALLAS) ----
describe('EP-046 dronedarone permanent-AF arm', () => {
  it('fires: permanent AF (I48.21) + dronedarone (no HF needed)', () => {
    const g = evaluateGapRules(['I48.21'], {}, [DRONEDARONE], 68, 'MALE');
    expect(find(g, 'Dronedarone contraindicated in permanent atrial fibrillation')).toBeTruthy();
  });
  it('fires: advanced HF arm still works (AF + HF + LVEF<35 + dronedarone)', () => {
    const g = evaluateGapRules(['I48.0', 'I50.20'], { lvef: 30 }, [DRONEDARONE], 68, 'MALE');
    expect(find(g, 'Dronedarone contraindicated in advanced heart failure')).toBeTruthy();
  });
  it('gates: paroxysmal AF (I48.0) + dronedarone + no HF (neither arm)', () => {
    const g = evaluateGapRules(['I48.0'], {}, [DRONEDARONE], 68, 'MALE');
    expect(find(g, 'Dronedarone contraindicated')).toBeFalsy();
  });
});

// ---- EP-015: relabel to non-HF paroxysmal AF on AAD, not yet ablated ----
describe('EP-015 AF ablation referral (relabeled)', () => {
  it('fires: non-HF AF on antiarrhythmic, not ablated, age<80', () => {
    const g = evaluateGapRules(['I48.0'], {}, [FLECAINIDE], 60, 'MALE', undefined, [], []);
    expect(find(g, 'Consider AFib catheter ablation referral (symptomatic AF on antiarrhythmic)')).toBeTruthy();
  });
  it('gates: AF + HF routes to EP-014, not EP-015', () => {
    const g = evaluateGapRules(['I48.0', 'I50.20'], {}, [FLECAINIDE], 60, 'MALE', undefined, [], []);
    expect(find(g, 'Consider AFib catheter ablation referral (symptomatic AF on antiarrhythmic)')).toBeFalsy();
  });
  it('gates: already ablated (CPT 93656)', () => {
    const g = evaluateGapRules(['I48.0'], {}, [FLECAINIDE], 60, 'MALE', undefined, [], ['93656']);
    expect(find(g, 'Consider AFib catheter ablation referral (symptomatic AF on antiarrhythmic)')).toBeFalsy();
  });
  it('gates: not on an antiarrhythmic', () => {
    const g = evaluateGapRules(['I48.0'], {}, [], 60, 'MALE', undefined, [], []);
    expect(find(g, 'Consider AFib catheter ablation referral (symptomatic AF on antiarrhythmic)')).toBeFalsy();
  });
});

// ---- EP-023: Brugada screening sex restriction removed ----
describe('EP-023 Brugada screening (sex restriction removed)', () => {
  it('fires: FEMALE < 45 with syncope (previously excluded)', () => {
    const g = evaluateGapRules(['R55'], {}, [], 30, 'FEMALE');
    expect(find(g, 'Consider Brugada syndrome screening in young patient')).toBeTruthy();
  });
  it('fires: MALE < 45 with syncope', () => {
    const g = evaluateGapRules(['R55'], {}, [], 30, 'MALE');
    expect(find(g, 'Consider Brugada syndrome screening in young patient')).toBeTruthy();
  });
  it('gates: age 50 (not young)', () => {
    const g = evaluateGapRules(['R55'], {}, [], 50, 'FEMALE');
    expect(find(g, 'Consider Brugada syndrome screening in young patient')).toBeFalsy();
  });
});

// ---- EP-097: alpha-blocker added to the OH med-review set ----
describe('EP-097 orthostatic hypotension - alpha-blocker', () => {
  it('fires: I95.1 + tamsulosin (alpha-blocker)', () => {
    const g = evaluateGapRules(['I95.1'], {}, [TAMSULOSIN], 75, 'MALE');
    expect(find(g, 'Orthostatic hypotension on BP-lowering therapy: medication review')).toBeTruthy();
  });
});
