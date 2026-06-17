/**
 * v3.0 SH buildout chunk 4 (2026-06-17) - Aortic syndromes + genetic-syndrome dx - evaluator tests.
 * ICD-10-CM all section-16-verified vs NLM Clinical Tables: Marfan Q87.40/41x, Turner Q96, vascular EDS Q79.63,
 * bicuspid Q23.81, type-B dissection I71.012/I71.03, malperfusion K55.0x/N17/I74.3-5. Threaded dimension:
 * ascending_aorta (cm). SH-053 (Loeys-Dietz, no ICD) + SH-073 (descending dimension not threaded) DEFERRED.
 * RxCUIs: carvedilol 20352 (BB), losartan 52175 (ARB), atorvastatin 83367 (statin), celiprolol 20498.
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

const MARFAN = 'Q87.40';
const MARFAN_DIL = 'Q87.410';   // Marfan with aortic dilation
const TURNER = 'Q96.9';
const VEDS = 'Q79.63';
const BICUSPID = 'Q23.81';
const TYPEB = 'I71.012';        // dissection of descending thoracic aorta (Type B)
const TYPEB_TAA = 'I71.03';     // thoracoabdominal
const TYPEA = 'I71.010';        // dissection of ascending aorta (Type A - must NOT fire type-B rules)
const MESENTERIC = 'K55.011';   // acute mesenteric ischemia (malperfusion)
const BB = '20352', ARB = '52175', STATIN = '83367', CELIPROLOL = '20498';

// ---- SH-052: Marfan -> BB or ARB ----
describe('SH-052 Marfan aortic dilation -> BB/ARB', () => {
  it('fires: Marfan + aortic dilation dx, not on BB/ARB', () => {
    const g = evaluateGapRules([MARFAN, MARFAN_DIL], {}, [], 30, 'MALE');
    expect(find(g, 'Marfan with aortic dilation not on beta-blocker or ARB')).toBeTruthy();
  });
  it('fires via threaded ascending_aorta >=4.0', () => {
    const g = evaluateGapRules([MARFAN], { ascending_aorta: 4.3 }, [], 30, 'MALE');
    expect(find(g, 'Marfan with aortic dilation not on beta-blocker or ARB')).toBeTruthy();
  });
  it('gates: on a beta-blocker (carvedilol)', () => {
    const g = evaluateGapRules([MARFAN, MARFAN_DIL], {}, [BB], 30, 'MALE');
    expect(find(g, 'Marfan with aortic dilation not on beta-blocker or ARB')).toBeFalsy();
  });
  it('gates: on an ARB (losartan)', () => {
    const g = evaluateGapRules([MARFAN, MARFAN_DIL], {}, [ARB], 30, 'MALE');
    expect(find(g, 'Marfan with aortic dilation not on beta-blocker or ARB')).toBeFalsy();
  });
  it('Path-B gate: Marfan but NO dilation signal -> does NOT fire', () => {
    const g = evaluateGapRules([MARFAN], { ascending_aorta: 3.5 }, [], 30, 'MALE');
    expect(find(g, 'Marfan with aortic dilation not on beta-blocker or ARB')).toBeFalsy();
  });
});

// ---- SH-072: ascending aorta intervention threshold (SUBGROUP-AWARE) ----
describe('SH-072 ascending aorta intervention threshold - subgroup-aware', () => {
  it('non-syndromic: fires at 5.5, gates at 5.2', () => {
    expect(find(evaluateGapRules([], { ascending_aorta: 5.6 }, [], 65, 'MALE'), 'intervention threshold: surgical evaluation gap')).toBeTruthy();
    expect(find(evaluateGapRules([], { ascending_aorta: 5.2 }, [], 65, 'MALE'), 'intervention threshold: surgical evaluation gap')).toBeFalsy();
  });
  it('Marfan: lower 5.0 threshold fires at 5.1 (non-syndromic would NOT)', () => {
    const g = evaluateGapRules([MARFAN], { ascending_aorta: 5.1 }, [], 35, 'MALE');
    const gap = find(g, 'intervention threshold: surgical evaluation gap');
    expect(gap).toBeTruthy();
    expect(gap.status).toContain('Marfan');
  });
  it('Marfan: gates below 5.0 (4.8)', () => {
    expect(find(evaluateGapRules([MARFAN], { ascending_aorta: 4.8 }, [], 35, 'MALE'), 'intervention threshold')).toBeFalsy();
  });
  it('bicuspid: 5.5 threshold, status names the subgroup', () => {
    const gap = find(evaluateGapRules([BICUSPID], { ascending_aorta: 5.6 }, [], 60, 'MALE'), 'intervention threshold: surgical evaluation gap');
    expect(gap).toBeTruthy();
    expect(gap.status).toContain('bicuspid');
  });
  it('null Path-B: no ascending_aorta -> does NOT fire', () => {
    expect(find(evaluateGapRules([MARFAN], {}, [], 35, 'MALE'), 'intervention threshold')).toBeFalsy();
  });
});

// ---- SH-074 / SH-075: type-B dissection OMT vs TEVAR (malperfusion partition) ----
describe('SH-074 / SH-075 type-B dissection - complicated partition', () => {
  it('SH-074 fires: uncomplicated type-B not on full OMT', () => {
    const g = evaluateGapRules([TYPEB], {}, [], 60, 'MALE');
    expect(find(g, 'Uncomplicated type-B aortic dissection not on optimal medical therapy')).toBeTruthy();
  });
  it('SH-074 gates: on BB + statin (OMT proxy satisfied)', () => {
    const g = evaluateGapRules([TYPEB], {}, [BB, STATIN], 60, 'MALE');
    expect(find(g, 'Uncomplicated type-B aortic dissection not on optimal medical therapy')).toBeFalsy();
  });
  it('SH-075 fires: complicated (malperfusion) type-B -> TEVAR; SH-074 does NOT', () => {
    const g = evaluateGapRules([TYPEB, MESENTERIC], {}, [], 60, 'MALE');
    expect(find(g, 'urgent TEVAR evaluation gap')).toBeTruthy();
    expect(find(g, 'Uncomplicated type-B aortic dissection not on optimal medical therapy')).toBeFalsy();
  });
  it('thoracoabdominal (I71.03) also counts as type-B', () => {
    expect(find(evaluateGapRules([TYPEB_TAA], {}, [], 60, 'MALE'), 'Uncomplicated type-B')).toBeTruthy();
  });
  it('Type-A (ascending I71.010) does NOT fire type-B rules', () => {
    const g = evaluateGapRules([TYPEA, MESENTERIC], {}, [], 60, 'MALE');
    expect(find(g, 'Uncomplicated type-B')).toBeFalsy();
    expect(find(g, 'urgent TEVAR evaluation gap')).toBeFalsy();
  });
  it('SH-075 names TEVAR but cites no CPT numeral', () => {
    const gap = find(evaluateGapRules([TYPEB, MESENTERIC], {}, [], 60, 'MALE'), 'urgent TEVAR evaluation gap');
    expect(gap.recommendations.action).toContain('TEVAR');
    expect(gap.recommendations.action).not.toMatch(/338\d\d/);
  });
});

// ---- SH-054: Turner surveillance ----
describe('SH-054 Turner syndrome surveillance', () => {
  it('fires: Turner with no echo data on file', () => {
    const g = evaluateGapRules([TURNER], {}, [], 25, 'FEMALE');
    expect(find(g, 'Turner syndrome without cardiac surveillance on file')).toBeTruthy();
  });
  it('gates: Turner with echo data present (LVEF on file)', () => {
    const g = evaluateGapRules([TURNER], { lvef: 60 }, [], 25, 'FEMALE');
    expect(find(g, 'Turner syndrome without cardiac surveillance on file')).toBeFalsy();
  });
});

// ---- SH-055: vascular EDS -> celiprolol ----
describe('SH-055 vascular EDS -> celiprolol + surveillance', () => {
  it('fires: vEDS not on celiprolol', () => {
    const g = evaluateGapRules([VEDS], {}, [], 35, 'FEMALE');
    expect(find(g, 'Vascular Ehlers-Danlos not on celiprolol')).toBeTruthy();
  });
  it('gates: on celiprolol', () => {
    const g = evaluateGapRules([VEDS], {}, [CELIPROLOL], 35, 'FEMALE');
    expect(find(g, 'Vascular Ehlers-Danlos not on celiprolol')).toBeFalsy();
  });
  it('routing: classical EDS (Q79.61) does NOT fire the vascular-EDS rule', () => {
    const g = evaluateGapRules(['Q79.61'], {}, [], 35, 'FEMALE');
    expect(find(g, 'Vascular Ehlers-Danlos not on celiprolol')).toBeFalsy();
  });
});
