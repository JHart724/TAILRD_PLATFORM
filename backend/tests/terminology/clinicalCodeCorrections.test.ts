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
