/**
 * Behavior tests for the SNOMED->ICD-10-CM crosswalk layer (snomedCrosswalk.ts).
 * These are INDEPENDENT of the authoritative map data: they use OBVIOUSLY-FAKE fixtures so they
 * exercise behavior (translate / bypass / unmapped-record / report) without asserting any real
 * clinical mapping. A Section-16 guard test also asserts the production CV table is still empty
 * (no inferred data added before the operator provides the authoritative values).
 */
import {
  crosswalkWith,
  resolveConditionIcd10,
  crosswalkConditionCode,
  CrosswalkReporter,
  CV_SNOMED_ICD10_MAP,
  type CrosswalkMap,
} from '../../src/ingestion/snomedCrosswalk';

// Obviously-fake fixture (NOT authoritative, NOT real codes) - exercises 1:1 and 1:many.
const FIXTURE: CrosswalkMap = {
  'TEST-SNOMED-A': { icd10: ['TEST-ICD-A1'], source: 'TEST-FIXTURE-NOT-AUTHORITATIVE' },
  'TEST-SNOMED-B': { icd10: ['TEST-ICD-B1', 'TEST-ICD-B2'], source: 'TEST-FIXTURE-NOT-AUTHORITATIVE' },
};

describe('snomedCrosswalk - translate a populated SNOMED code', () => {
  it('maps a 1:1 code and carries its source', () => {
    const r = crosswalkWith(FIXTURE, 'TEST-SNOMED-A');
    expect(r.mapped).toBe(true);
    expect(r.icd10).toEqual(['TEST-ICD-A1']);
    expect(r.source).toBe('TEST-FIXTURE-NOT-AUTHORITATIVE');
  });
  it('maps a 1:many code (NLM map can be 1:many)', () => {
    const r = crosswalkWith(FIXTURE, 'TEST-SNOMED-B');
    expect(r.mapped).toBe(true);
    expect(r.icd10).toEqual(['TEST-ICD-B1', 'TEST-ICD-B2']);
  });
  it('returns a copy of the icd10 array (no shared mutable state)', () => {
    const r = crosswalkWith(FIXTURE, 'TEST-SNOMED-B');
    r.icd10.push('MUTATED');
    expect(FIXTURE['TEST-SNOMED-B'].icd10).toEqual(['TEST-ICD-B1', 'TEST-ICD-B2']);
  });
});

describe('snomedCrosswalk - unmapped code is recorded, not dropped', () => {
  it('returns mapped=false with empty icd10 + unmapped source', () => {
    const r = crosswalkWith(FIXTURE, 'TEST-SNOMED-UNKNOWN');
    expect(r.mapped).toBe(false);
    expect(r.icd10).toEqual([]);
    expect(r.source).toMatch(/unmapped/i);
  });
  it('the reporter captures unmapped codes with counts (no silent drop)', () => {
    const rep = new CrosswalkReporter();
    for (const code of ['TEST-SNOMED-A', 'TEST-SNOMED-UNKNOWN', 'TEST-SNOMED-UNKNOWN', 'TEST-SNOMED-B']) {
      rep.record(crosswalkWith(FIXTURE, code), code);
    }
    const out = rep.report();
    expect(out.totalMapped).toBe(2);
    expect(out.totalUnmapped).toBe(2);
    expect(out.unmappedCodes).toEqual([{ snomed: 'TEST-SNOMED-UNKNOWN', count: 2 }]);
  });
});

describe('snomedCrosswalk - ICD-10 input BYPASSES the layer (production Epic feed)', () => {
  it('passes an ICD-10 code through unchanged with a bypass source', () => {
    const r = resolveConditionIcd10('I50.9', 'ICD10', FIXTURE);
    expect(r.mapped).toBe(true);
    expect(r.icd10).toEqual(['I50.9']);
    expect(r.source).toMatch(/bypass/i);
  });
  it('does NOT consult the crosswalk map for ICD-10 input (even if the code collides with a map key)', () => {
    // 'TEST-SNOMED-A' is a fixture key; under ICD10 codeSystem it must pass through, NOT translate.
    const r = resolveConditionIcd10('TEST-SNOMED-A', 'ICD10', FIXTURE);
    expect(r.icd10).toEqual(['TEST-SNOMED-A']);
    expect(r.source).toMatch(/bypass/i);
  });
  it('SNOMED input DOES apply the crosswalk', () => {
    const r = resolveConditionIcd10('TEST-SNOMED-A', 'SNOMED', FIXTURE);
    expect(r.icd10).toEqual(['TEST-ICD-A1']);
    expect(r.mapped).toBe(true);
  });
});

describe('snomedCrosswalk - populated production map (25 authoritative CV mappings)', () => {
  it('carries exactly 25 entries', () => {
    expect(Object.keys(CV_SNOMED_ICD10_MAP).length).toBe(25);
  });
  it('every entry has at least one ICD-10 target and a citation source', () => {
    for (const [snomed, entry] of Object.entries(CV_SNOMED_ICD10_MAP)) {
      expect(entry.icd10.length).toBeGreaterThan(0);
      expect(entry.icd10.every((c) => c.length > 0)).toBe(true);
      expect(entry.source).toMatch(/refset 6011000124106/);
      expect(snomed).toMatch(/^[0-9]+$/);
    }
  });
  it('maps a clean code to its NLM target with source (49436004 -> I48.91)', () => {
    const r = crosswalkConditionCode('49436004');
    expect(r.mapped).toBe(true);
    expect(r.icd10).toEqual(['I48.91']);
    expect(r.source).toMatch(/NLM-validated billable/);
  });
  it('emits the multi-code mapping (acute renal failure on dialysis -> N17.9 + Z99.2)', () => {
    expect(crosswalkConditionCode('129721000119106').icd10).toEqual(['N17.9', 'Z99.2']);
  });
  it('uses the billable 7th-char form for injury of heart (S26.90XA, not header S26.90)', () => {
    expect(crosswalkConditionCode('86175003').icd10).toEqual(['S26.90XA']);
  });
});

describe('snomedCrosswalk - the 3 documented overrides carry their override note', () => {
  const overrides: Array<[string, string, string]> = [
    ['79619009', 'I34.2', 'I05.0'],   // mitral stenosis
    ['49915006', 'I36.0', 'I07.0'],   // tricuspid stenosis
    ['111287006', 'I36.1', 'I07.1'],  // tricuspid regurg
  ];
  it.each(overrides)('%s -> %s carries the nonrheumatic-override note + the NLM default %s', (snomed, target, nlmDefault) => {
    const r = crosswalkConditionCode(snomed);
    expect(r.icd10).toEqual([target]);
    expect(r.source).toMatch(/nonrheumatic override to match engine gating/);
    expect(r.source).toContain(nlmDefault); // both codes recorded (NLM default noted, not silently swapped)
  });
});
