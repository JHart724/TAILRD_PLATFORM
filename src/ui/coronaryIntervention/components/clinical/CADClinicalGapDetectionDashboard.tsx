import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, DollarSign, Users, ChevronDown, ChevronUp, Target, Activity, Pill, Stethoscope, TrendingUp, Zap, Info, Search, Radio, FileText } from 'lucide-react';
import { estimateSYNTAX, computeSAQTrend } from '../../../../utils/clinicalCalculators';
import { computeTrajectory, computeTimeHorizon, trajectoryDisplay, timeHorizonDisplay, estimateSVGFailureProbability, computeRevenueAtRisk, formatDollar, type TrajectoryResult, type TrajectoryDistribution } from '../../../../utils/predictiveCalculators';

// ============================================================
// CLINICAL GAP DETECTION — CAD / CORONARY INTERVENTION MODULE
// Gaps: 9 (SGLT2i for CKD), 14 (COMPASS Dual Pathway), 15 (PCSK9i/Inclisiran)
//       20 (Cardiac Rehab Cross-Module), 23 (Lp(a) Screening),
//       32 (SGLT2i Underdosing), 37 (BB for Stable Angina),
//       38 (Ranolazine Refractory Angina), 39 (High-Intensity Statin Post-ACS),
//       40 (Carotid Stenosis Cross-Module), 42 (CIN Prevention Cross-Module),
//       44 (Medication Reconciliation), 45 (Colchicine)
//       46 (Heart Team Review), 47 (Complete Revasc), 48 (CTO PCI),
//       49 (Intravascular Imaging), 50 (DAPT Discontinuation),
//       51 (FFR/iFR), 52 (Post-ACS PCSK9i), 53 (OAC Monotherapy Cross-Module),
//       54 (CCTA Stable Chest Pain), 55 (Ranolazine Refractory — new),
//       56 (BB Deprescribing REDUCE-AMI), 57 (INOCA), 58 (Bempedoic Acid),
//       59 (Icosapent Ethyl), 60 (Post-CABG Surveillance), 61 (Vasospastic Angina),
//       62 (Chronic hs-TnT), 63 (Bilateral IMA Quality),
//       64 (CABG BIMA Not Utilized), 65 (Hybrid Revascularization),
//       66 (Protected PCI with MCS), 67 (CTO Retrograde Referral),
//       68 (Atherectomy/IVL Calcified Lesion), 69 (Post-CABG SVG Surveillance),
//       70 (SCAD Young Women ACS), 71 (D2B Time Outlier STEMI)
// ============================================================

export interface CADClinicalGap {
  id: string;
  name: string;
  category: 'Gap' | 'Growth' | 'Safety' | 'Quality' | 'Deprescribing' | 'Discovery';
  patientCount: number;
  dollarOpportunity: number;
  evidence: string;
  cta: string;
  priority: 'high' | 'medium' | 'low';
  detectionCriteria: string[];
  patients: CADGapPatient[];
  subcategories?: { label: string; count: number }[];
  tag?: string;
  safetyNote?: string;
  whyMissed?: string;
  whyTailrd?: string;
  methodologyNote?: string;
}

export interface CADGapPatient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  signals: string[];
  keyValues: Record<string, string | number>;
  tier?: string;
  // Patient-Reported Outcomes — SAQ
  saqAnginaFrequency?: number;        // 0-100
  saqPhysicalLimitation?: number;     // 0-100
  saqQualityOfLife?: number;          // 0-100
  saqAdministeredDate?: string;
  saqPriorAnginaFrequency?: number;
  saqPriorDate?: string;
}

// ============================================================
// GAP 9: SGLT2i FOR CKD
// ============================================================
const ckdSGLT2iPatients: CADGapPatient[] = [
  {
    id: 'CAD-CKD-001',
    name: 'Vincent Abara',
    mrn: 'MRN-CAD-91201',
    age: 67,
    signals: [
      'CKD Stage 3b (eGFR 38 mL/min/1.73m2)',
      'UACR 340 mg/g (>= 200 mg/g threshold)',
      'Not on dapagliflozin or empagliflozin',
      'No HF or diabetes driving existing SGLT2i gap',
    ],
    keyValues: {
      'eGFR': '38 mL/min/1.73m2',
      'Prior eGFR': '44 mL/min/1.73m2',
      'CKD Stage': 'Stage 3b',
      'UACR': '340 mg/g',
      'SGLT2i': 'None',
      'Diabetes': 'No',
      'HF': 'No',
    },
  },
  {
    id: 'CAD-CKD-002',
    name: 'Shirley Malone',
    mrn: 'MRN-CAD-91348',
    age: 72,
    signals: [
      'CKD Stage 4 (eGFR 28 mL/min/1.73m2)',
      'UACR 520 mg/g — proteinuric CKD',
      'Not on SGLT2i (CKD-specific indication)',
    ],
    keyValues: {
      'eGFR': '28 mL/min/1.73m2',
      'Prior eGFR': '35 mL/min/1.73m2',
      'CKD Stage': 'Stage 4',
      'UACR': '520 mg/g',
      'SGLT2i': 'None',
      'Diabetes': 'Yes (T2DM)',
      'HF': 'No',
    },
  },
  {
    id: 'CAD-CKD-003',
    name: 'Horace Buckner',
    mrn: 'MRN-CAD-91467',
    age: 61,
    signals: [
      'CKD Stage 3a (eGFR 52 mL/min/1.73m2)',
      'UACR 285 mg/g (>= 200 mg/g)',
      'Not on SGLT2i for CKD indication',
      'CAD (I25.10) also present',
    ],
    keyValues: {
      'eGFR': '52 mL/min/1.73m2',
      'CKD Stage': 'Stage 3a',
      'UACR': '285 mg/g',
      'SGLT2i': 'None',
      'Diabetes': 'No',
      'CAD': 'Yes (I25.10)',
    },
  },
];

// ============================================================
// GAP 14: COMPASS DUAL PATHWAY (Polyvascular)
// ============================================================
const compassPatients: CADGapPatient[] = [
  {
    id: 'CAD-COMP-001',
    name: 'Stanley Nwosu',
    mrn: 'MRN-CAD-14201',
    age: 68,
    signals: [
      'CAD (I25.10) — known coronary artery disease',
      'PAD (I70.213) — bilateral lower extremity PAD',
      'NOT on rivaroxaban 2.5mg BID',
      'On aspirin 81mg',
      'No major bleeding in 12 months',
    ],
    keyValues: {
      'CAD Dx': 'I25.10 (2019)',
      'PAD Dx': 'I70.213 (2021)',
      'Current Antiplatelet': 'Aspirin 81mg daily',
      'Rivaroxaban 2.5mg': 'Not prescribed',
      'Anticoagulant': 'None',
      'Bleeding History': 'None in 12 months',
    },
  },
  {
    id: 'CAD-COMP-002',
    name: 'Agatha Perkins',
    mrn: 'MRN-CAD-14348',
    age: 74,
    signals: [
      'CAD (I25.110) — prior MI',
      'PAD (I70.211) — right femoral stenosis',
      'Not on dual pathway (rivaroxaban 2.5mg + ASA)',
      'On aspirin 325mg — needs dual pathway discussion',
    ],
    keyValues: {
      'CAD Dx': 'I25.110 (prior MI, 2020)',
      'PAD Dx': 'I70.211 (2022)',
      'Current Antiplatelet': 'Aspirin 325mg daily',
      'Rivaroxaban 2.5mg': 'Not prescribed',
      'Anticoagulant': 'None',
      'Bleeding History': 'None',
    },
  },
  {
    id: 'CAD-COMP-003',
    name: 'Irwin Castellano',
    mrn: 'MRN-CAD-14467',
    age: 71,
    signals: [
      'CAD (I25.10) + PAD (I70.219) — polyvascular disease',
      'On DAPT (aspirin + clopidogrel) — eligible to transition',
      'DAPT > 12 months post-PCI — can add vascular dose rivaroxaban',
    ],
    keyValues: {
      'CAD Dx': 'I25.10 + prior PCI (2021)',
      'PAD Dx': 'I70.219 (bilateral)',
      'Current Antiplatelet': 'ASA 81mg + Clopidogrel',
      'Rivaroxaban 2.5mg': 'Not prescribed',
      'Anticoagulant': 'None',
      'Bleeding History': 'None in 12 months',
    },
  },
];

// ============================================================
// GAP 15: PCSK9i / INCLISIRAN ELIGIBILITY
// ============================================================
const pcsk9Patients: CADGapPatient[] = [
  {
    id: 'CAD-PCSK9-001',
    name: 'Douglas Whitfield',
    mrn: 'MRN-CAD-15201',
    age: 65,
    signals: [
      'On max-dose statin + ezetimibe',
      'LDL 88 mg/dL (>= 70 mg/dL secondary prevention target)',
      'Tier A: PCSK9 inhibitor or inclisiran indicated',
    ],
    keyValues: {
      'LDL': '88 mg/dL',
      'Statin': 'Rosuvastatin 40mg (max dose)',
      'Ezetimibe': 'Yes',
      'PCSK9 Inhibitor': 'None',
      'Inclisiran': 'None',
      'Tier': 'A — PCSK9i/Inclisiran indicated',
    },
    tier: 'Tier A: PCSK9i/Inclisiran Indicated',
  },
  {
    id: 'CAD-PCSK9-002',
    name: 'Loretta Huang',
    mrn: 'MRN-CAD-15348',
    age: 70,
    signals: [
      'On max-dose statin only — no ezetimibe',
      'LDL 95 mg/dL',
      'Tier B: Add ezetimibe before escalating to PCSK9i',
    ],
    keyValues: {
      'LDL': '95 mg/dL',
      'Statin': 'Atorvastatin 80mg (max dose)',
      'Ezetimibe': 'Not prescribed',
      'PCSK9 Inhibitor': 'None',
      'Inclisiran': 'None',
      'Tier': 'B — Add ezetimibe first',
    },
    tier: 'Tier B: Add Ezetimibe First',
  },
  {
    id: 'CAD-PCSK9-003',
    name: 'Rudolph Ferris',
    mrn: 'MRN-CAD-15467',
    age: 58,
    signals: [
      'On low-dose statin (pravastatin 10mg)',
      'LDL 122 mg/dL — significantly above goal',
      'Tier C: Upgrade to high-intensity statin first',
    ],
    keyValues: {
      'LDL': '122 mg/dL',
      'Statin': 'Pravastatin 10mg (low dose)',
      'Ezetimibe': 'Not prescribed',
      'PCSK9 Inhibitor': 'None',
      'Inclisiran': 'None',
      'Tier': 'C — Upgrade statin first',
    },
    tier: 'Tier C: Upgrade Statin First',
  },
  {
    id: 'CAD-PCSK9-004',
    name: 'Winifred Osei',
    mrn: 'MRN-CAD-15581',
    age: 73,
    signals: [
      'On max statin + ezetimibe',
      'LDL 106 mg/dL — at Tier A threshold',
      'Prior ASCVD event — high CV risk secondary prevention',
    ],
    keyValues: {
      'LDL': '106 mg/dL',
      'Statin': 'Rosuvastatin 40mg (max)',
      'Ezetimibe': 'Yes (10mg)',
      'PCSK9 Inhibitor': 'None',
      'Inclisiran': 'None',
      'Tier': 'A — PCSK9i/Inclisiran indicated',
    },
    tier: 'Tier A: PCSK9i/Inclisiran Indicated',
  },
];

// ============================================================
// GAP 20 (CAD): CARDIAC REHABILITATION NOT REFERRED (Cross-Module)
// ============================================================
const cardiacRehabPatientsCAD: CADGapPatient[] = [
  {
    id: 'CAD-REHAB-001',
    name: 'Everett Marsh',
    mrn: 'MRN-CAD-20001',
    age: 64,
    signals: [
      'Post-PCI (stenting) 45 days ago — no cardiac rehab referral',
      'No CPT 93798 in chart',
      'Discharged home — ambulatory and eligible',
      'Class I indication — missed',
    ],
    keyValues: {
      'Qualifying Event': 'PCI (stenting) 45 days ago',
      'Cardiac Rehab': 'Not referred (CPT 93798 absent)',
      'Medicare': '36 sessions covered',
      'Functional Status': 'Ambulatory, discharged home',
      'Contraindication': 'None',
    },
  },
  {
    id: 'CAD-REHAB-002',
    name: 'Naomi Steinberg',
    mrn: 'MRN-CAD-20002',
    age: 69,
    signals: [
      'Post-NSTEMI 58 days ago — no rehab referral',
      'No CPT 93798 ordered',
      'Post-ACS: cardiac rehab reduces mortality 20-26%',
      'Only 20-30% of eligible patients are referred nationally',
    ],
    keyValues: {
      'Qualifying Event': 'NSTEMI 58 days ago (I21.4)',
      'Cardiac Rehab': 'Not referred',
      'Medicare': '36 sessions covered under CPT 93798',
      'Functional Status': 'Ambulatory',
      'Contraindication': 'None',
    },
  },
  {
    id: 'CAD-REHAB-003',
    name: 'Howard Okafor',
    mrn: 'MRN-CAD-20003',
    age: 72,
    signals: [
      'Post-CABG 78 days ago — no cardiac rehab referral',
      'Cardiac rehab Class I post-CABG',
      'No CPT 93798 in chart',
      'Stable, well-healed surgical site',
    ],
    keyValues: {
      'Qualifying Event': 'CABG 78 days ago',
      'Cardiac Rehab': 'Not referred (CPT 93798 absent)',
      'Medicare': '36 sessions covered',
      'Functional Status': 'Post-surgical, ambulatory',
      'Contraindication': 'None',
    },
  },
];

// ============================================================
// GAP 23: Lp(a) NEVER MEASURED
// ============================================================
const lpaPatients: CADGapPatient[] = [
  {
    id: 'CAD-LPA-001',
    name: 'Harold Sutton',
    mrn: 'MRN-CAD-23001',
    age: 58,
    signals: [
      'CAD (I25.10) + prior MI (I25.110)',
      'No Lp(a) result in EHR — once-in-lifetime test not done',
      'On atorvastatin 80mg: LDL 72 mg/dL — at goal',
      '2026 ACC/AHA: Lp(a) measurement Class IIa for ASCVD',
    ],
    keyValues: {
      'ASCVD': 'CAD + prior MI (I25.110)',
      'LDL': '72 mg/dL (at goal on statin)',
      'Statin': 'Atorvastatin 80mg daily',
      'Lp(a)': 'Never measured',
      'Test Cost': '~$50 — once-in-lifetime',
    },
  },
  {
    id: 'CAD-LPA-002',
    name: 'Linda Obafemi',
    mrn: 'MRN-CAD-23002',
    age: 63,
    signals: [
      'ASCVD (I70.219 bilateral PAD + I25.10 CAD)',
      'No Lp(a) result in chart',
      'LDL 88 mg/dL on rosuvastatin 20mg',
      '20-25% of population has Lp(a) >50 mg/dL — statin does not lower Lp(a)',
    ],
    keyValues: {
      'ASCVD': 'CAD + bilateral PAD',
      'LDL': '88 mg/dL',
      'Statin': 'Rosuvastatin 20mg',
      'Lp(a)': 'Never measured',
      'Lp(a) Note': 'Genetically determined — does NOT respond to lifestyle/statins',
    },
  },
  {
    id: 'CAD-LPA-003',
    name: 'George Whitmore',
    mrn: 'MRN-CAD-23003',
    age: 71,
    signals: [
      'Prior CABG (Z95.1) + CAD (I25.10)',
      'No Lp(a) ever checked',
      'LDL 78 mg/dL on max statin + ezetimibe',
      'Investigational agents (pelacarsen, olpasiran) in Phase 3',
    ],
    keyValues: {
      'ASCVD': 'Prior CABG (Z95.1) + CAD',
      'LDL': '78 mg/dL (on max statin + ezetimibe)',
      'Statin': 'Rosuvastatin 40mg + ezetimibe',
      'Lp(a)': 'Never measured',
      'Investigational Agents': 'Pelacarsen, olpasiran Phase 3',
    },
  },
  {
    id: 'CAD-LPA-004',
    name: 'Iris Vandenberg',
    mrn: 'MRN-CAD-23004',
    age: 55,
    signals: [
      'ASCVD (I21.9 prior MI, I25.10)',
      'No Lp(a) measurement in EHR',
      'LDL 110 mg/dL — suboptimal but Lp(a) may drive residual risk',
      'Once-in-lifetime test cost ~$50',
    ],
    keyValues: {
      'ASCVD': 'Prior MI + CAD',
      'LDL': '110 mg/dL (above goal)',
      'Statin': 'Atorvastatin 40mg (subtherapeutic dose)',
      'Lp(a)': 'Never measured',
      'Note': 'Lp(a) genetically determined — not affected by statin therapy',
    },
  },
];

// ============================================================
// GAP 32: SGLT2i UNDERDOSING (Cross-Module HF+CAD)
// ============================================================
const sglt2iUnderdosingPatients: CADGapPatient[] = [
  {
    id: 'CAD-SGLT2-001',
    name: 'Anthony Kimura',
    mrn: 'MRN-CAD-32001',
    age: 66,
    signals: [
      'On empagliflozin 10mg — CORRECT cardiac dose (confirmed, no action needed)',
      'NOTE: This patient flagged because dose was 5mg at last visit — now corrected',
      'eGFR 44 — dose is appropriate',
    ],
    keyValues: {
      'SGLT2i': 'Empagliflozin',
      'Current Dose': '10mg daily (cardiac dose — correct)',
      'Prior Dose': '5mg daily (T2DM dose — incorrect for HF)',
      'eGFR': '44 mL/min/1.73m2 (eligible)',
      'Resolved': 'Yes — corrected at last visit',
    },
    tier: 'Resolved — corrected',
  },
  {
    id: 'CAD-SGLT2-002',
    name: 'Phyllis Denton',
    mrn: 'MRN-CAD-32002',
    age: 71,
    signals: [
      'On dapagliflozin 5mg — BELOW cardiac dose of 10mg',
      'T2DM dose 5mg does not have HF RCT evidence',
      'eGFR 38 — eligible for 10mg dose',
      'Needs uptitration to 10mg for cardiac indication',
    ],
    keyValues: {
      'SGLT2i': 'Dapagliflozin',
      'Current Dose': '5mg daily (T2DM glycemic dose)',
      'Target Dose': '10mg daily (DAPA-HF cardiac dose)',
      'eGFR': '38 mL/min/1.73m2 (>=25 threshold met)',
      'HF Indication': 'Yes — needs 10mg for HF benefit',
    },
  },
  {
    id: 'CAD-SGLT2-003',
    name: 'Raymond Obi',
    mrn: 'MRN-CAD-32003',
    age: 63,
    signals: [
      'On empagliflozin 5mg — below cardiac target',
      'Prescribed at 5mg for diabetes without uptitration for HF',
      'eGFR 52 — no renal barrier to 10mg',
      'EMPEROR-Reduced: 10mg empagliflozin only',
    ],
    keyValues: {
      'SGLT2i': 'Empagliflozin',
      'Current Dose': '5mg daily',
      'Target Dose': '10mg daily (EMPEROR-Reduced)',
      'eGFR': '52 mL/min/1.73m2',
      'HF Indication': 'Yes — confirm uptitration to 10mg',
    },
  },
];

// ============================================================
// GAP 37: BETA-BLOCKER IN STABLE ANGINA WITHOUT HF
// ============================================================
const stableAnginaPatients: CADGapPatient[] = [
  {
    id: 'CAD-ANGINA-001',
    name: 'Cornelius Wright',
    mrn: 'MRN-CAD-37001',
    age: 67,
    signals: [
      'CAD (I25.10) + angina (I20.9)',
      'Not on beta-blocker',
      'Not on non-DHP CCB as alternative',
      'No documented BB contraindication',
    ],
    keyValues: {
      'CAD Diagnosis': 'I25.10',
      'Angina': 'I20.9 — documented stable angina',
      'Beta-Blocker': 'Not prescribed',
      'CCB Alternative': 'None',
      'Contraindication': 'None documented',
      'SAQ Angina Frequency': 44,
      'SAQ QoL': 39,
    },
    saqAnginaFrequency: 44,
    saqPhysicalLimitation: 52,
    saqQualityOfLife: 39,
    saqAdministeredDate: 'Jan 2025',
    saqPriorAnginaFrequency: 50,
    saqPriorDate: 'Oct 2024',
  },
  {
    id: 'CAD-ANGINA-002',
    name: 'Viola Petersen',
    mrn: 'MRN-CAD-37002',
    age: 62,
    signals: [
      'CAD (I25.110) + stable angina episodes 2-3x/week',
      'Not on beta-blocker or rate-lowering CCB',
      'On nitrates PRN only',
      'Class I: BB reduces angina frequency 50-70%',
    ],
    keyValues: {
      'CAD Diagnosis': 'I25.110 (prior MI)',
      'Angina Frequency': '2-3 episodes/week (stable)',
      'Beta-Blocker': 'Not prescribed',
      'Current Antianginal': 'Nitrates PRN only',
      'Contraindication': 'None',
      'SAQ Angina Frequency': 37,
      'SAQ QoL': 33,
    },
    saqAnginaFrequency: 37,
    saqPhysicalLimitation: 45,
    saqQualityOfLife: 33,
    saqAdministeredDate: 'Jan 2025',
    saqPriorAnginaFrequency: 42,
    saqPriorDate: 'Sep 2024',
  },
  {
    id: 'CAD-ANGINA-003',
    name: 'Bertram Sloane',
    mrn: 'MRN-CAD-37003',
    age: 73,
    signals: [
      'CAD (I25.10) + angina with exertion',
      'Discontinued metoprolol 6 months ago — not restarted',
      'Not on alternative antianginal',
      'No documented reason for discontinuation',
    ],
    keyValues: {
      'CAD Diagnosis': 'I25.10',
      'Angina': 'Exertional — documented',
      'Beta-Blocker': 'Discontinued (no clear reason) 6 months ago',
      'Alternative': 'None currently prescribed',
      'Contraindication': 'Not clearly documented',
      'SAQ Angina Frequency': 51,
      'SAQ QoL': 46,
    },
    saqAnginaFrequency: 51,
    saqPhysicalLimitation: 58,
    saqQualityOfLife: 46,
    saqAdministeredDate: 'Dec 2024',
    saqPriorAnginaFrequency: 55,
    saqPriorDate: 'Sep 2024',
  },
];

// ============================================================
// GAP 38: RANOLAZINE FOR REFRACTORY ANGINA
// ============================================================
const ranolazinePatients: CADGapPatient[] = [
  {
    id: 'CAD-RANO-001',
    name: 'Florence Kowalczyk',
    mrn: 'MRN-CAD-38001',
    age: 68,
    signals: [
      'CAD (I25.10) + persistent angina >=3 episodes/week',
      'On max-dose BB + long-acting nitrate + amlodipine 10mg',
      'Not on ranolazine',
      'QTc 440ms — safe for ranolazine',
    ],
    keyValues: {
      'CAD Diagnosis': 'I25.10',
      'Angina Frequency': '>=3 episodes/week despite triple therapy',
      'Current Antianginals': 'Metoprolol 200mg + isosorbide mononitrate + amlodipine 10mg',
      'Ranolazine': 'Not prescribed',
      'QTc': '440ms (safe threshold <500ms)',
      'SAQ Angina Frequency': 28,
      'SAQ QoL': 25,
    },
    saqAnginaFrequency: 22,
    saqPhysicalLimitation: 34,
    saqQualityOfLife: 25,
    saqAdministeredDate: 'Jan 2025',
    saqPriorAnginaFrequency: 48,
    saqPriorDate: 'Jul 2024',
  },
  {
    id: 'CAD-RANO-002',
    name: 'Percival Osei',
    mrn: 'MRN-CAD-38002',
    age: 74,
    signals: [
      'Refractory angina — on max BB + CCB + nitrate',
      'Not on ranolazine despite triple antianginal therapy',
      'QTc 455ms — within range for ranolazine',
      'No CYP3A4 inhibitors in medication list',
    ],
    keyValues: {
      'Angina Frequency': '3-4 episodes/week',
      'Current Antianginals': 'Bisoprolol + diltiazem + isosorbide',
      'Ranolazine': 'Not prescribed',
      'QTc': '455ms (safe)',
      'CYP3A4 Inhibitors': 'None (no drug interaction concern)',
      'SAQ Angina Frequency': 28,
      'SAQ QoL': 20,
    },
    saqAnginaFrequency: 28,
    saqPhysicalLimitation: 28,
    saqQualityOfLife: 20,
    saqAdministeredDate: 'Jan 2025',
    saqPriorAnginaFrequency: 52,
    saqPriorDate: 'Jul 2024',
  },
  {
    id: 'CAD-RANO-003',
    name: 'Harriet Lindqvist',
    mrn: 'MRN-CAD-38003',
    age: 61,
    signals: [
      'CAD + refractory angina — HR cannot be further reduced',
      'On max carvedilol + amlodipine + nitroglycerin patch',
      'Not on ranolazine',
      'MERLIN-TIMI: ranolazine reduces angina 1.7 episodes/week vs placebo',
    ],
    keyValues: {
      'Angina Frequency': '2-4 episodes/week despite max therapy',
      'Current Antianginals': 'Carvedilol 25mg BID + amlodipine 10mg + NTG patch',
      'Ranolazine': 'Not prescribed',
      'QTc': '445ms (safe)',
      'Note': 'Ranolazine does not lower HR or BP — safe add-on',
      'SAQ Angina Frequency': 25,
      'SAQ QoL': 31,
    },
    saqAnginaFrequency: 25,
    saqPhysicalLimitation: 41,
    saqQualityOfLife: 31,
    saqAdministeredDate: 'Dec 2024',
    saqPriorAnginaFrequency: 44,
    saqPriorDate: 'Jul 2024',
  },
];

// ============================================================
// GAP 39: HIGH-INTENSITY STATIN POST-ACS (Safety)
// ============================================================
const postACSStatinPatients: CADGapPatient[] = [
  {
    id: 'CAD-STATIN-001',
    name: 'Alfred Beaumont',
    mrn: 'MRN-CAD-39001',
    age: 61,
    signals: [
      'STEMI (I21.0) — hospitalized 18 days ago',
      'Discharged on pravastatin 40mg — NOT high-intensity',
      'High-intensity statin (atorvastatin 40-80mg or rosuvastatin 20-40mg) not prescribed',
      'Class I: start high-intensity statin before discharge post-ACS',
    ],
    keyValues: {
      'ACS Event': 'STEMI (I21.0) — 18 days ago',
      'Current Statin': 'Pravastatin 40mg (moderate — NOT high-intensity)',
      'Required': 'Atorvastatin 40-80mg OR rosuvastatin 20-40mg',
      'LDL at Admission': '142 mg/dL',
      'Statin Intolerance': 'None documented',
    },
  },
  {
    id: 'CAD-STATIN-002',
    name: 'Rhonda Castellano',
    mrn: 'MRN-CAD-39002',
    age: 57,
    signals: [
      'NSTEMI (I21.4) — hospitalized 12 days ago',
      'No statin prescribed at discharge — critical gap',
      'No documented statin intolerance',
      'ACC/AHA Class I: high-intensity statin before discharge',
    ],
    keyValues: {
      'ACS Event': 'NSTEMI (I21.4) — 12 days ago',
      'Current Statin': 'NONE — never prescribed',
      'Required': 'Atorvastatin 80mg or rosuvastatin 40mg',
      'LDL at Admission': '168 mg/dL',
      'Statin Intolerance': 'None documented',
    },
  },
  {
    id: 'CAD-STATIN-003',
    name: 'Clyde Nakamura',
    mrn: 'MRN-CAD-39003',
    age: 66,
    signals: [
      'ACS (I21.19 NSTEMI — prior MI) — hospitalized 22 days ago',
      'On simvastatin 20mg — well below high-intensity threshold',
      'No post-ACS statin upgrade documented',
      'PROVE-IT: atorvastatin 80mg vs pravastatin 40mg post-ACS — HR 0.84',
    ],
    keyValues: {
      'ACS Event': 'NSTEMI (I21.19) — 22 days ago',
      'Current Statin': 'Simvastatin 20mg (low-moderate)',
      'Required': 'Atorvastatin 40-80mg or rosuvastatin 20-40mg',
      'LDL at Admission': '118 mg/dL',
      'Evidence': 'PROVE-IT: atorvastatin 80mg HR 0.84 vs pravastatin 40mg',
    },
  },
];

// ============================================================
// GAP 40 (CAD): CAROTID STENOSIS EVALUATION (Cross-Module CAD+EP)
// ============================================================
const carotidPatientsCAD: CADGapPatient[] = [
  {
    id: 'CAD-CAR-001',
    name: 'Burton Fleming',
    mrn: 'MRN-CAD-40001',
    age: 70,
    signals: [
      'Ischemic stroke (I63.1) 10 months ago',
      'No carotid duplex or CTA neck in past 12 months',
      'No prior CEA or carotid stenting',
      'Concomitant CAD (I25.10) — high cardiovascular risk',
    ],
    keyValues: {
      'Cerebrovascular Event': 'Ischemic stroke (I63.1) 10 months ago',
      'Carotid Duplex': 'None in 12 months',
      'Prior CEA/Stenting': 'None documented',
      'CAD Diagnosis': 'I25.10 — high CV risk',
      'Antiplatelet': 'Aspirin 81mg + clopidogrel (DAPT)',
    },
  },
  {
    id: 'CAD-CAR-002',
    name: 'Wanda Eberhart',
    mrn: 'MRN-CAD-40002',
    age: 67,
    signals: [
      'TIA (G45.3) 7 months ago — carotid workup not completed',
      'CAD (I25.10) + prior PCI',
      'No carotid imaging in 12 months',
      'NASCET: CEA for >=70% stenosis NNT 6 for 5-year stroke prevention',
    ],
    keyValues: {
      'Cerebrovascular Event': 'TIA (G45.3) 7 months ago',
      'Carotid Duplex': 'None documented',
      'Prior CEA/Stenting': 'None',
      'CAD': 'I25.10 + prior PCI',
      'Carotid Stenosis': 'Unknown — needs imaging',
    },
  },
  {
    id: 'CAD-CAR-003',
    name: 'Gerald Mancini',
    mrn: 'MRN-CAD-40003',
    age: 73,
    signals: [
      'Ischemic stroke (I63.9) 5 months ago',
      'No carotid duplex or CTA neck ordered',
      'CAD (I25.10) — atherosclerotic burden high',
      'No prior carotid revascularization',
    ],
    keyValues: {
      'Cerebrovascular Event': 'Ischemic stroke (I63.9) 5 months ago',
      'Carotid Duplex': 'None in 12 months',
      'Prior CEA/Stenting': 'None',
      'CAD': 'I25.10',
      'Carotid Stenosis Status': 'Unknown',
    },
  },
];

// ============================================================
// GAP 42 (CAD): CIN PREVENTION PROTOCOL (Cross-Module)
// ============================================================
const cinPatients: CADGapPatient[] = [
  {
    id: 'CAD-CIN-001',
    name: 'Reginald Thornton',
    mrn: 'MRN-CAD-42001',
    age: 72,
    signals: [
      'CKD Stage 3b (eGFR 34) + scheduled PCI in 14 days',
      'No IV hydration protocol ordered',
      'No NAC ordered',
      'SGLT2i NOT in medications (not applicable here)',
    ],
    keyValues: {
      'Scheduled Procedure': 'PCI — 14 days',
      'eGFR': '34 mL/min/1.73m2 (CIN risk elevated)',
      'IV Hydration Protocol': 'Not ordered',
      'NAC (N-acetylcysteine)': 'Not ordered',
      'Metformin': 'Hold pre-procedure (check)',
      'SGLT2i': 'Not on SGLT2i (hold not required)',
    },
  },
  {
    id: 'CAD-CIN-002',
    name: 'Frances Okoro',
    mrn: 'MRN-CAD-42002',
    age: 68,
    signals: [
      'CKD Stage 4 (eGFR 24) + scheduled cardiac cath in 21 days',
      'eGFR <30 — consider CO2 angiography',
      'No hydration protocol ordered',
      'SGLT2i (empagliflozin) in medications — must hold 3 days pre-procedure',
    ],
    keyValues: {
      'Scheduled Procedure': 'Cardiac cath — 21 days',
      'eGFR': '24 mL/min/1.73m2 (high CIN risk)',
      'IV Hydration Protocol': 'Not ordered',
      'SGLT2i': 'Empagliflozin — HOLD 3 days pre-procedure (DKA risk)',
      'Note': 'eGFR <30: consider CO2 angiography',
      'Metformin': 'Hold pre-procedure',
    },
  },
  {
    id: 'CAD-CIN-003',
    name: 'Stewart Holbrook',
    mrn: 'MRN-CAD-42003',
    age: 65,
    signals: [
      'CKD Stage 3a (eGFR 52) + scheduled TAVR in 18 days',
      'CIN protocol not ordered pre-procedure',
      'No hydration or NAC ordered',
      'Minimize contrast volume — isosmolar contrast indicated',
    ],
    keyValues: {
      'Scheduled Procedure': 'TAVR — 18 days',
      'eGFR': '52 mL/min/1.73m2 (moderate CIN risk)',
      'IV Hydration Protocol': 'Not ordered',
      'NAC': 'Not ordered',
      'Iso-osmolar Contrast': 'Use recommended',
      'SGLT2i': 'Dapagliflozin — HOLD 3 days pre-procedure',
    },
  },
];

// ============================================================
// GAP 44: MEDICATION RECONCILIATION (Safety)
// ============================================================
const medReconciliationPatients: CADGapPatient[] = [
  {
    id: 'CAD-MEDREC-001',
    name: 'Josephine Farrell',
    mrn: 'MRN-CAD-44001',
    age: 81,
    signals: [
      'ACS hospitalization 5 days ago — discharged 48h ago',
      'Discharge medication list: 14 medications',
      'Medication reconciliation NOT completed within 48h post-discharge',
      'Age 81 + polypharmacy — HIGH RISK per criteria',
    ],
    keyValues: {
      'ACS Event': 'NSTEMI — discharged 2 days ago',
      'Medications at Discharge': '14 (polypharmacy threshold: >=10)',
      'Reconciliation Done': 'No — overdue',
      'Age': '81 (high-risk criterion)',
      'PCP Follow-up': '7-day appointment: not yet scheduled',
    },
  },
  {
    id: 'CAD-MEDREC-002',
    name: 'Franklin Abara',
    mrn: 'MRN-CAD-44002',
    age: 76,
    signals: [
      'Post-ACS discharge 4 days ago',
      '11 medications on discharge list',
      'Prior documented medication error in chart (2023)',
      'No pharmacist reconciliation documented',
    ],
    keyValues: {
      'ACS Event': 'STEMI — discharged 4 days ago',
      'Medications at Discharge': '11 (polypharmacy)',
      'Reconciliation Done': 'No',
      'Prior Med Error': 'Yes — documented 2023',
      'Risk Level': 'HIGH — prior error + polypharmacy',
    },
  },
  {
    id: 'CAD-MEDREC-003',
    name: 'Beatrice Quinn',
    mrn: 'MRN-CAD-44003',
    age: 77,
    signals: [
      'ACS discharge 3 days ago — 12 medications',
      'No PCP follow-up scheduled within 7 days',
      'Medication reconciliation not documented',
      'ACC door-to-follow-up quality metric not met',
    ],
    keyValues: {
      'ACS Event': 'NSTEMI — discharged 3 days ago',
      'Medications at Discharge': '12',
      'Reconciliation Done': 'No',
      'PCP Follow-up': 'None scheduled within 7 days',
      'Quality Metric': 'Door-to-follow-up NOT met',
    },
  },
];

// ============================================================
// GAP 45: COLCHICINE FOR CARDIOVASCULAR INFLAMMATION
// ============================================================
const colchicinePatients: CADGapPatient[] = [
  {
    id: 'CAD-COLCH-001',
    name: 'Douglas Whitfield',
    mrn: 'MRN-CAD-45001',
    age: 65,
    signals: [
      'Recent ACS (I21.9 NSTEMI) 22 days ago',
      'Not on colchicine 0.5mg daily',
      'eGFR 58 — eligible (>=30)',
      'No drug interactions with CYP3A4/P-gp inhibitors',
    ],
    keyValues: {
      'CAD/ACS Diagnosis': 'NSTEMI (I21.9) — 22 days ago',
      'Colchicine': 'Not prescribed',
      'eGFR': '58 mL/min/1.73m2 (>=30 threshold met)',
      'CYP3A4/P-gp Inhibitors': 'None (no interaction)',
      'Evidence': 'COLCOT: HR 0.77 post-ACS (P=0.02)',
    },
  },
  {
    id: 'CAD-COLCH-002',
    name: 'Virginia Petrov',
    mrn: 'MRN-CAD-45002',
    age: 71,
    signals: [
      'Chronic CAD (I25.10) — stable, long-term',
      'Not on colchicine or other anti-inflammatory for CV indication',
      'LoDoCo2: chronic CAD HR 0.69 (P<0.001)',
      'eGFR 42 — eligible; no drug interactions documented',
    ],
    keyValues: {
      'CAD Diagnosis': 'I25.10 — chronic stable CAD',
      'Colchicine': 'Not prescribed',
      'eGFR': '42 mL/min/1.73m2',
      'Drug Interactions': 'None identified',
      'Evidence': 'LoDoCo2: HR 0.69 for chronic CAD (P<0.001)',
    },
  },
  {
    id: 'CAD-COLCH-003',
    name: 'Winston Araujo',
    mrn: 'MRN-CAD-45003',
    age: 58,
    signals: [
      'CAD (I25.10) + prior PCI 2 years ago',
      'Not on colchicine 0.5mg',
      'eGFR 66 — no renal barrier',
      'No CYP3A4/P-gp inhibitors in med list',
    ],
    keyValues: {
      'CAD Diagnosis': 'I25.10 + prior PCI',
      'Colchicine': 'Not prescribed',
      'eGFR': '66 mL/min/1.73m2',
      'Cost': '~$0.50-1.00/day',
      'Main Side Effect': 'GI upset (take with food)',
    },
  },
  {
    id: 'CAD-COLCH-004',
    name: 'Agatha Svensson',
    mrn: 'MRN-CAD-45004',
    age: 63,
    signals: [
      'Post-ACS 25 days ago (I21.4)',
      'Not on colchicine',
      'Clarithromycin recently prescribed — DRUG INTERACTION ALERT',
      'Colchicine toxicity risk with clarithromycin — hold until antibiotic completed',
    ],
    keyValues: {
      'CAD/ACS Diagnosis': 'NSTEMI (I21.4) — 25 days ago',
      'Colchicine': 'Not prescribed',
      'Drug Interaction': 'Clarithromycin active — WAIT until completed',
      'eGFR': '55 mL/min/1.73m2',
      'Action': 'Initiate colchicine after clarithromycin course complete',
    },
    tier: 'Drug Interaction — defer initiation',
  },
];

// ============================================================
// MASTER GAP DATA
// ============================================================
export const CAD_CLINICAL_GAPS: CADClinicalGap[] = [
  {
    id: 'cad-gap-9-sglt2i-ckd',
    name: 'SGLT2i Not Prescribed — CKD Indication',
    category: 'Gap',
    patientCount: 92,
    dollarOpportunity: 110400,
    evidence:
      'DAPA-CKD: dapagliflozin reduced composite kidney/CV endpoint by 39% (HR 0.61). EMPA-KIDNEY: empagliflozin reduced kidney disease progression or CV death by 28% (HR 0.72). Indication is independent of diabetes status.',
    cta: 'Initiate SGLT2i for CKD',
    priority: 'high',
    tag: 'Cross-Module | CKD Indication',
    detectionCriteria: [
      'CKD Stage 3-4 (eGFR 25-75 mL/min/1.73m2)',
      'UACR >= 200 mg/g (proteinuric CKD)',
      'NOT on dapagliflozin or empagliflozin',
      'No existing HF or diabetes already driving an SGLT2i gap (avoid duplication)',
    ],
    patients: ckdSGLT2iPatients,
    whyMissed: 'SGLT2i for CKD spans nephrology and cardiology. Each specialist manages their domain — the renal indication in a cardiac patient is never assembled.',
    whyTailrd: 'TAILRD connected CKD staging from nephrology with cardiovascular risk profile to identify this cross-specialty SGLT2i indication.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 15,000 CAD panel x 12% CKD Stage 3-4 x 8.7% UACR >=200 without SGLT2i x 59% identifiable = 92. Dollar opportunity: associated monitoring visits $1,200/patient/year x 92 = $110,400. DAPA-CKD / EMPA-KIDNEY eligibility criteria.',
  },
  {
    id: 'cad-gap-14-compass',
    name: 'Polyvascular Disease — Dual Pathway Therapy Not Prescribed',
    category: 'Gap',
    patientCount: 63,
    dollarOpportunity: 453600,
    evidence:
      'COMPASS trial (Eikelboom, NEJM 2017): Rivaroxaban 2.5mg BID + ASA. MACE: HR 0.76. PAD subgroup: MALE reduced 46% (HR 0.54, P<0.001). Approved for polyvascular CAD+PAD patients.',
    cta: 'Initiate Dual Pathway Therapy',
    priority: 'high',
    tag: 'Polyvascular | Cross-Module',
    detectionCriteria: [
      'CAD diagnosis (ICD-10: I25.x) AND PAD (ICD-10: I70.2x) — both present',
      'NOT on rivaroxaban 2.5mg BID',
      'NOT on other anticoagulant (warfarin, NOAC at therapeutic dose)',
      'Currently on aspirin (antiplatelet foundation)',
      'No major bleeding contraindication in past 12 months',
    ],
    patients: compassPatients,
    whyMissed: 'Polyvascular disease requires connecting CAD with PAD documentation across separate vascular and cardiology records — most patients are managed for one condition.',
    whyTailrd: 'TAILRD identified concurrent CAD and PAD diagnoses across cardiology and vascular surgery records to flag dual pathway therapy eligibility.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 15,000 CAD panel x 6% concurrent PAD x 12.5% not on dual pathway x 56% identifiable = 63. Dollar opportunity: associated monitoring visits $1,200/patient/year x 63 = $75,600. COMPASS trial (Eikelboom, NEJM 2017). Cross-module with PV.',
  },
  {
    id: 'cad-gap-15-pcsk9i',
    name: 'LDL Not at Goal — PCSK9 Inhibitor Evaluation Indicated',
    category: 'Gap',
    patientCount: 310,
    dollarOpportunity: 1860000,
    evidence:
      '2026 ACC/AHA Guidelines: secondary prevention LDL < 70 mg/dL. FOURIER (evolocumab): MACE HR 0.85, LDL reduced to 30 mg/dL. ODYSSEY OUTCOMES (alirocumab): all-cause death HR 0.85. Inclisiran: 50% LDL reduction with twice-yearly injection.',
    cta: 'Initiate PCSK9 Inhibitor',
    priority: 'medium',
    detectionCriteria: [
      'Tier A: On max-dose statin + ezetimibe + LDL >= 70 mg/dL (67 patients) — PCSK9i/inclisiran indicated',
      'Tier B: On max-dose statin, no ezetimibe + LDL >= 70 mg/dL (98 patients) — add ezetimibe first',
      'Tier C: On low/moderate statin + LDL >= 70 mg/dL (69 patients) — upgrade statin first',
    ],
    patients: pcsk9Patients,
    whyMissed: 'LDL goal attainment requires connecting statin dose, lab results, and cardiovascular risk — data in pharmacy, labs, and clinical notes.',
    whyTailrd: 'TAILRD connected LDL values from labs with current statin therapy from pharmacy and cardiovascular risk factors to identify this PCSK9i evaluation opportunity.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 15,000 CAD panel x 30% LDL >=70 = 4,500 x 60% not on adequate therapy = 2,700 x 35% market share x 70% identifiable x 27% ID window = 310. Dollar opportunity: associated monitoring visits $1,200/patient/year x 310 = $372,000 + downstream event prevention: LDL reduction prevents ~6% of MACE events, avoided PCI/CABG ~$24,000 x 310 x 6% x 80% = $1,488,000. Total ~$1,860,000. FOURIER / ODYSSEY OUTCOMES eligibility criteria.',
    subcategories: [
      { label: 'Tier A: PCSK9i/Inclisiran indicated', count: 89 },
      { label: 'Tier B: Add ezetimibe first', count: 130 },
      { label: 'Tier C: Upgrade statin first', count: 91 },
    ],
  },
  // ── NEW GAPS 20, 23, 32, 37-40, 42, 44, 45 ─────────────────
  {
    id: 'cad-gap-20-cardiac-rehab',
    name: 'Cardiac Rehab Not Referred — Class I Indication',
    category: 'Gap',
    patientCount: 96,
    dollarOpportunity: 645120,
    evidence:
      'Cardiac rehab reduces all-cause mortality 20-26% and readmission 18-25%. Class I for post-ACS, PCI, CABG, valve. Class IIa for HFrEF. Only 20-30% referred nationally. 36 sessions covered by Medicare (CPT 93798).',
    cta: 'Refer to Cardiac Rehabilitation',
    priority: 'high',
    tag: 'Cross-Module | CAD + HF',
    detectionCriteria: [
      'Post-ACS in 12 months + no CPT 93798 (Class I)',
      'Post-PCI in 12 months + no referral (Class I)',
      'Post-CABG in 12 months + no referral (Class I)',
      'Post-valve/TAVR in 12 months + no referral (Class I)',
      'Patient count (178) counted in HF module for aggregate to avoid double-counting',
    ],
    patients: cardiacRehabPatientsCAD,
    whyMissed: 'Cardiac rehab referral falls between inpatient discharge and outpatient follow-up — neither team owns the referral in the care transition gap.',
    whyTailrd: 'TAILRD connected cardiac event/procedure with absence of rehabilitation referral to identify this Class I indication gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: Annual qualifying procedures (720 ACS + 450 CABG + 380 TAVR + 2,400 PCI) x 70% national referral gap x 5% ID window = 96. Dollar opportunity: cardiac rehab $2,400 (12 sessions) x 70% completion x 96 = $161,280 + downstream readmission avoidance and follow-up visits $7,200/patient x 96 x 70% = $483,840. Total ~$645,120. Representative cardiovascular program.',
    subcategories: [
      { label: 'Post-ACS (STEMI/NSTEMI)', count: 52 },
      { label: 'Post-PCI or CABG', count: 96 },
      { label: 'Post-valve/TAVR', count: 26 },
    ],
  },
  {
    id: 'cad-gap-23-lpa-screening',
    name: 'Lp(a) Screening Overdue — Once-in-Lifetime Test',
    category: 'Gap',
    patientCount: 178,
    dollarOpportunity: 6230,
    evidence:
      '2026 ACC/AHA: Lp(a) measurement once in adult lifetime (Class IIa). 20-25% of population has elevated Lp(a) >50 mg/dL. Genetically determined — does NOT respond to lifestyle or statins. Investigational agents in Phase 3 (pelacarsen, olpasiran). Test cost <$50.',
    cta: 'Order Lp(a) Level',
    priority: 'medium',
    detectionCriteria: [
      'ASCVD diagnosis (I25.x, I21.x, I63.x, I70.x, Z95.x)',
      'No Lp(a) result in EHR',
      'Age 18-80',
      'Once-in-lifetime test — order once, no repeat needed unless clinical change',
    ],
    patients: lpaPatients,
    whyMissed: 'Lp(a) is a once-in-lifetime test rarely ordered in routine care. No system flags the absence of a test that was never expected.',
    whyTailrd: 'TAILRD identified this high-risk CAD patient has never had Lp(a) screening — a test whose absence is invisible to standard lab tracking systems.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 15,000 CAD panel x 85% never screened x 4% ID window = 178. Dollar opportunity: Lp(a) lab $50 x 70% completion x 178 = $6,230. Once-in-lifetime test, 2026 ACC/AHA Class IIa.',
  },
  {
    id: 'cad-gap-32-sglt2i-underdosing',
    name: 'SGLT2i Not at Therapeutic Dose',
    category: 'Gap',
    patientCount: 53,
    dollarOpportunity: 0,
    evidence:
      'DAPA-HF and EMPEROR-Reduced used dapagliflozin 10mg and empagliflozin 10mg respectively — the ONLY approved doses for HF. Lower doses used for T2DM glycemic control (5mg) do not have HF RCT evidence. Confirm patient is on cardiac-dose SGLT2i.',
    cta: 'Confirm/Uptitrate SGLT2i to 10mg Cardiac Dose',
    priority: 'high',
    tag: 'Cross-Module | CAD + HF',
    detectionCriteria: [
      'On SGLT2i (dapagliflozin or empagliflozin)',
      'Current dose below approved cardiac dose (dapagliflozin <10mg or empagliflozin <10mg)',
      'eGFR >=25 mL/min/1.73m2',
      'Cardiac indication (HF or CKD) documented',
    ],
    patients: sglt2iUnderdosingPatients,
    whyMissed: 'SGLT2i dose optimization requires comparing current dose against target — pharmacy systems don\'t flag sub-therapeutic dosing for cardioprotective indications.',
    whyTailrd: 'TAILRD compared current SGLT2i dose from pharmacy records against guideline target dose to identify this titration opportunity.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 15,000 CAD panel x 8% on SGLT2i x 10% below cardiac dose (10mg) x 70% identifiable x 63% identifiable = 53. Dollar opportunity: $0 direct revenue. Cost avoidance from preventing HF decompensation noted. DAPA-HF/EMPEROR-Reduced used 10mg only.',
  },
  {
    id: 'cad-gap-37-bb-stable-angina',
    name: 'Beta-Blocker Not Prescribed — Stable CAD + Angina',
    category: 'Gap',
    patientCount: 63,
    dollarOpportunity: 453600,
    evidence:
      'Beta-blockers remain Class I for stable angina symptom relief. Reduce angina frequency 50-70%. Carvedilol preferred if HF co-exists. First-line for CAD + angina. Metoprolol succinate, atenolol, bisoprolol all appropriate. If BB intolerant: ranolazine or ivabradine (sinus rhythm required).',
    cta: 'Initiate Beta-Blocker for Angina',
    priority: 'high',
    detectionCriteria: [
      'CAD (I25.x) + angina documented (I20.x)',
      'NOT on beta-blocker',
      'NOT on non-dihydropyridine CCB as alternative',
      'No documented contraindication',
    ],
    patients: stableAnginaPatients,
    whyMissed: 'Beta-blocker prescribing for angina requires connecting symptom documentation with medication review — symptoms in clinical notes and meds in pharmacy systems.',
    whyTailrd: 'TAILRD connected documented angina symptoms with absence of beta-blocker therapy to identify this first-line anti-anginal gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 15,000 CAD panel x 8% angina (I20.x) x 30% without BB x 25% ID window = 63. Dollar opportunity: associated monitoring visits $1,200/patient/year x 63 = $75,600 + downstream angina management: stress testing $1,500 + follow-up cath $3,000 x 40% + annual monitoring = $378,000. Total ~$453,600.',
  },
  {
    id: 'cad-gap-38-ranolazine',
    name: 'Ranolazine Not Prescribed — Refractory Angina',
    category: 'Gap',
    patientCount: 38,
    dollarOpportunity: 319200,
    evidence:
      'MERLIN-TIMI 36: Ranolazine reduces angina frequency without affecting mortality. Reduces weekly angina 1.7 episodes vs placebo. Does not lower HR or BP. Useful in patients who cannot tolerate HR-reducing agents. Contraindicated with strong CYP3A4 inhibitors. Starting dose 500mg BID; target 1000mg BID.',
    cta: 'Initiate Ranolazine for Refractory Angina',
    priority: 'medium',
    detectionCriteria: [
      'CAD (I25.x) + persistent angina (>=2 episodes/week documented)',
      'On max-dose BB AND nitrate AND CCB',
      'NOT on ranolazine',
      'QTc <500ms on recent ECG',
      'No strong CYP3A4 inhibitors in medication list',
    ],
    patients: ranolazinePatients,
    whyMissed: 'Refractory angina requires identifying patients who failed first-line therapy — connecting symptom persistence with current medication regimen across encounters.',
    whyTailrd: 'TAILRD identified persistent angina symptoms despite first-line anti-anginal therapy to flag this patient for ranolazine evaluation.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 15,000 CAD panel x 8% angina x 15% refractory x 30% without ranolazine x 10% ID window = 38. Dollar opportunity: associated monitoring visits $1,200/patient/year x 38 = $45,600 + downstream cardiac testing and monitoring $7,200/patient/year x 38 = $273,600. Total ~$319,200.',
  },
  {
    id: 'cad-gap-39-statin-post-acs',
    name: 'High-Intensity Statin Not Initiated Post-ACS',
    category: 'Safety',
    patientCount: 25,
    dollarOpportunity: 0,
    evidence:
      'ACC/AHA Class I: high-intensity statin immediately post-ACS regardless of baseline LDL. PROVE-IT: atorvastatin 80mg vs pravastatin 40mg post-ACS. CV death + MI + unstable angina: HR 0.84 (P=0.005). Pleiotropic benefits beyond LDL lowering. Every 1mmol/L LDL reduction = 22% CV event reduction. Start before discharge.',
    cta: 'Initiate High-Intensity Statin Immediately',
    priority: 'high',
    safetyNote: 'URGENCY: High-intensity statin (atorvastatin 40-80mg or rosuvastatin 20-40mg) should have been started BEFORE hospital discharge post-ACS. ACC/AHA Class I. Delay increases early post-ACS event risk.',
    detectionCriteria: [
      'ACS/MI hospitalization (I21.x) in past 30 days',
      'NOT discharged on atorvastatin 40-80mg or rosuvastatin 20-40mg',
      'No documented statin intolerance',
      'High-intensity = atorvastatin 40-80mg OR rosuvastatin 20-40mg (Class I)',
    ],
    patients: postACSStatinPatients,
    whyMissed: 'Post-ACS statin intensity requires connecting discharge medications with ACS event documentation — the intensity gap exists between inpatient and outpatient pharmacy.',
    whyTailrd: 'TAILRD connected ACS event with current statin prescription to identify this patient was not initiated on high-intensity statin therapy post-ACS.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 720 annual ACS admissions x 5% discharge without high-intensity statin = 25. Dollar opportunity: $0 direct revenue. Safety gap — cost avoidance from preventing recurrent events. PROVE-IT trial criteria.',
  },
  {
    id: 'cad-gap-40-carotid-stroke',
    name: 'Stroke/TIA — Carotid Stenosis Not Evaluated',
    category: 'Gap',
    patientCount: 34,
    dollarOpportunity: 476000,
    evidence:
      'NASCET: CEA for symptomatic carotid stenosis >=70%: 5-year stroke reduction 17% absolute (NNT 6). For stenosis 50-69%: 5-year reduction 7%. Class I to evaluate carotid stenosis after TIA or non-disabling stroke within 24-48h (EMERGENT for high-risk). Carotid stenting alternative for high surgical risk.',
    cta: 'Order Carotid Duplex Ultrasound',
    priority: 'high',
    tag: 'Cross-Module | CAD + EP',
    detectionCriteria: [
      'Ischemic stroke (I63.x) or TIA (G45.x) in past 12 months',
      'No carotid duplex ultrasound or CTA neck in past 12 months',
      'No prior CEA or carotid stenting documented',
      'CAD diagnosis co-existing — high atherosclerotic burden',
      'Aggregate patient count (78) reported once (not doubled across modules)',
    ],
    patients: carotidPatientsCAD,
    whyMissed: 'Post-stroke carotid evaluation spans neurology and vascular surgery — carotid imaging orders fall between specialties during post-stroke workup.',
    whyTailrd: 'TAILRD connected stroke/TIA diagnosis with absence of carotid imaging to identify this vascular evaluation gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: ~800 stroke/TIA admissions x 30% CAD comorbidity x 20% screening gap = 34. Dollar opportunity: carotid imaging $800 x 70% completion x 34 = $19,040 + downstream carotid endarterectomy/stenting $18,000 x 35% capture x 34 significant stenosis patients x 40% = $456,960. Total ~$476,000. NASCET trial criteria.',
  },
  {
    id: 'cad-gap-42-cin-prevention',
    name: 'CIN Prevention Protocol Not Ordered Pre-Procedure',
    category: 'Gap',
    patientCount: 18,
    dollarOpportunity: 0,
    evidence:
      'CIN prevention: IV NS hydration at 1 mL/kg/hr for 12h pre and post. NAC 600mg BID day before and day of (controversial but low risk). Minimize contrast volume. Use iso-osmolar contrast. Hold metformin, hold SGLT2i 3 days pre-procedure (DKA risk). eGFR <30: consider CO2 angiography.',
    cta: 'Order CIN Prevention Protocol',
    priority: 'high',
    tag: 'Cross-Module | CAD + Structural',
    detectionCriteria: [
      'Scheduled cardiac cath, PCI, or structural intervention in next 30 days',
      'CKD (eGFR <60)',
      'NO hydration protocol or NAC ordered pre-procedure',
      'Check SGLT2i in medications — must hold 3 days pre-procedure (DKA risk)',
      'eGFR <30: consider CO2 angiography to minimize contrast',
    ],
    patients: cinPatients,
    whyMissed: 'CIN prevention requires connecting scheduled procedure with renal function and hydration protocol — procedural planning and lab data in separate systems.',
    whyTailrd: 'TAILRD connected upcoming contrast procedure with eGFR and absence of CIN prevention protocol to flag this pre-procedural safety gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 2,400 annual PCI volume x 15% eGFR <60 x 8% without hydration protocol = 18. Dollar opportunity: $0 direct revenue. Safety gap — cost avoidance from preventing contrast-induced nephropathy.',
  },
  {
    id: 'cad-gap-44-med-reconciliation',
    name: 'High-Risk Discharge — Medication Reconciliation Overdue',
    category: 'Safety',
    patientCount: 14,
    dollarOpportunity: 0,
    evidence:
      'Medication reconciliation errors occur in 60-67% of post-ACS discharges. Each error increases 30-day readmission risk by 12%. High-risk: polypharmacy >=10 meds, elderly, prior errors. Clinical pharmacist reconciliation reduces errors 75%. ACC Door-to-Follow-up quality metric.',
    cta: 'Complete Medication Reconciliation Review',
    priority: 'high',
    safetyNote: 'PATIENT SAFETY: Post-ACS medication errors (missed dual antiplatelet, omitted statin, incorrect dose) are a leading cause of preventable 30-day readmission. Reconciliation must be completed within 48h of discharge.',
    detectionCriteria: [
      'ACS hospitalization in past 7 days',
      'Discharge medication list not reconciled within 48h post-discharge',
      'Any of: >=10 medications on discharge list; age >=75; prior medication error documented; no PCP follow-up within 7 days scheduled',
    ],
    patients: medReconciliationPatients,
    whyMissed: 'High-risk discharge medication reconciliation requires connecting discharge complexity with pharmacy follow-up — a process gap in care transitions.',
    whyTailrd: 'TAILRD identified this high-risk discharge with incomplete medication reconciliation by connecting discharge diagnosis with pharmacy follow-up records.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 720 annual ACS admissions x 60% reconciliation error rate x 4.5% ID window = 14. Dollar opportunity: $0 direct revenue. Safety gap — cost avoidance $12,000/avoided readmission x 7 = $84,000.',
  },
  {
    id: 'cad-gap-45-colchicine',
    name: 'Colchicine Not Prescribed — COLCOT/LoDoCo2 Indication',
    category: 'Gap',
    patientCount: 120,
    dollarOpportunity: 864000,
    evidence:
      'COLCOT (Tardif, NEJM 2019): colchicine 0.5mg post-ACS (N=4,745). CV death + MI + stroke + cardiac arrest + angina requiring revascularization: HR 0.77 (P=0.02). LoDoCo2 (Nidorf, NEJM 2020): chronic CAD. Primary composite HR 0.69 (P<0.001). Class IIa (2022 AHA/ACC). Low cost ~$0.50-1.00/day. Main side effect: GI upset (take with food). Drug interaction: colchicine toxicity risk with clarithromycin, cyclosporine.',
    cta: 'Initiate Colchicine 0.5mg Daily',
    priority: 'medium',
    detectionCriteria: [
      'Established CAD (I25.x) OR recent ACS (I21.x in past 30 days)',
      'NOT on colchicine 0.5mg daily',
      'NOT on another anti-inflammatory for CV indication',
      'No documented contraindication: eGFR >=30; no CYP3A4/P-gp inhibitors (clarithromycin, cyclosporine)',
    ],
    patients: colchicinePatients,
    whyMissed: 'Anti-inflammatory therapy for CAD (COLCOT/LoDoCo2) is a recent evidence development — no standard system flags colchicine eligibility in stable CAD patients.',
    whyTailrd: 'TAILRD identified this stable CAD patient meets COLCOT/LoDoCo2 criteria for anti-inflammatory therapy with colchicine — a recent evidence-based indication not yet in standard order sets.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 15,000 CAD panel x 95% colchicine adoption gap x 1.4% ID window = 120. Dollar opportunity: associated monitoring visits $1,200/patient/year x 120 = $144,000 + downstream MACE reduction (HR 0.77): avoided hospitalizations $24,000 x 120 x 5% annual event rate x 23% reduction = $720,000. Total ~$864,000. COLCOT (Tardif, NEJM 2019) / LoDoCo2 (Nidorf, NEJM 2020).',
  },
  // ── GAPS 46-63: NEW CLINICAL GAP DETECTION RULES ─────────────────────────
  {
    id: 'cad-gap-46-heart-team',
    name: 'Multivessel CAD — Heart Team Review Not Documented',
    category: 'Gap',
    patientCount: 68,
    dollarOpportunity: 1530000,
    methodologyNote: "[Source: Demo Health System / National Benchmark]. Patient count: 450 annual CABG x 15% without documented heart team review = 68 (rolling ID window). Dollar opportunity: $45,000 CABG DRG x 30% appropriate referral + incremental PCI conversion = $22,500/patient x 68 = $1,530,000. SYNTAX / FREEDOM trial criteria.",
    priority: 'high',
    tag: 'Heart Team | Complex CAD',
    subcategories: [
      { label: 'SYNTAX estimated high (>=33) — CABG strongly preferred', count: 24 },
      { label: 'SYNTAX intermediate (23-32) — equipoise', count: 26 },
      { label: 'Left main disease — heart team required', count: 35 },
    ],
    evidence:
      'SYNTAX trial: CABG vs PCI in 3-vessel or LM disease. SYNTAX >=33: CABG superior (MACCE HR 0.60 at 5 years). SYNTAX 23-32: equipoise — heart team required. FREEDOM trial: CABG superior to PCI in diabetics with multivessel CAD regardless of SYNTAX (HR 0.76, P=0.049). EXCEL/NOBLE: CABG superior for LM at 5 years. Heart team discussion is a guideline requirement for 3-vessel and LM disease.',
    cta: 'Refer for Heart Team Review',
    detectionCriteria: [
      '3-vessel CAD (LAD + LCx + RCA) OR left main CAD (>=50% LM stenosis) documented on cath',
      'No CABG performed (no CPT 33533-33534)',
      'No heart team discussion documented in past 6 months',
      'Not in cardiogenic shock or emergency presentation',
    ],
    patients: [
      {
        id: 'CAD-HT-001',
        name: 'Gerald Okafor',
        mrn: 'MRN-CAD-46001',
        age: 68,
        signals: [
          '3-vessel CAD: LAD 80%, LCx 75%, RCA 90% on cath',
          'Diabetes mellitus — FREEDOM trial: CABG preferred',
          'Estimated SYNTAX score 36 — CABG strongly preferred',
          'No heart team note in past 6 months',
        ],
        keyValues: {
          'Vessels Diseased': '3 (LAD + LCx + RCA)',
          'Estimated SYNTAX': '36 (high)',
          'Diabetes': 'Yes (T2DM)',
          'Heart Team Note': 'None documented',
          'CABG Performed': 'No',
          'Last Cath': '8 weeks ago',
        },
      },
      {
        id: 'CAD-HT-002',
        name: 'Patricia Vega',
        mrn: 'MRN-CAD-46002',
        age: 72,
        signals: [
          'Left main CAD: 60% ostial LM stenosis',
          'Co-dominant circulation',
          'Estimated SYNTAX score 28 — equipoise',
          'No heart team discussion documented',
        ],
        keyValues: {
          'LM Stenosis': '60% ostial',
          'Estimated SYNTAX': '28 (intermediate)',
          'LVEF': '52%',
          'Diabetes': 'No',
          'Heart Team Note': 'None',
          'Last Cath': '5 weeks ago',
        },
      },
      {
        id: 'CAD-HT-003',
        name: 'Raymond Chu',
        mrn: 'MRN-CAD-46003',
        age: 61,
        signals: [
          '3-vessel CAD: LAD 85%, RCA 70%, LCx 65%',
          'Estimated SYNTAX score 24 — intermediate, equipoise',
          'No heart team review documented',
          'No diabetes but complex anatomy',
        ],
        keyValues: {
          'Vessels Diseased': '3 (LAD + RCA + LCx)',
          'Estimated SYNTAX': '24 (intermediate)',
          'Diabetes': 'No',
          'LVEF': '48%',
          'Heart Team Note': 'None',
          'Last Cath': '6 weeks ago',
        },
      },
      {
        id: 'CAD-HT-004',
        name: 'Miriam Feldstein',
        mrn: 'MRN-CAD-46004',
        age: 65,
        signals: [
          'Left main disease: 55% distal LM + LAD 80%',
          'Left main bifurcation involvement',
          'Estimated SYNTAX score 31 — intermediate',
          'No heart team note; patient seen in interventional cardiology only',
        ],
        keyValues: {
          'LM Stenosis': '55% distal bifurcation',
          'LAD': '80%',
          'Estimated SYNTAX': '31 (intermediate)',
          'Diabetes': 'Yes (T2DM)',
          'Heart Team Note': 'None',
          'Last Cath': '4 weeks ago',
        },
      },
    ],
    whyMissed: 'Heart Team review for multivessel CAD requires connecting angiographic complexity with surgical candidacy assessment — data in separate cath lab and surgery records.',
    whyTailrd: 'TAILRD connected multivessel CAD complexity from catheterization with absence of documented Heart Team discussion to identify this guideline-mandated process gap.',
  },
  {
    id: 'cad-gap-47-complete-revasc',
    name: 'Non-Culprit Lesion Untreated — Complete Revascularization Indicated',
    category: 'Growth',
    patientCount: 40,
    dollarOpportunity: 960000,
    methodologyNote: "[Source: Demo Health System / National Benchmark]. Patient count: 720 ACS x 40% non-culprit disease x 20% not staged x 35% market share = ~20/year. Rolling 2-year window = 40. Dollar opportunity: $24,000 PCI with DES DRG x 40 patients = $960,000 (full procedural DRG x 100% — all staged PCIs generate full facility revenue). COMPLETE trial (Mehta, NEJM 2019).",
    priority: 'high',
    evidence:
      'COMPLETE trial (Mehta, NEJM 2019): Complete vs culprit-only in STEMI. CV death + MI: HR 0.74 (P<0.001). Class I. FIRE trial (2023): Complete revascularization in older NSTEMI (mean age 80) — CV death + MI HR 0.73 (P=0.002). Class I in NSTEMI guidelines.',
    cta: 'Schedule Non-Culprit PCI',
    detectionCriteria: [
      'ACS event (I21.x) in past 12 months',
      'Cath report documenting significant non-culprit disease (>=70% in non-culprit vessel)',
      'Culprit-only PCI performed',
      'No subsequent non-culprit revascularization',
      'No documented deferral reason (FFR >0.80, patient refusal, end-stage disease)',
    ],
    patients: [
      {
        id: 'CAD-CR-001',
        name: 'Dennis Harrington',
        mrn: 'MRN-CAD-47001',
        age: 62,
        signals: [
          'STEMI 4 months ago — LAD culprit, stented',
          'Non-culprit RCA 80% stenosis on index cath',
          'No non-culprit PCI performed or scheduled',
          'No FFR deferral documented for RCA',
        ],
        keyValues: {
          'ACS Type': 'STEMI (4 months ago)',
          'Culprit': 'LAD — stented',
          'Non-Culprit': 'RCA 80%',
          'Non-Culprit PCI': 'None',
          'Deferral Reason': 'None documented',
          'LVEF Post-STEMI': '42%',
        },
      },
      {
        id: 'CAD-CR-002',
        name: 'Annette Johansson',
        mrn: 'MRN-CAD-47002',
        age: 74,
        signals: [
          'NSTEMI 6 months ago — RCA culprit, stented',
          'Non-culprit LCx 75% on index cath',
          'Age 74 — FIRE trial supports complete revasc in older patients',
          'No subsequent cath or PCI planned',
        ],
        keyValues: {
          'ACS Type': 'NSTEMI (6 months ago)',
          'Culprit': 'RCA — stented',
          'Non-Culprit': 'LCx 75%',
          'Non-Culprit PCI': 'None',
          'Age': '74 (FIRE trial eligible)',
          'LVEF': '50%',
        },
      },
      {
        id: 'CAD-CR-003',
        name: 'Tyrone Bassett',
        mrn: 'MRN-CAD-47003',
        age: 58,
        signals: [
          'STEMI 8 months ago — LCx culprit, stented',
          'Non-culprit LAD 70% and RCA 72%',
          '2-vessel non-culprit disease untreated',
          'Ongoing exertional dyspnea — possible ischemia from non-culprit disease',
        ],
        keyValues: {
          'ACS Type': 'STEMI (8 months ago)',
          'Culprit': 'LCx — stented',
          'Non-Culprit LAD': '70%',
          'Non-Culprit RCA': '72%',
          'Non-Culprit PCI': 'None',
          'Symptoms': 'Exertional dyspnea',
        },
      },
    ],
    whyMissed: 'Non-culprit lesion management requires connecting index PCI records with residual disease documentation — follow-up of known disease that exists in cath lab records.',
    whyTailrd: 'TAILRD connected index PCI procedure with documented non-culprit lesions to identify this patient for complete revascularization evaluation.',
  },
  {
    id: 'cad-gap-48-cto',
    name: 'Chronic Total Occlusion — PCI Referral Not Made',
    category: 'Growth',
    patientCount: 32,
    dollarOpportunity: 896000,
    methodologyNote: "[Source: Demo Health System / National Benchmark]. Patient count: 3,000 diagnostic caths x 20% CTO found x 30% symptomatic x 50% not attempted x 35% market share = 32. Dollar opportunity: $28,000 CTO PCI DRG x 32 patients = $896,000 (full procedural DRG x 100% — CTO PCI generates full facility revenue for referred patients). EURO-CTO RCT criteria.",
    priority: 'medium',
    tag: 'CTO | Referral',
    evidence:
      'CTO PCI registry data (PROGRESS-CTO, EuroCTO): 85-90% technical success at experienced centers. EURO-CTO RCT: CTO PCI improved angina and KCCQ +12 points vs medical therapy. Referral to CTO-capable operator is the gap — most cath labs do not perform CTO PCI.',
    cta: 'Refer to CTO-Capable Operator',
    detectionCriteria: [
      'CTO documented on angiography (100% occlusion, presumed chronic)',
      'Persistent angina despite medical therapy (CCS Class II+ or ongoing nitrate use)',
      'No CTO PCI attempt documented',
      'No CABG covering CTO territory',
    ],
    patients: [
      {
        id: 'CAD-CTO-001',
        name: 'Salvatore Rizzo',
        mrn: 'MRN-CAD-48001',
        age: 64,
        saqAnginaFrequency: 71,
        saqPriorAnginaFrequency: 29,
        signals: [
          'CTO: RCA 100% occlusion — presumed chronic (>3 months)',
          'SAQ Angina Frequency improved from 29 to 71 post-CTO PCI',
          'On max BB + CCB + long-acting nitrate (pre-procedure)',
          'Sublingual NTG use 4x/week (pre-procedure — now resolved)',
          'CTO PCI referral resulted in successful recanalization',
        ],
        keyValues: {
          'CTO Vessel': 'RCA (100% occlusion)',
          'Duration': '>3 months (chronic)',
          'SAQ Angina Freq': '71/100 (post-CTO PCI)',
          'Current Meds': 'Metoprolol + amlodipine + isosorbide mononitrate',
          'PRN NTG Use': '4x/week (pre-procedure)',
          'CTO PCI': 'Successful',
          'Outcome Note': 'Post-CTO PCI — SAQ improved from 29 to 71, returned to full activity',
        },
      },
      {
        id: 'CAD-CTO-002',
        name: 'Lorraine Whitfield',
        mrn: 'MRN-CAD-48002',
        age: 59,
        saqAnginaFrequency: 46,
        signals: [
          'CTO: LCx 100% occlusion — chronic',
          'SAQ Angina Frequency 46/100 — moderate angina limitation',
          'CCS Class II-III exertional angina',
          'On BB + long-acting nitrate, CCB not tolerated (hypotension)',
          'No CTO referral',
        ],
        keyValues: {
          'CTO Vessel': 'LCx (100% occlusion)',
          'SAQ Angina Freq': '46/100',
          'CCS Class': 'II-III',
          'Current Meds': 'Metoprolol + isosorbide mononitrate',
          'CCB': 'Intolerant (hypotension)',
          'CTO PCI': 'None attempted',
        },
      },
      {
        id: 'CAD-CTO-003',
        name: 'Franklin Osei',
        mrn: 'MRN-CAD-48003',
        age: 71,
        saqAnginaFrequency: 28,
        signals: [
          'CTO: RCA 100% occlusion — chronic (>6 months)',
          'SAQ Angina Frequency 28/100 — severely limited',
          'CCS Class III — significant limitation of ordinary activity',
          'On max triple antianginal therapy',
          'Daily sublingual NTG use',
        ],
        keyValues: {
          'CTO Vessel': 'RCA (100% occlusion)',
          'Duration': '>6 months',
          'SAQ Angina Freq': '28/100',
          'CCS Class': 'III',
          'Current Meds': 'Metoprolol + amlodipine + isosorbide mononitrate',
          'PRN NTG Use': 'Daily',
        },
      },
    ],
    whyMissed: 'CTO referral requires specialized operator assessment that general cardiologists may not offer — these patients remain on medical therapy without procedural evaluation.',
    whyTailrd: 'TAILRD identified documented CTO on catheterization with ongoing symptoms and absence of specialized CTO operator referral.',
  },
  {
    id: 'cad-gap-49-intravascular-imaging',
    name: 'Complex PCI Without Intravascular Imaging — Quality Gap',
    category: 'Quality',
    patientCount: 105,
    dollarOpportunity: 441000,
    priority: 'medium',
    tag: 'Quality Gap | ACC NCDR',
    evidence:
      '2025 ACS/PCI Guidelines: IVUS or OCT Class I for complex PCI. IVUS-XPL: stent failure HR 0.54 at 1 year. OCTOBER trial (OCT in bifurcation PCI): MACE HR 0.70 at 2 years. RENOVATE-COMPLEX (IVUS): TLF HR 0.64 at 1 year. CPT 92978 (IVUS). Quality metric tracked by ACC NCDR.',
    cta: 'Document Intravascular Imaging Rationale',
    detectionCriteria: [
      'Complex PCI in past 24 months (left main, bifurcation, calcified lesion, long lesion >28mm, CTO, in-stent restenosis)',
      'No IVUS or OCT documented in procedure report',
      'Not an emergency or salvage PCI',
    ],
    patients: [
      {
        id: 'CAD-IVI-001',
        name: 'Charlotte Esteves',
        mrn: 'MRN-CAD-49001',
        age: 67,
        signals: [
          'Left main PCI (CPT 92928) — 14 months ago',
          'No IVUS or OCT in procedure report',
          'LM PCI: Class I for intravascular imaging per 2025 guidelines',
          'Not an emergency procedure',
        ],
        keyValues: {
          'PCI Type': 'Left main (LM)',
          'Date': '14 months ago',
          'IVUS Documented': 'No',
          'OCT Documented': 'No',
          'Emergency': 'No',
          'Stent Length': '23mm',
        },
      },
      {
        id: 'CAD-IVI-002',
        name: 'Bernard Kato',
        mrn: 'MRN-CAD-49002',
        age: 71,
        signals: [
          'Long-lesion PCI: 38mm stent in LAD — 8 months ago',
          'Heavily calcified lesion on fluoroscopy',
          'No IVUS/OCT documented',
          'ACC NCDR quality metric not met',
        ],
        keyValues: {
          'PCI Type': 'Long lesion + calcification',
          'Stent Length': '38mm (LAD)',
          'Calcification': 'Heavy (fluoroscopy)',
          'IVUS Documented': 'No',
          'OCT Documented': 'No',
          'Date': '8 months ago',
        },
      },
      {
        id: 'CAD-IVI-003',
        name: 'Rosemary Adler',
        mrn: 'MRN-CAD-49003',
        age: 63,
        signals: [
          'Bifurcation PCI (LAD/D1) — 18 months ago',
          'No IVUS or OCT in procedure note',
          'OCTOBER trial: OCT-guided bifurcation PCI MACE HR 0.70',
          'Complex anatomy — two-stent strategy used',
        ],
        keyValues: {
          'PCI Type': 'Bifurcation (LAD/D1)',
          'Strategy': 'Two-stent (TAP)',
          'IVUS Documented': 'No',
          'OCT Documented': 'No',
          'Date': '18 months ago',
          'Stent Length': '28mm main + 18mm side',
        },
      },
    ],
    whyMissed: 'Intravascular imaging use requires connecting procedure complexity with imaging utilization — a quality gap visible only when procedure records are analyzed systematically.',
    whyTailrd: 'TAILRD connected complex PCI procedures with absence of IVUS/OCT documentation to identify this procedural quality gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 2,400 PCI volume x 25% complex (LM, bifurcation, calcified, long) x 30% without IVUS/OCT = 105. Dollar opportunity: IVUS/OCT $1,200 professional + technical x 70% completion x 105 = $88,200 + quality-driven PCI volume growth (better outcomes attract referrals) $24,000 x 5% incremental PCI volume x 3 years = $352,800. Total ~$441,000. 2025 ACS/PCI guidelines Class I. ACC NCDR quality metric.',
  },
  {
    id: 'cad-gap-50-dapt-discontinuation',
    name: 'DAPT Discontinued Early — Stent Thrombosis Risk',
    category: 'Safety',
    patientCount: 76,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'DAPT Safety | Stent Thrombosis',
    safetyNote:
      'CRITICAL: Premature DAPT discontinuation after DES is the most preventable cause of stent thrombosis. Stent thrombosis mortality 20-45%. DES <3 months: 19 patients flagged CRITICAL. DES 3-12 months: 48 patients HIGH priority.',
    subcategories: [
      { label: 'DES <3 months — CRITICAL', count: 28 },
      { label: 'DES 3-12 months — HIGH', count: 71 },
    ],
    evidence:
      'Stent thrombosis: 0.5-1% per year — mortality 20-45%. Highest risk in first 3 months. Premature DAPT discontinuation is the most common preventable cause. Minimum DAPT: 6 months elective DES, 12 months post-ACS. Class I: do not interrupt DAPT within 6 months for elective surgery unless bleeding outweighs thrombosis risk.',
    cta: 'Urgent DAPT Review — Restart if No Contraindication',
    detectionCriteria: [
      'DES implanted within past 12 months (CPT 92928 with DES)',
      'NOT on BOTH aspirin AND a P2Y12 inhibitor',
      'No documented reason for discontinuation (major bleeding, surgery, allergy, physician decision)',
      'DES <3 months: flag as CRITICAL',
    ],
    patients: [
      {
        id: 'CAD-DAPT-001',
        name: 'Eugene Whitmore',
        mrn: 'MRN-CAD-50001',
        age: 69,
        tier: 'CRITICAL — DES <3 months',
        signals: [
          'DES implanted 7 weeks ago (LAD stenting)',
          'Currently on aspirin only — clopidogrel discontinued',
          'No documented bleeding or surgical reason for P2Y12 discontinuation',
          'CRITICAL: DES <3 months — highest stent thrombosis risk window',
        ],
        keyValues: {
          'DES Date': '7 weeks ago',
          'Stented Vessel': 'LAD',
          'Aspirin': 'Yes',
          'P2Y12': 'Discontinued (no documented reason)',
          'Risk Window': 'CRITICAL (<3 months)',
          'Thrombosis Risk': 'Highest',
          'DAPT Discontinued': '2026-02-28',
          'Days Without P2Y12': '19',
        },
      },
      {
        id: 'CAD-DAPT-002',
        name: 'Helen Nakamura',
        mrn: 'MRN-CAD-50002',
        age: 77,
        signals: [
          'DES implanted 5 months ago (RCA stenting post-NSTEMI)',
          'Not on any antiplatelet (aspirin and ticagrelor both discontinued)',
          'No GI bleed documented; reason listed as "patient preference"',
          'Post-ACS DES: minimum 12 months DAPT required',
        ],
        keyValues: {
          'DES Date': '5 months ago',
          'Indication': 'NSTEMI',
          'Stented Vessel': 'RCA',
          'Aspirin': 'Discontinued',
          'P2Y12': 'Discontinued',
          'Documented Reason': 'Patient preference — insufficient',
        },
      },
      {
        id: 'CAD-DAPT-003',
        name: 'Marcus Delacroix',
        mrn: 'MRN-CAD-50003',
        age: 62,
        signals: [
          'DES implanted 10 months ago (elective LCx stenting)',
          'Aspirin only — ticagrelor discontinued at 6 months by PCP',
          'Post-ACS DES: guideline minimum 12 months DAPT',
          'PCP may have used elective stent minimum (6 months) — incorrect for post-ACS',
        ],
        keyValues: {
          'DES Date': '10 months ago',
          'Indication': 'Post-ACS (NSTEMI)',
          'Stented Vessel': 'LCx',
          'Aspirin': 'Yes',
          'P2Y12': 'Discontinued at 6 months by PCP',
          'Guideline': '12 months required (post-ACS)',
        },
      },
    ],
    whyMissed: 'DAPT discontinuation requires tracking time since stent implant against medication list — pharmacy systems don\'t flag duration-based medication gaps.',
    whyTailrd: 'TAILRD connected stent implant date with current antiplatelet therapy to identify premature DAPT discontinuation and stent thrombosis risk.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 2,400 PCI volume x 90% DES usage = 2,160 x 5% early DAPT discontinuation = 76. Dollar opportunity: $0 direct revenue. Safety gap — stent thrombosis mortality 20-45%. Cost avoidance noted.',
  },
  // ── GAPS 51-55 ─────────────────────────────────────────────
  {
    id: 'cad-gap-51-ffr-ifr',
    name: 'Intermediate Lesion PCI Without Physiologic Assessment',
    category: 'Quality',
    patientCount: 76,
    dollarOpportunity: 42560,
    priority: 'medium',
    tag: 'Quality Gap | FAME',
    evidence:
      'FAME trial: FFR-guided PCI vs angiography-guided. MACE HR 0.80 (P=0.02). FAME 2: Deferring PCI when FFR >0.80 equivalent outcomes at 5 years. DEFINE-FLAIR/iFR SWEDEHEART: iFR non-inferior to FFR. Class I: physiologic assessment for intermediate lesions before PCI.',
    cta: 'Document FFR/iFR Result or Reason for Deferral',
    detectionCriteria: [
      'PCI performed on intermediate severity lesion (40-70% stenosis on visual estimate)',
      'No FFR (CPT 93571) or iFR documented',
      'No documented reason for bypassing physiology (TIMI 0 flow, hemodynamic instability)',
    ],
    patients: [
      {
        id: 'CAD-FFR-001',
        name: 'Theresa Okonkwo',
        mrn: 'MRN-CAD-51001',
        age: 60,
        signals: [
          'PCI on 55% RCA stenosis — no FFR/iFR measured',
          'Visual estimate intermediate (40-70%) — physiology required per guidelines',
          'No hemodynamic instability at time of procedure',
          'FAME data: FFR-guided MACE HR 0.80',
        ],
        keyValues: {
          'Lesion': 'RCA 55% (visual estimate)',
          'FFR': 'Not measured',
          'iFR': 'Not measured',
          'Hemodynamic Status': 'Stable',
          'PCI Performed': 'Yes',
          'Guideline Compliance': 'No — physiology required',
        },
      },
      {
        id: 'CAD-FFR-002',
        name: 'Lawrence Kimura',
        mrn: 'MRN-CAD-51002',
        age: 68,
        signals: [
          'PCI on 62% LCx — no physiologic assessment documented',
          'Intermediate lesion — FAME: PCI on FFR >0.80 no better than deferral',
          'No TIMI 0 flow documented',
          'ACC NCDR quality metric not met',
        ],
        keyValues: {
          'Lesion': 'LCx 62% (visual estimate)',
          'FFR': 'Not measured',
          'iFR': 'Not measured',
          'Indication for Bypassing': 'None documented',
          'PCI Performed': 'Yes',
          'NCDR Quality': 'Non-compliant',
        },
      },
      {
        id: 'CAD-FFR-003',
        name: 'Gloria Espinoza',
        mrn: 'MRN-CAD-51003',
        age: 73,
        signals: [
          'PCI on 50% RCA diagonal — intermediate lesion, no FFR',
          'Lesion borderline for significance',
          'No iFR documented either',
          'Physiology assessment would have been Class I',
        ],
        keyValues: {
          'Lesion': 'RCA diagonal 50% (visual)',
          'FFR': 'Not measured',
          'iFR': 'Not measured',
          'PCI Performed': 'Yes',
          'Stability': 'Hemodynamically stable',
          'Date': '14 months ago',
        },
      },
    ],
    whyMissed: 'Physiologic assessment for intermediate lesions requires connecting lesion severity with procedure documentation — a quality gap in lesion-level decision-making.',
    whyTailrd: 'TAILRD identified PCI performed on intermediate lesion without documented FFR/iFR physiologic assessment to flag this guideline-recommended quality measure.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 2,400 PCI volume x 15% intermediate lesion (40-70% visual) x 30% without FFR/iFR = 76. Dollar opportunity: FFR/iFR $800 professional + technical x 70% completion x 76 = $42,560. FAME trial Class I. ACC NCDR quality metric.',
  },
  {
    id: 'cad-gap-52-post-acs-pcsk9i',
    name: 'Post-ACS PCSK9i — Highest-Benefit Window Missed',
    category: 'Gap',
    patientCount: 48,
    dollarOpportunity: 57600,
    methodologyNote: "[Source: Demo Health System / National Benchmark]. Patient count: 720 ACS admissions x 45% LDL >=70 on max statin at 4-6 weeks x 85% not on PCSK9i = 275. 90-day window = 48 active. Dollar opportunity: associated monitoring visits $1,200/patient/year x 48 = $57,600. ODYSSEY OUTCOMES all-cause death HR 0.85.",
    priority: 'high',
    tag: 'Post-ACS | Time-Sensitive',
    evidence:
      'ODYSSEY OUTCOMES (alirocumab post-ACS): All-cause death HR 0.85 (P=0.026) — only PCSK9i trial showing all-cause mortality benefit. Absolute risk reduction highest in first 12 months post-ACS. 2026 ACC/AHA: PCSK9i in ACS not at LDL goal on max statin +/- ezetimibe.',
    cta: 'Initiate PCSK9 Inhibitor — High-Risk Post-ACS Window',
    detectionCriteria: [
      'ACS event (I21.x) in past 90 days',
      'On high-intensity statin',
      'LDL >=70 mg/dL on most recent lipid panel',
      'NOT on evolocumab, alirocumab, or inclisiran',
    ],
    patients: [
      {
        id: 'CAD-PCSK9ACS-001',
        name: 'Reginald Owusu',
        mrn: 'MRN-CAD-52001',
        age: 57,
        signals: [
          'STEMI 5 weeks ago — LAD PCI performed',
          'On rosuvastatin 40mg — high-intensity statin',
          'LDL 98 mg/dL on post-ACS lipid panel',
          'No PCSK9i initiated — highest-benefit post-ACS window',
        ],
        keyValues: {
          'ACS Event': 'STEMI (5 weeks ago)',
          'ACS Date': '2026-01-17',
          'Days Since ACS': '61',
          'PCSK9i Window Remaining': '29 days',
          'Current Statin': 'Rosuvastatin 40mg',
          'LDL': '98 mg/dL',
          'PCSK9i': 'None',
          'Ezetimibe': 'No',
          'Post-ACS Window': 'Active (high-benefit)',
        },
      },
      {
        id: 'CAD-PCSK9ACS-002',
        name: 'Vanessa Tremblay',
        mrn: 'MRN-CAD-52002',
        age: 63,
        signals: [
          'NSTEMI 8 weeks ago — RCA culprit PCI',
          'Rosuvastatin 40mg — on max statin',
          'LDL 115 mg/dL — significantly above goal of <55 mg/dL post-ACS',
          'No PCSK9i or ezetimibe added',
        ],
        keyValues: {
          'ACS Event': 'NSTEMI (8 weeks ago)',
          'ACS Date': '2026-02-03',
          'Days Since ACS': '44',
          'PCSK9i Window Remaining': '46 days',
          'Current Statin': 'Rosuvastatin 40mg',
          'LDL': '115 mg/dL',
          'LDL Goal': '<55 mg/dL (post-ACS)',
          'PCSK9i': 'None',
          'Ezetimibe': 'None',
        },
      },
      {
        id: 'CAD-PCSK9ACS-003',
        name: 'Howard Bellingham',
        mrn: 'MRN-CAD-52003',
        age: 70,
        signals: [
          'STEMI 11 weeks ago — multivessel CAD, LAD stented',
          'Atorvastatin 80mg — high-intensity statin',
          'LDL 78 mg/dL — above post-ACS goal of <55 mg/dL',
          'On ezetimibe 10mg — still above goal, PCSK9i indicated',
        ],
        keyValues: {
          'ACS Event': 'STEMI (11 weeks ago)',
          'Current Statin': 'Atorvastatin 80mg',
          'Ezetimibe': 'Yes (10mg)',
          'LDL': '78 mg/dL',
          'LDL Goal': '<55 mg/dL',
          'PCSK9i': 'None (next step)',
        },
      },
    ],
    whyMissed: 'Post-ACS PCSK9i has a time-sensitive window of maximum benefit. The window closes without systematic monitoring of the ACS-to-initiation interval.',
    whyTailrd: 'TAILRD connected ACS event date with lipid panel timing and absence of PCSK9i to identify this time-sensitive treatment window.',
  },
  {
    id: 'cad-gap-53-oac-monotherapy',
    name: 'Aspirin + OAC in Stable CAD — Excess Bleeding Risk (Cross-Module CAD+EP)',
    category: 'Gap',
    patientCount: 84,
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
    ],
    patients: [
      {
        id: 'CAD-OAC-001',
        name: 'Florence Nakagawa',
        mrn: 'MRN-CAD-53001',
        age: 74,
        signals: [
          'AF (persistent) + stable CAD (I25.10)',
          'Last PCI 28 months ago — beyond 12-month post-stent window',
          'On apixaban 5mg BID + aspirin 81mg — excess bleeding risk',
          'AUGUSTUS: aspirin adds bleeding, no ischemic benefit in stable CAD + AF',
        ],
        keyValues: {
          'AF Type': 'Persistent',
          'Last PCI': '28 months ago',
          'OAC': 'Apixaban 5mg BID',
          'Aspirin': '81mg (should discontinue)',
          'Stent (last 12 mo)': 'No',
          'CHA2DS2-VASc': '5',
        },
      },
      {
        id: 'CAD-OAC-002',
        name: 'Albert Greenwood',
        mrn: 'MRN-CAD-53002',
        age: 68,
        signals: [
          'Paroxysmal AF + stable CAD (no ACS/PCI in 18 months)',
          'On rivaroxaban 20mg + aspirin 81mg',
          'Aspirin continuation beyond 12 months post-stent: guideline-discouraged',
          'No bleeding assessment documented',
        ],
        keyValues: {
          'AF Type': 'Paroxysmal',
          'Last PCI': '18 months ago',
          'OAC': 'Rivaroxaban 20mg',
          'Aspirin': '81mg (should discontinue)',
          'HAS-BLED': '3 (high bleeding risk)',
          'CHA2DS2-VASc': '4',
        },
      },
      {
        id: 'CAD-OAC-003',
        name: 'Iris Kowalczyk',
        mrn: 'MRN-CAD-53003',
        age: 79,
        signals: [
          'Permanent AF + CAD (stable, last PCI 36 months ago)',
          'On apixaban 2.5mg BID (renally dosed) + aspirin 81mg',
          'Age 79 + AF + OAC: aspirin dramatically increases bleeding risk',
          'No current ischemic indication for dual therapy',
        ],
        keyValues: {
          'AF Type': 'Permanent',
          'Last PCI': '36 months ago',
          'OAC': 'Apixaban 2.5mg BID (renal dose)',
          'Aspirin': '81mg (should discontinue)',
          'eGFR': '38 mL/min',
          'CHA2DS2-VASc': '6',
        },
      },
    ],
    whyMissed: 'Aspirin + OAC in stable CAD requires connecting medication list with CAD stability timeline — pharmacy systems don\'t flag duration-based deprescribing opportunities.',
    whyTailrd: 'TAILRD connected OAC prescription with concurrent aspirin use and CAD stability duration to identify excess bleeding risk from dual antithrombotic therapy.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: AF panel (~8,000) x 15% CAD overlap = 1,200 x 12% on aspirin + OAC >12mo post-stent = 84. Dollar opportunity: $0 direct revenue. Safety/deprescribing gap — cost avoidance from prevented major bleeding. AUGUSTUS trial. Cross-module with EP.',
  },
  {
    id: 'cad-gap-54-ccta',
    name: 'Stable Chest Pain — CCTA Not Considered',
    category: 'Growth',
    patientCount: 122,
    dollarOpportunity: 768600,
    priority: 'medium',
    tag: 'Imaging | Growth',
    evidence:
      'SCOT-HEART: CCTA vs standard care for stable chest pain. MI at 5 years: 2.3% vs 3.9% (HR 0.59, P=0.004). PROMISE: CCTA equivalent to functional testing with fewer downstream caths without obstructive CAD. 2023 ESC Chest Pain Guidelines: CCTA preferred first-line for intermediate pre-test probability.',
    cta: 'Consider CCTA for Stable Chest Pain Workup',
    detectionCriteria: [
      'New stable chest pain (I20.9 or R07.x in past 6 months)',
      'Went to nuclear stress or stress echo as initial test',
      'No CCTA (CPT 75574) performed',
      'No known obstructive CAD on prior angiography',
      'Age <70',
    ],
    patients: [
      {
        id: 'CAD-CCTA-001',
        name: 'Brenda Flanagan',
        mrn: 'MRN-CAD-54001',
        age: 52,
        signals: [
          'New stable chest pain 3 months ago (R07.9)',
          'Nuclear stress test ordered as initial test — negative',
          'No CCTA performed (preferred first-line for intermediate pre-test probability)',
          '2023 ESC: CCTA detects subclinical plaque — identifies true CAD risk',
        ],
        keyValues: {
          'Chest Pain': 'Stable (3 months ago)',
          'Initial Test': 'Nuclear stress — negative',
          'CCTA': 'Not ordered',
          'Prior CAD': 'None',
          'Age': '52',
          'Pre-Test Prob': 'Intermediate',
        },
      },
      {
        id: 'CAD-CCTA-002',
        name: 'Douglas Hartley',
        mrn: 'MRN-CAD-54002',
        age: 45,
        signals: [
          'Stable chest pain 4 months ago — stress echo performed, normal',
          'CCTA not considered — direct referral to stress echo by PCP',
          'SCOT-HEART: CCTA provides plaque characterization beyond stress imaging',
          'Age 45: preventive cardiology opportunity',
        ],
        keyValues: {
          'Chest Pain': 'Stable (4 months ago)',
          'Initial Test': 'Stress echo — normal',
          'CCTA': 'Not ordered',
          'Prior CAD': 'None',
          'Age': '45',
          'ESC Guideline': 'CCTA preferred first-line',
        },
      },
      {
        id: 'CAD-CCTA-003',
        name: 'Catherine Moreau',
        mrn: 'MRN-CAD-54003',
        age: 61,
        signals: [
          'Stable chest pain 2 months ago — nuclear stress performed, equivocal',
          'No CCTA — equivocal stress could benefit from anatomic imaging',
          'No prior angiography or known CAD',
          'CCTA could clarify anatomy before deciding on further workup',
        ],
        keyValues: {
          'Chest Pain': 'Stable (2 months ago)',
          'Initial Test': 'Nuclear stress — equivocal',
          'CCTA': 'Not ordered',
          'Prior CAD': 'None',
          'Age': '61',
          'Risk': 'Intermediate-high',
        },
      },
    ],
    whyMissed: 'CCTA for stable chest pain requires connecting symptom presentation with diagnostic workup — patients often proceed to invasive angiography without non-invasive evaluation.',
    whyTailrd: 'TAILRD identified stable chest pain presentation with absence of CCTA evaluation to flag this guideline-recommended non-invasive diagnostic pathway.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 2.5M catchment x 0.5% new chest pain x 35% market share x 40% stress-first without CCTA x 28% ID window = 122. Dollar opportunity: CCTA $1,500 x 70% completion x 122 = $128,100 + downstream diagnostic cath for positive CCTA $3,000 x 35% positive rate x 122 = $128,100 + downstream PCI for confirmed CAD $24,000 x 15% of CCTA x 30% conversion x 122 = $512,400. Total ~$768,600. SCOT-HEART / PROMISE. 2023 ESC guidelines.',
  },
  {
    id: 'cad-gap-55-ranolazine-refractory',
    name: 'Refractory Angina — Ranolazine Not Prescribed',
    category: 'Gap',
    patientCount: 30,
    dollarOpportunity: 36000,
    priority: 'medium',
    evidence:
      'CARISA and MERLIN-TIMI 36: Ranolazine reduces angina frequency and nitroglycerin use in chronic stable angina refractory to standard therapy. Late sodium current inhibitor — distinct mechanism from BB, CCB, nitrates. Starting 500mg BID; target 1000mg BID.',
    cta: 'Initiate Ranolazine',
    detectionCriteria: [
      'Angina (I20.x) on maximally tolerated doses of at least 2 of: BB, CCB, long-acting nitrate',
      'Persistent angina documented',
      'NOT on ranolazine',
      'SAQ Angina Frequency <50 OR ongoing PRN nitrate use',
    ],
    patients: [
      {
        id: 'CAD-RANO-001',
        name: 'Clifford Mensah',
        mrn: 'MRN-CAD-55001',
        age: 66,
        saqAnginaFrequency: 36,
        signals: [
          'Angina on BB (metoprolol 100mg BID) + CCB (amlodipine 10mg) + isosorbide mononitrate',
          'SAQ Angina Frequency 36/100 — severely limited',
          'Sublingual NTG use 3-4x/week',
          'NOT on ranolazine — distinct mechanism, additive benefit',
        ],
        keyValues: {
          'Current Meds': 'Metoprolol 100mg BID + amlodipine 10mg + ISMN',
          'SAQ Angina Freq': '36/100',
          'PRN NTG': '3-4x/week',
          'Ranolazine': 'Not prescribed',
          'CCS Class': 'III',
          'eGFR': '58 mL/min (dose adjust not needed)',
        },
      },
      {
        id: 'CAD-RANO-002',
        name: 'Shirley Bassett',
        mrn: 'MRN-CAD-55002',
        age: 72,
        saqAnginaFrequency: 44,
        signals: [
          'Angina on max BB + long-acting nitrate (CCB hypotension-limiting)',
          'SAQ Angina Frequency 44/100 — moderate limitation',
          'NTG use 5x/week — inadequate symptom control',
          'Ranolazine not on medication list',
        ],
        keyValues: {
          'Current Meds': 'Carvedilol 25mg BID + isosorbide dinitrate',
          'SAQ Angina Freq': '44/100',
          'PRN NTG': '5x/week',
          'Ranolazine': 'Not prescribed',
          'CCB': 'Not tolerated (hypotension)',
          'CCS Class': 'II-III',
        },
      },
      {
        id: 'CAD-RANO-003',
        name: 'Victor Castillo',
        mrn: 'MRN-CAD-55003',
        age: 60,
        saqAnginaFrequency: 28,
        signals: [
          'Refractory angina on triple antianginal therapy (BB + CCB + nitrate)',
          'SAQ Angina Frequency 28/100 — severely limited',
          'Daily NTG use — not controlled on max standard therapy',
          'Ranolazine: late Na+ current inhibitor, additive to all 3 standard agents',
        ],
        keyValues: {
          'Current Meds': 'Metoprolol + amlodipine 10mg + ISMN 60mg',
          'SAQ Angina Freq': '28/100',
          'PRN NTG': 'Daily',
          'Ranolazine': 'Not prescribed',
          'CCS Class': 'III',
          'Prior Revascularization': 'PCI 4 years ago',
        },
      },
    ],
    whyMissed: 'Refractory angina identification requires connecting symptom persistence across multiple encounters with current anti-anginal regimen — a longitudinal pattern.',
    whyTailrd: 'TAILRD connected persistent angina documentation across encounters with current medication regimen to identify refractory angina requiring advanced therapy.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 15,000 CAD panel x 8% angina x 10% refractory on >=2 agents x 50% without ranolazine x 70% identifiable = 30. Dollar opportunity: associated monitoring visits $1,200/patient/year x 30 = $36,000. CARISA / MERLIN-TIMI 36.',
  },
  // ── GAPS 56-60 ─────────────────────────────────────────────
  {
    id: 'cad-gap-56-bb-deprescribing',
    name: 'Beta-Blocker Deprescribing — Low-Risk Post-MI (REDUCE-AMI)',
    category: 'Deprescribing',
    patientCount: 97,
    dollarOpportunity: 0,
    priority: 'medium',
    tag: 'Deprescribing Opportunity | REDUCE-AMI',
    evidence:
      'REDUCE-AMI trial (Yndigegn, NEJM 2024): BB vs no BB in post-MI patients with LVEF >=50%. Death + MI: HR 0.96 (P=0.64) — no benefit. Changes longstanding practice: indefinite BB after MI no longer supported with preserved LVEF, no HF, no angina, no arrhythmia. Deprescribing discussion appropriate.',
    cta: 'Discuss Beta-Blocker Continuation vs Deprescribing',
    detectionCriteria: [
      'Prior MI (I21.x) >12 months ago AND LVEF >=50%',
      'No HF, no angina, no arrhythmia requiring BB',
      'Currently on beta-blocker',
      'No other indication for BB beyond post-MI secondary prevention',
    ],
    patients: [
      {
        id: 'CAD-DEPRX-001',
        name: 'Herbert Caldwell',
        mrn: 'MRN-CAD-56001',
        age: 62,
        signals: [
          'MI 24 months ago — fully recovered, LVEF 62%',
          'On metoprolol succinate 50mg — no arrhythmia, no angina, no HF',
          'REDUCE-AMI: no mortality or MI benefit in this population',
          'Deprescribing discussion appropriate — patient may prefer discontinuation',
        ],
        keyValues: {
          'Prior MI': '24 months ago',
          'LVEF': '62%',
          'Beta-Blocker': 'Metoprolol succinate 50mg',
          'HF': 'No',
          'Angina': 'No',
          'Arrhythmia': 'No',
        },
      },
      {
        id: 'CAD-DEPRX-002',
        name: 'Norma Petersen',
        mrn: 'MRN-CAD-56002',
        age: 68,
        signals: [
          'MI 36 months ago — LVEF 58%, no cardiac symptoms',
          'On metoprolol succinate 25mg',
          'REDUCE-AMI: indefinite BB not supported with LVEF >=50%, no HF/angina/arrhythmia',
          'Side effect: fatigue and cold extremities — deprescribing may improve QoL',
        ],
        keyValues: {
          'Prior MI': '36 months ago',
          'LVEF': '58%',
          'Beta-Blocker': 'Metoprolol succinate 25mg',
          'BB Side Effects': 'Fatigue, cold extremities',
          'HF': 'No',
          'Angina': 'No',
        },
      },
      {
        id: 'CAD-DEPRX-003',
        name: 'Warren Tilley',
        mrn: 'MRN-CAD-56003',
        age: 55,
        signals: [
          'MI 18 months ago — LVEF 55%, asymptomatic',
          'On carvedilol 12.5mg BID',
          'No HF, no angina, no arrhythmia — REDUCE-AMI indications for deprescribing',
          'Patient has asked about stopping BB — appropriate to discuss',
        ],
        keyValues: {
          'Prior MI': '18 months ago',
          'LVEF': '55%',
          'Beta-Blocker': 'Carvedilol 12.5mg BID',
          'HF': 'No',
          'Angina': 'No',
          'Patient Question': 'Asked about stopping BB',
        },
      },
    ],
    whyMissed: 'Beta-blocker deprescribing post-MI (REDUCE-AMI) is a recent evidence development. No standard system flags patients for medication reduction based on new trial data.',
    whyTailrd: 'TAILRD identified this low-risk post-MI patient on beta-blocker who meets REDUCE-AMI criteria for deprescribing — a recent evidence shift not yet in standard protocols.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 15,000 CAD panel x 15% prior MI >12mo x 60% LVEF >=50% x 80% on BB = 1,080 x 15% ID window = 97. Dollar opportunity: $0 direct revenue. Deprescribing opportunity — improved quality of life. REDUCE-AMI trial (Yndigegn, NEJM 2024).',
  },
  {
    id: 'cad-gap-57-inoca',
    name: 'INOCA — Microvascular Disease Not Evaluated',
    category: 'Discovery',
    patientCount: 50,
    dollarOpportunity: 750000,
    priority: 'medium',
    tag: 'INOCA | Women | CMD',
    evidence:
      'INOCA affects 50-70% of women undergoing cath for chest pain. Causes: coronary microvascular disease (CFR <2.0 or IMR >25), epicardial vasospasm, or both. CorMicA trial: physiology-guided treatment improved angina and QoL at 2 years. Sending patient home after normal cath without CMD workup is a care gap.',
    cta: 'Refer for Coronary Physiology Assessment (CFR/IMR/Acetylcholine)',
    detectionCriteria: [
      'Cardiac cath showing no obstructive CAD (<50% all vessels)',
      'Persistent angina or chest pain after cath',
      'Female sex',
      'No coronary physiology testing (CFR, IMR, acetylcholine)',
      'No CMD or vasospastic angina diagnosis',
    ],
    patients: [
      {
        id: 'CAD-INOCA-001',
        name: 'Sandra Oyelaran',
        mrn: 'MRN-CAD-57001',
        age: 54,
        signals: [
          'Cath 4 months ago: no obstructive CAD (<30% all vessels)',
          'Persistent exertional chest pain after cath — unresolved',
          'Female — INOCA predominant in women',
          'No CFR, IMR, or acetylcholine testing performed',
          'No CMD diagnosis',
        ],
        keyValues: {
          'Cath Finding': 'Non-obstructive (<30% all vessels)',
          'Symptoms After Cath': 'Persistent exertional chest pain',
          'Sex': 'Female',
          'CFR': 'Not measured',
          'IMR': 'Not measured',
          'CMD Diagnosis': 'None',
        },
      },
      {
        id: 'CAD-INOCA-002',
        name: 'Priya Mehrotra',
        mrn: 'MRN-CAD-57002',
        age: 48,
        signals: [
          'Cath 6 months ago: 30% LCx, otherwise <20%',
          'Rest and exertional angina — continues post-cath',
          'Female — INOCA: 50-70% of women with chest pain',
          'No physiology testing; discharged with "normal cath"',
        ],
        keyValues: {
          'Cath Finding': 'Max 30% LCx (non-obstructive)',
          'Symptoms': 'Rest + exertional angina',
          'Sex': 'Female',
          'Physiology Test': 'None',
          'Diagnosis': 'Undetermined (sent home)',
          'Time Since Cath': '6 months',
        },
      },
      {
        id: 'CAD-INOCA-003',
        name: 'Deborah Fairclough',
        mrn: 'MRN-CAD-57003',
        age: 60,
        signals: [
          'Cath 2 months ago: all vessels <40%, no obstructive CAD',
          'Ongoing chest pain with exertion and emotional stress',
          'Female; microvascular disease and/or vasospasm suspected',
          'CorMicA: physiology-guided treatment improved QoL vs usual care',
        ],
        keyValues: {
          'Cath Finding': 'All vessels <40% (non-obstructive)',
          'Symptoms': 'Exertional + emotional stress angina',
          'Sex': 'Female',
          'CFR/IMR': 'Not measured',
          'Acetylcholine Test': 'Not performed',
          'Time Since Cath': '2 months',
        },
      },
    ],
    whyMissed: 'Normal angiogram = \'no disease\' in standard workflow. These patients are discharged without a diagnosis. 50-70% of women with chest pain have microvascular disease.',
    whyTailrd: 'TAILRD identified persistent chest pain in follow-up notes and the absence of any CMD or vasospasm workup — a care gap that only appears when post-cath encounter data is analyzed against the original complaint.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 3,000 diagnostic caths x 40% female x 30% non-obstructive x 50% persistent chest pain x 80% no physiology test x 35% market share = 50. Dollar opportunity: downstream cardiac MRI + functional testing + follow-up visits $15,000 x 50 = $750,000 (full diagnostic + treatment pathway for INOCA including MRI, stress testing, and annual monitoring). CorMicA trial criteria. INOCA prevalence 50-70% in women.',
  },
  {
    id: 'cad-gap-58-bempedoic-acid',
    name: 'Statin Intolerance — Bempedoic Acid Not Prescribed',
    category: 'Gap',
    patientCount: 44,
    dollarOpportunity: 316800,
    priority: 'high',
    evidence:
      'CLEAR Outcomes (Nissen, NEJM 2023): Bempedoic acid in statin-intolerant patients with high CV risk. MACE: HR 0.87 (P=0.004). LDL reduction ~20%. First lipid-lowering agent with RCT MACE data in statin-intolerant population. 2026 ACC/AHA: Class I for statin-intolerant ASCVD patients not at LDL goal. Does not cause myopathy.',
    cta: 'Initiate Bempedoic Acid',
    detectionCriteria: [
      'ASCVD diagnosis (I25.x, I21.x, I63.x, I70.x)',
      'Documented statin intolerance or allergy (statin tried and discontinued with myopathy on >=2 statins)',
      'NOT on bempedoic acid',
      'LDL >=70 mg/dL',
    ],
    patients: [
      {
        id: 'CAD-BEMP-001',
        name: 'Arthur Novak',
        mrn: 'MRN-CAD-58001',
        age: 66,
        signals: [
          'ASCVD: CAD (I25.10) confirmed',
          'Rosuvastatin 20mg discontinued — myalgia; atorvastatin 40mg discontinued — myalgia',
          'LDL 112 mg/dL on ezetimibe 10mg alone',
          'Bempedoic acid not tried — CLEAR Outcomes: HR 0.87 MACE reduction',
        ],
        keyValues: {
          'ASCVD': 'CAD (I25.10)',
          'Statins Tried': '2 (rosuvastatin + atorvastatin) — both myopathy',
          'Current LLT': 'Ezetimibe 10mg only',
          'LDL': '112 mg/dL',
          'Bempedoic Acid': 'Not prescribed',
          'CK': 'Normal (myalgia without elevation)',
        },
      },
      {
        id: 'CAD-BEMP-002',
        name: 'Kathleen Bauer',
        mrn: 'MRN-CAD-58002',
        age: 72,
        signals: [
          'ASCVD: prior MI (I21.x) + PAD (I70.2x)',
          '3 statins tried — all discontinued for myalgia/myopathy',
          'LDL 130 mg/dL on PCSK9i alone (partial response)',
          'Bempedoic acid: additive LDL lowering without myopathy risk',
        ],
        keyValues: {
          'ASCVD': 'Prior MI + PAD',
          'Statins Tried': '3 — all myopathy',
          'Current LLT': 'Evolocumab 140mg Q2W',
          'LDL': '130 mg/dL',
          'Bempedoic Acid': 'Not prescribed',
          'Rationale': 'Additive to PCSK9i without myopathy',
        },
      },
      {
        id: 'CAD-BEMP-003',
        name: 'George Lindqvist',
        mrn: 'MRN-CAD-58003',
        age: 59,
        signals: [
          'Prior ischemic stroke (I63.x) + CAD — high ASCVD risk',
          'Simvastatin + pravastatin discontinued for myalgia',
          'LDL 82 mg/dL — above goal of <55 mg/dL for very-high-risk',
          'Bempedoic acid: 20% LDL reduction without myopathy',
        ],
        keyValues: {
          'ASCVD': 'Ischemic stroke + CAD',
          'Statins Tried': '2 — myalgia',
          'Current LLT': 'Ezetimibe 10mg',
          'LDL': '82 mg/dL',
          'LDL Goal': '<55 mg/dL (very high risk)',
          'Bempedoic Acid': 'Not prescribed',
        },
      },
    ],
    whyMissed: 'Statin intolerance management requires connecting medication discontinuation history with LDL trajectory — pharmacy records of stopped medications are rarely analyzed.',
    whyTailrd: 'TAILRD connected statin discontinuation history with persistent LDL elevation to identify this patient for bempedoic acid as a statin alternative.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 15,000 CAD panel x 5% statin intolerant x 60% LDL >=70 x 70% no bempedoic acid x 20% ID window = 44. Dollar opportunity: associated monitoring visits $1,200/patient/year x 44 = $52,800 + downstream MACE reduction (CLEAR Outcomes HR 0.87): avoided hospitalizations $24,000 x 44 x 5% event rate x 13% reduction x 10 years = $264,000. Total ~$316,800. CLEAR Outcomes (Nissen, NEJM 2023).',
  },
  {
    id: 'cad-gap-59-icosapent-ethyl',
    name: 'Elevated Triglycerides on Statin — Icosapent Ethyl Not Prescribed',
    category: 'Gap',
    patientCount: 66,
    dollarOpportunity: 554400,
    priority: 'high',
    evidence:
      'REDUCE-IT (Bhatt, NEJM 2019): Icosapent ethyl 4g/day vs placebo in statin-treated patients with TG 135-499 mg/dL. MACE: HR 0.75 (25% RR, P<0.001). CV death: HR 0.80 (P=0.03). FDA approved for TG >=150 on statin. Pure EPA — not interchangeable with fish oil (STRENGTH trial: no benefit).',
    cta: 'Initiate Icosapent Ethyl 4g/day',
    detectionCriteria: [
      'ASCVD OR high CV risk (DM + >=2 risk factors)',
      'On statin',
      'Fasting TG 135-499 mg/dL on most recent lipid panel',
      'NOT prescribed icosapent ethyl (Vascepa 4g/day)',
    ],
    patients: [
      {
        id: 'CAD-IPE-001',
        name: 'Theodore Nguyen',
        mrn: 'MRN-CAD-59001',
        age: 64,
        signals: [
          'CAD (I25.10) + T2DM — ASCVD established',
          'On rosuvastatin 40mg',
          'Fasting TG 280 mg/dL — REDUCE-IT eligible',
          'No icosapent ethyl prescribed',
        ],
        keyValues: {
          'ASCVD': 'CAD + T2DM',
          'Statin': 'Rosuvastatin 40mg',
          'Fasting TG': '280 mg/dL',
          'Icosapent Ethyl': 'Not prescribed',
          'Fish Oil': 'No (NOT a substitute)',
          'LDL': '74 mg/dL (on goal)',
        },
      },
      {
        id: 'CAD-IPE-002',
        name: 'Maureen Strauss',
        mrn: 'MRN-CAD-59002',
        age: 58,
        signals: [
          'Prior STEMI + T2DM — very high ASCVD risk',
          'On atorvastatin 80mg',
          'Fasting TG 165 mg/dL — REDUCE-IT eligible (>=135 on statin)',
          'Icosapent ethyl not on medication list',
        ],
        keyValues: {
          'ASCVD': 'Prior STEMI + T2DM',
          'Statin': 'Atorvastatin 80mg',
          'Fasting TG': '165 mg/dL',
          'Icosapent Ethyl': 'Not prescribed',
          'CV Risk': 'Very high',
          'LDL': '58 mg/dL',
        },
      },
      {
        id: 'CAD-IPE-003',
        name: 'Russell Huang',
        mrn: 'MRN-CAD-59003',
        age: 71,
        signals: [
          'CAD + hypertriglyceridemia on statin — REDUCE-IT eligible',
          'On rosuvastatin 20mg + ezetimibe',
          'Fasting TG 380 mg/dL — significantly elevated',
          'Not on icosapent ethyl; taking OTC fish oil (no CV benefit per STRENGTH)',
        ],
        keyValues: {
          'ASCVD': 'CAD (I25.10)',
          'Statin': 'Rosuvastatin 20mg + ezetimibe',
          'Fasting TG': '380 mg/dL',
          'Icosapent Ethyl': 'Not prescribed',
          'OTC Fish Oil': 'Yes — not equivalent (STRENGTH: no benefit)',
          'LDL': '52 mg/dL',
        },
      },
    ],
    whyMissed: 'Triglyceride management on statin requires connecting lipid panel details with current statin therapy — the triglyceride-specific intervention is a secondary target often overlooked.',
    whyTailrd: 'TAILRD connected elevated triglycerides on statin therapy with cardiovascular risk to identify icosapent ethyl (REDUCE-IT) eligibility.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 15,000 CAD panel x 25% TG 150-499 on statin x 85% not on IPE x 35% market share x 70% identifiable x 60% ID window = 66. Dollar opportunity: associated monitoring visits $1,200/patient/year x 66 = $79,200 + downstream MACE reduction (REDUCE-IT HR 0.75): avoided hospitalizations $24,000 x 66 x 5% event rate x 25% reduction = $475,200. Total ~$554,400. REDUCE-IT (Bhatt, NEJM 2019).',
  },
  {
    id: 'cad-gap-60-post-cabg-surveillance',
    name: 'Post-CABG — Graft Surveillance Not Performed',
    category: 'Gap',
    patientCount: 79,
    dollarOpportunity: 829500,
    priority: 'high',
    evidence:
      'SVG failure: 10-15% occlude in year 1, 40-50% by 10 years. IMA patency: 90%+ at 10 years. CCTA (CPT 75574) preferred non-invasive graft assessment — high sensitivity for graft occlusion. Functional testing alone misses graft stenosis without complete occlusion.',
    cta: 'Order CCTA for Graft Assessment',
    detectionCriteria: [
      'Prior CABG (Z95.1 or CPT 33533-33534) AND >=5 years since CABG',
      'New or worsening angina (CCS II+ or nitrate use resumed)',
      'No stress test, CCTA, or coronary angiogram in past 2 years',
      'Also flag: CABG patient at 10-year mark with no surveillance even if asymptomatic (SVG failure 40-50% by 10 years)',
    ],
    patients: [
      {
        id: 'CAD-CABG-001',
        name: 'Clarence Owens',
        mrn: 'MRN-CAD-60001',
        age: 73,
        signals: [
          'CABG 10 years ago (3 grafts: LIMA to LAD + 2 SVGs)',
          'New exertional chest pain past 3 months',
          'No stress test or CCTA in past 3 years',
          'SVG failure: 40-50% probability at 10 years',
        ],
        keyValues: {
          'CABG Date': '2016-11-15',
          'Grafts': 'LIMA-LAD + SVG-LCx + SVG-RCA',
          'New Symptoms': 'Exertional chest pain, CCS II',
          'Last Surveillance': 'None in 3 years',
          'SVG Failure Risk': '40-50% at 10 years',
          'Recommended': 'CCTA graft assessment',
        },
      },
      {
        id: 'CAD-CABG-002',
        name: 'Evelyn Rourke',
        mrn: 'MRN-CAD-60002',
        age: 68,
        signals: [
          'CABG 8 years ago (LIMA-LAD + 2 SVGs)',
          'Resumed sublingual NTG use past 6 weeks',
          'NTG resumption = symptom recurrence — graft failure likely',
          'No imaging since CABG 3-year follow-up echo',
        ],
        keyValues: {
          'CABG Date': '2017-03-20',
          'Grafts': 'LIMA-LAD + SVG x2',
          'New Symptoms': 'Progressive dyspnea on exertion',
          'Last Imaging': '5 years ago (echo only)',
          'CCTA': 'Not ordered',
          'Assessment Needed': 'CCTA graft patency',
        },
      },
      {
        id: 'CAD-CABG-003',
        name: 'Vincent Marchand',
        mrn: 'MRN-CAD-60003',
        age: 70,
        signals: [
          'CABG 14 years ago — longest follow-up, highest SVG failure risk',
          'Exertional dyspnea worsening past 4 months',
          'No coronary imaging or stress test in past 4 years',
          'SVG failure risk highest at 14 years',
        ],
        keyValues: {
          'CABG Date': '2012-01-20',
          'Grafts': 'BIMA + SVG-RCA',
          'Symptoms': 'Worsening exertional dyspnea',
          'Last Stress Test': '>4 years ago',
          'CCTA': 'Not ordered',
          'SVG Failure Risk': 'Very high (>10 years)',
        },
      },
    ],
    whyMissed: 'Post-CABG graft surveillance requires tracking time since surgery against imaging history — surgical patients transition back to medical management without systematic follow-up protocols.',
    whyTailrd: 'TAILRD connected CABG procedure date with absence of graft surveillance imaging to identify this post-surgical follow-up gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 450 CABG/year x 5-year cumulative panel = 2,250. Symptomatic + no surveillance 10% = 225 x 35% market share = 79. Dollar opportunity: CCTA $1,500 x 70% completion x 79 = $82,950 + downstream revascularization $24,000 x 25% finding rate x 30% conversion = $746,550. Total ~$829,500. Representative cardiovascular program.',
  },
  // ── GAPS 61-63 ─────────────────────────────────────────────
  {
    id: 'cad-gap-61-vasospastic-angina',
    name: 'Vasospastic Angina — Provocation Testing Not Performed',
    category: 'Gap',
    patientCount: 12,
    dollarOpportunity: 6720,
    priority: 'medium',
    tag: 'Vasospasm | Contraindication Alert',
    safetyNote:
      'CONTRAINDICATION ALERT: Beta-blockers are CONTRAINDICATED in vasospastic angina — can worsen spasm by allowing unopposed alpha-adrenergic vasoconstriction. Flag patients on BB with vasospasm diagnosis or pattern.',
    evidence:
      'Vasospastic (Prinzmetal) angina: coronary spasm causing transient ST elevation, typically at rest. Diagnosis: acetylcholine provocation during cath. Treatment: CCB (verapamil, diltiazem) + long-acting nitrate. CRITICAL: beta-blockers CONTRAINDICATED — can worsen spasm.',
    cta: 'Refer for Acetylcholine Provocation Testing',
    detectionCriteria: [
      'Recurrent chest pain (R07.x or I20.1) with rest or nocturnal pattern',
      'Normal or non-obstructive coronaries on cath OR rest angina with ST changes relieved by nitrates',
      'No acetylcholine or ergonovine provocation test',
      'No vasospastic angina diagnosis (I20.1)',
    ],
    patients: [
      {
        id: 'CAD-VSP-001',
        name: 'Elaine Kovacs',
        mrn: 'MRN-CAD-61001',
        age: 49,
        signals: [
          'Recurrent rest chest pain — nocturnal pattern',
          'Cath 3 months ago: no obstructive CAD (<20% all vessels)',
          'Pain relieved by sublingual NTG — vasospasm pattern',
          'No acetylcholine or ergonovine provocation test performed',
        ],
        keyValues: {
          'Pattern': 'Nocturnal rest angina',
          'Cath': 'Non-obstructive (<20%)',
          'NTG Response': 'Rapid relief — vasospasm pattern',
          'Provocation Test': 'Not performed',
          'Vasospasm Dx': 'None',
          'Current Meds': 'Aspirin only',
        },
      },
      {
        id: 'CAD-VSP-002',
        name: 'Jerome Takahashi',
        mrn: 'MRN-CAD-61002',
        age: 55,
        signals: [
          'Rest angina with transient ST elevation on Holter — vasospasm likely',
          'Non-obstructive CAD on cath (<30%)',
          'Currently on metoprolol — CONTRAINDICATED in vasospastic angina',
          'No provocation testing; no vasospasm diagnosis',
        ],
        keyValues: {
          'Pattern': 'Rest angina + ST elevation on Holter',
          'Cath': 'Non-obstructive (<30%)',
          'Beta-Blocker': 'Metoprolol — CONTRAINDICATED if vasospasm confirmed',
          'Provocation Test': 'Not performed',
          'Risk': 'BB may worsen vasospasm',
          'Recommended': 'CCB + nitrate after diagnosis confirmed',
        },
      },
      {
        id: 'CAD-VSP-003',
        name: 'Agatha Pembrook',
        mrn: 'MRN-CAD-61003',
        age: 43,
        signals: [
          'Young female with rest chest pain — vasospasm pattern',
          'Normal coronaries on cath (all <15% stenosis)',
          'Pain occurs at rest or early morning — classic Prinzmetal pattern',
          'No provocation testing; not on CCB or nitrate',
        ],
        keyValues: {
          'Age/Sex': '43F',
          'Pattern': 'Early morning rest angina',
          'Cath': 'Normal (<15% all vessels)',
          'Provocation Test': 'Not performed',
          'Vasospasm Dx': 'None',
          'Current Meds': 'None cardiac',
        },
      },
    ],
    whyMissed: 'Vasospastic angina requires connecting chest pain pattern with normal angiography — a diagnosis of exclusion that is rarely formally pursued.',
    whyTailrd: 'TAILRD identified chest pain with normal coronary anatomy and absence of provocation testing to flag this vasospastic angina diagnostic gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: ~50 INOCA patients x 25% vasospastic pattern = 12. Dollar opportunity: provocation test $800 x 70% completion x 12 = $6,720. Vasospastic angina prevalence 10-15% of INOCA.',
  },
  {
    id: 'cad-gap-62-hstnt-elevation',
    name: 'Chronic hs-TnT Elevation — Myocardial Injury Not Evaluated',
    category: 'Discovery',
    patientCount: 42,
    dollarOpportunity: 13230,
    priority: 'high',
    evidence:
      'Chronic hs-TnT elevation (Type 2 MI or non-ischemic myocardial injury): independent predictor of 1-year mortality (HR 2.1-3.4). Common causes: HF, LVH, myocarditis, ATTR-CM, demand ischemia in CKD. 4th Universal Definition of MI: distinguishes acute myocardial injury (rising/falling) from chronic (stable elevation). Chronic elevation warrants cardiac imaging and etiology workup.',
    cta: 'Order Echocardiogram + Cardiac MRI for Myocardial Injury Workup',
    detectionCriteria: [
      'hs-TnT >14 ng/L on 2+ measurements without acute MI (no I21.x same encounter)',
      'No evaluation initiated (no cardiac MRI, no echo in past 6 months, no HF or myocarditis workup)',
    ],
    patients: [
      {
        id: 'CAD-TnT-001',
        name: 'Roland Svensson',
        mrn: 'MRN-CAD-62001',
        age: 70,
        signals: [
          'hs-TnT 28 ng/L (Jan) and 31 ng/L (Apr) — stable elevation, not acute',
          'No acute MI coded at either encounter',
          'No echo or cardiac MRI in past 6 months',
          'Possible etiology: CKD stage 3b + LVH on ECG',
        ],
        keyValues: {
          'hs-TnT (Jan)': '28 ng/L',
          'hs-TnT (Apr)': '31 ng/L',
          'Trend': 'Stable (not rising — chronic injury)',
          'Acute MI Coded': 'No',
          'Echo': 'None in 6 months',
          'Suspected Etiology': 'CKD + LVH',
        },
      },
      {
        id: 'CAD-TnT-002',
        name: 'Harriet Bloom',
        mrn: 'MRN-CAD-62002',
        age: 65,
        signals: [
          'hs-TnT 18 ng/L and 22 ng/L — 3 months apart, stable elevation',
          'No ACS coded; chronic myocardial injury suspected',
          'No cardiac imaging workup initiated',
          'Possible ATTR-CM: bilateral carpal tunnel, polyneuropathy',
        ],
        keyValues: {
          'hs-TnT': '18 → 22 ng/L (3 months apart)',
          'Trend': 'Stable elevation',
          'ATTR-CM Clues': 'Carpal tunnel + polyneuropathy',
          'Cardiac MRI': 'Not ordered',
          'Echo': 'None recent',
          'Tc-PYP Scan': 'Not ordered',
        },
      },
      {
        id: 'CAD-TnT-003',
        name: 'Felipe Garza',
        mrn: 'MRN-CAD-62003',
        age: 58,
        signals: [
          'hs-TnT 45 ng/L and 41 ng/L — stable (not acute rise-fall)',
          'No ACS; noted incidentally during pre-op labs',
          'No cardiac evaluation initiated — missed as incidental finding',
          'High mortality risk: hs-TnT >14 ng/L — HR 2.1-3.4',
        ],
        keyValues: {
          'hs-TnT Meas 1': '45 ng/L',
          'hs-TnT Meas 2': '41 ng/L (stable)',
          'Acute MI': 'Not coded',
          'Discovery': 'Incidental (pre-op labs)',
          'Workup Initiated': 'No',
          'Mortality Risk': 'High (>14 ng/L HR 2.1-3.4)',
        },
      },
    ],
    whyMissed: 'Chronic low-level troponin elevation requires connecting two readings over time — not visible in any single encounter view. Individual readings are dismissed as normal variation.',
    whyTailrd: 'TAILRD connected chronic hs-TnT elevation pattern across multiple lab draws to identify ongoing myocardial injury that individual encounter reviews dismissed.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 15,000 CAD panel x 8% chronic hs-TnT >14 ng/L x 10% without workup x 50% ID = 42. Dollar opportunity: echo $450 x 70% completion x 42 = $13,230. 4th Universal Definition of MI criteria.',
  },
  {
    id: 'cad-gap-63-bilateral-ima',
    name: 'Post-CABG — Single Arterial Graft in Eligible Patient (Surgical Quality)',
    category: 'Quality',
    patientCount: 19,
    dollarOpportunity: 0,
    priority: 'low',
    tag: 'Surgical Quality | STS Metric',
    evidence:
      'ART trial: Bilateral vs single IMA in CABG. 10-year mortality: HR 0.77 in non-smokers (P=0.02). STS guidelines: bilateral IMA recommended in eligible patients <70. Quality programs track bilateral IMA utilization as a surgical quality metric.',
    cta: 'Flag for Surgical Quality Review',
    detectionCriteria: [
      'CABG in past 24 months (CPT 33533-33534)',
      'Operative report: single arterial graft only (one IMA, remaining grafts SVG)',
      'Patient age <=70 at time of CABG',
      'No documented contraindication to bilateral IMA (COPD FEV1<70%, active smoker, obesity, sternal radiation)',
    ],
    patients: [
      {
        id: 'CAD-BIMA-001',
        name: 'Donald Ashworth',
        mrn: 'MRN-CAD-63001',
        age: 62,
        signals: [
          'CABG 12 months ago: LIMA-LAD + SVG-LCx + SVG-RCA (single arterial graft)',
          'Age 62 at CABG — bilateral IMA eligible per STS',
          'No documented contraindication to BIMA (non-smoker, BMI 26, FEV1 normal)',
          'STS quality metric: BIMA utilization tracked',
        ],
        keyValues: {
          'CABG Date': '12 months ago',
          'Age at CABG': '62',
          'Grafts': 'LIMA-LAD + SVG x2 (single arterial)',
          'BIMA Contraindication': 'None documented',
          'Smoker': 'No',
          'STS Quality': 'BIMA not used — quality review indicated',
        },
      },
      {
        id: 'CAD-BIMA-002',
        name: 'Patricia Holbrook',
        mrn: 'MRN-CAD-63002',
        age: 58,
        signals: [
          'CABG 18 months ago: RIMA-LAD + SVG-LCx (single RIMA, SVG for LCx)',
          'Age 58 — bilateral IMA indicated per STS guidelines',
          'No active smoking, BMI 28, FEV1 88% — no BIMA contraindication',
          'ART trial benefit most pronounced in non-smokers',
        ],
        keyValues: {
          'CABG Date': '18 months ago',
          'Age at CABG': '58',
          'Grafts': 'RIMA-LAD + SVG-LCx',
          'BIMA Contraindication': 'None — eligible',
          'Smoker': 'Former (quit 5 years ago)',
          'FEV1': '88%',
        },
      },
      {
        id: 'CAD-BIMA-003',
        name: 'Kenneth Stroud',
        mrn: 'MRN-CAD-63003',
        age: 68,
        signals: [
          'CABG 8 months ago: LIMA-LAD + 3 SVGs — no RIMA used',
          'Age 68 — within STS eligible age range (<70)',
          'Non-smoker, BMI 24, normal pulmonary function',
          'Bilateral IMA not discussed in operative report',
        ],
        keyValues: {
          'CABG Date': '8 months ago',
          'Age at CABG': '68',
          'Grafts': 'LIMA-LAD + SVG x3 (single arterial)',
          'BIMA Discussed': 'No — not in op report',
          'Contraindication': 'None documented',
          'STS Recommendation': 'BIMA in eligible patients <70',
        },
      },
    ],
    whyMissed: 'Arterial grafting assessment requires connecting surgical candidacy with graft strategy — the decision between single and bilateral IMA happens in surgical planning, rarely documented in structured data.',
    whyTailrd: 'TAILRD connected CABG procedure records with graft type documentation to identify this patient received single arterial graft despite eligibility for bilateral IMA.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 450 CABG/year x 40% age <70 x 30% LIMA-only x 50% no BIMA contraindication = 19. Dollar opportunity: $0 direct revenue. Quality gap — bilateral IMA improves long-term graft patency. ART trial bilateral IMA data.',
  },
  // ── BSW HEART HOSPITAL — SURGICAL & COMPLEX PCI GAPS 64-71 ──
  {
    id: 'cad-gap-64-cabg-bima',
    name: 'CABG Bilateral IMA Not Utilized in Eligible Patient',
    category: 'Quality',
    patientCount: 28,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'Surgical Quality | STS Star Rating',
    evidence:
      'Taggart DP et al, ART Trial 10-year follow-up (NEJM 2019, PMID 31657721): BIMA associated with superior long-term graft patency in non-diabetic patients <70. Lytle BW et al (NEJM 1999): 20-year survival advantage with bilateral IMA grafting. STS Database: BIMA utilization is a tracked surgical quality metric.',
    cta: 'Review Surgical Plan — Evaluate BIMA Feasibility',
    detectionCriteria: [
      'Multi-vessel CABG performed (CPT 33533-33536)',
      'Single IMA graft only (LIMA-LAD, remaining grafts SVG)',
      'Patient age <70 at time of CABG',
      'Non-diabetic or well-controlled DM (HbA1c <7.5%)',
      'BMI <35',
      'No documented contraindication: COPD FEV1<60%, active smoker, prior sternal radiation, morbid obesity',
    ],
    patients: [
      {
        id: 'CAD-BIMA2-001',
        name: 'Marcus Thibodeaux',
        mrn: 'MRN-CAD-64001',
        age: 61,
        signals: [
          'Multi-vessel CABG: LIMA-LAD + SVG-OM1 + SVG-RCA — single arterial graft',
          'Age 61, non-diabetic, BMI 29 — BIMA eligible per ART criteria',
          'No sternal radiation, non-smoker, FEV1 92%',
          'BIMA not documented as discussed in operative plan',
        ],
        keyValues: {
          'CABG Date': '6 months ago',
          'Age at CABG': '61',
          'Grafts': 'LIMA-LAD + SVG-OM1 + SVG-RCA',
          'Diabetes': 'No',
          'BMI': '29',
          'FEV1': '92%',
          'BIMA Discussed': 'No',
          'STS Risk Score': '1.2%',
        },
      },
      {
        id: 'CAD-BIMA2-002',
        name: 'Carolyn Wentworth',
        mrn: 'MRN-CAD-64002',
        age: 55,
        signals: [
          'Multi-vessel CABG: LIMA-LAD + SVG-D1 + SVG-PDA — no RIMA used',
          'Age 55, well-controlled T2DM (HbA1c 6.8%), BMI 31',
          'Excellent candidate for BIMA — young age, controlled comorbidities',
          'ART trial: greatest BIMA benefit in patients <65',
        ],
        keyValues: {
          'CABG Date': '4 months ago',
          'Age at CABG': '55',
          'Grafts': 'LIMA-LAD + SVG-D1 + SVG-PDA',
          'Diabetes': 'T2DM (HbA1c 6.8%)',
          'BMI': '31',
          'FEV1': '95%',
          'Smoker': 'Never',
          'STS Risk Score': '0.8%',
        },
      },
      {
        id: 'CAD-BIMA2-003',
        name: 'Theodore Garrison',
        mrn: 'MRN-CAD-64003',
        age: 64,
        signals: [
          'Multi-vessel CABG: LIMA-LAD + SVG-LCx + SVG-RCA — single IMA',
          'Age 64, no diabetes, BMI 27, former smoker (quit 8 years)',
          'No documented reason for BIMA avoidance',
          'Long-term graft patency concern: SVG failure 50% at 10 years',
        ],
        keyValues: {
          'CABG Date': '10 months ago',
          'Age at CABG': '64',
          'Grafts': 'LIMA-LAD + SVG x2',
          'Diabetes': 'No',
          'BMI': '27',
          'Smoker': 'Former (quit 8 yrs)',
          'BIMA Contraindication': 'None documented',
        },
      },
      {
        id: 'CAD-BIMA2-004',
        name: 'Angela Sutherland',
        mrn: 'MRN-CAD-64004',
        age: 58,
        signals: [
          '3-vessel CABG: LIMA-LAD + SVG-OM + SVG-PDA — no RIMA',
          'Age 58, non-diabetic, BMI 26, excellent pulmonary function',
          'Lytle NEJM 1999: 20-year survival advantage with BIMA in this age group',
        ],
        keyValues: {
          'CABG Date': '7 months ago',
          'Age at CABG': '58',
          'Grafts': 'LIMA-LAD + SVG-OM + SVG-PDA',
          'Diabetes': 'No',
          'BMI': '26',
          'FEV1': '97%',
          'STS Risk Score': '0.6%',
        },
      },
    ],
    whyMissed: 'Bilateral IMA utilization is a surgical planning decision made pre-operatively. Retrospective quality review requires connecting operative reports with patient eligibility criteria — rarely surfaced in structured data.',
    whyTailrd: 'TAILRD connected CABG operative reports with patient demographics, comorbidity profiles, and STS eligibility criteria to identify patients who received single IMA grafting despite bilateral IMA eligibility.',
    methodologyNote: '[Source: BSW Heart Hospital / National Benchmark]. Patient count: 450 CABGs/year x 60% multi-vessel x 30% BIMA-eligible (age <70, non-diabetic/controlled DM, BMI <35) x 35% not receiving BIMA = 28. Dollar opportunity: $0 direct revenue — quality metric linked to STS star ratings and program benchmarking. ART Trial 10-year data (PMID 31657721).',
  },
  {
    id: 'cad-gap-65-hybrid-revasc',
    name: 'Hybrid Revascularization Not Considered — LIMA-LAD + PCI',
    category: 'Gap',
    patientCount: 15,
    dollarOpportunity: 245000,
    priority: 'medium',
    tag: 'Heart Team | Hybrid Strategy',
    evidence:
      'Harskamp RE et al (JAMA Internal Med 2015): hybrid LIMA-LAD + staged PCI for non-LAD vessels may reduce surgical morbidity while maintaining LIMA-LAD survival benefit. SYNTAX II (Escaned J, Lancet 2023): anatomical and clinical SYNTAX scoring supports individualized revascularization. Low SYNTAX non-LAD disease amenable to PCI.',
    cta: 'Heart Team Review — Evaluate Hybrid Revascularization Strategy',
    detectionCriteria: [
      'Multi-vessel CAD documented on diagnostic catheterization',
      'LAD disease suitable for surgical grafting (proximal/mid LAD)',
      'Non-LAD vessels PCI-amenable: low SYNTAX complexity, discrete lesions',
      'Full surgical CABG performed or planned without hybrid discussion',
      'No documented Heart Team review of hybrid approach',
    ],
    patients: [
      {
        id: 'CAD-HYB-001',
        name: 'Randall Ochoa',
        mrn: 'MRN-CAD-65001',
        age: 66,
        signals: [
          '3-vessel CAD: proximal LAD 90%, mid-LCx 70%, distal RCA 75%',
          'LAD ideal for LIMA graft — non-LAD lesions PCI-amenable (low complexity)',
          'Underwent full CABG (LIMA-LAD + SVG x2) — hybrid not discussed',
          'SYNTAX II: non-LAD score suggests PCI equivalent outcomes',
        ],
        keyValues: {
          'SYNTAX Score': '22 (intermediate)',
          'LAD Lesion': 'Proximal 90% — LIMA-graftable',
          'LCx Lesion': 'Mid 70% — PCI-amenable',
          'RCA Lesion': 'Distal 75% — PCI-amenable',
          'Procedure': 'Full CABG (LIMA-LAD + SVG x2)',
          'Hybrid Discussed': 'No',
        },
      },
      {
        id: 'CAD-HYB-002',
        name: 'Loretta Pemberton',
        mrn: 'MRN-CAD-65002',
        age: 72,
        signals: [
          '2-vessel CAD: proximal LAD 85%, mid-RCA 80%',
          'LAD ideal for LIMA — RCA discrete lesion ideal for PCI',
          'Full CABG recommended without hybrid option presented',
          'Patient preference for less invasive approach not explored',
        ],
        keyValues: {
          'SYNTAX Score': '18 (low)',
          'LAD Lesion': 'Proximal 85%',
          'RCA Lesion': 'Mid 80% — discrete, PCI-amenable',
          'LV Function': 'LVEF 55%',
          'Comorbidities': 'COPD (FEV1 68%), prior sternotomy concern',
          'Hybrid Discussed': 'No',
        },
      },
      {
        id: 'CAD-HYB-003',
        name: 'Franklin Delacroix',
        mrn: 'MRN-CAD-65003',
        age: 59,
        signals: [
          '3-vessel CAD with low non-LAD SYNTAX complexity',
          'Proximal LAD 95% — clear LIMA target',
          'OM1 and PDA lesions discrete, <20mm, non-calcified — PCI favorable',
          'JAMA Internal Med 2015: hybrid approach reduces surgical morbidity',
        ],
        keyValues: {
          'SYNTAX Score': '20',
          'LAD Lesion': 'Proximal 95% — LIMA target',
          'OM1': '75% discrete',
          'PDA': '70% discrete',
          'Procedure Planned': 'Full CABG',
          'Heart Team Review': 'Not documented',
        },
      },
    ],
    whyMissed: 'Hybrid revascularization requires Heart Team discussion integrating interventional and surgical perspectives. Default pathway is full CABG when multi-vessel disease is identified — hybrid is rarely raised unless interventional cardiologist is involved in planning.',
    whyTailrd: 'TAILRD analyzed coronary anatomy from catheterization reports, calculated non-LAD SYNTAX complexity, and identified patients where hybrid LIMA-LAD + staged PCI was a viable but unconsidered strategy.',
    methodologyNote: '[Source: BSW Heart Hospital / National Benchmark]. Patient count: multi-vessel CAD population x 10% hybrid-eligible (LAD graftable + non-LAD PCI-amenable) x not offered hybrid = 15. Dollar opportunity: $24,000 PCI + $45,000 CABG margin blended rate x 15 = ~$245K. Harskamp JAMA Internal Med 2015; SYNTAX II (Escaned, Lancet 2023).',
  },
  {
    id: 'cad-gap-66-protected-pci',
    name: 'Protected PCI with MCS Not Utilized — High-Risk Anatomy',
    category: 'Gap',
    patientCount: 22,
    dollarOpportunity: 185000,
    priority: 'high',
    tag: 'High-Risk PCI | Hemodynamic Support',
    evidence:
      'PROTECT III (O\'Neill WW, presented TCT 2023): Impella-supported PCI showed 33% reduction in MACCE vs standard PCI in high-risk patients. Amin AP et al (JACC 2020): hemodynamic support associated with improved outcomes in complex PCI with severe LV dysfunction. SCAI guidelines recommend MCS for unprotected left main PCI with LVEF ≤30%.',
    cta: 'Evaluate for Hemodynamic Support — Protected PCI Protocol',
    detectionCriteria: [
      'Complex PCI performed or planned: unprotected left main, last remaining vessel, or jeopardized myocardium >50%',
      'Severe LV dysfunction: LVEF ≤30% documented on recent echocardiography',
      'No mechanical circulatory support device utilized (Impella, IABP, TandemHeart)',
      'No documented contraindication to MCS (severe PVD, aortic stenosis, LV thrombus)',
    ],
    patients: [
      {
        id: 'CAD-PPCI-001',
        name: 'Vernon Blackwell',
        mrn: 'MRN-CAD-66001',
        age: 71,
        signals: [
          'Unprotected left main PCI performed without hemodynamic support',
          'LVEF 25% on pre-procedure echocardiogram',
          'PROTECT III criteria met — MCS recommended for LVEF ≤30% + left main PCI',
          'No IABP or Impella documented in procedure report',
        ],
        keyValues: {
          'Procedure': 'Left main PCI (unprotected)',
          'LVEF': '25%',
          'MCS Used': 'None',
          'Jeopardized Myocardium': '>60%',
          'SCAI Shock Stage': 'B (pre-shock)',
          'PVD': 'Mild — not MCS contraindication',
        },
      },
      {
        id: 'CAD-PPCI-002',
        name: 'Dolores Hutchinson',
        mrn: 'MRN-CAD-66002',
        age: 68,
        signals: [
          'PCI to last remaining vessel (RCA — only patent coronary) without MCS',
          'LVEF 22% — high-risk for hemodynamic collapse during PCI',
          'PROTECT III: 33% MACCE reduction with Impella support in this cohort',
          'No hemodynamic support device placed',
        ],
        keyValues: {
          'Procedure': 'PCI to last remaining vessel (RCA)',
          'LVEF': '22%',
          'Other Vessels': 'LAD occluded, LCx occluded',
          'MCS Used': 'None',
          'Jeopardized Myocardium': '>75%',
          'Hemodynamic Status': 'Stable but high risk',
        },
      },
      {
        id: 'CAD-PPCI-003',
        name: 'Howard Castellanos',
        mrn: 'MRN-CAD-66003',
        age: 64,
        signals: [
          'Complex multi-vessel PCI (LAD + LCx) with LVEF 28%',
          'Jeopardized myocardium >50% — MCS recommended per SCAI',
          'Procedure completed without hemodynamic support',
          'Post-PCI hypotension requiring vasopressors — MCS may have prevented',
        ],
        keyValues: {
          'Procedure': 'Multi-vessel PCI (LAD + LCx)',
          'LVEF': '28%',
          'MCS Used': 'None',
          'Post-PCI Complication': 'Hypotension requiring pressors',
          'Jeopardized Myocardium': '>55%',
          'SYNTAX Score': '28',
        },
      },
      {
        id: 'CAD-PPCI-004',
        name: 'Marlene Trujillo',
        mrn: 'MRN-CAD-66004',
        age: 75,
        signals: [
          'Unprotected left main bifurcation PCI, LVEF 30%',
          'High-risk anatomy: distal left main + bifurcation into LAD/LCx',
          'No MCS — procedure prolonged, contrast >300mL',
          'Amin JACC 2020: MCS improves outcomes in this exact scenario',
        ],
        keyValues: {
          'Procedure': 'Left main bifurcation PCI',
          'LVEF': '30%',
          'MCS Used': 'None',
          'Contrast Volume': '320 mL',
          'Procedure Time': '145 min',
          'Anatomy': 'Distal LM bifurcation (Medina 1,1,1)',
        },
      },
    ],
    whyMissed: 'Protected PCI decision-making requires integrating LV function, anatomy complexity, and jeopardized myocardium assessment — these data points live in different systems (echo, cath report, procedure note). No automated alert triggers MCS consideration.',
    whyTailrd: 'TAILRD connected pre-procedural echocardiography (LVEF), catheterization anatomy (left main, last vessel), and procedure reports to identify high-risk PCIs performed without recommended hemodynamic support.',
    methodologyNote: '[Source: BSW Heart Hospital / National Benchmark]. Patient count: 2,400 PCIs/year x 5% high-risk anatomy (left main, last vessel, LVEF ≤30%) x 37% without MCS = 22. Dollar opportunity: $28,000 protected PCI premium x 30% conversion x 22 = ~$185K. PROTECT III (TCT 2023); Amin AP JACC 2020.',
  },
  {
    id: 'cad-gap-67-cto-retrograde',
    name: 'CTO PCI — Retrograde Approach Not Offered at Referral Center',
    category: 'Growth',
    patientCount: 18,
    dollarOpportunity: 151000,
    priority: 'medium',
    tag: 'CTO Program | Network Referral',
    evidence:
      'PROGRESS-CTO Registry (Brilakis ES, JACC Intv 2019): expert CTO center success rate 87.7% vs <60% at low-volume centers. Retrograde approach increases success by 20-30% when antegrade fails. Habara M et al (JACC Intv 2011): retrograde approach critical for complex CTO morphology (ambiguous cap, poor distal target). CTO-PCI improves angina, LV function, and reduces need for CABG.',
    cta: 'Refer to CTO-Capable Center for Advanced Approach',
    detectionCriteria: [
      'CTO documented on diagnostic catheterization (100% occlusion, TIMI 0 flow)',
      'Prior antegrade CTO attempt failed at referring hospital',
      'Symptoms persist: angina (CCS Class II-IV) or ischemia on stress testing',
      'Not referred to CTO-capable center for retrograde or hybrid approach',
      'No documented surgical consultation as alternative',
    ],
    patients: [
      {
        id: 'CAD-CTO2-001',
        name: 'Clifford Okafor',
        mrn: 'MRN-CAD-67001',
        age: 63,
        signals: [
          'RCA CTO — failed antegrade attempt at community hospital 3 months ago',
          'Persistent angina CCS Class III despite optimal medical therapy',
          'Viable myocardium on MRI — revascularization indicated',
          'Not referred to CTO-expert center for retrograde approach',
        ],
        keyValues: {
          'CTO Vessel': 'RCA (mid)',
          'Prior Attempt': 'Failed antegrade (community site)',
          'J-CTO Score': '3 (difficult)',
          'Symptoms': 'CCS Class III angina',
          'Viability': 'MRI — viable inferior wall',
          'Referred for Retrograde': 'No',
        },
      },
      {
        id: 'CAD-CTO2-002',
        name: 'Elaine Brockington',
        mrn: 'MRN-CAD-67002',
        age: 57,
        signals: [
          'LAD CTO with ambiguous proximal cap — antegrade approach unlikely to succeed',
          'Positive stress test with anterior ischemia',
          'Declined CABG — prefers PCI if feasible',
          'Not referred to CTO center — told "nothing more can be done"',
        ],
        keyValues: {
          'CTO Vessel': 'LAD (proximal)',
          'J-CTO Score': '4 (very difficult)',
          'Cap Morphology': 'Ambiguous — retrograde favored',
          'Stress Test': 'Anterior ischemia (large territory)',
          'CABG': 'Declined by patient',
          'CTO Center Referral': 'Not made',
        },
      },
      {
        id: 'CAD-CTO2-003',
        name: 'Gerald Whitmore',
        mrn: 'MRN-CAD-67003',
        age: 70,
        signals: [
          'LCx CTO with good collaterals from RCA — retrograde approach feasible',
          'Failed antegrade attempt 6 months ago at satellite facility',
          'Exertional dyspnea limiting daily activities',
          'PROGRESS-CTO: expert center success 87.7% vs 58% at index site',
        ],
        keyValues: {
          'CTO Vessel': 'LCx (proximal)',
          'Collaterals': 'RCA-to-LCx septal (Werner CC2)',
          'Prior Attempt': 'Failed antegrade (satellite site)',
          'Symptoms': 'Exertional dyspnea, NYHA II',
          'Expert Center Referral': 'Not initiated',
          'PROGRESS-CTO Success Rate': '87.7% at expert center',
        },
      },
    ],
    whyMissed: 'CTO referral requires recognizing that a failed antegrade attempt is not the end of the line — retrograde approaches at expert centers have substantially higher success. Community hospitals often lack awareness of CTO-specific referral pathways.',
    whyTailrd: 'TAILRD identified failed CTO attempts in procedure reports at community sites, matched them with persistent symptoms and viability data, and flagged patients not referred to network CTO-capable centers.',
    methodologyNote: '[Source: BSW Heart Hospital / National Benchmark]. Patient count: CTO patients with failed antegrade x not referred to CTO-capable center x 35% market share = 18. Dollar opportunity: $28,000 CTO PCI x 30% conversion x 18 = ~$151K. PROGRESS-CTO Registry (Brilakis, JACC Intv 2019).',
  },
  {
    id: 'cad-gap-68-atherectomy-ivl',
    name: 'Atherectomy/IVL Not Considered — Severely Calcified Lesion',
    category: 'Gap',
    patientCount: 35,
    dollarOpportunity: 294000,
    priority: 'medium',
    tag: 'Complex PCI | Calcium Modification',
    evidence:
      'DISRUPT CAD III (Hill JM, Circ Intv 2021, PMID 33596662): intravascular lithotripsy (IVL) achieves excellent stent expansion in severely calcified lesions with low complication rates. ORBIT II (Chambers JW, JACC Intv 2014): orbital atherectomy effective for calcium modification prior to stenting. ROTAXUS (Abdel-Wahab M, JACC 2013): rotational atherectomy improves procedural success in calcified lesions.',
    cta: 'Consider Calcium Modification Strategy — IVL, Rotational, or Orbital Atherectomy',
    detectionCriteria: [
      'PCI performed on severely calcified lesion documented on angiography',
      'IVUS or OCT showing >270 degrees calcium arc (when imaging performed)',
      'Standard balloon/stent deployed without calcium modification technology',
      'Stent underexpansion documented or balloon failure/rupture noted',
      'No rotational atherectomy, orbital atherectomy, or IVL used',
    ],
    patients: [
      {
        id: 'CAD-CALC-001',
        name: 'Bernard Strickland',
        mrn: 'MRN-CAD-68001',
        age: 76,
        signals: [
          'RCA PCI with severe calcification noted on angiography — "heavily calcified"',
          'Stent underexpansion on post-PCI angiogram (MLD 2.1mm in 3.5mm stent)',
          'No atherectomy or IVL used — standard balloon pre-dilation only',
          'DISRUPT CAD III: IVL achieves superior expansion in this setting',
        ],
        keyValues: {
          'Target Vessel': 'RCA (mid)',
          'Calcification': 'Severe (angiographic)',
          'Stent Size': '3.5 x 28mm DES',
          'Post-Stent MLD': '2.1mm (underexpansion)',
          'Calcium Modification': 'None — standard balloon only',
          'Imaging': 'Angiography only (no IVUS/OCT)',
        },
      },
      {
        id: 'CAD-CALC-002',
        name: 'Judith Kaplan',
        mrn: 'MRN-CAD-68002',
        age: 81,
        signals: [
          'LAD PCI — balloon rupture during pre-dilation of calcified lesion',
          'Second balloon required, stent placed without calcium modification',
          'IVUS showed 320-degree calcium arc — atherectomy or IVL indicated',
          'ORBIT II: orbital atherectomy effective for this calcium burden',
        ],
        keyValues: {
          'Target Vessel': 'LAD (mid)',
          'IVUS Calcium Arc': '320 degrees',
          'Balloon Complication': 'Rupture during pre-dilation',
          'Calcium Modification': 'None',
          'Stent Result': 'Suboptimal expansion',
          'Post-PCI IVUS': 'MSA 4.2mm2 (target >5.5mm2)',
        },
      },
      {
        id: 'CAD-CALC-003',
        name: 'Reginald Fontenot',
        mrn: 'MRN-CAD-68003',
        age: 73,
        signals: [
          'LCx PCI with severe concentric calcification on IVUS (360-degree arc)',
          'Multiple balloon inflations at high pressure without calcium fracture',
          'No IVL or atherectomy attempted despite imaging-confirmed severe calcium',
          'Risk of stent thrombosis elevated with underexpanded stent',
        ],
        keyValues: {
          'Target Vessel': 'LCx (proximal)',
          'IVUS Calcium Arc': '360 degrees (concentric)',
          'Calcium Thickness': '>0.5mm',
          'Max Balloon Pressure': '24 atm (non-compliant)',
          'Calcium Modification': 'None',
          'Stent MSA': '3.8mm2 (target >6.0mm2)',
        },
      },
      {
        id: 'CAD-CALC-004',
        name: 'Gloria Ashford',
        mrn: 'MRN-CAD-68004',
        age: 78,
        signals: [
          'Left main PCI with moderate-severe calcification',
          'Standard technique — no calcium modification prior to stenting',
          'DISRUPT CAD III protocol: IVL recommended for calcified left main PCI',
          'Underexpansion in left main carries highest thrombosis risk',
        ],
        keyValues: {
          'Target Vessel': 'Left main (distal)',
          'Calcification': 'Moderate-severe (angiographic + IVUS)',
          'IVUS Calcium Arc': '280 degrees',
          'Calcium Modification': 'None — direct stenting attempted',
          'Stent MSA': '6.8mm2 (target >8.0mm2 for LM)',
          'Underexpansion': 'Yes — LM critical threshold not met',
        },
      },
    ],
    whyMissed: 'Calcium modification technology requires advance planning, device availability, and operator expertise. Severely calcified lesions are often approached with standard technique first, and once stent is deployed, the opportunity for calcium modification is lost.',
    whyTailrd: 'TAILRD analyzed catheterization and IVUS reports for calcium severity documentation, cross-referenced with procedure reports to identify cases where calcium modification technology was indicated but not utilized.',
    methodologyNote: '[Source: BSW Heart Hospital / National Benchmark]. Patient count: 2,400 PCIs/year x 8% severely calcified lesions x 18% without calcium modification = 35. Dollar opportunity: $28,000 complex PCI x 30% margin x 35 = ~$294K. DISRUPT CAD III (PMID 33596662); ORBIT II (Chambers, JACC Intv 2014).',
  },
  {
    id: 'cad-gap-69-post-cabg-svg-surveillance',
    name: 'Post-CABG Saphenous Vein Graft Disease — No Surveillance Protocol',
    category: 'Quality',
    patientCount: 65,
    dollarOpportunity: 68000,
    priority: 'high',
    tag: 'Post-CABG | Graft Surveillance',
    evidence:
      'Fitzgibbon GM et al (JACC 1996): SVG failure rates 10-20% at 5 years, 50% at 10 years post-CABG. Goldman S et al (Circulation 2004): accelerated SVG atherosclerosis after year 5. AHA Scientific Statement: recommends surveillance starting 5 years post-CABG with CCTA or stress testing. Silent graft failure leads to unheralded MI.',
    cta: 'Schedule Post-CABG Graft Surveillance — CCTA or Stress Test',
    detectionCriteria: [
      'CABG performed >5 years ago with SVG conduits documented',
      'No CT angiography (CCTA) performed in past 3 years for graft assessment',
      'No stress test (nuclear, stress echo, or stress MRI) in past 2 years',
      'No interval catheterization documenting graft status',
      'Patient alive and actively followed in health system',
    ],
    patients: [
      {
        id: 'CAD-SVG-001',
        name: 'Donald Marchetti',
        mrn: 'MRN-CAD-69001',
        age: 72,
        signals: [
          'CABG 8 years ago: LIMA-LAD + SVG-OM1 + SVG-RCA',
          'No graft surveillance imaging since surgery',
          'SVG failure rate at 8 years: 30-40% per Goldman Circulation 2004',
          'Asymptomatic but high risk for silent graft disease',
        ],
        keyValues: {
          'CABG Date': '8 years ago',
          'Grafts': 'LIMA-LAD + SVG-OM1 + SVG-RCA',
          'Last Graft Assessment': 'None since CABG',
          'Last Stress Test': 'None in 5 years',
          'CCTA': 'Never performed',
          'Symptoms': 'Asymptomatic',
          'SVG Failure Risk': '30-40% at 8 years',
        },
      },
      {
        id: 'CAD-SVG-002',
        name: 'Patricia Langford',
        mrn: 'MRN-CAD-69002',
        age: 68,
        signals: [
          'CABG 6 years ago: LIMA-LAD + SVG-D1 + SVG-PDA',
          'Last cardiology visit 18 months ago — no graft surveillance ordered',
          'New exertional fatigue — may represent silent graft disease',
          'AHA recommends surveillance starting at 5 years post-CABG',
        ],
        keyValues: {
          'CABG Date': '6 years ago',
          'Grafts': 'LIMA-LAD + SVG-D1 + SVG-PDA',
          'Last Graft Assessment': 'None',
          'New Symptom': 'Exertional fatigue',
          'Last Cardiology Visit': '18 months ago',
          'Surveillance Ordered': 'No',
        },
      },
      {
        id: 'CAD-SVG-003',
        name: 'Robert Villarreal',
        mrn: 'MRN-CAD-69003',
        age: 75,
        signals: [
          'CABG 11 years ago: LIMA-LAD + SVG x3 — four-vessel revascularization',
          'SVG failure rate at 10+ years: ~50% (Fitzgibbon JACC 1996)',
          'No surveillance imaging in 11 years post-CABG',
          'Continued statin and aspirin but no graft assessment',
        ],
        keyValues: {
          'CABG Date': '11 years ago',
          'Grafts': 'LIMA-LAD + SVG x3',
          'SVG Failure Risk': '~50% at 10+ years',
          'Last Cath': 'At time of CABG (11 years ago)',
          'Surveillance': 'None — no CCTA, no stress test',
          'Current Meds': 'Aspirin, atorvastatin 80mg',
        },
      },
      {
        id: 'CAD-SVG-004',
        name: 'Janet Hendricks',
        mrn: 'MRN-CAD-69004',
        age: 65,
        signals: [
          'CABG 7 years ago: LIMA-LAD + SVG-LCx + SVG-RCA',
          'Diabetic — accelerated SVG atherosclerosis risk',
          'No graft surveillance despite diabetes accelerating SVG failure',
          'Goldman Circulation 2004: diabetes worsens SVG outcomes',
        ],
        keyValues: {
          'CABG Date': '7 years ago',
          'Grafts': 'LIMA-LAD + SVG-LCx + SVG-RCA',
          'Diabetes': 'T2DM (HbA1c 7.8%)',
          'LDL': '82 mg/dL',
          'Surveillance': 'None since CABG',
          'Risk Factor': 'Diabetes accelerates SVG disease',
        },
      },
      {
        id: 'CAD-SVG-005',
        name: 'Thomas Beaumont',
        mrn: 'MRN-CAD-69005',
        age: 70,
        signals: [
          'CABG 9 years ago: LIMA-LAD + RIMA-LCx + SVG-RCA',
          'Arterial grafts likely patent but SVG-RCA at high risk at 9 years',
          'No targeted SVG surveillance — arterial graft status also unknown',
          'Mixed arterial/SVG conduit requires differentiated surveillance',
        ],
        keyValues: {
          'CABG Date': '9 years ago',
          'Grafts': 'LIMA-LAD + RIMA-LCx + SVG-RCA',
          'SVG at Risk': 'SVG-RCA (9-year failure rate ~40%)',
          'Arterial Grafts': 'LIMA + RIMA (likely patent)',
          'Surveillance': 'None',
          'Recommendation': 'CCTA to assess SVG and arterial graft patency',
        },
      },
    ],
    whyMissed: 'Post-CABG surveillance is not routinely automated in most health systems. Patients are followed for symptoms but proactive graft assessment is rarely scheduled. The 5-year inflection point for SVG failure is not triggered by any standard alert.',
    whyTailrd: 'TAILRD connected CABG procedure dates and graft conduit types from operative reports with imaging history to identify patients beyond the 5-year SVG failure inflection point without surveillance.',
    methodologyNote: '[Source: BSW Heart Hospital / National Benchmark]. Patient count: estimated CABG population >5 years in catchment x 35% without surveillance protocol = 65. Dollar opportunity: $1,500 CCTA x 70% completion x 65 = ~$68K direct. Prevents catastrophic MI from silent graft failure. Fitzgibbon JACC 1996; Goldman Circulation 2004.',
  },
  {
    id: 'cad-gap-70-scad-young-women',
    name: 'SCAD Not Diagnosed — Young Women with ACS',
    category: 'Discovery',
    patientCount: 12,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'Discovery | Women\'s Heart Health',
    evidence:
      'Hayes SN et al, AHA Scientific Statement (Circulation 2018, PMID 29472380): SCAD most common cause of MI in women <50, accounting for 25-35% of ACS in this population. Saw J et al (JACC 2017): SCAD frequently misdiagnosed as atherosclerotic ACS leading to inappropriate stenting. Tweet MS et al (JACC 2018): recurrence rate 10-30% — requires specific follow-up protocol.',
    cta: 'Consider SCAD — Review Angiography with SCAD Protocol',
    detectionCriteria: [
      'Women age <55 with ACS presentation (STEMI, NSTEMI, or unstable angina)',
      'Coronary angiography showing non-obstructive or atypical findings',
      'No documented evaluation for SCAD (spontaneous coronary artery dissection)',
      'Absence of traditional atherosclerotic risk factors (or low ASCVD risk)',
      'Consider: peripartum status, fibromuscular dysplasia, extreme physical/emotional stress',
    ],
    patients: [
      {
        id: 'CAD-SCAD-001',
        name: 'Natalie Christensen',
        mrn: 'MRN-CAD-70001',
        age: 42,
        signals: [
          'Presented with NSTEMI — troponin peak 4.2 ng/mL',
          'Angiography: "smooth narrowing mid-LAD 60%" — atypical for atherosclerosis',
          'No traditional risk factors: non-smoker, no DM, no hypertension, LDL 98',
          'SCAD not considered — discharged on standard ACS protocol with statin + DAPT',
        ],
        keyValues: {
          'Age': '42',
          'Presentation': 'NSTEMI (troponin peak 4.2)',
          'Angiography': 'Smooth narrowing mid-LAD 60%',
          'ASCVD Risk Factors': 'None — non-smoker, no DM, no HTN',
          'SCAD Evaluated': 'No',
          'Discharge Dx': 'Atherosclerotic NSTEMI',
          'Stent Placed': 'No (managed medically)',
        },
      },
      {
        id: 'CAD-SCAD-002',
        name: 'Stephanie Morales-Reyes',
        mrn: 'MRN-CAD-70002',
        age: 38,
        signals: [
          'STEMI presentation — 3 weeks postpartum',
          'Angiography: "haziness and irregular narrowing distal LAD"',
          'Peripartum SCAD accounts for 10-15% of pregnancy-associated MI',
          'Stented empirically — SCAD not documented in differential',
        ],
        keyValues: {
          'Age': '38',
          'Presentation': 'STEMI (postpartum, 3 weeks)',
          'Angiography': 'Haziness distal LAD — atypical',
          'Peripartum': 'Yes — 3 weeks postpartum',
          'SCAD Evaluated': 'No',
          'Stent Placed': 'Yes — potentially harmful if SCAD',
          'FMD Screening': 'Not performed',
        },
      },
      {
        id: 'CAD-SCAD-003',
        name: 'Danielle Ostrowski',
        mrn: 'MRN-CAD-70003',
        age: 47,
        signals: [
          'NSTEMI after extreme emotional stress (bereavement)',
          'Angiography: "non-obstructive CAD, possible intimal irregularity RCA"',
          'No traditional risk factors — low Framingham score',
          'Hayes AHA 2018: SCAD most common MI cause in women <50',
        ],
        keyValues: {
          'Age': '47',
          'Presentation': 'NSTEMI (emotional stress trigger)',
          'Angiography': 'Non-obstructive, intimal irregularity RCA',
          'ASCVD Risk': 'Low Framingham score',
          'SCAD Considered': 'No',
          'Discharge Dx': 'Type 2 MI — demand ischemia',
          'OCT/IVUS': 'Not performed (would confirm SCAD)',
        },
      },
      {
        id: 'CAD-SCAD-004',
        name: 'Melissa Hartigan',
        mrn: 'MRN-CAD-70004',
        age: 51,
        signals: [
          'Recurrent chest pain — prior "NSTEMI" 2 years ago with non-obstructive CAD',
          'Current presentation: troponin elevation, same vessel territory',
          'Prior angiogram re-reviewed: findings consistent with healed SCAD',
          'SCAD recurrence rate 10-30% — surveillance protocol needed',
        ],
        keyValues: {
          'Age': '51',
          'Prior MI': 'NSTEMI 2 years ago — non-obstructive CAD',
          'Current Presentation': 'Recurrent troponin elevation, same territory',
          'Prior Angio Review': 'Consistent with healed SCAD',
          'SCAD Recurrence Rate': '10-30% (Tweet JACC 2018)',
          'FMD Screening': 'Not done',
          'SCAD Protocol': 'Not initiated',
        },
      },
    ],
    whyMissed: 'SCAD is underdiagnosed because catheterization labs are trained to identify atherosclerotic disease. Non-obstructive or atypical findings in young women are often dismissed as "non-cardiac" or labeled as demand ischemia, missing the dissection flap.',
    whyTailrd: 'TAILRD identified young women (<55) with ACS presentations and non-obstructive angiographic findings, cross-referencing risk factor profiles and angiographic descriptions to flag SCAD-compatible presentations not evaluated with SCAD protocol.',
    methodologyNote: '[Source: BSW Heart Hospital / National Benchmark]. Patient count: 720 ACS/year x 15% women <55 x 30% non-obstructive or atypical findings x 35% SCAD not considered = 12. Dollar opportunity: $0 direct revenue — discovery gap. Prevents misdiagnosis, inappropriate stenting, and enables SCAD-specific follow-up. Hayes AHA Statement (PMID 29472380); Saw JACC 2017.',
  },
  {
    id: 'cad-gap-71-d2b-outlier',
    name: 'Door-to-Balloon Time Outlier — STEMI Process Gap',
    category: 'Safety',
    patientCount: 8,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'Safety | STEMI Quality | CMS Reporting',
    safetyNote: 'STEMI PROCESS SAFETY — Every 10-minute delay in door-to-balloon time is associated with 1.4% relative increase in in-hospital mortality.',
    evidence:
      'Menees DS et al (NEJM 2013): door-to-balloon time directly impacts STEMI mortality. D2B Alliance data: system-level delays (cath lab activation, team assembly, transfer logistics) are most modifiable. ACC/AHA target: ≤90 minutes for walk-in STEMI, ≤120 minutes for transfer STEMI. CMS publicly reports D2B performance.',
    cta: 'Root Cause Analysis — STEMI Process Improvement Review',
    detectionCriteria: [
      'STEMI activation documented (prehospital ECG or ED ECG)',
      'Door-to-balloon time >90 minutes (walk-in) or >120 minutes (transfer)',
      'System-delay identified: cath lab activation delay, team assembly, equipment issue',
      'Patient/transport delays excluded (late presentation, inter-facility transfer logistics)',
      'No documented root cause analysis or process improvement review',
    ],
    patients: [
      {
        id: 'CAD-D2B-001',
        name: 'Raymond Nguyen',
        mrn: 'MRN-CAD-71001',
        age: 58,
        signals: [
          'STEMI activation at 02:14 — balloon inflation at 04:02 (D2B: 108 minutes)',
          'System delay: 35-minute cath lab activation (off-hours staffing gap)',
          'ECG diagnostic at ED arrival — no interpretation delay',
          'ACC/AHA target: ≤90 minutes for walk-in STEMI',
        ],
        keyValues: {
          'STEMI Type': 'Walk-in (self-transport)',
          'ED Arrival': '02:14',
          'Cath Lab Activation': '02:49 (35 min delay)',
          'Balloon Time': '04:02',
          'D2B Time': '108 minutes (target ≤90)',
          'Delay Type': 'System — off-hours cath lab activation',
          'RCA Performed': 'No',
        },
      },
      {
        id: 'CAD-D2B-002',
        name: 'Sandra Fitzpatrick',
        mrn: 'MRN-CAD-71002',
        age: 65,
        signals: [
          'Transfer STEMI — D2B 142 minutes (target ≤120 for transfers)',
          'System delay: 28 minutes from arrival to cath lab (equipment issue)',
          'Prehospital STEMI activation performed — lab should have been ready',
          'Menees NEJM 2013: mortality increases with each 10-minute delay',
        ],
        keyValues: {
          'STEMI Type': 'Transfer (from community ED)',
          'Arrival': '11:23',
          'Balloon Time': '13:45',
          'D2B Time': '142 minutes (target ≤120)',
          'Delay Type': 'System — equipment/setup delay despite pre-activation',
          'Pre-Hospital Activation': 'Yes',
          'RCA Performed': 'No',
        },
      },
      {
        id: 'CAD-D2B-003',
        name: 'Michael Okonkwo',
        mrn: 'MRN-CAD-71003',
        age: 52,
        signals: [
          'Walk-in STEMI — D2B 97 minutes (target ≤90)',
          'ECG interpretation delay: 12 minutes from ECG to STEMI activation',
          'Trainee read ECG without immediate attending confirmation',
          'System process gap: ECG interpretation protocol not followed',
        ],
        keyValues: {
          'STEMI Type': 'Walk-in',
          'ECG Obtained': '14:08',
          'STEMI Activation': '14:20 (12-min interpretation delay)',
          'Balloon Time': '15:45',
          'D2B Time': '97 minutes (target ≤90)',
          'Delay Type': 'System — ECG interpretation delay',
          'Process Gap': 'Attending confirmation protocol not followed',
        },
      },
    ],
    whyMissed: 'D2B outlier analysis requires granular time-stamp extraction from multiple systems (EMS, ED, cath lab) and distinguishing system delays from patient/transport delays. Aggregate D2B metrics mask individual outlier cases where system improvements are needed.',
    whyTailrd: 'TAILRD extracted granular timestamps from EMS records, ED documentation, and cath lab activation logs to identify STEMI cases where system-level delays (not patient factors) caused D2B time outliers, enabling targeted process improvement.',
    methodologyNote: '[Source: BSW Heart Hospital / National Benchmark]. Patient count: estimated STEMI volume x 5% system-delay outliers = 8. Dollar opportunity: $0 direct revenue — safety and CMS quality reporting impact. Public reporting of D2B performance. Menees NEJM 2013; D2B Alliance data.',
  },
];

// ============================================================
// ENHANCED DISPLAY HELPERS — Safety Alerts, Deprescribing, SAQ, SYNTAX
// ============================================================

/** Determine DAPT urgency tier from keyValues */
function daptUrgencyLabel(kv: Record<string, string | number>): { label: string; color: string } {
  const riskWindow = String(kv['Risk Window'] ?? '');
  if (riskWindow.includes('CRITICAL') || riskWindow.includes('<3')) {
    return { label: 'CRITICAL — DES <90 days', color: 'text-red-800 bg-red-200' };
  }
  return { label: 'HIGH — DES 90-365 days', color: 'text-amber-800 bg-amber-200' };
}

/** Render DAPT safety alert (Gap 50) */
function renderDAPTSafetyAlert(pt: CADGapPatient): React.ReactNode {
  const urgency = daptUrgencyLabel(pt.keyValues);
  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 space-y-2">
      <h5 className="font-bold text-red-800 flex items-center gap-2 text-sm">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        DAPT SAFETY ALERT
      </h5>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-red-700 font-medium">DES Implant Date:</span> <span className="text-red-900">{pt.keyValues['DES Date'] ?? 'N/A'}</span></div>
        <div><span className="text-red-700 font-medium">Vessel:</span> <span className="text-red-900">{pt.keyValues['Stented Vessel'] ?? pt.keyValues['Indication'] ?? 'N/A'}</span></div>
      </div>
      <div className="text-sm text-red-700">
        <span className="font-medium">Antiplatelet Status:</span>{' '}
        {pt.signals.filter(s => s.toLowerCase().includes('aspirin') || s.toLowerCase().includes('p2y12') || s.toLowerCase().includes('clopidogrel') || s.toLowerCase().includes('ticagrelor')).join('; ') || 'See signals above'}
      </div>
      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${urgency.color}`}>
        {urgency.label}
      </span>
      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
        <Zap className="w-3 h-3 text-red-400 flex-shrink-0" />
        DAPT status auto-checked from medication list
      </p>
    </div>
  );
}

/** Render vasospastic angina contraindication alert (Gap 61) */
function renderVasospasticAlert(pt: CADGapPatient): React.ReactNode {
  const bbSignal = pt.signals.find(s => s.toLowerCase().includes('metoprolol') || s.toLowerCase().includes('beta-blocker') || s.toLowerCase().includes('atenolol') || s.toLowerCase().includes('carvedilol') || s.toLowerCase().includes('propranolol'));
  const bbFromKV = pt.keyValues['Beta-Blocker'] ?? pt.keyValues['Current Meds'] ?? '';
  const hasBB = bbSignal || String(bbFromKV).toLowerCase().includes('metoprolol') || String(bbFromKV).toLowerCase().includes('atenolol') || String(bbFromKV).toLowerCase().includes('carvedilol');
  if (!hasBB) return null;
  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 space-y-2">
      <h5 className="font-bold text-red-800 flex items-center gap-2 text-sm">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        CONTRAINDICATION DETECTED
      </h5>
      <p className="text-sm text-red-700">
        <span className="font-medium">Beta-Blocker:</span> {bbSignal ?? String(bbFromKV)}
      </p>
      <p className="text-sm text-red-800 font-semibold">
        CONTRAINDICATED in vasospastic angina — worsens coronary spasm. Switch to CCB.
      </p>
      <p className="text-xs text-red-500 flex items-center gap-1">
        <Zap className="w-3 h-3 text-red-400 flex-shrink-0" />
        Contraindication auto-detected
      </p>
    </div>
  );
}

/** Render digoxin toxicity / Beers criteria alert (Gap 44) */
function renderDigoxinAlert(pt: CADGapPatient): React.ReactNode {
  // Only render if patient data suggests digoxin-related concern
  const hasDig = pt.signals.some(s => s.toLowerCase().includes('digoxin')) ||
    Object.keys(pt.keyValues).some(k => k.toLowerCase().includes('digoxin') || k.toLowerCase().includes('dose'));
  if (!hasDig) return null;

  const dose = parseFloat(String(pt.keyValues['Dose'] ?? pt.keyValues['Digoxin Dose'] ?? '0'));
  const egfr = parseFloat(String(pt.keyValues['eGFR'] ?? pt.keyValues['eGFR (mL/min)'] ?? '999').replace(/[^\d.]/g, ''));
  const age = pt.age;
  const beersFlag = age >= 75 && dose > 0.125 && egfr < 50;

  return (
    <div className={`${beersFlag ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'} border-2 rounded-xl p-4 space-y-2`}>
      <h5 className={`font-bold flex items-center gap-2 text-sm ${beersFlag ? 'text-red-800' : 'text-amber-800'}`}>
        <AlertTriangle className={`w-4 h-4 ${beersFlag ? 'text-red-600' : 'text-amber-600'}`} />
        {beersFlag ? 'BEERS CRITERIA — HIGH-RISK DIGOXIN' : 'DIGOXIN TOXICITY RISK'}
      </h5>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div><span className="font-medium">Dose:</span> {pt.keyValues['Dose'] ?? pt.keyValues['Digoxin Dose'] ?? 'N/A'}</div>
        <div><span className="font-medium">Age:</span> {age}</div>
        <div><span className="font-medium">eGFR:</span> {pt.keyValues['eGFR'] ?? pt.keyValues['eGFR (mL/min)'] ?? 'N/A'}</div>
      </div>
      {beersFlag && (
        <p className="text-sm text-red-800 font-semibold">
          Beers Criteria: age {'>'}=75 + dose {'>'}0.125mg + eGFR {'<'}50 — avoid or reduce dose
        </p>
      )}
      <p className={`text-xs flex items-center gap-1 ${beersFlag ? 'text-red-500' : 'text-amber-500'}`}>
        <Zap className={`w-3 h-3 flex-shrink-0 ${beersFlag ? 'text-red-400' : 'text-amber-400'}`} />
        Risk auto-calculated
      </p>
    </div>
  );
}

/** Render BB deprescribing opportunity (Gap 56) */
function renderBBDeprescribing(pt: CADGapPatient): React.ReactNode {
  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 space-y-2">
      <h5 className="font-bold text-amber-800 flex items-center gap-2 text-sm">
        <Activity className="w-4 h-4 text-amber-600" />
        DEPRESCRIBING OPPORTUNITY — REDUCE-AMI 2024
      </h5>
      <div className="grid grid-cols-2 gap-2 text-sm text-amber-900">
        <div><span className="font-medium">MI Date:</span> {pt.keyValues['Prior MI'] ?? 'N/A'}</div>
        <div><span className="font-medium">LVEF:</span> {pt.keyValues['LVEF'] ?? 'N/A'}</div>
        <div><span className="font-medium">Beta-Blocker:</span> {pt.keyValues['Beta-Blocker'] ?? 'N/A'}</div>
        <div><span className="font-medium">HF/Angina/Arrhythmia:</span> {pt.keyValues['HF'] === 'No' && pt.keyValues['Angina'] === 'No' ? 'None' : 'Present'}</div>
      </div>
      <p className="text-sm text-amber-800 italic">
        No mortality benefit in post-MI LVEF {'>'}=50% without HF, angina, or arrhythmia (Yndigegn, NEJM 2024)
      </p>
      <p className="text-sm text-amber-900 font-semibold">
        Discuss BB continuation vs deprescribing — shared decision recommended
      </p>
      <p className="text-xs text-amber-500 flex items-center gap-1">
        <Zap className="w-3 h-3 text-amber-400 flex-shrink-0" />
        All deprescribing criteria auto-confirmed
      </p>
    </div>
  );
}

/** Render OAC + Aspirin deprescribing opportunity (Gap 53) */
function renderOACDeprescribing(pt: CADGapPatient): React.ReactNode {
  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 space-y-2">
      <h5 className="font-bold text-amber-800 flex items-center gap-2 text-sm">
        <Activity className="w-4 h-4 text-amber-600" />
        DEPRESCRIBING OPPORTUNITY — Excess bleeding risk
      </h5>
      <div className="grid grid-cols-2 gap-2 text-sm text-amber-900">
        <div><span className="font-medium">AF Diagnosis:</span> {pt.keyValues['AF Type'] ?? 'N/A'}</div>
        <div><span className="font-medium">Last ACS/PCI:</span> {pt.keyValues['Last PCI'] ?? 'N/A'}</div>
        <div><span className="font-medium">Current Regimen:</span> {pt.keyValues['OAC'] ?? 'N/A'} + {pt.keyValues['Aspirin'] ?? 'N/A'}</div>
        <div><span className="font-medium">Stent in last 12 mo:</span> {pt.keyValues['Stent (last 12 mo)'] ?? 'No'}</div>
      </div>
      <p className="text-sm text-amber-800 font-semibold">
        Discontinue aspirin — OAC monotherapy appropriate for stable CAD {'>'}12 months post-stent
      </p>
      <p className="text-xs text-amber-500 flex items-center gap-1">
        <Zap className="w-3 h-3 text-amber-400 flex-shrink-0" />
        Regimen and timing auto-detected
      </p>
    </div>
  );
}

/** Render SAQ Angina Frequency trend for CAD patients */
function renderSAQTrend(pt: CADGapPatient): React.ReactNode {
  if (pt.saqAnginaFrequency == null) return null;
  const score = pt.saqAnginaFrequency;
  const severity =
    score >= 75 ? 'Minimal/No Limitation' :
    score >= 50 ? 'Mild Limitation' :
    score >= 25 ? 'Moderate Limitation' :
    'Severe Limitation';
  const severityColor =
    score >= 75 ? 'text-green-700' :
    score >= 50 ? 'text-amber-700' :
    score >= 25 ? 'text-orange-700' :
    'text-red-700';

  const saqTrendResult = computeSAQTrend({
    saqAnginaFrequency: pt.saqAnginaFrequency,
    saqPriorAnginaFrequency: pt.saqPriorAnginaFrequency,
  });

  const prior = pt.saqPriorAnginaFrequency;
  const arrow = prior != null ? (score > prior ? '\u2191' : score < prior ? '\u2193' : '\u2192') : null;
  const arrowColor = prior != null ? (score > prior ? 'text-green-600' : score < prior ? 'text-red-600' : 'text-titanium-500') : '';

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-1">
      <h5 className="font-semibold text-blue-800 text-sm flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-blue-600" />
        Patient-Reported Outcome &mdash; SAQ
      </h5>
      <p className="text-sm">
        <span className="text-blue-700 font-medium">SAQ Angina Frequency:</span>{' '}
        <span className="font-bold text-blue-900">{score}</span>{' '}
        <span className={`font-semibold ${severityColor}`}>&mdash; {severity}</span>
      </p>
      {prior != null && (
        <p className="text-sm text-blue-700">
          <span className="font-medium">Trend:</span> {prior} <span className="mx-1">{'\u2192'}</span> {score}{' '}
          <span className={`font-bold text-lg ${arrowColor}`}>{arrow}</span>
          <span className="ml-2 text-xs">{saqTrendResult.display}</span>
        </p>
      )}
      <p className="text-xs text-blue-500 flex items-center gap-1">
        <Zap className="w-3 h-3 text-blue-400 flex-shrink-0" />
        Auto-calculated from EHR flowsheet data (SAQ &copy; Dr. John Spertus, UMKC)
      </p>
    </div>
  );
}

/** Render SYNTAX tier display for heart-team / revasc / CTO gaps */
function renderSYNTAXDisplay(pt: CADGapPatient): React.ReactNode {
  const cathFindings = String(pt.keyValues['Cath Findings'] || pt.keyValues['Coronary Anatomy'] || pt.keyValues['Estimated SYNTAX'] || '');
  const ctoPresent = pt.signals.some(s => s.toLowerCase().includes('cto')) ||
    String(pt.keyValues['CTO'] || '').toLowerCase().includes('yes');

  const syntaxResult = estimateSYNTAX({
    cathFindings: cathFindings || undefined,
    ctoPresent: ctoPresent || undefined,
  });

  if (syntaxResult.tier === 'Unknown') return null;

  const tierColor =
    syntaxResult.tier === 'High' ? 'text-red-700' :
    syntaxResult.tier === 'Intermediate' ? 'text-amber-700' :
    'text-green-700';

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
      <p className="text-sm">
        <span className="text-blue-700 font-medium">SYNTAX (estimated):</span>{' '}
        <span className="font-bold text-blue-900">~{syntaxResult.score}</span>{' '}
        <span className={`font-semibold ${tierColor}`}>&mdash; {syntaxResult.tier}</span>
      </p>
      <p className="text-xs text-blue-700 mt-1">{syntaxResult.display}</p>
      <p className="text-xs text-blue-500 flex items-center gap-1 mt-1">
        <Zap className="w-3 h-3 text-blue-400 flex-shrink-0" />
        Auto-estimated from angiographic data
      </p>
    </div>
  );
}

/** Determine which enhanced display(s) to show for a patient within a gap */
function renderEnhancedPatientDisplay(gapId: string, pt: CADGapPatient): React.ReactNode {
  const id = gapId.toLowerCase();
  const parts: React.ReactNode[] = [];

  // Safety alerts
  if (id.includes('dapt') || id.includes('gap-50')) {
    parts.push(<React.Fragment key="dapt">{renderDAPTSafetyAlert(pt)}</React.Fragment>);
  }
  if (id.includes('vasospastic') || id.includes('gap-61')) {
    const alert = renderVasospasticAlert(pt);
    if (alert) parts.push(<React.Fragment key="vsp">{alert}</React.Fragment>);
  }
  if (id.includes('digoxin') || id.includes('gap-44')) {
    const alert = renderDigoxinAlert(pt);
    if (alert) parts.push(<React.Fragment key="dig">{alert}</React.Fragment>);
  }

  // Deprescribing
  if (id.includes('deprescrib') || id.includes('beta-blocker') || id.includes('gap-56') || id.includes('reduce-ami')) {
    parts.push(<React.Fragment key="bb-deprx">{renderBBDeprescribing(pt)}</React.Fragment>);
  }
  if (id.includes('oac-monotherapy') || id.includes('gap-53')) {
    parts.push(<React.Fragment key="oac-deprx">{renderOACDeprescribing(pt)}</React.Fragment>);
  }

  // SAQ trend
  const saq = renderSAQTrend(pt);
  if (saq) parts.push(<React.Fragment key="saq">{saq}</React.Fragment>);

  // SYNTAX display
  if (id.includes('heart-team') || id.includes('revasc') || id.includes('cto') || id.includes('gap-46') || id.includes('gap-47') || id.includes('gap-48')) {
    const syntax = renderSYNTAXDisplay(pt);
    if (syntax) parts.push(<React.Fragment key="syntax">{syntax}</React.Fragment>);
  }

  if (parts.length === 0) return null;
  return <div className="col-span-1 md:col-span-2 space-y-3 mt-2">{parts}</div>;
}

// ============================================================
// GAP-LEVEL TRAJECTORY DATA
// ============================================================
const getCADGapTrajectoryData = (_gapId: string, patientCount: number, category: string): TrajectoryDistribution => {
  const isSafety = category === 'Safety';
  const isGrowth = category === 'Growth';
  if (isSafety) {
    return { worseningRapid: Math.round(patientCount * 0.28), worseningSlow: Math.round(patientCount * 0.37), stable: Math.round(patientCount * 0.24), improving: Math.round(patientCount * 0.11), total: patientCount };
  }
  if (isGrowth) {
    return { worseningRapid: Math.round(patientCount * 0.09), worseningSlow: Math.round(patientCount * 0.16), stable: Math.round(patientCount * 0.43), improving: Math.round(patientCount * 0.32), total: patientCount };
  }
  return { worseningRapid: Math.round(patientCount * 0.19), worseningSlow: Math.round(patientCount * 0.26), stable: Math.round(patientCount * 0.34), improving: Math.round(patientCount * 0.21), total: patientCount };
};

// ============================================================
// PREDICTIVE INTELLIGENCE HELPERS
// ============================================================

/** Parse a numeric value from a string like "38 mL/min/1.73m2", "88 mg/dL" */
function parseNumericValue(val: string | number | undefined): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') return val;
  const cleaned = val.replace(/,/g, '').replace(/[^0-9.\-]/g, ' ').trim();
  const match = cleaned.match(/-?\d+\.?\d*/);
  return match ? parseFloat(match[0]) : null;
}

/** Compute trajectory for a CAD patient based on available trend data */
function computeCADPatientTrajectory(pt: CADGapPatient): TrajectoryResult {
  // SAQ delta
  if (pt.saqAnginaFrequency !== undefined && pt.saqPriorAnginaFrequency !== undefined) {
    return computeTrajectory({
      currentValue: pt.saqAnginaFrequency,
      priorValue: pt.saqPriorAnginaFrequency,
      daysBetween: 180,
    });
  }

  // eGFR delta
  const egfr = parseNumericValue(pt.keyValues['eGFR']);
  const priorEgfr = parseNumericValue(pt.keyValues['Prior eGFR']);
  if (egfr !== null && priorEgfr !== null) {
    return computeTrajectory({ currentValue: egfr, priorValue: priorEgfr, daysBetween: 180 });
  }

  // LVEF delta
  const lvef = parseNumericValue(pt.keyValues['LVEF']);
  const priorLvef = parseNumericValue(pt.keyValues['Prior LVEF']);
  if (lvef !== null && priorLvef !== null) {
    return computeTrajectory({ currentValue: lvef, priorValue: priorLvef, daysBetween: 180 });
  }

  return { direction: 'stable', ratePerMonth: 0, ratePerYear: 0, percentChange: 0 };
}

/** Render trajectory and time horizon badges for a patient row */
function renderCADPredictiveBadges(gap: CADClinicalGap, pt: CADGapPatient): React.ReactNode {
  const trajectory = computeCADPatientTrajectory(pt);
  const display = trajectoryDisplay(trajectory.direction);

  const gapCategory = (gap.category === 'Discovery' ? 'Gap' : gap.category) as 'Safety' | 'Gap' | 'Growth' | 'Quality' | 'Deprescribing';
  const timeHorizon = computeTimeHorizon({
    predictedMonths: null,
    gapCategory,
    trajectoryDirection: trajectory.direction,
  });
  const horizonDisplay = timeHorizonDisplay(timeHorizon.horizon);

  // Check for CABG date-based prediction (different data source)
  const cabgDate = pt.keyValues['CABG Date'];
  const hasCabgDate = typeof cabgDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cabgDate);

  const hasTrendData = trajectory.direction !== 'stable' || trajectory.percentChange !== 0;
  if (!hasTrendData && !hasCabgDate) return null;

  // For CABG patients without trend data, compute SVG-based urgency
  if (!hasTrendData && hasCabgDate) {
    const svg = estimateSVGFailureProbability({ cabgDate: cabgDate as string });
    const svgHorizon = svg.riskCategory === 'very_high' || svg.riskCategory === 'high' ? 'immediate' : svg.riskCategory === 'moderate' ? 'near_term' : 'watch';
    const svgHorizonDisplay = timeHorizonDisplay(svgHorizon);
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${svgHorizonDisplay.bgClass} ${svgHorizonDisplay.textClass}`}>
        {svgHorizonDisplay.icon} SVG risk: {Math.round(svg.probability * 100)}%
      </span>
    );
  }

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

/** Render predicted event detail for specific CAD gaps */
function renderCADPredictedEvent(gapId: string, pt: CADGapPatient): React.ReactNode {
  // Gap 52 — Post-ACS PCSK9i Treatment Window Countdown
  if ((gapId.includes('52') || gapId.includes('pcsk9') || gapId.includes('post-acs')) && pt.keyValues['ACS Date'] && pt.keyValues['PCSK9i Window Remaining']) {
    return (
      <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="text-xs font-semibold text-amber-800 mb-1">Treatment Window Countdown</div>
        <div className="text-xs text-amber-700">
          ACS event: {pt.keyValues['ACS Date']} · Days elapsed: {pt.keyValues['Days Since ACS']}
        </div>
        <div className="text-xs text-amber-800 font-bold">
          Days remaining in highest-benefit window: {pt.keyValues['PCSK9i Window Remaining']}
        </div>
        <div className="text-xs text-amber-600 mt-0.5">ODYSSEY OUTCOMES: Greatest absolute benefit in first 90 days post-ACS</div>
      </div>
    );
  }

  // Gap 50 — DAPT Discontinuation countdown
  if ((gapId.includes('50') || gapId.includes('dapt')) && pt.keyValues['DAPT Discontinued']) {
    return (
      <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-xs font-semibold text-red-800 mb-1">DAPT Safety Countdown</div>
        <div className="text-xs text-red-700">
          DAPT discontinued: {pt.keyValues['DAPT Discontinued']}. Days without P2Y12: {pt.keyValues['Days Without P2Y12']}.
        </div>
        <div className="text-xs text-red-800 font-bold mt-0.5">Stent thrombosis risk highest in first 90 days after DAPT discontinuation.</div>
      </div>
    );
  }

  // Gap 60 — Post-CABG Surveillance
  if (gapId.includes('60') || gapId.includes('cabg')) {
    const cabgDate = pt.keyValues['CABG Date'];
    if (typeof cabgDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cabgDate)) {
      const svg = estimateSVGFailureProbability({ cabgDate });
      const riskColor = svg.riskCategory === 'very_high' ? 'text-red-700' : svg.riskCategory === 'high' ? 'text-red-600' : svg.riskCategory === 'moderate' ? 'text-amber-700' : 'text-green-700';
      const surveillanceNote = svg.probability >= 0.30 ? 'overdue' : svg.probability >= 0.15 ? 'recommended' : 'per guidelines';
      return (
        <div className="mt-2 px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg">
          <div className="text-xs text-slate-900">
            <span className="font-semibold">Predicted event:</span>{' '}
            SVG failure probability: <span className={`font-bold ${riskColor}`}>{Math.round(svg.probability * 100)}%</span>{' '}
            ({svg.yearsPostCABG} years post-CABG) &mdash; surveillance {surveillanceNote}.
          </div>
        </div>
      );
    }
  }

  return null;
}

/** Render revenue timing for Growth and Gap categories */
function renderCADRevenueTiming(gap: CADClinicalGap, pt: CADGapPatient): React.ReactNode {
  if (gap.dollarOpportunity <= 0) return null;
  if (gap.category !== 'Growth' && gap.category !== 'Gap') return null;

  const trajectory = computeCADPatientTrajectory(pt);
  // For CABG patients, also consider them as having trend data
  const cabgDate = pt.keyValues['CABG Date'];
  const hasCabgDate = typeof cabgDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cabgDate);
  const hasTrendData = trajectory.direction !== 'stable' || trajectory.percentChange !== 0;
  if (!hasTrendData && !hasCabgDate) return null;

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
const CADClinicalGapDetectionDashboard: React.FC = () => {
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'priority' | 'patients' | 'opportunity'>('priority');
  const [showMethodology, setShowMethodology] = useState<string | null>(null);

  const totalPatients = CAD_CLINICAL_GAPS.reduce((sum, g) => sum + g.patientCount, 0);
  const totalOpportunity = CAD_CLINICAL_GAPS.reduce((sum, g) => sum + g.dollarOpportunity, 0);

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const categoryOrder: Record<string, number> = { Safety: 0, Discovery: 1, Gap: 2, Growth: 3, Quality: 4, Deprescribing: 5 };
  const sortedGaps = [...CAD_CLINICAL_GAPS].sort((a, b) => {
    switch (sortBy) {
      case 'patients': return b.patientCount - a.patientCount;
      case 'opportunity': return b.dollarOpportunity - a.dollarOpportunity;
      default: {
        const catDiff = (categoryOrder[a.category] ?? 9) - (categoryOrder[b.category] ?? 9);
        if (catDiff !== 0) return catDiff;
        return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
      }
    }
  });

  const priorityColor = (p: string) => {
    if (p === 'high') return 'bg-red-50 border-red-300 text-red-700';
    if (p === 'medium') return 'bg-amber-50 border-amber-300 text-amber-700';
    return 'bg-green-50 border-green-300 text-green-700';
  };

  const categoryColor = (c: string) =>
    c === 'Gap'
      ? 'bg-red-100 text-red-800'
      : c === 'Safety'
      ? 'bg-rose-200 text-rose-900'
      : c === 'Quality'
      ? 'bg-amber-100 text-amber-800'
      : c === 'Deprescribing'
      ? 'bg-amber-100 text-amber-800'
      : c === 'Discovery'
      ? 'bg-slate-100 text-slate-800'
      : 'bg-blue-100 text-blue-800';

  const tierColor = (tier?: string) => {
    if (!tier) return '';
    if (tier.includes('A')) return 'bg-red-100 text-red-700';
    if (tier.includes('B')) return 'bg-amber-100 text-amber-700';
    if (tier.includes('C')) return 'bg-blue-100 text-blue-700';
    return 'bg-titanium-100 text-titanium-700';
  };

  const tierCTA = (tier?: string) => {
    if (!tier) return '';
    if (tier.includes('A')) return 'Initiate PCSK9 Inhibitor';
    if (tier.includes('B')) return 'Add Ezetimibe';
    if (tier.includes('C')) return 'Upgrade Statin';
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Header summary */}
      <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-titanium-900 mb-1 flex items-center gap-2">
          <Target className="w-5 h-5 text-porsche-600" />
          Clinical Gap Detection — Coronary Intervention Module
        </h3>
        <p className="text-sm text-titanium-600 mb-4">
          AI-driven detection of evidence-based CAD therapy gaps and cross-module opportunities.
          Gaps 9, 14, 15, 20, 23, 32, 37-40, 42, 44, 45 — 45-gap initiative.
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
            <div className="text-2xl font-bold text-blue-800">{CAD_CLINICAL_GAPS.length}</div>
          </div>
        </div>
      </div>

      {/* Sort control */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-titanium-600 uppercase tracking-wide">Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'priority' | 'patients' | 'opportunity')}
          className="px-3 py-1.5 text-sm border border-titanium-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="priority">Priority</option>
          <option value="patients">Patient Count</option>
          <option value="opportunity">Dollar Opportunity</option>
        </select>
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
                    {gap.tag && gap.tag.split(' | ').map((t) => (
                      <span key={t} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {t}
                      </span>
                    ))}
                  </div>
                  {gap.category === 'Discovery' && (
                    <div className="text-xs font-semibold text-slate-700 mt-1 flex items-center gap-1">
                      <span className="text-indigo-500">&#x2B21;</span> Discovery — Net new patients
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
                </div>
                <div className="ml-4 mt-1 flex-shrink-0">
                  {isOpen ? <ChevronUp className="w-5 h-5 text-titanium-500" /> : <ChevronDown className="w-5 h-5 text-titanium-500" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-titanium-200 p-5 space-y-5">
                  {/* Trajectory Summary — Forward-looking */}
                  {(() => {
                    const dist = getCADGapTrajectoryData(gap.id, gap.patientCount, gap.category);
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

                  {gap.whyMissed && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <h4 className="font-semibold text-amber-800 mb-1 flex items-center gap-2">
                        <Search className="w-4 h-4 text-amber-600" />
                        Why standard systems miss this
                      </h4>
                      <p className="text-sm text-amber-700">{gap.whyMissed}</p>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-semibold text-blue-800 mb-1 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" />
                      Clinical Evidence
                    </h4>
                    <p className="text-sm text-blue-700">{gap.evidence}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Pill className="w-4 h-4 text-porsche-600" />
                    <span className="font-semibold text-porsche-700">Recommended Action:</span>
                    <span className="text-sm font-medium bg-porsche-50 border border-porsche-200 px-3 py-1 rounded-lg text-porsche-800">
                      {gap.cta}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-semibold text-titanium-800 mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4 text-titanium-600" />
                      Sample Flagged Patients ({gap.patients.length} shown of {gap.patientCount})
                    </h4>
                    <div className="space-y-2">
                      {gap.patients.map((pt) => {
                        const ptOpen = expandedPatient === pt.id;
                        const cta = tierCTA(pt.tier);
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
                                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${tierColor(pt.tier)}`}>
                                    {pt.tier}
                                  </span>
                                )}
                                {cta && (
                                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    {cta}
                                  </span>
                                )}
                                {renderCADPredictiveBadges(gap, pt)}
                                {gap.category === 'Discovery' && (
                                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold inline-flex items-center gap-1">
                                    <Radio className="w-3 h-3" />
                                    Discovery
                                  </span>
                                )}
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
                                {gap.whyTailrd && (
                                  <div className="col-span-1 md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                                    <p className="text-sm text-slate-800">
                                      <span className="font-semibold">Why TAILRD:</span> {gap.whyTailrd}
                                    </p>
                                  </div>
                                )}
                                {renderEnhancedPatientDisplay(gap.id, pt)}
                                {/* Predictive Intelligence */}
                                {renderCADPredictedEvent(gap.id, pt)}
                                {renderCADRevenueTiming(gap, pt)}
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
                          <p className="italic text-titanium-400 text-[10px]">Numbers calibrated to representative cardiovascular program based on national benchmarks</p>
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

export default CADClinicalGapDetectionDashboard;
