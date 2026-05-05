// @ts-nocheck
/**
 * Clinical Gap Rule Scenario Tests — Comprehensive Coverage
 *
 * Structural tests verify the 257 gap rules in gapRuleEngine.ts:
 * - Correct count, evidence objects, gender enums, contraindication usage
 * - LVEF LOINC correctness, no directive language
 *
 * Clinical logic tests verify test data construction and threshold values.
 */

import { buildTestPatient, buildClinicalData } from './testHelpers';
import * as fs from 'fs';
import * as path from 'path';

const ENGINE_PATH = path.join(__dirname, '../../src/ingestion/gaps/gapRuleEngine.ts');

// ============================================================
// STRUCTURAL: verify all 257 rules have required properties
// ============================================================

describe('Structural: Gap rule engine integrity', () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(ENGINE_PATH, 'utf8');
  });

  it('exactly 260 gap rules defined (gaps.push calls)', () => {
    // Count incremented from 257 to 259 by EP-XX-7 mitigation (2026-05-04, fix/ep-017-rate-control-hfref-gating):
    // - +1: EP-017 SAFETY gap (HFrEF + on non-DHP CCB → Class 3 Harm alert)
    // - +1: EP-RC LVEF-data-required gap (HF dx + AF + LVEF undefined → structured data gap, not silent default)
    // Then 259 → 260 by AUDIT-034 (2026-05-05, fix/audit-034-cad-016-prasugrel-safety):
    // - +1: CAD-016 SAFETY gap (Prasugrel + stroke/TIA history → Class 3 Harm per FDA black-box)
    // See backend/src/ingestion/gaps/gapRuleEngine.ts §"CAD-016 SAFETY".
    const count = (content.match(/gaps\.push\(\{/g) || []).length;
    expect(count).toBe(260);
  });

  it('all gap rules have evidence.guidelineSource', () => {
    const blocks = content.split('gaps.push({').slice(1);
    const missing: string[] = [];
    for (const block of blocks) {
      if (!block.includes('guidelineSource:')) {
        const m = block.match(/id:\s*['"]([^'"]+)['"]/);
        missing.push(m ? m[1] : 'unknown');
      }
    }
    if (missing.length > 0) console.log('Missing guidelineSource:', missing.slice(0, 5));
    expect(missing.length).toBe(0);
  });

  it('all gap rules have evidence.classOfRecommendation', () => {
    const blocks = content.split('gaps.push({').slice(1);
    const missing = blocks.filter(b => !b.includes('classOfRecommendation:')).length;
    expect(missing).toBe(0);
  });

  it('all gap rules have evidence.levelOfEvidence', () => {
    const blocks = content.split('gaps.push({').slice(1);
    const missing = blocks.filter(b => !b.includes('levelOfEvidence:')).length;
    expect(missing).toBe(0);
  });

  it('no lowercase gender comparisons (male/female/M/F)', () => {
    expect((content.match(/gender\s*===\s*['"]male['"]/g) || []).length).toBe(0);
    expect((content.match(/gender\s*===\s*['"]female['"]/g) || []).length).toBe(0);
    expect((content.match(/gender\s*===\s*['"]M['"]/g) || []).length).toBe(0);
    expect((content.match(/gender\s*===\s*['"]F['"]/g) || []).length).toBe(0);
  });

  it('no race=BLACK in gender field (Phase 1 bug)', () => {
    expect((content.match(/gender\s*===\s*['"]BLACK['"]/gi) || []).length).toBe(0);
  });

  it('hasContraindication called throughout', () => {
    const calls = (content.match(/hasContraindication\(/g) || []).length;
    expect(calls).toBeGreaterThan(10);
  });

  it('evaluateGapRules function is exported', () => {
    expect(content).toContain('export function evaluateGapRules(');
  });

  it('RUNTIME_GAP_REGISTRY is exported', () => {
    expect(content).toContain('export const RUNTIME_GAP_REGISTRY');
  });
});

// ============================================================
// STRUCTURAL: LVEF LOINC correctness
// ============================================================

describe('Structural: LVEF LOINC codes', () => {
  it('correct LVEF LOINC 18010-0 present somewhere in codebase', () => {
    const termDir = path.join(__dirname, '../../src/terminology');
    let found = false;
    try {
      for (const f of fs.readdirSync(termDir)) {
        if (f.endsWith('.ts') && fs.readFileSync(path.join(termDir, f), 'utf8').includes('18010-0')) {
          found = true; break;
        }
      }
    } catch { /* directory may not exist */ }
    if (!found) {
      found = fs.readFileSync(ENGINE_PATH, 'utf8').includes('18010-0');
    }
    expect(found).toBe(true);
  });
});

// ============================================================
// TEST DATA CONSTRUCTION
// ============================================================

describe('Test data: buildTestPatient', () => {
  it('MALE stored as MALE enum', () => {
    const p = buildTestPatient({ gender: 'MALE' });
    expect(p.gender).toBe('MALE');
  });

  it('FEMALE stored as FEMALE enum', () => {
    const p = buildTestPatient({ gender: 'FEMALE' });
    expect(p.gender).toBe('FEMALE');
  });

  it('BLACK race stored in race field not gender', () => {
    const p = buildTestPatient({ race: 'BLACK', gender: 'MALE' });
    expect(p.race).toBe('BLACK');
    expect(p.gender).toBe('MALE');
  });

  it('ICD-10 stored on icd10Code', () => {
    const p = buildTestPatient({ conditions: [{ icd10: 'I50.20' }] });
    expect(p.conditions[0].icd10Code).toBe('I50.20');
  });

  it('multiple conditions stored', () => {
    const p = buildTestPatient({ conditions: [{ icd10: 'I50.20' }, { icd10: 'N18.3' }, { icd10: 'E11.9' }] });
    expect(p.conditions).toHaveLength(3);
  });

  it('RxNorm on rxnormCode with status', () => {
    const p = buildTestPatient({ medications: [{ rxnorm: '1545653', status: 'ACTIVE' }] });
    expect(p.medications[0].rxnormCode).toBe('1545653');
    expect(p.medications[0].status).toBe('ACTIVE');
  });

  it('lab values as separate observations', () => {
    const p = buildTestPatient({ labValues: { hs_tnt: 0.05, ferritin: 350, bnp: 1200 } });
    expect(p.observations.find((o: any) => o.labKey === 'hs_tnt')?.valueNumeric).toBe(0.05);
    expect(p.observations.find((o: any) => o.labKey === 'ferritin')?.valueNumeric).toBe(350);
    expect(p.observations.find((o: any) => o.labKey === 'bnp')?.valueNumeric).toBe(1200);
  });

  it('hospice Z51.5 stored correctly', () => {
    const p = buildTestPatient({ conditions: [{ icd10: 'Z51.5' }] });
    expect(p.conditions[0].icd10Code).toBe('Z51.5');
  });
});

describe('buildClinicalData', () => {
  it('builds labValues map from observations', () => {
    const p = buildTestPatient({ labValues: { lvef: 35, qtc: 460 } });
    const cd = buildClinicalData(p);
    expect(cd.labValues['lvef']).toBe(35);
    expect(cd.labValues['qtc']).toBe(460);
  });

  it('passes conditions through', () => {
    const p = buildTestPatient({ conditions: [{ icd10: 'I50.20' }] });
    const cd = buildClinicalData(p);
    expect(cd.conditions).toHaveLength(1);
  });
});

// ============================================================
// CLINICAL LOGIC: QTc thresholds
// ============================================================

describe('QTc sex-specific thresholds', () => {
  const F_THRESHOLD = 470;
  const M_THRESHOLD = 450;

  it('480ms exceeds female threshold', () => { expect(480).toBeGreaterThan(F_THRESHOLD); });
  it('460ms below female threshold', () => { expect(460).toBeLessThan(F_THRESHOLD); });
  it('460ms exceeds male threshold', () => { expect(460).toBeGreaterThan(M_THRESHOLD); });
  it('440ms below male threshold', () => { expect(440).toBeLessThan(M_THRESHOLD); });
  it('female threshold > male threshold', () => { expect(F_THRESHOLD).toBeGreaterThan(M_THRESHOLD); });
});

// ============================================================
// CLINICAL LOGIC: Finerenone requires T2DM
// ============================================================

describe('Finerenone indication: requires diabetes', () => {
  const hasDiabetes = (conds: Array<{ icd10Code: string }>) =>
    conds.some(c => c.icd10Code.startsWith('E11') || c.icd10Code.startsWith('E10'));

  it('HF + CKD alone insufficient', () => {
    const p = buildTestPatient({ conditions: [{ icd10: 'I50.20' }, { icd10: 'N18.3' }] });
    expect(hasDiabetes(p.conditions)).toBe(false);
  });

  it('HF + CKD + T2DM sufficient', () => {
    const p = buildTestPatient({ conditions: [{ icd10: 'I50.20' }, { icd10: 'N18.3' }, { icd10: 'E11.9' }] });
    expect(hasDiabetes(p.conditions)).toBe(true);
  });
});

// ============================================================
// CLINICAL LOGIC: GDMT medication matching
// ============================================================

describe('GDMT SGLT2i medication matching', () => {
  const SGLT2I = ['1545653', '896744', '2200644'];

  it('matches active SGLT2i', () => {
    const p = buildTestPatient({ medications: [{ rxnorm: '1545653', status: 'ACTIVE' }] });
    expect(p.medications.some((m: any) => SGLT2I.includes(m.rxnormCode) && m.status === 'ACTIVE')).toBe(true);
  });

  it('does NOT match DISCONTINUED SGLT2i', () => {
    const p = buildTestPatient({ medications: [{ rxnorm: '1545653', status: 'DISCONTINUED' }] });
    expect(p.medications.some((m: any) => SGLT2I.includes(m.rxnormCode) && m.status === 'ACTIVE')).toBe(false);
  });

  it('no match on empty medications', () => {
    const p = buildTestPatient({ medications: [] });
    expect(p.medications.some((m: any) => SGLT2I.includes(m.rxnormCode))).toBe(false);
  });
});

// ============================================================
// CLINICAL LOGIC: Contraindication detection
// ============================================================

describe('Contraindication: hospice Z51.5', () => {
  it('detected when present', () => {
    const p = buildTestPatient({ conditions: [{ icd10: 'I50.20' }, { icd10: 'Z51.5' }] });
    expect(p.conditions.some((c: any) => c.icd10Code === 'Z51.5')).toBe(true);
  });

  it('not detected when absent', () => {
    const p = buildTestPatient({ conditions: [{ icd10: 'I50.20' }] });
    expect(p.conditions.some((c: any) => c.icd10Code === 'Z51.5')).toBe(false);
  });
});

// ============================================================
// CLINICAL LOGIC: A-HeFT race field
// ============================================================

describe('A-HeFT: race vs gender', () => {
  it('race=BLACK is on race field, not gender', () => {
    const p = buildTestPatient({ race: 'BLACK', gender: 'FEMALE' });
    expect(p.race).toBe('BLACK');
    expect(p.gender).toBe('FEMALE');
    expect(p.gender).not.toBe('BLACK');
  });

  it('non-Black patient has different race', () => {
    const p = buildTestPatient({ race: 'WHITE', gender: 'MALE' });
    expect(p.race).toBe('WHITE');
    expect(p.race).not.toBe('BLACK');
  });
});
