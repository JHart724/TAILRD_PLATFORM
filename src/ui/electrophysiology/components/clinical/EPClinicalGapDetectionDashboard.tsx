import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, DollarSign, Users, ChevronDown, ChevronUp, Target, Activity, Pill, Stethoscope, TrendingUp, Zap, Info, Search, Radio, FileText } from 'lucide-react';
import { computeQTcRisk, computeCHA2DS2VASc, estimatePVCBurden } from '../../../../utils/clinicalCalculators';
import { computeTrajectory, computeTimeHorizon, trajectoryDisplay, timeHorizonDisplay, computeRevenueAtRisk, formatDollar, type TrajectoryResult, type TrajectoryDistribution } from '../../../../utils/predictiveCalculators';
import GapActionButtons from '../../../../components/shared/GapActionButtons';
import { useGapActions } from '../../../../hooks/useGapActions';

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
//       ep-27 (Lead Recall Advisory), ep-28 (OAC AF), ep-29 (Rate Control),
//       ep-30 (Pre-Cardioversion TEE), ep-31 (Device Infection Extraction),
//       ep-32 (AAD Post-Ablation), ep-33 (Conduction System Pacing),
//       ep-34 (Subcutaneous ICD), ep-35 (Zero-Fluoro Ablation),
//       ep-36 (Epicardial VT Ablation), ep-37 (Leadless Pacemaker),
//       ep-38 (Post-Ablation OAC),
//       ep-gap-73 (SVT Ablation), ep-gap-74 (Secondary Prevention ICD),
//       ep-gap-75 (ACHD Arrhythmia), ep-gap-76 (Syncope Workup),
//       ep-gap-77 (Flutter OAC), ep-gap-78 (Torsades)
// ============================================================

export interface EPClinicalGap {
  id: string;
  name: string;
  category: 'Gap' | 'Growth' | 'Safety' | 'Quality' | 'Deprescribing' | 'Discovery' | 'Procedural' | 'Device Therapy' | 'Structural Arrhythmia' | 'Diagnostic Gap' | 'Anticoagulation' | 'Acute Arrhythmia Safety';
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
  // ── GAPS 28-31: CRITICAL AF + DEVICE SAFETY GAPS ─────────────────────────
  {
    id: 'ep-gap-28-oac-af',
    name: 'Anticoagulation Not Prescribed — AF with CHA₂DS₂-VASc ≥2',
    category: 'Gap',
    patientCount: 630,
    dollarOpportunity: 378000,
    priority: 'high',
    tag: 'AF | Stroke Prevention | DOAC',
    safetyNote: 'Patients with AF and elevated stroke risk without anticoagulation have annual stroke rates of 4-6%. DOAC initiation is a Class I recommendation.',
    evidence:
      'January CT et al, 2019 AHA/ACC/HRS AF Guidelines (JACC 2019): OAC recommended for CHA₂DS₂-VASc ≥2 (men) or ≥3 (women), Class I, Level A. Connolly SJ et al, RE-LY (NEJM 2009): dabigatran noninferior/superior to warfarin. Granger CB et al, ARISTOTLE (NEJM 2011): apixaban superior to warfarin (21% stroke reduction, 31% less major bleeding). DOACs preferred over warfarin (Class I, Level A).',
    cta: 'Initiate Oral Anticoagulation — DOAC Preferred',
    detectionCriteria: [
      'AF diagnosis (ICD-10: I48.x) — non-valvular',
      'CHA₂DS₂-VASc ≥2 (male) or ≥3 (female)',
      'No active OAC prescription (apixaban, rivaroxaban, dabigatran, edoxaban, warfarin)',
      'No documented contraindication (active major bleeding, mechanical valve requiring warfarin)',
    ],
    patients: [
      {
        id: 'EP-OAC-028-001',
        name: 'Vernon Blackwell',
        mrn: 'MRN-EP-28001',
        age: 74,
        signals: [
          'Persistent AF — CHA₂DS₂-VASc 4 — not on anticoagulation',
          'Hypertension, diabetes, age >65 — high stroke risk',
          'Last visit: rate control discussed but OAC not initiated',
          'ARISTOTLE: apixaban 21% stroke reduction vs warfarin',
        ],
        keyValues: {
          'AF Type': 'Persistent',
          'CHA₂DS₂-VASc': '4 (HTN, DM, age, male)',
          'Current OAC': 'None',
          'Stroke Risk': '~4%/year without OAC',
          'Bleeding Risk (HAS-BLED)': '2 (moderate)',
          'Renal Function': 'eGFR 58',
        },
      },
      {
        id: 'EP-OAC-028-002',
        name: 'Lillian Fairbanks',
        mrn: 'MRN-EP-28002',
        age: 78,
        signals: [
          'Paroxysmal AF — CHA₂DS₂-VASc 5 — OAC stopped by patient 4 months ago',
          'Patient self-discontinued apixaban due to perceived bruising',
          'No documented discussion about risks of stopping OAC',
          'RE-LY: dabigatran 150mg superior to warfarin for stroke prevention',
        ],
        keyValues: {
          'AF Type': 'Paroxysmal',
          'CHA₂DS₂-VASc': '5 (age, HTN, HF, female, prior TIA)',
          'Current OAC': 'Self-discontinued apixaban 4 months ago',
          'Stroke Risk': '~6%/year without OAC',
          'Prior TIA': 'Yes — 2023',
          'Action': 'Urgent re-initiation — prior TIA doubles risk',
        },
      },
      {
        id: 'EP-OAC-028-003',
        name: 'Arthur Castellano',
        mrn: 'MRN-EP-28003',
        age: 69,
        signals: [
          'Newly diagnosed AF on Holter — CHA₂DS₂-VASc 3 — no OAC started',
          'Diagnosed 6 weeks ago in primary care — cardiology referral pending',
          'AHA/ACC: OAC should be initiated at time of AF diagnosis when indicated',
          'Delay in anticoagulation increases interim stroke risk',
        ],
        keyValues: {
          'AF Type': 'New diagnosis (Holter)',
          'CHA₂DS₂-VASc': '3 (HTN, DM, male)',
          'Current OAC': 'Not started — diagnosed 6 weeks ago',
          'Stroke Risk': '~3.2%/year without OAC',
          'Referral Status': 'Cardiology — pending',
          'Action': 'Start DOAC now — do not wait for cardiology visit',
        },
      },
    ],
    whyMissed: 'AF is often diagnosed in primary care or during hospitalization for other conditions — OAC initiation requires CHA₂DS₂-VASc calculation and bleeding risk assessment that may not happen at the point of AF diagnosis.',
    whyTailrd: 'TAILRD calculated CHA₂DS₂-VASc from structured problem list data and cross-referenced with active medication lists to identify AF patients with elevated stroke risk and no OAC prescription.',
    methodologyNote: 'Demo health system: 12-hospital, 2.5M catchment, 12,000 AF patients. Patient count: 12,000 × 75% CHA₂DS₂-VASc ≥2 × 20% not on OAC × 35% market share ≈ 630. Dollar opportunity: associated monitoring $1,200/yr × 630 × 50% conversion = $378,000.',
  },
  {
    id: 'ep-gap-29-rate-control',
    name: 'AF Rate Control Not Achieved — Resting HR >110',
    category: 'Gap',
    patientCount: 250,
    dollarOpportunity: 150000,
    priority: 'medium',
    tag: 'AF | Rate Control | RACE II',
    evidence:
      'Van Gelder IC et al, RACE II (NEJM 2010, PMID 20231232): lenient rate control (HR <110) noninferior to strict (<80) for composite CV endpoint. However, persistently uncontrolled HR >110 is associated with tachycardia-mediated cardiomyopathy and increased HF risk. AHA/ACC 2019: resting HR <110 is acceptable target for rate control strategy.',
    cta: 'Optimize Rate Control — Titrate AV Nodal Agent or Add Digoxin',
    detectionCriteria: [
      'AF diagnosis with rate control strategy (not rhythm control)',
      'Most recent resting HR >110 bpm on vital signs or ambulatory monitoring',
      'Currently on rate control medication (beta-blocker, CCB, or digoxin)',
      'No documented reason for accepting HR >110 (e.g., symptomatic bradycardia at lower doses)',
    ],
    patients: [
      {
        id: 'EP-RATE-029-001',
        name: 'Howard Steinberg',
        mrn: 'MRN-EP-29001',
        age: 72,
        signals: [
          'Persistent AF — rate control strategy — resting HR 124 bpm',
          'Metoprolol 50mg BID — not at maximal dose',
          'RACE II: lenient target <110 — patient exceeds even lenient threshold',
          'Risk of tachycardia-mediated cardiomyopathy if HR remains >110',
        ],
        keyValues: {
          'AF Type': 'Persistent',
          'Strategy': 'Rate control',
          'Resting HR': '124 bpm',
          'Rate Control Agent': 'Metoprolol 50mg BID',
          'LVEF': '48% (may be declining)',
          'Target': '<110 bpm (RACE II lenient)',
        },
      },
      {
        id: 'EP-RATE-029-002',
        name: 'Frances Cobb',
        mrn: 'MRN-EP-29002',
        age: 68,
        signals: [
          'Permanent AF — HR 118 bpm at last 3 clinic visits',
          'On diltiazem 180mg daily — room to increase or add digoxin',
          'New dyspnea on exertion — possible tachycardia-mediated symptoms',
          'Persistently elevated HR despite rate control agent',
        ],
        keyValues: {
          'AF Type': 'Permanent',
          'Strategy': 'Rate control',
          'Resting HR': '118 bpm (consistent over 3 visits)',
          'Rate Control Agent': 'Diltiazem 180mg daily',
          'Symptoms': 'New dyspnea on exertion',
          'LVEF': '52%',
        },
      },
      {
        id: 'EP-RATE-029-003',
        name: 'Richard Amato',
        mrn: 'MRN-EP-29003',
        age: 76,
        signals: [
          'Persistent AF — HR 132 bpm — on no rate control medication',
          'AF diagnosed 3 months ago — started on OAC but rate control not addressed',
          'LVEF 42% — may already have tachycardia-mediated cardiomyopathy',
          'Urgent rate control needed to prevent further LV dysfunction',
        ],
        keyValues: {
          'AF Type': 'Persistent',
          'Strategy': 'Rate control (not initiated)',
          'Resting HR': '132 bpm',
          'Rate Control Agent': 'None — not started',
          'LVEF': '42% (possible tachycardia-mediated)',
          'Action': 'Urgent — initiate rate control agent',
        },
      },
    ],
    whyMissed: 'Rate control adequacy requires reviewing vital signs over time — a single elevated HR reading may be dismissed as situational, and trending resting HR across visits is not standard workflow.',
    whyTailrd: 'TAILRD trended resting heart rate across multiple clinic visits and correlated with rate control medication doses to identify patients with persistently uncontrolled ventricular rates despite being on a rate control strategy.',
    methodologyNote: 'Demo health system: 12-hospital, 2.5M catchment, 12,000 AF patients. Patient count: 12,000 × 60% rate control strategy × 10% HR >110 × 35% market share ≈ 250. Dollar opportunity: $1,200/yr monitoring × 250 × 50% conversion = $150,000.',
  },
  {
    id: 'ep-gap-30-cardioversion-tee',
    name: 'Pre-Cardioversion TEE Not Ordered — AF Duration Unknown',
    category: 'Safety',
    patientCount: 20,
    dollarOpportunity: 0,
    priority: 'high',
    safetyNote: 'CRITICAL: Cardioversion without TEE or adequate anticoagulation in AF >48 hours carries 5-7% risk of thromboembolic stroke. TEE or 3 weeks therapeutic OAC is mandatory.',
    evidence:
      'Klein AL et al, ACUTE Trial (NEJM 2001): TEE-guided cardioversion strategy safe and effective — allows earlier cardioversion with lower thromboembolic risk. 2019 AHA/ACC/HRS Guidelines: TEE or ≥3 weeks therapeutic OAC required before cardioversion when AF duration >48 hours or unknown (Class I). Stroke risk 5-7% without adequate precaution.',
    cta: 'Order TEE Before Cardioversion — or Confirm 3 Weeks Therapeutic OAC',
    detectionCriteria: [
      'AF diagnosis with cardioversion scheduled or planned',
      'AF duration >48 hours or unknown onset',
      'OAC duration <3 weeks or subtherapeutic INR (if on warfarin)',
      'No TEE ordered to rule out LAA thrombus',
    ],
    patients: [
      {
        id: 'EP-CV-030-001',
        name: 'Donald Kreider',
        mrn: 'MRN-EP-30001',
        age: 65,
        signals: [
          'Persistent AF — cardioversion scheduled next week',
          'AF onset unknown — patient reports "a few weeks" of palpitations',
          'Started apixaban only 10 days ago — below 3-week threshold',
          'ACUTE trial: TEE required if OAC <3 weeks and AF >48h',
        ],
        keyValues: {
          'AF Type': 'Persistent — onset unknown',
          'Cardioversion': 'Scheduled',
          'OAC Duration': '10 days (apixaban)',
          'TEE Ordered': 'No',
          'Stroke Risk': '5-7% without TEE or adequate OAC',
          'Action': 'Order TEE before proceeding',
        },
      },
      {
        id: 'EP-CV-030-002',
        name: 'Sandra Napolitano',
        mrn: 'MRN-EP-30002',
        age: 71,
        signals: [
          'Persistent AF — cardioversion requested by referring physician',
          'On warfarin — last INR 1.6 (subtherapeutic, target 2.0-3.0)',
          'AF duration >48 hours confirmed',
          'Subtherapeutic INR = NOT adequately anticoagulated for cardioversion',
        ],
        keyValues: {
          'AF Type': 'Persistent — >48 hours',
          'Cardioversion': 'Requested by PCP',
          'OAC': 'Warfarin — INR 1.6 (subtherapeutic)',
          'TEE Ordered': 'No',
          'INR Target': '2.0-3.0',
          'Action': 'TEE required — INR subtherapeutic',
        },
      },
      {
        id: 'EP-CV-030-003',
        name: 'Eugene Winslow',
        mrn: 'MRN-EP-30003',
        age: 59,
        signals: [
          'New AF discovered on pre-op evaluation — duration unknown',
          'Surgeon requesting cardioversion before elective surgery',
          'No anticoagulation started — AF just diagnosed',
          'CRITICAL: cardioversion without TEE or OAC = stroke risk',
        ],
        keyValues: {
          'AF Type': 'New diagnosis — duration unknown',
          'Cardioversion': 'Requested pre-operatively',
          'OAC': 'Not started',
          'TEE Ordered': 'No',
          'Surgical Context': 'Elective surgery — can defer',
          'Action': 'URGENT: TEE before any cardioversion attempt',
        },
      },
    ],
    whyMissed: 'Pre-cardioversion safety assessment requires verifying both AF duration and anticoagulation adequacy — when cardioversion is scheduled urgently or by a non-EP provider, the TEE step may be omitted.',
    whyTailrd: 'TAILRD cross-referenced scheduled cardioversion procedures with AF onset dates and anticoagulation records to identify patients who do not meet safety criteria for cardioversion without TEE.',
    methodologyNote: 'Demo health system: 12-hospital, 2.5M catchment. Patient count: cardioversion volume × 8% without adequate pre-assessment × 35% market share ≈ 20. Dollar opportunity: Safety — $0 direct but prevents stroke ($50K+ per event).',
  },
  {
    id: 'ep-gap-31-device-infection-extraction',
    name: 'Device Infection — Lead Extraction Referral Delayed',
    category: 'Safety',
    patientCount: 6,
    dollarOpportunity: 81000,
    priority: 'high',
    safetyNote: 'URGENT: Cardiac device infection requires complete device and lead extraction. Delayed extraction increases mortality from 10% to >30%. Antibiotic-only management without extraction has unacceptable failure and mortality rates.',
    evidence:
      'Kusumoto FM et al, HRS Expert Consensus 2017: complete device and lead extraction is Class I recommendation for all CIED infections. Baddour LM et al, AHA Scientific Statement (Circulation 2010, PMID 20100969): extraction mandatory — antibiotic-only therapy associated with >30% mortality. Delayed extraction (>3 days from diagnosis) associated with increased ICU stay and mortality.',
    cta: 'URGENT: Refer for Complete Device/Lead Extraction',
    detectionCriteria: [
      'Positive blood cultures + cardiac device (pacemaker, ICD, CRT) in place',
      'Signs of generator pocket infection: erythema, warmth, erosion, drainage',
      'OR vegetation on lead identified by echocardiography (TEE)',
      'No referral for device extraction within 48 hours of infection diagnosis',
    ],
    patients: [
      {
        id: 'EP-INF-031-001',
        name: 'Bernard Kowalski',
        mrn: 'MRN-EP-31001',
        age: 72,
        signals: [
          'ICD pocket infection — erythema and drainage at generator site',
          'Blood cultures positive for Staph aureus × 3 days',
          'Infectious disease consulted — recommending extraction',
          'No extraction referral made despite ID recommendation — 72 hours elapsed',
        ],
        keyValues: {
          'Device': 'Dual-chamber ICD',
          'Infection': 'Pocket erythema + drainage + positive cultures',
          'Organism': 'Staphylococcus aureus',
          'Time Since Diagnosis': '72 hours — delayed',
          'Extraction Referral': 'Not made',
          'Risk': 'Critical — mortality >30% with delayed extraction',
        },
      },
      {
        id: 'EP-INF-031-002',
        name: 'Irene Yablonsky',
        mrn: 'MRN-EP-31002',
        age: 66,
        signals: [
          'CRT-D — vegetation on RV lead seen on TEE',
          'Persistent bacteremia despite IV vancomycin × 5 days',
          'Being managed with antibiotics only — no extraction planned',
          'Baddour AHA: antibiotic-only = >30% mortality',
        ],
        keyValues: {
          'Device': 'CRT-D',
          'Infection': 'Lead vegetation on TEE + persistent bacteremia',
          'Organism': 'Coagulase-negative Staph',
          'Antibiotic Duration': '5 days IV vancomycin — cultures still positive',
          'Extraction Referral': 'None — antibiotic-only approach',
          'Risk': 'Life-threatening — extraction is Class I',
        },
      },
      {
        id: 'EP-INF-031-003',
        name: 'Franklin Desjardins',
        mrn: 'MRN-EP-31003',
        age: 79,
        signals: [
          'Pacemaker pocket erosion — lead visible through skin',
          'Low-grade fevers for 2 weeks — cultures pending',
          'Managed with oral antibiotics and wound care only',
          'HRS Consensus: pocket erosion = complete extraction required',
        ],
        keyValues: {
          'Device': 'Dual-chamber pacemaker',
          'Infection': 'Pocket erosion — lead visible',
          'Treatment': 'Oral antibiotics + wound care (inadequate)',
          'Extraction Referral': 'Not made',
          'Pacemaker Dependent': 'Yes',
          'Action': 'URGENT extraction + temporary pacing wire',
        },
      },
    ],
    whyMissed: 'Device infections are often initially managed by hospitalists or general cardiologists who may attempt antibiotic-only therapy — the critical need for complete extraction requires EP/surgery referral that may not happen promptly.',
    whyTailrd: 'TAILRD identified patients with cardiac devices and concurrent positive blood cultures or documented pocket infection signs who had not been referred for extraction within 48 hours — a safety-critical time gap.',
    methodologyNote: 'Demo health system: 12-hospital, 2.5M catchment. Patient count: device infection rate 1-2% × device population × delayed referral rate × 35% market share ≈ 6. Dollar opportunity: extraction procedure $45,000 × 6 × 30% conversion = $81,000. Safety: prevents death and prolonged ICU stays.',
  },
  // ============================================================
  // GAP ep-32: AAD NOT DISCONTINUED AFTER SUCCESSFUL ABLATION
  // ============================================================
  {
    id: 'ep-gap-32-aad-post-ablation',
    name: 'AAD Not Discontinued After Successful Ablation',
    category: 'Quality',
    patientCount: 70,
    dollarOpportunity: 0,
    priority: 'medium',
    evidence:
      'Duytschaever M et al, EAST-AFNET 4 sub-study. Prolonged AAD post-successful ablation: unnecessary side effects (amiodarone thyroid/pulmonary toxicity). Most can be stopped at 3-6 months if no recurrence.',
    cta: 'Reassess AAD Continuation — Consider Discontinuation if No AF Recurrence',
    detectionCriteria: [
      'AF ablation performed >6 months ago',
      'Currently on antiarrhythmic drug (amiodarone, flecainide, sotalol)',
      'No documented AF recurrence on monitoring',
      'No documented reassessment for AAD discontinuation',
    ],
    patients: [
      {
        id: 'EP-AAD-032-001',
        name: 'Clifford Meacham',
        mrn: 'MRN-EP-32001',
        age: 64,
        signals: [
          'PVI ablation 9 months ago — no AF recurrence on 14-day monitor',
          'Still on amiodarone 200mg daily — no reassessment documented',
          'TSH trending abnormal (0.3) — amiodarone thyroid effect developing',
          'EAST-AFNET 4: AAD can be stopped at 3-6 months post-successful ablation',
        ],
        keyValues: {
          'Ablation Date': '9 months ago',
          'Ablation Type': 'PVI (cryoballoon)',
          'Current AAD': 'Amiodarone 200mg daily',
          'AF Recurrence': 'None on 14-day Holter',
          'TSH': '0.3 (low — amiodarone effect)',
          'Reassessment': 'Not documented',
        },
      },
      {
        id: 'EP-AAD-032-002',
        name: 'Patricia Holbrook',
        mrn: 'MRN-EP-32002',
        age: 58,
        signals: [
          'RF ablation for paroxysmal AF — 12 months post with no recurrence',
          'Flecainide 100mg BID continued — no documented reason to continue',
          'Patient reports dizziness — possible flecainide side effect',
          'Guidelines: discontinue AAD at 3-6 months if no recurrence',
        ],
        keyValues: {
          'Ablation Date': '12 months ago',
          'Ablation Type': 'RF PVI',
          'Current AAD': 'Flecainide 100mg BID',
          'AF Recurrence': 'None',
          'Symptoms': 'Dizziness (possible AAD side effect)',
          'Reassessment': 'Not documented',
        },
      },
      {
        id: 'EP-AAD-032-003',
        name: 'Harold Wentworth',
        mrn: 'MRN-EP-32003',
        age: 71,
        signals: [
          'Successful ablation 8 months ago — sotalol 120mg BID still prescribed',
          'Resting HR 48 bpm — sotalol-related bradycardia',
          'QTc 478ms — approaching dangerous prolongation',
          'AAD discontinuation would resolve both bradycardia and QTc prolongation',
        ],
        keyValues: {
          'Ablation Date': '8 months ago',
          'Current AAD': 'Sotalol 120mg BID',
          'AF Recurrence': 'None',
          'Resting HR': '48 bpm (bradycardia)',
          'QTc': '478ms (prolonged)',
          'Action': 'Discontinue sotalol — resolves bradycardia + QTc',
        },
      },
    ],
    whyMissed: 'Post-ablation AAD management falls between the ablating EP and the prescribing physician. Inertia keeps patients on AADs indefinitely without formal reassessment at 3-6 months.',
    whyTailrd: 'TAILRD identified patients with successful ablation (no documented AF recurrence) who remain on AADs beyond the recommended reassessment window, flagging unnecessary drug exposure and side effect risk.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 1,200 ablations × 60% on AAD post × 28% still on at 6 months × 35% market share ≈ 70. Dollar opportunity: Quality — $0 direct, prevents amiodarone toxicity.',
  },
  // ============================================================
  // GAP ep-33: CONDUCTION SYSTEM PACING NOT OFFERED
  // ============================================================
  {
    id: 'ep-gap-33-conduction-system-pacing',
    name: 'Conduction System Pacing Not Offered — Pacing-Dependent Patient',
    category: 'Gap',
    patientCount: 55,
    dollarOpportunity: 756000,
    priority: 'high',
    evidence:
      'Vijayaraman P et al, I-CLAS (Heart Rhythm 2024). CSP: 36% reduction in death/HF hospitalization vs BiV pacing. LBBAP preferred for pacing-dependent patients.',
    cta: 'Evaluate for Conduction System Pacing — LBBAP or His Bundle',
    detectionCriteria: [
      'Pacemaker implant scheduled or recently performed',
      'Anticipated or actual ventricular pacing >40%',
      'Conventional RV apical pacing selected',
      'No documented evaluation for His bundle or LBBAP',
    ],
    patients: [
      {
        id: 'EP-CSP-033-001',
        name: 'Leonard Strickland',
        mrn: 'MRN-EP-33001',
        age: 68,
        signals: [
          'Complete heart block — 100% pacing-dependent',
          'Conventional RV apical lead placed — no CSP evaluation documented',
          'I-CLAS: LBBAP reduces death/HF hospitalization 36% vs conventional',
          'LVEF 45% — RV pacing will further worsen LV function',
        ],
        keyValues: {
          'Indication': 'Complete heart block',
          'Pacing Dependency': '100%',
          'Lead Position': 'RV apex (conventional)',
          'LVEF': '45%',
          'CSP Evaluation': 'Not documented',
          'I-CLAS Benefit': '36% reduction death/HF hospitalization',
        },
      },
      {
        id: 'EP-CSP-033-002',
        name: 'Dolores Andersen',
        mrn: 'MRN-EP-33002',
        age: 74,
        signals: [
          'High-grade AV block — anticipated >80% ventricular pacing',
          'RV septal lead placed instead of LBBAP',
          'Pre-existing LBBB — CSP could restore native conduction',
          'Program performs LBBAP — patient not evaluated',
        ],
        keyValues: {
          'Indication': 'High-grade AV block + LBBB',
          'Anticipated Pacing': '>80%',
          'Lead Position': 'RV septum',
          'QRS Pre': '158ms (LBBB)',
          'CSP Evaluation': 'Not performed',
          'Opportunity': 'LBBAP could narrow QRS and preserve LV function',
        },
      },
      {
        id: 'EP-CSP-033-003',
        name: 'Warren Pinkney',
        mrn: 'MRN-EP-33003',
        age: 61,
        signals: [
          'SSS with chronotropic incompetence — dual-chamber PM planned',
          'Expected pacing 60-70% — borderline for CSP benefit',
          'Young patient — decades of RV pacing may cause pacing-induced CM',
          'CSP avoids long-term RV pacing-induced cardiomyopathy',
        ],
        keyValues: {
          'Indication': 'SSS + chronotropic incompetence',
          'Expected Pacing': '60-70%',
          'Age': 61,
          'LVEF': '55%',
          'Risk': 'Pacing-induced cardiomyopathy over decades',
          'CSP Evaluation': 'Not documented',
        },
      },
    ],
    whyMissed: 'Conduction system pacing requires specialized training and is not available at all implanting sites. Operators comfortable with conventional RV pacing may default to familiar techniques without considering CSP.',
    whyTailrd: 'TAILRD identified pacing-dependent patients receiving conventional RV leads by analyzing device implant data, pacing percentage thresholds, and the absence of documented CSP evaluation.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 500 PMs × 40% pacing-dependent × 80% conventional RV × 35% market share ≈ 55. Dollar opportunity: $55,000 device DRG × 55 × 25% conversion = $756K.',
  },
  // ============================================================
  // GAP ep-34: SUBCUTANEOUS ICD NOT CONSIDERED — YOUNG PATIENT
  // ============================================================
  {
    id: 'ep-gap-34-subcutaneous-icd',
    name: 'Subcutaneous ICD Not Considered — Young Patient',
    category: 'Gap',
    patientCount: 20,
    dollarOpportunity: 275000,
    priority: 'medium',
    evidence:
      'Knops RE et al, PRAETORIAN (NEJM 2020, PMID 32757521). S-ICD noninferior to TV-ICD. Avoids lead-related complications (fracture, infection, extraction).',
    cta: 'Consider Subcutaneous ICD — Young Patient Without Pacing Needs',
    detectionCriteria: [
      'ICD indicated for primary or secondary prevention',
      'Patient age <50',
      'No pacing requirement (no bradycardia, no CRT indication)',
      'Transvenous ICD implanted without documented S-ICD consideration',
    ],
    patients: [
      {
        id: 'EP-SICD-034-001',
        name: 'Marcus Ellison',
        mrn: 'MRN-EP-34001',
        age: 34,
        signals: [
          'HCM with SCD risk — ICD indicated for primary prevention',
          'Transvenous ICD implanted — no S-ICD discussion documented',
          'Age 34 — decades of transvenous lead exposure risk',
          'PRAETORIAN: S-ICD noninferior, avoids lead complications',
        ],
        keyValues: {
          'Age': 34,
          'Indication': 'HCM — primary prevention SCD',
          'Device': 'Transvenous single-chamber ICD',
          'Pacing Need': 'None',
          'S-ICD Discussion': 'Not documented',
          'Lead Risk': 'High — decades of transvenous exposure',
        },
      },
      {
        id: 'EP-SICD-034-002',
        name: 'Jasmine Rutherford',
        mrn: 'MRN-EP-34002',
        age: 42,
        signals: [
          'Brugada syndrome — secondary prevention after VF arrest',
          'TV-ICD placed — S-ICD not considered',
          'No pacing needs — ideal S-ICD candidate',
          'Young woman — cosmetic benefit of S-ICD (no chest scar)',
        ],
        keyValues: {
          'Age': 42,
          'Indication': 'Brugada — secondary prevention (survived VF)',
          'Device': 'Transvenous ICD',
          'Pacing Need': 'None',
          'S-ICD Screening': 'Not performed',
          'Benefit': 'Avoids transvenous leads + better cosmesis',
        },
      },
      {
        id: 'EP-SICD-034-003',
        name: 'Tyler Nakamura',
        mrn: 'MRN-EP-34003',
        age: 28,
        signals: [
          'ARVC with sustained VT — ICD for secondary prevention',
          'TV-ICD implanted age 28 — lifetime lead management burden',
          'No ATP pacing needs (VT is fast — shock only)',
          'S-ICD: eliminates transvenous lead extraction risk in young patients',
        ],
        keyValues: {
          'Age': 28,
          'Indication': 'ARVC — secondary prevention',
          'Device': 'Transvenous dual-chamber ICD',
          'ATP Need': 'Low (fast VT — shock therapy)',
          'S-ICD Discussion': 'Not documented',
          'Lifetime Risk': 'Multiple lead revisions/extractions expected',
        },
      },
    ],
    whyMissed: 'Operators experienced with transvenous ICDs may default to familiar technology. S-ICD screening (surface ECG template) adds a step. Some centers do not stock S-ICD devices.',
    whyTailrd: 'TAILRD identified young ICD recipients (<50) without pacing needs who received transvenous devices without documented S-ICD consideration — a missed opportunity to avoid decades of lead-related complications.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 350 ICDs × 25% age <50 × 65% receiving TV-ICD × 35% market share ≈ 20. Dollar opportunity: $55,000 device × 20 × 25% conversion = $275K.',
  },
  // ============================================================
  // GAP ep-35: ZERO-FLUOROSCOPY ABLATION NOT OFFERED
  // ============================================================
  {
    id: 'ep-gap-35-zero-fluoro-ablation',
    name: 'Zero-Fluoroscopy Ablation Not Offered — Young/Pregnant',
    category: 'Quality',
    patientCount: 35,
    dollarOpportunity: 0,
    priority: 'medium',
    evidence:
      'Razminia M et al, Heart Rhythm 2017. Zero-fluoro ablation: equivalent success rates, eliminates radiation exposure entirely. Particularly important in young/pregnant patients.',
    cta: 'Offer Zero-Fluoroscopy Ablation — 3D Mapping Only Approach',
    detectionCriteria: [
      'Ablation scheduled or recently performed',
      'Patient age <40 or woman of childbearing age',
      'Standard fluoroscopy used or planned',
      'Zero-fluoroscopy 3D mapping approach available at facility',
    ],
    patients: [
      {
        id: 'EP-ZF-035-001',
        name: 'Samantha Okafor',
        mrn: 'MRN-EP-35001',
        age: 29,
        signals: [
          'SVT ablation scheduled — young woman of childbearing age',
          'Standard fluoroscopy planned — not zero-fluoro approach',
          'Zero-fluoro ablation available at this center with 3D mapping',
          'Razminia: equivalent success rate with zero radiation exposure',
        ],
        keyValues: {
          'Age': 29,
          'Gender': 'Female — childbearing age',
          'Procedure': 'SVT ablation (AVNRT suspected)',
          'Fluoro Plan': 'Standard fluoroscopy',
          'Zero-Fluoro Available': 'Yes — 3D mapping system in lab',
          'Radiation Concern': 'High — young reproductive age',
        },
      },
      {
        id: 'EP-ZF-035-002',
        name: 'Brendan Gallagher',
        mrn: 'MRN-EP-35002',
        age: 22,
        signals: [
          'WPW ablation — age 22, lifetime radiation exposure concern',
          'Standard fluoro used — 18 minutes fluoroscopy time',
          'Zero-fluoro approach would have eliminated radiation entirely',
          'Young patient — cumulative radiation effects over lifetime',
        ],
        keyValues: {
          'Age': 22,
          'Procedure': 'WPW accessory pathway ablation',
          'Fluoro Time': '18 minutes (standard approach)',
          'Zero-Fluoro': 'Not offered',
          'Radiation Dose': 'Estimated 8 mSv',
          'Learning': 'Future ablations should use zero-fluoro protocol',
        },
      },
      {
        id: 'EP-ZF-035-003',
        name: 'Alicia Fernandez-Ruiz',
        mrn: 'MRN-EP-35003',
        age: 33,
        signals: [
          'Pregnant (18 weeks) with drug-refractory SVT — ablation indicated',
          'Zero-fluoro ablation mandatory in pregnancy',
          'Procedure performed with standard fluoro — lead shielding only',
          'Zero-fluoro: eliminates ALL fetal radiation exposure',
        ],
        keyValues: {
          'Age': 33,
          'Pregnancy': '18 weeks — second trimester',
          'Procedure': 'SVT ablation (drug-refractory)',
          'Fluoro Used': 'Yes — with lead shielding',
          'Zero-Fluoro': 'Should have been used (mandatory in pregnancy)',
          'Fetal Risk': 'Any radiation exposure is avoidable with 3D mapping',
        },
      },
    ],
    whyMissed: 'Zero-fluoroscopy ablation requires operator commitment to 3D-mapping-only technique. Many experienced operators are comfortable with fluoroscopy and do not routinely offer zero-fluoro, even when available.',
    whyTailrd: 'TAILRD identified young patients and women of childbearing age undergoing ablation with standard fluoroscopy when zero-fluoro capability was available at the facility — a quality improvement opportunity.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 1,200 ablations × 15% young/female × 55% still using fluoro × 35% market share ≈ 35. Dollar opportunity: Quality — $0 direct.',
  },
  // ============================================================
  // GAP ep-36: EPICARDIAL VT ABLATION NOT CONSIDERED
  // ============================================================
  {
    id: 'ep-gap-36-epicardial-vt-ablation',
    name: 'Epicardial VT Ablation Not Considered — Failed Endocardial',
    category: 'Gap',
    patientCount: 8,
    dollarOpportunity: 62400,
    priority: 'high',
    evidence:
      'Sosa E et al, Circulation 1996 (pioneer technique). Tung R et al, JACC EP 2020. Epicardial ablation success 60-70% in previously failed endocardial cases.',
    cta: 'Refer for Epicardial VT Ablation — Specialized Center Required',
    detectionCriteria: [
      'ICD patient with recurrent VT despite endocardial ablation',
      'Non-ischemic cardiomyopathy (epicardial circuits more common)',
      'No referral for epicardial access/ablation',
      'Continued ICD shocks despite prior ablation attempt',
    ],
    patients: [
      {
        id: 'EP-EPI-036-001',
        name: 'Reginald Underwood',
        mrn: 'MRN-EP-36001',
        age: 55,
        signals: [
          'NICM with recurrent VT — failed endocardial ablation 6 months ago',
          'ICD firing 3-4× per month despite amiodarone',
          'Non-ischemic CM — epicardial VT circuits likely',
          'Not referred for epicardial ablation at specialized center',
        ],
        keyValues: {
          'Cardiomyopathy': 'Non-ischemic (LVEF 25%)',
          'Prior Ablation': 'Endocardial — failed (VT recurred at 3 months)',
          'ICD Shocks': '3-4 per month',
          'AAD': 'Amiodarone 400mg — ineffective',
          'Epicardial Referral': 'Not made',
          'VT Substrate': 'Likely epicardial (NICM)',
        },
      },
      {
        id: 'EP-EPI-036-002',
        name: 'Kathleen Morrissey',
        mrn: 'MRN-EP-36002',
        age: 48,
        signals: [
          'Cardiac sarcoidosis — VT storm, failed endo ablation × 2',
          'Sarcoid: granulomas often epicardial — endo approach insufficient',
          'Escalating VT burden despite dual AAD therapy',
          'Epicardial ablation: 60-70% success in failed endo cases',
        ],
        keyValues: {
          'Cardiomyopathy': 'Cardiac sarcoidosis',
          'Prior Ablations': '2 endocardial — both failed',
          'VT Burden': 'VT storm (>3 episodes/24hr)',
          'AADs': 'Amiodarone + mexiletine — inadequate',
          'Epicardial Referral': 'Not made despite 2 failed endo attempts',
          'Specialized Center': 'Required for epicardial access',
        },
      },
    ],
    whyMissed: 'Epicardial VT ablation requires specialized expertise (percutaneous subxiphoid access) not available at most centers. After failed endocardial ablation, patients may be managed with AADs rather than referred for epicardial approach.',
    whyTailrd: 'TAILRD identified ICD patients with recurrent VT after failed endocardial ablation — particularly those with non-ischemic cardiomyopathy — who had not been referred for epicardial ablation at a specialized center.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: VT ablations × 25% failed endocardial × 50% not offered epicardial × 35% market share ≈ 8. Dollar opportunity: $26,000 ablation × 8 × 30% conversion = $62.4K.',
  },
  // ============================================================
  // GAP ep-37: LEADLESS PACEMAKER NOT OFFERED — HIGH INFECTION RISK
  // ============================================================
  {
    id: 'ep-gap-37-leadless-pacemaker',
    name: 'Leadless Pacemaker Not Offered — High Infection Risk',
    category: 'Gap',
    patientCount: 25,
    dollarOpportunity: 112500,
    priority: 'medium',
    evidence:
      'El-Chami MF et al, Micra IDE (JACC 2022). Leadless PM: 63% reduction in major complications, eliminates pocket infections. Ideal for high-infection-risk patients.',
    cta: 'Consider Leadless Pacemaker — High Infection Risk Patient',
    detectionCriteria: [
      'Pacemaker implant indicated',
      'High infection risk: hemodialysis, prior device infection, or immunosuppressed',
      'Conventional transvenous pacemaker selected',
      'No documented evaluation for leadless pacemaker (Micra)',
    ],
    patients: [
      {
        id: 'EP-LP-037-001',
        name: 'Chester Okonkwo',
        mrn: 'MRN-EP-37001',
        age: 72,
        signals: [
          'Hemodialysis patient — SSS requiring pacemaker',
          'Conventional dual-chamber PM implanted',
          'HD patients: 5-10× higher CIED infection rate',
          'Micra leadless PM: eliminates pocket infection risk',
        ],
        keyValues: {
          'Indication': 'SSS',
          'Infection Risk': 'Hemodialysis — 5-10× baseline CIED infection rate',
          'Device': 'Conventional dual-chamber PM',
          'Leadless Evaluation': 'Not documented',
          'Micra Benefit': '63% reduction major complications',
          'Dialysis Access': 'Left AV fistula',
        },
      },
      {
        id: 'EP-LP-037-002',
        name: 'Mildred Ashworth',
        mrn: 'MRN-EP-37002',
        age: 80,
        signals: [
          'Prior CIED infection requiring extraction 2 years ago',
          'Now needs new pacemaker for complete heart block',
          'Prior infection = highest risk for recurrent infection',
          'Leadless pacemaker eliminates pocket — no hardware to infect',
        ],
        keyValues: {
          'Indication': 'Complete heart block',
          'Infection Risk': 'Prior CIED infection (extracted 2 years ago)',
          'Device Planned': 'Conventional transvenous PM',
          'Leadless Evaluation': 'Not documented',
          'Prior Infection': 'Staph aureus pocket infection — full extraction',
          'Recurrence Risk': 'Very high without leadless approach',
        },
      },
      {
        id: 'EP-LP-037-003',
        name: 'Eugene Blackburn',
        mrn: 'MRN-EP-37003',
        age: 65,
        signals: [
          'Immunosuppressed (post-renal transplant) — bradycardia requiring PM',
          'Tacrolimus + prednisone — impaired wound healing + infection risk',
          'Conventional PM pocket: high infection risk in immunosuppressed',
          'Leadless PM: no pocket, no lead — ideal for immunocompromised',
        ],
        keyValues: {
          'Indication': 'Symptomatic bradycardia (post-transplant)',
          'Infection Risk': 'Immunosuppressed — renal transplant',
          'Immunosuppression': 'Tacrolimus + prednisone',
          'Device Planned': 'Conventional single-chamber PM',
          'Leadless Evaluation': 'Not documented',
          'Benefit': 'No pocket = no pocket infection',
        },
      },
    ],
    whyMissed: 'Leadless pacemakers have limited functionality (VVI pacing only for Micra VR, newer AV sequential available). Implanting physicians may not consider leadless options for high-risk patients due to pacing mode limitations.',
    whyTailrd: 'TAILRD identified high-infection-risk patients (hemodialysis, prior device infection, immunosuppressed) scheduled for conventional pacemaker implant without documented leadless device evaluation.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 500 PMs × 20% high infection risk × 70% receiving conventional × 35% market share ≈ 25. Dollar opportunity: $18,000 device × 25 × 25% conversion = $112.5K.',
  },
  // ============================================================
  // GAP ep-38: POST-ABLATION ANTICOAGULATION NOT PROTOCOLIZED
  // ============================================================
  {
    id: 'ep-gap-38-post-ablation-oac',
    name: 'Post-Ablation Anticoagulation Duration Not Protocolized',
    category: 'Quality',
    patientCount: 60,
    dollarOpportunity: 0,
    priority: 'medium',
    evidence:
      '2019 AHA/ACC/HRS Guidelines. Post-ablation OAC: minimum 2 months regardless of rhythm. Long-term OAC guided by CHA₂DS₂-VASc, not ablation success.',
    cta: 'Standardize Post-Ablation Anticoagulation — Minimum 2 Months OAC',
    detectionCriteria: [
      'AF ablation performed within past 6 months',
      'No standardized post-ablation anticoagulation protocol documented',
      'OAC discontinued <2 months post-ablation or no documentation of duration plan',
      'Long-term OAC decision not linked to CHA₂DS₂-VASc score',
    ],
    patients: [
      {
        id: 'EP-PAC-038-001',
        name: 'Virginia Hawthorne',
        mrn: 'MRN-EP-38001',
        age: 67,
        signals: [
          'AF ablation 3 weeks ago — OAC already discontinued by PCP',
          'CHA₂DS₂-VASc 4 — requires long-term OAC regardless of ablation success',
          'Guidelines: minimum 2 months OAC post-ablation, no exceptions',
          'Premature OAC discontinuation = high stroke risk',
        ],
        keyValues: {
          'Ablation Date': '3 weeks ago',
          'OAC Status': 'Discontinued (by PCP)',
          'CHA₂DS₂-VASc': '4',
          'Minimum OAC Duration': '2 months (guidelines)',
          'Long-Term OAC': 'Required (CHA₂DS₂-VASc ≥2)',
          'Risk': 'High stroke risk — OAC stopped too early',
        },
      },
      {
        id: 'EP-PAC-038-002',
        name: 'Donald Fitzpatrick',
        mrn: 'MRN-EP-38002',
        age: 54,
        signals: [
          'Ablation 6 weeks ago — no OAC duration plan documented',
          'CHA₂DS₂-VASc 1 (male) — long-term OAC may or may not be needed',
          'Decision should be documented: continue vs stop at 2-3 months',
          'No post-ablation anticoagulation protocol in chart',
        ],
        keyValues: {
          'Ablation Date': '6 weeks ago',
          'OAC Status': 'On apixaban — no duration plan',
          'CHA₂DS₂-VASc': '1',
          'Protocol': 'Not documented',
          'Decision Needed': 'Continue vs stop at 2-3 months',
          'Guideline': 'Minimum 2 months, then reassess by CHA₂DS₂-VASc',
        },
      },
      {
        id: 'EP-PAC-038-003',
        name: 'Constance Beauregard',
        mrn: 'MRN-EP-38003',
        age: 72,
        signals: [
          'Post-ablation 4 months — patient asking to stop anticoagulation',
          'CHA₂DS₂-VASc 5 — OAC must continue regardless of ablation success',
          'Common misconception: successful ablation = no more OAC',
          'Guidelines: long-term OAC guided by stroke risk, not rhythm',
        ],
        keyValues: {
          'Ablation Date': '4 months ago',
          'OAC Status': 'Rivaroxaban — patient requesting stop',
          'CHA₂DS₂-VASc': '5',
          'AF Recurrence': 'None on monitoring',
          'Long-Term OAC': 'Required — CHA₂DS₂-VASc ≥2',
          'Education': 'OAC guided by stroke risk, not ablation outcome',
        },
      },
    ],
    whyMissed: 'Post-ablation anticoagulation management transitions between EP, cardiology, and primary care. Without a standardized protocol, OAC is either stopped too early or continued without documented rationale.',
    whyTailrd: 'TAILRD identified post-ablation patients without a standardized OAC protocol by connecting ablation procedure dates with anticoagulation prescribing patterns and CHA₂DS₂-VASc scores.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 1,200 ablations × 40% AF × 35% without protocol × 35% market share ≈ 60. Dollar opportunity: Quality — $0 direct, prevents stroke.',
  },
  // ── GAP 73: SVT ABLATION NOT OFFERED ─────────────────────────
  {
    id: 'ep-gap-73-svt-ablation',
    name: 'SVT (AVNRT/AVRT) — Ablation Not Offered in AAD-Treated Patient',
    category: 'Procedural',
    patientCount: 680,
    dollarOpportunity: 1240000,
    priority: 'high',
    evidence: 'ACC/AHA/HRS 2015 SVT Guidelines: catheter ablation for AVNRT is Class I (LOE B) in symptomatic patients — cure rates 95-98% for AVNRT, 90-95% for AVRT. AVNRT/AVRT ablation eliminates need for chronic AAD therapy and associated side effects. PSVT is the most common sustained arrhythmia in young patients; ablation preferred over lifelong beta-blocker or flecainide. CPT 93653 (SVT ablation). Radiofrequency or cryoablation with minimal complication rates (<1%).',
    cta: 'Refer for EP Consultation — Ablation as Curative Option',
    detectionCriteria: [
      'ICD-10 I47.19 (SVT/AVNRT) or I45.6 (WPW/AVRT) in active problem list',
      'Active AAD prescription ≥3 months (beta-blocker, flecainide, propafenone, verapamil)',
      'No EP consultation or ablation procedure code in chart',
      'No documented discussion of ablation as curative option',
      'Exclude: Patient-documented preference for medication over procedure',
    ],
    patients: [
      {
        id: 'EP-SVT-073-001',
        name: 'Natalie Forsythe',
        mrn: 'MRN-EP-73001',
        age: 34,
        signals: [
          'AVNRT (I47.19) — symptomatic episodes 3-4×/month',
          'On metoprolol 50mg for 8 months — partial suppression only',
          'No EP referral or ablation discussion documented',
          'Cure rate with ablation: 95-98% — preferred over lifelong AAD',
        ],
        keyValues: {
          'Diagnosis': 'AVNRT (I47.19)',
          'Current AAD': 'Metoprolol 50mg × 8 months',
          'Episode Frequency': '3-4×/month — breakthrough on AAD',
          'EP Referral': 'None',
          'Ablation Discussed': 'No',
          'Recommended': 'RF or cryoablation CPT 93653',
        },
      },
      {
        id: 'EP-SVT-073-002',
        name: 'Marcus Townsend',
        mrn: 'MRN-EP-73002',
        age: 28,
        signals: [
          'WPW/AVRT (I45.6) — delta waves on 12-lead ECG',
          'On flecainide 100mg BID × 5 months',
          'No EP study or ablation referral',
          'AVRT ablation: 90-95% cure; eliminates SCD risk from AF+WPW',
        ],
        keyValues: {
          'Diagnosis': 'WPW / AVRT (I45.6)',
          'Current AAD': 'Flecainide 100mg BID × 5 months',
          'Delta Waves': 'Present on 12-lead ECG',
          'EP Study': 'Not performed',
          'Ablation Discussed': 'No',
          'Risk': 'AF + WPW = sudden cardiac death risk',
        },
      },
      {
        id: 'EP-SVT-073-003',
        name: 'Patricia Lundgren',
        mrn: 'MRN-EP-73003',
        age: 42,
        signals: [
          'AVNRT (I47.19) — on verapamil 120mg × 12 months',
          'Tolerating medication but experiencing fatigue and hypotension',
          'No ablation discussion despite >1 year of AAD therapy',
          'AAD side effects: constipation, fatigue, AV node depression',
        ],
        keyValues: {
          'Diagnosis': 'AVNRT (I47.19)',
          'Current AAD': 'Verapamil 120mg × 12 months',
          'AAD Side Effects': 'Fatigue, hypotension, constipation',
          'EP Referral': 'None',
          'Ablation Discussed': 'No',
          'Recommended': 'Cryoablation (Class I, LOE B)',
        },
      },
    ],
    whyMissed: 'SVT patients are often managed long-term by general cardiologists or primary care without referral to EP. AAD prescription renewal becomes routine without re-evaluation of ablation as the guideline-preferred curative option.',
    whyTailrd: 'TAILRD identified SVT patients on prolonged AAD therapy by connecting arrhythmia diagnosis codes with active pharmacy data and absence of EP consultation or ablation procedure codes.',
    methodologyNote: 'Identifies patients with documented AVNRT (I47.19) or AVRT/WPW (I47.11, I45.6) on AAD therapy (beta-blocker, flecainide, propafenone, verapamil, diltiazem) for ≥3 months without documented ablation discussion or referral to EP. Excludes patients with documented patient preference for medical therapy.',
  },
  // ── GAP 74: SECONDARY PREVENTION ICD ────────────────────────
  {
    id: 'ep-gap-74-secondary-prevention-icd',
    name: 'Cardiac Arrest Survivor — Secondary Prevention ICD Not Implanted',
    category: 'Device Therapy',
    patientCount: 210,
    dollarOpportunity: 890000,
    priority: 'high',
    evidence: 'Secondary prevention ICD: Class I, LOE A (ACC/AHA 2017) for survivors of VF or hemodynamically unstable VT not due to a reversible cause. AVID, CIDS, CASH trials: ICD reduces all-cause mortality by 20-28% vs. amiodarone in cardiac arrest survivors. Distinct from DANISH primary prevention (LVEF-based): reversible cause exclusion (electrolyte, acute MI within 48h, drug toxicity) must be documented. ICD implant CPT 33240-33249.',
    cta: 'Urgent EP Consultation — Secondary Prevention ICD Evaluation',
    detectionCriteria: [
      'ICD-10 I46.2, I46.8, I46.9 (cardiac arrest) or I47.01 (VF) in recent discharge summary',
      'Survived to hospital discharge (alive in EMR)',
      'No ICD implant CPT code (33240-33249) or device present on echo/imaging',
      'No documented reversible cause exclusion in chart note (electrolytes, acute MI <48h, drug toxicity)',
      'EP consultation not documented within 30 days of event',
    ],
    patients: [
      {
        id: 'EP-ICD2-074-001',
        name: 'Raymond Kowalski',
        mrn: 'MRN-EP-74001',
        age: 58,
        signals: [
          'Survived VF cardiac arrest (I46.2) — discharged 3 weeks ago',
          'No ICD implanted — no EP consultation documented',
          'Reversible cause (electrolyte, acute MI <48h) not documented as excluded',
          'AVID/CIDS/CASH: ICD reduces mortality 20-28% vs amiodarone',
        ],
        keyValues: {
          'Event': 'VF Cardiac Arrest (I46.2)',
          'Discharge Date': '3 weeks ago',
          'ICD Implanted': 'No',
          'EP Consultation': 'None documented',
          'Reversible Cause': 'Not excluded in chart',
          'Recommended': 'Secondary prevention ICD — Class I, LOE A',
        },
      },
      {
        id: 'EP-ICD2-074-002',
        name: 'Donna Castellano',
        mrn: 'MRN-EP-74002',
        age: 65,
        signals: [
          'Resuscitated VF (I47.01) 6 weeks ago — no ICD workup',
          'LVEF 38% on echo — structural disease present',
          'On amiodarone started at discharge — not equivalent to ICD',
          'ICD superior to amiodarone for secondary prevention (AVID trial)',
        ],
        keyValues: {
          'Event': 'Resuscitated VF (I47.01)',
          'LVEF': '38%',
          'Current Therapy': 'Amiodarone (not equivalent to ICD)',
          'ICD Implanted': 'No',
          'EP Consultation': 'None',
          'Recommended': 'ICD CPT 33240 — Class I, LOE A',
        },
      },
      {
        id: 'EP-ICD2-074-003',
        name: 'Thomas Barrington',
        mrn: 'MRN-EP-74003',
        age: 71,
        signals: [
          'Cardiac arrest (I46.9) survived — discharged to SNF without ICD',
          'No documentation of reversible cause evaluated or excluded',
          'Transferred to SNF — EP follow-up not arranged',
          'CASH trial: ICD reduces all-cause mortality at 5 years vs AAD',
        ],
        keyValues: {
          'Event': 'Cardiac Arrest (I46.9)',
          'Current Location': 'SNF — no EP follow-up arranged',
          'ICD Implanted': 'No',
          'Reversible Cause Review': 'Not documented',
          'EP Consultation': 'Not arranged',
          'Recommended': 'EP referral + secondary prevention ICD evaluation',
        },
      },
    ],
    whyMissed: 'Cardiac arrest survivors discharged to SNF or rehab facilities frequently fall through the gap between inpatient and outpatient EP care. Secondary prevention ICD evaluation is not automatically triggered in transitions of care workflows.',
    whyTailrd: 'TAILRD cross-referenced cardiac arrest ICD-10 codes in discharge summaries with device implant procedure codes and EP consultation notes to identify survivors lacking secondary prevention ICD evaluation.',
    methodologyNote: 'Identifies patients with ICD-10 I46.2, I46.8, I46.9 (cardiac arrest) or I47.0 (VF/flutter resuscitated) who survived hospitalization without ICD implantation and without documented reversible cause exclusion. Cross-references EP consultation notes and device implant procedure codes.',
  },
  // ── GAP 75: ACHD ARRHYTHMIA MONITORING ──────────────────────
  {
    id: 'ep-gap-75-achd-arrhythmia',
    name: 'Adult Congenital Heart Disease — Arrhythmia Monitoring Protocol Absent',
    category: 'Structural Arrhythmia',
    patientCount: 145,
    dollarOpportunity: 560000,
    priority: 'high',
    evidence: 'ACC/AHA ACHD Guidelines 2018 (J Am Coll Cardiol): TOF (Q21.3) — annual ECG + Holter for VT/SCD risk; ICD Class I if prior sustained VT, Class IIa if RVEF <35%. TGA post-Mustard/Senning (Q20.3) — systemic RV failure + AFL risk; Holter every 1-2 years. Ebstein anomaly (Q22.5) — WPW in 20-25%; EP study before surgery. Coarctation (Q25.1) — HTN + coronary risk surveillance. SCD incidence in ACHD is 100× general population.',
    cta: 'Initiate ACHD Arrhythmia Surveillance Protocol + ACHD Specialist Referral',
    detectionCriteria: [
      'ICD-10 Q21.3 (TOF), Q20.3 (TGA), Q22.5 (Ebstein), Q25.1 (Coarctation), or Q21.1 (ASD) in problem list',
      'No Holter monitor or extended cardiac monitoring in past 12 months',
      'No ACHD specialist encounter in past 24 months',
      'TOF with RVEF <35% — ICD evaluation not documented',
      'TGA post-atrial switch with sustained AFL — ablation not offered',
    ],
    patients: [
      {
        id: 'EP-ACHD-075-001',
        name: 'Christopher Wentworth',
        mrn: 'MRN-EP-75001',
        age: 38,
        signals: [
          'Tetralogy of Fallot (Q21.3) — repaired at age 4',
          'RVEF 32% on most recent MRI — ICD threshold met (Class IIa)',
          'No Holter in 18 months — guideline: annual monitoring',
          'No ACHD specialist seen in 3 years',
        ],
        keyValues: {
          'Diagnosis': 'Tetralogy of Fallot (Q21.3)',
          'Repair Status': 'Repaired age 4',
          'RVEF': '32% (threshold: <35% = Class IIa ICD)',
          'Last Holter': '18 months ago (overdue)',
          'ACHD Specialist': 'Not seen in 3 years',
          'Recommended': 'Annual Holter + ICD evaluation',
        },
      },
      {
        id: 'EP-ACHD-075-002',
        name: 'Angela Korhonen',
        mrn: 'MRN-EP-75002',
        age: 44,
        signals: [
          'TGA post-Mustard procedure (Q20.3) — systemic RV',
          'Two documented episodes of atrial flutter — ablation not offered',
          'Holter last performed 26 months ago',
          'Systemic RV dysfunction: RVEF 40% — annual monitoring required',
        ],
        keyValues: {
          'Diagnosis': 'TGA post-Mustard (Q20.3)',
          'Systemic RV EF': '40%',
          'AFL Episodes': '2 documented — ablation not offered',
          'Last Holter': '26 months ago (overdue)',
          'ACHD Specialist': 'Seen 2 years ago',
          'Recommended': 'Holter + AFL ablation evaluation',
        },
      },
      {
        id: 'EP-ACHD-075-003',
        name: 'Steven Okafor',
        mrn: 'MRN-EP-75003',
        age: 29,
        signals: [
          'Ebstein anomaly (Q22.5) — WPW on ECG (delta waves present)',
          'No EP study performed prior to planned cardiac surgery',
          'WPW prevalence in Ebstein: 20-25% — EP study mandatory pre-op',
          'No ACHD specialist or EP consultation in past 24 months',
        ],
        keyValues: {
          'Diagnosis': 'Ebstein Anomaly (Q22.5)',
          'WPW': 'Delta waves present on ECG',
          'EP Study': 'Not performed (required pre-op)',
          'Surgery Planned': 'Yes — tricuspid valve repair',
          'ACHD Specialist': 'Not seen in 24 months',
          'Recommended': 'EP study + WPW ablation before surgery',
        },
      },
    ],
    whyMissed: 'ACHD patients often transition to adult general cardiology after pediatric care ends and lack access to ACHD-specific surveillance protocols. Arrhythmia monitoring intervals are not embedded in standard adult cardiology workflows.',
    whyTailrd: 'TAILRD identified ACHD patients in the adult cardiology panel by flagging congenital ICD-10 Q-codes and cross-referencing against Holter monitoring frequency and ACHD specialist encounter recency.',
    methodologyNote: 'Identifies patients with ACHD diagnoses (Q21.3 TOF, Q20.3 TGA, Q22.5 Ebstein, Q25.1 Coarctation, Q21.1 ASD, Q23.x congenital valve abnormalities) who lack annual arrhythmia surveillance (Holter or extended ECG monitoring) or ACHD-specific EP evaluation per guideline intervals. Flags patients whose ACHD follow-up is occurring in general adult cardiology without ACHD specialist involvement.',
  },
  // ── GAP 76: UNEXPLAINED SYNCOPE WORKUP ──────────────────────
  {
    id: 'ep-gap-76-syncope-workup',
    name: 'Unexplained Syncope — Arrhythmia Workup Protocol Not Initiated',
    category: 'Diagnostic Gap',
    patientCount: 920,
    dollarOpportunity: 680000,
    priority: 'medium',
    evidence: 'ESC Syncope Guidelines 2018: ILR (implantable loop recorder) recommended for unexplained syncope with high recurrence risk (Class I, LOE A) after initial evaluation (ECG, orthostatic BP, Echo) is non-diagnostic. CRYSTAL AF trial: ILR detected AF in 30% of cryptogenic stroke patients at 3 years vs. 3% conventional monitoring. Tilt table testing (CPT 93660) for suspected vasovagal. EP study for structural heart disease + syncope. High-risk features (EF <35%, LBBB, prior MI) require urgent evaluation.',
    cta: 'Initiate Structured Syncope Workup — Echo + Holter or ILR',
    detectionCriteria: [
      'ICD-10 R55 (syncope) documented in ≥2 encounters within 12 months OR hospital admission for syncope',
      'Echocardiogram not ordered after first recurrence',
      'No Holter, extended monitoring (MCOT), or ILR in chart',
      'High-risk features present (structural heart disease, abnormal ECG, exertional syncope) without EP consultation',
      'Tilt table not performed in suspected vasovagal without trauma',
    ],
    patients: [
      {
        id: 'EP-SYNC-076-001',
        name: 'Helen Driscoll',
        mrn: 'MRN-EP-76001',
        age: 67,
        signals: [
          'R55 (syncope) — 3 ED visits in 8 months, no cause identified',
          'No echocardiogram ordered after second event',
          'No Holter or extended monitoring performed',
          'LBBB on baseline ECG — high-risk feature requiring EP evaluation',
        ],
        keyValues: {
          'ICD-10': 'R55 — syncope',
          'Episode Count': '3 in 8 months',
          'Echocardiogram': 'Not ordered',
          'Holter / MCOT': 'None',
          'ECG Finding': 'LBBB — high-risk feature',
          'Recommended': 'Echo + EP consultation + MCOT or ILR',
        },
      },
      {
        id: 'EP-SYNC-076-002',
        name: 'Paul Whitfield',
        mrn: 'MRN-EP-76002',
        age: 52,
        signals: [
          'Syncope during exertion (R55) — twice in 6 months',
          'Exertional syncope: high-risk, requires EP study',
          'Echo: LVEF 42%, mild LVH — structural disease present',
          'No EP consultation or extended monitoring arranged',
        ],
        keyValues: {
          'ICD-10': 'R55 — exertional syncope',
          'LVEF': '42%',
          'LVH': 'Mild — structural disease',
          'Exertional': 'Yes — highest risk category',
          'EP Consultation': 'None',
          'Recommended': 'Urgent EP study + ILR',
        },
      },
      {
        id: 'EP-SYNC-076-003',
        name: 'Sandra Petrov',
        mrn: 'MRN-EP-76003',
        age: 44,
        signals: [
          'R55 — 2 syncope episodes (no prodrome, no trauma)',
          'Basic workup: ECG + BMP only — no echo or monitoring',
          'EGSYS score 3 — intermediate risk, warrants further evaluation',
          'No tilt table or ILR offered despite recurrent unexplained syncope',
        ],
        keyValues: {
          'ICD-10': 'R55 — recurrent syncope',
          'Prodrome': 'Absent — higher arrhythmic suspicion',
          'EGSYS Score': '3 (intermediate risk)',
          'Echo': 'Not ordered',
          'ILR': 'Not offered',
          'Recommended': 'Echo + tilt table + ILR consideration',
        },
      },
    ],
    whyMissed: 'Syncope is often triaged as low-acuity in the ED and discharged with basic labs and ECG only. Recurrent syncope across multiple encounters is not automatically aggregated in most EMR workflows to trigger a structured workup protocol.',
    whyTailrd: 'TAILRD aggregated R55 syncope codes across ED, outpatient, and inpatient encounters to identify patients with recurrent unexplained syncope and stratified them by EGSYS score and high-risk features.',
    methodologyNote: 'Identifies patients with ≥2 syncope episodes (R55) within 12 months who have received only basic workup (ECG, basic labs) without echo, Holter, tilt table, or ILR. Stratifies by EGSYS score and San Francisco Syncope Rule. Flags patients admitted for syncope without EP consultation when high-risk features are present.',
  },
  // ── GAP 77: ATRIAL FLUTTER OAC UNDERTREATMENT ───────────────
  {
    id: 'ep-gap-77-flutter-oac',
    name: 'Atrial Flutter — OAC Undertreatment Despite CHA\u2082DS\u2082-VASc \u22652',
    category: 'Anticoagulation',
    patientCount: 740,
    dollarOpportunity: 1100000,
    priority: 'high',
    evidence: 'AHA/ACC/HRS AF/Flutter Guidelines 2023: atrial flutter carries equivalent thromboembolic risk to AF. CHA\u2082DS\u2082-VASc \u22652 (male) or \u22653 (female): OAC recommended (Class I). DOAC preferred over warfarin for non-valvular flutter. Common misconception: patients/providers believe flutter requires only rate control without OAC. Stroke risk in flutter is 1.7\u20132.4%/year at CHA\u2082DS\u2082-VASc 2, equivalent to AF.',
    cta: 'Initiate DOAC Therapy — Atrial Flutter with CHA\u2082DS\u2082-VASc \u22652',
    detectionCriteria: [
      'ICD-10 I48.3 or I48.4 (atrial flutter) in active problem list',
      'CHA\u2082DS\u2082-VASc score \u22652 (male) or \u22653 (female) — calculated from comorbidities in EMR',
      'No active DOAC (apixaban, rivaroxaban, edoxaban, dabigatran) or warfarin prescription',
      'No documented contraindication to anticoagulation (recent major bleeding, thrombocytopenia <50)',
      'Exclude: patient on anticoagulation for other indication (mechanical valve, PE/DVT)',
    ],
    patients: [
      {
        id: 'EP-FLTOAC-077-001',
        name: 'Leonard Ashworth',
        mrn: 'MRN-EP-77001',
        age: 72,
        signals: [
          'Typical atrial flutter (I48.3) — active problem list',
          'CHA\u2082DS\u2082-VASc score 4 (age, HTN, HF, male) — OAC Class I',
          'No anticoagulation prescribed — provider note: "flutter, no need for OAC"',
          'Stroke risk: 2.4%/year untreated (equivalent to AF)',
        ],
        keyValues: {
          'Diagnosis': 'Typical AFL (I48.3)',
          'CHA\u2082DS\u2082-VASc': '4',
          'Score Components': 'Age, HTN, HF, Male',
          'Current OAC': 'None',
          'Provider Note': '"Flutter — no OAC needed" (incorrect)',
          'Recommended': 'Apixaban or rivaroxaban — Class I',
        },
      },
      {
        id: 'EP-FLTOAC-077-002',
        name: 'Beverly Harrington',
        mrn: 'MRN-EP-77002',
        age: 68,
        signals: [
          'Atypical atrial flutter (I48.4) — on rate control only',
          'CHA\u2082DS\u2082-VASc score 3 (female) — meets OAC threshold',
          'No anticoagulation — flutter managed by internist, not cardiologist',
          'Guideline equivalent: flutter = AF for thromboembolic risk',
        ],
        keyValues: {
          'Diagnosis': 'Atypical AFL (I48.4)',
          'CHA\u2082DS\u2082-VASc': '3 (female threshold)',
          'Current Therapy': 'Metoprolol only — rate control',
          'OAC': 'None',
          'Managing Provider': 'Internist (no cardiology referral)',
          'Recommended': 'DOAC initiation + cardiology/EP referral',
        },
      },
      {
        id: 'EP-FLTOAC-077-003',
        name: 'George Pemberton',
        mrn: 'MRN-EP-77003',
        age: 76,
        signals: [
          'Typical flutter (I48.3) — post-cardioversion, OAC not continued',
          'CHA\u2082DS\u2082-VASc 5 — high-risk, long-term OAC required',
          'Cardioversion performed 3 months ago — OAC discontinued at 4 weeks',
          'AFL: OAC duration mirrors post-cardioversion AF protocol (minimum 4 weeks, then by CHA\u2082DS\u2082-VASc)',
        ],
        keyValues: {
          'Diagnosis': 'Typical AFL (I48.3)',
          'CHA\u2082DS\u2082-VASc': '5',
          'Cardioversion Date': '3 months ago',
          'OAC Status': 'Discontinued at 4 weeks post-DCCV',
          'Long-Term OAC': 'Required — CHA\u2082DS\u2082-VASc \u22652',
          'Recommended': 'Resume DOAC — long-term based on stroke risk',
        },
      },
    ],
    whyMissed: 'Atrial flutter is frequently managed separately from AF in clinical workflows. Many providers and patients hold the misconception that flutter does not carry the same stroke risk as AF, leading to systematic OAC undertreatment.',
    whyTailrd: 'TAILRD identified flutter-specific anticoagulation gaps by cross-referencing I48.3/I48.4 diagnosis codes with active pharmacy data and CHA\u2082DS\u2082-VASc scores calculated from comorbidity data — distinct from the AF anticoagulation gap.',
    methodologyNote: 'Identifies patients with ICD-10 I48.3 (typical AFL) or I48.4 (atypical AFL) who have CHA\u2082DS\u2082-VASc \u22652 (male) without active OAC prescription. Distinct from the AF anticoagulation gap — flutter-specific underprescription is clinically significant as it is often overlooked. Cross-checks for documented contraindication to anticoagulation before flagging.',
  },
  // ── GAP 78: TORSADES DE POINTES — MANAGEMENT PROTOCOL ───────
  {
    id: 'ep-gap-78-torsades',
    name: 'Documented Torsades de Pointes — Magnesium and QT Correction Protocol Not Initiated',
    category: 'Acute Arrhythmia Safety',
    patientCount: 95,
    dollarOpportunity: 340000,
    priority: 'high',
    tag: 'TdP | Patient Safety | AHRQ PSI',
    evidence: 'Torsades de Pointes (I47.21): IV magnesium sulfate 1-2g is first-line treatment (Class I). Temporary pacing or isoproterenol if pause-dependent. All QT-prolonging drugs must be stopped immediately. AHA 2010 ACLS guidelines and AHA/ACC 2022 update: QT correction + drug review mandatory. AHRQ Patient Safety Indicator: QT prolongation from avoidable drug combinations is a preventable harm event.',
    cta: 'IV Magnesium + QT Drug Discontinuation + EP Evaluation for LQTS',
    safetyNote: 'Torsades de Pointes is a life-threatening arrhythmia. IV magnesium sulfate must be administered immediately. All QT-prolonging medications must be reviewed and discontinued. Failure to act is a patient safety event.',
    detectionCriteria: [
      'ICD-10 I47.21 (torsades de pointes) in recent hospitalization or ED encounter',
      'QTc >500ms on presenting ECG',
      'IV magnesium sulfate not administered within 2 hours of TdP documentation',
      'QT-prolonging medications (antipsychotics, antibiotics, AADs) not discontinued at discharge',
      'Follow-up EP evaluation for possible congenital LQTS not arranged',
    ],
    patients: [
      {
        id: 'EP-TDP-078-001',
        name: 'Robert Vandermeer',
        mrn: 'MRN-EP-78001',
        age: 63,
        signals: [
          'TdP (I47.21) — documented during hospitalization for pneumonia',
          'QTc 542ms on admission ECG — azithromycin + haloperidol combination',
          'IV magnesium not given — TdP terminated spontaneously',
          'Both QT-prolonging drugs continued at discharge',
        ],
        keyValues: {
          'ICD-10': 'I47.21 — Torsades de Pointes',
          'QTc': '542ms',
          'Precipitating Drugs': 'Azithromycin + Haloperidol',
          'IV Magnesium': 'Not administered',
          'Drugs at Discharge': 'Both continued (error)',
          'Recommended': 'D/C QT drugs + IV MgSO4 + EP evaluation',
        },
      },
      {
        id: 'EP-TDP-078-002',
        name: 'Caroline Szymanski',
        mrn: 'MRN-EP-78002',
        age: 55,
        signals: [
          'Polymorphic VT in setting of QTc 518ms — TdP pattern on telemetry',
          'On sotalol 80mg BID + fluconazole — high-risk combination',
          'IV magnesium delayed 4 hours — protocol not followed',
          'No EP evaluation for underlying congenital LQTS arranged',
        ],
        keyValues: {
          'ICD-10': 'I47.21 — TdP / Polymorphic VT',
          'QTc': '518ms',
          'Precipitating Drugs': 'Sotalol + Fluconazole',
          'IV Magnesium': 'Delayed 4 hours (protocol breach)',
          'LQTS Evaluation': 'Not arranged',
          'Recommended': 'D/C sotalol/fluconazole + LQTS genetic testing',
        },
      },
      {
        id: 'EP-TDP-078-003',
        name: 'Arthur Mendenhall',
        mrn: 'MRN-EP-78003',
        age: 48,
        signals: [
          'TdP (I47.21) — recurrent, second episode in 6 months',
          'QTc 529ms — no baseline QTc review or LQTS workup performed',
          'First TdP episode treated with magnesium, no follow-up EP evaluation',
          'Second episode: same drug combination present — no protocol change',
        ],
        keyValues: {
          'ICD-10': 'I47.21 — TdP (recurrent)',
          'QTc': '529ms',
          'Episode Count': '2 in 6 months',
          'Prior EP Evaluation': 'None after first episode',
          'Baseline LQTS Workup': 'Not performed',
          'Recommended': 'EP evaluation + LQTS genetic screening + drug review',
        },
      },
    ],
    whyMissed: 'TdP events are often documented in the telemetry or cardiology note but do not automatically trigger a structured QT drug review, magnesium administration protocol, or downstream EP evaluation for congenital LQTS. Discharge medication reconciliation does not always catch QT-prolonging drug combinations.',
    whyTailrd: 'TAILRD cross-referenced I47.21 TdP diagnosis codes with medication administration records (IV magnesium), active medication lists, and post-discharge EP follow-up scheduling to identify patients where the full TdP management protocol was not completed.',
    methodologyNote: 'Identifies patients with documented TdP (I47.21) or polymorphic VT in the setting of QTc >500ms who did not receive IV magnesium sulfate, did not have QT-prolonging medications discontinued, or lack follow-up EP evaluation to assess underlying LQTS. Flags admissions where TdP occurred without medication reconciliation or QT-prolonging agent removal.',
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
          <span className="bg-[#C8D4DC] text-white px-2 py-0.5 rounded text-xs font-bold">COMPLIANT</span>
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
  const bgColor = isEOL ? 'bg-red-50 border-red-200' : 'bg-[#F0F5FA] border-[#C8D4DC]';
  const headerColor = isEOL ? 'text-red-700' : 'text-[#6B7280]';
  const iconColor = isEOL ? 'text-red-600' : 'text-[#6B7280]';

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
          <span className="bg-[#F0F5FA] text-white px-2 py-0.5 rounded text-xs font-bold">HIGH</span>
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
    ? 'bg-[#F0F5FA] text-white'
    : severity === 'MODERATE'
    ? 'bg-[#FAF6E8] text-[#8B6914]'
    : 'bg-[#F0F7F4] text-[#2D6147]';

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
    <div className="bg-[#F0F5FA] border border-[#C8D4DC] rounded-lg p-3 mt-3">
      <h5 className="text-sm font-bold text-[#6B7280] flex items-center gap-1.5 mb-1">
        <Activity className="w-4 h-4 text-[#6B7280]" />
        PVC Burden Estimate
      </h5>
      <div className="text-sm text-[#6B7280]">
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
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${display.colorClass === 'text-red-600' ? 'bg-red-100 text-red-700' : display.colorClass === 'text-[#6B7280]' ? 'bg-[#FAF6E8] text-[#8B6914]' : display.colorClass === 'text-[#2C4A60]' ? 'bg-[#F0F7F4] text-[#2D6147]' : 'bg-gray-100 text-gray-500'}`}>
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
// COMPONENT
// ============================================================
const epGapSubTabs = [
  { id: 'all', label: 'All Gaps', keywords: [] as string[] },
  { id: 'af', label: 'AF Management', keywords: ['persistent af', 'rhythm control', 'rate control', 'east-afnet', 'cardioversion', 'early rhythm', 'af recurrence', 'af rate', 'flutter'] },
  { id: 'anticoag', label: 'Anticoagulation', keywords: ['oac', 'cha', 'anticoagulation not', 'subclinical af', 'undertreatment', 'tee not', 'aspirin + oac'] },
  { id: 'ablation', label: 'Ablation Candidates', keywords: ['ablation', 'pfa', 'svt', 'avnrt', 'avrt', 'vt ablation', 'epicardial', 'csp', 'zero-fluoroscopy', 'castle-af', 'vanish', 'partita'] },
  { id: 'device', label: 'Device Therapy', keywords: ['icd', 'laac', 'leadless', 'subcutaneous icd', 'crt', 'battery', 'eri', 'eol', 'lead recall', 'device infection', 'cardiac arrest survivor'] },
  { id: 'drugsafety', label: 'Drug Safety', keywords: ['amiodarone', 'dofetilide', 'dronedarone', 'qtc', 'lqts', 'torsades', 'aad not discontinued', 'rems'] },
  { id: 'diagnostics', label: 'Diagnostics & Syncope', keywords: ['syncope', 'loop recorder', 'ilr', 'pvc burden', 'wpw', 'fontan', 'adult congenital', 'carotid', 'cryptogenic', 'inappropriate sinus'] },
];

const EPClinicalGapDetectionDashboard: React.FC = () => {
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const { trackGapView, gapActions } = useGapActions('ELECTROPHYSIOLOGY');
  const [activeGapSubTab, setActiveGapSubTab] = useState<string>('all');
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [patientSortOrder, setPatientSortOrder] = useState<'urgency' | 'dollar' | 'score'>('urgency');
  const [showMethodology, setShowMethodology] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

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
  const sortedGaps = [...EP_CLINICAL_GAPS].sort((a, b) => {
    const diff = (categorySortOrder[a.category] ?? 99) - (categorySortOrder[b.category] ?? 99);
    if (diff !== 0) return diff;
    return (b.patientCount || 0) - (a.patientCount || 0);
  });

  const filterConfig: Record<string, string[]> = {
    'AF Management': ['AF', 'Atrial Fibrillation', 'Rhythm Control', 'Rate Control', 'EAST-AFNET', 'Persistent AF', 'Cardioversion', 'Flutter'],
    'Anticoagulation': ['OAC', 'Anticoagulation', 'CHA', 'Subclinical AF', 'Undertreatment', 'TEE', 'Aspirin + OAC'],
    'Ablation Candidates': ['Ablation', 'PFA', 'SVT', 'AVNRT', 'AVRT', 'VT', 'Epicardial', 'CSP', 'Zero-Fluoroscopy', 'CASTLE-AF', 'VANISH', 'PARTITA'],
    'Device Therapy': ['ICD', 'LAAC', 'Watchman', 'Leadless', 'Subcutaneous ICD', 'CRT', 'Battery', 'ERI', 'EOL', 'Lead Recall', 'Device Infection', 'Remote Monitoring', 'Cardiac Arrest'],
    'Drug Safety': ['Amiodarone', 'Dofetilide', 'Dronedarone', 'QTc', 'LQTS', 'Torsades', 'AAD', 'REMS'],
    'Diagnostics & Syncope': ['Syncope', 'ILR', 'Loop Recorder', 'PVC', 'WPW', 'Fontan', 'Congenital', 'Adult Congenital', 'Carotid', 'Cryptogenic', 'Inappropriate Sinus'],
  };

  const chipCounts = Object.fromEntries(
    Object.entries(filterConfig).map(([label, keywords]) => [
      label,
      sortedGaps.filter(gap =>
        keywords.some(kw => (gap.name || '').toLowerCase().includes(kw.toLowerCase()))
      ).length
    ])
  );

  const activeSubTab = epGapSubTabs.find(s => s.id === activeGapSubTab);
  const subTabFilteredGaps = !activeSubTab || activeSubTab.id === 'all'
    ? sortedGaps
    : sortedGaps.filter(gap =>
        activeSubTab.keywords.some(kw => (gap.name || '').toLowerCase().includes(kw.toLowerCase()))
      );

  const filteredGaps = activeFilters.length === 0 ? subTabFilteredGaps : subTabFilteredGaps.filter(gap => {
    const gapName = (gap.name || '').toLowerCase();
    return activeFilters.some(label =>
      filterConfig[label].some(kw => gapName.includes(kw.toLowerCase()))
    );
  });

  const filteredPatientCount = filteredGaps.reduce((sum, g) => sum + (g.patientCount || 0), 0);
  const filteredOpportunity = filteredGaps.reduce((sum, g) => sum + (g.dollarOpportunity || 0), 0);
  const totalPatientCountForChips = sortedGaps.reduce((sum, g) => sum + (g.patientCount || 0), 0);
  const totalOpportunityForChips = sortedGaps.reduce((sum, g) => sum + (g.dollarOpportunity || 0), 0);

  const priorityColor = (p: string) => {
    if (p === 'high') return 'bg-red-50 border-red-300 text-red-700';
    if (p === 'medium') return 'bg-[#F0F5FA] border-[#C8D4DC] text-[#6B7280]';
    return 'bg-[#F0F7F4] border-[#D8EDE6] text-[#2C4A60]';
  };

  const categoryColor = (c: string) =>
    c === 'Discovery'
      ? 'bg-slate-100 text-slate-800'
      : c === 'Gap'
      ? 'bg-red-100 text-red-800'
      : c === 'Safety'
      ? 'bg-rose-200 text-rose-900'
      : c === 'Quality'
      ? 'bg-[#FAF6E8] text-[#8B6914]'
      : c === 'Deprescribing'
      ? 'bg-[#FAF6E8] text-[#8B6914]'
      : 'bg-blue-100 text-blue-800';

  return (
    <div className="space-y-6">
      {/* Gap Category Sub-tabs */}
      <div className="mb-4 bg-white rounded-xl border border-titanium-200 p-4 shadow-sm overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {epGapSubTabs.map(sub => {
            const count = sub.id === 'all'
              ? sortedGaps.length
              : sortedGaps.filter(g => sub.keywords.some(kw => (g.name || '').toLowerCase().includes(kw.toLowerCase()))).length;
            const isActive = activeGapSubTab === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setActiveGapSubTab(sub.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                style={isActive ? { backgroundColor: '#2C4A60' } : {}}
              >
                {sub.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Header summary */}
      <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-titanium-900 mb-1 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#2C4A60]" />
          Clinical Gap Detection — Electrophysiology Module
        </h3>
        {activeSubTab && activeSubTab.id !== 'all' ? (
          <div className="text-sm text-slate-500 mb-4">
            <strong>{activeSubTab.label}</strong> · {filteredPatientCount.toLocaleString()} patients · ${(filteredOpportunity / 1_000_000).toFixed(1)}M
          </div>
        ) : (
          <div className="text-sm text-slate-500 mb-4">
            Patients identified: <strong>{totalPatients.toLocaleString()}</strong> · Opportunity: <strong>${(totalOpportunity / 1_000_000).toFixed(1)}M</strong>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-red-600" />
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Affected Patients</span>
            </div>
            <div className="text-2xl font-bold text-red-800">{filteredPatientCount.toLocaleString()}</div>
          </div>
          <div className="bg-[#F0F7F4] border border-[#D8EDE6] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-[#2C4A60]" />
              <span className="text-xs font-semibold text-[#2C4A60] uppercase tracking-wide">Total Opportunity</span>
            </div>
            <div className="text-2xl font-bold text-[#2C4A60]">
              ${(filteredOpportunity / 1000000).toFixed(1)}M
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Active Gaps</span>
            </div>
            <div className="text-2xl font-bold text-blue-800">{filteredGaps.length}</div>
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
              <button
                className="w-full text-left p-5 flex items-start justify-between hover:bg-titanium-50 transition-colors"
                onClick={() => {
                  const nextId = isOpen ? null : gap.id;
                  setExpandedGap(nextId);
                  if (nextId) trackGapView(gap.id);
                }}
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
                      <span className="text-xs font-semibold text-[#2C4A60]">{'\u2B21'} Discovery — Net new patients · Never previously identified</span>
                    </div>
                  )}
                  <div className="font-semibold text-titanium-900 text-base">{gap.name}</div>
                  <div className="flex gap-6 mt-2">
                    <span className="text-sm text-titanium-600">
                      <span className="font-semibold text-titanium-900">{gap.patientCount}</span> patients
                    </span>
                    <span className="text-sm text-titanium-600">
                      <span className="font-semibold text-[#2C4A60]">${(gap.dollarOpportunity / 1000000).toFixed(1)}M</span> opportunity
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
                      <Search className="w-3 h-3 text-[#4A6880] flex-shrink-0 mt-0.5" />
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

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-semibold text-blue-800 mb-1 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" />
                      Clinical Evidence
                    </h4>
                    <p className="text-sm text-blue-700">{gap.evidence}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-[#2C4A60]" />
                    <span className="font-semibold text-[#2C4A60]">Recommended Action:</span>
                    <span className="text-sm font-medium bg-[#f0f5fa] border border-[#C8D4DC] px-3 py-1 rounded-lg text-[#2C4A60]">
                      {gap.cta}
                    </span>
                  </div>

                  {/* Gap Action Buttons — care team response tracking */}
                  <GapActionButtons
                    gapId={gap.id}
                    gapName={gap.name}
                    ctaText={gap.cta}
                    moduleType="ELECTROPHYSIOLOGY"
                    existingAction={gapActions[gap.id] || null}
                  />

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
                                  <span className="ml-2 text-xs bg-[#FAF6E8] text-[#8B6914] px-2 py-0.5 rounded-full">
                                    {pt.scenario}
                                  </span>
                                )}
                                {gap.category === 'Discovery' && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-xs bg-[#F0F5FA] text-slate-700 px-2 py-0.5 rounded-full" title="This patient was not previously flagged in any clinical workflow. TAILRD identified this patient by assembling disconnected signals across care settings.">
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
                                        <dd className="font-medium text-titanium-900" title="Automatically calculated from EHR-sourced data via EHR integration. No manual entry required.">{v}<span title="Automatically calculated from EHR-sourced data via EHR integration. No manual entry required."><Info className="w-3 h-3 text-blue-400 inline-block ml-1 cursor-help" /></span></dd>
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

export default EPClinicalGapDetectionDashboard;
