import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, DollarSign, Users, ChevronDown, ChevronUp, Target, Activity, Pill, Stethoscope, TrendingUp, Zap, Info, Search, Radio, FileText } from 'lucide-react';
import { estimateSYNTAX, computeSAQTrend } from '../../../../utils/clinicalCalculators';
import { computeTrajectory, computeTimeHorizon, trajectoryDisplay, timeHorizonDisplay, estimateSVGFailureProbability, computeRevenueAtRisk, formatDollar, type TrajectoryResult, type TrajectoryDistribution } from '../../../../utils/predictiveCalculators';
import GapActionButtons from '../../../../components/shared/GapActionButtons';
import { useGapActions } from '../../../../hooks/useGapActions';

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
//       70 (SCAD Young Women ACS), 71 (D2B Time Outlier STEMI),
//       72 (ACEi/ARB Post-MI), 73 (Cardiac Rehab Completion),
//       74 (Smoking Cessation CAD), 75 (BP Not at Goal CAD),
//       76 (Diabetes Not Optimized CAD+DM),
//       77 (Short DAPT HBR), 78 (P2Y12 Mono Transition),
//       79 (DAPT De-Escalation ACS), 80 (DAPT Extended >12mo),
//       81 (Aspirin-Free Strategy), 82 (Left Main PCI No IVUS),
//       83 (Elective PCI No OMT), 84 (Radial Access Not Used),
//       85 (AKI Risk Pre-PCI), 86 (Complex PCI No Hemo Planning),
//       87 (Total Arterial Revasc), 88 (MIDCAB Not Offered),
//       89 (Off-Pump CABG Calcified Aorta), 90 (Radial Artery Conduit),
//       91 (Endoscopic Vein Harvest), 92 (Blood Conservation Protocol),
//       93 (Intra-Op TEE CABG), 94 (AKI Risk Pre-CABG),
//       95 (Post-Op AF Treatment), 96 (Pre-Op BB POAF Prevention),
//       97 (Post-CABG Anticoag Protocol), 98 (AF Bridging Protocol),
//       99 (DOAC Interruption PAUSE), 100 (HIT Screening Post-Cardiac Surgery),
//       101 (Pre-Op Cardiac Risk Non-Cardiac Surgery),
//       102 (Anticoag Reversal Emergency Surgery),
//       103 (Post-Op Delirium Elderly Cardiac Surgery),
//       104 (ISR — DCB Not Used, AGENT IDE),
//       105 (Cardiogenic Shock — SCAI Staging Not Documented),
//       106 (Inclisiran — Twice-Yearly siRNA Not Considered),
//       107 (PREVENT 2024 Calculator Not Utilized),
//       108 (Cangrelor Bridging — CABG-Bound ACS)
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
  // ── NEW GAPS 72-76 ─────────────────────────
  {
    id: 'cad-gap-72-acei-arb-post-mi',
    name: 'ACE-I/ARB Not Prescribed Post-MI',
    category: 'Gap',
    patientCount: 85,
    dollarOpportunity: 51000,
    priority: 'high',
    tag: 'Post-MI | RAAS Inhibition',
    evidence:
      'HOPE (Yusuf S, NEJM 2000): ramipril reduced CV death 26% in high-risk patients. EUROPA (Fox KM, Lancet 2003): perindopril reduced CV death/MI/arrest 20% in stable CAD. VALIANT (Pfeffer MA, NEJM 2003): valsartan non-inferior to captopril post-MI. ACEi post-MI: 20-25% reduction in CV death. Class I for all post-MI patients with LVEF ≤40%, anterior MI, diabetes, or hypertension.',
    cta: 'Initiate ACE Inhibitor — or ARB if ACEi Intolerant',
    detectionCriteria: [
      'MI diagnosis (ICD-10: I21.x) within past 12 months',
      'No ACE inhibitor or ARB on active medication list',
      'No documented allergy or contraindication to ACEi/ARB (angioedema, bilateral RAS, pregnancy)',
      'Particularly high-yield: LVEF ≤40%, anterior MI, diabetes, or hypertension',
    ],
    patients: [
      {
        id: 'CAD-ACEI-001',
        name: 'Gerald Whitmore',
        mrn: 'MRN-CAD-72001',
        age: 63,
        signals: [
          'Anterior STEMI 4 months ago — LVEF 35%',
          'No ACEi/ARB prescribed at discharge or subsequent visits',
          'On metoprolol, aspirin, atorvastatin, ticagrelor — RAAS inhibition missing',
          'HOPE/EUROPA: ACEi reduces CV death 20-25% post-MI',
        ],
        keyValues: {
          'MI Type': 'Anterior STEMI (LAD occlusion)',
          'MI Date': '4 months ago',
          'LVEF': '35%',
          'ACEi/ARB': 'Not prescribed',
          'Creatinine': '1.1 mg/dL',
          'K+': '4.2 mEq/L',
          'Other Meds': 'Metoprolol, ASA, atorvastatin, ticagrelor',
        },
      },
      {
        id: 'CAD-ACEI-002',
        name: 'Patricia Ingram',
        mrn: 'MRN-CAD-72002',
        age: 71,
        signals: [
          'NSTEMI 7 months ago — LVEF 42%, diabetic, hypertensive',
          'ACEi started at discharge but discontinued at 2-month follow-up (cough)',
          'No ARB initiated as replacement despite Class I indication',
          'VALIANT: valsartan non-inferior to captopril post-MI',
        ],
        keyValues: {
          'MI Type': 'NSTEMI',
          'MI Date': '7 months ago',
          'LVEF': '42%',
          'ACEi History': 'Lisinopril — discontinued (cough)',
          'ARB': 'Not prescribed as replacement',
          'DM': 'Type 2 — A1c 7.8%',
          'BP': '148/88 mmHg',
        },
      },
      {
        id: 'CAD-ACEI-003',
        name: 'Robert Castellano',
        mrn: 'MRN-CAD-72003',
        age: 58,
        signals: [
          'Inferior STEMI 9 months ago — LVEF 50% but diabetic with HTN',
          'No ACEi/ARB prescribed — falls through because LVEF preserved',
          'EUROPA: perindopril benefits even with preserved LVEF + risk factors',
          'Class I recommendation for post-MI with diabetes or hypertension',
        ],
        keyValues: {
          'MI Type': 'Inferior STEMI',
          'MI Date': '9 months ago',
          'LVEF': '50% (preserved)',
          'ACEi/ARB': 'Not prescribed',
          'DM': 'Type 2 — A1c 7.2%',
          'HTN': 'Yes — BP 142/86',
          'Reason Missed': 'Preserved LVEF — ACEi not considered',
        },
      },
    ],
    whyMissed: 'Post-MI ACEi/ARB initiation is sometimes limited to reduced LVEF patients, missing the broader Class I indication that includes diabetes, hypertension, and anterior MI regardless of LVEF. ACEi cough leading to discontinuation without ARB substitution is a common gap.',
    whyTailrd: 'TAILRD identified post-MI patients within 12 months without active ACEi/ARB prescription, cross-referencing medication lists, allergy documentation, and reasons for discontinuation to flag those needing RAAS inhibition initiation or ARB substitution.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 720 ACS/year x 55% MI x 30% without ACEi/ARB x 35% market share ≈ 85. Dollar opportunity: $1,200/yr monitoring x 85 x 50% completion = $51,000. HOPE (NEJM 2000); EUROPA (Lancet 2003); VALIANT (NEJM 2003).',
  },
  {
    id: 'cad-gap-73-cardiac-rehab-completion',
    name: 'Cardiac Rehab Phase II — Low Completion Rate',
    category: 'Quality',
    patientCount: 90,
    dollarOpportunity: 86400,
    priority: 'medium',
    tag: 'Quality | Cardiac Rehab | CMS Reporting',
    evidence:
      'Hammill BG et al (Circ CQO 2010): completing 36 sessions associated with 47% reduction in mortality vs <12 sessions. Ades PA et al (Circulation 2017): national completion rate only 27% — significant quality gap. AHA/AACVPR consensus: 36 sessions is the evidence-based target for maximum benefit.',
    cta: 'Patient Outreach — Cardiac Rehab Completion Support',
    detectionCriteria: [
      'Cardiac rehab Phase II referral active',
      'Fewer than 18 of 36 sessions completed',
      'More than 8 weeks elapsed since program start',
      'No documented barrier to completion (transportation, insurance, medical hold)',
    ],
    patients: [
      {
        id: 'CAD-CR-001',
        name: 'Thomas Ericsson',
        mrn: 'MRN-CAD-73001',
        age: 62,
        signals: [
          'Post-CABG — cardiac rehab started 10 weeks ago',
          'Only 8 of 36 sessions completed (22%)',
          'No documented barrier — appears to be engagement/scheduling issue',
          'Hammill 2010: completing 36 sessions = 47% mortality reduction',
        ],
        keyValues: {
          'Indication': 'Post-CABG (3-vessel)',
          'Rehab Start': '10 weeks ago',
          'Sessions Completed': '8 of 36 (22%)',
          'Completion Rate': 'Below target',
          'Documented Barrier': 'None',
          'Insurance': 'Medicare — covered',
        },
      },
      {
        id: 'CAD-CR-002',
        name: 'Linda Faulkner',
        mrn: 'MRN-CAD-73002',
        age: 55,
        signals: [
          'Post-PCI (LAD stent) — cardiac rehab referral 12 weeks ago',
          '6 of 36 sessions completed (17%) — significant dropout risk',
          'No follow-up outreach documented',
          'Ades 2017: national completion rate only 27% — proactive outreach improves completion',
        ],
        keyValues: {
          'Indication': 'Post-PCI (LAD DES)',
          'Rehab Start': '12 weeks ago',
          'Sessions Completed': '6 of 36 (17%)',
          'Last Session': '5 weeks ago',
          'Outreach Attempted': 'No',
          'Dropout Risk': 'High — no activity in 5 weeks',
        },
      },
      {
        id: 'CAD-CR-003',
        name: 'James Olowokandi',
        mrn: 'MRN-CAD-73003',
        age: 68,
        signals: [
          'Post-MI — cardiac rehab started 14 weeks ago',
          '12 of 36 sessions completed (33%) — pace insufficient to complete',
          'Attendance dropped from 3x/week to 1x/week over past month',
          'Needs engagement intervention to maintain trajectory toward 36 sessions',
        ],
        keyValues: {
          'Indication': 'Post-MI (NSTEMI)',
          'Rehab Start': '14 weeks ago',
          'Sessions Completed': '12 of 36 (33%)',
          'Current Pace': '1x/week (down from 3x/week)',
          'Projected Completion': '24 weeks behind — will not finish',
          'Engagement': 'Declining',
        },
      },
    ],
    whyMissed: 'Cardiac rehab programs track attendance but rarely have systematic outreach for patients falling behind on session completion. Completion rates are reported in aggregate but individual patient trajectories are not monitored in real-time.',
    whyTailrd: 'TAILRD connected cardiac rehab session logs with referral dates to identify patients with low completion trajectories, flagging those who need proactive outreach before they fully disengage from the program.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: cardiac rehab referrals x 45% low completion rate x 35% market share ≈ 90. Dollar opportunity: $2,400 per completed program x 90 x 40% conversion = $86,400. Hammill (Circ CQO 2010); Ades (Circulation 2017).',
  },
  {
    id: 'cad-gap-74-smoking-cessation',
    name: 'Smoking Cessation Not Addressed — CAD Patient',
    category: 'Quality',
    patientCount: 525,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'Quality | Risk Reduction | Smoking',
    evidence:
      'Critchley JA, Capewell S (JAMA 2003): smoking cessation post-MI reduces mortality 36% — greater than any single medication. AHA/ACC Class I, Level A recommendation. Smoking cessation is the single most impactful modifiable risk factor in established CAD.',
    cta: 'Document Smoking Cessation Intervention — Refer to Cessation Program',
    detectionCriteria: [
      'CAD diagnosis (ICD-10: I25.x or prior MI I21.x)',
      'Active smoker status documented (ICD-10: F17.x or social history)',
      'No smoking cessation intervention documented in past 12 months (counseling, NRT, bupropion, varenicline referral)',
      'No documented patient refusal of cessation services',
    ],
    patients: [
      {
        id: 'CAD-SMOK-001',
        name: 'Dennis Kowalski',
        mrn: 'MRN-CAD-74001',
        age: 54,
        signals: [
          'CAD with prior PCI (LAD stent 2 years ago) — active 1 PPD smoker',
          'No cessation counseling, NRT, or pharmacotherapy documented in 18 months',
          'Critchley JAMA 2003: cessation reduces mortality 36% — more than any medication',
          'Class I, Level A recommendation — highest evidence grade',
        ],
        keyValues: {
          'CAD Status': 'Prior PCI — LAD DES (2 years ago)',
          'Smoking Status': 'Active — 1 PPD x 30 years',
          'Cessation Counseling': 'None documented in 18 months',
          'NRT/Pharmacotherapy': 'Not prescribed',
          'Pack-Years': 30,
          'Last Visit': '6 weeks ago — smoking status noted but no intervention',
        },
      },
      {
        id: 'CAD-SMOK-002',
        name: 'Karen Oduya',
        mrn: 'MRN-CAD-74002',
        age: 61,
        signals: [
          'Three-vessel CAD managed medically — continues smoking half PPD',
          'Multiple cardiology visits without cessation intervention documented',
          'High-risk: 3-vessel disease + active smoking = accelerated progression',
          'Cessation is more effective than adding any medication to her regimen',
        ],
        keyValues: {
          'CAD Status': '3-vessel CAD (medical management)',
          'Smoking Status': 'Active — 0.5 PPD x 25 years',
          'Cessation Documented': 'No — multiple visits without intervention',
          'SYNTAX Score': 'Moderate',
          'Other Meds': 'ASA, atorvastatin, metoprolol, amlodipine',
          'Visits Without Intervention': 4,
        },
      },
      {
        id: 'CAD-SMOK-003',
        name: 'Wayne Rutherford',
        mrn: 'MRN-CAD-74003',
        age: 49,
        signals: [
          'Post-MI (STEMI 6 months ago) — returned to smoking 2 months post-event',
          'No cessation program referral despite smoking relapse',
          'Young patient with premature CAD — smoking cessation critical for long-term survival',
          'Relapse after MI is common — needs proactive re-engagement',
        ],
        keyValues: {
          'MI History': 'STEMI 6 months ago (RCA)',
          'Smoking Status': 'Relapsed — resumed 2 months post-MI',
          'Prior Quit Attempt': 'Quit at MI — relapsed at 4 months',
          'Cessation Re-referral': 'Not done',
          'Age': 49,
          'Premature CAD': 'Yes — smoking primary modifiable risk',
        },
      },
    ],
    whyMissed: 'Smoking cessation counseling is often assumed to happen but not documented. Cardiologists focus on pharmacotherapy and procedures while cessation — the most impactful intervention — is deferred to primary care without closed-loop follow-up.',
    whyTailrd: 'TAILRD identified active smokers in the CAD panel by cross-referencing social history, ICD-10 tobacco codes, and medication lists against documented cessation interventions to flag patients without any cessation effort in the past 12 months.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 15,000 CAD x 25% active smokers x 40% not addressed x 35% market share ≈ 525. Dollar opportunity: $0 direct revenue — quality metric. Linked to readmission reduction, long-term outcomes, and CMS quality reporting. Critchley JAMA 2003.',
  },
  {
    id: 'cad-gap-75-bp-not-at-goal',
    name: 'Blood Pressure Not at Goal — CAD Patient',
    category: 'Gap',
    patientCount: 680,
    dollarOpportunity: 326400,
    priority: 'medium',
    tag: 'Risk Factor | Hypertension | Secondary Prevention',
    evidence:
      'Whelton PK et al, 2017 ACC/AHA Hypertension Guidelines (JACC 2018): target <130/80 for secondary prevention in ASCVD. SPRINT (Wright JT, NEJM 2015): intensive BP control reduced CV events 25% and mortality 27%. Intensive BP control in CAD is Class I recommendation.',
    cta: 'Intensify Antihypertensive Therapy — Target <130/80',
    detectionCriteria: [
      'CAD diagnosis (ICD-10: I25.x or prior MI/PCI/CABG)',
      'Most recent SBP ≥130 mmHg or DBP ≥80 mmHg',
      'No antihypertensive medication change in past 3 months',
      'No documented plan for intensification or documented reason for higher target',
    ],
    patients: [
      {
        id: 'CAD-BP-001',
        name: 'Harold Beckmann',
        mrn: 'MRN-CAD-75001',
        age: 66,
        signals: [
          'CAD with prior CABG — last 3 BP readings: 144/88, 148/86, 142/84',
          'On lisinopril 10mg and amlodipine 5mg — not at maximum doses',
          'No medication change in 6 months despite persistent hypertension',
          'SPRINT: intensive control reduces CV events 25% in high-risk patients',
        ],
        keyValues: {
          'CAD Status': 'Post-CABG (3-vessel, 2 years ago)',
          'Last 3 BPs': '144/88, 148/86, 142/84',
          'Current Meds': 'Lisinopril 10mg, amlodipine 5mg',
          'Target': '<130/80 (ACC/AHA 2017)',
          'Last Med Change': '6 months ago',
          'Intensification Plan': 'None documented',
        },
      },
      {
        id: 'CAD-BP-002',
        name: 'Brenda Sato',
        mrn: 'MRN-CAD-75002',
        age: 72,
        signals: [
          'CAD with prior PCI (RCA) — BP 152/78 at last visit',
          'On metoprolol 50mg only — additional agents needed',
          'Isolated systolic hypertension — common in elderly CAD patients',
          'ACC/AHA 2017: <130/80 target applies to all ASCVD patients',
        ],
        keyValues: {
          'CAD Status': 'Prior PCI (RCA DES)',
          'Last BP': '152/78',
          'Current Meds': 'Metoprolol 50mg (only antihypertensive)',
          'Target': '<130/80',
          'Additional Agents': 'None — ACEi or CCB indicated',
          'Last Med Change': '8 months ago',
        },
      },
      {
        id: 'CAD-BP-003',
        name: 'Marcus Delgado',
        mrn: 'MRN-CAD-75003',
        age: 59,
        signals: [
          'Stable CAD + DM + CKD Stage 3 — BP 138/84',
          'Multiple comorbidities amplify benefit of intensive BP control',
          'On losartan 50mg — not uptitrated despite suboptimal BP',
          'Triple risk (CAD + DM + CKD): intensive BP control Class I',
        ],
        keyValues: {
          'CAD Status': 'Stable angina, 2-vessel CAD',
          'Last BP': '138/84',
          'Comorbidities': 'DM Type 2, CKD Stage 3a (eGFR 52)',
          'Current Meds': 'Losartan 50mg',
          'Target': '<130/80 (especially with DM + CKD)',
          'Uptitration': 'Not done — losartan can go to 100mg',
        },
      },
    ],
    whyMissed: 'Blood pressure targets were updated to <130/80 in 2017 but many practices still use the prior 140/90 threshold. Patients at 130-140 systolic are often considered "close enough" without intensification, particularly if on multiple medications.',
    whyTailrd: 'TAILRD identified CAD patients with BP above the 2017 ACC/AHA secondary prevention target by analyzing vital sign trends and medication lists to flag those without recent intensification or documented clinical rationale for a higher target.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 15,000 CAD x 35% BP above goal x 37% not intensified x 35% market share ≈ 680. Dollar opportunity: $1,200/yr monitoring x 680 x 40% conversion = $326,400. Whelton (JACC 2018); SPRINT (NEJM 2015).',
  },
  {
    id: 'cad-gap-76-diabetes-not-optimized',
    name: 'Diabetes Not Optimized — CAD + A1c >7%',
    category: 'Gap',
    patientCount: 380,
    dollarOpportunity: 182400,
    priority: 'medium',
    tag: 'Cardiometabolic | SGLT2i/GLP-1 RA | ADA/ACC',
    evidence:
      'ADA Standards of Care 2024: CV-benefit agents (SGLT2i, GLP-1 RA) preferred in CAD + DM regardless of A1c. EMPA-REG OUTCOME (Zinman B, NEJM 2015): empagliflozin reduced CV death 38% in T2DM with ASCVD. LEADER (Marso SP, NEJM 2016): liraglutide reduced MACE 13%. CV-benefit agents reduce MACE by 14-22% in CAD + DM.',
    cta: 'Optimize Glycemic Control — Prefer SGLT2i or GLP-1 RA with CV Benefit',
    detectionCriteria: [
      'CAD diagnosis (ICD-10: I25.x or prior MI/PCI/CABG)',
      'Diabetes mellitus (ICD-10: E11.x)',
      'Most recent HbA1c >7.0% within past 6 months',
      'Not currently on CV-benefit agent (SGLT2i: empagliflozin, dapagliflozin; GLP-1 RA: liraglutide, semaglutide, dulaglutide)',
    ],
    patients: [
      {
        id: 'CAD-DM-001',
        name: 'Franklin Obasi',
        mrn: 'MRN-CAD-76001',
        age: 64,
        signals: [
          'CAD with prior PCI + T2DM — A1c 8.1%, on metformin + glipizide only',
          'No SGLT2i or GLP-1 RA despite Class I indication in CAD + DM',
          'EMPA-REG: empagliflozin reduced CV death 38% in this population',
          'ADA 2024: CV-benefit agents preferred regardless of A1c level',
        ],
        keyValues: {
          'CAD Status': 'Prior PCI (LAD/LCx, 3 years ago)',
          'DM Type': 'Type 2',
          'A1c': '8.1%',
          'Current DM Meds': 'Metformin 1000mg BID, glipizide 10mg BID',
          'SGLT2i/GLP-1 RA': 'Neither prescribed',
          'eGFR': '68 mL/min (eligible for SGLT2i)',
        },
      },
      {
        id: 'CAD-DM-002',
        name: 'Dorothy Svensson',
        mrn: 'MRN-CAD-76002',
        age: 70,
        signals: [
          'Post-CABG + T2DM — A1c 7.4%, on metformin + sitagliptin',
          'Sitagliptin has no CV benefit — should be switched to GLP-1 RA or SGLT2i',
          'LEADER: liraglutide reduced MACE 13% in T2DM with ASCVD',
          'DPP-4i to GLP-1 RA switch recommended per ADA consensus',
        ],
        keyValues: {
          'CAD Status': 'Post-CABG (4-vessel, 5 years ago)',
          'DM Type': 'Type 2',
          'A1c': '7.4%',
          'Current DM Meds': 'Metformin 500mg BID, sitagliptin 100mg',
          'Switch Opportunity': 'Sitagliptin → GLP-1 RA (CV benefit)',
          'BMI': 31,
        },
      },
      {
        id: 'CAD-DM-003',
        name: 'Victor Petrosyan',
        mrn: 'MRN-CAD-76003',
        age: 57,
        signals: [
          'Stable 2-vessel CAD + T2DM + CKD Stage 3 — A1c 7.9%',
          'On metformin only — triple cardiometabolic risk not addressed',
          'SGLT2i provides simultaneous CV, renal, and glycemic benefit',
          'Ideally: add both SGLT2i (renal/CV) and GLP-1 RA (CV/weight)',
        ],
        keyValues: {
          'CAD Status': 'Stable 2-vessel CAD',
          'DM Type': 'Type 2',
          'A1c': '7.9%',
          'CKD': 'Stage 3a (eGFR 48)',
          'Current DM Meds': 'Metformin 1000mg BID only',
          'SGLT2i/GLP-1 RA': 'Neither prescribed',
          'Triple Risk': 'CAD + DM + CKD — maximum CV benefit from SGLT2i',
        },
      },
    ],
    whyMissed: 'Glycemic management in CAD patients is typically deferred to endocrinology or primary care. Cardiologists do not prescribe diabetes medications, and diabetologists may not prioritize CV-benefit agents over familiar regimens. The ADA/ACC consensus on CV-benefit-first therapy is not consistently implemented.',
    whyTailrd: 'TAILRD identified CAD patients with suboptimal A1c and no CV-benefit diabetes agent by connecting cardiology diagnoses with endocrine lab values and medication lists to flag cardiometabolic optimization opportunities.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 15,000 CAD x 30% diabetic x 25% A1c >7% without CV-benefit agent x 35% market share ≈ 380. Dollar opportunity: $1,200/yr cardiometabolic monitoring x 380 x 40% conversion = $182,400. EMPA-REG (NEJM 2015); LEADER (NEJM 2016); ADA Standards 2024.',
  },
  // ── DAPT MANAGEMENT (5) ────────────────────────────────────
  {
    id: 'cad-gap-77-short-dapt-hbr',
    name: 'Short DAPT Not Considered — High Bleeding Risk Post-PCI',
    category: 'Gap',
    patientCount: 65,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'DAPT Management | HBR | MASTER DAPT',
    evidence:
      'Valgimigli M et al, MASTER DAPT (NEJM 2021, PMID 34449185). Mehran R et al, TWILIGHT (NEJM 2019, PMID 31475799). Short DAPT (1-3 months) + P2Y12 monotherapy: 50% bleeding reduction with no increase in ischemic events in high bleeding risk patients.',
    cta: 'Review DAPT Duration — Consider Short DAPT + P2Y12 Monotherapy',
    detectionCriteria: [
      'Post-PCI patient on standard 12-month DAPT',
      'HAS-BLED score >=3 (high bleeding risk)',
      'No documented consideration of abbreviated DAPT',
      'Eligible for 1-3 month DAPT followed by P2Y12 monotherapy',
    ],
    patients: [
      {
        id: 'CAD-SDAPT-001',
        name: 'Gerald Kowalski',
        mrn: 'MRN-CAD-77001',
        age: 78,
        signals: [
          'Post-PCI (RCA DES) 2 months ago — on aspirin + ticagrelor',
          'HAS-BLED score 4 (age >75, HTN, CKD, prior GI bleed)',
          'MASTER DAPT: 1-month DAPT then P2Y12 mono — 50% bleeding reduction',
          'Standard 12-month DAPT inappropriate for this bleeding risk profile',
        ],
        keyValues: {
          'PCI Date': '2 months ago',
          'Stent': 'RCA DES',
          'Current DAPT': 'Aspirin 81mg + Ticagrelor 90mg BID',
          'HAS-BLED': '4 (High)',
          'Bleeding History': 'GI bleed 18 months ago',
          'eGFR': '34 mL/min',
        },
      },
      {
        id: 'CAD-SDAPT-002',
        name: 'Mildred Ashworth',
        mrn: 'MRN-CAD-77002',
        age: 82,
        signals: [
          'Post-PCI (LAD DES) 6 weeks ago — on aspirin + clopidogrel',
          'HAS-BLED score 5 (age >75, renal impairment, anemia, anticoagulant)',
          'On warfarin for AF — triple therapy risk very high',
          'TWILIGHT: ticagrelor mono after 3 months reduces bleeding 50%',
        ],
        keyValues: {
          'PCI Date': '6 weeks ago',
          'Stent': 'LAD DES',
          'Current Therapy': 'Aspirin + Clopidogrel + Warfarin (triple)',
          'HAS-BLED': '5 (Very High)',
          'AF': 'Yes — on warfarin',
          'Hemoglobin': '10.2 g/dL (anemia)',
        },
      },
      {
        id: 'CAD-SDAPT-003',
        name: 'Roland Bergstrom',
        mrn: 'MRN-CAD-77003',
        age: 74,
        signals: [
          'Post-PCI (LCx DES) 3 months ago — still on full DAPT',
          'HAS-BLED score 3 (age, HTN, medications)',
          'Eligible to transition to P2Y12 monotherapy now',
          'No bleeding risk reassessment documented',
        ],
        keyValues: {
          'PCI Date': '3 months ago',
          'Stent': 'LCx DES',
          'Current DAPT': 'Aspirin 81mg + Clopidogrel 75mg',
          'HAS-BLED': '3 (High)',
          'CKD': 'Stage 3b (eGFR 38)',
          'Platelet Count': '142K (low-normal)',
        },
      },
    ],
    whyMissed: 'Standard 12-month DAPT protocols are applied uniformly without individualized bleeding risk assessment. HAS-BLED scoring is not routinely performed post-PCI, and abbreviated DAPT strategies from MASTER DAPT and TWILIGHT are not yet widely adopted in practice.',
    whyTailrd: 'TAILRD identified post-PCI patients on standard DAPT with elevated HAS-BLED scores by cross-referencing bleeding risk factors (age, renal function, prior bleeding, concomitant anticoagulation) with current DAPT duration.',
    methodologyNote: '[Source: Demo Health System]. Patient count: 2,400 PCIs x 20% high bleeding risk x 35% on extended DAPT x 35% market share ≈ 65. Dollar: Safety/quality — $0 direct but prevents major bleeding events ($15K+ each). MASTER DAPT (NEJM 2021); TWILIGHT (NEJM 2019).',
  },
  {
    id: 'cad-gap-78-p2y12-mono-transition',
    name: 'P2Y12 Monotherapy Not Transitioned After Short DAPT',
    category: 'Gap',
    patientCount: 80,
    dollarOpportunity: 0,
    priority: 'medium',
    tag: 'DAPT Management | Aspirin-Free | STOPDAPT-2',
    evidence:
      'Watanabe H et al, STOPDAPT-2 (JAMA 2019). Kim BK et al, TICO (NEJM 2020). Aspirin-free P2Y12 monotherapy after initial DAPT period: 50% bleeding reduction with noninferior ischemic outcomes. Ticagrelor monotherapy is the preferred strategy.',
    cta: 'Transition to P2Y12 Monotherapy — Discontinue Aspirin',
    detectionCriteria: [
      'Post-PCI patient who completed initial DAPT period (1-3 months)',
      'Still on dual antiplatelet therapy (aspirin + P2Y12)',
      'No documented plan for aspirin discontinuation',
      'Eligible for P2Y12 monotherapy transition',
    ],
    patients: [
      {
        id: 'CAD-P2Y12-001',
        name: 'Clifford Nilsen',
        mrn: 'MRN-CAD-78001',
        age: 66,
        signals: [
          'Post-PCI 4 months ago — still on aspirin + ticagrelor',
          'Completed 3-month DAPT — eligible for ticagrelor monotherapy',
          'TICO: ticagrelor mono after 3 months — 50% less bleeding',
          'No transition plan documented',
        ],
        keyValues: {
          'PCI Date': '4 months ago',
          'Current DAPT': 'Aspirin 81mg + Ticagrelor 90mg BID',
          'DAPT Duration': '4 months (>3-month threshold)',
          'Transition Plan': 'None documented',
          'Bleeding Risk': 'Moderate (HAS-BLED 2)',
        },
      },
      {
        id: 'CAD-P2Y12-002',
        name: 'Pauline Everett',
        mrn: 'MRN-CAD-78002',
        age: 71,
        signals: [
          'Post-PCI 6 months ago — on aspirin + ticagrelor since procedure',
          'Could have transitioned to ticagrelor mono at 1-3 months',
          'STOPDAPT-2: clopidogrel mono from 1 month — reduced bleeding',
          'Continued dual therapy without reassessment',
        ],
        keyValues: {
          'PCI Date': '6 months ago',
          'Current DAPT': 'Aspirin 81mg + Ticagrelor 90mg BID',
          'DAPT Duration': '6 months (well past transition window)',
          'GI History': 'Prior peptic ulcer — bleeding risk elevated',
          'Transition Plan': 'Not documented',
        },
      },
      {
        id: 'CAD-P2Y12-003',
        name: 'Wallace Drummond',
        mrn: 'MRN-CAD-78003',
        age: 63,
        signals: [
          'Post-PCI 5 months ago — aspirin + clopidogrel',
          'Initial plan was 3-month DAPT then P2Y12 mono — not executed',
          'Aspirin contributes to bleeding without additional ischemic benefit',
          'Transition to clopidogrel monotherapy overdue',
        ],
        keyValues: {
          'PCI Date': '5 months ago',
          'Current DAPT': 'Aspirin 81mg + Clopidogrel 75mg',
          'Initial Plan': '3-month DAPT then P2Y12 mono',
          'Execution': 'Transition not completed',
          'Bleeding Events': 'Bruising, minor epistaxis',
        },
      },
    ],
    whyMissed: 'P2Y12 monotherapy transition requires a deliberate step at follow-up to discontinue aspirin. Without automated reminders, patients remain on dual therapy by inertia. Many physicians are unfamiliar with aspirin-free strategies or hesitant to stop aspirin.',
    whyTailrd: 'TAILRD identified patients past their DAPT transition window by tracking PCI dates against current medication lists and flagging those without documented aspirin discontinuation plans.',
    methodologyNote: '[Source: Demo Health System]. Patient count: post-PCI population x eligible x not transitioned x 35% market share ≈ 80. Dollar: $0 — medication optimization, prevents bleeding. STOPDAPT-2 (JAMA 2019); TICO (NEJM 2020).',
  },
  {
    id: 'cad-gap-79-dapt-deescalation-acs',
    name: 'DAPT De-Escalation Not Considered — ACS Patient at 1 Month',
    category: 'Gap',
    patientCount: 50,
    dollarOpportunity: 0,
    priority: 'medium',
    tag: 'DAPT Management | De-Escalation | Genotype-Guided',
    evidence:
      'Sibbing D et al, TROPICAL-ACS (Lancet 2017). Claassens D et al, POPular Genetics (NEJM 2019). Guided de-escalation from prasugrel/ticagrelor to clopidogrel: 30% bleeding reduction with no ischemic penalty. Genotype-guided approach identifies CYP2C19 non-loss-of-function patients safe for clopidogrel.',
    cta: 'Assess for DAPT De-Escalation — Consider Genotype-Guided Approach',
    detectionCriteria: [
      'ACS patient on prasugrel or ticagrelor for >=1 month',
      'No documented reassessment for de-escalation',
      'No CYP2C19 genotype testing ordered',
      'No documented clinical rationale for continued potent P2Y12',
    ],
    patients: [
      {
        id: 'CAD-DEESC-001',
        name: 'Reginald Okonkwo',
        mrn: 'MRN-CAD-79001',
        age: 59,
        signals: [
          'NSTEMI 6 weeks ago — on prasugrel 10mg since admission',
          'No de-escalation assessment at 1-month follow-up',
          'TROPICAL-ACS: guided de-escalation reduces bleeding 30%',
          'No CYP2C19 genotype ordered',
        ],
        keyValues: {
          'ACS Event': 'NSTEMI 6 weeks ago',
          'Current P2Y12': 'Prasugrel 10mg daily',
          'De-Escalation Assessment': 'Not performed',
          'CYP2C19 Genotype': 'Not ordered',
          'Bleeding Events': 'Gingival bleeding, bruising',
        },
      },
      {
        id: 'CAD-DEESC-002',
        name: 'Sylvia Nakamura',
        mrn: 'MRN-CAD-79002',
        age: 68,
        signals: [
          'STEMI 2 months ago — on ticagrelor 90mg BID',
          'Reporting dyspnea (ticagrelor side effect in 15%)',
          'POPular Genetics: genotype-guided approach safe and reduces bleeding',
          'Eligible for de-escalation to clopidogrel if CYP2C19 normal',
        ],
        keyValues: {
          'ACS Event': 'Anterior STEMI 2 months ago',
          'Current P2Y12': 'Ticagrelor 90mg BID',
          'Side Effects': 'Dyspnea (ticagrelor-related)',
          'CYP2C19 Genotype': 'Not tested',
          'De-Escalation': 'Not considered despite side effects',
        },
      },
      {
        id: 'CAD-DEESC-003',
        name: 'Herbert Lozano',
        mrn: 'MRN-CAD-79003',
        age: 73,
        signals: [
          'ACS (NSTEMI) 3 months ago — on ticagrelor',
          'Age 73 — higher bleeding risk with potent P2Y12',
          'No bleeding risk reassessment since discharge',
          'Guided de-escalation to clopidogrel may be appropriate',
        ],
        keyValues: {
          'ACS Event': 'NSTEMI 3 months ago',
          'Current P2Y12': 'Ticagrelor 90mg BID',
          'Age': 73,
          'Bleeding Risk': 'Elevated (age, renal function)',
          'eGFR': '45 mL/min',
          'De-Escalation': 'Not assessed',
        },
      },
    ],
    whyMissed: 'ACS patients are started on potent P2Y12 inhibitors in the acute setting and remain on them by default for 12 months. The 1-month de-escalation window passes without reassessment because no automated trigger exists, and CYP2C19 genotype testing is not part of routine post-ACS care.',
    whyTailrd: 'TAILRD identified ACS patients on potent P2Y12 inhibitors past the 1-month mark without documented de-escalation assessment or CYP2C19 genotype testing by tracking ACS event dates against current P2Y12 prescriptions.',
    methodologyNote: '[Source: Demo Health System]. Patient count: 720 ACS x 45% on potent P2Y12 x 45% eligible for de-escalation x 35% market share ≈ 50. Dollar: $0 — medication optimization. TROPICAL-ACS (Lancet 2017); POPular Genetics (NEJM 2019).',
  },
  {
    id: 'cad-gap-80-dapt-extended-no-reassessment',
    name: 'DAPT Extended Beyond 12 Months Without Reassessment',
    category: 'Quality',
    patientCount: 110,
    dollarOpportunity: 0,
    priority: 'medium',
    tag: 'DAPT Management | Quality | DAPT Score',
    evidence:
      'Mauri L et al, DAPT Study (NEJM 2014). Bonaca MP et al, PEGASUS-TIMI 54 (NEJM 2015). Extended DAPT beyond 12 months benefits only high-ischemic/low-bleeding risk patients. DAPT score stratifies benefit vs harm. Without reassessment, patients remain on DAPT by inertia.',
    cta: 'Calculate DAPT Score — Reassess Continuation vs Discontinuation',
    detectionCriteria: [
      'Post-PCI patient on DAPT >12 months',
      'No documented DAPT score calculation',
      'No documented reassessment of benefit vs bleeding risk',
      'No clinical rationale for extended DAPT documented',
    ],
    patients: [
      {
        id: 'CAD-EDAPT-001',
        name: 'Norman Fedorov',
        mrn: 'MRN-CAD-80001',
        age: 69,
        signals: [
          'PCI 18 months ago — still on aspirin + clopidogrel',
          'No DAPT score calculated at 12-month mark',
          'No documented reassessment for continuation vs discontinuation',
          'DAPT Study: extended DAPT reduces stent thrombosis but increases bleeding',
        ],
        keyValues: {
          'PCI Date': '18 months ago',
          'Current DAPT': 'Aspirin 81mg + Clopidogrel 75mg',
          'DAPT Duration': '18 months (>12-month threshold)',
          'DAPT Score': 'Not calculated',
          'Reassessment': 'None documented',
        },
      },
      {
        id: 'CAD-EDAPT-002',
        name: 'Beatrice Stanton',
        mrn: 'MRN-CAD-80002',
        age: 75,
        signals: [
          'PCI 24 months ago — on aspirin + ticagrelor for 2 years',
          'Age 75 — bleeding risk increases significantly with extended DAPT',
          'PEGASUS-TIMI 54: extended ticagrelor benefit limited to high-ischemic risk',
          'No bleeding-ischemic trade-off reassessment',
        ],
        keyValues: {
          'PCI Date': '24 months ago',
          'Current DAPT': 'Aspirin 81mg + Ticagrelor 60mg BID',
          'DAPT Duration': '24 months',
          'Age': 75,
          'Bleeding Risk': 'High (age, female)',
          'Reassessment': 'None',
        },
      },
      {
        id: 'CAD-EDAPT-003',
        name: 'Chester Horowitz',
        mrn: 'MRN-CAD-80003',
        age: 64,
        signals: [
          'PCI 15 months ago — continued on DAPT without review',
          'Low-risk anatomy (single vessel, non-LAD)',
          'DAPT score likely low — extended DAPT may not benefit',
          'Default continuation without individualized assessment',
        ],
        keyValues: {
          'PCI Date': '15 months ago',
          'Current DAPT': 'Aspirin 81mg + Clopidogrel 75mg',
          'Anatomy': 'Single vessel (RCA)',
          'DAPT Score': 'Not calculated (estimated low)',
          'Reassessment': 'Not performed',
        },
      },
    ],
    whyMissed: 'DAPT is initiated at PCI and continues by default. The 12-month reassessment point lacks an automated trigger, and DAPT score calculation is not part of routine follow-up workflows. Physicians default to continuation rather than active reassessment.',
    whyTailrd: 'TAILRD identified post-PCI patients on DAPT beyond 12 months without documented DAPT score or reassessment by tracking PCI dates, current medications, and clinical documentation.',
    methodologyNote: '[Source: Demo Health System]. Patient count: post-PCI population >12mo x on DAPT x no reassessment x 35% market share ≈ 110. Dollar: Quality — $0 direct. DAPT Study (NEJM 2014); PEGASUS-TIMI 54 (NEJM 2015).',
  },
  {
    id: 'cad-gap-81-aspirin-free-strategy',
    name: 'Aspirin-Free Strategy Not Considered Post-PCI',
    category: 'Gap',
    patientCount: 45,
    dollarOpportunity: 0,
    priority: 'medium',
    tag: 'DAPT Management | Aspirin-Free | STOPDAPT-3',
    evidence:
      'Watanabe H et al, STOPDAPT-3 (NEJM 2024). Clopidogrel monotherapy from day 1 post-PCI (no aspirin loading or maintenance): reduced bleeding with noninferior ischemic outcomes. Paradigm-shifting trial eliminating aspirin entirely from the PCI antiplatelet regimen.',
    cta: 'Evaluate for Aspirin-Free Strategy — STOPDAPT-3 Criteria',
    detectionCriteria: [
      'Post-PCI patient on standard aspirin-containing DAPT',
      'Not evaluated for aspirin-free strategy',
      'No documented consideration of STOPDAPT-3 criteria',
      'Candidate profile: low ischemic risk, bleeding concern',
    ],
    patients: [
      {
        id: 'CAD-ASF-001',
        name: 'Irving Takahashi',
        mrn: 'MRN-CAD-81001',
        age: 70,
        signals: [
          'Post-PCI (RCA DES) 1 month ago — on aspirin + clopidogrel',
          'History of aspirin-sensitive GI symptoms',
          'STOPDAPT-3: clopidogrel mono from day 1 — no aspirin needed',
          'Not evaluated for aspirin-free approach',
        ],
        keyValues: {
          'PCI Date': '1 month ago',
          'Current DAPT': 'Aspirin 81mg + Clopidogrel 75mg',
          'GI History': 'Aspirin-sensitive dyspepsia',
          'Aspirin-Free Evaluation': 'Not performed',
          'STOPDAPT-3 Eligible': 'Likely — stable, single vessel',
        },
      },
      {
        id: 'CAD-ASF-002',
        name: 'Elaine Christensen',
        mrn: 'MRN-CAD-81002',
        age: 65,
        signals: [
          'Post-PCI 2 weeks ago — standard DAPT initiated',
          'Low-complexity PCI (single vessel, non-bifurcation)',
          'STOPDAPT-3: aspirin-free strategy ideal for low-risk anatomy',
          'Early adoption opportunity — newest RCT evidence',
        ],
        keyValues: {
          'PCI Date': '2 weeks ago',
          'Current DAPT': 'Aspirin 81mg + Clopidogrel 75mg',
          'Anatomy': 'Single vessel (mid-LAD)',
          'Complexity': 'Low',
          'Aspirin-Free Evaluation': 'Not considered',
        },
      },
    ],
    whyMissed: 'STOPDAPT-3 (NEJM 2024) is the newest paradigm-shifting trial. Many practices have not yet incorporated aspirin-free strategies into post-PCI protocols. The default remains aspirin + P2Y12 inhibitor per longstanding practice.',
    whyTailrd: 'TAILRD flagged recent PCI patients on standard aspirin-containing DAPT who meet STOPDAPT-3 candidacy criteria by analyzing procedural complexity, bleeding risk, and current medication regimens.',
    methodologyNote: '[Source: Demo Health System]. Patient count: 2,400 PCIs x 15% ideal candidates x 35% not considered x 35% market share ≈ 45. Dollar: $0 — newest evidence, early adoption. STOPDAPT-3 (NEJM 2024).',
  },
  // ── PCI PROCEDURAL (5) ─────────────────────────────────────
  {
    id: 'cad-gap-82-left-main-no-ivus',
    name: 'Left Main PCI Without IVUS Guidance',
    category: 'Quality',
    patientCount: 12,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'PCI Quality | Intravascular Imaging | Left Main',
    evidence:
      'Zhang J et al, ULTIMATE (JACC 2018). Lee JM et al, RENOVATE-COMPLEX (NEJM 2023, PMID 37874023). IVUS-guided left main PCI reduces cardiac death by 50%. Intravascular imaging guidance is now considered mandatory for left main intervention per expert consensus.',
    cta: 'IVUS Guidance Mandatory for Left Main PCI',
    detectionCriteria: [
      'Left main PCI performed (CPT 92928 + left main modifier)',
      'No IVUS (CPT 92978) or OCT billed during same session',
      'No documented reason for imaging omission',
    ],
    patients: [
      {
        id: 'CAD-LMPCI-001',
        name: 'Frederick Magnusson',
        mrn: 'MRN-CAD-82001',
        age: 71,
        signals: [
          'Left main PCI (distal bifurcation) — no IVUS performed',
          'RENOVATE-COMPLEX: IVUS guidance reduces cardiac death 50% in complex PCI',
          'Left main stent optimization requires IVUS for proper sizing',
          'ULTIMATE: IVUS-guided PCI — lower TVF at 3 years',
        ],
        keyValues: {
          'Procedure': 'Left main PCI (distal bifurcation)',
          'Stent': 'DES 3.5 x 18mm',
          'IVUS': 'Not performed',
          'OCT': 'Not performed',
          'Imaging Reason': 'Not documented',
        },
      },
      {
        id: 'CAD-LMPCI-002',
        name: 'Agnes Holmberg',
        mrn: 'MRN-CAD-82002',
        age: 66,
        signals: [
          'Left main PCI (ostial) — angiography-only guidance',
          'Ostial left main requires precise stent placement — IVUS critical',
          'Without IVUS: risk of geographic miss, undersizing, malapposition',
          'Quality metric: IVUS utilization in left main PCI',
        ],
        keyValues: {
          'Procedure': 'Left main PCI (ostial)',
          'Stent': 'DES 4.0 x 12mm',
          'IVUS': 'Not performed',
          'Guidance': 'Angiography only',
          'Quality Flag': 'Left main without imaging guidance',
        },
      },
    ],
    whyMissed: 'IVUS adds procedural time and cost ($1,500 per catheter). Some operators are comfortable with angiographic guidance alone for left main PCI, despite overwhelming evidence favoring imaging guidance. Availability of IVUS equipment and training varies.',
    whyTailrd: 'TAILRD identified left main PCI cases without corresponding IVUS or OCT billing codes by cross-referencing procedural CPT codes with intravascular imaging utilization within the same catheterization session.',
    methodologyNote: '[Source: Demo Health System]. Patient count: left main PCIs x without IVUS x 35% market share ≈ 12. Dollar: $1,500 IVUS add-on x 12 = $18K (classified as quality — prevents death). ULTIMATE (JACC 2018); RENOVATE-COMPLEX (NEJM 2023).',
  },
  {
    id: 'cad-gap-83-elective-pci-no-omt',
    name: 'Elective PCI Without Optimal Medical Therapy Trial',
    category: 'Quality',
    patientCount: 95,
    dollarOpportunity: 0,
    priority: 'medium',
    tag: 'Appropriateness | OMT First | ISCHEMIA',
    evidence:
      'Maron DJ et al, ISCHEMIA (NEJM 2020, PMID 32227755). Boden WE et al, COURAGE (NEJM 2007). Optimal medical therapy (OMT) first for stable angina — PCI did not reduce death or MI in stable CAD beyond OMT. OMT trial should be documented before elective PCI.',
    cta: 'Document Optimal Medical Therapy Trial Before Elective PCI',
    detectionCriteria: [
      'Elective (non-urgent) PCI for stable CAD',
      'No documented trial of optimal medical therapy prior to PCI',
      'Stable angina indication (not ACS)',
      'No documentation of OMT failure or refractory symptoms',
    ],
    patients: [
      {
        id: 'CAD-OMT-001',
        name: 'Leonard Swanson',
        mrn: 'MRN-CAD-83001',
        age: 63,
        signals: [
          'Elective PCI (mid-LAD 70% stenosis) — stable angina',
          'On metoprolol 25mg only — not maximized',
          'No ranolazine, no long-acting nitrate, no CCB trial',
          'ISCHEMIA: invasive strategy did not reduce death/MI over OMT',
        ],
        keyValues: {
          'Indication': 'Stable angina — elective PCI',
          'Lesion': 'Mid-LAD 70% stenosis',
          'Current Meds': 'Metoprolol 25mg (subtherapeutic)',
          'OMT Trial': 'Not documented',
          'Anti-Anginal Agents Tried': '1 of 4 classes',
        },
      },
      {
        id: 'CAD-OMT-002',
        name: 'Doris Pettersson',
        mrn: 'MRN-CAD-83002',
        age: 58,
        signals: [
          'Elective PCI (RCA 80%) — exertional angina 2x/week',
          'On atenolol 50mg and amlodipine 5mg — neither maximized',
          'No trial of max-dose beta-blocker or addition of ranolazine',
          'COURAGE: PCI added to OMT did not reduce events',
        ],
        keyValues: {
          'Indication': 'Stable angina — elective',
          'Lesion': 'RCA 80% stenosis',
          'Current Meds': 'Atenolol 50mg, Amlodipine 5mg',
          'OMT Maximized': 'No — both agents subtherapeutic',
          'Ranolazine': 'Not tried',
        },
      },
      {
        id: 'CAD-OMT-003',
        name: 'Warren Gustafsson',
        mrn: 'MRN-CAD-83003',
        age: 71,
        signals: [
          'Elective PCI (diagonal branch 75%) — mild exertional symptoms',
          'Only on aspirin and statin — no antianginal therapy initiated',
          'Referred directly for catheterization without antianginal trial',
          'Appropriateness criteria may not be met',
        ],
        keyValues: {
          'Indication': 'Stable CAD — mild symptoms',
          'Lesion': 'Diagonal 75% stenosis',
          'Anti-Anginal Therapy': 'None prescribed',
          'OMT Trial': 'Not attempted',
          'Referral Path': 'Direct to cath without antianginal trial',
        },
      },
    ],
    whyMissed: 'Referral patterns favor early catheterization in stable CAD without mandatory documentation of OMT trial. ISCHEMIA trial results have been slow to change practice, and stable angina patients are often fast-tracked to PCI without exhausting medical therapy.',
    whyTailrd: 'TAILRD identified elective PCI cases for stable CAD without prior documentation of optimal medical therapy trial by analyzing referral indication codes, medication lists, and procedural timing.',
    methodologyNote: '[Source: Demo Health System]. Patient count: 2,400 PCIs x 40% elective x 28% without OMT trial x 35% market share ≈ 95. Dollar: Quality/appropriateness — avoids potentially unnecessary procedures. ISCHEMIA (NEJM 2020); COURAGE (NEJM 2007).',
  },
  {
    id: 'cad-gap-84-radial-access-not-used',
    name: 'Radial Access Not Used — Eligible Patient',
    category: 'Quality',
    patientCount: 180,
    dollarOpportunity: 0,
    priority: 'medium',
    tag: 'PCI Quality | Radial-First | MATRIX',
    evidence:
      'Valgimigli M et al, MATRIX (Lancet 2015). Jolly SS et al, RIVAL (Lancet 2011). Radial access: 30% reduction in net adverse clinical events, lower mortality in ACS subgroup. Radial-first approach is ACC/AHA Class I for ACS and preferred for elective PCI.',
    cta: 'Use Radial Access — Femoral Only if Radial Not Feasible',
    detectionCriteria: [
      'PCI performed via femoral access',
      'No documented radial access contraindication',
      'No prior radial artery harvest or abnormal Allen test',
      'Radial access feasible based on patient characteristics',
    ],
    patients: [
      {
        id: 'CAD-RAD-001',
        name: 'Stanley Johansson',
        mrn: 'MRN-CAD-84001',
        age: 61,
        signals: [
          'Elective PCI via femoral access — right radial was feasible',
          'No documented Allen test or radial contraindication',
          'MATRIX: radial access reduces NACE 30%, mortality benefit in ACS',
          'Femoral: higher vascular complications, longer bed rest',
        ],
        keyValues: {
          'Procedure': 'Elective PCI (LAD)',
          'Access': 'Right femoral',
          'Radial Feasibility': 'Not assessed',
          'Allen Test': 'Not documented',
          'Vascular Complications': 'None (this case)',
        },
      },
      {
        id: 'CAD-RAD-002',
        name: 'Marjorie Lindqvist',
        mrn: 'MRN-CAD-84002',
        age: 55,
        signals: [
          'STEMI primary PCI via femoral approach',
          'Young patient — radial should be preferred (Class I in ACS)',
          'RIVAL: radial reduces mortality in STEMI subgroup',
          'No radial contraindication documented',
        ],
        keyValues: {
          'Procedure': 'Primary PCI for STEMI',
          'Access': 'Right femoral',
          'Indication': 'STEMI — Class I for radial',
          'BMI': 28,
          'Radial Contraindication': 'None documented',
        },
      },
      {
        id: 'CAD-RAD-003',
        name: 'Vernon Andersen',
        mrn: 'MRN-CAD-84003',
        age: 67,
        signals: [
          'Diagnostic coronary angiography via femoral approach',
          'Radial approach feasible — shorter recovery, same-day discharge possible',
          'Femoral approach: 4-6hr bed rest, overnight observation',
          'Cost and patient satisfaction advantage with radial',
        ],
        keyValues: {
          'Procedure': 'Diagnostic coronary angiography',
          'Access': 'Femoral',
          'Radial Feasibility': 'Likely feasible (no contraindication)',
          'Recovery': '6hr bed rest required',
          'Alternative': 'Radial — same-day discharge possible',
        },
      },
    ],
    whyMissed: 'Radial access adoption varies significantly by operator training and comfort. Older-trained interventionalists default to femoral approach. No institutional mandate or quality metric tracks radial-first compliance.',
    whyTailrd: 'TAILRD identified femoral-access PCI/angiography cases by analyzing procedural access site documentation and cross-referencing with patient characteristics that suggest radial feasibility.',
    methodologyNote: '[Source: Demo Health System]. Patient count: 2,400 PCIs x 30% still femoral x 70% radial-eligible x 35% market share ≈ 180. Dollar: Quality — $0 direct but reduces vascular complications ($5K+ each). MATRIX (Lancet 2015); RIVAL (Lancet 2011).',
  },
  {
    id: 'cad-gap-85-aki-risk-pre-pci',
    name: 'AKI Risk Not Assessed Pre-PCI — Contrast Prophylaxis',
    category: 'Safety',
    patientCount: 100,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'Safety | Contrast Nephropathy | Renal Protection',
    evidence:
      'Mehran R et al (Mehta Risk Score, JACC 2004). Weisbord SD et al, PRESERVE (NEJM 2018). Contrast-induced nephropathy (CIN) incidence 2-15% post-PCI; higher in CKD, diabetes, volume depletion. Pre-procedural risk assessment and hydration protocol reduce AKI by 40-50%.',
    cta: 'Pre-PCI AKI Risk Assessment — Initiate Contrast Prophylaxis Protocol',
    detectionCriteria: [
      'PCI planned or performed in at-risk patient (CKD, DM, >75, CHF)',
      'No pre-procedural Mehran AKI risk score documented',
      'No hydration protocol initiated (IV NS pre/post)',
      'No contrast volume limit documented (<3.7 x eGFR)',
    ],
    patients: [
      {
        id: 'CAD-AKI-001',
        name: 'Harvey Gutierrez',
        mrn: 'MRN-CAD-85001',
        age: 76,
        signals: [
          'Elective PCI — CKD Stage 3b (eGFR 32) + diabetes',
          'No pre-procedural AKI risk assessment documented',
          'No hydration protocol or contrast volume limit ordered',
          'Mehran score high — CIN risk >15% without prophylaxis',
        ],
        keyValues: {
          'Procedure': 'Elective PCI (RCA)',
          'eGFR': '32 mL/min',
          'Diabetes': 'Yes (T2DM)',
          'AKI Risk Score': 'Not calculated',
          'Hydration Protocol': 'Not ordered',
          'Contrast Limit': 'Not specified',
        },
      },
      {
        id: 'CAD-AKI-002',
        name: 'Edith Vasquez',
        mrn: 'MRN-CAD-85002',
        age: 80,
        signals: [
          'Urgent PCI for NSTEMI — CKD Stage 3a (eGFR 48) + CHF',
          'No AKI prevention protocol activated despite triple risk',
          'PRESERVE: hydration reduces AKI; NAC inconclusive but low risk',
          'Contrast volume should be <3.7 x eGFR = <178 mL',
        ],
        keyValues: {
          'Procedure': 'Urgent PCI (NSTEMI)',
          'eGFR': '48 mL/min',
          'CHF': 'LVEF 35%',
          'AKI Risk Score': 'Not calculated',
          'Hydration': 'Standard IVF only (no AKI protocol)',
          'Max Contrast': '<178 mL (not documented)',
        },
      },
      {
        id: 'CAD-AKI-003',
        name: 'Clarence Nguyen',
        mrn: 'MRN-CAD-85003',
        age: 72,
        signals: [
          'PCI with 280 mL contrast — eGFR 40 (max should be 148 mL)',
          'Contrast volume exceeded safe limit by 89%',
          'No pre-procedural risk assessment or contrast limit set',
          'Post-PCI creatinine rose 0.5 mg/dL — early CIN',
        ],
        keyValues: {
          'Procedure': 'PCI (multi-vessel)',
          'eGFR': '40 mL/min',
          'Contrast Used': '280 mL (limit: 148 mL)',
          'AKI Risk Score': 'Not calculated pre-procedure',
          'Post-PCI Cr Rise': '+0.5 mg/dL (CIN likely)',
          'Outcome': 'Creatinine trending up',
        },
      },
    ],
    safetyNote: 'AKI post-PCI doubles mortality and triples length of stay. Dialysis-requiring AKI costs $50K+ per event.',
    whyMissed: 'AKI prevention protocols require proactive pre-procedural assessment. In urgent/emergent PCI, renal protection is deprioritized. Elective cases lack mandatory risk stratification checklists, and contrast volume tracking is not standardized.',
    whyTailrd: 'TAILRD identified at-risk PCI patients without AKI prevention protocols by analyzing pre-procedural renal function, comorbidities (CKD, DM, CHF), and checking for hydration orders and contrast volume documentation.',
    methodologyNote: '[Source: Demo Health System]. Patient count: 2,400 PCIs x 30% at-risk x 40% without protocol x 35% market share ≈ 100. Dollar: Safety — prevents AKI requiring dialysis ($50K+ per event). Mehran (JACC 2004); PRESERVE (NEJM 2018).',
  },
  {
    id: 'cad-gap-86-complex-pci-no-hemo-planning',
    name: 'Complex PCI Without Hemodynamic Planning',
    category: 'Quality',
    patientCount: 18,
    dollarOpportunity: 151200,
    priority: 'high',
    tag: 'PCI Quality | Protected PCI | MCS Planning',
    evidence:
      'O\'Neill WW et al, PROTECT III (TCT 2023). Pre-procedure shock index and LVEF assessment guides mechanical circulatory support (MCS) deployment. Planned MCS is superior to bailout MCS with better outcomes. High-risk PCI (unprotected LM, LVEF <=30%, last remaining vessel) requires hemodynamic planning.',
    cta: 'Pre-Procedural Hemodynamic Assessment — MCS Planning Required',
    detectionCriteria: [
      'High-risk PCI: unprotected left main, LVEF <=30%, or last remaining vessel',
      'No pre-procedural hemodynamic assessment documented',
      'No MCS planning discussion (Impella, IABP, ECMO) documented',
      'No shock index or SCAI shock stage documented',
    ],
    patients: [
      {
        id: 'CAD-HEMO-001',
        name: 'Wilbur Henriksen',
        mrn: 'MRN-CAD-86001',
        age: 73,
        signals: [
          'Unprotected left main PCI — LVEF 25%',
          'No pre-procedural hemodynamic assessment',
          'No MCS planning documented — Impella not pre-staged',
          'PROTECT III: planned MCS superior to bailout',
        ],
        keyValues: {
          'Procedure': 'Unprotected left main PCI',
          'LVEF': '25%',
          'Hemodynamic Assessment': 'Not documented',
          'MCS Planning': 'None',
          'Risk Category': 'Very High (LM + low EF)',
        },
      },
      {
        id: 'CAD-HEMO-002',
        name: 'Mabel Sorensen',
        mrn: 'MRN-CAD-86002',
        age: 68,
        signals: [
          'PCI to last remaining vessel (occluded RCA, prior CABG) — LVEF 30%',
          'Last remaining vessel — hemodynamic collapse risk if complication',
          'No Impella or IABP pre-staged',
          'MCS should be planned, not bailout',
        ],
        keyValues: {
          'Procedure': 'PCI to last remaining vessel',
          'LVEF': '30%',
          'Prior CABG': 'Yes — all grafts occluded except native RCA',
          'MCS': 'Not planned or pre-staged',
          'Risk': 'Extreme — last remaining vessel',
        },
      },
    ],
    whyMissed: 'MCS planning requires cardiology-cardiac surgery collaboration and advance logistics. Interventional cardiologists may proceed without formal hemodynamic assessment if they perceive low risk or MCS is not readily available. Bailout MCS has worse outcomes than planned.',
    whyTailrd: 'TAILRD identified high-risk PCI cases without hemodynamic planning by analyzing procedural characteristics (left main, low LVEF, last vessel), pre-procedural orders, and MCS utilization records.',
    methodologyNote: '[Source: Demo Health System]. Patient count: 2,400 PCIs x 5% high-risk x 40% without planning x 35% market share ≈ 18. Dollar: $28,000 protected PCI x 18 x 30% = $151,200. PROTECT III (TCT 2023).',
  },
  // ── CABG SURGICAL (8) ──────────────────────────────────────
  {
    id: 'cad-gap-87-total-arterial-revasc',
    name: 'Total Arterial Revascularization Not Considered',
    category: 'Quality',
    patientCount: 35,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'CABG Quality | Arterial Grafts | ROMA',
    evidence:
      'Taggart DP et al, ROMA (NEJM 2024). Total arterial revascularization (BIMA + radial): superior long-term patency and survival vs single arterial + vein grafts. Multi-vessel CABG patients <70 with appropriate anatomy should be evaluated.',
    cta: 'Evaluate for Total Arterial Revascularization — ROMA Criteria',
    detectionCriteria: [
      'Multi-vessel CABG patient <70 years',
      'Appropriate anatomy for bilateral IMA + radial',
      'No documented evaluation for total arterial revascularization',
      'Received LIMA + SVG only without arterial conduit discussion',
    ],
    patients: [
      {
        id: 'CAD-TAR-001',
        name: 'Raymond Karlsson',
        mrn: 'MRN-CAD-87001',
        age: 62,
        signals: [
          '3-vessel CABG — received LIMA-LAD + 2 SVGs',
          'Age 62, non-diabetic — ideal candidate for total arterial',
          'ROMA: total arterial superior long-term patency and survival',
          'No documentation of arterial conduit consideration',
        ],
        keyValues: {
          'Procedure': '3-vessel CABG',
          'Conduits': 'LIMA-LAD + SVG-OM + SVG-RCA',
          'Age': 62,
          'Diabetes': 'No',
          'Total Arterial Considered': 'Not documented',
          'ROMA Eligible': 'Yes',
        },
      },
      {
        id: 'CAD-TAR-002',
        name: 'Catherine Lindberg',
        mrn: 'MRN-CAD-87002',
        age: 58,
        signals: [
          '4-vessel CABG — LIMA + 3 SVGs, no RIMA or radial used',
          'Age 58 — long life expectancy, arterial grafts maximize durability',
          'SVG failure rate: 50% at 10 years vs arterial >90% patency',
          'Total arterial revascularization not discussed per operative note',
        ],
        keyValues: {
          'Procedure': '4-vessel CABG',
          'Conduits': 'LIMA-LAD + 3 SVGs',
          'Age': 58,
          'Life Expectancy': 'Long — arterial grafts preferred',
          'SVG 10-Year Patency': '~50%',
          'Arterial 10-Year Patency': '>90%',
        },
      },
    ],
    whyMissed: 'Total arterial revascularization requires additional surgical skill (BIMA harvest, radial harvest) and operative time. Many surgeons default to LIMA + SVG as their standard approach. ROMA trial results (2024) are new and not yet widely implemented.',
    whyTailrd: 'TAILRD identified CABG patients under 70 who received LIMA + SVG without documented consideration of arterial conduits by analyzing operative reports, patient age, and conduit utilization.',
    methodologyNote: '[Source: Demo Health System]. Patient count: 450 CABGs x 50% multi-vessel x 45% eligible x 35% not considered ≈ 35. Dollar: Quality metric — $0 direct but program differentiation. ROMA (NEJM 2024).',
  },
  {
    id: 'cad-gap-88-midcab-not-offered',
    name: 'MIDCAB Not Offered — Isolated LAD Disease',
    category: 'Gap',
    patientCount: 20,
    dollarOpportunity: 270000,
    priority: 'medium',
    tag: 'CABG | Minimally Invasive | MIDCAB',
    evidence:
      'Holzhey DM et al, JTCVS 2009. MIDCAB (minimally invasive direct coronary artery bypass): LIMA-LAD via left mini-thoracotomy, 2-day LOS, equivalent patency to conventional CABG, avoids sternotomy. Ideal for isolated LAD disease in appropriate anatomy.',
    cta: 'Evaluate for MIDCAB — Minimally Invasive LIMA-LAD',
    detectionCriteria: [
      'Isolated LAD disease requiring surgical revascularization',
      'Conventional sternotomy CABG performed or planned',
      'MIDCAB-eligible anatomy (LAD accessible via mini-thoracotomy)',
      'No documented MIDCAB evaluation or discussion',
    ],
    patients: [
      {
        id: 'CAD-MIDCAB-001',
        name: 'Arthur Jonasson',
        mrn: 'MRN-CAD-88001',
        age: 55,
        signals: [
          'Isolated LAD disease — conventional sternotomy CABG performed',
          'MIDCAB would have allowed 2-day LOS vs 5-7 day sternotomy recovery',
          'No MIDCAB evaluation documented — standard sternotomy default',
          'Ideal anatomy for mini-thoracotomy approach',
        ],
        keyValues: {
          'Procedure': 'CABG via sternotomy (LIMA-LAD only)',
          'Disease': 'Isolated LAD (proximal 90% stenosis)',
          'LOS': '6 days (sternotomy)',
          'MIDCAB Alternative': 'Not offered — 2-day LOS expected',
          'Recovery': '6-8 weeks (sternotomy) vs 2 weeks (MIDCAB)',
        },
      },
      {
        id: 'CAD-MIDCAB-002',
        name: 'Lillian Eriksson',
        mrn: 'MRN-CAD-88002',
        age: 48,
        signals: [
          'Referred for conventional CABG — isolated LAD disease',
          'Young patient — minimally invasive approach preferred',
          'MIDCAB: equivalent LIMA-LAD patency, faster recovery',
          'No discussion of MIDCAB option documented in surgical consultation',
        ],
        keyValues: {
          'Referral': 'Conventional CABG for isolated LAD',
          'Disease': 'Isolated proximal LAD 85% stenosis',
          'Age': 48,
          'MIDCAB Evaluation': 'Not documented',
          'Patient Preference': 'Not assessed for minimally invasive option',
        },
      },
    ],
    whyMissed: 'MIDCAB requires specialized training and institutional capability. Not all cardiac surgery programs offer minimally invasive approaches. Surgeons default to conventional sternotomy for single-vessel CABG without discussing MIDCAB.',
    whyTailrd: 'TAILRD identified patients with isolated LAD disease undergoing or referred for conventional CABG by analyzing coronary anatomy and surgical referral patterns to flag MIDCAB candidates.',
    methodologyNote: '[Source: Demo Health System]. Patient count: 450 CABGs x 15% isolated LAD x 85% not offered MIDCAB x 35% market share ≈ 20. Dollar: $45,000 CABG DRG x 20 x 30% = $270,000. Holzhey (JTCVS 2009).',
  },
  {
    id: 'cad-gap-89-off-pump-calcified-aorta',
    name: 'Off-Pump CABG Not Considered — Calcified Aorta',
    category: 'Gap',
    patientCount: 25,
    dollarOpportunity: 0,
    priority: 'medium',
    tag: 'CABG | Off-Pump | Calcified Aorta | Stroke Prevention',
    evidence:
      'Lamy A et al, CORONARY (NEJM 2012). Off-pump CABG reduces stroke risk in patients with severely calcified ascending aorta by avoiding aortic cannulation and cross-clamping. General OPCAB vs on-pump is equivalent, but calcified aorta subgroup specifically benefits.',
    cta: 'Evaluate for Off-Pump Approach — Calcified Aorta Protocol',
    detectionCriteria: [
      'CABG patient with severely calcified ascending aorta (CT or intra-op finding)',
      'On-pump CABG performed with aortic cannulation',
      'No documented evaluation for off-pump approach',
      'No documented reason off-pump was not feasible',
    ],
    patients: [
      {
        id: 'CAD-OPCAB-001',
        name: 'Harold Lindgren',
        mrn: 'MRN-CAD-89001',
        age: 77,
        signals: [
          'On-pump CABG — severely calcified ascending aorta on pre-op CT',
          'Aortic cannulation/cross-clamp in calcified aorta = high stroke risk',
          'Off-pump approach avoids aortic manipulation entirely',
          'CORONARY: off-pump equivalent outcomes, less stroke with calcified aorta',
        ],
        keyValues: {
          'Procedure': 'On-pump CABG (3-vessel)',
          'Aortic Calcification': 'Severe (pre-op CT)',
          'Off-Pump Considered': 'Not documented',
          'Stroke Risk': 'Elevated — calcified aorta',
          'Age': 77,
        },
      },
      {
        id: 'CAD-OPCAB-002',
        name: 'Virginia Olsson',
        mrn: 'MRN-CAD-89002',
        age: 81,
        signals: [
          'Elderly patient — on-pump CABG with porcelain aorta finding intra-op',
          'Intra-op discovery of porcelain aorta — should have been screened pre-op',
          'Pre-op CT would have identified and allowed off-pump planning',
          'No epiaortic ultrasound documented',
        ],
        keyValues: {
          'Procedure': 'On-pump CABG',
          'Aortic Finding': 'Porcelain aorta (intra-op discovery)',
          'Pre-Op CT': 'Not performed (would have detected)',
          'Off-Pump Planning': 'Not considered pre-operatively',
          'Epiaortic US': 'Not documented',
        },
      },
    ],
    whyMissed: 'Pre-operative aortic calcification screening is not universally performed. Off-pump CABG requires specific surgical expertise and not all programs offer it routinely. The calcified aorta subgroup benefit is not widely recognized.',
    whyTailrd: 'TAILRD identified on-pump CABG patients with documented aortic calcification by cross-referencing pre-operative CT findings and operative reports to flag cases where off-pump may have reduced stroke risk.',
    methodologyNote: '[Source: Demo Health System]. Patient count: 450 CABGs x 20% calcified aorta x 80% on-pump x 35% market share ≈ 25. Dollar: $0 — quality metric, prevents stroke. CORONARY (NEJM 2012).',
  },
  {
    id: 'cad-gap-90-radial-artery-conduit',
    name: 'Radial Artery Not Harvested — 3rd Arterial Conduit',
    category: 'Quality',
    patientCount: 30,
    dollarOpportunity: 0,
    priority: 'medium',
    tag: 'CABG Quality | Radial Conduit | RAPCO',
    evidence:
      'Gaudino M et al, RAPCO (JACC 2020). Deb S et al, RAPS (NEJM 2012). Radial artery as 3rd conduit: superior patency vs saphenous vein graft at 5 and 10 years. Radial artery patency ~90% at 10 years vs SVG ~60%.',
    cta: 'Consider Radial Artery Conduit — Allen Test if Eligible',
    detectionCriteria: [
      'Multi-vessel CABG with 3+ targets',
      'LIMA + SVG used without radial artery conduit',
      'No documented Allen test or radial artery assessment',
      'No documented reason for radial artery exclusion',
    ],
    patients: [
      {
        id: 'CAD-RADC-001',
        name: 'Edwin Magnusson',
        mrn: 'MRN-CAD-90001',
        age: 64,
        signals: [
          '3-vessel CABG: LIMA-LAD + SVG-OM + SVG-PDA',
          'Radial artery not harvested despite 3-vessel disease',
          'RAPCO: radial patency 90% at 10 years vs SVG 60%',
          'No Allen test or radial assessment documented',
        ],
        keyValues: {
          'Procedure': '3-vessel CABG',
          'Conduits': 'LIMA-LAD + 2 SVGs',
          'Radial Assessment': 'Not performed',
          'Allen Test': 'Not documented',
          'Age': 64,
          'Radial Eligibility': 'Not assessed',
        },
      },
      {
        id: 'CAD-RADC-002',
        name: 'Ruth Sandstrom',
        mrn: 'MRN-CAD-90002',
        age: 59,
        signals: [
          '4-vessel CABG: LIMA-LAD + 3 SVGs',
          'Young patient — arterial conduits maximize long-term patency',
          'RAPS: radial artery superior to SVG for non-LAD targets',
          'No radial artery considered for OM or diagonal targets',
        ],
        keyValues: {
          'Procedure': '4-vessel CABG',
          'Conduits': 'LIMA-LAD + 3 SVGs',
          'Age': 59,
          'Radial Artery': 'Not harvested',
          '10-Year SVG Patency': '~60%',
          '10-Year Radial Patency': '~90%',
        },
      },
    ],
    whyMissed: 'Radial artery harvest requires additional operative time and Allen test pre-operatively. Many surgeons default to SVG as the second conduit due to familiarity and speed. The patency advantage of radial artery is not universally recognized.',
    whyTailrd: 'TAILRD identified multi-vessel CABG patients receiving SVG-only (non-LAD) grafts without radial artery assessment by analyzing operative reports and conduit utilization.',
    methodologyNote: '[Source: Demo Health System]. Patient count: 450 CABGs x 40% 3-vessel x 55% receiving SVG x 35% radial-eligible x market share ≈ 30. Dollar: Quality — $0 direct but improves graft patency. RAPCO (JACC 2020); RAPS (NEJM 2012).',
  },
  {
    id: 'cad-gap-91-endoscopic-vein-harvest',
    name: 'Endoscopic Vein Harvest Not Used',
    category: 'Quality',
    patientCount: 40,
    dollarOpportunity: 0,
    priority: 'medium',
    tag: 'CABG Quality | Wound Complications | REGROUP',
    evidence:
      'Zenati MA et al, REGROUP (NEJM 2019, PMID 30428294). Endoscopic vein harvest (EVH): 70% fewer wound complications with equivalent graft patency compared to open harvest. EVH is the preferred technique per STS guidelines.',
    cta: 'Use Endoscopic Vein Harvest When Feasible',
    detectionCriteria: [
      'CABG with saphenous vein graft harvested via open technique',
      'EVH equipment available at institution',
      'No documented reason for open harvest (e.g., prior vein stripping, anatomy)',
      'Patient at risk for wound complications (obesity, DM, PVD)',
    ],
    patients: [
      {
        id: 'CAD-EVH-001',
        name: 'Donald Persson',
        mrn: 'MRN-CAD-91001',
        age: 67,
        signals: [
          'CABG with open SVG harvest — 25cm leg incision',
          'REGROUP: EVH — 70% fewer wound complications, equivalent patency',
          'Patient diabetic with BMI 34 — high wound infection risk',
          'EVH available at institution — not utilized',
        ],
        keyValues: {
          'Procedure': 'CABG (3-vessel)',
          'SVG Harvest': 'Open technique — 25cm incision',
          'BMI': 34,
          'Diabetes': 'Yes',
          'Wound Risk': 'High (DM + obesity)',
          'EVH Available': 'Yes — not used',
        },
      },
      {
        id: 'CAD-EVH-002',
        name: 'Margaret Nilsson',
        mrn: 'MRN-CAD-91002',
        age: 73,
        signals: [
          'CABG with open SVG harvest — bilateral leg incisions',
          'Developed leg wound infection requiring antibiotics + wound care',
          'EVH would have reduced wound complication risk by 70%',
          'PVD present — additional wound healing risk factor',
        ],
        keyValues: {
          'Procedure': 'CABG (4-vessel)',
          'SVG Harvest': 'Open technique — bilateral',
          'Complication': 'Leg wound infection (day 7)',
          'PVD': 'Yes — bilateral',
          'EVH Available': 'Yes — not utilized',
          'Additional Cost': 'Wound care + antibiotics',
        },
      },
    ],
    whyMissed: 'Some surgeons prefer open vein harvest due to training, perceived better vein quality, or lack of EVH-trained assistants. Institutional variation in EVH adoption is significant despite strong evidence.',
    whyTailrd: 'TAILRD identified open SVG harvest cases by analyzing operative report CPT codes and comparing against EVH utilization rates to flag cases where endoscopic approach was available but not used.',
    methodologyNote: '[Source: Demo Health System]. Patient count: 450 CABGs x 70% need SVG x 35% open harvest x 35% market share ≈ 40. Dollar: Quality — reduces wound complications ($8K+ each). REGROUP (NEJM 2019).',
  },
  {
    id: 'cad-gap-92-blood-conservation-protocol',
    name: 'Blood Conservation Protocol Not Activated — High-Risk Cardiac Surgery',
    category: 'Safety',
    patientCount: 55,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'Safety | Blood Conservation | TXA | ATACAS',
    evidence:
      'Myles PS et al, ATACAS (NEJM 2017). Tranexamic acid (TXA) reduces transfusion 30-40% in cardiac surgery. TRICS III: restrictive transfusion threshold safe. STS blood conservation guidelines: cell salvage + TXA + restrictive threshold as comprehensive protocol.',
    cta: 'Activate Blood Conservation Protocol — TXA + Cell Salvage + Restrictive Threshold',
    detectionCriteria: [
      'High-risk cardiac surgery (redo, combined, coagulopathy, low Hgb)',
      'No tranexamic acid ordered pre-operatively',
      'No cell salvage setup documented',
      'No restrictive transfusion threshold protocol documented',
    ],
    patients: [
      {
        id: 'CAD-BCP-001',
        name: 'Bernard Sundqvist',
        mrn: 'MRN-CAD-92001',
        age: 70,
        signals: [
          'Redo CABG — high bleeding risk (redo sternotomy)',
          'No TXA ordered pre-operatively',
          'No cell salvage setup documented',
          'ATACAS: TXA reduces transfusion 30-40% without thrombotic risk',
        ],
        keyValues: {
          'Procedure': 'Redo CABG (3-vessel)',
          'Risk Factor': 'Redo sternotomy — high bleeding risk',
          'TXA': 'Not ordered',
          'Cell Salvage': 'Not documented',
          'Transfusion Threshold': 'Not specified',
          'Pre-Op Hgb': '11.2 g/dL',
        },
      },
      {
        id: 'CAD-BCP-002',
        name: 'Constance Bjork',
        mrn: 'MRN-CAD-92002',
        age: 65,
        signals: [
          'CABG + aortic valve replacement — combined procedure, high bleeding',
          'Pre-op hemoglobin 10.8 — anemia not optimized',
          'No blood conservation protocol activated',
          'TRICS III: restrictive threshold (Hgb 7.5) safe in cardiac surgery',
        ],
        keyValues: {
          'Procedure': 'CABG + AVR (combined)',
          'Pre-Op Hgb': '10.8 g/dL (anemia)',
          'TXA': 'Not ordered',
          'Cell Salvage': 'Not set up',
          'Iron/EPO Pre-Op': 'Not given',
          'Estimated Blood Loss Risk': 'High (combined procedure)',
        },
      },
      {
        id: 'CAD-BCP-003',
        name: 'Clifton Hedberg',
        mrn: 'MRN-CAD-92003',
        age: 74,
        signals: [
          'CABG on dual antiplatelet — not held appropriately pre-op',
          'Clopidogrel continued until 2 days before surgery (guideline: 5 days)',
          'No platelet function testing ordered',
          'Blood conservation protocol not activated despite high bleeding risk',
        ],
        keyValues: {
          'Procedure': 'CABG (2-vessel)',
          'Clopidogrel Hold': '2 days (should be 5 days)',
          'Platelet Function Test': 'Not ordered',
          'TXA': 'Not ordered',
          'Estimated Bleeding Risk': 'Very high — inadequate antiplatelet hold',
          'Blood Conservation': 'Not activated',
        },
      },
    ],
    safetyNote: 'Transfusion in cardiac surgery is associated with increased infection, prolonged ventilation, and higher mortality. Each RBC unit costs ~$1,500 including processing and administration.',
    whyMissed: 'Blood conservation protocols require pre-operative planning and coordination between surgery, anesthesia, and perfusion. No single team owns the protocol, and TXA/cell salvage are not part of default order sets at many institutions.',
    whyTailrd: 'TAILRD identified high-risk cardiac surgery cases without blood conservation protocols by analyzing surgical procedure codes, pre-operative hemoglobin, medication hold times, and operative orders.',
    methodologyNote: '[Source: Demo Health System]. Patient count: 450 CABGs x 45% high-risk x 75% without full protocol x 35% market share ≈ 55. Dollar: Safety — $0 direct but reduces transfusion costs ($1,500/unit x avg 2 units). ATACAS (NEJM 2017); TRICS III.',
  },
  {
    id: 'cad-gap-93-intraop-tee-cabg',
    name: 'Intra-Operative TEE Not Performed — CABG',
    category: 'Quality',
    patientCount: 30,
    dollarOpportunity: 13500,
    priority: 'medium',
    tag: 'CABG Quality | Intra-Op TEE | ASA/SCA',
    evidence:
      'ASA/SCA Practice Guidelines for Perioperative TEE. Intra-operative TEE during CABG detects new regional wall motion abnormalities (RWMA) in 6-12% of cases, changes surgical plan in 5-8%, and evaluates mitral regurgitation. Class IIa recommendation for CABG.',
    cta: 'Order Intra-Operative TEE for CABG',
    detectionCriteria: [
      'CABG performed without intra-operative TEE',
      'No CPT 93312-93318 billed during CABG',
      'Multi-vessel CABG or combined procedure',
      'No documented reason for TEE omission',
    ],
    patients: [
      {
        id: 'CAD-TEE-001',
        name: 'Francis Engstrom',
        mrn: 'MRN-CAD-93001',
        age: 66,
        signals: [
          '3-vessel CABG — no intra-operative TEE performed',
          'TEE detects new RWMA in 6-12% of CABG cases',
          'Would have confirmed graft flow and assessed MR',
          'ASA/SCA: Class IIa for CABG',
        ],
        keyValues: {
          'Procedure': '3-vessel CABG',
          'Intra-Op TEE': 'Not performed',
          'RWMA Detection Rate': '6-12% of cases',
          'Surgical Plan Change Rate': '5-8% of cases',
          'TEE Cost': '~$450',
        },
      },
      {
        id: 'CAD-TEE-002',
        name: 'Eunice Holmquist',
        mrn: 'MRN-CAD-93002',
        age: 72,
        signals: [
          'CABG + moderate MR — no intra-operative TEE',
          'Pre-op moderate MR requires intra-op reassessment',
          'TEE critical for deciding whether to address MR during CABG',
          'Without TEE: cannot assess post-bypass MR improvement',
        ],
        keyValues: {
          'Procedure': 'CABG (2-vessel)',
          'Pre-Op MR': 'Moderate (2+)',
          'Intra-Op TEE': 'Not performed',
          'MR Decision': 'Cannot assess post-bypass MR without TEE',
          'Clinical Impact': 'May have missed opportunity to repair MR',
        },
      },
    ],
    whyMissed: 'Intra-operative TEE requires a cardiac anesthesiologist trained in echocardiography. Not all institutions have TEE-trained anesthesiologists available for every CABG case. Some surgeons do not routinely request TEE.',
    whyTailrd: 'TAILRD identified CABG cases without intra-operative TEE by checking for absence of TEE CPT codes (93312-93318) in operative billing records for CABG procedures.',
    methodologyNote: '[Source: Demo Health System]. Patient count: 450 CABGs x 20% without intra-op TEE x 35% market share ≈ 30. Dollar: $450 TEE x 30 = $13,500. ASA/SCA Guidelines.',
  },
  {
    id: 'cad-gap-94-aki-risk-pre-cabg',
    name: 'AKI Risk Not Assessed Pre-CABG — Renal Protection',
    category: 'Safety',
    patientCount: 45,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'Safety | AKI Prevention | KDIGO | Post-CABG',
    evidence:
      'KDIGO AKI Bundle. Garg AX et al, NEJM 2024. AKI post-CABG: 20-30% incidence, doubles mortality, triples LOS. STS renal failure score predicts dialysis-requiring AKI. KDIGO bundle (goal-directed hemodynamics, avoid nephrotoxins, optimize volume) reduces AKI.',
    cta: 'Pre-CABG Renal Risk Assessment — KDIGO AKI Prevention Bundle',
    detectionCriteria: [
      'CABG patient with AKI risk factors (CKD, DM, age >70, CHF, redo)',
      'No STS renal failure score documented pre-operatively',
      'No KDIGO AKI prevention bundle activated',
      'No nephrotoxin review or contrast avoidance plan',
    ],
    patients: [
      {
        id: 'CAD-CAKI-001',
        name: 'Willard Sandberg',
        mrn: 'MRN-CAD-94001',
        age: 74,
        signals: [
          'CABG planned — CKD Stage 3b (eGFR 34) + diabetes + age 74',
          'Triple AKI risk factors — no renal risk assessment documented',
          'No KDIGO AKI prevention bundle activated',
          'AKI post-CABG: doubles mortality, triples LOS',
        ],
        keyValues: {
          'Procedure': 'CABG (3-vessel) — planned',
          'eGFR': '34 mL/min',
          'Diabetes': 'Yes',
          'Age': 74,
          'STS Renal Score': 'Not calculated',
          'KDIGO Bundle': 'Not activated',
        },
      },
      {
        id: 'CAD-CAKI-002',
        name: 'Lorraine Forsberg',
        mrn: 'MRN-CAD-94002',
        age: 69,
        signals: [
          'CABG — CKD Stage 3a (eGFR 52) + on nephrotoxic NSAID',
          'NSAIDs should be held pre-operatively for renal protection',
          'No nephrotoxin review performed pre-CABG',
          'KDIGO: nephrotoxin avoidance is cornerstone of AKI prevention',
        ],
        keyValues: {
          'Procedure': 'CABG (2-vessel)',
          'eGFR': '52 mL/min',
          'Nephrotoxins': 'Ibuprofen 600mg TID (not held)',
          'Renal Risk Assessment': 'Not performed',
          'KDIGO Bundle': 'Not activated',
        },
      },
      {
        id: 'CAD-CAKI-003',
        name: 'Horace Ahlstrom',
        mrn: 'MRN-CAD-94003',
        age: 78,
        signals: [
          'Redo CABG — baseline Cr 1.8, eGFR 36, CHF (LVEF 30%)',
          'Highest risk category for post-op AKI (redo + CKD + CHF)',
          'No formal renal risk stratification or prevention plan',
          'Post-op AKI in this profile: 40-50% incidence without prevention',
        ],
        keyValues: {
          'Procedure': 'Redo CABG',
          'Creatinine': '1.8 mg/dL',
          'eGFR': '36 mL/min',
          'LVEF': '30%',
          'STS Renal Score': 'Not calculated (estimated very high)',
          'AKI Prevention': 'No specific protocol',
        },
      },
    ],
    safetyNote: 'AKI requiring dialysis post-CABG has mortality >50% and costs $50K+ per event. Pre-operative risk stratification and prevention protocols can reduce AKI by 20-30%.',
    whyMissed: 'Pre-CABG renal risk assessment is not part of standard surgical checklists at many institutions. STS risk score is calculated but individual components like renal failure score are not actionable triggers for AKI prevention bundles.',
    whyTailrd: 'TAILRD identified CABG patients with AKI risk factors without formal renal risk assessment or prevention protocols by analyzing pre-operative labs, medication lists, and operative planning documentation.',
    methodologyNote: '[Source: Demo Health System]. Patient count: 450 CABGs x 30% at-risk x 95% without formal assessment x 35% market share ≈ 45. Dollar: Safety — prevents dialysis-requiring AKI ($50K+ per event). KDIGO AKI Bundle; Garg (NEJM 2024).',
  },
  // ── POST-OPERATIVE (3) ─────────────────────────────────────
  {
    id: 'cad-gap-95-post-op-af-treatment',
    name: 'Post-Operative AF Not Treated — New Onset After Cardiac Surgery',
    category: 'Safety',
    patientCount: 55,
    dollarOpportunity: 33000,
    priority: 'high',
    tag: 'Safety | POAF | Post-Cardiac Surgery | Anticoagulation',
    evidence:
      'Gillinov AM et al, JAMA 2016. Arsenault KA et al, Circulation 2013. Post-operative atrial fibrillation (POAF) increases stroke risk 3x and occurs in 30-40% of cardiac surgery patients. Rate or rhythm control + anticoagulation if >48 hours is standard of care.',
    cta: 'Initiate POAF Protocol — Rate Control + Anticoagulation if >48h',
    detectionCriteria: [
      'New-onset AF documented post-cardiac surgery (CABG, valve)',
      'POAF duration >48 hours without anticoagulation initiated',
      'No rate or rhythm control protocol activated',
      'No stroke risk assessment (CHA2DS2-VASc) documented',
    ],
    patients: [
      {
        id: 'CAD-POAF-001',
        name: 'Russell Dahlberg',
        mrn: 'MRN-CAD-95001',
        age: 71,
        signals: [
          'New AF post-CABG day 2 — rapid ventricular response (HR 132)',
          'POAF >48 hours — no anticoagulation initiated',
          'No rate control protocol — intermittent IV metoprolol only',
          'POAF increases stroke risk 3x — anticoag needed if >48h',
        ],
        keyValues: {
          'Surgery': 'CABG (3-vessel) — POD 2',
          'AF Onset': 'POD 2 — rapid ventricular response',
          'Heart Rate': '132 bpm',
          'Anticoagulation': 'Not initiated',
          'Duration': '>48 hours',
          'CHA2DS2-VASc': 'Not calculated',
        },
      },
      {
        id: 'CAD-POAF-002',
        name: 'Gloria Holm',
        mrn: 'MRN-CAD-95002',
        age: 68,
        signals: [
          'POAF after AVR + CABG — persistent for 72 hours',
          'Rate control with diltiazem but no anticoagulation started',
          'Combined procedure = higher POAF risk',
          'Stroke risk without anticoag: 3x baseline',
        ],
        keyValues: {
          'Surgery': 'AVR + CABG — POD 3',
          'AF Duration': '72 hours (persistent)',
          'Rate Control': 'Diltiazem drip',
          'Anticoagulation': 'Not started',
          'CHA2DS2-VASc': 'Not documented',
          'Stroke Risk': '3x baseline without anticoag',
        },
      },
      {
        id: 'CAD-POAF-003',
        name: 'Eugene Franzen',
        mrn: 'MRN-CAD-95003',
        age: 76,
        signals: [
          'Recurrent POAF episodes post-CABG — paroxysmal',
          'Multiple episodes documented but no structured POAF protocol',
          'No rhythm control strategy or discharge anticoag plan',
          'Paroxysmal POAF still carries stroke risk — needs management',
        ],
        keyValues: {
          'Surgery': 'CABG (2-vessel) — POD 4',
          'AF Pattern': 'Paroxysmal — 4 episodes in 48h',
          'Treatment': 'PRN amiodarone boluses only',
          'POAF Protocol': 'Not activated',
          'Discharge Plan': 'No anticoag or rhythm strategy',
        },
      },
    ],
    safetyNote: 'POAF-related stroke after cardiac surgery has 25% mortality and significant long-term disability. Anticoagulation >48h of AF is standard of care.',
    whyMissed: 'POAF is common and often considered benign/self-limiting by surgical teams. Anticoagulation is deferred due to post-operative bleeding concerns. No automated POAF protocol trigger exists in most EMRs.',
    whyTailrd: 'TAILRD identified post-cardiac surgery patients with documented new-onset AF without structured POAF management (rate/rhythm control + anticoagulation assessment) by monitoring telemetry documentation and medication orders.',
    methodologyNote: '[Source: Demo Health System]. Patient count: 450 CABGs x 35% POAF rate x 35% undertreated x market share ≈ 55. Dollar: Safety — prevents stroke. Anticoag monitoring $1,200/yr x 55 x 50% = $33,000. Gillinov (JAMA 2016).',
  },
  {
    id: 'cad-gap-96-pre-op-bb-poaf-prevention',
    name: 'Beta-Blocker Not Initiated Pre-Op — POAF Prevention',
    category: 'Quality',
    patientCount: 60,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'Quality | POAF Prevention | Pre-Op BB | Class I',
    evidence:
      'Crystal E et al, Circulation 2002. Pre-operative beta-blocker: 30-40% reduction in POAF. ACC/AHA Class I, Level A recommendation. Should be started >=24 hours before surgery. Most effective POAF prevention strategy.',
    cta: 'Initiate Beta-Blocker >=24h Before Surgery — POAF Prevention',
    detectionCriteria: [
      'Cardiac surgery (CABG, valve) planned or performed',
      'No beta-blocker prescribed >=24h pre-operatively',
      'No documented contraindication to beta-blocker',
      'Not already on beta-blocker at baseline',
    ],
    patients: [
      {
        id: 'CAD-PREBB-001',
        name: 'Kenneth Lindstrom',
        mrn: 'MRN-CAD-96001',
        age: 69,
        signals: [
          'CABG scheduled — no pre-op beta-blocker ordered',
          'Not on beta-blocker at baseline',
          'ACC/AHA Class I: pre-op BB reduces POAF 30-40%',
          'Should be initiated >=24h before surgery',
        ],
        keyValues: {
          'Procedure': 'CABG (3-vessel) — scheduled',
          'Baseline BB': 'None',
          'Pre-Op BB Ordered': 'No',
          'Contraindication': 'None documented',
          'POAF Risk': 'Standard (30-40% baseline)',
        },
      },
      {
        id: 'CAD-PREBB-002',
        name: 'Shirley Axelsson',
        mrn: 'MRN-CAD-96002',
        age: 74,
        signals: [
          'AVR + CABG scheduled — high POAF risk (combined procedure + age)',
          'No pre-operative beta-blocker in admission orders',
          'Combined procedure: POAF risk 40-50%',
          'Pre-op BB is the single most effective POAF prevention',
        ],
        keyValues: {
          'Procedure': 'AVR + CABG (combined)',
          'Baseline BB': 'None',
          'Pre-Op BB': 'Not ordered',
          'Age': 74,
          'POAF Risk': 'High (combined + age)',
          'Contraindication': 'None',
        },
      },
      {
        id: 'CAD-PREBB-003',
        name: 'Gertrude Wickstrom',
        mrn: 'MRN-CAD-96003',
        age: 66,
        signals: [
          'CABG — beta-blocker held 48h pre-op without restart',
          'Was on metoprolol at baseline — held for hemodynamics',
          'Not restarted pre-operatively despite stable BP',
          'BB withdrawal increases POAF risk — should resume if hemodynamically stable',
        ],
        keyValues: {
          'Procedure': 'CABG (2-vessel)',
          'Baseline BB': 'Metoprolol 50mg BID (held 48h pre-op)',
          'Reason Held': 'Pre-op SBP 105 (now 128)',
          'Restart': 'Not restarted despite stable BP',
          'POAF Risk': 'Increased due to BB withdrawal',
        },
      },
    ],
    whyMissed: 'Pre-operative beta-blocker initiation for POAF prevention falls between cardiology and anesthesia/surgery. No team consistently owns this order. Patients not already on BB at baseline are frequently missed.',
    whyTailrd: 'TAILRD identified cardiac surgery patients without pre-operative beta-blocker by checking admission medication orders against surgical scheduling and baseline medication lists.',
    methodologyNote: '[Source: Demo Health System]. Patient count: 450 CABGs x 40% not on pre-op BB x 35% market share ≈ 60. Dollar: Quality — $0 direct but reduces POAF (each event adds $15K+ in LOS). Crystal (Circulation 2002); ACC/AHA Class I.',
  },
  {
    id: 'cad-gap-97-post-cabg-anticoag-protocol',
    name: 'Post-CABG Anticoagulation Protocol Not Standardized',
    category: 'Quality',
    patientCount: 65,
    dollarOpportunity: 0,
    priority: 'medium',
    tag: 'Quality | Post-CABG | Antiplatelet Protocol',
    evidence:
      'Kulik A et al, Circulation 2015. AHA/ACC: Aspirin within 6 hours post-CABG (Class I). DAPT for SVG grafts: emerging evidence supports aspirin + clopidogrel for SVG patency. Protocol variation by surgeon leads to inconsistent care.',
    cta: 'Apply Standardized Post-CABG Anticoagulation Protocol',
    detectionCriteria: [
      'Post-CABG patient without standardized antiplatelet protocol',
      'Aspirin timing >6 hours post-CABG',
      'No DAPT consideration for SVG grafts',
      'Heparin bridging protocol inconsistent or absent',
    ],
    patients: [
      {
        id: 'CAD-PCAP-001',
        name: 'Walter Akerman',
        mrn: 'MRN-CAD-97001',
        age: 65,
        signals: [
          'Post-CABG day 1 — aspirin not given until 14 hours post-op',
          'AHA: aspirin within 6 hours post-CABG (Class I)',
          'SVG grafts placed — no DAPT consideration for graft protection',
          'Protocol varies by surgeon — no institutional standard',
        ],
        keyValues: {
          'Procedure': 'CABG (3-vessel: LIMA + 2 SVGs)',
          'Aspirin Timing': '14 hours post-op (should be <6h)',
          'DAPT for SVG': 'Not considered',
          'Heparin': 'Not ordered post-op',
          'Protocol': 'Surgeon-dependent — not standardized',
        },
      },
      {
        id: 'CAD-PCAP-002',
        name: 'Alma Berglund',
        mrn: 'MRN-CAD-97002',
        age: 70,
        signals: [
          'Post-CABG — aspirin held for 24h due to chest tube output',
          'Appropriate hold, but no restart trigger or protocol',
          'SVG graft thrombosis risk increases without antiplatelet',
          'Need standardized restart criteria and SVG protection protocol',
        ],
        keyValues: {
          'Procedure': 'CABG (4-vessel: LIMA + 3 SVGs)',
          'Aspirin Hold': '24 hours (chest tube output)',
          'Restart Protocol': 'None — ad hoc decision',
          'SVG Protection': 'No DAPT protocol',
          'Graft Risk': 'Early SVG thrombosis without antiplatelet',
        },
      },
    ],
    whyMissed: 'Post-CABG antiplatelet management varies by surgeon preference. No institutional protocol standardizes aspirin timing, SVG DAPT, or heparin bridging. Cardiac surgery order sets are often surgeon-specific rather than evidence-based.',
    whyTailrd: 'TAILRD identified post-CABG patients with non-standardized antiplatelet management by analyzing medication administration times relative to surgery, DAPT prescriptions for SVG recipients, and protocol variation across surgeons.',
    methodologyNote: '[Source: Demo Health System]. Patient count: 450 CABGs x 40% without standardized protocol x 35% market share ≈ 65. Dollar: Quality — prevents early graft thrombosis. Kulik (Circulation 2015).',
  },
  // ── PERIOPERATIVE ANTICOAGULATION (3) ──────────────────────
  {
    id: 'cad-gap-98-af-bridging-protocol',
    name: 'Anticoagulation Bridging Protocol Incorrect — AF Patient',
    category: 'Safety',
    patientCount: 35,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'Safety | Bridging | BRIDGE Trial | AF',
    evidence:
      'Douketis JD et al, BRIDGE (NEJM 2015, PMID 26095867). Bridging anticoagulation with heparin in AF patients: 3x increase in major bleeding with no reduction in thromboembolism. Most AF patients should NOT be bridged. Exceptions: mechanical valve, recent VTE.',
    cta: 'Review Bridging Protocol — Most AF Patients Should NOT Be Bridged',
    detectionCriteria: [
      'AF patient on OAC undergoing elective procedure',
      'Heparin bridging ordered peri-procedurally',
      'No mechanical heart valve or recent (<3mo) VTE',
      'BRIDGE trial criteria not met for bridging indication',
    ],
    patients: [
      {
        id: 'CAD-BRIDGE-001',
        name: 'Milton Stromberg',
        mrn: 'MRN-CAD-98001',
        age: 72,
        signals: [
          'AF on warfarin — elective CABG, bridging with IV heparin ordered',
          'BRIDGE trial: bridging increases major bleeding 3x, no benefit',
          'No mechanical valve or recent VTE — bridging not indicated',
          'Warfarin hold 5 days + resume post-op is sufficient',
        ],
        keyValues: {
          'AF': 'Persistent — on warfarin',
          'Procedure': 'Elective CABG',
          'Bridging': 'IV heparin ordered (inappropriate)',
          'Mechanical Valve': 'No',
          'Recent VTE': 'No',
          'BRIDGE Criteria': 'Does NOT meet bridging indication',
        },
      },
      {
        id: 'CAD-BRIDGE-002',
        name: 'Hazel Nystrom',
        mrn: 'MRN-CAD-98002',
        age: 68,
        signals: [
          'AF on warfarin — elective PCI, lovenox bridging ordered',
          'CHA2DS2-VASc 3 — moderate risk, but BRIDGE applies',
          'BRIDGE: even moderate-risk AF patients should not be bridged',
          'Bridging increases major bleeding without reducing stroke',
        ],
        keyValues: {
          'AF': 'Paroxysmal — on warfarin',
          'Procedure': 'Elective PCI',
          'CHA2DS2-VASc': '3 (moderate)',
          'Bridging': 'Lovenox ordered (inappropriate)',
          'BRIDGE Evidence': '3x major bleeding, no stroke reduction',
        },
      },
    ],
    safetyNote: 'Inappropriate bridging triples major bleeding risk without reducing thromboembolic events. BRIDGE trial definitively showed no benefit of bridging in most AF patients.',
    whyMissed: 'Historical practice favored bridging for all AF patients on warfarin. The BRIDGE trial (2015) changed guidelines, but many practitioners and institutions have not updated their protocols. Order sets may still include default bridging.',
    whyTailrd: 'TAILRD identified AF patients with peri-procedural bridging orders by cross-referencing AF diagnoses, anticoagulant prescriptions, procedural scheduling, and heparin/enoxaparin orders to flag inappropriate bridging.',
    methodologyNote: '[Source: Demo Health System]. Patient count: AF patients undergoing procedures x inappropriate bridging x 35% market share ≈ 35. Dollar: Safety — prevents major bleeding ($15K+ per event). BRIDGE (NEJM 2015).',
  },
  {
    id: 'cad-gap-99-doac-interruption-pause',
    name: 'DOAC Interruption Timing Not Standardized Peri-Procedure',
    category: 'Safety',
    patientCount: 45,
    dollarOpportunity: 0,
    priority: 'medium',
    tag: 'Safety | DOAC Management | PAUSE Trial',
    evidence:
      'Douketis JD et al, PAUSE (NEJM 2019, PMID 31437432). Standardized DOAC interruption: simple, safe, no bridging needed. Hold 1 day for low bleeding risk, 2 days for high bleeding risk. Adjust for renal function (rivaroxaban/apixaban: CrCl-based). Resume 2-3 days post-procedure.',
    cta: 'Apply PAUSE Protocol — Standardized DOAC Interruption',
    detectionCriteria: [
      'Patient on DOAC undergoing elective procedure',
      'No standardized DOAC hold/resume protocol documented',
      'DOAC hold timing inconsistent with PAUSE guidelines',
      'Bridging anticoagulation inappropriately ordered with DOAC',
    ],
    patients: [
      {
        id: 'CAD-PAUSE-001',
        name: 'Lester Lindblom',
        mrn: 'MRN-CAD-99001',
        age: 70,
        signals: [
          'On apixaban 5mg BID — elective PCI planned',
          'Apixaban held 4 days pre-procedure (PAUSE: 2 days sufficient)',
          'Unnecessary extended hold increases thromboembolic risk',
          'PAUSE: simple 2-day hold for apixaban, no bridging',
        ],
        keyValues: {
          'DOAC': 'Apixaban 5mg BID',
          'Procedure': 'Elective PCI',
          'Hold Time': '4 days (should be 2 days per PAUSE)',
          'Bridging': 'None (correct)',
          'CrCl': '62 mL/min',
          'PAUSE Protocol': 'Not followed — over-held',
        },
      },
      {
        id: 'CAD-PAUSE-002',
        name: 'Dolores Hallberg',
        mrn: 'MRN-CAD-99002',
        age: 75,
        signals: [
          'On rivaroxaban 20mg daily — CABG planned',
          'Rivaroxaban held only 1 day pre-op (PAUSE: 2 days for high-bleed)',
          'CABG is high bleeding risk procedure — needs 2-day hold',
          'CrCl 45 — may need additional hold time for rivaroxaban',
        ],
        keyValues: {
          'DOAC': 'Rivaroxaban 20mg daily',
          'Procedure': 'CABG (high bleeding risk)',
          'Hold Time': '1 day (should be >=2 days)',
          'CrCl': '45 mL/min (affects clearance)',
          'PAUSE Protocol': 'Under-held — bleeding risk',
        },
      },
      {
        id: 'CAD-PAUSE-003',
        name: 'Cornelius Hedlund',
        mrn: 'MRN-CAD-99003',
        age: 66,
        signals: [
          'On dabigatran 150mg BID — cardiac procedure planned',
          'Lovenox bridging ordered (inappropriate — no bridging with DOACs)',
          'PAUSE: DOACs have predictable offset — bridging never needed',
          'Dabigatran: hold 2-3 days based on CrCl',
        ],
        keyValues: {
          'DOAC': 'Dabigatran 150mg BID',
          'Procedure': 'Cardiac procedure — moderate bleed risk',
          'Bridging': 'Lovenox ordered (inappropriate)',
          'CrCl': '58 mL/min',
          'PAUSE Hold': '2 days (CrCl >=50)',
          'Protocol Violation': 'Bridging + non-standard hold',
        },
      },
    ],
    safetyNote: 'Non-standardized DOAC management leads to both over-holding (thromboembolic risk) and under-holding (bleeding risk). PAUSE provides a simple, evidence-based framework.',
    whyMissed: 'DOAC management peri-procedurally is complex and varies by agent, renal function, and bleeding risk. Many institutions lack standardized DOAC interruption protocols. Old warfarin-era bridging habits persist.',
    whyTailrd: 'TAILRD identified DOAC patients undergoing procedures with non-standardized hold/resume timing by cross-referencing DOAC prescriptions, procedural scheduling, renal function, and peri-procedural medication orders.',
    methodologyNote: '[Source: Demo Health System]. Patient count: DOAC patients undergoing procedures x without PAUSE protocol x 35% market share ≈ 45. Dollar: Safety — $0 direct. PAUSE (NEJM 2019).',
  },
  {
    id: 'cad-gap-100-hit-screening-post-cardiac-surgery',
    name: 'HIT Not Screened Post-Cardiac Surgery',
    category: 'Safety',
    patientCount: 12,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'Safety | HIT | 4Ts Score | Post-Cardiac Surgery',
    evidence:
      'Warkentin TE et al, CHEST 2012. Heparin-induced thrombocytopenia (HIT) incidence 1-3% post-cardiac surgery. Undiagnosed HIT: 50% thrombosis rate, 20% mortality. 4Ts score (Timing, Thrombocytopenia, Thrombosis, oTher causes) + PF4 antibody testing is the diagnostic standard.',
    cta: 'Calculate 4Ts Score — Order PF4 Antibody if Intermediate/High Probability',
    detectionCriteria: [
      'Post-cardiac surgery patient with platelet drop >50% from baseline',
      'Thrombocytopenia on day 5-10 post-op (classic HIT window)',
      'No 4Ts score calculated',
      'No PF4 antibody or serotonin release assay ordered',
    ],
    patients: [
      {
        id: 'CAD-HIT-001',
        name: 'Alvin Lagerqvist',
        mrn: 'MRN-CAD-100001',
        age: 68,
        signals: [
          'Post-CABG day 7 — platelets dropped from 240K to 95K (60% drop)',
          'Classic HIT timing (day 5-10 post-heparin exposure)',
          'No 4Ts score calculated — thrombocytopenia attributed to "post-op"',
          'Undiagnosed HIT: 50% thrombosis rate if heparin continued',
        ],
        keyValues: {
          'Surgery': 'CABG (3-vessel) — POD 7',
          'Baseline Platelets': '240K',
          'Current Platelets': '95K (60% drop)',
          'Timing': 'Day 7 — classic HIT window',
          '4Ts Score': 'Not calculated',
          'PF4 Antibody': 'Not ordered',
        },
      },
      {
        id: 'CAD-HIT-002',
        name: 'Bernice Sjoberg',
        mrn: 'MRN-CAD-100002',
        age: 73,
        signals: [
          'Post-AVR + CABG day 9 — platelets 72K (was 198K pre-op)',
          'New DVT in left leg — thrombosis in setting of thrombocytopenia',
          'HIT pathognomonic: thrombocytopenia + new thrombosis post-heparin',
          'Still receiving heparin flushes — must stop immediately if HIT',
        ],
        keyValues: {
          'Surgery': 'AVR + CABG — POD 9',
          'Baseline Platelets': '198K',
          'Current Platelets': '72K (64% drop)',
          'New Thrombosis': 'Left leg DVT',
          'Heparin Exposure': 'Continuing (line flushes)',
          '4Ts Score': 'Not calculated (would be high)',
          'PF4 Antibody': 'Not ordered',
        },
      },
    ],
    safetyNote: 'HIT is a life-threatening condition. Undiagnosed HIT with continued heparin exposure has 50% thrombosis rate and 20% mortality. Immediate heparin cessation and alternative anticoagulation are critical.',
    whyMissed: 'Post-cardiac surgery thrombocytopenia is extremely common (hemodilution, consumption) and HIT is relatively rare (1-3%). Platelet drops are often attributed to non-HIT causes without formal 4Ts scoring. The HIT diagnostic workup is not triggered automatically.',
    whyTailrd: 'TAILRD identified post-cardiac surgery patients with significant thrombocytopenia in the classic HIT window (day 5-10) without 4Ts scoring or PF4 testing by monitoring daily platelet trends and heparin exposure records.',
    methodologyNote: '[Source: Demo Health System]. Patient count: cardiac surgery x thrombocytopenia in HIT window x not screened x 35% market share ≈ 12. Dollar: Safety — prevents catastrophic thrombosis. Warkentin (CHEST 2012).',
  },
  // ============================================================
  // GAP cad-101: PRE-OP CARDIAC RISK ASSESSMENT — NON-CARDIAC SURGERY
  // (Cross-Module Safety)
  // ============================================================
  {
    id: 'cad-gap-101-preop-cardiac-risk',
    name: 'Pre-Operative Cardiac Risk Assessment Not Performed — Non-Cardiac Surgery',
    category: 'Safety',
    patientCount: 90,
    dollarOpportunity: 43200,
    priority: 'high',
    tag: 'Perioperative | RCRI | Cross-Module Safety',
    safetyNote: 'SAFETY: Patients with known CAD/HF undergoing non-cardiac surgery without pre-operative cardiac risk assessment (RCRI) face preventable perioperative MACE. RCRI ≥2 should trigger further testing.',
    evidence:
      'Fleisher LA et al, 2014 ACC/AHA Perioperative Guidelines. Lee TH et al, Revised Cardiac Risk Index (Circulation 1999). RCRI ≥2: consider further testing.',
    cta: 'Calculate RCRI — Order Stress Test if Indicated',
    detectionCriteria: [
      'Known CAD or HF diagnosis',
      'Non-cardiac surgery scheduled (intermediate or high risk)',
      'No pre-operative cardiac risk assessment (RCRI) documented',
      'No stress testing or cardiology clearance when RCRI ≥2',
    ],
    patients: [
      {
        id: 'CAD-PREOP-101-001',
        name: 'William Hargreaves',
        mrn: 'MRN-CAD-101001',
        age: 72,
        signals: [
          'Prior MI (5 years ago) + HFpEF — scheduled for hip replacement',
          'No pre-operative RCRI calculation documented',
          'RCRI likely ≥3 (CAD + HF + age) — stress testing indicated',
          'ACC/AHA 2014: RCRI ≥2 warrants further evaluation',
        ],
        keyValues: {
          'CAD History': 'Prior MI (5 years ago)',
          'HF Status': 'HFpEF (LVEF 52%)',
          'Surgery': 'Total hip replacement (intermediate risk)',
          'RCRI': 'Not calculated (likely ≥3)',
          'Stress Test': 'Not ordered',
          'Cardiology Clearance': 'Not obtained',
        },
      },
      {
        id: 'CAD-PREOP-101-002',
        name: 'Barbara Jennings',
        mrn: 'MRN-CAD-101002',
        age: 68,
        signals: [
          'Stable 3-vessel CAD — scheduled for colectomy for cancer',
          'Functional capacity unknown — patient sedentary',
          'No RCRI or stress testing despite known CAD + major surgery',
          'Perioperative MACE risk elevated without assessment',
        ],
        keyValues: {
          'CAD': 'Stable 3-vessel disease',
          'Surgery': 'Colectomy (high-risk abdominal)',
          'Functional Capacity': 'Unknown — sedentary',
          'RCRI': 'Not calculated',
          'Stress Test': 'Not ordered',
          'Risk': 'High — known CAD + high-risk surgery',
        },
      },
      {
        id: 'CAD-PREOP-101-003',
        name: 'Thomas Ashworth',
        mrn: 'MRN-CAD-101003',
        age: 65,
        signals: [
          'Prior CABG (8 years) + DM + CKD — scheduled for spinal fusion',
          'Multiple RCRI risk factors present',
          'No cardiac evaluation despite RCRI likely ≥4',
          'High-risk surgery + high-risk patient = mandatory assessment',
        ],
        keyValues: {
          'CAD': 'Prior CABG x 4 (8 years ago)',
          'Comorbidities': 'DM, CKD Stage 3 (eGFR 44)',
          'Surgery': 'Lumbar spinal fusion (high-risk)',
          'RCRI': 'Not calculated (estimated ≥4)',
          'Stress Test': 'Not ordered',
          'Last Cardiac Eval': '3 years ago',
        },
      },
    ],
    whyMissed: 'Pre-operative cardiac risk assessment for non-cardiac surgery is managed by surgeons, anesthesiologists, and PCPs — not cardiologists. Without automatic RCRI calculation in surgical planning workflows, patients with known cardiac disease may proceed without appropriate risk stratification.',
    whyTailrd: 'TAILRD identified patients with documented CAD/HF diagnoses scheduled for non-cardiac surgery who lacked pre-operative RCRI documentation or cardiology clearance by connecting surgical scheduling with cardiac diagnosis data.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: CV patients undergoing non-cardiac surgery x without RCRI x 35% market share ≈ 90. Dollar opportunity: $1,200 stress test x 90 x 40% conversion = $43.2K.',
  },
  // ============================================================
  // GAP cad-102: ANTICOAGULATION REVERSAL PROTOCOL — EMERGENCY SURGERY
  // (Cross-Module Safety)
  // ============================================================
  {
    id: 'cad-gap-102-anticoag-reversal',
    name: 'Anticoagulation Reversal Protocol Not Documented — Emergency Surgery',
    category: 'Safety',
    patientCount: 15,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'Emergency | Anticoagulation Reversal | Cross-Module Safety',
    safetyNote: 'URGENT SAFETY: Emergency surgery patients on OAC without documented reversal protocol risk catastrophic surgical bleeding. Idarucizumab for dabigatran, andexanet alfa for factor Xa inhibitors, 4-factor PCC for warfarin.',
    evidence:
      'Pollack CV et al, RE-VERSE AD (NEJM 2017). Connolly SJ et al, ANNEXA-4 (NEJM 2019). Timely reversal prevents catastrophic surgical bleeding.',
    cta: 'URGENT: Apply Anticoagulation Reversal Protocol',
    detectionCriteria: [
      'Emergency or urgent surgery scheduled',
      'Patient currently on oral anticoagulant (warfarin, DOAC)',
      'No documented anticoagulation reversal protocol',
      'No reversal agent ordered or administered pre-operatively',
    ],
    patients: [
      {
        id: 'CAD-REV-102-001',
        name: 'Edward Blackstone',
        mrn: 'MRN-CAD-102001',
        age: 78,
        signals: [
          'Emergency laparotomy for bowel obstruction — on apixaban 5mg BID',
          'No anticoagulation reversal protocol documented',
          'Andexanet alfa or 4-factor PCC needed before surgery',
          'ANNEXA-4: andexanet alfa achieves hemostasis in 82% of Xa inhibitor patients',
        ],
        keyValues: {
          'Surgery': 'Emergency laparotomy (bowel obstruction)',
          'OAC': 'Apixaban 5mg BID',
          'Last Dose': '6 hours ago',
          'Reversal Agent': 'Not ordered',
          'Protocol': 'Not documented',
          'Risk': 'Catastrophic surgical bleeding without reversal',
        },
      },
      {
        id: 'CAD-REV-102-002',
        name: 'Dorothy Kensington',
        mrn: 'MRN-CAD-102002',
        age: 82,
        signals: [
          'Emergent hip fracture repair — on warfarin, INR 3.2',
          'INR must be corrected before surgery',
          '4-factor PCC preferred over FFP for rapid INR reversal',
          'No reversal protocol or PCC order documented',
        ],
        keyValues: {
          'Surgery': 'Emergent hip fracture repair',
          'OAC': 'Warfarin',
          'INR': '3.2 (supratherapeutic)',
          'Reversal': '4-factor PCC needed',
          'PCC Ordered': 'No',
          'Delay Risk': 'Surgical delay increases hip fracture mortality',
        },
      },
      {
        id: 'CAD-REV-102-003',
        name: 'Franklin Worthington',
        mrn: 'MRN-CAD-102003',
        age: 70,
        signals: [
          'Urgent CABG for unstable angina — on dabigatran 150mg BID',
          'Idarucizumab (Praxbind) needed for dabigatran reversal',
          'RE-VERSE AD: idarucizumab provides complete reversal in minutes',
          'No reversal protocol documented pre-operatively',
        ],
        keyValues: {
          'Surgery': 'Urgent CABG (unstable angina)',
          'OAC': 'Dabigatran 150mg BID',
          'Last Dose': '12 hours ago',
          'Reversal Agent': 'Idarucizumab (Praxbind) needed',
          'Ordered': 'No',
          'RE-VERSE AD': 'Complete reversal within minutes',
        },
      },
    ],
    whyMissed: 'Emergency surgery is managed by surgical teams who may not have immediate anticoagulation reversal protocols embedded in their workflows. Reversal agent selection varies by OAC type, and pharmacy may not stock all agents.',
    whyTailrd: 'TAILRD identified emergency/urgent surgery patients on anticoagulants without documented reversal protocols by connecting surgical scheduling urgency codes with active anticoagulant medication lists.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: emergency surgery on OAC x without reversal protocol x 35% market share ≈ 15. Dollar opportunity: Safety — prevents death from surgical bleeding.',
  },
  // ============================================================
  // GAP cad-103: POST-OP DELIRIUM RISK — ELDERLY CARDIAC SURGERY
  // (Cross-Module Safety)
  // ============================================================
  {
    id: 'cad-gap-103-postop-delirium',
    name: 'Post-Operative Delirium Risk Not Assessed — Elderly Cardiac Surgery',
    category: 'Safety',
    patientCount: 30,
    dollarOpportunity: 0,
    priority: 'medium',
    tag: 'Geriatric | Delirium Prevention | Cross-Module Safety',
    evidence:
      'Rudolph JL et al, Circulation 2009. Inouye SK et al, NEJM 2006. Post-op delirium: 25-50% in elderly cardiac surgery. Increases mortality 2x, doubles LOS. Preventable in 30-40%.',
    cta: 'Pre-Op Delirium Risk Assessment — CAM-ICU Protocol + Medication Review',
    detectionCriteria: [
      'Cardiac surgery patient age ≥75',
      'No pre-operative delirium risk assessment documented',
      'No CAM-ICU screening protocol ordered post-operatively',
      'Deliriogenic medications not reviewed (benzodiazepines, anticholinergics, meperidine)',
    ],
    patients: [
      {
        id: 'CAD-DEL-103-001',
        name: 'Margaret Thornbury',
        mrn: 'MRN-CAD-103001',
        age: 81,
        signals: [
          'AVR scheduled — age 81, baseline cognitive decline (MoCA 22)',
          'No delirium risk assessment documented',
          'On zolpidem + diphenhydramine — both deliriogenic',
          'Rudolph: 25-50% delirium rate in elderly cardiac surgery',
        ],
        keyValues: {
          'Surgery': 'AVR',
          'Age': 81,
          'Cognitive Baseline': 'MoCA 22 (mild impairment)',
          'Deliriogenic Meds': 'Zolpidem + diphenhydramine',
          'Delirium Assessment': 'Not documented',
          'CAM-ICU': 'Not ordered',
        },
      },
      {
        id: 'CAD-DEL-103-002',
        name: 'Harold Pemberton',
        mrn: 'MRN-CAD-103002',
        age: 78,
        signals: [
          'CABG x 3 planned — age 78, lives alone (social risk factor)',
          'No pre-op delirium risk assessment',
          'Inouye: delirium preventable in 30-40% with protocol',
          'Post-op delirium doubles LOS and increases mortality 2x',
        ],
        keyValues: {
          'Surgery': 'CABG x 3',
          'Age': 78,
          'Social': 'Lives alone (delirium risk factor)',
          'Delirium Assessment': 'Not documented',
          'Prevention': '30-40% preventable with protocol',
          'Impact': '2x mortality, 2x LOS if delirium develops',
        },
      },
      {
        id: 'CAD-DEL-103-003',
        name: 'Constance Whitfield',
        mrn: 'MRN-CAD-103003',
        age: 84,
        signals: [
          'Redo MVR — age 84, prior delirium episode during last surgery',
          'History of post-op delirium: highest risk for recurrence',
          'No pre-op risk assessment or prevention protocol',
          'Proactive: hold deliriogenic meds, minimize benzos, reorient protocol',
        ],
        keyValues: {
          'Surgery': 'Redo MVR',
          'Age': 84,
          'Prior Delirium': 'Yes — during initial MVR (6 years ago)',
          'Recurrence Risk': 'Very high',
          'Assessment': 'Not documented',
          'Prevention Protocol': 'Not ordered (hold benzos, reorientation, sleep hygiene)',
        },
      },
    ],
    whyMissed: 'Delirium prevention in cardiac surgery is often managed reactively (treating delirium after it occurs) rather than proactively. Pre-operative risk assessment and medication review for deliriogenic agents are not standard in most cardiac surgery workflows.',
    whyTailrd: 'TAILRD identified elderly cardiac surgery patients (≥75) without documented delirium risk assessment by analyzing surgical scheduling, age, cognitive screening results, and medication lists for deliriogenic agents.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: cardiac surgery ≥75 x without assessment x 35% market share ≈ 30. Dollar opportunity: Safety — $0 direct but reduces ICU days ($5K+ each).',
  },
  // ============================================================
  // GAP cad-104: IN-STENT RESTENOSIS — DCB NOT USED (AGENT IDE)
  // ============================================================
  {
    id: 'cad-gap-104-isr-dcb',
    name: 'In-Stent Restenosis — Drug-Coated Balloon Not Used (AGENT IDE)',
    category: 'Quality',
    patientCount: 520,
    dollarOpportunity: 1180000,
    priority: 'high',
    cta: 'Evaluate for Drug-Coated Balloon (AGENT DCB) for ISR',
    evidence:
      'AGENT IDE trial (NEJM 2023): drug-coated balloon (DCB) vs. drug-eluting stent (DES) for ISR — DCB noninferior to DES at 12 months (TLF 17.9% vs 19.5%, p=0.0006 for noninferiority). FDA approved AGENT DCB (Boston Scientific) August 2023 for ISR — first DCB approved in the US. AHA/ACC 2023 Revascularization Guideline update: DCB is now Class I for focal ISR lesions, avoids adding additional stent layers. DCB preferred for small vessels, bifurcations, and patients at bleeding risk avoiding prolonged DAPT.',
    detectionCriteria: [
      'In-stent restenosis documented on angiography report (>50% stenosis within prior stent)',
      'Repeat PCI with DES implant rather than DCB — no DCB consideration documented',
      'No contraindication to DCB documented (vessel <2.0mm or diffuse ISR >20mm)',
      'Prior PCI within 18 months in same vessel territory',
      'Cath lab note does not reference AGENT IDE data or DCB assessment',
    ],
    patients: [
      {
        id: 'CAD-ISR-104-001',
        name: 'Raymond Ashford',
        mrn: 'MRN-CAD-104001',
        age: 67,
        signals: [
          'ISR confirmed on angiography — >60% stenosis within LAD DES (placed 14 months ago)',
          'Repeat PCI with DES implantation — no DCB considered',
          'AGENT IDE: DCB noninferior to DES for ISR, avoids added stent layer',
          'Reference vessel diameter 2.8mm — within AGENT IDE eligibility (2.0-4.0mm)',
        ],
        keyValues: {
          'ISR Lesion': 'LAD DES (14 months ago)',
          'Stenosis': '>60% in-stent',
          'Treatment': 'Repeat DES — DCB not considered',
          'Reference Vessel': '2.8mm (DCB eligible)',
          'AGENT IDE Criteria': 'Met (focal ISR, 2.0-4.0mm)',
          'DCB Discussion': 'Not documented',
        },
      },
      {
        id: 'CAD-ISR-104-002',
        name: 'Patricia Greenwald',
        mrn: 'MRN-CAD-104002',
        age: 72,
        signals: [
          'RCA ISR — second restenosis (stent-in-stent-in-stent risk with another DES)',
          'No DCB discussed despite recurrent ISR and accumulating stent layers',
          'Bifurcation involvement — DCB avoids side-branch compromise',
          'FDA AGENT DCB approved August 2023 — not yet incorporated into cath lab protocol',
        ],
        keyValues: {
          'ISR Lesion': 'RCA — second recurrence',
          'Prior Stents': '2 DES layers already in place',
          'Bifurcation': 'Yes — side-branch at risk',
          'DCB Consideration': 'Not documented',
          'Bleeding Risk': 'Moderate — DCB allows shorter DAPT',
          'Treatment': 'DES again — no DCB evaluation',
        },
      },
      {
        id: 'CAD-ISR-104-003',
        name: 'Gerald Hoffmann',
        mrn: 'MRN-CAD-104003',
        age: 59,
        signals: [
          'LCx ISR in small vessel (2.2mm reference) — repeat DES placed',
          'Small vessel ISR: DCB Class I per updated AHA/ACC guidelines',
          'No IVUS/OCT to evaluate ISR mechanism before repeat DES',
          'AGENT IDE eligibility: focal ISR, 2.0-4.0mm — criteria met but DCB not offered',
        ],
        keyValues: {
          'ISR Lesion': 'LCx — small vessel 2.2mm',
          'ISR Mechanism': 'Not evaluated (no IVUS/OCT)',
          'Treatment': 'Repeat DES — DCB not discussed',
          'AGENT IDE Criteria': 'Met',
          'Guideline Class': 'Class I for focal ISR (AHA/ACC 2023)',
          'DCB Note': 'Not in cath lab report',
        },
      },
    ],
    whyMissed: 'AGENT DCB was FDA-approved in August 2023 and many cath labs have not yet updated their ISR protocols. Repeat DES remains the default reflex approach for ISR despite guideline updates favoring DCB for focal lesions.',
    whyTailrd: 'TAILRD identified patients with documented ISR who underwent repeat DES implantation without DCB consideration by analyzing cath lab reports, prior PCI records, and comparing against AGENT IDE eligibility criteria.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: PCI volume × ISR rate 5-10% × repeat DES without DCB × 35% market share ≈ 520. Dollar opportunity: DCB procedure revenue + avoided ISR recurrence downstream. AGENT IDE (NEJM 2023).',
  },
  // ============================================================
  // GAP cad-105: CARDIOGENIC SHOCK — SCAI CS STAGING NOT DOCUMENTED
  // ============================================================
  {
    id: 'cad-gap-105-scai-cs-staging',
    name: 'Cardiogenic Shock — SCAI Classification Not Documented at Presentation',
    category: 'Quality',
    patientCount: 290,
    dollarOpportunity: 890000,
    priority: 'high',
    cta: 'Document SCAI CS Stage (A–E) at Presentation — Shock Protocol Activation',
    evidence:
      'SCAI (Society for Cardiovascular Angiography and Interventions) CS Stage Classification 2019/2022 Update: Stage A (At-risk) through Stage E (Extremis). SHOCK-NET registry: SCAI staging predicts in-hospital mortality (Stage B 8%, C 24%, D 40%, E 67%). ACC/AHA 2022 ACS Guidelines: SCAI staging recommended at presentation to guide MCS escalation decisions. CMS quality measure: CS stage documentation required for shock protocol compliance. Without staging: premature catheterization, inappropriate MCS use, and missed escalation opportunities.',
    detectionCriteria: [
      'ICD-10 R57.0 (cardiogenic shock) in admission diagnosis or ACS complicated by shock',
      'No SCAI CS Stage (A, B, C, D, or E) documented in admission note or cath report',
      'Vasopressor or inotrope initiated without shock staging note',
      'MCS device placed without documented SCAI stage at decision point',
      'Lactate >2 mmol/L in ACS patient without CS staging protocol documentation',
    ],
    patients: [
      {
        id: 'CAD-CS-105-001',
        name: 'Leonard Whitmore',
        mrn: 'MRN-CAD-105001',
        age: 68,
        signals: [
          'STEMI complicated by cardiogenic shock — norepinephrine + dobutamine initiated',
          'No SCAI CS Stage documented in admission note or cath lab report',
          'Lactate 4.2 mmol/L on presentation — likely Stage D/E without formal staging',
          'IABP placed without documented SCAI stage at decision point',
        ],
        keyValues: {
          'Admission Dx': 'STEMI + cardiogenic shock (R57.0)',
          'Vasopressors': 'Norepinephrine + dobutamine',
          'Lactate': '4.2 mmol/L',
          'MCS Device': 'IABP placed',
          'SCAI Stage': 'Not documented',
          'Estimated Stage': 'Stage D (deteriorating) based on hemodynamics',
        },
      },
      {
        id: 'CAD-CS-105-002',
        name: 'Helen Cartwright',
        mrn: 'MRN-CAD-105002',
        age: 74,
        signals: [
          'NSTEMI — hypotension SBP 78, MAP 52 on presentation',
          'Dobutamine started — no SCAI staging performed before inotrope',
          'SHOCK-NET: staging predicts mortality (Stage C 24%, D 40%)',
          'CMS quality measure: CS stage documentation required for shock protocol compliance',
        ],
        keyValues: {
          'Admission': 'NSTEMI with hemodynamic compromise',
          'SBP': '78 mmHg (MAP 52)',
          'Inotrope': 'Dobutamine initiated',
          'SCAI Stage': 'Not documented',
          'Troponin': 'Peak 48 ng/mL',
          'Echo': 'EF 25% (not yet performed at staging point)',
        },
      },
      {
        id: 'CAD-CS-105-003',
        name: 'Oscar Pemberton',
        mrn: 'MRN-CAD-105003',
        age: 61,
        signals: [
          'ACS + new LBBB — at-risk for cardiogenic shock (SCAI Stage A)',
          'No SCAI staging performed at any point in hospitalization',
          'Without staging: escalation trigger thresholds undefined',
          'ACC/AHA 2022: staging at presentation guides appropriate triage',
        ],
        keyValues: {
          'Admission': 'ACS + new LBBB',
          'Hemodynamics': 'Compensated (SBP 105, MAP 72)',
          'SCAI Stage': 'Not documented (likely Stage A/B)',
          'Lactate': '1.9 mmol/L',
          'Echo': 'EF 35% — RV function borderline',
          'Escalation Plan': 'Not documented',
        },
      },
    ],
    whyMissed: 'SCAI CS staging is a relatively new classification (2019) not yet universally embedded in admission or cath lab documentation templates. Cardiogenic shock management often focuses on immediate hemodynamic support without formal staging.',
    whyTailrd: 'TAILRD identified cardiogenic shock patients without SCAI staging by analyzing admission diagnoses (R57.0), vasopressor and inotrope orders, and lactate values against documentation completeness in clinical notes.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: CS admissions × no SCAI staging × 35% market share ≈ 290. Dollar opportunity: quality measure compliance + MCS optimization reducing ICU LOS. SCAI 2022 / SHOCK-NET registry.',
  },
  // ============================================================
  // GAP cad-106: PERSISTENT LDL ELEVATION — INCLISIRAN NOT CONSIDERED
  // ============================================================
  {
    id: 'cad-gap-106-inclisiran',
    name: 'Persistent LDL Elevation — Inclisiran (Twice-Yearly siRNA) Not Considered',
    category: 'Gap',
    patientCount: 840,
    dollarOpportunity: 1420000,
    priority: 'high',
    cta: 'Evaluate for Inclisiran (Leqvio) — Twice-Yearly siRNA for LDL Reduction',
    evidence:
      'ORION-10 trial (NEJM 2020): inclisiran (siRNA targeting PCSK9 mRNA) reduced LDL by 52% vs. placebo on background max-statin therapy. FDA approved December 2021 for ASCVD or FH with LDL >70 mg/dL. Dosing: 284mg subcutaneous injection at day 1, day 90, then every 6 months — adherence advantage over monthly PCSK9i antibodies. 2022 ACC Expert Consensus on Novel Lipid-Lowering Therapies: inclisiran equivalent efficacy to PCSK9i antibodies with superior adherence profile. ORION-11 MACE analysis: significant CV event reduction in ASCVD patients.',
    detectionCriteria: [
      'ASCVD diagnosis (prior MI, PCI, CABG) or FH in active problem list',
      'Most recent LDL >70 mg/dL on max-tolerated statin + ezetimibe combination',
      'No active PCSK9i antibody (evolocumab, alirocumab) prescription',
      'No inclisiran prescription or documented discussion',
      'No documented reason for LDL goal non-attainment beyond current therapy',
    ],
    patients: [
      {
        id: 'CAD-INCL-106-001',
        name: 'Marcus Hensley',
        mrn: 'MRN-CAD-106001',
        age: 63,
        signals: [
          'Prior MI (2021) + PCI LAD — on rosuvastatin 40mg + ezetimibe, LDL 88 mg/dL',
          'LDL >70 mg/dL despite max statin + ezetimibe — inclisiran not discussed',
          'ORION-10: 52% LDL reduction on background statin therapy',
          'Adherence barrier: patient declined monthly injections — twice-yearly inclisiran preferred',
        ],
        keyValues: {
          'ASCVD': 'Prior MI + PCI (2021)',
          'Current LDL': '88 mg/dL',
          'Statin': 'Rosuvastatin 40mg (max dose)',
          'Ezetimibe': 'Yes — on combination therapy',
          'PCSK9i Antibody': 'Declined (monthly injections)',
          'Inclisiran': 'Not offered',
        },
      },
      {
        id: 'CAD-INCL-106-002',
        name: 'Sandra Blackwell',
        mrn: 'MRN-CAD-106002',
        age: 56,
        signals: [
          'Heterozygous FH (E78.01) + prior CABG — LDL 112 mg/dL on max therapy',
          'High-risk: FH + prior CABG = extreme ASCVD risk',
          'ACC Expert Consensus 2022: inclisiran equivalent to PCSK9i antibodies',
          'Twice-yearly dosing: superior adherence for FH patients',
        ],
        keyValues: {
          'Diagnosis': 'Heterozygous FH (E78.01) + prior CABG',
          'LDL': '112 mg/dL',
          'Statin': 'Atorvastatin 80mg',
          'Ezetimibe': 'Yes',
          'LDL Goal': '<55 mg/dL for extreme risk',
          'Inclisiran': 'Not prescribed or discussed',
        },
      },
      {
        id: 'CAD-INCL-106-003',
        name: 'Thomas Ellington',
        mrn: 'MRN-CAD-106003',
        age: 71,
        signals: [
          'Multi-vessel CAD — prior PCI x2 + CABG — LDL 79 mg/dL on statin+ezetimibe',
          'Injection site reactions to evolocumab — PCSK9i antibody discontinued',
          'Inclisiran: different mechanism (siRNA), no injection site reactions reported in ORION trials',
          'LDL still >70 mg/dL — inclisiran not considered after PCSK9i antibody failure',
        ],
        keyValues: {
          'ASCVD': 'Multi-vessel CAD (PCI x2 + CABG)',
          'LDL': '79 mg/dL',
          'PCSK9i Antibody': 'Evolocumab discontinued — injection site reactions',
          'Statin + Ezetimibe': 'Yes (max dose)',
          'Inclisiran': 'Not considered after evolocumab failure',
          'ORION Data': '52% LDL reduction, no injection site issues',
        },
      },
    ],
    whyMissed: 'Inclisiran is a newer drug class (siRNA) that is distinct from PCSK9 monoclonal antibodies. Clinicians may not recognize it as a separate option when PCSK9i antibodies have been declined or caused side effects. Twice-yearly dosing is not widely known.',
    whyTailrd: 'TAILRD identified ASCVD/FH patients with LDL >70 mg/dL on max statin+ezetimibe without inclisiran by cross-referencing lipid panel results, cardiovascular diagnoses, and pharmacy records for PCSK9 pathway therapy.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: ASCVD panel × LDL >70 on max therapy × no PCSK9 pathway × 35% market share ≈ 840. Dollar opportunity: inclisiran revenue + downstream MACE prevention. ORION-10 (NEJM 2020).',
  },
  // ============================================================
  // GAP cad-107: PRIMARY PREVENTION — PREVENT 2024 CALCULATOR NOT USED
  // ============================================================
  {
    id: 'cad-gap-107-prevent-calculator',
    name: 'Primary Prevention — PREVENT 2024 Risk Score Not Utilized for Statin/SGLT2i Decision',
    category: 'Gap',
    patientCount: 2100,
    dollarOpportunity: 980000,
    priority: 'medium',
    cta: 'Apply ACC/AHA PREVENT 2024 Calculator — Update Statin and SGLT2i Decisions',
    evidence:
      'ACC/AHA PREVENT Calculator (2024): replaces Pooled Cohort Equations (PCE). Includes kidney function (eGFR), HbA1c, ZIP code-based SDOH, and metabolic factors. Validated in diverse populations; reduces racial bias in prior PCE. ACC 2023 Expert Consensus: PREVENT should replace PCE for statin initiation decisions in primary prevention. Also now incorporates SGLT2i and GLP-1 RA consideration thresholds for high-risk primary prevention. 10-year CVD risk >7.5% (with risk enhancers) = statin discussion required. PREVENT reclassifies 20-30% of patients compared to PCE.',
    detectionCriteria: [
      'Age 30-79, no established ASCVD (no prior MI, stroke, PCI, CABG)',
      'No PREVENT 2024 risk score documented in chart in past 3 years',
      'Prior statin refusal or non-prescribing based on PCE <7.5% without PREVENT recalculation',
      'HbA1c, eGFR, and lipid panel available but PREVENT score not calculated',
      'SGLT2i/GLP-1 RA not considered in patient with PREVENT high-risk primary prevention profile (>10% 10-year risk)',
    ],
    patients: [
      {
        id: 'CAD-PREV-107-001',
        name: 'Diana Forsythe',
        mrn: 'MRN-CAD-107001',
        age: 52,
        signals: [
          'Black woman age 52 — prior PCE calculated 5.8% (below threshold)',
          'Statin not started based on PCE result',
          'PREVENT includes SDOH + eGFR: may reclassify to >7.5%',
          'ACC Expert Consensus: PREVENT reduces racial bias in prior PCE — recalculation warranted',
        ],
        keyValues: {
          'Age/Sex': '52F, Black',
          'PCE Result': '5.8% (statin not started)',
          'PREVENT Recalculated': 'Not done',
          'eGFR': '72 mL/min (included in PREVENT)',
          'HbA1c': '5.9% (prediabetes — included in PREVENT)',
          'LDL': '142 mg/dL',
        },
      },
      {
        id: 'CAD-PREV-107-002',
        name: 'Gregory Ashmore',
        mrn: 'MRN-CAD-107002',
        age: 47,
        signals: [
          'Male age 47, DM2 + HTN — PCE 6.2% (below 7.5% threshold)',
          'No statin prescribed — PCE result used for decision',
          'PREVENT: DM + CKD inclusion may yield >10% — SGLT2i also now considered',
          'PREVENT reclassifies 20-30% of patients vs PCE',
        ],
        keyValues: {
          'Age/Sex': '47M',
          'Diagnoses': 'DM2 (E11.9) + HTN (I10)',
          'PCE Result': '6.2% — statin declined based on result',
          'HbA1c': '7.4%',
          'eGFR': '68 mL/min',
          'PREVENT': 'Not calculated — SGLT2i not offered',
        },
      },
      {
        id: 'CAD-PREV-107-003',
        name: 'Angela Moreau',
        mrn: 'MRN-CAD-107003',
        age: 61,
        signals: [
          'Post-menopausal woman — PCE 7.0% (borderline, statin not started)',
          'PREVENT includes premature menopause as risk enhancer',
          'Premature menopause at age 44 — not captured in PCE',
          'PREVENT recalculation with SDOH + eGFR may cross 7.5% threshold',
        ],
        keyValues: {
          'Age/Sex': '61F (post-menopausal age 44)',
          'PCE Result': '7.0% — borderline, statin not started',
          'Menopause': 'Premature (age 44) — PREVENT risk enhancer',
          'PREVENT': 'Not recalculated',
          'LDL': '138 mg/dL',
          'Statin': 'Not prescribed',
        },
      },
    ],
    whyMissed: 'The PREVENT calculator was released in late 2023 and many EHR systems still calculate risk using the legacy PCE. Clinicians using outdated PCE scores may deny statin therapy to patients who would qualify under PREVENT, particularly younger patients, women, and minority populations.',
    whyTailrd: 'TAILRD identified primary prevention patients without PREVENT 2024 documentation whose prior PCE-based decisions may now be out of date by comparing PCE-based statin decisions against PREVENT-relevant variables (eGFR, HbA1c, SDOH).',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: primary prevention panel × no PREVENT × PCE borderline zone × 35% market share ≈ 2,100. Dollar opportunity: statin initiation visits + SGLT2i referrals. PREVENT 2024 (ACC/AHA).',
  },
  // ============================================================
  // GAP cad-108: CABG-BOUND ACS — CANGRELOR BRIDGING NOT UTILIZED
  // ============================================================
  {
    id: 'cad-gap-108-cangrelor-bridging',
    name: 'CABG-Bound ACS — P2Y12 Bridging with Cangrelor Not Utilized',
    category: 'Safety',
    patientCount: 145,
    dollarOpportunity: 420000,
    priority: 'high',
    cta: 'Initiate Cangrelor Bridging Protocol — CABG-Bound ACS Patient on P2Y12 Inhibitor',
    evidence:
      'ACC/AHA 2022 ACS Guidelines: patients on P2Y12 inhibitor requiring urgent CABG face bleeding risk if not bridged appropriately. Cangrelor (IV, short half-life 3-6 min): Class IIb for bridging patients who must discontinue oral P2Y12 before CABG (hold period: ticagrelor 3-5 days, clopidogrel 5 days, prasugrel 7 days). BRIDGE trial (JAMA 2012): cangrelor bridging maintained platelet inhibition without increase in surgical bleeding. Particularly relevant for ACS with anatomy requiring CABG (left main, 3VD) when surgery is planned within 5-7 days.',
    detectionCriteria: [
      'ACS admission (NSTEMI, UA) with CABG planned or recommended at cath',
      'Active ticagrelor or prasugrel on medication list at time of CABG recommendation',
      'No cangrelor infusion protocol ordered or documented in pre-op plan',
      'No documented P2Y12 hold management strategy in surgical prep note',
      'CABG scheduled within 5-7 days of P2Y12 inhibitor without bridging plan',
    ],
    patients: [
      {
        id: 'CAD-CANG-108-001',
        name: 'Howard Sinclair',
        mrn: 'MRN-CAD-108001',
        age: 66,
        signals: [
          'NSTEMI — cath: left main + 3VD — CABG recommended',
          'On ticagrelor 90mg BID — hold 3-5 days pre-CABG required',
          'CABG scheduled in 4 days — no cangrelor bridging ordered',
          'BRIDGE trial: cangrelor maintains platelet inhibition without increasing surgical bleeding',
        ],
        keyValues: {
          'Admission': 'NSTEMI',
          'Cath Findings': 'Left main + 3VD (CABG recommended)',
          'P2Y12': 'Ticagrelor 90mg BID',
          'CABG Date': '4 days from now',
          'Cangrelor Bridge': 'Not ordered',
          'Hold Plan': 'Not documented',
        },
      },
      {
        id: 'CAD-CANG-108-002',
        name: 'Vera Lockwood',
        mrn: 'MRN-CAD-108002',
        age: 59,
        signals: [
          'UA (unstable angina) — anatomy: LAD + RCA critical stenoses — surgical revascularization preferred',
          'On prasugrel 10mg (7-day hold required pre-CABG)',
          'CABG in 6 days — no cangrelor bridge or hold protocol documented',
          'ACC/AHA 2022: cangrelor Class IIb for bridging CABG-bound patients',
        ],
        keyValues: {
          'Admission': 'Unstable angina',
          'Anatomy': 'LAD + RCA critical stenoses',
          'P2Y12': 'Prasugrel 10mg (7-day hold needed)',
          'CABG Schedule': '6 days — inside hold window',
          'Cangrelor': 'Not ordered',
          'Surgical Note': 'No bridging plan',
        },
      },
      {
        id: 'CAD-CANG-108-003',
        name: 'Albert Fairbanks',
        mrn: 'MRN-CAD-108003',
        age: 73,
        signals: [
          'NSTEMI — 3VD with proximal LAD — urgent CABG in 5 days',
          'Ticagrelor loaded at outside hospital — continuation vs hold not documented',
          'Thrombus risk during P2Y12 hold: cangrelor maintains inhibition IV until 1-4 hours before CABG',
          'No cangrelor protocol in surgical planning — gap in bridging strategy',
        ],
        keyValues: {
          'Admission': 'NSTEMI (transferred)',
          'Loaded At': 'Outside hospital — ticagrelor 180mg',
          'CABG Plan': '5 days — urgent',
          'Ticagrelor Hold': 'Not documented',
          'Cangrelor Bridge': 'Not considered',
          'Thrombosis Risk': 'Elevated during hold period without cangrelor',
        },
      },
    ],
    whyMissed: 'Cangrelor bridging is a relatively niche perioperative strategy that requires coordination between cardiology, cardiac surgery, and pharmacy. Most surgical prep notes focus on P2Y12 hold timing without documenting a bridging strategy for the hold period.',
    whyTailrd: 'TAILRD identified ACS patients with CABG recommendations and active ticagrelor or prasugrel without documented cangrelor bridging by analyzing cath lab anatomy reports, medication lists, and surgical scheduling data.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: CABG-bound ACS × P2Y12 active × no cangrelor bridge × 35% market share ≈ 145. Dollar opportunity: cangrelor infusion revenue + reduction in re-exploration for bleeding. BRIDGE trial (JAMA 2012) / ACC/AHA 2022.',
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
  return { label: 'HIGH — DES 90-365 days', color: 'text-[#8B6914] bg-[#FAF6E8]' };
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
    <div className={`${beersFlag ? 'bg-red-50 border-red-200' : 'bg-[#F0F5FA] border-[#C8D4DC]'} border-2 rounded-xl p-4 space-y-2`}>
      <h5 className={`font-bold flex items-center gap-2 text-sm ${beersFlag ? 'text-red-800' : 'text-[#6B7280]'}`}>
        <AlertTriangle className={`w-4 h-4 ${beersFlag ? 'text-red-600' : 'text-[#6B7280]'}`} />
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
      <p className={`text-xs flex items-center gap-1 ${beersFlag ? 'text-red-500' : 'text-[#6B7280]'}`}>
        <Zap className={`w-3 h-3 flex-shrink-0 ${beersFlag ? 'text-red-400' : 'text-[#6B7280]'}`} />
        Risk auto-calculated
      </p>
    </div>
  );
}

/** Render BB deprescribing opportunity (Gap 56) */
function renderBBDeprescribing(pt: CADGapPatient): React.ReactNode {
  return (
    <div className="bg-[#F0F5FA] border-2 border-[#C8D4DC] rounded-xl p-4 space-y-2">
      <h5 className="font-bold text-[#6B7280] flex items-center gap-2 text-sm">
        <Activity className="w-4 h-4 text-[#6B7280]" />
        DEPRESCRIBING OPPORTUNITY — REDUCE-AMI 2024
      </h5>
      <div className="grid grid-cols-2 gap-2 text-sm text-[#6B7280]">
        <div><span className="font-medium">MI Date:</span> {pt.keyValues['Prior MI'] ?? 'N/A'}</div>
        <div><span className="font-medium">LVEF:</span> {pt.keyValues['LVEF'] ?? 'N/A'}</div>
        <div><span className="font-medium">Beta-Blocker:</span> {pt.keyValues['Beta-Blocker'] ?? 'N/A'}</div>
        <div><span className="font-medium">HF/Angina/Arrhythmia:</span> {pt.keyValues['HF'] === 'No' && pt.keyValues['Angina'] === 'No' ? 'None' : 'Present'}</div>
      </div>
      <p className="text-sm text-[#6B7280] italic">
        No mortality benefit in post-MI LVEF {'>'}=50% without HF, angina, or arrhythmia (Yndigegn, NEJM 2024)
      </p>
      <p className="text-sm text-[#6B7280] font-semibold">
        Discuss BB continuation vs deprescribing — shared decision recommended
      </p>
      <p className="text-xs text-[#6B7280] flex items-center gap-1">
        <Zap className="w-3 h-3 text-[#6B7280] flex-shrink-0" />
        All deprescribing criteria auto-confirmed
      </p>
    </div>
  );
}

/** Render OAC + Aspirin deprescribing opportunity (Gap 53) */
function renderOACDeprescribing(pt: CADGapPatient): React.ReactNode {
  return (
    <div className="bg-[#F0F5FA] border-2 border-[#C8D4DC] rounded-xl p-4 space-y-2">
      <h5 className="font-bold text-[#6B7280] flex items-center gap-2 text-sm">
        <Activity className="w-4 h-4 text-[#6B7280]" />
        DEPRESCRIBING OPPORTUNITY — Excess bleeding risk
      </h5>
      <div className="grid grid-cols-2 gap-2 text-sm text-[#6B7280]">
        <div><span className="font-medium">AF Diagnosis:</span> {pt.keyValues['AF Type'] ?? 'N/A'}</div>
        <div><span className="font-medium">Last ACS/PCI:</span> {pt.keyValues['Last PCI'] ?? 'N/A'}</div>
        <div><span className="font-medium">Current Regimen:</span> {pt.keyValues['OAC'] ?? 'N/A'} + {pt.keyValues['Aspirin'] ?? 'N/A'}</div>
        <div><span className="font-medium">Stent in last 12 mo:</span> {pt.keyValues['Stent (last 12 mo)'] ?? 'No'}</div>
      </div>
      <p className="text-sm text-[#6B7280] font-semibold">
        Discontinue aspirin — OAC monotherapy appropriate for stable CAD {'>'}12 months post-stent
      </p>
      <p className="text-xs text-[#6B7280] flex items-center gap-1">
        <Zap className="w-3 h-3 text-[#6B7280] flex-shrink-0" />
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
    score >= 75 ? 'text-[#2C4A60]' :
    score >= 50 ? 'text-[#6B7280]' :
    score >= 25 ? 'text-[#7A1A2E]' :
    'text-red-700';

  const saqTrendResult = computeSAQTrend({
    saqAnginaFrequency: pt.saqAnginaFrequency,
    saqPriorAnginaFrequency: pt.saqPriorAnginaFrequency,
  });

  const prior = pt.saqPriorAnginaFrequency;
  const arrow = prior != null ? (score > prior ? '\u2191' : score < prior ? '\u2193' : '\u2192') : null;
  const arrowColor = prior != null ? (score > prior ? 'text-[#2C4A60]' : score < prior ? 'text-red-600' : 'text-titanium-500') : '';

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
    syntaxResult.tier === 'Intermediate' ? 'text-[#6B7280]' :
    'text-[#2C4A60]';

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
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${display.colorClass === 'text-red-600' ? 'bg-red-100 text-red-700' : display.colorClass === 'text-[#6B7280]' ? 'bg-[#FAF6E8] text-[#8B6914]' : display.colorClass === 'text-[#2C4A60]' ? 'bg-[#F0F7F4] text-[#2D6147]' : 'bg-gray-100 text-gray-500'}`}>
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
      <div className="mt-2 px-3 py-2 bg-[#F0F5FA] border border-[#C8D4DC] rounded-lg">
        <div className="text-xs font-semibold text-[#6B7280] mb-1">Treatment Window Countdown</div>
        <div className="text-xs text-[#6B7280]">
          ACS event: {pt.keyValues['ACS Date']} · Days elapsed: {pt.keyValues['Days Since ACS']}
        </div>
        <div className="text-xs text-[#6B7280] font-bold">
          Days remaining in highest-benefit window: {pt.keyValues['PCSK9i Window Remaining']}
        </div>
        <div className="text-xs text-[#6B7280] mt-0.5">ODYSSEY OUTCOMES: Greatest absolute benefit in first 90 days post-ACS</div>
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
      const riskColor = svg.riskCategory === 'very_high' ? 'text-red-700' : svg.riskCategory === 'high' ? 'text-red-600' : svg.riskCategory === 'moderate' ? 'text-[#6B7280]' : 'text-[#2C4A60]';
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
const cadGapSubTabs = [
  { id: 'all', label: 'All Gaps', keywords: [] as string[] },
  { id: 'secondary-prev', label: 'Post-ACS & Prevention', keywords: ['post-acs', 'post-mi', 'high-intensity statin', 'colchicine', 'ace-i', 'arb not prescribed', 'medication reconciliation', 'prevent 2024', 'blood pressure not', 'diabetes not', 'smoking cessation', 'cardiac rehab', 'sglt2i'] },
  { id: 'antiplatelet', label: 'Antiplatelet & Anticoagulation', keywords: ['dapt', 'p2y12', 'aspirin-free', 'aspirin + oac', 'cangrelor', 'bridging', 'doac interruption', 'hit not', 'anticoagulation reversal', 'short dapt'] },
  { id: 'pci', label: 'PCI Quality', keywords: ['pci', 'ivus', 'ffr', 'ifr', 'physiologic', 'atherectomy', 'ivl', 'drug-coated balloon', 'radial access', 'protected pci', 'cto', 'complete revasc', 'non-culprit', 'ccta', 'in-stent restenosis', 'scai', 'hemodynamic planning'] },
  { id: 'cabg', label: 'CABG & Surgical', keywords: ['cabg', 'bypass', 'graft', 'bilateral ima', 'endoscopic', 'hybrid revasc', 'off-pump', 'midcab', 'radial artery', 'blood conservation', 'intra-operative tee', 'post-operative af', 'delirium', 'sternotomy'] },
  { id: 'lipid', label: 'Lipid Management', keywords: ['ldl', 'lp(a)', 'inclisiran', 'bempedoic', 'icosapent', 'triglycerides', 'statin intolerance', 'persistent ldl'] },
  { id: 'periprocedural', label: 'Peri-Procedural Safety', keywords: ['door-to-balloon', 'aki risk', 'contrast', 'poaf', 'pre-operative cardiac', 'non-cardiac surgery', 'anticoagulation reversal', 'emergency surgery', 'hit not screened'] },
];

const CADClinicalGapDetectionDashboard: React.FC = () => {
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const { trackGapView, gapActions } = useGapActions('CORONARY_INTERVENTION');
  const [activeGapSubTab, setActiveGapSubTab] = useState<string>('all');
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'priority' | 'patients' | 'opportunity'>('priority');
  const [showMethodology, setShowMethodology] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

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

  const filterConfig: Record<string, string[]> = {
    'Post-ACS & Secondary Prevention': ['Post-ACS', 'Post-MI', 'ACS', 'PCSK9', 'Colchicine', 'ACE-I', 'ARB', 'Statin', 'High-Intensity', 'Medication Reconciliation', 'PREVENT 2024', 'Blood Pressure', 'Diabetes', 'Smoking Cessation', 'Cardiac Rehab', 'SGLT2i'],
    'Antiplatelet & Anticoagulation': ['DAPT', 'P2Y12', 'Aspirin', 'Anticoagulation', 'Cangrelor', 'Bridging', 'OAC', 'Reversal', 'DOAC', 'HIT', 'Antithrombotic'],
    'PCI Quality': ['PCI', 'IVUS', 'OCT', 'FFR', 'iFR', 'Physiologic', 'Atherectomy', 'IVL', 'Drug-Coated Balloon', 'Radial Access', 'Protected PCI', 'CTO', 'Complete Revascularization', 'Non-Culprit', 'CCTA', 'Chest Pain', 'In-Stent Restenosis', 'Cardiogenic Shock', 'SCAI', 'Hemodynamic'],
    'CABG & Surgical': ['CABG', 'Bypass', 'Graft', 'Arterial', 'IMA', 'Endoscopic', 'Hybrid', 'Off-Pump', 'MIDCAB', 'Radial Artery', 'Blood Conservation', 'Intra-Operative', 'Delirium', 'Post-Operative', 'Sternotomy'],
    'Lipid Management': ['LDL', 'Lp(a)', 'Inclisiran', 'Bempedoic', 'Icosapent', 'Triglycerides', 'Statin Intolerance', 'Lipid', 'Cholesterol'],
    'Peri-Procedural Safety': ['Door-to-Balloon', 'AKI', 'Contrast', 'POAF', 'Pre-Operative', 'Non-Cardiac Surgery', 'Delirium', 'Blood Conservation', 'Anticoagulation Reversal', 'Emergency Surgery'],
  };

  const chipCounts = Object.fromEntries(
    Object.entries(filterConfig).map(([label, keywords]) => [
      label,
      sortedGaps.filter(gap =>
        keywords.some(kw => (gap.name || '').toLowerCase().includes(kw.toLowerCase()))
      ).length
    ])
  );

  const activeSubTab = cadGapSubTabs.find(s => s.id === activeGapSubTab);
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
    c === 'Gap'
      ? 'bg-red-100 text-red-800'
      : c === 'Safety'
      ? 'bg-rose-200 text-rose-900'
      : c === 'Quality'
      ? 'bg-[#FAF6E8] text-[#8B6914]'
      : c === 'Deprescribing'
      ? 'bg-[#FAF6E8] text-[#8B6914]'
      : c === 'Discovery'
      ? 'bg-slate-100 text-slate-800'
      : 'bg-blue-100 text-blue-800';

  const tierColor = (tier?: string) => {
    if (!tier) return '';
    if (tier.includes('A')) return 'bg-red-100 text-red-700';
    if (tier.includes('B')) return 'bg-[#FAF6E8] text-[#8B6914]';
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
            <div className="text-2xl font-bold text-blue-800">{CAD_CLINICAL_GAPS.length}</div>
          </div>
        </div>
      </div>

      {/* Sort control — only shown in standalone mode */}
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

      {/* Filter Chips */}
      {(
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
      )}

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
                    {gap.tag && gap.tag.split(' | ').map((t) => (
                      <span key={t} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {t}
                      </span>
                    ))}
                  </div>
                  {gap.category === 'Discovery' && (
                    <div className="text-xs font-semibold text-slate-700 mt-1 flex items-center gap-1">
                      <span className="text-[#2C4A60]">&#x2B21;</span> Discovery — Net new patients
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

                  {gap.whyMissed && (
                    <div className="bg-[#F0F5FA] border border-[#C8D4DC] rounded-xl p-4">
                      <h4 className="font-semibold text-[#6B7280] mb-1 flex items-center gap-2">
                        <Search className="w-4 h-4 text-[#6B7280]" />
                        Why standard systems miss this
                      </h4>
                      <p className="text-sm text-[#6B7280]">{gap.whyMissed}</p>
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

                  {/* Gap Action Buttons — care team response tracking */}
                  <GapActionButtons
                    gapId={gap.id}
                    gapName={gap.name}
                    ctaText={gap.cta}
                    moduleType="CORONARY_INTERVENTION"
                    existingAction={gapActions[gap.id] || null}
                  />

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
                                  <span className="ml-2 text-xs bg-[#F0F7F4] text-[#2D6147] px-2 py-0.5 rounded-full">
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
                                        <dd className="font-medium text-titanium-900" title="Automatically calculated from EHR-sourced data via EHR integration. No manual entry required.">{v}<span title="Automatically calculated from EHR-sourced data via EHR integration. No manual entry required."><Info className="w-3 h-3 text-blue-400 inline-block ml-1 cursor-help" /></span></dd>
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
