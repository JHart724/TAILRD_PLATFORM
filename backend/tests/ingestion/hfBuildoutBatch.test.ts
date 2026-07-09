/**
 * v3.0 HF buildout batch (2026-06-15) - evaluator tests.
 * Per gap: positive (fires) + negative (gates). Authored in subcategory chunks;
 * full green-bar runs once at batch end. Med gaps construct medCodes at ingredient
 * granularity (the runner ingredient-expands before calling the engine).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const HF = 'I50.20'; // chronic systolic (HFrEF) heart failure
const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

// ---- CHUNK 1: GDMT + Device Therapy ----

describe('HF-003 BB below target dose', () => {
  it('kept-suppressed (AUDIT-199-B-BB): carvedilol 12.5 (<50) does NOT fire pending BID/total-daily handling', () => {
    // Post-AUDIT-199-B doseValue is parsed, so this rule would otherwise activate; AUDIT_199B_DOSE_RULE_SUPPRESSED
    // keeps it dose-unknown-suppressed (per-tablet mg vs total-daily target + BID not threaded).
    const g = evaluateGapRules([HF], { lvef: 30, heart_rate: 70, systolic_bp: 120 }, ['20352'], 60, 'MALE', undefined,
      [{ rxNormCode: '20352', doseValue: 12.5 }]);
    expect(find(g, 'beta-blocker below target dose')).toBeFalsy();
  });
  it('gates: carvedilol at target 50', () => {
    const g = evaluateGapRules([HF], { lvef: 30, heart_rate: 70, systolic_bp: 120 }, ['20352'], 60, 'MALE', undefined,
      [{ rxNormCode: '20352', doseValue: 50 }]);
    expect(find(g, 'beta-blocker below target dose')).toBeFalsy();
  });
  it('gates: SBP<100 (no uptitration headroom)', () => {
    const g = evaluateGapRules([HF], { lvef: 30, heart_rate: 70, systolic_bp: 95 }, ['20352'], 60, 'MALE', undefined,
      [{ rxNormCode: '20352', doseValue: 12.5 }]);
    expect(find(g, 'beta-blocker below target dose')).toBeFalsy();
  });
});

describe('HF-011 SGLT2i deferred below eGFR floor', () => {
  it('fires: HF + eGFR 15 + no SGLT2i', () => {
    const g = evaluateGapRules([HF], { egfr: 15 }, [], 60);
    expect(find(g, 'SGLT2i initiation deferred')).toBeTruthy();
  });
  it('gates: eGFR 30 (above floor)', () => {
    const g = evaluateGapRules([HF], { egfr: 30 }, [], 60);
    expect(find(g, 'SGLT2i initiation deferred')).toBeFalsy();
  });
  it('gates: already on dapagliflozin', () => {
    const g = evaluateGapRules([HF], { egfr: 15 }, ['1488564'], 60);
    expect(find(g, 'SGLT2i initiation deferred')).toBeFalsy();
  });
});

describe('HF-015 high-dose digoxin elderly + CKD', () => {
  it('kept-suppressed (AUDIT-199-B-DIG): age 80 + eGFR 40 + digoxin 0.25 does NOT fire pending tablet-vs-daily/mcg handling', () => {
    // Post-AUDIT-199-B doseValue is parsed; AUDIT_199B_DOSE_RULE_SUPPRESSED keeps digoxin suppressed until the
    // mcg/mg + tablet-vs-daily threshold is re-confirmed at the rule.
    const g = evaluateGapRules([HF], { egfr: 40 }, ['3407'], 80, 'FEMALE', undefined,
      [{ rxNormCode: '3407', doseValue: 0.25 }]);
    expect(find(g, 'high-dose digoxin')).toBeFalsy();
  });
  it('gates: digoxin 0.125 (at safe dose)', () => {
    const g = evaluateGapRules([HF], { egfr: 40 }, ['3407'], 80, 'FEMALE', undefined,
      [{ rxNormCode: '3407', doseValue: 0.125 }]);
    expect(find(g, 'high-dose digoxin')).toBeFalsy();
  });
  it('gates: age 60 (not elderly)', () => {
    const g = evaluateGapRules([HF], { egfr: 40 }, ['3407'], 60, 'FEMALE', undefined,
      [{ rxNormCode: '3407', doseValue: 0.25 }]);
    expect(find(g, 'high-dose digoxin')).toBeFalsy();
  });
});

describe('HF-024 ICD primary prevention - ischemic', () => {
  it('fires: ischemic LVEF 30 on BB+RAASi, no ICD', () => {
    const g = evaluateGapRules([HF, 'I21.9'], { lvef: 30 }, ['20352', '29046'], 65);
    expect(find(g, 'ICD eligibility (ischemic')).toBeTruthy();
  });
  it('gates: existing ICD (Z95.810)', () => {
    const g = evaluateGapRules([HF, 'I21.9', 'Z95.810'], { lvef: 30 }, ['20352', '29046'], 65);
    expect(find(g, 'ICD eligibility (ischemic')).toBeFalsy();
  });
  it('gates: LVEF 40 (>35)', () => {
    const g = evaluateGapRules([HF, 'I21.9'], { lvef: 40 }, ['20352', '29046'], 65);
    expect(find(g, 'ICD eligibility (ischemic')).toBeFalsy();
  });
  it('gates: Pattern-C duration <3mo (recent BB start-date)', () => {
    const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const g = evaluateGapRules([HF, 'I21.9'], { lvef: 30 }, ['20352', '29046'], 65, 'MALE', undefined,
      [{ rxNormCode: '20352', startDate: recent }]);
    expect(find(g, 'ICD eligibility (ischemic')).toBeFalsy();
  });
  it('fires: Pattern-C duration >=3mo (old BB start-date)', () => {
    const g = evaluateGapRules([HF, 'I21.9'], { lvef: 30 }, ['20352', '29046'], 65, 'MALE', undefined,
      [{ rxNormCode: '20352', startDate: '2020-01-01' }]);
    expect(find(g, 'ICD eligibility (ischemic')).toBeTruthy();
  });
});

describe('HF-025 ICD primary prevention - NICM', () => {
  it('fires: NICM (I42.0) LVEF 30 on BB+RAASi, no ischemic, no ICD', () => {
    const g = evaluateGapRules([HF, 'I42.0'], { lvef: 30 }, ['20352', '29046'], 55);
    expect(find(g, 'ICD eligibility (non-ischemic')).toBeTruthy();
  });
  it('fires: NICM scoped to I42.9 (unspecified CM) per operator ruling', () => {
    const g = evaluateGapRules([HF, 'I42.9'], { lvef: 30 }, ['20352', '29046'], 55);
    expect(find(g, 'ICD eligibility (non-ischemic')).toBeTruthy();
  });
  it('gates: HCM (I42.1) is not NICM-dilated', () => {
    const g = evaluateGapRules([HF, 'I42.1'], { lvef: 30 }, ['20352', '29046'], 55);
    expect(find(g, 'ICD eligibility (non-ischemic')).toBeFalsy();
  });
  it('gates: ischemic present (I25) excludes NICM path', () => {
    const g = evaluateGapRules([HF, 'I42.0', 'I25.10'], { lvef: 30 }, ['20352', '29046'], 55);
    expect(find(g, 'ICD eligibility (non-ischemic')).toBeFalsy();
  });
});

describe('HF-026 ICD secondary prevention', () => {
  it('fires: prior VT (I47.2), no ICD', () => {
    const g = evaluateGapRules(['I47.2'], {}, [], 60);
    expect(find(g, 'Secondary-prevention ICD')).toBeTruthy();
  });
  it('gates: benign ectopy (I49.9) does not fire', () => {
    const g = evaluateGapRules(['I49.9'], {}, [], 60);
    expect(find(g, 'Secondary-prevention ICD')).toBeFalsy();
  });
  it('gates: existing ICD', () => {
    const g = evaluateGapRules(['I47.2', 'Z95.810'], {}, [], 60);
    expect(find(g, 'Secondary-prevention ICD')).toBeFalsy();
  });
});

describe('HF-031 lead extraction indication', () => {
  it('fires: CIED present + device infection (T82.7)', () => {
    const g = evaluateGapRules(['Z95.810', 'T82.7'], {}, [], 60);
    expect(find(g, 'lead extraction evaluation')).toBeTruthy();
  });
  it('gates: infection but no CIED', () => {
    const g = evaluateGapRules(['T82.7'], {}, [], 60);
    expect(find(g, 'lead extraction evaluation')).toBeFalsy();
  });
});

describe('HF-126 CCM candidate', () => {
  it('fires: LVEF 35, NYHA III, narrow QRS, on GDMT', () => {
    const g = evaluateGapRules([HF], { lvef: 35, nyha_class: 3, qrs_duration: 100 }, ['20352', '29046'], 60);
    expect(find(g, 'contractility modulation')).toBeTruthy();
  });
  it('gates: wide QRS (CRT-eligible)', () => {
    const g = evaluateGapRules([HF], { lvef: 35, nyha_class: 3, qrs_duration: 160 }, ['20352', '29046'], 60);
    expect(find(g, 'contractility modulation')).toBeFalsy();
  });
});

describe('HF-127 WCD bridge post-MI', () => {
  it('fires: recent MI + LVEF 30 + no ICD', () => {
    const g = evaluateGapRules(['I21.9'], { lvef: 30 }, [], 60);
    expect(find(g, 'WCD bridge')).toBeTruthy();
  });
  it('gates: existing ICD', () => {
    const g = evaluateGapRules(['I21.9', 'Z95.810'], { lvef: 30 }, [], 60);
    expect(find(g, 'WCD bridge')).toBeFalsy();
  });
});

// ---- CHUNK 2: Phenotypes + Iron ----

describe('HF-061 Fabry ERT', () => {
  it('fires: Fabry (E75.21) not on DMT', () => {
    const g = evaluateGapRules(['E75.21'], {}, [], 45);
    expect(find(g, 'Fabry disease without disease-modifying')).toBeTruthy();
  });
  it('gates: on agalsidase alfa', () => {
    const g = evaluateGapRules(['E75.21'], {}, ['2691830'], 45);
    expect(find(g, 'Fabry disease without disease-modifying')).toBeFalsy();
  });
});

describe('HF-062 sarcoid AV-block workup', () => {
  it('fires: age 45 + complete AV block (I44.2), no sarcoid dx', () => {
    const g = evaluateGapRules(['I44.2'], {}, [], 45);
    expect(find(g, 'cardiac sarcoidosis workup')).toBeTruthy();
  });
  it('gates: age 70 (>=60)', () => {
    const g = evaluateGapRules(['I44.2'], {}, [], 70);
    expect(find(g, 'cardiac sarcoidosis workup')).toBeFalsy();
  });
  it('gates: sarcoid already diagnosed (D86.85)', () => {
    const g = evaluateGapRules(['I44.2', 'D86.85'], {}, [], 45);
    expect(find(g, 'cardiac sarcoidosis workup')).toBeFalsy();
  });
});

describe('HF-063 cardiac sarcoid immunosuppression', () => {
  it('fires: cardiac sarcoid (D86.85) not on immunosuppression', () => {
    const g = evaluateGapRules(['D86.85'], {}, [], 55);
    expect(find(g, 'sarcoidosis without immunosuppressive')).toBeTruthy();
  });
  it('gates: on prednisone', () => {
    const g = evaluateGapRules(['D86.85'], {}, ['8640'], 55);
    expect(find(g, 'sarcoidosis without immunosuppressive')).toBeFalsy();
  });
  it('gates: on steroid-sparing (methotrexate)', () => {
    const g = evaluateGapRules(['D86.85'], {}, ['6851'], 55);
    expect(find(g, 'sarcoidosis without immunosuppressive')).toBeFalsy();
  });
});

describe('HF-065 tachycardia-mediated CM', () => {
  it('fires: HF LVEF 40 + HR 110 + no rate/rhythm control', () => {
    const g = evaluateGapRules([HF], { lvef: 40, heart_rate: 110 }, [], 60);
    expect(find(g, 'tachycardia-mediated cardiomyopathy')).toBeTruthy();
  });
  it('gates: HR 80 (not tachycardic)', () => {
    const g = evaluateGapRules([HF], { lvef: 40, heart_rate: 80 }, [], 60);
    expect(find(g, 'tachycardia-mediated cardiomyopathy')).toBeFalsy();
  });
});

describe('HF-072 Takotsubo recovery echo', () => {
  it('fires: Takotsubo (I51.81) + echo 3 months stale', () => {
    const g = evaluateGapRules(['I51.81'], { echo_months: 3 }, [], 60);
    expect(find(g, 'recovery echocardiogram')).toBeTruthy();
  });
  it('gates: recent echo (1 month)', () => {
    const g = evaluateGapRules(['I51.81'], { echo_months: 1 }, [], 60);
    expect(find(g, 'recovery echocardiogram')).toBeFalsy();
  });
});

describe('HF-073 radiation heart surveillance', () => {
  it('fires: radiation hx (Z92.3) + cardiac dx + echo 13 months', () => {
    const g = evaluateGapRules(['Z92.3', HF], { echo_months: 13 }, [], 60);
    expect(find(g, 'radiation') || find(g, 'surveillance echo overdue')).toBeTruthy();
  });
  it('gates: radiation hx but no cardiac dx', () => {
    const g = evaluateGapRules(['Z92.3'], { echo_months: 13 }, [], 60);
    expect(find(g, 'surveillance echo overdue')).toBeFalsy();
  });
  it('gates: radiation hx + isolated HTN (I10, not structural cardiac) - Pattern-A narrowing', () => {
    const g = evaluateGapRules(['Z92.3', 'I10'], { echo_months: 13 }, [], 60);
    expect(find(g, 'surveillance echo overdue')).toBeFalsy();
  });
});

describe('HF-074 ARVC + VT ICD evaluation', () => {
  it('fires: I42.8 + sustained VT (I47.2), no ICD', () => {
    const g = evaluateGapRules(['I42.8', 'I47.2'], {}, [], 35);
    expect(find(g, 'ARVC with ventricular tachycardia')).toBeTruthy();
  });
  it('gates: bare I42.8 without VT (Pattern-A pairing required)', () => {
    const g = evaluateGapRules(['I42.8'], {}, [], 35);
    expect(find(g, 'ARVC with ventricular tachycardia')).toBeFalsy();
  });
  it('gates: existing ICD', () => {
    const g = evaluateGapRules(['I42.8', 'I47.2', 'Z95.810'], {}, [], 35);
    expect(find(g, 'ARVC with ventricular tachycardia')).toBeFalsy();
  });
});

// ---- CHUNK 3: Cross-cutting ----

describe('HF-036 GDMT substantially incomplete', () => {
  it('fires: HFrEF on only 1 pillar (BB)', () => {
    const g = evaluateGapRules([HF], { lvef: 30 }, ['20352'], 60);
    expect(find(g, 'GDMT substantially incomplete')).toBeTruthy();
  });
  it('gates: 3 pillars present (>2)', () => {
    const g = evaluateGapRules([HF], { lvef: 30 }, ['20352', '29046', '9997'], 60);
    expect(find(g, 'GDMT substantially incomplete')).toBeFalsy();
  });
});

describe('HF-076 Stage B asymptomatic LV dysfunction', () => {
  it('fires: CAD + LVEF 30 (<40) + no HF dx + no GDMT', () => {
    const g = evaluateGapRules(['I25.10'], { lvef: 30 }, [], 60);
    expect(find(g, 'Stage B')).toBeTruthy();
  });
  it('gates: LVEF 45 (HFmrEF, excluded per <40 ruling)', () => {
    const g = evaluateGapRules(['I25.10'], { lvef: 45 }, [], 60);
    expect(find(g, 'Stage B')).toBeFalsy();
  });
  it('gates: HF dx present (symptomatic, not Stage B)', () => {
    const g = evaluateGapRules(['I25.10', HF], { lvef: 30 }, [], 60);
    expect(find(g, 'Stage B')).toBeFalsy();
  });
});

describe('HF-078 HF + chronic AF uncontrolled rate', () => {
  it('fires: HF + chronic AF (I48.2) + HR 120 + no rate control', () => {
    const g = evaluateGapRules([HF, 'I48.2'], { heart_rate: 120 }, [], 70);
    expect(find(g, 'uncontrolled ventricular rate')).toBeTruthy();
  });
  it('gates: HR 90 (controlled)', () => {
    const g = evaluateGapRules([HF, 'I48.2'], { heart_rate: 90 }, [], 70);
    expect(find(g, 'uncontrolled ventricular rate')).toBeFalsy();
  });
});

describe('HF-080 HF + untreated thyroid dysfunction (overt-only)', () => {
  it('fires: HF + TSH 12 (overt hypo) + no levothyroxine', () => {
    const g = evaluateGapRules([HF], { tsh: 12 }, [], 65);
    expect(find(g, 'untreated thyroid dysfunction')).toBeTruthy();
  });
  it('fires: HF + TSH 0.05 (overt hyper) + no antithyroid', () => {
    const g = evaluateGapRules([HF], { tsh: 0.05 }, [], 65);
    expect(find(g, 'untreated thyroid dysfunction')).toBeTruthy();
  });
  it('gates: TSH 6 (subclinical, excluded per overt-only ruling)', () => {
    const g = evaluateGapRules([HF], { tsh: 6 }, [], 65);
    expect(find(g, 'untreated thyroid dysfunction')).toBeFalsy();
  });
  it('gates: on levothyroxine', () => {
    const g = evaluateGapRules([HF], { tsh: 12 }, ['10582'], 65);
    expect(find(g, 'untreated thyroid dysfunction')).toBeFalsy();
  });
});

describe('HF-082 metformin renal-dose review', () => {
  it('fires: HF + CKD (N18.3) + metformin + eGFR 35', () => {
    const g = evaluateGapRules([HF, 'N18.3'], { egfr: 35 }, ['6809'], 70);
    expect(find(g, 'metformin at reduced eGFR')).toBeTruthy();
  });
  it('gates: eGFR 50 (>=45)', () => {
    const g = evaluateGapRules([HF, 'N18.3'], { egfr: 50 }, ['6809'], 70);
    expect(find(g, 'metformin at reduced eGFR')).toBeFalsy();
  });
});

describe('HF-086 teratogenic HF med in pregnancy', () => {
  it('fires: HF + pregnancy (Z34.90) + lisinopril', () => {
    const g = evaluateGapRules([HF, 'Z34.90'], {}, ['29046'], 30, 'FEMALE');
    expect(find(g, 'teratogenic HF medication in pregnancy')).toBeTruthy();
  });
  it('gates: not pregnant', () => {
    const g = evaluateGapRules([HF], {}, ['29046'], 30, 'FEMALE');
    expect(find(g, 'teratogenic HF medication in pregnancy')).toBeFalsy();
  });
});

// ---- CHUNK 4: Advanced / Cardiorenal / Pericardial / Transitions ----

describe('HF-047 inotrope dependence', () => {
  it('fires: HF on milrinone', () => {
    const g = evaluateGapRules([HF], {}, ['52769'], 60);
    expect(find(g, 'Inotrope dependence')).toBeTruthy();
  });
  it('gates: HF not on inotrope', () => {
    const g = evaluateGapRules([HF], {}, [], 60);
    expect(find(g, 'Inotrope dependence')).toBeFalsy();
  });
});

describe('HF-132 severe hyponatremia management', () => {
  it('fires: HF + Na 120 + no tolvaptan', () => {
    const g = evaluateGapRules([HF], { sodium: 120 }, [], 70);
    expect(find(g, 'Severe hyponatremia')).toBeTruthy();
  });
  it('gates: Na 135 (normal)', () => {
    const g = evaluateGapRules([HF], { sodium: 135 }, [], 70);
    expect(find(g, 'Severe hyponatremia')).toBeFalsy();
  });
});

describe('HF-133 inotrope-refractory shock without MCS', () => {
  it('fires: HF + shock (R57.0) + inotrope + no MCS', () => {
    const g = evaluateGapRules([HF, 'R57.0'], {}, ['52769'], 60);
    expect(find(g, 'cardiogenic shock without mechanical')).toBeTruthy();
  });
  it('gates: MCS already placed (Impella CPT 33990)', () => {
    const g = evaluateGapRules([HF, 'R57.0'], {}, ['52769'], 60, 'MALE', undefined, [], ['33990']);
    expect(find(g, 'cardiogenic shock without mechanical')).toBeFalsy();
  });
  it('gates: shock but not on inotrope', () => {
    const g = evaluateGapRules([HF, 'R57.0'], {}, [], 60);
    expect(find(g, 'cardiogenic shock without mechanical')).toBeFalsy();
  });
});

describe('HF-139 advanced CKD HF screening (CRS-4)', () => {
  it('fires: eGFR 25 + no NP + no HF dx', () => {
    const g = evaluateGapRules(['N18.4'], { egfr: 25 }, [], 70);
    expect(find(g, 'cardiorenal type 4')).toBeTruthy();
  });
  it('gates: existing HF dx', () => {
    const g = evaluateGapRules(['N18.4', HF], { egfr: 25 }, [], 70);
    expect(find(g, 'cardiorenal type 4')).toBeFalsy();
  });
  it('gates: NT-proBNP already measured', () => {
    const g = evaluateGapRules(['N18.4'], { egfr: 25, nt_probnp: 500 }, [], 70);
    expect(find(g, 'cardiorenal type 4')).toBeFalsy();
  });
});

describe('HF-144 steroid-dependent pericarditis IL-1', () => {
  it('fires: pericarditis (I30.0) + prednisone + no IL-1 inhibitor', () => {
    const g = evaluateGapRules(['I30.0'], {}, ['8640'], 45);
    expect(find(g, 'recurrent pericarditis without IL-1')).toBeTruthy();
  });
  it('gates: already on rilonacept', () => {
    const g = evaluateGapRules(['I30.0'], {}, ['8640', '763450'], 45);
    expect(find(g, 'recurrent pericarditis without IL-1')).toBeFalsy();
  });
  it('gates: pericarditis but not on steroid', () => {
    const g = evaluateGapRules(['I30.0'], {}, [], 45);
    expect(find(g, 'recurrent pericarditis without IL-1')).toBeFalsy();
  });
});

describe('HF-027 CardioMEMS candidacy', () => {
  it('fires: HF + NYHA III + BNP 200 + no CardioMEMS', () => {
    const g = evaluateGapRules([HF], { nyha_class: 3, bnp: 200 }, [], 65);
    expect(find(g, 'CardioMEMS')).toBeTruthy();
  });
  it('gates: NYHA II', () => {
    const g = evaluateGapRules([HF], { nyha_class: 2, bnp: 200 }, [], 65);
    expect(find(g, 'CardioMEMS')).toBeFalsy();
  });
  it('gates: already implanted (CPT 33289)', () => {
    const g = evaluateGapRules([HF], { nyha_class: 3, bnp: 200 }, [], 65, 'MALE', undefined, [], ['33289']);
    expect(find(g, 'CardioMEMS')).toBeFalsy();
  });
});

// ---- CHUNK 5: LVAD / Transplant ----

describe('HF-147 post-LVAD INR out of range', () => {
  it('fires: LVAD (Z95.811) + INR 1.5 (subtherapeutic)', () => {
    const g = evaluateGapRules(['Z95.811'], { inr: 1.5 }, [], 60);
    expect(find(g, 'post-LVAD INR outside')).toBeTruthy();
  });
  it('fires: LVAD + INR 4 (supratherapeutic)', () => {
    const g = evaluateGapRules(['Z95.811'], { inr: 4 }, [], 60);
    expect(find(g, 'post-LVAD INR outside')).toBeTruthy();
  });
  it('gates: INR 2.5 (in range)', () => {
    const g = evaluateGapRules(['Z95.811'], { inr: 2.5 }, [], 60);
    expect(find(g, 'post-LVAD INR outside')).toBeFalsy();
  });
});

describe('HF-148 post-LVAD GI bleeding', () => {
  it('fires: LVAD + GI hemorrhage (K92.2) + no octreotide', () => {
    const g = evaluateGapRules(['Z95.811', 'K92.2'], {}, [], 60);
    expect(find(g, 'GI bleeding without anti-angiodysplasia')).toBeTruthy();
  });
  it('gates: already on octreotide', () => {
    const g = evaluateGapRules(['Z95.811', 'K92.2'], {}, ['7617'], 60);
    expect(find(g, 'GI bleeding without anti-angiodysplasia')).toBeFalsy();
  });
});

describe('HF-151 post-transplant CAV surveillance', () => {
  it('fires: heart transplant (Z94.1) + coronary assessment 13 months stale', () => {
    const g = evaluateGapRules(['Z94.1'], { coronary_cta_months: 13 }, [], 55);
    expect(find(g, 'CAV surveillance overdue')).toBeTruthy();
  });
  it('gates: recent coronary assessment (6 months)', () => {
    const g = evaluateGapRules(['Z94.1'], { coronary_cta_months: 6 }, [], 55);
    expect(find(g, 'CAV surveillance overdue')).toBeFalsy();
  });
});

describe('HF-152 post-transplant biopsy surveillance', () => {
  it('fires: heart transplant + no EMB procedure recorded', () => {
    const g = evaluateGapRules(['Z94.1'], {}, [], 55);
    expect(find(g, 'rejection-surveillance biopsy not documented')).toBeTruthy();
  });
  it('gates: EMB procedure present (CPT 93505)', () => {
    const g = evaluateGapRules(['Z94.1'], {}, [], 55, 'MALE', undefined, [], ['93505']);
    expect(find(g, 'rejection-surveillance biopsy not documented')).toBeFalsy();
  });
});

// ---- LEGACY CORRECTIONS (2026-06-15 legacy fold-in review) ----

describe('Legacy HF-019: undiagnosed HFpEF - HTN OR DM (was AND)', () => {
  it('fires: HTN only (no DM) + age>65 + BNP>125', () => {
    const g = evaluateGapRules(['I10'], { bnp: 200 }, [], 70);
    expect(find(g, 'Undiagnosed HFpEF')).toBeTruthy();
  });
  it('fires: DM only (no HTN)', () => {
    const g = evaluateGapRules(['E11.9'], { bnp: 200 }, [], 70);
    expect(find(g, 'Undiagnosed HFpEF')).toBeTruthy();
  });
  it('gates: neither HTN nor DM', () => {
    const g = evaluateGapRules(['Z00.0'], { bnp: 200 }, [], 70);
    expect(find(g, 'Undiagnosed HFpEF')).toBeFalsy();
  });
});

describe('Legacy HF-070: peripartum - narrowed O-prefix', () => {
  it('gates: ectopic pregnancy (O00) no longer fires', () => {
    const g = evaluateGapRules(['O00.9'], { lvef: 35 }, [], 30, 'FEMALE');
    expect(find(g, 'Peripartum cardiomyopathy')).toBeFalsy();
  });
  it('fires: puerperium complication (O90.9) + female + LVEF<45', () => {
    const g = evaluateGapRules(['O90.9'], { lvef: 35 }, [], 30, 'FEMALE');
    expect(find(g, 'Peripartum cardiomyopathy')).toBeTruthy();
  });
  it('fires: explicit PPCM dx (O90.3) regardless', () => {
    const g = evaluateGapRules(['O90.3'], { lvef: 35 }, [], 30, 'FEMALE');
    expect(find(g, 'Peripartum cardiomyopathy')).toBeTruthy();
  });
});

describe('Legacy HF-006: ARNI underdosing - dose gate added', () => {
  it('gates: ARNI present without dose data (no over-fire)', () => {
    const g = evaluateGapRules(['I50.20'], {}, ['1656339'], 60);
    expect(find(g, 'dose optimization review')).toBeFalsy();
  });
  it('kept-suppressed (AUDIT-199-B-ARNI): ARNI dose 24 (<97) does NOT fire pending compound-component handling', () => {
    // Post-AUDIT-199-B the sacubitril/valsartan compound parses to null anyway, and
    // AUDIT_199B_DOSE_RULE_SUPPRESSED keeps the rule suppressed even for a directly-supplied component dose.
    const g = evaluateGapRules(['I50.20'], {}, ['1656339'], 60, 'MALE', undefined, [{ rxNormCode: '1656339', doseValue: 24 }]);
    expect(find(g, 'dose optimization review')).toBeFalsy();
  });
  it('gates: ARNI at target dose 97', () => {
    const g = evaluateGapRules(['I50.20'], {}, ['1656339'], 60, 'MALE', undefined, [{ rxNormCode: '1656339', doseValue: 97 }]);
    expect(find(g, 'dose optimization review')).toBeFalsy();
  });
});

describe('Legacy E66.3: overweight excluded from obesity gaps', () => {
  it('gates: E66.3 overweight alone does not trigger obese-HFpEF OSA screen', () => {
    const g = evaluateGapRules(['I50.20', 'E66.3'], {}, [], 60);
    expect(find(g, 'Obstructive sleep apnea screening')).toBeFalsy();
  });
  it('fires: E66.01 morbid obesity does trigger OSA screen', () => {
    const g = evaluateGapRules(['I50.20', 'E66.01'], {}, [], 60);
    expect(find(g, 'Obstructive sleep apnea screening')).toBeTruthy();
  });
});

describe('HF-032 iron studies overdue (anemic HF)', () => {
  it('fires: HF + Hgb 10 + ferritin absent', () => {
    const g = evaluateGapRules([HF], { hemoglobin: 10 }, [], 70);
    expect(find(g, 'Iron studies overdue')).toBeTruthy();
  });
  it('gates: Hgb 14 (not anemic)', () => {
    const g = evaluateGapRules([HF], { hemoglobin: 14 }, [], 70);
    expect(find(g, 'Iron studies overdue')).toBeFalsy();
  });
  it('gates: ferritin already measured', () => {
    const g = evaluateGapRules([HF], { hemoglobin: 10, ferritin: 200 }, [], 70);
    expect(find(g, 'Iron studies overdue')).toBeFalsy();
  });
});

describe('HF-034 functional iron deficiency', () => {
  it('fires: HF + ferritin 150 + TSAT 15 + no IV iron', () => {
    const g = evaluateGapRules([HF], { ferritin: 150, tsat: 15 }, [], 70);
    expect(find(g, 'Functional iron deficiency')).toBeTruthy();
  });
  it('gates: TSAT 25 (>=20)', () => {
    const g = evaluateGapRules([HF], { ferritin: 150, tsat: 25 }, [], 70);
    expect(find(g, 'Functional iron deficiency')).toBeFalsy();
  });
  it('gates: ferritin 80 (absolute deficiency, not functional)', () => {
    const g = evaluateGapRules([HF], { ferritin: 80, tsat: 15 }, [], 70);
    expect(find(g, 'Functional iron deficiency')).toBeFalsy();
  });
});
