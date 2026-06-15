/**
 * v3.0 HF buildout - calibration sample (8 gaps). evaluateGapRules-direct style:
 * positive fires, gate negatives suppress, med gaps prove the ingredient-expand path.
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';
import { expandToIngredients } from '../../src/terminology/expandToIngredients';

const fired = (gaps: any[], frag: string) => gaps.some((g) => g.status && g.status.includes(frag));
const ev = (dx: string[], labs: Record<string, number>, meds: string[], age = 70) =>
  evaluateGapRules(dx, labs, meds, age);

describe('GAP-HF-017 finerenone in HFmrEF/HFpEF', () => {
  const F = 'Consider finerenone in HFmrEF/HFpEF';
  it('fires: LVEF>=40 + K<5 + eGFR>=25 + not on finerenone', () => {
    expect(fired(ev(['I50.30'], { lvef: 50, potassium: 4.5, egfr: 40 }, []), F)).toBe(true);
  });
  it('suppressed: on finerenone (2562811)', () => {
    expect(fired(ev(['I50.30'], { lvef: 50, potassium: 4.5, egfr: 40 }, ['2562811']), F)).toBe(false);
  });
  it('suppressed: K>=5.0 (initiation gate)', () => {
    expect(fired(ev(['I50.30'], { lvef: 50, potassium: 5.2, egfr: 40 }, []), F)).toBe(false);
  });
});

describe('GAP-HF-077 amyloid + AF anticoagulation', () => {
  const F = 'Anticoagulation gap in cardiac amyloidosis';
  it('fires: amyloid + AF + no OAC', () => {
    expect(fired(ev(['E85.82', 'I48.0'], {}, []), F)).toBe(true);
  });
  it('suppressed: on apixaban (1364430)', () => {
    expect(fired(ev(['E85.82', 'I48.0'], {}, ['1364430']), F)).toBe(false);
  });
  it('suppressed: no AF', () => {
    expect(fired(ev(['E85.82'], {}, []), F)).toBe(false);
  });
});

describe('GAP-HF-081 HF + diabetes HbA1c target', () => {
  const F = 'Diabetes above glycemic target in heart failure';
  it('fires: HF + DM + HbA1c>8', () => {
    expect(fired(ev(['I50.20', 'E11.9'], { hba1c: 9.2 }, []), F)).toBe(true);
  });
  it('suppressed: HbA1c at target', () => {
    expect(fired(ev(['I50.20', 'E11.9'], { hba1c: 7.0 }, []), F)).toBe(false);
  });
});

describe('GAP-HF-008 MRA contraindicated by labs (SAFETY)', () => {
  const F = 'SAFETY: MRA contraindicated by hyperkalemia or severe renal impairment';
  it('fires: on MRA + K>=5.5', () => {
    expect(fired(ev(['I50.20'], { potassium: 5.7 }, ['9997']), F)).toBe(true);
  });
  it('fires: on MRA SCD-coded + eGFR=25 (corrected <30 threshold; ingredient-expand path)', () => {
    // spironolactone is IN 9997; route a raw code through expand to mirror the runner
    expect(fired(ev(['I50.20'], { egfr: 25 }, expandToIngredients(['9997'])), F)).toBe(true);
  });
  it('suppressed: eGFR=35 (above the <30 cutoff) + K+ normal', () => {
    expect(fired(ev(['I50.20'], { egfr: 35, potassium: 4.5 }, ['9997']), F)).toBe(false);
  });
  it('suppressed: labs in range', () => {
    expect(fired(ev(['I50.20'], { potassium: 4.5, egfr: 50 }, ['9997']), F)).toBe(false);
  });
  it('suppressed: not on MRA', () => {
    expect(fired(ev(['I50.20'], { potassium: 5.7 }, []), F)).toBe(false);
  });
});

describe('GAP-HF-033 absolute iron deficiency untreated', () => {
  const F = 'Absolute iron deficiency untreated in heart failure';
  it('fires: HF + ferritin<100 + no IV iron', () => {
    expect(fired(ev(['I50.20'], { ferritin: 80 }, []), F)).toBe(true);
  });
  it('suppressed: on IV iron ferric carboxymaltose (1433693)', () => {
    expect(fired(ev(['I50.20'], { ferritin: 80 }, ['1433693']), F)).toBe(false);
  });
  it('suppressed: ferritin>=100', () => {
    expect(fired(ev(['I50.20'], { ferritin: 150 }, []), F)).toBe(false);
  });
});

describe('GAP-HF-143 pericarditis colchicine (corrected: I30 + I31.9 only)', () => {
  const F = 'Colchicine not prescribed in pericarditis';
  it('fires: acute pericarditis I30 + no colchicine', () => {
    expect(fired(ev(['I30.9'], {}, []), F)).toBe(true);
  });
  it('fires: I31.9 unspecified pericarditis', () => {
    expect(fired(ev(['I31.9'], {}, []), F)).toBe(true);
  });
  it('does NOT fire on I31.4 tamponade (structural complication, not pericarditis)', () => {
    expect(fired(ev(['I31.4'], {}, []), F)).toBe(false);
  });
  it('does NOT fire on I31.3 effusion', () => {
    expect(fired(ev(['I31.3'], {}, []), F)).toBe(false);
  });
  it('suppressed: on colchicine (2683)', () => {
    expect(fired(ev(['I30.9'], {}, ['2683']), F)).toBe(false);
  });
});

describe('GAP-HF-054 ATTR-CM disease-modifying therapy (corrected: patisiran dropped)', () => {
  const F = 'ATTR cardiac amyloidosis without disease-modifying therapy';
  it('fires: ATTR (E85.82) + no DMT', () => {
    expect(fired(ev(['E85.82'], {}, []), F)).toBe(true);
  });
  it('suppressed: on tafamidis (1545063)', () => {
    expect(fired(ev(['E85.82'], {}, ['1545063']), F)).toBe(false);
  });
  it('still FIRES on patisiran-only (2053490) - polyneuropathy drug, NOT an ATTR-CM DMT', () => {
    expect(fired(ev(['E85.82'], {}, ['2053490']), F)).toBe(true);
  });
});

describe('GAP-HF-002 non-evidence-based beta-blocker (atenolol/nebivolol)', () => {
  const F = 'Non-evidence-based beta-blocker in HFrEF';
  it('fires: HFrEF + on atenolol (1202)', () => {
    expect(fired(ev(['I50.20'], { lvef: 30 }, ['1202']), F)).toBe(true);
  });
  it('does NOT fire on an evidence-based BB (carvedilol 20352)', () => {
    expect(fired(ev(['I50.20'], { lvef: 30 }, ['20352']), F)).toBe(false);
  });
});
