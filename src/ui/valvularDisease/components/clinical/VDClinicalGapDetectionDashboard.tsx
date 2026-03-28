import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, DollarSign, Users, ChevronDown, ChevronUp, Target, Heart, Stethoscope, TrendingUp, Zap, Info, Search, Radio, FileText } from 'lucide-react';
import { computeTrajectory, computeTimeHorizon, projectASProgression, projectBAVProgression, trajectoryDisplay, timeHorizonDisplay, formatDollar, type TrajectoryResult, type TrajectoryDistribution } from '../../../../utils/predictiveCalculators';

// ============================================================
// CLINICAL GAP DETECTION &mdash; VALVULAR DISEASE MODULE
// Gaps: VD-1 (Moderate AS Surveillance), VD-2 (Post-TAVR Echo),
//       VD-3 (Rheumatic MS Warfarin), VD-4 (BAV Aortopathy),
//       VD-5 (Endocarditis Prophylaxis), VD-6 (HALT Screening),
//       VD-22 (Valve-Sparing Root David), VD-23 (Sutureless AVR Small Annulus),
//       VD-24 (Concomitant Tricuspid Annuloplasty), VD-25 (Min-Invasive Valve),
//       VD-26 (Redo Sternotomy Risk), VD-27 (Post-Bio AVR AC),
//       VD-28 (Pre-Op BB POAF Prevention), VD-29 (Prosthetic Valve Thrombosis),
//       VD-30 (PVE 2023 ESC Surgical Timing), VD-31 (Rheumatic HD Surveillance),
//       VD-32 (Transcatheter Pulmonary Valve)
// ============================================================

export interface VDClinicalGap {
  id: string;
  name: string;
  category: 'Gap' | 'Growth' | 'Safety' | 'Quality' | 'Discovery';
  safetyNote?: string;
  patientCount: number;
  dollarOpportunity: number;
  evidence: string;
  cta: string;
  priority: 'high' | 'medium' | 'low';
  detectionCriteria: string[];
  patients: VDGapPatient[];
  subcategories?: { label: string; count: number }[];
  ctaMap?: Record<string, string>;
  tag?: string;
  whyMissed?: string;
  whyTailrd?: string;
  methodologyNote?: string;
  crossModule?: string;
}

export interface VDGapPatient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  signals: string[];
  keyValues: Record<string, string | number>;
  subflag?: string;
}

// ============================================================
// GAP VD-1: MODERATE AS SURVEILLANCE ECHO OVERDUE
// ============================================================
const moderateASSurveillancePatients: VDGapPatient[] = [
  {
    id: 'VD-MAS-001',
    name: 'Theodore Blackwood',
    mrn: 'MRN-VD-10101',
    age: 74,
    signals: [
      'Moderate AS on echo 28 months ago: Vmax 3.4 m/s, mean gradient 28 mmHg',
      'No follow-up echo in 28 months',
      'Possible progression to severe &mdash; EARLY TAVR criteria may now be met',
    ],
    keyValues: {
      'Last Echo': '28 months ago',
      'Mean Gradient': '28 mmHg',
      'AVA': '1.2 cm2',
      'Vmax': 3.7,
      'Prior Vmax': 3.35,
      'Vmax Date': '2026-01-15',
      'Prior Vmax Date': '2025-04-15',
      'LV Function': 'Normal (LVEF 60%)',
      'Symptoms': 'Mildly symptomatic',
    },
  },
  {
    id: 'VD-MAS-002',
    name: 'Gloria Sampson',
    mrn: 'MRN-VD-10102',
    age: 68,
    signals: [
      'Moderate AS: Vmax 3.1 m/s on echo 14 months ago',
      'Annual echo recommended &mdash; not performed',
      'Asymptomatic &mdash; surveillance especially important to detect symptom onset',
    ],
    keyValues: {
      'Last Echo': '14 months ago',
      'Mean Gradient': '22 mmHg',
      'AVA': '1.4 cm2',
      'Vmax': '3.1 m/s',
      'LV Function': 'Normal (LVEF 62%)',
      'Symptoms': 'Asymptomatic',
    },
  },
  {
    id: 'VD-MAS-003',
    name: 'Franklin Osborne',
    mrn: 'MRN-VD-10103',
    age: 80,
    signals: [
      'Moderate AS: Vmax 3.7 m/s &mdash; high end of moderate, near severe threshold',
      'Last echo 18 months ago &mdash; overdue',
      'Age 80 + Vmax 3.7: high probability of crossing Vmax 4.0 threshold',
    ],
    keyValues: {
      'Last Echo': '18 months ago',
      'Mean Gradient': '36 mmHg',
      'AVA': '1.05 cm2',
      'Vmax': 3.5,
      'Prior Vmax': 3.2,
      'Vmax Date': '2026-02-01',
      'Prior Vmax Date': '2025-05-01',
      'LV Function': 'Normal (LVEF 58%)',
      'Symptoms': 'Exertional dyspnea (mild)',
    },
  },
  {
    id: 'VD-MAS-004',
    name: 'Harriet Lindgren',
    mrn: 'MRN-VD-10104',
    age: 71,
    signals: [
      'Moderate AS: Vmax 3.5 m/s on echo 22 months ago',
      'No surveillance echo scheduled',
      'BMI 34 &mdash; symptoms may be masked by deconditioning',
    ],
    keyValues: {
      'Last Echo': '22 months ago',
      'Mean Gradient': '30 mmHg',
      'AVA': '1.15 cm2',
      'Vmax': 3.5,
      'Prior Vmax': 3.2,
      'Vmax Date': '2025-07-01',
      'LV Function': 'Normal (LVEF 55%)',
      'Symptoms': 'Deconditioned &mdash; may mask AS symptoms',
    },
  },
  {
    id: 'VD-MAS-005',
    name: 'Reginald Holcomb',
    mrn: 'MRN-VD-10105',
    age: 76,
    signals: [
      'Moderate AS: Vmax 3.3 m/s on echo 16 months ago',
      'Concurrent moderate MR &mdash; accelerates LV remodeling',
      'Surveillance overdue by 4 months',
    ],
    keyValues: {
      'Last Echo': '16 months ago',
      'Mean Gradient': '26 mmHg',
      'AVA': '1.3 cm2',
      'Vmax': '3.3 m/s',
      'LV Function': 'Low normal (LVEF 52%)',
      'Symptoms': 'Fatigue on exertion',
    },
  },
];

// ============================================================
// GAP VD-2: POST-TAVR 30-DAY ECHO NOT PERFORMED
// ============================================================
const postTAVREchoPatients: VDGapPatient[] = [
  {
    id: 'VD-TAVR-001',
    name: 'Irene Whitmore',
    mrn: 'MRN-VD-20201',
    age: 81,
    signals: [
      'TAVR (SAPIEN 3) 35 days ago &mdash; no post-TAVR echo performed',
      'VARC-3: 30-day echo is standard outcome measure',
      'Post-TAVR gradient and PVL not assessed',
      'TVT Registry quality metric not met',
    ],
    keyValues: {
      'TAVR Date': '35 days ago',
      'Valve Type': 'SAPIEN 3 (23mm)',
      'Post-TAVR Echo': 'Not performed',
      'VARC-3 Compliance': 'Non-compliant',
      'TVT Registry': 'Quality metric gap',
      'Current Status': 'Alive, no complications',
    },
  },
  {
    id: 'VD-TAVR-002',
    name: 'Alvin Mackenzie',
    mrn: 'MRN-VD-20202',
    age: 77,
    signals: [
      'TAVR (EVOLUT R) 55 days ago &mdash; no follow-up echo',
      'No post-procedural gradient assessment',
      'PVL not evaluated &mdash; >=mild PVL is adverse outcome predictor',
      'LVEF recovery post-TAVR not documented',
    ],
    keyValues: {
      'TAVR Date': '55 days ago',
      'Valve Type': 'EVOLUT R (29mm)',
      'Post-TAVR Echo': 'Not scheduled',
      'PVL Assessment': 'Not performed',
      'LVEF Recovery': 'Not documented',
      'TVT Registry': 'Quality gap',
    },
  },
  {
    id: 'VD-TAVR-003',
    name: 'Margaret Yuen',
    mrn: 'MRN-VD-20203',
    age: 84,
    signals: [
      'TAVR 22 days ago &mdash; in 30-day window, echo not yet scheduled',
      'High-risk TAVR candidate: bicuspid aortic valve + calcification',
      'Post-TAVR echo especially important in complex cases',
      'VARC-3: 30-day outcomes require echo documentation',
    ],
    keyValues: {
      'TAVR Date': '22 days ago',
      'Complexity': 'Bicuspid + heavy calcification',
      'Post-TAVR Echo': 'Not scheduled',
      'VARC-3 Window': '30 days &mdash; 8 days remaining',
      'Quality Metric': 'At risk of non-compliance',
      'Valve Type': 'SAPIEN 3 (26mm)',
    },
  },
  {
    id: 'VD-TAVR-004',
    name: 'Bernard Fitzsimmons',
    mrn: 'MRN-VD-20204',
    age: 79,
    signals: [
      'TAVR (CoreValve Evolut PRO+) 42 days ago &mdash; echo overdue',
      'Intra-procedural moderate PVL noted &mdash; requires follow-up assessment',
      'Post-TAVR echo critical for PVL monitoring',
    ],
    keyValues: {
      'TAVR Date': '42 days ago',
      'Valve Type': 'Evolut PRO+ (26mm)',
      'Post-TAVR Echo': 'Not performed',
      'Intra-Procedural PVL': 'Moderate &mdash; follow-up critical',
      'TVT Registry': 'Quality gap',
      'Current Status': 'Alive, mild dyspnea',
    },
  },
];

// ============================================================
// GAP VD-3: RHEUMATIC MS NOT ON WARFARIN
// ============================================================
const rheumaticMSWarfarinPatients: VDGapPatient[] = [
  {
    id: 'VD-RMS-001',
    name: 'Amelia Subramaniam',
    mrn: 'MRN-VD-30301',
    age: 62,
    signals: [
      'Rheumatic MS (I05.0) + AF &mdash; CHA2DS2-VASc 5',
      'On apixaban 5mg BID &mdash; DOAC not appropriate for rheumatic MS',
      'INVICTUS: rivaroxaban HR 1.65 vs warfarin &mdash; DOAC associated with higher mortality',
      'Must switch to warfarin &mdash; target TTR >65%',
    ],
    keyValues: {
      'Diagnosis': 'Rheumatic MS (I05.0) + AF',
      'Current AC': 'Apixaban 5mg BID &mdash; INAPPROPRIATE',
      'CHA2DS2-VASc': '5',
      'INVICTUS Finding': 'DOAC: RR 1.65 for mortality',
      'Required': 'Warfarin &mdash; target TTR >65%',
      'MVA': '1.2 cm2 (moderate-severe MS)',
    },
  },
  {
    id: 'VD-RMS-002',
    name: 'Priscilla Augustin',
    mrn: 'MRN-VD-30302',
    age: 55,
    signals: [
      'Rheumatic MS &mdash; mitral valve area 0.9 cm2 (severe)',
      'Sinus rhythm, CHA2DS2-VASc 3 &mdash; anticoagulation indicated',
      'On rivaroxaban 20mg &mdash; INVICTUS: inferior to warfarin in this population',
      'Warfarin required &mdash; Class I regardless of rhythm in rheumatic MS',
    ],
    keyValues: {
      'Diagnosis': 'Rheumatic MS (severe)',
      'MVA': '0.9 cm2',
      'Rhythm': 'Sinus',
      'Current AC': 'Rivaroxaban 20mg &mdash; INAPPROPRIATE',
      'CHA2DS2-VASc': '3',
      'Required': 'Warfarin (Class I for rheumatic MS)',
    },
  },
  {
    id: 'VD-RMS-003',
    name: 'Fatima Osei-Bonsu',
    mrn: 'MRN-VD-30303',
    age: 48,
    signals: [
      'Rheumatic MS (I05.0) &mdash; on no anticoagulation despite CHA2DS2-VASc 4',
      'Stroke risk without anticoagulation: high in rheumatic MS + CHA2DS2-VASc >=2',
      'Class I: warfarin (not DOAC) for rheumatic MS + CHA2DS2-VASc >=2',
    ],
    keyValues: {
      'Diagnosis': 'Rheumatic MS (I05.0)',
      'CHA2DS2-VASc': '4',
      'Current AC': 'None &mdash; undertreated',
      'MVA': '1.1 cm2',
      'Rhythm': 'AF',
      'Required': 'Warfarin initiation',
    },
  },
  {
    id: 'VD-RMS-004',
    name: 'Lucinda Barrera',
    mrn: 'MRN-VD-30304',
    age: 59,
    signals: [
      'Rheumatic MS + mechanical mitral valve &mdash; on edoxaban 60mg',
      'DOAC absolutely contraindicated with mechanical valve',
      'Warfarin target INR 2.5-3.5 for mechanical mitral valve',
    ],
    keyValues: {
      'Diagnosis': 'Rheumatic MS + Mechanical MVR',
      'Current AC': 'Edoxaban 60mg &mdash; CONTRAINDICATED',
      'CHA2DS2-VASc': '4',
      'Valve Type': 'Mechanical mitral prosthesis',
      'Required': 'Warfarin &mdash; INR 2.5-3.5',
      'MVA': 'Post-MVR',
    },
  },
];

// ============================================================
// GAP VD-4: BAV AORTOPATHY SURVEILLANCE OVERDUE
// ============================================================
const bavAortopathyPatients: VDGapPatient[] = [
  {
    id: 'VD-BAV-001',
    name: 'Christopher Dunbar',
    mrn: 'MRN-VD-40401',
    age: 42,
    signals: [
      'BAV (Q23.0) &mdash; aortic root 4.6cm on last echo 2.5 years ago',
      'URGENT: >=4.5cm requires annual imaging',
      'No imaging in 2.5 years &mdash; possible progression to intervention threshold',
      'Dissection risk 8x general population',
    ],
    keyValues: {
      'BAV Diagnosis': 'Q23.0 confirmed',
      'Last Aortic Measurement': '4.6cm (2.5 years ago)',
      'Aortic Root': 4.6,
      'Prior Aortic Root': 4.3,
      'Aortic Root Date': '2025-05-01',
      'Imaging Frequency': 'Annual required (>=4.5cm)',
      'Last Imaging': '2.5 years ago &mdash; OVERDUE',
      'Intervention Threshold': '5.5cm (or 5.0cm with risk factors)',
      'Priority': 'URGENT',
    },
  },
  {
    id: 'VD-BAV-002',
    name: 'Rebecca Halvorsen',
    mrn: 'MRN-VD-40402',
    age: 35,
    signals: [
      'BAV with known aortopathy &mdash; ascending aorta 4.1cm (3 years ago)',
      'No follow-up imaging in 3 years',
      '2-year surveillance indicated &mdash; overdue by 1 year',
      'Family history of aortic dissection',
    ],
    keyValues: {
      'BAV Diagnosis': 'Q23.0',
      'Last Aortic Measurement': '4.1cm (3 years ago)',
      'Family History': 'Aortic dissection (sibling)',
      'Last Imaging': '3 years ago',
      'Recommended Frequency': 'Every 2 years (or annual given family history)',
      'Priority': 'HIGH',
    },
  },
  {
    id: 'VD-BAV-003',
    name: 'Nathan Forsythe',
    mrn: 'MRN-VD-40403',
    age: 48,
    signals: [
      'BAV &mdash; aortic root 4.8cm on last imaging 2 years ago',
      'URGENT: >=4.5cm + 2 years without imaging',
      'Rapid growth possible &mdash; may now be approaching 5.0-5.5cm range',
      'Elective surgery indicated at >=5.5cm (or 5.0 with risk factors)',
    ],
    keyValues: {
      'BAV Diagnosis': 'Q23.0',
      'Last Aortic Measurement': '4.8cm (2 years ago)',
      'Aortic Root': 4.8,
      'Prior Aortic Root': 4.5,
      'Aortic Root Date': '2025-05-01',
      'Current Estimated Range': '5.0-5.3cm (possible)',
      'Last Imaging': '2 years ago',
      'Intervention Threshold': '5.5cm (or 5.0cm + risk factors)',
      'Priority': 'URGENT',
    },
  },
  {
    id: 'VD-BAV-004',
    name: 'Daniela Ramos',
    mrn: 'MRN-VD-40404',
    age: 38,
    signals: [
      'BAV (Q23.0) &mdash; ascending aorta 4.3cm on MRA 2.5 years ago',
      'No follow-up aortic imaging since initial measurement',
      'Planning pregnancy &mdash; aortic imaging critical before conception',
    ],
    keyValues: {
      'BAV Diagnosis': 'Q23.0',
      'Last Aortic Measurement': '4.3cm (2.5 years ago)',
      'Pregnancy Planning': 'Active &mdash; imaging critical',
      'Last Imaging': '2.5 years ago',
      'Recommended Frequency': 'Annual (pregnancy planning)',
      'Priority': 'HIGH',
    },
  },
  {
    id: 'VD-BAV-005',
    name: 'Malcolm Everett',
    mrn: 'MRN-VD-40405',
    age: 52,
    signals: [
      'BAV with moderate AI &mdash; aortic root 4.4cm on CT 3 years ago',
      'No aortic imaging in 3 years',
      'Moderate AI may accelerate aortic dilation',
    ],
    keyValues: {
      'BAV Diagnosis': 'Q23.0 + Moderate AI',
      'Last Aortic Measurement': '4.4cm (3 years ago)',
      'Aortic Root': 4.4,
      'Prior Aortic Root': 4.1,
      'Aortic Root Date': '2025-05-01',
      'Valve Function': 'Moderate aortic insufficiency',
      'Last Imaging': '3 years ago',
      'Recommended Frequency': 'Every 1-2 years',
      'Priority': 'HIGH',
    },
  },
];

// ============================================================
// GAP VD-5: ENDOCARDITIS PROPHYLAXIS NOT DOCUMENTED
// ============================================================
const endocarditisProphylaxisPatients: VDGapPatient[] = [
  {
    id: 'VD-IE-001',
    name: 'Dorothy Stafford',
    mrn: 'MRN-VD-50501',
    age: 72,
    signals: [
      'Prosthetic aortic valve (Z95.2) &mdash; TAVR 3 years ago',
      'Dental visit 4 months ago &mdash; no prophylaxis protocol in chart',
      'AHA: highest-risk category &mdash; prophylaxis required before dental procedures',
      'Amoxicillin 2g PO 30-60 min before dental: standard regimen',
    ],
    keyValues: {
      'Condition': 'Prosthetic aortic valve (TAVR)',
      'Risk Category': 'Highest (AHA)',
      'Dental Visit': '4 months ago',
      'Prophylaxis Protocol': 'Not documented',
      'Required Regimen': 'Amoxicillin 2g PO pre-procedure',
      'IE Risk Without Prophylaxis': 'High',
    },
  },
  {
    id: 'VD-IE-002',
    name: 'Roland Adeyemi',
    mrn: 'MRN-VD-50502',
    age: 58,
    signals: [
      'Prior infective endocarditis (I33.0) &mdash; 5 years ago',
      'Dental cleanings x2 in past 12 months &mdash; no prophylaxis noted',
      'Prior IE: highest-risk category per AHA guidelines',
      'No allergy to penicillin &mdash; amoxicillin 2g regimen indicated',
    ],
    keyValues: {
      'Condition': 'Prior IE (I33.0)',
      'Risk Category': 'Highest (AHA)',
      'Dental Visits': '2 in past 12 months',
      'Prophylaxis Protocol': 'Not documented',
      'Penicillin Allergy': 'No',
      'Required Regimen': 'Amoxicillin 2g PO',
    },
  },
  {
    id: 'VD-IE-003',
    name: 'Sylvia Okafor',
    mrn: 'MRN-VD-50503',
    age: 45,
    signals: [
      'Prosthetic mitral valve (Z95.3) &mdash; surgical MVR 8 years ago',
      'Dental extraction 6 months ago &mdash; no pre-procedure prophylaxis documented',
      'Highest-risk category: mechanical prosthetic valve',
      'Clindamycin no longer recommended (C. diff risk) &mdash; use cephalexin if penicillin allergy',
    ],
    keyValues: {
      'Condition': 'Prosthetic mitral valve (mechanical MVR)',
      'Risk Category': 'Highest (AHA)',
      'Dental Extraction': '6 months ago',
      'Prophylaxis': 'Not documented',
      'Penicillin Allergy': 'Yes &mdash; cephalexin 2g alternative',
      'Required Regimen': 'Cephalexin 2g (penicillin allergy)',
    },
  },
  {
    id: 'VD-IE-004',
    name: 'Marcus Ellington',
    mrn: 'MRN-VD-50504',
    age: 34,
    signals: [
      'Complex CHD (Q21.0 &mdash; repaired VSD with residual shunt)',
      'Dental visit 2 months ago without documented prophylaxis',
      'AHA: complex CHD with residual defects requires prophylaxis',
    ],
    keyValues: {
      'Condition': 'Repaired VSD with residual shunt',
      'Risk Category': 'High (AHA &mdash; complex CHD)',
      'Dental Visit': '2 months ago',
      'Prophylaxis Protocol': 'Not documented',
      'Required Regimen': 'Amoxicillin 2g PO',
      'ICD Code': 'Q21.0',
    },
  },
  {
    id: 'VD-IE-005',
    name: 'Wanda Nakamura',
    mrn: 'MRN-VD-50505',
    age: 66,
    signals: [
      'Cardiac transplant recipient with moderate MR (valvulopathy)',
      'Multiple dental visits in past year &mdash; no prophylaxis documented',
      'AHA 2021: cardiac transplant with valvulopathy = highest risk',
    ],
    keyValues: {
      'Condition': 'Heart transplant + valvulopathy',
      'Risk Category': 'Highest (AHA)',
      'Dental Visits': '3 in past 12 months',
      'Prophylaxis Protocol': 'Not documented',
      'Valve Finding': 'Moderate MR post-transplant',
      'Required Regimen': 'Amoxicillin 2g PO pre-procedure',
    },
  },
];

// ============================================================
// GAP VD-6: SUBCLINICAL LEAFLET THROMBOSIS POST-TAVR (HALT)
// ============================================================
const haltScreeningPatients: VDGapPatient[] = [
  {
    id: 'VD-HALT-001',
    name: 'Clarence Pemberton',
    mrn: 'MRN-VD-60601',
    age: 78,
    signals: [
      'TAVR 8 months ago &mdash; new TIA symptoms (transient aphasia, resolved)',
      'No post-TAVR CT performed to evaluate leaflet thickening',
      'HALT present in 10-15% of TAVR patients &mdash; resolves with anticoagulation',
      'Neurologic symptoms in post-TAVR patient: HALT must be ruled out',
    ],
    keyValues: {
      'TAVR Date': '8 months ago',
      'Valve Type': 'SAPIEN 3',
      'Neurologic Event': 'TIA &mdash; transient aphasia',
      'CT Assessment': 'Not performed',
      'Current AC': 'Aspirin + Clopidogrel (DAPT)',
      'HALT Risk': 'High &mdash; neurologic symptoms',
    },
  },
  {
    id: 'VD-HALT-002',
    name: 'Estelle Drummond',
    mrn: 'MRN-VD-60602',
    age: 82,
    signals: [
      'TAVR (EVOLUT R) 6 months ago &mdash; new visual disturbance (amaurosis fugax)',
      'Post-TAVR CT not performed',
      'Rising mean gradient on echo (from 8 to 16 mmHg) &mdash; possible HALT',
      'Hypoattenuated leaflet thickening treatable with anticoagulation',
    ],
    keyValues: {
      'TAVR Date': '6 months ago',
      'Valve Type': 'EVOLUT R (29mm)',
      'Neurologic Event': 'Amaurosis fugax',
      'Mean Gradient Change': '8 to 16 mmHg (rising)',
      'CT Assessment': 'Not performed',
      'Current AC': 'Aspirin only',
    },
  },
  {
    id: 'VD-HALT-003',
    name: 'Wendell Chandra',
    mrn: 'MRN-VD-60603',
    age: 75,
    signals: [
      'TAVR 10 months ago &mdash; new mild cognitive complaints',
      'Echo shows increased transvalvular gradient (10 to 18 mmHg)',
      'No CT assessment for subclinical leaflet thrombosis',
      'HALT may explain both rising gradient and cognitive symptoms',
    ],
    keyValues: {
      'TAVR Date': '10 months ago',
      'Valve Type': 'SAPIEN 3 (26mm)',
      'Neurologic Complaints': 'Mild cognitive changes',
      'Gradient Change': '10 to 18 mmHg (rising)',
      'CT Assessment': 'Not performed',
      'Current AC': 'Aspirin + Clopidogrel',
    },
  },
  {
    id: 'VD-HALT-004',
    name: 'Mireille Fontaine',
    mrn: 'MRN-VD-60604',
    age: 80,
    signals: [
      'TAVR (CoreValve Evolut PRO+) 4 months ago',
      'New-onset dizziness and brief syncopal episode',
      'Echo gradient stable but leaflet motion not assessed by CT',
      'HALT screening indicated per emerging consensus guidelines',
    ],
    keyValues: {
      'TAVR Date': '4 months ago',
      'Valve Type': 'Evolut PRO+ (29mm)',
      'Neurologic Event': 'Dizziness + near-syncope',
      'Echo Gradient': 'Stable at 12 mmHg',
      'CT Assessment': 'Not performed',
      'Current AC': 'Aspirin only',
    },
  },
];

// ============================================================
// GAP VD-7: SEVERE AS NOT REFERRED FOR INTERVENTION
// ============================================================
const severeASNotReferredPatients: VDGapPatient[] = [
  {
    id: 'VD-SAS-001',
    name: 'Harold Bergstrom',
    mrn: 'VD-70701',
    age: 79,
    signals: [
      'Severe AS: AVA 0.8 cm2, mean gradient 48 mmHg, Vmax 4.3 m/s',
      'LVEF declined from 60% to 45% over 12 months',
      'No TAVR or SAVR referral in 9 months despite symptoms',
    ],
    keyValues: {
      'AVA': '0.8 cm2',
      'Mean Gradient': '48 mmHg',
      'Vmax': '4.3 m/s',
      'LVEF': '45% (was 60%)',
      'Symptoms': 'Exertional dyspnea, NYHA III',
      'Last Echo': '3 months ago',
      'Referral Status': 'No TAVR/SAVR referral',
    },
  },
  {
    id: 'VD-SAS-002',
    name: 'Vivian Caldwell',
    mrn: 'VD-70702',
    age: 83,
    signals: [
      'Severe AS: AVA 0.7 cm2, mean gradient 52 mmHg',
      'Two HF admissions in past 6 months',
      'Not referred for TAVR evaluation despite Class I indication',
    ],
    keyValues: {
      'AVA': '0.7 cm2',
      'Mean Gradient': '52 mmHg',
      'Vmax': '4.6 m/s',
      'LVEF': '40%',
      'HF Admissions': '2 in 6 months',
      'Symptoms': 'Dyspnea at rest, NYHA III-IV',
      'Referral Status': 'None',
    },
  },
  {
    id: 'VD-SAS-003',
    name: 'Eugene Whitfield',
    mrn: 'VD-70703',
    age: 72,
    signals: [
      'Severe AS: AVA 0.9 cm2, mean gradient 44 mmHg',
      'Symptomatic with syncope on exertion',
      'Cardiology follow-up but no heart team referral for 8 months',
    ],
    keyValues: {
      'AVA': '0.9 cm2',
      'Mean Gradient': '44 mmHg',
      'Vmax': '4.1 m/s',
      'LVEF': '55%',
      'Symptoms': 'Exertional syncope',
      'STS Risk': '3.2%',
      'Referral Status': 'No heart team referral',
    },
  },
  {
    id: 'VD-SAS-004',
    name: 'Dolores Ramirez',
    mrn: 'VD-70704',
    age: 88,
    signals: [
      'Severe AS: AVA 0.6 cm2, mean gradient 55 mmHg',
      'Presumed too frail without formal frailty assessment',
      'No TAVR evaluation despite potential benefit in super-elderly',
    ],
    keyValues: {
      'AVA': '0.6 cm2',
      'Mean Gradient': '55 mmHg',
      'Vmax': '4.8 m/s',
      'LVEF': '50%',
      'Symptoms': 'Dyspnea, fatigue, NYHA III',
      'Frailty Assessment': 'Not performed',
      'Referral Status': 'None &mdash; assumed inoperable',
    },
  },
];

// ============================================================
// GAP VD-8: MITRAL REPAIR RATE BELOW BENCHMARK
// ============================================================
const mitralRepairRatePatients: VDGapPatient[] = [
  {
    id: 'VD-MRR-001',
    name: 'Patricia Thornton',
    mrn: 'VD-80801',
    age: 62,
    signals: [
      'Degenerative MR &mdash; posterior leaflet prolapse (P2 segment)',
      'Received mitral valve replacement instead of repair',
      'No annular calcification &mdash; repair feasibility high',
    ],
    keyValues: {
      'MR Etiology': 'Degenerative &mdash; posterior leaflet prolapse (P2)',
      'Procedure': 'MVR (bioprosthetic)',
      'Calcification': 'None',
      'Repair Feasibility': 'High &mdash; isolated posterior leaflet',
      'Benchmark': 'Repair rate should be >=95% for P2 prolapse',
      'Surgeon Volume': '12 MV cases/year',
    },
  },
  {
    id: 'VD-MRR-002',
    name: 'Leonard Ashford',
    mrn: 'VD-80802',
    age: 58,
    signals: [
      'Degenerative MR &mdash; isolated P2 flail with ruptured chordae',
      'Mitral valve replaced with mechanical prosthesis',
      'Classic repair anatomy per Carpentier classification',
    ],
    keyValues: {
      'MR Etiology': 'Degenerative &mdash; P2 flail, ruptured chordae',
      'Procedure': 'MVR (mechanical)',
      'Calcification': 'Minimal',
      'Repair Feasibility': 'High &mdash; Carpentier Type II',
      'Benchmark': 'Reference centers achieve >95% repair',
      'Patient Age': '58 &mdash; mechanical valve requires lifelong anticoagulation',
    },
  },
  {
    id: 'VD-MRR-003',
    name: 'Sandra Kovacs',
    mrn: 'VD-80803',
    age: 55,
    signals: [
      'Degenerative MR &mdash; bileaflet prolapse, no calcification',
      'MVR performed at low-volume center',
      'Repair feasible at experienced reference center',
    ],
    keyValues: {
      'MR Etiology': 'Degenerative &mdash; bileaflet prolapse',
      'Procedure': 'MVR (bioprosthetic)',
      'Calcification': 'None',
      'Center Volume': 'Low (&lt;25 MV cases/year)',
      'Benchmark': 'Repair recommended at reference center',
      'Outcome': 'Satisfactory but suboptimal &mdash; repair preferred',
    },
  },
];

// ============================================================
// GAP VD-9: SEVERE TR NOT ASSESSED FOR TRANSCATHETER INTERVENTION
// ============================================================
const severeTRNotAssessedPatients: VDGapPatient[] = [
  {
    id: 'VD-TR-001',
    name: 'Mildred Johansson',
    mrn: 'VD-90901',
    age: 74,
    signals: [
      'Severe tricuspid regurgitation on echo (vena contracta 9mm)',
      'Recurrent HF admissions x3 in 12 months',
      'Not referred for TriClip/TEER evaluation',
    ],
    keyValues: {
      'TR Severity': 'Severe (vena contracta 9mm, EROA 0.55 cm2)',
      'RV Function': 'TAPSE 14mm (reduced)',
      'HF Admissions': '3 in 12 months',
      'Diuretic Dose': 'Furosemide 80mg BID',
      'Prior Cardiac Surgery': 'MVR 8 years ago',
      'TEER Assessment': 'Not performed',
    },
  },
  {
    id: 'VD-TR-002',
    name: 'Clifford Nguyen',
    mrn: 'VD-90902',
    age: 69,
    signals: [
      'Moderate-severe functional TR with RV dilation',
      'Progressive peripheral edema and ascites despite GDMT',
      'TRILUMINATE Pivotal eligible &mdash; not screened',
    ],
    keyValues: {
      'TR Severity': 'Moderate-severe (functional)',
      'RV Function': 'TAPSE 15mm, RV dilated',
      'Symptoms': 'Peripheral edema, ascites, NYHA III',
      'GDMT': 'Maximized',
      'TEER Assessment': 'Not performed',
      'Prior Intervention': 'None',
    },
  },
  {
    id: 'VD-TR-003',
    name: 'Beatrice Hoffman',
    mrn: 'VD-90903',
    age: 78,
    signals: [
      'Severe TR with hepatic congestion (elevated bilirubin, INR)',
      'Cardiorenal syndrome &mdash; Cr rising from 1.2 to 2.1',
      'Transcatheter tricuspid intervention not considered',
    ],
    keyValues: {
      'TR Severity': 'Severe (massive)',
      'RV Function': 'TAPSE 12mm (severely reduced)',
      'Hepatic Congestion': 'Bilirubin 3.2, INR 1.8',
      'Renal Function': 'Cr 2.1 (was 1.2)',
      'HF Admissions': '4 in 12 months',
      'TEER Assessment': 'Not performed',
    },
  },
  {
    id: 'VD-TR-004',
    name: 'Arthur Delacroix',
    mrn: 'VD-90904',
    age: 71,
    signals: [
      'Severe TR post-pacemaker lead with tethered septal leaflet',
      'Progressive RV failure, recurrent pleural effusions',
      'Not assessed for transcatheter tricuspid repair',
    ],
    keyValues: {
      'TR Severity': 'Severe (lead-related)',
      'Mechanism': 'Pacemaker lead tethering septal leaflet',
      'RV Function': 'TAPSE 13mm',
      'Symptoms': 'Recurrent pleural effusions, NYHA III',
      'TEER Assessment': 'Not performed',
      'Device': 'Dual-chamber PPM (implanted 6 years ago)',
    },
  },
];

// ============================================================
// GAP VD-10: FAILING BIOPROSTHETIC VALVE &mdash; VALVE-IN-VALVE TAVR NOT CONSIDERED
// ============================================================
const failingBioprostheticPatients: VDGapPatient[] = [
  {
    id: 'VD-VIV-001',
    name: 'Raymond Kowalski',
    mrn: 'VD-11001',
    age: 76,
    signals: [
      'Bioprosthetic AVR 11 years ago &mdash; rising gradients (mean 38 mmHg)',
      'New moderate aortic regurgitation through bioprosthesis',
      'Not evaluated for valve-in-valve TAVR',
    ],
    keyValues: {
      'Original Surgery': 'SAVR (21mm bioprosthetic) 11 years ago',
      'Current Mean Gradient': '38 mmHg (was 12 mmHg post-op)',
      'New AI': 'Moderate (through prosthesis)',
      'LVEF': '50% (declining)',
      'STS Redo Risk': '8.2%',
      'VIV-TAVR Assessment': 'Not performed',
    },
  },
  {
    id: 'VD-VIV-002',
    name: 'Constance Petrov',
    mrn: 'VD-11002',
    age: 81,
    signals: [
      'Bioprosthetic AVR 13 years ago &mdash; severe SVD with mean gradient 48 mmHg',
      'Symptomatic with dyspnea NYHA III',
      'High surgical risk for redo &mdash; VIV-TAVR ideal candidate',
    ],
    keyValues: {
      'Original Surgery': 'SAVR (23mm Carpentier-Edwards) 13 years ago',
      'Current Mean Gradient': '48 mmHg',
      'Symptoms': 'Dyspnea NYHA III',
      'STS Redo Risk': '11.4%',
      'LVEF': '45%',
      'VIV-TAVR Assessment': 'Not performed',
    },
  },
  {
    id: 'VD-VIV-003',
    name: 'Frederick Hansen',
    mrn: 'VD-11003',
    age: 73,
    signals: [
      'Bioprosthetic AVR 9 years ago &mdash; new severe AI through leaflet tear',
      'Acute decompensation with pulmonary edema',
      'Urgent VIV-TAVR evaluation needed',
    ],
    keyValues: {
      'Original Surgery': 'SAVR (25mm bioprosthetic) 9 years ago',
      'Current Finding': 'Severe AI through leaflet tear',
      'Presentation': 'Acute pulmonary edema',
      'LVEF': '35%',
      'STS Redo Risk': '9.6%',
      'VIV-TAVR Assessment': 'Not performed',
    },
  },
];

// ============================================================
// GAP VD-11: CONCOMITANT AF + VALVE SURGERY &mdash; MAZE NOT OFFERED
// ============================================================
const concomitantAFMazePatients: VDGapPatient[] = [
  {
    id: 'VD-MAZ-001',
    name: 'Geraldine Buchanan',
    mrn: 'VD-11101',
    age: 68,
    signals: [
      'Persistent AF x3 years prior to elective MVR',
      'No concomitant surgical ablation (Cox-Maze) performed',
      'STS guidelines: Class I for concomitant Maze with valve surgery + AF',
    ],
    keyValues: {
      'Valve Surgery': 'MVR (bioprosthetic)',
      'AF Duration': '3 years (persistent)',
      'Maze Performed': 'No',
      'LAAC Performed': 'No',
      'AF Type': 'Persistent',
      'CHA2DS2-VASc': '4',
    },
  },
  {
    id: 'VD-MAZ-002',
    name: 'Walter Erikson',
    mrn: 'VD-11102',
    age: 71,
    signals: [
      'Long-standing persistent AF &mdash; underwent elective SAVR',
      'No Maze or LAAC performed despite AF documentation',
      'Post-op: remains in AF, on lifelong anticoagulation',
    ],
    keyValues: {
      'Valve Surgery': 'SAVR (bioprosthetic)',
      'AF Duration': '5 years (long-standing persistent)',
      'Maze Performed': 'No',
      'LAAC Performed': 'No',
      'Post-Op Rhythm': 'AF',
      'CHA2DS2-VASc': '5',
    },
  },
  {
    id: 'VD-MAZ-003',
    name: 'Lorraine Thibault',
    mrn: 'VD-11103',
    age: 65,
    signals: [
      'Paroxysmal AF &mdash; underwent elective MV repair',
      'No concomitant ablation despite documented AF episodes',
      'STS data: Maze adds 15 min to case with 60-70% freedom from AF',
    ],
    keyValues: {
      'Valve Surgery': 'MV repair (degenerative MR)',
      'AF Type': 'Paroxysmal',
      'Maze Performed': 'No',
      'LAAC Performed': 'No',
      'AF Episodes': '12 in past year',
      'CHA2DS2-VASc': '3',
    },
  },
  {
    id: 'VD-MAZ-004',
    name: 'Douglas Kimura',
    mrn: 'VD-11104',
    age: 74,
    signals: [
      'Persistent AF + elective AVR + MVR (double valve)',
      'No concomitant Maze or LAAC despite Class I indication',
      'High stroke risk post-op without ablation',
    ],
    keyValues: {
      'Valve Surgery': 'AVR + MVR (double valve)',
      'AF Duration': '4 years (persistent)',
      'Maze Performed': 'No',
      'LAAC Performed': 'No',
      'CHA2DS2-VASc': '6',
      'Post-Op Rhythm': 'AF',
    },
  },
];

// ============================================================
// GAP VD-12: TAVR VS SAVR HEART TEAM DISCUSSION NOT DOCUMENTED
// ============================================================
const heartTeamDocPatients: VDGapPatient[] = [
  {
    id: 'VD-HTD-001',
    name: 'Josephine Andersson',
    mrn: 'VD-11201',
    age: 73,
    signals: [
      'Severe AS, STS risk 4.8% &mdash; intermediate risk',
      'TAVR performed without documented heart team discussion',
      'ACC/AHA Class I: heart team required for intermediate risk',
    ],
    keyValues: {
      'STS Risk': '4.8% (intermediate)',
      'Procedure': 'TAVR (SAPIEN 3)',
      'Heart Team Documentation': 'Not found',
      'TVT Registry': 'Non-compliant',
      'Age': '73',
      'Comorbidities': 'DM, CKD stage 3',
    },
  },
  {
    id: 'VD-HTD-002',
    name: 'Robert Castellano',
    mrn: 'VD-11202',
    age: 67,
    signals: [
      'Severe AS, STS risk 3.5% &mdash; low-intermediate',
      'SAVR performed without documented heart team discussion',
      'PARTNER 3 shows TAVR non-inferior &mdash; patient should have had choice',
    ],
    keyValues: {
      'STS Risk': '3.5% (low-intermediate)',
      'Procedure': 'SAVR',
      'Heart Team Documentation': 'Not found',
      'TVT Registry': 'N/A (surgical)',
      'Age': '67',
      'Anatomy': 'Tricuspid aortic valve',
    },
  },
  {
    id: 'VD-HTD-003',
    name: 'Helen Okonkwo',
    mrn: 'VD-11203',
    age: 76,
    signals: [
      'Severe AS, STS risk 6.2% &mdash; intermediate risk',
      'TAVR performed &mdash; heart team note absent from chart',
      'Required for ACC TVT Registry quality compliance',
    ],
    keyValues: {
      'STS Risk': '6.2% (intermediate)',
      'Procedure': 'TAVR (Evolut PRO+)',
      'Heart Team Documentation': 'Absent',
      'TVT Registry': 'Quality gap',
      'Age': '76',
      'Comorbidities': 'Prior CABG, COPD',
    },
  },
];

// ============================================================
// GAP VD-13: PATIENT-PROSTHESIS MISMATCH POST-VALVE SURGERY
// ============================================================
const prosthesisMismatchPatients: VDGapPatient[] = [
  {
    id: 'VD-PPM-001',
    name: 'Bernard Magnusson',
    mrn: 'VD-11301',
    age: 64,
    signals: [
      'Post-SAVR: indexed EOA 0.78 cm2/m2 (severe PPM)',
      'BSA 2.1 m2 with 19mm bioprosthesis &mdash; size mismatch',
      'Not flagged for enhanced surveillance',
    ],
    keyValues: {
      'Indexed EOA': '0.78 cm2/m2 (severe PPM)',
      'BSA': '2.1 m2',
      'Valve Size': '19mm bioprosthetic',
      'Mean Gradient': '28 mmHg (elevated)',
      'LVEF': '52%',
      'Surveillance Plan': 'Not documented',
    },
  },
  {
    id: 'VD-PPM-002',
    name: 'Ingrid Svensson',
    mrn: 'VD-11302',
    age: 59,
    signals: [
      'Post-SAVR: indexed EOA 0.62 cm2/m2 (critical PPM)',
      'BSA 2.3 m2 with 21mm bioprosthesis',
      'Persistent dyspnea post-operatively &mdash; PPM not considered',
    ],
    keyValues: {
      'Indexed EOA': '0.62 cm2/m2 (critical PPM)',
      'BSA': '2.3 m2',
      'Valve Size': '21mm bioprosthetic',
      'Mean Gradient': '32 mmHg (elevated)',
      'Symptoms': 'Persistent dyspnea post-op',
      'Surveillance Plan': 'Not documented',
    },
  },
  {
    id: 'VD-PPM-003',
    name: 'Thomas Villarreal',
    mrn: 'VD-11303',
    age: 71,
    signals: [
      'Post-SAVR: indexed EOA 0.82 cm2/m2 (moderate-severe PPM)',
      'Small aortic root &mdash; 21mm prosthesis in BSA 2.0 m2',
      'No hemodynamic assessment ordered',
    ],
    keyValues: {
      'Indexed EOA': '0.82 cm2/m2 (moderate-severe PPM)',
      'BSA': '2.0 m2',
      'Valve Size': '21mm bioprosthetic',
      'Mean Gradient': '24 mmHg',
      'LVEF': '55%',
      'Hemodynamic Assessment': 'Not ordered',
    },
  },
];

// ============================================================
// GAP VD-14: AORTIC ROOT ENLARGEMENT IN SEVERE AS
// ============================================================
const aorticRootEnlargementPatients: VDGapPatient[] = [
  {
    id: 'VD-ARE-001',
    name: 'Philip Gustafson',
    mrn: 'VD-11401',
    age: 69,
    signals: [
      'Severe AS scheduled for isolated SAVR',
      'Pre-op CT shows aortic root 4.7cm &mdash; above intervention threshold',
      'No discussion of concurrent root replacement (Bentall)',
    ],
    keyValues: {
      'AS Severity': 'Severe (AVA 0.8 cm2)',
      'Planned Procedure': 'Isolated SAVR',
      'Aortic Root': '4.7cm',
      'CT Aortography': 'Performed &mdash; root dilation noted',
      'Root Replacement Discussion': 'Not documented',
      'BSA': '1.9 m2',
    },
  },
  {
    id: 'VD-ARE-002',
    name: 'Catherine Morales',
    mrn: 'VD-11402',
    age: 65,
    signals: [
      'Severe AS + ascending aortic aneurysm 4.8cm',
      'Scheduled for isolated SAVR without root assessment',
      'Reoperation risk for future root surgery avoided by concurrent repair',
    ],
    keyValues: {
      'AS Severity': 'Severe (AVA 0.9 cm2)',
      'Planned Procedure': 'Isolated SAVR',
      'Ascending Aorta': '4.8cm',
      'CT Aortography': 'Not ordered pre-op',
      'Root Replacement Discussion': 'Not documented',
      'Family History': 'Brother with aortic dissection',
    },
  },
  {
    id: 'VD-ARE-003',
    name: 'Edward Blackstone',
    mrn: 'VD-11403',
    age: 72,
    signals: [
      'BAV with severe AS &mdash; aortic root 4.6cm on last echo',
      'Referred for isolated SAVR &mdash; root not addressed',
      'BAV aortopathy: lower threshold (4.5cm) for concurrent intervention',
    ],
    keyValues: {
      'AS Severity': 'Severe (AVA 0.7 cm2)',
      'Valve Morphology': 'Bicuspid (BAV)',
      'Aortic Root': '4.6cm',
      'Planned Procedure': 'Isolated SAVR',
      'BAV Threshold': '4.5cm for concurrent root surgery',
      'Root Replacement Discussion': 'Not documented',
    },
  },
];

// ============================================================
// GAP VD-15: MECHANICAL VALVE INR NOT IN THERAPEUTIC RANGE
// ============================================================
const mechanicalValveINRPatients: VDGapPatient[] = [
  {
    id: 'VD-INR-001',
    name: 'Martha Henriksen',
    mrn: 'VD-11501',
    age: 61,
    signals: [
      'Mechanical mitral valve &mdash; INR 1.6 (target 2.5-3.5)',
      'Subtherapeutic for >45 days',
      'Thromboembolic risk 2-4x increased at INR <2.0',
    ],
    keyValues: {
      'Valve Type': 'Mechanical mitral (St. Jude)',
      'Target INR': '2.5-3.5',
      'Current INR': '1.6 (subtherapeutic)',
      'Days Out of Range': '45',
      'Last INR Check': '12 days ago',
      'Stroke Risk': 'Elevated (2-4x baseline)',
    },
  },
  {
    id: 'VD-INR-002',
    name: 'Anthony Volkov',
    mrn: 'VD-11502',
    age: 55,
    signals: [
      'Mechanical aortic valve &mdash; INR 4.8 (target 2.0-3.0)',
      'Supratherapeutic for 30 days &mdash; bleeding risk doubled',
      'Recent epistaxis and gingival bleeding',
    ],
    keyValues: {
      'Valve Type': 'Mechanical aortic (On-X)',
      'Target INR': '2.0-3.0',
      'Current INR': '4.8 (supratherapeutic)',
      'Days Out of Range': '30',
      'Bleeding Symptoms': 'Epistaxis, gingival bleeding',
      'Hemorrhage Risk': 'Doubled',
    },
  },
  {
    id: 'VD-INR-003',
    name: 'Rosa Gutierrez',
    mrn: 'VD-11503',
    age: 48,
    signals: [
      'Mechanical mitral + aortic valves &mdash; INR 1.4 (critically subtherapeutic)',
      'No INR check in 6 weeks',
      'Double mechanical: highest thrombotic risk category',
    ],
    keyValues: {
      'Valve Type': 'Double mechanical (mitral + aortic)',
      'Target INR': '2.5-3.5',
      'Current INR': '1.4 (critically subtherapeutic)',
      'Days Out of Range': '42',
      'Last INR Check': '6 weeks ago',
      'Thrombotic Risk': 'Critical &mdash; double mechanical',
    },
  },
  {
    id: 'VD-INR-004',
    name: 'Chester Yamamoto',
    mrn: 'VD-11504',
    age: 67,
    signals: [
      'Mechanical aortic valve &mdash; INR 1.8 (below target 2.0-3.0)',
      'Recently started amiodarone &mdash; warfarin interaction likely',
      'INR trending down without dose adjustment',
    ],
    keyValues: {
      'Valve Type': 'Mechanical aortic (Medtronic Hall)',
      'Target INR': '2.0-3.0',
      'Current INR': '1.8 (subtherapeutic)',
      'New Medication': 'Amiodarone (started 3 weeks ago)',
      'Drug Interaction': 'Warfarin-amiodarone interaction',
      'Dose Adjustment': 'Not performed',
    },
  },
];

// ============================================================
// GAP VD-16: SEVERE MR &mdash; TEER ELIGIBILITY NOT ASSESSED
// ============================================================
const severeMRTEERPatients: VDGapPatient[] = [
  {
    id: 'VD-TEER-001',
    name: 'Eleanor Prescott',
    mrn: 'VD-11601',
    age: 72,
    signals: [
      'Severe secondary MR (EROA 0.4 cm2) with HFrEF (LVEF 30%)',
      'On maximized GDMT &mdash; persistent NYHA III symptoms',
      'COAPT-eligible profile &mdash; not referred for TEER',
    ],
    keyValues: {
      'MR Severity': 'Severe secondary (EROA 0.4 cm2)',
      'LVEF': '30%',
      'LVEDV': '220 mL',
      'GDMT Status': 'Maximized (sacubitril/valsartan, carvedilol, MRA)',
      'NYHA Class': 'III',
      'TEER Assessment': 'Not performed',
    },
  },
  {
    id: 'VD-TEER-002',
    name: 'Warren Blackwell',
    mrn: 'VD-11602',
    age: 68,
    signals: [
      'Severe primary MR (flail posterior leaflet) &mdash; surgical risk prohibitive',
      'STS predicted mortality 9.4% &mdash; TEER preferred',
      'Not referred to structural heart team',
    ],
    keyValues: {
      'MR Severity': 'Severe primary (flail P2)',
      'STS Risk': '9.4% (high)',
      'LVEF': '45%',
      'Symptoms': 'Dyspnea, NYHA III',
      'Comorbidities': 'Prior sternotomy, COPD, CKD',
      'TEER Assessment': 'Not performed',
    },
  },
  {
    id: 'VD-TEER-003',
    name: 'Nadine Beaumont',
    mrn: 'VD-11603',
    age: 77,
    signals: [
      'Severe secondary MR with recurrent HF admissions x4/year',
      'LVEF 25%, LVEDV 195 mL &mdash; within COAPT criteria',
      'Guideline-directed: screen for TEER when GDMT insufficient',
    ],
    keyValues: {
      'MR Severity': 'Severe secondary (EROA 0.35 cm2)',
      'LVEF': '25%',
      'LVEDV': '195 mL',
      'HF Admissions': '4 in 12 months',
      'GDMT Status': 'Maximized + CRT',
      'TEER Assessment': 'Not performed',
    },
  },
  {
    id: 'VD-TEER-004',
    name: 'Cecil Drummond',
    mrn: 'VD-11604',
    age: 81,
    signals: [
      'Severe MR (mixed etiology) &mdash; declining functional status',
      'Too frail for surgery per cardiac surgeon assessment',
      'TEER candidacy not evaluated despite guideline recommendation',
    ],
    keyValues: {
      'MR Severity': 'Severe (mixed &mdash; degenerative + functional)',
      'LVEF': '35%',
      'Frailty': 'Present (5-meter walk >7 seconds)',
      'Surgical Risk': 'Prohibitive per surgeon',
      'Symptoms': 'Dyspnea, fatigue, NYHA III-IV',
      'TEER Assessment': 'Not performed',
    },
  },
];

// ============================================================
// GAP VD-17: PROSTHETIC VALVE ENDOCARDITIS &mdash; DELAYED SURGICAL CONSULTATION
// ============================================================
const pveDelayedConsultPatients: VDGapPatient[] = [
  {
    id: 'VD-PVE-001',
    name: 'Reginald Sinclair',
    mrn: 'VD-11701',
    age: 70,
    signals: [
      'Prosthetic aortic valve endocarditis confirmed (blood cultures + TEE)',
      'Surgical consultation not obtained within 48 hours',
      'ESC guidelines: early surgical consultation reduces PVE mortality from 40% to <20%',
    ],
    keyValues: {
      'Diagnosis': 'PVE &mdash; bioprosthetic aortic valve',
      'Organism': 'Staphylococcus aureus',
      'TEE Findings': 'Vegetation 12mm, perivalvular abscess',
      'Surgical Consult': 'Not obtained (Day 5 of admission)',
      'Antibiotics Started': 'Day 1',
      'Mortality Risk': '40% without surgery vs <20% with early surgery',
    },
  },
  {
    id: 'VD-PVE-002',
    name: 'Yolanda Mbeki',
    mrn: 'VD-11702',
    age: 63,
    signals: [
      'Mechanical mitral valve endocarditis &mdash; new paravalvular leak',
      'Surgical consultation delayed >72 hours',
      'New heart failure symptoms &mdash; urgent surgical indication',
    ],
    keyValues: {
      'Diagnosis': 'PVE &mdash; mechanical mitral valve',
      'Organism': 'Enterococcus faecalis',
      'TEE Findings': 'New paravalvular leak, vegetation 8mm',
      'Surgical Consult': 'Delayed >72 hours',
      'New HF Symptoms': 'Pulmonary edema',
      'Guideline': 'ESC 2023: urgent surgery for PVE + HF',
    },
  },
  {
    id: 'VD-PVE-003',
    name: 'Maxwell Fontaine',
    mrn: 'VD-11703',
    age: 75,
    signals: [
      'TAVR prosthesis endocarditis &mdash; persistent bacteremia day 4',
      'No surgical consultation despite persistent positive cultures',
      'Persistent bacteremia >5 days is Class I surgical indication',
    ],
    keyValues: {
      'Diagnosis': 'PVE &mdash; TAVR prosthesis',
      'Organism': 'MRSA',
      'Bacteremia Duration': 'Persistent day 4',
      'Surgical Consult': 'Not obtained',
      'TEE Findings': 'Vegetation on TAVR leaflet 10mm',
      'Guideline': 'Class I for surgery with persistent bacteremia >5 days',
    },
  },
];

// ============================================================
// GAP VD-18: POST-TAVR PACEMAKER NEED NOT ANTICIPATED
// ============================================================
const postTAVRPacemakerPatients: VDGapPatient[] = [
  {
    id: 'VD-PPM-A001',
    name: 'Stanley Nordstrom',
    mrn: 'VD-11801',
    age: 80,
    signals: [
      'Pre-TAVR RBBB present &mdash; strongest predictor of post-TAVR PPM (OR 4.5)',
      'Self-expanding valve used &mdash; higher PPM rate',
      'New CHB day 3 post-TAVR requiring emergency PPM',
    ],
    keyValues: {
      'Pre-TAVR ECG': 'RBBB (right bundle branch block)',
      'Valve Type': 'Evolut PRO+ (self-expanding)',
      'Post-TAVR Event': 'Complete heart block day 3',
      'PPM Implanted': 'Yes (emergency)',
      'Pre-Op Risk Flag': 'Not flagged',
      'Extra Hospital Days': '4 (unplanned)',
    },
  },
  {
    id: 'VD-PPM-A002',
    name: 'Lucille Carmichael',
    mrn: 'VD-11802',
    age: 77,
    signals: [
      'Pre-TAVR first-degree AVB (PR 280ms) + left axis deviation',
      'Post-TAVR new LBBB progressing to high-grade AVB',
      'Conduction risk factors not flagged pre-procedurally',
    ],
    keyValues: {
      'Pre-TAVR ECG': 'First-degree AVB (PR 280ms), LAD',
      'Valve Type': 'SAPIEN 3 (26mm)',
      'Post-TAVR Event': 'New LBBB then high-grade AVB',
      'PPM Implanted': 'Yes (day 5)',
      'Pre-Op Risk Flag': 'Not flagged',
      'Extra Hospital Days': '3 (unplanned)',
    },
  },
  {
    id: 'VD-PPM-A003',
    name: 'Virgil Townsend',
    mrn: 'VD-11803',
    age: 84,
    signals: [
      'Pre-TAVR RBBB + first-degree AVB &mdash; very high PPM risk',
      'No EP standby arranged despite dual conduction risk factors',
      'Post-TAVR complete heart block requiring urgent PPM',
    ],
    keyValues: {
      'Pre-TAVR ECG': 'RBBB + first-degree AVB',
      'Valve Type': 'Evolut R (29mm, self-expanding)',
      'Post-TAVR Event': 'CHB requiring urgent PPM',
      'PPM Implanted': 'Yes (emergency day 1)',
      'EP Standby': 'Not arranged',
      'Pre-Op Risk Flag': 'Not flagged despite dual risk factors',
    },
  },
];

// ============================================================
// GAP VD-19: BIOPROSTHETIC VALVE SURVEILLANCE OVERDUE (>5 YEARS)
// ============================================================
const bioprostheticSurveillancePatients: VDGapPatient[] = [
  {
    id: 'VD-BVS-001',
    name: 'Dorothy Lindqvist',
    mrn: 'VD-11901',
    age: 73,
    signals: [
      'Bioprosthetic AVR 7 years ago &mdash; no echo in 18 months',
      'SVD typically begins 7-10 years post-implant',
      'Annual surveillance recommended after year 5',
    ],
    keyValues: {
      'Valve Type': 'Bioprosthetic AVR (23mm Magna Ease)',
      'Years Since Implant': '7',
      'Last Echo': '18 months ago',
      'Last Gradient': '14 mmHg (was 10 post-op)',
      'Surveillance Status': 'Overdue',
      'SVD Risk Window': 'Entering high-risk period',
    },
  },
  {
    id: 'VD-BVS-002',
    name: 'Kenneth Okafor',
    mrn: 'VD-11902',
    age: 68,
    signals: [
      'Bioprosthetic MVR 8 years ago &mdash; last echo 2 years ago',
      'Mitral bioprosthesis: higher SVD rate than aortic',
      'No surveillance protocol in chart',
    ],
    keyValues: {
      'Valve Type': 'Bioprosthetic MVR (27mm)',
      'Years Since Implant': '8',
      'Last Echo': '24 months ago',
      'Last Finding': 'Mild prosthetic MR',
      'Surveillance Status': 'Overdue by 12 months',
      'SVD Risk': 'Higher for mitral position',
    },
  },
  {
    id: 'VD-BVS-003',
    name: 'Miriam Stefanovic',
    mrn: 'VD-11903',
    age: 78,
    signals: [
      'Bioprosthetic AVR 10 years ago &mdash; no echo in 14 months',
      '10-year mark: peak SVD incidence period',
      'May need VIV-TAVR planning if SVD detected',
    ],
    keyValues: {
      'Valve Type': 'Bioprosthetic AVR (21mm)',
      'Years Since Implant': '10',
      'Last Echo': '14 months ago',
      'Last Gradient': '18 mmHg (rising from 10 post-op)',
      'Surveillance Status': 'Overdue',
      'SVD Risk': 'Peak risk period (10-year mark)',
    },
  },
  {
    id: 'VD-BVS-004',
    name: 'Lawrence Pemberton',
    mrn: 'VD-11904',
    age: 82,
    signals: [
      'Bioprosthetic AVR 12 years ago &mdash; no echo in 20 months',
      'Beyond expected valve lifespan &mdash; SVD likely present',
      'Needs urgent assessment for potential VIV-TAVR',
    ],
    keyValues: {
      'Valve Type': 'Bioprosthetic AVR (23mm Carpentier-Edwards)',
      'Years Since Implant': '12',
      'Last Echo': '20 months ago',
      'Last Gradient': '22 mmHg',
      'Surveillance Status': 'Critically overdue',
      'Expected Valve Life': '10-15 years &mdash; at 12 years',
    },
  },
];

// ============================================================
// GAP VD-20: TMVR CANDIDACY NOT SCREENED
// ============================================================
const tmvrCandidacyPatients: VDGapPatient[] = [
  {
    id: 'VD-TMVR-001',
    name: 'Isabelle Fournier',
    mrn: 'VD-12001',
    age: 79,
    signals: [
      'Severe MR &mdash; failed MitraClip (residual severe MR)',
      'Not surgical candidate (STS 12.3%)',
      'Not assessed for TMVR trial or compassionate use',
    ],
    keyValues: {
      'MR Severity': 'Severe (residual post-TEER)',
      'Prior TEER': 'Failed (residual severe MR)',
      'STS Risk': '12.3% (prohibitive)',
      'LVEF': '30%',
      'Symptoms': 'Refractory HF, NYHA IV',
      'TMVR Assessment': 'Not performed',
    },
  },
  {
    id: 'VD-TMVR-002',
    name: 'Gerald Hawthorne',
    mrn: 'VD-12002',
    age: 75,
    signals: [
      'Severe MR with MAC (mitral annular calcification) &mdash; TEER anatomy unfavorable',
      'Surgical risk prohibitive due to porcelain aorta',
      'TMVR may be only viable option',
    ],
    keyValues: {
      'MR Severity': 'Severe with MAC',
      'TEER Feasibility': 'Unfavorable (MAC, short posterior leaflet)',
      'Surgical Risk': 'Prohibitive (porcelain aorta)',
      'LVEF': '40%',
      'Symptoms': 'Dyspnea, recurrent HF admissions',
      'TMVR Assessment': 'Not performed',
    },
  },
  {
    id: 'VD-TMVR-003',
    name: 'Simone Abernathy',
    mrn: 'VD-12003',
    age: 82,
    signals: [
      'Severe MR &mdash; TEER attempted but aborted (too wide gap, multiple jets)',
      'No surgical option (frail, prior sternotomy x2)',
      'Potential TMVR candidate &mdash; not evaluated',
    ],
    keyValues: {
      'MR Severity': 'Severe (wide coaptation gap)',
      'Prior TEER Attempt': 'Aborted (anatomy unfavorable)',
      'Prior Sternotomies': '2',
      'Frailty': 'Present',
      'LVEF': '35%',
      'TMVR Assessment': 'Not performed',
    },
  },
];

// ============================================================
// GAP VD-21: AS + CAD &mdash; COMBINED VS STAGED STRATEGY NOT DOCUMENTED
// ============================================================
const asCADStrategyPatients: VDGapPatient[] = [
  {
    id: 'VD-ACS-001',
    name: 'Norman Kirkpatrick',
    mrn: 'VD-12101',
    age: 74,
    signals: [
      'Severe AS + 3-vessel CAD (SYNTAX 28)',
      'Referred for TAVR without documented discussion of combined vs staged approach',
      'PCI + TAVR vs SAVR + CABG: requires heart team input based on SYNTAX score',
    ],
    keyValues: {
      'AS Severity': 'Severe (AVA 0.8 cm2)',
      'CAD': '3-vessel (SYNTAX 28)',
      'Planned Approach': 'TAVR (PCI not discussed)',
      'Heart Team Discussion': 'Not documented',
      'STS Risk': '4.5%',
      'Strategy Documentation': 'Absent',
    },
  },
  {
    id: 'VD-ACS-002',
    name: 'Marguerite Dupont',
    mrn: 'VD-12102',
    age: 69,
    signals: [
      'Severe AS + LAD + RCA disease (SYNTAX 22)',
      'Scheduled for SAVR without discussion of concomitant CABG',
      'Combined approach avoids second procedure',
    ],
    keyValues: {
      'AS Severity': 'Severe (AVA 0.9 cm2)',
      'CAD': '2-vessel (LAD + RCA, SYNTAX 22)',
      'Planned Approach': 'Isolated SAVR',
      'CABG Discussion': 'Not documented',
      'STS Risk': '3.8%',
      'Strategy Documentation': 'Absent',
    },
  },
  {
    id: 'VD-ACS-003',
    name: 'Herbert Morrison',
    mrn: 'VD-12103',
    age: 78,
    signals: [
      'Severe AS + complex LAD bifurcation lesion + RCA CTO',
      'TAVR planned &mdash; no PCI strategy discussed',
      'High SYNTAX score warrants SAVR + CABG consideration',
    ],
    keyValues: {
      'AS Severity': 'Severe (AVA 0.7 cm2)',
      'CAD': 'Complex (SYNTAX 34 &mdash; high)',
      'Planned Approach': 'TAVR only',
      'PCI Discussion': 'Not documented',
      'STS Risk': '5.2%',
      'Strategy Documentation': 'Absent',
    },
  },
  {
    id: 'VD-ACS-004',
    name: 'Audrey Chen',
    mrn: 'VD-12104',
    age: 71,
    signals: [
      'Severe AS + significant LAD stenosis (90%)',
      'Staged TAVR then PCI planned without heart team documentation',
      'Combined TAVR+PCI vs staged: procedural risk considerations undocumented',
    ],
    keyValues: {
      'AS Severity': 'Severe (AVA 0.85 cm2)',
      'CAD': 'Significant LAD stenosis (90%)',
      'Planned Approach': 'Staged TAVR then PCI',
      'Heart Team Discussion': 'Not documented',
      'STS Risk': '3.1%',
      'Strategy Documentation': 'Absent &mdash; staging rationale not recorded',
    },
  },
];

// ============================================================
// MASTER GAP DATA
// ============================================================
export const VD_CLINICAL_GAPS: VDClinicalGap[] = [
  {
    id: 'vd-gap-1-moderate-as-surveillance',
    name: 'Moderate AS Surveillance Echo Overdue',
    category: 'Quality',
    patientCount: 94,
    dollarOpportunity: 29610,
    priority: 'high',
    subcategories: [
      { label: 'Last echo >2 years ago &mdash; HIGH PRIORITY (possible progression to severe)', count: 47 },
      { label: 'Last echo 12-24 months ago &mdash; surveillance due', count: 47 },
    ],
    evidence:
      'ACC/AHA 2020 VHD Guidelines recommend echocardiographic surveillance every 1-2 years for moderate AS to detect progression to severe disease. Moderate AS progression: 0.1-0.3 m/s/year increase in Vmax. 30-50% progress from moderate to severe within 5 years.',
    cta: 'Order Surveillance Echocardiogram',
    detectionCriteria: [
      'Moderate AS on prior echo (Vmax 3.0-3.9 m/s OR mean gradient 20-39 mmHg OR AVA 1.0-1.5 cm2)',
      'No follow-up echo in past 12 months',
      'No TAVR or SAVR performed',
    ],
    patients: moderateASSurveillancePatients,
    whyMissed: 'Moderate AS surveillance requires tracking echo intervals against disease severity — known patients whose monitoring schedule is not systematically enforced.',
    whyTailrd: 'TAILRD connected moderate AS diagnosis with echo surveillance timing to identify this overdue progression monitoring.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 380 TAVR/year x 2.5 moderate AS in surveillance = 950. 28% overdue at any point = 94. Dollar opportunity: echo $450 x 70% completion x 94 = $29,610. ACC/AHA 2020 surveillance. 0.1-0.3 m/s/year Vmax progression rate.',
  },
  {
    id: 'vd-gap-2-post-tavr-echo',
    name: 'Post-TAVR 30-Day Echo Not Performed',
    category: 'Quality',
    patientCount: 27,
    dollarOpportunity: 8505,
    priority: 'high',
    tag: 'Quality Gap | VARC-3 | TVT Registry',
    evidence:
      'ACC/AHA guidelines recommend echocardiographic assessment within 30 days post-TAVR to evaluate prosthetic valve function, paravalvular leak, and LVOT obstruction. VARC-3 outcomes definition requires post-procedure echo. STS/ACC TVT Registry: 30-day echo completion is a quality metric for TAVR programs.',
    cta: 'Schedule Post-TAVR Echo',
    detectionCriteria: [
      'TAVR (CPT 33361-33369) in past 90 days',
      'No echo after TAVR procedure date',
      'Patient alive and not re-hospitalized for TAVR complication',
    ],
    patients: postTAVREchoPatients,
    whyMissed: 'Post-TAVR echo scheduling falls between structural heart proceduralists and outpatient follow-up — a process gap in post-procedural care transitions.',
    whyTailrd: 'TAILRD connected TAVR procedure date with absence of 30-day post-TAVR echo to flag this post-procedural surveillance gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 380 TAVR/year x 7% missing 30-day echo = 27. Dollar opportunity: echo $450 x 70% completion x 27 = $8,505. VARC-3 / TVT Registry quality metrics.',
  },
  {
    id: 'vd-gap-3-rheumatic-ms-warfarin',
    name: 'Rheumatic Mitral Stenosis &mdash; DOAC Contraindicated',
    category: 'Safety',
    patientCount: 22,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'INVICTUS | Warfarin Required',
    safetyNote:
      'CRITICAL: DOAC use in rheumatic MS associated with increased mortality. INVICTUS trial (2022): DOACs showed HIGHER mortality vs. warfarin in rheumatic heart disease (RR 1.65). Warfarin remains standard of care for rheumatic MS.',
    evidence:
      'INVICTUS trial (2022): DOACs showed HIGHER mortality vs. warfarin in rheumatic heart disease (RR 1.65). Warfarin remains standard of care for rheumatic MS. Class I for CHA2DS2-VASc >=2 regardless of rhythm. Target TTR >65%.',
    cta: 'Switch to Warfarin &mdash; DOAC Contraindicated per INVICTUS',
    detectionCriteria: [
      'Rheumatic MS (I05.0) AND CHA2DS2-VASc >=2',
      'NOT on warfarin',
      'On DOAC (flag specifically &mdash; DOACs not validated for rheumatic MS) OR on no anticoagulation',
    ],
    patients: rheumaticMSWarfarinPatients,
    whyMissed: 'Rheumatic MS anticoagulation requires connecting valve diagnosis with current anticoagulant — DOAC prescribing is default but contraindicated in rheumatic MS.',
    whyTailrd: 'TAILRD connected rheumatic mitral stenosis diagnosis with current anticoagulation type to detect inappropriate DOAC use requiring warfarin.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 4,000 valve panel x 0.8% rheumatic MS (I05.0) x CHA2DS2-VASc >=2 x 70% not on warfarin = 22. Dollar opportunity: $0 direct revenue. Safety gap — warfarin required, DOACs contraindicated. INVICTUS trial (2022). Diverse metro population.',
  },
  {
    id: 'vd-gap-4-bav-aortopathy',
    name: 'BAV Aortopathy Surveillance Overdue',
    category: 'Quality',
    patientCount: 36,
    dollarOpportunity: 20160,
    priority: 'high',
    subcategories: [
      { label: 'Prior aortic measurement >=4.5cm &mdash; URGENT (annual imaging required)', count: 12 },
      { label: 'Prior measurement <4.5cm &mdash; surveillance overdue', count: 38 },
    ],
    evidence:
      'ACC/AHA 2022 guidelines recommend CT or MRA of the aorta at initial diagnosis and surveillance imaging based on aortic dimensions and rate of change. BAV aortopathy affects 50-80% of BAV patients. Intervention thresholds: elective repair >=5.5cm (or >=5.0cm with rapid growth, family history, planned pregnancy).',
    cta: 'Order CT Angiography of Aorta',
    detectionCriteria: [
      'BAV (Q23.0) AND no aortic root or ascending aorta imaging in past 2 years',
      'No prior aortic surgery',
      'Sub-classify by prior aortic dimension: >=4.5cm URGENT vs <4.5cm HIGH',
    ],
    patients: bavAortopathyPatients,
    whyMissed: 'BAV aortopathy surveillance requires connecting valve morphology with serial aortic root dimensions — the aortopathy risk is overlooked when valve function is the primary concern.',
    whyTailrd: 'TAILRD connected bicuspid valve morphology with aortic root dimension tracking to identify overdue aortopathy surveillance imaging.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 4,000 valve panel x 2% BAV (Q23.0) x 60% aortopathy x 15% surveillance gap = 5, plus broader echo database yields ~36. Dollar opportunity: CTA aorta $800 x 70% completion x 36 = $20,160. ACC/AHA 2022 surveillance criteria.',
  },
  {
    id: 'vd-gap-5-endocarditis-prophylaxis',
    name: 'Endocarditis Prophylaxis Not Documented',
    category: 'Quality',
    patientCount: 63,
    dollarOpportunity: 1519845,
    priority: 'medium',
    evidence:
      'AHA 2021 guidelines recommend antibiotic prophylaxis before dental procedures for patients with prosthetic heart valves, prior infective endocarditis, certain congenital heart conditions, or cardiac transplant with valvulopathy. Regimen: amoxicillin 2g PO 30-60 min before dental. Clindamycin no longer recommended (C. diff risk).',
    cta: 'Document Endocarditis Prophylaxis Plan',
    detectionCriteria: [
      'Prosthetic heart valve (Z95.2-Z95.4) OR prior endocarditis (I33.x) OR complex CHD (Q20-Q26) OR cardiac transplant with valvulopathy',
      'No dental prophylaxis protocol documented in chart',
      'Dental visit documented in past 12 months without prophylaxis note',
    ],
    patients: endocarditisProphylaxisPatients,
    whyMissed: 'Endocarditis prophylaxis documentation requires connecting high-risk cardiac conditions with procedural encounters — information across separate clinical systems.',
    whyTailrd: 'TAILRD connected high-risk cardiac condition with absence of documented endocarditis prophylaxis protocol to identify this safety gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 4,000 valve panel x 15% prosthetic valve = 600 x 20% dental visits without prophylaxis doc x 70% identifiable = 63. Dollar opportunity: echo surveillance $450 x 70% completion x 63 = $19,845 + downstream valve monitoring and intervention referrals $72,000 TAVR x 30% x ~70 pipeline patients = $1,500,000. Total ~$1,519,845. AHA 2021 guidelines.',
  },
  {
    id: 'vd-gap-6-halt-screening',
    name: 'Subclinical Leaflet Thrombosis Post-TAVR Not Monitored',
    category: 'Safety',
    patientCount: 31,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'HALT | Post-TAVR Safety',
    safetyNote:
      'HALT (Hypoattenuated Leaflet Thickening) present in 10-15% of TAVR patients. Associated with increased stroke risk. Resolves with anticoagulation in most cases. Missed in most practices.',
    evidence:
      'HALT present in 10-15% of TAVR patients. Hypoattenuated leaflet thickening on CT resolves with anticoagulation. Associated with elevated transvalvular gradients and thromboembolic risk. Missed in most practices. Post-TAVR patients with new neurologic symptoms require CT evaluation.',
    cta: 'Order CT of TAVR Valve for HALT Assessment',
    detectionCriteria: [
      'TAVR performed in past 24 months',
      'New neurologic symptoms (TIA, visual disturbance, cognitive changes) OR rising transvalvular gradient',
      'No post-TAVR CT performed to assess leaflet motion/thickening',
    ],
    patients: haltScreeningPatients,
    whyMissed: 'Subclinical leaflet thrombosis screening requires connecting post-TAVR surveillance with CT imaging protocols — a monitoring step that standard echo-based follow-up doesn\'t address.',
    whyTailrd: 'TAILRD connected post-TAVR status with absence of HALT screening protocol to identify this subclinical thrombosis surveillance gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 380 TAVR/year x 2-year window = 760. HALT prevalence 10-15%. Neurologic symptoms or rising gradients ~6% = 46 x 70% identifiable = 31. Dollar opportunity: $0 direct revenue. Safety gap — CT valve $800 monitoring noted in clinical value only.',
  },
  {
    id: 'vd-gap-7-severe-as-not-referred',
    name: 'Severe AS Not Referred for Intervention',
    category: 'Gap',
    patientCount: 45,
    dollarOpportunity: 972000,
    priority: 'high',
    evidence:
      '2020 ACC/AHA Valve Guidelines (Otto et al, Circulation 2021, PMID 33332149). Class I recommendation for intervention in symptomatic severe AS (AVA <1.0 cm2, mean gradient >40 mmHg). Untreated symptomatic severe AS carries 50% 2-year mortality.',
    cta: 'Refer for Heart Team Evaluation',
    detectionCriteria: [
      'Severe AS on echo (AVA <1.0 cm2 OR mean gradient >40 mmHg OR Vmax >=4.0 m/s)',
      'No TAVR or SAVR referral documented in 6+ months',
      'Symptoms present (dyspnea, syncope, angina) OR declining LVEF (<50%)',
    ],
    patients: severeASNotReferredPatients,
    whyMissed: 'Severe AS patients without explicit referral fall through when follow-up visits are managed by non-valve specialists who may not recognize intervention criteria or assume the patient is already in the pipeline.',
    whyTailrd: 'TAILRD connected severe AS echocardiographic parameters with absence of structural heart referral and symptom burden to identify patients with Class I indication who are not in the intervention pipeline.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 700 total valve interventions/year. For every intervention, ~15% of severe AS patients sit without referral x catchment adjustment = ~45. Dollar opportunity: $72,000 TAVR DRG x 30% conversion x 45 = ~$972K. ACC/AHA 2020 Valve Guidelines.',
    crossModule: 'Heart Failure Module — declining LVEF overlap',
  },
  {
    id: 'vd-gap-8-mitral-repair-rate',
    name: 'Mitral Repair Rate Below Benchmark',
    category: 'Quality',
    patientCount: 18,
    dollarOpportunity: 0,
    priority: 'high',
    evidence:
      'David TE et al, JTCVS 2013 (PMID 23219502): long-term durability of mitral repair superior to replacement. Goldstone AB et al, NEJM 2017 (PMID 28614676): repair associated with superior survival vs replacement in degenerative MR. ACC/STS benchmark: repair rate should be >=95% for degenerative MR at reference centers.',
    cta: 'Review for Repair Feasibility — Consider Referral to Mitral Specialist',
    detectionCriteria: [
      'Mitral valve surgery performed for degenerative MR (posterior leaflet pathology)',
      'Mitral valve replacement performed instead of repair',
      'No annular calcification or complex anterior leaflet pathology that would preclude repair',
    ],
    patients: mitralRepairRatePatients,
    whyMissed: 'Repair vs replacement decision is made intraoperatively at the surgeon level — institutional quality programs rarely retrospectively audit repair rates against national benchmarks for specific pathology types.',
    whyTailrd: 'TAILRD connected operative reports (CPT codes for MVR vs repair) with preoperative echo findings (etiology, leaflet anatomy) to identify cases where repair was feasible but replacement was performed.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 700 valve surgeries x 15% MV x 60% degenerative x 29% replaced instead of repaired (vs benchmark <5%) = ~18. Dollar opportunity: $0 direct revenue — quality gap linked to program reputation, STS star ratings, and referral volume.',
  },
  {
    id: 'vd-gap-9-severe-tr-not-assessed',
    name: 'Severe TR Not Assessed for Transcatheter Intervention',
    category: 'Growth',
    patientCount: 35,
    dollarOpportunity: 385000,
    priority: 'high',
    evidence:
      'TRILUMINATE Pivotal (Lurz et al, NEJM 2024, PMID 38587239). TriClip showed significant reduction in TR severity and improvement in quality of life vs medical therapy at 1 year. FDA-approved for symptomatic severe TR.',
    cta: 'Screen for Transcatheter Tricuspid Intervention Eligibility',
    detectionCriteria: [
      'Moderate-severe or severe tricuspid regurgitation on echo',
      'RV dysfunction (TAPSE <17mm) or recurrent HF admissions',
      'Not referred for transcatheter tricuspid intervention (TriClip/EVOQUE) evaluation',
    ],
    patients: severeTRNotAssessedPatients,
    whyMissed: 'Tricuspid regurgitation has historically been undertreated ("forgotten valve"). Most programs lack a systematic screening pathway for transcatheter TR intervention, and severe TR is often attributed to comorbidities rather than treated as a standalone target.',
    whyTailrd: 'TAILRD connected echo-derived TR severity with HF admission frequency and RV function metrics to identify patients meeting transcatheter TR intervention criteria who were not in the structural heart pipeline.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: HF panel (~8,000) x 4% significant TR x 30% not referred x 35% market share = ~35. Dollar opportunity: $55,000 TEER x 20% conversion (new program) x 35 = ~$385K. TRILUMINATE Pivotal trial.',
  },
  {
    id: 'vd-gap-10-failing-bioprosthetic-viv',
    name: 'Failing Bioprosthetic Valve — Valve-in-Valve TAVR Not Considered',
    category: 'Gap',
    patientCount: 22,
    dollarOpportunity: 475000,
    priority: 'high',
    evidence:
      'Webb JG et al, JACC 2017 (PMID 28279291). Valve-in-valve TAVR feasibility >95% with acceptable mortality in high-risk redo patients. VIVID registry data: 30-day mortality 7.6% for VIV vs 9-12% for redo surgery in high-risk patients.',
    cta: 'Evaluate for Valve-in-Valve TAVR Candidacy',
    detectionCriteria: [
      'Prior bioprosthetic AVR or MVR',
      'Rising transvalvular gradients (mean gradient increase >10 mmHg from baseline) OR new prosthetic regurgitation',
      'No evaluation for valve-in-valve TAVR documented',
    ],
    patients: failingBioprostheticPatients,
    whyMissed: 'Structural valve deterioration develops gradually and rising gradients may be attributed to patient-prosthesis mismatch or technical factors rather than triggering VIV-TAVR evaluation. Many patients are followed by general cardiologists unfamiliar with VIV-TAVR thresholds.',
    whyTailrd: 'TAILRD connected serial echocardiographic gradient trends in bioprosthetic valve patients with time since implant and absence of structural heart referral to identify SVD patients missing VIV-TAVR evaluation.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: estimated aging bioprosthetic population x SVD rate 10-15% at 10 years = ~22 candidates. Dollar opportunity: $72,000 VIV-TAVR DRG x 30% conversion x 22 = ~$475K. Webb et al, JACC 2017.',
  },
  {
    id: 'vd-gap-11-concomitant-af-maze',
    name: 'Concomitant AF + Valve Surgery — Maze Not Offered',
    category: 'Gap',
    patientCount: 40,
    dollarOpportunity: 140000,
    priority: 'high',
    evidence:
      'Badhwar V et al, JTCVS 2017 (PMID 28274557): STS Guidelines recommend concomitant surgical ablation with valve surgery in patients with AF. Class I recommendation. Cox-Maze IV achieves 70-90% freedom from AF at 1 year. LAAC reduces long-term stroke risk.',
    cta: 'Discuss Concomitant Surgical Ablation with Surgical Team',
    detectionCriteria: [
      'Elective valve surgery performed (SAVR, MVR, MV repair)',
      'Pre-operative AF documented (paroxysmal, persistent, or long-standing persistent)',
      'No concomitant surgical ablation (Maze) or left atrial appendage closure performed',
    ],
    patients: concomitantAFMazePatients,
    whyMissed: 'Concomitant Maze is considered an add-on procedure and is frequently omitted when the primary surgical plan focuses on the valve alone. AF documentation may be in cardiology notes but not flagged in the surgical planning workflow.',
    whyTailrd: 'TAILRD connected pre-operative AF diagnosis with valve surgery operative reports to identify patients who underwent valve surgery without concomitant surgical ablation despite Class I indication.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 700 valve surgeries x 25% AF prevalence x 23% Maze non-adoption rate = ~40. Dollar opportunity: $3,500 incremental add-on x 40 = ~$140K. Also significant quality metric for STS reporting. Badhwar et al, JTCVS 2017.',
  },
  {
    id: 'vd-gap-12-heart-team-not-documented',
    name: 'TAVR vs SAVR Heart Team Discussion Not Documented',
    category: 'Quality',
    patientCount: 28,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'TVT Registry | ACC Quality',
    evidence:
      'Leon MB et al, PARTNER 2 (NEJM 2016, PMID 27040324). Mack MJ et al, PARTNER 3 (NEJM 2019, PMID 30883058). Heart team decision-making is Class I recommendation for all intermediate-risk severe AS patients. ACC/STS TVT Registry mandates documented heart team discussion.',
    cta: 'Document Heart Team Discussion in TVT Registry',
    detectionCriteria: [
      'Severe AS with STS risk score 3-8% (intermediate risk)',
      'TAVR or SAVR performed',
      'No documented heart team discussion or multidisciplinary note in chart',
    ],
    patients: heartTeamDocPatients,
    whyMissed: 'Heart team discussions often occur informally (hallway conversations, conferences) without structured documentation. TVT Registry compliance requires explicit documentation that is frequently omitted in busy programs.',
    whyTailrd: 'TAILRD cross-referenced STS risk scores with procedure records and chart notes to identify intermediate-risk patients lacking documented heart team discussion, flagging TVT Registry compliance gaps.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 380 TAVRs x ~20% without documented heart team per national audit data = ~28 (conservative). Dollar opportunity: $0 direct — documentation/quality gap critical for ACC TVT Registry compliance and program accreditation.',
  },
  {
    id: 'vd-gap-13-prosthesis-mismatch',
    name: 'Patient-Prosthesis Mismatch Post-Valve Surgery',
    category: 'Quality',
    patientCount: 15,
    dollarOpportunity: 4725,
    priority: 'medium',
    evidence:
      'Pibarot P, Dumesnil JG, Heart 2006 (PMID 16365364). Severe patient-prosthesis mismatch (indexed EOA <0.85 cm2/m2) associated with increased mortality, impaired functional recovery, and reduced long-term survival. Affects 2-11% of SAVR patients depending on body size and valve selection.',
    cta: 'Flag for Enhanced Echo Surveillance — Consider Hemodynamic Assessment',
    detectionCriteria: [
      'Surgical AVR performed',
      'Post-operative indexed EOA <0.85 cm2/m2 (severe) or <0.65 cm2/m2 (critical)',
      'Not flagged for enhanced surveillance or hemodynamic assessment',
    ],
    patients: prosthesisMismatchPatients,
    whyMissed: 'Patient-prosthesis mismatch requires calculating indexed EOA from post-operative echo and BSA — a computation that is rarely automated in standard echo reporting workflows. Many labs report absolute EOA without indexing.',
    whyTailrd: 'TAILRD calculated indexed EOA from post-SAVR echo measurements and patient BSA data to automatically flag severe and critical patient-prosthesis mismatch requiring enhanced surveillance.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 700 valve surgeries x 30% AVR x 7% severe PPM rate = ~15. Dollar opportunity: $450 echo x 70% completion x 15 = ~$4,725 (quality metric, not revenue driver). Pibarot & Dumesnil, Heart 2006.',
  },
  {
    id: 'vd-gap-14-aortic-root-enlargement',
    name: 'Aortic Root Enlargement in Severe AS — Root Replacement Not Considered',
    category: 'Gap',
    patientCount: 12,
    dollarOpportunity: 162000,
    priority: 'medium',
    evidence:
      'Borger MA et al, JTCVS 2004 (PMID 15457154). Concurrent aortic root replacement recommended when root >=4.5cm at time of AVR to avoid reoperation for progressive aortic dilation. 2020 ACC/AHA guidelines support concomitant aortic repair when root >=4.5cm (>=4.5cm for BAV patients).',
    cta: 'CT Aortography Pre-Op — Evaluate for Root Replacement',
    detectionCriteria: [
      'Severe AS scheduled for or recently underwent isolated SAVR',
      'Aortic root or ascending aorta >=4.5cm on imaging',
      'No documentation of discussion regarding concurrent root replacement (Bentall or David procedure)',
    ],
    patients: aorticRootEnlargementPatients,
    whyMissed: 'Pre-operative aortic root assessment may not be systematically performed before all SAVR cases, and mild-moderate root dilation may be deferred rather than addressed concomitantly. Surgical planning focuses on the valve without cross-referencing aortic dimensions.',
    whyTailrd: 'TAILRD connected pre-operative imaging (CT aortography, echo) aortic dimensions with SAVR surgical planning data to identify patients with concurrent root dilation above intervention threshold.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: AVR cases (~210) x 5-8% concurrent root dilation above 4.5cm threshold = ~12. Dollar opportunity: $45,000 additional DRG increment x 30% conversion x 12 = ~$162K. Borger et al, JTCVS 2004.',
  },
  {
    id: 'vd-gap-15-mechanical-valve-inr',
    name: 'Mechanical Valve INR Not in Therapeutic Range',
    category: 'Safety',
    patientCount: 38,
    dollarOpportunity: 0,
    priority: 'high',
    safetyNote:
      'CRITICAL: Subtherapeutic INR in mechanical valve patients increases thromboembolic risk 2-4x. Supratherapeutic INR doubles hemorrhagic risk. Mechanical valve thrombosis carries 10-15% mortality.',
    evidence:
      'Cannegieter SC et al, NEJM 1995 (PMID 7862179). Subtherapeutic INR in mechanical valve patients: thromboembolic risk increased 2-4x. Supratherapeutic INR: bleeding risk doubled. Target INR: 2.5-3.5 for mechanical mitral, 2.0-3.0 for mechanical aortic (On-X may use 1.5-2.0 with aspirin).',
    cta: 'Urgent Anticoagulation Clinic Referral — INR Optimization',
    detectionCriteria: [
      'Mechanical valve prosthesis (mitral or aortic)',
      'Most recent INR out of position-specific therapeutic range for >=30 days',
      'No anticoagulation clinic follow-up documented',
    ],
    patients: mechanicalValveINRPatients,
    whyMissed: 'INR monitoring is typically managed by anticoagulation clinics or PCPs disconnected from the valve surgery program. Lapsed INR monitoring in mechanical valve patients is not flagged back to the structural heart team.',
    whyTailrd: 'TAILRD connected mechanical valve prosthesis records with INR laboratory results to identify patients with out-of-range anticoagulation requiring urgent optimization.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: estimated mechanical valve population (~150) x 25% out-of-range rate at any point = ~38. Dollar opportunity: $0 direct revenue — safety/cost avoidance. Prevents stroke ($50K+ per event) and major hemorrhage. Cannegieter et al, NEJM 1995.',
  },
  {
    id: 'vd-gap-16-severe-mr-teer',
    name: 'Severe MR — TEER Eligibility Not Assessed',
    category: 'Growth',
    patientCount: 55,
    dollarOpportunity: 907500,
    priority: 'high',
    evidence:
      'Stone GW et al, COAPT (NEJM 2018, PMID 30280640). MitraClip in HFrEF patients with severe secondary MR showed >30% mortality reduction and 50% reduction in HF hospitalizations at 2 years. Abbott MR pathway: TEER is standard of care for appropriately selected patients failing GDMT.',
    cta: 'Screen for TEER Candidacy — Refer to Structural Heart Team',
    detectionCriteria: [
      'Severe primary or secondary MR on echo (EROA >=0.3 cm2 for secondary, >=0.4 cm2 for primary)',
      'Symptomatic despite guideline-directed medical therapy (NYHA II-IV)',
      'Not referred to structural heart team for TEER evaluation',
    ],
    patients: severeMRTEERPatients,
    whyMissed: 'Severe MR patients are often managed medically by HF cardiologists without systematic screening for TEER candidacy. COAPT criteria (EROA, LVEDD, GDMT status) require cross-referencing echo, medication, and HF data that are siloed across care settings.',
    whyTailrd: 'TAILRD connected echo-derived MR severity with HF hospitalization data, GDMT optimization status, and absence of structural heart referral to identify COAPT-eligible patients not in the TEER pipeline.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: HF panel + valve panel x severe MR prevalence x not referred x 35% market share = ~55. Dollar opportunity: $55,000 TEER x 30% conversion x 55 = ~$907,500. COAPT trial (Stone et al, NEJM 2018).',
    crossModule: 'Heart Failure Module — HFrEF + severe MR overlap',
  },
  {
    id: 'vd-gap-17-pve-delayed-consult',
    name: 'Prosthetic Valve Endocarditis — Delayed Surgical Consultation',
    category: 'Safety',
    patientCount: 8,
    dollarOpportunity: 0,
    priority: 'high',
    safetyNote:
      'CRITICAL: Prosthetic valve endocarditis without early surgical consultation carries 40% in-hospital mortality. Early surgery reduces mortality to <20%. ESC 2023 guidelines mandate surgical consultation within 48 hours of PVE diagnosis.',
    evidence:
      'Habib G et al, ESC Guidelines on IE (EHJ 2023, PMID 37622657). Early surgical consultation in PVE reduces in-hospital mortality from 40% to <20%. Class I recommendation for surgical consultation within 48 hours for all PVE cases. Surgical indications: vegetation >10mm, new paravalvular leak, persistent bacteremia, new HF.',
    cta: 'URGENT: Surgical Consultation Within 48 Hours',
    detectionCriteria: [
      'Prosthetic valve endocarditis (confirmed or suspected) based on modified Duke criteria',
      'No surgical consultation documented within 48 hours of diagnosis',
      'Any of: vegetation >10mm, paravalvular abscess, persistent bacteremia, new HF',
    ],
    patients: pveDelayedConsultPatients,
    whyMissed: 'PVE is managed by infectious disease teams who may not automatically trigger surgical consultation. The 48-hour surgical consult window is a guideline recommendation that is not enforced by standard order sets or clinical workflows.',
    whyTailrd: 'TAILRD connected prosthetic valve endocarditis diagnosis (blood cultures + echo findings) with surgical consultation timing to identify PVE patients with delayed surgical assessment exceeding guideline-recommended windows.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: prosthetic valve population x PVE incidence 0.5%/year x delayed consultation rate (~35%) = ~8. Dollar opportunity: $0 direct revenue — critical safety gap. Avoided mortality and prolonged ICU stays. Habib et al, ESC 2023.',
  },
  {
    id: 'vd-gap-18-post-tavr-pacemaker',
    name: 'Post-TAVR Pacemaker Need Not Anticipated',
    category: 'Quality',
    patientCount: 25,
    dollarOpportunity: 0,
    priority: 'medium',
    evidence:
      'Auffret V et al, Circulation 2017 (PMID 28400525). Pre-procedural RBBB is the strongest predictor of post-TAVR permanent pacemaker (OR 4.5). Other risk factors: first-degree AVB, left axis deviation, self-expanding valve. Post-TAVR PPM rate: 10-25% depending on valve type and pre-existing conduction disease.',
    cta: 'Pre-TAVR Conduction Risk Assessment — Consider EP Standby',
    detectionCriteria: [
      'TAVR performed with new conduction disturbance requiring PPM within 30 days',
      'Pre-procedural risk factors present (RBBB, first-degree AVB, self-expanding valve)',
      'No pre-procedural conduction risk documentation or EP standby planning',
    ],
    patients: postTAVRPacemakerPatients,
    whyMissed: 'Pre-TAVR conduction risk assessment is not systematically performed in all programs. Pre-existing RBBB and AVB are documented on ECG but not consistently flagged as PPM risk factors in the TAVR planning workflow.',
    whyTailrd: 'TAILRD connected pre-TAVR ECG findings (RBBB, first-degree AVB) with post-TAVR outcomes (new PPM within 30 days) to retrospectively identify patients whose conduction risk was not anticipated pre-procedurally.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 380 TAVRs x 15% PPM rate x 43% with identifiable pre-op risk factors not flagged = ~25. Dollar opportunity: $0 direct — quality metric reducing unplanned hospital days and length of stay. Auffret et al, Circulation 2017.',
  },
  {
    id: 'vd-gap-19-bioprosthetic-surveillance',
    name: 'Bioprosthetic Valve Surveillance Overdue (>5 Years Post-Op)',
    category: 'Quality',
    patientCount: 85,
    dollarOpportunity: 26775,
    priority: 'medium',
    evidence:
      '2020 ACC/AHA Valve Guidelines: annual echocardiographic surveillance recommended >5 years post bioprosthetic AVR or MVR. SVD typically begins 7-10 years post-implant with 30-50% requiring reintervention by 15 years. Early detection enables elective VIV-TAVR planning.',
    cta: 'Schedule Annual Surveillance Echocardiogram',
    detectionCriteria: [
      'Bioprosthetic valve prosthesis (AVR or MVR) >5 years post-implant',
      'No echocardiogram in past 12 months',
      'No documented valve-related follow-up appointment',
    ],
    patients: bioprostheticSurveillancePatients,
    whyMissed: 'Long-term bioprosthetic valve surveillance requires tracking implant dates against echo intervals — patients implanted 5-15 years ago are often lost to follow-up from the surgical team and managed only by PCPs who may not enforce valve surveillance schedules.',
    whyTailrd: 'TAILRD connected bioprosthetic valve implant records with time since surgery and absence of annual echo to identify patients in the SVD risk window who are overdue for surveillance.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: estimated bioprosthetic population >5 years (~280) x 30% surveillance gap = ~85. Dollar opportunity: $450 echo x 70% completion x 85 = ~$26,775. Also pipeline for VIV-TAVR if SVD detected. ACC/AHA 2020 guidelines.',
  },
  {
    id: 'vd-gap-20-tmvr-candidacy',
    name: 'TMVR Candidacy Not Screened',
    category: 'Growth',
    patientCount: 12,
    dollarOpportunity: 117000,
    priority: 'medium',
    evidence:
      'Webb JG et al (Tendyne, Intrepid trials). Transcatheter mitral valve replacement (TMVR) offers option for patients with severe symptomatic MR who are not candidates for surgical repair or TEER. FDA pathway advancing for multiple TMVR devices. Early feasibility data shows acceptable safety in no-option patients.',
    cta: 'Evaluate for TMVR Clinical Trial or Compassionate Use',
    detectionCriteria: [
      'Severe symptomatic MR (primary or secondary)',
      'Not a candidate for surgical repair (high/prohibitive risk)',
      'Not a candidate for TEER (failed or anatomy unsuitable)',
      'Not evaluated for TMVR or enrolled in TMVR clinical trial',
    ],
    patients: tmvrCandidacyPatients,
    whyMissed: 'TMVR is an emerging technology and most programs do not have a systematic screening pathway for TMVR candidacy. Patients who fail TEER or are inoperable are often considered no-option without evaluation for emerging transcatheter alternatives.',
    whyTailrd: 'TAILRD identified patients with severe MR who failed or were ineligible for both surgical repair and TEER, cross-referencing with TMVR trial eligibility criteria to flag potential candidates for this emerging therapy.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: severe MR patients x failed/ineligible for repair or TEER x 35% market share = ~12. Dollar opportunity: $65,000 TMVR x 15% conversion (emerging technology) x 12 = ~$117K. Tendyne/Intrepid trial data.',
  },
  {
    id: 'vd-gap-21-as-cad-combined-strategy',
    name: 'AS + CAD — Combined vs Staged Strategy Not Documented',
    category: 'Gap',
    patientCount: 30,
    dollarOpportunity: 216000,
    priority: 'high',
    evidence:
      'Barbato B et al, EHJ 2023 (PMID 36721960). Combined TAVR+PCI associated with longer procedures but avoids staged procedural risk. SAVR+CABG preferred for high SYNTAX scores. Decision requires heart team input based on SYNTAX score, STS risk, and coronary anatomy. No randomized trial comparing strategies — individualized decision-making essential.',
    cta: 'Heart Team Discussion — Combined vs Staged Revascularization Strategy',
    detectionCriteria: [
      'Severe AS requiring intervention (TAVR or SAVR)',
      'Significant concomitant CAD requiring revascularization',
      'No documented discussion of combined vs staged approach (TAVR+PCI vs SAVR+CABG vs staged)',
    ],
    patients: asCADStrategyPatients,
    whyMissed: 'AS and CAD are often managed by separate subspecialists (structural heart vs interventional cardiology). The combined vs staged strategy decision requires cross-disciplinary heart team input that is frequently not formalized or documented.',
    whyTailrd: 'TAILRD connected severe AS intervention planning with coronary angiography data showing significant CAD to identify patients lacking documented heart team discussion of combined vs staged revascularization strategy.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 380 TAVRs x 25% concurrent significant CAD x 32% without documented combined strategy discussion = ~30. Dollar opportunity: $24,000 PCI add-on x 30% conversion x 30 = ~$216K incremental. Barbato et al, EHJ 2023.',
  },
  // ============================================================
  // GAP vd-22: VALVE-SPARING ROOT REPLACEMENT (DAVID) NOT OFFERED
  // ============================================================
  {
    id: 'vd-gap-22-valve-sparing-root',
    name: 'Valve-Sparing Root Replacement (David) Not Offered',
    category: 'Gap',
    patientCount: 12,
    dollarOpportunity: 162000,
    priority: 'high',
    evidence:
      'David TE et al, JTCVS 2014 — 20-year David procedure results. Valve-sparing: preserves native valve, avoids anticoagulation, superior long-term durability in young patients.',
    cta: 'Evaluate for Valve-Sparing Root Replacement — David Procedure',
    detectionCriteria: [
      'Aortic root aneurysm ≥4.5 cm requiring surgical intervention',
      'Normal or mildly diseased aortic valve cusps on echo/CT',
      'Bentall (composite root replacement) planned',
      'No documented evaluation for valve-sparing root replacement',
    ],
    patients: [
      {
        id: 'VD-VSRR-022-001',
        name: 'Jonathan Westbrook',
        mrn: 'MRN-VD-22001',
        age: 48,
        signals: [
          'Aortic root aneurysm 5.1 cm — Marfan syndrome',
          'Aortic valve cusps normal on echo — ideal for David procedure',
          'Bentall with mechanical valve planned — requires lifetime warfarin',
          'David procedure: preserves native valve, avoids anticoagulation',
        ],
        keyValues: {
          'Root Size': '5.1 cm',
          'Valve Cusps': 'Normal (no calcification, no prolapse)',
          'Etiology': 'Marfan syndrome',
          'Planned Surgery': 'Bentall (mechanical composite)',
          'David Evaluation': 'Not documented',
          'Age': 48,
        },
      },
      {
        id: 'VD-VSRR-022-002',
        name: 'Rachel Thornton',
        mrn: 'MRN-VD-22002',
        age: 42,
        signals: [
          'Root aneurysm 4.8 cm — bicuspid aortic valve, mild AI only',
          'Young woman wanting to avoid anticoagulation (pregnancy plans)',
          'Bentall with bioprosthetic planned — will need redo in 10-15 years',
          'David: 20-year durability, no anticoagulation, avoids redo',
        ],
        keyValues: {
          'Root Size': '4.8 cm',
          'Valve': 'Bicuspid — mild AI, cusps pliable',
          'Age': 42,
          'Pregnancy Plans': 'Yes — anticoagulation contraindicated',
          'Planned Surgery': 'Bentall (bioprosthetic)',
          'David Benefit': 'No anticoagulation + 20-year durability',
        },
      },
      {
        id: 'VD-VSRR-022-003',
        name: 'Gregory Fitzwilliam',
        mrn: 'MRN-VD-22003',
        age: 55,
        signals: [
          'Aortic root 5.3 cm — degenerative, trileaflet valve with trace AR',
          'Active lifestyle — warfarin would significantly impact quality of life',
          'David procedure: ideal for patients with normal cusps + root aneurysm',
          'Not evaluated for valve-sparing approach',
        ],
        keyValues: {
          'Root Size': '5.3 cm (degenerative)',
          'Valve': 'Trileaflet — trace AR, normal cusps',
          'Activity Level': 'Very active (marathon runner)',
          'Planned Surgery': 'Bentall',
          'David Evaluation': 'Not performed',
          'Benefit': 'Avoids anticoagulation + activity restrictions',
        },
      },
    ],
    whyMissed: 'Valve-sparing root replacement (David procedure) is technically demanding and requires specialized expertise. Not all cardiac surgery programs offer the David procedure, defaulting to Bentall even when cusps are suitable for preservation.',
    whyTailrd: 'TAILRD identified patients with aortic root aneurysm and normal/near-normal valve cusps on imaging who were scheduled for composite root replacement without documented evaluation for the valve-sparing David procedure.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: root aneurysm cases × eligible cusps × not offered × 35% market share ≈ 12. Dollar opportunity: $45,000 DRG × 12 × 30% conversion = $162K.',
  },
  // ============================================================
  // GAP vd-23: SUTURELESS/RAPID-DEPLOYMENT AVR — SMALL ANNULUS
  // ============================================================
  {
    id: 'vd-gap-23-sutureless-avr',
    name: 'Sutureless/Rapid-Deployment AVR Not Considered — Small Annulus',
    category: 'Gap',
    patientCount: 15,
    dollarOpportunity: 202500,
    priority: 'medium',
    evidence:
      'Shrestha M et al, JTCVS 2016. Sutureless valves: avoid PPM in small annulus, reduce cross-clamp time by 30-40 minutes, enable min-invasive approach.',
    cta: 'Consider Sutureless/Rapid-Deployment Valve — Small Annulus',
    detectionCriteria: [
      'Surgical AVR planned',
      'Small aortic annulus ≤21mm on pre-op imaging',
      'Standard stented bioprosthesis selected',
      'No documented evaluation for sutureless or rapid-deployment valve',
    ],
    patients: [
      {
        id: 'VD-SL-023-001',
        name: 'Dorothy Pemberton',
        mrn: 'MRN-VD-23001',
        age: 72,
        signals: [
          'Severe AS — surgical AVR planned, annulus 19mm on CT',
          'Standard 19mm bioprosthesis: high risk of patient-prosthesis mismatch',
          'Sutureless (Perceval) valve: supra-annular design avoids PPM',
          'Not evaluated for sutureless option despite small annulus',
        ],
        keyValues: {
          'Annulus Size': '19mm (small)',
          'PPM Risk': 'High with standard 19mm prosthesis',
          'Planned Valve': 'Standard stented bioprosthesis',
          'Sutureless Evaluation': 'Not documented',
          'BSA': '1.65 (indexed EOA will be borderline)',
          'Benefit': 'Avoid PPM + shorter cross-clamp time',
        },
      },
      {
        id: 'VD-SL-023-002',
        name: 'Lillian Marchetti',
        mrn: 'MRN-VD-23002',
        age: 68,
        signals: [
          'Severe AS + annulus 20mm — eligible for mini-sternotomy AVR',
          'Rapid-deployment (Intuity) valve enables min-invasive approach',
          'Standard valve: requires full sternotomy due to suturing time',
          'Rapid-deployment: 30-40 minute shorter cross-clamp',
        ],
        keyValues: {
          'Annulus Size': '20mm',
          'Planned Approach': 'Full sternotomy',
          'Rapid-Deployment': 'Not evaluated',
          'Benefit': 'Enables mini-sternotomy + shorter cross-clamp',
          'Cross-Clamp Reduction': '30-40 minutes',
          'Recovery': 'Faster with min-invasive approach',
        },
      },
      {
        id: 'VD-SL-023-003',
        name: 'Margaret Ainsworth',
        mrn: 'MRN-VD-23003',
        age: 78,
        signals: [
          'Small annulus 21mm + concomitant CABG — long anticipated cross-clamp',
          'Standard AVR + CABG: 90+ minutes cross-clamp expected',
          'Rapid-deployment valve: reduce AVR portion by 30+ minutes',
          'Elderly patient — shorter cross-clamp = lower mortality risk',
        ],
        keyValues: {
          'Annulus Size': '21mm',
          'Concomitant': 'CABG × 2 (LAD + OM)',
          'Cross-Clamp': 'Anticipated 90+ minutes',
          'Rapid-Deployment': 'Not considered',
          'Benefit': 'Shorter ischemic time — critical in elderly',
          'STS Risk': '3.8%',
        },
      },
    ],
    whyMissed: 'Sutureless and rapid-deployment valves require operator familiarity and institutional stocking decisions. Surgeons experienced with standard sutured prostheses may not consider alternatives even for small annulus cases.',
    whyTailrd: 'TAILRD identified patients with small aortic annulus (≤21mm) on pre-operative imaging scheduled for standard AVR, flagging the PPM risk and missed opportunity for sutureless/rapid-deployment alternatives.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: AVR cases × 20% small annulus × 50% not considered × 35% market share ≈ 15. Dollar opportunity: $45,000 × 15 × 30% conversion = $202.5K.',
  },
  // ============================================================
  // GAP vd-24: TRICUSPID ANNULOPLASTY NOT PERFORMED CONCOMITANT
  // ============================================================
  {
    id: 'vd-gap-24-concomitant-tricuspid',
    name: 'Tricuspid Annuloplasty Not Performed Concomitant With Left-Sided Surgery',
    category: 'Quality',
    patientCount: 30,
    dollarOpportunity: 0,
    priority: 'high',
    evidence:
      'Badhwar V et al, STS 2017 Guidelines. Dreyfus GD et al, Ann Thorac Surg 2005. Untreated functional TR progresses in 25-50% of patients post left-sided surgery, requiring late redo.',
    cta: 'Concomitant Tricuspid Annuloplasty — TR ≥Moderate or Annulus ≥40mm',
    detectionCriteria: [
      'Left-sided valve surgery planned or recently performed',
      'TR ≥moderate on pre-operative echo',
      'OR tricuspid annular dilation ≥40mm on echo/CT',
      'No concomitant tricuspid annuloplasty performed or planned',
    ],
    patients: [
      {
        id: 'VD-TA-024-001',
        name: 'Beatrice Callahan',
        mrn: 'MRN-VD-24001',
        age: 66,
        signals: [
          'Mitral valve repair for severe MR — moderate TR on echo',
          'Tricuspid annulus 44mm (dilated) — annuloplasty indicated',
          'No concomitant tricuspid annuloplasty planned',
          'STS Guidelines: annuloplasty for TR ≥moderate or annulus ≥40mm',
        ],
        keyValues: {
          'Left-Sided Surgery': 'MV repair (severe MR)',
          'TR Grade': 'Moderate',
          'TV Annulus': '44mm (dilated — ≥40mm)',
          'Concomitant TV': 'Not planned',
          'STS Guideline': 'Class I for annulus ≥40mm',
          'Risk if Untreated': 'TR progression in 25-50% → redo surgery',
        },
      },
      {
        id: 'VD-TA-024-002',
        name: 'Philip Worthington',
        mrn: 'MRN-VD-24002',
        age: 71,
        signals: [
          'AVR for severe AS + moderate-severe TR + AF',
          'AF causes TV annular dilation — TR will progress without annuloplasty',
          'Concomitant TV annuloplasty adds 15-20 minutes, minimal additional risk',
          'Late redo tricuspid surgery: 10% mortality vs <1% added risk now',
        ],
        keyValues: {
          'Left-Sided Surgery': 'AVR (severe AS)',
          'TR Grade': 'Moderate-severe',
          'AF': 'Persistent (annular dilation)',
          'TV Annulus': '48mm',
          'Concomitant TV': 'Not planned',
          'Redo Risk': '10% mortality for late isolated TV surgery',
        },
      },
      {
        id: 'VD-TA-024-003',
        name: 'Catherine Kensington',
        mrn: 'MRN-VD-24003',
        age: 63,
        signals: [
          'MV replacement (rheumatic) — TR mild but annulus 42mm',
          'Dreyfus: annular dilation predicts TR progression even if mild now',
          'Prophylactic annuloplasty for dilated annulus — STS Class IIa',
          'Annuloplasty not planned despite dilated annulus criterion met',
        ],
        keyValues: {
          'Left-Sided Surgery': 'MVR (rheumatic MS)',
          'TR Grade': 'Mild (currently)',
          'TV Annulus': '42mm (dilated — above 40mm threshold)',
          'Annuloplasty Planned': 'No',
          'Dreyfus Study': 'Annular dilation → TR progression in 50%',
          'STS': 'Class IIa for dilated annulus',
        },
      },
    ],
    whyMissed: 'Surgeons focused on the primary left-sided pathology may not routinely assess tricuspid annular dimensions or may consider mild TR not worth the added procedural time. The progression data from Dreyfus et al is not universally applied.',
    whyTailrd: 'TAILRD identified patients undergoing left-sided valve surgery with TR ≥moderate or tricuspid annular dilation ≥40mm who did not have concomitant tricuspid annuloplasty in the surgical plan.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 700 valve surgeries × 20% TR ≥moderate or dilated annulus × 55% without annuloplasty × 35% market share ≈ 30. Dollar opportunity: Quality — $0 direct but prevents reoperation ($50K+ per redo).',
  },
  // ============================================================
  // GAP vd-25: MINIMALLY INVASIVE VALVE SURGERY NOT OFFERED
  // ============================================================
  {
    id: 'vd-gap-25-min-invasive-valve',
    name: 'Minimally Invasive Valve Surgery Not Offered — Eligible Patient',
    category: 'Gap',
    patientCount: 45,
    dollarOpportunity: 0,
    priority: 'medium',
    evidence:
      'Lamelas J et al, Ann Thorac Surg 2018. Minimally invasive: equivalent outcomes, faster recovery (4 vs 7 days), less blood loss, better cosmesis.',
    cta: 'Evaluate for Minimally Invasive Approach — Right Mini-Thoracotomy or Robotic',
    detectionCriteria: [
      'Isolated valve surgery planned (AVR, MVR, or MV repair)',
      'Patient anatomically eligible for right mini-thoracotomy or robotic approach',
      'Conventional full sternotomy planned',
      'No documented reason why minimally invasive approach is not suitable',
    ],
    patients: [
      {
        id: 'VD-MIS-025-001',
        name: 'Stephanie Hargrove',
        mrn: 'MRN-VD-25001',
        age: 55,
        signals: [
          'Isolated MV repair for degenerative MR — sternotomy planned',
          'No prior cardiac surgery, normal body habitus — ideal MIS candidate',
          'Right mini-thoracotomy: 4 vs 7 day recovery, less blood loss',
          'Minimally invasive not discussed with patient',
        ],
        keyValues: {
          'Surgery': 'MV repair (P2 prolapse, severe MR)',
          'Approach': 'Full sternotomy planned',
          'MIS Eligible': 'Yes — no prior surgery, favorable anatomy',
          'MIS Offered': 'Not documented',
          'Recovery': '4 days MIS vs 7 days sternotomy',
          'Cosmesis': 'Important to patient (age 55, female)',
        },
      },
      {
        id: 'VD-MIS-025-002',
        name: 'Kenneth Blackwell',
        mrn: 'MRN-VD-25002',
        age: 62,
        signals: [
          'Isolated AVR for severe AS — good TAVR candidate but chose surgery',
          'If choosing surgery: should be offered mini-sternotomy or right mini-thoracotomy',
          'Full sternotomy planned without MIS discussion',
          'MIS AVR: equivalent outcomes with faster recovery',
        ],
        keyValues: {
          'Surgery': 'AVR (severe AS, low surgical risk)',
          'Approach': 'Full sternotomy',
          'MIS Eligible': 'Yes — isolated AVR',
          'MIS Discussion': 'Not documented',
          'Patient Preference': 'Chose surgery over TAVR for durability',
          'MIS Benefit': 'Faster recovery, less pain, better cosmesis',
        },
      },
      {
        id: 'VD-MIS-025-003',
        name: 'Alexandra Stavros',
        mrn: 'MRN-VD-25003',
        age: 48,
        signals: [
          'Robotic MV repair available at institution — not offered to patient',
          'Isolated posterior leaflet prolapse — ideal robotic MV repair anatomy',
          'Young active patient — would benefit most from minimally invasive approach',
          'Institution performs 239 robotic cardiac procedures/year',
        ],
        keyValues: {
          'Surgery': 'MV repair (posterior prolapse)',
          'Approach': 'Full sternotomy planned',
          'Robotic Available': 'Yes — 239 robotic cardiac cases/year',
          'Robotic Offered': 'Not discussed',
          'Age': 48,
          'Benefit': 'Fastest recovery, smallest incision, best cosmesis',
        },
      },
    ],
    whyMissed: 'Not all cardiac surgeons are trained in minimally invasive or robotic approaches. Scheduling, equipment availability, and individual surgeon comfort may drive conventional sternotomy as the default even when MIS is available.',
    whyTailrd: 'TAILRD identified patients scheduled for isolated valve surgery via full sternotomy at institutions with documented MIS/robotic capability, without documentation of why MIS was not offered.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 700 valve surgeries × 30% eligible for MIS × 45% not offered × 35% market share ≈ 45. Dollar opportunity: Quality/growth — $0 direct but program differentiation.',
  },
  // ============================================================
  // GAP vd-26: RE-DO STERNOTOMY RISK NOT FORMALLY ASSESSED
  // ============================================================
  {
    id: 'vd-gap-26-redo-sternotomy-risk',
    name: 'Re-Do Sternotomy Risk Not Formally Assessed',
    category: 'Safety',
    patientCount: 15,
    dollarOpportunity: 0,
    priority: 'high',
    safetyNote: 'SAFETY: Redo sternotomy without pre-operative CT carries 2-5× higher mortality risk. CT assessment of sternal wires, adhesions, and graft proximity is mandatory. Transcatheter alternatives (TAVR, valve-in-valve) should be discussed.',
    evidence:
      'Ellman PI et al, Ann Thorac Surg 2008. Redo sternotomy: 2-5× higher mortality vs primary. Pre-op CT mandatory. Transcatheter alternatives (TAVR, valve-in-valve) may avoid redo sternotomy entirely.',
    cta: 'Pre-Op CT for Redo Assessment — Consider Transcatheter Alternative',
    detectionCriteria: [
      'Prior cardiac surgery (prior sternotomy)',
      'Redo valve surgery planned',
      'No pre-operative CT for redo risk assessment',
      'No documented discussion of transcatheter alternative (TAVR, valve-in-valve)',
    ],
    patients: [
      {
        id: 'VD-REDO-026-001',
        name: 'Bernard Worthington',
        mrn: 'MRN-VD-26001',
        age: 74,
        signals: [
          'Prior CABG × 3 grafts (15 years ago) — now needs AVR for severe AS',
          'Redo sternotomy: LIMA graft crosses midline — high re-entry risk',
          'No pre-op CT for redo assessment documented',
          'TAVR is viable alternative — avoids redo sternotomy entirely',
        ],
        keyValues: {
          'Prior Surgery': 'CABG × 3 (LIMA-LAD, SVG-OM, SVG-RCA)',
          'Current Need': 'AVR (severe AS)',
          'Pre-Op CT': 'Not performed',
          'LIMA Position': 'Crosses midline — high re-entry risk',
          'TAVR Discussion': 'Not documented',
          'Redo Risk': '2-5× higher mortality without CT planning',
        },
      },
      {
        id: 'VD-REDO-026-002',
        name: 'Virginia Kensington',
        mrn: 'MRN-VD-26002',
        age: 69,
        signals: [
          'Prior MVR (mechanical) 12 years ago — now failing prosthesis',
          'Redo sternotomy for re-MVR — no CT for adhesion assessment',
          'Valve-in-valve TMVR: emerging transcatheter option',
          'Formal redo risk assessment not documented',
        ],
        keyValues: {
          'Prior Surgery': 'MVR (mechanical, 12 years ago)',
          'Current Need': 'Redo MVR (prosthetic stenosis)',
          'Pre-Op CT': 'Not performed',
          'Redo Risk': 'Dense adhesions expected after 12 years',
          'Transcatheter Option': 'Valve-in-valve TMVR not discussed',
          'STS Predicted': '6.2% (elevated for redo)',
        },
      },
    ],
    whyMissed: 'Redo cardiac surgery planning may not include formal CT assessment at all institutions. The emergence of transcatheter alternatives adds a decision layer that requires heart team discussion not universally implemented for redo cases.',
    whyTailrd: 'TAILRD identified patients with prior cardiac surgery scheduled for redo valve surgery without documented pre-operative CT for redo risk assessment or heart team discussion of transcatheter alternatives.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: redo valve cases × without formal assessment × 35% market share ≈ 15. Dollar opportunity: Safety — prevents catastrophic re-entry injury.',
  },
  // ============================================================
  // GAP vd-27: ANTICOAGULATION POST-BIOPROSTHETIC AVR NOT STANDARDIZED
  // ============================================================
  {
    id: 'vd-gap-27-post-bio-avr-ac',
    name: 'Anticoagulation Post-Bioprosthetic AVR Not Standardized',
    category: 'Quality',
    patientCount: 40,
    dollarOpportunity: 0,
    priority: 'medium',
    evidence:
      '2020 ACC/AHA Guidelines: aspirin recommended (Class I). Warfarin × 3 months: Class IIa. DOAC: emerging data but not yet guideline-endorsed for surgical bioprosthetic.',
    cta: 'Document Antithrombotic Protocol — Post-Bioprosthetic AVR',
    detectionCriteria: [
      'Bioprosthetic AVR performed within past 6 months',
      'No standardized antithrombotic protocol documented',
      'Variation: aspirin only vs warfarin × 3 months vs DOAC',
      'No documented rationale for chosen strategy',
    ],
    patients: [
      {
        id: 'VD-BAC-027-001',
        name: 'Richard Abernathy',
        mrn: 'MRN-VD-27001',
        age: 70,
        signals: [
          'Bioprosthetic AVR 6 weeks ago — on warfarin without documented INR target or duration',
          'ACC/AHA: warfarin × 3 months is Class IIa (INR 2.5)',
          'No documentation of plan to transition to aspirin at 3 months',
          'Standardized protocol needed',
        ],
        keyValues: {
          'Surgery': 'Bioprosthetic AVR (6 weeks ago)',
          'Current Regimen': 'Warfarin (target INR not documented)',
          'ACC/AHA': 'Warfarin × 3 months Class IIa, aspirin Class I',
          'Duration Plan': 'Not documented',
          'Transition': 'No plan to switch to aspirin',
          'Protocol': 'Not standardized',
        },
      },
      {
        id: 'VD-BAC-027-002',
        name: 'Evelyn Whitehurst',
        mrn: 'MRN-VD-27002',
        age: 65,
        signals: [
          'Post-bioprosthetic AVR 2 months — on aspirin only',
          'Some evidence supports warfarin × 3 months for leaflet thrombosis prevention',
          'No documented rationale for aspirin-only strategy',
          'Either approach acceptable — but documentation of rationale required',
        ],
        keyValues: {
          'Surgery': 'Bioprosthetic AVR (2 months ago)',
          'Current Regimen': 'Aspirin 81mg only',
          'Rationale': 'Not documented',
          'ACC/AHA': 'Aspirin: Class I, Warfarin: Class IIa',
          'HALT Risk': 'Unknown — no CT screening',
          'Protocol': 'Not standardized',
        },
      },
      {
        id: 'VD-BAC-027-003',
        name: 'Norman Fitzgerald',
        mrn: 'MRN-VD-27003',
        age: 73,
        signals: [
          'Post-bioprosthetic AVR 3 months — placed on rivaroxaban by PCP',
          'DOACs: not yet guideline-endorsed for surgical bioprosthetic',
          'Data from TAVR trials (ATLANTIS) not applicable to surgical bio-AVR',
          'Should be on warfarin (if AC desired) or aspirin — not DOAC',
        ],
        keyValues: {
          'Surgery': 'Bioprosthetic AVR (3 months ago)',
          'Current Regimen': 'Rivaroxaban 20mg (off-label)',
          'Guideline': 'DOACs not endorsed for surgical bioprosthetic',
          'Appropriate': 'Warfarin or aspirin per ACC/AHA',
          'PCP Prescribed': 'Rivaroxaban without surgical team input',
          'Protocol': 'Not standardized — led to inappropriate DOAC use',
        },
      },
    ],
    whyMissed: 'Post-surgical antithrombotic management transitions from the cardiac surgeon to cardiologist or PCP. Without a standardized protocol, PCPs may apply TAVR data to surgical patients or default to DOAC prescribing.',
    whyTailrd: 'TAILRD identified post-bioprosthetic AVR patients with variable antithrombotic regimens and absent protocol documentation by analyzing surgical dates and medication prescribing patterns.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: bioprosthetic AVR × without standardized protocol × 35% market share ≈ 40. Dollar opportunity: Quality — $0 direct.',
  },
  // ============================================================
  // GAP vd-28: BETA-BLOCKER NOT INITIATED PRE-OP — VALVE SURGERY POAF
  // ============================================================
  {
    id: 'vd-gap-28-preop-bb-poaf',
    name: 'Beta-Blocker Not Initiated Pre-Op — Valve Surgery POAF Prevention',
    category: 'Quality',
    patientCount: 65,
    dollarOpportunity: 0,
    priority: 'high',
    evidence:
      'Crystal E et al, Circulation 2002. Arsenault KA et al, Circulation 2013. Pre-op BB: 30-40% POAF reduction. Class I recommendation. Valve surgery POAF rate higher than CABG.',
    cta: 'Initiate Beta-Blocker ≥24h Before Valve Surgery — POAF Prevention',
    detectionCriteria: [
      'Valve surgery scheduled',
      'Not currently on beta-blocker',
      'No contraindication to beta-blocker (asthma, severe bradycardia, decompensated HF)',
      'No pre-operative beta-blocker initiation ≥24 hours before surgery',
    ],
    patients: [
      {
        id: 'VD-BB-028-001',
        name: 'Howard Blanchard',
        mrn: 'MRN-VD-28001',
        age: 67,
        signals: [
          'AVR scheduled in 5 days — not on beta-blocker',
          'No contraindication to BB (HR 78, SBP 134, no asthma)',
          'Valve surgery POAF rate: 40-60% — higher than CABG',
          'Pre-op BB reduces POAF 30-40% — Class I recommendation',
        ],
        keyValues: {
          'Surgery': 'AVR (scheduled in 5 days)',
          'BB Status': 'Not on beta-blocker',
          'Resting HR': '78 bpm',
          'SBP': '134 mmHg',
          'Contraindication': 'None identified',
          'POAF Risk': '40-60% without prevention',
        },
      },
      {
        id: 'VD-BB-028-002',
        name: 'Janet Drummond',
        mrn: 'MRN-VD-28002',
        age: 74,
        signals: [
          'MV repair scheduled — age 74, high POAF risk',
          'On ACEi and statin but no beta-blocker',
          'BB should be started ≥24 hours pre-op for POAF prevention',
          'POAF: increases LOS by 3-5 days, adds $15K+ per event',
        ],
        keyValues: {
          'Surgery': 'MV repair',
          'Age': 74,
          'BB Status': 'Not prescribed',
          'Current Meds': 'Lisinopril, atorvastatin',
          'POAF Risk': 'High (age 74 + valve surgery)',
          'Cost Impact': 'POAF adds $15K+ in LOS and management',
        },
      },
      {
        id: 'VD-BB-028-003',
        name: 'Robert Kensington',
        mrn: 'MRN-VD-28003',
        age: 69,
        signals: [
          'Combined AVR + CABG — highest POAF risk category',
          'No BB in pre-op medication list — surgery tomorrow',
          'Arsenault meta-analysis: BB reduces POAF 30-40%',
          'Should have been started ≥24 hours pre-op — still time today',
        ],
        keyValues: {
          'Surgery': 'AVR + CABG × 2 (tomorrow)',
          'BB Status': 'Not ordered pre-op',
          'POAF Risk': 'Very high (combined valve + CABG)',
          'Action': 'Start BB today — ≥24h before surgery',
          'BB Choice': 'Metoprolol 25mg BID (start low)',
          'Contraindication': 'None',
        },
      },
    ],
    whyMissed: 'Pre-operative beta-blocker initiation for POAF prevention requires prospective protocol implementation. Without standardized pre-surgical checklists, BB initiation may be overlooked especially for patients not already on beta-blockers.',
    whyTailrd: 'TAILRD identified valve surgery patients not on beta-blockers by analyzing pre-operative medication lists and surgical schedules, flagging the gap in POAF prevention protocols.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 700 valve surgeries × 45% not on pre-op BB × 35% eligible × 35% market share ≈ 65. Dollar opportunity: Quality — reduces POAF ($15K+ per event in added LOS).',
  },
  // ============================================================
  // GAP vd-29: PROSTHETIC VALVE THROMBOSIS — THROMBOLYSIS VS. EMERGENCY SURGERY NOT DOCUMENTED
  // ============================================================
  {
    id: 'vd-gap-29-prosthetic-valve-thrombosis',
    name: 'Prosthetic Valve Thrombosis — Thrombolysis vs. Emergency Surgery Decision Not Documented',
    category: 'Safety',
    safetyNote: 'Prosthetic valve thrombosis: mortality 15-35% without treatment. Heart team decision required within 72 hours.',
    patientCount: 65,
    dollarOpportunity: 480000,
    priority: 'high',
    evidence:
      'AHA/ACC 2021 VHD Guidelines: prosthetic valve thrombosis (T82.01) confirmed by echo (increased gradients, restricted leaflet motion) + CT. Right-sided prosthetic valve thrombosis: fibrinolysis preferred over surgery (Class I, LOE B). Left-sided: fibrinolysis for NYHA I-III, urgent surgery for NYHA IV or large clot. TRITURATE registry: slow-infusion fibrinolysis (low-dose tPA) success 82%. Without treatment: mortality 15-35%.',
    cta: 'Urgent Heart Team Review — Thrombolysis vs. Emergency Surgery Decision Within 72 Hours',
    detectionCriteria: [
      'ICD-10 T82.01 (prosthetic valve thrombosis) or Z95.2/Z95.3/Z95.4 with new high gradients on echo',
      'Transvalvular gradient increased ≥50% from baseline on serial echo',
      'No heart team note or cardiac surgery consultation within 72 hours',
      'Fibrinolysis not administered and emergency surgery not planned',
      'Anticoagulation subtherapeutic (INR <2.0) at time of thrombosis event',
    ],
    patients: [
      {
        id: 'VD-PVT-029-001',
        name: 'Alphonse Beaumont',
        mrn: 'MRN-VD-29001',
        age: 66,
        signals: [
          'Mechanical MVR (Z95.3) — mean gradient risen from 4 to 12 mmHg on echo',
          'INR 1.4 at last check — subtherapeutic (target 2.5-3.5 for mechanical MV)',
          'No heart team note documenting thrombolysis vs. surgery decision',
          'CT fluoroscopy pending — restricted leaflet motion suspected',
          'TRITURATE: slow tPA infusion success 82% in obstructive PVT',
        ],
        keyValues: {
          'Valve': 'Mechanical MVR (Z95.3)',
          'Current Gradient': '12 mmHg (baseline 4 mmHg)',
          'INR': '1.4 (subtherapeutic — target 2.5-3.5)',
          'Heart Team Note': 'None within 72 hours',
          'CT Fluoroscopy': 'Pending',
          'NYHA Class': 'II-III',
        },
      },
      {
        id: 'VD-PVT-029-002',
        name: 'Rosalind Whitfield',
        mrn: 'MRN-VD-29002',
        age: 58,
        signals: [
          'Mechanical AVR (Z95.2) — restricted leaflet motion on CT, gradient doubled',
          'NYHA class IV — hemodynamically compromised',
          'No cardiac surgery consultation within 72 hours of echo finding',
          'ACC/AHA: NYHA IV prosthetic valve thrombosis — urgent surgery preferred',
          'Fibrinolysis risk: higher clot burden, left-sided — surgery indicated',
        ],
        keyValues: {
          'Valve': 'Mechanical AVR (Z95.2)',
          'Finding': 'Restricted leaflet motion — CT confirmed',
          'NYHA Class': 'IV (hemodynamically compromised)',
          'Cardiac Surgery Consult': 'None within 72 hours',
          'Recommendation': 'Urgent surgery — NYHA IV + large clot',
          'INR': '1.8 (subtherapeutic)',
        },
      },
      {
        id: 'VD-PVT-029-003',
        name: 'Edmund Cresswell',
        mrn: 'MRN-VD-29003',
        age: 71,
        signals: [
          'Tricuspid bioprosthesis (Z95.4) — gradient 12 mmHg (prior 3 mmHg)',
          'Right-sided PVT: fibrinolysis preferred over surgery (Class I, LOE B)',
          'Anticoagulation compliance poor — INR 1.6',
          'No documentation of thrombolysis decision or protocol initiation',
          'TRITURATE registry: right-sided PVT — tPA success rate >85%',
        ],
        keyValues: {
          'Valve': 'Tricuspid bioprosthesis (Z95.4)',
          'Current Gradient': '12 mmHg (baseline 3 mmHg)',
          'INR': '1.6 (subtherapeutic)',
          'Side': 'Right-sided — fibrinolysis preferred (Class I)',
          'Thrombolysis Plan': 'Not documented',
          'Heart Team Note': 'None',
        },
      },
    ],
    whyMissed: 'Prosthetic valve thrombosis is rare and time-sensitive. Without systematic echo gradient trending alerts linked to consultation urgency protocols, subtherapeutic INR and rising gradients may not trigger immediate heart team escalation, especially in non-valve-center hospitals.',
    whyTailrd: 'TAILRD identifies prosthetic valve patients by tracking serial echocardiographic gradients against documented baselines, flagging ≥50% gradient increases combined with subtherapeutic INR and absent cardiac surgery consultation timestamps.',
    methodologyNote: 'Identifies patients with mechanical prosthetic valve (Z95.2–Z95.4) and new elevation in valve gradients by ≥50% from baseline on echo, or fluoroscopic/CT evidence of restricted leaflet motion, without documented heart team review for thrombolysis vs. surgical intervention decision. Flags patients maintained on anticoagulation despite evidence of thrombosis without escalation.',
  },
  // ============================================================
  // GAP vd-30: PROSTHETIC VALVE ENDOCARDITIS — 2023 ESC SURGICAL TIMING CRITERIA NOT APPLIED
  // ============================================================
  {
    id: 'vd-gap-30-esc-ie-2023-triggers',
    name: 'Prosthetic Valve Endocarditis — 2023 ESC Surgical Timing Criteria Not Applied',
    category: 'Safety',
    safetyNote: 'Prosthetic valve endocarditis: early surgery within 7 days reduces embolic events and mortality vs. prolonged antibiotics alone.',
    patientCount: 110,
    dollarOpportunity: 650000,
    priority: 'high',
    evidence:
      '2023 ESC IE Guidelines (updated from 2015): Class I indications for emergency/urgent surgery now include: (1) vegetation >10mm on anterior MV leaflet with mobility + severe MR, (2) severe prosthetic dysfunction causing hemodynamic deterioration, (3) perivalvular abscess/fistula/complete heart block, (4) fungi or resistant organisms, (5) embolic event + vegetation ≥10mm + residual large vegetation. Early surgery (within 7 days) reduces embolic events and mortality vs. prolonged antibiotics alone. IE endocarditis team consultation (cardiologist + CT surgeon + ID + imaging) mandatory.',
    cta: 'Endocarditis Team Activation — Cardiac Surgery Consultation Within 48-72 Hours of Meeting Class I Criteria',
    detectionCriteria: [
      'ICD-10 T82.6 (prosthetic valve endocarditis) or I33.0 (acute/subacute IE) in active diagnosis',
      'Echo finding: vegetation >10mm + severe valve dysfunction, OR perivalvular abscess, OR fistula',
      'Heart block or new conduction abnormality in IE patient',
      'Fungi or resistant organism on blood culture (Candida, MRSA) without surgery discussion',
      'No cardiac surgery consultation note within 72 hours of meeting Class I criteria',
    ],
    patients: [
      {
        id: 'VD-IE-030-001',
        name: 'Beatrice Thornton',
        mrn: 'MRN-VD-30001',
        age: 64,
        signals: [
          'Prosthetic valve endocarditis (T82.6) — perivalvular abscess on TEE',
          '2023 ESC Class I: perivalvular abscess = emergency surgical indication',
          'No cardiac surgery consultation in 72 hours since TEE finding',
          'Candida parapsilosis on blood culture — fungal IE: Class I surgical criterion',
          'Heart block: new PR prolongation (220ms) on ECG',
        ],
        keyValues: {
          'Diagnosis': 'Prosthetic valve endocarditis (T82.6)',
          'TEE Finding': 'Perivalvular abscess confirmed',
          'Organism': 'Candida parapsilosis',
          'ECG': 'New PR prolongation 220ms (heart block)',
          'CT Surgery Consult': 'None within 72 hours',
          'ESC 2023 Class I': 'Abscess + fungal organism — met',
        },
      },
      {
        id: 'VD-IE-030-002',
        name: 'Nathaniel Graves',
        mrn: 'MRN-VD-30002',
        age: 71,
        signals: [
          'Active IE (I33.0) — large vegetation 14mm on anterior mitral leaflet',
          'Severe MR on echo (vena contracta 9mm) + hemodynamic deterioration',
          '2023 ESC: vegetation >10mm + severe MR = Class I urgent surgery',
          'Cardiac surgery consulted Day 1 — no follow-up note or decision in 5 days',
          'Ongoing bacteremia — Staph aureus — 7-day surgery window closing',
        ],
        keyValues: {
          'Diagnosis': 'Active IE (I33.0)',
          'Vegetation': '14mm on anterior MV leaflet',
          'MR Severity': 'Severe (vena contracta 9mm)',
          'Organism': 'Staphylococcus aureus',
          'CT Surgery Status': 'Initial consult Day 1 — no decision note',
          'ESC 2023 Class I': 'Vegetation >10mm + severe MR — met',
        },
      },
      {
        id: 'VD-IE-030-003',
        name: 'Harriet Langford',
        mrn: 'MRN-VD-30003',
        age: 55,
        signals: [
          'Prosthetic valve endocarditis (T82.6) — embolic stroke on MRI',
          'Residual vegetation 12mm on prosthetic leaflet post-embolism',
          '2023 ESC: embolic event + residual vegetation ≥10mm = Class I surgery',
          'No multidisciplinary endocarditis team meeting documented',
          'ID team managing alone — no CT surgery or structural heart input',
        ],
        keyValues: {
          'Diagnosis': 'PVE (T82.6)',
          'Event': 'Embolic stroke confirmed on MRI',
          'Residual Vegetation': '12mm (post-embolism)',
          'Endocarditis Team': 'Not convened',
          'CT Surgery Input': 'Not documented',
          'ESC 2023 Class I': 'Embolic event + residual vegetation ≥10mm — met',
        },
      },
    ],
    whyMissed: '2023 ESC guideline updates introduced new Class I surgical triggers that require multidisciplinary awareness (ID, cardiology, CT surgery, imaging). Without a formal endocarditis team protocol that automatically reviews cases against the updated criteria, surgical timing delays occur — especially at institutions without dedicated endocarditis teams.',
    whyTailrd: 'TAILRD identifies PVE patients by combining T82.6/I33.0 diagnoses, TEE/echo reports for vegetation size and perivalvular complications, blood culture organism data, and cardiac surgery consultation timestamps to flag cases where 2023 ESC Class I criteria are met without surgical consultation within the required window.',
    methodologyNote: 'Identifies patients with active prosthetic valve endocarditis (T82.6, I33.0) who have one or more 2023 ESC Class I surgical indications without documented cardiac surgery consultation within 48-72 hours. Compares discharge diagnosis codes and echo reports (abscess, vegetation size, severe dysfunction) against cardiothoracic surgery consultation timestamps.',
  },
  // ============================================================
  // GAP vd-31: RHEUMATIC HEART DISEASE — SURVEILLANCE PROGRAM NOT ACTIVE
  // ============================================================
  {
    id: 'vd-gap-31-rheumatic-hd-surveillance',
    name: 'Rheumatic Heart Disease — Surveillance Program Not Active in At-Risk Patient',
    category: 'Gap',
    patientCount: 340,
    dollarOpportunity: 520000,
    priority: 'medium',
    evidence:
      'Rheumatic heart disease (RHD) remains prevalent in immigrant populations from sub-Saharan Africa, Southeast Asia, South Asia, and Latin America. WHO 2023: 40 million people globally with RHD; 50% undiagnosed. ACC/AHA 2021: annual echocardiographic surveillance for known RHD. Secondary prophylaxis with benzathine penicillin G is Class I for patients with prior rheumatic fever to prevent valve progression. Echocardiographic screening in at-risk populations detects subclinical RHD in 1-3% of screened individuals.',
    cta: 'Initiate RHD Surveillance — Annual Echo + Secondary Prophylaxis Benzathine Penicillin G if Age <40',
    detectionCriteria: [
      'ICD-10 I05.x, I06.x, I07.x, or I08.x (rheumatic valve disease) in problem list',
      'No echocardiogram within 12 months',
      'Age <40 without active benzathine penicillin G prescription for secondary prophylaxis',
      'History of rheumatic fever (I00, I01.x) without documented cardiac evaluation',
      'Mitral stenosis progression (MVA declining on serial echo) without surgical referral update',
    ],
    patients: [
      {
        id: 'VD-RHD-031-001',
        name: 'Amara Diallo',
        mrn: 'MRN-VD-31001',
        age: 32,
        signals: [
          'Rheumatic mitral stenosis (I05.0) — MVA 1.4 cm² on echo 22 months ago',
          'No follow-up echo — annual surveillance overdue',
          'Age 32 — not on benzathine penicillin G secondary prophylaxis',
          'Originally from West Africa — high-risk population for RHD progression',
          'MVA declining: 1.4 cm² from 1.7 cm² 3 years ago — progressive',
        ],
        keyValues: {
          'Diagnosis': 'Rheumatic MS (I05.0)',
          'MVA': '1.4 cm² (last echo 22 months ago)',
          'Prior MVA': '1.7 cm² (3 years ago)',
          'Age': 32,
          'Secondary Prophylaxis': 'Not prescribed',
          'Last Echo': '22 months ago — overdue',
        },
      },
      {
        id: 'VD-RHD-031-002',
        name: 'Priya Venkataraman',
        mrn: 'MRN-VD-31002',
        age: 27,
        signals: [
          'Prior rheumatic fever (I00) documented in childhood records',
          'Cardiac evaluation never performed — no echo on file',
          'Age 27 — subclinical RHD possible, incidence 1-3% in at-risk populations',
          'Origin from South Asia — endemic rheumatic fever region',
          'No cardiology referral or secondary prophylaxis documented',
        ],
        keyValues: {
          'History': 'Rheumatic fever (I00) in childhood',
          'Echocardiogram': 'Never performed',
          'Age': 27,
          'Secondary Prophylaxis': 'Never initiated',
          'Cardiology Referral': 'None on file',
          'Screening Status': 'At-risk — unscreened',
        },
      },
      {
        id: 'VD-RHD-031-003',
        name: 'Miguel Fuentes-Reyes',
        mrn: 'MRN-VD-31003',
        age: 45,
        signals: [
          'Rheumatic combined MV/AV disease (I08.0) — moderate MS + moderate AR',
          'Last echo 20 months ago — surveillance overdue',
          'No surgical referral despite combined valve involvement',
          'On warfarin for AF but no formal RHD surveillance program',
          'Age 45: combined valve disease — surgical planning lead time important',
        ],
        keyValues: {
          'Diagnosis': 'Rheumatic combined MV + AV disease (I08.0)',
          'MV Status': 'Moderate MS (MVA 1.6 cm²)',
          'AV Status': 'Moderate AR',
          'AF': 'Persistent — on warfarin',
          'Last Echo': '20 months ago — overdue',
          'Surgical Referral': 'None documented',
        },
      },
    ],
    whyMissed: 'Rheumatic heart disease surveillance requires linking demographic risk factors, childhood fever history (often in foreign-language records), and ICD-10 rheumatic valve codes to systematic echo scheduling and penicillin prophylaxis prescribing. Standard EHR workflows do not connect these disparate data elements.',
    whyTailrd: 'TAILRD identifies RHD surveillance gaps by combining rheumatic valve ICD-10 codes (I05-I08), rheumatic fever history (I00, I01.x), serial echo availability, age-based penicillin prophylaxis criteria, and demographic risk signals to flag patients without active surveillance programs.',
    methodologyNote: 'Identifies patients with known rheumatic heart disease (I05.0–I05.9, I06.0–I06.9, I07.0–I07.9, I08.x) or history of rheumatic fever (I00, I01.x) who have not had echocardiographic follow-up in 12 months, or who are not on secondary prophylaxis benzathine penicillin if <40 years old with RHD. Flags patients with national origin encoding (demographic) suggesting at-risk populations without RHD screening documentation.',
  },
  // ============================================================
  // GAP vd-32: FAILED RV-PA CONDUIT OR PULMONARY STENOSIS — TPVR NOT EVALUATED
  // ============================================================
  {
    id: 'vd-gap-32-transcatheter-pulmonary-valve',
    name: 'Failed RV-PA Conduit or Pulmonary Stenosis — Transcatheter Pulmonary Valve Not Evaluated',
    category: 'Gap',
    patientCount: 75,
    dollarOpportunity: 560000,
    priority: 'medium',
    evidence:
      '2018 ACC/AHA ACHD Guidelines and 2022 AHA Scientific Statement on Transcatheter Pulmonary Valve Replacement (TPVR): Class I for symptomatic patients with RV-PA conduit stenosis/regurgitation (PS gradient >35 mmHg, severe PR) and Class IIa for asymptomatic severe PR with RV dilation (RVEDVI >150 mL/m²). Melody valve (Medtronic) and SAPIEN XT (Edwards) approved for conduit failure. TPVR delays/avoids surgical conduit revision. RVEF <45% with severe PR: intervention Class IIa.',
    cta: 'ACHD Structural Heart Consultation — Transcatheter Pulmonary Valve Replacement Eligibility Assessment',
    detectionCriteria: [
      'Prior RV-PA conduit surgery (Z95.x, ACHD surgical history) in chart',
      'Echo: conduit gradient >35 mmHg or severe pulmonary regurgitation',
      'RVEDVI >150 mL/m² on cardiac MRI or echo estimation',
      'No ACHD structural heart consultation in past 12 months for valve evaluation',
      'Transcatheter pulmonary valve eligibility (conduit size, anatomy) not assessed',
    ],
    patients: [
      {
        id: 'VD-TPV-032-001',
        name: 'Benjamin Ashford',
        mrn: 'MRN-VD-32001',
        age: 28,
        signals: [
          'Tetralogy of Fallot repair (Q21.3) with RV-PA conduit — now failing',
          'Echo: conduit gradient 42 mmHg + moderate-severe PR',
          'Cardiac MRI: RVEDVI 168 mL/m² — exceeds 150 mL/m² threshold for intervention',
          'No ACHD structural heart consultation in 14 months',
          'Melody valve TPVR: Class I — symptomatic with PS + PR',
        ],
        keyValues: {
          'Diagnosis': 'TOF repair (Q21.3) with RV-PA conduit',
          'Conduit Gradient': '42 mmHg (threshold: >35 mmHg)',
          'PR Severity': 'Moderate-severe',
          'RVEDVI': '168 mL/m² (threshold: >150 mL/m²)',
          'ACHD Consult': 'None in 14 months',
          'TPVR Eligibility': 'Not assessed',
        },
      },
      {
        id: 'VD-TPV-032-002',
        name: 'Cassandra Howell',
        mrn: 'MRN-VD-32002',
        age: 35,
        signals: [
          'Prior RV-PA conduit for pulmonary atresia — conduit placed 12 years ago',
          'Echo: severe PR + conduit gradient 38 mmHg',
          'RVEF 42% on MRI — below 45% threshold, Class IIa intervention indication',
          'No TPVR evaluation or ACHD referral in current chart',
          'Patient followed by general cardiologist — no ACHD specialist involvement',
        ],
        keyValues: {
          'Diagnosis': 'Pulmonary atresia — prior RV-PA conduit (12 years)',
          'Conduit Gradient': '38 mmHg',
          'PR': 'Severe',
          'RVEF': '42% (threshold for Class IIa: <45%)',
          'ACHD Specialist': 'Not involved',
          'TPVR Evaluation': 'Not performed',
        },
      },
      {
        id: 'VD-TPV-032-003',
        name: 'Oliver Whitmore',
        mrn: 'MRN-VD-32003',
        age: 22,
        signals: [
          'Pulmonary stenosis (Q22.1) — native RVOT obstruction, gradient 48 mmHg',
          'SAPIEN XT transcatheter pulmonary valve: approved for native/surgical RVOT',
          'No structural heart or ACHD evaluation documented',
          'Asymptomatic — but gradient exceeds 35 mmHg threshold',
          'Age 22: early TPVR avoids surgical conduit placement and associated re-interventions',
        ],
        keyValues: {
          'Diagnosis': 'Pulmonary stenosis (Q22.1)',
          'RVOT Gradient': '48 mmHg (threshold: >35 mmHg)',
          'Symptoms': 'Asymptomatic',
          'ACHD Consult': 'None documented',
          'TPVR Eligibility': 'Not assessed — SAPIEN XT approved for native RVOT',
          'Age': 22,
        },
      },
    ],
    whyMissed: 'Transcatheter pulmonary valve replacement is an ACHD subspecialty procedure with limited awareness in general cardiology. Patients with congenital heart disease and RV-PA conduits are often followed without systematic tracking of conduit gradient thresholds against TPVR eligibility criteria, and referral to ACHD structural heart programs is inconsistent.',
    whyTailrd: 'TAILRD identifies RV-PA conduit patients by combining ACHD diagnosis codes (Q21.3, Q22.x, Q25.1), surgical history for prior conduit placement, echo conduit gradients and PR severity, cardiac MRI RVEDVI, and ACHD specialist consultation records to flag patients approaching or at TPVR intervention thresholds.',
    methodologyNote: 'Identifies patients with prior RV-PA conduit (Z95.x surgery history, ACHD diagnosis codes Q21.3 TOF, Q22.x, Q25.1 PA stenosis) and evidence of conduit failure on echo (PS gradient >35mmHg or severe PR) without documented evaluation for transcatheter pulmonary valve replacement. Flags patients approaching surgical threshold without ACHD specialist review.',
  },
];

// ============================================================
// ENHANCED DISPLAY HELPERS
// ============================================================

/** VD-1: AS Severity display from echocardiographic data */
const renderASSurveillanceDisplay = (pt: VDGapPatient) => {
  const vmax = pt.keyValues['Vmax'] || '';
  const meanGrad = pt.keyValues['Mean Gradient'] || '';
  const ava = pt.keyValues['AVA'] || '';
  return (
    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
      <div className="text-sm font-semibold text-blue-900">
        Moderate AS: Vmax {vmax} &middot; Mean gradient {meanGrad} &middot; AVA {ava}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-blue-600">
        <Zap className="w-3 h-3 flex-shrink-0" />
        Auto-classified from echocardiographic data &mdash; surveillance interval overdue
      </div>
    </div>
  );
};

/** VD-3: Rheumatic MS on DOAC &mdash; RED safety alert */
const renderRheumaticMSSafetyAlert = (pt: VDGapPatient) => {
  const currentAC = String(pt.keyValues['Current AC'] || '');
  return (
    <div className="mt-3 bg-red-50 border-2 border-red-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-bold text-red-800">
        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
        INVICTUS 2022: DOACs inferior to warfarin in rheumatic valve disease (RR 1.65)
      </div>
      <div className="text-sm text-red-700">
        Current anticoagulant: <span className="font-semibold">{currentAC}</span>
      </div>
      <div className="text-sm font-semibold text-red-800">
        Switch to warfarin &mdash; target INR 2.0-3.0
      </div>
      <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
        <Zap className="w-3 h-3 flex-shrink-0" />
        Auto-detected from diagnosis and medication data
      </div>
    </div>
  );
};

/** VD-6: HALT screening alert */
const renderHALTAlert = (pt: VDGapPatient) => {
  const neuroEvent = String(pt.keyValues['Neurologic Event'] || pt.keyValues['Neurologic Complaints'] || '');
  const gradientChange = String(pt.keyValues['Mean Gradient Change'] || pt.keyValues['Gradient Change'] || '');
  return (
    <div className="mt-3 bg-amber-50 border-2 border-amber-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        HALT Screening Required &mdash; Post-TAVR Neurologic Symptoms
      </div>
      {neuroEvent && (
        <div className="text-sm text-amber-700">
          Neurologic event: <span className="font-semibold">{neuroEvent}</span>
        </div>
      )}
      {gradientChange && (
        <div className="text-sm text-amber-700">
          Gradient trend: <span className="font-semibold">{gradientChange}</span>
        </div>
      )}
      <div className="text-sm font-semibold text-amber-800">
        Order CT of TAVR valve to assess for hypoattenuated leaflet thickening
      </div>
      <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
        <Zap className="w-3 h-3 flex-shrink-0" />
        Auto-detected from symptom reports and hemodynamic trends
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PREDICTIVE INTELLIGENCE — Trajectory + Time Horizon for VD patients
// ---------------------------------------------------------------------------

const getVDTrajectoryBadges = (gap: VDClinicalGap, pt: VDGapPatient) => {
  const kv = pt.keyValues;
  let trajectory: TrajectoryResult | null = null;

  // Vmax: increasing = worsening (negate for computeTrajectory)
  const currentVmaxRaw = typeof kv['Vmax'] === 'number' ? kv['Vmax'] : parseFloat(String(kv['Vmax'] || ''));
  const priorVmaxRaw = typeof kv['Prior Vmax'] === 'number' ? kv['Prior Vmax'] : parseFloat(String(kv['Prior Vmax'] || ''));
  const currentRoot = typeof kv['Aortic Root'] === 'number' ? kv['Aortic Root'] : parseFloat(String(kv['Aortic Root'] || ''));
  const priorRoot = typeof kv['Prior Aortic Root'] === 'number' ? kv['Prior Aortic Root'] : parseFloat(String(kv['Prior Aortic Root'] || ''));

  if (!isNaN(currentVmaxRaw) && !isNaN(priorVmaxRaw) && priorVmaxRaw > 0) {
    trajectory = computeTrajectory({ currentValue: -currentVmaxRaw, priorValue: -priorVmaxRaw, daysBetween: 180 });
  } else if (!isNaN(currentRoot) && !isNaN(priorRoot) && priorRoot > 0) {
    trajectory = computeTrajectory({ currentValue: -currentRoot, priorValue: -priorRoot, daysBetween: 180 });
  }

  if (!trajectory) return null;

  const traj = trajectoryDisplay(trajectory.direction);
  const horizon = computeTimeHorizon({
    predictedMonths: null,
    gapCategory: gap.category as 'Safety' | 'Gap' | 'Growth' | 'Quality',
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

const renderVDPredictiveDetail = (gap: VDClinicalGap, pt: VDGapPatient) => {
  const gapId = gap.id.toLowerCase();
  const kv = pt.keyValues;
  const elements: React.ReactNode[] = [];

  // VD-1 (Moderate AS Surveillance) — AS Progression projection
  if (gapId.includes('moderate-as') || gapId.includes('gap-1')) {
    const currentVmax = typeof kv['Vmax'] === 'number' ? kv['Vmax'] : parseFloat(String(kv['Vmax'] || ''));
    const priorVmax = typeof kv['Prior Vmax'] === 'number' ? kv['Prior Vmax'] : undefined;
    if (!isNaN(currentVmax)) {
      const prog = projectASProgression({ currentVmax, priorVmax, monthsBetween: priorVmax != null ? 6 : undefined });
      elements.push(
        <div key="as-prog" className="mt-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm font-bold text-indigo-800">
            <TrendingUp className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            Predictive Intelligence — AS Progression to Severe
          </div>
          <div className="text-sm text-indigo-700">
            Current Vmax: {currentVmax.toFixed(1)} m/s
            {priorVmax != null && <> · Previous: {priorVmax.toFixed(1)} m/s (6 months ago)</>}
            {' '}· Rate: {prog.annualizedRate.toFixed(2)} m/s/year ({prog.progressionCategory})
            {prog.monthsToSevere != null && prog.monthsToSevere > 0 && (
              <> · Predicted severe threshold (4.0 m/s): ~{prog.monthsToSevere} months ({prog.predictedSevereDate})</>
            )}
            {prog.monthsToSevere === 0 && <> · Already at severe threshold</>}
          </div>
          <div className="text-xs text-indigo-600 italic">Confidence: {prog.confidence} — {prog.basisNote}</div>
          <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
            <Zap className="w-3 h-3 flex-shrink-0" />
            Trajectory-aware · Forward-looking · Auto-computed from serial echocardiography
          </div>
        </div>
      );
    }
  }

  // VD-4 (BAV Aortopathy) — Aortic Root growth projection via projectBAVProgression
  if (gapId.includes('bav') || gapId.includes('gap-4') || gapId.includes('aortopathy')) {
    const rootCurrent = typeof kv['Aortic Root'] === 'number' ? kv['Aortic Root'] : parseFloat(String(kv['Aortic Root'] || '0'));
    const rootPrior = typeof kv['Prior Aortic Root'] === 'number' ? kv['Prior Aortic Root'] : parseFloat(String(kv['Prior Aortic Root'] || '0'));
    let bavMonths = 12;
    const rootDate = kv['Root Measure Date'] || kv['Aortic Root Date'];
    const priorRootDate = kv['Prior Root Date'];
    if (rootDate && priorRootDate) {
      const d1 = new Date(String(priorRootDate));
      const d2 = new Date(String(rootDate));
      const diffMs = d2.getTime() - d1.getTime();
      if (diffMs > 0) bavMonths = Math.round(diffMs / (30.44 * 24 * 60 * 60 * 1000));
    }
    if (!isNaN(rootCurrent) && rootCurrent > 0) {
      const bavResult = projectBAVProgression({
        currentRootCm: rootCurrent,
        priorRootCm: !isNaN(rootPrior) && rootPrior > 0 ? rootPrior : undefined,
        monthsBetween: bavMonths,
      });
      elements.push(
        <div key="bav-growth" className="mt-2 px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg">
          <div className="text-xs font-semibold text-slate-800 mb-1">Aortopathy Progression Forecast</div>
          <div className="text-xs text-slate-700">
            Current root: {rootCurrent.toFixed(1)}cm · Prior: {(!isNaN(rootPrior) && rootPrior > 0) ? rootPrior.toFixed(1) : 'N/A'}cm
          </div>
          <div className="text-xs text-slate-700">
            Growth rate: {bavResult.annualizedGrowthRate.toFixed(2)}cm/year — <span className="font-bold">{bavResult.riskCategory}</span>
          </div>
          {bavResult.monthsToSurgicalThreshold != null && bavResult.monthsToSurgicalThreshold > 0 && (
            <div className="text-xs text-slate-800 font-semibold mt-0.5">
              Predicted surgical threshold ({bavResult.surgicalThreshold}cm): ~{bavResult.monthsToSurgicalThreshold} months ({bavResult.predictedThresholdDate})
            </div>
          )}
          {bavResult.monthsToSurgicalThreshold === 0 && (
            <div className="text-xs text-red-700 font-bold mt-0.5">Already at or above surgical threshold</div>
          )}
          <div className="text-xs text-slate-500 mt-0.5 italic">{bavResult.basisNote}</div>
          <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
            <Zap className="w-3 h-3 flex-shrink-0" />
            Trajectory-aware · Forward-looking · Auto-computed from serial imaging
          </div>
        </div>
      );
    }
  }

  return elements.length > 0 ? <>{elements}</> : null;
};

/** Determine which enhanced display to render for a given gap + patient */
const renderVDEnhancedDisplay = (gap: VDClinicalGap, pt: VDGapPatient) => {
  const gapId = gap.id.toLowerCase();

  // VD-1: Moderate AS surveillance
  if (gapId.includes('moderate-as') || gapId.includes('gap-1')) {
    return renderASSurveillanceDisplay(pt);
  }

  // VD-3: Rheumatic MS on DOAC
  if (gapId.includes('rheumatic') || gapId.includes('gap-3')) {
    return renderRheumaticMSSafetyAlert(pt);
  }

  // VD-6: HALT screening
  if (gapId.includes('halt') || gapId.includes('gap-6')) {
    return renderHALTAlert(pt);
  }

  return null;
};

// ============================================================
// GAP-LEVEL TRAJECTORY DATA
// ============================================================
const getVDGapTrajectoryData = (_gapId: string, patientCount: number, category: string): TrajectoryDistribution => {
  const isSafety = category === 'Safety';
  const isGrowth = category === 'Growth';
  if (isSafety) {
    return { worseningRapid: Math.round(patientCount * 0.33), worseningSlow: Math.round(patientCount * 0.32), stable: Math.round(patientCount * 0.23), improving: Math.round(patientCount * 0.12), total: patientCount };
  }
  if (isGrowth) {
    return { worseningRapid: Math.round(patientCount * 0.08), worseningSlow: Math.round(patientCount * 0.18), stable: Math.round(patientCount * 0.43), improving: Math.round(patientCount * 0.31), total: patientCount };
  }
  return { worseningRapid: Math.round(patientCount * 0.19), worseningSlow: Math.round(patientCount * 0.27), stable: Math.round(patientCount * 0.34), improving: Math.round(patientCount * 0.20), total: patientCount };
};

// ============================================================
// COMPONENT
// ============================================================
const VDClinicalGapDetectionDashboard: React.FC = () => {
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'priority' | 'patients' | 'opportunity'>('priority');
  const [showMethodology, setShowMethodology] = useState<string | null>(null);

  const totalPatients = VD_CLINICAL_GAPS.reduce((sum, g) => sum + g.patientCount, 0);
  const totalOpportunity = VD_CLINICAL_GAPS.reduce((sum, g) => sum + g.dollarOpportunity, 0);
  const safetyGaps = VD_CLINICAL_GAPS.filter(g => g.category === 'Safety');
  const safetyPatients = safetyGaps.reduce((sum, g) => sum + g.patientCount, 0);

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const categoryOrder: Record<string, number> = { Safety: 0, Discovery: 1, Gap: 2, Growth: 3, Quality: 2 };
  const sortedGaps = [...VD_CLINICAL_GAPS].sort((a, b) => {
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
      : c === 'Quality'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-blue-100 text-blue-800';

  return (
    <div className="space-y-6">
      {/* Header summary */}
      <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-titanium-900 mb-1 flex items-center gap-2">
          <Heart className="w-5 h-5 text-porsche-600" />
          Clinical Gap Detection &mdash; Valvular Disease Module
        </h3>
        <p className="text-sm text-titanium-600 mb-4">
          AI-driven detection of evidence-based valvular disease therapy gaps, surveillance deficiencies, and safety opportunities.
          21 active gap rules covering AS surveillance, post-TAVR quality, anticoagulation safety, BAV aortopathy, endocarditis prophylaxis, HALT screening, intervention referral, mitral repair quality, tricuspid intervention, valve-in-valve TAVR, concomitant AF, heart team documentation, prosthesis mismatch, aortic root, INR monitoring, TEER eligibility, PVE safety, pacemaker risk, bioprosthetic surveillance, TMVR candidacy, and AS+CAD strategy.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="text-2xl font-bold text-blue-800">{VD_CLINICAL_GAPS.length}</div>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Safety Alerts</span>
            </div>
            <div className="text-2xl font-bold text-rose-800">{safetyGaps.length} gaps &middot; {safetyPatients} patients</div>
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
                  {gap.whyMissed && (
                    <div className="mt-2 text-xs text-titanium-500 italic flex items-start gap-1.5">
                      <Search className="w-3 h-3 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <span>Why standard systems miss this: {gap.whyMissed}</span>
                    </div>
                  )}
                  {gap.safetyNote && (
                    <div className="mt-1 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-red-700 font-medium">{gap.safetyNote}</span>
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
                    const dist = getVDGapTrajectoryData(gap.id, gap.patientCount, gap.category);
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
                    <Target className="w-4 h-4 text-medical-red-600" />
                    <span className="font-semibold text-medical-red-700">Recommended Action:</span>
                    <span className="text-sm font-medium bg-medical-red-50 border border-medical-red-200 px-3 py-1 rounded-lg text-medical-red-800">
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
                                  {pt.mrn} &middot; Age {pt.age}
                                </span>
                                {pt.subflag && (
                                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-titanium-100 text-titanium-700">
                                    {pt.subflag}
                                  </span>
                                )}
                                {gap.ctaMap && pt.subflag && gap.ctaMap[pt.subflag] && (
                                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    {gap.ctaMap[pt.subflag]}
                                  </span>
                                )}
                                {gap.category === 'Discovery' && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full" title="This patient was not previously flagged in any clinical workflow. TAILRD identified this patient by assembling disconnected signals across care settings.">
                                    <Radio className="w-3 h-3" />
                                    First identified by TAILRD
                                  </span>
                                )}
                                {getVDTrajectoryBadges(gap, pt)}
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
                            {ptOpen && renderVDEnhancedDisplay(gap, pt) && (
                              <div className="px-4">
                                {renderVDEnhancedDisplay(gap, pt)}
                              </div>
                            )}
                            {ptOpen && renderVDPredictiveDetail(gap, pt) && (
                              <div className="px-4">
                                {renderVDPredictiveDetail(gap, pt)}
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

export default VDClinicalGapDetectionDashboard;
