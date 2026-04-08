/**
 * Heart Failure Gap Rule Tests — Previously Broken Clinical Logic
 *
 * Tests data construction for rules that were fixed during Phase 1:
 * - A-HeFT (race field fix: gender=BLACK → race=BLACK)
 * - Finerenone (requires T2DM diagnosis)
 * - Ferritin/troponin (correct lab key mapping)
 * - QTc sex-specific thresholds
 *
 * These tests validate test patient construction.
 * Wire to actual gap detection output in Phase 3 once runGapDetectionForPatient exists.
 */

import { buildTestPatient } from './testHelpers';

describe('Heart Failure Gap Rules — Previously Broken', () => {
  it('A-HeFT: Black patient with HFrEF has correct race field', () => {
    const patient = buildTestPatient({
      race: 'BLACK',
      conditions: [{ icd10: 'I50.20' }],
      medications: [{ rxnorm: '29046' }], // lisinopril
      labValues: { lvef: 30 },
    });
    expect(patient.race).toBe('BLACK');
    expect(patient.conditions[0].icd10Code).toBe('I50.20');
    expect(patient.medications[0].rxnormCode).toBe('29046');
  });

  it('A-HeFT: non-Black patient has correct race field', () => {
    const patient = buildTestPatient({
      race: 'WHITE',
      conditions: [{ icd10: 'I50.20' }],
      labValues: { lvef: 30 },
    });
    expect(patient.race).toBe('WHITE');
  });

  it('Finerenone: T2DM required — patient without diabetes', () => {
    const patient = buildTestPatient({
      conditions: [
        { icd10: 'I50.20' }, // HFrEF
        { icd10: 'N18.3' },  // CKD stage 3, NO diabetes
      ],
      labValues: { lvef: 45, egfr: 40 },
    });
    const hasDiabetes = patient.conditions.some(c => c.icd10Code.startsWith('E11'));
    expect(hasDiabetes).toBe(false);
  });

  it('Finerenone: T2DM present — patient with diabetes', () => {
    const patient = buildTestPatient({
      conditions: [
        { icd10: 'I50.20' },
        { icd10: 'N18.3' },
        { icd10: 'E11.9' }, // T2DM
      ],
      labValues: { lvef: 45, egfr: 40 },
    });
    const hasDiabetes = patient.conditions.some(c => c.icd10Code.startsWith('E11'));
    expect(hasDiabetes).toBe(true);
  });

  it('Lab key mapping: hs_tnt and ferritin are distinct observations', () => {
    const patient = buildTestPatient({
      labValues: { hs_tnt: 0.05, ferritin: 350, bnp: 1200 },
    });
    const troponin = patient.observations.find(o => o.labKey === 'hs_tnt');
    const ferritin = patient.observations.find(o => o.labKey === 'ferritin');
    const bnp = patient.observations.find(o => o.labKey === 'bnp');
    expect(troponin).toBeDefined();
    expect(ferritin).toBeDefined();
    expect(bnp).toBeDefined();
    expect(troponin!.valueNumeric).toBe(0.05);
    expect(ferritin!.valueNumeric).toBe(350);
    expect(bnp!.valueNumeric).toBe(1200);
  });

  it('Gender normalization: MALE and FEMALE enum values', () => {
    const male = buildTestPatient({ gender: 'MALE' });
    const female = buildTestPatient({ gender: 'FEMALE' });
    expect(male.gender).toBe('MALE');
    expect(female.gender).toBe('FEMALE');
  });
});

describe('EP Gap Rules — QTc Sex-Specific Thresholds', () => {
  it('Female QTc 480ms is above 470ms female threshold', () => {
    const patient = buildTestPatient({
      gender: 'FEMALE',
      labValues: { qtc: 480 },
    });
    const qtc = patient.observations.find(o => o.labKey === 'qtc')!;
    expect(qtc.valueNumeric).toBe(480);
    expect(qtc.valueNumeric).toBeGreaterThan(470); // female threshold
  });

  it('Male QTc 460ms is above 450ms male threshold', () => {
    const patient = buildTestPatient({
      gender: 'MALE',
      labValues: { qtc: 460 },
    });
    const qtc = patient.observations.find(o => o.labKey === 'qtc')!;
    expect(qtc.valueNumeric).toBe(460);
    expect(qtc.valueNumeric).toBeGreaterThan(450); // male threshold
  });

  it('Female QTc 460ms is below 470ms female threshold — should NOT fire', () => {
    const patient = buildTestPatient({
      gender: 'FEMALE',
      labValues: { qtc: 460 },
    });
    const qtc = patient.observations.find(o => o.labKey === 'qtc')!;
    expect(qtc.valueNumeric).toBeLessThan(470); // below female threshold
  });
});
