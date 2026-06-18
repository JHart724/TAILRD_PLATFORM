/**
 * CAD chunk 1 batch (2026-06-18) - ApoB threading + build (CAD-009) + the special-etiology/device/polyvascular
 * remainder (CAD-083/084/085/022/026). CAD-071 (left main) is Path-B: no chronic-left-main ICD-10 code exists
 * (I25.110 = ASHD + unstable angina, NOT left main - AUDIT-182).
 */
import fs from 'fs';
import path from 'path';
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';
import { ECHO_LOINC_TO_SLUG } from '../../src/services/observationService';

const find = (gaps: any[], frag: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(frag));

const CAD = 'I25.10', ATORVASTATIN = '83367', ASPIRIN = '1191';
const RADIATION = 'Z92.3', TAKAYASU = 'M31.4', PAN = 'M30.0', COCAINE = 'F14.10';
const MI_ACUTE = 'I21.4', MI_OLD = 'I25.2', PAD = 'I70.211', CVD = 'I63.9';
const UNSTABLE_ANGINA = 'I25.110'; // ASHD + unstable angina - the code CAD-IVUS wrongly treated as left-main

// ---- AUDIT-182: CAD-IVUS left-main over-detector retired ----
describe('AUDIT-182 CAD-IVUS I25.110-as-left-main over-fire closed', () => {
  it('regression: I25.110 (unstable angina) does NOT fire a left-main IVUS recommendation', () => {
    expect(find(evaluateGapRules([UNSTABLE_ANGINA], {}, [], 65, 'MALE'), 'intravascular imaging for left main')).toBeFalsy();
  });
});

// ---- ApoB threading (AUDIT-181, both paths) ----
describe('AUDIT-181 ApoB threading (FHIR + CSV)', () => {
  it('FHIR: LOINC 1884-6 -> apob slug', () => {
    expect(ECHO_LOINC_TO_SLUG['1884-6']).toBe('apob');
  });
  it('CSV: patientWriter allow-list + csvSchema carry apob', () => {
    const pw = fs.readFileSync(path.join(__dirname, '../../src/ingestion/patientWriter.ts'), 'utf8');
    const csv = fs.readFileSync(path.join(__dirname, '../../src/ingestion/csvSchema.ts'), 'utf8');
    expect(pw).toContain("'apob'");
    expect(csv).toContain("name: 'apob'");
  });
});

// ---- CAD-009 ApoB residual-risk (now DET_OK) ----
describe('CAD-009 ApoB residual-risk', () => {
  it('fires: CAD + on statin + ApoB 110 (>=90)', () => {
    expect(find(evaluateGapRules([CAD], { apob: 110 }, [ATORVASTATIN], 60, 'MALE'), 'Elevated apolipoprotein B')).toBeTruthy();
  });
  it('gate: ApoB 80 (<90) does NOT fire', () => {
    expect(find(evaluateGapRules([CAD], { apob: 80 }, [ATORVASTATIN], 60, 'MALE'), 'Elevated apolipoprotein B')).toBeFalsy();
  });
  it('gate (on-treatment marker): not on statin does NOT fire', () => {
    expect(find(evaluateGapRules([CAD], { apob: 110 }, [], 60, 'MALE'), 'Elevated apolipoprotein B')).toBeFalsy();
  });
  it('null Path-B: ApoB absent does NOT fire', () => {
    expect(find(evaluateGapRules([CAD], {}, [ATORVASTATIN], 60, 'MALE'), 'Elevated apolipoprotein B')).toBeFalsy();
  });
});

// ---- CAD-083 radiation CAD ----
describe('CAD-083 radiation-induced CAD', () => {
  it('fires: Z92.3 + CAD', () => {
    expect(find(evaluateGapRules([CAD, RADIATION], {}, [], 60, 'FEMALE'), 'Radiation-induced coronary disease')).toBeTruthy();
  });
  it('gate: no radiation history', () => {
    expect(find(evaluateGapRules([CAD], {}, [], 60, 'FEMALE'), 'Radiation-induced coronary disease')).toBeFalsy();
  });
});

// ---- CAD-084 vasculitis CAD ----
describe('CAD-084 vasculitis-associated CAD', () => {
  it('fires: Takayasu (M31.4) + CAD', () => {
    expect(find(evaluateGapRules([CAD, TAKAYASU], {}, [], 45, 'FEMALE'), 'Vasculitis-associated coronary disease')).toBeTruthy();
  });
  it('fires: PAN (M30.0) + CAD', () => {
    expect(find(evaluateGapRules([CAD, PAN], {}, [], 55, 'MALE'), 'Vasculitis-associated coronary disease')).toBeTruthy();
  });
  it('gate: no vasculitis', () => {
    expect(find(evaluateGapRules([CAD], {}, [], 55, 'MALE'), 'Vasculitis-associated coronary disease')).toBeFalsy();
  });
});

// ---- CAD-085 stimulant CAD (SAFETY: BB caution) ----
describe('CAD-085 stimulant-associated CAD (BB-caution SAFETY)', () => {
  it('fires: cocaine (F14) + CAD -> SAFETY_ALERT', () => {
    const g = find(evaluateGapRules([CAD, COCAINE], {}, [], 40, 'MALE'), 'Stimulant-associated coronary disease');
    expect(g).toBeTruthy();
    expect(g.type).toBe('SAFETY_ALERT');
  });
  it('SAFETY subgroup: recommendation cautions beta-blockers, does NOT blanket them', () => {
    const g = find(evaluateGapRules([CAD, COCAINE], {}, [], 40, 'MALE'), 'Stimulant-associated coronary disease');
    expect(g.recommendations.action).toContain('beta-blockers are cautioned');
    expect(g.recommendations.note).toContain('do NOT blanket-recommend a beta-blocker');
  });
  it('gate: stimulant use without CAD or angina', () => {
    expect(find(evaluateGapRules([COCAINE], {}, [], 40, 'MALE'), 'Stimulant-associated coronary disease')).toBeFalsy();
  });
});

// ---- CAD-022 post-MI ICD ----
describe('CAD-022 post-MI primary-prevention ICD', () => {
  it('fires: acute MI (I21) + LVEF 30 (<=35)', () => {
    expect(find(evaluateGapRules([MI_ACUTE], { lvef: 30 }, [], 62, 'MALE'), 'primary-prevention ICD evaluation gap')).toBeTruthy();
  });
  it('fires: old MI (I25.2) + LVEF 35', () => {
    expect(find(evaluateGapRules([MI_OLD], { lvef: 35 }, [], 62, 'MALE'), 'primary-prevention ICD evaluation gap')).toBeTruthy();
  });
  it('gate: LVEF 50 (>35) does NOT fire', () => {
    expect(find(evaluateGapRules([MI_ACUTE], { lvef: 50 }, [], 62, 'MALE'), 'primary-prevention ICD evaluation gap')).toBeFalsy();
  });
  it('subgroup: note documents the >=40-day waiting period (Path-B timing)', () => {
    const g = find(evaluateGapRules([MI_ACUTE], { lvef: 30 }, [], 62, 'MALE'), 'primary-prevention ICD evaluation gap');
    expect(g.recommendations.note).toContain('40-day');
  });
});

// ---- CAD-026 polyvascular (3-territory) + CAD-027 overlap ----
describe('CAD-026 polyvascular 3-territory', () => {
  it('fires: CAD + PAD + cerebrovascular (3 beds)', () => {
    expect(find(evaluateGapRules([CAD, PAD, CVD], {}, [], 70, 'MALE'), 'Polyvascular disease (3 territories)')).toBeTruthy();
  });
  it('gate: CAD + PAD only (2 beds) does NOT fire (needs 3 territories)', () => {
    expect(find(evaluateGapRules([CAD, PAD], {}, [], 70, 'MALE'), 'Polyvascular disease (3 territories)')).toBeFalsy();
  });
  it('overlap reconciled: 3-bed + aspirin/no-rivaroxaban -> CAD-026 fires AND the COMPASS rivaroxaban gap co-fires (complementary, not redundant)', () => {
    const g = evaluateGapRules([CAD, PAD, CVD], {}, [ASPIRIN], 70, 'MALE');
    expect(find(g, 'Polyvascular disease (3 territories)')).toBeTruthy();
    expect(find(g, 'rivaroxaban')).toBeTruthy(); // CAD-027 / PV-RIVAROXABAN - the drug-specific axis, owned separately
  });
});
