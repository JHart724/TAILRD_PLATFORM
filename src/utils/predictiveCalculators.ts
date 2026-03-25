/**
 * predictiveCalculators.ts
 *
 * Forward-looking predictive intelligence functions that compute clinical
 * trajectories, threshold predictions, time horizons, and revenue projections.
 *
 * These are additive to the retrospective gap detection in clinicalCalculators.ts.
 * No React, no UI — just data in, structured result out.
 *
 * Every function gracefully handles missing/undefined fields by returning
 * sensible defaults and noting which inputs were unavailable.
 */

// ---------------------------------------------------------------------------
// 1. Trajectory Calculator
// ---------------------------------------------------------------------------

export interface TrajectoryInput {
  currentValue: number;
  priorValue: number;
  daysBetween: number;
}

export interface TrajectoryResult {
  direction: 'improving' | 'stable' | 'worsening_slow' | 'worsening_rapid';
  ratePerMonth: number;
  ratePerYear: number;
  percentChange: number;
}

/**
 * Computes the trajectory of a clinical value over time.
 *
 * Direction is determined by the rate of change per month:
 * - Rapid worsening: >10% change per month (in worsening direction)
 * - Slow worsening: 2-10% change per month
 * - Stable: <2% change per month
 * - Improving: change in the positive direction
 *
 * "Worsening" means the value is moving toward a worse clinical state.
 * For most values (LVEF, KCCQ, SAQ, eGFR), declining = worsening.
 * For values like NT-proBNP, Vmax, hs-TnT — increasing = worsening.
 * The caller determines which direction is "worsening" by passing
 * values appropriately (or using the directionality-aware wrappers below).
 */
export function computeTrajectory(input: TrajectoryInput): TrajectoryResult {
  const { currentValue, priorValue, daysBetween } = input;

  if (daysBetween <= 0 || priorValue === 0) {
    return {
      direction: 'stable',
      ratePerMonth: 0,
      ratePerYear: 0,
      percentChange: 0,
    };
  }

  const totalChange = currentValue - priorValue;
  const monthsBetween = daysBetween / 30.44;
  const ratePerMonth = totalChange / monthsBetween;
  const ratePerYear = ratePerMonth * 12;
  const percentChange = (totalChange / Math.abs(priorValue)) * 100;
  const absPercentPerMonth = Math.abs(percentChange) / monthsBetween;

  let direction: TrajectoryResult['direction'];

  if (totalChange < 0) {
    // Value is declining
    if (absPercentPerMonth > 10) {
      direction = 'worsening_rapid';
    } else if (absPercentPerMonth >= 2) {
      direction = 'worsening_slow';
    } else {
      direction = 'stable';
    }
  } else if (totalChange > 0) {
    direction = 'improving';
  } else {
    direction = 'stable';
  }

  return { direction, ratePerMonth, ratePerYear, percentChange };
}

// ---------------------------------------------------------------------------
// 2. Threshold Date Predictor
// ---------------------------------------------------------------------------

export interface ThresholdInput {
  currentValue: number;
  ratePerMonth: number;
  threshold: number;
  direction: 'declining' | 'increasing';
}

export interface ThresholdResult {
  monthsToThreshold: number | null;
  predictedDate: string | null;
  confidence: 'high' | 'moderate' | 'low';
  basisNote: string;
}

/**
 * Predicts when a clinical value will cross a threshold at the current rate.
 *
 * direction = 'declining': value is going DOWN toward threshold
 *   (e.g., LVEF declining toward 35%, eGFR declining toward 15)
 * direction = 'increasing': value is going UP toward threshold
 *   (e.g., Vmax increasing toward 4.0 m/s, NT-proBNP increasing toward 1000)
 *
 * Returns null if the value is moving away from threshold or is stable.
 */
export function predictThresholdDate(
  input: ThresholdInput,
  confidenceLevel: ThresholdResult['confidence'] = 'moderate'
): ThresholdResult {
  const { currentValue, ratePerMonth, threshold, direction } = input;

  // Check if already past threshold
  if (direction === 'declining' && currentValue <= threshold) {
    return {
      monthsToThreshold: 0,
      predictedDate: 'Now',
      confidence: 'high',
      basisNote: 'Already at or below threshold.',
    };
  }
  if (direction === 'increasing' && currentValue >= threshold) {
    return {
      monthsToThreshold: 0,
      predictedDate: 'Now',
      confidence: 'high',
      basisNote: 'Already at or above threshold.',
    };
  }

  // Check if rate is moving away from threshold or is zero
  if (direction === 'declining' && ratePerMonth >= 0) {
    return {
      monthsToThreshold: null,
      predictedDate: null,
      confidence: confidenceLevel,
      basisNote: 'Value is stable or improving — threshold not predicted.',
    };
  }
  if (direction === 'increasing' && ratePerMonth <= 0) {
    return {
      monthsToThreshold: null,
      predictedDate: null,
      confidence: confidenceLevel,
      basisNote: 'Value is stable or improving — threshold not predicted.',
    };
  }

  // Compute months to threshold
  const gap = Math.abs(threshold - currentValue);
  const absRate = Math.abs(ratePerMonth);
  const months = gap / absRate;

  // Generate predicted date
  const now = new Date();
  const predictedDate = new Date(now.getTime() + months * 30.44 * 24 * 60 * 60 * 1000);
  const dateStr = predictedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return {
    monthsToThreshold: Math.round(months * 10) / 10,
    predictedDate: months < 1 ? 'Immediate' : dateStr,
    confidence: confidenceLevel,
    basisNote: `At current rate of ${absRate.toFixed(2)}/month.`,
  };
}

// ---------------------------------------------------------------------------
// 3. Time Horizon Calculator
// ---------------------------------------------------------------------------

export interface TimeHorizonInput {
  predictedMonths: number | null;
  gapCategory: 'Safety' | 'Gap' | 'Growth' | 'Quality' | 'Deprescribing';
  trajectoryDirection: TrajectoryResult['direction'];
}

export interface TimeHorizonResult {
  horizon: 'immediate' | 'near_term' | 'emerging' | 'watch';
  label: string;
  color: string;
  urgencyScore: number;
}

/**
 * Computes the time horizon for a patient-gap combination.
 *
 * Safety gaps are always immediate regardless of trajectory.
 * Otherwise, horizon is driven by predicted months and trajectory:
 * - Immediate: <1 month or worsening rapidly
 * - Near-term: 1-3 months or worsening slowly
 * - Emerging: 3-6 months or stable with active gap
 * - Watch: >6 months and stable
 */
export function computeTimeHorizon(input: TimeHorizonInput): TimeHorizonResult {
  const { predictedMonths, gapCategory, trajectoryDirection } = input;

  // Safety gaps are always immediate
  if (gapCategory === 'Safety') {
    return {
      horizon: 'immediate',
      label: 'Immediate (0-30 days)',
      color: 'red',
      urgencyScore: 10,
    };
  }

  // Worsening rapidly -> immediate
  if (trajectoryDirection === 'worsening_rapid' || (predictedMonths != null && predictedMonths < 1)) {
    return {
      horizon: 'immediate',
      label: 'Immediate (0-30 days)',
      color: 'red',
      urgencyScore: 9,
    };
  }

  // Worsening slowly or 1-3 months
  if (trajectoryDirection === 'worsening_slow' || (predictedMonths != null && predictedMonths <= 3)) {
    return {
      horizon: 'near_term',
      label: 'Near-term (1-3 months)',
      color: 'orange',
      urgencyScore: 7,
    };
  }

  // 3-6 months or stable with active gap
  if (predictedMonths != null && predictedMonths <= 6) {
    return {
      horizon: 'emerging',
      label: 'Emerging (3-6 months)',
      color: 'yellow',
      urgencyScore: 5,
    };
  }

  // Stable with gap but no imminent threshold
  if (trajectoryDirection === 'stable' && predictedMonths == null) {
    return {
      horizon: 'emerging',
      label: 'Emerging (3-6 months)',
      color: 'yellow',
      urgencyScore: 4,
    };
  }

  // >6 months and stable or improving
  return {
    horizon: 'watch',
    label: 'Watch (6-18 months)',
    color: 'green',
    urgencyScore: 2,
  };
}

// ---------------------------------------------------------------------------
// 4. SVG Failure Probability Estimator
// ---------------------------------------------------------------------------

export interface SVGFailureInput {
  cabgDate: string;
}

export interface SVGFailureResult {
  probability: number;
  yearsPostCABG: number;
  riskCategory: 'low' | 'moderate' | 'high' | 'very_high';
  basisNote: string;
}

/**
 * Estimates saphenous vein graft (SVG) failure probability based on
 * time since CABG surgery.
 *
 * Based on published SVG patency data:
 * - Year 1: ~12% cumulative failure
 * - Year 5: ~25% cumulative failure
 * - Year 10: ~40-50% cumulative failure
 * - Year 15: ~60% cumulative failure
 *
 * Uses linear interpolation between known data points.
 */
export function estimateSVGFailureProbability(input: SVGFailureInput): SVGFailureResult {
  const cabgDate = new Date(input.cabgDate);
  const now = new Date();
  const yearsPost = (now.getTime() - cabgDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  if (isNaN(yearsPost) || yearsPost < 0) {
    return {
      probability: 0,
      yearsPostCABG: 0,
      riskCategory: 'low',
      basisNote: 'Invalid or future CABG date.',
    };
  }

  // Piecewise linear interpolation
  const knots: [number, number][] = [
    [0, 0],
    [1, 0.12],
    [5, 0.25],
    [10, 0.45],
    [15, 0.60],
    [20, 0.75],
  ];

  let probability = 0;
  for (let i = 0; i < knots.length - 1; i++) {
    const [x0, y0] = knots[i];
    const [x1, y1] = knots[i + 1];
    if (yearsPost <= x1) {
      const t = (yearsPost - x0) / (x1 - x0);
      probability = y0 + t * (y1 - y0);
      break;
    }
    if (i === knots.length - 2) {
      probability = knots[knots.length - 1][1];
    }
  }

  const roundedYears = Math.round(yearsPost * 10) / 10;
  const roundedProb = Math.round(probability * 100);

  let riskCategory: SVGFailureResult['riskCategory'];
  if (probability < 0.15) riskCategory = 'low';
  else if (probability < 0.30) riskCategory = 'moderate';
  else if (probability < 0.50) riskCategory = 'high';
  else riskCategory = 'very_high';

  return {
    probability: roundedProb / 100,
    yearsPostCABG: roundedYears,
    riskCategory,
    basisNote: `${roundedProb}% cumulative SVG failure probability at ${roundedYears} years post-CABG (based on published patency data).`,
  };
}

// ---------------------------------------------------------------------------
// 5. AS Progression Projector
// ---------------------------------------------------------------------------

export interface ASProgressionInput {
  currentVmax: number;
  priorVmax?: number;
  monthsBetween?: number;
}

export interface ASProgressionResult {
  annualizedRate: number;
  monthsToSevere: number | null;
  predictedSevereDate: string | null;
  progressionCategory: 'slow' | 'average' | 'rapid';
  confidence: 'high' | 'moderate' | 'low';
  basisNote: string;
}

/**
 * Projects aortic stenosis progression based on Vmax trajectory.
 *
 * Known progression rates:
 * - Slow: <0.1 m/s/year
 * - Average: 0.1-0.2 m/s/year
 * - Rapid: >0.2 m/s/year (flag for more frequent surveillance)
 * - Severe threshold: Vmax >= 4.0 m/s
 *
 * If only one data point exists, uses population average of 0.15 m/s/year.
 */
export function projectASProgression(input: ASProgressionInput): ASProgressionResult {
  const { currentVmax, priorVmax, monthsBetween } = input;
  const SEVERE_THRESHOLD = 4.0;
  const POPULATION_RATE = 0.15; // m/s per year average

  // Already severe
  if (currentVmax >= SEVERE_THRESHOLD) {
    return {
      annualizedRate: 0,
      monthsToSevere: 0,
      predictedSevereDate: 'Now',
      progressionCategory: 'average',
      confidence: 'high',
      basisNote: 'Already at severe threshold (Vmax >= 4.0 m/s).',
    };
  }

  let annualizedRate: number;
  let confidence: ASProgressionResult['confidence'];
  let basisNote: string;

  if (priorVmax != null && monthsBetween != null && monthsBetween > 0) {
    const deltaVmax = currentVmax - priorVmax;
    annualizedRate = (deltaVmax / monthsBetween) * 12;
    confidence = monthsBetween >= 6 ? 'high' : 'moderate';
    basisNote = `Based on 2 measurements ${monthsBetween} months apart (Vmax ${priorVmax.toFixed(1)} -> ${currentVmax.toFixed(1)} m/s).`;
  } else {
    annualizedRate = POPULATION_RATE;
    confidence = 'low';
    basisNote = `Based on population average rate (0.15 m/s/year) — single data point.`;
  }

  // Classify progression
  let progressionCategory: ASProgressionResult['progressionCategory'];
  if (annualizedRate < 0.1) progressionCategory = 'slow';
  else if (annualizedRate <= 0.2) progressionCategory = 'average';
  else progressionCategory = 'rapid';

  // Project to severe threshold
  if (annualizedRate <= 0) {
    return {
      annualizedRate: Math.max(0, annualizedRate),
      monthsToSevere: null,
      predictedSevereDate: null,
      progressionCategory,
      confidence,
      basisNote: basisNote + ' Vmax stable or decreasing — progression not predicted.',
    };
  }

  const gapToSevere = SEVERE_THRESHOLD - currentVmax;
  const monthsToSevere = (gapToSevere / annualizedRate) * 12;

  const now = new Date();
  const predictedDate = new Date(now.getTime() + monthsToSevere * 30.44 * 24 * 60 * 60 * 1000);
  const dateStr = predictedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return {
    annualizedRate: Math.round(annualizedRate * 100) / 100,
    monthsToSevere: Math.round(monthsToSevere),
    predictedSevereDate: dateStr,
    progressionCategory,
    confidence,
    basisNote,
  };
}

// ---------------------------------------------------------------------------
// 6. BAV Aortopathy Progression Projector
// ---------------------------------------------------------------------------

export interface BAVProgressionInput {
  currentRootCm: number;
  priorRootCm?: number;
  monthsBetween?: number;
  surgicalThreshold?: number;
}

export interface BAVProgressionResult {
  annualizedGrowthRate: number;
  monthsToSurgicalThreshold: number | null;
  predictedThresholdDate: string | null;
  riskCategory: 'slow' | 'average' | 'rapid';
  surgicalThreshold: number;
  confidence: 'high' | 'moderate' | 'low';
  basisNote: string;
}

/**
 * Projects BAV aortopathy progression based on aortic root growth rate.
 *
 * Growth categories:
 * - Slow: <0.1cm/year
 * - Average: 0.1-0.3cm/year
 * - Rapid: >0.3cm/year (flag for more frequent imaging and early surgical planning)
 * - Surgical threshold default: 5.0cm (for BAV with risk factors)
 *
 * If only one data point exists, uses population average 0.2cm/year.
 */
export function projectBAVProgression(input: BAVProgressionInput): BAVProgressionResult {
  const { currentRootCm, priorRootCm, monthsBetween } = input;
  const threshold = input.surgicalThreshold ?? 5.0;
  const POPULATION_RATE = 0.2; // cm per year average for BAV

  // Already at or above threshold
  if (currentRootCm >= threshold) {
    return {
      annualizedGrowthRate: 0,
      monthsToSurgicalThreshold: 0,
      predictedThresholdDate: 'Now',
      riskCategory: 'rapid',
      surgicalThreshold: threshold,
      confidence: 'high',
      basisNote: `Already at or above surgical threshold (${currentRootCm}cm >= ${threshold}cm).`,
    };
  }

  let annualizedRate: number;
  let confidence: BAVProgressionResult['confidence'];
  let basisNote: string;

  if (priorRootCm != null && monthsBetween != null && monthsBetween > 0) {
    const delta = currentRootCm - priorRootCm;
    annualizedRate = (delta / monthsBetween) * 12;
    confidence = monthsBetween >= 6 ? 'high' : 'moderate';
    basisNote = `Based on 2 measurements ${monthsBetween} months apart (${priorRootCm.toFixed(1)}cm -> ${currentRootCm.toFixed(1)}cm).`;
  } else {
    annualizedRate = POPULATION_RATE;
    confidence = 'low';
    basisNote = `Based on population average growth rate (0.2cm/year) — single data point.`;
  }

  // Classify growth rate
  let riskCategory: BAVProgressionResult['riskCategory'];
  if (annualizedRate < 0.1) riskCategory = 'slow';
  else if (annualizedRate <= 0.3) riskCategory = 'average';
  else riskCategory = 'rapid';

  // Project to threshold
  if (annualizedRate <= 0) {
    return {
      annualizedGrowthRate: 0,
      monthsToSurgicalThreshold: null,
      predictedThresholdDate: null,
      riskCategory,
      surgicalThreshold: threshold,
      confidence,
      basisNote: basisNote + ' Root stable or shrinking — progression not predicted.',
    };
  }

  const gap = threshold - currentRootCm;
  const monthsToThreshold = (gap / annualizedRate) * 12;

  const now = new Date();
  const predictedDate = new Date(now.getTime() + monthsToThreshold * 30.44 * 24 * 60 * 60 * 1000);
  const dateStr = predictedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return {
    annualizedGrowthRate: Math.round(annualizedRate * 100) / 100,
    monthsToSurgicalThreshold: Math.round(monthsToThreshold),
    predictedThresholdDate: dateStr,
    riskCategory,
    surgicalThreshold: threshold,
    confidence,
    basisNote,
  };
}

// ---------------------------------------------------------------------------
// 7. KCCQ Hospitalization Risk Calculator
// ---------------------------------------------------------------------------

export interface KCCQHospRiskInput {
  kccqScore: number;
  kccqRatePerMonth?: number;
  priorHospitalizations?: number;
}

export interface KCCQHospRiskResult {
  hospitalizationRiskLevel: 'low' | 'moderate' | 'high' | 'very_high';
  predictedWindowDays: number | null;
  riskMultiplier: number;
  basisNote: string;
}

/**
 * Computes hospitalization risk from KCCQ score and trajectory.
 *
 * Known thresholds:
 * - KCCQ <45: 3x hospitalization risk
 * - KCCQ <35: 5x hospitalization risk
 * - Declining >5 points/month: additional 2x multiplier
 * - Prior hospitalizations in 12 months: +1x per event
 */
export function computeKCCQHospitalizationRisk(input: KCCQHospRiskInput): KCCQHospRiskResult {
  const { kccqScore, kccqRatePerMonth, priorHospitalizations } = input;

  let baseMultiplier = 1;
  const notes: string[] = [];

  // Score-based risk
  if (kccqScore < 35) {
    baseMultiplier = 5;
    notes.push(`KCCQ ${kccqScore} < 35 — 5x baseline hospitalization risk`);
  } else if (kccqScore < 45) {
    baseMultiplier = 3;
    notes.push(`KCCQ ${kccqScore} < 45 — 3x baseline hospitalization risk`);
  } else if (kccqScore < 55) {
    baseMultiplier = 1.8;
    notes.push(`KCCQ ${kccqScore} — moderately elevated hospitalization risk`);
  } else {
    notes.push(`KCCQ ${kccqScore} — baseline hospitalization risk`);
  }

  // Decline trajectory multiplier
  if (kccqRatePerMonth != null && kccqRatePerMonth < -5) {
    baseMultiplier *= 2;
    notes.push(`Rapid KCCQ decline (${kccqRatePerMonth.toFixed(1)} pts/month) — 2x trajectory multiplier`);
  } else if (kccqRatePerMonth != null && kccqRatePerMonth < -2) {
    baseMultiplier *= 1.5;
    notes.push(`Moderate KCCQ decline (${kccqRatePerMonth.toFixed(1)} pts/month) — 1.5x trajectory multiplier`);
  }

  // Prior hospitalizations
  const hosps = priorHospitalizations ?? 0;
  if (hosps > 0) {
    baseMultiplier += hosps;
    notes.push(`${hosps} hospitalizations in past 12 months — +${hosps}x cumulative risk`);
  }

  // Predict when KCCQ will reach thresholds
  let predictedWindowDays: number | null = null;
  if (kccqRatePerMonth != null && kccqRatePerMonth < 0 && kccqScore >= 45) {
    const monthsTo45 = (kccqScore - 45) / Math.abs(kccqRatePerMonth);
    predictedWindowDays = Math.round(monthsTo45 * 30.44);
    notes.push(`Projected to reach KCCQ 45 (3x risk threshold) in ~${Math.round(monthsTo45)} months`);
  } else if (kccqRatePerMonth != null && kccqRatePerMonth < 0 && kccqScore >= 35) {
    const monthsTo35 = (kccqScore - 35) / Math.abs(kccqRatePerMonth);
    predictedWindowDays = Math.round(monthsTo35 * 30.44);
    notes.push(`Already below 45 threshold. Projected to reach KCCQ 35 (5x risk) in ~${Math.round(monthsTo35)} months`);
  }

  // Classify risk level
  let level: KCCQHospRiskResult['hospitalizationRiskLevel'];
  if (baseMultiplier >= 8) level = 'very_high';
  else if (baseMultiplier >= 4) level = 'high';
  else if (baseMultiplier >= 2) level = 'moderate';
  else level = 'low';

  return {
    hospitalizationRiskLevel: level,
    predictedWindowDays,
    riskMultiplier: Math.round(baseMultiplier * 10) / 10,
    basisNote: notes.join('. '),
  };
}

// ---------------------------------------------------------------------------
// 8. Revenue at Risk Calculator
// ---------------------------------------------------------------------------

export interface RevenueAtRiskInput {
  gapDollarOpportunity: number;
  monthsToThreshold: number | null;
  gapCategory: 'Safety' | 'Gap' | 'Growth' | 'Quality' | 'Deprescribing';
  conversionRate?: number;
}

export interface RevenueAtRiskResult {
  revenueThisQuarter: number;
  revenueNextQuarter: number;
  revenueIn12Months: number;
  revenueAtRiskIfDeferred: number;
  deferralCostPerMonth: number;
  conversionRate: number;
}

/**
 * Computes revenue projections with time dimension.
 *
 * Default conversion rates by gap type:
 * - Growth (procedure): 0.35
 * - Therapy gap (Gap): 0.65
 * - Safety: 0.90
 * - Quality: 0.50
 * - Deprescribing: 0.40
 */
export function computeRevenueAtRisk(input: RevenueAtRiskInput): RevenueAtRiskResult {
  const { gapDollarOpportunity, monthsToThreshold, gapCategory } = input;

  const defaultRates: Record<string, number> = {
    Growth: 0.35,
    Gap: 0.65,
    Safety: 0.90,
    Quality: 0.50,
    Deprescribing: 0.40,
  };

  const conversionRate = input.conversionRate ?? defaultRates[gapCategory] ?? 0.50;
  const adjustedOpportunity = gapDollarOpportunity * conversionRate;

  // If threshold is imminent, more revenue is at risk sooner
  const urgencyMultiplier = monthsToThreshold != null && monthsToThreshold <= 3
    ? 0.75  // 75% of opportunity is actionable now
    : monthsToThreshold != null && monthsToThreshold <= 6
      ? 0.50  // 50% actionable this quarter
      : 0.30;  // 30% actionable this quarter for longer-horizon gaps

  const revenueThisQuarter = Math.round(adjustedOpportunity * urgencyMultiplier);
  const revenueNextQuarter = Math.round(adjustedOpportunity * (1 - urgencyMultiplier) * 0.5);
  const revenueIn12Months = Math.round(adjustedOpportunity);
  const revenueAtRiskIfDeferred = Math.round(adjustedOpportunity * urgencyMultiplier * 0.6);
  const deferralCostPerMonth = Math.round(revenueAtRiskIfDeferred / 6);

  return {
    revenueThisQuarter,
    revenueNextQuarter,
    revenueIn12Months,
    revenueAtRiskIfDeferred,
    deferralCostPerMonth,
    conversionRate,
  };
}

// ---------------------------------------------------------------------------
// 7. Population Trajectory Distribution
// ---------------------------------------------------------------------------

export interface TrajectoryDistribution {
  worseningRapid: number;
  worseningSlow: number;
  stable: number;
  improving: number;
  total: number;
}

export interface QuarterlyProjection {
  quarter: string;
  revenue: number;
  patients: number;
}

/**
 * Computes the trajectory distribution for a gap's patient population.
 * Used for gap-level summary displays in Service Line view.
 *
 * Takes patient counts by trajectory category and returns the distribution
 * plus quarterly revenue projections.
 */
export function computeTrajectoryDistribution(
  distribution: TrajectoryDistribution,
  totalDollarOpportunity: number
): {
  distribution: TrajectoryDistribution;
  quarterlyProjections: QuarterlyProjection[];
  urgentPatients: number;
} {
  const { worseningRapid, worseningSlow, stable, improving, total } = distribution;
  const urgentPatients = worseningRapid + worseningSlow;

  // Quarterly revenue allocation based on trajectory
  const q1Revenue = Math.round(
    totalDollarOpportunity * (worseningRapid / Math.max(total, 1)) +
    totalDollarOpportunity * (worseningSlow / Math.max(total, 1)) * 0.4
  );
  const q2Revenue = Math.round(
    totalDollarOpportunity * (worseningSlow / Math.max(total, 1)) * 0.6 +
    totalDollarOpportunity * (stable / Math.max(total, 1)) * 0.3
  );
  const q3Revenue = Math.round(
    totalDollarOpportunity * (stable / Math.max(total, 1)) * 0.4 +
    totalDollarOpportunity * (improving / Math.max(total, 1)) * 0.3
  );
  const q4Revenue = Math.round(
    totalDollarOpportunity * (stable / Math.max(total, 1)) * 0.3 +
    totalDollarOpportunity * (improving / Math.max(total, 1)) * 0.7
  );

  const now = new Date();
  const currentQ = Math.ceil((now.getMonth() + 1) / 3);
  const currentYear = now.getFullYear();

  const quarterlyProjections: QuarterlyProjection[] = [
    { quarter: `Q${currentQ} ${currentYear}`, revenue: q1Revenue, patients: worseningRapid },
    { quarter: `Q${((currentQ) % 4) + 1} ${currentQ === 4 ? currentYear + 1 : currentYear}`, revenue: q2Revenue, patients: worseningSlow },
    { quarter: `Q${((currentQ + 1) % 4) + 1} ${currentQ >= 3 ? currentYear + 1 : currentYear}`, revenue: q3Revenue, patients: stable },
    { quarter: `Q${((currentQ + 2) % 4) + 1} ${currentQ >= 2 ? currentYear + 1 : currentYear}`, revenue: q4Revenue, patients: improving },
  ];

  return { distribution, quarterlyProjections, urgentPatients };
}

// ---------------------------------------------------------------------------
// 8. Pipeline Quarterly Forecast
// ---------------------------------------------------------------------------

export interface PipelineForecastInput {
  gaps: Array<{
    patientCount: number;
    dollarOpportunity: number;
    category: string;
    trajectoryDistribution: TrajectoryDistribution;
  }>;
}

export interface PipelineForecastResult {
  quarters: QuarterlyProjection[];
  totalProjected12Month: number;
  immediatePatients: number;
  nearTermPatients: number;
}

/**
 * Computes a quarterly revenue and volume forecast for a module pipeline.
 * Aggregates across all gaps in the pipeline.
 */
export function computePipelineForecast(input: PipelineForecastInput): PipelineForecastResult {
  let q1Rev = 0, q2Rev = 0, q3Rev = 0, q4Rev = 0;
  let q1Pts = 0, q2Pts = 0, q3Pts = 0, q4Pts = 0;
  let immediatePatients = 0;
  let nearTermPatients = 0;

  for (const gap of input.gaps) {
    const { worseningRapid, worseningSlow, stable, improving, total } = gap.trajectoryDistribution;
    const opp = gap.dollarOpportunity;

    immediatePatients += worseningRapid;
    nearTermPatients += worseningSlow;

    q1Rev += Math.round(opp * (worseningRapid / Math.max(total, 1)));
    q1Pts += worseningRapid;

    q2Rev += Math.round(opp * (worseningSlow / Math.max(total, 1)));
    q2Pts += worseningSlow;

    q3Rev += Math.round(opp * (stable / Math.max(total, 1)) * 0.5);
    q3Pts += Math.round(stable * 0.5);

    q4Rev += Math.round(opp * (stable / Math.max(total, 1)) * 0.5 + opp * (improving / Math.max(total, 1)));
    q4Pts += Math.round(stable * 0.5) + improving;
  }

  const now = new Date();
  const currentQ = Math.ceil((now.getMonth() + 1) / 3);
  const currentYear = now.getFullYear();

  return {
    quarters: [
      { quarter: `Q${currentQ} ${currentYear}`, revenue: q1Rev, patients: q1Pts },
      { quarter: `Q${((currentQ) % 4) + 1} ${currentQ === 4 ? currentYear + 1 : currentYear}`, revenue: q2Rev, patients: q2Pts },
      { quarter: `Q${((currentQ + 1) % 4) + 1} ${currentQ >= 3 ? currentYear + 1 : currentYear}`, revenue: q3Rev, patients: q3Pts },
      { quarter: `Q${((currentQ + 2) % 4) + 1} ${currentQ >= 2 ? currentYear + 1 : currentYear}`, revenue: q4Rev, patients: q4Pts },
    ],
    totalProjected12Month: q1Rev + q2Rev + q3Rev + q4Rev,
    immediatePatients,
    nearTermPatients,
  };
}

// ---------------------------------------------------------------------------
// 9. Deferral Impact Calculator
// ---------------------------------------------------------------------------

export interface DeferralImpactInput {
  immediatePatients: number;
  immediateRevenue: number;
  nearTermPatients: number;
  nearTermRevenue: number;
  totalOpportunity: number;
}

export interface DeferralImpactResult {
  q1RevenueRisk: number;
  q2AdditionalRisk: number;
  cumulativeRisk12Month: number;
  immediatePatients: number;
  deferralCostPerMonth: number;
}

/**
 * Computes the financial impact of deferring gap closure.
 * Used for Executive "Revenue at Risk" card.
 */
export function computeDeferralImpact(input: DeferralImpactInput): DeferralImpactResult {
  const { immediatePatients, immediateRevenue, nearTermRevenue, totalOpportunity } = input;

  return {
    q1RevenueRisk: immediateRevenue,
    q2AdditionalRisk: nearTermRevenue,
    cumulativeRisk12Month: Math.round(totalOpportunity * 0.65),
    immediatePatients,
    deferralCostPerMonth: Math.round(immediateRevenue / 3),
  };
}

// ---------------------------------------------------------------------------
// 10. Format Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a dollar value for display (e.g., 4200000 -> "$4.2M").
 */
export function formatDollar(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

/**
 * Returns a trajectory arrow and label for display.
 */
export function trajectoryDisplay(direction: TrajectoryResult['direction']): {
  arrow: string;
  label: string;
  colorClass: string;
} {
  switch (direction) {
    case 'worsening_rapid':
      return { arrow: '\u2193', label: 'Worsening rapidly', colorClass: 'text-red-600' };
    case 'worsening_slow':
      return { arrow: '\u2198', label: 'Worsening slowly', colorClass: 'text-amber-600' };
    case 'stable':
      return { arrow: '\u2192', label: 'Stable', colorClass: 'text-gray-500' };
    case 'improving':
      return { arrow: '\u2197', label: 'Improving', colorClass: 'text-green-600' };
  }
}

/**
 * Returns time horizon badge properties for display.
 */
export function timeHorizonDisplay(horizon: TimeHorizonResult['horizon']): {
  icon: string;
  label: string;
  bgClass: string;
  textClass: string;
} {
  switch (horizon) {
    case 'immediate':
      return { icon: '\uD83D\uDD34', label: 'Immediate', bgClass: 'bg-red-100', textClass: 'text-red-700' };
    case 'near_term':
      return { icon: '\uD83D\uDFE0', label: 'Near-term', bgClass: 'bg-orange-100', textClass: 'text-orange-700' };
    case 'emerging':
      return { icon: '\uD83D\uDFE1', label: 'Emerging', bgClass: 'bg-yellow-100', textClass: 'text-yellow-700' };
    case 'watch':
      return { icon: '\uD83D\uDFE2', label: 'Watch', bgClass: 'bg-green-100', textClass: 'text-green-700' };
  }
}
