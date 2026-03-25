/**
 * clinicalCalculators.ts
 *
 * Pure utility functions that compute clinical risk scores and classifications.
 * No React, no UI — just data in, structured result out.
 *
 * Every function gracefully handles missing/undefined fields by returning
 * sensible defaults and noting which inputs were unavailable.
 */

// ---------------------------------------------------------------------------
// 1. STOP-BANG Score — Obstructive Sleep Apnea screening
// ---------------------------------------------------------------------------

interface STOPBANGInput {
  bmi?: number;
  age?: number;
  sex?: string;
  diagnosisHTN?: boolean;
  neckCircumference?: number;
}

interface STOPBANGResult {
  score: number;
  components: string[];
  risk: string;
}

/**
 * Computes the STOP-BANG score for obstructive sleep apnea risk.
 *
 * Components scored (when data is available):
 * - P: Diagnosed hypertension (+1)
 * - B: BMI > 35 (+1)
 * - A: Age > 50 (+1)
 * - N: Neck circumference > 40 cm (+1)
 * - G: Male sex (+1)
 *
 * S (snoring), T (tiredness), O (observed apnea) are subjective and
 * generally not available from structured data — they are omitted.
 *
 * Risk strata: Low (0-2), Intermediate (3-4), High (5-8).
 */
export function computeSTOPBANG(patient: STOPBANGInput): STOPBANGResult {
  let score = 0;
  const components: string[] = [];

  if (patient.diagnosisHTN === true) {
    score += 1;
    components.push('P: Hypertension');
  }

  if (patient.bmi != null && patient.bmi > 35) {
    score += 1;
    components.push(`B: BMI > 35 (${patient.bmi.toFixed(1)})`);
  }

  if (patient.age != null && patient.age > 50) {
    score += 1;
    components.push(`A: Age > 50 (${patient.age})`);
  }

  if (patient.neckCircumference != null && patient.neckCircumference > 40) {
    score += 1;
    components.push(`N: Neck > 40 cm (${patient.neckCircumference} cm)`);
  }

  if (patient.sex != null && patient.sex.toLowerCase() === 'male') {
    score += 1;
    components.push('G: Male sex');
  }

  let risk: string;
  if (score >= 5) {
    risk = 'High';
  } else if (score >= 3) {
    risk = 'Intermediate';
  } else {
    risk = 'Low';
  }

  return { score, components, risk };
}

// ---------------------------------------------------------------------------
// 2. HERDOO2 Score — VTE recurrence risk in women
// ---------------------------------------------------------------------------

interface HERDOO2Input {
  sex?: string;
  age?: number;
  bmi?: number;
  postThromboticSyndrome?: boolean;
  priorVTECount?: number;
}

interface HERDOO2Result {
  score: number;
  components: string[];
  risk: string;
  applicability: string;
}

/**
 * Computes the HERDOO2 score for VTE recurrence risk after a first
 * unprovoked event. This score is validated only in **women**.
 *
 * Components:
 * - H: Post-thrombotic signs (hyperpigmentation, edema, redness) (+1)
 * - R: BMI >= 30 (+1)
 * - O: Age >= 65 (+1)
 * - O2: >= 2 prior VTE events (+1)
 *
 * E (elevated D-dimer) and D (index DVT) are context-dependent and
 * not reliably captured in structured data — they are omitted.
 *
 * Score <= 1: Low risk — may safely stop anticoagulation.
 * Score >= 2: High risk — continue anticoagulation.
 * Males always return high-risk guidance per study design.
 */
export function computeHERDOO2(patient: HERDOO2Input): HERDOO2Result {
  const isFemale =
    patient.sex != null && patient.sex.toLowerCase() === 'female';

  if (!isFemale) {
    return {
      score: -1,
      components: [],
      risk: 'High (continue anticoagulation)',
      applicability: 'high_risk_male',
    };
  }

  let score = 0;
  const components: string[] = [];

  if (patient.postThromboticSyndrome === true) {
    score += 1;
    components.push('H: Post-thrombotic syndrome signs');
  }

  if (patient.bmi != null && patient.bmi >= 30) {
    score += 1;
    components.push(`R: BMI >= 30 (${patient.bmi.toFixed(1)})`);
  }

  if (patient.age != null && patient.age >= 65) {
    score += 1;
    components.push(`O: Age >= 65 (${patient.age})`);
  }

  if (patient.priorVTECount != null && patient.priorVTECount >= 2) {
    score += 1;
    components.push(`O2: >= 2 prior VTE (${patient.priorVTECount})`);
  }

  const risk =
    score <= 1
      ? 'Low (may stop anticoagulation)'
      : 'High (continue anticoagulation)';

  return { score, components, risk, applicability: 'female' };
}

// ---------------------------------------------------------------------------
// 3. DANISH Age Tier — ICD benefit stratification
// ---------------------------------------------------------------------------

interface DANISHTierInput {
  age?: number;
}

interface DANISHTierResult {
  tier: string;
  hrBenefit: string;
  recommendation: string;
}

/**
 * Classifies a patient's expected ICD benefit based on the DANISH trial
 * age-stratified analysis.
 *
 * - Age < 60: Critical benefit — HR 0.51 for all-cause mortality.
 * - Age 60-68: High — trend toward benefit.
 * - Age > 68: Moderate — no significant mortality benefit demonstrated.
 */
export function computeDANISHTier(patient: DANISHTierInput): DANISHTierResult {
  if (patient.age == null) {
    return {
      tier: 'Unknown',
      hrBenefit: 'N/A',
      recommendation: 'Age unavailable — cannot stratify DANISH benefit.',
    };
  }

  if (patient.age < 60) {
    return {
      tier: 'Critical',
      hrBenefit: 'HR 0.51',
      recommendation:
        'Strong ICD mortality benefit demonstrated in DANISH trial (age < 60).',
    };
  }

  if (patient.age <= 68) {
    return {
      tier: 'High',
      hrBenefit: 'Trend toward benefit',
      recommendation:
        'Trend toward ICD benefit in DANISH age 60-68 subgroup; individualize decision.',
    };
  }

  return {
    tier: 'Moderate',
    hrBenefit: 'No significant benefit',
    recommendation:
      'No significant ICD mortality benefit in DANISH trial (age > 68); weigh competing risks.',
  };
}

// ---------------------------------------------------------------------------
// 4. QTc Risk Calculator
// ---------------------------------------------------------------------------

interface QTcRiskInput {
  qtcMs?: number;
  qtProlongingMeds?: string[];
  potassium?: number;
  magnesium?: number;
}

interface QTcRiskResult {
  severity: string;
  qtcMs: number | null;
  drugCount: number;
  electrolyteRisk: boolean;
  details: string[];
}

/**
 * Evaluates QTc-related risk for torsades de pointes.
 *
 * Severity tiers:
 * - Critical: QTc > 500 ms, or QTc > 470 ms with >= 2 high-risk drugs.
 * - High: QTc 470-500 ms, or >= 2 QT-prolonging drugs.
 * - Moderate: No recent ECG available AND >= 2 QT-prolonging drugs.
 * - Low: None of the above criteria met.
 *
 * Electrolyte risk is flagged when K < 3.5 or Mg < 1.8.
 */
export function computeQTcRisk(patient: QTcRiskInput): QTcRiskResult {
  const qtc = patient.qtcMs ?? null;
  const drugs = patient.qtProlongingMeds ?? [];
  const drugCount = drugs.length;
  const details: string[] = [];

  const lowK = patient.potassium != null && patient.potassium < 3.5;
  const lowMg = patient.magnesium != null && patient.magnesium < 1.8;
  const electrolyteRisk = lowK || lowMg;

  if (lowK) {
    details.push(`Low potassium: ${patient.potassium} mEq/L`);
  }
  if (lowMg) {
    details.push(`Low magnesium: ${patient.magnesium} mg/dL`);
  }
  if (drugCount > 0) {
    details.push(`QT-prolonging medications (${drugCount}): ${drugs.join(', ')}`);
  }

  let severity: string;

  if (qtc != null && qtc > 500) {
    severity = 'Critical';
    details.push(`QTc ${qtc} ms — critically prolonged (> 500 ms)`);
  } else if (qtc != null && qtc > 470 && drugCount >= 2) {
    severity = 'Critical';
    details.push(
      `QTc ${qtc} ms with >= 2 QT-prolonging drugs — critical risk`
    );
  } else if (qtc != null && qtc >= 470) {
    severity = 'High';
    details.push(`QTc ${qtc} ms — prolonged (470-500 ms range)`);
  } else if (drugCount >= 2 && qtc != null) {
    severity = 'High';
    details.push(
      `QTc ${qtc} ms with >= 2 QT-prolonging drugs — high risk`
    );
  } else if (qtc == null && drugCount >= 2) {
    severity = 'Moderate';
    details.push(
      'No recent ECG available with >= 2 QT-prolonging drugs — obtain ECG'
    );
  } else {
    severity = 'Low';
    if (qtc != null) {
      details.push(`QTc ${qtc} ms — within acceptable range`);
    }
  }

  if (electrolyteRisk) {
    details.push('Electrolyte abnormality amplifies QTc risk — correct promptly');
  }

  return { severity, qtcMs: qtc, drugCount, electrolyteRisk, details };
}

// ---------------------------------------------------------------------------
// 5. H2FPEF Score — HFpEF probability
// ---------------------------------------------------------------------------

interface H2FPEFInput {
  bmi?: number;
  diagnosisHTN?: boolean;
  diagnosisAF?: boolean;
  eeRatio?: number;
  age?: number;
}

interface H2FPEFResult {
  score: number;
  components: string[];
  probability: string;
}

/**
 * Computes the H2FPEF score for estimating HFpEF probability.
 *
 * Components:
 * - H: BMI > 30 (+2)
 * - H2: Hypertension diagnosed (+1, approximation for >= 2 antihypertensives)
 * - F: Atrial fibrillation (+3)
 * - E: Age > 60 (+1)
 * - F2: E/e' > 9 (+1)
 *
 * P (pulmonary hypertension / PASP > 35) is skipped when echo data is
 * unavailable. Maximum possible score from captured fields: 8.
 *
 * Score >= 6: High probability HFpEF.
 * Score 2-5: Intermediate probability.
 * Score 0-1: Low probability.
 */
export function computeH2FPEF(patient: H2FPEFInput): H2FPEFResult {
  let score = 0;
  const components: string[] = [];

  if (patient.bmi != null && patient.bmi > 30) {
    score += 2;
    components.push(`H: BMI > 30 (+2, BMI ${patient.bmi.toFixed(1)})`);
  }

  if (patient.diagnosisHTN === true) {
    score += 1;
    components.push('H2: Hypertension (+1)');
  }

  if (patient.diagnosisAF === true) {
    score += 3;
    components.push('F: Atrial fibrillation (+3)');
  }

  if (patient.age != null && patient.age > 60) {
    score += 1;
    components.push(`E: Age > 60 (+1, age ${patient.age})`);
  }

  if (patient.eeRatio != null && patient.eeRatio > 9) {
    score += 1;
    components.push(`F2: E/e' > 9 (+1, E/e' ${patient.eeRatio.toFixed(1)})`);
  }

  let probability: string;
  if (score >= 6) {
    probability = 'High';
  } else if (score >= 2) {
    probability = 'Intermediate';
  } else {
    probability = 'Low';
  }

  return { score, components, probability };
}

// ---------------------------------------------------------------------------
// 6. PVC Burden Estimator
// ---------------------------------------------------------------------------

interface PVCBurdenInput {
  pvcsOnEcg?: boolean;
  holterPVCPercent?: number;
}

interface PVCBurdenResult {
  burden: string;
  source: string;
  ablationThreshold: boolean;
}

/**
 * Estimates PVC burden and flags ablation-threshold burden (> 15%).
 *
 * Prioritises Holter data when available; falls back to surface ECG.
 */
export function estimatePVCBurden(patient: PVCBurdenInput): PVCBurdenResult {
  if (patient.holterPVCPercent != null) {
    const pct = patient.holterPVCPercent;
    const ablation = pct > 15;
    let burden: string;
    if (pct > 15) {
      burden = `${pct}% — exceeds ablation threshold (> 15%)`;
    } else if (pct > 10) {
      burden = `${pct}% — elevated (cardiomyopathy risk)`;
    } else {
      burden = `${pct}% — low burden`;
    }
    return { burden, source: 'Holter monitor', ablationThreshold: ablation };
  }

  if (patient.pvcsOnEcg === true) {
    return {
      burden: 'PVCs on ECG — Holter recommended for quantification',
      source: 'Surface ECG',
      ablationThreshold: false,
    };
  }

  return {
    burden: 'No PVC data available',
    source: 'None',
    ablationThreshold: false,
  };
}

// ---------------------------------------------------------------------------
// 7. LVOT Gradient Classifier
// ---------------------------------------------------------------------------

interface LVOTInput {
  lvotGradientRest?: number;
  lvotGradientProvoked?: number;
}

interface LVOTResult {
  severity: string;
  details: string;
}

/**
 * Classifies LVOT obstruction severity based on resting and provoked
 * gradients (mmHg).
 *
 * - Significant: rest >= 30 OR provoked >= 50
 * - Borderline: rest 20-29 OR provoked 30-49
 * - Non-obstructive: rest < 20 AND provoked < 30 (or data unavailable)
 */
export function classifyLVOT(patient: LVOTInput): LVOTResult {
  const rest = patient.lvotGradientRest;
  const provoked = patient.lvotGradientProvoked;

  if (rest == null && provoked == null) {
    return {
      severity: 'Unknown',
      details: 'No LVOT gradient data available.',
    };
  }

  const significantRest = rest != null && rest >= 30;
  const significantProvoked = provoked != null && provoked >= 50;
  const borderlineRest = rest != null && rest >= 20 && rest < 30;
  const borderlineProvoked =
    provoked != null && provoked >= 30 && provoked < 50;

  const parts: string[] = [];
  if (rest != null) parts.push(`Rest ${rest} mmHg`);
  if (provoked != null) parts.push(`Provoked ${provoked} mmHg`);
  const gradientStr = parts.join(', ');

  if (significantRest || significantProvoked) {
    return {
      severity: 'Significant',
      details: `Significant LVOT obstruction (${gradientStr}).`,
    };
  }

  if (borderlineRest || borderlineProvoked) {
    return {
      severity: 'Borderline',
      details: `Borderline LVOT gradient (${gradientStr}); provocative testing may clarify.`,
    };
  }

  return {
    severity: 'Non-obstructive',
    details: `Non-obstructive LVOT gradient (${gradientStr}).`,
  };
}

// ---------------------------------------------------------------------------
// 8. Aortic Stenosis Severity Classifier
// ---------------------------------------------------------------------------

interface ASSeverityInput {
  vmaxAortic?: number;
  meanGradientAortic?: number;
  avaAortic?: number;
}

interface ASSeverityResult {
  severity: string;
  parameters: Record<string, string>;
  meetsCriteria: string[];
}

/**
 * Classifies aortic stenosis severity per ACC/AHA guidelines.
 *
 * Severe: Vmax >= 4.0 m/s OR mean gradient >= 40 mmHg OR AVA < 1.0 cm^2.
 * Moderate: Vmax 3.0-3.9 OR gradient 20-39 OR AVA 1.0-1.5.
 * Mild: Below moderate thresholds.
 *
 * Each parameter is independently evaluated; the worst classification wins.
 */
export function classifyASSeverity(patient: ASSeverityInput): ASSeverityResult {
  const params: Record<string, string> = {};
  const meetsCriteria: string[] = [];

  let severeCount = 0;
  let moderateCount = 0;

  if (patient.vmaxAortic != null) {
    params['Vmax'] = `${patient.vmaxAortic.toFixed(1)} m/s`;
    if (patient.vmaxAortic >= 4.0) {
      severeCount++;
      meetsCriteria.push('Vmax >= 4.0 m/s');
    } else if (patient.vmaxAortic >= 3.0) {
      moderateCount++;
      meetsCriteria.push('Vmax 3.0-3.9 m/s');
    }
  }

  if (patient.meanGradientAortic != null) {
    params['Mean gradient'] = `${patient.meanGradientAortic} mmHg`;
    if (patient.meanGradientAortic >= 40) {
      severeCount++;
      meetsCriteria.push('Mean gradient >= 40 mmHg');
    } else if (patient.meanGradientAortic >= 20) {
      moderateCount++;
      meetsCriteria.push('Mean gradient 20-39 mmHg');
    }
  }

  if (patient.avaAortic != null) {
    params['AVA'] = `${patient.avaAortic.toFixed(2)} cm2`;
    if (patient.avaAortic < 1.0) {
      severeCount++;
      meetsCriteria.push('AVA < 1.0 cm2');
    } else if (patient.avaAortic <= 1.5) {
      moderateCount++;
      meetsCriteria.push('AVA 1.0-1.5 cm2');
    }
  }

  let severity: string;
  if (severeCount > 0) {
    severity = 'Severe';
  } else if (moderateCount > 0) {
    severity = 'Moderate';
  } else if (Object.keys(params).length === 0) {
    severity = 'Unknown';
  } else {
    severity = 'Mild';
  }

  return { severity, parameters: params, meetsCriteria };
}

// ---------------------------------------------------------------------------
// 9. KCCQ Trend Calculator
// ---------------------------------------------------------------------------

interface KCCQTrendInput {
  kccqOverallSummary?: number;
  kccqPriorOverallSummary?: number;
}

interface TrendResult {
  direction: string;
  delta: number;
  display: string;
  color: string;
}

/**
 * Computes the trend direction and magnitude for the Kansas City
 * Cardiomyopathy Questionnaire (KCCQ) Overall Summary Score.
 *
 * A clinically meaningful change is typically >= 5 points.
 * - Improving: delta > +5 (green)
 * - Declining: delta < -5 (red)
 * - Stable: delta between -5 and +5 (grey)
 */
export function computeKCCQTrend(patient: KCCQTrendInput): TrendResult {
  if (
    patient.kccqOverallSummary == null ||
    patient.kccqPriorOverallSummary == null
  ) {
    return {
      direction: 'Unknown',
      delta: 0,
      display: 'Insufficient KCCQ data for trend',
      color: 'grey',
    };
  }

  const delta = patient.kccqOverallSummary - patient.kccqPriorOverallSummary;

  if (delta > 5) {
    return {
      direction: 'Improving',
      delta,
      display: `KCCQ improved by ${delta.toFixed(1)} pts`,
      color: 'green',
    };
  }

  if (delta < -5) {
    return {
      direction: 'Declining',
      delta,
      display: `KCCQ declined by ${Math.abs(delta).toFixed(1)} pts`,
      color: 'red',
    };
  }

  return {
    direction: 'Stable',
    delta,
    display: `KCCQ stable (delta ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pts)`,
    color: 'grey',
  };
}

// ---------------------------------------------------------------------------
// 10. SAQ Trend Calculator
// ---------------------------------------------------------------------------

interface SAQTrendInput {
  saqAnginaFrequency?: number;
  saqPriorAnginaFrequency?: number;
}

/**
 * Computes the trend direction and magnitude for the Seattle Angina
 * Questionnaire (SAQ) Angina Frequency subscale.
 *
 * Higher SAQ scores indicate fewer symptoms (better quality of life).
 * A clinically meaningful change is typically >= 5 points.
 * - Improving: delta > +5 (green)
 * - Declining: delta < -5 (red)
 * - Stable: delta between -5 and +5 (grey)
 */
export function computeSAQTrend(patient: SAQTrendInput): TrendResult {
  if (
    patient.saqAnginaFrequency == null ||
    patient.saqPriorAnginaFrequency == null
  ) {
    return {
      direction: 'Unknown',
      delta: 0,
      display: 'Insufficient SAQ data for trend',
      color: 'grey',
    };
  }

  const delta = patient.saqAnginaFrequency - patient.saqPriorAnginaFrequency;

  if (delta > 5) {
    return {
      direction: 'Improving',
      delta,
      display: `SAQ improved by ${delta.toFixed(1)} pts`,
      color: 'green',
    };
  }

  if (delta < -5) {
    return {
      direction: 'Declining',
      delta,
      display: `SAQ declined by ${Math.abs(delta).toFixed(1)} pts`,
      color: 'red',
    };
  }

  return {
    direction: 'Stable',
    delta,
    display: `SAQ stable (delta ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pts)`,
    color: 'grey',
  };
}

// ---------------------------------------------------------------------------
// 11. CHA2DS2-VASc Score
// ---------------------------------------------------------------------------

interface CHA2DS2VAScInput {
  lvef?: number;
  diagnosisHF?: boolean;
  diagnosisHTN?: boolean;
  age?: number;
  diagnosisDM?: boolean;
  priorStroke?: boolean;
  priorTIA?: boolean;
  priorMI?: boolean;
  diagnosisCAD?: boolean;
  diagnosisPAD?: boolean;
  sex?: string;
}

interface CHA2DS2VAScResult {
  score: number;
  components: string[];
  risk: string;
}

/**
 * Computes the CHA2DS2-VASc score for stroke risk in atrial fibrillation.
 *
 * - C: CHF / LV dysfunction (LVEF <= 40 or diagnosisHF) = +1
 * - H: Hypertension = +1
 * - A2: Age >= 75 = +2
 * - D: Diabetes mellitus = +1
 * - S2: Prior stroke or TIA = +2
 * - V: Vascular disease (prior MI, CAD, or PAD) = +1
 * - A: Age 65-74 = +1
 * - Sc: Female sex = +1
 *
 * Risk strata (for males / females):
 * - 0 (male) or 1 (female): Low
 * - 1 (male) or 2 (female): Low-moderate
 * - >= 2 (male) or >= 3 (female): Moderate-high — anticoagulation recommended
 */
export function computeCHA2DS2VASc(
  patient: CHA2DS2VAScInput
): CHA2DS2VAScResult {
  let score = 0;
  const components: string[] = [];

  // C: CHF / LV dysfunction
  const lvDysfunction =
    (patient.lvef != null && patient.lvef <= 40) ||
    patient.diagnosisHF === true;
  if (lvDysfunction) {
    score += 1;
    components.push('C: CHF/LV dysfunction (+1)');
  }

  // H: Hypertension
  if (patient.diagnosisHTN === true) {
    score += 1;
    components.push('H: Hypertension (+1)');
  }

  // A2: Age >= 75
  if (patient.age != null && patient.age >= 75) {
    score += 2;
    components.push(`A2: Age >= 75 (+2, age ${patient.age})`);
  } else if (patient.age != null && patient.age >= 65) {
    // A: Age 65-74
    score += 1;
    components.push(`A: Age 65-74 (+1, age ${patient.age})`);
  }

  // D: Diabetes
  if (patient.diagnosisDM === true) {
    score += 1;
    components.push('D: Diabetes (+1)');
  }

  // S2: Stroke / TIA
  if (patient.priorStroke === true || patient.priorTIA === true) {
    score += 2;
    components.push('S2: Prior stroke/TIA (+2)');
  }

  // V: Vascular disease
  if (
    patient.priorMI === true ||
    patient.diagnosisCAD === true ||
    patient.diagnosisPAD === true
  ) {
    score += 1;
    components.push('V: Vascular disease (+1)');
  }

  // Sc: Female sex
  const isFemale =
    patient.sex != null && patient.sex.toLowerCase() === 'female';
  if (isFemale) {
    score += 1;
    components.push('Sc: Female sex (+1)');
  }

  // Risk classification
  let risk: string;
  if (isFemale) {
    if (score <= 1) risk = 'Low';
    else if (score === 2) risk = 'Low-moderate';
    else risk = 'Moderate-high (anticoagulation recommended)';
  } else {
    if (score === 0) risk = 'Low';
    else if (score === 1) risk = 'Low-moderate';
    else risk = 'Moderate-high (anticoagulation recommended)';
  }

  return { score, components, risk };
}

// ---------------------------------------------------------------------------
// 12. INTERMACS Profile Estimator
// ---------------------------------------------------------------------------

interface INTERMACSInput {
  onInotrope?: boolean;
  inotropeOutpatient?: boolean;
  nyhaClass?: number;
  lvef?: number;
  recentHospitalizations?: number;
}

interface INTERMACSResult {
  profile: number;
  label: string;
  description: string;
}

/**
 * Estimates the INTERMACS profile (1-7) for advanced heart failure
 * mechanical circulatory support candidacy.
 *
 * - Profile 1: Critical cardiogenic shock (crash and burn)
 * - Profile 2: Progressive decline on inotropes (sliding on inotropes)
 * - Profile 3: Stable inotrope-dependent
 * - Profile 4: Frequent decompensation (resting symptoms, >= 3 hospitalizations)
 * - Profile 5-7: Ambulatory with varying symptom burden
 *
 * This is a heuristic estimate from structured data; formal INTERMACS
 * classification requires bedside clinical assessment.
 */
export function estimateINTERMACS(patient: INTERMACSInput): INTERMACSResult {
  const onInotrope = patient.onInotrope === true;
  const outpatient = patient.inotropeOutpatient === true;
  const nyha = patient.nyhaClass;
  const hosps = patient.recentHospitalizations ?? 0;

  // Inotrope-dependent patients
  if (onInotrope && !outpatient) {
    // Inpatient on inotropes — profile 1-3 depending on stability
    // Without hemodynamic data we estimate conservatively
    return {
      profile: 2,
      label: 'Profile 2 - Sliding on Inotropes',
      description:
        'Inpatient inotrope-dependent with progressive decline. Urgent MCS evaluation recommended.',
    };
  }

  if (onInotrope && outpatient) {
    return {
      profile: 3,
      label: 'Profile 3 - Stable Inotrope-Dependent',
      description:
        'Stable on outpatient inotropes but cannot be weaned. MCS/transplant candidacy evaluation indicated.',
    };
  }

  // Frequent decompensation
  if (hosps >= 3) {
    return {
      profile: 4,
      label: 'Profile 4 - Frequent Flyer',
      description:
        `Recurrent decompensation (${hosps} recent hospitalizations). Advanced HF therapies should be considered.`,
    };
  }

  // NYHA-based ambulatory estimates
  if (nyha === 4) {
    return {
      profile: 4,
      label: 'Profile 4 - Resting Symptoms',
      description:
        'NYHA IV symptoms at rest without inotrope dependence. Evaluate for advanced therapies.',
    };
  }

  if (nyha === 3) {
    return {
      profile: 5,
      label: 'Profile 5 - Exertion Intolerant',
      description:
        'NYHA III — comfortable at rest, unable to perform most activities. Monitor closely for progression.',
    };
  }

  if (nyha === 2) {
    return {
      profile: 6,
      label: 'Profile 6 - Exertion Limited',
      description:
        'NYHA II — mild limitation of physical activity. Optimise medical therapy.',
    };
  }

  return {
    profile: 7,
    label: 'Profile 7 - Ambulatory (NYHA I-II)',
    description:
      'Ambulatory without significant limitation. Continue guideline-directed medical therapy.',
  };
}

// ---------------------------------------------------------------------------
// 13. SYNTAX Score Estimator
// ---------------------------------------------------------------------------

interface SYNTAXInput {
  cathFindings?: string;
  ctoPresent?: boolean;
}

interface SYNTAXResult {
  score: number;
  tier: string;
  display: string;
}

/**
 * Provides a heuristic SYNTAX score estimate from cath-lab findings.
 *
 * The true SYNTAX score requires an online calculator with detailed
 * angiographic data; this function offers a rough tier estimate:
 *
 * - 3-vessel disease baseline: 18
 * - Left main involvement: +12
 * - Chronic total occlusion (CTO): +10
 *
 * Tiers: Low (< 23), Intermediate (23-32), High (>= 33).
 */
export function estimateSYNTAX(patient: SYNTAXInput): SYNTAXResult {
  if (patient.cathFindings == null && patient.ctoPresent == null) {
    return {
      score: 0,
      tier: 'Unknown',
      display: 'No cath data available for SYNTAX estimation.',
    };
  }

  let score = 0;
  const notes: string[] = [];
  const findings = (patient.cathFindings ?? '').toLowerCase();

  // Detect multi-vessel disease
  const threeVessel =
    findings.includes('3-vessel') ||
    findings.includes('three-vessel') ||
    findings.includes('3 vessel') ||
    findings.includes('three vessel') ||
    findings.includes('triple vessel');

  const twoVessel =
    findings.includes('2-vessel') ||
    findings.includes('two-vessel') ||
    findings.includes('2 vessel') ||
    findings.includes('two vessel') ||
    findings.includes('double vessel');

  if (threeVessel) {
    score += 18;
    notes.push('3-vessel disease (+18)');
  } else if (twoVessel) {
    score += 11;
    notes.push('2-vessel disease (+11)');
  } else if (findings.length > 0) {
    score += 6;
    notes.push('Single/unspecified disease (+6)');
  }

  // Left main
  const leftMain =
    findings.includes('left main') || findings.includes('lmca');
  if (leftMain) {
    score += 12;
    notes.push('Left main involvement (+12)');
  }

  // CTO
  const cto =
    patient.ctoPresent === true ||
    findings.includes('cto') ||
    findings.includes('chronic total occlusion');
  if (cto) {
    score += 10;
    notes.push('CTO present (+10)');
  }

  let tier: string;
  if (score >= 33) {
    tier = 'High';
  } else if (score >= 23) {
    tier = 'Intermediate';
  } else {
    tier = 'Low';
  }

  const display =
    notes.length > 0
      ? `Estimated SYNTAX ~${score} (${tier}): ${notes.join('; ')}`
      : `Estimated SYNTAX ~${score} (${tier})`;

  return { score, tier, display };
}
