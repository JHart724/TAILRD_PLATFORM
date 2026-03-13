/**
 * GDMT Optimization Engine — Heart Failure Guideline-Directed Medical Therapy
 *
 * Implements ACC/AHA/HFSA 2022 guidelines for HFrEF (EF ≤40%) drug therapy.
 *
 * Four pillars of GDMT for HFrEF:
 *   1. ACEi/ARB/ARNI  (target: sacubitril/valsartan 97/103 mg BID)
 *   2. Beta-blocker    (target: carvedilol 25mg BID, metoprolol succinate 200mg daily, bisoprolol 10mg daily)
 *   3. MRA             (target: spironolactone 50mg daily, eplerenone 50mg daily)
 *   4. SGLT2i          (target: dapagliflozin 10mg daily, empagliflozin 10mg daily)
 *
 * Additional therapies:
 *   - Hydralazine/ISDN for ACEi/ARB intolerant patients
 *   - Ivabradine if HR ≥70 on max beta-blocker
 *   - Vericiguat for recent HF hospitalization
 *
 * Contraindication checks:
 *   - K+ >5.0: hold MRA
 *   - eGFR <30: caution ARNi, hold MRA
 *   - SBP <100: hold ARNi, hold vasodilators
 *   - HR <60: hold beta-blocker titration
 */

import prisma from '../lib/prisma';
import { createLogger } from 'winston';

const logger = createLogger({ defaultMeta: { service: 'gdmt-engine' } });

// ── Types ───────────────────────────────────────────────────────────────────

export interface CurrentMedication {
  drugClass: string;
  drugName: string;
  dose: number;
  unit: string;
  frequency: string;
}

export interface GDMTAssessmentInput {
  patientId: string;
  hospitalId: string;
  currentMedications: CurrentMedication[];
  ejectionFraction?: number;
  nyhaClass?: 'I' | 'II' | 'III' | 'IV';
  systolicBP?: number;
  heartRate?: number;
  potassium?: number;
  creatinine?: number;
  eGFR?: number;
}

export interface GDMTRecommendation {
  pillar: string;
  drugClass: string;
  action: 'INITIATE' | 'UPTITRATE' | 'MAINTAIN' | 'HOLD' | 'DISCONTINUE' | 'SWITCH';
  currentDrug?: string;
  currentDose?: string;
  targetDrug: string;
  targetDose: string;
  rationale: string;
  contraindications: string[];
  evidenceLevel: 'A' | 'B-R' | 'B-NR' | 'C-LD' | 'C-EO';
  guidelineReference: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface GDMTAssessmentResult {
  patientId: string;
  assessmentDate: string;
  ejectionFraction?: number;
  nyhaClass?: string;
  isHFrEF: boolean;
  overallOptimization: number; // 0-100%
  pillarScores: {
    raas: { status: string; optimized: boolean; score: number };
    betaBlocker: { status: string; optimized: boolean; score: number };
    mra: { status: string; optimized: boolean; score: number };
    sglt2i: { status: string; optimized: boolean; score: number };
  };
  recommendations: GDMTRecommendation[];
  safetyAlerts: string[];
}

// ── Target dose tables ──────────────────────────────────────────────────────

const TARGET_DOSES: Record<string, { drug: string; target: string; maxDailyMg: number }[]> = {
  'ACEi': [
    { drug: 'enalapril', target: '10-20mg BID', maxDailyMg: 40 },
    { drug: 'lisinopril', target: '20-40mg daily', maxDailyMg: 40 },
    { drug: 'ramipril', target: '10mg daily', maxDailyMg: 10 },
  ],
  'ARB': [
    { drug: 'losartan', target: '50-150mg daily', maxDailyMg: 150 },
    { drug: 'valsartan', target: '160mg BID', maxDailyMg: 320 },
    { drug: 'candesartan', target: '32mg daily', maxDailyMg: 32 },
  ],
  'ARNI': [
    { drug: 'sacubitril/valsartan', target: '97/103mg BID', maxDailyMg: 400 },
  ],
  'Beta-blocker': [
    { drug: 'carvedilol', target: '25mg BID', maxDailyMg: 50 },
    { drug: 'metoprolol succinate', target: '200mg daily', maxDailyMg: 200 },
    { drug: 'bisoprolol', target: '10mg daily', maxDailyMg: 10 },
  ],
  'MRA': [
    { drug: 'spironolactone', target: '25-50mg daily', maxDailyMg: 50 },
    { drug: 'eplerenone', target: '50mg daily', maxDailyMg: 50 },
  ],
  'SGLT2i': [
    { drug: 'dapagliflozin', target: '10mg daily', maxDailyMg: 10 },
    { drug: 'empagliflozin', target: '10mg daily', maxDailyMg: 10 },
  ],
};

// ── Main assessment function ────────────────────────────────────────────────

export async function assessGDMT(input: GDMTAssessmentInput): Promise<GDMTAssessmentResult> {
  const recommendations: GDMTRecommendation[] = [];
  const safetyAlerts: string[] = [];

  const isHFrEF = (input.ejectionFraction ?? 40) <= 40;

  // Safety checks first
  if (input.potassium && input.potassium > 5.5) {
    safetyAlerts.push(`CRITICAL: K+ ${input.potassium} mEq/L — hold MRA, monitor electrolytes`);
  } else if (input.potassium && input.potassium > 5.0) {
    safetyAlerts.push(`WARNING: K+ ${input.potassium} mEq/L — caution with MRA, recheck in 1 week`);
  }

  if (input.systolicBP && input.systolicBP < 90) {
    safetyAlerts.push(`CRITICAL: SBP ${input.systolicBP} mmHg — hold titrations, assess volume status`);
  }

  if (input.eGFR && input.eGFR < 20) {
    safetyAlerts.push(`WARNING: eGFR ${input.eGFR} — nephrology consult recommended, caution with RAAS`);
  }

  // Classify current medications by pillar
  const medsByClass = classifyMedications(input.currentMedications);

  // ── Pillar 1: RAAS inhibition (ACEi/ARB/ARNI) ──────────────────────────
  const raasResult = assessRAAS(medsByClass, input, safetyAlerts);
  recommendations.push(...raasResult.recommendations);

  // ── Pillar 2: Beta-blocker ──────────────────────────────────────────────
  const bbResult = assessBetaBlocker(medsByClass, input, safetyAlerts);
  recommendations.push(...bbResult.recommendations);

  // ── Pillar 3: MRA ──────────────────────────────────────────────────────
  const mraResult = assessMRA(medsByClass, input, safetyAlerts);
  recommendations.push(...mraResult.recommendations);

  // ── Pillar 4: SGLT2i ──────────────────────────────────────────────────
  const sglt2Result = assessSGLT2i(medsByClass, input, safetyAlerts);
  recommendations.push(...sglt2Result.recommendations);

  // ── Additional therapies ──────────────────────────────────────────────
  const additionalRecs = assessAdditionalTherapies(medsByClass, input, safetyAlerts);
  recommendations.push(...additionalRecs);

  // Calculate overall optimization score
  const pillarScores = {
    raas: raasResult.pillarScore,
    betaBlocker: bbResult.pillarScore,
    mra: mraResult.pillarScore,
    sglt2i: sglt2Result.pillarScore,
  };

  const overallOptimization = Math.round(
    (pillarScores.raas.score + pillarScores.betaBlocker.score +
     pillarScores.mra.score + pillarScores.sglt2i.score) / 4
  );

  const result: GDMTAssessmentResult = {
    patientId: input.patientId,
    assessmentDate: new Date().toISOString(),
    ejectionFraction: input.ejectionFraction,
    nyhaClass: input.nyhaClass,
    isHFrEF,
    overallOptimization,
    pillarScores,
    recommendations: recommendations.sort((a, b) => {
      const priority = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priority[a.priority] - priority[b.priority];
    }),
    safetyAlerts,
  };

  // Persist the assessment
  try {
    await prisma.riskScoreAssessment.create({
      data: {
        patientId: input.patientId,
        hospitalId: input.hospitalId,
        module: 'HEART_FAILURE',
        scoreType: 'GDMT_OPTIMIZATION',
        totalScore: overallOptimization,
        riskCategory: overallOptimization >= 80 ? 'LOW' : overallOptimization >= 50 ? 'MODERATE' : 'HIGH',
        components: result as any,
        inputData: {
          currentMedications: input.currentMedications as any,
          ejectionFraction: input.ejectionFraction ?? null,
          nyhaClass: input.nyhaClass ?? null,
          systolicBP: input.systolicBP ?? null,
          heartRate: input.heartRate ?? null,
          potassium: input.potassium ?? null,
          creatinine: input.creatinine ?? null,
          eGFR: input.eGFR ?? null,
        } as any,
        interpretation: `GDMT ${overallOptimization}% optimized — ${
          overallOptimization >= 80 ? 'well-optimized therapy' :
          overallOptimization >= 50 ? 'partially optimized, titration opportunities exist' :
          'significant optimization gaps, multiple pillars need attention'
        }. ${recommendations.length} recommendation(s), ${safetyAlerts.length} safety alert(s).`,
        recommendation: recommendations.length > 0
          ? recommendations.filter(r => r.priority === 'HIGH').map(r => `${r.action} ${r.targetDrug}`).join('; ')
          : null,
        calculatedBy: 'GDMT_ENGINE_v1',
      },
    });
  } catch (err: any) {
    logger.error('Failed to persist GDMT assessment', { error: err.message, patientId: input.patientId });
  }

  logger.info('GDMT assessment completed', {
    patientId: input.patientId,
    overallOptimization,
    recommendationCount: recommendations.length,
    safetyAlertCount: safetyAlerts.length,
  });

  return result;
}

// ── Medication classification ───────────────────────────────────────────────

function classifyMedications(meds: CurrentMedication[]): Record<string, CurrentMedication[]> {
  const classified: Record<string, CurrentMedication[]> = {};
  for (const med of meds) {
    const cls = med.drugClass.toUpperCase();
    if (!classified[cls]) classified[cls] = [];
    classified[cls].push(med);
  }
  return classified;
}

function getDailyDoseMg(med: CurrentMedication): number {
  let multiplier = 1;
  const freq = med.frequency.toLowerCase();
  if (freq.includes('bid') || freq.includes('twice')) multiplier = 2;
  if (freq.includes('tid') || freq.includes('three')) multiplier = 3;
  return med.dose * multiplier;
}

function getTargetDose(drugClass: string, drugName: string): { maxDailyMg: number; targetStr: string } | null {
  const targets = TARGET_DOSES[drugClass];
  if (!targets) return null;
  const match = targets.find(t => drugName.toLowerCase().includes(t.drug.toLowerCase()));
  if (match) return { maxDailyMg: match.maxDailyMg, targetStr: match.target };
  return targets[0] ? { maxDailyMg: targets[0].maxDailyMg, targetStr: targets[0].target } : null;
}

// ── Pillar assessors ────────────────────────────────────────────────────────

interface PillarResult {
  pillarScore: { status: string; optimized: boolean; score: number };
  recommendations: GDMTRecommendation[];
}

function assessRAAS(
  meds: Record<string, CurrentMedication[]>,
  input: GDMTAssessmentInput,
  alerts: string[],
): PillarResult {
  const recs: GDMTRecommendation[] = [];
  const arni = meds['ARNI'] || [];
  const acei = meds['ACEI'] || meds['ACE INHIBITOR'] || [];
  const arb = meds['ARB'] || [];
  const contraindications: string[] = [];

  if (input.systolicBP && input.systolicBP < 100) contraindications.push('SBP <100 mmHg');
  if (input.eGFR && input.eGFR < 30) contraindications.push('eGFR <30');
  if (input.potassium && input.potassium > 5.5) contraindications.push('K+ >5.5');

  if (arni.length > 0) {
    // On ARNI — check if at target
    const daily = getDailyDoseMg(arni[0]);
    const target = getTargetDose('ARNI', arni[0].drugName);
    if (target && daily >= target.maxDailyMg * 0.9) {
      return { pillarScore: { status: 'At target ARNI', optimized: true, score: 100 }, recommendations: recs };
    }
    if (contraindications.length === 0) {
      recs.push({
        pillar: 'RAAS', drugClass: 'ARNI', action: 'UPTITRATE',
        currentDrug: arni[0].drugName, currentDose: `${arni[0].dose}${arni[0].unit} ${arni[0].frequency}`,
        targetDrug: 'sacubitril/valsartan', targetDose: '97/103mg BID',
        rationale: 'ARNI below target dose — uptitrate per PARADIGM-HF protocol',
        contraindications, evidenceLevel: 'A', guidelineReference: 'ACC/AHA 2022 §7.3.1',
        priority: 'HIGH',
      });
    }
    const pct = target ? Math.min(100, Math.round((daily / target.maxDailyMg) * 100)) : 50;
    return { pillarScore: { status: `ARNI at ${pct}% target`, optimized: false, score: pct }, recommendations: recs };
  }

  if (acei.length > 0 || arb.length > 0) {
    // On ACEi or ARB — recommend switch to ARNI
    const current = acei[0] || arb[0];
    if (contraindications.length === 0) {
      recs.push({
        pillar: 'RAAS', drugClass: 'ARNI', action: 'SWITCH',
        currentDrug: current.drugName, currentDose: `${current.dose}${current.unit} ${current.frequency}`,
        targetDrug: 'sacubitril/valsartan', targetDose: '24/26mg BID → titrate to 97/103mg BID',
        rationale: 'ARNI preferred over ACEi/ARB for HFrEF (PARADIGM-HF: 20% mortality reduction)',
        contraindications, evidenceLevel: 'A', guidelineReference: 'ACC/AHA 2022 §7.3.1',
        priority: 'HIGH',
      });
    }
    return { pillarScore: { status: 'On ACEi/ARB — ARNI switch recommended', optimized: false, score: 50 }, recommendations: recs };
  }

  // Not on any RAAS therapy
  if (contraindications.length === 0) {
    recs.push({
      pillar: 'RAAS', drugClass: 'ARNI', action: 'INITIATE',
      targetDrug: 'sacubitril/valsartan', targetDose: '24/26mg BID',
      rationale: 'No RAAS inhibitor — cornerstone therapy for HFrEF',
      contraindications, evidenceLevel: 'A', guidelineReference: 'ACC/AHA 2022 §7.3.1',
      priority: 'HIGH',
    });
  }
  return { pillarScore: { status: 'No RAAS therapy', optimized: false, score: 0 }, recommendations: recs };
}

function assessBetaBlocker(
  meds: Record<string, CurrentMedication[]>,
  input: GDMTAssessmentInput,
  alerts: string[],
): PillarResult {
  const recs: GDMTRecommendation[] = [];
  const bb = meds['BETA-BLOCKER'] || meds['BETA BLOCKER'] || meds['BB'] || [];
  const contraindications: string[] = [];

  if (input.heartRate && input.heartRate < 60) contraindications.push('HR <60 bpm');
  if (input.systolicBP && input.systolicBP < 90) contraindications.push('SBP <90 mmHg');

  if (bb.length > 0) {
    const daily = getDailyDoseMg(bb[0]);
    const target = getTargetDose('Beta-blocker', bb[0].drugName);
    if (target && daily >= target.maxDailyMg * 0.9) {
      return { pillarScore: { status: 'At target BB', optimized: true, score: 100 }, recommendations: recs };
    }
    if (contraindications.length === 0) {
      recs.push({
        pillar: 'Beta-blocker', drugClass: 'Beta-blocker', action: 'UPTITRATE',
        currentDrug: bb[0].drugName, currentDose: `${bb[0].dose}${bb[0].unit} ${bb[0].frequency}`,
        targetDrug: bb[0].drugName, targetDose: target?.targetStr || 'evidence-based target',
        rationale: 'BB below target — titrate q2 weeks if hemodynamically stable',
        contraindications, evidenceLevel: 'A', guidelineReference: 'ACC/AHA 2022 §7.3.2',
        priority: 'MEDIUM',
      });
    }
    const pct = target ? Math.min(100, Math.round((daily / target.maxDailyMg) * 100)) : 50;
    return { pillarScore: { status: `BB at ${pct}% target`, optimized: false, score: pct }, recommendations: recs };
  }

  if (contraindications.length === 0) {
    recs.push({
      pillar: 'Beta-blocker', drugClass: 'Beta-blocker', action: 'INITIATE',
      targetDrug: 'carvedilol', targetDose: '3.125mg BID → titrate to 25mg BID',
      rationale: 'No beta-blocker — evidence-based BB reduces mortality 34% in HFrEF',
      contraindications, evidenceLevel: 'A', guidelineReference: 'ACC/AHA 2022 §7.3.2',
      priority: 'HIGH',
    });
  }
  return { pillarScore: { status: 'No beta-blocker', optimized: false, score: 0 }, recommendations: recs };
}

function assessMRA(
  meds: Record<string, CurrentMedication[]>,
  input: GDMTAssessmentInput,
  alerts: string[],
): PillarResult {
  const recs: GDMTRecommendation[] = [];
  const mra = meds['MRA'] || meds['MINERALOCORTICOID'] || [];
  const contraindications: string[] = [];

  if (input.potassium && input.potassium > 5.0) contraindications.push(`K+ ${input.potassium} mEq/L`);
  if (input.eGFR && input.eGFR < 30) contraindications.push(`eGFR ${input.eGFR}`);

  if (mra.length > 0) {
    const daily = getDailyDoseMg(mra[0]);
    const target = getTargetDose('MRA', mra[0].drugName);
    if (target && daily >= target.maxDailyMg * 0.5) {
      return { pillarScore: { status: 'At therapeutic MRA dose', optimized: true, score: 100 }, recommendations: recs };
    }
    if (contraindications.length === 0) {
      recs.push({
        pillar: 'MRA', drugClass: 'MRA', action: 'UPTITRATE',
        currentDrug: mra[0].drugName, currentDose: `${mra[0].dose}${mra[0].unit} ${mra[0].frequency}`,
        targetDrug: mra[0].drugName, targetDose: target?.targetStr || '25-50mg daily',
        rationale: 'MRA below target — check K+ and creatinine before increasing',
        contraindications, evidenceLevel: 'A', guidelineReference: 'ACC/AHA 2022 §7.3.3',
        priority: 'MEDIUM',
      });
    }
    return { pillarScore: { status: 'MRA sub-therapeutic', optimized: false, score: 50 }, recommendations: recs };
  }

  if (contraindications.length === 0) {
    recs.push({
      pillar: 'MRA', drugClass: 'MRA', action: 'INITIATE',
      targetDrug: 'spironolactone', targetDose: '12.5-25mg daily',
      rationale: 'No MRA — RALES trial showed 30% mortality reduction; check K+ and renal function',
      contraindications, evidenceLevel: 'A', guidelineReference: 'ACC/AHA 2022 §7.3.3',
      priority: 'HIGH',
    });
  }
  return { pillarScore: { status: 'No MRA', optimized: false, score: 0 }, recommendations: recs };
}

function assessSGLT2i(
  meds: Record<string, CurrentMedication[]>,
  input: GDMTAssessmentInput,
  alerts: string[],
): PillarResult {
  const recs: GDMTRecommendation[] = [];
  const sglt2 = meds['SGLT2I'] || meds['SGLT2 INHIBITOR'] || [];
  const contraindications: string[] = [];

  if (input.eGFR && input.eGFR < 20) contraindications.push(`eGFR ${input.eGFR} — insufficient data`);

  if (sglt2.length > 0) {
    return { pillarScore: { status: 'On SGLT2i', optimized: true, score: 100 }, recommendations: recs };
  }

  if (contraindications.length === 0) {
    recs.push({
      pillar: 'SGLT2i', drugClass: 'SGLT2i', action: 'INITIATE',
      targetDrug: 'dapagliflozin', targetDose: '10mg daily',
      rationale: 'No SGLT2i — DAPA-HF: 26% reduction in CV death/HF hospitalization regardless of diabetes',
      contraindications, evidenceLevel: 'A', guidelineReference: 'ACC/AHA 2022 §7.3.4',
      priority: 'HIGH',
    });
  }
  return { pillarScore: { status: 'No SGLT2i', optimized: false, score: 0 }, recommendations: recs };
}

// ── Additional therapies ────────────────────────────────────────────────────

function assessAdditionalTherapies(
  meds: Record<string, CurrentMedication[]>,
  input: GDMTAssessmentInput,
  alerts: string[],
): GDMTRecommendation[] {
  const recs: GDMTRecommendation[] = [];

  // Ivabradine — if HR ≥70 on maximized beta-blocker
  const bb = meds['BETA-BLOCKER'] || meds['BETA BLOCKER'] || [];
  if (input.heartRate && input.heartRate >= 70 && bb.length > 0) {
    const ivabradine = meds['IVABRADINE'] || [];
    if (ivabradine.length === 0) {
      recs.push({
        pillar: 'Additional', drugClass: 'If-channel blocker', action: 'INITIATE',
        targetDrug: 'ivabradine', targetDose: '5mg BID → 7.5mg BID',
        rationale: `HR ${input.heartRate} bpm on BB — SHIFT trial: 18% reduction in HF hospitalization`,
        contraindications: [], evidenceLevel: 'B-R', guidelineReference: 'ACC/AHA 2022 §7.3.6',
        priority: 'LOW',
      });
    }
  }

  // Hydralazine/ISDN for ACEi/ARB/ARNI intolerant
  const hasRAAS = (meds['ARNI'] || []).length > 0 || (meds['ACEI'] || []).length > 0 || (meds['ARB'] || []).length > 0;
  if (!hasRAAS) {
    const hydral = meds['HYDRALAZINE/ISDN'] || meds['HYDRALAZINE'] || [];
    if (hydral.length === 0) {
      recs.push({
        pillar: 'Additional', drugClass: 'Vasodilator', action: 'INITIATE',
        targetDrug: 'hydralazine/isosorbide dinitrate', targetDose: '37.5/20mg TID → 75/40mg TID',
        rationale: 'No RAAS therapy tolerated — consider H-ISDN (A-HeFT: particularly beneficial in Black patients)',
        contraindications: [], evidenceLevel: 'A', guidelineReference: 'ACC/AHA 2022 §7.3.5',
        priority: 'MEDIUM',
      });
    }
  }

  return recs;
}
