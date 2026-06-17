/**
 * v3.0 SH buildout chunk 3 (2026-06-17) - Tricuspid regurgitation severity - evaluator tests.
 * Reads the now-threaded TR severity (echo-severity unlock PR #404 + chunk-3 LOINC map-add): tr_regurg_grade
 * (0-4, 4=severe) / valve_severity (0-5, 5=severe). SH-022 is the AUDIT-125 tightening (severity gate added to
 * the prior dx+symptom over-detector SH-4). SH-069 (no-lead) and SH-023 (CIED-lead) are the mutually-exclusive
 * device-selection layers; coaptation-gap morphology is Path-B (not threaded).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

const TR = 'I36.1';      // nonrheumatic tricuspid (valve) insufficiency
const EDEMA = 'R60.0';   // localized edema (right-heart congestion / NYHA II+ proxy)
const ICD_LEAD = 'Z95.810'; // presence of automatic implantable cardiac defibrillator
const PACER = 'Z95.0';   // presence of cardiac pacemaker

// ---- SH-022: severe symptomatic TR -> transcatheter eval (AUDIT-125 tightened) ----
describe('SH-022 severe symptomatic TR -> transcatheter evaluation', () => {
  it('fires: severe TR (tr_regurg_grade 4) + congestion', () => {
    const g = evaluateGapRules([TR, EDEMA], { tr_regurg_grade: 4 }, [], 72, 'MALE');
    expect(find(g, 'transcatheter tricuspid (T-TEER/TTVR) evaluation gap')).toBeTruthy();
  });
  it('fires: severe via valve_severity 5 + congestion', () => {
    const g = evaluateGapRules([TR, EDEMA], { valve_severity: 5 }, [], 72, 'MALE');
    expect(find(g, 'transcatheter tricuspid (T-TEER/TTVR) evaluation gap')).toBeTruthy();
  });
  it('AUDIT-125 regression: I36.1 + edema but NO TR severity -> does NOT fire (old SH-4 over-detector did)', () => {
    const g = evaluateGapRules([TR, EDEMA], {}, [], 72, 'MALE');
    expect(find(g, 'transcatheter tricuspid (T-TEER/TTVR) evaluation gap')).toBeFalsy();
  });
  it('gates: severe TR but asymptomatic (no congestion dx) -> does NOT fire', () => {
    const g = evaluateGapRules([TR], { tr_regurg_grade: 4 }, [], 72, 'MALE');
    expect(find(g, 'transcatheter tricuspid (T-TEER/TTVR) evaluation gap')).toBeFalsy();
  });
  it('gates: moderate TR (tr_regurg_grade 2) -> does NOT fire', () => {
    const g = evaluateGapRules([TR, EDEMA], { tr_regurg_grade: 2 }, [], 72, 'MALE');
    expect(find(g, 'transcatheter tricuspid (T-TEER/TTVR) evaluation gap')).toBeFalsy();
  });
  it('gates: hospice excluded', () => {
    const g = evaluateGapRules([TR, EDEMA, 'Z51.5'], { tr_regurg_grade: 4 }, [], 72, 'MALE');
    expect(find(g, 'transcatheter tricuspid (T-TEER/TTVR) evaluation gap')).toBeFalsy();
  });
});

// ---- SH-069 / SH-023: mutually-exclusive device-selection partition (lead presence) ----
describe('SH-069 / SH-023 device-selection partition by CIED lead', () => {
  it('NO lead: SH-069 (Evoque TTVR) fires; SH-023 (lead-status) does NOT', () => {
    const g = evaluateGapRules([TR, EDEMA], { tr_regurg_grade: 4 }, [], 72, 'MALE');
    expect(find(g, 'Evoque TTVR (TRISCEND) candidacy')).toBeTruthy();
    expect(find(g, 'device selection requires lead-status')).toBeFalsy();
  });
  it('ICD lead present: SH-023 (lead-status) fires; SH-069 does NOT', () => {
    const g = evaluateGapRules([TR, EDEMA, ICD_LEAD], { valve_severity: 5 }, [], 72, 'MALE');
    expect(find(g, 'device selection requires lead-status')).toBeTruthy();
    expect(find(g, 'Evoque TTVR (TRISCEND) candidacy')).toBeFalsy();
  });
  it('pacemaker lead present: SH-023 fires (Z95.0)', () => {
    const g = evaluateGapRules([TR, EDEMA, PACER], { tr_regurg_grade: 4 }, [], 72, 'MALE');
    expect(find(g, 'device selection requires lead-status')).toBeTruthy();
  });
  it('the device layer requires severe TR + symptoms (does not fire on mild TR + lead)', () => {
    const g = evaluateGapRules([TR, EDEMA, ICD_LEAD], { tr_regurg_grade: 2 }, [], 72, 'MALE');
    expect(find(g, 'device selection requires lead-status')).toBeFalsy();
    expect(find(g, 'Evoque TTVR (TRISCEND) candidacy')).toBeFalsy();
  });
  it('SH-022 always layers under exactly one device gap (no-lead severe symptomatic)', () => {
    const g = evaluateGapRules([TR, EDEMA], { tr_regurg_grade: 4 }, [], 72, 'MALE');
    expect(find(g, 'transcatheter tricuspid (T-TEER/TTVR) evaluation gap')).toBeTruthy();
    const deviceGaps = [
      find(g, 'Evoque TTVR (TRISCEND) candidacy'),
      find(g, 'device selection requires lead-status'),
    ].filter(Boolean);
    expect(deviceGaps.length).toBe(1);
  });
});
