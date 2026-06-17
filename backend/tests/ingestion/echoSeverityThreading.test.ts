/**
 * v3.0 echo-severity threading unlock (2026-06-17) - the data-path test (design test plan).
 * PATH 1 (CSV writer + engine reads) + PATH 2 (FHIR LOINC->slug). This build threads DATA; it does not
 * author gaps, so the "severe-AS read fires" assertions exercise the labValues read the next-block SH/VHD
 * gaps will use (e.g. aortic_valve_mean_gradient >= 40), not a live gap rule.
 */
import fs from 'fs';
import path from 'path';
import { encodeValveSeverity } from '../../src/ingestion/patientWriter';
import { ECHO_LOINC_TO_SLUG } from '../../src/services/observationService';
import { IMAGING_TYPES, ECHO_CUTOFF_MS, LAB_CUTOFF_MS } from '../../src/ingestion/runGapDetectionForPatient';

// Mirror of the gap runners' labValues construction (runGapDetectionForPatient.ts:39-46) so the data path is
// testable DB-free: valueNumeric-only, keyed by observationType, IMAGING_TYPES -> 365d echo window else 180d.
function buildLabValues(obs: { observationType: string; valueNumeric: number | null; ageMs: number }[]): Record<string, number> {
  const labValues: Record<string, number> = {};
  for (const o of obs) {
    if (o.valueNumeric === null) continue;
    if (labValues[o.observationType] !== undefined) continue;
    const cutoff = IMAGING_TYPES.has(o.observationType) ? ECHO_CUTOFF_MS : LAB_CUTOFF_MS;
    if (o.ageMs > cutoff) continue;
    labValues[o.observationType] = o.valueNumeric;
  }
  return labValues;
}

// ---- encodeValveSeverity (ordinal grade encoding, design option A) ----
describe('encodeValveSeverity - grade-preserving 0-5 ordinal (operator sign-off 2026-06-17)', () => {
  it('canonical grades on the 0-5 scale: none/mild/moderate/severe -> 0/1/3/5', () => {
    expect(encodeValveSeverity('none')).toBe(0);
    expect(encodeValveSeverity('mild')).toBe(1);
    expect(encodeValveSeverity('moderate')).toBe(3);
    expect(encodeValveSeverity('severe')).toBe(5);
  });
  it('half-grades PRESERVED as distinct ordinals (not collapsed)', () => {
    expect(encodeValveSeverity('mild-moderate')).toBe(2);
    expect(encodeValveSeverity('moderate-severe')).toBe(4);
    expect(encodeValveSeverity('moderate to severe')).toBe(4);
  });
  it('case-insensitive + trimmed', () => {
    expect(encodeValveSeverity('  Severe ')).toBe(5);
    expect(encodeValveSeverity('MODERATE')).toBe(3);
  });
  it('synonyms: trivial/trace -> 0, torrential -> 5', () => {
    expect(encodeValveSeverity('trivial')).toBe(0);
    expect(encodeValveSeverity('trace')).toBe(0);
    expect(encodeValveSeverity('torrential')).toBe(5);
  });
  it('unrecognized / null / empty -> null (Path-B, never mis-encoded)', () => {
    expect(encodeValveSeverity('unknown')).toBeNull();
    expect(encodeValveSeverity('')).toBeNull();
    expect(encodeValveSeverity(null)).toBeNull();
  });
});

// ---- PATH 2: ECHO_LOINC_TO_SLUG (section-16-verified LOINCs) ----
describe('ECHO_LOINC_TO_SLUG - verified FHIR echo LOINC mapping', () => {
  it('maps the verified valve LOINCs to engine slugs', () => {
    expect(ECHO_LOINC_TO_SLUG['10230-1']).toBe('lvef');
    expect(ECHO_LOINC_TO_SLUG['18066-1']).toBe('aortic_valve_mean_gradient'); // section-16 NLM-verified
    expect(ECHO_LOINC_TO_SLUG['18089-3']).toBe('aortic_valve_area');
    expect(ECHO_LOINC_TO_SLUG['79964-3']).toBe('aortic_valve_vmax');
    expect(ECHO_LOINC_TO_SLUG['29448-8']).toBe('mitral_eroa');
    expect(ECHO_LOINC_TO_SLUG['18059-6']).toBe('mitral_valve_mean_gradient');
    expect(ECHO_LOINC_TO_SLUG['18012-5']).toBe('ascending_aorta');
  });
  it('the persist-site lookup maps a coded echo Observation to the slug, passes through non-echo LOINCs', () => {
    const toObsType = (code: string) => ECHO_LOINC_TO_SLUG[code] ?? code;
    expect(toObsType('18066-1')).toBe('aortic_valve_mean_gradient'); // FHIR echo -> slug
    expect(toObsType('33747-0')).toBe('33747-0');                    // BNP LOINC unchanged
  });
  it('omits the LOINCs that NLM verification could not confirm (no fabrication)', () => {
    // TR peak velocity, LVESD, vena contracta returned empty from NLM Clinical Tables -> deliberately absent.
    const slugs = Object.values(ECHO_LOINC_TO_SLUG);
    expect(slugs).not.toContain('tr_vmax');
    expect(slugs).not.toContain('lvesd');
    expect(slugs).not.toContain('mitral_vena_contracta');
  });
});

// ---- Freshness: valve slugs get the 365-day ECHO window ----
describe('IMAGING_TYPES freshness for valve echo', () => {
  it('valve slugs are in IMAGING_TYPES (365-day window, not 180-day lab)', () => {
    ['aortic_valve_mean_gradient', 'aortic_valve_area', 'aortic_valve_vmax', 'mitral_regurg_grade',
     'mitral_eroa', 'mitral_valve_area', 'valve_severity'].forEach((s) => {
      expect(IMAGING_TYPES.has(s)).toBe(true);
    });
  });
  it('a valve echo at 300 days threads; at 400 days it is excluded', () => {
    const day = 24 * 60 * 60 * 1000;
    const fresh = buildLabValues([{ observationType: 'aortic_valve_mean_gradient', valueNumeric: 48, ageMs: 300 * day }]);
    expect(fresh['aortic_valve_mean_gradient']).toBe(48);
    const stale = buildLabValues([{ observationType: 'aortic_valve_mean_gradient', valueNumeric: 48, ageMs: 400 * day }]);
    expect(stale['aortic_valve_mean_gradient']).toBeUndefined();
  });
});

// ---- End-to-end read path (the threshold the next-block gaps will use) ----
describe('PATH 1 end-to-end: valve numeric -> labValues -> severity read', () => {
  const day = 24 * 60 * 60 * 1000;
  it('happy path: aortic_valve_mean_gradient=48 threads -> severe-AS read (>=40) fires', () => {
    const lv = buildLabValues([{ observationType: 'aortic_valve_mean_gradient', valueNumeric: 48, ageMs: 30 * day }]);
    expect(lv['aortic_valve_mean_gradient'] >= 40).toBe(true);
  });
  it('ordinal-grade edge: mitral_regurg_grade=4 reads severe (>=3); =2 does not', () => {
    const severe = buildLabValues([{ observationType: 'mitral_regurg_grade', valueNumeric: 4, ageMs: 30 * day }]);
    expect(severe['mitral_regurg_grade'] >= 3).toBe(true);
    const moderate = buildLabValues([{ observationType: 'mitral_regurg_grade', valueNumeric: 2, ageMs: 30 * day }]);
    expect(moderate['mitral_regurg_grade'] >= 3).toBe(false);
  });
  it('null/absent (Path-B): no valve obs -> labValues key undefined (gap gates or Path-B fires)', () => {
    const lv = buildLabValues([{ observationType: 'lvef', valueNumeric: 55, ageMs: 30 * day }]);
    expect(lv['aortic_valve_mean_gradient']).toBeUndefined();
  });
  it('valve_severity ordinal threads on the 0-5 scale: severe(5) reads >=5; moderate-severe(4) reads >=4 but not >=5', () => {
    const severe = buildLabValues([{ observationType: 'valve_severity', valueNumeric: encodeValveSeverity('severe')!, ageMs: 30 * day }]);
    expect(severe['valve_severity'] >= 5).toBe(true);
    const modSevere = buildLabValues([{ observationType: 'valve_severity', valueNumeric: encodeValveSeverity('moderate-severe')!, ageMs: 30 * day }]);
    expect(modSevere['valve_severity'] >= 4).toBe(true);
    expect(modSevere['valve_severity'] >= 5).toBe(false);
  });
});

// ---- Writer-drop regression (AUDIT-165): the previously-dropped fields are now in the persist set ----
describe('AUDIT-165 writer-drop regression', () => {
  it('patientWriter labFields now includes the valve-severity numerics (were dropped before)', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../src/ingestion/patientWriter.ts'), 'utf8');
    ['aortic_valve_vmax', 'aortic_valve_mean_gradient', 'aortic_valve_area', 'mitral_regurg_grade', 'sts_score']
      .forEach((f) => expect(src).toContain(`'${f}'`));
    // valve_severity is handled via the ordinal-encode block, not labFields
    expect(src).toContain('encodeValveSeverity');
  });
});
