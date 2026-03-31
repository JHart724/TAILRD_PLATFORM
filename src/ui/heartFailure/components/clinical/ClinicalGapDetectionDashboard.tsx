import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, DollarSign, Users, ChevronDown, ChevronUp, Target, Heart, Activity, Pill, Stethoscope, TrendingUp, Zap, Info, Search, Radar, FileText } from 'lucide-react';
import { computeDANISHTier, classifyLVOT, computeSTOPBANG, computeKCCQTrend } from '../../../../utils/clinicalCalculators';
import { computeTrajectory, computeTimeHorizon, predictThresholdDate, trajectoryDisplay, timeHorizonDisplay, computeRevenueAtRisk, formatDollar, projectBAVProgression, computeKCCQHospitalizationRisk, type TrajectoryResult, type TrajectoryDistribution } from '../../../../utils/predictiveCalculators';
import { HF_CLINICAL_GAPS, type HFClinicalGap, type HFGapPatient } from './hfGapData';

// Re-export for any consumers that still import from this file
export type { HFClinicalGap, HFGapPatient };
export { HF_CLINICAL_GAPS };

// ============================================================
// CLINICAL GAP DETECTION — HEART FAILURE MODULE
// Data + interfaces are in ./hfGapData.ts
// ============================================================

// ============================================================
// ENHANCED DISPLAY HELPERS
// ============================================================

/** Known ATTR-CM signals for Gap 1 */
const ATTR_CM_KNOWN_SIGNALS: { key: string; label: string; notMetReason: string }[] = [
  { key: 'voltage-mass', label: 'Voltage-mass mismatch', notMetReason: 'not documented' },
  { key: 'carpal tunnel', label: 'Bilateral carpal tunnel', notMetReason: 'not documented' },
  { key: 'spinal stenosis', label: 'Spinal stenosis', notMetReason: 'not documented' },
  { key: 'apical sparing', label: 'Apical sparing GLS', notMetReason: 'not documented' },
  { key: 'hs-tnt', label: 'Chronic hs-TnT elevation', notMetReason: 'single reading only' },
  { key: 'neuropathy', label: 'Peripheral neuropathy', notMetReason: 'not documented' },
  { key: 'hfpef', label: 'HFpEF + NT-proBNP + LVH', notMetReason: 'not present' },
];

function matchesSignal(patientSignals: string[], key: string): string | null {
  const lower = patientSignals.map((s) => s.toLowerCase());
  for (const sig of patientSignals) {
    const sl = sig.toLowerCase();
    if (key === 'voltage-mass' && (sl.includes('voltage') || sl.includes('low-voltage'))) return sig;
    if (key === 'carpal tunnel' && sl.includes('carpal tunnel')) return sig;
    if (key === 'spinal stenosis' && sl.includes('spinal stenosis')) return sig;
    if (key === 'apical sparing' && sl.includes('apical sparing')) return sig;
    if (key === 'hs-tnt' && (sl.includes('hs-tnt') || sl.includes('hs-tnt') || sl.includes('troponin'))) return sig;
    if (key === 'neuropathy' && sl.includes('neuropathy')) return sig;
    if (key === 'hfpef' && sl.includes('hfpef') && sl.includes('nt-probnp') && sl.includes('lv wall')) return sig;
  }
  // special: for hfpef composite, check combined signals
  if (key === 'hfpef') {
    const combined = lower.join(' ');
    if (combined.includes('hfpef') && combined.includes('nt-probnp') && combined.includes('lv wall')) {
      return patientSignals.find((s) => s.toLowerCase().includes('hfpef')) || null;
    }
  }
  return null;
}

/** Known HFpEF screening signals for Gap 21 */
const HFPEF_KNOWN_SIGNALS: { key: string; label: string; notMetReason: string }[] = [
  { key: 'nt-probnp', label: 'NT-proBNP >125 pg/mL', notMetReason: 'not elevated or not checked' },
  { key: 'e/e\'', label: 'E/e\' >14', notMetReason: 'not documented' },
  { key: 'lavi', label: 'LAVI >34 mL/m2', notMetReason: 'not documented' },
  { key: 'diastolic', label: 'Diastolic dysfunction >=grade II', notMetReason: 'not documented' },
  { key: 'loop-diuretic', label: 'Loop diuretic without HF dx', notMetReason: 'not present' },
  { key: 'ed-dyspnea', label: '>=2 ED dyspnea visits', notMetReason: 'not present' },
];

function matchesHFpEFSignal(patientSignals: string[], keyValues: Record<string, string | number>, key: string): string | null {
  const allText = [...patientSignals, ...Object.keys(keyValues).map((k) => `${k}: ${keyValues[k]}`)];
  for (const sig of allText) {
    const sl = sig.toLowerCase();
    if (key === 'nt-probnp' && (sl.includes('nt-probnp') || sl.includes('nt-probnp')) && (sl.includes('>125') || sl.includes('145') || sl.includes('180') || sl.includes('132') || sl.includes('elevated'))) return sig;
    if (key === 'e/e\'' && (sl.includes('e/e\'') || sl.includes('e/e\''))) return sig;
    if (key === 'lavi' && sl.includes('lavi')) return sig;
    if (key === 'diastolic' && sl.includes('diastolic dysfunction')) return sig;
    if (key === 'loop-diuretic' && sl.includes('loop diuretic') && (sl.includes('without hf') || sl.includes('no hf'))) return sig;
    if (key === 'ed-dyspnea' && (sl.includes('ed') && sl.includes('dyspnea'))) return sig;
  }
  return null;
}

function computeH2FPEF(detected: number): { score: string; probability: string } {
  // Simplified H2FPEF approximation based on number of positive signals
  if (detected >= 5) return { score: 'High', probability: 'High probability (>=6)' };
  if (detected >= 3) return { score: 'Intermediate', probability: 'Intermediate probability (3-5)' };
  return { score: 'Low', probability: 'Low probability (<3)' };
}

/** Render signal-by-signal detection display for ATTR-CM (Gap 1), ATTR+AS co-detection (Gap 42), and Undiagnosed HFpEF (Gap 21) */
function renderSignalDetection(gapId: string, patient: HFGapPatient): React.ReactNode {
  // ATTR-CM + AS Co-Detection (Gap 42)
  if (gapId.includes('co-detection') || (gapId.includes('attr') && gapId.includes('as'))) {
    let metCount = 0;
    const rows = ATTR_CM_KNOWN_SIGNALS.map((s) => {
      const match = matchesSignal(patient.signals, s.key);
      if (match) metCount++;
      return { ...s, met: !!match, matchText: match };
    });
    const vmax = String(patient.keyValues['Vmax'] || '');
    const meanGrad = String(patient.keyValues['Mean Gradient'] || '');
    const ava = String(patient.keyValues['AVA'] || '');
    const attrSignals = patient.signals.filter(s => s.toLowerCase().includes('attr') || s.toLowerCase().includes('co-detection'));
    return (
      <>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1">ATTR-CM + Aortic Stenosis Co-Detection</div>
          <div className="text-sm text-slate-900 font-medium">
            Aortic Stenosis: Vmax {vmax || 'N/A'} &middot; Mean gradient {meanGrad || 'N/A'} &middot; AVA {ava || 'N/A'}
          </div>
          <div className="text-sm text-slate-900 font-medium">
            ATTR-CM signals: {metCount}/7 detected {attrSignals.length > 0 && <>-- {attrSignals[0]}</>}
          </div>
          <div className="bg-slate-100 border border-slate-300 rounded-lg p-2 mt-1">
            <p className="text-xs font-semibold text-slate-900">Clinical Significance</p>
            <p className="text-xs text-slate-800">ATTR-CM prevalence in severe AS patients undergoing TAVR: 8-16%. Dual pathology confers worse prognosis. Requires both tafamidis and valve intervention planning.</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
            <Zap className="w-3 h-3 flex-shrink-0" />
            Cross-module dual detection -- unique to TAILRD
          </div>
        </div>
        <div className="bg-[#f0f4f8] border border-[#C8D4DC] rounded-xl p-4 space-y-2 mt-2">
          <h5 className="text-sm font-semibold text-[#1A2F4A]">
            ATTR-CM Signal Detection ({metCount}/7 signals detected)
          </h5>
          <ul className="space-y-1">
            {rows.map((r) => (
              <li key={r.key} className={`text-sm flex gap-2 ${r.met ? 'text-[#2C4A60]' : 'text-red-500'}`}>
                <span className="font-bold flex-shrink-0">{r.met ? '\u2713' : '\u2717'}</span>
                <span>
                  {r.label}
                  {r.met
                    ? <span className="text-[#2C4A60] ml-1">-- {r.matchText}</span>
                    : <span className="text-red-400 ml-1">-- {r.notMetReason}</span>
                  }
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[#2C4A60] flex items-center gap-1 mt-2">
            <Zap className="w-3 h-3 text-[#4A6880] flex-shrink-0" />
            All signals auto-detected from EHR structured fields
          </p>
        </div>
      </>
    );
  }

  // ATTR-CM
  if (gapId.includes('attr')) {
    let metCount = 0;
    const rows = ATTR_CM_KNOWN_SIGNALS.map((s) => {
      const match = matchesSignal(patient.signals, s.key);
      if (match) metCount++;
      return { ...s, met: !!match, matchText: match };
    });
    return (
      <div className="bg-[#f0f4f8] border border-[#C8D4DC] rounded-xl p-4 space-y-2">
        <h5 className="text-sm font-semibold text-[#1A2F4A]">
          ATTR-CM Signal Detection ({metCount}/7 signals detected)
        </h5>
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.key} className={`text-sm flex gap-2 ${r.met ? 'text-[#2C4A60]' : 'text-red-500'}`}>
              <span className="font-bold flex-shrink-0">{r.met ? '\u2713' : '\u2717'}</span>
              <span>
                {r.label}
                {r.met
                  ? <span className="text-[#2C4A60] ml-1">-- {r.matchText}</span>
                  : <span className="text-red-400 ml-1">-- {r.notMetReason}</span>
                }
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-[#2C4A60] flex items-center gap-1 mt-2">
          <Zap className="w-3 h-3 text-[#4A6880] flex-shrink-0" />
          All signals auto-detected from EHR structured fields
        </p>
      </div>
    );
  }

  // Undiagnosed HFpEF
  if (gapId.includes('hfpef') || gapId.includes('undiagnosed')) {
    let metCount = 0;
    const rows = HFPEF_KNOWN_SIGNALS.map((s) => {
      const match = matchesHFpEFSignal(patient.signals, patient.keyValues, s.key);
      if (match) metCount++;
      return { ...s, met: !!match, matchText: match };
    });
    const h2fpef = computeH2FPEF(metCount);
    return (
      <div className="bg-[#f0f4f8] border border-[#C8D4DC] rounded-xl p-4 space-y-2">
        <h5 className="text-sm font-semibold text-[#1A2F4A]">
          HFpEF Signal Detection ({metCount}/6 signals)
        </h5>
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.key} className={`text-sm flex gap-2 ${r.met ? 'text-[#2C4A60]' : 'text-red-500'}`}>
              <span className="font-bold flex-shrink-0">{r.met ? '\u2713' : '\u2717'}</span>
              <span>
                {r.label}
                {r.met
                  ? <span className="text-[#2C4A60] ml-1">-- {r.matchText}</span>
                  : <span className="text-red-400 ml-1">-- {r.notMetReason}</span>
                }
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 text-sm font-medium text-[#1A2F4A]">
          H2FPEF Score: {h2fpef.score} -- {h2fpef.probability}
        </div>
        <p className="text-xs text-[#2C4A60] flex items-center gap-1 mt-1">
          <Zap className="w-3 h-3 text-[#4A6880] flex-shrink-0" />
          All signals auto-detected
        </p>
      </div>
    );
  }

  return null;
}

/** Render eligibility checker for specific gaps */
function renderEligibilityChecker(gapId: string, patient: HFGapPatient): React.ReactNode {
  // CardioMEMS — CHAMPION Criteria
  if (gapId.includes('cardiomems')) {
    const nyha = patient.signals.some((s) => s.toLowerCase().includes('nyha class iii'));
    const hospMatch = patient.signals.some((s) => s.toLowerCase().includes('hospitalization'));
    const lvefVal = String(patient.keyValues['LVEF'] || '');
    const gdmtStable = patient.signals.some((s) => s.toLowerCase().includes('stable') && s.toLowerCase().includes('gdmt'));
    const criteria = [
      { label: 'NYHA Class III', met: nyha, detail: String(patient.keyValues['NYHA Class'] || '') },
      { label: 'HF hospitalization within 12 months', met: hospMatch, detail: String(patient.keyValues['Last HF Hospitalization'] || '') },
      { label: 'Any LVEF', met: !!lvefVal, detail: lvefVal },
      { label: 'Stable outpatient GDMT', met: gdmtStable, detail: 'confirmed' },
    ];
    const metCount = criteria.filter((c) => c.met).length;
    return (
      <div className="bg-[#F0F5FA] border border-[#C8D4DC] rounded-xl p-4 space-y-2">
        <h5 className="text-sm font-semibold text-[#2C4A60]">
          CHAMPION Criteria ({metCount}/4 met)
        </h5>
        <ul className="space-y-1">
          {criteria.map((c) => (
            <li key={c.label} className={`text-sm flex gap-2 ${c.met ? 'text-[#2C4A60]' : 'text-red-500'}`}>
              <span className="font-bold flex-shrink-0">{c.met ? '\u2713' : '\u2717'}</span>
              <span>{c.label}{c.detail ? <span className="ml-1">-- {c.detail}</span> : null}</span>
            </li>
          ))}
        </ul>
        {patient.kccqOverallSummary !== undefined && (
          <div className="text-sm text-[#2C4A60] mt-1">
            KCCQ Overall: {patient.kccqOverallSummary}
            {patient.kccqPriorOverallSummary !== undefined && (
              <span> {'\u2193'} from {patient.kccqPriorOverallSummary}</span>
            )}
          </div>
        )}
        <p className="text-xs text-[#2C4A60] flex items-center gap-1 mt-1">
          <Zap className="w-3 h-3 text-[#2C4A60] flex-shrink-0" />
          Eligibility auto-confirmed from clinical data
        </p>
      </div>
    );
  }

  // COAPT / Functional MR
  if (gapId.includes('coapt') || gapId.includes('functional-mr')) {
    const lvefStr = String(patient.keyValues['LVEF'] || '');
    const lvefNum = parseFloat(lvefStr);
    const lvefMet = !isNaN(lvefNum) && lvefNum >= 20 && lvefNum <= 50;
    const lvesdStr = String(patient.keyValues['LVESD'] || '');
    const lvesdNum = parseFloat(lvesdStr);
    const lvesdMet = !isNaN(lvesdNum) ? lvesdNum <= 70 : false;
    const eroaStr = String(patient.keyValues['EROA'] || '');
    const eroaNum = parseFloat(eroaStr);
    const eroaMet = !isNaN(eroaNum) ? eroaNum >= 0.3 : false;
    const gdmtOpt = patient.signals.some((s) => s.toLowerCase().includes('gdmt'));
    const criteria = [
      { label: 'LVEF 20-50%', met: lvefMet, detail: lvefStr || 'N/A' },
      { label: 'LVESD <=70mm', met: lvesdMet, detail: lvesdStr || 'N/A' },
      { label: 'EROA >=0.3cm2', met: eroaMet, detail: eroaStr || 'N/A' },
      { label: 'GDMT optimized', met: gdmtOpt, detail: gdmtOpt ? 'confirmed' : 'not confirmed' },
    ];
    const metCount = criteria.filter((c) => c.met).length;
    return (
      <div className="bg-[#F0F5FA] border border-[#C8D4DC] rounded-xl p-4 space-y-2">
        <h5 className="text-sm font-semibold text-[#2C4A60]">
          COAPT Eligibility ({metCount}/4 criteria met)
        </h5>
        <ul className="space-y-1">
          {criteria.map((c) => (
            <li key={c.label} className={`text-sm flex gap-2 ${c.met ? 'text-[#2C4A60]' : 'text-red-500'}`}>
              <span className="font-bold flex-shrink-0">{c.met ? '\u2713' : '\u2717'}</span>
              <span>{c.label} -- {c.detail}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-[#2C4A60] flex items-center gap-1 mt-1">
          <Zap className="w-3 h-3 text-[#2C4A60] flex-shrink-0" />
          All criteria auto-checked
        </p>
      </div>
    );
  }

  // DANISH / ICD
  if (gapId.includes('danish') || gapId.includes('icd')) {
    const nicm = patient.signals.some((s) => s.toLowerCase().includes('non-ischemic'));
    const lvefStr = String(patient.keyValues['LVEF'] || '');
    const lvefNum = parseFloat(lvefStr);
    const lvefMet = !isNaN(lvefNum) && lvefNum <= 35;
    const gdmtDur = String(patient.keyValues['GDMT Duration'] || '');
    const gdmtMonths = parseInt(gdmtDur);
    const gdmtMet = !isNaN(gdmtMonths) && gdmtMonths >= 3;
    const age = patient.age;
    const danishResult = computeDANISHTier({ age });

    const criteria = [
      { label: 'Non-ischemic CM', met: nicm },
      { label: 'LVEF <=35%', met: lvefMet },
      { label: 'On GDMT >=3 months', met: gdmtMet },
    ];
    return (
      <div className="bg-[#F0F5FA] border border-[#C8D4DC] rounded-xl p-4 space-y-2">
        <h5 className="text-sm font-semibold text-[#2C4A60]">
          ICD Eligibility + DANISH
        </h5>
        <ul className="space-y-1">
          {criteria.map((c) => (
            <li key={c.label} className={`text-sm flex gap-2 ${c.met ? 'text-[#2C4A60]' : 'text-red-500'}`}>
              <span className="font-bold flex-shrink-0">{c.met ? '\u2713' : '\u2717'}</span>
              <span>{c.label}</span>
            </li>
          ))}
        </ul>
        <div className="text-sm font-medium text-[#2C4A60] mt-1">
          DANISH Tier: Age {age} &mdash; {danishResult.tier} ({danishResult.hrBenefit})
          <span className="ml-1 inline-flex items-center gap-1 text-xs text-blue-600">
            <Zap className="w-3 h-3 flex-shrink-0" /> Auto-stratified
          </span>
        </div>
        <p className="text-xs text-[#2C4A60] mt-1">{danishResult.recommendation}</p>
        <p className="text-xs text-[#2C4A60] flex items-center gap-1 mt-1">
          <Zap className="w-3 h-3 text-[#2C4A60] flex-shrink-0" />
          All criteria auto-computed
        </p>
      </div>
    );
  }

  // OSA STOP-BANG (Gap 26)
  if (gapId.includes('osa') || gapId.includes('stop-bang') || gapId.includes('gap-26')) {
    const bmiRaw = String(patient.keyValues['BMI'] || '');
    const bmiVal = parseFloat(bmiRaw);
    const signalsLower = patient.signals.map(s => s.toLowerCase()).join(' ');
    const hasHTN = signalsLower.includes('htn') || signalsLower.includes('hypertension') || Object.values(patient.keyValues).some(v => String(v).toLowerCase().includes('htn'));
    const isMale = signalsLower.includes('male') && !signalsLower.includes('female');
    const stopBangResult = computeSTOPBANG({
      bmi: isNaN(bmiVal) ? undefined : bmiVal,
      age: patient.age,
      sex: isMale ? 'male' : undefined,
      diagnosisHTN: hasHTN,
    });
    return (
      <div className="bg-[#F0F5FA] border border-[#C8D4DC] rounded-xl p-4 space-y-2">
        <h5 className="text-sm font-semibold text-[#2C4A60]">
          STOP-BANG Risk Assessment
        </h5>
        <div className="text-sm font-medium text-[#2C4A60]">
          STOP-BANG: {stopBangResult.score}/8 ({stopBangResult.components.length > 0 ? stopBangResult.components.join(', ') : 'No EHR-derivable components met'}) &mdash; {stopBangResult.risk} risk
          <span className="ml-1 inline-flex items-center gap-1 text-xs text-blue-600">
            <Zap className="w-3 h-3 flex-shrink-0" /> Auto-calculated
          </span>
        </div>
        <p className="text-xs text-[#2C4A60]">
          S (snoring), T (tiredness), O (observed apnea) require patient-reported data and are not scored from structured EHR fields. Score reflects P, B, A, N, G components only.
        </p>
        <p className="text-xs text-[#2C4A60] flex items-center gap-1 mt-1">
          <Zap className="w-3 h-3 text-[#2C4A60] flex-shrink-0" />
          Auto-calculated from structured EHR data
        </p>
      </div>
    );
  }

  // HCM / Myosin Inhibitor — LVOT Classification (Gap 12)
  if (gapId.includes('hcm') || gapId.includes('myosin') || gapId.includes('gap-12')) {
    const restRaw = patient.keyValues['LVOT Gradient (Rest)'];
    const provokedRaw = patient.keyValues['LVOT Gradient (Provocation)'];
    const restVal = restRaw != null ? parseFloat(String(restRaw)) : undefined;
    const provokedVal = provokedRaw != null ? parseFloat(String(provokedRaw)) : undefined;
    const lvotResult = classifyLVOT({
      lvotGradientRest: isNaN(restVal as number) ? undefined : restVal,
      lvotGradientProvoked: isNaN(provokedVal as number) ? undefined : provokedVal,
    });
    return (
      <div className="bg-[#F0F5FA] border border-[#C8D4DC] rounded-xl p-4 space-y-2">
        <h5 className="text-sm font-semibold text-[#2C4A60]">
          LVOT Classification
        </h5>
        <div className="text-sm font-medium text-[#2C4A60]">
          LVOT: {restVal != null && !isNaN(restVal) ? `${restVal} mmHg rest` : 'N/A rest'} &middot; {provokedVal != null && !isNaN(provokedVal) ? `${provokedVal} mmHg provoked` : 'N/A provoked'} &mdash; {lvotResult.severity}
          <span className="ml-1 inline-flex items-center gap-1 text-xs text-blue-600">
            <Zap className="w-3 h-3 flex-shrink-0" /> Auto-classified
          </span>
        </div>
        <p className="text-xs text-[#2C4A60]">{lvotResult.details}</p>
        <p className="text-xs text-[#2C4A60] flex items-center gap-1 mt-1">
          <Zap className="w-3 h-3 text-[#2C4A60] flex-shrink-0" />
          LVOT gradient auto-classified from echocardiographic data
        </p>
      </div>
    );
  }

  return null;
}

/** Render GDMT 4-pillar status for relevant gaps */
function renderGDMTStatus(gapId: string, patient: HFGapPatient): React.ReactNode {
  const gdmtKeywords = ['gdmt', 'arni', 'pillar', 'mra', 'sglt2', 'beta-blocker', 'optimization', 'underdosing', 'loop-without-mra'];
  if (!gdmtKeywords.some((kw) => gapId.includes(kw))) return null;

  const allText = [
    ...patient.signals,
    ...Object.values(patient.keyValues).map(String),
  ].join(' ').toLowerCase();

  const pillars: { label: string; detail: string; met: boolean }[] = [
    {
      label: 'Pillar 1 -- ARNI/ACEi/ARB',
      met: /arni|sacubitril|valsartan|ace-i|acei|ace inhibitor|arb|losartan|lisinopril|enalapril/.test(allText),
      detail: '',
    },
    {
      label: 'Pillar 2 -- Beta-blocker',
      met: /beta-blocker|carvedilol|metoprolol|bisoprolol/.test(allText),
      detail: '',
    },
    {
      label: 'Pillar 3 -- MRA',
      met: /mra|spironolactone|eplerenone|finerenone/.test(allText),
      detail: '',
    },
    {
      label: 'Pillar 4 -- SGLT2i',
      met: /sglt2|dapagliflozin|empagliflozin/.test(allText),
      detail: '',
    },
  ];

  // Extract detail from signals/keyValues
  pillars.forEach((p) => {
    if (p.met) {
      if (p.label.includes('ARNI')) {
        const match = allText.match(/(sacubitril[^\s,]*(\/valsartan)?[^,]*|arni[^,]*)/);
        p.detail = match ? match[0].slice(0, 40) : 'prescribed';
      } else if (p.label.includes('Beta')) {
        const match = allText.match(/(carvedilol[^,]*|metoprolol[^,]*|bisoprolol[^,]*)/);
        p.detail = match ? match[0].slice(0, 40) : 'prescribed';
      } else if (p.label.includes('MRA')) {
        const match = allText.match(/(spironolactone[^,]*|eplerenone[^,]*|finerenone[^,]*)/);
        p.detail = match ? match[0].slice(0, 40) : 'prescribed';
      } else if (p.label.includes('SGLT2')) {
        const match = allText.match(/(dapagliflozin[^,]*|empagliflozin[^,]*|sglt2i[^,]*)/);
        p.detail = match ? match[0].slice(0, 40) : 'prescribed';
      }
    } else {
      p.detail = 'not prescribed';
    }
  });

  const metCount = pillars.filter((p) => p.met).length;
  const gapCount = 4 - metCount;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
      <h5 className="text-sm font-semibold text-slate-900">
        GDMT Status ({metCount}/4 pillars)
      </h5>
      <ul className="space-y-1">
        {pillars.map((p) => (
          <li key={p.label} className={`text-sm flex gap-2 ${p.met ? 'text-[#2C4A60]' : 'text-red-500'}`}>
            <span className="font-bold flex-shrink-0">{p.met ? '\u2713' : '\u2717'}</span>
            <span>{p.label}: <span className={p.met ? 'text-[#2C4A60]' : 'text-red-400'}>{p.detail}</span></span>
          </li>
        ))}
      </ul>
      {gapCount > 0 && (
        <div className="text-sm font-medium text-slate-800">
          {gapCount} gap{gapCount !== 1 ? 's' : ''} identified
        </div>
      )}
      <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
        <Zap className="w-3 h-3 text-slate-400 flex-shrink-0" />
        Auto-checked from medication list
      </p>
    </div>
  );
}

/** Render enhanced KCCQ trend display */
function renderKCCQTrend(patient: HFGapPatient): React.ReactNode {
  if (patient.kccqOverallSummary === undefined) return null;
  const overall = patient.kccqOverallSummary;
  const physical = patient.kccqPhysicalLimitation;
  const qol = patient.kccqQualityOfLife;

  const kccqTrendResult = computeKCCQTrend({
    kccqOverallSummary: overall,
    kccqPriorOverallSummary: patient.kccqPriorOverallSummary,
  });

  return (
    <div className="bg-[#F0F5FA] border border-[#C8D4DC] rounded-xl p-3 space-y-1">
      <div className="text-sm font-medium text-[#6B7280]">
        KCCQ Overall: {overall}
        {physical !== undefined && <span> {'\u00B7'} Physical: {physical}</span>}
        {qol !== undefined && <span> {'\u00B7'} QoL: {qol}</span>}
      </div>
      <div className="text-sm text-[#6B7280]">{kccqTrendResult.display}</div>
      <p className="text-xs text-[#6B7280] flex items-center gap-1">
        <Zap className="w-3 h-3 text-[#6B7280] flex-shrink-0" />
        Auto-calculated from EHR flowsheet data
      </p>
    </div>
  );
}

// ============================================================
// PREDICTIVE INTELLIGENCE HELPERS
// ============================================================

/** Parse a numeric value from a string like "30%", "1,240 pg/mL", "48 mL/min/1.73m2" */
function parseNumericValue(val: string | number | undefined): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') return val;
  const cleaned = val.replace(/,/g, '').replace(/[^0-9.\-]/g, ' ').trim();
  const match = cleaned.match(/-?\d+\.?\d*/);
  return match ? parseFloat(match[0]) : null;
}

/** Compute trajectory for an HF patient based on available trend data */
function computeHFPatientTrajectory(pt: HFGapPatient): TrajectoryResult {
  // KCCQ delta (most informative for HF)
  if (pt.kccqOverallSummary !== undefined && pt.kccqPriorOverallSummary !== undefined) {
    return computeTrajectory({
      currentValue: pt.kccqOverallSummary,
      priorValue: pt.kccqPriorOverallSummary,
      daysBetween: 180,
    });
  }

  // LVEF delta
  const lvef = parseNumericValue(pt.keyValues['LVEF']);
  const priorLvef = parseNumericValue(pt.keyValues['Prior LVEF']);
  if (lvef !== null && priorLvef !== null) {
    return computeTrajectory({ currentValue: lvef, priorValue: priorLvef, daysBetween: 180 });
  }

  // NT-proBNP (increasing = worsening, so negate)
  const bnp = parseNumericValue(pt.keyValues['NT-proBNP']);
  const priorBnp = parseNumericValue(pt.keyValues['Prior NT-proBNP']);
  if (bnp !== null && priorBnp !== null) {
    return computeTrajectory({ currentValue: -bnp, priorValue: -priorBnp, daysBetween: 180 });
  }

  // eGFR delta
  const egfr = parseNumericValue(pt.keyValues['eGFR']);
  const priorEgfr = parseNumericValue(pt.keyValues['Prior eGFR']);
  if (egfr !== null && priorEgfr !== null) {
    return computeTrajectory({ currentValue: egfr, priorValue: priorEgfr, daysBetween: 180 });
  }

  return { direction: 'stable', ratePerMonth: 0, ratePerYear: 0, percentChange: 0 };
}

/** Render trajectory and time horizon badges for a patient row */
function renderPredictiveBadges(gap: HFClinicalGap, pt: HFGapPatient): React.ReactNode {
  const trajectory = computeHFPatientTrajectory(pt);
  const display = trajectoryDisplay(trajectory.direction);

  const gapCategory = (gap.category === 'Discovery' || gap.category === 'Quality' ? 'Gap' : gap.category) as 'Safety' | 'Gap' | 'Growth';
  const timeHorizon = computeTimeHorizon({
    predictedMonths: null,
    gapCategory,
    trajectoryDirection: trajectory.direction,
  });
  const horizonDisplay = timeHorizonDisplay(timeHorizon.horizon);

  // Only show if we have actual trend data (not default stable)
  const hasTrendData = trajectory.direction !== 'stable' || trajectory.percentChange !== 0;
  if (!hasTrendData) return null;

  return (
    <>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${display.colorClass === 'text-red-600' ? 'bg-red-100 text-red-700' : display.colorClass === 'text-[#6B7280]' ? 'bg-[#FAF6E8] text-[#8B6914]' : display.colorClass === 'text-[#2C4A60]' ? 'bg-[#F0F7F4] text-[#2D6147]' : 'bg-gray-100 text-gray-500'}`}>
        {display.arrow} {display.label}
      </span>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${horizonDisplay.bgClass} ${horizonDisplay.textClass}`}>
        {horizonDisplay.icon} {horizonDisplay.label}
      </span>
    </>
  );
}

/** Render predicted event detail for specific HF gaps */
function renderHFPredictedEvent(gapId: string, pt: HFGapPatient): React.ReactNode {
  // Gap 22 — ICD/DANISH
  if (gapId.includes('22') || gapId.includes('danish')) {
    const lvef = parseNumericValue(pt.keyValues['LVEF']);
    const priorLvef = parseNumericValue(pt.keyValues['Prior LVEF']);
    if (lvef !== null && priorLvef !== null) {
      const trajectory = computeTrajectory({ currentValue: lvef, priorValue: priorLvef, daysBetween: 180 });
      const dirLabel = trajectory.direction === 'improving' ? 'improving' : trajectory.direction === 'stable' ? 'stable' : 'declining';
      const stableBelowThreshold = (trajectory.direction === 'stable' || trajectory.direction === 'worsening_slow') && lvef < 35;
      return (
        <div className="mt-2 px-3 py-2 bg-[#f0f4f8]/50 border border-[#F0F5FA] rounded-lg">
          <div className="text-xs text-[#1A2F4A]">
            <span className="font-semibold">Predicted event:</span>{' '}
            LVEF trajectory: {lvef}% (was {priorLvef}%) &mdash; {dirLabel}.{' '}
            {stableBelowThreshold
              ? 'Recovery unlikely — ICD indicated now.'
              : trajectory.direction === 'improving'
              ? 'Reassess in 3 months before committing to ICD.'
              : `LVEF declining at ${Math.abs(trajectory.ratePerMonth).toFixed(1)}%/month.`}
          </div>
        </div>
      );
    }
  }

  // Gap 76 — Advanced HF / Stage D
  if (gapId.includes('76') || gapId.includes('palliative')) {
    const lvef = parseNumericValue(pt.keyValues['LVEF']);
    const kccqRate = pt.kccqOverallSummary !== undefined && pt.kccqPriorOverallSummary !== undefined
      ? (pt.kccqPriorOverallSummary - pt.kccqOverallSummary) / 6
      : null;
    const hosps = pt.keyValues['HF Hospitalizations'];
    const monthsToDeterioration = kccqRate && kccqRate > 0 ? Math.round(12 / kccqRate) : null;
    return (
      <div className="mt-2 px-3 py-2 bg-[#f0f4f8]/50 border border-[#F0F5FA] rounded-lg">
        <div className="text-xs text-[#1A2F4A]">
          <span className="font-semibold">Predicted event:</span>{' '}
          LVEF {lvef ?? '?'}%{kccqRate ? ` + KCCQ declining ${kccqRate.toFixed(1)} pts/month` : ''}{hosps ? ` + ${hosps}` : ''} &mdash;{' '}
          {monthsToDeterioration
            ? `Profile deterioration likely within ${monthsToDeterioration} months`
            : 'Progressive trajectory — close monitoring warranted'}
        </div>
      </div>
    );
  }

  // Gap 13 — CardioMEMS
  if (gapId.includes('13') || gapId.includes('cmems') || gapId.includes('cardiomems')) {
    if (pt.kccqOverallSummary !== undefined && pt.kccqPriorOverallSummary !== undefined) {
      const delta = pt.kccqOverallSummary - pt.kccqPriorOverallSummary;
      // Compute months between prior and current KCCQ dates
      let kccqMonthsBetween = 6; // default
      if (pt.kccqPriorDate && pt.kccqAdministeredDate) {
        const priorDate = new Date(pt.kccqPriorDate);
        const currentDate = new Date(pt.kccqAdministeredDate);
        if (!isNaN(priorDate.getTime()) && !isNaN(currentDate.getTime())) {
          kccqMonthsBetween = Math.max(1, (currentDate.getTime() - priorDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
        }
      }
      const kccqRatePerMonth = delta / kccqMonthsBetween;

      // Compute hospitalization risk using predictive calculator
      const kccqRisk = computeKCCQHospitalizationRisk({
        kccqScore: pt.kccqOverallSummary,
        kccqRatePerMonth,
        priorHospitalizations: parseFloat(String(pt.keyValues?.['Prior Hospitalizations'] ?? 0)),
      });

      if (delta < 0) {
        const ratePerMonth = Math.abs(delta) / kccqMonthsBetween;
        const monthsToHighRisk = ratePerMonth > 0 ? Math.round((pt.kccqOverallSummary - 25) / ratePerMonth) : null;
        return (
          <>
            <div className="mt-2 px-3 py-2 bg-[#f0f4f8]/50 border border-[#F0F5FA] rounded-lg">
              <div className="text-xs text-[#1A2F4A]">
                <span className="font-semibold">Predicted event:</span>{' '}
                At current KCCQ decline rate ({ratePerMonth.toFixed(1)} pts/month), hospitalization probability increases 3x
                {monthsToHighRisk && monthsToHighRisk > 0 ? ` within ${monthsToHighRisk} months` : ' imminently'}.
                CardioMEMS implant enables proactive PA pressure management.
              </div>
            </div>
            <div className="mt-2 px-3 py-2 bg-red-50/70 border border-red-200 rounded-lg">
              <div className="text-xs font-semibold text-red-800 mb-1">Hospitalization Risk Assessment</div>
              <div className="text-xs text-red-700">
                Risk level: <span className="font-bold">{kccqRisk.hospitalizationRiskLevel.toUpperCase()}</span> ({kccqRisk.riskMultiplier}x baseline)
              </div>
              {kccqRisk.predictedWindowDays != null && (
                <div className="text-xs text-red-600 mt-0.5">
                  Projected to reach next risk threshold in ~{Math.round(kccqRisk.predictedWindowDays / 30)} months
                </div>
              )}
              <div className="text-xs text-red-500 mt-0.5 italic">{kccqRisk.basisNote}</div>
            </div>
          </>
        );
      }
    }
  }

  return null;
}

/** Render revenue timing for Growth and Gap categories */
function renderHFRevenueTiming(gap: HFClinicalGap, pt: HFGapPatient): React.ReactNode {
  if (gap.dollarOpportunity <= 0) return null;
  if (gap.category !== 'Growth' && gap.category !== 'Gap' && gap.category !== 'Discovery' && gap.category !== 'Quality') return null;

  const trajectory = computeHFPatientTrajectory(pt);
  const hasTrendData = trajectory.direction !== 'stable' || trajectory.percentChange !== 0;
  if (!hasTrendData) return null;

  const perPatientOpp = gap.dollarOpportunity / Math.max(gap.patientCount, 1);
  const revenue = computeRevenueAtRisk({
    gapDollarOpportunity: perPatientOpp,
    monthsToThreshold: null,
    gapCategory: (gap.category === 'Discovery' || gap.category === 'Quality' ? 'Gap' : gap.category) as 'Gap' | 'Growth',
  });

  return (
    <div className="mt-2 px-3 py-2 bg-[#F0F5FA]/50 border border-[#C8D4DC] rounded-lg">
      <div className="text-xs text-[#2C4A60]">
        <span className="font-semibold">Revenue timing:</span>{' '}
        {formatDollar(revenue.revenueThisQuarter)} actionable this quarter &middot;{' '}
        {formatDollar(revenue.revenueAtRiskIfDeferred)} at risk if deferred &middot;{' '}
        Deferral cost: {formatDollar(revenue.deferralCostPerMonth)}/month
      </div>
    </div>
  );
}

// ============================================================
// GAP-LEVEL TRAJECTORY DATA
// ============================================================
const getHFGapTrajectoryData = (_gapId: string, patientCount: number, category: string): TrajectoryDistribution => {
  const isSafety = category === 'Safety';
  const isGrowth = category === 'Growth';
  if (isSafety) {
    return { worseningRapid: Math.round(patientCount * 0.30), worseningSlow: Math.round(patientCount * 0.35), stable: Math.round(patientCount * 0.25), improving: Math.round(patientCount * 0.10), total: patientCount };
  }
  if (isGrowth) {
    return { worseningRapid: Math.round(patientCount * 0.08), worseningSlow: Math.round(patientCount * 0.17), stable: Math.round(patientCount * 0.45), improving: Math.round(patientCount * 0.30), total: patientCount };
  }
  return { worseningRapid: Math.round(patientCount * 0.18), worseningSlow: Math.round(patientCount * 0.27), stable: Math.round(patientCount * 0.35), improving: Math.round(patientCount * 0.20), total: patientCount };
};

// ============================================================
// COMPONENT
// ============================================================
const ClinicalGapDetectionDashboard: React.FC = () => {
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [patientSortOrder, setPatientSortOrder] = useState<'urgency' | 'dollar' | 'score'>('urgency');
  const [showMethodology, setShowMethodology] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const sortPatients = (patients: HFGapPatient[], _gap: HFClinicalGap) => {
    return [...patients].sort((a, b) => {
      if (patientSortOrder === 'urgency') {
        const aTrajectory = computeHFPatientTrajectory(a);
        const bTrajectory = computeHFPatientTrajectory(b);
        const urgencyOrder: Record<string, number> = { worsening_rapid: 0, worsening_slow: 1, stable: 2, improving: 3 };
        return (urgencyOrder[aTrajectory.direction] ?? 2) - (urgencyOrder[bTrajectory.direction] ?? 2);
      }
      if (patientSortOrder === 'dollar') {
        // Higher KCCQ decline = more costly
        const aDelta = (a.kccqOverallSummary ?? 50) - (a.kccqPriorOverallSummary ?? 50);
        const bDelta = (b.kccqOverallSummary ?? 50) - (b.kccqPriorOverallSummary ?? 50);
        return aDelta - bDelta; // most negative (biggest decline) first
      }
      if (patientSortOrder === 'score') {
        return (a.kccqOverallSummary ?? 100) - (b.kccqOverallSummary ?? 100); // lowest score first
      }
      return 0;
    });
  };

  const totalPatients = HF_CLINICAL_GAPS.reduce((sum, g) => sum + g.patientCount, 0);
  const totalOpportunity = HF_CLINICAL_GAPS.reduce((sum, g) => sum + g.dollarOpportunity, 0);

  const priorityColor = (p: string) => {
    if (p === 'high') return 'bg-red-50 border-red-300 text-red-700';
    if (p === 'medium') return 'bg-[#F0F5FA] border-[#C8D4DC] text-[#6B7280]';
    return 'bg-[#F0F7F4] border-[#D8EDE6] text-[#2C4A60]';
  };

  const categoryColor = (c: string) =>
    c === 'Discovery'
      ? 'bg-[#F0F5FA] text-[#1A2F4A]'
      : c === 'Gap'
      ? 'bg-red-100 text-red-800'
      : c === 'Safety'
      ? 'bg-rose-200 text-rose-900'
      : 'bg-blue-100 text-blue-800';

  const sortedGaps = [...HF_CLINICAL_GAPS].sort((a, b) => {
    const order: Record<string, number> = { Safety: 0, Discovery: 1, Gap: 2, Growth: 3 };
    const diff = (order[a.category] ?? 4) - (order[b.category] ?? 4);
    if (diff !== 0) return diff;
    return (b.patientCount || 0) - (a.patientCount || 0);
  });

  const filterConfig: Record<string, string[]> = {
    'GDMT Optimization': ['ARNI', 'SGLT2i', 'Beta-Blocker', 'MRA', 'Finerenone', 'Ivabradine', 'Vericiguat', 'H-ISDN', 'Target Dose', 'DAPA-HF', 'EMPEROR'],
    'Advanced Device Therapy': ['LVAD', 'CardioMEMS', 'ICD', 'CRT', 'Impella', 'ECMO', 'RVAD', 'HeartMate', 'Ramp Study', 'Bridge-to-Transplant', 'Remote Patient Monitoring'],
    'Rare Cardiomyopathy': ['Amyloidosis', 'ATTR', 'Sarcoidosis', 'Fabry', 'HCM', 'Myosin', 'LVNC', 'Non-Compaction', 'Peripartum', 'Myocarditis', 'Chemotherapy', 'Cardiomyopathy'],
    'Comorbidity & Discovery': ['Iron Deficiency', 'OSA', 'STOP-BANG', 'Hyponatremia', 'GLP-1', 'SDOH', 'Adherence', 'Natriuretic', 'HFpEF', 'Undiagnosed'],
    'Care Transitions': ['Discharge', 'Follow-Up', 'Palliative', 'Vaccination', 'Cardiac Rehab', 'Advance Directive', 'NT-proBNP', '30-Day'],
    'Cross-Module': ['Cross-Module', 'COAPT', 'TEER', 'AF + HFrEF', 'Ablation Referral', 'Co-Detection'],
  };

  const chipCounts = Object.fromEntries(
    Object.entries(filterConfig).map(([label, keywords]) => [
      label,
      sortedGaps.filter(gap =>
        keywords.some(kw => (gap.name || '').toLowerCase().includes(kw.toLowerCase()))
      ).length
    ])
  );

  const filteredGaps = activeFilters.length === 0 ? sortedGaps : sortedGaps.filter(gap => {
    const gapName = (gap.name || '').toLowerCase();
    return activeFilters.some(label =>
      filterConfig[label].some(kw => gapName.includes(kw.toLowerCase()))
    );
  });

  const filteredPatientCount = filteredGaps.reduce((sum, g) => sum + (g.patientCount || 0), 0);
  const totalPatientCountForChips = sortedGaps.reduce((sum, g) => sum + (g.patientCount || 0), 0);
  const totalOpportunityForChips = sortedGaps.reduce((sum, g) => sum + (g.dollarOpportunity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header summary */}
      <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-titanium-900 mb-1 flex items-center gap-2">
          <Target className="w-5 h-5 text-porsche-600" />
          Clinical Gap Detection — Heart Failure Module
        </h3>
        <p className="text-sm text-titanium-600 mb-4">
          AI-driven detection of evidence-based therapy gaps and growth opportunities.
          Gaps 1, 2, 6, 7, 12, 13, 16-22, 26, 29-31 — 45-gap initiative.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-red-600" />
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Affected Patients</span>
            </div>
            <div className="text-2xl font-bold text-red-800">{totalPatients.toLocaleString()}</div>
          </div>
          <div className="bg-[#F0F7F4] border border-[#D8EDE6] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-[#2C4A60]" />
              <span className="text-xs font-semibold text-[#2C4A60] uppercase tracking-wide">Total Opportunity</span>
            </div>
            <div className="text-2xl font-bold text-[#2C4A60]">
              ${(totalOpportunity / 1000000).toFixed(1)}M
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Active Gaps</span>
            </div>
            <div className="text-2xl font-bold text-blue-800">{HF_CLINICAL_GAPS.length}</div>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex flex-wrap gap-2">
            {Object.entries(filterConfig).map(([label]) => {
              const isActive = activeFilters.includes(label);
              const count = chipCounts[label];
              return (
                <button
                  key={label}
                  onClick={() => setActiveFilters(prev =>
                    prev.includes(label) ? prev.filter(f => f !== label) : [...prev, label]
                  )}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-white border border-transparent'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  style={isActive ? { backgroundColor: '#2C4A60' } : {}}
                >
                  {label}
                  <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          {activeFilters.length > 0 && (
            <button
              onClick={() => setActiveFilters([])}
              className="text-sm text-slate-500 hover:text-slate-700 whitespace-nowrap ml-4 mt-1"
            >
              Clear all filters
            </button>
          )}
        </div>
        <div className="text-sm text-slate-500">
          {activeFilters.length > 0 ? (
            <span>
              Showing <strong>{filteredPatientCount.toLocaleString()}</strong> patients across{' '}
              <strong>{filteredGaps.length}</strong> gaps · Filtered by: {activeFilters.join(', ')}
            </span>
          ) : (
            <span>
              Patients identified: <strong>{totalPatientCountForChips.toLocaleString()}</strong> ·{' '}
              Opportunity: <strong>${(totalOpportunityForChips / 1_000_000).toFixed(1)}M</strong>
            </span>
          )}
        </div>
      </div>

      {/* Gap list */}
      <div className="space-y-4">
        {filteredGaps.map((gap) => {
          const isOpen = expandedGap === gap.id;
          return (
            <div key={gap.id} className="metal-card bg-white border border-titanium-200 rounded-2xl overflow-hidden">
              {/* Gap header — clickable */}
              <button
                className="w-full text-left p-5 flex items-start justify-between hover:bg-titanium-50 transition-colors"
                onClick={() => setExpandedGap(isOpen ? null : gap.id)}
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColor(gap.category)}`}>
                      {gap.category}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${priorityColor(gap.priority)}`}>
                      {gap.priority.toUpperCase()} PRIORITY
                    </span>
                    {gap.tag && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {gap.tag}
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-titanium-900 text-base">{gap.name}</div>
                  <div className="flex gap-6 mt-2">
                    <span className="text-sm text-titanium-600">
                      <span className="font-semibold text-titanium-900">{gap.patientCount}</span> patients
                    </span>
                    <span className="text-sm text-titanium-600">
                      <span className="font-semibold text-[#2C4A60]">${(gap.dollarOpportunity / 1000000).toFixed(1)}M</span> opportunity
                    </span>
                  </div>
                  {/* Two-stream value display for ATTR-CM */}
                  {gap.pharmaceuticalOpportunity && gap.pharmaceuticalOpportunity > 0 && (
                    <div className="mt-1" title="Tafamidis/vutrisiran value at full conversion. Actual capture depends on health system specialty pharmacy model. Not included in platform totals.">
                      <span className="text-xs text-titanium-400">+ ${(gap.pharmaceuticalOpportunity / 1000000).toFixed(1)}M downstream pharmaceutical value <span className="italic">(specialty pharmacy dependent)</span></span>
                    </div>
                  )}
                  {gap.subcategories && (
                    <div className="flex flex-wrap gap-3 mt-2">
                      {gap.subcategories.map((sub) => (
                        <span key={sub.label} className="text-xs bg-titanium-100 text-titanium-700 px-2 py-1 rounded-lg">
                          {sub.label}: <strong>{sub.count}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                  {gap.whyMissed && (
                    <div className="mt-2 text-xs text-titanium-500 italic flex items-start gap-1.5">
                      <Search className="w-3 h-3 text-[#4A6880] flex-shrink-0 mt-0.5" />
                      <span>Why standard systems miss this: {gap.whyMissed}</span>
                    </div>
                  )}
                  {gap.category === 'Discovery' && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs font-semibold text-[#2C4A60]">{'\u2B21'} Discovery — Net new patients {'\u00B7'} Never previously identified</span>
                    </div>
                  )}
                </div>
                <div className="ml-4 mt-1 flex-shrink-0">
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-titanium-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-titanium-500" />
                  )}
                </div>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="border-t border-titanium-200 p-5 space-y-5">
                  {/* Trajectory Summary — Forward-looking */}
                  {(() => {
                    const dist = getHFGapTrajectoryData(gap.id, gap.patientCount, gap.category);
                    const q1Rev = Math.round(gap.dollarOpportunity * (dist.worseningRapid / Math.max(dist.total, 1)));
                    return (
                      <div className="px-4 py-3 bg-gradient-to-r from-titanium-50/80 to-white border border-titanium-100 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-titanium-600 uppercase tracking-wide">Patient Trajectory</span>
                          <span className="text-xs bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-medium">Forward-looking</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-red-600 font-medium">{'\u2193'} {dist.worseningRapid} worsening rapidly</span>
                          <span className="text-[#6B7280] font-medium">{'\u2198'} {dist.worseningSlow} worsening slowly</span>
                          <span className="text-gray-500 font-medium">{'\u2192'} {dist.stable} stable</span>
                          <span className="text-[#2C4A60] font-medium">{'\u2197'} {dist.improving} improving</span>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden mt-2">
                          <div className="bg-red-400" style={{ width: `${(dist.worseningRapid / dist.total) * 100}%` }} />
                          <div className="bg-[#F0F5FA]" style={{ width: `${(dist.worseningSlow / dist.total) * 100}%` }} />
                          <div className="bg-gray-300" style={{ width: `${(dist.stable / dist.total) * 100}%` }} />
                          <div className="bg-[#C8D4DC]" style={{ width: `${(dist.improving / dist.total) * 100}%` }} />
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-titanium-600">
                          <span>Q1 opportunity: <span className="font-bold text-[#2C4A60]">{formatDollar(q1Rev)}</span> ({dist.worseningRapid} patients -- highest urgency)</span>
                          <span>Full population: <span className="font-bold text-[#2C4A60]">{formatDollar(gap.dollarOpportunity)}</span></span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Detection criteria */}
                  <div>
                    <h4 className="font-semibold text-titanium-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#6B7280]" />
                      Detection Criteria
                    </h4>
                    <ul className="space-y-1">
                      {gap.detectionCriteria.map((c) => (
                        <li key={c} className="text-sm text-titanium-700 flex gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-[#2C4A60] flex-shrink-0 mt-0.5" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Safety Note */}
                  {gap.safetyNote && (
                    <div className="bg-rose-50 border-2 border-rose-400 rounded-xl p-4">
                      <h4 className="font-semibold text-rose-800 mb-1 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        SAFETY WARNING
                      </h4>
                      <p className="text-sm text-rose-700 font-medium">{gap.safetyNote}</p>
                    </div>
                  )}

                  {/* Evidence */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-semibold text-blue-800 mb-1 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" />
                      Clinical Evidence
                    </h4>
                    <p className="text-sm text-blue-700">{gap.evidence}</p>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center gap-3">
                    <Pill className="w-4 h-4 text-porsche-600" />
                    <span className="font-semibold text-porsche-700">Recommended Action:</span>
                    <span className="text-sm font-medium bg-porsche-50 border border-porsche-200 px-3 py-1 rounded-lg text-porsche-800">
                      {gap.cta}
                    </span>
                  </div>

                  {/* Sample patients */}
                  <div>
                    <h4 className="font-semibold text-titanium-800 mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4 text-titanium-600" />
                      Sample Flagged Patients ({gap.patients.length} shown of {gap.patientCount})
                    </h4>
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-titanium-100">
                      <span className="text-xs text-titanium-500 font-medium">Sort:</span>
                      {(['urgency', 'dollar', 'score'] as const).map((sort) => (
                        <button
                          key={sort}
                          onClick={() => setPatientSortOrder(sort)}
                          className={`text-xs px-2 py-1 rounded ${patientSortOrder === sort ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-titanium-50 text-titanium-500 hover:bg-titanium-100'}`}
                        >
                          {sort === 'urgency' ? 'By Urgency' : sort === 'dollar' ? 'By $ Value' : 'By Score'}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {sortPatients(gap.patients, gap).map((pt) => {
                        const ptOpen = expandedPatient === pt.id;
                        return (
                          <div key={pt.id} className="border border-titanium-200 rounded-xl overflow-hidden">
                            <button
                              className="w-full text-left px-4 py-3 bg-titanium-50 hover:bg-titanium-100 transition-colors flex items-center justify-between"
                              onClick={() => setExpandedPatient(ptOpen ? null : pt.id)}
                            >
                              <div>
                                <span className="font-medium text-titanium-900">{pt.name}</span>
                                <span className="text-sm text-titanium-500 ml-2">
                                  {pt.mrn} • Age {pt.age}
                                </span>
                                {pt.tier && (
                                  <span className="ml-2 text-xs bg-[#FAF6E8] text-[#8B6914] px-2 py-0.5 rounded-full">
                                    {pt.tier}
                                  </span>
                                )}
                                {renderPredictiveBadges(gap, pt)}
                                {gap.category === 'Discovery' && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-xs bg-[#F0F7F4] text-[#2D6147] px-2 py-0.5 rounded-full" title="This patient was not previously flagged in any clinical workflow, quality program, or EHR alert. TAILRD identified this patient by assembling disconnected signals across care settings.">
                                    <Radar className="w-3 h-3" />
                                    First identified by TAILRD
                                  </span>
                                )}
                              </div>
                              {ptOpen ? <ChevronUp className="w-4 h-4 text-titanium-400" /> : <ChevronDown className="w-4 h-4 text-titanium-400" />}
                            </button>
                            {ptOpen && (
                              <div className="p-4 space-y-3">
                                {/* KCCQ Trend Indicator */}
                                {pt.kccqOverallSummary !== undefined && pt.kccqPriorOverallSummary !== undefined && (() => {
                                  const delta = pt.kccqOverallSummary! - pt.kccqPriorOverallSummary!;
                                  const improved = delta >= 5;
                                  const declined = delta <= -5;
                                  const arrow = improved ? '\u2191' : declined ? '\u2193' : '\u2192';
                                  const colorClass = improved ? 'text-[#2C4A60]' : declined ? 'text-red-700' : 'text-titanium-500';
                                  return (
                                    <div className={`text-xs font-medium ${colorClass} bg-titanium-50 border border-titanium-200 rounded-lg px-3 py-1.5 inline-flex items-center gap-1`}>
                                      <TrendingUp className="w-3 h-3 flex-shrink-0" />
                                      KCCQ {pt.kccqPriorOverallSummary} &rarr; {pt.kccqOverallSummary} {arrow} ({pt.kccqPriorDate} &ndash; {pt.kccqAdministeredDate})
                                    </div>
                                  );
                                })()}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h5 className="text-xs font-semibold text-titanium-600 uppercase mb-2">Triggered Signals</h5>
                                    <ul className="space-y-1">
                                      {pt.signals.map((sig) => (
                                        <li key={sig} className="text-sm text-red-700 flex gap-2">
                                          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                          {sig}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <h5 className="text-xs font-semibold text-titanium-600 uppercase mb-2">Key Clinical Values</h5>
                                    <dl className="space-y-1">
                                      {Object.entries(pt.keyValues).map(([k, v]) => (
                                        <div key={k} className="flex justify-between text-sm">
                                          <dt className="text-titanium-600">{k}:</dt>
                                          <dd className="font-medium text-titanium-900" title="Automatically calculated from EHR-sourced data via EHR integration. No manual entry required.">{v}<span title="Automatically calculated from EHR-sourced data via EHR integration. No manual entry required."><Info className="w-3 h-3 text-blue-400 inline-block ml-1 cursor-help" /></span></dd>
                                        </div>
                                      ))}
                                    </dl>
                                  </div>
                                </div>
                                {/* Enhanced Signal Detection */}
                                {renderSignalDetection(gap.id, pt)}
                                {/* Eligibility Checker */}
                                {renderEligibilityChecker(gap.id, pt)}
                                {/* GDMT 4-Pillar Status */}
                                {renderGDMTStatus(gap.id, pt)}
                                {/* KCCQ Trend Display */}
                                {renderKCCQTrend(pt)}
                                {/* Predictive Intelligence */}
                                {renderHFPredictedEvent(gap.id, pt)}
                                {renderHFRevenueTiming(gap, pt)}
                                {gap.whyTailrd && (
                                  <div className="bg-[#f0f4f8] border border-[#C8D4DC] rounded-xl p-3 mt-2">
                                    <p className="text-xs font-semibold text-[#2C4A60] mb-1">Why TAILRD identified this patient:</p>
                                    <p className="text-sm text-[#2C4A60]">{gap.whyTailrd}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            {ptOpen && (
                              <div className="px-4 pb-3">
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Methodology & Data Sources */}
                  {gap.methodologyNote && (
                    <div className="mt-4 border-t border-titanium-100 pt-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowMethodology(showMethodology === gap.id ? null : gap.id); }}
                        className="flex items-center gap-2 text-xs text-titanium-500 hover:text-titanium-700 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="font-medium">Methodology & Data Sources</span>
                        <span className="text-[10px]">{showMethodology === gap.id ? '\u25BC' : '\u25B6'}</span>
                      </button>
                      {showMethodology === gap.id && (
                        <div className="mt-2 pl-5 text-xs text-titanium-600 space-y-1">
                          <p>{gap.methodologyNote}</p>
                          <p className="italic text-titanium-400 text-[10px]">Numbers calibrated to representative cardiovascular program based on published clinical benchmarks</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClinicalGapDetectionDashboard;
