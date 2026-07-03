/**
 * AUDIT-195 / AUDIT-196 - CAD lipid-intensification consolidation
 *
 * The former separate CAD-EZETIMIBE + CAD-PCSK9 gaps gated on the IDENTICAL population
 * (CAD + on-statin + LDL>70) and double-fired for the same LDL-not-at-goal cohort (exact 2.00x
 * redundancy proven on the demo-synthea-threaded full-population write). They are consolidated into
 * ONE stepwise gap-cad-lipid-intensification that fires once per patient and carries both non-statin
 * add-on options in guideline order (Step 1 ezetimibe, Step 2 PCSK9i). This is consolidation, NOT
 * suppression - the LDL-not-at-goal gap is a real Class-I/2a secondary-prevention item and still
 * fires for the real subset.
 *
 * AUDIT-196: the former gap-cad-ezetimibe mislabeled itself Class 1 LOE A; ezetimibe add-on is
 * COR 2a LOE B-R per the 2018 AHA/ACC Blood Cholesterol Guideline (only the statin is Class 1).
 * The consolidated rule carries Class 2a.
 *
 * evaluateGapRules is pure; no DB. Signature: (dxCodes, labValues, medCodes, age?).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const CAD = ['I25.10'];
const STATIN = '83367'; // atorvastatin
const EZETIMIBE = '341248';
const EVOLOCUMAB = '1665684'; // PCSK9i
const CONSOLIDATED = 'LDL not at goal on statin - intensify lipid therapy';

const intensifyGaps = (labs: Record<string, number>, meds: string[]) =>
  evaluateGapRules(CAD, labs, meds, 65).filter((g) => !!g.status && g.status.includes('intensify lipid therapy'));

describe('AUDIT-195: lipid-intensification consolidation - fires once, both options, edge cases', () => {
  it('fires EXACTLY ONCE for an LDL-not-at-goal patient on statin (was twice: ezetimibe + PCSK9)', () => {
    const gaps = intensifyGaps({ ldl: 120 }, [STATIN]);
    expect(gaps).toHaveLength(1);
  });

  it('the two former separate statuses no longer appear', () => {
    const all = evaluateGapRules(CAD, { ldl: 120 }, [STATIN], 65);
    expect(all.find((g) => g.status?.includes('Consider ezetimibe add-on'))).toBeUndefined();
    expect(all.find((g) => g.status?.includes('Consider PCSK9 inhibitor'))).toBeUndefined();
    expect(all.find((g) => g.status === CONSOLIDATED)).toBeDefined();
  });

  it('carries BOTH stepwise options in guideline order (ezetimibe before PCSK9i)', () => {
    const action = String(intensifyGaps({ ldl: 120 }, [STATIN])[0].recommendations?.action ?? '');
    expect(action).toMatch(/ezetimibe/i);
    expect(action).toMatch(/PCSK9/i);
    // guideline sequence: Step 1 ezetimibe, Step 2 PCSK9i
    expect(action.indexOf('Step 1')).toBeGreaterThanOrEqual(0);
    expect(action.indexOf('Step 1')).toBeLessThan(action.indexOf('Step 2'));
    expect(action.toLowerCase().indexOf('ezetimibe')).toBeLessThan(action.indexOf('PCSK9'));
  });

  it('AUDIT-196: consolidated rule carries COR Class 2a (not the over-stated Class 1)', () => {
    const gap = intensifyGaps({ ldl: 120 }, [STATIN])[0];
    expect(gap.evidence?.classOfRecommendation).toBe('Class 2a');
  });

  // --- Edge cases: consolidation is NOT suppression ---
  it('edge case NEITHER add-on: on statin only -> fires once (was two rows)', () => {
    expect(intensifyGaps({ ldl: 120 }, [STATIN])).toHaveLength(1);
  });

  it('edge case EZETIMIBE-ONLY: on statin + ezetimibe, LDL>70 -> still fires once (Step 2 PCSK9i available)', () => {
    expect(intensifyGaps({ ldl: 120 }, [STATIN, EZETIMIBE])).toHaveLength(1);
  });

  it('edge case BOTH add-ons: on statin + ezetimibe + PCSK9i, LDL>70 -> fires 0 (maximal non-statin therapy)', () => {
    expect(intensifyGaps({ ldl: 120 }, [STATIN, EZETIMIBE, EVOLOCUMAB])).toHaveLength(0);
  });

  it('LDL at goal (<=70) -> does not fire', () => {
    expect(intensifyGaps({ ldl: 65 }, [STATIN])).toHaveLength(0);
  });

  it('not on a statin -> does not fire (guideline gate: on maximally tolerated statin)', () => {
    expect(intensifyGaps({ ldl: 120 }, [])).toHaveLength(0);
  });
});

describe('AUDIT-195: distinct-trigger CAD lipid rules are UNCHANGED (not redundant, not touched)', () => {
  it('icosapent ethyl (elevated triglycerides) still fires', () => {
    const all = evaluateGapRules(CAD, { ldl: 100, triglycerides: 200 }, [STATIN], 65);
    expect(all.find((g) => g.status?.includes('icosapent ethyl'))).toBeDefined();
  });

  it('familial hypercholesterolemia (LDL>=190) still fires', () => {
    const all = evaluateGapRules(CAD, { ldl: 200 }, [STATIN], 65);
    expect(all.find((g) => g.status?.toLowerCase().includes('familial hypercholesterolemia'))).toBeDefined();
  });

  it('lipid panel follow-up (absent-lipid-data existence proxy) still fires, and is orthogonal to the consolidated rule', () => {
    // CAD-LIPID-PANEL-FU fires on ldl===undefined (no panel on file), NOT on a present LDL value.
    const all = evaluateGapRules(CAD, {}, [STATIN], 65);
    expect(all.find((g) => g.status?.includes('lipid panel follow-up'))).toBeDefined();
    // with no LDL value the consolidated intensification rule does NOT fire (orthogonal trigger)
    expect(all.find((g) => g.status === CONSOLIDATED)).toBeUndefined();
  });
});

describe('AUDIT-195: extractCode re-detection-fix proof - the adjacent colchicine rule fires with its own gaps.push', () => {
  // GOTCHA: my first retirement comment started with the PREFIX-NNN token "CAD-PCSK9:" (then the
  // AUDIT-195/196 tags), which extractCode re-detected as a LIVE evaluator block; the phantom block
  // swallowed the NEXT rule's gaps.push (CAD-COLCHICINE), inflating the CAD evaluator count. The fix
  // (plain-word-first retirement comment, AUDIT-182 left-main precedent) restores CAD-COLCHICINE as
  // its own block. This test proves its gaps.push is intact and fires on its real trigger.
  it('CAD-COLCHICINE fires on CAD + elevated CRP, and is suppressed when colchicine (RxNorm 2683) is active', () => {
    const fires = evaluateGapRules(CAD, { crp: 5 }, [], 65)
      .find((g) => g.status?.includes('low-dose colchicine for residual inflammatory risk'));
    expect(fires).toBeDefined();
    const suppressed = evaluateGapRules(CAD, { crp: 5 }, ['2683'], 65)
      .find((g) => g.status?.includes('low-dose colchicine for residual inflammatory risk'));
    expect(suppressed).toBeUndefined();
  });
});
