/**
 * v3.0 VHD buildout chunk 3 (2026-06-17) - mechanical/bioprosthetic anticoagulation + the INR slug-fix.
 * The AUDIT-170 slug-fix threads INR (LOINC 34714-6 -> 'inr') so the INR-VALUE rules read it. AUDIT-133 = the
 * sub-therapeutic-INR gap (VHD-001). AUDIT-135 = the therapy-absent guard on VD-14 dental prophylaxis.
 * RxCUIs: warfarin 11289, aspirin 1191, amoxicillin 723, apixaban 1364430.
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

const MECH = 'Z95.2';   // prosthetic valve, generic -> treated as mechanical
const CAD = 'I25.10';   // atherosclerotic heart disease
const DENTAL = 'Z01.20'; // encounter for dental examination
const WARFARIN = '11289', ASA = '1191', AMOX = '723', APIXABAN = '1364430';

// ---- VHD-001: mechanical valve sub-therapeutic INR (AUDIT-133, reads the slug-fixed INR) ----
describe('VHD-001 mechanical valve sub-therapeutic INR', () => {
  it('fires: mechanical valve + warfarin + INR 1.5 (<2.0)', () => {
    const g = evaluateGapRules([MECH], { inr: 1.5 }, [WARFARIN], 70, 'MALE');
    expect(find(g, 'sub-therapeutic INR: warfarin management gap')).toBeTruthy();
  });
  it('gate: therapeutic INR (2.5)', () => {
    const g = evaluateGapRules([MECH], { inr: 2.5 }, [WARFARIN], 70, 'MALE');
    expect(find(g, 'sub-therapeutic INR: warfarin management gap')).toBeFalsy();
  });
  it('gate: not on warfarin', () => {
    const g = evaluateGapRules([MECH], { inr: 1.5 }, [], 70, 'MALE');
    expect(find(g, 'sub-therapeutic INR: warfarin management gap')).toBeFalsy();
  });
  it('null Path-B: INR not threaded -> does not fire', () => {
    const g = evaluateGapRules([MECH], {}, [WARFARIN], 70, 'MALE');
    expect(find(g, 'sub-therapeutic INR: warfarin management gap')).toBeFalsy();
  });
  it('subgroup: note documents the valve-position-dependent target (Path-B)', () => {
    const gap = find(evaluateGapRules([MECH], { inr: 1.5 }, [WARFARIN], 70, 'MALE'), 'sub-therapeutic INR: warfarin management gap');
    expect(gap.recommendations.note).toContain('position');
  });
});

// ---- VHD-006: mechanical valve + atherosclerotic disease without ASA adjunct ----
describe('VHD-006 mechanical valve ASA adjunct', () => {
  it('fires: mech + warfarin + CAD + no ASA', () => {
    const g = evaluateGapRules([MECH, CAD], {}, [WARFARIN], 72, 'MALE');
    expect(find(g, 'without low-dose ASA adjunct')).toBeTruthy();
  });
  it('gate: already on aspirin', () => {
    const g = evaluateGapRules([MECH, CAD], {}, [WARFARIN, ASA], 72, 'MALE');
    expect(find(g, 'without low-dose ASA adjunct')).toBeFalsy();
  });
  it('gate: no atherosclerotic disease (the "when indicated" qualifier)', () => {
    const g = evaluateGapRules([MECH], {}, [WARFARIN], 72, 'MALE');
    expect(find(g, 'without low-dose ASA adjunct')).toBeFalsy();
  });
});

// ---- VD-14 AUDIT-135: dental prophylaxis therapy-absent guard ----
describe('VD-14 dental prophylaxis (AUDIT-135 therapy-absent guard)', () => {
  it('still fires: prosthetic valve + dental + no prophylaxis abx', () => {
    const g = evaluateGapRules([MECH, DENTAL], {}, [], 60, 'MALE');
    expect(find(g, 'Dental prophylaxis antibiotic recommended for review')).toBeTruthy();
  });
  it('AUDIT-135 gate: already on amoxicillin -> does NOT fire (was over-firing on treated patients)', () => {
    const g = evaluateGapRules([MECH, DENTAL], {}, [AMOX], 60, 'MALE');
    expect(find(g, 'Dental prophylaxis antibiotic recommended for review')).toBeFalsy();
  });
});

// ---- VHD-005 confirm: mechanical-valve DOAC-contraindication SAFETY subgroup (VD-6, not re-authored) ----
describe('VHD-005 mechanical-valve DOAC contraindication (SAFETY subgroup, VD-6)', () => {
  it('fires: mechanical valve + DOAC -> contraindication SAFETY gap (warfarin-not-DOAC)', () => {
    const g = evaluateGapRules([MECH], {}, [APIXABAN], 65, 'MALE');
    expect(find(g, 'DOAC detected in mechanical valve patient')).toBeTruthy();
  });
});
