/**
 * AUDIT-123/124 bioprosthetic-cluster fix (2026-06-17) - Z95.2/Z95.3/Z95.4 valve-type sweep.
 * Verified semantics (NLM ICD-10-CM): Z95.2 = prosthetic heart valve (GENERIC); Z95.3 = xenogenic =
 * definitively BIOPROSTHETIC; Z95.4 = other replacement.
 *  - NEGATIVE guard (AUDIT-124): an isolated Z95.3 bioprosthetic patient must NOT fire the mechanical-valve
 *    warfarin / DOAC-contraindication / INR-monitoring rules (the AUDIT-164 hasMechanicalValve=Z95.2||Z95.4
 *    fix transitively closed the over-anticoagulation bleeding-risk vector).
 *  - POSITIVE guard (AUDIT-123): an isolated Z95.3 bioprosthetic patient DOES fire the bio surveillance /
 *    degeneration / aspirin gaps (the prior predicates wrongly excluded Z95.3).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

const BIO = 'Z95.3';        // xenogenic = bioprosthetic (definitive)
const MECH = 'Z95.2';       // prosthetic, generic (treated as mechanical by the safety-first convention)
const AS = 'I35.0';         // aortic stenosis (post-TAVR context)
const DYSPNEA = 'R06.0';    // new symptom (ViV context)
const WARFARIN = '11289', APIXABAN = '1364430', ASPIRIN = '1191';

// ---- NEGATIVE guard (AUDIT-124): isolated bioprosthetic Z95.3 does NOT fire mechanical-valve rules ----
describe('AUDIT-124 negative guard: Z95.3 bioprosthetic does not fire mechanical-valve rules', () => {
  it('does NOT fire the warfarin-needed (VD-1) gap', () => {
    const g = evaluateGapRules([BIO], {}, [], 70, 'MALE');
    expect(find(g, 'Warfarin not active with mechanical valve')).toBeFalsy();
  });
  it('does NOT fire the DOAC-contraindication SAFETY gap (bioprosthetic + DOAC is fine)', () => {
    const g = evaluateGapRules([BIO], {}, [APIXABAN], 70, 'MALE');
    expect(find(g, 'DOAC detected in mechanical valve patient')).toBeFalsy();
  });
  it('does NOT fire the INR-monitoring (VD-3) gap even on warfarin', () => {
    const g = evaluateGapRules([BIO], {}, [WARFARIN], 70, 'MALE');
    expect(find(g, 'INR monitoring overdue for mechanical valve')).toBeFalsy();
  });
  it('control: a mechanical-coded Z95.2 patient DOES still fire warfarin-needed (safety-first convention)', () => {
    const g = evaluateGapRules([MECH], {}, [], 70, 'MALE');
    expect(find(g, 'Warfarin not active with mechanical valve')).toBeTruthy();
  });
});

// ---- POSITIVE guard (AUDIT-123): isolated Z95.3 fires the bioprosthetic rules ----
describe('AUDIT-123 positive guard: Z95.3 bioprosthetic fires the bio rules', () => {
  it('fires bio echo surveillance (VD-2)', () => {
    const g = evaluateGapRules([BIO], {}, [], 70, 'MALE');
    expect(find(g, 'Echo surveillance overdue for bioprosthetic valve')).toBeTruthy();
  });
  it('fires bio degeneration watch (VD-11) at age>65', () => {
    const g = evaluateGapRules([BIO], {}, [], 70, 'MALE');
    expect(find(g, 'Bioprosthetic valve degeneration monitoring')).toBeTruthy();
  });
});

// ---- aspirin inversion regression (the drug-bearing Z95.3-ONLY gap) ----
describe('AUDIT-123 aspirin inversion regression (Z95.3-only)', () => {
  it('Z95.3 bioprosthetic -> FIRES the aspirin gap (was wrongly excluded by the inverted !Z95.3 logic)', () => {
    const g = evaluateGapRules([BIO], {}, [], 70, 'MALE');
    expect(find(g, 'Consider low-dose aspirin for bioprosthetic valve')).toBeTruthy();
  });
  it('Z95.2 mechanical-coded -> does NOT fire the aspirin gap (never antiplatelet-only a possibly-mechanical valve)', () => {
    const g = evaluateGapRules([MECH], {}, [], 70, 'MALE');
    expect(find(g, 'Consider low-dose aspirin for bioprosthetic valve')).toBeFalsy();
  });
  it('Z95.3 already on aspirin -> gated', () => {
    const g = evaluateGapRules([BIO], {}, [ASPIRIN], 70, 'MALE');
    expect(find(g, 'Consider low-dose aspirin for bioprosthetic valve')).toBeFalsy();
  });
});

// ---- post-TAVR (SH-011) + valve-in-valve (SH-061) ----
describe('AUDIT-123 post-TAVR + ViV', () => {
  it('post-TAVR (SH-6): Z95.3 + aortic stenosis history -> fires follow-up', () => {
    const g = evaluateGapRules([BIO, AS], {}, [], 75, 'MALE');
    expect(find(g, 'Post-TAVR follow-up')).toBeTruthy();
  });
  it('ViV (SH-061): Z95.3 + new symptoms -> fires', () => {
    const g = evaluateGapRules([BIO, DYSPNEA], {}, [], 75, 'MALE');
    expect(find(g, 'valve-in-valve TAVR evaluation')).toBeTruthy();
  });
  it('ViV must NOT false-fire on a mechanical-coded Z95.2 valve (Z95.3-only)', () => {
    const g = evaluateGapRules([MECH, DYSPNEA], {}, [], 75, 'MALE');
    expect(find(g, 'valve-in-valve TAVR evaluation')).toBeFalsy();
  });
});
