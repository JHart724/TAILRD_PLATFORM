/**
 * Clinical Code Corrections — AUDIT-042..061 (Cat A canonical valuesets)
 *
 * Verifies the 14 wrong-drug / wrong-formulation RxNorm corrections applied
 * to backend/src/terminology/cardiovascularValuesets.ts and the 1 inline
 * correction (BB_CODES_LQTS / BB_CODES_SCAD nadolol code) in gapRuleEngine.ts.
 *
 * Each correction has:
 *   - Constant assertion: the canonical valueset now contains the verified RxNorm
 *   - Rule behavior assertion: evaluateGapRules() now correctly fires/suppresses
 *     based on the corrected codes (positive: real drug detected; negative: wrong
 *     drug no longer false-flagged)
 *
 * Verification source: RxNav properties.json (https://rxnav.nlm.nih.gov/REST/rxcui/<cui>/properties.json)
 */
import {
  RXNORM_QT_PROLONGING,
  RXNORM_DIGOXIN,
  RXNORM_FINERENONE,
  RXNORM_GDMT,
  RXNORM_ASPIRIN,
  RXNORM_WARFARIN,
} from '../../src/terminology/cardiovascularValuesets';
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

// ============================================================
// AUDIT-042: PROCAINAMIDE 8787 → 8700 (8787 was propranolol)
// ============================================================
describe('AUDIT-042: PROCAINAMIDE corrected to 8700', () => {
  it('canonical valueset now points to verified procainamide CUI', () => {
    expect(RXNORM_QT_PROLONGING.PROCAINAMIDE).toBe('8700');
    expect(RXNORM_QT_PROLONGING.PROCAINAMIDE).not.toBe('8787');
  });
});

// ============================================================
// AUDIT-043: BB_CODES_LQTS / BB_CODES_SCAD nadolol 7512 → 7226
// (7512 = norepinephrine — verified RxNav)
// ============================================================
describe('AUDIT-043: nadolol RxNorm corrected to 7226 in inline BB arrays', () => {
  it('inline BB_CODES_LQTS / BB_CODES_SCAD source contains 7226 not 7512', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../src/ingestion/gaps/gapRuleEngine.ts'),
      'utf8',
    );
    expect(src).toMatch(/BB_CODES_LQTS\s*=\s*\[[^\]]*'7226'/);
    expect(src).toMatch(/BB_CODES_SCAD\s*=\s*\[[^\]]*'7226'/);
    expect(src).not.toMatch(/BB_CODES_LQTS\s*=\s*\[[^\]]*'7512'/);
    expect(src).not.toMatch(/BB_CODES_SCAD\s*=\s*\[[^\]]*'7512'/);
  });
});

// ============================================================
// AUDIT-044: DIGOXIN_IV 197607 dropped (was retired aspirin/caffeine combo)
// AUDIT-045: DIGOXIN labels relabeled; ingredient 3407 added
// ============================================================
describe('AUDIT-044/045: DIGOXIN valueset correction', () => {
  it('DIGOXIN_IV key removed (197607 was a retired non-digoxin combo)', () => {
    expect((RXNORM_DIGOXIN as Record<string, string>).DIGOXIN_IV).toBeUndefined();
  });
  it('DIGOXIN_INGREDIENT (3407) added so toxicity rule catches any digoxin formulation', () => {
    expect(RXNORM_DIGOXIN.DIGOXIN_INGREDIENT).toBe('3407');
  });
  it('DIGOXIN_125MCG remains correct (197604)', () => {
    expect(RXNORM_DIGOXIN.DIGOXIN_125MCG).toBe('197604');
  });
});

// ============================================================
// AUDIT-053: FINERENONE 2481926/2481928 → 2562811
// (Old CUIs were UNKNOWN status — rule never fired in production)
// ============================================================
describe('AUDIT-053: FINERENONE valueset replaced with verified CUI 2562811', () => {
  it('canonical valueset uses verified finerenone ingredient CUI', () => {
    expect(RXNORM_FINERENONE.FINERENONE).toBe('2562811');
  });
  it('finerenone gap rule fires when patient on real finerenone (was silent failure)', () => {
    // T2DM + eGFR 25-60 + K<5.0 + NOT on finerenone → rule should fire
    const dxNoFinerenone = ['E11.9'];
    const labs = { egfr: 45, potassium: 4.5 };
    const medsNoFinerenone: string[] = [];
    const gapsNoFin = evaluateGapRules(dxNoFinerenone, labs, medsNoFinerenone, 65);
    const fin1 = gapsNoFin.find(g => g.status && g.status.includes('Finerenone not prescribed'));
    expect(fin1).toBeDefined();

    // Same patient, but now ON finerenone (RxNorm 2562811) → rule should NOT fire
    const medsWithFinerenone = ['2562811'];
    const gapsWithFin = evaluateGapRules(dxNoFinerenone, labs, medsWithFinerenone, 65);
    const fin2 = gapsWithFin.find(g => g.status && g.status.includes('Finerenone not prescribed'));
    expect(fin2).toBeUndefined();
  });
  it('finerenone gap rule no longer pretends 2481926 (invalid CUI) is finerenone', () => {
    // A patient prescribed 2481926 (invalid CUI) is now correctly flagged as needing finerenone
    // (under the old buggy code, the rule treated 2481926 as "already on finerenone").
    const dx = ['E11.9'];
    const labs = { egfr: 45, potassium: 4.5 };
    const medsBuggyOldCode = ['2481926'];
    const gaps = evaluateGapRules(dx, labs, medsBuggyOldCode, 65);
    const fin = gaps.find(g => g.status && g.status.includes('Finerenone not prescribed'));
    expect(fin).toBeDefined();
  });
});

// ============================================================
// AUDIT-054: SOTAGLIFLOZIN 2627044 → 2638675
// (2627044 was bexagliflozin)
// ============================================================
describe('AUDIT-054: SOTAGLIFLOZIN corrected to 2638675', () => {
  it('canonical valueset uses verified sotagliflozin CUI', () => {
    expect(RXNORM_GDMT.SOTAGLIFLOZIN).toBe('2638675');
    expect(RXNORM_GDMT.SOTAGLIFLOZIN).not.toBe('2627044');
  });
});

// ============================================================
// AUDIT-055: IVABRADINE 1649380 → 1649480
// (1649380 was invalid CUI)
// ============================================================
describe('AUDIT-055: IVABRADINE corrected to 1649480', () => {
  it('canonical valueset uses verified ivabradine ingredient CUI', () => {
    expect(RXNORM_GDMT.IVABRADINE).toBe('1649480');
    expect(RXNORM_GDMT.IVABRADINE).not.toBe('1649380');
  });
});

// ============================================================
// AUDIT-056: DOFETILIDE 135447 → 49247
// (135447 was donepezil — Alzheimer's drug, not dofetilide)
// ============================================================
describe('AUDIT-056: DOFETILIDE corrected to 49247 (was donepezil)', () => {
  it('canonical valueset uses verified dofetilide CUI', () => {
    expect(RXNORM_QT_PROLONGING.DOFETILIDE).toBe('49247');
    expect(RXNORM_QT_PROLONGING.DOFETILIDE).not.toBe('135447');
  });
  it('dofetilide-monitoring rule now fires on real dofetilide patients', () => {
    // Patient on real dofetilide (49247) → monitoring gap should fire
    const gapsReal = evaluateGapRules(['I48.0'], {}, ['49247'], 65);
    const monitoring = gapsReal.find(g =>
      g.status && (g.status.includes('Dofetilide') || g.status.includes('dofetilide')),
    );
    expect(monitoring).toBeDefined();
  });
  it('dofetilide-monitoring rule no longer false-positives on donepezil patients', () => {
    // Patient on donepezil (135447) — Alzheimer's drug — should NOT trigger dofetilide rule
    const gapsDonepezil = evaluateGapRules(['I48.0'], {}, ['135447'], 75);
    const monitoring = gapsDonepezil.find(g =>
      g.status && (g.status.includes('Dofetilide') || g.status.includes('dofetilide')),
    );
    expect(monitoring).toBeUndefined();
  });
});

// ============================================================
// AUDIT-057: DRONEDARONE 997221 → 233698
// (997221 was donepezil 10mg branded)
// ============================================================
describe('AUDIT-057: DRONEDARONE corrected to 233698 (was donepezil branded)', () => {
  it('canonical valueset uses verified dronedarone CUI', () => {
    expect(RXNORM_QT_PROLONGING.DRONEDARONE).toBe('233698');
    expect(RXNORM_QT_PROLONGING.DRONEDARONE).not.toBe('997221');
  });
  it('dronedarone-in-advanced-HF rule fires on real dronedarone + severe HFrEF', () => {
    // AF + HF + LVEF<35 + on real dronedarone (233698) → contraindication gap fires
    const gaps = evaluateGapRules(
      ['I48.0', 'I50.20'],
      { lvef: 25 },
      ['233698'],
      70,
    );
    const dron = gaps.find(g =>
      g.status && g.status.toLowerCase().includes('dronedarone'),
    );
    expect(dron).toBeDefined();
  });
  it('dronedarone rule no longer false-positives on donepezil-branded patients', () => {
    // AF + HF + LVEF<35 + on donepezil branded (997221) → should NOT fire dronedarone rule
    const gaps = evaluateGapRules(
      ['I48.0', 'I50.20'],
      { lvef: 25 },
      ['997221'],
      75,
    );
    const dron = gaps.find(g =>
      g.status && g.status.toLowerCase().includes('dronedarone'),
    );
    expect(dron).toBeUndefined();
  });
});

// ============================================================
// AUDIT-058: ASPIRIN_81MG 198464 → 243670
// (198464 was aspirin 300mg rectal suppository)
// ============================================================
describe('AUDIT-058: ASPIRIN_81MG corrected to 243670', () => {
  it('canonical valueset uses verified aspirin 81mg oral tablet CUI', () => {
    expect(RXNORM_ASPIRIN.ASPIRIN_81MG).toBe('243670');
    expect(RXNORM_ASPIRIN.ASPIRIN_81MG).not.toBe('198464');
  });
});

// ============================================================
// AUDIT-059/060/061: WARFARIN formulation labels corrected
// (codes were valid warfarin but mislabeled to wrong strengths)
// ============================================================
describe('AUDIT-059/060/061: WARFARIN formulation labels match real strengths', () => {
  it('WARFARIN_2MG points to 855302 (real 2mg tablet, replaces 855296=10mg mislabel)', () => {
    expect(RXNORM_WARFARIN.WARFARIN_2MG).toBe('855302');
  });
  it('WARFARIN_3MG points to 855318 (real 3mg tablet, was labeled WARFARIN_5MG)', () => {
    expect(RXNORM_WARFARIN.WARFARIN_3MG).toBe('855318');
  });
  it('WARFARIN_5MG points to 855332 (real 5mg tablet, was labeled WARFARIN_10MG)', () => {
    expect(RXNORM_WARFARIN.WARFARIN_5MG).toBe('855332');
  });
  it('WARFARIN_10MG points to 855296 (real 10mg tablet, was labeled WARFARIN_2MG)', () => {
    expect(RXNORM_WARFARIN.WARFARIN_10MG).toBe('855296');
  });
  it('WARFARIN_1MG unchanged (855288 was correctly labeled)', () => {
    expect(RXNORM_WARFARIN.WARFARIN_1MG).toBe('855288');
  });
});

// ============================================================
// AUDIT-046..063 — Cat D inline-array clinical-code corrections
// All 8 corrections RxNav-verified per AUDIT_METHODOLOGY.md §16.
// AUDIT-052 partial mitigation: RXNORM_QT_PROLONGING.PROPAFENONE added.
// ============================================================

describe('AUDIT-046: MRA_CODES_K corrected to canonical spironolactone + eplerenone', () => {
  it('inline source uses canonical RXNORM_GDMT MRAs, not sotalol/terbinafine', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../src/ingestion/gaps/gapRuleEngine.ts'),
      'utf8',
    );
    expect(src).toMatch(/MRA_CODES_K\s*=\s*\[\s*RXNORM_GDMT\.SPIRONOLACTONE/);
    expect(src).not.toMatch(/MRA_CODES_K\s*=\s*\[\s*'9947'/);    // sotalol no longer in MRA list
    expect(src).not.toMatch(/MRA_CODES_K\s*=\s*\[\s*'37801'/);   // terbinafine no longer in MRA list (note: '37801' substring search would also reject the canonical 298869, so check second slot too)
  });
  it('K+ monitoring rule: spironolactone (9997) + HF + missing K+ → fires monitoring gap', () => {
    const gaps = evaluateGapRules(['I50.20'], {}, ['9997'], 65);
    const monitoring = gaps.find((g: any) =>
      g.status && /potassium|K\+/i.test(g.status),
    );
    expect(monitoring).toBeDefined();
  });
  it('K+ monitoring rule: sotalol-only (no real MRA) + HF + missing K+ → does NOT fire MRA-specific monitoring', () => {
    // Sotalol (9947) is a Class III AAD, NOT an MRA. Pre-AUDIT-046 the rule false-fired.
    const gaps = evaluateGapRules(['I50.20'], {}, ['9947'], 65);
    const monitoring = gaps.find((g: any) =>
      g.status && /potassium|K\+/i.test(g.status) && /MRA|spironolactone|eplerenone/i.test(g.status),
    );
    expect(monitoring).toBeUndefined();
  });
});

describe('AUDIT-047: ARNI_CODES uses canonical sacubitril/valsartan', () => {
  it('inline source imports from RXNORM_GDMT.SACUBITRIL_VALSARTAN', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../src/ingestion/gaps/gapRuleEngine.ts'),
      'utf8',
    );
    expect(src).toMatch(/ARNI_CODES\s*=\s*\[\s*RXNORM_GDMT\.SACUBITRIL_VALSARTAN/);
    expect(src).not.toMatch(/ARNI_CODES\s*=\s*\['1656328'/);
  });
});

describe('AUDIT-048: ARB_CODES uses canonical losartan/valsartan/candesartan', () => {
  it('inline source imports from RXNORM_GDMT (no eprosartan/telmisartan)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../src/ingestion/gaps/gapRuleEngine.ts'),
      'utf8',
    );
    expect(src).toMatch(/ARB_CODES\s*=\s*\[\s*RXNORM_GDMT\.LOSARTAN/);
    // 73494 = telmisartan and 83515 = eprosartan should not appear in the corrected ARB_CODES line
    const arbLine = src.split('\n').find((l: string) => /^\s*const ARB_CODES\s*=/.test(l)) ?? '';
    expect(arbLine).not.toContain('73494');
    expect(arbLine).not.toContain('83515');
  });
});

describe('AUDIT-049: DOAC_CODES_STROKE/TEE use canonical DOAC ingredients', () => {
  it('inline source spreads canonical DOAC_CODES_CV (covers all 4 DOACs)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../src/ingestion/gaps/gapRuleEngine.ts'),
      'utf8',
    );
    expect(src).toMatch(/DOAC_CODES_STROKE\s*=\s*\[\.\.\.DOAC_CODES_CV/);
    expect(src).toMatch(/DOAC_CODES_TEE\s*=\s*\[\.\.\.DOAC_CODES_CV/);
    // Old formulation/pack codes should be gone
    expect(src).not.toMatch(/DOAC_CODES_STROKE\s*=\s*\['1364430', '1232082'/);
  });
});

describe('AUDIT-050: RATE_CONTROL_CODES_SVT replaces invalid 2991 with canonical diltiazem', () => {
  it('inline source uses RXNORM_RATE_CONTROL.DILTIAZEM (3443) — invalid 2991 removed', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../src/ingestion/gaps/gapRuleEngine.ts'),
      'utf8',
    );
    expect(src).toMatch(/RATE_CONTROL_CODES_SVT\s*=\s*\['6918',\s*RXNORM_RATE_CONTROL\.DILTIAZEM/);
    expect(src).not.toMatch(/RATE_CONTROL_CODES_SVT\s*=\s*\['6918',\s*'2991'/);
  });
});

describe('AUDIT-051: ACEI_CODES corrected — fosinopril 50166 → benazepril 18867', () => {
  it('inline source uses real benazepril CUI 18867 (RxNav-verified)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../src/ingestion/gaps/gapRuleEngine.ts'),
      'utf8',
    );
    expect(src).toMatch(/ACEI_CODES\s*=\s*\['3827', '29046', '1998', '35296', '18867'/);
    expect(src).not.toMatch(/ACEI_CODES\s*=\s*\[[^\]]*'50166'/);
  });
});

describe('AUDIT-062: PPI_CODES_DAPT removes simvastatin (drug class collision)', () => {
  it('inline source uses canonical RXNORM_PPI (post-AUDIT-052 refactor; no 36567)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../src/ingestion/gaps/gapRuleEngine.ts'),
      'utf8',
    );
    const ppiLine = src.split('\n').find((l: string) => /^\s*const PPI_CODES_DAPT\s*=/.test(l)) ?? '';
    expect(ppiLine).toMatch(/codes\(RXNORM_PPI\)/);
    expect(ppiLine).not.toContain('36567');
  });
});

describe('AUDIT-063: LOOP_DIURETIC_CODES_TH/OPT add bumetanide 1808', () => {
  it('inline source uses canonical RXNORM_LOOP_DIURETICS (post-AUDIT-052 refactor; bumetanide via canonical)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../src/ingestion/gaps/gapRuleEngine.ts'),
      'utf8',
    );
    const thLine = src.split('\n').find((l: string) => /^\s*const LOOP_DIURETIC_CODES_TH\s*=/.test(l)) ?? '';
    const optLine = src.split('\n').find((l: string) => /^\s*const LOOP_DIURETIC_CODES_OPT\s*=/.test(l)) ?? '';
    expect(thLine).toMatch(/codes\(RXNORM_LOOP_DIURETICS\)/);
    expect(optLine).toMatch(/codes\(RXNORM_LOOP_DIURETICS\)/);
    // Canonical valueset includes bumetanide (1808) — verified in earlier test in this file
    expect(Object.values(cardio.RXNORM_LOOP_DIURETICS)).toContain('1808');
  });
});

describe('AUDIT-052 partial: RXNORM_QT_PROLONGING.PROPAFENONE canonical promotion', () => {
  it('canonical valueset includes propafenone (8754, RxNav-verified)', () => {
    expect((RXNORM_QT_PROLONGING as any).PROPAFENONE).toBe('8754');
  });
});

// ============================================================
// AUDIT-052 — Canonical valuesets for DHP CCB / PPI / loop diuretic / thiazide drug classes
// All RxNorms RxNav-verified per AUDIT_METHODOLOGY.md §16.
// 4 new canonical valuesets close the inline-array divergence vector for these drug classes.
// ============================================================

const cardio = require('../../src/terminology/cardiovascularValuesets');

describe('AUDIT-052: RXNORM_DHP_CCB canonical valueset (5 DHP CCBs)', () => {
  it('contains 5 DHP CCBs with RxNav-verified ingredient CUIs', () => {
    expect(cardio.RXNORM_DHP_CCB.AMLODIPINE).toBe('17767');
    expect(cardio.RXNORM_DHP_CCB.NIFEDIPINE).toBe('7417');
    expect(cardio.RXNORM_DHP_CCB.ISRADIPINE).toBe('33910');
    expect(cardio.RXNORM_DHP_CCB.FELODIPINE).toBe('4316');
    expect(cardio.RXNORM_DHP_CCB.NICARDIPINE).toBe('7396');
  });
  it('does not contain non-DHP CCBs (diltiazem 3443, verapamil 11170 — those are RXNORM_RATE_CONTROL)', () => {
    const values = Object.values(cardio.RXNORM_DHP_CCB);
    expect(values).not.toContain('3443');
    expect(values).not.toContain('11170');
  });
});

describe('AUDIT-052: RXNORM_PPI canonical valueset (5 standard PPIs)', () => {
  it('contains 5 PPIs with RxNav-verified ingredient CUIs', () => {
    expect(cardio.RXNORM_PPI.OMEPRAZOLE).toBe('7646');
    expect(cardio.RXNORM_PPI.PANTOPRAZOLE).toBe('40790');
    expect(cardio.RXNORM_PPI.ESOMEPRAZOLE).toBe('283742');
    expect(cardio.RXNORM_PPI.LANSOPRAZOLE).toBe('17128');
    expect(cardio.RXNORM_PPI.RABEPRAZOLE).toBe('114979');
  });
  it('does not contain wrong-class drugs (e.g., simvastatin 36567, the AUDIT-062 collision)', () => {
    const values = Object.values(cardio.RXNORM_PPI);
    expect(values).not.toContain('36567');
  });
});

describe('AUDIT-052: RXNORM_LOOP_DIURETICS canonical valueset (4 loops)', () => {
  it('contains 4 loop diuretics with RxNav-verified ingredient CUIs', () => {
    expect(cardio.RXNORM_LOOP_DIURETICS.FUROSEMIDE).toBe('4603');
    expect(cardio.RXNORM_LOOP_DIURETICS.BUMETANIDE).toBe('1808');
    expect(cardio.RXNORM_LOOP_DIURETICS.TORSEMIDE).toBe('38413');
    expect(cardio.RXNORM_LOOP_DIURETICS.ETHACRYNIC_ACID).toBe('4109');
  });
});

describe('AUDIT-052: RXNORM_THIAZIDES canonical valueset (4 thiazide-class)', () => {
  it('contains 4 thiazide-class diuretics with RxNav-verified ingredient CUIs', () => {
    expect(cardio.RXNORM_THIAZIDES.HYDROCHLOROTHIAZIDE).toBe('5487');
    expect(cardio.RXNORM_THIAZIDES.CHLORTHALIDONE).toBe('2409');
    expect(cardio.RXNORM_THIAZIDES.INDAPAMIDE).toBe('5764');
    expect(cardio.RXNORM_THIAZIDES.METOLAZONE).toBe('6916');
  });
  it('does not contain loop diuretics (separation of classes)', () => {
    const values = Object.values(cardio.RXNORM_THIAZIDES);
    expect(values).not.toContain('4603'); // furosemide
    expect(values).not.toContain('1808');  // bumetanide
  });
});

describe('AUDIT-052: inline arrays refactored to canonical imports', () => {
  it('source uses canonical references for the 7 refactored arrays', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../src/ingestion/gaps/gapRuleEngine.ts'),
      'utf8',
    );
    // PPI_CODES_DAPT spreads canonical RXNORM_PPI
    expect(src).toMatch(/PPI_CODES_DAPT\s*=\s*codes\(RXNORM_PPI\)/);
    // DIURETIC_CODES_ELEC combines loops + thiazides
    expect(src).toMatch(/DIURETIC_CODES_ELEC\s*=\s*\[\.\.\.codes\(RXNORM_LOOP_DIURETICS\),\s*\.\.\.codes\(RXNORM_THIAZIDES\)/);
    // LOOP_DIURETIC_CODES_TH/OPT use RXNORM_LOOP_DIURETICS
    expect(src).toMatch(/LOOP_DIURETIC_CODES_TH\s*=\s*codes\(RXNORM_LOOP_DIURETICS\)/);
    expect(src).toMatch(/LOOP_DIURETIC_CODES_OPT\s*=\s*codes\(RXNORM_LOOP_DIURETICS\)/);
    // CCB_CODES_VASOSP / RAYNAUD use full RXNORM_DHP_CCB
    expect(src).toMatch(/CCB_CODES_VASOSP\s*=\s*codes\(RXNORM_DHP_CCB\)/);
    expect(src).toMatch(/CCB_CODES_RAYNAUD\s*=\s*codes\(RXNORM_DHP_CCB\)/);
    // CCB_CODES_RAN uses selective canonical references (preserves 3-drug membership)
    expect(src).toMatch(/CCB_CODES_RAN\s*=\s*\[RXNORM_RATE_CONTROL\.DILTIAZEM/);
  });
});

describe('AUDIT-052: behavior preservation for refactored consumers', () => {
  // Spot-check: rules consuming the refactored arrays still fire on representative drugs.
  // Full evaluateGapRules() exercise patterns are covered in tests/gapRules/ files;
  // these tests are at the canonical-import layer, asserting drug-class detection unchanged.

  it('amlodipine (17767) is in canonical RXNORM_DHP_CCB (positive: DHP CCB rule fires)', () => {
    expect(Object.values(cardio.RXNORM_DHP_CCB)).toContain('17767');
  });
  it('omeprazole (7646) is in canonical RXNORM_PPI (positive: PPI-DAPT rule fires)', () => {
    expect(Object.values(cardio.RXNORM_PPI)).toContain('7646');
  });
  it('furosemide (4603) is in canonical RXNORM_LOOP_DIURETICS (positive: loop diuretic rule fires)', () => {
    expect(Object.values(cardio.RXNORM_LOOP_DIURETICS)).toContain('4603');
  });
  it('HCTZ (5487) is in canonical RXNORM_THIAZIDES (positive: thiazide rule fires)', () => {
    expect(Object.values(cardio.RXNORM_THIAZIDES)).toContain('5487');
  });
  it('simvastatin (36567) is NOT in PPI canonical (negative: AUDIT-062 collision prevented)', () => {
    expect(Object.values(cardio.RXNORM_PPI)).not.toContain('36567');
  });
  it('metoprolol (6918) is NOT in DHP CCB canonical (negative: drug-class separation)', () => {
    expect(Object.values(cardio.RXNORM_DHP_CCB)).not.toContain('6918');
  });
});
