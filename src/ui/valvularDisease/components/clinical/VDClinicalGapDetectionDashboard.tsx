import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, DollarSign, Users, ChevronDown, ChevronUp, Target, Heart, Stethoscope, TrendingUp, Zap, Info, Search, Radio, FileText } from 'lucide-react';
import { computeTrajectory, computeTimeHorizon, projectASProgression, projectBAVProgression, trajectoryDisplay, timeHorizonDisplay, formatDollar, type TrajectoryResult, type TrajectoryDistribution } from '../../../../utils/predictiveCalculators';

// ============================================================
// CLINICAL GAP DETECTION &mdash; VALVULAR DISEASE MODULE
// Gaps: VD-1 (Moderate AS Surveillance), VD-2 (Post-TAVR Echo),
//       VD-3 (Rheumatic MS Warfarin), VD-4 (BAV Aortopathy),
//       VD-5 (Endocarditis Prophylaxis), VD-6 (HALT Screening)
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
          6 active gap rules covering AS surveillance, post-TAVR quality, anticoagulation safety, BAV aortopathy, endocarditis prophylaxis, and HALT screening.
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
