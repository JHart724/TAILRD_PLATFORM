/**
 * T0 net-new batch (2026-06-19, feat/t0-authoring-sweep). 6 confirmed buildable-now gaps gating only on
 * dx (ICD-10) + meds (RxNorm) - all codes NLM/RxNav-verified. The hollow-check + section-16 collapsed the
 * re-audit's optimistic "~78 T0" to these 6 genuine net-new (4 PV PAH/CTEPH/Behcet pharmacotherapy + 2 EP).
 * Per gap: fire / gate / subgroup / no-double-fire.
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], frag: string) =>
  gaps.find((g) => typeof g.status === 'string' && g.status.includes(frag));

// ICD-10 (NLM-verified)
const BEHCET = 'M35.2';
const DVT = 'I82.401';
const CTEPH = 'I27.24';
const PAH = 'I27.0';                 // primary/idiopathic PAH (Group 1)
const PH_LEFT_HEART = 'I27.22';      // PH due to left heart disease (NOT Group-1, NOT CTEPH)
const CAD = 'I25.10';
// RxNorm IN (RxNav-verified)
const PREDNISONE = '8640';
const RIOCIGUAT = '1439816';
const AMBRISENTAN = '358274';
const SILDENAFIL = '136411';
const SOTATERCEPT = '2678930';
const RIVAROXABAN = '1114195';
const FLECAINIDE = '4441';

const BEHCET_FRAG = 'Behcet vascular thrombosis without immunosuppression';
const CTEPH_FRAG = 'CTEPH without riociguat';
const PAH84_FRAG = 'Group-1 PAH without ERA + PDE5i combination';
const PAH85_FRAG = 'sotatercept add-on';
const RIVA_FRAG = 'take-with-food counseling';
const CASTI_FRAG = 'class IC antiarrhythmic';

describe('PV-042 Behcet vascular immunosuppression', () => {
  it('fires: Behcet + DVT + no immunosuppression', () => {
    expect(find(evaluateGapRules([BEHCET, DVT], {}, [], 35, 'MALE'), BEHCET_FRAG)).toBeTruthy();
  });
  it('gate: on immunosuppression (prednisone) does NOT fire', () => {
    expect(find(evaluateGapRules([BEHCET, DVT], {}, [PREDNISONE], 35, 'MALE'), BEHCET_FRAG)).toBeFalsy();
  });
  it('gate: Behcet without vascular thrombosis does NOT fire', () => {
    expect(find(evaluateGapRules([BEHCET], {}, [], 35, 'MALE'), BEHCET_FRAG)).toBeFalsy();
  });
});

describe('PV-081 CTEPH riociguat', () => {
  it('fires: CTEPH (I27.24) + no riociguat', () => {
    expect(find(evaluateGapRules([CTEPH], {}, [], 60, 'FEMALE'), CTEPH_FRAG)).toBeTruthy();
  });
  it('gate: on riociguat does NOT fire', () => {
    expect(find(evaluateGapRules([CTEPH], {}, [RIOCIGUAT], 60, 'FEMALE'), CTEPH_FRAG)).toBeFalsy();
  });
  it('subgroup gate: I27.22 (PH due to left heart disease, NOT CTEPH) does NOT fire', () => {
    expect(find(evaluateGapRules([PH_LEFT_HEART], {}, [], 60, 'FEMALE'), CTEPH_FRAG)).toBeFalsy();
  });
});

describe('PV-084 PAH ERA+PDE5i combination', () => {
  it('fires: Group-1 PAH + on neither ERA nor PDE5i', () => {
    expect(find(evaluateGapRules([PAH], {}, [], 50, 'FEMALE'), PAH84_FRAG)).toBeTruthy();
  });
  it('gate: on ERA + PDE5i combination does NOT fire', () => {
    expect(find(evaluateGapRules([PAH], {}, [AMBRISENTAN, SILDENAFIL], 50, 'FEMALE'), PAH84_FRAG)).toBeFalsy();
  });
  it('subgroup gate: I27.22 (left-heart PH, not Group-1 PAH) does NOT fire', () => {
    expect(find(evaluateGapRules([PH_LEFT_HEART], {}, [], 50, 'FEMALE'), PAH84_FRAG)).toBeFalsy();
  });
});

describe('PV-085 PAH sotatercept add-on', () => {
  it('fires: Group-1 PAH on background ERA+PDE5i without sotatercept', () => {
    expect(find(evaluateGapRules([PAH], {}, [AMBRISENTAN, SILDENAFIL], 50, 'FEMALE'), PAH85_FRAG)).toBeTruthy();
  });
  it('gate: already on sotatercept does NOT fire', () => {
    expect(find(evaluateGapRules([PAH], {}, [AMBRISENTAN, SILDENAFIL, SOTATERCEPT], 50, 'FEMALE'), PAH85_FRAG)).toBeFalsy();
  });
  it('subgroup gate: PAH on ERA only (no background combination) does NOT fire sotatercept', () => {
    expect(find(evaluateGapRules([PAH], {}, [AMBRISENTAN], 50, 'FEMALE'), PAH85_FRAG)).toBeFalsy();
  });
  it('no double-fire: on-combination patient fires PV-085 (sotatercept) but NOT PV-084 (combination)', () => {
    const g = evaluateGapRules([PAH], {}, [AMBRISENTAN, SILDENAFIL], 50, 'FEMALE');
    expect(find(g, PAH85_FRAG)).toBeTruthy();
    expect(find(g, PAH84_FRAG)).toBeFalsy();
  });
  it('no double-fire: treatment-naive PAH fires PV-084 but NOT PV-085', () => {
    const g = evaluateGapRules([PAH], {}, [], 50, 'FEMALE');
    expect(find(g, PAH84_FRAG)).toBeTruthy();
    expect(find(g, PAH85_FRAG)).toBeFalsy();
  });
});

describe('EP-010 rivaroxaban food counseling', () => {
  it('fires: on rivaroxaban', () => {
    expect(find(evaluateGapRules([], {}, [RIVAROXABAN], 70, 'MALE'), RIVA_FRAG)).toBeTruthy();
  });
  it('gate: not on rivaroxaban does NOT fire', () => {
    expect(find(evaluateGapRules([], {}, [], 70, 'MALE'), RIVA_FRAG)).toBeFalsy();
  });
});

describe('EP-049 class IC AAD in structural HD (CAST safety)', () => {
  it('fires SAFETY: flecainide + CAD (structural HD)', () => {
    const g = find(evaluateGapRules([CAD], {}, [FLECAINIDE], 68, 'MALE'), CASTI_FRAG);
    expect(g).toBeTruthy();
    expect(g.type).toBe('SAFETY_ALERT');
  });
  it('gate: flecainide WITHOUT structural HD (lone AF) does NOT fire', () => {
    expect(find(evaluateGapRules(['I48.0'], {}, [FLECAINIDE], 55, 'MALE'), CASTI_FRAG)).toBeFalsy();
  });
  it('gate: structural HD but NOT on a class IC agent does NOT fire', () => {
    expect(find(evaluateGapRules([CAD], {}, [], 68, 'MALE'), CASTI_FRAG)).toBeFalsy();
  });
});
