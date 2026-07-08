/**
 * AUDIT-197 - CAD-ISCHEMIA-GUIDED presence-as-proxy defect RETIRED to SPEC_ONLY.
 *
 * The rule gated hasModerateIschemia = labValues['stress_test_months'] !== undefined - treating the mere
 * EXISTENCE of a stress test as evidence of moderate ischemia (test-presence != disease-presence). Moderate
 * ischemia is a RESULT finding (abnormal stress result / ischemic burden), Synthea-absent / real-EHR-only,
 * so there is no honest gate; retired to SPEC_ONLY. This test proves it no longer fires, and that the
 * adjacent rules survive (section-5.4 swallow guard + the legitimate CAD-NUCLEAR-STRESS fire-on-absence).
 *
 * evaluateGapRules is pure. Signature (dxCodes, labValues, medCodes, age).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const has = (dx: string[], labs: Record<string, number>, frag: string) =>
  evaluateGapRules(dx, labs, [], 65).some(g => g.status && g.status.includes(frag));

describe('AUDIT-197: CAD-ISCHEMIA-GUIDED retired (presence-as-proxy defect removed)', () => {
  it('does NOT fire even for a stable-angina patient WITH a stress test on record (the former false-positive path)', () => {
    // dx I25.11 (stable angina) + stress_test_months present = the exact input that used to fire on test-presence
    expect(has(['I25.11'], { stress_test_months: 6 }, 'ischemia-guided therapy review')).toBe(false);
    expect(has(['I20.8'], { stress_test_months: 3 }, 'ischemia-guided therapy review')).toBe(false);
  });
});

describe('AUDIT-197: section-5.4 swallow guard - the adjacent rule still fires', () => {
  it('CAD-MINOCA (immediately follows the retired block) still fires with its own gaps.push', () => {
    // MI (I21) + MINOCA (I24) -> MINOCA workup gap
    expect(has(['I21.4', 'I24.0'], {}, 'MINOCA comprehensive workup')).toBe(true);
  });
});

describe('AUDIT-197: CAD-NUCLEAR-STRESS is UNTOUCHED (legitimate fire-on-absence care-gap)', () => {
  it('still fires for an intermediate-risk CAD patient with NO stress test on record (stress_test_months undefined)', () => {
    expect(has(['I25.10'], { ascvd_risk: 12 }, 'nuclear stress test for intermediate-risk')).toBe(true);
  });
  it('does NOT fire when a stress test IS on record (noRecentStress false) - the absence-gate still discriminates', () => {
    expect(has(['I25.10'], { ascvd_risk: 12, stress_test_months: 4 }, 'nuclear stress test for intermediate-risk')).toBe(false);
  });
});
