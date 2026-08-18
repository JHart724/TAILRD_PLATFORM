/**
 * T3 valve batch (2026-06-22, feat/t3-valve-cpt-vhd040). VHD-040 - the one genuine CPT-only DET_OK that is
 * buildable TODAY: it detects "valve surgery occurred" via the prosthetic-valve dx (Z95.2/3/4, threaded) and
 * "CABG present" via Z95.1 (the engine's existing CABG signal), so it needs NO valve-CPT sourcing. VHD-037/038
 * (concomitant Maze/AtriClip) are staged pending the section-16.7 CPT two-key (operator clinical-confirm).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], frag: string) =>
  gaps.find((g) => typeof g.status === 'string' && g.status.includes(frag));

const BIO_VALVE = 'Z95.3';   // xenogenic (bioprosthetic) heart valve presence
const MECH_VALVE = 'Z95.2';  // mechanical prosthetic valve presence
const CAD = 'I25.10';
const CABG = 'Z95.1';        // aortocoronary bypass status
const PCI = 'Z95.5';         // coronary angioplasty/stent status
const FRAG = 'without coded revascularization';

describe('VHD-040 prosthetic valve + CAD without revascularization', () => {
  it('fires: prosthetic valve (Z95.3) + CAD + no CABG/PCI', () => {
    expect(find(evaluateGapRules([BIO_VALVE, CAD], {}, [], 70, 'MALE'), FRAG)).toBeTruthy();
  });
  it('fires: mechanical valve (Z95.2) + CAD + no revasc', () => {
    expect(find(evaluateGapRules([MECH_VALVE, CAD], {}, [], 68, 'MALE'), FRAG)).toBeTruthy();
  });
  it('gate: prior CABG (Z95.1) present does NOT fire (revascularized)', () => {
    expect(find(evaluateGapRules([BIO_VALVE, CAD, CABG], {}, [], 70, 'MALE'), FRAG)).toBeFalsy();
  });
  it('gate: prior PCI (Z95.5) present does NOT fire (revascularized)', () => {
    expect(find(evaluateGapRules([BIO_VALVE, CAD, PCI], {}, [], 70, 'MALE'), FRAG)).toBeFalsy();
  });
  it('gate: prosthetic valve WITHOUT CAD does NOT fire', () => {
    expect(find(evaluateGapRules([BIO_VALVE], {}, [], 70, 'MALE'), FRAG)).toBeFalsy();
  });
  it('null: CAD without a prosthetic valve does NOT fire', () => {
    expect(find(evaluateGapRules([CAD], {}, [], 70, 'MALE'), FRAG)).toBeFalsy();
  });
});
