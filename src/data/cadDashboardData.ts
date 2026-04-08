/**
 * CAD Clinical Gap Detection Dashboard — Static Patient Data
 * Extracted from CADClinicalGapDetectionDashboard.tsx to reduce component size.
 * Do not modify gap data here — it is sourced from clinical validation.
 */

import type { CADGapPatient } from '../ui/coronaryIntervention/components/clinical/CADClinicalGapDetectionDashboard';

// ============================================================
// GAP 9: SGLT2i FOR CKD
// ============================================================
export const ckdSGLT2iPatients: CADGapPatient[] = [
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
export const compassPatients: CADGapPatient[] = [
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
export const pcsk9Patients: CADGapPatient[] = [
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
export const cardiacRehabPatientsCAD: CADGapPatient[] = [
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
export const lpaPatients: CADGapPatient[] = [
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
export const sglt2iUnderdosingPatients: CADGapPatient[] = [
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
export const stableAnginaPatients: CADGapPatient[] = [
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
export const ranolazinePatients: CADGapPatient[] = [
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
export const postACSStatinPatients: CADGapPatient[] = [
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
export const carotidPatientsCAD: CADGapPatient[] = [
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
export const cinPatients: CADGapPatient[] = [
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
export const medReconciliationPatients: CADGapPatient[] = [
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
export const colchicinePatients: CADGapPatient[] = [
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
