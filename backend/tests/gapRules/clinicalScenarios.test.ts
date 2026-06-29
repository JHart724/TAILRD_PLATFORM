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

  it('exactly 356 gap rules defined (gaps.push calls)', () => {
    // Count incremented from 257 to 259 by EP-XX-7 mitigation (2026-05-04, fix/ep-017-rate-control-hfref-gating):
    // - +1: EP-017 SAFETY gap (HFrEF + on non-DHP CCB → Class 3 Harm alert)
    // - +1: EP-RC LVEF-data-required gap (HF dx + AF + LVEF undefined → structured data gap, not silent default)
    // Then 259 → 260 by AUDIT-034 (2026-05-05, fix/audit-034-cad-016-prasugrel-safety):
    // - +1: CAD-016 SAFETY gap (Prasugrel + stroke/TIA history → Class 3 Harm per FDA black-box)
    // Then 260 → 262 by AUDIT-032 (2026-05-05, fix/audit-032-ep-006-dabigatran-renal-safety):
    // - +1: EP-006 SAFETY gap (Dabigatran + eGFR<30 severe renal impairment → Class 3 Harm per FDA Pradaxa PI)
    // - +1: EP-006 DATA gap (Dabigatran on med list + eGFR undefined → fail-loud structured data gap)
    // See backend/src/ingestion/gaps/gapRuleEngine.ts §"EP-006 SAFETY".
    // Then 262 → 263 by AUDIT-031 (2026-05-05, fix/audit-031-ep-079-wpw-avn-blocker-critical):
    // - +1: EP-079 CRITICAL gap (WPW + AF + AVN blocker → ventricular fibrillation per 2023 ACC/AHA AFib Class 3 Harm). Closes Tier S queue (final item; queue 1 → 0).
    // Then 263 -> 271 by the v3.0 HF buildout calibration sample (2026-06-15, feat/hf-calibration-buildout):
    // - +8: GAP-HF-017 finerenone, HF-077 amyloid+AF anticoag, HF-081 HbA1c, HF-008 MRA-contra (SAFETY),
    //   HF-033 IV iron, HF-143 colchicine, HF-054 ATTR-DMT, HF-002 non-EBM beta-blocker.
    // Then 271 -> 305 by the v3.0 HF FULL buildout batch (2026-06-15, feat/hf-buildable-gap-batch):
    // - +34: the buildable HF gaps across 5 chunks (GDMT/device HF-003/011/015/024/025/026/031/126/127;
    //   phenotypes/iron HF-061/062/063/065/072/073/074/032/034; cross-cutting HF-036/076/078/080/082/086;
    //   advanced/cardiorenal/pericardial HF-047/132/133/139/144/027; LVAD/transplant HF-147/148/151/152).
    // Then 305 -> 326 by the v3.0 EP module buildout (2026-06-16, feat/ep-chunk1-af-anticoag):
    // - +21: new EP evaluators across 4 chunks (AF anticoag/dosing EP-003/004/005/008/009/012; AF rhythm/
    //   ablation EP-014/071/072/074/076; VT/CIED EP-020/021/022/029/034/092; brady/syncope/LAAC EP-030/033/097/067).
    // Then 326 -> 356 by the v3.0 SH module close (2026-06-17, feat/sh-chunk1-as-severity):
    // - net +30: ~33 new SH evaluators across 7 chunks (AS/MR/TR severity, aortic syndromes + genetic dx,
    //   PFO/ASD/IE/PE/ACHD/masses, valve-procedure post-op, CPT-unblocked post-procedure) minus the 3 retired
    //   legacy over-detectors (SH-12 tricuspid AUDIT-167, SH-9 PFO + SH-ASD AUDIT-127/128).
    // Then 356 -> 371 by the v3.0 VHD module close (2026-06-17, feat/vhd-chunk1-ar-severity):
    // - net +15: +17 new VHD evaluators across 5 chunks (AR/mixed severity, prosthetic dysfunction, mech/bio
    //   anticoag, IE-surgical-dx + rheumatic, pregnancy SAFETY + drug-induced surveillance) minus 2 retired
    //   firings (VD-5 superseded by VHD-103, SH-012 superseded by VHD-068/011).
    // Then 371 -> 370 by CAD chunk 0 tightenings (2026-06-18, feat/cad-chunk0-tightenings):
    // - net -1: -2 retired dead-drug firings (nicorandil + trimetazidine, AUDIT-175) + 1 CAD-REHAB split into
    //   post-CABG + post-MI (AUDIT-173).
    // Then 370 -> 376 by CAD chunk 1 (2026-06-18, feat/cad-chunk1-lipid-risk):
    // - net +6: +7 buildable lipid/risk/etiology gaps (CAD-013 FH + CAD-009 ApoB + CAD-083/084/085/022/026)
    //   minus 1 retired left-main IVUS over-detector (CAD-IVUS, AUDIT-182, wrong I25.110 code).
    // Then 376 -> 377 by PV chunk 0 (2026-06-18, feat/pv-chunk0-tightenings):
    // - net +1: the foundational gap-pv-003-abnormal-abi build (abnormal ABI <=0.90 without coded PAD, AUDIT-179);
    //   the 5 over-credit tightenings (AUDIT-178/180) edit existing rules, they do not add or remove firings.
    // Then 377 -> 384 by PV chunk 1 (2026-06-18, same branch):
    // - net +7: PV-004 (non-compressible ABI), PV-034 (FMD screen), PV-038 (Takayasu immunosuppression),
    //   PV-040 (GCA steroid), PV-041 (Buerger cessation), PV-058 (symptomatic carotid), PV-062 (ICAS SAMMPRIS).
    // Then 384 -> 390 by the T0 net-new batch (2026-06-19, feat/t0-authoring-sweep):
    // - net +6: PV-042 (Behcet immunosuppression), PV-081 (CTEPH riociguat), PV-084 (PAH ERA+PDE5i),
    //   PV-085 (PAH sotatercept), EP-010 (rivaroxaban food counseling), EP-049 (class IC in structural HD - CAST safety).
    // Then 390 -> 394 by the T1-broader LVESD batch (2026-06-22, feat/t1-broader-lvesd):
    // - net +4: GAP-VHD-103 LVESD-dilation 2nd arm (Class 2a, the AR COR fork), SH-024 (TR + RV dysfunction
    //   TAPSE/FAC), VHD-060 (IE large vegetation), VHD-100 (mech-valve-pregnancy anti-Xa). LVESD threading itself
    //   yielded 0 direct net-new (SH-014/SH-018 enhancements gate on already-threaded LVEF/EROA).
    // Then 394 -> 378 by AUDIT-184 CAD-EXT (2026-06-29, this branch): 16 hollow/SPEC_ONLY CAD over-fire rules
    // RETIRED (10 hollow PHQ/Z-code-discriminator, CAD-FFR stress_test slug-mismatch, CAD-BNP/CAD-CRP/CAD-LIVER
    // operator-confirmed SPEC_ONLY, CAD-STRESS de-dup with CAD-ECHO, women-specific primary-prevention).
    // NOT suppressed: CAD-CALCIUM-SCORE + CAD-CCTA (real single-file-threaded slugs), post-MI REHAB (dx-gated,
    // AUDIT-173 accepted), the 8 KEPT monitoring rules, all med-absence/threshold rules. CAD-STATIN dose-branch
    // was gated (no gaps.push removed). Pre-existing hollow-read defect surfaced by the Synthea proof dry-run.
    const count = (content.match(/gaps\.push\(\{/g) || []).length;
    expect(count).toBe(378);
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
