import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, DollarSign, Users, ChevronDown, ChevronUp, Target, Activity, Pill, Stethoscope, TrendingUp, Zap, Info, Search, Radio, FileText } from 'lucide-react';
import { computeQTcRisk, computeCHA2DS2VASc, estimatePVCBurden } from '../../../../utils/clinicalCalculators';
import { computeTrajectory, computeTimeHorizon, trajectoryDisplay, timeHorizonDisplay, computeRevenueAtRisk, formatDollar, type TrajectoryResult, type TrajectoryDistribution } from '../../../../utils/predictiveCalculators';

// ============================================================
// CLINICAL GAP DETECTION — ELECTROPHYSIOLOGY MODULE
// Gaps: 4 (LAAC Eligibility), 10 (Conduction System Pacing),
//       11 (PFA AF Re-ablation), 16 (CASTLE-AF Cross-Module),
//       22 (ICD DANISH Cross-Module), 26 (OSA Cross-Module),
//       27 (WPW Risk Stratification), 33 (Amiodarone Monitoring),
//       40 (Carotid Stenosis Cross-Module), 41 (Fontan)
//       53 (OAC Monotherapy Cross-Module CAD+EP), 64 (Persistent AF Rhythm),
//       65 (Cryptogenic Stroke ILR), 66 (Dofetilide REMS), 67 (Dronedarone Contraindication),
//       68 (IST Ivabradine), 69 (Flutter Ablation), 70 (Device Battery EOL),
//       71 (PVC Cardiomyopathy), 72 (LQTS Beta-Blocker),
//       ep-22 (Subclinical AF Device), ep-23 (Remote Monitoring Non-Compliance),
//       ep-24 (Early Rhythm Control), ep-25 (VT Ablation), ep-26 (ICD Programming),
//       ep-27 (Lead Recall Advisory)
// ============================================================

export interface EPClinicalGap {
  id: string;
  name: string;
  category: 'Gap' | 'Growth' | 'Safety' | 'Quality' | 'Deprescribing' | 'Discovery';
  patientCount: number;
  dollarOpportunity: number;
  evidence: string;
  cta: string;
  priority: 'high' | 'medium' | 'low';
  detectionCriteria: string[];
  patients: EPGapPatient[];
  subcategories?: { label: string; count: number }[];
  tag?: string;
  safetyNote?: string;
  whyMissed?: string;
  whyTailrd?: string;
  methodologyNote?: string;
}

export interface EPGapPatient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  signals: string[];
  keyValues: Record<string, string | number>;
  scenario?: string;
  // Patient-Reported Outcomes — KCCQ (for AF + HFrEF patients)
  kccqOverallSummary?: number;        // 0-100
  kccqPhysicalLimitation?: number;    // 0-100
  kccqQualityOfLife?: number;         // 0-100
  kccqSocialLimitation?: number;      // 0-100
  kccqSymptomFrequency?: number;      // 0-100
  kccqAdministeredDate?: string;
  kccqPriorOverallSummary?: number;   // prior score for trend
  kccqPriorDate?: string;
}

// ============================================================
// GAP 4: LAAC ELIGIBILITY
// ============================================================
const laacPatients: EPGapPatient[] = [
  {
    id: 'EP-LAAC-001',
    name: 'Gerald Whitmore',
    mrn: 'MRN-EP-41201',
    age: 76,
    signals: [
      'AF (I48.11)',
      'CHA2DS2-VASc score 5',
      'Prior intracranial hemorrhage 2022',
      'Not on anticoagulation',
    ],
    keyValues: {
      'CHA2DS2-VASc': '5',
      'Score Components': 'Age, HTN, HF, Prior ICH, Female',
      'Current Anticoag': 'None — prior ICH contraindication',
      'AF Type': 'Persistent AF',
      'LAAC Referred': 'No',
    },
  },
  {
    id: 'EP-LAAC-002',
    name: 'Miriam Schultz',
    mrn: 'MRN-EP-41338',
    age: 71,
    signals: [
      'AF (I48.19)',
      'CHA2DS2-VASc score 4',
      'Recurrent GI bleed — 3 episodes over 2 years',
      'OAC discontinued due to bleeding',
    ],
    keyValues: {
      'CHA2DS2-VASc': '4',
      'Score Components': 'Age, HTN, Diabetes, Female',
      'Current Anticoag': 'Discontinued — GI bleeding',
      'AF Type': 'Paroxysmal AF',
      'LAAC Referred': 'No',
    },
  },
  {
    id: 'EP-LAAC-003',
    name: 'Alphonse Garner',
    mrn: 'MRN-EP-41457',
    age: 80,
    signals: [
      'AF (I48.11)',
      'CHA2DS2-VASc score 6',
      'Labile INR despite warfarin (TTR < 50%)',
      'Patient declining NOAC due to cost',
    ],
    keyValues: {
      'CHA2DS2-VASc': '6',
      'Score Components': 'Age x2, HTN, HF, Prior stroke, Male',
      'Current Anticoag': 'Warfarin — labile INR, TTR 38%',
      'AF Type': 'Long-standing Persistent AF',
      'LAAC Referred': 'No',
    },
  },
  {
    id: 'EP-LAAC-004',
    name: 'Constance Merrick',
    mrn: 'MRN-EP-41583',
    age: 69,
    signals: [
      'AF (I48.20)',
      'CHA2DS2-VASc score 3',
      'Documented NOAC intolerance (severe diarrhea)',
      'Not on anticoagulation despite high score',
    ],
    keyValues: {
      'CHA2DS2-VASc': '3',
      'Score Components': 'Age, HTN, Female',
      'Current Anticoag': 'None — documented NOAC intolerance',
      'AF Type': 'Paroxysmal AF',
      'LAAC Referred': 'No',
    },
  },
];

// ============================================================
// GAP 10: CONDUCTION SYSTEM PACING
// ============================================================
const cspPatients: EPGapPatient[] = [
  {
    id: 'EP-CSP-001',
    name: 'Theodore Morley',
    mrn: 'MRN-EP-62401',
    age: 71,
    signals: [
      'CRT in place >= 12 months',
      'LVEF still 30% (meets Scenario B: CRT non-responder)',
      'NYHA Class III despite biventricular pacing',
    ],
    keyValues: {
      'LVEF': '30%',
      'QRS Duration': '165ms (LBBB)',
      'CRT Device': 'In place 18 months',
      'NYHA Class': 'III',
      'Scenario': 'B — CRT non-responder',
      'Prior LVEF': '34%',
    },
    scenario: 'Scenario B: CRT Non-Responder',
  },
  {
    id: 'EP-CSP-002',
    name: 'Pauline Strickland',
    mrn: 'MRN-EP-62538',
    age: 65,
    signals: [
      'LVEF 28%',
      'QRS 162ms with LBBB',
      'No device implanted yet',
      'Meets Scenario C criteria',
    ],
    keyValues: {
      'LVEF': '28%',
      'QRS Duration': '162ms (LBBB)',
      'Device': 'None',
      'NYHA Class': 'II',
      'Scenario': 'C — Device-naive LBBB candidate',
      'Prior LVEF': '33%',
    },
    scenario: 'Scenario C: LVEF <= 35% + QRS >= 150ms + LBBB + No Device',
  },
  {
    id: 'EP-CSP-003',
    name: 'Norman Dillard',
    mrn: 'MRN-EP-62674',
    age: 78,
    signals: [
      'Failed LV lead placement during prior CRT attempt',
      'Meets CRT criteria (LVEF 25%, QRS 158ms, LBBB)',
      'Scenario A — LV lead failure candidate',
    ],
    keyValues: {
      'LVEF': '25%',
      'QRS Duration': '158ms (LBBB)',
      'Prior CRT Attempt': 'LV lead failure',
      'NYHA Class': 'III',
      'Scenario': 'A — Failed LV lead',
    },
    scenario: 'Scenario A: Failed LV Lead',
  },
];

// ============================================================
// GAP 11: PFA RE-ABLATION FOR AF RECURRENCE
// ============================================================
const pfaPatients: EPGapPatient[] = [
  {
    id: 'EP-PFA-001',
    name: 'Blanche Kavanaugh',
    mrn: 'MRN-EP-71201',
    age: 58,
    signals: [
      'Prior AF ablation (CPT 93656) 22 months ago',
      'AF recurrence confirmed after 90-day blanking',
      'No repeat ablation performed',
      'Still symptomatic with persistent AF',
    ],
    keyValues: {
      'Prior Ablation': '22 months ago (CPT 93656)',
      'Recurrence Date': '8 months post-ablation',
      'Repeat Ablation': 'None',
      'Current Rhythm': 'Persistent AF',
      'CHADS-VASc': '2',
    },
  },
  {
    id: 'EP-PFA-002',
    name: 'Randolph Kessler',
    mrn: 'MRN-EP-71348',
    age: 62,
    signals: [
      'Prior RF ablation 18 months ago',
      'AF recurrence 5 months post-ablation',
      'Ablation > 12 months ago — PFA re-ablation candidate',
    ],
    keyValues: {
      'Prior Ablation': '18 months ago (RF)',
      'Recurrence Date': '5 months post-ablation',
      'Repeat Ablation': 'None',
      'Current Rhythm': 'Paroxysmal AF',
      'CHADS-VASc': '3',
    },
  },
  {
    id: 'EP-PFA-003',
    name: 'Gwendolyn Harte',
    mrn: 'MRN-EP-71465',
    age: 55,
    signals: [
      'Prior cryoablation 14 months ago',
      'AF recurrence 4 months post-ablation',
      'Symptomatic — requesting repeat ablation',
    ],
    keyValues: {
      'Prior Ablation': '14 months ago (Cryoablation)',
      'Recurrence Date': '4 months post-ablation',
      'Repeat Ablation': 'None scheduled',
      'Current Rhythm': 'Paroxysmal AF',
      'CHADS-VASc': '1',
    },
  },
];

// ============================================================
// GAP 16 (EP): AF + HFrEF — CASTLE-AF (Cross-Module HF+EP)
// ============================================================
const castleAFPatientsEP: EPGapPatient[] = [
  {
    id: 'EP-CASTLE-001',
    name: 'Lawrence Henley',
    mrn: 'MRN-EP-16001',
    age: 61,
    signals: [
      'AF (I48.11 persistent) + HFrEF (LVEF 31%) — CASTLE-AF indication',
      'On GDMT (ARNI + carvedilol + MRA) x4 months',
      'No EP referral for ablation in 12 months',
      'Rate control only — rhythm strategy not pursued',
    ],
    keyValues: {
      'LVEF': '31%',
      'AF Type': 'Persistent AF (I48.11)',
      'GDMT Duration': '4 months (meets >=3 month criterion)',
      'Rate Control': 'Carvedilol 25mg BID',
      'Ablation Referral': 'None in 12 months',
      'KCCQ Overall': 43,
    },
    kccqOverallSummary: 43,
    kccqPhysicalLimitation: 38,
    kccqQualityOfLife: 41,
    kccqSocialLimitation: 45,
    kccqSymptomFrequency: 47,
    kccqAdministeredDate: 'Jan 2025',
    kccqPriorOverallSummary: 50,
    kccqPriorDate: 'Oct 2024',
  },
  {
    id: 'EP-CASTLE-002',
    name: 'Sandra Buckley',
    mrn: 'MRN-EP-16002',
    age: 56,
    signals: [
      'AF (I48.0 paroxysmal) + HFrEF (LVEF 33%)',
      'Full GDMT x5 months — CASTLE-AF eligible',
      'Symptomatic AF burden high',
      'EP referral never placed',
    ],
    keyValues: {
      'LVEF': '33%',
      'AF Type': 'Paroxysmal AF (I48.0)',
      'GDMT Duration': '5 months',
      'Rate Control': 'Bisoprolol 10mg daily',
      'Ablation Referral': 'None',
      'KCCQ Overall': 37,
    },
    kccqOverallSummary: 37,
    kccqPhysicalLimitation: 31,
    kccqQualityOfLife: 34,
    kccqSocialLimitation: 39,
    kccqSymptomFrequency: 42,
    kccqAdministeredDate: 'Jan 2025',
    kccqPriorOverallSummary: 44,
    kccqPriorDate: 'Sep 2024',
  },
  {
    id: 'EP-CASTLE-003',
    name: 'Reginald Ashby',
    mrn: 'MRN-EP-16003',
    age: 64,
    signals: [
      'Persistent AF + HFrEF (LVEF 29%) — all-cause death risk high',
      'Full GDMT quadruple therapy x6 months',
      'No EP consultation or ablation planned',
    ],
    keyValues: {
      'LVEF': '29%',
      'AF Type': 'Persistent AF',
      'GDMT Duration': '6 months',
      'Rate Control': 'Metoprolol succinate 200mg + digoxin',
      'Ablation Referral': 'None',
      'KCCQ Overall': 31,
    },
    kccqOverallSummary: 31,
    kccqPhysicalLimitation: 26,
    kccqQualityOfLife: 28,
    kccqSocialLimitation: 33,
    kccqSymptomFrequency: 36,
    kccqAdministeredDate: 'Jan 2025',
    kccqPriorOverallSummary: 39,
    kccqPriorDate: 'Oct 2024',
  },
];

// ============================================================
// GAP 22 (EP): ICD DANISH AGE-STRATIFIED (Cross-Module HF+EP)
// ============================================================
const danishICDPatientsEP: EPGapPatient[] = [
  {
    id: 'EP-DANISH-001',
    name: 'Abigail Troutman',
    mrn: 'MRN-EP-22001',
    age: 56,
    signals: [
      'Non-ischemic cardiomyopathy (I42.0) — NICM',
      'LVEF 29% on GDMT x5 months',
      'No ICD or CRT-D in chart',
      'Age 56: DANISH CRITICAL tier (HR 0.51)',
    ],
    keyValues: {
      'Age': '56 (DANISH CRITICAL)',
      'LVEF': '29%',
      'CM Type': 'Non-ischemic (I42.0)',
      'GDMT Duration': '5 months',
      'Device': 'None',
      'DANISH Tier': 'CRITICAL (age <60, HR 0.51)',
    },
    scenario: 'DANISH CRITICAL — age <60',
  },
  {
    id: 'EP-DANISH-002',
    name: 'Chester Nguyen',
    mrn: 'MRN-EP-22002',
    age: 65,
    signals: [
      'NICM (I42.0) + LVEF 33% on GDMT x7 months',
      'No ICD in chart',
      'Age 65: DANISH HIGH tier (HR 0.75 trend)',
    ],
    keyValues: {
      'Age': '65 (DANISH HIGH)',
      'LVEF': '33%',
      'CM Type': 'Non-ischemic (I42.0)',
      'GDMT Duration': '7 months',
      'Device': 'None',
      'DANISH Tier': 'HIGH (age 60-68)',
    },
    scenario: 'DANISH HIGH — age 60-68',
  },
  {
    id: 'EP-DANISH-003',
    name: 'Ophelia Grant',
    mrn: 'MRN-EP-22003',
    age: 72,
    signals: [
      'NICM (I42.0) + LVEF 34% — age >68 MODERATE tier',
      'No ICD — consider cardiac MRI for LGE risk stratification',
    ],
    keyValues: {
      'Age': '72 (DANISH MODERATE)',
      'LVEF': '34%',
      'CM Type': 'Non-ischemic (I42.0)',
      'GDMT Duration': '4 months',
      'Device': 'None',
      'DANISH Tier': 'MODERATE (age >68) — individualize decision',
    },
    scenario: 'DANISH MODERATE — age >68',
  },
];

// ============================================================
// GAP 26 (EP): OSA SCREENING IN AF (Cross-Module HF+EP)
// ============================================================
const osaPatientsEP: EPGapPatient[] = [
  {
    id: 'EP-OSA-001',
    name: 'Clifford Navarro',
    mrn: 'MRN-EP-26001',
    age: 58,
    signals: [
      'AF (I48.11 persistent) — OSA drives AF recurrence',
      'STOP-BANG score 5 (BMI 39, HTN, snoring, male, age)',
      'No sleep study in chart',
      'No OSA diagnosis',
    ],
    keyValues: {
      'STOP-BANG Score': '5/8',
      'BMI': '39 kg/m2',
      'AF Diagnosis': 'Persistent AF (I48.11)',
      'Sleep Study': 'None ordered',
      'OSA Diagnosis': 'None',
    },
  },
  {
    id: 'EP-OSA-002',
    name: 'Miriam Adeyemi',
    mrn: 'MRN-EP-26002',
    age: 66,
    signals: [
      'AF (I48.0 paroxysmal) — post-ablation, recurrent',
      'STOP-BANG score 4 (BMI 35, HTN, observed apnea, age)',
      'OSA driving AF recurrence — not screened or treated',
      'No sleep study ordered',
    ],
    keyValues: {
      'STOP-BANG Score': '4/8',
      'BMI': '35 kg/m2',
      'AF Diagnosis': 'Paroxysmal AF — prior ablation',
      'Sleep Study': 'None ordered',
      'OSA Diagnosis': 'None',
    },
  },
  {
    id: 'EP-OSA-003',
    name: 'Edmund Kowalski',
    mrn: 'MRN-EP-26003',
    age: 70,
    signals: [
      'AF (I48.19 persistent) + HFrEF (LVEF 36%)',
      'STOP-BANG score 6',
      'No sleep study — dual indication (AF + HFpEF)',
      'CAUTION: Do NOT use ASV if central sleep apnea confirmed in HFrEF',
    ],
    keyValues: {
      'STOP-BANG Score': '6/8',
      'BMI': '42 kg/m2',
      'AF Diagnosis': 'AF + HFrEF (LVEF 36%)',
      'Sleep Study': 'None',
      'ASV Safety': 'CONTRAINDICATED in HFrEF + central sleep apnea (SERVE-HF)',
    },
  },
];

// ============================================================
// GAP 27: WPW RISK STRATIFICATION (EP Module)
// ============================================================
const wpwPatients: EPGapPatient[] = [
  {
    id: 'EP-WPW-001',
    name: 'Bradley Finch',
    mrn: 'MRN-EP-27001',
    age: 28,
    signals: [
      'WPW (I45.6) + AF (I48.0) — CRITICAL risk',
      'No EP study (no CPT 93620)',
      'No ablation documented',
      'CONTRAINDICATION: AV nodal blockers must NOT be used',
    ],
    keyValues: {
      'WPW Diagnosis': 'I45.6 + delta wave on ECG',
      'High-Risk Features': 'AF — CRITICAL',
      'EP Study': 'None (CPT 93620 not in chart)',
      'Ablation': 'None',
      'Drug Contraindication': 'Digoxin, verapamil, diltiazem, BB, adenosine CONTRAINDICATED',
      'Risk Tier': 'CRITICAL',
      'AF Episodes': '3 in past 6 months',
      'AV Nodal Blocker': 'Diltiazem 120mg',
      'Risk Note': 'CRITICAL - AV nodal blocker contraindicated with accessory pathway',
    },
    scenario: 'CRITICAL — WPW + AF',
  },
  {
    id: 'EP-WPW-002',
    name: 'Anastasia Mercer',
    mrn: 'MRN-EP-27002',
    age: 34,
    signals: [
      'WPW (I45.6) + syncope episode x1',
      'No EP study performed',
      'CRITICAL: WPW + syncope — high sudden death risk',
      'No ablation',
    ],
    keyValues: {
      'WPW Diagnosis': 'I45.6 + pre-excitation on ECG',
      'High-Risk Features': 'Syncope — CRITICAL',
      'EP Study': 'None',
      'Ablation': 'None',
      'Drug Contraindication': 'AV nodal blockers CONTRAINDICATED',
      'Risk Tier': 'CRITICAL',
    },
    scenario: 'CRITICAL — WPW + syncope',
  },
  {
    id: 'EP-WPW-003',
    name: 'Carlton Nash',
    mrn: 'MRN-EP-27003',
    age: 22,
    signals: [
      'WPW (I45.6) — incidental finding on pre-op ECG',
      'No high-risk features identified',
      'No EP study or exercise stress test in 12 months',
      'Asymptomatic — HIGH risk tier (still needs evaluation)',
    ],
    keyValues: {
      'WPW Diagnosis': 'I45.6 — incidental pre-excitation',
      'High-Risk Features': 'None identified (screen required)',
      'EP Study': 'None',
      'Ablation': 'None',
      'Drug Contraindication': 'AV nodal blockers CONTRAINDICATED in WPW',
      'Risk Tier': 'HIGH — asymptomatic WPW',
    },
    scenario: 'HIGH — WPW without high-risk features (yet)',
  },
  {
    id: 'EP-WPW-004',
    name: 'Valerie Croft',
    mrn: 'MRN-EP-27004',
    age: 19,
    signals: [
      'WPW (I45.6) — referred from pediatric cardiology',
      'No prior EP study or risk stratification',
      'Active athlete — exercise increases arrhythmia risk',
      'Ablation curative >95% success rate',
    ],
    keyValues: {
      'WPW Diagnosis': 'I45.6 + manifest pre-excitation',
      'High-Risk Features': 'Athlete — exercise consideration',
      'EP Study': 'None',
      'Ablation': 'None (>95% success rate)',
      'Drug Contraindication': 'AV nodal blockers CONTRAINDICATED',
      'Risk Tier': 'HIGH — athlete, no prior evaluation',
    },
    scenario: 'HIGH — WPW + athlete, no prior EP evaluation',
  },
];

// ============================================================
// GAP 33: AMIODARONE TOXICITY MONITORING OVERDUE
// ============================================================
const amiodaronePatients: EPGapPatient[] = [
  {
    id: 'EP-AMIO-001',
    name: 'Patricia Volkov',
    mrn: 'MRN-EP-33001',
    age: 74,
    signals: [
      'On amiodarone — TFTs last checked 9 months ago (overdue)',
      'No LFTs in 7 months (overdue)',
      'No CXR in 14 months (overdue)',
      'No ophthalmology exam in 18 months (overdue)',
    ],
    keyValues: {
      'Amiodarone Dose': '200mg daily',
      'TFTs Last Done': '9 months ago (overdue — q6mo)',
      'LFTs Last Done': '7 months ago (overdue — q6mo)',
      'CXR Last Done': '14 months ago (overdue — q12mo)',
      'Ophthalmology': '18 months ago (overdue — q12mo)',
    },
  },
  {
    id: 'EP-AMIO-002',
    name: 'Stuart Hammersley',
    mrn: 'MRN-EP-33002',
    age: 68,
    signals: [
      'On amiodarone 3 years — thyroid monitoring overdue',
      'TFTs not checked in 8 months',
      'Pulmonary function tests never documented',
      'Dermatology: photosensitivity not documented (>1 year on drug)',
    ],
    keyValues: {
      'Amiodarone Dose': '200mg daily x3 years',
      'TFTs Last Done': '8 months ago (overdue)',
      'LFTs Last Done': '5 months ago (OK)',
      'PFTs': 'Never documented',
      'Dermatology': 'Not documented (>1 year — needed)',
    },
  },
  {
    id: 'EP-AMIO-003',
    name: 'Dolores Reinholt',
    mrn: 'MRN-EP-33003',
    age: 79,
    signals: [
      'On amiodarone — ALL monitoring categories overdue',
      'New fatigue — possible thyroid dysfunction',
      'Dyspnea — rule out pulmonary toxicity',
      'All monitoring labs/exams overdue',
    ],
    keyValues: {
      'Amiodarone Dose': '100mg daily',
      'TFTs Last Done': '11 months ago (overdue)',
      'LFTs Last Done': '8 months ago (overdue)',
      'CXR Last Done': '16 months ago (overdue)',
      'Ophthalmology': 'Never documented',
      'New Symptoms': 'Fatigue, dyspnea',
    },
  },
];

// ============================================================
// GAP 40 (EP): CAROTID STENOSIS NOT EVALUATED (Cross-Module CAD+EP)
// ============================================================
const carotidPatientsEP: EPGapPatient[] = [
  {
    id: 'EP-CAR-001',
    name: 'Nathaniel Price',
    mrn: 'MRN-EP-40001',
    age: 68,
    signals: [
      'Ischemic stroke (I63.9) 8 months ago',
      'No carotid duplex ultrasound in past 12 months',
      'No prior CEA or carotid stenting in chart',
      'AF diagnosis present — atrial vs carotid source?',
    ],
    keyValues: {
      'Cerebrovascular Event': 'Ischemic stroke (I63.9) 8 months ago',
      'Carotid Duplex': 'None in 12 months',
      'Prior CEA/Stenting': 'None documented',
      'AF Diagnosis': 'Yes (I48.11) — dual source evaluation needed',
      'Anticoagulation': 'Apixaban 5mg BID (AF)',
    },
  },
  {
    id: 'EP-CAR-002',
    name: 'Eunice Caldwell',
    mrn: 'MRN-EP-40002',
    age: 72,
    signals: [
      'TIA (G45.9) 4 months ago — carotid workup incomplete',
      'No carotid imaging in past 12 months',
      'AF + TIA — dual mechanism possible',
      'NASCET: emergent carotid eval within 24-48h of TIA indicated',
    ],
    keyValues: {
      'Cerebrovascular Event': 'TIA (G45.9) 4 months ago',
      'Carotid Duplex': 'None documented',
      'Prior CEA/Stenting': 'None',
      'AF Diagnosis': 'Yes (I48.0) — source evaluation needed',
      'Carotid Stenosis Status': 'Unknown — not imaged',
    },
  },
  {
    id: 'EP-CAR-003',
    name: 'Raymond Tully',
    mrn: 'MRN-EP-40003',
    age: 65,
    signals: [
      'Ischemic stroke (I63.4) 6 months ago',
      'No carotid imaging in 12 months',
      'No prior carotid revascularization',
      'Atrial flutter (I48.3) present — carotid source not excluded',
    ],
    keyValues: {
      'Cerebrovascular Event': 'Ischemic stroke (I63.4) 6 months ago',
      'Carotid Duplex': 'None in 12 months',
      'Prior CEA/Stenting': 'None',
      'Arrhythmia': 'Atrial flutter (I48.3)',
      'Carotid Stenosis Status': 'Unknown — needs imaging',
    },
  },
];

// ============================================================
// GAP 41: FONTAN CIRCULATION (EP Module)
// ============================================================
const fontanPatients: EPGapPatient[] = [
  {
    id: 'EP-FONT-001',
    name: 'Timothy Brennan',
    mrn: 'MRN-EP-41001',
    age: 32,
    signals: [
      'Fontan palliation (Z98.89 with Fontan in history)',
      'Not on anticoagulation — high thrombosis risk',
      'No cardiac surveillance in >24 months',
      'No adult CHD specialist referral documented',
    ],
    keyValues: {
      'Fontan History': 'Z98.89 — Fontan operation in history',
      'Anticoagulation': 'None — high Fontan thrombosis risk',
      'Last Cardiac Surveillance': '>24 months ago',
      'Last Liver US': 'Never documented (Fontan liver disease)',
      'Adult CHD Referral': 'None documented',
    },
  },
  {
    id: 'EP-FONT-002',
    name: 'Catherine Morales',
    mrn: 'MRN-EP-41002',
    age: 27,
    signals: [
      'Fontan circulation (Q21.3 + Fontan history)',
      'On aspirin only — not on therapeutic anticoagulation',
      'Annual echo overdue (>18 months)',
      'LFTs never checked for Fontan-associated liver disease',
    ],
    keyValues: {
      'Fontan History': 'Q21.3 + Fontan palliation',
      'Anticoagulation': 'Aspirin only (not therapeutic anticoag)',
      'Last Echo': '>18 months ago',
      'LFTs': 'Not checked — Fontan liver disease risk',
      'Adult CHD Specialist': 'Not referred',
    },
  },
  {
    id: 'EP-FONT-003',
    name: 'Marcus Linden',
    mrn: 'MRN-EP-41003',
    age: 35,
    signals: [
      'Adult Fontan — 6MWT not performed in 2 years',
      'Not on anticoagulation despite known Fontan',
      '24h Holter not performed in 18 months',
      'Annual surveillance protocol not followed',
    ],
    keyValues: {
      'Fontan History': 'Z98.89 — Fontan documented',
      'Anticoagulation': 'None',
      'Last 6MWT': '>2 years ago',
      'Last Holter': '>18 months',
      'Hepatic US': 'None documented',
    },
  },
];

// ============================================================
// GAP 39: QTc SAFETY ALERT — MULTIPLE QT-PROLONGING MEDICATIONS
// ============================================================
const qtcSafetyPatients: EPGapPatient[] = [
  {
    id: 'EP-QTC-001',
    name: 'Margaret Kowalski',
    mrn: 'MRN-EP-39001',
    age: 71,
    signals: [
      'QTc 528ms on latest ECG (CRITICAL — >500ms)',
      'Sotalol 160mg BID + ondansetron PRN + escitalopram 10mg',
      'Three QT-prolonging medications concurrently',
      'K+ 3.3 mEq/L — hypokalemia amplifies TdP risk',
    ],
    keyValues: {
      'QTc': '528ms',
      'Prior QTc': '489ms',
      'QT-Prolonging Medications': 3,
      'Medications': 'Sotalol, Ondansetron, Escitalopram',
      'Potassium': '3.3 mEq/L',
      'Magnesium': '1.6 mg/dL',
      'eGFR': '58 mL/min',
      'Sex': 'Female',
    },
  },
  {
    id: 'EP-QTC-002',
    name: 'Thomas Andreou',
    mrn: 'MRN-EP-39002',
    age: 68,
    signals: [
      'QTc 491ms on latest ECG (HIGH — 470-500ms)',
      'Amiodarone 200mg daily + methadone 40mg daily',
      'Two known QT-prolonging medications',
      'Mg 1.4 mg/dL — borderline hypomagnesemia',
    ],
    keyValues: {
      'QTc': '491ms',
      'Prior QTc': '472ms',
      'QT-Prolonging Medications': 2,
      'Medications': 'Amiodarone, Methadone',
      'Potassium': '3.8 mEq/L',
      'Magnesium': '1.4 mg/dL',
      'eGFR': '45 mL/min',
      'Sex': 'Male',
    },
  },
  {
    id: 'EP-QTC-003',
    name: 'Lorraine Dupuis',
    mrn: 'MRN-EP-39003',
    age: 76,
    signals: [
      'QTc 505ms on latest ECG (CRITICAL — >500ms)',
      'Dofetilide 500mcg BID + haloperidol 2mg PRN + ciprofloxacin (recent)',
      'Three QT-prolonging medications — ciprofloxacin interaction',
      'Female sex — independent TdP risk factor',
    ],
    keyValues: {
      'QTc': '505ms',
      'Prior QTc': '478ms',
      'QT-Prolonging Medications': 3,
      'Medications': 'Dofetilide, Haloperidol, Ciprofloxacin',
      'Potassium': '3.6 mEq/L',
      'Magnesium': '1.8 mg/dL',
      'eGFR': '52 mL/min',
      'Sex': 'Female',
    },
  },
];

// ============================================================
// MASTER GAP DATA
// ============================================================
export const EP_CLINICAL_GAPS: EPClinicalGap[] = [
  {
    id: 'ep-gap-4-laac',
    name: 'LAAC Candidate — OAC Contraindication Present',
    category: 'Growth',
    patientCount: 440,
    dollarOpportunity: 4620000,
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on Watchman FLX (PREVAIL, PROTECT AF) OAC contraindication prevalence of 15% applied to estimated AF panel of 12,000 patients: 12,000 x 15% OAC contraindicated x 70% not yet receiving LAAC x 35% market share = ~440 patients. Dollar opportunity: LAAC DRG $35,000 x 30% procedural conversion rate x 440 = $4,620,000. Conversion rate: 30%.',
    evidence:
      'Watchman FLX (PREVAIL, PROTECT AF): noninferior to warfarin for stroke prevention. LAAC provides stroke protection without lifelong anticoagulation. CMS covers CPT 33340.',
    cta: 'Refer for LAAC Evaluation',
    priority: 'high',
    detectionCriteria: [
      'AF diagnosis (ICD-10: I48.x)',
      'CHA2DS2-VASc >= 2',
      'At least ONE of: prior ICH, prior major GI bleed, recurrent bleeding, not on anticoagulation despite high stroke risk score, documented OAC intolerance, labile INR (TTR < 60%)',
    ],
    patients: laacPatients,
    whyMissed: 'LAAC candidacy requires connecting OAC contraindication with CHA2DS2-VASc score and bleeding history — data spread across pharmacy, labs, and problem list.',
    whyTailrd: 'TAILRD assembled anticoagulation contraindication, stroke risk score, and bleeding history across pharmacy and clinical records to identify this LAAC candidate.',
  },
  {
    id: 'ep-gap-10-csp',
    name: 'CRT Non-Response — CSP Evaluation Indicated',
    category: 'Gap',
    patientCount: 25,
    dollarOpportunity: 112500,
    evidence:
      'I-CLAS (Vijayaraman, Heart Rhythm 2024, PMID 39343119): N=1,004. CSP vs BiV pacing: 36% reduction in death or HF hospitalization (HR 0.64, P=0.025). LBBAP preferred over His bundle pacing.',
    cta: 'Refer for EP Device Evaluation',
    priority: 'high',
    detectionCriteria: [
      'Scenario A: Failed LV lead placement + meets CRT criteria',
      'Scenario B: CRT device in place >= 12 months + LVEF still <= 35%',
      'Scenario C: LVEF <= 35% + QRS >= 150ms + LBBB morphology + no device yet',
      'Preferred therapy: Left Bundle Branch Area Pacing (LBBAP)',
    ],
    patients: cspPatients,
    subcategories: [
      { label: 'Scenario A: Failed LV lead', count: 6 },
      { label: 'Scenario B: CRT non-responder', count: 12 },
      { label: 'Scenario C: Device-naive LBBB', count: 10 },
    ],
    whyMissed: 'CRT non-response requires connecting post-implant echo with symptom assessment and device interrogation — data from 3 separate clinical systems.',
    whyTailrd: 'TAILRD linked post-CRT echocardiography, symptom status, and device interrogation data to identify this patient as a CSP evaluation candidate.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on I-CLAS trial CRT non-response rate of 30% applied to estimated CRT subset: 350 ICD/CRT implants x 40% CRT = 140. 140 x 30% non-responders x 60% identifiable x 35% market share = ~25 patients. Dollar opportunity: CSP upgrade DRG $60,000 x 25% device conversion rate = $112,500. Conversion rate: 25%.',
  },
  {
    id: 'ep-gap-11-pfa-reablation',
    name: 'AF Recurrence Post-Ablation — PFA Re-ablation Candidate',
    category: 'Growth',
    patientCount: 180,
    dollarOpportunity: 1404000,
    evidence:
      'ADVENT trial (NEJM 2023): PFA noninferior to thermal with zero esophageal fistula, PV stenosis, or persistent phrenic nerve injury. MANIFEST-17K (N=17,642): zero esophageal events. Repeat ablation with PFA: 65-75% 1-year freedom from AF.',
    cta: 'Refer for Repeat Ablation (PFA)',
    priority: 'medium',
    detectionCriteria: [
      'Prior AF ablation (CPT 93656)',
      'AF recurrence confirmed AFTER 90-day blanking period',
      'Original ablation > 12 months ago',
      'No repeat ablation performed since recurrence',
    ],
    patients: pfaPatients,
    whyMissed: 'AF recurrence post-ablation requires connecting rhythm monitoring data with prior procedure history — surveillance data is often in separate device clinic systems.',
    whyTailrd: 'TAILRD connected post-ablation rhythm monitoring with procedure history to identify AF recurrence eligible for PFA re-ablation.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on AF ablation volume and recurrence rate applied to estimated EP panel. Dollar opportunity: PFA re-ablation DRG x 180 patients x procedural conversion rate = $1,404,000. Conversion rate: 30%.',
  },
  // ── NEW GAPS 16, 22, 26, 27, 33, 40, 41 ────────────────────
  {
    id: 'ep-gap-16-castle-af',
    name: 'AF + HFrEF — Ablation Referral Indicated (CASTLE-AF)',
    category: 'Gap',
    patientCount: 75,
    dollarOpportunity: 585000,
    evidence:
      'CASTLE-AF (Marrouche, NEJM 2018): AF ablation vs medical therapy in HFrEF (LVEF <=35%). All-cause death + HF hospitalization: HR 0.62 (P=0.007). All-cause death: HR 0.53 (P=0.01). Class I in HFrEF + AF. Most HF programs manage with rate control only and never refer to EP.',
    cta: 'Refer for EP Ablation Evaluation',
    priority: 'high',
    tag: 'Cross-Module | EP + HF',
    detectionCriteria: [
      'AF (I48.x) + HFrEF (LVEF <=35%)',
      'NOT referred for ablation (no CPT 93656, no EP referral in 12 months)',
      'On GDMT >=3 months',
      'Cross-module: same patients also flagged in HF module — coordinate to avoid duplicate outreach',
      'Patient count (68) counted in HF module to avoid double-counting',
    ],
    patients: castleAFPatientsEP,
    whyMissed: 'AF management (EP) and HFrEF management (HF) occur in separate clinics. Neither specialist owns the combined indication for ablation referral.',
    whyTailrd: 'TAILRD monitors both EP and HF modules simultaneously, identifying this patient with AF + HFrEF who was never referred for ablation evaluation.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on CASTLE-AF AF prevalence of 15% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 15% x 80% no ablation referral x 75% identifiable x 35% market share = ~75 patients. Cross-module with HF. Patient count attributed to HF module. Dollar opportunity: AF ablation DRG $26,000 x 30% procedural conversion rate = $585,000. Conversion rate: 30%.',
  },
  {
    id: 'ep-gap-22-danish-icd',
    name: 'ICD Eligible — DANISH Age-Stratified Risk (Non-Ischemic CM)',
    category: 'Gap',
    patientCount: 50,
    dollarOpportunity: 481250,
    evidence:
      'DANISH extended follow-up (Elming, Circulation 2022): Non-ischemic CM LVEF <=35%. Age <59: HR 0.51 (P=0.02). Age 59-68: HR 0.75 trend. Age >68: HR 1.05. LGE on cardiac MRI identifies higher arrhythmic risk at any age.',
    cta: 'Refer for ICD Evaluation',
    priority: 'high',
    tag: 'Cross-Module | EP + HF',
    detectionCriteria: [
      'Non-ischemic cardiomyopathy (I42.x, NOT I25.5) + LVEF <=35%',
      'On GDMT >=3 months',
      'No ICD or CRT-D documented',
      'Sub-classify: age <60 = CRITICAL (HR 0.51); 60-68 = HIGH (HR 0.75); >68 = MODERATE (HR 1.05)',
      'Patient count (53) counted in HF module to avoid double-counting in aggregate totals',
    ],
    patients: danishICDPatientsEP,
    subcategories: [
      { label: 'CRITICAL: age <60 (HR 0.51)', count: 20 },
      { label: 'HIGH: age 60-68 (HR 0.75)', count: 16 },
      { label: 'MODERATE: age >68 (HR 1.05) — individualize', count: 17 },
    ],
    whyMissed: 'Age-stratified DANISH analysis requires active computation that no standard clinical workflow performs — these patients are known but their risk is miscalculated.',
    whyTailrd: 'TAILRD computed age-stratified DANISH risk combining age, LVEF, etiology, and comorbidities — an algorithmic refinement that changes the ICD recommendation.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on DANISH extended follow-up NICM prevalence of 20% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 20% NICM x 50% LVEF<=35% x 60% no ICD x 70% identifiable x 35% market share = ~50 patients. Cross-module with HF. Patient count attributed to HF module. Dollar opportunity: ICD DRG $55,000 x 25% device conversion rate x 50 x 70% = $481,250. Conversion rate: 25%.',
  },
  {
    id: 'ep-gap-26-osa-af',
    name: 'OSA Not Screened — STOP-BANG Elevated in AF Patients',
    category: 'Gap',
    patientCount: 120,
    dollarOpportunity: 210000,
    evidence:
      'OSA present in 30-50% of AF patients. Untreated OSA drives AF recurrence after ablation. Treating OSA with CPAP reduces AF burden. CAUTION: Do NOT use ASV in HFrEF + central sleep apnea (SERVE-HF: HR 1.28 increased mortality).',
    cta: 'Order Sleep Study (HSAT or PSG)',
    priority: 'medium',
    tag: 'Cross-Module | EP + HF',
    safetyNote: 'SAFETY: Do NOT prescribe Adaptive Servo-Ventilation (ASV) for patients with HFrEF + central sleep apnea — SERVE-HF showed HR 1.28 increased mortality. Always confirm sleep apnea type before prescribing PAP therapy.',
    detectionCriteria: [
      'AF diagnosis (I48.x) + STOP-BANG score >=3 from EHR data',
      'No sleep study ordered (no PSG or HSAT)',
      'No OSA diagnosis in chart (G47.3x)',
      'SAFETY: Do NOT recommend ASV for HFrEF + central sleep apnea (SERVE-HF contraindication)',
      'Patient count (130) counted in HF module to avoid double-counting',
    ],
    patients: osaPatientsEP,
    whyMissed: 'OSA screening in AF patients falls between EP and sleep medicine. STOP-BANG scores are rarely computed during EP encounters focused on rhythm management.',
    whyTailrd: 'TAILRD computed STOP-BANG risk from vitals and demographics already in the EHR, identifying OSA risk in this AF patient without a dedicated sleep evaluation.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on OSA prevalence of 40% applied to estimated AF panel of 12,000 patients: 12,000 x 40% OSA x 40% unscreened x 5% identifiable x 35% market share = ~120 patients. Cross-module with HF. Dollar opportunity: sleep study + CPAP program ($2,500/patient) x 70% completion rate x 120 = $210,000. Conversion rate: 70%.',
  },
  {
    id: 'ep-gap-27-wpw',
    name: 'WPW — EP Risk Stratification Not Performed',
    category: 'Safety',
    patientCount: 35,
    dollarOpportunity: 39200,
    evidence:
      'WPW + AF: rapid conduction over accessory pathway can cause VF and sudden death. Risk stratification indicated for ALL pre-excitation patients. EP study identifies high-risk pathways (shortest RR <250ms during AF). Ablation: >95% success rate. AV nodal blockers CONTRAINDICATED in WPW + AF.',
    cta: 'Refer for EP Study + Risk Stratification',
    priority: 'high',
    safetyNote: 'CRITICAL CONTRAINDICATION: AV nodal blocking agents — digoxin, verapamil, diltiazem, beta-blockers, and adenosine — are CONTRAINDICATED in WPW + AF. These drugs can accelerate conduction over the accessory pathway and precipitate VF and sudden cardiac death.',
    detectionCriteria: [
      'WPW (I45.6) or pre-excitation/delta wave on ECG',
      'No EP study (CPT 93620) in chart',
      'No ablation (CPT 93653/93654) documented',
      'No exercise stress test for WPW in 12 months',
      'Sub-classify CRITICAL: WPW + AF, syncope, or cardiac arrest',
      'Sub-classify HIGH: WPW without high-risk features',
      'CONTRAINDICATION: AV nodal blockers (digoxin, verapamil, diltiazem, BB, adenosine) in WPW + AF',
    ],
    patients: wpwPatients,
    subcategories: [
      { label: 'CRITICAL: WPW + AF, syncope, or arrest', count: 15 },
      { label: 'HIGH: WPW without high-risk features', count: 26 },
    ],
    whyMissed: 'WPW risk stratification requires connecting ECG pattern with symptom history and AF episodes — critical safety data spread across encounters.',
    whyTailrd: 'TAILRD connected WPW pattern on ECG with AF episode documentation and AV nodal blocker prescription to flag this patient for urgent EP risk stratification.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on WPW prevalence applied to estimated EP panel. Dollar opportunity: EP study + ablation ($1,600/patient) x 70% completion rate x 35 = $39,200. Conversion rate: 70%.',
  },
  {
    id: 'ep-gap-33-amiodarone-monitoring',
    name: 'Amiodarone — Organ Toxicity Monitoring Overdue',
    category: 'Gap',
    patientCount: 75,
    dollarOpportunity: 42000,
    evidence:
      'Amiodarone causes thyroid dysfunction in 15-20%, pulmonary toxicity in 1-5% (can be fatal), hepatotoxicity, corneal deposits, photosensitivity, peripheral neuropathy. Monitoring required every 3-6 months for thyroid, liver; annually for pulmonary, ophthalmologic. ACC/AHA explicit monitoring protocol.',
    cta: 'Order Amiodarone Toxicity Monitoring Panel',
    priority: 'medium',
    detectionCriteria: [
      'On amiodarone (current prescription)',
      'Any of: no TFTs in 6 months; no LFTs in 6 months; no PFTs or CXR in 12 months; no ophthalmology exam in 12 months; no dermatology documentation if on >1 year',
      'Care Team view shows which monitoring category is overdue and by how long',
    ],
    patients: amiodaronePatients,
    whyMissed: 'Amiodarone toxicity monitoring requires tracking thyroid, liver, and pulmonary function across multiple lab and imaging systems over time — no single encounter captures all monitoring requirements.',
    whyTailrd: 'TAILRD tracked amiodarone prescription duration against required organ monitoring schedules to identify overdue thyroid, hepatic, and pulmonary surveillance.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on amiodarone monitoring gap of 40% applied to estimated AF panel of 12,000 patients: 12,000 x 5% on amiodarone x 40% overdue x 50% identifiable x 35% market share = ~75 patients. Dollar opportunity: monitoring panel ($800/patient) x 70% completion rate x 75 = $42,000. Conversion rate: 70%.',
  },
  {
    id: 'ep-gap-40-carotid-stroke',
    name: 'Stroke/TIA — Carotid Stenosis Not Evaluated',
    category: 'Gap',
    patientCount: 50,
    dollarOpportunity: 126000,
    evidence:
      'NASCET: CEA for symptomatic carotid stenosis >=70%: 5-year stroke reduction 17% absolute (NNT 6). For stenosis 50-69%: 5-year reduction 7%. Class I to evaluate carotid stenosis after TIA or non-disabling stroke within 24-48h (EMERGENT for high-risk). Carotid stenting alternative for high surgical risk.',
    cta: 'Order Carotid Duplex Ultrasound',
    priority: 'high',
    tag: 'Cross-Module | EP + CAD',
    detectionCriteria: [
      'Ischemic stroke (I63.x) or TIA (G45.x) in past 12 months',
      'No carotid duplex ultrasound or CTA neck in past 12 months',
      'No prior CEA or carotid stenting documented',
      'AF diagnosis co-existing — evaluate both atrial and carotid sources',
      'Patient count (55) counted in CAD module to avoid double-counting in aggregate totals',
    ],
    patients: carotidPatientsEP,
    whyMissed: 'Post-stroke carotid evaluation spans neurology and vascular surgery. Carotid imaging orders often fall between specialties during the post-stroke workup.',
    whyTailrd: 'TAILRD connected stroke/TIA diagnosis with absence of carotid imaging to identify this vascular evaluation gap in the post-stroke workup.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on stroke/TIA incidence applied to estimated EP panel. Dollar opportunity: carotid evaluation and intervention DRG x 50 patients x procedural conversion rate = $126,000. Conversion rate: 30%.',
  },
  {
    id: 'ep-gap-41-fontan',
    name: 'Fontan Circulation — Anticoagulation and Monitoring Overdue',
    category: 'Gap',
    patientCount: 12,
    dollarOpportunity: 10080,
    evidence:
      'Fontan circulation: systemic venous pressure 10-20mmHg with passive pulmonary flow. Thrombosis risk is high due to sluggish flow. Most adult congenital cardiologists recommend anticoagulation. Annual surveillance: echo, liver function, hepatic US (Fontan-associated liver disease), 24h Holter, 6MWT. Adult CHD specialist referral strongly recommended.',
    cta: 'Refer to Adult Congenital Heart Disease Specialist',
    priority: 'high',
    detectionCriteria: [
      'Congenital HD with Fontan palliation (ICD-10 Q21.x, Q22.x, or Z98.89 with Fontan in history)',
      'NOT on anticoagulation',
      'No documented cardiac surveillance in 24 months',
      'Annual surveillance needed: echo, LFTs, hepatic US, 24h Holter, 6MWT',
    ],
    patients: fontanPatients,
    whyMissed: 'Fontan patients require specialized monitoring across adult congenital heart disease and anticoagulation clinics — a rare population easily lost to standard follow-up protocols.',
    whyTailrd: 'TAILRD identified this Fontan patient with overdue anticoagulation monitoring and surveillance — a specialized population that standard cardiology workflows don\'t track.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on Fontan prevalence applied to estimated congenital heart disease panel. Dollar opportunity: monitoring panel ($1,200/patient) x 70% completion rate x 12 = $10,080. Conversion rate: 70%.',
  },
  // ── GAPS 53, 64-72: NEW CLINICAL GAP DETECTION RULES ─────────────────────
  // Cross-module — patient count (143) attributed to CAD module for aggregate totals
  {
    id: 'ep-gap-53-oac-monotherapy',
    name: 'Aspirin + OAC in Stable CAD — Excess Bleeding Risk (Cross-Module CAD+EP)',
    category: 'Gap',
    patientCount: 95,
    dollarOpportunity: 0,
    priority: 'medium',
    tag: 'Cross-Module | CAD + EP | Bleeding Risk',
    evidence:
      'ACC/AHA AF guidelines: OAC monotherapy appropriate for stable CAD + AF beyond 12 months post-stent. Aspirin + OAC adds major bleeding risk (HR ~1.6) without significant ischemic benefit in stable CAD. AUGUSTUS trial: apixaban alone superior to aspirin + apixaban for bleeding with no ischemic trade-off in AF + ACS/PCI.',
    cta: 'Discontinue Aspirin — OAC Monotherapy Appropriate',
    detectionCriteria: [
      'AF (I48.x) AND stable CAD (I25.x — no ACS or PCI in past 12 months)',
      'Currently on BOTH an oral anticoagulant AND aspirin',
      'No stent implanted in past 12 months',
      'Note: aggregate patient count attributed to CAD module for executive totals (cross-module coordination)',
    ],
    patients: [
      {
        id: 'EP-OAC-001',
        name: 'Florence Nakagawa',
        mrn: 'MRN-EP-53001',
        age: 74,
        signals: [
          'AF (persistent) + stable CAD — last PCI 28 months ago',
          'On apixaban 5mg BID + aspirin 81mg',
          'Beyond 12-month post-stent window — aspirin no longer indicated',
          'AUGUSTUS: aspirin adds bleeding risk without ischemic benefit in stable CAD + AF',
        ],
        keyValues: {
          'AF Type': 'Persistent',
          'Last PCI': '28 months ago',
          'OAC': 'Apixaban 5mg BID',
          'Aspirin': '81mg — should discontinue',
          'CHA2DS2-VASc': '5',
          'HAS-BLED': '3',
        },
      },
      {
        id: 'EP-OAC-002',
        name: 'Albert Greenwood',
        mrn: 'MRN-EP-53002',
        age: 68,
        signals: [
          'Paroxysmal AF + stable CAD (no ACS in 18 months)',
          'On rivaroxaban 20mg + aspirin 81mg',
          'Guideline: discontinue aspirin in stable CAD + AF beyond 12 months post-stent',
        ],
        keyValues: {
          'AF Type': 'Paroxysmal',
          'Last PCI': '18 months ago',
          'OAC': 'Rivaroxaban 20mg',
          'Aspirin': '81mg — discontinue',
          'CHA2DS2-VASc': '4',
          'HAS-BLED': '3',
        },
      },
      {
        id: 'EP-OAC-003',
        name: 'Iris Kowalczyk',
        mrn: 'MRN-EP-53003',
        age: 79,
        signals: [
          'Permanent AF + stable CAD — last PCI 36 months ago',
          'On apixaban 2.5mg BID + aspirin 81mg',
          'Age 79: excess bleeding risk with dual therapy',
        ],
        keyValues: {
          'AF Type': 'Permanent',
          'Last PCI': '36 months ago',
          'OAC': 'Apixaban 2.5mg BID (renal dose)',
          'Aspirin': '81mg — discontinue',
          'eGFR': '38 mL/min',
          'CHA2DS2-VASc': '6',
        },
      },
    ],
    whyMissed: 'Aspirin + OAC dual therapy in stable CAD requires connecting medication list with CAD stability timeline — pharmacy systems don\'t flag duration-based deprescribing opportunities.',
    whyTailrd: 'TAILRD connected OAC prescription, concurrent aspirin use, and CAD stability duration to identify excess bleeding risk from unnecessary dual antithrombotic therapy.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on AUGUSTUS trial OAC + aspirin dual therapy prevalence applied to estimated AF + CAD overlap panel. Dollar opportunity: $0 -- safety/deprescribing alert. Cost avoidance: avoided major bleed ($25K avg) x probability. Conversion rate: N/A.',
  },
  {
    id: 'ep-gap-64-persistent-af-rhythm',
    name: 'Persistent AF — Rhythm Control Strategy Not Pursued',
    category: 'Gap',
    patientCount: 85,
    dollarOpportunity: 663000,
    priority: 'high',
    evidence:
      'EAST-AFNET 4 (Kirchhof, NEJM 2020): Early rhythm control vs rate control in AF <=1 year. CV death + stroke + HF hospitalization: HR 0.79 (P=0.005). Benefit greatest in early AF. With PFA and newer AADs, rhythm control preferred especially in younger patients and early AF.',
    cta: 'Discuss Rhythm Control Strategy — Cardioversion + AAD or Ablation',
    detectionCriteria: [
      'Persistent AF (I48.1x — AF >7 days or requiring cardioversion)',
      'Age <75',
      'No cardioversion (CPT 92960 or 92961) in past 12 months',
      'No antiarrhythmic drug prescribed AND no AF ablation',
      'On rate control only (BB, CCB, or digoxin without AAD)',
    ],
    patients: [
      {
        id: 'EP-PAF-001',
        name: 'Gordon Whitaker',
        mrn: 'MRN-EP-64001',
        age: 58,
        signals: [
          'Persistent AF x5 months — on metoprolol only',
          'No cardioversion attempted; no AAD prescribed',
          'EAST-AFNET 4: early rhythm control HR 0.79 vs rate control',
          'Age 58 — prime candidate for PFA ablation',
        ],
        keyValues: {
          'AF Duration': '5 months (persistent)',
          'Rate Control': 'Metoprolol 50mg BID',
          'AAD': 'None',
          'Cardioversion': 'None performed',
          'LA Size': '42mm',
          'LVEF': '52%',
        },
      },
      {
        id: 'EP-PAF-002',
        name: 'Debra Lindholm',
        mrn: 'MRN-EP-64002',
        age: 65,
        signals: [
          'Persistent AF x9 months — rate control only',
          'On diltiazem 240mg SR — no attempt at rhythm control',
          'Symptomatic: fatigue and exercise intolerance',
          'EAST-AFNET 4: CV death + stroke + HF reduced 21% with rhythm control',
        ],
        keyValues: {
          'AF Duration': '9 months (persistent)',
          'Rate Control': 'Diltiazem 240mg SR',
          'AAD': 'None',
          'Cardioversion': 'None',
          'Symptoms': 'Fatigue + exercise intolerance',
          'LVEF': '48%',
        },
      },
      {
        id: 'EP-PAF-003',
        name: 'Nathan Espinosa',
        mrn: 'MRN-EP-64003',
        age: 72,
        signals: [
          'Persistent AF x3 months — newly diagnosed, rate control started',
          'No rhythm control plan documented',
          'Age 72 (<75): rhythm control beneficial per EAST-AFNET 4',
          'Early AF window: best outcomes with rhythm control in first 1 year',
        ],
        keyValues: {
          'AF Duration': '3 months (new persistent)',
          'Rate Control': 'Metoprolol 100mg',
          'AAD': 'None',
          'Age': '72 (<75 — rhythm control beneficial)',
          'LVEF': '55%',
          'LA Size': '40mm',
        },
      },
    ],
    whyMissed: 'Rhythm control strategy requires connecting AF duration, symptom burden, and medication history — decisions made across multiple EP and cardiology encounters without unified view.',
    whyTailrd: 'TAILRD assembled AF classification, symptom burden, and rate control medication history to identify this patient for rhythm control strategy evaluation.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on EAST-AFNET 4 early AF rhythm control applied to estimated AF panel of 12,000 patients: 12,000 x 10% persistent AF x 60% rate control only x 35% market share = ~85 patients. Dollar opportunity: cardioversion ($1,800) + ablation subset ($26,000 DRG x 30% conversion) = $663,000. Conversion rate: 30%.',
  },
  {
    id: 'ep-gap-65-ilr-cryptogenic-stroke',
    name: 'Cryptogenic Stroke — Implantable Loop Recorder Not Ordered',
    category: 'Gap',
    patientCount: 65,
    dollarOpportunity: 386750,
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on CRYSTAL-AF ILR ordering gap of 70% applied to estimated cryptogenic stroke: 1,200 strokes x 25% cryptogenic = ~300. 300 x 70% no ILR x 55% identifiable x 35% market share = ~65 patients. Dollar opportunity: ILR implant $8,500 x 70% completion rate x 65 = $386,750. Conversion rate: 70%.',
    priority: 'high',
    evidence:
      'CRYSTAL-AF (Sanna, NEJM 2014): ICM vs standard monitoring after cryptogenic stroke. AF detection at 6 months: 8.9% vs 1.4% (P<0.001). At 3 years: 30% AF detection with ICM vs 3%. EMBRACE trial: extended monitoring detected AF in 16.1% vs 3.2%. ILR (Reveal LINQ): CPT 33285.',
    cta: 'Refer for Implantable Loop Recorder',
    detectionCriteria: [
      'Cryptogenic stroke or TIA (I63.x with cryptogenic or ESUS documented)',
      'No AF documented',
      'No ILR (CPT 33285) ordered',
      'Standard workup completed (echo done, no AF on telemetry or Holter, no carotid stenosis)',
    ],
    patients: [
      {
        id: 'EP-ILR-001',
        name: 'Beatrice Harmon',
        mrn: 'MRN-EP-65001',
        age: 63,
        signals: [
          'Cryptogenic stroke 4 months ago — workup negative',
          '24h Holter: no AF detected',
          'Echo: normal, no PFO identified',
          'ILR not ordered — CRYSTAL-AF: 30% AF detection at 3 years with ILR',
        ],
        keyValues: {
          'Stroke Type': 'Cryptogenic (4 months ago)',
          'Holter': '24h — no AF',
          'Echo': 'Normal',
          'Carotid Stenosis': 'No',
          'ILR': 'Not ordered',
          'Current AC': 'Aspirin only',
        },
      },
      {
        id: 'EP-ILR-002',
        name: 'Patrick Obeng',
        mrn: 'MRN-EP-65002',
        age: 57,
        signals: [
          'ESUS (embolic stroke undetermined source) 2 months ago',
          '48h Holter done — no AF',
          'TTE done — no structural cause identified',
          'No ILR ordered; CRYSTAL-AF: 8.9% AF at 6 months with ILR',
        ],
        keyValues: {
          'Stroke Type': 'ESUS (2 months ago)',
          'Holter': '48h — no AF',
          'TTE': 'Normal',
          'ILR': 'Not ordered',
          'TEE': 'Not performed',
          'Current AC': 'Aspirin 81mg',
        },
      },
      {
        id: 'EP-ILR-003',
        name: 'Constance Ferreira',
        mrn: 'MRN-EP-65003',
        age: 70,
        signals: [
          'Cryptogenic TIA 6 months ago — standard workup negative',
          '24h Holter: no AF; carotid duplex: no stenosis',
          'Echo: mild LVH, no thrombus',
          'No ILR ordered despite guideline recommendation',
        ],
        keyValues: {
          'Event': 'Cryptogenic TIA (6 months ago)',
          'Holter': '24h — no AF',
          'Carotid': 'No significant stenosis',
          'Echo': 'Mild LVH',
          'ILR': 'Not ordered',
          'Current AC': 'Aspirin 81mg',
        },
      },
    ],
    whyMissed: 'Cryptogenic stroke ILR implantation spans neurology and EP — the stroke team diagnoses \'cryptogenic\' but the ILR referral to EP often doesn\'t happen.',
    whyTailrd: 'TAILRD connected cryptogenic stroke diagnosis from neurology with absence of long-term rhythm monitoring to identify this ILR candidate.',
  },
  {
    id: 'ep-gap-66-dofetilide-rems',
    name: 'Dofetilide Initiation — REMS Protocol Compliance',
    category: 'Safety',
    patientCount: 17,
    dollarOpportunity: 0,
    priority: 'high',
    safetyNote:
      'PATIENT SAFETY ALERT: Dofetilide REMS program requires mandatory 3-day inpatient hospitalization for initiation with QTc monitoring. Outpatient initiation is FDA REMS non-compliance. TdP risk 0.8-3.3% primarily in first 72 hours. Urgent review required.',
    evidence:
      'Dofetilide REMS program — mandatory FDA requirement: 3-day inpatient hospitalization for initiation with QTc monitoring at baseline and 2-3h after each dose. QTc >500ms requires dose reduction or discontinuation. Prescribers must be REMS-certified. TdP risk 0.8-3.3% primarily in first 72 hours. Dose must be renally adjusted at initiation.',
    cta: 'Urgent Safety Review — Verify REMS Protocol Compliance',
    detectionCriteria: [
      'Dofetilide (Tikosyn) in medication list',
      'No documented 3-day inpatient hospitalization for initiation',
      'No ICD or QTc monitoring device documented',
    ],
    patients: [
      {
        id: 'EP-DOF-001',
        name: 'Raymond Polk',
        mrn: 'MRN-EP-66001',
        age: 71,
        signals: [
          'Dofetilide 500mcg BID in medication list',
          'No inpatient hospitalization documented for initiation',
          'REMS non-compliance: outpatient initiation is FDA violation',
          'QTc monitoring during initiation not documented',
        ],
        keyValues: {
          'Medication': 'Dofetilide 500mcg BID',
          'Initiation Hospitalization': 'Not documented',
          'eGFR': '58 mL/min',
          'QTc at Initiation': 'Not documented',
          'REMS Compliance': 'Non-compliant — urgent review',
          'TdP Risk': '0.8-3.3%',
        },
      },
      {
        id: 'EP-DOF-002',
        name: 'Sylvia Drummond',
        mrn: 'MRN-EP-66002',
        age: 68,
        signals: [
          'Dofetilide 250mcg BID (renal-dose adjusted)',
          'Initiated at outside facility — no transfer records showing 3-day monitoring',
          'eGFR 42 — dose requires adjustment; monitoring especially critical',
          'REMS compliance documentation missing',
        ],
        keyValues: {
          'Medication': 'Dofetilide 250mcg BID',
          'Renal Adjustment': 'Yes — eGFR 42',
          'Initiation Records': 'Missing/unverified',
          'QTc Current': '452ms',
          'REMS Compliance': 'Unverified — urgent review',
          'Indication': 'Persistent AF',
        },
      },
      {
        id: 'EP-DOF-003',
        name: 'Carl Minton',
        mrn: 'MRN-EP-66003',
        age: 75,
        signals: [
          'Dofetilide 500mcg BID — started by cardiologist 3 months ago',
          'No 3-day inpatient record; appears outpatient initiation',
          'CKD stage 3: eGFR 48 — dose may need reduction',
          'Current QTc 468ms — borderline elevated',
        ],
        keyValues: {
          'Medication': 'Dofetilide 500mcg BID',
          'eGFR': '48 mL/min',
          'Initiation Type': 'Apparent outpatient — REMS non-compliant',
          'Current QTc': '468ms',
          'Dose Check': 'May need reduction for eGFR 40-60',
          'REMS Compliance': 'Non-compliant',
        },
      },
    ],
    whyMissed: 'Dofetilide REMS compliance requires connecting pharmacy dispensing data with required ECG and lab monitoring — a regulatory compliance gap across clinical systems.',
    whyTailrd: 'TAILRD tracked dofetilide prescription against required REMS monitoring protocol to identify this patient with overdue compliance checks.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on dofetilide REMS non-compliance of 8% applied to estimated AF dofetilide users: 12,000 x 2% = 240. 240 x 8% = ~17 patients. Dollar opportunity: $0 -- safety alert. Cost avoidance: avoided torsades event ($25K avg ICU stay) x probability. Conversion rate: N/A.',
  },
  {
    id: 'ep-gap-67-dronedarone-contraindication',
    name: 'Dronedarone Prescribed — Contraindication Detected',
    category: 'Safety',
    patientCount: 20,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'Black Box Warning | Dronedarone',
    safetyNote:
      'FDA BLACK BOX WARNING: Dronedarone (Multaq) is CONTRAINDICATED in permanent AF, NYHA III-IV HF, and recently decompensated HF. PALLAS trial stopped early: CV death HR 2.11, stroke HR 1.76. ANDROMEDA stopped early: mortality HR 2.13. Discontinue immediately in contraindicated patients.',
    evidence:
      'PALLAS trial: Dronedarone in permanent AF — increased HF hospitalization (HR 2.08), stroke (HR 1.76), CV death (HR 2.11). Stopped early. ANDROMEDA: Dronedarone in severe HF — mortality HR 2.13. Stopped early. FDA Black Box Warning. Dronedarone ONLY appropriate for paroxysmal/persistent AF with LVEF >=35% and no advanced HF.',
    cta: 'Urgent Medication Review — Discontinue Dronedarone',
    detectionCriteria: [
      'Patient on dronedarone (Multaq)',
      'Permanent AF (I48.2x — not pursuing rhythm control) OR',
      'NYHA Class III-IV OR LVEF <35% OR',
      'Recently decompensated HF (HF hospitalization in past 6 months)',
    ],
    patients: [
      {
        id: 'EP-DRON-001',
        name: 'Winston Haley',
        mrn: 'MRN-EP-67001',
        age: 73,
        signals: [
          'Permanent AF (I48.21) on dronedarone 400mg BID',
          'FDA Black Box: dronedarone CONTRAINDICATED in permanent AF',
          'PALLAS: CV death HR 2.11 in permanent AF',
          'Immediate discontinuation required',
        ],
        keyValues: {
          'AF Type': 'Permanent (I48.21)',
          'Medication': 'Dronedarone 400mg BID',
          'Contraindication': 'Permanent AF — BLACK BOX WARNING',
          'PALLAS Risk': 'CV death HR 2.11',
          'Action': 'Discontinue immediately',
          'LVEF': '50%',
        },
      },
      {
        id: 'EP-DRON-002',
        name: 'Gwendolyn Stokes',
        mrn: 'MRN-EP-67002',
        age: 67,
        signals: [
          'Persistent AF + NYHA Class III HF on dronedarone',
          'LVEF 28% — CONTRAINDICATED (ANDROMEDA: mortality HR 2.13)',
          'Dronedarone only approved for LVEF >=35%',
          'Urgent discontinuation — life-threatening combination',
        ],
        keyValues: {
          'AF Type': 'Persistent',
          'LVEF': '28% (contraindicated — requires >=35%)',
          'NYHA Class': 'III',
          'Medication': 'Dronedarone 400mg BID',
          'ANDROMEDA Risk': 'Mortality HR 2.13',
          'Action': 'Discontinue — URGENT',
        },
      },
      {
        id: 'EP-DRON-003',
        name: 'Marcus Holbrook',
        mrn: 'MRN-EP-67003',
        age: 70,
        signals: [
          'Paroxysmal AF + HF hospitalization 3 months ago (decompensated)',
          'On dronedarone 400mg BID — recently decompensated HF contraindication',
          'FDA: contraindicated within 4 weeks of decompensated HF',
          'LVEF 33% — also near absolute contraindication threshold',
        ],
        keyValues: {
          'AF Type': 'Paroxysmal',
          'Last HF Hospitalization': '3 months ago (decompensated)',
          'LVEF': '33%',
          'Medication': 'Dronedarone 400mg BID',
          'Contraindication': 'Recent decompensated HF',
          'Action': 'Discontinue — review alternative AAD',
        },
      },
    ],
    whyMissed: 'Dronedarone contraindications require connecting medication list with LVEF and HF status — safety data in separate clinical domains.',
    whyTailrd: 'TAILRD connected active dronedarone prescription with LVEF and HF diagnosis to detect this safety contraindication that spans pharmacy and cardiology data.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on PALLAS/ANDROMEDA contraindication of 25% applied to estimated AF dronedarone users: 12,000 x 3% x 25% x 50% identifiable x 35% market share = ~20 patients. Dollar opportunity: $0 -- safety alert. Cost avoidance: avoided HF decompensation ($12K avg) x probability. Conversion rate: N/A.',
  },
  {
    id: 'ep-gap-68-ist-ivabradine',
    name: 'Inappropriate Sinus Tachycardia — Ivabradine Not Considered',
    category: 'Gap',
    patientCount: 22,
    dollarOpportunity: 0,
    priority: 'medium',
    tag: 'IST | POTS Consideration',
    evidence:
      'Inappropriate sinus tachycardia (ICD-10 I47.11): resting HR >100 with normal P-wave morphology without identifiable cause. Ivabradine: first-line for IST (off-label, well-supported). Reduces HR via HCN channel inhibition without negative inotropy. Starting 2.5-5mg BID. If orthostatic component: suggest tilt table test for POTS evaluation.',
    cta: 'Consider Ivabradine for Inappropriate Sinus Tachycardia',
    detectionCriteria: [
      'Resting HR >100 bpm on >=3 separate readings',
      'Sinus tachycardia confirmed (normal P-wave on ECG)',
      'Reversible causes excluded (TSH normal, CBC normal, no infection)',
      'LVEF >=50% (no significant structural disease)',
      'NOT on ivabradine AND NOT on therapeutic-dose beta-blocker',
    ],
    patients: [
      {
        id: 'EP-IST-001',
        name: 'Amanda Forsythe',
        mrn: 'MRN-EP-68001',
        age: 34,
        signals: [
          'Resting HR 112, 118, 109 on 3 separate readings — IST confirmed',
          'ECG: normal P-wave morphology — sinus',
          'TSH normal, CBC normal, no infection',
          'No ivabradine; no BB prescribed',
        ],
        keyValues: {
          'Resting HR': '112 / 118 / 109 bpm (3 readings)',
          'ECG': 'Normal P-wave — sinus',
          'TSH': 'Normal',
          'CBC': 'Normal',
          'Ivabradine': 'Not prescribed',
          'Beta-Blocker': 'None',
        },
      },
      {
        id: 'EP-IST-002',
        name: 'Tiffany Ochoa',
        mrn: 'MRN-EP-68002',
        age: 28,
        signals: [
          'HR 125 at rest on 3 visits — sinus tachycardia',
          'Orthostatic component: HR rises 42 bpm on standing — POTS possible',
          'TSH and CBC normal; no infection',
          'No ivabradine; no BB — tilt table test not ordered',
        ],
        keyValues: {
          'Resting HR': '125 / 122 / 120 bpm',
          'Orthostatic HR Rise': '+42 bpm on standing',
          'TSH': 'Normal',
          'Ivabradine': 'Not prescribed',
          'POTS Screen': 'Tilt table not ordered',
          'LVEF': '62%',
        },
      },
      {
        id: 'EP-IST-003',
        name: 'Joshua Meredith',
        mrn: 'MRN-EP-68003',
        age: 41,
        signals: [
          'Persistent resting HR 105, 111, 108 bpm — IST diagnosis',
          'ECG: sinus rhythm, normal P-wave morphology',
          'No structural heart disease (LVEF 60%, no valvular disease)',
          'Not on ivabradine or BB',
        ],
        keyValues: {
          'Resting HR': '105 / 111 / 108 bpm',
          'ECG': 'Sinus rhythm',
          'LVEF': '60%',
          'TSH': 'Normal',
          'Ivabradine': 'Not prescribed',
          'Beta-Blocker': 'None',
        },
      },
    ],
    whyMissed: 'IST diagnosis requires excluding secondary causes and connecting sinus tachycardia pattern with symptom burden — a diagnosis of exclusion rarely formally documented.',
    whyTailrd: 'TAILRD identified persistent inappropriate sinus tachycardia pattern across multiple encounters with documented symptoms and absence of ivabradine trial.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on IST prevalence of 1% in EP referrals: broader EP panel x 1% IST x 50% not on ivabradine x 60% identifiable x 35% market share = ~22 patients. Dollar opportunity: $0 -- ivabradine is retail pharmacy. Clinical value is in symptom improvement. Conversion rate: N/A.',
  },
  {
    id: 'ep-gap-69-flutter-ablation',
    name: 'Typical Atrial Flutter — Ablation Not Offered',
    category: 'Gap',
    patientCount: 58,
    dollarOpportunity: 542880,
    priority: 'high',
    evidence:
      'CTI ablation for typical flutter: >97% acute success, <10% recurrence at 1 year — essentially curative. ACC/AHA AF/flutter guidelines: ablation Class I for recurrent symptomatic flutter. AAD therapy has high recurrence and toxicity burden. Revenue: $12,000-$20,000 per flutter ablation. Complication rate <1%.',
    cta: 'Refer for CTI Ablation',
    detectionCriteria: [
      'Typical atrial flutter (I48.3 or I48.4)',
      'On AAD or rate control medication for flutter',
      'No CTI ablation (CPT 93655)',
      'No documented reason for not ablating (patient refusal, prohibitive comorbidity)',
    ],
    patients: [
      {
        id: 'EP-FLUT-001',
        name: 'Edgar Whitman',
        mrn: 'MRN-EP-69001',
        age: 62,
        signals: [
          'Typical atrial flutter (I48.3) — 2 episodes in past 8 months',
          'On sotalol 80mg BID — recurrence despite AAD',
          'No CTI ablation offered or performed',
          'CTI ablation: >97% success, <10% recurrence at 1 year',
        ],
        keyValues: {
          'Flutter Type': 'Typical (counterclockwise CTI-dependent)',
          'Episodes': '2 in past 8 months',
          'AAD': 'Sotalol 80mg BID',
          'CTI Ablation': 'Not offered',
          'Complication Rate': '<1%',
          'LVEF': '55%',
        },
      },
      {
        id: 'EP-FLUT-002',
        name: 'Josephine Calderon',
        mrn: 'MRN-EP-69002',
        age: 70,
        signals: [
          'Persistent atrial flutter — on amiodarone 200mg for rate/rhythm control',
          'Amiodarone toxicity risk: thyroid, pulmonary, hepatic',
          'CTI ablation not discussed — essentially curative with >97% success',
          'Ablation would eliminate need for amiodarone',
        ],
        keyValues: {
          'Flutter Type': 'Typical — persistent',
          'AAD': 'Amiodarone 200mg daily',
          'Amiodarone Duration': '14 months',
          'CTI Ablation': 'Not discussed',
          'Thyroid': 'TSH normal (monitor)',
          'LVEF': '48%',
        },
      },
      {
        id: 'EP-FLUT-003',
        name: 'Stanley Bergman',
        mrn: 'MRN-EP-69003',
        age: 66,
        signals: [
          'Recurrent typical flutter — 3 cardioversions in past 12 months',
          'On rate control only (metoprolol) — no AAD due to COPD',
          'Cardioversions not durable — ablation is curative option',
          'CTI ablation not offered despite recurrent cardioversions',
        ],
        keyValues: {
          'Flutter Type': 'Typical — recurrent',
          'Cardioversions': '3 in past 12 months',
          'Rate Control': 'Metoprolol 50mg BID',
          'AAD Limitation': 'COPD limits options',
          'CTI Ablation': 'Not offered',
          'LVEF': '52%',
        },
      },
    ],
    whyMissed: 'Typical atrial flutter ablation has >95% cure rate but patients are often managed with rate control alone. The ablation option falls between medical management and procedural referral.',
    whyTailrd: 'TAILRD identified typical flutter on ECG/rhythm monitoring with ongoing rate-control-only management — a curable arrhythmia being managed medically.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on typical atrial flutter prevalence of 8% applied to estimated AF panel of 12,000 patients: 12,000 x 8% x 50% on rate control without ablation x 40% identifiable x 35% market share = ~58 patients. Dollar opportunity: CTI ablation DRG $26,000 x 30% procedural conversion rate x 58 = $452,400. Conversion rate: 30%.',
  },
  {
    id: 'ep-gap-70-device-battery-eol',
    name: 'Device Battery at ERI/EOL — Generator Replacement Needed',
    category: 'Safety',
    patientCount: 15,
    dollarOpportunity: 0,
    priority: 'high',
    safetyNote:
      'URGENT: ERI gives ~3 months warning before EOL. Pacemaker-dependent patients at EOL risk asystole. ICD patients lose defibrillation capability — risk of untreated VF. Generator replacement is elective at ERI but urgent at EOL.',
    evidence:
      'ERI gives approximately 3 months warning before EOL. At EOL: pacemaker-dependent patients lose pacing — risk of asystole and death. ICD patients lose defibrillation capability. Generator replacement: CPT 33228 (PM) or 33262 (ICD) — 30-45 minutes. ERI to EOL: 3-6 months depending on device type and pacing burden.',
    cta: 'Schedule Generator Replacement — ERI/EOL Documented',
    detectionCriteria: [
      'Pacemaker, ICD, or CRT-D documented',
      'Remote monitoring or interrogation documenting battery at ERI or EOL in past 90 days',
      'No generator replacement scheduled or performed (no CPT 33227-33229 for PM, 33262-33264 for ICD)',
    ],
    patients: [
      {
        id: 'EP-EOL-001',
        name: 'Francis Ostrowski',
        mrn: 'MRN-EP-70001',
        age: 78,
        signals: [
          'Dual-chamber pacemaker — battery at ERI (estimated 3 months to EOL)',
          'PM-dependent (no underlying rhythm)',
          'No generator replacement scheduled — URGENT',
          'Remote monitoring report: ERI status noted 6 weeks ago',
        ],
        keyValues: {
          'Device': 'Dual-chamber pacemaker',
          'Battery Status': 'ERI',
          'Days to EOL': '23',
          'Pacemaker Dependent': 'Yes',
          'PM-Dependent': 'Yes — no intrinsic rhythm',
          'Replacement Scheduled': 'No — URGENT',
          'Time Since ERI': '6 weeks',
          'CPT Required': '33228',
        },
      },
      {
        id: 'EP-EOL-002',
        name: 'Geraldine Plum',
        mrn: 'MRN-EP-70002',
        age: 72,
        signals: [
          'Single-chamber ICD at ERI — documented on remote monitoring',
          'HCM patient — ICD for primary prevention',
          'Battery ERI: defibrillation capability may be reduced at EOL',
          'No generator change scheduled — 2 months since ERI alert',
        ],
        keyValues: {
          'Device': 'Single-chamber ICD',
          'Battery Status': 'ERI',
          'Days to EOL': '47',
          'Pacemaker Dependent': 'No',
          'Indication': 'HCM — primary prevention',
          'ERI Alert': '2 months ago',
          'Replacement Scheduled': 'No',
          'CPT Required': '33262',
        },
      },
      {
        id: 'EP-EOL-003',
        name: 'Arnold Mckenzie',
        mrn: 'MRN-EP-70003',
        age: 65,
        signals: [
          'CRT-D at EOL — detected on in-office interrogation',
          'HFrEF LVEF 28% — ICD + CRT dependent',
          'EOL: loss of both CRT pacing AND defibrillation',
          'Generator replacement not yet scheduled',
        ],
        keyValues: {
          'Device': 'CRT-D (biventricular ICD)',
          'Battery Status': 'EOL — detected at interrogation',
          'LVEF': '28% — CRT + ICD dependent',
          'Replacement Scheduled': 'No — needs urgent scheduling',
          'CPT Required': '33264',
          'Risk': 'Loss of CRT + defibrillation at EOL',
        },
      },
    ],
    whyMissed: 'Device battery status sits in device clinic interrogation data — often in a separate system from the main EHR. Battery alerts may not reach the ordering physician.',
    whyTailrd: 'TAILRD connected device interrogation data showing ERI/EOL battery status with clinical urgency — particularly pacemaker dependency — to flag this generator replacement need.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on device ERI/EOL prevalence of 2% applied to estimated active device population ~8,000: 8,000 x 2% x 50% identifiable x 35% market share = ~15 patients. Dollar opportunity: $0 -- safety alert. Cost avoidance: avoided device failure event. Conversion rate: N/A.',
  },
  {
    id: 'ep-gap-71-pvc-cardiomyopathy',
    name: 'Frequent PVCs + Declining LVEF — PVC Burden Not Quantified',
    category: 'Discovery',
    patientCount: 100,
    dollarOpportunity: 780000,
    priority: 'high',
    evidence:
      '>10-15% PVC burden on Holter associated with reversible LVEF decline. LVEF recovery after successful PVC ablation: +5-15% in multiple cohort studies. LVEF decline cannot be attributed to idiopathic DCM until PVC burden quantified. Outflow tract PVC ablation success: 85-95%. 24h Holter: CPT 93224.',
    cta: 'Order 24-48h Holter Monitor for PVC Quantification',
    detectionCriteria: [
      'LVEF <=50% with prior echo showing LVEF >=55% (declining trend)',
      'PVCs documented on ECG, telemetry, or Holter',
      'No 24-48h Holter to quantify PVC burden in past 6 months',
      'No other clear cause of LVEF decline (no new MI, no new valve disease)',
    ],
    patients: [
      {
        id: 'EP-PVC-001',
        name: 'Spencer Hutchins',
        mrn: 'MRN-EP-71001',
        age: 54,
        signals: [
          'LVEF: 60% (18 months ago) → 44% (current) — significant decline',
          'PVCs on ECG: frequent, uniform morphology (RVOT pattern)',
          'No 24h Holter to quantify burden',
          'PVC-CM possible: >15% burden reversible with ablation',
        ],
        keyValues: {
          'Prior LVEF': '60% (18 months ago)',
          'Current LVEF': '44%',
          'LVEF Trend': 'Declining (-16%)',
          'PVCs on ECG': 'Frequent, uniform (RVOT pattern)',
          '24h Holter': 'Not ordered',
          'New MI': 'No',
          'Estimated PVC %': '18%',
          'Prior PVC %': '12%',
        },
      },
      {
        id: 'EP-PVC-002',
        name: 'Lorena Vasquez',
        mrn: 'MRN-EP-71002',
        age: 47,
        signals: [
          'LVEF: 58% (2 years ago) → 46% now — progressive decline',
          'Frequent PVCs on telemetry (bigeminy noted)',
          'No Holter; labeled "idiopathic DCM" without PVC burden quantification',
          'LVEF decline cannot be attributed to DCM until PVC burden ruled out',
        ],
        keyValues: {
          'Prior LVEF': '58%',
          'Current LVEF': '46%',
          'PVCs': 'Frequent bigeminy on telemetry',
          '24h Holter': 'None in 2 years',
          'Current Dx': 'Idiopathic DCM (premature)',
          'Holter Needed': 'Yes — PVC burden quantification',
        },
      },
      {
        id: 'EP-PVC-003',
        name: 'Gregory Faulkner',
        mrn: 'MRN-EP-71003',
        age: 61,
        signals: [
          'LVEF decline: 62% → 48% over 12 months — rapid drop',
          'PVCs documented on stress test and ECG',
          'No Holter ordered — likely PVC cardiomyopathy',
          'PVC ablation success 85-95% in outflow tract origin',
        ],
        keyValues: {
          'Prior LVEF': '62% (12 months ago)',
          'Current LVEF': '48%',
          'PVCs': 'Documented on stress test + ECG',
          '24h Holter': 'Not ordered',
          'Cause of LVEF Decline': 'Unknown — PVC-CM likely',
          'Ablation Outcome': '85-95% success if RVOT origin',
          'Estimated PVC %': '22%',
          'Prior PVC %': '15%',
        },
      },
    ],
    whyMissed: 'LVEF decline and PVC burden appear on separate tests ordered months apart. The causal connection requires pattern recognition across time.',
    whyTailrd: 'TAILRD connected LVEF decline across echos with PVC documentation on ECG and telemetry — a reversible cause of cardiomyopathy that will be attributed to idiopathic DCM without this analysis.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on PVC burden prevalence of 8% in arrhythmia panel applied to estimated AF/arrhythmia panel of 12,000 patients: 12,000 x 8% PVC burden x 30% declining LVEF x 35% market share = ~100 patients. Dollar opportunity: PVC ablation DRG $26,000 x 30% procedural conversion rate x 100 = $780,000. Conversion rate: 30%.',
  },
  {
    id: 'ep-gap-72-lqts-bb',
    name: 'Congenital LQTS — Beta-Blocker Not Prescribed',
    category: 'Gap',
    patientCount: 15,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'LQTS | Nadolol Preferred',
    evidence:
      'LQT1 and LQT2 (80% of cases) respond well to beta-blockers. Nadolol 1-2mg/kg/day preferred — non-selective, higher efficacy. Propranolol alternative. Metoprolol less effective (cardioselective). Class I recommendation. LQT3 (SCN5A): mexiletine + BB. ICD for high-risk: prior arrest, syncope on BB, QTc >500ms on therapy.',
    cta: 'Initiate Beta-Blocker Therapy (Nadolol Preferred)',
    detectionCriteria: [
      'LQTS diagnosis (I45.81) OR positive LQTS genetic testing (KCNQ1/LQT1, KCNH2/LQT2, SCN5A/LQT3)',
      'NOT on nadolol or propranolol',
      'ICD present or not — BB indicated regardless as adjunct',
    ],
    patients: [
      {
        id: 'EP-LQTS-001',
        name: 'Madison Greer',
        mrn: 'MRN-EP-72001',
        age: 24,
        signals: [
          'LQT1 (KCNQ1 pathogenic variant confirmed) — QTc 498ms',
          'Not on any beta-blocker — Class I therapy omitted',
          'Nadolol preferred: non-selective, higher efficacy than metoprolol for LQTS',
          'LQT1: highest risk during exercise/adrenergic stimulation',
        ],
        keyValues: {
          'LQTS Type': 'LQT1 (KCNQ1)',
          'QTc': '498ms',
          'Prior QTc': '462ms',
          'QTc Date': '2025-12-01',
          'Prior QTc Date': '2025-06-01',
          'Beta-Blocker': 'Not prescribed',
          'ICD': 'No',
          'Prior Syncope': 'Yes — during swimming',
          'Recommended': 'Nadolol 1-2mg/kg/day',
        },
      },
      {
        id: 'EP-LQTS-002',
        name: 'Kevin Sutherland',
        mrn: 'MRN-EP-72002',
        age: 31,
        signals: [
          'LQT2 (KCNH2 variant) — QTc 512ms',
          'On metoprolol 25mg — suboptimal (cardioselective, less effective for LQTS)',
          'Guideline: nadolol preferred; metoprolol less effective for LQT2',
          'Should switch to nadolol or propranolol',
        ],
        keyValues: {
          'LQTS Type': 'LQT2 (KCNH2)',
          'QTc': '512ms',
          'Prior QTc': '478ms',
          'QTc Date': '2025-12-01',
          'Prior QTc Date': '2025-06-01',
          'Beta-Blocker': 'Metoprolol 25mg (suboptimal)',
          'Recommended': 'Nadolol (non-selective preferred)',
          'ICD': 'No',
          'Trigger': 'Auditory stimuli (LQT2 pattern)',
        },
      },
      {
        id: 'EP-LQTS-003',
        name: 'Allison Dupont',
        mrn: 'MRN-EP-72003',
        age: 19,
        signals: [
          'LQTS diagnosis (I45.81) — QTc 487ms',
          'No beta-blocker prescribed — Class I therapy omitted',
          'Genetic testing pending — likely LQT1 or LQT2 (family history)',
          'Nadolol while awaiting genetic results: appropriate first-line',
        ],
        keyValues: {
          'LQTS Type': 'Phenotypic (genetic pending)',
          'QTc': '487ms',
          'Prior QTc': '465ms',
          'QTc Date': '2025-12-01',
          'Prior QTc Date': '2025-06-01',
          'Beta-Blocker': 'Not prescribed',
          'Family History': 'Yes — sibling with LQTS',
          'Genetic Test': 'Pending',
          'Recommended': 'Nadolol while awaiting results',
        },
      },
    ],
    whyMissed: 'Congenital LQTS diagnosis requires connecting QTc prolongation on ECG with family history and symptom assessment — ECG interpretation alone doesn\'t trigger the therapeutic recommendation.',
    whyTailrd: 'TAILRD connected QTc prolongation pattern across multiple ECGs with absence of beta-blocker therapy to identify this congenital LQTS management gap.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on congenital LQTS prevalence of ~1:2,500 applied to catchment: 2.5M x 35% = ~875K. ~350 LQTS patients. 15% without nadolol/propranolol x 35% identifiable = ~15 patients. Dollar opportunity: $0 -- nadolol is retail pharmacy. Clinical value is in SCD prevention. Conversion rate: N/A.',
  },
  // ── GAP 39: QTc SAFETY ALERT ────────────────────
  {
    id: 'ep-gap-39-qtc-safety',
    name: 'QTc Safety Alert — Multiple QT-Prolonging Medications',
    category: 'Safety',
    patientCount: 55,
    dollarOpportunity: 0,
    priority: 'high',
    evidence:
      'Drug-induced long QT and Torsades de Pointes is preventable sudden cardiac death. Risk amplified by >=2 QT drugs, hypokalemia, hypomagnesemia, bradycardia, female sex. QTc >500ms = highest risk. CredibleMeds.org risk classification.',
    cta: 'Order ECG + Electrolytes + Medication Review',
    detectionCriteria: [
      'Patient on 2+ QT-prolonging medications (CredibleMeds Known Risk category)',
      'QTc >470ms on most recent ECG — OR — no ECG in past 6 months while on QT drugs',
      'Risk amplifiers: hypokalemia (K+ <3.5), hypomagnesemia (Mg <1.7), female sex, bradycardia, renal impairment',
      'Sub-classify: QTc >500ms = CRITICAL (9 patients); QTc 470-500ms = HIGH (24 patients); no recent ECG + >=2 QT drugs = MODERATE (27 patients)',
    ],
    patients: qtcSafetyPatients,
    subcategories: [
      { label: 'CRITICAL: QTc >500ms', count: 9 },
      { label: 'HIGH: QTc 470-500ms', count: 24 },
      { label: 'MODERATE: no recent ECG + ≥2 QT drugs', count: 27 },
    ],
    safetyNote: '9 patients at critical risk for life-threatening arrhythmia (Torsades de Pointes)',
    whyMissed: 'QTc monitoring across multiple prescribers requires connecting ECG data with a complete medication list from pharmacy — no single provider reviews the cumulative QT-prolonging drug burden.',
    whyTailrd: 'TAILRD cross-referenced the full medication list against the CredibleMeds QT drug database, integrated the latest ECG QTc value, and flagged electrolyte abnormalities to compute aggregate Torsades risk.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count based on QTc prolongation risk of 10% on >=2 QT-prolonging medications applied to estimated AF panel of 12,000 patients: 12,000 x 10% x 25% QTc >470ms x 40% identifiable x 35% market share = ~55 patients. Dollar opportunity: $0 -- safety alert. Cost avoidance: avoided Torsades de Pointes event ($25K avg ICU stay) x probability. Conversion rate: N/A.',
  },
  // ── NEW GAPS ep-22 through ep-27 ─────────────────────────────
  {
    id: 'ep-gap-22-subclinical-af-device',
    name: 'Subclinical AF on Device — Anticoagulation Not Initiated',
    category: 'Gap',
    patientCount: 85,
    dollarOpportunity: 102000,
    priority: 'high',
    evidence:
      'NOAH-AFNET 6 (Kirchhof P, NEJM 2023, PMID 37622677). ARTESiA (Healey JS, NEJM 2023). AHRE >24h associated with 2.5x stroke risk. CHA2DS2-VASc should guide anticoagulation in device-detected AF.',
    cta: 'Review Device Interrogation — Evaluate Anticoagulation Need',
    detectionCriteria: [
      'Implanted cardiac device (PM/ICD/ILR) in place',
      'Atrial high-rate episodes (AHRE) >= 6 minutes detected on interrogation',
      'No anticoagulation evaluation or OAC initiation documented',
      'CHA2DS2-VASc >= 2 (men) or >= 3 (women)',
    ],
    patients: [
      {
        id: 'EP-SCAF-001',
        name: 'Franklin Delaney',
        mrn: 'MRN-EP-22001',
        age: 74,
        signals: [
          'Dual-chamber pacemaker — AHRE detected: 4.2 hours over 30 days',
          'CHA2DS2-VASc 4 — not on anticoagulation',
          'NOAH-AFNET 6 / ARTESiA: device-detected AF carries stroke risk similar to clinical AF',
          'OAC evaluation not documented',
        ],
        keyValues: {
          'Device': 'Dual-chamber pacemaker',
          'AHRE Duration': '4.2 hours (30-day period)',
          'CHA2DS2-VASc': '4',
          'Current OAC': 'None',
          'Stroke Risk': 'High — 2.5x with AHRE >24h',
        },
      },
      {
        id: 'EP-SCAF-002',
        name: 'Lorraine Baskins',
        mrn: 'MRN-EP-22002',
        age: 69,
        signals: [
          'ICD — AHRE burden 18 hours in past 90 days',
          'CHA2DS2-VASc 3 (female) — on aspirin only',
          'ARTESiA: apixaban reduced stroke vs aspirin in subclinical AF',
          'Anticoagulation not initiated despite device-detected AF',
        ],
        keyValues: {
          'Device': 'Single-chamber ICD',
          'AHRE Duration': '18 hours (90-day period)',
          'CHA2DS2-VASc': '3',
          'Current OAC': 'Aspirin only',
          'Recommended': 'Apixaban evaluation per ARTESiA',
        },
      },
      {
        id: 'EP-SCAF-003',
        name: 'Howard Nettles',
        mrn: 'MRN-EP-22003',
        age: 78,
        signals: [
          'Implantable loop recorder — subclinical AF detected: 2.8 hours',
          'CHA2DS2-VASc 5 — high stroke risk, no OAC prescribed',
          'ILR placed for cryptogenic stroke workup — AF now confirmed',
          'Anticoagulation should be initiated',
        ],
        keyValues: {
          'Device': 'Implantable loop recorder (ILR)',
          'AHRE Duration': '2.8 hours',
          'CHA2DS2-VASc': '5',
          'Current OAC': 'None',
          'ILR Indication': 'Cryptogenic stroke workup',
        },
      },
    ],
    whyMissed: 'Device-detected subclinical AF requires connecting device interrogation data with stroke risk scoring and medication records — data in separate device clinic and pharmacy systems.',
    whyTailrd: 'TAILRD connected device interrogation AHRE data with CHA2DS2-VASc score and anticoagulation status to identify this stroke prevention gap.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count: device population (PM + ICD + ILR) x 30% AHRE prevalence x 35% not on OAC x 35% market share = ~85 patients. Dollar opportunity: associated monitoring $1,200/yr x 85 = ~$102K.',
  },
  {
    id: 'ep-gap-23-remote-monitoring-noncompliance',
    name: 'Remote Monitoring Non-Compliance — Device Not Transmitting',
    category: 'Quality',
    patientCount: 120,
    dollarOpportunity: 0,
    priority: 'medium',
    evidence:
      'Crossley GH et al, CONNECT Trial (JACC 2011). Remote monitoring reduces time to clinical decision by 17.4 days. HRS Expert Consensus (Slotwiner DJ, Heart Rhythm 2015). Non-transmitting patients miss early detection of AF, lead issues, and battery alerts.',
    cta: 'Patient Outreach — Restore Remote Monitoring Transmission',
    detectionCriteria: [
      'Implantable cardiac device enrolled in remote monitoring',
      'No device transmission received in >90 days',
      'No in-office device check in >90 days',
      'Active device (not at ERI/EOL)',
    ],
    patients: [
      {
        id: 'EP-RM-001',
        name: 'Clifford Pham',
        mrn: 'MRN-EP-23001',
        age: 68,
        signals: [
          'Dual-chamber ICD — last remote transmission 142 days ago',
          'Enrolled in Carelink remote monitoring — not transmitting',
          'Missed AF detection window, lead impedance check, battery status',
          'CONNECT trial: remote monitoring reduces time to clinical decision by 17.4 days',
        ],
        keyValues: {
          'Device': 'Dual-chamber ICD (Medtronic)',
          'Last Transmission': '142 days ago',
          'Remote System': 'Carelink',
          'Missed Alerts': 'AF detection, lead impedance, battery',
          'Status': 'Non-compliant — outreach needed',
        },
      },
      {
        id: 'EP-RM-002',
        name: 'Beatrice Yamamoto',
        mrn: 'MRN-EP-23002',
        age: 81,
        signals: [
          'CRT-D — last remote transmission 198 days ago',
          'Latitude system — patient may have connectivity issue',
          'CRT response assessment overdue — no remote data for 6+ months',
          'HRS: remote monitoring is standard of care for all CIEDs',
        ],
        keyValues: {
          'Device': 'CRT-D (Boston Scientific)',
          'Last Transmission': '198 days ago',
          'Remote System': 'Latitude',
          'Missed Alerts': 'CRT response, AF burden, lead status',
          'Status': 'Non-compliant — connectivity issue suspected',
        },
      },
      {
        id: 'EP-RM-003',
        name: 'Dennis Okoye',
        mrn: 'MRN-EP-23003',
        age: 55,
        signals: [
          'Single-chamber ICD — last remote transmission 112 days ago',
          'Merlin system — patient relocated, monitor not set up',
          'Non-ischemic cardiomyopathy — VT monitoring critical',
          'Remote monitoring gap increases risk of missed VT events',
        ],
        keyValues: {
          'Device': 'Single-chamber ICD (Abbott)',
          'Last Transmission': '112 days ago',
          'Remote System': 'Merlin',
          'Reason': 'Patient relocated — monitor not reconnected',
          'Status': 'Non-compliant — setup needed',
        },
      },
    ],
    whyMissed: 'Remote monitoring compliance requires proactive tracking of transmission gaps across multiple vendor platforms — no unified system flags non-transmitting devices.',
    whyTailrd: 'TAILRD aggregated remote monitoring transmission timestamps across vendor platforms to identify devices that have not transmitted in >90 days.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count: device population x 15% non-compliant x 35% market share = ~120 patients. Dollar opportunity: Quality metric — $0 direct but prevents missed critical alerts.',
  },
  {
    id: 'ep-gap-24-early-rhythm-control',
    name: 'Early Rhythm Control Not Pursued — EAST-AFNET 4 Indication',
    category: 'Gap',
    patientCount: 180,
    dollarOpportunity: 421200,
    priority: 'high',
    evidence:
      'Kirchhof P et al, EAST-AFNET 4 (NEJM 2020, PMID 32865375). Early rhythm control: 21% relative risk reduction in CV death/stroke/HF hospitalization vs rate control. Benefit greatest in first 12 months after AF diagnosis.',
    cta: 'Evaluate for Early Rhythm Control — AAD or Ablation Referral',
    detectionCriteria: [
      'AF diagnosis within 12 months (I48.x, onset date within 12 months)',
      'CHA2DS2-VASc >= 2',
      'Managed with rate control only (on beta-blocker or CCB, no AAD, no ablation referral)',
      'No contraindication to rhythm control strategy',
    ],
    patients: [
      {
        id: 'EP-ERC-001',
        name: 'Arthur Pennington',
        mrn: 'MRN-EP-24001',
        age: 67,
        signals: [
          'AF diagnosed 8 months ago — on metoprolol for rate control only',
          'CHA2DS2-VASc 3 — meets EAST-AFNET 4 criteria for early rhythm control',
          'No AAD prescribed, no ablation referral',
          'EAST-AFNET 4: 21% reduction in CV death/stroke/HF hospitalization with early rhythm control',
        ],
        keyValues: {
          'AF Onset': '8 months ago',
          'CHA2DS2-VASc': '3',
          'Current Strategy': 'Rate control only (metoprolol 50mg BID)',
          'AAD': 'None',
          'Ablation Referral': 'No',
          'EAST-AFNET 4 Eligible': 'Yes',
        },
      },
      {
        id: 'EP-ERC-002',
        name: 'Patricia Sundberg',
        mrn: 'MRN-EP-24002',
        age: 72,
        signals: [
          'New AF diagnosed 5 months ago — on diltiazem for rate control',
          'CHA2DS2-VASc 4 (female, HTN, age, DM) — high stroke risk',
          'No rhythm control strategy initiated',
          'Early rhythm control within 12 months of diagnosis associated with best outcomes',
        ],
        keyValues: {
          'AF Onset': '5 months ago',
          'CHA2DS2-VASc': '4',
          'Current Strategy': 'Rate control only (diltiazem 240mg daily)',
          'AAD': 'None',
          'Ablation Referral': 'No',
          'Comorbidities': 'HTN, DM, age >65',
        },
      },
      {
        id: 'EP-ERC-003',
        name: 'Vincent Hargrove',
        mrn: 'MRN-EP-24003',
        age: 59,
        signals: [
          'Paroxysmal AF diagnosed 10 months ago — on atenolol rate control',
          'CHA2DS2-VASc 2 — meets threshold for rhythm control consideration',
          'Active lifestyle limited by AF symptoms — rhythm control would improve QOL',
          'Ablation or AAD should be discussed within 12-month window',
        ],
        keyValues: {
          'AF Onset': '10 months ago',
          'AF Type': 'Paroxysmal',
          'CHA2DS2-VASc': '2',
          'Current Strategy': 'Rate control only (atenolol 50mg)',
          'Symptom Impact': 'Limited exercise tolerance',
          'Ablation Referral': 'No',
        },
      },
    ],
    whyMissed: 'EAST-AFNET 4 early rhythm control requires identifying AF onset date and correlating with current management strategy within the 12-month treatment window — timing data is often buried in clinical notes.',
    whyTailrd: 'TAILRD identified AF diagnosis date, calculated time since onset, and connected with current rate-control-only strategy to flag EAST-AFNET 4 early rhythm control eligibility.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count: 12,000 AF x 20% newly diagnosed x 35% rate-only strategy x 35% eligible x 35% market share = ~180 patients. Dollar opportunity: ablation referral $26,000 x 30% conversion x 54 referred = ~$421K.',
  },
  {
    id: 'ep-gap-25-vt-ablation',
    name: 'VT Ablation Not Offered — VANISH/PARTITA Eligibility',
    category: 'Gap',
    patientCount: 20,
    dollarOpportunity: 156000,
    priority: 'high',
    evidence:
      'Sapp JL et al, VANISH Trial (NEJM 2016, PMID 27332902). Della Bella P et al, PARTITA (Lancet 2022). VT ablation: 28% reduction in death/VT storm vs escalated AAD. ICD patients with recurrent shocks benefit most.',
    cta: 'Refer for VT Ablation — EP Consultation',
    detectionCriteria: [
      'ICD in place',
      'Recurrent appropriate shocks (>= 2 episodes in 6 months)',
      'On antiarrhythmic drug therapy (amiodarone, sotalol, or mexiletine)',
      'NOT referred for catheter ablation of VT',
    ],
    patients: [
      {
        id: 'EP-VTA-001',
        name: 'Raymond Kincaid',
        mrn: 'MRN-EP-25001',
        age: 63,
        signals: [
          'ICD — 4 appropriate shocks in past 6 months for sustained VT',
          'On amiodarone 200mg daily — VT breakthrough on AAD therapy',
          'Not referred for VT ablation — VANISH: ablation superior to AAD escalation',
          'Ischemic cardiomyopathy, LVEF 28% — scar-related VT',
        ],
        keyValues: {
          'Device': 'Dual-chamber ICD',
          'ICD Shocks': '4 in 6 months (appropriate)',
          'AAD': 'Amiodarone 200mg daily',
          'LVEF': '28%',
          'Etiology': 'Ischemic cardiomyopathy',
          'VT Ablation Referral': 'No',
        },
      },
      {
        id: 'EP-VTA-002',
        name: 'Dolores Whitfield',
        mrn: 'MRN-EP-25002',
        age: 58,
        signals: [
          'CRT-D — 3 VT episodes with ATP + 1 shock in 4 months',
          'On sotalol 120mg BID — recurrent VT despite maximum dose',
          'Non-ischemic cardiomyopathy, LVEF 30% — VT ablation indicated',
          'PARTITA: early ablation after first ICD therapy reduces VT recurrence',
        ],
        keyValues: {
          'Device': 'CRT-D',
          'VT Episodes': '3 ATP + 1 shock in 4 months',
          'AAD': 'Sotalol 120mg BID (maximum)',
          'LVEF': '30%',
          'Etiology': 'Non-ischemic cardiomyopathy',
          'VT Ablation Referral': 'No',
        },
      },
      {
        id: 'EP-VTA-003',
        name: 'Marcus Stanhope',
        mrn: 'MRN-EP-25003',
        age: 71,
        signals: [
          'ICD — electrical storm (3 VT episodes in 24 hours) last month',
          'On amiodarone + mexiletine — VT storm on dual AAD',
          'Ischemic CM, prior MI, LVEF 25% — substrate-based VT ablation indicated',
          'VANISH: VT ablation reduces composite of death/VT storm/appropriate ICD shock',
        ],
        keyValues: {
          'Device': 'Single-chamber ICD',
          'ICD Events': 'Electrical storm — 3 episodes in 24h',
          'AAD': 'Amiodarone + Mexiletine (dual AAD)',
          'LVEF': '25%',
          'Etiology': 'Ischemic CM, prior MI',
          'VT Ablation Referral': 'No',
        },
      },
    ],
    whyMissed: 'VT ablation referral requires connecting ICD interrogation shock data with AAD therapy status — managed by device clinic and prescribing physician separately.',
    whyTailrd: 'TAILRD connected ICD shock frequency data with current AAD regimen to identify patients eligible for VT ablation per VANISH/PARTITA criteria.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count: ICD population x 8% recurrent shocks x 70% not referred for ablation = ~20 patients. Dollar opportunity: $26,000 VT ablation x 30% conversion x 20 = ~$156K.',
  },
  {
    id: 'ep-gap-26-icd-programming',
    name: 'ICD Programming Not Optimized — Inappropriate Shock Risk',
    category: 'Quality',
    patientCount: 45,
    dollarOpportunity: 0,
    priority: 'medium',
    evidence:
      'Moss AJ et al, MADIT-RIT (NEJM 2012, PMID 23131066). High-rate cutoff (200 bpm) + 60-interval delay reduces inappropriate therapy by 79%. Standard programming results in 2-3x higher inappropriate shock rate.',
    cta: 'Device Clinic Review — Update to MADIT-RIT Programming',
    detectionCriteria: [
      'ICD or CRT-D in place',
      'Programming settings not updated to MADIT-RIT parameters',
      'VT detection zone < 200 bpm OR detection interval < 30 intervals',
      'No programming update in past 24 months',
    ],
    patients: [
      {
        id: 'EP-PROG-001',
        name: 'Eugene Trask',
        mrn: 'MRN-EP-26001',
        age: 65,
        signals: [
          'Dual-chamber ICD — VT zone set at 170 bpm with 12-interval delay',
          'MADIT-RIT: high-rate cutoff 200 bpm + 60-interval delay reduces inappropriate shocks 79%',
          'Legacy programming from implant 3 years ago — never updated',
          'Had 2 inappropriate shocks for sinus tachycardia in past year',
        ],
        keyValues: {
          'Device': 'Dual-chamber ICD',
          'VT Zone': '170 bpm (legacy — should be 200 bpm)',
          'Detection Intervals': '12 (legacy — should be 60)',
          'Last Programming Update': '3 years ago (at implant)',
          'Inappropriate Shocks': '2 in past 12 months',
          'Recommended': 'MADIT-RIT programming update',
        },
      },
      {
        id: 'EP-PROG-002',
        name: 'Irene Castellano',
        mrn: 'MRN-EP-26002',
        age: 72,
        signals: [
          'Single-chamber ICD — VF-only zone at 188 bpm, 18 intervals',
          'No VT monitoring zone — legacy programming misses slow VT',
          'MADIT-RIT optimized programming reduces inappropriate therapy by 79%',
          'Programming not updated since device replacement 2 years ago',
        ],
        keyValues: {
          'Device': 'Single-chamber ICD',
          'VF Zone': '188 bpm / 18 intervals',
          'VT Zone': 'Off (legacy)',
          'Last Programming Update': '2 years ago',
          'Inappropriate Shocks': '1 in past 12 months',
          'Recommended': 'MADIT-RIT parameters',
        },
      },
      {
        id: 'EP-PROG-003',
        name: 'Walter Bridgeford',
        mrn: 'MRN-EP-26003',
        age: 58,
        signals: [
          'CRT-D — VT zone 180 bpm / 16 intervals, VF zone 230 bpm / 12 intervals',
          'Non-ischemic CM — lower VT risk, but legacy programming overly sensitive',
          'MADIT-RIT: long detection intervals reduce unnecessary therapy without missing true VT',
          'No programming review since CRT upgrade 18 months ago',
        ],
        keyValues: {
          'Device': 'CRT-D',
          'VT Zone': '180 bpm / 16 intervals (too sensitive)',
          'VF Zone': '230 bpm / 12 intervals',
          'Last Programming Update': '18 months ago',
          'Etiology': 'Non-ischemic CM',
          'Recommended': 'MADIT-RIT optimization',
        },
      },
    ],
    whyMissed: 'ICD programming optimization requires comparing current device settings against MADIT-RIT evidence-based parameters — device clinics inherit implant settings without systematic review.',
    whyTailrd: 'TAILRD compared ICD programming parameters from device interrogation data against MADIT-RIT optimized settings to identify legacy programming that increases inappropriate shock risk.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count: ICD population x 13% on legacy programming x 35% market share = ~45 patients. Dollar opportunity: Quality — $0 direct but reduces ER visits for inappropriate shocks ($5K+ each).',
  },
  {
    id: 'ep-gap-27-lead-recall',
    name: 'Lead Recall or Advisory — Patient Not Notified',
    category: 'Safety',
    patientCount: 15,
    dollarOpportunity: 0,
    priority: 'high',
    safetyNote: 'URGENT: Patients with recalled/advisory leads require immediate notification and evaluation. Lead failure can cause inappropriate shocks, failure to pace, or failure to defibrillate.',
    evidence:
      'FDA MedWatch advisories. Hauser RG et al, Heart Rhythm 2012. Lead failure can cause inappropriate shocks, failure to pace, or failure to defibrillate. Includes Sprint Fidelis, Riata, and other recalled leads.',
    cta: 'URGENT: Patient Notification — Lead Advisory Follow-Up',
    detectionCriteria: [
      'Implanted lead under FDA advisory or manufacturer recall',
      'Patient not notified or evaluated per recall protocol',
      'Includes: Sprint Fidelis (Medtronic), Riata/Riata ST (St. Jude), other FDA-listed advisories',
      'Annual lead integrity testing required for advisory leads',
    ],
    patients: [
      {
        id: 'EP-LEAD-001',
        name: 'Harold Jennings',
        mrn: 'MRN-EP-27001',
        age: 70,
        signals: [
          'Sprint Fidelis ICD lead (Model 6949) — under Medtronic recall since 2007',
          'Lead impedance trending: 680 ohms (up from 520 — potential conductor fracture)',
          'Patient not contacted for annual lead integrity evaluation',
          'FDA advisory: lead failure rate ~5% at 5 years, increasing over time',
        ],
        keyValues: {
          'Lead Model': 'Sprint Fidelis 6949 (Medtronic)',
          'Advisory Status': 'FDA recall — active since 2007',
          'Lead Impedance': '680 ohms (trending up)',
          'Prior Impedance': '520 ohms',
          'Last Lead Check': '14 months ago',
          'Patient Notification': 'Not documented',
          'Risk': 'Conductor fracture — inappropriate shocks or failure to defibrillate',
        },
      },
      {
        id: 'EP-LEAD-002',
        name: 'Constance Varga',
        mrn: 'MRN-EP-27002',
        age: 62,
        signals: [
          'Riata ST ICD lead (Model 7122) — St. Jude/Abbott advisory',
          'Inside-out insulation breach concern — externalized conductors',
          'No fluoroscopic evaluation performed per advisory protocol',
          'Hauser et al: Riata failure rate increases with implant duration',
        ],
        keyValues: {
          'Lead Model': 'Riata ST 7122 (Abbott/St. Jude)',
          'Advisory Status': 'FDA advisory — insulation breach risk',
          'Fluoroscopic Eval': 'Not performed',
          'Implant Duration': '11 years',
          'Patient Notification': 'Not documented',
          'Risk': 'Externalized conductors — sensing/pacing failure',
        },
      },
      {
        id: 'EP-LEAD-003',
        name: 'Philip Rosenthal',
        mrn: 'MRN-EP-27003',
        age: 75,
        signals: [
          'Recalled pacemaker lead — manufacturer advisory issued 2024',
          'Header connection concern — intermittent loss of capture reported',
          'Patient not yet contacted per recall notification protocol',
          'Lead failure can cause failure to pace — life-threatening in pacemaker-dependent patient',
        ],
        keyValues: {
          'Lead Model': 'Under manufacturer advisory (2024)',
          'Advisory Status': 'Active recall — header connection',
          'Patient Notification': 'Not contacted',
          'Pacemaker Dependent': 'Yes',
          'Risk': 'Critical — failure to pace in dependent patient',
          'Action Required': 'Immediate notification + evaluation',
        },
      },
    ],
    whyMissed: 'Lead recall tracking requires matching implanted lead model numbers against FDA advisory databases — a cross-reference between device registry and regulatory databases that no clinical workflow automates.',
    whyTailrd: 'TAILRD cross-referenced implanted lead model numbers from device registry data with FDA MedWatch advisories to identify patients with recalled leads who have not been notified.',
    methodologyNote: 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. Patient count: estimated recalled/advisory lead population x 25% not yet contacted = ~15 patients. Dollar opportunity: Safety — $0 direct but critical patient safety obligation.',
  },
];

// ============================================================
// SAFETY ALERT + ENHANCED DISPLAY HELPERS
// ============================================================

/** Render safety alert for Dofetilide REMS (Gap 66) */
const renderDofetilideAlert = (patient: EPGapPatient): React.ReactNode => {
  const dose = patient.keyValues['Medication'] ?? 'Unknown';
  const egfr = patient.keyValues['eGFR'] ?? patient.keyValues['Renal Adjustment'] ?? 'Not documented';
  const qtc = patient.keyValues['QTc at Initiation'] ?? patient.keyValues['QTc Current'] ?? patient.keyValues['Current QTc'] ?? 'Not documented';
  const remsStatus = patient.keyValues['REMS Compliance'] as string | undefined;
  const isCompliant = remsStatus?.toLowerCase().includes('compliant') && !remsStatus?.toLowerCase().includes('non-compliant');
  const initiationDoc = patient.keyValues['Initiation Hospitalization'] ?? patient.keyValues['Initiation Records'] ?? patient.keyValues['Initiation Type'] ?? '';
  const noInpatient = typeof initiationDoc === 'string' && (initiationDoc.toLowerCase().includes('not documented') || initiationDoc.toLowerCase().includes('missing') || initiationDoc.toLowerCase().includes('outpatient'));

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
      <h5 className="text-sm font-bold text-red-700 flex items-center gap-1.5 mb-2">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        DOFETILIDE REMS COMPLIANCE
      </h5>
      <div className="grid grid-cols-3 gap-2 text-sm mb-2">
        <div><span className="text-red-600 font-medium">Dose:</span> <span className="text-red-800">{String(dose)}</span></div>
        <div><span className="text-red-600 font-medium">eGFR:</span> <span className="text-red-800">{String(egfr)}</span></div>
        <div><span className="text-red-600 font-medium">QTc:</span> <span className="text-red-800">{String(qtc)}</span></div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-red-600">REMS Status:</span>
        {isCompliant ? (
          <span className="bg-green-600 text-white px-2 py-0.5 rounded text-xs font-bold">COMPLIANT</span>
        ) : (
          <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold">NON-COMPLIANT</span>
        )}
      </div>
      {noInpatient && (
        <div className="mt-2 bg-red-600 text-white rounded px-3 py-1.5 text-xs font-bold">
          CRITICAL: No inpatient initiation documented — FDA REMS violation. Mandatory 3-day hospitalization required for dofetilide initiation.
        </div>
      )}
    </div>
  );
};

/** Render safety alert for Dronedarone Contraindication (Gap 67) */
const renderDronedaroneAlert = (patient: EPGapPatient): React.ReactNode => {
  const afType = patient.keyValues['AF Type'] as string | undefined ?? '';
  const lvefStr = patient.keyValues['LVEF'] as string | undefined ?? '';
  const nyha = patient.keyValues['NYHA Class'] as string | undefined ?? '';

  const isPermanentAF = afType.toLowerCase().includes('permanent');
  const lvefMatch = lvefStr.match(/(\d+)/);
  const lvefVal = lvefMatch ? parseInt(lvefMatch[1], 10) : null;
  const isLowLVEF = lvefVal !== null && lvefVal < 35;
  const isAdvancedNYHA = nyha.includes('III') || nyha.includes('IV');
  const needsUrgentDiscontinuation = isPermanentAF || isLowLVEF || isAdvancedNYHA;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
      <h5 className="text-sm font-bold text-red-700 flex items-center gap-1.5 mb-2">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        PALLAS/ANDROMEDA: Dronedarone contraindicated
      </h5>
      <div className="grid grid-cols-3 gap-2 text-sm mb-2">
        <div><span className="text-red-600 font-medium">AF Type:</span> <span className="text-red-800">{afType || 'Unknown'}</span></div>
        <div><span className="text-red-600 font-medium">LVEF:</span> <span className="text-red-800">{lvefStr || 'Unknown'}</span></div>
        <div><span className="text-red-600 font-medium">NYHA Class:</span> <span className="text-red-800">{nyha || 'Not documented'}</span></div>
      </div>
      {needsUrgentDiscontinuation && (
        <div className="mt-2 bg-red-600 text-white rounded px-3 py-1.5 text-xs font-bold">
          Discontinue urgently — {isPermanentAF ? 'Permanent AF (PALLAS: CV death HR 2.11)' : ''}{isPermanentAF && (isLowLVEF || isAdvancedNYHA) ? ' + ' : ''}{isLowLVEF ? `LVEF ${lvefStr} <35% (ANDROMEDA: mortality HR 2.13)` : ''}{(isPermanentAF || isLowLVEF) && isAdvancedNYHA ? ' + ' : ''}{isAdvancedNYHA ? `NYHA ${nyha} (contraindicated)` : ''}
        </div>
      )}
    </div>
  );
};

/** Render safety alert for WPW + AV Nodal Blocker (Gap 27) */
const renderWPWAlert = (patient: EPGapPatient): React.ReactNode => {
  const avBlockerMentions = patient.signals.filter(
    (s) => /AV nodal|digoxin|verapamil|diltiazem|beta-?blocker|adenosine|CONTRAINDICATED/i.test(s)
  );
  const drugContra = patient.keyValues['Drug Contraindication'] as string | undefined ?? '';

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
      <h5 className="text-sm font-bold text-red-700 flex items-center gap-1.5 mb-2">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        CRITICAL CONTRAINDICATION
      </h5>
      <p className="text-sm text-red-800 font-semibold mb-2">
        CONTRAINDICATED in WPW + AF — can cause VF
      </p>
      {avBlockerMentions.length > 0 && (
        <div className="text-xs text-red-700 space-y-0.5 mb-2">
          {avBlockerMentions.map((m, i) => (
            <div key={i} className="flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 text-red-500" />
              <span>{m}</span>
            </div>
          ))}
        </div>
      )}
      {drugContra && (
        <div className="bg-red-600 text-white rounded px-3 py-1.5 text-xs font-bold">
          {String(drugContra)}
        </div>
      )}
    </div>
  );
};

/** Render safety alert for Device Battery EOL (Gap 70) */
const renderDeviceBatteryAlert = (patient: EPGapPatient): React.ReactNode => {
  const batteryStatus = (patient.keyValues['Battery Status'] as string | undefined ?? '').toLowerCase();
  const isEOL = batteryStatus.includes('eol');
  const isERI = batteryStatus.includes('eri');
  const severity = isEOL ? 'CRITICAL' : isERI ? 'HIGH' : 'UNKNOWN';
  const bgColor = isEOL ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
  const headerColor = isEOL ? 'text-red-700' : 'text-amber-700';
  const iconColor = isEOL ? 'text-red-600' : 'text-amber-600';

  const deviceType = patient.keyValues['Device'] as string | undefined ?? 'Unknown';
  const pmDependent = patient.keyValues['PM-Dependent'] as string | undefined;
  const implantDate = patient.keyValues['Time Since ERI'] ?? patient.keyValues['ERI Alert'] ?? '';

  return (
    <div className={`${bgColor} border rounded-lg p-3 mt-3`}>
      <h5 className={`text-sm font-bold ${headerColor} flex items-center gap-1.5 mb-2`}>
        <AlertTriangle className={`w-4 h-4 ${iconColor}`} />
        DEVICE BATTERY — {severity}
      </h5>
      <div className="grid grid-cols-3 gap-2 text-sm mb-2">
        <div><span className={`${headerColor} font-medium`}>Device:</span> <span className="text-titanium-900">{String(deviceType)}</span></div>
        <div><span className={`${headerColor} font-medium`}>Battery:</span> <span className="text-titanium-900">{String(patient.keyValues['Battery Status'] ?? '')}</span></div>
        <div><span className={`${headerColor} font-medium`}>Alert Age:</span> <span className="text-titanium-900">{String(implantDate) || 'Not documented'}</span></div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${headerColor}`}>Severity:</span>
        {isEOL ? (
          <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold">CRITICAL</span>
        ) : isERI ? (
          <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-xs font-bold">HIGH</span>
        ) : (
          <span className="bg-gray-500 text-white px-2 py-0.5 rounded text-xs font-bold">UNKNOWN</span>
        )}
      </div>
      {pmDependent && pmDependent.toLowerCase().includes('yes') && (
        <div className="mt-2 bg-red-600 text-white rounded px-3 py-1.5 text-xs font-bold">
          PACEMAKER-DEPENDENT — No intrinsic rhythm. EOL risks asystole. Urgent generator replacement required.
        </div>
      )}
    </div>
  );
};

/** Render safety alert for QTc Risk (Gap 39 — id contains 'qtc' or 'qt-prolong') */
const renderQTcRiskAlert = (patient: EPGapPatient): React.ReactNode => {
  const qtcVal = patient.keyValues['QTc'] as string | undefined ?? '';
  const qtcMatch = qtcVal.match(/(\d+)/);
  const qtcNum = qtcMatch ? parseInt(qtcMatch[1], 10) : null;
  const medCountRaw = patient.keyValues['QT-Prolonging Medications'] as string | number | undefined;
  const kPlus = patient.keyValues['K+'] as string | undefined ?? '';
  const mgPlus = patient.keyValues['Mg2+'] as string | undefined ?? '';

  const kVal = kPlus && /\d/.test(kPlus) ? parseFloat(kPlus) : undefined;
  const mgVal = mgPlus && /\d/.test(mgPlus) ? parseFloat(mgPlus) : undefined;

  // Use shared QTc risk calculator
  const qtcRiskResult = computeQTcRisk({
    qtcMs: qtcNum ?? undefined,
    qtProlongingMeds: medCountRaw != null ? Array.from({ length: typeof medCountRaw === 'number' ? medCountRaw : parseInt(String(medCountRaw), 10) || 0 }, (_, i) => `Med ${i + 1}`) : [],
    potassium: kVal,
    magnesium: mgVal,
  });

  const severity = qtcRiskResult.severity.toUpperCase() as 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

  const badgeClass = severity === 'CRITICAL'
    ? 'bg-red-600 text-white'
    : severity === 'HIGH'
    ? 'bg-amber-500 text-white'
    : severity === 'MODERATE'
    ? 'bg-yellow-400 text-yellow-900'
    : 'bg-green-400 text-green-900';

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
      <h5 className="text-sm font-bold text-red-700 flex items-center gap-1.5 mb-2">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        QTc PROLONGATION RISK
      </h5>
      <div className="grid grid-cols-3 gap-2 text-sm mb-2">
        <div><span className="text-red-600 font-medium">QTc:</span> <span className="text-red-800">{qtcVal || 'Not documented'}</span></div>
        <div><span className="text-red-600 font-medium">QT-Prolonging Meds:</span> <span className="text-red-800">{qtcRiskResult.drugCount > 0 ? `${qtcRiskResult.drugCount} medication(s)` : 'Not assessed'}</span></div>
        <div>
          {qtcRiskResult.electrolyteRisk && <span className="text-red-800 text-xs font-bold">Electrolyte abnormality detected</span>}
          {!qtcRiskResult.electrolyteRisk && <span className="text-titanium-600 text-xs">Electrolytes OK / Not assessed</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-red-600">Severity:</span>
        <span className={`${badgeClass} px-2 py-0.5 rounded text-xs font-bold`}>{severity}</span>
        <span className="ml-1 inline-flex items-center gap-1 text-xs text-blue-600">
          <Zap className="w-3 h-3 flex-shrink-0" /> Auto-calculated
        </span>
      </div>
    </div>
  );
};

/** Render CHA2DS2-VASc display for LAAC gap (Gap 4) */
const renderCHA2DS2Display = (patient: EPGapPatient): React.ReactNode => {
  const afType = patient.keyValues['AF Type'] as string | undefined ?? '';
  const currentAnticoag = patient.keyValues['Current Anticoag'] as string | undefined ?? '';
  const referred = patient.keyValues['LAAC Referred'] as string | undefined ?? '';
  const componentsStr = String(patient.keyValues['Score Components'] || '').toLowerCase();

  // Use shared CHA2DS2-VASc calculator
  const chaResult = computeCHA2DS2VASc({
    age: patient.age,
    diagnosisHF: componentsStr.includes('hf') || componentsStr.includes('chf'),
    diagnosisHTN: componentsStr.includes('htn') || componentsStr.includes('hypertension'),
    diagnosisDM: componentsStr.includes('diabet'),
    priorStroke: componentsStr.includes('stroke') || componentsStr.includes('ich'),
    priorTIA: componentsStr.includes('tia'),
    sex: componentsStr.includes('female') ? 'female' : 'male',
    priorMI: componentsStr.includes('mi'),
    diagnosisCAD: componentsStr.includes('cad'),
    diagnosisPAD: componentsStr.includes('pad'),
  });

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
      <h5 className="text-sm font-bold text-blue-800 flex items-center gap-1.5 mb-2">
        <Zap className="w-4 h-4 text-blue-600" />
        CHA&#x2082;DS&#x2082;-VASc: {chaResult.score} ({chaResult.components.join(', ') || 'N/A'})
      </h5>
      <p className="text-xs text-blue-600 mb-2 flex items-center gap-1">
        <Zap className="w-3 h-3 text-blue-500" />
        Auto-calculated from structured EHR data
      </p>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div><span className="text-blue-600 font-medium">AF Type:</span> <span className="text-blue-900">{afType}</span></div>
        <div><span className="text-blue-600 font-medium">Anticoag:</span> <span className="text-blue-900">{currentAnticoag}</span></div>
        <div><span className="text-blue-600 font-medium">LAAC Referred:</span> <span className="text-blue-900">{referred}</span></div>
      </div>
      <div className="mt-2 text-xs text-blue-700 bg-blue-100 rounded px-2 py-1">
        Risk: {chaResult.risk}. LAAC Eligibility: CHA&#x2082;DS&#x2082;-VASc {'>'}{'\u2265'}2 + OAC contraindication or failure.
      </div>
    </div>
  );
};

/** Render KCCQ trend display for patients with kccqOverallSummary */
const renderKCCQTrend = (patient: EPGapPatient): React.ReactNode => {
  if (patient.kccqOverallSummary === undefined) return null;

  const current = patient.kccqOverallSummary;
  const prior = patient.kccqPriorOverallSummary;
  let trendText = '';
  let direction = '';

  if (prior !== undefined) {
    const delta = current - prior;
    if (delta < 0) {
      direction = 'Declining';
      trendText = `${prior} -> ${current}`;
    } else if (delta > 0) {
      direction = 'Improving';
      trendText = `${prior} -> ${current}`;
    } else {
      direction = 'Stable';
      trendText = `${prior} -> ${current}`;
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
      <h5 className="text-sm font-bold text-blue-800 flex items-center gap-1.5 mb-1">
        <Target className="w-4 h-4 text-blue-600" />
        KCCQ Overall: {current}
        {prior !== undefined && (
          <span className="text-xs font-normal text-blue-600 ml-1">
            &middot; Trend: {trendText} {direction === 'Declining' ? '(Declining)' : direction === 'Improving' ? '(Improving)' : '(Stable)'}
          </span>
        )}
      </h5>
      <p className="text-xs text-blue-600 flex items-center gap-1">
        <Zap className="w-3 h-3 text-blue-500" />
        Auto-calculated from EHR flowsheet data
      </p>
    </div>
  );
};

/** Render PVC burden display for Gap 71 */
const renderPVCBurdenDisplay = (patient: EPGapPatient): React.ReactNode => {
  const pvcsOnEcg = patient.signals.some(s => s.toLowerCase().includes('pvc'));
  const holterRaw = patient.keyValues['Holter PVC %'] as string | number | undefined;
  const holterPct = holterRaw != null ? parseFloat(String(holterRaw)) : undefined;
  const pvcResult = estimatePVCBurden({
    pvcsOnEcg,
    holterPVCPercent: holterPct != null && !isNaN(holterPct) ? holterPct : undefined,
  });
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
      <h5 className="text-sm font-bold text-amber-800 flex items-center gap-1.5 mb-1">
        <Activity className="w-4 h-4 text-amber-600" />
        PVC Burden Estimate
      </h5>
      <div className="text-sm text-amber-900">
        PVC burden: {pvcResult.burden} ({pvcResult.source}) &mdash; {pvcResult.ablationThreshold ? 'above' : 'below'} ablation threshold
        <span className="ml-1 inline-flex items-center gap-1 text-xs text-blue-600">
          <Zap className="w-3 h-3 flex-shrink-0" /> Auto-estimated
        </span>
      </div>
    </div>
  );
};

/** Route to appropriate safety alert based on gap id */
const renderSafetyAlert = (gapId: string, patient: EPGapPatient): React.ReactNode => {
  if (gapId.includes('dofetilide') || gapId.includes('gap-66')) {
    return renderDofetilideAlert(patient);
  }
  if (gapId.includes('dronedarone') || gapId.includes('gap-67')) {
    return renderDronedaroneAlert(patient);
  }
  if (gapId.includes('wpw') || gapId.includes('gap-27')) {
    return renderWPWAlert(patient);
  }
  if (gapId.includes('battery') || gapId.includes('eol') || gapId.includes('gap-70')) {
    return renderDeviceBatteryAlert(patient);
  }
  if (gapId.includes('qtc') || gapId.includes('qt-prolong') || gapId.includes('gap-39')) {
    return renderQTcRiskAlert(patient);
  }
  if (gapId.includes('laac') || gapId.includes('gap-4')) {
    return renderCHA2DS2Display(patient);
  }
  if (gapId.includes('pvc') || gapId.includes('gap-71')) {
    return renderPVCBurdenDisplay(patient);
  }
  return null;
};

// ============================================================
// GAP-LEVEL TRAJECTORY DATA
// ============================================================
const getEPGapTrajectoryData = (_gapId: string, patientCount: number, category: string): TrajectoryDistribution => {
  const isSafety = category === 'Safety';
  const isGrowth = category === 'Growth';
  if (isSafety) {
    return { worseningRapid: Math.round(patientCount * 0.32), worseningSlow: Math.round(patientCount * 0.33), stable: Math.round(patientCount * 0.24), improving: Math.round(patientCount * 0.11), total: patientCount };
  }
  if (isGrowth) {
    return { worseningRapid: Math.round(patientCount * 0.07), worseningSlow: Math.round(patientCount * 0.18), stable: Math.round(patientCount * 0.42), improving: Math.round(patientCount * 0.33), total: patientCount };
  }
  return { worseningRapid: Math.round(patientCount * 0.20), worseningSlow: Math.round(patientCount * 0.25), stable: Math.round(patientCount * 0.33), improving: Math.round(patientCount * 0.22), total: patientCount };
};

// ============================================================
// PREDICTIVE INTELLIGENCE HELPERS
// ============================================================

/** Parse a numeric value from a string like "44%", "60% (18 months ago)" */
function parseNumericValue(val: string | number | undefined): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') return val;
  const cleaned = val.replace(/,/g, '').replace(/[^0-9.\-]/g, ' ').trim();
  const match = cleaned.match(/-?\d+\.?\d*/);
  return match ? parseFloat(match[0]) : null;
}

/** Compute trajectory for an EP patient based on available trend data */
function computeEPPatientTrajectory(pt: EPGapPatient): TrajectoryResult {
  // KCCQ delta (for AF+HF patients)
  if (pt.kccqOverallSummary !== undefined && pt.kccqPriorOverallSummary !== undefined) {
    return computeTrajectory({
      currentValue: pt.kccqOverallSummary,
      priorValue: pt.kccqPriorOverallSummary,
      daysBetween: 180,
    });
  }

  // LVEF delta — check 'Current LVEF' / 'Prior LVEF' pattern (PVC patients)
  const currentLvef = parseNumericValue(pt.keyValues['Current LVEF']) ?? parseNumericValue(pt.keyValues['LVEF']);
  const priorLvef = parseNumericValue(pt.keyValues['Prior LVEF']);
  if (currentLvef !== null && priorLvef !== null) {
    return computeTrajectory({ currentValue: currentLvef, priorValue: priorLvef, daysBetween: 180 });
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
function renderEPPredictiveBadges(gap: EPClinicalGap, pt: EPGapPatient): React.ReactNode {
  const trajectory = computeEPPatientTrajectory(pt);
  const display = trajectoryDisplay(trajectory.direction);

  const gapCategory = gap.category === 'Discovery' ? 'Gap' as const : gap.category as 'Safety' | 'Gap' | 'Growth' | 'Quality' | 'Deprescribing';
  const timeHorizon = computeTimeHorizon({
    predictedMonths: null,
    gapCategory,
    trajectoryDirection: trajectory.direction,
  });
  const horizonDisplay = timeHorizonDisplay(timeHorizon.horizon);

  const hasTrendData = trajectory.direction !== 'stable' || trajectory.percentChange !== 0;
  if (!hasTrendData) return null;

  return (
    <>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${display.colorClass === 'text-red-600' ? 'bg-red-100 text-red-700' : display.colorClass === 'text-amber-600' ? 'bg-amber-100 text-amber-700' : display.colorClass === 'text-green-600' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {display.arrow} {display.label}
      </span>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${horizonDisplay.bgClass} ${horizonDisplay.textClass}`}>
        {horizonDisplay.icon} {horizonDisplay.label}
      </span>
    </>
  );
}

/** Render predicted event detail for specific EP gaps */
function renderEPPredictedEvent(gapId: string, pt: EPGapPatient): React.ReactNode {
  // Gap 70 — Device Battery EOL countdown
  if (gapId.includes('70') || gapId.includes('battery') || gapId.includes('eol')) {
    const daysToEOL = pt.keyValues?.['Days to EOL'];
    const batteryStatus = pt.keyValues?.['Battery Status'];
    const pmDependent = pt.keyValues?.['Pacemaker Dependent'];
    if (daysToEOL || batteryStatus) {
      return (
        <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-xs font-semibold text-red-800 mb-1">Device Battery Status</div>
          <div className="text-xs text-red-700">
            Battery: <span className="font-bold">{String(batteryStatus ?? 'Unknown')}</span>{' · '}
            Estimated days to EOL: <span className="font-bold text-red-800">{String(daysToEOL ?? '?')} days</span>
            {pmDependent === 'Yes' && (
              <span className="ml-2 px-1.5 py-0.5 bg-red-200 text-red-800 rounded font-bold">PACEMAKER DEPENDENT — HIGH RISK</span>
            )}
          </div>
          <div className="text-xs text-red-500 mt-0.5">Action required: Generator replacement within 30 days to maintain safety margin</div>
        </div>
      );
    }
  }

  // Gap 71 — PVC Cardiomyopathy
  if (gapId.includes('71') || gapId.includes('pvc')) {
    const currentLvef = parseNumericValue(pt.keyValues['Current LVEF']);
    const priorLvef = parseNumericValue(pt.keyValues['Prior LVEF']);
    if (currentLvef !== null && priorLvef !== null) {
      const trajectory = computeTrajectory({ currentValue: currentLvef, priorValue: priorLvef, daysBetween: 180 });
      if (trajectory.direction === 'worsening_slow' || trajectory.direction === 'worsening_rapid') {
        const ratePerMonth = Math.abs(trajectory.ratePerMonth);
        const monthsTo35 = currentLvef > 35 ? Math.round((currentLvef - 35) / ratePerMonth) : 0;
        return (
          <div className="mt-2 px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg">
            <div className="text-xs text-slate-900">
              <span className="font-semibold">Predicted event:</span>{' '}
              LVEF declining {ratePerMonth.toFixed(1)}%/month with high PVC burden &mdash; reversible window narrows beyond LVEF 35%.
              Current LVEF {currentLvef}% &mdash; {monthsTo35 > 0 ? `${monthsTo35} months of actionable window remaining` : 'actionable window closing now'}.
            </div>
          </div>
        );
      }
    }
  }

  return null;
}

/** Render revenue timing for Growth and Gap categories */
function renderEPRevenueTiming(gap: EPClinicalGap, pt: EPGapPatient): React.ReactNode {
  if (gap.dollarOpportunity <= 0) return null;
  if (gap.category !== 'Growth' && gap.category !== 'Gap') return null;

  const trajectory = computeEPPatientTrajectory(pt);
  const hasTrendData = trajectory.direction !== 'stable' || trajectory.percentChange !== 0;
  if (!hasTrendData) return null;

  const perPatientOpp = gap.dollarOpportunity / Math.max(gap.patientCount, 1);
  const revenue = computeRevenueAtRisk({
    gapDollarOpportunity: perPatientOpp,
    monthsToThreshold: null,
    gapCategory: gap.category as 'Gap' | 'Growth',
  });

  return (
    <div className="mt-2 px-3 py-2 bg-emerald-50/50 border border-emerald-100 rounded-lg">
      <div className="text-xs text-emerald-800">
        <span className="font-semibold">Revenue timing:</span>{' '}
        {formatDollar(revenue.revenueThisQuarter)} actionable this quarter &middot;{' '}
        {formatDollar(revenue.revenueAtRiskIfDeferred)} at risk if deferred &middot;{' '}
        Deferral cost: {formatDollar(revenue.deferralCostPerMonth)}/month
      </div>
    </div>
  );
}

// ============================================================
// COMPONENT
// ============================================================
const EPClinicalGapDetectionDashboard: React.FC = () => {
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [patientSortOrder, setPatientSortOrder] = useState<'urgency' | 'dollar' | 'score'>('urgency');
  const [showMethodology, setShowMethodology] = useState<string | null>(null);

  const sortPatients = (patients: EPGapPatient[], _gap: EPClinicalGap) => {
    return [...patients].sort((a, b) => {
      if (patientSortOrder === 'urgency') {
        const aTrajectory = computeEPPatientTrajectory(a);
        const bTrajectory = computeEPPatientTrajectory(b);
        const urgencyOrder: Record<string, number> = { worsening_rapid: 0, worsening_slow: 1, stable: 2, improving: 3 };
        return (urgencyOrder[aTrajectory.direction] ?? 2) - (urgencyOrder[bTrajectory.direction] ?? 2);
      }
      if (patientSortOrder === 'dollar') {
        const aDelta = (a.kccqOverallSummary ?? 50) - (a.kccqPriorOverallSummary ?? 50);
        const bDelta = (b.kccqOverallSummary ?? 50) - (b.kccqPriorOverallSummary ?? 50);
        return aDelta - bDelta;
      }
      if (patientSortOrder === 'score') {
        return (a.kccqOverallSummary ?? 100) - (b.kccqOverallSummary ?? 100);
      }
      return 0;
    });
  };

  const totalPatients = EP_CLINICAL_GAPS.reduce((sum, g) => sum + g.patientCount, 0);
  const totalOpportunity = EP_CLINICAL_GAPS.reduce((sum, g) => sum + g.dollarOpportunity, 0);

  const categorySortOrder: Record<string, number> = { Safety: 0, Discovery: 1, Gap: 2, Therapy: 2, Growth: 3, Quality: 4, Deprescribing: 5 };
  const sortedGaps = [...EP_CLINICAL_GAPS].sort((a, b) => (categorySortOrder[a.category] ?? 99) - (categorySortOrder[b.category] ?? 99));

  const priorityColor = (p: string) => {
    if (p === 'high') return 'bg-red-50 border-red-300 text-red-700';
    if (p === 'medium') return 'bg-amber-50 border-amber-300 text-amber-700';
    return 'bg-green-50 border-green-300 text-green-700';
  };

  const categoryColor = (c: string) =>
    c === 'Discovery'
      ? 'bg-slate-100 text-slate-800'
      : c === 'Gap'
      ? 'bg-red-100 text-red-800'
      : c === 'Safety'
      ? 'bg-rose-200 text-rose-900'
      : c === 'Quality'
      ? 'bg-amber-100 text-amber-800'
      : c === 'Deprescribing'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-blue-100 text-blue-800';

  return (
    <div className="space-y-6">
      {/* Header summary */}
      <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-titanium-900 mb-1 flex items-center gap-2">
          <Zap className="w-5 h-5 text-medical-green-600" />
          Clinical Gap Detection — Electrophysiology Module
        </h3>
        <p className="text-sm text-titanium-600 mb-4">
          AI-driven detection of evidence-based EP therapy gaps and growth opportunities.
          Gaps 4, 10, 11, 16, 22, 26, 27, 33, 40, 41 — 45-gap initiative.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-red-600" />
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Affected Patients</span>
            </div>
            <div className="text-2xl font-bold text-red-800">{totalPatients.toLocaleString()}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Total Opportunity</span>
            </div>
            <div className="text-2xl font-bold text-green-800">
              ${(totalOpportunity / 1000000).toFixed(1)}M
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Active Gaps</span>
            </div>
            <div className="text-2xl font-bold text-blue-800">{EP_CLINICAL_GAPS.length}</div>
          </div>
        </div>
      </div>

      {/* Gap list */}
      <div className="space-y-4">
        {sortedGaps.map((gap) => {
          const isOpen = expandedGap === gap.id;
          return (
            <div key={gap.id} className="metal-card bg-white border border-titanium-200 rounded-2xl overflow-hidden">
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
                  {gap.category === 'Discovery' && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs font-semibold text-indigo-600">{'\u2B21'} Discovery — Net new patients · Never previously identified</span>
                    </div>
                  )}
                  <div className="font-semibold text-titanium-900 text-base">{gap.name}</div>
                  <div className="flex gap-6 mt-2">
                    <span className="text-sm text-titanium-600">
                      <span className="font-semibold text-titanium-900">{gap.patientCount}</span> patients
                    </span>
                    <span className="text-sm text-titanium-600">
                      <span className="font-semibold text-green-700">${(gap.dollarOpportunity / 1000000).toFixed(1)}M</span> opportunity
                    </span>
                  </div>
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
                      <Search className="w-3 h-3 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <span>Why standard systems miss this: {gap.whyMissed}</span>
                    </div>
                  )}
                </div>
                <div className="ml-4 mt-1 flex-shrink-0">
                  {isOpen ? <ChevronUp className="w-5 h-5 text-titanium-500" /> : <ChevronDown className="w-5 h-5 text-titanium-500" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-titanium-200 p-5 space-y-5">
                  {/* Trajectory Summary — Forward-looking */}
                  {(() => {
                    const dist = getEPGapTrajectoryData(gap.id, gap.patientCount, gap.category);
                    const q1Rev = Math.round(gap.dollarOpportunity * (dist.worseningRapid / Math.max(dist.total, 1)));
                    return (
                      <div className="px-4 py-3 bg-gradient-to-r from-titanium-50/80 to-white border border-titanium-100 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-titanium-600 uppercase tracking-wide">Patient Trajectory</span>
                          <span className="text-xs bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-medium">Forward-looking</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-red-600 font-medium">{'\u2193'} {dist.worseningRapid} worsening rapidly</span>
                          <span className="text-amber-600 font-medium">{'\u2198'} {dist.worseningSlow} worsening slowly</span>
                          <span className="text-gray-500 font-medium">{'\u2192'} {dist.stable} stable</span>
                          <span className="text-green-600 font-medium">{'\u2197'} {dist.improving} improving</span>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden mt-2">
                          <div className="bg-red-400" style={{ width: `${(dist.worseningRapid / dist.total) * 100}%` }} />
                          <div className="bg-amber-400" style={{ width: `${(dist.worseningSlow / dist.total) * 100}%` }} />
                          <div className="bg-gray-300" style={{ width: `${(dist.stable / dist.total) * 100}%` }} />
                          <div className="bg-green-400" style={{ width: `${(dist.improving / dist.total) * 100}%` }} />
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-titanium-600">
                          <span>Q1 opportunity: <span className="font-bold text-emerald-700">{formatDollar(q1Rev)}</span> ({dist.worseningRapid} patients -- highest urgency)</span>
                          <span>Full population: <span className="font-bold text-emerald-700">{formatDollar(gap.dollarOpportunity)}</span></span>
                        </div>
                      </div>
                    );
                  })()}

                  {gap.safetyNote && (
                    <div className="bg-rose-50 border-2 border-rose-400 rounded-xl p-4">
                      <h4 className="font-semibold text-rose-800 mb-1 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        SAFETY WARNING
                      </h4>
                      <p className="text-sm text-rose-700 font-medium">{gap.safetyNote}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-titanium-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Detection Criteria
                    </h4>
                    <ul className="space-y-1">
                      {gap.detectionCriteria.map((c) => (
                        <li key={c} className="text-sm text-titanium-700 flex gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-semibold text-blue-800 mb-1 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" />
                      Clinical Evidence
                    </h4>
                    <p className="text-sm text-blue-700">{gap.evidence}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-medical-green-600" />
                    <span className="font-semibold text-medical-green-700">Recommended Action:</span>
                    <span className="text-sm font-medium bg-medical-green-50 border border-medical-green-200 px-3 py-1 rounded-lg text-medical-green-800">
                      {gap.cta}
                    </span>
                  </div>

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
                                {pt.scenario && (
                                  <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                    {pt.scenario}
                                  </span>
                                )}
                                {gap.category === 'Discovery' && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-xs bg-indigo-100 text-slate-700 px-2 py-0.5 rounded-full" title="This patient was not previously flagged in any clinical workflow. TAILRD identified this patient by assembling disconnected signals across care settings.">
                                    <Radio className="w-3 h-3" />
                                    First identified by TAILRD
                                  </span>
                                )}
                                {renderEPPredictiveBadges(gap, pt)}
                              </div>
                              {ptOpen ? <ChevronUp className="w-4 h-4 text-titanium-400" /> : <ChevronDown className="w-4 h-4 text-titanium-400" />}
                            </button>
                            {ptOpen && (
                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        <dd className="font-medium text-titanium-900" title="Automatically calculated from EHR-sourced data via Redox integration. No manual entry required.">{v}<span title="Automatically calculated from EHR-sourced data via Redox integration. No manual entry required."><Info className="w-3 h-3 text-blue-400 inline-block ml-1 cursor-help" /></span></dd>
                                      </div>
                                    ))}
                                  </dl>
                                </div>
                              </div>
                            )}
                            {ptOpen && (
                              <div className="px-4">
                                {renderSafetyAlert(gap.id, pt)}
                                {renderKCCQTrend(pt)}
                                {/* Predictive Intelligence */}
                                {renderEPPredictedEvent(gap.id, pt)}
                                {renderEPRevenueTiming(gap, pt)}
                                {gap.whyTailrd && (
                                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-2">
                                    <p className="text-xs font-semibold text-slate-700 mb-1">Why TAILRD identified this patient:</p>
                                    <p className="text-sm text-indigo-600">{gap.whyTailrd}</p>
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

export default EPClinicalGapDetectionDashboard;
