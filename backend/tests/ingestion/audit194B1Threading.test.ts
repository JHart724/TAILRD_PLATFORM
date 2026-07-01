/**
 * AUDIT-194-B1 / Threading Tranche 1 - the LOINC->slug persist-site threading contract.
 *
 * These LOINCs were CONFIRMED PRESENT in the Synthea observations.csv feed (verify-don't-assume; the source
 * count is recorded per mapping). Threading them into ECHO_LOINC_TO_SLUG stops the FHIR/synthea persist path
 * from dropping them, so the previously-dark HF renal/iron/K/hyponatremia + CAD lipid gap rules can fire on
 * real values. BNP (33747-0/30934-4) is deliberately ABSENT (Synthea emits NT-proBNP only) - the bnp slug
 * stays honestly unthreaded. This test pins the threaded set + the deliberate BNP omission.
 */
import { ECHO_LOINC_TO_SLUG } from '../../src/services/observationService';

describe('AUDIT-194-B1 threading: verified Synthea-emitted LOINCs map to their engine slug', () => {
  const THREADED: Array<[string, string]> = [
    ['33914-3', 'egfr'],
    ['33762-6', 'nt_probnp'], ['71425-3', 'nt_probnp'],
    ['2276-4', 'ferritin'],
    ['6298-4', 'potassium'], ['2823-3', 'potassium'],
    ['18262-6', 'ldl'],
    ['2947-0', 'sodium'], ['2951-2', 'sodium'],
    ['2502-3', 'tsat'],
    ['39156-5', 'bmi'],
    ['2571-8', 'triglycerides'],
    ['38483-4', 'creatinine'], // completeness: blood variant; 2160-0 serum already threaded
  ];
  it.each(THREADED)('LOINC %s -> slug %s', (loinc, slug) => {
    expect(ECHO_LOINC_TO_SLUG[loinc]).toBe(slug);
  });

  it('creatinine keeps its pre-existing serum/plasma mapping too (additive, not replaced)', () => {
    expect(ECHO_LOINC_TO_SLUG['2160-0']).toBe('creatinine');
  });

  it('BNP LOINCs are NOT threaded (absent from Synthea; do not map onto the bnp slug)', () => {
    expect(ECHO_LOINC_TO_SLUG['33747-0']).toBeUndefined();
    expect(ECHO_LOINC_TO_SLUG['30934-4']).toBeUndefined();
  });
});
