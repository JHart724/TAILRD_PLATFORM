import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, DollarSign, Users, ChevronDown, ChevronUp, Target, Activity, Pill, Stethoscope, TrendingUp, Zap, Info, Search, Radio, FileText } from 'lucide-react';
import { computeHERDOO2 } from '../../../../utils/clinicalCalculators';
import { computeTrajectory, computeTimeHorizon, trajectoryDisplay, timeHorizonDisplay, formatDollar, type TrajectoryResult, type TrajectoryDistribution } from '../../../../utils/predictiveCalculators';

// ============================================================
// CLINICAL GAP DETECTION — PERIPHERAL VASCULAR MODULE
// Gap 14: COMPASS Dual Pathway (Polyvascular — cross-module)
// Gaps 24 (ABI Screening), 25 (Supervised Exercise Therapy),
//      28 (AAA Screening), 34 (PAD Dual Pathway — no CAD),
//      35 (Renal Artery Stenosis), 36 (Mesenteric Ischemia),
//      43 (Cilostazol for Claudication)
//      84 (Chronic Venous Ulcer), 85 (Unprovoked VTE Extended AC),
//      86 (IVC Filter No AC), 87 (May-Thurner),
//      pv-13 (CLTI Revascularization), pv-14 (BEST-CLI Criteria),
//      pv-15 (Post-Revasc Duplex), pv-16 (Thoracic Outlet Syndrome),
//      pv-17 (CKD Dialysis Access), pv-18 (Popliteal Entrapment),
//      pv-19 (Venous Stenting May-Thurner Follow-Up)
// ============================================================

export interface PVClinicalGap {
  id: string;
  name: string;
  category: 'Gap' | 'Growth' | 'Safety' | 'Quality' | 'Discovery';
  patientCount: number;
  dollarOpportunity: number;
  evidence: string;
  cta: string;
  priority: 'high' | 'medium' | 'low';
  detectionCriteria: string[];
  patients: PVGapPatient[];
  subcategories?: { label: string; count: number }[];
  tag?: string;
  safetyNote?: string;
  whyMissed?: string;
  whyTailrd?: string;
  methodologyNote?: string;
}

export interface PVGapPatient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  signals: string[];
  keyValues: Record<string, string | number>;
  tier?: string;
}

// ============================================================
// GAP 14 (PV): COMPASS Dual Pathway (Polyvascular)
// ============================================================
const pvCompassPatients: PVGapPatient[] = [
  {
    id: 'PV-COMP-001',
    name: 'Theodore Iwu',
    mrn: 'MRN-PV-14201',
    age: 66,
    signals: [
      'PAD (I70.213) — bilateral lower extremity with claudication',
      'CAD (I25.10) — documented coronary artery disease',
      'Not on rivaroxaban 2.5mg BID',
      'On aspirin 81mg — dual pathway not prescribed',
      'No major bleeding event in 12 months',
    ],
    keyValues: {
      'PAD Dx': 'I70.213 (2020) — bilateral',
      'CAD Dx': 'I25.10 (2019)',
      'ABI': '0.72 (right)',
      'Prior ABI': 0.78,
      'eGFR': 62,
      'Prior eGFR': 68,
      'Current Antiplatelet': 'Aspirin 81mg',
      'Rivaroxaban 2.5mg': 'Not prescribed',
      'Bleeding History': 'None in 12 months',
    },
  },
  {
    id: 'PV-COMP-002',
    name: 'Bessie Drummond',
    mrn: 'MRN-PV-14338',
    age: 71,
    signals: [
      'PAD (I70.211) — right iliac artery stenosis, prior endovascular intervention',
      'CAD (I25.110) — prior NSTEMI 2022',
      'On aspirin only — dual pathway not prescribed',
      'High MALE risk — polyvascular with prior limb event',
    ],
    keyValues: {
      'PAD Dx': 'I70.211 (prior PVI 2021)',
      'CAD Dx': 'I25.110 (prior NSTEMI 2022)',
      'ABI': '0.68 (right) / 0.84 (left)',
      'Prior ABI': 0.74,
      'Prior eGFR': 71,
      'eGFR': 65,
      'Current Antiplatelet': 'Aspirin 81mg + Clopidogrel',
      'Rivaroxaban 2.5mg': 'Not prescribed',
      'Bleeding History': 'None in 12 months',
    },
  },
  {
    id: 'PV-COMP-003',
    name: 'Humphrey Kato',
    mrn: 'MRN-PV-14465',
    age: 69,
    signals: [
      'Symptomatic PAD (I70.219) — bilateral — Rutherford Class 2',
      'CAD (I25.10) — stable coronary artery disease',
      'Not on any anticoagulant',
      'COMPASS-eligible polyvascular disease',
    ],
    keyValues: {
      'PAD Dx': 'I70.219 bilateral (Rutherford 2)',
      'CAD Dx': 'I25.10',
      'ABI': '0.75 (right) / 0.71 (left)',
      'Current Antiplatelet': 'Aspirin 81mg',
      'Rivaroxaban 2.5mg': 'Not prescribed',
      'Bleeding History': 'None',
    },
  },
];

// ============================================================
// GAP 24: ABI SCREENING GAP
// ============================================================
const abiScreeningPatients: PVGapPatient[] = [
  {
    id: 'PV-ABI-001',
    name: 'Geraldine Moffit',
    mrn: 'MRN-PV-24001',
    age: 63,
    signals: [
      'T2DM (E11.9) + age 63 (>=50) — ABI screening Class IIa indication',
      'No ABI result in chart (past 2 years)',
      'Existing PAD excluded — no I70.2x in chart',
      'ACC/AHA: ABI screening indicated for DM age >=50',
    ],
    keyValues: {
      'Trigger Criteria': 'DM + age 63',
      'ABI Status': 'Never performed',
      'PAD Diagnosis': 'None (screened to detect)',
      'DM Type': 'T2DM (E11.9)',
      'Smoking': 'Former (Z87.891)',
    },
  },
  {
    id: 'PV-ABI-002',
    name: 'Clarence Osueke',
    mrn: 'MRN-PV-24002',
    age: 68,
    signals: [
      'CAD (I25.10) + age 68 — polyvascular screening indicated',
      'No ABI in past 2 years',
      'ABI identifies polyvascular disease triggering COMPASS eligibility',
      'Current antiplatelet: aspirin only',
    ],
    keyValues: {
      'Trigger Criteria': 'CAD + age 68',
      'ABI Status': 'Not done in 2 years',
      'CAD Diagnosis': 'I25.10',
      'Current Rx': 'Aspirin 81mg',
      'COMPASS Eligibility': 'Pending ABI — if PAD confirmed, dual pathway eligible',
    },
  },
  {
    id: 'PV-ABI-003',
    name: 'Nora Flanagan',
    mrn: 'MRN-PV-24003',
    age: 67,
    signals: [
      'Age 67 + current smoker (Z87.891) — ABI screening Class IIa',
      'Exertional leg pain documented — symptomatic screen',
      'No ABI in chart',
      '50-75% of PAD patients are asymptomatic',
    ],
    keyValues: {
      'Trigger Criteria': 'Age 65+ + smoking history',
      'ABI Status': 'Never performed',
      'Symptoms': 'Exertional leg pain documented',
      'Smoking': 'Z87.891 — former heavy smoker',
      'DM': 'No',
    },
  },
];

// ============================================================
// GAP 25: SUPERVISED EXERCISE THERAPY FOR CLAUDICATION
// ============================================================
const setPatients: PVGapPatient[] = [
  {
    id: 'PV-SET-001',
    name: 'Wendell Hutchins',
    mrn: 'MRN-PV-25001',
    age: 62,
    signals: [
      'PAD with claudication (I70.211)',
      'No CPT 93668 in past 6 months',
      'No revascularization in past 3 months',
      'No rest pain or tissue loss — Rutherford Class 2',
    ],
    keyValues: {
      'PAD Dx': 'I70.211 (Rutherford Class 2)',
      'ABI': '0.68 (right)',
      'Prior ABI': 0.73,
      'SET (CPT 93668)': 'None ordered',
      'Last Revascularization': 'Never',
      'Rest Pain': 'No',
      'Tissue Loss': 'No',
    },
  },
  {
    id: 'PV-SET-002',
    name: 'Claudette Morris',
    mrn: 'MRN-PV-25002',
    age: 68,
    signals: [
      'PAD with bilateral claudication (I70.219)',
      'ABI 0.72 — moderate PAD',
      'No supervised exercise referral',
      'CLEVER trial: SET = stenting for claudication at 6 months',
    ],
    keyValues: {
      'PAD Dx': 'I70.219 (bilateral)',
      'ABI': '0.72 (right) / 0.75 (left)',
      'SET (CPT 93668)': 'Not referred',
      'Revascularization': 'None recent',
      'Claudication': 'Bilateral, blocks 2-3',
      'Evidence': 'CLEVER: SET = stenting for claudication (6 months)',
    },
  },
  {
    id: 'PV-SET-003',
    name: 'Jerome Kamara',
    mrn: 'MRN-PV-25003',
    age: 58,
    signals: [
      'PAD claudication (I70.213) — bilateral',
      'ABI 0.57 — moderate-severe PAD',
      'Only 30% of eligible patients access SET nationally',
      'No CPT 93668 in 6 months; no revascularization in 3 months',
    ],
    keyValues: {
      'PAD Dx': 'I70.213 (bilateral)',
      'ABI': '0.57 (right) / 0.62 (left)',
      'Prior ABI': 0.65,
      'Prior eGFR': 58,
      'eGFR': 52,
      'SET': 'Not prescribed',
      'Rest Pain': 'No',
      'Tissue Loss': 'No',
      'Access Barrier': 'No nearby SET program — telerehab referral option',
    },
  },
];

// ============================================================
// GAP 28: AAA SCREENING NEVER DONE
// ============================================================
const aaaPatients: PVGapPatient[] = [
  {
    id: 'PV-AAA-001',
    name: 'Donald Hartwell',
    mrn: 'MRN-PV-28001',
    age: 68,
    signals: [
      'Male + age 68 + smoking history (Z87.891)',
      'No abdominal ultrasound for AAA (no CPT 76706)',
      'No AAA diagnosis in chart (I71.4 absent)',
      'USPSTF Class B: one-time screening for males 65-75 who ever smoked',
    ],
    keyValues: {
      'Age': '68 (65-75 range)',
      'Sex': 'Male',
      'Smoking History': 'Z87.891 — ever smoked',
      'AAA Screen': 'Never performed (CPT 76706 absent)',
      'AAA Diagnosis': 'None',
      'Prevalence': '4-7% in eligible males',
      'Last Surveillance': '2024-09-15',
      'Months Overdue': 18,
      'Endoleak Risk': 'Elevated',
    },
  },
  {
    id: 'PV-AAA-002',
    name: 'Alvin Bremner',
    mrn: 'MRN-PV-28002',
    age: 72,
    signals: [
      'Male + age 72 + active smoker',
      'No AAA screening in chart',
      'No AAA diagnosis',
      'One-time US cost ~$200; emergency rupture mortality 50-80%',
    ],
    keyValues: {
      'Age': '72 (within 65-75 range)',
      'Sex': 'Male',
      'Smoking History': 'F17.x — current smoker',
      'AAA Screen': 'Never performed',
      'AAA Diagnosis': 'None',
      'Note': 'One-time screen — USPSTF Class B',
    },
  },
  {
    id: 'PV-AAA-003',
    name: 'Bernard Osei',
    mrn: 'MRN-PV-28003',
    age: 66,
    signals: [
      'Male + age 66 + former heavy smoker',
      'No AAA ultrasound in chart',
      'USPSTF Class B — should have been screened at age 65',
      'Elective EVAR mortality <2%; emergency rupture mortality 50-80%',
    ],
    keyValues: {
      'Age': '66',
      'Sex': 'Male',
      'Smoking History': 'Z87.891 (former, 35 pack-years)',
      'AAA Screen': 'Never performed',
      'AAA Diagnosis': 'None in chart',
      'EVAR vs Rupture': 'Elective <2% mortality vs rupture 50-80%',
    },
  },
];

// ============================================================
// GAP 34: PAD DUAL PATHWAY — WITHOUT CONCURRENT CAD
// ============================================================
const padDualPathwayPatients: PVGapPatient[] = [
  {
    id: 'PV-PADONLY-001',
    name: 'Anthony Rossetti',
    mrn: 'MRN-PV-34001',
    age: 66,
    signals: [
      'PAD (I70.219) WITHOUT concurrent CAD — PAD-only dual pathway gap',
      'On aspirin only — rivaroxaban 2.5mg not prescribed',
      'No anticoagulant in chart',
      'No major bleeding in 12 months',
    ],
    keyValues: {
      'PAD Diagnosis': 'I70.219 (bilateral)',
      'CAD Diagnosis': 'NONE — PAD-only patient',
      'Current Antiplatelet': 'Aspirin 81mg only',
      'Rivaroxaban 2.5mg': 'Not prescribed',
      'Bleeding History': 'None in 12 months',
      'Distinction': 'NOT Gap 14 — this is PAD without CAD',
    },
  },
  {
    id: 'PV-PADONLY-002',
    name: 'Loretta Vance',
    mrn: 'MRN-PV-34002',
    age: 71,
    signals: [
      'PAD (I70.211) without CAD — COMPASS PAD subgroup',
      'On aspirin — no dual pathway therapy',
      'COMPASS PAD without CAD subgroup: MALE reduction 46%',
      'No other anticoagulant',
    ],
    keyValues: {
      'PAD Diagnosis': 'I70.211 (right femoral stenosis)',
      'CAD Diagnosis': 'None',
      'Current Antiplatelet': 'Aspirin 81mg',
      'Rivaroxaban 2.5mg': 'Not prescribed',
      'Anticoagulant': 'None',
      'Evidence': 'COMPASS PAD subgroup — MALE HR 0.54',
    },
  },
  {
    id: 'PV-PADONLY-003',
    name: 'Hubert Kimura',
    mrn: 'MRN-PV-34003',
    age: 68,
    signals: [
      'PAD (I70.213) bilateral — without concurrent CAD',
      'On aspirin + clopidogrel — can transition to dual pathway',
      'No rivaroxaban 2.5mg prescribed',
      'No major bleeding contraindication',
    ],
    keyValues: {
      'PAD Diagnosis': 'I70.213 (bilateral)',
      'CAD Diagnosis': 'None — PAD-only',
      'Current Antiplatelet': 'Aspirin + clopidogrel',
      'Rivaroxaban 2.5mg': 'Not prescribed',
      'Note': 'Transition discussion: dual pathway vs DAPT',
      'Distinction': 'Gap 34 = PAD-only; Gap 14 = CAD + PAD (COMPASS polyvascular)',
    },
  },
];

// ============================================================
// GAP 35: RENAL ARTERY STENOSIS EVALUATION
// ============================================================
const rasPatients: PVGapPatient[] = [
  {
    id: 'PV-RAS-001',
    name: 'Phyllis Kovacs',
    mrn: 'MRN-PV-35001',
    age: 69,
    signals: [
      'Resistant HTN: SBP 162 on 4 antihypertensives',
      'CKD Stage 3b (eGFR 38) — worsening trend over 12 months',
      'Flash pulmonary edema episode 3 months ago',
      'No renal artery duplex or renal CTA in past 24 months',
    ],
    keyValues: {
      'SBP': '162 mmHg (on 4 agents)',
      'Antihypertensives': '4 agents including diuretic',
      'eGFR Trend': '38 — declining (was 48 x12 months ago)',
      'Flash Pulmonary Edema': '3 months ago (Pickering syndrome concern)',
      'Renal Artery Imaging': 'None in 24 months',
    },
  },
  {
    id: 'PV-RAS-002',
    name: 'Luther Nwachukwu',
    mrn: 'MRN-PV-35002',
    age: 74,
    signals: [
      'Resistant HTN: SBP 158 on 3 agents + diuretic',
      'ACE-I initiation caused acute kidney injury — RAS concern',
      'CKD (eGFR 48 — baseline declining)',
      'No renal duplex ultrasound in chart',
    ],
    keyValues: {
      'SBP': '158 mmHg',
      'Antihypertensives': '3 + diuretic (including ACEI causing AKI)',
      'ACE-I Response': 'Acute KI with ACEI — RAS concern',
      'eGFR': '48 (baseline declining)',
      'Renal Artery Imaging': 'None',
    },
  },
  {
    id: 'PV-RAS-003',
    name: 'Cecelia Fontaine',
    mrn: 'MRN-PV-35003',
    age: 72,
    signals: [
      'Resistant HTN + recurrent flash pulmonary edema (x2)',
      'Bilateral RAS suspected (bilateral AKI with RAASi)',
      'No renal artery imaging',
      'Flash PE with normal EF — Pickering syndrome pattern',
    ],
    keyValues: {
      'SBP': '170 mmHg',
      'Flash Pulmonary Edema': 'x2 episodes — Pickering syndrome suspect',
      'LVEF': '60% (preserved — not cardiac cause)',
      'eGFR': '34 mL/min/1.73m2',
      'Renal Artery Imaging': 'None — urgent workup needed',
    },
  },
];

// ============================================================
// GAP 36: MESENTERIC ISCHEMIA EVALUATION
// ============================================================
const mesIschemia_patients: PVGapPatient[] = [
  {
    id: 'PV-CMI-001',
    name: 'Rosalind Harte',
    mrn: 'MRN-PV-36001',
    age: 68,
    signals: [
      'Postprandial abdominal pain documented — classic triad',
      'Unintentional weight loss 8% over 3 months',
      'CAD (I25.10) + T2DM + smoker — high atherosclerotic burden',
      'No mesenteric duplex or CTA-abdomen in 12 months',
    ],
    keyValues: {
      'Symptom': 'Postprandial pain + food fear',
      'Weight Loss': '8% over 3 months (unintentional)',
      'Risk Factors': 'CAD, DM, smoking — atherosclerotic',
      'Mesenteric Imaging': 'None in 12 months',
      'GI Workup': 'Colonoscopy 2022 — normal',
    },
  },
  {
    id: 'PV-CMI-002',
    name: 'Milton Barlow',
    mrn: 'MRN-PV-36002',
    age: 72,
    signals: [
      'Postprandial abdominal pain + food avoidance documented',
      'Age 72 + HTN + prior peripheral vascular disease',
      'No mesenteric imaging ordered',
      'No alternative GI diagnosis explaining symptoms',
    ],
    keyValues: {
      'Symptom': 'Postprandial pain + food fear documented by PCP',
      'Weight Loss': '6% over 4 months',
      'Risk Factors': 'Age 72, HTN, PAD, hyperlipidemia',
      'Mesenteric Imaging': 'None',
      'Alternative Dx': 'None — GI workup inconclusive',
    },
  },
  {
    id: 'PV-CMI-003',
    name: 'Clara Ogunyemi',
    mrn: 'MRN-PV-36003',
    age: 65,
    signals: [
      'Postprandial abdominal pain x4 months — worsening',
      'Unintentional weight loss 7%',
      'CAD (I25.110) + DM + bilateral PAD',
      'No mesenteric duplex or abdominal CTA',
    ],
    keyValues: {
      'Symptom': 'Postprandial pain, worsening over 4 months',
      'Weight Loss': '7% (5kg over 4 months)',
      'Risk Factors': 'CAD, DM, bilateral PAD — polyvascular',
      'Mesenteric Imaging': 'None ordered',
      'Note': 'CMI is potentially fatal if missed — revascularization effective',
    },
  },
];

// ============================================================
// GAP 43: CILOSTAZOL FOR CLAUDICATION
// ============================================================
const cilostazolPatients: PVGapPatient[] = [
  {
    id: 'PV-CILOST-001',
    name: 'Edmund Blackwell',
    mrn: 'MRN-PV-43001',
    age: 64,
    signals: [
      'PAD claudication (I70.213) — bilateral, ambulatory',
      'NOT on cilostazol',
      'SET not available locally',
      'NO heart failure diagnosis in chart — SAFE to prescribe',
    ],
    keyValues: {
      'PAD Dx': 'I70.213 (Rutherford Class 2)',
      'ABI': '0.62 (right)',
      'HF Diagnosis': 'NONE — safe to use cilostazol',
      'Cilostazol': 'Not prescribed',
      'SET': 'Not available locally',
      'Safety Check': 'No HF — cilostazol NOT contraindicated',
    },
  },
  {
    id: 'PV-CILOST-002',
    name: 'Agnes Tremblay',
    mrn: 'MRN-PV-43002',
    age: 70,
    signals: [
      'PAD claudication (I70.211) — right lower extremity',
      'NYHA Class I — ambulatory, no HF',
      'Not on cilostazol or supervised exercise',
      'Class I for claudication symptom relief',
    ],
    keyValues: {
      'PAD Dx': 'I70.211 (right LE)',
      'ABI': '0.70 (right)',
      'HF Diagnosis': 'NONE — safe for cilostazol',
      'Cilostazol': 'Not prescribed',
      'NYHA': 'Class I (ambulatory)',
      'Walking Distance': 'Limited to 1-2 blocks before claudication',
    },
  },
  {
    id: 'PV-CILOST-003',
    name: 'Theodore Osei',
    mrn: 'MRN-PV-43003',
    age: 67,
    signals: [
      'PAD (I70.219) bilateral claudication',
      'NOT on cilostazol, SET not enrolled',
      'No HF diagnosis in chart — safe to initiate',
      'Cilostazol increases walking distance ~50% at 24 weeks',
    ],
    keyValues: {
      'PAD Dx': 'I70.219 (bilateral)',
      'ABI': '0.65 bilateral',
      'HF Diagnosis': 'None — safe',
      'Cilostazol': 'Not prescribed',
      'SET': 'Enrolled? No',
      'Expected Benefit': '~50% increase in treadmill walking distance',
    },
  },
];

// ============================================================
// MASTER GAP DATA — PV MODULE
// ============================================================
export const PV_CLINICAL_GAPS: PVClinicalGap[] = [
  {
    id: 'pv-gap-14-compass',
    name: 'Polyvascular Disease — Dual Pathway Therapy Not Prescribed',
    category: 'Gap',
    patientCount: 63,
    dollarOpportunity: 75600,
    evidence:
      'COMPASS trial (Eikelboom, NEJM 2017): Rivaroxaban 2.5mg BID + ASA vs ASA alone. MACE: HR 0.76. PAD subgroup MALE (major adverse limb event) reduced 46% (HR 0.54, P<0.001). Approved for patients with stable CAD and/or PAD.',
    cta: 'Initiate Dual Pathway Therapy',
    priority: 'high',
    tag: 'Polyvascular | Cross-Module (also in CAD)',
    detectionCriteria: [
      'CAD diagnosis (ICD-10: I25.x) AND PAD (ICD-10: I70.2x) — BOTH present',
      'NOT on rivaroxaban 2.5mg BID',
      'NOT on other anticoagulant (warfarin, NOAC at therapeutic dose)',
      'On aspirin as antiplatelet foundation',
      'No major bleeding contraindication in past 12 months',
      'Cross-module: Same patients flagged in CAD module — coordinate to avoid duplicate outreach',
    ],
    patients: pvCompassPatients,
    whyMissed: 'Polyvascular disease dual pathway therapy requires connecting PAD with CAD or cerebrovascular disease — conditions managed by different specialists.',
    whyTailrd: 'TAILRD connected PAD diagnosis with concurrent atherosclerotic disease across vascular territories to identify dual pathway therapy eligibility.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 6,000 PAD panel x 20% concurrent CAD = 1,200 x 15% not on dual pathway x 35% market share = 63. Dollar opportunity: associated monitoring visits $1,200/patient/year x 63 = $75,600. COMPASS trial (Eikelboom, NEJM 2017). Cross-module with CAD.',
  },
  // ── NEW GAPS 24, 25, 28, 34-36, 43 ─────────────────────────
  {
    id: 'pv-gap-24-abi-screening',
    name: 'ABI Screening Overdue — PAD Not Excluded',
    category: 'Gap',
    patientCount: 126,
    dollarOpportunity: 17640,
    methodologyNote: "[Source: Demo Health System / National Benchmark]. Patient count: 6,000 PAD risk patients x 60% not screened x 35% market share = 1,260. Use annual screening window: ~10% of unscreened per quarter = 126. Dollar opportunity: ABI $200 x 70% completion x 126 = $17,640. ACC/AHA screening guidelines.",
    evidence:
      'ACC/AHA: ABI screening Class IIa for age >=65 with risk factors, diabetics >=50. ABI <0.9 confirms PAD; >1.4 = non-compressible. 50-75% of PAD patients asymptomatic. ABI identifies polyvascular disease triggering COMPASS eligibility.',
    cta: 'Order Ankle-Brachial Index',
    priority: 'medium',
    detectionCriteria: [
      'DM (E11.x) + age >=50 + no ABI in 2 years',
      'CAD (I25.x) + no ABI in 2 years',
      'Age >=65 + smoking (Z87.891) + no ABI in 2 years',
      'Exertional leg pain + no ABI',
      'EXCLUDE: existing PAD diagnosis (I70.2x) — screen only if PAD not yet diagnosed',
    ],
    patients: abiScreeningPatients,
    whyMissed: 'ABI screening for PAD is recommended but rarely ordered in primary care. PAD symptoms are attributed to other causes without vascular assessment.',
    whyTailrd: 'TAILRD identified this at-risk patient has never had ABI screening despite risk factors documented across primary care encounters.',
  },
  {
    id: 'pv-gap-25-set-claudication',
    name: 'Claudication — Supervised Exercise Therapy Not Referred',
    category: 'Gap',
    patientCount: 84,
    dollarOpportunity: 84672,
    evidence:
      'CLEVER trial: supervised exercise = endovascular stenting for ABI + QOL in claudication at 6 months. Class I before revascularization. Only ~30% of eligible patients access SET. CPT 93668: 36 sessions.',
    cta: 'Refer to Supervised Exercise Therapy',
    priority: 'high',
    detectionCriteria: [
      'PAD with claudication (I70.211-I70.219)',
      'No CPT 93668 in 6 months',
      'No revascularization in past 3 months',
      'No rest pain or tissue loss (Rutherford Class 1-3 only)',
      'SET is Class I recommendation BEFORE revascularization for claudication',
    ],
    patients: setPatients,
    whyMissed: 'Supervised exercise therapy referral requires connecting claudication diagnosis with rehabilitation services — a referral that falls between vascular surgery and physical therapy.',
    whyTailrd: 'TAILRD connected claudication diagnosis with absence of supervised exercise therapy referral to identify this first-line treatment gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 6,000 PAD panel x 40% claudication = 2,400 x 70% no SET referral x 5% ID window = 84. Dollar opportunity: SET 36 sessions x $40 facility margin x 70% completion x 84 = $84,672. CLEVER trial. CPT 93668.',
  },
  {
    id: 'pv-gap-28-aaa-screening',
    name: 'AAA Screening Not Performed — USPSTF Class B',
    category: 'Gap',
    patientCount: 98,
    dollarOpportunity: 356720,
    evidence:
      'USPSTF: One-time AAA screening for men 65-75 who ever smoked — Class B. Prevalence 4-7%. Elective repair mortality <2% (EVAR), emergency rupture mortality 50-80%. One-time US screen cost ~$200.',
    cta: 'Order AAA Screening Ultrasound',
    priority: 'high',
    detectionCriteria: [
      'Male + age 65-75 + smoking history (Z87.891, F17.x)',
      'No abdominal US for AAA (no CPT 76706)',
      'No AAA diagnosis (I71.4 absent)',
      'Informational flag: females 65-75 + smoking + family Hx AAA (lower evidence but consider)',
    ],
    patients: aaaPatients,
    whyMissed: 'AAA screening is a one-time USPSTF recommendation that no system tracks systematically. The absence of a screening test is invisible to standard care.',
    whyTailrd: 'TAILRD identified this eligible patient has never had AAA ultrasound screening — a USPSTF Class B recommendation whose absence is invisible to standard tracking.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 2.5M catchment x 50% male x 15% age 65-75 x 35% market share x 25% smoking history = 16,406 eligible. 60% not screened x 1% ID window = 98. Dollar opportunity: AAA US $200 x 70% completion x 98 = $13,720 + downstream AAA repair $35,000 x 5% finding rate x 30% conversion x 98 = $343,000. Total ~$356,720. USPSTF Class B.',
  },
  {
    id: 'pv-gap-34-pad-dual-pathway-no-cad',
    name: 'PAD — Dual Pathway Therapy Evaluation Indicated',
    category: 'Gap',
    patientCount: 50,
    dollarOpportunity: 60000,
    evidence:
      'COMPASS PAD subgroup: rivaroxaban 2.5mg + ASA vs ASA alone. MALE reduction 46% (HR 0.54). MACE reduction in PAD patients without CAD also significant. Distinct from polyvascular (Gap 14) — applies to PAD-only patients who also deserve dual pathway consideration.',
    cta: 'Initiate Dual Pathway Therapy (Rivaroxaban 2.5mg + ASA)',
    priority: 'high',
    detectionCriteria: [
      'PAD (I70.2x) WITHOUT concurrent CAD (I25.x) — PAD-only patients',
      'On aspirin',
      'NOT on rivaroxaban 2.5mg BID',
      'NOT on other anticoagulant',
      'No major bleeding contraindication',
      'NOTE: Distinct from Gap 14 (polyvascular = CAD + PAD). Gap 34 = PAD only.',
    ],
    patients: padDualPathwayPatients,
    whyMissed: 'PAD-specific dual pathway therapy (without CAD) requires connecting PAD severity with bleeding risk assessment — a medication decision spanning vascular and primary care.',
    whyTailrd: 'TAILRD connected PAD severity documentation with current antithrombotic therapy and bleeding risk to identify dual pathway therapy eligibility.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 6,000 PAD panel x 80% no concurrent CAD = 4,800 x 15% not on dual pathway x 35% market share x 20% ID window = 50. Dollar opportunity: associated monitoring visits $1,200/patient/year x 50 = $60,000. COMPASS PAD subgroup MALE data. Distinct from polyvascular Gap 14.',
  },
  {
    id: 'pv-gap-35-renal-artery-stenosis',
    name: 'Resistant HTN + CKD — Renal Artery Stenosis Not Excluded',
    category: 'Growth',
    patientCount: 32,
    dollarOpportunity: 224000,
    evidence:
      'Renal artery stenosis causes 1-5% of secondary HTN and up to 20% of resistant HTN in elderly. Bilateral RAS causes flash pulmonary edema ("Pickering syndrome"). Diagnosis: renal duplex US (sensitive), CTA (definitive). Revascularization indicated for flash pulmonary edema or progressive CKD with bilateral RAS.',
    cta: 'Order Renal Artery Duplex Ultrasound',
    priority: 'medium',
    detectionCriteria: [
      'Resistant hypertension (SBP >150 on >=3 agents including diuretic OR >=4 agents total)',
      'CKD (eGFR <60 or creatinine trend worsening)',
      'Flash pulmonary edema OR ACE-I/ARB causing acute kidney injury',
      'NO renal duplex ultrasound or renal CTA in past 24 months',
    ],
    patients: rasPatients,
    whyMissed: 'Renal artery stenosis evaluation requires connecting resistant hypertension with CKD and renal imaging — data across nephrology, cardiology, and primary care.',
    whyTailrd: 'TAILRD connected resistant hypertension documentation with CKD staging and absence of renal vascular evaluation to identify this diagnostic gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 6,000 PAD panel x 15% resistant HTN x 10% CKD without renal imaging x 35% market share = 32. Dollar opportunity: renal duplex $400 x 70% completion x 32 = $8,960 + downstream renal artery stenting $35,000 x 20% RAS x 30% conversion x 32 = $215,040. Total ~$224,000. RAS prevalence 20% of resistant HTN.',
  },
  {
    id: 'pv-gap-36-mesenteric-ischemia',
    name: 'Postprandial Abdominal Pain — CMI Not Excluded',
    category: 'Growth',
    patientCount: 22,
    dollarOpportunity: 138600,
    evidence:
      'Chronic mesenteric ischemia (CMI) is underdiagnosed and potentially fatal if missed. Postprandial pain + weight loss + atherosclerotic burden = classic triad. Diagnosis: CTA abdomen or mesenteric duplex. Revascularization (percutaneous or surgical bypass) highly effective when CMI confirmed.',
    cta: 'Order Mesenteric Duplex Ultrasound or CTA Abdomen',
    priority: 'medium',
    detectionCriteria: [
      'Postprandial abdominal pain documented (unintentional weight loss >=5% OR food fear documented)',
      'Atherosclerotic risk factors (age >=60 + DM/HTN/smoking/CAD)',
      'NO mesenteric duplex or CTA-abdomen in past 12 months',
      'No alternative GI diagnosis explaining symptoms',
    ],
    patients: mesIschemia_patients,
    whyMissed: 'Chronic mesenteric ischemia requires connecting postprandial symptoms with vascular risk factors — an uncommon diagnosis rarely considered in standard GI workup.',
    whyTailrd: 'TAILRD connected postprandial abdominal pain with atherosclerotic risk factors and absence of mesenteric vascular evaluation to flag this uncommon but treatable condition.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 6,000 PAD panel x 4% postprandial pain pattern x 25% without mesenteric imaging x 35% market share = 22. Dollar opportunity: mesenteric duplex $400 x 70% completion x 22 = $6,160 + downstream mesenteric revascularization $35,000 x 15% confirmed CMI x 30% conversion x 22 = $132,440. Total ~$138,600. CMI underdiagnosis rate applied.',
  },
  {
    id: 'pv-gap-43-cilostazol',
    name: 'PAD Claudication — Cilostazol Not Prescribed',
    category: 'Gap',
    patientCount: 59,
    dollarOpportunity: 70800,
    evidence:
      'Cilostazol (PDE3 inhibitor): increases treadmill walking distance ~50% at 24 weeks vs placebo. Class I for claudication symptom relief. CONTRAINDICATED in congestive heart failure (increased mortality risk with PDE3 inhibitors in HF). Pentoxifylline is weaker alternative.',
    cta: 'Initiate Cilostazol 100mg BID',
    priority: 'medium',
    safetyNote: 'CONTRAINDICATION: Cilostazol is ABSOLUTELY CONTRAINDICATED in heart failure of ANY severity (NYHA I-IV). PDE3 inhibitors have demonstrated increased mortality in HF (milrinone data extrapolated). Confirm NO HF diagnosis (I50.x absent) before prescribing. If HF present, use pentoxifylline or supervised exercise instead.',
    detectionCriteria: [
      'PAD with claudication (I70.211-I70.219)',
      'NYHA class I-II (ambulatory, not severe HF)',
      'NOT on cilostazol',
      'NOT on SET (or SET not available)',
      'HF diagnosis MUST BE ABSENT (cilostazol CONTRAINDICATED in HF — verify this before prescribing)',
    ],
    patients: cilostazolPatients,
    whyMissed: 'Cilostazol for claudication requires connecting symptom severity with medication review — a therapy option often overlooked in favor of exercise or intervention.',
    whyTailrd: 'TAILRD connected PAD claudication symptoms with absence of cilostazol trial to identify this pharmacologic treatment gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 6,000 PAD panel x 40% claudication x 70% no cilostazol x 35% market share x 10% ID window = 59. Dollar opportunity: associated monitoring visits $1,200/patient/year x 59 = $70,800. National cilostazol utilization gap ~70%.',
  },
  // ── GAPS 84-87: NEW CLINICAL GAP DETECTION RULES ─────────────────────────
  {
    id: 'pv-gap-84-venous-ulcer',
    name: 'Chronic Venous Ulcer — Vascular Referral Overdue',
    category: 'Gap',
    patientCount: 42,
    dollarOpportunity: 940800,
    priority: 'high',
    evidence:
      'EVRA trial (UK, 2018): Early endovenous ablation + compression vs compression alone. Time to ulcer healing: 56 vs 82 days (P<0.001). At 24 weeks: 85.6% vs 76.3% healed. Without treating underlying reflux, ulcers recur in 60-70% within 1 year on compression alone.',
    cta: 'Refer to Vascular Surgery for Venous Ablation Evaluation',
    detectionCriteria: [
      'Chronic venous ulcer (L97.3x or I83.0x with ulcer) AND duration >12 weeks',
      'On compression therapy OR compression contraindicated (ABI <0.8)',
      'No vascular surgery referral documented',
      'No endovenous ablation (CPT 36478 or 36479)',
    ],
    patients: [
      {
        id: 'PV-VU-001',
        name: 'Geraldine Brannigan',
        mrn: 'MRN-PV-84001',
        age: 68,
        signals: [
          'Chronic venous ulcer — medial gaiter area, present 5 months',
          'On compression stockings — not healing with compression alone',
          'No vascular surgery referral; no ablation',
          'EVRA: ablation + compression heals 26 days faster than compression alone',
        ],
        keyValues: {
          'Ulcer Duration': '5 months',
          'Wound Duration Weeks': 11,
          'Referral Threshold': '12 weeks',
          'Location': 'Medial gaiter (venous pattern)',
          'Compression': 'Yes (class II stockings)',
          'ABI': '0.92 (compression safe)',
          'Vascular Referral': 'None',
          'Ablation': 'None',
        },
      },
      {
        id: 'PV-VU-002',
        name: 'Walter Ingram',
        mrn: 'MRN-PV-84002',
        age: 74,
        signals: [
          'Venous ulcer 9 months — recurrent, second episode this year',
          'Recurrent ulcer: underlying reflux not treated — EVRA supports ablation',
          'Compression applied but no duplex ultrasound to evaluate reflux',
          'No vascular surgery referral despite recurrent course',
        ],
        keyValues: {
          'Ulcer Duration': '9 months (recurrent)',
          'Wound Duration Weeks': 12,
          'Referral Threshold': '12 weeks',
          'Recurrences': '2nd episode this year',
          'Compression': 'Yes',
          'Duplex Venous': 'Not performed',
          'Vascular Referral': 'None',
          'EVRA': 'Ablation reduces recurrence 60-70% with compression alone',
        },
      },
      {
        id: 'PV-VU-003',
        name: 'Ethel Chambers',
        mrn: 'MRN-PV-84003',
        age: 61,
        signals: [
          'Chronic venous ulcer 4 months — managed by wound care only',
          'Duplex shows saphenous reflux — venous insufficiency confirmed',
          'No referral to vascular surgery for ablation',
          'EVRA: early ablation improves time-to-healing significantly',
        ],
        keyValues: {
          'Ulcer Duration': '4 months',
          'Duplex Result': 'GSV reflux >0.5 sec confirmed',
          'ABI': '0.95',
          'Current Management': 'Wound care + compression only',
          'Vascular Referral': 'None',
          'Ablation Opportunity': 'GSV ablation (CPT 36478)',
        },
      },
    ],
    whyMissed: 'Chronic venous ulcer vascular referral requires connecting wound duration with vascular assessment — wound care and vascular surgery operate in separate clinical workflows.',
    whyTailrd: 'TAILRD connected chronic venous ulcer documentation with wound duration and absence of vascular referral to identify this cross-specialty care gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: ~200 venous ulcers/year x 30% without vascular referral x 70% identifiable = 42. Dollar opportunity: endovenous ablation + wound care program $32,000/patient (full episode) x 70% conversion x 42 = $940,800. EVRA trial early ablation data.',
  },
  {
    id: 'pv-gap-85-unprovoked-vte',
    name: 'Unprovoked VTE — Extended Anticoagulation Not Evaluated',
    category: 'Gap',
    patientCount: 60,
    dollarOpportunity: 0,
    priority: 'high',
    evidence:
      'Unprovoked VTE: 10-15% annual recurrence after stopping anticoagulation. Extended anticoagulation reduces recurrence 80-90%. HERDOO2 score: women with 0-1 points = low recurrence risk, safe to stop at 3 months. Men: recurrence risk high enough to consider extended therapy. DOAC reduced dose (apixaban 2.5mg BID or rivaroxaban 10mg) maintains protection with lower bleeding risk.',
    cta: 'Assess for Extended Anticoagulation — Apply HERDOO2 Score',
    detectionCriteria: [
      'Unprovoked DVT (I82.4x) or PE (I26.x) — no major provoking factor (no surgery, active malignancy, immobility, estrogen in past 3 months)',
      'Anticoagulant discontinued at 3 months OR planned stop',
      'No extended anticoagulation assessment (HERDOO2, DASH, Vienna model) documented',
      'No malignancy workup completed',
    ],
    patients: [
      {
        id: 'PV-VTE-001',
        name: 'Bernard Fletcher',
        mrn: 'MRN-PV-85001',
        age: 62,
        signals: [
          'Unprovoked left leg DVT 4 months ago — no provoking factor identified',
          'On apixaban — plan to stop at 3 months',
          'No HERDOO2 score documented',
          'Male sex: higher recurrence risk — extended therapy recommended',
        ],
        keyValues: {
          'VTE': 'Unprovoked DVT (left leg)',
          'Event Date': '4 months ago',
          'Current AC': 'Apixaban 5mg BID (plan to stop)',
          'HERDOO2 Score': 'Not calculated',
          'Sex': 'Male — higher recurrence risk',
          'Malignancy Workup': 'Not documented',
        },
      },
      {
        id: 'PV-VTE-002',
        name: 'Lorraine Beaumont',
        mrn: 'MRN-PV-85002',
        age: 48,
        signals: [
          'Unprovoked PE 3 months ago — anticoagulation plan to stop',
          'No HERDOO2 score; female — score may support stopping or continuing',
          'No age-adjusted D-dimer for low-risk assessment',
          'Extended DOAC (apixaban 2.5mg BID) — lower bleeding with continued protection',
        ],
        keyValues: {
          'VTE': 'Unprovoked PE (bilateral)',
          'Event Date': '3 months ago',
          'Current AC': 'Rivaroxaban 20mg (plan to stop)',
          'HERDOO2': 'Not calculated',
          'Sex': 'Female — HERDOO2 applicable',
          'Extended AC': 'Not discussed (apixaban 2.5mg option)',
        },
      },
      {
        id: 'PV-VTE-003',
        name: 'Harold Pryce',
        mrn: 'MRN-PV-85003',
        age: 55,
        signals: [
          'Unprovoked DVT + concurrent PE — proximal DVT, higher recurrence risk',
          'Planned anticoagulation stop at 3 months — no extended discussion',
          'HERDOO2 not calculated; no DASH score either',
          'PE + proximal DVT: extended anticoagulation should be discussed',
        ],
        keyValues: {
          'VTE': 'Unprovoked proximal DVT + PE',
          'Event Date': '3.5 months ago',
          'Current AC': 'Apixaban 5mg BID',
          'HERDOO2': 'Not calculated',
          'Extended AC': 'Not discussed',
          'Recurrence Risk': 'High (proximal DVT + PE)',
        },
      },
    ],
    whyMissed: 'Extended anticoagulation evaluation for unprovoked VTE requires connecting VTE event type with anticoagulation duration — a time-based decision not tracked systematically.',
    whyTailrd: 'TAILRD connected unprovoked VTE event with anticoagulation duration to identify this patient for extended therapy evaluation.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 12-hospital system ~400 unprovoked VTE/year x 30% stopping at 3 months without extended AC evaluation x 50% ID = 60. Dollar opportunity: $0 direct revenue. Safety gap — 10-15% annual recurrence rate. HERDOO2 score criteria.',
  },
  {
    id: 'pv-gap-86-ivc-filter-no-ac',
    name: 'IVC Filter in Place — Anticoagulation Absent',
    category: 'Safety',
    patientCount: 30,
    dollarOpportunity: 0,
    priority: 'high',
    safetyNote:
      'PATIENT SAFETY: IVC filter does NOT replace anticoagulation — it is a bridge when anticoagulation is temporarily contraindicated. Filters without anticoagulation: thrombosis above filter, filter thrombosis in 10-30% within 1 year, post-thrombotic syndrome dramatically increased. Once contraindication resolves: restart anticoagulation AND arrange filter retrieval.',
    evidence:
      'PREPIC-2: retrievable IVC filter + anticoagulation vs anticoagulation alone — no reduction in PE (HR 2.00). Filters without anticoagulation: thrombosis above filter, filter thrombosis 10-30% within 1 year, post-thrombotic syndrome dramatically increased. Restart anticoagulation once contraindication resolves + arrange retrieval.',
    cta: 'Restart Anticoagulation + Arrange Filter Retrieval Assessment',
    detectionCriteria: [
      'IVC filter documented (CPT 37191 or filter noted in radiology)',
      'NOT on anticoagulant',
      'No documented active contraindication to anticoagulation',
    ],
    patients: [
      {
        id: 'PV-IVC-001',
        name: 'Raymond Kowalski',
        mrn: 'MRN-PV-86001',
        age: 67,
        signals: [
          'Retrievable IVC filter placed 18 months ago (pre-hip replacement surgery)',
          'Hip replacement healed 16 months ago — no anticoagulation restarted',
          'No documented active contraindication to anticoagulation',
          'Filter thrombosis risk: 10-30% within 1 year without AC',
        ],
        keyValues: {
          'IVC Filter': 'Retrievable (placed 18 months ago)',
          'Original Indication': 'Pre-surgical (hip replacement)',
          'Surgery Date': '16 months ago (healed)',
          'Current AC': 'None',
          'Contraindication': 'None documented',
          'Filter Retrieval': 'Not arranged',
        },
      },
      {
        id: 'PV-IVC-002',
        name: 'Nancy Strickland',
        mrn: 'MRN-PV-86002',
        age: 72,
        signals: [
          'IVC filter placed 24 months ago — placed for GI bleed contraindication',
          'GI bleed resolved 20 months ago — anticoagulation never restarted',
          'DVT history — anticoagulation indicated once contraindication resolved',
          'Post-thrombotic syndrome risk increasing without AC',
        ],
        keyValues: {
          'IVC Filter': 'Placed 24 months ago',
          'Original Indication': 'GI bleed (contraindication resolved)',
          'GI Bleed Resolved': '20 months ago',
          'Current AC': 'None',
          'VTE History': 'DVT (unprovoked)',
          'Action Needed': 'Restart AC + retrieval assessment',
        },
      },
      {
        id: 'PV-IVC-003',
        name: 'Victor Harrington',
        mrn: 'MRN-PV-86003',
        age: 59,
        signals: [
          'IVC filter in place 6 months — placed for post-trauma contraindication',
          'Trauma rehabilitation complete — no AC contraindication now active',
          'No anticoagulation restarted after trauma recovery',
          'Retrievable filter — retrieval window may be closing',
        ],
        keyValues: {
          'IVC Filter': 'Placed 6 months ago',
          'Original Indication': 'Trauma (contraindication resolved)',
          'Trauma Recovery': 'Complete',
          'Current AC': 'None',
          'Retrieval Window': 'Narrowing — arrange urgently',
          'VTE Risk': 'DVT noted during trauma hospitalization',
        },
      },
    ],
    whyMissed: 'IVC filter with absent anticoagulation requires connecting device implant history with current medication list — implanted devices and pharmacy data in separate systems.',
    whyTailrd: 'TAILRD connected IVC filter implant history with absence of current anticoagulation to identify this combined device-medication safety gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: ~100 IVC filters/year x 30% without AC and no active contraindication = 30. Dollar opportunity: $0 direct revenue. Safety gap — filter thrombosis rate 10-30% within 1 year without AC. PREPIC-2 trial.',
  },
  {
    id: 'pv-gap-87-may-thurner',
    name: 'Left Iliofemoral DVT — May-Thurner Not Excluded',
    category: 'Gap',
    patientCount: 17,
    dollarOpportunity: 178360,
    priority: 'medium',
    tag: 'May-Thurner | Young Women',
    evidence:
      'May-Thurner syndrome: right common iliac artery compresses left common iliac vein. Prevalence in left-sided DVT: 20-50%. Diagnosis: CT venography or IVUS. Treatment: catheter-directed thrombolysis for acute DVT + venous stenting of iliac compression segment. Stenting patency >85% at 1 year. Most DVT workups do not include pelvic imaging.',
    cta: 'Order CT Venography of Pelvis to Exclude May-Thurner',
    detectionCriteria: [
      'Left-sided iliofemoral DVT (I82.4x with left side or iliac vein involvement)',
      'Female sex AND age <50',
      'No CT venography or MR venography of pelvis',
      'No May-Thurner syndrome diagnosis or evaluation note',
    ],
    patients: [
      {
        id: 'PV-MT-001',
        name: 'Samantha Nkosi',
        mrn: 'MRN-PV-87001',
        age: 28,
        signals: [
          'Left iliofemoral DVT — extensive, involving common iliac vein',
          'Female, age 28 — May-Thurner prevalence 20-50% in this pattern',
          'No CT venography or pelvic imaging',
          'On OCP — estrogen risk factor, but structural May-Thurner possible',
        ],
        keyValues: {
          'DVT Location': 'Left iliofemoral (iliac involvement)',
          'Sex/Age': 'Female, 28',
          'CT Venography': 'Not ordered',
          'May-Thurner Eval': 'None',
          'OCP': 'Yes (combined provoking factor)',
          'Recurrence Risk': 'High if May-Thurner not treated',
          'DVT Events': 2,
          'Current Therapy': 'Anticoagulation alone',
          'Recurrence Note': 'Second DVT on therapeutic anticoagulation — consider intervention',
        },
      },
      {
        id: 'PV-MT-002',
        name: 'Jessica Fontaine',
        mrn: 'MRN-PV-87002',
        age: 35,
        signals: [
          'Left leg DVT extending to left iliac vein — iliofemoral pattern',
          'Female, 35 — no identifiable provoking factor (no surgery, no OCP, no malignancy)',
          'CT pelvis not obtained; May-Thurner not evaluated',
          'Stenting patency >85% at 1 year if May-Thurner confirmed',
        ],
        keyValues: {
          'DVT Location': 'Left leg extending to iliac',
          'Sex/Age': 'Female, 35',
          'Provoking Factor': 'None identified (unprovoked)',
          'CT Venography': 'Not ordered',
          'May-Thurner': 'Not evaluated',
          'Action': 'CT venography pelvis',
        },
      },
      {
        id: 'PV-MT-003',
        name: 'Danielle Ochieng',
        mrn: 'MRN-PV-87003',
        age: 22,
        signals: [
          'Massive left iliofemoral DVT — limb swelling, pain',
          'Female, 22 — youngest patient, highest May-Thurner suspicion',
          'No pelvic imaging performed; treated with anticoagulation only',
          'CDT + stenting indicated if May-Thurner confirmed — better long-term patency',
        ],
        keyValues: {
          'DVT Location': 'Massive left iliofemoral DVT',
          'Sex/Age': 'Female, 22',
          'Severity': 'Limb swelling + pain',
          'CT Venography': 'Not ordered',
          'May-Thurner': 'Not evaluated',
          'Treatment Potential': 'CDT + iliac stenting if May-Thurner confirmed',
        },
      },
    ],
    whyMissed: 'May-Thurner diagnosis requires connecting left iliofemoral DVT pattern with anatomic assessment — a structural cause of DVT that requires pattern recognition beyond standard DVT management.',
    whyTailrd: 'TAILRD connected left iliofemoral DVT recurrence pattern with absence of May-Thurner evaluation to identify this anatomic cause of recurrent thrombosis.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: ~200 left iliofemoral DVTs/year (12-hospital system) x 30% female <50 = 60 x 40% without CT venography x 70% identifiable = 17. Dollar opportunity: CT venography $800 x 70% completion x 17 = $9,520 + downstream iliac vein stenting $28,000 x 35% confirmed May-Thurner x 30% conversion x 17 = $168,840. Total ~$178,360. May-Thurner prevalence 20-50% in this pattern.',
  },
  // ── NEW GAPS pv-13 through pv-19 ─────────────────────────────
  {
    id: 'pv-gap-13-clti-revascularization',
    name: 'CLTI Revascularization Delayed — Limb Loss Risk',
    category: 'Safety',
    patientCount: 25,
    dollarOpportunity: 262500,
    priority: 'high',
    safetyNote: 'URGENT: Delayed revascularization in CLTI (WIfI Stage 3-4) increases major amputation risk 3-4x. Vascular surgery consultation within 2 weeks is critical.',
    evidence:
      'Conte MS et al, GVG (Global Vascular Guidelines, JVS 2019). SVS WIfI classification: Stage 3-4 = high amputation risk without timely intervention. BEST-CLI (Farber A, NEJM 2022). Revascularization within 2 weeks reduces limb loss.',
    cta: 'URGENT: Vascular Surgery Consultation — Revascularization Within 2 Weeks',
    detectionCriteria: [
      'Chronic limb-threatening ischemia (CLTI) diagnosis: rest pain, tissue loss, or gangrene',
      'WIfI Stage 3-4 (Wound, Ischemia, foot Infection classification)',
      'No revascularization attempt within 2 weeks of CLTI diagnosis',
      'No vascular surgery consultation documented',
    ],
    patients: [
      {
        id: 'PV-CLTI-001',
        name: 'Vernon Stackhouse',
        mrn: 'MRN-PV-13001',
        age: 72,
        signals: [
          'CLTI — non-healing forefoot ulcer 8 weeks, rest pain, ABI 0.35',
          'WIfI Stage 4 — high amputation risk without revascularization',
          'No vascular surgery referral despite tissue loss',
          'GVG: revascularization within 2 weeks for WIfI Stage 3-4',
        ],
        keyValues: {
          'Diagnosis': 'CLTI — forefoot ulcer + rest pain',
          'WIfI Stage': '4 (high amputation risk)',
          'ABI': '0.35',
          'Ulcer Duration': '8 weeks',
          'Vascular Surgery Referral': 'None',
          'Amputation Risk': '3-4x increased with delay',
        },
      },
      {
        id: 'PV-CLTI-002',
        name: 'Alma Gutierrez',
        mrn: 'MRN-PV-13002',
        age: 68,
        signals: [
          'CLTI — toe gangrene (dry), ABI 0.28, severe SFA/popliteal disease',
          'WIfI Stage 3 — revascularization needed to save limb',
          'Diabetic with CKD Stage 3 — high-risk patient for delayed healing',
          'BEST-CLI: revascularization improves limb salvage rates',
        ],
        keyValues: {
          'Diagnosis': 'CLTI — dry gangrene great toe',
          'WIfI Stage': '3',
          'ABI': '0.28',
          'Comorbidities': 'DM2, CKD Stage 3',
          'Vascular Surgery Referral': 'None',
          'Time Since Diagnosis': '3 weeks — exceeds 2-week window',
        },
      },
      {
        id: 'PV-CLTI-003',
        name: 'Curtis Beaumont',
        mrn: 'MRN-PV-13003',
        age: 78,
        signals: [
          'CLTI — rest pain at night, heel tissue loss, ABI non-compressible (calcified)',
          'Toe pressures 18 mmHg — critical ischemia confirmed',
          'WIfI Stage 4 — immediate revascularization evaluation needed',
          'Managed with wound care only — no vascular assessment',
        ],
        keyValues: {
          'Diagnosis': 'CLTI — rest pain + heel tissue loss',
          'WIfI Stage': '4',
          'ABI': 'Non-compressible',
          'Toe Pressures': '18 mmHg (critical)',
          'Current Management': 'Wound care only — no vascular consult',
          'Delay': '4 weeks since tissue loss onset',
        },
      },
    ],
    whyMissed: 'CLTI revascularization urgency requires connecting wound assessment (WIfI staging) with vascular imaging and surgical referral — wound care and vascular surgery operate in separate clinical workflows.',
    whyTailrd: 'TAILRD connected CLTI diagnosis with WIfI staging and absence of vascular surgery consultation to flag delayed revascularization as an urgent limb-threatening gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: PAD x 3% CLTI x delayed revascularization rate x 35% market share = ~25 patients. Dollar opportunity: limb salvage procedure revenue $35,000 x 25 x 30% = ~$262K + cost avoidance from prevented amputation ($60K+ per event).',
  },
  {
    id: 'pv-gap-14-best-cli-criteria',
    name: 'BEST-CLI Criteria — Endovascular vs Open Bypass Decision Not Documented',
    category: 'Quality',
    patientCount: 18,
    dollarOpportunity: 0,
    priority: 'high',
    evidence:
      'Farber A et al, BEST-CLI (NEJM 2022, PMID 36342173). Single-segment GSV bypass superior to endovascular for CLTI. Alternative conduit: outcomes equivalent. GLASS classification guides anatomic decision-making.',
    cta: 'Document GLASS Classification + Conduit Assessment Before Intervention',
    detectionCriteria: [
      'CLTI patient undergoing or planned for revascularization',
      'No documented GLASS classification (Global Limb Anatomic Staging System)',
      'No conduit assessment (GSV mapping) documented',
      'Surgical vs endovascular decision rationale not in chart',
    ],
    patients: [
      {
        id: 'PV-BCLI-001',
        name: 'Nathaniel Hobbs',
        mrn: 'MRN-PV-14B01',
        age: 66,
        signals: [
          'CLTI — planned for SFA intervention, no GLASS classification documented',
          'Single-segment GSV available by duplex — not assessed for bypass option',
          'BEST-CLI: GSV bypass superior to endovascular for CLTI when GSV available',
          'Revascularization strategy not documented per evidence-based criteria',
        ],
        keyValues: {
          'Diagnosis': 'CLTI — SFA/popliteal disease',
          'Planned Intervention': 'Endovascular (SFA)',
          'GLASS Classification': 'Not documented',
          'GSV Conduit': 'Not assessed',
          'BEST-CLI': 'GSV bypass may be superior',
          'Documentation Gap': 'Decision rationale absent',
        },
      },
      {
        id: 'PV-BCLI-002',
        name: 'Olivia Marchetti',
        mrn: 'MRN-PV-14B02',
        age: 74,
        signals: [
          'CLTI — extensive tibial disease, endovascular planned',
          'GSV previously harvested for CABG — no alternative conduit assessed',
          'BEST-CLI: alternative conduit outcomes equivalent to endovascular',
          'GLASS classification and conduit assessment should guide strategy',
        ],
        keyValues: {
          'Diagnosis': 'CLTI — tibial disease',
          'Planned Intervention': 'Endovascular (tibial)',
          'GLASS Classification': 'Not documented',
          'GSV Status': 'Harvested for prior CABG',
          'Alternative Conduit': 'Not assessed',
          'BEST-CLI Guidance': 'Endovascular reasonable if no GSV',
        },
      },
      {
        id: 'PV-BCLI-003',
        name: 'Rodney Ashford',
        mrn: 'MRN-PV-14B03',
        age: 70,
        signals: [
          'CLTI — infrapopliteal disease, surgical bypass being considered',
          'No GLASS classification documented — anatomic staging required',
          'GSV mapping completed: adequate single-segment GSV available',
          'BEST-CLI supports GSV bypass in this scenario — needs documentation',
        ],
        keyValues: {
          'Diagnosis': 'CLTI — infrapopliteal disease',
          'Planned Intervention': 'Surgical bypass (under consideration)',
          'GLASS Classification': 'Not documented',
          'GSV Mapping': 'Completed — adequate conduit',
          'BEST-CLI': 'GSV bypass supported',
          'Documentation Gap': 'GLASS + decision rationale missing',
        },
      },
    ],
    whyMissed: 'BEST-CLI evidence-based decision documentation requires GLASS classification and conduit assessment before revascularization strategy — these are specialized assessments not part of standard pre-operative checklists.',
    whyTailrd: 'TAILRD identified CLTI patients proceeding to revascularization without documented GLASS classification and conduit assessment to flag incomplete evidence-based decision-making.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: CLTI revascularizations x 30% without documented decision rationale = ~18 patients. Dollar opportunity: Quality metric — $0 direct but affects limb salvage rates.',
  },
  {
    id: 'pv-gap-15-post-revasc-duplex',
    name: 'Post-Revascularization Duplex Surveillance Overdue',
    category: 'Quality',
    patientCount: 40,
    dollarOpportunity: 9800,
    priority: 'medium',
    evidence:
      'SVS Practice Guidelines (Conte MS, JVS 2015). Duplex surveillance at 1, 3, 6, and 12 months post-bypass. Patency-threatening stenosis detected in 20-30% within first year. Early detection prevents graft/stent failure.',
    cta: 'Schedule Duplex Surveillance — Post-Revascularization Protocol',
    detectionCriteria: [
      'PAD patient > 6 months post-revascularization (bypass or stenting)',
      'No duplex ultrasound surveillance in past 6 months',
      'No documented graft/stent patency assessment',
      'SVS guideline: duplex at 1, 3, 6, 12 months post-bypass',
    ],
    patients: [
      {
        id: 'PV-DUP-001',
        name: 'Franklin Odom',
        mrn: 'MRN-PV-15001',
        age: 69,
        signals: [
          'Fem-pop bypass 9 months ago — no duplex surveillance since 3-month check',
          'SVS: duplex at 6 months overdue — restenosis window critical',
          '20-30% develop patency-threatening stenosis in first year',
          'Early detection prevents graft failure and limb loss',
        ],
        keyValues: {
          'Procedure': 'Fem-pop bypass (9 months ago)',
          'Last Duplex': '3 months post-op',
          'Next Due': '6 months post-op (overdue by 3 months)',
          'Graft Type': 'GSV conduit',
          'Restenosis Risk': '20-30% in first year',
        },
      },
      {
        id: 'PV-DUP-002',
        name: 'Gladys Tremaine',
        mrn: 'MRN-PV-15002',
        age: 75,
        signals: [
          'SFA stenting 14 months ago — no duplex surveillance since procedure',
          'In-stent restenosis rate 30-40% at 1 year for SFA stents',
          'Duplex surveillance never scheduled post-procedure',
          'Claudication symptoms may be returning — surveillance critical',
        ],
        keyValues: {
          'Procedure': 'SFA stenting (14 months ago)',
          'Last Duplex': 'None post-procedure',
          'Surveillance': 'Never scheduled',
          'Restenosis Risk': '30-40% at 1 year (SFA stent)',
          'Symptoms': 'Returning claudication — possible restenosis',
        },
      },
      {
        id: 'PV-DUP-003',
        name: 'Albert Nakamura',
        mrn: 'MRN-PV-15003',
        age: 63,
        signals: [
          'Tibial bypass 11 months ago — last duplex at 3 months showed normal velocities',
          '6-month and 9-month surveillance missed — annual duplex overdue',
          'Tibial bypasses have lower patency rates — surveillance critical',
          'SVS: missed surveillance increases risk of undetected graft failure',
        ],
        keyValues: {
          'Procedure': 'Tibial bypass (11 months ago)',
          'Last Duplex': '3 months post-op (normal)',
          'Missed Visits': '6-month and 9-month surveillance',
          'Graft Type': 'GSV conduit — tibial target',
          'Patency Concern': 'Tibial bypasses require close monitoring',
        },
      },
    ],
    whyMissed: 'Post-revascularization duplex surveillance requires systematic scheduling and tracking across multiple time points — no automated system triggers follow-up imaging after vascular procedures.',
    whyTailrd: 'TAILRD connected revascularization procedure dates with absence of scheduled duplex surveillance to identify patients overdue for post-intervention patency assessment.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: post-revascularization population x 35% overdue for surveillance = ~40 patients. Dollar opportunity: $350 duplex x 70% completion x 40 = ~$9,800 (prevents graft/stent failure requiring redo procedure $35K+).',
  },
  {
    id: 'pv-gap-16-thoracic-outlet',
    name: 'Thoracic Outlet Syndrome — Missed Diagnosis in Young Patients',
    category: 'Discovery',
    patientCount: 8,
    dollarOpportunity: 0,
    priority: 'medium',
    evidence:
      'Illig KA et al, SVS Reporting Standards for TOS (JVS 2016). Thompson RW, Annals of Surgery 2020. Venous TOS causes 1-4% of upper extremity DVT. Young patients with effort thrombosis (Paget-Schroetter) or neurogenic symptoms should be evaluated for TOS.',
    cta: 'Evaluate for Thoracic Outlet Syndrome — Provocative Testing',
    detectionCriteria: [
      'Age < 45',
      'Upper extremity DVT (effort thrombosis / Paget-Schroetter syndrome)',
      'OR neurogenic symptoms: hand numbness, weakness with overhead activity',
      'No evaluation for thoracic outlet syndrome documented',
    ],
    patients: [
      {
        id: 'PV-TOS-001',
        name: 'Brendan Calloway',
        mrn: 'MRN-PV-16001',
        age: 29,
        signals: [
          'Right subclavian vein DVT — effort thrombosis (Paget-Schroetter syndrome)',
          'Competitive swimmer — repetitive overhead motion',
          'No TOS evaluation performed — managed with anticoagulation alone',
          'SVS: venous TOS should be suspected in young effort thrombosis',
        ],
        keyValues: {
          'Diagnosis': 'Right subclavian vein DVT',
          'Age': 29,
          'Activity': 'Competitive swimmer',
          'TOS Evaluation': 'Not performed',
          'Current Treatment': 'Anticoagulation only',
          'Suspected': 'Venous TOS (Paget-Schroetter)',
        },
      },
      {
        id: 'PV-TOS-002',
        name: 'Cassandra Linfield',
        mrn: 'MRN-PV-16002',
        age: 34,
        signals: [
          'Bilateral hand numbness with overhead activity — neurogenic TOS pattern',
          'EMG normal — neurogenic TOS often has normal EMG (disputed subtype)',
          'Diagnosed as carpal tunnel — not responding to treatment',
          'TOS provocative testing not performed (Roos, Adson, Wright)',
        ],
        keyValues: {
          'Symptoms': 'Bilateral hand numbness with overhead activity',
          'Age': 34,
          'Prior Diagnosis': 'Carpal tunnel (not responding)',
          'EMG': 'Normal',
          'TOS Testing': 'Not performed',
          'Suspected': 'Neurogenic TOS (disputed)',
        },
      },
      {
        id: 'PV-TOS-003',
        name: 'Derek Johansson',
        mrn: 'MRN-PV-16003',
        age: 26,
        signals: [
          'Axillary vein DVT — no provoking factor identified',
          'Manual laborer — repetitive lifting and overhead work',
          'No venous TOS workup (dynamic venography, MRA with arm positioning)',
          'Recurrence risk high without TOS decompression if anatomic compression present',
        ],
        keyValues: {
          'Diagnosis': 'Axillary vein DVT (unprovoked)',
          'Age': 26,
          'Occupation': 'Manual laborer',
          'TOS Workup': 'Not performed',
          'Current Treatment': 'Anticoagulation',
          'Recurrence Risk': 'High without decompression if TOS confirmed',
        },
      },
    ],
    whyMissed: 'Thoracic outlet syndrome requires connecting upper extremity DVT or neurogenic symptoms in young patients with occupational/activity history — a pattern recognition gap between vascular and musculoskeletal evaluation.',
    whyTailrd: 'TAILRD connected upper extremity DVT patterns in young patients with absence of thoracic outlet syndrome evaluation to identify this missed diagnostic opportunity.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: upper extremity DVT + neurogenic symptoms x TOS fraction x not evaluated = ~8 patients. Dollar opportunity: Discovery — $0 direct revenue but prevents chronic disability.',
  },
  {
    id: 'pv-gap-17-ckd-dialysis-access',
    name: 'CKD Stage 4-5 — Dialysis Access Planning Not Initiated',
    category: 'Gap',
    patientCount: 45,
    dollarOpportunity: 189000,
    priority: 'high',
    evidence:
      'NKF KDOQI Guidelines (2019 update). Lok CE et al, KDOQI (AJKD 2020). AVF preferred over AVG over catheter. Early referral when eGFR <25, fistula placement when eGFR <15 or dialysis anticipated within 6 months. Early referral reduces catheter-dependent dialysis starts.',
    cta: 'Vascular Surgery Referral — AV Fistula Planning',
    detectionCriteria: [
      'CKD Stage 4-5 (eGFR < 30) in cardiovascular panel',
      'No documented vascular surgery referral for AV fistula planning',
      'No existing AV fistula, AV graft, or peritoneal dialysis catheter',
      'KDOQI: refer when eGFR <25, create fistula when eGFR <15 or dialysis within 6 months',
    ],
    patients: [
      {
        id: 'PV-CKD-001',
        name: 'Lawrence Prescott',
        mrn: 'MRN-PV-17001',
        age: 64,
        signals: [
          'CKD Stage 4 — eGFR 22, trending down from 28 over 12 months',
          'Diabetic nephropathy — dialysis anticipated within 12-18 months',
          'No vascular surgery referral for AV fistula creation',
          'KDOQI: refer when eGFR <25 — window closing for fistula maturation',
        ],
        keyValues: {
          'eGFR': '22 (CKD Stage 4)',
          'Prior eGFR': '28 (12 months ago)',
          'Etiology': 'Diabetic nephropathy',
          'Dialysis Timeline': 'Anticipated 12-18 months',
          'Vascular Surgery Referral': 'None',
          'Existing Access': 'None',
        },
      },
      {
        id: 'PV-CKD-002',
        name: 'Mildred Fontana',
        mrn: 'MRN-PV-17002',
        age: 71,
        signals: [
          'CKD Stage 5 — eGFR 12, dialysis imminent',
          'No AV fistula created — will require emergent catheter for dialysis start',
          'KDOQI: fistula should be placed when eGFR <15 — already past threshold',
          'Late referral means catheter-dependent dialysis start (higher infection, mortality)',
        ],
        keyValues: {
          'eGFR': '12 (CKD Stage 5)',
          'Prior eGFR': '18 (6 months ago)',
          'Dialysis Status': 'Imminent — no access created',
          'Vascular Surgery Referral': 'None',
          'Risk': 'Catheter-dependent start (higher mortality)',
          'URGENCY': 'High — AVF creation needed ASAP',
        },
      },
      {
        id: 'PV-CKD-003',
        name: 'Timothy Nwosu',
        mrn: 'MRN-PV-17003',
        age: 58,
        signals: [
          'CKD Stage 4 — eGFR 19, rapid decline (was 32 eighteen months ago)',
          'Hypertensive nephrosclerosis + DM2 — dual etiology',
          'No vascular surgery referral despite eGFR <25 threshold',
          'AVF requires 2-3 months maturation — early planning critical',
        ],
        keyValues: {
          'eGFR': '19 (CKD Stage 4, rapid decline)',
          'Prior eGFR': '32 (18 months ago)',
          'Decline Rate': 'Rapid — 13 points in 18 months',
          'Etiology': 'HTN nephrosclerosis + DM2',
          'Vascular Surgery Referral': 'None',
          'Maturation Time': '2-3 months for AVF',
        },
      },
    ],
    whyMissed: 'Dialysis access planning requires connecting CKD progression trajectory with vascular surgery referral — nephrology and vascular surgery operate in separate referral systems.',
    whyTailrd: 'TAILRD connected CKD stage and eGFR trajectory with absence of vascular surgery referral to identify patients who need AV fistula planning before dialysis initiation.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: CKD 4-5 in CV panel x 40% without vascular surgery referral x 35% market share = ~45 patients. Dollar opportunity: $12,000 AVF creation x 35% conversion x 45 = ~$189K.',
  },
  {
    id: 'pv-gap-18-popliteal-entrapment',
    name: 'Popliteal Artery Entrapment — Young Patient Claudication Misdiagnosed',
    category: 'Discovery',
    patientCount: 5,
    dollarOpportunity: 12500,
    priority: 'medium',
    evidence:
      'Popliteal artery entrapment syndrome (PAES): young patient with exertional claudication, normal resting ABI but abnormal with provocative maneuvers, diagnosed by MRA with ankle plantar/dorsiflexion. Levien LJ et al, JVS 2012. Often misdiagnosed as musculoskeletal.',
    cta: 'ABI with Provocative Maneuvers — MRA if Abnormal',
    detectionCriteria: [
      'Age < 40',
      'Exertional calf claudication',
      'Normal ABI at rest',
      'No atherosclerotic risk factors (non-smoker, no DM, no HTN)',
      'Not evaluated for popliteal artery entrapment syndrome',
    ],
    patients: [
      {
        id: 'PV-PAES-001',
        name: 'Kyle Whitaker',
        mrn: 'MRN-PV-18001',
        age: 28,
        signals: [
          'Bilateral calf claudication with running — normal resting ABI 1.12/1.10',
          'No atherosclerotic risk factors — non-smoker, no DM, no HTN',
          'Diagnosed as shin splints by sports medicine — not improving',
          'PAES should be suspected in young athlete with exertional calf symptoms',
        ],
        keyValues: {
          'Age': 28,
          'Symptoms': 'Bilateral calf claudication with running',
          'Resting ABI': '1.12 / 1.10 (normal)',
          'Risk Factors': 'None (no smoking, no DM, no HTN)',
          'Prior Diagnosis': 'Shin splints (not improving)',
          'PAES Evaluation': 'Not performed',
        },
      },
      {
        id: 'PV-PAES-002',
        name: 'Samantha Thorne',
        mrn: 'MRN-PV-18002',
        age: 32,
        signals: [
          'Right calf claudication with exertion — 6 months duration',
          'Normal ABI 1.08 — no PAD by standard criteria',
          'CrossFit athlete — repetitive calf muscle hypertrophy',
          'ABI with provocative maneuvers (plantar flexion) not performed',
        ],
        keyValues: {
          'Age': 32,
          'Symptoms': 'Right calf claudication with exertion',
          'Resting ABI': '1.08 (normal)',
          'Activity': 'CrossFit athlete',
          'Duration': '6 months',
          'PAES Evaluation': 'Not performed',
        },
      },
      {
        id: 'PV-PAES-003',
        name: 'Jordan Eisenberg',
        mrn: 'MRN-PV-18003',
        age: 24,
        signals: [
          'Left calf numbness and claudication during soccer — relieved at rest',
          'Normal bilateral ABI — no vascular workup performed',
          'Referred to orthopedics — MRI knee negative for structural pathology',
          'Functional PAES (Type VI) possible in young athletes without anatomic variant',
        ],
        keyValues: {
          'Age': 24,
          'Symptoms': 'Left calf numbness + claudication during soccer',
          'Resting ABI': 'Normal bilateral',
          'Orthopedic MRI': 'Negative',
          'PAES Type Suspected': 'Functional (Type VI)',
          'Next Step': 'ABI with provocative maneuvers + MRA',
        },
      },
    ],
    whyMissed: 'Popliteal artery entrapment requires recognizing that young patient claudication with normal resting ABI suggests an anatomic rather than atherosclerotic cause — a diagnosis outside standard PAD algorithms.',
    whyTailrd: 'TAILRD identified young patients with exertional claudication and normal ABI who have not been evaluated for popliteal artery entrapment — a rare but treatable cause of claudication in the young.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: young claudication patients x PAES fraction x not evaluated = ~5 patients. Dollar opportunity: diagnostic workup $2,500 x 5 = ~$12.5K.',
  },
  {
    id: 'pv-gap-19-venous-stent-surveillance',
    name: 'Venous Stenting Follow-Up — May-Thurner Post-Intervention Surveillance',
    category: 'Quality',
    patientCount: 10,
    dollarOpportunity: 2450,
    priority: 'medium',
    evidence:
      'Neglen P et al, JVS 2007. Raju S, AJR 2013. Venous stent surveillance prevents rethrombosis and recurrent DVT. In-stent restenosis rate 10-15% at 1 year. Duplex surveillance at 1, 3, 6, and 12 months recommended.',
    cta: 'Schedule Venous Duplex Surveillance — May-Thurner Protocol',
    detectionCriteria: [
      'Prior iliac vein stenting for May-Thurner syndrome',
      'No duplex ultrasound surveillance in past 6 months',
      'Post-stent surveillance protocol: duplex at 1, 3, 6, and 12 months',
      'In-stent restenosis rate 10-15% at 1 year without surveillance',
    ],
    patients: [
      {
        id: 'PV-VSS-001',
        name: 'Christina Beauregard',
        mrn: 'MRN-PV-19001',
        age: 33,
        signals: [
          'Left iliac vein stent for May-Thurner 8 months ago — no duplex since 3-month check',
          '6-month surveillance overdue — in-stent restenosis window',
          'On anticoagulation — but stent patency not assessed',
          'Neglen: venous stent surveillance prevents rethrombosis',
        ],
        keyValues: {
          'Procedure': 'Left iliac vein stenting (May-Thurner)',
          'Stent Date': '8 months ago',
          'Last Duplex': '3 months post-stent',
          'Next Due': '6 months (overdue by 2 months)',
          'Anticoagulation': 'Rivaroxaban 20mg',
          'Restenosis Risk': '10-15% at 1 year',
        },
      },
      {
        id: 'PV-VSS-002',
        name: 'Nicole Fujimoto',
        mrn: 'MRN-PV-19002',
        age: 41,
        signals: [
          'Bilateral iliac stents for May-Thurner 14 months ago — no duplex in 8 months',
          '12-month surveillance missed — annual check critical for bilateral stents',
          'History of recurrent DVT — rethrombosis risk if restenosis missed',
          'Duplex surveillance: simple, non-invasive, prevents catastrophic rethrombosis',
        ],
        keyValues: {
          'Procedure': 'Bilateral iliac vein stenting (May-Thurner)',
          'Stent Date': '14 months ago',
          'Last Duplex': '6 months post-stent',
          'Missed': '12-month surveillance',
          'DVT History': 'Recurrent (3 prior events)',
          'Surveillance Status': 'Overdue by 8 months',
        },
      },
      {
        id: 'PV-VSS-003',
        name: 'Rebecca Ainsworth',
        mrn: 'MRN-PV-19003',
        age: 30,
        signals: [
          'Left iliac stent 10 months ago — only 1-month post-stent duplex performed',
          '3-month, 6-month, and upcoming 12-month surveillance all missed',
          'Young patient — long stent durability needed, surveillance critical',
          'Anticoagulation duration decision depends on stent patency assessment',
        ],
        keyValues: {
          'Procedure': 'Left iliac vein stenting',
          'Stent Date': '10 months ago',
          'Last Duplex': '1 month post-stent only',
          'Missed': '3-month, 6-month surveillance',
          'Age': 30,
          'AC Duration': 'Depends on stent patency (pending assessment)',
        },
      },
    ],
    whyMissed: 'Venous stent surveillance requires systematic scheduling across multiple time points after stent placement — no automated tracking for post-intervention venous duplex protocols.',
    whyTailrd: 'TAILRD connected iliac vein stent placement date with absence of scheduled duplex surveillance to identify patients overdue for post-May-Thurner stent patency assessment.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: May-Thurner stented patients x 35% overdue for surveillance = ~10 patients. Dollar opportunity: $350 duplex x 70% completion x 10 = ~$2,450.',
  },
];

// ============================================================
// ENHANCED DISPLAY HELPERS
// ============================================================

/** Gap 86: IVC Filter without anticoagulation — RED safety alert */
const renderIVCFilterSafetyAlert = (pt: PVGapPatient) => {
  const filterType = String(pt.keyValues['IVC Filter'] || '');
  const originalIndication = String(pt.keyValues['Original Indication'] || '');
  const currentAC = String(pt.keyValues['Current AC'] || '');
  const contraindication = String(pt.keyValues['Contraindication'] || pt.keyValues['Retrieval Window'] || '');

  const isRetrievable = filterType.toLowerCase().includes('retrievable');
  const contraindicationResolved = originalIndication.toLowerCase().includes('resolved') ||
    originalIndication.toLowerCase().includes('healed') ||
    originalIndication.toLowerCase().includes('complete');
  const notAnticoagulated = currentAC.toLowerCase().includes('none');
  const isCritical = isRetrievable && contraindicationResolved && notAnticoagulated;

  return (
    <div className={`mt-3 border-2 rounded-xl p-3 space-y-2 ${isCritical ? 'bg-red-100 border-red-400' : 'bg-red-50 border-red-200'}`}>
      {isCritical && (
        <div className="flex items-center gap-2 text-xs font-bold text-red-900 bg-red-200 px-2 py-1 rounded-lg w-fit">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          CRITICAL: Retrievable filter + contraindication resolved + not anticoagulated
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-red-600 font-medium">Filter type:</span> <span className="text-red-900">{filterType}</span></div>
        <div><span className="text-red-600 font-medium">Original contraindication:</span> <span className="text-red-900">{originalIndication}</span></div>
        <div><span className="text-red-600 font-medium">Current AC status:</span> <span className="font-bold text-red-900">{currentAC}</span></div>
        <div><span className="text-red-600 font-medium">Retrieval status:</span> <span className="text-red-900">{String(pt.keyValues['Filter Retrieval'] || pt.keyValues['Retrieval Window'] || 'Not arranged')}</span></div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
        <Zap className="w-3 h-3 flex-shrink-0" />
        Auto-detected from procedure and medication records
      </div>
    </div>
  );
};

/** Gap 85: Unprovoked VTE — HERDOO2 display */
const renderVTEHerdoo2Display = (pt: PVGapPatient) => {
  const sex = String(pt.keyValues['Sex'] || '').toLowerCase();
  const isMale = sex.includes('male') && !sex.includes('female');
  const isFemale = sex.includes('female');

  if (isMale) {
    return (
      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
        <div className="text-sm font-semibold text-amber-900">
          High-risk (male) — extended anticoagulation recommended
        </div>
        <div className="text-xs text-amber-700">
          Men with unprovoked VTE have high recurrence risk (10-15%/yr). Extended DOAC at reduced dose (apixaban 2.5mg BID or rivaroxaban 10mg) recommended.
        </div>
        <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
          <Zap className="w-3 h-3 flex-shrink-0" />
          Auto-calculated
        </div>
      </div>
    );
  }

  if (isFemale) {
    const bmiRaw = pt.keyValues['BMI'];
    const ageVal = pt.age;
    const ptsStr = String(pt.keyValues['Post-Thrombotic Syndrome'] || '').toLowerCase();
    const priorVTERaw = pt.keyValues['Prior VTE Count'];
    const herdooResult = computeHERDOO2({
      sex: 'female',
      age: ageVal,
      bmi: bmiRaw != null ? parseFloat(String(bmiRaw)) : undefined,
      postThromboticSyndrome: ptsStr.includes('yes') || ptsStr.includes('true'),
      priorVTECount: priorVTERaw != null ? parseInt(String(priorVTERaw), 10) : undefined,
    });

    return (
      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
        <div className="text-sm font-semibold text-amber-900">
          HERDOO2: {herdooResult.score}/4 &mdash; {herdooResult.risk}
        </div>
        <div className="text-xs text-amber-700 space-y-0.5">
          {herdooResult.components.length > 0 && (
            <div>Components: {herdooResult.components.join(', ')}</div>
          )}
          <div>Hyperpigmentation/edema/redness in either leg (1pt), Obesity BMI &ge;30 (1pt), Older age &ge;65 (1pt), &ge;2 prior VTE (1pt)</div>
          {herdooResult.score <= 1 && (
            <div className="font-medium text-green-700">Score 0-1: Low recurrence risk &mdash; may safely stop anticoagulation at 3 months</div>
          )}
          {herdooResult.score >= 2 && (
            <div className="font-medium text-red-700">Score &ge;2: High recurrence risk &mdash; extended anticoagulation recommended</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
          <Zap className="w-3 h-3 flex-shrink-0" />
          Auto-calculated
        </div>
      </div>
    );
  }

  return null;
};

/** Gap 24: ABI Screening display */
const renderABIDisplay = (pt: PVGapPatient) => {
  const abiRaw = String(pt.keyValues['ABI'] || pt.keyValues['ABI Status'] || '');
  const abiMatch = abiRaw.match(/([\d.]+)/);
  const abiVal = abiMatch ? parseFloat(abiMatch[1]) : null;

  let interpretation = '';
  if (abiVal !== null) {
    if (abiVal > 1.4) interpretation = 'Non-compressible (calcified vessels)';
    else if (abiVal >= 0.9) interpretation = 'Normal';
    else if (abiVal >= 0.7) interpretation = 'Moderate PAD';
    else if (abiVal >= 0.4) interpretation = 'Severe PAD';
    else interpretation = 'Critical limb ischemia';
  }

  if (abiVal !== null && interpretation) {
    return (
      <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1">
        <div className="text-sm font-semibold text-blue-900">
          ABI: {abiVal.toFixed(2)} — {interpretation}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-blue-600">
          <Zap className="w-3 h-3 flex-shrink-0" />
          From vascular lab data
        </div>
      </div>
    );
  }

  // No ABI value available — show screening needed
  return (
    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
      <div className="text-sm font-semibold text-amber-900">
        ABI: Not yet performed — screening indicated
      </div>
      <div className="flex items-center gap-1.5 text-xs text-blue-600">
        <Zap className="w-3 h-3 flex-shrink-0" />
        No vascular lab data on file
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PREDICTIVE INTELLIGENCE — Trajectory + Time Horizon for PV patients
// ---------------------------------------------------------------------------

const getPVTrajectoryBadges = (gap: PVClinicalGap, pt: PVGapPatient) => {
  const kv = pt.keyValues;
  let trajectory: TrajectoryResult | null = null;

  // ABI: declining = worsening (computeTrajectory treats declining as worsening by default)
  const currentABIStr = String(kv['ABI'] || '');
  const currentABI = parseFloat(currentABIStr);
  const priorABI = typeof kv['Prior ABI'] === 'number' ? kv['Prior ABI'] : parseFloat(String(kv['Prior ABI'] || ''));

  const currentEGFR = typeof kv['eGFR'] === 'number' ? kv['eGFR'] : parseFloat(String(kv['eGFR'] || ''));
  const priorEGFR = typeof kv['Prior eGFR'] === 'number' ? kv['Prior eGFR'] : parseFloat(String(kv['Prior eGFR'] || ''));

  if (!isNaN(currentABI) && !isNaN(priorABI) && priorABI > 0) {
    trajectory = computeTrajectory({ currentValue: currentABI, priorValue: priorABI, daysBetween: 180 });
  } else if (!isNaN(currentEGFR) && !isNaN(priorEGFR) && priorEGFR > 0) {
    trajectory = computeTrajectory({ currentValue: currentEGFR, priorValue: priorEGFR, daysBetween: 180 });
  }

  if (!trajectory) return null;

  const traj = trajectoryDisplay(trajectory.direction);
  const horizon = computeTimeHorizon({
    predictedMonths: null,
    gapCategory: gap.category as 'Safety' | 'Gap' | 'Growth',
    trajectoryDirection: trajectory.direction,
  });
  const hDisp = timeHorizonDisplay(horizon.horizon);

  return (
    <>
      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${
        trajectory.direction === 'worsening_rapid' ? 'bg-red-100 text-red-700' :
        trajectory.direction === 'worsening_slow' ? 'bg-amber-100 text-amber-700' :
        trajectory.direction === 'improving' ? 'bg-green-100 text-green-700' :
        'bg-gray-100 text-gray-600'
      }`}>
        {traj.arrow} {traj.label}
      </span>
      <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-medium ${hDisp.bgClass} ${hDisp.textClass}`}>
        {hDisp.icon} {hDisp.label}
      </span>
    </>
  );
};

const renderPVPredictiveDetail = (gap: PVClinicalGap, pt: PVGapPatient) => {
  const kv = pt.keyValues;
  const elements: React.ReactNode[] = [];

  // ABI trajectory detail
  const currentABIStr = String(kv['ABI'] || '');
  const currentABI = parseFloat(currentABIStr);
  const priorABI = typeof kv['Prior ABI'] === 'number' ? kv['Prior ABI'] : parseFloat(String(kv['Prior ABI'] || ''));

  if (!isNaN(currentABI) && !isNaN(priorABI) && priorABI > 0) {
    const trajectory = computeTrajectory({ currentValue: currentABI, priorValue: priorABI, daysBetween: 180 });
    const traj = trajectoryDisplay(trajectory.direction);
    elements.push(
      <div key="abi-traj" className="mt-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3 space-y-1">
        <div className="flex items-center gap-2 text-sm font-bold text-indigo-800">
          <TrendingUp className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          Predictive Intelligence — ABI Trajectory
        </div>
        <div className="text-sm text-indigo-700">
          Current ABI: {currentABI.toFixed(2)} · Prior ABI: {priorABI.toFixed(2)} (6 months ago) · {traj.arrow} {traj.label} · Rate: {Math.abs(trajectory.ratePerYear).toFixed(3)}/year
          {currentABI < 0.5 && <> · Critical limb ischemia threshold approaching</>}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
          <Zap className="w-3 h-3 flex-shrink-0" />
          Trajectory-aware · Forward-looking · Auto-computed from serial vascular lab data
        </div>
      </div>
    );
  }

  // eGFR trajectory detail
  const currentEGFR = typeof kv['eGFR'] === 'number' ? kv['eGFR'] : parseFloat(String(kv['eGFR'] || ''));
  const priorEGFR = typeof kv['Prior eGFR'] === 'number' ? kv['Prior eGFR'] : parseFloat(String(kv['Prior eGFR'] || ''));

  if (!isNaN(currentEGFR) && !isNaN(priorEGFR) && priorEGFR > 0) {
    const eGFRTrajectory = computeTrajectory({ currentValue: currentEGFR, priorValue: priorEGFR, daysBetween: 180 });
    const eTraj = trajectoryDisplay(eGFRTrajectory.direction);
    elements.push(
      <div key="egfr-traj" className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
          <Activity className="w-4 h-4 text-amber-600 flex-shrink-0" />
          Renal Function Trajectory
        </div>
        <div className="text-sm text-amber-700">
          eGFR: {currentEGFR} · Prior: {priorEGFR} (6 months ago) · {eTraj.arrow} {eTraj.label} · Rate: {Math.abs(eGFRTrajectory.ratePerYear).toFixed(1)} mL/min/year
          {currentEGFR < 30 && <> · CKD Stage 4+ — contrast and medication dosing implications</>}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
          <Zap className="w-3 h-3 flex-shrink-0" />
          Trajectory-aware · Auto-computed from serial labs
        </div>
      </div>
    );
  }

  return elements.length > 0 ? <>{elements}</> : null;
};

/** Determine which enhanced display to render for a given PV gap + patient */
const renderPVEnhancedDisplay = (gap: PVClinicalGap, pt: PVGapPatient) => {
  const gapId = gap.id.toLowerCase();

  // Gap 86: IVC Filter
  if (gapId.includes('ivc') || gapId.includes('gap-86')) {
    return renderIVCFilterSafetyAlert(pt);
  }

  // Gap 85: Unprovoked VTE
  if (gapId.includes('vte') || gapId.includes('gap-85')) {
    return renderVTEHerdoo2Display(pt);
  }

  // Gap 24: ABI Screening
  if (gapId.includes('abi') || gapId.includes('gap-24')) {
    return renderABIDisplay(pt);
  }

  return null;
};

// ============================================================
// GAP-LEVEL TRAJECTORY DATA
// ============================================================
const getPVGapTrajectoryData = (_gapId: string, patientCount: number, category: string): TrajectoryDistribution => {
  const isSafety = category === 'Safety';
  const isGrowth = category === 'Growth';
  if (isSafety) {
    return { worseningRapid: Math.round(patientCount * 0.29), worseningSlow: Math.round(patientCount * 0.36), stable: Math.round(patientCount * 0.24), improving: Math.round(patientCount * 0.11), total: patientCount };
  }
  if (isGrowth) {
    return { worseningRapid: Math.round(patientCount * 0.07), worseningSlow: Math.round(patientCount * 0.19), stable: Math.round(patientCount * 0.44), improving: Math.round(patientCount * 0.30), total: patientCount };
  }
  return { worseningRapid: Math.round(patientCount * 0.20), worseningSlow: Math.round(patientCount * 0.26), stable: Math.round(patientCount * 0.33), improving: Math.round(patientCount * 0.21), total: patientCount };
};

// ============================================================
// COMPONENT
// ============================================================
const PVClinicalGapDetectionDashboard: React.FC = () => {
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'priority' | 'patients' | 'opportunity'>('priority');
  const [showMethodology, setShowMethodology] = useState<string | null>(null);

  const totalPatients = PV_CLINICAL_GAPS.reduce((sum, g) => sum + g.patientCount, 0);
  const totalOpportunity = PV_CLINICAL_GAPS.reduce((sum, g) => sum + g.dollarOpportunity, 0);

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const categoryOrder: Record<string, number> = { Safety: 0, Discovery: 1, Gap: 2, Growth: 3 };
  const sortedGaps = [...PV_CLINICAL_GAPS].sort((a, b) => {
    const catDiff = (categoryOrder[a.category] ?? 3) - (categoryOrder[b.category] ?? 3);
    if (catDiff !== 0) return catDiff;
    switch (sortBy) {
      case 'patients': return b.patientCount - a.patientCount;
      case 'opportunity': return b.dollarOpportunity - a.dollarOpportunity;
      default: return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
    }
  });

  const priorityColor = (p: string) => {
    if (p === 'high') return 'bg-red-50 border-red-300 text-red-700';
    if (p === 'medium') return 'bg-amber-50 border-amber-300 text-amber-700';
    return 'bg-green-50 border-green-300 text-green-700';
  };

  const categoryColor = (c: string) =>
    c === 'Discovery'
      ? 'bg-indigo-100 text-indigo-800'
      : c === 'Gap'
      ? 'bg-red-100 text-red-800'
      : c === 'Safety'
      ? 'bg-rose-200 text-rose-900'
      : 'bg-blue-100 text-blue-800';

  return (
    <div className="space-y-6">
      {/* Header summary */}
      <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-titanium-900 mb-1 flex items-center gap-2">
          <Activity className="w-5 h-5 text-medical-arterial-600" />
          Clinical Gap Detection — Peripheral Vascular Module
        </h3>
        <p className="text-sm text-titanium-600 mb-4">
          AI-driven detection of evidence-based PV therapy gaps — polyvascular cross-module opportunities.
          Gaps 14, 24, 25, 28, 34, 35, 36, 43 — 45-gap initiative.
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
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Cross-Module Gaps</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{PV_CLINICAL_GAPS.length}</div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-700">
            <strong>Cross-Module Note:</strong> Gap 14 (COMPASS Dual Pathway) patients with both CAD and PAD
            appear in both the CAD and Peripheral Vascular modules. Coordinate outreach to avoid duplicate
            patient contact. The primary intervention responsibility may sit with either the interventional
            cardiologist or the vascular surgeon depending on the patient's primary care team.
          </p>
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
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs font-semibold text-indigo-600">{'\u2B21'} Discovery — Net new patients · Never previously identified</span>
                    </div>
                  )}
                  <div className="font-semibold text-titanium-900 text-base">{gap.name}</div>
                  {gap.whyMissed && (
                    <div className="mt-2 text-xs text-titanium-500 italic flex items-start gap-1.5">
                      <Search className="w-3 h-3 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <span>Why standard systems miss this: {gap.whyMissed}</span>
                    </div>
                  )}
                  <div className="flex gap-6 mt-2">
                    <span className="text-sm text-titanium-600">
                      <span className="font-semibold text-titanium-900">{gap.patientCount}</span> patients
                    </span>
                    <span className="text-sm text-titanium-600">
                      <span className="font-semibold text-green-700">${(gap.dollarOpportunity / 1000000).toFixed(1)}M</span> opportunity
                    </span>
                  </div>
                </div>
                <div className="ml-4 mt-1 flex-shrink-0">
                  {isOpen ? <ChevronUp className="w-5 h-5 text-titanium-500" /> : <ChevronDown className="w-5 h-5 text-titanium-500" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-titanium-200 p-5 space-y-5">
                  {/* Trajectory Summary — Forward-looking */}
                  {(() => {
                    const dist = getPVGapTrajectoryData(gap.id, gap.patientCount, gap.category);
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
                    <Pill className="w-4 h-4 text-medical-arterial-600" />
                    <span className="font-semibold text-medical-arterial-700">Recommended Action:</span>
                    <span className="text-sm font-medium bg-medical-arterial-50 border border-medical-arterial-200 px-3 py-1 rounded-lg text-medical-arterial-800">
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
                                  <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                    {pt.tier}
                                  </span>
                                )}
                                {gap.category === 'Discovery' && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full" title="This patient was not previously flagged in any clinical workflow. TAILRD identified this patient by assembling disconnected signals across care settings.">
                                    <Radio className="w-3 h-3" />
                                    First identified by TAILRD
                                  </span>
                                )}
                                {getPVTrajectoryBadges(gap, pt)}
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
                            {ptOpen && renderPVEnhancedDisplay(gap, pt) && (
                              <div className="px-4">
                                {renderPVEnhancedDisplay(gap, pt)}
                              </div>
                            )}
                            {ptOpen && renderPVPredictiveDetail(gap, pt) && (
                              <div className="px-4">
                                {renderPVPredictiveDetail(gap, pt)}
                              </div>
                            )}
                            {ptOpen && gap.whyTailrd && (
                              <div className="px-4">
                                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mt-2">
                                  <p className="text-xs font-semibold text-indigo-700 mb-1">Why TAILRD identified this patient:</p>
                                  <p className="text-sm text-indigo-600">{gap.whyTailrd}</p>
                                </div>
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

export default PVClinicalGapDetectionDashboard;
